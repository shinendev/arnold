import { ArnoldDB } from '../db/sqlite';
import { Insight, LLMAdapter } from '../types';
export declare class InsightStore {
    private db;
    private llm;
    constructor(db: ArnoldDB, llm: LLMAdapter);
    addInsight(content: string, factIds: string[], confidence: number, type: Insight['type']): Promise<Insight>;
    getUndelivered(): Insight[];
    markDelivered(insightId: string): void;
    markAllDelivered(): void;
    markDeliveredBatch(insightIds: string[]): void;
    getAllInsights(): Insight[];
    getInsightCount(): number;
    getRecentInsights(limit?: number): Insight[];
}
//# sourceMappingURL=insight-store.d.ts.map