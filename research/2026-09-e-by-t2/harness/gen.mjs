// research/2026-09-e-by-t2/harness/gen.mjs — generate the registered bundles through the clustersynth CLI
// (PREREGISTRATION §2). Idempotent: a bundle whose directory holds counters.ndjson + labels.json is kept.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { CLUSTERSYNTH, BUNDLE_DIR, COUNTER, scenarioConfig, healthyName, monName } from './config.mjs';

const sha256 = (p) => createHash('sha256').update(readFileSync(p)).digest('hex');

function complete(dir) {
  return existsSync(join(dir, 'counters.ndjson')) && existsSync(join(dir, 'labels.json')) && existsSync(join(dir, 'control.json'));
}

/** Generate one bundle; `band` is null for a healthy bundle. Returns its hashes. */
export function generateBundle(arm, seed, band) {
  const name = band == null ? healthyName(arm, seed) : monName(arm, band, seed);
  const dir = join(BUNDLE_DIR, name);
  if (!complete(dir)) {
    mkdirSync(dir, { recursive: true });
    const cfgPath = join(dir, 'scenario-config.json');
    writeFileSync(cfgPath, JSON.stringify(scenarioConfig(arm, seed, band != null), null, 2) + '\n');
    const env = { ...process.env, CS_COUNTERS: COUNTER };
    if (band != null) env.CS_FAULT_MAG = band;
    execFileSync('node', [join(CLUSTERSYNTH, 'dist/cli.js'), 'scenario', cfgPath, '--out-dir', dir], { env, stdio: ['ignore', 'ignore', 'pipe'] });
    if (!complete(dir)) throw new Error(`generation left ${dir} incomplete`);
  }
  return { name, dir, arm, seed, band, counters_sha256: sha256(join(dir, 'counters.ndjson')), labels_sha256: sha256(join(dir, 'labels.json')) };
}
