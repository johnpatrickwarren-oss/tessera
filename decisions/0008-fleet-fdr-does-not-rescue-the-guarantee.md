# ADR 0008 — fleet-level e-BH does NOT rescue the guarantee; the e-value itself is invalid

- **Status:** Accepted (closes the "can any guarantee survive?" question opened by ADR 0007)
- **Date:** 2026-06-23

## Context

ADR 0007 showed the per-shard anytime-valid FP guarantee fails on real telemetry and left **fleet-level
e-BH FDR** as the one place a real guarantee might still live (if common-mode drift cancels in the
cross-shard ranking). e-BH (Wang–Ramdas) controls FDR ≤ q under arbitrary dependence — but only if each
e-value is marginally valid (E[e|H0] ≤ 1). `tools/fleet-fdr.ts` tests both: e-value validity, and fleet
e-BH (naive vs fleet-relative) FDP.

## Finding (root cause, measured)

The betting-e-process terminal-wealth e-value is valid **only with the true baseline AND iid data**:

| regime | baseline | E[e] | P(e ≥ 1/α) | valid? |
|---|---|---|---|---|
| iid | true | 0.17 | 0.000 | ✅ |
| iid | plug-in | 6.6e8 | 0.120 | ❌ |
| AR(1) ρ=0.5 | true | 3.8e3 | 0.025 | ❌ |
| AR(1) ρ=0.5 | plug-in | 8.4e32 | 0.358 | ❌ |

**Plug-in baseline estimation** (unavoidable — a real detector estimates mean/variance from data) and
**autocorrelation** (ubiquitous in telemetry) each inflate E[e] far above 1, and compound. Consequences:
- **Real null:** naive fleet e-BH rejected **34/55** real healthy GWDG structural shards — all false
  discoveries.
- **Synthetic ground truth:** both naive (FDP 78%) and **fleet-relative (FDP 74%, power 100%)** fail to
  control FDP vs q=10%. Removing common-mode finds every failure but still drowns them in false
  discoveries, because plug-in + idiosyncratic per-shard offsets keep each healthy e-value invalid.

## Decision

**Fleet-level e-BH does NOT rescue the guarantee.** The failure is upstream of the fleet layer, in the
e-value itself: e-BH faithfully propagates invalid inputs into an uncontrolled FDP. No fleet wrapper can
fix an invalid marginal e-value.

Therefore: **Tessera should claim *detection*, not a calibrated FP/FDR guarantee, on real telemetry** —
until the e-value is made valid.

## Why — and the one real path left

- **Not "fleet-relative fixes it"** — measured: it doesn't (FDP 74%). Common-mode is not the only
  invalidator; plug-in baseline and autocorrelation are.
- **The only path to a real guarantee: a VALID e-value construction** — a mixture / confidence-sequence
  martingale that integrates over the unknown (nuisance) baseline mean/variance, combined with whitening
  for autocorrelation. That is a redesign of the per-shard test, not a wrapper, and it is the honest
  next research direction. (Validity must then be re-measured the same way: E[e|H0] ≤ 1 on real healthy
  data.)

## Consequences

- The headline "guaranteed low FP/FDR" claim is **not supported at any level** (per-shard ADR 0007;
  fleet ADR 0008) on real telemetry with the current e-value. The artifact's honest claim is strong
  *detection* + *anytime-valid framework that is correct under its assumptions* — assumptions real data
  violates via estimated baselines and autocorrelation.
- Next research: nuisance-robust + whitened e-value, validity re-measured; only then revisit per-shard
  and fleet FDR.

## Ruled out / gotchas

- Ground-truth FDP needs labels (absent in real fleet telemetry) → synthetic fleet parameterized to the
  measured real drift; the real-null half uses actual healthy GWDG shards (no synthetic there).
- The e-value IS valid in the ideal case (true baseline + iid: E[e]=0.17) — the framework is correct;
  it is the plug-in + dependence reality that breaks it.
