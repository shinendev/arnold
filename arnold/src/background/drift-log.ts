import { ArnoldDB } from '../db/sqlite';
import { DriftLogEntry } from '../types';

interface DriftLogRow {
  id: string;
  timestamp: number;
  phase: string;
  input_summary: string | null;
  output_summary: string | null;
  fact_ids: string;
  insight_generated: number;
  insight_id: string | null;
}

function rowToEntry(row: DriftLogRow): DriftLogEntry {
  return {
    id: row.id,
    timestamp: row.timestamp,
    phase: row.phase as DriftLogEntry['phase'],
    input: row.input_summary || '',
    output: row.output_summary || '',
    factIds: JSON.parse(row.fact_ids || '[]'),
    insightGenerated: row.insight_generated === 1,
    insightId: row.insight_id ?? undefined,
  };
}

export class DriftLog {
  constructor(private db: ArnoldDB) {}

  log(entry: DriftLogEntry): void {
    this.db.raw.prepare(`
      INSERT INTO drift_log (id, timestamp, phase, input_summary, output_summary, fact_ids, insight_generated, insight_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      entry.id,
      entry.timestamp,
      entry.phase,
      entry.input,
      entry.output,
      JSON.stringify(entry.factIds),
      entry.insightGenerated ? 1 : 0,
      entry.insightId ?? null,
    );
  }

  logBatch(entries: DriftLogEntry[]): void {
    const stmt = this.db.raw.prepare(`
      INSERT INTO drift_log (id, timestamp, phase, input_summary, output_summary, fact_ids, insight_generated, insight_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const transaction = this.db.raw.transaction((items: DriftLogEntry[]) => {
      for (const entry of items) {
        stmt.run(
          entry.id,
          entry.timestamp,
          entry.phase,
          entry.input,
          entry.output,
          JSON.stringify(entry.factIds),
          entry.insightGenerated ? 1 : 0,
          entry.insightId ?? null,
        );
      }
    });

    transaction(entries);
  }

  getRecent(limit = 50): DriftLogEntry[] {
    const rows = this.db.raw.prepare(
      'SELECT * FROM drift_log ORDER BY timestamp DESC LIMIT ?'
    ).all(limit) as DriftLogRow[];
    return rows.map(rowToEntry);
  }

  getByPhase(phase: DriftLogEntry['phase'], limit = 20): DriftLogEntry[] {
    const rows = this.db.raw.prepare(
      'SELECT * FROM drift_log WHERE phase = ? ORDER BY timestamp DESC LIMIT ?'
    ).all(phase, limit) as DriftLogRow[];
    return rows.map(rowToEntry);
  }

  getInsightEntries(limit = 20): DriftLogEntry[] {
    const rows = this.db.raw.prepare(
      'SELECT * FROM drift_log WHERE insight_generated = 1 ORDER BY timestamp DESC LIMIT ?'
    ).all(limit) as DriftLogRow[];
    return rows.map(rowToEntry);
  }

  count(): number {
    const row = this.db.raw.prepare(
      'SELECT COUNT(*) as count FROM drift_log'
    ).get() as { count: number };
    return row.count;
  }
}
