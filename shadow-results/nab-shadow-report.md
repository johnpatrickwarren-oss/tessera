# Tessera — NAB shadow-replay report (REAL telemetry)

Real, labeled operational telemetry (Numenta Anomaly Benchmark) replayed through Tessera's production betting e-process (engine `updateBettingState` with AR(1) whitening), observe-only.

> **Scope (read before quoting any number):** this validates the **per-signal detector** — calibration (false-positive rate on real quiescent data) and detection (on labeled anomalies) — on *real autocorrelated telemetry*. It does **NOT** validate the cluster / topology / common-mode / fleet-FDR layers (no real multi-shard data here), and NAB anomalies are **operational** (server/sensor), **not GPU-SDC**. A clean report does not imply cluster-level validation.

Provenance: 36 datasets from realKnownCause, realAWSCloudwatch, realTraffic, artificialNoAnomaly; probationary = first 15% (cap 5000); phi clipped to 0.95 (engine parity); restart-on-fire (continuous monitoring).

## Aggregate (real data)

`FP/1k` = false-positive fires per 1000 scored-normal points (the operational alert rate on real quiescent data). `detection` = labeled windows with >= 1 in-window fire. `latency` = samples from window start to first in-window fire.

| alpha | datasets | scored-normal pts | FP fires | FP/1k normal | windows | detected | detection rate | median latency (samples) |
|---|---|---|---|---|---|---|---|---|
| 0.01 | 36 | 133276 | 1191 | 8.936 | 62 | 18 | 29.0% | 25 |
| 0.001 | 36 | 133276 | 829 | 6.22 | 62 | 16 | 25.8% | 33 |

## Per-dataset (alpha = 0.01)

| dataset | n | FP fires | FP/1k normal | windows | detected | latencies (samples) |
|---|---|---|---|---|---|---|
| realKnownCause/ambient_temperature_system_failure.csv | 7267 | 14 | 2.568 | 2 | 1 | 39 |
| realKnownCause/cpu_utilization_asg_misconfiguration.csv | 18050 | 0 | 0 | 1 | 0 | — |
| realKnownCause/ec2_request_latency_system_failure.csv | 4032 | 43 | 13.952 | 3 | 2 | 35, 25 |
| realKnownCause/machine_temperature_system_failure.csv | 22695 | 96 | 5.458 | 3 | 3 | 18, 104, 27 |
| realKnownCause/nyc_taxi.csv | 10320 | 0 | 0 | 5 | 0 | — |
| realKnownCause/rogue_agent_key_hold.csv | 1882 | 36 | 25.532 | 2 | 2 | 13, 5 |
| realKnownCause/rogue_agent_key_updown.csv | 5315 | 2 | 0.502 | 2 | 0 | — |
| realAWSCloudwatch/ec2_cpu_utilization_24ae8d.csv | 4032 | 0 | 0 | 2 | 0 | — |
| realAWSCloudwatch/ec2_cpu_utilization_53ea38.csv | 4032 | 8 | 2.644 | 2 | 1 | 108 |
| realAWSCloudwatch/ec2_cpu_utilization_5f5533.csv | 4032 | 223 | 73.695 | 2 | 1 | 1 |
| realAWSCloudwatch/ec2_cpu_utilization_77c1ca.csv | 4032 | 0 | 0 | 1 | 0 | — |
| realAWSCloudwatch/ec2_cpu_utilization_825cc2.csv | 4032 | 76 | 24.635 | 1 | 1 | 232 |
| realAWSCloudwatch/ec2_cpu_utilization_ac20cd.csv | 4032 | 10 | 3.306 | 1 | 1 | 219 |
| realAWSCloudwatch/ec2_cpu_utilization_c6585a.csv | 4032 | 0 | 0 | 0 | 0 | — |
| realAWSCloudwatch/ec2_cpu_utilization_fe7f93.csv | 4032 | 0 | 0 | 3 | 0 | — |
| realAWSCloudwatch/ec2_disk_write_bytes_1ef3de.csv | 4730 | 1 | 0.282 | 1 | 0 | — |
| realAWSCloudwatch/ec2_disk_write_bytes_c0d644.csv | 4032 | 0 | 0 | 3 | 0 | — |
| realAWSCloudwatch/ec2_network_in_257a54.csv | 4032 | 76 | 25.124 | 1 | 0 | — |
| realAWSCloudwatch/ec2_network_in_5abac7.csv | 4730 | 1 | 0.282 | 2 | 0 | — |
| realAWSCloudwatch/elb_request_count_8c0756.csv | 4032 | 10 | 3.305 | 2 | 1 | 18 |
| realAWSCloudwatch/grok_asg_anomaly.csv | 4621 | 92 | 26.567 | 3 | 0 | — |
| realAWSCloudwatch/iio_us-east-1_i-a2eb1cd9_NetworkIn.csv | 1243 | 0 | 0 | 2 | 0 | — |
| realAWSCloudwatch/rds_cpu_utilization_cc0c53.csv | 4032 | 96 | 31.725 | 2 | 1 | 5 |
| realAWSCloudwatch/rds_cpu_utilization_e47b3b.csv | 4032 | 350 | 115.664 | 2 | 1 | 4 |
| realTraffic/TravelTime_387.csv | 2500 | 0 | 0 | 3 | 0 | — |
| realTraffic/TravelTime_451.csv | 2162 | 5 | 3.085 | 1 | 1 | 38 |
| realTraffic/occupancy_6005.csv | 2380 | 2 | 1.121 | 1 | 1 | 86 |
| realTraffic/occupancy_t4013.csv | 2500 | 15 | 8 | 2 | 1 | 2 |
| realTraffic/speed_6005.csv | 2500 | 7 | 3.712 | 1 | 0 | — |
| realTraffic/speed_7578.csv | 1127 | 0 | 0 | 4 | 0 | — |
| realTraffic/speed_t4013.csv | 2495 | 28 | 14.965 | 2 | 0 | — |
| artificialNoAnomaly/art_daily_no_noise.csv | 4032 | 0 | 0 | 0 | 0 | — |
| artificialNoAnomaly/art_daily_perfect_square_wave.csv | 4032 | 0 | 0 | 0 | 0 | — |
| artificialNoAnomaly/art_daily_small_noise.csv | 4032 | 0 | 0 | 0 | 0 | — |
| artificialNoAnomaly/art_flatline.csv | 4032 | 0 | 0 | 0 | 0 | — |
| artificialNoAnomaly/art_noisy.csv | 4032 | 0 | 0 | 0 | 0 | — |

## Method

Per dataset: calibrate `(mean, σ², φ)` on the probationary prefix (φ clipped to engine parity; innovation variance `σ²·(1-φ²)` passed as the engine `sigmaSquared`, `φ` as `ar1Phi`), then replay the remaining rows through `updateBettingState`, firing (and restarting) at wealth >= 1/alpha. Fires inside a labeled window = detection; fires in the scored-normal region = false positives. Deterministic (no RNG); re-running on the same NAB inputs is byte-identical.
