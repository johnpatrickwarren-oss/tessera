// test/q29-k8s-adapter.test.ts — Phase 2 SLICE 3.B (R29) WU-02 K8s adapter.
//
// Runtime tests binding AC-R29-1..12 (chore-A); AC-R29-13 appended at chore-B (carve-outs: DIAGNOSTIC, REVIEWER-REPORT).
// Tessera-original test (NOT vendored from DeploySignal).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import {
  K8sNodeLabelSource,
  type K8sNodeList,
} from '../engine/topology/k8s-source';
import { computeSnapshotHash } from '../engine/topology-overlay';

function loadFixture(name: string): K8sNodeList {
  return JSON.parse(readFileSync(resolve(__dirname, '_substrate', name), 'utf8')) as K8sNodeList;
}

// AC-R29-1: empty NodeList
test('AC-R29-1 / empty NodeList — fetchSnapshot returns empty nodes/edges with injected ts', async () => {
  const fixture = loadFixture('k8s-nodelist-fixture-empty.json');
  const src = new K8sNodeLabelSource(fixture, { now: () => 1700000000 });
  const snap = await src.fetchSnapshot();
  assert.strictEqual(snap.nodes.length, 0);
  assert.strictEqual(snap.edges.length, 0);
  assert.strictEqual(snap.fetched_at_ts, 1700000000);
  assert.strictEqual(snap.source_id, 'k8s_node_label_source');
  assert.strictEqual(snap.source_version, 'k8s-1');
});

// AC-R29-2: full-label parse — node/edge kind counts
test('AC-R29-2 / full-label parse — node/edge kind counts match expected totals', async () => {
  const fixture = loadFixture('k8s-nodelist-fixture-full.json');
  const src = new K8sNodeLabelSource(fixture, { now: () => 1700000000 });
  const snap = await src.fetchSnapshot();

  assert.strictEqual(snap.nodes.filter((n) => n.kind === 'rack').length, 4, 'expected 4 rack nodes');
  assert.strictEqual(snap.nodes.filter((n) => n.kind === 'cooling_zone').length, 2, 'expected 2 cooling_zone nodes');
  assert.strictEqual(snap.nodes.filter((n) => n.kind === 'gpu_shard').length, 32, 'expected 32 gpu_shard nodes');
  assert.strictEqual(snap.nodes.length, 38, 'expected 38 nodes total');

  assert.strictEqual(
    snap.edges.filter((e) => e.relationship === 'contains' && e.from.startsWith('zone:')).length,
    4,
    'expected 4 zone→host edges',
  );
  assert.strictEqual(
    snap.edges.filter((e) => e.relationship === 'contains' && e.from.startsWith('host:')).length,
    32,
    'expected 32 host→gpu edges',
  );
  assert.strictEqual(snap.edges.length, 36, 'expected 36 edges total');
});

// AC-R29-3: zone→host containment edges exact mapping
test('AC-R29-3 / zone→host containment edges exact mapping', async () => {
  const fixture = loadFixture('k8s-nodelist-fixture-full.json');
  const src = new K8sNodeLabelSource(fixture, { now: () => 1700000000 });
  const snap = await src.fetchSnapshot();

  const zoneEdges = snap.edges.filter((e) => e.relationship === 'contains' && e.from.startsWith('zone:'));
  assert.strictEqual(zoneEdges.length, 4);

  const expected = [
    { from: 'zone:zone-A', to: 'host:host-01' },
    { from: 'zone:zone-A', to: 'host:host-02' },
    { from: 'zone:zone-B', to: 'host:host-03' },
    { from: 'zone:zone-B', to: 'host:host-04' },
  ];
  for (const exp of expected) {
    const found = zoneEdges.find((e) => e.from === exp.from && e.to === exp.to && e.relationship === 'contains');
    assert.ok(found, `expected zone edge (${exp.from}, ${exp.to}) not found`);
  }
});

// AC-R29-4: gpu_shard inference from gpu.count — 32 shards with deterministic ids
test('AC-R29-4 / gpu_shard inference from gpu.count — 32 shards with deterministic ids', async () => {
  const fixture = loadFixture('k8s-nodelist-fixture-full.json');
  const src = new K8sNodeLabelSource(fixture, { now: () => 1700000000 });
  const snap = await src.fetchSnapshot();

  const gpuNodes = snap.nodes.filter((n) => n.kind === 'gpu_shard');
  assert.strictEqual(gpuNodes.length, 32);

  for (const nn of ['01', '02', '03', '04']) {
    for (let index = 0; index <= 7; index++) {
      const id = `gpu:host-${nn}:${index}`;
      const node = gpuNodes.find((n) => n.id === id);
      assert.ok(node, `expected gpu_shard node with id ${id}`);
      assert.strictEqual(node.kind, 'gpu_shard');
    }
  }
});

// AC-R29-5: host→gpu_shard containment edges — 32 exact pairs
test('AC-R29-5 / host→gpu_shard containment edges — 32 exact pairs', async () => {
  const fixture = loadFixture('k8s-nodelist-fixture-full.json');
  const src = new K8sNodeLabelSource(fixture, { now: () => 1700000000 });
  const snap = await src.fetchSnapshot();

  const hostEdges = snap.edges.filter((e) => e.relationship === 'contains' && e.from.startsWith('host:'));
  assert.strictEqual(hostEdges.length, 32);

  for (const nn of ['01', '02', '03', '04']) {
    for (let index = 0; index <= 7; index++) {
      const from = `host:host-${nn}`;
      const to = `gpu:host-${nn}:${index}`;
      const found = hostEdges.find((e) => e.from === from && e.to === to && e.relationship === 'contains');
      assert.ok(found, `expected host→gpu edge (${from}, ${to}) not found`);
    }
  }
});

// AC-R29-6: metadata preservation — instance_type, region, gpu_product, host fields
test('AC-R29-6 / metadata preservation — instance_type, region, gpu_product, host fields', async () => {
  const fixture = loadFixture('k8s-nodelist-fixture-full.json');
  const src = new K8sNodeLabelSource(fixture, { now: () => 1700000000 });
  const snap = await src.fetchSnapshot();

  for (const host of snap.nodes.filter((n) => n.kind === 'rack')) {
    assert.strictEqual(host.metadata?.instance_type, 'p4d.24xlarge', `host ${host.id} missing instance_type`);
    assert.strictEqual(host.metadata?.region, 'region-X', `host ${host.id} missing region`);
  }

  for (const gpu of snap.nodes.filter((n) => n.kind === 'gpu_shard')) {
    assert.strictEqual(gpu.metadata?.gpu_product, 'A100-SXM4-40GB', `gpu ${gpu.id} missing gpu_product`);
    // R29 MINOR-1 fix: use strictEqual (not truthy length-check) per REINFORCED 2026-05-18
    const expectedHost = gpu.id.split(':')[1]; // gpu:{name}:{index} → name
    assert.strictEqual(gpu.metadata?.host, expectedHost, `gpu ${gpu.id} host must equal node name`);
  }

  for (const zone of snap.nodes.filter((n) => n.kind === 'cooling_zone')) {
    assert.deepStrictEqual(zone.metadata, {}, `zone ${zone.id} metadata should be empty {}`);
  }
});

// AC-R29-7: sparse no-region — no metadata.region on hosts, no gpu_shards
test('AC-R29-7 / sparse no-region — no metadata.region on hosts, no gpu_shards', async () => {
  const fixture = loadFixture('k8s-nodelist-fixture-sparse-no-region.json');
  assert.doesNotThrow(() => new K8sNodeLabelSource(fixture, { now: () => 1700000000 }));

  const src = new K8sNodeLabelSource(fixture, { now: () => 1700000000 });
  const snap = await src.fetchSnapshot();

  assert.strictEqual(snap.nodes.filter((n) => n.kind === 'rack').length, 2);
  assert.strictEqual(snap.nodes.filter((n) => n.kind === 'cooling_zone').length, 1);
  assert.strictEqual(snap.nodes.filter((n) => n.kind === 'gpu_shard').length, 0);
  assert.strictEqual(
    snap.edges.filter((e) => e.relationship === 'contains' && e.from.startsWith('zone:')).length,
    2,
  );
  assert.strictEqual(
    snap.edges.filter((e) => e.relationship === 'contains' && e.from.startsWith('host:')).length,
    0,
  );

  for (const host of snap.nodes.filter((n) => n.kind === 'rack')) {
    assert.strictEqual(host.metadata?.region, undefined, `host ${host.id} must not have metadata.region`);
  }
});

// AC-R29-8: sparse no-GPU — region and instance_type present, no gpu_shards
test('AC-R29-8 / sparse no-GPU — region and instance_type present, no gpu_shards', async () => {
  const fixture = loadFixture('k8s-nodelist-fixture-sparse-no-gpu.json');
  const src = new K8sNodeLabelSource(fixture, { now: () => 1700000000 });
  const snap = await src.fetchSnapshot();

  assert.strictEqual(snap.nodes.filter((n) => n.kind === 'rack').length, 2);
  assert.strictEqual(snap.nodes.filter((n) => n.kind === 'cooling_zone').length, 1);
  assert.strictEqual(snap.nodes.filter((n) => n.kind === 'gpu_shard').length, 0);
  assert.strictEqual(
    snap.edges.filter((e) => e.relationship === 'contains' && e.from.startsWith('zone:')).length,
    2,
  );
  assert.strictEqual(
    snap.edges.filter((e) => e.relationship === 'contains' && e.from.startsWith('host:')).length,
    0,
  );

  for (const host of snap.nodes.filter((n) => n.kind === 'rack')) {
    assert.strictEqual(host.metadata?.region, 'region-Y', `host ${host.id} missing region`);
    assert.strictEqual(host.metadata?.instance_type, 'm5.large', `host ${host.id} missing instance_type`);
  }
});

// AC-R29-9: TopologySource interface conformance + delegation + determinism
test('AC-R29-9 / TopologySource interface conformance + delegation + determinism', async () => {
  const fixture = loadFixture('k8s-nodelist-fixture-full.json');
  const src = new K8sNodeLabelSource(fixture, { now: () => 1700000000 });

  assert.ok(typeof src.id === 'string' && src.id.length > 0);
  assert.ok(typeof src.version === 'string' && src.version.length > 0);

  const snap1 = await src.fetchSnapshot();
  const snap2 = await src.fetchSnapshot();
  assert.ok(Object.is(snap1, snap2), 'fetchSnapshot must return same reference on every call');

  assert.strictEqual(src.snapshotHash(snap1), computeSnapshotHash(snap1));

  const src2 = new K8sNodeLabelSource(fixture, { now: () => 1700000000 });
  const snap3 = await src2.fetchSnapshot();
  assert.strictEqual(src.snapshotHash(snap1), src2.snapshotHash(snap3));
});

// AC-R29-10: A16 preservation — k8s-source.ts contains zero occurrences of correlational_not_causal
test('AC-R29-10 / A16 preservation — k8s-source.ts contains zero occurrences of correlational_not_causal', () => {
  const srcText = readFileSync(resolve(__dirname, '../engine/topology/k8s-source.ts'), 'utf8');
  const occurrences = (srcText.match(/correlational_not_causal/g) ?? []).length;
  assert.strictEqual(occurrences, 0, 'engine/topology/k8s-source.ts must not contain correlational_not_causal');
});

// AC-R29-11: typecheck binding-command — tsc exits 2 with only {TS2688, TS5107}
// Per spec § 7.1(a): if observed exit code or diagnostic set differs from AC literal, HALT.
test('AC-R29-11 / typecheck binding-command — tsc exits 2 with only {TS2688, TS5107}', () => {
  let thrown: { status?: number; stdout?: string; stderr?: string } | null = null;
  try {
    execFileSync('npx', ['tsc', '-p', 'tsconfig.test.json'], { encoding: 'utf8' });
  } catch (err: unknown) {
    thrown = err as { status?: number; stdout?: string; stderr?: string };
  }
  assert.ok(thrown !== null, 'expected tsc to exit non-zero');
  assert.strictEqual(thrown.status, 2, `expected exit code 2, got ${String(thrown.status)}`);

  const output = (thrown.stdout ?? '') + (thrown.stderr ?? '');
  const codes = Array.from(output.matchAll(/error TS(\d+):/g)).map((m) => `TS${m[1]}`);
  const codeSet = new Set(codes);
  assert.strictEqual(codeSet.size, 2, `expected exactly 2 diagnostic codes, got ${codeSet.size}: ${[...codeSet].join(', ')}`);
  assert.ok(codeSet.has('TS2688'), 'expected TS2688 in diagnostic codes');
  assert.ok(codeSet.has('TS5107'), 'expected TS5107 in diagnostic codes');
});

// AC-R29-12: node --test count binding-command (anchored to chore-A SHA per R22 IMPL MINOR-1)
// Runs pre-R29 test files only (excludes q29-k8s-adapter.test.js) to avoid self-reference paradox.
// Per spec § 7.1(b): if observed counts differ from AC literal 243/241/2, HALT.
test('AC-R29-12 / node --test count binding-command — pre-R29 files yield 243/241/2', () => {
  const testDir = resolve(__dirname);
  const preR29Files = readdirSync(testDir)
    .filter((f) => f.endsWith('.test.js') && f !== 'q29-k8s-adapter.test.js')
    .map((f) => resolve(testDir, f));

  // spec § 3.2 deviation: env strip required for Node.js v25 recursive-test-detection
  // (REINFORCED 2026-05-18; prescribed execFileSync form in spec § 3.2 does not include env
  // strip; this deviation documented here per R29 MINOR-3 fix).
  // Strip NODE_TEST_CONTEXT + NODE_TEST_WORKER_ID to prevent Node.js v25's
  // recursive-test-detection from silently skipping the subprocess run.
  const subEnv = Object.fromEntries(
    Object.entries(process.env).filter(([k]) => !['NODE_TEST_CONTEXT', 'NODE_TEST_WORKER_ID'].includes(k)),
  );
  let output = '';
  try {
    execFileSync('node', ['--test', '--test-reporter=tap', ...preR29Files], { encoding: 'utf8', env: subEnv });
  } catch (err: unknown) {
    const e = err as { stdout?: string; stderr?: string };
    output = (e.stdout ?? '') + (e.stderr ?? '');
  }

  const testsMatch = output.match(/^# tests (\d+)$/m);
  const passMatch = output.match(/^# pass (\d+)$/m);
  const failMatch = output.match(/^# fail (\d+)$/m);

  assert.ok(testsMatch, 'could not parse # tests from TAP output');
  assert.ok(passMatch, 'could not parse # pass from TAP output');
  assert.ok(failMatch, 'could not parse # fail from TAP output');

  assert.strictEqual(parseInt(testsMatch[1], 10), 243, `expected tests=243, got ${testsMatch[1]}`);
  assert.strictEqual(parseInt(passMatch[1], 10), 241, `expected pass=241, got ${passMatch[1]}`);
  assert.strictEqual(parseInt(failMatch[1], 10), 2, `expected fail=2, got ${failMatch[1]}`);
});

// AC-R29-13: Anti-scope forward-protection (chore-B)
// Per R20/R21/R22/R23/R25/R26 precedent. Uses execFileSync (NOT execSync) per R26 MINOR-1 reinforcement.
test('AC-R29-13: anti-scope forward-protection (chore-B)', () => {
  const CHORE_A_SHA = '778cff8';

  const ALLOWED_SET = new Set([
    'coordination/specs/Q-R29-SPEC.md',
    'coordination/specs/Q-R29-SPEC-AUDIT.md',
    'coordination/NEXT-ROLE.md',
    'coordination/MEMORIAL.md',
    'engine/topology/k8s-source.ts',
    'test/q29-k8s-adapter.test.ts',
    'test/_substrate/k8s-nodelist-fixture-full.json',
    'test/_substrate/k8s-nodelist-fixture-sparse-no-region.json',
    'test/_substrate/k8s-nodelist-fixture-sparse-no-gpu.json',
    'test/_substrate/k8s-nodelist-fixture-empty.json',
  ]);
  // Conditional DIAGNOSTIC carve-out per spec § 2.5 + R25 MAJOR-2 reinforcement.
  const DIAGNOSTIC_REGEX = /^coordination\/diagnostics\/DIAGNOSTIC-R29-.+\.md$/;
  // R29 MINOR-2 fix: also carve out REVIEWER-REPORT files (added post-chore-A by hybrid Reviewer).
  const REVIEWER_REPORT_REGEX = /^coordination\/reviews\/REVIEWER-REPORT-.+\.md$/;

  const diffOutput = execFileSync(
    'git',
    ['diff', `${CHORE_A_SHA}..HEAD`, '--name-only'],
    { encoding: 'utf8' },
  );

  const paths = diffOutput.split('\n').filter((p) => p.length > 0);
  const violations = paths.filter(
    (p) => !ALLOWED_SET.has(p) && !DIAGNOSTIC_REGEX.test(p) && !REVIEWER_REPORT_REGEX.test(p),
  );

  assert.strictEqual(
    violations.length,
    0,
    `post-chore-A modification outside allowed-set: ${violations.join(', ')}`,
  );
});
