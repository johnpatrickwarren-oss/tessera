CURRENT-ROUND: R25
NEXT-ROLE: IMPLEMENTER
STATUS: READY

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

(none — all PRD/spec ambiguities resolved at Architect time; no Open Questions per spec § 7)

## Routing notes

- Architect two-commit sequence completed: (1) `4d9783b spec(R25)` + (2) this routing commit
- Spec total: 15 ACs across 6 invariants + substrate + integration + typecheck/count + anti-scope
- Expected Implementer test growth: +12 at chore-A (217 → 229); +1 at chore-B (229 → 230)
- Full-tier round (A1 + A2 + A4 fire per PRD tier verdict): Architect → Implementer → Reviewer → Memorial-Updater
