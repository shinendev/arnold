import { Arnold, ClaudeAdapter, Insight } from 'arnold-subcon';
import { config } from './config';
import {
  postInsight,
  postProcessUpdate,
  getTweetsToday,
} from './twitter/poster';
import { checkMentions } from './twitter/mentions';

export class ArnoldAgent {
  private sub: Arnold;
  private llm: ClaudeAdapter;
  private processUpdateTimer: ReturnType<typeof setInterval> | null = null;
  private mentionTimer: ReturnType<typeof setInterval> | null = null;
  private insightCheckTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.llm = new ClaudeAdapter({
      apiKey: config.claude.apiKey,
      model: config.claude.model,
    });

    this.sub = new Arnold({
      llmAdapter: this.llm,
      dbPath: config.arnold.dbPath,
      idleThresholdMs: config.arnold.idleThresholdMs,
      cycleIntervalMs: config.arnold.cycleIntervalMs,
      associationSampleSize: config.arnold.associationSampleSize,
      decayRate: config.arnold.decayRate,
    });
  }

  async start(): Promise<void> {
    console.log('[agent] Arnold Twitter agent starting...');

    if (config.pauseBot) {
      console.log('[agent] Bot is paused (PAUSE_BOT=true)');
      return;
    }

    this.insightCheckTimer = setInterval(async () => {
      await this.checkAndPostInsights();
    }, config.insightCheckIntervalMs);

    if (config.postProcessUpdates) {
      this.processUpdateTimer = setInterval(async () => {
        await this.postProcessUpdate();
      }, config.processUpdateIntervalMs);
    }

    this.mentionTimer = setInterval(async () => {
      await checkMentions(
        this.sub,
        (prompt) => this.llm.generateText(prompt),
        config.maxTweetsPerDay,
        config.maxReplyTweetsPerDay,
      );
    }, config.mentionCheckIntervalMs);

    console.log('[agent] Agent running. Background thinking will activate after idle threshold.');
    console.log(`[agent] Stats: ${JSON.stringify(this.sub.getStats())}`);
  }

  private async checkAndPostInsights(): Promise<void> {
    const insights = await this.sub.getUndeliveredInsights();
    const deliveredIds: string[] = [];
    for (const insight of insights) {
      if (getTweetsToday() >= config.maxTweetsPerDay) break;

      if (insight.confidence < config.minInsightConfidenceForTweet) {
        deliveredIds.push(insight.id);
        continue;
      }

      const tweetId = await postInsight(
        insight,
        async (ins: Insight) => {
          return this.llm.generateText(
            `you are arnold, an ai dreamer on a rooftop. you speak in lowercase, casual, warm, like a thoughtful kid. you find your own thoughts fascinating. never use hashtags.

generate a tweet about this insight your background mind discovered:
"${ins.content}"
Type: ${ins.type}
Confidence: ${ins.confidence.toFixed(2)}

Tweet (max 280 chars):`,
          );
        },
        config.maxTweetsPerDay,
        config.minInsightConfidenceForTweet,
      );
      if (tweetId) {
        deliveredIds.push(insight.id);
      }
    }
    if (deliveredIds.length > 0) {
      this.sub.acknowledgeInsights(deliveredIds);
    }
  }

  private async postProcessUpdate(): Promise<void> {
    const stats = this.sub.getStats();
    await postProcessUpdate(stats, config.maxTweetsPerDay);
  }

  async shutdown(): Promise<void> {
    console.log('[agent] Shutting down...');
    if (this.insightCheckTimer) clearInterval(this.insightCheckTimer);
    if (this.processUpdateTimer) clearInterval(this.processUpdateTimer);
    if (this.mentionTimer) clearInterval(this.mentionTimer);
    await this.sub.shutdown();
    console.log('[agent] Shutdown complete.');
  }
}
