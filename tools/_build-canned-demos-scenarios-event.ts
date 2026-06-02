// tools/_build-canned-demos-scenarios-event.ts — event-conditional freeze-hook scenario.
// VERBATIM scenario body from tools/build-canned-demos.ts (no computation changes);
// the freeze-hook + residual setup is factored into a contiguous setup helper.

import { DsEventConsumer } from '@johnpatrickwarren-oss/deploysignal-engine/ds-integration/event-consumer';
import { createFreezeHookFromDsEvents }
  from '@johnpatrickwarren-oss/deploysignal-engine/ds-integration/freeze-hook-factory';
import { initialPerShardResidual } from '@johnpatrickwarren-oss/deploysignal-engine/per-shard/warm-start';
import type { ExtendedSampleObservation } from '@johnpatrickwarren-oss/deploysignal-engine/per-shard/runtime';
import type { DeployEventPayload } from '@johnpatrickwarren-oss/deploysignal-engine/ds-integration/event-contract';

import type { ScenarioJson, WindowEntry } from './_build-canned-demos-types.js';
import { SCENARIO_SEEDS } from './_build-canned-demos-types.js';
import {
  NULL_PER_WINDOW_DETECTORS,
  composeScenarioJson,
} from './_build-canned-demos-core.js';

interface EventConditionalSetup {
  consumer: DsEventConsumer;
  activator: ReturnType<typeof createFreezeHookFromDsEvents>;
  payload: DeployEventPayload;
  residual: ReturnType<typeof initialPerShardResidual>;
  obs: ExtendedSampleObservation;
}
function eventConditionalSetup(): EventConditionalSetup {
  const consumer = new DsEventConsumer({ port: 0 });
  const noopTimeout = (_cb: () => void, _ms: number): unknown => null;
  const noopClear = (_h: unknown): void => { /* no-op */ };
  const fixedNow = () => 1_700_000_200;

  const activator = createFreezeHookFromDsEvents({
    consumer,
    config: { freeze_hook_enabled: true },
    activation_window_seconds: 300,
    setTimeout: noopTimeout,
    clearTimeout: noopClear,
    now: fixedNow,
  });

  const payload: DeployEventPayload = {
    event_id: 'evt-demo-firmware-push',
    event_class: 'firmware_push',
    event_ts: 1_700_000_180,
  };

  const residual = initialPerShardResidual();
  const obs: ExtendedSampleObservation = {
    observedAt: 1_700_000_190_000,
    residualSeedHash: 'demo-seed-hash',
    sampleVector: [0.5, 0.4, 0.3],
  };

  return { consumer, activator, payload, residual, obs };
}

// ── Scenario 4: event-conditional ──
export function runEventConditionalRecording(): ScenarioJson {
  const WINDOW_COUNT = 5;
  const EVENT_WINDOW = 2;

  const { consumer, activator, payload, residual, obs } = eventConditionalSetup();

  const windows: WindowEntry[] = [];

  for (let w = 0; w < WINDOW_COUNT; w++) {
    const windowEvents: unknown[] = [];

    if (w === EVENT_WINDOW) {
      consumer.emit('activate', payload);
      windowEvents.push({
        type: 'ds_event_received',
        event_id: payload.event_id,
        event_class: payload.event_class,
        event_ts: payload.event_ts,
      });
    }

    const stateSnapshot = activator.getState();

    if (w === EVENT_WINDOW + 1) {
      const result = activator.update(residual, obs, undefined);
      const frozen = result === residual;
      windowEvents.push({
        type: 'residual_update',
        freeze_active: stateSnapshot.active,
        absorbed: !frozen,
      });
    }

    windows.push({
      t: w,
      per_shard: [{ shard_id: 'shard-00', M_t: null, fired: false, residual_proxy: null }],
      events: windowEvents,
      per_window_detectors: NULL_PER_WINDOW_DETECTORS,
    });
  }

  const finalState = activator.getState();
  activator.dispose();

  return composeScenarioJson({
    scenario: 'event-conditional',
    description: 'DS firmware-push event emitted at window 2. Freeze-hook activates; per-shard residual update at window 3 returns current residual unchanged (absorbed=false). Demonstrates event-conditional attribution suppression.',
    params: {
      seed: SCENARIO_SEEDS['event-conditional'],
      shard_count: 1,
      window_count: WINDOW_COUNT,
      event_window: EVENT_WINDOW,
      event_class: 'firmware_push',
      activation_window_seconds: 300,
    },
    engine_surfaces: ['createFreezeHookFromDsEvents', 'initialPerShardResidual'],
    windows,
    terminal_state: {
      firing_shards: [],
      common_mode_candidates: [],
      freeze_active: finalState.active,
      fdr_selected_indices: null,
      fdr_qLevel: null,
      fdr_K: null,
      fleet_fired: null,
      fleet_tick_at_first_fire: null,
    },
    reasoning: 'Tessera receives a DS firmware-push event before the per-shard sample is processed. The freeze-hook activates; the residual update path returns the current residual unchanged (no event-driven drift absorbed). Downstream detectors see the pre-event baseline; once the activation window expires, the residual resumes updating normally.',
    suggested_actions: [
      'No immediate action — event-conditional attribution is suppressing this drift by design',
      'Verify the deploy event window matches the observed drift envelope (sanity check)',
      'If the freeze window proves too short / too long under live load, tune activation_window_seconds at the freeze-hook factory',
    ],
    detector_families: [],
    threshold_crossing_log: [],
    provenance_receipts: [],
  });
}
