// test/q30-nvlink-adapter.test.ts — Phase 2 SLICE 3.B WU-03 bindings (R30).
//
// Binds AC-R30-1 through AC-R30-15 (runtime) per Q-R30-SPEC.md § 5.
// AC-R30-16 (typecheck) and AC-R30-17 (test count) are binding-command
// attestations reported by the Implementer at GREEN; not runtime-bound.
// AC-R30-18 (anti-scope diff) is a runtime test added at chore-B with the
// chore-A SHA substituted into the diff baseline literal.
//
// Covers: nvidia-smi nvlink --status parser (4-GPU mesh + sparse); node kind
// = 'gpu_shard' (R18 enum); edge relationship = 'nvlink_peer' (R23 enum);
// undirected-deduped canonical ordering; NvlinkTopologySource interface
// conformance; snapshotHash delegation; id/version fallback chain; sparse-
// partial detection; throw on no-GPU-blocks input; ingestNvlinkErrorCounter
// R-E7 mitigation suite (wrap/missed-scrape/reset/variable-interval) using
// synthetic counter generator (R25 frozen); R25 MINOR-2 opportunistic close
// (direct transformPair call with omitted counter_width); A16 verdict.ts
// literal preservation; anti-scope SHA-pinned diff.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import {
  parseNvlinkStatus,
  NvlinkTopologySource,
  ingestNvlinkErrorCounter,
} from '../engine/topology/nvlink-source';
import { computeSnapshotHash } from '../engine/topology-overlay';
import {
  transformPair,
  UINT32_MOD,
  type CounterMetadata,
} from '../engine/l0/counter-rate-transform';
import {
  makeWrap32Pair,
  makeMissedScrapePair,
  makeResetPair,
  makeVariableIntervalSequence,
} from './_substrate/synthetic-counter-generator';
import { TrendBuffer } from '../engine/core';
import type { TopologyNode, TopologyEdge } from '../engine/types/verdict';

const WELL_FORMED = readFileSync('test/_substrate/nvlink-fixture-well-formed.txt', 'utf8');
const SPARSE      = readFileSync('test/_substrate/nvlink-fixture-sparse.txt',      'utf8');

// AC-R30-1: well-formed fixture parses to 4 gpu_shard nodes + 6 nvlink_peer edges
test('AC-R30-1: parseNvlinkStatus on well-formed fixture produces 4 nodes + 6 edges', () => {
  const { snapshot, partial } = parseNvlinkStatus(WELL_FORMED, { fetched_at_ts: 1_700_000_000 });
  assert.strictEqual(snapshot.nodes.length, 4);
  assert.strictEqual(snapshot.edges.length, 6);
  assert.strictEqual(partial, false);
});

// AC-R30-2: every parsed node has kind === 'gpu_shard' (R18 enum binding)
test("AC-R30-2: every node from parser has kind === 'gpu_shard'", () => {
  const { snapshot } = parseNvlinkStatus(WELL_FORMED);
  for (const n of snapshot.nodes) {
    const k: TopologyNode['kind'] = n.kind;
    assert.strictEqual(k, 'gpu_shard');
  }
});

// AC-R30-3: every parsed edge has relationship === 'nvlink_peer' (R23 enum binding)
test("AC-R30-3: every edge from parser has relationship === 'nvlink_peer'", () => {
  const { snapshot } = parseNvlinkStatus(WELL_FORMED);
  for (const e of snapshot.edges) {
    const r: TopologyEdge['relationship'] = e.relationship;
    assert.strictEqual(r, 'nvlink_peer');
  }
});

// AC-R30-4: edges are undirected-deduped with from < to lex order; multi-link aggregation
test('AC-R30-4: edges are canonical undirected-deduped (from < to); multi-link aggregation', () => {
  const { snapshot } = parseNvlinkStatus(WELL_FORMED);
  // (a) canonical ordering: from < to lex for every edge
  for (const e of snapshot.edges) {
    assert.ok(e.from < e.to, `edge ${e.from}->${e.to} should have from < to`);
  }
  // (b) no duplicate pair
  const keys = snapshot.edges.map((e) => `${e.from}|${e.to}`);
  assert.strictEqual(new Set(keys).size, keys.length, 'edge pairs are unique');
  // (c) expected pair set: {0,1},{0,2},{0,3},{1,2},{1,3},{2,3}
  const expected = new Set(['gpu-0|gpu-1', 'gpu-0|gpu-2', 'gpu-0|gpu-3', 'gpu-1|gpu-2', 'gpu-1|gpu-3', 'gpu-2|gpu-3']);
  assert.deepStrictEqual(new Set(keys), expected);
});

// AC-R30-5: NvlinkTopologySource implements TopologySource interface
test('AC-R30-5: NvlinkTopologySource implements TopologySource', async () => {
  const src = new NvlinkTopologySource(WELL_FORMED, { fetched_at_ts: 1_700_000_000 });
  assert.strictEqual(typeof src.id, 'string');
  assert.strictEqual(typeof src.version, 'string');
  const snap = await src.fetchSnapshot();
  assert.ok(Array.isArray(snap.nodes));
  assert.ok(Array.isArray(snap.edges));
  const h = src.snapshotHash(snap);
  assert.ok(typeof h === 'string' && h.length > 0);
});

// AC-R30-6: snapshotHash delegates to computeSnapshotHash (matches free-function output)
test('AC-R30-6: snapshotHash delegates to computeSnapshotHash', async () => {
  const src = new NvlinkTopologySource(WELL_FORMED, { fetched_at_ts: 1_700_000_000 });
  const snap = await src.fetchSnapshot();
  assert.strictEqual(src.snapshotHash(snap), computeSnapshotHash(snap));
});

// AC-R30-7: sparse fixture produces nodes only, 0 edges, partial=true
test('AC-R30-7: sparse fixture (no peer info) → nodes only, 0 edges, partial=true', () => {
  const { snapshot, partial } = parseNvlinkStatus(SPARSE);
  assert.strictEqual(snapshot.nodes.length, 2);
  assert.strictEqual(snapshot.edges.length, 0);
  assert.strictEqual(partial, true);
});

// AC-R30-8: empty / malformed input (no GPU blocks) throws NVLINK_PARSE_NO_GPU_BLOCKS
test('AC-R30-8: empty / no-GPU-blocks input throws NVLINK_PARSE_NO_GPU_BLOCKS', () => {
  assert.throws(() => parseNvlinkStatus(''),    /NVLINK_PARSE_NO_GPU_BLOCKS/);
  assert.throws(() => parseNvlinkStatus('garbage with no GPU header\nanother line\n'), /NVLINK_PARSE_NO_GPU_BLOCKS/);
});

// AC-R30-9: id/version fallback chains — each sub-case binds one branch
test('AC-R30-9: NvlinkTopologySource id/version fallback chain', () => {
  // (a) opts.id and opts.version take priority over source_id / source_version
  const a = new NvlinkTopologySource(WELL_FORMED, { id: 'explicit-id', version: 'explicit-ver', source_id: 'src-id', source_version: 'src-ver' });
  assert.strictEqual(a.id, 'explicit-id');
  assert.strictEqual(a.version, 'explicit-ver');
  // (b) opts.id / opts.version undefined → falls back to source_id / source_version
  const b = new NvlinkTopologySource(WELL_FORMED, { source_id: 'src-id-b', source_version: 'src-ver-b' });
  assert.strictEqual(b.id, 'src-id-b');
  assert.strictEqual(b.version, 'src-ver-b');
  // (c) opts.id / opts.version undefined AND source_id / source_version undefined → defaults
  const c = new NvlinkTopologySource(WELL_FORMED, {});
  assert.strictEqual(c.id, 'nvlink_topology_source');
  assert.strictEqual(c.version, 'nvlink-1');
});

// AC-R30-10: ingestNvlinkErrorCounter on makeWrap32Pair → wraparound_handled=true + corrected rate
test('AC-R30-10: ingestNvlinkErrorCounter on makeWrap32Pair fires the wraparound path', () => {
  const { prev, next } = makeWrap32Pair({ expected_interval_seconds: 1.0 });
  const out = ingestNvlinkErrorCounter(prev, next, { expected_scrape_interval_seconds: 1.0 });
  assert.strictEqual(out.wraparound_handled, true);
  assert.strictEqual(out.reset_detected, false);
  const expected_rate = (UINT32_MOD - 4_200_000_000 + 50) / 1.0;
  assert.strictEqual(out.value, expected_rate);
});

// AC-R30-11: ingestNvlinkErrorCounter on makeMissedScrapePair → degraded + missed_scrape_inferred
test('AC-R30-11: ingestNvlinkErrorCounter on makeMissedScrapePair flags degraded + missed_scrape_inferred', () => {
  const { prev, next } = makeMissedScrapePair({ expected_interval_seconds: 1.0 });
  const out = ingestNvlinkErrorCounter(prev, next, { expected_scrape_interval_seconds: 1.0 });
  assert.strictEqual(out.slope_quality, 'degraded');
  assert.strictEqual(out.missed_scrape_inferred, true);
  assert.strictEqual(out.actual_elapsed_seconds, 2.0);
});

// AC-R30-12: ingestNvlinkErrorCounter on makeResetPair → reset_detected=true + value=null
test('AC-R30-12: ingestNvlinkErrorCounter on makeResetPair (counter_width=32 baked) → reset_detected', () => {
  const { prev, next } = makeResetPair({ expected_interval_seconds: 1.0 });
  const out = ingestNvlinkErrorCounter(prev, next, { expected_scrape_interval_seconds: 1.0 });
  assert.strictEqual(out.reset_detected, true);
  assert.strictEqual(out.wraparound_handled, false);
  assert.strictEqual(out.value, null);
});

// AC-R30-13: ingestNvlinkErrorCounter on makeVariableIntervalSequence integrates with TrendBuffer
test('AC-R30-13: variable-interval ingestion produces comparable per-second rates via TrendBuffer', () => {
  const samples = makeVariableIntervalSequence({
    intervals_seconds: [1.0, 1.2, 1.5, 1.0, 1.2, 1.5, 1.0, 1.2, 1.5, 1.0],
    rate_per_second: 10,
  });
  const tb = new TrendBuffer(20);
  for (let i = 1; i < samples.length; i++) {
    const out = ingestNvlinkErrorCounter(samples[i - 1], samples[i], { expected_scrape_interval_seconds: 1.0 });
    assert.strictEqual(out.slope_quality, 'normal', `pair ${i}: not degraded`);
    assert.notStrictEqual(out.value, null);
    tb.push('nvlink_test_signal', out.value!);
  }
  const snap = tb.get('nvlink_test_signal');
  // Tolerances per § 1.8 R25 disposition (Option A): 0.001 / 0.01. NOT 1e-9 (empirically infeasible per R25 MAJOR-3).
  assert.ok(Math.abs(snap.mean - 10) < 0.001, `mean=${snap.mean} expected ≈10 (tol 0.001)`);
  assert.ok(Math.abs(snap.slopeNorm) < 0.01,  `slopeNorm=${snap.slopeNorm} expected near zero (tol 0.01)`);
});

// AC-R30-14: R25 MINOR-2 opportunistic close — transformPair with counter_width omitted
// Calls transformPair directly (NOT through ingestNvlinkErrorCounter which bakes counter_width=32)
// to exercise the `width = meta.counter_width ?? 64` default fallback at counter-rate-transform.ts:119.
// With prev > next AND prev below wrap threshold, the reset arm fires regardless of width — this
// AC is a coverage-AC for the omitted-counter_width input shape (the `?? 64` default produces
// width=64; mutation-removing the `?? 64` produces width=undefined; behavioral outcome on the
// reset arm is identical because the wrap branch requires `width === 32`). The AC closes the
// R25 MINOR-2 coverage gap (input shape exercised) but does not mutation-kill the `?? 64`
// expression — see § 7 OQ for the structural-limitation discussion.
test('AC-R30-14: transformPair with counter_width omitted routes makeResetPair to reset arm via default-64', () => {
  const { prev, next } = makeResetPair({ expected_interval_seconds: 1.0 });
  const metaNoWidth: CounterMetadata = { semantic_type: 'counter' }; // counter_width OMITTED
  const out = transformPair(prev, next, metaNoWidth, { expected_scrape_interval_seconds: 1.0 });
  assert.strictEqual(out.reset_detected, true);
  assert.strictEqual(out.wraparound_handled, false);
  assert.strictEqual(out.value, null);
});

// AC-R30-15: A16 — engine/types/verdict.ts retains `correlational_not_causal: true` literal
test('AC-R30-15: A16 preservation — verdict.ts retains correlational_not_causal: true literal', () => {
  const verdict = readFileSync('engine/types/verdict.ts', 'utf8');
  assert.ok(verdict.includes('correlational_not_causal: true'),
    'verdict.ts retains correlational_not_causal: true literal per Addition #26 D4');
});

// AC-R30-18: anti-scope diff at chore-A SHA ⊆ allowed-set
// Chore-A SHA literal committed by Implementer at chore-B. If a HALT fires mid-round and
// produces coordination/diagnostics/DIAGNOSTIC-R30-<topic>.md, the Implementer adds the specific
// DIAGNOSTIC path as a 9th allowed-set entry per spec § 3 conditional clause.
test('AC-R30-18: round-start-to-chore-A diff path-set ⊆ R30 allowed-set', () => {
  const BASELINE_SHA = '5bb427c';     // R30 routing commit (round-start)
  const CHORE_A_SHA  = '82d1e5a355cf9a30ab58f515078bc89e655ab05d';
  const ALLOWED_SET = new Set<string>([
    'engine/topology/nvlink-source.ts',
    'test/q30-nvlink-adapter.test.ts',
    'test/_substrate/nvlink-fixture-well-formed.txt',
    'test/_substrate/nvlink-fixture-sparse.txt',
    'coordination/specs/Q-R30-SPEC.md',
    'coordination/specs/Q-R30-SPEC-AUDIT.md',
    'coordination/NEXT-ROLE.md',
    'coordination/MEMORIAL.md',
    // Conditional 9th entry per spec § 3: added IFF a HALT fires mid-round.
  ]);
  const diffOutput = execSync(`git diff ${BASELINE_SHA}..${CHORE_A_SHA} --name-only`, { encoding: 'utf8' });
  const paths = diffOutput.split('\n').filter((p) => p.length > 0);
  for (const p of paths) {
    assert.ok(ALLOWED_SET.has(p), `unexpected R30 path in chore-A diff: ${p}`);
  }
});
