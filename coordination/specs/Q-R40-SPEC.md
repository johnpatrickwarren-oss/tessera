# Q-R40-SPEC — Phase 3 Candidate Synthesis Inventory
# Audit-tier spec: Implementer authors and executes. Reviewer audits cold.
# Round: R40 | 2026-05-19

---

## § 1 Goal

R40 produces `coordination/PHASE-3-CANDIDATES-PRELIMINARY.md`, a DRAFT inventory of Phase 3
candidates for operator review before any Phase 3 scoping begins. The inventory consolidates
all TAGGED-FUTURE items from Phase 2 deliverables and methodology artifacts into a structured,
operator-actionable document. Phase 3 entry requires separate operator authorization; this round
produces the inventory input to that decision, not the decision itself.

---

## § 2 Mechanism

### Brainstorm (3 approaches considered)

**Approach A — Pure enumeration (laundry-list):** Collect all TAGGED-FUTURE literals from
SCOPING-MEMO-v0.3.md + STAGED-FOR-PHASE-2-CLOSE.md into a flat list. Fast but provides no
synthesis value; operator already knows the raw list.
- Hidden assumption: operator can independently derive priority ordering and dependencies.
- Risk: Fails Rule 5 from NEXT-ROLE.md (each candidate must have "why this matters + dependency
  note"); fails pre-emit grilling ask: "can the next role act on this with zero clarifying questions?"

**Approach B — Synthesized inventory with structure (SELECTED):** Follow the §1-§8 structure
from NEXT-ROLE.md directive. Each candidate gets: (1) provenance citation, (2) 1-line "why it
matters for Phase 3", (3) dependency note, (4) OQ flag if it raises an operator-decision-class
question. § 7 adds a rough Q-cycle estimate per section.
- Strengths: Actionable; directly implements NEXT-ROLE.md directive; stays within anti-scope.
- Weaknesses: More work than enumeration; must not drift into scoping decisions.
- Mitigation: Any sequencing/prioritization question surfaces as an OQ in the artifact; not
  resolved by Implementer.

**Approach C — Prioritization-first analysis:** Open with a Phase 3 SLICE 1 recommendation.
- Eliminated: Crosses into Phase 3 scoping, which is anti-scope. HALT condition 1 fires
  immediately ("candidate surfaces operator-decision-class question about Phase 3 sequencing").

**Selection rationale:** Approach B is the only option that satisfies NEXT-ROLE.md direction +
anti-scope + Rule 5 Rule 5 ("each candidate has a 'why' + dependency note"). Approach A fails
synthesis; Approach C violates anti-scope.

### Design sketch

**Sources → sections:**
- § 1 vendor adapters ← SCOPING-MEMO-v0.3.md § 2.3 R32 AMENDMENT vendor-fungibility table (line 285-289)
- § 2 real-cluster integration ← SCOPING-MEMO-v0.3.md § 4.2 R-E3 (TAGGED-FUTURE post-Phase-2)
- § 3 DeploySignal integration ← SCOPING-MEMO § 2.3 A17 + PRD.md success metrics
- § 4 infrastructure ← STAGED-FOR-PHASE-2-CLOSE.md Item 4 + ANCHOR-BACKFLOW-2026-05-18.md §§ 1-6
- § 5 methodology ← CROSS-PROJECT-MEMORIAL.md Rules 1-7 + COORDINATOR-MEMORIAL.md + WAVE-GATE-05.md
- § 6 parked operator-gate items ← overnight authority memories + NEXT-ROLE.md § 6
- § 7 scope-sizing ← synthesis across §§ 1-6
- § 8 NOT recommended ← anti-scope A15/A13 + SCOPING-MEMO version-freeze

**Integration point failure modes:**
- § 5 Rule 7 propagation: must cite WAVE-GATE-05 forward-flag (Decision 3) as provenance; not invent
- § 5 forward-protection redesign: must cite WAVE-GATE-05 Decision 6 (R36 MAJOR-2, 5th occurrence / 3rd sub-class) as provenance
- § 7 Q-cycle estimates: must be framed as rough ranges, not commitments; must flag operator-decision dependency (sequencing is operator-owned)
- OQ flag: any candidate that raises "which Phase 3 SLICE comes first" or equivalent must be an OQ, not a recommendation

---

## § 3 Acceptance criteria

**AC-R40-1:** Given `PHASE-3-CANDIDATES-PRELIMINARY.md` exists, when its structure is inspected,
then it contains all 8 sections (§ 1 Vendor adapters, § 2 Real-cluster integration, § 3
DeploySignal integration, § 4 Infrastructure, § 5 Methodology evolution, § 6 Parked items,
§ 7 Scope-sizing, § 8 NOT recommended) in that order, each with a section heading.

**AC-R40-2:** Given § 1 (Vendor adapters), when its content is inspected, then all four
TAGGED-FUTURE vendor adapters appear: AMD ROCm + Infinity Fabric / XGMI (`xgmi_peer`),
Google TPU + ICI (`tpu_ici_peer`), AWS Trainium + Neuron Link (`neuron_link_peer`), and
AWS Inferentia; each with a "why this matters" note and a dependency note citing the
WU-03 NVLink + WU-01 Slurm parallel-class pattern.

**AC-R40-3:** Given § 5 (Methodology evolution), when Rule 7 propagation mechanism is listed,
then the WAVE-GATE-05 Decision 3 forward-flag citation appears (not just "Rule 7" in isolation),
and the candidate is framed as a Phase 3 implementation item (not resolved in this inventory).

**AC-R40-4:** Given § 5 (Methodology evolution), when forward-protection mechanism redesign is
listed, then WAVE-GATE-05 Decision 6 appears as provenance (Rule 4, 5th occurrence, 3rd
structurally distinct sub-class), and the candidate is flagged as requiring operator authorization
before structural redesign begins.

**AC-R40-5:** Given § 7 (Scope-sizing analysis), when Q-cycle estimates are stated, then each
estimate is expressed as a rough range (not a precise number) AND at least one dependency
ordering note appears (e.g., vendor adapters depend on real-cluster integration ordering).

**AC-R40-6:** Given § 8 (NOT recommended), when its content is inspected, then A15 multi-region
federation, A13 ML-based attribution, and "any scope requiring SCOPING-MEMO v0.4" each appear
as explicitly not recommended items.

**AC-R40-7:** Given the document as a whole, when any operator-decision-class question (Phase 3
sequencing; SLICE ordering; capability trade-offs) is found, then it is flagged as an OQ in the
text, not resolved by a Implementer-authored recommendation.

**AC-R40-8 (anti-scope diff):** Given the chore-A commit SHA (recorded in NEXT-ROLE.md), when
`git diff <round-start-SHA> HEAD --name-only -- engine/ test/ src/ tools/ CLAUDE-*.md
SCOPING-MEMO* PRD.md` is run, then the output is empty (no files from those paths appear in
the diff).

---

## § 4 Anti-scope

- NO Phase 3 entry / NO Phase 3 SLICE spec authoring
- NO new scoping decisions (operator decides; inventory surfaces)
- NO modification of engine/* or test/* files
- NO modification of CLAUDE-*.md reinforcement files
- NO modification of SCOPING-MEMO-v0.3.md or PRD.md
- NO modification of any Phase 2 deliverable artifact
- NO writes to `~/.claude/CROSS-PROJECT-MEMORIAL.md`
- NO new ANCHOR-BACKFLOW content beyond verifying existing artifact references
- NO operator-gate item dispositions

---

## § 5 Open questions

None — all content questions are resolved by source artifacts. Sequencing/prioritization
questions are surfaced as OQs in the deliverable (per AC-R40-7), not resolved in the spec.

---

## Pre-emit grilling

1. **All claims verifiable?** Yes — every section maps to a named source artifact with a
   specific section or line range.
2. **Unstated assumptions?** One: the WAVE-GATE-05 forward-flag dispositions to R40 (Decision 3
   and 6) are the authoritative Phase 3 methodology candidates; verified by reading WAVE-GATE-05.md
   §§ "Decision 3" and "Decision 6" and § "Cross-project reinforcement rules derived."
3. **Scope beyond request?** No. Document is a DRAFT inventory per NEXT-ROLE.md directive; no
   Phase 3 scoping, no scoping decisions.
4. **Can Reviewer act with zero clarifying questions?** Yes — ACs are structure + content checks
   verifiable by reading the deliverable against the listed source artifacts.
