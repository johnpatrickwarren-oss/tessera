# ROUND-R77-SUMMARY — Detection envelope (low-magnitude SDC characterization)

**Tier:** full (Architect + Implementer + Reviewer + Memorial-Updater)
**Round-start SHA:** `0d64d9a`
**Close HEAD:** `a08180a` (post operator Option-A fix)
**Result:** MERGE-READY (0 CRITICAL / 1 MAJOR / 4 MINOR / 5 OBS)
**Primary deliverable:** 504-cell detection-envelope matrix (14 magnitudes × 6 windows × 3 α thresholds × 2 families × 5 trials); 17 ACs all PASS empirically at HEAD.

---

## What worked

- **Spec-triad quality (Architect):** Brainstorm documented 3 approaches with strengths/weaknesses/rejected rationale. 13 CONFIRMATION entries recorded by Architect. Engine signatures all verified by direct file read at session entry (not from memory). Baseline test counts empirically run at round-start SHA. Family C interpretation recorded as a load-bearing architectural choice (not a silent decision). Spec cross-section consistency sweep caught zero internal contradictions. Idempotency (LCG-seeded deterministic runner), anti-scope, and ALLOWED_SET design all sound.

- **Halt-discipline (Implementer):** EMPIRICAL.sh Block 2 exited non-zero at chore-A due to an Architect-authored defect (`--test-reporter=tap` omitted). Implementer correctly applied halt discipline: wrote `DIAGNOSTIC-R77-empirical-sh-block2-reporter.md`, set STATUS: ESCALATE, presented bounded Option A / Option B with empirical verification commands. Did NOT silently absorb or claim TACTICAL AUTONOMY to self-resolve. Operator chose Option A (Coordinator-direct fix; commit `a08180a`).

- **Deliverable quality (Implementer):** All 17 R77 ACs pass. Matrix is 504 cells; schema_version, field shapes, and idempotency all verified. Family C pure-ONS interpretation integrated correctly against engine primitives; comparison at mid-magnitude cells shows Family A dominates Family C at short-window/low-magnitude boundary.

- **Cold-eye audit quality (Reviewer):** 1 MAJOR + 4 MINOR + 5 OBS findings; adversarial mandate honored. All binding commands re-run at HEAD with actual outputs recorded verbatim. Right-reasons audit on 3 tests found all non-self-confirming. Context isolation maintained (diagnostics/logs not consulted). MERGE-READY routing correctly applied (MAJOR is procedural, not substantive).

- **Anti-scope (Implementer):** engine/ + all frozen tools/scripts + R72 outputs byte-identical at HEAD. No new external dependencies. Carry-forward fail set preserved at exactly 5 entries.

---

## What violated discipline (role, discipline, what happened)

**IMPLEMENTER — tdd-discipline (MAJOR-1)**
Feat commit `56992bd` landed 8 files including test file + implementation files in ONE combined commit with the message "17 ACs green." No prior commit shows test stubs in a failing RED state. The rule (REINFORCED TDD-SEPARATE-RED-COMMIT, R23 MINOR-1 origin) requires git history to independently confirm RED→GREEN ordering. The Implementer self-confessed ("spirit honored in-session; git history does not independently confirm") and disclosed as TD-1 in NEXT-ROLE.md. 9-round streak R69–R75 ends at R77.

**IMPLEMENTER — doc-content-empirical-accuracy (MINOR-1)**
`scripts/detector-tuning-recommendation.md` presents α=0.010 as universally improving detection by citing the favorable cell (mag=0.075, win=30): α=0.005→2/5 vs α=0.010→5/5. The matrix at HEAD shows the opposite at the adjacent cell (mag=0.050, win=30): α=0.005→3/5 vs α=0.010→2/5 (the lever makes detection WORSE). The non-monotonicity is a PRNG-resolution artifact at boundary cells, not a tuning effect, and the doc presents it as operator-actionable guidance.

**IMPLEMENTER — docstring-vs-impl-claim-mismatch (MINOR-3)**
`tools/detection-curve.ts:5-7` docstring claims "overlaying both families." Actual implementation renders two separate rows (A:rate / C:rate), not an overlay. Docstring inaccuracy only; renderer alignment is structurally correct.

**ARCHITECT — spec-self-application-gate: EMPIRICAL.sh not probe-run (OBS-4)**
Q-R77-EMPIRICAL.sh Block 2 used `node --test test/*.test.js` without `--test-reporter=tap`. Default Node reporter emits Unicode characters (ℹ / ✖), not TAP `^# pass N` lines; the `grep` patterns return empty; Block 2 unconditionally fails at Implementer chore-A. The spec audit-sidecar predicted "EMPIRICAL.sh exits 0" but the Architect did not run the script pre-routing. 3rd Tessera instance (R47 + R72 + R77).

**ARCHITECT — spec-self-application-gate: ASCII curve at saturated window (MINOR-2)**
Spec § 3.1 hard-coded ASCII curve rendering at `window_count=200`; AC-R77-11 also hard-coded this slice. At window_count=200, ALL 14 magnitudes × 2 families × 3 α values saturate at 5/5; rendered curves are entirely flat (`#####` for every cell). The renderer purpose ("rate vs magnitude") is structurally impossible at the prescribed slice. Spec § 9 grilling did not ask "does this window produce discriminating output?"

**ARCHITECT — discriminating-assertion zero-margin at empirical boundary (MINOR-4)**
AC-R77-9 asserts detection_rate ≤ 0.6 at (mag=0.05, win=30, α=0.005, family-a). Matrix value at HEAD is exactly 3/5 = 0.6; AC passes with zero margin. Architect pre-predicted ~0.0; actual is 0.6. R71 MINOR-1 discriminating-assertion gate requires ≥1-trial (20%) padding; predicted ~0.0 → threshold should be ≤ 0.4, not ≤ 0.6.

---

## Root cause analysis

**MAJOR-1 (TDD streak-break):** Implementer appears to have built the full implementation (including tests) iteratively in-session, treating in-session RED as equivalent to a committed RED. The 9-round streak may have induced a sense of procedural fluency that allowed the commit discipline to be skipped without a deliberate decision to bypass. The Implementer correctly disclosed it, which is the second-order discipline; the first-order discipline (separate commit) was the gap.

**MINOR-1 + MINOR-3 (doc accuracy):** The spec's §3.3 placeholder pattern (`[Implementer fills in by reading the matrix...]`) correctly avoided pre-authored empirical claims, but it created a "fill-in the blanks" dynamic where the Implementer read the matrix, found a compelling example, and wrote it up without systematically checking adjacent cells for counter-examples. The docstring mismatch (MINOR-3) is a standard write-then-not-reread failure; the docstring was written describing intended behavior rather than actual behavior.

**OBS-4 + MINOR-2 (Architect EMPIRICAL.sh not probe-run; saturated curve):** The Architect did not execute the spec-prescribed tools before routing. The EMPIRICAL.sh defect is undetectable by reading the script — only execution reveals the format mismatch. The saturated-window issue was detectable by reading the matrix structure ("if ALL window counts ≥ X saturate, what does the curve look like?") but the grilling didn't ask this question. Both are failures of pre-routing empirical validation discipline that is now formalized in sub-variant 11 of EMPIRICAL-PREMISE-VERIFICATION.

**MINOR-4 (AC-R77-9 zero margin):** The Architect pre-predicted ~0.0 for this cell but the actual value was 0.6 — the prediction was off by 3 trials. A 60% threshold that matches the empirical value leaves zero margin. The root cause is that the prediction was stated as a rough estimate (~0.0) without propagating the prediction uncertainty into the AC threshold (≤ 0.6 implies confidence the true value is significantly below 0.6, which was not supported by the prediction).

---

## Reinforcements added (file path + line summary)

1. **`CLAUDE-ARCHITECT.md`** — EMPIRICAL-PREMISE-VERIFICATION composite header updated from "10 sub-variants" to "12 sub-variants." Two new sub-variants appended:
   - Sub-variant 11: Pre-routing empirical validation gate — EMPIRICAL.sh probe-run AND visualization sanity check (R77 OBS-4 + MINOR-2; 3rd Tessera EMPIRICAL.sh instance). Requires Architect to run `bash Q-RNN-EMPIRICAL.sh` at round-start HEAD AND verify prescribed visualization slices fall in the dynamic range.
   - Sub-variant 12: Discriminating AC threshold must pad predicted value by ≥1 trial from prediction (R77 MINOR-4). Padding rules: predicted ≈ 0% → threshold ≤ 0.4; predicted ≈ 80% → threshold ≥ 0.6; predicted ≈ 100% → threshold ≥ 0.8.

2. **`CLAUDE-IMPLEMENTER.md`** — Two changes:
   - `# REINFORCED 2026-05-18` TDD standalone converted to `# REINFORCED — TDD-SEPARATE-RED-COMMIT (composite; 2 sub-variants)`. Sub-variant 2 added: "spirit-vs-letter disclosure is not a substitute for git-verifiable record; operator decides whether corrective RED commit required."
   - New `# REINFORCED — IMPLEMENTER-DOC-ACCURACY (composite; 2 sub-variants)` added at end of file: sub-variant 1 (cite-with-counter-example-suppression in empirical doc prose; R77 MINOR-1), sub-variant 2 (docstring-vs-impl-claim accuracy; R77 MINOR-3).

3. **`~/.claude/CROSS-PROJECT-MEMORIAL.md`** — Appended R77 entries to 3 discipline sections (tdd-discipline, doc-content-empirical-accuracy, EMPIRICAL-PREMISE-VERIFICATION), plus a reinforcement rule derived entry for the 3rd Tessera instance of Architect EMPIRICAL.sh probe-not-run.

---

## Watch list for next round

1. **TDD RED commit:** Operator should decide at R78 dispatch whether to require a corrective RED-only commit before the first implementation commit, or accept the in-session attestation as sufficient for R77. If the streak is to be restored, a deliberate discipline re-affirmation helps.

2. **EMPIRICAL.sh probe-run at Architect session exit:** The new sub-variant 11 requires running EMPIRICAL.sh before routing. If R78 includes an EMPIRICAL.sh, verify the Architect's spec-audit sidecar explicitly attests "ran Q-RNN-EMPIRICAL.sh at round-start HEAD; exit 0."

3. **Named-cell AC padding:** If R78 includes named-cell Monte Carlo ACs, verify each threshold is padded by ≥1 trial (20%) from the Architect's prediction in the allowed direction.

4. **Detection-curve window choice:** Future rounds that extend the detection-envelope deliverable should prescribe visualization at `window_count=30` (where the boundary lives) rather than `window_count=200` (saturated). The tuning-recommendation doc's prose about win=30 is the correct cross-reference.

5. **Reinforcement consolidation:** Both `CLAUDE-ARCHITECT.md` (42 entries) and `CLAUDE-IMPLEMENTER.md` (34 entries) are above the 30-entry threshold. See recommendation below.

---

## Emerging cross-project patterns

- **Architect EMPIRICAL.sh probe-not-run** has now occurred 3 times in Tessera (R47, R72, R77) — threshold crossed for cross-project reinforcement rule derivation. Rule derived in CROSS-PROJECT-MEMORIAL.md: before routing, run `bash Q-RNN-EMPIRICAL.sh` at round-start HEAD; if any non-baseline block fails, fix before routing.

- **TDD streak patterns:** A 9-round streak ending in a single deviation suggests the discipline is deeply internalized but not immune to session-dynamics pressure. The commit protocol (separate RED commit before first GREEN) is distinct from the TDD discipline (failing test before implementation) — both must hold independently.

---

## Recommend reinforcement consolidation

- **`CLAUDE-ARCHITECT.md`** is at **42** REINFORCED lines (threshold is 30). Run `./scripts/consolidate-reinforcements.sh` to archive entries older than 180 days. (Operator-triggered; the script does not auto-run.)

- **`CLAUDE-IMPLEMENTER.md`** is at **34** REINFORCED lines (threshold is 30). Run `./scripts/consolidate-reinforcements.sh` to archive entries older than 180 days. (Operator-triggered; the script does not auto-run.)
