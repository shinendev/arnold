import Database from 'better-sqlite3';
import path from 'path';

export class ArnoldDB {
  private db: Database.Database;

  constructor(dbPath: string) {
    const resolvedPath = path.resolve(dbPath);
    this.db = new Database(resolvedPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
    this.initialize();
  }

  private initialize(): void {
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

  get raw(): Database.Database {
    return this.db;
  }

  setState(key: string, value: string): void {
    this.db.prepare(
      'INSERT OR REPLACE INTO arnold_state (key, value) VALUES (?, ?)'
    ).run(key, value);
  }

  getState(key: string): string | undefined {
    const row = this.db.prepare(
      'SELECT value FROM arnold_state WHERE key = ?'
    ).get(key) as { value: string } | undefined;
    return row?.value;
  }

  close(): void {
    this.db.close();
  }
}
