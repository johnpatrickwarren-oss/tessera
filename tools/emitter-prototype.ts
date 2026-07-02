// tools/emitter-prototype.ts — RESEARCH PROTOTYPE (not wired into the pipeline).
//
// Hypothesis under test: the FDP≈0.5–0.7 we measured is because e-BH is fed the raw
// Shiryaev–Roberts statistic M^SR_t = Σ_{j≤t} Λ^(j)_t, whose null expectation is ≈ T (a SUM
// of T per-onset e-processes), NOT ≤ 1 — so it is not an e-value, and the √E−1 adjuster
// (which assumes a genuine e-process) cannot rescue it.
//
// The by-construction fix is a CONVEX onset mixture (weights summing to 1, i.e. normalise by
// T): mixE_t = (1/T) Σ_{τ≤t} Λ^(τ)_t  + (T−t)/T  = (M^SR_t + (T−t)) / T. A convex combination
// of e-processes is an e-process (E[mixE_t|H0] ≤ 1), so running-max → √E−1 adjuster → e-BH
// controls FDR. We also report the terminal normalised value M^SR_T / T (a valid e-value at
// the fixed horizon, no adjuster needed).
//
// CRUCIAL DIAGNOSTIC: we audit mean(e) on HEALTHY shards. If the normalised e-value's healthy
// mean ≈ ≤1 AND its e-BH FDP ≤ q with retained recall, the bug was the increment object
// (fixable, by construction). If healthy mean ≫ 1 even normalised, the residual itself is not
// null-valid (slow drift / conditioning wrong) — the N1/O5 ceiling, not fixable by the increment.
//
// Increment: Gaussian-LR mixture g(r) = mean_λ exp(λr − λ²/2) over λ ∈ ±{0.5,1,2}, E[g|N(0,1)]=1,
// capped per tick (bounded increment → controllable mean). SR recursion M_t=(1+M_{t-1})·g(r_t).

import * as fs from 'node:fs';
import { loadScenarioBundle, type ScenarioBundle } from './clustersynth-scenario.js';
import { fitBaseline, applyBaseline } from './baseline-monitor.js';
import { supAdjuster } from './supfdr.js';
import { eBenjaminiHochberg } from '@johnpatrickwarren-oss/deploysignal-engine/fleet/e-bh';

const LAMBDAS = [0.5, 1, 2, -0.5, -1, -2];
const G_CAP = 100; // bound the per-tick increment: E[min(g,cap)] ≤ E[g] = 1 (conservative)

/** Gaussian-LR mixture increment, capped. E[g|N(0,1)] ≤ 1. */
export function gInc(r: number): number {
  let s = 0;
  for (const lam of LAMBDAS) s += Math.exp(lam * r - 0.5 * lam * lam);
  return Math.min(G_CAP, s / LAMBDAS.length);
}

export interface ShardEvals { rawPeak: number; mixPeakAdj: number; termE: number; prefixPeakNorm: number; }

/** Per-shard SR recursion → candidate e-statistics + the PREFIX self-audit value.
 *  `prefixLen` is the healthy (pre-fault) window used to test this shard's null validity:
 *  prefixPeakNorm = max_{t<prefixLen} M_t / prefixLen — a VILLE-TAIL-BOUNDED statistic, NOT an
 *  e-value (2026-07-02 audit fix: it is dominated by the sup of the uniform onset-mixture
 *  e-process, so P(≥x|valid null) ≤ 1/x — the tail property the ≥10 abstention rule actually
 *  uses — but the MEAN of a sup is not ≤ 1, so never feed it to e-BH or call it an e-value).
 *  A drifting shard's SR explodes on its own healthy prefix. */
export function shardEvals(r: number[], prefixLen: number): ShardEvals {
  const T = r.length;
  let M = 0, rawPeak = 0, mixPeak = 0, prefixPeak = 0;
  for (let t = 0; t < T; t++) {
    M = (1 + M) * gInc(r[t]);
    if (!isFinite(M)) M = Number.MAX_VALUE;
    if (M > rawPeak) rawPeak = M;
    if (t < prefixLen && M > prefixPeak) prefixPeak = M;
    const mix = (M + (T - 1 - t)) / T; // convex onset-mixture e-process value at t
    if (mix > mixPeak) mixPeak = mix;
  }
  return { rawPeak, mixPeakAdj: supAdjuster(mixPeak), termE: M / T, prefixPeakNorm: prefixPeak / Math.max(1, prefixLen) };
}

function faultedShards(b: ScenarioBundle, counter: string): Set<number> {
  const ids = new Set<string>();
  for (const f of b.faults) {
    if (f.level !== 'gpu' || f.type !== 'mean_shift') continue;
    if (!(f.counter === counter || f.counter === null)) continue;
    for (const s of f.affected_shards) ids.add(s);
  }
  return new Set(b.shardIds.map((s, i) => (ids.has(s) ? i : -1)).filter((i) => i >= 0));
}

const mean = (xs: number[]): number => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

function scoreSel(faultIdx: Set<number>, sel: ReadonlyArray<number>, nFault: number): { fdp: number; recall: number; K: number } {
  let tp = 0; for (const i of sel) if (faultIdx.has(i)) tp++;
  return { fdp: sel.length ? (sel.length - tp) / sel.length : 0, recall: nFault ? tp / nFault : NaN, K: sel.length };
}

function run(baseDir: string, monDir: string, q = 0.1): void {
  const healthy = loadScenarioBundle(baseDir);
  const mon = loadScenarioBundle(monDir);
  const prefixLen = Math.max(1, Math.floor(0.1 * mon.T)); // pre-fault healthy null sample
  const A_AUDIT = 10; // abstain a shard if its prefix e-value ≥ 1/α_audit (α_audit=0.1)
  process.stdout.write(`emitter-prototype — baseline T=${healthy.T} | monitoring T=${mon.T}, ${mon.shardIds.length} shards, ${mon.faults.length} faults, q=${q}\n`);
  process.stdout.write(`increment: Gaussian-LR mixture (λ=±{.5,1,2}), cap=${G_CAP}; per-shard audit: abstain if prefix(${prefixLen}) e-value ≥ ${A_AUDIT}\n\n`);
  process.stdout.write('counter         nFault | FIXED-mix (no audit) FDP/recall | AUDITED: coverage  certFDP  certRecall  faultsAbstained\n');
  for (const counter of mon.counters.map((c) => c.name)) {
    const fits = fitBaseline(healthy, counter);
    if (fits.length !== mon.shardIds.length) continue;
    const R = applyBaseline(mon, counter, fits);
    const ev = R.map((r) => shardEvals(r, prefixLen));
    const faultIdx = faultedShards(mon, counter);
    if (faultIdx.size === 0) continue;
    const n = mon.shardIds.length;

    // No-audit baseline (normalized mixture over all shards).
    const noAudit = scoreSel(faultIdx, eBenjaminiHochberg(ev.map((e) => e.mixPeakAdj), q).selected, faultIdx.size);

    // Per-shard validity audit: certify shards whose prefix e-value < A_AUDIT.
    const certified = ev.map((e, i) => (e.prefixPeakNorm < A_AUDIT ? i : -1)).filter((i) => i >= 0);
    const certSet = new Set(certified);
    const certFaultIdx = new Set([...faultIdx].filter((i) => certSet.has(i)));
    const faultsAbstained = faultIdx.size - certFaultIdx.size;
    // e-BH on the certified subset only (its inputs in certified order).
    const certEvals = certified.map((i) => ev[i].mixPeakAdj);
    const certSel = eBenjaminiHochberg(certEvals, q).selected.map((k) => certified[k]); // map back to global idx
    const certScore = scoreSel(certFaultIdx, certSel, certFaultIdx.size);
    const coverage = certified.length / n;

    const f = (x: number): string => (Number.isNaN(x) ? ' - ' : x.toFixed(2));
    process.stdout.write(
      `${counter.padEnd(14)} ${String(faultIdx.size).padStart(5)}  | ` +
      `${f(noAudit.fdp)}/${f(noAudit.recall)} (K=${noAudit.K})`.padStart(24) + ` | ` +
      `${(100 * coverage).toFixed(0)}%`.padStart(8) + `  ${f(certScore.fdp).padStart(6)}  ${f(certScore.recall).padStart(9)}  ${String(faultsAbstained).padStart(13)}\n`);
  }
  process.stdout.write(`\nREAD: AUDITED = abstain shards whose own healthy prefix already shows e≥${A_AUDIT} (drifting null),\n`);
  process.stdout.write('then e-BH on the certified survivors. GO if certFDP ≤ q with usable coverage and recall.\n');
  process.stdout.write('NO-GO if certFDP still ≫ q (drift not caught by the prefix) or coverage/recall collapse.\n');
}

if (require.main === module) {
  process.env.CS_ALLOW_SHORT = process.env.CS_ALLOW_SHORT ?? '1'; // prototype: baseline guard not the subject
  const [b, m] = [process.argv[2], process.argv[3]];
  if (!b || !m) { process.stderr.write('usage: node tools/emitter-prototype.js <baseline-dir> <monitoring-dir> [q]\n'); process.exit(2); }
  run(b, m, process.argv[4] ? Number(process.argv[4]) : 0.1);
  process.exit(0);
}
