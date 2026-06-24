# ADR 0012 — fleet-relative separates faults (power) but does not control FDR (fault-contaminated common-mode); arc close

- **Status:** Accepted (capstone; closes the arc ADRs 0001–0012)
- **Date:** 2026-06-23

## Context

ADRs 0007–0011 left fleet-relative comparison as the last lever for the residual a single shard can't
handle (shard-specific fault vs fleet-wide workload/drift). `tools/fleet-relative-capstone.ts` tests
fleet-relative (residual = value − cross-shard median) + m≫n + whitening + e-BH on a synthetic fleet
with a large shared random-walk common-mode + shard-specific step faults.

## Finding

| q | naive FDP | naive power | fleet-rel FDP | fleet-rel power |
|---|---|---|---|---|
| 0.10 | 57.9% | 62.8% | **77.2%** | **100%** |
| 0.01 | 55.0% | 59.4% | **71.5%** | **100%** |

FDP vs fault fraction (q=0.1): 2/60 → **14.9%**, 5 → 54.2%, 10 → **78.7%**, 20 → 66.7% (power 100%
throughout).

- **Fleet-relative SEPARATES faults: power = 1.0.** Common-mode (drift/workload) cancels in the
  cross-shard median, so the failing shard is isolated — the *detection* half works, and this is what
  single-shard schemes (ADR 0009–0011) could not do for fleet-wide variation.
- **It does NOT control FDR (FDP ≈ 0.72–0.77, ≫ q).** And the reason is NOT an invalid e-value: the
  null-fleet residual e-value is **valid** (median 0.11, P(e≥10) 1%, P(e≥1/α) 0.1%). FDR fails because
  the **faults themselves contaminate the cross-shard common-mode estimate** — their onset shifts the
  center UP, so every HEALTHY shard's residual gets a persistent DOWNWARD step (the two-sided betting
  process fires on either sign), which accumulates and false-fires. FDP **rises with the fault fraction
  in the low-contamination regime then the ratio falls** as contamination grows enough to move the
  median itself (mfail=10→78.7%, 20→66.7% — fewer rejections are false once a third of shards fail),
  but stays ≫ q throughout. A 30%-trimmed-mean center does **not** fix it either (FDP ≈ same as median
  at the default load) — the contamination is structural (correlated onset), not outlier magnitude.

## Decision

Record honestly: **fleet-relative comparison delivers detection/separation but not a calibrated FDR
guarantee.** The fleet completes the detection story; the guarantee is blocked by two distinct, still-
open problems — (1) the common-mode estimate is contaminated by the very faults it must isolate (needs
a contamination-robust factor / leave-faults-out construction), and (2) the per-shard e-value validity
wall for the residual (ADR 0008).

## Why — and what would be needed

- **Chosen (report the honest negative-on-FDR / positive-on-power)** — verified across q and fault
  fractions; the separation result is real and valuable, the FDR failure is real and located.
- **A calibrated guarantee would require:** a contamination-robust common-mode (e.g. iterative
  fault-exclusion or a low-rank factor model fit robustly), AND a nuisance-baseline-robust e-value
  (method-of-mixtures / confidence-sequence valid at ALL scales, ADR 0008). Neither is built.

## Consequences — arc close (ADRs 0001–0012)

- **Detection/separation is fully solvable** and now decomposed: estimation error → m≫n (0009);
  periodic structure → seasonal 2D baseline (0010); discrete drift → lifecycle (0011); fleet-wide vs
  shard-specific → fleet-relative separation (0012, power 1.0).
- **A calibrated FP/FDR guarantee on real telemetry is NOT achieved** by any baseline/fleet engineering
  in this arc. It rests on two unbuilt pieces: the nuisance-baseline-robust e-value (0008) and a
  contamination-robust fleet common-mode (0012). **Honest claim for the artifact: strong, complementary
  detection — NOT a calibrated guarantee — on real nonstationary telemetry.**

## Ruled out / gotchas

- Synthetic ground truth (FDP/power need labels); the e-value root cause was confirmed on real data
  (0008/0009). A real labeled fleet is the outstanding external validation.
- Power = 1.0 is for clearly-separated step faults; a shard-specific *slow* fault would face the same
  e-value-validity issues as the single-shard slow-fault case.
