# ADR 0009 — the guarantee failure is baseline-misspecification, not "anytime-valid is broken" (refines 0007/0008)

- **Status:** Accepted (refines ADR 0007 + 0008)
- **Date:** 2026-06-23

## Context

ADR 0007/0008 concluded the per-shard FP guarantee fails on real telemetry. Operator challenge: a
production baseline is a long, stable estimate (a 2D seasonal matrix over ~8 weeks, LSE-filtered),
refreshed via shadow→cutover when it drifts — so the failure may be an artifact of an under-powered
baseline. Indeed ADR 0007/0008 measured with calibration m≈120 vs test horizon n≈680 (n/m≈5.7). The
plug-in error scales as **E[e] ≈ 1/√(1−n/m)** — it diverges only as n→m. `tools/baseline-power.ts`
tests whether a long baseline (m≫n) restores validity.

## Finding (two parts — the second corrects the first's naive reading)

**1. Synthetic (stationary) — m≫n DOES restore validity.** Sweeping the calibration window on
stationary iid/AR(1)+whitened data: at **n/m ≤ 0.4, P(fire) ≈ 0** (valid; n/m = 0.5 is borderline,
~0.5%); it only blows up as n/m → 1+. So the ADR 0007/0008 failure was, in part, an
under-powered-baseline artifact — the plug-in failure is **n/m-dependent**, not unconditional.

**2. Real GWDG structural telemetry — a long FLAT baseline does NOT restore validity.** On the same
shards that fired 100% under a short baseline, sweeping m at fixed n=200 (whitened):

| baseline m | n/m | real streams | P(fire) | honors α? |
|---|---|---|---|---|
| 100 | 2.0 | 55 | 30.9% | ❌ |
| 200 | 1.0 | 55 | 32.7% | ❌ |
| 500 | 0.4 | 55 | 38.2% | ❌ |
| 1000 | 0.2 | 47 | 31.9% | ❌ |

(Post-fix: a variance double-application bug — `cal.innovationVar·(1−φ²)` on an already-whitened
`innovationVar` — was caught in review and corrected; it shifted these by 5–11pp, not the verdict.)
Even well-powered (n/m=0.2–0.4), ~⅓ of real shards fire. The synthetic m≫n win held only because the
synthetic was **stationary**; real streams drift / vary **within** the baseline window, so a single
flat mean over a long window is a poor fit for the test window and keeps firing.

Honesty caveat (review): some of these fires come from near-constant-baseline streams whose variance
floors to 1, where a genuine scrape-count level shift in the test window fires — those are *real*
structural events, not pure FP. So the reported P(fire) is an **upper bound** on the stationary-null
FP; the conclusion rests on the noisy / near-unit-root streams (which fire on the flat-mean misfit).

## Decision

Refine ADR 0007/0008: the guarantee failure is **baseline misspecification**, not "anytime-valid is
fundamentally broken." Validity has **two** requirements on real data:
- **(a) bounded horizon vs baseline size (m ≫ n)** — confirmed necessary (synthetic).
- **(b) a baseline that captures the signal's within-window structure** (seasonal / 2D), so the
  calibrated baseline actually fits the test window — a flat mean does NOT (real data), so (b) is the
  binding open requirement.

Neither the per-shard anytime-valid bound nor fleet e-BH is "fundamentally" dead; they require a
well-specified, adequately-powered baseline. **Build A (exchangeability e-value) is shelved** — the
problem is baseline specification + horizon, not the e-value form.

## Consequences

- The operator's model — **long seasonal (2D) baseline + LSE cell-filtering + drift-triggered
  re-record → shadow → cutover** — is the right architecture and directly targets requirement (b)
  (within-window structure) and (a) (bounded horizon between refreshes).
- **Next experiment (the real open question):** does the engine's seasonal baseline
  (`decomposeSeasonal`) on a long window restore E[e] ≤ 1 / FP ≤ α on real telemetry? That is what
  actually validates the operator's model; the flat-baseline result here only shows a flat mean is
  insufficient.
- ADR 0007/0008 stand as "fails for flat / under-powered baselines"; their "fundamental" framing is
  narrowed by this ADR.

## Ruled out / gotchas

- Real structural streams are ~900–1440 points after (node,job,instance) keying, so m=2000 had too few
  streams to test (excluded — the vacuous-row "✅" bug was caught in review and guarded with
  MIN_STREAMS).
- The seasonal-baseline test needs a long, genuinely periodic real dataset; GWDG scrape counts are
  near-flat-with-drift, not strongly seasonal — MIT Supercloud (workload seasonality) or a longer
  trace may be the better substrate for the next experiment.
