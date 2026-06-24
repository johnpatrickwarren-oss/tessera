// test/fleet-relative-capstone.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runCapstone, genFleet, DEFAULT_MFAIL, FONSET } from '../tools/fleet-relative-capstone.js';
import { mulberry32, scramble } from '../tools/calibration-envelope.js';

test('genFleet: failed shards track the fleet pre-onset, diverge above it post-onset', () => {
  const { X, failed } = genFleet(mulberry32(scramble(1)), DEFAULT_MFAIL);
  assert.equal(failed.filter(Boolean).length, DEFAULT_MFAIL);
  const med = (t: number) => { const c = X.map((r) => r[t]).sort((a, b) => a - b); return c[c.length >> 1]; };
  assert.ok(Math.abs(X[0][FONSET - 50] - med(FONSET - 50)) < 20, 'failed shard tracks fleet pre-onset');
  assert.ok(X[0][FONSET + 100] - med(FONSET + 100) > 5, 'failed shard above the fleet post-onset');
});

test('CAPSTONE: fleet-relative SEPARATES faults (high power) but does NOT control FDR (the honest negative)', () => {
  const r = runCapstone();
  const q10 = r.by_q.find((x) => x.q === 0.1)!;
  assert.ok(q10.rel_power >= 0.9, `fleet-relative must separate faults (power=${q10.rel_power})`);
  assert.ok(q10.rel_fdp > 0.3, `fleet-relative does NOT control FDR at the default load (FDP=${q10.rel_fdp})`);
});

test('the residual e-value is VALID on a null fleet — FDR fails from fault-contamination, not an invalid e-value', () => {
  const r = runCapstone();
  assert.ok(r.null_residual_validity.p_ge_100 <= 0.02, `null-fleet residual must honor α (P(e≥1/α)=${r.null_residual_validity.p_ge_100})`);
  assert.ok(r.null_residual_validity.p_ge_10 <= 0.1, `null-fleet residual not heavy-tailed (P(e≥10)=${r.null_residual_validity.p_ge_10})`);
});

test('FDR control degrades with the fault fraction (contamination mechanism)', () => {
  const r = runCapstone();
  const lo = r.by_fault_fraction.find((x) => x.mfail === 2)!;
  const hi = r.by_fault_fraction.find((x) => x.mfail === 10)!;
  assert.ok(hi.rel_fdp > lo.rel_fdp + 0.2, `more faults must inflate FDP (mfail2=${lo.rel_fdp} vs mfail10=${hi.rel_fdp})`);
});
