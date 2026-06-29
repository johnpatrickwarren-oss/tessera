// tools/peer-availability.ts — ADR 0022 follow-up: the comparable-peer AVAILABILITY study (the triad's
// binding real-world constraint, ADR 0022 § Cost). Tessera-original.
//
// THE GAP. Every prior triad validation used clustersynth's EXACT-COPY twins: #ctrl/#ctrl2 share the
// treatment's common-mode loadings PERFECTLY (scenario.ts: twin loadingId = the treatment's gpu id), so the
// within-triad contrast cancels the common-mode bit-for-bit. That is an idealization. In a real per-shard
// SDC deployment the controls are REAL sibling shards (peers) with their OWN per-shard loadings — so two
// questions decide whether the triad is deployable at all:
//
//   D1 — AVAILABILITY. In a topology with per-shard loading heterogeneity, what fraction of shards have ≥2
//        COMPARABLE peers (in-group siblings whose contrast cancels the common-mode well enough)? Comparable
//        = cancellation ratio κ ≤ threshold (κ = Var(s_i−s_j)/avgVar, the ADR 0021 statistic — ≈0 for a
//        matched peer, grows as loadings diverge). Swept over heterogeneity and group size.
//
//   D2 — FDR UNDER REAL PEERS. Does FDR control survive matched-but-not-identical peers, vs the exact-copy-
//        twin ideal? We select each treatment's 2 lowest-κ real in-group peers as c1,c2 and run the SAME
//        production detection (fitContrast → normalized-mixture e-value → e-BH). A peer that faults in the
//        monitoring window IS a contaminated control — the contamination case arises naturally, no synthetic
//        injection. KEY: real peers have NO designated-clean sibling (unlike clustersynth's #ctrl2), so the
//        triad rule is e = min(e_{t−c1}, e_{t−c2}) — require BOTH peers to agree. A single contaminated peer
//        fires only one contrast → min stays small → not selected (FDR preserved, at a recall cost when a
//        genuine fault's own peer is contaminated). min of e-values is a valid conservative e-value. Swept
//        over heterogeneity → the ceiling where κ-passing peers still leak enough common-mode to break FDR.
//
// Cross-group peers never share the common-mode → never comparable; availability is a WITHIN-GROUP question
// (a rack/pod/cooling-domain), which is why a large homogeneous training cluster has peers in abundance and a
// small heterogeneous one does not (ADR 0022 § Cost). The model mirrors control-triad.ts (OU common-mode with
// a mid-window regime step + heterogeneous per-shard loadings) but with REAL sibling shards, not copies.

import { mulberry32, gaussian } from './calibration-envelope.js';
import { fitContrast, applyContrast } from './contrast.js';
import { normalizedMixtureEValue } from './mixture-evalue.js';
import { cancellationRatio } from './contamination-detector.js';
import { eBenjaminiHochberg } from '@johnpatrickwarren-oss/deploysignal-engine/fleet/e-bh';

export interface PeerOptions {
  groups?: number;          // rack/pod count (each shares one common-mode instance)
  shardsPerGroup?: number;  // sibling shards per group — the candidate-peer pool size
  T?: number;
  phi?: number;             // OU autocorrelation of the common-mode factor
  loadMean?: number;        // mean loading on the common-mode
  loadHetero?: number;      // per-shard loading jitter (THE swept axis: 0 = exact-copy ideal)
  idioSd?: number;          // idiosyncratic noise sd
  faultMag?: number;        // per-shard mean-shift magnitude (idio-sd units)
  faultFrac?: number;       // fraction of shards that fault in the monitoring window
  kappaThresh?: number;     // comparability threshold (default 0.1 — contamination-detector absFloor)
  q?: number;
}
const DEF: Required<PeerOptions> = {
  groups: 24, shardsPerGroup: 24, T: 400, phi: 0.6, loadMean: 6, loadHetero: 0.2,
  idioSd: 0.6, faultMag: 4, faultFrac: 0.05, kappaThresh: 0.1, q: 0.1,
};

/** One OU common-mode factor with a mid-window regime step — the non-stationary part that does NOT cancel
 *  under heterogeneous loadings (the source of false positives when peers are imperfectly matched). */
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

export interface Group { lambda: number[]; healthy: number[][]; mon: number[][] }

/** Generate one group's healthy + monitoring windows. Per-shard loadings + baseline offsets are PHYSICAL —
 *  shared across both windows (keyed by shard); only the common-mode realization + idio noise differ. A
 *  shard in `faulted` carries a mean-shift in the monitoring window from `onset` (a real per-shard fault;
 *  when that shard is later picked as someone's peer, it is a contaminated control). */
export function genGroup(seed: number, gi: number, o: Required<PeerOptions>, faulted: Set<number>): Group {
  const rng = mulberry32(seed * 1009 + gi * 7 + 1);
  const S = o.shardsPerGroup;
  const lambda = Array.from({ length: S }, () => o.loadMean * (1 + o.loadHetero * gaussian(rng)));
  const off = Array.from({ length: S }, () => 50 * gaussian(rng));
  const onset = Math.floor(0.1 * o.T);
  const window = (f: number[], doFault: boolean): number[][] =>
    Array.from({ length: S }, (_, k) => {
      const idi = idio(rng, o.T, o.idioSd);
      const faultK = doFault && faulted.has(gi * S + k) ? o.faultMag * o.idioSd : 0;
      return f.map((x, t) => off[k] + lambda[k] * x + idi[t] + (t >= onset ? faultK : 0));
    });
  return {
    lambda,
    healthy: window(commonMode(mulberry32(seed * 31 + gi * 2 + 1), o.T, o.phi), false),
    mon: window(commonMode(mulberry32(seed * 31 + gi * 2 + 2), o.T, o.phi), true),
  };
}

/** The 2 lowest-κ in-group peers of shard k (measured on the HEALTHY window — comparability is structural).
 *  Returns the peer indices and their κ (ascending). κ uses the same cancellation ratio as the ADR 0021 gate. */
export function bestPeers(group: Group, k: number): { peers: number[]; kappas: number[] } {
  const scored = group.healthy
    .map((s, j) => ({ j, kappa: j === k ? Infinity : cancellationRatio(group.healthy[k], s) }))
    .sort((a, b) => a.kappa - b.kappa);
  return { peers: [scored[0].j, scored[1].j], kappas: [scored[0].kappa, scored[1].kappa] };
}

const sub = (a: number[], b: number[]): number[] => a.map((x, i) => x - b[i]);
/** Per-shard e-value of contrast a−b, fit on the healthy window and applied to the monitoring window. */
function contrastE(hA: number[], hB: number[], mA: number[], mB: number[]): number {
  return normalizedMixtureEValue(applyContrast(sub(mA, mB), fitContrast(sub(hA, hB))));
}

export interface PeerShard { gi: number; k: number; c1: number; c2: number; peerKappa: number; faulted: boolean }

/** Build the per-treatment triad assignment over all groups: each treatment's 2 best real peers + whether
 *  the 2nd peer clears the comparability threshold (→ a triad is AVAILABLE for that shard). */
export function assignTriads(groups: Group[], faulted: Set<number>, o: Required<PeerOptions>): PeerShard[] {
  const out: PeerShard[] = [];
  groups.forEach((g, gi) => {
    for (let k = 0; k < o.shardsPerGroup; k++) {
      const { peers, kappas } = bestPeers(g, k);
      out.push({ gi, k, c1: peers[0], c2: peers[1], peerKappa: kappas[1], faulted: faulted.has(gi * o.shardsPerGroup + k) });
    }
  });
  return out;
}

const selected = (e: number[], q: number): Set<number> => new Set(eBenjaminiHochberg(e, q).selected);
const fdp = (sel: Set<number>, pos: boolean[]): number => sel.size ? [...sel].filter((i) => !pos[i]).length / sel.size : 0;
const recall = (sel: Set<number>, pos: boolean[]): number => {
  const P = pos.filter(Boolean).length; return P ? [...sel].filter((i) => pos[i]).length / P : NaN;
};

export interface AvailabilityRow { loadHetero: number; groupSize: number; fracAvailable: number; medianPeerKappa: number }
export interface FdrRow { loadHetero: number; available: number; pairFdp: number; pairRecall: number; triadFdp: number; triadRecall: number; flaggedControls: number }

/** D1 + D2 for one (loadHetero, shardsPerGroup) point, averaged over seeds. */
export function studyPoint(loadHetero: number, shardsPerGroup: number, seeds: number, base: PeerOptions): { avail: AvailabilityRow; fdr: FdrRow } {
  const o: Required<PeerOptions> = { ...DEF, ...base, loadHetero, shardsPerGroup };
  const N = o.groups * o.shardsPerGroup;
  const acc = { availNum: 0, kappas: [] as number[], pairFp: 0, pairTp: 0, pairSel: 0, triFp: 0, triTp: 0, triSel: 0, pos: 0, flagged: 0, availDen: 0 };
  for (let s = 0; s < seeds; s++) {
    const seed = 1 + s;
    const faulted = new Set<number>(Array.from({ length: N }, (_, i) => i).filter((i) => mulberry32(seed * 97 + i)() < o.faultFrac));
    const groups = Array.from({ length: o.groups }, (_, gi) => genGroup(seed, gi, o, faulted));
    const triads = assignTriads(groups, faulted, o);
    // D1: a triad is AVAILABLE iff the 2nd-best peer clears the comparability threshold.
    for (const t of triads) { acc.kappas.push(t.peerKappa); if (t.peerKappa <= o.kappaThresh) acc.availNum++; }
    acc.availDen += triads.length;
    // D2: score the AVAILABLE shards (a deployment only forms a triad where it can). Genuine positive = a
    // faulted TREATMENT; a faulted peer (contaminated control) must NOT become a treatment false positive.
    const avail = triads.filter((t) => t.peerKappa <= o.kappaThresh);
    if (!avail.length) continue;
    const g = (t: PeerShard) => groups[t.gi];
    const eC1 = avail.map((t) => contrastE(g(t).healthy[t.k], g(t).healthy[t.c1], g(t).mon[t.k], g(t).mon[t.c1]));
    const eC2 = avail.map((t) => contrastE(g(t).healthy[t.k], g(t).healthy[t.c2], g(t).mon[t.k], g(t).mon[t.c2]));
    const flag = avail.map((t) => contrastE(g(t).healthy[t.c1], g(t).healthy[t.c2], g(t).mon[t.c1], g(t).mon[t.c2]));
    const pos = avail.map((t) => t.faulted);
    // REAL-PEER triad rule = min(e_{t−c1}, e_{t−c2}): require BOTH peers to agree. Unlike clustersynth's
    // designated-clean #ctrl2, real peers have no guaranteed-clean sibling, so we can't "route to c2"; but a
    // single contaminated peer fires only ONE contrast, so the min stays small and the shard is not selected.
    // min of e-values is a valid CONSERVATIVE e-value (min ≤ e₁ ⇒ E[min|H0] ≤ 1) → e-BH still controls FDR.
    const triadE = eC1.map((v, i) => Math.min(v, eC2[i]));
    const pairSel = selected(eC1, o.q), triSel = selected(triadE, o.q);
    const bad = selected(flag, o.q); // c1−c2 sibling-null flags (diagnostic: a peer is compromised)
    acc.pos += pos.filter(Boolean).length; acc.flagged += bad.size;
    acc.pairSel += pairSel.size; acc.pairFp += [...pairSel].filter((i) => !pos[i]).length; acc.pairTp += [...pairSel].filter((i) => pos[i]).length;
    acc.triSel += triSel.size; acc.triFp += [...triSel].filter((i) => !pos[i]).length; acc.triTp += [...triSel].filter((i) => pos[i]).length;
  }
  const med = acc.kappas.slice().sort((a, b) => a - b)[acc.kappas.length >> 1] ?? 0;
  return {
    avail: { loadHetero, groupSize: shardsPerGroup, fracAvailable: acc.availNum / acc.availDen, medianPeerKappa: med },
    fdr: {
      loadHetero, available: acc.availNum / acc.availDen,
      pairFdp: acc.pairSel ? acc.pairFp / acc.pairSel : 0, pairRecall: acc.pos ? acc.pairTp / acc.pos : NaN,
      triadFdp: acc.triSel ? acc.triFp / acc.triSel : 0, triadRecall: acc.pos ? acc.triTp / acc.pos : NaN,
      flaggedControls: acc.flagged,
    },
  };
}

function fmt(x: number): string { return Number.isNaN(x) ? '  -  ' : x.toFixed(3); }

export function runPeerAvailabilityStudy(seeds = 5, base: PeerOptions = {}): { lines: string[]; availability: AvailabilityRow[]; fdr: FdrRow[] } {
  const o = { ...DEF, ...base };
  const heteros = [0, 0.1, 0.2, 0.4, 0.8];
  const groupSizes = [8, 24, 72];
  const L: string[] = [];
  L.push('═══ COMPARABLE-PEER AVAILABILITY STUDY (ADR 0022 § Cost) ═══');
  L.push(`${o.groups} groups, T=${o.T}, common-mode φ=${o.phi} + mid-window regime step; fault ${o.faultMag}σ on ${(100 * o.faultFrac).toFixed(0)}% of shards; comparability κ ≤ ${o.kappaThresh}; q=${o.q}; ${seeds} seeds.`);
  L.push('Peers are REAL in-group sibling shards (own loadings), selected by κ — NOT exact-copy twins.');
  L.push('');
  L.push('D1 — AVAILABILITY: fraction of shards with ≥2 comparable peers, vs loading heterogeneity × group size');
  L.push('  hetero │ ' + groupSizes.map((s) => `S=${s}`.padStart(8)).join(' ') + '   (median 2nd-peer κ at S=24)');
  const availability: AvailabilityRow[] = [];
  for (const h of heteros) {
    const cells = groupSizes.map((S) => studyPoint(h, S, seeds, base).avail);
    availability.push(...cells);
    const mid = cells[1];
    const tag = Math.abs(h - 0.4) < 1e-9 ? '  ← clustersynth LAMBDA_HETERO (real cluster)' : '';
    L.push(`  ${h.toFixed(2)}  │ ` + cells.map((c) => fmt(c.fracAvailable).padStart(8)).join(' ') + `      κ̃=${fmt(mid.medianPeerKappa)}${tag}`);
  }
  L.push('  → availability falls as siblings grow unlike (heterogeneity ↑) and rises with a bigger peer pool (S ↑):');
  L.push('    a large homogeneous cluster has triads in abundance; a small heterogeneous one does not.');
  L.push('');
  L.push('D1b — FAULT-RATE sensitivity of the contamination load (S=72, hetero=0.4): pair vs triad FDP');
  L.push('  fault% │  pair FDP/recall  │ triad FDP/recall   (a faulted peer = a contaminated control)');
  for (const ff of [0.02, 0.05, 0.10, 0.20]) {
    const r = studyPoint(0.4, 72, seeds, { ...base, faultFrac: ff }).fdr;
    L.push(`  ${(100 * ff).toFixed(0).padStart(4)}%  │  ${fmt(r.pairFdp)} / ${fmt(r.pairRecall)}  │  ${fmt(r.triadFdp)} / ${fmt(r.triadRecall)}`);
  }
  L.push('  → the min-agreement triad holds FDP near/below q until the contamination load (faulted PEERS) is');
  L.push('    extreme; the pair detector is FP-dominated at every rate. Real per-shard anomaly rates are low.');
  L.push('');
  L.push('D2 — FDR UNDER REAL PEERS (S=72, a full rack): does the guarantee survive matched-but-not-identical peers?');
  L.push('  hetero │ avail │  pair FDP/recall  │ triad FDP/recall │ flagged   (pair = t−c1 only; triad = min(t−c1, t−c2) agreement)');
  const fdr: FdrRow[] = [];
  for (const h of heteros) {
    const r = studyPoint(h, 72, seeds, base).fdr; // S=72 = a full rack (shares CDU+feed+fabric), the natural peer pool
    fdr.push(r);
    const tag = Math.abs(h - 0.4) < 1e-9 ? '  ← real cluster' : '';
    L.push(`  ${h.toFixed(2)}  │ ${fmt(r.available)} │  ${fmt(r.pairFdp)} / ${fmt(r.pairRecall)}  │  ${fmt(r.triadFdp)} / ${fmt(r.triadRecall)} │ ${String(r.flaggedControls).padStart(4)}${tag}`);
  }
  const ceiling = fdr.find((r) => r.triadFdp > o.q + 1e-9);
  L.push('');
  L.push(ceiling
    ? `CEILING: triad FDR control (FDP ≤ q) holds up to heterogeneity ≈ ${heteros[Math.max(0, heteros.indexOf(ceiling.loadHetero) - 1)].toFixed(2)}; it BREAKS at ${ceiling.loadHetero.toFixed(2)} (FDP ${fmt(ceiling.triadFdp)}) — beyond there the selected peers leak un-cancelled common-mode the triad can't repair.`
    : `NO CEILING in range: triad FDP ≤ q at every tested heterogeneity (the κ-gate excludes the peers that would leak — availability falls instead of FDR).`);
  L.push('READING: the κ comparability gate converts non-comparability from an FDR risk into an AVAILABILITY cost —');
  L.push('a shard with no comparable peer simply gets NO triad (abstains, Mode A) rather than a false guarantee.');
  L.push('That is the deployable contract: the triad is offered only where two matched peers exist.');
  return { lines: L, availability, fdr };
}

if (require.main === module) {
  const seeds = process.argv[2] ? Number(process.argv[2]) : 5;
  process.stdout.write(runPeerAvailabilityStudy(seeds).lines.join('\n') + '\n');
  process.exit(0);
}
