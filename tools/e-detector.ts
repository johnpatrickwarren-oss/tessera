// tools/e-detector.ts — the E-DETECTOR for transient mean-shift faults (Wall B).
//
// WHY THIS EXISTS (the transient-power wall). The terminal detector compares a fixed
// calibration prefix [0, calLen) to a SINGLE fixed test window [calLen, T) via the
// universal-inference mean-shift e-value (engine ADR 0010). A TRANSIENT fault — onset→offset
// strictly inside the test window, [t_on, t_off] ⊂ [calLen, T) — is then AVERAGED against the
// healthy remainder of that fixed window, diluting the mean shift toward zero. On the
// adversarial clustersynth scenario the terminal UI e-value consequently selects ~nothing on
// transient faults (tools/clustersynth-scenario.ts, "underpowered" finding). This is a POWER
// wall, separate from the per-stream VALIDITY wall (see below + RESEARCH-INDEX § 1 O3/O4).
//
// THE CONSTRUCTION (Shin, Ramdas & Rinaldo, "E-detectors", arXiv:2203.03532; the named fix in
// research/2026-06-26-transient-fault-detection.md). An e-detector is a nonneg adapted process
// M with E_{P,∞}[M_τ] ≤ E_{P,∞}[τ] for ALL stopping times τ and ALL pre-change laws P; then
// N* = inf{ n : M_n ≥ 1/α } controls the average run length, E_∞[N*] ≥ 1/α (Thm 2.4), with NO
// assumption on changepoint location or post-change law (Remark 2.1). It is built by MIXING
// over candidate onsets j (Def 2.6):
//   • Shiryaev–Roberts  M^SR_n  = Σ_{j ≤ n} Λ^(j)_n   (RECOMMENDED for a nonstationary null,
//                                                       Remark 2.13)
//   • CUSUM             M^CU_n  = max_{j ≤ n} Λ^(j)_n
// where each Λ^(j) is an e-process for "the change started at onset j". Because the running
// statistic accumulates over EVERY candidate onset, a fault active in [t_on, t_off] is caught by
// the increment Λ^(j) whose window aligns with it (j ≈ t_on, n ≈ t_off) — regardless of the
// unknown timing — instead of being diluted over one fixed window. That dissolves the cal/test
// dilution.
//
// THE INCREMENT we use (the literal research recommendation): the SEQUENTIALIZED universal-
// inference e-value. Λ^(j)_n := universalInferenceMeanShiftEValue(series, cal=[0,calLen),
// test={start:j, len:n−j}, i.e. indices [j, n)). The clean prefix is the calibration; each candidate
// onset j opens a test window that grows to the current time n.
//
// ── THE LOAD-BEARING CAVEAT (Wall A re-enters inside the increment) ──────────────────────────
// The e-detector's VALIDITY reduces to each Λ^(j) being a genuine e-PROCESS under the null —
// i.e. sup_P E_P[Λ^(j)_τ] ≤ 1 for all stopping times τ, not merely E_P[Λ^(j)_n] ≤ 1 at one fixed
// n (the UI's proven property, ADR 0010). Whether the UI's FIXED-HORIZON validity SURVIVES this
// promotion-to-all-stopping-times under a nonstationary null is OPEN (Shin et al. Remark 2.13:
// under an unknown/nonstationary null "c_α = 1/α seems the only reasonable choice … use e-SR
// rather than e-CUSUM"). So: this primitive closes the transient POWER wall by construction; it
// does NOT close the per-stream nonstationary-null validity wall (ADR 0007/0008/0012). On real
// telemetry the increment can still over-fire; on clustersynth (benign on validity — its
// nonstationarity is removable common-mode, ADR 0016) the empirical null ARL is the check. Feed
// it BASELINED residuals (common-mode-removed), never raw telemetry. This is a PROTOTYPE: the
// durable home for the primitive is the engine (detectors/), with this Tessera harness wiring it
// to clustersynth — see decisions/ note. Quantifying the e-SR detection-delay vs an onset-oracle
// is still open (RESEARCH-INDEX § 2 O3).
//
// Tessera-original; NOT vendored.

import { universalInferenceMeanShiftEValue } from '@johnpatrickwarren-oss/deploysignal-engine/detectors/universal-inference-e-value';
import { gInc, gBounded, BOUND_LAMBDAS, type IncrementKind } from './mixture-evalue.js';

// ── VALID-INCREMENT SR E-DETECTOR (W2, 2026-07-02 — closes O3's construction gap conditionally) ────

export interface SrEDetectorTrace {
  /** First tick t with M_t ≥ threshold (= patience/α), else null. */
  detectTime: number | null;
  /** Running max of the SR statistic (diagnostics/ranking only — NOT an e-value; see mixture-evalue). */
  peak: number;
  threshold: number;
}

/** The SRR e-detector with GENUINE e-process increments, on a STANDARDIZED residual series.
 *
 *  M_n = (1 + M_{n−1})·g(r_n) is exactly the Shiryaev–Roberts sum Σ_{j≤n} Λ^(j)_n with per-onset
 *  increments Λ^(j)_n = Π_{s=j..n} g(r_s), g = the FIXED-grid Gaussian-LR mixture (mixture-evalue.ts
 *  gInc — predictable: the λ grid is set before data). Each Λ^(j) is a genuine e-PROCESS conditional
 *  on the residual null (r_s | F_{s−1} ~ N(0,1) — the emitter-contract premise the Wall-A gate and
 *  calibration monitor audit).
 *
 *  THRESHOLD SEMANTICS (important — E[M_n|H0] = n, so M crosses any FIXED level ~linearly often):
 *  the threshold is c = patience/α, giving TWO conditional guarantees at once:
 *    • P(any false alarm within `patience` ticks) ≤ α — Doob's maximal inequality on the nonneg
 *      submartingale M (E[M_n] ≤ n): P(max_{n≤patience} M_n ≥ patience/α) ≤ patience/(patience/α) = α.
 *    • ARL = E∞[N*] ≥ patience/α — Shin–Ramdas–Rinaldo Thm 2.4 (arXiv:2203.03532); equivalently
 *      **EOP ≤ α at patience `patience`** (error-over-patience, arXiv:2501.04130) — the O1 metric
 *      decision, now implemented. A bare 1/α threshold (the UI eDetector's convention above) carries
 *      NO per-window false-alarm bound — under the null M reaches 1/α within ~2/α ticks routinely.
 *  Both bounds are CONDITIONAL on the certified residual null; a Wall-A-flagged counter has neither.
 *  Contrast the UI-increment `eDetector` above, whose moving train/eval splits are NOT e-processes
 *  (disclosed there): for THIS variant no validity-promotion question remains — the open wall is
 *  entirely the residual null itself, which the two-mode gates own. O(T), all onsets (no grid).
 *
 *  INCREMENT FAMILY (ADR 0027): 'gaussian' (default — max power on a certified standardized null;
 *  the premise is audited by Wall-A + the calibration monitor) or 'bounded' (the audit's clipped
 *  linear bets — exact per-onset validity under any tail / σ̂ error, for distribution-doubt
 *  regimes). Linear bets cannot mix per-tick, so the bounded kind runs one SR recursion per λ and
 *  averages the sums — each M_λ is an SR sum of genuine e-processes (E[g_λ|H0] = 1 exactly), and a
 *  convex combination preserves both threshold guarantees. */
export function srEDetector(
  resid: ReadonlyArray<number>, alpha = 0.01, patience?: number, kind: IncrementKind = 'gaussian',
): SrEDetectorTrace {
  const p = patience ?? Math.max(1, resid.length);
  const threshold = p / alpha;
  let peak = 0;
  let detectTime: number | null = null;
  if (kind === 'bounded') {
    const Ms = BOUND_LAMBDAS.map(() => 0);
    for (let t = 0; t < resid.length; t++) {
      let mean = 0;
      for (let k = 0; k < BOUND_LAMBDAS.length; k++) {
        Ms[k] = (1 + Ms[k]) * gBounded(resid[t], BOUND_LAMBDAS[k]);
        mean += Ms[k];
      }
      mean /= BOUND_LAMBDAS.length;
      if (mean > peak) peak = mean;
      if (detectTime === null && mean >= threshold) detectTime = t;
    }
    return { detectTime, peak, threshold };
  }
  let M = 0;
  for (let t = 0; t < resid.length; t++) {
    M = (1 + M) * gInc(resid[t]);
    if (!isFinite(M)) M = Number.MAX_VALUE;
    if (M > peak) peak = M;
    if (detectTime === null && M >= threshold) detectTime = t;
  }
  return { detectTime, peak, threshold };
}

/** UI windowing floor (engine universal-inference-e-value.ts): each window needs ≥ 6 points. */
export const UI_MIN_WINDOW = 6;

export interface EDetectorOptions {
  /** Length of the fixed clean calibration prefix [0, calLen). Must be ≥ UI_MIN_WINDOW. */
  calLen: number;
  /** Detection level: the threshold is 1/alpha (ARL ≥ 1/alpha under the null). Default 0.05. */
  alpha?: number;
  /** Mixture over onsets: 'SR' = Shiryaev–Roberts Σ_j (default, recommended for the
   *  nonstationary null per Remark 2.13); 'CUSUM' = max_j. */
  mixture?: 'SR' | 'CUSUM';
  /** Candidate-onset grid stride. A strided onset set is a SUB-mixture of the full Σ_{j≤n}, so it
   *  is conservative (≤ the full statistic) — still a valid e-detector, lower power. Default:
   *  spread ~`onsetTarget` candidates across [calLen, T). */
  onsetStride?: number;
  /** Target number of candidate onsets when onsetStride is not given. Default 24. */
  onsetTarget?: number;
  /** Evaluation-time grid stride (coarsens the detection-delay resolution only). Default: spread
   *  ~`evalTarget` evaluation times. */
  evalStride?: number;
  /** Target number of evaluation times when evalStride is not given. Default 40. */
  evalTarget?: number;
  /** Minimum test-window length n−j for a candidate to contribute. Default UI_MIN_WINDOW. */
  minTestLen?: number;
}

export interface EDetectorTrace {
  /** The evaluation-time grid (values of n at which M_n was computed). */
  evalTimes: number[];
  /** M_n at each evaluation time (the SR sum or CUSUM max over active candidate onsets). */
  M: number[];
  /** Candidate onsets used (the strided grid over [calLen, T − minTestLen]). */
  onsets: number[];
  /** Detection threshold 1/alpha. */
  threshold: number;
  /** First evaluation time n with M_n ≥ threshold, else null (no detection within the horizon). */
  detectTime: number | null;
  /** The peak M_n over the trace (for ranking / diagnostics). */
  peak: number;
}

function defaultStride(span: number, target: number): number {
  return Math.max(1, Math.floor(span / Math.max(1, target)));
}

/** Build the strided candidate-onset grid over [calLen, T−minTestLen] and the evaluation-time grid
 *  over [calLen+minTestLen, T]. Both grids are conservative sub-sets (a strided onset set is a
 *  sub-mixture; a strided eval set only coarsens the detection-delay resolution). */
function buildGrids(T: number, calLen: number, minTestLen: number, opts: EDetectorOptions): { onsets: number[]; evalTimes: number[] } {
  const lastOnset = T - minTestLen;
  const onsetStride = opts.onsetStride ?? defaultStride(lastOnset - calLen, opts.onsetTarget ?? 24);
  const onsets: number[] = [];
  for (let j = calLen; j <= lastOnset; j += onsetStride) onsets.push(j);

  const firstEval = calLen + minTestLen;
  const evalStride = opts.evalStride ?? defaultStride(T - firstEval, opts.evalTarget ?? 40);
  const evalTimes: number[] = [];
  for (let n = firstEval; n <= T; n += evalStride) evalTimes.push(n);
  if (evalTimes.length === 0 || evalTimes[evalTimes.length - 1] !== T) evalTimes.push(T);
  return { onsets, evalTimes };
}

/** The mixed running statistic at evaluation time n: SR = Σ_j Λ^(j)_n, CUSUM = max_j Λ^(j)_n, over
 *  the candidate onsets that admit a window of length ≥ minTestLen at n. */
function mixtureStatistic(
  series: ReadonlyArray<number>, calLen: number, onsets: ReadonlyArray<number>,
  n: number, minTestLen: number, mixture: 'SR' | 'CUSUM',
): number {
  let acc = 0;
  for (const j of onsets) {
    if (n - j < minTestLen) continue; // candidate not yet admissible at this n
    const lam = safeIncrement(series, calLen, j, n);
    if (mixture === 'SR') acc += lam;
    else if (lam > acc) acc = lam;
  }
  return acc;
}

/** Run the e-detector on a single (already common-mode-removed) residual series.
 *
 *  Λ^(j)_n = universalInferenceMeanShiftEValue(series, [0,calLen), {start:j,len:n−j} = indices [j,n)); M^SR_n = Σ_j Λ^(j)_n
 *  (or max_j for CUSUM). Detection at the first n with M_n ≥ 1/alpha.
 *
 *  @throws RangeError if calLen < UI_MIN_WINDOW or the series is too short to admit any candidate. */
export function eDetector(series: ReadonlyArray<number>, opts: EDetectorOptions): EDetectorTrace {
  const T = series.length;
  const calLen = opts.calLen;
  const alpha = opts.alpha ?? 0.05;
  const mixture = opts.mixture ?? 'SR';
  const minTestLen = opts.minTestLen ?? UI_MIN_WINDOW;
  if (!Number.isInteger(calLen) || calLen < UI_MIN_WINDOW) {
    throw new RangeError(`eDetector: calLen must be an integer ≥ ${UI_MIN_WINDOW}; got ${calLen}`);
  }
  if (!(alpha > 0 && alpha < 1)) throw new RangeError(`eDetector: alpha must be in (0,1); got ${alpha}`);
  if (minTestLen < UI_MIN_WINDOW) {
    throw new RangeError(`eDetector: minTestLen must be ≥ ${UI_MIN_WINDOW}; got ${minTestLen}`);
  }
  // Candidate onsets live in [calLen, T−minTestLen] (so a window of length ≥ minTestLen still fits).
  if (T - minTestLen < calLen) {
    throw new RangeError(`eDetector: series too short (T=${T}, calLen=${calLen}, minTestLen=${minTestLen})`);
  }
  const { onsets, evalTimes } = buildGrids(T, calLen, minTestLen, opts);

  const threshold = 1 / alpha;
  const M: number[] = [];
  let detectTime: number | null = null;
  let peak = 0;
  for (const n of evalTimes) {
    const acc = mixtureStatistic(series, calLen, onsets, n, minTestLen, mixture);
    M.push(acc);
    if (acc > peak) peak = acc;
    if (detectTime === null && acc >= threshold) detectTime = n;
  }
  return { evalTimes, M, onsets, threshold, detectTime, peak };
}

/** Λ^(j)_n: the universal-inference mean-shift e-value with cal=[0,calLen), test={start:j,len:n−j}=[j,n).
 *  Returns 0 on any UI guard failure (degenerate window) — a 0 increment never triggers a false
 *  alarm and never inflates the SR sum, the conservative choice. */
function safeIncrement(series: ReadonlyArray<number>, calLen: number, j: number, n: number): number {
  try {
    const e = universalInferenceMeanShiftEValue(series, { start: 0, len: calLen }, { start: j, len: n - j });
    return Number.isFinite(e) && e > 0 ? e : 0;
  } catch {
    return 0;
  }
}

/** The TERMINAL detector for comparison: one fixed test window [calLen, T). This is the current
 *  pipeline's per-shard e-value (clustersynth-scenario.ts). A transient fault inside [calLen, T)
 *  is diluted here — that is exactly what the e-detector fixes. */
export function terminalUiEValue(series: ReadonlyArray<number>, calLen: number): number {
  const T = series.length;
  try {
    return universalInferenceMeanShiftEValue(series, { start: 0, len: calLen }, { start: calLen, len: T - calLen });
  } catch {
    return 0;
  }
}
