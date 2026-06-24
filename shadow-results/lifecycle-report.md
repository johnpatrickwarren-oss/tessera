# Tessera — the operational baseline lifecycle (drift-triggered re-record)

The per-fire drift-vs-fault discriminator does NOT work (slow drift and sharp faults fire with the same run-length). So the drift trigger is EPOCH-level: ≥4 alarms within a 150-tick window ⇒ baseline stale ⇒ re-record. Comparing **static** (never refresh, ADR 0009), **adaptive** (continuous recal, ADR 0006 — masks), and **lifecycle** (drift-triggered re-record). 80 trials, α=0.01.

| scenario | static | adaptive | lifecycle | lifecycle re-records |
|---|---|---|---|---|
| slow drift (no fault) — FP | 153.7 alarms | 35.29 alarms | 51.2 alarms | 8.81 |
| SHARP fault — detection rate | 100% detect | 100% detect | 100% detect | 0 |
| SLOW fault — detection rate | 70% detect | 28% detect | 70% detect | 0.44 |
| continuous workload (no fault) — FP | 115.69 alarms | 15.09 alarms | 20.85 alarms | 3.63 |

**Reading it:**
- **Slow drift (FP):** static alarms pile up (baseline goes stale); the lifecycle re-records and cuts the false alarms toward adaptive levels — *without* continuous adaptation.
- **Sharp fault (detection):** the lifecycle still detects it (occasional alarm doesn't trip the rate trigger), where **adaptive masks** slow-ish faults. This is the needle the lifecycle threads that adaptive cannot.
- **Continuous workload (FP):** the lifecycle DEGENERATES — a permanently high alarm rate makes it re-record constantly, collapsing toward adaptive (and would mask). This is the honest limit: when within-epoch variability is continuous (not discrete drift), a single-shard lifecycle cannot separate legitimate change from faults — that needs the **fleet** (shard-specific vs fleet-wide).

> **Verdict:** the lifecycle is the right tool for **slow cross-epoch drift** (re-record without masking), complementing m≫n (ADR 0009) and the seasonal 2D baseline (ADR 0010). It does NOT solve continuous within-epoch workload variability — that residual is irreducible at the single-shard level and requires fleet-relative comparison (which in turn needs the nuisance-robust e-value, ADR 0008). Shadow→cutover (validating a candidate baseline before promoting) is the safety wrapper around the re-record; modeled here as immediate cutover.
