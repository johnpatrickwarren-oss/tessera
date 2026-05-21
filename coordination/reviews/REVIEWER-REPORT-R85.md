# REVIEWER-REPORT-R85.md

**Round:** R85 (Phase 4 SLICE 3 close + Phase 4 close memorialization; Phase 4 FINAL ROUND)
**Tier:** full
**Reviewer entry HEAD SHA:** `d1b147d` (`d1b147d…`; verified at session entry via `git rev-parse --short HEAD`)
**Round-start SHA:** `f737877`
**Pre-Reviewer status (per NEXT-ROLE.md:3):** STATUS: READY (Coordinator-direct fix landed at `d1b147d`)
**Cold-review independence:** confirmed — diagnostics/ + logs/ + .prompt-*.md NOT read this session.

---

## § 1. Per-AC verification table

All 20 R85 ACs verified against the canonical test file `test/q85-slice-3-close.test.ts` + binding-command attestation at REVIEWER HEAD.

| AC-ID | Criterion (short) | Status | Evidence |
|---|---|---|---|
| AC-R85-1  | `#mode-toggle` fieldset + `<legend>Mode</legend>` in demo.html | **PASS** | `demos/demo.html:282-285` (fieldset markup); `<legend>Mode</legend>` confirmed via grep |
| AC-R85-2  | Two radio inputs `name="tessera-mode"` value `canned` + `live` | **PASS** | `demos/demo.html:284-285` (both `<input type="radio">` lines) |
| AC-R85-3  | `function setMode(` declared; both `'canned'` and `'live'` equality comparisons | **PASS** | `demos/demo.html:13098` setMode declaration; canned/live literals appear in body via `tools/build-canned-demos.ts:1787-1808` |
| AC-R85-4  | mode-radio change listener wired (`tessera-mode` selector + `addEventListener('change',…)`) | **PASS** | `demos/demo.html:13093` querySelectorAll on `input[name="tessera-mode"]`; `tools/build-canned-demos.ts:1846-1849` change listener |
| AC-R85-5  | `setAttribute('data-mode', ...)` invoked | **PASS** | `tools/build-canned-demos.ts:1791` `document.body.setAttribute('data-mode', mode)` |
| AC-R85-6  | CSS rule `body[data-mode='live'] #scenario-selector` | **PASS** | `tools/build-canned-demos.ts:1414` |
| AC-R85-7  | CSS rule `body[data-mode='canned'] #tessera-control-panel` (input/select/button selectors) | **PASS** | `tools/build-canned-demos.ts:1405-1411` |
| AC-R85-8  | `#engine-loading-indicator` exists + `@keyframes tessera-spin` declared | **PASS** | `demos/demo.html:383` element; CSS animation declared in tool source |
| AC-R85-9  | `#engine-run-status` exists + carries `aria-live` attribute | **PASS** | `demos/demo.html:387` (element + `aria-live="polite"`) |
| AC-R85-10 | `function updateRunStatus(stage,payload)` declared; all 5 stages (`reset`/`running`/`complete`/`error`/`cancelled`) present | **PASS** | `demos/demo.html:13128` declaration; 5 stage literals in `tools/build-canned-demos.ts:1817-1842` |
| AC-R85-11 | `r85ShowLoadingSpinner` + `r85HideLoadingSpinner` declared AND invoked | **PASS** | declarations at `demos/demo.html:13122,13125`; invocations at `tools/build-canned-demos.ts:1873,1915,1930,1936,1944,1956` |
| AC-R85-12 | `## Contents` ToC + Live mode entry | **PASS** | `demos/DEMO-SCRIPT.md:15` (`## Contents`); Live mode bullet at `demos/DEMO-SCRIPT.md:22` |
| AC-R85-13 | `## Minute 10:00 – 12:00 — Live mode (interactive)` section + Cancel/Run/Worker content | **PASS** | `demos/DEMO-SCRIPT.md:186` heading; section body 186-231 mentions Cancel (line 220), Run (line 203/219), Worker (line 197/209) |
| AC-R85-14 | README `### Browser dashboard` mentions Live mode + DEMO-SCRIPT cross-ref | **PASS** | `README.md:85-91` (paragraph; `Live mode toggle` + DEMO-SCRIPT.md cross-ref present) |
| AC-R85-15 | `~/.claude/CROSS-PROJECT-MEMORIAL.md` contains `haiku-mu-status-field-disambiguation` + `TOP-OF-FILE STATUS` phrase | **PASS** | `~/.claude/CROSS-PROJECT-MEMORIAL.md:4520` |
| AC-R85-16 | `architect-encoded-regex-with-hardcoded-bounds` + `{0,N}` phrase | **PASS** | `~/.claude/CROSS-PROJECT-MEMORIAL.md:4521` |
| AC-R85-17 | `vendored-at-pin → vendored-with-deltas reclassification precedent` + R56 + R82 cites | **PASS** | `~/.claude/CROSS-PROJECT-MEMORIAL.md:4522` |
| AC-R85-18 | R71/R79/R80/R81/R82/R83/R84 markers preserved (18+ assertions) | **PASS** | All markers confirmed present via grep against demos/demo.html |
| AC-R85-19 | `git diff f737877 HEAD --name-only` ⊆ ALLOWED_SET | **PASS** | 12 paths in diff; all matched by ALLOWED regex (`README.md`, `MEMORIAL.md`, `NEXT-ROLE.md`, two DIAGNOSTIC-R85-*.md, `Q-R85-EMPIRICAL.sh`, `Q-R85-SPEC-AUDIT.md`, `Q-R85-SPEC.md`, `DEMO-SCRIPT.md`, `demo.html`, `q85-slice-3-close.test.ts`, `tools/build-canned-demos.ts`) |
| AC-R85-20 | Typecheck side-channel (`q85-slice-3-close.test.js` exists) + EMPIRICAL.sh Block 1..5 markers | **PASS** | `test/q85-slice-3-close.test.js` exists; all 5 block markers present in EMPIRICAL.sh |

**Isolated `q85-slice-3-close.test.js` run (verbatim TAP tail at REVIEWER HEAD):**
```
1..20
# tests 20
# pass 20
# fail 0
# skipped 0
```
All 20 R85 ACs pass deterministically in isolation. ✓

---

## § 2. Findings

### CRITICAL-1 — EMPIRICAL.sh exits non-zero intermittently at REVIEWER HEAD (Halt-3 fires ~25% of runs; routing READY is premature)

**File:** `coordination/specs/Q-R85-EMPIRICAL.sh:162` (strict `EXPECTED_FAIL=16`); `coordination/specs/Q-R85-SPEC.md:§5.2` (strict prediction `# fail = 16`); `coordination/NEXT-ROLE.md:14` (Coordinator attestation `tests=689/pass=669/fail=16/skipped=4`).

**Empirical observation at REVIEWER HEAD, 8 independent full-suite runs:**

| Run | tests | pass | fail | skipped | EMPIRICAL.sh Block 4 |
|---|---|---|---|---|---|
| 1 | 689 | 668 | **17** | 4 | FAIL (Halt-3) |
| 2 | 689 | 669 | 16 | 4 | PASS |
| 3 | 689 | 669 | 16 | 4 | PASS |
| 4 | 689 | **668** | **17** | 4 | FAIL (Halt-3) |
| 5 | 689 | 669 | 16 | 4 | PASS |
| 6 | 689 | 669 | 16 | 4 | PASS |
| 7 | 689 | 669 | 16 | 4 | PASS |
| 8 | 689 | 669 | 16 | 4 | PASS |

Flake rate ≈ 2/8 = 25%. The extra failure is AC-R84-14 `worker.terminate() halts further message emission` — the structurally-flaky Worker race documented at R84 REVIEWER MINOR-2 (MEMORIAL.md:2583) and at R85 Implementer ESCALATE HALT-2 (`coordination/diagnostics/DIAGNOSTIC-R85-ac-r84-14-baseline-drift.md`).

**Why this is CRITICAL:**

1. Per Q-R85-SPEC.md `§ 6.1 halt conditions`, Halt-3 (`# fail ≠ 16`) is enumerated as a HALT condition. The current EMPIRICAL.sh strict prediction trips Halt-3 in ~25% of runs at REVIEWER HEAD, meaning the round's binding-command attestation is **non-deterministic against its own halt rules**.
2. Per cross-project Rule 1 sub-class `empirical-command-attestation` (the very rule R85 promotes at canonical landing): the strict-prediction-vs-band question is exactly the kind of pattern Rule 1 governs. A strict `fail=16` that observed-value diverges from in ~25% of runs IS the rule-1 attestation failure mode, applied to the round that promotes the rule.
3. The Coordinator-direct fix at SHA `d1b147d` `NEXT-ROLE.md:14` attests `fail=16` with the framing "AC-R84-14 flakiness apparently resolved between R85 chore-A and Coordinator re-run." This attestation is empirically false at REVIEWER HEAD — the flake is not resolved; it's intermittent.
4. The R85 Implementer's ESCALATE block at `coordination/NEXT-ROLE.md:7011-7022` explicitly proposed **Option B** as the procedurally-disciplined resolution: "Operator directs Implementer to re-run full suite 3× and attest majority fail count." The d1b147d resolution applied neither Option A (band-amend the spec) nor Option B (3× majority attest) — it ran the suite once, observed `fail=16`, and declared the flake resolved.

**Attestation-vs-script-correctness classification (per CLAUDE-REVIEWER REINFORCED 2026-05-19, R45 lineage):**

The substantive R85 deliverable IS sound — all 20 R85 ACs pass in isolation; all 5 directive deliverables landed (live-mode toggle, DEMO-SCRIPT extension, README, cross-project promotions, test file). The CRITICAL is at attestation level: the strict `fail=16` prediction is empirically wrong in ~25% of runs because of a pre-R85 carry-forward flake (AC-R84-14). Per the REINFORCED rule's R45-derived guidance: **set STATUS: ESCALATE with explicit framing for operator decision** (Option A spec/EMPIRICAL.sh band-amend vs MERGE-READY-with-reservations). Reviewer routes ESCALATE per the canonical rule + R45 reinforcement.

**Recommended operator resolution (Reviewer does not fix; documents options):**

- **Option A (recommended):** Amend `Q-R85-EMPIRICAL.sh:162` `EXPECTED_FAIL=16` → band `16 ≤ fail ≤ 17`; amend `Q-R85-SPEC.md § 5.2` prediction to `# fail: 16-17 (band; ±1 for AC-R84-14 structural flakiness)`; record `architect-encoded-strict-prediction-against-pre-existing-flake` as a sub-class instance of the very rule R85 promotes. This is the architect-encoded-pattern-not-verified-against-prescribed-implementation pattern applied at the count-prediction level.
- **Option B:** Maintain strict `fail=16` and require Implementer/Coordinator to retry until 3 consecutive deterministic `fail=16` runs are attested. Brittle; ties round-close to environmental luck.
- **Option C** (MERGE-READY-with-reservations route): Acknowledge attestation-level brittleness as TD; close R85 substantive deliverable; defer Option A spec-band-amend to R86 as a methodology-housekeeping item. NOT recommended because the rule R85 promotes would have caught this at spec-emit had Q.17 self-application been applied to count-predictions, not just to in-test regex.

---

### MAJOR-1 — Coordinator-direct fix at d1b147d violated the ESCALATE block's own Option B prescription

**File:** `coordination/NEXT-ROLE.md:7011-7022` (Implementer ESCALATE HALT-2 block, Option enumeration); commit `d1b147d` (Coordinator fix).

The R85 Implementer's ESCALATE block enumerated two procedurally-disciplined paths to resolve HALT-2:

> **Option A** (recommended if majority fail count is 17): Operator amends Q-R85-EMPIRICAL.sh Block 4 to `EXPECTED_FAIL=17` (or band 16–17) + amends spec § 5.2 prediction to `fail: 16–17 (band; ±1 for AC-R84-14 structural flakiness)`.
>
> **Option B**: Operator directs Implementer to re-run full suite 3× and attest majority fail count. If majority=16, proceed with fail=16 attestation + TD disclosure of AC-R84-14 non-determinism (no spec amendment needed). If majority=17, proceed to Option A.

Commit `d1b147d` `NEXT-ROLE.md:14`: "Re-attestation at fix HEAD shows `tests=689 / pass=669 / fail=16 / skipped=4`. AC-R84-14 flakiness apparently resolved between R85 chore-A and Coordinator re-run. No code change needed."

The Coordinator ran the suite once, observed `fail=16`, declared the flake resolved, and routed READY without:
- (Option A) amending the spec/EMPIRICAL.sh to band the prediction, OR
- (Option B) running 3× and attesting majority.

A single-run attestation is exactly the discipline failure that the R85-promoted rule canonically guards against. The Coordinator's framing "flakiness apparently resolved" is itself a Rule 1 false-compliance attestation (per `~/.claude/CROSS-PROJECT-MEMORIAL.md` Rule 1): the observed value got reframed as a definitive state ("resolved") instead of a single-run sample. The Reviewer's 8-run independent re-attestation shows the flake is not resolved; it's stochastic at ~25%.

This is MAJOR because: (a) it's the canonical R85-promoted rule's exact failure mode applied to the R85 close itself, (b) the procedurally-correct path was enumerated in writing in the Implementer ESCALATE block and skipped, (c) it directly causes CRITICAL-1 (EMPIRICAL.sh non-determinism at routing HEAD).

---

### MAJOR-2 — Q.17 self-application gate (spec § 8.17) scope-gap: the gate covered in-test regex but NOT harness-script patterns

**File:** `coordination/specs/Q-R85-SPEC.md § 8.17` (self-application gate); `coordination/specs/Q-R85-EMPIRICAL.sh:104-105` (the broken awk range as committed at chore-A 225e860, pre-d1b147d fix).

R85 promotes `architect-encoded-regex-with-hardcoded-bounds` as a Rule 1 sub-class (canonical-landing). The spec's Q.17 self-application gate at § 8.17 walks each R85 AC and concludes "ZERO ACs in R85 use `{0,N}?` char-bounded quantifier. Self-application gate PASS." This walk is correct as far as it goes — but it ONLY covers the in-test regex within `test/q85-slice-3-close.test.ts`.

The rule canonically landed in `~/.claude/CROSS-PROJECT-MEMORIAL.md:4521` is broader: "When an Architect spec § AC prescribes a regex that captures a code region by character-bounded quantifier… the Architect must verify EMPIRICALLY at spec-emit that the captured region encompasses the asserted substring at the SPEC's prescribed implementation." The rule reaches **any** architect-encoded pattern in any spec-triad artifact, including `Q-R85-EMPIRICAL.sh`.

The Q-R85-EMPIRICAL.sh `Block 3` awk command as committed at chore-A 225e860 (`awk '/^### Browser dashboard/,/^### /'`) is a textbook instance of an **architect-encoded pattern not empirically verified against the prescribed implementation**. The `/start/,/end/` range matches both patterns on the same line because the start heading itself matches `^### `. § 8.6 (empirical premise verification) ran the EMPIRICAL.sh at round-start but reported "Block 3 fails at round-start (Live mode section absent; Browser dashboard paragraph absent)" — masking the awk defect because Block 3 was failing for a different (correct) reason. § 8.10 + § 8.17 did not include a probe against the prescribed README.md insertion (`§ 1.6` text) to confirm the awk would extract it.

The defect surfaced at chore-A (the Implementer correctly halted on it as HALT-1), and the Coordinator-direct fix at d1b147d patched the awk. **The Q.17 self-application gate as documented in § 8.17 would not have caught this.** The gate's scope-gap is the architect-encoded-pattern equivalent of "the very rule R85 promotes" — the round's own pre-emit grilling did not apply the rule with its full canonical scope to its own spec triad.

This is the **N+1th instance of architect-encoded-pattern-not-verified-against-prescribed-implementation** (as the d1b147d commit message itself observes). Cumulative count now: R62 + R66 + R68 + R72 + R83 + R84 + R85-EMPIRICAL-Block-3 = 7 Tessera instances of the same canonical sub-class.

This is MAJOR because: (a) it's a self-application gate scope gap by definition (the rule promoted in this round did not apply with its canonical scope to the round's own artifacts), (b) it directly produced the Implementer HALT-1 ESCALATE, (c) Reviewer cold-eye independent re-application of the rule's canonical scope to the spec's harness-script patterns would have caught the awk defect at spec-emit had it been in the § 8.17 walk.

---

### MAJOR-3 — Coordinator's "resolved" attestation in NEXT-ROLE.md:14 is empirically false at REVIEWER HEAD

**File:** `coordination/NEXT-ROLE.md:14` (Coordinator fix attestation); commit `d1b147d` (Coordinator-direct fix).

Verbatim Coordinator attestation: "Fix 2 (fail=17 baseline drift): Re-attestation at fix HEAD shows `tests=689 / pass=669 / fail=16 / skipped=4`. AC-R84-14 flakiness apparently resolved between R85 chore-A and Coordinator re-run. No code change needed."

Two empirical claims:
1. **`tests=689 / pass=669 / fail=16 / skipped=4` at fix HEAD** — true for the specific run the Coordinator did at d1b147d, false in ~25% of runs at REVIEWER HEAD (`fail=17`).
2. **"AC-R84-14 flakiness apparently resolved"** — empirically false; the flake is stochastic, not deterministically resolved. The R84 REVIEWER MINOR-2 documentation (MEMORIAL.md:2583) said: "the race is real and structural (worker_threads.terminate() is async; synchronous message emission can outrun it). The discriminating property 'fewer than 50 messages' is satisfied probabilistically, not by terminate() actually pre-empting emission." A structural race condition does not "resolve itself" between commits where the engine-worker.js code is unchanged (R85 explicitly preserves R84's engine-worker.js).

The "apparently resolved" hedge ("apparently") is itself a tell that the Coordinator did not run the 3× majority discipline (Option B) the ESCALATE block prescribed. This is a Rule 1 (`false-compliance-attestation`) sub-class violation at the Coordinator-decision level, applied to the round whose own architect-promoted Rule 1 sub-class (`empirical-command-attestation`) governs exactly this attestation pattern.

MAJOR because: (a) the false attestation is at the routing-block level visible to all downstream roles (the Reviewer arrives expecting fail=16 deterministic; finds intermittent fail=17), (b) it propagates a single-run sample as a definitive baseline contrary to the canonical Rule 1 sub-class the round itself promotes, (c) Reviewer's cold-eye 8-run characterization refuted it directly.

---

### MINOR-1 — DEMO-SCRIPT.md ToC anchor format may not match GitHub's auto-anchor algorithm

**File:** `demos/DEMO-SCRIPT.md:22` ToC bullet `[Minute 10:00 – 12:00 — Live mode (interactive)](#minute-1000--1200--live-mode-interactive)`; `:186` heading `## Minute 10:00 – 12:00 — Live mode (interactive)`.

GitHub-flavored Markdown auto-anchor for `## Minute 10:00 – 12:00 — Live mode (interactive)`:
- Lowercase: `minute 10:00 – 12:00 — live mode (interactive)`
- Strip punctuation except `-` and `_`: `minute 1000  1200  live mode interactive` (colon `:` stripped; em-dash `—` stripped; en-dash `–` stripped; parens stripped)
- Collapse whitespace to single hyphens: `minute-1000--1200--live-mode-interactive`

The ToC anchor `#minute-1000--1200--live-mode-interactive` matches this construction. AC-R85-12 binds the anchor literal text and passes; the anchor appears well-formed.

However: the README cross-reference at `README.md:90` uses the same anchor `#minute-1000--1200--live-mode-interactive`. The cross-reference works in the local file but its survival across rendering contexts (e.g., docs site rendering with a different anchor algorithm, file-system path resolution if README is rendered detached from the demos/ directory) is not AC-bound. AC-R85-14 only asserts the cross-reference string IS present, not that it resolves.

Discriminating-property note: AC-R85-13 binds the section heading verbatim; the anchor must derive from that heading. The anchor is structurally correct. OBS rather than MINOR-elevation could be argued; classifying as MINOR because the cross-ref's render-target tolerance is undocumented in the spec.

---

### MINOR-2 — Spec § 1.11 + § 5.2 cited a `# pass` band [668, 670] but observed value (668 OR 669, depending on AC-R84-14 stochasticity) is on the band-bottom edge

**File:** `Q-R85-SPEC.md § 5.2`; `coordination/specs/Q-R85-EMPIRICAL.sh:160-161` (`EXPECTED_PASS_MIN=668`, `EXPECTED_PASS_MAX=670`).

The band [668, 670] was derived from R84 close `pass=650 − 1 forward-protection flip + 20 R85 new = 669` ± 1 PRNG/environment margin. Observed `pass` at REVIEWER HEAD across 8 runs: 6 × 669, 2 × 668. The lower edge (668) coincides exactly with `fail=17` (since tests=689, skipped=4 are fixed: pass + fail = 685, fail=17 ⟹ pass=668; fail=16 ⟹ pass=669). The band is technically correct (both 668 and 669 are within [668, 670]), but the +1/-1 margin was rationalized as "PRNG/environment margin" in the spec — the actual cause is AC-R84-14 structural flakiness, not PRNG noise.

This is a misframed-rationale finding: the band is correct in arithmetic but the spec's documented reasoning for the band is the wrong reason. The cited reason ("±1 PRNG/environment margin") masks the actual structural-race cause. Under canonical Rule 1 sub-class `empirical-command-attestation`: "encode the ACTUAL observed value — never reframe errors to match the AC literal, never propagate spec-predicted counts as observed." The misframing is at the rationale level, not the value level — `pass` ∈ [668, 670] does observe correctly; the band exists for the right (post-hoc) reason; the cited (a-priori) reason is wrong.

MINOR because the band's coverage is correct in practice; the architect's a-priori rationale was wrong-but-fortunate. A future R86 cleanup could replace the documented PRNG-margin rationale with the AC-R84-14-structural-flake rationale + a band-on-fail amendment to match.

---

### MINOR-3 — Cross-project canonical landing of `haiku-mu-status-field-disambiguation` from 4 same-project (Tessera) instances may be in tension with Rule 7 cross-project derivation gate

**File:** `~/.claude/CROSS-PROJECT-MEMORIAL.md:4520` (the canonical-landed `haiku-mu-status-field-disambiguation` entry); `~/.claude/CROSS-PROJECT-MEMORIAL.md:3514` (Rule 7 canonical text).

The haiku-mu entry cites four Tessera instances (R75, R78, R80, R83) and concludes "Cross-project canonical landing at Tessera R85 closes the 4-instance pattern." All 4 instances are from a single project (Tessera).

Rule 7 (`derived-rule-propagation-mechanism-required`) at line ~3478/3514 establishes a cross-project derivation gate: in summary, canonical landing of a NEW rule requires the cross-project propagation gate (3rd instance from a different project crosses the gate).

The third R85 promotion entry — `vendored-at-pin → vendored-with-deltas reclassification precedent` — explicitly honors this gate by documenting itself as a 2-instance Tessera flag with 3rd-instance reservation: "Cross-project canonical landing reserved until 2nd-project instance." The same Rule 7 discipline applied to `haiku-mu-status-field-disambiguation` would require a 2nd-project (not Tessera) instance before cross-project canonical landing.

The architect's framing distinguishes these as Rule 1 **sub-class** promotions (`Rule 1 sub-class haiku-mu-…`) vs new top-level rules. If Rule 7's cross-project derivation gate applies only to NEW top-level rules and not to sub-class refinements of existing canonical rules, then haiku-mu's canonical landing is consistent. The spec § 1.7 framing implies this interpretation but does not cite Rule 7 explicitly to justify the asymmetric treatment between haiku-mu (4-same-project → cross-project canonical) and vendored-at-pin (2-same-project → flag-not-promoted).

MINOR because: (a) the framing is internally consistent under the "sub-class is exempt from Rule 7 gate" reading, (b) the asymmetric treatment is not documented as a Rule-7-interpretation decision, (c) future projects landing sub-class promotions from same-project-only instances will encounter the same ambiguity. An R86 housekeeping item could add a Rule 7 § "sub-class interpretation" addendum to disambiguate.

---

### OBS-1 — Spec § 8.10 R84-AC non-regression walk concluded "16 of 17 R84 ACs continue to pass" but did not explicitly enumerate AC-R84-14 flakiness in the predicted-flips-or-flakes column

**File:** `coordination/specs/Q-R85-SPEC.md § 8.10 R84-AC non-regression walk`.

The walk predicted "AC-R84-16 (anti-scope diff) — predicted to flip" and "AC-R84-15 (anti-regression markers) — predicted PASS." It did not flag "AC-R84-14 (worker.terminate halts emission) — predicted PASS but structurally flaky per R84 REVIEWER MINOR-2." Had the walk surfaced AC-R84-14's documented pre-existing flake, § 5.2 would naturally have produced a banded `fail: 16-17` prediction at spec-emit, pre-empting the chore-A HALT-2 ESCALATE.

This is OBS because the AC-R84-14 flake was documented in MEMORIAL.md and discoverable; the spec § 8.10 walk made a coverage choice to focus on pass/flip predictions over flake-likelihood predictions. An R86 SPEC-AUTHORING-CHECKLIST.md addendum could codify "for each prior-round AC documented as flaky, predict the flake's contribution to fail-count band."

---

### OBS-2 — Spec § 1.11 + § 5.2 predicted `git diff` line count band 9-14; observed 12 (within band)

**File:** `Q-R85-SPEC.md § 1.11`; `coordination/diagnostics/DIAGNOSTIC-R85-ac-r84-14-baseline-drift.md` + `DIAGNOSTIC-R85-empirical-readme-awk.md` (the 2 diagnostic files in the diff).

Observed diff: 12 files (per `git diff f737877 HEAD --name-only`). Within predicted band 9-14. The diagnostic files are within ALLOWED_SET regex (`coordination/diagnostics/DIAGNOSTIC-R[0-9]+-.*\.md`). No finding; included as audit-trail confirmation.

---

### OBS-3 — All 20 R85 ACs are well-discriminating and use only the patterns the round's own promoted rule recommends (`.includes()` on unique multi-word slugs; narrow non-bounded regex; section-bounded extraction via split-on-Markdown-heading)

**File:** `test/q85-slice-3-close.test.ts`.

The author's Rule 5 self-application discipline is visible in the test file: ZERO `{0,N}?` quantifiers; section bounds use `split(/^## /m)` natural Markdown boundaries; slug presence uses `.includes()` against multi-word unique strings. This is exactly the discipline the canonical Rule 1 sub-class prescribes. The discipline failure documented in CRITICAL-1 + MAJOR-1/2/3 is at the **harness-script + count-prediction** scope, NOT at the in-test-AC scope. The in-test ACs are exemplary.

---

## § 3. Right-reasons audit (3 tests)

### Test A: AC-R85-3 (`function setMode(mode)` declared with both `canned` and `live` literals)

- **Spec requirement traceability:** Q-R85-SPEC.md § 1.4 prescribes `function setMode(mode) { if (mode !== 'canned' && mode !== 'live') return; … }`. The AC binds the function-declaration regex + both-literals-present.
- **Right-reason verification:** mutation analysis — removing `function setMode(` line in the tool template would fail the regex check; removing either equality branch would fail the literal-presence check. The test passes because the canonical setMode implementation IS in `tools/build-canned-demos.ts:1787-1808` (and is regenerated into `demos/demo.html:13098-13120`), not because the test is constructed to confirm an implementation choice arbitrary to spec. The discriminating property tracks the spec verbatim.
- **Verdict:** PASS for right reason. ✓

### Test B: AC-R85-13 (DEMO-SCRIPT.md Minute 10:00 – 12:00 section + Cancel/Run/Worker content)

- **Spec requirement traceability:** Q-R85-SPEC.md § 1.5 insertion B prescribes the `## Minute 10:00 – 12:00 — Live mode (interactive)` section verbatim, including Cancel beat, Run beat, and Worker (Web Worker) mentions.
- **Right-reason verification:** AC uses `DEMO_SCRIPT.split(/^## Minute 10:00/m)[1]` to extract section body bounded by next `## ` heading. Mutation analysis: omitting the Cancel beat (e.g., narrating only the Run beat without the Cancel demonstration) would fail. Omitting Worker mention (e.g., narrating Live mode without explaining the Web Worker architecture) would fail. The section bounds use natural Markdown boundaries (Rule 1 sub-class compliance — no `{0,N}?` capture); the discriminating-property check is canonical.
- **Verdict:** PASS for right reason. ✓

### Test C: AC-R85-17 (CROSS-PROJECT-MEMORIAL.md has vendored-at-pin reclassification precedent + R56 + R82 cites)

- **Spec requirement traceability:** Q-R85-SPEC.md § 1.7 prescribes the verbatim 3-promotion text including the vendored-at-pin reclassification precedent entry citing R56 verdict.ts + R82 topology-overlay.ts instances + Rule 7 3rd-instance reservation framing.
- **Right-reason verification:** AC uses `.includes()` against the canonical multi-word slug `vendored-at-pin → vendored-with-deltas reclassification precedent` (with ASCII `->` fallback) + asserts both `R56` and `R82` substrings appear in the file. Mutation analysis: dropping R56 OR R82 from the entry text would fail; replacing the canonical slug with a paraphrase would fail. The discriminating property anchors on canonical, copy-stable identifiers, NOT on full-paragraph verbatim text — robust to legitimate copy iteration of the entry body.
- **Verdict:** PASS for right reason. ✓

All 3 audited tests pass for traceable-to-spec reasons. Self-confirming-test risk is low.

---

## § 4. Cross-cutting checks

### 4.1 TDD discipline

- **RED commit `0799441`** committed BEFORE GREEN; git history shows `test(R85 RED): 20 assert.fail stubs for SLICE 3 close ACs` 3 commits before chore-A `2be521a` ("chore(R85 ESCALATE): implementation complete; two EMPIRICAL.sh halt conditions"). RED→GREEN ordering verifiable by `git log --oneline`. ✓
- The RED commit's 20 `assert.fail('R85 RED: ' + ac_id)` stubs are structurally distinct from the canonical 20-AC test body in § 1.8 (per spec § 4.1 chore-A sequence). TDD separate-RED-commit discipline honored (per R23 IMPL MINOR-1).

### 4.2 No-skip / halt discipline

- The R85 Implementer fired halt discipline correctly: HALT-1 (broken awk) + HALT-2 (fail=17 drift) both triggered DIAGNOSTIC writes and STATUS: ESCALATE per CLAUDE-IMPLEMENTER discipline. No silent EMPIRICAL.sh amendments. No reframed counts. The Implementer's halt-discipline is exemplary.
- The Coordinator-direct fix at d1b147d, however, **did not** follow the ESCALATE block's prescribed Option B (3× majority) — this is the MAJOR-1 finding above. Halt discipline AT THE COORDINATOR-DECISION LEVEL was not honored.

### 4.3 Anti-scope

- All 12 files in `git diff f737877 HEAD --name-only` are within Q-R85-EMPIRICAL.sh Block 5 ALLOWED regex. ✓
- `demos/scenarios/*.json` byte-identical to round-start (Halt-9 clear). ✓
- `demos/engine-worker.js` UNCHANGED (R84-frozen). ✓
- `engine/*` UNCHANGED (Phase 3 + R82 frozen). ✓
- `run-pipeline.sh` UNCHANGED (PR #39 anti-scope respected). ✓
- `package.json` / `pnpm-lock.yaml` UNCHANGED (no new deps). ✓
- ALL 18 R71/R79/R80/R81/R82/R83/R84 markers preserved per AC-R85-18. ✓
- No scope addition beyond the directive's 5-deliverable enumeration. ✓

Anti-scope discipline is clean.

---

## § 5. Grilling output on this report

| Check | Verdict |
|---|---|
| Every finding has a file:line reference? | **Yes** — CRITICAL-1 cites `Q-R85-EMPIRICAL.sh:162`, `Q-R85-SPEC.md:§5.2`, `NEXT-ROLE.md:14`; MAJOR-1 cites `NEXT-ROLE.md:7011-7022` + commit d1b147d; MAJOR-2 cites `Q-R85-SPEC.md § 8.17` + `Q-R85-EMPIRICAL.sh:104-105`; MAJOR-3 cites `NEXT-ROLE.md:14`; MINOR-1 cites `DEMO-SCRIPT.md:22,186` + `README.md:90`; MINOR-2 cites `Q-R85-SPEC.md § 5.2` + `Q-R85-EMPIRICAL.sh:160-161`; MINOR-3 cites `~/.claude/CROSS-PROJECT-MEMORIAL.md:4520,3514`; OBS-1 cites `Q-R85-SPEC.md § 8.10`; OBS-2 cites `Q-R85-SPEC.md § 1.11`. ✓ |
| Any AC marked PASS without actual verification? | **No** — every AC's evidence column cites a concrete file:line or test output. Isolated `q85-slice-3-close.test.js` run produced 20/0/0 verbatim. EMPIRICAL.sh Blocks 1, 2, 3 (post-d1b147d), 5 all PASS at REVIEWER HEAD; Block 4 intermittent per CRITICAL-1. ✓ |
| Right-reasons audit completed for 3+ tests? | **Yes** — Tests A (AC-R85-3), B (AC-R85-13), C (AC-R85-17) audited with mutation analysis + spec traceability. ✓ |
| Adversarial mandate honored (at least one finding)? | **Yes** — 1 CRITICAL + 3 MAJOR + 3 MINOR + 3 OBS = 10 findings total. The CRITICAL is the round's own promoted-rule failure mode applied to the round's close itself, surfaced by independent 8-run empirical re-attestation that the Coordinator-direct fix's 1-run attestation did not perform. ✓ |
| ROLE BOUNDARY honored (document findings, do not fix)? | **Yes** — Reviewer enumerates options for operator/architect decision in CRITICAL-1 + MAJOR-1; does not modify Q-R85-EMPIRICAL.sh, Q-R85-SPEC.md, or NEXT-ROLE.md beyond appending this report path + the Reviewer routing block at session close. ✓ |

---

## § 6. Routing

Per CLAUDE-REVIEWER.md routing rule:
> CRITICAL exists → STATUS: ESCALATE
> MAJOR or below  → STATUS: MERGE-READY

CRITICAL-1 exists. **STATUS: ESCALATE**.

Per CLAUDE-REVIEWER REINFORCED 2026-05-19 (R45 lineage) — explicit framing for attestation-level CRITICAL with sound substantive deliverable:

> **Operator decision: route MERGE-READY (substantive deliverable sound — all 20 R85 ACs pass deterministically; all 5 directive deliverables landed; anti-scope clean; R84 surfaces preserved; ~25% EMPIRICAL.sh non-determinism is an attestation-level brittleness of strict `fail=16` against intermittent AC-R84-14 flake, not a deliverable correctness issue) OR ESCALATE (CRITICAL strict reading — Q-R85-EMPIRICAL.sh exits non-zero in ~25% of runs at HEAD; Halt-3 fires intermittently; routing READY is empirically premature pending Option A spec/EMPIRICAL.sh band-amend OR Option B 3-deterministic-run attestation).**

Reviewer recommendation: **Option A spec/EMPIRICAL.sh band-amend** is the lowest-friction discipline-honoring path. Amend `Q-R85-EMPIRICAL.sh:162` `EXPECTED_FAIL=16` → support both 16 and 17 (e.g., `[ "$FAIL" = 16 ] || [ "$FAIL" = 17 ]`); amend `Q-R85-SPEC.md § 5.2` strict `fail=16` → `fail: 16-17 (band; ±1 for AC-R84-14 structural flakiness per R84 REVIEWER MINOR-2)`; document the amendment as the N+1th instance of the very rule R85 promotes (`architect-encoded-pattern-not-verified-against-prescribed-implementation` applied at the count-prediction level). The amendment naturally closes R85 in alignment with the rule it canonically lands. Memorial-Updater can then memorialize.

---

## § 7. Reviewer attestation summary

- **Cold review independence:** verified — diagnostics/ + logs/ + .prompt-*.md NOT read.
- **Per-AC verification:** all 20 R85 ACs PASS (deterministic in isolation; full-suite non-deterministic per CRITICAL-1).
- **Substantive deliverable:** sound (5/5 directive deliverables landed; anti-scope clean; R84 surfaces preserved).
- **Findings count:** 1 CRITICAL + 3 MAJOR + 3 MINOR + 3 OBS.
- **Routing:** STATUS: ESCALATE (attestation-level CRITICAL; substantive deliverable sound; explicit operator-decision framing per CLAUDE-REVIEWER REINFORCED 2026-05-19).
- **Anti-discipline pattern observed:** the round canonically lands the rule `architect-encoded-regex-with-hardcoded-bounds` (sub-class of `Architect-claim-without-empirical-walk`) and exhibits 3 instances of the same canonical sub-class within its own close (MAJOR-2 = awk pattern at spec-emit; CRITICAL-1 + MAJOR-1 + MAJOR-3 = strict count prediction at spec-emit + single-run Coordinator attestation + "resolved" framing). The very-rule-this-round-promotes is exhibited inside the round's own artifacts at canonical-landing moment — Rule 5 self-application gate scope-gap.
- **Recommended operator resolution:** Option A — amend EMPIRICAL.sh + spec § 5.2 to band the prediction; record the amendment as the N+1th canonical-sub-class instance. Memorial-Updater proceeds normally after operator amendment.
