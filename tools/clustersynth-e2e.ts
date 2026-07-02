// tools/clustersynth-e2e.ts — the end-to-end detection pipeline on a clustersynth
// topology at scale. Closes the gap that the pipeline was only ever assembled on flat
// ≤60-shard synthetic fleets: here it runs over a real clustersynth GB200 hierarchy
// (72 → 7,200 shards) with topology-derived common-mode factors and injected faults.
//
// Two engine paths, both measured:
//   1. INSTRUMENTED FDR path — instrumentedCommonModeResiduals (remove the measured
//      per-domain common-mode) → universalInferenceMeanShiftEValue → eBenjaminiHochberg.
//      The measured factors are fault-immune, so the empirical fleet-FDP tracks q.
//   2. LOCALISATION path — localizeFaults over the crossed factor structure +
//      pod/rack groups → per-shard e-value ranking (victim enrichment) + grouped select.
//
// HONEST SCOPE: empirical fleet-FDR + ranked localisation on SYNTHETIC telemetry over a
// real synthetic TOPOLOGY — not a per-shard guarantee, not real telemetry. localizeFaults
// `selected` is a ranking aid, not a certified FDR set (engine measured ~93% FDP at sparse
// density); we report the ranking.
//
// Tessera-original; NOT vendored.

import * as fs from 'node:fs';
import * as path from 'node:path';
import { parseTopology, type ParsedTopology } from './clustersynth-topology.js';
import { generateTelemetry, type Telemetry, type TelemetryParams } from './clustersynth-telemetry.js';
import { score, type Outcome } from './instrumented-capstone.js';
import { instrumentedCommonModeResiduals } from '@johnpatrickwarren-oss/deploysignal-engine/fleet/instrumented-common-mode';
import { universalInferenceMeanShiftEValue } from '@johnpatrickwarren-oss/deploysignal-engine/detectors/universal-inference-e-value';
import { eBenjaminiHochberg } from '@johnpatrickwarren-oss/deploysignal-engine/fleet/e-bh';
import { localizeFaults } from '@johnpatrickwarren-oss/deploysignal-engine/fleet/localize';

const SUBSTRATE = path.join(__dirname, '..', 'test', '_substrate');
export const TIERS = ['s0', 's1', 's2', 'c0', 's3'] as const;
export type Tier = typeof TIERS[number];

/** Absolute path to a tier fixture (may not exist for the large local-only tiers). */
export function fixturePath(tier: Tier): string {
  return path.join(SUBSTRATE, `clustersynth-gb200-${tier}.json`);
}

/** Load + parse a tier's topology; throws if the fixture is absent. */
export function loadTopology(tier: Tier): ParsedTopology {
  const p = fixturePath(tier);
  if (!fs.existsSync(p)) throw new Error(`clustersynth fixture missing: ${p} (generate per bench/README.md)`);
  return parseTopology(JSON.parse(fs.readFileSync(p, 'utf8')));
}

/** Per-shard mean-shift e-value over the cal/test split (E[e|H0] ≤ 1 for any φ). */
function uiEValues(R: ReadonlyArray<ReadonlyArray<number>>, calLen: number, testLen: number): number[] {
  const cal = { start: 0, len: calLen };
  const test = { start: calLen, len: testLen };
  return R.map((r) => universalInferenceMeanShiftEValue(r, cal, test));
}

export interface InstrumentedResult extends Outcome { ms: number; }

/** Path 1 — measured common-mode removal → UI e-value → e-BH. */
export function runInstrumented(topo: ParsedTopology, tel: Telemetry, q: number): InstrumentedResult {
  const t0 = process.hrtime.bigint();
  const R = instrumentedCommonModeResiduals(tel.X, tel.calLen, tel.factorSignals, topo.membership);
  const e = uiEValues(R, tel.calLen, tel.testLen);
  const out = score(e, tel.failed, q);
  const ms = Number(process.hrtime.bigint() - t0) / 1e6;
  return { ...out, ms };
}

export interface LocalizeResult {
  /** Mean perShardEValue over failed shards ÷ over healthy shards (victims enriched ≫ 1). */
  enrichment: number;
  /** Precision of the top-nFail ranked shards (fraction truly failed). */
  topPrecision: number;
  /** For a clustered fault: fraction of e-BH selections that land in the true fault group (else NaN). */
  groupAttribution: number;
  K: number;
  ms: number;
}

/** Path 2 — topology-localised fault detection (ranking + grouped e-BH). */
export function runLocalize(topo: ParsedTopology, tel: Telemetry, q: number): LocalizeResult {
  const t0 = process.hrtime.bigint();
  const res = localizeFaults({
    X: tel.X,
    referenceLen: tel.calLen,
    cal: { start: 0, len: tel.calLen },
    test: { start: tel.calLen, len: tel.testLen },
    factorPartitions: topo.factorPartitions,
    localizationGroups: topo.localizationGroups,
    qLevel: q,
  });
  const ms = Number(process.hrtime.bigint() - t0) / 1e6;

  const failedIdx = new Set(tel.failed.map((f, i) => (f ? i : -1)).filter((i) => i >= 0));
  const nFail = failedIdx.size;
  const mean = (xs: number[]): number => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
  const evFailed = mean(res.perShardEValue.filter((_, i) => failedIdx.has(i)));
  const evHealthy = mean(res.perShardEValue.filter((_, i) => !failedIdx.has(i)));
  const ranked = res.perShardEValue.map((v, i) => [v, i] as const).sort((a, b) => b[0] - a[0]);
  const topHits = ranked.slice(0, nFail).filter(([, i]) => failedIdx.has(i)).length;
  // Empty e-BH selection → NaN, NOT 1 (2026-07-02 audit fix: scoring an empty selection as perfect
  // attribution inflated the clustered-fault metric exactly in the low-power regime where it matters).
  const groupAttribution = tel.faultGroup >= 0
    ? (res.selected.length ? res.selected.filter((i) => topo.localizationGroups[i] === tel.faultGroup).length / res.selected.length : NaN)
    : NaN;

  return {
    enrichment: evHealthy > 0 ? evFailed / evHealthy : Infinity,
    topPrecision: nFail > 0 ? topHits / nFail : 1,
    groupAttribution,
    K: res.selected.length,
    ms,
  };
}

export interface TierReport {
  tier: Tier; nShards: number; nDomains: number; nGroups: number;
  instrumented: InstrumentedResult; localize: LocalizeResult; nFailed: number; clustered: boolean;
}

/** Run both pipeline paths on one tier at FDR target `q`. */
export function runTier(tier: Tier, q: number, telParams: TelemetryParams = {}): TierReport {
  const topo = loadTopology(tier);
  const tel = generateTelemetry(topo, telParams);
  return {
    tier,
    nShards: topo.nShards,
    nDomains: topo.domains.length,
    nGroups: new Set(topo.localizationGroups).size,
    instrumented: runInstrumented(topo, tel, q),
    localize: runLocalize(topo, tel, q),
    nFailed: tel.failed.filter(Boolean).length,
    clustered: telParams.clustered ?? false,
  };
}

/** Render an end-to-end table over whichever tiers have a local fixture present. */
export function renderE2E(q = 0.05): string {
  const lines: string[] = [];
  lines.push('clustersynth end-to-end pipeline — instrumented FDR + localisation on real topology.');
  lines.push(`FDR target q=${q}. Tiers run only when the fixture is present in test/_substrate/.`);
  lines.push('');
  lines.push('  tier  shards  domains groups | inst.FDP power  ms | loc.enrich topPrec  ms');
  lines.push('  ------------------------------+-------------------+---------------------------');
  for (const tier of TIERS) {
    if (!fs.existsSync(fixturePath(tier))) continue;
    const clustered = tier === 's2' || tier === 'c0'; // exercise clustered-fault localisation where groups>1
    const r = runTier(tier, q, { clustered });
    const i = r.instrumented, l = r.localize;
    const p = (s: string | number, w: number): string => String(s).padStart(w);
    lines.push(
      `  ${p(tier, 4)} ${p(r.nShards, 7)} ${p(r.nDomains, 7)} ${p(r.nGroups, 6)} | `
      + `${p(i.fdp.toFixed(3), 8)} ${p(i.power.toFixed(2), 5)} ${p(i.ms.toFixed(0), 4)} | `
      + `${p(isFinite(l.enrichment) ? l.enrichment.toFixed(1) : '∞', 9)} ${p(l.topPrecision.toFixed(2), 7)} ${p(l.ms.toFixed(0), 4)}`);
  }
  return lines.join('\n');
}

if (require.main === module) { // CommonJS CLI guard (tsconfig compiles to CJS)
  const q = process.argv[2] ? Number(process.argv[2]) : 0.05;
  process.stdout.write(renderE2E(q) + '\n');
  process.exit(0);
}
