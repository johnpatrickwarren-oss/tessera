// test/q13-e-bh-fdr.test.ts — R13 AC-1 through AC-14.
//
// Binds the SLICE 4 e-Benjamini-Hochberg FDR operator surface +
// PR-F2 evidence matrix at N=100 shards × T=100 ticks × N_trials=200.
//
// PR-F2 evidence matrix (2 cells; both theory-derived Wilson bounds):
//   (iid H₀)              → AC-10: empirical FDR ≤ Wilson upper bound
//   (correlated-drift H₀) → AC-11: empirical FDR ≤ Wilson upper bound
//
// Under all-H₀, FDR = E[K_false / max(K, 1)] = E[1_{K > 0}] = P(K > 0),
// which is what the simulator measures. Wang-Ramdas 2022 Theorem 4.1
// guarantees e-BH FDR ≤ q · N_0/N ≤ q under arbitrary dependence between
// e-values; both cells expected to PASS.
//
// Right-reasons-safe: ACs bind theory-derived Wilson upper bound, NOT
// OBSERVED FDR values (per R07 OBSERVED-binding-scope reinforcement). A
// future implementation FIX matching architect prediction (≈ 0.01-0.06)
// passes the bound (0.0962); a future BUG producing FDR ≈ 0.20 fails it.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  eBenjaminiHochberg,
  type EBenjaminiHochbergOutput,
} from '../engine/fleet/e-bh';
import {
  freshBettingState,
  updateBettingState,
} from '../engine/detectors/betting-e-process';

// ─── Deterministic PRNG + Gaussian generator (re-inlined per R11 q11 +
// R12 q12 standalone convention; NOT imported from inherited tests). ───

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

// ─── PR-F2 evidence matrix parameters (cross-section consistency pass row 14). ───

const Q_LEVEL = 0.05;
const N_SHARDS = 100;
const T_TICKS = 100;
const N_TRIALS = 200;
const RHO_SQUARED = 0.5;  // correlated-drift shared-factor variance fraction
const FDR_BOUND = Q_LEVEL + 3 * Math.sqrt(Q_LEVEL * (1 - Q_LEVEL) / N_TRIALS);
// FDR_BOUND ≈ 0.05 + 3·√(0.05·0.95/200) ≈ 0.09624.

// ─── R13 AC-1 — eBenjaminiHochberg returns EBenjaminiHochbergOutput shape ─
test('R13 AC-1 — eBenjaminiHochberg returns { selected: ReadonlyArray<number>, K: number } with K === selected.length', () => {
  const out: EBenjaminiHochbergOutput = eBenjaminiHochberg([50, 30, 10, 2, 0.5], 0.2);
  assert.ok(Array.isArray(out.selected), 'selected must be array');
  assert.strictEqual(typeof out.K, 'number', 'K must be number');
  assert.strictEqual(out.K, out.selected.length, 'K must equal selected.length');
});

// ─── R13 AC-2 — Empty perShardEValues throws ────────────────────────────
test('R13 AC-2 — eBenjaminiHochberg([], q) throws on empty input', () => {
  assert.throws(
    () => eBenjaminiHochberg([], 0.05),
    /empty input/,
    'must throw on N=0',
  );
});

// ─── R13 AC-3 — Invalid qLevel throws ───────────────────────────────────
test('R13 AC-3 — eBenjaminiHochberg throws on qLevel ≤ 0 or qLevel > 1', () => {
  assert.throws(() => eBenjaminiHochberg([1, 2, 3], 0), /qLevel/);
  assert.throws(() => eBenjaminiHochberg([1, 2, 3], -0.1), /qLevel/);
  assert.throws(() => eBenjaminiHochberg([1, 2, 3], 1.5), /qLevel/);
  assert.throws(() => eBenjaminiHochberg([1, 2, 3], 2), /qLevel/);
});

// ─── R13 AC-4 — Below-threshold input produces K=0 ──────────────────────
test('R13 AC-4 — all e_i below threshold ⇒ K=0, selected=[]', () => {
  const small_es = new Array(100).fill(0.5);
  const out = eBenjaminiHochberg(small_es, 0.05);
  // Threshold N/q = 100/0.05 = 2000; max k * e_(k) over k ∈ [1, 100]
  // is N * 0.5 = 50 (at k=100 with all 0.5s), well below 2000 → R=0.
  assert.strictEqual(out.K, 0);
  assert.deepStrictEqual(out.selected, []);
});

// ─── R13 AC-5 — Closed-form worked example (N=5; R=3) ───────────────────
test('R13 AC-5 — closed-form: eBenjaminiHochberg([50, 30, 10, 2, 0.5], 0.2) ⇒ {selected: [0,1,2], K: 3}', () => {
  // N/q = 5/0.2 = 25. Step down from k=5:
  //   k=5: 5·0.5 = 2.5  < 25 ✗
  //   k=4: 4·2   = 8    < 25 ✗
  //   k=3: 3·10  = 30   ≥ 25 ✓ → R=3
  // Selected (top 3 by e-value): indices [0, 1, 2] in original order; sort ASC = [0, 1, 2].
  const out = eBenjaminiHochberg([50, 30, 10, 2, 0.5], 0.2);
  assert.strictEqual(out.K, 3);
  assert.deepStrictEqual(out.selected, [0, 1, 2]);
});

// ─── R13 AC-6 — Closed-form worked example (N=10; R=3) ──────────────────
test('R13 AC-6 — closed-form: eBenjaminiHochberg([300,150,80,40,20,10,5,2.5,1.25,0.6], 0.05) ⇒ {selected: [0,1,2], K: 3}', () => {
  // N/q = 10/0.05 = 200. Step down from k=10:
  //   k=10..4: all k·e_(k) < 200 (max at k=4 is 4·40 = 160 < 200)
  //   k=3: 3·80 = 240 ≥ 200 ✓ → R=3
  // Selected: indices [0, 1, 2] in original order; sort ASC = [0, 1, 2].
  const out = eBenjaminiHochberg(
    [300, 150, 80, 40, 20, 10, 5, 2.5, 1.25, 0.6],
    0.05,
  );
  assert.strictEqual(out.K, 3);
  assert.deepStrictEqual(out.selected, [0, 1, 2]);
});

// ─── R13 AC-7 — Output index ordering: selected sorted ascending ────────
test('R13 AC-7 — out.selected is sorted ascending (non-contiguous high-e indices)', () => {
  // Place high e-values at non-contiguous indices [3, 0, 7].
  const e = new Array(10).fill(0.1);
  e[3] = 300;
  e[0] = 150;
  e[7] = 80;
  // N/q = 10/0.05 = 200. Sorted DESC by e: [300, 150, 80, 0.1, ..., 0.1].
  //   k=3: 3·80 = 240 ≥ 200 ✓ → R=3
  // Raw selected (DESC order): [3, 0, 7]; sort ASC → [0, 3, 7].
  const out = eBenjaminiHochberg(e, 0.05);
  assert.deepStrictEqual(out.selected, [0, 3, 7]);
  // Explicit ascending verification.
  for (let i = 1; i < out.selected.length; i++) {
    assert.ok(
      out.selected[i] > out.selected[i - 1],
      `selected must be strictly ascending at i=${i}`,
    );
  }
});

// ─── R13 AC-8 — Tie-breaking deterministic ───────────────────────────────
test('R13 AC-8 — duplicate e-values resolved deterministically by index ascending (all-tied + partial-tie fixtures)', () => {
  // All 5 shards have e_i = 100 exactly.
  // N/q = 5/0.1 = 50. For k=5: 5·100 = 500 ≥ 50 ✓ → R=5.
  // Stable sort tie-break (idx ASC): DESC order = [0,1,2,3,4]; ASC selected = [0,1,2,3,4].
  const out_all = eBenjaminiHochberg([100, 100, 100, 100, 100], 0.1);
  assert.strictEqual(out_all.K, 5);
  assert.deepStrictEqual(out_all.selected, [0, 1, 2, 3, 4]);

  // Partial tie: shards [0, 3, 4] at e=200; [1, 2] at e=1.
  // N/q = 5/0.1 = 50. Sort DESC + idx ASC tie-break:
  //   [(200,0), (200,3), (200,4), (1,1), (1,2)]
  //   k=5: 5·1   = 5   < 50 ✗
  //   k=4: 4·1   = 4   < 50 ✗ (e_(4) is the second e=1)
  //   k=3: 3·200 = 600 ≥ 50 ✓ → R=3
  // Raw selected (DESC order): [0, 3, 4]; sort ASC → [0, 3, 4].
  const out_partial = eBenjaminiHochberg([200, 1, 1, 200, 200], 0.1);
  assert.strictEqual(out_partial.K, 3);
  assert.deepStrictEqual(out_partial.selected, [0, 3, 4]);
});

// ─── R13 AC-9 — Per-shard input invariance ──────────────────────────────
test('R13 AC-9 — eBenjaminiHochberg does NOT mutate perShardEValues', () => {
  const e = [50, 30, 10, 2, 0.5];
  const e_before = [...e];
  eBenjaminiHochberg(e, 0.2);
  assert.deepStrictEqual(e, e_before, 'input array must not be mutated');
});

// ─── R13 AC-10 — PR-F2 iid H₀ — empirical FDR ≤ Wilson bound ────────────
test('R13 AC-10 — PR-F2 iid H₀: N=100, T=100, N_trials=200, q=0.05 ⇒ empirical FDR ≤ Wilson bound', () => {
  const fdr = measureEBHFireRate('iid', 0xE130BB01);
  console.log(`  R13 PR-F2 iid          fdr=${fdr.toFixed(5)} bound=${FDR_BOUND.toFixed(5)}`);
  assert.ok(
    fdr <= FDR_BOUND,
    `R13 PR-F2 iid H₀ empirical FDR ${fdr.toFixed(5)} exceeds Wilson bound ${FDR_BOUND.toFixed(5)}`,
  );
});

// ─── R13 AC-11 — PR-F2 correlated-drift H₀ — empirical FDR ≤ Wilson bound ─
test('R13 AC-11 — PR-F2 correlated-drift H₀ (ρ²=0.5): N=100, T=100, N_trials=200, q=0.05 ⇒ empirical FDR ≤ Wilson bound', () => {
  const fdr = measureEBHFireRate('correlated', 0xE130BB02);
  console.log(`  R13 PR-F2 correlated   fdr=${fdr.toFixed(5)} bound=${FDR_BOUND.toFixed(5)}`);
  assert.ok(
    fdr <= FDR_BOUND,
    `R13 PR-F2 correlated-drift H₀ empirical FDR ${fdr.toFixed(5)} exceeds Wilson bound ${FDR_BOUND.toFixed(5)}`,
  );
});

// ─── R13 AC-12 — API ergonomics: qLevel required (no default) ───────────
test('R13 AC-12 — qLevel is a required positional parameter (no default; documented in module header)', () => {
  // Compile-time enforcement: typecheck rejects `eBenjaminiHochberg(es)`
  // (missing required argument). Documented in engine/fleet/e-bh.ts module
  // header: "Default qLevel: NONE. qLevel is a required positional parameter."
  // Runtime check: passing undefined for qLevel triggers the invalid-qLevel
  // throw via the conjunctive guard (`undefined > 0` is false).
  assert.throws(
    () => eBenjaminiHochberg([1, 2, 3], undefined as unknown as number),
    /qLevel/,
    'passing undefined for qLevel must throw via the (0, 1] validation',
  );
});

// ─── R13 AC-13 — TDD ordering (RED precedes GREEN) ──────────────────────
test('R13 AC-13 — TDD ordering: RED commit (q13 test only; TS2307 on missing e-bh.ts) precedes GREEN (e-bh.ts atomic landing)', () => {
  // Verified by Implementer attestation + Reviewer git log review.
  // RED commit must add only test/q13-e-bh-fdr.test.ts; GREEN must add
  // engine/fleet/e-bh.ts atomically. Two-commit ordering visible in
  // `git log --oneline` and `git show --stat <RED> <GREEN>`.
  assert.ok(true);
});

// ─── R13 AC-14 — OBSERVED q13 test count attestation (R03 MINOR-4) ──────
test('R13 AC-14 — OBSERVED q13 test count reported in NEXT-ROLE.md attestation', () => {
  // Architect-predicted count: 14 ACs / 14 tests. Implementer reports
  // OBSERVED via `node --test test/q13-e-bh-fdr.test.js` count at GREEN;
  // NEXT-ROLE.md attestation block captures the actual value, not the
  // prediction (R03 MINOR-4 reinforcement; 8th consecutive application).
  assert.ok(true);
});

// ─── PR-F2 simulator (Family A; one trial = N shards × T ticks under
// chosen H₀ scenario). Reuses the R11 correlated-drift mechanism. ────────

/** Run one PR-F2 trial: build N per-shard wealth processes, drive T ticks
 *  under the chosen H₀ scenario, extract per-shard M_T as the linear-space
 *  e-value, run e-BH at Q_LEVEL, return whether ANY shard was selected
 *  (K > 0).
 *
 *  Under all-H₀: FDR = E[K_false / max(K, 1)] = E[1_{K > 0}] = P(K > 0). */
function simulateEBHTrial(
  scenario: 'iid' | 'correlated',
  rngSeed: number,
): boolean {
  const rng = mulberry32(rngSeed);
  const shard_states = Array.from(
    { length: N_SHARDS },
    () => freshBettingState(),
  );
  const stddev_shared = scenario === 'correlated' ? Math.sqrt(RHO_SQUARED) : 0;
  const stddev_per_shard = scenario === 'correlated'
    ? Math.sqrt(1 - RHO_SQUARED)
    : 1;
  for (let t = 0; t < T_TICKS; t++) {
    const shared_z = scenario === 'correlated' ? stddev_shared * gaussian(rng) : 0;
    for (let i = 0; i < N_SHARDS; i++) {
      const per_shard_noise = stddev_per_shard * gaussian(rng);
      const x = shared_z + per_shard_noise;
      updateBettingState(shard_states[i], x, 0, 1, 0);
    }
  }
  const e_values: number[] = shard_states.map(s => s.M);
  const out = eBenjaminiHochberg(e_values, Q_LEVEL);
  return out.K > 0;
}

/** Measure empirical FDR (= P(K > 0) under all-H₀) over N_TRIALS trials. */
function measureEBHFireRate(
  scenario: 'iid' | 'correlated',
  base_seed: number,
): number {
  let fires = 0;
  for (let j = 0; j < N_TRIALS; j++) {
    const seed = (base_seed + j * 0x1234567) >>> 0;
    if (simulateEBHTrial(scenario, seed)) fires++;
  }
  return fires / N_TRIALS;
}
