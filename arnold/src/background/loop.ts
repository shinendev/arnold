import { ArnoldConfig, DriftLogEntry } from '../types';
import { MemoryStore } from '../core/memory-store';
import { InsightStore } from '../core/insight-store';
import { ReplayEngine } from '../core/replay-engine';
import { Associator } from '../core/associator';
import { Incubator } from '../core/incubator';
import { Consolidator } from '../core/consolidator';
import { Scheduler } from './scheduler';
import { DriftLog } from './drift-log';

export class BackgroundLoop {
  private interval: ReturnType<typeof setInterval> | null = null;
  private cycleCount = 0;
  private running = false;
  private lastCycleAt: number | null = null;

  constructor(
    private config: ArnoldConfig,
    private memoryStore: MemoryStore,
    private insightStore: InsightStore,
    private replayEngine: ReplayEngine,
    private associator: Associator,
    private incubator: Incubator,
    private consolidator: Consolidator,
    private scheduler: Scheduler,
    private driftLog: DriftLog,
  ) {}

  start(): void {
    if (this.interval) return;

    this.scheduler.setOnStateChange((state) => {
      if (state === 'idle' || state === 'dreaming') {
        this.startCycling();
      } else if (state === 'awake') {
        this.stopCycling();
      }
    });
  }

  private startCycling(): void {
    if (this.interval) return;

    // Run first cycle immediately
    this.runCycle();

    this.interval = setInterval(() => {
      if (!this.running) {
        this.runCycle();
      }
      // If still running from last cycle, skip
    }, this.config.cycleIntervalMs);
  }

  private stopCycling(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  private async runCycle(): Promise<void> {
    if (this.running) return;
    this.running = true;

    try {
      const allEntries: DriftLogEntry[] = [];
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
    } catch (error) {
      console.error('[arnold] cycle error:', error);
    } finally {
      this.running = false;
    }
  }

  getCycleCount(): number {
    return this.cycleCount;
  }

  getLastCycleAt(): number | null {
    return this.lastCycleAt;
  }

  isRunning(): boolean {
    return this.running;
  }

  stop(): void {
    this.stopCycling();
    this.scheduler.destroy();
  }
}
