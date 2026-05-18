CURRENT-ROUND: R23
NEXT-ROLE: ARCHITECT
STATUS: READY

## Round-scope directive

**R23 = Phase 2 SLICE 3 — first round (HardwareTopologySource concrete impl).**

SLICE 3 scope per `coordination/SCOPING-MEMO-v0.3.md` § 3 line 346 (3-4 Q-cycle estimate; this is round 1):

> HardwareTopologySource concrete impl (NVLink + rack + PSU + cooling-zone). Topology-aware spatial attribution (MD-F4; PR-F6 pair-review including BFS-on-undirected evaluation). Common-mode failure-injection empirical test (rack-localized PSU event simulation on synthetic v9X cluster substrate). **Hybrid Reviewer pair-review-style at SLICE 3 close.**

Maps to **PRD FR-E3b** (cross-shard correlation: topology-aware spatial attribution; HardwareTopologySource impl against Addition #26 TopologySource interface) · **US-02** (topology-aware common-mode failure attribution).

Entry dependencies all delivered (per PHASE-2-SLICE-2-CLOSE-WALK.md § 3 table):
- ✅ `TopologySource` interface (inherited; `engine/topology-overlay.ts:50-55`)
- ✅ `TopologyNode.kind` += `'gpu_shard' | 'rack'` (R18; pending: PSU + cooling-zone)
- ✅ `TopologyEdge.relationship` += `'contains'` (R18; pending: nvlink_peer or equivalent)
- ✅ v9X synthetic single-rack fixture (R18; may extend or supersede with v9Y for multi-rack/PSU testing)
- ✅ VerdictGrouper `cluster_event_id` scope keying (R20)
- ✅ Fleet-merge consumer (R21)

**Architect's split-decision (R23 vs R24 vs R25):** SLICE 3 is 3-4 cycles. Recommendation framing for the spec — keep R23 ACs ≤ 12-15 per R20 precedent (avoided spec bloat). Likely split candidates:
- **R23 (this round, SLICE 3.A)** — type-layer deltas (PSU + cooling-zone + nvlink_peer enums); `HardwareTopologySource` scaffold class + StaticHardwareTopologySource impl (analogous to StaticTopologySource); v9X-or-v9Y test substrate decision; basic snapshot-hash + fetchSnapshot binding.
- **R24 (SLICE 3.B)** — full ingestion adapter(s): Slurm topology format / K8s node-label / NVIDIA NVLink-topology output → TopologySnapshot.
- **R25 (SLICE 3.C, hybrid Reviewer at close)** — topology-aware spatial attribution (MD-F4 empirical evidence) + common-mode failure-injection test (rack-localized PSU event on synthetic substrate) + PR-F6 hybrid Reviewer.
- **R26** — SLICE 3 close-walk (mirroring R22 pattern).

The R23 Architect MAY split differently if scope re-distribution makes more sense. The constraint is reviewability per round (≤ 12-15 ACs target).

**Tier: full.** Mandate per PHASE-2-SLICE-2-CLOSE-WALK.md § 3 line 165: SLICE 3 entry = full-tier required. Justification: A1 (new dependency surface — Slurm/K8s/NVLink ingestion) + A2 (new architectural pattern — HardwareTopologySource against existing TopologySource interface; new concrete impl class) + A4 (novel data model — PSU/cooling-zone node kinds + nvlink_peer edge semantics).

**Note:** Hybrid Reviewer pair-review fires at SLICE 3 CLOSE (likely R25), NOT at R23. R23 uses standard full-tier (Architect + single Reviewer + Memorial). The hybrid-Reviewer scheduling decision belongs to the SLICE 3.C architect.

## Inputs for next role (Architect)

**Read in order:**

1. **`coordination/PRD.md`** — thin PRD; FR-E3b, US-02, AC-P4.
2. **`coordination/SCOPING-MEMO-v0.3.md`** — canonical scope:
   - § 2.3 Phase 2 Extension 3 → line 205 (inherited TopologySource interface + planned PSU/cooling_zone enum extensions); line 217 (HardwareTopologySource architectural sketch — inputs are Slurm/K8s/NVLink; outputs are TopologySnapshot)
   - § 3 Q-cycle table SLICE 3 row (line 346)
   - § 9.4 vendoring policy (relevant for topology-overlay.ts vendored-with-deltas decision)
   - line 558 vendoring forecast: "Vendored-with-deltas at Phase 2; SLICE 3 of Phase 2 adds HardwareTopologySource concrete impl + relationship enum extension"
   - line 483 LS-4 reference (sparse-topology-data edge cases anticipated)
3. **`coordination/PHASE-2-SLICE-2-CLOSE-WALK.md`** — § 3 SLICE 3 entry framing + architectural sketch + open questions (OQ-1 + OQ-R08-3 still parked; LS-4 active).
4. **`coordination/PHASE-2-SLICE-1-CLOSE-WALK.md`** — § 2 vendored-with-deltas two-step maintenance pattern (apply UPFRONT if topology-overlay.ts gains deltas) + anti-scope diff-range SHA anchoring pattern.
5. **`engine/topology-overlay.ts`** — inherited Addition #26 enrichment layer:
   - `TopologySource` interface (lines 50-55)
   - `StaticTopologySource` impl (lines 83-101) — template for `HardwareTopologySource` constructor pattern
   - `OtelServiceGraphV1` impl (lines 111-180) — template for fetch-based concrete impl
   - BFS implementation (line 257+; already bidirectional per engine comment) — Architect determines if R23 BFS-on-undirected adaptation is needed for new edge types
   - `computeSnapshotHash` (lines 69-78) — shared across all TopologySource impls
6. **`engine/types/verdict.ts`** — already vendored-with-deltas:
   - `TopologyNode.kind` union at line 236 — `'service' | 'database' | 'queue' | 'external' | 'gpu_shard' | 'rack'` — R23 extends with `'psu' | 'cooling_zone'`
   - `TopologyEdge.relationship` union at line 246 — `'calls' | 'reads' | 'writes' | 'publishes' | 'contains'` — R23 likely extends with `'nvlink_peer'` (US-02 NVLink-peer correlation requirement; architect picks final name)
7. **`test/_substrate/v9X-cluster.ts`** — R18 substrate. R23 decides: extend v9X with PSU/cooling-zone nodes (in-place delta) OR create v9Y for multi-rack + PSU + cooling-zone topology. Spec must justify the choice.
8. **`coordination/specs/Q-R18-SPEC.md`** + **`coordination/specs/Q-R20-SPEC.md`** + **`coordination/specs/Q-R21-SPEC.md`** + **`coordination/specs/Q-R22-SPEC.md`** — spec-pattern precedents; especially R20 split-decision rationale + R22 audit-tier file-granularity pre-authorization (apply to R23 the patterns that worked).
9. **`coordination/reviews/REVIEWER-REPORT-R20.md`** + **`coordination/reviews/REVIEWER-REPORT-R21.md`** + **`coordination/reviews/REVIEWER-REPORT-R22.md`** — R20/R21/R22 outcomes; carry-forward watch items.
10. **`coordination/VENDORING-MANIFEST.md`** — current vendoring policy table.
11. **`/Users/johnwarren/.claude/CROSS-PROJECT-MEMORIAL.md`** — cross-project rules (R21 line-citation-drift rule active; attestations must cite exact line numbers).

## Anti-scope (R23 hard limits)

- **A12 — NO modification of inherited BFS internals in `engine/topology-overlay.ts`** beyond architecturally-anchored extension points. If R23 BFS-on-undirected work requires touching the BFS algorithm body, transition topology-overlay.ts to vendored-with-deltas and apply the two-step maintenance pattern (manifest + AT_PIN_FILES) UPFRONT per PHASE-2-SLICE-1-CLOSE-WALK § 2. Spec failure-mode analysis MUST enumerate every q01-* test that asserts byte-identity on touched files.
- **NO modification of `engine/verdict-groups.ts`** — R20 deliverable frozen.
- **NO modification of `engine/fleet/verdict-consumer.ts`** — R21 deliverable frozen.
- **NO modification of `engine/types/verdict.ts` outside enum extensions** (R18 + R20 deltas preserved; only adding new enum literals to `TopologyNode.kind` + `TopologyEdge.relationship` is in-scope; modifying any other field structure = ESCALATE).
- **NO deployment-event-feed ingestion** — SLICE 4.
- **NO MD-F4 empirical evidence / common-mode failure-injection test at R23** — that's SLICE 3.C (later sub-round). R23 substrate-only is sufficient.
- **NO PR-F6 hybrid Reviewer at R23** — fires at SLICE 3 close.
- **NO real-cluster integration** — synthetic-cluster substrate only (R-E3 anti-scope per v0.3 § 4.2).
- **NO Addition #25 D2/D5 reversal**; **NO Addition #26 D1/D4/D5 reversal** — all preserved through R18+R20+R21+R22.
- **NO modification of `test/q20-…test.ts` or `test/q21-…test.ts`** — R20+R21 deliverables frozen. (R22 already corrected q20 header + added q21 branch coverage; R23 should not need to touch.)
- **NO inherited detector internal changes** (A12/A5).

## Architectural questions for Architect's brainstorm phase

The R23 Architect's brainstorm + recommendation should resolve at minimum:

1. **R23 sub-scope split.** Recommendation framing in directive (R23 = scaffold + type-layer; R24 = ingestion adapters; R25 = MD-F4 + common-mode injection + hybrid Reviewer; R26 = close-walk). Architect confirms or re-splits with rationale.
2. **Type-layer enum extensions.** Add `'psu' | 'cooling_zone'` to `TopologyNode.kind`; add edge-relationship literal for NVLink-peer correlation (`'nvlink_peer'`? `'peers'`? `'nvlink'`? Architect picks final identifier — affects PSU + cooling-zone edge semantics too: are they `'contains'` relations from rack/cluster, or do they need their own relationship literals?).
3. **HardwareTopologySource class shape.** Mirror StaticTopologySource (in-memory snapshot, no fetch I/O) for R23, with R24 adding the actual Slurm/K8s/NVLink fetch impls? Or single concrete class with multiple fetch strategies via constructor? Architect picks; trade-off: testability vs class proliferation.
4. **File placement.** Per close-walk § 3 line 152: `engine/hardware-topology-source.ts` (Tessera-original; no AT_PIN_FILES entry). Confirm or relocate.
5. **BFS-on-undirected.** Inherited BFS at `engine/topology-overlay.ts:257` already treats edges as bidirectional. Does R23 need additional adaptation for new relationship literals (e.g., `nvlink_peer` is naturally undirected, but `contains` is naturally directional — does BFS handle both correctly with current code?). Architect's R23 decision: NO topology-overlay.ts changes (BFS handles it) OR YES vendored-with-deltas transition (BFS body needs amendment for new edge semantics).
6. **Test substrate choice.** Extend v9X in-place (add PSU + cooling-zone nodes; same single-rack frame) OR create v9Y (multi-rack with PSU/cooling-zone for SLICE 3.C common-mode injection). Architect picks; trade-off: v9X reuse continuity vs v9Y future-proofing.
7. **Sparse-topology degradation (LS-4 carry-forward).** Architect enumerates failure modes at spec time: what does BFS return when topology is partial (e.g., rack/shard known but no PSU/cooling-zone data)? Spec must specify graceful-degradation contract (no throw; subset attribution; null/empty fallback).
8. **Snapshot-hash semantics.** Inherited `computeSnapshotHash` (lines 69-78) sorts nodes by id, edges by (from, to, relationship). New relationship literals must sort lexicographically without breaking inherited semantics — confirm at spec time.

## Apply R20/R21/R22 reinforcements UPFRONT

- **R20 ARCH MINOR-1:** spec § 5 AC-table preamble classification claims must be cross-checked against § 4.x prescriptions. Architect runs cross-section consistency pass on classification claims.
- **R21 ARCH MINOR-1:** spec files (Q-R23-SPEC.md + Q-R23-SPEC-AUDIT.md) MUST be committed in their own commit BEFORE chore-A. Architect role responsibility.
- **R21 ARCH+IMPL MINOR-2/3:** branch-binding coverage gate — every guard or short-circuit in production code must have an AC that structurally exercises it (e.g., test fails when guard removed). Architect's spec must enumerate guards/branches and bind each.
- **R22 IMPL MINOR-1:** count ACs MUST be anchored to chore-A SHA explicitly (not "after R23 implementation commits"). Architect's AC-R23-N for test count should say "at MERGE-READY chore-A SHA `<placeholder>`, `node --test test/*.test.js` reports tests = X / pass = X / fail = 0".
- **Cross-project line-citation-drift rule (derived at R21):** every NEXT-ROLE.md attestation line citation must match actual `test()` declaration line number (cite-then-verify; not from memory).
- **R22 audit-tier pre-authorization pattern:** if R23 includes any test-file touches beyond ADD-NEW-TEST-FILE (e.g., extending v9X), spec MUST pre-authorize at file granularity with explicit scope (e.g., "v9X fixture: ADD PSU + cooling-zone nodes; existing rack/shard nodes + canonical source_id/source_version frozen").

## Carry-forward watch items from SLICE 2 (R20/R21/R22)

| From | Item | R23 disposition |
|---|---|---|
| R20 OBS-1 | AC-R20-8 sub-case (c)/(d) thin coverage in q20 | Carry-forward; q20 frozen at R23 unless touched (would be ESCALATE) |
| R20 MINOR-3 | spec-prescribed parenthetical placement | Pattern reinforcement (already in CLAUDE-IMPLEMENTER); R23 IMPL applies |
| R21 MINOR-4 | line-citation drift | Cross-project rule active; R23 attestations cite-then-verify |
| R22 MINOR-1 | count ACs not anchored to chore-A SHA | Reinforcement applied above; R23 spec applies pattern |
| Persistent | CLAUDE-IMPLEMENTER.md at 36 REINFORCED lines | Consolidation deferred to operator-triggered run of `scripts/consolidate-reinforcements.sh`; not blocking R23 |

## Escalation items

(none active)

## Routing notes

- Operator authorized "let's move forward with slice 3" on 2026-05-18 morning. Single-round authorization (no overnight chain authority active). R23 launches; report at close; await operator direction for R24 chain or pause.
- Anti-scope diff (AC-R23-N) anchored to chore-A SHA per TQ-4 γ pattern.
- Vendored-with-deltas two-step maintenance pattern (manifest + AT_PIN_FILES) UPFRONT in component inventory if topology-overlay.ts gains deltas.
- Spec artifacts (Q-R23-SPEC.md + Q-R23-SPEC-AUDIT.md) committed in own commit BEFORE chore-A per R21 ARCH MINOR-1.
- Hybrid Reviewer NOT scheduled for R23 (fires at SLICE 3.C close per close-walk § 3 line 165).

## Phase 2 SLICE 3 readiness state at R23 entry

| Element | State |
|---|---|
| Inherited `TopologySource` interface | ✅ `engine/topology-overlay.ts:50-55` |
| Inherited `StaticTopologySource` template class | ✅ `engine/topology-overlay.ts:83-101` |
| Inherited `OtelServiceGraphV1` template class | ✅ `engine/topology-overlay.ts:111-180` |
| Inherited BFS (already bidirectional) | ✅ `engine/topology-overlay.ts:257+` |
| Inherited `computeSnapshotHash` | ✅ `engine/topology-overlay.ts:69-78` |
| R18 type substrate (kind/relationship enums + v9X) | ✅ |
| R20 VerdictGrouper contract | ✅ |
| R21 fleet-merge consumer | ✅ |
| 0-CRITICAL streak | 21 rounds (R02-R22) |
| 0-MAJOR streak | 3 rounds (R20-R22) |
| Working tree clean | ✅ |
| HEAD | `4072ac8` (overnight-stop morning hand-off commit) |
| Test count | 204 / 0 |
| CLAUDE-IMPLEMENTER.md | 36 lines (consolidation flag persistent) |
