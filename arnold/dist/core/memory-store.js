"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryStore = void 0;
const uuid_1 = require("uuid");
const embeddings_1 = require("../llm/embeddings");
const prompts_1 = require("../llm/prompts");
function rowToFact(row) {
    return {
        id: row.id,
        content: row.content,
        embedding: row.embedding ? (0, embeddings_1.deserializeEmbedding)(row.embedding) : [],
        source: row.source,
        sourceConversationId: row.source_conversation_id ?? undefined,
        activationWeight: row.activation_weight,
        recallCount: row.recall_count,
        isPermanent: row.is_permanent === 1,
        tags: JSON.parse(row.tags || '[]'),
        createdAt: row.created_at,
        lastAccessedAt: row.last_accessed_at,
    };
}
class MemoryStore {
    db;
    llm;
    constructor(db, llm) {
        this.db = db;
        this.llm = llm;
    }
    async addFact(content, source, conversationId) {
        const id = (0, uuid_1.v4)();
        const now = Date.now();
        const embedding = await this.llm.generateEmbedding(content);
        let tags = [];
        try {
            const tagResponse = await this.llm.generateText(prompts_1.PROMPTS.extractTags(content));
            tags = JSON.parse(tagResponse);
        }
        catch {
            tags = [];
        }
        const embeddingBuf = (0, embeddings_1.serializeEmbedding)(embedding);
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
    recallFacts(queryEmbedding, limit = 10) {
        const rows = this.db.raw.prepare('SELECT * FROM facts ORDER BY activation_weight DESC').all();
        const scored = rows
            .map(row => {
            const fact = rowToFact(row);
            const similarity = fact.embedding.length > 0
                ? (0, embeddings_1.cosineSimilarity)(queryEmbedding, fact.embedding)
                : 0;
            return { fact, similarity };
        })
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, limit);
        const now = Date.now();
        const updateStmt = this.db.raw.prepare('UPDATE facts SET recall_count = recall_count + 1, last_accessed_at = ? WHERE id = ?');
        for (const { fact } of scored) {
            updateStmt.run(now, fact.id);
        }
        return scored.map(s => s.fact);
    }
    getRandomFactPair(simMin, simMax) {
        const rows = this.db.raw.prepare('SELECT * FROM facts WHERE embedding IS NOT NULL ORDER BY RANDOM() LIMIT 50').all();
        const facts = rows.map(rowToFact);
        for (let i = 0; i < facts.length; i++) {
            for (let j = i + 1; j < facts.length; j++) {
                if (facts[i].embedding.length === 0 || facts[j].embedding.length === 0)
                    continue;
                const sim = (0, embeddings_1.cosineSimilarity)(facts[i].embedding, facts[j].embedding);
                if (sim >= simMin && sim <= simMax) {
                    return [facts[i], facts[j]];
                }
            }
        }
        return null;
    }
    getAllFacts() {
        const rows = this.db.raw.prepare('SELECT * FROM facts').all();
        return rows.map(rowToFact);
    }
    getRecentFacts(limit = 20) {
        const rows = this.db.raw.prepare('SELECT * FROM facts ORDER BY created_at DESC LIMIT ?').all(limit);
        return rows.map(rowToFact);
    }
    getFactsByConversation(conversationId) {
        const rows = this.db.raw.prepare('SELECT * FROM facts WHERE source_conversation_id = ?').all(conversationId);
        return rows.map(rowToFact);
    }
    getFactById(id) {
        const row = this.db.raw.prepare('SELECT * FROM facts WHERE id = ?').get(id);
        return row ? rowToFact(row) : null;
    }
    decayAll(rate) {
        this.db.raw.prepare('UPDATE facts SET activation_weight = activation_weight * ? WHERE is_permanent = 0').run(1 - rate);
    }
    pruneBelow(threshold) {
        const result = this.db.raw.prepare('DELETE FROM facts WHERE activation_weight < ? AND is_permanent = 0').run(threshold);
        return result.changes;
    }
    promoteFact(factId) {
        this.db.raw.prepare('UPDATE facts SET activation_weight = 1.0, is_permanent = 1 WHERE id = ?').run(factId);
    }
    boostActivation(factId, amount) {
        this.db.raw.prepare('UPDATE facts SET activation_weight = MIN(1.0, activation_weight + ?) WHERE id = ?').run(amount, factId);
    }
    getFactCount() {
        const row = this.db.raw.prepare('SELECT COUNT(*) as count FROM facts').get();
        return row.count;
    }
    getPermanentFactCount() {
        const row = this.db.raw.prepare('SELECT COUNT(*) as count FROM facts WHERE is_permanent = 1').get();
        return row.count;
    }
    findDuplicates(threshold = 0.95) {
        const facts = this.getAllFacts().filter(f => f.embedding.length > 0);
        const pairs = [];
        for (let i = 0; i < facts.length; i++) {
            for (let j = i + 1; j < facts.length; j++) {
                const sim = (0, embeddings_1.cosineSimilarity)(facts[i].embedding, facts[j].embedding);
                if (sim > threshold) {
                    pairs.push([facts[i], facts[j]]);
                }
            }
        }
        return pairs;
    }
    mergeFacts(keepId, removeId) {
        const keep = this.getFactById(keepId);
        const remove = this.getFactById(removeId);
        if (!keep || !remove)
            return;
        this.db.raw.prepare('UPDATE facts SET activation_weight = MIN(1.0, activation_weight + ?), recall_count = recall_count + ? WHERE id = ?').run(remove.activationWeight * 0.5, remove.recallCount, keepId);
        this.db.raw.prepare('DELETE FROM facts WHERE id = ?').run(removeId);
    }
}
exports.MemoryStore = MemoryStore;
//# sourceMappingURL=memory-store.js.map