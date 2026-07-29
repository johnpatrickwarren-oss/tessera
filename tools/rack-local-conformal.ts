// tools/rack-local-conformal.ts — PROTOTYPE: rack-local conformal blocks as a dispersion-immune
// construction (the positive alternative to the pair gate's abstention).
//
// THE IDEA. The dispersion channel that breaks e-BH (a2-disp-ebh, N12) is a PER-RACK noise
// multiplier λ shared by all GPUS_PER_RACK units and persistent across the run
// (`rackNoiseMult[r]`, drawn once). Fleet-random blocks compare a high-λ unit against mostly
// other-rack peers, so it out-ranks its block round after round and the accumulator finances a
// crossing from HEALTHY units. If instead every conformal block is drawn WITHIN one rack, all
// K+1 members share the same λ — the multiplier cancels, and the per-round rank is exactly
// uniform under within-rack exchangeability. The premise the Lean-proved rank e-value needs is
// WEAKENED from fleet-level to rack-level exchangeability, which the dispersion channel satisfies
// BY CONSTRUCTION. The location channel (per-unit offsets, ICC/θ) is untouched: the ICC half of
// the pair gate still binds; the ς half becomes unnecessary for unit-level selection validity.
//
// THE COST, STATED UP FRONT. (a) Rack-level faults become invisible to this channel — a whole
// rack degrading together cancels out of every within-rack comparison. That scope loss is real
// and must stay disclosed: rack-level detection needs a separate rack-vs-fleet channel, which
// faces the SAME dispersion problem one level up (rack-λ dispersion across racks) and therefore
// still needs the gate. (b) Power against unit faults in a high-λ rack is measured against that
// rack's inflated σ — per-rack power varies where fleet-random blocks average it.
//
// WHAT THIS HARNESS MEASURES (both arms on IDENTICAL panels):
//   1. A/A validity under dispersion — false pages + false e-BH selections at ς̂ up to 0.61,
//      fleet-random K=30 (the shipped path) vs rack-local. Expectation: rack-local ≈ clean.
//   2. A/B power on unit-level faults — recall of δ-degraded units at T, both arms, knob 0 and
//      knob 1.0. Expectation: comparable recall at knob 0; rack-local no worse under dispersion.
//
// SHIPPED PRIMITIVES ONLY: conformalP → calibrator → ½/½ accumulator → eBhSelect, identical to
// horizon-experiment's scoreRound except for block formation.
//
// Run: `pnpm build && node tools/rack-local-conformal.js [--seeds 4] [--json out.json]`

import {
  conformalP, calibrator, onsetUpdate, combinedEValue, eBhSelect,
  healthyScorePanel, GPUS_PER_RACK,
} from './canary-sim.js';
import { dispKnobs } from './dispersion-ebh-boundary.js';
import { measureVarsigma } from './dispersion-ebh-boundary.js';
import type { FleetState } from './horizon-experiment.js';
import { scoreRound } from './horizon-experiment.js';

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

/** A panel that keeps the rack identity of every row (healthyPanel discards `units`). */
export function panelWithRacks(heteroRackSd: number, seed: number, nUnits: number, nRounds: number): {
  scores: number[][]; rackOf: Int32Array; nRacks: number;
} {
  const knobs = dispKnobs(heteroRackSd);
  const { scores, units } = healthyScorePanel(knobs, { nUnits, nRounds, hoursBetween: 132, seed });
  const rackIds = units.map((g) => Math.floor(g / GPUS_PER_RACK));
  const dense = new Map<number, number>();
  for (const rid of rackIds) if (!dense.has(rid)) dense.set(rid, dense.size);
  const rackOf = new Int32Array(nUnits);
  for (let i = 0; i < nUnits; i++) rackOf[i] = dense.get(rackIds[i])!;
  return { scores, rackOf, nRacks: dense.size };
}

/** scoreRound with blocks drawn WITHIN racks: shuffle each rack's members, partition into blocks
 *  of K+1, leftovers (rack size mod K+1) sit the round out — same leftover rule as the fleet-
 *  random path, applied per rack. */
export function scoreRoundRackLocal(
  r: () => number, scores: ReadonlyArray<ReadonlyArray<number>>, t: number, K: number,
  rackOf: Int32Array, nRacks: number, st: FleetState, alphaPage: number,
): void {
  const nUnits = st.prod.length;
  const byRack: number[][] = Array.from({ length: nRacks }, () => []);
  for (let u = 0; u < nUnits; u++) byRack[rackOf[u]].push(u);
  for (const members of byRack) {
    for (let i = members.length - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1)); [members[i], members[j]] = [members[j], members[i]];
    }
    for (let b = 0; b + K + 1 <= members.length; b += K + 1) {
      const block = members.slice(b, b + K + 1);
      const blockScores = block.map((u) => scores[u][t]);
      for (let mi = 0; mi < block.length; mi++) {
        const u = block[mi];
        const peers = blockScores.filter((_, i2) => i2 !== mi);
        const p = conformalP(blockScores[mi], peers, r());
        const f = calibrator(p);
        st.prod[u] = Math.min(E_CAP, st.prod[u] * f);
        st.g[u] = Math.min(E_CAP, onsetUpdate(st.g[u], st.k[u], f));
        st.k[u] += 1;
        st.cur[u] = combinedEValue(st.prod[u], st.g[u], st.k[u]);
        if (st.cur[u] >= 1 / alphaPage) st.paged[u] = 1;
      }
    }
  }
}

function freshState(nUnits: number): FleetState {
  return {
    prod: new Float64Array(nUnits).fill(1), g: new Float64Array(nUnits), k: new Int32Array(nUnits),
    cur: new Float64Array(nUnits).fill(1), paged: new Uint8Array(nUnits),
  };
}

export interface ArmResult { pagesPerRun: number; selPerRun: number; firstSelRounds: number[] }
export interface AAValidityRow {
  knob: number; varsigmaHat: number;
  fleetRandom: ArmResult; rackLocal: ArmResult;
}

/** A/A: both arms on identical panels; every page/selection is false. */
export function aaValidity(
  knob: number, opts: { seeds?: number; nUnits?: number; K?: number; Krack?: number; T?: number } = {},
): AAValidityRow {
  const seeds = opts.seeds ?? 4, nUnits = opts.nUnits ?? 2016, T = opts.T ?? 320;
  const K = opts.K ?? 30, Krack = opts.Krack ?? 23; // 23 → three blocks of 24 per 72-GPU rack
  const alphaPage = 0.001, q = 0.05;
  const arms: Record<'fleetRandom' | 'rackLocal', { pages: number; sel: number; first: number[] }> = {
    fleetRandom: { pages: 0, sel: 0, first: [] }, rackLocal: { pages: 0, sel: 0, first: [] },
  };
  for (let s = 0; s < seeds; s++) {
    const { scores, rackOf, nRacks } = panelWithRacks(knob, 60601 + s * 419, nUnits, T);
    for (const arm of ['fleetRandom', 'rackLocal'] as const) {
      const st = freshState(nUnits);
      const r = rng(880301 + s * 9377);
      let first = Infinity;
      for (let t = 0; t < T; t++) {
        if (arm === 'fleetRandom') scoreRound(r, scores, t, K, st, alphaPage, undefined);
        else scoreRoundRackLocal(r, scores, t, Krack, rackOf, nRacks, st, alphaPage);
        const nSel = eBhSelect(Array.from(st.cur), q).length;
        if (nSel > 0 && !Number.isFinite(first)) first = t + 1;
        if (t === T - 1) {
          let pages = 0;
          for (let u = 0; u < nUnits; u++) pages += st.paged[u];
          arms[arm].pages += pages; arms[arm].sel += nSel;
        }
      }
      arms[arm].first.push(first);
    }
  }
  const pack = (a: { pages: number; sel: number; first: number[] }): ArmResult =>
    ({ pagesPerRun: a.pages / seeds, selPerRun: a.sel / seeds, firstSelRounds: a.first });
  return {
    knob, varsigmaHat: measureVarsigma(dispKnobs(knob)),
    fleetRandom: pack(arms.fleetRandom), rackLocal: pack(arms.rackLocal),
  };
}

export interface PowerRow {
  knob: number; delta: number;
  fleetRandom: { recall: number; falseSel: number }; rackLocal: { recall: number; falseSel: number };
}

/** A/B: nFaulty units (spread over racks) degraded by ×(1+δ) from t=0; recall = fraction of
 *  faulty units e-BH-selected at T; falseSel = healthy units selected. */
export function abPower(
  knob: number, delta: number,
  opts: { seeds?: number; nUnits?: number; K?: number; Krack?: number; T?: number; nFaulty?: number } = {},
): PowerRow {
  const seeds = opts.seeds ?? 4, nUnits = opts.nUnits ?? 2016, T = opts.T ?? 320;
  const K = opts.K ?? 30, Krack = opts.Krack ?? 23, nFaulty = opts.nFaulty ?? 20;
  const alphaPage = 0.001, q = 0.05;
  const tally = {
    fleetRandom: { hit: 0, falseSel: 0 }, rackLocal: { hit: 0, falseSel: 0 },
  };
  for (let s = 0; s < seeds; s++) {
    const { scores, rackOf, nRacks } = panelWithRacks(knob, 60601 + s * 419, nUnits, T);
    // Faulty units: evenly strided so they land in distinct racks where possible.
    const faulty = new Set<number>();
    const stride = Math.floor(nUnits / nFaulty);
    for (let i = 0; i < nFaulty; i++) faulty.add(i * stride);
    const injected = scores.map((row, u) => (faulty.has(u) ? row.map((v) => v * (1 + delta)) : row));
    for (const arm of ['fleetRandom', 'rackLocal'] as const) {
      const st = freshState(nUnits);
      const r = rng(880301 + s * 9377);
      for (let t = 0; t < T; t++) {
        if (arm === 'fleetRandom') scoreRound(r, injected, t, K, st, alphaPage, undefined);
        else scoreRoundRackLocal(r, injected, t, Krack, rackOf, nRacks, st, alphaPage);
      }
      const sel = eBhSelect(Array.from(st.cur), q);
      for (const u of sel) { if (faulty.has(u)) tally[arm].hit++; else tally[arm].falseSel++; }
    }
  }
  return {
    knob, delta,
    fleetRandom: { recall: tally.fleetRandom.hit / (seeds * nFaulty), falseSel: tally.fleetRandom.falseSel / seeds },
    rackLocal: { recall: tally.rackLocal.hit / (seeds * nFaulty), falseSel: tally.rackLocal.falseSel / seeds },
  };
}

// ── within-rack channel horizon (grounds the rack-scope gate thresholds) ─────
//
// Rack-local blocks cancel RACK-shared λ; per-unit λ spread WITHIN racks is the construction's
// remaining dispersion premise, and it accumulates with T exactly like the fleet channel did.
// The shipped substrate has no within-rack ς knob (rackNoiseMult is per-rack), so this panel is
// HAND-BUILT — iid unit multipliers λ_u = exp(ς·g_u) on Gaussian scores — while every scoring
// primitive (conformalP → calibrator → ½/½ accumulator → eBhSelect via scoreRoundRackLocal) is
// the shipped code. Departure from the healthyScorePanel convention: flagged here and in the
// research note; the estimand is the accumulator's first-passage response, which depends on the
// rank distribution the λ spread induces, not on the substrate's other channels (they are
// rack-level or round-common and cancel within-rack).

export interface WithinRackHorizonRow {
  varsigmaWithin: number;
  /** per-seed first round (1-based) with ≥1 false e-BH selection; Infinity = never within maxT. */
  firstSelRounds: number[];
  falsePagesAtMaxT: number;
  villeBudget: number;
}

export function withinRackHorizon(
  varsigmaWithin: number,
  opts: { seeds?: number; nUnits?: number; Krack?: number; maxT?: number } = {},
): WithinRackHorizonRow {
  const seeds = opts.seeds ?? 6, nUnits = opts.nUnits ?? 2016, Krack = opts.Krack ?? 71;
  const maxT = opts.maxT ?? 2560;
  const alphaPage = 0.001, q = 0.05;
  const nRacks = Math.ceil(nUnits / 72);
  const rackOf = new Int32Array(nUnits);
  for (let u = 0; u < nUnits; u++) rackOf[u] = Math.floor(u / 72);
  const firstSelRounds: number[] = [];
  let pages = 0;
  for (let s = 0; s < seeds; s++) {
    const r = rng(70601 + s * 613);
    const norm = (): number => {
      const u1 = Math.max(r(), 1e-12), u2 = r();
      return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    };
    const lambda = Array.from({ length: nUnits }, () => Math.exp(varsigmaWithin * norm()));
    const scores: number[][] = Array.from({ length: nUnits }, (_, u) =>
      Array.from({ length: maxT }, () => lambda[u] * norm()));
    const st = freshState(nUnits);
    const rs = rng(880301 + s * 9377);
    let first = Infinity;
    for (let t = 0; t < maxT; t++) {
      scoreRoundRackLocal(rs, scores, t, Krack, rackOf, nRacks, st, alphaPage);
      if (!Number.isFinite(first) && eBhSelect(Array.from(st.cur), q).length > 0) first = t + 1;
    }
    firstSelRounds.push(first);
    for (let u = 0; u < nUnits; u++) pages += st.paged[u];
  }
  return { varsigmaWithin, firstSelRounds, falsePagesAtMaxT: pages / seeds, villeBudget: nUnits * alphaPage };
}

// ─────────────────────────────────────────────────────────────────────────────

const f2 = (x: number): string => x.toFixed(2);

export function report(seeds: number): { lines: string[]; data: Record<string, unknown> } {
  const L: string[] = [];
  L.push('rack-local conformal — dispersion-immunity prototype (both arms on IDENTICAL panels)');
  L.push('');
  L.push('A/A validity (every page/selection FALSE; N=2016, T=320, fleet-random K=30 vs rack-local K=23):');
  L.push('  knob   ς̂       fleet: sel/run pages/run firstSel      rack-local: sel/run pages/run firstSel');
  const aa = [0, 0.5, 0.7, 1.0].map((k) => aaValidity(k, { seeds }));
  const ff = (xs: number[]): string => {
    const f = xs.filter(Number.isFinite);
    return f.length ? (f.reduce((a, b) => a + b, 0) / f.length).toFixed(0) : '∞';
  };
  for (const r of aa) {
    L.push(`  ${String(r.knob).padEnd(5)} ${r.varsigmaHat.toFixed(3)}   ${f2(r.fleetRandom.selPerRun).padStart(8)} ${f2(r.fleetRandom.pagesPerRun).padStart(9)} ${ff(r.fleetRandom.firstSelRounds).padStart(8)}        ${f2(r.rackLocal.selPerRun).padStart(8)} ${f2(r.rackLocal.pagesPerRun).padStart(9)} ${ff(r.rackLocal.firstSelRounds).padStart(8)}`);
  }
  L.push('');
  L.push('A/B power (20 faulty units ×(1+δ) from t=0; recall at T=320 | false selections):');
  L.push('  knob   δ       fleet: recall falseSel      rack-local: recall falseSel');
  const ab: PowerRow[] = [];
  for (const knob of [0, 1.0]) for (const d of [0.01, 0.02, 0.05]) {
    const r = abPower(knob, d, { seeds });
    ab.push(r);
    L.push(`  ${String(knob).padEnd(5)} ${d.toFixed(2)}   ${f2(r.fleetRandom.recall).padStart(10)} ${f2(r.fleetRandom.falseSel).padStart(8)}        ${f2(r.rackLocal.recall).padStart(10)} ${f2(r.rackLocal.falseSel).padStart(8)}`);
  }
  return { lines: L, data: { aa, ab } };
}

if (require.main === module) {
  const si = process.argv.indexOf('--seeds');
  const { lines, data } = report(si >= 0 ? Number(process.argv[si + 1]) : 4);
  for (const l of lines) console.log(l);
  const i = process.argv.indexOf('--json');
  if (i >= 0 && process.argv[i + 1]) {
    require('fs').writeFileSync(process.argv[i + 1], JSON.stringify(data, null, 2));
    console.log(`\nwrote ${process.argv[i + 1]}`);
  }
}
