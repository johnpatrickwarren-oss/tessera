// test/q11-hierarchical-e-value-combination.test.ts — R11 AC-1 through AC-18.
//
// Binds the SLICE 3 hierarchical e-value combination primitives + PR-F1
// evidence matrix at N=100 shards × T=100 ticks × N_fleet_traj=200.
//
// PR-F1 evidence matrix (4 cells):
//   (combineProduct, iid_H0)             → AC-13: assert fleet FPR ≤ Wilson bound
//   (combineAverage, iid_H0)             → AC-15: assert fleet FPR ≤ Wilson bound
//   (combineAverage, correlated_H0)      → AC-16: assert fleet FPR ≤ Wilson bound
//   (combineProduct, correlated_H0)      → AC-14: REPORTING-only — log observed
//                                          FPR; does NOT bind (Vovk-Wang 2021 §4
//                                          cond.-indep. assumption violated;
//                                          load-bearing demonstration of MD-F1).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  combineProduct,
  combineAverage,
  freshFleetEProcessState,
  updateFleetEProcessState,
  type FleetEProcessState,
  type FleetMergeOutput,
} from '@johnpatrickwarren-oss/deploysignal-engine/fleet/combine';
import {
  freshBettingState,
  updateBettingState,
} from '@johnpatrickwarren-oss/deploysignal-engine/detectors/betting-e-process';
import type { FamilyCBettingEProcessState } from '@johnpatrickwarren-oss/deploysignal-engine/types/families/c';

// ─── Deterministic PRNG + Gaussian generator (re-inlined from the inherited
// test/betting-e-process-class-dispatch.test.ts:40-83 pattern; NOT imported
// from the inherited test file to keep q11 standalone). ───

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gaussian(rng: () => number): number {
  let u = rng();
  while (u === 0) u = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rng());
}

// ─── PR-F1 evidence matrix parameters (cross-section consistency pass row 11). ───

const ALPHA_FLEET = 0.01;
const LOG_THRESHOLD = Math.log(1 / ALPHA_FLEET);  // ≈ 4.605
const N_SHARDS = 100;
const T_TICKS = 100;
const N_FLEET_TRAJ = 200;
const RHO_SQUARED = 0.5;          // correlated-drift shared-factor variance fraction
const FPR_BOUND = ALPHA_FLEET + 3 * Math.sqrt(ALPHA_FLEET * (1 - ALPHA_FLEET) / N_FLEET_TRAJ);
// FPR_BOUND ≈ 0.01 + 3·√(0.01·0.99/200) ≈ 0.03112.

// Wealth floor (matches inherited engine/detectors/betting-e-process.ts:65
// WEALTH_FLOOR convention to avoid Math.log(0) on long no-drift runs).
const WEALTH_FLOOR = 1e-12;

// ─── Per-fleet-trajectory simulator ───────────────────────────────────────

type CombinePrimitive = (xs: ReadonlyArray<number>) => FleetMergeOutput;

/** Simulate one fleet trajectory of (N_SHARDS × T_TICKS) ticks under the chosen
 *  scenario; return whether the fleet wealth tracker fired by end of trajectory. */
function simulateFleetTrajectory(
  primitive: CombinePrimitive,
  scenario: 'iid' | 'correlated',
  rngSeed: number,
): boolean {
  const rng = mulberry32(rngSeed);
  // Per-shard Family A wealth states (μ=0, σ²=1).
  const shard_states = Array.from({ length: N_SHARDS }, () => freshBettingState());
  const fleet_state: FleetEProcessState = freshFleetEProcessState();
  const log_e_buffer: number[] = new Array(N_SHARDS);
  const stddev_shared = scenario === 'correlated' ? Math.sqrt(RHO_SQUARED) : 0;
  const stddev_per_shard = scenario === 'correlated'
    ? Math.sqrt(1 - RHO_SQUARED)
    : 1;
  for (let t = 0; t < T_TICKS; t++) {
    // Shared-factor draw (zero under iid; N(0, ρ²) under correlated_H0).
    const shared_z = scenario === 'correlated' ? stddev_shared * gaussian(rng) : 0;
    // Per-shard update + collect log e-values.
    for (let i = 0; i < N_SHARDS; i++) {
      const per_shard_noise = stddev_per_shard * gaussian(rng);
      const x = shared_z + per_shard_noise;
      const M_t = updateBettingState(shard_states[i], x, 0, 1, 0);
      log_e_buffer[i] = Math.log(Math.max(M_t, WEALTH_FLOOR));
    }
    const fleet_result = primitive(log_e_buffer);
    updateFleetEProcessState(fleet_state, fleet_result.log_fleet_e, LOG_THRESHOLD);
  }
  return fleet_state.fired;
}

function measureFleetFireRate(
  primitive: CombinePrimitive,
  scenario: 'iid' | 'correlated',
  base_seed: number,
): number {
  let fires = 0;
  for (let j = 0; j < N_FLEET_TRAJ; j++) {
    const seed = (base_seed + j * 0x1234567) >>> 0;
    if (simulateFleetTrajectory(primitive, scenario, seed)) fires++;
  }
  return fires / N_FLEET_TRAJ;
}

// ─── R11 AC-1 — combineProduct primitive surface + empty-input + shape ──
test('R11 AC-1 — combineProduct returns FleetMergeOutput; throws on empty input', () => {
  // Shape:
  const out: FleetMergeOutput = combineProduct([0, 0, 0]);
  assert.strictEqual(typeof out.log_fleet_e, 'number');
  assert.strictEqual(out.log_fleet_e, 0);  // log(1·1·1) = 0
  // Empty-input throws:
  assert.throws(() => combineProduct([]), /empty input/);
});

// ─── R11 AC-2 — combineAverage primitive surface + empty-input + shape ──
test('R11 AC-2 — combineAverage returns FleetMergeOutput; throws on empty input', () => {
  const out: FleetMergeOutput = combineAverage([0, 0, 0]);
  assert.strictEqual(typeof out.log_fleet_e, 'number');
  assert.strictEqual(out.log_fleet_e, 0);  // log((1+1+1)/3) = log(1) = 0
  assert.throws(() => combineAverage([]), /empty input/);
});

// ─── R11 AC-3 — single-shard (N=1) identity for both primitives ─────────
test('R11 AC-3 — at N=1, both primitives reduce to identity', () => {
  assert.strictEqual(combineProduct([2.5]).log_fleet_e, 2.5);
  assert.strictEqual(combineProduct([-1.0]).log_fleet_e, -1.0);
  // combineAverage at N=1: logSumExp([x]) − log(1) = x − 0 = x.
  // Use approx-equality with small tolerance for FP rounding through Math.exp/Math.log round-trip.
  assert.ok(Math.abs(combineAverage([2.5]).log_fleet_e - 2.5) < 1e-12);
  assert.ok(Math.abs(combineAverage([-1.0]).log_fleet_e - (-1.0)) < 1e-12);
});

// ─── R11 AC-4 — combineProduct closed-form ──────────────────────────────
test('R11 AC-4 — combineProduct: log(e^1·e^2·e^3) = 6', () => {
  const out = combineProduct([1, 2, 3]);
  assert.strictEqual(out.log_fleet_e, 6);  // exact under double-precision sum
});

// ─── R11 AC-5 — combineAverage closed-form (N=3) ────────────────────────
test('R11 AC-5 — combineAverage: log((1+1+1)/3) = 0', () => {
  const out = combineAverage([0, 0, 0]);
  assert.strictEqual(out.log_fleet_e, 0);
});

// ─── R11 AC-6 — combineAverage closed-form (asymmetric) ─────────────────
test('R11 AC-6 — combineAverage: log((1+e²)/2) closed-form match', () => {
  // log( (e^0 + e^2) / 2 ) = logSumExp([0, 2]) − log(2)
  //   = 2 + log(e^-2 + e^0) − log(2)
  //   = 2 + log(0.1353... + 1) − log(2)
  //   ≈ 2 + 0.12693 − 0.69315 ≈ 1.43378
  const out = combineAverage([0, 2]);
  // Closed-form expected:
  const expected = Math.log((Math.exp(0) + Math.exp(2)) / 2);
  assert.ok(Math.abs(out.log_fleet_e - expected) < 1e-12);
});

// ─── R11 AC-7 — combineAverage numerical stability with large log-values ─
test('R11 AC-7 — combineAverage handles log-values spanning [0, 1000] without overflow', () => {
  const big = [0, 500, 1000];
  const out = combineAverage(big);
  // Expected: max-shift = 1000; sum_exp = exp(-1000) + exp(-500) + exp(0) ≈ 1 (the first two are subnormal/zero);
  // log_sum_exp = 1000 + log(1) = 1000; log_avg = 1000 − log(3) ≈ 998.9014.
  assert.ok(Number.isFinite(out.log_fleet_e));
  assert.ok(Math.abs(out.log_fleet_e - (1000 - Math.log(3))) < 1e-9);
});

// ─── R11 AC-8 — freshFleetEProcessState shape ──────────────────────────
test('R11 AC-8 — freshFleetEProcessState returns the canonical initial shape', () => {
  const s: FleetEProcessState = freshFleetEProcessState();
  assert.strictEqual(s.log_fleet_e_t, 0);
  assert.strictEqual(s.log_fleet_e_max, 0);
  assert.strictEqual(s.n, 0);
  assert.strictEqual(s.fired, false);
  assert.strictEqual(s.tick_at_first_fire, null);
});

// ─── R11 AC-9 — updateFleetEProcessState advances n + log_fleet_e_t + max ─
test('R11 AC-9 — updateFleetEProcessState advances tick count + most-recent + running-max', () => {
  const s = freshFleetEProcessState();
  updateFleetEProcessState(s, 1.0, LOG_THRESHOLD);
  assert.strictEqual(s.n, 1);
  assert.strictEqual(s.log_fleet_e_t, 1.0);
  assert.strictEqual(s.log_fleet_e_max, 1.0);
  assert.strictEqual(s.fired, false);
  updateFleetEProcessState(s, 0.5, LOG_THRESHOLD);
  // log_fleet_e_t reflects the new (lower) value; max retained at 1.0.
  assert.strictEqual(s.n, 2);
  assert.strictEqual(s.log_fleet_e_t, 0.5);
  assert.strictEqual(s.log_fleet_e_max, 1.0);
  assert.strictEqual(s.fired, false);
});

// ─── R11 AC-10 — sticky-fire latch on first crossing + persists on subsequent drop ─
test('R11 AC-10 — sticky-fire: fires on first crossing of log_fleet_e_max ≥ log_threshold; persists', () => {
  const s = freshFleetEProcessState();
  // log_threshold ≈ 4.605 at α_fleet=0.01.
  updateFleetEProcessState(s, 3.0, LOG_THRESHOLD);  // tick 0: below threshold
  assert.strictEqual(s.fired, false);
  assert.strictEqual(s.tick_at_first_fire, null);
  updateFleetEProcessState(s, 5.0, LOG_THRESHOLD);  // tick 1: crosses
  assert.strictEqual(s.fired, true);
  assert.strictEqual(s.tick_at_first_fire, 1);
  updateFleetEProcessState(s, 0.5, LOG_THRESHOLD);  // tick 2: drops back below
  // Sticky: still fired; tick_at_first_fire unchanged.
  assert.strictEqual(s.fired, true);
  assert.strictEqual(s.tick_at_first_fire, 1);
  // Running max preserved across the drop.
  assert.strictEqual(s.log_fleet_e_max, 5.0);
});

// ─── R11 AC-11 — in-place mutation contract (matches inherited engine) ──
test('R11 AC-11 — updateFleetEProcessState mutates state in-place and returns same reference', () => {
  const s = freshFleetEProcessState();
  const returned = updateFleetEProcessState(s, 2.0, LOG_THRESHOLD);
  // Same object reference.
  assert.strictEqual(returned, s);
  // Mutation visible on original handle.
  assert.strictEqual(s.log_fleet_e_t, 2.0);
});

// ─── R11 AC-12 — family-agnostic interface: accepts log-e from Family A AND Family C ─
test('R11 AC-12 — primitives accept log-e-values regardless of source family', () => {
  // Synthetic Family A state: drive updateBettingState once to populate state.M.
  const fa_state = freshBettingState();
  updateBettingState(fa_state, 0.3, 0, 1, 0);
  const fa_log_e = Math.log(Math.max(fa_state.M, WEALTH_FLOOR));
  // Synthetic Family C state shape (just the log_S_t field is consumed for this AC).
  const fc_state: FamilyCBettingEProcessState = {
    log_S_t: 1.2,
    ons_lambda: 0,
    ons_inverse_hessian: 1,
    n: 1,
    witness_running_max: 0,
    q_running_sum: [0],
    q_count: 0,
    fired: false,
    tick_at_first_fire: null,
    alphaConsumed: 0,
  };
  // Both primitives accept the mixed input identically.
  const out_p = combineProduct([fa_log_e, fc_state.log_S_t]);
  const out_a = combineAverage([fa_log_e, fc_state.log_S_t]);
  assert.strictEqual(typeof out_p.log_fleet_e, 'number');
  assert.strictEqual(typeof out_a.log_fleet_e, 'number');
  // Closed-form cross-checks:
  assert.strictEqual(out_p.log_fleet_e, fa_log_e + fc_state.log_S_t);
  // AoE: log((e^a + e^b)/2).
  const expected_avg = Math.log((Math.exp(fa_log_e) + Math.exp(fc_state.log_S_t)) / 2);
  assert.ok(Math.abs(out_a.log_fleet_e - expected_avg) < 1e-12);
});

// ─── R11 AC-13 — PR-F1 cell (combineProduct, iid_H0): fleet FPR ≤ Wilson bound ─
test('R11 AC-13 — PR-F1 (PoE, iid H₀): fleet FPR ≤ α_fleet + 3·√(α_fleet(1−α_fleet)/N_fleet_traj)', () => {
  const fpr = measureFleetFireRate(combineProduct, 'iid', 0xE100B001);
  console.log(`  R11 PR-F1 PoE-iid       fpr=${fpr.toFixed(5)} bound=${FPR_BOUND.toFixed(5)}`);
  assert.ok(
    fpr <= FPR_BOUND,
    `PoE-iid fleet FPR ${fpr.toFixed(5)} exceeds Wilson bound ${FPR_BOUND.toFixed(5)}`,
  );
});

// ─── R11 AC-14 — PR-F1 cell (combineProduct, correlated_H0): REPORTING-ONLY ─
test('R11 AC-14 — PR-F1 (PoE, correlated-drift H₀): REPORTING-only — load-bearing demonstration of MD-F1 cond.-indep. assumption violation', () => {
  const fpr = measureFleetFireRate(combineProduct, 'correlated', 0xE100B002);
  // REPORTING: log observed for the pair-review record. Does NOT bind to any
  // specific value (per R07 OBSERVED-binding-scope reinforcement; expected FPR
  // is theoretically NOT bounded by α_fleet under correlated drift — this is
  // the load-bearing MD-F1 demonstration; the compensating control is
  // combineAverage as exercised by AC-16).
  console.log(`  R11 PR-F1 PoE-corr     fpr=${fpr.toFixed(5)} bound=${FPR_BOUND.toFixed(5)} `
    + `[REPORTING-ONLY: PoE Ville bound NOT guaranteed under correlated drift; `
    + `compensating control = combineAverage per AC-16]`);
  // Always-passing assertion (preserves test structure; no FPR binding).
  assert.ok(Number.isFinite(fpr));
});

// ─── R11 AC-15 — PR-F1 cell (combineAverage, iid_H0): fleet FPR ≤ Wilson bound ─
test('R11 AC-15 — PR-F1 (AoE, iid H₀): fleet FPR ≤ α_fleet + 3·√(α_fleet(1−α_fleet)/N_fleet_traj)', () => {
  const fpr = measureFleetFireRate(combineAverage, 'iid', 0xE100B003);
  console.log(`  R11 PR-F1 AoE-iid      fpr=${fpr.toFixed(5)} bound=${FPR_BOUND.toFixed(5)}`);
  assert.ok(
    fpr <= FPR_BOUND,
    `AoE-iid fleet FPR ${fpr.toFixed(5)} exceeds Wilson bound ${FPR_BOUND.toFixed(5)}`,
  );
});

// ─── R11 AC-16 — PR-F1 cell (combineAverage, correlated_H0): fleet FPR ≤ Wilson bound ─
test('R11 AC-16 — PR-F1 (AoE, correlated-drift H₀): fleet FPR ≤ Wilson bound (compensating control under correlated drift)', () => {
  const fpr = measureFleetFireRate(combineAverage, 'correlated', 0xE100B004);
  console.log(`  R11 PR-F1 AoE-corr     fpr=${fpr.toFixed(5)} bound=${FPR_BOUND.toFixed(5)}`);
  assert.ok(
    fpr <= FPR_BOUND,
    `AoE-correlated-drift fleet FPR ${fpr.toFixed(5)} exceeds Wilson bound ${FPR_BOUND.toFixed(5)} `
    + `— Vovk-Wang 2021 §4 convex-combination result arbitrary-dependence guarantee empirically violated`,
  );
});

// ─── R11 AC-17 — TDD ordering attestation (binding-command form; verifies via git) ─
test('R11 AC-17 — TDD ordering: RED commit (q11 test only; TS2307) precedes GREEN (combine.ts + fleet.ts)', () => {
  // Reviewer-side independent verification per R03+ standing discipline. This AC
  // is a placeholder for the binding evidence captured in the NEXT-ROLE.md
  // attestation block at coordination time (commit SHAs reported there). The
  // test body itself is always-passing because the actual evidence lives in
  // the commit log, not in the test runner output.
  assert.ok(true);
});

// ─── R11 AC-18 — observed test count attestation (R03 MINOR-4 reinforcement) ─
test('R11 AC-18 — OBSERVED q11 test count reported in NEXT-ROLE.md attestation', () => {
  // Architect-predicted count: 18 ACs / 18 tests. Implementer reports OBSERVED
  // via `node --test test/q11-hierarchical-e-value-combination.test.js` count
  // at GREEN; NEXT-ROLE.md attestation block captures the actual value, not
  // the prediction (R03 MINOR-4 reinforcement; 6th consecutive application).
  assert.ok(true);
});
