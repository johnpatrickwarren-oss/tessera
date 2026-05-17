CURRENT-ROUND: R07
NEXT-ROLE: ARCHITECT
STATUS: READY

## Round scope — operator-set (do NOT auto-redirect)

**R07 = Phase 1 SLICE 5: Stage 2b FCP-1 (Fleet-Correlated-Pattern primitive) + Stage 3b warm-start eligibility tagging + PR-F8 pair-review evidence matrix.**

This round is the second of two baseline-curation slices. R06 (SLICE 4) shipped the toolchain vendoring, Stage 2a per-shard within-window screening, and Stage 3a calibration handoff. R07 ships the **Tessera-native** contribution: the fleet-correlated-window detection that DeploySignal's per-deployment calibrator cannot perform.

If the Architect's brainstorm produces a strong case to defer SLICE 5 and continue some other in-flight work instead (e.g., return to SLICE 2b4 emission, or address R06's MINORs), that is a HALT-and-route-back condition — write a DIAGNOSTIC explaining why and STATUS: ESCALATE. Do NOT silently absorb the scope into a different slice. The operator-set scope decision (FCP-1 is the Tessera-native contribution, depends on R06's Stage 2a output, and Stage 3b closes the curation/warm-start coupling — see SCOPING-MEMO-BASELINE-CURATION-v0.2.md § 2 + § 8 discipline-archive significance) takes priority over natural-continuation inclination.

## Architectural pre-dispositions for R07 (John-confirmed, load-bearing)

Per `coordination/ARCHITECT-REPLY-BASELINE-CURATION-v0.2-PRE-DISPOSITION.md`:

- **Q-JC4** — FCP-1 formulation: **sequential e-process over windows**. `e_w = L(X_w | Binomial(N, p_alt)) / L(X_w | Binomial(N, p_base))`. Decision rule: declare window fleet-event-contaminated when running e-process exceeds `1/α_fleet`. Operator-tunable parameter is `α_fleet` (default 10⁻³); shard count threshold K is derived, not a parameter.
- **Q-JC4a** — `p_alt` mixture: **betting-adaptive** mirroring `engine/detectors/family-c-betting-e-process.ts`. Reuses inherited pair-review work.
- **Q-JC4b** — `p_base` estimation: **Bayesian shrinkage toward fleet-aggregate prior**. Small-N stability for dev clusters at N=10. **LOAD-BEARING constraint:** `p_base` must be estimated from data DISJOINT from windows being tested (e.g., prior-window history) OR via properly conditional e-process construction. Plug-in estimation from same data invalidates Ville bound — would be a CRITICAL Reviewer finding.
- **Q-JC4c** — coupling with Q-J1 e-BH: **separate pipe**. FCP-1 is calibration-time only; per-shard detector e-processes are runtime; disjoint surfaces.
- **Q-JC5** — coupling to R03 warm-start runtime: **reuse existing `residual_seed_hash` sentinel mechanism** to mark FCP-1-invalidated residuals. Stage 3b wire format must be specified explicitly so R03 runtime correctly detects FCP-1-invalidated residuals.

Q-JC6 (speculative SR/RPCA/BOCPD inclusion) — empirical-demand-driven only. If R07 PR-F8 evidence shows FCP-1 + Stage 2a leave a measurable gap, that's an operator gate (do NOT auto-disposition future-slice additions).

## Inputs for next role (load-bearing — READ ALL)

The R07 Architect MUST read these before brainstorming:

**Scoping + disposition artifacts:**
- `coordination/SCOPING-MEMO-BASELINE-CURATION-v0.2.md` — § 2 Stage 2b FCP-1 + Stage 3b integration is the binding scope for R07; § 4 R-C1/R-C2/R-C3 statistical-correctness risks; § 6 pair-review trigger summary (PR-F8 is mandatory for R07).
- `coordination/ARCHITECT-REPLY-BASELINE-CURATION-v0.2-PRE-DISPOSITION.md` — all 9 Q-JC dispositions (architect-confirmed). Q-JC4/4a/4b/4c + Q-JC5 are R07-relevant.

**R06 close-state (R07 builds on R06's Stage 2a output):**
- `coordination/specs/Q-R06-SPEC.md` + `coordination/specs/Q-R06-SPEC-AUDIT.md` — SLICE 4 spec; particularly the `tools/curate-baseline-pre-pass.ts` API (Stage 2a outputs per-shard contamination masks that FCP-1 consumes as input).
- `coordination/reviews/REVIEWER-REPORT-R06.md` — R06 Reviewer findings (MINOR-1 stale JSDoc; MINOR-2 stale header count; MINOR-3 mcdSeed unbinding; MINOR-4 p===0 early-return unbinding). R07 may close any subset of these in-passing if natural; do not force.
- `tools/curate-baseline-pre-pass.ts` (R06 GREEN) — FCP-1 will compose with this; understand its output shape.

**R03 close-state (Stage 3b uses R03's `residual_seed_hash` mechanism):**
- `coordination/specs/Q-R03-SPEC.md` — warm-start state machine spec; particularly `residual_seed_hash` semantics.
- `engine/per-shard/warm-start.ts` (R03 GREEN; untouched at R04/R05/R06) — exact runtime detection logic for cached-residual invalidation.

**Tessera scoping context:**
- `coordination/SCOPING-MEMO-v0.3.md` — § 3 Phase 1 boundary; § 9 vendoring policy.
- `coordination/PRD.md` — thin PRD.

**Discipline memorials:**
- `coordination/MEMORIAL.md` — R01–R06 entries; R06 entries include the methodology gap notice from R05 mis-targeting (Memorial Updater did not capture it — see overnight log).
- `~/.claude/CROSS-PROJECT-MEMORIAL.md` — apply every "Reinforcement rules derived" entry; particularly R09 self-confirming integration tests (relevant for PR-F8 synthetic-fleet evidence matrix); R12 brainstorm-re-evaluation reinforcement; R14 stale-SHA two-commit sequence.

**Inherited engine surface at SHA `5a72371` (file-opened-discipline mandatory):**
- `engine/detectors/family-c-betting-e-process.ts` — inherited betting-e-process implementation; Q-JC4a says FCP-1's `p_alt` mixture should mirror this pattern. Architect must open + read the implementation pattern, NOT just the type declarations.
- `engine/types/families/c.ts` — Family C type declarations; `BettingEProcessFamilyCPerCell` declaration site for understanding betting-state shape.

## PR-F8 mandatory at SLICE 5 close

Per scoping memo § 6: **PR-F8 (FCP-1 statistical-correctness on synthetic fleet substrate)** is MANDATORY for R07 close. R07 spec MUST include:
1. Evidence matrix specification: synthetic-fleet H₀ (per-shard masks independent under `p_base`) + injected-fleet-event H₁ (per-shard masks correlated under `p_alt > p_base`). FPR target ≤ α_fleet; power curves at multiple `p_alt` values.
2. Formal martingale-property verification under chosen plug-in `p_base` estimation strategy. Must demonstrate disjoint-data construction preserves the Ville bound.
3. Architect must enumerate ≥3 e-process formulations with rejection rationale (Memorial D pair-review-novel-literature discipline).

If R07 spec ships without PR-F8 evidence matrix specification, that's a Reviewer-blocker (PARTIAL or FAIL on the corresponding AC).

## Halt conditions for R07 IMPLEMENTER

- **Q-JC4b plug-in estimation:** if Implementer encounters spec ambiguity about disjoint-data construction of `p_base`, HALT — silent plug-in invalidates Ville bound. CRITICAL-class.
- **Q-JC5 wire format:** if Implementer encounters spec ambiguity about the FCP-1 → `residual_seed_hash` sentinel wire format, HALT — runtime detection fragility risk.
- **Q-JC6 speculative additions:** if Implementer encounters spec text proposing SR/RPCA/BOCPD additions, HALT — these are operator-gated; spec drafting them implies architectural-spec drift.

## Coordination chore sequence (R14 final revision — same as R06)

Per CROSS-PROJECT-MEMORIAL.md R14 reinforcement (FINAL revised version):
1. Run all binding commands at GREEN; record OBSERVED counts (NOT pre-stated).
2. Write all coordination artifacts (NEXT-ROLE.md + MEMORIAL.md append + observed counts) WITHOUT SHA field.
3. `git add` coordination artifacts.
4. `git commit -m "chore(R07): coordination artifacts"` → SHA-A.
5. Write SHA-A into NEXT-ROLE.md's Attestation block.
6. `git commit -m "chore(R07): record attestation SHA"` → SHA-B (becomes HEAD).
7. Record SHA-A. Reviewer verifies: `git diff SHA-A HEAD -- src/ tests/ tools/ engine/ coordination/specs/` is empty.

Do NOT use `--amend`. Do NOT collapse the two commits.

## Pre-R07 baseline (INFORMATIONAL; R03 MINOR-4 reinforcement — DO NOT pre-state at GREEN)

Reviewer-verified at R06 HEAD `0689681` (per ROUND-R06-SUMMARY.md):
- q06-baseline-pre-pass: 13 / 0
- q01-vendoring-coverage: 3 / 0
- q01-no-at-pin-deltas: 1 / 0
- q01-schema-additions: 5 / 0
- q02-schema-extension: 6 / 0
- q03-warm-start-runtime: 13 / 0
- q04-welford-stats: 11 / 0
- q05-per-shard-runtime: 13 / 0
- betting-e-process smoke: 5 / 0
- **Total: 70 / 0**

R07 GREEN expected: previous 9 file counts unchanged + new q07 file → recompute total at GREEN per AC. Implementer reports OBSERVED counts per file.

## Routing

```
cd ~/concord/tessera
./run-pipeline.sh --round R07 --tier full
```

`--tier full` per A1 (new architectural pattern — first Tessera sequential-e-process construction beyond inherited per-cell betting) + A7 (first-time architectural territory — first cross-shard statistical-correctness pair-review at fleet scale).

## Operator gate items (for John's return — not blocking R07)

1. **OQ-1 / Q-JC1 narrowing:** does R08+ proceed with `tools/calibrate.ts` vendoring as a dedicated round, OR does R06 Stage 3a's structural-typing compatibility suffice without ever vendoring calibrate.ts? Architect-pre-prediction: structural-typing suffices for Phase 1; calibrate.ts vendoring deferred to Phase 2 if at all.
2. **R05 methodology gap not captured by R06 Memorial Updater:** the R06 NEXT-ROLE.md explicitly directed Memorial Updater to record the R05 silent-overwrite incident as a methodology-class entry (cross-role → CLAUDE-COMMON.md). R06 Memorial Updater focused on R06's own discipline. Worth a small follow-up: either re-run Memorial Updater with explicit directive, OR manually add the CLAUDE-COMMON.md reinforcement.
3. **Anchor PR #37 (preflight preserve operator-prepared NEXT-ROLE.md):** still open. Once merged, tessera's `run-pipeline.sh` can be forward-synced via `anchor-update-project.sh` and the manual `CURRENT-ROUND: <round>` preparation trick becomes unnecessary.
4. **Anchor PR #35 (MD-F6 + verify-citations.sh):** still open. Once merged, audit-sidecar template follow-up PR becomes possible per memo § 7 of PR #36 description.

## Update history

| Date | Event |
|---|---|
| 2026-05-16 | R01–R06 cycles complete (substrate sound; per-shard runtime + Welford composition + baseline curation toolchain + Stage 2a screening). |
| 2026-05-16 | Anchor PR #36 merged (per-role CLAUDE.md split). |
| 2026-05-16 | Anchor PR #37 opened (preflight preserve operator-prepared NEXT-ROLE.md) — pending John. |
| 2026-05-16 | Operator-authorized overnight autonomous mode (see OVERNIGHT-LOG-2026-05-16.md). R07 launched within scope. |
