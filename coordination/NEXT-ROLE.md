CURRENT-ROUND: R49
NEXT-ROLE: (operator decision)
STATUS: ROUND-COMPLETE
TIER: audit
SHA-A: 4e62d992bd7b339fccdff83906afc7ac2f8d6de2

## Memorial-Updater inputs

- `coordination/reviews/REVIEWER-REPORT-R49.md` — Reviewer report (0 CRITICAL, 1 MAJOR, 5 MINOR, 5 OBS)
- `coordination/specs/Q-R49-SPEC.md` — spec
- `coordination/specs/Q-R49-EMPIRICAL.sh` — empirical verifier (run `scripts/verify-empirical-acs.sh R49`)
- `scripts/finalize-round.sh` — extended with step 7 pipeline auto-fire
- `CLAUDE-IMPLEMENTER.md` — "On clean completion" section updated
- `CLAUDE-COORDINATOR.md` — hybrid Reviewer mandate section added
- `run-pipeline.sh` — `--hybrid-reviewer` flag added
- `coordination/SPEC-AUTHORING-CHECKLIST.md` — `## Pipeline-mandatory discipline` section added

**Reviewer attestation (cold-eye Opus pass):** Q-R49-EMPIRICAL.sh → 14 PASS / 0 FAIL at chore-A. All 10 ACs PASS structurally. Findings: 0 CRITICAL, 1 MAJOR (MAJOR-1: hybrid Reviewer mandate vs structural enforcement mismatch at full-tier), 5 MINOR (MINOR-1: assert_ge vs assert_eq Tightening-4 self-app gap; MINOR-2: TIER convention not self-applied; MINOR-3: SKIP-counts-as-PASS in verifier; MINOR-4: CHORE_A_SHA mis-naming; MINOR-5: line citation drift), 5 OBS. Routing: MERGE-READY per CRITICAL=0.

**Implementer attestation (Q-R49-EMPIRICAL.sh at pre-commit):** 14 PASS / 0 FAIL (10 ACs; AC-R49-10 has 5 sub-checks). Test baseline 361/355/3/3 preserved. `tsc` exit 0.

**Spec deviance:** AC-R49-1 grep pattern amended from `run-pipeline\.sh .+--start-at REVIEWER` → `run-pipeline\.sh.*--start-at REVIEWER` because `"$PROJECT_ROOT/run-pipeline.sh"` has a quote char between `.sh` and ` --round` — the ` .+` form (literal space then one-or-more) would miss the quote. The `.*` form matches the same structural property (pipeline auto-fire invocation on the same line as `--start-at REVIEWER`). Spec updated in same session before commit.

**TDD disclosure:** Verifier (Q-R49-EMPIRICAL.sh) authored before implementation; run showed 6 FAILs (spirit of TDD RED state met). No separate git RED commit (methodology round; R42-R48 precedent; letter not met per R41 MINOR-5 disclosure form).

## Round-scope directive (R49 — pipeline-mandatory discipline + hybrid Reviewer at close-walk; audit-tier)

R49 follows R48 close (`356ff56`) per operator-selected sequencing (R47 ESCALATE close → R48 fix → R49 pipeline-mandatory + hybrid → R50 parallel-execution levers).

**Round-start SHA:** `356ff56` (chore(R48): Memorial-Updater outputs).

### Primary deliverable

Lock pipeline-as-default into the interactive-mode workflow + formalize hybrid Reviewer mandate at close-walk class waves. Closes the gap identified at R42-R47 where interactive Implementer sessions bypassed the framework's auto-routing.

Specifically:

- **(a) Extend `scripts/finalize-round.sh` to auto-invoke pipeline.** After the existing two-commit SHA-attestation sequence completes (SHA-A + SHA-B), the script SHALL invoke `./run-pipeline.sh --round <CURRENT-ROUND> --start-at REVIEWER` (or equivalent flag for tier-aware Reviewer spawn). This makes pipeline firing MECHANICAL — the operator cannot accidentally skip Reviewer by closing a round interactively. Structural enforcement of pipeline-mandatory discipline.

- **(b) Update CLAUDE-IMPLEMENTER.md "On clean completion" section** (lines ~100-112; the role-discipline narrative section, NOT the REINFORCEMENTS section). After step 4 (record chore-A SHA in NEXT-ROLE.md) and routing step 5 (Routing: NEXT-ROLE: REVIEWER), add explicit instruction: "MUST invoke `scripts/finalize-round.sh` OR `./run-pipeline.sh --round R<NN> --start-at REVIEWER` before declaring round complete; do NOT terminate the session at chore-A — pipeline Reviewer + MU stages are required to close the round." Documentary surface; reinforces Surface (a) of the new discipline.

- **(c) Add new `coordination/SPEC-AUTHORING-CHECKLIST.md § Pipeline-mandatory discipline` section.** Sub-class canonical text: "Every spec's `## Pipeline invocation` footer (`./run-pipeline.sh --round R<NN> --tier <tier>`) is the canonical method for round execution. Interactive-mode single-session is the DEVIATION, not the default. Any round that does not run through the pipeline (or document an explicit operator-waiver with rationale) is a Rule 1 sub-class candidate violation: the Implementer self-attestation chain bypasses the cold-eye Reviewer safety net the framework was designed around." Author-time + chore-A + Reviewer requirements. Spec template surface (Surface a equivalent for the discipline).

- **(d) Formalize hybrid Reviewer at close-walk class.** Update `CLAUDE-COORDINATOR.md` § "Memorial state" or a new sub-section: at close-walk class waves (Phase close; SLICE close; sub-Phase close; multi-cluster wave consolidation; rounds where hybrid Reviewer has already been used 3+ times — R32/R36/R37/R39 + ... ), hybrid Reviewer (Opus + Sonnet merged) is MANDATORY not advisory. Define close-walk class mechanically via either: a `--hybrid-reviewer` flag check in `run-pipeline.sh` that auto-fires for the named class, OR a NEXT-ROLE.md state convention (e.g., `CLOSE-WALK-CLASS: true` triggers hybrid pipeline routing). Update `run-pipeline.sh` tier rubric documentation accordingly.

- **(e) R49 self-applies via Q-R49-EMPIRICAL.sh.** Verifier checks post-R49 state: `scripts/finalize-round.sh` contains the auto-fire pipeline invocation; `CLAUDE-IMPLEMENTER.md` "On clean completion" has the pipeline mandate sentence; `SPEC-AUTHORING-CHECKLIST.md` has the new "Pipeline-mandatory discipline" section header; `CLAUDE-COORDINATOR.md` has the hybrid Reviewer mandate at close-walk class.

### Tier rationale

**audit-tier** — methodology round; Implementer authors thin spec inline (Q-R49-SPEC.md); Reviewer cold-eye; MU close. The substantive work is rule documentation + light tooling extension; no novel architecture.

### Anti-scope (R49 hard limits)

- **NO addition of REINFORCED entries to CLAUDE-*.md.** CLAUDE-IMPLEMENTER.md is at **37 REINFORCED** lines (over the 30-entry threshold R43 consolidated to; R47 + R48 MU appends accumulated). Operator-decision flag #6 (added post-R47): consolidation candidate for a separate future round (R51). R49 MUST NOT add to the count. Modify ONLY the "On clean completion" narrative section of CLAUDE-IMPLEMENTER.md.
- NO modification of `engine/*`, `test/*`, `tools/*` files (zero production-code changes).
- NO modification of `~/.claude/CROSS-PROJECT-MEMORIAL.md` (Rule 7 anchor-canonical-landing-deferred discipline).
- NO modification of `coordination/MEMORIAL-PHASE-*.md` (R42 frozen shards).
- NO modification of R42-R48 specs / empirical files (preserve historical baseline).
- NO modification of `coordination/SCOPING-MEMO-v0.3.md` or `coordination/PRD.md`.
- NO Phase 3 territory.
- NO opening any GitHub PRs.

ALLOWED modifications: `scripts/finalize-round.sh`, `CLAUDE-IMPLEMENTER.md` (narrative section ONLY), `CLAUDE-COORDINATOR.md`, `coordination/SPEC-AUTHORING-CHECKLIST.md` (add new section), `run-pipeline.sh` (tier-rubric documentation update + optional `--hybrid-reviewer` flag handling).

### Apply all 7 cross-project rules UPFRONT

(Per `coordination/SPEC-AUTHORING-CHECKLIST.md` § Rule 7 self-application gate. Canonical short names.)

- **Rule 1 (`false-compliance-attestation`):** ACTIVE GATE — all empirical claims (e.g., "section header present" / "auto-fire invocation present in script") verified via Q-R49-EMPIRICAL.sh at chore-A. Applies R47 Tightenings 1-4 + R48 corrections (no vacuous meta-ACs; stdout-grep for runtime claims; re-derive SHAs; exact counts).
- **Rule 2 (`branch-binding-coverage-gate`):** N/A — no production-code branches.
- **Rule 3 (`implementer-spec-test-assertion-coverage`):** N/A — no test file authored.
- **Rule 4 (`anti-scope-allowed-set-forward-coverage`):** ACTIVE GATE — ALLOWED_SET in Q-R49-SPEC.md at spec-emit time; matches the "ALLOWED modifications" list above + standard carve-outs.
- **Rule 5 (`rule-derivation-without-self-application`):** ACTIVE GATE — R49 is the round codifying pipeline-mandatory discipline. Self-application: R49 itself IS running through the pipeline. The empirical claim "R49 was pipeline-executed" can be verified by Reviewer via git log + pipeline metadata.
- **Rule 6 (`halt-discipline-no-DIAGNOSTIC-for-workaround`):** ACTIVE GATE — if Q-R49-EMPIRICAL.sh fails, HALT + DIAGNOSTIC. No silent workarounds.
- **Rule 7 (`derived-rule-propagation-mechanism-required`):** ACTIVE GATE + Surface (a) extension — the new "Pipeline-mandatory discipline" section in SPEC-AUTHORING-CHECKLIST.md IS Rule 7 Surface (a) for this discipline; auto-fire in finalize-round.sh IS Surface (b); Surface (c) is round-conditional (no new rule canonically landed this round; the discipline extends an existing structural intent).

### Halt conditions

1. **Q-R49-EMPIRICAL.sh exits non-zero at chore-A:** HALT + DIAGNOSTIC. Do NOT attest PASS on a failed AC.
2. **finalize-round.sh auto-fire breaks existing two-commit attestation flow:** if the script's pre-R49 SHA-A/SHA-B sequence regresses after the auto-fire extension is added → HALT + DIAGNOSTIC. The extension MUST be additive (after existing close), not disruptive.
3. **CLAUDE-IMPLEMENTER.md REINFORCED count drift:** any change from **37** entries → HALT + DIAGNOSTIC. R49 must not add or remove REINFORCED lines (anti-scope strict).
4. **Test baseline drift:** any change from `361/355/3/3` (R48 close baseline) → HALT + DIAGNOSTIC.
5. **Bash syntax error:** `bash -n` on modified scripts exits non-zero → HALT + DIAGNOSTIC.
6. **Pipeline self-invocation regression:** if the modified `scripts/finalize-round.sh` causes infinite pipeline self-invocation (R47-class recursion bug recurring at the round codifying pipeline-mandatory), HALT + DIAGNOSTIC. R48's recursion guard pattern (`_PRE_COMMIT_RULE_SWEEP_ACTIVE` env var) should be referenced for any similar guard in finalize-round.

### Inputs for Implementer

1. `scripts/finalize-round.sh` — existing script to extend with auto-fire pipeline (item a).
2. `CLAUDE-IMPLEMENTER.md` "On clean completion" section (narrative; lines ~100-112) — item b target.
3. `coordination/SPEC-AUTHORING-CHECKLIST.md` — existing checklist; add new § "Pipeline-mandatory discipline" section (item c).
4. `CLAUDE-COORDINATOR.md` — Coordinator role file; add hybrid Reviewer mandate at close-walk class (item d).
5. `run-pipeline.sh` — for tier-rubric documentation update + optional `--hybrid-reviewer` flag handling (item d).
6. R48 deliverables (`coordination/specs/Q-R48-SPEC.md`, `coordination/specs/Q-R48-EMPIRICAL.sh`) — authoring pattern reference for Q-R49 (Tightenings 1-4 self-applied).
7. `coordination/reviews/REVIEWER-REPORT-R48.md` — R48 Reviewer findings (verify R49 doesn't reproduce them).

### Pipeline invocation

```bash
cd /Users/johnwarren/concord/tessera
./run-pipeline.sh --round R49 --tier audit
```

---

## Operator-decision flags (carried forward from prior rounds; updated R48 close)

1. R45 CRITICAL routing accept-vs-escalate (separately tracked).
2. Rule 7 Surface (c) HARD-GATE candidate (8+ tessera instances at R32/R36/R39/R43/R44/R46/R47; below cross-project 2nd-project threshold per Rule 7 anchor-canonical-landing-deferred).
3. Cross-project canonical landings (gated on 2nd-project occurrence: R42 § 5.5 memorial sharding; R44 Rule 7 Surface a; R45 Rule 7 Surface b; R46 Rule 1 sub-class; R47 verifier tightenings; R48 recursion guard).
4. Anchor PR backflog scheduling (R11-R48 contributions).
5. Phase 3 PRD authoring + § 5.2 forward-protection redesign A/B/C.
6. **NEW post-R47:** CLAUDE-IMPLEMENTER.md re-consolidation candidate. Currently at 37 REINFORCED entries (R47 + R48 MU appends; over 30-entry threshold R43 consolidated to). Same failure mode R43 fixed at R36 → R43. R51 candidate (after R49 pipeline-discipline + R50 parallel-execution levers close).

HARD STOP re-engaged on Phase 3 scope entry pending operator decisions above.
