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

The betting-e-process terminal-wealth e-value, on healthy nulls (the configuration isolates whitening
from the plug-in baseline). NOTE (added in ADR 0009 review): the **E[e]** column is heavy-tailed (its
mean is dominated by rare large draws; **P(e ≥ 1/α) and the median are the stable statistics** — read
those). A later variance-fix (`cal.innovationVar·(1−φ²)` double-application in `terminalEValueWhitened`)
shifted the whitened-plug-in E[e] (e.g. ~1.6e14 → ~2e7) and the synthetic FDPs by a few pp; the verdict
(invalid / does-not-rescue) is unchanged.

| configuration | E[e] | P(e ≥ 1/α) | valid? |
|---|---|---|---|
| iid · true baseline | 0.17 | 0.000 | ✅ |
| iid · **PLUG-IN** baseline | 6.6e8 | 0.120 | ❌ |
| AR(1) · true baseline · NO whitening (φ=0) | 3.8e3 | 0.025 | ❌ |
| AR(1) · true baseline · **WHITENED** (est. φ) | 0.24 | 0.000 | ✅ |
| AR(1) · **PLUG-IN** baseline · WHITENED (est. φ) | 1.6e14 | 0.115 | ❌ |

**Whitening fixes autocorrelation; the plug-in baseline is the unavoidable invalidator.** AR(1)
un-whitened is invalid, but AR(1) **whitened** (estimated φ — the production path already shipped in the
engine) is **valid** — so autocorrelation is solved, not an open problem. What remains is the **plug-in
baseline**: estimating mean/variance from a finite prefix invalidates the e-value even for iid data, and
even with whitening applied. Consequences:
- **Real null:** naive fleet e-BH rejected **34/55** real healthy GWDG structural shards — all false
  discoveries.
- **Synthetic ground truth:** naive (FDP 78%), fleet-relative (FDP 74%, power 100%), AND
  **fleet-relative + whitening (FDP ~59%)** all fail to control FDP vs q=10%. Every mitigation we have
  (common-mode removal + whitening) leaves the plug-in baseline intact, so each healthy e-value stays
  invalid.

## Decision

**Fleet-level e-BH does NOT rescue the guarantee.** The failure is upstream of the fleet layer, in the
e-value itself: e-BH faithfully propagates invalid inputs into an uncontrolled FDP. No fleet wrapper can
fix an invalid marginal e-value.

Therefore: **Tessera should claim *detection*, not a calibrated FP/FDR guarantee, on real telemetry** —
until the e-value is made valid.

## Why — and the one real path left

- **Not "fleet-relative fixes it"** — measured: it doesn't (FDP 74%). Common-mode is not the only
  invalidator; plug-in baseline and autocorrelation are.
- **The only path to a real guarantee: a nuisance-baseline-robust e-value** — instead of plugging in a
  point estimate of mean/variance, integrate over the unknown baseline (a method-of-mixtures /
  confidence-sequence martingale), combined with the **whitening we already ship** (which handles
  autocorrelation — see the validity table). That is a redesign of the per-shard test, not a wrapper,
  and it is the honest next research direction. (Validity must then be re-measured the same way:
  E[e|H0] ≤ 1 on real healthy data.)

## Consequences

- The headline "guaranteed low FP/FDR" claim is **not supported at any level** (per-shard ADR 0007;
  fleet ADR 0008) on real telemetry with the current e-value. The artifact's honest claim is strong
  *detection* + *anytime-valid framework that is correct under its assumptions* — the binding violated
  assumption is the **plug-in baseline** (autocorrelation is already handled by the shipped whitening).
- Next research: a nuisance-baseline-robust e-value (on top of the existing whitening), validity
  re-measured; only then revisit per-shard and fleet FDR.

## Ruled out / gotchas

- Ground-truth FDP needs labels (absent in real fleet telemetry) → synthetic fleet parameterized to the
  measured real drift; the real-null half uses actual healthy GWDG shards (no synthetic there).
- The e-value IS valid in the ideal case (true baseline + iid: E[e]=0.17) AND when whitened with the
  true baseline (AR(1) whitened: E[e]=0.24) — the framework + shipped whitening are correct; it is the
  **plug-in baseline** that breaks it.
