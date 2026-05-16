# Round R01 Summary — Phase 1 SLICE 1 (engine vendoring + schema additions)

_Written by MEMORIAL-UPDATER 2026-05-16._
_Spec: `coordination/specs/Q-R01-SPEC.md` v0.2. Implementer attestation SHA: `4b56831`. Reviewer report: `coordination/reviews/REVIEWER-REPORT-R01.md`._

---

## What worked

- **Vendoring substrate is sound.** AC-1 (11 detector files), AC-2 (5 family type files), AC-4 (core + orchestration + type files), AC-7 (A12 byte-identity preservation) all PASS. REVIEWER independently spot-checked 5 representative files via `diff`; all byte-identical modulo 6-line provenance header. The mechanical-vendoring approach was well-chosen and correctly executed for all at-pin files.

- **Schema extensions landed correctly.** AC-3 (all 4 Deltas in `engine/types/config.ts`) is PASS: `shard_id` as 7th dimension union member; `warm_start` as 5th confidence union member; `PerShardResidual` + `PerShardCell` type declarations; `per_shard_cells?: PerShardCell[]` on `CompiledConfig`. All verified by `q01-schema-additions.test.ts` (5 sub-tests, all pass) and line-range diff against deploysignal source.

- **Adversarial mandate honored.** REVIEWER produced 5 MAJOR + 9 MINOR + 4 OBS findings — not a zero-finding rubber-stamp. All 3 operator-flagged known issues (AC-6/AC-10 failure + 4 anti-scope vendorings) independently re-derived, plus 4 additional MAJORs and 9 MINORs not known at routing time. Cold-eye smoke-test (operator-set known-issues block not consulted during primary audit) passed.

- **Right-reasons audit passed.** 3 tests audited; none self-confirming; all trace to specific ACs. Independent spot-check corroborates the test suite's byte-identity assertions.

- **Architect grilling cycle caught MD-F6 before implementation.** Pre-implementation Reviewer pass (F1) caught the MD-F6 sub-variant in spec v0.1 (wrong type-state for CellDimension/CellConfidence). v0.2 amendment opened the file and corrected citations. The retroactive `## Existing architectural surface` section in Q-R01-SPEC.md structurally enforces the file-opened discipline for future rounds.

- **Infrastructure improvement from incident.** The R01 session crash motivated same-cycle infrastructure work: per-role CLAUDE.md split + spec audit-sidecar pattern + reinforcement consolidation script (commit `c8f8ba7`). R01 REVIEWER is the first validation of the split discipline in a real pipeline cycle.

---

## What violated discipline (role, discipline, what happened)

| Role | Discipline | Finding | Severity |
|---|---|---|---|
| ARCHITECT | pre-emit-grilling | 3 spec-internal contradictions not caught before routing: Q1.1 CJS vs §Implementation surface ESM; §Mechanism "defer typedef extraction" vs §Tests importing named typedefs; §Mechanism `confidence` vs §Tests `cell_confidence` | MAJOR-5, MINOR-1, MINOR-2 |
| IMPLEMENTER | halt-discipline | 6 anti-scope files vendored without DIAGNOSTIC at point-of-encounter; OBS-2 confirms awareness at test-write time | MAJOR-3 |
| IMPLEMENTER | halt-discipline | 3 spec-internal contradictions silently absorbed; partially mitigated by session crash | MAJOR-5, MINOR-1, MINOR-2 (downstream) |
| IMPLEMENTER | anti-scope | 7 items outside spec's explicit anti-scope: 6 engine files (SAS-7, SAS-8, §Skipped) + CellDimension/CellConfidence aliases | MAJOR-3, MINOR-1 |
| IMPLEMENTER | tdd-discipline | Single-commit landing (`4b56831`) due to session crash; TDD ordering unverifiable | MINOR-9 |
| IMPLEMENTER | spec-prescription-drift | Vendoring script does not verify source SHA per `Q-R01-SPEC.md:132` | MINOR-4 |
| IMPLEMENTER | vendoring-manifest | AC-5 gap: 2 vendored smoke-test files absent from VENDORING-MANIFEST.md | MAJOR-4 |
| IMPLEMENTER | dead-test-substrate | `test/ville-preservation-per-profile.test.js` unrunnable at SLICE 1 (no `tools/calibrate.js`); 5 permanent failures; no diagnostic or comment | MINOR-7 |

---

## Root cause analysis

**ARCHITECT — spec-internal contradictions:**
The Architect's grilling pass applied the 10-axis adversarial review but lacked a "cross-section consistency" step. The three spec sections (Q-N resolved decisions, §Mechanism, §Implementation surface pseudocode, §Tests pseudocode) were written at different levels of abstraction and at different times without a final reconciliation pass. Q1.1 (CJS at-pin) was decided early; §Implementation surface pseudocode defaulted to ESM/Bundler without re-checking Q1.1; §Tests pseudocode was written independently and imported typedefs that §Mechanism had explicitly deferred. No cross-section grep was performed before routing.

**IMPLEMENTER — anti-scope vendoring without DIAGNOSTIC:**
Two contributing causes: (1) The spec was internally inconsistent — it instructed vendoring of `verdict.ts` + `orchestration.ts` + `audit.ts` while their compilation dependencies (`engine/types/agent.ts`, `engine/o0/*.ts`, `engine/l0/schema-continuity.ts`) were listed as anti-scope. The Implementer encountered a genuine compilation-failure-vs-anti-scope contradiction and resolved it pragmatically. (2) REVIEWER OBS-2 establishes that the Implementer was aware of the anti-scope classification at test-write time (vendoring-coverage test adds all 6 with comment "Compilation dependencies"). The DIAGNOSTIC should have been written at point-of-encounter. The session crash explains absent MEMORIAL.md + ESCALATE entries; it does not explain absent DIAGNOSTIC files, which are required at point-of-encounter.

**IMPLEMENTER — spec-internal contradiction absorptions:**
More ambiguous than the anti-scope case. These contradictions are encountered progressively during implementation rather than at a discrete "encountered anti-scope file" moment. The DIAGNOSTIC may have been planned for the coordination step, which the crash interrupted. Partial crash-context mitigation.

**Session crash root cause:**
API 500 errors at the coordination step after ~14 minutes, attributed to context window pressure from ~32 vendored files + 3 test files + 4 config files + full tool-call history. The per-role CLAUDE.md split (commit `c8f8ba7`) addresses the root cause by cutting per-session prompt weight roughly in half. R01 is the first round running under the new split discipline.

**AC-6 / AC-10 failures:**
`tsconfig.json:7` vendored from DeploySignal with `"ignoreDeprecations": "6.0"` — DeploySignal's CI presumably runs a newer TS version. Tessera resolves `typescript: "^5.4.0"` to 5.9.3, which only accepts `"5.0"`. One-line fix. Cascades to AC-10 because `npm test` runs `pretest: tsc -p tsconfig.test.json` which hits the same error. The Implementer correctly vendored the tsconfig structure (Q1.1 pick) but did not validate the `ignoreDeprecations` flag value against the installed TS version.

---

## Reinforcements added

**`CLAUDE-ARCHITECT.md`:**
- `# REINFORCED 2026-05-16 — Pre-emit grilling must include a cross-spec-section consistency pass...` (cross-section consistency between Q-N picks, §Mechanism, §Implementation surface, §Tests pseudocode)

**`CLAUDE-IMPLEMENTER.md`:**
- `# REINFORCED 2026-05-16 — Compilation-dependency justification does not authorize silent vendoring of anti-scope files...` (DIAGNOSTIC at point-of-encounter required; awareness in test comment is not substitute)
- `# REINFORCED 2026-05-16 — Spec-internal contradictions are HALT condition (c)...` (all three sub-types: resolved-decision-vs-pseudocode, mechanism-vs-test, field-name contradictions)
- `# REINFORCED 2026-05-16 — Spec prescriptions in §Implementation surface are binding for the named artifact...` (vendoring script SHA-verification prescription dropped without DIAGNOSTIC)
- `# REINFORCED 2026-05-16 — AC coverage scope for "every vendored file" must be resolved for all files workflow touches...` (manifest gap for smoke-test files)
- `# REINFORCED 2026-05-16 — Verify smoke-test runnability before committing...` (ville-preservation permanently failing; no diagnostic)

**`/Users/johnwarren/.claude/CROSS-PROJECT-MEMORIAL.md`:**
- `[tessera]`-prefixed entries appended to pre-emit-grilling, halt-discipline, right-reasons-audit, role-boundary, anti-scope, tdd-discipline, context-isolation sections.
- New reinforcement rule added under pre-emit-grilling: cross-spec-section consistency pass (new sub-pattern not previously seen in my-first-build).

---

## Watch list for next round

1. **Apply the AC-6 one-line fix** (`"ignoreDeprecations": "6.0"` → `"5.0"` in `tsconfig.json:7`) before any SLICE 2 build activity. Until fixed, `npm run typecheck` and `npm test` remain broken.

2. **Architect must pre-enumerate compilation dependencies** for Q-R02-SPEC.md vendoring prescriptions. When vendoring files whose compilation dependencies appear in §Skipped at SLICE 1 or §Anti-scope, the spec must explicitly include those deps in scope or specify stubs/import-stripping before routing to Implementer. The R01 spec was internally inconsistent on this point.

3. **Cross-spec-section consistency pass** must be applied at every future Architect spec emit. The new reinforcement rule in CLAUDE-ARCHITECT.md addresses this.

4. **VENDORING-MANIFEST.md coverage definition** must be resolved at Q-R02-SPEC.md emit: "enumerates every vendored file" should explicitly state whether scope is `engine/*` only or all files with provenance headers.

5. **ville-preservation smoke test** is a live issue: `node --test test/*.test.js` will show 5 failures from `test/ville-preservation-per-profile.test.js` until the file is deactivated, moved to a pending state, or the `tools/calibrate.js` dependency is resolved. Operator decision required.

6. **SHA attestation sequence** for R02: IMPLEMENTER must follow the two-commit sequence (coordination artifacts commit → SHA-recording commit) per cross-project memorial stale-SHA reinforcement.

---

## Emerging cross-project patterns

1. **Spec-internal contradictions as a distinct failure class.** R01 introduces a failure class not previously seen in my-first-build: resolved-decisions, §Mechanism, §Implementation surface, and §Tests pseudocode expressing different surfaces for the same underlying choice. This is structurally different from "spec AC outrunning test pseudocode" (my-first-build recurring pattern) — it is the spec contradicting itself across sections. Root cause: sections written at different times without cross-reconciliation. New reinforcement rule added.

2. **Anti-scope-vendoring-without-halt as a Tessera-specific risk.** Mechanical vendoring creates acute anti-scope + compilation-dependency tensions that my-first-build never encountered (no mechanical file vendoring). When the spec's §Skipped list conflicts with compilation requirements of other vendored files, the contradiction is an Architect-layer gap, not an Implementer choice. Future Tessera Architect specs for vendoring rounds must pre-enumerate compilation dependencies.

3. **Session crash as a new pipeline failure mode.** The R01 IMPLEMENTER session crash is not seen in my-first-build. Consequences: missing DIAGNOSTIC files, missing MEMORIAL entries, missing ESCALATE routing — all attributed to the crash (with caveats noted above). The per-role CLAUDE.md split addresses the root cause. R02 is the first full cycle under the new infrastructure.

---

_STATUS: ROUND-COMPLETE_
