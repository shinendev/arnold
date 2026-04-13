"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseLLMAdapter = exports.ClaudeAdapter = exports.Arnold = void 0;
exports.createArnold = createArnold;
const uuid_1 = require("uuid");
const types_1 = require("./types");
const sqlite_1 = require("./db/sqlite");
const memory_store_1 = require("./core/memory-store");
const insight_store_1 = require("./core/insight-store");
const replay_engine_1 = require("./core/replay-engine");
const associator_1 = require("./core/associator");
const incubator_1 = require("./core/incubator");
const consolidator_1 = require("./core/consolidator");
const loop_1 = require("./background/loop");
const scheduler_1 = require("./background/scheduler");
const drift_log_1 = require("./background/drift-log");
const prompts_1 = require("./llm/prompts");
class Arnold {
    db;
    memoryStore;
    insightStore;
    replayEngine;
    associator;
    incubator;
    consolidator;
    backgroundLoop;
    scheduler;
    driftLog;
    config;
    currentConversationId = null;
    constructor(config) {
        this.config = { ...types_1.DEFAULT_CONFIG, ...config };
        this.db = new sqlite_1.ArnoldDB(this.config.dbPath);
        this.memoryStore = new memory_store_1.MemoryStore(this.db, this.config.llmAdapter);
        this.insightStore = new insight_store_1.InsightStore(this.db, this.config.llmAdapter);
        this.driftLog = new drift_log_1.DriftLog(this.db);
        this.scheduler = new scheduler_1.Scheduler(this.config);
        this.replayEngine = new replay_engine_1.ReplayEngine(this.memoryStore, this.insightStore, this.config.llmAdapter);
        this.associator = new associator_1.Associator(this.memoryStore, this.insightStore, this.config.llmAdapter, this.config);
        this.incubator = new incubator_1.Incubator(this.db, this.memoryStore, this.insightStore, this.config.llmAdapter);
        this.consolidator = new consolidator_1.Consolidator(this.memoryStore, this.insightStore, this.config.llmAdapter, this.config);
        this.backgroundLoop = new loop_1.BackgroundLoop(this.config, this.memoryStore, this.insightStore, this.replayEngine, this.associator, this.incubator, this.consolidator, this.scheduler, this.driftLog);
        this.backgroundLoop.start();
        // Arm idle/dreaming timers immediately so background thinking starts
        // even before the first explicit wake/ingest call.
        this.scheduler.wake();
    }
    async wake() {
        this.scheduler.wake();
        if (!this.currentConversationId) {
            this.currentConversationId = (0, uuid_1.v4)();
            this.db.raw.prepare('INSERT INTO conversations (id, started_at, last_message_at, message_count) VALUES (?, ?, ?, 0)').run(this.currentConversationId, Date.now(), Date.now());
        }
    }
    async ingest(userMessage, agentResponse) {
        this.scheduler.wake();
        // Update conversation
        if (this.currentConversationId) {
            this.db.raw.prepare('UPDATE conversations SET last_message_at = ?, message_count = message_count + 1 WHERE id = ?').run(Date.now(), this.currentConversationId);
        }
        // Extract facts
        try {
            const response = await this.config.llmAdapter.generateText(prompts_1.PROMPTS.extractFacts(userMessage, agentResponse));
            const facts = JSON.parse(response);
            if (Array.isArray(facts)) {
                for (const factText of facts) {
                    if (typeof factText === 'string' && factText.trim()) {
                        await this.memoryStore.addFact(factText.trim(), 'conversation', this.currentConversationId ?? undefined);
                    }
                }
            }
        }
        catch {
            // Parse or LLM failure — continue
        }
        // Detect unresolved questions
        await this.incubator.detectAndStoreQuestions(userMessage, agentResponse, this.currentConversationId ?? undefined);
    }
    async getUndeliveredInsights() {
        return this.insightStore.getUndelivered();
    }
    acknowledgeInsights(insightIds) {
        this.insightStore.markDeliveredBatch(insightIds);
    }
    getState() {
        return this.scheduler.state;
    }
    getStats() {
        return {
            totalFacts: this.memoryStore.getFactCount(),
            totalInsights: this.insightStore.getInsightCount(),
            totalPermanentFacts: this.memoryStore.getPermanentFactCount(),
            cyclesCompleted: this.backgroundLoop.getCycleCount(),
            state: this.scheduler.state,
            lastCycleAt: this.backgroundLoop.getLastCycleAt(),
        };
    }
    getDriftLog(limit = 50) {
        return this.driftLog.getRecent(limit);
    }
    getAllFacts() {
        return this.memoryStore.getAllFacts();
    }
    getAllInsights() {
        return this.insightStore.getAllInsights();
    }
    getGraph() {
        const facts = this.memoryStore.getAllFacts();
        const insights = this.insightStore.getAllInsights();
        const edges = [];
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
    async shutdown() {
        this.backgroundLoop.stop();
        this.db.close();
    }
}
exports.Arnold = Arnold;
function createArnold(config) {
    return new Arnold(config);
}
// Re-exports
var claude_1 = require("./llm/claude");
Object.defineProperty(exports, "ClaudeAdapter", { enumerable: true, get: function () { return claude_1.ClaudeAdapter; } });
var adapter_1 = require("./llm/adapter");
Object.defineProperty(exports, "BaseLLMAdapter", { enumerable: true, get: function () { return adapter_1.BaseLLMAdapter; } });
//# sourceMappingURL=index.js.map