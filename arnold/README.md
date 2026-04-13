# ARNOLD — An AI That Thinks While You're Away

A TypeScript module that gives any LLM-based AI agent a background thought process — inspired by the brain's Default Mode Network (DMN) and Hey Arnold's rooftop daydreaming.

When the agent is not actively engaged in conversation, Arnold runs a continuous background loop that:
- **Replays memories** — re-processes facts from conversations (hippocampal replay)
- **Finds hidden connections** — stochastic associative linking between unrelated facts
- **Incubates questions** — revisits unresolved questions with new knowledge
- **Consolidates knowledge** — decay, pruning, deduplication, promotion (synaptic homeostasis)

## Quick Start

```bash
npm install arnold-subcon
```

```typescript
import { createArnold, ClaudeAdapter } from 'arnold-subcon';

const arnold = createArnold({
  llmAdapter: new ClaudeAdapter({ apiKey: 'sk-...' }),
  dbPath: './arnold-memory.db',
});

// When user sends a message
await arnold.wake();
await arnold.ingest(userMessage, agentResponse);

// Get insights Arnold found while idle
const insights = await arnold.getUndeliveredInsights();
// → [{ content: "Connection found between X and Y", confidence: 0.82, type: "association" }]

// Check state
arnold.getState();   // 'awake' | 'idle' | 'dreaming'
arnold.getStats();   // { totalFacts, totalInsights, cyclesCompleted, ... }
arnold.getDriftLog(); // Recent background thought activity

// Shutdown
await arnold.shutdown();
```

## REST API

Run the built-in API server:

```bash
CLAUDE_API_KEY=sk-... npm run start:api
```

Endpoints:

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/state` | Current state, fact/insight counts |
| GET | `/api/facts` | All stored facts with activation weights |
| GET | `/api/insights` | All insights with confidence scores |
| GET | `/api/drift-log` | Recent background thought activity log |
| GET | `/api/graph` | Graph data (facts as nodes, associations as edges) |
| POST | `/api/chat` | Chat endpoint — `{ message, history? }` |

## States

| State | Trigger | Behavior |
|-------|---------|----------|
| **AWAKE** | User sends message | Fact extraction only, background thinking paused |
| **IDLE** | 5 min no activity | Background thinking activates: replay, associate, incubate |
| **DREAMING** | 30 min no activity | Deeper processing, larger sample sizes |

## Configuration

```typescript
createArnold({
  llmAdapter: new ClaudeAdapter({ apiKey, model }),
  dbPath: './memory.db',
  idleThresholdMs: 5 * 60 * 1000,      // 5 min → idle
  cycleIntervalMs: 3 * 60 * 1000,      // cycle every 3 min
  associationSampleSize: 5,             // pairs per cycle
  similaritySweetSpotMin: 0.2,          // too low = no connection
  similaritySweetSpotMax: 0.7,          // too high = obvious
  decayRate: 0.005,                     // per-cycle weight decay
  promotionThreshold: 3,               // recalls to become permanent
  pruneThreshold: 0.05,                // below this = forgotten
  maxInsightsPerCycle: 2,              // cap insights per cycle
});
```

## Scientific Foundation

Based on four neuroscience mechanisms:

1. **Memory Replay** (Wilson & McNaughton, 1994) — hippocampal pattern replay
2. **Stochastic Associative Linking** (Stickgold et al., 1999) — REM remote association
3. **Incubation Effect** (Sio & Ormerod, 2009) — unconscious problem solving
4. **Synaptic Homeostasis** (Tononi & Cirelli, 2006) — sleep-dependent weight normalization

## Privacy

All data is stored locally in SQLite. No telemetry. No external data transmission beyond LLM API calls.

## License

MIT
