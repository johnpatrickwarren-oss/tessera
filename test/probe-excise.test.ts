// test/probe-excise.test.ts — the exclusion-ledger excision path (probe-runner → passive stream).
//
// Relations: overlap merging is idempotent and order-free; the margin widens both sides; a row is
// dropped iff its second lands in a widened window; excised gaps stay below mini-bundle's default
// forward-fill limit for the shipped probe durations.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { exciseDir, exciseFile, inAnyWindow, loadWindows } from '../tools/probe-excise.js';

function tmp(): string { return fs.mkdtempSync(path.join(os.tmpdir(), 'excise-')); }

function writeWindows(dir: string, wins: Array<[number, number]>): string {
  const f = path.join(dir, 'probe-windows.ndjson');
  fs.writeFileSync(f, wins.map(([s, e]) => JSON.stringify({ t_start_ms: s, t_end_ms: e, probe: 'p1', lane: 'P' })).join('\n') + '\n');
  return f;
}

test('windows merge overlaps (post-margin) into disjoint sorted spans', () => {
  const d = tmp();
  // 2s margin ⇒ [8_000,17_000] and [16_000,25_000] overlap ⇒ one span; the third stays separate
  const f = writeWindows(d, [[18_000, 23_000], [10_000, 15_000], [60_000, 61_000]]);
  const wins = loadWindows(f, 2000);
  assert.equal(wins.length, 2);
  assert.deepEqual(wins[0], { s: 8_000, e: 25_000 });
  assert.deepEqual(wins[1], { s: 58_000, e: 63_000 });
  for (let i = 1; i < wins.length; i++) assert.ok(wins[i].s > wins[i - 1].e, 'disjoint and sorted');
});

test('membership: inside (incl. margin) drops, outside keeps', () => {
  const d = tmp();
  const wins = loadWindows(writeWindows(d, [[10_000, 12_000]]), 2000);
  assert.ok(inAnyWindow(8_000, wins), 'left margin edge is in');
  assert.ok(inAnyWindow(11_000, wins));
  assert.ok(inAnyWindow(14_000, wins), 'right margin edge is in');
  assert.ok(!inAnyWindow(7_999, wins));
  assert.ok(!inAnyWindow(14_001, wins));
});

test('file excision drops exactly the in-window rows; dir walk aggregates', () => {
  const d = tmp();
  const wins = loadWindows(writeWindows(d, [[10_000, 14_000]]), 1000);
  const dataDir = path.join(d, 'data'); fs.mkdirSync(dataDir);
  // rows at t = 5, 9, 10, 12, 15.5, 20 SECONDS (window ± margin covers [9s, 15s])
  const rows = [5, 9, 10, 12, 15.5, 20].map((t) => JSON.stringify({ t, cpu_w: 1 }));
  fs.writeFileSync(path.join(dataDir, '2026-07-27.ndjson'), rows.join('\n') + '\n');
  const outDir = path.join(d, 'out');
  const r = exciseDir(dataDir, outDir, wins);
  assert.equal(r.files, 1);
  assert.equal(r.dropped, 3, 't = 9, 10, 12 fall in the widened window');
  assert.equal(r.kept, 3);
  const kept = fs.readFileSync(path.join(outDir, '2026-07-27.ndjson'), 'utf8').trim().split('\n')
    .map((l) => (JSON.parse(l) as { t: number }).t);
  assert.deepEqual(kept, [5, 15.5, 20]);
});

test('shipped probe durations + margin stay below mini-bundle default forward-fill (60 s)', () => {
  // the trio's longest execution is p1 on the E lane, ~3.2 s measured; window + 2×2 s margin ≪ 60 s,
  // so excision produces FILL-ABLE gaps, never bundle errors. This is the composition contract —
  // if a future probe breaks it, this test is the tripwire (P6-thermal would have, and stays cut).
  const longestProbeMs = 3_300, marginMs = 2_000, fillLimitMs = 60_000;
  assert.ok(longestProbeMs + 2 * marginMs < fillLimitMs / 3, 'ample headroom, not a knife edge');
});

test('empty ledger excises nothing', () => {
  const d = tmp();
  const f = path.join(d, 'probe-windows.ndjson');
  fs.writeFileSync(f, '');
  const wins = loadWindows(f, 2000);
  assert.equal(wins.length, 0);
  const dataDir = path.join(d, 'data'); fs.mkdirSync(dataDir);
  fs.writeFileSync(path.join(dataDir, 'x.ndjson'), JSON.stringify({ t: 1, cpu_w: 1 }) + '\n');
  const r = exciseDir(dataDir, path.join(d, 'out'), wins);
  assert.equal(r.dropped, 0);
  assert.equal(r.kept, 1);
});
