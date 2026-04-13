import Database from 'better-sqlite3';
export declare class ArnoldDB {
    private db;
    constructor(dbPath: string);
    private initialize;
    get raw(): Database.Database;
    setState(key: string, value: string): void;
    getState(key: string): string | undefined;
    close(): void;
}
//# sourceMappingURL=sqlite.d.ts.map