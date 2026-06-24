// test/lifecycle-monitor.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { monitorLifecycle, monitorStatic, genDrift, genFault, M0, ALPHA } from '../tools/lifecycle-monitor.js';

function lcg(seed: number) { let s = seed; return () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff - 0.5; }; }
const FAULT_AT = 1200; // matches lifecycle-monitor's synthetic fault onset

test('on slow drift, the lifecycle re-records and raises FEWER alarms than a static baseline', () => {
  const v = genDrift(lcg(101), 0.02);
  const life = monitorLifecycle(v, M0, ALPHA);
  const stat = monitorStatic(v, M0, ALPHA);
  assert.ok(life.reRecords > 0, 'sustained drift alarms must trigger at least one re-record');
  assert.ok(life.alarms.length < stat.length, `lifecycle alarms (${life.alarms.length}) must be fewer than static (${stat.length})`);
});

test('on a sharp fault, the lifecycle still detects it (occasional alarm does not trip the rate trigger)', () => {
  const v = genFault(lcg(202));
  const life = monitorLifecycle(v, M0, ALPHA);
  assert.ok(life.alarms.some((a) => a >= FAULT_AT && a < FAULT_AT + 200), 'the sharp fault must raise an alarm');
});

test('monitorStatic never re-records (rateThresh = Infinity)', () => {
  const v = genDrift(lcg(303), 0.02);
  // static returns just alarms; lifecycle with default trigger should re-record on this drift, static should not.
  assert.ok(monitorLifecycle(v, M0, ALPHA, { rateThresh: Infinity }).reRecords === 0, 'rateThresh Infinity must never re-record');
});
