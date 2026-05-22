// test/q53-neuron-adapter.test.ts — Phase 3 SLICE 1 WU-Phase3-1 bindings (R53).
//
// Binds AC-R53-1 through AC-R53-12 + AC-R53-15 (13 runtime tests) per Q-R53-SPEC.md § 5.
// AC-R53-13 (typecheck) and AC-R53-14 (test count) are binding-command attestations
// reported by the Implementer at chore-A; not runtime-bound. They are mechanically
// verified by coordination/specs/Q-R53-EMPIRICAL.sh per Rule 1 sub-class
// `empirical-command-attestation` (R46 canonical landing).
//
// AC-R53-15 (anti-scope diff) is a runtime test that the Implementer appends in
// chore-B with the chore-A SHA substituted into the diff baseline literal.
//
// Covers: neuron-ls --json-output parser (Trainium 2D Torus + Inferentia ring + sparse);
// instance_type chip-family discrimination (trn* → trainium_chip; inf* → inferentia_chip);
// edge relationship = 'neuron_link_peer' (R53 enum addition); undirected-deduped canonical
// ordering; NeuronTopologySource interface conformance; snapshotHash delegation; id/version
// fallback chain; sparse-partial detection; throw on 5 malformed-input shapes; A16
// verdict.ts literal preservation; anti-scope SHA-pinned diff.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import {
  parseNeuronLsJson,
  NeuronTopologySource,
} from '@johnpatrickwarren-oss/deploysignal-engine/topology/neuron-source';
import { computeSnapshotHash } from '@johnpatrickwarren-oss/deploysignal-engine/topology-overlay';
import type { TopologyNode, TopologyEdge } from '@johnpatrickwarren-oss/deploysignal-engine/types/verdict';

const TRAINIUM   = readFileSync('test/_substrate/neuron-fixture-trainium-2d-torus.json', 'utf8');
const INFERENTIA = readFileSync('test/_substrate/neuron-fixture-inferentia-ring.json',   'utf8');
const SPARSE     = readFileSync('test/_substrate/neuron-fixture-sparse.json',            'utf8');

// AC-R53-1: Trainium fixture parses to 16 trainium_chip nodes + 32 neuron_link_peer edges
test('AC-R53-1: parseNeuronLsJson on Trainium 4x4 2D Torus → 16 nodes + 32 edges + chip_family=trainium', () => {
  const { snapshot, partial, chip_family } = parseNeuronLsJson(TRAINIUM, { fetched_at_ts: 1_700_000_000 });
  assert.strictEqual(snapshot.nodes.length, 16);
  assert.strictEqual(snapshot.edges.length, 32);
  assert.strictEqual(partial, false);
  assert.strictEqual(chip_family, 'trainium');
});

// AC-R53-2: every Trainium fixture node has kind === 'trainium_chip'
test("AC-R53-2: every node from Trainium fixture has kind === 'trainium_chip'", () => {
  const { snapshot } = parseNeuronLsJson(TRAINIUM);
  for (const n of snapshot.nodes) {
    const k: TopologyNode['kind'] = n.kind;
    assert.strictEqual(k, 'trainium_chip');
  }
});

// AC-R53-3: every Trainium fixture edge has relationship === 'neuron_link_peer'
test("AC-R53-3: every edge from Trainium fixture has relationship === 'neuron_link_peer'", () => {
  const { snapshot } = parseNeuronLsJson(TRAINIUM);
  for (const e of snapshot.edges) {
    const r: TopologyEdge['relationship'] = e.relationship;
    assert.strictEqual(r, 'neuron_link_peer');
  }
});

// AC-R53-4: Trainium edges are canonical undirected-deduped (from < to lex); unique pairs
test('AC-R53-4: Trainium edges are canonical undirected-deduped (from < to); 32 unique pairs', () => {
  const { snapshot } = parseNeuronLsJson(TRAINIUM);
  // (a) canonical ordering: from < to lex for every edge
  for (const e of snapshot.edges) {
    assert.ok(e.from < e.to, `edge ${e.from}->${e.to} should have from < to`);
  }
  // (b) no duplicate pair
  const keys = snapshot.edges.map((e) => `${e.from}|${e.to}`);
  assert.strictEqual(new Set(keys).size, keys.length, 'edge pairs are unique');
  assert.strictEqual(keys.length, 32, 'exactly 32 deduped edges');
});

// AC-R53-5: Inferentia fixture parses to 6 inferentia_chip nodes + 6 neuron_link_peer edges
test('AC-R53-5: parseNeuronLsJson on Inferentia 6-chip ring → 6 nodes + 6 edges + chip_family=inferentia', () => {
  const { snapshot, partial, chip_family } = parseNeuronLsJson(INFERENTIA, { fetched_at_ts: 1_700_000_000 });
  assert.strictEqual(snapshot.nodes.length, 6);
  assert.strictEqual(snapshot.edges.length, 6);
  assert.strictEqual(partial, false);
  assert.strictEqual(chip_family, 'inferentia');
});

// AC-R53-6: every Inferentia fixture node has kind === 'inferentia_chip' AND every edge has 'neuron_link_peer'
test("AC-R53-6: every node from Inferentia fixture has kind === 'inferentia_chip' and edges have 'neuron_link_peer'", () => {
  const { snapshot } = parseNeuronLsJson(INFERENTIA);
  for (const n of snapshot.nodes) {
    const k: TopologyNode['kind'] = n.kind;
    assert.strictEqual(k, 'inferentia_chip');
  }
  for (const e of snapshot.edges) {
    const r: TopologyEdge['relationship'] = e.relationship;
    assert.strictEqual(r, 'neuron_link_peer');
  }
});

// AC-R53-7: NeuronTopologySource implements TopologySource interface
// AND id/version fallback chain branches are observable
test('AC-R53-7: NeuronTopologySource implements TopologySource + id/version fallback', async () => {
  // (a) default construction — exercises branch 2 of `??`-chain
  //     (opts.id undefined → snapshot.source_id default literal 'neuron_topology_source')
  const src = new NeuronTopologySource(TRAINIUM, { fetched_at_ts: 1_700_000_000 });
  assert.strictEqual(src.id, 'neuron_topology_source');
  assert.strictEqual(src.version, 'neuron-1');
  const snap = await src.fetchSnapshot();
  assert.ok(Array.isArray(snap.nodes));
  assert.ok(Array.isArray(snap.edges));
  const h = src.snapshotHash(snap);
  assert.ok(typeof h === 'string' && h.length > 0);

  // (b) explicit opts.id + opts.version — exercises branch 1 of `??`-chain
  const srcExplicit = new NeuronTopologySource(TRAINIUM, {
    id: 'explicit-test-id',
    version: 'explicit-test-ver',
    fetched_at_ts: 1_700_000_000,
  });
  assert.strictEqual(srcExplicit.id, 'explicit-test-id');
  assert.strictEqual(srcExplicit.version, 'explicit-test-ver');
});

// AC-R53-8: snapshotHash delegates to computeSnapshotHash
test('AC-R53-8: snapshotHash delegates to computeSnapshotHash', async () => {
  const src = new NeuronTopologySource(TRAINIUM, { fetched_at_ts: 1_700_000_000 });
  const snap = await src.fetchSnapshot();
  assert.strictEqual(src.snapshotHash(snap), computeSnapshotHash(snap));
});

// AC-R53-9: sparse fixture (no peer info) → nodes only, 0 edges, partial=true
test('AC-R53-9: sparse fixture (empty connected_to) → nodes only, 0 edges, partial=true', () => {
  const { snapshot, partial, chip_family } = parseNeuronLsJson(SPARSE);
  assert.strictEqual(snapshot.nodes.length, 4);
  assert.strictEqual(snapshot.edges.length, 0);
  assert.strictEqual(partial, true);
  assert.strictEqual(chip_family, 'trainium');
});

// AC-R53-10: malformed input throws one of the documented error names (5 sub-cases)
test('AC-R53-10: malformed input throws NEURON_PARSE_* (5 sub-cases)', () => {
  // (a) invalid JSON
  assert.throws(() => parseNeuronLsJson('not-json'), /NEURON_PARSE_INVALID_JSON/);
  // (b) missing instance_type
  assert.throws(() => parseNeuronLsJson(JSON.stringify({ neuron_devices: [] })), /NEURON_PARSE_MISSING_INSTANCE_TYPE/);
  // (c) unknown instance_type prefix
  assert.throws(
    () => parseNeuronLsJson(JSON.stringify({ instance_type: 'p4d.24xlarge', neuron_devices: [{ neuron_device: 0 }] })),
    /NEURON_PARSE_UNKNOWN_INSTANCE_TYPE: p4d\.24xlarge/,
  );
  // (d) missing neuron_devices
  assert.throws(
    () => parseNeuronLsJson(JSON.stringify({ instance_type: 'trn1.32xlarge' })),
    /NEURON_PARSE_MISSING_NEURON_DEVICES/,
  );
  // (e) empty neuron_devices
  assert.throws(
    () => parseNeuronLsJson(JSON.stringify({ instance_type: 'trn1.32xlarge', neuron_devices: [] })),
    /NEURON_PARSE_NO_DEVICES/,
  );
});

// AC-R53-11: chip-family discriminator maps instance_type prefix correctly
test('AC-R53-11: chip-family discriminator maps trn* → trainium_chip and inf* → inferentia_chip', () => {
  const { chip_family: cf_trn, snapshot: snap_trn } = parseNeuronLsJson(TRAINIUM);
  assert.strictEqual(cf_trn, 'trainium');
  assert.strictEqual(snap_trn.nodes[0].kind, 'trainium_chip');

  const { chip_family: cf_inf, snapshot: snap_inf } = parseNeuronLsJson(INFERENTIA);
  assert.strictEqual(cf_inf, 'inferentia');
  assert.strictEqual(snap_inf.nodes[0].kind, 'inferentia_chip');
});

// AC-R53-12: A16 — engine/types/verdict.ts retains the 'correlational_not_causal: true' literal
test("AC-R53-12: A16 — verdict.ts retains 'correlational_not_causal: true' literal", () => {
  const text = readFileSync('engine/types/verdict.ts', 'utf8');
  assert.ok(
    text.includes('correlational_not_causal: true'),
    "verdict.ts must contain literal 'correlational_not_causal: true' per Addition #26 D4",
  );
});

// AC-R53-15: anti-scope file-set diff against round-start baseline 3744012
// (Appended by Implementer at chore-B with chore-A SHA substituted.)
test('AC-R53-15: round-start-to-chore-A diff ⊆ R53 allowed-set (chore-A SHA pinned)', () => {
  const BASELINE_SHA = '3744012';
  const CHORE_A_SHA = '2ba7bb4';
  const ALLOWED_SET = new Set<string>([
    'engine/topology/neuron-source.ts',
    'engine/types/verdict.ts',
    'test/q53-neuron-adapter.test.ts',
    'test/_substrate/neuron-fixture-trainium-2d-torus.json',
    'test/_substrate/neuron-fixture-inferentia-ring.json',
    'test/_substrate/neuron-fixture-sparse.json',
    'coordination/VENDORING-MANIFEST.md',
    'coordination/specs/Q-R53-SPEC.md',
    'coordination/specs/Q-R53-SPEC-AUDIT.md',
    'coordination/specs/Q-R53-EMPIRICAL.sh',
    'coordination/NEXT-ROLE.md',
    'coordination/MEMORIAL.md',
    // Conditional 13th entry per spec § 3: added IFF a HALT fires mid-round.
  ]);
  const diffOutput = execFileSync('git', ['diff', `${BASELINE_SHA}..${CHORE_A_SHA}`, '--name-only'], { encoding: 'utf8' });
  const paths = diffOutput.split('\n').filter((p) => p.length > 0);
  for (const p of paths) {
    assert.ok(ALLOWED_SET.has(p), `unexpected R53 path in chore-A diff: ${p}`);
  }
});
