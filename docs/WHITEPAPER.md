# Arnold: a cognitive runtime for large language models

**Version 0.1 — technical whitepaper**

---

## Abstract

Large language models (LLMs) excel at in-session reasoning but lack a durable, autonomous process that continues when the user is away. **Arnold** is an open-source TypeScript runtime that layers **persistent memory**, **scheduled background cognition**, and **consolidation** on top of any LLM that implements a small adapter interface. This document states the product vision, maps design choices to cognitive neuroscience *as inspiration* (not as a claim of biological fidelity), and clarifies scope, limitations, and privacy properties suitable for engineers, partners, and investors.

---

## 1. The problem

### 1.1 Stateless and session-bound intelligence

Typical chat deployments treat the model as a function of the current context window. Long-term behavior is either:

- delegated to external vector stores with ad-hoc retrieval, or  
- absent, so the system “forgets” unless the user repeats information.

There is rarely a **continuous policy** for what to think about when no user message arrives: no replay of prior beliefs, no deliberate search for latent structure, no explicit decay of low-value memories.

### 1.2 What Arnold adds

Arnold introduces a **long-running process** that:

1. **Extracts and stores** discrete facts from exchanges.  
2. **Runs a background loop** on a timer when the session is idle, performing replay, association, incubation, and consolidation phases.  
3. **Surfaces** structured outputs (insights, drift logs, graph-friendly data) to the application layer via a library API and an optional HTTP server.

The LLM remains the reasoning engine; Arnold is the **orchestration, memory, and schedule** around it.

---

## 2. Scientific inspiration: the Default Mode Network (DMN)

### 2.1 What we claim — and what we do not claim

The **Default Mode Network** is a set of brain regions with high metabolic activity during wakeful rest and internally directed cognition. Research links the DMN to self-referential processing, mind-wandering, memory consolidation, and spontaneous association.

**Arnold is inspired by this literature at the level of metaphor and mechanism design.** It does **not**:

- simulate neural activity, connectivity matrices, or hemodynamic signals;  
- fit parameters to empirical DMN datasets;  
- assert clinical or biological validity.

We use DMN framing because it communicates an **intuitive product story**: *when the user is not driving the dialogue, the system should still do useful cognitive work in the background.*

### 2.2 Mechanism mapping (analogy, not isomorphism)

| Neuroscience theme (high level) | Arnold module (engineering) |
|--------------------------------|------------------------------|
| Hippocampal **replay** and re-evaluation of experience | **ReplayEngine** — revisits stored facts with updated context via the LLM |
| **Remote association** / linking distant concepts | **Associator** — samples fact pairs in a similarity band, asks the LLM for non-obvious connections, filters low-quality candidates |
| **Incubation** — returning to unresolved problems after a break | **Incubator** — stores open questions, retries resolution when more facts exist |
| **Synaptic homeostasis** / forgetting and strengthening | **Consolidator** — activation decay, pruning, promotion of frequently used facts, deduplication |
| Rest vs. task-focused states | **Scheduler** — `awake` → `idle` → `dreaming` with longer idle periods increasing processing intensity |

This table is a **design rationale**, not a proof that the code implements the cited biological processes.

### 2.3 Selected references (for readers who want primary sources)

The following are widely cited entry points into the themes above; Arnold does **not** implement their experimental protocols.

- Wilson, M. A., & McNaughton, B. L. (1994). Reactivation of hippocampal ensemble memories during sleep. *Science*.  
- Stickgold, R., et al. (1999). Sleep, learning, and dreams: offline memory reprocessing. *Behavioral and Brain Sciences*.  
- Kounios, J., & Beeman, M. (2009). The Aha! moment: cognitive neuroscience of insight. *Trends in Cognitive Sciences*.  
- Sio, U. N., & Ormerod, T. C. (2009). Does incubation enhance problem solving? *Psychological Bulletin*.  
- Tononi, G., & Cirelli, C. (2006). Sleep function and synaptic homeostasis. *Sleep Medicine Reviews*.

Arnold’s documentation and marketing should **cite inspiration** without implying peer-reviewed validation of the software against these papers.

---

## 3. System architecture

### 3.1 Components

- **Core library** (`arnold`): SQLite persistence, memory store, insight store, engines, scheduler, background loop, optional REST API.  
- **Twitter agent** (`arnold-agent`): separate process with its own database file, posting policy, and mention handling — optional product surface, not required for the cognitive runtime.

### 3.2 LLM adapter

All generative steps go through an **`LLMAdapter`** interface (`generateText`, `generateEmbedding`). The reference implementation uses **Anthropic Claude** for text. Embeddings use a **deterministic fallback** suitable for prototyping; production deployments should swap in a semantic embedding provider if similarity quality is business-critical.

### 3.3 Observability

Every background phase can emit **drift log** entries — a first-class artifact for demos, debugging, and future evaluation (e.g. measuring insight acceptance rate, contradiction counts, or human ratings of usefulness).

---

## 4. Memory model and privacy

### 4.1 Local-first data

Facts, insights, drift logs, and conversations are stored in **SQLite** on the host running Arnold. No third-party telemetry is built into the codebase; data leaves the deployment only when you send prompts to your chosen LLM API.

### 4.2 Multi-user isolation (API mode)

The HTTP server can allocate **one database file per `userId`**, plus an optional **global** consolidation path controlled by configuration. Operators must understand that **without authentication**, `userId` is not a security boundary — it is a namespacing convenience until a gateway enforces identity.

### 4.3 Threat model (MVP honesty)

The bundled REST API has **no authentication**. Treat public exposure as you would an internal microservice: terminate TLS at the edge, add bearer tokens or network restrictions, and rate-limit to control cost and abuse.

---

## 5. Limitations and non-goals

1. **Not a general artificial consciousness** — Arnold is scheduled LLM calls plus structured storage.  
2. **Not neuroscientific simulation** — no spiking networks, no biophysical neurons.  
3. **Insight quality is stochastic** — most associative candidates are discarded; a minority may be valuable, similar to human mind-wandering with selective retention.  
4. **Embedding shortcut** — hash-based embeddings are not semantic; similarity thresholds should be re-tuned or replaced when upgrading embeddings.  
5. **Cost** — idle cycles consume tokens; production systems need budgets, backoff, and “skip cycle if nothing new” policies (partially addressed in configuration).

---

## 6. Product positioning

Arnold is best described as:

> **A cognitive runtime layer** that gives LLM-based products **durable memory**, **idle-time computation**, and **auditable thought traces** — with a clear story grounded in familiar neuroscience metaphors.

It is complementary to RAG: RAG answers “what documents are relevant now?” Arnold asks “what should we **rethink**, **connect**, and **forget** over hours and days?”

---

## 7. Roadmap directions (non-binding)

- Pluggable embeddings and evaluation harnesses for insight quality.  
- Stronger privacy modes (no global consolidation; encrypted at rest).  
- Optional authentication and multi-tenant hardening on the HTTP surface.  
- Deeper incubation signals (beyond JSON question detection).  
- Published benchmarks: retention, contradiction rate, user-rated usefulness after idle periods.

---

## 8. Conclusion

Arnold turns a familiar scientific narrative — the brain’s default mode during rest — into a **practical engineering pattern** for LLM applications: memory that persists, work that continues without a prompt, and consolidation that prevents unbounded growth of noise.

The whitepaper’s role is to **align expectations**: inspiration from cognitive science, rigor in software architecture, and transparency about what is not claimed.

---

## License

The Arnold source code is released under the **MIT License** (see the `LICENSE` file in the repository). This whitepaper is provided under the same spirit of open documentation.
