# Phase 2 SLICE 1 Close Walk — Tessera

_2026-05-17. HEAD at R18 MERGE-READY: `9012faa`. Phase 2 SLICE 1 closes at R18 (1 round); delivered in the same overnight session as Phase 1 close walk (R15). **HARD STOP after R19 per evening-overnight chain authority.**_

---

## Header

- **Date:** 2026-05-17
- **HEAD at SLICE 1 close:** `9012faa` (R18 chore: route to REVIEWER after Option A unblock)
- **Scope reference:** `coordination/SCOPING-MEMO-v0.3.md` § 2.3 Phase 2 SLICE 1 row
- **Round:** R18 (1 round for Phase 2 SLICE 1 substantive work)
- **Anti-scope reference:** `coordination/NEXT-ROLE.md` lines 39-45 R18 anti-scope

---

## § 1 Scope summary — R18 deliverables

**Context.** Phase 2 SLICE 1 per `SCOPING-MEMO-v0.3.md` § 2.3 delivers the type-layer substrate for Phase 2 cross-shard correlation: `TopologyNode.kind` enum extension, `TopologyEdge.relationship` enum extension, `VerdictGroup cluster_event_id?` scope-extension field, and a synthetic-cluster v9X-class fixture. No `HardwareTopologySource` concrete impl yet; no deployment-event-feed ingestion yet.

**R18 deltas applied to `engine/types/verdict.ts`:**

1. **Delta 1 — `TopologyNode.kind` union extension**: Added `'gpu_shard' | 'rack'` to the inherited `'service' | 'database' | 'queue' | 'external'` union. Architect-pre-prediction Q-J4(i): single-rack uniform topology for SLICE 1. Binding: `engine/types/verdict.ts:236`; typecheck-bound (AC-R18-11).

2. **Delta 2 — `TopologyEdge.relationship` union extension**: Added `'contains'` to the inherited `'calls' | 'reads' | 'writes' | 'publishes'` union. Represents hierarchical containment (rack contains gpu_shard). Binding: `engine/types/verdict.ts:246`; typecheck-bound.

3. **Delta 3 — `VerdictGroup cluster_event_id?` field**: Added optional `cluster_event_id?: string` field to `VerdictGroup`, positioned before the `closed:` field per spec § 2.1 ordering. Enables scope re-architecture from `(deploy_id, window_start_ts)` to `(cluster_event_id, window_start_ts)` at Phase 2 SLICE 2. Inherited Addition #25 D5 `group_id` format preserved (verified: AC-R18-7 greps `engine/verdict-groups.ts` for template-literal pattern). Inherited Addition #26 D4 `correlational_not_causal: true` wire-format preserved (verified: AC-R18-8 greps `engine/types/verdict.ts`). Binding: `engine/types/verdict.ts:201-209`.

4. **Delta 4 — Header annotation**: Added `// [R18 Tessera amendments: ...]` annotation block to the verdict.ts vendoring header (lines 6+) per SCOPING-MEMO-v0.3.md § 9.4 vendoring-with-deltas policy. This prompted the ESCALATE event (§ 2 below).

**v9X fixture**: `test/_substrate/v9X-cluster.ts` created, exporting `makeV9XSingleRackCluster({ nShards? })`. Default: 1 rack + 10 gpu_shards + 10 `'contains'` edges with canonical `source_id: 'v9X_synthetic_single_rack'` and `source_version: '1.0.0'`. Q-J4(i) single-rack topology confirmed.

**Reviewer verification:** 12/12 ACs PASS per `coordination/reviews/REVIEWER-REPORT-R18.md` §1. `npx tsc --noEmit` exit 0; `node --test test/*.test.js` = 181/0 (Reviewer-independently-verified).

---

## § 2 ESCALATE-and-unblock pattern documentation

### What happened at R18

Deltas 1-4 were applied to `engine/types/verdict.ts`. Running `node --test test/*.test.js` produced 180 pass / 1 fail: `test/q01-no-at-pin-deltas.test.js` failed because it checks byte-identity of `engine/types/verdict.ts` against `../deploysignal/engine/types/verdict.ts` modulo the 6-line header. The R18 Deltas 1-3 modify the interface body beyond the header; Delta 4's amendment annotation appends below line 5, thus also within the comparison window.

The spec's failure-mode analysis (Q-R18-SPEC.md § 1 failure mode 5) had correctly identified `q01-vendoring-coverage` (first-line SHA-pin check) as a risk but missed `q01-no-at-pin-deltas` (body byte-identity check) as a second, distinct assertion surface on the same file.

Anti-scope explicitly prohibited modifying prior-round test files. AC-R18-12 triggered HALT when observed total differed from 181. DIAGNOSTIC-R18-no-at-pin-deltas-verdict.md was written; NEXT-ROLE.md set to STATUS: ESCALATE with bounded question.

Operator dispositioned **Option A**: approve targeted exception — update `q01-no-at-pin-deltas.test.js` AT_PIN_FILES list to remove `engine/types/verdict.ts` and update `coordination/VENDORING-MANIFEST.md` row status from `vendored-at-pin` to `vendored-with-deltas`. Applied at commit `5aa8cf0`. Final state: 181/0, all 12 ACs PASS.

### The vendored-at-pin → vendored-with-deltas pattern

This was the **second application** of the vendored-with-deltas transition. The first application was at R01 for `engine/types/config.ts` (Tessera schema additions). Both cases share the same structure:

**When any vendored file receives Tessera-specific additive deltas, two maintenance steps are required:**

1. **`coordination/VENDORING-MANIFEST.md`**: Change the row's status column from `vendored-at-pin` to `vendored-with-deltas` and add a note column summarizing the delta (e.g., "R18 Tessera Phase 2 SLICE 1 type extensions").
2. **`test/q01-no-at-pin-deltas.test.js` AT_PIN_FILES list**: Remove the file path from the list. Files in this list are asserted byte-identical (modulo the 6-line header) against the DeploySignal source; files with Tessera deltas must be removed or they will produce a false failure.

**Two precedent applications:**

| File | Round | Delta type | Manifest status | AT_PIN_FILES |
|---|---|---|---|---|
| `engine/types/config.ts` | R01 | Tessera schema additions (PerShardResidual, PerShardCell, etc.) | `vendored-with-deltas` | Removed |
| `engine/types/verdict.ts` | R18 | Phase 2 type extensions (kind/relationship/cluster_event_id) | `vendored-with-deltas` | Removed |

### Implication for future Phase 2 SLICEs

Future SLICEs that touch vendored files should **pre-handle** this pattern: the Architect spec should explicitly identify any vendored file receiving Tessera-specific deltas and include the manifest + AT_PIN_FILES maintenance steps in the component inventory. The R18 spec under-anticipated this; the ESCALATE mechanism absorbed the gap correctly, but the two-step pattern is now documented here for upfront application. Anti-scope explicitly permitting manifest + test maintenance is the recommended approach (avoids a halt condition on what is otherwise routine bookkeeping).

See `REVIEWER-REPORT-R18.md` OBS-2 (spec failure-mode analysis missed `q01-no-at-pin-deltas`) and MEMORIAL-UPDATER R18 entry for the new REINFORCED line appended to `CLAUDE-ARCHITECT.md`.

---

## § 3 Phase 2 SLICE 2 entry framing

### SLICE 2 scope per SCOPING-MEMO-v0.3.md § 2.3

SLICE 2 delivers the outer aggregator extending the vendored L3b `VerdictGroup` aggregator with `cluster_event_id` scope, the fleet-merge consumption layer, and the per-shard verdict aggregation contract with `cluster_event_id` propagation. Per the SCOPING-MEMO, **VerdictGroup scope re-architecture cost dominates this slice** (2-3 Q-cycle estimate).

The inherited `VerdictGroup` is scoped `(deploy_id, window_start_ts)` per `engine/types/verdict.ts:158` at SHA `5a72371`. Tessera needs `(cluster_event_id, window_start_ts)` where a `cluster_event_id` may span multiple `deploy_id`s. The scope re-architecture touches:
- Group_id format (inherited `group-{deploy_id}-{window_start_ts}` per `engine/verdict-groups.ts`; candidate `group-{cluster_event_id}-{window_start_ts}`)
- VerdictGroup factory at `engine/verdict-groups.ts` (already visited in SLICE 1 per Addition #25 D5 preservation check; factory unchanged at R18)
- Aggregation contract definition: what key drives accumulation of per-shard FusedVerdicts into a group?

SLICE 1 established the `cluster_event_id?` optional field on `VerdictGroup`. SLICE 2 makes it load-bearing.

### Operator-gate items and their SLICE 2 relationship

**OQ-1 / Q-JC1 — `tools/calibrate.ts` vendoring (still parked)**  
SLICE 2 does not strictly need `calibrate.ts`. Outer-aggregator development (scope re-architecture + fleet-merge consumption) is independent of the baseline calibration tooling. This item remains parked per its Phase 1 PHASE-1-CLOSE-WALK.md § 6 framing; the OQ-1 disposition (vendor before Phase 2 vs defer to Phase 2 vs defer later) is still an operator gate.

**OQ-R08-3 — Phase 2 transient detector scheduling (still parked)**  
The transient-detector scope is orthogonal to SLICE 2. SLICE 2 is entirely about the outer aggregator's scope re-architecture; transient detection is a separate detector type that could layer on top of or alongside the SLICE 2 aggregation contract. Whether it schedules at SLICE 2, SLICE 3, or SLICE 4 remains an operator-gate decision. Neither early nor late scheduling blocks SLICE 2 entry.

**SLICE 2 entry readiness (as of R19):** SLICE 1 substrate is GREEN and MERGE-READY. The `VerdictGroup.cluster_event_id?` field exists. The v9X fixture exists. The `engine/types/verdict.ts` kind/relationship unions are extended. SLICE 2 can be specced by an Architect using these as inputs. Full-tier (A4 novel-data-model pattern for scope re-architecture + A6 blast-radius on verdict-groups.ts consumers) is the expected tier.

---

## § 4 R18 MINORs disposition

All 4 R18 MINORs per `coordination/reviews/REVIEWER-REPORT-R18.md` § 2:

### MINOR-1 — AC-R18-10 allowed-set expanded 10→15 without spec amendment

**Disposition: closed-in-passing (R19)**  
A `## Amendments (post-Reviewer)` block has been appended to `coordination/specs/Q-R18-SPEC.md` documenting the operator Option A disposition, the 5 added allowed-set entries, and the commit `5aa8cf0` where the unblock was applied. This provides the spec-side paper trail the Reviewer identified as missing. The test itself is correct; the amendment is bookkeeping only.

### MINOR-2 — Per-file OBSERVED test counts missing from Implementer attestation

**Disposition: closed-by-Reviewer-verification**  
The R18 NEXT-ROLE.md omitted the per-file enumeration required by the R03 MINOR-4 reinforcement. The R18 Reviewer independently ran per-file counts and verified all 19 files, confirming 171 pre-R18 + 10 q18 = 181 total. The Reviewer's independent verification satisfies the R03 MINOR-4 obligation for this round; no retrospective edit to the historical NEXT-ROLE.md is needed.  
**Carry-forward:** R19 NEXT-ROLE.md includes per-file OBSERVED counts per standing obligation.

### MINOR-3 — NEXT-ROLE.md aggregate decomposition mathematically wrong

**Disposition: closed-by-Reviewer-correction**  
NEXT-ROLE.md:33 claimed "168/0 pre-R18; +13 from q18 12 ACs." Correct values per Reviewer cold-run: 171 pre-R18 + 10 from q18 = 181. The Reviewer recorded the correct decomposition in REVIEWER-REPORT-R18.md § 2 MINOR-3. No code or test is affected; the total (181) was correct. Historical NEXT-ROLE.md not edited.  
**Root cause:** Attestation narrative written from memory rather than from empirically-observed per-file output. Pattern matches R03 MINOR-4 reinforcement class; the per-file enumeration discipline (not just total) is precisely what catches this.

### MINOR-4 — Implementer MEMORIAL section lacks CONFIRMATION entries

**Disposition: deferred to Memorial-Updater (R19)**  
The R18 Implementer MEMORIAL section contained 1 VIOLATION and 0 CONFIRMATION entries. The R18 MEMORIAL-UPDATER reconstructed the missing CONFIRMATION entries from commit history (per MEMORIAL.md § R18 MEMORIAL-UPDATER section). The backfill is complete. No action for the R19 Implementer; the Memorial-Updater handled the gap in its role.

---

## § 5 Memorial state stamp — REINFORCED counts at Phase 2 SLICE 1 close

Empirically verified via `grep -c "^# REINFORCED"` on each CLAUDE file at R19 HEAD:

| File | REINFORCED count | Change from Phase 1 close |
|---|---|---|
| `CLAUDE-COMMON.md` | 1 | +0 (unchanged since Phase 1 close) |
| `CLAUDE-ARCHITECT.md` | 18 | +3 (R15: anti-scope-baseline-accuracy; R17/R18: REINFORCED additions) |
| `CLAUDE-IMPLEMENTER.md` | 26 | +10 (R15/R16/R17/R18 accumulated — see MEMORIAL.md per-round IMPLEMENTER VIOLATION entries) |
| `CLAUDE-REVIEWER.md` | 1 | +1 (R16 Reviewer MEMORIAL.md violation-entry obligation reinforced) |
| `CLAUDE-MEMORIAL.md` | 0 | unchanged |
| **Total** | **46** | **+14 from Phase 1 close (32 → 46)** |

**R18 delta specifically** (+1 ARCH + 3 IMPL per MEMORIAL-UPDATER R18 entry at MEMORIAL.md lines 1748-1752):
- ARCH +1: Architect failure-mode analysis missed `q01-no-at-pin-deltas` as a consumer of `engine/types/verdict.ts` (OBS-2 in REVIEWER-REPORT-R18.md). New REINFORCED appended to `CLAUDE-ARCHITECT.md`.
- IMPL +3: MINOR-1 (allowed-set expansion without spec amendment), MINOR-2 (per-file count enumeration obligation), MINOR-3 (aggregate decomposition accuracy). Three new REINFORCED lines appended to `CLAUDE-IMPLEMENTER.md`.

For the full phase-by-phase violation/confirmation tally and Memorial-D state see `coordination/MEMORIAL.md` (per-round accretion) and `coordination/PHASE-1-CLOSE-WALK.md` § 3 (Phase 1 close Memorial-D state stamp).

---

## § 6 Cross-references

- **Spec:** `coordination/specs/Q-R18-SPEC.md` (722 lines; Architect + SPEC-AUDIT sidecar at `coordination/specs/Q-R18-SPEC-AUDIT.md`)
- **Reviewer report:** `coordination/reviews/REVIEWER-REPORT-R18.md` (225 lines; 12/12 PASS, 0 CRITICAL, 0 MAJOR, 4 MINOR, 5 OBS)
- **SCOPING-MEMO scope reference:** `coordination/SCOPING-MEMO-v0.3.md` § 2.3 Phase 2 SLICE 1 row; § 2.2 VerdictGroup scope re-architecture; § 9.4 vendoring-with-deltas policy
- **R18 commit chain:**
  - `c9827a9` — RED: q18 test placeholders (TDD RED commit; no production code changes)
  - `dd21cb5` — GREEN + ESCALATE: Deltas 1-4 applied; DIAGNOSTIC written; STATUS: ESCALATE
  - `5aa8cf0` — Option A unblock: q01 AT_PIN_FILES update + VENDORING-MANIFEST.md row update
  - `9012faa` — Chore: route to Reviewer (MERGE-READY HEAD)
  - `4564bf0` — Memorial-Updater outputs (R19 close-walk prep)
- **Phase 1 close reference:** `coordination/PHASE-1-CLOSE-WALK.md` (14-round Phase 1 retrospective; Memorial-D stamp; outstanding-gaps triage queue)
- **Active outstanding items (preserved from Phase 1 close walk):**
  - OQ-1 / Q-JC1: calibrate.ts vendoring — still parked
  - OQ-R08-3: Phase 2 transient detector scheduling — still parked
  - Anchor PR #38 — LOW priority; still open
  - R09 MINOR-3, R11 MINOR-1, R12 OQ-2/3, R13 MINOR — non-load-bearing; deferrable

---

_Phase 2 SLICE 1 closed. HARD STOP per evening-overnight authority. Operator reads this document for Phase 2 SLICE 2 entry assessment before launching R20+._
