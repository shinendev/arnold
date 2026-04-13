import { v4 as uuid } from 'uuid';
import { ArnoldDB } from '../db/sqlite';
import { Fact, LLMAdapter } from '../types';
import { cosineSimilarity, serializeEmbedding, deserializeEmbedding } from '../llm/embeddings';
import { PROMPTS } from '../llm/prompts';

interface FactRow {
  id: string;
  content: string;
  embedding: Buffer | null;
  source: string;
  source_conversation_id: string | null;
  activation_weight: number;
  recall_count: number;
  is_permanent: number;
  tags: string;
  created_at: number;
  last_accessed_at: number;
}

function rowToFact(row: FactRow): Fact {
  return {
    id: row.id,
    content: row.content,
    embedding: row.embedding ? deserializeEmbedding(row.embedding) : [],
    source: row.source as Fact['source'],
    sourceConversationId: row.source_conversation_id ?? undefined,
    activationWeight: row.activation_weight,
    recallCount: row.recall_count,
    isPermanent: row.is_permanent === 1,
    tags: JSON.parse(row.tags || '[]'),
    createdAt: row.created_at,
    lastAccessedAt: row.last_accessed_at,
  };
}

export class MemoryStore {
  constructor(
    private db: ArnoldDB,
    private llm: LLMAdapter,
  ) {}

  async addFact(
    content: string,
    source: Fact['source'],
    conversationId?: string,
  ): Promise<Fact> {
    const id = uuid();
    const now = Date.now();
    const embedding = await this.llm.generateEmbedding(content);

    let tags: string[] = [];
    try {
      const tagResponse = await this.llm.generateText(PROMPTS.extractTags(content));
      tags = JSON.parse(tagResponse);
    } catch {
      tags = [];
    }

    const embeddingBuf = serializeEmbedding(embedding);

    this.db.raw.prepare(`
      INSERT INTO facts (id, content, embedding, source, source_conversation_id,
        activation_weight, recall_count, is_permanent, tags, created_at, last_accessed_at)
      VALUES (?, ?, ?, ?, ?, 1.0, 0, 0, ?, ?, ?)
    `).run(id, content, embeddingBuf, source, conversationId ?? null, JSON.stringify(tags), now, now);

    return {
      id, content, embedding, source, sourceConversationId: conversationId,
      activationWeight: 1.0, recallCount: 0, isPermanent: false,
      tags, createdAt: now, lastAccessedAt: now,
    };
  }

  recallFacts(queryEmbedding: number[], limit = 10): Fact[] {
    const rows = this.db.raw.prepare(
      'SELECT * FROM facts ORDER BY activation_weight DESC'
    ).all() as FactRow[];

    const scored = rows
      .map(row => {
        const fact = rowToFact(row);
        const similarity = fact.embedding.length > 0
          ? cosineSimilarity(queryEmbedding, fact.embedding)
          : 0;
        return { fact, similarity };
      })
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);

    const now = Date.now();
    const updateStmt = this.db.raw.prepare(
      'UPDATE facts SET recall_count = recall_count + 1, last_accessed_at = ? WHERE id = ?'
    );
    for (const { fact } of scored) {
      updateStmt.run(now, fact.id);
    }

    return scored.map(s => s.fact);
  }

  getRandomFactPair(simMin: number, simMax: number): [Fact, Fact] | null {
    const rows = this.db.raw.prepare(
      'SELECT * FROM facts WHERE embedding IS NOT NULL ORDER BY RANDOM() LIMIT 50'
    ).all() as FactRow[];

    const facts = rows.map(rowToFact);

    for (let i = 0; i < facts.length; i++) {
      for (let j = i + 1; j < facts.length; j++) {
        if (facts[i].embedding.length === 0 || facts[j].embedding.length === 0) continue;
        const sim = cosineSimilarity(facts[i].embedding, facts[j].embedding);
        if (sim >= simMin && sim <= simMax) {
          return [facts[i], facts[j]];
        }
      }
    }
    return null;
  }

  getAllFacts(): Fact[] {
    const rows = this.db.raw.prepare('SELECT * FROM facts').all() as FactRow[];
    return rows.map(rowToFact);
  }

  getRecentFacts(limit = 20): Fact[] {
    const rows = this.db.raw.prepare(
      'SELECT * FROM facts ORDER BY created_at DESC LIMIT ?'
    ).all(limit) as FactRow[];
    return rows.map(rowToFact);
  }

  getFactsByConversation(conversationId: string): Fact[] {
    const rows = this.db.raw.prepare(
      'SELECT * FROM facts WHERE source_conversation_id = ?'
    ).all(conversationId) as FactRow[];
    return rows.map(rowToFact);
  }

  getFactById(id: string): Fact | null {
    const row = this.db.raw.prepare('SELECT * FROM facts WHERE id = ?').get(id) as FactRow | undefined;
    return row ? rowToFact(row) : null;
  }

  decayAll(rate: number): void {
    this.db.raw.prepare(
      'UPDATE facts SET activation_weight = activation_weight * ? WHERE is_permanent = 0'
    ).run(1 - rate);
  }

  pruneBelow(threshold: number): number {
    const result = this.db.raw.prepare(
      'DELETE FROM facts WHERE activation_weight < ? AND is_permanent = 0'
    ).run(threshold);
    return result.changes;
  }

  promoteFact(factId: string): void {
    this.db.raw.prepare(
      'UPDATE facts SET activation_weight = 1.0, is_permanent = 1 WHERE id = ?'
    ).run(factId);
  }

  boostActivation(factId: string, amount: number): void {
    this.db.raw.prepare(
      'UPDATE facts SET activation_weight = MIN(1.0, activation_weight + ?) WHERE id = ?'
    ).run(amount, factId);
  }

  getFactCount(): number {
    const row = this.db.raw.prepare('SELECT COUNT(*) as count FROM facts').get() as { count: number };
    return row.count;
  }

  getPermanentFactCount(): number {
    const row = this.db.raw.prepare(
      'SELECT COUNT(*) as count FROM facts WHERE is_permanent = 1'
    ).get() as { count: number };
    return row.count;
  }

  findDuplicates(threshold = 0.95): [Fact, Fact][] {
    const facts = this.getAllFacts().filter(f => f.embedding.length > 0);
    const pairs: [Fact, Fact][] = [];
    for (let i = 0; i < facts.length; i++) {
      for (let j = i + 1; j < facts.length; j++) {
        const sim = cosineSimilarity(facts[i].embedding, facts[j].embedding);
        if (sim > threshold) {
          pairs.push([facts[i], facts[j]]);
        }
      }
    }
    return pairs;
  }

  mergeFacts(keepId: string, removeId: string): void {
    const keep = this.getFactById(keepId);
    const remove = this.getFactById(removeId);
    if (!keep || !remove) return;

    this.db.raw.prepare(
      'UPDATE facts SET activation_weight = MIN(1.0, activation_weight + ?), recall_count = recall_count + ? WHERE id = ?'
    ).run(remove.activationWeight * 0.5, remove.recallCount, keepId);

    this.db.raw.prepare('DELETE FROM facts WHERE id = ?').run(removeId);
  }
}
