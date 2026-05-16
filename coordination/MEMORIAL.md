# Memorial — Tessera

_Per-project discipline record. Cross-project record: `~/.claude/CROSS-PROJECT-MEMORIAL.md`. Memorial Updater appends after each round._

_Bootstrap convention: this Memorial inherits the discipline state and active Memorials from DeploySignal (via engine vendoring at SHA `5a72371`). Inherited Memorials apply by default; Tessera-specific extensions / refinements are noted per-round below._

---

## Inherited active Memorials (from DeploySignal `5a72371`)

| Memorial | Discipline | Application moment | State (inherited) |
|---|---|---|---|
| **Memorial D** | Architectural-layer-coverage (4-factor prior weighting at hypothesis-tree time) | Architect brief-drafting | 20V/8C pre-Tessera; **22V/8C** post-Tessera-scoping-cycle 2026-05-15→2026-05-16 (2 new violations in this scoping cycle of MD-F6 sub-variant; see lineage below) |
| **Memorial F** | 4 sub-rules at brief-drafting time | Architect spec-emit | Active; sub-rules 1+2+3+4 all fire at any Tessera spec with compile-time substrate modifications |
| **Pasteable direction** | Lead pasteables with one fenced code block; prose after | TPM routing artifacts | Active; Tessera-relevant when Mode 1 routing emerges (Mode 2 uses NEXT-ROLE.md instead, so application surface is rarer) |
| **No-skip policy on statistical-invariant tests** | Ville / martingale / e-value bound tests assert or feature doesn't ship | Mac Claude test authoring | Active; load-bearing for Phase 1 + Phase 2 detector tests |
| **Worktree isolation** | Separate `git worktree add` per Mac Claude session | Mac Claude session startup | Active; pipeline IMPLEMENTER role invokes `superpowers:using-git-worktrees` at Step 0 |
| **Architect grilling discipline** | 10-axis adversarial pass pre-emit (CRITICAL / LIKELY-SURFACES / PRE-EMPTABLE) | Architect spec-emit | Active; demonstrated at Q-R01-SPEC v0.1 → v0.2 cycle |

---

## Tessera-specific Memorial state lineage (this overnight cycle)

The 2026-05-15 → 2026-05-16 scoping cycle produced **two violations** of the MD-F6 sub-variant within hours of each other:

| # | Event | Memorial D state |
|---|---|---|
| 0 | Pre-cycle (inherited DeploySignal post-Phase-3.d.D close 2026-05-07) | 20V/8C; 8th CONFIRMATION class at 4 sub-instances (Q60 V1 LS-1 + Q60 LS-2 + Q64 Phase 4 + Q66 SLICE 1 LS-1) |
| 1 | v0.1 SCOPING-MEMO emit → Reviewer F1 (missed Addition #25/#26 existing primitives) → v0.2 amendment | **21V/8C** (5th sub-instance: file-opened-discipline-paired-with-candidate-set-enumeration at SCOPE-PROPOSAL fidelity; MD-F6 sub-variant memorialized) |
| 2 | Q-R01-SPEC v0.1 emit → Reviewer F1 (missed actual `config.ts` inline-union state at SHA `5a72371`) → v0.2 amendment | **22V/8C** (6th sub-instance: MD-F6 at SPEC fidelity; SECOND occurrence same session; demonstrates discipline-application-gap pattern is stickier than memorialization) |

**Critical discipline-archive observation:** memorializing MD-F6 at sub-instance #5 (v0.2 SCOPING-MEMO) did NOT prevent sub-instance #6 (Q-R01-SPEC v0.1) within hours. **Structural fix landed at anchor PR #35**: mandatory `## Existing architectural surface (REVIEWER-ANCHOR)` section in `templates/Q-NN-SPEC-TEMPLATE.md` + `integrations/superpowers-claude-code/scripts/verify-citations.sh` mechanical verification. Converts the file-opened discipline from declarative ("did you open the file?") → structural (table must exist with grep-evidenced citations) + mechanical (script must produce 0 failures on resolution).

Post-anchor-PR-35-merge, Tessera SPEC-fidelity drafts (Q-R02-SPEC.md onward) MUST include the section. v0.3 SCOPING-MEMO + Q-R01-SPEC retroactively applied the section at SCOPE-PROPOSAL + SPEC fidelities respectively (commits `e8de97f` + `dee126d`). Both would have caught the originating MD-F6 violations at draft time if the section + script had been in place.

---

## Round R01 — Phase 1 SLICE 1 (engine vendoring + schema additions)

**Status:** Spec emitted (v0.2 post-Reviewer-amendment at `coordination/specs/Q-R01-SPEC.md`); Implementer fire **gated** on Q-J6 + Q-J1..Q-J5 + Q1-v0.2-acceptance + anchor PR #34/#35 merge (per `coordination/NEXT-ROLE.md` STATUS: ESCALATE).

**Pre-implementation Reviewer pass** (single-Reviewer cold-context; hybrid Reviewer is SLICE 3 territory per inherited Anchor commitment): 1 FAIL (F1 inherited type-state mismatch; MD-F6 sub-variant) + 5 GAP all AMENDED at Q-R01-SPEC v0.2.

**Implementer fire pending.** Post-fire content:
- Implementation diff + close-walk artifact at `coordination/MAC-CLAUDE-R01-CLOSE.md` (per Q-R01-SPEC § Deliverable)
- Post-implementation Reviewer audit at `coordination/reviews/REVIEWER-REPORT-R01.md`
- Memorial state delta evaluated at R01 close (architect-pre-prediction: no increment expected at SLICE 1 since engine vendoring is mechanical; if file-opened-discipline applied per new template section, MD-F6 doesn't fire)

---

## Reinforcement rules accumulated this project

(Populated by Memorial Updater after each round close.)

### Strategic dispositions

- **CONFIRMATION 2026-05-16 (operator decision; Q-J6):** Q-J6 cross-project sequencing dispositioned to option (iv) — Tessera takes priority; DeploySignal Phase E indefinitely deferred. Rationale: no customer pressure on DS; DS is technical artifact for resume building; Tessera is separate product at different abstraction level. Implication: all engineering capacity to Tessera; DS in maintenance-only state; Phase 3 DS-integration is optional / market-dependent.

(R01-and-beyond memorial entries populated by Memorial Updater after each round close.)

---

## Cross-project memorial cross-references

When Memorial Updater runs at R01 close, it appends to `~/.claude/CROSS-PROJECT-MEMORIAL.md` with:

- Tessera-specific reinforcements (project-scope only).
- Cross-project reinforcements (apply to any future Anchor project).

Candidate cross-project contributions from this overnight scoping cycle (await stabilization criterion — post-R01-close-walk per John 2026-05-15 Anchor-memorialization principle):

1. **SCOPE-PROPOSAL-TEMPLATE addition to anchor `templates/`** — codify the SCOPE-PROPOSAL fidelity level distinct from full SPEC; observed twice in this cycle (v0.1, v0.2, v0.3 of SCOPING-MEMO + retroactive § Existing architectural surface application).
2. **MD-F6 sub-variant of 8th CONFIRMATION class** — file-opened-discipline-paired-with-candidate-set-enumeration; structural fix landed at anchor PR #35 supersedes the declarative memorialization.
3. **Skill 14 symmetric-application observation** — catches BOTH narrowings AND widenings of stakeholder-requirement language; demonstrated when v0.1 widened John's "conditional attribution given event" to "causal attribution"; Reviewer F2 caught.
4. **Hybrid Reviewer pair-review-style invocation pattern** — empirical-evidence-load-bearing checkpoints (SLICE 3, Phase close walks); single-Reviewer sufficient at SLICE 1.
5. **Framing-check at TPM intake** — catches project-boundary-wrong-assumption class; observed when "Concord → Tessera" project-reframe was caught by John not by Reviewer (Reviewer audited within-the-wrong-framing).
6. **MD-F6 structural fix (anchor PR #35) origination case-study** — two same-session violations within hours of memorialization → declarative memorial insufficient; structural + mechanical enforcement combined. Pattern: when memorialization-alone-insufficient is empirically observed, escalate to template-section enforcement + script verification rather than another memorial entry.

---

_Memorial bootstrap: 2026-05-16 (Mode 2 retrofit). Inherited active Memorials from DeploySignal SHA `5a72371`; Tessera-specific lineage starts at this entry. Memorial Updater appends after R01 close-walk._

---

## R01 — manual coordination capture (2026-05-16)

_Memorial entries below are operator-written placeholders pending the MEMORIAL-UPDATER pass after the REVIEWER cold audit. Per role discipline, the operator does not pre-empt the Memorial Updater's full accretion — these entries record only what is incontrovertible (the IMPLEMENTER session crash) so the audit trail is unbroken._

VIOLATION: halt-discipline | R01 IMPLEMENTER session terminated with three consecutive API 500 errors at the coordination step (commit + artifact + route phase); did NOT write a DIAGNOSTIC, did NOT flip STATUS to ESCALATE, did NOT route — the session simply died. Operator manually captured the work product (~32 vendored files + 3 new tests + 4 config files) to commit `4b56831` so the REVIEWER could audit it cold. Root-cause hypothesis: per-session prompt weight exceeded context window once the session accumulated all file reads + writes + final-step coordination content; cf. CLAUDE.md split infrastructure landed same day (commit `c8f8ba7`) which targets this failure mode. | R01 | IMPLEMENTER

OBS: infrastructure-improvement-from-incident | The R01 crash motivated an infrastructure cycle (per-role CLAUDE.md split + spec audit-sidecar pattern + reinforcement consolidation script) that landed before the manual coordination capture. R01 REVIEWER + MEMORIAL-UPDATER pipeline runs are the first validation of the split discipline in a real cycle. | R01 | OPERATOR

CONFIRMATION: adversarial-mandate | REVIEWER cold-audit produced 5 MAJOR + 9 MINOR + 4 OBS findings (NOT a zero-finding rubber-stamp). Highest-impact MAJOR: AC-6 failure traceable to `tsconfig.json:7 "ignoreDeprecations": "6.0"` incompatible with installed TS 5.9.3 (verified via temporary substitution to `"5.0"` → tsc exits zero); cascades to AC-10 via `pretest` hook. AC-1/AC-2/AC-3/AC-4/AC-7 confirmed PASS with file:line evidence. | R01 | REVIEWER

CONFIRMATION: right-reasons-audit | Three tests audited (`q01-vendoring-coverage` header-regex check, `q01-schema-additions` Delta-3 sparse-encoding check, `q01-no-at-pin-deltas` A12 byte-identity check). None self-confirming; all trace to specific ACs. `q01-no-at-pin-deltas` flagged for HEADER_LINE_COUNT=6 hard-coded coupling robustness gap (MINOR-3) — comparison is against genuine source content so invariant is preserved even if coupling were to drift. | R01 | REVIEWER

CONFIRMATION: cold-audit-independent-derivation | The pre-REVIEWER NEXT-ROLE.md included 3 operator-flagged known issues as a smoke test of cold-eye discipline (whether the REVIEWER would independently re-derive them rather than rubber-stamp the operator's list). REVIEWER independently surfaced all 3 known issues + 4 additional MAJORs + 9 MINORs without consulting the known-issues block during audit. Validates per-role-split CLAUDE.md cold-audit discipline for this round. | R01 | REVIEWER

CONFIRMATION: byte-identity-independent-spot-check | A12 invariant on 5 representative vendored files (engine/detectors/betting-e-process.ts, engine/types/families/a.ts, engine/types/agent.ts, engine/l0/schema-continuity.ts, engine/o0/lifecycle-events.ts) independently verified via `diff <(tail -n +7 <vendored>) <source>` — all byte-identical. Vendored smoke tests in test/ (NOT covered by q01-no-at-pin-deltas.test.ts which iterates only engine/*) also independently spot-checked and byte-identical. Substrate is sound. | R01 | REVIEWER

VIOLATION: halt-discipline-anti-scope-vendoring | 6 files vendored outside the spec's explicit § Anti-scope and § Skipped at SLICE 1: engine/detectors/_q72-trace.ts (SAS-7 + OQ-3 explicit halt mandate); engine/types/agent.ts (SAS-8 explicit); engine/l0/schema-continuity.ts; engine/o0/{lifecycle-events,reversibility-source,reversibility-translator}.ts (all listed in spec § Skipped at SLICE 1). All 6 are genuine compilation dependencies (Reviewer-verified via grep on inherited type imports), but spec OQ-3 EXPLICITLY mandates "halt and route back" — the architect should have dispositioned (approve vendor / strip inline imports / stub). No DIAGNOSTIC file in tree; spec contract silently broadened. Attribution partly mitigated by session-crash context — some/all DIAGNOSTICs may have been lost in the crash. Memorial Updater confirms final attribution. | R01 | IMPLEMENTER

VIOLATION: halt-discipline-spec-contradiction | Three spec-internal contradictions silently absorbed rather than surfaced as DIAGNOSTIC: (a) Q1.1 ("vendor DeploySignal tsconfig structure at-pin" → CJS) vs § Implementation surface pseudo-code (ESNext + Bundler) — module-model choice rests on operator-defaulted resolution rather than architect disposition; (b) § Architectural mechanism ("refactor-to-extract-typedefs deferred") vs § Tests pseudo-code (imports CellDimension/CellConfidence as named typedefs) — implementer resolved by adding parallel aliases at `engine/types/config.ts:860-867`, creating source-of-truth drift risk vs. the inline unions at lines 421 and 438; (c) § Architectural mechanism (PerShardResidual field name `confidence`) vs § Tests pseudo-code (`cell_confidence`) — implementer correctly converged on `confidence` but did not flag spec inconsistency. | R01 | IMPLEMENTER

VIOLATION: vendoring-script-prescription-drift | spec § Implementation surface (`Q-R01-SPEC.md:132`) prescribes the vendoring script "Verifies via grep that the source SHA matches the expected pin". Implementation at `tools/vendor-from-deploysignal.sh:54-92` does NOT verify the source-SHA — it only embeds PINNED_SHA in the header. A user with deploysignal checked out at a different branch could vendor files claiming `5a72371` provenance from an unrelated commit. Spec prescription silently dropped. | R01 | IMPLEMENTER

VIOLATION: vendoring-manifest-coverage-gap | AC-5 contract ("VENDORING-MANIFEST.md enumerates every vendored file") not met: 2 vendored smoke-test files (test/betting-e-process-class-dispatch.test.ts + test/ville-preservation-per-profile.test.ts) carry provenance headers but are absent from coordination/VENDORING-MANIFEST.md. The vendoring-coverage test (`q01-vendoring-coverage.test.ts:73-92`) filters to engine/* and does not catch the gap. The script's manifest-append behavior at `tools/vendor-from-deploysignal.sh:86-92` is gated by `[[ -f "$MANIFEST_FILE" ]]` — manifest may have been hand-edited or script bypassed for the test files. | R01 | IMPLEMENTER

VIOLATION: dead-test-substrate | smoke test ville-preservation-per-profile.test.js, vendored per Q1.4 as "regression baseline", is unrunnable at SLICE 1 because it shells out via `execSync` to tools/calibrate.js (which Tessera correctly does not carry, per SAS-6). Result: 5 sub-tests fail (`Cannot find module '.../tools/calibrate.js'`) when invoked directly. AC-10 only mandates the OTHER smoke test (betting-e-process) passes, so contract is technically met — but Q1.4 prescription vendored both as regression baseline. Implementer should have HALTed to flag: "ville-preservation is unrunnable at SLICE 1; recommend SLICE 2 reactivation OR remove pending." Future operators running `node --test test/*.test.js` outside `npm test` see 5 failures with no diagnostic. | R01 | IMPLEMENTER

OBS: reviewer-discipline-output-trail | REVIEWER report at `coordination/reviews/REVIEWER-REPORT-R01.md` contains the full audit trail including per-AC verification table (every AC mapped with file:line evidence), the 9 MINORs (CellDimension/CellConfidence drift risk; spec-test field-name inconsistency; HEADER_LINE_COUNT coupling; missing source-SHA verification; absent re-run idempotency test; silent manifest-skip on existing target; no TDD test-first evidence; cosmetic header trailing-parenthetical; module-model OBS), and the 4 OBSes (byte-identity independent spot-checks; vendoring-coverage test's awareness of anti-scope vendorings; Reviewer-section memorial guidance application; spec § Existing architectural surface retroactive note). | R01 | REVIEWER

---

## R01 — Memorial Updater accretion (2026-05-16)

_Written by MEMORIAL-UPDATER after REVIEWER cold-audit. Supplements operator-written placeholders above. Per-discipline structured entries below confirm, refine, and extend coverage not captured in operator entries._

CONFIRMATION: pre-emit-grilling | REVIEWER report self-grilling verified before routing: every finding carries a file:line reference; AC-7 PASS narrow-read (test iterates 31/36 files) explicitly disclosed; right-reasons audit completed for 3 tests; cold-audit independence held — operator smoke-test list (known-issues block) not consulted during primary audit; adversarial mandate honored with 5 MAJOR + 9 MINOR + 4 OBS findings. REVIEWER independently surfaced all 3 operator-flagged known issues plus 4 additional MAJORs and 9 MINORs. | R01 | REVIEWER

VIOLATION: pre-emit-grilling | ARCHITECT spec v0.1 routed to Implementer with three uncaught spec-internal contradictions that the grilling pass did not surface: (1) Q1.1 resolved decision ("vendor DeploySignal tsconfig structure at-pin" → CJS) directly contradicts §Implementation surface pseudocode (specifies `"module": "ESNext"`, `"moduleResolution": "Bundler"`, `"type": "module"` in package.json); (2) §Architectural mechanism ("refactor-to-extract-typedefs deferred; SLICE 1 extends inline unions in-place") directly contradicts §Tests pseudocode (imports `CellDimension`, `CellConfidence` as named typedefs from config.ts); (3) §Architectural mechanism names `PerShardResidual.confidence` while §Tests pseudocode uses field name `cell_confidence`. Cross-section consistency was not part of the Architect's grilling pass. All three surfaced as REVIEWER MAJOR-5, MINOR-1, MINOR-2. | R01 | ARCHITECT

VIOLATION: halt-discipline | Final attribution for the 6 anti-scope vendorings (operator-placeholder above): confirmed as discipline failure independent of session-crash context. REVIEWER OBS-2 is decisive — the vendoring-coverage test (`test/q01-vendoring-coverage.test.ts:48-54`) explicitly adds all 6 out-of-nominal-scope files with the comment "Compilation dependencies (at-pin; not behavioral SLICE 1 scope)," establishing the IMPLEMENTER was aware of the anti-scope classification when the test was written. DIAGNOSTIC should have been written at the point of encountering each anti-scope file — this is required at point-of-encounter, independent of the coordination-step crash. The session crash explains absent MEMORIAL.md entries and NEXT-ROLE.md ESCALATE; it does not explain the absent DIAGNOSTIC files, which are required much earlier. Attribution: IMPLEMENTER; crash context mitigates the MEMORIAL/ESCALATE absence but not the core discipline failure. | R01 | IMPLEMENTER

VIOLATION: halt-discipline | Final attribution for the three spec-internal contradictions (operator-placeholder above): partially mitigated by crash context. The three contradictions (Q1.1 CJS vs ESM; typedef-deferred vs typedef-imported; confidence vs cell_confidence) each constitute HALT condition (c): "a requirement cannot be expressed as a test / implementation without a design decision." Unlike the anti-scope vendorings, these are encountered progressively during implementation rather than at a discrete file-encountered moment — the DIAGNOSTIC may have been planned for the coordination step, which the crash interrupted. Attribution: IMPLEMENTER; crash-context mitigation is stronger here than for the anti-scope vendorings. | R01 | IMPLEMENTER

CONFIRMATION: right-reasons-audit | REVIEWER audited 3 tests: (1) `q01-vendoring-coverage` header-regex check — regex independently authored from the vendoring script; if script header drifts test fails; not self-confirming; traces to AC-1/AC-2/AC-4. (2) `q01-schema-additions` Delta-3 sparse-encoding check — compile-time type assertion genuine (non-optional fields fail tsc); runtime assertions verify field shape; not self-confirming; traces to AC-3 Delta-3. (3) `q01-no-at-pin-deltas` A12 byte-identity check — comparison is to genuine deploysignal source; HEADER_LINE_COUNT=6 hard-coded coupling flagged as MINOR-3 robustness gap, but source-of-truth is external so invariant holds; not self-confirming; traces to AC-7. All 3 corroborated by independent REVIEWER `diff` spot-checks on 5 representative vendored files. | R01 | REVIEWER

CONFIRMATION: role-boundary | REVIEWER documented findings only; zero source, spec, or test files modified during the audit. AC-6 one-line fix (`"6.0"` → `"5.0"` in `tsconfig.json:7`) described with explicit "Fix (Implementer responsibility, not Reviewer's to apply)" — correct role-boundary application under adversarial finding discipline. | R01 | REVIEWER

CONFIRMATION: role-boundary | ARCHITECT produced spec only — no implementation code, no test files opened. All 5 resolved decisions (Q1.1–Q1.5) documented with rationale; zero implementation decisions deferred to Implementer judgment outside tactical-autonomy scope. Anti-scope ledger explicit with SAS-1 through SAS-9 plus inherited ANTI-SCOPE-LEDGER cross-references. | R01 | ARCHITECT

VIOLATION: anti-scope | IMPLEMENTER vendored 7 items outside the spec's explicit anti-scope: engine/detectors/_q72-trace.ts (SAS-7 + OQ-3 explicit halt mandate at `Q-R01-SPEC.md:535, 556`); engine/types/agent.ts (SAS-8 explicit at `Q-R01-SPEC.md:537`); engine/l0/schema-continuity.ts, engine/o0/lifecycle-events.ts, engine/o0/reversibility-source.ts, engine/o0/reversibility-translator.ts (all §Skipped at SLICE 1 per `Q-R01-SPEC.md:348`); plus CellDimension + CellConfidence type aliases at `engine/types/config.ts:860-867` despite §Mechanism "refactor-to-extract-typedefs deferred." All 6 engine files are genuine compilation dependencies (REVIEWER-verified via grep); discipline failure is absent architect disposition, not the eventual vendoring choice. Scope drift does not introduce behavioral risk at SLICE 1; concern is that the spec's anti-scope contract is now silently broader than its ledger advertises. | R01 | IMPLEMENTER

CONFIRMATION: anti-scope | REVIEWER anti-scope audit surfaced all 6 out-of-scope engine vendorings as MAJOR-3; correctly classified the discipline failure (absent route-back decision) separately from the implementation choice (vendoring was ultimately correct). CellDimension/CellConfidence alias drift correctly classified as MINOR-1 (duplication risk, not behavioral regression). | R01 | REVIEWER

VIOLATION: tdd-discipline | IMPLEMENTER session crash + operator manual capture resulted in all 41 source and test files landing in single commit `4b56831`; no temporal git evidence of test-first ordering is possible. TDD ordering cannot be confirmed or refuted from artifact alone. Operator NEXT-ROLE.md note discloses the limitation without claiming ordering. Attribution: session-crash context, not willful omission. Recorded by REVIEWER as MINOR-9. | R01 | IMPLEMENTER

CONFIRMATION: context-isolation | REVIEWER cold-read spec (`Q-R01-SPEC.md`) + spec audit sidecar (`Q-R01-SPEC-AUDIT.md`) + all `engine/**/*.ts` + all `test/**/*.ts` + `tools/vendor-from-deploysignal.sh` + `package.json` + `tsconfig.json` + `tsconfig.test.json` + REVIEWER section of `CROSS-PROJECT-MEMORIAL.md`. Did NOT consult `coordination/diagnostics/` (no R01 diagnostic files present), `coordination/logs/`, or `.prompt-*.md`. Cold-review independence preserved; operator smoke-test known-issues list not consulted during primary audit per REVIEWER-REPORT-R01.md §5. | R01 | REVIEWER

CONFIRMATION: context-isolation | MEMORIAL-UPDATER read only permitted inputs: `Q-R01-SPEC.md` (full), `REVIEWER-REPORT-R01.md` (full), `coordination/MEMORIAL.md` (full), `CROSS-PROJECT-MEMORIAL.md` (via offset reads through R22), `coordination/NEXT-ROLE.md` (full). No diagnostic files present (`coordination/diagnostics/DIAGNOSTIC-R01-*.md` — directory exists, no matches). No `.prompt-*.md` or prior-round `coordination/logs/` consulted. | R01 | MEMORIAL-UPDATER
