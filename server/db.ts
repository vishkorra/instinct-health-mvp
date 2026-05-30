import { mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { scenarios } from '../src/shared/scenarios';

const require = createRequire(import.meta.url);
const { DatabaseSync } = require('node:sqlite') as typeof import('node:sqlite');

export interface InstinctDb {
  getStep: (scenarioId: string) => number;
  setStep: (scenarioId: string, currentStep: number) => void;
  resetStep: (scenarioId: string) => void;
  close: () => void;
}

export function createDb(dbPath = resolve(process.cwd(), 'data', 'instinct.sqlite')): InstinctDb {
  if (dbPath !== ':memory:') {
    mkdirSync(dirname(dbPath), { recursive: true });
  }

  const db = new DatabaseSync(dbPath);

  db.exec(`
    CREATE TABLE IF NOT EXISTS case_state (
      scenario_id TEXT PRIMARY KEY,
      current_step INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL
    );
  `);

  const seed = db.prepare(`
    INSERT OR IGNORE INTO case_state (scenario_id, current_step, updated_at)
    VALUES (?, 0, ?)
  `);

  for (const scenario of scenarios) {
    seed.run(scenario.id, new Date().toISOString());
  }

  return {
    getStep(scenarioId: string) {
      const row = db
        .prepare('SELECT current_step FROM case_state WHERE scenario_id = ?')
        .get(scenarioId) as { current_step: number } | undefined;
      return row?.current_step ?? 0;
    },
    setStep(scenarioId: string, currentStep: number) {
      db.prepare(
        `INSERT INTO case_state (scenario_id, current_step, updated_at)
         VALUES (?, ?, ?)
         ON CONFLICT(scenario_id) DO UPDATE SET current_step = excluded.current_step, updated_at = excluded.updated_at`
      ).run(scenarioId, currentStep, new Date().toISOString());
    },
    resetStep(scenarioId: string) {
      this.setStep(scenarioId, 0);
    },
    close() {
      db.close();
    }
  };
}
