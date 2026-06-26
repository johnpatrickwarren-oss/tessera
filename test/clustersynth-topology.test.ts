// test/clustersynth-topology.test.ts — parse the committed clustersynth s0
// topology (tools/clustersynth-topology.ts) into the per-shard factor structure.
// s0 (72 shards) is committed to test/_substrate so this runs in CI.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { parseTopology } from '../tools/clustersynth-topology';

const S0 = join(__dirname, '_substrate', 'clustersynth-gb200-s0.json');
const load = () => parseTopology(JSON.parse(readFileSync(S0, 'utf8')));

test('parseTopology(s0): 72 gpu_shards with cooling/psu/rack factor structure', { skip: !existsSync(S0) && 's0 fixture missing' }, () => {
  const p = load();
  assert.strictEqual(p.nShards, 72);
  assert.deepStrictEqual(p.factorKinds, ['cooling_zone', 'psu', 'rack']);
  assert.strictEqual(p.factorPartitions.length, 3);
  for (const part of p.factorPartitions) assert.strictEqual(part.length, 72);
  // s0 carries 1 cooling zone, 8 psus, 1 rack (verified against the generated fixture).
  const domainsOf = (k: number) => new Set(p.factorPartitions[k].filter((x) => x >= 0)).size;
  assert.strictEqual(domainsOf(0), 1, 'cooling_zone domains');
  assert.strictEqual(domainsOf(1), 8, 'psu domains');
  assert.strictEqual(domainsOf(2), 1, 'rack domains');
});

test('parseTopology(s0): every shard resolves to all three domains; membership indexes domains', { skip: !existsSync(S0) && 's0 fixture missing' }, () => {
  const p = load();
  assert.strictEqual(p.domains.length, 10); // 1 + 8 + 1
  for (const m of p.membership) {
    assert.strictEqual(m.length, 3, 'each shard belongs to one cooling + one psu + one rack domain');
    for (const d of m) assert.ok(d >= 0 && d < p.domains.length, 'membership indexes the flat domain list');
  }
  // No unresolved (-1) partition labels.
  for (const part of p.factorPartitions) assert.ok(part.every((x) => x >= 0));
});

test('parseTopology(s0): localizationGroups align with the rack partition', { skip: !existsSync(S0) && 's0 fixture missing' }, () => {
  const p = load();
  assert.strictEqual(p.localizationKind, 'rack');
  assert.strictEqual(p.localizationGroups.length, 72);
  // s0 is a single rack → a single localization group.
  assert.strictEqual(new Set(p.localizationGroups).size, 1);
});
