"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReplayEngine = void 0;
const prompts_1 = require("../llm/prompts");
const uuid_1 = require("uuid");
class ReplayEngine {
    memoryStore;
    insightStore;
    llm;
    constructor(memoryStore, insightStore, llm) {
        this.memoryStore = memoryStore;
        this.insightStore = insightStore;
        this.llm = llm;
    }
    async replay(count = 5) {
        const recentFacts = this.memoryStore.getRecentFacts(count * 3);
        if (recentFacts.length === 0)
            return [];
        const toReplay = recentFacts.slice(0, count);
        const contextFacts = recentFacts.slice(count).map(f => f.content);
        const entries = [];
        for (const fact of toReplay) {
            try {
                const response = await this.llm.generateText(prompts_1.PROMPTS.replayFact(fact.content, contextFacts));
                const trimmed = response.trim();
                const unchanged = trimmed.toUpperCase() === 'UNCHANGED';
                if (!unchanged && trimmed.length > 0) {
                    const newFact = await this.memoryStore.addFact(trimmed, 'insight', fact.sourceConversationId);
                    entries.push({
                        id: (0, uuid_1.v4)(),
                        timestamp: Date.now(),
                        phase: 'replay',
                        input: fact.content,
                        output: `Updated understanding: ${trimmed}`,
                        factIds: [fact.id, newFact.id],
                        insightGenerated: false,
                    });
                }
                this.memoryStore.boostActivation(fact.id, 0.1);
                if (unchanged) {
                    entries.push({
                        id: (0, uuid_1.v4)(),
                        timestamp: Date.now(),
                        phase: 'replay',
                        input: fact.content,
                        output: 'UNCHANGED',
                        factIds: [fact.id],
                        insightGenerated: false,
                    });
                }
            }
            catch (error) {
                // LLM call failed — skip this fact, continue with others
            }
        }
        return entries;
    }
}
exports.ReplayEngine = ReplayEngine;
//# sourceMappingURL=replay-engine.js.map