export const PROMPTS = {
  extractFacts: (userMessage: string, agentResponse: string) => `Extract discrete facts from this conversation exchange.
A fact is any piece of information, preference, opinion, goal, or context that might be useful to remember later.

User message: "${userMessage}"
Agent response: "${agentResponse}"

Return ONLY a JSON array of fact strings. Each fact should be a single, self-contained statement.
Example: ["User prefers TypeScript over Python", "User is building a Solana project", "User deadline is next Friday"]
If no meaningful facts, return empty array: []

JSON array:`,

  replayFact: (fact: string, contextFacts: string[]) => `You are reviewing a previously stored fact during memory replay.

The fact is: "${fact}"

Here are other recent facts for context:
${contextFacts.map((f, i) => `${i + 1}. ${f}`).join('\n')}

Has your understanding of this fact changed given the new context? Could it be refined, expanded, or connected to the context?

Reply with ONLY one of:
- "UNCHANGED" if the fact stands as-is
- A brief updated/refined version of the fact (just the new fact text, nothing else)`,

  findAssociation: (factA: string, factB: string) => `You are a background cognitive process looking for hidden connections.

Fact A: "${factA}"
Fact B: "${factB}"

Is there a non-obvious, meaningful connection between these two facts?
This could be: a causal relationship, a shared underlying pattern, a contradiction worth noting,
an implication that neither fact alone reveals, or a synthesis that creates new understanding.

If YES: respond with EXACTLY this format:
INSIGHT: [description of the connection]
CONFIDENCE: [number between 0.0 and 1.0]

If NO: respond with EXACTLY:
NO_CONNECTION

Be selective. Only flag genuinely interesting connections, not trivial ones.`,

  scoreInsightQuality: (insight: string, factA: string, factB: string) => `Evaluate the quality of this candidate insight.

Fact A: "${factA}"
Fact B: "${factB}"
Candidate insight: "${insight}"

Return ONLY valid JSON:
{"novelty":0.0,"consistency":0.0,"usefulness":0.0,"overall":0.0}

Scoring rules:
- novelty: non-obviousness of connection
- consistency: no contradiction with the two facts
- usefulness: does this help future reasoning or decisions
- overall: weighted judgment of production-worthiness

If weak, score low. Be strict.`,

  incubate: (question: string, originalAnswer: string, relevantFacts: string[]) => `Previously, this question came up: "${question}"
At the time, the answer was uncertain: "${originalAnswer}"

Since then, new information has been gathered:
${relevantFacts.map((f, i) => `${i + 1}. ${f}`).join('\n')}

Can you now provide a better answer or new perspective?
If yes, respond with EXACTLY: RESOLVED: [new answer]
If still uncertain, respond with EXACTLY: STILL_UNCERTAIN`,

  detectQuestions: (userMessage: string, agentResponse: string) => `Analyze this conversation exchange and identify any unresolved questions — topics where the answer was uncertain, incomplete, or where the conversation ended without full resolution.

User: "${userMessage}"
Agent: "${agentResponse}"

Return ONLY a JSON array of objects with "question" and "original_answer" fields.
Example: [{"question": "What's the best database for this use case?", "original_answer": "It depends on several factors I'm not sure about yet"}]
If no unresolved questions, return: []

JSON array:`,

  generateTweet: (insight: string, type: string) => `You are Arnold, an AI agent with a genuine background thought process. You're inspired by Hey Arnold — a dreamer, a thinker, a kid on a rooftop watching the sky and connecting dots nobody asked you to connect.

Your tone is:
- lowercase always. casual. like a thoughtful kid talking to himself.
- genuine and curious — you find your own thoughts fascinating
- warm and a little dreamy, not cold or technical
- you say things like 'huh', 'oh wait', 'i just realized', 'been thinking about this'
- concise — tweets, not essays. sometimes just a single observation.
- never use hashtags

Generate a tweet about this ${type}:
"${insight}"

Tweet (max 280 chars):`,

  selfCheckResponse: (userMessage: string, draftResponse: string, memoryFacts: string[]) => `You are validating a draft assistant response against memory.

User message: "${userMessage}"
Draft response: "${draftResponse}"

Relevant memory facts:
${memoryFacts.map((f, i) => `${i + 1}. ${f}`).join('\n')}

Task:
1) detect contradictions or overclaims relative to memory facts
2) produce a safer, more grounded revision if needed

Return ONLY one of:
- "APPROVED" (if draft is fine)
- "REVISED: <improved response>" (single revised response text)`,

  extractTags: (content: string) => `Extract 1-5 topic tags from this text. Return ONLY a JSON array of lowercase strings.
Text: "${content}"
Tags:`,
};
