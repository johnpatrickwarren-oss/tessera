/**
 * icc-sweep.ts — where, between 1.5% and 12.4%, does the ICC budget actually break? And does the
 * loop path tolerate more of it than the accumulator path?
 *
 * WHY BOTH QUESTIONS AT ONCE. A2-icc asks for the boundary; N9 showed the two shipped accumulation
 * paths diverge materially below δ₀ and asked whether the budget should be per-path. Same axis, same
 * scenarios, one rack of runs.
 *
 * WHAT IS KNOWN GOING IN (all on the N11-corrected ICC axis — see RESEARCH-INDEX N11):
 *   ICC  1.49% (H16) — clean to T = 320
 *   ICC 12.40% (H15) — 10.00 pages/run against a Ville budget of 2.016, ~5× over
 * Between them, nothing has been measured. That 8× band is the published design target's entire
 * uncertainty, and it is the difference between "enrich block keys until ICC ≤ 1.5%" and
 * "… ≤ 6%", which are very different engineering asks.
 *
 * ── THE TWO PATHS ARE SHIPPED PIPELINES, NOT ISOLATED ACCUMULATORS ────────────────────────────
 * Read the comparison with this in mind. They differ in the INPUT TRANSFORM as well as the
 * accumulation rule:
 *
 *   accumulator (canary-sim, E1/E1b) : score → conformal rank within a K+1 block → calibrator f(p)
 *                                      → half/half product·onset accumulator → page at e ≥ 1/α
 *   loop        (mode-b-loop)        : score → round-standardised residual → geometricMixtureEValue
 *                                      (gInc increments, geometric onset prior, √E−1 adjuster)
 *                                      → page at e ≥ 1/α
 *
 * So a difference between the columns is a difference between PIPELINES. It cannot be attributed to
 * the accumulator alone, and this file does not attempt to. N9 already isolated the accumulation
 * rule on matched inputs; this measures what the two deployed paths actually do to the same fleet.
 *
 * ── METHOD NOTES ──────────────────────────────────────────────────────────────────────────────
 * • The accumulator column calls `horizon-experiment.scoreRound` directly — the same function the
 *   committed A2-E1b results were produced by. Nothing is re-implemented here (N11).
 * • ICC is MEASURED per cell with the corrected estimator, never assumed from the knob. The knob
 *   grid is chosen to span the band; the x-axis is what came out.
 * • Paging rate (first passage), never `E[M_T]` — N10. A sample mean of the accumulator tracks the
 *   median path and would report no growth at all.
 */
import { HEALTHY_SCENARIOS, healthyScorePanel, GEN_SIGMA_BY_GEN, MEAS_SIGMA } from './canary-sim.js';
import { geometricMixtureEValue } from './mixture-evalue.js';
import { estimateIcc, roundDemean } from './heterogeneity-estimate.js';
import { scoreRound, type FleetState } from './horizon-experiment.js';

/** Per-execution noise of the gen-0 block the panel selects. */
export const SIGMA_EXEC = Math.sqrt(GEN_SIGMA_BY_GEN[0] ** 2 + MEAS_SIGMA ** 2);

/** `unitOffsetSd` that targets a given ICC, ignoring the small baseline contribution from the other
 *  channels. Only used to CHOOSE the grid — every reported ICC is measured, not this. */
export function offsetSdForIcc(icc: number): number {
  return Math.sqrt(icc / (1 - icc)) * SIGMA_EXEC;
}

/** Target ICCs spanning the unmeasured band, with the two known anchors at the ends. */
export const SWEEP_TARGETS = [0.015, 0.025, 0.04, 0.06, 0.08, 0.10, 0.124] as const;

export interface SweepCell {
  readonly targetIcc: number;
  readonly unitOffsetSd: number;
  /** MEASURED with the corrected estimator — this is the x-axis. */
  readonly icc: number;
  readonly theta: number;
  /** pages per run, accumulator pipeline (conformal rank → calibrator → half/half). */
  readonly accumulatorPages: number;
  /** pages per run, loop pipeline (standardised residual → geometric mixture). */
  readonly loopPages: number;
  /** nUnits · alphaPage — the anytime budget both must stay inside. */
  readonly villeBudget: number;
  readonly accumulatorOver: boolean;
  readonly loopOver: boolean;
}

function freshState(n: number): FleetState {
  return {
    prod: new Float64Array(n).fill(1), g: new Float64Array(n), k: new Int32Array(n),
    cur: new Float64Array(n).fill(1), paged: new Uint8Array(n),
  };
}

function mulberry32(a: number): () => number {
  let s = a >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Round-standardise a panel: the loop path compares a unit against the round, not against a block. */
function standardise(scores: ReadonlyArray<ReadonlyArray<number>>): number[][] {
  const n = scores.length, T = scores[0].length;
  const out: number[][] = Array.from({ length: n }, () => new Array<number>(T));
  for (let t = 0; t < T; t++) {
    let m = 0;
    for (let u = 0; u < n; u++) m += scores[u][t];
    m /= n;
    let v = 0;
    for (let u = 0; u < n; u++) v += (scores[u][t] - m) ** 2;
    const sd = Math.sqrt(v / Math.max(n - 1, 1)) || 1e-12;
    for (let u = 0; u < n; u++) out[u][t] = (scores[u][t] - m) / sd;
  }
  return out;
}

export interface SweepOpts {
  seeds?: number; nUnits?: number; blockPeers?: number; horizon?: number; alphaPage?: number;
  /** Subset of SWEEP_TARGETS, so a full-scale sweep can be run in chunks and concatenated.
   *  Cells are independent — each builds its own panels from its own seeds — so chunking changes
   *  nothing about the result. */
  targets?: ReadonlyArray<number>;
}

export function runSweep(opts: SweepOpts = {}): SweepCell[] {
  const seeds = opts.seeds ?? 2;
  const nUnits = opts.nUnits ?? 1008;
  const K = opts.blockPeers ?? 30;
  const T = opts.horizon ?? 160;
  const alphaPage = opts.alphaPage ?? 1e-3;
  const thr = 1 / alphaPage;
  const base = HEALTHY_SCENARIOS.H16; // the unit-persistence family; only unitOffsetSd varies

  return (opts.targets ?? SWEEP_TARGETS).map((targetIcc) => {
    const unitOffsetSd = offsetSdForIcc(targetIcc);
    const knobs = { ...base, name: `sweep-icc-${(targetIcc * 100).toFixed(1)}`, unitOffsetSd };

    // x-axis: measured, not assumed.
    const measured = estimateIcc(roundDemean(
      { ...healthyScorePanel(knobs, { nUnits: 1440, nRounds: 40, hoursBetween: 132, seed: 424242 }) },
    ));

    let accPages = 0, loopPages = 0;
    for (let s = 0; s < seeds; s++) {
      const panel = healthyScorePanel(knobs, { nUnits, nRounds: T, hoursBetween: 132, seed: 5150 + s * 131 });
      // ── accumulator pipeline: the SHIPPED scoreRound, not a copy ──
      const r = mulberry32(90210 + s * 7717);
      const st = freshState(nUnits);
      for (let t = 0; t < T; t++) scoreRound(r, panel.scores, t, K, st, alphaPage, undefined);
      for (let u = 0; u < nUnits; u++) accPages += st.paged[u];
      // ── loop pipeline: the SHIPPED geometric mixture on round-standardised residuals ──
      const std = standardise(panel.scores);
      for (let u = 0; u < nUnits; u++) if (geometricMixtureEValue(std[u]) >= thr) loopPages += 1;
    }

    const villeBudget = nUnits * alphaPage;
    const accumulatorPages = accPages / seeds, loopPages_ = loopPages / seeds;
    return {
      targetIcc, unitOffsetSd, icc: measured.icc, theta: measured.theta,
      accumulatorPages, loopPages: loopPages_, villeBudget,
      accumulatorOver: accumulatorPages > villeBudget, loopOver: loopPages_ > villeBudget,
    };
  });
}

/** First cell whose pages exceed the Ville budget, per path — the boundary the sweep exists to find. */
export function boundaries(cells: ReadonlyArray<SweepCell>): { accumulator: number | null; loop: number | null } {
  const first = (pick: (c: SweepCell) => boolean) => cells.find(pick)?.icc ?? null;
  return { accumulator: first((c) => c.accumulatorOver), loop: first((c) => c.loopOver) };
}

export function report(opts: SweepOpts = {}): string {
  const cells = runSweep(opts);
  const b = boundaries(cells);
  const L = [
    'ICC sweep across the unmeasured band — pages/run vs the Ville budget, BOTH shipped pipelines',
    'x-axis ICC is MEASURED per cell (N11-corrected estimator), not assumed from the knob.',
    'Paths differ in input transform AND accumulation: this compares PIPELINES, not accumulators.',
    '',
    'target   measured ICC   theta    accum pages   loop pages   Ville budget   over?',
  ];
  for (const c of cells) {
    L.push(
      `${(c.targetIcc * 100).toFixed(1).padStart(5)}%   ${(c.icc * 100).toFixed(2).padStart(11)}%   ` +
      `${c.theta.toFixed(3)}   ${c.accumulatorPages.toFixed(2).padStart(11)}   ${c.loopPages.toFixed(2).padStart(10)}   ` +
      `${c.villeBudget.toFixed(3).padStart(12)}   ${c.accumulatorOver ? 'ACC ' : '    '}${c.loopOver ? 'LOOP' : ''}`,
    );
  }
  L.push('', `first breach — accumulator: ${b.accumulator === null ? 'none in band' : (b.accumulator * 100).toFixed(2) + '%'}` +
    `   loop: ${b.loop === null ? 'none in band' : (b.loop * 100).toFixed(2) + '%'}`);
  return L.join('\n');
}

if (require.main === module) console.log(report());
