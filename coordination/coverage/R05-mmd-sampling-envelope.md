# R05 MMD sampling-interval envelope

**Config:** `{ window_count: 200, α: 0.005, p: 11, mmd_pool: 500, bandwidth: 4.69041575982343, trials/cell: 5, short_drift_duration: 30 }`

**Axes:** 3 drift scenarios × 14 magnitudes × 4 sampling intervals × 5 trials = 840 trials

Each cell shows `detection_rate / median_detection_window` (out of 5, with median window index over detected trials).

## Scenario: `persistent_linear`

| Magnitude | k=1 | k=5 | k=10 | k=100 |
|---:|:---:|:---:|:---:|:---:|
| 0.000 | 0/5 / — | 0/5 / — | 0/5 / — | 0/5 / — |
| 0.025 | 5/5 / 72 | 5/5 / 139 | 4/5 / 199 | 0/5 / — |
| 0.050 | 5/5 / 53 | 5/5 / 109 | 5/5 / 179 | 0/5 / — |
| 0.075 | 5/5 / 45 | 5/5 / 99 | 5/5 / 159 | 0/5 / — |
| 0.100 | 5/5 / 41 | 5/5 / 94 | 5/5 / 159 | 0/5 / — |
| 0.125 | 5/5 / 37 | 5/5 / 89 | 5/5 / 159 | 0/5 / — |
| 0.150 | 5/5 / 35 | 5/5 / 89 | 5/5 / 159 | 0/5 / — |
| 0.175 | 5/5 / 33 | 5/5 / 89 | 5/5 / 159 | 0/5 / — |
| 0.200 | 5/5 / 31 | 5/5 / 89 | 5/5 / 159 | 0/5 / — |
| 0.225 | 5/5 / 31 | 5/5 / 89 | 5/5 / 159 | 0/5 / — |
| 0.250 | 5/5 / 31 | 5/5 / 89 | 5/5 / 159 | 0/5 / — |
| 0.275 | 5/5 / 29 | 5/5 / 89 | 5/5 / 169 | 0/5 / — |
| 0.300 | 5/5 / 29 | 5/5 / 89 | 5/5 / 169 | 0/5 / — |
| 0.375 | 5/5 / 25 | 5/5 / 89 | 5/5 / 169 | 0/5 / — |

## Scenario: `short_bounded`

| Magnitude | k=1 | k=5 | k=10 | k=100 |
|---:|:---:|:---:|:---:|:---:|
| 0.000 | 0/5 / — | 0/5 / — | 0/5 / — | 0/5 / — |
| 0.025 | 0/5 / — | 0/5 / — | 0/5 / — | 0/5 / — |
| 0.050 | 0/5 / — | 0/5 / — | 0/5 / — | 0/5 / — |
| 0.075 | 0/5 / — | 0/5 / — | 0/5 / — | 0/5 / — |
| 0.100 | 0/5 / — | 0/5 / — | 0/5 / — | 0/5 / — |
| 0.125 | 5/5 / 41 | 0/5 / — | 0/5 / — | 0/5 / — |
| 0.150 | 5/5 / 37 | 0/5 / — | 0/5 / — | 0/5 / — |
| 0.175 | 5/5 / 34 | 0/5 / — | 0/5 / — | 0/5 / — |
| 0.200 | 5/5 / 32 | 0/5 / — | 0/5 / — | 0/5 / — |
| 0.225 | 5/5 / 31 | 0/5 / — | 0/5 / — | 0/5 / — |
| 0.250 | 5/5 / 29 | 0/5 / — | 0/5 / — | 0/5 / — |
| 0.275 | 5/5 / 29 | 0/5 / — | 0/5 / — | 0/5 / — |
| 0.300 | 5/5 / 29 | 0/5 / — | 0/5 / — | 0/5 / — |
| 0.375 | 5/5 / 27 | 0/5 / — | 0/5 / — | 0/5 / — |

## Scenario: `no_drift`

| Magnitude | k=1 | k=5 | k=10 | k=100 |
|---:|:---:|:---:|:---:|:---:|
| 0.000 | 0/5 / — | 0/5 / — | 0/5 / — | 0/5 / — |
| 0.025 | 0/5 / — | 0/5 / — | 0/5 / — | 0/5 / — |
| 0.050 | 0/5 / — | 0/5 / — | 0/5 / — | 0/5 / — |
| 0.075 | 0/5 / — | 0/5 / — | 0/5 / — | 0/5 / — |
| 0.100 | 0/5 / — | 0/5 / — | 0/5 / — | 0/5 / — |
| 0.125 | 0/5 / — | 0/5 / — | 0/5 / — | 0/5 / — |
| 0.150 | 0/5 / — | 0/5 / — | 0/5 / — | 0/5 / — |
| 0.175 | 0/5 / — | 0/5 / — | 0/5 / — | 0/5 / — |
| 0.200 | 0/5 / — | 0/5 / — | 0/5 / — | 0/5 / — |
| 0.225 | 0/5 / — | 0/5 / — | 0/5 / — | 0/5 / — |
| 0.250 | 0/5 / — | 0/5 / — | 0/5 / — | 0/5 / — |
| 0.275 | 0/5 / — | 0/5 / — | 0/5 / — | 0/5 / — |
| 0.300 | 0/5 / — | 0/5 / — | 0/5 / — | 0/5 / — |
| 0.375 | 0/5 / — | 0/5 / — | 0/5 / — | 0/5 / — |

## Reading the matrix

- **`no_drift`** scenario should show ~zero detections regardless of sampling — verifies α is preserved under sampling (anytime-valid e-process property).
- **`persistent_linear`** scenario at high magnitude should saturate at every sampling interval, with median window scaling roughly linearly in `k` — verifies the "k× slower detection" claim from clustersynth Q-R05-SPEC § Spec.
- **`short_bounded`** scenario at low magnitude should fall off as `k` increases — verifies the "miss it entirely" claim. Drift episode is the first 30 windows only; at k=100 the detector evaluates ~0 time(s) during the drift window.
