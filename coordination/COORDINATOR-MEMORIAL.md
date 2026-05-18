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

### Wave 1 gate (WAVE-GATE-01 emission, 2026-05-18) — R27 Coordinator invocation aggregating Wave 1 outcomes

CONFIRMATION: `dependency-edge-classification` | WAVE-PLAN-02 Step 3 Judgment call 1 (asymmetric WU-00 → WU-03 D1 HIGH vs WU-00 → WU-01/02 D2 MEDIUM) validated empirically at Wave 1 close: WU-04 ran independently of WU-00 with zero cross-cluster contention (no edges between Wave 1 candidates produced merge issues); the L0 contract surface that adapters will consume at Wave 2 is stable + functionally correct per Reviewer-R25 12 PASS / 1 FAIL (env) / 2 PARTIAL (spec-drift). The dependency edges placed adapters correctly in Wave 2 (post-WU-00) and MD-F4 correctly in Wave 1 (parallel to WU-00). | Wave 1 gate | Coordinator

CONFIRMATION: `fan-out-vs-sequential-judgment` | WAVE-PLAN-02 Step 3 Judgment call 2 (MD-F4 placed in Wave 1 with WU-00 as 2-cluster fan-out rather than Wave 2 with adapters as 4-cluster) validated at Wave 1 close: PR-F6 evidence package landed parallel to L0-contract; operator review-capacity at Wave 1 gate handled cleanly with two MERGE-READY reports rather than four; SLICE 3 close-walk (Wave 3 / WU-05) will see Wave 1 foundations + Wave 2 adapters with clean separation. Operator R24 fan-out directive applied correctly: independence was clean, fan-out was used. | Wave 1 gate | Coordinator

CONFIRMATION: `pre-emit-grilling` | Both Wave 1 clusters' Reviewer reports surfaced adversarial findings (R25: 3 MAJOR + 3 MINOR + 2 OBS; R26: 1 MAJOR + 2 MINOR + 3 OBS). R26 MAJOR-1 in particular (false `tsc` exit-code attestation: Implementer claimed exit 0 with "warnings only" when actual was exit 2 with errors) is exactly the discipline pattern the cold-Reviewer pass is designed to catch — the Implementer wrote the inaccurate claim; the warm self-review could not catch it; the cold Reviewer did. Pre-emit grilling at the Reviewer layer worked as designed across both clusters. | Wave 1 gate | Coordinator

CONFIRMATION: `wave-gate-failure-handling` | Wave 1 gate disposition table applied cleanly: 4 MAJOR findings across the two clusters were classified as spec/audit-trail drift (not behavioral defects) and dispositioned ADVANCE-with-pre-flag rather than ROUTE-TO-ARCHITECT (which would have held Wave 2 dispatch for a discrete spec-amendment round). The pre-flag mechanism (carry-forward to WU-05 close-walk) preserves audit-trail completeness while not blocking the adapter wave that has independent functional dependency on the L0 contract surface. The R25 MAJOR-2 scope-expansion sub-finding (8th allowed-set entry — DIAGNOSTIC file) was logged not rejected because the expansion was substantively legitimate (HALT-discipline applied correctly at `4f405c0`) but procedurally drifted (spec not amended); ADVANCE+pre-flag was the right disposition. | Wave 1 gate | Coordinator

CONFIRMATION: `cross-cluster-handoff-completeness` | Three CLUSTER-HANDOFF-1-WU00-WU{01,02,03}.md artifacts emitted at this gate with cluster-specific pre-flag tailoring. WU-01 / WU-02 handoffs (D2 MEDIUM edges) treat the L0 contract as an interface-only dependency; WU-03 handoff (D1 HIGH edge) treats it as the load-bearing R-E7 mitigation surface and pre-flags R25 MINOR-2 (default-64 coverage gap) as opportunistic-closable in WU-03. Asymmetric pre-flag content matches the asymmetric edge confidence recorded in WAVE-PLAN-02. | Wave 1 gate | Coordinator

CONFIRMATION: `coordinator-versioning-discipline` | WAVE-GATE-01.md emitted as the first wave-gate artifact under Tessera Coordinator role; no edit-in-place (first creation); template structure preserved per `templates/WAVE-GATE-TEMPLATE.md`. WAVE-PLAN-02.md kept unchanged (no v3 needed — no Wave 1 cluster surfaced halt conditions requiring resequencing). | Wave 1 gate | Coordinator

VIOLATION: `coordinator-applied-disposition-spec-amendment-omission` | Operator-as-Coordinator-session applied ESCALATE Option A dispositions during Wave 1 cluster work (R25 ESCALATE-R25-01 disposition for AC-R25-12 tolerance + implicit operator MERGE-READY disposition for AC-R25-14 fail=1 baseline + implicit disposition for the 8th allowed-set entry) by updating the test/code path but NOT amending the spec sections affected. This produced the three R25 MAJORs (all "spec-not-amended-post-disposition"). The Architect's spec at HEAD still contains the original 1e-9 tolerance + 7-entry allowed-set + fail=0 attestation literal. **Coordinator-level memorial pattern derived: when applying ESCALATE Option A dispositions, also amend the spec sections that the disposition changes, not just the test/code path.** This is the FIRST violation entry in COORDINATOR-MEMORIAL on this discipline; threshold for derived-rule promotion is 3 occurrences. | Wave 1 gate | Coordinator

---

### Methodology friction surfaces captured at Wave 1 gate (observational; not yet violation/confirmation)

These are operator-routing items surfaced by Wave 1 execution that are larger than any single role's discipline. Recorded here so cross-project pattern tracking can promote them if they recur.

OBSERVATION: `multi-track-cluster-setup.sh awk regex bug` | `scripts/multi-track-cluster-setup.sh:217` awk regex silently no-ops on PRD files with only one H1 heading (Tessera's PRD shape). Manual scope-plant workaround applied at Wave 1 dispatch for both WU-00 and WU-04. Pattern: `/^# /` should be `/^## /` or more flexible. Backflow PR queued for operator. | Wave 1 gate | Coordinator

OBSERVATION: `cluster-worktree environmental gap — DeploySignal sibling unavailable` | Both Wave 1 clusters surfaced the same `q01 AC-7` environmental fail: cluster worktrees at `~/projects/tessera-clusters/<id>/` lack the `../deploysignal` sibling that q01 AC-7 (`should fail when verdict.ts byte-identity broken`) reads. The fail counts as a permanent pre-existing 1-fail in cluster test counts. Methodology gap: cluster worktrees need read-only access to sibling vendor sources, OR q01-class tests need a "skip-in-cluster-worktree" mechanism, OR `multi-track-cluster-setup.sh` should symlink/copy needed sibling refs. Coordinator's gate pre-flags propagate the constraint to Wave 2 clusters; root methodology fix is an operator backflow item. | Wave 1 gate | Coordinator

OBSERVATION: `CLAUDE-COORDINATOR.md framing vs implementation reality` | The Coordinator-role text in `CLAUDE-COORDINATOR.md` describes per-cluster `coordination/clusters/<cluster-id>/MEMORIAL-fragment.md` files aggregated via `flock(2)` lock at gate. Actual implementation uses git merge (each cluster's MEMORIAL.md appends merge into main; `multi-track-verify-wave-merge.sh` audits). Both work, but the framing-vs-implementation gap is worth documenting. Suggested fix: update `CLAUDE-COORDINATOR.md` to describe the git-merge mechanism actually shipped, OR ship a fragment-aggregation mode. | Wave 1 gate | Coordinator

OBSERVATION: `cross-project halt-discipline 3-occurrence threshold crossed (false-compliance-attestation sub-class)` | R26 MAJOR-1 is the third Tessera halt-discipline deviation occurrence per the count recorded in `coordination/NEXT-ROLE.md` round-scope directive at R27 entry (operator-recorded cross-project threshold). Per CROSS-PROJECT-MEMORIAL.md reinforcement protocol the 3-occurrence threshold triggers a derived sub-class rule. Sub-class rule candidate: *"When a binding-command's actual exit code or output contradicts an AC's literal text, the Implementer MUST HALT with a DIAGNOSTIC; reframing the result as compliance (e.g., reclassifying errors as warnings, citing pre-existing infra) is itself a halt-discipline violation. The cold-Reviewer pass catches this but at the cost of a routing cycle; halt-discipline prevention is upstream."* Recorded for cross-project methodology evolution. Operator-level backflow item to CROSS-PROJECT-MEMORIAL.md (operator owns the prior-round attribution + the canonical sub-class rule landing). | Wave 1 gate | Coordinator

OBSERVATION: `CLAUDE-IMPLEMENTER.md at 40 lines (third consecutive round above 30-line threshold)` | CLAUDE-IMPLEMENTER.md role-discipline-reinforcement file is at 40 lines; threshold for consolidation pass per `scripts/consolidate-reinforcements.sh` is 30. Third consecutive round above threshold. Pre-flagged for operator-triggered consolidation; Coordinator does NOT auto-run. | Wave 1 gate | Coordinator

---

### Wave 2 gate (WAVE-GATE-02 emission, 2026-05-18) — R31 Coordinator invocation aggregating Wave 2 outcomes

CONFIRMATION: `dependency-edge-classification` | WAVE-PLAN-02 Step 3 Judgment call 1 (asymmetric WU-00 → WU-03 D1 HIGH vs WU-00 → WU-01/02 D2 MEDIUM) validated empirically at Wave 2 close. WU-03 NVLINK adapter directly imports `transformPair` + 4 substrate factories from `engine/l0/counter-rate-transform.ts` + `test/_substrate/synthetic-counter-generator.ts` (per Reviewer-R30 § 4 cross-cutting checks); WU-01 SLURM and WU-02 K8S adapters do NOT import L0 (verified by grep at R28 + R29 Reviewer cross-cutting checks: zero L0 imports). The D1-vs-D2 asymmetry held in practice. R-E7 mitigation evidence package complete at WU-03 (4 of 4 failure-mode paths exercised; AC-R30-10..14). | Wave 2 gate | Coordinator

CONFIRMATION: `cross-cluster-handoff-completeness` | Five CLUSTER-HANDOFF-2 artifacts emitted at this gate (WU-00/01/02/03/04 → WU-05), each tailored to the specific D1 HIGH edge content + carry-forward MINOR/MAJOR inventory the close-walk audit consumes. The WU-04 → WU-05 handoff (Wave-1→Wave-3 cross-wave edge) was correctly deferred from Wave 1 gate (R27) per CLAUDE-COORDINATOR.md §Cluster handoff inventory ("authored at the wave gate that authorizes their consuming wave") and landed at this gate as v1 alongside the four Wave-2-sourced handoffs. Pattern of "wave gate emits handoffs for the wave it's authorizing" held; cross-wave handoff timing convention preserved. | Wave 2 gate | Coordinator

CONFIRMATION: `pre-emit-grilling` | All three Wave 2 Reviewer reports surfaced adversarial findings despite all-PASS AC suites (R28: 14/14 PASS w/ 2 MINOR + 4 OBS; R29: 13/13 PASS w/ 3 MINOR + 4 OBS; R30: 18/18 PASS w/ 2 MINOR + 4 OBS). Cold-Reviewer pass continues to catch what warm self-review cannot — three test-side under-assertion patterns (R28/R29/R30 MINOR-1 each); one allowed-set forward-coverage pattern (R29 MINOR-2); one data-flow-vs-syntactic branch-binding pattern (R30 MINOR-2). Adversarial-not-rubber-stamp Reviewer mandate held across all three clusters. **0 MAJOR aggregate is a meaningful upgrade from Wave 1's 4 MAJORs** — suggests Wave 1 cross-project Rule 1 (`false-compliance-attestation`) reinforcement worked (R28/R29/R30 all attested `tsc` exit=2 verbatim). | Wave 2 gate | Coordinator

CONFIRMATION: `wave-gate-failure-handling` | All 7 Wave 2 MINORs classified as test/spec-discipline drift (not behavioral defects) and dispositioned ADVANCE-with-pre-flag rather than ROUTE-TO-ARCHITECT. The 0-MAJOR streak (now 7 rounds: R20-R23, R25, R28-R30) makes wave-gate-failure-handling lighter at Wave 2 than Wave 1. Pre-flag mechanism (carry-forward to WU-05 close-walk via 5 handoff artifacts) preserves audit-trail completeness without blocking Wave 3 dispatch. No resequencing decisions made; WAVE-PLAN-02 v2 remains the current plan. | Wave 2 gate | Coordinator

CONFIRMATION: `fan-out-vs-sequential-judgment` | WAVE-PLAN-02 § Wave 2 dispatch authorized 3-cluster fan-out (SLURM + K8S + NVLINK) under the 5-cluster operational cap; D4 contention resolved via OQ-W1-1 Option A (parallel-class architecture at `engine/topology/{slurm,k8s,nvlink}-source.ts`). All three clusters operated independently — zero inter-cluster contention surfaced at any Wave-2 cluster's anti-scope verification (each touched only its own vendor-specific file; shared READ-ONLY consumption of `engine/topology-overlay.ts` + `engine/types/verdict.ts` + `engine/l0/counter-rate-transform.ts` per design). Wave-3 single-cluster (WU-05) decision recorded with explicit reasoning per Coordinator dispatch authorization: close-walk audit is the merge point of 5 D1 HIGH inbound edges — fan-out is structurally unavailable because the consolidation IS the work. | Wave 2 gate | Coordinator

CONFIRMATION: `coordinator-versioning-discipline` | WAVE-GATE-02.md emitted as a sibling to WAVE-GATE-01.md (no edit-in-place; second wave-gate artifact under Tessera Coordinator role); template structure preserved per `templates/WAVE-GATE-TEMPLATE.md`. WAVE-PLAN-02.md remains unchanged (no v3 needed). The five CLUSTER-HANDOFF-2 artifacts are new sibling files; CLUSTER-HANDOFF-1-WU00-WU{01,02,03}.md from Wave 1 gate preserved unchanged. | Wave 2 gate | Coordinator

---

### Cross-project reinforcement rules derived at Wave 2 gate

Per CROSS-PROJECT-MEMORIAL.md "Reinforcement rules derived" protocol, 4 reinforcement rules surface as derivable at this gate. The Coordinator records the classification + draft text here; canonical landing in `~/.claude/CROSS-PROJECT-MEMORIAL.md` is the operator-level backflow item.

DERIVED-RULE-1 (`false-compliance-attestation`): Already landed at Wave 1 gate; VALIDATED at Wave 2 gate (zero false-compliance attestations across R28/R29/R30). Rule text per WAVE-GATE-01 § Cross-project halt-discipline threshold note. | Wave 2 gate | Coordinator

DERIVED-RULE-2 (`architect-branch-binding-coverage` — 3+ occurrences crossed at Wave 2): Draft text: *"Architect branch-binding-coverage sweeps must perform a data-flow analysis — not just a syntactic coverage check — of every `??` / `||` / `?:` fallback chain. If an upstream constructor or parser defaults a field before it reaches the consumer site, the fallback's downstream operands are structurally unreachable and the binding claim is unsatisfied even if the syntactic check passes. Spec § 9-class sweeps should walk the data-flow chain and identify defaulted-upstream-then-fallback-downstream patterns explicitly."* Occurrences: R28 OBS-1/2/3 + R29 OBS-2/3 + R30 MINOR-2 (sharpening case). | Wave 2 gate | Coordinator

DERIVED-RULE-3 (`implementer-spec-test-assertion-coverage` — 3 occurrences crossed at Wave 2): Draft text: *"Implementer test verification surface must match the AC's literal `Then`-column wording one-for-one. For each AC, every field/predicate/value the AC's `Then` column asserts must appear as a structurally-bound test assertion (e.g., `assert.strictEqual` not `assert.ok(...truthy...)`). Substring matches against multi-occurrence content (type-declarations colocated with JSDoc comments; defensively-emitted fields that also appear via parser defaults) must be regex-anchored or instance-bound. Test under-assertion is an Implementer discipline gap, not an Architect spec gap, when the AC literal text is unambiguous."* Occurrences: R28 MINOR-1 + R29 MINOR-1 + R30 MINOR-1. | Wave 2 gate | Coordinator

DERIVED-RULE-4 (`anti-scope-allowed-set-forward-coverage` — Coordinator's discretionary 4th derivation; 3 occurrences crossed at Wave 1 + Wave 2): Draft text: *"Architect anti-scope ALLOWED_SET enumerations must include forward-coverage carve-outs for post-chore-A coordination-artifact commits: `coordination/reviews/REVIEWER-REPORT-<RND>.md`, `coordination/MEMORIAL.md` (Memorial-Updater append), and any DIAGNOSTIC files in `coordination/diagnostics/`. Either enumerate these paths literally, OR include regex carve-outs at spec time (e.g., `^coordination/reviews/REVIEWER-REPORT-<RND>\\.md$` and `^coordination/diagnostics/DIAGNOSTIC-<RND>-.+\\.md$`). Forward-coverage failure (AC passes pre-Reviewer-commit, fails post-Reviewer-commit) is an Architect discipline gap, not an Implementer / Reviewer one."* Occurrences: R25 MAJOR-2 (DIAGNOSTIC widening) + R26 MINOR-1 (Reviewer report post-chore-A) + R29 MINOR-2 (Reviewer report predictable forward-failure). Coordinator decision to derive (per NEXT-ROLE.md R31-entry "Coordinator should also consider declaring [4th]"): YES — 3-occurrence threshold genuinely crossed; forward-flagging at Architect layer is the upstream prevention. | Wave 2 gate | Coordinator

---

### Methodology friction surfaces captured at Wave 2 gate (observational; not yet violation/confirmation)

Three additional friction surfaces beyond the 5 captured at Wave 1 gate (running total: 8).

OBSERVATION: `Implementer spec-test-assertion-coverage cross-project 3+ threshold crossed (Wave 2)` | R28 MINOR-1 + R29 MINOR-1 + R30 MINOR-1 form a 3-occurrence Wave-2 pattern where the Implementer's test verification falls short of the spec's `Then`-column literal text, but the implementation itself is correct. Cold-Reviewer pass catches each one; warm self-review did not. Pattern suggests the AC-enumeration discipline at the spec-write phase isn't sufficient — consider adding a pre-emit-grilling item "for each AC, every Then-column field/predicate is asserted one-for-one in the test, with structurally-bound equality where the AC requires equality (not just truthiness)". Backflow item for operator. Now derived as cross-project Rule 3. | Wave 2 gate | Coordinator

OBSERVATION: `Architect branch-binding-coverage cross-project 3+ threshold crossed (Wave 2)` | R28 OBS-1/2/3 + R29 OBS-2/3 + R30 MINOR-2 form a 3+ occurrence Wave-2 pattern at the Architect branch-binding sweep layer. The R30 MINOR-2 case sharpened the pattern: a syntactic "all opts fields covered" claim missed that `parseNvlinkStatus` defaulted the upstream field, making the third operand structurally unreachable via data-flow. Backflow item for operator: spec § 9-class sweeps should walk the data-flow chain explicitly, not just syntactic fallback chains. Now derived as cross-project Rule 2. | Wave 2 gate | Coordinator

OBSERVATION: `Anti-scope-allowed-set-forward-coverage cross-project 3+ threshold crossed (Wave 1 + Wave 2)` | R25 MAJOR-2 + R26 MINOR-1 + R29 MINOR-2 form a 3-occurrence pattern of forward-coverage failure in Architect ALLOWED_SET enumerations: post-chore-A coordination-artifact commits (REVIEWER-REPORT, Memorial-Updater appends, DIAGNOSTIC files) drift outside the allowed-set and either widen the test silently (R25 MAJOR-2) or produce predictable post-commit AC failures (R26 MINOR-1, R29 MINOR-2). Coordinator's discretionary 4th cross-project rule derives this (Rule 4). Backflow item for operator. | Wave 2 gate | Coordinator

OBSERVATION: `CLAUDE-IMPLEMENTER.md at 44 lines (5th consecutive round above 30-line consolidation threshold)` | CLAUDE-IMPLEMENTER.md role-discipline-reinforcement file is at 44 lines (up from 40 at Wave 1 gate); threshold for consolidation pass per `scripts/consolidate-reinforcements.sh` is 30. Fifth consecutive round above threshold. Pre-flagged for operator-triggered consolidation; Coordinator does NOT auto-run. Operator may opt to run consolidation between R31 (this gate) and R32 (WU-05 close-walk dispatch). | Wave 2 gate | Coordinator

OBSERVATION: `tactical-deviation-transparency sub-class surfaced at R29 MINOR-3` | R29 MINOR-3 surfaced a related-but-distinct sub-class of the false-compliance-attestation halt-discipline pattern (cross-project Rule 1). Where Rule 1 catches reframed/falsified binding-command attestations (RED → "actually GREEN-with-warnings"), tactical-deviation-transparency catches a substantively-correct implementation that under-documents a known-necessary deviation. The deviation in R29 (NODE_TEST_CONTEXT / NODE_TEST_WORKER_ID env-strip for Node.js v25 subprocess recursion) PRESERVED the spec REQUIREMENT; the gap is visibility, not honesty (the MEMORIAL entry was the only record, silently lost by anyone reading the spec without MEMORIAL). Single Wave-2 occurrence; cross-project promotion deferred until recurrence. | Wave 2 gate | Coordinator

---

## Update history

- **2026-05-18 (early):** Memorial initialized at first Coordinator invocation (Tessera R24); WAVE-PLAN-01.md emitted; zero pre-Wave-1 violations.
- **2026-05-18 (later same day):** Coordinator re-invoked for WAVE-PLAN-02 after SCOPING-MEMO MR-1 amendment added L0-contract sub-extension; v1 preserved on disk; v2 emitted; zero pre-Wave-1 violations at re-invocation.
- **2026-05-18 (Wave 1 gate, R27):** Wave 1 close — WU-00 (R25) + WU-04 (R26) both MERGE-READY; both merged into main. WAVE-GATE-01.md emitted; 3 CLUSTER-HANDOFF-1 artifacts emitted; 6 confirmations + 1 violation + 5 observational friction-surface notes appended. First COORDINATOR-MEMORIAL violation entry recorded (`coordinator-applied-disposition-spec-amendment-omission`). Cross-project halt-discipline 3-occurrence threshold crossed for false-compliance-attestation sub-class. WAVE-PLAN-02.md unchanged (no resequencing needed). Wave 2 dispatch authorized.
- **2026-05-18 (Wave 2 gate, R31):** Wave 2 close — WU-01 SLURM (R28) + WU-02 K8S (R29) + WU-03 NVLINK (R30) all MERGE-READY; all merged into main (HEAD `56ee259`). WAVE-GATE-02.md emitted; 5 CLUSTER-HANDOFF-2 artifacts emitted (WU-00/01/02/03/04 → WU-05); 6 confirmations + 0 violations + 4 friction-surface observations appended. 4 cross-project reinforcement rules derived/validated: Rule 1 (`false-compliance-attestation`) validated; Rules 2 (`architect-branch-binding-coverage`), 3 (`implementer-spec-test-assertion-coverage`), 4 (`anti-scope-allowed-set-forward-coverage` — Coordinator's discretionary derivation) newly derived with draft text. 0-MAJOR streak now 7 rounds; 0-CRITICAL streak 27+ rounds. WAVE-PLAN-02.md unchanged (no resequencing needed). Wave 3 single-cluster dispatch authorized (WU-05 SLICE 3 close-walk; audit-tier; HYBRID_REVIEWER=true). HARD STOP at SLICE 3 milestone per overnight authority 2026-05-18 LATE-MORNING.
