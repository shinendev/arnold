export declare const PROMPTS: {
    extractFacts: (userMessage: string, agentResponse: string) => string;
    replayFact: (fact: string, contextFacts: string[]) => string;
    findAssociation: (factA: string, factB: string) => string;
    scoreInsightQuality: (insight: string, factA: string, factB: string) => string;
    incubate: (question: string, originalAnswer: string, relevantFacts: string[]) => string;
    detectQuestions: (userMessage: string, agentResponse: string) => string;
    generateTweet: (insight: string, type: string) => string;
    selfCheckResponse: (userMessage: string, draftResponse: string, memoryFacts: string[]) => string;
    extractTags: (content: string) => string;
};
//# sourceMappingURL=prompts.d.ts.map