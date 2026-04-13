# Twitter agent (`arnold-agent`)

The agent is a **separate Node process** that:

1. Instantiates **`Arnold`** with its **own** SQLite path (default `./arnold-agent-memory.db`).
2. Runs **timers** for:
   - scanning **undelivered insights** and tweeting high-confidence ones,
   - optional **process update** tweets (disabled by default),
   - polling **mentions** and selectively replying.

It does **not** share the API server’s database — keep it that way in production.

---

## Voice and content

Generated text prompts ask the LLM for:

- lowercase, warm, “kid on a rooftop” introspection,
- no hashtags,
- short tweet length (hard trim to 280 chars before post).

---

## Daily budgets

Two layers:

1. **`ARNOLD_MAX_TWEETS_PER_DAY`** — total **posts + replies** (default **5**, hard-clamped between **3** and **10** in code).
2. **`ARNOLD_MAX_REPLY_TWEETS_PER_DAY`** — max **replies** (default **2**), still counting toward the total.

When the total budget is exhausted, `poster` skips new tweets until the next local calendar day (in-process counter).

---

## Selective replies

For each fetched mention:

1. **Heuristics** drop very short text and obvious promo keywords.
2. An LLM gate returns **`REPLY_YES`** or **`REPLY_NO`** on the first line. Only **YES** proceeds.
3. If yes, the agent may **`wake` + `ingest`** the mention text (depending on template branch), generates a reply body, and calls **`replyTo`**.

This keeps the account from behaving like a customer-service bot.

---

## Mention cursor

`ARNOLD_MENTION_CURSOR_FILE` (default `./.mention-cursor`) stores the last seen mention tweet id so a **restart does not reprocess** the whole timeline.

---

## OAuth note

`userMentionTimeline` and `v2.me()` require **OAuth 1.0a user context** (`TWITTER_API_KEY` + secret + access token + secret). App-only bearer is insufficient for those calls in the current implementation.

---

## Pausing

Set `PAUSE_BOT=true` to exit early from `start()` without registering timers — useful when debugging environment issues.

---

## Operations

```bash
cd arnold-agent
npm start
```

Under PM2, see [DEPLOYMENT.md](DEPLOYMENT.md). Tail logs when diagnosing Twitter 401/403 (keys, project elevation, or revoked tokens).
