// research/2026-09-e-by-t2/harness/truth.mjs — the exact mean-path truth and the action classes (PREREGISTRATION §3).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { CLUSTERSYNTH, COUNTER, DT_S, MON_START, BASE_TS } from './config.mjs';

const faultsMod = await import(pathToFileURL(join(CLUSTERSYNTH, 'dist/harness/faults.js')).href);
export const { buildApplier } = faultsMod;

/** The monitoring bundle's labels and applier. */
export function loadTruth(monDir, seed) {
  const labels = JSON.parse(readFileSync(join(monDir, 'labels.json'), 'utf8')).faults;
  return { labels, applier: buildApplier(seed, labels) };
}

// A1: a detachment removes a factor kind from every counter (faults.ts `detached()` never reads `counter`).
const hits = (l, shard) => l.affected_shards.includes(shard) && (l.type === 'detachment' || l.counter === null || l.counter === COUNTER);
const overlaps = (l, t) => l.t_onset < MON_START + t && l.t_offset > MON_START;

/** The labels that touch this shard's counter within window prefix [0, t). */
export function labelsFor(labels, shard, t) {
  return labels.filter((l) => hits(l, shard) && overlaps(l, t));
}

/** null | level | path | other (PREREGISTRATION §3 classes). */
export function classify(labels, shard, t) {
  const ls = labelsFor(labels, shard, t);
  if (ls.length === 0) return 'null';
  const types = new Set(ls.map((l) => l.type));
  if (types.has('variance_collapse') || types.has('detachment')) return 'other';
  return types.has('drift') ? 'path' : 'level';
}

/** θ_i(t): the whitened deterministic mean path under the fixed fit, averaged over the prefix, in residual units. */
export function meanPathTruth(applier, shard, t, fit) {
  let sum = 0, prev = 0;
  for (let s = 0; s < t; s++) {
    const d = applier.meanDelta(shard, COUNTER, BASE_TS + (MON_START + s) * DT_S);
    sum += s === 0 ? d : d - fit.phi * prev;
    prev = d;
  }
  return sum / t / fit.scale;
}
