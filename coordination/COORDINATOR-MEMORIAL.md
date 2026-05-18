# COORDINATOR-MEMORIAL.md — Tessera Coordinator-Level Memorial

_Coordinator-level memorial for Tessera per CLAUDE-COORDINATOR.md §Memorial accretion at the coordinator level. Captures patterns at the DAG-construction and wave-planning level — separate from `coordination/MEMORIAL.md` (which captures implementation-level patterns)._

_Initialized 2026-05-18 at first Coordinator invocation (R24)._

---

## How to use this file

**Append-only.** Never delete or rewrite past entries. The accumulated history IS the value — ratios of violations to confirmations drive which disciplines need sharpening.

**Entry format** (same as project `MEMORIAL.md`, but role is always Coordinator TPM and the "round" identifier is a wave + gate reference):

```
CONFIRMATION: [discipline] | [what worked, specifically] | Wave [N] gate | Coordinator
VIOLATION:    [discipline] | [what happened, specifically] | Wave [N] gate | Coordinator
```

**Be specific.** "Dependency edge wrong" is not useful. "WU-04 → WU-09 classified HIGH confidence via D1; wave gate discovered WU-09 actually reads from a third file written by WU-12, not WU-04. D1 application missed the third-party-write case." is useful.

**Disciplines tracked** (extend as new patterns surface):

- `dependency-edge-classification` — D1–D5 test application accuracy
- `claude-judgment-threshold` — Step 3 escalation calibration
- `tier-classification` — Coordinator prior vs cluster self-assessment
- `wave-gate-failure-handling` — disposition appropriateness
- `cross-cluster-handoff-completeness` — handoff artifact accuracy
- `dag-construction-discipline` — overall DAG quality
- `pre-emit-grilling` — Coordinator self-review effectiveness
- `fan-out-vs-sequential-judgment` — operator-preference application (Tessera-specific given R24 directive)

---

## Confirmations + violations (chronological)

### Pre-Wave-1 (WAVE-PLAN-01 emission, 2026-05-18) — first Coordinator invocation

CONFIRMATION: `dag-construction-discipline` | Step 1 deterministic extraction kept WU count to 7 (one WU per FR-E3a/b/c row + SLICE 3.C/SLICE 3 close-walk/Phase 2 close-walk per SCOPING-MEMO § 3); no WUs invented; SLICE 4 decomposition explicitly deferred to OQ-W1-3 rather than pre-resolved by Coordinator. | WAVE-PLAN-01 emit | Coordinator

CONFIRMATION: `dependency-edge-classification` | D1/D2/D5 pairwise check across Wave 1 candidates (WU-01/02/03/04) surfaced zero edges; D4 file-tree contention identified and resolved via convention (parallel-class architecture) surfaced as OQ-W1-1 rather than silently assumed. | WAVE-PLAN-01 emit | Coordinator

CONFIRMATION: `claude-judgment-threshold` | Three Step 3 judgment calls logged with bounded options + reasoning: (1) WU-04 placement in Wave 1; (2) Adapter file-layout convention; (3) Wave 2/3 sequencing. Each call distinguished from D1/D2 deterministic edges in the audit trail. | WAVE-PLAN-01 emit | Coordinator

CONFIRMATION: `fan-out-vs-sequential-judgment` | Applied operator R24 directive ("PREFER fan-out when D1-D5 tests show clean independence") to Wave 1 (4-cluster fan-out) and explicitly justified single-cluster Waves 2/3/4 by citing the specific D-test or convention that collapsed candidates. No fan-out forced where independence was absent. | WAVE-PLAN-01 emit | Coordinator

CONFIRMATION: `pre-emit-grilling` | All 6 grilling checklist items addressed inline in the WAVE-PLAN-01.md artifact (not kept internal); 3 adversarial review notes added beyond the checklist (PR-F6 timing risk; BFS body modification risk; operator review capacity risk) with concrete mitigations. | WAVE-PLAN-01 emit | Coordinator

(No violations at this invocation.)

---

### Pre-Wave-1 (WAVE-PLAN-02 emission, 2026-05-18) — Coordinator re-invocation after SCOPING-MEMO MR-1 amendment

CONFIRMATION: `dag-construction-discipline` | Step 1 deterministic extraction added exactly +1 WU (WU-00 L0-CONTRACT) traceable to a specific SCOPING-MEMO MR-1 amendment surface (Extension 3 (b) sub-extension lines 219-228 + § 3 SLICE 3.A.5 row line 364 + § 4.2 R-E7 line 416). No WUs invented beyond the amendment. v1's 7 WUs preserved with identical numbering for diff readability. | WAVE-PLAN-02 emit | Coordinator

CONFIRMATION: `dependency-edge-classification` | Recorded asymmetric edge confidence honestly: WU-00 → WU-03 (NVLINK) D1 HIGH because NVLink 32-bit error counters directly exercise WU-00's wrap-handling path per § 4.2 R-E7; WU-00 → WU-01 (SLURM) and WU-00 → WU-02 (K8S) D2 MEDIUM because Slurm/K8s topology formats are not counter-typed and the dependency is interface-only. Resisted temptation to record uniform D1 HIGH despite NEXT-ROLE.md framing suggesting uniformity — Step 3 Judgment call 1 documents the rationale. Operationally identical wave placement (all three adapters in Wave 2 after WU-00) but recorded dependency strength preserves accuracy for future cycle reference. | WAVE-PLAN-02 emit | Coordinator

CONFIRMATION: `claude-judgment-threshold` | Two new Step 3 judgment calls (1: D1/D2 asymmetry across adapter edges; 2: MD-F4 placement Wave 1 vs Wave 2) plus carry-forward of v1's judgment calls 3 (parallel-class convention) and 4 (Wave 3/4 sequencing). Each new call logged with bounded options + reasoning. Did not resolve operator-decidable OQ-W2-1 (L0-contract module location) by Coordinator fiat — surfaced as operator OQ with Coordinator-default recommendation. | WAVE-PLAN-02 emit | Coordinator

CONFIRMATION: `fan-out-vs-sequential-judgment` | Resisted collapsing MD-F4 into a single-cluster Wave 2 with adapters when MD-F4 is structurally independent of WU-00 (zero D-test edges). Placed MD-F4 in Wave 1 with WU-00 as a clean 2-cluster fan-out per operator R24 directive ("do not collapse them into a single cluster for convenience or out of conservatism — if independence is clean, fan out"). Total wave count grew from 4 (v1) to 5 (v2) because WU-00 is a genuine precondition for adapters per operator-amended SCOPING-MEMO; surfaced this +1 wave cost honestly in plan summary as the price of the amendment rather than collapsing WU-00 into the adapter clusters (which would re-invite per-adapter counter-handling drift the L0-contract carve-out exists to prevent). | WAVE-PLAN-02 emit | Coordinator

CONFIRMATION: `pre-emit-grilling` | All 6 grilling checklist items addressed inline in WAVE-PLAN-02.md (not kept internal); 5 adversarial review notes added beyond the checklist (WU-00 file-layout OQ vs concurrent-drift; BFS body modification risk carry-forward; WU-00 reset-vs-wrap ambiguity; Wave 2 dependency on potentially-unstable WU-00 contract; +1 wave cost honesty). | WAVE-PLAN-02 emit | Coordinator

CONFIRMATION: `coordinator-versioning-discipline` | WAVE-PLAN-01.md preserved on disk per CLAUDE-COORDINATOR.md §Coordinator artifacts ("Versioned per revision; do not edit in place"). WAVE-PLAN-02.md is a sibling, not a replacement. Version history table at end of v2 documents what changed from v1 → v2. | WAVE-PLAN-02 emit | Coordinator

(No violations at this re-invocation.)

---

## Reinforcement rules derived

When a discipline accumulates **3+ violations** across waves (or across projects, when tracked at the cross-project layer), the Coordinator derives a sharpening rule. Derived rules become part of the Coordinator's standing discipline.

### dependency-edge-classification

_Trigger: when 3+ violations accumulate. None yet._

### claude-judgment-threshold

_Trigger: when 3+ violations accumulate. None yet._

### tier-classification

_Trigger: when 3+ violations accumulate. None yet._

### wave-gate-failure-handling

_Trigger: when 3+ violations accumulate. None yet._

### fan-out-vs-sequential-judgment

_Trigger: when 3+ violations accumulate. None yet._

---

## Cross-project emerging patterns

When a pattern recurs across **two or more projects**, escalate from project-local memorial to cross-project methodology evolution.

### Patterns watched for cross-project recurrence

- **MR-1 vendoring → first Coordinator invocation success pattern.** Tessera is the first non-anchor project to vendor the Coordinator role (MR-1 closed at HEAD `7890b36`). WAVE-PLAN-01 emission worked cleanly (zero halt conditions; OQs surfaced rather than auto-resolved); pattern candidate for promotion to canonical anchor `skills/12-coordinator-role.md` if a second project's first Coordinator invocation also produces clean wave plan without prior empirical context. First observed: WAVE-PLAN-01 emit (Tessera, 2026-05-18).
- **Adapter-fan-out enabling parallel-class architecture pre-declaration.** WAVE-PLAN-01 OQ-W1-1 surfaced "Coordinator pre-declares parallel-class architecture" as the load-bearing decision for clean fan-out across N concurrent ingestion-adapter clusters. If a second project hits the same pattern (Coordinator preserving fan-out by pre-declaring class-layout convention), candidate for promotion to a new discipline section in `skills/12-coordinator-role.md` §Cluster handoff inventory or §Common pitfalls. First observed: WAVE-PLAN-01 emit (Tessera, 2026-05-18).
- **PRD amendment mid-Coordinator-cycle → wave-plan revision pattern.** WAVE-PLAN-02 emission occurred same session as v1 (~hours apart) because operator raised an architectural concern (L0 counter-semantic preprocessing) after v1 emit; SCOPING-MEMO MR-1 amendment landed; Coordinator re-invoked for v2. Pattern worked cleanly: v1 preserved on disk; v2 incremented version + added new WU per amendment + recorded what changed in version history table. No need to overwrite v1; downstream consumers (operator review; Wave 1 dispatcher) read v2 as the current plan. Candidate for promotion if a second project hits the same mid-cycle-amendment pattern. First observed: WAVE-PLAN-02 emit (Tessera, 2026-05-18).
- **Asymmetric D1/D2 edge confidence within a single Step-2 fan-out group.** WAVE-PLAN-02 Step 3 Judgment call 1 recorded WU-00 → WU-03 as D1 HIGH (NVLINK exercises wrap-handling path) but WU-00 → WU-01/02 as D2 MEDIUM (SLURM/K8S have only interface dependency, no counter ingestion). This is the first Tessera Coordinator-level case of asymmetric confidence within edges to a single "fan-out" target group. The deterministic-D-test framework's distinction between D1 (output ownership) and D2 (AC reference) made the asymmetry recordable. Pattern candidate for cross-project promotion: when an upstream WU's surface has variable consumption depth across downstream WUs, record edges asymmetrically rather than uniformly. First observed: WAVE-PLAN-02 emit (Tessera, 2026-05-18).

---

## Update history

- **2026-05-18 (early):** Memorial initialized at first Coordinator invocation (Tessera R24); WAVE-PLAN-01.md emitted; zero pre-Wave-1 violations.
- **2026-05-18 (later same day):** Coordinator re-invoked for WAVE-PLAN-02 after SCOPING-MEMO MR-1 amendment added L0-contract sub-extension; v1 preserved on disk; v2 emitted; zero pre-Wave-1 violations at re-invocation.
