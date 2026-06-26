// test/clustersynth-telemetry.test.ts — synthetic telemetry on the committed s0
// topology (tools/clustersynth-telemetry.ts). Binds the output shape, the fault
// mask, and the STATIONARY common-mode property (bounded, not random-walk drift).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { parseTopology } from '../tools/clustersynth-topology';
import { generateTelemetry } from '../tools/clustersynth-telemetry';

const S0 = join(__dirname, '_substrate', 'clustersynth-gb200-s0.json');
const topo = () => parseTopology(JSON.parse(readFileSync(S0, 'utf8')));
const skip = !existsSync(S0) && 's0 fixture missing';

test('generateTelemetry(s0): shapes align (X = shards×T, one factor signal per domain)', { skip }, () => {
  const p = topo();
  const tel = generateTelemetry(p, { T: 600, calLen: 450, testLen: 150, seed: 3 });
  assert.strictEqual(tel.X.length, p.nShards);
  assert.strictEqual(tel.X[0].length, 600);
  assert.strictEqual(tel.factorSignals.length, p.domains.length);
  assert.strictEqual(tel.factorSignals[0].length, 600);
  assert.ok(tel.X.every((row) => row.every(Number.isFinite)));
});

test('generateTelemetry(s0): ~faultFrac of shards fail; cal window precedes the fault onset', { skip }, () => {
  const p = topo();
  const tel = generateTelemetry(p, { faultFrac: 0.1, seed: 3 });
  const nFail = tel.failed.filter(Boolean).length;
  assert.ok(nFail >= 1 && nFail <= 12, `expected ~10% of 72 failed; got ${nFail}`);
  assert.ok(tel.faultOnset >= tel.calLen, 'fault onset must be at/after the clean cal window');
});

test('generateTelemetry(s0): the common-mode is STATIONARY (bounded), not random-walk drift', { skip }, () => {
  const p = topo();
  const stat = generateTelemetry(p, { commonModeStd: 8, commonModeRho: 0.98, seed: 3 });
  const drift = generateTelemetry(p, { commonModeStd: 8, commonModeRho: 1, seed: 3 }); // unit root
  const maxAbs = (sig: number[][]) => Math.max(...sig.map((s) => Math.max(...s.map(Math.abs))));
  // A stationary AR(1) at std 8 stays within a modest envelope; the unit-root variant
  // wanders far. (This is the spurious-regression pathology the stationary model avoids.)
  assert.ok(maxAbs(stat.factorSignals) < 80, `stationary common-mode should stay bounded; got ${maxAbs(stat.factorSignals)}`);
  assert.ok(maxAbs(drift.factorSignals) > maxAbs(stat.factorSignals),
    'unit-root common-mode should excurse further than the stationary one');
});

test('generateTelemetry(s0): clustered faults are confined to one locality group', { skip }, () => {
  const p = topo();
  const tel = generateTelemetry(p, { clustered: true, seed: 3 });
  assert.ok(tel.faultGroup >= 0, 'clustered run records a fault group');
  const failedGroups = new Set(tel.failed.map((f, i) => (f ? p.localizationGroups[i] : -2)).filter((g) => g >= 0));
  assert.deepStrictEqual([...failedGroups], [tel.faultGroup], 'all failed shards lie in the fault group');
});
