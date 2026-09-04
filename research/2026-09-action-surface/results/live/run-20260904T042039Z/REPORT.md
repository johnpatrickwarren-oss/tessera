# REPORT — 2026-09-action-surface, run run-20260904T042039Z

tessera `344499f04a6ecd4c8edb531e167cc746418b02d6`, engine 0.6.11-pre; N = 500 per Δ, K = 40 shards (4 faulted), T = 300, q = 0.05, fcrDelta 0.05/0.1, fixed baseline fits (seed 47710, 800 ticks). Monte-Carlo truth M = 2000. Wall 10 s. Closed-form deviations > 1e-12: 0. Margin-sign mismatches: 0. Mode-A dispatches: 0; Mode-A intervals: 0.

| Δ | rule | δ | mean |S| | fcr | se | bar | verdict | false-dispatch shards (P2: n, miss) | excludes 0 on faulted (P3) | mean half-width | width ratio |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 0 | A | 0.05 | 0.01 | 0.0000 | 0.0000 | 0.0500 | HELD | 3, 0.0000 | — | 0.253 | 1.277 |
| 0 | A | 0.1 | 0.01 | 0.0000 | 0.0000 | 0.1000 | HELD | 3, 0.0000 | — | 0.243 | 1.310 |
| 0 | B | 0.05 | 3.00 | 0.0200 | 0.0037 | 0.0610 | HELD | 1500, 0.0200 | — | 0.238 | 1.201 |
| 0 | B | 0.1 | 3.00 | 0.0287 | 0.0043 | 0.1129 | HELD | 1500, 0.0287 | — | 0.228 | 1.226 |
| 4 | A | 0.05 | 4.03 | 0.0000 | 0.0000 | 0.0500 | HELD | 14, 0.0000 | 1.000 | 0.233 | 1.180 |
| 4 | A | 0.1 | 4.03 | 0.0005 | 0.0005 | 0.1015 | HELD | 14, 0.0000 | 1.000 | 0.223 | 1.202 |
| 4 | B | 0.05 | 3.00 | 0.0000 | 0.0000 | 0.0500 | HELD | 0, — | 1.000 | 0.238 | 1.201 |
| 4 | B | 0.1 | 3.00 | 0.0000 | 0.0000 | 0.1000 | HELD | 0, — | 1.000 | 0.228 | 1.226 |
| 8 | A | 0.05 | 4.03 | 0.0004 | 0.0004 | 0.0512 | HELD | 15, 0.0667 | 1.000 | 0.233 | 1.180 |
| 8 | A | 0.1 | 4.03 | 0.0004 | 0.0004 | 0.1012 | HELD | 15, 0.0667 | 1.000 | 0.223 | 1.202 |
| 8 | B | 0.05 | 3.00 | 0.0007 | 0.0007 | 0.0520 | HELD | 0, — | 1.000 | 0.238 | 1.201 |
| 8 | B | 0.1 | 3.00 | 0.0007 | 0.0007 | 0.1020 | HELD | 0, — | 1.000 | 0.228 | 1.226 |

## Endpoints

- **P1a exact-truth FCR under extremeness selection (ship gate):** HELD — δ 0.05: 0.0200 ≤ 0.0610; δ 0.1: 0.0287 ≤ 0.1129.
- **P1b FCR under the shipped rule on faulted windows:** HELD — 0.0000 vs 0.0500; 0.0005 vs 0.1015; 0.0004 vs 0.0512; 0.0004 vs 0.1012.
- **P2 false-dispatch shards covered (reported):** n = 14, miss 0.0000; n = 14, miss 0.0000; n = 15, miss 0.0667; n = 15, miss 0.0667.
- **P3 informativeness (reported):** faulted interval excludes 0 on 1.000, 1.000, 1.000, 1.000; width ratio 1.180, 1.202, 1.180, 1.202.
- **P4 structural (closed form, margin sign, Mode A, shape):** HELD.

## Monte-Carlo truth (faulted shards, residual units)

| Δ | mean θ | min θ | max θ | mean se |
|---|---|---|---|---|
| 4 | 1.480 | 1.323 | 1.716 | 0.0013 |
| 8 | 2.924 | 2.640 | 3.394 | 0.0013 |

