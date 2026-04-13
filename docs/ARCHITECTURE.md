# Architecture

This document explains how the **Arnold** runtime is structured at a high level. Implementation files live under `arnold/src/`.

---

## Mental model

Arnold is not a single prompt. It is a **long-running Node process** that owns:

1. **SQLite** — durable facts, insights, drift log, conversations, unresolved questions, key/value state.
2. **A scheduler** — `awake` → `idle` → `dreaming` based on wall-clock inactivity.
3. **A background loop** — when not `awake`, runs phased work on a timer (skips if a cycle is still running).
4. **An LLM adapter** — pluggable interface; today `ClaudeAdapter` implements `generateText` and a hash-based `generateEmbedding` fallback.

The **Twitter agent** is a separate process that constructs its own `Arnold` instance with its own DB file so API traffic and bot traffic do not corrupt each other.

---

## Core class: `Arnold` (`arnold/src/index.ts`)

Public responsibilities:

- **`wake()`** — arms idle timers; ensures a conversation row exists when needed.
- **`ingest(user, assistant)`** — fact extraction + unresolved question detection (LLM JSON).
- **`getUndeliveredInsights()`** — returns insights not yet shown to the user; caller must **`acknowledgeInsights(ids)`** after successful delivery (chat UI, Twitter post, etc.).
- **Readers** — `getState`, `getStats`, `getDriftLog`, `getAllFacts`, `getAllInsights`, `getGraph`.
- **`shutdown()`** — stops background loop and closes DB.

On construction, the background loop **starts** and the scheduler receives an initial `wake()` so timers begin even before the first HTTP chat.

---

## Background loop (`background/loop.ts`)

When state is `idle` or `dreaming`:

1. **Replay** — `ReplayEngine` re-opens recent facts with LLM; may create refined facts.
2. **Associate** — `Associator` samples pairs in a similarity “sweet spot”, asks LLM for `INSIGHT` / `NO_CONNECTION`, scores quality, stores insights.
3. **Incubate** — every 3rd cycle, `Incubator` tries to resolve stored open questions.
4. **Consolidate** — every 5th cycle, `Consolidator` decays weights, prunes, promotes, merges duplicates, flags rough contradictions.

All phases append to **`DriftLog`** (SQLite) for observability.

---

## Memory (`core/memory-store.ts`)

Facts carry:

- Text, embedding vector (serialized), source (`conversation` | `insight`), optional conversation id.
- Activation weight, recall count, permanence flag, tags (LLM JSON), timestamps.

Operations include recall by embedding similarity, random pair sampling for association, decay, prune, merge.

---

## Insights (`core/insight-store.ts`)

Insights reference originating fact ids, have type (`association` | `incubation` | `consolidation`), confidence, delivery flags.

Batch acknowledge avoids losing insights when external delivery (Twitter) fails.

---

## HTTP API (`arnold/src/api.ts`)

Express app with:

- Per-`userId` **lazy** `Arnold` instances (map + SQLite paths).
- Optional **global** session for cross-chat consolidation in chat handler.
- `dotenv` at startup for `.env` next to the working directory.

---

## Embeddings note (`llm/claude.ts`)

Anthropic does not expose a public embeddings API in this integration path. The adapter uses a **deterministic hash embedding** for development and similarity heuristics. For production-grade semantic search, swap in a real embedding provider behind `LLMAdapter.generateEmbedding`.

---

## Extension points

- **New LLM** — implement `LLMAdapter` and inject.
- **Safer public API** — add middleware (API key, OAuth proxy) in `api.ts`.
- **Stronger privacy** — disable `ARNOLD_ENABLE_GLOBAL_MEMORY` or gate global ingestion by policy.
