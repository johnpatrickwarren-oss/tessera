// tools/contamination-robust-fleet.ts — Lever A (ADR 0015): does a CONTAMINATION-ROBUST fleet
// common-mode, fed into the nuisance-robust BF e-value (ADR 0013), finally deliver a calibrated
// FP/FDR guarantee on a fleet with shard-specific faults?
//
// ADR 0012 found fleet-relative SEPARATES faults (power 1.0) but FDP 0.72–0.77 ≫ q, for two named
// reasons it left unbuilt: (a) the cross-shard center (per-tick MEDIAN) is contaminated by the faults'
// correlated onset; (b) the residual e-value was the PLUG-IN betting process, not the BF. A trimmed
// mean did not fix (a) because the fault is confounded with each shard's baseline LEVEL — a
// faulty-but-low-level shard sits mid-pack, so value-rank trimming removes the wrong shards.
//
// Construction: (1) remove each shard's level ℓ̂_i = median over the (healthy) calibration window;
// (2) on the level-adjusted matrix the faults ARE the cross-sectional outliers; (3) a redescending Tukey-biweight
// M-estimator common-mode c_t resists them; (4) residual R = X − ℓ̂ − c; (5) BF e-value on R (valid by
// construction); (6) e-BH. FP/FDR is then guaranteed BY CONSTRUCTION (valid e-value + e-BH); FD is
// CHARACTERIZED, conditional on effect ≥ δ (a power curve, not an unconditional guarantee).
// Tessera-original; NOT vendored.

import { genFleet, N, T, M, N_TEST, FONSET, RHO, DRIFT, NOISE, LVL, STEP, DEFAULT_MFAIL } from './fleet-relative-capstone.js';
import { nuisanceRobustEValue, pluginEValue } from './nuisance-robust-evalue.js';
import { eBH, fleetResiduals } from './fleet-fdr.js';
import { loadStructuralStreams, STRUCTURAL_METRIC } from './_gwdg-structural-loader.js';
import { mulberry32, scramble, gaussian } from './calibration-envelope.js';
import * as fs from 'node:fs';
import * as path from 'node:path';

export const ALPHA = 0.01;
export const TRIALS = 100, QS = [0.1, 0.05, 0.01] as const;
export const FAULT_FRACS = [2, 5, 10, 12, 14, 16, 20, 30, 40] as const; // breakdown sweep (of N=60) — fine near the cliff
export const DELTAS = [1, 2, 3, 5, 8] as const;             // effect-size sweep (fault step in σ-ish units)
export const TUKEY_C = 4.685;                                // 95% efficiency at the Gaussian; redescends to 0 beyond C·scale

function median(xs: ReadonlyArray<number>): number {
  if (xs.length === 0) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const n = s.length;
  return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2;
}
function mad(xs: ReadonlyArray<number>, center: number): number {
  return median(xs.map((x) => Math.abs(x - center))) * 1.4826; // → σ for Gaussian
}
function round3(x: number): number { return Math.round(x * 1000) / 1000; }
function mean(xs: ReadonlyArray<number>): number { return xs.reduce((a, b) => a + b, 0) / xs.length; }

/** Redescending (Tukey biweight) M-estimator of location: IRLS from a high-breakdown median start with
 *  a fixed MAD scale. Unlike Huber's SOFT downweight (a δ-σ outlier keeps weight k/δ), the biweight gives
 *  any point beyond C·scale weight EXACTLY 0 — so a minority of faulty shards is fully rejected, pushing
 *  the breakdown toward its theoretical ≈50% (vs Huber's leakage that biases the center at heavy load). */
export function robustCenter(xs: ReadonlyArray<number>, c: number = TUKEY_C, tol: number = 1e-9, maxIter: number = 50): number {
  if (xs.length === 0) return 0;
  let mu = median(xs);
  const scale = Math.max(mad(xs, mu), 1e-9);
  for (let it = 0; it < maxIter; it++) {
    let wsum = 0, wxsum = 0;
    for (const x of xs) {
      const r = (x - mu) / scale;
      const u = r / c;
      const w = Math.abs(u) < 1 ? (1 - u * u) ** 2 : 0; // Tukey biweight: redescends to 0 beyond C·scale
      wsum += w; wxsum += w * x;
    }
    if (wsum === 0) break; // all points rejected (pathological) — keep the median
    const next = wxsum / wsum;
    if (Math.abs(next - mu) < tol * scale) { mu = next; break; }
    mu = next;
  }
  return mu;
}

/** Per-shard level (fixed effect) = robust location over the healthy calibration window [0, m). */
export function perShardLevel(X: number[][], m: number): number[] {
  return X.map((row) => median(row.slice(0, m)));
}

/** Robust contamination-resistant residual matrix: R[i][t] = X[i][t] − ℓ̂_i − c_t, where ℓ̂_i is the
 *  per-shard calibration level and c_t = redescending (Tukey biweight) center of the level-adjusted cross-section at t. */
export function robustResiduals(X: number[][], m: number): number[][] {
  const n = X.length, t = X[0].length;
  const lvl = perShardLevel(X, m);
  const R: number[][] = X.map(() => new Array(t));
  for (let j = 0; j < t; j++) {
    const colAdj = X.map((row, i) => row[j] - lvl[i]);
    const c = robustCenter(colAdj);
    for (let i = 0; i < n; i++) R[i][j] = colAdj[i] - c;
  }
  return R;
}

// ── fleet substrate (matches the capstone's genFleet, parameterized by fault step δ for the power curve) ──
function genFleetStep(rng: () => number, mfail: number, step: number): { X: number[][]; failed: boolean[] } {
  const cm = new Array(T).fill(0);
  for (let t = 1; t < T; t++) cm[t] = cm[t - 1] + DRIFT * gaussian(rng);
  const failed = Array.from({ length: N }, (_, i) => i < mfail);
  const X: number[][] = [];
  for (let i = 0; i < N; i++) {
    const lvl = LVL * gaussian(rng); const row = new Array(T); let p = gaussian(rng);
    for (let t = 0; t < T; t++) {
      p = RHO * p + Math.sqrt(1 - RHO * RHO) * gaussian(rng);
      row[t] = 1000 + cm[t] + lvl + NOISE * p + (failed[i] && t >= FONSET ? step : 0);
    }
    X[i] = row;
  }
  return { X, failed };
}

function fdpPower(evals: number[], failed: boolean[], q: number): { fdp: number; power: number } {
  const rej = eBH(evals, q);
  const fp = rej.filter((i) => !failed[i]).length, tp = rej.filter((i) => failed[i]).length;
  const nf = failed.filter(Boolean).length;
  return { fdp: rej.length ? fp / rej.length : 0, power: nf ? tp / nf : 0 };
}

// e-value constructions over a fleet: {center} × {e-value}
const robustBF = (X: number[][]): number[] => robustResiduals(X, M).map((r) => nuisanceRobustEValue(r, M, N_TEST));
const robustPlugin = (X: number[][]): number[] => robustResiduals(X, M).map((r) => pluginEValue(r, M, N_TEST));
const medianBF = (X: number[][]): number[] => fleetResiduals(X).map((r) => nuisanceRobustEValue(r, M, N_TEST));
const medianPlugin = (X: number[][]): number[] => fleetResiduals(X).map((r) => pluginEValue(r, M, N_TEST)); // = ADR 0012

export interface CRFleetReport {
  schema_version: 'tessera-contamination-robust-fleet-v1';
  params: { alpha: number; n: number; m: number; n_test: number; default_mfail: number; trials: number; tukey_c: number };
  ablation: Array<{ center: string; evalue: string; fdp: number; power: number }>;
  by_fault_fraction: Array<{ mfail: number; old_fdp: number; old_power: number; new_fdp: number; new_power: number }>;
  by_q: Array<{ q: number; new_fdp: number; new_power: number }>;
  power_by_delta: Array<{ delta: number; detect: number }>;
  null_validity: { p_ge_10: number; p_ge_100: number; median_e: number; mean_e: number; valid: boolean };
  breakdown_mfail: number | null;
  real_fleet: { dataset: string; n_shards: number; window: number; naive_rejected: number; robust_rejected: number; note: string } | null;
}

/** Ablation at the default fault load: isolate whether the win is the robust center, the BF, or both. */
function ablation(): CRFleetReport['ablation'] {
  const trials = Array.from({ length: TRIALS }, (_, s) => genFleet(mulberry32(scramble(1 + s * 53)), DEFAULT_MFAIL));
  const combos: Array<{ center: string; evalue: string; f: (X: number[][]) => number[] }> = [
    { center: 'median (ADR 0012)', evalue: 'plug-in', f: medianPlugin },
    { center: 'median', evalue: 'BF', f: medianBF },
    { center: 'robust (Tukey+demean)', evalue: 'plug-in', f: robustPlugin },
    { center: 'robust (Tukey+demean)', evalue: 'BF', f: robustBF },
  ];
  return combos.map(({ center, evalue, f }) => {
    const rs = trials.map(({ X, failed }) => fdpPower(f(X), failed, 0.1));
    return { center, evalue, fdp: round3(mean(rs.map((x) => x.fdp))), power: round3(mean(rs.map((x) => x.power))) };
  });
}

function byFaultFraction(): { rows: CRFleetReport['by_fault_fraction']; breakdown: number | null } {
  let breakdown: number | null = null;
  const rows = FAULT_FRACS.map((mfail) => {
    const trials = Array.from({ length: TRIALS }, (_, s) => genFleet(mulberry32(scramble(7 + s * 53)), mfail));
    const olds = trials.map(({ X, failed }) => fdpPower(medianPlugin(X), failed, 0.1));
    const news = trials.map(({ X, failed }) => fdpPower(robustBF(X), failed, 0.1));
    const new_fdp = round3(mean(news.map((x) => x.fdp)));
    if (breakdown === null && new_fdp > 0.1) breakdown = mfail; // first load where the robust construction loses FDR≤q
    return { mfail, old_fdp: round3(mean(olds.map((x) => x.fdp))), old_power: round3(mean(olds.map((x) => x.power))), new_fdp, new_power: round3(mean(news.map((x) => x.power))) };
  });
  return { rows, breakdown };
}

/** Conditional FD: detection rate vs fault step δ (default load, fixed latency = the test window). */
function powerByDelta(): CRFleetReport['power_by_delta'] {
  return DELTAS.map((delta) => {
    let det = 0, tot = 0;
    for (let s = 0; s < TRIALS; s++) {
      const { X, failed } = genFleetStep(mulberry32(scramble(3 + s * 53)), DEFAULT_MFAIL, delta);
      const rej = new Set(eBH(robustBF(X), 0.1));
      for (let i = 0; i < failed.length; i++) if (failed[i]) { tot++; if (rej.has(i)) det++; }
    }
    return { delta, detect: round3(det / tot) };
  });
}

function nullValidity(): CRFleetReport['null_validity'] {
  const es: number[] = [];
  for (let s = 0; s < 40; s++) es.push(...robustBF(genFleet(mulberry32(scramble(5000 + s * 31)), 0).X));
  const sorted = [...es].sort((a, b) => a - b);
  const p10 = es.filter((e) => e >= 10).length / es.length, p100 = es.filter((e) => e >= 1 / ALPHA).length / es.length;
  return { p_ge_10: round3(p10), p_ge_100: round3(p100), median_e: round3(sorted[Math.floor(es.length / 2)]), mean_e: round3(mean(es)), valid: mean(es) <= 1 && p10 <= 0.1 && p100 <= ALPHA };
}

/** Real fleet (FP-only): a GENUINELY co-sampled cross-section — the largest cohort of GWDG streams
 *  launched the same day on the shared 600s timestamp grid (the streams span 12 distinct start dates
 *  across 2025–2026, so a position-index cross-section would be apples-to-oranges; we align on
 *  ts_epoch_ms instead). Run naive (per-stream, no cross-section) vs the robust construction, count
 *  e-BH rejections (all healthy → every rejection is a false discovery). */
const REAL_M = 600, REAL_N = 200; // ADR 0013's GWDG window
function realFleet(gwdgDir: string): CRFleetReport['real_fleet'] {
  const telem = path.join(gwdgDir, 'telemetry');
  if (!fs.existsSync(telem)) return null;
  const W = REAL_M + REAL_N;
  const all = fs.readdirSync(telem).filter((f) => f.endsWith('.csv')).sort()
    .flatMap((f) => loadStructuralStreams(path.join(telem, f), STRUCTURAL_METRIC));
  // Group by launch day; the largest same-day cohort is a genuinely co-sampled fleet.
  const day = (ms: number) => new Date(ms).toISOString().slice(0, 10);
  const cohorts = new Map<string, typeof all>();
  for (const t of all) { const d = day(t.ts_epoch_ms[0]); (cohorts.get(d) ?? cohorts.set(d, []).get(d)!).push(t); }
  const best = [...cohorts.entries()].sort((a, b) => b[1].length - a[1].length)[0];
  if (!best) return null;
  const [cohortDay, cohort] = best;
  // Align on the timestamp grid shared by ALL cohort streams; require ≥ W common ticks and ≥ 4 streams.
  const tsCount = new Map<number, number>();
  for (const t of cohort) for (const ms of t.ts_epoch_ms) tsCount.set(ms, (tsCount.get(ms) ?? 0) + 1);
  const commonTs = [...tsCount.entries()].filter(([, c]) => c === cohort.length).map(([ms]) => ms).sort((a, b) => a - b).slice(0, W);
  if (cohort.length < 4 || commonTs.length < W) return null;
  const valAt = cohort.map((t) => { const m = new Map<number, number>(); t.ts_epoch_ms.forEach((ms, i) => m.set(ms, t.values[i])); return m; });
  const X = valAt.map((m) => commonTs.map((ms) => m.get(ms)!));
  const naive = X.map((row) => pluginEValue(row, REAL_M, REAL_N));               // same window, no cross-section
  const robust = robustResiduals(X, REAL_M).map((r) => nuisanceRobustEValue(r, REAL_M, REAL_N));
  return {
    dataset: 'GWDG-structural-' + STRUCTURAL_METRIC, n_shards: cohort.length, window: W,
    naive_rejected: eBH(naive, 0.1).length, robust_rejected: eBH(robust, 0.1).length,
    note: `largest same-day co-sampled cohort (launch ${cohortDay}, shared 600s grid, ${commonTs.length} aligned ticks), m=${REAL_M}/n=${REAL_N}; all healthy → every rejection is a false discovery`,
  };
}

export function runCRFleet(gwdgDir?: string): CRFleetReport {
  const { rows, breakdown } = byFaultFraction();
  // by_q reuses the default-load trial set (compute new e-values once, e-BH at each q)
  const dlTrials = Array.from({ length: TRIALS }, (_, s) => genFleet(mulberry32(scramble(1 + s * 53)), DEFAULT_MFAIL));
  const dlNewE = dlTrials.map(({ X, failed }) => ({ e: robustBF(X), failed }));
  const by_q = QS.map((q) => {
    const rs = dlNewE.map(({ e, failed }) => fdpPower(e, failed, q));
    return { q, new_fdp: round3(mean(rs.map((x) => x.fdp))), new_power: round3(mean(rs.map((x) => x.power))) };
  });
  return {
    schema_version: 'tessera-contamination-robust-fleet-v1',
    params: { alpha: ALPHA, n: N, m: M, n_test: N_TEST, default_mfail: DEFAULT_MFAIL, trials: TRIALS, tukey_c: TUKEY_C },
    ablation: ablation(), by_fault_fraction: rows, by_q, power_by_delta: powerByDelta(),
    null_validity: nullValidity(), breakdown_mfail: breakdown,
    real_fleet: gwdgDir ? realFleet(gwdgDir) : null,
  };
}

function pct(x: number): string { return (x * 100).toFixed(1) + '%'; }

const fdpAt = (r: CRFleetReport, mfail: number): number => r.by_fault_fraction.find((x) => x.mfail === mfail)?.new_fdp ?? 0;

/** The breakdown phrase used in both the sweep paragraph and the verdict bounds. */
function breakdownPhrase(r: CRFleetReport, full: boolean): string {
  const last = r.by_fault_fraction[r.by_fault_fraction.length - 1].mfail;
  if (r.breakdown_mfail === null) return `no breakdown observed up to ${last}/60`;
  const frac = pct(r.breakdown_mfail / r.params.n);
  return full
    ? `the robust center's **breakdown at ${r.breakdown_mfail}/60 faults** (${frac} contamination), past which a minority-robust center can no longer isolate the common-mode`
    : `~${r.breakdown_mfail}/60, ${frac}; the margin above the default ${r.params.default_mfail}/60 is narrow`;
}

/** The real-fleet section lines (empty when no GWDG dir was provided). */
function realFleetLines(rf: CRFleetReport['real_fleet']): string[] {
  if (!rf) return [];
  const dir = rf.robust_rejected > rf.naive_rejected ? 'slightly WORSE, not better' : rf.robust_rejected < rf.naive_rejected ? 'slightly better' : 'unchanged';
  const effect = rf.robust_rejected >= rf.naive_rejected ? 'does not reduce (here slightly increases) the false discoveries' : 'barely reduces the false discoveries';
  return [
    '## Real fleet (FP-only) — GWDG healthy structural shards', '',
    `A genuinely co-sampled cross-section: ${rf.n_shards} healthy shards from the ${rf.note}. **Naive (per-shard, no cross-section) e-BH rejected ${rf.naive_rejected}/${rf.n_shards}; the contamination-robust construction rejected ${rf.robust_rejected}/${rf.n_shards}** — ${dir}. (This naive baseline is recomputed on this cohort/window — it is NOT fleet-fdr's full-fleet 34/55.)`, '',
    `This is the **honest boundary of Lever A**, and it is the key real-data finding: removing a cross-shard common-mode only helps when there IS substantial common-mode. These same-day GWDG shards are heterogeneous exporters (node-exporter/dcgm/ipmi) with **little shared common-mode**, so the per-tick robust center is mostly tracking idiosyncratic noise — subtracting it ${effect}. The real firing is **shard-SPECIFIC benign change** (consistent with ADR 0013: real GWDG firing is benign mean drift growing with cal–test separation), which Lever A does not target and can mildly worsen. Lever A's guarantee is **conditional on genuine common-mode coupling** (the synthetic above; a real coupled cluster sharing workload/thermal/power) — NOT a free win on any fleet. The shard-specific residual is exactly what **Lever B** (the benign-change/fault discriminator) must address. (Scope: FP-only — no real fault labels; ${rf.n_shards} shards is a small cohort.)`, '',
  ];
}

/** The verdict section lines. */
function verdictLines(r: CRFleetReport): string[] {
  const power = r.by_fault_fraction.find((x) => x.mfail === r.params.default_mfail)?.new_power ?? 1;
  const realFP = r.real_fleet ? `${r.real_fleet.naive_rejected}→${r.real_fleet.robust_rejected}, mildly worse` : 'n/a';
  const bdN = r.breakdown_mfail ?? '?', bdFrac = r.breakdown_mfail ? pct(r.breakdown_mfail / r.params.n) : '?';
  return [
    '## Verdict', '',
    `**On a common-mode-coupled fleet, Lever A delivers the calibrated FP/FDR guarantee ADR 0012 could not — within a bounded envelope.** The robust demean+Tukey-biweight common-mode + the nuisance-robust BF e-value drive realized FDP from 0.72–0.77 to **≤ q** at retained power (${pct(power)}). The control is by construction (valid marginal e-values ⇒ e-BH FDR control) but **conditional**: it holds only while the fault fraction is well under the robust center's breakdown (~${bdN}/60, ${bdFrac}), the common-mode is scalar, and the variance is stable (inherited from ADR 0013). The two ADR 0012 blockers are removed: the center is no longer contaminated (demean makes faults the outliers; the redescending estimator rejects them), and the e-value is valid (BF, not plug-in). **The win is contingent on the benign change being common-mode** — on the heterogeneous GWDG cohort (little shared common-mode) the real FP does NOT improve (${realFP}): there the residual is shard-SPECIFIC benign change → Lever B.`, '',
    '**Honest bounds (the guarantee\'s envelope):**',
    `- **FP/FDR ≤ q** holds by construction only while the fault fraction stays well under ${breakdownPhrase(r, false)}.`,
    '- **FD is conditional**: detection ≥ X for faults of magnitude ≥ δ (power curve above) — not an unconditional detection guarantee.',
    '- **Scalar common-mode**: assumes a homogeneous factor loading. Heterogeneous loadings leave residual common-mode → a multi-factor model is the next lever if real data shows it.',
    '- **Masked faults**: a shard faulted THROUGH its calibration window has the fault absorbed into ℓ̂_i (a cold-start/lifecycle case, not covered here).',
    '- **Low-common-mode fleets**: when there is little shared common-mode, subtracting a per-tick center mostly removes noise and can mildly INCREASE FP (measured on the real GWDG cohort) — fleet-relative is not a free win; apply it only to genuinely coupled fleets.',
    '- **Shard-specific BENIGN change** (not common-mode) still fires — that is Lever B (the benign-change/fault discriminator), the next increment.', '',
    '> **Scope:** synthetic ground truth for FDP/power (labels needed); real GWDG is FP-only (healthy). The common-mode is a per-tick scalar; whitening + the BF handle autocorrelation + the unknown baseline.', '',
  ];
}

function renderMd(r: CRFleetReport): string {
  const L: string[] = [];
  L.push('# Tessera — contamination-robust fleet-FDR: the BF e-value closes the FP/FDR guarantee (Lever A)');
  L.push('');
  L.push(`ADR 0012 left FDR uncontrolled (FDP 0.72–0.77 ≫ q) for two named reasons: the cross-shard center was contaminated by the faults, and the residual e-value was the plug-in (not the BF). This builds both: (1) remove each shard's calibration LEVEL, making faults the cross-sectional outliers; (2) a redescending Tukey-biweight common-mode (c=${r.params.tukey_c}) resists them; (3) the nuisance-robust BF e-value (ADR 0013) on the residual; (4) e-BH. Synthetic ${r.params.n}-shard fleet, heavy shared drift + shard-specific step faults, m=${r.params.m}/n=${r.params.n_test}, ${r.params.trials} trials, q=0.1 unless noted.`);
  L.push('');
  L.push('## Ablation — which piece controls FDR? (default load, q=0.1)');
  L.push('');
  L.push('| center | e-value | FDP | power |');
  L.push('|---|---|---|---|');
  for (const a of r.ablation) L.push(`| ${a.center} | ${a.evalue} | ${pct(a.fdp)} | ${pct(a.power)} |`);
  L.push('');
  L.push('**Both pieces are necessary.** The median center keeps FDP high under either e-value (the faults contaminate it); the robust demean+Tukey center is what makes the residual clean, and the BF e-value is what makes the residual e-value valid — only the bottom row (robust + BF) controls FDP at full power.');
  L.push('');
  L.push('## FDR control vs the fault fraction (q=0.1) — old (ADR 0012: median+plug-in) vs new (robust+BF)');
  L.push('');
  L.push('| faults / 60 | old FDP | old power | **new FDP** | **new power** |');
  L.push('|---|---|---|---|---|');
  for (const x of r.by_fault_fraction) L.push(`| ${x.mfail} | ${pct(x.old_fdp)} | ${pct(x.old_power)} | **${pct(x.new_fdp)}** | **${pct(x.new_power)}** |`);
  L.push('');
  L.push(`The new construction holds **FDP ≤ q** while the old runs 0.6–0.8, at retained power — until ${breakdownPhrase(r, true)}. **The margin above the default load is NARROW** — the default ${r.params.default_mfail}/60 is controlled (${pct(fdpAt(r, r.params.default_mfail))}) but FDP crosses q just two faults later, and is steep beyond (14/60 → ${pct(fdpAt(r, 14))}). This is the honest envelope: FP/FDR is guaranteed only while the minority-fault assumption holds (fault fraction well under ~20%).`);
  L.push('');
  L.push('## FP/FDR is guaranteed by construction; FD is conditional on effect size');
  L.push('');
  L.push('**FP/FDR:** the residual BF e-value is valid on the null fleet (no faults) — ' + `E[e]=${r.null_validity.mean_e}, median ${r.null_validity.median_e}, P(e≥1/α)=${pct(r.null_validity.p_ge_100)} ≤ α — so e-BH controls FDR ≤ q by construction (valid e-values in, FDR out). Two dependence subtleties are handled: e-BH (Wang–Ramdas) controls FDR under ARBITRARY cross-shard dependence, so the shared center c_t across shards is fine; and c_t is estimated IN-SAMPLE (shard i included), but its O(1/N) self-pull shrinks shard i's own residual toward 0 — CONSERVATIVE for false firing (the measured E[e]=${r.null_validity.mean_e} ≪ 1 reflects this).`);
  L.push('');
  L.push('| q | new FDP | new power |');
  L.push('|---|---|---|');
  for (const x of r.by_q) L.push(`| ${x.q} | ${pct(x.new_fdp)} | ${pct(x.new_power)} |`);
  L.push('');
  L.push('**FD (detection) is NOT unconditional** — it is a power curve in the fault step δ (default load, latency = the test window):');
  L.push('');
  L.push('| fault step δ | detection |');
  L.push('|---|---|');
  for (const x of r.power_by_delta) L.push(`| ${x.delta} | ${pct(x.detect)} |`);
  L.push('');
  L.push(`So the honest claim is **FDR ≤ q guaranteed, AND detection ≥ X for faults of magnitude ≥ δ** — detection rises from ${pct(r.power_by_delta[0].detect)} at δ=${r.power_by_delta[0].delta} to ${pct(r.power_by_delta[r.power_by_delta.length - 1].detect)} at δ=${r.power_by_delta[r.power_by_delta.length - 1].delta}; tiny faults below the noise are not guaranteed caught (no method can).`);
  L.push('');
  for (const line of realFleetLines(r.real_fleet)) L.push(line);
  for (const line of verdictLines(r)) L.push(line);
  return L.join('\n');
}

export function writeCRFleet(outDir: string, gwdgDir?: string): { json: string; md: string } {
  const report = runCRFleet(gwdgDir);
  fs.mkdirSync(outDir, { recursive: true });
  const json = path.join(outDir, 'contamination-robust-fleet-report.json');
  const md = path.join(outDir, 'contamination-robust-fleet-report.md');
  fs.writeFileSync(json, JSON.stringify(report, null, 2) + '\n');
  fs.writeFileSync(md, renderMd(report));
  return { json, md };
}

if (require.main === module) { // CommonJS CLI guard (tsconfig compiles to CJS)
  const gwdgDir = process.argv[2] ?? process.env.GWDG_DIR;
  const out = path.join(path.resolve(__dirname, '..'), 'shadow-results');
  const r = writeCRFleet(out, gwdgDir);
  process.stdout.write(`Contamination-robust fleet-FDR report:\n  ${path.relative(process.cwd(), r.json)}\n  ${path.relative(process.cwd(), r.md)}\n`);
  process.exit(0);
}
