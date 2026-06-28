// tools/control-triad.ts — PROTOTYPE of the control-triad construction (ADR 0021 § Follow-ups → ADR 0022
// candidate). Question: does a SECOND independent control twin recover what the twin-PAIR detector (ADR 0021)
// could not — contamination detection + the sign-blind false-positive — given heterogeneous loadings?
//
// THE IDEA. Two matched control twins c1, c2 per treatment t: all three share the treatment's common-mode
// loadings (so the within-triad contrast cancels the common-mode EXACTLY), with independent idiosyncratic
// noise; the controls are never faulted. Then c1 − c2 is a MATCHED control-vs-control null — the clean
// per-control reference the heterogeneous cohort (ADR 0012/0015 wall) could not give:
//   • CONTAMINATION: if a fault reaches one control, c1 − c2 fires against the healthy sibling → detected.
//   • SIGN-BLIND FALSE POSITIVE: a control-only fault makes the pair t − c1 fire (treatment is healthy).
//     The triad disambiguates — c1 − c2 flags c1 as the culprit, and t − c2 (the clean sibling) does NOT
//     fire → the treatment is correctly judged healthy. No false positive.
//
// This prototype generates synthetic triads with HETEROGENEOUS per-shard loadings + an OU/regime common
// mode (mirroring clustersynth), and compares the triad null against the cohort null on exactly the cases
// the pair detector failed. Synthetic ground truth → it answers "is the triad worth a full build", not a
// production claim. Tessera-original.

import { mulberry32, gaussian } from './calibration-envelope.js';
import { fitContrast, applyContrast, median } from './contrast.js';
import { normalizedMixtureEValue } from './mixture-evalue.js';
import { eBenjaminiHochberg } from '@johnpatrickwarren-oss/deploysignal-engine/fleet/e-bh';

export interface TriadOptions {
  nShards?: number; T?: number;
  phi?: number;            // OU autocorrelation of the common-mode factor
  loadMean?: number;       // mean loading on the common-mode
  loadHetero?: number;     // per-shard loading jitter (the heterogeneity that defeats the cohort)
  idioSd?: number;         // idiosyncratic noise sd
  faultMag?: number;       // mean-shift magnitude (in idio-sd units) for treatment faults / contamination
}
const DEF: Required<TriadOptions> = { nShards: 200, T: 400, phi: 0.6, loadMean: 6, loadHetero: 0.4, idioSd: 0.6, faultMag: 4 };

/** One OU common-mode factor with a mid-window regime step (the non-stationary part that doesn't cancel
 *  under heterogeneous loadings — the source of the pair detector's false positives). */
function commonMode(rng: () => number, T: number, phi: number): number[] {
  const f: number[] = []; let x = gaussian(rng);
  const innov = Math.sqrt(1 - phi * phi);
  const tStar = Math.floor(0.5 * T), step = 2.5;
  for (let t = 0; t < T; t++) { x = phi * x + innov * gaussian(rng); f.push(x + (t >= tStar ? step : 0)); }
  return f;
}

/** OU idiosyncratic noise (fast → ~white at this cadence). */
function idio(rng: () => number, T: number, sd: number): number[] {
  const out: number[] = []; let x = sd * gaussian(rng);
  for (let t = 0; t < T; t++) { x = 0.2 * x + sd * Math.sqrt(1 - 0.04) * gaussian(rng); out.push(x); }
  return out;
}

export interface TriadShard { t: number[]; c1: number[]; c2: number[]; }
export interface TriadBundle { shards: TriadShard[]; }

/** Generate healthy + monitoring triad bundles. `treatmentFaults` and `controlContam` are shard-index sets:
 *  a treatment fault is a mean-shift on t (the real per-shard fault to find); a control contamination is a
 *  mean-shift on c1 (treatment stays healthy → the sign-blind false-positive case). Faults are in the
 *  monitoring window only; the healthy bundle is clean (the fit feed). */
export function genTriads(seed: number, opts: TriadOptions, treatmentFaults: Set<number>, controlContam: Set<number>): { healthy: TriadBundle; mon: TriadBundle } {
  const o = { ...DEF, ...opts };
  const rng = mulberry32(seed);
  // per-shard loadings + per-member baseline offsets are PHYSICAL — SHARED across the healthy and monitoring
  // windows (keyed by shard/member, as clustersynth keys them by (seed,shard,counter)); only the common-mode
  // realization and the idiosyncratic noise differ between the two windows. The fit's center then removes the
  // (shared) offset consistently — without this the contrast carries a spurious constant shift everywhere.
  const lambda = Array.from({ length: o.nShards }, () => o.loadMean * (1 + o.loadHetero * gaussian(rng)));
  const off = Array.from({ length: o.nShards }, () => ({ t: 50 * gaussian(rng), c1: 50 * gaussian(rng), c2: 50 * gaussian(rng) }));
  const onset = Math.floor(0.1 * o.T);
  const window = (f: number[], faulted: Set<number>, contam: Set<number>): TriadBundle => ({
    shards: Array.from({ length: o.nShards }, (_, k) => {
      const it = idio(rng, o.T, o.idioSd), i1 = idio(rng, o.T, o.idioSd), i2 = idio(rng, o.T, o.idioSd);
      const fT = (t: number) => faulted.has(k) && t >= onset ? o.faultMag * o.idioSd : 0;
      const fC = (t: number) => contam.has(k) && t >= onset ? o.faultMag * o.idioSd : 0;
      return {
        t: f.map((x, t) => off[k].t + lambda[k] * x + it[t] + fT(t)),
        c1: f.map((x, t) => off[k].c1 + lambda[k] * x + i1[t] + fC(t)),
        c2: f.map((x, t) => off[k].c2 + lambda[k] * x + i2[t]),
      };
    }),
  });
  const healthy = window(commonMode(mulberry32(seed * 7 + 1), o.T, o.phi), new Set(), new Set());
  const mon = window(commonMode(mulberry32(seed * 7 + 2), o.T, o.phi), treatmentFaults, controlContam);
  return { healthy, mon };
}

const sub = (a: number[], b: number[]): number[] => a.map((x, i) => x - b[i]);

/** Per-shard e-value of contrast `pick(mon) ` standardized by the fit of `pick(healthy)` — the Mode B object. */
function contrastEValues(healthy: TriadBundle, mon: TriadBundle, pick: (s: TriadShard) => number[], pickCtl: (s: TriadShard) => number[]): number[] {
  return healthy.shards.map((hs, k) => {
    const fit = fitContrast(sub(pick(hs), pickCtl(hs)));
    return normalizedMixtureEValue(applyContrast(sub(pick(mon.shards[k]), pickCtl(mon.shards[k])), fit));
  });
}

/** Cohort contamination e-value for c1: c1 − cross-shard median(c1), standardized on the healthy window. */
function cohortContamEValues(healthy: TriadBundle, mon: TriadBundle): number[] {
  const T = healthy.shards[0].c1.length, Tm = mon.shards[0].c1.length;
  const medH = Array.from({ length: T }, (_, t) => median(healthy.shards.map((s) => s.c1[t])));
  const medM = Array.from({ length: Tm }, (_, t) => median(mon.shards.map((s) => s.c1[t])));
  return healthy.shards.map((hs, k) => {
    const fit = fitContrast(hs.c1.map((x, t) => x - medH[t]));
    return normalizedMixtureEValue(applyContrast(mon.shards[k].c1.map((x, t) => x - medM[t]), fit));
  });
}

const selected = (e: number[], q: number): Set<number> => new Set(eBenjaminiHochberg(e, q).selected);
const fdp = (sel: Set<number>, pos: Set<number>): number => sel.size ? [...sel].filter((i) => !pos.has(i)).length / sel.size : 0;
const recall = (sel: Set<number>, pos: Set<number>): number => pos.size ? [...sel].filter((i) => pos.has(i)).length / pos.size : NaN;

export interface TriadReport { lines: string[]; exp1: { triadFdp: number; triadRecall: number; cohortFdp: number; cohortRecall: number }; exp2: { pairFdp: number; pairRecall: number; triadFdp: number; triadRecall: number } }

export function runTriadExperiments(seed = 1, q = 0.1, opts: TriadOptions = {}): TriadReport {
  const o = { ...DEF, ...opts };
  const idxs = Array.from({ length: o.nShards }, (_, i) => i);
  const pick = (frac: number, salt: number) => new Set(idxs.filter((i) => mulberry32(seed * 131 + salt + i)() < frac));

  // ── EXPERIMENT 1: detect a contaminated CONTROL — triad (c1−c2) vs cohort (c1−median) ──
  const contam1 = pick(0.2, 1);
  const b1 = genTriads(seed, o, new Set(), contam1);
  const triadE = contrastEValues(b1.healthy, b1.mon, (s) => s.c1, (s) => s.c2);
  const cohortE = cohortContamEValues(b1.healthy, b1.mon);
  const triadSel = selected(triadE, q), cohortSel = selected(cohortE, q);
  const exp1 = { triadFdp: fdp(triadSel, contam1), triadRecall: recall(triadSel, contam1), cohortFdp: fdp(cohortSel, contam1), cohortRecall: recall(cohortSel, contam1) };

  // ── EXPERIMENT 2: control-only contamination → does the pair false-fire where the triad does not? ──
  const tFaults = pick(0.15, 2);
  const cContam = new Set([...pick(0.15, 3)].filter((i) => !tFaults.has(i))); // contaminate DIFFERENT, healthy-treatment shards
  const b2 = genTriads(seed, o, tFaults, cContam);
  // pair detector (Mode B today): t − c1. Fires on real treatment faults AND on contaminated-control shards (FP).
  const pairE = contrastEValues(b2.healthy, b2.mon, (s) => s.t, (s) => s.c1);
  const pairSel = selected(pairE, q);
  // triad-protected: flag bad controls via c1−c2; for flagged shards use t − c2 (clean sibling), else t − c1.
  const flagE = contrastEValues(b2.healthy, b2.mon, (s) => s.c1, (s) => s.c2);
  const badControl = selected(flagE, q);
  const tE_c1 = pairE, tE_c2 = contrastEValues(b2.healthy, b2.mon, (s) => s.t, (s) => s.c2);
  const protectedE = idxs.map((i) => (badControl.has(i) ? tE_c2[i] : tE_c1[i]));
  const protSel = selected(protectedE, q);
  const exp2 = { pairFdp: fdp(pairSel, tFaults), pairRecall: recall(pairSel, tFaults), triadFdp: fdp(protSel, tFaults), triadRecall: recall(protSel, tFaults) };

  const f = (x: number) => Number.isNaN(x) ? '  -  ' : x.toFixed(3);
  const L: string[] = [];
  L.push('═══ CONTROL-TRIAD PROTOTYPE — does a second control twin recover ADR 0021? ═══');
  L.push(`${o.nShards} shards × T=${o.T}; heterogeneous loadings (mean ${o.loadMean}, jitter ${o.loadHetero}); q=${q}; fault ${o.faultMag}σ.`);
  L.push('');
  L.push('EXPERIMENT 1 — detect a CONTAMINATED CONTROL (20% of controls faulted):');
  L.push(`  triad  (c1 − c2, matched sibling) : FDP ${f(exp1.triadFdp)}  recall ${f(exp1.triadRecall)}  selected ${triadSel.size}`);
  L.push(`  cohort (c1 − cross-shard median)  : FDP ${f(exp1.cohortFdp)}  recall ${f(exp1.cohortRecall)}  selected ${cohortSel.size}`);
  L.push('  → the triad sibling is a CLEAN per-control null (heterogeneous loadings cancel); the cohort is not.');
  L.push('');
  L.push('EXPERIMENT 2 — control-only contamination → sign-blind FALSE POSITIVE (treatment faults 15% + separate control contam 15%):');
  L.push(`  pair  (t − c1, Mode B today)      : FDP ${f(exp2.pairFdp)}  recall ${f(exp2.pairRecall)}  (FP from contaminated controls)`);
  L.push(`  triad (flag c1 via c1−c2 → use c2): FDP ${f(exp2.triadFdp)}  recall ${f(exp2.triadRecall)}  (clean sibling avoids the FP)`);
  L.push('');
  const worth = exp1.triadFdp <= q + 1e-9 && exp1.triadRecall > 0.8 && exp2.triadFdp < exp2.pairFdp - 0.05;
  L.push(worth
    ? 'VERDICT: the triad RECOVERS both ADR 0021 failure modes the pair detector could not → worth a full ADR 0022.'
    : 'VERDICT: the triad does NOT clearly recover the failure modes → reconsider before a full build.');
  return { lines: L, exp1, exp2 };
}

if (require.main === module) {
  const seed = process.argv[2] ? Number(process.argv[2]) : 1;
  process.stdout.write(runTriadExperiments(seed).lines.join('\n') + '\n');
  process.exit(0);
}
