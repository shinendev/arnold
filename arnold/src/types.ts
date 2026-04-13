export interface Fact {
  id: string;
  content: string;
  embedding: number[];
  source: 'conversation' | 'insight';
  sourceConversationId?: string;
  activationWeight: number;
  recallCount: number;
  isPermanent: boolean;
  tags: string[];
  createdAt: number;
  lastAccessedAt: number;
}

export interface Insight {
  id: string;
  content: string;
  factIds: string[];
  confidence: number;
  type: 'association' | 'incubation' | 'consolidation';
  embedding: number[];
  createdAt: number;
  delivered: boolean;
  deliveredAt?: number;
}

export interface DriftLogEntry {
  id: string;
  timestamp: number;
  phase: 'replay' | 'associate' | 'incubate' | 'consolidate';
  input: string;
  output: string;
  factIds: string[];
  insightGenerated: boolean;
  insightId?: string;
}

export interface UnresolvedQuestion {
  id: string;
  question: string;
  originalAnswer?: string;
  conversationId?: string;
  resolved: boolean;
  resolvedInsightId?: string;
  createdAt: number;
}

export interface Conversation {
  id: string;
  startedAt: number;
  lastMessageAt: number;
  messageCount: number;
}

export type ArnoldState = 'awake' | 'idle' | 'dreaming';

export interface ArnoldConfig {
  llmAdapter: LLMAdapter;
  idleThresholdMs: number;
  cycleIntervalMs: number;
  associationSampleSize: number;
  similaritySweetSpotMin: number;
  similaritySweetSpotMax: number;
  decayRate: number;
  promotionThreshold: number;
  pruneThreshold: number;
  maxInsightsPerCycle: number;
  dbPath: string;
}

export interface LLMAdapter {
  generateText(prompt: string): Promise<string>;
  generateEmbedding(text: string): Promise<number[]>;
}

export interface ArnoldStats {
  totalFacts: number;
  totalInsights: number;
  totalPermanentFacts: number;
  cyclesCompleted: number;
  state: ArnoldState;
  lastCycleAt: number | null;
}

export const DEFAULT_CONFIG: Omit<ArnoldConfig, 'llmAdapter' | 'dbPath'> = {
  idleThresholdMs: 5 * 60 * 1000,
  cycleIntervalMs: 3 * 60 * 1000,
  associationSampleSize: 5,
  similaritySweetSpotMin: 0.2,
  similaritySweetSpotMax: 0.7,
  decayRate: 0.005,
  promotionThreshold: 3,
  pruneThreshold: 0.05,
  maxInsightsPerCycle: 2,
};
