// research/2026-09-e-by-t2/harness/score.mjs — score one replication's actions against the exact truth (PREREGISTRATION §3–§4).
import { join } from 'node:path';
import { ROOT, require, COUNTER, RHO, K, MON_START } from './config.mjs';
import { classify, meanPathTruth, labelsFor } from './truth.mjs';

const { fitContrast, applyContrast } = require(join(ROOT, 'tools/contrast.js'));

export const closedForm = (t, alpha) => { const v = t + RHO; return Math.sqrt(v * Math.log(v / (alpha * alpha * RHO))) / t; };
export const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
export const se = (xs) => { if (xs.length < 2) return NaN; const m = mean(xs); return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / (xs.length - 1) / xs.length); };
export const sd = (xs) => se(xs) * Math.sqrt(xs.length);

const contrastOf = (bundle, p) => { const t = bundle.series.get(`${p.treatment}\0${COUNTER}`), c = bundle.series.get(`${p.control}\0${COUNTER}`); return t.map((x, i) => x - c[i]); };

/** The per-shard healthy fits — the same inputs liveCycles fits from, so the same fits. */
export function healthyFits(pair) {
  return new Map(pair.pairs.map((p) => [p.treatment, fitContrast(contrastOf(pair.healthy, p))]));
}

/** Full-window S_T/T on shards no label touches on this counter (the null instrument check, §3). */
export function nullMeans(pair, fits, labels) {
  const out = [];
  for (const p of pair.pairs) {
    if (labelsFor(labels, p.treatment, pair.mon.T - MON_START).length) continue;
    const r = applyContrast(contrastOf(pair.mon, p).slice(MON_START), fits.get(p.treatment));
    out.push(mean(r));
  }
  return out;
}

/** Score one dispatched action; `sel` is the cycle report's `selected` for its cycle. */
export function scoreAction(a, delta, sel, fit, truth, structural) {
  const e = a.effect;
  if (!e) { structural.no_effect++; return null; }
  if (Math.abs(e.halfWidth - closedForm(e.t, e.alphaI)) > 1e-12) structural.closed_form++;
  if (Math.abs(e.alphaI - delta * sel / K) > 1e-15) structural.alpha_i++;
  if (!(a.logMargin >= 0)) structural.margin_sign++;
  const cls = classify(truth.labels, a.shard, e.t);
  const theta = cls === 'null' ? 0 : meanPathTruth(truth.applier, a.shard, e.t, fit);
  const miss = theta < e.lower || theta > e.upper ? 1 : 0;
  return { shard: a.shard, cycle: a.cycle, t: e.t, cls, theta, center: e.center, half_width: e.halfWidth, alpha_i: e.alphaI, log_margin: a.logMargin, miss, excludes_zero: e.lower > 0 || e.upper < 0 ? 1 : 0 };
}

/** One replication at one δ: the per-action rows, the FCPs, and the licence facts. */
export function summarizeReplication(rows, reports, sink) {
  const by = (c) => rows.filter((r) => r.cls === c);
  const level = by('level'), scored = rows.filter((r) => r.cls !== 'other');
  const modes = reports.map((r) => r.emitters[0].mode);
  return {
    rows,
    fcp_level: level.length ? level.reduce((s, r) => s + r.miss, 0) / level.length : 0,
    fcp_scored: scored.length ? scored.reduce((s, r) => s + r.miss, 0) / scored.length : 0,
    n_level: level.length, n_scored: scored.length, n_null: by('null').length, n_path: by('path').length, n_other: by('other').length,
    mode_a_any: modes.includes('A') ? 1 : 0, mode_a_cycles: modes.filter((m) => m === 'A').length,
    revoked: sink.withdrawn.filter((w) => w.reason === 'revoked').length,
    calib_frac_last: reports.at(-1).emitters[0].calibFrac,
    dispatch_key: rows.map((r) => `${r.shard}@${r.cycle}`).sort().join('|'),
  };
}

function classStats(rows, cls) {
  const xs = rows.filter((r) => r.cls === cls);
  return { n: xs.length, miss: xs.length ? mean(xs.map((r) => r.miss)) : null, excludes_zero: xs.length ? mean(xs.map((r) => r.excludes_zero)) : null,
    mean_half_width: xs.length ? mean(xs.map((r) => r.half_width)) : null, mean_abs_theta: xs.length ? mean(xs.map((r) => Math.abs(r.theta))) : null };
}

/** Aggregate replications (one δ) into a cell. */
export function cell(arm, band, delta, reps, minLevel) {
  const rows = reps.flatMap((r) => r.rows);
  const fcrL = mean(reps.map((r) => r.fcp_level)), seL = se(reps.map((r) => r.fcp_level));
  const fcrS = mean(reps.map((r) => r.fcp_scored)), seS = se(reps.map((r) => r.fcp_scored));
  const nLevel = reps.reduce((s, r) => s + r.n_level, 0), nScored = reps.reduce((s, r) => s + r.n_scored, 0);
  const verdict = (fcr, s) => (fcr <= delta + 3 * s ? 'HELD' : 'FAILED');
  return {
    arm, band, delta, n: reps.length, n_level: nLevel, n_scored: nScored,
    fcr_level: fcrL, fcr_level_se: seL, verdict_level: nLevel < minLevel ? 'NOT-EXECUTABLE' : verdict(fcrL, seL),
    fcr_scored: fcrS, fcr_scored_se: seS, verdict_scored: nScored < minLevel ? 'NOT-EXECUTABLE' : verdict(fcrS, seS), // A2
    classes: Object.fromEntries(['null', 'level', 'path', 'other'].map((c) => [c, classStats(rows, c)])),
    mean_dispatched: mean(reps.map((r) => r.rows.length)), mean_level: mean(reps.map((r) => r.n_level)),
    mode_a_rep_frac: mean(reps.map((r) => r.mode_a_any)), mode_a_cycle_frac: mean(reps.map((r) => r.mode_a_cycles)) / reps[0].cycles,
    revoked: reps.reduce((s, r) => s + r.revoked, 0), mean_calib_frac_last: mean(reps.map((r) => r.calib_frac_last)),
  };
}
