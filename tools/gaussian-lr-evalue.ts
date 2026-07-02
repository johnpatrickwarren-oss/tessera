// tools/gaussian-lr-evalue.ts — a self-contained Gaussian likelihood-ratio mean-shift
// e-value with a CLOSED-FORM null survival, for the conditional-calibration boosting
// experiment (engine ADR 0006). The engine ships the boosting OPERATOR
// (fleet/e-bh-conditional-calibration:eBHConditionalCalibration) but not a null-survival
// for any of its e-values, and the Markov bound 1/x gives no boost — the power comes
// only from the EXACT null tail. This module supplies an e-value whose null IS known.
//
// Construction: standardise the test-vs-cal mean shift to z, then the mixture e-value
// under a N(0, g) prior on the standardised effect:
//     e(z) = (1+g)^(-1/2) · exp( g·z² / (2(1+g)) )
// E[e|Z~N(0,1)] = 1 EXACTLY — but ONLY for oracle z ~ N(0,1). e is monotone in |z|, so the
// ORACLE null survival is:
//     S(x) = P(e(Z) ≥ x) = P(|Z| ≥ z*(x)) = 2·(1 − Φ(z*(x))),  z*(x) = sqrt( 2(1+g)/g · ln(x·√(1+g)) )
// (and S(x)=1 for x below the floor e(0)=(1+g)^(-1/2)).
//
// ⚠️ VALIDITY CAVEAT (2026-07-02 audit). shiftZ standardises by the CALIBRATION-WINDOW SAMPLE
// SD — a plug-in. Under H0 with estimated s the true z has t-like tails, and E[exp(c·z²)]
// with c = g/(2(1+g)) ≈ 0.48 DIVERGES for any finite cal length (measured: cal=30 →
// E[e|H0] ≈ 1.6e5; even cal=300 has a divergent tail). So E[e|H0] = 1 does NOT hold as
// implemented, and the "exact" survival UNDERSTATES the plug-in t-tail — feeding it to the
// conditional-calibration boost makes the boost ANTI-conservative (this partially confounds
// the PR #33 / registry-N4 "boosting amplifies TP+FP" reading). This is the ADR 0007 plug-in
// invalidity replayed. Long baselines (assertLongBaseline forces cal ≥ 1344 in the scenario
// harness) shrink but do not eliminate the gap. Treat both functions as ORACLE-null objects
// for diagnostics only; a valid replacement needs the variance integrated out (the engine's
// safe-t, ADR 0005) with its exact t-based survival.
//
// EXPERIMENTAL — Tessera-local, diagnostic harness use only (clustersynth-scenario.ts, which
// is itself designated diagnostic-only). NOT for any FDR-bearing path.
//
// Tessera-original; NOT vendored.

export interface Window { start: number; len: number; }

/** Prior variance on the standardised effect (matches the engine's DEFAULT_EFFECT_PRIOR_VAR = 25). */
export const DEFAULT_EFFECT_PRIOR_VAR = 25;

/** Standard normal CDF via a rational erf approximation (Abramowitz–Stegun 7.1.26). */
export function normalCdf(z: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989422804014327 * Math.exp(-z * z / 2);
  const p = d * t * (0.319381530 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  return z >= 0 ? 1 - p : p;
}

function mean(a: ReadonlyArray<number>, start: number, len: number): number {
  let s = 0;
  for (let i = start; i < start + len; i++) s += a[i];
  return s / len;
}

/** Two-sample standardised mean shift z = (μ_test − μ_cal) / (s · √(1/m + 1/n)), s² from cal. */
export function shiftZ(values: ReadonlyArray<number>, cal: Window, test: Window): number {
  const muCal = mean(values, cal.start, cal.len);
  const muTest = mean(values, test.start, test.len);
  let v = 0;
  for (let i = cal.start; i < cal.start + cal.len; i++) { const d = values[i] - muCal; v += d * d; }
  const s = Math.sqrt(v / Math.max(1, cal.len - 1));
  const se = (s || 1e-12) * Math.sqrt(1 / cal.len + 1 / test.len);
  return (muTest - muCal) / se;
}

/** Gaussian-LR mean-shift e-value over a cal/test split. E[e|H0] = 1 ONLY for oracle z ~ N(0,1);
 *  with shiftZ's plug-in cal SD the null mean diverges — see the header caveat. Diagnostics only. */
export function gaussianLrEValue(values: ReadonlyArray<number>, cal: Window, test: Window, g = DEFAULT_EFFECT_PRIOR_VAR): number {
  const z = shiftZ(values, cal, test);
  return Math.pow(1 + g, -0.5) * Math.exp((g * z * z) / (2 * (1 + g)));
}

/** The ORACLE null survival S(x) = P(e ≥ x | z~N(0,1)). With the plug-in z it UNDERSTATES the true
 *  tail (anti-conservative as a boosting input) — see the header caveat. Diagnostics only. */
export function gaussianLrNullSurvival(g = DEFAULT_EFFECT_PRIOR_VAR): (x: number) => number {
  const floor = Math.pow(1 + g, -0.5); // e(0)
  return (x: number): number => {
    if (x <= floor) return 1;
    const zStar = Math.sqrt((2 * (1 + g) / g) * Math.log(x * Math.sqrt(1 + g)));
    return Math.min(1, 2 * (1 - normalCdf(zStar)));
  };
}
