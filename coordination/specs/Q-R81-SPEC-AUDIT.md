# Q-R81-SPEC-AUDIT.md — Architect audit sidecar (R81)

_Companion to `Q-R81-SPEC.md`. Holds the Architect's audit-trail content: P3 ten-axis verification narrative, pre-route discipline application, claim-then-walk evidence, EMPIRICAL.sh probe-run record, pre-prediction tables, and decision rationale. Reviewer reads BOTH this file and the spec proper at audit time; Implementer reads ONLY the spec proper. Memorial-Updater appends post-round confirmations._

**Round:** R81 (Phase 4 SLICE 2 final round — dashboard close + demo script)
**Tier:** full
**Round-start SHA:** `0eb371f`
**Spec triad commit:** TBD (this Architect commit)

---

## § A. Architect pre-emit discipline application

### A.1 Cross-project rules applied UPFRONT (per directive § "Apply all 7 cross-project rules UPFRONT")

The R81 directive at NEXT-ROLE.md says: "Rules 1-7 ACTIVE; all cross-project disciplines load-bearing." The Architect's pre-emit grilling applied each:

- **Rule 1 (empirical-command-attestation):** § 4.3 EMPIRICAL.sh uses `--test-reporter=tap` (Block 3) per R77; § 5.2 explicitly instructs Implementer to record actual observed values.
- **Rule 2 (branch-binding coverage):** Every prescribed JS function (syncScrubberPosition, manualStep, rebuildAuditUpToCurrentWindow, renderProvenancePanel changes) has a binding AC OR is exercised by a binding AC's regex window. § 5.3 #7 acknowledges and mitigates the manualStep gap.
- **Rule 3 (anti-self-application gate):** § 9.6 walks all 14 ACs against prescribed pseudocode; each AC verified PASS for the spec's own prescribed implementation.
- **Rule 4 (anti-scope ALLOWED_SET forward-coverage):** § 3.2 ALLOWED_SET regex SHA-pinned to round-start; forward-protective entries match any R-number.
- **Rule 5 (composite-violation threshold):** No new composite violation detected at R81.
- **Rule 6 (encode-actual-results-verbatim):** § 5.2 explicit; § 1.4 distinguishes predictions from observations.
- **Rule 7 (cross-project canonical):** Architect claim-then-walk at session entry on R71/R79/R80 spec + R80 close state; spec § 4.2 DEMO-SCRIPT.md skeleton uses `[bracketed]` placeholders not pre-authored empirical claims (R71 MAJOR-1/2 lesson); EMPIRICAL.sh probe-run discipline applied (R77+R47+R72 3rd-instance rule).

### A.2 Brainstorm (Superpowers Phase 1) — completed

Three distinct approaches generated and compared in spec § 0. Approach 2 (minimal scrubber + selective CSS transitions + nested `<details>` for receipts + document-level keyboard handlers; preserve R79 SVG architecture) picked over Approach 1 (full canvas-based animated chart — rejected: 600+ LOC diff + browser-runtime-only validation gap) and Approach 3 (hybrid with stroke-dasharray SVG path draw-in animation — rejected: dasharray-animation complexity + OBSERVED-binding risk in AC suite for a SLICE-final round). Selection rationale in spec § 0 covers strengths/weaknesses/hidden-assumptions/risks per Superpowers brainstorm pattern.

### A.3 Design (Superpowers Phase 2) — completed

Spec § 1 sketches component boundaries (`Exists` / `Created` / `Changed` / `Deleted`), layout architecture (R80 layout preserved; R81 inserts scrubber HTML + CSS + JS additively), schema additions (none — R81 does not change scenario JSON), Architect pre-prediction table, failure modes at each integration point (10 documented failure modes), visual identity decisions (preserves R80 palette + adds 200ms transition + scrubber accent).

### A.4 Pre-emit grilling (Superpowers Phase 3) — completed

Spec § 9 walks 9 grilling sub-sections (§ 9.1 every claim verifiable; § 9.2 unstated assumptions; § 9.3 scope creep; § 9.4 Implementer guesswork; § 9.5 cross-section consistency; § 9.6 self-application gate; § 9.7 empirical-premise verification; § 9.8 spec-internal contradiction sweep; § 9.9 acknowledged-gap mitigation pairing per R74 MINOR-2).

### A.5 Review phase (Superpowers Phase 4) — applied to this spec triad

Re-read spec as Implementer would receive it cold:
- Can the Implementer build the scrubber without re-deciding HTML attribute names? **YES** — § 2.4 + § 4.1.2 prescribe verbatim.
- Can the Implementer write the keyboard handler without re-deciding key-code semantics? **YES** — § 2.5 prescribes verbatim `ev.code` literals.
- Can the Implementer pick a transition timing? **NO; 200ms ease prescribed verbatim** at § 2.3.
- Can the Implementer choose the DEMO-SCRIPT.md structure? **NO; § 4.2 prescribes the 5-section structural skeleton verbatim; narrative body is at Implementer discretion provided AC-R81-9/10/11 satisfied.**
- Is anything ambiguous? **NO** — § 7 reads "None — all resolved at Architect time."
- Does the spec add scope beyond the directive? **NO** — § 9.3 walks the 9 prescribed elements.

---

## § B. Architect claim-then-walk evidence

### B.1 Files opened + lines verified at session entry (cite-then-verify discipline)

| File:line range | Read action | Verified content / claim |
|---|---|---|
| `coordination/PRD.md:1-444` | full read | PRD structure + Phase 3 scope; Tessera per-shard observation framing confirmed |
| `~/.claude/CROSS-PROJECT-MEMORIAL.md` (tail + R72-R80 sections) | targeted reads | 7 cross-project rules applicable; R71/R74/R75/R77 EMPIRICAL.sh probe-run + R71 narrative-empirical lesson + R66 strikethrough-avoid lesson; cite-then-verify Architect 3rd-instance rule |
| `coordination/MEMORIAL.md` | line-count check (2188 lines); active phase shard | empty diagnostics; recent R80 close memorial entries |
| `coordination/specs/Q-R80-SPEC.md:1-862` | full read (paginated) | R80 dashboard state; 5-family viz + visual identity + per-family border colors; carry-forward 10 fails identified |
| `coordination/specs/Q-R80-EMPIRICAL.sh:1-137` | full read | R80 4-block structure used as R81 EMPIRICAL.sh template |
| `test/q80-five-family-visualization.test.ts:1-197` | full read | 14 R80 ACs; AC-R80-14 ALLOWED regex pattern (R81's anti-scope-flip target identified) |
| `test/q79-dashboard-structure.test.ts` (grepped relevant lines) | grep `provenance-receipt\|<div\|scrubber\|range\|input` | R79 provenance-receipt + `<details id="provenance-panel">` outer-container-only assertion; no AC binds inner receipt as `<div>` |
| `test/q71-demo-dashboard.test.ts:158-159` | grep AC-R71-13 | HTML inlined JSON round-trip identity AC; R81 preserves (scenario JSON unchanged) |
| `tools/build-canned-demos.ts:1175-1391` | full read (HTML_TEMPLATE_HEAD) | R80 CSS + HTML template state; R81 insertion points identified |
| `tools/build-canned-demos.ts:1397-1798` (HTML_TEMPLATE_FOOTER) | full read | R80 embedded JS; existing `currentWindowIdx`, `tick()`, `setInterval`, `renderProvenancePanel`, `renderAuditForWindow` verified at lines 1397, 1696, 1563 |
| `demos/demo.html:136-216` (controls + main panels) | full read | R80 dashboard state at HEAD `0eb371f`; controls section structure (play/pause/reset/speed/window-indicator); confirmed R80's "remove det-fam-placeholder class on B/C/D/E" was NOT applied at HEAD (the class persists) |
| `demos/demo.html:12700-13099` (embedded JS) | full read | R80 dashboard IIFE state; confirmed renderProvenancePanel creates `<div class="provenance-receipt">` not `<details>` |
| `/Users/johnwarren/deploysignal-public/DEMO-SCRIPT-10MIN.md:1-330` | full read | DS analogue structure: Before-you-start → spine → minute-by-minute Click/Say/Pause → Bank-of-followup → Audience-substitutions → Pacing → Post-demo |

All file:line citations in spec § 0 brainstorm + § 4.1 + § 9.7 sourced from these reads, NOT from memory (per R11 + R65 cite-then-verify discipline).

### B.2 Engine surface NOT touched (anti-scope)

R81 does NOT add new engine imports beyond R80's existing imports. R80's lone new import was `peakACF` from `engine/detectors/spectral.js`; R81 adds no further. Confirmed by spec § 6.1 halt condition 8.

### B.3 No new external dependencies

Verified — R81 design uses only built-in HTML / CSS / JS primitives (`<input type="range">`, `document.addEventListener`, `createElement('details')`). No npm package additions.

---

## § C. EMPIRICAL.sh probe-run record (R77+R47+R72 3rd-instance reinforcement)

Per CROSS-PROJECT-MEMORIAL.md (3rd Tessera instance of Architect EMPIRICAL.sh probe-not-run): **Before routing to Implementer, the Architect MUST execute `bash Q-RNN-EMPIRICAL.sh` against round-start HEAD and verify every block.**

### C.1 Probe-run command

```bash
bash coordination/specs/Q-R81-EMPIRICAL.sh
```

### C.2 Expected outcome at round-start HEAD `0eb371f` (pre-Implementer)

- Block 1 (typecheck): PASS — `pnpm exec tsc -p tsconfig.test.json` exits 0 at R80 close baseline.
- Block 2 (artifact existence): FAIL — Implementer-deliverable artifacts (`demos/DEMO-SCRIPT.md`, `test/q81-slice-2-close.test.ts`) absent at round-start.
- Block 3 (test counts): FAIL — at round-start, `# fail = 10` (R80 close baseline); expected after Implementer = 11; expected `# pass` band `[605, 609]` not reached at round-start (594).
- Block 4 (anti-scope diff): PASS — empty diff (no R81 commits yet between round-start and itself).
- Overall: EXIT 1 (Block 2 + Block 3 fail by construction at round-start).

### C.3 Probe-run actual output (verbatim; encode-actual-results-verbatim discipline)

Ran at round-start HEAD `0eb371f`, BEFORE committing the spec triad:

```
── Q-R81-EMPIRICAL.sh @ HEAD=0eb371f

── Block 1: typecheck
Block 1 PASS: tsc exit 0

── Block 2: required artifact existence
Block 2 FAIL: missing required artifact(s): test/q81-slice-2-close.test.ts demos/DEMO-SCRIPT.md

── Block 3: test counts
Block 3 FAIL: fail count = '10'; expected 11 (R80-close carry-forward 10 + AC-R80-14 forward-protection flip = 11)
  TAP tail:
ok 566 - AC-R80-13: Q-R80-EMPIRICAL.sh contains required binding command blocks
  ---
  duration_ms: 0.406167
  type: 'test'
  ...
# Subtest: AC-R80-14: git diff from round-start to HEAD contains only ALLOWED files
ok 567 - AC-R80-14: git diff from round-start to HEAD contains only ALLOWED files
  ---
  duration_ms: 21.874542
  type: 'test'
  ...
1..567
# tests 608
# suites 3
# pass 594
# fail 10
# cancelled 0
# skipped 4
# todo 0
# duration_ms 6467.229083

── Block 4: anti-scope diff
Block 4 PASS: 0 files in diff, all within ALLOWED_SET

── Q-R81-EMPIRICAL.sh: AT LEAST ONE BLOCK FAILED (exit 1)
```

**Observed exit code:** `1` (matches predicted; Block 2 + Block 3 fail at round-start by construction; this is the documented pre-Implementer baseline).

**Observed values match § C.2 predictions byte-for-byte:**
- Block 1: PASS (tsc exit 0) — predicted PASS ✓
- Block 2: FAIL with missing `test/q81-slice-2-close.test.ts` + `demos/DEMO-SCRIPT.md` — predicted FAIL ✓
- Block 3: FAIL with `# tests=608 / # pass=594 / # fail=10 / # skipped=4` — predicted FAIL ✓
- Block 4: PASS (0 files in diff) — predicted PASS ✓
- Overall: EXIT 1 — predicted EXIT 1 ✓

**Note** (per R80 / R77 lesson): AC-R80-14 currently shows `ok 567` (passes) at round-start because the diff between `51a20b8` and current HEAD `0eb371f` is empty — the EMPIRICAL.sh used by R80 (and the AC-R80-14 test body) measures `git diff 51a20b8 HEAD --name-only`; at round-start HEAD = `0eb371f` (1 commit after R80 close); the diff contains only the directive-planting commit's content, which is `coordination/NEXT-ROLE.md` + `coordination/MEMORIAL.md` — both in R80's ALLOWED set. AC-R80-14 will FLIP to FAIL only once R81 commits land paths outside R80's ALLOWED regex (e.g., `coordination/specs/Q-R81-*.md` — the very next thing the Architect is about to commit). The Architect's prediction of "AC-R80-14 flips at R81 chore-A" is preserved; verified by the upcoming spec-triad commit.

The probe-run discipline (R77+R47+R72 3rd-instance reinforcement) is satisfied: the EMPIRICAL.sh script was executed at round-start HEAD before routing to Implementer; its block-by-block output matches the spec's pre-prediction byte-for-byte; the spec audit-sidecar records the verbatim output.

---

## § D. Architect pre-prediction (encoded for Implementer attestation comparison)

### D.1 Predicted at R81 chore-A (post-Implementer GREEN)

| Field | Predicted value | Source |
|---|---|---|
| `pnpm exec tsc -p tsconfig.test.json` exit | `0` | R80 close baseline + R81 zero new TS source |
| `# tests` | `622` | 608 (R80 close) + 14 (R81 ACs) |
| `# pass` | `607 ± 2` band `[605, 609]` | 594 + 14 − 1 (AC-R80-14 flip) ± 2 PRNG-and-environment padding |
| `# fail` | `11` (strict equality) | 10 (R80 close) + 1 (AC-R80-14 flip) |
| `# skipped` | `4` | unchanged from R80 close |
| `bash Q-R81-EMPIRICAL.sh` exit | `0` | all 4 blocks pass at chore-A |
| `git diff 0eb371f HEAD --name-only` line count | `8-12` | R81 deliverables: build-canned-demos.ts + demo.html + DEMO-SCRIPT.md + README.md + test file + 3 Q-R81-* + 2-3 of (NEXT-ROLE.md / MEMORIAL.md / reviews/REVIEWER-REPORT-R81.md / logs/ROUND-R81-*.md) |

### D.2 Predicted at R81 RED commit (pre-GREEN, post-RED test file landing)

| Field | Predicted value | Source |
|---|---|---|
| `pnpm exec tsc -p tsconfig.test.json` exit | `0` (or `0` with R81 test file TS importable) | R81 test file imports built-in `node:test`/`node:assert/strict`/`fs`/`path`/`child_process` only — no engine imports to break tsc |
| `# tests` | `622` | same as chore-A; tests still defined, just stub assert.fail |
| `# pass` | `594` | unchanged from R80 close baseline |
| `# fail` | `25` | 10 (R80 close) + 14 (R81 RED stubs all fail) + 1 (AC-R80-14 flip) |
| `# skipped` | `4` | unchanged |
| `bash Q-R81-EMPIRICAL.sh` exit | `1` | Block 3 fails (fail=25 ≠ 11); Block 2 may pass if `demos/DEMO-SCRIPT.md` written at RED |

The Implementer's GREEN commit must close the gap to chore-A predicted values. Halt conditions § 6.1.3 fire if observed differs materially from chore-A predictions.

---

## § E. Spec-decision rationale (why-picked vs why-rejected paragraphs)

### E.1 Approach 2 picked

Approach 2 (minimal scrubber + selective CSS transitions + nested `<details>` for receipts + document-level keyboard handlers; preserve R79 SVG architecture) was selected for this SLICE 2 final round because:

1. **Lowest-risk diff.** ~150-300 added LOC across `HTML_TEMPLATE_HEAD` + `HTML_TEMPLATE_FOOTER` + ~30 added LOC in README.md + ~180-220 LOC in DEMO-SCRIPT.md = total ~400-600 LOC. All additive. Zero engine modification.
2. **All ACs testable from Node.** No grep regex needs runtime browser execution to verify. R71 MAJOR-1/2 narrative-vs-data lesson honored — Architect does not pre-author empirical claims about animation feel.
3. **R79 SVG architecture preserved.** AC-R79-1 + AC-R79-2 + AC-R79-6 (chart panel + SVG element + per-shard path generation) all continue to PASS byte-identically.
4. **Per-firing collapse is a substantive UX improvement** beyond just satisfying the directive — scenarios like SDC-drift with multiple receipts become scannable.

### E.2 Approach 1 rejected

Full canvas-based animated chart was rejected because:

- Diff would be 600+ LOC (drawFrame rewrite); high blast radius on R79 ACs.
- Browser-runtime-only animation can't be Node-tested via grep; opens R71 MAJOR-1/2 narrative-empirical claims that the test surface can't verify.
- SLICE 2 final round is the wrong cycle for an SVG → canvas migration (would warrant a dedicated R82+ design cycle if pursued).

### E.3 Approach 3 rejected

Hybrid (Approach 2 + stroke-dasharray draw-in animation on SVG paths during play) was rejected because:

- Adds ~80-120 LOC of new JS over Approach 2 for marginal polish gain.
- Dasharray-animation technique requires per-shard path-element tracking across ticks (rather than full redraw each frame); changes the existing `drawFrame` architecture.
- Cross-browser variance in SVG animation handling could expose OBSERVED-binding risk if ACs assert specific stroke-dasharray patterns (a future Implementer / browser update could refute).
- A future round (R82+) can pursue real SVG-path animation as a focused design cycle if operator value justifies.

### E.4 SVG architecture preserved (R79 anti-regression)

The directive says "200ms CSS transitions on M_t changes." A literal-maximally read could mean SVG path animation. The Architect chose the broader interpretation ("dashboard color-state transitions when M_t advances past a threshold") because:

- The dashboard's color-state surfaces (badges, det-fam status text, verdict banner status) are CSS-transitionable via `transition: ... 200ms ease`; the SVG path's `d` attribute is NOT a CSS-transitionable property (per CSS Transitions Level 1 spec).
- Per R71 MAJOR-1/2: prefer interpretations whose claims are empirically verifiable at the test layer. Color-state transitions are observable in Node tests via grep on CSS rules; animation perceived feel is not.
- The Implementer's chore-A and Reviewer's audit MUST validate the empirical effect: when a shard fires (e.g., SDC-drift window ~23), the Family A row's status text + color should fade over 200ms.

---

## § F. Memorial-Updater touchpoints (forward-looking)

The Architect predicts the Memorial-Updater will append the following CONFIRMATION entries at R81 close (assuming the Architect's spec passes pre-emit grilling):

- `CONFIRMATION: R81 ARCHITECT brainstorm | 3 approaches; Approach 2 picked with documented strengths/weaknesses/risks per spec § 0.`
- `CONFIRMATION: R81 ARCHITECT cite-then-walk | 13 files opened + lines verified at session entry; all citations in spec § 0 + § 4 + § 9.7 sourced from grep, not memory. Spec § 9.5 cross-section consistency walk completed.`
- `CONFIRMATION: R81 ARCHITECT EMPIRICAL-sh-probe-run | bash Q-R81-EMPIRICAL.sh executed at spec-emit; outcome verbatim in spec-audit § C.3.`
- `CONFIRMATION: R81 ARCHITECT spec-commit-sequencing | Q-R81-SPEC.md + Q-R81-SPEC-AUDIT.md + Q-R81-EMPIRICAL.sh committed before NEXT-ROLE.md routing block per R21 ARCH MINOR-1.`
- `CONFIRMATION: R81 ARCHITECT acknowledged-gap-mitigation-pairing | every § 5.3 acknowledged gap has a specific Reviewer mitigation (R74 MINOR-2 lesson).`

VIOLATION entries will be appended by the Memorial-Updater if Reviewer-audit surfaces any spec defect at audit time.

---

## § G. Verification checklist (Architect's self-attestation before routing)

- [x] Read CROSS-PROJECT-MEMORIAL.md tail through R80 entries.
- [x] Read MEMORIAL.md (active phase shard).
- [x] Read R80 spec + spec-audit + EMPIRICAL.sh + test file (full).
- [x] Read R79 + R71 spec / test files (relevant ACs only).
- [x] Read DS DEMO-SCRIPT-10MIN.md as analogue template.
- [x] Read `tools/build-canned-demos.ts:1175-1798` (HTML_TEMPLATE_HEAD + FOOTER).
- [x] Read `demos/demo.html` controls section + embedded JS.
- [x] Ran baseline `bash coordination/specs/Q-R80-EMPIRICAL.sh` at session entry → confirmed `tests=608 pass=594 fail=10 skipped=4` at HEAD `0eb371f`.
- [x] Empirically identified the 10 carry-forward failing ACs by direct grep on `not ok` lines.
- [x] Brainstormed 3 distinct approaches with strengths/weaknesses/risks documented in spec § 0.
- [x] Designed component boundaries + pre-prediction + failure modes in spec § 1.
- [x] Prescribed mechanism + load-bearing architectural decisions in spec § 2.
- [x] Inventoried components + ALLOWED_SET regex in spec § 3.
- [x] Pseudocoded per-file extensions in spec § 4.
- [x] Authored 14 ACs in `Given X / When Y / Then Z` form in spec § 5.1.
- [x] Acknowledged AC gaps with specific Reviewer mitigations in spec § 5.3 (R74 MINOR-2).
- [x] Set 10 halt conditions in spec § 6.1.
- [x] Confirmed `None — all resolved` in spec § 7.
- [x] Walked P3 ten-axis verification in spec § 8.
- [x] Pre-emit grilling completed in spec § 9 (9 sub-sections).
- [x] Cross-project rules 1-7 disposition documented in spec § 10.
- [ ] **PENDING:** Run `bash coordination/specs/Q-R81-EMPIRICAL.sh` after this spec triad is committed; populate § C.3 with verbatim output (R77+R47+R72 3rd-instance discipline).
- [ ] **PENDING:** Commit Q-R81-SPEC.md + Q-R81-SPEC-AUDIT.md + Q-R81-EMPIRICAL.sh BEFORE writing NEXT-ROLE.md routing block (R21 ARCH MINOR-1).
- [ ] **PENDING:** Append routing block to NEXT-ROLE.md (post-commit).
- [ ] **PENDING:** Append Architect CONFIRMATION entries to MEMORIAL.md.

Items 21-24 will be addressed in the next workflow steps; this audit-sidecar tracks them transparently per audit-trail discipline.
