<p align="center">
  <img src="docs/branding/banner.png" width="100%" alt="Arnold — background cognition" />
</p>

<h1 align="center">Arnold</h1>

<p align="center">
  <strong>An AI that thinks while you’re away.</strong><br />
  TypeScript monorepo: long‑term memory, idle cognition loop, REST API, optional Twitter agent.
</p>

<p align="center">
  <a href="https://github.com/shinendev/arnold/blob/main/LICENSE">MIT</a>
  · <a href="https://nodejs.org/">Node 20+</a>
  · <a href="docs/README.md">Documentation</a>
</p>

---

## Why Arnold

Arnold adds a **background cognitive runtime** on top of an LLM (today: Claude via `ClaudeAdapter`):

| Mechanism | Role |
|-----------|------|
| **Memory replay** | Re‑evaluates stored facts with new context |
| **Associative linking** | Samples fact pairs, asks the model for non‑obvious connections |
| **Incubation** | Revisits unresolved questions when more facts exist |
| **Consolidation** | Decay, pruning, promotion, dedupe, contradiction hints |
| **Scheduler** | `awake` → `idle` → `dreaming` as idle time grows |

Data stays **local** (SQLite). The HTTP API is suitable for a separate frontend or internal tools.

---

## Repository layout

```
arnold/           npm package "arnold-subcon" — core engine + REST API
arnold-agent/     Twitter bot — personality, tight rate limits, selective replies
docs/             Human guides (install, config, API, deploy, architecture)
ecosystem.config.js   Example PM2 layout for production VPS
```

---

## Documentation

| Doc | Contents |
|-----|----------|
| [**docs/README.md**](docs/README.md) | Index of all guides |
| [**docs/INSTALLATION.md**](docs/INSTALLATION.md) | Prerequisites, clone, install, build, first run |
| [**docs/CONFIGURATION.md**](docs/CONFIGURATION.md) | Environment variables — API vs agent |
| [**docs/API.md**](docs/API.md) | REST endpoints, `userId`, request/response shapes |
| [**docs/ARCHITECTURE.md**](docs/ARCHITECTURE.md) | Runtime model, memory layers, background loop |
| [**docs/DEPLOYMENT.md**](docs/DEPLOYMENT.md) | VPS: Node, PM2, Nginx, SSL, operations |
| [**docs/TWITTER_AGENT.md**](docs/TWITTER_AGENT.md) | Posting policy, limits, mention handling |
| [**docs/SECURITY.md**](docs/SECURITY.md) | Secrets, multi‑user DB layout, production notes |
| [**docs/TROUBLESHOOTING.md**](docs/TROUBLESHOOTING.md) | Common failures and fixes |
| [**docs/WEBSITE_DOCUMENTATION.md**](docs/WEBSITE_DOCUMENTATION.md) | **All docs in one file** — for your site’s Documentation page |
| [**docs/DOCUMENTATION_PROMPT.txt**](docs/DOCUMENTATION_PROMPT.txt) | Short prompt + instruction to attach the doc file |

Package‑specific details and TypeScript usage: [`arnold/README.md`](arnold/README.md).

---

## 60‑second local run (API only)

```bash
cd arnold
cp .env.example .env
# set CLAUDE_API_KEY in .env
npm install && npm run build
npm run start:api
```

Open `http://localhost:3210/api/state` — you should see JSON with `state`, fact counts, etc.

---

## License

[MIT](LICENSE)
