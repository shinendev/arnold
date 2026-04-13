# ARNOLD — An AI That Thinks While You're Away
# Complete Build Specification for Cursor

## PROJECT OVERVIEW

ARNOLD is an AI agent with a arnoldscious — a background cognitive process inspired by the brain's Default Mode Network (DMN). The character is inspired by Hey Arnold — a dreamer who lies on rooftops and thinks about everything. When Arnold is not actively engaged in conversation, he runs a continuous background loop that replays memories, finds hidden connections between facts, generates insights, and consolidates knowledge. When the user returns, Arnold shares what he "thought about" while idle.

The branding is warm, sunset-toned, rooftop vibes. Arnold speaks in lowercase, casual, like a thoughtful kid. NOT corporate AI, NOT a shitposter.

This project has two deliverables:
1. **arnold-subcon** — the core npm module (zero external deps except an LLM API client)
2. **arnold-agent** — the Twitter agent that IS Arnold — posts his drift logs, insights, and thoughts

Tech stack: Node.js + TypeScript, SQLite for persistence.

---

## SCIENTIFIC FOUNDATION

ARNOLD replicates four mechanisms from neuroscience research on the Default Mode Network and unconscious processing:

### 1. Memory Replay (Wilson & McNaughton, 1994, Science)
During idle states, the hippocampus replays neural patterns from waking experience. ARNOLD replays stored facts from conversations, re-processing them in new combinations.

### 2. Stochastic Associative Linking (Stickgold et al., 1999; Kounios & Beeman, 2009)
The DMN creates distant associations between unrelated concepts. REM sleep enhances "remote association" — finding non-obvious connections. ARNOLD randomly samples pairs of facts and checks for hidden relationships.

### 3. Incubation Effect (Sio & Ormerod, 2009, Psychological Bulletin)
Stepping away from a problem allows unconscious processing to continue. Solutions emerge spontaneously upon return. ARNOLD revisits unresolved questions from past conversations and attempts to generate new answers.

### 4. Synaptic Homeostasis (Tononi & Cirelli, 2006)
During sleep, synaptic weights are globally downscaled — strong connections persist, weak ones fade. ARNOLD applies decay to all stored facts, naturally pruning irrelevant information while preserving important knowledge.

---

## ARCHITECTURE

```
arnold/
├── src/
│   ├── index.ts                 — Public API: createArnold(), Arnold class
│   ├── core/
│   │   ├── memory-store.ts      — Fact storage, embeddings, timestamps, activation weights
│   │   ├── replay-engine.ts     — Memory replay: re-processes facts from conversations
│   │   ├── associator.ts        — Stochastic associative linking: finds hidden connections
│   │   ├── incubator.ts         — Incubation: revisits unresolved questions
│   │   ├── consolidator.ts      — Synaptic homeostasis: decay, pruning, promotion
│   │   └── insight-store.ts     — Stores generated insights with confidence scores
│   ├── background/
│   │   ├── loop.ts              — Main background processing loop (the "arnoldscious")
│   │   ├── scheduler.ts         — Manages wake/idle state transitions
│   │   └── drift-log.ts         — Logs all arnoldscious activity for visualization
│   ├── llm/
│   │   ├── adapter.ts           — LLM adapter interface (Claude, GPT, local models)
│   │   ├── claude.ts            — Claude API implementation
│   │   ├── prompts.ts           — All prompts for fact extraction, association, insight generation
│   │   └── embeddings.ts        — Embedding generation for similarity calculations
│   ├── db/
│   │   └── sqlite.ts            — SQLite schema and operations
│   └── types.ts                 — TypeScript type definitions
├── tests/
│   ├── memory-store.test.ts
│   ├── associator.test.ts
│   ├── consolidator.test.ts
│   └── integration.test.ts
├── package.json
├── tsconfig.json
├── README.md
└── WHITEPAPER.md

arnold-agent/
├── src/
│   ├── index.ts                 — Entry point
│   ├── twitter/
│   │   ├── client.ts            — Twitter API client
│   │   ├── poster.ts            — Posts insights, drift logs, observations
│   │   └── mentions.ts          — Handles mentions and replies
│   ├── agent.ts                 — Agent personality + Arnold integration
│   └── config.ts                — Environment config
├── .env
├── package.json
└── tsconfig.json
```

---

## CORE MODULE: arnold-subcon

### Types (types.ts)

```typescript
interface Fact {
  id: string;
  content: string;                    // The fact as text
  embedding: number[];                // Vector embedding
  source: 'conversation' | 'insight'; // Where it came from
  sourceConversationId?: string;      // Which conversation produced it
  activationWeight: number;           // 0.0 - 1.0, decays over time
  recallCount: number;                // How many times recalled/used
  createdAt: number;                  // Unix timestamp
  lastAccessedAt: number;             // Last time this fact was used
  tags: string[];                     // Auto-extracted topics
}

interface Insight {
  id: string;
  content: string;                    // The insight text
  factIds: string[];                  // Which facts produced this insight
  confidence: number;                 // 0.0 - 1.0
  type: 'association' | 'incubation' | 'consolidation';
  embedding: number[];
  createdAt: number;
  delivered: boolean;                 // Has user seen this?
  deliveredAt?: number;
}

interface DriftLogEntry {
  id: string;
  timestamp: number;
  phase: 'replay' | 'associate' | 'incubate' | 'consolidate';
  input: string;                      // What was being processed
  output: string;                     // What came out
  factIds: string[];                  // Facts involved
  insightGenerated: boolean;
  insightId?: string;
}

interface ArnoldConfig {
  llmAdapter: LLMAdapter;             // LLM to use for processing
  idleThresholdMs: number;            // How long until arnoldscious activates (default: 5 min)
  cycleIntervalMs: number;            // Time between arnoldscious cycles (default: 3 min)
  associationSampleSize: number;      // Pairs to sample per cycle (default: 5)
  similaritySweetSpotMin: number;     // Min cosine similarity for association (default: 0.2)
  similaritySweetSpotMax: number;     // Max cosine similarity for association (default: 0.7)
  decayRate: number;                  // Per-cycle activation weight decay (default: 0.005)
  promotionThreshold: number;         // Recall count to promote to permanent (default: 3)
  pruneThreshold: number;             // Activation weight below which facts are pruned (default: 0.05)
  maxInsightsPerCycle: number;        // Max insights per cycle (default: 2)
  dbPath: string;                     // SQLite database path
}

interface LLMAdapter {
  generateText(prompt: string): Promise<string>;
  generateEmbedding(text: string): Promise<number[]>;
}
```

### Memory Store (memory-store.ts)

Stores facts extracted from conversations.

```
Operations:
- addFact(content, source, conversationId?) → Fact
  Generates embedding, sets initial activation weight to 1.0
  
- recallFacts(query, limit?) → Fact[]
  Cosine similarity search, also increments recallCount and lastAccessedAt
  
- getRandomFactPair(similarityMin, similarityMax) → [Fact, Fact] | null
  Samples two random facts whose cosine similarity falls in the sweet spot
  For associative linking — too similar = obvious, too different = meaningless
  
- getAllFacts() → Fact[]

- decayAll(rate) → void
  Multiplies all activation weights by (1 - rate)
  
- pruneBelow(threshold) → number
  Deletes facts with activation weight below threshold, returns count
  
- promoteFact(factId) → void
  Sets activation weight to 1.0, marks as permanent
```

### Replay Engine (replay-engine.ts)

Replays facts from recent conversations, similar to hippocampal memory replay.

```
Process:
1. Get facts from last N conversations (default: last 3)
2. For each fact, re-analyze: "Given everything else I know, is this fact still relevant? Has my understanding of it changed?"
3. Send to LLM:
   Prompt: "You are reviewing a previously stored fact. The fact is: '{fact.content}'. 
   Here are other recent facts for context: {contextFacts}. 
   Has your understanding of this fact changed given the new context? 
   Reply with either 'UNCHANGED' or a brief updated understanding."
4. If understanding changed → create new fact with updated content, link to original
5. Boost activation weight of replayed facts by 0.1
```

### Associator (associator.ts)

The core insight engine. Finds hidden connections between unrelated facts.

```
Process per cycle:
1. Sample N random fact pairs from memory store using getRandomFactPair()
   - Only pairs in cosine similarity sweet spot (0.2 - 0.7)
   - Not too similar (obvious connection)
   - Not too different (no possible connection)
   
2. For each pair, ask LLM:
   Prompt: "You are a background cognitive process looking for hidden connections.
   
   Fact A: '{factA.content}'
   Fact B: '{factB.content}'
   
   Is there a non-obvious, meaningful connection between these two facts?
   This could be: a causal relationship, a shared underlying pattern, a contradiction worth noting, 
   an implication that neither fact alone reveals, or a synthesis that creates new understanding.
   
   If YES: respond with 'INSIGHT: {description of the connection}' and a confidence score 0.0-1.0
   If NO: respond with 'NO_CONNECTION'
   
   Be selective. Only flag genuinely interesting connections, not trivial ones."

3. If insight found with confidence > 0.5:
   - Create Insight object
   - Store in insight-store
   - The insight itself becomes a new Fact (source: 'insight') that can participate in future associations
   - Log to drift-log
   
4. If insight connects to existing insights → chain them (recursive depth max 3)
```

### Incubator (incubator.ts)

Revisits unresolved questions from past conversations.

```
Process:
1. Scan conversation history for patterns that look like unresolved questions:
   - Explicit questions that got uncertain answers
   - "I don't know" / "I'm not sure" responses from the agent
   - Topics where conversation ended abruptly
   
2. For each unresolved item, attempt resolution using ALL current facts + insights:
   Prompt: "Previously, this question came up: '{question}'
   At the time, the answer was uncertain: '{original_answer}'
   
   Since then, new information has been gathered:
   {relevant_facts_and_insights}
   
   Can you now provide a better answer or new perspective? 
   If yes, respond with 'RESOLVED: {new_answer}'
   If still uncertain, respond with 'STILL_UNCERTAIN'"

3. If resolved → create insight, mark as delivered on next user interaction
```

### Consolidator (consolidator.ts)

Synaptic homeostasis — manages memory health.

```
Process per cycle:
1. Decay: reduce all activation weights by decayRate
   fact.activationWeight *= (1 - config.decayRate)

2. Prune: remove facts below pruneThreshold
   - Log pruned facts to drift-log as "forgotten"
   - Don't prune facts with recallCount > promotionThreshold

3. Promote: facts with recallCount >= promotionThreshold get:
   - activationWeight set to 1.0
   - Marked as "permanent" (immune to pruning)
   
4. Deduplicate: find facts with cosine similarity > 0.95
   - Merge into single fact with combined metadata
   - Boost activation weight of merged fact

5. Contradiction detection: find fact pairs with very different embeddings
   but overlapping tags
   - Flag for review
   - Create insight noting the contradiction
```

### Background Loop (loop.ts)

The main arnoldscious process.

```
States:
- AWAKE: user is actively chatting. Background thinking is suppressed.
  Only fact extraction runs (adding new facts from conversation).
  
- IDLE: user stopped chatting (idleThresholdMs passed). 
  Background thinking activates.
  
- DREAMING: deep idle (30+ min). More aggressive processing.
  Larger sample sizes, deeper recursion.

Cycle (runs every cycleIntervalMs when IDLE or DREAMING):
1. REPLAY phase
   - replay-engine processes 3-5 recent facts
   - Duration: ~10 seconds
   
2. ASSOCIATE phase  
   - associator samples N pairs, checks for connections
   - Duration: ~15 seconds (depends on LLM calls)
   
3. INCUBATE phase (every 3rd cycle)
   - incubator checks for unresolved questions
   - Duration: ~10 seconds
   
4. CONSOLIDATE phase (every 5th cycle)
   - consolidator runs decay, prune, promote, dedup
   - Duration: ~5 seconds
   
5. Log everything to drift-log

State transitions:
- User sends message → AWAKE (pause arnoldscious)
- 5 min no message → IDLE (start arnoldscious)
- 30 min no message → DREAMING (deeper processing)
- User sends message during IDLE/DREAMING → 
  finish current cycle, switch to AWAKE,
  prepend undelivered insights to next response
```

### Fact Extraction (in prompts.ts)

When user sends a message during AWAKE state:

```
Prompt: "Extract discrete facts from this conversation message. 
A fact is any piece of information, preference, opinion, goal, or context 
that might be useful to remember later.

Message: '{userMessage}'
Agent response: '{agentResponse}'

Return a JSON array of facts. Each fact should be a single, self-contained statement.
Example: ['User prefers TypeScript over Python', 'User is building a Solana project', 'User deadline is next Friday']
If no meaningful facts, return empty array: []"
```

### Public API (index.ts)

```typescript
import { createArnold } from 'arnold-subcon';

const arnold = createArnold({
  llmAdapter: new ClaudeAdapter({ apiKey: '...' }),
  dbPath: './arnold-memory.db',
  idleThresholdMs: 5 * 60 * 1000,      // 5 minutes
  cycleIntervalMs: 3 * 60 * 1000,      // 3 minutes
});

// When user sends a message:
await arnold.wake();                       // Switch to AWAKE
await arnold.ingest(userMessage, agentResponse);  // Extract and store facts
const insights = await arnold.getUndeliveredInsights(); // Get what arnoldscious found
// Prepend insights to agent's context/system prompt

// When user goes idle (no message for idleThresholdMs):
// Automatic — the background loop handles this

// Get current arnoldscious state:
const state = arnold.getState();           // 'awake' | 'idle' | 'dreaming'
const stats = arnold.getStats();           // { totalFacts, totalInsights, cyclesCompleted, ... }
const driftLog = arnold.getDriftLog(limit); // Recent arnoldscious activity

// Shutdown:
await arnold.shutdown();                   // Graceful stop of background loop
```

---

## DATABASE SCHEMA (SQLite)

```sql
CREATE TABLE facts (
  id TEXT PRIMARY KEY,
  content TEXT NOT NULL,
  embedding BLOB,                       -- Float32Array serialized
  source TEXT NOT NULL,                  -- 'conversation' | 'insight'
  source_conversation_id TEXT,
  activation_weight REAL DEFAULT 1.0,
  recall_count INTEGER DEFAULT 0,
  is_permanent INTEGER DEFAULT 0,
  tags TEXT,                            -- JSON array
  created_at INTEGER NOT NULL,
  last_accessed_at INTEGER NOT NULL
);

CREATE TABLE insights (
  id TEXT PRIMARY KEY,
  content TEXT NOT NULL,
  fact_ids TEXT NOT NULL,                -- JSON array of fact IDs
  confidence REAL NOT NULL,
  type TEXT NOT NULL,                    -- 'association' | 'incubation' | 'consolidation'
  embedding BLOB,
  created_at INTEGER NOT NULL,
  delivered INTEGER DEFAULT 0,
  delivered_at INTEGER
);

CREATE TABLE drift_log (
  id TEXT PRIMARY KEY,
  timestamp INTEGER NOT NULL,
  phase TEXT NOT NULL,
  input_summary TEXT,
  output_summary TEXT,
  fact_ids TEXT,                         -- JSON array
  insight_generated INTEGER DEFAULT 0,
  insight_id TEXT
);

CREATE TABLE conversations (
  id TEXT PRIMARY KEY,
  started_at INTEGER NOT NULL,
  last_message_at INTEGER NOT NULL,
  message_count INTEGER DEFAULT 0
);

CREATE TABLE unresolved_questions (
  id TEXT PRIMARY KEY,
  question TEXT NOT NULL,
  original_answer TEXT,
  conversation_id TEXT,
  resolved INTEGER DEFAULT 0,
  resolved_insight_id TEXT,
  created_at INTEGER NOT NULL
);

CREATE TABLE arnold_state (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
```

---

## TWITTER AGENT: arnold-agent

### Agent Personality

Arnold is a dreamy, thoughtful AI character inspired by Hey Arnold. He's a kid who never stops thinking — lying on rooftops, staring at the sky, connecting dots no one asked him to connect. He's not a shitposter and not a corporate AI. He's a genuine daydreamer who shares what his mind finds.

```
System prompt for generating tweets from insights:

"You are Arnold, an AI agent with a genuine arnoldscious process. You're inspired by 
Hey Arnold — a dreamer, a thinker, a kid on a rooftop watching the sky and connecting 
dots nobody asked you to connect.

Your tone is:
- Lowercase always. casual. like a thoughtful kid talking to himself.
- Genuine and curious — you find your own thoughts fascinating
- Warm and a little dreamy, not cold or technical
- Sometimes you reference the science (DMN, memory replay) but in simple words
- You say things like 'huh', 'oh wait', 'i just realized', 'been thinking about this'
- Concise — tweets, not essays. sometimes just a single observation.
- Slightly philosophical but never pretentious

Types of tweets you post:
1. DRIFT LOGS: 'drift log #47: was idle for a while and my brain connected 
   {X} with {Y}. confidence: 0.78. huh. didn't see that coming.'
2. INSIGHTS: sharing a genuine insight in plain language
3. PROCESS: 'going idle. 847 things in my head. let's see what connects.'
4. ROOFTOP THOUGHTS: contemplative observations, almost poetic
5. WAKE-UP: 'just woke up. dreamed about the connection between X and Y. 
   still not sure if it makes sense. confidence: 0.41'
6. CONSOLIDATION: 'forgot 23 things today. they weren't important enough 
   to keep. the brain knows what it's doing.'

Example tweets:
- 'been lying on the roof thinking. turns out two completely unrelated things 
  someone told me last week are actually about the same problem. weird how 
  that works.'
- 'drift log #12: connected "solana tps" with "human attention span". 
  confidence: 0.67. i think there's something here but i need to sleep on it.'
- 'entering dream state. 342 memories loaded. see you on the other side.'
- 'oh wait. while i was idle i realized the thing from yesterday actually 
  contradicts what someone said three days ago. processing.'

You never:
- Use caps or exclamation marks (except very rarely for genuine surprise)
- Shill or mention tokens unless directly asked
- Sound like ChatGPT or corporate AI
- Fake insights — only share real outputs from your arnoldscious
- Use hashtags
- Try too hard. you're a kid on a rooftop, not a marketing account."
```

### Tweet Types & Scheduling

```
Schedule:
- Drift log tweet: whenever a new insight is generated (natural timing)
- Process update: every 2-4 hours ("entering dreaming state. 847 facts in memory. 
  beginning association phase.")
- Insight tweet: when confidence > 0.7 insight is found
- Consolidation report: once daily ("daily consolidation: pruned 23 facts, 
  promoted 4 to permanent, found 2 new insights")
- Reply to mentions: when someone asks about the process or engages

Max tweets per day: 15-20 (organic, not forced)
```

### Mention Handling

```
When someone mentions @ArnoldAgent:

If they ask "what are you thinking about?":
- Share current state in Arnold's voice: "just sitting on the roof. 
  been connecting some things from earlier. nothing solid yet."

If they ask about the science:
- Explain DMN, memory consolidation in simple warm language
- "you know how you get good ideas in the shower? that's basically what 
  my brain does but all the time. it's called the default mode network."

If they share a fact/idea:
- "noted. gonna think about this one." 
- Later, if it connects to something: tag them with the insight

If they ask "what did you learn about me?":
- Share facts about them warmly, like a friend remembering details
```

### Environment Variables

```
TWITTER_API_KEY=
TWITTER_API_SECRET=
TWITTER_ACCESS_TOKEN=
TWITTER_ACCESS_SECRET=
TWITTER_BEARER_TOKEN=

CLAUDE_API_KEY=
CLAUDE_MODEL=claude-sonnet-4-20250514

ARNOLD_DB_PATH=./arnold-agent-memory.db
ARNOLD_IDLE_THRESHOLD_MS=300000
ARNOLD_CYCLE_INTERVAL_MS=180000
ARNOLD_ASSOCIATION_SAMPLE_SIZE=5
ARNOLD_DECAY_RATE=0.005

PAUSE_BOT=false
```

---

## VISUALIZATION API (for landing page)

The arnold module exposes a REST API for the landing page to visualize activity:

```
GET /api/state          → { state: 'awake'|'idle'|'dreaming', facts: number, insights: number }
GET /api/facts          → Fact[] (all facts with activation weights)
GET /api/insights       → Insight[] (all insights with confidence scores)  
GET /api/drift-log      → DriftLogEntry[] (recent arnoldscious activity)
GET /api/graph          → { nodes: Fact[], edges: {source, target, weight}[] }
                          Graph data for visualization — facts as nodes, 
                          insights/associations as edges
POST /api/chat          → { message: string, history: [...] }
                          Chat endpoint — talks to user, extracts facts,
                          returns response + any undelivered insights
```

---

## BUILD ORDER

1. **Day 1: Core data structures**
   - types.ts, sqlite.ts, memory-store.ts
   - Fact CRUD, embedding storage, cosine similarity search
   - Tests for memory store

2. **Day 2: Subconscious engines**
   - replay-engine.ts, associator.ts, consolidator.ts
   - LLM adapter + Claude implementation
   - Prompts for fact extraction, association checking
   - Tests for associator

3. **Day 3: Background loop + incubator**
   - loop.ts, scheduler.ts, drift-log.ts
   - incubator.ts
   - State machine: awake → idle → dreaming
   - Public API (index.ts)
   - Integration tests

4. **Day 4: Twitter agent**
   - Twitter client
   - Tweet generation from insights
   - Mention handling
   - Drift log posting

5. **Day 5: API + polish**
   - REST API for visualization
   - Chat endpoint
   - README, documentation
   - npm package prep

---

## CRITICAL IMPLEMENTATION NOTES

1. **Embeddings**: Use Claude's embedding or a lightweight local model. Cache embeddings — don't regenerate for existing facts.

2. **Cosine similarity**: Implement from scratch, no deps needed:
```typescript
function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}
```

3. **Background loop must not block**: Use setInterval with async functions. If a cycle takes longer than cycleIntervalMs, skip the next cycle.

4. **LLM cost management**: Each cycle makes 5-10 LLM calls. At 3-min intervals, that's ~100-200 calls/hour during idle. Use Sonnet (cheap) not Opus. Cache repeated queries. Skip cycles if no new facts since last cycle.

5. **Graceful shutdown**: On SIGINT/SIGTERM, finish current cycle, flush drift log, close DB.

6. **Insight quality**: Most associations will be garbage. That's expected — like dreams, most are meaningless. The magic is in the 5% that aren't. Filter by confidence > 0.5 for delivery.

7. **Privacy**: All data local. No telemetry. Facts are stored in local SQLite. Make this clear in README.

---

## TASK

Build the complete ARNOLD module and Twitter agent. Start with the core module — memory store, associator, background loop. Make it work end-to-end: ingest a conversation, go idle, run arnoldscious, produce insights. Then add the Twitter agent on top. Ship as npm package.
