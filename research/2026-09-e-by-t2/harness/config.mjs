// research/2026-09-e-by-t2/harness/config.mjs — the registered constants (PREREGISTRATION §2–§3). Do not move.
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';

export const HERE = dirname(fileURLToPath(import.meta.url));
export const STUDY = resolve(HERE, '..');
export const ROOT = resolve(STUDY, '../..');
// The sibling checkout, or the shared one when this tree is a session worktree under ~/concord/.worktrees.
const csCandidates = [process.env.CLUSTERSYNTH, resolve(ROOT, '../clustersynth'), join(homedir(), 'concord/clustersynth')].filter(Boolean);
export const CLUSTERSYNTH = csCandidates.find((d) => existsSync(join(d, 'dist/cli.js'))) ?? csCandidates[0];
export const BUNDLE_DIR = process.env.CS_BUNDLE_DIR ?? join(STUDY, 'bundles');

export const require = createRequire(join(ROOT, 'package.json'));
for (const f of ['tools/mode-b-loop.js', 'tools/telemetry-source.js', 'tools/contrast.js', 'tools/clustersynth-scenario.js', 'tools/clustersynth-mode-b.js']) {
  if (!existsSync(join(ROOT, f))) throw new Error(`build first: ${f} missing`);
}
for (const f of ['dist/cli.js', 'dist/harness/faults.js', 'dist/harness/factor-model.js']) {
  if (!existsSync(join(CLUSTERSYNTH, f))) throw new Error(`build clustersynth first: ${f} missing under ${CLUSTERSYNTH}`);
}

export const COUNTER = 'gpu_temp_c';
export const DT_S = 3600;
export const T_HEALTHY = 1440;
export const T_MON = 2880;
export const MON_START = 1440;
export const N_CYCLES = 12;
export const Q = 0.1;
export const DELTAS = [0.05, 0.10];
export const RHO = 1;
export const K = 288;
export const BASE_TS = 1_700_000_000;
export const FAULT_RATE = 0.1;
export const BANDS = ['1:2', '2:4', '4:8'];
export const ARMS = ['infamily', 'nonlinear', 'hidden', 'heavy'];
export const SEEDS = Array.from({ length: 20 }, (_, j) => 72001 + 101 * j);
export const MIN_LEVEL_ACTIONS = 50;

/** The clustersynth ScenarioConfig for one arm, with or without faults. */
export function scenarioConfig(arm, seed, faults) {
  const cfg = { family: 'gb200', pods: 1, racksPerPod: 4, spines: 0, seed, window: { steps: faults ? T_MON : T_HEALTHY, dt_s: DT_S }, controlArm: true, faults: faults ? { rate: FAULT_RATE, sharedFaults: 0 } : false }; // A1: gpu-level only
  if (arm === 'nonlinear') cfg.outOfFamily = { nonlinear: 1 };
  if (arm === 'hidden') cfg.factorsHidden = true;
  if (arm === 'heavy') cfg.outOfFamily = { heavyTails: 1 };
  return cfg;
}
export const healthyName = (arm, seed) => `${arm}-s${seed}-base`;
export const monName = (arm, band, seed) => `${arm}-b${band.replace(':', '_')}-s${seed}-mon`;
