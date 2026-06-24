# Tessera — nuisance-baseline-robust e-value (the ADR 0008 fix)

The plug-in betting e-process freezes a point baseline μ̂; the estimation error makes E[e|H0] ≫ 1 (invalid). This e-value instead integrates the unknown baseline OUT: a two-sample sequential Bayes factor (separate vs common mean) on whitened residuals — valid by construction (E[BF|H0] ≤ 1), never freezing a point baseline. τ² = 25× innovation var; α=0.01.

## Validity (E[e|H0], P(fire)) and detection — BF vs plug-in

| regime | BF E[e] | BF P(fire) | BF valid? | BF detect | plug-in E[e] | plug-in P(fire) | plug-in valid? | plug-in detect |
|---|---|---|---|---|---|---|---|---|
| well-powered (m=1500, n=300) | 0.031 | 0.0% | ✅ | 100.0% | 5.3e-1 | 0.2% | ✅ | 100.0% |
| UNDER-powered (m=300, n=680) — the plug-in failure regime | 0.033 | 0.0% | ✅ | 100.0% | 4.4e+2 | 2.2% | ❌ | 100.0% |

**The BF e-value is valid in BOTH regimes — including the under-powered one where the plug-in blows up (E[e]≫1, P(fire)≫α) — while retaining 100% shift detection.** That breaches the ADR 0008 wall: a valid e-value robust to plug-in baseline error + autocorrelation IS achievable.

## Real telemetry — GWDG structural streams (fair side-by-side, both terminal e-values)

| calibration m | n | n/m | BF fire | plug-in fire |
|---|---|---|---|---|
| 600 | 200 | 0.333 | 41.8% | 43.6% |
| 300 | 200 | 0.667 | 27.3% | 30.9% |
| 150 | 200 | 1.333 | 25.5% | 30.9% |

On real structural telemetry the **BF ≈ the (terminal) plug-in** (BF a few pp lower at every calibration size). Both fire 25–44% — dominated by **REAL benign mean changes** between the calibration and test windows (the rate grows with their temporal separation, i.e. larger m), NOT by estimation error. So here the BF's estimation-error advantage is small: on this data the firing is the benign-change-vs-fault problem (LIFECYCLE/FLEET, ADRs 0011/0012), not e-value invalidity. (NB the structural ADR 0008's "~100%" was a DIFFERENT setup — first-crossing + a short 15% baseline — not the terminal-e-value comparison here.)

## Verdict

**The nuisance-baseline-robust e-value solves the ADR 0008 e-value-INVALIDITY** — decisively and rigorously where estimation error is the problem: valid (E[e]≤1, P(fire)≤α) even under-powered, where the plug-in is catastrophically invalid (E[e]≈440), while still detecting shifts (power 1.0). E[BF|H0]≤1 is a Bayes-factor property, so the validity is structural, not tuned.

**But it is not a silver bullet on real data.** On the real GWDG structural streams the BF ≈ the terminal plug-in (both ~25–44%), because there the firing is dominated by REAL benign mean changes, not estimation error — so fixing the e-value moves the real-data fire rate only a few pp. The e-value blocker is genuinely removed; the *dominant* real-data problem (benign change vs fault) is the lifecycle/fleet's, not the e-value's.

**Where it pays off (composition):** the lifecycle (ADR 0011) re-records on drift → SHORT fresh calibration epochs → exactly the under-powered regime where the plug-in is invalid but the BF is valid. So BF + lifecycle is the real pairing: fresh short calibration (which the plug-in cannot safely use) made valid by the BF. Fleet-relative (ADR 0012) then needs the same valid e-value for fleet-FDR (still pending a contamination-robust common-mode).

> **Scope:** synthetic validity is rigorous (E[BF|H0]≤1 is a Bayes-factor property); real-data is a single metric/dataset. φ is plug-in (whitening); the BF handles the mean nuisance, not a misspecified φ — a second-order effect.
