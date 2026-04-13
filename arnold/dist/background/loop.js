"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BackgroundLoop = void 0;
class BackgroundLoop {
    config;
    memoryStore;
    insightStore;
    replayEngine;
    associator;
    incubator;
    consolidator;
    scheduler;
    driftLog;
    interval = null;
    cycleCount = 0;
    running = false;
    lastCycleAt = null;
    constructor(config, memoryStore, insightStore, replayEngine, associator, incubator, consolidator, scheduler, driftLog) {
        this.config = config;
        this.memoryStore = memoryStore;
        this.insightStore = insightStore;
        this.replayEngine = replayEngine;
        this.associator = associator;
        this.incubator = incubator;
        this.consolidator = consolidator;
        this.scheduler = scheduler;
        this.driftLog = driftLog;
    }
    start() {
        if (this.interval)
            return;
        this.scheduler.setOnStateChange((state) => {
            if (state === 'idle' || state === 'dreaming') {
                this.startCycling();
            }
            else if (state === 'awake') {
                this.stopCycling();
            }
        });
    }
    startCycling() {
        if (this.interval)
            return;
        // Run first cycle immediately
        this.runCycle();
        this.interval = setInterval(() => {
            if (!this.running) {
                this.runCycle();
            }
            // If still running from last cycle, skip
        }, this.config.cycleIntervalMs);
    }
    stopCycling() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
    }
    async runCycle() {
        if (this.running)
            return;
        this.running = true;
        try {
            const allEntries = [];
            const isDreaming = this.scheduler.state === 'dreaming';
            const replayCount = isDreaming ? 8 : 5;
            // Phase 1: Replay
            const replayEntries = await this.replayEngine.replay(replayCount);
            allEntries.push(...replayEntries);
            // Phase 2: Associate
            const assocEntries = await this.associator.associate();
            allEntries.push(...assocEntries);
            // Phase 3: Incubate (every 3rd cycle)
            if (this.cycleCount % 3 === 0) {
                const incubEntries = await this.incubator.incubate();
                allEntries.push(...incubEntries);
            }
            // Phase 4: Consolidate (every 5th cycle)
            if (this.cycleCount % 5 === 0) {
                const consolEntries = await this.consolidator.consolidate();
                allEntries.push(...consolEntries);
            }
            // Log everything
            if (allEntries.length > 0) {
                this.driftLog.logBatch(allEntries);
            }
            this.cycleCount++;
            this.lastCycleAt = Date.now();
        }
        catch (error) {
            console.error('[arnold] cycle error:', error);
        }
        finally {
            this.running = false;
        }
    }
    getCycleCount() {
        return this.cycleCount;
    }
    getLastCycleAt() {
        return this.lastCycleAt;
    }
    isRunning() {
        return this.running;
    }
    stop() {
        this.stopCycling();
        this.scheduler.destroy();
    }
}
exports.BackgroundLoop = BackgroundLoop;
//# sourceMappingURL=loop.js.map