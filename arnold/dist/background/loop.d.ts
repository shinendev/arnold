import { ArnoldConfig } from '../types';
import { MemoryStore } from '../core/memory-store';
import { InsightStore } from '../core/insight-store';
import { ReplayEngine } from '../core/replay-engine';
import { Associator } from '../core/associator';
import { Incubator } from '../core/incubator';
import { Consolidator } from '../core/consolidator';
import { Scheduler } from './scheduler';
import { DriftLog } from './drift-log';
export declare class BackgroundLoop {
    private config;
    private memoryStore;
    private insightStore;
    private replayEngine;
    private associator;
    private incubator;
    private consolidator;
    private scheduler;
    private driftLog;
    private interval;
    private cycleCount;
    private running;
    private lastCycleAt;
    constructor(config: ArnoldConfig, memoryStore: MemoryStore, insightStore: InsightStore, replayEngine: ReplayEngine, associator: Associator, incubator: Incubator, consolidator: Consolidator, scheduler: Scheduler, driftLog: DriftLog);
    start(): void;
    private startCycling;
    private stopCycling;
    private runCycle;
    getCycleCount(): number;
    getLastCycleAt(): number | null;
    isRunning(): boolean;
    stop(): void;
}
//# sourceMappingURL=loop.d.ts.map