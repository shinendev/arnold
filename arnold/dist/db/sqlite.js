"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ArnoldDB = void 0;
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const path_1 = __importDefault(require("path"));
class ArnoldDB {
    db;
    constructor(dbPath) {
        const resolvedPath = path_1.default.resolve(dbPath);
        this.db = new better_sqlite3_1.default(resolvedPath);
        this.db.pragma('journal_mode = WAL');
        this.db.pragma('foreign_keys = ON');
        this.initialize();
    }
    initialize() {
        this.db.exec(`
      CREATE TABLE IF NOT EXISTS facts (
        id TEXT PRIMARY KEY,
        content TEXT NOT NULL,
        embedding BLOB,
        source TEXT NOT NULL,
        source_conversation_id TEXT,
        activation_weight REAL DEFAULT 1.0,
        recall_count INTEGER DEFAULT 0,
        is_permanent INTEGER DEFAULT 0,
        tags TEXT DEFAULT '[]',
        created_at INTEGER NOT NULL,
        last_accessed_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS insights (
        id TEXT PRIMARY KEY,
        content TEXT NOT NULL,
        fact_ids TEXT NOT NULL,
        confidence REAL NOT NULL,
        type TEXT NOT NULL,
        embedding BLOB,
        created_at INTEGER NOT NULL,
        delivered INTEGER DEFAULT 0,
        delivered_at INTEGER
      );

      CREATE TABLE IF NOT EXISTS drift_log (
        id TEXT PRIMARY KEY,
        timestamp INTEGER NOT NULL,
        phase TEXT NOT NULL,
        input_summary TEXT,
        output_summary TEXT,
        fact_ids TEXT DEFAULT '[]',
        insight_generated INTEGER DEFAULT 0,
        insight_id TEXT
      );

      CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY,
        started_at INTEGER NOT NULL,
        last_message_at INTEGER NOT NULL,
        message_count INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS unresolved_questions (
        id TEXT PRIMARY KEY,
        question TEXT NOT NULL,
        original_answer TEXT,
        conversation_id TEXT,
        resolved INTEGER DEFAULT 0,
        resolved_insight_id TEXT,
        created_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS arnold_state (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);
    }
    get raw() {
        return this.db;
    }
    setState(key, value) {
        this.db.prepare('INSERT OR REPLACE INTO arnold_state (key, value) VALUES (?, ?)').run(key, value);
    }
    getState(key) {
        const row = this.db.prepare('SELECT value FROM arnold_state WHERE key = ?').get(key);
        return row?.value;
    }
    close() {
        this.db.close();
    }
}
exports.ArnoldDB = ArnoldDB;
//# sourceMappingURL=sqlite.js.map