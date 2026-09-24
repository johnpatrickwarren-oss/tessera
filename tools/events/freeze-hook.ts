// Returned to Tessera from the engine on 2026-09-23 (engine ADR 0033 step 4, Tessera ADR 0031; was
// adapters/events/freeze-hook.ts in @johnpatrickwarren-oss/deploysignal-engine v0.7.0-pre, and Tessera-original before
// the R90 extract). Tessera owns this file; the engine copy is deleted at its next major.
// anchor:allow require-tests: covered by test/q34-event-conditional-attribution.test.ts

// engine/events/freeze-hook.ts — Tessera Phase 2 SLICE 4 (R34) WU-06 Surface 3.
//
// Phase 1 freeze-hook activation coupling. Wraps the inherited Phase 1
// per-shard runtime composition (updatePerShardResidual at
// engine/per-shard/runtime.ts:82); when freezeState.active AND
// config.freeze_hook_enabled, returns current residual unchanged so the
// event-driven drift is NOT absorbed into per-shard residual during the
// post-event window.
//
// Tessera-original code. See Q-R34-SPEC § 0.2 for empirical-premise
// correction (no pre-engineered freeze-hook substrate existed in inherited
// Phase 1 code; this wrapper introduces the surface). Extract target:
// Tessera Phase 2 close.

import {
  updatePerShardResidual,
  type ExtendedSampleObservation,
} from '@johnpatrickwarren-oss/deploysignal-engine/per-shard/runtime';
import type { PerShardResidual, BaselineCellEntry } from '@johnpatrickwarren-oss/deploysignal-engine/types/config';

export interface FreezeHookState {
  /** True when the per-shard baseline accumulation should be paused. */
  active: boolean;
  /** Optional epoch-seconds expiry; informational only — wrapper does NOT
   *  compare to current time. Caller controls active transition. */
  until_ts?: number;
  /** Optional ClusterEvent.event_id that drove this freeze. Informational. */
  cluster_event_id?: string;
}

/** Freeze-aware wrapper around updatePerShardResidual.
 *
 *  Decision matrix:
 *    config.freeze_hook_enabled  freezeState.active  Behavior
 *    true                        true                Returns `current` unchanged (FREEZE).
 *    true                        false               Delegates to updatePerShardResidual.
 *    false (or absent)           any                 Delegates to updatePerShardResidual.
 *
 *  Pure function: no mutation of inputs. */
export function freezeAwareUpdatePerShardResidual(
  current: PerShardResidual,
  obs: ExtendedSampleObservation,
  baselineCell: BaselineCellEntry | undefined,
  freezeState: FreezeHookState,
  config: { freeze_hook_enabled?: boolean },
): PerShardResidual {
  if (config.freeze_hook_enabled === true && freezeState.active === true) {
    return current;
  }
  return updatePerShardResidual(current, obs, baselineCell);
}
