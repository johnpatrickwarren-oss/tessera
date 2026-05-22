// test/q14-compiled-config-loader.test.ts — R14 AC-11 through AC-16.
//
// Binds the compiled-artifact JSON loader at engine/loader.ts.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadCompiledConfig } from '@johnpatrickwarren-oss/deploysignal-engine/loader';
import type { CompiledConfig } from '@johnpatrickwarren-oss/deploysignal-engine/types/config';

/** Minimal valid CompiledConfig for loader tests. */
function makeMinimalConfig(overrides: Partial<CompiledConfig> = {}): CompiledConfig {
  return {
    version: '1.0.0',
    compiler_version: '1.0.0',
    compiled_at: '2026-05-17T00:00:00Z',
    baseline_ref: 'sha:abc123',
    alpha_budget: {
      total: 0.05,
      per_family: { family_a: 0.02, family_c: 0.02, family_d: 0.005, family_e: 0.005 },
    },
    ...overrides,
  } as CompiledConfig;
}

// ─── R14 AC-11 — round-trip serialization with R10-emission-shape per_shard_cells ────────
test('R14 AC-11 — loadCompiledConfig round-trip: JSON.stringify → loadCompiledConfig → deep-equal', () => {
  const original = makeMinimalConfig({
    per_shard_cells: [
      {
        shard_id: 'shard-0',
        key: { hour_of_day: 0 },
        residual: {
          n_samples: 80,
          confidence: 'strict',
          welford_state: { n: 80, mean: [1, 2], m2: [[40, 0], [0, 40]] },
          mean_vector: [1, 2],
          covariance: [[0.506, 0], [0, 0.506]],
          residual_seed_hash: 'sha:a',
          last_observed_at: 1000,
        },
      },
      {
        shard_id: 'shard-1',
        key: { hour_of_day: 1 },
        residual: {
          n_samples: 25,
          confidence: 'warm_start',
          welford_state: { n: 25, mean: [3, 5], m2: [[24, 0], [0, 24]] },
          mean_delta: [0.5, 1.0],
          residual_seed_hash: 'sha:a',
          last_observed_at: 2000,
        },
      },
    ],
  });

  const json = JSON.stringify(original);
  const loaded = loadCompiledConfig(json);

  assert.deepStrictEqual(loaded, original);
  // Spot-check nested access (per_shard_cells accessible as typed)
  assert.strictEqual(loaded.per_shard_cells![0].shard_id, 'shard-0');
  assert.strictEqual(loaded.per_shard_cells![0].residual.confidence, 'strict');
  assert.deepStrictEqual(loaded.per_shard_cells![0].residual.mean_vector, [1, 2]);
  assert.deepStrictEqual(loaded.per_shard_cells![1].residual.mean_delta, [0.5, 1.0]);
});

// ─── R14 AC-12 — validation rejects missing 'version' field ─────────────────────────────
test("R14 AC-12 — loadCompiledConfig throws when 'version' field missing", () => {
  const config = makeMinimalConfig();
  // Remove version field
  const raw = JSON.parse(JSON.stringify(config)) as Record<string, unknown>;
  delete raw['version'];
  assert.throws(
    () => loadCompiledConfig(JSON.stringify(raw)),
    (err: unknown) => {
      assert.ok(err instanceof Error);
      assert.ok(err.message.includes('version'), `error message "${err.message}" should include "version"`);
      return true;
    },
  );
});

// ─── R14 AC-13 — validation rejects missing 'alpha_budget' field ─────────────────────────
test("R14 AC-13 — loadCompiledConfig throws when 'alpha_budget' field missing", () => {
  const config = makeMinimalConfig();
  const raw = JSON.parse(JSON.stringify(config)) as Record<string, unknown>;
  delete raw['alpha_budget'];
  assert.throws(
    () => loadCompiledConfig(JSON.stringify(raw)),
    (err: unknown) => {
      assert.ok(err instanceof Error);
      assert.ok(err.message.includes('alpha_budget'), `error message "${err.message}" should include "alpha_budget"`);
      return true;
    },
  );
});

// ─── R14 AC-14 — malformed JSON throws SyntaxError ────────────────────────────────────────
test('R14 AC-14 — loadCompiledConfig throws on malformed JSON', () => {
  assert.throws(
    () => loadCompiledConfig('{invalid json: yes}'),
    SyntaxError,
  );
});

// ─── R14 AC-15 — validation rejects empty version string ─────────────────────────────────
test("R14 AC-15 — loadCompiledConfig throws when 'version' is empty string", () => {
  const config = makeMinimalConfig({ version: '' });
  assert.throws(
    () => loadCompiledConfig(JSON.stringify(config)),
    (err: unknown) => {
      assert.ok(err instanceof Error);
      assert.ok(err.message.includes('version'), `error message "${err.message}" should include "version"`);
      return true;
    },
  );
});

// ─── R14 AC-16 — loads R10-emission-shape with mixed-tier per_shard_cells ────────────────
test('R14 AC-16 — loadCompiledConfig loads CompiledConfig with warm_start + strict residuals in per_shard_cells', () => {
  const config = makeMinimalConfig({
    per_shard_cells: [
      // strict-tier: has mean_vector + covariance
      {
        shard_id: 'shard-0',
        key: { workload_class: 'llm' },
        residual: {
          n_samples: 60,
          confidence: 'strict',
          welford_state: { n: 60, mean: [1, 0], m2: [[0, 0], [0, 0]] },
          mean_vector: [1, 0],
          covariance: [[0, 0], [0, 0]],
        },
      },
      // warm_start-tier: has mean_delta, no mean_vector/covariance
      {
        shard_id: 'shard-1',
        key: { workload_class: 'llm' },
        residual: {
          n_samples: 20,
          confidence: 'warm_start',
          welford_state: { n: 20, mean: [0.9, 0.1], m2: [[1, 0], [0, 1]] },
          mean_delta: [-0.1, 0.1],
        },
      },
      // none-tier: no delta fields
      {
        shard_id: 'shard-2',
        key: { workload_class: 'llm' },
        residual: {
          n_samples: 5,
          confidence: 'none',
          welford_state: { n: 5, mean: [0.5, 0.5], m2: [[0.5, 0], [0, 0.5]] },
        },
      },
    ],
  });

  const loaded = loadCompiledConfig(JSON.stringify(config));

  // per_shard_cells accessible and correct
  assert.ok(Array.isArray(loaded.per_shard_cells));
  assert.strictEqual(loaded.per_shard_cells!.length, 3);

  // strict-tier cell has mean_vector + covariance
  const strictCell = loaded.per_shard_cells![0];
  assert.strictEqual(strictCell.residual.confidence, 'strict');
  assert.deepStrictEqual(strictCell.residual.mean_vector, [1, 0]);
  assert.deepStrictEqual(strictCell.residual.covariance, [[0, 0], [0, 0]]);

  // warm_start-tier cell has mean_delta
  const warmCell = loaded.per_shard_cells![1];
  assert.strictEqual(warmCell.residual.confidence, 'warm_start');
  assert.deepStrictEqual(warmCell.residual.mean_delta, [-0.1, 0.1]);

  // none-tier cell has neither
  const noneCell = loaded.per_shard_cells![2];
  assert.strictEqual(noneCell.residual.confidence, 'none');
  assert.strictEqual(noneCell.residual.mean_vector, undefined);
  assert.strictEqual(noneCell.residual.mean_delta, undefined);
});
