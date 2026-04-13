import { ArnoldDB } from '../db/sqlite';
import { DriftLogEntry } from '../types';
export declare class DriftLog {
    private db;
    constructor(db: ArnoldDB);
    log(entry: DriftLogEntry): void;
    logBatch(entries: DriftLogEntry[]): void;
    getRecent(limit?: number): DriftLogEntry[];
    getByPhase(phase: DriftLogEntry['phase'], limit?: number): DriftLogEntry[];
    getInsightEntries(limit?: number): DriftLogEntry[];
    count(): number;
}
//# sourceMappingURL=drift-log.d.ts.map