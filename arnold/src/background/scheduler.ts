import { ArnoldState, ArnoldConfig } from '../types';

const DREAMING_THRESHOLD_MS = 30 * 60 * 1000; // 30 minutes

export class Scheduler {
  private _state: ArnoldState = 'awake';
  private lastActivityAt: number = Date.now();
  private idleTimer: ReturnType<typeof setTimeout> | null = null;
  private dreamTimer: ReturnType<typeof setTimeout> | null = null;
  private onStateChange?: (state: ArnoldState) => void;

  constructor(
    private config: Pick<ArnoldConfig, 'idleThresholdMs'>,
  ) {}

  get state(): ArnoldState {
    return this._state;
  }

  setOnStateChange(callback: (state: ArnoldState) => void): void {
    this.onStateChange = callback;
  }

  wake(): void {
    this.lastActivityAt = Date.now();
    this.clearTimers();

    if (this._state !== 'awake') {
      this._state = 'awake';
      this.onStateChange?.('awake');
    }

    this.idleTimer = setTimeout(() => {
      this._state = 'idle';
      this.onStateChange?.('idle');

      this.dreamTimer = setTimeout(() => {
        this._state = 'dreaming';
        this.onStateChange?.('dreaming');
      }, DREAMING_THRESHOLD_MS - this.config.idleThresholdMs);
    }, this.config.idleThresholdMs);
  }

  forceState(state: ArnoldState): void {
    this.clearTimers();
    this._state = state;
    this.onStateChange?.(state);
  }

  getIdleDuration(): number {
    return Date.now() - this.lastActivityAt;
  }

  destroy(): void {
    this.clearTimers();
  }

  private clearTimers(): void {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }
    if (this.dreamTimer) {
      clearTimeout(this.dreamTimer);
      this.dreamTimer = null;
    }
  }
}
