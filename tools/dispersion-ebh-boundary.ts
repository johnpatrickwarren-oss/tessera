// tools/dispersion-ebh-boundary.ts — A2-disp-ebh: WHERE e-BH fails under persistent dispersion.
//
// WHAT THIS CLOSES (a2-dispersion report § 7, open item A2-disp-ebh). The dispersion report
// measured that e-BH is NOT protected against the dispersion channel — 14.8 false selections/run
// at ς̂ = 0.61, first nonzero at ς̂ = 0.31 — but only at three ς points. This harness sweeps the
// knob finely enough to BRACKET the e-BH failure boundary the way the icc-sweep bracketed the
// location Ville-budget breach (6.32–8.36%) and the dispersion report bracketed the ς paging
// breach (0.15–0.31).
//
// THE MECHANISM, AND THE PREDICTION IT YIELDS. e-BH's first selection requires max_u e_u ≥ N/q —
// a log-barrier of ln(N/q) ≈ 10.6 at N = 2016, q = 0.05, versus the paging barrier
// ln(1/α) ≈ 6.9. So the e-BH boundary is THE SAME first-passage problem as paging with a higher
// barrier, and the existing finite-T predictor applies verbatim with α replaced by q/N:
// `predictedPagesPerRun(ς, K, N, q/N, T)`. Two consequences, both testable:
//   • the e-BH breach ς is ABOVE the paging breach ς at any fixed T (higher barrier) — which is
//     exactly why P8's location-era comfort held as long as it did;
//   • the barrier grows only like ln N: doubling the fleet raises the per-unit protection by
//     ln 2 ≈ 0.7 nats while doubling the number of chances to cross. The scalar-ς iid theory says
//     the barrier wins (crossing probability falls faster than N grows). THE MEASUREMENT SAYS THE
//     OPPOSITE — selections grow SUPERLINEARLY with N (0 / 3 / 26.5 per run at N = 1008/2016/4032,
//     knob 1.0) — because the theory's iid-λ assumption is false in the shipped substrate: λ is a
//     PER-RACK multiplier shared by all GPUS_PER_RACK units, so more units means more rack draws
//     (higher P(one extreme rack)), and once one unit of an extreme rack crosses N/q, e-BH's
//     step-up drops the bar to N/(q·k) for its ~71 same-λ rack-mates — a CASCADE. The prediction
//     column is kept because its ς- and barrier-orderings hold; its N-direction does not.
//
// A/A ONLY, SHIPPED PRIMITIVES ONLY: variants are canary-sim knob settings (H8's dispersion knob
// alone, location knob zeroed), scored by horizon-experiment's scoreRound (conformalP →
// calibrator → ½/½ accumulator) with eBhSelect run EVERY round so the first-selection round is
// observed directly, not inferred from a horizon grid. Every selection below is false.
//
// Run: `pnpm build && node tools/dispersion-ebh-boundary.js [--seeds 4] [--nsweep] [--json out.json]`
// Report: research/2026-07-27-a2-disp-ebh-boundary.md

import { HEALTHY_SCENARIOS, eBhSelect } from './canary-sim.js';
import { healthyPanel, roundDemean, estimateDispersion } from './heterogeneity-estimate.js';
import { scoreRound, type FleetState } from './horizon-experiment.js';
import { predictedPagesPerRun, lambdaFloor } from './dispersion-drift.js';

type Knobs = (typeof HEALTHY_SCENARIOS)[string];

/** H8's dispersion channel in isolation at an arbitrary knob setting (location knob zeroed —
 *  the same construction as dispersion-drift's variants, parameterised). */
export function dispKnobs(heteroRackSd: number): Knobs {
  return { ...HEALTHY_SCENARIOS.H8, name: `disp-${heteroRackSd}`, rackStaticSd: 0, heteroRackSd };
}

function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface EbhPoint {
  T: number;
  falsePagesPerRun: number;
  villeBudget: number;
  falseSelectionsPerRun: number;
  /** finite-T first-passage prediction of units crossing N/q (order-of-magnitude; orderings only). */
  predCrossings: number;
}

export interface EbhBoundaryRow {
  knob: number;
  variant: string;
  varsigmaHat: number;
  nUnits: number;
  /** e-BH's single-rejection threshold N/q — the barrier that protected P8's location claim. */
  ebhThreshold: number;
  lambda0: number;
  /** first round (1-based) with ≥1 false e-BH selection, per seed; Infinity = never. */
  firstSelRounds: number[];
  /** seeds (of opts.seeds) that ever produced a false selection within maxT. */
  seedsWithSel: number;
  points: EbhPoint[];
}

export interface EbhOpts {
  seeds?: number; nUnits?: number; blockPeers?: number; horizons?: number[];
  alphaPage?: number; q?: number;
}

/** ς̂ of a variant, measured on its own substrate at the standard measurement panel
 *  (1440 × 40, seed 424242 — same convention as every A2 harness). */
export function measureVarsigma(knobs: Knobs): number {
  return estimateDispersion(roundDemean(healthyPanel(knobs, 424242, 1440, 40))).varsigma;
}

/** One seed of the A/A sweep: run to maxT, e-BH every round; returns the first-selection round
 *  (Infinity if none) and fills the per-horizon page/selection tallies. */
function runSeed(
  s: number, knobs: Knobs, nUnits: number, K: number, maxT: number,
  alphaPage: number, q: number, acc: Record<number, { pages: number; sel: number }>,
): number {
  const r = rng(880301 + s * 9377);
  const panel = healthyPanel(knobs, 60601 + s * 419, nUnits, maxT);
  const st: FleetState = {
    prod: new Float64Array(nUnits).fill(1), g: new Float64Array(nUnits), k: new Int32Array(nUnits),
    cur: new Float64Array(nUnits).fill(1), paged: new Uint8Array(nUnits),
  };
  let firstSel = Infinity;
  for (let t = 0; t < maxT; t++) {
    scoreRound(r, panel.scores, t, K, st, alphaPage, undefined);
    const nSel = eBhSelect(Array.from(st.cur), q).length;
    if (nSel > 0 && !Number.isFinite(firstSel)) firstSel = t + 1;
    const a = acc[t + 1];
    if (a) {
      let pages = 0;
      for (let u = 0; u < nUnits; u++) pages += st.paged[u];
      a.pages += pages;
      a.sel += nSel;
    }
  }
  return firstSel;
}

/**
 * A/A e-BH boundary measurement at one dispersion-knob setting. All-healthy fleet; every page and
 * every e-BH selection is a false positive.
 */
export function runEbhVariant(heteroRackSd: number, opts: EbhOpts = {}): EbhBoundaryRow {
  const seeds = opts.seeds ?? 4;
  const nUnits = opts.nUnits ?? 2016;
  const K = opts.blockPeers ?? 30;
  const horizons = opts.horizons ?? [40, 80, 160, 240, 320];
  const alphaPage = opts.alphaPage ?? 0.001;
  const q = opts.q ?? 0.05;
  const maxT = Math.max(...horizons);
  const knobs = dispKnobs(heteroRackSd);
  const varsigmaHat = measureVarsigma(knobs);

  const acc: Record<number, { pages: number; sel: number }> = {};
  for (const T of horizons) acc[T] = { pages: 0, sel: 0 };
  const firstSelRounds: number[] = [];
  for (let s = 0; s < seeds; s++) firstSelRounds.push(runSeed(s, knobs, nUnits, K, maxT, alphaPage, q, acc));

  return {
    knob: heteroRackSd, variant: knobs.name, varsigmaHat, nUnits,
    ebhThreshold: nUnits / q,
    lambda0: lambdaFloor(varsigmaHat, K),
    firstSelRounds,
    seedsWithSel: firstSelRounds.filter(Number.isFinite).length,
    points: horizons.map((T) => ({
      T,
      falsePagesPerRun: acc[T].pages / seeds,
      villeBudget: nUnits * alphaPage,
      falseSelectionsPerRun: acc[T].sel / seeds,
      predCrossings: predictedPagesPerRun(varsigmaHat, K, nUnits, q / nUnits, T),
    })),
  };
}

/** The knob grid: chosen so measured ς̂ spans the paging bracket (0.15) through the strongest
 *  measured failure (0.61) with resolution inside the (0.15, 0.31) gap the report left open. */
export const DEFAULT_KNOB_GRID: ReadonlyArray<number> = [0, 0.25, 0.3, 0.35, 0.4, 0.5, 0.7, 1.0];

export function boundarySweep(grid: ReadonlyArray<number> = DEFAULT_KNOB_GRID, opts: EbhOpts = {}): EbhBoundaryRow[] {
  return grid.map((k) => runEbhVariant(k, opts));
}

/** Fleet-size sweep at a fixed strong knob: does the ln N barrier growth beat the ×N chances?
 *  Measured answer: NO — rack-shared λ + the e-BH step-up cascade make selections grow
 *  superlinearly with N (see the header). e-BH's protection WEAKENS with fleet size here. */
export function fleetSizeSweep(heteroRackSd: number, sizes: ReadonlyArray<number>, opts: EbhOpts = {}): EbhBoundaryRow[] {
  return sizes.map((n) => runEbhVariant(heteroRackSd, { ...opts, nUnits: n }));
}

// ─────────────────────────────────────────────────────────────────────────────

const f1 = (x: number): string => (Number.isFinite(x) ? x.toFixed(1) : '∞');
const meanFinite = (xs: number[]): number => {
  const f = xs.filter(Number.isFinite);
  return f.length ? f.reduce((a, b) => a + b, 0) / f.length : Infinity;
};

function sweepLines(L: string[], rows: EbhBoundaryRow[]): void {
  L.push('  knob   ς̂       λ₀      firstSel(mean over seeds w/ sel)  seeds w/ sel   T=80 sel/run   T=320 sel/run   T=320 pages/run (budget)   pred cross T=320');
  for (const r of rows) {
    const p80 = r.points.find((p) => p.T === 80), p320 = r.points[r.points.length - 1];
    L.push(`  ${String(r.knob).padEnd(5)} ${r.varsigmaHat.toFixed(3)}  ${f1(r.lambda0).padStart(6)}  ${f1(meanFinite(r.firstSelRounds)).padStart(12)}                     ${r.seedsWithSel}/${r.firstSelRounds.length}         ${f1(p80?.falseSelectionsPerRun ?? NaN).padStart(8)}       ${f1(p320.falseSelectionsPerRun).padStart(8)}          ${f1(p320.falsePagesPerRun).padStart(8)} (${p320.villeBudget.toFixed(1)})        ${p320.predCrossings.toExponential(1).padStart(9)}`);
  }
}

export function report(opts: { seeds?: number; nsweep?: boolean } = {}): { lines: string[]; data: Record<string, unknown> } {
  const L: string[] = [];
  L.push('A2-disp-ebh — the e-BH failure boundary under persistent dispersion (A/A; every selection FALSE)');
  L.push(`barrier: ln(N/q) vs paging ln(1/α) — e-BH is the same first-passage problem with a higher wall`);
  L.push('');
  const rows = boundarySweep(DEFAULT_KNOB_GRID, { seeds: opts.seeds });
  sweepLines(L, rows);
  const data: Record<string, unknown> = { sweep: rows };
  if (opts.nsweep) {
    L.push('');
    L.push('fleet-size sweep at knob 1.0 (does the ln N barrier beat the ×N chances?):');
    const ns = fleetSizeSweep(1.0, [1008, 2016, 4032], { seeds: Math.min(opts.seeds ?? 2, 2), horizons: [80, 160, 320] });
    L.push('  N       ς̂      N/q       firstSel   T=320 sel/run   per-1000-units');
    for (const r of ns) {
      const p = r.points[r.points.length - 1];
      L.push(`  ${String(r.nUnits).padEnd(6)} ${r.varsigmaHat.toFixed(3)}  ${String(r.ebhThreshold).padStart(6)}   ${f1(meanFinite(r.firstSelRounds)).padStart(8)}   ${f1(p.falseSelectionsPerRun).padStart(8)}        ${(1000 * p.falseSelectionsPerRun / r.nUnits).toFixed(2).padStart(8)}`);
    }
    data.fleetSweep = ns;
  }
  return { lines: L, data };
}

if (require.main === module) {
  const si = process.argv.indexOf('--seeds');
  const { lines, data } = report({
    seeds: si >= 0 ? Number(process.argv[si + 1]) : 4,
    nsweep: process.argv.includes('--nsweep'),
  });
  for (const l of lines) console.log(l);
  const i = process.argv.indexOf('--json');
  if (i >= 0 && process.argv[i + 1]) {
    require('fs').writeFileSync(process.argv[i + 1], JSON.stringify(data, null, 2));
    console.log(`\nwrote ${process.argv[i + 1]}`);
  }
}
