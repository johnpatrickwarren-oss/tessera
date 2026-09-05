# Pre-registration — e-BY false coverage at tier T2: the ADR 0029 effect interval on clustersynth bundles under the loop's own dispatch (`2026-09-e-by-t2`, C72)

- **Study id:** `2026-09-e-by-t2`
- **Register:** `~/concord/knowledge/WORKLIST.md` row C72; brief in `knowledge/PROMPTS.md` §C72.
- **What it re-measures:** study `2026-09-action-surface` (ADR 0029) at tier T2. Every e-BY
  measurement so far is T1 (house synthetic windows). `knowledge/methodology/pages/detector-certification-protocol.md`
  §Evidence tiers: T2 = independent synthetic the detector was not tuned against; clustersynth is
  the house T2 substrate (`knowledge/methodology/pages/test-substrates.md`).
- **Discipline:** `knowledge/methodology/pre-registration-discipline`; `harness-discipline`.
- **Engine:** v0.6.11-pre (`fleet/e-by.ts` `eBenjaminiYekutieli`; `detectors/mixture-confidence-sequence.ts`
  `mixtureConfidenceSequenceAt`; `fleet/calibration-monitor.ts` `gInc`). Tessera at this commit
  carries ADR 0029 (`4818bed`); nothing in `tools/` changes for this study.
- **clustersynth:** `c1387a4` (main), built (`pnpm build`) so `dist/cli.js` and `dist/harness/*.js`
  are importable.
- **Status: REGISTERED, NOT RUN.** Committed before any harness code so that no endpoint, bar,
  grid, seed or truth rule below is chosen after a number is seen. A later change is an
  amendment, appended and dated.

## 1. The system, from code

Per cycle the seam (`tools/telemetry-source.ts` `windowToEmitter`, lines 92–112) turns each
treatment shard's contrast `d = treatment − control` into `r = applyContrast(d, fit)` under the
shard's healthy baseline fit (`tools/contrast.ts:28–31`: center, whiten at φ, standardize by
loc/scale; `whiten(x, prev, φ) = x − φ·prev`, first tick unchanged,
`tools/per-shard-whitening.ts:104–105`), takes `normalizedMixtureEValue(r)` (line 104) and, because
a baseline fit was used, passes `csInputs = { S_t: Σr, t: r.length }` (line 105). The loop
(`tools/mode-b-loop.ts`) runs the certified e-BH per emitter in Mode B, prices e-BY intervals for
the selected shards that carry inputs at `α_i = fcrDelta·|S′|/K`, `K = shards.length`
(lines 224–235), and attaches the interval to the action only at dispatch (line 251); the
calibration monitors run the engine's 'gaussian' increment on the known-null cohort
(`updateMonitors`, `incrementKind: 'gaussian'`) and a failing fraction below 0.8, or a failed
whiteness verdict, sends the emitter to Mode A, which dispatches nothing and withdraws standing
actions as `revoked`.

The reference feed `bundleFeed(healthyDir, monDir, nCycles)` (`tools/telemetry-source.ts:150–186`)
fits one baseline per treatment shard from the healthy bundle's full contrast, reveals the
monitoring bundle's prefix `[0, floor((k+1)/nCycles·T_mon))` at cycle k, and slices the healthy
bundle `[k/nCycles·T_h, (k+1)/nCycles·T_h)` as the cycle's known-null cohort.

**The estimand.** The interval covers the window-mean contrast shift from the baseline fit in
standardized units over the prefix the dispatch was made on. clustersynth's label gives a raw
magnitude on a resource, not that quantity. §3 says how the truth is computed.

**Two facts about the substrate that fix the design, from code.**

1. A monitoring bundle and a healthy bundle generated at the *same* seed share the idiosyncratic
   noise realization: the per-shard level is `rngFor(seed, baseline:${gpuId}:${counter})` and the
   noise stream `rngFor(seed, eps:${gpuId}:${counter})` (`clustersynth/src/harness/factor-model.ts:302, 305`),
   both keyed by seed and shard id only. The ramp script's design ("two same-topology/seed
   bundles") therefore fits the baseline on the very noise the detection window contains, and a
   null shard's monitoring contrast is byte-for-byte its baseline contrast. A different seed
   changes the levels and loadings, so the fit no longer applies. The study generates the
   monitoring bundle at *twice* the length at the same seed and drives the loop from its second
   half: the level and loadings are identical, and the second half consumes the next draws of the
   same PRNG stream (`counterTicks` draws sequentially, lines 305–330), which are independent of
   the healthy bundle's.
2. A fault enters the treatment additively after the noise (`factor-model.ts:328`,
   `y += faults.meanDelta(...)`); the control twin carries `NO_FAULTS` (`scenario.ts`,
   `controlFaults`, contamination off); the twin shares the treatment's factor instances and
   loadings (`loadingId`, `factor-model.ts:278, 287`) and, under the out-of-family nonlinear axis,
   its transformed common mode (`nonlinearMix` keyed by `loadingId`, `out-of-family.ts`). So the
   contrast is `d_s = (level difference) + (ε_T,s − ε_C,s) + δ_s` with `δ_s` the deterministic
   mean path of the labelled faults, and `applyContrast` is affine. This makes the truth exact
   (§3) and predicts that the nonlinear and factors-hidden knobs cannot reach the contrast path
   (§5).

Because of fact 1, the loop is driven by a study feed that is `bundleFeed` with a monitoring
window offset (`harness/feed.mjs`); P4 checks that at offset 0 it yields cycles deep-equal to the
shipped `bundleFeed`'s on one bundle pair. Shipped code is not modified.

## 2. The substrate

clustersynth `scenario` bundles, gb200, one pod of four racks: `K = 288` treatment gpu shards,
each with its matched control twin (`controlArm: true`). One counter, `gpu_temp_c`
(`CS_COUNTERS=gpu_temp_c`); hourly cadence (`window.dt_s = 3600`).

- **Healthy bundle** per (arm, seed): `window.steps = 1440` (60 days, the ≥ 56-day guard holds
  with no override), `faults: false`. The baseline fit and the known-null cohort come from it.
- **Monitoring bundle** per (arm, band, seed): `window.steps = 2880` (120 days), faults on at
  `rate: 0.1` (28 gpu-level faults per bundle, all four types, all three levels, the default two
  shared cdu/pod events), same seed. The loop's monitoring window is ticks `[1440, 2880)`, so
  `T_win = 1440` and a labelled fault whose interval `[t_onset, t_offset)` does not reach the
  window is a null shard for this study (the classification in §3 is by the realized path, not
  the label).
- **Fault-severity bands** (`CS_FAULT_MAG`): `1:2`, `2:4`, `4:8` noise-sd units (the generator's
  default is `4:8`; the audit that motivated the knob asked for `1:3`).
- **Arms** (the out-of-family knobs `knowledge/methodology/pages/clustersynth-out-of-family-2026-08-05`
  names, plus the one that reaches the idiosyncratic noise):
  - `infamily` — the shipped generator.
  - `nonlinear` — `outOfFamily.nonlinear = 1`.
  - `hidden` — `factorsHidden: true`.
  - `heavy` — `outOfFamily.heavyTails = 1` (Student-t, df = 3, standardized).
- **Seeds:** `seed_j = 72001 + 101·j`, `j = 0..19`. The same seed across arms and bands gives
  matched levels, loadings and fault placements (the band scales the same magnitude draw).
- **Size:** 80 healthy bundles, **N = 240** monitoring bundles (4 arms × 3 bands × 20 seeds),
  each one replication of the loop. Bundles are generated by the clustersynth CLI into a
  gitignored directory; the run records the sha256 of every bundle's `counters.ndjson` and
  `labels.json` so the run is reproducible from the manifest.

## 3. The loop, the selection, the truth

**The loop.** Per replication and per `fcrDelta = δ ∈ {0.05, 0.10}`: `new ModeBLoop({ q: 0.1,
fcrDelta: δ, sink: new RecordingSink() })` (q = 0.1 is the reference CLI's value,
`telemetry-source.ts` main), `runModeBLoopLive(studyFeed(healthy, mon, 12, 1440), loop, sink)`.
Twelve cycles of 120 ticks; the calibration monitors accumulate across cycles from a fresh state.

**The selection** is the loop's own dispatch: every `FleetAction` the sink receives over the
twelve cycles. A shard dispatched, resolved and dispatched again contributes two actions, each
with its own interval on its own prefix. Nothing else selects.

*A subtlety recorded in advance.* The loop prices the cycle's intervals at
`α_i = δ·|S′|/K` with `S′` the cycle's *selected* shards that carry inputs, then attaches an
interval only to the *newly dispatched* subset (standing actions keep the interval they were
dispatched with). Theorem 13.7 bounds the FCR of the selected set; the dispatch surface is a
data-dependent subset of it priced at the larger set's level. The study measures the surface the
loop ships; it does not re-price.

**The truth per dispatched action** (shard i, cycle k, prefix length `t = effect.t`), under the
shard's fixed healthy fit `(φ, loc, scale, center)`:

```
δ_s   = applier.meanDelta(i, 'gpu_temp_c', baseTs + (1440 + s)·3600),  s = 0..t−1
w_0   = δ_0;  w_s = δ_s − φ·δ_{s−1}  (s ≥ 1)                         (the whitening)
θ_i(t) = (1/t)·Σ_{s<t} w_s / scale
```

`applier = buildApplier(seed, labels)` from the monitoring bundle's `labels.json`
(`clustersynth/dist/harness/faults.js`), `baseTs = 1_700_000_000` (`scenario.ts`). This is exact
for the deterministic part by §1 fact 2. The null part `E[(ε_T − ε_C − center)·(1−φ) − loc]/scale`
is taken as 0, the same assumption `2026-09-action-surface` made for un-faulted shards under a
fixed fit; it is checked, not assumed silently: the run reports, over exact-null shards, the mean
and sd across shards of the full-window `S_T/T` against the noise-only sd `1/√1440 ≈ 0.026`.

Why not a Monte Carlo over regenerated bundles: another seed changes levels and loadings, so a
fixed fit would not apply (§1 fact 1); the generator has no noise-only reseed; and the affine
decomposition makes the fault term exact with no sampling error.

**Classes.** For an action on shard i with prefix `[0, t)`, take the labels with
`i ∈ affected_shards`, `counter ∈ {gpu_temp_c, null}` and `[t_onset, t_offset)` overlapping
window ticks `[0, t)`:

| class | labels present | truth | used by |
|---|---|---|---|
| `null` | none | 0 | P1b, P3 |
| `level` | only `mean_shift` (gpu, cdu or pod level) | `θ_i(t)` | P1a, P1b |
| `path` | `mean_shift`/`drift`, at least one `drift` | `θ_i(t)` | P1b; reported by class |
| `other` | any `variance_collapse` or `detachment` | not the estimand | reported only, never scored |

A `variance_collapse` leaves the mean path at 0 but changes the residual variance; a `detachment`
puts `−λ·f(t)` in the contrast, a random path the label does not give. Both are reported (count,
coverage of the mean path at 0 for information) and excluded from every FCP.

A miss is `θ ∉ [lower, upper]`. Per replication, `FCP_level = misses among level actions /
(level actions ∨ 1)` and `FCP_scored = misses among {null, level, path} actions /
(those ∨ 1)`. `fcr` = mean FCP over replications, `fcr_se` its standard error.

## 4. Endpoints

- **P1a — level-shift FCR under the loop's own dispatch (the T2 gate).** Per arm, per δ:
  `fcr_level ≤ δ + 3·fcr_se`. Eight bars. An arm with fewer than 50 level actions in total is
  **NOT-EXECUTABLE** for P1a (reported, no verdict) rather than vacuously HELD — the heavy arm
  is expected to be there if its monitors revoke. Registered prediction: HELD on `infamily`,
  `nonlinear`, `hidden` far under δ; `heavy` NOT-EXECUTABLE or HELD.
- **P1b — FCR over every action with an exact truth.** Same bars on `fcr_scored`, per arm, per
  δ. Prediction: HELD.
- **P2 — the licence: calibration-monitor revocation per arm (reported).** Fraction of
  replications with any Mode-A cycle; fraction of (replication, cycle) pairs in Mode A; count of
  `revoked` withdrawals; mean passing fraction at the last cycle. Prediction: `heavy` revokes in
  most replications (the standardized t₃ innovation has no moment generating function, so
  `E[exp(λr − λ²/2)] ≤ 1` fails); the other three do not differ from each other.
- **P3 — exact-null actions covered (reported).** Among `null` actions (false dispatches), the
  count and miss fraction per arm and δ, and the mean count per replication.
- **P4 — structural (HELD/FAILED).** (i) every dispatch carries `effect`, with `halfWidth`
  equal to `sqrt(v·log(v/(α²ρ)))/t`, `v = t + ρ`, `ρ = 1`, and `center = S_t/t`, at 1e-12;
  (ii) `logMargin ≥ 0` on every dispatch; (iii) `alphaI = δ·selected/K` with `selected` the
  cycle report's `selected` (`mode-b-loop.ts:219`) and `K = 288`, at 1e-15; (iv) the dispatch
  sets at δ = 0.05 and δ = 0.10 are identical per replication; (v) the study feed at offset 0
  yields cycles deep-equal to `bundleFeed`'s on one bundle pair; (vi) per (band, seed) the
  `hidden` arm's `counters.ndjson` sha256 equals the `infamily` arm's. Zero deviations on all six.

**Reported, no verdict:** informativeness on `level` actions (fraction excluding 0, mean
half-width, mean |θ|, mean level-action count per replication); the `path` and `other` class
counts and their mean-path coverage; the null instrument check of §3; the number of (band, seed)
cells where the `nonlinear` arm's dispatch set differs from `infamily`'s (predicted 0 up to the
generator's 1e-3 output rounding, which can move a shard at the threshold — a nonzero count is
reported with the shards' margins).

## 5. Predictions, falsifiers, what voids the instrument

- `nonlinear` and `hidden` reproduce `infamily`'s dispatch sets and intervals (hidden
  byte-for-byte; nonlinear up to rounding). If they do not, the code reading in §1 fact 2 is
  wrong and the page says so.
- P1a FAILED on `infamily` (or `nonlinear`/`hidden`) with the monitors passing is the result
  that matters: either Theorem 13.7 is contradicted on this substrate (filed
  `confidence: contested` against `stats/ramdas-wang-2025` §7) or the premise the monitors
  certify does not hold for the fixed-fit residual on independent data (a scale or center error
  the in-sample cohort cannot see). The study cannot separate the two; the diagnosis is post-hoc
  and carries no verdict.
- P1a FAILED on `heavy` with the monitors *not* revoking is a finding against ADR 0029's
  licence argument; FAILED with revocation cannot occur (no dispatch, no interval).
- **NOT-EXECUTABLE:** the baseline guard refuses the 60-day healthy bundle; an arm has fewer
  than 50 level actions (that arm's P1a only); any exception during the run (the harness has no
  catch; a throw aborts and the partial directory is preserved unscored).
- No threshold, band, seed or class rule moves after the run. A defect found mid-run is fixed
  test-first and the run repeated in full under this document, the defective run kept.

## 6. Harness rules

Seeded everywhere (bundle seeds above; nothing draws from the clock or `Math.random`); no
`try`/`catch`; `results/live/run-<UTC>/` refuses an existing directory; the manifest records the
Tessera, engine and clustersynth SHAs, the harness files' sha256, every bundle's hashes, and the
constants above; no wall-clock value is written into a tracked artifact. `analysis/check_report.mjs`
re-renders `REPORT.md` from `cells.json` + `manifest.json` and requires byte equality.
`--quick` runs 2 seeds × 1 band under `results/sim/` (gitignored) and is never scored.

## 7. Ship rule and the tier label

P4 HELD and P1a HELD on `infamily`, `nonlinear` and `hidden` → the action-surface page's FCR
claim gains a **T2** row for the loop's own dispatch on clustersynth, quoted per arm with its
level-action count; `heavy` is quoted as measured (revocation rate, and P1a if executable). Any
P1a FAILED → no T2 claim; the failure is filed and the T1 claim on the action-surface page keeps
its tier. Nothing ships either way: the code shipped with ADR 0029.

## 8. Not measured

Real telemetry (T3); mixed cadence (1 Hz monitoring against an hourly baseline); the ADR 0021
contamination and decorrelation knobs, which are the one clustersynth axis that reaches the
contrast's null on *healthy* shards (registered as a follow-on, not run here); the `switching`
axis (its confound is on the record; it is common-mode and cancels like `nonlinear`); the
'bounded' increment kind; counters other than `gpu_temp_c`; the per-cycle selected-set FCP the
theorem is actually about (the study scores the dispatch surface the loop ships); cross-cycle
accumulation; and the FDR of the selection itself, which is e-BH's business and not this study's.

## Amendment A1 — 2026-09-04, before any scored run: gpu-level faults only; detachment is counter-agnostic

Found by the registered smoke on seed 72001 (band `4:8`, `infamily`), no cell scored.

1. **Shared cdu/pod events are off** (`faults.sharedFaults = 0`; levels and types otherwise as
   registered). The default two shared events per bundle are drawn uniformly over the four types;
   a cdu or pod `detachment` or `variance_collapse` puts every shard under it in class `other`
   for the fault's span, so three replications in four would have had almost no scorable action.
   The smoke showed it: a cdu-0 `detachment` over ticks [983, 1926) and a pod `variance_collapse`
   over [926, 2221) each covered all 288 shards; the loop dispatched 288 of 288 at cycle 0 with
   interval centers from −4 to −24 — the contrast carried −λ_cool·f_cool because the twin holds
   `NO_FAULTS` (`scenario.ts`) while the treatment lost its cooling factor. That observation is
   itself filed on the wiki (a shared-infra fault is not cancelled by the contrast, against the
   prose in `tools/clustersynth-mode-b.ts`); it is not this study's endpoint.
2. **A `detachment` label touches every counter.** `clustersynth/src/harness/faults.ts`
   `buildApplier().detached()` tests type, factor kind and time only — never the label's
   `counter` — so a gpu-level detachment labelled on `sm_util` still removes the `job` factor from
   `gpu_temp_c`. §3's class rule now reads: labels with `i ∈ affected_shards` and
   (`type = detachment` or `counter ∈ {gpu_temp_c, null}`). The smoke found six shards dispatched
   as `null` under the un-amended rule, all gpu detachments labelled on other counters.
3. Reported, not scored, from the same smoke: with faults off in the window the loop selected
   nothing in twelve cycles; on the null shards the full-window `S_T/T` had sd 0.046 against the
   noise-only 0.026, so the fixed-fit bias is real and about 0.04 in residual units — an order
   of magnitude under the narrowest half-width (0.38 at t = 120). Every `level` and `path`
   interval in the smoke covered its exact truth.

No endpoint, bar, band, seed, arm or size moves.

## Amendment A2 — 2026-09-04, before any scored run: the executability floor applies to P1b as well

The quick sim (never scored) rendered the `heavy` arm's P1b as HELD on zero scored actions —
the FCP convention `misses/(|S| ∨ 1)` makes an empty selection a perfect one. §4's floor now reads:
an arm with fewer than 50 level actions is NOT-EXECUTABLE for P1a, and an arm with fewer than 50
scored actions is NOT-EXECUTABLE for P1b. No bar, band, seed, arm or size moves.
