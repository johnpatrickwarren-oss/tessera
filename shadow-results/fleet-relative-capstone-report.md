# Tessera — fleet-relative capstone: does the fleet close the calibrated guarantee?

Fleet-relative comparison (residual = value − cross-shard median per tick) removes fleet-wide common-mode (drift/workload), so a shard-specific fault stands out. Tested with m≫n (m=1500, n=300) + whitening + e-BH, on a synthetic 60-shard fleet with a large shared random-walk drift + shard-specific step faults. 120 trials, α=0.01.

## Power vs FDR (naive raw vs fleet-relative), default fault load

| q | naive FDP | naive power | **fleet-rel FDP** | **fleet-rel power** |
|---|---|---|---|---|
| 0.1 | 57.9% | 62.8% | **77.2%** | **100.0%** |
| 0.05 | 56.3% | 61.4% | **75.8%** | **100.0%** |
| 0.01 | 55.0% | 59.4% | **71.5%** | **100.0%** |

## The mechanism — FDR control degrades with the FAULT FRACTION (q=0.1)

| faults / 60 | fleet-rel FDP | fleet-rel power |
|---|---|---|
| 2 | 14.9% | 100.0% |
| 5 | 54.2% | 100.0% |
| 10 | 78.7% | 100.0% |
| 20 | 66.7% | 100.0% |

The residual e-value is **VALID on a null fleet** (no faults): median 0.108, P(e≥10) 1.0%, P(e≥1/α) 0.1%. So FDR does NOT fail from an invalid e-value. It fails because the **faults contaminate the cross-shard common-mode estimate**: their onset shifts the center UP, so every HEALTHY shard's residual gets a persistent DOWNWARD step (the two-sided betting process fires on either sign), which accumulates and false-fires. FDP rises with the fault fraction in the low-contamination regime then the RATIO falls as contamination grows enough to move the median itself (mfail=10→78.7%, 20→66.7%) — but stays ≫ q throughout. A **trimmed-mean center does NOT fix it** (30%-trimmed center at the default load: FDP 79.9%, power 100.0% — no better than the median's 77.2%) — the contamination is structural (correlated onset), not just outlier magnitude.

## Verdict (the honest capstone)

**Fleet-relative comparison SEPARATES faults (power = 100.0%) but does NOT deliver a calibrated FDR guarantee** (FDP 77.2% at the default load; grows with the fault fraction). The fleet solves the DETECTION/separation half — the failing shard is isolated from fleet-wide drift/workload — but two things still block the GUARANTEE: (1) the common-mode estimate is itself contaminated by the faults (needs a contamination-robust factor/leave-faults-out construction), and (2) the per-shard e-value validity wall (ADR 0008) for the residual.

**Conclusion of the arc (ADRs 0001–0012):** detection/separation is fully solvable — m≫n (0009), seasonal 2D baseline (0010), the lifecycle (0011), and fleet-relative separation (this) all improve it. A *calibrated FP/FDR guarantee* on real telemetry is NOT achieved by any baseline/fleet engineering alone; it needs (a) a nuisance-baseline-robust e-value (ADR 0008) and (b) a contamination-robust fleet common-mode. Until those exist, Tessera should claim strong detection, not a calibrated guarantee.

> **Scope:** synthetic ground truth (FDP/power need labels). The honest through-line across the arc holds on real data where tested (NAB/GWDG/MIT); a real labeled fleet is the outstanding external validation.
