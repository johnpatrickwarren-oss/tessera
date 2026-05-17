// test/q06-baseline-pre-pass.test.ts — R06 AC-1 through AC-13.
//
// Binds the SLICE 4 Stage 2a per-shard within-window contamination screening at
// tools/curate-baseline-pre-pass.ts + Stage 3a format-compatibility on the curated
// bundle output.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { BaselineBundle, BaselineCurationDecision } from '../engine/types/config';
import {
  curateBaselinePrePass,
  type PrePassResult,
} from '../tools/curate-baseline-pre-pass';

// ─── Fixtures ───────────────────────────────────────────────────────

/** Clean fixture: 8 ticks × 2 signals; no outliers; all values drawn from a
 *  zero-mean roughly-unit-variance distribution. Fixed literals so the test
 *  is deterministic. */
const CLEAN_BUNDLE: BaselineBundle = {
  version: 'q06-clean-v1',
  generated_at: '2026-05-16T00:00:00Z',
  seed: 1,
  runs: [
    {
      tenant_id: 's0',
      signal_series: {
        a: [0.5, -0.3, 0.1, -0.7, 0.2, 0.4, -0.5, 0.3],
        b: [-0.4, 0.6, -0.2, 0.5, -0.8, 0.3, 0.1, -0.6],
      },
    },
  ],
};

/** Outlier fixture: same shape as CLEAN_BUNDLE, but tick 7 is replaced with a
 *  high-magnitude (100, 100) outlier that MCD should reject from the h-subset
 *  and the Mahalanobis-cutoff screening should flag as contaminated. */
const OUTLIER_BUNDLE: BaselineBundle = {
  version: 'q06-outlier-v1',
  generated_at: '2026-05-16T00:00:00Z',
  seed: 2,
  runs: [
    {
      tenant_id: 's0',
      signal_series: {
        a: [0.5, -0.3, 0.1, -0.7, 0.2, 0.4, -0.5, 100],
        b: [-0.4, 0.6, -0.2, 0.5, -0.8, 0.3, 0.1, 100],
      },
    },
  ],
};

/** Insufficient-samples fixture: 2 ticks × 2 signals → n < p+1 → skip-and-pass-through. */
const INSUFFICIENT_BUNDLE: BaselineBundle = {
  version: 'q06-insufficient-v1',
  generated_at: '2026-05-16T00:00:00Z',
  seed: 3,
  runs: [
    {
      tenant_id: 's0',
      signal_series: { a: [0.1, 0.2], b: [0.3, 0.4] },
    },
  ],
};

/** Two-run fixture: one clean run + one outlier run, both with hour_of_day labels. */
const TWO_RUN_BUNDLE: BaselineBundle = {
  version: 'q06-two-run-v1',
  generated_at: '2026-05-16T00:00:00Z',
  seed: 4,
  cell_dim: 'hour_of_day',
  runs: [
    {
      tenant_id: 's0',
      signal_series: {
        a: [0.5, -0.3, 0.1, -0.7, 0.2, 0.4, -0.5, 0.3],
        b: [-0.4, 0.6, -0.2, 0.5, -0.8, 0.3, 0.1, -0.6],
      },
      hour_of_day: [0, 1, 2, 3, 4, 5, 6, 7],
    },
    {
      tenant_id: 's1',
      signal_series: {
        a: [0.5, -0.3, 0.1, -0.7, 0.2, 0.4, -0.5, 100],
        b: [-0.4, 0.6, -0.2, 0.5, -0.8, 0.3, 0.1, 100],
      },
      hour_of_day: [8, 9, 10, 11, 12, 13, 14, 15],
    },
  ],
};

// ─── R06 AC-1 — empty bundle round-trips ────────────────────────────
test('R06 AC-1 — empty bundle.runs[] produces empty curatedBundle.runs[] and D11 with all-zero summary', () => {
  const bundle: BaselineBundle = {
    version: 'q06-empty-v1', generated_at: '2026-05-16T00:00:00Z', seed: 0, runs: [],
  };
  const result = curateBaselinePrePass(bundle);
  assert.deepStrictEqual(result.curatedBundle.runs, []);
  const d11 = result.decisions.D11!;
  assert.strictEqual(d11.decision_id, 'D11');
  assert.strictEqual(d11.output_summary.n_runs_total, 0);
  assert.strictEqual(d11.output_summary.n_runs_screened, 0);
  assert.strictEqual(d11.output_summary.n_ticks_total, 0);
  assert.strictEqual(d11.output_summary.n_ticks_contaminated, 0);
  assert.strictEqual(d11.output_summary.contamination_rate, 0);
});

// ─── R06 AC-2 — clean bundle: run is screened; contamination is bounded ─
test('R06 AC-2 — clean bundle: run was screened (not skipped) AND at most 2 ticks flagged (≤ MCD trim count)', () => {
  const result = curateBaselinePrePass(CLEAN_BUNDLE);
  assert.strictEqual(result.curatedBundle.runs.length, 1);
  const d11 = result.decisions.D11!;
  // The clean run was actually screened (not skipped):
  assert.strictEqual(d11.output_summary.n_runs_screened, 1);
  assert.strictEqual(d11.output_summary.n_runs_skipped_insufficient_samples, 0);
  assert.strictEqual(d11.output_summary.n_runs_skipped_mcd_failed, 0);
  assert.strictEqual(d11.output_summary.n_ticks_total, 8);
  // On clean data, MCD picks the h=6 robust subset; the 2 trimmed samples may
  // or may not pass the chi²₂(0.975) cutoff at the reweight step. We bound the
  // contamination count from above (≤2) to keep this AC robust under MCD's
  // seed-dependent subset choice while still requiring that NO clean fixture
  // gets mass-flagged. Determinism property (separate from this bound): for a
  // fixed seed FASTMCD_DEFAULT_SEED, the exact count is reproducible — the
  // Implementer's GREEN-state binding command output is the truth-of-record
  // for the observed count; AC-2 binds the bounded-from-above invariant only.
  // Cast through `number` because the inherited output_summary type is
  // Record<string, number | string | boolean>; the D11 emitter populates the
  // counter fields as numbers (see tools/curate-baseline-pre-pass.ts:Delta 5).
  assert.ok((d11.output_summary.n_ticks_contaminated as number) <= 2,
    `expected n_ticks_contaminated <= 2 on clean fixture; got ${d11.output_summary.n_ticks_contaminated}`);
  // Curated bundle preserves at least the 6 ticks in the MCD h-subset:
  assert.ok(result.curatedBundle.runs[0].signal_series.a.length >= 6,
    `expected ≥6 ticks preserved on clean fixture; got ${result.curatedBundle.runs[0].signal_series.a.length}`);
  assert.strictEqual(
    result.curatedBundle.runs[0].signal_series.a.length,
    result.curatedBundle.runs[0].signal_series.b.length,
    'both signal series must have identical post-curation length',
  );
});

// ─── R06 AC-3 — chiSqQuantile975 cutoff is the contamination threshold ─
test('R06 AC-3 — D11 records mcd_method===\'mcd\' and mcd_alpha===0.75 (FASTMCD_DEFAULT_ALPHA)', () => {
  const result = curateBaselinePrePass(CLEAN_BUNDLE);
  const d11 = result.decisions.D11!;
  assert.strictEqual(d11.output_summary.mcd_method, 'mcd');
  assert.strictEqual(d11.output_summary.mcd_alpha, 0.75);
});

// ─── R06 AC-4 — outlier bundle: tick 7 dropped; D11 reports at least 1 contamination ─
test('R06 AC-4 — outlier bundle: tick 7 (100, 100) flagged; surviving signal_series omits the 100 values', () => {
  const result = curateBaselinePrePass(OUTLIER_BUNDLE);
  const d11 = result.decisions.D11!;
  // The outlier-injected run was screened (not skipped) and reports at least the outlier:
  assert.strictEqual(d11.output_summary.n_runs_screened, 1);
  assert.strictEqual(d11.output_summary.n_runs_skipped_insufficient_samples, 0);
  assert.strictEqual(d11.output_summary.n_runs_skipped_mcd_failed, 0);
  assert.strictEqual(d11.output_summary.n_ticks_total, 8);
  // At least the outlier tick was flagged (MCD α=0.75 → h=6 trims 2; outlier is one of them
  // with Mahalanobis ≫ cutoff against the clean robust subset; reweight cannot recover it):
  // Casts through `number` per the inherited output_summary union type (see AC-2 comment).
  assert.ok((d11.output_summary.n_ticks_contaminated as number) >= 1,
    `expected ≥1 tick flagged on outlier fixture; got ${d11.output_summary.n_ticks_contaminated}`);
  // The contamination is bounded from above by the MCD trim count + 1 (allow the original
  // h=6 + 2 trimmed scenario; the outlier is reliably flagged, the other trimmed tick
  // may or may not pass the reweight cutoff — at most 3 ticks flagged total):
  assert.ok((d11.output_summary.n_ticks_contaminated as number) <= 3,
    `expected ≤3 ticks flagged on outlier fixture; got ${d11.output_summary.n_ticks_contaminated}`);
  // Behavioral check: the surviving signal_series.a array does NOT contain the 100 value
  // (i.e., the outlier was actually dropped, not just counted):
  assert.ok(!result.curatedBundle.runs[0].signal_series.a.includes(100),
    'curated bundle still contains the outlier value 100 in signal a');
  assert.ok(!result.curatedBundle.runs[0].signal_series.b.includes(100),
    'curated bundle still contains the outlier value 100 in signal b');
  // contamination_rate is consistent with n_ticks_contaminated / 8:
  assert.strictEqual(
    d11.output_summary.contamination_rate,
    (d11.output_summary.n_ticks_contaminated as number) / 8,
  );
});

// ─── R06 AC-5 — insufficient samples: pass-through; skip counter incremented ─
test('R06 AC-5 — n < p+1: run passed through verbatim; n_runs_skipped_insufficient_samples increments', () => {
  const result = curateBaselinePrePass(INSUFFICIENT_BUNDLE);
  // Run passed through unchanged (signal_series content + length both preserved):
  assert.deepStrictEqual(
    result.curatedBundle.runs[0].signal_series.a,
    INSUFFICIENT_BUNDLE.runs[0].signal_series.a,
  );
  assert.deepStrictEqual(
    result.curatedBundle.runs[0].signal_series.b,
    INSUFFICIENT_BUNDLE.runs[0].signal_series.b,
  );
  const d11 = result.decisions.D11!;
  assert.strictEqual(d11.output_summary.n_runs_total, 1);
  assert.strictEqual(d11.output_summary.n_runs_screened, 0);
  assert.strictEqual(d11.output_summary.n_runs_skipped_insufficient_samples, 1);
  assert.strictEqual(d11.output_summary.n_runs_skipped_mcd_failed, 0);
  assert.strictEqual(d11.output_summary.n_ticks_total, 0);  // skipped runs don't contribute to n_ticks_total
  assert.strictEqual(d11.output_summary.contamination_rate, 0);
});

// ─── R06 AC-6 — two-run bundle: per-run counters accumulate; hour_of_day filtered correctly ─
test('R06 AC-6 — two-run bundle: clean + outlier counted independently; hour_of_day[] length matches signal_series', () => {
  const result = curateBaselinePrePass(TWO_RUN_BUNDLE);
  assert.strictEqual(result.curatedBundle.runs.length, 2);
  // Both runs were screened (not skipped):
  const d11 = result.decisions.D11!;
  assert.strictEqual(d11.output_summary.n_runs_total, 2);
  assert.strictEqual(d11.output_summary.n_runs_screened, 2);
  assert.strictEqual(d11.output_summary.n_runs_skipped_insufficient_samples, 0);
  assert.strictEqual(d11.output_summary.n_runs_skipped_mcd_failed, 0);
  assert.strictEqual(d11.output_summary.n_ticks_total, 16);
  // Per-run array-length parallelism: hour_of_day length equals signal_series length on EACH run.
  // (This is the load-bearing invariant for downstream calibrate.ts consumption — labels and
  // values must remain aligned after Stage 2a filtering.)
  assert.strictEqual(
    result.curatedBundle.runs[0].hour_of_day!.length,
    result.curatedBundle.runs[0].signal_series.a.length,
    'run 0: hour_of_day length must equal signal_series.a length',
  );
  assert.strictEqual(
    result.curatedBundle.runs[1].hour_of_day!.length,
    result.curatedBundle.runs[1].signal_series.a.length,
    'run 1: hour_of_day length must equal signal_series.a length',
  );
  // Run 1's outlier value 100 was dropped (behavioral check, not count-specific):
  assert.ok(!result.curatedBundle.runs[1].signal_series.a.includes(100),
    'run 1: curated signal a still contains the outlier value 100');
  // Contamination accumulates: at least 1 tick flagged (run 1's outlier); bounded above by
  // the MCD trim count across both runs (≤2 per run + outlier headroom + safety):
  assert.ok((d11.output_summary.n_ticks_contaminated as number) >= 1,
    `expected ≥1 tick flagged across both runs; got ${d11.output_summary.n_ticks_contaminated}`);
  assert.ok((d11.output_summary.n_ticks_contaminated as number) <= 6,
    `expected ≤6 ticks flagged across both runs; got ${d11.output_summary.n_ticks_contaminated}`);
  assert.strictEqual(
    d11.output_summary.contamination_rate,
    (d11.output_summary.n_ticks_contaminated as number) / 16,
  );
});

// ─── R06 AC-7 — Stage 3a format compatibility: curatedBundle satisfies BaselineBundle field set ─
test('R06 AC-7 — curatedBundle.keys() === BaselineBundle field set (Stage 3a structural typing)', () => {
  const result = curateBaselinePrePass(TWO_RUN_BUNDLE);
  // BaselineBundle has: version, generated_at, seed, cell_dim?, runs.
  // TWO_RUN_BUNDLE sets cell_dim; expect 5 keys.
  const keys = Object.keys(result.curatedBundle).sort();
  assert.deepStrictEqual(keys, ['cell_dim', 'generated_at', 'runs', 'seed', 'version']);
  assert.strictEqual(result.curatedBundle.version, TWO_RUN_BUNDLE.version);
  assert.strictEqual(result.curatedBundle.generated_at, TWO_RUN_BUNDLE.generated_at);
  assert.strictEqual(result.curatedBundle.seed, TWO_RUN_BUNDLE.seed);
  assert.strictEqual(result.curatedBundle.cell_dim, TWO_RUN_BUNDLE.cell_dim);
});

// ─── R06 AC-8 — input bundle immutability ────────────────────────────
test('R06 AC-8 — input bundle is not mutated across curateBaselinePrePass call', () => {
  const before = JSON.stringify(OUTLIER_BUNDLE);
  curateBaselinePrePass(OUTLIER_BUNDLE);
  const after = JSON.stringify(OUTLIER_BUNDLE);
  assert.strictEqual(before, after);
});

// ─── R06 AC-9 — D11 decision_id literal binding ─────────────────────
test('R06 AC-9 — D11 decision_id is the literal string \'D11\' (binds BaselineCurationDecisionId Delta 1)', () => {
  const result = curateBaselinePrePass(CLEAN_BUNDLE);
  const d11: BaselineCurationDecision = result.decisions.D11!;
  assert.strictEqual(d11.decision_id, 'D11');
  assert.strictEqual(d11.decision_name, 'Per-shard within-window contamination screening');
  assert.strictEqual(d11.verification.audit_emitted, true);
  assert.strictEqual(d11.verification.diagnostic_path, 'CompiledConfig.baseline_curation_pipeline_diagnostics.D11');
});

// ─── R06 AC-10 — D11 inputs.upstream_decisions === undefined (foundational decision) ─
test('R06 AC-10 — D11 inputs.upstream_decisions === undefined (D11 is a foundational decision)', () => {
  const result = curateBaselinePrePass(CLEAN_BUNDLE);
  assert.strictEqual(result.decisions.D11!.inputs.upstream_decisions, undefined);
});

// ─── R06 AC-11 — only D11 is populated (D12/D13 reserved for R07) ───
test('R06 AC-11 — result.decisions only contains D11; D12 and D13 are absent (R07 reserved)', () => {
  const result = curateBaselinePrePass(CLEAN_BUNDLE);
  const decisionKeys = Object.keys(result.decisions).sort();
  assert.deepStrictEqual(decisionKeys, ['D11']);
});

// ─── R06 AC-12 — opts.mcdAlpha override propagates to D11.output_summary.mcd_alpha ─
test('R06 AC-12 — opts.mcdAlpha override propagates to D11.output_summary.mcd_alpha', () => {
  const result = curateBaselinePrePass(CLEAN_BUNDLE, { mcdAlpha: 0.9 });
  assert.strictEqual(result.decisions.D11!.output_summary.mcd_alpha, 0.9);
});

// ─── R06 AC-13 — bundle without cell_dim produces curated bundle without cell_dim ─
test('R06 AC-13 — bundle.cell_dim === undefined: curatedBundle.cell_dim is also undefined', () => {
  const result = curateBaselinePrePass(CLEAN_BUNDLE);
  // CLEAN_BUNDLE has no cell_dim; curated must not introduce one.
  assert.strictEqual(result.curatedBundle.cell_dim, undefined);
  assert.ok(!('cell_dim' in result.curatedBundle) || result.curatedBundle.cell_dim === undefined);
});
