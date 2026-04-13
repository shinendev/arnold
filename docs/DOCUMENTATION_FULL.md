# Arnold — full documentation

Single file for publishing on your marketing site: **copy the whole file** into Lovable’s docs block, Notion, or a `/docs` page — or link the raw file from GitHub after push.  
Maintained splits (same content, easier PRs): individual files under `docs/*.md` in the repo.

**Repository:** [github.com/shinendev/arnold](https://github.com/shinendev/arnold)

---

## Table of contents

- [Installation](#installation)
- [Configuration](#configuration)
- [REST API](#rest-api)
- [Architecture](#architecture)
- [Deployment (Linux VPS)](#deployment-linux-vps)
- [Twitter agent](#twitter-agent)
- [Security and privacy](#security-and-privacy)
- [Troubleshooting](#troubleshooting)
- [Lovable and frontend integration](#lovable-and-frontend-integration)

---

## Installation

### Requirements

- **Node.js** 20 or newer ([nodejs.org](https://nodejs.org/))
- **npm** (bundled with Node)
- **Anthropic API key** for Claude (`CLAUDE_API_KEY`) — required for both packages
- **Twitter** credentials — only if you run `arnold-agent`

Optional for production:

- **PM2** (`npm install -g pm2`) or another process manager
- **Nginx** (or Caddy) for TLS reverse proxy in front of the API

---

### Clone the repository

```bash
git clone https://github.com/shinendev/arnold.git
cd arnold
```

The clone root (folder `arnold` by default) contains `arnold/` (core package directory) and `arnold-agent/` (Twitter).

**Private notes:** anything that must never be committed can live in a **`.local/`** directory at the repo root (that path is gitignored). Only `.env.example` style templates belong in git.

---

### Core package (`arnold/`)

The published npm name is **`arnold-subcon`** (see `arnold/package.json`). Locally you work from the folder `arnold/`.

```bash
cd arnold
cp .env.example .env
```

Edit `.env` and set at minimum:

- `CLAUDE_API_KEY`

Install and compile:

```bash
npm install
npm run build
```

Verify TypeScript output:

```bash
npm run lint
```

(`lint` runs `tsc --noEmit`.)

#### Run the REST API locally

```bash
npm run start:api
```

Default URL: `http://0.0.0.0:3210` (same as `http://localhost:3210` on your machine).

Smoke test:

```bash
curl -s http://127.0.0.1:3210/api/state | jq .
```

Stop the server with `Ctrl+C` (SIGINT triggers graceful shutdown).

---

### Twitter agent (`arnold-agent/`)

Depends on the local core package via `file:../arnold` in `package.json`.

```bash
cd ../arnold-agent
cp .env.example .env
```

Fill **Claude** and **Twitter** variables (see [CONFIGURATION.md](#configuration)).

```bash
npm install
npm run build
npm start
```

Set `PAUSE_BOT=true` in `.env` to start the process without posting (useful for debugging imports).

---

### Development workflow

| Task | Command (from `arnold/`) |
|------|-------------------------|
| Rebuild after TS changes | `npm run build` |
| Typecheck only | `npm run lint` |
| API server | `npm run start:api` |
| Tests (when present) | `npm test` |

| Task | Command (from `arnold-agent/`) |
|------|-------------------------------|
| Rebuild | `npm run build` |
| Run agent | `npm start` |
| Watch mode | `npm run dev` |

After changing **core** types or exports, rebuild `arnold/` before rebuilding `arnold-agent/`.

---

### Native module note (`better-sqlite3`)

The core package uses `better-sqlite3`. On most macOS/Linux setups `npm install` compiles or downloads a prebuild automatically. If install fails:

- Ensure Xcode Command Line Tools are installed (macOS): `xcode-select --install`
- On Linux, install `build-essential` (Debian/Ubuntu) or equivalent plus `python3`

---

### Next steps

- [CONFIGURATION.md](#configuration) — full variable reference
- [API.md](#rest-api) — integrate your frontend or another service
- [DEPLOYMENT.md](#deployment-linux-vps) — ship to a VPS

---

## Configuration

All secrets belong in **`.env`** files (never commit them). Both packages ship **`.env.example`** as a template.

---

### Core + API (`arnold/.env`)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `CLAUDE_API_KEY` | **Yes** | — | Anthropic API key |
| `CLAUDE_MODEL` | No | `claude-sonnet-4-20250514` | Claude model id for all LLM calls in this process |
| `PORT` | No | `3210` | HTTP listen port for `start:api` |
| `ARNOLD_DB_PATH` | No | `./arnold-memory.db` | SQLite file for the **default** user session |
| `ARNOLD_USERS_DIR` | No | `./data/users` | Directory for per-user SQLite files (`{userId}.db`) |
| `ARNOLD_ENABLE_GLOBAL_MEMORY` | No | `true` | When `true`, API chat also uses a shared `global` session (see [API.md](#rest-api)) |
| `ARNOLD_IDLE_THRESHOLD_MS` | No | `300000` | Ms without activity before state moves toward idle |
| `ARNOLD_CYCLE_INTERVAL_MS` | No | `180000` | Ms between background cycles while idle/dreaming |
| `ARNOLD_ASSOCIATION_SAMPLE_SIZE` | No | `5` | Random fact pairs to evaluate per association phase |
| `ARNOLD_DECAY_RATE` | No | `0.005` | Per-cycle activation decay factor |

Additional tuning exists in `arnold/src/types.ts` (`DEFAULT_CONFIG`) for similarity thresholds, prune limits, etc., if you extend env wiring.

---

### Twitter agent (`arnold-agent/.env`)

#### Claude

| Variable | Required | Default |
|----------|----------|---------|
| `CLAUDE_API_KEY` | **Yes** | — |
| `CLAUDE_MODEL` | No | `claude-sonnet-4-20250514` |

#### Twitter (OAuth 1.0a user context)

| Variable | Required |
|----------|----------|
| `TWITTER_API_KEY` | Yes |
| `TWITTER_API_SECRET` | Yes |
| `TWITTER_ACCESS_TOKEN` | Yes |
| `TWITTER_ACCESS_SECRET` | Yes |
| `TWITTER_BEARER_TOKEN` | Optional for some read paths; user timeline uses OAuth1 in current code |

#### Agent runtime

| Variable | Default | Description |
|----------|---------|-------------|
| `ARNOLD_DB_PATH` | `./arnold-agent-memory.db` | Separate DB from the API server (recommended) |
| `ARNOLD_IDLE_THRESHOLD_MS` | `300000` | Same semantics as core |
| `ARNOLD_CYCLE_INTERVAL_MS` | `180000` | Same semantics as core |
| `ARNOLD_ASSOCIATION_SAMPLE_SIZE` | `5` | Same semantics as core |
| `ARNOLD_DECAY_RATE` | `0.005` | Same semantics as core |
| `PAUSE_BOT` | `false` | Set `true` to exit immediately without timers |
| `ARNOLD_MENTION_CURSOR_FILE` | `./.mention-cursor` | Persists last processed mention id across restarts |

#### Twitter pacing (personality-first)

| Variable | Default | Description |
|----------|---------|-------------|
| `ARNOLD_MAX_TWEETS_PER_DAY` | `5` | Total tweets + replies per calendar day (clamped 3–10 in code) |
| `ARNOLD_MAX_REPLY_TWEETS_PER_DAY` | `2` | Cap on **reply** posts; still counts toward total |
| `ARNOLD_POST_PROCESS_UPDATES` | `false` | Rare “stats / state” tweets |
| `ARNOLD_PROCESS_UPDATE_INTERVAL_MS` | `172800000` | If process updates enabled, interval between them |
| `ARNOLD_MENTION_CHECK_INTERVAL_MS` | `240000` | Poll mentions every N ms |
| `ARNOLD_INSIGHT_CHECK_INTERVAL_MS` | `600000` | Check undelivered insights every N ms |
| `ARNOLD_MIN_INSIGHT_CONFIDENCE` | `0.75` | Minimum insight confidence to consider tweeting |

---

### PM2 / production

Environment variables are **not** automatically loaded by PM2. The API entrypoint calls `dotenv.config()` so a `.env` file next to `arnold/` works when `cwd` is set correctly. The agent uses `dotenv` in `config.ts`.

See [DEPLOYMENT.md](#deployment-linux-vps) for `ecosystem.config.js` and working directories.

---

## REST API

The HTTP server is started with:

```bash
cd arnold && npm run start:api
```

Default base URL: `http://localhost:3210`

CORS is enabled for browser frontends. **There is no built-in authentication** — put the service behind a reverse proxy with auth, VPN, or IP allowlist for anything exposed to the internet.

---

### Multi-user isolation (`userId`)

Most endpoints accept an optional **`userId`**:

- **Query:** `?userId=alice`
- **JSON body:** `"userId": "alice"` (for `POST /api/chat`, body field is read)

Rules:

- Values are normalized: lowercase, non `[a-z0-9_-]` replaced with `_`, max 64 chars.
- Default when omitted: `default` → uses `ARNOLD_DB_PATH` as the SQLite file.
- Other users → one file per user under `ARNOLD_USERS_DIR`, e.g. `./data/users/alice.db`.

A separate in-memory **`global`** session exists when `ARNOLD_ENABLE_GLOBAL_MEMORY` is not `false`. It is used internally by `POST /api/chat` for cross-user consolidation (wording is anonymized in prompts). Do not point untrusted clients at `userId=global` unless you understand the implications.

---

### Endpoints

#### `GET /api/state`

Returns high-level runtime stats for the resolved `userId`.

**Query:** `userId` optional.

**Example:** `GET /api/state?userId=demo`

**Response (illustrative):**

```json
{
  "userId": "demo",
  "state": "idle",
  "facts": 12,
  "insights": 3,
  "permanentFacts": 1,
  "cyclesCompleted": 8,
  "lastCycleAt": 1713000000000
}
```

---

#### `GET /api/facts`

All stored facts for the user (including embeddings metadata stored in SQLite).

**Query:** `userId` optional.

---

#### `GET /api/insights`

All insights for the user.

**Query:** `userId` optional.

---

#### `GET /api/drift-log`

Recent drift log entries (background phases).

**Query:**

- `userId` optional
- `limit` optional, default `50`

**Example:** `GET /api/drift-log?userId=demo&limit=20`

---

#### `GET /api/graph`

Graph-friendly structure: nodes (facts) and edges derived from insights.

**Query:** `userId` optional.

---

#### `GET /api/metrics`

Lightweight diagnostics for dashboards or demos: insight rate estimates, average confidence, loaded session count.

**Query:** `userId` optional.

---

#### `POST /api/chat`

Chat turn with optional history. Side effects:

- Marks scheduler **awake**, extracts facts from the exchange, may record unresolved questions.
- Prepends **undelivered insights** (user + optional global) into the system context.
- Runs a **self-check** pass against recent memory facts; may revise the draft answer.
- Acknowledges delivered insights so they are not repeated.

**Body (JSON):**

| Field | Type | Required | Description |
|-------|------|------------|-------------|
| `message` | string | **Yes** | Latest user message |
| `history` | array | No | `{ "role": "user" \| "assistant", "content": string }[]` in order |
| `userId` | string | No | Session key (see above) |

**Example:**

```json
{
  "userId": "demo",
  "message": "Remind me what we concluded about Postgres vs SQLite?",
  "history": [
    { "role": "user", "content": "We were choosing a DB yesterday." },
    { "role": "assistant", "content": "We leaned SQLite for local-first MVP." }
  ]
}
```

**Response (illustrative):**

```json
{
  "userId": "demo",
  "response": "…",
  "insights": [],
  "state": "awake"
}
```

---

### Error responses

| Code | When |
|------|------|
| `400` | Missing `message` on `/api/chat` |
| `500` | Unhandled server error (check server logs) |

If `CLAUDE_API_KEY` is missing at startup, the process **exits** immediately with a console error (no HTTP server).

---

### Graceful shutdown

`SIGINT` / `SIGTERM` close all loaded SQLite sessions and exit. Use this under PM2 or systemd.

---

## Architecture

This document explains how the **Arnold** runtime is structured at a high level. Implementation files live under `arnold/src/`.

---

### Mental model

Arnold is not a single prompt. It is a **long-running Node process** that owns:

1. **SQLite** — durable facts, insights, drift log, conversations, unresolved questions, key/value state.
2. **A scheduler** — `awake` → `idle` → `dreaming` based on wall-clock inactivity.
3. **A background loop** — when not `awake`, runs phased work on a timer (skips if a cycle is still running).
4. **An LLM adapter** — pluggable interface; today `ClaudeAdapter` implements `generateText` and a hash-based `generateEmbedding` fallback.

The **Twitter agent** is a separate process that constructs its own `Arnold` instance with its own DB file so API traffic and bot traffic do not corrupt each other.

---

### Core class: `Arnold` (`arnold/src/index.ts`)

Public responsibilities:

- **`wake()`** — arms idle timers; ensures a conversation row exists when needed.
- **`ingest(user, assistant)`** — fact extraction + unresolved question detection (LLM JSON).
- **`getUndeliveredInsights()`** — returns insights not yet shown to the user; caller must **`acknowledgeInsights(ids)`** after successful delivery (chat UI, Twitter post, etc.).
- **Readers** — `getState`, `getStats`, `getDriftLog`, `getAllFacts`, `getAllInsights`, `getGraph`.
- **`shutdown()`** — stops background loop and closes DB.

On construction, the background loop **starts** and the scheduler receives an initial `wake()` so timers begin even before the first HTTP chat.

---

### Background loop (`background/loop.ts`)

When state is `idle` or `dreaming`:

1. **Replay** — `ReplayEngine` re-opens recent facts with LLM; may create refined facts.
2. **Associate** — `Associator` samples pairs in a similarity “sweet spot”, asks LLM for `INSIGHT` / `NO_CONNECTION`, scores quality, stores insights.
3. **Incubate** — every 3rd cycle, `Incubator` tries to resolve stored open questions.
4. **Consolidate** — every 5th cycle, `Consolidator` decays weights, prunes, promotes, merges duplicates, flags rough contradictions.

All phases append to **`DriftLog`** (SQLite) for observability.

---

### Memory (`core/memory-store.ts`)

Facts carry:

- Text, embedding vector (serialized), source (`conversation` | `insight`), optional conversation id.
- Activation weight, recall count, permanence flag, tags (LLM JSON), timestamps.

Operations include recall by embedding similarity, random pair sampling for association, decay, prune, merge.

---

### Insights (`core/insight-store.ts`)

Insights reference originating fact ids, have type (`association` | `incubation` | `consolidation`), confidence, delivery flags.

Batch acknowledge avoids losing insights when external delivery (Twitter) fails.

---

### HTTP API (`arnold/src/api.ts`)

Express app with:

- Per-`userId` **lazy** `Arnold` instances (map + SQLite paths).
- Optional **global** session for cross-chat consolidation in chat handler.
- `dotenv` at startup for `.env` next to the working directory.

---

### Embeddings note (`llm/claude.ts`)

Anthropic does not expose a public embeddings API in this integration path. The adapter uses a **deterministic hash embedding** for development and similarity heuristics. For production-grade semantic search, swap in a real embedding provider behind `LLMAdapter.generateEmbedding`.

---

### Extension points

- **New LLM** — implement `LLMAdapter` and inject.
- **Safer public API** — add middleware (API key, OAuth proxy) in `api.ts`.
- **Stronger privacy** — disable `ARNOLD_ENABLE_GLOBAL_MEMORY` or gate global ingestion by policy.

---

## Deployment (Linux VPS)

This guide targets **Ubuntu 24.04 LTS** (or similar) with **root or sudo**, **Node 20+**, **PM2**, and optional **Nginx + Let’s Encrypt**.

Paths below use `/opt/arnold` as the install root — adjust if you prefer `/srv` or a dedicated user home.

---

### 1. Server packages

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -
sudo apt update
sudo apt install -y nodejs nginx certbot python3-certbot-nginx
sudo npm install -g pm2
```

Verify:

```bash
node -v   # v20.x
pm2 -v
```

---

### 2. Deploy code

**Option A — git (recommended after repo is public):**

```bash
sudo mkdir -p /opt/arnold
sudo chown "$USER":"$USER" /opt/arnold
cd /opt/arnold
git clone https://github.com/shinendev/arnold.git .
```

**Option B — rsync from your laptop:**

```bash
rsync -avz --exclude node_modules --exclude '.git' \
  ./subcon/  user@your.vps:/opt/arnold/
```

---

### 3. Build

```bash
cd /opt/arnold/arnold
npm ci
npm run build

cd /opt/arnold/arnold-agent
npm ci
npm run build
```

---

### 4. Environment files

Create **two** `.env` files (never commit them):

```bash
nano /opt/arnold/arnold/.env
nano /opt/arnold/arnold-agent/.env
```

Minimum:

| File | Must contain |
|------|----------------|
| `arnold/.env` | `CLAUDE_API_KEY` |
| `arnold-agent/.env` | `CLAUDE_API_KEY` + all `TWITTER_*` keys |

See [CONFIGURATION.md](#configuration) for the full variable list.

---

### 5. PM2

The repo includes `ecosystem.config.js` with **absolute** paths for `/opt/arnold`. From the server:

```bash
cd /opt/arnold
pm2 start ecosystem.config.js
pm2 save
pm2 startup systemd
```

Follow the printed `sudo env PATH=...` helper once so PM2 resurrects after reboot.

Useful commands:

```bash
pm2 status
pm2 logs arnold-api --lines 50
pm2 logs arnold-agent --lines 50
pm2 restart arnold-api arnold-agent
```

---

### 6. Nginx reverse proxy (API)

Example site `/etc/nginx/sites-available/arnold`:

```nginx
server {
    listen 80;
    server_name your.domain.com;

    location / {
        proxy_pass http://127.0.0.1:3210;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable and reload:

```bash
sudo ln -s /etc/nginx/sites-available/arnold /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

TLS:

```bash
sudo certbot --nginx -d your.domain.com
```

---

### 7. Updates

```bash
cd /opt/arnold
git pull
cd arnold && npm ci && npm run build
cd ../arnold-agent && npm ci && npm run build
pm2 restart all
```

SQLite databases live beside the apps (`*.db`, `./data/users/*.db`) — back them up before risky migrations.

---

### 8. Hardening checklist

- [ ] Do not expose `:3210` publicly without auth or firewall rules.
- [ ] Use TLS on Nginx.
- [ ] Rotate API keys if leaked.
- [ ] Create a non-root deploy user + file permissions if moving beyond MVP.

See [SECURITY.md](#security-and-privacy).

---

## Twitter agent

The agent is a **separate Node process** that:

1. Instantiates **`Arnold`** with its **own** SQLite path (default `./arnold-agent-memory.db`).
2. Runs **timers** for:
   - scanning **undelivered insights** and tweeting high-confidence ones,
   - optional **process update** tweets (disabled by default),
   - polling **mentions** and selectively replying.

It does **not** share the API server’s database — keep it that way in production.

---

### Voice and content

Generated text prompts ask the LLM for:

- lowercase, warm, “kid on a rooftop” introspection,
- no hashtags,
- short tweet length (hard trim to 280 chars before post).

---

### Daily budgets

Two layers:

1. **`ARNOLD_MAX_TWEETS_PER_DAY`** — total **posts + replies** (default **5**, hard-clamped between **3** and **10** in code).
2. **`ARNOLD_MAX_REPLY_TWEETS_PER_DAY`** — max **replies** (default **2**), still counting toward the total.

When the total budget is exhausted, `poster` skips new tweets until the next local calendar day (in-process counter).

---

### Selective replies

For each fetched mention:

1. **Heuristics** drop very short text and obvious promo keywords.
2. An LLM gate returns **`REPLY_YES`** or **`REPLY_NO`** on the first line. Only **YES** proceeds.
3. If yes, the agent may **`wake` + `ingest`** the mention text (depending on template branch), generates a reply body, and calls **`replyTo`**.

This keeps the account from behaving like a customer-service bot.

---

### Mention cursor

`ARNOLD_MENTION_CURSOR_FILE` (default `./.mention-cursor`) stores the last seen mention tweet id so a **restart does not reprocess** the whole timeline.

---

### OAuth note

`userMentionTimeline` and `v2.me()` require **OAuth 1.0a user context** (`TWITTER_API_KEY` + secret + access token + secret). App-only bearer is insufficient for those calls in the current implementation.

---

### Pausing

Set `PAUSE_BOT=true` to exit early from `start()` without registering timers — useful when debugging environment issues.

---

### Operations

```bash
cd arnold-agent
npm start
```

Under PM2, see [DEPLOYMENT.md](#deployment-linux-vps). Tail logs when diagnosing Twitter 401/403 (keys, project elevation, or revoked tokens).

---

## Security and privacy

### Secrets

- **Never commit** `.env`, database files, or mention cursor files. This repository’s `.gitignore` excludes them.
- Rotate **Anthropic** and **Twitter** keys if they appear in logs, tickets, or chat transcripts.
- On shared servers, restrict file permissions on `.env` (e.g. `chmod 600`).

### HTTP API exposure

The bundled Express server has:

- **No authentication**,
- **CORS open** for browser access.

Treat it like an internal service. For public internet:

- Terminate TLS at Nginx (or another edge),
- Add **Bearer token** middleware, **IP allowlist**, or VPN-only access,
- Rate-limit at the edge to reduce abuse cost on Claude.

### Multi-user data (`userId`)

The API creates **one SQLite file per sanitized `userId`**. Anyone who can hit the endpoint can request an arbitrary `userId` string unless you add auth. Map authenticated users to stable ids server-side in a future gateway layer.

### Global memory

When `ARNOLD_ENABLE_GLOBAL_MEMORY` is enabled, `POST /api/chat` forwards **anonymized summaries** into a shared `global` Arnold session. Disable (`false`) if you want strict per-user isolation only.

### Telemetry

This codebase does not ship third-party analytics. LLM providers receive prompts you send according to their policies.

### Dependency hygiene

Run `npm audit` periodically in both packages and upgrade transitive dependencies when practical.

---

## Troubleshooting

### API exits immediately: `CLAUDE_API_KEY is required`

- Ensure `.env` exists in **`arnold/`** (same directory PM2 `cwd` uses).
- The API loads `dotenv` at startup — variable must be non-empty.
- Restart after editing: `pm2 restart arnold-api`.

---

### `npm install` fails on `better-sqlite3`

- macOS: install Xcode Command Line Tools.
- Linux: install `build-essential`, `python3`, `make`, `g++`.
- Rarely: use an LTS Node version (20.x).

---

### Twitter `401 Unauthorized`

Common causes:

1. **Wrong or URL-encoded bearer** — paste the raw token from the developer portal (decode `%2B` → `+`, `%3D` → `=` if you copied from a URL).
2. **Mentions timeline** requires **OAuth 1.0a user** credentials — consumer key/secret + access token/secret must belong to the same project and user.
3. **Revoked tokens** — regenerate keys in the Twitter developer UI.

Check `pm2 logs arnold-agent --lines 80`.

---

### Twitter `403` or elevated access errors

Some endpoints require **Elevated** project access in the X developer portal. Apply for the appropriate access tier if the error message references permissions.

---

### PM2 restart loop (high restart count)

Usually missing env (Claude key) or crash on boot. Read **both** stdout and stderr:

```bash
pm2 logs arnold-api --lines 100 --nostream
```

---

### Port already in use (`EADDRINUSE`)

Another process holds `3210`. Change `PORT` in `.env` or stop the conflicting service.

---

### Empty insights forever

- Background loop needs **time** in `idle` / `dreaming` — send a chat message first to populate facts, then wait past `ARNOLD_IDLE_THRESHOLD_MS`.
- Check `/api/drift-log` for cycle activity.
- Very high `ARNOLD_MIN_INSIGHT_CONFIDENCE` in the **agent** reduces tweets but does not stop core insight generation.

---

### Global vs user confusion in API

- Omit `userId` → `default` session file (`ARNOLD_DB_PATH`).
- Explicit `userId` → file under `ARNOLD_USERS_DIR`.
- `userId=global` is a special session — avoid exposing it publicly.

---

### Still stuck?

Collect **without secrets**:

- Node version,
- last 50 log lines,
- minimal curl reproducer for HTTP issues,

and open a GitHub issue on the repository.

---

## Lovable and frontend integration

Use this page to wire a **Lovable** site (or any static/React app) to the **Arnold REST API** running on your VPS (or `localhost` while developing).

---

### What you need

1. **API base URL** — where Express listens, e.g.  
   - Production: `https://api.yourdomain.com` (recommended: HTTPS behind Nginx)  
   - Dev: `http://localhost:3210`
2. **CORS** — enabled on the Arnold server for browser calls.
3. **No API key in the browser** (current server) — the API is **open** if exposed to the internet. For production, put **auth** in front (Nginx Basic Auth, Cloudflare Access, or your own BFF). Until then, treat the URL as semi-private.

---

### Configure Lovable

Store the base URL as an environment variable in Lovable (name depends on the stack Lovable generates; common patterns):

| Pattern | Example value |
|---------|----------------|
| Vite | `VITE_ARNOLD_API_URL=https://api.yourdomain.com` |
| Next.js | `NEXT_PUBLIC_ARNOLD_API_URL=https://api.yourdomain.com` |

In code, read it (adjust to your actual env name):

```ts
const API = import.meta.env.VITE_ARNOLD_API_URL ?? 'http://localhost:3210';
// or: process.env.NEXT_PUBLIC_ARNOLD_API_URL
```

Always **strip trailing slash** from `API` before concatenating paths.

---

### Multi-user: `userId`

Arnold isolates memory per user. Pass a **stable string** per signed-in user (or anonymous id in `localStorage`).

- **Query:** `?userId=alice`
- **POST body:** `"userId": "alice"` (for `/api/chat`)

If you omit it, the server uses `default` (shared demo bucket — fine for a single-user prototype, bad for real multi-user without auth).

---

### Endpoints (copy-paste)

Replace `` `${API}` `` with your configured base URL.

#### `GET /api/state`

```ts
const userId = 'demo-user';
const r = await fetch(`${API}/api/state?userId=${encodeURIComponent(userId)}`);
const data = await r.json();
// { userId, state, facts, insights, permanentFacts, cyclesCompleted, lastCycleAt }
```

#### `GET /api/facts`

```ts
const r = await fetch(`${API}/api/facts?userId=${encodeURIComponent(userId)}`);
const facts = await r.json(); // Fact[]
```

#### `GET /api/insights`

```ts
const r = await fetch(`${API}/api/insights?userId=${encodeURIComponent(userId)}`);
const insights = await r.json(); // Insight[]
```

#### `GET /api/drift-log`

```ts
const limit = 30;
const r = await fetch(
  `${API}/api/drift-log?userId=${encodeURIComponent(userId)}&limit=${limit}`
);
const log = await r.json(); // DriftLogEntry[]
```

#### `GET /api/graph`

```ts
const r = await fetch(`${API}/api/graph?userId=${encodeURIComponent(userId)}`);
const graph = await r.json(); // { nodes: Fact[], edges: [...] }
```

#### `GET /api/metrics`

```ts
const r = await fetch(`${API}/api/metrics?userId=${encodeURIComponent(userId)}`);
const metrics = await r.json();
```

#### `POST /api/chat`

```ts
const r = await fetch(`${API}/api/chat`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 'demo-user',
    message: 'What did you think about while I was gone?',
    history: [
      // optional, alternating user / assistant
      // { role: 'user', content: '...' },
      // { role: 'assistant', content: '...' },
    ],
  }),
});
const data = await r.json();
// { userId, response: string, insights: [...], state: string }
```

---

### Minimal chat UI flow

1. On load: `GET /api/state` — show idle/awake/dreaming and counts.
2. Optional: `GET /api/drift-log?limit=20` — “recent thoughts” panel.
3. On send: `POST /api/chat` — append `data.response` to the thread; optionally surface `data.insights` as small cards.

---

### JSON shapes (reference)

**`POST /api/chat` response**

| Field | Type | Description |
|-------|------|-------------|
| `userId` | string | Normalized id |
| `response` | string | Assistant reply (Arnold voice) |
| `insights` | array | `{ id, content, confidence, type }[]` surfaced this turn |
| `state` | string | e.g. `awake` |

**`GET /api/state` response**

| Field | Type |
|-------|------|
| `state` | `awake` \| `idle` \| `dreaming` |
| `facts` | number |
| `insights` | number |
| `permanentFacts` | number |
| `cyclesCompleted` | number |
| `lastCycleAt` | number \| null (timestamp ms) |

Full field lists for facts/insights/graph live in the [API.md](#rest-api) doc in this repo.

---

### HTTPS and mixed content

If Lovable publishes the site on **HTTPS**, the browser will **block** calls to `http://` APIs (mixed content). Run Arnold behind **HTTPS** (Nginx + Let’s Encrypt) and point `VITE_*` / `NEXT_PUBLIC_*` to `https://…`.

---

### Where this API is documented in full

- [API.md](#rest-api) — security, `userId`, global memory flag  
- [CONFIGURATION.md](#configuration) — server `.env`  
- [DEPLOYMENT.md](#deployment-linux-vps) — VPS + Nginx  

Repository: [github.com/shinendev/arnold](https://github.com/shinendev/arnold)

---

*End of bundled documentation.*
