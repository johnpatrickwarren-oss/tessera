# Q-R85-SPEC-AUDIT.md — Architect ceremony sidecar for Q-R85-SPEC.md

**Round:** R85 (Phase 4 SLICE 3 fourth + final round; Phase 4 close)
**Tier:** full
**Round-start SHA:** `f737877`
**Spec:** `coordination/specs/Q-R85-SPEC.md`

This sidecar carries the Architect's pre-route discipline application + audit-trail content that belongs OUTSIDE the spec proper. Reviewer reads both files; the Implementer reads only the spec proper.

---

## § A. P3 ten-axis verification — one-sentence per axis

| Axis | One-sentence verification |
|---|---|
| **Correctness** | Each link in the canned-vs-live UI chain (radio change → setMode → body[data-mode] → CSS gray-out + element.disabled) is bound by a separate AC; the run-status state machine's 5 stages are each enumerated in updateRunStatus and asserted by AC-R85-10. |
| **Completeness** | All 5 directive deliverables (mode toggle + scrubber polish; DEMO-SCRIPT minute 10-12; README extension; CROSS-PROJECT-MEMORIAL 3 promotions; test file + EMPIRICAL.sh) have at least one binding AC. |
| **Consistency** | Q.9 cross-section sweep (§ 8.9) confirms identifier / SHA / count / regex consistency across all spec sites and the 4 ALLOWED_SET gate artifacts. |
| **Clarity** | Each AC uses an unambiguous Given/When/Then surface ("file X contains literal Y" / "regex Z matches in section W"); no "correctly", "appropriately", "as needed" phrasing. |
| **Coverage** | 20 ACs cover the four surfaces (HTML/CSS/JS + DEMO-SCRIPT + README + cross-project memorial) plus anti-regression (R71-R84) + anti-scope (ALLOWED_SET) + sentinel (typecheck + EMPIRICAL.sh markers). |
| **Constraints** | engine/* + engine-worker.js + R71-R84 surfaces preserved (AC-R85-18); demos/scenarios/*.json byte-identical (halt 9); no new deps (halt 7); R84 handler additive-only (§ 8.10 walk shows safe margin). |
| **Concurrency** | All R85 additions are synchronous DOM mutations or file appends; no new threads, no async race conditions; R84's existing Worker thread is unchanged. |
| **Corner cases** | Mode-switch mid-run, Cancel during loading, Worker error during streaming, fresh-clone CROSS-PROJECT-MEMORIAL.md missing — all enumerated in § 9 corner cases row with mitigations. |
| **Cost** | ~125 lines tool edit + ~80 lines cross-project memorial + ~280 lines test + 3 spec triad files; ~10-13 file diff total; sub-millisecond AC runtime. |
| **Coupling** | R85 consumes R71/R79/R80/R81/R82/R83/R84 surfaces; the new mode toggle is the only top-level surface addition; cross-project memorial promotions are sub-classes of canonical Rules 1 + 7, not orthogonal new rules. |

---

## § B. Pre-route discipline application

### B.1 Skill 14 (Brainstorm) — applied

Spec § 0 documents three architectural decisions with explicit options + strengths/weaknesses/rejection rationale:

- **Decision A** Mode state representation: separate `currentMode` (PICK) vs controlState-coupled (rejected — preserves R83 wire shape).
- **Decision B** Mode toggle UI shape: radio group (PICK) vs select dropdown vs button pair (rejected — radio is most-obvious affordance).
- **Decision C** Per-mode disable mechanism: hybrid CSS + element.disabled (PICK) vs pure-CSS vs pure-JS (rejected — both surfaces matter for accessibility + form-submission safety).

Two alternative whole-approach paths considered + rejected: **B URL-fragment mode** (deferred — shareable but conflicts with feature flagging); **C auto-detect mode from "custom" scenario** (rejected — directive explicitly wants EXPLICIT toggle).

Documentation lives inline in spec § 0; no separate brainstorm file.

### B.2 Skill 15 (Design) — applied

Spec § 1 documents:
- Component boundaries (§ 1.1 inventory with each surface's state + AC binding)
- Integration points (§ 1.9 with direction + failure mode per integration)
- Failure modes at each integration point (§ 1.10 with mitigation per failure)
- Architect choices documented (§ 1.12 with picked + rejected + rationale per choice)

The design sketch precedes the per-file pseudocode (§§ 1.2-1.8); pseudocode is verbatim (no design decisions deferred to Implementer).

### B.3 Pre-emit grilling — applied

Spec § 8 documents 17 sub-passes of adversarial self-review:
- Q.1 — every claim verifiable (20 claim/verification rows; PASS)
- Q.2 — unstated assumptions (8 assumptions, each with stated location + verification)
- Q.3 — scope added beyond request (6 additions; each KEEP-decisioned with rationale)
- Q.4 — Implementer can act without guessing (12 decisions; each cited to spec section)
- Q.5 — self-application gate (20 ACs walked; each PASS)
- Q.6 — empirical premise verification (R77 OBS-4 lesson; EMPIRICAL.sh probe-run documented; R84 char-bound walk)
- Q.7 — spec-internal contradictions sweep (10 cross-section pairs; PASS)
- Q.8 — acknowledged-gap pairing (R74 MINOR-2 lesson; 5 gaps; each paired with mitigation)
- Q.9 — cross-section consistency (R01-R02 lesson; 19 tokens; PASS)
- Q.10 — discriminating-AC walk-through (R44/R46/R65/R71 lesson; 20 ACs; PASS per AC) + R84-AC non-regression walk (17 R84 ACs; 16 PASS + 1 expected flip)
- Q.11 — spec-amendment-ALL-gate-artifacts-propagation (R72/R82 MAJOR-1 lesson; 4 gate artifacts in lockstep at spec-emit)
- Q.12 — routing-block grep-verification (R65 MINOR-1 lesson; PASS)
- Q.13 — anti-scope ALLOWED_SET forward-coverage walk (R79 lesson; 4 prior-round forward-protection ACs walked; 1 flip predicted)
- Q.14 — cite-then-verify for all line citations (R02/R11/R65 lesson; 12 citations verified)
- Q.15 — Architect-claim-without-empirical-walk discipline (canonical Rule 1 sub-class; 14 claims verified empirically)
- Q.16 — re-read as Implementer (8-bullet self-application; PASS)
- Q.17 — round-evolution-fragile AC pattern self-application gate (the very rule R85 promotes; 7 AC categories walked; ZERO uses of `{0,N}?` quantifier; PASS)

---

## § C. Architect pre-prediction on outcomes

| Observable | Pre-prediction | Source |
|---|---|---|
| Q-R85-EMPIRICAL.sh exit at chore-A | **0** (all 5 blocks PASS) | spec § 5.2 |
| tsc exit at chore-A | **0** | spec § 5.2 |
| `node --test` process exit at chore-A | **1** (16 fails) | spec § 5.2 |
| TAP # tests | **689** strict | spec § 5.2 (R84 close 669 + 20 new) |
| TAP # pass | **669** band [668, 670] | spec § 5.2 (650 R84 close − 1 forward-protection flip + 20 R85 new) |
| TAP # fail | **16** strict | spec § 5.2 (R84 close 15 + AC-R84-16 forward-protection flip) |
| TAP # skipped | **4** strict | spec § 5.2 |
| `git diff f737877 HEAD --name-only` line count | **9-14** band | spec § 5.2 |
| `demos/scenarios/*.json` byte-identity | **preserved** strict | halt condition 9 |
| Forward-protection-AC flips | **1** (AC-R84-16) | spec § 1.11 + § 8.13 |
| R84 ACs continuing to pass | **16 of 17** | spec § 8.10 R84-AC non-regression walk |
| `~/.claude/CROSS-PROJECT-MEMORIAL.md` line delta | **+~80 lines** | spec § 1.11 |

---

## § D. Decision rationale

### D.1 Why "Canned vs Live" radio group (not select dropdown)

The directive's framing — "top-level switch" — and the existing dashboard's other top controls (Play/Pause/Reset buttons + scenario selector dropdown) make this a UI-pedagogical choice: a radio group visually communicates "two choices, exclusively one selected" at a glance, while a select hides the second option until the dropdown opens. For a demo whose primary purpose is to make capabilities discoverable, exposure wins. The radio group costs ~6 markup lines vs the select's ~4 — negligible.

### D.2 Why separate `currentMode` (not controlState.mode field)

The R83 surface preservation discipline (AC-R84-15) anchors on the EXACT `controlState` declaration regex. Adding a `mode` field to controlState is technically additive (the regex tolerates extra fields) but introduces *semantic* coupling: `emitControlChange` events would now carry mode transitions; downstream listeners might assume mode is a parameter to engine compute (it's not). Keeping `currentMode` as a UI-layer concern, with no entry in `R83_DEFAULTS` and no participation in `tessera:control-change` events, preserves the engine-input vs UI-input boundary that R83 established.

### D.3 Why hybrid CSS body[data-mode] + element.disabled

Either alone has a gap:
- **CSS-only**: visually grays out, but the operator can still tab-into the input via keyboard, type into a disabled-looking text input, and trigger validation. Counter-intuitive UX.
- **JS-only**: explicit `element.disabled=true` per input, but the visual gray-out is implicit (relies on browser default `:disabled` rendering, which varies across themes).

Combining both produces a robust UX: CSS opacity + `pointer-events:none` for visual; `element.disabled` for keyboard/form-submission semantics. The cost is ~12 lines of CSS + a per-element disabled-toggle loop in setMode (~10 lines JS); both small.

### D.4 Why the 5-stage updateRunStatus state machine

The Live mode run state machine has exactly 5 observable states:
1. **reset** (between runs; status indicator empty)
2. **running** (window streaming; per-window count update)
3. **complete** (terminal message received; "Run again" affordance)
4. **error** (worker or bundle error; status shows "Run failed")
5. **cancelled** (user clicked Cancel; status shows "Run cancelled")

Combining `complete` and `cancelled` under one "terminated" state would hide useful information (the operator's mental model differs between "done normally" and "I cancelled"). Combining `error` and `cancelled` would hide whether the run failed for engine reasons or user reasons. Each stage is semantically distinct. The 5-branch updateRunStatus body is ~25 lines — same as splitting into 5 helpers but with co-located logic.

### D.5 Why README modifies only the top-level `## Quick demo` section (not both)

R81 introduced a duplicate-heading defect (README has TWO `## Quick demo` sections at lines 73 + 194; R81 MAJOR-3 caught by Reviewer). The cleanest remediation is to MERGE the two sections OR rename one. Both are out of R85 scope (would re-touch R81's exact MAJOR-3 territory). R85 modifies only the top-level (line 73) section — the user-visible "Getting started" path — and explicitly notes in § 6 anti-scope that the duplicate is NOT remediated this round. A future R86+ candidate could remediate.

### D.6 Why CROSS-PROJECT-MEMORIAL.md append discipline (not in-place edits)

The existing file has 3,800+ lines of accumulated per-round entries. In-place edits to existing rule sections would risk:
- Audit-trail loss (the original rule landed at R26/R32/R34/R36/R38/R46 specific commits; modifying the canonical text rewrites history).
- Format drift (each prior section reflects the format-at-time-of-derivation; modernizing them all would be a project of its own).

The append discipline (one new section per round) is the existing pattern (R44 + R45 + R46 sections all append). R85's three promotions land in ONE new section ("## Tessera R85 entries (2026-05-21) — Phase 4 close promotions") with three subsections under "### Reinforcement rules derived". Format consistency with prior per-round sections.

### D.7 Why no AC binds the actual cross-project rule TEXT verbatim (only short-name + key phrases)

Binding the AC to the full canonical-rule text would couple the AC to copy-edit-level decisions (sentence structure, paragraph breaks, Oxford commas). Future Reviewer-driven amendments to the rule text would silently fail the AC. The discriminating property is RULE PRESENCE (slug + key phrase), not RULE TEXT. Reviewer cold-eye reads spec § 1.7 verbatim text for format compliance — that's the right layer for full-text verification.

---

## § E. Amendments from prior version

N/A — first emission of Q-R85-SPEC.md.

---

## § F. Reviewer-anchor table (REVIEWER-ANCHOR; existing architectural surface citations per anchor PR #35 discipline)

| Surface | File:line | Cited in spec | Verified at spec-emit |
|---|---|---|---|
| `<select id="scenario-selector">` | `demos/demo.html:224` | § 1.2 insertion A anchor | ✓ |
| `<section id="tessera-control-panel">` | `demos/demo.html:248` | § 1.2 insertion B anchor (after `#engine-error-banner`) | ✓ |
| `<div id="engine-error-banner">` | `demos/demo.html:319` | § 1.2 insertion B anchor | ✓ |
| `var windowScrubber` | `demos/demo.html:12916` | § 1.4 insertion point A reference | ✓ |
| R82 smoke block | `demos/demo.html:13452-13477` | § 1.1 preservation marker | ✓ |
| R84 btnRun handler char size | 3133 chars | § 8.10 walk | ✓ (awk + wc -c) |
| Q-R84-EMPIRICAL.sh baseline pass | 15 of 15 sub-checks | § 8.1 + § 8.6 | ✓ (full run) |
| `## Quick demo` (1st instance) | `README.md:73` | § 1.6 insertion target | ✓ |
| `### Browser dashboard` | `README.md:77` | § 1.6 section boundary | ✓ |
| `## Quick demo` (2nd instance; R81 duplicate-heading defect) | `README.md:194` | § 6 anti-scope (NOT modified) | ✓ |
| DEMO-SCRIPT "Before you start" | `demos/DEMO-SCRIPT.md:7` | § 1.5 insertion A boundary | ✓ |
| DEMO-SCRIPT "Bank of follow-up questions" | `demos/DEMO-SCRIPT.md:174` | § 1.5 insertion B boundary | ✓ |
| Rule 1 canonical landing R26 | `~/.claude/CROSS-PROJECT-MEMORIAL.md` | § 1.7 sub-class promotion anchors | ✓ |
| Rule 7 canonical landing R38 | `~/.claude/CROSS-PROJECT-MEMORIAL.md:3522` | § 1.7 2-instance-flag discipline | ✓ |
| Rule 1 sub-class `empirical-command-attestation` canonical R46 | `~/.claude/CROSS-PROJECT-MEMORIAL.md` | § 1.7 sub-class pattern precedent | ✓ |

---

## § G. Routing readiness checklist

- [x] Spec § 0 brainstorm with ≥3 approaches + rejection rationale (Approaches A/B/C + sub-decisions A/B/C)
- [x] Spec § 1 design phase with component boundaries + integration points + failure modes
- [x] Spec § 1.2-1.8 verbatim source for every prescribed surface
- [x] Spec § 3 component inventory + ALLOWED_SET 4-gate lockstep
- [x] Spec § 5 acceptance criteria with 20 ACs in Given/When/Then form; no ambiguous language
- [x] Spec § 5.3 acknowledged AC gaps each paired with mitigation
- [x] Spec § 6 anti-scope explicit
- [x] Spec § 6.1 halt conditions enumerated (14 conditions)
- [x] Spec § 6.2 routing-block template with verbatim OBSERVED slots
- [x] Spec § 7 open questions = "None — all resolved"
- [x] Spec § 8 pre-emit grilling with 17 sub-passes; all PASS
- [x] Spec § 9 P3 ten-axis verification
- [x] Spec § 10 pipeline invocation
- [x] Q-R85-EMPIRICAL.sh authored with `--test-reporter=tap` per R77 lesson
- [x] All ACs avoid `{0,N}?` char-bounded regex (the very rule R85 promotes; self-application gate PASS)
- [x] R84-AC non-regression walk shows 16 of 17 R84 ACs continue to pass + 1 expected forward-protection flip
- [x] Cross-project memorial 3 promotions verbatim text in § 1.7
- [x] Empirical premise verification — Q-R84-EMPIRICAL.sh full run at round-start confirms baseline

ROUTING STATUS: **READY**.
