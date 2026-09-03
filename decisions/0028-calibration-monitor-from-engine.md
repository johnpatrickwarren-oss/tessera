# ADR 0028 — The runtime calibration monitor is served by the engine module

- **Date:** 2026-09-03
- **Status:** ACCEPTED — implemented. `tools/calibration-monitor.ts` is a re-export of
  `@johnpatrickwarren-oss/deploysignal-engine/fleet/calibration-monitor` at pin v0.6.9-pre.
- **Builds on:** ADR 0019 #2 (the monitor), ADR 0020 (its marginal blindness), ADR 0027 (the
  `incrementKind` knob); engine ADR 0027 (the port, engine PR #73, v0.6.8-pre); knowledge
  `stats/e-betting-metrics-2026-09-02` and WORKLIST C60 item 5.

## Decision

The engine ported this monitor line for line in v0.6.8-pre so that every consumer runs the
same calibration test. Tessera now imports it instead of carrying a copy. The file path stays,
as a re-export, so the four callers (`tools/mode-b-loop.ts`, `tools/mode-b-control.ts`,
`tools/clustersynth-mode-b.ts`, `tools/serial-calibration.ts`), both test files, and every ADR
that cites `tools/calibration-monitor.ts` are untouched.

## Evidence that behaviour is identical

Two checks, both run in the worktree at this commit against the installed v0.6.9-pre dist.

1. **Field-by-field equivalence.** The old compiled module and the engine module were driven in
   lockstep: six option sets (default; α = 0.05; each `incrementKind`; α = 0.001 gaussian; a
   custom `increment`) × nine residual streams (six seeded Gaussian streams of 50–450 ticks with
   scale ∈ {0.7, 1, 1.5, 2} and one shifted by 0.8; an all-zero stream; a stream with ±1e9, ±3,
   2.999, 100; an empty stream). After every single `updateCalibration` the full state was
   compared as JSON, then the verdict, then `applyCalibrationMonitor` on both the nested-stream
   and flat paths with a contract object. **11,178 comparisons, 0 mismatches.** The script is not
   committed; it is reproducible from this description with a LCG seed of 12345.
2. **The suite.** Before: 1007 tests, 995 pass, 0 fail. After: 1007, 995, 0. The monitor's own
   tests and the serial-calibration tests: 20/20. Typecheck clean.

The helper functions the monitor uses (`gInc` with λ ∈ {±0.5, ±1, ±2} and cap 100; `gBounded`
with clip 3 over the eight ±λ) are identical in `tools/mixture-evalue.ts` and the engine module;
Tessera's emitters keep using the local copies, and the monitor now uses the engine's. Both
copies are the same code, so the ADR 0027 coherence property (the monitor tests the family the
emitter accumulates) holds exactly as before.

## What this does not change

No verdict, no default, no test. The engine module also exports an increment estimator
(`freshIncrementEstimator` and friends, a reported instrument without verdict authority); Tessera
does not adopt it here. Divergence between Tessera's local helpers and the engine's would be a
future risk only if one side edits `gInc`/`gBounded`; the engine's are covered by its own tests
and the pin is a tag, so any such edit arrives through a re-pin and this suite.
