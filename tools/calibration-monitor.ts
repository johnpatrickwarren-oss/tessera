// tools/calibration-monitor.ts — the RUNTIME CALIBRATION MONITOR, now served by the engine.
//
// Since engine v0.6.8-pre the monitor lives at `fleet/calibration-monitor` in
// @johnpatrickwarren-oss/deploysignal-engine (engine ADR 0027), ported from this file line for
// line: same increments (gInc over λ ∈ {±0.5, ±1, ±2}, cap 100; gBounded over the eight ±λ with
// clip 3), same log-space update and 1e-300 floor, same sticky revocation at log(1/alpha), same
// per-λ capital averaging for the bounded kind. Tessera ADR 0028 records the swap; the
// field-by-field equivalence run that justified it (11,178 comparisons across six option sets
// and nine residual streams, zero mismatches, engine pin v0.6.9-pre) is in that ADR.
//
// This file is a re-export so every caller path (`./calibration-monitor.js`) and every ADR that
// cites it stays valid. Scope, contract, and the caller-owns-the-null rule are unchanged and are
// documented on the engine module.
export {
  freshCalibrationMonitor,
  updateCalibration,
  updateCalibrationBatch,
  calibrationVerdict,
  applyCalibrationMonitor,
  type CalibrationMonitorOptions,
  type CalibrationMonitorState,
  type CalibrationVerdict,
} from '@johnpatrickwarren-oss/deploysignal-engine/fleet/calibration-monitor';
