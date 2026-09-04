// research/2026-09-action-surface/harness/run.mjs — the registered harness (PREREGISTRATION §3, Amendment A1).
// Build first (pnpm build): imports the repo's compiled tools/*.js and the engine's fleet/e-by.
//   node research/2026-09-action-surface/harness/run.mjs --mode live
//   node research/2026-09-action-surface/harness/run.mjs --mode sim --quick     (N = 10, never scored)
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { render } from '../analysis/report.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const STUDY = resolve(HERE, '..');
const ROOT = resolve(STUDY, '../..');
const require = createRequire(join(ROOT, 'package.json'));
for (const f of ['tools/mode-b-loop.js', 'tools/telemetry-source.js', 'tools/contrast.js', 'tools/calibration-envelope.js']) if (!existsSync(join(ROOT, f))) throw new Error(`build first: ${f} missing`);
const { ModeBLoop, RecordingSink, CS_SIGMA_SQUARED_PRIOR } = require(join(ROOT, 'tools/mode-b-loop.js'));
const { windowToEmitter } = require(join(ROOT, 'tools/telemetry-source.js'));
const { fitContrast, applyContrast } = require(join(ROOT, 'tools/contrast.js'));
const { mulberry32, gaussian } = require(join(ROOT, 'tools/calibration-envelope.js'));
const { eBenjaminiYekutieli } = require('@johnpatrickwarren-oss/deploysignal-engine/fleet/e-by');
const enginePkg = require('@johnpatrickwarren-oss/deploysignal-engine/package.json');

const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const MODE = arg('--mode', 'sim');
const QUICK = process.argv.includes('--quick');
if (MODE === 'live' && QUICK) { console.error('--quick may not write under results/live'); process.exit(1); }

// ── registered constants (PREREGISTRATION §3) ──
const N = QUICK ? 10 : 500;
const TRUTH_M = QUICK ? 20 : 2000;
const K = 40, F = 4, T = 300, COHORT = 10, PHI = 0.5;
const Q = 0.05;
const DELTAS = [0.05, 0.10];
const SHIFTS = [0, 4, 8];
const TOP = 3;
const SEED = 20260908;
const TRUTH_SEED = 40000001;
const FIT_SEED = 0xba5e, FIT_TICKS = 800;
const COUNTER = 'power_w';
const SHARDS = Array.from({ length: K }, (_, i) => `s${i}`);

const ar1 = (rng, n, shift = 0) => { let prev = 0; return Array.from({ length: n }, () => { prev = PHI * prev + gaussian(rng); return prev + shift; }); };
const contrastOf = (u) => u.treatment.map((x, i) => x - u.control[i]);

// fixed baseline fits, one per shard
const fits = new Map();
// the healthy baseline contrast is treatment − control of two independent AR(1) streams
{ const rng = mulberry32(FIT_SEED); for (const s of SHARDS) { const t = ar1(rng, FIT_TICKS), c = ar1(rng, FIT_TICKS); fits.set(s, fitContrast(t.map((x, i) => x - c[i]))); } }

const feed = { async baseline() { return { dtSeconds: 3600, counters: [] }; }, async poll() { return null; } };

function windowFor(seed, deltaShift) {
  const rng = mulberry32(seed);
  const detection = SHARDS.map((s, i) => ({ shard: s, treatment: ar1(rng, T, i < F ? deltaShift : 0), control: ar1(rng, T) }));
  const cohort = Array.from({ length: COHORT }, () => ({ treatment: ar1(rng, T), control: ar1(rng, T) }));
  return { counter: COUNTER, detection, cohort };
}

/** Monte-Carlo truth per faulted shard: the mean standardized residual over the window under the fixed fit. */
function truthFor(deltaShift) {
  const sums = new Array(F).fill(0), sumsq = new Array(F).fill(0); let n = 0;
  for (let j = 0; j < TRUTH_M; j++) {
    const w = windowFor(TRUTH_SEED + 7919 * j, deltaShift);
    for (let i = 0; i < F; i++) { const r = applyContrast(contrastOf(w.detection[i]), fits.get(SHARDS[i])); for (const x of r) { sums[i] += x; sumsq[i] += x * x; } }
    n += T;
  }
  const theta = sums.map((s, i) => ({ theta: s / n, se: Math.sqrt(Math.max(sumsq[i] / n - (s / n) ** 2, 0) / n) }));
  const th = theta.map((x) => x.theta);
  return { theta, summary: { delta_shift: deltaShift, mean_theta: th.reduce((a, b) => a + b, 0) / F, min_theta: Math.min(...th), max_theta: Math.max(...th), mean_se: theta.reduce((a, b) => a + b.se, 0) / F } };
}
const truthByShift = new Map(SHIFTS.filter((d) => d > 0).map((d) => [d, truthFor(d)]));
const truthOf = (deltaShift, i) => (deltaShift > 0 && i < F ? truthByShift.get(deltaShift).theta[i].theta : 0);
const isExact = (deltaShift, i) => !(deltaShift > 0 && i < F);

const closedForm = (S, t, alpha) => { const v = t + CS_SIGMA_SQUARED_PRIOR; return Math.sqrt(v * Math.log(v / (alpha * alpha * CS_SIGMA_SQUARED_PRIOR))) / t; };
const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
const se = (xs) => { if (xs.length < 2) return NaN; const m = mean(xs); return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / (xs.length - 1) / xs.length); };

/** Rule A: the loop's own dispatch for the cycle; intervals are what the sink received. */
function selectByLoop(ec, d, sign) {
  const sink = new RecordingSink();
  const rep = new ModeBLoop({ q: Q, fcrDelta: d, sink }).step(0, [ec]);
  if (rep.emitters[0].mode !== 'B') throw new Error('the healthy cohort should keep Mode B');
  for (const a of sink.dispatched) if (!(a.logMargin >= 0)) sign.count++;
  return sink.dispatched.map((a) => ({ shard: a.shard, alphaI: a.effect.alphaI, center: a.effect.center, halfWidth: a.effect.halfWidth, lower: a.effect.lower, upper: a.effect.upper }));
}
/** Rule B: the 3 most extreme shards by |S_t|/sqrt(t), intervals through the engine's e-BY at d*3/K. */
function selectByExtremeness(ec, d, idx) {
  const order = SHARDS.map((s, k) => [s, Math.abs(ec.csInputs[k].S_t) / Math.sqrt(ec.csInputs[k].t)]).sort((a, b) => b[1] - a[1]).slice(0, TOP).map((x) => x[0]);
  const out = eBenjaminiYekutieli(order.map((s) => ({ id: s, level_free: { S_t: ec.csInputs[idx.get(s)].S_t, t: ec.csInputs[idx.get(s)].t, sigma_squared: 1, sigma_squared_prior: CS_SIGMA_SQUARED_PRIOR } })), K, d);
  return out.intervals.map((iv) => ({ shard: iv.id, alphaI: iv.alpha_i, center: iv.center, halfWidth: iv.half_width, lower: iv.lower, upper: iv.upper }));
}
/** One interval's contribution to the accumulator; returns 1 on a miss. */
function tally(iv, k, cs, deltaShift, d, a, dev) {
  if (Math.abs(iv.alphaI - d * a.currentCount / K) > 1e-15) throw new Error('alpha_i is not delta*|S|/K');
  if (Math.abs(iv.halfWidth - closedForm(cs.S_t, cs.t, iv.alphaI)) > 1e-12) dev.count++;
  const th = truthOf(deltaShift, k);
  const m = th < iv.lower || th > iv.upper ? 1 : 0;
  if (isExact(deltaShift, k)) { a.exactN++; a.exactMiss += m; }
  if (deltaShift > 0 && k < F) { a.faultedN++; if (iv.lower > 0 || iv.upper < 0) a.faultedExcl++; }
  a.hw.push(iv.halfWidth); a.ratio.push(iv.halfWidth / closedForm(cs.S_t, cs.t, d));
  return m;
}
/** Score one replication's intervals against the truth; mutates the accumulator. */
function score(intervals, ec, idx, deltaShift, d, a, dev) {
  a.currentCount = intervals.length;
  let miss = 0;
  for (const iv of intervals) miss += tally(iv, idx.get(iv.shard), ec.csInputs[idx.get(iv.shard)], deltaShift, d, a, dev);
  a.fcp.push(intervals.length ? miss / intervals.length : 0);
}
function summarize(a, d) {
  const fcr = mean(a.fcp), s = se(a.fcp);
  return { delta: d, fcr, fcr_se: s, verdict: fcr <= d + 3 * s ? 'HELD' : 'FAILED', exact_n: a.exactN, exact_miss: a.exactN ? a.exactMiss / a.exactN : null,
    excludes_zero_faulted: a.faultedN ? a.faultedExcl / a.faultedN : null, mean_half_width: a.hw.length ? mean(a.hw) : null, width_ratio: a.ratio.length ? mean(a.ratio) : null };
}
function cell(deltaShift, rule, salt) {
  const acc = Object.fromEntries(DELTAS.map((d) => [d, { fcp: [], exactMiss: 0, exactN: 0, faultedN: 0, faultedExcl: 0, hw: [], ratio: [] }]));
  const sel = [], dev = { count: 0 }, sign = { count: 0 };
  const idx = new Map(SHARDS.map((s, k) => [s, k]));
  for (let i = 0; i < N; i++) {
    const ec = windowToEmitter(windowFor(SEED + 7919 * i + salt, deltaShift), fits, feed);
    if (ec.csInputs.some((c) => c == null)) throw new Error('every shard has a baseline fit');
    for (const d of DELTAS) {
      const intervals = rule === 'A' ? selectByLoop(ec, d, sign) : selectByExtremeness(ec, d, idx);
      if (d === DELTAS[0]) sel.push(intervals.length);
      score(intervals, ec, idx, deltaShift, d, acc[d], dev);
    }
  }
  return { delta_shift: deltaShift, rule, n: N, mean_selected: mean(sel), per_delta: DELTAS.map((d) => summarize(acc[d], d)), closed_form_deviations: dev.count, margin_sign_mismatches: sign.count };
}

/** P4 structural: Mode A (whiteness failed) dispatches nothing; a cycle without csInputs carries margins and no effect. */
function structuralChecks() {
  const w = windowFor(999, 8);
  const ec = windowToEmitter(w, fits, feed);
  const sinkA = new RecordingSink();
  new ModeBLoop({ q: Q, sink: sinkA }).step(0, [{ ...ec, whitenessPass: false }]);
  const sinkNo = new RecordingSink();
  const { csInputs: _c, ...noCs } = ec;
  new ModeBLoop({ q: Q, sink: sinkNo }).step(0, [noCs]);
  const shapeOk = sinkNo.dispatched.length > 0 && sinkNo.dispatched.every((a) => !('effect' in a) && typeof a.logMargin === 'number' && typeof a.logThresholdE === 'number'
    && JSON.stringify(Object.keys(a).sort()) === JSON.stringify(['cycle', 'eValue', 'emitter', 'logMargin', 'logThresholdE', 'q', 'shard']));
  return { mode_a_dispatches: sinkA.dispatched.length, mode_a_intervals: sinkA.dispatched.filter((a) => a.effect).length, shape_check: shapeOk ? 'HELD' : 'FAILED' };
}

const t0 = Date.now();
const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
const runDir = join(STUDY, 'results', MODE === 'live' ? 'live' : 'sim', `run-${stamp}`);
if (existsSync(runDir)) { console.error(`refusing to reuse ${runDir}`); process.exit(1); }
mkdirSync(runDir, { recursive: true });
const cells = []; let idx = 0;
for (const ds of SHIFTS) for (const rule of ['A', 'B']) {
  const c = cell(ds, rule, 1_000_000 * idx++); cells.push(c);
  console.log(`Δ=${ds} rule=${rule}: |S| ${c.mean_selected.toFixed(2)} ` + c.per_delta.map((d) => `δ${d.delta}: fcr ${d.fcr.toFixed(4)}±${d.fcr_se.toFixed(4)} ${d.verdict} exactN ${d.exact_n} excl0 ${d.excludes_zero_faulted == null ? '—' : d.excludes_zero_faulted.toFixed(3)}`).join(' | '));
}
const structural = structuralChecks();
const sha256 = (p) => createHash('sha256').update(readFileSync(p)).digest('hex');
const manifest = { study: '2026-09-action-surface', run: `run-${stamp}`, mode: MODE, quick: QUICK,
  git_sha: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT }).toString().trim(), engine_version: enginePkg.version, harness_sha256: sha256(fileURLToPath(import.meta.url)),
  n: N, K, F, T, cohort: COHORT, phi: PHI, q: Q, deltas: DELTAS, shifts: SHIFTS, top: TOP, seed: SEED, truth_seed: TRUTH_SEED, truth_M: TRUTH_M, fit_seed: FIT_SEED, fit_ticks: FIT_TICKS,
  truth: [...truthByShift.values()].map((t) => t.summary), ...structural, wall_seconds: Math.round((Date.now() - t0) / 1000), argv: process.argv.slice(2) };
writeFileSync(join(runDir, 'cells.json'), JSON.stringify(cells, null, 2) + '\n');
writeFileSync(join(runDir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
writeFileSync(join(runDir, 'REPORT.md'), render(cells, manifest));
console.log(`structural ${JSON.stringify(structural)}; wrote ${runDir} (${cells.length} cells, ${manifest.wall_seconds} s)`);
