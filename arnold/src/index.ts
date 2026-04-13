import { v4 as uuid } from 'uuid';
import {
  ArnoldConfig,
  ArnoldState,
  ArnoldStats,
  DriftLogEntry,
  Insight,
  Fact,
  DEFAULT_CONFIG,
  LLMAdapter,
} from './types';
import { ArnoldDB } from './db/sqlite';
import { MemoryStore } from './core/memory-store';
import { InsightStore } from './core/insight-store';
import { ReplayEngine } from './core/replay-engine';
import { Associator } from './core/associator';
import { Incubator } from './core/incubator';
import { Consolidator } from './core/consolidator';
import { BackgroundLoop } from './background/loop';
import { Scheduler } from './background/scheduler';
import { DriftLog } from './background/drift-log';
import { PROMPTS } from './llm/prompts';

export class Arnold {
  private db: ArnoldDB;
  private memoryStore: MemoryStore;
  private insightStore: InsightStore;
  private replayEngine: ReplayEngine;
  private associator: Associator;
  private incubator: Incubator;
  private consolidator: Consolidator;
  private backgroundLoop: BackgroundLoop;
  private scheduler: Scheduler;
  private driftLog: DriftLog;
  private config: ArnoldConfig;
  private currentConversationId: string | null = null;

  constructor(config: Partial<ArnoldConfig> & { llmAdapter: LLMAdapter; dbPath: string }) {
    this.config = { ...DEFAULT_CONFIG, ...config } as ArnoldConfig;

    this.db = new ArnoldDB(this.config.dbPath);
    this.memoryStore = new MemoryStore(this.db, this.config.llmAdapter);
    this.insightStore = new InsightStore(this.db, this.config.llmAdapter);
    this.driftLog = new DriftLog(this.db);
    this.scheduler = new Scheduler(this.config);

    this.replayEngine = new ReplayEngine(
      this.memoryStore, this.insightStore, this.config.llmAdapter
    );
    this.associator = new Associator(
      this.memoryStore, this.insightStore, this.config.llmAdapter, this.config
    );
    this.incubator = new Incubator(
      this.db, this.memoryStore, this.insightStore, this.config.llmAdapter
    );
    this.consolidator = new Consolidator(
      this.memoryStore, this.insightStore, this.config.llmAdapter, this.config
    );

    this.backgroundLoop = new BackgroundLoop(
      this.config,
      this.memoryStore,
      this.insightStore,
      this.replayEngine,
      this.associator,
      this.incubator,
      this.consolidator,
      this.scheduler,
      this.driftLog,
    );

    this.backgroundLoop.start();
    // Arm idle/dreaming timers immediately so background thinking starts
    // even before the first explicit wake/ingest call.
    this.scheduler.wake();
  }

  async wake(): Promise<void> {
    this.scheduler.wake();
    if (!this.currentConversationId) {
      this.currentConversationId = uuid();
      this.db.raw.prepare(
        'INSERT INTO conversations (id, started_at, last_message_at, message_count) VALUES (?, ?, ?, 0)'
      ).run(this.currentConversationId, Date.now(), Date.now());
    }
  }

  async ingest(userMessage: string, agentResponse: string): Promise<void> {
    this.scheduler.wake();

    // Update conversation
    if (this.currentConversationId) {
      this.db.raw.prepare(
        'UPDATE conversations SET last_message_at = ?, message_count = message_count + 1 WHERE id = ?'
      ).run(Date.now(), this.currentConversationId);
    }

    // Extract facts
    try {
      const response = await this.config.llmAdapter.generateText(
        PROMPTS.extractFacts(userMessage, agentResponse)
      );
      const facts = JSON.parse(response);
      if (Array.isArray(facts)) {
        for (const factText of facts) {
          if (typeof factText === 'string' && factText.trim()) {
            await this.memoryStore.addFact(
              factText.trim(),
              'conversation',
              this.currentConversationId ?? undefined,
            );
          }
        }
      }
    } catch {
      // Parse or LLM failure — continue
    }

    // Detect unresolved questions
    await this.incubator.detectAndStoreQuestions(
      userMessage, agentResponse, this.currentConversationId ?? undefined
    );
  }

  async getUndeliveredInsights(): Promise<Insight[]> {
    return this.insightStore.getUndelivered();
  }

  acknowledgeInsights(insightIds: string[]): void {
    this.insightStore.markDeliveredBatch(insightIds);
  }

  getState(): ArnoldState {
    return this.scheduler.state;
  }

  getStats(): ArnoldStats {
    return {
      totalFacts: this.memoryStore.getFactCount(),
      totalInsights: this.insightStore.getInsightCount(),
      totalPermanentFacts: this.memoryStore.getPermanentFactCount(),
      cyclesCompleted: this.backgroundLoop.getCycleCount(),
      state: this.scheduler.state,
      lastCycleAt: this.backgroundLoop.getLastCycleAt(),
    };
  }

  getDriftLog(limit = 50): DriftLogEntry[] {
    return this.driftLog.getRecent(limit);
  }

  getAllFacts(): Fact[] {
    return this.memoryStore.getAllFacts();
  }

  getAllInsights(): Insight[] {
    return this.insightStore.getAllInsights();
  }

  getGraph(): { nodes: Fact[]; edges: { source: string; target: string; weight: number; insightId?: string }[] } {
    const facts = this.memoryStore.getAllFacts();
    const insights = this.insightStore.getAllInsights();
    const edges: { source: string; target: string; weight: number; insightId?: string }[] = [];

    for (const insight of insights) {
      for (let i = 0; i < insight.factIds.length; i++) {
        for (let j = i + 1; j < insight.factIds.length; j++) {
          edges.push({
            source: insight.factIds[i],
            target: insight.factIds[j],
            weight: insight.confidence,
            insightId: insight.id,
          });
        }
      }
    }

    return { nodes: facts, edges };
  }

  async shutdown(): Promise<void> {
    this.backgroundLoop.stop();
    this.db.close();
  }
}

export function createArnold(
  config: Partial<ArnoldConfig> & { llmAdapter: LLMAdapter; dbPath: string }
): Arnold {
  return new Arnold(config);
}

// Re-exports
export { ClaudeAdapter } from './llm/claude';
export { BaseLLMAdapter } from './llm/adapter';
export type {
  Fact,
  Insight,
  DriftLogEntry,
  ArnoldConfig,
  ArnoldState,
  ArnoldStats,
  LLMAdapter,
  UnresolvedQuestion,
  Conversation,
} from './types';
