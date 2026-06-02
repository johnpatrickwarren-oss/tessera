// tools/_build-canned-demos-core.ts — math primitives, detector-family derivations,
// JSON composition, and the shared Family-A per-window builder.
// VERBATIM from tools/build-canned-demos.ts (no computation changes).

import { peakACF } from '@johnpatrickwarren-oss/deploysignal-engine/detectors/spectral';

import type {
  ScenarioName,
  ScenarioJson,
  WindowEntry,
  PerWindowDetectors,
  FamilyBCDEWindowDetectors,
  ThresholdCrossingEntry,
  ProvenanceReceipt,
  TerminalState,
  CommonModeCandidate,
} from './_build-canned-demos-types.js';

// Terminal common-mode candidate mapping shared by the topology scenarios.
// Extracted VERBATIM from the `.map(c => ({ ... }))` block repeated in
// common-mode-rack / sparse-data-resilience / topology-spanning-common-mode.
export function mapTerminalCandidates(
  candidates: ReadonlyArray<{
    shared_node_id: string;
    shared_node_kind: string;
    member_count: number;
    member_shard_ids: ReadonlyArray<string>;
  }>,
): CommonModeCandidate[] {
  return candidates.map(c => ({
    shared_node_id: c.shared_node_id,
    shared_node_kind: c.shared_node_kind,
    member_count: c.member_count,
    member_shard_ids: [...c.member_shard_ids].sort(),
  }));
}

export function makeLcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = ((s * 1664525) + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

export function boxMullerGaussian(rng: () => number): number {
  const u1 = Math.max(rng(), 1e-12);
  const u2 = rng();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

export function round6(x: number): number {
  return Math.round(x * 1e6) / 1e6;
}

// ── R79 helpers ──
// Constant for non-Family-A per_window_detectors (all null families).
export const NULL_PER_WINDOW_DETECTORS: PerWindowDetectors = {
  family_a: null, family_b: null, family_c: null, family_d: null, family_e: null,
};

// ── R80: Family B/C/D/E synthetic derivation helpers ──
export function deriveFamilyBState(m: number[]): FamilyBCDEWindowDetectors {
  let max_dev = 0;
  for (const v of m) {
    const d = Math.abs(v - 1);
    if (d > max_dev) max_dev = d;
  }
  return {
    statistic: round6(max_dev),
    threshold: 1.0,
    fired: max_dev > 1.0,
    derivation: 'demo-substrate proxy: max|M_t − 1| across shards (production Family B = sequential-MMD over multi-dim FAMILY_C_SIGNALS windows; not invoked here)',
  };
}

export function deriveFamilyCState(m: number[]): FamilyBCDEWindowDetectors {
  const S = m.length;
  let mean = 0;
  for (const v of m) mean += v;
  mean /= S;
  let sumsq = 0;
  for (const v of m) sumsq += (v - mean) * (v - mean);
  return {
    statistic: round6(sumsq),
    threshold: 1.0,
    fired: sumsq > 1.0,
    derivation: 'demo-substrate proxy: Σ_i (M_t,i − fleet_mean)² (production Family C = Hotelling T² + safe-test betting + RFF over FamilyCPerCell-calibrated cells; not invoked here)',
  };
}

export function deriveFamilyDState(topShardSeries: number[]): FamilyBCDEWindowDetectors {
  const result = peakACF(topShardSeries, 3, 10);
  return {
    statistic: round6(result.peak),
    threshold: 0.6,
    fired: result.peak > 0.6,
    derivation: 'real engine peakACF() over the highest-wealth shard\'s M_t series (production Family D consumes per-signal bootstrap_null_quantile from FamilyDPerSignal and targets oscillation periods 3-10 ticks)',
  };
}

export function deriveFamilyEState(m: number[]): FamilyBCDEWindowDetectors {
  const S = m.length;
  let mean = 0;
  for (const v of m) mean += v;
  mean /= S;
  let var_sum = 0;
  for (const v of m) var_sum += (v - mean) * (v - mean);
  const sigma = Math.sqrt(var_sum / S);
  const denom = Math.max(sigma, 1e-6);
  let max_z = 0;
  for (const v of m) {
    const z = Math.abs(v - mean) / denom;
    if (z > max_z) max_z = z;
  }
  return {
    statistic: round6(max_z),
    threshold: 3.0,
    fired: max_z > 3.0,
    derivation: 'demo-substrate proxy: max fleet-z-score |M_t,i − μ_fleet| / σ_fleet (production Family E = multi-dim Mahalanobis vs ConformalParams.calibration_scores; not invoked here)',
  };
}

// Scan completed windows array for first crossing per shard in Family-A scenarios.
export function computeThresholdCrossingLog(
  windows: WindowEntry[],
  threshold: number,
): ThresholdCrossingEntry[] {
  const log: ThresholdCrossingEntry[] = [];
  const crossed = new Set<string>();
  for (const w of windows) {
    for (const ps of w.per_shard) {
      if (!crossed.has(ps.shard_id) && ps.M_t !== null && ps.M_t >= threshold) {
        crossed.add(ps.shard_id);
        log.push({ window: w.t, shard_id: ps.shard_id, family: 'A', M_t_at_crossing: ps.M_t, threshold });
      }
    }
  }
  return log;
}

// Build provenance receipts for terminal-firing shards in Family-A scenarios.
export function computeProvenanceReceipts(
  scenario: string,
  firingShards: string[],
  windows: WindowEntry[],
  threshold: number,
  alpha: number,
): ProvenanceReceipt[] {
  if (!windows.length || !firingShards.length) return [];
  const terminalWindow = windows[windows.length - 1];
  return firingShards.map((shardId, i) => {
    const ps = terminalWindow.per_shard.find(p => p.shard_id === shardId);
    const terminalMt = ps?.M_t ?? threshold;
    return {
      event_id: `r79-prov-${scenario}-${i + 1}`,
      window: terminalWindow.t,
      shard_id: shardId,
      family: 'A' as const,
      reasoning: `Shard ${shardId} accumulated wealth M_t = ${terminalMt} at window ${terminalWindow.t}, crossing the 1/α = ${threshold} threshold. Under H₀, Pr(M_t ≥ 1/α) ≤ α = ${alpha} by Ville's inequality on the betting e-process martingale.`,
      evidence: { M_t: terminalMt, threshold, alpha, ville_bound: 'Pr(M_t ≥ 1/α) ≤ α under H_0' },
    };
  });
}

// ── JSON composition ──
export function composeScenarioJson(args: {
  scenario: ScenarioName;
  description: string;
  params: Record<string, unknown>;
  engine_surfaces: string[];
  windows: WindowEntry[];
  terminal_state: TerminalState;
  reasoning: string;
  suggested_actions: string[];
  detector_families?: ReadonlyArray<'A' | 'B' | 'C' | 'D' | 'E'>;
  threshold_crossing_log?: ReadonlyArray<ThresholdCrossingEntry>;
  provenance_receipts?: ReadonlyArray<ProvenanceReceipt>;
}): ScenarioJson {
  return {
    schema_version: 'tessera-demo-v1',
    scenario: args.scenario,
    description: args.description,
    params: args.params,
    engine_surfaces: [...args.engine_surfaces].sort(),
    windows: args.windows,
    terminal_state: args.terminal_state,
    reasoning: args.reasoning,
    suggested_actions: args.suggested_actions,
    detector_families: args.detector_families ?? [],
    threshold_crossing_log: args.threshold_crossing_log ?? [],
    provenance_receipts: args.provenance_receipts ?? [],
  };
}

export function serializeScenarioJson(j: ScenarioJson): string {
  return JSON.stringify(j, null, 2) + '\n';
}

// ── Shared Family-A per-window builder ──
// Extracted VERBATIM from the per-window body shared by the Family-A scenarios
// (clean-baseline, sdc-drift, fdr-multiple-testing, hierarchical-evalue).
// `states` holds the live betting states (objects with `.M`); this computes the
// top-shard ACF series and pushes one WindowEntry onto `windows`.
export function pushFamilyAWindow(args: {
  windows: WindowEntry[];
  states: ReadonlyArray<{ M: number }>;
  shardIds: string[];
  w: number;
  threshold: number;
  events: unknown[];
}): void {
  const { windows, states, shardIds, w, threshold: DEMO_THRESHOLD, events } = args;
  const firedShardsW = shardIds.filter((_, s) => states[s].M >= DEMO_THRESHOLD).sort();
  const m = states.map(st => st.M);
  const topShardIdx = m.indexOf(Math.max(...m));
  const topShardSeries: number[] = [];
  for (let prevW = 0; prevW <= w; prevW++) {
    const prev = prevW < windows.length ? windows[prevW].per_shard[topShardIdx].M_t : states[topShardIdx].M;
    if (prev !== null) topShardSeries.push(prev);
  }
  if (topShardSeries.length === 0 || topShardSeries[topShardSeries.length - 1] !== m[topShardIdx]) {
    topShardSeries.push(m[topShardIdx]);
  }
  windows.push({
    t: w,
    per_shard: states.map((st, s) => ({
      shard_id: shardIds[s],
      M_t: round6(st.M),
      fired: st.M >= DEMO_THRESHOLD,
      residual_proxy: round6(st.M - 1),
    })),
    events,
    per_window_detectors: {
      family_a: {
        shards_fired_count: firedShardsW.length,
        max_M_t: round6(Math.max(...states.map(st => st.M))),
        fired_shard_ids: firedShardsW,
      },
      family_b: deriveFamilyBState(m),
      family_c: deriveFamilyCState(m),
      family_d: deriveFamilyDState(topShardSeries),
      family_e: deriveFamilyEState(m),
    },
  });
}
