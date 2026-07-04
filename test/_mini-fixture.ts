// test/_mini-fixture.ts — shared fixture for the mini Phase-2 harness tests (mini-bundle /
// mini-inject / mini-interventions): synthetic mini-collector NDJSON at HOURLY cadence, so 1500
// ticks span 62.5 days and clear the 56-day baseline guard LEGITIMATELY (no CS_ALLOW_SHORT).
// Not a test file (underscore prefix) — imported by the base-name-matched suites.

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { mulberry32, gaussian } from '../tools/calibration-envelope.js';

export const T0 = Date.parse('2026-01-01T00:00:00Z') / 1000;
export const CAD = 3600;
export const TICKS = 1500;
export const CORES = { e: ['c0', 'c1', 'c2'], p0: ['c3', 'c4', 'c5'] };

/** Synthetic mini-collector NDJSON: cluster-DVFS-correlated core freqs + diurnal package power. */
export function writeFixture(dir: string, skipTicks: Set<number> = new Set()): void {
  fs.mkdirSync(dir, { recursive: true });
  const rng = mulberry32(42);
  const rows: string[] = [];
  for (let k = 0; k < TICKS; k++) {
    if (skipTicks.has(k)) continue;
    const t = T0 + k * CAD;
    const diurnal = Math.sin((2 * Math.PI * k) / 24);
    const eMhz = 1400 + 300 * diurnal + 50 * gaussian(rng);
    const pMhz = 3200 + 500 * diurnal + 80 * gaussian(rng);
    const row: Record<string, number> = { t, e_mhz: eMhz, p0_mhz: pMhz, combined_w: 8 + 4 * diurnal + gaussian(rng) };
    for (const c of CORES.e) { row[`${c}_mhz`] = eMhz + 20 * gaussian(rng); row[`${c}_res`] = 30 + 10 * diurnal + 3 * gaussian(rng); }
    for (const c of CORES.p0) { row[`${c}_mhz`] = pMhz + 30 * gaussian(rng); row[`${c}_res`] = 15 + 8 * diurnal + 3 * gaussian(rng); }
    rows.push(JSON.stringify(row));
  }
  fs.writeFileSync(path.join(dir, '2026-01-01.ndjson'), rows.join('\n') + '\n');
}

export const tmp = (name: string): string => fs.mkdtempSync(path.join(os.tmpdir(), name + '-'));
