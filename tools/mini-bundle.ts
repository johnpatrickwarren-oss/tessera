// tools/mini-bundle.ts — convert the mac mini's real-telemetry NDJSON (tools on the mini write
// ~/concord/telemetry/data/YYYY-MM-DD.ndjson; see the mini collector) into a clustersynth-compatible
// scenario bundle, so the ENTIRE existing pipeline (baseline-monitor, e2e scorer, mode-b tools) runs
// on real mini telemetry unchanged.
//
// MAPPING (Phase 2 harness design):
//   shards   = the per-core series c0..cN (M4 Pro: 4E + 10P cores) — the within-box units;
//   counters = core_res (active residency %) and core_mhz (frequency);
//   factors  = kind `package`  → one instance (`pkg`, the combined_w package-power series), plus
//              kind `cluster_loo_<counter>` → PER-SHARD leave-one-out instances: the mean of the
//              OTHER same-cluster cores' series. LOO, not the cluster aggregate, because a factor
//              containing the shard's own series ABSORBS single-shard faults (ADR 0016 / P5 — full-
//              series loading took detection to 0%); with 4-core clusters the absorption is 25%.
//   cluster membership is INFERRED by correlating each core's mhz with the e/p0/p1 cluster series
//   (cluster-wide DVFS makes same-cluster frequencies near-collinear), falling back to a warning.
//
// GAPS. Real telemetry has them (reboots, powermetrics restarts). Rows are bucketed onto a regular
// grid (cadence s/tick, bucket-mean); missing ticks are forward-filled up to --max-gap seconds.
// A LONGER gap is an ERROR by default — silently forward-filling a 2-day reboot gap manufactures a
// fake constant series (variance collapse, phantom whiteness). --allow-gaps overrides, loudly.
//
// Ground truth: --journal <interventions.ndjson> (from tools/mini-interventions.ts) maps entries
// overlapping the window to labels.json faults (tick-converted). No journal → faults: [] (A/A).
// Tessera-original.

import * as fs from 'node:fs';
import * as path from 'node:path';
import { parseArgs } from 'node:util';
import { ndjsonLines } from './clustersynth-scenario.js';

export interface MiniBundleOptions {
  dataDir: string; outDir: string;
  fromEpochS?: number; toEpochS?: number;
  cadenceS?: number;         // seconds per tick (default 1; >1 bucket-means)
  maxGapS?: number;          // forward-fill limit (default 60)
  allowGaps?: boolean;
  journalFile?: string;
}

export interface JournalEntry {
  t_start: number; t_end: number; type: string;
  affected_shards: string[]; counter: string | null; note?: string;
}

interface Grid { t0: number; T: number; fields: Map<string, Float64Array>; missingTicks: number[] }

const CORE_RE = /^c(\d+)_(res|mhz)$/;

/** List the day files intersecting [from, to). */
function dayFiles(dataDir: string, fromS?: number, toS?: number): string[] {
  return fs.readdirSync(dataDir)
    .filter((f) => /^\d{4}-\d{2}-\d{2}\.ndjson$/.test(f))
    .filter((f) => {
      const d0 = Date.parse(f.slice(0, 10) + 'T00:00:00Z') / 1000;
      return (toS === undefined || d0 < toS) && (fromS === undefined || d0 + 86400 > fromS);
    })
    .sort()
    .map((f) => path.join(dataDir, f));
}

/** One cheap pass for the window bounds. T covers [t0, to) when --to is given, else runs through
 *  the bucket containing the last sample. */
function windowBounds(files: string[], opts: MiniBundleOptions, cad: number): { t0: number; T: number } {
  let t0 = opts.fromEpochS ?? Infinity, tMax = -Infinity;
  if (opts.fromEpochS === undefined || opts.toEpochS === undefined) {
    for (const f of files) {
      for (const line of ndjsonLines(f)) {
        const t = (JSON.parse(line) as { t: number }).t;
        if (opts.fromEpochS === undefined) t0 = Math.min(t0, t);
        tMax = Math.max(tMax, t);
      }
    }
  }
  const T = Math.max(1, opts.toEpochS !== undefined
    ? Math.ceil((opts.toEpochS - t0) / cad)
    : Math.floor((tMax - t0) / cad) + 1);
  return { t0, T };
}

/** Bucket every numeric field of every in-window row onto the grid with running means. */
function accumulateRows(files: string[], t0: number, cad: number, T: number): Map<string, Float64Array> {
  const fields = new Map<string, Float64Array>();
  const counts = new Map<string, Uint8Array>();
  for (const f of files) {
    for (const line of ndjsonLines(f)) {
      const row = JSON.parse(line) as Record<string, number | string> & { t: number };
      const k = Math.floor((row.t - t0) / cad);
      if (k < 0 || k >= T) continue;
      for (const [key, val] of Object.entries(row)) {
        if (key === 't' || typeof val !== 'number') continue;
        let v = fields.get(key), n = counts.get(key);
        if (!v) { v = new Float64Array(T).fill(NaN); fields.set(key, v); n = new Uint8Array(T); counts.set(key, n); }
        if (n![k] < 255) { n![k]++; v[k] = n![k] === 1 ? val : v[k] + (val - v[k]) / n![k]; }
      }
    }
  }
  return fields;
}

/** Ticks with no data in ANY field. */
function findMissingTicks(fields: Map<string, Float64Array>, T: number): number[] {
  const missing: number[] = [];
  const cols = [...fields.values()];
  for (let k = 0; k < T; k++) if (cols.every((v) => Number.isNaN(v[k]))) missing.push(k);
  return missing;
}

/** Bucket rows onto the regular grid with running means; NaN = no data for that field/tick. */
function buildGrid(opts: MiniBundleOptions): Grid {
  const files = dayFiles(opts.dataDir, opts.fromEpochS, opts.toEpochS);
  if (!files.length) throw new Error(`mini-bundle: no day files in ${opts.dataDir} for the requested window`);
  const cad = opts.cadenceS ?? 1;
  const { t0, T } = windowBounds(files, opts, cad);
  const fields = accumulateRows(files, t0, cad, T);
  if (!fields.size) throw new Error('mini-bundle: no numeric fields found in the window');
  return { t0, T, fields, missingTicks: findMissingTicks(fields, T) };
}

/** Gap census over missing ticks: contiguous runs, in ticks. */
export function gapRuns(missingTicks: number[]): Array<{ start: number; len: number }> {
  const runs: Array<{ start: number; len: number }> = [];
  for (const k of missingTicks) {
    const last = runs[runs.length - 1];
    if (last && k === last.start + last.len) last.len++;
    else runs.push({ start: k, len: 1 });
  }
  return runs;
}

/** Forward-fill NaNs per field (backfill the leading run from the first real value). */
function forwardFill(fields: Map<string, Float64Array>): void {
  for (const v of fields.values()) {
    let first = NaN;
    for (let k = 0; k < v.length; k++) if (!Number.isNaN(v[k])) { first = v[k]; break; }
    let last = first;
    for (let k = 0; k < v.length; k++) {
      if (Number.isNaN(v[k])) v[k] = last;
      else last = v[k];
    }
  }
}

/** Pearson correlation, tolerant of flat series (returns 0). */
function corr(a: ArrayLike<number>, b: ArrayLike<number>): number {
  const n = Math.min(a.length, b.length);
  let sa = 0, sb = 0;
  for (let i = 0; i < n; i++) { sa += a[i]; sb += b[i]; }
  const ma = sa / n, mb = sb / n;
  let num = 0, va = 0, vb = 0;
  for (let i = 0; i < n; i++) { const da = a[i] - ma, db = b[i] - mb; num += da * db; va += da * da; vb += db * db; }
  return va > 0 && vb > 0 ? num / Math.sqrt(va * vb) : 0;
}

/** Infer each core's cluster by correlating its mhz series against the cluster mhz series. */
export function inferClusters(fields: Map<string, Float64Array>, cores: string[]): Map<string, string> {
  const clusterNames = ['e', 'p0', 'p1'].filter((c) => fields.has(`${c}_mhz`));
  const out = new Map<string, string>();
  const warned: string[] = [];
  for (const core of cores) {
    const mhz = fields.get(`${core}_mhz`)!;
    let best = clusterNames[0] ?? 'all', bestR = -Infinity;
    for (const c of clusterNames) {
      const r = corr(mhz, fields.get(`${c}_mhz`)!);
      if (r > bestR) { bestR = r; best = c; }
    }
    if (bestR < 0.5) warned.push(`${core} (max r=${bestR.toFixed(2)})`);
    out.set(core, best);
  }
  if (warned.length) process.stderr.write(`mini-bundle: weak cluster inference for ${warned.join(', ')} — check the window has CPU activity\n`);
  return out;
}

/** Mean of the OTHER same-cluster cores' field (leave-one-out common-mode instance). */
function looSeries(fields: Map<string, Float64Array>, peers: string[], suffix: string, T: number): number[] {
  const out = new Array<number>(T).fill(0);
  for (let t = 0; t < T; t++) {
    let s = 0, n = 0;
    for (const p of peers) { const v = fields.get(`${p}_${suffix}`); if (v) { s += v[t]; n++; } }
    out[t] = n ? s / n : 0;
  }
  return out;
}

export interface MiniBundleReport {
  T: number; cadenceS: number; t0: number; days: number;
  shards: string[]; clusters: Record<string, string>;
  gapTicksFilled: number; largestGapTicks: number; faults: number;
}

/** Build the bundle directory. Throws on over-limit gaps unless allowGaps. */
export function buildMiniBundle(opts: MiniBundleOptions): MiniBundleReport {
  const cad = opts.cadenceS ?? 1;
  const maxGapTicks = Math.max(1, Math.floor((opts.maxGapS ?? 60) / cad));
  const grid = buildGrid(opts);
  const runs = gapRuns(grid.missingTicks);
  const largest = runs.reduce((m, r) => Math.max(m, r.len), 0);
  if (largest > maxGapTicks && !opts.allowGaps) {
    const worst = runs.filter((r) => r.len > maxGapTicks).slice(0, 5)
      .map((r) => `${r.len} ticks at t≈${new Date((grid.t0 + r.start * cad) * 1000).toISOString()}`);
    throw new Error(`mini-bundle: ${worst.length}+ gap(s) exceed --max-gap (${opts.maxGapS ?? 60}s): ${worst.join('; ')}. ` +
      `Forward-filling a long gap manufactures a fake constant series — narrow the window or pass --allow-gaps (loud).`);
  }
  if (largest > maxGapTicks) process.stderr.write(`mini-bundle: ⚠️  forward-filling ${grid.missingTicks.length} missing ticks (largest run ${largest}) under --allow-gaps — treat variance/whiteness stats near the gaps with suspicion\n`);
  forwardFill(grid.fields);

  const cores = [...grid.fields.keys()].map((k) => CORE_RE.exec(k)).filter(Boolean)
    .map((m) => `c${m![1]}`).filter((v, i, a) => a.indexOf(v) === i)
    .sort((a, b) => Number(a.slice(1)) - Number(b.slice(1)));
  if (!cores.length) throw new Error('mini-bundle: no per-core fields (cN_res/cN_mhz) in the window — collector predates the per-core patch?');
  const clusters = inferClusters(grid.fields, cores);

  fs.mkdirSync(opts.outDir, { recursive: true });
  // counters.ndjson — shards × {core_res, core_mhz}
  const counterRows: string[] = [];
  for (const core of cores) {
    for (const [counter, suffix] of [['core_res', 'res'], ['core_mhz', 'mhz']] as const) {
      const v = grid.fields.get(`${core}_${suffix}`);
      if (v) counterRows.push(JSON.stringify({ shard: core, counter, v: [...v] }));
    }
  }
  fs.writeFileSync(path.join(opts.outDir, 'counters.ndjson'), counterRows.join('\n') + '\n');

  // factors.ndjson + membership: package power (shared) + per-shard LOO cluster instances.
  const factorRows: string[] = [];
  const membership: Record<string, Record<string, string>> = {};
  const pkg = grid.fields.get('combined_w') ?? grid.fields.get('cpu_w');
  factorRows.push(JSON.stringify({ id: 'pkg', kind: 'package', v: pkg ? [...pkg] : new Array(grid.T).fill(0) }));
  for (const core of cores) {
    const peers = cores.filter((c) => c !== core && clusters.get(c) === clusters.get(core));
    membership[core] = { package: 'pkg', cluster_loo_res: `loo_res_${core}`, cluster_loo_mhz: `loo_mhz_${core}` };
    factorRows.push(JSON.stringify({ id: `loo_res_${core}`, kind: 'cluster_loo_res', v: looSeries(grid.fields, peers, 'res', grid.T) }));
    factorRows.push(JSON.stringify({ id: `loo_mhz_${core}`, kind: 'cluster_loo_mhz', v: looSeries(grid.fields, peers, 'mhz', grid.T) }));
  }
  fs.writeFileSync(path.join(opts.outDir, 'factors.ndjson'), factorRows.join('\n') + '\n');

  fs.writeFileSync(path.join(opts.outDir, 'factors.json'), JSON.stringify({
    T: grid.T, dt_s: cad,
    counters: [
      { name: 'core_res', load: { package: 1, cluster_loo_res: 1 } },
      { name: 'core_mhz', load: { package: 1, cluster_loo_mhz: 1 } },
    ],
    membership,
    source: { kind: 'mini-telemetry', dataDir: opts.dataDir, t0: grid.t0, cadenceS: cad },
  }, null, 1));

  // labels.json from the interventions journal (ground truth), tick-converted.
  const faults = opts.journalFile ? journalToFaults(opts.journalFile, grid.t0, cad, grid.T) : [];
  fs.writeFileSync(path.join(opts.outDir, 'labels.json'), JSON.stringify({ faults }, null, 1));

  return {
    T: grid.T, cadenceS: cad, t0: grid.t0, days: (grid.T * cad) / 86400,
    shards: cores, clusters: Object.fromEntries(clusters),
    gapTicksFilled: grid.missingTicks.length, largestGapTicks: largest, faults: faults.length,
  };
}

/** Journal entries overlapping the window → clustersynth fault labels. */
export function journalToFaults(journalFile: string, t0: number, cad: number, T: number): Array<Record<string, unknown>> {
  const faults: Array<Record<string, unknown>> = [];
  for (const line of ndjsonLines(journalFile)) {
    const e = JSON.parse(line) as JournalEntry;
    const on = Math.floor((e.t_start - t0) / cad), off = Math.ceil((e.t_end - t0) / cad);
    if (off <= 0 || on >= T) continue;
    faults.push({
      level: 'gpu', type: 'mean_shift', counter: e.counter ?? null,
      t_onset: Math.max(0, on), t_offset: Math.min(T, off),
      affected_shards: e.affected_shards, source: e.type, note: e.note,
    });
  }
  return faults;
}

if (require.main === module) {
  const { values } = parseArgs({
    options: {
      data: { type: 'string' }, out: { type: 'string' },
      from: { type: 'string' }, to: { type: 'string' },
      cadence: { type: 'string', default: '1' }, 'max-gap': { type: 'string', default: '60' },
      'allow-gaps': { type: 'boolean', default: false }, journal: { type: 'string' },
    },
  });
  if (!values.data || !values.out) {
    process.stderr.write('usage: node tools/mini-bundle.js --data <telemetry-data-dir> --out <bundle-dir> [--from ISO --to ISO] [--cadence s] [--max-gap s] [--allow-gaps] [--journal interventions.ndjson]\n');
    process.exit(2);
  }
  const parseT = (s?: string): number | undefined => (s === undefined ? undefined : (/^\d+$/.test(s) ? Number(s) : Date.parse(s) / 1000));
  const rep = buildMiniBundle({
    dataDir: values.data, outDir: values.out,
    fromEpochS: parseT(values.from), toEpochS: parseT(values.to),
    cadenceS: Number(values.cadence), maxGapS: Number(values['max-gap']),
    allowGaps: values['allow-gaps'], journalFile: values.journal,
  });
  process.stdout.write(JSON.stringify(rep, null, 2) + '\n');
  if (rep.days < 56) process.stderr.write(`note: ${rep.days.toFixed(1)} days < 56 — baseline-guard will reject this as a BASELINE (CS_ALLOW_SHORT=1 plumbing smokes only)\n`);
}
