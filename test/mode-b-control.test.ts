// test/mode-b-control.test.ts — the Mode B concurrent-control harness must show the ACHIEVABLE FDR
// guarantee (ADR 0019 rule 2): a SPATIAL null (paired concurrent control) controls FDR where the
// temporal per-shard null does not, and the runtime monitor + validity-class gate (#1, #2) catch a
// broken construction and demote it B→A so it cannot emit a wrong guarantee. Deterministic (seeded).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runModeBControl, genPairedFleet, DEFAULT_PARAMS } from '../tools/mode-b-control.js';
import { mulberry32, scramble } from '../tools/calibration-envelope.js';

const TRIALS = 80; // deterministic; ~2.3s

test('the SPATIAL null controls FDR where the temporal null does not', () => {
  const r = runModeBControl(DEFAULT_PARAMS, TRIALS);
  // Mode B (paired concurrent control) holds FDP at ≈ q with real power.
  assert.ok(r.modeB.mean_fdp <= 0.13, `mode B mean FDP ${r.modeB.mean_fdp} should be ≈ q=${DEFAULT_PARAMS.q}`);
  assert.ok(r.modeB.mean_power >= 0.5, `mode B power ${r.modeB.mean_power} should be substantial`);
  // The temporal per-shard null (no control) over-selects on the persistent common-mode → much worse FDP.
  assert.ok(r.temporal.mean_fdp > r.modeB.mean_fdp * 1.5, `temporal FDP ${r.temporal.mean_fdp} should ≫ mode B ${r.modeB.mean_fdp}`);
});

test('a BROKEN construction genuinely breaks FDR, and the monitor + gate catch it', () => {
  const r = runModeBControl(DEFAULT_PARAMS, TRIALS);
  const b = r.broken_construction;
  // Ungated (ignoring the monitor) the integrated-drift control breaks FDR badly.
  assert.ok(b.ungated_mean_fdp >= 0.4, `broken ungated FDP ${b.ungated_mean_fdp} should be ≫ q`);
  // The composed calibration monitor (#2) + whiteness check revokes a majority of broken trials...
  assert.ok(b.monitor_revoked_frac >= 0.5, `monitor should revoke a majority, got ${b.monitor_revoked_frac}`);
  assert.equal(b.demoted_to_mode_a_frac, b.monitor_revoked_frac, 'a revoked monitor must demote to Mode A');
  // ...so the GATED (emitted) FDP is materially lower than the ungated wrong guarantee.
  assert.ok(b.gated_mean_fdp < b.ungated_mean_fdp, `gating should reduce emitted FDP (${b.gated_mean_fdp} < ${b.ungated_mean_fdp})`);
});

test('the shared-control contrast cancels the common-mode exactly; the broken one does not', () => {
  const p = DEFAULT_PARAMS;
  const shared = genPairedFleet(mulberry32(scramble(1)), p, true);
  const broken = genPairedFleet(mulberry32(scramble(1)), p, false);
  // For a HEALTHY shard the shared contrast is pure idiosyncratic noise (bounded variance); the broken
  // contrast carries an integrated random walk (variance grows over the horizon).
  const variance = (xs: number[]): number => { const m = xs.reduce((a, b) => a + b, 0) / xs.length; return xs.reduce((a, b) => a + (b - m) ** 2, 0) / xs.length; };
  const i = p.MFAIL + 5; // a healthy shard
  const dShared = shared.treat[i].map((x, t) => x - shared.ctrl[i][t]);
  const dBroken = broken.treat[i].map((x, t) => x - broken.ctrl[i][t]);
  assert.ok(variance(dBroken) > variance(dShared) * 3, `broken contrast variance ${variance(dBroken)} should ≫ shared ${variance(dShared)}`);
});
