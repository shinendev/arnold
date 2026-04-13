import { MemoryStore } from './memory-store';
import { InsightStore } from './insight-store';
import { LLMAdapter, DriftLogEntry, ArnoldConfig } from '../types';
export declare class Associator {
    private memoryStore;
    private insightStore;
    private llm;
    private config;
    constructor(memoryStore: MemoryStore, insightStore: InsightStore, llm: LLMAdapter, config: Pick<ArnoldConfig, 'associationSampleSize' | 'similaritySweetSpotMin' | 'similaritySweetSpotMax' | 'maxInsightsPerCycle'>);
    associate(): Promise<DriftLogEntry[]>;
}
//# sourceMappingURL=associator.d.ts.map