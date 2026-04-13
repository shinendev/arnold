import { MemoryStore } from './memory-store';
import { InsightStore } from './insight-store';
import { LLMAdapter, DriftLogEntry, ArnoldConfig } from '../types';
export declare class Consolidator {
    private memoryStore;
    private insightStore;
    private llm;
    private config;
    constructor(memoryStore: MemoryStore, insightStore: InsightStore, llm: LLMAdapter, config: Pick<ArnoldConfig, 'decayRate' | 'pruneThreshold' | 'promotionThreshold'>);
    consolidate(): Promise<DriftLogEntry[]>;
    private findContradictions;
}
//# sourceMappingURL=consolidator.d.ts.map