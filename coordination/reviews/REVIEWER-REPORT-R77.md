# REVIEWER-REPORT-R77 — Detection envelope (low-magnitude SDC characterization)

**Reviewer:** Opus / full-tier cold-eye
**HEAD:** `a08180a` (post operator-Option-A fix on the Architect-authored EMPIRICAL.sh defect)
**Round-start SHA:** `0d64d9a`
**Cold-read scope:** `coordination/PRD.md` (Phase 3 + tail), `coordination/specs/Q-R77-SPEC.md` (full; via system-prompt embed), `Q-R77-SPEC-AUDIT.md` (full; via system-prompt embed), `Q-R77-EMPIRICAL.sh` (full; via system-prompt embed), `tools/detector-envelope.ts` (full 332 lines), `tools/detection-curve.ts` (full 94 lines), `test/q77-detector-envelope.test.ts` (full 356 lines), `scripts/detector-tuning-recommendation.md` (full 110 lines), `coordination/coverage/R77-detection-envelope.md` (full 164 lines), `coordination/coverage/R77-detection-envelope-matrix.json` (sampled via `node -e`), `engine/detectors/betting-e-process.ts` (lines 55–235 around cited signatures), `engine/detectors/family-c-betting-e-process.ts` (lines 75–244 around cited signatures), `package.json` (full), `README.md` Coverage section, `coordination/NEXT-ROLE.md` (R77 routing + Operator Option A), `coordination/MEMORIAL.md` R77 entries (lines 1829–1872), git log + diff `0d64d9a..HEAD`, `~/.claude/CROSS-PROJECT-MEMORIAL.md` Reviewer-section + Reinforcement-rules-derived + R70-R75 additions.

**Did NOT read** (cold-eye preserved): `coordination/diagnostics/` (would contaminate independent halt-discipline judgement), `coordination/logs/ROUND-R77-ROUTING.md` (untracked pipeline routing log), any `.prompt-*.md`, MEMORIAL phase shards, Reviewer-1 / prior-reviewer artifacts (none for R77 — first Reviewer pass).

Binding commands independently re-run at HEAD `a08180a`:
- `npx tsc -p tsconfig.test.json` → exit 0
- `node --test --test-reporter=tap test/*.test.js` → exit 1; TAP `tests=566 / suites=3 / pass=557 / fail=5 / skipped=4 / cancelled=0 / todo=0`
- `bash coordination/specs/Q-R77-EMPIRICAL.sh` → exit 0; Blocks 1–8 all PASS (sha256 of idempotency-regen matrix = `81706bccd76d8e3f34c1c90c7b31efab3b5a3d8dc92572b4e999dac36b1b9331`)
- `git diff 0d64d9a HEAD --name-only` → 14 paths (full list verified ⊆ § 4.18 ALLOWED_SET; REVIEWER-REPORT-R77.md adds a 15th to the diff at this write)
- `git diff 0d64d9a HEAD -- engine/ tools/coverage-saturation.ts tools/demo-scenario.ts tools/build-canned-demos.ts tools/curate-baseline-pipeline.ts tools/curate-baseline-pre-pass.ts tools/curate-baseline-fleet-correlated.ts scripts/tier-router.ts scripts/tier-router-validate.ts scripts/mu-model-select.ts scripts/build-role-context.ts scripts/measure-cache-effect.ts run-pipeline.sh coordination/coverage/R72-saturation-matrix.json coordination/coverage/R72-saturation-matrix.md` → empty (frozen)

Adversarial mandate honored. Findings below are non-zero.

---

## § 1. Per-AC verification table

| AC-ID | Criterion (short) | Status | Evidence (file:line / cell / command) |
|---|---|---|---|
| AC-R77-1 | matrix JSON exists | PASS | `coordination/coverage/R77-detection-envelope-matrix.json` present (536619 bytes); `test/q77-detector-envelope.test.ts:86` `fs.existsSync(JSON_PATH)` → true |
| AC-R77-2 | matrix MD exists | PASS | `coordination/coverage/R77-detection-envelope.md` present (7037 bytes); `test/q77-detector-envelope.test.ts:92` |
| AC-R77-3 | schema_version === 'tessera-detection-envelope-v1' | PASS | Matrix JSON field verified; `tools/detector-envelope.ts:226`; `test/q77-detector-envelope.test.ts:98` |
| AC-R77-4 | cells.length === 504 | PASS | Matrix JSON `cells` array length verified via `node -e` sample; `test/q77-detector-envelope.test.ts:104` |
| AC-R77-5 | per-cell field schema correct | PASS | Test iterates all 504 cells and asserts type-shape of `{cell_idx, params, summary, trials}` + nested fields; `test/q77-detector-envelope.test.ts:110-139` |
| AC-R77-6 | matrix byte-identical idempotency | PASS | `Buffer.equals()` over two `runDetectionEnvelope()` runs; LCG-pure + no Date.now/Math.random; EMPIRICAL.sh Block 6 sha256 match; `test/q77-detector-envelope.test.ts:142-151` |
| AC-R77-7 | cell (mag=0.30, win=100, α=0.01, family-a) ≥ 0.6 | PASS | Matrix cell rate = 1.0 (5/5); test asserts `detection_count >= 3`; passes; `test/q77-detector-envelope.test.ts:154` |
| AC-R77-8 | cell (mag=0.20, win=200, α=0.005, family-a) ≥ 0.6 | PASS | Matrix cell rate = 1.0 (5/5); `test/q77-detector-envelope.test.ts:163` |
| AC-R77-9 | cell (mag=0.05, win=30, α=0.005, family-a) ≤ 0.6 | PASS (at boundary) | Matrix cell rate = 0.6 (3/5); `<= 3` holds exactly; `test/q77-detector-envelope.test.ts:172`. **See MINOR-4 — boundary fragility.** |
| AC-R77-10 | both families at comparison cell; report delta to stdout | PASS | family-a=1.0 / family-c=1.0; delta=0.00 reported; no sign assertion (correctly characterization-only); `test/q77-detector-envelope.test.ts:181` |
| AC-R77-11 | exactly 3 `'### α ='` headings + ≥3 `'mag      |'` rows | PASS | Verified 3 + 3 occurrences in matrix MD lines 135/144/153 + 138/147/156; `test/q77-detector-envelope.test.ts:199-207` |
| AC-R77-12 | tuning-recommendation.md has 5 required section headings | PASS | All 5 `## ` headings present at `scripts/detector-tuning-recommendation.md:7,26,62,76,92`; `test/q77-detector-envelope.test.ts:210` |
| AC-R77-13 | R72 matrix byte-identical | PASS | `git diff 0d64d9a HEAD -- coordination/coverage/R72-saturation-matrix.{json,md}` → empty; `test/q77-detector-envelope.test.ts:228` |
| AC-R77-14 | engine + frozen tools/scripts byte-identical | PASS | `git diff 0d64d9a HEAD -- engine/ tools/coverage-saturation.ts ... run-pipeline.sh` → empty; `test/q77-detector-envelope.test.ts:250` |
| AC-R77-15 | `npx tsc -p tsconfig.test.json` exits 0 | PASS (with caveat) | Re-run at HEAD: exit 0. **See OBS-1** — test invokes `tsc --noEmit` (test line 284), spec literal text omits `--noEmit`; tactical-deviation; substantively equivalent. EMPIRICAL.sh Block 1 uses the spec-literal form. |
| AC-R77-16 | test counts: pass ∈ [556, 560], fail = 5, suites = 3 | PASS (with caveat) | Re-run at HEAD: tests=566 / pass=557 / fail=5 / skipped=4 / suites=3. In-test AC binding **skips inside worker context** (test:298); EMPIRICAL.sh Block 2 (the substantive binding-command harness) re-runs in subshell and verifies. **See OBS-2.** |
| AC-R77-17 | anti-scope diff ⊆ ALLOWED_SET | PASS | All 14 (15 after this report write) diff paths match the AC-R77-17 ALLOWED_PATTERN regex; `test/q77-detector-envelope.test.ts:337` |

**Summary:** 17/17 ACs PASS empirically at HEAD `a08180a`. Two boundary caveats (AC-R77-9 at exactly 0.6; AC-R77-15/AC-R77-16 tactical deviations). Substantive contract holds.

---

## § 2. Findings

### CRITICAL — none

### MAJOR

**MAJOR-1 — TDD separate-RED-commit discipline broken (9-round streak ends at R77)**

*Severity:* MAJOR. *Files:* commit `56992bd` (sole Implementer commit pre-ESCALATE); `coordination/MEMORIAL.md:1872` (Implementer self-confession).

The Implementer's first feat commit `56992bd` lands all 8 deliverable files in ONE commit:
```
README.md
coordination/coverage/R77-detection-envelope-matrix.json
coordination/coverage/R77-detection-envelope.md
package.json
scripts/detector-tuning-recommendation.md
test/q77-detector-envelope.test.ts          ← test file
tools/detection-curve.ts                    ← implementation
tools/detector-envelope.ts                  ← implementation
```

The commit message itself attests "17 ACs green" — i.e., GREEN-state contents, no RED record. There is no prior commit landing `test/q77-detector-envelope.test.ts` in a failing state.

This violates the load-bearing rule documented at `CLAUDE-IMPLEMENTER.md` REINFORCED 2026-05-18:

> When new production code and new tests are committed together in the same round, prefix with a separate RED commit (assert.fail stubs that compile but FAIL) before writing any implementation, so **git history independently confirms RED→GREEN ordering**. The stub does not need to be complex — its purpose is a git-verifiable RED-state record.

The purpose of the rule is independent verifiability. "RED was performed in-session" is exactly the unverifiable-from-git claim the rule was created to eliminate.

Per `CROSS-PROJECT-MEMORIAL.md` tail, this discipline was honored for **9 consecutive Tessera rounds**: R69–R75 (R75 explicit: "9th consecutive round honoring R23 IMPL MINOR-1"; line 4391). R76 was a cross-repo coordination chore (no pipeline run). R77 is the first pipeline round to break the streak.

The Implementer's own MEMORIAL.md entry self-confesses:

> VIOLATION: tdd-red-commit-not-in-git-history | RED commit (assert.fail stubs) performed in-session but not recorded as a separate git commit before GREEN. Only the GREEN state is committed. TDD spirit honored in-session; git history does not independently confirm RED→GREEN ordering. | R77 | IMPLEMENTER

Spirit-vs-letter rationale ("spirit honored in-session") does not substitute for the rule's load-bearing property; it is precisely the framing the R41 MINOR-5 reinforcement (CLAUDE-IMPLEMENTER.md) flagged as "Spirit met, letter not met is a reportable deviation, not a silent bypass." Here the deviation IS disclosed (good), but the discipline itself is broken.

**Required action:** none from Reviewer (role boundary — document, do not fix). Memorial-Updater should record the streak-break and append a VIOLATION line to `CROSS-PROJECT-MEMORIAL.md`. Operator may choose to require a corrective RED-only commit at R78 entry or accept the in-session attestation; that is a discipline-policy call above Reviewer pay-grade.

---

### MINOR

**MINOR-1 — `detector-tuning-recommendation.md` selectively cites favorable α-tuning case; omits an unfavorable cell where the same lever makes detection WORSE**

*Severity:* MINOR (doc accuracy / operator-misleading risk). *Files:* `scripts/detector-tuning-recommendation.md:42-44, 85-87, 99-102`.

The doc presents the α threshold as a "tuning lever" that pushes the detector "into the reliable band":

> Line 43-46: "At `(mag=0.075, win=30)`: α=0.010 gives 5/5 vs α=0.005 gives 2/5."
> Line 86: "increase window_count to 50, or use α=0.010 (detection threshold 100 vs 200) to push into the reliable band."
> Line 99-101: "If you are constrained to 30 observations, consider α=0.010 (accepting a 2× higher false-alarm budget) or accept the 40–60% detection rate as the floor."

The matrix at HEAD contradicts the universal generalization. Verified via `node -e` direct read:

| cell (Family A, win=30) | α=0.005 | α=0.010 | direction |
|---|---|---|---|
| mag=0.050 | 3/5 (0.6) | **2/5 (0.4)** | α=0.010 makes things WORSE |
| mag=0.075 | 2/5 (0.4) | 5/5 (1.0)   | α=0.010 helps (the cited case) |
| mag=0.175 | 4/5 (0.8) | 5/5 (1.0)   | α=0.010 helps slightly; **α=0.001 also gives 5/5** (omitted) |

At mag=0.050 (a cell the doc specifically labels as "transitional"), raising α from 0.005 to 0.010 EMPIRICALLY REDUCES detection from 3/5 to 2/5. The doc presents the "use α=0.010" recommendation without disclosing this counter-example.

The root cause is acknowledged in the spec's own brainstorm (§ 0): 5-trial Monte Carlo gives 20% resolution and is PRNG-noise-dominated at the boundary. The doc presents matrix readings at the boundary as deliberate tuning effects without disclosing that the seed depends on `cell_idx * 5 + trial_idx` AND `cell_idx` encodes α — so neighboring-α cells use DIFFERENT noise sequences, not the same noise with a different threshold. The non-monotonicity in the matrix is largely a PRNG-resolution artifact at boundary cells, and the doc presents it as a tuning result.

Per `CROSS-PROJECT-MEMORIAL.md` R71 MAJOR-1/MAJOR-2 (REINFORCED 2026-05-18 / data-flow-not-syntax) and the Architect's own spec § 3.3 directive — `[Implementer fills in by reading the matrix; cites specific detection_rate values from the matrix]` — was explicitly written to AVOID pre-authored empirical claims. The Implementer DID read the matrix; the citation IS specific. But selective citation that omits the empirically-falsifying counter-example produces operator-misleading prose. Subtype of EMPIRICAL-PREMISE-VERIFICATION: cite-with-counter-example-suppression.

**Required action:** none from Reviewer. Memorial-Updater should record as VIOLATION (Implementer; doc-content-empirical-accuracy). Sub-class candidate for `CROSS-PROJECT-MEMORIAL.md` if recurrent.

---

**MINOR-2 — ASCII detection-curve renderer fixed at saturated window_count=200; curves convey zero discriminative information**

*Severity:* MINOR (deliverable-utility / spec-prescription-followed). *Files:* `coordination/coverage/R77-detection-envelope.md:135-160`; root cause `Q-R77-SPEC.md § 3.1 renderMatrixMd` lines that hard-code `window_count = 200`; AC-R77-11 also hard-codes "at window_count=200".

The three ASCII curve blocks rendered in the matrix MD are all entirely saturated:

```
mag      | 0.050 0.075 0.100 0.125 0.150 0.175 0.200 0.225 0.250 0.275 0.300 0.325 0.350 0.375
A:rate   | ##### ##### ##### ##### ##### ##### ##### ##### ##### ##### ##### ##### ##### #####
C:rate   | ##### ##### ##### ##### ##### ##### ##### ##### ##### ##### ##### ##### ##### #####
```

Identical for α = 0.001, 0.005, AND 0.01. The renderer's purpose ("rate vs magnitude; rendered via `tools/detection-curve.ts`") is structurally impossible at window_count=200 because every cell saturates at 5/5 at this window count (verified: 14 of 14 Family A magnitudes at α=0.005 are 1.0). The interesting boundary lives at window_count=30 — exactly where the doc concentrates its prose — and the renderer never visualizes it.

This is principally a SPEC defect (Architect prescribed `window_count = 200` in both pseudocode and AC literal text) but the Implementer had the visibility to flag a pre-emit-grilling-equivalent observation at chore-A: "the curve at win=200 conveys no information; should I add a win=30 curve too?" The Implementer did not surface this; a DIAGNOSTIC would have been within scope of the spec's halt condition #8 ("Architect spec uses round-evolution-fragile AC patterns"). The deliverable is degraded relative to its stated purpose.

The substantive detection envelope IS captured in the magnitude × window heatmap tables (matrix MD lines 7–131); the curve renderer is an additional visualization layer that adds no value at the prescribed slice.

**Required action:** none from Reviewer. Memorial-Updater should record as ARCHITECT VIOLATION (spec self-application gate at § 9 should have asked "is the ASCII curve meaningful at the prescribed window?"). Implementer escapes blame; followed spec exactly. Future spec for follow-on tuning rounds should overlay multiple windows or use the win=30 slice.

---

**MINOR-3 — `tools/detection-curve.ts` advertises "overlaying both families" but renders families as separate non-overlaid rows; column labels also misaligned with content**

*Severity:* MINOR (renderer-quality / docstring-vs-impl drift). *Files:* `tools/detection-curve.ts:5-7` (docstring claims overlay), `tools/detection-curve.ts:48-72` (impl renders separate A:rate and C:rate rows).

Lines 5-7 of `tools/detection-curve.ts`:
```
// Renders an ASCII detection-rate-vs-magnitude curve from a
// DetectionEnvelopeMatrix at a fixed (α, window_count) slice, overlaying
// both families.
```

The actual rendering (lines 56–71) produces two separate rows, one per family — not an overlay:
```
A:rate  | ##### ##### ...
C:rate  | ##### ##### ...
```

This is a side-by-side comparison, not an overlay. An overlay would superimpose family-A and family-C indicators in the same magnitude column (e.g., `A#C#` per cell). The deviation from the docstring is small (the rendering is still useful when meaningful, just not actually overlaid) but it is a comment-vs-impl mismatch.

Additionally, column alignment is off: the magnitude header is `0.050 0.075 0.100 ...` (5-char numbers + space = 6 chars), but each cell renders 5 chars (`#####`) + 1 space = 6 chars. Alignment happens to be correct for the saturated case (`#####`). Under non-saturated cases (e.g., `##...`) the alignment still works because `'#'.repeat(n) + '.'.repeat(5-n)` always produces exactly 5 chars. So the alignment is structurally correct; only the docstring claim is inaccurate.

**Required action:** none from Reviewer. MU may record as MINOR Implementer doc-accuracy.

---

**MINOR-4 — AC-R77-9 sits exactly at the boundary 3/5 = 0.6; any seed-prefix change would risk silent inversion**

*Severity:* MINOR (test fragility / discriminating-assertion-gate caveat). *Files:* `test/q77-detector-envelope.test.ts:172-178`; spec § 4 AC-R77-9.

Empirical value at (mag=0.05, win=30, α=0.005, family-a): detection_count = 3 / 5 = 0.6 exactly. AC asserts `<= 3`; passes with zero margin.

The AC is structurally a one-sided over-sensitivity guard ("if the cell rises above 60% the detector is over-sensitive vs round-start") but with zero margin between the spec threshold and the empirical observation. Any of the following would flip AC-R77-9 to fail without an engine change:

- A change to `SCENARIO_SEED_PREFIX` (currently `0x77E11`).
- A change to the per-cell seed formula (currently `(SCENARIO_SEED_PREFIX ^ (cell_idx * TRIALS_PER_CELL + ti)) >>> 0`).
- Reordering of the parameter-grid iteration loops (would change `cell_idx`).
- A non-functional refactor of the inner LCG/Gaussian routines that consumed PRNG draws in a different order.

This is the discriminating-assertion-gate fragility R71 MINOR-1 specifically warned about: an AC threshold matching the observed value within 1 trial is PRNG-noise-discriminable, not engine-property-discriminable. The Architect's pre-prediction at spec § 9.14 said "AC-R77-9 cell (mag=0.05, win=30, α=0.005, family=A): detection_rate ≤ 0.6 (predicted ~0.0)" — but the actual is 0.6, NOT ~0.0. The prediction band was loose enough that the threshold accidentally landed at the empirical value rather than safely above it. The AC literal `<= 0.6` should arguably have been `< 0.6` or `<= 0.4` (giving 20% margin to noise) — that would make the AC discriminate engine-level over-sensitivity rather than PRNG-edge-case.

**Required action:** none from Reviewer. Future spec authors should pad named-cell ACs by at least one trial (20% in this case) from the predicted value.

---

### OBS

**OBS-1 — AC-R77-15 test invokes `tsc --noEmit`; spec literal text and EMPIRICAL.sh Block 1 omit `--noEmit`**

*Files:* `test/q77-detector-envelope.test.ts:284` adds `'--noEmit'` to the tsc args.

The spec § 4 AC-R77-15 reads: "when running `npx tsc -p tsconfig.test.json`; then the exit code is 0." The spec's § 11 EMPIRICAL.sh Block 1 (and the committed `Q-R77-EMPIRICAL.sh` at HEAD) also uses the plain form. The in-test binding adds `--noEmit`. Substantively equivalent (exit code matches with or without `--noEmit`; both verified at this audit). Undisclosed-tactical-deviation flavor.

**OBS-2 — AC-R77-16 binding command skips inside Node test worker (R34 incident guard)**

*Files:* `test/q77-detector-envelope.test.ts:297-301`.

When the AC-R77-16 test body runs inside a Node `--test` worker (which is exactly how the in-tree TAP run executes it), it detects `NODE_TEST_CONTEXT` or `NODE_TEST_WORKER_ID` and skips. This is a deliberate guard against the R34 incident's transitive-hang risk. The substantive binding command IS exercised by EMPIRICAL.sh Block 2 (re-run at HEAD: tests=566/pass=557/fail=5/suites=3 — within [556,560] range). The in-test AC is decorative when run via `pnpm test`; the empirical binding is the harness. Disclosed via test comment.

**OBS-3 — AC-R77-13 in-test binding checks both `.json` AND `.md` byte-identity; spec literal names only `.json`**

*Files:* `test/q77-detector-envelope.test.ts:229-232`.

Spec § 4 AC-R77-13 names only `R72-saturation-matrix.json`. The test iterates both `.json` and `.md`. The `.md` is also covered by AC-R77-14 frozen-surfaces (broader anti-regression), so the broader check is substantively correct and aligned with anti-scope intent. Disclosed as observation only.

**OBS-4 — Architect-side EMPIRICAL.sh defect at chore-A entry (already memorialized; not a current finding)**

The Architect-authored `Q-R77-EMPIRICAL.sh` Block 2 used `node --test test/*.test.js` without `--test-reporter=tap`; default reporter format doesn't emit `# pass N` / `# fail N` TAP summary lines; the `grep` patterns returned empty; Block 2 unconditionally failed. The Implementer correctly applied halt-discipline (DIAGNOSTIC + STATUS: ESCALATE; commit `15af7ea`). Operator resolved with Option A (Coordinator-direct fix; commit `a08180a` adds the `--test-reporter=tap` flag).

This is the **3rd Tessera instance** of Architect-side empirical-script defect caught at Implementer chore-A (NEXT-ROLE.md § Operator resolution explicitly enumerates: R47 self-recursive verifier + R72 .gitignore semantics + R77 reporter-format mismatch). Already memorialized by operator at NEXT-ROLE.md; flagged here for Reviewer-track completeness.

The Architect-side process-failure root cause is the spec § P3 audit-sidecar attestation "EMPIRICAL.sh probe-run at spec-emit time" — which Q-R77-SPEC-AUDIT.md does NOT claim for R77 (unlike Q-R71-SPEC-AUDIT.md which DID attest probe-run). The R77 audit sidecar's pre-prediction table includes `Q-R77-EMPIRICAL.sh exits 0` but the Architect did not actually run it pre-routing. This is a self-application-gate gap — the Architect committed a script whose blocks were never executed against the predicted baseline.

**OBS-5 — Architect pre-prediction `pass = 558` vs actual `pass = 557 + skipped = +1`**

The Architect's spec § 1.6 predicted `tests=566 / pass=558 / fail=5 / suites=3`. The actual at HEAD: `tests=566 / pass=557 / fail=5 / skipped=4 / suites=3`. One of the 17 new test bodies (AC-R77-16) SKIPS inside a Node test worker (R34 incident guard). The Architect did not anticipate the Implementer's tactical worker-skip decision. Substantive Architect prediction within ±2 margin (pass=557 ∈ [556,560]). Not a defect.

---

## § 3. Right-reasons audit

Three tests audited; none self-confirming.

**Test 1: AC-R77-5 (per-cell field schema)** — `test/q77-detector-envelope.test.ts:110-139`. Traces to spec § 4 AC-R77-5 + § 3.1 source schema declaration. The test iterates ALL 504 cells and asserts type-shape of `{cell_idx, params, summary, trials}` plus nested field types. If `runDetectionEnvelope()` ever emitted a cell missing a field (e.g., dropped `detection_window_p95`) OR a wrong family literal (`'family-x'`), this would fail at the first non-conforming cell. The schema declaration in `tools/detector-envelope.ts:89-107` is independently authored; the test reads from a matrix file (not from an in-memory shape) so it is checking a serialized round-trip. NOT self-confirming.

**Test 2: AC-R77-6 (matrix idempotency)** — `test/q77-detector-envelope.test.ts:142-151`. Traces to spec § 4 AC-R77-6 + § P3 Corner-cases. The test runs `runDetectionEnvelope()` twice and asserts `Buffer.equals()` on the two emitted files. Any source of non-determinism — `Date.now`, `Math.random`, env-var dependence, key-order drift, FS-iteration order leakage — would break byte-equality. EMPIRICAL.sh Block 6 independently verifies via sha256. The test exercises the deterministic-LCG + Gaussian path through both Family A and Family C engine surfaces; failure would localize to a non-deterministic engine state or a serialization-order drift. NOT self-confirming. Strong test (Buffer-equal byte-identity is the strictest possible idempotency binding).

**Test 3: AC-R77-7 (high-magnitude saturation cell)** — `test/q77-detector-envelope.test.ts:154-160`. Traces to spec § 4 AC-R77-7 (substantive deliverable: "detector reliably detects strong drift"). The test reads from the matrix JSON (independent of the test process's own engine invocation) and asserts the named cell `(mag=0.30, win=100, α=0.01, family-a)` has `detection_count >= 3`. If the engine were broken (e.g., wealth growth disabled; bet always zero), this cell would have detection_count=0 and the test would fail. The cell choice is in the saturation interior (predicted 0.8–1.0), giving 2-trial margin to PRNG noise — discriminating. NOT self-confirming.

Right-reasons audit completed: 3/3 tests trace to substantive spec requirements with discriminating bindings.

---

## § 4. Cross-cutting checks

### TDD discipline

**FAILED at git-verifiable level.** No separate RED commit. See MAJOR-1. In-session RED claim is Implementer-attested; not independently confirmable from git history. Streak R69–R75 (9 consecutive rounds honoring R23 IMPL MINOR-1) ends at R77.

### No-skip / halt discipline

**HONORED.** Implementer correctly applied halt discipline at chore-A when EMPIRICAL.sh Block 2 exited non-zero (Architect-authored script defect; not in the pre-documented carry-forward baseline). Wrote DIAGNOSTIC; set STATUS: ESCALATE; presented bounded Option A / Option B; commit `15af7ea`. Per `CROSS-PROJECT-MEMORIAL.md` halt-discipline → tactical-autonomy-overreach-without-DIAGNOSTIC sub-pattern (R73 cross-project rule), this is the correct response — NOT inline self-resolution under fabricated TACTICAL AUTONOMY. Memorial-Updater should record as CONFIRMATION.

### Anti-scope

**HONORED.** `git diff 0d64d9a HEAD -- engine/ tools/coverage-saturation.ts ... run-pipeline.sh` returns empty. All 14 (15 post-this-report) diff paths ⊆ § 4.18 ALLOWED_SET (verified by regex match in test/q77-detector-envelope.test.ts:349 and bash equivalent in EMPIRICAL.sh:80-89). R72 outputs byte-identical. No new external dependencies. No synthetic `CompiledConfig` construction. Carry-forward fail set (R36-21, R36-30, R36-31, R65-2, R66-14) preserved at exactly 5 entries.

### Branch-binding coverage

Each AC has a matching test() block. Test name prefix `AC-R77-N:` matches the AC literal. EMPIRICAL.sh substantive verifications cover the same binding for AC-R77-15 / -16 / -17 outside the test-worker context. Acknowledged gaps in spec § 4.19 (3 gaps; each paired with minimum mitigation per R74 MINOR-2 reinforcement).

---

## § 5. Grilling on this report (before routing)

- Every finding has a file:line reference? **YES.** MAJOR-1 cites `56992bd` + `MEMORIAL.md:1872`; MINOR-1 cites `scripts/detector-tuning-recommendation.md:42-44,85-87,99-102`; MINOR-2 cites `coordination/coverage/R77-detection-envelope.md:135-160`; MINOR-3 cites `tools/detection-curve.ts:5-7,48-72`; MINOR-4 cites `test/q77-detector-envelope.test.ts:172-178`; OBS-1 cites `test:284`; OBS-2 cites `test:297-301`; OBS-3 cites `test:229-232`; OBS-4 cites operator NEXT-ROLE.md section; OBS-5 cites spec § 1.6.
- Any AC marked PASS without actual verification? **NO.** Every PASS row in § 1 cites either a binding-command re-run output, a `node -e` matrix sample, a `git diff` re-run, or a specific test-file line reading. Two "PASS (with caveat)" rows have the caveat called out in the Evidence column.
- Right-reasons audit completed for 3+ tests? **YES.** § 3 audits AC-R77-5, AC-R77-6, AC-R77-7 with substantive spec-traceability and discrimination analysis for each.
- Self-revision: re-read as if I am the Memorial Updater receiving cold. The streak-break finding (MAJOR-1) carries the most weight; MU should record VIOLATION at appropriate severity and consider whether the 10-round-discipline pattern needs cross-project re-classification. MINOR-1 (selective citation) is the second-most-substantive finding; it is doc-quality, not correctness, but it directly affects operator decision-making and is the spec § 3.3 placeholder's failure mode (the prose-fill-in that was deferred to the Implementer was meant to AVOID this exact pattern).
- Adversarial mandate honored? **YES.** Findings are non-zero (1 MAJOR + 4 MINOR + 5 OBS).

---

## § 6. Routing decision

**STATUS: MERGE-READY.**

Justification:
- 0 CRITICAL (substantive detection envelope deliverable is sound; all 17 ACs PASS empirically at HEAD; binding commands attest exit 0 / counts in spec range / anti-scope diff clean / frozen surfaces byte-identical).
- 1 MAJOR (TDD separate-RED-commit discipline broken). The MAJOR is procedural-discipline, not substance — the matrix, tools, tests, and tuning recommendation are all functional and accurate; what is broken is the git-verifiability of TDD ordering. Per `CLAUDE-REVIEWER.md` routing rule "MAJOR or below → STATUS: MERGE-READY", merge proceeds; Memorial-Updater records the streak-break and the operator decides whether to require a corrective at R78 dispatch.
- All Architect-side artifacts (spec triad) are coherent except for the EMPIRICAL.sh defect already resolved via operator Option A pre-Reviewer-dispatch (OBS-4).

Memorial-Updater scope additions beyond standard appends:
1. VIOLATION: tdd-separate-RED-commit discipline (R23 IMPL MINOR-1 / REINFORCED 2026-05-18) — streak R69–R75 (9 rounds) ends at R77. Cross-project memorial entry recommended (this is the first streak-break since R23 set the discipline).
2. VIOLATION: doc-content-empirical-accuracy / cite-with-counter-example-suppression — `scripts/detector-tuning-recommendation.md` selective α-tuning citation. Sub-class candidate for EMPIRICAL-PREMISE-VERIFICATION composite if recurrent.
3. VIOLATION: spec-self-application-gate — Architect § 9 grilling did not run EMPIRICAL.sh probe and did not ask "does the prescribed ASCII curve at win=200 convey information?" Both contributed to OBS-4 (EMPIRICAL.sh defect) and MINOR-2 (saturated curve). Sub-variant of EMPIRICAL-PREMISE-VERIFICATION composite (Architect-side).
4. CONFIRMATION: halt-discipline correctly triggered by Implementer (EMPIRICAL.sh exit non-zero → DIAGNOSTIC + ESCALATE, not silent reframing).
5. CONFIRMATION: anti-scope clean; engine + frozen tools/scripts/run-pipeline.sh + R72 outputs byte-identical; 14-path diff all ⊆ ALLOWED_SET.
6. CONFIRMATION: 3rd Tessera instance of Architect-side empirical-script defect already captured in NEXT-ROLE.md § Operator resolution; MU should align cross-project memorial.

---

_Report compiled at HEAD `a08180a` (Reviewer cold-read 2026-05-20)._
