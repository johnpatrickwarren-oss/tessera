# Tessera

**Statistically-rigorous behavioral observation for AI training/inference clusters.**

Tessera detects deviations in AI cluster behavior at the per-shard level and across the overarching cluster, surfacing issues before they cause impact. It uses the statistical-detector engine derived from [DeploySignal](https://github.com/johnpatrickwarren-oss/deploysignal) — Family A/C/D/E detectors, Ville-bounded e-processes, hierarchical baseline pooling — applied to a fundamentally different operational scope: a running tightly-coupled AI cluster (100-10000 GPU shards in the exemplar case) rather than a single deployment decision gate.

## Status

**Phase 3 closed; v1 publication candidate (2026-05-20).** 67+ rounds of iterative-spec-with-cold-eye-Reviewer development have shipped vendor coverage across the major AI compute substrates plus a bi-directional integration interface with DeploySignal.

| Phase | Scope | Status |
|---|---|---|
| Phase 1 | Engine vendoring + SCOPING-MEMO-v0.3 foundations | Closed |
| Phase 2 | Per-shard residual semantics + hierarchical e-value combination + e-BH FDR + freeze-hook | Closed |
| Phase 3 SLICE 1 | AWS Trainium + AWS Inferentia (Neuron Link topology) adapters | Closed |
| Phase 3 SLICE 2 | Google TPU/ICI adapter + `fetchSnapshot(ctx)` live-fetch interface across 5 adapters | Closed |
| Phase 3 SLICE 3 | DS integration interface contract + Tessera→DS feed + DS→Tessera event consumer + freeze-hook real-event factory | Closed |
| Phase 4 (candidate) | Engine npm extract (dedicated design cycle); real-cluster DCGM validation; methodology framework consolidation | Pending |

## What Tessera does

**Per-shard observation primitives:**
- TopologySnapshot ingestion from 6 vendor adapters (Slurm, Kubernetes, NVLink, AWS Neuron Trainium + Inferentia, Google TPU/ICI)
- `TopologySource.fetchSnapshot(ctx?)` interface with sparse-data resilience
- Per-shard residual semantics + topology-aware freeze-hook
- Hierarchical e-value combination across shard/host/rack layers
- e-BH FDR control over the per-shard verdict surface

**DeploySignal integration:**
- HTTP API contract (TypeScript types + endpoint metadata) at `engine/ds-integration/`
- Tessera→DS feed adapter: per-shard `VerdictGroup` observations → DS correlation layer
- DS→Tessera event consumer + factory: real deploy-event-driven freeze-hook activation
- Bi-directional contract eliminates engine duplication without requiring npm-package extraction (Phase 4 candidate)

## What Tessera does NOT do

- **Hardware diagnosis.** Tessera observes counter behavior; per-GPU fault attribution remains anti-scope (A10 carve-out preserved across all phases).
- **Real-cluster DCGM validation** as of v1. Validated against synthetic fixtures derived from public Neuron SDK + JAX topology code + TPU v4/v5 papers. Real-cluster rental validation is a Phase 4 candidate (Path B selected at Phase 3 SLICE 1/2 gate per OQ-P3-9).
- **Customer telemetry consumption.** A8/A11 inherited from Phase 1; only operator-controlled rental environments or synthetic fixtures are in-scope.

## Tessera vs DeploySignal

| | DeploySignal | Tessera |
|---|---|---|
| Scope | One canary deployment → one verdict | N shards of a running cluster → per-shard + cluster-wide observation |
| Stakeholder | Production SRE / deployment owner | Cluster oncall / AI infra operator |
| Output | Proceed / extend / rollback decision | Per-shard deviation attribution + fleet-event vs shard-fault distinction |
| Trigger | Each deployment | Continuous |
| Failure class | Pre-existing-detector classes applied to canary metrics | Same engine; per-shard SDC-class faults that DCGM/NVML don't catch; topology-localized common-mode failures; event-conditional drift attribution |

Tessera is **not** a fork or extension of DeploySignal — it's a separate product that reuses the statistical engine. The two integrate via HTTP contract (`engine/ds-integration/`) rather than runtime code sharing.

## Engine sourcing

Tessera vendors the load-bearing engine subset from DeploySignal at SHA `5a72371`. Each vendored file carries a header noting:
- Source: DeploySignal path + SHA
- Sync policy: vendored-at-pin (byte-identical) or vendored-with-deltas (Tessera extensions added)

Engine npm extract (eliminating vendoring drift via shared package) is **deferred to a Phase 4 dedicated design cycle.** The R61 architectural-reality discovery surfaced that a clean extract requires resolving the types-barrel coupling between vendored-with-deltas surfaces and the detection algorithms — a project-close-magnitude decision that deserves its own design phase rather than absorption into a SLICE 3 wave.

## Getting started

Requires Node ≥ 20 and pnpm ≥ 11.

```bash
git clone https://github.com/johnpatrickwarren-oss/tessera.git
cd tessera
pnpm install
pnpm test      # runs the full test suite (~440 tests)
pnpm build     # tsc compile
```

## Quick demo

Once installed, run any of four canned scenarios to see Tessera detect synthetic faults end-to-end:

```bash
pnpm demo clean-baseline       # healthy fleet — no firings
pnpm demo sdc-drift            # silent SDC drift on shard-04 → Family A betting fires
pnpm demo common-mode-rack     # 3 shards on shared rack → 1 common-mode candidate
pnpm demo event-conditional    # firmware-push event → freeze-hook activates
```

Each scenario runs in under 30 seconds, produces deterministic ASCII output, and exercises one real engine surface against synthetic inputs (no live cluster needed). Source: [`tools/demo-scenario.ts`](./tools/demo-scenario.ts).

## Methodology

Tessera was developed using the [Anchor](https://github.com/johnpatrickwarren-oss/anchor) coordination methodology — a four-role pipeline (Architect → Implementer → Reviewer → Memorial-Updater) with cold-eye discipline, threshold-aware reinforcement accretion, and explicit ESCALATE patterns for spec/reality mismatches.

The full audit trail is preserved in this repo's commit history (every round's role-tagged commits, cold-eye Reviewer reports, Memorial-Updater outputs, and ESCALATE-resolution patterns are public). The `coordination/` directory contains:

- `PRD.md` — Product requirements (per-phase scope)
- `SCOPING-MEMO-v0.3.md` — Engine vendoring policy + cross-cutting anti-scope
- `WAVE-PLAN-*.md` — Coordinator wave plans (PRD decomposition + DAG analysis)
- `WAVE-GATE-*.md` — Wave-close attestations
- `MEMORIAL.md` — Cross-round violation + confirmation ledger
- `specs/Q-RNN-SPEC.md` — Per-round Architect specifications

CLAUDE-*.md files at the repo root hold the per-role pipeline disciplines (CLAUDE-COMMON.md + CLAUDE-ARCHITECT.md + CLAUDE-IMPLEMENTER.md + CLAUDE-REVIEWER.md + CLAUDE-MEMORIAL.md + CLAUDE-COORDINATOR.md).

## Layout

```
tessera/
├── README.md                     # This file
├── LICENSE                       # Apache 2.0
├── package.json                  # pnpm-managed (packageManager: pnpm@11.x)
├── pnpm-lock.yaml
├── tsconfig.json + tsconfig.test.json
├── CLAUDE-*.md                   # Anchor pipeline role disciplines
├── coordination/                 # PRD + specs + wave plans + memorial + reviews + logs
├── engine/                       # Statistical-detector engine (vendored from DS) + per-shard extensions
│   ├── core.ts
│   ├── detectors/                # Family A/C/D/E detector implementations
│   ├── topology/                 # Vendor adapters: slurm, k8s, nvlink, neuron, tpu, + base
│   ├── types/                    # Verdict + config + policy + audit schemas (Tessera-extended)
│   ├── events/                   # Cluster event feed + freeze-hook
│   ├── ds-integration/           # HTTP API contract + adapters (Tessera↔DS bi-directional)
│   ├── per-shard/                # Per-shard residual semantics
│   └── l0/, l1/, fleet/, o0/     # Layered analysis primitives
├── test/                         # 440+ tests (per-AC; per-round test files q01–q66)
├── scripts/                      # Pipeline scripts (run-pipeline.sh, verify-*.sh, finalize-round.sh)
├── run-pipeline.sh               # Anchor four-role pipeline orchestrator
└── tools/                        # Synthetic fixtures + topology injection harness
```

## License

Apache 2.0. See `LICENSE`.

## Contact

John Warren · john.patrick.warren@gmail.com
