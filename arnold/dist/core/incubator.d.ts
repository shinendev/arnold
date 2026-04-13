import { ArnoldDB } from '../db/sqlite';
import { MemoryStore } from './memory-store';
import { InsightStore } from './insight-store';
import { LLMAdapter, UnresolvedQuestion, DriftLogEntry } from '../types';
export declare class Incubator {
    private db;
    private memoryStore;
    private insightStore;
    private llm;
    constructor(db: ArnoldDB, memoryStore: MemoryStore, insightStore: InsightStore, llm: LLMAdapter);
    addQuestion(question: string, originalAnswer?: string, conversationId?: string): Promise<void>;
    detectAndStoreQuestions(userMessage: string, agentResponse: string, conversationId?: string): Promise<void>;
    getUnresolved(): UnresolvedQuestion[];
    incubate(limit?: number): Promise<DriftLogEntry[]>;
}
//# sourceMappingURL=incubator.d.ts.map