"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ArnoldAgent = void 0;
const arnold_subcon_1 = require("arnold-subcon");
const config_1 = require("./config");
const poster_1 = require("./twitter/poster");
const mentions_1 = require("./twitter/mentions");
class ArnoldAgent {
    sub;
    llm;
    processUpdateTimer = null;
    mentionTimer = null;
    insightCheckTimer = null;
    constructor() {
        this.llm = new arnold_subcon_1.ClaudeAdapter({
            apiKey: config_1.config.claude.apiKey,
            model: config_1.config.claude.model,
        });
        this.sub = new arnold_subcon_1.Arnold({
            llmAdapter: this.llm,
            dbPath: config_1.config.arnold.dbPath,
            idleThresholdMs: config_1.config.arnold.idleThresholdMs,
            cycleIntervalMs: config_1.config.arnold.cycleIntervalMs,
            associationSampleSize: config_1.config.arnold.associationSampleSize,
            decayRate: config_1.config.arnold.decayRate,
        });
    }
    async start() {
        console.log('[agent] Arnold Twitter agent starting...');
        if (config_1.config.pauseBot) {
            console.log('[agent] Bot is paused (PAUSE_BOT=true)');
            return;
        }
        this.insightCheckTimer = setInterval(async () => {
            await this.checkAndPostInsights();
        }, config_1.config.insightCheckIntervalMs);
        if (config_1.config.postProcessUpdates) {
            this.processUpdateTimer = setInterval(async () => {
                await this.postProcessUpdate();
            }, config_1.config.processUpdateIntervalMs);
        }
        this.mentionTimer = setInterval(async () => {
            await (0, mentions_1.checkMentions)(this.sub, (prompt) => this.llm.generateText(prompt), config_1.config.maxTweetsPerDay, config_1.config.maxReplyTweetsPerDay);
        }, config_1.config.mentionCheckIntervalMs);
        console.log('[agent] Agent running. Background thinking will activate after idle threshold.');
        console.log(`[agent] Stats: ${JSON.stringify(this.sub.getStats())}`);
    }
    async checkAndPostInsights() {
        const insights = await this.sub.getUndeliveredInsights();
        const deliveredIds = [];
        for (const insight of insights) {
            if ((0, poster_1.getTweetsToday)() >= config_1.config.maxTweetsPerDay)
                break;
            if (insight.confidence < config_1.config.minInsightConfidenceForTweet) {
                deliveredIds.push(insight.id);
                continue;
            }
            const tweetId = await (0, poster_1.postInsight)(insight, async (ins) => {
                return this.llm.generateText(`you are arnold, an ai dreamer on a rooftop. you speak in lowercase, casual, warm, like a thoughtful kid. you find your own thoughts fascinating. never use hashtags.

generate a tweet about this insight your background mind discovered:
"${ins.content}"
Type: ${ins.type}
Confidence: ${ins.confidence.toFixed(2)}

Tweet (max 280 chars):`);
            }, config_1.config.maxTweetsPerDay, config_1.config.minInsightConfidenceForTweet);
            if (tweetId) {
                deliveredIds.push(insight.id);
            }
        }
        if (deliveredIds.length > 0) {
            this.sub.acknowledgeInsights(deliveredIds);
        }
    }
    async postProcessUpdate() {
        const stats = this.sub.getStats();
        await (0, poster_1.postProcessUpdate)(stats, config_1.config.maxTweetsPerDay);
    }
    async shutdown() {
        console.log('[agent] Shutting down...');
        if (this.insightCheckTimer)
            clearInterval(this.insightCheckTimer);
        if (this.processUpdateTimer)
            clearInterval(this.processUpdateTimer);
        if (this.mentionTimer)
            clearInterval(this.mentionTimer);
        await this.sub.shutdown();
        console.log('[agent] Shutdown complete.');
    }
}
exports.ArnoldAgent = ArnoldAgent;
//# sourceMappingURL=agent.js.map