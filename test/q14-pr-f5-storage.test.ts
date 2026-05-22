// test/q14-pr-f5-storage.test.ts — R14 AC-8 through AC-10; R16 AC-R16-1/2.
//
// PR-F5 empirical storage profile measurement at synthetic N=1000 cluster.
// Measures JSON serialization footprint of per_shard_cells vs fleet-aggregate
// baseline; evaluates against architect's 1.2-1.5× single-instance prediction.
//
// Note on prediction interpretation: the architect's "1.2-1.5× single-instance
// footprint" is interpreted as (fleetBaseline + perShard) / fleetBaseline. At
// N=1000 × K=168 × d=10 with warm_start residuals (fully-populated welford_state),
// the ratio will be substantially > 1.5×. AC-8 documents the actual measurement;
// AC-9 confirms sparse encoding reduces footprint at 'none' tier; AC-10 confirms
// linear scaling across shards.
//
// Deviation rationale (pre-documented): prediction assumed high-d (d≈50+) fleet
// baseline with proportionally larger family_C covariance matrices. At d=10, per-
// shard welford_state (n + mean[10] + m2[10×10] = 111 fields) dominates the fleet
// baseline per cell. Architect pre-prediction footnote: "diagonal-only optimization
// deferrable to Phase 1 SLICE 3+ if PR-F5 evidence justifies."
//
// R16 (AC-R16-1/2): d-parameterized re-measurement at d ∈ {10, 25, 50, 100}.
// Uses single-shard proxy + N extrapolation (safe for all d; avoids OOM at d=100).
// Tests the d-mismatch hypothesis: does the ratio approach 1.2-1.5× at high d?

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makePerShardResidual, makePerShardCell, makeCellKey } from './_substrate/factories';
import type { PerShardCell, BaselineCellEntry } from '@johnpatrickwarren-oss/deploysignal-engine/types/config';

// Synthetic cluster parameters
const N_SHARDS = 1000;
const K_CELLS = 168;
const D_SIGNALS = 10;

/** Build a minimal fleet-aggregate baseline: K cells each with family_C populated. */
function buildFleetBaseline(): BaselineCellEntry[] {
  const meanVector = Array.from({ length: D_SIGNALS }, (_, i) => i * 0.1);
  const covariance = Array.from({ length: D_SIGNALS }, (_, i) =>
    Array.from({ length: D_SIGNALS }, (_, j) => i === j ? 1.0 : 0.0),
  );
  return Array.from({ length: K_CELLS }, (_, k) => ({
    key: makeCellKey({ hour_of_day: k % 24 }),
    n_samples: 1000,
    confidence: 'strict' as const,
    family_C: { mean_vector: meanVector, covariance },
  }));
}

/** Build per_shard_cells at warm_start tier (n=25, fully-populated welford_state). */
function buildWarmStartPerShardCells(): PerShardCell[] {
  const mean = Array.from({ length: D_SIGNALS }, (_, i) => i * 0.2);
  const m2 = Array.from({ length: D_SIGNALS }, (_, i) =>
    Array.from({ length: D_SIGNALS }, (_, j) => i === j ? 2.0 : 0.0),
  );
  const cells: PerShardCell[] = [];
  for (let s = 0; s < N_SHARDS; s++) {
    for (let k = 0; k < K_CELLS; k++) {
      cells.push(makePerShardCell({
        shard_id: `shard-${s}`,
        key: makeCellKey({ hour_of_day: k % 24 }),
        residual: makePerShardResidual({
          n_samples: 25,
          confidence: 'warm_start',
          residual_seed_hash: 'sha:baseline-v1',
          last_observed_at: 1000000,
          welford_state: { n: 25, mean, m2 },
        }),
      }));
    }
  }
  return cells;
}

/** Build per_shard_cells at 'none' tier (n=0, no welford_state — maximal sparsity). */
function buildSparsePerShardCells(): PerShardCell[] {
  const cells: PerShardCell[] = [];
  for (let s = 0; s < N_SHARDS; s++) {
    for (let k = 0; k < K_CELLS; k++) {
      cells.push(makePerShardCell({
        shard_id: `shard-${s}`,
        key: makeCellKey({ hour_of_day: k % 24 }),
        residual: makePerShardResidual(),  // cold-start: n_samples=0, confidence='none'
      }));
    }
  }
  return cells;
}

// ─── R14 AC-8 — storage measurement at N=1000 warm_start: bytes documented ────────────
test('R14 AC-8 — PR-F5 storage measurement: warm_start tier at N=1000 × K=168 × d=10', () => {
  const fleetBaseline = buildFleetBaseline();
  const perShardCells = buildWarmStartPerShardCells();

  const fleetBytes = JSON.stringify(fleetBaseline).length;
  const perShardBytes = JSON.stringify(perShardCells).length;

  assert.ok(fleetBytes > 0, 'fleet baseline must serialize to non-zero bytes');
  assert.ok(perShardBytes > 0, 'per-shard cells must serialize to non-zero bytes');

  // Overhead ratio: (fleetBaseline + perShard) / fleetBaseline
  const overheadRatio = (fleetBytes + perShardBytes) / fleetBytes;

  // Absolute-size bound: per-shard warm_start at N=1000 should be < 500 MB JSON
  // (1000 × 168 × ~3000 bytes per cell ≈ 504 MB; loose upper bound)
  assert.ok(perShardBytes < 500_000_000, `per-shard bytes ${perShardBytes} exceeds 500 MB`);

  // Document the measurement (test output visible to Reviewer)
  console.log(`[PR-F5] Fleet baseline: ${(fleetBytes / 1024).toFixed(1)} KB`);
  console.log(`[PR-F5] Per-shard (N=${N_SHARDS}, warm_start): ${(perShardBytes / 1024 / 1024).toFixed(1)} MB`);
  console.log(`[PR-F5] Overhead ratio (fleet+perShard)/fleet: ${overheadRatio.toFixed(1)}×`);
  console.log(`[PR-F5] Architect prediction: 1.2-1.5× at N=10000 sparse; deviation expected at N=1000 warm_start with d=10.`);
  console.log(`[PR-F5] Deviation rationale: prediction assumed high-d (d≈50+) fleet baseline; d=10 makes per-shard welford_state dominant.`);
});

// ─── R14 AC-9 — sparse 'none' tier significantly smaller than warm_start ────────────────
test('R14 AC-9 — sparse encoding: none-tier per-shard cells at least 50% smaller than warm_start', () => {
  const warmStartBytes = JSON.stringify(buildWarmStartPerShardCells()).length;
  const sparseBytes = JSON.stringify(buildSparsePerShardCells()).length;

  assert.ok(sparseBytes > 0);
  assert.ok(warmStartBytes > 0);

  // Sparse (none tier) should be at least 50% smaller than warm_start (welford_state dominates)
  const reductionPct = 1 - sparseBytes / warmStartBytes;
  assert.ok(
    reductionPct >= 0.50,
    `Sparse encoding reduces bytes by ${(reductionPct * 100).toFixed(1)}%; expected ≥ 50%`,
  );

  console.log(`[PR-F5] Warm-start bytes: ${(warmStartBytes / 1024 / 1024).toFixed(1)} MB`);
  console.log(`[PR-F5] Sparse (none) bytes: ${(sparseBytes / 1024 / 1024).toFixed(1)} MB`);
  console.log(`[PR-F5] Sparse reduction: ${(reductionPct * 100).toFixed(1)}%`);
});

// ─── R14 AC-10 — per-shard bytes scale linearly with N ──────────────────────────────────
test('R14 AC-10 — per-shard bytes scale linearly with N (ratio per-shard/single-shard ≈ N)', () => {
  // Build single-shard cells (N=1) as reference
  const singleShardCells: PerShardCell[] = Array.from({ length: K_CELLS }, (_, k) =>
    makePerShardCell({
      shard_id: 'shard-0',
      key: makeCellKey({ hour_of_day: k % 24 }),
      residual: makePerShardResidual({
        n_samples: 25,
        confidence: 'warm_start',
        residual_seed_hash: 'sha:baseline-v1',
        welford_state: {
          n: 25,
          mean: Array.from({ length: D_SIGNALS }, (_, i) => i * 0.2),
          m2: Array.from({ length: D_SIGNALS }, (_, i) =>
            Array.from({ length: D_SIGNALS }, (_, j) => i === j ? 2.0 : 0.0),
          ),
        },
      }),
    }),
  );

  const singleShardBytes = JSON.stringify(singleShardCells).length;
  const allShardsBytes = JSON.stringify(buildWarmStartPerShardCells()).length;

  assert.ok(singleShardBytes > 0);
  assert.ok(allShardsBytes > 0);

  // Expect ratio ≈ N_SHARDS = 1000 (within 10%)
  const ratio = allShardsBytes / singleShardBytes;
  assert.ok(
    Math.abs(ratio - N_SHARDS) / N_SHARDS <= 0.10,
    `Linear scaling ratio ${ratio.toFixed(2)} vs expected ${N_SHARDS} (±10%)`,
  );

  console.log(`[PR-F5] Single-shard bytes: ${(singleShardBytes / 1024).toFixed(1)} KB`);
  console.log(`[PR-F5] ${N_SHARDS}-shard bytes: ${(allShardsBytes / 1024 / 1024).toFixed(1)} MB`);
  console.log(`[PR-F5] Scaling ratio: ${ratio.toFixed(1)} (expected ${N_SHARDS})`);
});

// ─── R16 AC-R16-1/2 — dimension-dependence table: overhead ratio at d ∈ {10,25,50,100} ──
// Single-shard proxy approach: measure K fleet cells + K single-shard cells at each d,
// then extrapolate N=1000 per-shard total as N_SHARDS × singleShardBytes.
// Rationale: AC-10 verified linear scaling (ratio 1059.9 vs expected 1000, ~6% deviation);
// single-shard proxy consistent across all d values (shard_id='shard-0' fixed).
test('R16 AC-R16-1/2 — d-parameterized overhead: ratio at d ∈ {10,25,50,100}', () => {
  const K = K_CELLS;
  const N = N_SHARDS;
  const DIMS = [10, 25, 50, 100] as const;

  /** Build K fleet cells with d-dimensional family_C (mean_vector[d] + covariance[d×d]). */
  function buildFleetBaselineAtD(d: number): ReturnType<typeof buildFleetBaseline>  {
    const meanVector = Array.from({ length: d }, (_, i) => i * 0.1);
    const covariance = Array.from({ length: d }, (_, i) =>
      Array.from({ length: d }, (_, j) => (i === j ? 1.0 : 0.0)),
    );
    return Array.from({ length: K }, (_, k) => ({
      key: makeCellKey({ hour_of_day: k % 24 }),
      n_samples: 1000,
      confidence: 'strict' as const,
      family_C: { mean_vector: meanVector, covariance },
    }));
  }

  /** Build K single-shard cells with d-dimensional welford_state (mean[d] + m2[d×d]).
   *  Uses shard_id='shard-0' (fixed) for consistent extrapolation across all d values. */
  function buildSingleShardCellsAtD(d: number): PerShardCell[] {
    const mean = Array.from({ length: d }, (_, i) => i * 0.2);
    const m2 = Array.from({ length: d }, (_, i) =>
      Array.from({ length: d }, (_, j) => (i === j ? 2.0 : 0.0)),
    );
    return Array.from({ length: K }, (_, k) =>
      makePerShardCell({
        shard_id: 'shard-0',
        key: makeCellKey({ hour_of_day: k % 24 }),
        residual: makePerShardResidual({
          n_samples: 25,
          confidence: 'warm_start',
          residual_seed_hash: 'sha:baseline-v1',
          last_observed_at: 1000000,
          welford_state: { n: 25, mean, m2 },
        }),
      }),
    );
  }

  type Row = { d: number; fleetBytes: number; singleShardBytes: number; ratio: number };
  const rows: Row[] = [];

  for (const d of DIMS) {
    const fleetBytes = JSON.stringify(buildFleetBaselineAtD(d)).length;
    const singleShardBytes = JSON.stringify(buildSingleShardCellsAtD(d)).length;
    const ratio = (fleetBytes + N * singleShardBytes) / fleetBytes;
    rows.push({ d, fleetBytes, singleShardBytes, ratio });
  }

  // Print dimension-dependence table for Reviewer + operator
  console.log('\n[R16 PR-F5] Dimension-dependence table (single-shard proxy, N=1000 extrapolation):');
  console.log(`${'d'.padStart(5)} | ${'fleet KB'.padStart(10)} | ${'1-shard KB'.padStart(11)} | ${'ratio (×)'.padStart(10)}`);
  console.log(`${'-'.repeat(5)}-+-${'-'.repeat(10)}-+-${'-'.repeat(11)}-+-${'-'.repeat(10)}`);
  for (const { d, fleetBytes, singleShardBytes, ratio } of rows) {
    console.log(
      `${String(d).padStart(5)} | ${(fleetBytes / 1024).toFixed(1).padStart(10)} | ${(singleShardBytes / 1024).toFixed(1).padStart(11)} | ${ratio.toFixed(1).padStart(10)}`,
    );
  }
  console.log(`\n[R16 PR-F5] d-mismatch hypothesis: does ratio approach 1.2-1.5× at high d?`);
  console.log(`[R16 PR-F5] Answer: ratio at d=100 = ${rows[3].ratio.toFixed(1)}× — hypothesis REFUTED.`);

  // AC-R16-1: All ratios ≥ 500 (refutes d-mismatch hypothesis: target was 1.2-1.5×)
  for (const { d, ratio } of rows) {
    assert.ok(
      ratio >= 500,
      `d=${d}: ratio ${ratio.toFixed(1)}× < 500× — d-mismatch hypothesis NOT refuted at d=${d}`,
    );
  }

  // AC-R16-2: Ratio strictly decreases as d increases (d-dependence direction)
  for (let i = 1; i < rows.length; i++) {
    assert.ok(
      rows[i].ratio < rows[i - 1].ratio,
      `Monotone decrease violated: ratio(d=${rows[i].d})=${rows[i].ratio.toFixed(1)}× ≥ ratio(d=${rows[i - 1].d})=${rows[i - 1].ratio.toFixed(1)}×`,
    );
  }
});
