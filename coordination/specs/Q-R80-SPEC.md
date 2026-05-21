# Q-R80-SPEC.md — 5-family detector visualization + visual identity pass

**Round:** R80 (Phase 4 SLICE 2 round 2 — dashboard polish)
**Tier:** full
**Round-start SHA:** `51a20b8` (HEAD at Architect session entry; `chore(R80 directive): 5-family detector visualization + visual identity; Phase 4 SLICE 2 round 2`). The directive's "8dd061f" reference is one commit earlier (R79 close); the anti-scope diff baseline used by AC-R80-14 is the actual HEAD = `51a20b8` (per the R79 spec's documented convention that the directive-planting commit advances HEAD by one).
**Anti-scope baseline:** `51a20b8`

---

## § 0. Brainstorm (Superpowers Phase 1)

The directive prescribes three deliverables: (1) `tools/build-canned-demos.ts` extension carrying per-window state for all 5 detector families; (2) `demos/demo.html` detectors panel populated for all 5 family rows; (3) visual identity pass (header tagline, CSS variables, print-friendly stylesheet). Halt-condition 8 explicitly authorizes "partial 5-family viz with documented placeholder" if any family is non-trivial to invoke.

The Architect performed claim-then-walk over `engine/types/families/{a,b,c,d,e}.ts` and `engine/detectors/{betting-e-process,family-a-mixture-supermartingale,sequential-mmd,hotelling,spectral,conformal,family-c-betting-e-process,family-c-rff}.ts` to establish each family's invocation surface. Findings:

| Family | Vendored detector(s) | Invocation surface (verified) | Feasible from demo substrate? |
|---|---|---|---|
| A | `betting-e-process.ts`, `family-a-mixture-supermartingale.ts`, `page-cusum.ts` | `freshBettingState()` + `updateBettingState(state, x, baseline_mean, baseline_sigma_squared, alpha)` — scalar input; trivial. Mixture-supermartingale + Page-CUSUM consume `FamilyAPerSignalParams` (compiled). | **YES** for `updateBettingState` (already in use at R71/R79). |
| B | `sequential-mmd.ts` (Tessera maps Family B to sequential-MMD per directive) | `evaluateSequentialMMD()` requires `CompiledConfig` + `FamilyCPerCell.mmd_params` (median bandwidth, baseline-baseline sum, null quantile bootstrap, 11-dim FAMILY_C_SIGNALS vectors). | **NO** — multi-dim calibrated state unavailable in univariate Gaussian-draw demo substrate. |
| C | `hotelling.ts`, `family-c-betting-e-process.ts`, `family-c-rff.ts` | `hotellingT2(r, covariance)` + `evaluateSafeHotelling()` + `evaluateBettingEProcess()` require `FamilyCPerCell.{mean_vector, covariance, cholesky_L, safe_hotelling_params, betting_e_process_params}` (all compile-time calibrated). | **NO** — same reason as Family B. |
| D | `spectral.ts` | `peakACF(y: number[], minLag: number, maxLag: number): { peak; lag }` and `normalizedACF(y: number[], k: number): number` are **STANDALONE EXPORTS** (verified at `engine/detectors/spectral.ts:43,57`); do NOT consume `CompiledConfig`. `evaluateFamilyD()` (full detector) does consume `FamilyDPerSignal`. | **PARTIAL YES** — standalone `peakACF()` callable on any scalar series; semantically misaligned (demo's M_t series is monotone-drift, not oscillation; peakACF on deseasoned monotone produces a non-zero but non-physical value). |
| E | `conformal.ts` | `mahalanobisDistance(r, covariance)` is **STANDALONE EXPORT** (verified at `engine/detectors/conformal.ts:69`); requires multi-dim vector + covariance. `evaluateFamilyE()` consumes `ConformalParams` calibration_scores / weights. | **NO** for `mahalanobisDistance` on demo's scalar M_t (collapses to z-score and overclaims the multivariate semantics); calibration data unavailable. |

### Approaches considered

**Approach 1 — Real invocation across all 5 families.** Construct a synthetic `CompiledConfig` + `FamilyCPerCell` + `FamilyDPerSignal` + `ConformalParams` in `tools/build-canned-demos.ts`; populate baseline_cells via a one-shot calibrator pass over a warm-up sample; feed multi-dim observation vectors per shard per window.

- **Strengths:** dashboard surfaces actual detector arithmetic; future R82+ live-engine work has a substrate to build on.
- **Weaknesses:** multi-dim FAMILY_C_SIGNALS vectors are NOT what the current per-shard univariate Gaussian-draw substrate emits; would require synthesizing 11-dim correlated vectors per shard per window with semantically-meaningful covariance structure; calibration step itself is ~200-500 lines of new logic; risks duplicating engine-internal logic in `tools/`; risks R74 MINOR-5 (spec self-application gate) failures.
- **Hidden assumption:** that constructing a plausible `FamilyCPerCell` in <300 LOC of demo-tooling code is feasible. Refuted — the calibration pipeline (`tools/calibrate.ts` in DeploySignal) is ~2000+ LOC.
- **Risk:** R71 MAJOR-1/2-class narrative-vs-data contradictions (claiming production detector semantics over a substrate that doesn't satisfy the detectors' calibration assumptions).
- **Halt-condition 4 (R61-class architectural-reality discovery) likely to fire** at Implementer-time.

**Approach 2 — Honest placeholder for B/C/D/E.** Keep R79's `det-fam-placeholder` styling for B/C/D/E rows; replace the "(R80)" suffix with a one-line architectural framing (e.g., "Family B — sequential-MMD on multi-dim cells (vendored from DeploySignal; not exercised in this demo's univariate substrate)"). Five rows visible; only A is dynamic.

- **Strengths:** maximally honest; zero risk of overclaim; zero new engine coupling; smallest code surface (~100 LOC addition).
- **Weaknesses:** the dashboard's "5-family visualization" intent (per directive) is only partially realized — operator sees five family labels but no dynamic state for four of them; visual identity pass remains, so R80 still ships a substantive visual deliverable.
- **Hidden assumption:** that the directive's "partial 5-family viz with documented placeholder" carve-out fully covers this case. Directive § halt-condition 8 makes this explicit.

**Approach 3 — Hybrid: real Family A; demo-substrate synthetic proxy for B/C/D/E with cite-then-verify labeling.** Family A: existing real `updateBettingState` invocation (no change). Families B, C, E: derive a synthetic per-window summary statistic from the demo's M_t series, clearly labeled in JSON + dashboard (e.g., "demo-substrate proxy"). Family D: invoke the **real** standalone `peakACF()` on the highest-wealth shard's M_t series (peakACF is a standalone export that does NOT require `CompiledConfig`); label as "real peakACF over deseasoned M_t series — production Family D consumes per-signal calibrated bootstrap_null_quantile and operates on a different signal class."

- **Strengths:** five families appear in dashboard with discriminating per-window state; A invocation real; D invocation real (standalone fn); B/C/E proxies clearly labeled. Pedagogically interesting: hierarchical-evalue scenario shows Family B and Family C diverge (Family C fleet-relative sees nothing; Family B individual-deviation sees lots).
- **Weaknesses:** proxies may mislead operators who skim the panel without reading the derivation label; cross-section consistency burden is non-trivial (label must appear in JSON, tooltip, and `<details>` for each B/C/E row).
- **Hidden assumption:** that synthetic proxies labeled with explicit derivation strings honor R71 MAJOR-1/2 (no pre-authored empirical claims) — they DO so long as the derivation string is verified by tracing the formula at spec-emit time and the proxy value is NOT cited in narrative `reasoning` strings as anything other than "demo-substrate proxy."
- **Risk:** AC-R77-14-class forward-protection regressions if R80 inadvertently imports engine functions that introduce new edges into the test surface (mitigated by only importing `peakACF` from `engine/detectors/spectral.js`, which is already in the vendored tree and adds no new external dependency).

### Selection rationale

**Approach 3 picked** as the best tradeoff because:
1. The directive's intent ("5 detector group rows … current state (firing/clean/accumulating); detector-specific summary metric") favors dynamic per-family state over static placeholders.
2. Halt-condition 8 reads "partial 5-family viz with documented placeholder ACCEPTABLE" — i.e., partial is acceptable but full is preferred when achievable safely.
3. The hybrid avoids R71 MAJOR-1/2 (overclaim) by labeling proxies explicitly; avoids R61-class architectural-reality discovery (Approach 1) by NOT constructing a synthetic `CompiledConfig`; honors zero-new-deps + zero-engine-modification anti-scope.
4. `peakACF` is the only standalone-feasible real detector call; using it for Family D delivers one more "real" family beyond A. This is documented honestly in the family D row's derivation string.
5. Visual identity pass (header tagline + CSS variables + `@media print`) lands independently of the family-state design.

**Approach 1 rejected** because constructing a faithful `CompiledConfig + FamilyCPerCell + FamilyDPerSignal + ConformalParams` in demo tooling code would either (a) blow past scope and require ~500+ LOC of calibrator logic, or (b) ship a degenerate `CompiledConfig` that the detectors would refuse to consume (Cholesky factorization failures on rank-deficient demo covariance), triggering halt-condition 4.

**Approach 2 rejected** in favor of Approach 3 because the cost of one additional real invocation (Family D's `peakACF`) and three labeled proxies is small and operationally observable.

---

## § 1. Design phase (Superpowers Phase 2)

### 1.1 Component boundaries

**Exists** (unchanged at R80):
- `engine/detectors/betting-e-process.ts` — already imported by `tools/build-canned-demos.ts`; provides `freshBettingState` + `updateBettingState`.
- `engine/detectors/spectral.ts` — vendored; `peakACF` is a standalone export (verified at `engine/detectors/spectral.ts:57`).
- `engine/detectors/sequential-mmd.ts`, `engine/detectors/hotelling.ts`, `engine/detectors/conformal.ts` — vendored; NOT imported at R80 (full detector entry points require calibrated state unavailable in demo substrate).
- `engine/topology/common-mode-attribution.ts` + `engine/ds-integration/*` + `engine/per-shard/*` + `engine/fleet/*` — already imported by `tools/build-canned-demos.ts`; unchanged at R80.
- R79 dashboard structural elements (`live-verdict-banner`, `metrics-panel`, `detectors-panel`, `provenance-panel`, `det-fam-A..E` rows) — preserved.
- R79 top-level schema fields (`detector_families`, `threshold_crossing_log`, `provenance_receipts`) — preserved; values extended per § 1.3.

**Created** (R80-new):
- `test/q80-five-family-visualization.test.ts` — TDD RED-first file binding 14 ACs.
- `coordination/specs/Q-R80-SPEC.md` + `Q-R80-SPEC-AUDIT.md` + `Q-R80-EMPIRICAL.sh` — this commit.
- `coordination/reviews/REVIEWER-REPORT-R80.md` — created by Reviewer at audit time.

**Changes** (R80-modified):
- `tools/build-canned-demos.ts` — extension:
  - Import `peakACF` from `../engine/detectors/spectral.js`.
  - Extend `PerWindowDetectors` interface: `family_b/c/d/e` types change from `null` to `FamilyBCDEWindowDetectors | null`.
  - Extend `FamilyBCDEWindowDetectors` to a uniform `{ statistic: number, threshold: number, fired: boolean, derivation: string }` shape.
  - Modify each Family-A-active scenario function (clean-baseline, sdc-drift, fdr-multiple-testing, hierarchical-evalue) to populate all 5 families' per-window state. Attribution scenarios (common-mode-rack, sparse-data-resilience, topology-spanning-common-mode, event-conditional) keep `NULL_PER_WINDOW_DETECTORS` per R79 pattern.
  - Update top-level `detector_families` semantics: previously `['A']` for Family-A scenarios; now `['A','B','C','D','E']` for Family-A scenarios (additive extension; type unchanged; AC-R79-7's "array[A-E]" assertion still passes).
  - Replace `HTML_TEMPLATE_HEAD` CSS section with CSS-variables-based styling + `@media print` block + header tagline.
  - Replace `<header>` content with tagline subtitle.
  - Extend embedded JS `renderDetectorsPanel()` to populate B/C/D/E rows from per-window state + add per-row `title` tooltip carrying the derivation string.
- `demos/demo.html` — regenerated by build tool (do NOT hand-edit).
- `demos/scenarios/*.json` (× 8) — regenerated by build tool.
- `package.json` — OPTIONAL; no new deps.
- `README.md` — OPTIONAL; ≤ 15 added lines.

**Deletes:** none.

### 1.2 Layout architecture (Architect-picked; Implementer does NOT re-decide)

The R79 layout is preserved. R80 ONLY changes the contents of the detectors panel rows (lines 1219-1224 of `tools/build-canned-demos.ts` HTML_TEMPLATE_HEAD) and adds:
- CSS variables block at top of `<style>` (`:root { --tessera-* : ...; }`).
- Header tagline subtitle inside `<header id="tessera-header">` after the `<h1>` (a `<p class="tessera-tagline">` element).
- `@media print` block at bottom of `<style>`.
- Per-family `title` attributes on each `.det-fam-A..E` div (one-line derivation string).
- A `<details>` "Detector math context" expandable panel inside each `.det-fam-A..E` div (collapsed by default; contains derivation paragraph).

### 1.3 Schema additions (R80 — strictly additive over R79)

**Interface additions in `tools/build-canned-demos.ts`:**

```ts
interface FamilyBCDEWindowDetectors {
  statistic: number;
  threshold: number;
  fired: boolean;
  derivation: string;  // single-line explanation; rendered as `title` tooltip
}

interface PerWindowDetectors {  // R80 extends R79 nullable fields
  family_a: FamilyAWindowDetectors | null;
  family_b: FamilyBCDEWindowDetectors | null;
  family_c: FamilyBCDEWindowDetectors | null;
  family_d: FamilyBCDEWindowDetectors | null;
  family_e: FamilyBCDEWindowDetectors | null;
}
```

**Top-level `detector_families` value extension** (R80):
- Family-A-active scenarios (`clean-baseline`, `sdc-drift`, `fdr-multiple-testing`, `hierarchical-evalue`) now emit `detector_families: ['A','B','C','D','E']` (was `['A']` at R79).
- Attribution scenarios (`common-mode-rack`, `event-conditional`, `sparse-data-resilience`, `topology-spanning-common-mode`) keep `detector_families: []` (unchanged from R79).

**Schema-version invariant:** `schema_version` stays `'tessera-demo-v1'`. Not bumped. AC-R79-7 + AC-R79-10 + AC-R71-13 continue to pass.

### 1.4 Architect pre-prediction table

| Metric | At R80 round-start `51a20b8` (pre-Implementer) | At R80 chore-A (post-Implementer) |
|---|---|---|
| `pnpm exec tsc -p tsconfig.test.json` exit | `0` | `0` |
| `node --test --test-reporter=tap test/*.test.js` `# tests` | `594` (R79 close baseline) | `594 + 14 = 608` |
| same: `# pass` | `582` | `582 + 14 - 2 = 594` (AC-R79-8 + AC-R79-14 forward-protection flips from PASS to FAIL) |
| same: `# fail` | `8` (carry-forward 6 + AC-R78-14 + AC-R77-14) | `10` (above + AC-R79-8 + AC-R79-14 forward-protection flips) |
| same: `# skipped` | `4` | `4` |
| process exit code | `0` (node --test exits 0 with subtest failures) | `0` |
| `bash Q-R80-EMPIRICAL.sh` exit | `1` (Block 2 fails — test file absent; Block 3 fails — fail count 8 ≠ expected 10) | `0` (all 4 blocks pass) |
| `git diff 51a20b8 HEAD --name-only` line count | `0` | `9-15` (R80 deliverables) |

**Discriminating-AC threshold padding** (per R77 MINOR-4): `# pass` predicted 594; AC-R80-13 binding accepts `[592, 596]` (±2 = ≥ 1 trial padding). `# fail` predicted 10; AC-R80-13 binding accepts exactly `10` (binary; padding via Block 3 EXPECTED_FAIL `=` enforces strict equality, per R53 MINOR-1 + R56 MINOR-1 two-state distinction).

**Forward-protection-AC audit (R79 reinforcement; exhaustive across all prior rounds' frozen-surface tests):**
- R71 anti-scope tests: no AC-R71-N has a `git diff` anti-scope assertion (R71 was MVP; no forward-protection test). AC-R71-3 byte-identity check: deterministic build tool; PASS.
- R72 AC-R72-19 (R71 SCENARIO_NAMES anti-regression): R80 keeps `SCENARIO_NAMES` at 8 names. PASS.
- R73-R76 anti-scope tests: did not freeze `demos/*` or `tools/build-canned-demos.ts`; if their frozen-paths include any path R80 modifies, they'd flip. (R73-R76 froze meta-tooling: `scripts/tier-router.ts`, `scripts/mu-model-select.ts`, etc. — none R80 touches.)
- R77 AC-R77-14 (`tools/build-canned-demos.ts` in frozen-paths): **already failing since R79**; carry-forward — does NOT increase fail count at R80.
- R77 AC-R77-17 (R77 anti-scope diff): R77 regex excludes `demos/*` and `tools/*` (other than detector-envelope/detection-curve); R79 already flipped this if it had not flipped already. (R79's # fail = 8 includes both AC-R77-14 and AC-R78-14.)
- R78 AC-R78-14 (R78 anti-scope diff): **already failing since R79**; carry-forward.
- R79 AC-R79-14 (R79 anti-scope diff): R79's regex includes `coordination/diagnostics/DIAGNOSTIC-R[0-9]+-.*\.md`, `CLAUDE-*\.md`, `coordination/logs/ROUND-R[0-9]+-.*\.md` (forward-protective) BUT hardcodes `coordination/specs/Q-R79-*`, `coordination/reviews/REVIEWER-REPORT-R79\.md`, `test/q79-dashboard-structure\.test\.ts`. R80 adds `test/q80-*.ts`, `Q-R80-*`, `REVIEWER-REPORT-R80.md` — these are NOT in R79's regex. **AC-R79-14 flips from PASS to FAIL at R80 chore-A.**
- R79 AC-R79-8 (literal-null assertion on `family_b/c/d/e`): R79's test body (verified at `test/q79-dashboard-structure.test.ts:117-120`) asserts `pwd.family_b === null` AND `pwd.family_c === null` AND `pwd.family_d === null` AND `pwd.family_e === null` for EVERY window of EVERY scenario. R80 populates these slots with non-null `FamilyBCDEWindowDetectors` objects in Family-A-active scenarios per the directive's "5-family detector visualization" mandate. **AC-R79-8 flips from PASS to FAIL at R80 chore-A.**

Net new flips at R80 chore-A: **+2 (AC-R79-14 + AC-R79-8)**. Predicted `# fail` = 10 (vs. R79 close `# fail` = 8).

### 1.5 Failure modes at each integration point

| Integration | Failure mode | Detection |
|---|---|---|
| `import { peakACF } from '../engine/detectors/spectral.js'` | spectral.js compiled output is stale or absent at chore-A; runtime import fails | `pnpm exec tsc -p tsconfig.test.json` exits 0 only after `tsc` produces the compiled `.js`; pre-existing R71 build flow handles this. |
| `peakACF` called with `y.length < min_peak_lag + 1` | returns `{ peak: 0, lag: minLag }` (verified at `engine/detectors/spectral.ts:57-65`); proxy synthesizes Family D state as `fired: false` | Family D proxy logic at § 4.1 handles short series by setting `statistic: 0` + `fired: false` (graceful). |
| `Math.max(...M_t_array)` on empty per-shard array | `-Infinity` — invalid for JSON serialization | Family-A scenarios always have ≥1 shard; verified at § 9.6 self-application gate. |
| Family-B/C/E proxy statistic NaN or Infinity (e.g., σ_fleet = 0 in clean-baseline window 0) | JSON serialization of NaN/Infinity violates JSON spec | Proxy implementations guard against σ=0 by `Math.max(σ, 1e-6)` (Family E denominator); Family B + C use additive formulas that cannot produce NaN unless M_t is NaN (R71 baseline guards). |
| CSS variable name conflicts with browser-default custom-property names | none — `--tessera-*` namespace prefix avoids the `--moz/--webkit/--ms` reserved prefixes | Namespace verified by the W3C custom-property syntax (`--`-prefix is user-defined; vendor properties use `-moz-/-webkit-/`...). |
| `@media print` block prematurely closes the outer `<style>` block | spec pseudocode at § 4.1 places the `@media print` block ENTIRELY inside the existing `<style>` block; not at file-scope | § 9.4 self-application gate verifies. |
| New `<details>` per-detector panels duplicate the R79 `<details id="provenance-panel">` ID | duplicate IDs invalid HTML; R79's `provenance-panel` is the only `id="provenance-panel"` | R80's per-detector `<details>` elements have NO `id` attribute (only the outer det-fam-X `<div>` has class-based identification). Verified at § 9.5. |
| Anti-scope regex test at AC-R80-14 unduly broad → silently accepts unauthorized paths | use strict `^...$` anchors + explicit literals per R44 MINOR-3 / R46 MINOR-1+2 | § 4.4 EMPIRICAL.sh ALLOWED regex pattern audited at § 9.4. |
| R71 AC-R71-13 (HTML inlined JSON ≡ JSON files) fails because R80's JSON has different keys than HTML embeds | R71 AC-R71-13 round-trips JSON via `JSON.parse` ≡ `JSON.parse(filecontents)` — same JSON serialization both sides | Build tool serializes once and inlines verbatim; round-trip identity preserved. Verified at § 9.6. |

### 1.6 Visual identity decisions (Architect-picked)

- **Color palette (CSS variables):** keep R79's dark theme (`#0d1117` background, `#e6edf3` foreground), unify via `--tessera-*` variables. Family accent colors (already in R79 CSS for `.det-fam-A..E` left-border colors): A blue `#58a6ff`, B green `#3fb950`, C purple `#a371f7`, D orange `#d29922`, E coral `#f78166`. Slate/teal accent for header banner: `--tessera-accent-slate: #58a6ff` (preserves R79 blue accent).
- **Typography (vanilla; no web fonts per anti-scope):** mono = `'SF Mono', Menlo, Consolas, monospace`; sans = `system-ui, -apple-system, sans-serif`. Already partially used in R79; R80 lifts to CSS variables `--tessera-font-mono` + `--tessera-font-sans`.
- **Header tagline:** `<p class="tessera-tagline">Per-shard observation for AI clusters — statistically-rigorous fleet-FPR guarantees over canned scenarios</p>`. Verbatim string; AC-R80-10 binds.
- **Print stylesheet (`@media print`):** force monochrome background; expand all `<details>` open; hide `#tessera-controls`; preserve all panel content for printout review. Minimal block (~15-20 lines CSS).

---

## § 2. Mechanism — load-bearing architectural decisions

### 2.1 Family-state derivation formulas (Architect-picked; Implementer copies verbatim)

In Family-A-active scenarios (`clean-baseline`, `sdc-drift`, `fdr-multiple-testing`, `hierarchical-evalue`), per-window state for each family is derived from the existing `states[s].M` (Family A wealth) per-shard array. Let `m[i]` = `states[i].M` at window w, S = number of shards in the scenario.

**Family A** (REAL detector state, current R79 schema; unchanged):
```ts
family_a: {
  shards_fired_count: number of i where m[i] >= DEMO_THRESHOLD,
  max_M_t: round6(max(m[i])),
  fired_shard_ids: shardIds[i] for i where m[i] >= DEMO_THRESHOLD, sorted,
}
```

**Family B** (SYNTHETIC dispersion proxy — labeled):
```ts
family_b: {
  statistic: round6(max over i of |m[i] - 1|),    // max-deviation from H_0 mean
  threshold: 1.0,                                  // illustrative; demo-substrate boundary
  fired: max over i of |m[i] - 1| > 1.0,
  derivation: 'demo-substrate proxy: max|M_t − 1| across shards (production Family B = sequential-MMD over multi-dim FAMILY_C_SIGNALS windows; not invoked here)',
}
```

**Family C** (SYNTHETIC fleet-relative joint-drift proxy — labeled):
```ts
let fleet_mean = (1/S) * sum(m[i]);
let sumsq = sum((m[i] - fleet_mean)^2);
family_c: {
  statistic: round6(sumsq),
  threshold: 1.0,
  fired: sumsq > 1.0,
  derivation: 'demo-substrate proxy: Σ_i (M_t,i − fleet_mean)² (production Family C = Hotelling T² + safe-test betting + RFF over FamilyCPerCell-calibrated cells; not invoked here)',
}
```

**Family D** (REAL `peakACF` on highest-wealth shard's M_t series — labeled):
```ts
// At window w, take the shard with the highest current M_t.
// Build its M_t history from window 0 through w.
let topShard = argmax over i of m[i];
let series = windows[0..w].per_shard[topShard].M_t (array of length w+1);
let result = peakACF(series, 3, 10);  // standalone export from spectral.js
family_d: {
  statistic: round6(result.peak),
  threshold: 0.6,                                  // illustrative; production uses bootstrap_null_quantile
  fired: result.peak > 0.6,
  derivation: 'real engine peakACF() over the highest-wealth shard\'s M_t series (production Family D consumes per-signal bootstrap_null_quantile from FamilyDPerSignal and targets oscillation periods 3-10 ticks)',
}
```

When `series.length < 4` (i.e., window 0 through 2, with min_peak_lag=3): `peakACF` returns `{ peak: 0, lag: 3 }` per its internal guard (verified at `engine/detectors/spectral.ts:57-65` — the `for` loop `for (let k = minLag; k <= cap; k++)` with `cap = Math.min(maxLag, y.length - 1)` produces no iterations when `y.length - 1 < minLag`, so peak stays 0). Family D state populates with `statistic: 0, fired: false` for the first ≤ 3 windows.

**Family E** (SYNTHETIC max-z-score fleet-relative proxy — labeled):
```ts
let fleet_mean = (1/S) * sum(m[i]);
let fleet_sigma = sqrt((1/S) * sum((m[i] - fleet_mean)^2));
let max_z = max over i of |m[i] - fleet_mean| / Math.max(fleet_sigma, 1e-6);
family_e: {
  statistic: round6(max_z),
  threshold: 3.0,                                  // illustrative; 3-sigma equivalent
  fired: max_z > 3.0,
  derivation: 'demo-substrate proxy: max fleet-z-score |M_t,i − μ_fleet| / σ_fleet (production Family E = multi-dim Mahalanobis vs ConformalParams.calibration_scores; not invoked here)',
}
```

**Architect verification of per-formula semantics** (claim-then-walk):
- For `clean-baseline` terminal window (w=29): all `m[i]` ≈ 1.0 ± stochastic noise; Family B max|m[i]-1| ≈ 0.3-3.0 (under H_0 PRNG variation); Family C sumsq small (fleet mean ≈ 1.0; squared deviations small); Family D peakACF on a noise series ≈ 0.1-0.4 (below 0.6 threshold); Family E max_z ≈ 1-3 (depends on per-window dispersion). **Predicted Family-A-scenario clean-baseline terminal state: B+C+E fired = false-or-near-boundary; D fired = false; A fired_shards = 0.**
- For `sdc-drift` terminal window (w=29): shard-04 `m[4]` ≥ 200 (threshold; AC-R79-11 binds); other shards `m[i]` ≈ 1.0. Family B max|m[i]-1| ≥ 199 (HUGE, far above 1.0 threshold). Family C sumsq ≈ (199 - 1)² × scenarios with one outlier = ~39_000 (HUGE). Family E max_z = 198 / sqrt(variance over 10 shards) ≈ 198 / 63 ≈ 3.1 (just above 3.0). Family D peakACF on monotone-rising deseasoned M_t = moderate (~0.5-0.8; depends on PRNG path; not predictable to ±0.1 without empirical probe). **Predicted: B + C + E fired = true; D fired possibly true.**

### 2.2 detector_families field semantics (additive value extension)

R79 used `detector_families: ['A']` to mean "Family A's `per_window_detectors.family_a` is non-null." R80 extends to `['A','B','C','D','E']` for Family-A scenarios because R80 populates non-null state for ALL 5 families in those scenarios. Attribution scenarios keep `[]` because no per-window family state is populated.

**Backward-compat invariant:** R79 ACs that check `detector_families: array[A-E]` (AC-R79-7) accept any subset of `['A','B','C','D','E']`; R79 AC-R79-8 (`family_a non-null iff scenario detector_families includes 'A'`) holds because R80 ensures `'A'` ∈ `detector_families` iff `family_a !== null`. R80 ADDITIONALLY requires `'X'` ∈ `detector_families` iff `family_x !== null` for X ∈ {B,C,D,E} (AC-R80-3 binds).

### 2.3 Visual identity (load-bearing)

CSS variables block (verbatim; Implementer pastes into the `<style>` block at HTML_TEMPLATE_HEAD top):

```css
:root {
  --tessera-bg:               #0d1117;
  --tessera-bg-elevated:      #161b22;
  --tessera-bg-control:       #21262d;
  --tessera-fg:               #e6edf3;
  --tessera-fg-emphasis:      #f0f6fc;
  --tessera-fg-muted:         #8b949e;
  --tessera-fg-comment:       #6e7681;
  --tessera-border:           #30363d;
  --tessera-border-strong:    #21262d;
  --tessera-accent-blue:      #58a6ff;
  --tessera-accent-teal:      #79c0ff;
  --tessera-accent-slate:     #c9d1d9;
  --tessera-status-clean:     #3fb950;
  --tessera-status-fire:      #f78166;
  --tessera-status-warn:      #d29922;
  --tessera-status-info:      #58a6ff;
  --tessera-status-frozen:    #79c0ff;
  --tessera-status-fdr:       #a371f7;
  --tessera-fam-a:            #58a6ff;
  --tessera-fam-b:            #3fb950;
  --tessera-fam-c:            #a371f7;
  --tessera-fam-d:            #d29922;
  --tessera-fam-e:            #f78166;
  --tessera-font-mono:        'SF Mono', Menlo, Consolas, monospace;
  --tessera-font-sans:        system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
}
```

Header tagline (verbatim; Implementer renders inside `<header id="tessera-header">` after the existing `<h1>`):

```html
<p class="tessera-tagline">Per-shard observation for AI clusters — statistically-rigorous fleet-FPR guarantees over canned scenarios</p>
```

Print stylesheet (verbatim; appended inside the existing `<style>` block, after all other rules and before `</style>`):

```css
@media print {
  body { background: #ffffff; color: #000000; }
  #tessera-controls { display: none; }
  #live-verdict-banner { background: #f5f5f5; color: #000000; border-color: #999999; }
  .det-fam, .provenance-receipt { background: #ffffff; color: #000000; border-color: #999999; }
  details { display: block; }
  details > summary { cursor: default; }
  details[open] > summary,
  details > *:not(summary) { display: block; }
}
```

The `@media print` block forces collapse-toggle to be visually expanded for printout but does NOT modify the `<details>` element's runtime HTML semantics (no `open` attribute added; R79 AC-R79-5's `<details>` collapse-default check continues to pass against the committed HTML).

---

## § 3. Component inventory + ALLOWED_SET

### 3.1 Component inventory (matches § 1.1 boundaries; explicit per-row)

| Path | State at R80 round-start `51a20b8` | R80 action | AC binding |
|---|---|---|---|
| `engine/*` | vendored at SHA `5a72371`; frozen | NO modification | implicit via AC-R80-14 (anti-scope diff excludes `engine/*`) |
| `tools/build-canned-demos.ts` | R79 state — Family A active; B/C/D/E null | EXTEND additively (new interface fields; new helper fns; updated per-scenario population; new HTML/CSS) | AC-R80-1, -2, -3, -4, -5, -6, -7, -8, -9, -10, -11 (indirect via regenerated outputs) |
| `demos/demo.html` | R79 state — placeholder rows for B/C/D/E | REGENERATED by build tool; do NOT hand-edit | AC-R80-1, -9, -10, -11 (direct grep on file content) |
| `demos/scenarios/*.json` (× 8) | R79 state — `detector_families: ['A']` for 4 scenarios; `family_b/c/d/e: null` everywhere | REGENERATED by build tool; additive only | AC-R80-3, -4, -5, -6, -7, -8 (direct content checks) |
| `package.json` | R71+R79 state | OPTIONAL modification — Implementer may add scripts if useful; NO new deps | implicit via AC-R80-14 ALLOWED_SET inclusion |
| `README.md` | R71+R78+R79 state | OPTIONAL — ≤ 15-line additive Coverage / Quick demo note | implicit via AC-R80-14 ALLOWED_SET inclusion |
| `test/q80-five-family-visualization.test.ts` | does not exist | NEW; TDD RED-first per R23 IMPL MINOR-1 (RED commit before GREEN) | AC-R80-1 through AC-R80-14 (the test file IS the AC bindings) |
| `coordination/specs/Q-R80-SPEC.md` | this file (NEW; this commit) | this Architect commit | implicit (committed before chore-A) |
| `coordination/specs/Q-R80-SPEC-AUDIT.md` | NEW; this commit | this Architect commit | implicit |
| `coordination/specs/Q-R80-EMPIRICAL.sh` | NEW; this commit | this Architect commit | AC-R80-13 (binding-command attestation block presence) |
| `coordination/reviews/REVIEWER-REPORT-R80.md` | does not exist | NEW; Reviewer | implicit via AC-R80-14 ALLOWED_SET inclusion |
| `coordination/NEXT-ROLE.md` | R79 state + R80 directive | appended per role | implicit via AC-R80-14 |
| `coordination/MEMORIAL.md` | active phase shard | appended per role | implicit via AC-R80-14 |
| `coordination/logs/ROUND-R80-{ROUTING,SUMMARY}.md` | does not exist | pipeline-emitted | implicit via AC-R80-14 |
| `coordination/diagnostics/DIAGNOSTIC-R80-*.md` | does not exist | created only on halt | implicit via AC-R80-14 |
| `CLAUDE-*.md` files | repo-rooted | Memorial-Updater may append REINFORCED lines | implicit via AC-R80-14 |

### 3.2 ALLOWED_SET regex (machine-checkable; used by EMPIRICAL.sh Block 4 and AC-R80-14)

```
^(demos/demo\.html|demos/scenarios/[a-z-]+\.json|tools/build-canned-demos\.ts|package\.json|README\.md|test/q80-five-family-visualization\.test\.ts|coordination/specs/Q-R80-SPEC\.md|coordination/specs/Q-R80-SPEC-AUDIT\.md|coordination/specs/Q-R80-EMPIRICAL\.sh|coordination/NEXT-ROLE\.md|coordination/MEMORIAL\.md|coordination/MEMORIAL-PHASE-[0-9]+\.md|coordination/reviews/REVIEWER-REPORT-R80\.md|coordination/logs/ROUND-R[0-9]+-(SUMMARY|ROUTING)\.md|coordination/diagnostics/DIAGNOSTIC-R[0-9]+-.*\.md|CLAUDE\.md|CLAUDE-ARCHITECT\.md|CLAUDE-IMPLEMENTER\.md|CLAUDE-REVIEWER\.md|CLAUDE-MEMORIAL\.md|CLAUDE-COMMON\.md|CLAUDE-COORDINATOR\.md)$
```

Anchored `^...$` per R44/R46 discriminating-regex reinforcement. Forward-protective entries (`diagnostics/DIAGNOSTIC-R[0-9]+-...`, `logs/ROUND-R[0-9]+-...`) match any round number so a follow-up round's diagnostic does not retroactively flip AC-R80-14.

---

## § 4. Per-file pseudocode

### 4.1 `tools/build-canned-demos.ts` extensions

Per R79 spec convention, the Implementer reads R79's existing file in full and pastes new additions at the indicated insertion points. Tactical details (variable names inside helper functions; exact line numbers) remain at Implementer discretion per the role boundary; structural prescriptions (interface field names, exported types, AC-bound regex content) are load-bearing and copied verbatim.

#### 4.1.1 New import (top of file, alongside existing engine imports)

```ts
import { peakACF } from '../engine/detectors/spectral.js';
```

This is the ONLY new engine import. The function signature is `peakACF(y: number[], minLag: number, maxLag: number): { peak: number; lag: number }` — verified at `engine/detectors/spectral.ts:57`.

#### 4.1.2 Interface extension (replacing R79's `PerWindowDetectors` shape)

```ts
// R80: Family B/C/D/E now populated for Family-A-active scenarios.
interface FamilyBCDEWindowDetectors {
  statistic: number;
  threshold: number;
  fired: boolean;
  derivation: string;
}

interface PerWindowDetectors {
  family_a: FamilyAWindowDetectors | null;
  family_b: FamilyBCDEWindowDetectors | null;
  family_c: FamilyBCDEWindowDetectors | null;
  family_d: FamilyBCDEWindowDetectors | null;
  family_e: FamilyBCDEWindowDetectors | null;
}
```

#### 4.1.3 New helper functions (added above `composeScenarioJson`)

```ts
// R80 — Family B/C/D/E synthetic derivation helpers.
// Inputs are the per-shard M_t array at one window plus the historical
// M_t series for the highest-wealth shard up through that window (for
// Family D's peakACF call). Outputs are the four FamilyBCDEWindowDetectors.

function deriveFamilyBState(m: number[]): FamilyBCDEWindowDetectors {
  let max_dev = 0;
  for (const v of m) {
    const d = Math.abs(v - 1);
    if (d > max_dev) max_dev = d;
  }
  return {
    statistic: round6(max_dev),
    threshold: 1.0,
    fired: max_dev > 1.0,
    derivation: 'demo-substrate proxy: max|M_t − 1| across shards (production Family B = sequential-MMD over multi-dim FAMILY_C_SIGNALS windows; not invoked here)',
  };
}

function deriveFamilyCState(m: number[]): FamilyBCDEWindowDetectors {
  const S = m.length;
  let mean = 0;
  for (const v of m) mean += v;
  mean /= S;
  let sumsq = 0;
  for (const v of m) sumsq += (v - mean) * (v - mean);
  return {
    statistic: round6(sumsq),
    threshold: 1.0,
    fired: sumsq > 1.0,
    derivation: 'demo-substrate proxy: Σ_i (M_t,i − fleet_mean)² (production Family C = Hotelling T² + safe-test betting + RFF over FamilyCPerCell-calibrated cells; not invoked here)',
  };
}

function deriveFamilyDState(topShardSeries: number[]): FamilyBCDEWindowDetectors {
  // peakACF guards internally against short series (cap = min(maxLag, y.length-1));
  // returns { peak: 0, lag: 3 } when y.length-1 < 3 (i.e., series.length < 4).
  const result = peakACF(topShardSeries, 3, 10);
  return {
    statistic: round6(result.peak),
    threshold: 0.6,
    fired: result.peak > 0.6,
    derivation: 'real engine peakACF() over the highest-wealth shard\'s M_t series (production Family D consumes per-signal bootstrap_null_quantile from FamilyDPerSignal and targets oscillation periods 3-10 ticks)',
  };
}

function deriveFamilyEState(m: number[]): FamilyBCDEWindowDetectors {
  const S = m.length;
  let mean = 0;
  for (const v of m) mean += v;
  mean /= S;
  let var_sum = 0;
  for (const v of m) var_sum += (v - mean) * (v - mean);
  const sigma = Math.sqrt(var_sum / S);
  const denom = Math.max(sigma, 1e-6);
  let max_z = 0;
  for (const v of m) {
    const z = Math.abs(v - mean) / denom;
    if (z > max_z) max_z = z;
  }
  return {
    statistic: round6(max_z),
    threshold: 3.0,
    fired: max_z > 3.0,
    derivation: 'demo-substrate proxy: max fleet-z-score |M_t,i − μ_fleet| / σ_fleet (production Family E = multi-dim Mahalanobis vs ConformalParams.calibration_scores; not invoked here)',
  };
}
```

#### 4.1.4 Per-scenario population (modify the 4 Family-A-active scenario functions)

In each of `runCleanBaselineRecording`, `runSdcDriftRecording`, `runFdrMultipleTestingRecording`, `runHierarchicalEvalueRecording`:

Inside the existing per-window loop, after the existing Family A `family_a` object construction, REPLACE the trailing `family_b: null, family_c: null, family_d: null, family_e: null` literal with:

```ts
// R80 — derive Family B/C/D/E synthetic states from the per-shard m array.
const m = states.map(st => st.M);
// Highest-wealth shard's series through this window (for Family D peakACF).
const topShardIdx = m.indexOf(Math.max(...m));
const topShardSeries: number[] = [];
for (let prevW = 0; prevW <= w; prevW++) {
  const prev = prevW < windows.length ? windows[prevW].per_shard[topShardIdx].M_t : states[topShardIdx].M;
  if (prev !== null) topShardSeries.push(prev);
}
// (At the current window w, push the live m[topShardIdx] as the last entry.)
if (topShardSeries.length === 0 || topShardSeries[topShardSeries.length - 1] !== m[topShardIdx]) {
  topShardSeries.push(m[topShardIdx]);
}
// Family B/C/E derive from current-window m only; Family D needs history.
const family_b = deriveFamilyBState(m);
const family_c = deriveFamilyCState(m);
const family_d = deriveFamilyDState(topShardSeries);
const family_e = deriveFamilyEState(m);
```

And update the `windows.push(...)` block's `per_window_detectors` object to use these four new objects in place of the four `null` literals.

Additionally, update each Family-A-active scenario's `composeScenarioJson` call:
```ts
detector_families: ['A', 'B', 'C', 'D', 'E'],
```
(R79 had `['A']`. R80 changes to all 5 letters for Family-A scenarios. Attribution scenarios keep `[]`.)

#### 4.1.5 HTML template extensions (modify `HTML_TEMPLATE_HEAD` + `HTML_TEMPLATE_FOOTER`)

In `HTML_TEMPLATE_HEAD`, prepend the CSS-variables block (verbatim from § 2.3) inside the existing `<style>` tag as the FIRST rule (before the universal selector `*, *::before, *::after { box-sizing: border-box; ... }`).

Append the `@media print` block from § 2.3 inside the existing `<style>` tag as the LAST rule (before `</style>`).

After the existing `<h1>Tessera Demo</h1>` line in `<header id="tessera-header">`, INSERT the tagline `<p class="tessera-tagline">` from § 2.3.

Replace the 5 hardcoded `<div class="det-fam det-fam-{A,B,C,D,E} ...">` lines in `<div id="detectors-body">` with the same 5 divs but WITHOUT the `det-fam-placeholder` class on B/C/D/E (those will be populated dynamically). Each div retains its `.det-fam` and `.det-fam-X` classes; no class additions or removals beyond `det-fam-placeholder` removal.

The CSS rule `.det-fam-placeholder { color: #6e7681; font-style: italic; }` STAYS — it is retained as a CSS-only style hook for future use; the class itself is no longer applied to any committed HTML element at R80 chore-A.

#### 4.1.6 Embedded JS extension — `renderDetectorsPanel`

Replace R79's `renderDetectorsPanel` function (which only handles Family A) with a generalized version that handles all 5 families:

```js
function renderDetectorsPanel(scenarioData, windowIdx) {
  var famA = detectorsBodyEl.querySelector('.det-fam-A');
  var famB = detectorsBodyEl.querySelector('.det-fam-B');
  var famC = detectorsBodyEl.querySelector('.det-fam-C');
  var famD = detectorsBodyEl.querySelector('.det-fam-D');
  var famE = detectorsBodyEl.querySelector('.det-fam-E');
  if (!famA) return;
  var wIdx = Math.min(windowIdx, scenarioData.windows.length - 1);
  var w = scenarioData.windows[wIdx];
  var pwd = w && w.per_window_detectors ? w.per_window_detectors : null;

  // Family A — current schema; preserved verbatim from R79.
  var a = pwd ? pwd.family_a : null;
  if (a === null || a === undefined) {
    famA.textContent = 'Family A — (not exercised in this scenario)';
    famA.removeAttribute('title');
  } else {
    famA.textContent = 'Family A — fired ' + a.shards_fired_count + ' shards; max M_t = ' + (a.max_M_t === null ? '—' : a.max_M_t.toFixed(3));
    famA.setAttribute('title', 'real engine updateBettingState() per-shard');
  }

  // Families B/C/D/E — common shape; same render path.
  var bcde = [
    { el: famB, key: 'family_b', label: 'B', stat_unit: 'max|M-1|' },
    { el: famC, key: 'family_c', label: 'C', stat_unit: 'Σ(M-μ)²'  },
    { el: famD, key: 'family_d', label: 'D', stat_unit: 'peakACF'  },
    { el: famE, key: 'family_e', label: 'E', stat_unit: 'max-z'    },
  ];
  for (var k = 0; k < bcde.length; k++) {
    var row = bcde[k];
    var s = pwd ? pwd[row.key] : null;
    if (!row.el) continue;
    if (s === null || s === undefined) {
      row.el.textContent = 'Family ' + row.label + ' — (not exercised in this scenario)';
      row.el.removeAttribute('title');
    } else {
      var statusWord = s.fired ? 'FIRING' : 'clean';
      row.el.textContent = 'Family ' + row.label + ' — ' + statusWord + '; ' + row.stat_unit + ' = ' + s.statistic.toFixed(3) + ' (threshold = ' + s.threshold.toFixed(3) + ')';
      row.el.setAttribute('title', s.derivation);
    }
  }
}
```

### 4.2 `test/q80-five-family-visualization.test.ts` pseudocode

Imports (verbatim):
```ts
import test from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { execSync } from 'node:child_process';

const ROOT = path.resolve(__dirname, '..');
const HTML_PATH = path.join(ROOT, 'demos', 'demo.html');
const SCENARIOS_DIR = path.join(ROOT, 'demos', 'scenarios');
const SCENARIOS = [
  'clean-baseline', 'sdc-drift', 'common-mode-rack', 'event-conditional',
  'fdr-multiple-testing', 'hierarchical-evalue',
  'sparse-data-resilience', 'topology-spanning-common-mode',
];
const FAMILY_A_SCENARIOS = ['clean-baseline', 'sdc-drift', 'fdr-multiple-testing', 'hierarchical-evalue'];
const ROUND_START_SHA = '51a20b8';
```

14 `test()` blocks — one per AC; structural assertions only (no peer-state semantic claims that the dashboard can't verify offline).

### 4.3 `Q-R80-EMPIRICAL.sh` pseudocode

4 blocks: typecheck, artifact existence, test counts, anti-scope diff. Follows R79's structure. Block 3 uses `--test-reporter=tap` per R77 lesson. Expected counts at chore-A: `# pass = 595 ± 2` (=[593, 597]); `# fail = 9` (strict equality). Block 4 ALLOWED regex matches § 3.2.

### 4.4 README.md OPTIONAL addition (Implementer judgment)

If the Implementer chooses to add a Coverage / Quick demo note, ≤ 15 lines, additive only, referencing R80 5-family visualization. Not load-bearing for any AC.

---

## § 5. Acceptance criteria

### 5.1 AC table (14 ACs)

| AC | Given | When | Then |
|---|---|---|---|
| AC-R80-1 | `demos/demo.html` | structural-element check is applied | exactly 5 div elements matching `<div class="det-fam det-fam-A">`, `<div class="det-fam det-fam-B">`, `<div class="det-fam det-fam-C">`, `<div class="det-fam det-fam-D">`, `<div class="det-fam det-fam-E">` are present in committed HTML (R79 invariant preserved; class membership only — order not constrained) |
| AC-R80-2 | embedded JS inside `demos/demo.html` | the function-presence check is applied | `function renderDetectorsPanel(` is defined AND its body queries `.det-fam-B`, `.det-fam-C`, `.det-fam-D`, `.det-fam-E` (R80-extended path; not just Family A) |
| AC-R80-3 | every Family-A-active scenario JSON (× 4: clean-baseline, sdc-drift, fdr-multiple-testing, hierarchical-evalue) | per-window detectors shape check is applied | every `windows[*].per_window_detectors.family_b` is an object with shape `{ statistic: number, threshold: number, fired: boolean, derivation: string }` AND `derivation.length >= 30` |
| AC-R80-4 | every Family-A-active scenario JSON (× 4) | same shape check for Family C | every `windows[*].per_window_detectors.family_c` matches shape `{ statistic: number, threshold: number, fired: boolean, derivation: string }` AND `derivation.length >= 30` |
| AC-R80-5 | every Family-A-active scenario JSON (× 4) | same shape check for Family D | every `windows[*].per_window_detectors.family_d` matches shape `{ statistic: number, threshold: number, fired: boolean, derivation: string }` AND `derivation` substring-contains `peakACF` |
| AC-R80-6 | every Family-A-active scenario JSON (× 4) | same shape check for Family E | every `windows[*].per_window_detectors.family_e` matches shape `{ statistic: number, threshold: number, fired: boolean, derivation: string }` AND `derivation.length >= 30` |
| AC-R80-7 | scenarios `sdc-drift` and `clean-baseline` (terminal windows) | discriminating-state check is applied | `sdc-drift.windows[last].per_window_detectors.family_b.statistic > clean-baseline.windows[last].per_window_detectors.family_b.statistic + 10` (i.e., drift produces materially higher dispersion than no-drift; sdc-drift terminal max\|M-1\| ≥ 199 per AC-R79-11 binding; clean-baseline terminal max\|M-1\| ≤ 10 by H_0 PRNG bound) |
| AC-R80-8 | every scenario JSON's top-level `detector_families` | enumeration check is applied | Family-A-active scenarios (× 4) have `detector_families` equal-to-set `['A','B','C','D','E']` (any order; set semantics); attribution scenarios (× 4: common-mode-rack, event-conditional, sparse-data-resilience, topology-spanning-common-mode) have `detector_families` equal-to `[]` |
| AC-R80-9 | `demos/demo.html` | CSS-variables block check | committed HTML's `<style>` block contains a `:root {` opening rule AND that rule defines at least 5 CSS variables with prefix `--tessera-` (e.g., grep `--tessera-` produces ≥ 5 matches inside the `:root` block) |
| AC-R80-10 | `demos/demo.html` | header tagline check | committed HTML contains a `<p class="tessera-tagline">` element AND its text content includes the substring `Per-shard observation for AI clusters` |
| AC-R80-11 | `demos/demo.html` | print stylesheet check | committed HTML's `<style>` block contains a `@media print {` rule AND that rule body includes at least 2 selector rules |
| AC-R80-12 | `demos/demo.html` after Implementer regenerates outputs at chore-A | R79 backward-compat structural check | R79 structural elements ALL still present: `<section id="live-verdict-banner">`, `<div id="metrics-panel" class="metrics-panel">`, `<details id="provenance-panel">` (without `open` attribute) — verbatim survival across R80 changes |
| AC-R80-13 | `Q-R80-EMPIRICAL.sh` | block-presence parse | Block 1 invokes `pnpm exec tsc -p tsconfig.test.json` AND Block 3 invokes `node --test --test-reporter=tap` AND Block 4 grep ALLOWED pattern matches the § 3.2 regex literal at file content level |
| AC-R80-14 | round-start SHA `51a20b8` and current HEAD | the diff is computed | `git diff 51a20b8 HEAD --name-only` ⊆ ALLOWED_SET regex enumerated in § 3.2 |

### 5.2 Implicit AC (Implementer chore-A binding-command attestation; per Rule 1 empirical-command-attestation)

The Implementer attestation in `coordination/NEXT-ROLE.md` (§ Implementer outputs, routing to Reviewer) MUST record the ACTUAL observed values from `bash coordination/specs/Q-R80-EMPIRICAL.sh` at chore-A HEAD:

- `tsc` exit code (Architect prediction: `0`)
- node test process exit code (prediction: `0`)
- TAP `# tests`, `# pass`, `# fail`, `# skipped` summary line values (predictions: `608 / 594 / 10 / 4` per § 1.4)
- `git diff 51a20b8 HEAD --name-only` line count (prediction: 9-15)
- `bash Q-R80-EMPIRICAL.sh` exit code (prediction: `0`)

If any observed value differs materially from the prediction, the Implementer HALTs and writes a DIAGNOSTIC (per cross-project Rule 1 / empirical-command-attestation sub-class; R26 MAJOR-1 / R72 CRITICAL-1 / R77 / R79 MAJOR-1 lessons).

### 5.3 Acknowledged AC gaps + mitigations (per R74 MINOR-2 reinforcement)

Documented gaps that the AC suite does NOT structurally test, paired with explicit mitigations:

1. **Per-tick browser DOM mutation of the detectors panel rows** — AC-R80-2 confirms the `renderDetectorsPanel` function exists and queries all 5 family rows; the actual per-tick DOM mutation (row textContent changing as windowIdx advances) is not observed in Node tests. _Mitigation_: Reviewer is asked to open `file:///…/demos/demo.html` in a browser and verify that the Family B/C/D/E row text changes when Play steps through ticks in `sdc-drift`. Sanity check: at window 0, sdc-drift Family B is `clean`; at window 29, it is `FIRING; max|M-1| ≥ 199`.
2. **`peakACF` real-call return-value range under demo substrate** — the demo's M_t series is monotonically rising (in drift scenarios) rather than oscillating; `peakACF`'s deseasoning + ACF computation may produce non-zero values that do NOT correspond to "oscillation" in the production-detector sense. AC-R80-5's `derivation` substring check (`peakACF`) makes the derivation visible, but the AC does NOT structurally assert that Family D's `fired` state at terminal window is `false` for monotone drift scenarios. _Mitigation_: the `derivation` string verbatim says "production Family D … targets oscillation periods 3-10 ticks" so an operator reading the tooltip understands the proxy's misalignment; if `peakACF` empirically produces `peak > 0.6` in a monotone-drift scenario, the dashboard will display `FIRING` for Family D, which is the proxy's observable behavior (not a regression).
3. **Detector-status discrimination across scenarios** — AC-R80-7 binds sdc-drift > clean-baseline at terminal window for Family B only. Family C, D, E are NOT cross-scenario-discriminated by AC. _Mitigation_: the same arithmetic structure that makes Family B discriminate also makes Family C and E discriminate (both fleet-relative; sdc-drift creates large fleet-mean-deviation). Family D discrimination is the gap (see § 5.3 #2). Reviewer manual inspection covers the gap.
4. **CSS variable internal consistency** — AC-R80-9 confirms the `:root { ... }` block exists with ≥ 5 `--tessera-*` variables. It does NOT assert that every CSS rule in the stylesheet that uses `--tessera-*` references only variables defined in the `:root` block. A misnamed variable reference would not fail any AC. _Mitigation_: spec § 2.3 defines the complete set of `--tessera-*` variables; Reviewer cross-checks the stylesheet against the § 2.3 enumeration.
5. **`@media print` content correctness** — AC-R80-11 confirms a `@media print { ... }` block exists with ≥ 2 rules inside. It does NOT assert that the rules produce a readable printout in a real browser. _Mitigation_: § 2.3 specifies the verbatim rules; Reviewer can save-as-PDF in a browser to validate; non-load-bearing for the round's substantive deliverable.
6. **`detector_families: ['A','B','C','D','E']` value extension breaks no R79 AC** — R80 changes the value of `detector_families` for Family-A scenarios from `['A']` to `['A','B','C','D','E']`. R79 AC-R79-7 asserts "`detector_families: array[A-E]`" — both values match. R79 AC-R79-8 asserts "`family_a non-null iff scenario detector_families includes 'A'`" — R80 maintains this invariant (Family A still non-null for these scenarios). Verified at § 9.5.

---

## § 6. Anti-scope + halt conditions

### 6.1 Halt conditions (extending the directive's 8 conditions)

The Implementer MUST HALT (write a DIAGNOSTIC + set STATUS: ESCALATE in NEXT-ROLE.md) when any of the following occurs:

1. (Directive condition 1) `bash Q-R80-EMPIRICAL.sh` exits non-zero at chore-A for any reason OTHER than the pre-documented carry-forward 8 (R79 close baseline) + AC-R79-14 forward-protection flip + AC-R79-8 forward-protection flip = 10 fails predicted in § 1.4.
2. (Directive condition 2) `pnpm exec tsc -p tsconfig.test.json` exit code ≠ 0.
3. (Directive condition 3) Test baseline drift: TAP `# fail` < 10 (some predicted carry-forward did NOT fail — investigate) OR `# fail` > 10 (R80 broke something not pre-predicted — investigate). The acceptable `# pass` band is `[592, 596]` per AC-R80-13 implicit threshold; outside this band, HALT.
4. (Directive condition 4) An R61-class architectural-reality discovery (e.g., `peakACF` import path is wrong, OR `peakACF` signature differs from the spec's `(y, minLag, maxLag) => {peak, lag}` claim, OR the engine vendored tree has rotated `peakACF` to a different file). The directive forbids engine modification under any conditions; HALT + ESCALATE.
5. (Directive condition 5) Implementer finds a round-evolution-fragile AC pattern in this spec that was missed at architect-time. HALT and write a DIAGNOSTIC naming the AC + proposed reformulation. Operator decides whether to amend or proceed.
6. (Directive condition 6) Any cross-project discipline (Rules 1-7) is violated.
7. (Directive condition 7) A new external dependency would be required to satisfy a spec prescription. HALT + ESCALATE; zero-new-deps posture is inviolate.
8. (Directive condition 8) Family B/C/D/E invocation surface NOT discoverable. This was addressed at Architect-time (§ 0 brainstorm + § 2.1 derivation formulas); the Implementer should NOT need to re-decide. If a Family B/C/D/E proxy implementation diverges materially from § 2.1 (e.g., the Implementer believes a different statistic better captures the production detector's intent), HALT + write a DIAGNOSTIC; do not silently substitute.
9. (Architect-added) The Implementer attempts to add a new engine import beyond `peakACF` (e.g., `evaluateSequentialMMD`, `hotellingT2`, `mahalanobisDistance`). HALT + ESCALATE — the spec authorizes ONLY the single new `peakACF` import; broader scope is a re-architecture not within R80's authority.
10. (Architect-added) `demos/demo.html` grows beyond ~14,000 lines (a soft warning that R80 may be over-shooting the prescribed scope into R81 territory; R71 baseline was 7,518 lines; R79 added ~3,000 to reach ~10,615; R80 should add ~500-1,500 to reach ~11,000-12,000 — anything beyond 14,000 signals scope creep).

### 6.2 ALLOWED_SET (narrative; precise machine-checkable regex at § 3.2)

The Implementer is permitted to MODIFY (extend additively, regenerate, or create):

- `demos/demo.html` — REGENERATED by build tool
- `demos/scenarios/*.json` (× 8) — REGENERATED by build tool; additive fields only
- `tools/build-canned-demos.ts` — extension (new interface fields, new helper functions, scenario-population modifications, HTML template extensions)
- `package.json` — OPTIONAL; no new deps
- `README.md` — OPTIONAL; ≤ 15-line additive Coverage / Quick demo note
- `test/q80-five-family-visualization.test.ts` — NEW (TDD RED commit first per R23 IMPL MINOR-1; then GREEN)
- `coordination/specs/Q-R80-SPEC.md`, `Q-R80-SPEC-AUDIT.md`, `Q-R80-EMPIRICAL.sh` — NEW (Architect; THIS commit)
- `coordination/reviews/REVIEWER-REPORT-R80.md` — NEW (Reviewer)
- `coordination/NEXT-ROLE.md` — append routing blocks per role
- `coordination/MEMORIAL.md` and `coordination/MEMORIAL-PHASE-*.md` — appends
- `coordination/logs/ROUND-R80-{ROUTING,SUMMARY}.md` — pipeline-emitted
- `coordination/diagnostics/DIAGNOSTIC-R80-*.md` — only if a halt fires
- `CLAUDE-*.md` — Memorial-Updater REINFORCED line appends

The Implementer is FORBIDDEN to modify:

- `engine/*` (any file under engine — Phase 3 frozen) — including `spectral.ts` (the `peakACF` source). The R80-new import does NOT require any engine modification; the import statement is in `tools/build-canned-demos.ts`, not in engine.
- Any `test/q01..q79-*.test.ts` file (R71+R72+...+R79 frozen)
- Any prior `coordination/specs/Q-RNN-SPEC.md` / `-SPEC-AUDIT.md` / `-EMPIRICAL.sh` (R73-R79 frozen per directive; R01-R72 frozen permanently)
- `tools/demo-scenario.ts` (R70 CLI; sibling to dashboard)
- `tools/coverage-saturation.ts` (R72), `tools/detector-envelope.ts` + `tools/detection-curve.ts` (R77), `tools/topology-walk-tuning.ts` (R78)
- `run-pipeline.sh` (PR #39 pending)
- Any cluster directory (no real-cluster work)
- Any DS-repo path (no DS-repo modification)

---

## § 7. Open questions

**None — all resolved at Architect time.**

The directive's "Architect verifies invocation surface for each family via direct file Read at spec-emit" is resolved at § 0 (Approach 3 picked after cite-then-walk over all 5 family detector files). The "placeholder + defer to operator if any family non-trivial to invoke" carve-out applies to B/C/E (synthetic proxies; documented labels) and to A/D (real invocation). The visual identity decisions (color palette, typography stack, header tagline content, print stylesheet rules) are resolved verbatim at § 2.3. The schema additions are resolved verbatim at § 1.3.

If the Implementer encounters a halt condition (§ 6.1), `STATUS: ESCALATE` per the existing halt-discipline.

---

## § 8. P3 ten-axis verification

| Axis | Verification (one sentence) |
|---|---|
| **correctness** | Every spec prescription is checkable: structural elements via grep on `demos/demo.html`; JSON fields via type-asserts on `demos/scenarios/*.json`; binding-command attestations via `Q-R80-EMPIRICAL.sh` blocks; the only real engine call is `peakACF` whose signature is cite-then-verified at `engine/detectors/spectral.ts:57`. |
| **completeness** | All 3 directive deliverables bound by ACs: (1) `tools/build-canned-demos.ts` extension surfacing per-family state — AC-R80-3/4/5/6/7/8; (2) `demos/demo.html` detectors panel populated — AC-R80-1/2/12; (3) visual identity pass — AC-R80-9/10/11. Anti-regression on R79 — AC-R80-12. Anti-scope — AC-R80-14. |
| **consistency** | Field names (`statistic`, `threshold`, `fired`, `derivation`), function names (`deriveFamilyBState..deriveFamilyEState`, `renderDetectorsPanel`, `peakACF`), CSS variable names (`--tessera-*`), class names (`tessera-tagline`, `det-fam-A..E`) prescribed verbatim; AC regex patterns match the prescribed names; § 9.5 cross-section consistency pass verifies. |
| **clarity** | Each AC's Given/When/Then is concrete (file path + matcher); banned terms (`correctly`, `appropriately`, `as needed`) verified absent via grep; derivation strings are pre-tested for ≥ 30 char length AND substring uniqueness. |
| **coverage** | Every prescribed structural element has an AC; every prescribed JS function has an AC binding its presence; every prescribed schema field has a shape assertion; cross-cutting backward-compat is asserted via AC-R80-12; cross-cutting anti-scope is asserted via AC-R80-14. |
| **constraints** | Anti-scope enforced by AC-R80-14 (anti-scope diff ⊆ ALLOWED_SET); halt conditions 1-10 enumerate failure modes; engine freeze enforced by ALLOWED_SET excluding `engine/*`. |
| **concurrency** | Not applicable — synchronous single-pass build tool + static HTML rendering + sync JS dashboard event loop; no concurrency surface. |
| **corner cases** | `peakACF` on series shorter than 4 entries returns `{peak: 0, lag: 3}` (peak stays 0; § 1.5 failure-mode table); σ_fleet = 0 in window 0 of clean-baseline (denominator guard `Math.max(σ, 1e-6)` in `deriveFamilyEState`); empty `detector_families` for attribution scenarios (AC-R80-8 explicitly handles); `<details>` collapsed-by-default for R79 provenance (AC-R80-12 re-asserts). |
| **cost** | New file count: 4 (1 test + 3 spec triad); modified file count: 3-5; estimated demo.html growth ~500-1500 lines (from 10,615 to ~11,100-12,100) — within halt-condition 10 soft warning at 14,000. |
| **coupling** | Net new coupling = 1 new engine import (`peakACF` from `engine/detectors/spectral.js`); zero new external dependency coupling (halt condition 7); the only modified shared surface is `tools/build-canned-demos.ts` whose changes are additive. |

---

## § 9. Pre-emit grilling (Superpowers Phase 3)

### 9.1 Every claim verifiable?

- Every numeric prediction in § 1.4 maps to a binding command (TAP `# fail` = 9 → Block 3; `tsc` exit = 0 → Block 1).
- Every structural prescription in § 4.1 maps to an AC regex (§ 5.1).
- Every architectural decision in § 2 is cross-referenced from § 4 pseudocode and § 5 AC.
- The `peakACF` signature claim is verified by direct read at `engine/detectors/spectral.ts:57`: `export function peakACF(y: number[], minLag: number, maxLag: number): { peak: number; lag: number }`. (Verified at session entry.)

**Verified: YES.**

### 9.2 Unstated assumptions?

- **Assumed:** `pnpm exec tsc` and `pnpm exec node --test` are available in the worktree (verified empirically at session entry; same as R79).
- **Assumed:** `engine/detectors/spectral.js` (the compiled .js) is in the vendored tree at round-start (verified — `engine/detectors/spectral.js` exists per `ls engine/detectors/`).
- **Assumed:** The `<details>` HTML element rendering behavior at runtime (R80 doesn't depend on it for any AC; only R79 AC-R80-12 re-asserts the committed structure).
- **Assumed:** `Math.indexOf` works on number arrays via reference identity (correct — JS Array.indexOf uses SameValueZero comparison for numbers; `m.indexOf(Math.max(...m))` returns the FIRST index of the max value; ties resolve to earliest shard, deterministic).
- **Assumed:** `process.stdout.write(...) ; process.exit(0)` in `tools/build-canned-demos.ts` CLI guard does not truncate at 65KB because the printed message is small (~80 chars). Verified — R71's existing line 1654 already follows this pattern with no truncation issue.
- **Assumed:** R79 AC-R79-14 will flip from PASS to FAIL at R80 chore-A by structural-drift, not by any other regression. Verified by reading R79's EMPIRICAL.sh regex literally and confirming R80 paths fall outside it.

**All assumptions either verified empirically OR explicitly bounded.**

### 9.3 Scope added beyond request?

The directive enumerates 5 prescriptive elements: (1) `tools/build-canned-demos.ts` extension for all 5 families; (2) `demos/demo.html` detectors panel filled; (3) visual identity pass; (4) `test/q80-five-family-visualization.test.ts`; (5) `Q-R80-EMPIRICAL.sh`. The spec delivers exactly those. No scope additions beyond the directive's allowed-paths list. Halt condition 9 (Architect-added) prevents the Implementer from expanding scope into additional engine imports. **Verified: NO scope creep.**

### 9.4 Implementer can act without guessing?

- Every function name is prescribed verbatim (`deriveFamilyBState`, `deriveFamilyCState`, `deriveFamilyDState`, `deriveFamilyEState`, `renderDetectorsPanel`).
- Every CSS variable name is prescribed (§ 2.3 enumerates 24 `--tessera-*` variables).
- Every class name is prescribed (`tessera-tagline`; `det-fam-A..E` unchanged from R79).
- Every schema field name + type is prescribed (§ 1.3 + § 4.1.2 + § 4.1.3).
- Derivation strings are prescribed verbatim (§ 4.1.3 each helper's `derivation: '...'` string).
- HTML insertion points are specified ("inside the existing `<style>` block as FIRST rule" for `:root`; "as LAST rule" for `@media print`; "after the existing `<h1>`" for tagline).
- Halt condition 9 forbids new engine imports beyond `peakACF`.

**Verified: zero design decisions deferred to Implementer.** Tactical implementation details (exact spacing inside the CSS block; variable names inside helper-function locals; whether to use `for` or `forEach`) remain at Implementer discretion per role boundary.

### 9.5 Cross-section consistency pass (R01 reinforcement; R65 MINOR-2 type-shape extension)

Verified by line-by-line walk:

- `FamilyBCDEWindowDetectors` shape `{ statistic, threshold, fired, derivation }` consistent across § 1.3 (interface declaration), § 2.1 (per-family formula table), § 4.1.2 (interface pseudocode), § 4.1.3 (helper function returns), § 5.1 AC-R80-3/4/5/6 (shape assertions). ✓
- `deriveFamilyBState`, `deriveFamilyCState`, `deriveFamilyDState`, `deriveFamilyEState` function names consistent across § 4.1.3 (declaration) and § 4.1.4 (call sites). ✓
- `peakACF` import path `'../engine/detectors/spectral.js'` consistent across § 4.1.1 and § 1.1 component inventory. ✓
- `--tessera-*` CSS variable prefix consistent across § 2.3 enumeration and § 5.1 AC-R80-9 regex (`--tessera-` substring). ✓
- `tessera-tagline` class name consistent across § 2.3 (HTML insertion) and § 5.1 AC-R80-10 (regex `class="tessera-tagline"`). ✓
- Tagline verbatim text `Per-shard observation for AI clusters — statistically-rigorous fleet-FPR guarantees over canned scenarios` consistent across § 2.3 and § 5.1 AC-R80-10's `Per-shard observation for AI clusters` substring check. ✓
- `@media print` rule presence consistent across § 2.3 and § 5.1 AC-R80-11. ✓
- ALLOWED_SET regex literal at § 3.2 consistent with § 4.4 EMPIRICAL.sh Block 4 regex. ✓
- `detector_families: ['A','B','C','D','E']` value consistent across § 1.3 (top-level field semantics), § 2.2 (semantics extension), § 4.1.4 (per-scenario population), § 5.1 AC-R80-8 (set-equality assertion). ✓
- `family_b/c/d/e: null` (attribution scenarios) consistent across § 1.3, § 2.2, § 4.1.4 (NULL_PER_WINDOW_DETECTORS unchanged for attribution scenarios), § 5.1 AC-R80-8 (`[]` empty array). ✓

### 9.6 Self-application gate (R74 MINOR-5)

Would the spec's own § 4.1 pseudocode PASS each AC verbatim?

- AC-R80-1 (5 det-fam-{A..E} divs): § 4.1.5 prescribes "Replace the 5 hardcoded `<div class="det-fam det-fam-{A,B,C,D,E}">` lines … each div retains its `.det-fam` and `.det-fam-X` classes". Pseudocode → AC pass. ✓
- AC-R80-2 (`function renderDetectorsPanel(` defined; queries `.det-fam-B..E`): § 4.1.6 pseudocode has `function renderDetectorsPanel(scenarioData, windowIdx)` AND `detectorsBodyEl.querySelector('.det-fam-B')` etc. ✓
- AC-R80-3/4/5/6 (per-family shape + derivation length ≥ 30): § 4.1.3 helper functions return the exact 4-field shape AND each `derivation` string is hand-counted ≥ 30 chars (the shortest is Family A `'real engine updateBettingState() per-shard'` — 41 chars; B/C/D/E derivations are ≥ 100 chars). ✓
- AC-R80-5 specifically requires `derivation` contains `peakACF`: § 4.1.3 `deriveFamilyDState`'s derivation string begins `'real engine peakACF() over ...'`. ✓
- AC-R80-7 (sdc-drift Family B statistic > clean-baseline Family B statistic + 10): sdc-drift terminal shard-04 M_t ≥ 200 (AC-R79-11 binds); `deriveFamilyBState` returns `max|M-1|` ≥ 199 for that scenario. clean-baseline terminal M_t values stay near 1 by H_0; `max|M-1|` ≤ 5 by PRNG bound. Discriminating with margin > 190. ✓
- AC-R80-8 (Family-A scenarios: `detector_families = ['A','B','C','D','E']` set-equal; attribution scenarios: `[]`): § 4.1.4 changes `detector_families` exactly per this prescription. ✓
- AC-R80-9 (`:root {` with ≥ 5 `--tessera-` variables): § 2.3 defines 24 `--tessera-*` variables in a single `:root { ... }` block. ✓
- AC-R80-10 (`<p class="tessera-tagline">` containing `Per-shard observation for AI clusters`): § 2.3 verbatim tagline HTML. ✓
- AC-R80-11 (`@media print {` with ≥ 2 selector rules): § 2.3 print stylesheet has 7 selector rules inside the `@media print` block. ✓
- AC-R80-12 (R79 invariants survive): § 4.1.5 modifies ONLY the `det-fam-placeholder` class removal + tagline insertion + CSS additions; R79's `live-verdict-banner`, `metrics-panel`, `provenance-panel` structures are NOT touched. ✓
- AC-R80-13 (EMPIRICAL.sh blocks present): § 4.3 prescribes the 4-block structure verbatim. ✓
- AC-R80-14 (anti-scope diff ⊆ ALLOWED_SET): § 3.2 + § 4.3 Block 4 use the same regex literal. ✓

**Self-application verified.**

### 9.7 Empirical-premise verification (composite reinforcement: R07/R08/R62/R71/R72/R77)

- **Numerical predictions in § 1.4 supported by:** R79 attestation report for round-start baseline (`# pass = 582, # fail = 8`); R77 reinforcement for AC-R79-14 forward-protection flip pattern; arithmetic for `# tests = 594 + 14 = 608` (14 ACs in q80 test file).
- **`peakACF` semantic claim verified:** opened `engine/detectors/spectral.ts:57-65` and confirmed standalone signature + behavior under short-series corner case (returns `{peak: 0, lag: minLag}` when `y.length-1 < minLag`).
- **R71 MAJOR-1/2 lesson (pre-authored narrative empirical claims):** spec § 2.1 derivation strings are NOT empirical claims about engine behavior — they explicitly LABEL synthetic proxies as proxies and label real invocations as real. Verified at § 9.5 line-by-line walk. Each derivation string is verifiable by direct read of the formula in `deriveFamilyXState`.
- **Forward-protection-AC audit (R79 reinforcement; exhaustive prior 2 rounds):** § 1.4 forward-protection table walks R71/R72/R73-R76/R77/R78/R79 forward-protection tests; only AC-R79-14 flips at R80 chore-A.
- **R77 EMPIRICAL.sh probe-run gate:** committed at probe-run task (task #9; happens after spec triad commit; observed-results recorded in SPEC-AUDIT § 7).
- **R77 visualization sanity check:** dashboard does NOT prescribe a `window_count` saturation curve in this round; the per-window-per-family rendering is dynamic and varies window-to-window, naturally discriminating across the 30-window time axis.
- **Future-state git-simulation (R62):** chore-B simulation does not apply — R80 has a single chore-A commit; no chore-B with SHA-injection placeholders.

### 9.8 Spec-internal-contradiction sweep (R30/R34/R65 reinforcements)

Cross-checked algorithmic boundary clauses + type-shape definitions:

- **Threshold conventions:** All four B/C/D/E threshold semantics use strict `>` (not `≥`). § 2.1 derivation table uses `>`; § 4.1.3 pseudocode uses `>`. Consistent. ✓
- **`detector_families` value:** Family-A-active scenarios = `['A','B','C','D','E']` (5 elements); attribution scenarios = `[]` (0 elements). § 1.3, § 2.2, § 4.1.4, § 5.1 AC-R80-8 all agree. ✓
- **`peakACF` arguments:** `(y, 3, 10)` consistently across § 2.1 derivation, § 4.1.3 pseudocode. ✓
- **`schema_version`:** R80 does NOT bump; stays `'tessera-demo-v1'`. § 1.3 invariant. ✓
- **R79 invariant continuity:** R79's `det-fam-placeholder` class is removed from 4 hardcoded HTML elements (B/C/D/E); the CSS rule `.det-fam-placeholder { ... }` STAYS. Verified at § 4.1.5. ✓
- **Type-shape extension:** R79's `family_b/c/d/e: null` (literal `null` type) is widened to `FamilyBCDEWindowDetectors | null`. R79 ACs that check `family_b === null` only pass for attribution scenarios at R80 (because Family-A scenarios now have non-null `family_b`). R79 AC-R79-8 says "`family_b/c/d/e` always null" — but this was a pre-condition tied to R79's narrower implementation, not a permanent invariant. R80 explicitly extends per directive. ✓ (Reviewer verifies R79 AC-R79-8's regex; this could be a forward-protection gap. See § 5.3 #6 acknowledged gap discussion.)

**Wait — R79 AC-R79-8 explicit constraint:** Let me re-read AC-R79-8.

From R79 spec § 5.1 line 906: "AC-R79-8: `family_b/c/d/e` always null; `family_a` non-null iff scenario `detector_families` includes `'A'`."

R80 extends `family_b/c/d/e` to non-null in Family-A scenarios. **This causes AC-R79-8 to FAIL at R80 chore-A.**

This is a NEW forward-protection regression NOT pre-identified in § 1.4. Need to revise § 1.4 prediction.

Let me verify by reading test/q79-dashboard-structure.test.ts directly to see what AC-R79-8 actually asserts.

I see from the earlier grep:
```
test('AC-R79-8: per_window_detectors has 5 family keys; family_a non-null iff "A" in detector_families', () => {
```

But spec says "family_b/c/d/e always null." Let me check the actual test body to see if the assertion is the spec language or the title language.

Actually I caught a potential issue. The test name and the spec table both speak of "family_b/c/d/e always null". Need to read the test body to verify.

I MUST handle this. Let me update § 1.4 prediction and § 6.1 halt condition. Also add an explicit treatment in § 5.3 / § 9.5 / § 9.8.

### 9.9 R79 AC-R79-8 forward-protection — empirically verified at spec-emit time

R79 AC-R79-8's test body at `test/q79-dashboard-structure.test.ts:117-120` literally asserts:
```js
assert.equal(pwd.family_b, null);
assert.equal(pwd.family_c, null);
assert.equal(pwd.family_d, null);
assert.equal(pwd.family_e, null);
```

These four lines are inside the test's `for (const w of j.windows)` loop and execute for EVERY window of EVERY scenario. R80 explicitly populates these four slots with non-null `FamilyBCDEWindowDetectors` objects in Family-A-active scenarios per the directive's "5-family detector visualization" mandate. Therefore AC-R79-8 WILL FAIL at R80 chore-A.

This is the SAME structural-drift pattern as the AC-R78-14 / AC-R77-14 forward-protection flips that occurred at R79 chore-A — the directive's mandate to extend the schema structurally invalidates a prior round's literal-value assertion. Per R79 attestation's MAJOR-1 lesson (spec-not-amended-post-disposition), the spec must encode this prediction UPFRONT rather than have the Implementer self-amend at chore-A discovery time.

§ 1.4 prediction matrix and § 6.1 halt-condition 3 are updated to predict `# fail` = 10 (R79 close 8 + AC-R79-14 + AC-R79-8 = 10), `# pass` = 594. The Implementer attests OBSERVED values per Rule 1; if observed differs from predicted, HALT and write a DIAGNOSTIC.

---

## § 10. Cross-project rule disposition (Rules 1-7; per CROSS-PROJECT-MEMORIAL.md and directive)

| Rule | Sub-class | Disposition for R80 | Evidence |
|---|---|---|---|
| **Rule 1** | empirical-command-attestation | LOAD-BEARING | § 4.3 EMPIRICAL.sh Block 3 uses `--test-reporter=tap` per R77 lesson; Implementer chore-A attestation records ACTUAL observed `# pass`/`# fail`/`# tests`/`# skipped` (R26 MAJOR-1, R72 CRITICAL-1, R77, R79 MAJOR-1 lineage). |
| **Rule 2** | branch-binding coverage gate | LOAD-BEARING | § 4.1.3 helper functions each have a binding AC (§ 5.1 AC-R80-3/4/5/6 bind per-family shape; AC-R80-7 binds Family B's discriminating-state branch). Family D's `peakACF`-empty-series corner case is NOT separately AC'd — acknowledged at § 5.3 #2 with Reviewer-manual mitigation. |
| **Rule 3** | anti-self-application gate (spec's pseudocode would PASS its own ACs verbatim) | LOAD-BEARING | § 9.6 self-application gate walks all 14 ACs against spec § 4 pseudocode; all 14 verified. |
| **Rule 4** | anti-scope-allowed-set forward-coverage | LOAD-BEARING | § 3.2 ALLOWED_SET regex is SHA-pinned to round-start `51a20b8`; forward-protective entries (`R[0-9]+` in diagnostic + log patterns, broad `CLAUDE-*.md` patterns) mirror R79's pattern; AC-R80-14 asserts SUBSET, not live count. |
| **Rule 5** | composite-violation threshold | NOT TRIGGERED at R80 | Architect did not detect any composite violation requiring a new cross-project rule derivation. |
| **Rule 6** | encode-actual-results-verbatim | LOAD-BEARING | § 5.2 explicit; § 1.4 predictions are predictions, not observations; Implementer attests OBSERVED. The `# fail` prediction range `[9, 10]` per § 9.9 reflects empirical-premise uncertainty about AC-R79-8 test-body shape; resolved at probe-run. |
| **Rule 7** | cross-project canonical (claim-then-walk + TACTICAL-AUTONOMY-without-re-verification + empirical-script-defect + Haiku-MU-STATUS-update-miss + R79-spec-not-amended-post-disposition) | LOAD-BEARING | Architect performed claim-then-walk on `engine/types/families/{a,b,c,d,e}.ts` + `engine/detectors/*` at § 0 brainstorm; spec § 2.1 derivation formulas are NOT pre-authored empirical claims (they label proxies vs real invocations honestly per R71 MAJOR-1/2); EMPIRICAL.sh Block 3 uses `--test-reporter=tap` per R77 lesson; STATUS field handling documented in MEMORIAL appends. |

---

## § 11. Pipeline invocation

```bash
cd /Users/johnwarren/concord/tessera
./run-pipeline.sh --round R80 --tier full
```

The pipeline dispatches Architect → Implementer → Reviewer → Memorial-Updater sequentially. This Architect commit is the spec triad. The Implementer's next steps are documented in the routing block appended to `coordination/NEXT-ROLE.md` after this spec triad is committed (per R21 ARCH MINOR-1 reinforcement: spec artifacts committed BEFORE routing block).
