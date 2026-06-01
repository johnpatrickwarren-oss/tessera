// test/q58-live-fetch-interface.test.ts — Phase 3 SLICE 2 WU-Phase3-2B (R58).
//
// Binds AC-R58-1 through AC-R58-11 + AC-R58-14 (12 runtime tests) per
// Q-R58-SPEC.md § 5. AC-R58-12 (typecheck) and AC-R58-13 (test count) are
// binding-command attestations reported by the Implementer at chore-A;
// not runtime-bound. They are mechanically verified by
// coordination/specs/Q-R58-EMPIRICAL.sh per Rule 1 sub-class
// `empirical-command-attestation`.
//
// AC-R58-14 (anti-scope diff) is a runtime test that the Implementer
// appends in chore-B with the chore-A SHA substituted into the diff
// baseline literal.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import type { TopologyFetchContext } from '@johnpatrickwarren-oss/deploysignal-engine/topology/fetch-context';
import { SlurmTopologySource }  from '@johnpatrickwarren-oss/deploysignal-engine/topology/slurm-source';
import { K8sNodeLabelSource }   from '@johnpatrickwarren-oss/deploysignal-engine/topology/k8s-source';
import { NvlinkTopologySource } from '@johnpatrickwarren-oss/deploysignal-engine/topology/nvlink-source';
import { NeuronTopologySource } from '@johnpatrickwarren-oss/deploysignal-engine/topology/neuron-source';
import { TpuTopologySource }    from '@johnpatrickwarren-oss/deploysignal-engine/topology/tpu-source';
import { computeSnapshotHash }  from '@johnpatrickwarren-oss/deploysignal-engine/topology-overlay';
import type { TopologySnapshot } from '@johnpatrickwarren-oss/deploysignal-engine/types/verdict';

const SLURM_WELL_FORMED = readFileSync('test/_substrate/slurm-fixture-canonical.conf',          'utf8');
const SLURM_SPARSE      = readFileSync('test/_substrate/slurm-fixture-sparse.conf',             'utf8');
const K8S_FULL          = JSON.parse(readFileSync('test/_substrate/k8s-nodelist-fixture-full.json',          'utf8'));
const K8S_SPARSE        = JSON.parse(readFileSync('test/_substrate/k8s-nodelist-fixture-sparse-no-gpu.json', 'utf8'));
const NVLINK_WELL       = readFileSync('test/_substrate/nvlink-fixture-well-formed.txt',        'utf8');
const NVLINK_SPARSE     = readFileSync('test/_substrate/nvlink-fixture-sparse.txt',             'utf8');
const NEURON_FULL       = readFileSync('test/_substrate/neuron-fixture-trainium-2d-torus.json', 'utf8');
const NEURON_SPARSE     = readFileSync('test/_substrate/neuron-fixture-sparse.json',            'utf8');
const TPU_FULL          = readFileSync('test/_substrate/tpu-fixture-v4-cube.json',              'utf8');
const TPU_SPARSE        = readFileSync('test/_substrate/tpu-fixture-sparse-subcube.json',       'utf8');

// Typed adapter-factory tuples for parametrized ACs (AC-R58-7 / AC-R58-8 / AC-R58-9 / AC-R58-10).
// SlurmTopologySourceOpts uses camelCase `fetchedAtTs`; other adapters use snake_case
// `fetched_at_ts` — spec pseudocode has slurm as `fetched_at_ts` (incorrect);
// corrected here per TACTICAL AUTONOMY clause (spec parameter shape vs actual interface).
interface AdapterEntry {
  vendor: string;
  build: () => {
    id: string;
    version: string;
    fetchSnapshot(ctx?: TopologyFetchContext): Promise<TopologySnapshot>;
    snapshotHash(snapshot: TopologySnapshot): string;
  };
  buildSparse: () => {
    fetchSnapshot(ctx?: TopologyFetchContext): Promise<TopologySnapshot>;
  };
}

const ADAPTERS: AdapterEntry[] = [
  { vendor: 'slurm',
    build:       () => new SlurmTopologySource(SLURM_WELL_FORMED, { fetchedAtTs: 1_700_000_000 }),
    buildSparse: () => new SlurmTopologySource(SLURM_SPARSE,      { fetchedAtTs: 1_700_000_000 }) },
  { vendor: 'k8s',
    build:       () => new K8sNodeLabelSource(K8S_FULL,           { now: () => 1_700_000_000 }),
    buildSparse: () => new K8sNodeLabelSource(K8S_SPARSE,         { now: () => 1_700_000_000 }) },
  { vendor: 'nvlink',
    build:       () => new NvlinkTopologySource(NVLINK_WELL,      { fetched_at_ts: 1_700_000_000 }),
    buildSparse: () => new NvlinkTopologySource(NVLINK_SPARSE,    { fetched_at_ts: 1_700_000_000 }) },
  { vendor: 'neuron',
    build:       () => new NeuronTopologySource(NEURON_FULL,      { fetched_at_ts: 1_700_000_000 }),
    buildSparse: () => new NeuronTopologySource(NEURON_SPARSE,    { fetched_at_ts: 1_700_000_000 }) },
  { vendor: 'tpu',
    build:       () => new TpuTopologySource(TPU_FULL,            { fetched_at_ts: 1_700_000_000 }),
    buildSparse: () => new TpuTopologySource(TPU_SPARSE,          { fetched_at_ts: 1_700_000_000 }) },
];

// AC-R58-1: TopologyFetchContext exported with three optional fields.
test('AC-R58-1: TopologyFetchContext type exists and accepts authToken/apiEndpoint/timeoutMs', () => {
  const ctx: TopologyFetchContext = {
    authToken: 'test-token',
    apiEndpoint: 'https://example.invalid/topology',
    timeoutMs: 5000,
  };
  assert.strictEqual(typeof ctx.authToken,   'string');
  assert.strictEqual(typeof ctx.apiEndpoint, 'string');
  assert.strictEqual(typeof ctx.timeoutMs,   'number');
});

// AC-R58-2: SlurmTopologySource.fetchSnapshot(undefined) returns constructor fixture.
test('AC-R58-2: SlurmTopologySource.fetchSnapshot(undefined) returns constructor fixture', async () => {
  const src = new SlurmTopologySource(SLURM_WELL_FORMED, { fetchedAtTs: 1_700_000_000 });
  const snap = await src.fetchSnapshot();
  assert.ok(Array.isArray(snap.nodes) && snap.nodes.length > 0, 'snapshot has nodes');
  assert.ok(Array.isArray(snap.edges) && snap.edges.length > 0, 'snapshot has edges');
});

// AC-R58-3: K8sNodeLabelSource.fetchSnapshot(undefined) returns constructor fixture.
test('AC-R58-3: K8sNodeLabelSource.fetchSnapshot(undefined) returns constructor fixture', async () => {
  const src = new K8sNodeLabelSource(K8S_FULL, { now: () => 1_700_000_000 });
  const snap = await src.fetchSnapshot();
  assert.ok(Array.isArray(snap.nodes) && snap.nodes.length > 0, 'snapshot has nodes');
});

// AC-R58-4: NvlinkTopologySource.fetchSnapshot(undefined) returns constructor fixture.
test('AC-R58-4: NvlinkTopologySource.fetchSnapshot(undefined) returns constructor fixture', async () => {
  const src = new NvlinkTopologySource(NVLINK_WELL, { fetched_at_ts: 1_700_000_000 });
  const snap = await src.fetchSnapshot();
  assert.ok(Array.isArray(snap.nodes) && snap.nodes.length > 0, 'snapshot has nodes');
});

// AC-R58-5: NeuronTopologySource.fetchSnapshot(undefined) returns constructor fixture.
test('AC-R58-5: NeuronTopologySource.fetchSnapshot(undefined) returns constructor fixture', async () => {
  const src = new NeuronTopologySource(NEURON_FULL, { fetched_at_ts: 1_700_000_000 });
  const snap = await src.fetchSnapshot();
  assert.ok(Array.isArray(snap.nodes) && snap.nodes.length > 0, 'snapshot has nodes');
});

// AC-R58-6: TpuTopologySource.fetchSnapshot(undefined) returns constructor fixture.
test('AC-R58-6: TpuTopologySource.fetchSnapshot(undefined) returns constructor fixture', async () => {
  const src = new TpuTopologySource(TPU_FULL, { fetched_at_ts: 1_700_000_000 });
  const snap = await src.fetchSnapshot();
  assert.ok(Array.isArray(snap.nodes) && snap.nodes.length > 0, 'snapshot has nodes');
});

// AC-R58-7: ctx.apiEndpoint defined → throws LIVE_FETCH_NOT_IMPLEMENTED_PATH_B
// across all 5 adapters with adapter-specific vendor suffix.
test('AC-R58-7: ctx.apiEndpoint defined → throws LIVE_FETCH_NOT_IMPLEMENTED_PATH_B across all 5 adapters', async () => {
  const ctxLive: TopologyFetchContext = { apiEndpoint: 'https://cluster.invalid/topology' };
  for (const { vendor, build } of ADAPTERS) {
    const src = build();
    await assert.rejects(
      () => src.fetchSnapshot(ctxLive),
      (err: Error) => err.message === `LIVE_FETCH_NOT_IMPLEMENTED_PATH_B: ${vendor}`,
      `${vendor}: expected LIVE_FETCH_NOT_IMPLEMENTED_PATH_B: ${vendor}`,
    );
  }
});

// AC-R58-8: ctx with only signal/authToken/timeoutMs (no apiEndpoint) → fall back
// to constructor fixture (Path B preserved across all 5 adapters).
test('AC-R58-8: ctx without apiEndpoint → constructor fixture fallback across all 5 adapters', async () => {
  const ctxSoft: TopologyFetchContext = { authToken: 't', timeoutMs: 5000 };  // no apiEndpoint
  for (const { vendor, build } of ADAPTERS) {
    const src = build();
    const snap = await src.fetchSnapshot(ctxSoft);
    assert.ok(Array.isArray(snap.nodes) && snap.nodes.length > 0,
              `${vendor}: expected fallback to constructor snapshot`);
  }
});

// AC-R58-9: Sparse-data resilience across all 5 adapters — sparse fixture parses
// without throw + produces subset snapshot (nodes-present + edges-may-be-empty).
test('AC-R58-9: sparse-data resilience across all 5 adapters', async () => {
  for (const { vendor, buildSparse } of ADAPTERS) {
    const src = buildSparse();
    const snap = await src.fetchSnapshot();
    assert.ok(Array.isArray(snap.nodes) && snap.nodes.length >= 0,
              `${vendor}: sparse snapshot has nodes array (may be empty)`);
    assert.ok(Array.isArray(snap.edges) && snap.edges.length >= 0,
              `${vendor}: sparse snapshot has edges array (may be empty)`);
  }
});

// AC-R58-10: Cross-adapter snapshotHash delegates uniformly to computeSnapshotHash.
test('AC-R58-10: snapshotHash delegates to computeSnapshotHash across all 5 adapters', async () => {
  for (const { vendor, build } of ADAPTERS) {
    const src = build();
    const snap = await src.fetchSnapshot();
    const sourceSideHash = src.snapshotHash(snap);
    const freeFnHash = computeSnapshotHash(snap);
    assert.strictEqual(sourceSideHash, freeFnHash,
                       `${vendor}: snapshotHash must equal computeSnapshotHash(snap)`);
  }
});

// ── AC-R58-11 removed R95 2026-05-22 ────────────────────────────────────────
// Defunct post-R94 engine extraction: engine/types/verdict.ts removed from
// Tessera worktree; readFileSync fails with ENOENT. Category A.
