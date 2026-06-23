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
import { estimateAr1 } from './per-shard-whitening.js';
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

/** Terminal wealth of the betting e-process over [probEnd, n) with a given baseline + AR(1) φ
 *  (φ=0 = no whitening). Terminal wealth of the test martingale = a candidate e-value. */
export function terminalEValueWith(values: ReadonlyArray<number>, probEnd: number, mean: number, sigma2: number, phi: number = 0): number {
  const state = freshBettingState();
  for (let i = probEnd; i < values.length; i++) updateBettingState(state, values[i], mean, sigma2, E_ALPHA, phi);
  return state.M;
}

/** Terminal-wealth e-value with a PLUG-IN baseline (mean/var estimated from the prefix), no
 *  whitening — what the unwhitened detector does. NOTE (the finding): NOT a valid e-value on
 *  real(istic) data — plug-in baseline estimation alone inflates E[·|H0] far above 1. */
export function terminalEValue(values: ReadonlyArray<number>, probEnd: number): number {
  const cal = calibrateBaseline(values.slice(0, probEnd), 'simple');
  return terminalEValueWith(values, probEnd, cal.mean, cal.innovationVar, 0);
}

/** Plug-in baseline WITH AR(1) whitening (the production path: estimated φ + innovation var).
 *  Still invalid on real data — whitening removes autocorrelation, but the plug-in baseline remains. */
export function terminalEValueWhitened(values: ReadonlyArray<number>, probEnd: number): number {
  const cal = calibrateBaseline(values.slice(0, probEnd), 'simple');
  const a = estimateAr1(values.slice(0, probEnd));
  return terminalEValueWith(values, probEnd, cal.mean, cal.innovationVar * (1 - a.phi * a.phi), a.phi);
}

/** A stationary healthy shard: BASE + AR(1) noise (no drift, no failure). */
function genHealthy(rng: () => number, rho: number): number[] {
  const v = new Array(T);
  let p = gaussian(rng);
  for (let t = 0; t < T; t++) { p = rho * p + Math.sqrt(1 - rho * rho) * gaussian(rng); v[t] = BASE + NOISE_SD * p; }
  return v;
}

export interface ValidityRow { label: string; mean_e: number; median_e: number; p_fire: number; valid: boolean; }

// Each diagnostic row: data regime (rho) + how the e-value is configured.
const VALIDITY_ROWS: Array<{ label: string; rho: number; e: (v: number[], pe: number) => number }> = [
  { label: 'iid · true baseline', rho: 0, e: (v, pe) => terminalEValueWith(v, pe, BASE, NOISE_SD * NOISE_SD, 0) },
  { label: 'iid · PLUG-IN baseline', rho: 0, e: (v, pe) => terminalEValue(v, pe) },
  { label: 'AR(1) · true baseline · NO whitening (φ=0)', rho: 0.5, e: (v, pe) => terminalEValueWith(v, pe, BASE, NOISE_SD * NOISE_SD, 0) },
  { label: 'AR(1) · true baseline · WHITENED (est. φ)', rho: 0.5, e: (v, pe) => { const a = estimateAr1(v.slice(0, pe)); return terminalEValueWith(v, pe, BASE, a.sigma2, a.phi); } },
  { label: 'AR(1) · PLUG-IN baseline · WHITENED (est. φ)', rho: 0.5, e: (v, pe) => terminalEValueWhitened(v, pe) },
];

/** The root-cause diagnostic: is the betting-e-process terminal wealth a VALID e-value
 *  (E[e|H0] ≤ 1, P(fire) ≤ α)? Isolates whitening (fixes autocorrelation) from the plug-in
 *  baseline (the unavoidable invalidator whitening cannot touch). */
export function eValueValidity(K: number = 400): ValidityRow[] {
  const probEnd = probationaryEnd(T);
  return VALIDITY_ROWS.map((row, ri) => {
    const es: number[] = [];
    for (let s = 0; s < K; s++) es.push(row.e(genHealthy(mulberry32(scramble(7 + s * 17 + ri * 100000)), row.rho), probEnd));
    const mean = es.reduce((a, b) => a + b, 0) / K;
    const sorted = [...es].sort((a, b) => a - b);
    const pFire = es.filter((e) => e >= 1 / E_ALPHA).length / K;
    return { label: row.label, mean_e: round3(mean), median_e: round3(sorted[Math.floor(K / 2)]), p_fire: round3(pFire), valid: mean <= 1 && pFire <= E_ALPHA };
  });
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

interface TrialOut { naiveFdp: number; relFdp: number; relWhitenFdp: number; naivePower: number; relPower: number; naiveRej: number; relRej: number; }

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
  const R = fleetResiduals(X);
  const naiveE = X.map((v) => terminalEValue(v, probEnd));
  const relE = R.map((v) => terminalEValue(v, probEnd));
  const relWhitenE = R.map((v) => terminalEValueWhitened(v, probEnd)); // common-mode removed AND whitened
  const nR = eBH(naiveE, Q), rR = eBH(relE, Q), rwR = eBH(relWhitenE, Q);
  const ns = score(nR, failed), rs = score(rR, failed);
  return { naiveFdp: ns.fdp, relFdp: rs.fdp, relWhitenFdp: score(rwR, failed).fdp, naivePower: ns.power, relPower: rs.power, naiveRej: nR.length, relRej: rR.length };
}

export interface FleetReport {
  schema_version: 'tessera-fleet-fdr-v1';
  params: { q: number; e_alpha: number; n: number; t: number; m_fail: number; trials: number };
  validity: ValidityRow[];
  synthetic: { naive_mean_fdp: number; rel_mean_fdp: number; rel_whitened_mean_fdp: number; naive_mean_power: number; rel_mean_power: number; naive_mean_rej: number; rel_mean_rej: number };
  real_null: { dataset: string; n_shards: number; rejected: number; note: string } | null;
}

export function runFleetFdr(gwdgDir?: string): FleetReport {
  const validity = eValueValidity();
  // B. synthetic ground truth
  const outs: TrialOut[] = [];
  for (let s = 0; s < TRIALS; s++) outs.push(syntheticTrial(0xF1EE7 + s * 7919));
  const mean = (f: (o: TrialOut) => number) => round3(outs.reduce((a, o) => a + f(o), 0) / outs.length);
  const synthetic = {
    naive_mean_fdp: mean((o) => o.naiveFdp), rel_mean_fdp: mean((o) => o.relFdp), rel_whitened_mean_fdp: mean((o) => o.relWhitenFdp),
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
  L.push('| configuration | E[e] | median e | P(e ≥ 1/α) | valid? |');
  L.push('|---|---|---|---|---|');
  for (const v of r.validity) L.push(`| ${v.label} | ${v.mean_e.toExponential(2)} | ${v.median_e} | ${v.p_fire} | ${v.valid ? '✅' : '❌'} |`);
  L.push('');
  L.push(`**Whitening fixes autocorrelation; the plug-in baseline is the unavoidable invalidator.** Read the rows: AR(1) with *no* whitening is invalid, but AR(1) **whitened** (estimated φ — the production path we already ship) is **valid** — so autocorrelation is solved. What is NOT solved is the **plug-in baseline**: estimating mean/variance from a finite prefix invalidates the e-value even for iid data, and even with whitening applied. Since e-BH *requires* valid marginal e-values, it cannot control FDR when fed these — **the failure is upstream of the fleet layer, in the plug-in baseline of the e-value itself.**`);
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
  L.push('| construction | mean FDP | target q | mean power |');
  L.push('|---|---|---|---|');
  L.push(`| naive (raw) | ${pct(s.naive_mean_fdp)} | ${pct(r.params.q)} | ${pct(s.naive_mean_power)} |`);
  L.push(`| fleet-relative (common-mode removed) | ${pct(s.rel_mean_fdp)} | ${pct(r.params.q)} | ${pct(s.rel_mean_power)} |`);
  L.push(`| **fleet-relative + whitening** | ${pct(s.rel_whitened_mean_fdp)} | ${pct(r.params.q)} | — |`);
  L.push('');
  L.push(`All three fail to control FDP vs q=${pct(r.params.q)}: naive ${pct(s.naive_mean_fdp)}, fleet-relative ${pct(s.rel_mean_fdp)}, **fleet-relative + whitening ${pct(s.rel_whitened_mean_fdp)}**. Removing common-mode AND whitening (every mitigation we have) does NOT rescue it — the plug-in baseline keeps each healthy shard's e-value invalid (Part A), and e-BH faithfully propagates invalid inputs into an uncontrolled FDP. Power stays high (${pct(s.rel_mean_power)}): the failures are found, then drowned in false discoveries.`);
  L.push('');
  L.push('## Verdict');
  L.push('');
  L.push('**Fleet-level e-BH does NOT rescue the guarantee.** The root cause (Part A) is upstream and specific: the betting-e-process terminal wealth is invalidated by the **plug-in baseline** (estimating mean/variance from a finite prefix). Autocorrelation is NOT the problem — the whitening we already ship makes the AR(1) case valid. So the one remaining fix is a **nuisance-baseline-robust e-value**: instead of plugging in a point estimate of mean/variance, integrate over the unknown baseline (a method-of-mixtures / confidence-sequence martingale), combined with the existing whitening. That is a redesign of the per-shard test, not a fleet wrapper, and it is the honest next direction (ADR 0008). Until then, Tessera should claim *detection*, not a calibrated FP/FDR guarantee, on real telemetry.');
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
