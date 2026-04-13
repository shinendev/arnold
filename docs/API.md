# REST API (`arnold`)

The HTTP server is started with:

```bash
cd arnold && npm run start:api
```

Default base URL: `http://localhost:3210`

CORS is enabled for browser frontends. **There is no built-in authentication** — put the service behind a reverse proxy with auth, VPN, or IP allowlist for anything exposed to the internet.

---

## Multi-user isolation (`userId`)

Most endpoints accept an optional **`userId`**:

- **Query:** `?userId=alice`
- **JSON body:** `"userId": "alice"` (for `POST /api/chat`, body field is read)

Rules:

- Values are normalized: lowercase, non `[a-z0-9_-]` replaced with `_`, max 64 chars.
- Default when omitted: `default` → uses `ARNOLD_DB_PATH` as the SQLite file.
- Other users → one file per user under `ARNOLD_USERS_DIR`, e.g. `./data/users/alice.db`.

A separate in-memory **`global`** session exists when `ARNOLD_ENABLE_GLOBAL_MEMORY` is not `false`. It is used internally by `POST /api/chat` for cross-user consolidation (wording is anonymized in prompts). Do not point untrusted clients at `userId=global` unless you understand the implications.

---

## Endpoints

### `GET /api/state`

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

### `GET /api/facts`

All stored facts for the user (including embeddings metadata stored in SQLite).

**Query:** `userId` optional.

---

### `GET /api/insights`

All insights for the user.

**Query:** `userId` optional.

---

### `GET /api/drift-log`

Recent drift log entries (background phases).

**Query:**

- `userId` optional
- `limit` optional, default `50`

**Example:** `GET /api/drift-log?userId=demo&limit=20`

---

### `GET /api/graph`

Graph-friendly structure: nodes (facts) and edges derived from insights.

**Query:** `userId` optional.

---

### `GET /api/metrics`

Lightweight diagnostics for dashboards or demos: insight rate estimates, average confidence, loaded session count.

**Query:** `userId` optional.

---

### `POST /api/chat`

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

## Error responses

| Code | When |
|------|------|
| `400` | Missing `message` on `/api/chat` |
| `500` | Unhandled server error (check server logs) |

If `CLAUDE_API_KEY` is missing at startup, the process **exits** immediately with a console error (no HTTP server).

---

## Graceful shutdown

`SIGINT` / `SIGTERM` close all loaded SQLite sessions and exit. Use this under PM2 or systemd.
