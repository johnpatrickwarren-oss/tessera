import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runSweep, boundaries, offsetSdForIcc, SIGMA_EXEC, SWEEP_TARGETS } from '../tools/icc-sweep.js';

// Small enough for the suite; the committed table in
// research/2026-07-26-icc-sweep.md is seeds=4, nUnits=2016, T=160.
const FAST = { seeds: 1, nUnits: 504, horizon: 80 } as const;

test('offsetSdForIcc inverts the ICC definition against the gen-0 noise scale', () => {
  // ICC = θ²/(1+θ²) with θ = unitOffsetSd / σ_exec, σ_exec = sqrt(0.008² + 0.005²).
  assert.ok(Math.abs(SIGMA_EXEC - 0.009434) < 1e-5, `σ_exec ${SIGMA_EXEC}`);
  for (const icc of [0.02, 0.06, 0.12]) {
    const theta = offsetSdForIcc(icc) / SIGMA_EXEC;
    assert.ok(Math.abs(theta ** 2 / (1 + theta ** 2) - icc) < 1e-9, `round-trip at ${icc}`);
  }
  // H15's shipped knob should land near the top of the sweep band (it measures 12.40%).
  assert.ok(Math.abs(offsetSdForIcc(0.124) - 0.003578) < 2e-4, 'grid top ≈ H15');
});

test('the measured ICC tracks the target and is monotone — the x-axis is real', () => {
  const cells = runSweep({ ...FAST, targets: [0.015, 0.06, 0.124] });
  for (const c of cells) {
    // measured lands slightly ABOVE target: the other BASE channels (interference, diurnal)
    // contribute a floor the knob does not account for.
    assert.ok(c.icc >= c.targetIcc * 0.95 && c.icc <= c.targetIcc * 1.25,
      `target ${c.targetIcc} → measured ${c.icc}`);
  }
  for (let i = 1; i < cells.length; i++) {
    assert.ok(cells[i].icc > cells[i - 1].icc, 'measured ICC must increase along the grid');
  }
});

test('paging grows with ICC on BOTH pipelines', () => {
  const cells = runSweep({ ...FAST, targets: [0.015, 0.124] });
  const [lo, hi] = cells;
  assert.ok(hi.accumulatorPages > lo.accumulatorPages, 'accumulator pages must grow with ICC');
  assert.ok(hi.loopPages > lo.loopPages, 'loop pages must grow with ICC');
  assert.equal(lo.accumulatorPages, 0, 'at the low end the accumulator should be silent');
});

test('MAIN FINDING: the boundary is FAR above the published 1.5% target', () => {
  // Committed full-scale result: clean through ICC 6.32% (accumulator 1.5 pages vs budget 2.016),
  // first breach at 8.36% (4.0 pages). The published verified-safe figure of ≲1.5% is therefore
  // conservative by roughly 4-5×, which is the difference between an expensive block-key
  // enrichment programme and a cheap one.
  const cells = runSweep({ ...FAST, targets: [0.015, 0.025, 0.04] });
  for (const c of cells) {
    assert.ok(!c.accumulatorOver && !c.loopOver,
      `ICC ${c.icc} must sit inside the Ville budget on both paths (acc ${c.accumulatorPages}, loop ${c.loopPages})`);
  }
  assert.equal(boundaries(cells).accumulator, null, 'no breach below ~4% ICC');
  assert.equal(boundaries(cells).loop, null, 'no breach below ~4% ICC');
});

test('PER-PATH BUDGETING IS NOT WARRANTED — the two pipelines breach in the same cell', () => {
  // This closes the per-path question opened by N9, and closes it NEGATIVELY. The loop path does
  // page less at sub-boundary ICC (0.75 vs 1.5 at 6.32%; 2.75 vs 4.0 at 8.36%), but it crosses the
  // budget in the SAME cell, and by 12.83% it is marginally WORSE (15.5 vs 14.5).
  //
  // N9 predicted exactly this and the mechanism is its own: the mixture's attenuation collapses as
  // δ → δ₀, and the units that page are by definition those in the tail with δ ≳ δ₀. The mixture
  // buys margin precisely where no unit is paging anyway. A single global ICC budget is correct.
  const cells = runSweep({ ...FAST, targets: [0.08, 0.10, 0.124] });
  for (const c of cells) {
    assert.equal(c.accumulatorOver, c.loopOver,
      `ICC ${c.icc}: the two pipelines must agree on whether the budget is breached ` +
      `(acc ${c.accumulatorPages}, loop ${c.loopPages}) — if they diverge, per-path budgeting is back on`);
  }
});

test('SWEEP_TARGETS spans the band the design target was uncertain over', () => {
  assert.ok(SWEEP_TARGETS[0] <= 0.015, 'must start at the known-clean anchor (H16, 1.49%)');
  assert.ok(SWEEP_TARGETS[SWEEP_TARGETS.length - 1] >= 0.124, 'must reach the known-broken anchor (H15, 12.40%)');
  assert.ok(SWEEP_TARGETS.length >= 6, 'enough interior points to bracket a boundary');
});
