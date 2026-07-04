// tools/mini-inject.ts — DATA-LEVEL fault injection into a built mini bundle: real recorded noise +
// a known synthetic signal (the standard hybrid). Takes a bundle directory (tools/mini-bundle.ts
// output — or any clustersynth-format bundle), adds step/ramp shifts to selected (shard, counter)
// series scaled in MAD units of THAT series, and writes a new bundle whose labels.json carries the
// injected faults as ground truth. Detection-power curves on real physics, no hardware touched.
// Tessera-original.

import * as fs from 'node:fs';
import * as path from 'node:path';
import { parseArgs } from 'node:util';
import { ndjsonLines } from './clustersynth-scenario.js';

export interface InjectionSpec {
  shard: string; counter: string;
  kind: 'step' | 'ramp';
  /** Onset/offset as fractions of T (offset defaults to 1). */
  onsetFrac: number; offsetFrac?: number;
  /** Shift magnitude in MAD units of the target series (terminal magnitude, for ramps). */
  magnitudeMad: number;
}

function mad(xs: number[]): number {
  const med = (a: number[]): number => { const s = a.slice().sort((x, y) => x - y); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
  const m = med(xs);
  return Math.max(1.4826 * med(xs.map((v) => Math.abs(v - m))), 1e-9);
}

/** Apply one injection in place; returns the label record. */
export function applyInjection(v: number[], spec: InjectionSpec): Record<string, unknown> {
  const T = v.length;
  const on = Math.max(0, Math.floor(spec.onsetFrac * T));
  const off = Math.min(T, Math.floor((spec.offsetFrac ?? 1) * T));
  const amp = spec.magnitudeMad * mad(v);
  for (let t = on; t < off; t++) {
    const frac = spec.kind === 'ramp' ? (t - on + 1) / Math.max(1, off - on) : 1;
    v[t] += amp * frac;
  }
  return {
    level: 'gpu', type: spec.kind === 'ramp' ? 'drift' : 'mean_shift', counter: spec.counter,
    t_onset: on, t_offset: off, affected_shards: [spec.shard],
    source: 'mini-inject', magnitude_mad: spec.magnitudeMad,
  };
}

export function injectBundle(bundleDir: string, outDir: string, specs: InjectionSpec[]): { injected: number; faults: number } {
  fs.mkdirSync(outDir, { recursive: true });
  const byTarget = new Map<string, InjectionSpec[]>();
  for (const s of specs) {
    const k = `${s.shard}\0${s.counter}`;
    byTarget.set(k, [...(byTarget.get(k) ?? []), s]);
  }
  const labels: Array<Record<string, unknown>> = [];
  // Synchronous streaming write: the function's callers read the output immediately on return,
  // and an async WriteStream would still be flushing.
  const fd = fs.openSync(path.join(outDir, 'counters.ndjson'), 'w');
  let injected = 0;
  try {
    for (const line of ndjsonLines(path.join(bundleDir, 'counters.ndjson'))) {
      const row = JSON.parse(line) as { shard: string; counter: string; v: number[] };
      const targets = byTarget.get(`${row.shard}\0${row.counter}`);
      if (targets) for (const spec of targets) { labels.push(applyInjection(row.v, spec)); injected++; }
      fs.writeSync(fd, (targets ? JSON.stringify(row) : line) + '\n'); // untouched rows pass through byte-identical
    }
  } finally {
    fs.closeSync(fd);
  }
  const missed = specs.length - injected;
  if (missed > 0) throw new Error(`mini-inject: ${missed} spec(s) matched no (shard, counter) row in the bundle`);
  for (const f of ['factors.json', 'factors.ndjson']) {
    const src = path.join(bundleDir, f);
    if (fs.existsSync(src)) fs.copyFileSync(src, path.join(outDir, f));
  }
  const existing = JSON.parse(fs.readFileSync(path.join(bundleDir, 'labels.json'), 'utf8')).faults as unknown[];
  fs.writeFileSync(path.join(outDir, 'labels.json'), JSON.stringify({ faults: [...existing, ...labels] }, null, 1));
  return { injected, faults: existing.length + labels.length };
}

if (require.main === module) {
  const { values } = parseArgs({
    options: { bundle: { type: 'string' }, out: { type: 'string' }, spec: { type: 'string' } },
  });
  if (!values.bundle || !values.out || !values.spec) {
    process.stderr.write('usage: node tools/mini-inject.js --bundle <dir> --out <dir> --spec <injections.json>\n' +
      '  spec: [{"shard":"c3","counter":"core_res","kind":"step","onsetFrac":0.5,"magnitudeMad":4}]\n');
    process.exit(2);
  }
  const specs = JSON.parse(fs.readFileSync(values.spec, 'utf8')) as InjectionSpec[];
  const r = injectBundle(values.bundle, values.out, specs);
  process.stdout.write(`injected ${r.injected} fault(s); labels.json now carries ${r.faults}\n`);
}
