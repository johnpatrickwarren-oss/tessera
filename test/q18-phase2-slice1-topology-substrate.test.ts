// test/q18-phase2-slice1-topology-substrate.test.ts — Phase 2 SLICE 1 bindings (R18).
//
// Binds AC-R18-1 through AC-R18-10 (runtime) per Q-R18-SPEC.md § 5.
// AC-R18-11 (typecheck) and AC-R18-12 (test count) are binding-command
// attestations reported by the Implementer at GREEN; not runtime-bound.
//
// Covers: TopologyNode.kind extension (gpu_shard + rack); TopologyEdge.relationship
// extension (contains); VerdictGroup.cluster_event_id optional field; v9X
// synthetic-cluster fixture (default + nShards=20); computeSnapshotHash
// determinism on v9X; inherited Addition #25 D5 + #26 D4 preservation;
// vendored-at-pin preservation; anti-scope diff verification.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import type {
  TopologyNode,
  TopologyEdge,
  VerdictGroup,
  FusedVerdict,
} from '../engine/types/verdict';
import { computeSnapshotHash } from '../engine/topology-overlay';
import { makeV9XSingleRackCluster } from './_substrate/v9X-cluster';

test('AC-R18-1: TopologyNode.kind union accepts "gpu_shard" and "rack" literals', () => {
  const gpuShardKind: TopologyNode['kind'] = 'gpu_shard';
  const rackKind: TopologyNode['kind'] = 'rack';
  assert.strictEqual(gpuShardKind, 'gpu_shard');
  assert.strictEqual(rackKind, 'rack');
});

test('AC-R18-2: TopologyEdge.relationship union accepts "contains" literal', () => {
  const containsRelationship: TopologyEdge['relationship'] = 'contains';
  assert.strictEqual(containsRelationship, 'contains');
});

test('AC-R18-3: VerdictGroup adds optional cluster_event_id (set + omit both typecheck at compile; behave correctly at runtime)', () => {
  const groupWith: VerdictGroup = {
    group_id: 'group-deploy-x-1700000000',
    deploy_id: 'deploy-x',
    window_start_ts: 1700000000,
    window_end_ts: 1700000300,
    verdicts: [] as FusedVerdict[],
    firing_verdicts: [] as FusedVerdict[],
    root_cause: null,
    confidence: 0,
    late_arrival_verdicts: [] as FusedVerdict[],
    closed: false,
    closed_at_ts: null,
    cluster_event_id: 'cluster-firmware-push-2026-05-17',
  };
  assert.strictEqual(groupWith.cluster_event_id, 'cluster-firmware-push-2026-05-17');

  const groupWithout: VerdictGroup = {
    group_id: 'group-deploy-y-1700000000',
    deploy_id: 'deploy-y',
    window_start_ts: 1700000000,
    window_end_ts: 1700000300,
    verdicts: [] as FusedVerdict[],
    firing_verdicts: [] as FusedVerdict[],
    root_cause: null,
    confidence: 0,
    late_arrival_verdicts: [] as FusedVerdict[],
    closed: false,
    closed_at_ts: null,
  };
  assert.strictEqual(groupWithout.cluster_event_id, undefined);
});

test('AC-R18-4: makeV9XSingleRackCluster() default = 1 rack + 10 gpu_shards + 10 contains edges', () => {
  const snapshot = makeV9XSingleRackCluster();
  assert.strictEqual(snapshot.nodes.length, 11);
  assert.strictEqual(snapshot.edges.length, 10);
  const rackNodes = snapshot.nodes.filter((n) => n.kind === 'rack');
  const shardNodes = snapshot.nodes.filter((n) => n.kind === 'gpu_shard');
  assert.strictEqual(rackNodes.length, 1);
  assert.strictEqual(shardNodes.length, 10);
  assert.strictEqual(rackNodes[0].id, 'rack-0');
  for (let i = 0; i < 10; i++) {
    assert.strictEqual(shardNodes[i].id, `shard-${i}`);
    assert.strictEqual(shardNodes[i].kind, 'gpu_shard');
  }
  for (const e of snapshot.edges) {
    assert.strictEqual(e.relationship, 'contains');
    assert.strictEqual(e.from, 'rack-0');
  }
  assert.strictEqual(snapshot.source_id, 'v9X_synthetic_single_rack');
  assert.strictEqual(snapshot.source_version, 'v9X.1');
});

test('AC-R18-5: makeV9XSingleRackCluster({ nShards: 20 }) = 1 rack + 20 gpu_shards + 20 contains edges', () => {
  const snapshot = makeV9XSingleRackCluster({ nShards: 20 });
  assert.strictEqual(snapshot.nodes.length, 21);
  assert.strictEqual(snapshot.edges.length, 20);
  const shardNodes = snapshot.nodes.filter((n) => n.kind === 'gpu_shard');
  assert.strictEqual(shardNodes.length, 20);
  assert.strictEqual(shardNodes[19].id, 'shard-19');
});

test('AC-R18-6: computeSnapshotHash on v9X fixture is deterministic across two invocations', () => {
  const snapshot = makeV9XSingleRackCluster();
  const h1 = computeSnapshotHash(snapshot);
  const h2 = computeSnapshotHash(snapshot);
  assert.strictEqual(h1, h2);
  assert.match(h1, /^[0-9a-f]{64}$/);
});

test('AC-R18-7: Inherited Addition #25 D5 — group_id format `group-${deployId}-${window_start_ts}` retained at engine/verdict-groups.ts', () => {
  const src = readFileSync('engine/verdict-groups.ts', 'utf-8');
  assert.match(src, /group-\$\{deployId\}-\$\{window_start_ts\}/);
});

test('AC-R18-8: Inherited Addition #26 D4 — TopologyCandidate.correlational_not_causal literal true type retained', () => {
  const src = readFileSync('engine/types/verdict.ts', 'utf-8');
  assert.match(src, /correlational_not_causal:\s*true;/);
});

test('AC-R18-9: All 40 vendored files retain SHA pin 5a72371 in first-line header', () => {
  const manifest = readFileSync('coordination/VENDORING-MANIFEST.md', 'utf-8');
  const paths: string[] = [];
  for (const line of manifest.split('\n')) {
    if (!line.startsWith('|')) continue;
    if (!line.includes('vendored-at-pin') && !line.includes('vendored-with-deltas')) continue;
    const cells = line.split('|').map((c) => c.trim());
    const path = cells[1];
    if (path && path.endsWith('.ts')) {
      paths.push(path);
    }
  }
  assert.strictEqual(paths.length, 40, `expected 40 vendored paths in manifest, got ${paths.length}`);
  for (const p of paths) {
    const firstLine = readFileSync(p, 'utf-8').split('\n')[0];
    assert.match(
      firstLine,
      /VENDORED FROM DeploySignal main@5a72371/,
      `vendored file ${p} first line does not contain SHA pin: ${firstLine}`,
    );
  }
});

test('AC-R18-10: Anti-scope — git diff b640c6c..HEAD --name-only ⊆ allowed-set', () => {
  const allowed = new Set([
    'engine/types/verdict.ts',
    'engine/types/verdict.js',
    'test/_substrate/v9X-cluster.ts',
    'test/_substrate/v9X-cluster.js',
    'test/q18-phase2-slice1-topology-substrate.test.ts',
    'test/q18-phase2-slice1-topology-substrate.test.js',
    'coordination/specs/Q-R18-SPEC.md',
    'coordination/specs/Q-R18-SPEC-AUDIT.md',
    'coordination/NEXT-ROLE.md',
    'coordination/MEMORIAL.md',
    // Operator-side artifacts added during R18 ESCALATE → Option A unblock cycle:
    'coordination/OVERNIGHT-LOG-2026-05-17.md',
    'coordination/diagnostics/DIAGNOSTIC-R18-no-at-pin-deltas-verdict.md',
    // Option A fix (operator dispositioned the ESCALATE bounded question):
    'test/q01-no-at-pin-deltas.test.ts',
    'test/q01-no-at-pin-deltas.test.js',
    'coordination/VENDORING-MANIFEST.md',
  ]);
  const diff = execSync('git diff b640c6c..HEAD --name-only', { encoding: 'utf-8' });
  const touched = diff.split('\n').filter((p) => p.length > 0);
  for (const p of touched) {
    assert.ok(allowed.has(p), `Unexpected file in R18 diff vs b640c6c: ${p}`);
  }
});
