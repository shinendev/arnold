import { ArnoldConfig, ArnoldState, ArnoldStats, DriftLogEntry, Insight, Fact, LLMAdapter } from './types';
export declare class Arnold {
    private db;
    private memoryStore;
    private insightStore;
    private replayEngine;
    private associator;
    private incubator;
    private consolidator;
    private backgroundLoop;
    private scheduler;
    private driftLog;
    private config;
    private currentConversationId;
    constructor(config: Partial<ArnoldConfig> & {
        llmAdapter: LLMAdapter;
        dbPath: string;
    });
    wake(): Promise<void>;
    ingest(userMessage: string, agentResponse: string): Promise<void>;
    getUndeliveredInsights(): Promise<Insight[]>;
    acknowledgeInsights(insightIds: string[]): void;
    getState(): ArnoldState;
    getStats(): ArnoldStats;
    getDriftLog(limit?: number): DriftLogEntry[];
    getAllFacts(): Fact[];
    getAllInsights(): Insight[];
    getGraph(): {
        nodes: Fact[];
        edges: {
            source: string;
            target: string;
            weight: number;
            insightId?: string;
        }[];
    };
    shutdown(): Promise<void>;
}
export declare function createArnold(config: Partial<ArnoldConfig> & {
    llmAdapter: LLMAdapter;
    dbPath: string;
}): Arnold;
export { ClaudeAdapter } from './llm/claude';
export { BaseLLMAdapter } from './llm/adapter';
export type { Fact, Insight, DriftLogEntry, ArnoldConfig, ArnoldState, ArnoldStats, LLMAdapter, UnresolvedQuestion, Conversation, } from './types';
//# sourceMappingURL=index.d.ts.map