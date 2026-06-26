// tools/rw-changepoint.ts — a random-walk (I(1)) CHANGEPOINT detector for a sustained LEVEL step.
//
// WHY. The router's integrated path differences an I(1) counter to restore a valid null, but a mean-STEP
// then becomes a sparse impulse pair that a (robust) scale e-value must ignore → FDR-valid but no power
// (tools/metric-router.ts). A sustained level step is better detected on the LEVEL with a WINDOWED
// LOCAL-CONTRAST: compare the mean over a post-onset window to the mean over the adjacent pre-onset
// window. Window-averaging (a) uses the SUSTAINED level (every point elevated, not just the boundary
// increments) and (b) averages down the heavy tails toward Gaussian; the LOCAL (adjacent) reference keeps
// the random-walk variance small (the walk only wanders ~σ_inc·√(2w) over the 2w span). Mixing over
// candidate onsets gives a Shiryaev–Roberts-style e-value (the Wall-B e-detector idea, here on the level).
//
// BOUNDEDNESS. The per-candidate bet exp(λz − λ²/2) explodes on a heavy-tailed contrast (the same
// catastrophe as the Gaussian scale e-value). We CLIP the standardized contrast to [−c, c] before the
// bet, so the e-value is bounded by exp(λc) and cannot explode. (Clipping the upper tail down only
// reduces the bet — it preserves E[e|H0] ≤ 1 for a symmetric sub-Gaussian null; empirically validated on
// Gaussian I(1) below.) The mixture is two-sided (a step can be ±).
//
// HONEST ENVELOPE. This is the RIGHT detector for a sustained level step on an I(1) series, and it works
// with controlled FDR on clean Gaussian I(1) (test/rw-changepoint.test.ts: detects super-threshold steps,
// E[e|H0] ≤ 1). On the REAL gpu_temp_c residual it is still challenged: (1) the increments are so
// heavy-tailed that the windowed contrast remains non-Gaussian (clipping bounds it but costs power), and
// (2) the real faults (mag ≈ 4.5) are SUB-THRESHOLD vs the random walk's local wander σ_inc·√(2w). So this
// closes the CONSTRUCTION gap (a valid, bounded level-step detector for I(1)); the residual gap is the
// intrinsic detectability of small steps on a heavy-tailed random walk (the deepest ADR 0012 layer).
//
// Tessera-original; NOT vendored; prototype.

function median(xs: ReadonlyArray<number>): number {
  const s = xs.slice().sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length ? (s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2) : 0;
}
/** Robust scale: MAD about the median / 0.6745, floored. */
function madScale(xs: ReadonlyArray<number>): number {
  const med = median(xs);
  const mad = median(xs.map((x) => Math.abs(x - med)));
  return Math.max(mad / 0.6745, 1e-9);
}

export interface RwChangepointOptions {
  /** Half-window: pre = [j−w, j), post = [j, j+w). Default 15. */
  window?: number;
  /** Bet size (target effect in standardized contrast units). Default 1.0. */
  lambda?: number;
  /** Clip the standardized contrast to [−clip, clip] before the bet (boundedness). Default 4. */
  clip?: number;
  /** Earliest onset to scan (skip a calibration prefix). Default = window. */
  calLen?: number;
  /** Candidate-onset stride (a strided scan is a conservative sub-mixture). Default 1. */
  stride?: number;
}

/** The per-onset windowed local level-contrast: mean(post window) − mean(pre window). */
export function levelContrasts(Y: ReadonlyArray<number>, window: number, calLen: number, stride: number): number[] {
  const T = Y.length, out: number[] = [];
  for (let j = Math.max(window, calLen); j + window <= T; j += stride) {
    let a = 0, b = 0;
    for (let t = j; t < j + window; t++) a += Y[t];
    for (let t = j - window; t < j; t++) b += Y[t];
    out.push((a - b) / window);
  }
  return out;
}

/** Random-walk changepoint e-value for a sustained LEVEL step in an I(1) series Y. Shiryaev–Roberts
 *  mixture over candidate onsets of a CLIPPED two-sided bet on the standardized windowed local contrast.
 *  Bounded by exp(λ·clip); empirically E[e|H0] ≤ 1 on Gaussian I(1) (see test). Large when a sustained
 *  step is present. */
export function rwChangepointEValue(Y: ReadonlyArray<number>, opts: RwChangepointOptions = {}): number {
  const window = opts.window ?? 15, lambda = opts.lambda ?? 1.0, clip = opts.clip ?? 4;
  const calLen = opts.calLen ?? window, stride = opts.stride ?? 1;
  const c = levelContrasts(Y, window, calLen, stride);
  if (c.length === 0) return 0;
  const med = median(c), sd = madScale(c);
  let e = 0;
  for (const v of c) {
    let z = (v - med) / sd;
    z = Math.max(-clip, Math.min(clip, z));
    e += Math.exp(lambda * z - (lambda * lambda) / 2) + Math.exp(-lambda * z - (lambda * lambda) / 2);
  }
  return e / (2 * c.length);
}
