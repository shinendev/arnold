"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.postInsight = postInsight;
exports.postDriftLog = postDriftLog;
exports.postProcessUpdate = postProcessUpdate;
exports.postConsolidationReport = postConsolidationReport;
exports.replyTo = replyTo;
exports.getTweetsToday = getTweetsToday;
exports.getRepliesToday = getRepliesToday;
const client_1 = require("./client");
let tweetsToday = 0;
let repliesToday = 0;
let lastResetDate = new Date().toDateString();
function resetDailyIfNeeded() {
    const today = new Date().toDateString();
    if (today !== lastResetDate) {
        tweetsToday = 0;
        repliesToday = 0;
        lastResetDate = today;
    }
}
function canPostWithinTotal(maxPerDay) {
    resetDailyIfNeeded();
    return tweetsToday < maxPerDay;
}
function canPostReply(maxPerDay, maxRepliesPerDay) {
    resetDailyIfNeeded();
    if (tweetsToday >= maxPerDay)
        return false;
    if (maxRepliesPerDay <= 0)
        return false;
    return repliesToday < maxRepliesPerDay;
}
async function tweet(text, maxPerDay) {
    if (!canPostWithinTotal(maxPerDay)) {
        console.log('[poster] Daily tweet limit reached, skipping');
        return null;
    }
    const trimmed = text.slice(0, 280);
    try {
        const client = (0, client_1.getTwitterClient)();
        const result = await client.v2.tweet(trimmed);
        tweetsToday++;
        console.log(`[poster] Tweet posted (${tweetsToday} today, ${repliesToday} replies): ${trimmed.slice(0, 60)}...`);
        return result.data.id;
    }
    catch (error) {
        console.error('[poster] Failed to tweet:', error);
        return null;
    }
}
async function postInsight(insight, formatFn, maxPerDay, minConfidence = 0.75) {
    if (insight.confidence < minConfidence)
        return null;
    const text = await formatFn(insight);
    return tweet(text, maxPerDay);
}
async function postDriftLog(entry, cycleNum, maxPerDay) {
    const text = `drift log #${cycleNum}: ${entry.phase} phase. ${entry.output.slice(0, 200)}`;
    return tweet(text, maxPerDay);
}
async function postProcessUpdate(stats, maxPerDay) {
    const text = `entering ${stats.state} state. ${stats.totalFacts} facts in memory, ${stats.totalInsights} insights generated. beginning ${stats.state === 'dreaming' ? 'deep association' : 'association'} phase.`;
    return tweet(text, maxPerDay);
}
async function postConsolidationReport(prunedCount, promotedCount, newInsights, maxPerDay) {
    const text = `daily consolidation: pruned ${prunedCount} facts, promoted ${promotedCount} to permanent, found ${newInsights} new insights. the brain forgets for a reason.`;
    return tweet(text, maxPerDay);
}
async function replyTo(tweetId, text, maxPerDay, maxRepliesPerDay) {
    if (!canPostReply(maxPerDay, maxRepliesPerDay)) {
        console.log('[poster] Reply skipped (daily reply or total limit)');
        return null;
    }
    const trimmed = text.slice(0, 280);
    try {
        const client = (0, client_1.getTwitterClient)();
        const result = await client.v2.reply(trimmed, tweetId);
        tweetsToday++;
        repliesToday++;
        return result.data.id;
    }
    catch (error) {
        console.error('[poster] Failed to reply:', error);
        return null;
    }
}
function getTweetsToday() {
    resetDailyIfNeeded();
    return tweetsToday;
}
function getRepliesToday() {
    resetDailyIfNeeded();
    return repliesToday;
}
//# sourceMappingURL=poster.js.map