import { Insight, DriftLogEntry, ArnoldStats } from 'arnold-subcon';
export declare function postInsight(insight: Insight, formatFn: (insight: Insight) => Promise<string>, maxPerDay: number, minConfidence?: number): Promise<string | null>;
export declare function postDriftLog(entry: DriftLogEntry, cycleNum: number, maxPerDay: number): Promise<string | null>;
export declare function postProcessUpdate(stats: ArnoldStats, maxPerDay: number): Promise<string | null>;
export declare function postConsolidationReport(prunedCount: number, promotedCount: number, newInsights: number, maxPerDay: number): Promise<string | null>;
export declare function replyTo(tweetId: string, text: string, maxPerDay: number, maxRepliesPerDay: number): Promise<string | null>;
export declare function getTweetsToday(): number;
export declare function getRepliesToday(): number;
