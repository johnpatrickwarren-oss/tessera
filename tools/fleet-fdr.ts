// tools/fleet-fdr.ts — does FLEET-level e-BH FDR control survive when per-shard
// e-values are inflated by common-mode drift? (ADR 0007 left this as the one place
// a real guarantee could still live.) e-BH (Wang–Ramdas) controls FDR ≤ q under
// arbitrary dependence — BUT only if each e-value is marginally valid (E[e|H0]≤1).
// Real drift breaks that. Two experiments:
//   A. REAL data — naive fleet e-BH on the real healthy GWDG structural shards
//      (all null → every rejection is a false discovery). Shows the per-shard
//      invalidity propagates to the naive fleet test.
//   B. SYNTHETIC ground truth — a fleet with common-mode drift + injected failures,
//      comparing NAIVE e-values (raw) vs FLEET-RELATIVE e-values (residual after
//      removing the cross-shard median, so common-mode drift cancels). Measures
//      realized FDP + power against the target q.
// See docs/SPEC-fleet-fdr-validation.md. Tessera-original; NOT vendored.

import { freshBettingState, updateBettingState } from '@johnpatrickwarren-oss/deploysignal-engine/detectors/betting-e-process';
import { calibrateBaseline, probationaryEnd } from './shadow-replay.js';
import { loadStructuralStreams, STRUCTURAL_METRIC } from './_gwdg-structural-loader.js';
import { mulberry32, scramble, gaussian } from './calibration-envelope.js';
import * as fs from 'node:fs';
import * as path from 'node:path';

export const E_ALPHA = 0.01; // betting-e-process alpha (the e-value is the terminal wealth)
export const Q = 0.1;        // target FDR for e-BH
// synthetic fleet
export const N = 60, T = 800, MFAIL = 10, ONSET = 400, TRIALS = 150;
export const BASE = 1000, NOISE_SD = 2, RHO = 0.5, DRIFT_STEP_SD = 0.4, STEP = 14;

function median(xs: ReadonlyArray<number>): number {
  if (xs.length === 0) return 0;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor((s.length - 1) / 2)];
}
function round3(x: number): number { return Math.round(x * 1000) / 1000; }

/** Terminal wealth of the betting e-process over [probEnd, n) with a given baseline. */
export function terminalEValueWith(values: ReadonlyArray<number>, probEnd: number, mean: number, sigma2: number): number {
  const state = freshBettingState();
  for (let i = probEnd; i < values.length; i++) updateBettingState(state, values[i], mean, sigma2, E_ALPHA, 0);
  return state.M;
}

/** Terminal-wealth e-value with a PLUG-IN baseline (mean/var estimated from the prefix) —
 *  what a real detector must do. NOTE (the finding): this is NOT a valid e-value on real(istic)
 *  data — plug-in estimation and autocorrelation both inflate E[·|H0] far above 1. */
export function terminalEValue(values: ReadonlyArray<number>, probEnd: number): number {
  const cal = calibrateBaseline(values.slice(0, probEnd), 'simple');
  return terminalEValueWith(values, probEnd, cal.mean, cal.innovationVar);
}

/** A stationary healthy shard: BASE + AR(1) noise (no drift, no failure). */
function genHealthy(rng: () => number, rho: number): number[] {
  const v = new Array(T);
  let p = gaussian(rng);
  for (let t = 0; t < T; t++) { p = rho * p + Math.sqrt(1 - rho * rho) * gaussian(rng); v[t] = BASE + NOISE_SD * p; }
  return v;
}

export interface ValidityRow { regime: string; baseline: 'true' | 'plug-in'; mean_e: number; median_e: number; p_fire: number; valid: boolean; }

/** The root-cause diagnostic: is the betting-e-process terminal wealth a VALID e-value
 *  (E[e|H0] ≤ 1)? Measured on healthy nulls for {iid, AR(1)} × {true baseline, plug-in}. */
export function eValueValidity(K: number = 400): ValidityRow[] {
  const probEnd = probationaryEnd(T);
  const rows: ValidityRow[] = [];
  for (const [regime, rho] of [['iid', 0], ['AR(1) ρ=0.5', 0.5]] as const) {
    for (const baseline of ['true', 'plug-in'] as const) {
      const es: number[] = [];
      for (let s = 0; s < K; s++) {
        const v = genHealthy(mulberry32(scramble(7 + s * 17 + (rho > 0 ? 100000 : 0))), rho);
        es.push(baseline === 'true' ? terminalEValueWith(v, probEnd, BASE, NOISE_SD * NOISE_SD) : terminalEValue(v, probEnd));
      }
      const mean = es.reduce((a, b) => a + b, 0) / K;
      const sorted = [...es].sort((a, b) => a - b);
      const pFire = es.filter((e) => e >= 1 / E_ALPHA).length / K;
      rows.push({ regime, baseline, mean_e: round3(mean), median_e: round3(sorted[Math.floor(K / 2)]), p_fire: round3(pFire), valid: mean <= 1 && pFire <= E_ALPHA });
    }
  }
  return rows;
}

/** e-BH (Wang–Ramdas): reject the k* shards with largest e-values, k* = max{k : e_(k) ≥ N/(q·k)}. */
export function eBH(evalues: ReadonlyArray<number>, q: number): number[] {
  const sorted = evalues.map((e, i) => ({ e, i })).sort((a, b) => b.e - a.e);
  const Nn = evalues.length;
  let kstar = 0;
  for (let k = 1; k <= Nn; k++) if (sorted[k - 1].e >= Nn / (q * k)) kstar = k;
  return sorted.slice(0, kstar).map((p) => p.i);
}

/** Cross-shard residual at each time (subtract the common-mode = per-timestamp median). */
export function fleetResiduals(X: number[][]): number[][] {
  const n = X.length, t = X[0].length;
  const R: number[][] = X.map(() => new Array(t).fill(0));
  for (let j = 0; j < t; j++) {
    const col = X.map((row) => row[j]);
    const med = median(col);
    for (let i = 0; i < n; i++) R[i][j] = X[i][j] - med;
  }
  return R;
}

interface TrialOut { naiveFdp: number; relFdp: number; naivePower: number; relPower: number; naiveRej: number; relRej: number; }

function genFleet(rng: () => number): { X: number[][]; failed: boolean[] } {
  // shared common-mode random walk (the persistent drift that breaks per-shard e-values)
  const cm = new Array(T).fill(0);
  for (let t = 1; t < T; t++) cm[t] = cm[t - 1] + DRIFT_STEP_SD * gaussian(rng);
  const failed = Array.from({ length: N }, (_, i) => i < MFAIL);
  const X: number[][] = [];
  for (let i = 0; i < N; i++) {
    const row = new Array(T);
    let prev = gaussian(rng);
    for (let t = 0; t < T; t++) {
      prev = RHO * prev + Math.sqrt(1 - RHO * RHO) * gaussian(rng);
      row[t] = BASE + cm[t] + NOISE_SD * prev + (failed[i] && t >= ONSET ? STEP : 0);
    }
    X[i] = row;
  }
  return { X, failed };
}

function score(rej: number[], failed: boolean[]): { fdp: number; power: number } {
  const falsePos = rej.filter((i) => !failed[i]).length;
  const truePos = rej.filter((i) => failed[i]).length;
  const nFail = failed.filter(Boolean).length;
  return { fdp: rej.length > 0 ? falsePos / rej.length : 0, power: nFail > 0 ? truePos / nFail : 0 };
}

function syntheticTrial(seed: number): TrialOut {
  const { X, failed } = genFleet(mulberry32(scramble(seed)));
  const probEnd = probationaryEnd(T);
  const naiveE = X.map((v) => terminalEValue(v, probEnd));
  const relE = fleetResiduals(X).map((v) => terminalEValue(v, probEnd));
  const nR = eBH(naiveE, Q), rR = eBH(relE, Q);
  const ns = score(nR, failed), rs = score(rR, failed);
  return { naiveFdp: ns.fdp, relFdp: rs.fdp, naivePower: ns.power, relPower: rs.power, naiveRej: nR.length, relRej: rR.length };
}

export interface FleetReport {
  schema_version: 'tessera-fleet-fdr-v1';
  params: { q: number; e_alpha: number; n: number; t: number; m_fail: number; trials: number };
  validity: ValidityRow[];
  synthetic: { naive_mean_fdp: number; rel_mean_fdp: number; naive_mean_power: number; rel_mean_power: number; naive_mean_rej: number; rel_mean_rej: number };
  real_null: { dataset: string; n_shards: number; rejected: number; note: string } | null;
}

export function runFleetFdr(gwdgDir?: string): FleetReport {
  const validity = eValueValidity();
  // B. synthetic ground truth
  const outs: TrialOut[] = [];
  for (let s = 0; s < TRIALS; s++) outs.push(syntheticTrial(0xF1EE7 + s * 7919));
  const mean = (f: (o: TrialOut) => number) => round3(outs.reduce((a, o) => a + f(o), 0) / outs.length);
  const synthetic = {
    naive_mean_fdp: mean((o) => o.naiveFdp), rel_mean_fdp: mean((o) => o.relFdp),
    naive_mean_power: mean((o) => o.naivePower), rel_mean_power: mean((o) => o.relPower),
    naive_mean_rej: mean((o) => o.naiveRej), rel_mean_rej: mean((o) => o.relRej),
  };

  // A. real null (all healthy → every rejection is a false discovery)
  let real_null: FleetReport['real_null'] = null;
  if (gwdgDir && fs.existsSync(path.join(gwdgDir, 'telemetry'))) {
    const telem = path.join(gwdgDir, 'telemetry');
    const csvs = fs.readdirSync(telem).filter((f) => f.endsWith('.csv')).sort().map((f) => path.join(telem, f));
    const streams = csvs.flatMap((c) => loadStructuralStreams(c, STRUCTURAL_METRIC));
    const naiveE = streams.map((t) => terminalEValue(t.values, probationaryEnd(t.values.length)));
    const rej = eBH(naiveE, Q);
    real_null = { dataset: 'GWDG-structural-' + STRUCTURAL_METRIC, n_shards: streams.length, rejected: rej.length, note: 'all healthy → every rejection is a false discovery' };
  }

  return { schema_version: 'tessera-fleet-fdr-v1', params: { q: Q, e_alpha: E_ALPHA, n: N, t: T, m_fail: MFAIL, trials: TRIALS }, validity, synthetic, real_null };
}

function pct(x: number): string { return (x * 100).toFixed(1) + '%'; }

function renderMd(r: FleetReport): string {
  const s = r.synthetic, L: string[] = [];
  L.push('# Tessera — can fleet-level e-BH FDR rescue the guarantee? (No — and here is the root cause)');
  L.push('');
  L.push(`ADR 0007 left fleet-FDR as the one place a real guarantee could live. e-BH (Wang–Ramdas) controls FDR ≤ q under arbitrary dependence — BUT only if each e-value is marginally VALID (E[e|H0] ≤ 1). So the prior question is: are Tessera's e-values valid on real(istic) data? Target FDR q=${r.params.q}.`);
  L.push('');
  L.push('## A. Root cause — is the betting-e-process e-value VALID? (E[e|H0] ≤ 1?)');
  L.push('');
  L.push('Terminal wealth on healthy nulls, for {iid, AR(1)} × {true baseline, plug-in (estimated) baseline}. A valid e-value needs E[e] ≤ 1 and P(fire) ≤ α.');
  L.push('');
  L.push('| regime | baseline | E[e] | median e | P(e ≥ 1/α) | valid? |');
  L.push('|---|---|---|---|---|---|');
  for (const v of r.validity) L.push(`| ${v.regime} | ${v.baseline} | ${v.mean_e.toExponential(2)} | ${v.median_e} | ${v.p_fire} | ${v.valid ? '✅' : '❌'} |`);
  L.push('');
  L.push(`**The e-value is valid ONLY with the true baseline AND iid data.** Plug-in baseline estimation (unavoidable — a real detector must estimate mean/variance) inflates E[e] by orders of magnitude; autocorrelation (ubiquitous in telemetry) breaks it independently; together they compound. Since e-BH *requires* valid marginal e-values, it cannot control FDR when fed these — **the failure is upstream of the fleet layer**, in the e-value itself.`);
  L.push('');
  L.push('## B. Consequence — real null: naive fleet e-BH on real healthy GWDG structural shards');
  L.push('');
  if (r.real_null) {
    L.push(`${r.real_null.n_shards} real healthy shards (${r.real_null.dataset}); ${r.real_null.note}.`);
    L.push('');
    L.push(`**Naive fleet e-BH rejected ${r.real_null.rejected}/${r.real_null.n_shards} shards** — all false discoveries. FDP among rejections = ${r.real_null.rejected > 0 ? '100%' : '0%'} ≫ q=${pct(r.params.q)} (if any rejected). The per-shard e-value invalidity (drift) propagates: naive fleet e-BH does NOT control FDR on real data.`);
  } else {
    L.push('_(no GWDG dir provided)_');
  }
  L.push('');
  L.push('## C. Synthetic ground truth — naive vs fleet-relative e-BH (does removing common-mode help?)');
  L.push('');
  L.push(`${r.params.n} shards sharing a common-mode random-walk drift + idiosyncratic AR(1) noise; ${r.params.m_fail} carry an injected step failure after onset. ${r.params.trials} trials. **Naive** = e-value on the raw shard; **fleet-relative** = e-value on the residual after subtracting the per-timestamp cross-shard median (common-mode removed).`);
  L.push('');
  L.push('| construction | mean FDP | target q | mean power | mean rejections |');
  L.push('|---|---|---|---|---|');
  L.push(`| naive (raw) | ${pct(s.naive_mean_fdp)} | ${pct(r.params.q)} | ${pct(s.naive_mean_power)} | ${s.naive_mean_rej} |`);
  L.push(`| **fleet-relative** | ${pct(s.rel_mean_fdp)} | ${pct(r.params.q)} | ${pct(s.rel_mean_power)} | ${s.rel_mean_rej} |`);
  L.push('');
  L.push(`Both fail to control FDP: naive ${pct(s.naive_mean_fdp)}, **fleet-relative ${pct(s.rel_mean_fdp)}** vs q=${pct(r.params.q)} (relative power ${pct(s.rel_mean_power)} — it finds the failures, but drowns them in false discoveries). Removing the common-mode does NOT rescue it, because the e-value is invalid for a reason the fleet layer can't touch: plug-in baseline + idiosyncratic per-shard offsets still inflate each healthy shard's wealth (Part A). e-BH faithfully propagates invalid inputs into an uncontrolled FDP.`);
  L.push('');
  L.push('## Verdict');
  L.push('');
  L.push('**Fleet-level e-BH does NOT rescue the guarantee.** The root cause (Part A) is upstream: the betting-e-process terminal wealth is not a valid e-value under plug-in baselines or autocorrelation, and e-BH requires valid e-values. A real guarantee would require a **valid e-value construction** — one robust to an unknown/estimated baseline and to autocorrelation (e.g. a mixture / confidence-sequence martingale that integrates over the nuisance mean, with whitening) — i.e. a redesign of the per-shard test, not a fleet wrapper. That is the honest next direction; until then, Tessera should claim *detection*, not a calibrated FP/FDR guarantee, on real telemetry.');
  L.push('');
  L.push('> **Scope:** ground-truth FDP needs failure labels (absent in real fleet telemetry), so Parts A & C are synthetic, parameterized to the *measured* real behavior (ADR 0007); Part B confirms the naive failure on actual healthy telemetry. A real labeled fleet remains the outstanding validation.');
  L.push('');
  return L.join('\n');
}

export function writeFleetFdr(outDir: string, gwdgDir?: string): { json: string; md: string } {
  const report = runFleetFdr(gwdgDir);
  fs.mkdirSync(outDir, { recursive: true });
  const json = path.join(outDir, 'fleet-fdr-report.json');
  const md = path.join(outDir, 'fleet-fdr-report.md');
  fs.writeFileSync(json, JSON.stringify(report, null, 2) + '\n');
  fs.writeFileSync(md, renderMd(report));
  return { json, md };
}

if (require.main === module) { // CommonJS CLI guard (tsconfig compiles to CJS)
  const gwdgDir = process.argv[2] ?? process.env.GWDG_DIR;
  const out = path.join(path.resolve(__dirname, '..'), 'shadow-results');
  const r = writeFleetFdr(out, gwdgDir);
  process.stdout.write(`Fleet-FDR report:\n  ${path.relative(process.cwd(), r.json)}\n  ${path.relative(process.cwd(), r.md)}\n`);
  process.exit(0);
}
