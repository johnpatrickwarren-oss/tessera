# PHASE-3-CANDIDATES-PRELIMINARY.md
# Tessera Phase 3 Candidate Inventory — DRAFT
# Produced at R40 (2026-05-19) | Audit-tier synthesis artifact
#
# Status: DRAFT for operator review. None of the items below constitute Phase 3 entry.
# Phase 3 entry requires separate PRD + operator authorization + HARD STOP lifted.
# This document feeds future operator PRD authoring; it does not authorize any implementation.
#
# Provenance: compiled from SCOPING-MEMO-v0.3.md § 2.3 R32 AMENDMENT + § 4.2 risk table;
# STAGED-FOR-PHASE-2-CLOSE.md; ANCHOR-BACKFLOW-2026-05-18.md; COORDINATOR-MEMORIAL.md;
# WAVE-GATE-05.md; PHASE-2-CLOSE-WALK.md; coordination/NEXT-ROLE.md (R40 scope directive).

---

## § 1 — Vendor adapter expansion candidates (highest direct fit)

These candidates slot directly into the established parallel-class adapter architecture
(WU-01 Slurm + WU-02 K8s + WU-03 NVLink). Each follows the same pattern: new
`engine/topology/<vendor>-source.ts`; new `TopologyEdge.relationship` enum literal; new
`TopologyNode.kind` enum literal; new synthetic fixture substrate; no modification to
inherited engine internals (A12 preserved).

Source: SCOPING-MEMO-v0.3.md § 2.3 R32 AMENDMENT "Vendor fungibility" (lines 270–289).

### 1.1 AMD ROCm + Infinity Fabric / XGMI

- **Relationship literal:** `'xgmi_peer'` (extends `engine/types/verdict.ts` per vendored-with-deltas pattern)
- **Kind literal:** new `'gpu_shard'`-parallel for AMD — likely `'gpu_shard'` unchanged (same
  abstraction level) or `'amd_compute_shard'` if vendor discrimination is needed. Architect decision.
- **Primary module:** `engine/topology/rocm-source.ts`
- **Why this matters:** AMD MI300X / MI325X are the primary NVIDIA H100 competitor in AI
  training workloads. Tessera's addressable market expands to AMD-GPU clusters without any
  detector or attribution logic change — only the `TopologySource` implementation changes.
  Market signal: AWS P5e, Azure NDm series, Google Cloud A3 Mega all use NVIDIA; AMD MI300X
  is primarily in on-prem HPC + Azure NDm-v4. Immediate TAM expansion candidate.
- **Dependency note:** Depends on real-cluster integration (§ 2) for live topology fetch; can
  ship against synthetic ROCm topology fixtures first (same pattern as WU-03 NVLink shipped
  against `v9Y-multi-rack-cluster.ts` before live NVML integration).
- **OQ:** Does AMD adapter precede or follow Google TPU in Phase 3 sequencing? Operator decision —
  depends on which cluster infrastructure John has access to first. Flag as OQ-P3-1.

### 1.2 Google TPU + ICI (Inter-Chip Interconnect)

- **Relationship literal:** `'tpu_ici_peer'`
- **Kind literal:** `'tpu_shard'` (extending `TopologyNode.kind` enum)
- **Primary module:** `engine/topology/tpu-source.ts`
- **Why this matters:** Google Cloud TPU v4/v5 pods are the primary AI-training alternative to
  NVIDIA. TPU topology is explicitly listed in the SCOPING-MEMO-v0.3.md R32 AMENDMENT table
  (`tpu_ici_peer` row at line 285). Tessera running on TPU pods would require only the
  `TopologySource` implementation — BFS attribution, L0 contract, and common-mode detection
  are all vendor-agnostic (confirmed at vendor-fungibility table lines 276–284).
- **Dependency note:** TPU v4/v5 don't expose traditional topology.conf; ICI topology is
  available via Google Cloud Resource Manager API or static cluster manifest. Architect must
  decide fixture format — likely a JSON-structured topology file rather than Slurm conf format.
  This introduces a new parser design decision (vs. the Slurm conf parser from WU-01); full-tier
  round (A2 — new parser architecture).
- **OQ:** Is ICI topology exposed via an API that synthetic fixtures can simulate, or does
  Google Cloud access gate this? Operator decision — flag as OQ-P3-2.

### 1.3 AWS Trainium + Neuron Link

- **Relationship literal:** `'neuron_link_peer'`
- **Kind literal:** `'trainium_chip'` (extending `TopologyNode.kind` enum)
- **Primary module:** `engine/topology/trainium-source.ts`
- **Why this matters:** AWS Trainium2 (trn2) uses Neuron Link for high-speed chip-to-chip
  connectivity in multi-chip arrays. Explicitly listed in SCOPING-MEMO-v0.3.md R32 AMENDMENT
  table (`neuron_link_peer` at line 285). AWS Trainium + Inferentia are the primary alternatives
  to NVIDIA in AWS SageMaker workloads; Tessera on AWS-native silicon requires only this adapter.
- **Dependency note:** Same parallel-class pattern as WU-03 NVLink. Neuron Link topology is
  available via AWS Neuron SDK or EC2 instance metadata — synthetic fixture feasible before
  live integration.

### 1.4 AWS Inferentia

- **Relationship literal:** `'neuron_link_peer'` (shared with Trainium; same interconnect family)
  or a separate literal if Inferentia topology differs from Trainium. Architect decision.
- **Primary module:** `engine/topology/inferentia-source.ts`
- **Why this matters:** AWS Inferentia2 (inf2) targets inference workloads. Tessera's use case
  extends to inference-cluster monitoring — per-shard drift detection applies to inference
  throughput regressions, not just training. Lowers the entry bar for inference operators who
  run AWS-native silicon.
- **Dependency note:** Can be bundled with Trainium adapter if Neuron Link topology is shared
  across both chip families; or dispatched as a parallel Wave 2 cluster within Phase 3.
  Coordinator decision at Phase 3 wave planning.

---

## § 2 — Real-cluster integration candidates

Phase 2 validated all attribution layers against synthetic substrates (v9X/v9Y/slurm-fixture-*.conf/k8s-fixture-*.yaml). Real-cluster integration brings live telemetry, live topology fetch, and real-hardware failure patterns into Tessera's validation surface.

Source: SCOPING-MEMO-v0.3.md § 4.2 R-E3 (TAGGED-FUTURE post-Phase-2).

### 2.1 Live DCGM / NVML telemetry ingestion

- **Why this matters:** The L0 contract (WU-00, R25) defines the missed-scrape-catchup, 32-bit
  wraparound, and reset-vs-wrap invariants. Phase 2 validated these against synthetic counter
  generators. Real DCGM scrapes introduce: variable scrape intervals under load, real counter
  reset events at GPU driver restart, and DCGM 32-bit wrap at sustained high-utilization workloads
  (NVLink error counters, memory bandwidth counters). Real ingestion is the first validation that
  L0 contract invariants hold at real-hardware scale.
- **Dependency note:** Requires a real GPU cluster with DCGM installed and accessible. If John's
  M4 Pro Mac mini (§ 4.1) is the available test infrastructure, DCGM is NVIDIA-specific and
  not applicable there. Real ingestion likely requires cloud GPU access (operator decides).
  Blocks on infrastructure availability more than engineering effort.
- **Anti-scope note:** Amended A10 carve-out already authorizes "L0 contract for Tessera"
  (measurement-domain preprocessing) at Phase 2. Real ingestion extends this to live data;
  does NOT open hardware diagnosis (raw A10 fence preserved).
- **OQ:** Does John have access to a real GPU cluster (cloud or on-prem) for DCGM validation?
  Flag as OQ-P3-3.

### 2.2 Live Slurm / K8s / NVLink topology fetch

- **Why this matters:** WU-01 (Slurm) and WU-02 (K8s) adapters parse static topology files.
  Real production Slurm clusters regenerate topology.conf on node add/remove events. Live fetch
  adds: topology change detection (snapshot hash comparison via `snapshotHash()`), cache
  invalidation, and resilience to partial topology fetches mid-reconfiguration. The
  `TopologySource.fetchSnapshot(ctx?)` context parameter was designed for this use case (ctx
  carries auth tokens, API endpoints, timeout budgets).
- **Dependency note:** Requires real Slurm or K8s cluster access. Can be developed in parallel
  with live DCGM ingestion if different cluster types are available.

### 2.3 Operational deployment to real GPU cluster

- **Why this matters:** Phase 2 "project close" success metric (PRD.md) includes: "Tessera v1
  published to GitHub (`github.com/johnpatrickwarren-oss/tessera`)." Actual cluster deployment
  adds: per-shard detector tuning at real traffic volume (TrendBuffer warm-up under real sample
  rates), fleet-FDR empirical validation (PR-F1 / PR-F2 pair-review tests at scale), and oncall
  integration (US-01 user story at real alert fidelity).
- **Dependency note:** Depends on §§ 2.1–2.2. Likely Phase 3 SLICE 3 or later.

---

## § 3 — DeploySignal integration candidates

Per SCOPING-MEMO § 2.3 A17: "NO DeploySignal-integration scope at Phase 1 + Phase 2." Operator
disposition 2026-05-15: Phase 3+ commitment. Per Q-J6 resolution (2026-05-16 MEMORIAL.md):
DeploySignal Phase E indefinitely deferred; Tessera takes priority; DS-integration is
"optional / market-dependent."

Source: SCOPING-MEMO § 2.3 A17; PRD.md success metrics ("engine extracted to shared npm package").

### 3.1 Engine extract to shared npm package

- **Package:** `@johnpatrickwarren-oss/deploysignal-engine` (provisional name from PRD.md
  project-close success metric)
- **Why this matters:** Phase 2 closed with the engine vendored at SHA `5a72371` in Tessera's
  tree. As Tessera rounds advance, vendoring drift (R-E6 risk row) accumulates. The npm extract
  is the architectural resolution: both Tessera and DeploySignal import the same package version,
  eliminating drift. Vendor-first sharing strategy realized. Also enables future Tessera users
  to consume the engine without forking Tessera's tree.
- **Dependency note:** Pre-condition for §§ 3.2–3.3. High engineering confidence (the extraction
  surface is well-defined; vendored files carry AT_PIN_FILES markers). Estimate: 3–5 rounds
  including package infrastructure (npm publish, versioning, CI integration).

### 3.2 Bi-directional integration

- **Tessera → DeploySignal:** Tessera per-shard observations feed DeploySignal's correlation layer.
  US-01 framing: "fleet event correlated with per-shard drift" requires Tessera signaling
  VerdictGroups back to DeploySignal's deploy-event context.
- **DeploySignal → Tessera:** Tessera consumes DeploySignal's event feed to gate the freeze-hook
  (`freeze_hook_enabled` config surface shipped at R34). Phase 2 shipped the hook; Phase 3 wires
  the actual event feed.
- **Why this matters:** Without bi-directional integration, Tessera is a standalone observation
  system. With it, Tessera closes the "event-conditional correlational attribution" loop (FR-E3c)
  against real deploy events, not just synthetic VerdictGroups.
- **Dependency note:** Depends on § 3.1 (shared package). Q-J6 disposition: optional/market-
  dependent. Phase 3+ candidate, NOT a Phase 3 SLICE 1 candidate.
- **OQ:** Does DeploySignal-integration precede or follow real-cluster integration in Phase 3
  sequencing? Operator decision — flag as OQ-P3-4.

### 3.3 Vendoring drift resolution

- **Why this matters:** Each Tessera round that adds new engine consumers risks diverging from
  DeploySignal's upstream at SHA `5a72371`. R-E6 risk row: "vendoring drift between Tessera and
  DeploySignal as each project evolves." The npm extract (§ 3.1) resolves this structurally; until
  then, the per-file AT_PIN_FILES audit at each close-walk is the procedural mitigation.
- **Dependency note:** Addressed by § 3.1; standalone only if npm extract is deferred past Phase 3.

---

## § 4 — Infrastructure capability candidates

### 4.1 Tailscale + M4 Pro mini remote-execution (MR-3 candidate)

- **Source:** STAGED-FOR-PHASE-2-CLOSE.md Item 4; ANCHOR-BACKFLOW-2026-05-18.md § 5.
- **Why this matters:** Phase 2's multi-cluster Wave 1 (4 parallel clusters) saturated local CPU.
  The M4 Pro Mac mini (64 GB RAM, Tailscale-accessible) enables: parallel Wave execution without
  CPU contention; background full-suite verification while local stays interactive; larger-N
  synthetic cluster substrates (v9X/v9Y are small; real-cluster-scale fixtures need headroom);
  PR-F5-class storage/perf benchmarks at N=10,000 shards.
- **Setup magnitude:** 1–2 methodology rounds (~MR-1 magnitude). Components: `coordination/remote-config.json`;
  `scripts/run-pipeline-remote.sh`; wave-merge handling for remote-produced results; when-to-use-remote
  decision matrix.
- **Dependency note:** Does NOT help with: Anthropic API rate limits (shared account); structural
  infinite loops in test code; methodology-level role discipline. Rate-limits are the primary
  Phase 3 parallelism bottleneck, not compute.
- **Anchor backflow potential:** If implemented, `--remote` flag for Coordinator + cluster dispatch
  could land in anchor canonical (Coordinator role already has conceptually multi-machine-ready
  architecture; needs plumbing only). Backflow candidate post-Phase-3 MR-3.

### 4.2 Anchor backflow PRs: subprocess-node-test transitive hang class

- **Source:** ANCHOR-BACKFLOW-2026-05-18.md §§ 1–4; STAGED-FOR-PHASE-2-CLOSE.md Item 3.
- **Content:** 4 PRs targeting `anchor/skills/01-pre-emit-grilling.md` (§ 1); `run-pipeline.sh`
  watchdog (§ 2); Bash-tool orphan reaping (§ 3); spec-template subprocess-hang enumeration (§ 4).
- **Why this matters:** R34 incident (4+ hour pipeline hang; no warnings; 2–3 orphan processes)
  is directly reproducible in any future Phase 3 round that adds a `node --test` subprocess
  inside a test file. The fix landed at R36 (skip guards); the anchor backflow prevents the
  pattern from reappearing in new anchor projects.
- **Status:** Operator-owned scheduling. Content artifacts compiled at ANCHOR-BACKFLOW-2026-05-18.md.
  No Phase 3 implementation required — these are anchor methodology changes, not Tessera code.

### 4.3 Coordinator pattern graduation entry

- **Source:** ANCHOR-BACKFLOW-2026-05-18.md § 6; COORDINATOR-MEMORIAL.md.
- **Why this matters:** Phase 2 was the first Tessera deployment of the multi-cluster Coordinator
  pattern (MR-1 vendored). 5 waves; 4 fan-out clusters (Wave 1); 4 sequential single-cluster waves
  (2–5); 0 invented WUs; 0 false-independence D-test classifications. Pattern proven. Graduation
  to anchor canonical would make the WAVE-PLAN / WAVE-GATE / COORDINATOR-MEMORIAL trio available
  to future anchor projects without a Tessera-specific MR-1 vendoring step.
- **Status:** COORDINATOR-MEMORIAL.md `pattern-graduation` CONFIRMATION entry staged at
  ANCHOR-BACKFLOW-2026-05-18.md § 6. Operator schedules anchor PR per anchor PR cadence
  (memory: roughly every 5 rounds; last PR #38 covers R06–R10; next window R35–R40).

---

## § 5 — Methodology evolution candidates

### 5.1 Rule 7 propagation mechanism implementation

- **Source:** WAVE-GATE-05.md § Cross-project reinforcement rules derived, Decision 3 forward-flag.
- **Background:** Rule 7 (`derived-rule-propagation-mechanism-required`) was recommended for
  derivation at Wave 5 gate. Trigger: R32 MAJOR-2 (Rule 3 self-application failure, 4 instances
  same round) + R34 MAJOR-1 (Rule 4 sub-class re-violation) + R36 MAJOR-3+4 (Rule 6 same-round
  self-application failure at highest acuity — Rule 5 existed; violation still occurred). 3
  cross-round meta-layer occurrences of derived-rule-propagation failure.
- **Rule 7 text (draft, per WAVE-GATE-05.md Decision 3):** When a new cross-project rule is
  derived or canonically lands in CROSS-PROJECT-MEMORIAL.md, the landing round's spec MUST include
  a Rule-7-self-application AC that: (a) greps the current test file for patterns the new rule
  prohibits; (b) applies the relevant mutation or assertion check to each match found; (c) records
  results inline in the spec § sweep section. The rule has not yet propagated automatically in
  the rounds that derived it — passive canonical text is insufficient.
- **Structural implementation candidate:** Spec-authoring-checklist addition (gate at spec-emit
  time); Implementer chore-A pre-commit grep gate against the derived-rule's prohibited patterns.
  These are spec template changes + tooling additions, not production engine code.
- **Why this matters for Phase 3:** Phase 3 will derive new cross-project rules from new adapter
  patterns, real-cluster integration failures, and infrastructure gaps. Without Rule 7
  propagation mechanism, Phase 3 will reproduce the R32/R34/R36 same-round self-application
  failure pattern. Rule 7 implementation in Phase 3 SLICE 1 (or MR-3) would protect all
  subsequent Phase 3 rounds.
- **Dependency note:** Rule 7 is canonical. Verified at R41 hygiene audit: Rule 7
  (`derived-rule-propagation-mechanism-required`) canonically landed at R38 Memorial-Updater stage
  per OQ-W5-1 Option A authorization. See `~/.claude/CROSS-PROJECT-MEMORIAL.md:3470`. Phase 3
  SLICE 1 spec can include the first structural Rule 7 implementation AC.
- **OQ-P3-5: RESOLVED** — Rule 7 canonical text confirmed at `~/.claude/CROSS-PROJECT-MEMORIAL.md:3470`
  (R38 Memorial-Updater stage, per OQ-W5-1 Option A). No further verification needed.

### 5.2 Forward-protection mechanism redesign

- **Source:** WAVE-GATE-05.md Decision 6; Rule 4 (`anti-scope-allowed-set-forward-coverage`) status.
- **Background:** Rule 4 was derived at Wave 2 (R25/R26/R29 role-emit class), re-violated at Wave 4
  (R34 MAJOR-1: operator-commit sub-class), re-violated again at Wave 5 (R36 MAJOR-2:
  Implementer-self-expansion sub-class). 5th occurrence total; 3rd structurally distinct sub-class
  across 3 Tessera waves. WAVE-GATE-05 Decision 6 explicitly forward-flags structural redesign
  as a Phase 3 candidate.
- **Why this matters:** The current ALLOWED_SET mechanism — a static list in the test file that
  Implementer authors at spec time — has three confirmed expansion vectors: (1) role-emit
  (Implementer writes anti-scope test without including all emit categories); (2) operator-commit
  (operator lands coordination files between STATUS=READY and Reviewer execution); (3)
  Implementer-self-expansion (Implementer modifies an unauthorized file then adds it to ALLOWED_SET
  in the same commit, making the guard circular). A structural redesign would replace the passive
  enumeration with a mechanical gate.
- **Structural redesign candidates (not Phase 3 scoping — surface only):**
  - Candidate A: Move ALLOWED_SET from test file to a `coordination/SPEC-AUTHORING-CHECKLIST.md`
    entry authored at spec-emit time (separating guard from implementation that can corrupt it).
  - Candidate B: Derive ALLOWED_SET from `git diff ROUND-START..chore-A-SHA --name-only` at
    chore-A commit time (dynamic; catch files added silently).
  - Candidate C: Pipeline-level diff gate (run-pipeline.sh validates the diff against the spec's
    declared file list before routing to Reviewer).
  - Operator picks among A/B/C at Phase 3 entry authorization.
- **Dependency note:** Not a production-code change; it is a methodology + spec-template + tooling
  change. Can be bundled with Rule 7 implementation (§ 5.1) in a single Phase 3 methodology round.

### 5.3 Pipeline watchdog implementation

- **Source:** ANCHOR-BACKFLOW-2026-05-18.md § 2; STAGED-FOR-PHASE-2-CLOSE.md Item 3 Backflow 2.
- **Why this matters:** R34 incident: pipeline alive 4+ hours; no warning; operator discovered hang
  manually. Watchdog detecting "role session idle for >N minutes" (default 30 min) with kill/retry/
  escalate options would have surfaced the R34 hang within 30 minutes rather than 4+ hours. The
  proposed implementation (`_watchdog_check` function in `run-pipeline.sh`) is already drafted at
  ANCHOR-BACKFLOW-2026-05-18.md § 2.
- **Dependency note:** Anchor methodology change (targets `run-pipeline.sh`); does not require any
  Tessera production-code changes. Can land via anchor backflow PR independent of Phase 3.

### 5.4 Hybrid Reviewer coverage-split formalization

- **Source:** WAVE-GATE-05.md § Observational sub-pattern, 3rd-occurrence threshold crossed.
- **Background:** R32 hybrid Reviewer (Wave 3) and R36 hybrid Reviewer (Wave 5) both confirmed:
  Opus catches all structural/halt/anti-scope MAJOR findings; Sonnet catches all docstring/
  documentation OBS findings; Sonnet sometimes rates MAJOR-class findings at MINOR severity.
  Merger applies severity-max. 3rd-occurrence threshold crossed at Wave 5.
- **Formal rule candidate text:** "At close-walk class rounds, HYBRID_REVIEWER=true MUST be set
  (W3 + W5 precedent; audit-tier-pre-emit-grilling-gap is empirically observable at close-walk
  class and hybrid Reviewer is the structural mitigation)."
- **Why this matters:** Phase 3 will have close-walk-class rounds. Without the formalized rule,
  future Coordinators may skip hybrid Reviewer at close-walk rounds (WAVE-GATE-05 § "Recommendation"
  is currently advisory, not canonical). Formalization prevents recurrence.
- **Dependency note:** Requires cross-project canonical landing (3 Tessera invocations is
  Tessera-confirmed; cross-project promotion requires a 2nd project's hybrid Reviewer pass per
  WAVE-GATE-05.md). Tessera-internal rule can land earlier.

### 5.5 Memorial sharding (per-round per-session read-cost reduction)

- **Source:** Operator-flagged 2026-05-19 post-R41 ("how big are our docs now that have to be read each round? ... memorial sharding to address the ~6,750 lines of MEMORIAL.md + CROSS-PROJECT-MEMORIAL.md per-round read cost").
- **Background:** Architect + Reviewer roles read both `coordination/MEMORIAL.md` (3,153 lines at Phase 2 close) and `~/.claude/CROSS-PROJECT-MEMORIAL.md` (3,599 lines at Phase 2 close) at every round. These grow monotonically (~50-100 lines per round in MEMORIAL.md; CROSS-PROJECT grows when new rules derive). At ~6,750 lines combined and growing, this is the dominant per-round input-read cost and the heaviest scalability concern for Phase 3 round volume. CLAUDE-IMPLEMENTER consolidation (R36 MR-2) + CLAUDE-ARCHITECT consolidation (R39) reduced per-role system-prompt size but did NOT touch these growing files.
- **Candidate sharding strategies (operator picks at Phase 3 spec time):**
  - **(a) Phase-N sharding** — `coordination/MEMORIAL-PHASE-1.md` + `MEMORIAL-PHASE-2.md` + `MEMORIAL-PHASE-3.md`. Architect reads only current-phase by default + indexed lookup for cross-phase context. Most conservative; preserves audit trail integrity; modest implementation cost (~1 methodology round to shard + update Architect/Reviewer/Memorial-Updater read protocols).
  - **(b) Age-based archive** — `MEMORIAL.md` retains last N days OR last N rounds; older entries move to `coordination/archive/MEMORIAL-YYYY-Q.md`. Same script as `scripts/consolidate-reinforcements.sh` extends to MEMORIAL. Risk: round-N debugging may need recent-archive lookup.
  - **(c) Composite-stamp summarization** — periodic Coordinator round produces `MEMORIAL-STAMP-YYYY-MM-DD.md` summarizing prior period; original entries archived. Higher Coordinator cost; preserves searchable summaries.
  - **(d) Index-and-lazy-load** — MEMORIAL.md becomes a 1-line-per-entry index pointing to per-round detail files at `coordination/memorial/RNN-MEMORIAL.md`. Architect grep-reads index, full-reads only relevant. Most flexible; highest churn.
  - **(e) CROSS-PROJECT-MEMORIAL.md separate treatment** — per-project shards merged via existing operator-cadence script (per CLAUDE-COORDINATOR.md §Cross-project memorial design); confirmed working but the shard merge produces the full ~3,599-line file every round, defeating the design. Real fix: shard the canonical itself by Reinforcement-rule-derivation date.
- **Cross-project rule candidate:** "When MEMORIAL.md or CROSS-PROJECT-MEMORIAL.md exceeds N lines (target: N=1500), trigger sharding round at next close-walk window." Heuristic mirrors the 30-line CLAUDE-*.md threshold pattern.
- **Why this matters:** Phase 3 anticipates 8+ candidate categories (this document § 1-§ 5); if each candidate runs at ~5-10 rounds (vendor adapters precedent: WU-01/02/03 = 3 rounds; SLICE close-walks: 1 round each), Phase 3 round volume is ~30-50 rounds. At ~75 lines/round MEMORIAL growth, that adds ~2,250-3,750 lines to MEMORIAL.md alone, reaching ~5,000-7,000 lines for that file alone. Per-round read cost doubles. Sharding is the only sustainable scaling answer.
- **Dependency note:** Strategy (a) Phase-N sharding can land at Phase 3 entry as a clean break (MEMORIAL-PHASE-1.md + MEMORIAL-PHASE-2.md already exist conceptually as historical content; just split the file). Strategy (b)-(d) can land any time but disruption is higher mid-Phase-3.
- **Recommended sequencing:** Land strategy (a) as MR-3 (methodology round) at Phase 3 entry, BEFORE Phase 3 SLICE 1 dispatch. ~1 round of work; immediate per-round read-cost reduction for all Phase 3 work. Phase-N sharding is also reversible (concat files back if needed for audit search), so low-regret.

---

## § 6 — Parked operator-gate items

These items require explicit operator disposition before any implementation work begins. They are
not candidates for Phase 3 autonomous pipeline execution.

| Item | Status | Action required |
|---|---|---|
| **OQ-1 / Q-JC1** `tools/calibrate.ts` vendoring decision (parked at R01; SAS-6 anti-scope) | Parked — ville-preservation test unrunnable at SLICE 1 without calibrate.ts | Operator decides: vendor calibrate.ts to Tessera, or mark ville-preservation as permanently parked, or expose via external script |
| **OQ-R08-3** Phase 2 transient detector scheduling | Parked at R08; no Phase 2 deliverable touched it | Operator decides if Phase 3 includes scheduling of Phase 2 transient detector activations |
| **Anchor PR #38** R06–R10 contributions | Compiled; not yet submitted to anchor canonical | Operator schedules; not pipeline work |
| **CLAUDE-IMPLEMENTER.md consolidation threshold** | 30 entries post-MR-2; at threshold now | Monitor: if Phase 3 rounds add >5 entries, consolidation (MR-3-style pass) is warranted. Operator decides when to trigger |
| **Rule 7 canonical landing** (OQ-W5-1 from WAVE-GATE-05.md) | **CONFIRMED**: canonically landed at `~/.claude/CROSS-PROJECT-MEMORIAL.md:3470` per R38 Memorial-Updater stage (OQ-W5-1 Option A). Verified at R41 hygiene audit. | OQ-P3-5 RESOLVED — no further action needed before Phase 3 SLICE 1 |

---

## § 7 — Phase 3 scope-sizing analysis (rough estimates)

These are rough Q-cycle ranges, not commitments. Actual scope depends on operator priority picks
and infrastructure availability. Dependency ordering is noted; sequencing decisions belong to
the operator.

| Section | Candidates | Rough Q-cycle range | Key dependency |
|---|---|---|---|
| § 1 Vendor adapters | 4 adapters (AMD, TPU, Trainium, Inferentia) | 3–5 rounds per adapter; 12–20 rounds if all 4 selected | Can ship against synthetic fixtures before real integration (parallel-class architecture enables independent delivery) |
| § 2 Real-cluster integration | DCGM ingestion; live topology; deployment | 4–8 rounds (infrastructure uncertainty dominates) | Depends on cluster access (OQ-P3-3); blocks on hardware availability more than engineering effort |
| § 3 DeploySignal integration | npm extract; bi-directional; drift resolution | 3–6 rounds (npm extract is pre-condition) | npm extract (§ 3.1) is a pre-condition for §§ 3.2–3.3; Q-J6 disposition marks this as optional/market-dependent |
| § 4 Infrastructure | Tailscale MR-3; backflow PRs; Coordinator graduation | 1–2 rounds (MR-3); backflow is operator-only; graduation is PR-only | No Phase 3 round-blocking dependencies |
| § 5 Methodology | Rule 7 mechanism; forward-protection redesign; watchdog; hybrid Reviewer formalization | 1–3 rounds (bundleable into MR-3 + anchor backflow PRs) | Rule 7 canonical landing (OQ-P3-5) should precede Phase 3 SLICE 1 |

**Dependency ordering (operator input requested):**

1. Methodology (§ 5) can precede everything — no production-code dependencies.
2. Infrastructure Tailscale (§ 4.1) benefits § 1 and § 2 but is not a blocker.
3. npm extract (§ 3.1) should precede bi-directional integration (§ 3.2–3.3).
4. Real-cluster integration (§ 2) should precede vendor adapter production deployment, but is NOT
   a prerequisite for vendor adapter synthetic-fixture development (§ 1 can proceed with synthetic
   fixtures).
5. Vendor adapters (§ 1) are parallelizable if infrastructure supports it.

**OQ-P3-6 (sequencing):** Should Phase 3 begin with § 5 methodology stabilization before
production scope, or run methodology and production scope in parallel? Operator decision.

---

## § 8 — NOT recommended for Phase 3 entry (deferred or rejected)

| Item | Reason |
|---|---|
| **A15 Multi-region / cross-cluster federation** | Different operational surface: network partition, clock-skew, cluster-federation-protocol concerns absent intra-cluster. Per SCOPING-MEMO § 2.3 A15: "explicit deferral." No known user story driving it. |
| **A13 ML-based attribution model** | Conflicts with inherited calibrated-confidence honest-broker stance (NORTH-STAR Addition #11 at SHA `5a72371`). Rule-based + statistical attribution is a design commitment, not a temporary limitation. Any proposal to add ML attribution requires separate ADR subject to John disposition. |
| **Any scope requiring SCOPING-MEMO v0.4** | A new SCOPING-MEMO version would require a separate scoping cycle (Architect → Reviewer → John disposition at SCOPE-PROPOSAL fidelity) analogous to the v0.1→v0.2→v0.3 cycle that consumed ~2 days in 2026-05-15→2026-05-16. Phase 3 entry under SCOPING-MEMO v0.3 scope is strongly preferred. |
| **A16 Addition #26 D4 reversal (causal attribution)** | Reopening D4 requires a separate ADR proposal subject to John disposition. Explicitly fenced at SCOPING-MEMO § 2.3 A16. No Phase 3 sub-track for this. |
| **FusedVerdict → FiredShardEvent adapter consumer site** | Phase 3+ orchestrator integration (R26 MINOR-2 PARTIALLY-CLOSED deferral per STAGED-FOR-PHASE-2-CLOSE.md Item 2). Depends on Phase 3 orchestration architecture decisions not yet made. |

---

## Open questions (summary)

| OQ-ID | Question | Drives which section |
|---|---|---|
| OQ-P3-1 | AMD adapter vs Google TPU adapter: which enters Phase 3 first? | § 1.1 vs § 1.2 sequencing |
| OQ-P3-2 | Is Google Cloud ICI topology accessible via API for synthetic fixture design? | § 1.2 feasibility |
| OQ-P3-3 | Does operator have real GPU cluster access for DCGM validation? | § 2.1 feasibility |
| OQ-P3-4 | DeploySignal integration: before or after real-cluster integration? | § 3 vs § 2 sequencing |
| OQ-P3-5 | ~~Rule 7 canonical landing status at R40 entry (R38/R39 Memorial-Updater outputs)?~~ **RESOLVED at R41**: Rule 7 canonically landed at `~/.claude/CROSS-PROJECT-MEMORIAL.md:3470`. See § 5.1 updated note. | § 5.1 pre-condition satisfied |
| OQ-P3-6 | Phase 3 SLICE 1: methodology-first or parallel methodology + production scope? | Phase 3 wave planning overall |

---

_DRAFT compiled at R40 (2026-05-19). Reviewers: this is a synthesis artifact — correctness
criterion is completeness and fidelity to source artifacts, not algorithmic correctness.
Reviewer should verify: (1) all 4 vendor adapters present (AC-R40-2); (2) Rule 7 forward-flag
cites WAVE-GATE-05 Decision 3 (AC-R40-3); (3) forward-protection redesign cites WAVE-GATE-05
Decision 6 with correct sub-class count (AC-R40-4); (4) § 7 estimates are ranges not
commitments (AC-R40-5); (5) § 8 contains all 3 explicit not-recommended items (AC-R40-6);
(6) no sequencing decisions resolved by author (AC-R40-7); (7) only new files appear in diff
from round-start (AC-R40-8)._
