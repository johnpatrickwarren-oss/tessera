// test/gwdg-comparability.test.ts — the real-A100 within-node peer-comparability measurement
// (tools/gwdg-comparability.ts) that calibrates the peer-availability model to reality. The real GWDG
// dataset is not committed, so this drives the loader+measurement over a SYNTHETIC fixture in the GWDG
// tidy-CSV format: two GPUs sharing a common-mode (comparable → low κ) + one independent (high κ).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { runGwdgComparability } from '../tools/gwdg-comparability.js';

/** Write a GWDG-format dataset: telemetry/<node>_<future-date>_test_tidy.csv (future date ⇒ all healthy).
 *  gpu0,gpu1 share a slow common-mode (comparable); gpu2 is independent (non-comparable). */
function writeFixture(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gwdg-fix-'));
  fs.mkdirSync(path.join(dir, 'telemetry'));
  const rows: string[] = ['timeUtc,node,metric,value,gpu,device'];
  const N = 160, t0 = Date.UTC(2090, 0, 1); // far future → before any incident-date split
  let cm = 50;
  for (let i = 0; i < N; i++) {
    cm += Math.sin(i / 9) * 0.5; // shared common-mode
    const ts = new Date(t0 + i * 600_000).toISOString().replace('T', ' ').slice(0, 19);
    const s0 = cm + Math.sin(i * 1.3) * 0.2;             // gpu0: common-mode + tiny idio
    const s1 = cm + Math.cos(i * 1.7) * 0.2;             // gpu1: SAME common-mode + tiny idio → comparable to gpu0
    const s2 = 50 + Math.sin(i / 3.1) * 8;               // gpu2: independent → not comparable
    for (const [g, v] of [['0', s0], ['1', s1], ['2', s2]] as const) {
      rows.push(`${ts},node1,DCGM_FI_DEV_GPU_TEMP,${(v as number).toFixed(3)},${g},nvidia${g}`);
    }
  }
  fs.writeFileSync(path.join(dir, 'telemetry', 'node1_2099-01-01_gpu-error_tidy.csv'), rows.join('\n') + '\n');
  return dir;
}

test('gwdg-comparability runs over the tidy-CSV format and reports per-counter κ', () => {
  const dir = writeFixture();
  const r = runGwdgComparability(dir);
  assert.equal(r.files, 1);
  const temp = r.stats.find((s) => s.counter === 'gpu_temp_c');
  assert.ok(temp && temp.nUnits >= 3, 'measured a best-peer κ for each of the 3 GPUs');
  assert.ok(Number.isFinite(temp!.medianKappa), 'median κ is finite');
});

test('a shared-common-mode GPU pair is detected as comparable (low best-peer κ); an independent one is not', () => {
  const dir = writeFixture();
  const r = runGwdgComparability(dir);
  const temp = r.stats.find((s) => s.counter === 'gpu_temp_c')!;
  // gpu0 & gpu1 each find the other as a κ≪1 peer; gpu2 has no comparable peer → at least 2/3 comparable.
  assert.ok(temp.fracComparable >= 2 / 3 - 1e-9, `≥2 of 3 GPUs have a comparable peer (got ${temp.fracComparable.toFixed(3)})`);
  assert.ok(temp.commonModeFrac > 0.5, `the comparable pair cancels most variance (common-mode frac ${temp.commonModeFrac.toFixed(3)})`);
});
