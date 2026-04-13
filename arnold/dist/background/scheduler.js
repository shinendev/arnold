"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Scheduler = void 0;
const DREAMING_THRESHOLD_MS = 30 * 60 * 1000; // 30 minutes
class Scheduler {
    config;
    _state = 'awake';
    lastActivityAt = Date.now();
    idleTimer = null;
    dreamTimer = null;
    onStateChange;
    constructor(config) {
        this.config = config;
    }
    get state() {
        return this._state;
    }
    setOnStateChange(callback) {
        this.onStateChange = callback;
    }
    wake() {
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
    forceState(state) {
        this.clearTimers();
        this._state = state;
        this.onStateChange?.(state);
    }
    getIdleDuration() {
        return Date.now() - this.lastActivityAt;
    }
    destroy() {
        this.clearTimers();
    }
    clearTimers() {
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
exports.Scheduler = Scheduler;
//# sourceMappingURL=scheduler.js.map