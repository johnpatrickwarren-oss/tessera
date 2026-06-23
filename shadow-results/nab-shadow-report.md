# Tessera — NAB shadow-replay report (REAL telemetry)

Real, labeled operational telemetry (Numenta Anomaly Benchmark) replayed through Tessera's production betting e-process (engine `updateBettingState` with AR(1) whitening), observe-only.

> **Scope (read before quoting any number):** this validates the **per-signal detector** — calibration (false-positive rate on real quiescent data) and detection (on labeled anomalies) — on *real autocorrelated telemetry*. It does **NOT** validate the cluster / topology / common-mode / fleet-FDR layers (no real multi-shard data here), and NAB anomalies are **operational** (server/sensor), **not GPU-SDC**. A clean report does not imply cluster-level validation.

Provenance: 36 datasets from realKnownCause, realAWSCloudwatch, realTraffic, artificialNoAnomaly; probationary = first 15% (cap 5000); phi clipped to 0.95 (engine parity); restart-on-fire (continuous monitoring).

## Operating-point sweep — simple vs rich calibration (real data)

`simple` = static `(mean,σ²,φ)` baseline. `rich` = engine production calibration (seasonal deseasonalization via `decomposeSeasonal` + AR(1)), composing the same primitives `fit-production-substrate` uses. `FP/1k` = false-positive fires per 1000 scored-normal points; `detection` = labeled windows with ≥1 in-window fire.

| mode | alpha | FP/1k normal | detection rate | windows det/scored | median latency |
|---|---|---|---|---|---|
| simple | 0.05 | 12.778 | 38.7% | 24/62 | 16 |
| simple | 0.01 | 8.936 | 29.0% | 18/62 | 25 |
| simple | 0.005 | 7.803 | 29.0% | 18/62 | 31 |
| simple | 0.001 | 6.22 | 25.8% | 16/62 | 33 |
| rich | 0.05 | 13.056 | 40.3% | 25/62 | 24 |
| rich | 0.01 | 9.259 | 33.9% | 21/62 | 20 |
| rich | 0.005 | 8.051 | 35.5% | 22/62 | 45 |
| rich | 0.001 | 6.415 | 30.6% | 19/62 | 70 |

**Detection vs FP:** rich improves detection (deseasonalizing surfaces anomalies under the cycle), but **rich raises aggregate FP/1k at every alpha** (it does NOT reduce false positives). The FP driver is regime-shift / multimodal structure, not periodicity — confirming AC-15.

Rich calibration detected a dominant period in **15/36** datasets (only those can differ from simple). Per AC-15, seasonal calibration targets *periodic* structure; it does NOT fix regime-shift / multimodal over-firing (a single stationary baseline can't).

## Per-dataset: simple vs rich FP (alpha = 0.01)

| dataset | period (rich) | FP/1k simple | FP/1k rich | detection simple | detection rich |
|---|---|---|---|---|---|
| realKnownCause/ambient_temperature_system_failure.csv | 23 | 2.568 | 2.568 | 1/2 | 1/2 |
| realKnownCause/cpu_utilization_asg_misconfiguration.csv | 12 | 0 | 2.384 | 0/1 | 1/1 |
| realKnownCause/ec2_request_latency_system_failure.csv | 12 | 13.952 | 15.574 | 2/3 | 2/3 |
| realKnownCause/machine_temperature_system_failure.csv | — | 5.458 | 5.458 | 3/3 | 3/3 |
| realKnownCause/nyc_taxi.csv | 48 | 0 | 0 | 0/5 | 0/5 |
| realKnownCause/rogue_agent_key_hold.csv | 93 | 25.532 | 29.787 | 2/2 | 2/2 |
| realKnownCause/rogue_agent_key_updown.csv | 18 | 0.502 | 0.502 | 0/2 | 0/2 |
| realAWSCloudwatch/ec2_cpu_utilization_24ae8d.csv | — | 0 | 0 | 0/2 | 0/2 |
| realAWSCloudwatch/ec2_cpu_utilization_53ea38.csv | 12 | 2.644 | 5.948 | 1/2 | 2/2 |
| realAWSCloudwatch/ec2_cpu_utilization_5f5533.csv | 11 | 73.695 | 73.034 | 1/2 | 1/2 |
| realAWSCloudwatch/ec2_cpu_utilization_77c1ca.csv | — | 0 | 0 | 0/1 | 0/1 |
| realAWSCloudwatch/ec2_cpu_utilization_825cc2.csv | — | 24.635 | 24.635 | 1/1 | 1/1 |
| realAWSCloudwatch/ec2_cpu_utilization_ac20cd.csv | — | 3.306 | 3.306 | 1/1 | 1/1 |
| realAWSCloudwatch/ec2_cpu_utilization_c6585a.csv | — | 0 | 0 | 0/0 | 0/0 |
| realAWSCloudwatch/ec2_cpu_utilization_fe7f93.csv | — | 0 | 0 | 0/3 | 0/3 |
| realAWSCloudwatch/ec2_disk_write_bytes_1ef3de.csv | 37 | 0.282 | 0.282 | 0/1 | 0/1 |
| realAWSCloudwatch/ec2_disk_write_bytes_c0d644.csv | — | 0 | 0 | 0/3 | 0/3 |
| realAWSCloudwatch/ec2_network_in_257a54.csv | 10 | 25.124 | 22.479 | 0/1 | 0/1 |
| realAWSCloudwatch/ec2_network_in_5abac7.csv | — | 0.282 | 0.282 | 0/2 | 0/2 |
| realAWSCloudwatch/elb_request_count_8c0756.csv | — | 3.305 | 3.305 | 1/2 | 1/2 |
| realAWSCloudwatch/grok_asg_anomaly.csv | — | 26.567 | 26.567 | 0/3 | 0/3 |
| realAWSCloudwatch/iio_us-east-1_i-a2eb1cd9_NetworkIn.csv | 26 | 0 | 0 | 0/2 | 0/2 |
| realAWSCloudwatch/rds_cpu_utilization_cc0c53.csv | — | 31.725 | 31.725 | 1/2 | 1/2 |
| realAWSCloudwatch/rds_cpu_utilization_e47b3b.csv | 12 | 115.664 | 115.664 | 1/2 | 2/2 |
| realTraffic/TravelTime_387.csv | 64 | 0 | 0 | 0/3 | 0/3 |
| realTraffic/TravelTime_451.csv | — | 3.085 | 3.085 | 1/1 | 1/1 |
| realTraffic/occupancy_6005.csv | 14 | 1.121 | 0.561 | 1/1 | 1/1 |
| realTraffic/occupancy_t4013.csv | 10 | 8 | 8 | 1/2 | 1/2 |
| realTraffic/speed_6005.csv | — | 3.712 | 3.712 | 0/1 | 0/1 |
| realTraffic/speed_7578.csv | — | 0 | 0 | 0/4 | 0/4 |
| realTraffic/speed_t4013.csv | — | 14.965 | 14.965 | 0/2 | 0/2 |
| artificialNoAnomaly/art_daily_no_noise.csv | — | 0 | 0 | 0/0 | 0/0 |
| artificialNoAnomaly/art_daily_perfect_square_wave.csv | — | 0 | 0 | 0/0 | 0/0 |
| artificialNoAnomaly/art_daily_small_noise.csv | — | 0 | 0 | 0/0 | 0/0 |
| artificialNoAnomaly/art_flatline.csv | — | 0 | 0 | 0/0 | 0/0 |
| artificialNoAnomaly/art_noisy.csv | — | 0 | 0 | 0/0 | 0/0 |

## Method

Per dataset × mode: calibrate on the probationary prefix (φ clipped to engine parity; innovation variance `σ²·(1-φ²)` as the engine `sigmaSquared`, `φ` as `ar1Phi`; rich mode additionally deseasonalizes via `decomposeSeasonal` when a dominant period is found), then replay the remaining rows through `updateBettingState`, firing+restarting at wealth ≥ 1/alpha. In-window fire = detection; scored-normal fire = false positive. Deterministic (no RNG); byte-identical on re-run.
