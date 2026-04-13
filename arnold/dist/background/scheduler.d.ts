import { ArnoldState, ArnoldConfig } from '../types';
export declare class Scheduler {
    private config;
    private _state;
    private lastActivityAt;
    private idleTimer;
    private dreamTimer;
    private onStateChange?;
    constructor(config: Pick<ArnoldConfig, 'idleThresholdMs'>);
    get state(): ArnoldState;
    setOnStateChange(callback: (state: ArnoldState) => void): void;
    wake(): void;
    forceState(state: ArnoldState): void;
    getIdleDuration(): number;
    destroy(): void;
    private clearTimers;
}
//# sourceMappingURL=scheduler.d.ts.map