# Troubleshooting

## API exits immediately: `CLAUDE_API_KEY is required`

- Ensure `.env` exists in **`arnold/`** (same directory PM2 `cwd` uses).
- The API loads `dotenv` at startup — variable must be non-empty.
- Restart after editing: `pm2 restart arnold-api`.

---

## `npm install` fails on `better-sqlite3`

- macOS: install Xcode Command Line Tools.
- Linux: install `build-essential`, `python3`, `make`, `g++`.
- Rarely: use an LTS Node version (20.x).

---

## Twitter `401 Unauthorized`

Common causes:

1. **Wrong or URL-encoded bearer** — paste the raw token from the developer portal (decode `%2B` → `+`, `%3D` → `=` if you copied from a URL).
2. **Mentions timeline** requires **OAuth 1.0a user** credentials — consumer key/secret + access token/secret must belong to the same project and user.
3. **Revoked tokens** — regenerate keys in the Twitter developer UI.

Check `pm2 logs arnold-agent --lines 80`.

---

## Twitter `403` or elevated access errors

Some endpoints require **Elevated** project access in the X developer portal. Apply for the appropriate access tier if the error message references permissions.

---

## PM2 restart loop (high restart count)

Usually missing env (Claude key) or crash on boot. Read **both** stdout and stderr:

```bash
pm2 logs arnold-api --lines 100 --nostream
```

---

## Port already in use (`EADDRINUSE`)

Another process holds `3210`. Change `PORT` in `.env` or stop the conflicting service.

---

## Empty insights forever

- Background loop needs **time** in `idle` / `dreaming` — send a chat message first to populate facts, then wait past `ARNOLD_IDLE_THRESHOLD_MS`.
- Check `/api/drift-log` for cycle activity.
- Very high `ARNOLD_MIN_INSIGHT_CONFIDENCE` in the **agent** reduces tweets but does not stop core insight generation.

---

## Global vs user confusion in API

- Omit `userId` → `default` session file (`ARNOLD_DB_PATH`).
- Explicit `userId` → file under `ARNOLD_USERS_DIR`.
- `userId=global` is a special session — avoid exposing it publicly.

---

## Still stuck?

Collect **without secrets**:

- Node version,
- last 50 log lines,
- minimal curl reproducer for HTTP issues,

and open a GitHub issue on the repository.
