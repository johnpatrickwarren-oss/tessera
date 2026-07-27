// tools/horizon-experiment.ts — A2-E1b: the decisive falsification test.
//
// The A2 chain predicts three things at once, and they are easy to tell apart:
//
//   P1  per-test conformal FPR stays EXACTLY nominal at every horizon T          (Λ(1) = 1)
//   P2  the accumulator's mean null value follows Λ(T) = E_δ[g(δ)^T]             (★)
//   P3  false pages and false e-BH selections blow up once T exceeds T*          (consequence)
//
// P1 + P3 together are the signature: a system whose per-test calibration is perfect and whose
// accumulated error rate is not. Any competing explanation (a broken rank, a mis-set threshold, a
// coding error) breaks P1 as well, so P1 holding while P3 fails is what makes this a test of A2
// rather than of the harness.
//
// E1 could not see this because at β=0.05% a unit accumulates T ≈ 5 rounds over the whole 60-day
// experiment, and 5 increments essentially never cross the 1/α = 1000 paging threshold. This tool
// sweeps T past that.
//
// EVERYTHING STATISTICAL IS THE SHIPPED CODE. `conformalP`, `calibrator`, `onsetUpdate`,
// `onsetValue`, `combinedEValue` and `eBhSelect` are imported from canary-sim.ts — not
// reimplemented — so a discrepancy cannot be an artefact of a parallel implementation. Only the
// healthy score substrate is local (tools/heterogeneity-estimate.ts, itself a mirror of
// canary-sim's execScore minus faults).
//
// A/A ONLY: every unit is healthy. Every page and every e-BH selection below is a false positive.
//
// Run: `pnpm build && node tools/horizon-experiment.js [--scenario H2] [--seeds 8] [--json out.json]`

import { conformalP, calibrator, onsetUpdate, onsetValue, combinedEValue, eBhSelect, HEALTHY_SCENARIOS } from './canary-sim.js';
import { healthyPanel, roundDemean, estimateIcc } from './heterogeneity-estimate.js';
import { gCurve, lambda, validityHorizon } from './exchangeability-drift.js';

const E_CAP = 1e12;

function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface HorizonPoint {
  T: number;
  /** per-test rate of p ≤ 0.01 over all healthy executions — P1. */
  perTestFpr: number;
  /** mean accumulator value at T = the measured Λ(T) — P2. */
  lambdaObserved: number;
  /** Λ(T) predicted from the measured θ and the block size — P2. */
  lambdaPredicted: number;
  /** units that ever crossed the paging threshold 1/α, per run — P3. */
  falsePagesPerRun: number;
  /** Ville budget N·α — what P3 is measured against. */
  villeBudget: number;
  /** false e-BH selections at q, per run — P3. */
  falseSelectionsPerRun: number;
}

export interface HorizonResult {
  scenario: string; theta: number; icc: number; tStar: number;
  nUnits: number; blockPeers: number; alphaPage: number; q: number;
  points: HorizonPoint[];
}

/** Per-unit accumulator state (canary-sim's ½·product + ½·onset-mixture) plus the paged flags. */
export interface FleetState {
  prod: Float64Array; g: Float64Array; k: Int32Array; cur: Float64Array; paged: Uint8Array;
}

interface RoundAcc { fprNum: number; fprDen: number; lam: number; pages: number; sel: number }

/** One round of the design: assign every unit to a fresh random block of K+1, score each member by
 *  its randomised conformal rank within the block, and advance the per-unit accumulators. `a` is
 *  the per-test-FPR tally for this round's horizon, when this round is a measured horizon. */
export function scoreRound(
  r: () => number, scores: ReadonlyArray<ReadonlyArray<number>>, t: number, K: number,
  st: FleetState, alphaPage: number, a: RoundAcc | undefined,
): void {
  const nUnits = st.prod.length;
  const order = Array.from({ length: nUnits }, (_, i) => i);
  for (let i = nUnits - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
  for (let b = 0; b + K + 1 <= nUnits; b += K + 1) {
    const members = order.slice(b, b + K + 1);
    const blockScores = members.map((u) => scores[u][t]);
    for (let mi = 0; mi < members.length; mi++) {
      const u = members[mi];
      const peers = blockScores.filter((_, i2) => i2 !== mi);
      const p = conformalP(blockScores[mi], peers, r());
      const f = calibrator(p);
      st.prod[u] = Math.min(E_CAP, st.prod[u] * f);
      st.g[u] = Math.min(E_CAP, onsetUpdate(st.g[u], st.k[u], f));
      st.k[u] += 1;
      st.cur[u] = combinedEValue(st.prod[u], st.g[u], st.k[u]);
      if (st.cur[u] >= 1 / alphaPage) st.paged[u] = 1;
      if (a) { a.fprDen += 1; if (p <= 0.01) a.fprNum += 1; }
    }
  }
}

/** End-of-round bookkeeping at a measured horizon: mean accumulator value (Λ observed), cumulative
 *  paged units, and false e-BH selections at q. */
function recordHorizonPoint(st: FleetState, q: number, a: RoundAcc): void {
  const nUnits = st.cur.length;
  let sum = 0;
  for (let u = 0; u < nUnits; u++) sum += st.cur[u];
  a.lam += sum / nUnits;
  for (let u = 0; u < nUnits; u++) a.pages += st.paged[u];
  a.sel += eBhSelect(Array.from(st.cur), q).length;
}

/**
 * Sweep the accumulation horizon on an all-healthy fleet.
 *
 * Each round every unit is assigned to a fresh random block of `blockPeers`+1 units — the design's
 * randomised placement — and scored by its randomised conformal rank within that block.
 */
export function runHorizon(
  scenarioKey: string,
  opts: { seeds?: number; nUnits?: number; blockPeers?: number; horizons?: number[]; alphaPage?: number; q?: number } = {},
): HorizonResult {
  const knobs = HEALTHY_SCENARIOS[scenarioKey];
  if (!knobs) throw new RangeError(`unknown scenario ${scenarioKey}`);
  const seeds = opts.seeds ?? 8;
  const nUnits = opts.nUnits ?? 2016;
  const K = opts.blockPeers ?? 30;
  const horizons = opts.horizons ?? [5, 10, 20, 40, 80];
  const alphaPage = opts.alphaPage ?? 0.001;
  const q = opts.q ?? 0.05;
  const maxT = Math.max(...horizons);

  // θ for the prediction, measured on this scenario's own substrate.
  const { theta, icc } = estimateIcc(roundDemean(healthyPanel(knobs, 424242, 1440, 40)));
  const curve = theta > 0.05 ? gCurve(theta, K) : null;

  const acc: Record<number, RoundAcc> = {};
  for (const T of horizons) acc[T] = { fprNum: 0, fprDen: 0, lam: 0, pages: 0, sel: 0 };

  for (let s = 0; s < seeds; s++) {
    const r = rng(90210 + s * 7717);
    const panel = healthyPanel(knobs, 5150 + s * 131, nUnits, maxT);
    const st: FleetState = {
      prod: new Float64Array(nUnits).fill(1), g: new Float64Array(nUnits), k: new Int32Array(nUnits),
      cur: new Float64Array(nUnits).fill(1), paged: new Uint8Array(nUnits),
    };

    for (let t = 0; t < maxT; t++) {
      const a = acc[t + 1];
      scoreRound(r, panel.scores, t, K, st, alphaPage, a);
      if (a) recordHorizonPoint(st, q, a);
    }
    void onsetValue;
  }

  const points: HorizonPoint[] = horizons.map((T) => {
    const a = acc[T];
    return {
      T,
      perTestFpr: a.fprDen > 0 ? a.fprNum / a.fprDen : NaN,
      lambdaObserved: a.lam / seeds,
      lambdaPredicted: curve ? lambda(curve, T) : 1,
      falsePagesPerRun: a.pages / seeds,
      villeBudget: nUnits * alphaPage,
      falseSelectionsPerRun: a.sel / seeds,
    };
  });

  return {
    scenario: `${scenarioKey} ${knobs.name}`, theta, icc,
    tStar: curve ? validityHorizon(curve) : Infinity,
    nUnits, blockPeers: K, alphaPage, q, points,
  };
}

const f3 = (x: number): string => (Number.isFinite(x) ? (x > 1e6 ? '>1e6' : x.toFixed(3)) : '∞');

export function report(scenarioKeys = ['H1', 'H12', 'H2'], seeds = 6): { lines: string[]; data: unknown } {
  const L: string[] = [];
  const out: HorizonResult[] = [];
  L.push('A2-E1b — accumulation horizon sweep on an ALL-HEALTHY fleet (every page/selection is false)');
  L.push('statistical primitives imported from canary-sim.ts; only the score substrate is local');
  for (const key of scenarioKeys) {
    const res = runHorizon(key, { seeds });
    out.push(res);
    L.push('');
    L.push(`── ${res.scenario}   θ=${res.theta.toFixed(3)} (ICC ${(res.icc * 100).toFixed(2)}%)  T*=${f3(res.tStar)}  N=${res.nUnits}  K=${res.blockPeers}  Ville budget=${res.points[0].villeBudget}`);
    L.push('   T    per-test FPR   Λ observed   Λ predicted   false pages/run   false eBH sel/run');
    for (const p of res.points) {
      L.push(`${String(p.T).padStart(4)}    ${p.perTestFpr.toFixed(4).padStart(10)}   ${f3(p.lambdaObserved).padStart(10)}   ` +
        `${f3(p.lambdaPredicted).padStart(11)}   ${p.falsePagesPerRun.toFixed(1).padStart(15)}   ${p.falseSelectionsPerRun.toFixed(1).padStart(17)}`);
    }
  }
  return { lines: L, data: out };
}

if (require.main === module) {
  const arg = (n: string): string | undefined => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : undefined; };
  const keys = (arg('--scenario') ?? 'H1,H12,H2').split(',');
  const { lines, data } = report(keys, Number(arg('--seeds') ?? 6));
  for (const l of lines) console.log(l);
  const j = arg('--json');
  if (j) { require('fs').writeFileSync(j, JSON.stringify(data, null, 2)); console.log(`\nwrote ${j}`); }
}
