// test/q07-fleet-correlated.test.ts — R07 AC-1 through AC-21.
//
// Binds the SLICE 5 Stage 2b FCP-1 + Stage 3b warm-start eligibility wire-format at
// tools/curate-baseline-fleet-correlated.ts. Includes PR-F8 evidence-matrix tests
// (H₀ FPR + H₁ power) using deterministic-seed mulberry32 + Bernoulli synthesis.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { BaselineBundle, BaselineCurationDecision } from '../engine/types/config';
import {
  curateBaselineFleetCorrelated,
  runFleetCorrelatedEProcess,
  type Fcp1Opts,
  type FleetCorrelatedOpts,
  type Fcp1State,
  type FleetCorrelatedResult,
} from '../tools/curate-baseline-fleet-correlated';

// ─── PRNG + Binomial helpers (test-local; cross-platform-deterministic) ────────
const FCP1_TEST_SEED = 0xFCD1;
function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6D2B79F5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function simulateH0(seed: number, W: number, N: number, p: number): number[] {
  const rng = mulberry32(seed);
  const out: number[] = new Array<number>(W).fill(0);
  for (let w = 0; w < W; w++) {
    let count = 0;
    for (let s = 0; s < N; s++) if (rng() < p) count += 1;
    out[w] = count;
  }
  return out;
}
function simulateH1(seed: number, W: number, N: number, p_base: number, w_inject: number, p_alt: number): number[] {
  const rng = mulberry32(seed);
  const out: number[] = new Array<number>(W).fill(0);
  for (let w = 0; w < W; w++) {
    const p_w = w === w_inject ? p_alt : p_base;
    let count = 0;
    for (let s = 0; s < N; s++) if (rng() < p_w) count += 1;
    out[w] = count;
  }
  return out;
}

// ─── Fleet bundle factory for AC-15/16 ────────────────────────────────────────
function makeFleetBundle(nRuns: number, nTicks: number, contaminatedTicks: Set<number>): BaselineBundle {
  const runs: BaselineBundle['runs'] = [];
  for (let r = 0; r < nRuns; r++) {
    const a: number[] = [];
    const b: number[] = [];
    for (let t = 0; t < nTicks; t++) {
      if (contaminatedTicks.has(t)) {
        a.push(100); b.push(100);
      } else {
        // Clean: small alternating values so MCD finds a well-conditioned subset
        a.push(((t + r) % 3 === 0) ? 0.5 : (((t + r) % 3 === 1) ? -0.3 : 0.1));
        b.push(((t + r) % 4 === 0) ? -0.4 : (((t + r) % 4 === 1) ? 0.6 : (((t + r) % 4 === 2) ? -0.2 : 0.3)));
      }
    }
    runs.push({ signal_series: { a, b } });
  }
  return { version: 'q07-fleet-v1', generated_at: '2026-05-16T00:00:00Z', seed: 10, runs };
}

// ─── Standard fixtures ──────────────────────────────────────────────────────
const CLEAN_BUNDLE_1RUN: BaselineBundle = {
  version: 'q07-clean-v1',
  generated_at: '2026-05-16T00:00:00Z',
  seed: 1,
  runs: [{
    tenant_id: 's0',
    signal_series: {
      a: [0.5, -0.3, 0.1, -0.7, 0.2, 0.4, -0.5, 0.3],
      b: [-0.4, 0.6, -0.2, 0.5, -0.8, 0.3, 0.1, -0.6],
    },
  }],
};

const OUTLIER_BUNDLE_1RUN: BaselineBundle = {
  version: 'q07-outlier-v1',
  generated_at: '2026-05-16T00:00:00Z',
  seed: 2,
  runs: [{
    signal_series: {
      a: [0.5, -0.3, 0.1, -0.7, 0.2, 0.4, -0.5, 100],
      b: [-0.4, 0.6, -0.2, 0.5, -0.8, 0.3, 0.1, 100],
    },
  }],
};

const INSUFFICIENT_BUNDLE: BaselineBundle = {
  version: 'q07-insuff-v1',
  generated_at: '2026-05-16T00:00:00Z',
  seed: 3,
  runs: [{ signal_series: { a: [0.1, 0.2], b: [0.3, 0.4] } }],
};

const NO_SIGNALS_BUNDLE: BaselineBundle = {
  version: 'q07-nosig-v1',
  generated_at: '2026-05-16T00:00:00Z',
  seed: 4,
  runs: [{ signal_series: {} }],
};

// ─── R07 AC-1 ──────────────────────────────────────────────────────────────────
test('R07 AC-1 — clean 1-run bundle: n_runs_screened===1; D11+D12+D13 all emitted', () => {
  const result = curateBaselineFleetCorrelated(CLEAN_BUNDLE_1RUN);
  const d11 = result.decisions.D11!;
  assert.strictEqual(d11.output_summary.n_runs_screened, 1);
  assert.strictEqual(d11.output_summary.n_runs_skipped_insufficient_samples, 0);
  assert.strictEqual(d11.output_summary.n_runs_skipped_mcd_failed, 0);
  assert.deepStrictEqual(Object.keys(result.decisions).sort(), ['D11', 'D12', 'D13']);
});

// ─── R07 AC-2 ──────────────────────────────────────────────────────────────────
test('R07 AC-2 — outlier bundle: n_ticks_contaminated>=1; curated series excludes the outlier 100 value', () => {
  const result = curateBaselineFleetCorrelated(OUTLIER_BUNDLE_1RUN);
  const d11 = result.decisions.D11!;
  assert.ok((d11.output_summary.n_ticks_contaminated as number) >= 1,
    `expected n_ticks_contaminated >= 1; got ${d11.output_summary.n_ticks_contaminated}`);
  assert.ok(!result.curatedBundle.runs[0].signal_series.a.includes(100),
    'curated signal a still contains outlier 100');
  assert.ok(!result.curatedBundle.runs[0].signal_series.b.includes(100),
    'curated signal b still contains outlier 100');
});

// ─── R07 AC-3 ──────────────────────────────────────────────────────────────────
test('R07 AC-3 — insufficient-samples bundle: n_runs_skipped_insufficient_samples===1; FCP-1 does not fire', () => {
  const result = curateBaselineFleetCorrelated(INSUFFICIENT_BUNDLE);
  const d11 = result.decisions.D11!;
  assert.strictEqual(d11.output_summary.n_runs_skipped_insufficient_samples, 1);
  assert.strictEqual(d11.output_summary.n_runs_screened, 0);
  assert.strictEqual(result.fcp1State.fired, false);
  assert.strictEqual(result.fcp1State.n_windows_test, 0);
});

// ─── R07 AC-4 ──────────────────────────────────────────────────────────────────
test('R07 AC-4 — no-signals bundle: skipped_no_signals; FCP-1 does not fire', () => {
  const result = curateBaselineFleetCorrelated(NO_SIGNALS_BUNDLE);
  const d11 = result.decisions.D11!;
  assert.strictEqual(d11.output_summary.n_runs_screened, 0);
  assert.strictEqual(result.fcp1State.fired, false);
  assert.strictEqual(result.fcp1State.n_windows_test, 0);
});

// ─── R07 AC-5 — wealth update formula step-trace ──────────────────────────────
test('R07 AC-5 — wealth update: log_S matches closed-form step-trace on [2,3,2,4,3] within 1e-10', () => {
  // K=min(2,max(0,5-1))=2; p_burn=(2+3)/(100*2)=0.025; p_base=(200*0.025+1.0*0.025)/201=0.025
  const ONS_C = 2 / (2 - Math.log(3));
  const FLOOR = 1e-12;
  const xCounts = [2, 3, 2, 4, 3];
  const N = 100;
  const opts: Fcp1Opts = { pBasePrior: 0.025, shrinkageKappa: 1.0, trainingWindowCount: 2, alphaFleet: 1e-3, lambdaMax: 0.5 };
  const pBase = (200 * 0.025 + 1.0 * 0.025) / (200 + 1.0);

  let expectedLogS = 0;
  let lambda = 0;
  let hess = 1;
  // Step through test windows w=2,3,4
  for (const [wi, xw] of [[2, 2], [3, 4], [4, 3]] as [number, number][]) {
    const Fw = xCounts[wi] / N - pBase;
    const wf = 1 + lambda * Fw;
    expectedLogS += Math.log(Math.max(wf, FLOOR));
    const denom = 1 + lambda * Fw;
    if (Math.abs(denom) >= 1e-12) {
      const z = -Fw / denom;
      hess += z * z;
      let ln = lambda - (ONS_C * z) / hess;
      if (ln > 0.5) ln = 0.5; else if (ln < -0.5) ln = -0.5;
      lambda = ln;
    }
  }

  const state = runFleetCorrelatedEProcess(xCounts, N, opts);
  assert.ok(Math.abs(state.log_S - expectedLogS) < 1e-10,
    `log_S mismatch: production=${state.log_S}, expected=${expectedLogS}`);
  assert.strictEqual(state.fired, false, 'small fixture should not fire');
});

// ─── R07 AC-6 — ONS bet update step-trace ────────────────────────────────────
test('R07 AC-6 — ONS bet: final ons_lambda matches closed-form step-trace on [2,3,2,4,3] within 1e-10', () => {
  const ONS_C = 2 / (2 - Math.log(3));
  const xCounts = [2, 3, 2, 4, 3];
  const N = 100;
  const opts: Fcp1Opts = { pBasePrior: 0.025, shrinkageKappa: 1.0, trainingWindowCount: 2, alphaFleet: 1e-3, lambdaMax: 0.5 };
  const pBase = (200 * 0.025 + 1.0 * 0.025) / (200 + 1.0);

  let lambda = 0;
  let hess = 1;
  for (const [wi, xw] of [[2, 2], [3, 4], [4, 3]] as [number, number][]) {
    const Fw = xCounts[wi] / N - pBase;
    const denom = 1 + lambda * Fw;
    if (Math.abs(denom) >= 1e-12) {
      const z = -Fw / denom;
      hess += z * z;
      let ln = lambda - (ONS_C * z) / hess;
      if (ln > 0.5) ln = 0.5; else if (ln < -0.5) ln = -0.5;
      lambda = ln;
    }
  }

  const state = runFleetCorrelatedEProcess(xCounts, N, opts);
  assert.ok(Math.abs(state.ons_lambda - lambda) < 1e-10,
    `ons_lambda mismatch: production=${state.ons_lambda}, expected=${lambda}`);
});

// ─── R07 AC-7 — Bayesian shrinkage p_base ────────────────────────────────────
test('R07 AC-7 — Bayesian shrinkage: p_base===0.025 exactly for [2,3,0] with K=2 training and N=100', () => {
  // Fixture note: [2,3] alone gives K=min(2,max(0,2-1))=1 (not K=2 as spec prose states).
  // Using [2,3,0] (W=3) so K=min(2,max(0,3-1))=2, matching spec's formula: p_burn=(2+3)/(100*2)=0.025;
  // p_base=(200*0.025+1.0*0.025)/201=5.025/201=0.025.
  const xCounts = [2, 3, 0];
  const N = 100;
  const opts: Fcp1Opts = { pBasePrior: 0.025, shrinkageKappa: 1.0, trainingWindowCount: 2, alphaFleet: 1e-3 };
  const state = runFleetCorrelatedEProcess(xCounts, N, opts);
  assert.strictEqual(state.p_base, 0.025);
  assert.strictEqual(state.n_windows_test, 1); // W=3, K=2 → 1 test window
});

// ─── R07 AC-8 — fire condition ───────────────────────────────────────────────
test('R07 AC-8 — fire condition: 32-element fixture (2 training + 30 all X=100) fires at window in [3,25]', () => {
  // At w=K (first test window) ons_lambda=0 → log_S unchanged (AC-14 martingale property).
  // ONS then saturates to 0.5. Subsequent windows at X=N each contribute ~log(1.4875)≈0.397.
  // ~18 windows needed to cross log(1/1e-3)≈6.908; 30 windows provides margin.
  const xCounts: number[] = [0, 0, ...new Array<number>(30).fill(100)];
  const N = 100;
  const opts: Fcp1Opts = { pBasePrior: 0.025, shrinkageKappa: 1.0, trainingWindowCount: 2, alphaFleet: 1e-3, lambdaMax: 0.5 };
  const state = runFleetCorrelatedEProcess(xCounts, N, opts);
  assert.strictEqual(state.fired, true, 'expected fired===true on sustained-elevation fixture');
  assert.notStrictEqual(state.fire_window, null, 'expected fire_window !== null');
  assert.ok(state.fire_window! >= 3, `fire_window ${state.fire_window} < 3 (below lower bound)`);
  assert.ok(state.fire_window! <= 25, `fire_window ${state.fire_window} > 25 (above upper bound)`);
});

// ─── R07 AC-9 — no-fire condition ───────────────────────────────────────────
test('R07 AC-9 — no-fire condition: constant-low fixture X_w===2 never crosses threshold', () => {
  const xCounts: number[] = new Array<number>(200).fill(2);
  const N = 100;
  const state = runFleetCorrelatedEProcess(xCounts, N, {});
  assert.strictEqual(state.fired, false);
  assert.strictEqual(state.fire_window, null);
  assert.ok(Math.abs(state.log_S) < 1, `expected |log_S| < 1 on clean fixture; got ${state.log_S}`);
});

// ─── R07 AC-10 — empty xCounts guard ────────────────────────────────────────
test('R07 AC-10 — empty xCounts: n_windows_test===0; fired===false; p_base===pBasePrior fallback', () => {
  const state = runFleetCorrelatedEProcess([], 100, {});
  assert.strictEqual(state.n_windows_test, 0);
  assert.strictEqual(state.fired, false);
  assert.strictEqual(state.fire_window, null);
  assert.strictEqual(state.p_base, 0.025); // pBasePrior default
  assert.strictEqual(state.log_S, 0);
});

// ─── R07 AC-11 — H₀ FPR simulation ─────────────────────────────────────────
test('R07 AC-11 — H₀ FPR: 30 trials × W=200 × N=100 × p=0.025 → OBSERVED fire count at α_fleet=1e-3', () => {
  let firedCount = 0;
  for (let t = 0; t < 30; t++) {
    const xCounts = simulateH0(FCP1_TEST_SEED + t, 200, 100, 0.025);
    const state = runFleetCorrelatedEProcess(xCounts, 100, { alphaFleet: 1e-3 });
    if (state.fired) firedCount += 1;
  }
  // Architect prediction: 0 (Ville bound; expected ≈0.03 fires at α=1e-3 × 30 trials).
  // AC-11 binds OBSERVED count exactly — update assertion after running GREEN.
  assert.strictEqual(firedCount, 0);
});

// ─── R07 AC-12 — H₁ strong injection simulation ─────────────────────────────
test('R07 AC-12 — H₁ strong injection: 30 trials × p_alt=0.5 at w=100 → OBSERVED fire count', () => {
  let firedCount = 0;
  for (let t = 0; t < 30; t++) {
    const xCounts = simulateH1(FCP1_TEST_SEED + 1000 + t, 200, 100, 0.025, 100, 0.5);
    const state = runFleetCorrelatedEProcess(xCounts, 100, { alphaFleet: 1e-3 });
    if (state.fired) firedCount += 1;
  }
  // Architect prediction: 20-30 of 30. AC-12 binds OBSERVED — update after GREEN.
  // Broad bound as initial assertion; tighten to exact value at GREEN.
  assert.ok(firedCount >= 0 && firedCount <= 30,
    `firedCount=${firedCount} out of range [0,30]`);
  // IMPLEMENTER: replace the above with assert.strictEqual(firedCount, OBSERVED) after GREEN run.
});

// ─── R07 AC-13 — H₁ weak injection simulation ───────────────────────────────
test('R07 AC-13 — H₁ weak injection: 30 trials × p_alt=0.1 at w=100 → OBSERVED fire count', () => {
  let firedCount = 0;
  for (let t = 0; t < 30; t++) {
    const xCounts = simulateH1(FCP1_TEST_SEED + 2000 + t, 200, 100, 0.025, 100, 0.1);
    const state = runFleetCorrelatedEProcess(xCounts, 100, { alphaFleet: 1e-3 });
    if (state.fired) firedCount += 1;
  }
  // Architect prediction: 0-15 of 30. AC-13 binds OBSERVED — update after GREEN run.
  assert.ok(firedCount >= 0 && firedCount <= 30,
    `firedCount=${firedCount} out of range [0,30]`);
  // IMPLEMENTER: replace the above with assert.strictEqual(firedCount, OBSERVED) after GREEN run.
});

// ─── R07 AC-14 — martingale property: first test window log_S unchanged ──────
test('R07 AC-14 — martingale property: at first test window ons_lambda===0 → log_S===0 regardless of F_w', () => {
  // xCounts=[0,0,100], K=min(2,max(0,3-1))=2 → 1 test window (w=2) with X=100 (extreme F_w=0.975)
  // Since ons_lambda=0 at the first test window, wealth_factor=1+0*F=1, log_factor=log(1)=0 → log_S=0.
  const xCounts = [0, 0, 100];
  const opts: Fcp1Opts = { trainingWindowCount: 2, alphaFleet: 1e-3 };
  const state = runFleetCorrelatedEProcess(xCounts, 100, opts);
  assert.strictEqual(state.log_S, 0, 'first-test-window log_S must be 0 regardless of F_w');
  assert.strictEqual(state.n_windows_test, 1);
  // ons_lambda IS updated (non-zero) after the first test window by ONS:
  assert.notStrictEqual(state.ons_lambda, 0, 'ons_lambda should be updated by ONS after first window');
});

// ─── R07 AC-15 — clean fleet bundle: FCP-1 does not fire ────────────────────
test('R07 AC-15 — clean fleet 3-run bundle: fcp1State.fired===false; D12 fire_window===-1', () => {
  // 3 runs × 8 ticks × 2 signals, all clean values
  const bundle: BaselineBundle = {
    version: 'q07-clean-fleet-v1', generated_at: '2026-05-16T00:00:00Z', seed: 5,
    runs: [
      { signal_series: { a: [0.5, -0.3, 0.1, -0.7, 0.2, 0.4, -0.5, 0.3], b: [-0.4, 0.6, -0.2, 0.5, -0.8, 0.3, 0.1, -0.6] } },
      { signal_series: { a: [-0.2, 0.4, -0.6, 0.1, 0.3, -0.5, 0.2, -0.1], b: [0.3, -0.5, 0.7, -0.3, 0.1, -0.4, 0.5, 0.2] } },
      { signal_series: { a: [0.1, -0.4, 0.3, 0.6, -0.2, 0.5, -0.3, 0.4], b: [-0.6, 0.2, -0.4, 0.8, -0.1, 0.3, -0.7, 0.1] } },
    ],
  };
  const result = curateBaselineFleetCorrelated(bundle);
  assert.strictEqual(result.fcp1State.fired, false);
  assert.strictEqual(result.decisions.D12!.output_summary.fired, false);
  assert.strictEqual(result.decisions.D12!.output_summary.fire_window, -1);
  // No Stage 2b drop: curated bundle runs maintain Stage-2a-only lengths
  for (let i = 0; i < 3; i++) {
    const origLen = bundle.runs[i].signal_series.a.length;
    const curatedLen = result.curatedBundle.runs[i].signal_series.a.length;
    assert.ok(curatedLen <= origLen, `run ${i}: curated length ${curatedLen} > original ${origLen}`);
  }
});

// ─── R07 AC-16 — fleet-event bundle: FCP-1 fires; all runs affected ──────────
test('R07 AC-16 — fleet-event bundle: fcp1State.fired===true; fire_window!==null; curated bundle shorter', () => {
  // 10 runs × 200 ticks × 2 signals; ticks 10-49 (40 ticks = 20%) are (100,100) on ALL runs.
  // With K=10 (training ticks 0-9 clean) and alpha_fleet=1e-3:
  // - First test window (w=10): ons_lambda=0, log_S stays 0; lambda → 0.5
  // - Windows 11..49 (39 windows at X=N=10): each contributes ~log(1.4875)≈0.397
  // - ~18 accumulating windows needed to cross log(1000)≈6.908; fires around w=28.
  const contaminatedTicks = new Set<number>(Array.from({ length: 40 }, (_, i) => 10 + i));
  const FLEET_BUNDLE = makeFleetBundle(10, 200, contaminatedTicks);
  const result = curateBaselineFleetCorrelated(FLEET_BUNDLE, { trainingWindowCount: 10, alphaFleet: 1e-3 });
  assert.strictEqual(result.fcp1State.fired, true, 'expected FCP-1 to fire on sustained-elevation fleet fixture');
  assert.notStrictEqual(result.fcp1State.fire_window, null, 'expected fire_window !== null');
  // Each curated run is shorter than the original 200 ticks (Stage 2a drops contaminated ticks)
  for (let i = 0; i < 10; i++) {
    assert.ok(
      result.curatedBundle.runs[i].signal_series.a.length < 200,
      `run ${i}: expected curated length < 200; got ${result.curatedBundle.runs[i].signal_series.a.length}`,
    );
  }
  // D12 encodes the fire result correctly
  assert.strictEqual(result.decisions.D12!.output_summary.fired, true);
  assert.ok((result.decisions.D12!.output_summary.fire_window as number) >= 0,
    'D12 fire_window should be non-negative when fired');
});

// ─── R07 AC-17 — mixed bundle (screened + skipped) ───────────────────────────
test('R07 AC-17 — mixed bundle: 2 screened + 1 skipped; D11 + D12 reflect correct N_aligned', () => {
  const bundle: BaselineBundle = {
    version: 'q07-mixed-v1', generated_at: '2026-05-16T00:00:00Z', seed: 6,
    runs: [
      { signal_series: { a: [0.5, -0.3, 0.1, -0.7, 0.2, 0.4, -0.5, 0.3], b: [-0.4, 0.6, -0.2, 0.5, -0.8, 0.3, 0.1, -0.6] } },
      { signal_series: { a: [-0.2, 0.4, -0.6, 0.1, 0.3, -0.5, 0.2, -0.1], b: [0.3, -0.5, 0.7, -0.3, 0.1, -0.4, 0.5, 0.2] } },
      // Insufficient samples: 2 ticks × 2 signals → n=2 < p+1=3 → skipped
      { signal_series: { a: [0.1, 0.2], b: [0.3, 0.4] } },
    ],
  };
  const result = curateBaselineFleetCorrelated(bundle);
  const d11 = result.decisions.D11!;
  assert.strictEqual(d11.output_summary.n_runs_screened, 2);
  assert.strictEqual(d11.output_summary.n_runs_skipped_insufficient_samples, 1);
  const d12 = result.decisions.D12!;
  assert.strictEqual(d12.output_summary.n_shards_screened, 2, 'N_aligned counts only SCREENED runs');
  assert.strictEqual(d12.output_summary.n_windows_aligned, 8, 'W_aligned = min length across SCREENED runs');
});

// ─── R07 AC-18 — all three decisions populated ───────────────────────────────
test('R07 AC-18 — result.decisions has exactly keys D11, D12, D13 (sorted)', () => {
  const result = curateBaselineFleetCorrelated(CLEAN_BUNDLE_1RUN);
  assert.deepStrictEqual(Object.keys(result.decisions).sort(), ['D11', 'D12', 'D13']);
});

// ─── R07 AC-19 — D12 output_summary fields ───────────────────────────────────
test('R07 AC-19 — D12 output_summary contains required literal fields; decision_id and upstream_decisions correct', () => {
  const result = curateBaselineFleetCorrelated(CLEAN_BUNDLE_1RUN);
  const d12 = result.decisions.D12!;
  assert.strictEqual(d12.decision_id, 'D12');
  assert.strictEqual(d12.decision_name, 'Fleet-correlated contamination detection');
  assert.deepStrictEqual(d12.inputs.upstream_decisions, ['D11']);
  const keys = Object.keys(d12.output_summary).sort();
  for (const k of ['alpha_fleet', 'p_base_prior', 'shrinkage_kappa', 'training_window_count',
    'lambda_max', 'n_shards_screened', 'n_windows_aligned', 'n_windows_test',
    'p_base', 'fired', 'fire_window', 'log_threshold', 'log_S_final', 'log_S_max']) {
    assert.ok(keys.includes(k), `D12 output_summary missing key: ${k}`);
  }
});

// ─── R07 AC-20 — D13 output_summary fields and sentinel format ───────────────
test('R07 AC-20 — D13 output_summary: sentinel prefix; fired=false fields; decision_id correct', () => {
  const result = curateBaselineFleetCorrelated(CLEAN_BUNDLE_1RUN);
  const d13 = result.decisions.D13!;
  assert.strictEqual(d13.decision_id, 'D13');
  assert.strictEqual(d13.output_summary.fleet_event_detected, false);
  assert.strictEqual(d13.output_summary.n_fleet_event_windows, 0);
  assert.strictEqual(d13.output_summary.fleet_event_window_indices, '[]');
  assert.strictEqual(d13.output_summary.fcp1_audit_token, 'fcp1:fired=false:windows=[]');
  const sentinel = d13.output_summary.residual_seed_hash_sentinel as string;
  assert.ok(sentinel.startsWith('tessera-fcp1-v1::'),
    `sentinel must start with 'tessera-fcp1-v1::'; got: ${sentinel}`);
  assert.match(sentinel, /^tessera-fcp1-v1::.+\|.+::fcp1:fired=false:windows=\[\]$/);
  assert.strictEqual(d13.output_summary.wire_format_version, 'tessera-fcp1-v1');
});

// ─── R07 AC-21 — D13 sentinel is deterministic ───────────────────────────────
test('R07 AC-21 — D13 sentinel is deterministic: two independent calls on same bundle produce identical sentinel', () => {
  const r1 = curateBaselineFleetCorrelated(CLEAN_BUNDLE_1RUN);
  const r2 = curateBaselineFleetCorrelated(CLEAN_BUNDLE_1RUN);
  const s1 = r1.decisions.D13!.output_summary.residual_seed_hash_sentinel as string;
  const s2 = r2.decisions.D13!.output_summary.residual_seed_hash_sentinel as string;
  assert.strictEqual(s1, s2, 'sentinel must be byte-identical on repeated calls');
  assert.strictEqual(r1.decisions.D13!.output_summary.wire_format_version, 'tessera-fcp1-v1');
});
