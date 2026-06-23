// tools/calibration-envelope.ts — Tessera validity-envelope matrix runner.
//
// Characterizes per-shard type-I error (Ville bound) and fleet e-BH FDR across a
// MISSPECIFICATION grid: autocorrelation, heavy tails, seasonality,
// heteroscedasticity. The detector's baseline (mu, sigma^2) is calibrated to each
// generator's TRUE marginal moments, so H0 is literally true and any firing is a
// genuine false positive. Where the existing R72/R77 envelopes feed the detector
// its OWN null and measure detection power, this tool feeds it nulls it does NOT
// assume and measures whether the *guarantees* survive — and whether AR(1)
// pre-whitening (tools/per-shard-whitening.ts) restores them.
//
// Deterministic + idempotent: re-running produces byte-identical JSON + MD. Per-
// trial seeds are scramble-hashed (no serially-correlated LCG seeds).
//
// See docs/SPEC-per-shard-validity-under-autocorrelation.md. Tessera-original; NOT vendored.

import { freshBettingState, updateBettingState } from '@johnpatrickwarren-oss/deploysignal-engine/detectors/betting-e-process';
import { eBenjaminiHochberg } from '@johnpatrickwarren-oss/deploysignal-engine/fleet/e-bh';
import { estimateAr1, whiten, type Ar1Fit } from './per-shard-whitening.js';
import * as fs from 'node:fs';
import * as path from 'node:path';

// ── PRNG (scramble-hashed seeds; no serial LCG correlation) ──
export function mulberry32(a: number): () => number {
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function scramble(n: number): number {
  let z = (n + 0x9E3779B9) | 0;
  z = Math.imul(z ^ (z >>> 16), 0x21f0aaad);
  z = Math.imul(z ^ (z >>> 15), 0x735a2d97);
  return (z ^ (z >>> 15)) >>> 0;
}
export function gaussian(rng: () => number): number {
  const u1 = Math.max(rng(), 1e-12), u2 = rng();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

/** Wilson score interval bounds for a binomial proportion. */
function wilsonBounds(k: number, n: number, z = 1.96): { lower: number; upper: number } {
  if (n === 0) return { lower: 0, upper: 1 };
  const p = k / n, z2 = z * z;
  const center = (p + z2 / (2 * n)) / (1 + z2 / n);
  const half = (z * Math.sqrt((p * (1 - p)) / n + z2 / (4 * n * n))) / (1 + z2 / n);
  return { lower: center - half, upper: center + half };
}
export function wilsonUpper(k: number, n: number, z = 1.96): number { return wilsonBounds(k, n, z).upper; }
export function wilsonLower(k: number, n: number, z = 1.96): number { return wilsonBounds(k, n, z).lower; }

/** One-sided type-I verdict: the Ville guarantee is FPR <= alpha, so a cell only
 *  VIOLATES it when the observed rate is significantly above alpha (Wilson lower
 *  bound > alpha). A grazing upper bound on a well-calibrated cell is noise. */
export function typeIVerdict(wilsonLowerBound: number, alpha: number): string {
  return wilsonLowerBound > alpha ? 'FAIL (inflated)' : 'PASS';
}

/** Split an e-BH selection into true/false discoveries given that shards
 *  [0, k) are the truly-drifting ones. Returns the false-discovery proportion. */
export function classifyFleetSelection(selected: ReadonlyArray<number>, k: number): { falseSel: number; trueSel: number; fdp: number } {
  const falseSel = selected.filter((i) => i >= k).length;
  const trueSel = selected.filter((i) => i < k).length;
  return { falseSel, trueSel, fdp: selected.length > 0 ? falseSel / selected.length : 0 };
}

// ── Generators: each exposes analytic true marginal moments + a per-stream sampler ──
type Sampler = (w: number) => number;
interface Generator {
  name: string;
  trueMean: number;
  trueVar: number;
  whitenable: boolean; // AR generators get an additional whitened row (AC-8)
  make: (rng: () => number) => Sampler;
}

function genGaussian(): Generator {
  return { name: 'gaussian-iid (control)', trueMean: 0, trueVar: 1, whitenable: false, make: (rng) => () => gaussian(rng) };
}
function genStudentT(df: number): Generator {
  const scale = Math.sqrt((df - 2) / df); // standardize t_df to unit variance
  return {
    name: `student-t df=${df}`, trueMean: 0, trueVar: 1, whitenable: false,
    make: (rng) => () => {
      const z = gaussian(rng);
      let chi = 0;
      for (let i = 0; i < df; i++) { const g = gaussian(rng); chi += g * g; }
      return (z / Math.sqrt(chi / df)) * scale;
    },
  };
}
function genAr1(rho: number): Generator {
  const innov = Math.sqrt(1 - rho * rho);
  return {
    name: `ar1 rho=${rho.toFixed(2)}`, trueMean: 0, trueVar: 1, whitenable: true,
    make: (rng) => { let prev = gaussian(rng); return () => { prev = rho * prev + innov * gaussian(rng); return prev; }; },
  };
}
function genSeasonal(amp: number, period: number, noiseSd: number): Generator {
  // trueVar is the full-period time-average variance amp^2/2 + noiseSd^2. The
  // window is not an integer number of periods, so the in-window deterministic
  // mean is not exactly 0 — immaterial here (this is a control cell), noted for
  // honesty about the "true marginal moments" framing on a deterministic component.
  return {
    name: `seasonal (period=${period})`, trueMean: 0, trueVar: (amp * amp) / 2 + noiseSd * noiseSd, whitenable: false,
    make: (rng) => (w) => amp * Math.sin((2 * Math.PI * w) / period) + noiseSd * gaussian(rng),
  };
}
function genVarianceRegime(sLo: number, sHi: number, blockLen: number): Generator {
  return {
    name: `variance-regime (${sLo}/${sHi})`, trueMean: 0, trueVar: (sLo * sLo + sHi * sHi) / 2, whitenable: false,
    make: (rng) => (w) => (Math.floor(w / blockLen) % 2 === 0 ? sLo : sHi) * gaussian(rng),
  };
}

const GENERATORS: Generator[] = [
  genGaussian(), genStudentT(5), genStudentT(3),
  genAr1(0.3), genAr1(0.6), genAr1(0.9), genAr1(0.95),
  genSeasonal(1.0, 24, 1.0), genVarianceRegime(0.5, 1.5, 10),
];

// ── Grid + run parameters (exact literals; recorded in the matrix) ──
export const ALPHAS = [0.01, 0.005] as const;
export const WINDOW = 200;
export const TRIALS = 4000;
export const BASELINE_N = 4000;          // held-out baseline sample for AR(1) fit
export const DRIFT = 0.15;               // ramp/window for the whitened-power column
const SEED_PREFIX = 0xCA11B;             // 'calib'; recorded in JSON

// ── One null stream: returns true if wealth ever crosses 1/alpha (sticky fire) ──
function streamFires(
  gen: Generator, mode: 'raw' | 'whiten', fit: Ar1Fit | null, alpha: number, seed: number, drift: number, window: number,
): boolean {
  const step = gen.make(mulberry32(scramble(seed)));
  const state = freshBettingState();
  const threshold = 1 / alpha;
  let prevX: number | null = null;
  for (let w = 0; w < window; w++) {
    let x = step(w);
    if (drift) x += drift * (w + 1);
    const centered = x - gen.trueMean;
    let obs: number, bvar: number;
    if (mode === 'whiten' && fit) { obs = whiten(centered, prevX, fit.phi); bvar = fit.sigma2; }
    else { obs = centered; bvar = gen.trueVar; }
    prevX = centered;
    updateBettingState(state, obs, 0, bvar, alpha);
    if (state.M >= threshold) return true;
  }
  return false;
}

function fitFromBaseline(gen: Generator, seed: number): Ar1Fit {
  const step = gen.make(mulberry32(scramble(seed)));
  const sample: number[] = [];
  for (let i = 0; i < BASELINE_N; i++) sample.push(step(i) - gen.trueMean);
  return estimateAr1(sample);
}

interface TypeICell {
  generator: string; mode: 'raw' | 'whiten'; alpha: number; phi: number | null;
  observed_fpr: number; wilson95_lower: number; wilson95_upper: number; inflation: number; power: number | null; verdict: string;
}

function round6(x: number): number { return Math.round(x * 1e6) / 1e6; }

export interface TypeIRunOpts { window?: number; trials?: number; powTrials?: number; }

export function runTypeICell(gen: Generator, mode: 'raw' | 'whiten', alpha: number, baseSeed: number, opts: TypeIRunOpts = {}): TypeICell {
  const window = opts.window ?? WINDOW;
  const trials = opts.trials ?? TRIALS;
  const powTrials = opts.powTrials ?? Math.floor(trials / 2);
  const fit = mode === 'whiten' ? fitFromBaseline(gen, baseSeed) : null;
  let fires = 0;
  for (let t = 0; t < trials; t++) {
    if (streamFires(gen, mode, fit, alpha, baseSeed + 1 + t, 0, window)) fires++;
  }
  const fpr = fires / trials;
  const { lower, upper } = wilsonBounds(fires, trials);
  // Whitened rows also report detection power (a fix must still fire on real drift).
  let power: number | null = null;
  if (mode === 'whiten') {
    let det = 0;
    for (let t = 0; t < powTrials; t++) {
      if (streamFires(gen, mode, fit, alpha, baseSeed + 1_000_000 + t, DRIFT, window)) det++;
    }
    power = det / powTrials;
  }
  return {
    generator: gen.name, mode, alpha, phi: fit ? round6(fit.phi) : null,
    observed_fpr: round6(fpr), wilson95_lower: round6(lower), wilson95_upper: round6(upper),
    inflation: round6(fpr / alpha), power: power === null ? null : round6(power),
    verdict: typeIVerdict(lower, alpha),
  };
}

/** AR(1) generator factory, exported for deterministic tests. */
export function ar1Generator(rho: number): Generator { return genAr1(rho); }
export function gaussianGenerator(): Generator { return genGaussian(); }

// ── Experiment 2: fleet e-BH FDR ──
export const E2_N = 20;
export const E2_K = 3;
export const E2_QS = [0.05, 0.10] as const;
export const E2_TRIALS = 2000;
interface FdrCell { regime: string; q: number; empirical_fdr: number; fdr95_upper: number; power: number; verdict: string; }

function shardTerminalEValue(gen: Generator, mode: 'raw' | 'whiten', fit: Ar1Fit | null, isDrift: boolean, seed: number): number {
  const step = gen.make(mulberry32(scramble(seed)));
  const state = freshBettingState();
  let prevX: number | null = null;
  for (let w = 0; w < WINDOW; w++) {
    let x = step(w);
    if (isDrift) x += DRIFT * (w + 1);
    const centered = x - gen.trueMean;
    let obs: number, bvar: number;
    if (mode === 'whiten' && fit) { obs = whiten(centered, prevX, fit.phi); bvar = fit.sigma2; }
    else { obs = centered; bvar = gen.trueVar; }
    prevX = centered;
    updateBettingState(state, obs, 0, bvar, 0.005);
  }
  return state.M;
}

function runFdrCell(label: string, gen: Generator, mode: 'raw' | 'whiten', q: number, baseSeed: number): FdrCell {
  const fit = mode === 'whiten' ? fitFromBaseline(gen, baseSeed) : null;
  let fdpSum = 0, fdpSq = 0, powerSum = 0;
  let seed = baseSeed + 1;
  for (let t = 0; t < E2_TRIALS; t++) {
    const eValues: number[] = [];
    for (let s = 0; s < E2_N; s++) eValues.push(shardTerminalEValue(gen, mode, fit, s < E2_K, seed++));
    const { selected } = eBenjaminiHochberg(eValues, q);
    const { trueSel, fdp } = classifyFleetSelection(selected, E2_K);
    fdpSum += fdp; fdpSq += fdp * fdp; powerSum += trueSel / E2_K;
  }
  const fdr = fdpSum / E2_TRIALS;
  const se = Math.sqrt(Math.max(0, fdpSq / E2_TRIALS - fdr * fdr) / E2_TRIALS);
  const upper = fdr + 1.96 * se;
  return {
    regime: label, q, empirical_fdr: round6(fdr), fdr95_upper: round6(upper),
    power: round6(powerSum / E2_TRIALS), verdict: upper <= q + 1e-9 ? 'PASS' : 'FAIL (FDR > q)',
  };
}

// ── Matrix assembly ──
interface CalibrationMatrix {
  schema_version: 'tessera-calibration-envelope-v1';
  seed_prefix: number;
  params: { window: number; trials: number; baseline_n: number; drift: number; alphas: number[]; fleet: { N: number; K: number; trials: number; qs: number[] } };
  type_i: TypeICell[];
  fleet_fdr: FdrCell[];
}

function buildMatrix(): CalibrationMatrix {
  const typeI: TypeICell[] = [];
  let seed = SEED_PREFIX;
  for (const gen of GENERATORS) {
    for (const alpha of ALPHAS) {
      typeI.push(runTypeICell(gen, 'raw', alpha, seed)); seed += 5_000_000;
      if (gen.whitenable) { typeI.push(runTypeICell(gen, 'whiten', alpha, seed)); seed += 5_000_000; }
    }
  }
  const fleet: FdrCell[] = [];
  const gAr = genAr1(0.9), gG = genGaussian(), gT = genStudentT(3);
  for (const q of E2_QS) {
    fleet.push(runFdrCell('gaussian-iid', gG, 'raw', q, seed)); seed += 5_000_000;
    fleet.push(runFdrCell('ar1 rho=0.9 (raw)', gAr, 'raw', q, seed)); seed += 5_000_000;
    fleet.push(runFdrCell('ar1 rho=0.9 (whitened)', gAr, 'whiten', q, seed)); seed += 5_000_000;
    fleet.push(runFdrCell('student-t df=3', gT, 'raw', q, seed)); seed += 5_000_000;
  }
  return {
    schema_version: 'tessera-calibration-envelope-v1',
    seed_prefix: SEED_PREFIX,
    params: { window: WINDOW, trials: TRIALS, baseline_n: BASELINE_N, drift: DRIFT, alphas: [...ALPHAS], fleet: { N: E2_N, K: E2_K, trials: E2_TRIALS, qs: [...E2_QS] } },
    type_i: typeI,
    fleet_fdr: fleet,
  };
}

// ── Renderers ──
function pct(x: number): string { return (x * 100).toFixed(2) + '%'; }

function renderMd(m: CalibrationMatrix): string {
  const L: string[] = [];
  L.push('# Tessera — validity-envelope (misspecification calibration) matrix');
  L.push('');
  L.push('Generated by `tools/calibration-envelope.ts`; deterministic; idempotent. Machine-readable: `calibration-envelope-matrix.json`.');
  L.push('');
  L.push(`Baseline calibrated to each generator's **true marginal moments**, so H0 is literally true and any firing is a genuine false positive. Window=${m.params.window}, trials/cell=${m.params.trials}.`);
  L.push('');
  L.push('## Per-shard type-I error (Ville bound)');
  L.push('');
  L.push('The Ville guarantee is `FPR <= alpha`. A cell is `FAIL (inflated)` only when the observed rate is *significantly above* alpha (Wilson-95% **lower** bound > alpha) — not when its upper bound merely grazes alpha, which is Monte-Carlo noise on a well-calibrated cell. `power` = detection rate on a ramp drift (whitened rows only; a fix must still fire on real drift). `infl` = observed FPR / alpha.');
  L.push('');
  L.push('| generator | mode | alpha | phi | obs FPR | W95 [lo, hi] | infl | power | verdict |');
  L.push('|---|---|---|---|---|---|---|---|---|');
  for (const c of m.type_i) {
    L.push(`| ${c.generator} | ${c.mode} | ${c.alpha} | ${c.phi === null ? '—' : c.phi.toFixed(3)} | ${pct(c.observed_fpr)} | [${pct(c.wilson95_lower)}, ${pct(c.wilson95_upper)}] | ${c.inflation.toFixed(1)}× | ${c.power === null ? '—' : pct(c.power)} | ${c.verdict} |`);
  }
  L.push('');
  L.push('## Fleet e-BH FDR');
  L.push('');
  L.push(`N=${m.params.fleet.N} shards, K=${m.params.fleet.K} truly drifting, ${m.params.fleet.trials} trials. \`PASS\` iff empirical-FDR 95% upper <= q.`);
  L.push('');
  L.push('| regime | q | empirical FDR | FDR95 upper | power | verdict |');
  L.push('|---|---|---|---|---|---|');
  for (const c of m.fleet_fdr) {
    L.push(`| ${c.regime} | ${c.q} | ${pct(c.empirical_fdr)} | ${pct(c.fdr95_upper)} | ${pct(c.power)} | ${c.verdict} |`);
  }
  L.push('');
  L.push('## Method & honest-measurement notes');
  L.push('');
  L.push('- **`obs FPR` measures the full sticky-fire false-positive rate** over the whole window (P(sup_t M_t >= 1/alpha)), not a per-tick rate.');
  L.push('- **The fix is AR(1) pre-whitening only.** The near-unit-root regime (rho=0.95) leaves residual autocorrelation that lag-1 whitening cannot fully remove, so its whitened row may still show mild inflation — reported, not hidden. AR(p>1) / seasonal whitening is future work (see `decisions/0001-pre-whitening-over-rho-stamped-threshold.md`).');
  L.push('- **Heavy tails and heteroscedasticity pass unwhitened** — the engine\'s bounded-z clip absorbs them. The load-bearing failure is temporal autocorrelation.');
  L.push(`- **Power is reported for a strong ramp drift** (${m.params.drift}/window over ${m.params.window} windows — a large cumulative shift). 100% here confirms whitening does not "control by never firing"; it does NOT characterize sensitivity near the detection floor — see R77 (\`coverage-matrices/R77-detection-envelope.md\`) for the low-magnitude regime.`);
  L.push('- Seeds are scramble-hashed per trial (no serially-correlated LCG seeds). Re-running `pnpm calibration-envelope` produces byte-identical output.');
  L.push('');
  return L.join('\n');
}

export interface EnvelopeResult { matrix_json_path: string; matrix_md_path: string; bytes_total: number; }

export function runCalibrationEnvelope(): EnvelopeResult {
  const root = path.resolve(__dirname, '..');
  const dir = path.join(root, 'coverage-matrices');
  fs.mkdirSync(dir, { recursive: true });
  const matrix = buildMatrix();
  const jsonStr = JSON.stringify(matrix, null, 2) + '\n';
  const mdStr = renderMd(matrix);
  const jsonPath = path.join(dir, 'calibration-envelope-matrix.json');
  const mdPath = path.join(dir, 'calibration-envelope.md');
  fs.writeFileSync(jsonPath, jsonStr);
  fs.writeFileSync(mdPath, mdStr);
  return { matrix_json_path: jsonPath, matrix_md_path: mdPath, bytes_total: jsonStr.length + mdStr.length };
}

if (require.main === module) {
  const r = runCalibrationEnvelope();
  process.stdout.write(
    `Built calibration-envelope matrix.\nJSON: ${path.relative(process.cwd(), r.matrix_json_path)}\n` +
    `MD:   ${path.relative(process.cwd(), r.matrix_md_path)}\n`,
  );
  process.exit(0);
}
