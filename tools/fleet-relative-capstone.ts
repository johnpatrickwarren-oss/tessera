// tools/fleet-relative-capstone.ts — the capstone: does FLEET-RELATIVE comparison close the
// calibrated guarantee single-shard schemes could not? The residual r_i,t = x_i,t − center_j(x_j,t)
// removes fleet-wide common-mode (drift/workload), so a shard-specific fault stands out.
//
// HONEST RESULT (verified; do not dress up): fleet-relative SEPARATES faults (power = 1.0 — the
// failing shard is isolated) but does NOT control FDR. The reason is NOT an invalid e-value (the
// residual e-value is VALID on a null fleet) — it is that the FAULTS THEMSELVES CONTAMINATE the
// cross-shard common-mode estimate: their onset shifts the center UP, so every healthy shard's
// residual gets a persistent DOWNWARD step (the two-sided betting process fires on either sign).
// FDP rises with the fault fraction in the low-contamination regime (MFAIL=2→~0.15, 10→~0.79) then
// the RATIO falls as contamination grows enough to move the median itself (20→~0.67), but stays ≫ q
// throughout. A trimmed-mean center does NOT fix it (reported below). So the fleet gives detection/
// separation; a calibrated FDR guarantee needs a contamination-robust common-mode (factor model /
// leave-faults-out) AND the nuisance-baseline-robust e-value (ADR 0008). See ADR 0012.
// Tessera-original; NOT vendored.

import { fleetResiduals, eBH, terminalEValueWith } from './fleet-fdr.js';
import { calibrateBaseline } from './shadow-replay.js';
import { mulberry32, scramble, gaussian } from './calibration-envelope.js';
import * as fs from 'node:fs';
import * as path from 'node:path';

export const ALPHA = 0.01;
export const N = 60, T = 2000, M = 1500, N_TEST = 300, FONSET = 1550;
export const RHO = 0.5, DRIFT = 0.5, NOISE = 2, LVL = 5, STEP = 10;
export const DEFAULT_MFAIL = 10, TRIALS = 120, QS = [0.1, 0.05, 0.01] as const, FAULT_FRACS = [2, 5, 10, 20] as const;

/** Fleet: shared random-walk common-mode + per-shard level + AR(1) noise + a step fault in the first
 *  `mfail` shards from FONSET (mfail=0 → null fleet). */
export function genFleet(rng: () => number, mfail: number): { X: number[][]; failed: boolean[] } {
  const cm = new Array(T).fill(0);
  for (let t = 1; t < T; t++) cm[t] = cm[t - 1] + DRIFT * gaussian(rng);
  const failed = Array.from({ length: N }, (_, i) => i < mfail);
  const X: number[][] = [];
  for (let i = 0; i < N; i++) {
    const lvl = LVL * gaussian(rng); const row = new Array(T); let p = gaussian(rng);
    for (let t = 0; t < T; t++) {
      p = RHO * p + Math.sqrt(1 - RHO * RHO) * gaussian(rng);
      row[t] = 1000 + cm[t] + lvl + NOISE * p + (failed[i] && t >= FONSET ? STEP : 0);
    }
    X[i] = row;
  }
  return { X, failed };
}

function eValue(v: ReadonlyArray<number>): number {
  const cal = calibrateBaseline(v.slice(0, M), 'simple');
  return terminalEValueWith(v.slice(0, M + N_TEST), M, cal.mean, cal.innovationVar, cal.phi);
}
const rawEValues = (X: number[][]): number[] => X.map(eValue);
const relEValues = (X: number[][]): number[] => fleetResiduals(X).map(eValue);

/** Per-tick TRIMMED-mean common-mode (drop the top/bottom `trim` fraction) — a more
 *  contamination-resistant center than the median, to test whether it rescues FDR. */
function trimmedResiduals(X: number[][], trim: number): number[][] {
  const n = X.length, t = X[0].length, R = X.map(() => new Array(t));
  const k = Math.floor(n * trim);
  for (let j = 0; j < t; j++) {
    const col = X.map((r) => r[j]).sort((a, b) => a - b);
    let sum = 0;
    for (let i = k; i < n - k; i++) sum += col[i];
    const c = sum / (n - 2 * k);
    for (let i = 0; i < n; i++) R[i][j] = X[i][j] - c;
  }
  return R;
}
const trimmedEValues = (X: number[][]): number[] => trimmedResiduals(X, 0.3).map(eValue);

function fdpPower(evals: number[], failed: boolean[], q: number): { fdp: number; power: number } {
  const rej = eBH(evals, q);
  const fp = rej.filter((i) => !failed[i]).length, tp = rej.filter((i) => failed[i]).length;
  const nf = failed.filter(Boolean).length;
  return { fdp: rej.length ? fp / rej.length : 0, power: nf ? tp / nf : 0 };
}
function round3(x: number): number { return Math.round(x * 1000) / 1000; }
function mean(xs: number[]): number { return xs.reduce((a, b) => a + b, 0) / xs.length; }

export interface CapstoneReport {
  schema_version: 'tessera-fleet-relative-capstone-v2';
  params: { alpha: number; n: number; m: number; n_test: number; default_mfail: number; trials: number };
  by_q: Array<{ q: number; naive_fdp: number; naive_power: number; rel_fdp: number; rel_power: number }>;
  by_fault_fraction: Array<{ mfail: number; rel_fdp: number; rel_power: number }>;
  trimmed_center: { fdp: number; power: number };
  null_residual_validity: { p_ge_10: number; p_ge_100: number; median_e: number };
}

function nullValidity(): CapstoneReport['null_residual_validity'] {
  const es: number[] = [];
  for (let s = 0; s < 40; s++) es.push(...relEValues(genFleet(mulberry32(scramble(5000 + s * 31)), 0).X));
  const sorted = [...es].sort((a, b) => a - b);
  return { p_ge_10: round3(es.filter((e) => e >= 10).length / es.length), p_ge_100: round3(es.filter((e) => e >= 1 / ALPHA).length / es.length), median_e: round3(sorted[Math.floor(es.length / 2)]) };
}

export function runCapstone(): CapstoneReport {
  const trials = Array.from({ length: TRIALS }, (_, s) => genFleet(mulberry32(scramble(1 + s * 53)), DEFAULT_MFAIL));
  const by_q = QS.map((q) => {
    const ns = trials.map(({ X, failed }) => fdpPower(rawEValues(X), failed, q));
    const rs = trials.map(({ X, failed }) => fdpPower(relEValues(X), failed, q));
    return { q, naive_fdp: round3(mean(ns.map((x) => x.fdp))), naive_power: round3(mean(ns.map((x) => x.power))), rel_fdp: round3(mean(rs.map((x) => x.fdp))), rel_power: round3(mean(rs.map((x) => x.power))) };
  });
  const by_fault_fraction = FAULT_FRACS.map((mfail) => {
    const rs = Array.from({ length: TRIALS }, (_, s) => { const { X, failed } = genFleet(mulberry32(scramble(7 + s * 53)), mfail); return fdpPower(relEValues(X), failed, 0.1); });
    return { mfail, rel_fdp: round3(mean(rs.map((x) => x.fdp))), rel_power: round3(mean(rs.map((x) => x.power))) };
  });
  const tr = trials.map(({ X, failed }) => fdpPower(trimmedEValues(X), failed, 0.1));
  return {
    schema_version: 'tessera-fleet-relative-capstone-v2',
    params: { alpha: ALPHA, n: N, m: M, n_test: N_TEST, default_mfail: DEFAULT_MFAIL, trials: TRIALS },
    by_q, by_fault_fraction,
    trimmed_center: { fdp: round3(mean(tr.map((x) => x.fdp))), power: round3(mean(tr.map((x) => x.power))) },
    null_residual_validity: nullValidity(),
  };
}

function pct(x: number): string { return (x * 100).toFixed(1) + '%'; }

function renderMd(r: CapstoneReport): string {
  const v = r.null_residual_validity, L: string[] = [];
  L.push('# Tessera — fleet-relative capstone: does the fleet close the calibrated guarantee?');
  L.push('');
  L.push(`Fleet-relative comparison (residual = value − cross-shard median per tick) removes fleet-wide common-mode (drift/workload), so a shard-specific fault stands out. Tested with m≫n (m=${r.params.m}, n=${r.params.n_test}) + whitening + e-BH, on a synthetic ${r.params.n}-shard fleet with a large shared random-walk drift + shard-specific step faults. ${r.params.trials} trials, α=${r.params.alpha}.`);
  L.push('');
  L.push('## Power vs FDR (naive raw vs fleet-relative), default fault load');
  L.push('');
  L.push('| q | naive FDP | naive power | **fleet-rel FDP** | **fleet-rel power** |');
  L.push('|---|---|---|---|---|');
  for (const x of r.by_q) L.push(`| ${x.q} | ${pct(x.naive_fdp)} | ${pct(x.naive_power)} | **${pct(x.rel_fdp)}** | **${pct(x.rel_power)}** |`);
  L.push('');
  L.push('## The mechanism — FDR control degrades with the FAULT FRACTION (q=0.1)');
  L.push('');
  L.push('| faults / 60 | fleet-rel FDP | fleet-rel power |');
  L.push('|---|---|---|');
  for (const x of r.by_fault_fraction) L.push(`| ${x.mfail} | ${pct(x.rel_fdp)} | ${pct(x.rel_power)} |`);
  L.push('');
  L.push(`The residual e-value is **VALID on a null fleet** (no faults): median ${v.median_e}, P(e≥10) ${pct(v.p_ge_10)}, P(e≥1/α) ${pct(v.p_ge_100)}. So FDR does NOT fail from an invalid e-value. It fails because the **faults contaminate the cross-shard common-mode estimate**: their onset shifts the center UP, so every HEALTHY shard's residual gets a persistent DOWNWARD step (the two-sided betting process fires on either sign), which accumulates and false-fires. FDP rises with the fault fraction in the low-contamination regime then the RATIO falls as contamination grows enough to move the median itself (mfail=10→${pct(r.by_fault_fraction.find((x) => x.mfail === 10)?.rel_fdp ?? 0)}, 20→${pct(r.by_fault_fraction.find((x) => x.mfail === 20)?.rel_fdp ?? 0)}) — but stays ≫ q throughout. A **trimmed-mean center does NOT fix it** (30%-trimmed center at the default load: FDP ${pct(r.trimmed_center.fdp)}, power ${pct(r.trimmed_center.power)} — no better than the median's ${pct(r.by_q[0].rel_fdp)}) — the contamination is structural (correlated onset), not just outlier magnitude.`);
  L.push('');
  L.push('## Verdict (the honest capstone)');
  L.push('');
  L.push(`**Fleet-relative comparison SEPARATES faults (power = ${pct(r.by_q[0].rel_power)}) but does NOT deliver a calibrated FDR guarantee** (FDP ${pct(r.by_q[0].rel_fdp)} at the default load; grows with the fault fraction). The fleet solves the DETECTION/separation half — the failing shard is isolated from fleet-wide drift/workload — but two things still block the GUARANTEE: (1) the common-mode estimate is itself contaminated by the faults (needs a contamination-robust factor/leave-faults-out construction), and (2) the per-shard e-value validity wall (ADR 0008) for the residual.`);
  L.push('');
  L.push('**Conclusion of the arc (ADRs 0001–0012):** detection/separation is fully solvable — m≫n (0009), seasonal 2D baseline (0010), the lifecycle (0011), and fleet-relative separation (this) all improve it. A *calibrated FP/FDR guarantee* on real telemetry is NOT achieved by any baseline/fleet engineering alone; it needs (a) a nuisance-baseline-robust e-value (ADR 0008) and (b) a contamination-robust fleet common-mode. Until those exist, Tessera should claim strong detection, not a calibrated guarantee.');
  L.push('');
  L.push('> **Scope:** synthetic ground truth (FDP/power need labels). The honest through-line across the arc holds on real data where tested (NAB/GWDG/MIT); a real labeled fleet is the outstanding external validation.');
  L.push('');
  return L.join('\n');
}

export function writeCapstone(outDir: string): { json: string; md: string } {
  const report = runCapstone();
  fs.mkdirSync(outDir, { recursive: true });
  const json = path.join(outDir, 'fleet-relative-capstone-report.json');
  const md = path.join(outDir, 'fleet-relative-capstone-report.md');
  fs.writeFileSync(json, JSON.stringify(report, null, 2) + '\n');
  fs.writeFileSync(md, renderMd(report));
  return { json, md };
}

if (require.main === module) { // CommonJS CLI guard (tsconfig compiles to CJS)
  const out = path.join(path.resolve(__dirname, '..'), 'shadow-results');
  const r = writeCapstone(out);
  process.stdout.write(`Fleet-relative capstone report:\n  ${path.relative(process.cwd(), r.json)}\n  ${path.relative(process.cwd(), r.md)}\n`);
  process.exit(0);
}
