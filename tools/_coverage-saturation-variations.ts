// tools/_coverage-saturation-variations.ts — Tessera R72 coverage saturation:
// the six per-failure-type variation runners.
//
// Split verbatim out of tools/coverage-saturation.ts (god-file refactor). No
// behavior change; pure relocation.

// ── Engine imports (.js extension; matches R70/R71 convention) ──
import { attributeCommonMode, type FiredShardEvent } from '@johnpatrickwarren-oss/deploysignal-engine/topology/common-mode-attribution';
import { DsEventConsumer } from '@johnpatrickwarren-oss/deploysignal-engine/ds-integration/event-consumer';
import { createFreezeHookFromDsEvents } from '@johnpatrickwarren-oss/deploysignal-engine/ds-integration/freeze-hook-factory';
import { initialPerShardResidual } from '@johnpatrickwarren-oss/deploysignal-engine/per-shard/warm-start';
import { eBenjaminiHochberg } from '@johnpatrickwarren-oss/deploysignal-engine/fleet/e-bh';
import { combineAverage, freshFleetEProcessState, updateFleetEProcessState } from '@johnpatrickwarren-oss/deploysignal-engine/fleet/combine';
import type { ExtendedSampleObservation } from '@johnpatrickwarren-oss/deploysignal-engine/per-shard/runtime';
import type { DeployEventPayload } from '@johnpatrickwarren-oss/deploysignal-engine/ds-integration/event-contract';

import {
  freshBettingState,
  updateBettingState,
  makeLcg,
  boxMullerGaussian,
  round6,
  SCENARIO_SEED_PREFIX,
  SHARD_COUNT_DEFAULT,
  WINDOW_COUNT_DEFAULT,
  DEMO_ALPHA,
  DEMO_THRESHOLD,
  LOG_FLEET_THRESHOLD,
  TYPE1_TARGET_SHARDS,
  TYPE1_DRIFT_TUPLES,
  TYPE2_RACK_SETS,
  TYPE2_ATTRIBUTION_WINDOWS,
  TYPE3_EVENT_CLASSES,
  TYPE3_OFFSETS,
  TYPE4_DRIFTING_COUNTS,
  TYPE4_QLEVELS,
  TYPE5_SHARD_COUNTS,
  TYPE5_DRIFT_TUPLES,
  TYPE6_FIRED_SETS,
  TYPE6_MAX_HOPS,
  build2RackTopology,
  build2RackCzTopology,
  type VariationRow,
} from './_coverage-saturation-types.js';

// ── Variation runners ──
export function runType1Variation(idx: number): VariationRow {
  const target_idx = Math.floor(idx / 5);
  const tuple_idx  = idx % 5;
  const target_shard_id = TYPE1_TARGET_SHARDS[target_idx];
  const [drift, drift_start] = TYPE1_DRIFT_TUPLES[tuple_idx];
  const rng = makeLcg(SCENARIO_SEED_PREFIX ^ idx);
  const shardIds = Array.from({ length: SHARD_COUNT_DEFAULT }, (_, i) => `shard-${String(i).padStart(2, '0')}`);
  const target_pos = shardIds.indexOf(target_shard_id);
  const states = shardIds.map(() => freshBettingState());
  let detection_window_index: number | null = null;

  for (let w = 0; w < WINDOW_COUNT_DEFAULT; w++) {
    for (let s = 0; s < SHARD_COUNT_DEFAULT; s++) {
      let x = boxMullerGaussian(rng);
      if (s === target_pos && w >= drift_start) {
        x += drift * (w - drift_start + 1);
      }
      updateBettingState(states[s], x, 0, 1, DEMO_ALPHA);
    }
    if (detection_window_index === null && states[target_pos].M >= DEMO_THRESHOLD) {
      detection_window_index = w;
    }
  }
  const firedShardIds = shardIds.filter((_, s) => states[s].M >= DEMO_THRESHOLD);
  const detected = firedShardIds.includes(target_shard_id);
  const false_positive_count = firedShardIds.filter(id => id !== target_shard_id).length;
  const attribution_correct = detected
    ? (firedShardIds.length === 1 && firedShardIds[0] === target_shard_id)
    : null;
  return {
    variation_idx: idx,
    params: { target_shard_id, drift_per_window: drift, drift_start_window: drift_start },
    observation: {
      detected,
      attribution_correct,
      detection_window_index,
      false_positive_count,
      pedagogical_property_met: null,
      raw_terminal: {
        firing_shards: firedShardIds.slice().sort(),
        target_M: round6(states[target_pos].M),
      },
    },
  };
}

export function runType2Variation(idx: number): VariationRow {
  const rack_idx = Math.floor(idx / 5);
  const win_idx  = idx % 5;
  const { target_rack, fired_set } = TYPE2_RACK_SETS[rack_idx];
  const attribution_window = TYPE2_ATTRIBUTION_WINDOWS[win_idx];
  const snapshot = build2RackTopology();
  const firedEvents: FiredShardEvent[] = fired_set.map((sid, i) => ({
    shard_node_id: sid,
    event_ts: 1_700_000_100 + i * 10,
    event_id: `evt-r72-t2-v${idx}-${i}`,
  }));
  const result = attributeCommonMode({
    fired_events: firedEvents,
    snapshot,
    opts: { now: () => 1_700_000_200 + idx },
  });
  const detected = result.candidates.length >= 1;
  const target_candidate = result.candidates.find(c => c.shared_node_id === target_rack);
  const attribution_correct = detected
    ? (target_candidate !== undefined &&
       [...target_candidate.member_shard_ids].sort().join(',') === [...fired_set].sort().join(','))
    : null;
  const false_positive_count = detected
    ? result.candidates.filter(c => c.shared_node_id !== target_rack).length
    : null;
  return {
    variation_idx: idx,
    params: { target_rack, fired_set: [...fired_set], attribution_window },
    observation: {
      detected,
      attribution_correct,
      detection_window_index: detected ? attribution_window : null,
      false_positive_count,
      pedagogical_property_met: null,
      raw_terminal: {
        candidates_count: result.candidates.length,
        candidates: result.candidates.map(c => ({
          shared_node_id: c.shared_node_id,
          shared_node_kind: c.shared_node_kind,
          member_count: c.member_count,
        })),
      },
    },
  };
}

export function runType3Variation(idx: number): VariationRow {
  const class_idx = Math.floor(idx / 5);
  const off_idx   = idx % 5;
  const event_class = TYPE3_EVENT_CLASSES[class_idx];
  const [event_offset_s, sample_offset_s] = TYPE3_OFFSETS[off_idx];
  const baseTs = 1_700_000_000;
  const consumer = new DsEventConsumer({ port: 0 });
  const noopTimeout = (_cb: () => void, _ms: number): unknown => null;
  const noopClear = (_h: unknown): void => { /* no-op */ };
  const activator = createFreezeHookFromDsEvents({
    consumer,
    config: { freeze_hook_enabled: true },
    activation_window_seconds: 300,
    setTimeout: noopTimeout,
    clearTimeout: noopClear,
    now: () => baseTs + event_offset_s,
  });
  const payload: DeployEventPayload = {
    event_id: `evt-r72-t3-v${idx}`,
    event_class,
    event_ts: baseTs + event_offset_s,
  };
  consumer.emit('activate', payload);
  const stateAfter = activator.getState();
  const detected = stateAfter.active === true;
  let attribution_correct: boolean | null = null;
  if (detected) {
    const residual = initialPerShardResidual();
    const obs: ExtendedSampleObservation = {
      observedAt: (baseTs + sample_offset_s) * 1000,
      residualSeedHash: `r72-t3-v${idx}`,
      sampleVector: [0.5, 0.4, 0.3],
    };
    const result = activator.update(residual, obs, undefined);
    attribution_correct = (result === residual);
  }
  activator.dispose();
  return {
    variation_idx: idx,
    params: { event_class, event_ts_offset_s: event_offset_s, sample_ts_offset_s: sample_offset_s },
    observation: {
      detected,
      attribution_correct,
      detection_window_index: detected ? 1 : null, // event at "window 0"; freeze observed at "window 1"
      false_positive_count: null,
      pedagogical_property_met: null,
      raw_terminal: {
        freeze_active: stateAfter.active,
      },
    },
  };
}

export function runType4Variation(idx: number): VariationRow {
  const cnt_idx = Math.floor(idx / 5);
  const q_idx   = idx % 5;
  const drifting_count = TYPE4_DRIFTING_COUNTS[cnt_idx];
  const qLevel = TYPE4_QLEVELS[q_idx];
  const rng = makeLcg(SCENARIO_SEED_PREFIX ^ (0x400 + idx)); // distinct seed namespace from type 1
  const shardIds = Array.from({ length: SHARD_COUNT_DEFAULT }, (_, i) => `shard-${String(i).padStart(2, '0')}`);
  const drifting_indices = Array.from({ length: drifting_count }, (_, i) => i);
  const drift = 0.45;
  const drift_start = 4;
  const states = shardIds.map(() => freshBettingState());
  let detection_window_index: number | null = null;
  for (let w = 0; w < WINDOW_COUNT_DEFAULT; w++) {
    for (let s = 0; s < SHARD_COUNT_DEFAULT; s++) {
      let x = boxMullerGaussian(rng);
      if (drifting_indices.includes(s) && w >= drift_start) {
        x += drift * (w - drift_start + 1);
      }
      updateBettingState(states[s], x, 0, 1, DEMO_ALPHA);
    }
    if (detection_window_index === null) {
      for (const di of drifting_indices) {
        if (states[di].M >= DEMO_THRESHOLD) { detection_window_index = w; break; }
      }
    }
  }
  const terminalEValues = states.map(st => st.M);
  const fdrResult = eBenjaminiHochberg(terminalEValues, qLevel);
  const selected_indices = [...fdrResult.selected].sort((a, b) => a - b);
  const detected = fdrResult.K >= 1;
  const false_positives = selected_indices.filter(i => !drifting_indices.includes(i));
  const attribution_correct = detected ? false_positives.length === 0 : null;
  return {
    variation_idx: idx,
    params: { drifting_shard_count: drifting_count, drifting_indices, qLevel },
    observation: {
      detected,
      attribution_correct,
      detection_window_index,
      false_positive_count: detected ? false_positives.length : null,
      pedagogical_property_met: null,
      raw_terminal: {
        fdr_K: fdrResult.K,
        fdr_selected_indices: selected_indices,
        firing_shards: shardIds.filter((_, i) => states[i].M >= DEMO_THRESHOLD),
      },
    },
  };
}

export function runType5Variation(idx: number): VariationRow {
  const cnt_idx  = Math.floor(idx / 5);
  const tuple_idx = idx % 5;
  const shard_count = TYPE5_SHARD_COUNTS[cnt_idx];
  const [drift, drift_start] = TYPE5_DRIFT_TUPLES[tuple_idx];
  const rng = makeLcg(SCENARIO_SEED_PREFIX ^ (0x800 + idx));
  const shardIds = Array.from({ length: shard_count }, (_, i) => `shard-${String(i).padStart(2, '0')}`);
  const states = shardIds.map(() => freshBettingState());
  const fleetState = freshFleetEProcessState();
  const perShardFirstFireTick: Array<number | null> = shardIds.map(() => null);
  for (let w = 0; w < WINDOW_COUNT_DEFAULT; w++) {
    for (let s = 0; s < shard_count; s++) {
      let x = boxMullerGaussian(rng);
      if (w >= drift_start) x += drift * (w - drift_start + 1);
      updateBettingState(states[s], x, 0, 1, DEMO_ALPHA);
      if (perShardFirstFireTick[s] === null && states[s].M >= DEMO_THRESHOLD) {
        perShardFirstFireTick[s] = w;
      }
    }
    const logE = states.map(st => Math.log(Math.max(st.M, 1e-12)));
    const combineResult = combineAverage(logE);
    updateFleetEProcessState(fleetState, combineResult.log_fleet_e, LOG_FLEET_THRESHOLD);
  }
  const detected = fleetState.fired === true;
  // 2026-07-02 audit F11 fix: this scenario has NO localization target (it demonstrates
  // fleet-fires-before-per-shard), so attribution is NOT MEASURED — always null. The old
  // `detected ? true : null` made the type's attribution accuracy TAUTOLOGICALLY 100%
  // (the README floor for this row was an identity, not a measurement).
  const attribution_correct = null;
  const earliest_per_shard_tick = perShardFirstFireTick
    .filter((t): t is number => t !== null)
    .reduce((m, t) => Math.min(m, t), Number.POSITIVE_INFINITY);
  const pedagogical_property_met = detected
    ? (fleetState.tick_at_first_fire !== null && fleetState.tick_at_first_fire < earliest_per_shard_tick)
    : null;
  return {
    variation_idx: idx,
    params: { shard_count, drift_per_window: drift, drift_start_window: drift_start },
    observation: {
      detected,
      attribution_correct,
      detection_window_index: fleetState.tick_at_first_fire,
      false_positive_count: null,
      pedagogical_property_met,
      raw_terminal: {
        fleet_fired: fleetState.fired,
        fleet_tick_at_first_fire: fleetState.tick_at_first_fire,
        per_shard_first_fire_tick: perShardFirstFireTick,
        earliest_per_shard_tick: earliest_per_shard_tick === Number.POSITIVE_INFINITY ? null : earliest_per_shard_tick,
      },
    },
  };
}

export function runType6Variation(idx: number): VariationRow {
  const set_idx = Math.floor(idx / 5);
  const hop_idx = idx % 5;
  const fired_set = TYPE6_FIRED_SETS[set_idx];
  const max_hop = TYPE6_MAX_HOPS[hop_idx];
  const snapshot = build2RackCzTopology();
  const firedEvents: FiredShardEvent[] = fired_set.map((sid, i) => ({
    shard_node_id: sid,
    event_ts: 1_700_000_100 + i * 10,
    event_id: `evt-r72-t6-v${idx}-${i}`,
  }));
  const result = attributeCommonMode({
    fired_events: firedEvents,
    snapshot,
    opts: { now: () => 1_700_000_200 + idx, max_hop_distance: max_hop },
  });
  const cz_candidate = result.candidates.find(c => c.shared_node_kind === 'cooling_zone' && c.shared_node_id === 'cz-1');
  const detected = cz_candidate !== undefined;
  const attribution_correct = detected
    ? (cz_candidate.member_count === fired_set.length)
    : null;
  const non_cz_count = result.candidates.filter(c => c.shared_node_kind !== 'cooling_zone').length;
  return {
    variation_idx: idx,
    params: { fired_set: [...fired_set], max_hop_distance: max_hop },
    observation: {
      detected,
      attribution_correct,
      detection_window_index: detected ? 3 : null, // fixed attribution window (cosmetic)
      false_positive_count: null,
      pedagogical_property_met: null,
      raw_terminal: {
        candidates_count: result.candidates.length,
        non_cz_candidate_count: non_cz_count,
        cz_member_count: cz_candidate?.member_count ?? null,
      },
    },
  };
}
