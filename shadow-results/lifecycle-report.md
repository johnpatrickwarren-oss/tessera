# Tessera — the operational baseline lifecycle (drift-triggered re-record)

The per-fire drift-vs-fault discriminator does NOT work (slow drift and sharp faults fire with the same run-length). So the drift trigger is EPOCH-level: ≥4 alarms within a 150-tick window ⇒ baseline stale ⇒ re-record. Comparing **static** (never refresh, ADR 0009), **adaptive** (continuous recal, ADR 0006 — masks), and **lifecycle** (drift-triggered re-record). 80 trials, α=0.01.

| scenario | static | adaptive | lifecycle | lifecycle re-records |
|---|---|---|---|---|
| slow drift (no fault) — FP | 153.7 alarms | 35.29 alarms | 51.2 alarms | 8.81 |
| SHARP fault — detection rate | 100% detect | 100% detect | 100% detect | 1.1 |
| SLOW fault — detection rate | 70% detect | 28% detect | 70% detect | 0.44 |
| continuous workload (no fault) — FP | 115.69 alarms | 15.09 alarms | 20.85 alarms | 3.63 |

**Reading it (metrics: sharp-fault detection = alarm within 200 ticks of onset; SLOW-fault detection = ANY alarm in the full ~600-tick post-onset window — a slow ramp needs the unbounded window, a bounded-latency metric would require a far steeper slope):**
- **Slow drift (FP):** static alarms pile up (baseline goes stale, ~154); the lifecycle re-records and cuts false alarms ~3× — *without* continuous adaptation. (Still ~1.4× above adaptive's 35 — it does not match adaptive, it improves on static.)
- **Sharp fault:** all three detect 100%. The lifecycle DOES re-record here (~1.1×/trial), but detection is on the FIRST alarm at onset, which precedes the rate trigger — so re-recording doesn't cost detection.
- **SLOW fault (the needle):** static 70%, **adaptive masks (28%)**, **lifecycle keeps 70%**. Mechanism (corrected): adaptive *continuously* absorbs the ramp so it never accumulates enough to cross threshold; the lifecycle is STATIC between re-records, so the ramp accumulates and FIRES on the first 1–3 alarms — that IS the detection — *before* the 4th alarm trips the rate trigger and re-records (which then suppresses the rest). So the lifecycle detects by firing early, not by avoiding re-records. (Tuning tension: a more sensitive rate trigger would suppress sooner and mask more.)
- **Continuous workload (FP):** the lifecycle re-records constantly — it cuts FP ~5.5× vs static (116→21) but stays ~1.4× above adaptive (15); at this aggressive operating point (random-walk level, step=0.5 → level SD ~19 by end) it is degenerating toward adaptive (and would then mask). The honest limit: when within-epoch variability is *continuous* (not discrete drift), a single-shard lifecycle cannot separate legitimate change from faults — that needs the **fleet** (shard-specific vs fleet-wide).

> **Verdict:** the lifecycle improves on static (far fewer drift false alarms) and, on slow faults, beats adaptive (70% vs 28%) by firing early before suppression — for **discrete cross-epoch drift**, complementing m≫n (ADR 0009) and the seasonal 2D baseline (ADR 0010). It does NOT solve continuous within-epoch workload variability; that residual is irreducible at the single-shard level and needs fleet-relative comparison (which in turn needs the nuisance-robust e-value, ADR 0008). Shadow→cutover (validate a candidate baseline before promoting) is the safety wrapper around the re-record; modeled here as immediate cutover. The drift trigger is alarm-RATE (epoch-level), since the per-fire run-length does NOT separate drift from faults (verified).
