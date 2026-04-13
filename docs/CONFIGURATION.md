# Configuration

All secrets belong in **`.env`** files (never commit them). Both packages ship **`.env.example`** as a template.

---

## Core + API (`arnold/.env`)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `CLAUDE_API_KEY` | **Yes** | — | Anthropic API key |
| `CLAUDE_MODEL` | No | `claude-sonnet-4-20250514` | Claude model id for all LLM calls in this process |
| `PORT` | No | `3210` | HTTP listen port for `start:api` |
| `ARNOLD_DB_PATH` | No | `./arnold-memory.db` | SQLite file for the **default** user session |
| `ARNOLD_USERS_DIR` | No | `./data/users` | Directory for per-user SQLite files (`{userId}.db`) |
| `ARNOLD_ENABLE_GLOBAL_MEMORY` | No | `true` | When `true`, API chat also uses a shared `global` session (see [API.md](API.md)) |
| `ARNOLD_IDLE_THRESHOLD_MS` | No | `300000` | Ms without activity before state moves toward idle |
| `ARNOLD_CYCLE_INTERVAL_MS` | No | `180000` | Ms between background cycles while idle/dreaming |
| `ARNOLD_ASSOCIATION_SAMPLE_SIZE` | No | `5` | Random fact pairs to evaluate per association phase |
| `ARNOLD_DECAY_RATE` | No | `0.005` | Per-cycle activation decay factor |

Additional tuning exists in `arnold/src/types.ts` (`DEFAULT_CONFIG`) for similarity thresholds, prune limits, etc., if you extend env wiring.

---

## Twitter agent (`arnold-agent/.env`)

### Claude

| Variable | Required | Default |
|----------|----------|---------|
| `CLAUDE_API_KEY` | **Yes** | — |
| `CLAUDE_MODEL` | No | `claude-sonnet-4-20250514` |

### Twitter (OAuth 1.0a user context)

| Variable | Required |
|----------|----------|
| `TWITTER_API_KEY` | Yes |
| `TWITTER_API_SECRET` | Yes |
| `TWITTER_ACCESS_TOKEN` | Yes |
| `TWITTER_ACCESS_SECRET` | Yes |
| `TWITTER_BEARER_TOKEN` | Optional for some read paths; user timeline uses OAuth1 in current code |

### Agent runtime

| Variable | Default | Description |
|----------|---------|-------------|
| `ARNOLD_DB_PATH` | `./arnold-agent-memory.db` | Separate DB from the API server (recommended) |
| `ARNOLD_IDLE_THRESHOLD_MS` | `300000` | Same semantics as core |
| `ARNOLD_CYCLE_INTERVAL_MS` | `180000` | Same semantics as core |
| `ARNOLD_ASSOCIATION_SAMPLE_SIZE` | `5` | Same semantics as core |
| `ARNOLD_DECAY_RATE` | `0.005` | Same semantics as core |
| `PAUSE_BOT` | `false` | Set `true` to exit immediately without timers |
| `ARNOLD_MENTION_CURSOR_FILE` | `./.mention-cursor` | Persists last processed mention id across restarts |

### Twitter pacing (personality-first)

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

## PM2 / production

Environment variables are **not** automatically loaded by PM2. The API entrypoint calls `dotenv.config()` so a `.env` file next to `arnold/` works when `cwd` is set correctly. The agent uses `dotenv` in `config.ts`.

See [DEPLOYMENT.md](DEPLOYMENT.md) for `ecosystem.config.js` and working directories.
