# ADR 0033 — The engine's tail premise is measured at the contract, and a refusal is a demotion

- **Date:** 2026-09-25
- **Status:** ACCEPTED. Engine pin v0.9.0-pre → v0.10.0-pre (engine ADR 0035). `EmitterContract.incrementMean`,
  `engineAssertions`, `engineAdmission`; the loop and the clustersynth study pool the engine's increment
  estimator over the known-null feed and treat an engine refusal as Mode A; the reference feed standardises
  its cohort by the baseline fit; the two production contracts decided below.
- **Builds on:** ADR 0032 (the contracts assert the regime), ADR 0027 (increment coherence), ADR 0019 (the
  contract and the monitor); engine ADR 0035 (the tail premise at the gate), engine h0-battery Amendment A6
  (the measurement); knowledge `methodology/tail-premise-at-the-gate`,
  `stats/onset-mixture-increment-mean-2026-09-25`.

## What changed upstream

Engine v0.10.0-pre's `onset_mixture_gaussian` envelope carries the `'mgf'` tail premise and the guard refuses
it under `mMuchGreaterThanN` alone — which is all ADR 0032 asserted. The engine measured the capped
Gaussian-LR increment at 1.61 on t₃ and 1.91 on a lognormal (4,000,000 increments per cell); a per-tick
mean above 1 is not an e-value, whatever the crossing rate at one horizon says. The gate now takes either
a measured `incrementMean` from the engine's increment estimator on a believed-null feed (cleared at the
card bound 1.0005; a refutation refuses over any promise) or a promise, `lightTails`, where the measurement
is inconclusive or absent.

## Decision

1. **The measurement is the contract's.** `EmitterContract.incrementMean` is set at runtime like
   `calibrationMonitorPassing`: the loop keeps one pooled increment estimator per emitter over the
   known-null cohort across cycles, same family as its monitors (`'gaussian'`, `gInc`); the clustersynth
   study pools it over the healthy calibration feed the monitor read, per pair in the streaming path and
   merged in the reducer (Chan–Golub–LeVeque). `engineAssertions` rides it with the static assertions
   into the guard; `certifiedFdrBenjaminiHochberg` keeps ADR 0032's throw.
2. **A refusal is a demotion.** `engineAdmission` asks the engine whether it would admit the contract now.
   In the loop and the study a `refused` verdict is Mode A for the cycle with the engine's reason on the
   report (`engineGate`, `engineRefusal`), standing actions withdrawn as `revoked` — the operational
   semantics a failing calibration monitor already has. `not-declared` is unchanged.
3. **Contracts, one by one.**
   - `clustersynth-mode-b/control-contrast` **promises `lightTails`** on a stated ground: clustersynth's
     generator draws Gaussian innovations (`tools/clustersynth-telemetry.ts:140-157`). The reference feed
     `bundleFeed` replays those bundles and makes the same promise. A scenario with heavy-tailed innovations
     must not reuse either; a refuting measurement overrides the promise regardless.
   - `live-mode-b/*` **promises nothing by default.** The loop measures. At 1 Hz a ≥ 2-month cohort is
     millions of increments and the interval decides. At hourly cadence it is about 1,400 per unit; the
     capped Gaussian increment's mean on N(0,1) is 0.9977 and its interval half-width at 10⁴–10⁵
     increments is 0.01–0.03 against a bound 0.0028 above that mean, so the reading is inconclusive and
     the gate refuses: the emitter runs Mode A with the reason on the report until the deployment states
     the ground for `lightTails` (`liveModeBEmitter(counter, { lightTails: true })`) or the feed clears.
   - `mode-b/control-contrast` and `canary/*`: unchanged, `not-declared`.
4. **The cohort is standardised by the baseline fit where the pair names its unit** (`RawPair.shard`).
   The seam self-fit every cohort pair on its own per-cycle slice. The estimator priced that: on Gaussian
   AR(1) contrasts (φ 0.5, scale 3, offset 70, 200 replications) the increment mean on the
   plug-in-standardised residual is

   | fit length m | in-sample | out-of-sample (1,000 ticks) | oracle |
   |---|---|---|---|
   | 25 | 1.514 | 2.062 | 0.989 |
   | 150 | 1.028 | 1.058 | 0.997 |
   | 350 | 1.006 | 1.026 | 1.000 |
   | 1,440 | 0.995 | 0.998 | 0.998 |
   | 5,000 | 0.996 | 0.995 | 0.996 |

   so a loop on self-fit slices refutes its own premise at any finite slice length once enough cycles
   pool, and at the registered ≥ 2-month fit the plug-in price is invisible. The reference feed and the
   synthetic test feed now name the unit; a deployment whose cohort is not its own baseline replay still
   self-fits, and the measurement then says so.

## What the fixtures now show

The committed mini fixture (healthy window 150 ticks, `CS_ALLOW_SHORT`, plumbing-only by its own banner)
reads E[g] between 1.00 and 1.05 on its five counters at 10,800 increments: two are REFUTED (lower bound
1.014 and 1.004) and run Mode A with the reason, three are inconclusive and admitted on the promise. The
tests assert exactly that split. The synthetic hourly feed (1,400 ticks) is inconclusive and refused
without the promise, admitted with it; a t₃ cohort under the promise refutes it within three cycles and
the standing action is withdrawn.

## Not done

- No increment-mean measurement on real telemetry; the live contract's default is the honest one until a
  deployment has a feed.
- `mode-b-control`'s prefix-standardised residual remains outside the engine gate (ADR 0032).

## Reversal

Drop `incrementMean` and the two helpers; the contracts fall back to ADR 0032's assertions, which engine
v0.10.0-pre refuses. Reversal therefore also means re-pinning v0.9.0-pre.
