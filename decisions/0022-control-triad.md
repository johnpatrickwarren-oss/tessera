# ADR 0022 — control triad: two control twins per treatment (PROPOSED — prototype-validated)

- **Date:** 2026-06-28
- **Status:** **BUILT + VALIDATED (in-memory path).** The synthetic prototype recovered both Mode B failure
  modes; the construction is now built end-to-end and validated on real clustersynth topology, at scale.
  Done: clustersynth second twin (`CS_TRIAD`, clustersynth `35c3afa`); the triad detector wired into
  `tools/clustersynth-mode-b.ts` (in-memory path); committed triad mini fixture + tests. **Validated:** mini
  (72 GPUs) and mac-mini R=8 (1728 shards) — control-only contamination drives the twin-pair detector to
  **FDP ≈0.58–0.59**, the triad to **FDP 0.000 at recall 1.000** (flags the bad control via `c1−c2`, detects
  on the clean sibling). Non-regressive (clean triad + non-triad path unchanged, FDP 0.000). **Remaining
  (lower):** the STREAMING/multi-core path (mixed-cadence 1 Hz) triad — currently `flaggedControls:0` there;
  and a real-topology comparable-peer study (the binding constraint, § Cost).
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
4. ⬜ **Remaining (lower):** wire the triad into the STREAMING path (mixed-cadence 1 Hz); a real-topology
   comparable-peer availability study (the binding constraint per § Cost).

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

## Decision

Pursue the full build (steps 1–3) as the fix for ADR 0021's contamination + sign-blind-FP gaps. The
prototype + its unit test are kept as the validating artifact.
