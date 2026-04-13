import { BaseLLMAdapter } from './adapter';
export declare class ClaudeAdapter extends BaseLLMAdapter {
    private client;
    private model;
    constructor(config: {
        apiKey: string;
        model?: string;
    });
    generateText(prompt: string): Promise<string>;
    generateEmbedding(text: string): Promise<number[]>;
    /**
     * Deterministic pseudo-embedding based on character n-gram hashing.
     * NOT a real semantic embedding — sufficient for prototyping similarity
     * when a proper embedding API is unavailable.
     */
    private hashEmbedding;
}
//# sourceMappingURL=claude.d.ts.map