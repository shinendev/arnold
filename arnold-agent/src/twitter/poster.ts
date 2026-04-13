import { getTwitterClient } from './client';
import { Insight, DriftLogEntry, ArnoldStats } from 'arnold-subcon';

let tweetsToday = 0;
let repliesToday = 0;
let lastResetDate = new Date().toDateString();

function resetDailyIfNeeded(): void {
  const today = new Date().toDateString();
  if (today !== lastResetDate) {
    tweetsToday = 0;
    repliesToday = 0;
    lastResetDate = today;
  }
}

function canPostWithinTotal(maxPerDay: number): boolean {
  resetDailyIfNeeded();
  return tweetsToday < maxPerDay;
}

function canPostReply(maxPerDay: number, maxRepliesPerDay: number): boolean {
  resetDailyIfNeeded();
  if (tweetsToday >= maxPerDay) return false;
  if (maxRepliesPerDay <= 0) return false;
  return repliesToday < maxRepliesPerDay;
}

async function tweet(text: string, maxPerDay: number): Promise<string | null> {
  if (!canPostWithinTotal(maxPerDay)) {
    console.log('[poster] Daily tweet limit reached, skipping');
    return null;
  }

  const trimmed = text.slice(0, 280);
  try {
    const client = getTwitterClient();
    const result = await client.v2.tweet(trimmed);
    tweetsToday++;
    console.log(`[poster] Tweet posted (${tweetsToday} today, ${repliesToday} replies): ${trimmed.slice(0, 60)}...`);
    return result.data.id;
  } catch (error) {
    console.error('[poster] Failed to tweet:', error);
    return null;
  }
}

export async function postInsight(
  insight: Insight,
  formatFn: (insight: Insight) => Promise<string>,
  maxPerDay: number,
  minConfidence = 0.75,
): Promise<string | null> {
  if (insight.confidence < minConfidence) return null;
  const text = await formatFn(insight);
  return tweet(text, maxPerDay);
}

export async function postDriftLog(
  entry: DriftLogEntry,
  cycleNum: number,
  maxPerDay: number,
): Promise<string | null> {
  const text = `drift log #${cycleNum}: ${entry.phase} phase. ${entry.output.slice(0, 200)}`;
  return tweet(text, maxPerDay);
}

export async function postProcessUpdate(
  stats: ArnoldStats,
  maxPerDay: number,
): Promise<string | null> {
  const text = `entering ${stats.state} state. ${stats.totalFacts} facts in memory, ${stats.totalInsights} insights generated. beginning ${stats.state === 'dreaming' ? 'deep association' : 'association'} phase.`;
  return tweet(text, maxPerDay);
}

export async function postConsolidationReport(
  prunedCount: number,
  promotedCount: number,
  newInsights: number,
  maxPerDay: number,
): Promise<string | null> {
  const text = `daily consolidation: pruned ${prunedCount} facts, promoted ${promotedCount} to permanent, found ${newInsights} new insights. the brain forgets for a reason.`;
  return tweet(text, maxPerDay);
}

export async function replyTo(
  tweetId: string,
  text: string,
  maxPerDay: number,
  maxRepliesPerDay: number,
): Promise<string | null> {
  if (!canPostReply(maxPerDay, maxRepliesPerDay)) {
    console.log('[poster] Reply skipped (daily reply or total limit)');
    return null;
  }

  const trimmed = text.slice(0, 280);
  try {
    const client = getTwitterClient();
    const result = await client.v2.reply(trimmed, tweetId);
    tweetsToday++;
    repliesToday++;
    return result.data.id;
  } catch (error) {
    console.error('[poster] Failed to reply:', error);
    return null;
  }
}

export function getTweetsToday(): number {
  resetDailyIfNeeded();
  return tweetsToday;
}

export function getRepliesToday(): number {
  resetDailyIfNeeded();
  return repliesToday;
}
