# Q-R21-SPEC-AUDIT — Architect ceremony sidecar (R21)

_This file carries the Architect-ceremony content that the Implementer does NOT need to read. The Reviewer reads § 1 (Inputs consulted) and § 2 (Citation accuracy) only for cold-review cold-start verification; full audit detail is for Memorial Updater + posterity. Sidecar separation per CLAUDE-ARCHITECT.md spec-vs-audit split._

---

## 1. Inputs consulted (cold-start, pre-spec)

| Artifact | Mode | Notes |
|---|---|---|
| `coordination/PRD.md` | Full read | FR-E3a, US-01, AC-P4 (the Phase 2 cross-shard correlation triple); ~92 lines |
| `coordination/SCOPING-MEMO-v0.3.md` | Targeted reads (grep + § 2.3 lines 204-260, § 9 lines 545-620) | § 2.3 Phase 2 Extension 3 framing (outer-aggregator extension; cluster_event_id scope re-architecture; § 9 vendoring policy); too large for full read (~600+ lines) |
| `coordination/NEXT-ROLE.md` | Full read | R21 routing block + scope directive + anti-scope + architectural questions (6) + watch items from R20 close |
| `coordination/MEMORIAL.md` | Targeted offset reads (lines 1700-1900) | R18+R19+R20 ceremony entries; recent VIOLATION patterns; self-exoneration RECLASSIFICATION precedents; too large for full read (~1900+ lines) |
| `~/.claude/CROSS-PROJECT-MEMORIAL.md` | Targeted greps + offset reads (lines 2770-2870) | Tessera R18+R19+R20 reinforcement rules derived sections; pre-emit-grilling recent-pattern reinforcements |
| `coordination/PHASE-2-SLICE-1-CLOSE-WALK.md` | Full read | § 2 ESCALATE-and-unblock pattern + vendored-with-deltas two-step + anti-scope diff-range SHA anchoring (TQ-4 γ); § 3 SLICE 2 entry framing |
| `coordination/specs/Q-R20-SPEC.md` | Partial read (lines 1-400) | R20 brainstorm + mechanism § 2.1-2.9 — confirms R20 ingest opts shape, keying transition, group_id format, late-arrival semantics. Spec is large (~750 lines); read the load-bearing first 400 lines for R21's contract dependency |
| `coordination/reviews/REVIEWER-REPORT-R20.md` | Full read | R20 outcomes (15/15 ACs PASS; 0 CRIT/0 MAJOR/3 MINOR/3 OBS); watch items for R21 |
| `engine/verdict-groups.ts` | Full read | Post-R20 VerdictGrouper class — verified `ingest(verdict, ts, opts: {terminal?, cluster_event_id?})` signature at lines 86-90; `IngestResult` exported at line 54; `openGroupForDeploy(deploy_id, cluster_event_id?)` public method at line 150 |
| `engine/types/verdict.ts` | Full read (already in context from § 9.7) | FusedVerdict shape (lines 112-126; `deploy_ref` field at line 125); VerdictGroup shape (lines 180-213; `cluster_event_id?: string` at line 209; `deploy_id` field at line 182) |
| `engine/fleet/combine.ts` | Full read | R11 PoE/AoE primitives + freshFleetEProcessState + updateFleetEProcessState; verified file header lines 33-34 "Tessera-original code (NOT vendored from DeploySignal)" |
| `engine/fleet/detectors.ts` | Full read | R12 fleetMergeFamilyA/C wrappers; verified file header lines 39-40 "Tessera-original code" |
| `engine/fleet/e-bh.ts` | Full read | R13 eBenjaminiHochberg; verified file header lines 56-57 "Tessera-original code" |
| `engine/types/fleet.ts` | Full read | FleetEProcessState shape — confirms log-space wealth process state mirrors inherited per-shard family A/C conventions; Tessera-original |
| `engine/types/orchestration.ts` | Partial read (lines 1-80) | Looked for VerdictGrouper consumer surface in inherited engine layer; confirmed inherited OrchestrateParams does not reference VerdictGrouper directly (R21's verdict-consumer.ts is the first Tessera consumer) |
| `test/q01-no-at-pin-deltas.test.ts` | Full read | AT_PIN_FILES enumeration (36 entries); confirmed `engine/fleet/` paths absent; new R21 module's Tessera-original status preserves AT_PIN_FILES integrity (no R21 maintenance needed) |
| `test/q11-hierarchical-e-value-combination.test.ts` | Targeted grep (imports + top-of-file structure) | Confirmed q11 uses inline FusedVerdict-free fixtures (wealth state literals); does NOT import VerdictGrouper or verdict-consumer.ts; R21 introduces no q11 consumer impact |
| `test/q12-fleet-merged-detector-surfaces.test.ts` | Partial read (lines 1-200) | Confirmed q12 imports fleetMergeFamilyA/C from engine/fleet/detectors but does NOT touch VerdictGrouper; R21 introduces no q12 consumer impact |
| `test/q13-e-bh-fdr.test.ts` | Targeted grep (imports + top-of-file structure) | Confirmed q13 imports eBenjaminiHochberg from engine/fleet/e-bh; does NOT touch VerdictGrouper; R21 introduces no q13 consumer impact |
| `test/q20-verdict-grouper-cluster-event-scope.test.ts` | Partial read (lines 1-100) | Confirmed R20 q20 imports VerdictGrouper + FusedVerdict; uses `makeVerdict(deploy_ref, tick, firing?)` helper (~10 LoC) — R21 spec § 4.2 inlines a structurally-identical helper. R20 q20 frozen at R21. |
| `coordination/VENDORING-MANIFEST.md` | Full read | Confirmed engine/fleet/* not in manifest (Tessera-original); engine/verdict-groups.ts row marked vendored-with-deltas at R20. No R21 transitions needed. |
| `CLAUDE-COMMON.md` + `CLAUDE-ARCHITECT.md` | REINFORCED-line greps + recent additions (lines 196-310 of CLAUDE-ARCHITECT.md) | 19 REINFORCED lines in CLAUDE-ARCHITECT.md; latest is R20 MINOR-1 (narrative-vs-prescription cross-check). Applied at § 9.6. |
| `coordination/logs/ROUND-R20-SUMMARY.md` | NOT read | Acknowledged but not load-bearing for R21 spec — R20 outcomes captured in REVIEWER-REPORT-R20.md (read in full) |
| `coordination/diagnostics/` | Existence-checked only | (No R20 diagnostics — confirmed by absence; would carry forward to R21 if present) |
| `coordination/OVERNIGHT-LOG-2026-05-17.md` | NOT read | Acknowledged but not load-bearing for R21 spec — operator-dispositioned context is captured in NEXT-ROLE.md routing notes |

---

## 2. Citation accuracy log

Each verbatim citation in the spec is traced to its source for Reviewer cold-verification:

| Spec citation | Source verified |
|---|---|
| "R20 baseline SHA `7eb3a63`" — pre-R21 test count attestation HEAD | REVIEWER-REPORT-R20.md line 4 "Reviewer cold-state HEAD: `7eb3a63`" + line 7 "node --test test/*.test.js → 192 pass / 0 fail" |
| Baseline SHA `62e28d7` for R21 anti-scope diff | `git log --oneline -1` at session start = `62e28d7 chore(R21-prep): NEXT-ROLE.md → R21 Architect; SLICE 2.B fleet-merge consumption` |
| R20 § 2.1 ingest opts shape | Read engine/verdict-groups.ts:86-90 → `opts: { terminal?: boolean; cluster_event_id?: string } = {}` |
| R20 § 2.2 conditional group_id format | Read engine/verdict-groups.ts:161-170 (groupId method body); composite literal at line 167 |
| R20 § 2.3 multi-deploy-per-event keying | Read engine/verdict-groups.ts:156-159 (groupKey method) |
| R20 § 2.5 tuple-match late-arrival | Read engine/verdict-groups.ts:250-264 (findRecentClosedForKey) |
| R20 § 2.6 empty-string ≡ absent | Read engine/verdict-groups.ts:157 (`const eventSeg = cluster_event_id ? cluster_event_id : '';`) — falsy-collapse confirmed |
| R20 IngestResult exported | Read engine/verdict-groups.ts:54-66 → interface body and field types verified |
| Inherited Addition #25 D2 + D5 | engine/types/verdict.ts:157-213 — VerdictGroup JSDoc + D5 format-string at line 173-174 |
| Inherited A12/A13/A14/A16/A17 anti-scope | SCOPING-MEMO-v0.3.md § 2.3 lines 239-246 |
| R11/R12/R13 Tessera-original headers | engine/fleet/combine.ts:33-34; engine/fleet/detectors.ts:39-40; engine/fleet/e-bh.ts:56-57 |
| q20 makeVerdict helper | test/q20-verdict-grouper-cluster-event-scope.test.ts:20-30 |
| Operator anti-scope diff-range SHA-anchoring | PHASE-2-SLICE-1-CLOSE-WALK § 2 companion-pattern (lines 71-91); R19 MAJOR-3 reinforcement |
| q01 AT_PIN_FILES list (36 entries) | test/q01-no-at-pin-deltas.test.ts:29-76 |
| R20 MINOR-1 narrative-vs-prescription reinforcement | CLAUDE-ARCHITECT.md tail entry (REINFORCED 2026-05-17 — R20 MINOR-1 narrative-classification gate) |

All citations traced. **No memory-only citations.**

---

## 3. Pre-route discipline application log

### 3.1 Skill 14 PRD-conjunction cross-check

For each R21 deliverable, cross-checked PRD FR/AC trace:

| Deliverable | PRD trace |
|---|---|
| `fleetTickIngest` fan-out | FR-E3a (Phase 2 outer aggregator); SCOPING-MEMO § 2.3 line 345 ("Fleet-merge consumption layer") |
| cluster_event_id propagation through fan-out | FR-E3a; AC-P4 (fleet-event-conditional drift attribution leg) |
| `rollupByClusterEvent` helper | FR-E3a (outer-aggregator consumer surface); SLICE 4 event-feed readiness |
| Backward-compat path (cluster_event_id optional) | A14 anti-scope preservation; legacy-mode compatibility |
| Anti-scope items § 6 | A12/A13/A14/A16/A17 per SCOPING-MEMO § 2.3 lines 239-246 |
| RED → GREEN → chore-A → chore-B sequence | Inherited TDD discipline; R20 § 4 precedent for forward-protection (AC-R21-11) |

All deliverables traced; no unbound PRD claim.

### 3.2 Skill 15 prescription-to-AC-coverage

For each spec prescription in § 2 mechanism, verified ≥1 AC binds:

| Prescription | Binding AC |
|---|---|
| § 2.1 — fleetTickIngest signature + N-correspondence | AC-R21-1 |
| § 2.1 — cluster_event_id propagation per-shard | AC-R21-2 |
| § 2.2 — backward-compat (absent → legacy) | AC-R21-3 |
| § 2.1 — empty input no-throw | AC-R21-4 |
| § 2.1 — terminal propagation | AC-R21-5 |
| § 2.1 — order preservation | AC-R21-6 |
| § 2.4 — rollup distinct VerdictGroups | AC-R21-7 |
| § 2.4 — empty-string query short-circuit | AC-R21-8 |
| § 2.8 — header block presence | (Not directly bound by an AC — verified by Reviewer via Read at cold-review per R20 § 2.7 precedent; documented as expected-but-unbinding) |
| § 4.4 — typecheck binding | AC-R21-9 |
| § 4.4 — full suite count + per-file enumeration | AC-R21-10 |
| § 4.6 — chore-B SHA substitution + runtime test | AC-R21-11 |
| § 4.3 — RED commit ordering | (TDD discipline; verified by Reviewer via git log inspection per R20 § 4.3 precedent; no direct AC) |

13 prescriptions; 11 directly AC-bound; 2 (header block, RED ordering) verified via Reviewer-side discipline per established R20 precedent.

### 3.3 16/17-token cross-section consistency pass

Documented at spec § 9.14. 17 tokens cross-checked; all byte-identical across § 0-§ 8 + § 9 grilling tables.

### 3.4 Pre-emit grilling 13-gate sweep

Documented at spec § 9.1-§ 9.14 (13 gates; 9.12 N/A). All PASS.

### 3.5 Vendored-file-delta-assertion-surface enumeration (R18 OBS-2 reinforcement)

Documented at spec § 9.8. R21 touches NO vendored files; gate N/A. Explicit cross-check confirmed:
- New `engine/fleet/verdict-consumer.ts` is Tessera-original (not in vendoring manifest; not in q01-no-at-pin-deltas AT_PIN_FILES; not first-line-SHA-pin-checked by q01-vendoring-coverage)
- R20-introduced vendored-with-deltas on `engine/verdict-groups.ts` is R21-anti-scoped (no further deltas at R21)
- R18-introduced vendored-with-deltas on `engine/types/verdict.ts` is R21-anti-scoped (no further deltas at R21)

### 3.6 Empirical-premise-verification (R08 MAJOR-2 reinforcement)

Documented at spec § 9.7. 14 load-bearing factual claims verified by direct file-open or grep at session start. None inherited from prior testimony.

### 3.7 Anti-scope baseline + end-bound soundness (R15 MINOR-1 + R19 MAJOR-3 reinforcement)

Documented at spec § 9.9. Baseline `62e28d7` verified as last-commit-immediately-before-R21-work. End-bound = chore-A SHA per TQ-4 γ pattern (substituted by Implementer at chore-B).

### 3.8 Narrative-classification-vs-structural-prescription cross-check (R20 MINOR-1 reinforcement)

Documented at spec § 9.6. § 5 preamble classifies AC-R21-1..8 + AC-R21-11 as runtime tests AND AC-R21-9/-10 as binding-command attestations. Cross-checked against § 4.3/4.4/4.6 prescriptions — all 11 ACs' classifications agree with the matching § 4.x prescription. No § 5 preamble claim contradicts a § 4.x prescription.

### 3.9 Halt-condition pre-anticipation (R08 + R19 MAJOR-1/2/3/4 reinforcement)

Documented at spec § 9.10. 5 halt scenarios enumerated with prescribed responses; all route to DIAGNOSTIC + STATUS: ESCALATE, none to silent in-line resolution. Memorial-self-exoneration guard documented at § 9.11.

---

## 4. Architect pre-prediction on outcomes

| Prediction | Confidence | Rationale |
|---|---|---|
| Implementer encounters zero halt conditions | HIGH | All 5 anticipated scenarios are low-probability (typecheck soundness verified at spec-write time via the pseudocode shape; baseline drift requires concurrent operator action; anti-scope diff drift requires Implementer scope creep — guarded by component inventory § 3 + halt § 9.10). 12th consecutive clean tessera halt-discipline round predicted (R09-R21). |
| Implementer GREEN test count = 192 + 8 = 200 | HIGH | 8 AC-R21-1..8 runtime tests in q21 GREEN commit; no other test-file additions; q21 count grows by 1 (to 9) at chore-B with AC-R21-11. Final = 201. |
| q21 file size ~180-240 LoC | MEDIUM | Based on q20 precedent (214 LoC for 11 runtime tests + helper + imports); R21's 9 tests are simpler (fan-out + rollup, no inherited semantics traversal). |
| verdict-consumer.ts file size ~80-110 LoC | MEDIUM | 4 type exports (~25 LoC with JSDoc) + 2 functions (~25 LoC + JSDoc) + file header (~15 LoC) ≈ 80-100 LoC. May expand slightly if Implementer adds defensive comments. |
| Reviewer findings = 0 CRITICAL / 0 MAJOR / 0-2 MINOR / 0-3 OBS | MEDIUM | R20 set the precedent for clean full-tier rounds (0/0/3/3 with all MINORs from spec-level drift the Reviewer caught). R21's simpler scope (1 new Tessera-original module; no vendoring transition; no R20-style retroactive contract patches) reduces MINOR surface area. Some OBS likely on thin AC coverage edges (e.g., AC-R21-5 terminal+late-arrival interaction; AC-R21-7 cross-tick rollup composition). |
| AC-R21-9/-10 binding-command classification disagreement risk | LOW | Spec § 5 preamble explicitly cross-checked against § 4.x at grilling § 9.6 — R20 MINOR-1 lesson applied. |
| Anti-scope diff comes in exactly 8 entries (or fewer if some gitignored) | HIGH | Approach A's tight scope + Tessera-original new module + no vendoring transitions limit the surface. Allowed-set padded with .js outputs for safety. |

---

## 5. Decision rationale (what was picked; what was rejected; why)

### Picked — Approach A (new Tessera-original `engine/fleet/verdict-consumer.ts` module)

**Why.** Minimizes blast-radius across already-frozen surfaces (engine/verdict-groups.ts R20-frozen; engine/types/verdict.ts R18+R20-frozen; engine/fleet/{combine,detectors,e-bh}.ts Tessera-original-stability-frozen by Approach A reasoning). Preserves backward-compat end-to-end. SLICE 4 event-feed has a clean producer surface (`input.cluster_event_id` set per-tick). Per-tick scope (Q3) matches cluster-event semantic naturally (events are fleet-level transitions, not per-shard payload differentiators).

### Rejected — Approach B (modify combine/detectors/e-bh signatures)

**Why rejected.** Dead-parameter noise on 5 existing primitive signatures; forces forward-coupling across all future fleet-merge variants; zero architectural benefit (fan-out still requires a separate consumer layer; math primitives don't use the parameter). Violates Tessera-original-code-stability principle established at R11/R12/R13. Spec-level analysis confirms the parameter would be ignored at every call site inside the math, producing a pure-pass-through that adds review burden without behavioral value.

### Rejected — Approach C (new method on VerdictGrouper)

**Why rejected.** NEXT-ROLE.md R21 anti-scope explicitly prohibits modifying engine/verdict-groups.ts. Approach C would force ESCALATE for a R20-contract amendment. Approach A delivers equivalent rollup functionality consumer-side without aggregator-internal access. Also: hiding rollup behind aggregator-internal state would force SLICE 4 to thread the aggregator through, reducing the bridge surface's composability.

### Q-question dispositions

- **Q1 (producer surface)**: per-tick context object on FleetTickInput (reframed option (c)). Not on FusedVerdict (A14); not on combine/detectors/e-bh signatures (Approach B rejection); not via mutable aggregator state (Approach C rejection).
- **Q2 (rollup semantics)**: consumer-side helper on IngestResult[] (Approach A § 2.4). Cross-tick composable via `.concat()`. No aggregator-internal access (R21 anti-scope).
- **Q3 (per-tick vs per-verdict scope)**: per-fleet-tick. Concurrent events → sequential calls.
- **Q4 (e-BH interaction)**: e-BH agnostic at R21. Cluster-event-scoped FDR deferred.
- **Q5 (backward-compat)**: optional cluster_event_id on FleetTickInput; absent → legacy mode.
- **Q6 (test substrate)**: inline FusedVerdict literals at R21 (matches q20 pattern; v9X is topology-only; v9Y is SLICE 4).

---

## 6. Amendments (if any)

None. First-draft routing; no operator-disposition cycle expected.

---

_End of Q-R21-SPEC-AUDIT.md._
