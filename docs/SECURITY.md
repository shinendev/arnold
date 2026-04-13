# Security and privacy

## Secrets

- **Never commit** `.env`, database files, or mention cursor files. This repository’s `.gitignore` excludes them.
- Rotate **Anthropic** and **Twitter** keys if they appear in logs, tickets, or chat transcripts.
- On shared servers, restrict file permissions on `.env` (e.g. `chmod 600`).

## HTTP API exposure

The bundled Express server has:

- **No authentication**,
- **CORS open** for browser access.

Treat it like an internal service. For public internet:

- Terminate TLS at Nginx (or another edge),
- Add **Bearer token** middleware, **IP allowlist**, or VPN-only access,
- Rate-limit at the edge to reduce abuse cost on Claude.

## Multi-user data (`userId`)

The API creates **one SQLite file per sanitized `userId`**. Anyone who can hit the endpoint can request an arbitrary `userId` string unless you add auth. Map authenticated users to stable ids server-side in a future gateway layer.

## Global memory

When `ARNOLD_ENABLE_GLOBAL_MEMORY` is enabled, `POST /api/chat` forwards **anonymized summaries** into a shared `global` Arnold session. Disable (`false`) if you want strict per-user isolation only.

## Telemetry

This codebase does not ship third-party analytics. LLM providers receive prompts you send according to their policies.

## Dependency hygiene

Run `npm audit` periodically in both packages and upgrade transitive dependencies when practical.
