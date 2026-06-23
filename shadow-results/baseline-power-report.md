# Tessera — does a long baseline restore the FP guarantee on REAL telemetry?

The plug-in-baseline e-value invalidity (ADR 0007/0008) scales as E[e] ≈ 1/√(1−n/m): it blows up only when the monitoring horizon **n** approaches the baseline window **m**. Here, on the SAME real GWDG `scrape_samples_scraped` shards that fired 100% in the structural experiment, we fix a bounded horizon n=200 scrapes (whitened) and grow the baseline m. α=0.01.

| baseline m | n/m | real streams | E[e] | median e | P(fire) | honors α? |
|---|---|---|---|---|---|---|
| 100 | 2 | 55 | 4.53e+54 | 1 | 30.9% | ❌ |
| 200 | 1 | 55 | 1.46e+58 | 1 | 32.7% | ❌ |
| 500 | 0.4 | 55 | 2.29e+56 | 1 | 43.6% | ❌ |
| 1000 | 0.2 | 47 | 8.70e+34 | 1 | 42.6% | ❌ |
| 2000 | 0.1 | 0 (too few) | 0.00e+0 | 0 | 0.0% | ❌ |

**Honest negative — a long FLAT baseline does NOT restore the guarantee on real telemetry.** Even at n/m=0.4 (well-powered), P(fire) stays ~43.6% ≫ α. The synthetic m≫n result held only because the synthetic was *stationary*; real streams drift/seasonally vary **within** the baseline window, so a single flat mean over a long window is a poor fit for the test window and ~⅓–½ of shards still fire. The m≫n principle is necessary but NOT sufficient on real data: the baseline must capture the within-window structure — i.e. the **seasonal (2D) baseline**, not a flat mean. Whether the seasonal baseline restores validity is the real open test (next).

> **Reading this honestly:** this REFINES ADR 0007/0008 rather than overturning them. Under-powered flat baselines fail (confirmed); long flat baselines ALSO fail on real data (within-window drift); the synthetic-only claim "m≫n fixes it" does NOT survive real telemetry with a flat mean. The seasonal/2D baseline + LSE cell-filtering + drift-triggered re-record (the production lifecycle) is the construction that must be tested next.
