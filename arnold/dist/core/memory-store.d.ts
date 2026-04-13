import { ArnoldDB } from '../db/sqlite';
import { Fact, LLMAdapter } from '../types';
export declare class MemoryStore {
    private db;
    private llm;
    constructor(db: ArnoldDB, llm: LLMAdapter);
    addFact(content: string, source: Fact['source'], conversationId?: string): Promise<Fact>;
    recallFacts(queryEmbedding: number[], limit?: number): Fact[];
    getRandomFactPair(simMin: number, simMax: number): [Fact, Fact] | null;
    getAllFacts(): Fact[];
    getRecentFacts(limit?: number): Fact[];
    getFactsByConversation(conversationId: string): Fact[];
    getFactById(id: string): Fact | null;
    decayAll(rate: number): void;
    pruneBelow(threshold: number): number;
    promoteFact(factId: string): void;
    boostActivation(factId: string, amount: number): void;
    getFactCount(): number;
    getPermanentFactCount(): number;
    findDuplicates(threshold?: number): [Fact, Fact][];
    mergeFacts(keepId: string, removeId: string): void;
}
//# sourceMappingURL=memory-store.d.ts.map