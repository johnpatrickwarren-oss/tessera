# Q-R80-SPEC-AUDIT.md — Architect audit sidecar for R80 spec triad

**Companion to:** `Q-R80-SPEC.md` + `Q-R80-EMPIRICAL.sh`
**Round:** R80 (Phase 4 SLICE 2 round 2 — dashboard polish; 5-family detector visualization + visual identity pass)
**Round-start SHA:** `51a20b8`
**Spec-triad SHA:** (this commit's SHA — recorded at commit time)

This file is read by the Reviewer (and optionally the Implementer for context). The Implementer reads only `Q-R80-SPEC.md` as the load-bearing input; this sidecar records the Architect's pre-emit grilling, P3 ten-axis verification, probe-run results, and rationale.

---

## § 1. P3 ten-axis verification (one sentence per axis)

| Axis | Verification |
|---|---|
| **correctness** | Every spec prescription is checkable: HTML structural elements via grep on `demos/demo.html`; JSON fields via type-asserts on `demos/scenarios/*.json`; binding-command attestations via `Q-R80-EMPIRICAL.sh` blocks; the only real engine call (`peakACF`) cite-then-verified at `engine/detectors/spectral.ts:57`. |
| **completeness** | All 3 directive deliverables bound by AC (build-tool extension → AC-R80-3/4/5/6/7/8; HTML detectors panel → AC-R80-1/2/12; visual identity → AC-R80-9/10/11); anti-regression on R79 via AC-R80-12; anti-scope via AC-R80-14. |
| **consistency** | Field names + function names + CSS variable names + class names prescribed verbatim; AC regex patterns match prescribed names; § 9.5 cross-section consistency pass + § 9.8 spec-internal-contradiction sweep verified zero contradictions. |
| **clarity** | Each AC's Given/When/Then is concrete (file path + matcher); banned terms (`correctly`, `appropriately`, `as needed`) grep-verified absent; derivation strings pre-tested for length AND substring identifiability. |
| **coverage** | Every prescribed structural element has an AC; every prescribed JS function has an AC; every prescribed schema field has a shape assertion; cross-cutting backward-compat asserted via AC-R80-12 + R79 invariants kept; cross-cutting anti-scope asserted via AC-R80-14. |
| **constraints** | Anti-scope enforced by AC-R80-14 + ALLOWED_SET regex; halt conditions 1-10 enumerate failure modes; engine freeze enforced by ALLOWED_SET excluding `engine/*`; new-deps prevention via halt condition 7. |
| **concurrency** | Not applicable — synchronous single-pass build tool + static HTML rendering + sync JS dashboard event loop; no concurrency surface in R80. |
| **corner cases** | `peakACF` on series shorter than 4 entries returns `{peak: 0, lag: 3}` (verified at `engine/detectors/spectral.ts:57-65`); σ_fleet = 0 in window 0 of clean-baseline guarded by `Math.max(σ, 1e-6)` in `deriveFamilyEState`; empty `detector_families` for attribution scenarios; `<details>` collapsed-by-default for R79 provenance preserved. |
| **cost** | New file count: 4 (test + 3 spec triad); modified file count: 3-5; estimated demo.html growth ~500-1500 lines — within halt-condition 10 soft warning at ~14,000 lines. |
| **coupling** | Net new engine coupling: 1 new import (`peakACF` from `engine/detectors/spectral.js`); zero new external-dependency coupling; the only modified shared surface (`tools/build-canned-demos.ts`) is additive. |

---

## § 2. Pre-emit grilling output (full audit; mirrors SPEC § 9)

Documented inline in `Q-R80-SPEC.md` § 9.1 through § 9.9 for completeness; summary below:

- **§ 9.1 (every claim verifiable):** YES. Every prediction, every prescription, every signature claim is verifiable via a binding command or a direct file-Read. `peakACF` signature verified at `engine/detectors/spectral.ts:57`.
- **§ 9.2 (unstated assumptions):** all bounded — pnpm + node test runner available (verified at session entry); `engine/detectors/spectral.js` (compiled) exists in vendored tree; `<details>` browser support assumed; `Math.indexOf` SameValueZero semantics rely on JS spec.
- **§ 9.3 (scope added beyond request):** NO. The spec delivers exactly the directive's enumerated 5 deliverables. Halt condition 9 prevents Implementer scope expansion.
- **§ 9.4 (Implementer can act without guessing):** YES. Every function/class/variable name + schema field + derivation string is prescribed verbatim. Halt condition 9 prevents new engine imports beyond `peakACF`.
- **§ 9.5 (cross-section consistency):** VERIFIED via line-by-line walk; all 10 cross-section claims consistent.
- **§ 9.6 (self-application gate; R74 MINOR-5):** all 14 ACs verified as PASSING against spec § 4 pseudocode verbatim.
- **§ 9.7 (empirical-premise verification):** § 1.4 numerical predictions empirically verified at probe-run (see § 7 below); `peakACF` semantic claim cite-then-verified at `engine/detectors/spectral.ts:57-65`; R71 MAJOR-1/2 lesson honored (derivation strings label proxies vs real invocations honestly); forward-protection-AC audit exhaustive across R71-R79 prior rounds.
- **§ 9.8 (spec-internal-contradiction sweep):** zero contradictions found.
- **§ 9.9 (R79 AC-R79-8 forward-protection):** empirically verified at `test/q79-dashboard-structure.test.ts:117-120`; § 1.4 prediction matrix + § 6.1 halt-condition 3 + EMPIRICAL.sh Block 3 EXPECTED_FAIL all updated to `# fail = 10`.

---

## § 3. Architect pre-prediction (numerical; per Rule 6 encode-actual-results-verbatim)

The Architect commits to the following predictions at spec-emit time. The Implementer attests OBSERVED values at chore-A; if observations differ materially, HALT.

| Metric | Round-start `51a20b8` prediction | Chore-A prediction | Origin |
|---|---|---|---|
| `tsc` exit | 0 | 0 | R79 attestation baseline |
| `# tests` | 594 | 608 (594 + 14 new) | R79 close + 14 R80 ACs |
| `# pass` | 582 | 594 (582 + 14 - 2 flips) | AC-R79-8 + AC-R79-14 forward-protection drops |
| `# fail` | 8 | 10 | carry-forward 8 + 2 flips |
| `# skipped` | 4 | 4 | unchanged |
| `# suites` | 3 | 3 | (new test file is a top-level suite among existing files; not a nested suite) |
| process exit | 0 | 0 | node --test exits 0 with subtest failures |
| `bash EMPIRICAL.sh` exit | 1 | 0 | round-start Block 2 + Block 3 fail; chore-A all pass |
| diff line count | 0 | 9-15 | R80 deliverables |
| `demos/demo.html` lines | 10615 | ~11100-12500 | R80 adds CSS variables + tagline + @media print + per-family render JS |

---

## § 4. Architect decision rationale (why-picked / why-rejected per Superpowers Brainstorm)

**Approach 1 (real invocation across all 5 families)** — REJECTED because:
1. Constructing a faithful `CompiledConfig + FamilyCPerCell + FamilyDPerSignal + ConformalParams` in tooling code would require duplicating engine internals (~500+ LOC); the DeploySignal `tools/calibrate.ts` reference is ~2000+ LOC.
2. Multi-dim FAMILY_C_SIGNALS vectors are not what the current per-shard univariate Gaussian-draw substrate emits; synthesizing 11-dim correlated vectors with semantically-meaningful covariance is a separate calibration problem.
3. Halt condition 4 (R61-class architectural-reality discovery) would likely fire at Implementer time when the synthesized `CompiledConfig` fails Cholesky factorization.
4. Risk of R71 MAJOR-1/2 (overclaim of production-detector semantics over an unsuitable substrate).

**Approach 2 (honest placeholder for B/C/D/E)** — REJECTED because:
1. The directive's intent ("5 detector group rows … current state (firing/clean/accumulating); detector-specific summary metric") favors dynamic per-family state over static placeholders.
2. Halt condition 8 reads "partial 5-family viz with documented placeholder ACCEPTABLE" — i.e., partial is acceptable but full is preferred when achievable safely.
3. The visual identity pass is independent and lands in either approach.

**Approach 3 (hybrid: real Family A; real Family D peakACF; synthetic labeled proxies for B/C/E)** — PICKED because:
1. Five families appear with discriminating per-window state.
2. Two families (A, D) use real engine invocation.
3. Three families (B, C, E) use synthetic demo-substrate proxies with explicit `derivation` strings that label them honestly.
4. Honors R71 MAJOR-1/2 by NOT pre-authoring empirical claims about engine behavior in narrative strings.
5. Honors zero-new-deps + minimal-new-engine-coupling (1 import only).
6. Pedagogically interesting: hierarchical-evalue scenario shows Family B and C diverge (B catches individual deviation; C fleet-relative sees nothing).

**Alternative considered but folded into Approach 3:** real `mahalanobisDistance` for Family E. Rejected internally because (a) on a 1-D scalar, Mahalanobis distance collapses to a z-score — semantically misaligned with the multi-dim conformal novelty test; (b) the production Family E threshold derives from `ConformalParams.calibration_scores` (a per-cell empirical distribution) which the demo substrate cannot construct. Synthetic z-score equivalent (in `deriveFamilyEState`) is functionally equivalent and labeled honestly as a proxy.

---

## § 5. Amendments from prior version

Not applicable. This is R80's first spec emission; no amendments yet.

---

## § 6. Cross-project rule disposition (Rules 1-7 from CROSS-PROJECT-MEMORIAL.md)

Mirror of `Q-R80-SPEC.md` § 10:

1. **Rule 1 (empirical-command-attestation):** LOAD-BEARING. EMPIRICAL.sh Block 3 uses `--test-reporter=tap` per R77; Implementer attests OBSERVED at chore-A.
2. **Rule 2 (branch-binding coverage):** LOAD-BEARING. Per-family helpers each have a binding AC; Family D corner case acknowledged at § 5.3 #2.
3. **Rule 3 (anti-self-application gate):** LOAD-BEARING. § 9.6 walks all 14 ACs against spec pseudocode.
4. **Rule 4 (anti-scope-allowed-set):** LOAD-BEARING. ALLOWED_SET SHA-pinned to `51a20b8`; forward-protective patterns mirror R79.
5. **Rule 5 (composite-violation threshold):** NOT TRIGGERED.
6. **Rule 6 (encode-actual-results-verbatim):** LOAD-BEARING. Predictions in § 1.4 are predictions; Implementer attests OBSERVED.
7. **Rule 7 (cross-project canonical):** LOAD-BEARING. Architect performed claim-then-walk over `engine/types/families/*` + `engine/detectors/*`; derivation strings honor R71 MAJOR-1/2; AC-R79-8 forward-protection flip pre-empted (R79 MAJOR-1 lesson absorbed: spec encodes the prediction UPFRONT rather than self-amending at chore-A).

---

## § 7. EMPIRICAL.sh probe-run (at round-start `51a20b8`, before spec-triad commit)

Per R77 reinforcement (probe-run EMPIRICAL.sh at HEAD before routing).

**Command:** `bash coordination/specs/Q-R80-EMPIRICAL.sh`

**Result:** exit 1 (Block 2 + Block 3 expected to fail at round-start; Block 1 + Block 4 expected to pass).

**Actual observed output (verbatim from probe-run):**

```
── Q-R80-EMPIRICAL.sh @ HEAD=51a20b8

── Block 1: typecheck
Block 1 PASS: tsc exit 0

── Block 2: required artifact existence
Block 2 FAIL: missing required artifact(s): coordination/specs/Q-R80-SPEC-AUDIT.md test/q80-five-family-visualization.test.ts

── Block 3: test counts
Block 3 FAIL: fail count = '8'; expected 10 (carry-forward 8 + AC-R79-14 + AC-R79-8 forward-protection flips = 10)
  TAP tail:
  ...
1..553
# tests 594
# suites 3
# pass 582
# fail 8
# cancelled 0
# skipped 4
# todo 0
# duration_ms 15901.993584

── Block 4: anti-scope diff
Block 4 PASS: 0 files in diff, all within ALLOWED_SET

── Q-R80-EMPIRICAL.sh: AT LEAST ONE BLOCK FAILED (exit 1)
```

**Round-start prediction empirically confirmed:**
- `# tests = 594` ✓
- `# pass = 582` ✓
- `# fail = 8` ✓
- `# skipped = 4` ✓
- `# suites = 3` ✓
- Block 1 PASS ✓ (tsc exit 0)
- Block 2 FAIL ✓ (Q-R80-SPEC-AUDIT.md will be created in this same architect commit; test/q80-*.test.ts created by Implementer at chore-A RED commit)
- Block 3 FAIL ✓ (fail count 8 at round-start; 10 expected at chore-A)
- Block 4 PASS ✓ (no diff because uncommitted spec files don't show in `git diff --name-only`; will pass at chore-A because all R80 paths match § 3.2 ALLOWED_SET regex)
- exit 1 ✓

**Note on Q-R80-SPEC-AUDIT.md status at probe-run time:** the probe-run was executed BEFORE this audit file was Written; so this audit file did not exist at probe-run time, contributing to Block 2's MISSING list. After this file's Write completes (concurrent with the probe-run review), the file exists; Block 2 will still FAIL until test/q80-*.test.ts is added by the Implementer at chore-A.

**No visualization sanity check required** — R80 does NOT prescribe a saturation matrix or detection curve at a specific window count. Per-window-per-family state is dynamic across the 30-window time axis and naturally discriminating (sdc-drift terminal Family B statistic ≥ 199 vs clean-baseline terminal Family B statistic ≤ 5; AC-R80-7 binds this discrimination empirically).

---

## § 8. Forward-protection-AC audit (full enumeration across R71-R79)

Per R79 reinforcement: exhaustive walk across all prior 2 rounds' anti-scope tests. R80 extends this to all prior rounds whose anti-scope tests are still live (R71-R79).

| Prior round | AC | Will flip at R80 chore-A? | Reasoning |
|---|---|---|---|
| R71 | AC-R71-1 through AC-R71-13 | No (preserved) | Build-tool exports unchanged; demo.html structural elements preserved (AC-R80-12 re-asserts R71-3 byte-identity check + R71-12 structural elements + R71-13 JSON round-trip). |
| R72 | AC-R72-19 (R71 SCENARIO_NAMES anti-regression) | No | R80 keeps `SCENARIO_NAMES` at 8 names unchanged. |
| R73 | (tier-router safety) | No | R80 modifies neither `scripts/tier-router.ts` nor its corpus fixtures. |
| R74 | (MU-Haiku + Reviewer-scope) | No | R80 modifies neither `scripts/mu-model-select.js` nor `run-pipeline.sh`. |
| R75 | (cache-prefix) | No | R80 modifies neither `scripts/build-role-context.ts` nor `tools/measure-cache-effect.ts`. |
| R76 | (Anchor PR #39 metadata; no test ACs touching R80 surfaces) | No | R76 was a meta-tooling round; no tests touch demos/. |
| R77 | AC-R77-14 (frozen surfaces include `tools/build-canned-demos.ts`) | Already FAIL at R79 close (carry-forward); no new flip at R80 chore-A | Same file was modified at R79; the carry-forward count of 8 already includes this. |
| R77 | AC-R77-17 (R77 anti-scope diff regex excludes demos/* and tools/build-canned-demos.ts) | Already FAIL at R79 close | Same as above. |
| R78 | AC-R78-13 (R77 detector-envelope outputs byte-identical) | No | R80 modifies neither R77 outputs nor R78 outputs. |
| R78 | AC-R78-14 (R78 anti-scope diff regex excludes demos/* and tools/build-canned-demos.ts) | Already FAIL at R79 close | Carry-forward. |
| R79 | AC-R79-14 (R79 anti-scope diff regex hardcodes Q-R79-*; does NOT include Q-R80-* + REVIEWER-REPORT-R80 + test/q80-*) | **YES — flips from PASS to FAIL at R80 chore-A** | Forward-protection regex doesn't cover R80 paths. |
| R79 | AC-R79-8 (literal `pwd.family_{b,c,d,e} === null` for every window of every scenario) | **YES — flips from PASS to FAIL at R80 chore-A** | R80 directive mandates populating these slots; structurally invalidates R79's literal-null assertion. |
| R79 | AC-R79-1 through AC-R79-7, AC-R79-9 through AC-R79-13 | No | Each preserved by AC-R80-12 (R79 structural elements survive) + AC-R80-3/4/5/6 schema extension (additive). |

**Total predicted forward-protection flips: 2** (AC-R79-14, AC-R79-8).

This is +2 above R79's close `# fail = 8`. Predicted `# fail` at R80 chore-A = 10.

---

## § 9. Architect role-boundary attestation

I did NOT write implementation code. I did NOT open any test file's body for the purpose of authoring it; I read `test/q79-dashboard-structure.test.ts:106-130` ONLY for the empirical purpose of verifying R79 AC-R79-8's forward-protection behavior (per § 9.9 of the spec + § 7 of this audit + the R77 + R79-MAJOR-1 reinforcement on empirical-premise verification). All unresolved decisions are documented at § 5.3 (acknowledged gaps) of the spec — none are deferred-by-assumption.

The Implementer's role boundary: implement per § 4 pseudocode; halt per § 6.1 conditions; do NOT re-decide architectural choices made at § 0 / § 2.
