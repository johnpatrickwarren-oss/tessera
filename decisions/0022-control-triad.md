# ADR 0022 — control triad: two control twins per treatment (PROPOSED — prototype-validated)

- **Date:** 2026-06-28
- **⚠️ CORRECTION (2026-07-02 math audit — see `research/2026-07-02-math-audit.md`):** the original
  **flag-then-substitute routing** (flag contaminated controls via the c1−c2 sibling e-BH, then
  overwrite a flagged shard's detection e-value with the clean-sibling contrast t−c2) was a
  **data-dependent selection with no covering theorem**: the flag statistic (c1−c2) and the
  substituted statistic (t−c2) share c2's idiosyncratic noise (corr ≈ ½ under matched twins), so
  conditioning on {flagged} — including false flags, produced at rate ~q by the flag e-BH by
  construction — up-tilts the substituted e-value; E[e_routed|H0] ≤ 1 was never established. The
  FDP 0.000 results below are real empirics but were not theorem-backed. **The shipped rule is now
  the MIN RULE** `e = min(e_{t−c1}, e_{t−c2})` unconditionally — already validated as "the deployable
  real-peer rule" in § Comparable-peer availability: E[min|H0] ≤ 1 whenever ≥1 sibling contrast is a
  clean null, with no selection step. The c1−c2 sibling null is retained for REPORTING only
  (`flaggedControls`). Known cost: recall in the corner where a fault and same-sign control
  contamination partially cancel inside t−c1 (the availability study measured recall ~0.87 for
  min-agreement). The routing-based scale numbers below stand as historical measurements of the
  superseded rule.
  **RE-VALIDATED AT SCALE UNDER THE MIN RULE (2026-07-02, M5 MacBook Pro — `runs/2026-07-02-modeb-min-rule-ramp/`):**
  contaminated-control (CS_CONTAMINATE=control) hourly ramp, corrected positive set (control-moved
  faults scored healthy per the clustersynth contract — scorer fix in the same PR): **FDP 0.000 at
  every tier and seed; R=8 × 5 seeds pooled recall 0.990** (203/205; R=1/4/8 seed 1 all recall 1.000).
  Clean triad non-regression: FDP 0.000, recall 1.000/1.000/0.987 at R=1/4/8. 1 Hz mixed-cadence
  STREAMING path (hourly 2-month baseline + 6 h 1 Hz mon, R=8): FDP 0.000, recall 0.794 — matching
  the pre-min-rule prefix-fit 1 Hz recall (~0.79), no streaming regression. The min rule reproduces
  the routing-era headline with a theorem behind it.
  **60d @ 1 Hz LONG-BASELINE PATH RE-VALIDATED (2026-07-02, mac mini M4 Pro —
  `runs/2026-07-02-1hz-longbaseline-revalidation/`):** the canonical `9b4e69e` finding reproduces
  exactly under the post-audit stack (power_w Mode B FDP 0.000 / power 1.000 every tier to R=8;
  gpu_temp_c abstains every tier, whiteness 65–75%), and the path's FIRST contaminated-control run
  holds FDP 0.000 at every tier with genuine faults at full power and the contaminated controls
  flagged. No synthetic-side scale result now rests on pre-audit code.
- **Status:** **BUILT + VALIDATED (in-memory path).** The synthetic prototype recovered both Mode B failure
  modes; the construction is now built end-to-end and validated on real clustersynth topology, at scale.
  Done: clustersynth second twin (`CS_TRIAD`, clustersynth `35c3afa`); the triad detector wired into
  `tools/clustersynth-mode-b.ts` (in-memory path); committed triad mini fixture + tests. **Validated:** mini
  (72 GPUs) and mac-mini R=8 (1728 shards) — control-only contamination drives the twin-pair detector to
  **FDP ≈0.58–0.59**, the triad to **FDP 0.000 at recall 1.000** (flags the bad control via `c1−c2`, detects
  on the clean sibling). Non-regressive (clean triad + non-triad path unchanged, FDP 0.000). **Both follow-ups
  now DONE:** (a) the STREAMING/multi-core path triad — wired into the shared streaming reducer, 1 Hz validated
  to R=8 incl. genuine 2-month long-baseline (commit `0a69e59`); (b) the comparable-peer availability study
  (§ Comparable-peer availability, below; `tools/peer-availability.ts`).
- **Builds on:** ADR 0019 (Mode B spatial null); ADR 0021 (twin-PAIR validity detector — built, validated,
  found insufficient: κ misses the sustained-shift harm; contamination is undetectable by a twin pair
  because the contrast is sign-blind and the cohort reference hits the heterogeneous-loading wall of
  ADR 0012/0015).

## Idea

Give each treatment shard **two** independent control twins `c1, c2` — both share the treatment's common-mode
loadings (so within-triad contrasts cancel the common-mode exactly), with independent idiosyncratic noise,
both never faulted. Then **`c1 − c2` is a matched control-vs-control null** — the clean per-control reference
the heterogeneous cohort could not provide:

- **Contamination detection.** A fault reaching one control fires `c1 − c2` against its healthy sibling.
- **Sign-blind false positive (the ADR 0021 headline).** A control-only fault makes the pair `t − c1` fire
  even though the treatment is healthy. The triad disambiguates: `c1 − c2` flags `c1` as the culprit, and
  `t − c2` (the clean sibling) does not fire → the treatment is correctly judged healthy. No false positive.

## Prototype evidence (`tools/control-triad.ts`, 200 shards × T=400, heterogeneous loadings jitter 0.4, q=0.1, 5 seeds)

| | contaminated-control detection (Exp 1) | control-only false positive (Exp 2) |
|---|---|---|
| cohort `c1 − median` | FDP 0.25–0.82, recall 0.22–0.78 | — |
| **triad `c1 − c2`** | **FDP 0.000–0.025, recall 1.000** | — |
| pair `t − c1` (Mode B today) | — | **FDP ≈0.46–0.48** (false-fires on contaminated controls) |
| **triad (flag `c1` via `c1−c2` → use `c2`)** | — | **FDP 0.000–0.065, recall 1.000** |

The triad sibling cleanly detects a contaminated control where the cohort is defeated by heterogeneous
loadings, and triad-protected detection eliminates the sign-blind false positive while keeping full recall
on real treatment faults. Robust across all 5 seeds. This is the construction ADR 0021 pointed to, confirmed
worth building.

## Build plan (status)

1. ✅ **clustersynth (DONE, `35c3afa`):** `CS_TRIAD` emits a second matched twin `#ctrl2` (shared loadings,
   independent noise, never faulted); `control.json` carries `control2` per pair + `triad:true`. Reuses the
   `CS_CONTAMINATE` machinery (targets `#ctrl` = c1). 2 tests.
2. ✅ **Tessera triad detector (DONE, in-memory):** `scoreCounterModeB` computes the `c1−c2` sibling e-value,
   e-BHs it to flag contaminated controls, and routes a flagged shard's detection to the clean sibling
   `t−c2`. `flaggedControls` reported. `contrastEValuesFor` is the shared building block. Backward-compatible
   (no `control2` → unchanged pair behavior). Committed triad mini fixture + 3 tests.
3. ✅ **Validated:** mini (72 GPUs) + mac-mini R=8 (1728 shards) — twin-pair FDP ≈0.58–0.59 → triad FDP 0.000
   / recall 1.000; clean triad + non-triad path non-regressive (FDP 0.000).
4. ✅ **Streaming-path triad (DONE, `0a69e59`):** `monTriples` + per-worker `flagE`/`eC2` + routing in the
   shared `reduceCmbCounter` (both the mixed-cadence and long-baseline streaming paths). 1 Hz validated on
   the mini to R=8 (incl. genuine 2-month long-baseline): `power_w` flags contaminated controls, FDP 0.000,
   no false-flag of clean Mode-B controls. (Also fixed a latent `linesFrom` byte-boundary bug.)
5. ✅ **Comparable-peer availability study (DONE):** `tools/peer-availability.ts` (+ tests). See below.

## Cost / tradeoff (honest)

"Control overhead doubles" conflates three different costs; decomposed:

**Controls double, but total telemetry/analysis is +50%.** Mode B today is `treatment + 1 control` = 2N
series (N = treatment shards); the triad is `treatment + 2 controls` = 3N. The *control count* doubles; the
*data + compute* volume rises **1.5×**, not 2×.

**Tessera-side compute: a ~1.5× linear bump, scaling class UNCHANGED.** The streaming path's memory is
`O(window × workers)` — flat in fleet size (measured: peak RSS ≈ 2.4 GB on a 5.2 GB bundle, flat); the triad
moves the per-worker constant `O(2 rows × T) → O(3 rows × T)`, negligible, so **memory stays flat**. CPU/IO/
disk go ~1.5× (3N series vs 2N) plus one cheap extra `c1−c2` contrast per shard. Against measured numbers:
the 72 h 1 Hz / R=8 run (5.2 GB, 16 s, in-memory peak ~2.4 GB) becomes ≈ 7.8 GB / ~24 s — still a single
mac-mini-class box. The triad does NOT change "Tessera runs on one machine," nor the ≥2-month baseline /
cadence / gate requirements (per-series properties, independent of control count).

**Cluster hardware: only a 2× cost if controls are DEDICATED canaries — otherwise ~free.** Whether the triad
costs real GPUs depends entirely on what plays the control role (the deployment-adapter decision):
- **Dedicated held-out canary GPUs** → the reserved canary fraction doubles (e.g. 5% → 10% of the fleet off
  production). This is the only regime where "overhead doubles" is literally a hardware cost.
- **Existing fleet shards as peer references** (the per-shard SDC-detection case — every healthy GPU is a
  potential control for its peers) → **no extra hardware**; each treatment is just compared against two peers
  instead of one. The new requirement is topology/availability: two *comparable* peers per shard.
- **Canary-gating** (deploy-vs-baseline, ADR 0019's comparative setting) → the control is the unchanged
  production fleet; a triad is a *partition* of that baseline group into two sub-references — no extra
  hardware, just enough baseline shards to split.

**The binding new constraint is comparable-peer AVAILABILITY, not capacity.** The triad assumes both controls
share the treatment's loadings, so it needs two matched peers (same GPU model / job / rack-role) per shard —
abundant in a large homogeneous training cluster, scarce in a small/heterogeneous one. This is the same axis
as the non-comparability caveat below; it's what to validate against a real topology, more than the compute.

- The triad addresses CONTAMINATION + the sign-blind FP. NON-COMPARABILITY (treatment loadings diverging
  from the controls) is a separate axis the prototype does not stress; the within-triad contrast assumes the
  controls share the treatment's loadings. If real twins can't be loading-matched, that remains open.
- Still inherits the majority-healthy assumption at the FLEET level (a fleet-wide common-mode event cancels
  by design — ADR 0019); the triad only fixes the PER-CONTROL reference, not fleet-wide blind spots.

## Comparable-peer availability study (`tools/peer-availability.ts`, DONE)

Every validation above used clustersynth's **exact-copy twins** (`#ctrl`/`#ctrl2` share the treatment's
loadings perfectly — `loadingId = gpu`). That is an idealization. In a real per-shard SDC deployment the
controls are **real sibling shards** with their OWN per-shard loadings (clustersynth's own model jitters each
shard's λ by `LAMBDA_HETERO = 0.4`). The study replaces exact-copy twins with real in-group siblings selected
by the κ cancellation ratio (the ADR 0021 statistic) and answers the two questions § Cost flagged as the
binding constraint. 24 groups, OU common-mode + mid-window regime step, fault 4σ, κ ≤ 0.1, q = 0.1, 8 seeds.

**D1 — Availability.** Fraction of shards with ≥2 comparable peers, vs loading heterogeneity × peer-pool size:

| hetero | S=8 | S=24 | S=72 (rack) |
|---|---|---|---|
| 0.00 | 1.00 | 1.00 | 1.00 |
| 0.20 | 0.94 | 0.99 | 1.00 |
| **0.40** (clustersynth real) | 0.76 | 0.92 | **0.96** |
| 0.80 | 0.42 | 0.74 | 0.83 |

Availability falls as siblings grow unlike and rises with the pool. Real clusters give LARGE in-group pools —
a rack is 72 GPUs sharing CDU + power-feed + fabric, a power-feed 576, a CDU 1,152 (per the topology model) —
so at the realistic heterogeneity (0.4) **a rack-scale pool yields ~96% triad availability**. The binding
constraint is real but favorable in a homogeneous training cluster; it bites only in small/heterogeneous ones.

**D2 — FDR under real (imperfect) peers (S=72, a rack).** Real peers have NO designated-clean sibling (unlike
`#ctrl2`), so "route to c2" is unavailable; the deployable rule is **`e = min(e_{t−c1}, e_{t−c2})` —
require BOTH peers to agree.** A single contaminated peer fires only one contrast → the min stays small → not
selected; `min` of e-values is a valid conservative e-value (`min ≤ e₁ ⇒ E[min|H0] ≤ 1`) so e-BH still
controls FDR. Result, vs the bare `t−c1` pair, over heterogeneity (5% fault rate):

| hetero | pair FDP/recall | **triad** FDP/recall |
|---|---|---|
| 0.00 | 0.60 / 0.96 | **0.05 / 0.93** |
| 0.40 (real) | 0.52 / 0.94 | **0.06 / 0.87** |
| 0.80 | 0.52 / 0.94 | **0.06 / 0.86** |

The pair detector is FP-dominated by contaminated peers (FDP ≈ 0.5) at every heterogeneity; the min-agreement
triad holds **FDP ≤ q at every heterogeneity** with a modest recall cost. Crucially there is **no FDR ceiling
in range**: the κ gate EXCLUDES the peers that would leak un-cancelled common-mode, so non-comparability
becomes an **availability** cost (a shard with no comparable peer gets no triad → abstains, Mode A), never a
false guarantee. A fault-rate sweep (D1b) shows the min-triad holds FDP ≤ q until the contamination load
(faulted PEERS) is extreme (~10–20%); real per-shard anomaly rates are far lower.

**Conclusion.** The triad is deployable on real fleet peers, not just synthetic twins, with two amendments to
the construction: (1) select peers by κ on the healthy baseline and offer a triad ONLY where two comparable
peers exist (availability, not capacity, is the binding constraint — ~96% at rack scale); (2) use the
min-agreement rule, since real peers lack a designated-clean sibling. Non-comparability is thereby converted
from an FDR risk into an abstention. Still open / not addressed: peers must also match on the *job* factor
(a different-job sibling is non-comparable — the κ gate catches this empirically, but job-aware pre-selection
would raise availability); and the fleet-wide common-mode blind spot (ADR 0019) is unchanged.

### Real-telemetry anchor (GWDG A100, Phase 4 first cut)

The synthetic sweep uses arbitrary heterogeneity; to anchor it we measured within-node peer comparability on
the **real GWDG A100 DCGM telemetry** (Zenodo 10.5281/zenodo.19052367 — 4 GPUs/node, real labeled GPU-detachment
incidents), `tools/gwdg-comparability.ts`. Only the **structural** κ is taken from GWDG (a variance ratio,
baseline-independent); detection/FDR on GWDG would be invalid because its files are ≤10-day incident windows,
NOT a representative baseline — `baseline-guard` forbids exactly that, and a thin baseline's fit fails to
transfer (an A/A test on it false-fires from baseline-thinness, not from any real property). What κ shows:

| counter | median within-node best-peer κ | comparable (κ≤0.1) = availability | common-mode that cancels |
|---|---|---|---|
| gpu_temp_c | 0.42 | **23 %** | shared cooling (~58 %) |
| sm_util | 0.64 | **8 %** | partly shared (~36 %) |
| power_w | 0.88 | **16 %** | almost none (~12 %) — per-GPU/workload |

Real sibling GPUs on a shared HPC node are **largely non-comparable** — they run different jobs, so little
workload common-mode cancels (power barely cancels; temperature cancels best via shared cooling). This is the
**job-factor axis made real**, and it confirms the study's thesis on real hardware: comparability is binding.

We then **calibrated the synthetic generator to these measurements** (not a faked/tiled baseline): the real
κ distribution is bimodal (a same-job minority cancels, most don't), so we added a per-job common-mode to the
model and tuned the job count so the comparable fraction matches the real availability per counter. At the
real operating point (`node tools/peer-availability.js --gwdg`): model availability 0.234 / 0.081 / 0.155
(matching GWDG), and **on the eligible (κ≤0.1) subset the κ-gated min-agreement triad controls FDP ≤ q**
(0.027 / 0.000 / 0.065) where the bare pair detector does not (≈0.5–0.6). So real-cluster Mode B is
**availability-bound, not FDR-broken**: it abstains (Mode A) on the 77–92 % of GPUs without a comparable peer
— never a false guarantee — and certifies the comparable minority. **Job-aware peer selection** (match peers
by workload → restore the shared common-mode → lower κ → more eligible GPUs) is the decisive lever to widen
coverage, and is the concrete next step toward real-cluster Mode B. A representative-baseline null/detection
validation still requires a long continuous feed (the shadow-deploy path; no public dataset supplies one).

## Decision

Pursue the full build (steps 1–3) as the fix for ADR 0021's contamination + sign-blind-FP gaps. The
prototype + its unit test are kept as the validating artifact. **Update (study done):** real-peer deployment
is viable under the two amendments above; availability (≥2 κ-comparable peers/shard) is the binding
constraint, ~96% at rack scale and realistic heterogeneity.
