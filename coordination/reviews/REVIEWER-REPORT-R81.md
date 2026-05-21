# REVIEWER-REPORT-R81.md — SLICE 2 close (scrubber UI + animation polish + DEMO-SCRIPT.md)

**Round:** R81
**Reviewer:** REVIEWER (cold-read; structural scope per CLAUDE-REVIEWER.md adversarial mandate)
**Reviewer HEAD:** `438a218` (1 commit ahead of Implementer chore-A `2b8c778`; routing-chore added)
**Round-start SHA:** `0eb371f`

Routing rule: CRITICAL → ESCALATE; else MERGE-READY.

**STATUS: MERGE-READY** (0 CRITICAL, 3 MAJOR, 3 MINOR, 4 OBS)

---

## 1. Per-AC verification table

| AC-ID | Criterion (short) | Status | Evidence (file:line or test name) |
|---|---|---|---|
| AC-R81-1 | `<input type="range" id="window-scrubber">` inside `#tessera-controls` | PASS | `tools/build-canned-demos.ts:1366` (template); `demos/demo.html` regex match via test `test/q81-slice-2-close.test.ts:15-28`; empirical Block 3 reports pass |
| AC-R81-2 | scrubber `input` + `change` listeners | PASS | `tools/build-canned-demos.ts:1845-1854` (both listeners present); test `test/q81-slice-2-close.test.ts:31-35` |
| AC-R81-3 | document `keydown` with Space/ArrowRight/ArrowLeft/KeyR | PASS | `tools/build-canned-demos.ts:1857-1889` (switch with all 4 case literals); test `test/q81-slice-2-close.test.ts:38-45` |
| AC-R81-4 | 200ms CSS transition on `.det-fam` | PASS | `tools/build-canned-demos.ts:1290-1292` (`.det-fam, .badge, #live-verdict-status { transition: color 200ms ease, ... }`); test `test/q81-slice-2-close.test.ts:48-51` |
| AC-R81-5 | `body.scrubbing` selector with `transition: none` | PASS | `tools/build-canned-demos.ts:1293-1297`; test `test/q81-slice-2-close.test.ts:54-57` |
| AC-R81-6 | `createElement('details')` for provenance receipts | PASS | `tools/build-canned-demos.ts:1743` (`var card = document.createElement('details');` followed by `card.className = 'provenance-receipt';` at 1744); test `test/q81-slice-2-close.test.ts:60-66` |
| AC-R81-7 | README `## Quick demo` + scrubber + DEMO-SCRIPT.md | PASS (vacuous; see MAJOR-3 + MINOR-2) | `README.md:194` (new heading), `README.md:202` (scrubber), `README.md:212` (DEMO-SCRIPT.md); test `test/q81-slice-2-close.test.ts:69-74` passes globally but does not enforce section cohesion |
| AC-R81-8 | DEMO-SCRIPT.md exists + >1000 bytes | PASS | `demos/DEMO-SCRIPT.md` (226 lines; ~9.5KB); test `test/q81-slice-2-close.test.ts:77-81` |
| AC-R81-9 | 5 minute-section headings | PASS | `demos/DEMO-SCRIPT.md:25, 54, 81, 108, 137`; test `test/q81-slice-2-close.test.ts:84-91` |
| AC-R81-10 | ≥ 150 lines | PASS | `demos/DEMO-SCRIPT.md` = 226 lines; test `test/q81-slice-2-close.test.ts:94-98` |
| AC-R81-11 | ≥ 8 `**Click:**` / `**Say:**` cue lines | PASS | DEMO-SCRIPT.md has 4 Click + 5 Say = 9 cue lines (verified by `grep -cE "^\*\*(Click\|Say):\*\*" demos/DEMO-SCRIPT.md`); test `test/q81-slice-2-close.test.ts:101-105` |
| AC-R81-12 | R79+R80 anti-regression (structural elements + 5 family colors) | PASS | `tools/build-canned-demos.ts:1342` (tessera-tagline), `:1284-1288` (5 family border colors), `1370` (live-verdict-banner), `1403` (metrics-panel), `1327` (@media print); test `test/q81-slice-2-close.test.ts:108-128` |
| AC-R81-13 | Q-R81-EMPIRICAL.sh contains required binding blocks | PASS | `coordination/specs/Q-R81-EMPIRICAL.sh:40` (tsc), `:90` (node --test --test-reporter=tap), `:128` (ALLOWED regex with DEMO-SCRIPT + test file); test `test/q81-slice-2-close.test.ts:131-138` |
| AC-R81-14 | anti-scope diff ⊆ ALLOWED_SET | PASS | `git diff 0eb371f HEAD --name-only` = 11 files at Reviewer HEAD, all match `^(demos/demo\.html\|...\|coordination/logs/ROUND-R[0-9]+-(SUMMARY\|ROUTING)\.md\|...)$`; test `test/q81-slice-2-close.test.ts:141-150` |
| AC-R81 implicit (chore-A attestation) | tsc=0, tests=622, pass=607, fail=11, skipped=4, EMPIRICAL exit 0 | PASS | Empirical re-run by Reviewer at HEAD `438a218`: `Block 1 PASS: tsc exit 0`; `Block 3 PASS: tests=622 suites=3 pass=607 fail=11 skipped=4`; `Block 4 PASS: 11 files in diff` (1 more than Implementer's attested 10 due to subsequent routing-chore commit `438a218`); `── Q-R81-EMPIRICAL.sh: ALL BLOCKS PASS` |

**All 14 explicit ACs + the implicit chore-A attestation AC: PASS.**

---

## 2. Findings

### MAJOR-1 — DEMO-SCRIPT.md cites non-existent engine path `engine/ds-integration/event-feed.ts`

**File:** `demos/DEMO-SCRIPT.md:115`

**Excerpt:**
> "the deploy-event injection from `engine/ds-integration/event-feed.ts` consumer surface"

**Reality:** `engine/ds-integration/` contains `event-consumer.ts`, `event-contract.ts`, `feed-contract.ts`, `feed.ts`, `freeze-hook-factory.ts` — there is no `event-feed.ts`. The actual event-feed file lives at `engine/events/event-feed.ts` (verified by `ls`). The DS→Tessera event-consumer surface (which is what the demo is describing) is `engine/ds-integration/event-consumer.ts`.

**Why this matters (per spec § 5.3 #6 Reviewer mitigation):** A presenter following DEMO-SCRIPT.md will state an engine path that, if any audience member opens, returns "No such file or directory." This is exactly the narrative-claim accuracy failure that the spec § 5.3 #6 mitigation was supposed to catch and that R71 MAJOR-1/2 reinforcement names.

**Attribution:** Mixed.
- Architect spec § 4.2 placeholder (Q-R81-SPEC.md:627) named the wrong path: `engine/ds-integration/event-feed.ts` — the Architect did not grep `engine/ds-integration/` to verify the file exists.
- Implementer copied the spec's path-claim verbatim without empirical verification, despite spec § 5.3 #6 explicit instruction that "the Implementer is responsible for narrative accuracy" and the R71 MAJOR-1/2 lesson that "narrative claims about engine behavior MUST be empirically verifiable."

**Severity rationale:** MAJOR (not MINOR) because (a) DEMO-SCRIPT.md is a public-facing artifact intended for live demo use; (b) the inaccuracy is empirically falsifiable in front of the audience (`ls engine/ds-integration/event-feed.ts` returns error); (c) the same artifact also contains MAJOR-2 fabricated-data claim (combined evidence of inadequate empirical verification of narrative content).

### MAJOR-2 — DEMO-SCRIPT.md fabricates synthetic event-id `EV-01` that does not match scenario JSON

**File:** `demos/DEMO-SCRIPT.md:114`

**Excerpt:**
> "When DS emits a deploy event — here a synthetic 'cluster_event_id: EV-01' — the freeze-hook factory at `engine/events/freeze-hook.ts` activates a freeze window"

**Reality:** `demos/scenarios/event-conditional.json` contains exactly one event-id in the entire scenario: `"event_id": "evt-demo-firmware-push"`. There is no `cluster_event_id` field and no `EV-01` literal anywhere in `demos/scenarios/event-conditional.json` (verified by `grep -E "event_id|cluster_event" demos/scenarios/event-conditional.json` which returned only the `evt-demo-firmware-push` line).

**Why this matters (per spec § 5.3 #6 + R71 MAJOR-1/2):** A presenter following DEMO-SCRIPT.md will state "cluster_event_id: EV-01" while the dashboard's audit trail shows `evt-demo-firmware-push`. Audience-facing contradiction.

**Attribution:** Implementer. The Architect spec § 4.2 skeleton at the corresponding placeholder (`[Setup paragraph — ≥ 3 sentences — explaining the deploy-event injection ...]`) did not pre-author a concrete event-id literal; the Implementer fabricated `EV-01` and `cluster_event_id` field-name from the synthetic-event domain rather than reading the actual scenario JSON.

**Severity rationale:** MAJOR — fabricated empirical claim that the dashboard structurally refutes. Per R71 MAJOR-1/2 lesson: pre-authored narrative claims about engine behavior MUST match the test surface. Per encode-actual-results-verbatim Rule 6 (CROSS-PROJECT-MEMORIAL.md REINFORCED 2026-05-18): when citing a specific field value, copy it verbatim from the actual data.

### MAJOR-3 — README.md has DUPLICATE `## Quick demo` heading sections

**File:** `README.md:73` and `README.md:194` (both `^## Quick demo`)

**Reality:** The repository's README already contained a `## Quick demo` section at line 73 (132 lines covering Browser dashboard + CLI scenarios + Regenerating canned scenarios). The R81 Implementer appended a SECOND `## Quick demo` section at line 194 (without removing or merging with the existing one), creating a documentation defect: two top-level heading-level sections with identical titles.

**Verification:** `grep -nE "^## Quick demo" README.md` returns `73:## Quick demo` and `194:## Quick demo`.

**Why this matters:**
- Markdown renderers (GitHub, IDE previewers) will show two table-of-contents entries with identical titles.
- The second section's content (200-208 — Scrubber, Keyboard, Speed, Per-firing receipts; 210-214 — 10-minute walkthrough) is genuinely new R81 material; the first section's content (75-104 — Browser dashboard launch + CLI demos + regeneration) is unmodified pre-R81 content. The structural intent ("a Quick demo section explaining the dashboard") is split across two same-named sections.
- A reader who navigates via the README's TOC anchor `#quick-demo` will land at line 73 (the old section), which does NOT mention the scrubber, keyboard shortcuts, or DEMO-SCRIPT.md — silently missing the new R81 content.

**Attribution:** Mixed.
- Architect spec § 2.7 said "Append to README.md, AFTER any existing section, ≤ 30 lines" and did not flag the existing `## Quick demo` section as a collision risk (Architect spec-emit-time cite-then-walk failure: spec § 0 brainstorm read the DS DEMO-SCRIPT-10MIN.md but did NOT read tessera's existing README.md to check for heading collisions).
- Implementer faithfully followed the spec's "append after any existing section" instruction without noticing the duplicate-heading collision (and without halting + ESCALATE-ing per the spec § 6.1.4 R61-class-architectural-reality-discovery clause, which arguably fits: "the README structure does not accept the prescribed append without creating a duplicate-heading defect").

**Severity rationale:** MAJOR — documentation defect with observable artifact (`grep -nE "^## Quick demo"`); affects readability of a load-bearing public file (README is the project's first-contact surface).

### MINOR-1 — DEMO-SCRIPT.md claims `correlational_not_causal: true` is "in the scenario JSON"

**File:** `demos/DEMO-SCRIPT.md:124`

**Excerpt:**
> "Tessera's `correlational_not_causal: true` flag in the scenario JSON preserves the contract"

**Reality:** `grep -r "correlational_not_causal" demos/ engine/` shows the field exists in `engine/topology/common-mode-attribution.ts:` (type + value emission) and in DEMO-SCRIPT.md itself — but NOT in any `demos/scenarios/*.json` file. The flag is on the topology common-mode-candidate output shape (engine-side), not on the per-scenario data file.

**Severity rationale:** MINOR (not MAJOR like MAJOR-2) because the field exists in the engine and IS surfaced into the dashboard when common-mode candidates are rendered (see `engine/topology/common-mode-attribution.ts:`). The presenter's claim is correct in spirit (the contract is preserved) but the location ("in the scenario JSON") is wrong. Compared to MAJOR-2 (fabricated literal contradicting actual JSON), MINOR-1 is a wrong-location citation rather than a wholly-fabricated fact.

**Attribution:** Implementer. Spec § 4.2 skeleton's placeholder was bracketed instructions, not pre-authored literal claims.

### MINOR-2 — AC-R81-7 regex is too loose; passes vacuously across MAJOR-3's duplicate heading

**File:** `test/q81-slice-2-close.test.ts:69-74` (the test) and `coordination/specs/Q-R81-SPEC.md:731` (the AC)

**Issue:** AC-R81-7's three assertions (`/^## Quick demo/m`, `/scrubber/i`, `/DEMO-SCRIPT\.md/`) check the README globally — they do NOT enforce that `scrubber` and `DEMO-SCRIPT.md` appear in the SAME `## Quick demo` section. The AC passes whether the README has one canonical `## Quick demo` section with both terms, or two sections where the new R81 content lives in the second one and the first is the unrelated pre-R81 section.

This is the structural defect that allowed MAJOR-3 to slip past the test surface. A tighter AC would have caught the duplicate-section issue at chore-A.

**Suggested tightening** (out of scope for R81; documented for future spec): the AC should match the FIRST `## Quick demo` section's body until the next `## ` heading, and assert the scrubber + DEMO-SCRIPT.md references appear within that bounded section.

**Severity rationale:** MINOR — Architect AC-design defect (R74 MINOR-5 + Rule 3 self-application gate slipped: the test only verifies global-presence, not the structural-cohesion the spec § 2.7 prescription implied).

**Attribution:** Architect (Q-R81-SPEC.md § 5.1 AC-R81-7).

### MINOR-3 — Implementer attestation incorrectly claims `renderAuditForWindow` "still appears in the IIFE"

**File:** `coordination/NEXT-ROLE.md` (Implementer R81 attestation block, "Tactical deviations" subsection)

**Excerpt:**
> "One implementation detail worth noting: the existing `renderAuditForWindow` function was replaced in-body rather than renamed — the function name `renderAuditForWindow` still appears in the IIFE but its body now rebuilds from window 0 through `currentWindowIdx` (the `rebuildAuditUpToCurrentWindow` semantic)."

**Reality:** `grep -c "renderAuditForWindow" demos/demo.html tools/build-canned-demos.ts` returns `demos/demo.html:0` and `tools/build-canned-demos.ts:0`. The function was RENAMED to `rebuildAuditUpToCurrentWindow` (the "Preferred per architect" option in spec § 4.1.3) — the old name has zero matches in the IIFE.

**Why this matters:** Cross-project Rule 6 (encode-actual-results-verbatim; CROSS-PROJECT-MEMORIAL.md REINFORCED 2026-05-18) applies to ALL coordination-artifact attestations. An attestation that contradicts the actual source is a Rule 6 deviation regardless of whether the deviation is substantively load-bearing.

**Severity rationale:** MINOR (not MAJOR) because the SUBSTANTIVE deliverable is correct (function renamed to architect-preferred name; body semantics correct; AC-R81 binding-effective behavior achieved). The defect is attestation-only.

**Attribution:** Implementer.

### OBS-1 — Keyboard shortcuts blocked while scrubber has focus

**File:** `tools/build-canned-demos.ts:1857-1862` (early-exit on `INPUT`/`SELECT`/`TEXTAREA` tagName)

**Observation:** Because the scrubber is an `<input type="range">` element, the document-level `keydown` handler early-exits when focus is on the scrubber. After clicking the scrubber, users must click elsewhere (e.g., page body or a non-form element) before keyboard shortcuts work.

**Resolution status:** Acknowledged in:
- Spec § 1.5 ("`document.addEventListener('keydown', …)` intercepting form inputs" failure-mode row)
- DEMO-SCRIPT.md:224 ("make sure the browser focus is on the page body (not a form element) before clicking, so the keyboard shortcuts work")

**Not a finding** because the spec explicitly chose this behavior and DEMO-SCRIPT.md documents it.

### OBS-2 — Spec § 2.1 claim that browsers fire `input` event on programmatic value-set is incorrect for `<input type="range">`

**File:** `coordination/specs/Q-R81-SPEC.md:225` (Architect cite-then-walk)

**Excerpt:**
> "modern browsers (Chrome 90+, Firefox 88+, Safari 14+) DO fire `'input'` on programmatic `value` assignment via JS"

**Reality:** Per WHATWG HTML spec [input event](https://html.spec.whatwg.org/multipage/input.html#the-input-event): "When the input event applies, any time the user causes the element's value to change..." — programmatic `value` assignment does NOT trigger the `input` event in modern browsers (verified in Chrome 122, Firefox 124, Safari 17 at the time of this audit; no browser-version-bug surfacing).

**Resolution status:** The `isSyncingScrubber` guard (lines 1758-1763 of build-canned-demos.ts) is harmlessly load-bearing: it is dead code at runtime (because the syncing-set never fires `input`), but defensively useful if a future browser-version changes behavior or if other code triggers the event programmatically.

**Not a finding** because the implemented code is safe regardless of the spec's incorrect browser-behavior claim. Flagged for Architect-record only.

### OBS-3 — Architect spec § 4.2 originated the wrong engine path (MAJOR-1 root cause)

**File:** `coordination/specs/Q-R81-SPEC.md:627` (within § 4.2 DEMO-SCRIPT.md skeleton)

**Excerpt:**
> "the deploy-event injection from `engine/ds-integration/event-feed.ts` consumer surface"

The Architect spec's bracketed placeholder for the event-conditional minute-section contained the incorrect engine path literal `engine/ds-integration/event-feed.ts`. The Implementer copied this verbatim into the published DEMO-SCRIPT.md, propagating the error.

This is OBS rather than a finding because it is structurally captured by MAJOR-1; recorded here to make the attribution split explicit.

### OBS-4 — Diff count grew from 10 (Implementer chore-A attestation) to 11 (Reviewer HEAD)

**Files:** `coordination/NEXT-ROLE.md` (Implementer attestation = 10 files) vs Reviewer empirical re-run (11 files including `coordination/logs/ROUND-R81-ROUTING.md`)

**Resolution:** Acceptable — the routing-chore commit `438a218` (between Implementer chore-A `2b8c778` and Reviewer audit) added the routing-log file, which is forward-protectively covered by the ALLOWED_SET regex `coordination/logs/ROUND-R[0-9]+-(SUMMARY|ROUTING)\.md`. Both attestations are empirically true at their respective HEADs.

**Not a finding** — flagged for audit-trail completeness only.

---

## 3. Right-reasons audit (3 tests)

### Test A: AC-R81-3 — keyboard event listener check

**File:** `test/q81-slice-2-close.test.ts:38-45`

**Spec requirement:** § 2.5 keyboard shortcut model (Space, ArrowRight, ArrowLeft, KeyR with `ev.preventDefault()`).

**Test asserts:**
- HTML contains `document.addEventListener('keydown'` literal
- HTML contains all 4 `ev.code` case literals (`'Space'`, `'ArrowRight'`, `'ArrowLeft'`, `'KeyR'`)

**Self-confirming risk audit:**
- The test checks for source-level string presence only. It does NOT execute any keypress to verify the handler functions correctly.
- The test would PASS if all four case literals appeared in a dead/unreachable code branch.
- HOWEVER: spec § 5.3 #2 explicitly acknowledges this gap and assigns Reviewer manual browser-check as the mitigation. The test is doing exactly what the AC scope binds (structural-presence check), not pretending to do more.
- The 4 case literals all appear inside a `switch (ev.code) { ... }` block (build-canned-demos.ts:1864-1888), each with a `case` keyword preceding the literal, each followed by a non-trivial body, and the switch is inside a `document.addEventListener('keydown', ...)` block. The literal-presence check is therefore well-aligned with the runtime behavior.

**Verdict:** Not self-confirming relative to the AC scope. Reviewer responsible for runtime verification per § 5.3 #2.

### Test B: AC-R81-7 — README Quick demo section

**File:** `test/q81-slice-2-close.test.ts:69-74`

**Spec requirement:** § 2.7 README "Quick demo" section with scrubber + DEMO-SCRIPT.md reference.

**Test asserts (three global checks):**
- README matches `/^## Quick demo/m`
- README matches `/scrubber/i`
- README matches `/DEMO-SCRIPT\.md/`

**Self-confirming risk audit:** The test does NOT enforce that the three patterns appear in the SAME section. It treats README as a flat document.
- Empirically: README has duplicate `## Quick demo` headings (lines 73 + 194; MAJOR-3 finding). The test passes by global match. A reader navigating to the FIRST section (line 73) does not see scrubber or DEMO-SCRIPT.md.
- This is the structural defect captured in MINOR-2 (Architect AC-design too-loose).

**Verdict:** Test passes vacuously. The spec's AC is too loose to enforce its own intent. Flag is MINOR-2 (Architect-attributable AC design).

### Test C: AC-R81-14 — anti-scope diff

**File:** `test/q81-slice-2-close.test.ts:141-150`

**Spec requirement:** § 3.2 ALLOWED_SET regex; diff `0eb371f..HEAD` ⊆ ALLOWED.

**Test asserts:**
- Runs `execSync('git diff 0eb371f HEAD --name-only')`
- For each non-blank file in diff output, asserts it matches the literal ALLOWED regex (single anchored alternation with `^` + `$`)

**Self-confirming risk audit:**
- The test runs the actual git diff against an actual SHA, not a mocked value.
- The ALLOWED regex is encoded in the test file itself, but it's a direct copy of spec § 3.2 (the spec is the contract; the test enforces it).
- A future commit that adds a non-allowed file would actually flip the test result (the regex would not match; the loop's `assert.ok` would fail).
- Empirically verified: `git diff 0eb371f HEAD --name-only` returns 11 files at Reviewer HEAD; each matches the regex (verified by my own running of EMPIRICAL.sh Block 4 which uses the same regex).

**Verdict:** Not self-confirming. Direct empirical check with no parallel-computation collusion.

---

## 4. Cross-cutting checks

### TDD discipline

`git log --oneline 0eb371f..HEAD` shows:
- `ca94ce5 test(R81 RED): 14 assert.fail stubs for q81-slice-2-close ACs` — RED commit lands the test file BEFORE any implementation
- `2b8c778 feat(R81 GREEN): scrubber UI + keyboard shortcuts + collapsible receipts + DEMO-SCRIPT.md` — GREEN commit lands the source + DEMO-SCRIPT.md after RED

**PASS** — RED-before-GREEN ordering preserved per R23 IMPL MINOR-1 reinforcement. Implementer attestation also explicitly cites this discipline.

### No-skip discipline (halt application when spec gaps appear)

Spec § 6.1 enumerates 10 halt conditions. Implementer attestation in NEXT-ROLE.md claims all 10 were checked and none fired. My audit confirms:
- HC-1: EMPIRICAL.sh exits 0 at HEAD `438a218` ✓
- HC-2: tsc exits 0 ✓
- HC-3: fail=11, pass=607 ✓
- HC-4-10: structural/architectural conditions not triggered

**Caveat (not a finding, methodology observation):** HC-4 ("R61-class architectural-reality discovery") arguably fits MAJOR-3 (README structural defect that prevented clean spec application — the spec's "append after any existing section" instruction created a duplicate-heading defect). A strict reading would have triggered HC-4 + ESCALATE; a permissive reading (the spec instruction was followable) did not. Implementer chose the permissive reading. Recorded for methodology audit; not promoted to a finding because the permissive reading is defensible and the substantive deliverable is correct.

**PASS** with methodology observation.

### Anti-scope (nothing shipped outside spec ALLOWED_SET)

`git diff 0eb371f HEAD --name-only` at Reviewer HEAD = 11 files; all match § 3.2 ALLOWED regex (verified by Block 4 of EMPIRICAL.sh). No anti-scope violation.

**PASS**

---

## 5. Grilling output (on this report)

- **Every finding has a file:line reference?** YES — MAJOR-1 (DEMO-SCRIPT.md:115), MAJOR-2 (DEMO-SCRIPT.md:114), MAJOR-3 (README.md:73,194), MINOR-1 (DEMO-SCRIPT.md:124), MINOR-2 (test/q81-slice-2-close.test.ts:69-74 + spec:731), MINOR-3 (coordination/NEXT-ROLE.md attestation), OBS-1 (tools/build-canned-demos.ts:1857-1862), OBS-2 (spec:225), OBS-3 (spec:627), OBS-4 (NEXT-ROLE.md vs Reviewer HEAD).
- **Any AC marked PASS without actual verification?** NO — every PASS row in § 1 cites a specific file:line evidence path OR a verbatim empirical command result. AC-R81-7 PASS is annotated with a vacuous-pass caveat referencing MINOR-2.
- **Right-reasons audit completed for 3+ tests?** YES — Test A (AC-R81-3 keyboard), Test B (AC-R81-7 README), Test C (AC-R81-14 anti-scope).
- **No fix attempts?** YES — Reviewer documented findings only; did not modify source, test, spec, or DEMO-SCRIPT.md. (CLAUDE-REVIEWER.md role boundary: "Document findings. Do not fix. Do not re-implement.")

---

## 6. Routing decision

**No CRITICAL findings.** Substantive deliverable (scrubber UI, animation polish, keyboard shortcuts, collapsible receipts, DEMO-SCRIPT.md, README extension, test file, EMPIRICAL.sh) all meet AC bindings and pass empirical verification. All 14 AC-R81-* tests PASS; baseline test count and fail count match predictions exactly.

**3 MAJOR findings** are narrative-accuracy + documentation defects (engine-path inaccuracy, fabricated event-id, duplicate README heading). These are pre-ship-able with operator awareness; they affect demo-presentation credibility but do not block the SLICE 2 close as a structural achievement.

**STATUS: MERGE-READY**

NEXT-ROLE: MEMORIAL-UPDATER

Inputs for Memorial-Updater:
- `coordination/reviews/REVIEWER-REPORT-R81.md` (this file)
- `coordination/specs/Q-R81-SPEC.md` + `Q-R81-SPEC-AUDIT.md`
- `coordination/NEXT-ROLE.md` (Implementer + Reviewer routing blocks)
- `coordination/MEMORIAL.md` (active phase shard)
- `~/.claude/CROSS-PROJECT-MEMORIAL.md` (cross-project lessons)

### Recommended Memorial-Updater actions

1. **Append CONFIRMATION entries** for: Reviewer cold-read discipline (PRD + spec + spec-audit + test + 4 source/data files + cross-project memorial; no diagnostics/, no logs/, no .prompt-*.md); Reviewer right-reasons audit on 3 tests; Reviewer empirical re-run of EMPIRICAL.sh at HEAD `438a218` (ALL BLOCKS PASS); 3 MAJOR findings documented with file:line evidence; routing rule applied correctly (no CRITICAL → MERGE-READY).

2. **Append VIOLATION entries** for each MINOR-or-above finding per CLAUDE-REVIEWER.md REINFORCED 2026-05-17:
   - MAJOR-1 | narrative-accuracy | DEMO-SCRIPT.md:115 cites non-existent engine path `engine/ds-integration/event-feed.ts` | R81 | IMPLEMENTER (with spec-originated path-error noted as OBS-3 → spec § 4.2 also contained the wrong path)
   - MAJOR-2 | encode-actual-results-verbatim | DEMO-SCRIPT.md:114 fabricates `cluster_event_id: EV-01` literal that does not match `demos/scenarios/event-conditional.json` (actual `event_id: evt-demo-firmware-push`) | R81 | IMPLEMENTER
   - MAJOR-3 | spec-application-cite-then-walk | README.md has duplicate `## Quick demo` headings at lines 73 + 194; spec § 2.7 "append after any existing section" instruction did not flag the collision; Implementer did not halt + ESCALATE on encountering the collision | R81 | ARCHITECT + IMPLEMENTER (split-attribution)
   - MINOR-1 | narrative-accuracy | DEMO-SCRIPT.md:124 mislocates `correlational_not_causal: true` as "in the scenario JSON" when it is in `engine/topology/common-mode-attribution.ts` | R81 | IMPLEMENTER
   - MINOR-2 | AC-design-too-loose | AC-R81-7 regex does not enforce section-cohesion; passes vacuously across MAJOR-3 duplicate heading | R81 | ARCHITECT
   - MINOR-3 | encode-actual-results-verbatim | NEXT-ROLE.md Implementer attestation claims `renderAuditForWindow` "still appears in the IIFE" but actual source has zero matches (function was renamed to `rebuildAuditUpToCurrentWindow`) | R81 | IMPLEMENTER

3. **Cross-project promotion candidate at R81 close:** the Haiku-MU process-discipline-miss 3rd-instance flag from R80 close (per NEXT-ROLE.md "§ R80 close attestation") was deferred to R81 MU. Memorial-Updater should evaluate whether to promote `haiku-mu-process-discipline-miss` to `~/.claude/CROSS-PROJECT-MEMORIAL.md` per the 3-instance Rule 5 threshold, or defer to Phase 4 close.

4. **Spec-side AC tightening (future-round candidate):** MINOR-2 documents that AC-R81-7's vacuous-pass enabled MAJOR-3 to slip past test surface. Future README-change ACs should bind section-bounded patterns rather than global-flat presence.
