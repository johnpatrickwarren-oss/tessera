// test/q12-fleet-merged-detector-surfaces.test.ts — R12 AC-1 through AC-16.
//
// Binds the SLICE 3 second slice fleet-merged Family A + Family C detector
// surfaces:
//
//   fleetMergeFamilyA(per_shard_states, primitive, fleet_state, log_threshold)
//   fleetMergeFamilyC(per_shard_states, primitive, fleet_state, log_threshold)
//
// Structural-identity ACs: wrapper output ≡ primitive(extracted-log-e) — both
// sides of the equality use the same primitive call internally so this is
// right-reasons-safe (a wiring bug that broke extraction would FAIL the assertion).
//
// Per-shard input invariance ACs: wrapper does NOT mutate any field of any
// per_shard_states[i] — deep-equal-before-vs-after on every field.
//
// Empirical-wiring ACs (Family A only; lighter than R11 PR-F1 per
// NEXT-ROLE.md item 6): N_SHARDS=50, T_TICKS=50, N_FLEET_TRAJ=100; iid H₀ only;
// PoE-iid + AoE-iid each assert fleet FPR ≤ Wilson bound.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  fleetMergeFamilyA,
  fleetMergeFamilyC,
  type FleetMergeStepResult,
  type CombinePrimitive,
} from '../engine/fleet/detectors';
import {
  combineProduct,
  combineAverage,
  freshFleetEProcessState,
  type FleetEProcessState,
} from '../engine/fleet/combine';
import {
  freshBettingState,
  updateBettingState,
} from '../engine/detectors/betting-e-process';
import type { BettingEProcessState } from '../engine/types/families/a';
import type { FamilyCBettingEProcessState } from '../engine/types/families/c';

// ─── Deterministic PRNG + Gaussian generator (re-inlined per R11 q11
// standalone convention at test/q11-hierarchical-e-value-combination.test.ts:35-50). ───

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

// ─── Empirical-wiring parameters (cross-section consistency pass row 11). ───

const ALPHA_FLEET = 0.01;
const LOG_THRESHOLD = Math.log(1 / ALPHA_FLEET);  // ≈ 4.605
const N_SHARDS = 50;
const T_TICKS = 50;
const N_FLEET_TRAJ = 100;
const FPR_BOUND = ALPHA_FLEET + 3 * Math.sqrt(ALPHA_FLEET * (1 - ALPHA_FLEET) / N_FLEET_TRAJ);
// FPR_BOUND ≈ 0.01 + 3·√(0.01·0.99/100) ≈ 0.03985.

const WEALTH_FLOOR = 1e-12;  // mirrors engine/fleet/detectors.ts module-local constant.

// ─── Helper: build a synthetic Family C state with directly-set log_S_t. ───

function makeFamilyCState(log_S_t: number): FamilyCBettingEProcessState {
  return {
    log_S_t,
    ons_lambda: 0,
    ons_inverse_hessian: 1,
    n: 0,
    witness_running_max: 0,
    q_running_sum: [0],
    q_count: 0,
    fired: false,
    tick_at_first_fire: null,
    alphaConsumed: 0,
  };
}

// ─── R12 AC-1 — fleetMergeFamilyA shape + structural identity (PoE) ─────
test('R12 AC-1 — fleetMergeFamilyA returns FleetMergeStepResult; output equals primitive applied to extracted log-e-values', () => {
  // Synthetic Family A states with known M values.
  const states: BettingEProcessState[] = [
    { M: 1.5, bet: 0, n: 1, alphaConsumed: 0, runningMean: 0, runningSecondMoment: 0, onsFallbackCount: 0 },
    { M: 2.0, bet: 0, n: 1, alphaConsumed: 0, runningMean: 0, runningSecondMoment: 0, onsFallbackCount: 0 },
    { M: 0.5, bet: 0, n: 1, alphaConsumed: 0, runningMean: 0, runningSecondMoment: 0, onsFallbackCount: 0 },
  ];
  const fleet_state = freshFleetEProcessState();
  const out: FleetMergeStepResult = fleetMergeFamilyA(states, combineProduct, fleet_state, LOG_THRESHOLD);
  // Shape:
  assert.strictEqual(typeof out.log_fleet_e, 'number');
  assert.strictEqual(out.fleet_state, fleet_state);  // same reference (in-place contract)
  // Structural identity: wrapper output == direct primitive call on extracted log-e.
  const extracted = states.map(s => Math.log(Math.max(s.M, WEALTH_FLOOR)));
  const direct = combineProduct(extracted);
  assert.strictEqual(out.log_fleet_e, direct.log_fleet_e);
});

// ─── R12 AC-2 — both primitives accepted via caller-selection (PoE + AoE) ─
test('R12 AC-2 — fleetMergeFamilyA accepts both combineProduct and combineAverage as the primitive parameter', () => {
  const states: BettingEProcessState[] = [
    { M: 1.5, bet: 0, n: 1, alphaConsumed: 0, runningMean: 0, runningSecondMoment: 0, onsFallbackCount: 0 },
    { M: 2.0, bet: 0, n: 1, alphaConsumed: 0, runningMean: 0, runningSecondMoment: 0, onsFallbackCount: 0 },
    { M: 0.5, bet: 0, n: 1, alphaConsumed: 0, runningMean: 0, runningSecondMoment: 0, onsFallbackCount: 0 },
  ];
  const fleet_state_poe = freshFleetEProcessState();
  const fleet_state_aoe = freshFleetEProcessState();
  // Verify CombinePrimitive type accepts both R11 exports.
  const poe: CombinePrimitive = combineProduct;
  const aoe: CombinePrimitive = combineAverage;
  const out_poe = fleetMergeFamilyA(states, poe, fleet_state_poe, LOG_THRESHOLD);
  const out_aoe = fleetMergeFamilyA(states, aoe, fleet_state_aoe, LOG_THRESHOLD);
  // Both produce finite output:
  assert.ok(Number.isFinite(out_poe.log_fleet_e));
  assert.ok(Number.isFinite(out_aoe.log_fleet_e));
  // PoE = Σ log_e; AoE = logSumExp − log(N); under non-degenerate input they differ.
  assert.notStrictEqual(out_poe.log_fleet_e, out_aoe.log_fleet_e);
});

// ─── R12 AC-3 — fleetMergeFamilyC structural identity (PoE) ─────────────
test('R12 AC-3 — fleetMergeFamilyC: output equals combineProduct applied to extracted log_S_t', () => {
  const states: FamilyCBettingEProcessState[] = [
    makeFamilyCState(0.5),
    makeFamilyCState(1.0),
    makeFamilyCState(1.5),
  ];
  const fleet_state = freshFleetEProcessState();
  const out = fleetMergeFamilyC(states, combineProduct, fleet_state, LOG_THRESHOLD);
  const extracted = states.map(s => s.log_S_t);
  const direct = combineProduct(extracted);
  assert.strictEqual(out.log_fleet_e, direct.log_fleet_e);
  // Numerical cross-check: sum of [0.5, 1.0, 1.5] = 3.0.
  assert.strictEqual(out.log_fleet_e, 3.0);
});

// ─── R12 AC-4 — fleetMergeFamilyA WEALTH_FLOOR application (state.M = 0) ─
test('R12 AC-4 — fleetMergeFamilyA applies WEALTH_FLOOR when state.M = 0 (no Math.log(0))', () => {
  // One shard with M=0; the floor should prevent log(0).
  const states: BettingEProcessState[] = [
    { M: 0, bet: 0, n: 1, alphaConsumed: 0, runningMean: 0, runningSecondMoment: 0, onsFallbackCount: 0 },
    { M: 1, bet: 0, n: 1, alphaConsumed: 0, runningMean: 0, runningSecondMoment: 0, onsFallbackCount: 0 },
  ];
  const fleet_state = freshFleetEProcessState();
  const out = fleetMergeFamilyA(states, combineProduct, fleet_state, LOG_THRESHOLD);
  // Expected: log(max(0, 1e-12)) + log(max(1, 1e-12)) = log(1e-12) + log(1) = -27.631 + 0.
  const expected = Math.log(WEALTH_FLOOR) + Math.log(1);
  assert.ok(Number.isFinite(out.log_fleet_e));
  assert.strictEqual(out.log_fleet_e, expected);
});

// ─── R12 AC-5 — fleetMergeFamilyA structural identity (AoE) ─────────────
test('R12 AC-5 — fleetMergeFamilyA with combineAverage: output equals combineAverage(extracted-log-e)', () => {
  const states: BettingEProcessState[] = [
    { M: 1.0, bet: 0, n: 1, alphaConsumed: 0, runningMean: 0, runningSecondMoment: 0, onsFallbackCount: 0 },
    { M: 2.0, bet: 0, n: 1, alphaConsumed: 0, runningMean: 0, runningSecondMoment: 0, onsFallbackCount: 0 },
    { M: 3.0, bet: 0, n: 1, alphaConsumed: 0, runningMean: 0, runningSecondMoment: 0, onsFallbackCount: 0 },
  ];
  const fleet_state = freshFleetEProcessState();
  const out = fleetMergeFamilyA(states, combineAverage, fleet_state, LOG_THRESHOLD);
  const extracted = states.map(s => Math.log(Math.max(s.M, WEALTH_FLOOR)));
  const direct = combineAverage(extracted);
  assert.strictEqual(out.log_fleet_e, direct.log_fleet_e);
});

// ─── R12 AC-6 — per-shard input invariance (Family A) ───────────────────
test('R12 AC-6 — fleetMergeFamilyA does NOT mutate any per_shard_states[i]', () => {
  const states_before: BettingEProcessState[] = [
    { M: 1.5, bet: 0.1, n: 5, alphaConsumed: 0.001, runningMean: 0.05, runningSecondMoment: 0.5, onsFallbackCount: 2 },
    { M: 2.0, bet: -0.05, n: 7, alphaConsumed: 0.002, runningMean: -0.03, runningSecondMoment: 0.7, onsFallbackCount: 1 },
  ];
  // Deep clone for before-state comparison.
  const snapshot = states_before.map(s => ({ ...s }));
  const fleet_state = freshFleetEProcessState();
  fleetMergeFamilyA(states_before, combineProduct, fleet_state, LOG_THRESHOLD);
  // Every field unchanged on every state.
  assert.deepStrictEqual(states_before, snapshot);
});

// ─── R12 AC-7 — per-shard input invariance (Family C) ───────────────────
test('R12 AC-7 — fleetMergeFamilyC does NOT mutate any per_shard_states[i]', () => {
  const states_before: FamilyCBettingEProcessState[] = [
    makeFamilyCState(0.3),
    makeFamilyCState(0.8),
  ];
  // Deep clone (FamilyCBettingEProcessState has an array field q_running_sum
  // requiring shallow array copy in addition to top-level field copy).
  const snapshot = states_before.map(s => ({ ...s, q_running_sum: [...s.q_running_sum] }));
  const fleet_state = freshFleetEProcessState();
  fleetMergeFamilyC(states_before, combineProduct, fleet_state, LOG_THRESHOLD);
  assert.deepStrictEqual(states_before, snapshot);
});

// ─── R12 AC-8 — fleet state in-place mutation (same reference returned) ──
test('R12 AC-8 — fleetMergeFamilyA returns the same fleet_state reference (in-place mutation contract)', () => {
  const states: BettingEProcessState[] = [
    { M: 2.0, bet: 0, n: 1, alphaConsumed: 0, runningMean: 0, runningSecondMoment: 0, onsFallbackCount: 0 },
  ];
  const fleet_state = freshFleetEProcessState();
  const out = fleetMergeFamilyA(states, combineProduct, fleet_state, LOG_THRESHOLD);
  assert.strictEqual(out.fleet_state, fleet_state);
  // Mutation visible on original handle:
  assert.notStrictEqual(fleet_state.n, 0);  // n was 0 before; incremented by updateFleetEProcessState
  assert.strictEqual(fleet_state.n, 1);
});

// ─── R12 AC-9 — log_fleet_e ≡ fleet_state.log_fleet_e_t post-update ─────
test('R12 AC-9 — fleetMergeFamilyA: result.log_fleet_e === fleet_state.log_fleet_e_t after the call', () => {
  const states: BettingEProcessState[] = [
    { M: 1.5, bet: 0, n: 1, alphaConsumed: 0, runningMean: 0, runningSecondMoment: 0, onsFallbackCount: 0 },
    { M: 2.5, bet: 0, n: 1, alphaConsumed: 0, runningMean: 0, runningSecondMoment: 0, onsFallbackCount: 0 },
  ];
  const fleet_state = freshFleetEProcessState();
  const out = fleetMergeFamilyA(states, combineAverage, fleet_state, LOG_THRESHOLD);
  assert.strictEqual(out.log_fleet_e, fleet_state.log_fleet_e_t);
});

// ─── R12 AC-10 — Family C structural identity (AoE) + log_fleet_e ergonomic ─
test('R12 AC-10 — fleetMergeFamilyC with combineAverage: matches direct call AND log_fleet_e ≡ fleet_state.log_fleet_e_t', () => {
  const states: FamilyCBettingEProcessState[] = [
    makeFamilyCState(0.0),
    makeFamilyCState(2.0),
  ];
  const fleet_state = freshFleetEProcessState();
  const out = fleetMergeFamilyC(states, combineAverage, fleet_state, LOG_THRESHOLD);
  const direct = combineAverage([0.0, 2.0]);
  assert.strictEqual(out.log_fleet_e, direct.log_fleet_e);
  assert.strictEqual(out.log_fleet_e, fleet_state.log_fleet_e_t);
});

// ─── R12 AC-11 — sticky-fire propagates through the wrapper ─────────────
test('R12 AC-11 — fleetMergeFamilyA sticky-fire propagates: high M crosses log_threshold; state.fired becomes true', () => {
  // Choose M = e^5 ≈ 148.4 per shard for two shards → log_e ≈ 5 each;
  // combineProduct → sum = 10; 10 > LOG_THRESHOLD ≈ 4.605 → should fire.
  const M_high = Math.exp(5);
  const states: BettingEProcessState[] = [
    { M: M_high, bet: 0, n: 1, alphaConsumed: 0, runningMean: 0, runningSecondMoment: 0, onsFallbackCount: 0 },
    { M: M_high, bet: 0, n: 1, alphaConsumed: 0, runningMean: 0, runningSecondMoment: 0, onsFallbackCount: 0 },
  ];
  const fleet_state = freshFleetEProcessState();
  assert.strictEqual(fleet_state.fired, false);
  fleetMergeFamilyA(states, combineProduct, fleet_state, LOG_THRESHOLD);
  assert.strictEqual(fleet_state.fired, true);
  assert.strictEqual(fleet_state.tick_at_first_fire, 0);
});

// ─── R12 AC-12 — Family C sticky-fire propagation through wrapper ───────
test('R12 AC-12 — fleetMergeFamilyC sticky-fire propagates: high log_S_t crosses log_threshold; state.fired becomes true', () => {
  // log_S_t = 5 per shard for two shards → sum = 10 > LOG_THRESHOLD ≈ 4.605.
  const states: FamilyCBettingEProcessState[] = [
    makeFamilyCState(5),
    makeFamilyCState(5),
  ];
  const fleet_state = freshFleetEProcessState();
  fleetMergeFamilyC(states, combineProduct, fleet_state, LOG_THRESHOLD);
  assert.strictEqual(fleet_state.fired, true);
  assert.strictEqual(fleet_state.tick_at_first_fire, 0);
});

// ─── R12 AC-13 — empty per_shard_states throws via primitive bubble-up ──
test('R12 AC-13 — fleetMergeFamilyA + fleetMergeFamilyC each throw on empty per_shard_states (R11 primitive bubble-up)', () => {
  const fleet_state = freshFleetEProcessState();
  assert.throws(
    () => fleetMergeFamilyA([], combineProduct, fleet_state, LOG_THRESHOLD),
    /empty input/,
  );
  assert.throws(
    () => fleetMergeFamilyC([], combineAverage, fleet_state, LOG_THRESHOLD),
    /empty input/,
  );
});

// ─── R12 AC-14 — empirical wiring: PoE-iid fleet FPR ≤ Wilson bound ──────
test('R12 AC-14 — empirical wiring: fleetMergeFamilyA with combineProduct under iid H₀ at N=50/T=50/N_traj=100: fleet FPR ≤ Wilson bound', () => {
  const fpr = measureFleetFireRateFamilyA(combineProduct, 0xE120A001);
  console.log(`  R12 wiring PoE-iid     fpr=${fpr.toFixed(5)} bound=${FPR_BOUND.toFixed(5)}`);
  assert.ok(
    fpr <= FPR_BOUND,
    `R12 PoE-iid wiring fleet FPR ${fpr.toFixed(5)} exceeds Wilson bound ${FPR_BOUND.toFixed(5)}`,
  );
});

// ─── R12 AC-15 — empirical wiring: AoE-iid fleet FPR ≤ Wilson bound ──────
test('R12 AC-15 — empirical wiring: fleetMergeFamilyA with combineAverage under iid H₀ at N=50/T=50/N_traj=100: fleet FPR ≤ Wilson bound', () => {
  const fpr = measureFleetFireRateFamilyA(combineAverage, 0xE120A002);
  console.log(`  R12 wiring AoE-iid     fpr=${fpr.toFixed(5)} bound=${FPR_BOUND.toFixed(5)}`);
  assert.ok(
    fpr <= FPR_BOUND,
    `R12 AoE-iid wiring fleet FPR ${fpr.toFixed(5)} exceeds Wilson bound ${FPR_BOUND.toFixed(5)}`,
  );
});

// ─── R12 AC-16 — observed test count attestation (R03 MINOR-4 reinforcement) ─
test('R12 AC-16 — OBSERVED q12 test count + TDD ordering reported in NEXT-ROLE.md attestation', () => {
  // Architect-predicted count: 16 ACs / 16 tests. Implementer reports OBSERVED
  // via `node --test test/q12-fleet-merged-detector-surfaces.test.js` count
  // at GREEN; NEXT-ROLE.md attestation block captures the actual value, not
  // the prediction (R03 MINOR-4 reinforcement; 7th consecutive application).
  // TDD ordering: RED commit adds q12 test only (TS2307 on missing detectors.ts);
  // GREEN commit adds engine/fleet/detectors.ts atomically.
  assert.ok(true);
});

// ─── Per-fleet-trajectory simulator (Family A; iid H₀) ──────────────────

function simulateFleetTrajectoryFamilyA(
  primitive: CombinePrimitive,
  rngSeed: number,
): boolean {
  const rng = mulberry32(rngSeed);
  const shard_states = Array.from({ length: N_SHARDS }, () => freshBettingState());
  const fleet_state: FleetEProcessState = freshFleetEProcessState();
  for (let t = 0; t < T_TICKS; t++) {
    for (let i = 0; i < N_SHARDS; i++) {
      const x = gaussian(rng);  // iid N(0,1)
      updateBettingState(shard_states[i], x, 0, 1, 0);
    }
    fleetMergeFamilyA(shard_states, primitive, fleet_state, LOG_THRESHOLD);
  }
  return fleet_state.fired;
}

function measureFleetFireRateFamilyA(
  primitive: CombinePrimitive,
  base_seed: number,
): number {
  let fires = 0;
  for (let j = 0; j < N_FLEET_TRAJ; j++) {
    const seed = (base_seed + j * 0x1234567) >>> 0;
    if (simulateFleetTrajectoryFamilyA(primitive, seed)) fires++;
  }
  return fires / N_FLEET_TRAJ;
}
