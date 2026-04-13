"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Associator = void 0;
const prompts_1 = require("../llm/prompts");
const uuid_1 = require("uuid");
class Associator {
    memoryStore;
    insightStore;
    llm;
    config;
    constructor(memoryStore, insightStore, llm, config) {
        this.memoryStore = memoryStore;
        this.insightStore = insightStore;
        this.llm = llm;
        this.config = config;
    }
    async associate() {
        const entries = [];
        let insightsFound = 0;
        for (let i = 0; i < this.config.associationSampleSize; i++) {
            if (insightsFound >= this.config.maxInsightsPerCycle)
                break;
            const pair = this.memoryStore.getRandomFactPair(this.config.similaritySweetSpotMin, this.config.similaritySweetSpotMax);
            if (!pair)
                continue;
            const [factA, factB] = pair;
            try {
                const response = await this.llm.generateText(prompts_1.PROMPTS.findAssociation(factA.content, factB.content));
                const trimmed = response.trim();
                if (trimmed.startsWith('INSIGHT:') || trimmed.includes('INSIGHT:')) {
                    const insightMatch = trimmed.match(/INSIGHT:\s*(.+?)(?:\n|$)/s);
                    const confidenceMatch = trimmed.match(/CONFIDENCE:\s*([\d.]+)/);
                    const insightText = insightMatch?.[1]?.trim() || trimmed;
                    const confidence = confidenceMatch
                        ? parseFloat(confidenceMatch[1])
                        : 0.6;
                    let qualityOverall = 1;
                    try {
                        const qualityRaw = await this.llm.generateText(prompts_1.PROMPTS.scoreInsightQuality(insightText, factA.content, factB.content));
                        const quality = JSON.parse(qualityRaw);
                        qualityOverall = typeof quality.overall === 'number' ? quality.overall : 0.5;
                    }
                    catch {
                        qualityOverall = 0.5;
                    }
                    if (confidence >= 0.5 && qualityOverall >= 0.55) {
                        const insight = await this.insightStore.addInsight(insightText, [factA.id, factB.id], confidence, 'association');
                        // The insight becomes a fact that can participate in future associations
                        await this.memoryStore.addFact(insightText, 'insight');
                        insightsFound++;
                        entries.push({
                            id: (0, uuid_1.v4)(),
                            timestamp: Date.now(),
                            phase: 'associate',
                            input: `"${factA.content}" × "${factB.content}"`,
                            output: insightText,
                            factIds: [factA.id, factB.id],
                            insightGenerated: true,
                            insightId: insight.id,
                        });
                    }
                }
                else {
                    entries.push({
                        id: (0, uuid_1.v4)(),
                        timestamp: Date.now(),
                        phase: 'associate',
                        input: `"${factA.content}" × "${factB.content}"`,
                        output: 'NO_CONNECTION',
                        factIds: [factA.id, factB.id],
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
exports.Associator = Associator;
//# sourceMappingURL=associator.js.map