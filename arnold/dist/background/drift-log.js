"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DriftLog = void 0;
function rowToEntry(row) {
    return {
        id: row.id,
        timestamp: row.timestamp,
        phase: row.phase,
        input: row.input_summary || '',
        output: row.output_summary || '',
        factIds: JSON.parse(row.fact_ids || '[]'),
        insightGenerated: row.insight_generated === 1,
        insightId: row.insight_id ?? undefined,
    };
}
class DriftLog {
    db;
    constructor(db) {
        this.db = db;
    }
    log(entry) {
        this.db.raw.prepare(`
      INSERT INTO drift_log (id, timestamp, phase, input_summary, output_summary, fact_ids, insight_generated, insight_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(entry.id, entry.timestamp, entry.phase, entry.input, entry.output, JSON.stringify(entry.factIds), entry.insightGenerated ? 1 : 0, entry.insightId ?? null);
    }
    logBatch(entries) {
        const stmt = this.db.raw.prepare(`
      INSERT INTO drift_log (id, timestamp, phase, input_summary, output_summary, fact_ids, insight_generated, insight_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
        const transaction = this.db.raw.transaction((items) => {
            for (const entry of items) {
                stmt.run(entry.id, entry.timestamp, entry.phase, entry.input, entry.output, JSON.stringify(entry.factIds), entry.insightGenerated ? 1 : 0, entry.insightId ?? null);
            }
        });
        transaction(entries);
    }
    getRecent(limit = 50) {
        const rows = this.db.raw.prepare('SELECT * FROM drift_log ORDER BY timestamp DESC LIMIT ?').all(limit);
        return rows.map(rowToEntry);
    }
    getByPhase(phase, limit = 20) {
        const rows = this.db.raw.prepare('SELECT * FROM drift_log WHERE phase = ? ORDER BY timestamp DESC LIMIT ?').all(phase, limit);
        return rows.map(rowToEntry);
    }
    getInsightEntries(limit = 20) {
        const rows = this.db.raw.prepare('SELECT * FROM drift_log WHERE insight_generated = 1 ORDER BY timestamp DESC LIMIT ?').all(limit);
        return rows.map(rowToEntry);
    }
    count() {
        const row = this.db.raw.prepare('SELECT COUNT(*) as count FROM drift_log').get();
        return row.count;
    }
}
exports.DriftLog = DriftLog;
//# sourceMappingURL=drift-log.js.map