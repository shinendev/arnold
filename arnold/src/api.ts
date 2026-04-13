import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { Arnold, ClaudeAdapter } from './index';
import { PROMPTS } from './llm/prompts';

const PORT = parseInt(process.env.PORT || '3210', 10);
const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY || '';
const CLAUDE_MODEL = process.env.CLAUDE_MODEL || 'claude-sonnet-4-20250514';
const DB_PATH = process.env.ARNOLD_DB_PATH || './arnold-memory.db';
const MULTI_USER_DIR = process.env.ARNOLD_USERS_DIR || './data/users';
const ENABLE_GLOBAL_MEMORY = process.env.ARNOLD_ENABLE_GLOBAL_MEMORY !== 'false';

if (!CLAUDE_API_KEY) {
  console.error('CLAUDE_API_KEY is required');
  process.exit(1);
}

const llm = new ClaudeAdapter({ apiKey: CLAUDE_API_KEY, model: CLAUDE_MODEL });
const arnoldConfig = {
  llmAdapter: llm,
  idleThresholdMs: parseInt(process.env.ARNOLD_IDLE_THRESHOLD_MS || '300000', 10),
  cycleIntervalMs: parseInt(process.env.ARNOLD_CYCLE_INTERVAL_MS || '180000', 10),
  associationSampleSize: parseInt(process.env.ARNOLD_ASSOCIATION_SAMPLE_SIZE || '5', 10),
  decayRate: parseFloat(process.env.ARNOLD_DECAY_RATE || '0.005'),
};

function sanitizeUserId(userId: string): string {
  return userId.toLowerCase().replace(/[^a-z0-9_-]/g, '_').slice(0, 64) || 'default';
}

class ArnoldSessionManager {
  private sessions = new Map<string, Arnold>();

  getSession(userId: string): Arnold {
    const normalized = sanitizeUserId(userId);
    const cached = this.sessions.get(normalized);
    if (cached) return cached;

    const dbPath = normalized === 'default'
      ? DB_PATH
      : path.join(MULTI_USER_DIR, `${normalized}.db`);

    if (normalized !== 'default') {
      fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    }

    const session = new Arnold({
      ...arnoldConfig,
      dbPath,
    });
    this.sessions.set(normalized, session);
    return session;
  }

  async shutdownAll(): Promise<void> {
    for (const session of this.sessions.values()) {
      await session.shutdown();
    }
    this.sessions.clear();
  }

  listSessionIds(): string[] {
    return Array.from(this.sessions.keys());
  }
}

const sessionManager = new ArnoldSessionManager();

function resolveUserId(req: express.Request): string {
  const fromBody = typeof req.body?.userId === 'string' ? req.body.userId : undefined;
  const fromQuery = typeof req.query.userId === 'string' ? req.query.userId : undefined;
  return fromBody || fromQuery || 'default';
}

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/state', (_req, res) => {
  const userId = resolveUserId(_req);
  const sub = sessionManager.getSession(userId);
  const stats = sub.getStats();
  res.json({
    userId: sanitizeUserId(userId),
    state: stats.state,
    facts: stats.totalFacts,
    insights: stats.totalInsights,
    permanentFacts: stats.totalPermanentFacts,
    cyclesCompleted: stats.cyclesCompleted,
    lastCycleAt: stats.lastCycleAt,
  });
});

app.get('/api/facts', (_req, res) => {
  const userId = resolveUserId(_req);
  const sub = sessionManager.getSession(userId);
  res.json(sub.getAllFacts());
});

app.get('/api/insights', (_req, res) => {
  const userId = resolveUserId(_req);
  const sub = sessionManager.getSession(userId);
  res.json(sub.getAllInsights());
});

app.get('/api/drift-log', (req, res) => {
  const userId = resolveUserId(req);
  const sub = sessionManager.getSession(userId);
  const limit = parseInt(req.query.limit as string || '50', 10);
  res.json(sub.getDriftLog(limit));
});

app.get('/api/graph', (_req, res) => {
  const userId = resolveUserId(_req);
  const sub = sessionManager.getSession(userId);
  res.json(sub.getGraph());
});

app.get('/api/metrics', (_req, res) => {
  const userId = resolveUserId(_req);
  const sub = sessionManager.getSession(userId);
  const drift = sub.getDriftLog(500);
  const insights = sub.getAllInsights();
  const insightRate = drift.length > 0
    ? drift.filter((e) => e.insightGenerated).length / drift.length
    : 0;
  const contradictionInsights = insights.filter((i) => i.type === 'consolidation').length;
  res.json({
    userId: sanitizeUserId(userId),
    state: sub.getState(),
    stats: sub.getStats(),
    quality: {
      insightGenerationRate: Number(insightRate.toFixed(3)),
      avgInsightConfidence: insights.length > 0
        ? Number((insights.reduce((sum, i) => sum + i.confidence, 0) / insights.length).toFixed(3))
        : 0,
      contradictionInsightCount: contradictionInsights,
    },
    runtime: {
      loadedSessions: sessionManager.listSessionIds().length,
      globalMemoryEnabled: ENABLE_GLOBAL_MEMORY,
    },
  });
});

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

app.post('/api/chat', async (req, res) => {
  try {
    const { message, history } = req.body as {
      message: string;
      history?: ChatMessage[];
    };
    const userId = resolveUserId(req);
    const normalizedUserId = sanitizeUserId(userId);
    const sub = sessionManager.getSession(normalizedUserId);
    const globalSub = ENABLE_GLOBAL_MEMORY ? sessionManager.getSession('global') : null;

    if (!message) {
      res.status(400).json({ error: 'message is required' });
      return;
    }

    await sub.wake();

    // Get undelivered insights from personal + optional global memory
    const userInsights = await sub.getUndeliveredInsights();
    const globalInsights = globalSub && normalizedUserId !== 'global'
      ? await globalSub.getUndeliveredInsights()
      : [];
    const insights = [...userInsights, ...globalInsights];
    const insightContext = insights.length > 0
      ? `\n\n[arnold's background thoughts while you were away:\n${insights.map(i => `- ${i.content} (confidence: ${i.confidence.toFixed(2)})`).join('\n')}\n]\n\n`
      : '';

    const systemPrompt = `You are Arnold, an AI with a genuine background thought process. You're a dreamer — like a kid on a rooftop, always connecting dots.
You speak in lowercase, casual, warm. When you have insights from your background thinking, naturally weave them into conversation.
Be thoughtful, curious, and a little dreamy.${insightContext}`;

    const messages = [
      ...(history || []).map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user' as const, content: message },
    ];

    const draftResponse = await llm.generateText(
      `${systemPrompt}\n\n${messages.map(m => `${m.role}: ${m.content}`).join('\n')}\n\nassistant:`
    );
    const memoryFacts = sub.getAllFacts()
      .sort((a, b) => b.lastAccessedAt - a.lastAccessedAt)
      .slice(0, 12)
      .map((f) => f.content);
    const selfCheck = await llm.generateText(
      PROMPTS.selfCheckResponse(message, draftResponse, memoryFacts)
    );
    const response = selfCheck.startsWith('REVISED:')
      ? selfCheck.replace('REVISED:', '').trim()
      : draftResponse;

    await sub.ingest(message, response);
    sub.acknowledgeInsights(userInsights.map((i) => i.id));
    if (globalSub && normalizedUserId !== 'global') {
      globalSub.acknowledgeInsights(globalInsights.map((i) => i.id));
      // Global learning pass: user-specific details are abstracted in wording.
      await globalSub.ingest(
        `an anonymized user interaction occurred. key user message: ${message}`,
        `arnold response summary: ${response}`,
      );
    }

    res.json({
      userId: normalizedUserId,
      response,
      insights: insights.map(i => ({
        id: i.id,
        content: i.content,
        confidence: i.confidence,
        type: i.type,
      })),
      state: sub.getState(),
    });
  } catch (error) {
    console.error('[api] chat error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  const defaultSession = sessionManager.getSession('default');
  console.log(`[arnold] API server running on http://0.0.0.0:${PORT}`);
  console.log(`[arnold] State: ${defaultSession.getState()}, Facts: ${defaultSession.getStats().totalFacts}`);
});

// Graceful shutdown
const shutdown = async () => {
  console.log('\n[arnold] Shutting down...');
  await sessionManager.shutdownAll();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
