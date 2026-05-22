#!/usr/bin/env node
// tools/curate-baseline.ts — R88 Phase 5 SLICE 1.
// One-command operator entry point for the baseline curation flow.
//
// Composes Stage 2a (MCD per-shard) + Stage 2b (FCP-1 fleet-correlated)
// via tools/curate-baseline-fleet-correlated.ts, runs an auto-validation
// pass (Family C detector quiescence via Stage 2a/2b idempotency on the
// curated bundle), applies threshold-based gating, and writes the curated
// baseline + curation report + audit-trail JSONL to <out-dir>.
//
// CLI: pnpm curate-baseline <raw-data-path> [--out <dir>] [--allow-high-drop]
//
// Conservative defaults (inherited from curate-baseline-fleet-correlated.ts):
//   α_fleet = 1e-3   (DEFAULT_ALPHA_FLEET)
//   χ²ₚ     = 0.975  (chiSqQuantile975)
//   MCD α   = 0.75   (FASTMCD_DEFAULT_ALPHA)
//
// Tessera-original.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import type {
  BaselineBundle,
  BaselineCurationDecision,
  BaselineCurationDecisionId,
} from '@johnpatrickwarren-oss/deploysignal-engine/types/config';
import {
  curateBaselineFleetCorrelated,
  type FleetCorrelatedResult,
} from './curate-baseline-fleet-correlated';

// ─── Constants ─────────────────────────────────────────────────────────

export const THRESHOLD_LOW = 0.05;
export const THRESHOLD_HIGH = 0.15;
export const DEFAULT_OUT_DIR = './curated-baseline/';

// Conservative defaults documented for the curation-report (sourced from the
// composer's own defaults; do NOT re-declare here to avoid drift).
export const REPORT_DEFAULTS = {
  alpha_fleet: 1e-3,        // DEFAULT_ALPHA_FLEET at curate-baseline-fleet-correlated.ts:50
  chi_sq_p: 0.975,           // chiSqQuantile975 at curate-baseline-pre-pass.ts:115
  mcd_alpha: 0.75,           // FASTMCD_DEFAULT_ALPHA inherited via tools/calibrators/family-c.ts
} as const;

// ─── Types ─────────────────────────────────────────────────────────────

export interface CurationOptions {
  outDir?: string;
  allowHighDrop?: boolean;
}

export type ThresholdBand = 'low' | 'moderate' | 'high';
export type Headline = 'Baseline ready' | 'Review needed' | 'Heterogeneous corpus';

export interface CurationOutcome {
  exit_code: 0 | 1 | 2;
  headline: Headline;
  threshold_band: ThresholdBand;
  drop_rate: number;
  n_ticks_input: number;
  n_ticks_curated: number;
  n_runs: number;
  validation_passed: boolean;
  validation_summary: string;
  warning?: string;          // present when threshold_band === 'moderate' or override applied
  override_applied: boolean; // true iff --allow-high-drop was used to bypass the HALT
}

// ─── Bundle I/O ────────────────────────────────────────────────────────

function loadBundle(path: string): BaselineBundle {
  let raw: string;
  try { raw = readFileSync(path, 'utf-8'); }
  catch (e) { throw new Error(`curate-baseline: cannot read ${path}: ${(e as Error).message}`); }
  let parsed: unknown;
  try { parsed = JSON.parse(raw); }
  catch (e) { throw new Error(`curate-baseline: invalid JSON at ${path}: ${(e as Error).message}`); }
  // Shape verification:
  if (parsed === null || typeof parsed !== 'object') {
    throw new Error('curate-baseline: bundle is not a JSON object');
  }
  const obj = parsed as Record<string, unknown>;
  for (const key of ['version', 'generated_at', 'seed', 'runs'] as const) {
    if (!(key in obj)) throw new Error(`curate-baseline: bundle missing field ${key}`);
  }
  if (!Array.isArray(obj.runs)) {
    throw new Error('curate-baseline: bundle.runs is not an array');
  }
  return parsed as BaselineBundle;
}

// ─── Tick counting (drop-rate denominator + numerator) ─────────────────

export function countAlignedTicks(bundle: BaselineBundle): number {
  let total = 0;
  for (const run of bundle.runs) {
    const sigs = Object.keys(run.signal_series);
    if (sigs.length === 0) continue;
    total += Math.min(...sigs.map((s) => run.signal_series[s].length));
  }
  return total;
}

// ─── Threshold-band decision ───────────────────────────────────────────

export function decideOutcome(
  dropRate: number,
  validationPassed: boolean,
  allowHighDrop: boolean,
): { exit_code: 0 | 1; headline: Headline; threshold_band: ThresholdBand;
     warning?: string; override_applied: boolean } {
  // Validation failure ALWAYS short-circuits — even under --allow-high-drop.
  if (!validationPassed) {
    return { exit_code: 1, headline: 'Review needed',
             threshold_band: dropRate >= THRESHOLD_HIGH ? 'high'
                           : dropRate >= THRESHOLD_LOW ? 'moderate' : 'low',
             override_applied: false };
  }
  if (dropRate >= THRESHOLD_HIGH) {
    if (allowHighDrop) {
      return { exit_code: 0, headline: 'Heterogeneous corpus', threshold_band: 'high',
               warning: 'drop_rate ≥ 0.15; override applied (--allow-high-drop)',
               override_applied: true };
    }
    return { exit_code: 1, headline: 'Heterogeneous corpus', threshold_band: 'high',
             override_applied: false };
  }
  if (dropRate >= THRESHOLD_LOW) {
    return { exit_code: 0, headline: 'Baseline ready', threshold_band: 'moderate',
             warning: 'drop_rate ≥ 0.05; review before training',
             override_applied: false };
  }
  return { exit_code: 0, headline: 'Baseline ready', threshold_band: 'low',
           override_applied: false };
}

// ─── Auto-validation pass ──────────────────────────────────────────────

export interface ValidationResult {
  passed: boolean;
  summary: string;
  second_pass_d11_contamination: number;
  second_pass_d12_fired: boolean;
}

export function runAutoValidation(curated: BaselineBundle): ValidationResult {
  const secondPass = curateBaselineFleetCorrelated(curated);
  const d11 = secondPass.decisions.D11;
  const d12 = secondPass.decisions.D12;
  const d11Contamination = (d11?.output_summary?.n_ticks_contaminated as number) ?? 0;
  const d12Fired = (d12?.output_summary?.fired as boolean) ?? false;
  const passed = d11Contamination === 0 && !d12Fired;
  let summary: string;
  if (passed) {
    summary = 'Family C detectors quiescent on curated baseline '
              + '(Stage 2a MCD-Mahalanobis: 0 additional contaminated ticks; '
              + 'Stage 2b FCP-1 e-process: no fleet event)';
  } else {
    const parts: string[] = [];
    if (d11Contamination > 0) {
      parts.push(`Stage 2a flagged ${d11Contamination} additional ticks on second pass`);
    }
    if (d12Fired) {
      parts.push('Stage 2b FCP-1 e-process fired on curated baseline');
    }
    summary = 'Family C detectors NOT quiescent: ' + parts.join('; ');
  }
  return {
    passed,
    summary,
    second_pass_d11_contamination: d11Contamination,
    second_pass_d12_fired: d12Fired,
  };
}

// ─── Report writer ─────────────────────────────────────────────────────

export function buildReportMarkdown(outcome: CurationOutcome,
                                    firstPassDecisions: Partial<Record<BaselineCurationDecisionId, BaselineCurationDecision>>,
                                    rawPath: string): string {
  const lines: string[] = [];
  lines.push(`# Curation report — ${outcome.headline}`);
  lines.push('');
  lines.push(`Input: \`${rawPath}\``);
  lines.push('');
  lines.push('## Headline');
  lines.push('');
  lines.push(`**${outcome.headline}** (band: \`${outcome.threshold_band}\`; exit ${outcome.exit_code})`);
  if (outcome.warning) {
    lines.push('');
    lines.push(`> ⚠ ${outcome.warning}`);
  }
  if (outcome.override_applied) {
    lines.push('');
    lines.push('> Operator override: `--allow-high-drop` applied.');
  }
  lines.push('');
  lines.push('## Drop statistics');
  lines.push('');
  lines.push(`- runs: ${outcome.n_runs}`);
  lines.push(`- n_ticks_input: ${outcome.n_ticks_input}`);
  lines.push(`- n_ticks_curated: ${outcome.n_ticks_curated}`);
  lines.push(`- drop_rate: ${outcome.drop_rate.toFixed(4)}`);
  lines.push('');
  lines.push('## Top-K dropped runs');
  lines.push('');
  const d11 = firstPassDecisions.D11;
  if (d11) {
    lines.push(`- n_runs_screened: ${d11.output_summary.n_runs_screened ?? 0}`);
    lines.push(`- n_runs_skipped_insufficient_samples: ${d11.output_summary.n_runs_skipped_insufficient_samples ?? 0}`);
    lines.push(`- n_runs_skipped_mcd_failed: ${d11.output_summary.n_runs_skipped_mcd_failed ?? 0}`);
    lines.push(`- n_ticks_contaminated (Stage 2a): ${d11.output_summary.n_ticks_contaminated ?? 0}`);
    lines.push(`- contamination_rate (Stage 2a): ${(d11.output_summary.contamination_rate as number ?? 0).toFixed(4)}`);
  }
  const d12 = firstPassDecisions.D12;
  if (d12) {
    lines.push(`- Stage 2b fired: ${d12.output_summary.fired}`);
    if (d12.output_summary.fired) {
      lines.push(`- Stage 2b fire_window: ${d12.output_summary.fire_window}`);
    }
  }
  lines.push('');
  lines.push('## Validation');
  lines.push('');
  lines.push(`- validation_passed: ${outcome.validation_passed}`);
  lines.push(`- ${outcome.validation_summary}`);
  lines.push('');
  lines.push('## Defaults');
  lines.push('');
  lines.push(`- α_fleet: ${REPORT_DEFAULTS.alpha_fleet}`);
  lines.push(`- χ²ₚ: ${REPORT_DEFAULTS.chi_sq_p}`);
  lines.push(`- MCD α: ${REPORT_DEFAULTS.mcd_alpha}`);
  lines.push('');
  lines.push('### Override flags');
  lines.push('');
  lines.push('- `--allow-high-drop` — bypasses the drop_rate ≥ 0.15 HALT. Does NOT bypass validation-failure HALT.');
  lines.push('');
  lines.push('## Audit trail');
  lines.push('');
  lines.push('See `curation-decisions.jsonl` for the BaselineCurationDecision records (D11 Stage 2a; D12 Stage 2b; D13 Stage 3b wire format).');
  lines.push('');
  return lines.join('\n');
}

// ─── Main flow (programmable surface) ──────────────────────────────────

export function runCurationFlow(rawDataPath: string, opts: CurationOptions = {}): CurationOutcome {
  const allowHighDrop = opts.allowHighDrop ?? false;

  const rawBundle = loadBundle(resolve(rawDataPath));
  const firstPass: FleetCorrelatedResult = curateBaselineFleetCorrelated(rawBundle);

  const nTicksInput = countAlignedTicks(rawBundle);
  const nTicksCurated = countAlignedTicks(firstPass.curatedBundle);
  const dropRate = nTicksInput > 0
    ? (nTicksInput - nTicksCurated) / nTicksInput
    : 0;

  const validation = runAutoValidation(firstPass.curatedBundle);
  const decision = decideOutcome(dropRate, validation.passed, allowHighDrop);

  const outcome: CurationOutcome = {
    exit_code: decision.exit_code,
    headline: decision.headline,
    threshold_band: decision.threshold_band,
    drop_rate: dropRate,
    n_ticks_input: nTicksInput,
    n_ticks_curated: nTicksCurated,
    n_runs: rawBundle.runs.length,
    validation_passed: validation.passed,
    validation_summary: validation.summary,
    warning: decision.warning,
    override_applied: decision.override_applied,
  };

  // Write outputs if outDir specified (CLI sets it; library callers may omit).
  if (opts.outDir !== undefined) {
    writeOutputs(opts.outDir, firstPass.curatedBundle, firstPass.decisions, outcome, rawDataPath);
  }

  return outcome;
}

function writeOutputs(outDir: string,
                      curatedBundle: BaselineBundle,
                      decisions: Partial<Record<BaselineCurationDecisionId, BaselineCurationDecision>>,
                      outcome: CurationOutcome,
                      rawDataPath: string): void {
  const resolved = resolve(outDir);
  mkdirSync(resolved, { recursive: true });

  // 1. curated-baseline.json
  writeFileSync(join(resolved, 'curated-baseline.json'),
                JSON.stringify(curatedBundle, null, 2) + '\n',
                'utf-8');

  // 2. curation-report.md
  const reportMd = buildReportMarkdown(outcome, decisions, rawDataPath);
  writeFileSync(join(resolved, 'curation-report.md'), reportMd, 'utf-8');

  // 3. curation-decisions.jsonl (one line per record)
  const lines: string[] = [];
  for (const id of ['D11', 'D12', 'D13'] as const) {
    const dec = decisions[id];
    if (dec) lines.push(JSON.stringify(dec));
  }
  writeFileSync(join(resolved, 'curation-decisions.jsonl'),
                lines.join('\n') + (lines.length > 0 ? '\n' : ''),
                'utf-8');
}

// ─── CLI argument parsing ──────────────────────────────────────────────

interface CliArgs { rawDataPath: string; outDir: string; allowHighDrop: boolean; }

function parseCliArgs(argv: string[]): CliArgs | null {
  // argv excludes node + script path; positional first, then flags.
  let rawDataPath: string | null = null;
  let outDir: string = DEFAULT_OUT_DIR;
  let allowHighDrop = false;

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--out') {
      const v = argv[i + 1];
      if (v === undefined || v.startsWith('--')) return null;
      outDir = v;
      i += 1;
    } else if (a === '--allow-high-drop') {
      allowHighDrop = true;
    } else if (a.startsWith('--')) {
      // unknown flag
      return null;
    } else if (rawDataPath === null) {
      rawDataPath = a;
    } else {
      // extra positional
      return null;
    }
  }

  if (rawDataPath === null) return null;
  return { rawDataPath, outDir, allowHighDrop };
}

function printUsage(): void {
  process.stderr.write(
    [
      'Usage: pnpm curate-baseline <raw-data-path> [--out <dir>] [--allow-high-drop]',
      '',
      '  <raw-data-path>       JSON file containing a BaselineBundle',
      '  --out <dir>           Output directory (default: ./curated-baseline/)',
      '  --allow-high-drop     Bypass the drop_rate ≥ 0.15 HALT',
      '',
    ].join('\n'),
  );
}

// CLI guard (project convention: see tools/demo-scenario.ts:470).
if (require.main === module) {
  const args = parseCliArgs(process.argv.slice(2));
  if (args === null) {
    printUsage();
    process.exit(2);
  }
  try {
    const outcome = runCurationFlow(args.rawDataPath, {
      outDir: args.outDir,
      allowHighDrop: args.allowHighDrop,
    });
    process.stdout.write(`${outcome.headline} (drop_rate=${outcome.drop_rate.toFixed(4)}, band=${outcome.threshold_band}, validation=${outcome.validation_passed ? 'pass' : 'fail'})\n`);
    if (outcome.warning) {
      process.stderr.write(`warning: ${outcome.warning}\n`);
    }
    if (!outcome.validation_passed) {
      process.stderr.write(`curate-baseline: validation failed — ${outcome.validation_summary}\n`);
    } else if (outcome.exit_code === 1) {
      process.stderr.write(`curate-baseline: drop_rate=${outcome.drop_rate.toFixed(4)} ≥ 0.15 — HALT; rerun with --allow-high-drop to override\n`);
    }
    process.exit(outcome.exit_code);
  } catch (e) {
    process.stderr.write(`${(e as Error).message}\n`);
    process.exit(2);
  }
}
