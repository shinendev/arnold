import { LLMAdapter } from '../types';

export abstract class BaseLLMAdapter implements LLMAdapter {
  abstract generateText(prompt: string): Promise<string>;
  abstract generateEmbedding(text: string): Promise<number[]>;
}
