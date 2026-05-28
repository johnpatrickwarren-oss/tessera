# Tessera per-window cost — clustersynth bench

- Engine: `@johnpatrickwarren-oss/deploysignal-engine@0.3.1-pre`
- Host: `Apple M5 × 10 cores, 32 GB RAM, darwin arm64`
- Date: 2026-05-28T20-14-24-434Z
- Config: `{ p: 11, mmd_pool: 500, mmd_window_b: 30, mmd_bandwidth: 4.690, α_betting: 0.005, α_fdr: 0.05, max_hop_distance: 2, n_fires: 10, warmup: 3, iters: 10 }`

## Per-window primitives

| Fixture | Shards | Parse ms | Attribution p50 ms | Attribution p99 ms | Welford µs/shard | Betting ns/shard | MMD floor µs/shard | MMD full µs/shard | Full/floor ratio | e-BH ms | RSS Δ MB |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `gb200-s0-72` | 72 | 1.0 | 0.56 | 0.90 | 0.27 | 298 | 3.2 | **102.1** | 31.8× | 0.01 | 15 |
| `gb200-s1-720` | 720 | 7.6 | 3.14 | 3.32 | 0.17 | 23 | 3.3 | **103.6** | 31.3× | 0.04 | 20 |
| `gb200-s2-7200` | 7,200 | 35.2 | 31.52 | 33.25 | 0.16 | 11 | 3.4 | **104.4** | 30.4× | 0.47 | 194 |
| `gb200-c0-28800` | 28,800 | 116.0 | 141.22 | 143.36 | 0.19 | 6 | 3.2 | **105.0** | 32.9× | 1.59 | 555 |
| `gb200-s3-72000` | 72,000 | 342.9 | 362.77 | 415.01 | 0.20 | 6 | 3.3 | **109.9** | 33.0× | 4.91 | 390 |

**MMD floor** = m=500 rbf cross-terms only (~500 kernel evals/shard). Lower bound; underestimates production cost by ~30× by construction.
**MMD full** = engine's actual `computeUt` at b=30, m=500 (~15870 kernel evals/shard via xx + xy terms). Production cost class.

## Steady-state cores at common cadences

| Fixture | Shards | 1s — no MMD | 1s — MMD floor | **1s — MMD full** | 5s — MMD full | 15s — MMD full | 1s — MMD@k=10 |
|---|---:|---:|---:|---:|---:|---:|---:|
| `gb200-s0-72` | 72 | 0.0006 | 0.0008 | **0.008** | 0.002 | 0.0005 | 0.001 |
| `gb200-s1-720` | 720 | 0.0033 | 0.0057 | **0.078** | 0.016 | 0.0052 | 0.011 |
| `gb200-s2-7200` | 7,200 | 0.0332 | 0.0580 | **0.785** | 0.157 | 0.0523 | 0.108 |
| `gb200-c0-28800` | 28,800 | 0.1485 | 0.2406 | **3.174** | 0.635 | 0.2116 | 0.451 |
| `gb200-s3-72000` | 72,000 | 0.3822 | 0.6218 | **8.293** | 1.659 | 0.5529 | 1.173 |

> **Read this carefully:**
> - `1s — no MMD` is the floor with only cheap detectors (betting + Welford + attribution + e-BH). Single-thread comfortable at every scale.
> - `1s — MMD floor` is what R04 originally published. **Over-optimistic by ~30×** because it only counts the xy cross-term floor (~500 evals/shard) rather than full computeUt (~15,000 evals/shard).
> - **`1s — MMD full` is the realistic production cost** with MMD running on every shard every window. Past a single core at S2+; needs Web Worker sharding or sparse sampling.
> - `1s — MMD@k=10` applies the R05-validated sparse-sampling strategy (1-in-10 evaluations) to the full MMD cost. Brings even S3 back to ~1 core territory while preserving α (R05 confirmed empirically).
>
> Per-window total: `welford·N + betting·N + mmd·N + attribution + e-BH`. Single Node event-loop thread; not parallelized.

## What this measures vs. doesn't

**Measured** (against the committed clustersynth fixtures):

- Per-shard cost of the load-bearing detector primitives at fixed config (p=11, MMD pool=500)
- End-to-end `attributeCommonMode` wall time on the real topology graphs
- Fleet-level `eBenjaminiHochberg` cost as a function of N
- Snapshot parse time (JSON load → engine TopologySnapshot)

**NOT measured** (out of scope by Q-R04-SPEC § Anti-scope):

- DCGM / NVML ingestion cost from a real cluster — requires real hardware
- Full `evaluateEMmd` end-to-end with a CompiledConfig — primitive-level only
- Baseline curation (MCD-Mahalanobis offline batch) — separate workload, not steady state
- Inter-machine comparison — these numbers reflect the bench host's hardware only

## Caveats on composition

The cadence table emits **both** the cross-term floor (the R04 column R05 still uses) AND the full-`computeUt` ceiling. Read `MMD full` for production cost; the floor exists for the lower-bound reference and to document what's possible if MMD is sharded onto Web Workers or restricted to flagged shards (adaptive cascade — R07+ candidate).

R05's sparse-sampling envelope showed empirically that α is preserved at k=10 and detection latency scales ~linearly; the `1s — MMD@k=10` column applies that strategy to the full cost. For SDC-class drift on rare shards, the recommended pipeline is: cheap detectors on every shard every window → MMD only on the small subset flagged by betting → full computeUt on that subset. At realistic flag rates (~1% of shards), even S3 stays well under 1 core.
