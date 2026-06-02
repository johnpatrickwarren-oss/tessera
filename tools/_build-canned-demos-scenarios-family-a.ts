// tools/_build-canned-demos-scenarios-family-a.ts — Family-A betting-e-process scenarios.
// VERBATIM scenario bodies from tools/build-canned-demos.ts (no computation changes);
// the shared per-window push block is delegated to pushFamilyAWindow() in core.

import { freshBettingState, updateBettingState }
  from '@johnpatrickwarren-oss/deploysignal-engine/detectors/betting-e-process';
import { eBenjaminiHochberg } from '@johnpatrickwarren-oss/deploysignal-engine/fleet/e-bh';
import { combineAverage, freshFleetEProcessState, updateFleetEProcessState }
  from '@johnpatrickwarren-oss/deploysignal-engine/fleet/combine';

import type { ScenarioJson, WindowEntry } from './_build-canned-demos-types.js';
import { SCENARIO_SEEDS } from './_build-canned-demos-types.js';
import {
  makeLcg,
  boxMullerGaussian,
  round6,
  composeScenarioJson,
  computeThresholdCrossingLog,
  computeProvenanceReceipts,
  pushFamilyAWindow,
} from './_build-canned-demos-core.js';

// ── Scenario 1: clean-baseline ──
export function runCleanBaselineRecording(): ScenarioJson {
  const rng = makeLcg(SCENARIO_SEEDS['clean-baseline']);
  const SHARD_COUNT = 10;
  const WINDOW_COUNT = 30;
  const DEMO_ALPHA = 5e-3;
  const DEMO_THRESHOLD = 1 / DEMO_ALPHA;
  const shardIds = Array.from({ length: SHARD_COUNT }, (_, i) => `shard-${String(i).padStart(2, '0')}`);
  const states = shardIds.map(() => freshBettingState());
  const windows: WindowEntry[] = [];

  for (let w = 0; w < WINDOW_COUNT; w++) {
    for (let s = 0; s < SHARD_COUNT; s++) {
      const draw = boxMullerGaussian(rng);
      updateBettingState(states[s], draw, 0, 1, DEMO_ALPHA);
    }
    pushFamilyAWindow({ windows, states, shardIds, w, threshold: DEMO_THRESHOLD, events: [] });
  }

  const firingShards = shardIds.filter((_, s) => states[s].M >= DEMO_THRESHOLD).sort();

  return composeScenarioJson({
    scenario: 'clean-baseline',
    description: 'Healthy NVIDIA NVLink fleet — no drift injected. Family A betting e-process stays in baseline across all 10 shards × 30 windows.',
    params: {
      seed: SCENARIO_SEEDS['clean-baseline'],
      shard_count: SHARD_COUNT,
      window_count: WINDOW_COUNT,
      alpha: DEMO_ALPHA,
      threshold: DEMO_THRESHOLD,
    },
    engine_surfaces: ['freshBettingState', 'updateBettingState'],
    windows,
    terminal_state: {
      firing_shards: firingShards,
      common_mode_candidates: [],
      freeze_active: false,
      fdr_selected_indices: null,
      fdr_qLevel: null,
      fdr_K: null,
      fleet_fired: null,
      fleet_tick_at_first_fire: null,
    },
    reasoning: 'Under H₀ (no drift), the betting e-process is a martingale; wealth M_t fluctuates around 1.0 without crossing the 1/α = 200 threshold over any 30-window window. This scenario demonstrates no-false-positives on a healthy fleet.',
    suggested_actions: [],
    detector_families: ['A', 'B', 'C', 'D', 'E'],
    threshold_crossing_log: computeThresholdCrossingLog(windows, DEMO_THRESHOLD),
    provenance_receipts: computeProvenanceReceipts('clean-baseline', firingShards, windows, DEMO_THRESHOLD, DEMO_ALPHA),
  });
}

// ── Scenario 2: sdc-drift ──
export function runSdcDriftRecording(): ScenarioJson {
  const rng = makeLcg(SCENARIO_SEEDS['sdc-drift']);
  const SHARD_COUNT = 10;
  const WINDOW_COUNT = 30;
  const DEMO_ALPHA = 5e-3;
  const DEMO_THRESHOLD = 1 / DEMO_ALPHA;
  const SDC_SHARD = 4;
  const SDC_START = 6;
  const SDC_DRIFT = 0.4;
  const shardIds = Array.from({ length: SHARD_COUNT }, (_, i) => `shard-${String(i).padStart(2, '0')}`);
  const states = shardIds.map(() => freshBettingState());
  const windows: WindowEntry[] = [];
  let thresholdCrossedAtWindow: number | null = null;

  for (let w = 0; w < WINDOW_COUNT; w++) {
    for (let s = 0; s < SHARD_COUNT; s++) {
      let draw = boxMullerGaussian(rng);
      if (s === SDC_SHARD && w >= SDC_START) {
        draw += SDC_DRIFT * (w - SDC_START + 1);
      }
      updateBettingState(states[s], draw, 0, 1, DEMO_ALPHA);
    }
    if (thresholdCrossedAtWindow === null && states[SDC_SHARD].M >= DEMO_THRESHOLD) {
      thresholdCrossedAtWindow = w;
    }
    const crossingEvent = thresholdCrossedAtWindow === w
      ? [{ type: 'threshold_crossed', shard_id: shardIds[SDC_SHARD], window: w, M_t: round6(states[SDC_SHARD].M) }]
      : [];
    pushFamilyAWindow({ windows, states, shardIds, w, threshold: DEMO_THRESHOLD, events: crossingEvent });
  }

  const firingShards = shardIds.filter((_, s) => states[s].M >= DEMO_THRESHOLD).sort();

  return composeScenarioJson({
    scenario: 'sdc-drift',
    description: `Synthetic SDC drift injected on shard-04 from window ${SDC_START} onward as an additive mean shift growing linearly (+${SDC_DRIFT}/window). Family A wealth accumulates on shard-04 and crosses the 1/α = ${DEMO_THRESHOLD} threshold.`,
    params: {
      seed: SCENARIO_SEEDS['sdc-drift'],
      shard_count: SHARD_COUNT,
      window_count: WINDOW_COUNT,
      alpha: DEMO_ALPHA,
      threshold: DEMO_THRESHOLD,
      sdc_target_shard: shardIds[SDC_SHARD],
      sdc_drift_start_window: SDC_START,
      sdc_drift_per_window: SDC_DRIFT,
    },
    engine_surfaces: ['freshBettingState', 'updateBettingState'],
    windows,
    terminal_state: {
      firing_shards: firingShards,
      common_mode_candidates: [],
      freeze_active: false,
      fdr_selected_indices: null,
      fdr_qLevel: null,
      fdr_K: null,
      fleet_fired: null,
      fleet_tick_at_first_fire: null,
    },
    reasoning: "Synthetic SDC drift is injected on shard-04 from window 6 onward as an additive mean shift growing linearly. The Family A betting e-process accumulates wealth specifically on shard-04 because the GRAPA bet is data-adaptive; other shards' M_t stays bounded. Per-shard residual would, in production, surface shard-04 as the specific shard responsible; the demo's terminal_state.firing_shards reflects exactly this.",
    suggested_actions: [
      'Inspect shard-04 GPU health metrics (DCGM ECC + Xid + memory ECC)',
      'Verify the drift window timestamp against deploy / firmware audit logs',
      'Quarantine shard-04 from new workload placements pending hardware triage',
    ],
    detector_families: ['A', 'B', 'C', 'D', 'E'],
    threshold_crossing_log: computeThresholdCrossingLog(windows, DEMO_THRESHOLD),
    provenance_receipts: computeProvenanceReceipts('sdc-drift', firingShards, windows, DEMO_THRESHOLD, DEMO_ALPHA),
  });
}

// ── Scenario 5: fdr-multiple-testing ──
export function runFdrMultipleTestingRecording(): ScenarioJson {
  const rng = makeLcg(SCENARIO_SEEDS['fdr-multiple-testing']);
  const SHARD_COUNT = 10;
  const WINDOW_COUNT = 30;
  const DEMO_ALPHA = 5e-3;
  const DEMO_THRESHOLD = 1 / DEMO_ALPHA;
  const FDR_SHARDS = [2, 5, 8];
  const FDR_DRIFT_START = 4;
  const FDR_DRIFT = 0.45;
  const FDR_QLEVEL = 0.10;
  const shardIds = Array.from({ length: SHARD_COUNT }, (_, i) => `shard-${String(i).padStart(2, '0')}`);
  const states = shardIds.map(() => freshBettingState());
  const windows: WindowEntry[] = [];

  for (let w = 0; w < WINDOW_COUNT; w++) {
    for (let s = 0; s < SHARD_COUNT; s++) {
      let draw = boxMullerGaussian(rng);
      if (FDR_SHARDS.includes(s) && w >= FDR_DRIFT_START) {
        draw += FDR_DRIFT * (w - FDR_DRIFT_START + 1);
      }
      updateBettingState(states[s], draw, 0, 1, DEMO_ALPHA);
    }
    pushFamilyAWindow({ windows, states, shardIds, w, threshold: DEMO_THRESHOLD, events: [] });
  }

  const terminalEValues = states.map(st => st.M);
  const fdrResult = eBenjaminiHochberg(terminalEValues, FDR_QLEVEL);

  const firingShards = shardIds.filter((_, s) => states[s].M >= DEMO_THRESHOLD).sort();

  return composeScenarioJson({
    scenario: 'fdr-multiple-testing',
    description: `Ten shards × 30 windows. Shards 02, 05, 08 carry sustained drift +${FDR_DRIFT}/window from window ${FDR_DRIFT_START}. Terminal e-BH at q=${FDR_QLEVEL} selects the high-wealth subset under FDR control.`,
    params: {
      seed: SCENARIO_SEEDS['fdr-multiple-testing'],
      shard_count: SHARD_COUNT,
      window_count: WINDOW_COUNT,
      alpha: DEMO_ALPHA,
      threshold: DEMO_THRESHOLD,
      fdr_drift_shards: FDR_SHARDS.map(i => shardIds[i]),
      fdr_drift_start_window: FDR_DRIFT_START,
      fdr_drift_per_window: FDR_DRIFT,
      fdr_qLevel: FDR_QLEVEL,
    },
    engine_surfaces: ['eBenjaminiHochberg', 'freshBettingState', 'updateBettingState'],
    windows,
    terminal_state: {
      firing_shards: firingShards,
      common_mode_candidates: [],
      freeze_active: false,
      fdr_selected_indices: [...fdrResult.selected].sort((a, b) => a - b),
      fdr_qLevel: FDR_QLEVEL,
      fdr_K: fdrResult.K,
      fleet_fired: null,
      fleet_tick_at_first_fire: null,
    },
    reasoning: "Ten shards' per-shard e-values (terminal M_t) are submitted to the e-Benjamini-Hochberg procedure at FDR target q = 0.10. Three shards (02, 05, 08) carried sustained drift; the e-BH procedure selects the subset whose e-values satisfy k * e_(k) >= N / q under the Ren-Barber 2024 / Wang-Ramdas 2022 fixed-time guarantee. Expected falsely-flagged-shard count <= q * K -- a formal bound that holds even under correlated drift.",
    suggested_actions: [
      'Triage the e-BH-selected shards as a batch (FDR bound makes this safe at q=0.10)',
      'Do NOT inspect non-selected shards individually unless their e-value is independently interesting',
      'Adjust qLevel down (toward 0.05) for higher-precision but lower-recall flagging in production',
    ],
    detector_families: ['A', 'B', 'C', 'D', 'E'],
    threshold_crossing_log: computeThresholdCrossingLog(windows, DEMO_THRESHOLD),
    provenance_receipts: computeProvenanceReceipts('fdr-multiple-testing', firingShards, windows, DEMO_THRESHOLD, DEMO_ALPHA),
  });
}

// ── Scenario 6: hierarchical-evalue ──
export function runHierarchicalEvalueRecording(): ScenarioJson {
  const rng = makeLcg(SCENARIO_SEEDS['hierarchical-evalue']);
  const SHARD_COUNT = 5;
  const WINDOW_COUNT = 30;
  const DEMO_ALPHA = 5e-3;
  const DEMO_THRESHOLD = 1 / DEMO_ALPHA;
  const FLEET_ALPHA = 0.05;
  const LOG_FLEET_THRESHOLD = Math.log(1 / FLEET_ALPHA);
  const HIER_DRIFT_START = 5;
  const HIER_DRIFT = 0.20;
  const shardIds = Array.from({ length: SHARD_COUNT }, (_, i) => `shard-${String(i).padStart(2, '0')}`);
  const states = shardIds.map(() => freshBettingState());
  const fleetState = freshFleetEProcessState();
  const windows: WindowEntry[] = [];

  for (let w = 0; w < WINDOW_COUNT; w++) {
    for (let s = 0; s < SHARD_COUNT; s++) {
      let draw = boxMullerGaussian(rng);
      if (w >= HIER_DRIFT_START) {
        draw += HIER_DRIFT * (w - HIER_DRIFT_START + 1);
      }
      updateBettingState(states[s], draw, 0, 1, DEMO_ALPHA);
    }

    const logEPerShard = states.map(st => Math.log(Math.max(st.M, 1e-12)));
    const combineResult = combineAverage(logEPerShard);
    updateFleetEProcessState(fleetState, combineResult.log_fleet_e, LOG_FLEET_THRESHOLD);

    pushFamilyAWindow({
      windows, states, shardIds, w, threshold: DEMO_THRESHOLD,
      events: [{
        type: 'fleet_state',
        log_fleet_e_t: round6(fleetState.log_fleet_e_t),
        log_fleet_e_max: round6(fleetState.log_fleet_e_max),
        fleet_fired: fleetState.fired,
        tick_at_first_fire: fleetState.tick_at_first_fire,
      }],
    });
  }

  const firingShards = shardIds.filter((_, s) => states[s].M >= DEMO_THRESHOLD).sort();

  return composeScenarioJson({
    scenario: 'hierarchical-evalue',
    description: `Five shards × 30 windows. All 5 shards carry small drift +${HIER_DRIFT}/window from window ${HIER_DRIFT_START}. Per-shard e-values combine via combineAverage; fleet wealth crosses log(1/α_fleet)=log(${1 / FLEET_ALPHA}) at tick_at_first_fire.`,
    params: {
      seed: SCENARIO_SEEDS['hierarchical-evalue'],
      shard_count: SHARD_COUNT,
      window_count: WINDOW_COUNT,
      alpha: DEMO_ALPHA,
      threshold: DEMO_THRESHOLD,
      fleet_alpha: FLEET_ALPHA,
      log_fleet_threshold: round6(LOG_FLEET_THRESHOLD),
      hier_drift_start_window: HIER_DRIFT_START,
      hier_drift_per_window: HIER_DRIFT,
    },
    engine_surfaces: ['combineAverage', 'freshBettingState', 'freshFleetEProcessState', 'updateBettingState', 'updateFleetEProcessState'],
    windows,
    terminal_state: {
      firing_shards: firingShards,
      common_mode_candidates: [],
      freeze_active: false,
      fdr_selected_indices: null,
      fdr_qLevel: null,
      fdr_K: null,
      fleet_fired: fleetState.fired,
      fleet_tick_at_first_fire: fleetState.tick_at_first_fire,
    },
    reasoning: 'Five shards each carry small drift (+0.20/window) too small to fire alone, but the per-shard e-values combine via combineAverage (Vovk-Wang 2021 §4 — convex combinations of e-values are e-values under arbitrary dependence). The fleet wealth crosses log(1/α_fleet) = log(20) at the captured tick_at_first_fire. This demonstrates that the fleet-level Ville bound preserves the any-time guarantee under correlated drift.',
    suggested_actions: [
      'Investigate at the fleet level (deploy / firmware / config rollout) — per-shard individual investigations will be inconclusive',
      'Cross-reference the tick_at_first_fire against deploy event audit logs for a fleet-wide cause',
      'If correlated drift cannot be ruled out, prefer combineAverage over combineProduct (the current default already does this)',
    ],
    detector_families: ['A', 'B', 'C', 'D', 'E'],
    threshold_crossing_log: computeThresholdCrossingLog(windows, DEMO_THRESHOLD),
    provenance_receipts: computeProvenanceReceipts('hierarchical-evalue', firingShards, windows, DEMO_THRESHOLD, DEMO_ALPHA),
  });
}
