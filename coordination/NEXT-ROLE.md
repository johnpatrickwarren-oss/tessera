CURRENT-ROUND: R10
NEXT-ROLE: REVIEWER
STATUS: READY

## Implementer → Reviewer routing (R10)

**Attestation SHA:** (written after coordination chore commit)

**Test results (OBSERVED — per R03 MINOR-4 reinforcement):**

q10-per-shard-emission (new):
  node --test test/q10-per-shard-emission.test.js → pass 11 / fail 0

Pre-R10 baseline (10 files, all unchanged):
  q01-vendoring-coverage: 3/0
  q01-no-at-pin-deltas: 1/0
  q01-schema-additions: 5/0
  q02-schema-extension: 6/0
  q03-warm-start-runtime: 13/0
  q04-welford-stats: 11/0
  q05-per-shard-runtime: 13/0
  q06-baseline-pre-pass: 13/0
  q07-fleet-correlated: 23/0
  betting-e-process smoke: 5/0
  Total: 93/0 (unchanged from R09 baseline)

Grand total at GREEN: 104/0 (93 + 11)

npm run typecheck: exit 0 (both RED and GREEN states confirmed)

**RED commit:** f8243e9 — adds test/q10-per-shard-emission.test.ts only; tsc exits 1 with TS2305 (no exported member projectTierGatedOutputs).
**GREEN commit:** fdaf0cb — modifies engine/per-shard/runtime.ts (Delta 2a/2b/2c) + engine/types/config.ts (Delta 1 JSDoc).

**TDD discipline applied:** RED commit created and verified (tsc TS2305 confirmed) before GREEN implementation. Two-commit sequence per spec Implementer note 4 + AC-15.

**AC-17 grep evidence (OBSERVED):**
  grep -c "export function projectTierGatedOutputs" engine/per-shard/runtime.ts → 1
  grep -c "welfordMean" engine/per-shard/runtime.ts → 3 (import + 2 JSDoc references + callsite; ≥ 2 ✓)
  grep -c "welfordCovariance" engine/per-shard/runtime.ts → 5 (import + JSDoc + callsites; ≥ 2 ✓)

**AC-19 grep evidence (OBSERVED):**
  grep -c "R10 (SLICE 2b4) emission contract" engine/types/config.ts → 1 ✓
  grep -c "projectTierGatedOutputs" engine/types/config.ts → 1 ✓
  grep -c "Full runtime population semantics deferred to SLICE 2b" engine/types/config.ts → 0 ✓ (old text removed)

**Halts:** None. No diagnostic files written. All spec/reality matches were tactical (no architectural decisions required).

**Anti-scope fences honored:** welford.ts unchanged (R10-SAS-2), warm-start.ts unchanged (R10-SAS-3), mean_delta untouched (R10-SAS-4/5), no new files under engine/per-shard/ (R10-SAS-9), no schema type changes (R10-SAS-1).

## Architect → Implementer routing (R10)

**Spec:** `coordination/specs/Q-R10-SPEC.md` (full; read in full before any code).
**Audit sidecar:** `coordination/specs/Q-R10-SPEC-AUDIT.md` (brainstorm rationale, decision rationale, pre-route discipline application, architect pre-predictions, R05 OQ-2 brainstorm re-evaluation, Q-R10 → Q-R11 sequencing). Implementer reads only the spec proper for the implementation; sidecar is for Memorial Updater + Reviewer reference.

**Pre-R10 baseline (Architect-empirically-verified at HEAD `640c8e8` AND re-verified at HEAD `4869f65` at R10 spec-emit time via `node --test`):**
- q01-vendoring-coverage: 3/0
- q01-no-at-pin-deltas: 1/0
- q01-schema-additions: 5/0
- q02-schema-extension: 6/0
- q03-warm-start-runtime: 13/0
- q04-welford-stats: 11/0
- q05-per-shard-runtime: 13/0
- q06-baseline-pre-pass: 13/0
- q07-fleet-correlated: 23/0
- betting-e-process smoke: 5/0
- **Total: 93/0**

Architect verified `npm run typecheck` exit 0 at HEAD `4869f65` at spec-emit time.

**R10 expected at GREEN:** prior 10 file counts unchanged + new q10 file at 11/0 (structurally pre-determined per spec AC-14). Total: 104/0.

**Implementer action sequence:**
1. Read `coordination/specs/Q-R10-SPEC.md` in full.
2. RED commit: create `test/q10-per-shard-emission.test.ts` per spec § Per-file pseudocode Delta 3. Verify `npm run typecheck` fails at TS2305 (no exported member `projectTierGatedOutputs`) per Implementer note 4.
3. GREEN commit: apply Delta 1 (config.ts JSDoc) + Delta 2 (runtime.ts emission helper + integration) per spec § Per-file pseudocode. Verify `npm run typecheck` exit 0 AND `node --test test/q10-per-shard-emission.test.js` pass 11 / fail 0.
4. Re-run all 10 pre-R10 test files; verify counts unchanged (AC-13). Report OBSERVED counts (NOT pre-stated) per R03 MINOR-4 reinforcement.
5. Coordination chore sequence per R14 (below).

**HALT discipline (R08 MAJOR-1 reinforcement, active):** Any spec premise that fails empirically requires DIAGNOSTIC + HALT, regardless of resolution clarity. The "resolution is obvious" exception is NOT in play — always write DIAGNOSTIC first.

**Attestation accuracy (R03 + R05 MINOR-3 reinforcements, active):** Report OBSERVED test counts; never claim a tactical choice (e.g., import form) that diverges from the committed code.

## Round scope — operator-set (do NOT auto-redirect)

**R10 = Phase 1 SLICE 2b4: warm-start emission at strict tier + sparse-encoding-convention enforcement.**

Returns to the SLICE 2b runtime series (R03/R04/R05/R08-amended) after the SLICE 4/5 baseline-curation arc (R06/R07/R08-amendment/R09). Two specific deferrals close in this round:

1. **R05 anti-scope deferral:** `mean_vector` / `covariance` emission at strict tier. R05 spec § Anti-scope explicitly fenced these off (deferred to "R06+"; we redirected to baseline curation instead). The R05 close-state landed the Welford composition (`engine/per-shard/runtime.ts` `updatePerShardResidual`) with `welford_state?: WelfordState` on `PerShardResidual` but did NOT extract `mean_vector` / `covariance` from the accumulator into the output residual at strict-tier transitions.

2. **R02 MINOR-2 carry-forward:** sparse-encoding-convention enforcement. The R02 sparse-encoding convention partitions per-shard output fields by confidence tier: `mean_vector` + `covariance` present at strict; `mean_delta` present at warm_start; nothing at none/pooled/aggregate. Currently the convention is documented in JSDoc but not type-enforced or runtime-asserted; R02 MINOR-2 has been carry-forward since R02.

R10 SHIPS:
- Strict-tier emission logic: when `welford_state.n_samples >= STRICT_UPGRADE_THRESHOLD` AND tier transitions to `'strict'`, compute `mean_vector` from `welfordMean(welford_state)` and `covariance` from `welfordCovariance(welford_state)`; populate both fields on the returned PerShardResidual.
- Sparse-encoding inverse-convention enforcement: at non-strict tiers, `mean_vector` and `covariance` MUST be `undefined` (or absent). Tests bind the inverse at all 4 non-strict tiers.
- New ACs covering: positive presence at strict; negative absence at warm_start / none / pooled / aggregate; mean_vector dimensionality matches sample dimensionality; covariance is symmetric PSD of dimensionality d×d.

R10 does NOT ship (explicit anti-scope):
- `mean_delta` computation (still deferred — requires BaselineCellEntry injection per R05's anti-scope; separate architectural concern).
- Compiled-artifact JSON loader (R11+ candidate).
- PR-F5 empirical storage profile measurement.
- Any baseline-curation work (SLICE 4/5 closed; R11+ if additional curation surfaces).
- Any modification to `tools/curate-baseline-pre-pass.ts` or `tools/curate-baseline-fleet-correlated.ts` (R06/R07/R08-amendment closed surfaces).

## Architectural pre-dispositions (preserved across rounds; load-bearing for R10)

Per `coordination/ARCHITECT-REPLY-v0.3-PRE-DISPOSITION.md` (Q-J1..Q-J5):
- Q-J1 hybrid Ville + e-BH — preserved
- Q-J2 20-sample warm-start / 60-sample strict-upgrade — preserved; R10 emission triggers at strict transition (`n_samples >= 60`)
- Q-J3 cascade at every layer — preserved
- Q-J4, Q-J5 — preserved

Per `coordination/ARCHITECT-REPLY-BASELINE-CURATION-v0.2-PRE-DISPOSITION.md` (Q-JC1..Q-JC6 + Q-JC4a/b/c): irrelevant to R10 (baseline curation surfaces closed; R10 is per-shard runtime).

## Active REINFORCED lines architect MUST apply (12 in ARCHITECT, 13 in IMPLEMENTER, 1 in COMMON)

R10 Architect must specifically apply (these have all triggered in recent rounds):
- **Cross-section consistency pass** (R02; standing) — every resolved decision token must appear consistently across sections.
- **Type-declaration-site discipline** (R02) — open the file where each external type is DECLARED, not just used. `WelfordState` declared at `engine/per-shard/welford.ts`; `PerShardResidual` declared at `engine/types/config.ts` (the schema-extension surface from R02/R03); confidence tier union declared at `engine/types/config.ts`.
- **Re-export-chain check** (R03) — verify whether each import is direct vs re-exported.
- **Inherited-testimony empirical verification** (R08) — for any factual claim about prior-round behavior, run the relevant command/fixture and document OBSERVED output. Specifically: claims about R03/R04/R05 behavior (warm-start transitions; Welford accumulator state; composition function output) must be empirically verified, not inherited from prior spec text.
- **Correction-propagation pass** (R09) — if R10 corrects any prior-round spec premise, enumerate all sibling/downstream sections in the affected spec.
- **OBSERVED-binding scope** (R07) — must NOT be used unless deviation is PRNG-drift-class. Test bindings should be theory-derived where possible.
- **Fixture-sizing exhaustive propagation** (R07) — when grilling catches a sizing issue for one AC, check sibling ACs with similar patterns.
- **Component-inventory AC-range arithmetic cross-check** (R06) — narrative vs pseudocode count must match.

Implementer must specifically apply:
- **Procedural halt-discipline** (R08) — spec premise failures require DIAGNOSTIC regardless of resolution clarity.
- **Attestation-accuracy** (R03) — OBSERVED, not predicted.
- **MEMORIAL tactical-choice verification** (R05) — narrative claims about committed code must be verified against the file.

## Inputs for next role (load-bearing — READ ALL)

The R10 Architect MUST read:

**Round scope:**
- This `coordination/NEXT-ROLE.md` (you're reading it).

**SLICE 2b series prior-round artifacts (the runtime stack R10 extends):**
- `coordination/specs/Q-R02-SPEC.md` — schema extensions including `PerShardResidual` shape and sparse-encoding convention (MINOR-2 origin).
- `coordination/specs/Q-R03-SPEC.md` + `Q-R03-SPEC-AUDIT.md` — warm-start state machine; `residual_seed_hash` semantics.
- `coordination/specs/Q-R04-SPEC.md` + `Q-R04-SPEC-AUDIT.md` — Welford pure-function module.
- `coordination/specs/Q-R05-SPEC.md` + `Q-R05-SPEC-AUDIT.md` — Welford-into-PerShardResidual composition; explicitly defers emission to "R06+".
- `coordination/reviews/REVIEWER-REPORT-R02.md` (MINOR-2 carry-forward context).
- `coordination/reviews/REVIEWER-REPORT-R05.md` (watch list items 1-3; OBS-1/2/3).

**Production code (the surface R10 modifies):**
- `engine/per-shard/runtime.ts` (R05 GREEN — composition function; R10 extends).
- `engine/per-shard/welford.ts` (R04 GREEN — `welfordMean`, `welfordCovariance`; R10 consumes).
- `engine/per-shard/warm-start.ts` (R03 GREEN — state machine; R10 may extend or compose).
- `engine/types/config.ts` (R02 schema extensions for `PerShardResidual`; R10 may add to inline JSDoc enforcement).

**Discipline memorials:**
- `coordination/MEMORIAL.md` — R01–R09 entries.
- `~/.claude/CROSS-PROJECT-MEMORIAL.md` — apply every "Reinforcement rules derived" entry.

**Tessera scoping context:**
- `coordination/SCOPING-MEMO-v0.3.md` — § 3 Phase 1 boundary.
- `coordination/PRD.md` — AC-P2 (warm-start cell_confidence + strict-upgrade preserves inherited single-instance behavior) is the load-bearing trace.

**Inherited engine surface at SHA `5a72371` (file-opened-discipline mandatory):**
- `engine/types/families/c.ts` — Family C `FamilyCPerCell.mean_vector` + `covariance` declaration; matches what R10 emits at strict tier.
- `engine/types/config.ts` — `BaselineCellEntry.confidence` union (5 values including R02-added `'warm_start'`).

## Halt conditions for R10

- **Q-JC re-disposition:** if architectural brainstorm surfaces a Q-J or Q-JC re-disposition need, HALT — operator gate.
- **Scope drift to compiled-artifact loader or mean_delta:** R10 is bounded to emission + sparse-encoding enforcement. Either pull is a HALT + scope question.
- **Inherited testimony about R03/R04/R05 behavior:** verify empirically before writing into spec; silent inheritance is an R08 MAJOR-2-class violation.
- **New OBSERVED-binding without "would future FIX matching prediction FAIL?" check:** R07 MAJOR-2 reinforcement.

## Coordination chore sequence (R14 final revision; same as R06–R09)

Per CROSS-PROJECT-MEMORIAL.md R14 reinforcement:
1. Run all binding commands at GREEN; record OBSERVED counts (NOT pre-stated).
2. Write all coordination artifacts WITHOUT SHA field.
3. `git add` coordination artifacts.
4. `git commit -m "chore(R10): coordination artifacts"` → SHA-A.
5. Write SHA-A into NEXT-ROLE.md's Attestation block.
6. `git commit -m "chore(R10): record attestation SHA"` → SHA-B.
7. Reviewer verifies: `git diff SHA-A HEAD -- src/ tests/ tools/ engine/ coordination/specs/` is empty.

## Pre-R10 baseline (INFORMATIONAL; report OBSERVED at GREEN per R03 MINOR-4)

Reviewer-verified at R09 HEAD `640c8e8`:
- q07-fleet-correlated: 23/0
- q06-baseline-pre-pass: 13/0
- q01-vendoring-coverage: 3/0
- q01-no-at-pin-deltas: 1/0
- q01-schema-additions: 5/0
- q02-schema-extension: 6/0
- q03-warm-start-runtime: 13/0
- q04-welford-stats: 11/0
- q05-per-shard-runtime: 13/0
- betting-e-process smoke: 5/0
- **Total: 93/0**

R10 expected at GREEN: prior 10 file counts unchanged + new q10 file (likely +6 to +10 ACs covering strict-tier emission + sparse-encoding inverse-convention). Implementer reports OBSERVED per file.

## Routing

```
cd ~/concord/tessera
./run-pipeline.sh --round R10 --tier full
```

`--tier full` per A3 (resolving deferred open questions from R02 + R05) + A2 (new architectural pattern — first runtime-emission surface at strict-tier transitions). Tier rubric does not justify a downshift.

## Methodology improvements landed since R09

**Anchor PRs #34 + #35 + #37 merged at canonical anchor 2026-05-17.** Tessera's `run-pipeline.sh` forward-synced from canonical at commit `7551da5` (PR #37 preflight state-machine: refuse-to-overwrite operator-prepared NEXT-ROLE.md by default; new `--reset-next-role` opt-in).

Implication for R10 onward: the manual `CURRENT-ROUND: <round>` preparation trick we've used since the R05 silent-overwrite incident is no longer strictly required — but still recommended (it's how the file ends up matching CURRENT-ROUND on launch; the new preflight just refuses to overwrite if mismatch instead of clobbering). Pattern unchanged in practice.

PR #35 (MD-F6 + verify-citations.sh) unblocks the audit-sidecar template follow-up PR; deferred to the R10-batch anchor contribution per the new every-5-rounds cadence.

## Operator gate items preserved (NOT in R10 scope)

- OQ-1 / Q-JC1 `tools/calibrate.ts` vendoring decision
- OQ-R08-3 Phase 2 transient detector scheduling
- R09 MINOR-3 NEXT-ROLE.md attestation table format question
- R10-batch anchor PR (cadence reminder fires at R10 close)

## Update history

| Date | Event |
|---|---|
| 2026-05-16 | R09 cleanup closed; R09 followup direct-fix landed; baseline curation arc complete. |
| 2026-05-17 | Anchor PRs #34/#35/#37 merged; tessera forward-synced run-pipeline.sh. |
| 2026-05-17 | R10 launched: return to SLICE 2b series; close R05 emission deferral + R02 MINOR-2. |
