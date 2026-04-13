import { Arnold } from 'arnold-subcon';
export declare function checkMentions(sub: Arnold, llmGenerate: (prompt: string) => Promise<string>, maxPerDay: number, maxRepliesPerDay: number): Promise<void>;
