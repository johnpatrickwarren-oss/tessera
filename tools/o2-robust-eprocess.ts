// tools/o2-robust-eprocess.ts — O2-fit: the Huber-robust Catoni e-process (Wang–Ramdas,
// arXiv:2301.09573 Lemma 3) measured against Tessera's needs.
//
// THE CONSTRUCTION (implemented exactly). Catoni's log-influence
//     φ(x) = log 2 (x ≥ 1) · −log(1 − x + x²/2) (0 ≤ x < 1) · log(1 + x + x²/2) (−1 ≤ x < 0)
//            · −log 2 (x < −1),   |φ| ≤ log 2,
// and the ROBUST CATONI SUPERMARTINGALE for H0 "clean mean 0, clean variance ≤ σ², data within
// TV-radius ε of the clean law":
//     M_t = ∏_{i≤t} exp(φ(λ x_i)) / (1 + λ²σ²/2 + 1.5ε),
// a nonnegative supermartingale with M_0 = 1 for ANY contamination within the ball (Lemma 3;
// the 1.5 = (2 − 1/2), the range of exp(φ)). ε = 0 recovers the non-robust Catoni. λ constant
// (the paper: decaying/growing λ inflate the CS; λ ∝ √ε/σ is width-optimal — for DETECTION we
// also use a shift-targeted constant λ = δ_target/σ², disclosed per run).
//
// WHAT THIS HARNESS MEASURES (the three O2-fit questions from the 2026-07-28 disposition):
//   F1 VALIDITY — Ville crossing rate at α on: clean Gaussian, heavy tails (t₃, unit variance),
//      ε-contaminated (asymmetric +10σ spikes — the case that breaks a one-sided bet), incl.
//      MIS-SPECIFIED ε_assumed < ε_true (the theorem's premise violated — how badly does it leak?).
//   F2 POWER — sustained mean shifts at and around the program's floor, detection rate + median
//      crossing time vs the non-robust arms.
//   F3 LAUNDERING — the trap the tessera-rng ADR-0051 cold-eye named: an INTERMITTENT fault
//      (rare large spikes, the SDC signature) is statistically indistinguishable from the
//      contamination the construction is built to IGNORE. Same marginal spike rate, benign
//      (symmetric, mean-preserving) vs fault (asymmetric): a robust arm that stays quiet on the
//      first necessarily stays quiet on the second.
//
// Arms: robust Catoni (ε_assumed grid) · Catoni ε=0 · Gaussian mixture bet (the naive
// exp(λx − λ²/2) mixed over the e-detector's λ grid — what a non-robust emitter would ship).
//
// Run: `pnpm build && node tools/o2-robust-eprocess.js [--seeds 200] [--json out.json]`

export function catoniPhi(x: number): number {
  if (x >= 1) return Math.LN2;
  if (x >= 0) return -Math.log(1 - x + x * x / 2);
  if (x >= -1) return Math.log(1 + x + x * x / 2);
  return -Math.LN2;
}

export interface RobustCatoniOpts { sigma: number; eps: number; lambda: number }

/** One increment of the robust Catoni supermartingale (H0: clean mean ≤ 0 within TV-ε). */
export function robustCatoniIncrement(x: number, o: RobustCatoniOpts): number {
  return Math.exp(catoniPhi(o.lambda * x)) / (1 + (o.lambda * o.lambda * o.sigma * o.sigma) / 2 + 1.5 * o.eps);
}

/** The paper's width-optimal constant bet λ = 0.5·√ε/σ (falls back to the shift-targeted bet
 *  when ε = 0, where the width-optimal choice degenerates to 0). */
export function widthOptimalLambda(sigma: number, eps: number, deltaTarget: number): number {
  return eps > 0 ? (0.5 * Math.sqrt(eps)) / sigma : deltaTarget / (sigma * sigma);
}

/** The e-detector's fixed λ grid, reused for the naive Gaussian mixture bet. */
export const GAUSS_LAMBDAS: ReadonlyArray<number> = [0.05, 0.1, 0.2, 0.4, 0.8];

export function gaussianMixtureIncrement(x: number): number {
  let s = 0;
  for (const l of GAUSS_LAMBDAS) s += Math.exp(l * x - (l * l) / 2);
  return s / GAUSS_LAMBDAS.length;
}

// ─────────────────────────────────────────────────────────────────────────────

function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const gauss = (r: () => number): number => {
  const u = Math.max(r(), 1e-12), v = r();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
};
/** t₃ scaled to unit variance (t₃ variance = 3). */
const t3unit = (r: () => number): number => {
  const z = gauss(r);
  const c = gauss(r) ** 2 + gauss(r) ** 2 + gauss(r) ** 2; // χ²₃
  return (z / Math.sqrt(c / 3)) / Math.sqrt(3);
};

export type Stream = (r: () => number, t: number) => number;

export const STREAMS: Record<string, Stream> = {
  clean: (r) => gauss(r),
  heavyT3: (r) => t3unit(r),
  // ε_true = 5% asymmetric +10σ spikes — a CONTAMINATED NULL (the clean component has mean 0;
  // the observed mean is +0.5σ, which is exactly why a non-robust one-sided bet fires).
  contam5: (r) => (r() < 0.05 ? 10 : gauss(r)),
  contam1: (r) => (r() < 0.01 ? 10 : gauss(r)),
  // F2 faults: sustained shifts on the clean stream.
  shift10: (r) => gauss(r) + 0.10,
  shift25: (r) => gauss(r) + 0.25,
  shift50: (r) => gauss(r) + 0.50,
  // F3: same 2% spike rate — benign (symmetric ±10σ, mean-preserving) vs fault (one-sided +10σ).
  burstBenign: (r) => (r() < 0.02 ? (r() < 0.5 ? 10 : -10) : gauss(r)),
  burstFault: (r) => (r() < 0.02 ? 10 : gauss(r)),
};

export interface ArmSpec { name: string; increment: (x: number) => number }

export function arms(deltaTarget: number): ArmSpec[] {
  const mk = (eps: number): ArmSpec => ({
    name: `robust(ε=${eps})`,
    increment: (x) => robustCatoniIncrement(x, { sigma: 1, eps, lambda: widthOptimalLambda(1, eps, deltaTarget) }),
  });
  return [
    mk(0.10), mk(0.05), mk(0.01),
    { name: 'catoni(ε=0)', increment: (x) => robustCatoniIncrement(x, { sigma: 1, eps: 0, lambda: deltaTarget }) },
    { name: 'gaussMix', increment: gaussianMixtureIncrement },
  ];
}

export interface CellResult {
  stream: string; arm: string;
  /** fraction of seeds whose running product EVER crossed 1/α within T. */
  crossRate: number;
  /** median crossing time among crossers (null = none crossed). */
  medianCrossT: number | null;
  meanFinalLogE: number;
}

export function runCell(streamName: string, arm: ArmSpec, opts: { seeds: number; T: number; alpha: number }): CellResult {
  const { seeds, T, alpha } = opts;
  const stream = STREAMS[streamName];
  let crossers = 0, sumLog = 0;
  const crossTs: number[] = [];
  for (let s = 0; s < seeds; s++) {
    const r = rng(140901 + s * 733 + streamName.length * 17);
    let logE = 0, crossed = false;
    for (let t = 0; t < T; t++) {
      logE += Math.log(arm.increment(stream(r, t)));
      if (!crossed && logE >= Math.log(1 / alpha)) { crossed = true; crossTs.push(t + 1); }
    }
    if (crossed) crossers++;
    sumLog += logE;
  }
  crossTs.sort((a, b) => a - b);
  return {
    stream: streamName, arm: arm.name,
    crossRate: crossers / seeds,
    medianCrossT: crossTs.length ? crossTs[Math.floor(crossTs.length / 2)] : null,
    meanFinalLogE: sumLog / seeds,
  };
}

export function report(seeds: number): { lines: string[]; data: CellResult[] } {
  const T = 2000, alpha = 0.01, deltaTarget = 0.25;
  const L: string[] = [];
  const data: CellResult[] = [];
  L.push(`O2-fit — robust Catoni e-process vs non-robust arms (T=${T}, α=${alpha}, ${seeds} seeds; λ_robust=0.5√ε, λ_catoni=δ_target=${deltaTarget})`);
  L.push('');
  const groups: Array<{ title: string; streams: string[] }> = [
    { title: 'F1 VALIDITY (crossing rate should be ≤ α; contam* are CONTAMINATED NULLS)', streams: ['clean', 'heavyT3', 'contam1', 'contam5'] },
    { title: 'F2 POWER (sustained shifts; crossing rate = detection)', streams: ['shift10', 'shift25', 'shift50'] },
    { title: 'F3 LAUNDERING (same 2% spike rate: benign symmetric vs one-sided fault)', streams: ['burstBenign', 'burstFault'] },
  ];
  for (const g of groups) {
    L.push(g.title);
    L.push(`  ${'stream'.padEnd(12)} ${arms(deltaTarget).map((a) => a.name.padStart(14)).join('')}`);
    for (const s of g.streams) {
      const cells = arms(deltaTarget).map((a) => runCell(s, a, { seeds, T, alpha }));
      data.push(...cells);
      L.push(`  ${s.padEnd(12)} ${cells.map((c) => `${(100 * c.crossRate).toFixed(1)}%${c.medianCrossT ? '@' + c.medianCrossT : ''}`.padStart(14)).join('')}`);
    }
    L.push('');
  }
  return { lines: L, data };
}

if (require.main === module) {
  const si = process.argv.indexOf('--seeds');
  const { lines, data } = report(si >= 0 ? Number(process.argv[si + 1]) : 200);
  for (const l of lines) console.log(l);
  const i = process.argv.indexOf('--json');
  if (i >= 0 && process.argv[i + 1]) {
    require('fs').writeFileSync(process.argv[i + 1], JSON.stringify(data, null, 2));
    console.log(`wrote ${process.argv[i + 1]}`);
  }
}
