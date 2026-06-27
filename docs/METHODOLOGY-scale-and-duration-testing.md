# Methodology — scale-and-duration testing (clustersynth scenario bundles)

- **Date:** 2026-06-26
- **Status:** Standing methodology (read before any scale/duration test)
- **Applies to:** any test that runs tessera detection against clustersynth scenario
  telemetry (`tools/clustersynth-scenario.ts` + the clustersynth `scenario` harness).

This file exists because two mistakes keep recurring:

1. **Tests start with snapshots.** A run is set up with a few hundred (or few
   thousand) ticks "to check it works", numbers come out, and the numbers get read
   as a result. They are not a result — they are an artifact of too short a window.
2. **Scale is ramped without a resource model**, so a run either under-uses the
   machine or OOMs / runs for hours with no estimate.

Both are addressed below. The runnable harness is `tools/clustersynth-ramp.sh`.

---

## Rule 1 — the window is ≥ 2 months. No snapshots.

**Tessera needs a baseline, and a real baseline is curated over ~2 months.** The
generative model's nonstationarity is keyed to **wall-clock** time — diurnal
(86,400 s), weekly (604,800 s), regime steps, thermal ramp. A short window does not
contain those cycles, so:

- the *baseline/calibration* prefix (first 10% of the window) is too short to be a
  valid reference (`MIN_CALIBRATION_FOR_VALIDITY = 100`, and you want far more than
  the floor), and
- the *test* window sees at most a fraction of one diurnal cycle, which looks like a
  trend, not the periodic structure the factor model is meant to remove.

So a snapshot tells you nothing about whether detection works on real telemetry — it
only measures behaviour on an unrepresentative slice. **The minimum window is 60 days
(5,184,000 ticks at 1 Hz).** `clustersynth-ramp.sh` enforces this and refuses a
shorter window unless `FORCE=1` is set (use only for a plumbing smoke test, never to
report a finding).

**Cadence vs duration.** The DCGM band is 1–30 s; 1 Hz is supported. A coarse run is
statistically ≈ a downsampled fine run (clustersynth `REALISM-PLAN.md`), so a long
window may be generated at a coarser `dt_s` when 1 Hz × 2 months is too large to
materialise for the chosen counter set. **1 Hz × 2 months is only feasible for a few
counters** — restrict to what the test needs (`CS_COUNTERS=gpu_temp_c` for a
temperature-only run cuts volume 5×).

---

## Rule 2 — ramp racks with a resource model, not by guessing.

**Rack knob:** a rack is one NVL72 (72 GPU shards). In a scenario config,
`{"pods":1, "racksPerPod":R}` → `72·R` shards. (`pods:0` yields **zero** shards — do
not use it.)

The harness is **streaming + multi-core** (see `tools/clustersynth-scenario.ts`):
each shard is residualised and scored independently, only scalar e-values are kept,
and the work fans out across `worker_threads`. Consequences for the resource model:

| resource | cost | scaling | binding? |
|---|---|---|---|
| **RAM (analysis)** | factor series held in RAM × workers + a small per-shard working set | factor count is **sublinear** in racks (R=1→4, 8→9, 32→18, 64→26 series); each series is `T` doubles | rarely — flat ~3 GB single-core at 1,152 shards; with `W` workers ≈ `W × (#factors · T · 8 B)` |
| **CPU (analysis)** | per-shard residualise + 4 detectors over `T` ticks | linear in shards | **usually the wall** — ~2.7 s/shard single-core; ÷ ~(workers, measured 5.3× at 9 workers on a 10-core box) |
| **disk** | `counters.ndjson` | ~2.4 GB per rack at 2-month 1 Hz (1 counter) | sometimes |
| **gen time** | `counterTicks` per shard×tick, single-threaded per process | linear in shards×counters | ~2.3 s/shard (×counters); split across cores with `CS_SHARD_RANGE` (below) |

**Picking max racks for a given (cores, RAM, disk, time budget):**

1. **Disk:** `R_disk ≈ free_GB / 2.4` (2-month 1 Hz, 1 counter). Leave headroom.
2. **Analysis RAM** with `W` workers: `R_ram` solves
   `W · (4 + 0.36·R) · T · 8 bytes ≲ 0.7 · RAM`. With streaming this is generous —
   on 32 GB it is not the limit below several thousand racks; if it bites, lower `W`.
3. **Time:** single-core analysis ≈ `2.7 s × 72 · R`; with `W` workers divide by the
   measured speedup (~5× at 9 workers — sub-linear due to I/O + per-worker factor
   load). Generation ≈ `2.3 s × 72 · R` (parallelise across tiers). Pick `R` so
   gen + analysis fits your budget.
4. `R_max = min(R_disk, R_ram, R_time)`. On a typical workstation **time is the
   binding term**, so a faster/more-core machine raises the ceiling more than more RAM.

**Default worker count** is `cores − 1` (override `CS_WORKERS=N`; `=1` for single-core,
e.g. to reproduce a baseline number or debug). On a dedicated box, use all cores.

**Generation is the long pole** (single-threaded per process, ~5× cost with all 5 DCGM
counters). Split a tier's generation across cores with clustersynth's `CS_SHARD_RANGE=
"start:count"`: run one process per core, one of them writing the shared sidecars and the
rest with `CS_COUNTERS_ONLY=1`, then concatenate the `counters.ndjson` parts (order is
irrelevant — the scorer maps by shard id). Output is byte-identical to a single-process
gen. This is the difference between a ~10 h and a ~45 min R=64 5-counter generation.

---

## Recurring-fault checklist (run before reporting any scale result)

- [ ] Window ≥ 60 days? (`steps ≥ 5,184,000` at `dt_s:1`; or coarser `dt_s` × 60 d.)
- [ ] Calibration prefix (10% of `T`) ≫ `MIN_CALIBRATION_FOR_VALIDITY` (100)?
- [ ] Counter set restricted to what the test needs (`CS_COUNTERS`)?
- [ ] Rack count chosen from the resource model, not guessed?
- [ ] Reported numbers are from the ≥ 2-month run, **not** from an earlier snapshot?
- [ ] Multi-core result spot-checked against single-core (must be byte-identical)?

---

## Runnable recipe

```bash
# one-time: clustersynth checked out as a sibling of tessera, deps installed
git -C .. clone https://github.com/johnpatrickwarren-oss/clustersynth.git || true
( cd ../clustersynth && pnpm install )

# ramp racks at the 2-month 1 Hz temperature window, auto-using cores-1 workers
#   RACKS="1 4 8 16 32"  explicit tiers, or  MAX_RACKS=64  for 1,2,4,...,64
tools/clustersynth-ramp.sh

# knobs (env):
#   RACKS="1 4 16"      tiers to run (default "1 4 8 16")
#   DURATION_DAYS=60    window length; MIN 60 (snapshot guard); FORCE=1 to override
#   COUNTERS=gpu_temp_c counter subset passed as CS_COUNTERS
#   WORKERS=9           analysis worker threads (default cores-1)
#   Q=0.05  SEED=1
#   CLUSTERSYNTH=../clustersynth   OUTDIR=<scratch>   KEEP=1 (don't delete bundles)
```

The script enforces Rule 1, generates each tier (`CS_COUNTERS`), runs the parallel
analysis (`CS_WORKERS`), and prints the scaling curve (shards, gen time, analysis
time, peak RSS, and the per-counter finding). It deletes each bundle after analysis
unless `KEEP=1` (a 2-month rack tier is ~2.4 GB/rack on disk).

### Known finding this methodology reproduces

On **1 Hz temperature**, lag-1 autocorrelation ≈ `exp(−1/τ_idio)` ≈ 0.992 (near
unit-root), so the per-shard null is maximally violated and the result is
**scale-invariant** from 72 to ≥ 1,152 shards: the valid UI mean-shift e-value is
zero-power, the nuisance-robust BF e-value selects ~all shards at FDP ≈ 0.99, and
`distributionalSignature` fires on ~100% of healthy shards. The instrumented
common-mode *removal* stays clean — the gap is the per-shard NULL (ADR 0011/0012).
A longer window makes this sharper, not better; it is **not** fixed by using a bigger
window, which is exactly why the 2-month rule is about validity, not about rescuing
the guarantee.
