CURRENT-ROUND: R25
NEXT-ROLE: REVIEWER
STATUS: READY

## Implementer attestation (chore-A — resumed from ESCALATE-R25-01)

**GREEN commit SHA:** c78374d
**Attestation SHA (chore-A):** substituted below after chore-A commit.

**AC-R25-13 (typecheck):** `npx tsc -p tsconfig.test.json` → EXIT 0. No diagnostics emitted.

**AC-R25-14 (test count at chore-A SHA):** `node --test test/*.test.js` →
  tests=229, pass=228, fail=1
  - 1 fail: q01 AC-7 — pre-existing environmental failure (cluster worktree
    lacks ../deploysignal sibling repository; confirmed not-a-halt per operator
    disposition in NEXT-ROLE.md "Operator decision" section).
  - 228 R25-relevant tests pass (217 baseline + 12 new q25 tests at chore-A).
  - Per operator: "228 R25-relevant pass + 1 pre-existing fail = MERGE-READY
    with documented pre-existing." AC-R25-14 spec prediction was 229/229/0;
    actual is 229/228/1 due to pre-existing environmental fail; reconciliation
    documented and confirmed by operator.

**Per-AC line citations** (grep -n "^test(" test/q25-l0-contract.test.ts at GREEN SHA):
  - AC-R25-1:  test/q25-l0-contract.test.ts:33
  - AC-R25-2:  test/q25-l0-contract.test.ts:47
  - AC-R25-3:  test/q25-l0-contract.test.ts:59
  - AC-R25-4:  test/q25-l0-contract.test.ts:72
  - AC-R25-5:  test/q25-l0-contract.test.ts:84
  - AC-R25-6:  test/q25-l0-contract.test.ts:95
  - AC-R25-7:  test/q25-l0-contract.test.ts:106
  - AC-R25-8:  test/q25-l0-contract.test.ts:124
  - AC-R25-9:  test/q25-l0-contract.test.ts:133
  - AC-R25-10: test/q25-l0-contract.test.ts:141
  - AC-R25-11: test/q25-l0-contract.test.ts:148
  - AC-R25-12: test/q25-l0-contract.test.ts:155

**Commit sequence completed:**
  - RED:     2f2552e — test(R25-RED): q25-l0-contract stubs
  - HALT:    4f405c0 — escalate(R25): HALT — AC-R25-12 tolerance
  - DISP:    f7be96c — R25 ESCALATE-R25-01 disposition: Option A
  - GREEN:   c78374d — feat(R25): L0 contract — AC-R25-12 GREEN (Option A tolerances)
  - chore-A: <CHORE-A-SHA> — this commit

## Operator decision (2026-05-18 — overnight authority auto-Option-A disposition)

**ESCALATE-R25-01 disposition: Option A — use § 1.8 tolerances** (`Math.abs(snap.mean - 10) < 0.001` AND `Math.abs(snap.slopeNorm) < 0.01`).

**Reasoning:**
1. **Preamble-vs-prescription contradiction** between § 1.8 (Mechanism description; authored first as the originating prescription) and § 4.3/§ 5.1 (GREEN-commit pseudocode + AC table; tighter `1e-9` tolerance). Resolves to § 1.8 per the R20 ARCH MINOR-1 reinforcement pattern (preamble classification claims must match § 4.x prescription claims; in this case § 4.x prescription contradicts its own preamble).
2. **§ 4.3/§ 5.1 tighter tolerance is empirically infeasible.** Implementer's diagnostic establishes float64 representation of `1.2` is `1.2000000476837158` (not exact in IEEE 754 binary64); elapsed-seconds arithmetic accumulates error producing `|mean - 10| ≈ 1.2e-7`, not `< 1e-9`.
3. **Counterfactual discriminator preserved** at § 1.8 tolerance: a non-normalized implementation (raw per-tick deltas instead of per-second rates) would produce mean ≈ 11.8 — far outside `< 0.001`.
4. **Implementer-recommended.** The Implementer's diagnostic recommends Option A.

**Authority:** Per [[project-overnight-authority-2026-05-18-morning]] auto-Option-A class (bounded question + clean-fix scope + clear architectural disposition + Implementer-recommended). Same class as the R18 ESCALATE pattern the operator approved.

**Pre-existing q01 AC-7 environmental failure (NOT a halt):** The cluster worktree environment lacks the `../deploysignal` sibling repository (multi-track worktree at `~/projects/tessera-clusters/wu-00-l0-contract` has no sibling DeploySignal path). q01 AC-7 fails (`should fail when verdict.ts byte-identity broken` requires opening the DeploySignal source). This is a **multi-track methodology friction surface** — captured for Wave 1 gate COORDINATOR-MEMORIAL.md (cluster worktrees need read-only access to sibling vendor sources, or q01-class tests need to be marked "skip-in-cluster-worktree"). Implementer's interpretation (228 R25-relevant pass + 1 pre-existing fail = MERGE-READY with documented pre-existing) is **confirmed correct**.

**Implementer resume protocol:**
1. Update test assertions per Option A:
   - `assert.ok(Math.abs(snap.mean - 10) < 0.001, ...)` (was: `< 1e-9`)
   - `assert.ok(Math.abs(snap.slopeNorm) < 0.01, ...)` (was: `< 1e-9`)
2. Complete GREEN commit per spec § 4.3 with these tolerances.
3. Continue commit sequence (chore-A → chore-B per spec).
4. Report observed test count at chore-A; reconcile against the pre-existing q01 AC-7 environmental fail per above.
5. Resume via `./run-pipeline.sh --round R25 --tier full --start-at IMPLEMENTER` from this worktree.

---

## Inputs for next role
- coordination/specs/Q-R25-SPEC.md
- coordination/specs/Q-R25-SPEC-AUDIT.md
- coordination/PRD.md (cluster scope block, lines 4-117)
- coordination/SCOPING-MEMO-v0.3.md § 2.3 Extension 3 (b) L0-contract sub-extension + MR-1 AMENDMENT block (lines 219-256)

## Round-scope directive (R25 — Implementer)

Implement Q-R25-SPEC.md verbatim. Three new code files (all Tessera-original):

1. `engine/l0/counter-rate-transform.ts` — primary L0-contract module (pure-function `transformPair` + four types + four exported constants). See spec § 4.1 for pseudocode.
2. `test/_substrate/synthetic-counter-generator.ts` — five exported factories (`makeCleanPair`, `makeMissedScrapePair`, `makeWrap32Pair`, `makeResetPair`, `makeVariableIntervalSequence`). See spec § 4.2 for pseudocode.
3. `test/q25-l0-contract.test.ts` — 12 GREEN tests (AC-R25-1 through AC-R25-12), plus AC-R25-15 added at chore-B. See spec § 4.3 for pseudocode.

**TDD discipline (R23 IMPL MINOR-1 reinforcement):** separate RED commit BEFORE GREEN. RED commit creates the q25 test file with `assert.fail` placeholders + imports that intentionally fail typecheck (because the L0 module + substrate do not yet exist). GREEN commit adds the production files + real test bodies. Do NOT combine into one feat commit.

**Commit sequence:**

1. `test(R25-RED): q25-l0-contract stubs — AC-R25-1..12 pending` (RED — test file with placeholders + imports; `npx tsc -p tsconfig.test.json` produces TS2307 errors on the missing imports; commit this state as the RED audit-trail artifact)
2. `feat(R25): L0 contract — counter-rate-transform + synthetic counter generator + AC-R25-1..12 GREEN` (GREEN — production files + real test bodies; all 12 ACs PASS; typecheck exit 0; test count = 229)
3. `chore(R25): route to REVIEWER — coordination artifacts (chore-A)` (NEXT-ROLE.md routing block update with attestation; MEMORIAL.md Implementer ceremony section append; per-AC line citations verified by `grep -n "^test(" test/q25-l0-contract.test.ts` BEFORE commit per R21 line-citation rule)
4. `chore(R25-B): AC-R25-15 anti-scope test + chore-A SHA <SHA> substituted` (append AC-R25-15 test() block to q25 file with chore-A SHA from step 3 substituted into BASELINE_SHA → CHORE_A_SHA literal)

**Halt conditions** (per spec § 7.1 — HALT → DIAGNOSTIC + STATUS: ESCALATE; never silent in-line resolution; never test-mutation):

- (a) Typecheck fails at GREEN → DIAGNOSTIC-R25-typecheck.md
- (b) Baseline test count differs from 217 → DIAGNOSTIC-R25-baseline-drift.md (likely operator-prep commit between R23 close and R25 entry the spec didn't anticipate)
- (c) Any AC scenario produces output conflicting with spec prescription → DIAGNOSTIC-R25-ac-mismatch.md (DO NOT modify test to match observed — R19 MAJOR-3 self-confirming pattern)
- (d) Spec files uncommitted at chore-A time → Architect-attributable defect (R21 ARCH MINOR-1); HALT
- (e) Anti-scope file modification surfaces during binding-command runs → DIAGNOSTIC-R25-antiscope-collision.md (R19 MAJOR-1/2 — no silent test-mutation)

**Anti-scope (per spec § 6) — non-exhaustive headline:**

- `engine/l0/schema-continuity.ts` body frozen (A12; READ-ONLY consumer of `SchemaDescriptor.semantic_type` at `:44`)
- `engine/core.ts` body frozen (A12; TrendBuffer used as-is at AC-R25-12 integration test)
- `engine/verdict-groups.ts` frozen (R20)
- `engine/fleet/verdict-consumer.ts` frozen (R21)
- `engine/hardware-topology-source.ts` frozen (R23)
- `engine/topology-overlay.ts` vendored-at-pin (not modified)
- `engine/types/verdict.ts` no R25 deltas (vendored-with-deltas at R18+R23 only)
- All pre-R25 test files frozen (q01..q23 q-* suite)
- `test/_substrate/v9X-cluster.ts` and `v9Y-multi-rack-cluster.ts` frozen (R18 + R23)
- `coordination/VENDORING-MANIFEST.md` no modification (counter-rate-transform.ts is Tessera-original)
- `coordination/SCOPING-MEMO-v0.3.md` and `coordination/PRD.md` no modification

**Allowed-set (7 entries; per spec § 3):**

1. engine/l0/counter-rate-transform.ts
2. test/_substrate/synthetic-counter-generator.ts
3. test/q25-l0-contract.test.ts
4. coordination/specs/Q-R25-SPEC.md
5. coordination/specs/Q-R25-SPEC-AUDIT.md
6. coordination/NEXT-ROLE.md
7. coordination/MEMORIAL.md

Anti-scope diff baseline SHA: `ada602b` (R25 round-start). AC-R25-15 SHA-pinned end-bound = chore-A SHA (substituted by Implementer at chore-B time per § 4.6 pseudocode).

**Reinforcements applied at Architect time (already swept; Implementer carries forward):**

- Spec-commit-sequencing (R21 ARCH MINOR-1): spec files committed in commit `4d9783b` BEFORE this routing-block commit ✓
- Branch-binding coverage (R21 MINOR-2/3): all 10 enumerated branches in transformPair have ≥ 1 binding AC (spec § 4.1)
- Count-AC SHA-anchoring (R22 IMPL MINOR-1): AC-R25-14 explicitly anchored to chore-A SHA (spec § 5.1)
- TDD separate-RED (R23 IMPL MINOR-1): prescribed above (commit sequence step 1)
- .gitignore-aware allowed-set (R23 MINOR-2): 7-entry allowed-set audited — all `.ts` or `.md`; no `.js` phantoms (spec § 9.7)
- Narrative-vs-prescription cross-check (R20 MINOR-1): § 5 preamble classifications match § 4.x prescriptions (spec § 9.6)
- Line-citation discipline (R03/R18/R21): grep test() declarations before chore-A attestation

## Escalation items

### ESCALATE-R25-01: AC-R25-12 tolerance contradiction (§ 1.8 vs § 4.3/§ 5.1) + empirically failing premise

**Diagnostic file:** `coordination/diagnostics/DIAGNOSTIC-R25-ac12-tolerance.md`

**Summary:** The spec prescribes `Math.abs(snap.mean - 10) < 1e-9` in § 4.3 and § 5.1 with the claim "exact arithmetic on synthetic data." This premise fails empirically: float64 arithmetic for the 1.2s interval produces `|mean - 10| ≈ 1.2e-7`, not < 1e-9. The spec also has an internal contradiction: § 1.8 prescribes `mean < 0.001` and `slopeNorm < 0.01` (which both pass). The implementation is correct; the test tolerance in § 4.3/§ 5.1 is wrong.

**Bounded question for operator:**

- **Option A:** Use § 1.8 tolerances — change assertion to `mean < 0.001` and `slopeNorm < 0.01`. Passes empirically; counterfactual discriminator preserved (wrong implementation mean ≈ 11.8 >> 0.001). Recommended.
- **Option B:** Use empirical intermediate tolerances — `mean < 1e-6`, `slopeNorm < 1e-9`. Tighter than A, both pass.
- **Option C:** Change the generator intervals to float64-exact values ([1.0, 1.25, 1.5, ...]) so `mean` is exactly 10. This modifies the generator and test scenario.

**State of work at HALT:** RED commit landed (`2f2552e`). Production files created (engine/l0/counter-rate-transform.ts, test/_substrate/synthetic-counter-generator.ts) but NOT committed — GREEN commit in progress. 11 of 12 AC-R25 tests pass; AC-R25-12 fails due to this tolerance issue. After operator resolution, Implementer resumes with the operator-directed tolerance and completes the GREEN commit.

**Pre-existing environmental note:** The cluster worktree (`../deploysignal` not at expected sibling path) causes q01 AC-7 to fail. This produces baseline 217/216/1 (not 217/0 as spec claimed). This pre-existing failure is unrelated to R25 and unresolvable within R25 scope. The Implementer will report OBSERVED test counts (228 pass, 1 fail pre-existing) at chore-A. Operator should confirm this interpretation or direct otherwise.

**Recommended operator action:** Direct Option A or B via this NEXT-ROLE.md "Operator decision" section; Implementer resumes from HALT and completes GREEN commit.

## Routing notes

- Architect two-commit sequence completed: (1) `4d9783b spec(R25)` + (2) this routing commit
- Spec total: 15 ACs across 6 invariants + substrate + integration + typecheck/count + anti-scope
- Expected Implementer test growth: +12 at chore-A (217 → 229); +1 at chore-B (229 → 230)
- Full-tier round (A1 + A2 + A4 fire per PRD tier verdict): Architect → Implementer → Reviewer → Memorial-Updater
