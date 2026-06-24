// test/fault-discriminator.test.ts — Lever B (ADR 0016): benign-change vs fault discriminator.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { faultSignature, classify, classifyWithEvent, genShard, M, N, ShardType, Verdict } from '../tools/fault-discriminator.js';
import { mulberry32, scramble } from '../tools/calibration-envelope.js';

/** Majority verdict over `tr` deterministic trials of a shard type. */
function majority(type: ShardType, tr: number, fn: (v: number[]) => Verdict): Record<Verdict, number> {
  const c: Record<Verdict, number> = { healthy: 0, benign: 0, fault: 0 };
  for (let s = 0; s < tr; s++) c[fn(genShard(mulberry32(scramble(31 + s * 13)), type))]++;
  return c;
}
function sigRate(type: ShardType, tr: number): number {
  let n = 0;
  for (let s = 0; s < tr; s++) if (faultSignature(genShard(mulberry32(scramble(31 + s * 13)), type), M, N).hasSignature) n++;
  return n / tr;
}

test('AC-1: the fault SIGNATURE is near-baseline for a benign mean step but trips for variance/trend/collapse', () => {
  assert.ok(sigRate('benign', 60) <= 0.1, `benign mean step rarely trips a fault signature (${sigRate('benign', 60)})`);
  for (const t of ['fault-variance', 'fault-trend', 'fault-collapse'] as ShardType[]) {
    assert.ok(sigRate(t, 60) >= 0.9, `${t} trips its signature (${sigRate(t, 60)})`);
  }
});

test('AC-2: classify routes signature-bearing faults → fault, benign step → benign, healthy → healthy', () => {
  assert.ok(majority('healthy', 60, (v) => classify(v, M, N)).healthy >= 54, 'healthy → healthy');
  assert.ok(majority('benign', 60, (v) => classify(v, M, N)).benign >= 54, 'benign → benign');
  for (const t of ['fault-variance', 'fault-trend', 'fault-collapse'] as ShardType[]) {
    assert.ok(majority(t, 60, (v) => classify(v, M, N)).fault >= 54, `${t} → fault`);
  }
});

test('AC-3 (the irreducible limit): a mean-only fault is classified BENIGN — indistinguishable without an event', () => {
  const c = majority('fault-meanonly', 60, (v) => classify(v, M, N));
  assert.ok(c.benign >= 54, `mean-only fault routed to benign (missed): ${JSON.stringify(c)}`);
  assert.ok(c.fault <= 6, 'the signature test does NOT catch the mean-only fault');
});

test('event channel: an UNEXPLAINED mean fire (no event) → fault; the same fire WITH an event → benign', () => {
  let caughtNoEvent = 0, benignWithEvent = 0;
  for (let s = 0; s < 60; s++) {
    const v = genShard(mulberry32(scramble(31 + s * 13)), 'fault-meanonly');
    if (classifyWithEvent(v, M, N, false) === 'fault') caughtNoEvent++;     // no event → suspicious → fault
    if (classifyWithEvent(v, M, N, true) === 'benign') benignWithEvent++;   // event explains it → benign
  }
  assert.ok(caughtNoEvent >= 54, `unexplained mean fire caught as fault (${caughtNoEvent}/60)`);
  assert.ok(benignWithEvent >= 54, `event-explained fire treated as benign (${benignWithEvent}/60)`);
});
