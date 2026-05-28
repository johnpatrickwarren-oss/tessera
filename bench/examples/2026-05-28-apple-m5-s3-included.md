# Tessera per-window cost — clustersynth bench

- Engine: `@johnpatrickwarren-oss/deploysignal-engine@0.3.1-pre`
- Host: `Apple M5 × 10 cores, 32 GB RAM, darwin arm64`
- Date: 2026-05-28T19-30-33-690Z
- Config: `{ p: 11, mmd_pool: 500, α_betting: 0.005, α_fdr: 0.05, max_hop_distance: 2, n_fires: 10, warmup: 3, iters: 10 }`

## Per-window primitives

| Fixture | Shards | Parse ms | Attribution p50 ms | Attribution p99 ms | Welford µs/shard | Betting ns/shard | MMD µs/shard | e-BH ms | RSS Δ MB |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `gb200-s0-72` | 72 | 1.1 | 0.59 | 0.99 | 0.28 | 270 | 3.2 | 0.00 | 15 |
| `gb200-s1-720` | 720 | 3.3 | 3.18 | 3.48 | 0.17 | 26 | 4.8 | 0.04 | 21 |
| `gb200-s2-7200` | 7,200 | 34.3 | 31.32 | 32.88 | 0.16 | 12 | 3.4 | 0.45 | 247 |
| `gb200-c0-28800` | 28,800 | 119.5 | 140.06 | 142.81 | 0.18 | 6 | 3.1 | 1.62 | 494 |
| `gb200-s3-72000` | 72,000 | 305.6 | 346.64 | 383.30 | 0.20 | 6 | 3.2 | 3.95 | 572 |

## Steady-state cores at common cadences

| Fixture | Shards | 1s cadence (cores) | 5s cadence | 15s cadence | No MMD, 1s |
|---|---:|---:|---:|---:|---:|
| `gb200-s0-72` | 72 | 0.001 | 0.0002 | 0.0001 | 0.0006 |
| `gb200-s1-720` | 720 | 0.007 | 0.0014 | 0.0005 | 0.0034 |
| `gb200-s2-7200` | 7,200 | 0.058 | 0.0115 | 0.0038 | 0.0330 |
| `gb200-c0-28800` | 28,800 | 0.235 | 0.0470 | 0.0157 | 0.1471 |
| `gb200-s3-72000` | 72,000 | 0.597 | 0.1194 | 0.0398 | 0.3652 |

> Cores formula: `per_window_ms / cadence_ms` where
> `per_window_ms = welford_us·N + betting_ns·N + mmd_us·N + attribution_p50 + ebh_p50`.
> Assumes detector mix (betting + Welford + MMD every window) on a single Node event-loop thread.

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

The cadence table assumes MMD evaluates **every shard every window**. In practice, sparse sampling (see clustersynth R05) materially changes the cores number — for fixtures where MMD dominates, sampling 1-in-10 reduces the steady-state cost by ~10× on the MMD term. R05 is the empirical follow-up.
