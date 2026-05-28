# bench/

Performance harnesses against synthetic fixtures. Not part of the test suite; not invoked by `pnpm test`.

## `clustersynth-perf` — per-window detector cost vs. cluster scale

Drives Tessera's engine primitives (`updateBettingState`, multivariate Welford, `rbf`/MMD pool cross-terms, `attributeCommonMode`, `eBenjaminiHochberg`) against [clustersynth](https://github.com/johnpatrickwarren-oss/clustersynth) fixtures and emits a per-window cost + steady-state cores estimate.

```bash
# generate fixtures (one-time)
git clone https://github.com/johnpatrickwarren-oss/clustersynth.git
cd clustersynth && pnpm install
for s in s0 s1 s2 c0; do
  node_modules/.bin/tsx src/cli.ts gb200 $s \
    --out ../tessera/test/_substrate/clustersynth-gb200-$s.json
done

# run the bench
cd ../tessera && pnpm bench:clustersynth
#   → bench/results/<ISO-timestamp>.csv
#   → bench/results/<ISO-timestamp>.md

# include S3 (72,000 GPUs; ~194 MB JSON)
pnpm bench:clustersynth --include-s3
```

## Interpreting the report

The Markdown report has two tables:

1. **Per-window primitives**: raw per-shard / per-window cost at fixed config (`p=11`, MMD pool=500, `α_betting=0.005`, etc.).
2. **Steady-state cores at common cadences**: total CPU at 1s / 5s / 15s window cadence, with and without MMD running every window. The "No MMD, 1s" column is the cheap-detector floor; the "1s cadence (cores)" column is the ceiling with MMD on everywhere.

The cores estimate assumes a single-threaded Node event loop. If the 1s/with-MMD number lands > 1 core, that's the signal to either sample MMD (see clustersynth coordination R05) or shard the detector pass to Web Workers.

## What this bench does NOT measure

- DCGM / NVML ingestion cost (no real cluster)
- Full `evaluateEMmd` with a CompiledConfig (primitive-level only; the composition assumption is documented in the report)
- Baseline curation cost (offline batch, not steady state)
- Inter-machine comparison (numbers are for the bench host only)

See `coordination/specs/Q-R04-SPEC.md` (in the clustersynth repo) for the full spec and acceptance criteria.
