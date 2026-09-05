# REPORT — 2026-09-e-by-t2, run run-20260905T012733Z

tessera `c93ae9288fb3ced66ee823c39c9b5781a8e0493e`, engine 0.6.11-pre, clustersynth `c1387a4da67242e0807facd04929b5d975c795b0`; 240 replications = 4 arms × 3 bands × 20 seeds; K = 288 shards, counter gpu_temp_c, 1440-tick healthy baseline and a 1440-tick monitoring window at dt = 3600 s, 12 cycles; q = 0.1, fcrDelta 0.05/0.1, ρ = 1; gpu faults at rate 0.1, shared events 0. Exceptions: 0.

Structural: actions without an interval 0; closed-form deviations > 1e-12 0; α_i deviations 0; margin-sign mismatches 0; replications whose dispatch set differs across δ 0; hidden-arm counters differing from infamily 0 of 60; study feed at offset 0 equals bundleFeed: true. Dispatch sets differing from infamily: nonlinear 5, hidden 0 of 60 (band, seed) cells.

## Endpoints

- **P1a level-shift FCR under the loop's own dispatch — HELD where executable:** infamily δ 0.05: 0.0000 (HELD); infamily δ 0.1: 0.0000 (HELD); nonlinear δ 0.05: 0.0000 (HELD); nonlinear δ 0.1: 0.0000 (HELD); hidden δ 0.05: 0.0000 (HELD); hidden δ 0.1: 0.0000 (HELD); heavy δ 0.05: 0.0000 (NOT-EXECUTABLE); heavy δ 0.1: 0.0000 (NOT-EXECUTABLE).
- **P1b FCR over every action with an exact truth — HELD where executable:** infamily δ 0.05: 0.0000 (HELD); infamily δ 0.1: 0.0000 (HELD); nonlinear δ 0.05: 0.0000 (HELD); nonlinear δ 0.1: 0.0000 (HELD); hidden δ 0.05: 0.0000 (HELD); hidden δ 0.1: 0.0000 (HELD); heavy δ 0.05: 0.0000 (NOT-EXECUTABLE); heavy δ 0.1: 0.0000 (NOT-EXECUTABLE).
- **P2 licence (reported):** replications with a Mode-A cycle — infamily 0.000, nonlinear 0.000, hidden 0.000, heavy 1.000.
- **P3 exact-null actions covered (reported):** infamily δ 0.05: n = 2, miss 0.0000; infamily δ 0.1: n = 2, miss 0.0000; nonlinear δ 0.05: n = 2, miss 0.0000; nonlinear δ 0.1: n = 2, miss 0.0000; hidden δ 0.05: n = 2, miss 0.0000; hidden δ 0.1: n = 2, miss 0.0000; heavy δ 0.05: n = 0, miss —; heavy δ 0.1: n = 0, miss —.
- **P4 structural:** HELD.

## Per arm, pooled over bands

| arm | δ | N | level actions | fcr level | se | bar | P1a | scored actions | fcr scored | se | bar | P1b |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| infamily | 0.05 | 60 | 162 | 0.0000 | 0.0000 | 0.0500 | HELD | 322 | 0.0000 | 0.0000 | 0.0500 | HELD |
| infamily | 0.1 | 60 | 162 | 0.0000 | 0.0000 | 0.1000 | HELD | 322 | 0.0000 | 0.0000 | 0.1000 | HELD |
| nonlinear | 0.05 | 60 | 162 | 0.0000 | 0.0000 | 0.0500 | HELD | 321 | 0.0000 | 0.0000 | 0.0500 | HELD |
| nonlinear | 0.1 | 60 | 162 | 0.0000 | 0.0000 | 0.1000 | HELD | 321 | 0.0000 | 0.0000 | 0.1000 | HELD |
| hidden | 0.05 | 60 | 162 | 0.0000 | 0.0000 | 0.0500 | HELD | 322 | 0.0000 | 0.0000 | 0.0500 | HELD |
| hidden | 0.1 | 60 | 162 | 0.0000 | 0.0000 | 0.1000 | HELD | 322 | 0.0000 | 0.0000 | 0.1000 | HELD |
| heavy | 0.05 | 60 | 0 | 0.0000 | 0.0000 | 0.0500 | NOT-EXECUTABLE | 0 | 0.0000 | 0.0000 | 0.0500 | NOT-EXECUTABLE |
| heavy | 0.1 | 60 | 0 | 0.0000 | 0.0000 | 0.1000 | NOT-EXECUTABLE | 0 | 0.0000 | 0.0000 | 0.1000 | NOT-EXECUTABLE |

## Per (arm, band)

| arm | band | δ | N | dispatched/rep | level/rep | fcr level | se | verdict | fcr scored | se | verdict |
|---|---|---|---|---|---|---|---|---|---|---|---|
| infamily | 1:2 | 0.05 | 20 | 9.65 | 2.50 | 0.0000 | 0.0000 | HELD | 0.0000 | 0.0000 | HELD |
| infamily | 2:4 | 0.05 | 20 | 10.85 | 2.80 | 0.0000 | 0.0000 | HELD | 0.0000 | 0.0000 | HELD |
| infamily | 4:8 | 0.05 | 20 | 10.90 | 2.80 | 0.0000 | 0.0000 | HELD | 0.0000 | 0.0000 | HELD |
| infamily | 1:2 | 0.1 | 20 | 9.65 | 2.50 | 0.0000 | 0.0000 | HELD | 0.0000 | 0.0000 | HELD |
| infamily | 2:4 | 0.1 | 20 | 10.85 | 2.80 | 0.0000 | 0.0000 | HELD | 0.0000 | 0.0000 | HELD |
| infamily | 4:8 | 0.1 | 20 | 10.90 | 2.80 | 0.0000 | 0.0000 | HELD | 0.0000 | 0.0000 | HELD |
| nonlinear | 1:2 | 0.05 | 20 | 9.50 | 2.50 | 0.0000 | 0.0000 | HELD | 0.0000 | 0.0000 | HELD |
| nonlinear | 2:4 | 0.05 | 20 | 10.80 | 2.80 | 0.0000 | 0.0000 | HELD | 0.0000 | 0.0000 | HELD |
| nonlinear | 4:8 | 0.05 | 20 | 10.85 | 2.80 | 0.0000 | 0.0000 | HELD | 0.0000 | 0.0000 | HELD |
| nonlinear | 1:2 | 0.1 | 20 | 9.50 | 2.50 | 0.0000 | 0.0000 | HELD | 0.0000 | 0.0000 | HELD |
| nonlinear | 2:4 | 0.1 | 20 | 10.80 | 2.80 | 0.0000 | 0.0000 | HELD | 0.0000 | 0.0000 | HELD |
| nonlinear | 4:8 | 0.1 | 20 | 10.85 | 2.80 | 0.0000 | 0.0000 | HELD | 0.0000 | 0.0000 | HELD |
| hidden | 1:2 | 0.05 | 20 | 9.65 | 2.50 | 0.0000 | 0.0000 | HELD | 0.0000 | 0.0000 | HELD |
| hidden | 2:4 | 0.05 | 20 | 10.85 | 2.80 | 0.0000 | 0.0000 | HELD | 0.0000 | 0.0000 | HELD |
| hidden | 4:8 | 0.05 | 20 | 10.90 | 2.80 | 0.0000 | 0.0000 | HELD | 0.0000 | 0.0000 | HELD |
| hidden | 1:2 | 0.1 | 20 | 9.65 | 2.50 | 0.0000 | 0.0000 | HELD | 0.0000 | 0.0000 | HELD |
| hidden | 2:4 | 0.1 | 20 | 10.85 | 2.80 | 0.0000 | 0.0000 | HELD | 0.0000 | 0.0000 | HELD |
| hidden | 4:8 | 0.1 | 20 | 10.90 | 2.80 | 0.0000 | 0.0000 | HELD | 0.0000 | 0.0000 | HELD |
| heavy | 1:2 | 0.05 | 20 | 0.00 | 0.00 | 0.0000 | 0.0000 | NOT-EXECUTABLE | 0.0000 | 0.0000 | NOT-EXECUTABLE |
| heavy | 2:4 | 0.05 | 20 | 0.00 | 0.00 | 0.0000 | 0.0000 | NOT-EXECUTABLE | 0.0000 | 0.0000 | NOT-EXECUTABLE |
| heavy | 4:8 | 0.05 | 20 | 0.00 | 0.00 | 0.0000 | 0.0000 | NOT-EXECUTABLE | 0.0000 | 0.0000 | NOT-EXECUTABLE |
| heavy | 1:2 | 0.1 | 20 | 0.00 | 0.00 | 0.0000 | 0.0000 | NOT-EXECUTABLE | 0.0000 | 0.0000 | NOT-EXECUTABLE |
| heavy | 2:4 | 0.1 | 20 | 0.00 | 0.00 | 0.0000 | 0.0000 | NOT-EXECUTABLE | 0.0000 | 0.0000 | NOT-EXECUTABLE |
| heavy | 4:8 | 0.1 | 20 | 0.00 | 0.00 | 0.0000 | 0.0000 | NOT-EXECUTABLE | 0.0000 | 0.0000 | NOT-EXECUTABLE |

## The licence (P2), per arm

| arm | replications with a Mode-A cycle | Mode-A cycle fraction | revoked withdrawals | mean passing fraction, last cycle |
|---|---|---|---|---|
| infamily | 0.000 | 0.000 | 0 | 0.985 |
| nonlinear | 0.000 | 0.000 | 0 | 0.985 |
| hidden | 0.000 | 0.000 | 0 | 0.985 |
| heavy | 1.000 | 1.000 | 0 | 0.615 |

## Per class

| arm | δ | class | n | miss | excludes 0 | mean half-width | mean \|θ\| |
|---|---|---|---|---|---|---|---|
| infamily | 0.05 | null | 2 | 0.0000 | 0.000 | 0.195 | 0.000 |
| infamily | 0.05 | level | 162 | 0.0000 | 1.000 | 0.376 | 2.599 |
| infamily | 0.05 | path | 158 | 0.0000 | 0.994 | 0.307 | 1.300 |
| infamily | 0.05 | other | 306 | 0.2026 | 0.203 | 0.384 | 0.000 |
| infamily | 0.1 | null | 2 | 0.0000 | 0.000 | 0.187 | 0.000 |
| infamily | 0.1 | level | 162 | 0.0000 | 1.000 | 0.361 | 2.599 |
| infamily | 0.1 | path | 158 | 0.0000 | 0.994 | 0.295 | 1.300 |
| infamily | 0.1 | other | 306 | 0.2157 | 0.216 | 0.368 | 0.000 |
| nonlinear | 0.05 | null | 2 | 0.0000 | 0.000 | 0.195 | 0.000 |
| nonlinear | 0.05 | level | 162 | 0.0000 | 1.000 | 0.376 | 2.599 |
| nonlinear | 0.05 | path | 157 | 0.0000 | 0.994 | 0.308 | 1.306 |
| nonlinear | 0.05 | other | 302 | 0.3146 | 0.315 | 0.384 | 0.000 |
| nonlinear | 0.1 | null | 2 | 0.0000 | 0.000 | 0.187 | 0.000 |
| nonlinear | 0.1 | level | 162 | 0.0000 | 1.000 | 0.361 | 2.599 |
| nonlinear | 0.1 | path | 157 | 0.0000 | 0.994 | 0.296 | 1.306 |
| nonlinear | 0.1 | other | 302 | 0.3179 | 0.318 | 0.369 | 0.000 |
| hidden | 0.05 | null | 2 | 0.0000 | 0.000 | 0.195 | 0.000 |
| hidden | 0.05 | level | 162 | 0.0000 | 1.000 | 0.376 | 2.599 |
| hidden | 0.05 | path | 158 | 0.0000 | 0.994 | 0.307 | 1.300 |
| hidden | 0.05 | other | 306 | 0.2026 | 0.203 | 0.384 | 0.000 |
| hidden | 0.1 | null | 2 | 0.0000 | 0.000 | 0.187 | 0.000 |
| hidden | 0.1 | level | 162 | 0.0000 | 1.000 | 0.361 | 2.599 |
| hidden | 0.1 | path | 158 | 0.0000 | 0.994 | 0.295 | 1.300 |
| hidden | 0.1 | other | 306 | 0.2157 | 0.216 | 0.368 | 0.000 |
| heavy | 0.05 | null | 0 | — | — | — | — |
| heavy | 0.05 | level | 0 | — | — | — | — |
| heavy | 0.05 | path | 0 | — | — | — | — |
| heavy | 0.05 | other | 0 | — | — | — | — |
| heavy | 0.1 | null | 0 | — | — | — | — |
| heavy | 0.1 | level | 0 | — | — | — | — |
| heavy | 0.1 | path | 0 | — | — | — | — |
| heavy | 0.1 | other | 0 | — | — | — | — |

## Null instrument check (full-window S_T/T on untouched shards)

| arm | null shards | mean S_T/T | sd | noise-only sd |
|---|---|---|---|---|
| infamily | 16440 | -0.0008 | 0.0428 | 0.0264 |
| nonlinear | 16440 | -0.0008 | 0.0428 | 0.0264 |
| hidden | 16440 | -0.0008 | 0.0428 | 0.0264 |
| heavy | 16440 | -0.0016 | 0.0483 | 0.0264 |

