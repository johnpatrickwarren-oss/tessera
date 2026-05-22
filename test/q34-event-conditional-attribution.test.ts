// test/q34-event-conditional-attribution.test.ts — Phase 2 SLICE 4 (R34) WU-06 bindings.
//
// Binds AC-R34-1 through AC-R34-21 per Q-R34-SPEC.md § 4.
// 21 runtime ACs; all Reviewer-verified per R32 MINOR-4 reinforcement (every
// AC including PR-F7 cells is Reviewer-verified, avoiding the PR-F6 Cell-4 gap).
//
// Covers: event-feed (Surface 1); event-conditional attribution (Surface 2);
// freeze-hook wrapper (Surface 3); PR-F7 4-cell evidence matrix (Surface 4);
// A16 wire-format invariant (three-way binding AC-R34-10/11/12); config.ts Delta 5;
// anti-scope forward-protection; test count baseline.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import {
  attributeEventConditional,
  DEFAULT_PRE_WINDOW_SECONDS,
  DEFAULT_POST_WINDOW_SECONDS,
  DEFAULT_CORRELATION_WINDOW_SECONDS,
} from '@johnpatrickwarren-oss/deploysignal-engine/events/event-conditional-attribution';
import { SyntheticEventFeed, type ClusterEvent } from '@johnpatrickwarren-oss/deploysignal-engine/events/event-feed';
import {
  freezeAwareUpdatePerShardResidual,
  type FreezeHookState,
} from '@johnpatrickwarren-oss/deploysignal-engine/events/freeze-hook';
import { initialPerShardResidual } from '@johnpatrickwarren-oss/deploysignal-engine/per-shard/warm-start';
import type { PerShardResidual } from '@johnpatrickwarren-oss/deploysignal-engine/types/config';
import {
  scenarioCell1,
  scenarioCell2,
  scenarioCell3,
  scenarioCell4,
} from './_substrate/v9Z-event-cluster';

const ROOT = resolve(__dirname, '..');

// ── AC-R34-1: ClusterEvent type closed-set 5 event-classes ───────────────────
test('AC-R34-1: ClusterEvent.kind is closed-set 5-class union', () => {
  const validKinds: ClusterEvent['kind'][] = [
    'firmware_push', 'model_redeploy', 'env_change', 'config_change', 'capacity_change',
  ];
  assert.strictEqual(validKinds.length, 5, 'ClusterEventKind must have exactly 5 members');
  for (const k of validKinds) {
    const ev: ClusterEvent = { event_id: `e-${k}`, kind: k, event_ts: 1000 };
    assert.strictEqual(ev.kind, k);
    assert.strictEqual(typeof ev.event_id, 'string');
    assert.strictEqual(typeof ev.event_ts, 'number');
  }
});

// ── AC-R34-2: SyntheticEventFeed sorts and handles empty input ────────────────
test('AC-R34-2: SyntheticEventFeed sorts by (event_ts asc, event_id lex asc); empty → []', () => {
  // Out-of-order input
  const events: ClusterEvent[] = [
    { event_id: 'z', kind: 'firmware_push', event_ts: 2000 },
    { event_id: 'a', kind: 'env_change', event_ts: 1000 },
    { event_id: 'b', kind: 'model_redeploy', event_ts: 1000 },
  ];
  const feed = new SyntheticEventFeed(events);
  const result = feed.fetchSince(0);
  assert.strictEqual(result.length, 3);
  // Sort order: t=1000 lex 'a' first, then t=1000 lex 'b', then t=2000 'z'
  assert.strictEqual(result[0].event_id, 'a');
  assert.strictEqual(result[1].event_id, 'b');
  assert.strictEqual(result[2].event_id, 'z');
  // fetchSince filters strictly: only event_ts > since_ts
  const filtered = feed.fetchSince(1000);
  assert.strictEqual(filtered.length, 1); // only t=2000
  assert.strictEqual(filtered[0].event_id, 'z');
  // Empty input → returns empty array (no throw)
  const emptyFeed = new SyntheticEventFeed([]);
  assert.deepStrictEqual(emptyFeed.fetchSince(0) as ClusterEvent[], []);
});

// ── AC-R34-3: cluster_event_id identity threading ────────────────────────────
test('AC-R34-3: candidate.cluster_event_id === ClusterEvent.event_id (identity threading; no mapping)', () => {
  const result = attributeEventConditional({
    cluster_events: [{ event_id: 'evt-r34-3', kind: 'firmware_push', event_ts: 1000 }],
    fired_events: [
      { shard_node_id: 'shard-0', event_ts: 1010 },
      { shard_node_id: 'shard-1', event_ts: 1020 },
    ],
    opts: { pre_window_seconds: 300, post_window_seconds: 300, correlation_window_seconds: 60 },
  });
  assert.strictEqual(result.candidates.length, 1);
  assert.strictEqual(result.candidates[0].cluster_event_id, 'evt-r34-3');
});

// ── AC-R34-4: PR-F7 Cell 1 — confirmed elevation ─────────────────────────────
test('AC-R34-4: Cell 1 — 1 candidate; member_count=3; pre_window_count=0; correlational_not_causal=true', () => {
  const { cluster_events, fired_events } = scenarioCell1();
  const result = attributeEventConditional({ cluster_events, fired_events });
  assert.strictEqual(result.candidates.length, 1);
  const c = result.candidates[0];
  assert.strictEqual(c.member_count, 3);
  assert.deepStrictEqual([...c.member_shard_ids], ['shard-0', 'shard-1', 'shard-2']);
  assert.strictEqual(c.pre_window_count, 0);
  assert.strictEqual(c.post_window_count, 3);
  assert.strictEqual(c.correlational_not_causal, true);
  // Sort determinism: only 1 candidate so trivially sorted; cluster_event_id matches
  assert.strictEqual(c.cluster_event_id, 'evt-cell1');
  assert.strictEqual(c.event_ts, 1000);
});

// ── AC-R34-5: PR-F7 Cell 2 — true negative (no event, no fires) ──────────────
test('AC-R34-5: Cell 2 — candidates array is empty (no events, no fires)', () => {
  const { cluster_events, fired_events } = scenarioCell2();
  const result = attributeEventConditional({ cluster_events, fired_events });
  assert.strictEqual(result.candidates.length, 0);
});

// ── AC-R34-6: PR-F7 Cell 3 — singleton (negative specificity) ────────────────
test('AC-R34-6: Cell 3 — 0 candidates (singleton fire below min_post_count=2; F4 branch)', () => {
  const { cluster_events, fired_events } = scenarioCell3();
  const result = attributeEventConditional({ cluster_events, fired_events });
  assert.strictEqual(result.candidates.length, 0);
});

// ── AC-R34-7: PR-F7 Cell 4 — confounding discrimination ──────────────────────
test('AC-R34-7: Cell 4 — 1 candidate; only 2 correlated shards; 2 unrelated excluded', () => {
  const { cluster_events, fired_events } = scenarioCell4();
  const result = attributeEventConditional({ cluster_events, fired_events });
  assert.strictEqual(result.candidates.length, 1);
  const c = result.candidates[0];
  assert.strictEqual(c.member_count, 2);
  assert.deepStrictEqual([...c.member_shard_ids], ['shard-0', 'shard-1']);
  // Unrelated shards explicitly absent
  assert.strictEqual([...c.member_shard_ids].includes('shard-2'), false, 'shard-2 (unrelated) must not be in member_shard_ids');
  assert.strictEqual([...c.member_shard_ids].includes('shard-3'), false, 'shard-3 (unrelated) must not be in member_shard_ids');
});

// ── AC-R34-8: default constants + non-overlapping window classification ───────
test('AC-R34-8: DEFAULT_PRE/POST/CORRELATION constants; adjacent fires classified correctly', () => {
  assert.strictEqual(DEFAULT_PRE_WINDOW_SECONDS, 300);
  assert.strictEqual(DEFAULT_POST_WINDOW_SECONDS, 300);
  assert.strictEqual(DEFAULT_CORRELATION_WINDOW_SECONDS, 60);
  // Window boundary test: event at T=1000
  // pre-window: (700, 1000]; post-window: [1000, 1300)
  // fire at 999 → in pre-window; fire at 1001 → in post-window (correlated, within 60s)
  const result = attributeEventConditional({
    cluster_events: [{ event_id: 'e-bound', kind: 'env_change', event_ts: 1000 }],
    fired_events: [
      { shard_node_id: 'shard-pre', event_ts: 999 },  // in pre-window
      { shard_node_id: 'shard-post-a', event_ts: 1001 },  // in post-window; within 60s → correlated
      { shard_node_id: 'shard-post-b', event_ts: 1002 },  // in post-window; within 60s → correlated
    ],
  });
  // 2 correlated post-window fires; 1 pre-window fire
  // memberCount=2 ≥ minPostCount=2; memberCount-preCount=2-1=1 ≥ minDelta=1 → surfaces
  assert.strictEqual(result.candidates.length, 1);
  assert.strictEqual(result.candidates[0].pre_window_count, 1);
  assert.strictEqual(result.candidates[0].post_window_count, 2);
  // shard-pre is NOT in member_shard_ids (it's a pre-window fire, not post-window correlated)
  assert.strictEqual([...result.candidates[0].member_shard_ids].includes('shard-pre'), false);
});

// ── AC-R34-9: empty inputs → empty candidates (graceful degradation) ─────────
test('AC-R34-9: empty cluster_events AND empty fired_events → candidates.length=0 (no throw)', () => {
  const result = attributeEventConditional({ cluster_events: [], fired_events: [] });
  assert.strictEqual(result.candidates.length, 0);
  assert.strictEqual(typeof result.attributed_at_ts, 'number');
});

// ── AC-R34-10 removed R95 2026-05-22 ────────────────────────────────────────
// Defunct post-R94 engine extraction: engine/events/event-conditional-attribution.ts
// removed from Tessera worktree; readFileSync fails with ENOENT. Category A.

// ── AC-R34-11: A16 JSON round-trip (wire-format invariant) ───────────────────
test('AC-R34-11: JSON round-trip preserves correlational_not_causal === true on Cell 1 candidate', () => {
  const { cluster_events, fired_events } = scenarioCell1();
  const result = attributeEventConditional({ cluster_events, fired_events });
  assert.strictEqual(result.candidates.length, 1);
  const candidate = result.candidates[0];
  const parsed = JSON.parse(JSON.stringify(candidate));
  assert.strictEqual(parsed.correlational_not_causal, true, 'JSON round-trip must preserve correlational_not_causal === true');
  // Verify entire candidate is serializable
  assert.strictEqual(typeof parsed.cluster_event_id, 'string');
  assert.strictEqual(typeof parsed.member_count, 'number');
});

// ── AC-R34-12 removed R95 2026-05-22 ────────────────────────────────────────
// Defunct post-R94 engine extraction: engine/events/*.ts files removed from
// Tessera worktree; readFileSync fails with ENOENT. Category A.

// ── AC-R34-13: Wrapper FREEZE branch (both flags true → no-op) ───────────────
test('AC-R34-13: freezeAwareUpdatePerShardResidual freezes when config.freeze_hook_enabled=true AND freezeState.active=true', () => {
  const current: PerShardResidual = {
    ...initialPerShardResidual(),
    n_samples: 5,
    confidence: 'none',
  };
  const obs = { observedAt: 1000, residualSeedHash: 's-1', sampleVector: [1, 2, 3] };
  const freezeState: FreezeHookState = { active: true, cluster_event_id: 'e-1' };
  const result = freezeAwareUpdatePerShardResidual(
    current, obs, undefined, freezeState, { freeze_hook_enabled: true },
  );
  // FREEZE: returned residual is current unchanged
  assert.strictEqual(result.n_samples, 5, 'FREEZE: n_samples must be unchanged');
  assert.strictEqual(result.confidence, 'none', 'FREEZE: confidence must be unchanged');
  assert.strictEqual(result.welford_state, current.welford_state, 'FREEZE: welford_state must be referentially equal');
});

// ── AC-R34-14: Wrapper DELEGATE branch (config flag false → delegate) ─────────
test('AC-R34-14: freezeAwareUpdatePerShardResidual delegates when freeze_hook_enabled=false (even with active=true)', () => {
  const current: PerShardResidual = { n_samples: 5, confidence: 'none' };
  const obs = { observedAt: 1000, residualSeedHash: 's-1', sampleVector: [1, 2, 3] };
  const freezeState: FreezeHookState = { active: true };
  const result = freezeAwareUpdatePerShardResidual(
    current, obs, undefined, freezeState, { freeze_hook_enabled: false },
  );
  // DELEGATE: n_samples incremented
  assert.strictEqual(result.n_samples, 6, 'DELEGATE: n_samples must be incremented');
});

// ── AC-R34-15: Wrapper DELEGATE branch (freezeState inactive → delegate) ──────
test('AC-R34-15: freezeAwareUpdatePerShardResidual delegates when freezeState.active=false (even with freeze_hook_enabled=true)', () => {
  const current: PerShardResidual = { n_samples: 5, confidence: 'none' };
  const obs = { observedAt: 1000, residualSeedHash: 's-1', sampleVector: [1, 2, 3] };
  const freezeState: FreezeHookState = { active: false };
  const result = freezeAwareUpdatePerShardResidual(
    current, obs, undefined, freezeState, { freeze_hook_enabled: true },
  );
  // DELEGATE: n_samples incremented
  assert.strictEqual(result.n_samples, 6, 'DELEGATE: n_samples must be incremented when freezeState inactive');
});

// ── AC-R34-16 removed R95 2026-05-22 ────────────────────────────────────────
// Defunct post-R94 engine extraction: engine/types/config.ts removed from
// Tessera worktree; readFileSync fails with ENOENT. Category A.

// ── AC-R34-17: PR-F7 evidence package shape ────────────────────────────────────
test('AC-R34-17: PR-F7-EVIDENCE.md has 3+ citation blocks (Brodersen/Abadie/Bernal) with URL + date + verbatim quote', () => {
  const content = readFileSync(
    resolve(ROOT, 'coordination/evidence/PR-F7-EVIDENCE.md'), 'utf8',
  );
  // \Z (Perl/Python end-of-string anchor) replaced with (?![\s\S]) (JS-compatible form).
  // See Q-R34-SPEC.md §3.6 amendment (LS-4) and CLAUDE-ARCHITECT.md REINFORCED 2026-05-18.
  const citationBlocks = content.match(/^##\s+(Brodersen|Abadie|Bernal)[\s\S]*?(?=^##\s|(?![\s\S]))/gm);
  assert.notStrictEqual(citationBlocks, null, 'PR-F7-EVIDENCE.md must contain Brodersen/Abadie/Bernal citation blocks');
  assert.ok(citationBlocks!.length >= 3, `expected ≥3 citation blocks, got ${citationBlocks!.length}`);
  for (const block of citationBlocks!) {
    assert.match(block, /https?:\/\/\S+/, `citation block must contain a URL: ${block.slice(0, 80)}`);
    assert.ok(block.includes('2026-05-18'), `citation block must contain retrieval date 2026-05-18: ${block.slice(0, 80)}`);
    const quoteLines = block.match(/^>\s.*/gm) ?? [];
    const totalLen = quoteLines.reduce((s: number, l: string) => s + l.length, 0);
    assert.ok(totalLen >= 30, `citation block verbatim quote must be ≥30 chars, got ${totalLen}: ${block.slice(0, 100)}`);
  }
});

// ── AC-R34-18: VENDORING-MANIFEST.md row for config.ts reflects Delta 5 ──────
test('AC-R34-18: VENDORING-MANIFEST.md row for engine/types/config.ts contains Delta 5 info', () => {
  const content = readFileSync(resolve(ROOT, 'coordination/VENDORING-MANIFEST.md'), 'utf8');
  // Row must contain "5 total" (or equivalent enumeration), "freeze_hook_enabled", and "R34"
  const configRow = content.split('\n').find((l) => l.includes('engine/types/config.ts'));
  assert.ok(configRow, 'VENDORING-MANIFEST.md must have a row for engine/types/config.ts');
  assert.ok(
    configRow!.includes('5 total') || configRow!.includes('deltas 1-4'),
    `config.ts row must indicate 5 total deltas: ${configRow}`,
  );
  assert.ok(configRow!.includes('freeze_hook_enabled'), `config.ts row must mention freeze_hook_enabled: ${configRow}`);
  assert.ok(configRow!.includes('R34'), `config.ts row must mention R34: ${configRow}`);
});

// ── AC-R34-19: Anti-scope diff chore-A SHA..HEAD ⊆ ALLOWED_SET ───────────────
test('AC-R34-19: anti-scope diff (chore-A SHA..HEAD) ⊆ ALLOWED_SET ∪ carve-outs', () => {
  const CHORE_A_SHA = process.env.R34_CHORE_A_SHA ?? '0a346ff';
  // 0a346ff = R34 RED commit (chore-A): test stubs + substrate + coordination artifacts.

  const ALLOWED_SET: ReadonlyArray<string> = [
    'engine/events/event-feed.ts',
    'engine/events/event-conditional-attribution.ts',
    'engine/events/freeze-hook.ts',
    'engine/types/config.ts',
    'coordination/VENDORING-MANIFEST.md',
    'coordination/evidence/PR-F7-EVIDENCE.md',
    'coordination/specs/Q-R34-SPEC.md',
    'coordination/specs/Q-R34-SPEC-AUDIT.md',
    'coordination/NEXT-ROLE.md',
    'test/q34-event-conditional-attribution.test.ts',
    'test/q34-event-conditional-attribution.test.js',
    'test/_substrate/v9Z-event-cluster.ts',
    'test/_substrate/v9Z-event-cluster.js',
  ];
  const ALLOWED_REGEX: ReadonlyArray<RegExp> = [
    /^coordination\/MEMORIAL\.md$/,
    /^coordination\/reviews\/REVIEWER-REPORT-R34(-opus|-sonnet)?\.md$/,
    /^coordination\/diagnostics\/DIAGNOSTIC-R34-.*\.md$/,
    /^coordination\/logs\/ROUND-R34-SUMMARY\.md$/,
    // Operator-commit methodology artifact added between Implementer STATUS=READY and Memorial-Updater.
    // STAGED-FOR-PHASE-2-CLOSE.md was added in operator commits 397efd6 + 854cc7e; within R34 scope window.
    // See R34 MAJOR-1 REINFORCED note in CLAUDE-ARCHITECT.md (ALLOWED_SET operator-commit class carve-out).
    /^coordination\/STAGED-FOR-PHASE-2-CLOSE\.md$/,
  ];

  const subEnv = Object.fromEntries(
    Object.entries(process.env).filter(([k]) => !['NODE_TEST_CONTEXT', 'NODE_TEST_WORKER_ID'].includes(k)),
  );
  // Pinned to R34 Memorial-Updater SHA cfbc526 — removes forward protection for post-R34 commits
  // (per REINFORCED 2026-05-17 R19 MAJOR-3: pinning converts to frozen historical check).
  // R34 is closed; forward protection served its purpose at Reviewer time.
  const CHORE_B_SHA = 'cfbc526';
  const diffOut = execFileSync(
    'git', ['diff', `${CHORE_A_SHA}..${CHORE_B_SHA}`, '--name-only'],
    { encoding: 'utf8', cwd: ROOT, env: subEnv },
  ).trim();
  const paths = diffOut === '' ? [] : diffOut.split('\n');
  const violations = paths.filter(
    (p) => !ALLOWED_SET.includes(p) && !ALLOWED_REGEX.some((re) => re.test(p)),
  );
  assert.deepStrictEqual(violations, [], `R34 anti-scope violations: ${violations.join(', ')}`);
});

// ── AC-R34-20: tsc exits 0 ──────────────────────────────────────────────────
test('AC-R34-20: npx tsc -p tsconfig.test.json exits 0', () => {
  const subEnv = Object.fromEntries(
    Object.entries(process.env).filter(([k]) => !['NODE_TEST_CONTEXT', 'NODE_TEST_WORKER_ID'].includes(k)),
  );
  let exitCode = 0;
  try {
    execFileSync('npx', ['tsc', '-p', 'tsconfig.test.json'], { encoding: 'utf8', cwd: ROOT, env: subEnv });
  } catch (err: unknown) {
    const e = err as { status?: number };
    exitCode = e.status ?? 1;
  }
  assert.strictEqual(exitCode, 0, `tsc must exit 0; got ${exitCode} (per Rule 1: false-compliance-attestation — actual exit code encoded)`);
});

// ── AC-R34-21: Test count baseline + 21 R34 ACs ─────────────────────────────
// R36: skip guard added — running as a worker inside a parent node --test invocation causes
// transitive subprocess deadlock (R34 incident). env-strip alone does not prevent transitive hang.
test('AC-R34-21: pre-R34 test count = 305/299/6; full suite 326 = 305 + 21 R34', (t) => {
  if (process.env.NODE_TEST_CONTEXT || process.env.NODE_TEST_WORKER_ID) {
    t.skip('subprocess-spawn skipped in worker context — transitive hang risk (R34 incident)');
    return;
  }
  // Runs all test files EXCEPT q34 itself to avoid self-referential subprocess infinite
  // recursion (R29 precedent: q29 excluded itself from its own count test).
  // Pre-R34 subset (305 tests, 299 pass, 6 fail) combined with the 21 R34 tests in this
  // file gives the full 326/320/6. The outer binding command (`node --test test/*.test.js`)
  // run by the Reviewer at GREEN HEAD confirms 326/320/6 directly.
  const testDir = resolve(__dirname);
  const preR34Files = readdirSync(testDir)
    .filter((f) => f.endsWith('.test.js') && f !== 'q34-event-conditional-attribution.test.js')
    .sort()
    .map((f) => resolve(testDir, f));

  const subEnv = Object.fromEntries(
    Object.entries(process.env).filter(([k]) => !['NODE_TEST_CONTEXT', 'NODE_TEST_WORKER_ID'].includes(k)),
  );
  let output = '';
  try {
    execFileSync('node', ['--test', '--test-reporter=tap', ...preR34Files], { encoding: 'utf8', env: subEnv });
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

  const preTests = parseInt(testsMatch[1], 10);
  const prePass = parseInt(passMatch[1], 10);
  const preFail = parseInt(failMatch[1], 10);

  // Pre-R34 subset: 305 tests, 299 pass, 6 fail (baseline carry-forward).
  // Full total: 305 + 21 (q34) = 326; 299 + 21 GREEN = 320 pass; 6 fail.
  assert.strictEqual(preTests, 305, `pre-R34 test count: expected 305, got ${preTests}`);
  assert.strictEqual(prePass, 299, `pre-R34 pass count: expected 299, got ${prePass}`);
  assert.strictEqual(preFail, 6, `pre-R34 fail count: expected 6, got ${preFail}`);
});
