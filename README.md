# Tessera

**Statistically-rigorous behavioral observation for AI training/inference clusters.**

Tessera detects deviations in AI cluster behavior at the per-shard level and across the overarching cluster, surfacing issues before they cause impact. Built on the statistical detector engine inherited from [DeploySignal](https://github.com/johnpatrickwarren-oss/deploysignal) — Family A/C/D/E detectors, Ville-bounded e-processes, hierarchical baseline pooling — applied to a fundamentally different operational scope: a running tightly-coupled AI cluster (100-10000 GPU shards in the exemplar case) rather than a single deployment decision gate.

## Status

**Pre-v1; scoping phase.** Local-only git repo as of 2026-05-15. Will publish to a public GitHub repo (`github.com/johnpatrickwarren-oss/tessera`) once v1 is solid.

Current state of scoping work: see `coordination/`.

## What Tessera does vs. what DeploySignal does

| | DeploySignal | Tessera |
|---|---|---|
| **Scope** | One canary deployment → one verdict | N shards of a running cluster → per-shard + cluster-wide observation |
| **Stakeholder** | Production SRE / deployment owner | Cluster oncall / AI infra operator |
| **Output** | Proceed / extend / rollback decision | Per-shard deviation attribution + fleet-event vs shard-fault distinction |
| **Trigger** | Each deployment | Continuous |
| **Failure class detected** | Pre-existing-detector classes applied to canary metrics | Same engine; per-shard SDC-class faults that DCGM/NVML don't catch; topology-localized common-mode failures; event-conditional drift attribution |

Tessera is **not** a fork or extension of DeploySignal main — it's a separate product that reuses the statistical engine. Possible future integration: Tessera signals feed back to DeploySignal's correlation layer (deferred; Phase 3+ commitment).

## Engine sourcing strategy

**Vendor-first.** Tessera copies the necessary engine components (detector implementations, Ville-bounded e-process primitives, hierarchical-pooling cell-matrix infrastructure) from DeploySignal into Tessera's own tree at initial scaffold. Commitment: extract the shared engine to a separate npm package once Tessera's needs across all three founding-architecture extensions are concrete (Phase 2 commitment).

Each vendored file gets a header noting:
- Source: DeploySignal path + SHA
- Sync policy: vendored-at-pin or vendored-with-deltas
- Extract target: future shared package name (TBD at Phase 2)

## Methodology

Tessera applies the [Anchor](https://github.com/johnpatrickwarren-oss/anchor) coordination methodology (four-anchor pre-merge defense, role separation, memorial accretion, anti-scope ledger discipline, pair-review 3-check). See `coordination/` for active scoping artifacts.

Learnings from Tessera and DeploySignal flow back into Anchor as methodology refinements (Anchor-memorialization principle, John 2026-05-15).

## Layout (planned; not all directories exist yet)

```
tessera/
├── README.md                   # This file
├── coordination/               # Architect + Reviewer artifacts; PROJECT-CONTEXT.md
├── engine/                     # Vendored statistical engine (from DeploySignal); per-shard + cluster extensions
├── tools/                      # Synthetic-cluster substrate generators; topology injection harness
├── test/                       # Per-shard + cross-shard regression tests; pair-review evidence matrices
└── docs/                       # Architecture notes; engine-vendoring policy; integration points
```

## License

License intentionally not specified at this stage. Contact john.patrick.warren@gmail.com for commercial or deployment use.

## Contact

John Warren · john.patrick.warren@gmail.com
