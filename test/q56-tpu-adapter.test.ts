// test/q56-tpu-adapter.test.ts — Phase 3 SLICE 2 WU-Phase3-2A bindings (R56).
//
// Binds AC-R56-1 through AC-R56-12 + AC-R56-15 (13 runtime tests) per
// Q-R56-SPEC.md § 5. AC-R56-13 (typecheck) and AC-R56-14 (test count) are
// binding-command attestations reported by the Implementer at chore-A;
// not runtime-bound. They are mechanically verified by
// coordination/specs/Q-R56-EMPIRICAL.sh per Rule 1 sub-class
// `empirical-command-attestation` (R46 canonical landing).
//
// AC-R56-15 (anti-scope diff) is a runtime test that the Implementer
// appends in chore-B with the chore-A SHA substituted into the diff
// baseline literal.
//
// Covers: JAX-style TPU topology JSON parser (v4 4x4x4 cube + v5p 4x4x4
// cube + 2x2x2 sub-cube); tpu_version discrimination (v4 / v5p both →
// tpu_shard node kind); edge relationship = 'tpu_ici_peer' (R56 enum
// addition); undirected-deduped canonical ordering; TpuTopologySource
// interface conformance; snapshotHash delegation; id/version fallback
// chain; sub-cube partial detection (slice_shape.some(dim < 4)); throw on
// 6 malformed-input shapes; A16 verdict.ts literal preservation;
// anti-scope SHA-pinned diff.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import {
  parseTpuTopologyJson,
  TpuTopologySource,
} from '../engine/topology/tpu-source';
import { computeSnapshotHash } from '../engine/topology-overlay';
import type { TopologyNode, TopologyEdge } from '../engine/types/verdict';

const V4_CUBE       = readFileSync('test/_substrate/tpu-fixture-v4-cube.json',          'utf8');
const V5P_CUBE      = readFileSync('test/_substrate/tpu-fixture-v5p-cube.json',         'utf8');
const SPARSE_SUBCUBE = readFileSync('test/_substrate/tpu-fixture-sparse-subcube.json',  'utf8');

// AC-R56-1: v4 cube fixture parses to 64 tpu_shard nodes + 192 tpu_ici_peer edges
test('AC-R56-1: parseTpuTopologyJson on v4 4x4x4 cube → 64 nodes + 192 edges + tpu_version=v4 + partial=false', () => {
  const { snapshot, partial, tpu_version } = parseTpuTopologyJson(V4_CUBE, { fetched_at_ts: 1_700_000_000 });
  assert.strictEqual(snapshot.nodes.length, 64);
  assert.strictEqual(snapshot.edges.length, 192);
  assert.strictEqual(partial, false);
  assert.strictEqual(tpu_version, 'v4');
});

// AC-R56-2: every v4 fixture node has kind === 'tpu_shard'
test("AC-R56-2: every node from v4 fixture has kind === 'tpu_shard'", () => {
  const { snapshot } = parseTpuTopologyJson(V4_CUBE);
  for (const n of snapshot.nodes) {
    const k: TopologyNode['kind'] = n.kind;
    assert.strictEqual(k, 'tpu_shard');
  }
});

// AC-R56-3: every v4 fixture edge has relationship === 'tpu_ici_peer'
test("AC-R56-3: every edge from v4 fixture has relationship === 'tpu_ici_peer'", () => {
  const { snapshot } = parseTpuTopologyJson(V4_CUBE);
  for (const e of snapshot.edges) {
    const r: TopologyEdge['relationship'] = e.relationship;
    assert.strictEqual(r, 'tpu_ici_peer');
  }
});

// AC-R56-4: v4 edges are canonical undirected-deduped (from < to lex); 192 unique pairs
test('AC-R56-4: v4 edges are canonical undirected-deduped (from < to); 192 unique pairs', () => {
  const { snapshot } = parseTpuTopologyJson(V4_CUBE);
  // (a) canonical ordering: from < to lex for every edge
  for (const e of snapshot.edges) {
    assert.ok(e.from < e.to, `edge ${e.from}->${e.to} should have from < to`);
  }
  // (b) no duplicate pair
  const keys = snapshot.edges.map((e) => `${e.from}|${e.to}`);
  assert.strictEqual(new Set(keys).size, keys.length, 'edge pairs are unique');
  assert.strictEqual(keys.length, 192, 'exactly 192 deduped edges');
});

// AC-R56-5: v5p cube fixture parses to 64 tpu_shard nodes + 192 tpu_ici_peer edges
test('AC-R56-5: parseTpuTopologyJson on v5p 4x4x4 cube → 64 nodes + 192 edges + tpu_version=v5p + partial=false', () => {
  const { snapshot, partial, tpu_version } = parseTpuTopologyJson(V5P_CUBE, { fetched_at_ts: 1_700_000_000 });
  assert.strictEqual(snapshot.nodes.length, 64);
  assert.strictEqual(snapshot.edges.length, 192);
  assert.strictEqual(partial, false);
  assert.strictEqual(tpu_version, 'v5p');
});

// AC-R56-6: every v5p fixture node has kind === 'tpu_shard' AND every edge has 'tpu_ici_peer'
test("AC-R56-6: every node from v5p fixture has kind === 'tpu_shard' and edges have 'tpu_ici_peer'", () => {
  const { snapshot } = parseTpuTopologyJson(V5P_CUBE);
  for (const n of snapshot.nodes) {
    const k: TopologyNode['kind'] = n.kind;
    assert.strictEqual(k, 'tpu_shard');
  }
  for (const e of snapshot.edges) {
    const r: TopologyEdge['relationship'] = e.relationship;
    assert.strictEqual(r, 'tpu_ici_peer');
  }
});

// AC-R56-7: TpuTopologySource implements TopologySource interface
// AND id/version fallback chain branches are observable
test('AC-R56-7: TpuTopologySource implements TopologySource + id/version fallback', async () => {
  // (a) default construction — exercises branch 2 of `??`-chain
  //     (opts.id undefined → snapshot.source_id default literal 'tpu_topology_source')
  const src = new TpuTopologySource(V4_CUBE, { fetched_at_ts: 1_700_000_000 });
  assert.strictEqual(src.id, 'tpu_topology_source');
  assert.strictEqual(src.version, 'tpu-v4-1');
  const snap = await src.fetchSnapshot();
  assert.ok(Array.isArray(snap.nodes));
  assert.ok(Array.isArray(snap.edges));
  const h = src.snapshotHash(snap);
  assert.ok(typeof h === 'string' && h.length > 0);

  // (b) explicit opts.id + opts.version — exercises branch 1 of `??`-chain
  const srcExplicit = new TpuTopologySource(V4_CUBE, {
    id: 'explicit-test-id',
    version: 'explicit-test-ver',
    fetched_at_ts: 1_700_000_000,
  });
  assert.strictEqual(srcExplicit.id, 'explicit-test-id');
  assert.strictEqual(srcExplicit.version, 'explicit-test-ver');
});

// AC-R56-8: snapshotHash delegates to computeSnapshotHash
test('AC-R56-8: snapshotHash delegates to computeSnapshotHash', async () => {
  const src = new TpuTopologySource(V4_CUBE, { fetched_at_ts: 1_700_000_000 });
  const snap = await src.fetchSnapshot();
  assert.strictEqual(src.snapshotHash(snap), computeSnapshotHash(snap));
});

// AC-R56-9: sparse sub-cube fixture (slice_shape=[2,2,2]) → 8 nodes + 12 edges + partial=true
test('AC-R56-9: sparse sub-cube fixture (2x2x2 mesh-only) → 8 nodes + 12 edges + partial=true', () => {
  const { snapshot, partial, tpu_version } = parseTpuTopologyJson(SPARSE_SUBCUBE);
  assert.strictEqual(snapshot.nodes.length, 8);
  assert.strictEqual(snapshot.edges.length, 12);
  assert.strictEqual(partial, true);
  assert.strictEqual(tpu_version, 'v5p');
});

// AC-R56-10: malformed input throws one of the documented error names (6 sub-cases)
test('AC-R56-10: malformed input throws TPU_PARSE_* (6 sub-cases)', () => {
  // (a) invalid JSON
  assert.throws(() => parseTpuTopologyJson('not-json'), /TPU_PARSE_INVALID_JSON/);
  // (b) missing tpu_version
  assert.throws(
    () => parseTpuTopologyJson(JSON.stringify({ slice_shape: [4, 4, 4], chips: [] })),
    /TPU_PARSE_MISSING_TPU_VERSION/,
  );
  // (c) unknown tpu_version
  assert.throws(
    () => parseTpuTopologyJson(JSON.stringify({ tpu_version: 'v99', slice_shape: [4, 4, 4], chips: [{ chip: 'tpu-0' }] })),
    /TPU_PARSE_UNKNOWN_TPU_VERSION: v99/,
  );
  // (d) invalid slice_shape (not array of 3 positive integers)
  assert.throws(
    () => parseTpuTopologyJson(JSON.stringify({ tpu_version: 'v4', slice_shape: [4, 4], chips: [{ chip: 'tpu-0' }] })),
    /TPU_PARSE_INVALID_SLICE_SHAPE/,
  );
  // (e) missing chips
  assert.throws(
    () => parseTpuTopologyJson(JSON.stringify({ tpu_version: 'v4', slice_shape: [4, 4, 4] })),
    /TPU_PARSE_MISSING_CHIPS/,
  );
  // (f) empty chips
  assert.throws(
    () => parseTpuTopologyJson(JSON.stringify({ tpu_version: 'v4', slice_shape: [4, 4, 4], chips: [] })),
    /TPU_PARSE_NO_CHIPS/,
  );
});

// AC-R56-11: tpu_version discriminator: v4 and v5p both → tpu_shard nodes
test('AC-R56-11: tpu_version discriminator maps v4 + v5p both → tpu_shard node kind', () => {
  const { tpu_version: tv_v4,  snapshot: snap_v4  } = parseTpuTopologyJson(V4_CUBE);
  assert.strictEqual(tv_v4, 'v4');
  assert.strictEqual(snap_v4.nodes[0].kind, 'tpu_shard');

  const { tpu_version: tv_v5p, snapshot: snap_v5p } = parseTpuTopologyJson(V5P_CUBE);
  assert.strictEqual(tv_v5p, 'v5p');
  assert.strictEqual(snap_v5p.nodes[0].kind, 'tpu_shard');
});

// AC-R56-12: A16 — engine/types/verdict.ts retains the 'correlational_not_causal: true' literal
test("AC-R56-12: A16 — verdict.ts retains 'correlational_not_causal: true' literal", () => {
  const text = readFileSync('engine/types/verdict.ts', 'utf8');
  assert.ok(
    text.includes('correlational_not_causal: true'),
    "verdict.ts must contain literal 'correlational_not_causal: true' per Addition #26 D4",
  );
});

// AC-R56-15: anti-scope file-set diff against round-start baseline 4447586
// (Appended by Implementer at chore-B with chore-A SHA substituted.)
test('AC-R56-15: round-start-to-chore-A diff ⊆ R56 allowed-set (chore-A SHA pinned)', () => {
  const BASELINE_SHA = '4447586';
  const CHORE_A_SHA = '93d3689';
  const ALLOWED_SET = new Set<string>([
    'engine/topology/tpu-source.ts',
    'engine/types/verdict.ts',
    'test/q56-tpu-adapter.test.ts',
    'test/_substrate/tpu-fixture-v4-cube.json',
    'test/_substrate/tpu-fixture-v5p-cube.json',
    'test/_substrate/tpu-fixture-sparse-subcube.json',
    'coordination/VENDORING-MANIFEST.md',
    'coordination/specs/Q-R56-SPEC.md',
    'coordination/specs/Q-R56-SPEC-AUDIT.md',
    'coordination/specs/Q-R56-EMPIRICAL.sh',
    'coordination/NEXT-ROLE.md',
    'coordination/MEMORIAL.md',
    // Conditional 13th entry per spec § 3: added IFF a HALT fires mid-round.
  ]);
  const diffOutput = execSync(`git diff ${BASELINE_SHA}..${CHORE_A_SHA} --name-only`, { encoding: 'utf8' });
  const paths = diffOutput.split('\n').filter((p) => p.length > 0);
  for (const p of paths) {
    assert.ok(ALLOWED_SET.has(p), `unexpected R56 path in chore-A diff: ${p}`);
  }
});
