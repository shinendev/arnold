# Arnold — documentation

Start here, then jump into the topic you need.

## Guides

1. [**INSTALLATION.md**](INSTALLATION.md) — Node version, clone, install both packages, verify build.
2. [**CONFIGURATION.md**](CONFIGURATION.md) — Every environment variable for `arnold` (API) and `arnold-agent`.
3. [**API.md**](API.md) — REST API: paths, query/body parameters, JSON examples, `userId` isolation.
4. [**ARCHITECTURE.md**](ARCHITECTURE.md) — How the background loop, memory stores, and LLM calls fit together.
5. [**DEPLOYMENT.md**](DEPLOYMENT.md) — Production on Linux VPS: PM2, Nginx, TLS, paths, updates.
6. [**TWITTER_AGENT.md**](TWITTER_AGENT.md) — What the bot posts, daily caps, selective replies, cursors.
7. [**SECURITY.md**](SECURITY.md) — API keys, SQLite files, multi-user data, exposing HTTP safely.
8. [**TROUBLESHOOTING.md**](TROUBLESHOOTING.md) — Typical errors (Claude, PM2, Twitter 401/403).
9. [**LOVABLE.md**](LOVABLE.md) — Connect a Lovable / browser frontend to the REST API (`fetch`, env vars, HTTPS).

## Package READMEs

- Core library + deeper API tables: [`../arnold/README.md`](../arnold/README.md)

## Branding assets

- Banner: `docs/branding/banner.png` (used in root README)
- Logo (optional, e.g. social): `docs/branding/logo.png`
