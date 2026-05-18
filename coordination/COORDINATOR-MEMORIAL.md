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

---

## Update history

- **2026-05-18:** Memorial initialized at first Coordinator invocation (Tessera R24); WAVE-PLAN-01.md emitted; zero pre-Wave-1 violations.
