import { MemoryStore } from './memory-store';
import { InsightStore } from './insight-store';
import { LLMAdapter, DriftLogEntry } from '../types';
import { PROMPTS } from '../llm/prompts';
import { v4 as uuid } from 'uuid';

export class ReplayEngine {
  constructor(
    private memoryStore: MemoryStore,
    private insightStore: InsightStore,
    private llm: LLMAdapter,
  ) {}

  async replay(count = 5): Promise<DriftLogEntry[]> {
    const recentFacts = this.memoryStore.getRecentFacts(count * 3);
    if (recentFacts.length === 0) return [];

    const toReplay = recentFacts.slice(0, count);
    const contextFacts = recentFacts.slice(count).map(f => f.content);
    const entries: DriftLogEntry[] = [];

    for (const fact of toReplay) {
      try {
        const response = await this.llm.generateText(
          PROMPTS.replayFact(fact.content, contextFacts)
        );

        const trimmed = response.trim();
        const unchanged = trimmed.toUpperCase() === 'UNCHANGED';

        if (!unchanged && trimmed.length > 0) {
          const newFact = await this.memoryStore.addFact(
            trimmed, 'insight', fact.sourceConversationId
          );

          entries.push({
            id: uuid(),
            timestamp: Date.now(),
            phase: 'replay',
            input: fact.content,
            output: `Updated understanding: ${trimmed}`,
            factIds: [fact.id, newFact.id],
            insightGenerated: false,
          });
        }

        this.memoryStore.boostActivation(fact.id, 0.1);

        if (unchanged) {
          entries.push({
            id: uuid(),
            timestamp: Date.now(),
            phase: 'replay',
            input: fact.content,
            output: 'UNCHANGED',
            factIds: [fact.id],
            insightGenerated: false,
          });
        }
      } catch (error) {
        // LLM call failed — skip this fact, continue with others
      }
    }

    return entries;
  }
}
