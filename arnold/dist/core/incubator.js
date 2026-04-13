"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Incubator = void 0;
const uuid_1 = require("uuid");
const prompts_1 = require("../llm/prompts");
class Incubator {
    db;
    memoryStore;
    insightStore;
    llm;
    constructor(db, memoryStore, insightStore, llm) {
        this.db = db;
        this.memoryStore = memoryStore;
        this.insightStore = insightStore;
        this.llm = llm;
    }
    async addQuestion(question, originalAnswer, conversationId) {
        const id = (0, uuid_1.v4)();
        this.db.raw.prepare(`
      INSERT INTO unresolved_questions (id, question, original_answer, conversation_id, resolved, created_at)
      VALUES (?, ?, ?, ?, 0, ?)
    `).run(id, question, originalAnswer ?? null, conversationId ?? null, Date.now());
    }
    async detectAndStoreQuestions(userMessage, agentResponse, conversationId) {
        try {
            const response = await this.llm.generateText(prompts_1.PROMPTS.detectQuestions(userMessage, agentResponse));
            const questions = JSON.parse(response);
            if (Array.isArray(questions)) {
                for (const q of questions) {
                    if (q.question) {
                        await this.addQuestion(q.question, q.original_answer, conversationId);
                    }
                }
            }
        }
        catch {
            // Parse or LLM failure — skip
        }
    }
    getUnresolved() {
        const rows = this.db.raw.prepare('SELECT * FROM unresolved_questions WHERE resolved = 0 ORDER BY created_at DESC').all();
        return rows.map(row => ({
            id: row.id,
            question: row.question,
            originalAnswer: row.original_answer ?? undefined,
            conversationId: row.conversation_id ?? undefined,
            resolved: row.resolved === 1,
            resolvedInsightId: row.resolved_insight_id ?? undefined,
            createdAt: row.created_at,
        }));
    }
    async incubate(limit = 3) {
        const unresolvedList = this.getUnresolved().slice(0, limit);
        if (unresolvedList.length === 0)
            return [];
        const allFacts = this.memoryStore.getRecentFacts(30);
        const factTexts = allFacts.map(f => f.content);
        const entries = [];
        for (const uq of unresolvedList) {
            try {
                const response = await this.llm.generateText(prompts_1.PROMPTS.incubate(uq.question, uq.originalAnswer || 'No answer given', factTexts));
                const trimmed = response.trim();
                if (trimmed.startsWith('RESOLVED:')) {
                    const newAnswer = trimmed.replace('RESOLVED:', '').trim();
                    const insight = await this.insightStore.addInsight(`Resolved question: "${uq.question}" — ${newAnswer}`, allFacts.slice(0, 5).map(f => f.id), 0.7, 'incubation');
                    this.db.raw.prepare('UPDATE unresolved_questions SET resolved = 1, resolved_insight_id = ? WHERE id = ?').run(insight.id, uq.id);
                    await this.memoryStore.addFact(newAnswer, 'insight');
                    entries.push({
                        id: (0, uuid_1.v4)(),
                        timestamp: Date.now(),
                        phase: 'incubate',
                        input: uq.question,
                        output: newAnswer,
                        factIds: allFacts.slice(0, 5).map(f => f.id),
                        insightGenerated: true,
                        insightId: insight.id,
                    });
                }
                else {
                    entries.push({
                        id: (0, uuid_1.v4)(),
                        timestamp: Date.now(),
                        phase: 'incubate',
                        input: uq.question,
                        output: 'STILL_UNCERTAIN',
                        factIds: [],
                        insightGenerated: false,
                    });
                }
            }
            catch {
                // LLM call failed — skip
            }
        }
        return entries;
    }
}
exports.Incubator = Incubator;
//# sourceMappingURL=incubator.js.map