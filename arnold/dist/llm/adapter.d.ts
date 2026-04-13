import { LLMAdapter } from '../types';
export declare abstract class BaseLLMAdapter implements LLMAdapter {
    abstract generateText(prompt: string): Promise<string>;
    abstract generateEmbedding(text: string): Promise<number[]>;
}
//# sourceMappingURL=adapter.d.ts.map