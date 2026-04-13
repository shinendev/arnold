"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
exports.config = {
    twitter: {
        apiKey: process.env.TWITTER_API_KEY || '',
        apiSecret: process.env.TWITTER_API_SECRET || '',
        accessToken: process.env.TWITTER_ACCESS_TOKEN || '',
        accessSecret: process.env.TWITTER_ACCESS_SECRET || '',
        bearerToken: process.env.TWITTER_BEARER_TOKEN || '',
    },
    claude: {
        apiKey: process.env.CLAUDE_API_KEY || '',
        model: process.env.CLAUDE_MODEL || 'claude-sonnet-4-20250514',
    },
    arnold: {
        dbPath: process.env.ARNOLD_DB_PATH || './arnold-agent-memory.db',
        idleThresholdMs: parseInt(process.env.ARNOLD_IDLE_THRESHOLD_MS || '300000', 10),
        cycleIntervalMs: parseInt(process.env.ARNOLD_CYCLE_INTERVAL_MS || '180000', 10),
        associationSampleSize: parseInt(process.env.ARNOLD_ASSOCIATION_SAMPLE_SIZE || '5', 10),
        decayRate: parseFloat(process.env.ARNOLD_DECAY_RATE || '0.005'),
    },
    pauseBot: process.env.PAUSE_BOT === 'true',
    /** Total posts + replies per calendar day (personality-first: keep low). */
    maxTweetsPerDay: Math.min(10, Math.max(3, parseInt(process.env.ARNOLD_MAX_TWEETS_PER_DAY || '5', 10) || 5)),
    /** Replies count toward maxTweetsPerDay but are capped extra-tight. */
    maxReplyTweetsPerDay: Math.min(5, Math.max(0, parseInt(process.env.ARNOLD_MAX_REPLY_TWEETS_PER_DAY || '2', 10) || 2)),
    /** Periodic “state / stats” tweets — off by default; focus on thoughts + rare replies. */
    postProcessUpdates: process.env.ARNOLD_POST_PROCESS_UPDATES === 'true',
    processUpdateIntervalMs: parseInt(process.env.ARNOLD_PROCESS_UPDATE_INTERVAL_MS || String(48 * 60 * 60 * 1000), 10),
    mentionCheckIntervalMs: parseInt(process.env.ARNOLD_MENTION_CHECK_INTERVAL_MS || String(4 * 60 * 1000), 10),
    insightCheckIntervalMs: parseInt(process.env.ARNOLD_INSIGHT_CHECK_INTERVAL_MS || String(10 * 60 * 1000), 10),
    /** Only tweet insights at or above this confidence (stricter = fewer tweets). */
    minInsightConfidenceForTweet: parseFloat(process.env.ARNOLD_MIN_INSIGHT_CONFIDENCE || '0.75'),
    mentionCursorFile: process.env.ARNOLD_MENTION_CURSOR_FILE || './.mention-cursor',
};
//# sourceMappingURL=config.js.map