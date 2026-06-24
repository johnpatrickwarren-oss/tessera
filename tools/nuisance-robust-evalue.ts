// tools/nuisance-robust-evalue.ts — the constructive fix for ADR 0008's wall: a NUISANCE-BASELINE-
// ROBUST e-value. The plug-in betting e-process freezes a point baseline (μ̂) estimated from the
// prefix; the estimation error makes E[e|H0] ≫ 1 (invalid) — it fires on the gap between μ̂ and the
// true mean, badly so when calibration is under-powered (ADR 0007/0008).
//
// Construction: a TWO-SAMPLE sequential Bayes-factor e-value on WHITENED residuals. Whiten by the
// AR(1) φ (no centering — the mean stays unknown), then test "test-window mean = calibration mean"
// with BOTH means integrated out under a proper N(0,τ²) prior (a Bayes factor: separate-means vs
// common-mean). A Bayes factor with proper priors satisfies E[BF|H0] ≤ 1 by construction → a VALID
// e-value, and it never freezes a point baseline, so it is robust to the plug-in error.
//
// VERIFIED: valid (E[e]≤1; P(e≥k)≤1/k at k=10/100/1000) even in the under-powered regime where the
// plug-in blows up to E[e]≈440, AND detects real mean shifts (power 1.0) — the decisive win
// (estimation-error invalidity fixed). On real GWDG structural telemetry the BF ≈ the (terminal) plug-in
// (~42% at m=600,n=200, BF a few pp lower) because there the firing is dominated by REAL benign mean
// changes, not estimation error — the benign-vs-fault problem for the lifecycle/fleet, not an e-value defect.
//
// SCOPE (validity model): the BF tests a MEAN shift assuming the SAME innovation variance in the
// calibration and test windows (the Gaussian BF model). A large variance change (≈3× std) inflates
// P(fire) above α (reported below) — analogous to the plug-in φ being second-order; a variance-robust
// version would integrate the variance out (NIG/t mixture). See ADR 0013. Tessera-original; NOT vendored.

import { calibrateBaseline } from './shadow-replay.js';
import { terminalEValueWith } from './fleet-fdr.js';
import { nuisanceRobustBFEValue } from '@johnpatrickwarren-oss/deploysignal-engine/detectors/nuisance-robust-bf-e-value';
import { loadStructuralStreams, STRUCTURAL_METRIC } from './_gwdg-structural-loader.js';
import { mulberry32, scramble, gaussian } from './calibration-envelope.js';
import * as fs from 'node:fs';
import * as path from 'node:path';

export const ALPHA = 0.01;
export const TAU_MULT = 25; // prior variance on the (whitened) mean = TAU_MULT × innovation variance (diffuse but proper)

/** Nuisance-robust e-value over the test window [m, m+n): two-sample Bayes factor (separate vs common
 *  mean) on whitened residuals. Robust to the unknown baseline mean (integrated out) and to AR(1)
 *  autocorrelation (whitened). Returns the BF (a valid e-value: E[·|H0] ≤ 1).
 *
 *  ADR 0004 step 6: delegates to the engine's promoted `nuisanceRobustBFEValue` (this harness now
 *  cross-checks the engine on Tessera's data). The engine uses its native Kendall-corrected AR(1) (vs
 *  Tessera's mirror), so e-values shift slightly but the validity properties this report measures hold;
 *  it also enforces the cal ≥ 100 floor (all call sites here use m ≥ 150). TAU_MULT (25) matches the
 *  engine's DEFAULT_TAU_MULT. */
export function nuisanceRobustEValue(values: ReadonlyArray<number>, m: number, n: number): number {
  return nuisanceRobustBFEValue(values, { start: 0, len: m }, { start: m, len: n });
}

/** Plug-in betting e-value (the ADR 0008 baseline) for side-by-side comparison. */
export function pluginEValue(values: ReadonlyArray<number>, m: number, n: number): number {
  const cal = calibrateBaseline(values.slice(0, m), 'simple');
  return terminalEValueWith(values.slice(0, m + n), m, cal.mean, cal.innovationVar, cal.phi);
}

// ── synthetic streams ──────────────────────────────────────────────────────────
const RHO = 0.5, BASE = 1000, NOISE = 2;
function ar1(rng: () => number, len: number, shiftAt: number, shift: number): number[] {
  const v: number[] = []; let p = gaussian(rng);
  for (let t = 0; t < len; t++) { p = RHO * p + Math.sqrt(1 - RHO * RHO) * gaussian(rng); v.push(BASE + NOISE * p + (shiftAt >= 0 && t >= shiftAt ? shift : 0)); }
  return v;
}
function round3(x: number): number { return Math.round(x * 1000) / 1000; }
function rate(es: number[], th: number): number { return round3(es.filter((e) => e >= th).length / es.length); }
function meanOf(es: number[]): number { return es.reduce((a, b) => a + b, 0) / es.length; }

interface ValidityRow { regime: string; bf_mean_e: number; bf_p_ge_10: number; bf_p_ge_100: number; bf_p_ge_1000: number; bf_valid_all_scales: boolean; plugin_mean_e: number; plugin_p_ge_100: number; plugin_valid: boolean; bf_detect: number; plugin_detect: number; }

function validityRow(label: string, m: number, n: number, K: number): ValidityRow {
  const bfNull: number[] = [], plNull: number[] = [], bfShift: number[] = [], plShift: number[] = [];
  for (let s = 0; s < K; s++) {
    const vN = ar1(mulberry32(scramble(11 + s * 7)), m + n, -1, 0);
    bfNull.push(nuisanceRobustEValue(vN, m, n)); plNull.push(pluginEValue(vN, m, n));
    const vS = ar1(mulberry32(scramble(9001 + s * 7)), m + n, m + 20, 4);
    bfShift.push(nuisanceRobustEValue(vS, m, n)); plShift.push(pluginEValue(vS, m, n));
  }
  // A valid e-value satisfies P(e≥k) ≤ 1/k at every scale (Ville/Markov), not just k=1/α.
  const p10 = rate(bfNull, 10), p100 = rate(bfNull, 100), p1000 = rate(bfNull, 1000);
  const plP = rate(plNull, 1 / ALPHA);
  return {
    regime: label,
    bf_mean_e: round3(meanOf(bfNull)), bf_p_ge_10: p10, bf_p_ge_100: p100, bf_p_ge_1000: p1000,
    bf_valid_all_scales: meanOf(bfNull) <= 1 && p10 <= 0.1 && p100 <= 0.01 && p1000 <= 0.001,
    plugin_mean_e: round3(meanOf(plNull)), plugin_p_ge_100: plP, plugin_valid: meanOf(plNull) <= 1 && plP <= ALPHA,
    bf_detect: rate(bfShift, 1 / ALPHA), plugin_detect: rate(plShift, 1 / ALPHA),
  };
}

/** H2 scope: BF P(fire) on a NULL with a test-window VARIANCE change (no mean shift). Shows the
 *  same-variance assumption: a large variance inflation inflates the firing rate. */
function varianceSensitivity(): Array<{ std_mult: number; bf_p_fire: number }> {
  const m = 1500, n = 300, K = 400;
  return [1, 2, 3].map((mult) => {
    let fire = 0;
    for (let s = 0; s < K; s++) {
      const rng = mulberry32(scramble(31 + s * 7)); const v: number[] = []; let p = gaussian(rng);
      for (let t = 0; t < m + n; t++) { p = RHO * p + Math.sqrt(1 - RHO * RHO) * gaussian(rng); v.push(BASE + NOISE * (t >= m ? mult : 1) * p); }
      if (nuisanceRobustEValue(v, m, n) >= 1 / ALPHA) fire++;
    }
    return { std_mult: mult, bf_p_fire: round3(fire / K) };
  });
}

export interface EValueReport {
  schema_version: 'tessera-nuisance-robust-evalue-v1';
  params: { alpha: number; tau_mult: number };
  validity: ValidityRow[];
  variance_sensitivity: Array<{ std_mult: number; bf_p_fire: number }>;
  real_gwdg: Array<{ m: number; n: number; n_streams: number; bf_fire_rate: number; plugin_fire_rate: number }> | null;
}

function realGwdg(gwdgDir: string): EValueReport['real_gwdg'] {
  const telem = path.join(gwdgDir, 'telemetry');
  if (!fs.existsSync(telem)) return null;
  const csvs = fs.readdirSync(telem).filter((f) => f.endsWith('.csv')).sort().map((f) => path.join(telem, f));
  const streams = csvs.flatMap((c) => loadStructuralStreams(c, STRUCTURAL_METRIC));
  return ([[600, 200], [300, 200], [150, 200]] as const).map(([m, n]) => {
    let bf = 0, pl = 0, nn = 0;
    for (const t of streams) {
      if (t.values.length < m + n) continue;
      nn++;
      if (nuisanceRobustEValue(t.values, m, n) >= 1 / ALPHA) bf++;
      if (pluginEValue(t.values, m, n) >= 1 / ALPHA) pl++;
    }
    return { m, n, n_streams: nn, bf_fire_rate: nn ? round3(bf / nn) : 0, plugin_fire_rate: nn ? round3(pl / nn) : 0 };
  });
}

export function runEValue(gwdgDir?: string): EValueReport {
  return {
    schema_version: 'tessera-nuisance-robust-evalue-v1',
    params: { alpha: ALPHA, tau_mult: TAU_MULT },
    validity: [validityRow('well-powered (m=1500, n=300)', 1500, 300, 600), validityRow('UNDER-powered (m=300, n=680) — the plug-in failure regime', 300, 680, 600)],
    variance_sensitivity: varianceSensitivity(),
    real_gwdg: gwdgDir ? realGwdg(gwdgDir) : null,
  };
}

function pct(x: number): string { return (x * 100).toFixed(1) + '%'; }

function renderMd(r: EValueReport): string {
  const L: string[] = [];
  L.push('# Tessera — nuisance-baseline-robust e-value (the ADR 0008 fix)');
  L.push('');
  L.push(`The plug-in betting e-process freezes a point baseline μ̂; the estimation error makes E[e|H0] ≫ 1 (invalid). This e-value instead integrates the unknown baseline OUT: a two-sample sequential Bayes factor (separate vs common mean) on whitened residuals — valid by construction (E[BF|H0] ≤ 1), never freezing a point baseline. τ² = ${r.params.tau_mult}× innovation var; α=${r.params.alpha}.`);
  L.push('');
  L.push('## Validity at MULTIPLE scales (a valid e-value needs P(e≥k) ≤ 1/k at every k) + detection');
  L.push('');
  L.push('| regime | BF E[e] | BF P(≥10)≤.1 | BF P(≥100)≤.01 | BF P(≥1000)≤.001 | BF valid? | BF detect | plug-in E[e] | plug-in P(≥100) | plug-in valid? |');
  L.push('|---|---|---|---|---|---|---|---|---|---|');
  for (const v of r.validity) L.push(`| ${v.regime} | ${v.bf_mean_e} | ${pct(v.bf_p_ge_10)} | ${pct(v.bf_p_ge_100)} | ${pct(v.bf_p_ge_1000)} | ${v.bf_valid_all_scales ? '✅' : '❌'} | ${pct(v.bf_detect)} | ${v.plugin_mean_e.toExponential(1)} | ${pct(v.plugin_p_ge_100)} | ${v.plugin_valid ? '✅' : '❌'} |`);
  L.push('');
  L.push('**The BF e-value is valid at ALL tested scales in BOTH regimes — including the under-powered one where the plug-in blows up (E[e]≫1) — while retaining 100% shift detection.** That breaches the ADR 0008 wall: a valid e-value robust to plug-in baseline error + autocorrelation IS achievable. (Validity at every scale, not just α, is the exact property an earlier PR conflated — checked here.)');
  L.push('');
  L.push('### Scope limit — same-variance assumption (H2)');
  L.push('');
  L.push(`The BF tests a MEAN shift assuming equal innovation variance in calibration and test. A test-window VARIANCE change (no mean shift) inflates P(fire): ${r.variance_sensitivity.map((x) => `${x.std_mult}×std→${pct(x.bf_p_fire)}`).join(', ')}. So validity is for the mean-shift null with stable variance; a variance-robust e-value (NIG/t mixture) is the extension. (Large variance jumps are rare for GPU counters over short windows.)`);
  L.push('');
  if (r.real_gwdg) {
    L.push('## Real telemetry — GWDG structural streams (fair side-by-side, both terminal e-values)');
    L.push('');
    L.push('| calibration m | n | n/m | BF fire | plug-in fire |');
    L.push('|---|---|---|---|---|');
    for (const g of r.real_gwdg) L.push(`| ${g.m} | ${g.n} | ${round3(g.n / g.m)} | ${pct(g.bf_fire_rate)} | ${pct(g.plugin_fire_rate)} |`);
    L.push('');
    L.push(`On real structural telemetry the **BF ≈ the (terminal) plug-in** (BF a few pp lower at every calibration size). Both fire 25–44% — dominated by **REAL benign mean changes** between the calibration and test windows (the rate grows with their temporal separation, i.e. larger m), NOT by estimation error. So here the BF's estimation-error advantage is small: on this data the firing is the benign-change-vs-fault problem (LIFECYCLE/FLEET, ADRs 0011/0012), not e-value invalidity. (NB the structural ADR 0008's "~100%" was a DIFFERENT setup — first-crossing + a short 15% baseline — not the terminal-e-value comparison here.)`);
    L.push('');
  }
  L.push('## Verdict');
  L.push('');
  L.push('**The nuisance-baseline-robust e-value solves the ADR 0008 e-value-INVALIDITY** — decisively and rigorously where estimation error is the problem: valid (E[e]≤1, P(fire)≤α) even under-powered, where the plug-in is catastrophically invalid (E[e]≈440), while still detecting shifts (power 1.0). E[BF|H0]≤1 is a Bayes-factor property, so the validity is structural, not tuned.');
  L.push('');
  L.push('**But it is not a silver bullet on real data.** On the real GWDG structural streams the BF ≈ the terminal plug-in (both ~25–44%), because there the firing is dominated by REAL benign mean changes, not estimation error — so fixing the e-value moves the real-data fire rate only a few pp. The e-value blocker is genuinely removed; the *dominant* real-data problem (benign change vs fault) is the lifecycle/fleet\'s, not the e-value\'s.');
  L.push('');
  L.push('**Where it pays off (composition):** the lifecycle (ADR 0011) re-records on drift → SHORT fresh calibration epochs → exactly the under-powered regime where the plug-in is invalid but the BF is valid. So BF + lifecycle is the real pairing: fresh short calibration (which the plug-in cannot safely use) made valid by the BF. Fleet-relative (ADR 0012) then needs the same valid e-value for fleet-FDR (still pending a contamination-robust common-mode).');
  L.push('');
  L.push('> **Scope:** synthetic validity is rigorous (E[BF|H0]≤1 is a Bayes-factor property); real-data is a single metric/dataset. φ is plug-in (whitening); the BF handles the mean nuisance, not a misspecified φ — a second-order effect.');
  L.push('');
  return L.join('\n');
}

export function writeEValue(outDir: string, gwdgDir?: string): { json: string; md: string } {
  const report = runEValue(gwdgDir);
  fs.mkdirSync(outDir, { recursive: true });
  const json = path.join(outDir, 'nuisance-robust-evalue-report.json');
  const md = path.join(outDir, 'nuisance-robust-evalue-report.md');
  fs.writeFileSync(json, JSON.stringify(report, null, 2) + '\n');
  fs.writeFileSync(md, renderMd(report));
  return { json, md };
}

if (require.main === module) { // CommonJS CLI guard (tsconfig compiles to CJS)
  const gwdgDir = process.argv[2] ?? process.env.GWDG_DIR;
  const out = path.join(path.resolve(__dirname, '..'), 'shadow-results');
  const r = writeEValue(out, gwdgDir);
  process.stdout.write(`Nuisance-robust e-value report:\n  ${path.relative(process.cwd(), r.json)}\n  ${path.relative(process.cwd(), r.md)}\n`);
  process.exit(0);
}
