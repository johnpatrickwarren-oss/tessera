# ADR 0032 — The mixture e-value objects come from the engine, and Mode-B FDR claims go through the engine's guard

- **Date:** 2026-09-24
- **Status:** ACCEPTED. `tools/mixture-evalue.ts` and `supAdjuster` are re-exports of engine
  v0.9.0-pre; `certifiedFdrBenjaminiHochberg` routes through `eBenjaminiHochbergGuarded` for any
  contract that names its engine envelope, and two production contracts do.
- **Builds on:** ADR 0019 (the object and the emitter contract), ADR 0025 (proof-carrying e-values),
  ADR 0027 (increment coherence), ADR 0030 (the increments went first); engine ADR 0034 (the
  promotion, with the lockstep evidence), engine ADR 0032 (the contrast null's refusal); knowledge
  `methodology/emitter-contract-and-the-engine-gate` (the options and the recommendation).

## Decision

1. `normalizedMixtureEValue`, `geometricMixtureEValue` and `GEO_RHOS` are re-exported from the
   engine's `detectors/onset-mixture-e-value`; `supAdjuster` likewise. Evidence of equivalence: the
   engine's lockstep against this repo's compiled tools, > 2,000 comparisons, 0 mismatches
   (engine ADR 0034). Every caller path and citation is unchanged.
2. `EmitterContract.engineEnvelope` names the engine construction an emitter's e-values ARE and
   the regime assertion the caller stands behind. When set, `certifiedFdrBenjaminiHochberg` routes
   through the engine's guarded e-BH, which refuses by name outside the envelope; when absent, the
   ungated path runs and `CertifiedSelection.engineGate` says `not-declared`. The two gates are
   two axes and both stay: the contract gate asks whether the residual's null is established, the
   engine gate whether the construction's E[e|H0] ≤ 1 holds in the caller's regime.
3. Contracts, decided one by one:
   - `clustersynth-mode-b/control-contrast` and `live-mode-b/*`: `onset_mixture_gaussian`, asserting
     `mMuchGreaterThanN` — the centre and scale come from a ≥ 2-month healthy contrast against a
     window of hundreds of ticks. The assertion is now a greppable line, as the guard intends.
   - `mode-b/control-contrast` (`tools/mode-b-control.ts`): **none, deliberately.** Its residual is
     PREFIX-standardised — centre and scale from the early part of the same window — so fit ≫
     horizon cannot be asserted and the engine's envelope would refuse it. That is the contrast-null
     study's finding (engine ADR 0032) applied to this arm: its FDR reading rests on ADR 0019's
     measurements, and the selection now records that no engine admission was claimed.
   - `canary/contemporaneous-rank-eprocess`: none — the engine has no envelope for the
     conformal-rank construction. Registered on knowledge C83 as the engine's next construction
     question.
   - `baseline-monitor/wall-A-certified` is Mode A and never reaches the certified path.

## Not done

- The engine H0-battery cell for `onset_mixture` (engine ADR 0034's open item).
- An engine envelope for the conformal-rank construction, without which the canary's Mode-B claim
  stays on the contract gate alone.

## Reversal

Restore the two tools from `git show 031f4ed:tools/<name>.ts`; drop `engineEnvelope` from the two
contracts. `engineGate` on the selection is additive.
