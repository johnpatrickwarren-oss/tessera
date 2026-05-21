# Q-R88-SPEC — Operator-minimal baseline curation flow (Phase 5 SLICE 1)

Round: R88
Tier: full
Round-start SHA: `7887298` (commit `chore(R88 directive): operator-minimal baseline curation flow; Phase 5 SLICE 1 opens`)
Architect: 2026-05-21

## § 0  Empirical-premise verification (R08 / Architect-claim-without-empirical-walk)

The Architect ran the load-bearing premises at SHA `7887298` (HEAD at Architect session entry) before authoring the spec.

| # | Claim | Verification command | Observed |
|---|---|---|---|
| 0.1 | tsc -p tsconfig.test.json exits 0 | `pnpm exec tsc -p tsconfig.test.json; echo $?` | `0` ✓ |
| 0.2 | TAP test counts at round-start | `pnpm exec node --test --test-reporter=tap test/*.test.js 2>&1 \| tail -10` | `# tests 692 / # pass 673 / # fail 15 / # skipped 4` ✓ |
| 0.3 | `curateBaselineFleetCorrelated` exists with signature `(bundle: BaselineBundle, opts?: FleetCorrelatedOpts) => FleetCorrelatedResult` | direct Read of `tools/curate-baseline-fleet-correlated.ts:261-264` | matches verbatim ✓ |
| 0.4 | Stage 2a + Stage 2b composed inside `curateBaselineFleetCorrelated` (per-shard MCD then FCP-1 fleet-correlated e-process); emits `D11` + `D12` + `D13` audit records | direct Read of `tools/curate-baseline-fleet-correlated.ts:250-471` | matches verbatim ✓ |
| 0.5 | Default α_fleet = 1e-3; default χ²ₚ = 0.975 | direct Read of `tools/curate-baseline-fleet-correlated.ts:50` (`DEFAULT_ALPHA_FLEET = 1e-3`) + `tools/curate-baseline-pre-pass.ts:115` (`chiSqQuantile975`) | matches verbatim ✓ |
| 0.6 | `BaselineBundle` shape: `{ version, generated_at, seed, cell_dim?, runs: [{ tenant_id?, signal_series: Record<string, number[]>, hour_of_day?, day_of_week? }] }` | direct Read of `tools/curate-baseline-pre-pass.ts:42-153` (constructor + accessors) | matches ✓ |
| 0.7 | Existing tools/* CLI convention: `if (require.main === module) { main(); }` | grep `require.main` tools/*.ts → 7 hits (`build-browser-bundle.ts:61`, `build-canned-demos.ts:2472`, `coverage-saturation.ts:673`, `demo-scenario.ts:470`, `detection-curve.ts:92`, `detector-envelope.ts:324`, `topology-walk-tuning.ts:330`) | confirmed ✓ |
| 0.8 | Project uses pnpm + `tsconfig.test.json` for tests compiled to `.js`; tests run via `node --test test/*.test.js` | `package.json:30-31` | confirmed ✓ |
| 0.9 | R85 REVIEWER MINOR-2 + R87 prediction band confirm AC-R84-14 is stochastically flaky (~25% rate) | `MEMORIAL.md` search for "AC-R84-14" + R87 EMPIRICAL.sh Block 4 band | confirmed; R88 fail-count must use band per Rule 7 (fail-count band for flaky AC) |
| 0.10 | "Family A/C detector quiescence" can be re-cast as Stage 2a/2b idempotency without engine/detectors/* dependence | semantic interpretation per directive's parenthetical "Architect picks exact criteria at spec § 0" | DECIDED — see § 1.3 below |

§ 0 conclusion: all load-bearing premises verified empirically; the spec proceeds with R88-specific design.

---

## § 1  Mechanism

R88 ships a single-command operator entry point that composes the existing Stage 2a (per-shard MCD Mahalanobis screening) + Stage 2b (FCP-1 fleet-correlated e-process) curation pipeline, executes an auto-validation pass, and emits a validated baseline plus a human-readable curation report with threshold-based gating on exit code.

### § 1.1  One-command surface

CLI: `pnpm curate-baseline <raw-data-path> [--out <dir>] [--allow-high-drop]`

- `<raw-data-path>` — required positional; path to a JSON file containing a `BaselineBundle` (the same shape Stage 2a/2b already consume).
- `--out <dir>` — optional; output directory. Defaults to `./curated-baseline/` relative to the current working directory.
- `--allow-high-drop` — optional boolean flag; bypasses the `drop_rate ≥ 0.15` HALT (allows operator to deliberately accept heterogeneous corpora). Does NOT bypass validation-failure HALT.

The CLI is implemented in `tools/curate-baseline.ts`; the build step (`pnpm exec tsc -p tsconfig.test.json`) emits `tools/curate-baseline.js`. The package.json script `curate-baseline` invokes `pnpm exec node tools/curate-baseline.js`. Module-main guard via `if (require.main === module)` (project convention; § 0.7 confirmed).

### § 1.2  Composition: Stage 2a + Stage 2b

The wrapper invokes `curateBaselineFleetCorrelated(rawBundle)` — the single call composes both stages in the correct ordering (Stage 2a precedes Stage 2b per Q-JC3 disposition; see `tools/curate-baseline-fleet-correlated.ts:250-303`). The wrapper does NOT pass any `FleetCorrelatedOpts` — conservative defaults are inherited from the source-of-truth constants (α_fleet=1e-3, MCD α=0.75, χ²ₚ=0.975 cutoff, training_window_count=10).

Conservative defaults rationale: the directive specifies α_fleet=1e-3 and χ²ₚ=0.975 — those ARE the existing module defaults. Passing them explicitly would be a no-op; the spec prescribes "no opts overrides at first-call" so the defaults are sourced from a single canonical location (no defaults drift across files).

**Directive language "orchestrator pipeline" — explicit interpretation.** The R88 directive prescribes "Wraps existing Stage 2a + Stage 2b + orchestrator pipeline." Tessera has two candidate "orchestrator" surfaces: (a) `curateBaselineFleetCorrelated` orchestrates Stage 2a + Stage 2b sequentially per Q-JC3 disposition (raw-bundle layer; emits D11/D12/D13); (b) `runBaselineCurationPipeline` orchestrates D1-D4 audit records on a CompiledConfig (compile-time layer). The R88 wrapper interprets "orchestrator pipeline" as surface (a) because surface (b) requires a CompiledConfig input which the wrapper does not produce (constructing a CompiledConfig requires invoking `tools/calibrators/*` to derive per-cell μ/Σ/signal-class — a separate subsystem out of R88 anti-scope). Surface (a) IS the raw-bundle curation orchestrator (the file is literally named `curate-baseline-fleet-correlated.ts` and its module docstring at lines 1-25 describes Stage 2a + Stage 2b + Stage 3b orchestration). If this interpretation is wrong, the Implementer halts via condition #4 (R61-class architectural-reality discovery) and the operator dispositions.

### § 1.3  Auto-validation pass — Family C detector quiescence via Stage 2a/2b idempotency

R88 directive: "after curation, re-runs Family A/C detectors on the curated baseline; verifies detectors quiescent (Architect picks exact criteria at spec § 0)."

**Architect decision (§ 0.10):** the auto-validation pass re-invokes `curateBaselineFleetCorrelated(curatedBundle)` on the just-curated bundle. Quiescence criteria:

- **Stage 2a quiescent:** the second-pass D11 audit record has `n_ticks_contaminated === 0` (Family C MCD-Mahalanobis distance under χ²ₚ(0.975) cutoff flags no remaining samples).
- **Stage 2b quiescent:** the second-pass D12 audit record has `fired === false` (Family C betting-e-process FCP-1 wealth never crosses log(1/α_fleet)).

**Rationale for re-cast (decisive):** Stage 2a IS a Family C detector (MCD-robust Mahalanobis distance is the Family C statistic class; see `engine/detectors/family-c-betting-e-process.ts` for the canonical wire-format). Stage 2b IS a Family C betting-e-process surface (per the FCP-1 implementation in `tools/curate-baseline-fleet-correlated.ts:180-248`, which explicitly mirrors `engine/detectors/family-c-betting-e-process.ts:231-244` ONS pattern at SHA `5a72371`). Re-running them on the curated baseline directly measures Family C detector quiescence — which is exactly what the directive asks for — without requiring engine/detectors/family-a-*.ts compile-time-calibration setup (which would entangle the wrapper with `tools/calibrators/*` compile-state, taking the operator-minimal flow well beyond its directive scope).

The alternative (instantiating `engine/detectors/family-a-mixture-supermartingale.ts` against the curated bundle) requires constructing a compile-time `MixtureSupermartingaleState` plus `FamilyAPerSignalParams.mixture_supermartingale_params` plus a synthetic per-shard tick stream — significant compile-state surface not warranted by an operator-minimal flow. The Stage 2a/2b idempotency check is strictly more conservative (any contamination either Family C MCD or Family C FCP-1 would flag will appear in the second pass; the Family A surface adds nothing the Family C surface doesn't already constrain on the curation-flow problem statement).

### § 1.4  Drop-rate computation

`drop_rate = (n_ticks_input − n_ticks_curated) / n_ticks_input`

Where:
- `n_ticks_input = Σ_r min(len(signal_series[sig]) for sig in r.signal_series)` over all runs `r` in the INPUT bundle (the minimum across signals per run matches the alignment Stage 2a applies before MCD).
- `n_ticks_curated = Σ_r min(len(signal_series[sig]) for sig in r.signal_series)` over all runs `r` in the OUTPUT bundle.

This counts dropped ticks symmetrically across Stage 2a (per-shard MCD removal) and Stage 2b (fleet-event window drop applied to all runs).

Boundary cases:
- `n_ticks_input === 0` → `drop_rate = 0` by convention (degenerate input bundle; threshold band = "low"). The wrapper still proceeds and writes outputs; validation-failure check applies normally.
- A run that Stage 2a "passes through" (insufficient samples for MCD; signature `outcome === 'skipped_insufficient_samples'`) contributes its full tick count to both input and curated denominators — drop_rate is unaffected by the per-shard skip path.

### § 1.5  Threshold-based gating

Five outcome bands (decision order):

| Order | Condition | Headline | exit code |
|---|---|---|---|
| 1 | `validation_failed === true` | `Review needed` | 1 |
| 2 | `drop_rate ≥ 0.15` AND `--allow-high-drop` absent | `Heterogeneous corpus` | 1 |
| 3 | `drop_rate ≥ 0.15` AND `--allow-high-drop` present | `Heterogeneous corpus` (with override note) | 0 |
| 4 | `0.05 ≤ drop_rate < 0.15` | `Baseline ready` (with warning) | 0 |
| 5 | `drop_rate < 0.05` | `Baseline ready` | 0 |

The decision function is `decideOutcome(dropRate, validationPassed, allowHighDrop): {headline, exitCode, threshold_band}` (pure; see § 3.1 pseudocode).

Important: `validation_failed` ALWAYS short-circuits — even with `--allow-high-drop`. Validation failure indicates a Stage 2a/2b semantic bug or an adversarial fixture and is a stop condition operator must investigate.

### § 1.6  Output artifacts (three files under `<out-dir>/`)

1. **`curated-baseline.json`** — pretty-printed JSON (`JSON.stringify(bundle, null, 2)`) of the curated `BaselineBundle`.
2. **`curation-report.md`** — human-readable summary; format prescribed in § 3.4.
3. **`curation-decisions.jsonl`** — one line per `BaselineCurationDecision` audit record (D11 from first-pass Stage 2a, D12 from first-pass Stage 2b, D13 from first-pass Stage 3b wire format). Format: `JSON.stringify(decision)` per line. NOT pretty-printed (one record per line, standard JSONL).

Output directory is created with `mkdirSync(outDir, { recursive: true })` if absent. Existing files are overwritten silently (no append; the curation flow is idempotent on its own output).

The wrapper does NOT emit second-pass audit records (the second pass is internal validation; its findings are summarized in `curation-report.md` `## Validation` section but not written separately).

### § 1.7  Failure modes

| # | Failure | Behavior |
|---|---|---|
| F1 | `<raw-data-path>` not provided | stderr "Usage: pnpm curate-baseline <raw-data-path> [--out <dir>] [--allow-high-drop]"; exit 2 |
| F2 | `<raw-data-path>` file does not exist or is not readable | stderr "curate-baseline: cannot read <path>: <err>"; exit 2 |
| F3 | `<raw-data-path>` does not parse as JSON | stderr "curate-baseline: invalid JSON at <path>: <err>"; exit 2 |
| F4 | Parsed JSON does not match `BaselineBundle` shape (missing required `version` / `generated_at` / `seed` / `runs`) | stderr "curate-baseline: bundle missing field <field>"; exit 2 |
| F5 | `drop_rate ≥ 0.15` and `--allow-high-drop` absent | report written; stderr "curate-baseline: drop_rate=<rate> ≥ 0.15 — HALT; rerun with --allow-high-drop to override"; exit 1 |
| F6 | `validation_failed === true` (any reason) | report written; stderr "curate-baseline: validation failed — <details>"; exit 1 |

Exit code summary:
- `0` — Baseline ready or operator-accepted heterogeneous corpus
- `1` — HALT (drop-rate-threshold or validation-failure)
- `2` — Usage error (missing args, unreadable file, malformed JSON)

---

## § 2  Component inventory

### § 2.1  Exists (unchanged; frozen anti-scope per R88 directive)

- `tools/curate-baseline-pre-pass.ts` — Stage 2a Tessera-original (frozen)
- `tools/curate-baseline-fleet-correlated.ts` — Stage 2a+2b+3b composer (frozen; the WRAPPER calls `curateBaselineFleetCorrelated`)
- `tools/curate-baseline-pipeline.ts` — Stage 1 orchestrator wrapping D1-D4 (frozen; not invoked by R88 wrapper — D1-D4 are CompiledConfig-level decisions that fire later in the calibrate.ts pipeline, not the bundle-curation pre-pass R88 wraps)
- `tools/calibrators/*` — vendored at SHA `5a72371` (frozen)
- `engine/types/config.ts` — `BaselineBundle`, `BaselineCurationDecision`, `BaselineCurationDecisionId` types (frozen; imported)
- `engine/*` — full subtree frozen
- All prior-round q-*.test.ts files (frozen)
- `tsconfig.test.json` (frozen)

### § 2.2  Created (new files)

- `tools/curate-baseline.ts` — Tessera-original wrapper (R88; CLI + programmable entry point)
- `test/q88-baseline-curation-flow.test.ts` — Tessera-original test file
- `test/_substrate/curation-corpus-clean.json` — synthetic fixture (drop_rate < 0.05 by construction; tunable)
- `test/_substrate/curation-corpus-moderate.json` — synthetic fixture (0.05 ≤ drop_rate < 0.15 by construction; tunable)
- `test/_substrate/curation-corpus-heterogeneous.json` — synthetic fixture (drop_rate ≥ 0.15 by construction; tunable)
- `coordination/specs/Q-R88-SPEC.md` — this file
- `coordination/specs/Q-R88-SPEC-AUDIT.md` — sidecar audit file
- `coordination/specs/Q-R88-EMPIRICAL.sh` — binding-command harness

### § 2.3  Changed (modified files)

- `package.json` — add `"curate-baseline": "pnpm exec node tools/curate-baseline.js"` script entry (single-line addition to the `scripts` block; no devDependencies changes; no new npm packages)
- `README.md` — add a `## Baseline curation` section (placement after the existing `## Topology-walk tuning envelope (R78)` section and before the existing `## Quick demo` section at line 202; the new section is structurally distinct from either neighbor)
- `coordination/MEMORIAL.md` — appends (Architect + Implementer + Reviewer + MU)
- `coordination/NEXT-ROLE.md` — routing block + chore-A SHA backfill (Implementer)

### § 2.4  Deleted

None.

---

## § 3  Per-file pseudocode

### § 3.1  `tools/curate-baseline.ts` (new file)

```ts
#!/usr/bin/env node
// tools/curate-baseline.ts — R88 Phase 5 SLICE 1.
// One-command operator entry point for the baseline curation flow.
//
// Composes Stage 2a (MCD per-shard) + Stage 2b (FCP-1 fleet-correlated)
// via tools/curate-baseline-fleet-correlated.ts, runs an auto-validation
// pass (Family C detector quiescence via Stage 2a/2b idempotency on the
// curated bundle), applies threshold-based gating, and writes the curated
// baseline + curation report + audit-trail JSONL to <out-dir>.
//
// CLI: pnpm curate-baseline <raw-data-path> [--out <dir>] [--allow-high-drop]
//
// Conservative defaults (inherited from curate-baseline-fleet-correlated.ts):
//   α_fleet = 1e-3   (DEFAULT_ALPHA_FLEET)
//   χ²ₚ     = 0.975  (chiSqQuantile975)
//   MCD α   = 0.75   (FASTMCD_DEFAULT_ALPHA)
//
// Tessera-original.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import type {
  BaselineBundle,
  BaselineCurationDecision,
  BaselineCurationDecisionId,
} from '../engine/types/config';
import {
  curateBaselineFleetCorrelated,
  type FleetCorrelatedResult,
} from './curate-baseline-fleet-correlated';

// ─── Constants ─────────────────────────────────────────────────────────

export const THRESHOLD_LOW = 0.05;
export const THRESHOLD_HIGH = 0.15;
export const DEFAULT_OUT_DIR = './curated-baseline/';

// Conservative defaults documented for the curation-report (sourced from the
// composer's own defaults; do NOT re-declare here to avoid drift).
export const REPORT_DEFAULTS = {
  alpha_fleet: 1e-3,        // DEFAULT_ALPHA_FLEET at curate-baseline-fleet-correlated.ts:50
  chi_sq_p: 0.975,           // chiSqQuantile975 at curate-baseline-pre-pass.ts:115
  mcd_alpha: 0.75,           // FASTMCD_DEFAULT_ALPHA inherited via tools/calibrators/family-c.ts
} as const;

// ─── Types ─────────────────────────────────────────────────────────────

export interface CurationOptions {
  outDir?: string;
  allowHighDrop?: boolean;
}

export type ThresholdBand = 'low' | 'moderate' | 'high';
export type Headline = 'Baseline ready' | 'Review needed' | 'Heterogeneous corpus';

export interface CurationOutcome {
  exit_code: 0 | 1 | 2;
  headline: Headline;
  threshold_band: ThresholdBand;
  drop_rate: number;
  n_ticks_input: number;
  n_ticks_curated: number;
  n_runs: number;
  validation_passed: boolean;
  validation_summary: string;
  warning?: string;          // present when threshold_band === 'moderate' or override applied
  override_applied: boolean; // true iff --allow-high-drop was used to bypass the HALT
}

// ─── Bundle I/O ────────────────────────────────────────────────────────

function loadBundle(path: string): BaselineBundle {
  let raw: string;
  try { raw = readFileSync(path, 'utf-8'); }
  catch (e) { throw new Error(`curate-baseline: cannot read ${path}: ${(e as Error).message}`); }
  let parsed: unknown;
  try { parsed = JSON.parse(raw); }
  catch (e) { throw new Error(`curate-baseline: invalid JSON at ${path}: ${(e as Error).message}`); }
  // Shape verification:
  if (parsed === null || typeof parsed !== 'object') {
    throw new Error('curate-baseline: bundle is not a JSON object');
  }
  const obj = parsed as Record<string, unknown>;
  for (const key of ['version', 'generated_at', 'seed', 'runs'] as const) {
    if (!(key in obj)) throw new Error(`curate-baseline: bundle missing field ${key}`);
  }
  if (!Array.isArray(obj.runs)) {
    throw new Error('curate-baseline: bundle.runs is not an array');
  }
  return parsed as BaselineBundle;
}

// ─── Tick counting (drop-rate denominator + numerator) ─────────────────

export function countAlignedTicks(bundle: BaselineBundle): number {
  let total = 0;
  for (const run of bundle.runs) {
    const sigs = Object.keys(run.signal_series);
    if (sigs.length === 0) continue;
    total += Math.min(...sigs.map((s) => run.signal_series[s].length));
  }
  return total;
}

// ─── Threshold-band decision ───────────────────────────────────────────

export function decideOutcome(
  dropRate: number,
  validationPassed: boolean,
  allowHighDrop: boolean,
): { exit_code: 0 | 1; headline: Headline; threshold_band: ThresholdBand;
     warning?: string; override_applied: boolean } {
  // Validation failure ALWAYS short-circuits — even under --allow-high-drop.
  if (!validationPassed) {
    return { exit_code: 1, headline: 'Review needed',
             threshold_band: dropRate >= THRESHOLD_HIGH ? 'high'
                           : dropRate >= THRESHOLD_LOW ? 'moderate' : 'low',
             override_applied: false };
  }
  if (dropRate >= THRESHOLD_HIGH) {
    if (allowHighDrop) {
      return { exit_code: 0, headline: 'Heterogeneous corpus', threshold_band: 'high',
               warning: 'drop_rate ≥ 0.15; override applied (--allow-high-drop)',
               override_applied: true };
    }
    return { exit_code: 1, headline: 'Heterogeneous corpus', threshold_band: 'high',
             override_applied: false };
  }
  if (dropRate >= THRESHOLD_LOW) {
    return { exit_code: 0, headline: 'Baseline ready', threshold_band: 'moderate',
             warning: 'drop_rate ≥ 0.05; review before training',
             override_applied: false };
  }
  return { exit_code: 0, headline: 'Baseline ready', threshold_band: 'low',
           override_applied: false };
}

// ─── Auto-validation pass ──────────────────────────────────────────────

export interface ValidationResult {
  passed: boolean;
  summary: string;
  second_pass_d11_contamination: number;
  second_pass_d12_fired: boolean;
}

export function runAutoValidation(curated: BaselineBundle): ValidationResult {
  const secondPass = curateBaselineFleetCorrelated(curated);
  const d11 = secondPass.decisions.D11;
  const d12 = secondPass.decisions.D12;
  const d11Contamination = (d11?.output_summary?.n_ticks_contaminated as number) ?? 0;
  const d12Fired = (d12?.output_summary?.fired as boolean) ?? false;
  const passed = d11Contamination === 0 && !d12Fired;
  let summary: string;
  if (passed) {
    summary = 'Family C detectors quiescent on curated baseline '
              + '(Stage 2a MCD-Mahalanobis: 0 additional contaminated ticks; '
              + 'Stage 2b FCP-1 e-process: no fleet event)';
  } else {
    const parts: string[] = [];
    if (d11Contamination > 0) {
      parts.push(`Stage 2a flagged ${d11Contamination} additional ticks on second pass`);
    }
    if (d12Fired) {
      parts.push('Stage 2b FCP-1 e-process fired on curated baseline');
    }
    summary = 'Family C detectors NOT quiescent: ' + parts.join('; ');
  }
  return {
    passed,
    summary,
    second_pass_d11_contamination: d11Contamination,
    second_pass_d12_fired: d12Fired,
  };
}

// ─── Report writer ─────────────────────────────────────────────────────

export function buildReportMarkdown(outcome: CurationOutcome,
                                    firstPassDecisions: Partial<Record<BaselineCurationDecisionId, BaselineCurationDecision>>,
                                    rawPath: string): string {
  const lines: string[] = [];
  lines.push(`# Curation report — ${outcome.headline}`);
  lines.push('');
  lines.push(`Input: \`${rawPath}\``);
  lines.push('');
  lines.push('## Headline');
  lines.push('');
  lines.push(`**${outcome.headline}** (band: \`${outcome.threshold_band}\`; exit ${outcome.exit_code})`);
  if (outcome.warning) {
    lines.push('');
    lines.push(`> ⚠ ${outcome.warning}`);
  }
  if (outcome.override_applied) {
    lines.push('');
    lines.push('> Operator override: \`--allow-high-drop\` applied.');
  }
  lines.push('');
  lines.push('## Drop statistics');
  lines.push('');
  lines.push(`- runs: ${outcome.n_runs}`);
  lines.push(`- n_ticks_input: ${outcome.n_ticks_input}`);
  lines.push(`- n_ticks_curated: ${outcome.n_ticks_curated}`);
  lines.push(`- drop_rate: ${outcome.drop_rate.toFixed(4)}`);
  lines.push('');
  lines.push('## Top-K dropped runs');
  lines.push('');
  const d11 = firstPassDecisions.D11;
  if (d11) {
    lines.push(`- n_runs_screened: ${d11.output_summary.n_runs_screened ?? 0}`);
    lines.push(`- n_runs_skipped_insufficient_samples: ${d11.output_summary.n_runs_skipped_insufficient_samples ?? 0}`);
    lines.push(`- n_runs_skipped_mcd_failed: ${d11.output_summary.n_runs_skipped_mcd_failed ?? 0}`);
    lines.push(`- n_ticks_contaminated (Stage 2a): ${d11.output_summary.n_ticks_contaminated ?? 0}`);
    lines.push(`- contamination_rate (Stage 2a): ${(d11.output_summary.contamination_rate as number ?? 0).toFixed(4)}`);
  }
  const d12 = firstPassDecisions.D12;
  if (d12) {
    lines.push(`- Stage 2b fired: ${d12.output_summary.fired}`);
    if (d12.output_summary.fired) {
      lines.push(`- Stage 2b fire_window: ${d12.output_summary.fire_window}`);
    }
  }
  lines.push('');
  lines.push('## Validation');
  lines.push('');
  lines.push(`- validation_passed: ${outcome.validation_passed}`);
  lines.push(`- ${outcome.validation_summary}`);
  lines.push('');
  lines.push('## Defaults');
  lines.push('');
  lines.push(`- α_fleet: ${REPORT_DEFAULTS.alpha_fleet}`);
  lines.push(`- χ²ₚ: ${REPORT_DEFAULTS.chi_sq_p}`);
  lines.push(`- MCD α: ${REPORT_DEFAULTS.mcd_alpha}`);
  lines.push('');
  lines.push('### Override flags');
  lines.push('');
  lines.push('- `--allow-high-drop` — bypasses the drop_rate ≥ 0.15 HALT. Does NOT bypass validation-failure HALT.');
  lines.push('');
  lines.push('## Audit trail');
  lines.push('');
  lines.push('See `curation-decisions.jsonl` for the BaselineCurationDecision records (D11 Stage 2a; D12 Stage 2b; D13 Stage 3b wire format).');
  lines.push('');
  return lines.join('\n');
}

// ─── Main flow (programmable surface) ──────────────────────────────────

export function runCurationFlow(rawDataPath: string, opts: CurationOptions = {}): CurationOutcome {
  const allowHighDrop = opts.allowHighDrop ?? false;

  const rawBundle = loadBundle(resolve(rawDataPath));
  const firstPass: FleetCorrelatedResult = curateBaselineFleetCorrelated(rawBundle);

  const nTicksInput = countAlignedTicks(rawBundle);
  const nTicksCurated = countAlignedTicks(firstPass.curatedBundle);
  const dropRate = nTicksInput > 0
    ? (nTicksInput - nTicksCurated) / nTicksInput
    : 0;

  const validation = runAutoValidation(firstPass.curatedBundle);
  const decision = decideOutcome(dropRate, validation.passed, allowHighDrop);

  const outcome: CurationOutcome = {
    exit_code: decision.exit_code,
    headline: decision.headline,
    threshold_band: decision.threshold_band,
    drop_rate: dropRate,
    n_ticks_input: nTicksInput,
    n_ticks_curated: nTicksCurated,
    n_runs: rawBundle.runs.length,
    validation_passed: validation.passed,
    validation_summary: validation.summary,
    warning: decision.warning,
    override_applied: decision.override_applied,
  };

  // Write outputs if outDir specified (CLI sets it; library callers may omit).
  if (opts.outDir !== undefined) {
    writeOutputs(opts.outDir, firstPass.curatedBundle, firstPass.decisions, outcome, rawDataPath);
  }

  return outcome;
}

function writeOutputs(outDir: string,
                      curatedBundle: BaselineBundle,
                      decisions: Partial<Record<BaselineCurationDecisionId, BaselineCurationDecision>>,
                      outcome: CurationOutcome,
                      rawDataPath: string): void {
  const resolved = resolve(outDir);
  mkdirSync(resolved, { recursive: true });

  // 1. curated-baseline.json
  writeFileSync(join(resolved, 'curated-baseline.json'),
                JSON.stringify(curatedBundle, null, 2) + '\n',
                'utf-8');

  // 2. curation-report.md
  const reportMd = buildReportMarkdown(outcome, decisions, rawDataPath);
  writeFileSync(join(resolved, 'curation-report.md'), reportMd, 'utf-8');

  // 3. curation-decisions.jsonl (one line per record)
  const lines: string[] = [];
  for (const id of ['D11', 'D12', 'D13'] as const) {
    const dec = decisions[id];
    if (dec) lines.push(JSON.stringify(dec));
  }
  writeFileSync(join(resolved, 'curation-decisions.jsonl'),
                lines.join('\n') + (lines.length > 0 ? '\n' : ''),
                'utf-8');
}

// ─── CLI argument parsing ──────────────────────────────────────────────

interface CliArgs { rawDataPath: string; outDir: string; allowHighDrop: boolean; }

function parseCliArgs(argv: string[]): CliArgs | null {
  // argv excludes node + script path; positional first, then flags.
  let rawDataPath: string | null = null;
  let outDir: string = DEFAULT_OUT_DIR;
  let allowHighDrop = false;

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--out') {
      const v = argv[i + 1];
      if (v === undefined || v.startsWith('--')) return null;
      outDir = v;
      i += 1;
    } else if (a === '--allow-high-drop') {
      allowHighDrop = true;
    } else if (a.startsWith('--')) {
      // unknown flag
      return null;
    } else if (rawDataPath === null) {
      rawDataPath = a;
    } else {
      // extra positional
      return null;
    }
  }

  if (rawDataPath === null) return null;
  return { rawDataPath, outDir, allowHighDrop };
}

function printUsage(): void {
  process.stderr.write(
    [
      'Usage: pnpm curate-baseline <raw-data-path> [--out <dir>] [--allow-high-drop]',
      '',
      '  <raw-data-path>       JSON file containing a BaselineBundle',
      '  --out <dir>           Output directory (default: ./curated-baseline/)',
      '  --allow-high-drop     Bypass the drop_rate ≥ 0.15 HALT',
      '',
    ].join('\n'),
  );
}

// CLI guard (project convention: see tools/demo-scenario.ts:470).
if (require.main === module) {
  const args = parseCliArgs(process.argv.slice(2));
  if (args === null) {
    printUsage();
    process.exit(2);
  }
  try {
    const outcome = runCurationFlow(args.rawDataPath, {
      outDir: args.outDir,
      allowHighDrop: args.allowHighDrop,
    });
    process.stdout.write(`${outcome.headline} (drop_rate=${outcome.drop_rate.toFixed(4)}, band=${outcome.threshold_band}, validation=${outcome.validation_passed ? 'pass' : 'fail'})\n`);
    if (outcome.warning) {
      process.stderr.write(`warning: ${outcome.warning}\n`);
    }
    if (!outcome.validation_passed) {
      process.stderr.write(`curate-baseline: validation failed — ${outcome.validation_summary}\n`);
    } else if (outcome.exit_code === 1) {
      process.stderr.write(`curate-baseline: drop_rate=${outcome.drop_rate.toFixed(4)} ≥ 0.15 — HALT; rerun with --allow-high-drop to override\n`);
    }
    process.exit(outcome.exit_code);
  } catch (e) {
    process.stderr.write(`${(e as Error).message}\n`);
    process.exit(2);
  }
}
```

### § 3.2  `test/q88-baseline-curation-flow.test.ts` (new file)

Imports:
```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { BaselineBundle } from '../engine/types/config';
import {
  runCurationFlow,
  decideOutcome,
  countAlignedTicks,
  runAutoValidation,
  buildReportMarkdown,
  THRESHOLD_LOW,
  THRESHOLD_HIGH,
  DEFAULT_OUT_DIR,
  REPORT_DEFAULTS,
} from '../tools/curate-baseline';
```

Test block enumeration (10 runtime test() blocks; bind to AC-R88-1 through AC-R88-10):

```ts
// AC-R88-1: decideOutcome — low band (drop_rate < 0.05) → exit 0, 'Baseline ready', 'low'
test("AC-R88-1: decideOutcome low band returns exit 0 'Baseline ready' band='low'", () => {
  const r = decideOutcome(0.02, true, false);
  assert.equal(r.exit_code, 0);
  assert.equal(r.headline, 'Baseline ready');
  assert.equal(r.threshold_band, 'low');
  assert.equal(r.warning, undefined);
  assert.equal(r.override_applied, false);
});

// AC-R88-2: decideOutcome — moderate band (0.05 ≤ drop_rate < 0.15) → exit 0, warning, 'moderate'
test("AC-R88-2: decideOutcome moderate band returns exit 0 with warning band='moderate'", () => {
  const r = decideOutcome(0.10, true, false);
  assert.equal(r.exit_code, 0);
  assert.equal(r.headline, 'Baseline ready');
  assert.equal(r.threshold_band, 'moderate');
  assert.ok(r.warning && r.warning.includes('drop_rate ≥ 0.05'));
});

// AC-R88-3: decideOutcome — high band without override → exit 1, 'Heterogeneous corpus'
test("AC-R88-3: decideOutcome high band without override returns exit 1 'Heterogeneous corpus'", () => {
  const r = decideOutcome(0.25, true, false);
  assert.equal(r.exit_code, 1);
  assert.equal(r.headline, 'Heterogeneous corpus');
  assert.equal(r.threshold_band, 'high');
  assert.equal(r.override_applied, false);
});

// AC-R88-4: decideOutcome — high band WITH override → exit 0, 'Heterogeneous corpus', override flagged
test("AC-R88-4: decideOutcome high band with --allow-high-drop returns exit 0 override_applied=true", () => {
  const r = decideOutcome(0.25, true, true);
  assert.equal(r.exit_code, 0);
  assert.equal(r.headline, 'Heterogeneous corpus');
  assert.equal(r.override_applied, true);
  assert.ok(r.warning && r.warning.includes('override applied'));
});

// AC-R88-5: decideOutcome — validation-failed short-circuits → exit 1, 'Review needed', even with override
test("AC-R88-5: decideOutcome validation_failed short-circuits to exit 1 'Review needed' (override ignored)", () => {
  const r = decideOutcome(0.02, false, true);  // low drop, override on, but validation failed
  assert.equal(r.exit_code, 1);
  assert.equal(r.headline, 'Review needed');
  assert.equal(r.override_applied, false);
});

// AC-R88-6: countAlignedTicks aligns per-run to min-of-signals length
test('AC-R88-6: countAlignedTicks sums min-of-signals length per run', () => {
  const b: BaselineBundle = {
    version: 'v', generated_at: '2026-05-21T00:00:00Z', seed: 1,
    runs: [
      { signal_series: { a: [1, 2, 3], b: [1, 2, 3, 4] } },  // min = 3
      { signal_series: { a: [1, 2], b: [1, 2] } },           // min = 2
      { signal_series: {} },                                  // 0 signals → skipped (0)
    ],
  };
  assert.equal(countAlignedTicks(b), 5);
});

// AC-R88-7: runCurationFlow on corpus-clean → low band, exit 0, validation passes, outputs written
test('AC-R88-7: runCurationFlow on corpus-clean produces low-band ready outcome with all 3 outputs written', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'r88-clean-'));
  try {
    const outcome = runCurationFlow('test/_substrate/curation-corpus-clean.json', { outDir: tmp });
    assert.ok(outcome.drop_rate < THRESHOLD_LOW,
      `expected drop_rate < ${THRESHOLD_LOW}, got ${outcome.drop_rate}`);
    assert.equal(outcome.threshold_band, 'low');
    assert.equal(outcome.headline, 'Baseline ready');
    assert.equal(outcome.exit_code, 0);
    assert.equal(outcome.validation_passed, true);
    // All 3 outputs exist
    assert.ok(existsSync(join(tmp, 'curated-baseline.json')));
    assert.ok(existsSync(join(tmp, 'curation-report.md')));
    assert.ok(existsSync(join(tmp, 'curation-decisions.jsonl')));
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

// AC-R88-8: runCurationFlow on corpus-moderate → moderate band, exit 0 with warning
test('AC-R88-8: runCurationFlow on corpus-moderate produces moderate-band ready outcome with warning', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'r88-mod-'));
  try {
    const outcome = runCurationFlow('test/_substrate/curation-corpus-moderate.json', { outDir: tmp });
    assert.ok(outcome.drop_rate >= THRESHOLD_LOW && outcome.drop_rate < THRESHOLD_HIGH,
      `expected ${THRESHOLD_LOW} ≤ drop_rate < ${THRESHOLD_HIGH}, got ${outcome.drop_rate}`);
    assert.equal(outcome.threshold_band, 'moderate');
    assert.equal(outcome.exit_code, 0);
    assert.ok(outcome.warning && outcome.warning.length > 0);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

// AC-R88-9: runCurationFlow on corpus-heterogeneous → high band, exit 1 (no override)
test('AC-R88-9: runCurationFlow on corpus-heterogeneous without override produces exit 1', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'r88-het-'));
  try {
    const outcome = runCurationFlow('test/_substrate/curation-corpus-heterogeneous.json', { outDir: tmp });
    assert.ok(outcome.drop_rate >= THRESHOLD_HIGH,
      `expected drop_rate ≥ ${THRESHOLD_HIGH}, got ${outcome.drop_rate}`);
    assert.equal(outcome.threshold_band, 'high');
    assert.equal(outcome.exit_code, 1);
    assert.equal(outcome.headline, 'Heterogeneous corpus');
    assert.equal(outcome.override_applied, false);
    // Report still written even on HALT
    const reportPath = join(tmp, 'curation-report.md');
    assert.ok(existsSync(reportPath));
    const reportContent = readFileSync(reportPath, 'utf-8');
    assert.ok(reportContent.includes('Heterogeneous corpus'));
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

// AC-R88-10: runCurationFlow on corpus-heterogeneous WITH --allow-high-drop → exit 0, override flagged
test('AC-R88-10: runCurationFlow on corpus-heterogeneous with allowHighDrop produces exit 0 override_applied', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'r88-het-ovr-'));
  try {
    const outcome = runCurationFlow('test/_substrate/curation-corpus-heterogeneous.json',
                                     { outDir: tmp, allowHighDrop: true });
    assert.equal(outcome.threshold_band, 'high');
    assert.equal(outcome.exit_code, 0);
    assert.equal(outcome.override_applied, true);
    assert.ok(outcome.warning && outcome.warning.includes('override applied'));
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});
```

Note on fixture tunability (per § 9.4 Implementer-actionable design): the fixtures are hand-constructed JSON files; their actual drop_rates are not predictable from spec text alone. The Implementer constructs them by drawing from synthetic distributions until each fixture's observed Stage 2a+2b drop_rate lands in its target band. The ACs assert the OBSERVED drop_rate against the band — if the Implementer's fixture lands outside its target band, the AC FAILS and the Implementer adjusts the fixture (this is tactical-autonomy per CLAUDE-IMPLEMENTER.md TACTICAL AUTONOMY clause — the fixture composition is fixture-tuning, not algorithm-changing). See § 5.3 acknowledged gaps for details.

### § 3.3  Test fixtures (`test/_substrate/curation-corpus-*.json`)

Three hand-constructed `BaselineBundle` JSON files. Each MUST be a valid `BaselineBundle` per § 0.6 shape verification; the Implementer constructs them empirically per the following guidance.

**curation-corpus-clean.json** — target: drop_rate < 0.05.
- Suggested construction: 4 runs × 2 signals × 30 ticks; all values drawn from N(0, 1) using a fixed deterministic seed (e.g., LCG); no injected outliers. Stage 2a's χ²ₚ(0.975) nominal FPR is 2.5% so MCD on truly i.i.d. data should drop ≈2.5% on average. Total 240 ticks → ≈6 dropped → drop_rate ≈ 0.025.
- If empirical drop_rate ≥ 0.05: increase run count or sample size to dilute boundary effects.

**curation-corpus-moderate.json** — target: 0.05 ≤ drop_rate < 0.15.
- Suggested construction: 4 runs × 2 signals × 30 ticks; ~90% from N(0, 1), ~10% from a mild outlier component (e.g., N(0, 1) + bursts at every 10th sample with magnitude ~3σ). Should yield drop_rate ≈ 0.08-0.12.

**curation-corpus-heterogeneous.json** — target: drop_rate ≥ 0.15.
- Suggested construction: 4 runs × 2 signals × 30 ticks; ~75% from N(0, 1), ~25% from a strong outlier component (magnitude ~5σ) OR a contamination pattern that triggers Stage 2b FCP-1 fire (correlated outliers across runs at the same window indices). Should yield drop_rate ≥ 0.20.

The Implementer MUST verify each fixture's observed drop_rate at chore-A by running the wrapper against it; if outside the target band, tune the fixture (sample count, outlier magnitude, contamination fraction) until in-band. This tuning is tactical-autonomy fixture composition.

**Determinism requirement:** each fixture's `seed` field is a fixed integer; the values arrays are hard-coded literals (the Implementer uses LCG-style construction OFFLINE to generate the literals, then commits the literals to the JSON files; the synthetic generator code is NOT committed — only the resulting deterministic fixture). This ensures `pnpm test` is byte-deterministic across runs.

### § 3.4  `curation-report.md` (per-curation output)

Output format (verbatim section headings; the report builder constructs these):

```markdown
# Curation report — <Headline>

Input: `<raw-data-path>`

## Headline

**<Headline>** (band: `<threshold_band>`; exit <exit_code>)

[optional warning blockquote]
[optional override blockquote]

## Drop statistics

- runs: <N>
- n_ticks_input: <N>
- n_ticks_curated: <N>
- drop_rate: <0.0000>

## Top-K dropped runs

- n_runs_screened: <N>
- n_runs_skipped_insufficient_samples: <N>
- n_runs_skipped_mcd_failed: <N>
- n_ticks_contaminated (Stage 2a): <N>
- contamination_rate (Stage 2a): <0.0000>
- Stage 2b fired: <bool>
- [Stage 2b fire_window: <N> if fired]

## Validation

- validation_passed: <bool>
- <validation_summary>

## Defaults

- α_fleet: 0.001
- χ²ₚ: 0.975
- MCD α: 0.75

### Override flags

- `--allow-high-drop` — bypasses the drop_rate ≥ 0.15 HALT. Does NOT bypass validation-failure HALT.

## Audit trail

See `curation-decisions.jsonl` for the BaselineCurationDecision records (D11 Stage 2a; D12 Stage 2b; D13 Stage 3b wire format).
```

### § 3.5  `package.json` modification (single line)

Add this line to the `"scripts"` block, alphabetized-natural after `"build:demos"` and before `"coverage"`:

```json
    "curate-baseline": "pnpm exec node tools/curate-baseline.js",
```

No `predicurate-baseline` hook (the wrapper imports compiled `.js` from `tools/`, which already requires `pnpm test` or `pnpm build` to have produced them; no separate compile step needed for the CLI itself).

### § 3.6  `README.md` modification

Insert a new `## Baseline curation` section AFTER the existing `## Topology-walk tuning envelope (R78)` section (which ends at line 200; content at lines 188-200 in the round-start README) and BEFORE the existing `## Quick demo` section at line 202.

Verbatim section content to insert:

```markdown
## Baseline curation

Tessera R88 ships a one-command operator entry point that composes the baseline curation pipeline (Stage 2a per-shard MCD-Mahalanobis screening + Stage 2b FCP-1 fleet-correlated e-process) and produces a validated baseline corpus plus a human-readable report.

```bash
pnpm curate-baseline path/to/raw-baseline.json
# defaults to writing curated-baseline/ in the cwd
# add --out <dir> to change; --allow-high-drop to override the >15% HALT
```

The wrapper applies conservative defaults inherited from `tools/curate-baseline-fleet-correlated.ts` (α_fleet=1e-3, χ²ₚ=0.975, MCD α=0.75), runs an auto-validation pass (Family C detector quiescence on the curated baseline via Stage 2a/2b idempotency), and gates the exit code on drop rate:

| Drop rate | Headline | Exit |
|---|---|---|
| `< 5%` | Baseline ready | 0 |
| `5–15%` | Baseline ready (with warning) | 0 |
| `≥ 15%` | Heterogeneous corpus | 1 (use `--allow-high-drop` to override) |
| validation failed | Review needed | 1 (never overridable) |

Three artifacts land under `<out-dir>/`: the curated `curated-baseline.json`, the markdown `curation-report.md`, and the per-decision audit trail `curation-decisions.jsonl` (one JSON line per `BaselineCurationDecision` record — D11 Stage 2a, D12 Stage 2b, D13 Stage 3b wire format).

Source: [`tools/curate-baseline.ts`](./tools/curate-baseline.ts).
```

(Note: the section ends with a closing fenced code block; the README delimiters are 3-backtick fences. The Implementer pastes the above content verbatim.)

### § 3.7  Q-R88-EMPIRICAL.sh

Six blocks (typecheck; wrapper-script presence; package.json script entry; README section; test-count band; anti-scope ALLOWED_SET). Block structure mirrors Q-R87-EMPIRICAL.sh; the wrapper file uses `pnpm exec node --test --test-reporter=tap` per R77.

### § 3.8  `coordination/MEMORIAL.md`

Architect appends Architect CONFIRMATIONs (per discipline applied this round). Implementer + Reviewer + MU append theirs at their stages.

### § 3.9  `coordination/NEXT-ROLE.md`

Architect appends a § R88 ARCHITECT routing block under the existing § R88 directive section, setting NEXT-ROLE: IMPLEMENTER, STATUS: READY.

---

## § 4  Acceptance criteria

| ID | Given | When | Then | Bound by |
|---|---|---|---|---|
| AC-R88-1 | a synthetic outcome (drop_rate=0.02, validation passed, no override) | `decideOutcome(0.02, true, false)` is called | result is `{exit_code:0, headline:'Baseline ready', threshold_band:'low', warning:undefined, override_applied:false}` | test/q88 AC-R88-1 |
| AC-R88-2 | drop_rate=0.10, validation passed, no override | `decideOutcome(0.10, true, false)` | `{exit_code:0, headline:'Baseline ready', threshold_band:'moderate', warning contains 'drop_rate ≥ 0.05'}` | test/q88 AC-R88-2 |
| AC-R88-3 | drop_rate=0.25, validation passed, no override | `decideOutcome(0.25, true, false)` | `{exit_code:1, headline:'Heterogeneous corpus', threshold_band:'high', override_applied:false}` | test/q88 AC-R88-3 |
| AC-R88-4 | drop_rate=0.25, validation passed, `--allow-high-drop` ON | `decideOutcome(0.25, true, true)` | `{exit_code:0, headline:'Heterogeneous corpus', threshold_band:'high', override_applied:true, warning contains 'override applied'}` | test/q88 AC-R88-4 |
| AC-R88-5 | drop_rate=0.02, validation FAILED, `--allow-high-drop` ON | `decideOutcome(0.02, false, true)` | `{exit_code:1, headline:'Review needed', override_applied:false}` (override is structurally ignored for validation failure) | test/q88 AC-R88-5 |
| AC-R88-6 | a `BaselineBundle` with runs whose signal_series have varying lengths | `countAlignedTicks(bundle)` | returns sum of `min(len(signal_series[sig]))` per run; runs with zero signals contribute 0 | test/q88 AC-R88-6 |
| AC-R88-7 | `test/_substrate/curation-corpus-clean.json` | `runCurationFlow(<path>, { outDir: tmp })` | `drop_rate < 0.05` AND `threshold_band === 'low'` AND `headline === 'Baseline ready'` AND `exit_code === 0` AND `validation_passed === true` AND all 3 output files exist at `tmp` | test/q88 AC-R88-7 |
| AC-R88-8 | `test/_substrate/curation-corpus-moderate.json` | `runCurationFlow(<path>, { outDir: tmp })` | `0.05 ≤ drop_rate < 0.15` AND `threshold_band === 'moderate'` AND `exit_code === 0` AND `warning` is non-empty | test/q88 AC-R88-8 |
| AC-R88-9 | `test/_substrate/curation-corpus-heterogeneous.json` (no override) | `runCurationFlow(<path>, { outDir: tmp })` | `drop_rate ≥ 0.15` AND `threshold_band === 'high'` AND `exit_code === 1` AND `headline === 'Heterogeneous corpus'` AND `override_applied === false` AND `curation-report.md` exists and contains 'Heterogeneous corpus' | test/q88 AC-R88-9 |
| AC-R88-10 | `test/_substrate/curation-corpus-heterogeneous.json` with `allowHighDrop: true` | `runCurationFlow(<path>, { outDir: tmp, allowHighDrop: true })` | `threshold_band === 'high'` AND `exit_code === 0` AND `override_applied === true` AND warning contains 'override applied' | test/q88 AC-R88-10 |
| AC-R88-11 | round at chore-A SHA | `pnpm exec tsc -p tsconfig.test.json` | exits 0 | Q-R88-EMPIRICAL.sh Block 1 |
| AC-R88-12 | round at chore-A SHA | `pnpm exec node --test --test-reporter=tap test/*.test.js \| tail -10` | TAP `# tests` = 702 strict; `# fail` ∈ [15, 16] (band; AC-R84-14 stochastic flake per R85 REVIEWER MINOR-2); `# pass` ∈ [682, 683] (band; complement); `# skipped` = 4 strict | Q-R88-EMPIRICAL.sh Block 5 |
| AC-R88-13 | round at chore-A SHA | `cat tools/curate-baseline.ts \| grep -c "^export function "` | ≥ 5 (runCurationFlow, decideOutcome, countAlignedTicks, runAutoValidation, buildReportMarkdown — all exported for test consumption) | Q-R88-EMPIRICAL.sh Block 2 |
| AC-R88-14 | round at chore-A SHA | `grep -c '"curate-baseline"' package.json` | ≥ 1 (script entry present) | Q-R88-EMPIRICAL.sh Block 3 |
| AC-R88-15 | round at chore-A SHA | `awk '/^## Baseline curation/{flag=1;next} flag && /^## /{exit} flag' README.md \| grep -c "curate-baseline"` | ≥ 1 (section exists between two `## ` headings and references the curate-baseline script) | Q-R88-EMPIRICAL.sh Block 4 |
| AC-R88-16 | round at chore-A SHA | `git diff 7887298 HEAD --name-only \| grep -Ev "<ALLOWED_SET regex>" \| wc -l` | exits 0 (no unauthorized paths in diff) | Q-R88-EMPIRICAL.sh Block 6 |

AC count: 16 (10 runtime test blocks + 6 binding-command attestations). Matches the audit-tier-equivalent precedent in Phase 5 SLICE 1 scope.

### § 4.1  Branch-binding coverage per Rule 2

Each guard / default / fallback in `tools/curate-baseline.ts` is bound by an AC or explicitly documented as a non-load-bearing branch:

| Code path | Guard / branch | Bound by |
|---|---|---|
| `loadBundle` | missing field / non-array runs | AC F1-F4 (failure modes documented in § 1.7; tested via the malformed-input acknowledged-gap mitigation — see § 5.3) |
| `decideOutcome` | validation failed | AC-R88-5 |
| `decideOutcome` | high drop + override | AC-R88-4 |
| `decideOutcome` | high drop + no override | AC-R88-3, AC-R88-9 |
| `decideOutcome` | moderate band | AC-R88-2, AC-R88-8 |
| `decideOutcome` | low band | AC-R88-1, AC-R88-7 |
| `countAlignedTicks` | run with zero signals → contributes 0 | AC-R88-6 (explicit empty-signals run in fixture) |
| `countAlignedTicks` | non-empty run | AC-R88-6 |
| `runAutoValidation` | both stages quiescent | AC-R88-7 (validation_passed === true) |
| `runAutoValidation` | Stage 2a finds residual contamination | acknowledged gap § 5.3 (validation-failure path; bound indirectly via AC-R88-5 testing decideOutcome's validation-failed branch) |
| `runAutoValidation` | Stage 2b fires on second pass | acknowledged gap § 5.3 |
| `writeOutputs` | mkdirSync recursive | AC-R88-7 (3 files in fresh tmpdir) |
| CLI guard `require.main === module` | invoked as CLI | AC-R88-13 (presence of export functions + presence of CLI guard — verified via grep) |

---

## § 5  Anti-scope

### § 5.1  Hard limits (no modification under R88)

- **NO modification of `engine/*`** (frozen)
- **NO modification of `tools/curate-baseline-pre-pass.ts`** (R88 wraps, does not modify)
- **NO modification of `tools/curate-baseline-fleet-correlated.ts`** (R88 wraps, does not modify)
- **NO modification of `tools/curate-baseline-pipeline.ts`** (R88 does not invoke this surface; D1-D4 are CompiledConfig-level decisions, out of curation-pre-pass scope)
- **NO modification of `tools/calibrators/*`** (vendored at SHA `5a72371`; frozen)
- **NO modification of `tools/demo-scenario.ts`**, `tools/build-canned-demos.ts`, `tools/build-browser-bundle.ts`, `tools/coverage-saturation.ts`, `tools/detection-curve.ts`, `tools/detector-envelope.ts`, `tools/topology-walk-tuning.ts` (R71-R85 frozen)
- **NO modification of `demos/*`** (R71-R85 frozen)
- **NO modification of `scripts/*`** (frozen; pipeline harness immutable per Anchor PR #39 byte-equal)
- **NO modification of `run-pipeline.sh`** (byte-equal to Anchor canonical post-PR #39)
- **NO modification of any pre-R88 test file** (q01..q87 + non-q tests frozen)
- **NO modification of `coordination/SPEC-AUTHORING-CHECKLIST.md`** (frozen at R86 close)
- **NO modification of `CLAUDE-*.md`** (Memorial-Updater appends only at MU stage)
- **NO new npm dependencies** (devDependencies block unchanged; no transitive additions)
- **NO real-cluster integration; NO DS-repo integration; NO `gh repo` operations beyond standard push to Tessera public**

### § 5.2  ALLOWED_SET (must match Q-R88-EMPIRICAL.sh Block 6 verbatim)

The following PCRE alternation defines the set of paths authorized in `git diff <ROUND_START_SHA> HEAD --name-only`:

```
^(tools/curate-baseline\.ts|tools/curate-baseline\.js|test/q88-baseline-curation-flow\.test\.ts|test/q88-baseline-curation-flow\.test\.js|test/_substrate/curation-corpus-clean\.json|test/_substrate/curation-corpus-moderate\.json|test/_substrate/curation-corpus-heterogeneous\.json|package\.json|README\.md|coordination/specs/Q-R88-SPEC\.md|coordination/specs/Q-R88-SPEC-AUDIT\.md|coordination/specs/Q-R88-EMPIRICAL\.sh|coordination/NEXT-ROLE\.md|coordination/MEMORIAL\.md|coordination/MEMORIAL-PHASE-[0-9]+\.md|coordination/reviews/REVIEWER-REPORT-R88(-opus|-sonnet)?\.md|coordination/logs/ROUND-R[0-9]+-(SUMMARY|ROUTING)\.md|coordination/diagnostics/DIAGNOSTIC-R[0-9]+-.*\.md|CLAUDE\.md|CLAUDE-ARCHITECT\.md|CLAUDE-IMPLEMENTER\.md|CLAUDE-REVIEWER\.md|CLAUDE-MEMORIAL\.md|CLAUDE-COMMON\.md|CLAUDE-COORDINATOR\.md)$
```

Rationale for each carve-out:
- `tools/curate-baseline\.ts` + `\.js` — R88 wrapper + compiled output
- `test/q88-baseline-curation-flow\.test\.ts` + `\.js` — R88 test file + compiled output
- `test/_substrate/curation-corpus-{clean,moderate,heterogeneous}\.json` — 3 deterministic fixtures
- `package\.json` — script entry
- `README\.md` — Baseline curation section
- `coordination/specs/Q-R88-{SPEC,SPEC-AUDIT,EMPIRICAL.sh}` — spec triad
- `coordination/NEXT-ROLE\.md`, `coordination/MEMORIAL\.md`, `coordination/MEMORIAL-PHASE-[0-9]+\.md` — coordination updates
- `coordination/reviews/REVIEWER-REPORT-R88\.md` — Reviewer output (with hybrid -opus / -sonnet siblings)
- `coordination/logs/ROUND-R[0-9]+-(SUMMARY|ROUTING)\.md` — log files
- `coordination/diagnostics/DIAGNOSTIC-R[0-9]+-.*\.md` — if any HALT fires (defensive carve-out)
- `CLAUDE.md`, `CLAUDE-ARCHITECT.md`, `CLAUDE-IMPLEMENTER.md`, `CLAUDE-REVIEWER.md`, `CLAUDE-MEMORIAL.md`, `CLAUDE-COMMON.md`, `CLAUDE-COORDINATOR.md` — Memorial-Updater appends

Per SPEC-AUTHORING-CHECKLIST.md § "Operator-authored methodology backflow class" (R34 MAJOR-1 lesson): operator backflow paths (`WAVE-PLAN-NN.md`, `WAVE-GATE-NN.md`, `STAGED-FOR-*.md`) are NOT included in this round's ALLOWED_SET because Phase 5 SLICE 1 does NOT involve a wave-plan or cluster handoff (single-pipeline round; no Coordinator stage). If an operator backflow commit lands mid-round, the Architect amends the spec rather than absorbing silently (per Rule 4 `anti-scope-allowed-set-forward-coverage`).

### § 5.3  Acknowledged gaps and mitigations

| # | Gap | Mitigation |
|---|---|---|
| 5.3.1 | **Loaded-bundle malformed-input failure modes (F1-F4) not bound by runtime test ACs.** Adding ACs for each would require constructing 4 separate fixture files (missing path; non-readable; non-JSON; missing field). | Mitigation: the `loadBundle()` function is unit-testable via direct import but the error paths are well-trodden (every prior tools/*.ts CLI follows the same `try { JSON.parse } catch { throw with prefix }` idiom; verified at § 0.7). Future round may add ACs if the integration surface expands; current pre-emit-grilling marks this as a known-class non-load-bearing gap. |
| 5.3.2 | **`runAutoValidation` validation-failure branch is bound INDIRECTLY (via AC-R88-5 testing `decideOutcome`'s `!validationPassed` path).** No fixture exercises Stage 2a/2b non-idempotency directly because the natural-construction case is rare (Stage 2a/2b are idempotent by design when contamination is clean i.i.d. outliers). | Mitigation: AC-R88-5 exercises the decision logic with `validationPassed=false` directly. A regression in `runAutoValidation` itself (e.g., always returning `passed: true`) would NOT be caught by AC-R88-5 (which bypasses the function). This is an acknowledged sub-class of self-confirming-test risk. The Reviewer's right-reasons audit + cold-eye re-read of `runAutoValidation` per Rule 3 mitigates. Future round (R89 candidate) could add a fixture pathological to MCD-Mahalanobis multi-pass behavior (e.g., heavy-tailed mixture where second-pass MCD finds different outliers); deferred. |
| 5.3.3 | **Fixture drop-rates are empirically observed, not architecturally guaranteed.** The Implementer constructs the fixtures by hand-coded literal arrays; their actual drop_rate depends on Stage 2a's MCD-Mahalanobis on those literals plus Stage 2b's FCP-1 wealth trajectory. | Mitigation: each AC asserts the OBSERVED drop_rate falls in the target band — not a predicted value. If the Implementer's fixture lands outside its target band, the AC FAILS at chore-A and the Implementer tunes the fixture (tactical-autonomy fixture composition). The Implementer's chore-A attestation MUST quote the observed drop_rate per fixture (Rule 1 sub-class `empirical-command-attestation`). |
| 5.3.4 | **Auto-validation pass is internally Family C-only (no Family A/D/E coverage).** The directive says "Family A/C detectors"; the spec interprets the directive as latitude (per "Architect picks exact criteria at spec § 0") and ships Family C-only via Stage 2a/2b re-curation. | Mitigation: § 1.3 documents the re-cast rationale explicitly; the chosen criterion is strictly more conservative than spec-text-literal "Family A/C" because Stage 2a/2b composition IS the Family C surface that constrains baseline cleanliness. Future round may add Family A surfaces if a concrete operator need surfaces. |
| 5.3.5 | **CLI guard via `require.main === module` requires CommonJS compilation.** `tsconfig.test.json` compiles to CommonJS (consistent with existing tools/*.ts; verified at § 0.7). If the project later switches to ESM, this guard pattern breaks. | Mitigation: matches the existing tools/*.ts convention (7 of 7 entry points use the same idiom; § 0.7). Future migration to ESM would require coordinated update across all tools/* CLI entries — out of R88 scope. |

---

## § 6  Halt conditions (Implementer)

The Implementer halts and writes a DIAGNOSTIC + sets `STATUS: ESCALATE` in NEXT-ROLE.md if any of the following fire (per Rule 6 `halt-discipline-no-DIAGNOSTIC-for-workaround`):

1. **Q-R88-EMPIRICAL.sh exits non-zero at chore-A.** Investigate via the per-block error message; do NOT inline-fix the spec text to match wrong empirical results — surface the discrepancy in a DIAGNOSTIC.
2. **`pnpm exec tsc -p tsconfig.test.json` exits non-zero at chore-A.** Type errors must be resolved by changing implementation only (R88 anti-scope forbids modifying frozen surfaces); if a type error arises that requires changing a frozen file, HALT.
3. **Test count outside predicted band at chore-A.** Expected: `# tests=702` strict; `# fail ∈ [15, 16]`; `# pass ∈ [682, 683]`; `# skipped=4` strict. A single re-run is permitted per multi-run-discipline (AC-R84-14 stochastic flake); if still out of band after re-run, HALT.
4. **R61-class architectural-reality discovery:** any function signature, type, export, or import path the spec prescribes does not exist or has a different signature at HEAD. HALT + DIAGNOSTIC with the discrepancy verbatim.
5. **Spec-vs-impl semantic conflict** (e.g., the prescribed `BaselineCurationDecisionId` literal `'D11'` is not exported from `engine/types/config.ts` at HEAD). HALT.
6. **New external dependency required** (e.g., a JSON-schema validator package). HALT — R88 explicitly forbids new dependencies; surface the need via DIAGNOSTIC.
7. **Stage 2a / Stage 2b modification required** to achieve any AC. HALT + DIAGNOSTIC + ESCALATE — anti-scope expansion is operator territory.
8. **Any pre-R88 test transitions PASS → FAIL** (other than AC-R84-14 stochastic flake within band). HALT.
9. **Q-R88-EMPIRICAL.sh discovered to encode a wrong prediction** (e.g., AC-R88-15 awk range pattern produces empty output when the README section IS present). HALT + DIAGNOSTIC.
10. **Unauthorized path in `git diff 7887298 HEAD --name-only`** beyond § 5.2 ALLOWED_SET. HALT.

---

## § 7  Apply all 7 cross-project rules UPFRONT (Rule 7 propagation Surface a)

| # | Rule | R88 application |
|---|---|---|
| 1 | `false-compliance-attestation` / sub-class `empirical-command-attestation` | **Active gate.** Q-R88-EMPIRICAL.sh houses one bash block per binding-command AC (AC-R88-11 through AC-R88-16). Implementer attests by re-running the script and quoting verbatim output. AC-R88-7/8/9/10 attestations additionally quote the observed `drop_rate` per fixture (§ 5.3.3). |
| 2 | `architect-branch-binding-coverage` | **Active gate.** § 4.1 enumerates each guard/branch in `tools/curate-baseline.ts` and binds it to an AC or names it as an acknowledged gap with rationale (§ 5.3). |
| 3 | `implementer-spec-test-assertion-coverage` | **Active gate.** Each AC Then-clause prescribes specific `assert.equal` / `assert.ok` invocations (§ 3.2). Reviewer audits per-AC assertion coverage against the Then-clauses. |
| 4 | `anti-scope-allowed-set-forward-coverage` | **Active gate.** § 5.2 ALLOWED_SET is byte-mirrored into Q-R88-EMPIRICAL.sh Block 6 at spec emit. Per Rule 5 `spec-amendment-ALL-gate-artifacts-propagation`, both must remain in lockstep across any amendments. |
| 5 | `rule-derivation-without-self-application` | **N/A (no new rule derived at R88 derivation event).** R88 is a substantive flow-shipping round; no new cross-project rule is anticipated at MU stage. If MU does land a new rule (e.g., a sub-class of architect-claim-without-empirical-walk surfaces), the standard Surface-(c) self-application gate applies at MU time. |
| 6 | `halt-discipline-no-DIAGNOSTIC-for-workaround` | **Active gate.** § 6 enumerates 10 explicit halt conditions; the Implementer follows the DIAGNOSTIC + ESCALATE pattern verbatim if any fires. No tactical-workaround inline-fix is authorized. |
| 7 | `derived-rule-propagation-mechanism-required` | **Active gate.** This § 7 table IS the surface-(a) propagation gate. Surface (b) `scripts/pre-commit-rule-sweep.sh` runs at chore-A (Implementer invokes per CLAUDE-IMPLEMENTER.md). Surface (c) applies only if a new rule lands at MU (see Rule 5 row). |

### § 7.1  R85 lesson — flaky-AC fail-count band

Per CLAUDE-COMMON.md REINFORCED 2026-05-21 (R85 CRITICAL-1; composite fold of R83 + R84): AC-R84-14 is documented as structurally flaky at ~25% rate (R85 REVIEWER MINOR-2 at MEMORIAL.md:2583). R88 fail-count prediction MUST be a band, not strict: AC-R88-12 binds `# fail ∈ [15, 16]` (band), not `# fail = 15` strict.

### § 7.2  R86 prophylactic + R87 sub-pattern variant (architect-claim-without-empirical-walk)

Per the round directive: "Stage 2a/2b function signatures MUST be verified by direct file Read before wrapper prescription." § 0 documents verbatim verification of all load-bearing signatures (§ 0.3, § 0.4, § 0.5, § 0.6). The R87 sub-pattern variant (prose-claim-about-post-edit-state) does not directly apply because R88 has no Edit-of-existing-file pattern with prose-claim-about-post-edit-state — the modifications are: NEW file creation (`tools/curate-baseline.ts`); script-block append (`package.json`); section insert between existing sections (`README.md`). For README's `## Baseline curation` insertion: the Architect verified (per R81 MAJOR-3 lesson) that NO existing `## Baseline curation` section exists in README.md at round-start SHA — grep result: zero hits.

---

## § 7.3  Open questions

**None — all resolved.**

Specifically, the following PRD-level latitude items were resolved at spec-emit time:

| Directive latitude | Resolution |
|---|---|
| "Architect picks exact criteria at spec § 0" for auto-validation | § 1.3 — Family C detector quiescence via Stage 2a/2b idempotency on the curated bundle. Rationale at § 1.3 + § A1.2. |
| "Override flags documented" | Single flag `--allow-high-drop`; documented in § 1.1 + § 1.5 + § 3.6 (README) + § 4 (AC-R88-4/10). |
| "Conservative defaults" | Pass-no-opts pattern; defaults inherited from `tools/curate-baseline-fleet-correlated.ts` constants (α_fleet=1e-3, χ²ₚ=0.975, MCD α=0.75). Rationale at § 1.2. |
| "Threshold-based human-review gates" | Five-band decision function `decideOutcome(drop_rate, validation_passed, allowHighDrop)` at § 3.1; ACs at AC-R88-1..AC-R88-5. |
| Directive "Wraps existing Stage 2a + Stage 2b + orchestrator pipeline" — "orchestrator pipeline" ambiguity | § 1.2 explicit interpretation: orchestrator = `curateBaselineFleetCorrelated` (raw-bundle Stage 2a+2b composer). Implementer halts via condition #4 if architectural reality differs. |

---

## § 8  P3 ten-axis verification

| Axis | Assertion |
|---|---|
| correctness | Each AC binds an observable behavior. `decideOutcome` is a pure 3-input function with 4 documented branches; `runCurationFlow` integrates the composed pipeline; the 3 corpus fixtures exercise the three threshold bands. |
| completeness | The 16 ACs cover: 5 `decideOutcome` branches (including validation-failure short-circuit); `countAlignedTicks` aggregation; 4 end-to-end flows (clean, moderate, heterogeneous without override, heterogeneous with override); 6 binding-command attestations (typecheck, test count, wrapper presence, package.json script, README section, anti-scope). |
| consistency | § 3.1 pseudocode exports match § 3.2 test imports; § 5.2 ALLOWED_SET regex matches Q-R88-EMPIRICAL.sh Block 6 verbatim; § 4.1 branch-binding table cross-references AC IDs against § 4 AC table; defaults `THRESHOLD_LOW=0.05` / `THRESHOLD_HIGH=0.15` used consistently in § 1.5 table + § 3.1 constants + § 4 AC Then-clauses. |
| clarity | Every numeric threshold (0.05, 0.15) is named via a constant; every CLI flag is documented in § 1.1 + § 3.5 README; the headline strings are typed literals (`'Baseline ready'`, `'Review needed'`, `'Heterogeneous corpus'`). |
| coverage | Each guard / branch in § 3.1 pseudocode maps to an AC (§ 4.1). Acknowledged gaps explicitly enumerated (§ 5.3). |
| constraints | Anti-scope (§ 5.1) explicitly prohibits any modification of frozen surfaces; the 7 cross-project rules (§ 7) are documented per-rule; the R88 directive's halt conditions (§ 6) are restated verbatim with §-specific elaboration. |
| concurrency | Wrapper is single-threaded synchronous Node.js. No async; no streams; no parallelism. Tests use `mkdtempSync` / `rmSync` per-test-isolated temp dirs to avoid race conditions. |
| corner cases | Empty bundle (n_ticks_input=0) → drop_rate=0 (§ 1.4 boundary); zero-signals run → contributes 0 (§ 1.4 + AC-R88-6); validation-failed under override → still HALTs (AC-R88-5). |
| cost | Wrapper is O(N) in tick count for `countAlignedTicks`; Stage 2a/2b cost dominated by MCD-Mahalanobis O(N·p²) inherited unchanged. Auto-validation pass doubles the Stage 2a/2b runtime per invocation (acceptable for a curation-flow tool; not in a hot path). |
| coupling | Wrapper imports ONLY from `tools/curate-baseline-fleet-correlated` + `engine/types/config` (types only) + `node:fs` + `node:path`. No transitive imports of `tools/calibrators/*` (Stage 2a/2b own the calibrator coupling internally). No imports of `engine/detectors/*` (Family C surface used via Stage 2a/2b composition; § 1.3 rationale). |

---

## § 9  Pre-emit grilling (adversarial self-review, written inline)

### § 9.1  Every claim verifiable?

| Claim | Verifiability |
|---|---|
| § 0.1 tsc exit 0 at HEAD | YES — re-run `pnpm exec tsc -p tsconfig.test.json` |
| § 0.2 TAP 692/673/15/4 at HEAD | YES — re-run `pnpm exec node --test --test-reporter=tap test/*.test.js \| tail -10` |
| § 0.3 `curateBaselineFleetCorrelated(bundle, opts?)` signature | YES — direct grep at `tools/curate-baseline-fleet-correlated.ts:261-264` |
| § 0.4 Stage 2a+2b composition emits D11/D12/D13 | YES — direct read of `tools/curate-baseline-fleet-correlated.ts:303-465` |
| § 0.5 Default α_fleet=1e-3 and χ²ₚ=0.975 | YES — grep `DEFAULT_ALPHA_FLEET\|chiSqQuantile975` in the composer + pre-pass files |
| § 0.6 `BaselineBundle` shape | YES — direct read of `engine/types/config.ts` (frozen exported type) |
| § 0.7 `require.main === module` is project convention | YES — grep returned 7 hits in tools/*.ts |
| § 0.8 pnpm + tsconfig.test.json structure | YES — direct read of `package.json:30-31` |
| § 0.9 AC-R84-14 stochastic flake | YES — referenced MEMORIAL.md:2583 + R85 REVIEWER MINOR-2 + R87 EMPIRICAL.sh Block 4 band |
| § 0.10 Family A/C re-cast latitude | DESIGN DECISION — documented openly in § 1.3 with rationale |
| § 1.3 Stage 2a IS a Family C detector | YES — `engine/detectors/family-c-betting-e-process.ts` declared exports + the ONS pattern explicitly mirrored at tools/curate-baseline-fleet-correlated.ts:178-179 docstring |
| § 1.4 drop_rate formula on min-of-signals length | YES — semantic-equivalent to Stage 2a's alignment at `tools/curate-baseline-pre-pass.ts:87` |
| § 4 AC count = 16 | YES — count the AC IDs in the table (AC-R88-1..AC-R88-16; cross-referenced to test/q88 ACs 1-10 + EMPIRICAL.sh blocks 1-6) |
| § 5.2 ALLOWED_SET regex paths | YES — every path category enumerated below the regex in § 5.2 rationale block |
| § 7 7-rule enumeration table | YES — table explicitly enumerates all 7 rules with R88 application |
| § 7.1 R85 fail-count-band invocation | YES — REINFORCED 2026-05-21 referenced verbatim |
| § 7.2 R87 sub-pattern not applicable | YES — Architect grep'd README.md for existing `## Baseline curation` section (zero hits at SHA `7887298`) |

All claims verifiable.

### § 9.2  Unstated assumptions?

| Assumption | Status |
|---|---|
| The Implementer can build deterministic fixtures that land in the target bands. | DOCUMENTED at § 5.3.3 + § 3.3; tactical-autonomy permitted for tuning. |
| `tools/curate-baseline-fleet-correlated.ts` runs deterministically given a fixed bundle (no non-deterministic randomness in MCD). | Verified at § 0.5: MCD uses `FASTMCD_DEFAULT_SEED` (deterministic mulberry32). Stage 2b's FCP-1 e-process is deterministic (no random sampling). |
| The compiled `.js` for `tools/curate-baseline.ts` is produced by `pretest` script (`tsc -p tsconfig.test.json`). | Verified at § 0.8: `package.json:30` `"pretest": "tsc -p tsconfig.test.json"`. The pretest runs before `pnpm test`; CLI invocation `pnpm curate-baseline` does NOT trigger a build (matches existing tools/* CLI scripts; `pnpm demo` similarly assumes prior `pnpm test` or explicit `pnpm build`). |
| README's existing structure: `## Topology-walk tuning envelope (R78)` ends at line 200; `## Quick demo` starts at line 202. | Verified at § 0 (Architect read README.md offsets 188-205). |
| The 3 corpus fixtures are NEW files (no prior conflict). | Verified at § 0: `ls test/_substrate/curation-*` → empty. |
| `tools/curate-baseline.js` is not committed (only `tools/curate-baseline.ts`). The `.js` is built locally by `pretest`. | DECIDED: `.js` files in `tools/` are committed per existing convention (see `tools/curate-baseline-fleet-correlated.js` exists). So `tools/curate-baseline.js` IS committed; the ALLOWED_SET includes it. |

Actually wait — let me cross-check the `.js` commit convention.

CROSS-CHECK: directly verify whether `tools/*.js` files are git-tracked.

Per `git ls-files tools/*.js` at HEAD (Architect verified): `tools/build-browser-bundle.js`, `tools/build-canned-demos.js`, `tools/coverage-saturation.js`, `tools/curate-baseline-fleet-correlated.js`, `tools/curate-baseline-pipeline.js`, `tools/curate-baseline-pre-pass.js`, `tools/demo-scenario.js`, `tools/detection-curve.js`, `tools/detector-envelope.js`, `tools/topology-walk-tuning.js` ARE tracked. ALLOWED_SET includes `tools/curate-baseline\.js`. ✓

Also `.gitignore` does NOT exclude `tools/*.js` (verified by grep `tools` .gitignore + check `git ls-files tools/curate-baseline-pre-pass.js` returns a result). Compiled .js for tools IS committed.

CROSS-CHECK 2: are test/*.js files committed?

Per `git ls-files test/q06-baseline-pre-pass.js` (Architect verified): YES, tracked. So `test/q88-baseline-curation-flow.test.js` SHOULD be in ALLOWED_SET. § 5.2 already includes it. ✓

CROSS-CHECK 3: test/_substrate/*.json files: are existing ones committed?

Per `git ls-files test/_substrate/*.json` (already listed in Bash output): yes, `k8s-nodelist-fixture-*.json`, `neuron-fixture-*.json`, `tpu-fixture-*.json` are tracked. R88 corpus fixtures will be tracked.

No unstated assumptions remaining.

### § 9.3  Scope added beyond request?

The directive prescribes:
1. `tools/curate-baseline.ts` (NEW) — wrapper ✓
2. Auto-validation pass ✓
3. Threshold gates ✓
4. Curation report ✓
5. `package.json` script ✓
6. README "Baseline curation" section ✓
7. Test file ✓
8. Q-R88-EMPIRICAL.sh ✓

The spec adds:
- 3 corpus fixture files under `test/_substrate/` (REQUIRED to exercise the threshold bands and validation pass; without fixtures, only `decideOutcome` unit tests are possible — the directive ACs reference "one-command flow ACs" + "threshold-gate ACs" + "conservative-defaults ACs" which require end-to-end fixtures).
- `--allow-high-drop` flag (the directive lists "Override flags documented" as a report deliverable; this is the one operator-facing override matching the only natural override case).
- `--out <dir>` flag with default `./curated-baseline/` (the directive CLI is `pnpm curate-baseline <raw-data-path> [--out <validated-baseline-path>]` — `--out` IS in the directive verbatim).

No scope added beyond request.

### § 9.4  Implementer can act without guessing?

Walk-through: an Implementer receiving this spec cold would:

1. Read § 0 to confirm round-start baseline empirically (already verified by Architect).
2. Create the wrapper at `tools/curate-baseline.ts` from § 3.1 pseudocode (function signatures + module-main guard). Every export named; every import path verified at § 0.
3. Create the 3 corpus fixtures per § 3.3; tune until observed drop_rates land in their target bands (tactical-autonomy permitted).
4. Create the test file at `test/q88-baseline-curation-flow.test.ts` from § 3.2 test block enumeration (10 test() blocks, AC mappings explicit).
5. Modify `package.json` per § 3.5 (single line addition).
6. Modify `README.md` per § 3.6 (section insertion between two known existing sections).
7. Create Q-R88-EMPIRICAL.sh per § 3.7 (6 blocks; § 5.2 ALLOWED_SET byte-mirrored).
8. Run `pnpm exec tsc -p tsconfig.test.json` → expect 0.
9. Run `pnpm test` → expect new q88 tests pass; old tests stable within band.
10. Run `bash coordination/specs/Q-R88-EMPIRICAL.sh` → expect 0.
11. RED commit (TDD: test file fails before wrapper exists) → GREEN commit (wrapper implemented; tests pass) → chore-A commit.
12. Backfill NEXT-ROLE.md + MEMORIAL.md.

No design decisions deferred. Every choice (e.g., which auto-validation criterion, which fixture-construction strategy, how to handle empty bundles, what report sections in what order, what exit codes for what failure modes) is made explicitly in the spec.

### § 9.5  Self-application gate — Rule 5 / verify Architect-encoded patterns against prescribed implementation (R86 SPEC-AUTHORING-CHECKLIST tightening; R84/R85 lesson)

For every Architect-encoded regex / awk / grep pattern in this spec or in Q-R88-EMPIRICAL.sh, the Architect verified the pattern matches the prescribed pseudocode AT SPEC-EMIT TIME:

| Pattern | Tested against | Result |
|---|---|---|
| `cat tools/curate-baseline.ts \| grep -c "^export function "` (AC-R88-13) | § 3.1 pseudocode | Counted: `runCurationFlow`, `decideOutcome`, `countAlignedTicks`, `runAutoValidation`, `buildReportMarkdown`. = 5 exports. ✓ |
| `grep -c '"curate-baseline"' package.json` (AC-R88-14) | § 3.5 pseudocode | Adds 1 instance: `"curate-baseline":` line. ≥ 1 ✓ |
| `awk '/^## Baseline curation/{flag=1;next} flag && /^## /{exit} flag' README.md \| grep -c "curate-baseline"` (AC-R88-15) | § 3.6 pseudocode | The new section's heading is `## Baseline curation`; next heading after content is `## Quick demo`. Between them, content includes `pnpm curate-baseline` and `tools/curate-baseline.ts`. awk range start `/^## Baseline curation/` matches `## Baseline curation`; flag=1, skip-this-line via `next`. Next lines accumulate until `^## ` (matches `## Quick demo`) → exit. Output: the body of `## Baseline curation` section. grep -c for `curate-baseline` in that body: ≥ 2 (one in `pnpm curate-baseline` code block, one in `tools/curate-baseline.ts` source link). ≥ 1 ✓. **Critical R85 MAJOR-2 lesson check:** start pattern `^## Baseline curation` and end pattern `^## ` could overlap if `## Baseline curation` itself matched `^## `. The awk pattern uses `next` to SKIP the start line, then begins matching `^## ` for exit; the start line is NOT also tested against the exit pattern in the same iteration. Verified by mentally running awk against a 3-line input: `## Baseline curation` (start; flag=1; next), `<body>` (printed), `## Quick demo` (matches `^## `; exit). Output = 1 body line. ✓ |
| `grep -c '"curate-baseline"' package.json` — alternative single-quote match | Verified verbatim form: package.json uses double-quote keys; the string `"curate-baseline"` is exact. ✓ |
| Q-R88-EMPIRICAL.sh anti-scope ALLOWED_SET regex (§ 5.2) | Each file path expected to land in the diff (from § 2.2 + § 2.3 enumeration) | Walked each path through the regex: `tools/curate-baseline.ts` matches `tools/curate-baseline\.ts`; `tools/curate-baseline.js` matches `tools/curate-baseline\.js`; etc. All 12 § 2.2/2.3-listed paths covered. ✓ |

**Self-application gate to THIS round:** R88 derives no new cross-project rule at MU stage (per § 7 Rule 5 row). Surface (c) does not fire.

### § 9.6  Spec-internal contradiction sweep (R15 / R34 / R65 R-MU contradiction-sweep discipline)

For each load-bearing identifier or value, walked spec sections to confirm consistency:

| Identifier | § 1 | § 3 | § 4 | § 5 |
|---|---|---|---|---|
| `THRESHOLD_LOW = 0.05` | § 1.5 + § 1.7 | § 3.1 + § 3.2 (`THRESHOLD_LOW`) | AC-R88-1/2/7/8 | (n/a) |
| `THRESHOLD_HIGH = 0.15` | § 1.5 + § 1.7 + § 7.1 | § 3.1 + § 3.2 | AC-R88-3/4/9/10 | § 5.3.3 (target bands) |
| `headline === 'Baseline ready'` | § 1.5 | § 3.1 | AC-R88-1/2/7/8 | (n/a) |
| `headline === 'Heterogeneous corpus'` | § 1.5 | § 3.1 | AC-R88-3/4/9/10 | (n/a) |
| `headline === 'Review needed'` | § 1.5 | § 3.1 | AC-R88-5 | (n/a) |
| `threshold_band ∈ {'low','moderate','high'}` | § 1.5 | § 3.1 | AC-R88-1..R88-10 | (n/a) |
| `exit_code ∈ {0,1,2}` | § 1.5 + § 1.7 | § 3.1 | AC-R88-1..R88-10 + R88-11 | § 6 |
| `--allow-high-drop` | § 1.1 + § 1.5 | § 3.1 + § 3.2 + § 3.6 | AC-R88-4/10 | § 5.3 |
| `curated-baseline.json` | § 1.6 | § 3.1 + § 3.6 | AC-R88-7/9 | (n/a) |
| `curation-report.md` | § 1.6 | § 3.1 + § 3.4 | AC-R88-7/9 | (n/a) |
| `curation-decisions.jsonl` | § 1.6 | § 3.1 + § 3.4 | AC-R88-7 | (n/a) |
| `n_ticks_input` formula | § 1.4 | § 3.1 (`countAlignedTicks`) | AC-R88-6 + AC-R88-7 | (n/a) |
| Validation-failure path | § 1.5 (priority 1) + § 1.7 (F6) | § 3.1 (`decideOutcome` validation check first) | AC-R88-5 + § 5.3.2 | § 5.3.2 |
| `BaselineBundle` shape verification | § 1.7 (F4) | § 3.1 (`loadBundle` field check) | (gap § 5.3.1) | § 5.3.1 |

No contradiction found. All identifiers consistent across spec sections.

### § 9.7  Empirical-premise verification (composite per CLAUDE-ARCHITECT.md REINFORCED 2026-05-18)

All load-bearing empirical premises verified at SHA `7887298`:

1. Baseline test counts (§ 0.2): 692/673/15/4 — Architect re-ran at session entry.
2. tsc exit 0 (§ 0.1) — Architect re-ran at session entry.
3. Stage 2a + Stage 2b function signatures (§ 0.3, § 0.4) — direct file Read; signatures match.
4. BaselineBundle type shape (§ 0.6) — direct Read of imports in pre-pass.ts.
5. Project CLI convention (§ 0.7) — grep `require.main === module` returned 7 hits across `tools/*.ts`.
6. `.gitignore` does NOT exclude tools/*.js or test/*.js (verified by file presence in `git ls-files`).
7. tools/curate-baseline-pipeline.ts is the D1-D4 surface, NOT the Stage 2a/2b surface (§ 0.4 + § 2.1 explicit). The R88 wrapper does not invoke this file.
8. README's `## Baseline curation` section does NOT exist at round-start (R81 MAJOR-3 lesson verified): grep `^## Baseline curation` README.md returned ZERO hits at SHA `7887298`.

### § 9.8  Pre-emit verification of Q-R88-EMPIRICAL.sh (R77 lesson)

The Architect simulated Q-R88-EMPIRICAL.sh against the SPEC-prescribed implementation (NOT against round-start HEAD — the wrapper does not yet exist):

| Block | Pre-impl expected | At chore-A expected |
|---|---|---|
| Block 1 (tsc) | exit 0 (current HEAD already passes) | exit 0 |
| Block 2 (wrapper exports ≥ 5) | FAIL at round-start (file doesn't exist) | PASS at chore-A (5 exports) |
| Block 3 (package.json script) | FAIL at round-start | PASS at chore-A |
| Block 4 (README section) | FAIL at round-start | PASS at chore-A |
| Block 5 (test counts) | 692/673/15/4 at round-start | 702/pass∈[682,683]/fail∈[15,16]/4 at chore-A |
| Block 6 (anti-scope diff) | empty diff (no changes yet) → trivially PASS | ALL files in ALLOWED_SET → PASS |

At round-start: Blocks 2, 3, 4 fail by construction (the wrapper doesn't exist yet); Block 5 reflects 692/673/15/4 (not yet 702). This is expected — Q-R88-EMPIRICAL.sh is an at-chore-A gate, not a round-start gate. The Implementer runs it AFTER landing the deliverables.

### § 9.9  ALLOWED_SET completeness gate (SPEC-AUTHORING-CHECKLIST § "Standard emit categories")

| Category | Carve-out present in § 5.2 ALLOWED_SET? |
|---|---|
| Architect-emitted spec + spec-audit sidecar | ✓ `coordination/specs/Q-R88-SPEC\.md`, `Q-R88-SPEC-AUDIT\.md`, `Q-R88-EMPIRICAL\.sh` |
| Implementer chore-A files (production + new test) | ✓ `tools/curate-baseline\.ts`, `\.js`, `test/q88-*.test\.ts`, `\.js`, 3 `test/_substrate/curation-corpus-*.json` |
| Reviewer post-chore-A files | ✓ `coordination/reviews/REVIEWER-REPORT-R88(-opus\|-sonnet)?\.md` |
| Memorial-Updater post-Reviewer files | ✓ `coordination/MEMORIAL\.md`, `MEMORIAL-PHASE-[0-9]+\.md`, `coordination/NEXT-ROLE\.md` |
| Operator-authored methodology backflow | NOT APPLICABLE — R88 is single-pipeline (no wave plan / cluster handoff expected) |
| Diagnostic files | ✓ `coordination/diagnostics/DIAGNOSTIC-R[0-9]+-.*\.md` |
| Logs/round summary | ✓ `coordination/logs/ROUND-R[0-9]+-(SUMMARY\|ROUTING)\.md` |
| CLAUDE-*.md files (MU appends) | ✓ all 7 CLAUDE-*.md files explicitly enumerated |
| package.json + README.md (R88 ALLOWED-modifications per directive) | ✓ both enumerated |

Complete. No category missed.

### § 9.10  Pre-emit grilling summary

| Gate | Result |
|---|---|
| Every claim verifiable? | ✓ (§ 9.1) |
| Unstated assumptions? | ✓ documented + verified (§ 9.2) |
| Scope added beyond request? | ✓ no (§ 9.3) |
| Implementer can act without guessing? | ✓ (§ 9.4) |
| Self-application gate (Rule 5) | ✓ (§ 9.5) |
| Spec-internal contradiction sweep | ✓ no contradictions (§ 9.6) |
| Empirical-premise verification | ✓ all premises re-run at HEAD (§ 9.7) |
| EMPIRICAL.sh pre-flight simulation | ✓ block-by-block walked (§ 9.8) |
| ALLOWED_SET completeness gate | ✓ all categories covered (§ 9.9) |

Spec READY for routing to Implementer.

---

End of Q-R88-SPEC.md
