<p align="center">
  <img src="docs/branding/logo.png" width="200" alt="Arnold logo" />
</p>

<p align="center">
  <img src="docs/branding/banner.png" width="100%" alt="Arnold — rooftop thoughts" />
</p>

# Arnold

**An AI that thinks while you're away** — a TypeScript runtime that adds a background cognitive loop (memory replay, associations, incubation, consolidation) on top of any LLM, plus an optional Twitter presence.

Monorepo:

| Package | Description |
|--------|-------------|
| [`arnold/`](arnold/) | Core npm module `arnold-subcon` — memory, subconscious loop, SQLite, REST API |
| [`arnold-agent/`](arnold-agent/) | Twitter agent — selective replies, low daily tweet budget, Arnold’s voice |

## Quick start

**API (chat + visualization):**

```bash
cd arnold
cp .env.example .env   # add CLAUDE_API_KEY
npm install && npm run build
npm run start:api      # http://localhost:3210
```

**Twitter agent:**

```bash
cd arnold-agent
cp .env.example .env   # Claude + Twitter keys; see .env.example
npm install && npm start
```

See [`arnold/README.md`](arnold/README.md) for API tables, states, and configuration.

## Repo

[github.com/shinendev/arnold](https://github.com/shinendev/arnold)

MIT
