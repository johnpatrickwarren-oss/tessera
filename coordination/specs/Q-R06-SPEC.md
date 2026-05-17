# Q-R06-SPEC — Tessera Phase 1 SLICE 4: baseline curation toolchain vendoring + Stage 2a per-shard within-window screening + Stage 3a calibration handoff

_From: Architect (R06 pipeline run; full tier per A1 + A2 + A7 — see audit sidecar § Brainstorm tier-rubric verdict)._
_To: Implementer._
_Date: 2026-05-16._
_HEAD at spec emit: `a75ebc4` (chore(R06) NEXT-ROLE.md preparation; R05 close-state code-tree at `8d724de`)._
_Audit sidecar: `coordination/specs/Q-R06-SPEC-AUDIT.md` (brainstorm full rationale, resolved-decision why-picked/why-rejected, pre-route discipline application, architect pre-predictions, Q-JC1 brainstorm-re-evaluation per R12 reinforcement, Q-R06 → Q-R07 sequencing context)._

---

## Spec preamble

R06 = Phase 1 SLICE 4 = three stages per operator-set scope (`coordination/NEXT-ROLE.md` + companion scoping memo + 9-Q-JC pre-disposition committed at SHA `aee274c`):

1. **Stage 1 — Toolchain vendoring.** Vendor inherited baseline curation tools from DeploySignal at SHA `5a72371` per Q-JC1 (α): `tools/curate-baseline-pipeline.ts` (audit-emission orchestrator) + `tools/calibrators/family-c.ts` (MCD/MRCD/Ledoit-Wolf estimator implementations) + the compilation-dependency leaf `tools/calibrators/_shared.ts` (PRNG / Cholesky / Box-Muller). Extends the R01 vendoring infrastructure (script sandbox + q01 vendoring tests) to cover `tools/` targets in addition to `engine/` and `test/`.
2. **Stage 2a — Per-shard within-window contamination screening.** New Tessera-native entry point `tools/curate-baseline-pre-pass.ts` that walks a `BaselineBundle` (already vendored in `engine/types/config.ts:394-411`), forms the per-run sample matrix, runs the vendored `fastMCD` + Mahalanobis-cutoff screening at the 0.975 χ²ₚ quantile, drops contaminated ticks from the curated bundle output, and emits a `BaselineCurationDecision` audit record at decision-id `D11` (new union member).
3. **Stage 3a — Calibration handoff.** The curated bundle output is structurally a `BaselineBundle` (interface preserved verbatim — same `version` / `generated_at` / `seed` / `cell_dim` / `runs` shape); future-round wiring will feed it into `tools/calibrate.ts` (vendoring of `calibrate.ts` itself DEFERRED to a later round per Q-JC1 brainstorm-re-evaluation — see audit sidecar). R06 verifies the format compatibility via a structural-typing test on the curated bundle output.

R06 explicit anti-scope (deferred to R07+ per operator-set scope + Q-JC dispositions): Stage 2b FCP-1 fleet-correlated-pattern primitive (R07 = SLICE 5 per Q-JC4); Stage 3b warm-start eligibility tagging (R07 = SLICE 5 per Q-JC5); `tools/calibrate.ts` vendoring (deferred per Q-JC1 brainstorm-re-evaluation — see audit sidecar Brainstorm re-evaluation block + OQ-1); Spectral Residual / Robust PCA / BOCPD additions (R08+ conditional per Q-JC6); per-shard MCD-window time-windowing within a run (deferred — R06 ships single-window-per-run as documented at D-R06-1 below); any modification to inherited vendored engine internals (A12 carry-forward); any modification to `engine/per-shard/{warm-start,welford,runtime}.ts` (R03/R04/R05-shipped — runtime substrate untouched at R06); any modification to inherited `BaselineCurationDecision` D1–D10 records (additive extension only per A-C2 from the curation memo).

The architectural-layer split is the same successful pattern R02 → R03 → R04 → R05 used: compile-time schema (R02) → state-machine runtime (R03) → algorithm-as-pure-function (R04) → composition + accumulator-strategy (R05) → **inherited-tools vendoring + Tessera-native pre-pass orchestrator (R06)** → fleet-correlated FCP-1 + warm-start eligibility tagging (R07) → wiring to `calibrate.ts` main() + compiled-artifact loader (R08+). Each sub-slice is tight, mechanical / wiring-only, TDD-verifiable, and right-sized for a single Implementer session.

Traces to PRD AC-P1 ("per-shard any-time Ville bound is preserved AND fleet-level expected falsely-flagged-shard count ≤ q·K (e-BH)") and AC-P2 ("warm-start cell_confidence enables alerts within 20 per-shard samples; strict-upgrade at 60 samples preserves inherited single-instance behavior") at the BASELINE-CURATION layer: if Stage 2a does not drop contaminated baseline ticks, the per-shard warm-start residual (R03/R04/R05) is computed against a contaminated baseline, breaking the "inherited single-instance behavior" property at the substrate. Stage 2a is order-load-bearing for the Phase 1 close per SCOPING-MEMO-BASELINE-CURATION-v0.2 § 1 executive summary ("curation should be available before warm-start runtime gets exercised against production-shape fleet data"). Traces to SCOPING-MEMO-v0.3 § 3 Phase 1 row 4 (baseline curation pipeline) and § 9 vendoring policy (vendor at-pin; per-file SHA pin headers; manifest extension at close).

---

## Mechanism

### Architectural primitives

1. **Inherited tools vendoring at-pin via the R01 vendoring infrastructure, extended to `tools/` targets.** R01-shipped `tools/vendor-from-deploysignal.sh:69-72` restricts target paths to `engine/` or `test/` only. R06 extends the sandbox to also accept `tools/` targets. Three files vendored at-pin: `tools/curate-baseline-pipeline.ts` (261 lines; only imports from `engine/types/config.js` which is already vendored) + `tools/calibrators/family-c.ts` (1371 lines; imports from `engine/types`, `engine/detectors/sequential-mmd.ts`, `engine/detectors/family-c-rff.ts` — all already vendored — plus `./_shared.js` which is co-vendored at R06) + `tools/calibrators/_shared.ts` (compilation-dependency leaf; ~225 lines of numerical primitives — `mulberry32`, `gaussian`, `choleskyLocal`). No deltas applied to any of the three vendored files at R06; all are `vendored-at-pin` per the manifest convention.

2. **Q-JC1 narrowing: `tools/calibrate.ts` NOT vendored at R06; brainstorm-re-evaluation block per R12 reinforcement.** John's Q-JC1 (α) disposition was "Vendor at-pin verbatim" for THREE named files including `tools/calibrate.ts`. After file-opened-discipline verification at the actual dependency closure, the R06 architect determined `tools/calibrate.ts` (2937 lines) has a transitive dep closure of ~10+ additional unvendored files (`profile-loader.ts`, `bundle-loader.ts`, `calibrators/{family-a, family-e, effective-config, bake-profiles}`, `engine/resamplers/{ar1, cholesky}`) PLUS a new npm dependency on `js-yaml` (not currently in `package.json`). Vendoring `calibrate.ts` at R06 would mean ~15+ additional vendored files + 1 new npm dep + extensive test substrate — an R01-class scope. **R06 narrows Q-JC1 to vendor the two compilation-tractable files; defers `calibrate.ts` vendoring to a future round when actual wiring into `calibrate.ts` main() lands (R08+ — when Stage 3a transitions from "format compatibility" to "wired handoff").** The deviation is documented per the R12 reinforcement (brainstorm-re-evaluation when re-selecting an approach that voids the original brainstorm's veto on weaknesses) in audit sidecar § Brainstorm re-evaluation; surfaced as Open Question OQ-1 for John's review at next operator gate. Q-JC1 INTENT (vendor at-pin; no inlining of behavior changes into vendored files; no Tessera-native rewrite) is preserved.

3. **Stage 2a Tessera-native pre-pass at `tools/curate-baseline-pre-pass.ts`.** New file. Exports a pure function `curateBaselinePrePass(bundle: BaselineBundle, opts?: PrePassOpts): PrePassResult`. Behavior per run in `bundle.runs`:
   - **Sample-matrix construction** (D-R06-3): collect signal names by sorting `Object.keys(run.signal_series)` alphabetically (deterministic column ordering); compute `nTicks = min(signal_series[sig].length for each sig)` (in case of length mismatch across signals in a run, restrict to the common prefix); form `rows: number[][]` of shape `nTicks × p` where `p = sortedSignals.length`. **Skip-and-emit if `nTicks < p + 1`** (insufficient samples for MCD; D-R06-7): pass the run through unchanged, increment `n_runs_skipped_insufficient_samples` in the D11 audit summary, log the skip reason as "n < p+1."
   - **MCD application** (D-R06-4): call `fastMCD(rows, FASTMCD_DEFAULT_ALPHA, FASTMCD_DEFAULT_SEED)` from vendored `tools/calibrators/family-c.ts`. If `fastMCD` returns `null` (no positive-definite subset found; non-tractable matrix), pass the run through unchanged and increment `n_runs_skipped_mcd_failed` (D-R06-7). Otherwise: extract `mean` + `cov` from the result.
   - **Per-tick contamination screening** (D-R06-5): compute `L = choleskyLocal(cov)`; for each `i ∈ [0, nTicks)`, compute `d2 = mahalanobisSqFromL(rows[i], mean, L)`; mark tick `i` contaminated when `d2 > chiSqQuantile975(p)`. The cutoff is the 0.975 quantile of χ²ₚ (standard-MCD reweighting threshold per `mcdReweight` precedent at vendored family-c.ts:601).
   - **Bundle curation** (D-R06-5 cont.): build a new `runs[k]` for this run with `signal_series[sig] = rows-keep[*][colIdx]` (i.e., for each signal column, keep only the values at non-contaminated tick indices); preserve `tenant_id`, `hour_of_day[]`, `day_of_week[]` by indexing them at the same non-contaminated indices (when present); all other run-level fields preserved verbatim.
   - **D11 audit emission** (D-R06-6): accumulate per-run counts into the D11 `output_summary` fields: `n_runs_total`, `n_runs_screened`, `n_runs_skipped_insufficient_samples`, `n_runs_skipped_mcd_failed`, `n_ticks_total`, `n_ticks_contaminated`, `contamination_rate` (= `n_ticks_contaminated / n_ticks_total`; 0 when `n_ticks_total === 0`), `mcd_method: 'mcd'`, `mcd_alpha: 0.75`.

4. **D-R06-1: Window granularity = run-level (one window per run).** The memo's "per-(shard, time-window) contamination mask" is interpreted at R06 as one window per shard (one window per `BaselineBundle.run`). Multi-window-per-run time-windowing is deferred to R07+ when the explicit `shard_id` + `time_window_index` fields land on the curated-bundle output. The R06 D11 audit summary fields are flat per-run aggregates; D-R06-9 reserves `D12` and `D13` decision-IDs (R07/R08+) for the future per-(shard, time-window) and per-shard-mask emissions.

5. **D-R06-2: Shard identifier = `run.tenant_id` when present; falls back to the run index when absent.** `BaselineBundle.runs[].tenant_id` is optional (vendored interface at config.ts:402-403). Per-run audit lines in D11's output_summary use the per-run identifier resolved by this rule; the curated bundle preserves `tenant_id` verbatim (does not inject a fabricated identifier when absent). R07's explicit `shard_id` field on the curated bundle is a separate compile-time schema delta (not in R06 scope).

6. **D-R06-8: Stage 3a calibration handoff = structural format compatibility with `BaselineBundle`.** R06 does NOT wire `curateBaselinePrePass` into `tools/calibrate.ts` (per Q-JC1 narrowing in primitive 2). Instead, R06 verifies the curated-bundle output is assignable to `BaselineBundle` at compile time (the return type IS `BaselineBundle`, satisfied by structural typing); the test file binds the structural shape via `assert.deepEqual` on `Object.keys(result.curatedBundle).sort()` matching the BaselineBundle field set. R08+ replaces this verification with wired-handoff once `calibrate.ts` is vendored.

7. **D-R06-9: BaselineCurationDecisionId extension = additive enum extension to `engine/types/config.ts`.** The inherited union `BaselineCurationDecisionId = 'D1' | ... | 'D10'` (vendored line 210-213) gains three new members: `'D11' | 'D12' | 'D13'`. D11 = "Per-shard within-window contamination screening" (R06-shipped). D12 = "Fleet-correlated contamination detection" (R07 reserved per Q-JC4 / Stage 2b). D13 = "Warm-start eligibility tagging" (R07 reserved per Q-JC5 / Stage 3b). The schema delta is an additive union extension; D1–D10 records continue to populate per the inherited convention. `engine/types/config.ts` is a `vendored-with-deltas` file (per the R01 manifest convention); this delta is the first post-R02 Tessera-side compile-time extension of the inherited audit-pipeline schema.

8. **Vendoring infrastructure extension (D-R06-10): `tools/vendor-from-deploysignal.sh` sandbox + `q01-vendoring-coverage.test.ts` + `q01-no-at-pin-deltas.test.ts` coverage extension.** The R01-shipped `vendor-from-deploysignal.sh:69-72` enforces `engine/` or `test/` target prefix only; R06 extends the sandbox to `engine/` or `test/` or `tools/`. Both q01 tests (vendoring-coverage + no-at-pin-deltas) carry hard-coded path lists that enumerate only `engine/` files; R06 extends both lists with the 3 new vendored `tools/` files. No q01 test-logic changes are required; the change is purely list-extension.

### Cross-section consistency pass

(R01-derived reinforcement — 6th consecutive application; well-established standing discipline.)

Resolved-decision checks executed before grilling sign-off; each row asserts a single resolved decision and verifies it against the spec pseudocode + tests in this document.

| # | Resolved decision | Canonical surface in this spec | Alternate / rejected form | Verified absent from rejected form |
|---|---|---|---|---|
| 1 | Vendor only 3 inherited tools files (curate-baseline-pipeline + family-c + _shared); defer calibrate.ts | § Component inventory rows for `tools/curate-baseline-pipeline.ts`, `tools/calibrators/family-c.ts`, `tools/calibrators/_shared.ts`; absence of `tools/calibrate.ts` in Component inventory | Vendor calibrate.ts at-pin per literal Q-JC1 | No `tools/calibrate.ts` row in Component inventory; no `tools/calibrate.ts` entry in spec pseudocode for vendoring shell commands |
| 2 | New Tessera-native file path = `tools/curate-baseline-pre-pass.ts` | § Component inventory + § Per-file pseudocode Delta 5 | `tools/curate-pre-pass.ts`; `engine/curate/pre-pass.ts`; `tools/baseline-curation.ts` | All consumer references in pseudocode use `tools/curate-baseline-pre-pass.ts` |
| 3 | Exported function name = `curateBaselinePrePass` | § Per-file pseudocode Delta 5 + Delta 7 | `runBaselineCurationPrePass`; `prePassBundle`; `screenBundle` | No alternative name appears in pseudocode |
| 4 | Exported function signature = `(bundle: BaselineBundle, opts?: PrePassOpts) => PrePassResult` | § Per-file pseudocode Delta 5 + Delta 7 | Takes raw `runs[]` array; takes file paths; takes generic `Record<string, unknown>` | All pseudocode signatures use `BaselineBundle` parameter; return type IS `PrePassResult` |
| 5 | BaselineCurationDecisionId extension = additive D11 + D12 + D13 | § Per-file pseudocode Delta 1 (config.ts) | Reuse D5/D6/D7 (would overwrite inherited NotImplementedError stubs); add only D11 (would force re-edit at R07 for D12/D13) | Delta 1 explicitly adds D11+D12+D13; reserves D12/D13 for R07; D5-D10 untouched |
| 6 | D11 contamination cutoff = `chiSqQuantile975(p)` (0.975 χ²ₚ quantile) | § Per-file pseudocode Delta 5 + AC-3 fixture | 0.99 quantile; 0.95 quantile; operator-tunable cutoff | Pseudocode uses `chiSqQuantile975(p)` directly from vendored family-c.ts; AC-3 verifies the exact cutoff |
| 7 | MCD α = `FASTMCD_DEFAULT_ALPHA` (0.75) + seed = `FASTMCD_DEFAULT_SEED` | § Per-file pseudocode Delta 5 | Operator-tunable α; non-deterministic seed | Pseudocode uses the two named constants imported from vendored family-c.ts |
| 8 | Window granularity = one window per run | § Mechanism primitive 4; § Per-file pseudocode Delta 5 | Multi-window-per-run (would require time-windowing semantics not in R06 scope) | Pseudocode iterates `for (const run of bundle.runs)` once per run; no inner time-window loop |
| 9 | Curated bundle = drop contaminated ticks from signal_series + hour_of_day[] + day_of_week[] | § Per-file pseudocode Delta 5 | Zero-out contaminated ticks; mark them via parallel mask array | Pseudocode filters arrays at non-contaminated indices; no zero-out; no parallel mask field added to BaselineBundle |
| 10 | Vendoring sandbox extension = allow `tools/` prefix | § Per-file pseudocode Delta 2 | Manual vendor (bypass script); vendor to `engine/tools/` (would litter engine layout) | Pseudocode patches the script's case statement to allow `tools/*` |
| 11 | q01 test list extension = add the 3 new vendored tools/ files to existing arrays | § Per-file pseudocode Delta 3 + Delta 4 | Replace the engine/-only lists with directory-walking; rewrite the test logic | Pseudocode appends 3 path entries to each existing list; no logic change |
| 12 | TDD ordering: RED commit adds q06 test file; GREEN commit adds production code + vendored files + schema delta + q01 list extensions + manifest extension | § Per-file pseudocode Implementer note 4; AC-17 | Single-commit landing | AC-17 specifies two-commit ordering verifiable in git log |
| 13 | File-creation track-state for new paths | § Component inventory directory-creation note | Assumed pre-existing without verification | `git ls-files tools/curate-baseline-pre-pass.ts tools/curate-baseline-pipeline.ts tools/calibrators tools/calibrators/family-c.ts tools/calibrators/_shared.ts test/q06*` verified at HEAD `a75ebc4` — only `tools/vendor-from-deploysignal.sh` exists in tools/; `tools/calibrators/` directory does not exist |
| 14 | Manifest extension = 3 new rows + no edits to existing rows | § Per-file pseudocode Delta 6 | Re-format existing rows; reorder | Delta 6 prescribes append-only; existing 38 rows untouched |
| 15 | Q-JC dispositions tracked for binding: Q-JC1 narrowed (see primitive 2 + audit sidecar); Q-JC2 = pre-pass only (R06-SAS-3); Q-JC3 = per-shard ordering preserved (R06 ships Stage 2a only — ordering binding becomes load-bearing at R07 when Stage 2b lands); Q-JC4/4a/4b/4c = R07 bindings (R06-SAS-4); Q-JC5 = R07 binding (R06-SAS-5); Q-JC6 = no SR/RPCA/BOCPD (R06-SAS-6) | § Anti-scope rows R06-SAS-3 through R06-SAS-6 + § Open questions OQ-1 | Silent absorption of any Q-JC binding into R06; silent deferral with no Q-JC mapping | All 9 Q-JC dispositions explicitly mapped above |
| 16 | Anti-scope-vs-compilation-dependencies tension resolved by explicit Architect disposition (R01 MAJOR-3 reinforcement) | § Mechanism primitive 1 + § Anti-scope R06-SAS-1; spec preamble | Silently vendor additional compilation deps for tools/calibrate.ts | `_shared.ts` is the ONLY new compilation dep — explicitly named + dispositioned in primitive 1; `calibrate.ts` deps fenced via R06-SAS-1 |

All 16 checks PASS at spec-emit time.

---

## Component inventory

| Surface | State | Description |
|---|---|---|
| `tools/vendor-from-deploysignal.sh` | CHANGED | Delta 2: extend target-path sandbox at lines 69-72 to accept `tools/*` in addition to `engine/*` and `test/*`. Single-case-clause edit; no other changes. |
| `test/q01-vendoring-coverage.test.ts` | CHANGED | Delta 3: append 3 entries to `VENDORED_AT_PIN_PATHS` array (the 3 new vendored tools/ files); extend manifest-assertion loop to handle tools/ prefix (the existing assertion is path-agnostic; no logic change needed beyond array extension). |
| `test/q01-no-at-pin-deltas.test.ts` | CHANGED | Delta 4: append 3 entries to `AT_PIN_FILES` array (3 tessera→source mappings for the new vendored tools/ files); no logic change. |
| `engine/types/config.ts` | CHANGED | Delta 1: extend `BaselineCurationDecisionId` union to include `'D11' \| 'D12' \| 'D13'`. Update the JSDoc comment block (lines 207-213) to enumerate D11/D12/D13 with their R06/R07 scope tags. No other changes to config.ts. |
| `tools/curate-baseline-pipeline.ts` | CREATED (VENDORED-AT-PIN) | Delta 7a: vendor from `deploysignal/tools/curate-baseline-pipeline.ts` at SHA `5a72371` via the extended script. Only `engine/types/config` imports (already vendored). |
| `tools/calibrators/_shared.ts` | CREATED (VENDORED-AT-PIN) | Delta 7b: vendor from `deploysignal/tools/calibrators/_shared.ts` at SHA `5a72371`. Compilation-dependency leaf; numerical primitives. |
| `tools/calibrators/family-c.ts` | CREATED (VENDORED-AT-PIN) | Delta 7c: vendor from `deploysignal/tools/calibrators/family-c.ts` at SHA `5a72371`. Imports `_shared.ts` (co-vendored), `engine/types`, `engine/detectors/sequential-mmd`, `engine/detectors/family-c-rff` (all already vendored). |
| `tools/curate-baseline-pre-pass.ts` | CREATED (TESSERA-NATIVE) | Delta 5: new module exporting `interface PrePassOpts`, `interface PrePassResult`, `function curateBaselinePrePass(bundle, opts?)`. Composes vendored `fastMCD` + `mahalanobisSqFromL` + `choleskyLocal` + `chiSqQuantile975` + bundle iteration. Pure function (no mutation; new bundle object returned). |
| `coordination/VENDORING-MANIFEST.md` | CHANGED | Delta 6: append 3 new rows for the vendored tools/ files (vendored-at-pin policy). Existing 38 rows untouched. |
| `test/q06-baseline-pre-pass.test.ts` | CREATED | Delta 8: new test file binding AC-1 through AC-13 below. |

**Directory-creation track-state verification** (R02 OBS-2 reinforcement applied — verify directory existence before prescribing creation paths at HEAD `a75ebc4`):

- `tools/` — exists (R01-created; `git ls-files tools/` shows `tools/vendor-from-deploysignal.sh` only).
- `tools/calibrators/` — does NOT exist at HEAD `a75ebc4` (`git ls-files tools/calibrators/` → empty). The vendoring script's `mkdir -p "$(dirname "$target_abs")"` (line 73) creates it implicitly during the first `tools/calibrators/_shared.ts` vendor run.
- `test/q06-baseline-pre-pass.test.ts` — does NOT exist (`git ls-files test/q06*` → empty). RED commit creates this file.
- `tools/curate-baseline-pipeline.ts`, `tools/curate-baseline-pre-pass.ts`, `tools/calibrators/_shared.ts`, `tools/calibrators/family-c.ts` — do NOT exist (`git ls-files tools/curate-baseline-pre-pass.ts tools/curate-baseline-pipeline.ts tools/calibrators/family-c.ts tools/calibrators/_shared.ts` → only `tools/vendor-from-deploysignal.sh` returned). GREEN commit creates all four.

---

## Integration points

(R03-derived re-export-chain-check reinforcement applied — for each named type or function instantiated in pseudocode, verify both the DECLARATION site and the IMPORT chain via grep.)

1. **`tools/curate-baseline-pre-pass.ts` ↔ `engine/types/config.ts`.** Imports `BaselineBundle`, `BaselineCurationDecision`, `BaselineCurationDecisionId` from `../engine/types/config`. Declaration sites verified at HEAD `a75ebc4`: `BaselineBundle` at line 394 (`export interface`); `BaselineCurationDecision` at line 222 (`export interface`); `BaselineCurationDecisionId` at line 210 (`export type`, becomes the D1-D13 union after Delta 1).

2. **`tools/curate-baseline-pre-pass.ts` ↔ `tools/calibrators/family-c.ts`.** Imports `fastMCD`, `mahalanobisSqFromL`, `chiSqQuantile975`, `FASTMCD_DEFAULT_ALPHA`, `FASTMCD_DEFAULT_SEED` from `./calibrators/family-c` (5 named identifiers; `FastMCDResult` return type is inferred from `fastMCD`'s signature — not explicitly imported). Declaration sites verified at the vendored source (deploysignal SHA `5a72371`): `fastMCD` at line 538 (`export function`); `mahalanobisSqFromL` at line 386 (`export function`); `chiSqQuantile975` at line 356 (`export function`); `FASTMCD_DEFAULT_ALPHA` at line 449 (`export const`); `FASTMCD_DEFAULT_SEED` at line 450 (`export const`); `FastMCDResult` at line 457 (`export interface`; available but not imported by the Tessera-native pre-pass). All five imported identifiers are public at the vendored module's surface.

3. **`tools/curate-baseline-pre-pass.ts` ↔ `tools/calibrators/_shared.ts`.** Imports `choleskyLocal` from `./calibrators/_shared`. Declaration site verified at vendored source: `choleskyLocal` at line 31 (`export function`, returns `number[][] | null`). The R06 pseudocode handles the `null` return (non-PD cov → skip-and-emit per D-R06-7).

4. **`tools/curate-baseline-pipeline.ts` ↔ `engine/types/config.ts`.** Imports `BaselineBundle`, `BaselineCurationDecision`, `BaselineCurationDecisionId`, `CompiledConfig` from `../engine/types/config.js`. All four declarations vendored at HEAD `a75ebc4` (config.ts: BaselineBundle line 394, CompiledConfig — earlier in the file, BaselineCurationDecision line 222, BaselineCurationDecisionId line 210 — extended to include D11/D12/D13 post-Delta 1). The vendored file's `.js` ESM import suffix is preserved verbatim per `vendored-at-pin` policy.

5. **`tools/calibrators/family-c.ts` ↔ inherited engine surface.** Vendored file imports from `../../engine/types` (declaration: `engine/types/index.ts` already vendored); `./_shared.js` (vendored at R06); `../../engine/detectors/sequential-mmd.js` (already vendored — manifest row 17); `../../engine/detectors/family-c-rff.js` (already vendored — manifest row 13). All four import sources resolve at the post-R06 tree. No new engine-detector vendoring required.

6. **`tools/calibrators/_shared.ts` ↔ inherited engine surface.** Vendored file has ZERO engine imports (numerical primitives only; pure functions). Compilation-dependency leaf.

7. **`test/q06-baseline-pre-pass.test.ts` ↔ `tools/curate-baseline-pre-pass.ts`.** Imports `curateBaselinePrePass`, type `PrePassOpts`, type `PrePassResult` from `../tools/curate-baseline-pre-pass`. PLUS `node:test` + `node:assert/strict` (standard library). The test directly exercises the production function with fixed input bundles; no factory layer needed (the `BaselineBundle` interface is straightforward enough to construct inline; if a factory is helpful, `test/_substrate/factories.ts` can be extended additively, but R06-SAS-12 prefers in-test construction to keep the substrate stable).

---

## Per-file pseudocode

**Implementer notes (mandatory; verification commands embedded):**

1. **Vendoring script extension verification** (Delta 2): after applying the patch to `tools/vendor-from-deploysignal.sh`, verify with `grep -n 'tools/\*' tools/vendor-from-deploysignal.sh` → expect ≥1 match in the sandbox case statement (line ~70). Verify the script still works on an `engine/` target via dry-run: `cd /tmp && /Users/johnwarren/concord/tessera/tools/vendor-from-deploysignal.sh engine/types/policy.ts engine/types/policy.ts vendored-at-pin` → expect "Vendored:" output line (then `rm -rf /tmp/engine` to clean up — actual destination doesn't matter since the test is about the sandbox passing). Optional: skip the dry-run if a syntactic patch is obviously correct (the case clause is a simple list extension).

2. **Run vendoring three times in this order** (Delta 7a/b/c): from the tessera repo root,
   ```
   ./tools/vendor-from-deploysignal.sh tools/curate-baseline-pipeline.ts tools/curate-baseline-pipeline.ts vendored-at-pin
   ./tools/vendor-from-deploysignal.sh tools/calibrators/_shared.ts tools/calibrators/_shared.ts vendored-at-pin
   ./tools/vendor-from-deploysignal.sh tools/calibrators/family-c.ts tools/calibrators/family-c.ts vendored-at-pin
   ```
   After each command, the file appears at the target path with the 5-line provenance header; the manifest is auto-appended with a new row. Order matters mildly because `family-c.ts` imports `_shared.js` (must be vendored before family-c.ts for typecheck to succeed at any intermediate state); however since R06 lands these three in a single GREEN commit, intermediate-state ordering doesn't affect the committed result. Verify post-vendor with `wc -l tools/curate-baseline-pipeline.ts tools/calibrators/_shared.ts tools/calibrators/family-c.ts` → expect line counts matching deploysignal source + 6 header lines each (267 / ~231 / 1377 respectively; precise byte-identity verified by q01-no-at-pin-deltas test).

3. **Anti-scope hard-stop**: do NOT vendor `tools/calibrate.ts`, `tools/profile-loader.ts`, `tools/bundle-loader.ts`, `tools/calibrators/{family-a,family-e,effective-config,bake-profiles}.ts`, `engine/resamplers/*` — even if `npm run typecheck` against the new tools/calibrators/family-c.ts hints at unresolved imports. Each of those is a Q-JC1 deviation that REQUIRES architect disposition; encountering apparent need to vendor any of them is HALT condition (b) (architectural decision outside spec scope; write DIAGNOSTIC-R06-additional-tools-vendor.md + STATUS: ESCALATE). The compile-time verification AC-15 below is the load-bearing check: if typecheck fails after Delta 1 + Delta 2 + Delta 7a/b/c + Delta 5 + Delta 8, the failure must be diagnosed against the spec's declared dep closure (curate-baseline-pipeline → config.ts only; family-c → _shared + already-vendored engine surfaces; _shared → none; pre-pass → BaselineBundle + family-c + _shared) — not by silently vendoring additional files.

4. **TDD ordering**: two-commit sequence. RED commit adds `test/q06-baseline-pre-pass.test.ts` (file imports from `../tools/curate-baseline-pre-pass` which does NOT yet exist → tsc fails with TS2307). Run `npm run typecheck` at RED to verify the failure. GREEN commit lands: Delta 1 (config.ts) + Delta 2 (vendor script) + Delta 3 (q01-vendoring-coverage list extension) + Delta 4 (q01-no-at-pin-deltas list extension) + Delta 7a/b/c (vendor the three tools files via the extended script) + Delta 5 (pre-pass.ts created) + Delta 6 (manifest extension — but auto-appended by the vendor script during Delta 7a/b/c, so this delta is just verification that the script produced 3 new manifest rows). After GREEN, verify with `npm run typecheck` → exit 0; `node --test test/q06-baseline-pre-pass.test.js` → 13/0.

5. **Hand-trace verification before committing GREEN** — algorithm walk on a 3-tick × 2-signal degenerate (all-zeros) ILLUSTRATIVE bundle (NOT a test fixture; this trace shows the SKIP-MCD-FAILED branch behavior):
   - Bundle: `{ version: 'illust-degen-v1', generated_at: '…', seed: 0, runs: [{ tenant_id: 's0', signal_series: { a: [0, 0, 0], b: [0, 0, 0] } }] }`.
   - Run iteration: sortedSignals = ['a', 'b']; nTicks = min(3, 3) = 3; p = 2.
   - rows = [[0,0],[0,0],[0,0]] (3 ticks × 2 signals).
   - `n < p + 1` check: `3 < 2 + 1` = `3 < 3` = false → proceed (n = 3 IS the minimum p+1 for p=2).
   - `fastMCD([[0,0],[0,0],[0,0]], 0.75, FASTMCD_DEFAULT_SEED)` — degenerate (all-zero) cov → `choleskyLocal` returns null on every iteration → no candidates accumulate → `fastMCD` returns null per its "if (candidates.length === 0) return null" branch (vendored family-c.ts:570).
   - On `fastMCD === null`: pass-through, increment `n_runs_skipped_mcd_failed`, contribute 0 to n_ticks_total.
   - Final D11 output_summary: `{ n_runs_total: 1, n_runs_screened: 0, n_runs_skipped_insufficient_samples: 0, n_runs_skipped_mcd_failed: 1, n_ticks_total: 0, n_ticks_contaminated: 0, contamination_rate: 0, mcd_method: 'mcd', mcd_alpha: 0.75 }`. (n_ticks_total only counts ticks that were screened; not pass-through ticks.)
   - Curated bundle = input bundle unchanged (run passed through). This illustrative trace is NOT bound by an AC; it documents the skip-mcd-failed branch for Implementer cold-read clarity. The TEST fixture for AC-2 (CLEAN_BUNDLE — 8 distinct values per signal) follows the SCREENED branch instead.

6. **Hand-trace verification before committing GREEN** — Stage 2a screening on the OUTLIER_BUNDLE fixture (matches AC-4 test):
   - Bundle: `runs: [{ tenant_id: 's0', signal_series: { a: [0.5, -0.3, 0.1, -0.7, 0.2, 0.4, -0.5, 100], b: [-0.4, 0.6, -0.2, 0.5, -0.8, 0.3, 0.1, 100] } }]` — 8 ticks; index 7 is the outlier at (100, 100).
   - sortedSignals = ['a', 'b']; nTicks = 8; p = 2; `n < p+1` is `8 < 3` = false → proceed.
   - fastMCD with α=0.75 → h = max(p+1, ceil(0.75 × 8)) = max(3, 6) = 6 → keeps the 6 cleanest of the 8; outlier (100,100) reliably rejected from the h-subset (its determinant contribution dominates the trim cost); (mean, cov) computed from the 6-sample clean subset.
   - Mahalanobis cutoff = `chiSqQuantile975(2)` per `chiSqQuantile975` at vendored family-c.ts:356 (Wilson-Hilferty approximation; ≈7.378 for p=2).
   - Per-tick d² under (mean_6, cov_6): the outlier at (100, 100) has d² that scales as (100 − robust_mean)² / robust_cov_diagonal — orders of magnitude above 7.378, reliably flagged. The 7 clean ticks have d² values that depend on which 6 made it into the MCD subset; the 2 trimmed clean samples MAY or MAY NOT pass the reweight cutoff (seed-dependent — Implementer-observed at GREEN-state binding command).
   - Expected counter range: `n_ticks_contaminated ∈ {1, 2, 3}` — at minimum 1 (the outlier); at most 3 (outlier + 2 marginal MCD-trims that fail reweight). AC-4 binds the inequality bounds `>= 1 AND <= 3` and the behavioral check that the curated bundle does not contain the value 100 in either signal.
   - Curated bundle's run 0 has length `8 - n_ticks_contaminated` per signal array; hour_of_day not present in OUTLIER_BUNDLE so not filtered. AC-4 binds these behavioral invariants.

### Delta 1 — `engine/types/config.ts` (CHANGED — schema extension)

Locate the existing `BaselineCurationDecisionId` declaration at lines 207-213. Apply the additive extension:

```ts
/** Q61 SPEC-1 — 10-decision baseline curation pipeline canonical
 *  decision identifier. SLICE 1 ships D1-D4; SLICE 2 ships D5-D7;
 *  SLICE 3 ships D8-D10.
 *  Tessera SLICE 4 (R06) — additive extension D11; reserves D12 + D13 for SLICE 5 (R07).
 *    D11: per-shard within-window contamination screening (R06-shipped; tools/curate-baseline-pre-pass.ts).
 *    D12: fleet-correlated contamination detection (R07 reserved per Q-JC4; Stage 2b FCP-1).
 *    D13: warm-start eligibility tagging (R07 reserved per Q-JC5; Stage 3b). */
export type BaselineCurationDecisionId =
  | 'D1' | 'D2' | 'D3' | 'D4'
  | 'D5' | 'D6' | 'D7'
  | 'D8' | 'D9' | 'D10'
  | 'D11' | 'D12' | 'D13';  // ─── Tessera SLICE 4 Delta 1: per-shard contamination decisions
```

No other changes to `engine/types/config.ts`. The vendoring header at lines 1-5 remains (file is already `vendored-with-deltas`).

### Delta 2 — `tools/vendor-from-deploysignal.sh` (CHANGED — sandbox extension)

Locate the sandbox case statement at lines 69-72:

```bash
# Sandbox: target must be under engine/ or test/
case "$target_path" in
  engine/*|test/*) ;;
  *) echo "ERROR: Target must be under engine/ or test/: ${target_path}" >&2; exit 1 ;;
esac
```

Replace with the extended sandbox (allows `tools/` targets too):

```bash
# Sandbox: target must be under engine/ or test/ or tools/ (tools/ added at R06 for baseline curation toolchain vendoring)
case "$target_path" in
  engine/*|test/*|tools/*) ;;
  *) echo "ERROR: Target must be under engine/ or test/ or tools/: ${target_path}" >&2; exit 1 ;;
esac
```

Only the two case-pattern lines change; surrounding code unchanged.

### Delta 3 — `test/q01-vendoring-coverage.test.ts` (CHANGED — list extension)

Locate the `VENDORED_AT_PIN_PATHS` array. Append three entries at the end of the array (after the existing 36 entries; before the closing `];`):

```ts
const VENDORED_AT_PIN_PATHS: string[] = [
  // ... existing 36 entries unchanged ...
  // engine/types/config.ts vendored-with-deltas (existing entry; NOT in this addition)
  // Tessera SLICE 4 (R06) — baseline curation toolchain
  'tools/curate-baseline-pipeline.ts',
  'tools/calibrators/_shared.ts',
  'tools/calibrators/family-c.ts',
];
```

Implementer note: the existing manifest-assertion loop at the bottom uses `rows.filter(l => l.includes('engine/'))` to enumerate manifest rows for the SHA check (lines 83-86 of the current file). Extend that filter to also include `tools/` rows so the new vendored files are SHA-checked:

```ts
const rows = manifest.split('\n').filter(l => l.includes('engine/') || l.includes('tools/'));
```

No other changes to `test/q01-vendoring-coverage.test.ts`.

### Delta 4 — `test/q01-no-at-pin-deltas.test.ts` (CHANGED — list extension)

Locate the `AT_PIN_FILES` array. Append three entries at the end (after the existing 31 entries; before the closing `];`):

```ts
const AT_PIN_FILES: Array<{ tessera: string; source: string }> = [
  // ... existing 31 entries unchanged ...
  // Tessera SLICE 4 (R06) — baseline curation toolchain
  { tessera: 'tools/curate-baseline-pipeline.ts',  source: 'tools/curate-baseline-pipeline.ts' },
  { tessera: 'tools/calibrators/_shared.ts',        source: 'tools/calibrators/_shared.ts' },
  { tessera: 'tools/calibrators/family-c.ts',       source: 'tools/calibrators/family-c.ts' },
];
```

No other changes to `test/q01-no-at-pin-deltas.test.ts`. The byte-identity assertion logic (`stripHeader` + `assert.strictEqual`) is path-agnostic and operates on each entry uniformly.

### Delta 5 — `tools/curate-baseline-pre-pass.ts` (CREATED — Tessera-native)

```ts
// tools/curate-baseline-pre-pass.ts — Tessera Phase 1 SLICE 4 (R06):
// per-shard within-window contamination screening pre-pass for baseline bundles.
//
// Runs BEFORE tools/calibrate.ts reads the BaselineBundle: identifies samples whose
// Mahalanobis distance under the MCD-robust subset exceeds the 0.975 χ²ₚ quantile,
// drops contaminated ticks from the bundle output, emits a BaselineCurationDecision
// audit record at decision-id D11.
//
// Stage 2a per SCOPING-MEMO-BASELINE-CURATION-v0.2 § 2; Q-JC1..Q-JC6 dispositions
// confirmed in ARCHITECT-REPLY-BASELINE-CURATION-v0.2-PRE-DISPOSITION.md.
//
// Stage 3a handoff = format compatibility with BaselineBundle (R06 ships structural-
// typed handoff; wired handoff into tools/calibrate.ts main() deferred to R08+ when
// calibrate.ts is itself vendored — see Q-R06-SPEC § Mechanism primitive 2).
//
// Tessera-original code (NOT vendored from DeploySignal). Composes vendored estimator
// surfaces from tools/calibrators/family-c.ts + tools/calibrators/_shared.ts.

import type {
  BaselineBundle,
  BaselineCurationDecision,
  BaselineCurationDecisionId,
} from '../engine/types/config';
import {
  fastMCD,
  mahalanobisSqFromL,
  chiSqQuantile975,
  FASTMCD_DEFAULT_ALPHA,
  FASTMCD_DEFAULT_SEED,
} from './calibrators/family-c';
import { choleskyLocal } from './calibrators/_shared';

/** Options for `curateBaselinePrePass`. All fields are optional; defaults
 *  mirror the inherited family-c.ts MCD constants. */
export interface PrePassOpts {
  /** MCD subset-size parameter α ∈ (0.5, 1.0]; defaults to FASTMCD_DEFAULT_ALPHA (0.75). */
  mcdAlpha?: number;
  /** Deterministic seed for MCD's mulberry32 PRNG; defaults to FASTMCD_DEFAULT_SEED. */
  mcdSeed?: number;
}

/** Result of `curateBaselinePrePass`. The curated bundle is structurally a BaselineBundle
 *  (same field set, same shape — Stage 3a format compatibility). The decision audit record
 *  is keyed at D11 (R06-shipped decision-id; see config.ts Delta 1). */
export interface PrePassResult {
  /** New BaselineBundle with contaminated ticks dropped from each run's signal_series
   *  (and hour_of_day / day_of_week when present). All non-screened fields preserved verbatim. */
  curatedBundle: BaselineBundle;
  /** Partial<Record<BaselineCurationDecisionId, BaselineCurationDecision>> with the
   *  D11 entry populated; consumers can spread into a CompiledConfig's
   *  baseline_curation_pipeline_diagnostics field (R07+ wiring). */
  decisions: Partial<Record<BaselineCurationDecisionId, BaselineCurationDecision>>;
}

/** Stage 2a per-shard within-window screening.
 *
 *  For each run in `bundle.runs`:
 *    - Collect signal names by sorted Object.keys for deterministic column ordering.
 *    - Form an N×p sample matrix where N = min length across the run's signal_series and p = number of signals.
 *    - If N < p + 1 (insufficient for MCD): pass run through unchanged, increment skip counter.
 *    - Else: run fastMCD(rows, α, seed). If MCD fails (null result, non-PD): pass through, increment skip counter.
 *    - Else: compute Mahalanobis d² per tick under (mcd.mean, mcd.cov); flag ticks where d² > chiSqQuantile975(p).
 *    - Build curated run: filter signal_series / hour_of_day / day_of_week at non-contaminated indices.
 *    - Accumulate per-run counts into the D11 audit summary.
 *
 *  Returns a NEW BaselineBundle; the input bundle is not mutated. */
export function curateBaselinePrePass(
  bundle: BaselineBundle,
  opts: PrePassOpts = {},
): PrePassResult {
  const mcdAlpha = opts.mcdAlpha ?? FASTMCD_DEFAULT_ALPHA;
  const mcdSeed = opts.mcdSeed ?? FASTMCD_DEFAULT_SEED;

  let nRunsScreened = 0;
  let nRunsSkippedInsufficientSamples = 0;
  let nRunsSkippedMcdFailed = 0;
  let nTicksTotal = 0;            // counts only ticks that were SCREENED (not pass-through ticks)
  let nTicksContaminated = 0;

  const curatedRuns = bundle.runs.map((run) => {
    const sortedSignals = Object.keys(run.signal_series).sort();
    const p = sortedSignals.length;
    if (p === 0) {
      // Run carries no signals; pass through; no screening.
      return run;
    }
    const minLen = Math.min(...sortedSignals.map((sig) => run.signal_series[sig].length));
    if (minLen < p + 1) {
      // Insufficient samples for MCD.
      nRunsSkippedInsufficientSamples += 1;
      return run;
    }
    // Form rows: rows[i][j] = run.signal_series[sortedSignals[j]][i] for i ∈ [0, minLen), j ∈ [0, p).
    const rows: number[][] = [];
    for (let i = 0; i < minLen; i++) {
      const row = new Array<number>(p);
      for (let j = 0; j < p; j++) {
        row[j] = run.signal_series[sortedSignals[j]][i];
      }
      rows.push(row);
    }
    const mcd = fastMCD(rows, mcdAlpha, mcdSeed);
    if (mcd === null) {
      nRunsSkippedMcdFailed += 1;
      return run;
    }
    const L = choleskyLocal(mcd.cov);
    if (L === null) {
      // MCD produced a non-PD cov (defensive; should not normally happen since fastMCD
      // internally Choleskys the candidate covs — but the explicit check here is the
      // belt-and-suspenders against a marginal-PD result).
      nRunsSkippedMcdFailed += 1;
      return run;
    }
    const cutoff = chiSqQuantile975(p);
    const keptIndices: number[] = [];
    for (let i = 0; i < minLen; i++) {
      const d2 = mahalanobisSqFromL(rows[i], mcd.mean, L);
      if (d2 <= cutoff) {
        keptIndices.push(i);
      } else {
        nTicksContaminated += 1;
      }
    }
    nRunsScreened += 1;
    nTicksTotal += minLen;

    // Build the curated run: filter each signal_series + hour_of_day + day_of_week at keptIndices.
    const newSignalSeries: Record<string, number[]> = {};
    for (const sig of Object.keys(run.signal_series)) {
      newSignalSeries[sig] = keptIndices.map((i) => run.signal_series[sig][i]);
    }
    const curated: BaselineBundle['runs'][number] = {
      signal_series: newSignalSeries,
    };
    if (run.tenant_id !== undefined) curated.tenant_id = run.tenant_id;
    if (run.hour_of_day !== undefined) {
      curated.hour_of_day = keptIndices.map((i) => run.hour_of_day![i]);
    }
    if (run.day_of_week !== undefined) {
      curated.day_of_week = keptIndices.map((i) => run.day_of_week![i]);
    }
    return curated;
  });

  const curatedBundle: BaselineBundle = {
    version: bundle.version,
    generated_at: bundle.generated_at,
    seed: bundle.seed,
    runs: curatedRuns,
  };
  if (bundle.cell_dim !== undefined) curatedBundle.cell_dim = bundle.cell_dim;

  const d11: BaselineCurationDecision = {
    decision_id: 'D11',
    decision_name: 'Per-shard within-window contamination screening',
    inputs: {
      upstream_decisions: undefined,
      compile_state_ref:
        'BaselineBundle.runs[].signal_series[sig][tick] → fastMCD(α=' + mcdAlpha + ', seed=' + mcdSeed
        + ') + Mahalanobis cutoff χ²_p(0.975)',
    },
    output_summary: {
      n_runs_total: bundle.runs.length,
      n_runs_screened: nRunsScreened,
      n_runs_skipped_insufficient_samples: nRunsSkippedInsufficientSamples,
      n_runs_skipped_mcd_failed: nRunsSkippedMcdFailed,
      n_ticks_total: nTicksTotal,
      n_ticks_contaminated: nTicksContaminated,
      contamination_rate: nTicksTotal > 0 ? nTicksContaminated / nTicksTotal : 0,
      mcd_method: 'mcd',
      mcd_alpha: mcdAlpha,
    },
    decision_rule:
      'Tessera SLICE 4 D11 — per-shard within-window MCD-robust Mahalanobis screening at '
      + 'χ²_p(0.975) cutoff. Q-JC1 (α) vendor-at-pin + Q-JC2 pre-pass-only + Q-JC3 per-shard-first.',
    verification: {
      audit_emitted: true,
      diagnostic_path: 'CompiledConfig.baseline_curation_pipeline_diagnostics.D11',
    },
    source_memorialization:
      'ARCHITECT-REPLY-BASELINE-CURATION-v0.2-PRE-DISPOSITION (Q-JC1 α + Q-JC2 + Q-JC3); '
      + 'SCOPING-MEMO-BASELINE-CURATION-v0.2 § 2 Stage 2a.',
  };

  return {
    curatedBundle,
    decisions: { D11: d11 },
  };
}
```

Implementer note: the function is a single pure-function pass (no I/O; no module-level state); behavior is fully determined by `bundle` + `opts.mcdAlpha` + `opts.mcdSeed` (both default to constants from vendored family-c.ts). The function never mutates `bundle`. Use `node --test` + the q06 test file as the primary verification surface.

### Delta 6 — `coordination/VENDORING-MANIFEST.md` (CHANGED — auto-appended)

Three new rows AUTO-APPENDED by the vendor script during Delta 7a/b/c. Expected manifest state after R06 GREEN (rows in vendor-script order, appended at the bottom):

```
| tools/curate-baseline-pipeline.ts | tools/curate-baseline-pipeline.ts | 5a72371 | vendored-at-pin | 2026-05-16 | Tessera SLICE 4 (R06) audit-emission orchestrator; imports from already-vendored engine/types/config.ts only |
| tools/calibrators/_shared.ts | tools/calibrators/_shared.ts | 5a72371 | vendored-at-pin | 2026-05-16 | Tessera SLICE 4 (R06) numerical primitives (mulberry32 / gaussian / choleskyLocal); compilation-dep leaf for family-c.ts |
| tools/calibrators/family-c.ts | tools/calibrators/family-c.ts | 5a72371 | vendored-at-pin | 2026-05-16 | Tessera SLICE 4 (R06) MCD/MRCD/Ledoit-Wolf calibrators; consumed by tools/curate-baseline-pre-pass.ts |
```

The "Notes" column wording for the three rows is the Implementer's choice; the architect suggestion above is a reasonable default. The 38 existing manifest rows must NOT be modified.

Implementer note: the vendor script auto-appends a row WITHOUT the "Notes" column populated (`| | |` at the end). After Delta 7a/b/c runs, the Implementer manually edits the manifest to populate the Notes column for the three new rows per the suggested text above; this is a single-edit hygiene step on each row.

### Delta 7a — vendor `tools/curate-baseline-pipeline.ts` (CREATED — auto-vendored)

Run from tessera repo root: `./tools/vendor-from-deploysignal.sh tools/curate-baseline-pipeline.ts tools/curate-baseline-pipeline.ts vendored-at-pin`

Expected post-creation: `wc -l tools/curate-baseline-pipeline.ts` ≈ 267 (261 source lines + 6 header lines); `grep -c "VENDORED FROM DeploySignal" tools/curate-baseline-pipeline.ts` → 1; `grep -c "5a72371" tools/curate-baseline-pipeline.ts` → 1.

### Delta 7b — vendor `tools/calibrators/_shared.ts` (CREATED — auto-vendored)

Run from tessera repo root: `./tools/vendor-from-deploysignal.sh tools/calibrators/_shared.ts tools/calibrators/_shared.ts vendored-at-pin`

The vendor script's `mkdir -p "$(dirname "$target_abs")"` (line 73) creates the `tools/calibrators/` directory on this first vendor-into-it run.

### Delta 7c — vendor `tools/calibrators/family-c.ts` (CREATED — auto-vendored)

Run from tessera repo root: `./tools/vendor-from-deploysignal.sh tools/calibrators/family-c.ts tools/calibrators/family-c.ts vendored-at-pin`

Post-vendor verification (Implementer-side): `npm run typecheck` → exit 0 (proves the dep closure resolves: family-c.ts → _shared.ts → none + engine/types/* already vendored + engine/detectors/sequential-mmd + family-c-rff both already vendored). If typecheck fails with TS2307 / TS2724 on a tools/calibrate.ts-class file path, see Implementer note 3 above: this is HALT condition (b) — write DIAGNOSTIC-R06-additional-tools-vendor.md + STATUS: ESCALATE. Do NOT silently vendor calibrate.ts or its closure.

### Delta 8 — `test/q06-baseline-pre-pass.test.ts` (CREATED — TDD RED)

```ts
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
```

Implementer note: the 13 ACs structurally pre-determine the q06 in-file test count at 13 (R03 MINOR-4 reinforcement: pre-stated counts are acceptable when structurally determined by the spec).

---

## Acceptance criteria

All ACs use "Given X, when Y, then Z" form; no banned words ("correctly", "appropriately", "as needed"). Each AC binds to a specific named test or a specific Reviewer-run binding command. Literal values are spelled out in fixtures + assertions per the R02/R04/R05 spec-AC-literal-value reinforcement.

**Stage 2a behavior (q06 test file binds):**

- **AC-1** — _Given_ a `BaselineBundle` with `runs: []`, _when_ `curateBaselinePrePass(bundle)` is called, _then_ `result.curatedBundle.runs.length === 0` AND `result.decisions.D11!.output_summary.n_runs_total === 0` AND all D11 counters are 0 AND `contamination_rate === 0`. Evidence: `test/q06-baseline-pre-pass.test.ts` "R06 AC-1 …" passes (literal-value assertions inside the named test).

- **AC-2** — _Given_ `CLEAN_BUNDLE` (8 ticks × 2 signals, no outliers), _when_ `curateBaselinePrePass(CLEAN_BUNDLE)` is called, _then_ the run is screened (not skipped — `n_runs_screened === 1` AND both skip counters === 0) AND `n_ticks_total === 8` AND `n_ticks_contaminated <= 2` AND the curated signal_series arrays have length ≥ 6 AND signal a and signal b arrays have equal length post-curation. (Inequality bounds rather than equalities because MCD's trim count is h=6 of 8 at α=0.75; the 2 trimmed samples may or may not pass the χ²₂(0.975) reweight cutoff under seed-dependent MCD subset choice. AC binds the load-bearing invariant — clean data is not mass-flagged; column-length parallelism preserved.) Evidence: `test/q06-baseline-pre-pass.test.ts` "R06 AC-2 …" passes.

- **AC-3** — _Given_ any non-empty bundle, _when_ `curateBaselinePrePass` runs, _then_ `result.decisions.D11!.output_summary.mcd_method === 'mcd'` AND `result.decisions.D11!.output_summary.mcd_alpha === 0.75`. Evidence: `test/q06-baseline-pre-pass.test.ts` "R06 AC-3 …" passes (literal-value assertions inside the named test).

- **AC-4** — _Given_ `OUTLIER_BUNDLE` (7 clean ticks + 1 outlier at (100, 100) at index 7), _when_ `curateBaselinePrePass(OUTLIER_BUNDLE)` is called, _then_ the run is screened (`n_runs_screened === 1` AND both skip counters === 0) AND `n_ticks_total === 8` AND `n_ticks_contaminated >= 1` AND `n_ticks_contaminated <= 3` AND the surviving `signal_series.a` array does NOT contain the value 100 AND the surviving `signal_series.b` array does NOT contain the value 100 AND `contamination_rate === n_ticks_contaminated / 8`. (Inequality bounds for the count rather than equality because MCD's trim count is h=6 of 8 at α=0.75; the outlier is reliably flagged but the other trimmed samples' reweight-pass behavior is seed-dependent. AC binds the load-bearing invariant — outlier IS dropped from the curated bundle.) Evidence: `test/q06-baseline-pre-pass.test.ts` "R06 AC-4 …" passes.

- **AC-5** — _Given_ `INSUFFICIENT_BUNDLE` (2 ticks × 2 signals; n=2 < p+1=3), _when_ `curateBaselinePrePass` runs, _then_ the run is passed through verbatim AND `n_runs_skipped_insufficient_samples === 1` AND `n_runs_screened === 0` AND `n_ticks_total === 0` (skipped runs do not contribute to n_ticks_total). Evidence: `test/q06-baseline-pre-pass.test.ts` "R06 AC-5 …" passes.

- **AC-6** — _Given_ `TWO_RUN_BUNDLE` (run 0 clean with 8 ticks; run 1 outlier at index 7 with 8 ticks; both with `hour_of_day: [0..7]` and `[8..15]`), _when_ `curateBaselinePrePass` runs, _then_ both runs are screened (`n_runs_screened === 2` AND both skip counters === 0) AND `n_ticks_total === 16` AND for each run `hour_of_day.length === signal_series.a.length` (column-length parallelism preserved) AND run 1's surviving `signal_series.a` array does NOT contain the value 100 AND `n_ticks_contaminated >= 1` (at least the outlier flagged) AND `n_ticks_contaminated <= 6` (bounded above by 2-MCD-trim per-run × 2 runs + 2 outlier headroom — actually 4, but a safety margin to 6) AND `contamination_rate === n_ticks_contaminated / 16`. (Inequality bounds for the same reason as AC-4.) Evidence: `test/q06-baseline-pre-pass.test.ts` "R06 AC-6 …" passes.

- **AC-7** — _Given_ `TWO_RUN_BUNDLE`, _when_ `curateBaselinePrePass` runs, _then_ `Object.keys(result.curatedBundle).sort()` deep-equals `['cell_dim', 'generated_at', 'runs', 'seed', 'version']` AND `result.curatedBundle.version === TWO_RUN_BUNDLE.version` AND `result.curatedBundle.cell_dim === TWO_RUN_BUNDLE.cell_dim` (Stage 3a structural-typing format compatibility). Evidence: `test/q06-baseline-pre-pass.test.ts` "R06 AC-7 …" passes.

- **AC-8** — _Given_ `OUTLIER_BUNDLE`, _when_ `curateBaselinePrePass(OUTLIER_BUNDLE)` is called and the result discarded, _then_ `JSON.stringify(OUTLIER_BUNDLE)` is unchanged across the call (input bundle immutability). Evidence: `test/q06-baseline-pre-pass.test.ts` "R06 AC-8 …" passes.

- **AC-9** — _Given_ `CLEAN_BUNDLE`, _when_ `curateBaselinePrePass` runs, _then_ `result.decisions.D11!.decision_id === 'D11'` AND `decision_name === 'Per-shard within-window contamination screening'` AND `verification.audit_emitted === true` AND `verification.diagnostic_path === 'CompiledConfig.baseline_curation_pipeline_diagnostics.D11'`. Evidence: `test/q06-baseline-pre-pass.test.ts` "R06 AC-9 …" passes.

- **AC-10** — _Given_ `CLEAN_BUNDLE`, _when_ `curateBaselinePrePass` runs, _then_ `result.decisions.D11!.inputs.upstream_decisions === undefined` (D11 is a foundational decision; no upstream dependency on D1-D10). Evidence: `test/q06-baseline-pre-pass.test.ts` "R06 AC-10 …" passes.

- **AC-11** — _Given_ `CLEAN_BUNDLE`, _when_ `curateBaselinePrePass` runs, _then_ `Object.keys(result.decisions).sort()` deep-equals `['D11']` (only D11 populated; D12/D13 absent — R07-reserved per Delta 1 schema). Evidence: `test/q06-baseline-pre-pass.test.ts` "R06 AC-11 …" passes.

- **AC-12** — _Given_ `CLEAN_BUNDLE` and `opts.mcdAlpha === 0.9`, _when_ `curateBaselinePrePass(CLEAN_BUNDLE, { mcdAlpha: 0.9 })` is called, _then_ `result.decisions.D11!.output_summary.mcd_alpha === 0.9` (opts override propagates to audit summary). Evidence: `test/q06-baseline-pre-pass.test.ts` "R06 AC-12 …" passes.

- **AC-13** — _Given_ `CLEAN_BUNDLE` (which omits `cell_dim`), _when_ `curateBaselinePrePass` runs, _then_ `result.curatedBundle.cell_dim === undefined` AND the bundle does not introduce a fabricated `cell_dim` value. Evidence: `test/q06-baseline-pre-pass.test.ts` "R06 AC-13 …" passes.

**Vendoring substrate (q01 tests + manifest):**

- **AC-14** — _Given_ the R06 GREEN commit, _when_ `node --test test/q01-vendoring-coverage.test.js` is run, _then_ pass count === 3 AND fail count === 0 (3 in-file tests: header-format + SHA + manifest-row; each iterates over the extended path list including the 3 new tools/ files). Evidence: Reviewer-run command. Pre-R06 baseline at HEAD `8d724de` was 3/0 over 33 paths; R06 extends to 36 paths same 3/0.

- **AC-15** — _Given_ the R06 GREEN commit, _when_ `node --test test/q01-no-at-pin-deltas.test.js` is run, _then_ pass count === 1 AND fail count === 0 (1 in-file test iterating the extended AT_PIN_FILES list including the 3 new tools/ files). The byte-identity assertion holds for all 34 files (31 existing + 3 new). Evidence: Reviewer-run command.

- **AC-16** — _Given_ the R06 GREEN commit, _when_ `coordination/VENDORING-MANIFEST.md` is inspected, _then_ exactly 3 new rows appear (one per vendored tools/ file) AND existing 38 rows are byte-identical to pre-R06 state. Evidence: Reviewer-run `git diff 8d724de..HEAD -- coordination/VENDORING-MANIFEST.md` shows only additions (no deletions or modifications to existing rows).

**Compile + test substrate health:**

- **AC-17** — _Given_ the R06 commit sequence, _when_ `git log --oneline -- test/q06-baseline-pre-pass.test.ts tools/curate-baseline-pre-pass.ts engine/types/config.ts tools/vendor-from-deploysignal.sh` is run, _then_ a RED commit (adding `test/q06-baseline-pre-pass.test.ts` only) precedes a GREEN commit (adding the production code + vendored files + schema delta + script extension + q01 list extensions + manifest extension). Evidence: Reviewer-run `git log --oneline` produces two commits in the correct order; `git show <RED> --stat` shows only `test/q06-baseline-pre-pass.test.ts` added.

- **AC-18** — _Given_ the GREEN commit, _when_ `npm run typecheck` is run from the repo root, _then_ exit code === 0 with no error output. Evidence: Reviewer-run command. (This is the load-bearing check that the vendored family-c.ts + _shared.ts + curate-baseline-pipeline.ts resolve all their imports against the post-R06 tree — fastMCD, mahalanobisSqFromL, etc. are all callable from pre-pass.ts.)

- **AC-19** — _Given_ the GREEN commit, _when_ `node --test test/q06-baseline-pre-pass.test.js` is run, _then_ pass count === 13 AND fail count === 0. Evidence: Reviewer-run command.

- **AC-20** — _Given_ the GREEN commit, _when_ all pre-R06 test files are run independently (q01-vendoring-coverage + q01-no-at-pin-deltas + q01-schema-additions + q02-schema-extension + q03-warm-start-runtime + q04-welford-stats + q05-per-shard-runtime + betting-e-process smoke), _then_ each produces the OBSERVED pass count it produced at R05 close — no regressions. Implementer reports OBSERVED output per R03 MINOR-4 reinforcement; do NOT pre-state counts. Reference: pre-R06 baseline (Reviewer-verified at R05 HEAD `8d724de`) was q01-vc=3, q01-no-at-pin=1, q01-sa=5, q02-se=6, q03-warm=13, q04-welford=11, q05-runtime=13, smoke=5; total 57. R06's schema delta is additive (D11/D12/D13 only added to enum; no existing decision-id changed), so all pre-R06 tests must still pass. Evidence: Reviewer-run `node --test` on each file independently.

- **AC-21** — _Given_ the GREEN commit, _when_ `node --test test/betting-e-process-class-dispatch.test.js` is run, _then_ pass count === 5 AND fail count === 0 (inherited Ville-bound smoke regression baseline; R01 AC-10 carry-forward; preserved at R05). Evidence: Reviewer-run command.

- **AC-22** — _Given_ the GREEN commit, _when_ a grep is run for `as any` in executable lines of the new `tools/curate-baseline-pre-pass.ts`, _then_ 0 matches in executable code (the test pattern `grep -nE "^[^/*]*as any" tools/curate-baseline-pre-pass.ts` returns 0 matches; per R03 MINOR-2 reinforcement, the grep distinguishes executable code from `//` or `*` comments by anchoring to a line start without comment-marker characters). Evidence: Reviewer-run grep with the executable-line-only pattern.

---

## Anti-scope

R06 ships exactly the surface inventory above; the following enumerate paths the Implementer must NOT touch. Encountering apparent need → HALT and write a DIAGNOSTIC.

- **R06-SAS-1: NO vendoring of `tools/calibrate.ts` or its transitive dep closure** (`tools/profile-loader.ts`, `tools/bundle-loader.ts`, `tools/calibrators/{family-a, family-e, effective-config, bake-profiles}.ts`, `engine/resamplers/*`). Q-JC1 brainstorm-re-evaluation (see audit sidecar + § Mechanism primitive 2) explicitly defers this. Implementer encountering apparent need to vendor any of these (e.g., typecheck failure pointing at one of the deferred files) → HALT and write DIAGNOSTIC-R06-additional-tools-vendor.md + STATUS: ESCALATE. Do NOT silently vendor.

- **R06-SAS-2: NO addition of `js-yaml` (or any new npm dependency) to `package.json`.** The vendored tools at R06 (curate-baseline-pipeline + family-c + _shared) have zero npm dependencies beyond `@types/node` + `typescript` (already in devDependencies). If a transitive vendor pulls in a new dep, that's a HALT condition (b) — write DIAGNOSTIC + ESCALATE.

- **R06-SAS-3: NO always-on / streaming filter behavior** (Q-JC2 binding). `curateBaselinePrePass` is a pure pre-pass function that takes a `BaselineBundle` and returns a `BaselineBundle`. Any addition of streaming consumption, file-watching, or runtime-detector integration is HALT.

- **R06-SAS-4: NO Stage 2b FCP-1 fleet-correlated-pattern primitive at R06** (Q-JC4/4a/4b/4c bindings deferred to R07). No e-process accumulator on cross-shard masks; no `p_alt` mixture; no `p_base` estimation; no martingale construction. Implementer encountering apparent need to combine masks across runs → HALT.

- **R06-SAS-5: NO Stage 3b warm-start eligibility tagging at R06** (Q-JC5 binding deferred to R07). No coupling between the curated bundle output and `engine/per-shard/warm-start.ts` `residual_seed_hash` semantics. The pre-pass output is a `BaselineBundle`, not a warm-start invalidation signal.

- **R06-SAS-6: NO Spectral Residual / Robust PCA / BOCPD additions** (Q-JC6 binding). Only MCD-based screening at R06.

- **R06-SAS-7: NO modification to inherited vendored engine internals.** A12 carry-forward (R01 SAS-7/8 → R02 SAS-8 → R03 SAS-9 → R04 SAS-12 → R05 SAS-15 chain). The Delta 1 extension to `BaselineCurationDecisionId` is the ONE allowed Tessera-side extension at R06; it is additive (no removal or modification of D1-D10).

- **R06-SAS-8: NO modification to `engine/per-shard/warm-start.ts`, `engine/per-shard/welford.ts`, or `engine/per-shard/runtime.ts`.** R03/R04/R05-shipped runtime substrate is untouched at R06. The pre-pass operates upstream of per-shard runtime (at the BaselineBundle level, not the residual level).

- **R06-SAS-9: NO modification to `tools/calibrators/family-c.ts` or `tools/calibrators/_shared.ts` post-vendor.** Both are `vendored-at-pin`; the q01-no-at-pin-deltas test will fail if any byte is changed beyond the 5-line provenance header.

- **R06-SAS-10: NO modification to `tools/curate-baseline-pipeline.ts` post-vendor.** Same `vendored-at-pin` discipline as SAS-9. (Note: the inherited orchestrator throws `NotImplementedError` for SLICE_2 and SLICE_3 — the inherited stubs are preserved verbatim; Tessera's D11/D12/D13 do not flow through this orchestrator at R06. The orchestrator is vendored as a substrate for future integration when calibrate.ts wiring lands.)

- **R06-SAS-11: NO modification to `tsconfig.json` / `tsconfig.test.json` / `package.json`.** Existing `tsconfig.test.json:13-15` includes `tools/**/*.ts`, so the new vendored files + new pre-pass file + new test file are auto-covered. No new dependencies introduced (SAS-2). No changes to the test glob.

- **R06-SAS-12: NO modification to `test/_substrate/factories.ts`.** R03-shipped factories cover per-shard-residual ergonomics; R06's test surface is `BaselineBundle` construction, which is straightforward enough to inline in the test file's fixtures (no factory needed). If a future round wants `makeBaselineBundle`, that's a separate spec.

- **R06-SAS-13: NO modification to `test/q01-schema-additions.test.ts`, `test/q02-schema-extension.test.ts`, `test/q03-warm-start-runtime.test.ts`, `test/q04-welford-stats.test.ts`, `test/q05-per-shard-runtime.test.ts`.** All prior-round tests must pass at R06 per AC-20 by virtue of the schema delta being purely additive (extending the enum without modifying D1-D10).

- **R06-SAS-14: NO modification to `engine/types/config.ts` outside Delta 1.** Delta 1 is precisely: extend the `BaselineCurationDecisionId` union to add `'D11' | 'D12' | 'D13'`; update the JSDoc block at lines 207-213 to document the extension. No other types, interfaces, or fields in config.ts modified.

- **R06-SAS-15: NO addition of `tools/index.ts` barrel export or `tools/calibrators/index.ts`.** Consumers import each vendored file directly (R03-shipped pattern for `engine/per-shard/`).

- **R06-SAS-16: NO PR-F9 empirical-performance measurement.** Memo § 4.2 R-E3 mentions CPU profile at fleet scale — deferred per Memorial F sub-rule 1 (no measurement-load-bearing inheritance at R06; PR-F9 fires at R07 close-walk when fleet-scale substrate exists).

- **R06-SAS-17: NO modification to `coordination/PRD.md`, `coordination/SCOPING-MEMO-v0.3.md`, `coordination/SCOPING-MEMO-BASELINE-CURATION-v0.2.md`, or `coordination/ARCHITECT-REPLY-BASELINE-CURATION-v0.2-PRE-DISPOSITION.md`.** Operator-owned scoping artifacts.

- **R06-SAS-18: NO removal or modification of existing rows in `coordination/VENDORING-MANIFEST.md`.** Only append-3-new-rows at R06.

- **R06-SAS-19: NO modification to `tools/vendor-from-deploysignal.sh` beyond Delta 2.** Delta 2 is precisely the sandbox case-statement extension (allow `tools/*`); script body otherwise unchanged.

- **R06-SAS-20: NO modification to `coordination/NEXT-ROLE.md` beyond the routing-to-IMPLEMENTER update at GREEN-commit close.** The Implementer updates `STATUS: READY` + records observed test counts; no other changes.

---

## Open questions

(Surfaced ambiguities — none block R06 implementation; OQ-1 surfaces the Q-JC1 brainstorm-re-evaluation for John's review at next operator gate.)

1. **OQ-1: Should `tools/calibrate.ts` vendoring be re-scoped into R06, or accepted as R08+ work?** This is the Q-JC1 brainstorm-re-evaluation (per R12 reinforcement). R06 architect's narrowing: defer to R08+ when `calibrate.ts` wiring is also in scope. Architect-pre-prediction: R08+ deferral is correct because (a) the dep closure is ~15 files + 1 npm dep + significant test substrate (R01-class scope at a single round); (b) at R06 there's no Tessera consumer that would benefit from having a vendored-but-unwired calibrate.ts (the curated bundle is consumed by no production code yet — Stage 3a is format-only); (c) future wiring naturally co-locates vendoring + wiring at the same round, minimizing the "dead substrate" anti-pattern from R01 ville-preservation. Confidence: HIGH. John's call to override if the literal Q-JC1 disposition is required at R06.

2. **OQ-2: Should the `BaselineCurationDecisionId` extension include D12 and D13 reservations now, or only D11?** R06 architect-pre-prediction: include all three (D11 R06-shipped; D12 + D13 R07-reserved). Rationale: R07 spec must NOT re-edit the schema for D12 + D13 — one extension at R06 minimizes future schema churn and aligns with the additive-extension discipline (R02 reinforcement). The risk of reserving names that future R07 architect rejects is small (D12 + D13 are documented as Q-JC4 / Q-JC5 bindings; rejection would require Q-JC override). Confidence: HIGH.

3. **OQ-3: Should `tools/curate-baseline-pre-pass.ts` be in `tools/` (alongside vendored tools) or in `engine/curate/` (Tessera-native sibling of `engine/per-shard/`)?** R06 architect picks `tools/` because (a) the vendored audit-emission orchestrator at `tools/curate-baseline-pipeline.ts` is the closest existing surface (same conceptual layer); (b) the pre-pass is a build-time / pre-calibrate tool, not a runtime detector — `engine/` is reserved for runtime substrate; (c) `tools/` already has the vendor script + manifest pattern. Confidence: MEDIUM. Future-round refactor to `engine/curate/` is possible if symmetric SLICE 4+ surfaces emerge there; not required at R06.

4. **OQ-4: Should the MCD α default (0.75) be operator-tunable at R06, or fixed at the vendored constant?** R06 architect picks operator-tunable via `PrePassOpts.mcdAlpha` (AC-12 binds the override propagation). Rationale: tunable surfaces are cheap to add at the API boundary; deferring exposure forces future-round schema delta on the opts object. The default REMAINS at FASTMCD_DEFAULT_ALPHA = 0.75 per Q-JC1 spirit (inherit deploysignal defaults verbatim unless explicitly overridden). Confidence: HIGH.

5. **OQ-5: Should the per-run skip-reasons (insufficient-samples vs MCD-failed) be split into separate D11.output_summary keys (current spec) or unified into a single `n_runs_skipped` counter?** R06 architect picks split. Rationale: the two skip reasons have different operational meaning (insufficient-samples = bundle structure issue; MCD-failed = numerical/data-quality issue); operators tuning fleet-scale ingestion need both counters for triage. Confidence: HIGH.

All 5 open questions are R07+ or post-merge concerns; none block the R06 acceptance criteria.

---

## P3 ten-axis verification

1. **Correctness** — Stage 2a screening produces the exact contamination-mask and curated-bundle shapes specified at AC-2 + AC-4 + AC-5 + AC-6 + AC-7 (hand-verifiable by re-running fastMCD against the named fixtures). D11 audit emission has all required fields per the inherited `BaselineCurationDecision` interface (AC-9 + AC-10). Pure-function discipline (AC-8). Schema-extension additivity preserves D1-D10 (verified by AC-20 — all pre-R06 tests pass at the post-R06 tree). Vendoring at-pin byte-identity preserved on three new files (AC-15).

2. **Completeness** — All five run-handling branches bound: empty bundle (AC-1), clean run (AC-2), outlier-containing run (AC-4), insufficient-samples skip (AC-5), multi-run accumulation (AC-6). Stage 3a format compatibility (AC-7). Pure-function discipline (AC-8). D11 audit record fields bound (AC-9 + AC-10 + AC-11). Opts override propagation (AC-12). cell_dim handling (AC-13). Vendoring substrate (AC-14 + AC-15 + AC-16). Compile + test health (AC-17 through AC-22).

3. **Consistency** — Cross-section consistency pass executed (16 resolved-decision checks; all PASS). Function name, file paths, schema delta token, D11 decision-id, MCD parameter values are consistent across all spec sections (Mechanism, Component inventory, Integration points, Per-file pseudocode, Acceptance criteria, Anti-scope, Open questions).

4. **Clarity** — Architectural decisions made explicit in § Mechanism primitives 1-8 with documented rationale (full why-picked / why-rejected in audit sidecar § Decision rationale). The Q-JC1 narrowing — the load-bearing deviation — is surfaced in § Mechanism primitive 2 + § Anti-scope R06-SAS-1 + § Open questions OQ-1 + audit sidecar Brainstorm re-evaluation per R12 reinforcement. Implementer notes 1-6 each carry verification commands. AC wording uses "Given X, when Y, then Z" form throughout.

5. **Coverage** — 22 ACs map to the 10-surface component inventory: AC-1 through AC-13 against `test/q06-baseline-pre-pass.test.ts` (13 in-file tests); AC-14 + AC-15 against the extended q01 test files; AC-16 against the manifest; AC-17 against the TDD ordering (git log); AC-18 against typecheck; AC-19 against q06 file-level pass; AC-20 against pre-R06 regression; AC-21 against inherited smoke; AC-22 against the new pre-pass file's cast hygiene. Skill 15 prescription-to-AC-coverage check applied per audit sidecar.

6. **Constraints** — Inherited Ville-bound + Welford + observeSample contracts preserved (R06-SAS-7 + R06-SAS-8 fence inherited engine internals and Tessera-original runtime substrate; pre-pass operates at the BaselineBundle layer, upstream of per-shard runtime). PRD AC-P1 + AC-P2 trace: contaminated baselines would break the "preserves inherited single-instance behavior" property; Stage 2a drops contaminated ticks before per-shard residuals are computed (R03/R04/R05 substrate is downstream). Memorial F sub-rule 1 (compile-time substrate multi-read-paths): the BaselineCurationDecisionId Delta 1 adds new producer (D11) for the existing audit field; no consumers modified — additive extension only.

7. **Concurrency** — Pure-function discipline (`curateBaselinePrePass` is a pure function; no module-level state; AC-8 binds input immutability). MCD is deterministic given (rows, alpha, seed) per the vendored mulberry32 PRNG (FASTMCD_DEFAULT_SEED is a constant). No shared-reference issues.

8. **Corner cases** — Empty bundle (AC-1). Clean run (AC-2). Run with all contaminated ticks beyond cutoff — would produce empty signal_series arrays in the curated output; behavior consistent (filter at no indices) and `n_ticks_contaminated === minLen`; not separately bound by an AC but covered by the literal-value mechanism of AC-4's filter semantics. Run with `n < p+1` (AC-5). Mixed runs in one bundle (AC-6). Bundle with cell_dim (AC-7). Bundle without cell_dim (AC-13). MCD failure (degenerate cov) — handled at primitive 3 + Implementer note 5 + AC-2 expected behavior when fastMCD returns null on all-zero rows. Opts override (AC-12). Empty signal_series object (p === 0): pseudocode primitive 3 early-returns the run unchanged; no AC binds this specifically (orthogonal corner case; documented in pseudocode).

9. **Cost** — Implementer Q-cycle estimate: ~3-4 hours total (largest tessera-original surface to date at R06; vendoring + new pre-pass file + 13-AC test + 5 deltas to existing files). MCD cost: fastMCD is O(n² · p) per c-step × O(N_subsets · CSTEP_LIMIT) ≈ O(500 × 20 × 64 × 2) = ~1.3M ops at the worst R06 fixture (8 ticks × 2 signals) — sub-millisecond per run. Test suite runtime: q06 alone < 100ms; full R06 test suite ~3-4 seconds.

10. **Coupling** — Three new module dependencies: pre-pass.ts → engine/types/config.ts (existing import; extended); pre-pass.ts → tools/calibrators/family-c.ts (vendored at R06); pre-pass.ts → tools/calibrators/_shared.ts (vendored at R06). One new compile-time edge: config.ts → none (Delta 1 is enum-only; no new imports needed at config.ts). Vendoring infrastructure: vendor script + q01 tests extended additively. Inherited engine internals unchanged.

---

## Grilling output

(R01-derived discipline; pre-emit adversarial self-review on this spec before routing. Standing reinforcement audit table at the start covers every accumulated REINFORCED entry; per-claim verifiability follows; then unstated assumptions; then scope-added; then Implementer-actionability.)

### Standing-reinforcement audit table

Every REINFORCED entry in `~/.claude/CROSS-PROJECT-MEMORIAL.md` and `coordination/MEMORIAL.md` reviewed for applicability to R06. The most recent + most load-bearing entries are tabulated; older entries verified by general grilling-discipline application.

| # | Reinforcement source | Applies this round? | Where addressed |
|---|---|---|---|
| 1 | R01 cross-section consistency pass (CLAUDE-ARCHITECT.md REINFORCED 2026-05-16) | YES | § Cross-section consistency pass (16-row check; 6th consecutive application) |
| 2 | R02 type-declaration-site discipline (CLAUDE-ARCHITECT.md REINFORCED 2026-05-16; from R02 OBS-3) | YES | § Integration points 1-7 — all declaration sites opened at HEAD `a75ebc4` or at vendored-source SHA `5a72371`; line numbers cited per primitive |
| 3 | R02 file-creation track-state discipline (CLAUDE-ARCHITECT.md REINFORCED 2026-05-16; from R02 OBS-2) | YES (inversely) | § Component inventory directory-creation note — `git ls-files` evidence for the 4 new file paths + the `tools/calibrators/` directory absence |
| 4 | R03 re-export-chain-check discipline (CLAUDE-ARCHITECT.md REINFORCED 2026-05-16; from R03 MINOR-3) | YES | § Integration points 1-7 — re-export chains verified at each cross-module import: `fastMCD` direct export at family-c.ts:538, no re-export indirection; `choleskyLocal` direct export at _shared.ts:31 |
| 5 | R03 grep-pattern-soundness discipline (CLAUDE-ARCHITECT.md REINFORCED 2026-05-16; from R03 MINOR-2) | YES | AC-22 grep pattern uses `^[^/*]*as any` to distinguish executable code from `//` or `*` comments (per the reinforcement); Implementer note 1's grep on `tools/*` in the vendor script is a directory-prefix check, intent-aligned |
| 6 | R03 empirically-verified-test-count discipline (CLAUDE-ARCHITECT.md REINFORCED 2026-05-16; from R03 MINOR-4) | YES | AC-20 directs Implementer to report OBSERVED counts; baseline (57 total at HEAD `8d724de`) is INFORMATIONAL prose, not AC-bound. AC-19 pre-states q06 = 13 because the spec ITSELF declares 13 in-file ACs (structurally pre-determined) |
| 7 | R05 narrative-vs-pseudocode AC-count cross-check (CROSS-PROJECT-MEMORIAL R05 entry) | YES | Component inventory states the test file binds AC-1 through AC-13 (13 ACs); per-file pseudocode shows 13 named tests; AC-19 binds count===13. All three sites agree |
| 8 | R12 brainstorm-re-evaluation when re-selecting an approach the original brainstorm rejected (CROSS-PROJECT-MEMORIAL R12 entry; CLAUDE-ARCHITECT.md fix-cycle considerations) | YES — this is the load-bearing one for R06 | § Mechanism primitive 2 surfaces the Q-JC1 narrowing inline; audit sidecar contains full "Brainstorm re-evaluation" block per the reinforcement; OQ-1 surfaces it for operator review |
| 9 | R12 backward-compat file check in §2 inventory (CROSS-PROJECT-MEMORIAL R12 entry) | YES | § Component inventory enumerates all 10 changed/created files; the q01 list-extension files (test/q01-vendoring-coverage.test.ts + test/q01-no-at-pin-deltas.test.ts) are declared as CHANGED per the reinforcement (backward-compat patches must appear in §2 inventory) |
| 10 | R09 self-confirming integration tests (CROSS-PROJECT-MEMORIAL R09 entry) | YES | q06 tests CALL the production function `curateBaselinePrePass` directly; no inline re-implementation of MCD or Mahalanobis in test bodies. Right-reasons audit on AC-2 + AC-4: fixtures are externally-derived; production function computes the result; assertions check production output against literal-value expectations |
| 11 | R13 firm-name regex collision check (CROSS-PROJECT-MEMORIAL R13 entry) | N/A | No `.not.toMatch` / `.not.toContain` patterns in q06 tests |
| 12 | R14 stale-SHA two-commit chore-sequence (CROSS-PROJECT-MEMORIAL R14 entry, line 542) | YES | Implementer Note (not in spec; standing CLAUDE-IMPLEMENTER.md discipline) — Implementer follows the 5-step coordination chore sequence at GREEN commit close, not architect's per-spec responsibility |
| 13 | R15 cascade-delete-trigger backward-compat (CROSS-PROJECT-MEMORIAL R15 entry) | N/A | No database triggers or cascade-delete semantics in R06 |
| 14 | R15 read-path self-confirming test (CROSS-PROJECT-MEMORIAL R15 entry) | YES | q06 tests INVOKE the production function for every assertion; no inline re-implementation of read queries against the curated bundle |
| 15 | R01 anti-scope vs compilation-deps tension (R01 MAJOR-3) | YES — this is the load-bearing one for R06 vendoring | § Mechanism primitive 1 explicitly enumerates `_shared.ts` as the ONE new compilation dep; primitive 2 + R06-SAS-1 explicitly fence `tools/calibrate.ts` closure; Implementer note 3 prescribes HALT + DIAGNOSTIC if additional vendoring need surfaces during typecheck |

All 15 applicable reinforcements addressed; the load-bearing items (#8 + #15) have dedicated spec-section disposition.

### Per-claim verifiability

Every claim audited for verifiability:
- Module-path claims (`tools/curate-baseline-pre-pass.ts`, `test/q06-baseline-pre-pass.test.ts`, `tools/calibrators/_shared.ts`, etc.): verifiable via `git ls-files` at HEAD `a75ebc4` showing absence (RED commit creates them OR GREEN commit creates them — see Implementer note 4 + AC-17 split).
- Vendored-source line numbers (fastMCD at deploysignal family-c.ts:538; mahalanobisSqFromL at 386; chiSqQuantile975 at 356; FASTMCD_DEFAULT_ALPHA at 449; FASTMCD_DEFAULT_SEED at 450; FastMCDResult at 457; choleskyLocal at _shared.ts:31): all line numbers verified via file reads against deploysignal SHA `5a72371` during spec authoring.
- Inherited engine-vendored claims (engine/types/config.ts BaselineBundle line 394; BaselineCurationDecisionId line 210; BaselineCurationDecision line 222): all verified via Tessera-vendored config.ts read.
- Pre-R06 test count baseline (57 at HEAD `8d724de`): cited from R05 close (MEMORIAL line 508 — Implementer attestation: q01-vc=3, q01-no=1, q01-sa=5, q02-se=6, q03=13, q04=11, q05=13, smoke=5; total 57). Independently re-verifiable by `node --test` per AC-20.
- Q-JC1 brainstorm-re-evaluation (R12 reinforcement application): documented inline in spec + audit sidecar.
- Vendoring script sandbox line numbers (vendor-from-deploysignal.sh lines 69-72): verified via file read at HEAD `a75ebc4`.

### Unstated assumptions surfaced and resolved

0. **AC-2 / AC-4 / AC-6 use INEQUALITY bounds rather than equality on contamination counts.** This is a deliberate spec-design choice to avoid the "spec-AC-outrun" anti-pattern (R02/R04/R05 + R09 reinforcement chain): asserting an EXACT contamination count (e.g., `n_ticks_contaminated === 0` on clean fixtures, or `=== 1` on outlier fixtures) requires the Architect to either (a) run fastMCD on the exact fixtures to verify the deterministic outcome OR (b) accept the risk of a brittle assertion. Since the Architect cannot run fastMCD against these fixtures from inside the spec-authoring phase (role boundary: no implementation/test execution), inequality bounds are the architecturally-correct form. The Implementer-side verification at GREEN-commit time produces the OBSERVED count per the R03 MINOR-4 reinforcement; the OBSERVED count is reportable in NEXT-ROLE.md attestation. The inequality bounds (`<= 2`, `>= 1`, `<= 3`, etc.) are sized from MCD's known properties (h=ceil(α·n) trim count + reweight cutoff behavior on clean vs outlier data) — they're tight enough to fail if the algorithm is broken (e.g., MCD off-by-one in fastMCD wouldn't be caught by `<= 8`; it WOULD be caught by `<= 3` on the OUTLIER fixture). NOT a relaxation that hides regressions; a tightening that doesn't require unverifiable specifics.

1. **Test glob coverage of new files.** `tsconfig.test.json:13-15` includes `engine/**/*.ts`, `test/**/*.ts`, AND `tools/**/*.ts`. The vendored `tools/curate-baseline-pipeline.ts` + `tools/calibrators/family-c.ts` + `tools/calibrators/_shared.ts` + Tessera-native `tools/curate-baseline-pre-pass.ts` + new `test/q06-baseline-pre-pass.test.ts` are all auto-covered. Verified explicitly.

2. **Vendoring script handles new directory creation.** `vendor-from-deploysignal.sh:73` (`mkdir -p "$(dirname "$target_abs")"`) creates `tools/calibrators/` automatically during the first Delta 7b vendor. Verified by reading the script.

3. **fastMCD return value semantics.** `fastMCD` returns `FastMCDResult | null`. The pseudocode handles null per D-R06-7. The R06 pre-pass also defensively Choleskys the MCD-returned cov (primitive 3 + Delta 5 pseudocode) — even though fastMCD's internal candidates pass `choleskyLocal`, the explicit re-Cholesky at pre-pass.ts is belt-and-suspenders for marginal-PD edge cases. Documented in Delta 5 pseudocode comments.

4. **Mahalanobis cutoff semantics.** `mahalanobisSqFromL` returns the SQUARED Mahalanobis distance (`d²`, not `d`). `chiSqQuantile975(p)` returns the χ²ₚ 0.975 quantile (the upper-tail cutoff for `d²` under the multivariate normal null). Comparison `d² > cutoff` flags contamination. Verified via vendored family-c.ts function reads.

5. **`BaselineCurationDecision.output_summary` value-type constraint.** The interface (vendored at engine/types/config.ts:240) declares `output_summary: Record<string, number | string | boolean>`. Delta 5's D11 emission uses only `number` and `string` values (n_runs_total: number; mcd_method: string; etc.) — satisfies the constraint. Verified by reading the interface.

6. **Vendor-script idempotency on re-runs.** The script has explicit idempotency comments at lines 21-23. R06's Delta 7a/b/c calls are first-time vendor calls; idempotency is not exercised at R06 but the substrate supports re-vendoring at future re-pin events per SCOPING-MEMO § 9.

7. **The `as any` grep in AC-22 distinguishes executable code from comments.** Per R03 MINOR-2 reinforcement. Pattern `^[^/*]*as any` matches lines whose leading characters (before `as any`) contain no `/` or `*`. Comment lines start with `//` or ` *` (within block comments) and would not match. Verified inline.

### Scope-added audit

The requested R06 work per `coordination/NEXT-ROLE.md` is:
- Stage 1 (toolchain vendoring) — ADDRESSED via Delta 2 + Delta 7a/b/c.
- Stage 2a (per-shard within-window screening) — ADDRESSED via Delta 5 + 13 ACs.
- Stage 3a (calibration handoff) — ADDRESSED via format-typing AC-7 (structural format compatibility).

Required schema substrate (additive enum extension for D11/D12/D13) is in scope per the curation memo § 2 (Stage 2a "Emit as `BaselineCurationDecision` record `D11`").

Required vendoring infrastructure extension (script sandbox + q01 test list extensions) is in scope as a necessary precondition for Stage 1 (the script otherwise rejects tools/ targets per R01 sandbox).

Q-JC1 narrowing (defer calibrate.ts) is a documented architectural deviation surfaced in OQ-1 per the R12 brainstorm-re-evaluation reinforcement; not scope-added.

No additional MINORs or OBS items beyond the operator-set scope. No premature Q-JC4/4a/4b/4c implementation (R07 deferral preserved per R06-SAS-4).

### Implementer-actionability audit

- All 10 file paths and component states explicit in § Component inventory.
- All 8 deltas (Delta 1-8) have concrete pseudocode with full function bodies, import statements, JSDoc text, and case-statement extensions.
- Function naming (`curateBaselinePrePass`), interface naming (`PrePassOpts`, `PrePassResult`), schema extension token (`'D11' | 'D12' | 'D13'`), and constant values (`FASTMCD_DEFAULT_ALPHA = 0.75`, `chiSqQuantile975(p)` cutoff) all explicit.
- TDD ordering specified at Implementer note 4 (two-commit RED → GREEN).
- Verification commands embedded in Implementer notes 1, 2, 4 and ACs 14, 15, 16, 17, 18, 19, 20, 21, 22.
- Hand-trace verification of two screening scenarios (clean degenerate-cov fixture; outlier-injection fixture) embedded at Implementer notes 5 + 6.
- HALT condition (b) — additional tools vendoring beyond R06-SAS-1 — explicitly enumerated with diagnostic-file-name prescription (Implementer note 3 + R06-SAS-1).
- One potentially-ambiguous decision (manifest "Notes" column wording at Delta 6): explicitly documented as Implementer's choice with a suggested default.

### Could the next role act on this artifact with zero clarifying questions?

Yes. The 10 file surfaces are each accompanied by concrete pseudocode (or vendoring-shell-command in the case of vendored files) + verification commands + AC bindings. The architectural decisions (D-R06-1 through D-R06-10) are picked with documented rationale; the Q-JC1 narrowing is surfaced as OQ-1 for John but does NOT block R06 implementation. All HALT conditions are explicit (R06-SAS-1 through R06-SAS-20; each names a specific surface or apparent-need pattern and instructs HALT + DIAGNOSTIC where applicable).

**Grilling verdict: PASS.** Spec is ready for IMPLEMENTER routing.

---
