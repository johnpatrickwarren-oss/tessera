// tools/mode-b-control.ts — the MODE B concurrent-control harness (ADR 0019 follow-up #3): the
// ACHIEVABLE FDR guarantee, via a SPATIAL null instead of an (uncertifiable) temporal one.
//
// THE IDEA (ADR 0019 rule 2). Everything that broke fleet-FDR was the TEMPORAL per-shard null: validity
// over a long horizon on nonstationary telemetry, where time-varying drift defeats finite-sample
// certification. N1 says only the cross-shard CONTRAST separates drift from a real fault. So Mode B's
// natural, achievable home is COMPARATIVE: treatment vs a CONCURRENT CONTROL that shares the same
// common-mode factors. The contrast d_i = treatment_i − control_i cancels the shared nonstationarity
// EXACTLY (per shard, by design — not approximately, the way a cross-sectional median does), leaving a
// stationary idiosyncratic null under H0 and a mean-shift under H1. The CONTROL *is* the null. This is
// the DeploySignal heritage (canary vs fleet, treatment vs control).
//
// WHY THE CONTRAST BEATS fleet-relative (ADR 0012). The cross-sectional median removes the MEDIAN
// loading's worth of common-mode; with heterogeneous per-shard loadings β_i it leaves residual β_i·cm in
// every shard, which a near-unit-root cm inflates into spurious e-value mass → FDP ≫ q (ADR 0012's
// "separates faults but does not control FDR"). A PAIRED control sharing β_i·cm[t] removes it exactly.
// That exact cancellation is what turns a non-certifiable temporal problem into a construction-valid
// spatial one.
//
// WIRES #1 AND #2 LIVE. The contrast emitter is `construction_valid` — BUT only while a runtime
// calibration monitor (tools/calibration-monitor.ts, follow-up #2) confirms the cancellation actually
// holds on the live control cohort. We feed the monitor the KNOWN-NULL contrasts of the HEALTHY cohort
// (treatment−control of ground-truth-healthy shards — see constructionNullFeed; knowable only in a
// harness, where the labels exist. In production the analogous feed is the control arm itself); if
// the construction is sound it passes and the emitter stays Mode B; if the control does NOT in fact share
// the factors (a broken construction) the monitor REVOKES and the validity-class gate
// (tools/emitter-contract.ts, follow-up #1) demotes the emitter B→A and we ABSTAIN from the FDR claim.
// Then — and only then — we call the GATED `fdrBenjaminiHochberg`.
//
// SCOPE. This is a SELF-CONTAINED synthetic ground-truth harness (the house pattern, cf.
// tools/fleet-fdr.ts experiment B): it constructs the hard case — a near-unit-root shared common-mode
// random walk with heterogeneous loadings + injected mean-shift faults — and MEASURES that the spatial
// null delivers FDP ≤ q with power where the temporal per-shard null does not. The PRODUCTION path is a
// clustersynth scenario with a labeled fault-free CONTROL ARM sharing the same factor instances; that is
// a small clustersynth addition + a ≥2-month scale run on the mac mini (see decisions/0019 follow-ups).
// Tessera-original; NOT vendored.

import { mulberry32, gaussian, scramble } from './calibration-envelope.js';
import { normalizedMixtureEValue } from './mixture-evalue.js';
import { eFromNormalizedMixture } from './e-value.js';
import { applyCalibrationMonitor } from './calibration-monitor.js';
import { certifiedFdrBenjaminiHochberg, modeOf, type EmitterContract } from './emitter-contract.js';
import { estimateAr1, whiten } from './per-shard-whitening.js';
import { autocorr } from './conditional-markov.js';
import { eBenjaminiHochberg } from '@johnpatrickwarren-oss/deploysignal-engine/fleet/e-bh';

export interface ModeBParams {
  N: number;          // shards (each a treatment unit paired with a concurrent control)
  MFAIL: number;      // faulted treatment shards
  T: number;          // ticks
  ONSET: number;      // fault onset tick
  STEP: number;       // mean-shift magnitude on faulted treatment shards
  rhoCm: number;      // common-mode AR(1) — STATIONARY but PERSISTENT (near unit root); ADR 0011/0012:
                      //   use stationary AR(1), NOT an integrated random walk (the latter breaks FDP).
  cmSd: number;       // common-mode innovation SD (its persistence amplifies this)
  noiseSd: number;    // idiosyncratic noise SD
  rhoIdio: number;    // idiosyncratic AR(1) coefficient
  q: number;          // target FDR
}

export const DEFAULT_PARAMS: ModeBParams = {
  N: 120, MFAIL: 12, T: 400, ONSET: 200, STEP: 2.0,
  rhoCm: 0.95, cmSd: 1.0, noiseSd: 1.0, rhoIdio: 0.4, q: 0.1,
};

/** One AR(1) series (unit-variance innovations × sd). */
function ar1(rng: () => number, T: number, rho: number, sd: number): number[] {
  const v = new Array<number>(T);
  let p = gaussian(rng);
  for (let t = 0; t < T; t++) { p = rho * p + Math.sqrt(1 - rho * rho) * gaussian(rng); v[t] = sd * p; }
  return v;
}

export interface PairedFleet { treat: number[][]; ctrl: number[][]; failed: boolean[]; }

/** An integrated (random-walk) series — the nonstationarity AR(1) whitening CANNOT remove (ADR 0011/0012:
 *  a random-walk common-mode breaks FDP). Used for the BROKEN control arm. */
function randomWalk(rng: () => number, T: number, stepSd: number): number[] {
  const c = new Array<number>(T).fill(0);
  for (let t = 1; t < T; t++) c[t] = c[t - 1] + stepSd * gaussian(rng);
  return c;
}

/** Build a paired treatment/control fleet over a shared persistent (stationary AR(1)) common-mode with
 *  heterogeneous per-shard loadings. If `sharedControl` is false, the control's common-mode is an
 *  independent INTEGRATED random walk that does NOT cancel and that single-φ whitening cannot remove (a
 *  BROKEN construction that genuinely breaks FDR) — used to show the calibration monitor catches it and
 *  the gate demotes B→A so we abstain rather than emit a wrong guarantee. */
export function genPairedFleet(rng: () => number, p: ModeBParams, sharedControl = true): PairedFleet {
  const cm = ar1(rng, p.T, p.rhoCm, p.cmSd);
  const cmCtrl = sharedControl ? cm : randomWalk(rng, p.T, p.cmSd * 0.5); // broken → integrated leftover
  const failed = Array.from({ length: p.N }, (_, i) => i < p.MFAIL);
  const treat: number[][] = [], ctrl: number[][] = [];
  for (let i = 0; i < p.N; i++) {
    const beta = 0.6 + 0.8 * rng(); // heterogeneous loading in [0.6, 1.4]
    const nt = ar1(rng, p.T, p.rhoIdio, p.noiseSd);
    const nc = ar1(rng, p.T, p.rhoIdio, p.noiseSd);
    treat.push(nt.map((e, t) => beta * cm[t] + e + (failed[i] && t >= p.ONSET ? p.STEP : 0)));
    ctrl.push(nc.map((e, t) => beta * cmCtrl[t] + e));
  }
  return { treat, ctrl, failed };
}

/** Robust scale (1.4826·MAD) over a slice. */
function madScale(xs: ReadonlyArray<number>, len: number): number {
  const a = xs.slice(0, Math.max(1, len)).sort((x, y) => x - y);
  const med = a[a.length >> 1];
  const ad = a.map((x) => Math.abs(x - med)).sort((x, y) => x - y);
  return Math.max(1.4826 * ad[ad.length >> 1], 1e-6);
}

/** Whiten a series at the AR(1) φ estimated from its pre-onset prefix, then standardize by the robust
 *  location+scale of the whitened prefix. Whitening removes serial dependence so the mixture e-value
 *  (which assumes a white null) is calibrated; a SUSTAINED level-shift fault SURVIVES whitening
 *  (x_t − φ·x_{t−1} ≈ (1−φ)·STEP in steady state) — which is exactly why a concurrent control beats
 *  differencing the raw signal: the contrast cancels the common-mode WITHOUT differencing away the
 *  fault, and light whitening then handles only the residual idiosyncratic AR(1). */
function whitenStandardizePrefix(v: ReadonlyArray<number>, prefix: number): number[] {
  const pre = v.slice(0, Math.max(2, prefix));
  const { phi } = estimateAr1(pre);
  const w = v.map((x, t) => whiten(x, t > 0 ? v[t - 1] : null, phi));
  const a = w.slice(0, Math.max(1, prefix)).sort((x, y) => x - y);
  const med = a[a.length >> 1];
  const s = madScale(w, prefix);
  return w.map((x) => (x - med) / s);
}

/** The per-shard CONTRAST treatment−control. The shared common-mode cancels EXACTLY (same loading,
 *  same factor instances), leaving a stationary idiosyncratic null + any fault. */
function pairedContrast(treatI: ReadonlyArray<number>, ctrlI: ReadonlyArray<number>): number[] {
  return treatI.map((x, t) => x - ctrlI[t]);
}

/** The SPATIAL-null e-value: whiten+standardize the contrast, then the normalized-mixture e-value. */
function contrastEValue(treatI: ReadonlyArray<number>, ctrlI: ReadonlyArray<number>, prefix: number): number {
  return normalizedMixtureEValue(whitenStandardizePrefix(pairedContrast(treatI, ctrlI), prefix));
}

/** The TEMPORAL-null e-value (the approach ADR 0019 showed fails): whiten+standardize the treatment by
 *  its OWN pre-onset prefix — no control — so the persistent common-mode leaks through (single-φ
 *  whitening cannot remove a two-timescale mix, and the fault is attenuated by differencing). */
function temporalEValue(treatI: ReadonlyArray<number>, prefix: number): number {
  return normalizedMixtureEValue(whitenStandardizePrefix(treatI, prefix));
}

/** The emitter contract for the concurrent-control contrast. `construction_valid`, gated by the live
 *  calibration monitor verdict. */
export function controlContrastEmitter(calibrationMonitorPassing: boolean): EmitterContract {
  return {
    id: 'mode-b/control-contrast',
    baselineVersion: 'concurrent-control (spatial null)',
    conditioningVariables: ['paired control shard (shares common-mode factor instances)'],
    residualizer: 'treatment − concurrent control, prefix-standardized',
    increment: 'normalized convex-mixture e-value (mixture-evalue.ts)',
    stoppingAggregation: 'per-shard running-max → fleet e-BH',
    horizon: 'monitoring window',
    validityClass: 'construction_valid',
    calibrationMonitorPassing,
  };
}

/** The KNOWN-NULL feed for the calibration monitor: the FULL-horizon whitened+standardized contrast on
 *  the HEALTHY (control-cohort) shards. Faults live on the treatment arm, so a healthy shard's contrast
 *  is null for ALL t — which is the whole point of a CONCURRENT control: the monitor watches the same
 *  construction over the SAME horizon the detector runs on, not a prefix. (A prefix-only feed is the ADR
 *  0019 prefix-audit NO-GO: drift that worsens after the prefix is invisible. The spatial control is what
 *  makes a full-horizon null available.) With a shared control the contrast cancels to a clean white null
 *  → monitor passes; with a broken (integrated) control it retains a random walk single-φ whitening
 *  cannot remove → over the full horizon E[g] > 1 → monitor revokes. In production this is the control
 *  arm; here we use the harness's known-healthy set. */
function constructionNullFeed(fleet: PairedFleet, prefix: number): number[][] {
  const out: number[][] = [];
  fleet.treat.forEach((tI, i) => { if (!fleet.failed[i]) out.push(whitenStandardizePrefix(pairedContrast(tI, fleet.ctrl[i]), prefix)); });
  return out;
}

/** Wall-A whiteness check on the control cohort: the construction is conditionally white only if a broad
 *  majority of the (already whitened) control residuals have small |lag-1 autocorrelation|. An integrated
 *  drift that single-φ whitening could not remove leaves a positively-autocorrelated residual and fails
 *  this — the serial-dependence failure mode the marginal ∏g monitor is weak against. */
function controlResidualWhite(nullFeed: ReadonlyArray<ReadonlyArray<number>>, thresh = 0.1, frac = 0.5): boolean {
  if (!nullFeed.length) return false;
  const white = nullFeed.filter((r) => Math.abs(autocorr(r as number[], 1)) <= thresh).length;
  return white / nullFeed.length >= frac;
}

function score(rej: ReadonlyArray<number>, failed: ReadonlyArray<boolean>): { fdp: number; power: number; K: number } {
  const fp = rej.filter((i) => !failed[i]).length;
  const tp = rej.filter((i) => failed[i]).length;
  const nFail = failed.filter(Boolean).length;
  return { fdp: rej.length ? fp / rej.length : 0, power: nFail ? tp / nFail : 0, K: rej.length };
}

export interface ModeBTrial {
  modeBFdp: number; modeBPower: number; modeBK: number;
  temporalFdp: number; temporalPower: number; temporalK: number;
  ungatedFdp: number; // FDP if e-BH ran on the contrast REGARDLESS of the monitor (what the gate prevents)
  monitorPassing: boolean; mode: 'A' | 'B';
}

/** One trial: build the paired fleet, run the calibration monitor on the control cohort, GATE on its
 *  verdict, then (Mode B) gated-e-BH on the contrast vs (temporal) e-BH on the raw treatment. */
export function modeBTrial(seed: number, p: ModeBParams, sharedControl = true): ModeBTrial {
  const fleet = genPairedFleet(mulberry32(scramble(seed)), p, sharedControl);
  // Baseline (scale + AR(1) φ) is estimated on the FULL pre-onset null window — all of [0, ONSET) is
  // healthy. A short prefix mis-estimates the scale and the plug-in noise alone inflates the e-value's
  // healthy mean far above 1 (the ADR 0007/0019 plug-in-baseline failure), so use all the null data —
  // the production analogue is the ≥2-month baseline window (baseline-guard).
  const prefix = p.ONSET;

  // Construction validity is checked on the known-null control cohort with TWO complementary diagnostics
  // (each covers the other's blind spot):
  //   (a) the anytime-valid ∏g calibration monitor (#2) — catches MARGINAL mis-calibration (mean/scale);
  //   (b) a Wall-A whiteness check — catches the SERIAL-dependence residual the marginal monitor misses
  //       (an integrated drift survives single-φ whitening as a near-mean-zero autocorrelated residual
  //       that the SR detector compounds into spurious selections). Mode B requires BOTH.
  const nullFeed = constructionNullFeed(fleet, prefix);
  // ADR 0027 family coherence: this emitter accumulates GAUSSIAN-family increments
  // (normalizedMixtureEValue default), so the monitor must test that family.
  const { monitor } = applyCalibrationMonitor(controlContrastEmitter(true), nullFeed, { incrementKind: 'gaussian' });
  const white = controlResidualWhite(nullFeed);
  const contract = controlContrastEmitter(monitor.passing && white);
  const mode = modeOf(contract);

  // #1 LIVE: only a Mode-B (passing) emitter may carry the FDR guarantee. The UNGATED selection (e-BH on
  // the contrast regardless of the monitor) shows what the gate is protecting against on a broken control.
  const contrastE = fleet.treat.map((tI, i) => contrastEValue(tI, fleet.ctrl[i], prefix));
  // anchor:allow certified-fdr-path: deliberate NEGATIVE comparators — this ungated selection is what the Mode-B gate is being measured against, and the temporal no-control baseline below is the honestly-Mode-A comparator; the guarantee-bearing selection goes through certifiedFdrBenjaminiHochberg on the next line.
  const ungatedRej = [...eBenjaminiHochberg(contrastE, p.q).selected];
  const modeBRej: ReadonlyArray<number> = mode === 'B'
    ? certifiedFdrBenjaminiHochberg(contrastE.map(eFromNormalizedMixture), p.q, contract, 'mode-b-control').selected
    : []; // demoted → abstain from the FDR claim
  const mb = score(modeBRej, fleet.failed);

  // Temporal baseline (no control) — the failing comparator. Not gated (it is honestly Mode A / no claim).
  const temporalE = fleet.treat.map((tI) => temporalEValue(tI, prefix));
  const tr = score([...eBenjaminiHochberg(temporalE, p.q).selected], fleet.failed);

  return {
    modeBFdp: mb.fdp, modeBPower: mb.power, modeBK: mb.K,
    temporalFdp: tr.fdp, temporalPower: tr.power, temporalK: tr.K,
    ungatedFdp: score(ungatedRej, fleet.failed).fdp,
    monitorPassing: contract.calibrationMonitorPassing === true, mode,
  };
}

export interface ModeBReport {
  schema_version: 'tessera-mode-b-control-v1';
  params: ModeBParams;
  trials: number;
  modeB: { mean_fdp: number; mean_power: number; mean_k: number; fdr_controlled: boolean };
  temporal: { mean_fdp: number; mean_power: number; mean_k: number };
  broken_construction: { monitor_revoked_frac: number; demoted_to_mode_a_frac: number; ungated_mean_fdp: number; gated_mean_fdp: number };
}

const round3 = (x: number): number => Math.round(x * 1000) / 1000;

/** Run the harness: TRIALS valid-construction trials (measure Mode-B vs temporal FDP/power) plus a small
 *  broken-construction batch (control on an independent drift) to show the monitor revokes → demotes. */
export function runModeBControl(p: ModeBParams = DEFAULT_PARAMS, trials = 300): ModeBReport {
  const outs: ModeBTrial[] = [];
  for (let s = 0; s < trials; s++) outs.push(modeBTrial(0x3110 + s * 7919, p, true));
  const mean = (f: (o: ModeBTrial) => number) => round3(outs.reduce((a, o) => a + f(o), 0) / outs.length);

  const broken: ModeBTrial[] = [];
  for (let s = 0; s < Math.max(20, trials >> 2); s++) broken.push(modeBTrial(0xB0BB + s * 7919, p, false));
  const revoked = broken.filter((o) => !o.monitorPassing).length / broken.length;
  const demoted = broken.filter((o) => o.mode === 'A').length / broken.length;
  const bmean = (f: (o: ModeBTrial) => number) => round3(broken.reduce((a, o) => a + f(o), 0) / broken.length);

  return {
    schema_version: 'tessera-mode-b-control-v1',
    params: p, trials,
    modeB: { mean_fdp: mean((o) => o.modeBFdp), mean_power: mean((o) => o.modeBPower), mean_k: mean((o) => o.modeBK), fdr_controlled: mean((o) => o.modeBFdp) <= p.q },
    temporal: { mean_fdp: mean((o) => o.temporalFdp), mean_power: mean((o) => o.temporalPower), mean_k: mean((o) => o.temporalK) },
    broken_construction: {
      monitor_revoked_frac: round3(revoked), demoted_to_mode_a_frac: round3(demoted),
      ungated_mean_fdp: bmean((o) => o.ungatedFdp), gated_mean_fdp: bmean((o) => o.modeBFdp),
    },
  };
}

function render(r: ModeBReport): string {
  const L: string[] = [];
  L.push('═══ MODE B — concurrent-control harness: the achievable FDR guarantee (SPATIAL null) ═══');
  L.push(`fleet: N=${r.params.N} (${r.params.MFAIL} faulted) × T=${r.params.T}, onset=${r.params.ONSET}, step=${r.params.STEP}`);
  L.push(`common-mode: persistent stationary AR(1) ρ=${r.params.rhoCm} (cmSd=${r.params.cmSd}), heterogeneous loadings; q=${r.params.q}, ${r.trials} trials`);
  L.push('');
  L.push('                            mean FDP   mean power   mean K');
  L.push(`  MODE B (control contrast) ${r.modeB.mean_fdp.toFixed(3).padStart(8)}   ${r.modeB.mean_power.toFixed(3).padStart(8)}   ${r.modeB.mean_k.toFixed(1).padStart(6)}`);
  L.push(`  temporal (no control)     ${r.temporal.mean_fdp.toFixed(3).padStart(8)}   ${r.temporal.mean_power.toFixed(3).padStart(8)}   ${r.temporal.mean_k.toFixed(1).padStart(6)}`);
  L.push('');
  L.push(`MODE B FDR controlled (mean FDP ≤ q=${r.params.q}): ${r.modeB.fdr_controlled ? 'YES' : 'NO'}`);
  L.push('  — the paired concurrent control cancels the shared near-unit-root common-mode EXACTLY per');
  L.push('    shard, so the contrast is a construction-valid spatial null and e-BH controls FDR. The');
  L.push('    temporal per-shard null (no control) lets the random walk leak through as spurious signal');
  L.push('    → FDP ≫ q. This is ADR 0019 rule 2: the achievable guarantee is comparative, not temporal.');
  L.push('');
  L.push(`BROKEN-construction check (control on an independent INTEGRATED drift → contrast leaves a`);
  L.push(`random walk that single-φ whitening cannot remove → the null is genuinely invalid):`);
  L.push(`  ungated e-BH FDP (if we ignored the monitor): ${r.broken_construction.ungated_mean_fdp.toFixed(3)}  ≫ q  ← the wrong guarantee`);
  L.push(`  calibration monitor revoked: ${(100 * r.broken_construction.monitor_revoked_frac).toFixed(0)}% of trials  →  demoted to Mode A: ${(100 * r.broken_construction.demoted_to_mode_a_frac).toFixed(0)}%  →  gated FDR emissions: ${r.broken_construction.gated_mean_fdp.toFixed(3)} (abstained)`);
  L.push('  — #2 (runtime monitor) catches the broken construction and #1 (gate) demotes it B→A. The catch');
  L.push('    rate is the MEASURED fraction above, not 100% (ADR 0019 follow-up: ~24–28% of broken');
  L.push('    constructions slip a marginal monitor — whiteness AND-gating narrows, does not close, this).');
  L.push('    Validity is opt-in AND revocable, with monitor power as the residual exposure.');
  return L.join('\n');
}

if (require.main === module) {
  const trials = process.argv[2] ? Number(process.argv[2]) : 120;
  process.stdout.write(render(runModeBControl(DEFAULT_PARAMS, trials)) + '\n');
  process.exit(0);
}
