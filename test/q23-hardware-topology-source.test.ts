// test/q23-hardware-topology-source.test.ts — Phase 2 SLICE 3.A bindings (R23).
//
// Binds AC-R23-1 through AC-R23-12 (runtime) per Q-R23-SPEC.md § 5.
// AC-R23-13 (typecheck) and AC-R23-14 (test count) are binding-command
// attestations reported by the Implementer at GREEN; not runtime-bound.
// AC-R23-15 (anti-scope diff) is a runtime test added at chore-B with
// the chore-A SHA substituted into the diff baseline literal.
//
// Covers: TopologyNode.kind extension (psu + cooling_zone);
// TopologyEdge.relationship extension (nvlink_peer); HardwareTopologySource
// interface conformance + fallback-chain branch binding + fetchSnapshot
// identity + snapshotHash delegation; v9Y multi-rack fixture default shape +
// hash determinism; inherited Addition #25 D5 + #26 D4 preservation;
// vendored-at-pin SHA preservation; manifest notes-column accuracy.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { HardwareTopologySource } from '../engine/hardware-topology-source';
import { computeSnapshotHash } from '../engine/topology-overlay';
import { makeV9YMultiRackCluster } from './_substrate/v9Y-multi-rack-cluster';
import type { TopologyNode, TopologyEdge } from '../engine/types/verdict';

// AC-R23-1: psu + cooling_zone literals accepted by TopologyNode.kind union
test('AC-R23-1: psu and cooling_zone are accepted as TopologyNode.kind', () => {
  const kindPsu: TopologyNode['kind'] = 'psu';
  const kindCz: TopologyNode['kind'] = 'cooling_zone';
  assert.strictEqual(kindPsu, 'psu');
  assert.strictEqual(kindCz, 'cooling_zone');
});

// AC-R23-2: nvlink_peer literal accepted by TopologyEdge.relationship union
test('AC-R23-2: nvlink_peer is accepted as TopologyEdge.relationship', () => {
  const rel: TopologyEdge['relationship'] = 'nvlink_peer';
  assert.strictEqual(rel, 'nvlink_peer');
});

// AC-R23-3: manifest row for verdict.ts contains the three R23 literal strings
test('AC-R23-3: VENDORING-MANIFEST.md verdict.ts row contains psu, cooling_zone, nvlink_peer', () => {
  const manifest = readFileSync('coordination/VENDORING-MANIFEST.md', 'utf8');
  const verdictRow = manifest.split('\n').find(line => line.includes('engine/types/verdict.ts'));
  assert.ok(verdictRow, 'verdict.ts row found in manifest');
  assert.ok(verdictRow!.includes('psu'), "manifest verdict.ts row contains 'psu'");
  assert.ok(verdictRow!.includes('cooling_zone'), "manifest verdict.ts row contains 'cooling_zone'");
  assert.ok(verdictRow!.includes('nvlink_peer'), "manifest verdict.ts row contains 'nvlink_peer'");
});

// AC-R23-4: HardwareTopologySource satisfies TopologySource interface at runtime
test('AC-R23-4: HardwareTopologySource implements TopologySource interface', async () => {
  const snapshot = makeV9YMultiRackCluster();
  const instance = new HardwareTopologySource(snapshot, { id: 'h-test-1', version: 'h-test-v1' });
  assert.strictEqual(typeof instance.id, 'string');
  assert.strictEqual(typeof instance.version, 'string');
  const fetched = await instance.fetchSnapshot();
  assert.ok(Array.isArray(fetched.nodes), 'fetchSnapshot returns TopologySnapshot with nodes array');
  const hash = instance.snapshotHash(snapshot);
  assert.ok(typeof hash === 'string' && hash.length > 0, 'snapshotHash returns non-empty string');
});

// AC-R23-5: id fallback chain — each sub-case binds one branch
test('AC-R23-5: HardwareTopologySource id fallback chain', () => {
  const baseSnapshot = makeV9YMultiRackCluster();

  // (a) opts.id takes priority over snapshot.source_id
  const snapWithSourceId = { ...baseSnapshot, source_id: 'snap-id-A' };
  const instA = new HardwareTopologySource(snapWithSourceId, { id: 'explicit-id' });
  assert.strictEqual(instA.id, 'explicit-id');

  // (b) opts.id undefined → falls back to snapshot.source_id
  const instB = new HardwareTopologySource(snapWithSourceId, {});
  assert.strictEqual(instB.id, 'snap-id-A');

  // (c) opts.id undefined AND snapshot.source_id absent → default literal
  const snapNoSourceId = { ...baseSnapshot, source_id: undefined as unknown as string };
  const instC = new HardwareTopologySource(snapNoSourceId, {});
  assert.strictEqual(instC.id, 'hardware_topology_source');
});

// AC-R23-6: version fallback chain — structural parallel to AC-R23-5
test('AC-R23-6: HardwareTopologySource version fallback chain', () => {
  const baseSnapshot = makeV9YMultiRackCluster();

  // (a) opts.version takes priority over snapshot.source_version
  const snapWithSourceVer = { ...baseSnapshot, source_version: 'snap-ver-A' };
  const instA = new HardwareTopologySource(snapWithSourceVer, { version: 'explicit-ver' });
  assert.strictEqual(instA.version, 'explicit-ver');

  // (b) opts.version undefined → falls back to snapshot.source_version
  const instB = new HardwareTopologySource(snapWithSourceVer, {});
  assert.strictEqual(instB.version, 'snap-ver-A');

  // (c) opts.version undefined AND snapshot.source_version absent → default literal
  const snapNoSourceVer = { ...baseSnapshot, source_version: undefined as unknown as string };
  const instC = new HardwareTopologySource(snapNoSourceVer, {});
  assert.strictEqual(instC.version, 'hardware-1');
});

// AC-R23-7: fetchSnapshot identity + snapshotHash delegation
test('AC-R23-7: fetchSnapshot returns identity-equal snapshot; snapshotHash delegates to computeSnapshotHash', async () => {
  const snapshot = makeV9YMultiRackCluster();
  const instance = new HardwareTopologySource(snapshot);
  const returned = await instance.fetchSnapshot();
  assert.strictEqual(returned, snapshot, 'fetchSnapshot returns identity-equal reference');
  const hashA = instance.snapshotHash(snapshot);
  const hashB = computeSnapshotHash(snapshot);
  assert.strictEqual(hashA, hashB, 'snapshotHash delegates to computeSnapshotHash (same 64-char hex)');
});

// AC-R23-8: v9Y fixture default topology matches § 2.4 enumeration
test('AC-R23-8: makeV9YMultiRackCluster default topology matches spec', () => {
  const snap = makeV9YMultiRackCluster();
  assert.strictEqual(snap.nodes.length, 10, 'nodes.length === 10');
  assert.strictEqual(snap.edges.length, 14, 'edges.length === 14');
  assert.strictEqual(snap.nodes.filter(n => n.kind === 'rack').length, 2, '2 rack nodes');
  assert.strictEqual(snap.nodes.filter(n => n.kind === 'psu').length, 2, '2 psu nodes');
  assert.strictEqual(snap.nodes.filter(n => n.kind === 'cooling_zone').length, 2, '2 cooling_zone nodes');
  assert.strictEqual(snap.nodes.filter(n => n.kind === 'gpu_shard').length, 4, '4 gpu_shard nodes');
  assert.strictEqual(snap.edges.filter(e => e.relationship === 'contains').length, 12, '12 contains edges');
  assert.strictEqual(snap.edges.filter(e => e.relationship === 'nvlink_peer').length, 2, '2 nvlink_peer edges');
  assert.strictEqual(snap.source_id, 'v9Y_synthetic_multi_rack', 'source_id matches spec');
  assert.strictEqual(snap.source_version, 'v9Y.1', 'source_version matches spec');
});

// AC-R23-9: computeSnapshotHash is deterministic on v9Y fixture
test('AC-R23-9: computeSnapshotHash is deterministic on v9Y fixture', () => {
  const snap = makeV9YMultiRackCluster();
  const hash1 = computeSnapshotHash(snap);
  const hash2 = computeSnapshotHash(snap);
  assert.strictEqual(hash1, hash2, 'two calls produce identical hash');
  assert.match(hash1, /^[0-9a-f]{64}$/, 'hash is 64-char lowercase hex');
});

// AC-R23-10: inherited Addition #25 D5 group_id format preserved in verdict-groups.ts
test('AC-R23-10: engine/verdict-groups.ts preserves Addition #25 D5 group_id format', () => {
  const src = readFileSync('engine/verdict-groups.ts', 'utf8');
  assert.match(src, /group-\$\{deployId\}-\$\{window_start_ts\}/);
});

// AC-R23-11: inherited Addition #26 D4 correlational_not_causal: true preserved in verdict.ts
test('AC-R23-11: engine/types/verdict.ts preserves Addition #26 D4 correlational_not_causal: true', () => {
  const src = readFileSync('engine/types/verdict.ts', 'utf8');
  assert.match(src, /correlational_not_causal:\s*true;/);
});

// AC-R23-12: all vendored .ts files in manifest have SHA-pin header; count === 40
test('AC-R23-12: vendored .ts file count === 40 and each has SHA-pin header', () => {
  const manifest = readFileSync('coordination/VENDORING-MANIFEST.md', 'utf8');
  const rows = manifest.split('\n').filter(line =>
    (line.includes('vendored-at-pin') || line.includes('vendored-with-deltas')) &&
    line.includes('.ts'),
  );
  const paths = rows.map(line => {
    const cols = line.split('|').map(c => c.trim());
    return cols[2]; // column index 2 = target path in manifest table format
  }).filter(p => p && p.endsWith('.ts'));

  assert.strictEqual(paths.length, 40, `expected 40 vendored .ts rows; got ${paths.length}`);

  for (const p of paths) {
    const content = readFileSync(p, 'utf8');
    const firstLine = content.split('\n')[0];
    assert.ok(
      firstLine.includes('VENDORED FROM DeploySignal main@5a72371'),
      `${p}: first line should contain SHA-pin header; got: ${firstLine}`,
    );
  }
});
