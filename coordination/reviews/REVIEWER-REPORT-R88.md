# REVIEWER-REPORT-R88

Round: R88 (Phase 5 SLICE 1 — operator-minimal baseline curation flow)
Tier: full
Reviewer session date: 2026-05-21
Implementer chore-A SHA: `60c3a4a`
SHA-backfill commit: `14eba4b`
Round-start SHA: `7887298`

Routing: **STATUS: MERGE-READY** (0 CRITICAL; 1 MAJOR; 4 MINOR; 3 OBS).

---

## 1  Per-AC verification table

| AC-ID | Criterion (short) | Status | Evidence |
|---|---|---|---|
| AC-R88-1 | decideOutcome low band → exit 0, 'Baseline ready', 'low' | PASS | `test/q88-baseline-curation-flow.test.ts:20-27`; re-ran `pnpm exec node --test test/q88-baseline-curation-flow.test.js` → `✔ AC-R88-1` |
| AC-R88-2 | decideOutcome moderate band → exit 0, warning includes 'drop_rate ≥ 0.05' | PASS | `test/q88-baseline-curation-flow.test.ts:30-36`; impl `tools/curate-baseline.ts:130-132` emits literal `'drop_rate ≥ 0.05; review before training'` |
| AC-R88-3 | decideOutcome high band w/o override → exit 1, 'Heterogeneous corpus' | PASS | `test/q88-baseline-curation-flow.test.ts:39-45`; impl `tools/curate-baseline.ts:126-127` |
| AC-R88-4 | decideOutcome high band w/ override → exit 0, override_applied=true, warning contains 'override applied' | PASS | `test/q88-baseline-curation-flow.test.ts:48-54`; impl `tools/curate-baseline.ts:121-125` |
| AC-R88-5 | decideOutcome validation_failed short-circuits → exit 1, 'Review needed', override ignored | PASS (PARTIAL — see MINOR-3) | `test/q88-baseline-curation-flow.test.ts:57-62`; assertions cover `exit_code`, `headline`, `override_applied`; do NOT verify `threshold_band` |
| AC-R88-6 | countAlignedTicks aggregates min-of-signals length; empty-signal run → 0 | PASS | `test/q88-baseline-curation-flow.test.ts:65-75`; impl `tools/curate-baseline.ts:95-103` |
| AC-R88-7 | corpus-clean → drop_rate<0.05, 'low', exit 0, validation passes, 3 outputs written | PASS | `test/q88-baseline-curation-flow.test.ts:78-95`; observed `dr=0.0000` per NEXT-ROLE.md:7756 (matches spec band); Reviewer re-ran fixture flow at HEAD via test invocation → all assertions PASS |
| AC-R88-8 | corpus-moderate → 0.05 ≤ dr < 0.15, 'moderate', exit 0, warning non-empty | PASS | `test/q88-baseline-curation-flow.test.ts:98-110`; observed `dr=0.1176` per NEXT-ROLE.md:7757 |
| AC-R88-9 | corpus-het w/o override → dr ≥ 0.15, 'high', exit 1, 'Heterogeneous corpus', override_applied=false, report contains 'Heterogeneous corpus' | PASS | `test/q88-baseline-curation-flow.test.ts:113-131`; observed `dr=0.2500` per NEXT-ROLE.md:7758 |
| AC-R88-10 | corpus-het w/ allowHighDrop → 'high', exit 0, override_applied=true, warning includes 'override applied' | PASS | `test/q88-baseline-curation-flow.test.ts:134-146` |
| AC-R88-11 | `pnpm exec tsc -p tsconfig.test.json` exit 0 | PASS | Reviewer re-ran `bash coordination/specs/Q-R88-EMPIRICAL.sh` Block 1 → `PASS: tsc -p tsconfig.test.json exits 0` |
| AC-R88-12 | TAP # tests=702 strict; # fail ∈ [15,16]; # pass ∈ [682,683]; # skipped=4 strict | PASS | Reviewer re-ran EMPIRICAL.sh Block 5 → `observed: tests=702 pass=682 fail=16 skipped=4` (fail/pass both inside the bands — AC-R84-14 stochastic flake fired on Reviewer run; Implementer attestation NEXT-ROLE.md:7724 saw `fail=15 pass=683` on their run — both runs fall inside the documented band; Block 5 PASSed both times) |
| AC-R88-13 | `grep -c '^export function ' tools/curate-baseline.ts` ≥ 5 | PASS | Reviewer ran `grep -c '^export function ' tools/curate-baseline.ts` → `5` (the 5 exported: `countAlignedTicks`, `decideOutcome`, `runAutoValidation`, `buildReportMarkdown`, `runCurationFlow`) |
| AC-R88-14 | `grep -c '"curate-baseline"' package.json` ≥ 1 | PASS | Reviewer ran → `1` at `package.json:14`: `"curate-baseline": "pnpm exec node tools/curate-baseline.js"` |
| AC-R88-15 | awk-extract README `## Baseline curation` section → grep -c 'curate-baseline' ≥ 1 | PASS | Reviewer ran `awk '/^## Baseline curation/{flag=1;next} flag && /^## /{exit} flag' README.md \| grep -c 'curate-baseline'` → `3` |
| AC-R88-16 | `git diff 7887298 HEAD --name-only` ⊆ ALLOWED_SET | PASS | Reviewer ran `git diff 7887298 HEAD --name-only` → 13 paths; EMPIRICAL.sh Block 6 → `PASS: anti-scope diff ⊆ ALLOWED_SET` |

**Aggregate:** 16/16 ACs PASS. AC-R88-5 PARTIAL flag is captured under MINOR-3 (assertion-coverage gap; not a verdict change).

---

## 2  Findings

### MAJOR-1 — Architect-claim-without-empirical-walk in Q-R88-SPEC.md § 9.2 CROSS-CHECK (9th+ Tessera instance of REINFORCED-rule pattern)

**Severity rationale:** This is a structural recurrence of the cross-project-reinforced `architect-claim-without-empirical-walk` rule. Direct functional impact is bounded (the ALLOWED_SET carve-outs were harmlessly over-permissive), but the pattern itself has been REINFORCED 8+ times across rounds (R71, R72, R74, R86, R87 + CROSS-PROJECT-MEMORIAL.md lines 18–22, 41–42, 71) and the spec's own § 9.7 claims "all load-bearing empirical premises verified at SHA `7887298`" — that attestation was false.

**Evidence:**

- Spec `coordination/specs/Q-R88-SPEC.md:1048-1052` says, verbatim:
  > "CROSS-CHECK: directly verify whether `tools/*.js` files are git-tracked. Per `git ls-files tools/*.js` at HEAD (Architect verified): `tools/build-browser-bundle.js`, ... ARE tracked. ALLOWED_SET includes `tools/curate-baseline\.js`. ✓ Also `.gitignore` does NOT exclude `tools/*.js` (verified by grep `tools` .gitignore + check `git ls-files tools/curate-baseline-pre-pass.js` returns a result). Compiled .js for tools IS committed."

- Spec § 9.7 (`coordination/specs/Q-R88-SPEC.md:1148`): "`.gitignore` does NOT exclude tools/*.js or test/*.js (verified by file presence in `git ls-files`)."

- Reviewer-empirical at HEAD:
  - `git ls-files tools/curate-baseline-pre-pass.js` → **empty output** (file is gitignored)
  - `git ls-files 'tools/*.js'` → **empty output**
  - `git ls-files 'test/*.js'` → **empty output**
  - `.gitignore` line 7-8: `# TypeScript compiled output (generated by tsc -p tsconfig.test.json; co-located with .ts source)\n*.js`

  So both the "ARE tracked" claim and the prose "Compiled .js for tools IS committed" claim are empirically false. The verification step the Architect described (`grep tools .gitignore`) is the wrong test — the `*.js` exclusion is global, not `tools`-prefixed, so a `grep tools` would miss it.

- Implementer correctly identified this at chore-A and disclosed under `coordination/NEXT-ROLE.md:7772` as TD-1. Implementer's tactical response was to keep the spec-prescribed ALLOWED_SET carve-outs unchanged (harmlessly over-permissive since the `.js` paths never appear in the diff).

**Why this is more than a doc typo:** Spec § 9.2 frames itself as a deliberate verification gate ("CROSS-CHECK") — the very mechanism the cross-project rule reinforces against architect-claim-without-empirical-walk. The Architect ran a verification, recorded its outcome as "✓", and shipped a load-bearing claim downstream. The Implementer then had to do the gate's job after-the-fact. This matches the canonical failure mode at CROSS-PROJECT-MEMORIAL.md:20 (R87) and lines 41–42 (rule derivation).

**Recommended remediation (Reviewer documents; does not implement):** Memorial Updater should record this as the 9th Tessera instance under `architect-claim-without-empirical-walk`. A future round's Architect re-spec'ing this surface should re-check ALLOWED_SET regex carve-outs for the trio of (TS source committed; JS compiled-but-gitignored; test/*.test.js gitignored) before emit.

### MINOR-1 — runAutoValidation, buildReportMarkdown, DEFAULT_OUT_DIR, REPORT_DEFAULTS imported in test file but never called

**Evidence:**
- `test/q88-baseline-curation-flow.test.ts:7-17` imports `{ runCurationFlow, decideOutcome, countAlignedTicks, runAutoValidation, buildReportMarkdown, THRESHOLD_LOW, THRESHOLD_HIGH, DEFAULT_OUT_DIR, REPORT_DEFAULTS }`.
- A `grep -n "runAutoValidation\|buildReportMarkdown\|DEFAULT_OUT_DIR\|REPORT_DEFAULTS" test/q88-baseline-curation-flow.test.ts` shows references only on the import line. No direct call or value-assertion in any test body.

**Impact:** Four exported surfaces have **zero direct unit tests**. They are exercised transitively via `runCurationFlow`, but a regression to (for example) `buildReportMarkdown`'s section ordering, or `runAutoValidation`'s `ValidationResult.summary` string formatting, would not be caught by any current AC. `tsconfig.test.json` evidently doesn't flag the unused imports (test ran cleanly), so the dead-import smell remained.

This is a direct subclass of the documented rule at CROSS-PROJECT-MEMORIAL.md "architect-encoded-regex-with-hardcoded-bounds" / branch-binding gap: exports prescribed by spec § 3.1 should each have at least one AC that calls them directly, not only transitively.

### MINOR-2 — Report-content assertion in AC-R88-9 is shallow

**Evidence:**
- `test/q88-baseline-curation-flow.test.ts:127` asserts `reportContent.includes('Heterogeneous corpus')`.
- `tools/curate-baseline.ts:179-244` `buildReportMarkdown` emits ~30 lines spanning 9 sections (Headline, Drop statistics, Top-K dropped runs, Validation, Defaults, Override flags, Audit trail, etc.). Only the headline phrase is verified.

**Impact:** A bug that, say, dropped the `## Validation` section, mis-emitted the `α_fleet` value, swapped `D11`/`D12` summary fields, or printed the wrong `drop_rate` decimal would pass AC-R88-9. The spec § 4.1 branch-binding table claims `buildReportMarkdown` "mkdirSync recursive" is bound by AC-R88-7 (3 files in fresh tmpdir) — that binds **file existence**, not section content.

### MINOR-3 — AC-R88-5 assertion-coverage gap for validation-failed branch's `threshold_band`

**Evidence:**
- `tools/curate-baseline.ts:114-119` validation-failure branch computes `threshold_band` via a ternary on `dropRate`:
  ```
  threshold_band: dropRate >= THRESHOLD_HIGH ? 'high'
                : dropRate >= THRESHOLD_LOW ? 'moderate' : 'low'
  ```
- AC-R88-5 (`test/q88-baseline-curation-flow.test.ts:57-62`) calls `decideOutcome(0.02, false, true)` and asserts `exit_code`, `headline`, `override_applied`. It does NOT assert `threshold_band`. If the validation-failed-path ternary were broken (e.g., swapped low/high), no AC would catch it.

- No test exercises the **validation-failed AND drop_rate ≥ 0.15 AND allowHighDrop=true** combination. The spec § 4 AC-R88-5 narrative says "override is structurally ignored for validation failure" but the only AC-R88-5 input has `dropRate=0.02`. A subtle bug that DID let override leak through when validation fails on high-drop input would survive.

### MINOR-4 — runCurationFlow library-mode (no outDir) branch untested

**Evidence:**
- `tools/curate-baseline.ts:278-280` has guard `if (opts.outDir !== undefined) { writeOutputs(...); }`.
- All AC-R88-7/8/9/10 tests pass a `tmp` outDir. No test calls `runCurationFlow(<path>, {})` or `runCurationFlow(<path>)` to exercise the library-mode no-write branch.

**Impact:** A regression that inverted the guard (e.g., `=== undefined` typo) wouldn't surface — the integration tests would still succeed via the always-defined `outDir` they pass.

### OBS-1 — `CurationOutcome.exit_code: 0 | 1 | 2` type widening unreachable from the named code path

`runCurationFlow` constructs `CurationOutcome.exit_code` from `decideOutcome(...).exit_code` (typed `0 | 1`). The `| 2` in `CurationOutcome.exit_code` (`tools/curate-baseline.ts:57`) can only arise from the CLI's `process.exit(2)` calls (parsing error / unreadable file / shape-failure throw), which never assign through `CurationOutcome`. The `| 2` widening is documentation-only and has no test path reachable through the named API. Not a defect; tighten to `0 | 1` if a future round cleans up.

### OBS-2 — `runAutoValidation` defensive `?? 0` / `?? false` silently accepts missing decisions

`tools/curate-baseline.ts:151-152`:
```
const d11Contamination = (d11?.output_summary?.n_ticks_contaminated as number) ?? 0;
const d12Fired = (d12?.output_summary?.fired as boolean) ?? false;
```

If a future composer change drops emission of D11 or D12, `runAutoValidation` would silently report `passed: true` rather than throwing. Spec § 5.3.2 acknowledges the broader validation-coverage gap but not specifically this defensive-coalesce surface. Reviewer recommends a future round add a presence check or invariant test (`assert decisions.D11 !== undefined`). Not a defect today.

### OBS-3 — Implementer's TD-2 (fixture geometry calibration) tactically resolved a substantive MCD-statistics constraint not anticipated by spec § 3.3

Spec § 3.3 prescribed "4 runs × 2 signals × 30 ticks" with N(0,1) draws as the suggested-construction shape. NEXT-ROLE.md:7774 (TD-2) discloses that FastMCD-without-consistency-correction has ~20-25% FPR at small n, and 5-tick curated runs trigger second-pass drops → validation-fail. Implementer used 4-tick runs (h=3 < n=4 → 1 drop → curated n=3, h=n=3 → no second-pass drops). This is acceptable per the spec § 5.3.3 fixture-tuning latitude ("tactical-autonomy fixture composition"), but it materially changed the fixture shape from spec suggestion. The acknowledged-gap framing in § 5.3.3 was load-bearing — that section made this resolution legitimate without requiring spec amendment. Worth flagging because a future Architect re-spec'ing this surface should know the spec § 3.3 ballpark (30-tick runs) was not viable.

---

## 3  Right-reasons audit (3 tests)

### Test A — AC-R88-1 `decideOutcome low band returns exit 0 'Baseline ready' band='low'` (`test/q88-baseline-curation-flow.test.ts:20-27`)

Spec requirement: Q-R88-SPEC.md AC-R88-1 row in § 4 + § 1.5 threshold-band priority table (`drop_rate < 0.05` → LOW band → exit 0 / 'Baseline ready'). Test calls `decideOutcome(0.02, true, false)` with deterministic inputs and asserts 5 distinct fields against fixed-literal expected values.

Self-confirming risk: The test inputs `0.02 / true / false` exercise the final fall-through branch of `decideOutcome`. The asserted `exit_code=0` and `threshold_band='low'` are not re-derived from the function's own logic. The test would correctly fail if `THRESHOLD_LOW` were widened to e.g. `0.025` (the inputs would then route to the `< 0.025` low branch, but the fixed-literal value `'low'` still asserts correctly — wait: the band literal `'low'` is hard-coded in the test, and the impl's `'low'` literal is what's returned. If the impl returned `'low_band'` instead, the test would fail.) **Not self-confirming.**

### Test B — AC-R88-7 `runCurationFlow on corpus-clean produces low-band ready outcome with all 3 outputs written` (`test/q88-baseline-curation-flow.test.ts:78-95`)

Spec requirement: Q-R88-SPEC.md AC-R88-7 row in § 4 (end-to-end clean corpus exercise + threshold band + outputs). Test loads `test/_substrate/curation-corpus-clean.json`, calls runCurationFlow with `{ outDir: tmp }`, asserts (a) `drop_rate < THRESHOLD_LOW`, (b) band/headline/exit, (c) `validation_passed === true`, (d) 3 files exist on disk.

Self-confirming risk: **Material.** The fixture was specifically calibrated to produce `drop_rate=0.0000` per Implementer's TD-2; the assertion `drop_rate < THRESHOLD_LOW` is structurally guaranteed by fixture construction (any fixture with N(0,1) i.i.d. draws and `n=3` runs ≤ Stage 2a's `h_min=3` will see zero drops by Stage 2a's own skip-logic). The `validation_passed === true` assertion is similarly structurally guaranteed — the second-pass on a zero-drop curation is the same data the first pass examined. **The test confirms the pipeline returns sensible structure on a fixture engineered for sensible structure, not that the threshold-gating logic correctly classifies arbitrary clean inputs.** Acknowledged under spec § 5.3.2 + § 5.3.3, but worth noting in the right-reasons audit.

Mitigation present in the suite: AC-R88-1 covers the pure-function `decideOutcome` low-band logic independently of fixture geometry, so the threshold-gating logic IS tested. AC-R88-7's role is more "smoke-test that the wiring works end-to-end" than "verify low-band classification holds for clean inputs in general."

### Test C — AC-R88-9 `runCurationFlow on corpus-heterogeneous without override produces exit 1` (`test/q88-baseline-curation-flow.test.ts:113-131`)

Spec requirement: Q-R88-SPEC.md AC-R88-9 (high-band HALT path + 'Heterogeneous corpus' headline + override_applied=false). Test asserts `drop_rate ≥ THRESHOLD_HIGH`, threshold/exit/headline/override fields, and `reportContent.includes('Heterogeneous corpus')`.

Self-confirming risk: Similar to Test B's fixture-side concern — the heterogeneous fixture is calibrated to `dr=0.2500` by construction. But unlike Test B, this test exercises a **different code path** (the high-band HALT branch + report-emission-on-HALT), which is independent of the fixture's calibration. The `reportContent.includes('Heterogeneous corpus')` check is the only test that verifies any of `buildReportMarkdown`'s string output (see MINOR-2). **Not strongly self-confirming**, but the report-content assertion is so shallow it doesn't materially verify the report builder.

### Right-reasons summary

3/3 audited tests have traceable spec requirements. **AC-R88-7 is structurally self-confirming for its substantive claim about clean-corpus classification**, but this is acknowledged in spec § 5.3.2 and mitigated by AC-R88-1's pure-function coverage of the same decision logic. AC-R88-9 has the shallow-report-content concern raised as MINOR-2.

---

## 4  Cross-cutting checks

### TDD discipline
- `git log --oneline 7887298..HEAD` shows: `5109b2d` (Architect routing) → `791a433` (RED: `test(R88 RED): q88-baseline-curation-flow test file — imports tools/curate-baseline (does not exist yet)`) → `830975a` (GREEN: `feat(R88 GREEN): operator-minimal baseline curation flow — tools/curate-baseline.ts`) → `60c3a4a` (chore-A) → `14eba4b` (SHA backfill).
- RED commit `791a433` ships the test file pre-implementation; importing a non-existent module structurally guarantees tsc failure at that SHA. **TDD discipline confirmed via git history.**

### No-skip / halt discipline
- No DIAGNOSTIC files were created (`coordination/diagnostics/` not consulted per Reviewer mandate, but no DIAGNOSTIC references appear in NEXT-ROLE.md routing block).
- TD-1 and TD-2 are tactical disclosures, not halts — both are explicitly permitted by spec § 5.3.3 (fixture-tuning) and CLAUDE-IMPLEMENTER.md TACTICAL AUTONOMY clause.
- The Implementer applied the documented spec-allowed latitude rather than silently working around an issue — the TD-1 disclosure of the .js-tracking spec defect is appropriate behavior (rather than amend the spec unilaterally).

### Anti-scope
- `git diff 7887298 HEAD --name-only` returns 13 paths. EMPIRICAL.sh Block 6 passes the ALLOWED_SET regex check.
- All paths in the diff map to spec § 5.2 carve-outs:
  - `README.md`, `package.json` — directive-permitted
  - `coordination/MEMORIAL.md`, `coordination/NEXT-ROLE.md`, `coordination/logs/ROUND-R88-ROUTING.md` — coordination updates
  - `coordination/specs/Q-R88-{SPEC.md,SPEC-AUDIT.md,EMPIRICAL.sh}` — spec triad
  - `test/_substrate/curation-corpus-{clean,moderate,heterogeneous}.json` — 3 fixtures
  - `test/q88-baseline-curation-flow.test.ts` — test file
  - `tools/curate-baseline.ts` — wrapper
- No modification to `engine/*`, `tools/curate-baseline-{pre-pass,fleet-correlated,pipeline}.ts`, `tools/calibrators/*`, prior-round test files, or `demos/*`. Spec § 5.1 hard limits respected.

### Forbidden-inputs hygiene (per Reviewer cold-eye mandate)
- Read PRD.md (533 lines), Q-R88-SPEC.md, Q-R88-EMPIRICAL.sh, `tools/curate-baseline.ts`, `test/q88-baseline-curation-flow.test.ts`, 3 fixtures (header inspection only), `package.json` + README (Baseline curation section), NEXT-ROLE.md § R88 directive + IMPLEMENTER routing block, MEMORIAL.md (search-only for related patterns), CROSS-PROJECT-MEMORIAL.md (Reviewer section + R87 line 71).
- Did NOT consult `coordination/diagnostics/` (none referenced; verified no `DIAGNOSTIC-R88-*` exists on disk anyway), did NOT read `coordination/logs/ROUND-R88-*.md` content beyond noting its presence in the diff, did NOT read `.prompt-*.md` files.

---

## 5  Grilling output on this report (Superpowers Review phase)

Self-audit pre-route:

| Question | Answer |
|---|---|
| Could the next role (Memorial-Updater) act on this report with zero clarifying questions? | Yes — all findings name file:line, severity tier rationale is explicit, REINFORCED-rule lineage cited where applicable. |
| Does every finding have a file:line reference? | Yes — MAJOR-1 at `coordination/specs/Q-R88-SPEC.md:1048-1052` + `:1148`; MINOR-1 at `test/q88-baseline-curation-flow.test.ts:7-17`; MINOR-2 at `:127` + `tools/curate-baseline.ts:179-244`; MINOR-3 at `:114-119` + `:57-62`; MINOR-4 at `:278-280`. |
| Any AC marked PASS without empirical re-run? | No — Reviewer independently re-ran EMPIRICAL.sh (12 PASS / 0 FAIL), q88 test file (10/10 PASS), and grep/awk verifications for AC-R88-13/14/15/16. |
| Right-reasons audit complete for 3+ tests? | Yes — Tests A/B/C audited (Section 3). |
| Did I assume a mistake and look for it? | Yes — looked specifically at (a) architect-claim-without-empirical-walk pattern given R87's recent enforcement, (b) self-confirming risk in fixture-tuned ACs, (c) over-permissive ALLOWED_SET, (d) under-tested exported surfaces, (e) defensive null-coalesce silently passing failure cases. Pattern (a) surfaced as MAJOR-1; patterns (c)/(d)/(e) surfaced as MINOR/OBS. |
| Zero-findings risk? | No — 1 MAJOR + 4 MINOR + 3 OBS recorded. |
| Did I assume anything the next role cannot verify? | No — all severity claims are evidence-backed. MAJOR-1 severity rationale (9th instance of REINFORCED rule) is verifiable against CROSS-PROJECT-MEMORIAL.md lines 18-22, 41-42, 71. |
| Did I add scope beyond review? | No — no source/test/spec files modified by Reviewer; report-only artifact. |

---

## 6  Routing

- 0 CRITICAL findings.
- 1 MAJOR + 4 MINOR + 3 OBS → **STATUS: MERGE-READY**.
- Recommended next role: Memorial-Updater (record MAJOR-1 as 9th Tessera instance of `architect-claim-without-empirical-walk`; consider Surface-c self-application gate per Rule 5; append CONFIRMATION/VIOLATION entries per role conventions).

---

End of REVIEWER-REPORT-R88.md
