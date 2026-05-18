// test/q20-verdict-grouper-cluster-event-scope.test.ts — Phase 2 SLICE 2.A bindings (R20).
//
// Binds AC-R20-1 through AC-R20-9 + AC-R20-15 (runtime) per Q-R20-SPEC.md § 5.
// AC-R20-10 (manifest row), AC-R20-11 (AT_PIN_FILES), AC-R20-12 (anti-scope diff),
// AC-R20-13 (typecheck), AC-R20-14 (full suite count) are binding-command attestations
// reported by the Implementer at GREEN.
//
// Covers: VerdictGrouper.ingest opts.cluster_event_id; openByGroupKey tuple-keying;
// conditional group_id format (composite vs inherited); openGroupForDeploy optional
// cluster_event_id arg; tuple-match late-arrival lookup; legacy-mode D2 regression;
// header annotation presence; vendoring first-line preservation.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { VerdictGrouper } from '../engine/verdict-groups';
import type { FusedVerdict } from '../engine/types/verdict';

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

test('AC-R20-1: ingest with cluster_event_id populates attributed_group.cluster_event_id', () => {
  const g = new VerdictGrouper();
  const r = g.ingest(makeVerdict('deploy-A', 1), 1700000000, { cluster_event_id: 'evt-X' });
  assert.strictEqual(r.attributed_group.cluster_event_id, 'evt-X');
});

test('AC-R20-2: group is retrievable via openGroupForDeploy(deploy_id, cluster_event_id)', () => {
  const g = new VerdictGrouper();
  const r = g.ingest(makeVerdict('deploy-A', 1), 1700000000, { cluster_event_id: 'evt-X' });
  assert.strictEqual(r.attributed_group.cluster_event_id, 'evt-X');
  const retrieved = g.openGroupForDeploy('deploy-A', 'evt-X');
  assert.ok(retrieved !== undefined);
  assert.strictEqual(retrieved, r.attributed_group);
});

test('AC-R20-3: ingest without cluster_event_id leaves attributed_group.cluster_event_id undefined', () => {
  const g1 = new VerdictGrouper();
  const r1 = g1.ingest(makeVerdict('deploy-A', 1), 1700000000, {});
  assert.strictEqual(r1.attributed_group.cluster_event_id, undefined);
  assert.strictEqual(r1.attributed_group.group_id, 'group-deploy-A-1700000000');

  const g2 = new VerdictGrouper();
  const r2 = g2.ingest(makeVerdict('deploy-B', 1), 1700000000, { terminal: true });
  assert.strictEqual(r2.attributed_group.cluster_event_id, undefined);
});

test('AC-R20-4: composite group_id format when cluster_event_id present', () => {
  const g = new VerdictGrouper();
  const r = g.ingest(makeVerdict('deploy-A', 1), 1700000000, { cluster_event_id: 'evt-X' });
  assert.strictEqual(r.attributed_group.group_id, 'group-evt-X-deploy-A-1700000000');
});

test('AC-R20-5: inherited group_id format preserved when cluster_event_id absent', () => {
  const g = new VerdictGrouper();
  const r = g.ingest(makeVerdict('deploy-A', 1), 1700000000, {});
  assert.strictEqual(r.attributed_group.group_id, 'group-deploy-A-1700000000');
});

test('AC-R20-6: distinct cluster_event_ids for same deploy_id produce distinct groups; empty-string treated as absent', () => {
  // Sub-case (a): two distinct cluster_event_ids for same deploy_id
  const ga = new VerdictGrouper();
  ga.ingest(makeVerdict('deploy-A', 1), 1700000000, { cluster_event_id: 'evt-X' });
  ga.ingest(makeVerdict('deploy-A', 2), 1700000001, { cluster_event_id: 'evt-Y' });
  const gX = ga.openGroupForDeploy('deploy-A', 'evt-X');
  const gY = ga.openGroupForDeploy('deploy-A', 'evt-Y');
  assert.ok(gX !== undefined, 'group for evt-X should exist');
  assert.ok(gY !== undefined, 'group for evt-Y should exist');
  assert.notStrictEqual(gX, gY);
  assert.notStrictEqual(gX.group_id, gY.group_id);

  // Sub-case (b): empty-string cluster_event_id treated as absent (§ 2.6)
  const gb = new VerdictGrouper();
  const rEmpty = gb.ingest(makeVerdict('deploy-A', 1), 1700000000, { cluster_event_id: '' });
  assert.strictEqual(rEmpty.attributed_group.group_id, 'group-deploy-A-1700000000');
});

test('AC-R20-7: same cluster_event_id across distinct deploy_ids produces distinct groups', () => {
  const g = new VerdictGrouper();
  const r1 = g.ingest(makeVerdict('deploy-A', 1), 1700000000, { cluster_event_id: 'evt-X' });
  const r2 = g.ingest(makeVerdict('deploy-B', 2), 1700000001, { cluster_event_id: 'evt-X' });
  assert.notStrictEqual(r1.attributed_group, r2.attributed_group);
  assert.notStrictEqual(r1.attributed_group.group_id, r2.attributed_group.group_id);
  assert.strictEqual(r1.attributed_group.cluster_event_id, 'evt-X');
  assert.strictEqual(r2.attributed_group.cluster_event_id, 'evt-X');
});

test('AC-R20-8: late-arrival tuple-equality match (four sub-cases)', () => {
  function makeClosedGrouper(): VerdictGrouper {
    const g = new VerdictGrouper({ grace_seconds: 300 });
    // Open + immediately close a cluster-event-mode group for (evt-X, deploy-A)
    g.ingest(makeVerdict('deploy-A', 1), 1700000000, { terminal: true, cluster_event_id: 'evt-X' });
    return g;
  }

  // (a) same (cluster_event_id, deploy_id) → attaches as late-arrival
  {
    const g = makeClosedGrouper();
    const r = g.ingest(makeVerdict('deploy-A', 2), 1700000100, { cluster_event_id: 'evt-X' });
    assert.strictEqual(r.late_arrival, true, 'sub-case (a): same tuple → late_arrival should be true');
  }

  // (b) different cluster_event_id → opens new group
  {
    const g = makeClosedGrouper();
    const r = g.ingest(makeVerdict('deploy-A', 2), 1700000100, { cluster_event_id: 'evt-Y' });
    assert.strictEqual(r.late_arrival, false, 'sub-case (b): different cluster_event_id → late_arrival false');
    assert.strictEqual(r.attributed_group.cluster_event_id, 'evt-Y');
  }

  // (c) no cluster_event_id (legacy-mode) vs cluster-event-mode closed → tuple mismatch
  {
    const g = makeClosedGrouper();
    const r = g.ingest(makeVerdict('deploy-A', 2), 1700000100, {});
    assert.strictEqual(r.late_arrival, false, 'sub-case (c): legacy incoming vs cluster-event closed → late_arrival false');
  }

  // (d) same cluster_event_id, different deploy_id → deploy_id mismatch
  {
    const g = makeClosedGrouper();
    const r = g.ingest(makeVerdict('deploy-B', 2), 1700000100, { cluster_event_id: 'evt-X' });
    assert.strictEqual(r.late_arrival, false, 'sub-case (d): deploy_id mismatch → late_arrival false');
  }
});

test('AC-R20-9: legacy-mode D2 regression coverage (window-elapsed, terminal, flush, late-arrival)', () => {
  // (a) Window-elapsed close in legacy mode
  {
    const g = new VerdictGrouper({ window_seconds: 60 });
    const r1 = g.ingest(makeVerdict('deploy-A', 1), 1000, {});
    assert.strictEqual(r1.closed, null);
    assert.strictEqual(r1.attributed_group.group_id, 'group-deploy-A-1000');

    const r2 = g.ingest(makeVerdict('deploy-A', 2), 1061, {}); // 1061 - 1000 = 61 > 60 → elapsed
    assert.ok(r2.closed !== null, '(a) window-elapsed close should produce closed group');
    assert.strictEqual(r2.closed!.group_id, 'group-deploy-A-1000');
    assert.strictEqual(r2.closed!.closed_at_ts, 1061);
    assert.strictEqual(r2.late_arrival, false);
    assert.strictEqual(r2.attributed_group.group_id, 'group-deploy-A-1061'); // new group
  }

  // (b) Terminal close in legacy mode
  {
    const g = new VerdictGrouper();
    const r = g.ingest(makeVerdict('deploy-A', 1), 1700000000, { terminal: true });
    assert.ok(r.closed !== null, '(b) terminal close should produce closed group');
    assert.strictEqual(r.closed!.group_id, 'group-deploy-A-1700000000');
    assert.strictEqual(r.closed!.closed_at_ts, 1700000000);
    assert.strictEqual(r.late_arrival, false);
  }

  // (c) flush() in legacy mode
  {
    const g = new VerdictGrouper();
    g.ingest(makeVerdict('deploy-A', 1), 1700000000, {});
    const flushed = g.flush(1700000100);
    assert.strictEqual(flushed.length, 1);
    assert.strictEqual(flushed[0].group_id, 'group-deploy-A-1700000000');
  }

  // (d) Late-arrival within grace_seconds in legacy mode
  {
    const g = new VerdictGrouper({ grace_seconds: 300 });
    const v1 = makeVerdict('deploy-A', 1);
    const v2 = makeVerdict('deploy-A', 2);
    g.ingest(v1, 1000, { terminal: true }); // open + immediately close group at 1000
    const r2 = g.ingest(v2, 1100, {}); // within grace (1100 - 1000 = 100 ≤ 300)
    assert.strictEqual(r2.late_arrival, true, '(d) late-arrival within grace should be true');
    assert.strictEqual(r2.attributed_group.group_id, 'group-deploy-A-1000');
    assert.strictEqual(r2.attributed_group.late_arrival_verdicts.length, 1);
  }
});

// Pinned to R20 chore-A SHA 23a497e (not HEAD) so post-R20 commits (Memorial-Updater
// outputs, CLAUDE-*.md reinforcements, etc.) do not cause false failures.
test('AC-R20-12: Anti-scope — git diff cecd677..23a497e --name-only ⊆ allowed-set', () => {
  const allowed = new Set([
    'engine/verdict-groups.ts',
    'engine/verdict-groups.js',
    'coordination/VENDORING-MANIFEST.md',
    'test/q01-no-at-pin-deltas.test.ts',
    'test/q01-no-at-pin-deltas.test.js',
    'test/q20-verdict-grouper-cluster-event-scope.test.ts',
    'test/q20-verdict-grouper-cluster-event-scope.test.js',
    'coordination/specs/Q-R20-SPEC.md',
    'coordination/specs/Q-R20-SPEC-AUDIT.md',
    'coordination/NEXT-ROLE.md',
    'coordination/MEMORIAL.md',
  ]);
  const diff = execSync('git diff cecd677..23a497e --name-only', { encoding: 'utf-8' });
  const touched = diff.split('\n').filter((p) => p.length > 0);
  for (const p of touched) {
    assert.ok(allowed.has(p), `Unexpected file in R20 diff vs cecd677: ${p}`);
  }
});

test('AC-R20-15: engine/verdict-groups.ts first-line SHA pin preserved; annotation block present', () => {
  const src = readFileSync('engine/verdict-groups.ts', 'utf-8');
  const firstLine = src.split('\n')[0];
  // Canonical first-line SHA pin preserved byte-identical (§ 2.7)
  assert.match(firstLine, /^\/\/ VENDORED FROM DeploySignal main@5a72371/);
  // Annotation block opening line present (§ 4.5)
  assert.match(src, /Tessera Phase 2 SLICE 2\.A amendments \(R20/);
});
