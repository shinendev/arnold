export declare class ArnoldAgent {
    private sub;
    private llm;
    private processUpdateTimer;
    private mentionTimer;
    private insightCheckTimer;
    constructor();
    start(): Promise<void>;
    private checkAndPostInsights;
    private postProcessUpdate;
    shutdown(): Promise<void>;
}
