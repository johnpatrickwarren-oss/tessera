// research/2026-09-e-by-t2/harness/run.mjs — the registered harness (PREREGISTRATION §2–§6, Amendment A1).
// Build first (pnpm build here; pnpm build in clustersynth).
//   node research/2026-09-e-by-t2/harness/run.mjs --mode live
//   node research/2026-09-e-by-t2/harness/run.mjs --mode sim --quick     (2 seeds × 1 band, never scored)
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { ROOT, STUDY, HERE, CLUSTERSYNTH, require, COUNTER, DT_S, T_HEALTHY, T_MON, MON_START, N_CYCLES, Q, DELTAS, RHO, K, BASE_TS, FAULT_RATE, BANDS, ARMS, SEEDS, MIN_LEVEL_ACTIONS } from './config.mjs';
import { generateBundle } from './gen.mjs';
import { loadPair, studyFeed, drain } from './feed.mjs';
import { loadTruth } from './truth.mjs';
import { healthyFits, nullMeans, scoreAction, summarizeReplication, cell, mean, sd } from './score.mjs';
import { render } from '../analysis/report.mjs';

const { ModeBLoop, RecordingSink } = require(join(ROOT, 'tools/mode-b-loop.js'));
const { runModeBLoopLive, bundleFeed } = require(join(ROOT, 'tools/telemetry-source.js'));
const enginePkg = require('@johnpatrickwarren-oss/deploysignal-engine/package.json');

const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const MODE = arg('--mode', 'sim');
const QUICK = process.argv.includes('--quick');
if (MODE === 'live' && QUICK) { console.error('--quick may not write under results/live'); process.exit(1); }
const seeds = QUICK ? SEEDS.slice(0, 2) : SEEDS;
const bands = QUICK ? [BANDS[2]] : BANDS;

const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
const runDir = join(STUDY, 'results', MODE === 'live' ? 'live' : 'sim', `run-${stamp}`);
if (existsSync(runDir)) { console.error(`refusing to reuse ${runDir}`); process.exit(1); }
mkdirSync(runDir, { recursive: true });

const structural = { no_effect: 0, closed_form: 0, alpha_i: 0, margin_sign: 0, delta_dispatch_mismatch: 0, hidden_counters_mismatch: 0, feed_offset0_equal: null };
const bundles = [];
const nullCheck = Object.fromEntries(ARMS.map((a) => [a, []]));
const keys = new Map(); // `${arm}|${band}|${seed}` → dispatch key at δ = DELTAS[0]
const reps = new Map();  // `${arm}|${band}|${delta}` → replication summaries
const actions = [];

/** One replication at one δ: a fresh loop over the study feed. */
async function replicate(pair, fits, truth, delta) {
  const sink = new RecordingSink();
  const reports = await runModeBLoopLive(studyFeed(pair, N_CYCLES, MON_START), new ModeBLoop({ q: Q, fcrDelta: delta, sink }), sink);
  assert.equal(reports.length, N_CYCLES);
  const rows = sink.dispatched.map((a) => scoreAction(a, delta, reports[a.cycle].emitters[0].selected, fits.get(a.shard), truth, structural)).filter(Boolean);
  return { ...summarizeReplication(rows, reports, sink), cycles: N_CYCLES };
}

async function runCell(arm, band, seed, healthy) {
  const mon = generateBundle(arm, seed, band); bundles.push(mon);
  const pair = loadPair(healthy.dir, mon.dir);
  const fits = healthyFits(pair);
  const truth = loadTruth(mon.dir, seed);
  nullCheck[arm].push(...nullMeans(pair, fits, truth.labels));
  const perDelta = [];
  for (const delta of DELTAS) {
    const r = await replicate(pair, fits, truth, delta);
    perDelta.push(r);
    const k = `${arm}|${band}|${delta}`; if (!reps.has(k)) reps.set(k, []); reps.get(k).push(r);
    for (const row of r.rows) actions.push({ arm, band, seed, delta, ...row });
  }
  if (perDelta.some((r) => r.dispatch_key !== perDelta[0].dispatch_key)) structural.delta_dispatch_mismatch++;
  keys.set(`${arm}|${band}|${seed}`, perDelta[0].dispatch_key);
  console.log(`${arm} ${band} s${seed}: dispatched ${perDelta[0].rows.length} (level ${perDelta[0].n_level}, null ${perDelta[0].n_null}, path ${perDelta[0].n_path}, other ${perDelta[0].n_other}); modeA cycles ${perDelta[0].mode_a_cycles}; fcp_level ${DELTAS.map((d, i) => perDelta[i].fcp_level.toFixed(3)).join('/')}`);
}

/** P4 (v): the study feed at offset 0 equals the shipped bundleFeed on one pair. */
async function feedEquality(healthy, mon) {
  const a = await drain(studyFeed(loadPair(healthy.dir, mon.dir), N_CYCLES, 0), N_CYCLES);
  const b = await drain(bundleFeed(healthy.dir, mon.dir, N_CYCLES), N_CYCLES);
  try { assert.deepEqual(a, b); return true; } catch (e) { if (!(e instanceof assert.AssertionError)) throw e; return false; }
}

/** Arm-equality checks (P4 vi and the reported nonlinear count) from the recorded keys and hashes. */
function armEquality() {
  const byName = new Map(bundles.map((b) => [b.name, b]));
  let nonlinearDiffers = 0, hiddenDiffers = 0;
  for (const band of bands) for (const seed of seeds) {
    const base = keys.get(`infamily|${band}|${seed}`);
    if (keys.get(`nonlinear|${band}|${seed}`) !== base) nonlinearDiffers++;
    if (keys.get(`hidden|${band}|${seed}`) !== base) hiddenDiffers++;
    const h = byName.get(`hidden-b${band.replace(':', '_')}-s${seed}-mon`), i = byName.get(`infamily-b${band.replace(':', '_')}-s${seed}-mon`);
    if (h.counters_sha256 !== i.counters_sha256) structural.hidden_counters_mismatch++;
  }
  return { nonlinear_dispatch_differs: nonlinearDiffers, hidden_dispatch_differs: hiddenDiffers, cells: bands.length * seeds.length };
}

for (const arm of ARMS) {
  for (const seed of seeds) {
    const healthy = generateBundle(arm, seed, null); bundles.push(healthy);
    for (const band of bands) await runCell(arm, band, seed, healthy);
  }
}
structural.feed_offset0_equal = await feedEquality(bundles[0], bundles[1]);
const equality = armEquality();

const cells = [];
for (const arm of ARMS) for (const delta of DELTAS) {
  cells.push(cell(arm, 'all', delta, bands.flatMap((b) => reps.get(`${arm}|${b}|${delta}`)), MIN_LEVEL_ACTIONS));
  for (const band of bands) cells.push(cell(arm, band, delta, reps.get(`${arm}|${band}|${delta}`), MIN_LEVEL_ACTIONS));
}
const nullSummary = Object.fromEntries(ARMS.map((a) => [a, { n: nullCheck[a].length, mean: mean(nullCheck[a]), sd: sd(nullCheck[a]), noise_only_sd: 1 / Math.sqrt(T_MON - MON_START) }]));

const sha256 = (p) => createHash('sha256').update(readFileSync(p)).digest('hex');
const git = (cwd) => execFileSync('git', ['rev-parse', 'HEAD'], { cwd }).toString().trim();
const harnessFiles = ['config.mjs', 'gen.mjs', 'feed.mjs', 'truth.mjs', 'score.mjs', 'run.mjs'];
const manifest = {
  study: '2026-09-e-by-t2', run: `run-${stamp}`, mode: MODE, quick: QUICK,
  tessera_sha: git(ROOT), engine_version: enginePkg.version, clustersynth_sha: git(CLUSTERSYNTH),
  harness_sha256: Object.fromEntries(harnessFiles.map((f) => [f, sha256(join(HERE, f))])), report_sha256: sha256(join(STUDY, 'analysis/report.mjs')),
  counter: COUNTER, dt_s: DT_S, t_healthy: T_HEALTHY, t_mon: T_MON, mon_start: MON_START, n_cycles: N_CYCLES, q: Q, deltas: DELTAS, rho: RHO, K, base_ts: BASE_TS, fault_rate: FAULT_RATE, shared_faults: 0,
  bands, arms: ARMS, seeds, n_replications: seeds.length * bands.length * ARMS.length, min_level_actions: MIN_LEVEL_ACTIONS,
  structural, equality, null_check: nullSummary, exceptions: 0, argv: process.argv.slice(2),
};
writeFileSync(join(runDir, 'cells.json'), JSON.stringify(cells, null, 2) + '\n');
writeFileSync(join(runDir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
writeFileSync(join(runDir, 'bundles.json'), JSON.stringify(bundles.map(({ dir, ...b }) => b), null, 2) + '\n');
writeFileSync(join(runDir, 'actions.json'), JSON.stringify(actions) + '\n');
writeFileSync(join(runDir, 'REPORT.md'), render(cells, manifest));
console.log(`structural ${JSON.stringify(structural)} equality ${JSON.stringify(equality)}; wrote ${runDir} (${cells.length} cells, ${actions.length} action rows)`);
