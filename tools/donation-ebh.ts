// tools/donation-ebh.ts — PROTOTYPE: offline donation e-BH (Xu–Fischer–Ramdas, arXiv:2603.24792
// Appendix D.3, Theorem 16) against the shipped e-BH.
//
// WHAT IT IS. e-BH rejects the r largest e-values iff E_(r) ≥ m/(δr). Donation e-BH lets every
// hypothesis donate capped mass — B_i ≥ −(E_i ∧ 1), Σ B_i ≤ 0 — so sub-threshold e-values push
// near-threshold ones over. With uniform weights the rule reduces to: reject the r largest iff
//     Σ_{i≤r} min(E_(i) − m/(δr), 1) + Σ_{i>r} min(E_(i), 1) ≥ 0,
// maximised over r. Theorem 16: E[FDP] ≤ δ under ARBITRARY dependence, and the rejection set
// is a superset of e-BH's at every fixed time — a strict power improvement with no new
// assumptions on the e-values.
//
// WHAT IT IS NOT (the scope honesty that keeps this a prototype):
//   * The paper's SupFDR results are for the ONLINE model — a STREAM of hypotheses, one per
//     time step, monotone discovery sets. Tessera's fixed family of N units with e-processes
//     re-tested every round is a DIFFERENT object; composing donation with the √E−1 running-max
//     adjuster preserves each fixed-time FDP bound but the sup-over-time guarantee of that
//     composition is NOT covered by either paper. Do not quote a SupFDR claim for the
//     composition.
//   * Donation strictly enlarges the rejection set — under a VIOLATED null premise (dispersion,
//     N13) it can only make the failure larger. The pair gate / rack-local construction own the
//     premise; donation is a power knob strictly INSIDE the valid regime.
//
// Run: `pnpm build && node tools/donation-ebh.js [--seeds 6]` — A/A false-selection check +
// θ-fault power comparison on the shipped canary substrate.

import { eBhSelect, HEALTHY_SCENARIOS } from './canary-sim.js';
import { scoreRound, type FleetState } from './horizon-experiment.js';
import { healthyPanel } from './heterogeneity-estimate.js';

/** Offline donation e-BH with uniform weights (arXiv:2603.24792 D.3): indices of the rejected
 *  (i.e. r^DeBH largest) e-values. Superset of `eBhSelect` by Theorem 16. */
export function donationEbhSelect(e: readonly number[], q: number): number[] {
  const m = e.length;
  if (m === 0) return [];
  const idx = e.map((_, i) => i).sort((a, b) => e[b] - e[a]);
  // suffix[r] = Σ_{i>r} min(E_(i), 1) over the sorted order (1-based r)
  const suffix = new Array<number>(m + 1).fill(0);
  for (let i = m - 1; i >= 0; i--) suffix[i] = suffix[i + 1] + Math.min(e[idx[i]], 1);
  let best = 0;
  for (let r = 1; r <= m; r++) {
    let top = 0;
    for (let i = 0; i < r; i++) top += Math.min(e[idx[i]] - m / (q * r), 1);
    if (top + suffix[r] >= 0) best = r;
  }
  return idx.slice(0, best);
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

function freshState(n: number): FleetState {
  return {
    prod: new Float64Array(n).fill(1), g: new Float64Array(n), k: new Int32Array(n),
    cur: new Float64Array(n).fill(1), paged: new Uint8Array(n),
  };
}

/** Accumulate one seed's fleet to T on the given panel and return both selectors' picks. */
function runArm(
  scores: ReadonlyArray<ReadonlyArray<number>>, seed: number, nUnits: number, T: number, q: number,
): { eSel: number[]; dSel: number[] } {
  const st = freshState(nUnits);
  const r = rng(880301 + seed * 9377);
  for (let t = 0; t < T; t++) scoreRound(r, scores, t, 30, st, 0.001, undefined);
  return { eSel: eBhSelect(Array.from(st.cur), q), dSel: donationEbhSelect(Array.from(st.cur), q) };
}

function splitHits(sel: ReadonlyArray<number>, faulty: ReadonlySet<number>): { hit: number; miss: number } {
  let hit = 0, miss = 0;
  for (const u of sel) { if (faulty.has(u)) hit++; else miss++; }
  return { hit, miss };
}

/** A/A + unit-fault comparison on the shipped scoring path (H1, fleet-random K=30 blocks). */
export function compare(opts: { seeds?: number; nUnits?: number; T?: number; delta?: number; nFaulty?: number } = {}): {
  aa: { ebh: number; debh: number };
  power: { ebhRecall: number; debhRecall: number; ebhFalse: number; debhFalse: number };
} {
  const seeds = opts.seeds ?? 6, nUnits = opts.nUnits ?? 2016, T = opts.T ?? 320;
  const delta = opts.delta ?? 0.01, nFaulty = opts.nFaulty ?? 20, q = 0.05;
  const stride = Math.floor(nUnits / nFaulty);
  const faulty = new Set<number>(Array.from({ length: nFaulty }, (_, i) => i * stride));
  const tally = { aaE: 0, aaD: 0, hitE: 0, hitD: 0, falseE: 0, falseD: 0 };
  for (let s = 0; s < seeds; s++) {
    const panel = healthyPanel(HEALTHY_SCENARIOS.H1, 60601 + s * 419, nUnits, T);
    const aa = runArm(panel.scores, s, nUnits, T, q);
    tally.aaE += aa.eSel.length;
    tally.aaD += aa.dSel.length;
    const injected = panel.scores.map((row, u) => (faulty.has(u) ? row.map((v) => v * (1 + delta)) : row));
    const fa = runArm(injected, s, nUnits, T, q);
    const eh = splitHits(fa.eSel, faulty), dh = splitHits(fa.dSel, faulty);
    tally.hitE += eh.hit; tally.falseE += eh.miss;
    tally.hitD += dh.hit; tally.falseD += dh.miss;
  }
  return {
    aa: { ebh: tally.aaE / seeds, debh: tally.aaD / seeds },
    power: {
      ebhRecall: tally.hitE / (seeds * nFaulty), debhRecall: tally.hitD / (seeds * nFaulty),
      ebhFalse: tally.falseE / seeds, debhFalse: tally.falseD / seeds,
    },
  };
}

if (require.main === module) {
  const si = process.argv.indexOf('--seeds');
  const res = compare({ seeds: si >= 0 ? Number(process.argv[si + 1]) : 6 });
  console.log('A/A false selections/run:      e-BH', res.aa.ebh.toFixed(2), ' donation-e-BH', res.aa.debh.toFixed(2));
  console.log(`power (delta=1%, 20 faulty):   e-BH recall ${res.power.ebhRecall.toFixed(2)} false ${res.power.ebhFalse.toFixed(2)}   donation recall ${res.power.debhRecall.toFixed(2)} false ${res.power.debhFalse.toFixed(2)}`);
}
