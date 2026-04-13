# Arnold API — guide for Lovable (frontend)

Use this page to wire a **Lovable** site (or any static/React app) to the **Arnold REST API** running on your VPS (or `localhost` while developing).

---

## What you need

1. **API base URL** — where Express listens, e.g.  
   - Production: `https://api.yourdomain.com` (recommended: HTTPS behind Nginx)  
   - Dev: `http://localhost:3210`
2. **CORS** — enabled on the Arnold server for browser calls.
3. **No API key in the browser** (current server) — the API is **open** if exposed to the internet. For production, put **auth** in front (Nginx Basic Auth, Cloudflare Access, or your own BFF). Until then, treat the URL as semi-private.

---

## Configure Lovable

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

## Multi-user: `userId`

Arnold isolates memory per user. Pass a **stable string** per signed-in user (or anonymous id in `localStorage`).

- **Query:** `?userId=alice`
- **POST body:** `"userId": "alice"` (for `/api/chat`)

If you omit it, the server uses `default` (shared demo bucket — fine for a single-user prototype, bad for real multi-user without auth).

---

## Endpoints (copy-paste)

Replace `` `${API}` `` with your configured base URL.

### `GET /api/state`

```ts
const userId = 'demo-user';
const r = await fetch(`${API}/api/state?userId=${encodeURIComponent(userId)}`);
const data = await r.json();
// { userId, state, facts, insights, permanentFacts, cyclesCompleted, lastCycleAt }
```

### `GET /api/facts`

```ts
const r = await fetch(`${API}/api/facts?userId=${encodeURIComponent(userId)}`);
const facts = await r.json(); // Fact[]
```

### `GET /api/insights`

```ts
const r = await fetch(`${API}/api/insights?userId=${encodeURIComponent(userId)}`);
const insights = await r.json(); // Insight[]
```

### `GET /api/drift-log`

```ts
const limit = 30;
const r = await fetch(
  `${API}/api/drift-log?userId=${encodeURIComponent(userId)}&limit=${limit}`
);
const log = await r.json(); // DriftLogEntry[]
```

### `GET /api/graph`

```ts
const r = await fetch(`${API}/api/graph?userId=${encodeURIComponent(userId)}`);
const graph = await r.json(); // { nodes: Fact[], edges: [...] }
```

### `GET /api/metrics`

```ts
const r = await fetch(`${API}/api/metrics?userId=${encodeURIComponent(userId)}`);
const metrics = await r.json();
```

### `POST /api/chat`

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

## Minimal chat UI flow

1. On load: `GET /api/state` — show idle/awake/dreaming and counts.
2. Optional: `GET /api/drift-log?limit=20` — “recent thoughts” panel.
3. On send: `POST /api/chat` — append `data.response` to the thread; optionally surface `data.insights` as small cards.

---

## JSON shapes (reference)

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

Full field lists for facts/insights/graph live in the [API.md](API.md) doc in this repo.

---

## HTTPS and mixed content

If Lovable publishes the site on **HTTPS**, the browser will **block** calls to `http://` APIs (mixed content). Run Arnold behind **HTTPS** (Nginx + Let’s Encrypt) and point `VITE_*` / `NEXT_PUBLIC_*` to `https://…`.

---

## Where this API is documented in full

- [API.md](API.md) — security, `userId`, global memory flag  
- [CONFIGURATION.md](CONFIGURATION.md) — server `.env`  
- [DEPLOYMENT.md](DEPLOYMENT.md) — VPS + Nginx  

Repository: [github.com/shinendev/arnold](https://github.com/shinendev/arnold)
