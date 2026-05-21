# Q-R83-SPEC-AUDIT.md — Architect audit sidecar (Reviewer-only)

**Round:** R83
**Spec:** `coordination/specs/Q-R83-SPEC.md`
**Round-start SHA:** `4c4733d`
**Architect session model:** `claude-opus-4-7`
**Architect session date:** 2026-05-21

The audit sidecar carries Architect-only ceremony content that the Implementer does NOT need to read (per CLAUDE-ARCHITECT.md role boundary: Implementer reads only the spec proper). Reviewer uses this file at audit time to verify the Architect applied each pre-emit discipline.

---

## § A. P3 ten-axis verification (one sentence per axis)

Verbatim mirror of spec § 9 — held here for Reviewer cross-check:

- **Correctness**: controlState mutates exactly when its bound control fires; emitControlChange dispatches a shallow-cloned snapshot; Run handler logs the state.
- **Completeness**: All 7 directive control categories (scenario custom option; drift slider; window slider; α dropdown; target shard; topology size; family toggles; Run; Reset) prescribed verbatim in § 1.2.
- **Consistency**: All identifiers, ranges, defaults, and event names consistent across § 1.2 (markup) / § 1.4 (JS) / § 2.5 (tests) per Q.9 cross-section sweep.
- **Clarity**: Banned ambiguous language ("appropriately", "correctly", "as needed") absent from AC text.
- **Coverage**: 16 ACs × 1 test() block each = 16 added test counts.
- **Constraints**: R82 frozen surfaces preserved; engine/* untouched; demos/scenarios/*.json byte-identical; no new deps.
- **Concurrency**: N/A — single-threaded browser event loop.
- **Corner cases**: DOM-init missing element guards; "custom" scenario with no engine wired; reset-before-mutation no-op; rapid-slider event flood acceptable for R83.
- **Cost**: ~6 file diff total at chore-A.
- **Coupling**: R83 surface decouples from rendering via CustomEvent seam.

---

## § B. Pre-route discipline application (Skill 14 / Skill 15 / grilling traceability)

The full pre-emit grilling output appears verbatim inline in spec § 8 (Q.1–Q.15). The Architect applied:

| Discipline | Applied? | Source |
|---|---|---|
| Superpowers Brainstorm | YES — 3 approaches generated; Approach A selected with explicit weakness acknowledgment of B/C | spec § 0 |
| Superpowers Design | YES — component boundaries, integration points, failure modes documented inline | spec § 1.1, § 1.5, § 1.6 |
| Superpowers Review (re-read as Implementer) | YES — Q.15 in pre-emit grilling | spec § 8.15 |
| Empirical-premise-verification (R77 derived) | YES — baseline TAP counts run at spec-emit; round-start SHA verified; line-citations cite-then-verified | spec § 8.1, § 8.14 |
| Cross-section consistency (R01 derived) | YES — Q.9 16-token sweep | spec § 8.9 |
| Discriminating-AC walk (R44/R46/R65/R71 derived) | YES — Q.10 per-AC mutation walkthrough | spec § 8.10 |
| Spec-amendment-ALL-gate-artifacts (R82 MAJOR-1 derived) | YES — Q.11 4-artifact lockstep verified | spec § 8.11 |
| Branch-binding coverage (R21 derived) | YES — every event listener has an AC binding (AC-R83-10..13 cover all state-management paths) | spec § 5 table |
| Anti-scope ALLOWED_SET forward-coverage (R79 derived) | YES — Q.13 walks prior 2 rounds' frozen-path tests | spec § 8.13 |
| Routing-block grep-verification (R65 derived) | YES — Q.12 AC numbers + ROUND_START_SHA cite-verified | spec § 8.12 |
| Halt-condition trigger conflict sweep (R15 derived) | YES — Q.7 no two halt conditions prescribe conflicting actions for same trigger | spec § 8.7 |
| Acknowledged-gap pairing (R74 MINOR-2 derived) | YES — Q.8 each gap paired with mitigation | spec § 8.8 |
| Cite-then-verify (R02 / R11 / R65 derived) | YES — Q.14 every line citation verified at spec-emit | spec § 8.14 |
| File-system-claim verification (cross-project rule; R03 derived) | YES — package.json:18 build:demos verified via grep | spec § 8.1 |
| Constructor-opts cite-then-verify (R58 MINOR-1 derived) | N/A — no constructor opts literals prescribed |  |
| Statistical-term-formula match (R13 derived) | N/A — no statistical formulas prescribed |  |
| Regex-validity in JS (R34 MINOR-3 derived) | YES — all spec § 2.5 regexes are valid JS (no `\Z`; `$` + /m used appropriately for ALLOWED_SET regex anchoring) |  |

All applicable disciplines applied at spec-emit; documented inline; no deferrals.

---

## § C. Architect pre-prediction (full table; mirror of spec § 5.2)

| Observable | Pre-prediction at chore-A | Band | Rationale |
|---|---|---|---|
| `pnpm exec tsc -p tsconfig.test.json` exit | 0 | strict | R83 modifications are pure string edits to tools + new test file; no new TS types |
| `pnpm exec node --test --test-reporter=tap test/*.test.js` process exit | 1 | strict | node-test exits 1 when subtests fail (baseline 12 + R82 AC-R82-14 flip = 13 failures) |
| TAP `# tests` | 652 | strict | R82 close 636 + 16 new R83 test() blocks |
| TAP `# pass` | 636 | [635, 637] | R82 close 620 + 16 new R83 ACs all passing at GREEN; ±1 PRNG/env margin |
| TAP `# fail` | 13 | strict | R82 close 12 + R82 AC-R82-14 forward-protection flip (R82 ALLOWED regex doesn't include R83-specific paths) |
| TAP `# skipped` | 4 | strict | no skip changes |
| `bash Q-R83-EMPIRICAL.sh` exit | 0 | strict | all 5 blocks pass post-Implementer |
| `git diff 4c4733d HEAD --name-only` line count | 9-13 | band | 1 modified tool, 1 modified demo.html, 1 new test, 3 spec triad, 1 NEXT-ROLE.md, 1 MEMORIAL.md, optional REVIEWER-REPORT + ROUTING + SUMMARY |
| `demos/scenarios/*.json` post-regen content | byte-identical to round-start | strict | halt condition 9; build:demos is deterministic (R71-R82 precedent) |
| Carry-forward fail set (12 ACs) | unchanged in name | strict | AC-R36-21, AC-R36-30, AC-R36-31, R65 sibling-dep, R66 sibling-dep, AC-R77-14, AC-R77-17, AC-R78-14, AC-R79-8, AC-R79-14, AC-R80-14, AC-R81-14 |
| Routing-time observed values | as actually measured by Implementer at chore-A | per Rule 1 sub-class | encode-actual-results-verbatim; do NOT propagate predictions; do NOT silently amend EMPIRICAL.sh if prediction fails (R79 MAJOR-1) |

### C.3 Q-R83-EMPIRICAL.sh probe-run expected outcomes at round-start HEAD `4c4733d`

Per CLAUDE-ARCHITECT.md REINFORCED 2026-05-20 (`EMPIRICAL.sh-probe-run-at-spec-emit-time`; R77 OBS-4 derived):

| Block | Expected at round-start (Architect not yet authored implementation) | Reason |
|---|---|---|
| Block 1 typecheck | PASS (exit 0) | tsc baseline at round-start is exit 0 (verified at spec-emit per § 8.1) |
| Block 2 control panel HTML presence | FAIL | `<section id="tessera-control-panel">` absent at round-start (Implementer hasn't built) |
| Block 3 state-management JS presence | FAIL | `var controlState` absent at round-start |
| Block 4 test counts | FAIL (pass=620, not 636; fail=12, not 13) | R83 test file doesn't exist at round-start; counts are pre-R83 baseline |
| Block 5 anti-scope diff | PASS | At round-start, `git diff 4c4733d HEAD` is empty; no unauthorized paths |
| Overall exit | non-zero (Blocks 2, 3, 4 fail) | All failures are pre-documented "Implementer hasn't built yet" |

The Architect runs the probe to verify (a) Block 1 actually passes (no `--test-reporter=tap` / `tsconfig.test.json` mismatch — R77 lesson; recurrence-prevented), (b) Block 5 actually passes (no spurious diff before chore-A — R23 lesson; baseline correctness), (c) Blocks 2/3/4 fail for the documented reason (not for some unexpected reason like wrong block marker grep pattern — R77 OBS-4 reporter-format-mismatch defense).

**Probe run result documented in § C.4 below after EMPIRICAL.sh is authored.**

### C.4 Q-R83-EMPIRICAL.sh probe-run actual outcomes at round-start HEAD `4c4733d`

Verbatim outcomes from `bash coordination/specs/Q-R83-EMPIRICAL.sh` at Architect session entry (round-start HEAD `4c4733d`); Rule 1 sub-class `empirical-command-attestation` — encode actual values, do NOT reframe to match predictions:

| Block | Expected at round-start (C.3) | OBSERVED at round-start | Match? |
|---|---|---|---|
| Block 1 typecheck | PASS (exit 0) | `Block 1 PASS: tsc exit 0` | YES |
| Block 2 control panel HTML presence | FAIL (Implementer hasn't built — all 14 patterns absent) | FAIL — all 14 patterns reported missing verbatim | YES |
| Block 3 state-management JS presence | FAIL (all 8 patterns absent) | FAIL — all 8 patterns reported missing verbatim | YES |
| Block 4 test counts | FAIL (pass=620, fail=12 — pre-R83 baseline; not 636/13 predicted) | FAIL — `tests=636 pass=620 fail=12 skipped=4`; reported fail mismatch `12 ≠ 13` | YES |
| Block 5 anti-scope diff | PASS (empty diff at round-start) | `Block 5 PASS: 0 files in diff, all within ALLOWED_SET` | YES |
| Overall exit | non-zero (Blocks 2/3/4 fail) | exit 1 | YES |

**All probe-run outcomes match § C.3 predictions exactly.** No surprise failures; no command produced an unexpected output mode (no `--test-reporter=tap` mismatch — R77 OBS-4 lesson recurrence-prevented; no `local` keyword at top level — R75 MINOR-3 lesson recurrence-prevented).

Additional cross-check from probe-run output: at round-start HEAD `4c4733d`, the full test suite shows `ok 595 - AC-R82-14: git diff round-start..HEAD <= ALLOWED_SET` — confirming AC-R82-14 currently PASSES (the directive chore commit's diff is fully within R82's ALLOWED_SET; verified via `git diff 5c3e0d9 4c4733d --name-only` which returns 20 paths all matching R82 regex). At R83 chore-A, the additional R83-specific paths (`test/q83-interactive-knobs.test.ts`, `coordination/specs/Q-R83-*`, `coordination/reviews/REVIEWER-REPORT-R83.md`) are absent from R82's ALLOWED regex, so AC-R82-14 FLIPS to FAIL → drives the +1 strict fail-count increment encoded in spec § 5.2 (12 → 13).

**Probe-run gate verdict: PASS.** Spec triad commitable; Implementer dispatch authorized.

---

## § D. Decision rationale (verbose — held here, not in spec proper)

### D.1 Why Approach A (tool-edit + regenerate) over Approach B (inline-edit + marker preserve)?

Approach B mirrors the R82 smoke-block pattern. The pattern works for a one-off `<script type="module">` smoke test (which is structurally distinct from "the dashboard IIFE"). The pattern does NOT generalize to "every dashboard surface addition" because the regenerable HTML body is the canonical surface — preserved-islands are exceptions.

If R83 chose Approach B, then R84 (engine wiring) would face a structural dilemma: extend the inline-preserved R83 island? Or move R83 into the tool? Either path multiplies maintenance cost.

Approach A keeps "the dashboard" as one regenerable surface in the tool. R84's engine wiring is a straightforward extension of the same surface.

### D.2 Why `var controlState = {...}` global vs an encapsulated module pattern?

The existing IIFE in `tools/build-canned-demos.ts:1428+` uses `var` declarations at function scope:

```js
var scenarios = {};
var currentName = 'clean-baseline';
var currentWindowIdx = 0;
var playing = false;
var intervalHandle = null;
```

Adding `var controlState = {...}` to this pattern is the smallest-change-that-works. An encapsulated module pattern (Class-based, ES module, factory function) would force a refactor of the existing IIFE — anti-scope per directive ("NO modification of R73-R82 deliverables (frozen)").

R84 can refactor to encapsulation when the engine bundle import lands; AC-R83-10 binds the literal name `controlState`, and that AC's regex can be updated when R84 amends it.

### D.3 Why a single `CustomEvent` instead of `EventTarget` instance or RxJS-style observable?

The directive: "Decoupled from rendering (R84 Web Worker prep)". The simplest decoupling is a `CustomEvent` dispatched on `document` — any subscriber attaches `document.addEventListener('tessera:control-change', ...)`. No additional library, no instance to thread through the IIFE, no async semantics.

R84's Web Worker prep can attach the same event listener inside the Worker's host scope (or use `postMessage` to forward the detail to the Worker thread). The CustomEvent seam survives that refactor.

### D.4 Why 25 target shard options vs dynamically-populated based on topology size?

R83 ships UI surface only. Dynamic option repopulation requires the topology-size change listener to mutate the shard select's DOM children — a render-side concern. Per directive ("Decoupled from rendering"), the topology-size listener at R83 only updates state.

R84 can add a `tessera:control-change` subscriber that, when `topologySize` changes, updates the shard select options. That's the canonical extension point.

Alternative: ship 25 options (covering large topology); when topology size is small, options 6-24 are still selectable but their semantics are R84-defined. This keeps R83 surface tiny and forward-compatible.

### D.5 Why `console.log(JSON.stringify(controlState))` instead of a richer debug output?

Directive: "Console log on Run (R83 placeholder; R84 invokes engine)". The placeholder must be unambiguously NOT an engine invocation. `JSON.stringify(controlState)` is the standard "developer console preview" pattern and signals to a reader of the source: "this is intentional placeholder behavior, not unfinished work."

AC-R83-12's anti-regression clause (`must NOT include engine-bundle.mjs`) is the seam that prevents R83-versus-R84 scope drift.

---

## § E. Amendments from prior version

This is the first emission of Q-R83-SPEC.md. No amendments.

---

## § F. Architect role boundary verification

| Boundary | Verification |
|---|---|
| No implementation code written | The Architect did NOT write `tools/build-canned-demos.ts` edits — spec § 1.2/1.3/1.4 are prescriptive pseudocode that the Implementer copies into the tool. |
| No test files opened (read-only inspection ALLOWED for cite-then-verify) | The Architect READ `test/q82-engine-browser-bundle.test.ts` for pattern reference (allowed under R20 OBS-1 architect-research-policy); did NOT write or modify any `test/q*.ts` file at spec-emit. |
| All unresolved decisions → open questions | § 7 "None — all resolved." Pre-emit grilling Q.4 verified zero deferred decisions. |
| Spec triad committed BEFORE NEXT-ROLE.md routing block | Sequencing follows R21 ARCH MINOR-1: commit order at end of Architect session is `spec(R83) Q-R83-* triad` → `route(R83 ARCHITECT → IMPLEMENTER) routing block`. |

Role boundary preserved. PASS.

---

## § G. Cross-project rule alignment (Rule 1-7 explicit; CROSS-PROJECT-MEMORIAL.md derived)

| Rule | Sub-class / source | R83 application |
|---|---|---|
| Rule 1 | `empirical-command-attestation` (R26 / R72 / R77 / R79 / R70 canonical) | Spec § 5.2 prescribes verbatim observed binding-command attestation; § 6.2 routing block template has explicit `<ACTUAL>` placeholders; § 6.1 halt condition 1 + 3 enforce |
| Rule 2 | branch-binding coverage gate (R21 ARCH+IMPL MINOR-2/3) | Spec § 5 table: every event listener has an AC; AC-R83-10..13 cover all state-management branches |
| Rule 3 | self-application gate (Pre-emit grilling Q.5; tessera R74 MINOR-5 / R75 MINOR-3 / R81 MAJOR-3) | Spec § 8.5 walkthrough; verified every AC structurally satisfied by spec prescription |
| Rule 4 | cite-then-verify (R02 / R11 / R65 / R72 / R74 MINOR-1 / R58 MINOR-1) | Spec § 8.14 cite-then-verify table; every line citation grep-verified |
| Rule 5 | claim-then-walk + ALLOWED_SET forward-coverage (R79 / R80) | Spec § 8.13 walks prior 2 rounds' forward-protection ACs; R82 AC-R82-14 flip predicted |
| Rule 6 | encode-actual-results-verbatim (R03 / R26 / R30 / R44 / R65 / R77 MINOR-4) | Spec § 5.2 + § 6.2 routing block template; do NOT propagate predictions; HALT if observed != predicted |
| Rule 7 | halt-discipline / DIAGNOSTIC + ESCALATE never silent (R01 / R02 / R08 / R79 MAJOR-1) | Spec § 6.1 halt conditions enumerated; § 6.2 routing block template requires explicit STATUS field |

All 7 rules load-bearing at R83.
