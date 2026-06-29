// tools/supfdr.ts — FDR-AT-ALL-TIMES (SupFDR) for the fleet layer (Fleet Multiplicity).
//
// THE PROBLEM. The engine's e-BH (fleet/e-bh.ts) controls FDR at ONE fixed time on valid
// per-shard e-values. But Tessera monitors a fleet CONTINUOUSLY: each shard emits a running
// e-process E^i_t (e.g. the e-detector M^i_t of tools/e-detector.ts, or a sequentialized UI
// e-value), and an operator may read the e-BH selection at ANY time t — and will naturally watch
// each shard's RUNNING MAXIMUM (peak evidence so far). The relevant guarantee is then SupFDR =
// E[ sup_t FDP(R_t) ] ≤ q (FDR controlled simultaneously at all times), not FDR at a single t.
//
// THE NAIVE APPROACH HAS NO GUARANTEE. Feeding the per-shard RUNNING MAXIMA  S^i_t = sup_{s≤t} E^i_s
// into e-BH does NOT control SupFDR: the running max of an e-process is NOT itself a valid e-value
// (E[sup_s E^i_s] can exceed 1 — Ville only bounds its TAIL, P(sup ≥ x) ≤ 1/x). e-BH on these
// inflated "e-values" carries no all-times FDR theorem (Tavyrikov–Goeman–de Heide "Carefree",
// arXiv:2501.19360). HONEST CALIBRATION (test/supfdr.test.ts): under INDEPENDENCE Ville keeps the
// naive empirical SupFDR right at the q boundary (≈q, converging to ≈0.96q at large sample) — so the
// failure is not a dramatic empirical leak here but the ABSENCE OF A GUARANTEE; it leaks under
// dependence / adversarial timing, which the adjuster below provably survives.
//
// THE FIX — AN ADJUSTER. An *adjuster* A turns a running-max e-process into a valid all-times
// e-value. A: [1,∞) → [0,∞) increasing with A(∞)=∞ and ∫_1^∞ A(e)/e² de ≤ 1. The canonical choice
//   A(E) = √E − 1   (clamped to 0 for E < 1)
// satisfies ∫_1^∞ (√E−1)/E² dE = 1 EXACTLY. Then, by Ville (P(sup_s E^i_s ≥ x) ≤ 1/x for an
// e-process E^i),
//   E[ A(sup_s E^i_s) ] = ∫_1^∞ A'(x) P(sup ≥ x) dx ≤ ∫_1^∞ A'(x)/x dx = 1,
// so A(S^i_t) is a VALID e-value at every t. Running e-BH on { A(S^i_t) }_i therefore controls FDR
// at all times: SupFDR ≤ q under ARBITRARY dependence across shards (Carefree Thm 1, FDR-sup ≤
// K0·α/K). Because S^i_t is nondecreasing in t, so is A(S^i_t): selections are ACCEPT-TO-REJECT
// MONOTONE — once a shard is flagged it stays eligible (the "upgrade a shard later" property), the
// behaviour you want for a live console. Cost: A(E)=√E−1 shrinks the evidence (√ vs identity), an
// "appreciable but unquantified" POWER penalty (Carefree) — measured here (test/supfdr.test.ts).
//
// SCOPE. This implements the ADJUSTER route (self-contained, exact integral). The donation /
// online-closure e-LOND route (Xu–Fischer–Ramdas, arXiv:2603.24792) also controls SupFDR and can
// be tighter, but needs α-investing bookkeeping; left as a flagged follow-up (decisions/ note).
// The adjuster is provenance-agnostic — it does NOT touch per-stream validity (Wall A); it assumes
// each E^i is a genuine e-process. Compose it ABOVE the e-detector + a Wall-A-valid increment.
//
// Tessera-original; NOT vendored. Prototype; durable home is the engine fleet/ layer if adopted.

import { eBenjaminiHochberg, type EBenjaminiHochbergOutput } from '@johnpatrickwarren-oss/deploysignal-engine/fleet/e-bh';

/** The √E − 1 adjuster (clamped to 0 below E = 1). Maps a running-max e-process value to a valid
 *  all-times e-value. ∫_1^∞ A(e)/e² de = 1 exactly (see test/supfdr.test.ts). */
export function supAdjuster(e: number): number {
  return e > 1 ? Math.sqrt(e) - 1 : 0;
}

/** Cumulative (running) maximum of a per-shard e-process series. S_t = max_{s≤t} E_s. */
export function runningMax(eProcess: ReadonlyArray<number>): number[] {
  const out = new Array<number>(eProcess.length);
  let m = -Infinity;
  for (let t = 0; t < eProcess.length; t++) { if (eProcess[t] > m) m = eProcess[t]; out[t] = m; }
  return out;
}

export type SupFdrMode = 'naive' | 'adjusted';

/** Run e-BH at time t over the per-shard running maxima. `mode='naive'` feeds the raw running
 *  maxima (NO all-times guarantee — leaks); `mode='adjusted'` feeds A(running max) = √S − 1 (valid
 *  e-values at every t → SupFDR ≤ q). `eProcesses[i][t]` is shard i's e-process value at time t. */
export function runningMaxSelect(
  eProcesses: ReadonlyArray<ReadonlyArray<number>>,
  q: number,
  t: number,
  mode: SupFdrMode,
): EBenjaminiHochbergOutput {
  const evals = eProcesses.map((ep) => {
    const s = runningMaxAt(ep, t);
    return mode === 'adjusted' ? supAdjuster(s) : s;
  });
  // e-BH requires strictly positive-length input and a positive q; all-zero adjusted inputs select
  // nothing (e-BH returns K=0), which is correct (no evidence yet).
  return eBenjaminiHochberg(evals, q);
}

/** Running max of `ep` up to and including index t (clamped to the series length). */
function runningMaxAt(ep: ReadonlyArray<number>, t: number): number {
  let m = -Infinity;
  const end = Math.min(t, ep.length - 1);
  for (let s = 0; s <= end; s++) if (ep[s] > m) m = ep[s];
  return m;
}

export interface SupFdpResult {
  /** sup over t of the false-discovery proportion of the selection set at time t. */
  supFdp: number;
  /** The selection size K at the time the sup-FDP was attained. */
  kAtSup: number;
  /** Power at the FINAL time: fraction of true non-nulls selected at t = T−1. */
  finalPower: number;
}

/** Evaluate FDP at every time t and return the SUP over t (the realised SupFDR contribution of one
 *  fleet realisation), plus final-time power. `isNonNull[i]` = shard i is a true alternative.
 *  Precomputes each shard's running-max once (O(N·T)) then sweeps t, so it stays linear. */
export function supFdp(
  eProcesses: ReadonlyArray<ReadonlyArray<number>>,
  isNonNull: ReadonlyArray<boolean>,
  q: number,
  mode: SupFdrMode,
): SupFdpResult {
  const T = Math.max(...eProcesses.map((ep) => ep.length));
  const nNonNull = isNonNull.filter(Boolean).length;
  const rmax = eProcesses.map(runningMax); // O(N·T) once
  let supFdpVal = 0, kAtSup = 0, finalPower = 0;
  for (let t = 0; t < T; t++) {
    const evals = rmax.map((rm) => {
      const s = rm[Math.min(t, rm.length - 1)];
      return mode === 'adjusted' ? supAdjuster(s) : s;
    });
    const { selected, K } = eBenjaminiHochberg(evals, q);
    let false_ = 0, truePos = 0;
    for (const i of selected) { if (isNonNull[i]) truePos++; else false_++; }
    const fdp = K > 0 ? false_ / K : 0;
    if (fdp > supFdpVal) { supFdpVal = fdp; kAtSup = K; }
    if (t === T - 1) finalPower = nNonNull > 0 ? truePos / nNonNull : 0;
  }
  return { supFdp: supFdpVal, kAtSup, finalPower };
}
