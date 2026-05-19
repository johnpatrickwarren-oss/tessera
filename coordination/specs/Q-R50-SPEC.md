# Q-R50-SPEC — Wave-aggregate verifier + tier-aware consolidation Reviewer

**Round:** R50  
**Tier:** audit (Implementer as Architect hat; Reviewer cold-eye follows)  
**Spec-emit SHA:** 3974d2f (round-start)

---

## § 1. Goal

Add the two parallel-execution levers identified in the R42-R47 design analysis:

1. **`scripts/verify-wave-aggregate.sh`** — wave-gate equivalent of `verify-empirical-acs.sh`. Runs three mechanical checks at Coordinator wave-gate close: ALLOWED_SET union check (detects aggregate scope creep), cross-cluster contract drift check (advisory: detects shared-interface conflicts), and MEMORIAL fragment semantic-conflict detection (advisory: flags contradictory discipline CONFIRMATION/VIOLATION entries across clusters).

2. **`run-pipeline.sh` Coordinator-mode extension** — tier-aware consolidation Reviewer. Adds `--wave-gate WAVE-NN` flag (Coordinator wave-gate close flow) and `--consolidation-reviewer` flag. When any constituent cluster ran `--tier solo`, a mandatory cold-eye consolidation Reviewer subprocess fires before STATUS: WAVE-COMPLETE. When all clusters ran audit/full, consolidation Reviewer is optional (manual `--consolidation-reviewer` flag).

3. **`CLAUDE-COORDINATOR.md` update** — documents new wave-gate consolidation Reviewer behavior in the wave-gate discipline section.

4. **`coordination/SPEC-AUTHORING-CHECKLIST.md` update** — adds `## Wave-aggregate verification discipline` section with the canonical sub-class text per NEXT-ROLE.md directive (d).

Closes the "no cold-eye review at consolidation when clusters ran solo-tier" gap.

---

## § 2. Brainstorm (Approach C selected)

Four approaches considered:
- **Approach A (pure stubs):** eliminated — PRD requires functional mechanical checks, not no-ops.
- **Approach B (fully operational):** eliminated — cross-cluster contract drift and tier detection require cluster SHA tracking not available without spec-emit-SHA infrastructure; over-engineers for scaffolding round.
- **Approach C (scaffolding-complete, advisory limitations):** SELECTED. Matches `pre-commit-rule-sweep.sh` precedent: mechanical checks fire and exit non-zero where deterministic (ALLOWED_SET union); advisory output where semantic (contract drift, MEMORIAL conflict). Honest about limitations in script comments.
- **Approach D (separate wave-gate script only):** eliminated — PRD explicitly requires run-pipeline.sh extension so that `--help` shows the new flag.

**Rationale:** Approach C delivers functional scaffolding future multi-cluster waves can rely on, while being honest about the same mechanization limits acknowledged in Rule 4 (advisory) of `pre-commit-rule-sweep.sh`.

---

## § 3. Mechanism

### 3.1 `scripts/verify-wave-aggregate.sh`

Usage: `scripts/verify-wave-aggregate.sh <WAVE-NN>` (e.g., `WAVE-01`).

Argument: wave identifier string. Locates `coordination/WAVE-PLAN-*.md` — tries exact match `coordination/WAVE-PLAN-<N>.md` where `<N>` is the numeric part (e.g., `WAVE-01` → `WAVE-PLAN-01.md`). If not found, exits 2 (usage error).

**Check 1 — Aggregate ALLOWED_SET union (mechanical):**  
For each cluster found in `coordination/clusters/*/`, read `coordination/clusters/<id>/MEMORIAL-fragment.md` to identify cluster presence. Compare the set of files touched by ALL cluster diffs (if determinable from git or MEMORIAL-fragment) against a wave-level allowed set. In the absence of per-cluster SHA metadata, this check reads each cluster's `MEMORIAL-fragment.md` for ALLOWED_SET mentions and unions them. If a file appears in the union outside the wave-level allowed set (if a `## Wave-level ALLOWED_SET` section exists in the WAVE-PLAN file), flag it as a finding. If no wave-level allowed set is defined, emit advisory output noting "wave-level ALLOWED_SET not defined in WAVE-PLAN; aggregate scope check is advisory."

**Check 2 — Cross-cluster contract drift (advisory):**  
Identify files appearing in 2+ cluster MEMORIAL-fragment.md files as modified/added. For each such file, emit advisory: "File <path> appears in N cluster diffs; verify clusters agree on interface shape." Cannot mechanically detect semantic contract drift — always advisory.

**Check 3 — MEMORIAL fragment semantic-conflict detection (advisory):**  
For each discipline keyword found in cluster MEMORIAL-fragment.md files, detect contradictory CONFIRMATION/VIOLATION entries (same discipline keyword appears as CONFIRMATION in cluster A and VIOLATION in cluster B for the same round). Emit advisory if found.

Exit codes:
- 0 — clean (Check 1 passes mechanically, or Check 1 is advisory + no mechanical findings)
- 1 — finding (Check 1 mechanical gate violation detected)
- 2 — usage / invocation error (wave arg missing or WAVE-PLAN not found)

### 3.2 `run-pipeline.sh` extension

Add two new flags:
- `--wave-gate WAVE-NN` — triggers Coordinator wave-gate close flow (only valid with `--coordinator`)
- `--consolidation-reviewer` — forces consolidation Reviewer dispatch in wave-gate mode

When `--coordinator --wave-gate WAVE-NN`:
1. Run `scripts/verify-wave-aggregate.sh WAVE-NN`; if exit non-zero → log finding; continue (non-blocking but logged)
2. Detect if any constituent cluster in WAVE-NN ran `--tier solo` by reading MEMORIAL-fragment.md files for tier indicators (heuristic: solo-tier fragments lack a REVIEWER stage; check for REVIEWER CONFIRMATION entries)
3. If solo-tier detected OR `--consolidation-reviewer` flag present: build and dispatch consolidation Reviewer prompt; run as subprocess (similar to hybrid Reviewer pattern)
4. If neither solo-tier nor `--consolidation-reviewer`: log "Consolidation Reviewer not required (all clusters ran audit/full tiers); use --consolidation-reviewer to force"

Update `--help` text to include `--wave-gate` and `--consolidation-reviewer` options.

### 3.3 CLAUDE-COORDINATOR.md update

Extend the existing `## Wave gate discipline` section (after the wave-gate checklist) with a new sub-section: `### Tier-aware consolidation Reviewer at wave-gate close`. Document: (a) mandatory consolidation Reviewer when any cluster ran solo-tier; (b) optional via `--consolidation-reviewer` for audit/full-only waves; (c) invocation: `./run-pipeline.sh --coordinator --wave-gate WAVE-NN [--consolidation-reviewer]`; (d) wave-gate flow sequence: verify-wave-aggregate.sh → tier detection → consolidation Reviewer → STATUS: WAVE-COMPLETE.

### 3.4 SPEC-AUTHORING-CHECKLIST.md addition

Add new section `## Wave-aggregate verification discipline` containing the canonical sub-class text verbatim from NEXT-ROLE.md directive (d) (the "Multi-cluster parallel waves..." paragraph) plus authoring requirements.

---

## § 4. Anti-scope

**ALLOWED_SET (at spec-emit time; must not expand post-spec-emit):**

```
scripts/verify-wave-aggregate.sh         (NEW)
run-pipeline.sh                          (modified)
CLAUDE-COORDINATOR.md                    (modified)
coordination/SPEC-AUTHORING-CHECKLIST.md (modified)
coordination/specs/Q-R50-SPEC.md         (this file — NEW)
coordination/specs/Q-R50-EMPIRICAL.sh   (NEW)
coordination/MEMORIAL.md                 (chore-A append)
coordination/NEXT-ROLE.md               (chore-A update)
```

Regex carve-outs for review/diagnostic files:
```
/^coordination\/reviews\/REVIEWER-REPORT-R50/
/^coordination\/diagnostics\/DIAGNOSTIC-R50-/
```

**Explicitly NOT in scope:**
- NO modification of `engine/*`, `test/*`, `tools/*` (zero production-code changes)
- NO modification of `~/.claude/CROSS-PROJECT-MEMORIAL.md` (Rule 7 anchor-canonical-landing-deferred)
- NO modification of `coordination/MEMORIAL-PHASE-*.md` (R42 frozen shards)
- NO modification of R42-R49 specs / empirical files (preserve historical baseline)
- NO modification of `scripts/finalize-round.sh`, `scripts/verify-empirical-acs.sh`, `scripts/pre-commit-rule-sweep.sh` (R45/R46/R47/R49 deliverables stable)
- NO addition of REINFORCED entries to CLAUDE-*.md (CLAUDE-IMPLEMENTER.md must remain at 37 entries)
- NO Phase 3 territory, NO GitHub PRs

---

## § 5. Acceptance criteria

| ID | Given | When | Then |
|---|---|---|---|
| AC-R50-1 | `scripts/verify-wave-aggregate.sh` at chore-A | `[ -x scripts/verify-wave-aggregate.sh ]` | exit 0 (executable bit set) |
| AC-R50-2 | `scripts/verify-wave-aggregate.sh` at chore-A | `bash -n scripts/verify-wave-aggregate.sh` | exit 0 (no syntax errors) |
| AC-R50-3 | `run-pipeline.sh` modified at chore-A | `./run-pipeline.sh --help \| grep -c 'consolidation-reviewer'` | count = 1 (new flag in help text) |
| AC-R50-4 | `run-pipeline.sh` modified at chore-A | `bash -n run-pipeline.sh` | exit 0 (no syntax errors introduced) |
| AC-R50-5 | `CLAUDE-COORDINATOR.md` modified at chore-A | `grep -cF "tier-aware consolidation Reviewer" CLAUDE-COORDINATOR.md` | count ≥ 1 (new documentation present) |
| AC-R50-6 | `coordination/SPEC-AUTHORING-CHECKLIST.md` modified at chore-A | `grep -cF "## Wave-aggregate verification discipline" coordination/SPEC-AUTHORING-CHECKLIST.md` | count = 1 (new section header present exactly once) |
| AC-R50-7 | `scripts/verify-wave-aggregate.sh` invoked with no arguments | `scripts/verify-wave-aggregate.sh` (no args) | exit code = 2 (usage error; consistent with verify-empirical-acs.sh convention) |
| AC-R50-8 | Round-start SHA `3974d2f` and chore-A SHA | `git diff 3974d2f..<CHORE-A-SHA> --name-only` | every file ⊆ ALLOWED_SET; 0 files outside the set |
| AC-R50-9 | `CLAUDE-IMPLEMENTER.md` at chore-A | `grep -cE "^# REINFORCED" CLAUDE-IMPLEMENTER.md` | count = 37 (anti-scope strict; no new REINFORCED entries) |
| AC-R50-10 | Test suite at chore-A SHA | `node --test --test-reporter=tap test/*.test.js` | tests=361 pass=355 fail=3 skip=3; AND `npx tsc -p tsconfig.test.json` exits 0 |

---

## § 6. Open questions

None — all resolved. This is a scaffolding round; the wave-aggregate verifier's advisory limitations (contract drift, MEMORIAL conflict detection) follow the established `pre-commit-rule-sweep.sh` pattern and require no new architectural decisions.

---

## § 7. Apply all 7 cross-project rules UPFRONT

- **Rule 1 (`false-compliance-attestation`):** ACTIVE GATE — all 10 ACs are empirically verifiable via `Q-R50-EMPIRICAL.sh`. Attestations in NEXT-ROLE.md MUST come from actual command output at chore-A, not memorized spec text.
- **Rule 2 (`branch-binding-coverage-gate`):** N/A — no production-code branches in deliverables. `verify-wave-aggregate.sh` is script infrastructure; pipeline extension branches are documented in script comments per R45 precedent.
- **Rule 3 (`implementer-spec-test-assertion-coverage`):** N/A — no test file authored; methodology round (R42/R43 precedent for test-free methodology rounds).
- **Rule 4 (`anti-scope-allowed-set-forward-coverage`):** ACTIVE GATE — ALLOWED_SET in § 4 above at spec-emit time. Must not expand post-spec-emit. Anti-scope diff verified in AC-R50-8.
- **Rule 5 (`rule-derivation-without-self-application`):** ACTIVE GATE — R50 codifies wave-aggregate-verification discipline (new § in SPEC-AUTHORING-CHECKLIST.md). This round is itself a single-track sequential round (not multi-cluster), so the wave-aggregate discipline does not directly fire for R50. Structural enforcement: the verifier scaffolding is invocable post-R50; future multi-cluster waves can rely on it.
- **Rule 6 (`halt-discipline-no-DIAGNOSTIC-for-workaround`):** ACTIVE GATE — if any halt condition fires (§ 3 from NEXT-ROLE.md), HALT + DIAGNOSTIC required. No workarounds.
- **Rule 7 (`derived-rule-propagation-mechanism-required`):** ACTIVE GATE + Surface (a) + (b) extension — SPEC-AUTHORING-CHECKLIST.md § Wave-aggregate verification discipline IS Rule 7 Surface (a) for this new discipline; `verify-wave-aggregate.sh` IS Surface (b) at wave granularity; Surface (c) is round-conditional (no new cross-project rule canonically derived this round; discipline extends existing structural intent at wave layer).
