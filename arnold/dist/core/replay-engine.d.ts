import { MemoryStore } from './memory-store';
import { InsightStore } from './insight-store';
import { LLMAdapter, DriftLogEntry } from '../types';
export declare class ReplayEngine {
    private memoryStore;
    private insightStore;
    private llm;
    constructor(memoryStore: MemoryStore, insightStore: InsightStore, llm: LLMAdapter);
    replay(count?: number): Promise<DriftLogEntry[]>;
}
//# sourceMappingURL=replay-engine.d.ts.map