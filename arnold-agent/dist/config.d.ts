export declare const config: {
    twitter: {
        apiKey: string;
        apiSecret: string;
        accessToken: string;
        accessSecret: string;
        bearerToken: string;
    };
    claude: {
        apiKey: string;
        model: string;
    };
    arnold: {
        dbPath: string;
        idleThresholdMs: number;
        cycleIntervalMs: number;
        associationSampleSize: number;
        decayRate: number;
    };
    pauseBot: boolean;
    /** Total posts + replies per calendar day (personality-first: keep low). */
    maxTweetsPerDay: number;
    /** Replies count toward maxTweetsPerDay but are capped extra-tight. */
    maxReplyTweetsPerDay: number;
    /** Periodic “state / stats” tweets — off by default; focus on thoughts + rare replies. */
    postProcessUpdates: boolean;
    processUpdateIntervalMs: number;
    mentionCheckIntervalMs: number;
    insightCheckIntervalMs: number;
    /** Only tweet insights at or above this confidence (stricter = fewer tweets). */
    minInsightConfidenceForTweet: number;
    mentionCursorFile: string;
};
