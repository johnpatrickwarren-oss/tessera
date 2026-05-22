// test/q21-fleet-verdict-consumer.test.ts — Phase 2 SLICE 2.B bindings (R21).
//
// Binds AC-R21-1 through AC-R21-8 (runtime, in GREEN commit) + AC-R21-11
// (runtime, added in chore-B per spec § 4.7). AC-R21-9 (typecheck) and
// AC-R21-10 (full suite count) are binding-command attestations reported
// by the Implementer at GREEN.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import { VerdictGrouper } from '@johnpatrickwarren-oss/deploysignal-engine/verdict-groups';
import {
  fleetTickIngest,
  rollupByClusterEvent,
  type FleetTickInput,
  type FleetTickIngestResult,
  type ClusterEventRollup,
} from '@johnpatrickwarren-oss/deploysignal-engine/fleet/verdict-consumer';
import type { FusedVerdict } from '@johnpatrickwarren-oss/deploysignal-engine/types/verdict';

function makeVerdict(deploy_ref: string, tick: number, firing = false): FusedVerdict {
  return {
    verdict: firing ? 'rollback' : 'proceed',
    firing_families: firing ? ['A'] : [],
    per_family_verdicts: { A: null, B: null, C: null, D: null, E: null },
    total_alpha_spent: firing ? 0.5 : 0,
    fusion_topology: 'cascade',
    tick,
    deploy_ref,
  };
}

// AC-R21-1: shape + N-correspondence
test('AC-R21-1: fleetTickIngest returns FleetTickIngestResult with ingest_results.length === N', () => {
  const grouper = new VerdictGrouper();
  const input: FleetTickInput = {
    per_shard_verdicts: [
      makeVerdict('deploy-A', 1),
      makeVerdict('deploy-B', 1),
      makeVerdict('deploy-C', 1),
    ],
    ts_seconds: 1700000000,
    cluster_event_id: 'evt-X',
  };
  const out = fleetTickIngest(input, grouper);
  assert.strictEqual(out.ingest_results.length, 3);
  for (const r of out.ingest_results) {
    assert.ok(r.attributed_group !== null && r.attributed_group !== undefined);
  }
});

// AC-R21-2: cluster_event_id propagation
test('AC-R21-2: cluster_event_id propagated to every per-shard ingest call', () => {
  const grouper = new VerdictGrouper();
  const input: FleetTickInput = {
    per_shard_verdicts: [
      makeVerdict('deploy-A', 1),
      makeVerdict('deploy-B', 1),
      makeVerdict('deploy-C', 1),
    ],
    ts_seconds: 1700000000,
    cluster_event_id: 'evt-X',
  };
  const out = fleetTickIngest(input, grouper);
  for (const r of out.ingest_results) {
    assert.strictEqual(r.attributed_group.cluster_event_id, 'evt-X');
    // Composite group_id format per R20 § 2.2
    assert.ok(r.attributed_group.group_id.startsWith('group-evt-X-'));
  }
});

// AC-R21-3: legacy mode (absent cluster_event_id)
test('AC-R21-3: absent cluster_event_id → legacy mode (undefined cluster_event_id; inherited group_id format)', () => {
  const grouper = new VerdictGrouper();
  const input: FleetTickInput = {
    per_shard_verdicts: [makeVerdict('deploy-A', 1)],
    ts_seconds: 1700000000,
  };
  const out = fleetTickIngest(input, grouper);
  assert.strictEqual(out.ingest_results[0].attributed_group.cluster_event_id, undefined);
  assert.strictEqual(out.ingest_results[0].attributed_group.group_id, 'group-deploy-A-1700000000');
});

// AC-R21-4: empty input
test('AC-R21-4: empty per_shard_verdicts → empty ingest_results, no throw', () => {
  const grouper = new VerdictGrouper();
  const input: FleetTickInput = {
    per_shard_verdicts: [],
    ts_seconds: 1700000000,
    cluster_event_id: 'evt-X',
  };
  const out = fleetTickIngest(input, grouper);
  assert.deepStrictEqual(out.ingest_results, []);
});

// AC-R21-5: terminal flag propagation
test('AC-R21-5: input.terminal=true closes every per-shard attributed_group on the same tick', () => {
  const grouper = new VerdictGrouper();
  const input: FleetTickInput = {
    per_shard_verdicts: [
      makeVerdict('deploy-A', 1, true),
      makeVerdict('deploy-B', 1, true),
    ],
    ts_seconds: 1700000000,
    cluster_event_id: 'evt-X',
    terminal: true,
  };
  const out = fleetTickIngest(input, grouper);
  // Per R20 § 2.1: terminal=true triggers terminal_verdict close on the same call;
  // attributed_group.closed === true post-ingest (non-late-arrival branch).
  for (const r of out.ingest_results) {
    assert.strictEqual(r.attributed_group.closed, true);
    assert.notStrictEqual(r.closed, null);
  }
});

// AC-R21-6: per-shard order preserved
test('AC-R21-6: ingest_results[i] corresponds to per_shard_verdicts[i] (index-order preservation)', () => {
  const grouper = new VerdictGrouper();
  const deploys = ['deploy-A', 'deploy-B', 'deploy-C'];
  const input: FleetTickInput = {
    per_shard_verdicts: deploys.map((d, i) => makeVerdict(d, i + 1)),
    ts_seconds: 1700000000,
    cluster_event_id: 'evt-X',
  };
  const out = fleetTickIngest(input, grouper);
  for (let i = 0; i < deploys.length; i++) {
    assert.strictEqual(out.ingest_results[i].attributed_group.deploy_id, deploys[i]);
  }
});

// AC-R21-7: rollup — distinct VerdictGroups under shared cluster_event_id
test('AC-R21-7: rollupByClusterEvent returns N distinct VerdictGroups for N distinct deploys under one cluster_event_id', () => {
  const grouper = new VerdictGrouper();
  const input: FleetTickInput = {
    per_shard_verdicts: [
      makeVerdict('deploy-A', 1),
      makeVerdict('deploy-B', 1),
      makeVerdict('deploy-C', 1),
    ],
    ts_seconds: 1700000000,
    cluster_event_id: 'evt-X',
  };
  const out = fleetTickIngest(input, grouper);
  const rollup: ClusterEventRollup = rollupByClusterEvent(out.ingest_results, 'evt-X');
  assert.strictEqual(rollup.groups.length, 3);
  assert.strictEqual(rollup.deploy_ids.length, 3);
  assert.deepStrictEqual([...rollup.deploy_ids].sort(), ['deploy-A', 'deploy-B', 'deploy-C']);
  // Distinct group_ids (R20 § 2.3 multi-deploy-per-event keying)
  const group_ids = rollup.groups.map(g => g.group_id);
  assert.strictEqual(new Set(group_ids).size, 3);
});

// AC-R21-8: rollup — empty-string query → no match
test('AC-R21-8: rollupByClusterEvent("") short-circuits to no-match (empty-string ≡ absent per R20 § 2.6)', () => {
  const grouper = new VerdictGrouper();
  const input: FleetTickInput = {
    per_shard_verdicts: [makeVerdict('deploy-A', 1)],
    ts_seconds: 1700000000,
    // No cluster_event_id → legacy mode → attributed_group.cluster_event_id === undefined
  };
  const out = fleetTickIngest(input, grouper);
  const rollup = rollupByClusterEvent(out.ingest_results, '');
  assert.deepStrictEqual(rollup.groups, []);
  assert.deepStrictEqual(rollup.deploy_ids, []);
});

// AC-R21-11: anti-scope diff forward-protection (chore-B; SHA-pinned per TQ-4 γ + R15 MINOR-1 + R19 MAJOR-3)
test('AC-R21-11: git diff baseline..chore-A only contains allowed-set paths', () => {
  const diff = execSync(
    'git diff 62e28d7..a5cae6d --name-only',
    { encoding: 'utf-8' },
  ).trim().split('\n').filter(Boolean);
  const allowed = new Set([
    'engine/fleet/verdict-consumer.ts',
    'engine/fleet/verdict-consumer.js',
    'test/q21-fleet-verdict-consumer.test.ts',
    'test/q21-fleet-verdict-consumer.test.js',
    'coordination/specs/Q-R21-SPEC.md',
    'coordination/specs/Q-R21-SPEC-AUDIT.md',
    'coordination/NEXT-ROLE.md',
    'coordination/MEMORIAL.md',
  ]);
  for (const p of diff) {
    assert.ok(allowed.has(p), `unexpected path in R21 diff: ${p}`);
  }
});

// AC-R22-3: dedup-guard structural binding (R22 Deliverable 3)
// Two verdicts with the same deploy_ref under the same cluster_event_id produce two
// IngestResults attributed to the SAME VerdictGroup (same composite key → same group_id).
// rollupByClusterEvent MUST deduplicate to groups.length === 1 (seen_group_ids guard fires).
// Failure mode: removing seen_group_ids.has() guard at engine/fleet/verdict-consumer.ts:87-94
//   → rollup.groups.length === 2 (both results push; assertion fails).
test('AC-R22-3: rollupByClusterEvent deduplicates when multiple results share the same group_id', () => {
  const grouper = new VerdictGrouper();
  const input: FleetTickInput = {
    per_shard_verdicts: [
      makeVerdict('deploy-A', 1),
      makeVerdict('deploy-A', 1),  // same deploy_ref → same composite key → same VerdictGroup
    ],
    ts_seconds: 1700000000,
    cluster_event_id: 'evt-X',
  };
  const out = fleetTickIngest(input, grouper);
  // Both results attributed to the same VerdictGroup (same group_id)
  assert.strictEqual(
    out.ingest_results[0].attributed_group.group_id,
    out.ingest_results[1].attributed_group.group_id,
  );
  // dedup guard fires on 2nd result → rollup has 1 group, not 2
  const rollup: ClusterEventRollup = rollupByClusterEvent(out.ingest_results, 'evt-X');
  assert.strictEqual(rollup.groups.length, 1);
  assert.strictEqual(rollup.deploy_ids.length, 1);
});

// AC-R22-4: short-circuit structural disambiguation (R22 Deliverable 4)
// Passing cluster_event_id: '' to fleetTickIngest stores '' raw on VerdictGroup at
// engine/verdict-groups.ts:183 (R20 § 2.6 truthy-collapse: falsy '' treated as absent for
// group_id format but stored verbatim as cluster_event_id field value).
// rollupByClusterEvent('', results) MUST short-circuit at verdict-consumer.ts:77-79
// returning [] — not merely coincidentally empty via strict-equality filter.
// Failure mode: removing short-circuit lines 77-79 → g.cluster_event_id !== '' is false
//   for the '' group → group IS pushed → rollup.groups.length === 1 (assertion fails).
test("AC-R22-4: rollupByClusterEvent('') short-circuits even when groups have cluster_event_id === ''", () => {
  const grouper = new VerdictGrouper();
  const input: FleetTickInput = {
    per_shard_verdicts: [makeVerdict('deploy-A', 1)],
    ts_seconds: 1700000000,
    cluster_event_id: '',  // stored raw as '' on VerdictGroup (R20 § 2.6)
  };
  const out = fleetTickIngest(input, grouper);
  // Verify '' is stored raw — not coerced to undefined (test would be vacuous otherwise)
  assert.strictEqual(out.ingest_results[0].attributed_group.cluster_event_id, '');
  // Short-circuit must return [] even though strict-equality would match the '' group
  const rollup = rollupByClusterEvent(out.ingest_results, '');
  assert.deepStrictEqual(rollup.groups, []);
  assert.deepStrictEqual(rollup.deploy_ids, []);
});

// AC-R22-8: anti-scope diff forward-protection (chore-B; SHA-pinned per TQ-4 γ + R15 MINOR-1 + R19 MAJOR-3)
// Baseline f7111c9 = R22-prep chore commit (HEAD at R22 session start).
// End-bound 480fc43 = R22 chore-A (coordination artifacts only; no engine/ changes).
test('AC-R22-8: git diff baseline..chore-A only contains allowed-set paths', () => {
  const diff = execSync(
    'git diff f7111c9..480fc43 --name-only',
    { encoding: 'utf-8' },
  ).trim().split('\n').filter(Boolean);
  const allowed = new Set([
    'coordination/PHASE-2-SLICE-2-CLOSE-WALK.md',
    'coordination/specs/Q-R22-SPEC.md',
    'coordination/NEXT-ROLE.md',
    'coordination/MEMORIAL.md',
    'test/q20-verdict-grouper-cluster-event-scope.test.ts',
    'test/q21-fleet-verdict-consumer.test.ts',
    'test/q21-fleet-verdict-consumer.test.js',
    'test/q01-no-at-pin-deltas.test.ts',
  ]);
  for (const p of diff) {
    assert.ok(allowed.has(p), `unexpected path in R22 diff: ${p}`);
  }
});
