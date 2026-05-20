# WAVE-PLAN-Phase3-01 — Wave Plan v1: Tessera Phase 3 SLICE 1 (AWS Vendor Expansion)

**From:** Coordinator TPM (R52 — first Phase 3 Coordinator invocation; PRD-decomposition + DAG + wave sequencing for Phase 3 SLICE 1)
**Date:** 2026-05-19
**Version:** v1 (initial Phase 3 wave plan; SLICE 1 only — SLICE 2 + SLICE 3 are separate Coordinator rounds per PRD § Phase 3 SLICE structure)
**Foundation:** `coordination/PRD.md` § Phase 3 Scope (authored `620d0e2`); `coordination/SCOPING-MEMO-v0.3.md` § 2.3 Vendor fungibility table; `coordination/PHASE-3-CANDIDATES-PRELIMINARY.md` § 1.3 + § 1.4 (AWS Trainium + Inferentia candidate framing)
**Type:** wave plan — Phase 3 SLICE 1 PRD decomposition + DAG + wave sequencing
**Round-start SHA:** `620d0e2` (chore: Phase 3 PRD authored)
**Relationship to prior plans:** **Sibling, not supersession.** Phase 2 wave plans (WAVE-PLAN-01/02/03) executed Wave 1-5 cleanly through R36/R37 Phase 2 close (`87e372f`); preserved on disk per Coordinator versioning discipline. WAVE-PLAN-Phase3-01.md opens the Phase 3 sequence at SLICE 1. Phase 3 SLICE 2 + SLICE 3 wave plans (WAVE-PLAN-Phase3-02 + -03) emit at SLICE-boundary Coordinator rounds in future invocations.

---

## Plan summary

**One work unit, one wave, one cluster.** WU-Phase3-1 bundles AWS Trainium adapter + AWS Inferentia adapter into a single full-tier cluster per PRD § Phase 3 SLICE 1 + OQ-P3-10 default ("bundled if Neuron Link topology is shared across both chip families"). Coordinator-research at this gate (Neuron SDK public docs) confirms **NeuronLink interconnect family IS shared across Trainium + Inferentia2**: both use NeuronLink-v2 over the same NeuronCore-v2 base architecture; topology shape differs (Trainium = 2D Torus with 4 NeuronLinks per chip; Inferentia2 = ring with 2 NeuronLinks per chip). One Neuron SDK parser handles both with vendor-specific synthetic fixtures + node-kind literals (`'trainium_chip'` vs `'inferentia_chip'`) discriminating chip family. Shared `'neuron_link_peer'` relationship literal (pre-anticipated at SCOPING-MEMO-v0.3.md:285 Vendor fungibility table) applies to both.

**Fan-out analysis:** Forcibly splitting 1A (Trainium) and 1B (Inferentia) into parallel clusters was evaluated and rejected. The split candidates share D5-strict write-conflict on `engine/types/verdict.ts` enum extension (both clusters would need to add `'neuron_link_peer'` to the `TopologyEdge.relationship` union — a single literal added twice produces a merge conflict; serialized addition forfeits the parallelism benefit). They also share D1 HIGH on a unified Neuron SDK parser file (if one file handles both topology shapes; if two files, D5-write-conflict still applies to enum). Per the dispatch directive's "DO NOT force fan-out when scope is genuinely sequential" clause and the precedent set in Phase 2 (where `'contains'` + `'nvlink_peer'` enum extensions landed at single-cluster substrate rounds R18 + R23 BEFORE the Wave 2 fan-out), single-cluster bundled is the correct shape. See Step 3 Judgment call 1 for the full D-test analysis. Architect retains spec-time split-decision discretion if AC count exceeds 14 (R20+R21 precedent).

| Wave | Cluster count | Foundation? | Notes |
|---|---|---|---|
| 1 | 1 (sequential bundled) | No | WU-Phase3-1 AWS Neuron adapter (Trainium 2D Torus + Inferentia2 ring; shared parser; bundled per OQ-P3-10 default and Coordinator empirical confirmation that NeuronLink-v2 family is shared). Full tier. |

**Recommended operator action for Wave 1:** dispatch single-cluster via `./run-pipeline.sh --tier full` from the main worktree at `~/concord/tessera`. NOT `--coordinator`; NOT `multi-track-cluster-setup.sh` (no fan-out within SLICE 1).

**Tier-aware consolidation Reviewer at wave-gate close (per R50):** Wave 1 cluster runs full-tier with cluster-internal Reviewer → consolidation Reviewer is **OPTIONAL** at WAVE-GATE-Phase3-01 close. Operator may invoke `./run-pipeline.sh --coordinator --wave-gate WAVE-Phase3-01 --consolidation-reviewer` if cross-vendor integration concerns surface; absent integration concerns, the wave-aggregate verifier mechanical gate is sufficient.

**Gating moment after Wave 1 close (per PRD § Phase 3 SLICE structure):** operator decides OQ-P3-9 (rent GPU instance for US-07 DCGM validation Path A, or defer Path B). Decision determines SLICE 2 scope; tracked in a separate Coordinator round.

---

## PRD provenance

- **PRD source:** `coordination/PRD.md` § Phase 3 Scope (lines 411–510); FR-V1a + FR-V1b (line 434–435); AC-P5 (line 447); Phase 3 SLICE structure (lines 463–488)
- **PRD version at plan time:** Phase 3 scope authored 2026-05-19 at `620d0e2`; SCOPING-MEMO-v0.3.md still v0.3 (Phase 3 extends rather than v0.4 per OQ-P3-11 default)
- **Anti-scope clauses referenced (PRD lines 452-459 + inherited A1-A17 from SCOPING-MEMO § 2.3):**
  - **A10 carve-out preserved + extended (PRD:456):** L0 contract for Tessera (measurement-domain preprocessing) in scope; Phase 3 EXTENDS to live DCGM at SLICE 2 (conditional Path A). Hardware-diagnostic territory (root-causing GPU/Trainium failures, per-chip fault attribution) remains anti-scope.
  - **A8/A11 (PRD:457):** Phase 3 introduces rented GPU validation environments. Operator-rented infrastructure under operator control; real customer telemetry remains anti-scope. **Phase 3 SLICE 1 ships against synthetic fixtures only — no rental scope here.**
  - **NEW Phase 3 anti-scope (PRD:459):** No vendor-locked code paths. AWS Trainium adapter MUST use the same `TopologySource` interface as Slurm/K8s/NVLink adapters; no AWS-SDK-internal hooks that prevent vendor-neutral testing. Same constraint applies to Inferentia adapter (and SLICE 2's TPU adapter).
  - **A12 (inherited from § 2.3):** NO modification of inherited vendored-at-pin engine internals. `engine/topology-overlay.ts` BFS body frozen (READ-ONLY consumer of `TopologySource` interface). `engine/core.ts` frozen. `engine/detectors/*` frozen.
  - **A13 (inherited):** Rule-based + statistical only; NO ML-based attribution.
  - **A16 (inherited):** `correlational_not_causal: true` wire-format invariant preserved.
  - **A17 (inherited):** NO DeploySignal-integration scope at Phase 3 SLICE 1 (DS integration is SLICE 3 scope; gated separately).
- **Open PRD questions deferred to operator:** 3 carry-forward (OQ-P3-9 SLICE 1/2 gating moment — answered at SLICE 1 close not this plan; OQ-P3-10 Inferentia bundling — Coordinator-resolved here with public-docs evidence + Architect override option; OQ-P3-11 SCOPING-MEMO v0.4 — defer to extending v0.3, escalate at Reviewer if scope-creep flagged).
- **Tessera-local rule audit applied:** PRD's "Apply all 7 cross-project rules UPFRONT" directive honored per NEXT-ROLE.md:57-65; Rules 1 + 4 + 6 are ACTIVE GATES at this plan emit. Rule 1 (cite specific PRD lines + Neuron SDK URLs verbatim — applied throughout). Rule 4 (ALLOWED_SET enumerated in NEXT-ROLE.md:50-55 — Coordinator does not write outside it). Rule 6 (HALT + DIAGNOSTIC if PRD ambiguous — no halt condition fired this round; Neuron SDK docs were sufficient to resolve OQ-P3-10 default). Rules 2 + 3 + 5 + 7 are N/A for Coordinator-only role per NEXT-ROLE.md framing.

---

## Step 1 — Work unit extraction (deterministic)

Per `CLAUDE-COORDINATOR.md` §DAG construction discipline Step 1. WU extracted from PRD § Phase 3 Scope structure; no work unit invented; explicit merge reasoning logged below.

| WU ID | Source PRD feature | Acceptance criteria (frame; per-AC enumeration is the cluster Architect's job) | Bounding anti-scope | File tree scope |
|---|---|---|---|---|
| **WU-Phase3-1** (bundled per OQ-P3-10 default; matches PRD:465-466 default expectation "bundled with 1A if Neuron Link topology is shared across both chip families") | FR-V1a + FR-V1b (PRD:434-435); AC-P5 (PRD:447); PRD § Phase 3 SLICE structure SLICE 1 sub-section (PRD:463-468); SCOPING-MEMO-v0.3.md § 2.3 Vendor fungibility table line 287 ("Parallel-class — future `rocm-source.ts` / `tpu-source.ts` / `trainium-source.ts` slot in beside it") + line 289 ("Each follows the WU-03 NVLink pattern: new parallel-class file at `engine/topology/<vendor>-source.ts`; new `TopologyEdge.relationship` enum literal; new vendor-specific test substrate; consumes L0 contract by interface"); PHASE-3-CANDIDATES-PRELIMINARY.md § 1.3 + § 1.4 | **AWS Trainium + AWS Inferentia2 topology adapter (bundled).** Implements concrete `TopologySource` per Addition #26 interface for both chip families; produces `TopologySnapshot` consumable by inherited `engine/topology-overlay.ts:257+` BFS layer. Per-cell AC frame: (a) Trainium 2D Torus topology — 16 chips per Trn2 server; 4 NeuronLink-v2 connections per chip; correct edge density verified against synthetic fixture (Neuron SDK + AWS public docs sources); (b) Inferentia2 ring topology — variable chip count per inf2 instance; 2 NeuronLink-v2 connections per chip; correct edge density; (c) `'neuron_link_peer'` `TopologyEdge.relationship` literal added to `engine/types/verdict.ts` enum (single literal shared between Trainium + Inferentia per Neuron SDK doc evidence — see Step 3 Judgment call 1); (d) `'trainium_chip'` + `'inferentia_chip'` `TopologyNode.kind` literals added to `engine/types/verdict.ts` enum (distinct literals: chip families are architecturally distinct per `awsdocs-neuron.readthedocs-hosted.com` "2 (Inferentia2) or 4 (Trainium) NeuronLink-v2 for device-to-device collective communication"); (e) Sparse / partial topology graceful handling (LS-4 carry-forward); (f) `TopologySource` interface conformance (`fetchSnapshot(ctx?)` + `snapshotHash(snapshot)` per `engine/topology-overlay.ts:50-55`; hash delegates to `computeSnapshotHash` per shared semantics); (g) `correlational_not_causal: true` invariant preserved at any wire boundary (A16 defensive); (h) Anti-scope diff AC (per TQ-4 γ pattern; SHA-pinned to chore-A); (i) Typecheck + test count ACs (anchored to chore-A SHA; encode ACTUAL `tsc` exit code + ACTUAL `node --test` pass/fail counts per Rule 1 `false-compliance-attestation`). **Target AC count: 12-16** (slightly higher than Phase 2 WU-01 SLURM precedent's 10-14 because of dual-chip-family scope; falls within R20+R21 split-decision threshold of 18; Architect retains split-decision flexibility — see Step 1 splitting reasoning below). | **A10** (NO hardware diagnosis — parser ingests vendor topology metadata, not health diagnostics); **A11** (synthetic Neuron SDK / EC2 metadata fixtures only — NO live AWS API calls at SLICE 1); **A12** (NO modification of inherited `engine/topology-overlay.ts` BFS body, `engine/core.ts`, `engine/detectors/*`; READ-ONLY consumer pattern); **A13** (NO ML attribution); **A16** (Addition #26 D4 preserved); **A17** (NO DeploySignal integration); **NEW Phase 3 anti-scope per PRD:459** (NO AWS-SDK-internal hooks; vendor-neutral `TopologySource` interface only); **NO modification of WU-00 deliverables** (`engine/l0/counter-rate-transform.ts` Phase 2 frozen — adapter knows-of-but-typically-does-not-call); **NO modification of WU-01/02/03/04 deliverables** (Phase 2 Wave 2 + Wave 1 frozen); **NO modification of any pre-R52 test file** (Phase 1 + Phase 2 test suite frozen); **NO drafting of SLICE 2 Google TPU adapter or live-cluster fetch interface** (FR-V2 + FR-V4 are SLICE 2 scope); **NO drafting of SLICE 3 DS integration** (FR-D1/2/3 are SLICE 3 scope). | NEW `engine/topology/neuron-source.ts` (Tessera-original; unified Neuron SDK topology parser handling both Trainium 2D Torus + Inferentia2 ring fixtures via node-kind discrimination — see Step 3 Judgment call 2 for file-layout default; Architect may split into `trainium-source.ts` + `inferentia-source.ts` at spec time if scope warrants); NEW `test/q53-neuron-adapter.test.ts` (assumes Wave 1 dispatches at round R53; round number nominally R53 per cluster pipeline next-round-after-R52 convention; Architect spec confirms at session entry); NEW `test/_substrate/neuron-fixture-trainium-2d-torus.txt` + `test/_substrate/neuron-fixture-inferentia-ring.txt` (Tessera-original synthetic fixtures derived from public Neuron SDK + AWS docs; one fixture per chip family; sparse-data fixture variants per LS-4); MODIFY `engine/types/verdict.ts` (already `vendored-with-deltas` since R18 per `coordination/VENDORING-MANIFEST.md`; add `'trainium_chip'` + `'inferentia_chip'` to `TopologyNode.kind` union at current line 245; add `'neuron_link_peer'` to `TopologyEdge.relationship` union at current line 255 — verified line numbers via `grep -n` at `620d0e2` HEAD); MODIFY `coordination/VENDORING-MANIFEST.md` (refresh `engine/types/verdict.ts` row note column to enumerate Phase 3 SLICE 1 additions alongside Phase 2 SLICE 1/2 entries per established R18+R20 two-step pattern). READ-ONLY: `engine/l0/counter-rate-transform.ts` (Phase 2 frozen); `engine/topology/{common-mode-attribution,slurm-source,k8s-source,nvlink-source}.ts` (Phase 2 frozen); `engine/topology-overlay.ts` (vendored-with-deltas; READ-ONLY consumer); `engine/hardware-topology-source.ts` (R23 frozen); v9X/v9Y substrates (Phase 2 frozen). |

### Merge reasoning

**WU-Phase3-1A (Trainium adapter) + WU-Phase3-1B (Inferentia adapter) bundled into single WU-Phase3-1 per OQ-P3-10 default.** The PRD's bundling condition ("if Neuron Link topology shared across both chip families") is empirically satisfied per public Neuron SDK docs:

- `awsdocs-neuron.readthedocs-hosted.com/en/v2.26.0/general/nki/arch/trainium_inferentia2_arch.html` (retrieved 2026-05-19): "both Trainium and Inferentia2 devices consist of: 2 NeuronCores (v2)" and "2 (Inferentia2) or 4 (Trainium) NeuronLink-v2 for device-to-device collective communication". Shared base architecture (NeuronCore-v2) + shared interconnect family (NeuronLink-v2) + differing per-chip connection count (4 vs 2).
- `awsdocs-neuron.readthedocs-hosted.com/en/latest/general/arch/neuron-hardware/trn1-arch.html` (retrieved 2026-05-19): "Trainium chips are connected in a 2D Torus topology" with NeuronLink-v2.
- `aws.amazon.com/blogs/aws/amazon-ec2-trn2-instances-and-trn2-ultraservers-for-aiml-training-and-inference-is-now-available/` (retrieved 2026-05-19): "Trn2 instances feature up to 16 Trainium2 chips, and Trn2 UltraServers feature up to 64 Trainium2 chips interconnected with NeuronLink".
- Inferentia2 ring vs Trainium 2D Torus distinction confirmed at `medium.com/data-science/dl-training-on-aws-inferentia-53e103597a03` (retrieved 2026-05-19; cites Neuron SDK official position): "Trainium devices are connected in a 2D Torus topology rather than a ring topology".

Interpretation: **One Neuron SDK topology parser handles both chip families** with vendor-specific synthetic fixtures (one for Trainium 2D Torus; one for Inferentia ring) + node-kind discrimination (`'trainium_chip'` vs `'inferentia_chip'`). Shared `'neuron_link_peer'` relationship literal applies to edges in both topologies (same interconnect family). This matches the SCOPING-MEMO § 2.3 Vendor fungibility table pre-anticipation (line 285: "extensions for `'xgmi_peer'` / `'neuron_link_peer'` / `'tpu_ici_peer'` straightforward"; line 289: parallel-class).

### Splitting reasoning

**Internal sequencing within WU-Phase3-1 is the cluster Architect's job at spec time.** The Architect MAY internally split the spec into Trainium-section + Inferentia-section (analogous to R20+R21 SLICE 2.A + 2.B precedent). If at spec time the Architect determines AC count exceeds 18 (R20+R21 split-decision threshold per WAVE-PLAN-03 Step 1 framing) — e.g., because each chip family demands ≥7 ACs for topology shape + sparse-data + fixture verification + interface conformance + edge density + node-kind correctness + correlational_not_causal preservation — the Architect may ESCALATE to Coordinator for WAVE-PLAN-Phase3-01-v2 emission splitting into WU-Phase3-1A (Trainium R53) + WU-Phase3-1B (Inferentia R54) sequential rounds in the same wave. This is a Coordinator-resequencing event per `CLAUDE-COORDINATOR.md` §Promotion mid-round — escalate; do NOT silently split.

**Pre-committing to fan-out at this plan time would forfeit Architect's spec-time judgment.** The bundled-default-with-Architect-override pattern matches PRD:466 ("Architect confirms or splits at SLICE 1 dispatch once Neuron Link topology spec for both chip families is read") explicitly.

---

## Step 2 — Dependency edge identification (deterministic)

Per `CLAUDE-COORDINATOR.md` §DAG construction discipline Step 2. Each edge cites the dependency test that fired (D1–D5) and the confidence level.

### Outbound from WU-Phase3-1 to future SLICE 2 / 3 work units (Wave 1 → future waves; informational only — not in scope for WAVE-PLAN-Phase3-01)

| Source | Target | Test | Confidence | Reasoning |
|---|---|---|---|---|
| **WU-Phase3-1** | **WU-Phase3-2A (Google TPU adapter; FR-V2; SLICE 2)** | D2 (AC reference / interface convention) | MEDIUM | TPU adapter follows same parallel-class pattern; references the `TopologyEdge.relationship` enum literal `'neuron_link_peer'` as precedent for its own `'tpu_ici_peer'` literal addition (pre-anticipated at SCOPING-MEMO § 2.3 Vendor fungibility table line 285). Forward-looking; documented for SLICE 2 wave plan, not load-bearing for SLICE 1 close. |
| **WU-Phase3-1** | **WU-Phase3-2B (live topology fetch interface; FR-V4; SLICE 2)** | D2 (AC reference / interface contract) | MEDIUM | Live topology fetch design at SLICE 2 extends `TopologySource.fetchSnapshot(ctx)` for Slurm + K8s + NVLink + Trainium + Inferentia + TPU. WU-Phase3-1's `TopologySource` impl is consumed as a precedent reference. |
| **WU-Phase3-1** | **WU-Phase3-2C (real-cluster L0 validation; FR-V3; SLICE 2 Path A only)** | D2 (interface reference, CONDITIONAL on Path A per OQ-P3-9) | MEDIUM | If operator selects Path A at OQ-P3-9 gating moment, real-cluster validation may exercise Trainium/Inferentia adapters against rented infrastructure. CONDITIONAL on OQ-P3-9 decision — defer to SLICE 2 Coordinator round. |

### Inbound to WU-Phase3-1 from Phase 2 deliverables (informational; Phase 2 frozen since R37 close)

| Source | Target | Test | Confidence | Reasoning |
|---|---|---|---|---|
| **WU-00 (L0-CONTRACT, R25; Phase 2 Wave 1)** | **WU-Phase3-1** | D2 (AC reference / interface contract) | MEDIUM | Per SCOPING-MEMO § 2.3 Vendor fungibility table line 281 ("L0 contract triggers on `semantic_type === 'counter'`, not vendor; 32-bit wrap math is vendor-neutral") + line 289 ("consumes L0 contract by interface"). Neuron SDK topology is configuration metadata, not counter-typed telemetry — adapter does NOT call `transformPair` in hot path. Edge is interface-only; analogous to WU-01 SLURM / WU-02 K8S → WU-00 edges at Phase 2. If any NeuronLink-error-counter metadata gets passed through (Neuron SDK exposes some 32-bit counters; opportunistic) it passes through the L0 contract's pre-existing 32-bit wraparound path — no new contract surface required. |
| **WU-03 (NVLINK-ADAPTER, R30; Phase 2 Wave 2)** | **WU-Phase3-1** | D2 (AC reference / parallel-class precedent) | MEDIUM | WU-03 set the precedent for vendor-specific topology adapters: parallel-class file at `engine/topology/<vendor>-source.ts`; `TopologySource` interface conformance; vendor-specific enum literal addition (`'nvlink_peer'`); synthetic-fixture-only validation. WU-Phase3-1 follows the exact same pattern with `'neuron_link_peer'`. Edge is pattern-reference; no code import. |
| **WU-04 (MD-F4 common-mode-attribution, R26; Phase 2 Wave 1)** | **WU-Phase3-1** | D2 (AC reference) | LOW (informational; no direct edge) | Common-mode attribution operates DOWNSTREAM of topology adapters; reads `TopologySnapshot` produced by adapters via `TopologySource` interface. WU-Phase3-1's output flows through Addition #26 BFS layer to MD-F4 attribution, but WU-Phase3-1 does NOT import MD-F4 code. Edge is consumer-direction, not producer-direction; Phase 2 frozen surfaces remain unchanged. |
| **R36 Phase 2 close-walk (WU-07)** | **WU-Phase3-1** | D2/convention (SLICE-close precedent) | MEDIUM | Phase 2 close-walk (WU-07 R36 at `87e372f`) is the SLICE-close precedent that frames Phase 3 entry. WU-Phase3-1 Architect reads PHASE-2-CLOSE-WALK.md + PHASE-3-CANDIDATES-PRELIMINARY.md as primary inputs alongside the PRD. |

### Pairwise check of candidate sub-decompositions for WU-Phase3-1 internal structure (informational — single-cluster bundle decision is made; this check documents why fan-out was rejected)

Per the same framing as WAVE-PLAN-03 Step 2 (R33 / WU-06 SLICE 4 decomposition pairwise check).

| Pair | D1 (shared output)? | D2 (AC reference)? | D5-strict (write-conflict)? | D4 (file-tree overlap)? |
|---|---|---|---|---|
| WU-Phase3-1A (Trainium) ↔ WU-Phase3-1B (Inferentia) | **YES — D1 HIGH** if one parser file (`neuron-source.ts`) handles both topology shapes. Both sub-WUs would write to the same `engine/topology/neuron-source.ts` file. **POSSIBLY independent if two parser files** (`trainium-source.ts` + `inferentia-source.ts`) — but D5-strict still fires (see right column). | **YES — D2.** Both sub-WUs reference the shared `'neuron_link_peer'` `TopologyEdge.relationship` literal at the AC layer. Inferentia ACs cite the same literal Trainium adds. | **YES — D5-strict (write-conflict).** Both sub-WUs need to add `'neuron_link_peer'` to the `TopologyEdge.relationship` union at `engine/types/verdict.ts:255`. Parallel dispatch produces a duplicate-add merge conflict (or worse: a silent enum-extension drop on one side). Serial dispatch (1A lands enum first; 1B extends) requires sequencing into 2 waves — sub-WUs would NOT run in parallel even nominally. | YES on `engine/types/verdict.ts` (shared enum extension); YES on `coordination/VENDORING-MANIFEST.md` (shared row update). Resolvable via worktree isolation ONLY if D5-strict can be resolved by sequencing — which forfeits the parallelism benefit. |

**Verdict for fan-out availability inside SLICE 1:** ZERO clean-independence opportunity. The D5-strict write-conflict on `engine/types/verdict.ts` enum extension is structural — even if the parser files are separate, the shared `'neuron_link_peer'` literal forces serialization. Two valid resolutions exist:

1. **Bundle (chosen).** Single cluster ships both sub-WUs together. Enum extensions land once; no merge conflict. Matches OQ-P3-10 default + Coordinator empirical confirmation that NeuronLink family IS shared.
2. **Pre-land enum substrate at Wave 0 / pre-WU.** A separate substrate WU lands `'neuron_link_peer'` + `'trainium_chip'` + `'inferentia_chip'` enum literals ALONE (no adapter implementation); then 1A + 1B fan out in Wave 1 consuming the pre-landed enum. **REJECTED as YAGNI for SLICE 1.** This is the same shape as Phase 2's R18 (`'contains'` enum added at single-cluster) + R23 (`'nvlink_peer'` enum added at single-cluster + scaffold) preceding Wave 2 fan-out — but Phase 2 had 3 vendors (Slurm/K8s/NVLink); Phase 3 SLICE 1 has 2 (Trainium + Inferentia) AND they share the SAME `'neuron_link_peer'` literal (not 3 distinct literals). The pre-landing-substrate-then-fan-out pattern's cost (1 extra round + 1 extra wave gate) is unjustified for a 2-sub-WU SLICE where the substrate is 3 enum literals.

See Step 3 Judgment call 1 for the full reasoning.

### Contention risks (not dependencies)

| Work units | Shared files | Resolution |
|---|---|---|
| WU-Phase3-1 ↔ inherited `engine/types/verdict.ts` | `engine/types/verdict.ts` (vendored-with-deltas since R18; touched at R18 + R20) | Apply vendored-with-deltas two-step maintenance pattern UPFRONT in spec component inventory (VENDORING-MANIFEST.md row note refresh + verify file already removed from AT_PIN_FILES at R18). Pattern is project-established (PHASE-2-SLICE-1-CLOSE-WALK § 2.1 + § 2 two-step definition). |
| WU-Phase3-1 ↔ Phase 2 Wave 1+2 deliverables | `engine/topology/*` directory shared with WU-04 + WU-01/02/03 adapters | NEW file at `engine/topology/neuron-source.ts` (or split per Architect spec-time call); zero modification of existing files in directory. Parallel-class architecture (precedent R28/R29/R30) preserves Phase 2 surfaces. |
| WU-Phase3-1 ↔ `coordination/VENDORING-MANIFEST.md` | Manifest row for `engine/types/verdict.ts` | Single-row note refresh; non-conflicting with Phase 2 entries. Standard close-walk pattern. |

---

## Step 3 — Claude judgment at ambiguity boundaries

### Judgment call 1 — SLICE 1 decomposition: bundled WU-Phase3-1 vs split fan-out into WU-Phase3-1A/1B

- **Ambiguity:** PRD lines 463-466 describe Phase 3 SLICE 1 as containing two work units (WU-Phase3-1A Trainium + WU-Phase3-1B Inferentia) with a bundled-vs-split decision conditional on "if Neuron Link topology is shared across both chip families" (OQ-P3-10). The R52 directive (NEXT-ROLE.md:23) re-frames the same question: "Default expectation per OQ-P3-10: WU-Phase3-1A (Trainium) + WU-Phase3-1B (Inferentia) bundled into single cluster IF Neuron Link topology is shared across both chip families. Coordinator confirms via read of Neuron SDK public docs at WU extraction time; splits if Inferentia topology materially differs." The operator's fan-out preference (R24 directive carried forward; NEXT-ROLE.md framing) instructs "PREFER fan-out when D1-D5 tests show clean independence; DO NOT force fan-out when scope is genuinely sequential". The question: bundle into single WU-Phase3-1 (Coordinator confirms shared-topology condition empirically), OR split into two sub-WUs and require serial sequencing (or 2-wave structure), OR find another shape?
- **Candidate resolutions:**
  - **(a) Single-cluster WU-Phase3-1 bundled — sequential within cluster (Coordinator's recommendation).** One Wave 1 cluster delivers both Trainium + Inferentia adapter logic in one full-tier round. Internal sequencing (which chip family ACs cover first; whether one parser handles both or two parser files split) is the Architect's spec-time job. Operationally analogous to Phase 2 R23 HardwareTopologySource scaffold (single-cluster substrate establishing the architecture pattern) preceding R28/29/30 Wave 2 fan-out — except SLICE 1 doesn't have the same scale (2 vendors not 3; shared enum literal not 3 distinct). The Architect retains spec-time split-decision flexibility per R20+R21 precedent (Coordinator-resequencing WAVE-PLAN-Phase3-01-v2) if AC count exceeds 18.
  - **(b) Two-wave structure: Wave 1 = WU-Phase3-1A Trainium alone; Wave 1.5 = WU-Phase3-1B Inferentia alone.** Honors a sequencing-after-substrate pattern: Wave 1 lands `'neuron_link_peer'` enum + Trainium adapter; Wave 1.5 consumes pre-landed enum + ships Inferentia adapter. Adds +1 wave gate ceremony (CLUSTER-HANDOFF-Phase3-1A-1B artifact + WAVE-GATE-Phase3-01.5 ceremony) for a 2-sub-WU SLICE. Net Q-cycle and operator-attention cost approximately wash with bundled; the wave-count cost is +1 wave for marginal architectural benefit. Not recommended.
  - **(c) Force-parallel WU-Phase3-1A + WU-Phase3-1B in same wave.** STRUCTURALLY UNSAFE — D5-strict write-conflict on `engine/types/verdict.ts` enum extension (both sub-WUs would need to add `'neuron_link_peer'` to the same union) prevents clean parallel dispatch. The duplicate-add either produces a merge conflict (best case: caught at merge time) or a silent enum-extension drop on one side (worst case: only one chip family's literal survives, the other adapter ships broken). Rejected.
  - **(d) Substrate-wave + fan-out: Wave 0 = pre-land enum literals alone (no adapter); Wave 1 = WU-Phase3-1A + WU-Phase3-1B fan-out parallel.** Analogous to Phase 2's R18 substrate (`'contains'` enum) + R23 substrate (`'nvlink_peer'` + scaffold) preceding Wave 2 fan-out. Adds +1 substrate WU + +1 wave gate ceremony to a SLICE that has only 2 sub-WUs sharing one literal. Cost-benefit fails: +1 wave + +1 round of pure-bookkeeping enum extension does not unlock meaningful parallelism (2 adapters → ~2× wall-clock savings at best, against +2 wave-cycle ceremony cost). Rejected.
- **Claude's judgment:** Option (a) — single-cluster WU-Phase3-1 bundled.
- **Reasoning:** Four factors favor bundling:
  1. **OQ-P3-10 default-condition empirically satisfied.** PRD:466 frames the condition as "if Neuron Link topology is shared across both chip families". Neuron SDK public docs confirm: same NeuronCore-v2 base architecture; same NeuronLink-v2 interconnect family; topology *shape* differs (2D Torus vs ring); per-chip *connection count* differs (4 vs 2). The shared interconnect family is sufficient evidence that one Neuron SDK parser handles both with vendor-specific fixtures + node-kind discrimination. The SCOPING-MEMO § 2.3 Vendor fungibility table line 285 pre-anticipates `'neuron_link_peer'` as a single literal applying to "NeuronLink-family" peer edges — Inferentia's 2-NeuronLink ring + Trainium's 4-NeuronLink 2D Torus are both NeuronLink-peer-edge topologies under the same literal.
  2. **D-test reality.** D5-strict write-conflict on `engine/types/verdict.ts` enum extension is the hardest structural constraint. Sub-WU fan-out is structurally unavailable without either substrate pre-landing (option d; cost-benefit fail) or 2-wave sequencing (option b; +1 wave for marginal benefit). The dispatch directive's "DO NOT force fan-out when scope is genuinely sequential" applies directly: shared-enum-extension sequencing is genuine sequential dependency, not a synthetic constraint.
  3. **Operator-attention cost analysis.** Phase 3 entry is the first Phase-class boundary after Phase 2 close (R37, `87e372f`). Single-cluster Wave 1 → single WAVE-GATE-Phase3-01 → operator reviews one set of Reviewer findings + decides OQ-P3-9 (Path A/B gating moment). Two-wave alternative (option b) adds a wave-gate ceremony in the middle of SLICE 1 + a CLUSTER-HANDOFF-Phase3-1A-1B artifact + a second operator review burden for what is operationally one parallel-class addition. Single-cluster bundles the operator-attention into one decision point.
  4. **R20+R21 precedent for in-cluster split-decision flexibility.** The Architect at spec time can split-decision an over-scoped cluster (Coordinator-resequencing WAVE-PLAN-v2 emission) if AC count exceeds the target. Pre-committing to fan-out at this plan time would forfeit the Architect's spec-time judgment + force the cluster shape regardless of empirical AC density.
- **Resulting placement:** WU-Phase3-1 in Wave 1 as the sole cluster. Architect retains spec-time discretion to escalate for split-decision if AC count or scope complexity warrants. The PRD:466 default ("bundled with 1A if Neuron Link topology shared") is the operator-recorded fallback; Coordinator confirms empirically and honors.

### Judgment call 2 — File layout under `engine/topology/` for the bundled adapter

- **Ambiguity:** Bundled WU-Phase3-1 ships one OR two parser files. PRD:434-435 lists `engine/topology/trainium-source.ts` for FR-V1a and (implicitly via "bundled with Trainium adapter if Neuron Link topology is shared") leaves FR-V1b file layout unspecified. The Coordinator does not pre-decide architecturally significant file layouts (precedent: WAVE-PLAN-02 OQ-W2-1 for WU-00 L0-contract file location). Three candidates:
- **Candidate resolutions:**
  - **(a) Single file `engine/topology/neuron-source.ts` (Coordinator default; matches WU-00 + WU-04 + WU-03 single-file parallel-class precedent).** Unified Neuron SDK parser; vendor-specific fixtures drive Trainium-vs-Inferentia behavior via node-kind discrimination at runtime. Tightest blast radius; single-file maintenance.
  - **(b) Two files `engine/topology/trainium-source.ts` + `engine/topology/inferentia-source.ts`.** Matches PRD:434 explicit file naming for FR-V1a; sets parallel-class precedent at file granularity for future per-chip-family adapters (Trainium3, Inferentia3, etc.). Adds a third file (small shared utility module?) if any code is genuinely shared.
  - **(c) Architect's decision at spec time.** Coordinator surfaces as an OQ; Architect picks based on parser-code-structure read of Neuron SDK output format.
- **Claude's judgment:** Option (c) — defer to Architect spec-time read of Neuron SDK output format. Coordinator default in absence of operator override: (a) single file `engine/topology/neuron-source.ts` (matches WU-03 NVLink + WU-04 MD-F4 single-file precedent). If Neuron SDK exposes Trainium topology and Inferentia topology via materially different APIs / output formats (e.g., distinct JSON schemas), Architect may split into (b) two files; otherwise (a) suffices.
- **Resulting OQ:** OQ-Phase3-W1-1 below.

### Judgment call 3 — Whether to pre-flag SCOPING-MEMO § 2.3 Phase 3 amendment scope to the Architect

- **Ambiguity:** Per PRD's OQ-P3-11 ("SCOPING-MEMO v0.4 needed?") the default is to extend v0.3 with Phase 3 amendments rather than v0.4 unless Reviewer escalates. SCOPING-MEMO § 2.3 currently scopes Phase 2 explicitly; Phase 3 SLICE 1 introduces new ACs + new files that may warrant § 2.3 amendment (e.g., a new "Phase 3 SLICE 1" sub-row or extension of the Vendor fungibility table to mark Trainium + Inferentia as "shipped at R53" rather than "TAGGED-FUTURE"). Should the WU-Phase3-1 cluster include SCOPING-MEMO amendment scope, OR defer to a future close-walk?
- **Candidate resolutions:**
  - **(a) WU-Phase3-1 closes opportunistically IF Architect spec touches SCOPING-MEMO anyway.** Architect's call at spec time.
  - **(b) Defer to a future Phase 3 SLICE-close walk (after SLICE 1 close).** Cleaner scope-bounding for WU-Phase3-1; consistent with Phase 2 R32 MAJOR-1 carry-forward pattern (where § 2.3 surgery was deferred to a later close-walk).
- **Claude's judgment:** Option (b) by default; (a) opportunistically. WU-Phase3-1 is the first Phase 3 round; cleaner scope-bounding favors a future SLICE-close to land § 2.3 amendments. The Vendor fungibility table line 289 ("TAGGED-FUTURE (Phase 3+) vendor adapters") may want updating to reflect Trainium + Inferentia as shipped — but that's a close-walk pattern, not a per-cluster pattern.
- **Resulting OQ:** OQ-Phase3-W1-2 below.

---

## Step 4 — DAG validation

Per `CLAUDE-COORDINATOR.md` §DAG construction discipline Step 4.

- [x] **Cycle check.** No circular dependencies. Trivially satisfied: SLICE 1 has 1 WU (WU-Phase3-1) with 0 in-wave dependency edges. Inbound edges from Phase 2 deliverables (WU-00 D2 MEDIUM, WU-03 D2 MEDIUM, WU-04 D2 LOW, R36 close-walk D2/convention MEDIUM) all flow forward from Phase 2 (frozen since R37) into Phase 3 SLICE 1. Outbound edges to SLICE 2/3 WUs (WU-Phase3-2A/2B/2C) are forward-looking and out-of-scope for this plan.
- [x] **Island check.** Single WU plan; no islands possible. WU-Phase3-1 has inbound edges (4 Phase 2 deliverables D2; informational) and outbound edges (forward to SLICE 2; informational). It is neither isolated nor terminal-within-SLICE-1 — it IS SLICE 1.
- [x] **Foundation identification.** Per CLAUDE-COORDINATOR.md §Step 4 ("Work units whose outputs are inputs to 3+ other work units **across 2+ domains/modules** are foundations"): WU-Phase3-1 has 3 forward-looking outbound edges (to WU-Phase3-2A + 2B + 2C) but all 3 land in the same `engine/topology/*` domain at SLICE 2 — does NOT cross 2+ domains by the rule's literal text. NOT a foundation. (Inherited foundation identification from WAVE-PLAN-02: WU-00 L0-CONTRACT was the Phase 2 foundation; preserved as historical record.)

---

## Step 5 — Wave sequencing

| Wave | Work units | Rationale |
|---|---|---|
| 1 | WU-Phase3-1 (AWS Neuron adapter bundled: Trainium 2D Torus + Inferentia2 ring) | Single foundational SLICE 1 work unit per OQ-P3-10 default + Coordinator empirical confirmation (Neuron SDK public docs: shared NeuronLink-v2 family; shared NeuronCore-v2 base; differing topology shape resolved via vendor-specific fixtures + node-kind discrimination). Full tier per Step 6. Single-cluster per Step 3 Judgment call 1 (D5-strict write-conflict on shared enum extension forbids parallel sub-WU dispatch; bundle is the structurally correct shape). Architect retains spec-time split-decision flexibility per R20+R21 precedent. |

### Wave dispatch order (within each wave, parallel)

Wave 1 single-cluster (no parallel dispatch within wave). Uses standard `./run-pipeline.sh --tier full` from the main worktree at `~/concord/tessera`; does NOT use `--coordinator` mode or `multi-track-cluster-setup.sh`.

**CLUSTER-HANDOFF artifacts:** None emitted at this plan time. WU-Phase3-1 has zero in-wave inbound edges (single-cluster Wave 1). Inbound edges from Phase 2 deliverables (WU-00, WU-03, WU-04, R36 close-walk) are informational pattern-references, not load-bearing contracts — Phase 2 surfaces are frozen + documented in `coordination/PHASE-2-CLOSE-WALK.md` + the Reviewer reports referenced. No CLUSTER-HANDOFF artifact required per CLAUDE-COORDINATOR.md §Cluster handoff inventory ("one file per directed dependency edge; created when target cluster dispatches"). Architect's spec at Wave 1 dispatch reads Phase 2 close-walk + PHASE-3-CANDIDATES-PRELIMINARY.md directly.

---

## Step 6 — Tier classifications

Per the tier rubric inlined in `CLAUDE-COMMON.md` (A1-A7 / S1-S5 / Z1-Z5). **Each cluster self-governs its own tier at session start; this column records the Coordinator's prior, not a binding instruction.**

| WU ID | Coordinator tier | Matched criteria | Rationale |
|---|---|---|---|
| **WU-Phase3-1** | **full** | **A1** (new external dependency — Neuron SDK public-doc topology format; first AWS-stack vendor in Tessera; parallel-class with Phase 2's Slurm/K8s/NVLink adapters at A1 layer); **A2** (new architectural pattern — first non-NVIDIA/x86 silicon family; 2D Torus + ring topology shapes that differ from Slurm hierarchical-containment + K8s API-driven node-labels + NVLink peer-to-peer); **A4** (novel data model — 2 new `TopologyNode.kind` literals + 1 new `TopologyEdge.relationship` literal; new edge density per chip family — 4 NeuronLinks for Trainium vs 2 for Inferentia2); **A7** (first-time territory — Tessera has never shipped against AWS silicon); **PR-class verification** (per SCOPING-MEMO § 2.3 Vendor fungibility table line 287 + 289 — every new vendor adapter ships at full tier matching WU-03 NVLink precedent at R30). | Full-tier prior matches PRD § Phase 3 SLICE structure line 465-466 ("Tier: full" for both 1A and 1B). Bundled cluster ships with full Architect + Implementer + Reviewer + Memorial-Updater per cluster. Audit-tier insufficient: A1 + A2 + A4 + A7 conjunction sets the tier ceiling; downgrade would skip the cold-eye Architect pass on a novel-data-model + novel-architectural-pattern surface. |

### Tier prior discrepancies

(Empty at v1 emission — no Wave 1 cluster yet to surface a discrepancy.)

| WU ID | Coordinator prior | Cluster self-assessed | Wave gate where surfaced |
|---|---|---|---|
| — | — | — | — |

---

## Cluster handoff inventory

Per CLAUDE-COORDINATOR.md §Cluster handoff inventory, handoff artifacts are created at dispatch of the target cluster (not pre-created at plan time). **No CLUSTER-HANDOFF artifacts emitted at this plan time.**

| Handoff artifact | From WU | To WU | Wave boundary | D-test that fired | Emitted at |
|---|---|---|---|---|---|
| (none) | — | — | — | — | — |

**Rationale for zero handoff artifacts at WAVE-PLAN-Phase3-01 v1:** WU-Phase3-1 has zero in-wave producer→consumer edges (single-cluster Wave 1); SLICE 2 + SLICE 3 outbound edges are forward-looking and will be authored at future Coordinator rounds when WU-Phase3-2A/2B/2C dispatch. Phase 2 inbound edges (WU-00, WU-03, WU-04, R36) are pattern-reference / interface-only / convention-based — load-bearing context lives in Phase 2 close-walk + Reviewer reports the WU-Phase3-1 Architect reads directly. No handoff artifact pre-authored; convention follows Phase 2's pattern of "wave gate emits handoffs for the wave it's authorizing" (WAVE-GATE-Phase3-01 will emit a CLUSTER-HANDOFF-Phase3-1-future-SLICE-2 artifact when SLICE 2 dispatches).

Template: `templates/CLUSTER-HANDOFF-TEMPLATE.md`.

---

## Pre-emit grilling

Per `CLAUDE-COMMON.md` Superpowers Review block + Coordinator's pre-emit grilling discipline (CLAUDE-COORDINATOR.md):

- [x] **Every dependency edge is verifiable.** Step 2's tables each cite a specific D-test with concrete reasoning + (where applicable) URL citations for the Neuron SDK public-docs evidence. Inbound D2 edges from WU-00/WU-03/WU-04/R36 are pattern-reference / interface-only edges honestly classified (MEDIUM or LOW); no D1 HIGH claimed where D2 fits. Pairwise check of WU-Phase3-1A ↔ 1B sub-decomposition explicitly documents D5-strict write-conflict as the structural force collapsing the candidates to bundled single-cluster.
- [x] **No unstated assumptions.** Bundled WU-Phase3-1 decision surfaced as Step 3 Judgment call 1 with full reasoning (D-test reality + operator-attention cost + R20+R21 split-decision flexibility precedent). File-layout deferral to Architect surfaced as OQ-Phase3-W1-1. SCOPING-MEMO § 2.3 amendment timing surfaced as OQ-Phase3-W1-2. Neuron SDK doc evidence cited with URLs + retrieval date (2026-05-19) per PR-F6 / PR-F7 evidence-package literature-citation discipline pre-application (architect-side discipline carried forward to WU-Phase3-1 spec time).
- [x] **No scope added beyond PRD.** WU-Phase3-1 traces to PRD lines 434-435 (FR-V1a + FR-V1b) + 447 (AC-P5) + 463-466 (SLICE 1 sub-section). SCOPING-MEMO § 2.3 Vendor fungibility table line 287-289 cited for parallel-class architecture authorization. No invented WUs; no scope expansion beyond what PRD enumerates. Forward-looking edges to SLICE 2 + SLICE 3 are informational pattern-references, not new scope.
- [x] **Cluster can act without guessing.** WU-Phase3-1 has (a) PRD trace + SCOPING-MEMO + PHASE-3-CANDIDATES-PRELIMINARY cross-reference; (b) frame-level AC scope per § 1 PRD AC-P5 + per-cell breakdown in Step 1 table; (c) bounding anti-scope (A8/A10/A11/A12/A13/A16/A17 + Phase 3-specific NEW anti-scope + Phase 2 frozen surfaces enumerated); (d) file tree scope (NEW / MODIFY / READ-ONLY annotations with current line numbers in `engine/types/verdict.ts` verified at `620d0e2` HEAD via `grep -n`); (e) tier verdict (full); (f) Architect spec-time discretion clearly bounded (split-decision threshold + file-layout choice + opportunistic § 2.3 amendment).
- [x] **DAG is acyclic.** Step 4 cycle check passed (trivially — 1 WU in scope). No build-time circular dependencies. Forward-looking SLICE 2/3 edges are informational + out-of-scope for this plan.
- [x] **Tier priors are defensible.** WU-Phase3-1 full-tier prior cites A1 + A2 + A4 + A7 + PR-class verification + matches PRD line 465-466 explicit "Tier: full" framing. Bundled-cluster sizing (12-16 AC target) falls below R20+R21 split-decision threshold (18); Architect retains escalation discretion.

**Adversarial review notes (additional self-grilling):**

- **Risk: "Bundling Trainium + Inferentia hides architecturally significant per-chip-family differences (2D Torus vs ring; 4 NeuronLinks vs 2)."** Response: The Architect's spec MUST enumerate per-chip-family ACs separately (e.g., AC-{r}-X for Trainium 2D Torus edge density; AC-{r}-Y for Inferentia ring edge density) even within the bundled cluster. The bundle is structural (one parser file or two; one cluster either way) — it is NOT a license to flatten the per-chip-family ACs into vendor-agnostic shape. Pre-flag in Step 1 frame-level AC list (a) + (b). The split-decision threshold (>18 ACs) is the structural release valve: if per-chip-family AC enumeration genuinely demands >18 ACs, Architect ESCALATES for split.
- **Risk: "OQ-P3-10 default condition resolution relied on WebFetch / WebSearch of Neuron SDK public docs at Coordinator time — what if the Architect at spec time finds the Neuron SDK output format is materially different from what the Coordinator's public-doc read suggested?"** Response: Coordinator's empirical confirmation is based on 4 public sources retrieved 2026-05-19 with verbatim quotes preserved in Step 1 merge reasoning. If Architect at spec time reads the Neuron SDK output format (e.g., the actual JSON/binary topology data Neuron exposes) and finds the parser logic is materially different for Trainium vs Inferentia, the Architect's discretion to split file layout (OQ-Phase3-W1-1 Option b) is the release valve — does NOT require Coordinator-resequencing. If the parser logic is so different that bundling produces a single-file that's effectively two adapters glued together, escalate for full split. The Coordinator's bundle decision is at the WU/cluster level (one cluster ships both chip families); file-layout within the cluster is Architect's call.
- **Risk: "Rule 4 (anti-scope-allowed-set-forward-coverage) — the Coordinator plan does not enumerate ALLOWED_SET because that's the Architect's spec-time job, but if the Architect's spec misses Phase 3-specific forward-coverage carve-outs, the round will pattern-repeat the Phase 2 Rule 4 violations (5 occurrences across 3 sub-classes at Phase 2 close)."** Response: Pre-flag in WU-Phase3-1 anti-scope (Step 1 table) — "Apply all 7 cross-project rules UPFRONT per Rule 7's (a) Spec template gate + (b) Implementer chore-A pre-commit grep gate + (c) Round-of-derivation self-application". The Phase 3 entry round MUST inherit the post-Phase-2 propagation mechanisms (`scripts/pre-commit-rule-sweep.sh`; SPEC-AUTHORING-CHECKLIST.md gates per R47 Tightening; R50 wave-aggregate verifier). The Coordinator's plan flags this load-bearingly; spec authoring + Reviewer audit are downstream of plan emission.
- **Risk: "PR-class verification at Phase 3 SLICE 1 — Phase 2 had PR-F6 + PR-F7 hybrid-Reviewer-evidence mandates at SLICE 3.C + SLICE 4 close-walks. Does Phase 3 SLICE 1 carry a parallel PR-class mandate, or is vendor adapter expansion a no-PR-trigger round?"** Response: SCOPING-MEMO § 2.3 Vendor fungibility table does NOT enumerate a PR-trigger for vendor adapter additions (PR-F6 was MD-F4 / common-mode; PR-F7 was MD-F5 / event-conditional). Phase 3 SLICE 1 ships a new `TopologySource` impl, not a new attribution layer. **NO PR-trigger fires at WU-Phase3-1.** Hybrid Reviewer at WAVE-GATE-Phase3-01 close is OPTIONAL per R50 tier-aware consolidation Reviewer mandate (all sub-WUs full-tier → consolidation Reviewer optional). External literature citation discipline (per Phase 2 PR-F6 / PR-F7 protocol) does NOT extend to Phase 3 SLICE 1 vendor adapter ACs — those bind on Neuron SDK public-docs evidence (URLs + verbatim quotes per Rule 1 false-compliance-attestation discipline) at the Architect spec authoring layer, not at PR-class hybrid Reviewer mandate layer.
- **Risk: "The Coordinator-attributed cross-project rule audit at NEXT-ROLE.md:57-65 mandates 'Apply all 7 cross-project rules UPFRONT'. The Coordinator plan addresses Rule 1 + 4 + 6 as ACTIVE GATES + Rules 2/3/5/7 as N/A. But Rule 7 (`derived-rule-propagation-mechanism-required`) mandates that rules MUST have explicit propagation mechanisms. Is the WAVE-PLAN itself a propagation surface for Rules 1-7 at Coordinator layer?"** Response: Rule 7 propagation mechanisms apply at Architect spec template + Implementer pre-commit grep + round-of-derivation self-application layers — none of which are Coordinator-owned. Coordinator's responsibility under Rule 7 is to pre-flag the propagation gates in NEXT-ROLE.md to the WU-Phase3-1 Architect dispatch (which NEXT-ROLE.md:57-65 already does). The wave plan itself is not a propagation surface; it's a planning artifact. Honored: pre-flag is preserved in this plan's Step 1 anti-scope row + Pre-emit grilling adversarial note above.

If any check fails: revise this plan before routing. **All 6 checklist items + 5 adversarial notes addressed inline; no failed checks.**

---

## Open questions for operator

The Coordinator does NOT resolve these — they require operator-level decisions or are deferred to the Architect at spec time.

**OQ-Phase3-W1-1 (NEW — file-layout for the bundled adapter under `engine/topology/`):**
- **Option A (Recommended; Coordinator default):** `engine/topology/neuron-source.ts` (single unified Neuron SDK parser; vendor-specific fixtures + node-kind discrimination handle Trainium vs Inferentia at runtime). Matches WU-03 NVLink + WU-04 MD-F4 + WU-00 L0-contract single-file precedent; tightest blast radius; YAGNI-friendly.
- **Option B:** `engine/topology/trainium-source.ts` + `engine/topology/inferentia-source.ts` (two parser files; possibly + shared `engine/topology/neuron-common.ts` helper module). Sets per-chip-family parallel-class precedent at file granularity. Matches PRD:434 explicit `trainium-source.ts` filename for FR-V1a.
- **Default if no operator answer:** Coordinator prior is A. WU-Phase3-1 Architect's call at spec time based on Neuron SDK output format read. Operator override welcome; Architect default A absent override.

**OQ-Phase3-W1-2 (NEW — SCOPING-MEMO § 2.3 Vendor fungibility table amendment timing):**
- **Option A:** WU-Phase3-1 closes opportunistically IF Architect spec touches SCOPING-MEMO anyway (e.g., to add a Phase 3 SLICE 1 sub-row to § 3 Q-cycle estimate; to update Vendor fungibility table line 289 "TAGGED-FUTURE" → "shipped at R{NN}").
- **Option B (Recommended; Coordinator default):** Defer to a future Phase 3 SLICE-close walk. Cleaner scope-bounding for WU-Phase3-1; consistent with Phase 2 R32 MAJOR-1 carry-forward pattern.
- **Default if no operator answer:** Coordinator prior is B. Architect's call at spec time if opportunistic close fits scope.

**OQ-P3-9 (CARRY-FORWARD from PRD § Phase 3 open questions; OPERATOR-DECIDED AT SLICE 1 CLOSE NOT THIS PLAN):**
- Will operator rent a GPU instance for US-07 DCGM validation at the SLICE 1/2 gating moment?
- **Path A (rent):** SLICE 2 includes WU-Phase3-2C real-cluster validation; AC-P6 evaluated empirically.
- **Path B (defer):** AC-P6 DEFERRED; SLICE 2 ships interface portions of FR-V4 only.
- **Decision deferred until WAVE-GATE-Phase3-01 close.** Not blocking for WU-Phase3-1 dispatch.

**OQ-P3-10 (RESOLVED at this plan time — Coordinator-empirical via Neuron SDK public docs):**
- Bundled per default. Architect retains spec-time override discretion via OQ-Phase3-W1-1.
- Evidence: NeuronCore-v2 base + NeuronLink-v2 interconnect family shared across Trainium + Inferentia2 (4 sources cited in Step 1 merge reasoning); topology shape (2D Torus / ring) differentiated via vendor-specific fixtures + node-kind literals.

**OQ-P3-11 (CARRY-FORWARD from PRD — DEFAULT EXTEND v0.3; ESCALATE IF REVIEWER FLAGS):**
- SCOPING-MEMO v0.4 needed? Default: extend v0.3 with Phase 3 amendments at future close-walks (OQ-Phase3-W1-2). Escalate to v0.4 only if Reviewer at SLICE 1 close flags scope-creep beyond v0.3 amendments.

---

## Wave 1 dispatch authorization

**Plan verdict:** READY-TO-DISPATCH.

OQ-Phase3-W1-1 (file layout) is not blocking — Architect spec-time discretion with Coordinator default A. OQ-Phase3-W1-2 (SCOPING-MEMO amendment timing) is not blocking — Coordinator default B (defer) applies. OQ-P3-9 (rental decision) is deferred to SLICE 1 close gating moment. OQ-P3-10 resolved at this plan. OQ-P3-11 default extend v0.3 applies.

Wave 1 cluster authorized for dispatch:

| Cluster | Work unit | Tier (Coordinator prior) | Dispatch routing |
|---|---|---|---|
| (single cluster) | WU-Phase3-1 (AWS Neuron adapter bundled — Trainium 2D Torus + Inferentia2 ring) | full | `./run-pipeline.sh --tier full` from `~/concord/tessera` main worktree |

**Pre-dispatch operator actions:**

1. (Optional) Answer OQ-Phase3-W1-1 (file layout under `engine/topology/`). Coordinator default A applies absent answer.
2. (Optional) Answer OQ-Phase3-W1-2 (SCOPING-MEMO amendment timing). Coordinator default B applies absent answer.
3. (Recommended — required by NEXT-ROLE.md:57-65 + Rule 7 propagation directive) Confirm `scripts/pre-commit-rule-sweep.sh` + SPEC-AUTHORING-CHECKLIST.md gates inherited from Phase 2 close are operational at R53 (Phase 3 entry); these are propagation surfaces (a) + (b) for Rules 1-7 per `~/.claude/CROSS-PROJECT-MEMORIAL.md:3470` Rule 7 canonical text.
4. Run `./run-pipeline.sh --tier full` from the main worktree.

**Post-Wave-1 actions (Coordinator-owned, future round — NOT R52 scope):**

5. At Wave 1 gate (next Coordinator invocation after R53 cluster close), Coordinator authors `coordination/WAVE-GATE-Phase3-01.md` per `templates/WAVE-GATE-TEMPLATE.md`, applying:
   - Per-cluster Reviewer report verification (MERGE-READY status check)
   - `scripts/verify-wave-aggregate.sh WAVE-Phase3-01` exit 0 (aggregate ALLOWED_SET union + cross-cluster contract verification + MEMORIAL fragment semantic-conflict detection per R50)
   - Tier-aware consolidation Reviewer per R50: all clusters ran full-tier → consolidation Reviewer OPTIONAL; operator may invoke `--consolidation-reviewer` flag if integration concerns surface
   - Phase 3 anti-scope verification (no real-cluster access; vendor-neutral interface; A10 carve-out preserved)
6. OQ-P3-9 gating moment resolution: operator decides Path A (rent GPU instance) vs Path B (defer DCGM validation). Decision determines SLICE 2 scope at WAVE-PLAN-Phase3-02 emission.
7. WAVE-PLAN-Phase3-02 (SLICE 2 wave plan) authored at SLICE 1 close gate per OQ-P3-9 disposition. WU-Phase3-2A (Google TPU adapter) is unconditional; WU-Phase3-2B (live topology fetch interface) is unconditional; WU-Phase3-2C (real-cluster L0 validation) is Path-A-conditional.

---

## Version history

| Version | Date | Trigger | What changed |
|---|---|---|---|
| v1 | 2026-05-19 | R52 first Phase 3 Coordinator invocation; PRD Phase 3 scope authored 2026-05-19 at `620d0e2` (post-R51); Phase 3 SLICE 1 wave-plan emission per NEXT-ROLE.md R52 round-scope directive | Initial Phase 3 SLICE 1 wave plan. Single WU (WU-Phase3-1) bundling Trainium + Inferentia adapters per OQ-P3-10 default + Coordinator empirical confirmation (Neuron SDK public docs: shared NeuronCore-v2 + NeuronLink-v2 family). Single Wave 1; full tier per A1+A2+A4+A7. 2 new OQs (OQ-Phase3-W1-1 file layout; OQ-Phase3-W1-2 SCOPING-MEMO amendment timing). OQ-P3-10 resolved at this plan. OQ-P3-9 deferred to SLICE 1 close gating moment. OQ-P3-11 default extend v0.3. 5 adversarial review notes appended to pre-emit grilling. Wave 1 dispatch authorized via `./run-pipeline.sh --tier full` from main worktree (single-cluster; no `--coordinator`; no `multi-track-cluster-setup.sh`). |

---

## Pipeline invocation

```bash
cd /Users/johnwarren/concord/tessera
./run-pipeline.sh --tier full
```

(Standard single-pipeline dispatch for Wave 1's single full-tier cluster. NOT `--coordinator` mode; NOT `multi-track-cluster-setup.sh`. WAVE-GATE-Phase3-01 + SLICE 2 wave plan are separate Coordinator rounds after R53 cluster close.)
