import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { BaselineBundle } from '../engine/types/config';
import {
  runCurationFlow,
  decideOutcome,
  countAlignedTicks,
  runAutoValidation,
  buildReportMarkdown,
  THRESHOLD_LOW,
  THRESHOLD_HIGH,
  DEFAULT_OUT_DIR,
  REPORT_DEFAULTS,
} from '../tools/curate-baseline';

// AC-R88-1: decideOutcome — low band (drop_rate < 0.05) → exit 0, 'Baseline ready', 'low'
test("AC-R88-1: decideOutcome low band returns exit 0 'Baseline ready' band='low'", () => {
  const r = decideOutcome(0.02, true, false);
  assert.equal(r.exit_code, 0);
  assert.equal(r.headline, 'Baseline ready');
  assert.equal(r.threshold_band, 'low');
  assert.equal(r.warning, undefined);
  assert.equal(r.override_applied, false);
});

// AC-R88-2: decideOutcome — moderate band (0.05 ≤ drop_rate < 0.15) → exit 0, warning, 'moderate'
test("AC-R88-2: decideOutcome moderate band returns exit 0 with warning band='moderate'", () => {
  const r = decideOutcome(0.10, true, false);
  assert.equal(r.exit_code, 0);
  assert.equal(r.headline, 'Baseline ready');
  assert.equal(r.threshold_band, 'moderate');
  assert.ok(r.warning && r.warning.includes('drop_rate ≥ 0.05'));
});

// AC-R88-3: decideOutcome — high band without override → exit 1, 'Heterogeneous corpus'
test("AC-R88-3: decideOutcome high band without override returns exit 1 'Heterogeneous corpus'", () => {
  const r = decideOutcome(0.25, true, false);
  assert.equal(r.exit_code, 1);
  assert.equal(r.headline, 'Heterogeneous corpus');
  assert.equal(r.threshold_band, 'high');
  assert.equal(r.override_applied, false);
});

// AC-R88-4: decideOutcome — high band WITH override → exit 0, 'Heterogeneous corpus', override flagged
test("AC-R88-4: decideOutcome high band with --allow-high-drop returns exit 0 override_applied=true", () => {
  const r = decideOutcome(0.25, true, true);
  assert.equal(r.exit_code, 0);
  assert.equal(r.headline, 'Heterogeneous corpus');
  assert.equal(r.override_applied, true);
  assert.ok(r.warning && r.warning.includes('override applied'));
});

// AC-R88-5: decideOutcome — validation-failed short-circuits → exit 1, 'Review needed', even with override
test("AC-R88-5: decideOutcome validation_failed short-circuits to exit 1 'Review needed' (override ignored)", () => {
  const r = decideOutcome(0.02, false, true);  // low drop, override on, but validation failed
  assert.equal(r.exit_code, 1);
  assert.equal(r.headline, 'Review needed');
  assert.equal(r.override_applied, false);
});

// AC-R88-6: countAlignedTicks aligns per-run to min-of-signals length
test('AC-R88-6: countAlignedTicks sums min-of-signals length per run', () => {
  const b: BaselineBundle = {
    version: 'v', generated_at: '2026-05-21T00:00:00Z', seed: 1,
    runs: [
      { signal_series: { a: [1, 2, 3], b: [1, 2, 3, 4] } },  // min = 3
      { signal_series: { a: [1, 2], b: [1, 2] } },           // min = 2
      { signal_series: {} },                                  // 0 signals → skipped (0)
    ],
  };
  assert.equal(countAlignedTicks(b), 5);
});

// AC-R88-7: runCurationFlow on corpus-clean → low band, exit 0, validation passes, outputs written
test('AC-R88-7: runCurationFlow on corpus-clean produces low-band ready outcome with all 3 outputs written', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'r88-clean-'));
  try {
    const outcome = runCurationFlow('test/_substrate/curation-corpus-clean.json', { outDir: tmp });
    assert.ok(outcome.drop_rate < THRESHOLD_LOW,
      `expected drop_rate < ${THRESHOLD_LOW}, got ${outcome.drop_rate}`);
    assert.equal(outcome.threshold_band, 'low');
    assert.equal(outcome.headline, 'Baseline ready');
    assert.equal(outcome.exit_code, 0);
    assert.equal(outcome.validation_passed, true);
    // All 3 outputs exist
    assert.ok(existsSync(join(tmp, 'curated-baseline.json')));
    assert.ok(existsSync(join(tmp, 'curation-report.md')));
    assert.ok(existsSync(join(tmp, 'curation-decisions.jsonl')));
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

// AC-R88-8: runCurationFlow on corpus-moderate → moderate band, exit 0 with warning
test('AC-R88-8: runCurationFlow on corpus-moderate produces moderate-band ready outcome with warning', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'r88-mod-'));
  try {
    const outcome = runCurationFlow('test/_substrate/curation-corpus-moderate.json', { outDir: tmp });
    assert.ok(outcome.drop_rate >= THRESHOLD_LOW && outcome.drop_rate < THRESHOLD_HIGH,
      `expected ${THRESHOLD_LOW} ≤ drop_rate < ${THRESHOLD_HIGH}, got ${outcome.drop_rate}`);
    assert.equal(outcome.threshold_band, 'moderate');
    assert.equal(outcome.exit_code, 0);
    assert.ok(outcome.warning && outcome.warning.length > 0);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

// AC-R88-9: runCurationFlow on corpus-heterogeneous → high band, exit 1 (no override)
test('AC-R88-9: runCurationFlow on corpus-heterogeneous without override produces exit 1', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'r88-het-'));
  try {
    const outcome = runCurationFlow('test/_substrate/curation-corpus-heterogeneous.json', { outDir: tmp });
    assert.ok(outcome.drop_rate >= THRESHOLD_HIGH,
      `expected drop_rate ≥ ${THRESHOLD_HIGH}, got ${outcome.drop_rate}`);
    assert.equal(outcome.threshold_band, 'high');
    assert.equal(outcome.exit_code, 1);
    assert.equal(outcome.headline, 'Heterogeneous corpus');
    assert.equal(outcome.override_applied, false);
    // Report still written even on HALT
    const reportPath = join(tmp, 'curation-report.md');
    assert.ok(existsSync(reportPath));
    const reportContent = readFileSync(reportPath, 'utf-8');
    assert.ok(reportContent.includes('Heterogeneous corpus'));
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

// AC-R88-10: runCurationFlow on corpus-heterogeneous WITH --allow-high-drop → exit 0, override flagged
test('AC-R88-10: runCurationFlow on corpus-heterogeneous with allowHighDrop produces exit 0 override_applied', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'r88-het-ovr-'));
  try {
    const outcome = runCurationFlow('test/_substrate/curation-corpus-heterogeneous.json',
                                     { outDir: tmp, allowHighDrop: true });
    assert.equal(outcome.threshold_band, 'high');
    assert.equal(outcome.exit_code, 0);
    assert.equal(outcome.override_applied, true);
    assert.ok(outcome.warning && outcome.warning.includes('override applied'));
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});
