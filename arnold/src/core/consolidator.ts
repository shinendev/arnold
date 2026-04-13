import { v4 as uuid } from 'uuid';
import { MemoryStore } from './memory-store';
import { InsightStore } from './insight-store';
import { LLMAdapter, DriftLogEntry, ArnoldConfig } from '../types';
import { cosineSimilarity } from '../llm/embeddings';

export class Consolidator {
  constructor(
    private memoryStore: MemoryStore,
    private insightStore: InsightStore,
    private llm: LLMAdapter,
    private config: Pick<ArnoldConfig, 'decayRate' | 'pruneThreshold' | 'promotionThreshold'>,
  ) {}

  async consolidate(): Promise<DriftLogEntry[]> {
    const entries: DriftLogEntry[] = [];

    // 1. Decay
    this.memoryStore.decayAll(this.config.decayRate);
    entries.push({
      id: uuid(),
      timestamp: Date.now(),
      phase: 'consolidate',
      input: `decay rate: ${this.config.decayRate}`,
      output: 'Applied activation weight decay to all non-permanent facts',
      factIds: [],
      insightGenerated: false,
    });

    // 2. Prune
    const prunedCount = this.memoryStore.pruneBelow(this.config.pruneThreshold);
    if (prunedCount > 0) {
      entries.push({
        id: uuid(),
        timestamp: Date.now(),
        phase: 'consolidate',
        input: `threshold: ${this.config.pruneThreshold}`,
        output: `Pruned ${prunedCount} facts with low activation weights`,
        factIds: [],
        insightGenerated: false,
      });
    }

    // 3. Promote
    const allFacts = this.memoryStore.getAllFacts();
    let promotedCount = 0;
    for (const fact of allFacts) {
      if (!fact.isPermanent && fact.recallCount >= this.config.promotionThreshold) {
        this.memoryStore.promoteFact(fact.id);
        promotedCount++;
      }
    }
    if (promotedCount > 0) {
      entries.push({
        id: uuid(),
        timestamp: Date.now(),
        phase: 'consolidate',
        input: `promotion threshold: ${this.config.promotionThreshold} recalls`,
        output: `Promoted ${promotedCount} facts to permanent`,
        factIds: [],
        insightGenerated: false,
      });
    }

    // 4. Deduplicate
    const duplicates = this.memoryStore.findDuplicates(0.95);
    for (const [factA, factB] of duplicates) {
      const keepId = factA.recallCount >= factB.recallCount ? factA.id : factB.id;
      const removeId = keepId === factA.id ? factB.id : factA.id;
      this.memoryStore.mergeFacts(keepId, removeId);
    }
    if (duplicates.length > 0) {
      entries.push({
        id: uuid(),
        timestamp: Date.now(),
        phase: 'consolidate',
        input: `duplicate threshold: 0.95 cosine similarity`,
        output: `Merged ${duplicates.length} duplicate fact pairs`,
        factIds: [],
        insightGenerated: false,
      });
    }

    // 5. Contradiction detection
    const contradictions = this.findContradictions(allFacts);
    for (const [factA, factB] of contradictions) {
      const insightText = `Potential contradiction detected: "${factA.content}" vs "${factB.content}"`;
      const insight = await this.insightStore.addInsight(
        insightText,
        [factA.id, factB.id],
        0.6,
        'consolidation',
      );
      entries.push({
        id: uuid(),
        timestamp: Date.now(),
        phase: 'consolidate',
        input: `"${factA.content}" ↔ "${factB.content}"`,
        output: insightText,
        factIds: [factA.id, factB.id],
        insightGenerated: true,
        insightId: insight.id,
      });
    }

    return entries;
  }

  private findContradictions(facts: ReturnType<MemoryStore['getAllFacts']>) {
    const contradictions: [typeof facts[0], typeof facts[0]][] = [];
    const factsWithEmbeddings = facts.filter(f => f.embedding.length > 0 && f.tags.length > 0);

    for (let i = 0; i < factsWithEmbeddings.length; i++) {
      for (let j = i + 1; j < factsWithEmbeddings.length; j++) {
        const a = factsWithEmbeddings[i];
        const b = factsWithEmbeddings[j];
        const sim = cosineSimilarity(a.embedding, b.embedding);
        const hasOverlappingTags = a.tags.some(t => b.tags.includes(t));
        // Low similarity but overlapping topics → potential contradiction
        if (sim < 0.15 && hasOverlappingTags) {
          contradictions.push([a, b]);
        }
      }
    }
    return contradictions.slice(0, 3); // cap at 3 per cycle
  }
}
