// test/donation-ebh.test.ts — the donation e-BH rule (arXiv:2603.24792 D.3, Theorem 16).
//
// Properties locked: (1) superset of e-BH on every input (Theorem 16's strict-improvement
// direction); (2) matches the paper's rule on hand-computable cases, including one where
// donation rejects strictly more than e-BH; (3) sub-uniform behavior on an all-null vector
// (no rejection from mass that cannot be donated).

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { donationEbhSelect } from '../tools/donation-ebh.js';
import { eBhSelect } from '../tools/canary-sim.js';

function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

test('donation e-BH is a superset of e-BH on random inputs (Theorem 16 direction)', () => {
  const r = rng(17);
  for (let trial = 0; trial < 200; trial++) {
    const m = 5 + Math.floor(r() * 50);
    const e = Array.from({ length: m }, () => Math.exp(6 * (r() - 0.5)));
    const base = new Set(eBhSelect(e, 0.1));
    const don = new Set(donationEbhSelect(e, 0.1));
    for (const i of base) assert.ok(don.has(i), `e-BH selected ${i} but donation did not (trial ${trial})`);
  }
});

test('hand case: donation pushes a near-threshold e-value over using sub-threshold mass', () => {
  // m=4, q=0.5: e-BH single-rejection threshold m/(q·1) = 8. e = [7.5, 0.5, 0.5, 0.5]:
  // e-BH rejects nothing (7.5 < 8). Donation at r=1: min(7.5−8, 1) + 3·min(0.5, 1) = 1.0 ≥ 0 →
  // rejects the top unit; at r=2 the second unit's deficit (−3.5) sinks the sum → exactly [0].
  assert.deepEqual(eBhSelect([7.5, 0.5, 0.5, 0.5], 0.5), []);
  assert.deepEqual(donationEbhSelect([7.5, 0.5, 0.5, 0.5], 0.5), [0]);
  // The capped-donation boundary case from the paper's rule: e = [7.5, 1, 1, 1] reaches EXACTLY
  // zero at r=2 (0.25 − 0.75 + 0.5 = 0), so donation rejects BOTH top units — a unit at E = 1
  // can be rejected entirely on donated mass. FDR ≤ q still holds (compound e-values); this is
  // the boundary behavior, locked so nobody "fixes" it to intuition later.
  assert.deepEqual(donationEbhSelect([7.5, 1, 1, 1], 0.5), [0, 1]);
});

test('sub-threshold vectors reject nothing; a decisive e-value still rejects', () => {
  assert.deepEqual(donationEbhSelect([0.5, 0.5, 0.5, 0.5], 0.1), []);
  const sel = donationEbhSelect([100, 0.1, 0.1, 0.1], 0.5);
  assert.deepEqual(sel, [0]);
});
