// test/adaptive-baseline.test.ts — the shared regime-aware replay primitive.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { replayFiresAdaptive } from '../tools/adaptive-baseline.js';
import { calibrateBaseline, replayFires, probationaryEnd } from '../tools/shadow-replay.js';

test('adaptive fires far less than static on a sustained regime shift (gap #2 mechanism)', () => {
  const v: number[] = [];
  for (let i = 0; i < 2000; i++) v.push(i < 600 ? 0.01 * (i % 3) : 5 + 0.01 * (i % 3));
  const probEnd = probationaryEnd(v.length);
  const cal = calibrateBaseline(v.slice(0, probEnd), 'simple');
  const staticFires = replayFires(v, probEnd, cal, 0.01).length;
  const adaptiveFires = replayFiresAdaptive(v, probEnd, 0.01).length;
  assert.ok(staticFires > 0, `static must over-fire; got ${staticFires}`);
  assert.ok(adaptiveFires > 0 && adaptiveFires < staticFires / 5, `adaptive (${adaptiveFires}) must be << static (${staticFires})`);
});

test('adaptive never fires on a flat (stationary) series', () => {
  const flat = new Array(1500).fill(3);
  assert.equal(replayFiresAdaptive(flat, probationaryEnd(flat.length), 0.01).length, 0);
});

test('adaptive window is configurable via opts', () => {
  const v = new Array(1200).fill(2);
  // opts thread through without error; flat series -> no fires regardless of window.
  assert.equal(replayFiresAdaptive(v, probationaryEnd(v.length), 0.01, { window: 100, recalEvery: 25 }).length, 0);
});
