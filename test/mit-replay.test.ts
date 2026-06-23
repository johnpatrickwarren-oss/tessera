// test/mit-replay.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { replayFiresAdaptive } from '../tools/mit-replay.js';
import { calibrateBaseline, replayFires, probationaryEnd } from '../tools/shadow-replay.js';

// Gap #2 mechanism: a sustained regime shift makes a STATIC baseline (calibrated on
// the pre-shift regime) over-fire; an ADAPTIVE (trailing-window) baseline catches up
// to the new regime and fires far less. Deterministic series (no RNG).
test('adaptive baselining fires far less than static on a sustained regime shift', () => {
  const v: number[] = [];
  for (let i = 0; i < 2000; i++) v.push(i < 600 ? 0.01 * (i % 3) : 5 + 0.01 * (i % 3)); // step at 600
  const probEnd = probationaryEnd(v.length); // 300, inside the pre-shift regime
  const cal = calibrateBaseline(v.slice(0, probEnd), 'simple');
  const staticFires = replayFires(v, probEnd, cal, 0.01).length;
  const adaptiveFires = replayFiresAdaptive(v, probEnd, 0.01).length;
  assert.ok(staticFires > 0, `static must over-fire on the regime shift; got ${staticFires}`);
  // Tightened (M1): require a SUBSTANTIAL reduction (>5x), not merely "fewer" — so an
  // adaptive variant that barely helps (or a degenerate window) would fail. It should
  // still fire a few times during the catch-up after the step (not zero).
  assert.ok(adaptiveFires > 0, `adaptive should fire during catch-up; got ${adaptiveFires}`);
  assert.ok(adaptiveFires < staticFires / 5, `adaptive (${adaptiveFires}) must be << static (${staticFires})`);
});

test('adaptive == no spurious fires on a flat (stationary) series', () => {
  const flat = new Array(1500).fill(3);
  assert.equal(replayFiresAdaptive(flat, probationaryEnd(flat.length), 0.01).length, 0);
});
