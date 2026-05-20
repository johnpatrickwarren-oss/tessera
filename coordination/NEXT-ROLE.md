CURRENT-ROUND: R61
NEXT-ROLE: IMPLEMENTER
STATUS: READY
TIER: full

## § Operator resolution of R61 ESCALATE — Option B (2026-05-19)

**Decision:** Option B approved. Reduce AT-PIN set to ~25 self-consistent files; the 6 problematic files (vendored-with-deltas surface + downstream dependents — `engine/types/verdict.ts`, `engine/types/config.ts`, `engine/types/orchestration.ts`, `engine/types/policy.ts`, `engine/types/audit.ts`, `engine/types/index.ts`, `engine/o0/lifecycle-events.ts`, `engine/o0/reversibility-translator.ts`) STAY at Tessera `engine/` tree and receive only import-rewrites — no relocation.

**Rationale:**
- W3-1 RESOLVED A (Tessera-only) — Option A requires cross-project work; rejected per W3-1 scope.
- A12 (vendored-at-pin discipline) — Option C would override A12 for one round's convenience; rejected as bad trade-off.
- Option B is the natural compromise: 6 cross-boundary files genuinely belong at Tessera tree (they ARE the Tessera-vendored-with-deltas surface); the abstract DS-engine package is what DS later consumes from npm.
- Smaller package surface (~25 files) is structurally honest: DS doesn't need or want Tessera's schema extensions; Tessera-specific surface stays at Tessera.

**Implementer amendments required:**
- `coordination/specs/Q-R61-SPEC.md` § 0.2 premise correction (mark "spec premise" claim as superseded; document the empirically-correct cross-boundary state from DIAGNOSTIC-R61).
- `coordination/specs/Q-R61-SPEC.md` § 2.1 / § 4 (per-file pseudocode + mechanism) updated to reflect Option B 25-file move (not 33).
- `coordination/specs/Q-R61-SPEC.md` AC-R61-2 count: 33 → actual moved count (Architect-Implementer-Sonnet collaboratively determines; likely 25-27 self-consistent files).
- `coordination/specs/Q-R61-EMPIRICAL.sh` AC-R61-2 block updated to match new count.
- `coordination/specs/Q-R61-SPEC.md` AC-R61-3 / § 3.2 ALLOWED_SET regenerated for the 6 files that stay at Tessera (import-rewrite-only) + the ~25 files that move to packages/.

**Spec deviance disclosure pattern:** Implementer-amends-spec-on-operator-resolution is the canonical resume path per R45 MAJOR-2 + R48 precedent. Amend spec in same chore-A; document in NEXT-ROLE.md "Spec deviance" section.

**Resume command:** `./run-pipeline.sh --round R61 --tier full --start-at IMPLEMENTER`. Implementer reads this resolution + DIAGNOSTIC-R61-cross-boundary-at-pin-imports.md, amends spec per Option B, executes Option B implementation, commits chore-A.

---

## R61 ESCALATION — Implementer halt (spec premise false)

**Diagnostic file:** `coordination/diagnostics/DIAGNOSTIC-R61-cross-boundary-at-pin-imports.md`

**Bounded question:**

> Spec § 0.2 claims "no vendored-at-pin file imports from a vendored-with-deltas or Tessera-original file — Verified at spec time via grep." This claim is **empirically false**. Multiple AT-PIN files (`engine/types/orchestration.ts`, `engine/types/policy.ts`, `engine/types/audit.ts`, `engine/types/index.ts`, `engine/o0/lifecycle-events.ts`, `engine/o0/reversibility-translator.ts`) import from `engine/types/verdict.ts` and/or `engine/types/config.ts` — both vendored-with-deltas files that STAY at tessera tree. The package's `tsc` would fail after the file moves. Choose one:
>
> - **Option A** — Include DS-original `verdict.ts` + `config.ts` (without Tessera deltas) in the package; expand to 35 files; tessera-side vendored-with-deltas files restructure to extend package base types. HIGH complexity; requires confirming `~/concord/deploysignal/` is at SHA `5a72371`.
> - **Option B** — Reduce the AT-PIN set to the ~25 self-consistent files; the 6 problematic files stay at tessera tree and receive only import-rewrites (not relocation). AC-R61-2 count changes from 33 to ~25. MEDIUM complexity; clean package but smaller API surface.
> - **Option C** — Move all 33 files but modify the 6 cross-boundary files' imports (stub types or replace with package-internal alternatives). Requires **explicit A12 override** — contradicts spec § 3.1 #1 verbatim-preservation. HIGH complexity; degrades type surface.

**Halt triggers:** § 6.1 #7 ("package's `npm run build` produces tsc errors") AND halt condition (b) ("spec/reality conflict cannot be resolved without changing the round's component inventory").

**No chore-A commit exists.** Implementation was correctly halted before any changes were staged or committed.

## R61 Architect routing block (post spec-emit)

**Spec triad emitted at commit `44bb19b`** (`spec(R61): Q-R61-SPEC + audit sidecar + EMPIRICAL.sh ...`). Spec artifacts committed in dedicated commit BEFORE this NEXT-ROLE.md update per R21 ARCH MINOR-1 reinforcement.

**Inputs for Implementer:**
- `coordination/specs/Q-R61-SPEC.md` (spec proper — Mechanism, Component inventory, Per-file pseudocode, ACs, Anti-scope+ALLOWED_SET, Open questions, P3 ten-axis, Grilling)
- `coordination/specs/Q-R61-SPEC-AUDIT.md` (audit sidecar — Reviewer reads this; Implementer reads spec proper)
- `coordination/specs/Q-R61-EMPIRICAL.sh` (Rule 1 sub-class verifier — chore-A attestation cites actual output)

**Round-start SHA (anti-scope baseline):** `8c64ce0`.
**Spec-emit commit:** `44bb19b`.
**Empirical baseline at Architect session entry:** `tests=399 / pass=394 / fail=2 / skipped=3`; `tsc` exit 0. Two pre-existing fails are R36 forward-protection guards inheriting from Phase 2 close `87e372f` (R36-30 + R36-31).

**Substantive deliverable summary (per spec § 2.1):** 5-phase chore-A — (1) Package scaffolding at `packages/deploysignal-engine/`; (2) physical `git mv` of 33 vendored-at-pin engine/* files preserving subtree layout; (3) package barrel `src/index.ts` with 33 export-star re-exports; (4) Tessera-side import rewrites from `'../engine/<moved>'` → `'@johnpatrickwarren-oss/deploysignal-engine'`; (5) build configuration + coordination updates (root package.json workspaces, VENDORING-MANIFEST.md new top section, SCOPING-MEMO § 9 opportunistic touch per W3-5, q01 test path-list updates).

**15 ACs (per spec § 5).** Pre-documented two-state predicted counts: chore-A `403/397/3/3`; chore-B `403/398/2/3` (per spec § 5.4). AC-R61-15 placeholder fails by construction at chore-A; AC-R61-10 SUMMARY block in Q-R61-EMPIRICAL.sh asserts chore-B value — chore-A FAIL is pre-documented and NOT a halt trigger per § 6.1 carve-out (R56 MINOR-1 reinforcement).

**OQ surfaced:** OQ-R61-1 (q01-vendoring-coverage manifest-row check fragility). Architect-recommended Option (b) — loosen test's includes check to accept either-path; preserve manifest audit trail. If Implementer encounters issues with Option (b), ESCALATE per § 6.1 #5.

**Cross-project rules applied (per § 7):** Rule 1 sub-class ACTIVE (Q-R61-EMPIRICAL.sh + Tightenings 1-4); Rule 2 ACTIVE (§ 5.3 branch-binding coverage table); Rule 3 ACTIVE (§ 5.6 discriminability); Rule 4 ACTIVE (§ 3.2 ALLOWED_SET); Rule 5 N/A; Rule 6 ACTIVE (§ 6 halt conditions); Rule 7 ACTIVE Surface (a) (§ 7).

---

## Round-scope directive (R61 — WU-Phase3-3A engine npm package extract; full-tier; Wave 9)

R61 = first SLICE 3 cluster pipeline round per `coordination/WAVE-PLAN-09.md` (R60 Coordinator emit). Wave 9 = single-cluster foundational round. WU-Phase3-3A: extract Tessera-vendored engine to a publishable npm package per Tessera-monorepo sub-package layout.

**Round-start SHA:** (R60 Coordinator artifacts; recover via `git rev-parse HEAD` at session entry).

### Operator decisions (resolved at this dispatch)

- **OQ-Phase3-W3-1 RESOLVED: Option A** — Tessera-only extract; DS-side updates via separate PR (not this round; explicit anti-scope).
- **OQ-Phase3-W3-2 RESOLVED: Option B** — Tessera monorepo sub-package layout. Package physical location: `packages/deploysignal-engine/` within Tessera repo. Tessera consumes via local-package or workspace mechanism; future DS PR consumes via published npm or git dependency.
- **OQ-Phase3-W3-3 RESOLVED: Coordinator defaults A/A** — Tessera-side file layout `engine/ds-integration/*` (relevant at R63 SLICE 3 Wave 10 work); shared-types pre-landed in this round IF Architect spec touches; otherwise deferred to R63.
- **OQ-Phase3-W3-4 RESOLVED: Option A** — NO new external dependencies for SLICE 3 work. Synthetic fixtures suffice per Path B.
- **OQ-Phase3-W3-5 RESOLVED: Option A (opportunistic)** — IF Architect spec naturally touches SCOPING-MEMO § 9 (vendoring policy) or § 2.3 (DS-integration scope) for WU-3A, amend opportunistically. Otherwise defer to Phase 3 close-walk.

- Path B preserved: NO real-cluster work; NO real customer telemetry.
- Naming convention: globally-sequential WAVE-NN. WU-Phase3-3A = WAVE-09.

### Primary deliverable

Implement WU-Phase3-3A engine npm package extract per WAVE-PLAN-09 Wave 9 + W3-1/W3-2 operator decisions:

1. **`packages/deploysignal-engine/` sub-package directory** (Tessera monorepo layout per W3-2 Option B):
   - `package.json` declaring `@johnpatrickwarren-oss/deploysignal-engine` package (provisional name per PRD § 3.1 success metric); version pin matches Tessera's vendored SHA `5a72371`; minimum exports surface for Tessera consumption.
   - `tsconfig.json` for package build (extends Tessera root tsconfig or stands alone; Architect decides).
   - `src/` directory containing engine source. Architect decides: physical-move (`git mv engine/* packages/deploysignal-engine/src/`) OR placeholder-stub with path indirection. Physical-move is cleaner but larger blast radius; stub-with-indirection preserves git history more transparently. Architect recommendation requested.
   - `README.md` describing package contents + Tessera-as-current-consumer + vendoring history (extracted from Tessera engine vendoring at SHA `5a72371` per PRD § 3.1).

2. **Tessera-side consumption update** — wherever Tessera production code imports from `engine/`, update to import from the local package (workspace import path; e.g., `@johnpatrickwarren-oss/deploysignal-engine`).

3. **`package.json` (root)** updates:
   - Add `workspaces` configuration to include `packages/deploysignal-engine/` (if Architect picks workspace layout).
   - Dependency on the local package.

4. **`coordination/VENDORING-MANIFEST.md` policy update**:
   - Pre-R61: per-file SHA pin at `5a72371` for each `engine/*` file.
   - Post-R61: package-version-pin (single line per package) instead of per-file SHA pins. Document the policy transition.

5. **Test file** `test/q61-engine-npm-extract.test.ts`:
   - Package structure ACs: `packages/deploysignal-engine/package.json` exists + has expected `name` + `version` + `exports`
   - Tessera consumption ACs: at least one production import points to the local package
   - VENDORING-MANIFEST.md transition ACs
   - Phase 1+2 ACs (AC-P1 through AC-P4) hold unchanged + AC-P7 cross-cutting (full Tessera fleet works post-extract)

6. **Q-R61-EMPIRICAL.sh** at chore-A pre-commit (Rule 1 sub-class).

### Tier rationale

**full-tier** — Architect (architectural restructuring: monorepo layout; consumption-import surface design) + Implementer (file moves OR placeholder; package config; consumption updates; tests) + Reviewer (cold-eye) + Memorial-Updater. Per WAVE-PLAN-09: A1 (substantial architectural restructure) + A4 (schema-class: package structure + import surface).

### Anti-scope (R61 hard limits)

- **NO DS repo modifications** (W3-1 Option A; DS-side updates via separate PR scheduled later).
- **NO real-cluster work** (Path B; A8/A11 inherited).
- NO modification of `coordination/SCOPING-MEMO-v0.3.md` UNLESS W3-5 opportunistic-close triggers AND Architect spec genuinely touches it; otherwise defer.
- NO modification of `coordination/PRD.md`.
- NO modification of R42-R60 deliverables EXCEPT engine-vendored files (which need to relocate or be referenced from the new package per W3-2 Option B; this IS in-scope for WU-3A).
- NO modification of `~/.claude/CROSS-PROJECT-MEMORIAL.md`.
- NO modification of `coordination/MEMORIAL-PHASE-*.md`.
- NO modification of `scripts/*` or `run-pipeline.sh` (R45-R51 stable).
- NO modification of `CLAUDE-*.md` REINFORCEMENTS sections.
- NO Phase 3 SLICE 3 Wave 10 work (WU-3B/3C; R63+).
- NO new external dependencies (W3-4 Option A).
- NO opening any GitHub PRs.

ALLOWED modifications:
- `packages/deploysignal-engine/` (NEW directory + contents)
- `engine/*` (MOD or MV depending on Architect approach)
- `package.json` (root)
- `tsconfig.json` and `tsconfig.test.json` (root; if monorepo restructuring affects build)
- `coordination/VENDORING-MANIFEST.md` (MOD)
- `coordination/SCOPING-MEMO-v0.3.md` (MOD conditional per W3-5)
- `test/q61-engine-npm-extract.test.ts` (NEW)
- Test imports across `test/*.test.{js,ts}` (MOD if `engine/` imports change path)
- `coordination/specs/Q-R61-SPEC.md` + `Q-R61-SPEC-AUDIT.md` + `Q-R61-EMPIRICAL.sh` (NEW)
- `coordination/reviews/REVIEWER-REPORT-R61.md` (Reviewer)
- `coordination/diagnostics/DIAGNOSTIC-R61-*.md` (conditional)
- `coordination/MEMORIAL.md` (appends)
- `coordination/NEXT-ROLE.md` (this file)

### Apply all 7 cross-project rules UPFRONT

- **Rule 1 (`false-compliance-attestation`):** ACTIVE GATE — Q-R61-EMPIRICAL.sh applies R47-R51 Tightenings to all empirical claims.
- **Rule 2 (`branch-binding-coverage-gate`):** ACTIVE GATE — Architect spec enumerates package-config branches + consumption-import-resolution branches; Acknowledged-gap section.
- **Rule 3 (`implementer-spec-test-assertion-coverage`):** ACTIVE GATE — discriminating assertions per R30 MINOR-1.
- **Rule 4 (`anti-scope-allowed-set-forward-coverage`):** ACTIVE GATE — Architect ALLOWED_SET in Q-R61-SPEC.md at spec-emit time. Special attention: the engine-file move/restructure means a LARGE diff; ALLOWED_SET must accommodate the actual scope.
- **Rule 5 (`rule-derivation-without-self-application`):** N/A.
- **Rule 6 (`halt-discipline-no-DIAGNOSTIC-for-workaround`):** ACTIVE GATE — if Architect surfaces unexpected dependency on DS-repo modification (W3-1 anti-scope violation potential), HALT + DIAGNOSTIC + ESCALATE.
- **Rule 7 (`derived-rule-propagation-mechanism-required`):** ACTIVE GATE per existing surfaces.

### Halt conditions

1. **Q-R61-EMPIRICAL.sh exits non-zero at chore-A:** HALT + DIAGNOSTIC.
2. **Architectural decision requires DS-repo modification:** if Architect cannot complete WU-3A within Tessera-only scope (W3-1 = A), HALT + DIAGNOSTIC; operator may need to re-evaluate W3-1.
3. **Phase 1/2 ACs regress:** if test baseline changes AC-P1 through AC-P4 properties post-extract (e.g., engine-import path changes break detector semantics), HALT + DIAGNOSTIC per AC-P7 cross-cutting.
4. **Vendored SHA `5a72371` pin breakage:** if extracted package version does NOT pin to original SHA, HALT + DIAGNOSTIC (vendoring discipline preserved per AC-P8).
5. **Test baseline drift other than R61-additions:** Architect specifies expected delta in Q-R61-SPEC.md. Unexpected shift → HALT + DIAGNOSTIC.

### Inputs for Architect

1. `coordination/WAVE-PLAN-09.md` — Wave 9 section; READ FIRST
2. `coordination/PRD.md` § Phase 3 Scope SLICE 3 (FR-D1 + AC-P8)
3. `coordination/WAVE-GATE-08.md` — SLICE 2 close + forward-flags for SLICE 3
4. `coordination/SCOPING-MEMO-v0.3.md` § 9 (engine vendoring policy)
5. `coordination/VENDORING-MANIFEST.md` — current per-file SHA pin state
6. `engine/*` — vendored source to extract
7. `package.json` (root) — Tessera-side config to modify
8. `tsconfig.json` + `tsconfig.test.json` — current TS configs
9. `coordination/specs/Q-R53-SPEC.md` + `Q-R56-SPEC.md` + `Q-R58-SPEC.md` — recent spec triad patterns
10. `coordination/PHASE-3-CANDIDATES-PRELIMINARY.md` § 3.1 (engine extract candidate framing)

### Pipeline invocation

```bash
cd /Users/johnwarren/concord/tessera
./run-pipeline.sh --round R61 --tier full
```

---

## Operator-decision flags (post-R60 close + W3-1/W3-2 resolutions)

1. R45 CRITICAL routing.
2. Rule 7 Surface (c) HARD-GATE candidate.
3. Cross-project canonical landings.
4. Anchor PR backflog scheduling.
5. **Phase 3 SLICE 3 Wave 9 (npm extract) IN PROGRESS at R61.** Wave 10 (3B + 3C parallel) at R63+ post-WAVE-GATE-09.
6. **Future operator action:** DS-side PR to consume the extracted npm package (W3-1 Option A defers this to a separate PR scheduled outside Tessera pipeline).
7. Prior-round findings.
8. OQ-Phase3-W3-1 RESOLVED A; W3-2 RESOLVED B; W3-3 RESOLVED Coordinator default A; W3-4 RESOLVED Option A; W3-5 RESOLVED Option A (opportunistic).
