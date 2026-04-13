"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InsightStore = void 0;
const uuid_1 = require("uuid");
const embeddings_1 = require("../llm/embeddings");
function rowToInsight(row) {
    return {
        id: row.id,
        content: row.content,
        factIds: JSON.parse(row.fact_ids),
        confidence: row.confidence,
        type: row.type,
        embedding: row.embedding ? (0, embeddings_1.deserializeEmbedding)(row.embedding) : [],
        createdAt: row.created_at,
        delivered: row.delivered === 1,
        deliveredAt: row.delivered_at ?? undefined,
    };
}
class InsightStore {
    db;
    llm;
    constructor(db, llm) {
        this.db = db;
        this.llm = llm;
    }
    async addInsight(content, factIds, confidence, type) {
        const id = (0, uuid_1.v4)();
        const now = Date.now();
        const embedding = await this.llm.generateEmbedding(content);
        const embeddingBuf = (0, embeddings_1.serializeEmbedding)(embedding);
        this.db.raw.prepare(`
      INSERT INTO insights (id, content, fact_ids, confidence, type, embedding, created_at, delivered, delivered_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0, NULL)
    `).run(id, content, JSON.stringify(factIds), confidence, type, embeddingBuf, now);
        return {
            id, content, factIds, confidence, type, embedding,
            createdAt: now, delivered: false,
        };
    }
    getUndelivered() {
        const rows = this.db.raw.prepare('SELECT * FROM insights WHERE delivered = 0 ORDER BY confidence DESC').all();
        return rows.map(rowToInsight);
    }
    markDelivered(insightId) {
        this.db.raw.prepare('UPDATE insights SET delivered = 1, delivered_at = ? WHERE id = ?').run(Date.now(), insightId);
    }
    markAllDelivered() {
        this.db.raw.prepare('UPDATE insights SET delivered = 1, delivered_at = ? WHERE delivered = 0').run(Date.now());
    }
    markDeliveredBatch(insightIds) {
        if (insightIds.length === 0)
            return;
        const now = Date.now();
        const stmt = this.db.raw.prepare('UPDATE insights SET delivered = 1, delivered_at = ? WHERE id = ?');
        const tx = this.db.raw.transaction((ids) => {
            for (const id of ids) {
                stmt.run(now, id);
            }
        });
        tx(insightIds);
    }
    getAllInsights() {
        const rows = this.db.raw.prepare('SELECT * FROM insights ORDER BY created_at DESC').all();
        return rows.map(rowToInsight);
    }
    getInsightCount() {
        const row = this.db.raw.prepare('SELECT COUNT(*) as count FROM insights').get();
        return row.count;
    }
    getRecentInsights(limit = 10) {
        const rows = this.db.raw.prepare('SELECT * FROM insights ORDER BY created_at DESC LIMIT ?').all(limit);
        return rows.map(rowToInsight);
    }
}
exports.InsightStore = InsightStore;
//# sourceMappingURL=insight-store.js.map