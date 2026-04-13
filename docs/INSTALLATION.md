# Installation

## Requirements

- **Node.js** 20 or newer ([nodejs.org](https://nodejs.org/))
- **npm** (bundled with Node)
- **Anthropic API key** for Claude (`CLAUDE_API_KEY`) — required for both packages
- **Twitter** credentials — only if you run `arnold-agent`

Optional for production:

- **PM2** (`npm install -g pm2`) or another process manager
- **Nginx** (or Caddy) for TLS reverse proxy in front of the API

---

## Clone the repository

```bash
git clone https://github.com/shinendev/arnold.git
cd arnold
```

The clone root (folder `arnold` by default) contains `arnold/` (core package directory) and `arnold-agent/` (Twitter).

**Private notes:** anything that must never be committed can live in a **`.local/`** directory at the repo root (that path is gitignored). Only `.env.example` style templates belong in git.

---

## Core package (`arnold/`)

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

### Run the REST API locally

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

## Twitter agent (`arnold-agent/`)

Depends on the local core package via `file:../arnold` in `package.json`.

```bash
cd ../arnold-agent
cp .env.example .env
```

Fill **Claude** and **Twitter** variables (see [CONFIGURATION.md](CONFIGURATION.md)).

```bash
npm install
npm run build
npm start
```

Set `PAUSE_BOT=true` in `.env` to start the process without posting (useful for debugging imports).

---

## Development workflow

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

## Native module note (`better-sqlite3`)

The core package uses `better-sqlite3`. On most macOS/Linux setups `npm install` compiles or downloads a prebuild automatically. If install fails:

- Ensure Xcode Command Line Tools are installed (macOS): `xcode-select --install`
- On Linux, install `build-essential` (Debian/Ubuntu) or equivalent plus `python3`

---

## Next steps

- [CONFIGURATION.md](CONFIGURATION.md) — full variable reference
- [API.md](API.md) — integrate your frontend or another service
- [DEPLOYMENT.md](DEPLOYMENT.md) — ship to a VPS
