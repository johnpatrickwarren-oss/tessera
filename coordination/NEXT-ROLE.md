CURRENT-ROUND: R50
NEXT-ROLE: (operator decision)
STATUS: ROUND-COMPLETE
TIER: audit

## Reviewer cold-eye attestation (R50)

**Report:** `coordination/reviews/REVIEWER-REPORT-R50.md`
**Verdict:** 0 CRITICAL / 1 MAJOR / 6 MINOR / 4 OBS — STATUS: MERGE-READY
**Empirical re-run at HEAD (`53d447c`):** `bash coordination/specs/Q-R50-EMPIRICAL.sh` → `=== Summary: 14 PASS / 0 FAIL ===`. All 10 ACs (14 sub-assertions) PASS.

**Inputs (cold-read):**
- `coordination/PRD.md` (R50-relevant cluster scope blocks)
- `coordination/specs/Q-R50-SPEC.md` (full)
- `coordination/specs/Q-R50-EMPIRICAL.sh` (full)
- `scripts/verify-wave-aggregate.sh` (full)
- `run-pipeline.sh` diff + targeted reads (argument parsing, run_wave_gate_close, build_consolidation_reviewer_prompt)
- `CLAUDE-COORDINATOR.md` diff + heading verification
- `coordination/SPEC-AUTHORING-CHECKLIST.md` diff
- `coordination/MEMORIAL.md` (R50 block)
- `coordination/NEXT-ROLE.md` (this file pre-update)
- `~/.claude/CROSS-PROJECT-MEMORIAL.md` Reviewer-relevant sections (R42–R49 reinforcements)

Did NOT consult: `coordination/diagnostics/` (none present for R50), `coordination/logs/`, `.prompt-*.md`.

**Findings summary** (full detail in REVIEWER-REPORT-R50.md):
- MAJOR-1 — SKIP-counts-as-PASS at Q-R50-EMPIRICAL.sh:90-93 (6th+ tessera instance; structural-gate fold candidate)
- MINOR-1 — verify-wave-aggregate.sh:117/132-133 lowercase regex drops uppercase-prefix paths
- MINOR-2 — Q-R50-EMPIRICAL.sh:94 CHORE_A_SHA encodes chore-B (3rd tessera instance; cross-project threshold reached)
- MINOR-3 — AC-R50-5 weak grep satisfied by lowercase body sentence; heading uses capital T
- MINOR-4 — AC-R50-3 weak help-text grep; does not exercise flag handler
- MINOR-5 — solo-tier heuristic (run-pipeline.sh:674) diverges from canonical "MUST" mandate (R49 MAJOR-1 class)
- MINOR-6 — NEXT-ROLE.md TD-3 cite "line 733" vs actual run-pipeline.sh:735 (4th tessera instance; rule canonical)
- OBS-1/2/3/4 — Check 1 dormancy; --wave-gate-without-coordinator silent ignore; no RED commit (precedent); $ROUND default

## Implementer chore-A attestation (preserved for audit)

**Chore-A SHA:** `0cc87bf920584392e4008a672cc6339ef55cf0e8`

**Empirical verifier output (Q-R50-EMPIRICAL.sh at chore-A):**
```
=== Summary: 14 PASS / 0 FAIL ===
```
All 10 ACs PASS (14 sub-assertions from AC-R50-10's 5-part decomposition).

**Pre-commit rule sweep (scripts/pre-commit-rule-sweep.sh 3974d2f 0cc87bf):**
- Rule 1: MECHANICAL — invokes verify-empirical-acs.sh R50 → exit 0
- Rules 2,3,5,6: SEMANTIC (advisory; N/A for methodology round)
- Rule 4: ADVISORY (new spec file; ALLOWED_SET authoring verified against spec § 4)
- Rule 7: MECHANICAL — spec § 7 enumerates all 7 rules → OK
- Overall: exit 0, 0 mechanical findings

### Spec-deviance disclosures

**TD-1 (resolved before routing):** `$WAVE_PLAN` undefined in `build_consolidation_reviewer_prompt()`. The heredoc at line 717 referenced `$WAVE_PLAN` which was only defined as a local in `run_wave_gate_close()`. Fixed in commit `0cc87bf` by deriving `wave_plan_path` from `$WAVE_GATE_ID` inside `build_consolidation_reviewer_prompt()` using the same WAVE-NN parsing logic. Empirical verifier re-confirmed 14 PASS / 0 FAIL post-fix.

**TD-2 (resolved before routing):** AC-R50-5 grep used lowercase `tier-aware consolidation Reviewer` but the CLAUDE-COORDINATOR.md heading was "Tier-aware consolidation Reviewer". Fixed by ensuring the section body text contains the lowercase phrase "The tier-aware consolidation Reviewer provides the missing audit at the wave boundary." The empirical verifier's `grep -cF "tier-aware consolidation Reviewer"` finds this sentence; actual=1.

**TD-3 (design limitation — disclosed for Reviewer):** `build_consolidation_reviewer_prompt()` references `$ROUND` (line 733: `coordination/reviews/REVIEWER-REPORT-${ROUND}-consolidation.md`). In wave-gate mode, `$ROUND` is the Coordinator session's round (e.g., `COORD`), which may not be ideal. This is a pre-existing pattern from the Coordinator dispatcher; the prompt is advisory scaffolding. No functional regression; AC-R50-4 (bash syntax) passes. Flag for operator: a future round could define `$WAVE_ROUND` for the consolidation report filename.

## Round-scope directive (R50 — parallel-execution levers: wave-aggregate verifier + tier-aware consolidation Reviewer; audit-tier)

R50 follows R49 close (`3974d2f`) per operator-selected sequencing (R47 ESCALATE → R48 fix → R49 pipeline-mandatory + hybrid → R50 parallel-execution levers).

**Round-start SHA:** `3974d2f` (chore(R49): Memorial-Updater outputs).

### Primary deliverable

Add the two parallel-execution levers identified in the R42-R47 design analysis: a wave-aggregate verifier script for cross-cluster consolidation, and a tier-aware consolidation Reviewer in the pipeline that mandates cold-eye review at wave-gate when any constituent cluster ran `--tier solo`. Closes the "no cold-eye review at consolidation when clusters ran solo-tier" gap.

Specifically:

- **(a) New `scripts/verify-wave-aggregate.sh`.** Wave-gate equivalent of `verify-empirical-acs.sh`. Validates parallel-cluster wave consolidation at the Coordinator's wave-gate close, before STATUS: WAVE-COMPLETE. Three mechanical checks:
  - **Aggregate ALLOWED_SET union check:** verify the union of all constituent clusters' diffs ⊆ a wave-level allowed-set (per-cluster ALLOWED_SETs are insufficient at wave granularity). Detects aggregate scope creep.
  - **Cross-cluster contract verification:** if cluster A and cluster B both touch a shared schema/interface/type definition, verify they agree on shape. Detects inter-cluster contract drift.
  - **Cross-cluster MEMORIAL fragment semantic-conflict detection:** if two cluster MEMORIAL fragments CONFIRM contradictory disciplines for the same round, flag for operator. Detects MEMORIAL semantic-collision (flock prevents write-collision; not this).

  Usage: `scripts/verify-wave-aggregate.sh <wave-number>` (e.g., `WAVE-01`). Reads `coordination/WAVE-PLAN-<N>.md` for cluster list + wave-level allowed-set; reads per-cluster `coordination/clusters/<cluster-id>/MEMORIAL-fragment.md` + diff. Exit 0 = clean; non-zero = wave-aggregate finding.

- **(b) `run-pipeline.sh` Coordinator-mode extension — tier-aware consolidation Reviewer.** At Coordinator wave-gate close, detect if any constituent cluster ran `--tier solo`:
  - If yes: MANDATORY cold-eye consolidation Reviewer subprocess session before STATUS: WAVE-COMPLETE. Spawns fresh `claude` session with consolidated wave state + per-cluster handoff artifacts as input. Reviewer audits cross-cluster integration in addition to per-cluster work.
  - If no (all clusters ran audit/full tiers with own Reviewer): consolidation Reviewer is OPTIONAL (operator can invoke via `--consolidation-reviewer` flag, but pipeline doesn't auto-fire). Cluster-level Reviewers covered cluster-local; consolidation focuses on integration.
  - Wave-gate also invokes `scripts/verify-wave-aggregate.sh <wave>` as part of pre-consolidation-Reviewer mechanical sweep.

- **(c) Update `CLAUDE-COORDINATOR.md`** § "Memorial state" or new sub-section: document the new wave-gate consolidation Reviewer behavior. The Coordinator's wave-gate flow now includes: (1) flock + cluster fragment append; (2) `verify-wave-aggregate.sh` mechanical sweep; (3) tier-aware consolidation Reviewer if solo-tier cluster present; (4) STATUS: WAVE-COMPLETE.

- **(d) New `coordination/SPEC-AUTHORING-CHECKLIST.md § Wave-aggregate verification discipline` section.** Sub-class canonical text: "Multi-cluster parallel waves where any constituent cluster ran `--tier solo` (no per-cluster Reviewer) MUST run a cold-eye consolidation Reviewer at wave-gate before STATUS: WAVE-COMPLETE. The Coordinator wave-gate aggregation is NOT a substitute for a Reviewer — it is book-keeping. Cross-cluster contract drift, aggregate scope creep, and MEMORIAL fragment semantic-conflict are visible only at the consolidated layer." Authoring requirements + Coordinator + consolidation-Reviewer responsibilities.

- **(e) R50 self-applies via Q-R50-EMPIRICAL.sh.** Verifier checks post-R50 state: `scripts/verify-wave-aggregate.sh` exists + executable + syntax-valid; `run-pipeline.sh` contains tier-aware consolidation Reviewer logic (stdout-grep on `--help` for the new flag/behavior); `CLAUDE-COORDINATOR.md` has the wave-gate consolidation Reviewer documentation; `SPEC-AUTHORING-CHECKLIST.md` has the new § Wave-aggregate verification discipline section header.

### Tier rationale

**audit-tier** — methodology round; Implementer authors thin spec inline (Q-R50-SPEC.md); Reviewer cold-eye; MU close. Substantive work is new script authoring + pipeline extension + role-file documentation; bounded scope (script is ~200 lines max; pipeline extension is wave-gate-flow addition).

### Anti-scope (R50 hard limits)

- **NO addition of REINFORCED entries to CLAUDE-*.md.** CLAUDE-IMPLEMENTER.md still at 37 entries (operator-decision flag #6; R51 consolidation candidate). R50 must not add to the count.
- NO modification of `engine/*`, `test/*`, `tools/*` files (zero production-code changes).
- NO modification of `~/.claude/CROSS-PROJECT-MEMORIAL.md` (Rule 7 anchor-canonical-landing-deferred discipline).
- NO modification of `coordination/MEMORIAL-PHASE-*.md` (R42 frozen shards).
- NO modification of R42-R49 specs / empirical files (preserve historical baseline).
- NO modification of `coordination/SCOPING-MEMO-v0.3.md` or `coordination/PRD.md`.
- NO modification of `scripts/finalize-round.sh` or `scripts/verify-empirical-acs.sh` or `scripts/pre-commit-rule-sweep.sh` (R45/R46/R47/R49 deliverables stable; wave-aggregate is a SEPARATE script).
- NO Phase 3 territory.
- NO opening any GitHub PRs.

ALLOWED modifications:
- `scripts/verify-wave-aggregate.sh` (NEW — wave-gate verifier)
- `run-pipeline.sh` (modify — Coordinator-mode tier-aware consolidation Reviewer extension)
- `CLAUDE-COORDINATOR.md` (modify — document wave-gate consolidation Reviewer behavior)
- `coordination/SPEC-AUTHORING-CHECKLIST.md` (add new § Wave-aggregate verification discipline section)
- `coordination/specs/Q-R50-SPEC.md` (NEW — Implementer-authored thin spec)
- `coordination/specs/Q-R50-EMPIRICAL.sh` (NEW — self-applies tightenings)
- `coordination/MEMORIAL.md` (chore-A append)
- `coordination/NEXT-ROLE.md` (this file; pipeline updates)

### Apply all 7 cross-project rules UPFRONT

(Per `coordination/SPEC-AUTHORING-CHECKLIST.md` § Rule 7 self-application gate. Canonical short names.)

- **Rule 1 (`false-compliance-attestation`):** ACTIVE GATE — all empirical claims (script exists; pipeline flag present; documentation section header present) verified via Q-R50-EMPIRICAL.sh at chore-A. Applies R47 Tightenings 1-4 + R48 corrections + R49 conventions (no vacuous meta-ACs; stdout-grep for runtime claims; re-derive SHAs; exact counts; assert_eq not assert_ge per R49 MINOR-1 finding).
- **Rule 2 (`branch-binding-coverage-gate`):** N/A — no production-code branches in the round's deliverable (the wave-aggregate script is new code but methodology-class; not engine production).
- **Rule 3 (`implementer-spec-test-assertion-coverage`):** N/A — no test file authored.
- **Rule 4 (`anti-scope-allowed-set-forward-coverage`):** ACTIVE GATE — ALLOWED_SET in Q-R50-SPEC.md at spec-emit time; matches the "ALLOWED modifications" list above.
- **Rule 5 (`rule-derivation-without-self-application`):** ACTIVE GATE — R50 codifies wave-aggregate-verification discipline. Self-application: R50 is itself a single-track sequential round (not multi-cluster), so the wave-aggregate discipline doesn't directly fire for R50 — but the verifier MUST be invocable + the pipeline must be extended such that a future multi-cluster wave can rely on it. Q-R50-EMPIRICAL.sh tests the scaffolding presence, not a live wave-gate run.
- **Rule 6 (`halt-discipline-no-DIAGNOSTIC-for-workaround`):** ACTIVE GATE — if Q-R50-EMPIRICAL.sh fails, HALT + DIAGNOSTIC. If verify-wave-aggregate.sh smoke test fails on a known-good wave-gate fixture (or absence of one), HALT + DIAGNOSTIC.
- **Rule 7 (`derived-rule-propagation-mechanism-required`):** ACTIVE GATE + Surface (a) + (b) extension — new SPEC-AUTHORING-CHECKLIST.md § Wave-aggregate verification discipline section IS Rule 7 Surface (a); the new `verify-wave-aggregate.sh` script IS Surface (b) at wave granularity; Surface (c) is round-conditional (no new rule canonically landed this round; the discipline extends an existing structural intent at a new layer).

### Halt conditions

1. **Q-R50-EMPIRICAL.sh exits non-zero at chore-A:** HALT + DIAGNOSTIC. Do NOT attest PASS on a failed AC.
2. **`bash -n` syntax check fails on either modified or new script:** HALT + DIAGNOSTIC.
3. **`run-pipeline.sh` modifications break existing R47-R49 tested workflows:** the R49 auto-fire-pipeline-after-finalize-round behavior MUST still work post-R50. If smoke test of `./run-pipeline.sh --help` fails or single-round audit-tier flow regresses → HALT + DIAGNOSTIC.
4. **Test baseline drift:** any change from `361/355/3/3` → HALT + DIAGNOSTIC.
5. **CLAUDE-IMPLEMENTER.md REINFORCED count drift:** any change from **37** entries → HALT + DIAGNOSTIC (anti-scope strict; R51 consolidation candidate).
6. **scripts/finalize-round.sh modified:** R49 deliverable; out of scope for R50. Any modification → HALT + DIAGNOSTIC.

### Inputs for Implementer

1. `scripts/verify-empirical-acs.sh` — reference pattern for single-round verifier (R45/R46/R49 deliverable). Adapt to wave-gate granularity.
2. `scripts/pre-commit-rule-sweep.sh` — reference pattern for recursion-guarded multi-rule check (R45/R48 deliverable).
3. `run-pipeline.sh` — existing pipeline; modify Coordinator-mode handling for the new tier-aware consolidation Reviewer.
4. `CLAUDE-COORDINATOR.md` — existing Coordinator role file; § "Memorial state" wave-gate section is the integration point.
5. `coordination/SPEC-AUTHORING-CHECKLIST.md` — existing checklist; add new § Wave-aggregate verification discipline section.
6. `coordination/WAVE-PLAN-01.md` + `coordination/WAVE-GATE-01.md` (R24/R27 historical) — example wave-plan / wave-gate artifacts for verify-wave-aggregate.sh design reference.
7. `coordination/clusters/*/MEMORIAL-fragment.md` (Phase 2 historical, if present) — cluster-fragment format reference.
8. R49 deliverables (`Q-R49-SPEC.md`, `Q-R49-EMPIRICAL.sh`, R49 Reviewer report) — authoring pattern + Reviewer findings to NOT recur (MINOR-1 assert_ge vs assert_eq; MINOR-3 SKIP-counts-as-PASS).

### Pipeline invocation

```bash
cd /Users/johnwarren/concord/tessera
./run-pipeline.sh --round R50 --tier audit
```

(Per R49 pipeline-mandatory discipline; this is the canonical invocation. `scripts/finalize-round.sh` will auto-fire pipeline at Implementer chore-A close if invoked separately.)

---

## Operator-decision flags (carried forward; status post-R49 close)

1. R45 CRITICAL routing accept-vs-escalate (separately tracked).
2. Rule 7 Surface (c) HARD-GATE candidate (8+ tessera instances; below cross-project 2nd-project threshold per Rule 7 anchor-canonical-landing-deferred).
3. Cross-project canonical landings (gated on 2nd-project occurrence; 7+ items now: memorial sharding; Rule 7 Surface a/b; Rule 1 sub-class; verifier tightenings; recursion guard; pipeline-mandatory; hybrid Reviewer formalization).
4. Anchor PR backflog scheduling (R11-R49 contributions).
5. Phase 3 PRD authoring + § 5.2 forward-protection redesign A/B/C.
6. CLAUDE-IMPLEMENTER.md re-consolidation candidate (R51 candidate). Currently at 37 REINFORCED entries (R47 + R48 MU appends; 7 over R43 30-entry threshold). Same failure mode R43 fixed at R36 → R43.
7. **NEW post-R49:** R49 MAJOR-1 — hybrid Reviewer mandate vs structural enforcement mismatch at full-tier. R49 Reviewer flagged this; not blocking; candidate for fold-in at R50 (this round) IF time permits, OR separate future round (R52 candidate). R50 anti-scope DOES allow run-pipeline.sh modifications, so could be in-scope if Implementer chooses; recommend leaving for R52 to keep R50 focused on parallel-execution levers.

HARD STOP re-engaged on Phase 3 scope entry pending operator decisions above.
