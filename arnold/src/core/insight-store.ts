import { v4 as uuid } from 'uuid';
import { ArnoldDB } from '../db/sqlite';
import { Insight, LLMAdapter } from '../types';
import { serializeEmbedding, deserializeEmbedding } from '../llm/embeddings';

interface InsightRow {
  id: string;
  content: string;
  fact_ids: string;
  confidence: number;
  type: string;
  embedding: Buffer | null;
  created_at: number;
  delivered: number;
  delivered_at: number | null;
}

function rowToInsight(row: InsightRow): Insight {
  return {
    id: row.id,
    content: row.content,
    factIds: JSON.parse(row.fact_ids),
    confidence: row.confidence,
    type: row.type as Insight['type'],
    embedding: row.embedding ? deserializeEmbedding(row.embedding) : [],
    createdAt: row.created_at,
    delivered: row.delivered === 1,
    deliveredAt: row.delivered_at ?? undefined,
  };
}

export class InsightStore {
  constructor(
    private db: ArnoldDB,
    private llm: LLMAdapter,
  ) {}

  async addInsight(
    content: string,
    factIds: string[],
    confidence: number,
    type: Insight['type'],
  ): Promise<Insight> {
    const id = uuid();
    const now = Date.now();
    const embedding = await this.llm.generateEmbedding(content);
    const embeddingBuf = serializeEmbedding(embedding);

    this.db.raw.prepare(`
      INSERT INTO insights (id, content, fact_ids, confidence, type, embedding, created_at, delivered, delivered_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0, NULL)
    `).run(id, content, JSON.stringify(factIds), confidence, type, embeddingBuf, now);

    return {
      id, content, factIds, confidence, type, embedding,
      createdAt: now, delivered: false,
    };
  }

  getUndelivered(): Insight[] {
    const rows = this.db.raw.prepare(
      'SELECT * FROM insights WHERE delivered = 0 ORDER BY confidence DESC'
    ).all() as InsightRow[];
    return rows.map(rowToInsight);
  }

  markDelivered(insightId: string): void {
    this.db.raw.prepare(
      'UPDATE insights SET delivered = 1, delivered_at = ? WHERE id = ?'
    ).run(Date.now(), insightId);
  }

  markAllDelivered(): void {
    this.db.raw.prepare(
      'UPDATE insights SET delivered = 1, delivered_at = ? WHERE delivered = 0'
    ).run(Date.now());
  }

  markDeliveredBatch(insightIds: string[]): void {
    if (insightIds.length === 0) return;
    const now = Date.now();
    const stmt = this.db.raw.prepare(
      'UPDATE insights SET delivered = 1, delivered_at = ? WHERE id = ?'
    );
    const tx = this.db.raw.transaction((ids: string[]) => {
      for (const id of ids) {
        stmt.run(now, id);
      }
    });
    tx(insightIds);
  }

  getAllInsights(): Insight[] {
    const rows = this.db.raw.prepare(
      'SELECT * FROM insights ORDER BY created_at DESC'
    ).all() as InsightRow[];
    return rows.map(rowToInsight);
  }

  getInsightCount(): number {
    const row = this.db.raw.prepare(
      'SELECT COUNT(*) as count FROM insights'
    ).get() as { count: number };
    return row.count;
  }

  getRecentInsights(limit = 10): Insight[] {
    const rows = this.db.raw.prepare(
      'SELECT * FROM insights ORDER BY created_at DESC LIMIT ?'
    ).all(limit) as InsightRow[];
    return rows.map(rowToInsight);
  }
}
