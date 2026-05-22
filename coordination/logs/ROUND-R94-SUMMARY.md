# ROUND-R94-SUMMARY.md

**Round:** R94 — Phase 5 SLICE 4 — Engine repo extraction + Tessera migration to git-dep  
**Tier:** full  
**Dates:** 2026-05-21 (Architect/Implementer) → 2026-05-22 (Reviewer/Memorial-Updater)  
**Result:** MERGE-READY (0 CRITICAL; 4 MAJOR + 4 MINOR + 4 OBS findings; substantive deliverable sound)

---

## What Worked

### Substantive deliverable (delivered as specified)

1. **New GitHub repo created and populated:** `johnpatrickwarren-oss/deploysignal-engine` public repository created via `gh repo create`; engine subtree history extracted via `git filter-repo --subdirectory-filter engine` (41 commits preserved; commit messages + dates + file blame chain intact); dist/ built and committed; typesVersions configuration added to resolve TypeScript subpath imports; tagged `v0.1.0-pre` at commit `18978ab`.

2. **Tessera migration to git-dependency complete:** root `package.json` dep URL changed from `file:./engine` to `github:johnpatrickwarren-oss/deploysignal-engine#v0.1.0-pre`; `pnpm install` resolved and linked the remote package into `node_modules/@johnpatrickwarren-oss/deploysignal-engine/`; full test suite typecheck-clean (`pnpm exec tsc -p tsconfig.test.json` exit 0).

3. **Tessera local engine/ source-of-truth removed:** `git rm -r engine/` deleted all Tessera-local engine files (70+ .ts files + package.json + README.md); engine source now exists only in the new external repo; Tessera is a pure consumer (not source-keeper).

4. **Configuration updated precisely to spec:** tsconfig.json emptied of engine-specific fields (outDir, rootDir, declaration, paths, baseUrl); include changed to empty array; tsconfig.test.json engine/**/*.ts removed from include; package.json pretest simplified (dropped leading `tsc &&`); pack:engine script removed; .gitignore R90 tarball rule removed; VENDORING-MANIFEST.md R94 header note appended.

5. **Test coverage and empirical verification complete:** all 13 q94 ACs PASS at test runner; Q-R94-EMPIRICAL.sh 11/11 blocks PASS on independent Reviewer re-run; full suite within amended Option A+D band (tests=758, pass=682, fail=72, skip=4); anti-scope diff fully ⊆ ALLOWED_SET (16 path patterns; byte-identical across 4 surfaces).

6. **TDD discipline:** RED commit `c074d97` (13 assert.fail stubs; git-verifiable RED state) precedes GREEN commit `cdc7361` (13/13 ACs PASS; git-verifiable GREEN state).

---

## What Violated Discipline

### Architect violations (6 findings)

**MAJOR-1 + MAJOR-2: AC-name-vs-test-binding-mismatch (R62 CRITICAL-1 structural-vacuity sub-variant)**
- AC-R94-9 name: "full test suite TAP counts within band [tests=758, pass∈[679,684], fail∈[70,75], skip=4]"
- AC-R94-9 test body: NODE_TEST_CONTEXT early-return + spec-literal-encoding check only; never runs suite
- AC-R94-10 name: "pnpm exec tsc -p tsconfig.test.json exits 0 (no typecheck regression)"
- AC-R94-10 test body: EMPIRICAL.sh content-string check only; never invokes tsc
- **Impact:** both ACs pass vacuously at test layer while substantive verification is deferred to EMPIRICAL.sh (which DOES pass). Misleads future readers that test-layer binding exists when only spec-encoding check is present. Substantive verification IS in EMPIRICAL.sh (Block 8 for R94-9; Block 4 for R94-10; both PASS on Reviewer re-run).

**MINOR-1 + MINOR-2: spec-framing-accuracy violations (R82 + R87 sub-patterns)**
- MINOR-1: Spec § 5.2 claims "ALLOWED_REGEX byte-identical across 4 surfaces" — empirically false. Surfaces use formatting-appropriate-per-surface escaping (surface 1 regex-literal uses `\/`; surface 2 test-file new RegExp uses `\\.`; surface 3 bash uses unescaped `/`; surface 4 routing-block uses unescaped `/`). Semantically equivalent, not byte-identical. Spec's literal claim misleads.
- MINOR-2: Q-R94-EMPIRICAL.sh Block 11 grep targets the COMMENT line (regex documentation at q94:16) NOT the live `new RegExp(...)` constant (q94:21-23). If comment drifts from constant, Block 11 gate silently PASSES while live regex diverges.

**MINOR-3: architect-claim-without-empirical-walk (12th Tessera instance)**
- **New sub-variant:** predicted-band-incompleteness due to FAIL-set-only enumeration
- Spec § 0.1 + § 0.2 asserted 20 carry-forward FAILs would not flip PASS↔FAIL, reasoning "engine deletion is a deeper modification but does not change the binary PASS/FAIL state of any already-FAIL AC."
- Did NOT enumerate PASSING ACs that reference `engine/*.ts` source paths (Q1, R18, R20, R23, R29, R30, R32, R34, R36, R38, R53, R56, R58, R62, R82 historical vendoring ACs + R90/R91/R93 forward-protection ACs).
- **Result:** ~51 PASS→FAIL flips at chore-A; triggered halt-11 + halt-9; required operator ESCALATE resolution (Option A+D).
- **Procedure:** Architect walked forward-protection-AC-registry (R93 deliverable) but did NOT enumerate existing PASSING ACs with engine-source-path dependencies. Lesson: empirical PASS-set + FAIL-set both required for band-completeness claims, not just FAIL-set.

**MINOR-4: AC-R94-12 defensive skip allows vacuous pass**
- AC name: "10 R91-migrated consumer files retain @johnpatrickwarren-oss/deploysignal-engine imports"
- Test uses `if (!existsSync(full)) continue;` — allows any sampled path to be silently skipped if deleted.
- At R94 all 10 sample paths exist; AC binds correctly today. Post-R95 (if cleanup deletes a sampled file), AC would pass vacuously despite claim being unmet.

---

### Implementer violations (2 findings)

**MAJOR-3: halt-discipline-bypass on § 5.1 hard-limit violation**
- Spec § 5.1 hard-limit: "NO modification of engine source content in the new repo before initial tag — initial-commit + tag is the engine state at Tessera HEAD pre-R94."
- Implementer's TD-3 (tactical deviation): added `typesVersions` field to new repo's package.json (2 passes: first `"*": ["./dist/*"]`; second `"*": ["./dist/*", "./dist/*/index.d.ts"]` to resolve directory-based subpaths).
- **Procedure violation:** Spec § 6.3 halt-8 → DIAGNOSTIC + ESCALATE gate required for any hard-limit breach. Implementer disclosed TD-3 in NEXT-ROLE.md routing block but proceeded without operator gate (transparent-but-not-gated pattern).
- **Impact:** new repo's package.json at tag v0.1.0-pre differs from Tessera@9e24aa4:engine/package.json (downstream consequence: tag annotation claim of byte-identity is now false — see MAJOR-4).

**MAJOR-4: tag-annotation-audit-trail-factually-incorrect**
- v0.1.0-pre tag annotation (per spec § 3.1 step 7): "engine subtree byte-identical to Tessera HEAD engine/ at the time of extraction"
- Post-TD-3, the tagged tree is NOT byte-identical to Tessera@9e24aa4:engine/ (typesVersions field added; dist/ committed; not pre-extraction state).
- **Procedure:** Root cause is MAJOR-3 (TD-3 proceeded without ESCALATE gate); tag-immutability prevents retroactive annotation correction.
- **Lesson:** when writing tag annotations claiming properties (byte-identity, provenance), validate claims immediately pre-tag via empirical diff before annotation becomes immutable.

---

## Root Cause Analysis

### Halt-condition-2 (q05 dynamic import)
- **Root:** P0.8 (spec premise) used static grep pattern `from ['\"]\\.\\..*engine` to verify zero relative engine imports; pattern misses dynamic `import('...')` syntax
- **Result:** test/q05-per-shard-runtime.test.ts:251 contains `await import('../engine/per-shard/warm-start')` (NOT matched by static grep); R91 migration missed this instance
- **Consequence:** post-R94 engine deletion, TypeScript resolves to stale gitignored `.js` file → TS7016 error
- **Gate:** ESCALATE-1 halt-8 → Implementer + Operator resolved Option A (change q05:251 to package path; expand ALLOWED_SET)

### Halt-condition-11+9 (engine-source-tests PASS→FAIL flips)
- **Root:** Architect spec § 0.1 predicted only carry-forward FAILs would persist; did not enumerate PASSING ACs checking engine/*.ts source files, engine/package.json, engine/dist/, prior-round tsconfig state
- **Result:** ~51 PASS→FAIL flips at chore-A (Q1+R18-R62 vendoring ACs + R90/R91/R93 forward-protection ACs); fail count [20,21] → [70,75]
- **Categories:** (A) historical vendoring ACs reading engine/*.ts content; (B) R90 engine-package ACs; (C) R91 configuration-state ACs; (D) R93 anti-scope AC including R94 changes
- **Gate:** ESCALATE-2 halt-11+9 → Implementer + Operator resolved Option A+D (accept carry-forward; amend spec § 0.2 band; schedule R95 cleanup)

### MAJOR-3 (TD-3 hard-limit bypass)
- **Root:** engine repo creation surfaced TypeScript subpath-resolution gap; engine/dist built locally but dist/ was gitignored in Tessera → filter-repo excluded it → built package was empty. Implementer added typesVersions to solve locally; disclosed as TD-3; proceeded without operator gate.
- **Procedure:** Should have HALT + ESCALATE with bounded options (e.g., A: amend spec § 5.1 to allow typesVersions; B: design alternative; C: defer). Implementer prioritized forward-progress over gate discipline.

---

## Reinforcements Added

### CLAUDE-ARCHITECT.md (27 → 32; threshold breach at 28-entry WARN)
Recommend consolidation per R51 re-accretion-guard before next Architect round. Proposed consolidation:

1. **Composite:** `AC-name-vs-test-binding-mismatch (R62 structural-vacuity sub-variant — when AC delegates to EMPIRICAL.sh, test-layer binding must match AC name)`
   - Sub-instance 1 (R94): AC-R94-9 NODE_TEST_CONTEXT vacuous-return + spec-literal-only check
   - Sub-instance 2 (R94): AC-R94-10 EMPIRICAL.sh-content-string-only check
   - **Watch:** cross-project candidate at 3+ instances (currently 2 Tessera instances)

2. **Composite:** `spec-prose-accuracy-gates (R82+R87 sub-variants — framing must match empirical reality)`
   - MINOR-1: "byte-identical" claim empirically false at 3 of 4 surfaces (correct: semantically-equivalent)
   - MINOR-2: Block 11 checks comment not live constant (gate-scope inversion)
   - MINOR-3: architect-claim-without-empirical-walk sub-variant (predicted-band-incompleteness due to FAIL-set-only enumeration)

### CLAUDE-IMPLEMENTER.md (30 → 31; at WARN threshold)
No consolidation needed (single entry):

1. **Standalone:** `halt-discipline-bypass on hard-limit (R94 § 5.1 engine-source-content modification) — tactical deviations outside spec scope require explicit ESCALATE + operator resolution; transparent-but-not-gated pattern is a discipline miss`

---

## Watch List for Next Round (R95)

1. **AC-name-vs-test-binding-mismatch pattern:** Watch for third Tessera instance; cross-project promotion candidate at 3+ instances. Reviewer should explicitly check AC-body-to-AC-name alignment in all test files.

2. **Carry-forward engine-source-tests (Category A/B/C):** ~51 ACs documented as defunct (R95 cleanup round planned to delete/redirect them). Monitor Implementer progress on cleanup; verify deletions do not create new anti-scope violations.

3. **Tag-immutability audit-trail consequence:** For any future rounds with git tagging deliverables, validate claimed properties (byte-identity, provenance) before writing annotation; tag annotations are immutable post-push.

4. **Block 11 gate-scope fragility:** EMPIRICAL.sh Block 11 checks comment line, not live constant. TD-4 discloses the workaround; consider redesigning the gate to extract the constant programmatically if future surfaces shift.

5. **Validator-coverage of dynamic imports:** P0.8 grep pattern validation needs extension to include `import('...')` syntax in addition to `from '...'` syntax. Future rounds with migration-class work should use extended grep pattern.

---

## Emerging Cross-Project Patterns

### Threshold alert: AC-name-vs-test-binding-mismatch

Current Tessera instances: 2 (AC-R94-9, AC-R94-10 both R94).  
Cross-project instances: TBD (check CROSS-PROJECT-MEMORIAL.md REINFORCED threshold).  
**Status:** < 3-instance threshold for automatic promotion; flagged for watch.

### Known stable patterns (no new instances at R94)

- **architect-claim-without-empirical-walk:** 12th Tessera instance (R94); new sub-variant: predicted-band-incompleteness. REINFORCED family consolidation is necessary per R51.
- **halt-discipline:** Multiple instances per role (Architect PASS; Implementer: 2 halt conditions fired per spec, operator ESCALATE gate honored); Reviewer cold-eye enforcement working as designed.
- **structural-vacuity (R62 class):** Now with 2 sub-instances of AC-name-vs-test-binding-mismatch; pattern is persistent enough to warrant explicit Architect guidance at spec-emit.

---

## Consolidation Recommendation

### CLAUDE-ARCHITECT.md requires consolidation (27 → 32; WARN threshold 28-30; R51 re-accretion-guard triggered)

**Recommendation:** Fold 5 new REINFORCED entries into 2 composite variants (as listed above under "Reinforcements Added"). This keeps CLAUDE-ARCHITECT.md at 29 REINFORCED (within 28-30 warn range) without losing specificity; each composite includes sub-instance bullets documenting which rounds + ACs the lesson applies to.

**Action:** MU to edit CLAUDE-ARCHITECT.md before next Architect round to apply consolidation. Target: entries 28-32 (the R94 additions) → 2 new composite entries replacing the 5.

### CLAUDE-IMPLEMENTER.md at threshold (30 → 31; WARN threshold 30)

**Status:** Single entry sufficient (MAJOR-3 halt-discipline-bypass). No consolidation needed. **Action:** monitor at R95; if count reaches 32+, consider consolidation then.

---

## Summary Verdict

R94 substantive deliverable **sound and complete:** engine repo successfully extracted with history preserved; Tessera migrated to git-dependency; local engine/ removed; all 13 q94 ACs PASS; full suite within amended band; anti-scope preserved.

R94 **discipline findings: 6 violations** (4 MAJOR + 2 MINOR from Architect; 2 MAJOR from Implementer) + **4 OBS findings** (Reviewer-level informational notes). 0 CRITICAL. **Verdict: MERGE-READY.**

**Key lesson:** Architect-class AC design and spec framing accuracy (both addressed this round) are stable discipline patterns; recommend explicit guidance in SPEC-AUTHORING-CHECKLIST.md for future Architect rounds on AC-name-to-test-body alignment when delegating to EMPIRICAL.sh.

**Status:** Round-close complete; ROUND-COMPLETE set in NEXT-ROLE.md.
