# Q-R77-SPEC — Detector envelope (low-magnitude SDC characterization; Phase 4 SLICE 1 round 5)

**Round:** R77 (full-tier — Architect + Implementer + Reviewer + Memorial-Updater)
**Round-start SHA:** `0d64d9a` (`chore(R77 directive): detector tuning gap 1 — low-magnitude SDC envelope; Phase 4 SLICE 1 round 5`) — verified via `git rev-parse HEAD` at Architect session entry 2026-05-20.
**Spec-emit SHA:** stamped by Architect's spec-triad commit (lands BEFORE chore-A per R21 ARCH MINOR-1).
**Authority:** `coordination/NEXT-ROLE.md` § R77 Round-scope directive (commit `0d64d9a`).
**Empirical premise (verified at session entry 2026-05-20 in this worktree):** `node --test test/*.test.js` at round-start = exit code **1**; TAP summary `tests=549 / suites=3 / pass=541 / fail=5 / skipped=3 / cancelled=0 / todo=0`. The 5 failing ACs at HEAD are pre-existing carry-forward (see § 1.4 baseline-test-status table). `npx tsc -p tsconfig.test.json` exits **0**.

---

## § 0. Brainstorm (Superpowers Phase 1)

R72 produced a 6×20 = 120-variation coverage matrix that surfaced **gap 1: sdc-drift detected in only 18/20 (90%) of variations** (variation_idx 4 missed at drift=0.7/window=4-onset; variation_idx 10 missed at drift=0.2/window=10-onset). R77 characterizes Tessera's detection envelope at the magnitude × window-count × α-threshold × detector-family parameter surface, so an operator tuning Tessera can see (a) what range of drift magnitudes the detector reliably catches at each α budget, (b) how much margin lengthening the window buys, (c) how Family A betting and an alternative Family C ONS strategy compare across the same parameter grid.

### Approach A — Single-trial exhaustive grid; report binary detection per cell

Run one trial per (magnitude × window × α × family) cell with a fixed seed. Report detected:bool per cell. ACs assert binary outcomes per cell.

- **Strengths:** smallest matrix; cheapest runtime.
- **Weaknesses:** binary single-trial outcomes are PRNG-noise-dominated near the detection boundary (the band the round is meant to characterize). R72 documented that variation_idx 10 missed at drift=0.2/start=10 — a one-trial sample is unreliable evidence about a 50% detection-probability cell, where 50% of trials succeed and 50% miss. Discriminating-assertion gate (R71 MINOR-1): an AC asserting "cell X detected" passes or fails with PRNG noise rather than reflecting true detection probability.
- **Hidden assumption:** detection is approximately deterministic at each parameter cell. Empirically refuted by the R72 boundary cases.
- **Eliminated** by R71 MINOR-1 (discriminating-assertion gate) + this round's stated purpose (CHARACTERIZE the envelope, not test for binary pass/fail).

### Approach B — Multi-seed trials per cell; report detection RATE per cell; ACs assert minimum-rate thresholds at named cells

Run 5 trials per cell with seeds `(BASE ^ (cell_idx * 5 + trial_idx))`. Report `detection_count`/`detection_rate`/`detection_window_median`/`detection_window_p95` per cell. ACs assert minimum rates at named diagnostic cells (e.g., "at magnitude 0.20 + window 200 + α 0.005 + family A: detection_rate ≥ 60% (3/5 trials)"). HALT if observed rate falls below the claimed minimum (per directive halt condition 7).

- **Strengths:** characterizes detection PROBABILITY at each cell with 5-trial Monte Carlo; matrix is the empirical record; ACs guard against operator-visible regression at the named diagnostic cells.
- **Weaknesses:** 5 trials is the bare minimum for a discriminating rate estimate (resolution: 0%, 20%, 40%, 60%, 80%, 100%); higher trial counts would give finer resolution at proportional cost.
- **Hidden assumption:** 5-trial resolution is sufficient for operator-relevant tuning decisions. Defensible: the directive specifies 5 trials explicitly. Operators tuning Tessera need to distinguish "essentially always detects" (5/5) from "essentially never detects" (0/5) and the transitional band (2-3 / 5); fractional differences inside a single bin are not the round's contribution.
- **Brainstorm note:** the alternative is to bisect adaptively (run more trials at cells near 50% detection); this would be a different deliverable shape and is OUT OF SCOPE here — the round's contribution is the envelope CHARACTERIZATION at the named parameter grid, not an adaptive sampler.
- **PICKED.**

### Approach C — Single trial per cell + bisection across magnitude axis to find p50-detection threshold

For each (window × α × family) combination, run a binary-search across the magnitude axis to find the magnitude at which detection probability ≈ 50%. Report a 4-axis "p50 surface" rather than a full 4D matrix.

- **Strengths:** more efficient at producing the headline "tuning curve" answer (where IS the detection boundary).
- **Weaknesses:** requires an adaptive sampler implementation (more complex than the deterministic-grid runner R72 already proved); single-trial bisection is also PRNG-noise-dominated (the binary-search converges to noise, not to the true p50 boundary) without multi-trial averaging per probe — at which point Approach B's matrix is recovered with more code.
- **Hidden assumption:** an adaptive sampler is simpler than a deterministic grid. Empirically refuted by the established R72 deterministic-grid pattern.
- **Eliminated** in favor of B, which delivers the same operator-relevant tuning information (where does detection rate cross 50%?) from a deterministic grid that's easier to audit + reproduce.

### Selection rationale

**Approach B picked.** Multi-seed deterministic grid + minimum-rate-per-named-cell ACs delivers (a) the matrix as empirical record, (b) discriminating per-cell ACs that fail only on substantive detection-rate regression (not PRNG noise), (c) an architecture isomorphic to R72's already-validated `coverage-saturation.ts` pattern so the Implementer can follow the established pattern without inventing a new harness shape.

**What was rejected:**
- A — single-trial cells are PRNG-noise-dominated at the boundary; binary-detection ACs would either trivially pass (cells far from boundary) or fail on noise (cells near boundary).
- C — adaptive bisection adds harness complexity without reducing the operator-relevant deliverable; the directive's "5 trials per cell" framing implies B.

---

## § 1. Design phase (Superpowers Phase 2)

### 1.1 Component boundaries

| Layer | Exists | Created | Changed | Deleted |
|---|---|---|---|---|
| Detection-envelope runner | — | `tools/detector-envelope.ts` (Tessera-original; single file; target ~900-1100 lines TS) | — | — |
| Detection-curve renderer | — | `tools/detection-curve.ts` (Tessera-original; single file; target ~200-300 lines TS) | — | — |
| Operator tuning recommendation | — | `scripts/detector-tuning-recommendation.md` (Tessera-original; written content; ~120-200 lines MD) | — | — |
| Envelope outputs | — | `coordination/coverage/R77-detection-envelope-matrix.json` + `R77-detection-envelope.md` (Tessera-original; generated; checked into git) | — | — |
| Package scripts | `package.json` (scripts block) | — | adds 2 entries (`prebuild:detector-envelope`, `detector-envelope`) | — |
| README | `README.md` ("Coverage" section tail) | — | extends Coverage section (≤ 30 added lines) at tail | — |
| Tests | — | `test/q77-detector-envelope.test.ts` (Tessera-original; target ~500-700 lines TS) | — | — |
| Engine | ALL engine/* files frozen | — | — | — |
| R70/R71/R72/R73/R74/R75 surfaces | `tools/demo-scenario.ts`, `tools/build-canned-demos.ts`, `tools/coverage-saturation.ts`, `demos/`, `coordination/coverage/R72-*`, `scripts/tier-router*.ts`, `scripts/mu-model-select*.ts`, `scripts/build-role-context.ts`, `scripts/measure-cache-effect.ts`, `run-pipeline.sh`, all q01..q76 test files | — | — | — |
| Spec triad | — | `coordination/specs/Q-R77-SPEC.md`, `Q-R77-SPEC-AUDIT.md`, `Q-R77-EMPIRICAL.sh` | — | — |

**Critical anti-scope clarification:** `tools/coverage-saturation.ts` (R72) is **READ-ONLY** at R77. The detection-envelope runner re-implements LCG + Gaussian primitives (same pattern as R72 re-implementing rather than importing from `tools/build-canned-demos.ts`) to keep cross-tool coupling zero. The runner imports engine surfaces ONLY by `.js` extension (matches R72 + R70/R71 convention).

### 1.2 Data flow (build-time + test-time)

```
pnpm detector-envelope
   → prebuild:detector-envelope compiles tools/detector-envelope.ts → .js (and tools/detection-curve.ts → .js)
   → node tools/detector-envelope.js
       for each (magnitude_idx ∈ 0..13, window_idx ∈ 0..5, alpha_idx ∈ 0..2, family_idx ∈ 0..1):
         cell_idx = ((magnitude_idx * 6 + window_idx) * 3 + alpha_idx) * 2 + family_idx
         params = { drift_magnitude: MAGNITUDES[magnitude_idx],
                    window_count:    WINDOW_COUNTS[window_idx],
                    alpha:           ALPHAS[alpha_idx],
                    family:          FAMILIES[family_idx] }
         trials = []
         for trial_idx ∈ 0..4:
           seed = SCENARIO_SEED_PREFIX ^ (cell_idx * 5 + trial_idx)
           outcome = runSingleTrial(params, seed)   — see § 1.4
           trials.push({ trial_idx, seed, detected, detection_window_index })
         summary = aggregateCell(trials)            — see § 1.5
         matrix.cells.push({ params, summary, trials })
       writeFile(coordination/coverage/R77-detection-envelope-matrix.json)
       renderMd(matrix) → writeFile(coordination/coverage/R77-detection-envelope.md)
                          (MD includes ASCII curves rendered via tools/detection-curve.ts)

pnpm test (no engine modification path)
   → tsc -p tsconfig.test.json compiles test/q77-detector-envelope.test.ts → .js (+0 expected new tsc errors)
   → node --test asserts on:
       - matrix.json schema_version + shape + cell count (504)
       - per-cell field schema (params, summary, trials)
       - named-cell minimum-rate ACs (§ 4.5)
       - matrix-md exists + contains required sections (§ 4.6)
       - detection-curve ASCII rendered (§ 4.7)
       - detector-tuning-recommendation.md exists + has required sections (§ 4.8)
       - anti-regression: R72 + R70/R71 + R73/R74/R75 surfaces byte-identical (§ 4.9)
       - typecheck count + test count + anti-scope diff (§ 4.10-4.12)
```

### 1.3 Integration points with engine surfaces (claim-then-walk verified at Architect session entry; engine SHA = `0d64d9a`)

Each engine signature was opened by direct file read at session entry 2026-05-20 — not from memory or prior-round attestation.

| Engine entry point | Source file:line | Signature (verbatim from session-entry read) | R77 usage |
|---|---|---|---|
| `freshBettingState` | `engine/detectors/betting-e-process.ts:72` | `(): BettingEProcessState` returning `{ M:1, bet:0, n:0, alphaConsumed:0, runningMean:0, runningSecondMoment:0, onsFallbackCount:0 }`. | Family A: allocate per-trial state. |
| `updateBettingState` | `engine/detectors/betting-e-process.ts:151` | `(state: BettingEProcessState, x: number, baselineMean: number, sigmaSquared: number, perTickAlpha: number): number` — MUTATES state in-place; returns updated `state.M`. | Family A: drive per-tick wealth update. |
| `onsUpdate` | `engine/detectors/family-c-betting-e-process.ts:231` | `(state: FamilyCBettingEProcessState, F_t: number, lambda_max: number): void` — MUTATES state.ons_lambda + state.ons_inverse_hessian. | Family C (R77 interpretation): predictable ONS bet update per Cutkosky-Orabona 2018. |
| `freshFamilyCBettingEProcessState` | `engine/detectors/family-c-betting-e-process.ts:100` | `(p: number, D?: number): FamilyCBettingEProcessState` — initializes `{ log_S_t:0, ons_lambda:0, ons_inverse_hessian:1, n:0, witness_running_max:0, q_running_sum: Array<p>.fill(0), q_count:0, fired:false, tick_at_first_fire:null, alphaConsumed:0 }`. | Family C (R77 interpretation): allocate per-trial state with p=1 (1D drift scalar). Unused fields (q_running_sum, q_count, witness_running_max) remain at initial values; R77 Family C path does NOT use the kernel-MMD witness — see § 1.4 sub-§ Family C interpretation. |

**Family C interpretation for R77 (architectural choice; recorded HERE because it is a load-bearing decision):** `engine/detectors/family-c-betting-e-process.ts` is canonically a kernel-MMD detector requiring a multi-signal P-side baseline pool + Q-side empirical mean. Applying the FULL `evaluateFamilyCBettingEProcess` to a single 1D drift signal requires constructing a synthetic `CompiledConfig` + baseline cells — which exceeds the round's anti-scope (no engine/* modifications + no synthetic config construction). The R77 deliverable "Family C changepoint comparison" is interpreted as: **use the exported Family C primitive `onsUpdate` to drive a pure-ONS betting strategy on the same 1D bounded-z input as Family A**, producing a meaningful theoretical comparison of (Family A: GRAPA/ONS-fallback bounded-z bet, M_t multiplicative) vs (Family C: ONS-only bounded-z bet, log_S_t additive). This preserves the directive's stated comparison (Family A baseline vs Family C alternative) WITHOUT requiring engine modifications. The interpretation is documented inline in `tools/detector-envelope.ts` header per R72's precedent for spec-deviation transparency (R72 coverage-saturation.ts:9-19).

### 1.4 Per-trial outcome computation (single-shard Family A; single-shard Family C-style; deterministic seeded)

```
runSingleTrial(params, seed):
  rng = makeLcg(seed)
  detected = false
  detection_window_index = null
  if params.family === 'family-a':
    state = freshBettingState()
    threshold = 1 / params.alpha
    for w ∈ 0..params.window_count - 1:
      x_unshifted = boxMullerGaussian(rng)
      x = x_unshifted + params.drift_magnitude * (w + 1)   — drift accumulates from window 0
      updateBettingState(state, x, /* baselineMean */ 0, /* sigmaSquared */ 1, params.alpha)
      if !detected && state.M >= threshold:
        detected = true
        detection_window_index = w
  else: // params.family === 'family-c'
    state = freshFamilyCBettingEProcessState(/* p */ 1)
    log_threshold = -Math.log(params.alpha)
    LAMBDA_MAX = 0.5    — canonical Shekhar-Ramdas default per engine/detectors/family-c-betting-e-process.ts:91
    for w ∈ 0..params.window_count - 1:
      x_unshifted = boxMullerGaussian(rng)
      x = x_unshifted + params.drift_magnitude * (w + 1)
      // R77 Family C path: 1D bounded-z witness; matches Family A's bounded-z convention for fair comparison.
      // BOUNDED_SCALE_B = 3 per engine/detectors/betting-e-process.ts:61 (sigma=1 ⇒ denom=3).
      z_raw = x / 3
      z = z_raw > 1 ? 1 : (z_raw < -1 ? -1 : z_raw)
      F_t = z    — 1D witness; identity to bounded-z
      wealth_factor = 1 + state.ons_lambda * F_t
      log_factor = Math.log(Math.max(wealth_factor, 1e-12))
      state.log_S_t += log_factor
      onsUpdate(state, F_t, LAMBDA_MAX)
      if !detected && state.log_S_t >= log_threshold:
        detected = true
        detection_window_index = w
  return { detected, detection_window_index }
```

**Standardization convention rationale:** drift is injected as raw additive shift on a standard-normal baseline (μ=0, σ=1). This matches R72 `runType1Variation` (coverage-saturation.ts:230-237) where drift is added directly to `boxMullerGaussian(rng)` and the betting state is updated with `baselineMean=0, sigmaSquared=1`. Same convention here for apples-to-apples comparison with R72.

**Drift semantics deviation from R72 (recorded — Implementer must follow R77's, not R72's):** R72 uses `drift * (w - drift_start + 1)` where drift_start ≥ 4 and the pre-drift windows have zero shift. R77 uses `drift_magnitude * (w + 1)` starting from window 0 — drift_start is effectively 0. **R77 simplifies to start-at-window-0** because (a) the round's deliverable is the CHARACTERIZATION of the detection envelope as a function of magnitude, not magnitude × start-window jointly; (b) start-from-window-0 makes the detection-envelope cleaner to interpret operators-side ("at magnitude X with N windows, you detect P% of the time"); (c) R72's drift_start variation remains preserved in R72 saturation matrix as a separate axis. R77 is not re-running R72's grid; it's a complementary characterization.

### 1.5 Per-cell aggregation

```
aggregateCell(trials):  // trials.length === 5
  detected_trials = trials.filter(t => t.detected)
  detection_count = detected_trials.length
  detection_rate = detection_count / 5
  detection_windows = detected_trials.map(t => t.detection_window_index).sort((a,b) => a - b)
  detection_window_median = detection_windows.length > 0 ? detection_windows[Math.floor(detection_windows.length / 2)] : null
  detection_window_p95 = detection_windows.length > 0 ? detection_windows[Math.min(detection_windows.length - 1, Math.floor(0.95 * (detection_windows.length - 1)))] : null
  return { detection_count, detection_rate, detection_window_median, detection_window_p95 }
```

Note: with 5 trials, p95 ≈ max (index 4 when all 5 detect). The harness reports both median and p95 so the matrix-md table can show "median (p95)" per cell — useful for the curve renderer.

### 1.6 Baseline-test-status (verified at Architect session entry)

| Failing AC at round-start | Source | Reason | Disposition for R77 |
|---|---|---|---|
| `AC-R36-21: CLAUDE-IMPLEMENTER.md has ≤30 distinct REINFORCED block entries after MR-2` | `test/q36-claude-implementer-md-reinforcements-consolidation.test.js:?` | CLAUDE-IMPLEMENTER.md REINFORCED count grew above the R36 cap as later rounds appended | **Carry-forward; NOT addressed by R77** (anti-scope: NO modification of carry-forward AC fail set per directive) |
| `AC-R36-30: round-start-to-chore-A diff path-set ⊆ R36 allowed-set` | `test/q36-...:?` | R36-era allowed-set narrower than subsequent rounds' actual diff | **Carry-forward** |
| `AC-R36-31: chore-A-to-HEAD diff ⊆ R36 post-chore-A allowed set` | `test/q36-...:?` | Same root cause as AC-R36-30 | **Carry-forward** |
| `AC-R65-2: engine/ds-integration/index.ts has 3 export-star lines` | `test/q65-ds-integration-feed.test.js:94:26` | export-star line count drifted from 3 → 5 in a subsequent round | **Carry-forward** |
| `AC-R66-14: anti-scope diff round-start..HEAD ⊆ ALLOWED_SET (9 paths) — unauthorized path: .gitignore` | `test/q66-ds-integration-event-consumer.test.js:246:26` | R66 ALLOWED_SET did not include `.gitignore`; later rounds modified it | **Carry-forward** |

Post-R77 test-count predictions (Architect, computed BEFORE chore-A so the Implementer's chore-A run can be checked against these):

| State | tests | pass | fail | suites | skipped | cancelled | todo |
|---|---|---|---|---|---|---|---|
| Round-start HEAD (`0d64d9a`) | 549 | 541 | 5 | 3 | 3 | 0 | 0 |
| Predicted at R77 chore-A HEAD | 549 + N_new_R77 | 541 + N_new_R77 | 5 | 3 | 3 | 0 | 0 |

**Architect pre-prediction:** `N_new_R77 = 17` distinct `test()` blocks (one per AC; see § 4 AC table) → predicted post-chore-A tests=566, pass=558, fail=5. If the Implementer's actual count diverges from 17 by > 2, HALT per spec § 6 halt condition 4 (architectural-reality discovery) and report a DIAGNOSTIC with the actual count + the test-bodies that were added.

`npx tsc -p tsconfig.test.json` predicted exit code: **0** at chore-A (matches round-start baseline). If chore-A's actual exit code is non-zero, HALT per § 6.2.

---

## § 2. Component inventory

| Path | Type | New / Modified / Frozen |
|---|---|---|
| `tools/detector-envelope.ts` | Tessera-original TS source | **NEW** |
| `tools/detection-curve.ts` | Tessera-original TS source | **NEW** |
| `scripts/detector-tuning-recommendation.md` | Tessera-original written content | **NEW** |
| `coordination/coverage/R77-detection-envelope-matrix.json` | Generated; committed | **NEW** |
| `coordination/coverage/R77-detection-envelope.md` | Generated; committed | **NEW** |
| `package.json` | Project config | **MODIFIED** — add 2 script entries: `prebuild:detector-envelope` + `detector-envelope` |
| `README.md` | Project docs | **MODIFIED** — extend Coverage section (≤ 30 lines added at tail) |
| `test/q77-detector-envelope.test.ts` | Tessera-original test | **NEW** |
| `coordination/specs/Q-R77-SPEC.md` | Spec | **NEW** (this file) |
| `coordination/specs/Q-R77-SPEC-AUDIT.md` | Spec audit sidecar | **NEW** |
| `coordination/specs/Q-R77-EMPIRICAL.sh` | Empirical verification script | **NEW** |
| `coordination/NEXT-ROLE.md` | Pipeline routing | **MODIFIED** — append routing block (preserves existing § R77 Round-scope directive byte-identically per within-round prefix-continuity invariant) |
| `coordination/MEMORIAL.md` | Memorial appends (each role appends own entries) | **MODIFIED** |
| `coordination/reviews/REVIEWER-REPORT-R77.md` | Reviewer-only | **NEW** (Reviewer creates) |
| `coordination/diagnostics/DIAGNOSTIC-R77-*.md` | Halt-condition artifact | **NEW IF HALT** (Implementer creates IF spec § 6 halt fires) |
| `coordination/logs/ROUND-R77-ROUTING.md` | Pipeline routing log (created by pipeline at dispatch) | **NEW** (pre-existing as untracked at Architect session entry; may be committed by pipeline) |
| ALL `engine/**/*.ts` | Engine source | **FROZEN** |
| ALL `tools/*.ts` other than the 2 NEW above | Existing tools | **FROZEN** |
| ALL `scripts/*.ts` and `scripts/*.js` other than the 1 NEW .md above | Existing scripts | **FROZEN** |
| `run-pipeline.sh` | Pipeline script | **FROZEN** (Tessera-temporary-divergence on hold per directive) |
| ALL `test/q*.test.ts` other than q77 | Existing tests | **FROZEN** (carry-forward fail set preserved) |
| ALL `test/_substrate/*` | Test substrate | **FROZEN** |
| `coordination/coverage/R72-saturation-matrix.json` | R72 output | **FROZEN** (anti-regression) |
| `coordination/coverage/R72-saturation-matrix.md` | R72 output | **FROZEN** (anti-regression) |
| ALL `coordination/specs/Q-R*-SPEC*.md` other than R77 | Prior specs | **FROZEN** |

---

## § 3. Per-file pseudocode

### 3.1 `tools/detector-envelope.ts` (NEW; ~900-1100 lines TS)

```ts
// tools/detector-envelope.ts — Tessera R77 detection-envelope sweep runner.
//
// Characterizes the detection probability of the per-shard Family A betting
// e-process (and an R77-defined Family C ONS comparison; see header note
// below) across drift magnitude × window count × α threshold × detector
// family. Deterministic (seeded LCG); idempotent.
//
// Family C interpretation for R77:
//   engine/detectors/family-c-betting-e-process.ts is canonically a kernel-MMD
//   detector. Applying the FULL evaluateFamilyCBettingEProcess to a 1D drift
//   signal requires synthetic CompiledConfig + baseline cells (out of R77
//   anti-scope). R77 uses the exported `onsUpdate` primitive to drive a
//   pure-ONS betting strategy on the same bounded-z input as Family A, giving
//   a meaningful theoretical comparison of (A: GRAPA/ONS-fallback dual bet,
//   M_t multiplicative wealth) vs (C: ONS-only bet, log_S_t additive wealth).
//   See Q-R77-SPEC.md § 1.3 sub-§ Family C interpretation.
//
// Anti-scope: no new external deps; no engine modifications; no real-cluster
// work; no DS-repo modifications. Tessera-original code. NOT vendored.

// ── Engine imports (.js extension; matches R72 convention) ──
import { freshBettingState, updateBettingState } from '../engine/detectors/betting-e-process.js';
import {
  freshFamilyCBettingEProcessState, onsUpdate,
} from '../engine/detectors/family-c-betting-e-process.js';

// ── fs + path imports (Node-builtins only) ──
import * as fs from 'node:fs';
import * as path from 'node:path';

// ── Public exported types ──
export type DetectorFamily = 'family-a' | 'family-c';
export const DETECTOR_FAMILIES: ReadonlyArray<DetectorFamily> = ['family-a', 'family-c'];

export interface EnvelopeOpts { readonly _reserved?: never; }
export interface EnvelopeResult {
  matrix_json_path: string;
  matrix_md_path: string;
  bytes_total: number;
  total_cells: 504;
  total_trials: 2520;
}

// ── Parameter grid (exact literals; § 1.2 spec) ──
export const MAGNITUDES: ReadonlyArray<number> = [
  0.050, 0.075, 0.100, 0.125, 0.150, 0.175, 0.200,
  0.225, 0.250, 0.275, 0.300, 0.325, 0.350, 0.375,
];                                   // 14 magnitudes
export const WINDOW_COUNTS: ReadonlyArray<number> = [30, 50, 75, 100, 150, 200];  // 6 windows
export const ALPHAS: ReadonlyArray<number> = [0.001, 0.005, 0.010];               // 3 α thresholds
export const TRIALS_PER_CELL = 5;
export const TOTAL_CELLS = 504;  // 14 × 6 × 3 × 2
export const TOTAL_TRIALS = 2520; // 504 × 5
const SCENARIO_SEED_PREFIX = 0x77E11; // 491025 decimal — recorded in matrix JSON

// ── LCG + Gaussian primitives (re-implemented; not imported from tools/coverage-saturation.ts) ──
function makeLcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => { s = ((s * 1664525) + 1013904223) >>> 0; return s / 0x100000000; };
}
function boxMullerGaussian(rng: () => number): number {
  const u1 = Math.max(rng(), 1e-12);
  const u2 = rng();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

// ── Internal types ──
interface TrialResult { trial_idx: number; seed: number; detected: boolean; detection_window_index: number | null; }
interface CellSummary {
  detection_count: number; detection_rate: number;
  detection_window_median: number | null; detection_window_p95: number | null;
}
interface CellRow {
  cell_idx: number;
  params: { drift_magnitude: number; window_count: number; alpha: number; family: DetectorFamily };
  summary: CellSummary;
  trials: ReadonlyArray<TrialResult>;
}
interface DetectionEnvelopeMatrix {
  schema_version: 'tessera-detection-envelope-v1';
  generated_with_seed_prefix: number;
  parameter_grid: {
    magnitudes: ReadonlyArray<number>; window_counts: ReadonlyArray<number>;
    alphas: ReadonlyArray<number>; families: ReadonlyArray<DetectorFamily>;
    trials_per_cell: number;
  };
  cells: ReadonlyArray<CellRow>;
}

// ── Per-trial runner (Family A) ──
function runFamilyATrial(magnitude: number, window_count: number, alpha: number, seed: number): TrialResult {
  const rng = makeLcg(seed);
  const state = freshBettingState();
  const threshold = 1 / alpha;
  let detection_window_index: number | null = null;
  for (let w = 0; w < window_count; w++) {
    const x = boxMullerGaussian(rng) + magnitude * (w + 1);
    updateBettingState(state, x, 0, 1, alpha);
    if (detection_window_index === null && state.M >= threshold) {
      detection_window_index = w;
    }
  }
  return {
    trial_idx: 0,  // assigned by caller
    seed,
    detected: detection_window_index !== null,
    detection_window_index,
  };
}

// ── Per-trial runner (Family C; R77 interpretation per spec § 1.3) ──
const LAMBDA_MAX_FAMILY_C = 0.5; // canonical Shekhar-Ramdas default; engine/detectors/family-c-betting-e-process.ts:91
const BOUNDED_SCALE_B = 3;       // matches engine/detectors/betting-e-process.ts:61
const LOG_FACTOR_FLOOR = 1e-12;
function runFamilyCTrial(magnitude: number, window_count: number, alpha: number, seed: number): TrialResult {
  const rng = makeLcg(seed);
  const state = freshFamilyCBettingEProcessState(1);
  const log_threshold = -Math.log(alpha);
  let detection_window_index: number | null = null;
  for (let w = 0; w < window_count; w++) {
    const x = boxMullerGaussian(rng) + magnitude * (w + 1);
    const z_raw = x / BOUNDED_SCALE_B;
    const z = z_raw > 1 ? 1 : (z_raw < -1 ? -1 : z_raw);
    const F_t = z;
    const wealth_factor = 1 + state.ons_lambda * F_t;
    const log_factor = Math.log(Math.max(wealth_factor, LOG_FACTOR_FLOOR));
    state.log_S_t += log_factor;
    onsUpdate(state, F_t, LAMBDA_MAX_FAMILY_C);
    if (detection_window_index === null && state.log_S_t >= log_threshold) {
      detection_window_index = w;
    }
  }
  return {
    trial_idx: 0,
    seed,
    detected: detection_window_index !== null,
    detection_window_index,
  };
}

// ── Cell aggregation ──
function aggregateCell(trials: ReadonlyArray<TrialResult>): CellSummary {
  const detected_trials = trials.filter(t => t.detected);
  const detection_count = detected_trials.length;
  const detection_rate = detection_count / TRIALS_PER_CELL;
  const detection_windows = detected_trials
    .map(t => t.detection_window_index!)
    .sort((a, b) => a - b);
  const median = detection_windows.length > 0
    ? detection_windows[Math.floor(detection_windows.length / 2)]
    : null;
  // p95 over a length-N sample: index = min(N-1, floor(0.95 * (N-1)))
  const p95_idx = detection_windows.length > 0
    ? Math.min(detection_windows.length - 1, Math.floor(0.95 * (detection_windows.length - 1)))
    : -1;
  const p95 = p95_idx >= 0 ? detection_windows[p95_idx] : null;
  return {
    detection_count,
    detection_rate,
    detection_window_median: median,
    detection_window_p95: p95,
  };
}

// ── Matrix builder ──
function buildEnvelopeMatrix(): DetectionEnvelopeMatrix {
  const cells: CellRow[] = [];
  let cell_idx = 0;
  for (let mi = 0; mi < MAGNITUDES.length; mi++) {
    for (let wi = 0; wi < WINDOW_COUNTS.length; wi++) {
      for (let ai = 0; ai < ALPHAS.length; ai++) {
        for (let fi = 0; fi < DETECTOR_FAMILIES.length; fi++) {
          const magnitude = MAGNITUDES[mi];
          const window_count = WINDOW_COUNTS[wi];
          const alpha = ALPHAS[ai];
          const family = DETECTOR_FAMILIES[fi];
          const trials: TrialResult[] = [];
          for (let ti = 0; ti < TRIALS_PER_CELL; ti++) {
            const seed = (SCENARIO_SEED_PREFIX ^ (cell_idx * TRIALS_PER_CELL + ti)) >>> 0;
            const t = family === 'family-a'
              ? runFamilyATrial(magnitude, window_count, alpha, seed)
              : runFamilyCTrial(magnitude, window_count, alpha, seed);
            trials.push({ ...t, trial_idx: ti });
          }
          const summary = aggregateCell(trials);
          cells.push({
            cell_idx,
            params: { drift_magnitude: magnitude, window_count, alpha, family },
            summary,
            trials,
          });
          cell_idx += 1;
        }
      }
    }
  }
  return {
    schema_version: 'tessera-detection-envelope-v1',
    generated_with_seed_prefix: SCENARIO_SEED_PREFIX,
    parameter_grid: {
      magnitudes: MAGNITUDES, window_counts: WINDOW_COUNTS,
      alphas: ALPHAS, families: DETECTOR_FAMILIES,
      trials_per_cell: TRIALS_PER_CELL,
    },
    cells,
  };
}

// ── Markdown renderer ──
function renderMatrixMd(matrix: DetectionEnvelopeMatrix): string {
  const lines: string[] = [];
  lines.push('# Tessera R77 — detection envelope matrix');
  lines.push('');
  lines.push('Generated by `tools/detector-envelope.ts`; deterministic; idempotent. Full machine-readable data: `R77-detection-envelope-matrix.json`.');
  lines.push('');
  lines.push(`Parameter grid: ${matrix.parameter_grid.magnitudes.length} magnitudes × ${matrix.parameter_grid.window_counts.length} window counts × ${matrix.parameter_grid.alphas.length} α thresholds × ${matrix.parameter_grid.families.length} families × ${matrix.parameter_grid.trials_per_cell} trials = ${matrix.cells.length} cells.`);
  lines.push('');
  // For each α + family, render a magnitude × window heatmap of detection_rate.
  for (const family of matrix.parameter_grid.families) {
    for (const alpha of matrix.parameter_grid.alphas) {
      lines.push(`## ${family} — α = ${alpha}`);
      lines.push('');
      lines.push('Detection rate (M/5 trials). Columns: window_count. Rows: drift_magnitude.');
      lines.push('');
      const header = ['mag \\ W', ...matrix.parameter_grid.window_counts.map(w => String(w))].join(' | ');
      lines.push('| ' + header + ' |');
      lines.push('|' + '---|'.repeat(matrix.parameter_grid.window_counts.length + 1));
      for (const mag of matrix.parameter_grid.magnitudes) {
        const row = [mag.toFixed(3)];
        for (const wc of matrix.parameter_grid.window_counts) {
          const cell = matrix.cells.find(c =>
            c.params.drift_magnitude === mag &&
            c.params.window_count === wc &&
            c.params.alpha === alpha &&
            c.params.family === family,
          );
          if (!cell) throw new Error(`missing cell: mag=${mag} wc=${wc} α=${alpha} family=${family}`);
          row.push(`${cell.summary.detection_count}/5`);
        }
        lines.push('| ' + row.join(' | ') + ' |');
      }
      lines.push('');
    }
  }
  // ASCII curves (one block per α, with both families overlaid; rendered via detection-curve.ts).
  lines.push('## Detection curves (rate vs magnitude; window_count = 200; rendered via `tools/detection-curve.ts`)');
  lines.push('');
  // Delegate to detection-curve.ts at render time — see § 3.2.
  for (const alpha of matrix.parameter_grid.alphas) {
    lines.push(`### α = ${alpha}, window_count = 200`);
    lines.push('');
    lines.push('```');
    lines.push(renderAsciiCurve(matrix, alpha, 200));
    lines.push('```');
    lines.push('');
  }
  lines.push('## Method');
  lines.push('');
  lines.push('Each cell runs 5 deterministic trials seeded by `(SCENARIO_SEED_PREFIX ^ (cell_idx * 5 + trial_idx))`. Family A uses `engine/detectors/betting-e-process.ts:updateBettingState`; Family C uses `engine/detectors/family-c-betting-e-process.ts:onsUpdate` per R77 Family C interpretation (see Q-R77-SPEC.md § 1.3). No engine modifications; no new dependencies. Re-running `pnpm detector-envelope` produces byte-identical output.');
  lines.push('');
  return lines.join('\n');
}

// ── Imported curve renderer (re-exported from detection-curve.ts) ──
import { renderAsciiCurve } from './detection-curve.js';

// ── Serialization helpers ──
function serializeJson(matrix: DetectionEnvelopeMatrix): string {
  return JSON.stringify(matrix, null, 2) + '\n';
}

// ── Public entry point ──
export function runDetectionEnvelope(_opts?: EnvelopeOpts): EnvelopeResult {
  const root = path.resolve(__dirname, '..');
  const coverageDir = path.join(root, 'coordination', 'coverage');
  fs.mkdirSync(coverageDir, { recursive: true });
  const matrix = buildEnvelopeMatrix();
  const jsonStr = serializeJson(matrix);
  const mdStr = renderMatrixMd(matrix);
  const jsonPath = path.join(coverageDir, 'R77-detection-envelope-matrix.json');
  const mdPath = path.join(coverageDir, 'R77-detection-envelope.md');
  fs.writeFileSync(jsonPath, jsonStr);
  fs.writeFileSync(mdPath, mdStr);
  return {
    matrix_json_path: jsonPath,
    matrix_md_path: mdPath,
    bytes_total: jsonStr.length + mdStr.length,
    total_cells: 504,
    total_trials: 2520,
  };
}

// ── CLI guard (matches tools/coverage-saturation.ts:673 convention) ──
if (require.main === module) {
  const result = runDetectionEnvelope();
  process.stdout.write(
    `Built detection envelope matrix: ${result.total_cells} cells, ${result.total_trials} trials.\n` +
    `JSON: ${path.relative(process.cwd(), result.matrix_json_path)}\n` +
    `MD:   ${path.relative(process.cwd(), result.matrix_md_path)}\n`,
  );
  process.exit(0);
}
```

### 3.2 `tools/detection-curve.ts` (NEW; ~200-300 lines TS)

```ts
// tools/detection-curve.ts — Tessera R77 ASCII detection-curve renderer.
//
// Renders an ASCII detection-rate-vs-magnitude curve from a
// DetectionEnvelopeMatrix at a fixed (α, window_count) slice, overlaying
// both families. Imported by tools/detector-envelope.ts for inclusion in
// the matrix markdown summary; also a standalone CLI for ad-hoc operator
// exploration.
//
// Anti-scope: no engine imports; no new dependencies (re-imports the
// detector-envelope matrix type via the re-export pattern).

import * as fs from 'node:fs';
import * as path from 'node:path';

// Local copy of the relevant matrix-shape types (avoids cyclic import).
// Must match tools/detector-envelope.ts exports byte-equivalently for the
// matrix JSON to deserialize correctly.
interface CellRowParams {
  drift_magnitude: number; window_count: number; alpha: number; family: 'family-a' | 'family-c';
}
interface CellRowSummary {
  detection_count: number; detection_rate: number;
  detection_window_median: number | null; detection_window_p95: number | null;
}
interface CellRow { cell_idx: number; params: CellRowParams; summary: CellRowSummary;
                    trials: ReadonlyArray<{ trial_idx: number; seed: number; detected: boolean; detection_window_index: number | null }>; }
export interface DetectionEnvelopeMatrixLike {
  schema_version: string;
  parameter_grid: {
    magnitudes: ReadonlyArray<number>; window_counts: ReadonlyArray<number>;
    alphas: ReadonlyArray<number>; families: ReadonlyArray<'family-a' | 'family-c'>;
    trials_per_cell: number;
  };
  cells: ReadonlyArray<CellRow>;
}

// ── ASCII renderer ──
// Renders a 5-row × N_magnitudes chart:
//   row label | A:M_a/5 C:M_c/5 ...   (text histogram of detection_count per family)
// Each cell is rendered as a 2-char block: 'A:#' '.A' '.B' etc.

export function renderAsciiCurve(
  matrix: DetectionEnvelopeMatrixLike,
  alpha: number,
  window_count: number,
): string {
  const lines: string[] = [];
  const mags = matrix.parameter_grid.magnitudes;
  lines.push(`mag      | ` + mags.map(m => m.toFixed(3)).join(' '));
  lines.push(`---------|` + '------'.repeat(mags.length));
  for (const family of matrix.parameter_grid.families) {
    const cells = mags.map(mag => {
      const c = matrix.cells.find(c =>
        c.params.drift_magnitude === mag &&
        c.params.window_count === window_count &&
        c.params.alpha === alpha &&
        c.params.family === family,
      );
      if (!c) return '  ?  ';
      const n = c.summary.detection_count; // 0..5
      // Render as a 5-char bar where filled blocks = detection_count.
      return '#'.repeat(n) + '.'.repeat(5 - n);
    });
    const label = family === 'family-a' ? 'A:rate ' : 'C:rate ';
    lines.push(label + ' | ' + cells.join(' '));
  }
  return lines.join('\n');
}

// ── CLI entry point (optional convenience) ──
function main(): void {
  const argv = process.argv.slice(2);
  if (argv.length < 1) {
    process.stderr.write('Usage: node tools/detection-curve.js <matrix.json> [alpha] [window_count]\n');
    process.exit(2);
  }
  const matrixPath = path.resolve(argv[0]);
  const alpha = argv[1] !== undefined ? parseFloat(argv[1]) : 0.005;
  const window_count = argv[2] !== undefined ? parseInt(argv[2], 10) : 200;
  const raw = fs.readFileSync(matrixPath, 'utf8');
  const matrix: DetectionEnvelopeMatrixLike = JSON.parse(raw);
  process.stdout.write(renderAsciiCurve(matrix, alpha, window_count) + '\n');
  process.exit(0);
}

if (require.main === module) {
  main();
}
```

### 3.3 `scripts/detector-tuning-recommendation.md` (NEW; ~120-200 lines MD; written content)

```markdown
# Detector tuning recommendations — Tessera detection envelope (R77)

This document is the operator-facing companion to the empirical envelope
matrix at `coordination/coverage/R77-detection-envelope-matrix.json` +
`R77-detection-envelope.md`.

## Empirical envelope (what the sweep shows)

[content authored by Implementer; references the actual matrix at HEAD.
 Implementer reads R77-detection-envelope-matrix.json and writes a 5-10
 sentence summary of: (a) the magnitude band where detection_rate ≥ 80%
 at the default α=0.005, window=200, family=A cell; (b) the band where
 0 < detection_rate < 80% (transitional); (c) the band where detection
 is essentially impossible. Implementer cites specific magnitude values
 from the matrix; the spec does NOT pre-author the band boundaries
 because they are empirical observables — per R71 MAJOR-1/MAJOR-2
 reinforcement (REINFORCED 2026-05-20 R71): pre-authored narrative text
 asserting empirical engine properties is the SAME class of failure as
 pre-authored expected-values asserting engine properties.]

## Tuning levers operators can adjust

Three levers are operator-visible (no engine modification required):

1. **Lower α (tighter Type-I budget)** — increases detection threshold;
   harder to fire; reduces FP rate; reduces detection rate at fixed
   magnitude. Operationally appropriate when FP cost dominates TP cost
   (e.g., paging oncall). Empirical effect at fixed magnitude × window:
   [Implementer fills in by reading the matrix; cites specific
   detection_rate values per α level].

2. **Lengthen window count (more accumulation)** — gives the wealth
   martingale more ticks to accumulate evidence; raises detection rate at
   fixed magnitude. Operationally appropriate when oncall response
   latency tolerates longer detection delays. Empirical effect at fixed
   magnitude × α: [Implementer fills in by reading the matrix].

3. **Switch detector family** — Family A (current default) uses GRAPA/ONS-
   fallback dual betting with bounded-z; Family C (R77 comparison
   interpretation; pure ONS) uses log-space wealth accumulation. The R77
   matrix shows which family wins at each parameter cell. [Implementer
   reads the matrix and identifies the magnitude bands where C >> A,
   A >> C, or A ≈ C; cites specific cells.]

## Theoretical Ville-bound floor (cannot cross)

Ville's inequality gives: P(sup_t M_t ≥ 1/α | H₀) ≤ α. This is the
floor of false-positive rate; no operator tuning can reduce it. The
inverse implication: at H₁, the LOG wealth grows at rate ≈ KL(H₁ || H₀)
per tick under the optimal betting strategy. Below a magnitude that
gives positive KL divergence-per-tick × window_count > log(1/α), the
detector CANNOT reliably fire — no operator lever moves this boundary.

## Operational tuning margin (where tuning helps)

Above the Ville-bound floor, operators have real margin: choosing
α=0.01 vs α=0.001 changes the detection threshold by ~3× (log(1/0.01)
= 4.6 vs log(1/0.001) = 6.9, a difference of 2.3 nats); lengthening
the window from 30 to 200 gives 6.7× more accumulation ticks. The R77
matrix is the empirical record of WHERE in the parameter grid the
margin exists.

## How to use this document

[Implementer adds 3-5 sentences on operator workflow: (a) identify the
typical drift magnitude in your environment; (b) consult the matrix at
the matching magnitude × your acceptable detection-delay × your
acceptable FPR; (c) tune α or window_count accordingly. Cites the
matrix file path.]
```

### 3.4 `test/q77-detector-envelope.test.ts` (NEW; ~500-700 lines TS)

The test file binds every AC in § 4 (each `test()` block names AC-R77-N in its title verbatim). The test file:
1. Reads `coordination/coverage/R77-detection-envelope-matrix.json` at the start of each `test()` body (lazily; one read per test).
2. Asserts structural shape (§ 4.1 - 4.4).
3. Asserts per-named-cell minimum-rate ACs (§ 4.5; one `test()` per named cell).
4. Asserts auxiliary files exist + contain required sections (§ 4.6 - 4.8).
5. Asserts anti-regression byte-identity (§ 4.9; one `test()` block per frozen surface; aggregated via a single `forEach`-style table per § 4.10).
6. Asserts test-count + typecheck count + anti-scope diff (§ 4.11 - 4.13).

Implementer is responsible for the exact `assert.strictEqual` / `assert.deepStrictEqual` body; spec prescribes the AC literal and the file path/section to read. Each test() block must have its AC ID as a verbatim prefix in the test name (e.g., `test('AC-R77-7: at (mag=0.30, win=100, α=0.01, family=family-a): detection_rate ≥ 0.6', ...)`); the AC-R77-N substring is matched by EMPIRICAL.sh § Block 2.

### 3.5 `package.json` (MODIFIED; +2 script entries)

```diff
   "scripts": {
     "build": "tsc",
     "predemo": "tsc -p tsconfig.test.json",
     "demo": "node tools/demo-scenario.js",
     "prebuild:demos": "tsc -p tsconfig.test.json",
     "build:demos": "node tools/build-canned-demos.js",
     "prebuild:coverage": "tsc -p tsconfig.test.json",
     "coverage": "node tools/coverage-saturation.js",
+    "prebuild:detector-envelope": "tsc -p tsconfig.test.json",
+    "detector-envelope": "node tools/detector-envelope.js",
     "tier-router": "pnpm exec node scripts/tier-router.js",
     ...
   }
```

Two entries added at the end of the demos/coverage block, before `tier-router`. No other modification.

### 3.6 `README.md` (MODIFIED; extend Coverage section ≤ 30 added lines)

Implementer extends the existing "Coverage" section with a brief subsection citing the R77 detection-envelope outputs. Required content:

- Heading (e.g., `### Detection envelope (R77)` or sub-bullets under existing Coverage section)
- One-sentence description ("Tessera's per-shard detector detection probability characterized across drift magnitude × window count × α threshold × detector family.")
- Link to `coordination/coverage/R77-detection-envelope.md`
- Headline (Implementer fills in with empirical values from the matrix): e.g., "≈X% detection at drift magnitude ≥ Y/window under default α=0.005, window_count=200, family A" — where X and Y are read from the matrix, NOT pre-authored
- Link to `scripts/detector-tuning-recommendation.md`

≤ 30 net added lines. No modification of existing README content above the Coverage section.

---

## § 4. Acceptance criteria

| AC | Given / When / Then |
|---|---|
| **AC-R77-1: matrix-json artifact** | Given chore-A HEAD; when `fs.existsSync('coordination/coverage/R77-detection-envelope-matrix.json')`; then it returns `true`. |
| **AC-R77-2: matrix-md artifact** | Given chore-A HEAD; when `fs.existsSync('coordination/coverage/R77-detection-envelope.md')`; then it returns `true`. |
| **AC-R77-3: matrix schema_version** | Given the matrix JSON parsed; when reading `schema_version`; then it equals exactly `'tessera-detection-envelope-v1'`. |
| **AC-R77-4: matrix cell count** | Given the parsed matrix; when reading `cells.length`; then it equals exactly `504`. |
| **AC-R77-5: per-cell field schema** | Given any `cell ∈ cells`; when reading `cell`; then it has exactly the fields `{ cell_idx, params, summary, trials }`; `cell.params` has exactly `{ drift_magnitude, window_count, alpha, family }`; `cell.summary` has exactly `{ detection_count, detection_rate, detection_window_median, detection_window_p95 }`; `cell.trials.length === 5`; each `trial ∈ cell.trials` has exactly `{ trial_idx, seed, detected, detection_window_index }`. |
| **AC-R77-6: matrix idempotency** | Given chore-A HEAD; when `runDetectionEnvelope()` runs and the produced matrix JSON bytes are compared with the committed `coordination/coverage/R77-detection-envelope-matrix.json` bytes; then they are byte-identical. |
| **AC-R77-7: high-magnitude saturation cell (family A)** | Given the parsed matrix; when reading the cell at `(drift_magnitude=0.30, window_count=100, alpha=0.01, family='family-a')`; then `cell.summary.detection_rate ≥ 0.6` (i.e., `detection_count ≥ 3`). HALT per § 6.7 if not. |
| **AC-R77-8: R72-comparison cell (family A, longer window)** | Given the parsed matrix; when reading the cell at `(drift_magnitude=0.20, window_count=200, alpha=0.005, family='family-a')`; then `cell.summary.detection_rate ≥ 0.6`. HALT per § 6.7 if not. |
| **AC-R77-9: low-magnitude floor characterization (family A; over-sensitivity guard)** | Given the parsed matrix; when reading the cell at `(drift_magnitude=0.050, window_count=30, alpha=0.005, family='family-a')`; then `cell.summary.detection_rate ≤ 0.6` (i.e., `detection_count ≤ 3`). This AC characterizes the envelope LOWER bound; if it fails, the detector is over-sensitive vs the round-start engine — surface as substantive-finding HALT per § 6.7. |
| **AC-R77-10: both families covered at mid-magnitude mid-window mid-α** | Given the parsed matrix; when filtering cells at `(drift_magnitude=0.20, window_count=100, alpha=0.005)`; then BOTH `family='family-a'` AND `family='family-c'` cells exist; each has a non-null numeric `detection_rate`; the test ALSO reports `family_a_rate - family_c_rate` to stdout for operator visibility (no assertion on the sign — Architect makes NO prediction on which family wins because it is the empirical comparison the round is producing). |
| **AC-R77-11: detection-curve ASCII rendered for ≥ 3 α slices at window=200** | Given chore-A HEAD; when reading `coordination/coverage/R77-detection-envelope.md`; then the text contains exactly 3 occurrences of the literal substring `'### α =`' (one per α in {0.001, 0.005, 0.01}, at window_count=200) AND contains the literal substring `'mag      |'` at least 3 times (one per ASCII curve block). |
| **AC-R77-12: detector-tuning-recommendation.md exists with required sections** | Given chore-A HEAD; when reading `scripts/detector-tuning-recommendation.md`; then it exists AND contains the literal Markdown section headings `'## Empirical envelope'`, `'## Tuning levers'`, `'## Theoretical Ville-bound floor'`, `'## Operational tuning margin'`, AND `'## How to use this document'` (all 5 as separate `## ` headings). |
| **AC-R77-13: R72-saturation-matrix.json byte-identity** | Given chore-A HEAD; when computing `sha256(coordination/coverage/R72-saturation-matrix.json @ HEAD)`; then it equals `sha256(coordination/coverage/R72-saturation-matrix.json @ round-start SHA 0d64d9a)`. |
| **AC-R77-14: anti-regression byte-identity of FROZEN engine + tools + scripts surfaces** | Given chore-A HEAD; when running `git diff 0d64d9a HEAD -- engine/ tools/coverage-saturation.ts tools/demo-scenario.ts tools/build-canned-demos.ts tools/curate-baseline-pipeline.ts tools/curate-baseline-pre-pass.ts tools/curate-baseline-fleet-correlated.ts scripts/tier-router.ts scripts/tier-router-validate.ts scripts/mu-model-select.ts scripts/build-role-context.ts scripts/measure-cache-effect.ts run-pipeline.sh`; then the output is EMPTY (no diff). |
| **AC-R77-15: typecheck exit code preserved** | Given chore-A HEAD; when running `npx tsc -p tsconfig.test.json`; then the exit code is `0` (matches round-start baseline). |
| **AC-R77-16: test-count baseline preserved + R77-additions accounted** | Given chore-A HEAD; when running `node --test test/*.test.js` and parsing TAP summary; then `pass = 541 + N_new_R77` AND `fail = 5` AND `suites = 3`. The Architect pre-predicts `N_new_R77 = 17`. If the Implementer's actual `N_new_R77 ≠ 17` and the divergence is > 2 in either direction, HALT per § 6.4. |
| **AC-R77-17: anti-scope diff ⊆ ALLOWED_SET** | Given chore-A HEAD; when running `git diff 0d64d9a HEAD --name-only`; then the output is a subset of the § 4.18 ALLOWED_SET below. |

### 4.18 ALLOWED_SET (paths permitted in `git diff round-start..HEAD --name-only`)

```
tools/detector-envelope.ts
tools/detection-curve.ts
scripts/detector-tuning-recommendation.md
coordination/coverage/R77-detection-envelope-matrix.json
coordination/coverage/R77-detection-envelope.md
package.json
README.md
test/q77-detector-envelope.test.ts
coordination/specs/Q-R77-SPEC.md
coordination/specs/Q-R77-SPEC-AUDIT.md
coordination/specs/Q-R77-EMPIRICAL.sh
coordination/NEXT-ROLE.md
coordination/MEMORIAL.md
coordination/reviews/REVIEWER-REPORT-R77.md
coordination/logs/ROUND-R77-ROUTING.md
coordination/diagnostics/DIAGNOSTIC-R77-*.md
```

`.gitignore`-aware audit (per R23 MINOR-2): all 16 ALLOWED_SET paths are git-trackable (NOT matched by `.gitignore`'s `*.js`, `node_modules/`, `runs/`, `dist/`, `coverage/`, `*.tsbuildinfo`, `.auto-memory/`, `.env*`, `coordination/.prompt-*.md` patterns). Verified via cross-check against `.gitignore` at session entry.

### 4.19 Acknowledged AC gaps

| Gap | Why acknowledged | Minimum mitigation |
|---|---|---|
| **No per-cell ACs on Family C low-magnitude behavior** | Family C interpretation (pure ONS bet, log-space wealth) has no Tessera prior empirical baseline; the round's deliverable IS to characterize it, not pre-commit to thresholds. | AC-R77-10 reports both families' detection rates at the comparison cell; Reviewer audits the matrix to ensure no obvious Family C pathology (e.g., 0% across all magnitudes — would indicate broken integration). |
| **No detection-window timing AC** | The matrix records `detection_window_median` and `_p95` per cell for operator visibility, but no AC binds a minimum/maximum on detection latency. Detection latency is a 4-axis function (mag × win × α × family); pre-committing to specific values per cell would replicate the R71 MAJOR-1/MAJOR-2 self-confirming-test failure mode. | The matrix records the values; Reviewer audits visually for sanity (e.g., higher magnitude ⇒ shorter detection latency, monotonically). |
| **No comparison of α=0.001 vs α=0.005 vs α=0.01 detection-rate gradient ACs** | The gradient is part of the deliverable's empirical characterization; an AC asserting "α=0.001 detection-rate ≤ α=0.005 detection-rate at same other params" would be over-specific (could fail on PRNG-edge cases at boundary cells) — not because the assertion is wrong but because 5 trials gives 20% granularity that can produce ties or noise. | Matrix reports per-α detection_rate; ASCII curves overlay all 3 α per family per § 4.7; operator can visually compare. |

---

## § 5. Anti-scope

**Hard NOs (any violation → HALT per § 6):**

1. NO modification of any file under `engine/`.
2. NO modification of any existing `tools/*.ts` file (frozen list: coverage-saturation.ts, demo-scenario.ts, build-canned-demos.ts, curate-baseline-pipeline.ts, curate-baseline-pre-pass.ts, curate-baseline-fleet-correlated.ts).
3. NO modification of any existing `scripts/*.ts` or `scripts/*.js` file (frozen list: tier-router.ts, tier-router-validate.ts, mu-model-select.ts, build-role-context.ts, measure-cache-effect.ts).
4. NO modification of `run-pipeline.sh` (Tessera-temporary-divergence on hold per directive).
5. NO modification of `tsconfig.json` / `tsconfig.test.json`.
6. NO new external dependencies (no `pnpm add`; preserve R68 anti-worm).
7. NO modification of any pre-R77 test file (q01..q76 frozen).
8. NO modification of `test/_substrate/*`.
9. NO modification of carry-forward AC fail set (R36-21, R36-30, R36-31, R65-2, R66-14 must REMAIN failing exactly as at round-start).
10. NO modification of prior-round `Q-R*-SPEC*.md` or `Q-R*-EMPIRICAL.sh`.
11. NO modification of `coordination/coverage/R72-saturation-matrix.{json,md}`.
12. NO `gh repo` operations against the Anchor repository (PR #39 awaiting operator review).
13. NO real-cluster work (Path B preserved).
14. NO DS-repo modifications.
15. NO modification of `engine/*` (restated — load-bearing).
16. NO synthetic `CompiledConfig` construction in `tools/detector-envelope.ts` (would require type imports from `engine/types/*` that drift across engine changes; R77 uses only the directly-imported primitives `freshBettingState`, `updateBettingState`, `freshFamilyCBettingEProcessState`, `onsUpdate`).

---

## § 6. Halt conditions (Implementer)

The Implementer HALTs (`STATUS: ESCALATE` in NEXT-ROLE.md; DIAGNOSTIC file under `coordination/diagnostics/DIAGNOSTIC-R77-<topic>.md`) on any of:

1. `Q-R77-EMPIRICAL.sh` exits non-zero at chore-A for any reason other than the pre-documented baseline AC-failures already present at round-start (5 carry-forward fails per § 1.6).
2. `npx tsc -p tsconfig.test.json` exits non-zero at chore-A.
3. Test baseline drift beyond the round-start state, OTHER than the R77-additions accounted for in AC-R77-16 (e.g., a previously-passing pre-R77 test starts failing; a previously-failing carry-forward AC starts passing — both indicate scope leak).
4. The actual `N_new_R77` (number of `test()` blocks added by R77) diverges from the Architect's prediction of 17 by > 2 in either direction. Implementer writes DIAGNOSTIC with the actual count + a brief explanation of which AC bodies were merged/split.
5. R61-class architectural-reality discovery: an engine surface the spec assumes (e.g., `onsUpdate` signature mismatch, `freshFamilyCBettingEProcessState` returning a different shape than § 1.3 records) does NOT match the spec's prediction.
6. Cross-project claim-then-walk + TACTICAL-AUTONOMY-without-re-verification disciplines load-bearing (cross-project canonical at R72/R74) — if the Implementer applies tactical autonomy to deviate from a spec prescription without re-verifying the deviation against the spec's empirical-premise commitments, that is an immediate halt-discipline violation regardless of the deviation's correctness.
7. **Detection rate falls below claimed minimum at AC-R77-7, AC-R77-8, or RISES above claimed maximum at AC-R77-9** in the actual matrix produced at chore-A → HALT + DIAGNOSTIC (substantive coverage gap; operator decides if claimed minimums are aspirational vs achievable per directive halt condition 7).
8. Architect spec uses round-evolution-fragile AC patterns — if the Implementer detects that an AC's literal text would silently pass even when the canonical structural element is absent (R44 MINOR-3 / R46 MINOR-1+2 lesson), HALT.
9. `coverage-saturation.ts` import path resolution fails (engine SHA `0d64d9a` exports the named primitives; if Implementer's `import { onsUpdate } from '../engine/detectors/family-c-betting-e-process.js';` fails to resolve, surface as R61-class).

---

## § 7. Cross-project rule dispositions (all 7 rules applied UPFRONT)

| Rule | Active gate at R77 | How enforced in spec |
|---|---|---|
| **Rule 1 — empirical-command-attestation** | YES (load-bearing) | AC-R77-15, AC-R77-16, AC-R77-17 bind binding-command outputs verbatim; § 1.6 records the round-start empirical baseline observed at session entry. |
| **Rule 2 — branch-binding-coverage** | YES | § 4 AC table binds every spec-prescribed structural element: matrix existence (AC-1, AC-2), schema version (AC-3), cell count (AC-4), field schema (AC-5), idempotency (AC-6), each named diagnostic cell (AC-7, AC-8, AC-9, AC-10), curve rendering (AC-11), recommendation document (AC-12), R72 byte-identity (AC-13), broad anti-regression (AC-14), typecheck (AC-15), test counts (AC-16), anti-scope diff (AC-17). § 4.19 enumerates acknowledged gaps with mitigation. |
| **Rule 3 — self-application gate** | YES | This spec's prescribed pseudocode (§ 3.1 `runFamilyATrial`, `runFamilyCTrial`, `aggregateCell`) was verified at spec-emit time against the engine signatures cited in § 1.3 (claim-then-walk). § 9 grilling explicitly walks the data-flow from spec-prescribed code → engine surfaces → AC literal text. |
| **Rule 4 — NO forward-protection / live-file-count / anti-scope-diff-against-prior-round patterns** (cross-project canonical at R72) | YES (active gate) | Spec uses round-start-to-HEAD diff anchored to the chore-A SHA boundary (`0d64d9a`), NOT diff-against-prior-round patterns. Anti-scope ACs (AC-R77-13, AC-R77-14, AC-R77-17) use direct path-set or git-diff inclusion against a frozen SHA, NOT count-based or forward-projection patterns. |
| **Rule 5 — N/A** | N/A per directive | — |
| **Rule 6 — load-bearing-premise-verification** | YES | § 1.6 baseline-test-status table records the empirically-observed baseline at session entry (NOT inherited from prior rounds per R25 MAJOR-1). § 1.3 engine signatures were verified by direct file read at session entry (NOT from memory per R02 / R03 / R65 MINOR-1 sub-class). |
| **Rule 7 — cross-project claim-then-walk + R74 TACTICAL-AUTONOMY-without-re-verification** | YES (active gate Surface (a)) | Spec halt condition § 6.6 explicitly names this discipline as load-bearing. Implementer applying tactical autonomy to deviate from spec § 3 pseudocode must re-verify the deviation against § 4 AC literal text; an unverified deviation is an immediate halt-discipline violation. § 1.3 Family C interpretation note is the Architect's own claim-then-walk record (engine source file:line cited verbatim from session-entry direct file read). |

---

## § 8. Open questions

**None — all resolved.** The Family C interpretation choice (§ 1.3 sub-§) is recorded explicitly as a load-bearing decision rather than left as an open question, because the directive's "Family C changepoint comparison" language is operationally ambiguous and the Architect must commit to one interpretation before routing to the Implementer (deferring to "open question" would block the Implementer per role boundary).

---

## § 9. Grilling output (Superpowers Phase 3 + cross-project rule application)

### 9.1 Every claim verifiable? — YES

- All AC literal text is bindable: AC-R77-1 through AC-R77-6 bind file existence / schema; AC-R77-7 through AC-R77-10 bind named-cell rates that the matrix produces; AC-R77-11 through AC-R77-12 bind file content via `grep`-style literal substring matches; AC-R77-13 through AC-R77-17 bind binding-command outputs (`git diff`, `npx tsc`, `node --test`).
- All engine-signature citations in § 1.3 were verified at session entry via direct file read (engine SHA `0d64d9a`).
- All ALLOWED_SET paths cross-checked against `.gitignore` per R23 MINOR-2 / R75 MINOR-1+2+3 / cross-project sub-class.

### 9.2 Unstated assumptions? — Documented inline

- Drift semantics deviates from R72 (start-at-window-0 vs start-at-drift_start) — recorded in § 1.4 with rationale.
- Family C interpretation as pure-ONS bounded-z (rather than full kernel-MMD) — recorded in § 1.3 sub-§ with rationale + spec-inline acknowledgement.
- Test-count prediction `N_new_R77 = 17` — recorded in § 1.6 with halt condition § 6.4 if actual diverges by > 2.

### 9.3 Scope added beyond request? — NO

The 6 directive-prescribed deliverables (§ Primary deliverable in directive) map one-to-one onto § 2 component inventory + § 4 AC table. No additional deliverables added.

### 9.4 Implementer can act without guessing? — YES

§ 3 per-file pseudocode is detailed enough that the Implementer makes zero design decisions on:
- Parameter grid literals (§ 3.1 MAGNITUDES / WINDOW_COUNTS / ALPHAS hard-coded; SCENARIO_SEED_PREFIX hard-coded)
- Engine import paths (§ 1.3 cites exact source file:line; § 3.1 imports use `.js` extension per R72 convention)
- Per-trial logic (§ 1.4 pseudocode is line-for-line translatable to TS)
- Aggregation logic (§ 1.5 pseudocode is line-for-line translatable)
- Markdown layout (§ 3.1 renderMatrixMd shows the exact heading hierarchy and table format)
- ASCII curve format (§ 3.2 renderAsciiCurve shows the exact char-block format)
- Test-bindings (§ 3.4 specifies each AC has a verbatim AC-R77-N substring in the test() name)

Open Implementer-choice items (deliberately deferred to tactical-implementation autonomy per CLAUDE-COMMON.md "Spec depth"):
- Exact TS variable names within function bodies (e.g., `magnitude` vs `mag`)
- Exact assertion library usage (`assert.strictEqual` vs `assert.equal`)
- Exact comment text inside function bodies (header comments are spec-prescribed; in-body comments are tactical)
- Exact content of `scripts/detector-tuning-recommendation.md` Implementer-fill-in sections (§ 3.3 specifies the SECTION HEADINGS as binding; the prose inside each section is Implementer-authored because it cites the empirical matrix that does not exist at spec-emit time per R71 MAJOR-1+2 lesson)

### 9.5 R74 MINOR-1 alternation enumeration (multi-pattern claim discriminability)

The spec contains no multi-alternation regex claims in the form "Class X: no (no `/p1/` etc.)". The empirical-script regex patterns in § 11 EMPIRICAL.sh are single-pattern grep literals (e.g., `'tessera-detection-envelope-v1'`); no alternation present. PASS.

### 9.6 R75 MINOR-1 stdio-flush walk (large-output process.stdout.write semantics)

`tools/detector-envelope.ts` CLI guard at the bottom of § 3.1 writes a ~3-line summary to `process.stdout`, NOT the matrix bytes (which are written via `fs.writeFileSync`). The matrix MD is also written via `fs.writeFileSync`. No `process.stdout.write` of >64 KB content. PASS.

`tools/detection-curve.ts` CLI writes the ASCII curve string (`renderAsciiCurve` output ≈ < 1 KB per call). PASS.

### 9.7 R75 MINOR-2 cross-module import walk (cyclic main() execution)

`tools/detector-envelope.ts` imports `renderAsciiCurve` from `./detection-curve.js`. `tools/detection-curve.ts` has its own `main()` guarded by `if (require.main === module) { main(); }` per CommonJS convention. When `detector-envelope.ts` imports from `detection-curve.js`, the imported module is loaded (its top-level statements execute) but its `main()` runs only if `require.main === module` (which is FALSE on import). PASS.

### 9.8 R75 MINOR-3 bash context walk (bash keyword validity)

`Q-R77-EMPIRICAL.sh` § 11 below uses only top-level `bash` script — NO function bodies. All variable assignments use plain `VAR=value` (no `local`). PASS.

### 9.9 R71 MAJOR-1/MAJOR-2 narrative-vs-data walk (pre-authored empirical claims)

The spec contains the following pre-authored empirical claims that must be verified or revised:

- **§ 1.6 baseline test counts** (`tests=549 / pass=541 / fail=5 / suites=3`) — VERIFIED via direct `node --test test/*.test.js` run at Architect session entry; output captured to `/tmp/r77-baseline.txt` at SHA `0d64d9a`. PASS.
- **§ 1.6 `npx tsc -p tsconfig.test.json` exits 0** — VERIFIED via direct run at session entry. PASS.
- **§ 1.6 5 carry-forward failing ACs (R36-21, R36-30, R36-31, R65-2, R66-14)** — VERIFIED via direct extraction of `✖` lines from baseline output. PASS.
- **§ 1.3 engine signatures** (freshBettingState, updateBettingState, onsUpdate, freshFamilyCBettingEProcessState) — VERIFIED via direct file read at session entry. PASS.
- **No pre-authored detection-rate values in matrix-md prose** — the spec § 3.3 detector-tuning-recommendation.md explicitly defers prose content with "[Implementer fills in by reading the matrix; cites specific detection_rate values from the matrix]" to AVOID pre-authoring empirical claims (R71 MAJOR-1+2 lesson directly applied). PASS.
- **§ 4 ACs do NOT pre-author observed outcomes; they assert minimums/maximums** — AC-R77-7 says `≥ 0.6` (not `= 0.6`); AC-R77-9 says `≤ 0.6` (not `= 0.6`); AC-R77-10 makes NO sign-claim on the family comparison. PASS.

### 9.10 R74 MINOR-2 spec-acknowledged-gap mitigation walk

The 3 entries in § 4.19 acknowledged-AC-gaps each pair with a minimum-mitigation specification (Reviewer manual audit; or matrix-visual review). No bare "Reviewer-reliance" without specification. PASS.

### 9.11 R74 MINOR-5 spec-pseudocode-vs-AC-regex consistency walk

The spec does NOT prescribe regex assertions in `test/q77-detector-envelope.test.ts` body pseudocode. AC-R77-11 specifies literal substring counts (`'### α ='` occurs 3 times) — verifiable by `text.split('### α =').length === 4` (or equivalent). The spec leaves the exact assertion mechanism to the Implementer; only the literal-substring CONTENT is spec-prescribed. PASS.

### 9.12 R71 MINOR-1 discriminating-assertion gate

Each named-cell AC (AC-R77-7, AC-R77-8, AC-R77-9) names a specific cell `(magnitude, window, α, family)` and a discriminating threshold (≥0.6 or ≤0.6). The 5-trial Monte Carlo gives 20% granularity (0/5=0%, 1/5=20%, ..., 5/5=100%); the 60% threshold is the median value, giving discriminating power on both directions of regression. A future engine improvement that pushes the cell from 60% to 80% PASSES AC-7/AC-8 (correct); a future engine regression that pushes the cell from 60% to 40% FAILS AC-7/AC-8 (correct). For AC-9 (lower-bound characterization), engine over-sensitivity (cell rate rises from 0% to 80%) FAILS AC-9 (correct). PASS.

### 9.13 R34 MINOR-2 algorithmic-boundary cross-section walk

Spec uses `w (w + 1)` consistently in drift formula (§ 1.4 pseudocode and § 3.1 source). NO boundary-clause inconsistency across spec sections. The detection check uses `state.M >= threshold` (not `>`) and `state.log_S_t >= log_threshold` (not `>`) — matches engine's `state.M >= threshold` convention (engine/detectors/betting-e-process.ts:243). PASS.

### 9.14 Architect pre-prediction registry

| Prediction | Empirical observable (at chore-A HEAD) | HALT trigger |
|---|---|---|
| `N_new_R77 = 17` `test()` blocks added | `node --test test/*.test.js` TAP `tests` count − 549 | § 6.4 if `|actual - 17| > 2` |
| AC-R77-7 cell (mag=0.30, win=100, α=0.01, family=A): detection_rate ≥ 0.6 (predicted ~0.8-1.0) | Matrix JSON cell value | § 6.7 if observed < 0.6 |
| AC-R77-8 cell (mag=0.20, win=200, α=0.005, family=A): detection_rate ≥ 0.6 (predicted ~0.8) | Matrix JSON cell value | § 6.7 if observed < 0.6 |
| AC-R77-9 cell (mag=0.05, win=30, α=0.005, family=A): detection_rate ≤ 0.6 (predicted ~0.0) | Matrix JSON cell value | § 6.7 if observed > 0.6 |
| AC-R77-10 cell pair (mag=0.20, win=100, α=0.005, family=A vs C): Architect makes NO sign-prediction | Matrix JSON cell values | None — characterization-only AC |
| `npx tsc -p tsconfig.test.json` exits 0 | Bash exit code | § 6.2 if exits non-zero |

---

## § 10. P3 ten-axis verification

Detailed P3 verification is in `Q-R77-SPEC-AUDIT.md` § P3. One-sentence per-axis summary here:

- **Correctness:** Pseudocode in § 1.4 + § 3.1 matches engine entry points cited in § 1.3 (verified by direct file read at session entry).
- **Completeness:** Every directive-prescribed deliverable maps to a component-inventory row (§ 2) and an AC (§ 4); 17 ACs total cover structural, empirical, anti-regression, and binding-command surfaces.
- **Consistency:** Drift formula `magnitude * (w + 1)` used uniformly across § 1.4 pseudocode and § 3.1 source; family literal `'family-a'` / `'family-c'` used consistently across pseudocode, AC text, and JSON schema.
- **Clarity:** Each spec section is named; § 1.3 engine-signature table makes the cite-then-walk record auditable; § 4.19 acknowledges gaps explicitly.
- **Coverage:** § 4 ACs bind every § 3 pseudocode prescription; § 7 cross-project rule dispositions document each of the 7 rules; § 9 grilling output sweeps each REINFORCED 2026-05-20 entry.
- **Constraints:** Anti-scope § 5 enumerates 16 hard NOs; halt-condition § 6 enumerates 9 trigger conditions; both reference specific source-of-authority lines.
- **Concurrency:** No concurrency in the runner (single-threaded; deterministic); no shared mutable state across trials (each trial seeds fresh state via `freshBettingState()` / `freshFamilyCBettingEProcessState(1)`).
- **Corner cases:** § 1.5 aggregation handles `detected_trials.length === 0` (returns null for median/p95); § 3.1 `aggregateCell` matches; AC-R77-5 binds field schema against an example cell to catch shape drift.
- **Cost:** 504 cells × 5 trials × 200 windows × O(1) per-tick = 504000 update calls in worst-case cells (most cells use fewer windows); total runtime estimate < 10 seconds on commodity hardware (validated by analogy with R72 coverage-saturation at 120 variations × 30 windows ≈ 36000 update calls, sub-second).
- **Coupling:** Zero new external dependencies; only engine imports are 4 named primitives via `.js` extension; no cyclic imports (`detector-envelope.ts` ⇨ `detection-curve.ts` is one-way).

---

## § 11. `Q-R77-EMPIRICAL.sh` outline (full file is the sibling artifact)

```bash
#!/usr/bin/env bash
# Q-R77-EMPIRICAL.sh — binding-command harness for R77.
# Exit 0 = all blocks pass; exit non-zero = some block failed.

set -uo pipefail

ROUND_START_SHA="0d64d9a"
EXIT=0

# Block 1 — typecheck (AC-R77-15)
echo "── Block 1: typecheck"
npx tsc -p tsconfig.test.json
if [ "$?" -ne 0 ]; then echo "Block 1 FAIL"; EXIT=1; fi

# Block 2 — test pass/fail counts (AC-R77-16)
echo "── Block 2: test counts"
node --test test/*.test.js > /tmp/r77-test-output.txt 2>&1
TEST_PASS=$(grep -E "^# pass " /tmp/r77-test-output.txt | awk '{print $3}')
TEST_FAIL=$(grep -E "^# fail " /tmp/r77-test-output.txt | awk '{print $3}')
TEST_TESTS=$(grep -E "^# tests " /tmp/r77-test-output.txt | awk '{print $3}')
EXPECTED_PASS_MIN=556  # 541 + 15 (allows |N - 17| ≤ 2)
EXPECTED_PASS_MAX=560  # 541 + 19
if [ "$TEST_FAIL" != "5" ]; then echo "Block 2 FAIL: expected fail=5; got $TEST_FAIL"; EXIT=1; fi
if [ "$TEST_PASS" -lt "$EXPECTED_PASS_MIN" ] || [ "$TEST_PASS" -gt "$EXPECTED_PASS_MAX" ]; then
  echo "Block 2 FAIL: expected pass in [$EXPECTED_PASS_MIN, $EXPECTED_PASS_MAX]; got $TEST_PASS"
  EXIT=1
fi

# Block 3 — anti-scope diff ⊆ ALLOWED_SET (AC-R77-17)
echo "── Block 3: anti-scope diff"
DIFF_FILES=$(git diff "$ROUND_START_SHA" HEAD --name-only)
ALLOWED='^(tools/detector-envelope\.ts|tools/detection-curve\.ts|scripts/detector-tuning-recommendation\.md|coordination/coverage/R77-detection-envelope-matrix\.json|coordination/coverage/R77-detection-envelope\.md|package\.json|README\.md|test/q77-detector-envelope\.test\.ts|coordination/specs/Q-R77-SPEC\.md|coordination/specs/Q-R77-SPEC-AUDIT\.md|coordination/specs/Q-R77-EMPIRICAL\.sh|coordination/NEXT-ROLE\.md|coordination/MEMORIAL\.md|coordination/reviews/REVIEWER-REPORT-R77\.md|coordination/logs/ROUND-R77-ROUTING\.md|coordination/diagnostics/DIAGNOSTIC-R77-.*\.md)$'
UNAUTHORIZED=$(echo "$DIFF_FILES" | grep -vE "$ALLOWED" || true)
if [ -n "$UNAUTHORIZED" ]; then
  echo "Block 3 FAIL: unauthorized paths in diff:"
  echo "$UNAUTHORIZED"
  EXIT=1
fi

# Block 4 — frozen surfaces byte-identical (AC-R77-13, AC-R77-14)
echo "── Block 4: frozen surfaces"
FROZEN_DIFF=$(git diff "$ROUND_START_SHA" HEAD -- \
  engine/ \
  tools/coverage-saturation.ts tools/demo-scenario.ts tools/build-canned-demos.ts \
  tools/curate-baseline-pipeline.ts tools/curate-baseline-pre-pass.ts tools/curate-baseline-fleet-correlated.ts \
  scripts/tier-router.ts scripts/tier-router-validate.ts scripts/mu-model-select.ts \
  scripts/build-role-context.ts scripts/measure-cache-effect.ts \
  run-pipeline.sh \
  coordination/coverage/R72-saturation-matrix.json coordination/coverage/R72-saturation-matrix.md)
if [ -n "$FROZEN_DIFF" ]; then
  echo "Block 4 FAIL: frozen surfaces modified"
  echo "$FROZEN_DIFF" | head -20
  EXIT=1
fi

# Block 5 — required artifact files exist (AC-R77-1, AC-R77-2, AC-R77-12)
echo "── Block 5: artifact existence"
for F in \
  coordination/coverage/R77-detection-envelope-matrix.json \
  coordination/coverage/R77-detection-envelope.md \
  scripts/detector-tuning-recommendation.md \
  tools/detector-envelope.ts \
  tools/detection-curve.ts \
  test/q77-detector-envelope.test.ts; do
  if [ ! -f "$F" ]; then echo "Block 5 FAIL: missing $F"; EXIT=1; fi
done

# Block 6 — matrix idempotency (AC-R77-6)
echo "── Block 6: matrix idempotency"
EXISTING_BYTES=$(cat coordination/coverage/R77-detection-envelope-matrix.json | shasum -a 256 | awk '{print $1}')
node tools/detector-envelope.js > /dev/null 2>&1
REGEN_BYTES=$(cat coordination/coverage/R77-detection-envelope-matrix.json | shasum -a 256 | awk '{print $1}')
if [ "$EXISTING_BYTES" != "$REGEN_BYTES" ]; then
  echo "Block 6 FAIL: matrix not idempotent ($EXISTING_BYTES vs $REGEN_BYTES)"
  EXIT=1
fi

echo "── Q-R77-EMPIRICAL.sh done; exit $EXIT"
exit "$EXIT"
```

(The actual `Q-R77-EMPIRICAL.sh` file is the sibling artifact committed alongside this spec; the inline block above is the prescribed content.)

---

## § Pipeline invocation

```bash
cd /Users/johnwarren/concord/tessera
./run-pipeline.sh --round R77 --tier full
```
