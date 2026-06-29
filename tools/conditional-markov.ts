// tools/conditional-markov.ts — Wall A, operationalized: the ASSUMPTION 3.1 diagnostic (O5).
//
// THE WALL. Per-shard validity (E[e|H0] ≤ 1) fails on nonstationary telemetry (ADR 0007/0012), and
// the fleet-FDR guarantee that survives (multi-factor common-mode → UI → e-BH) is EMPIRICAL, not a
// theorem. Wang–Dandapanthula–Ramdas ("Anytime-valid FDR control with the stopped e-BH procedure",
// arXiv:2502.08539) name the EXACT condition under which a fleet of per-shard e-processes stopped at
// a common, data-dependent GLOBAL time inherits an FDR theorem — the causal Markov ASSUMPTION 3.1:
//
//     for all n ≥ 2,  Y_n ⊥ (X_1..X_{n−1}, Y_1..Y_{n−1}) | X_n
//
// i.e. the current response Y_n (the per-shard residual) depends on the past ONLY through the current
// covariate X_n. Under 3.1, local e-processes become GLOBAL (Thm 3.3) and stopped e-BH controls FDR
// (Cor 3.4). Tessera's within-window nonstationarity makes a shard depend on its own recent past
// beyond any single covariate → 3.1 plausibly FAILS → no automatic fleet-FDR theorem. That is the
// per-stream wall, restated as a checkable conditional-independence condition.
//
// THE O5 BRIDGE (research/2026-06-26-evalue-metric-audit.md, finding 4). If a GOOD common-mode
// estimate X_n (thermal / utilization / factor signal — ADR 0016/0017's "estimation is the lever",
// P5) makes the per-shard residual conditionally Markov given X_n, it RESTORES the global-e-process
// property and EARNS a *conditional*, theorem-backed fleet-FDR guarantee. So better common-mode
// estimation is not only the detection lever — it is the path to a real (Assumption-3.1-conditional)
// fleet guarantee. The per-alert guarantee stays dead; conditional fleet may be recoverable.
//
// WHAT THIS MODULE PROVIDES.
//   1. conditionalMarkovDiagnostic(Y, X): an OPERATIONAL, runnable check of Assumption 3.1 for one
//      shard — residualize Y on the covariate X, then test whether the residual still carries the
//      past (lag-1 conditional autocorrelation + a Ljung–Box whiteness test + a direct
//      "does Y_{n−1} predict Y_n beyond X_n" partial-coefficient t-test). Near-zero ⇒ 3.1 plausibly
//      holds for that shard; large ⇒ the past leaks beyond X_n and 3.1 fails.
//   2. assumption31Sweep(...): the demonstration that the diagnostic TRACKS the consequence — as
//      common-mode quality degrades (oracle → good → poor → none) the conditional autocorrelation
//      rises AND the empirical stopped-e-BH fleet-FDR crosses q. This is the empirical content of O5.
//
// HONEST SCOPE. The diagnostic operationalizes Assumption 3.1 and tracks fleet-FDR control; it does
// NOT, by itself, certify the theorem (3.1 is a population conditional-independence statement; the
// diagnostic is a finite-sample necessary-condition check on lag-1 + a whiteness test — a shard that
// passes can still violate 3.1 at higher-order lags). It is a NECESSARY-condition gate and a lever
// readout, not a sufficiency proof. On clustersynth (benign: nonstationarity is removable
// common-mode, ADR 0016) a good covariate genuinely earns it; on real GWDG telemetry the per-shard
// nonstationarity is irreducible (ADR 0012), so the diagnostic is expected to FAIL no matter the
// covariate — which is exactly the honest, useful readout ("your common-mode is not good enough / the
// nonstationarity is not removable — do not claim the conditional fleet guarantee").
//
// Tessera-original; NOT vendored. Prototype; durable home is the engine if adopted.

/** Ordinary-least-squares residuals of Y on [1, X] (intercept + single covariate). Returns the
 *  residual series and the fitted slope β̂ (covariate loading). */
export function residualizeOn(Y: ReadonlyArray<number>, X: ReadonlyArray<number>): { resid: number[]; beta: number; intercept: number } {
  const n = Y.length;
  if (X.length !== n) throw new RangeError(`residualizeOn: length mismatch (Y=${n}, X=${X.length})`);
  let sx = 0, sy = 0, sxx = 0, sxy = 0;
  for (let i = 0; i < n; i++) { sx += X[i]; sy += Y[i]; sxx += X[i] * X[i]; sxy += X[i] * Y[i]; }
  const denom = n * sxx - sx * sx;
  // Degenerate covariate (constant X, e.g. the "no covariate" case X≡0): fall back to mean-removal.
  const beta = Math.abs(denom) < 1e-12 ? 0 : (n * sxy - sx * sy) / denom;
  const intercept = (sy - beta * sx) / n;
  const resid = new Array<number>(n);
  for (let i = 0; i < n; i++) resid[i] = Y[i] - intercept - beta * X[i];
  return { resid, beta, intercept };
}

/** Lag-k sample autocorrelation of a series (mean-removed). */
export function autocorr(z: ReadonlyArray<number>, k: number): number {
  const n = z.length;
  let m = 0; for (const v of z) m += v; m /= n;
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) { const d = z[i] - m; den += d * d; if (i >= k) num += (z[i] - m) * (z[i - k] - m); }
  return den < 1e-12 ? 0 : num / den;
}

/** Ljung–Box Q statistic over lags 1..m (whiteness test). Under whiteness Q ~ χ²_m; large Q rejects
 *  whiteness (the residual still carries serial structure → the past leaks beyond X). */
export function ljungBox(z: ReadonlyArray<number>, m: number): { Q: number; dof: number } {
  const n = z.length;
  let Q = 0;
  for (let k = 1; k <= m; k++) { const r = autocorr(z, k); Q += (r * r) / (n - k); }
  return { Q: n * (n + 2) * Q, dof: m };
}

export interface MarkovDiagnostic {
  /** Lag-1 autocorrelation of Y BEFORE conditioning (the raw temporal dependence). */
  rawLag1: number;
  /** Lag-1 autocorrelation of the residual Y − β̂X AFTER conditioning on X. The Assumption-3.1
   *  score: near 0 ⇒ X absorbed the temporal dependence (3.1 plausible); large ⇒ past leaks. */
  condLag1: number;
  /** t-statistic of the Y_{n−1} coefficient in the regression Y_n ~ X_n + Y_{n−1}. A direct test of
   *  "does the immediate past predict Y_n BEYOND the current covariate" — |t| large ⇒ 3.1 fails. */
  partialPastT: number;
  /** Ljung–Box Q on the conditioned residual over `lags` lags, and its dof. */
  ljungBoxQ: number;
  ljungBoxDof: number;
  /** Necessary-condition verdict: small conditional autocorrelation AND no significant direct past
   *  leakage AND Ljung–Box below the χ² 95% critical value. NOT a sufficiency proof (see header).
   *  HEURISTIC GATE, not a calibrated test: `condLag1Tol` is a fixed constant (default 0.15) whose
   *  effective significance drifts with the series length T (a lag-1 autocorrelation of 0.15 is ≈1.9σ
   *  at T≈160, ≈2.6σ at T≈300). Treat it as a tunable readout threshold, not a level-α test. */
  markovPlausible: boolean;
}

/** χ²(dof) upper-5% critical values (Wilson–Hilferty approximation; adequate for a gate). */
function chi2Crit95(dof: number): number {
  const a = 2 / (9 * dof);
  const z = 1.6448536269514722; // Φ^{-1}(0.95)
  return dof * Math.pow(1 - a + z * Math.sqrt(a), 3);
}

export interface MarkovDiagnosticOptions {
  /** Number of lags for the Ljung–Box whiteness test. Default 5. */
  ljungBoxLags?: number;
  /** |condLag1| threshold below which lag-1 conditional dependence is deemed negligible. Default 0.15. */
  condLag1Tol?: number;
  /** |partialPastT| threshold above which direct past-leakage is significant. Default 2.0 (~5%). */
  partialPastTol?: number;
}

/** Operational Assumption-3.1 diagnostic for ONE shard's residual Y given the common-mode covariate
 *  X (both length-T). See header + MarkovDiagnostic for interpretation. */
export function conditionalMarkovDiagnostic(
  Y: ReadonlyArray<number>,
  X: ReadonlyArray<number>,
  opts: MarkovDiagnosticOptions = {},
): MarkovDiagnostic {
  const n = Y.length;
  if (n < 8) throw new RangeError(`conditionalMarkovDiagnostic: need ≥ 8 points; got ${n}`);
  const lags = opts.ljungBoxLags ?? 5;
  const condTol = opts.condLag1Tol ?? 0.15;
  const pastTol = opts.partialPastTol ?? 2.0;

  const rawLag1 = autocorr(Y, 1);
  const { resid } = residualizeOn(Y, X);
  const condLag1 = autocorr(resid, 1);
  const { Q, dof } = ljungBox(resid, lags);

  // Direct past-leakage test: regress Y_n on [1, X_n, Y_{n−1}] and t-test the Y_{n−1} coefficient.
  const partialPastT = partialPastTStat(Y, X);

  const markovPlausible = Math.abs(condLag1) <= condTol
    && Math.abs(partialPastT) <= pastTol
    && Q <= chi2Crit95(dof);
  return { rawLag1, condLag1, partialPastT, ljungBoxQ: Q, ljungBoxDof: dof, markovPlausible };
}

/** t-statistic of the Y_{n−1} coefficient in Y_n ~ 1 + X_n + Y_{n−1} (n ≥ 2). Multiple regression
 *  via the 3×3 normal equations; returns 0 if the design is degenerate. */
function partialPastTStat(Y: ReadonlyArray<number>, X: ReadonlyArray<number>): number {
  const rows: Array<[number, number, number]> = []; // [1, X_n, Y_{n-1}]
  const ys: number[] = [];
  for (let i = 1; i < Y.length; i++) { rows.push([1, X[i], Y[i - 1]]); ys.push(Y[i]); }
  const p = 3, m = rows.length;
  if (m <= p) return 0;
  // Normal equations A = RᵀR (3×3), b = RᵀY.
  const A = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  const b = [0, 0, 0];
  for (let r = 0; r < m; r++) {
    for (let j = 0; j < p; j++) { b[j] += rows[r][j] * ys[r]; for (let k = 0; k < p; k++) A[j][k] += rows[r][j] * rows[r][k]; }
  }
  const inv = invert3(A);
  if (!inv) return 0;
  const coef = [0, 0, 0];
  for (let j = 0; j < p; j++) for (let k = 0; k < p; k++) coef[j] += inv[j][k] * b[k];
  // Residual variance → standard error of coef[2] (the Y_{n-1} slope).
  let rss = 0;
  for (let r = 0; r < m; r++) { const pred = coef[0] * rows[r][0] + coef[1] * rows[r][1] + coef[2] * rows[r][2]; const e = ys[r] - pred; rss += e * e; }
  const sigma2 = rss / (m - p);
  const se = Math.sqrt(Math.max(sigma2 * inv[2][2], 1e-300));
  return se > 0 ? coef[2] / se : 0;
}

/** Invert a 3×3 matrix; null if singular. */
function invert3(A: number[][]): number[][] | null {
  const [a, b, c] = A[0], [d, e, f] = A[1], [g, h, i] = A[2];
  const det = a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g);
  if (Math.abs(det) < 1e-12) return null;
  const id = 1 / det;
  return [
    [(e * i - f * h) * id, (c * h - b * i) * id, (b * f - c * e) * id],
    [(f * g - d * i) * id, (a * i - c * g) * id, (c * d - a * f) * id],
    [(d * h - e * g) * id, (b * g - a * h) * id, (a * e - b * d) * id],
  ];
}
