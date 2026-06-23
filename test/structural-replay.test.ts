// test/structural-replay.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { injectCollapse, detectStructuralCollapse } from '../tools/structural-replay.js';
import { probationaryEnd } from '../tools/shadow-replay.js';

test('injectCollapse scales only the collapse window', () => {
  const v = new Array(100).fill(1000);
  const out = injectCollapse(v, 40, 5, 0.5);
  assert.equal(out[39], 1000);
  assert.equal(out[40], 500);
  assert.equal(out[44], 500);
  assert.equal(out[45], 1000);
  assert.equal(v[40], 1000, 'original not mutated');
});

test('FP guarantee: benign integer steps in a high count do NOT false-fire (relative null)', () => {
  // mean ~2000 with benign +/-20 steps (1% wiggle) — the failure mode that broke the
  // absolute-variance detector. The relative detector with a 5% floor must absorb it.
  const v: number[] = [];
  for (let i = 0; i < 1500; i++) v.push(2000 + (i % 7 === 0 ? 20 : 0));
  const probEnd = probationaryEnd(v.length);
  assert.equal(detectStructuralCollapse(v, probEnd, 0.01).length, 0, 'benign 1% steps must not fire');
});

test('FD: an injected sustained collapse IS detected, with bounded latency', () => {
  const v: number[] = [];
  for (let i = 0; i < 1500; i++) v.push(2000 + (i % 7 === 0 ? 20 : 0));
  const probEnd = probationaryEnd(v.length);
  const at = 1000;
  const injected = injectCollapse(v, at, 24, 0); // full collapse: count -> 0
  const fires = detectStructuralCollapse(injected, probEnd, 0.01);
  const hit = fires.find((f) => f >= at && f < at + 24 + 10);
  assert.ok(hit !== undefined, 'a full structural collapse must be detected');
  assert.ok(hit! - at <= 24, `detection latency should be within the collapse; got ${hit! - at}`);
});

test('FD: a mild 50% drop is also detected; a benign 2% dip is not', () => {
  const v = new Array(1500).fill(2000);
  const probEnd = probationaryEnd(v.length);
  const half = injectCollapse(v, 1000, 24, 0.5);
  assert.ok(detectStructuralCollapse(half, probEnd, 0.01).some((f) => f >= 1000 && f < 1034), '50% drop must fire');
  const mild = injectCollapse(v, 1000, 24, 0.98); // 2% dip < 5% floor
  assert.equal(detectStructuralCollapse(mild, probEnd, 0.01).filter((f) => f >= 1000).length, 0, '2% dip must not fire');
});
