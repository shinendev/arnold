import { getTwitterClient } from './client';
import { replyTo } from './poster';
import { Arnold } from 'arnold-subcon';
import fs from 'fs';
import { config } from '../config';

let lastMentionId: string | undefined;

function loadMentionCursor(): string | undefined {
  if (lastMentionId) return lastMentionId;
  try {
    const cursor = fs.readFileSync(config.mentionCursorFile, 'utf8').trim();
    if (cursor) {
      lastMentionId = cursor;
    }
  } catch {
    // no existing cursor file
  }
  return lastMentionId;
}

function saveMentionCursor(cursor: string): void {
  try {
    fs.writeFileSync(config.mentionCursorFile, cursor, 'utf8');
    lastMentionId = cursor;
  } catch (error) {
    console.error('[mentions] Failed to persist mention cursor:', error);
  }
}

async function shouldReplyPublicly(
  mentionText: string,
  llmGenerate: (prompt: string) => Promise<string>,
): Promise<boolean> {
  const t = mentionText.trim();
  if (t.length < 14) return false;

  const lower = t.toLowerCase();
  if (/\b(giveaway|airdrop|follow\s*back|follow4follow|onlyfans|promo|discount|dm\s*me)\b/.test(lower)) {
    return false;
  }

  try {
    const verdict = await llmGenerate(
      `you are arnold's reply policy on twitter. arnold is a quiet dreamer — he almost never replies. when he does, it has to feel real.

mention text:
"""
${mentionText}
"""

should arnold reply publicly to this mention?

answer with EXACTLY one token on the first line: REPLY_YES or REPLY_NO

REPLY_YES only if:
- a real human is engaging with arnold's mind, ideas, or vibe (not spam, promos, engagement bait)
- arnold can say something specific and sincere, not generic thanks or "cool"

first line only:`,
    );
    const first = verdict.trim().split(/\r?\n/)[0] ?? '';
    const m = first.match(/REPLY_(YES|NO)\b/i);
    return m?.[1]?.toUpperCase() === 'YES';
  } catch {
    return false;
  }
}

export async function checkMentions(
  sub: Arnold,
  llmGenerate: (prompt: string) => Promise<string>,
  maxPerDay: number,
  maxRepliesPerDay: number,
): Promise<void> {
  try {
    // User mention timeline requires user-context auth (OAuth 1.0a), not app-only bearer.
    const client = getTwitterClient();
    const me = await client.v2.me();
    const userId = me.data.id;

    const mentions = await client.v2.userMentionTimeline(userId, {
      since_id: loadMentionCursor(),
      max_results: 10,
      'tweet.fields': ['text', 'author_id', 'conversation_id'],
    });

    if (!mentions.data?.data?.length) return;

    saveMentionCursor(mentions.data.data[0].id);

    for (const mention of mentions.data.data) {
      const text = mention.text;
      const lower = text.toLowerCase();

      const allowReply = await shouldReplyPublicly(text, llmGenerate);
      if (!allowReply) {
        continue;
      }

      let responsePrompt: string;

      if (lower.includes('what are you thinking') || lower.includes("what's on your mind")) {
        const stats = sub.getStats();
        const recentLog = sub.getDriftLog(3);
        const logSummary = recentLog.map(e => `${e.phase}: ${e.output}`).join('; ');
        responsePrompt = `Someone asked what you're thinking about. Current state: ${stats.state}. 
Recent activity: ${logSummary || 'just woke up'}. 
Facts in memory: ${stats.totalFacts}. Generate a genuine, curious tweet reply (max 280 chars). lowercase, warm, like arnold. never hashtags.`;
      } else if (lower.includes('how do you work') || lower.includes('explain') || lower.includes('science')) {
        responsePrompt = `someone asked about how your mind works. explain the default mode network, memory consolidation, and associative linking in simple warm words, like a kid explaining something cool. tweet reply (max 280 chars). lowercase. no hashtags.`;
      } else {
        await sub.wake();
        await sub.ingest(text, 'Received and processing.');
        responsePrompt = `Someone shared this with you: "${text}". 
Acknowledge you've heard them and might sit with it. be brief and real. tweet reply (max 280 chars). lowercase. no hashtags.`;
      }

      try {
        const reply = await llmGenerate(responsePrompt);
        await replyTo(mention.id, reply.slice(0, 280), maxPerDay, maxRepliesPerDay);
      } catch {
        // Skip failed replies
      }
    }
  } catch (error) {
    console.error('[mentions] Error checking mentions:', error);
  }
}
