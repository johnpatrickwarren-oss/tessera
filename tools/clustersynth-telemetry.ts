// tools/clustersynth-telemetry.ts — synthetic GPU-counter telemetry on a parsed
// clustersynth topology. Each common-mode FACTOR DOMAIN (a cooling zone, a power
// supply, a pod/rack) emits its own shared STATIONARY (mean-reverting AR(1)) signal;
// every shard sums the signals of the domains it belongs to, plus a per-shard level
// and AR(1) noise, plus an injected step fault on the failed shards. The per-domain
// signals are returned as the MEASURED (instrumented) factor signals — fault-immune,
// because a fault on a shard does not move the domain signal the product measures
// directly (ADR 0017/0019).
//
// Why stationary, not a random walk: an INTEGRATED (random-walk) common-mode drifts
// far from its calibration level, so per-shard loading-fit error gets amplified by the
// test-window drift into a spurious residual mean-shift on a fraction of HEALTHY shards
// (spurious regression among collinear integrated regressors) — which inflates the
// empirical FDP. That is the project's own ADR 0011/0012 finding: feed the e-value
// BASELINED/stationary residuals, not raw drift. Real cluster common-mode (cooling /
// power / workload) fluctuates around levels rather than random-walking, so a stationary
// AR(1) is both the realistic and the well-posed model. (Set `commonModeRho: 1` to
// reproduce the integrated-drift pathology.)
//
// Tessera-original; NOT vendored.

import { mulberry32, gaussian } from './calibration-envelope.js';
import type { ParsedTopology } from './clustersynth-topology';

export interface TelemetryParams {
  /** Total ticks. */
  T?: number;
  /** Healthy reference / calibration window length `[0, calLen)`; MUST be fault-free. */
  calLen?: number;
  /** Test window length (the "after"); `cal=[0,calLen)`, `test=[calLen, calLen+testLen)`. */
  testLen?: number;
  /** Fault onset tick (must be ≥ calLen so the reference window is clean). Default calLen+50. */
  faultOnset?: number;
  /** Fraction of shards that fail. Default 0.05. */
  faultFrac?: number;
  /** Concentrate the failed shards inside a single locality group (pod/rack) — the realistic
   *  "one domain browns out" case (tests localisation). Default false (spread across the fleet). */
  clustered?: boolean;
  /** Per-domain common-mode amplitude (stationary AR(1) standard deviation). Default 8 — a large
   *  shared nuisance that masks the fault in the RAW counter, removed by the instrumented path. */
  commonModeStd?: number;
  /** Per-domain common-mode AR(1) persistence ∈ [0,1]. Default 0.98 (slow, mean-reverting). Set to
   *  1 for an integrated random walk (reproduces the spurious-regression FDP pathology — see header). */
  commonModeRho?: number;
  /** Per-shard AR(1) noise scale. Default 2. */
  noise?: number;
  /** AR(1) coefficient. Default 0.5. */
  rho?: number;
  /** Per-shard level scale. Default 5. */
  level?: number;
  /** Fault step magnitude added from `faultOnset`. Default 10. */
  step?: number;
  /** Counter baseline. Default 1000. */
  base?: number;
  /** PRNG seed. Default 0xC0FFEE. */
  seed?: number;
}

export interface Telemetry {
  /** `[shard][tick]` counter matrix. */
  X: number[][];
  /** `[domain][tick]` MEASURED common-mode signals — index-aligned with `ParsedTopology.domains`. */
  factorSignals: number[][];
  /** True per-shard fault mask. */
  failed: boolean[];
  /** When `clustered`, the locality-group label the faults were concentrated in (else -1). */
  faultGroup: number;
  calLen: number;
  testLen: number;
  faultOnset: number;
}

interface Resolved {
  T: number; calLen: number; testLen: number; faultOnset: number; faultFrac: number;
  clustered: boolean; cmStd: number; cmRho: number; noise: number; rho: number; level: number;
  step: number; base: number; seed: number;
}

function resolve(p: TelemetryParams): Resolved {
  const calLen = p.calLen ?? 900;
  return {
    T: p.T ?? 1200,
    calLen,
    testLen: p.testLen ?? 300,
    faultOnset: p.faultOnset ?? calLen + 50,
    faultFrac: p.faultFrac ?? 0.05,
    clustered: p.clustered ?? false,
    cmStd: p.commonModeStd ?? 8,
    cmRho: p.commonModeRho ?? 0.98,
    noise: p.noise ?? 2,
    rho: p.rho ?? 0.5,
    level: p.level ?? 5,
    step: p.step ?? 10,
    base: p.base ?? 1000,
    seed: p.seed ?? 0xC0FFEE,
  };
}

/** Choose the failed shards: a random fleet-wide subset (`faultFrac` of the fleet),
 *  or (clustered) a SPARSE subset within the largest locality group. Clustered faults
 *  are kept sparse within the group (≤ ~3% density, the realistic "a few shards in one
 *  rack fail" case) — a dense cluster would contaminate the ESTIMATED detection-common-
 *  mode that localizeFaults builds, suppressing the very victims it should rank (the
 *  ADR 0012 contamination mechanism). The instrumented path uses MEASURED factors and
 *  is immune, so it tolerates any density. Returns the mask + group label. */
function chooseFailed(topo: ParsedTopology, r: Resolved, rng: () => number): { failed: boolean[]; faultGroup: number } {
  const failed = new Array<boolean>(topo.nShards).fill(false);
  let pool: number[];
  let faultGroup = -1;
  let nFail: number;
  if (r.clustered) {
    const byGroup = new Map<number, number[]>();
    topo.localizationGroups.forEach((g, i) => { (byGroup.get(g) ?? byGroup.set(g, []).get(g)!).push(i); });
    let best: number[] = [];
    for (const [g, members] of byGroup) if (members.length > best.length) { best = members; faultGroup = g; }
    pool = best;
    nFail = Math.max(2, Math.round(pool.length * 0.03)); // sparse within the group
  } else {
    pool = topo.shardIds.map((_, i) => i);
    nFail = Math.max(1, Math.round(topo.nShards * r.faultFrac));
  }
  // Deterministic shuffle-pick from the pool.
  const idx = pool.slice();
  for (let i = idx.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; }
  for (let k = 0; k < Math.min(nFail, idx.length); k++) failed[idx[k]] = true;
  return { failed, faultGroup };
}

/** Generate telemetry on a parsed topology. */
export function generateTelemetry(topo: ParsedTopology, params: TelemetryParams = {}): Telemetry {
  const r = resolve(params);
  const rng = mulberry32(r.seed >>> 0);

  // One measured stationary AR(1) common-mode signal per flat domain.
  const nDomains = topo.domains.length;
  const innov = r.cmStd * Math.sqrt(Math.max(0, 1 - r.cmRho * r.cmRho)) || r.cmStd; // unit-root → step scale = cmStd
  const factorSignals: number[][] = [];
  for (let d = 0; d < nDomains; d++) {
    const cm = new Array<number>(r.T).fill(0);
    for (let t = 1; t < r.T; t++) cm[t] = r.cmRho * cm[t - 1] + innov * gaussian(rng);
    factorSignals.push(cm);
  }

  const { failed, faultGroup } = chooseFailed(topo, r, rng);

  // Per shard: base + Σ domain drifts + level + AR(1) noise + fault step.
  const X: number[][] = [];
  for (let i = 0; i < topo.nShards; i++) {
    const lvl = r.level * gaussian(rng);
    const member = topo.membership[i];
    const row = new Array<number>(r.T);
    let pnoise = gaussian(rng);
    for (let t = 0; t < r.T; t++) {
      pnoise = r.rho * pnoise + Math.sqrt(1 - r.rho * r.rho) * gaussian(rng);
      let cm = 0;
      for (const d of member) cm += factorSignals[d][t];
      row[t] = r.base + cm + lvl + r.noise * pnoise + (failed[i] && t >= r.faultOnset ? r.step : 0);
    }
    X.push(row);
  }

  return { X, factorSignals, failed, faultGroup, calLen: r.calLen, testLen: r.testLen, faultOnset: r.faultOnset };
}
