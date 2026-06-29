// test/clustersynth-mode-b-triad.test.ts — the ADR 0022 control triad wired into Mode B. A second matched
// control twin (c1−c2 sibling null) flags a contaminated control and routes detection to the clean sibling,
// eliminating the sign-blind false positive the twin-PAIR detector suffers (ADR 0021). Uses a committed
// triad mini fixture (1 rack, hourly) generated with CS_TRIAD=1 CS_CONTAMINATE=control.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as path from 'node:path';
import * as fs from 'node:fs';
import { loadScenarioBundle } from '../tools/clustersynth-scenario.js';
import { loadControlPairs, scoreCounterModeB, contrastEValuesFor, renderModeBLongBaseline } from '../tools/clustersynth-mode-b.js';
import { eBenjaminiHochberg } from '@johnpatrickwarren-oss/deploysignal-engine/fleet/e-bh';

const FIX = path.join(__dirname, '_substrate', 'clustersynth-mode-b-triad-mini');
const BASE = path.join(FIX, 'base'), MON = path.join(FIX, 'mon');

/** gpu-level faulted shards for a counter (mirrors the harness's internal faultedSet). */
function faultedFor(counterLoads: Array<{ name: string; load?: Record<string, number> }>, counter: string): Set<string> {
  const faults = JSON.parse(fs.readFileSync(path.join(MON, 'labels.json'), 'utf8')).faults as Array<{ level: string; type: string; counter: string | null; detach_factor: string | null; affected_shards: string[] }>;
  const load = counterLoads.find((c) => c.name === counter)?.load ?? {};
  const out = new Set<string>();
  for (const f of faults) {
    if (f.level !== 'gpu') continue;
    const hits = f.type === 'detachment' ? (f.detach_factor != null && (load[f.detach_factor] ?? 0) !== 0) : (f.counter === counter || f.counter == null);
    if (hits) for (const s of f.affected_shards) out.add(s);
  }
  return out;
}

test('the triad fixture pairs carry a second twin (control2 = #ctrl2)', () => {
  const pairs = loadControlPairs(MON);
  assert.equal(pairs.length, 72);
  assert.ok(pairs.every((p) => p.control2?.endsWith('#ctrl2')), 'every pair has a second matched twin');
});

test('scoreCounterModeB flags contaminated controls via the c1−c2 sibling null', () => {
  const healthy = loadScenarioBundle(BASE), mon = loadScenarioBundle(MON), pairs = loadControlPairs(MON);
  let flagged = 0;
  for (const c of mon.counters) { const r = scoreCounterModeB(healthy, mon, pairs, c.name, 0.1); if (r) flagged += r.flaggedControls; }
  assert.ok(flagged > 0, 'the triad detects the control-only contamination the contrast is sign-blind to');
});

test('the STREAMING path flags contaminated controls too (triad wired into reduceCmbCounter)', async () => {
  // Drive the multi-worker long-baseline streaming path over the committed (same-cadence) triad fixture and
  // assert the report now surfaces flagged controls — the streaming reducer routes the triad, not just the
  // in-memory path. This path fits each shard's three contrasts (t−c1, c1−c2, t−c2) from the CLEAN baseline
  // (Phase 1) and applies them on the monitoring window (Phase 2), so it matches the in-memory fit window.
  // The fixture baseline is short, so override the ≥2-month guard (plumbing test, like renderModeB's).
  process.env.CS_ALLOW_SHORT = '1';
  try {
    const out = await renderModeBLongBaseline(BASE, MON, 0.1, 2); // 2 worker threads → exercises byte-range triples
    assert.match(out, /CLUSTERSYNTH MODE B/);
    assert.match(out, /contaminated controls flagged \(triad, ADR 0022\): [1-9]/, 'streaming report flags ≥1 contaminated control');
  } finally {
    delete process.env.CS_ALLOW_SHORT;
  }
});

/** FP/TP/selected of an e-BH selection against the genuine-fault mask. */
function tally(sel: Iterable<number>, genuine: boolean[]): { fp: number; tp: number; sel: number } {
  let fp = 0, tp = 0, sel2 = 0;
  for (const i of sel) { sel2++; if (genuine[i]) tp++; else fp++; }
  return { fp, tp, sel: sel2 };
}

test('the triad eliminates the sign-blind false positive (vs the twin-pair detector) at full recall', () => {
  const healthy = loadScenarioBundle(BASE), mon = loadScenarioBundle(MON), pairs = loadControlPairs(MON);
  const contaminated = new Set<string>(JSON.parse(fs.readFileSync(path.join(MON, 'control.json'), 'utf8')).contamination.shards);
  const q = 0.1;
  const present = (p: { treatment: string; control: string; control2?: string }, c: string): boolean =>
    !!p.control2 && [p.treatment, p.control, p.control2].every((id) => healthy.series.get(`${id}\0${c}`) && mon.series.get(`${id}\0${c}`));
  const acc = { pairFp: 0, pairTp: 0, pairSel: 0, triadFp: 0, triadTp: 0, triadSel: 0, pos: 0 };
  for (const cs of mon.counters) {
    const counter = cs.name;
    const usable = pairs.filter((p) => present(p, counter));
    if (!usable.length) continue;
    const faulted = faultedFor(mon.counters, counter);
    // a control-only contaminated shard's TREATMENT is healthy → NOT a genuine treatment fault.
    const genuine = usable.map((p) => faulted.has(p.treatment) && !contaminated.has(p.treatment));
    acc.pos += genuine.filter(Boolean).length;
    const eC1 = contrastEValuesFor(healthy, mon, usable, counter, (p) => p.treatment, (p) => p.control);
    const eC2 = contrastEValuesFor(healthy, mon, usable, counter, (p) => p.treatment, (p) => p.control2!);
    const flag = contrastEValuesFor(healthy, mon, usable, counter, (p) => p.control, (p) => p.control2!);
    const bad = new Set(eBenjaminiHochberg(flag, q).selected);
    const triadE = eC1.map((v, i) => (bad.has(i) ? eC2[i] : v));
    const pr = tally(eBenjaminiHochberg(eC1, q).selected, genuine);
    const tr = tally(eBenjaminiHochberg(triadE, q).selected, genuine);
    acc.pairFp += pr.fp; acc.pairTp += pr.tp; acc.pairSel += pr.sel;
    acc.triadFp += tr.fp; acc.triadTp += tr.tp; acc.triadSel += tr.sel;
  }
  // the twin-pair detector false-fires on contaminated controls (treatment healthy); the triad does not.
  assert.ok(acc.pairFp >= 3, `pair detector should false-fire on contaminated controls, got ${acc.pairFp} FP`);
  assert.ok(acc.triadFp / Math.max(1, acc.triadSel) <= q + 1e-9, `triad FDP ${(acc.triadFp / Math.max(1, acc.triadSel)).toFixed(3)} should be ≤ q`);
  assert.ok(acc.triadFp < acc.pairFp, `triad (${acc.triadFp} FP) should cut the pair detector's false positives (${acc.pairFp})`);
  assert.ok(acc.triadTp / Math.max(1, acc.pos) >= 0.8, `triad keeps recall on genuine treatment faults (${acc.triadTp}/${acc.pos})`);
});
