# ADR 0030 — The contrast fit, the AR(1) whitener and the increment family are served by the engine

- **Date:** 2026-09-23
- **Status:** ACCEPTED — the three modules became re-exports; every caller path and every citation
  is unchanged; the full suite is the evidence (counts in the PR).
- **Builds on:** ADR 0019 (the contrast as Mode B's spatial null), ADR 0027 (increment-family
  coherence), ADR 0028 (the calibration monitor from the engine — the precedent this follows);
  engine ADR 0032 (the port of `tools/contrast.ts` and `tools/per-shard-whitening.ts` into
  `per-shard/contrast.ts`, with its lockstep test), engine ADR 0033 (the library boundary; this is
  its step 2 for Tessera).

## Problem

Engine ADR 0033's survey found that Tessera kept statistical modules the engine had already ported
line for line, and imported the engine's copies zero times. Two implementations of one construction
drift; the charter (`stats/engine-consumer-charter`) says the construction and its validity
accounting belong in the engine, and the contrast's validity envelope — a measured refusal, study
`2026-09-contrast-null` — already lives only there.

The survey's "seven parallel tools" was an overcount, corrected here: `calibration-monitor.ts` was
already a re-export (ADR 0028); `nuisance-robust-evalue.ts` and `bf-lifecycle.ts` are experiment
harnesses that import the engine, kept as ADR 0013/0014 records; `emitter-contract.ts` is the
validity-class gate around the engine's e-BH, Tessera policy under the charter. Three modules
duplicated engine code.

## Decision

1. `tools/contrast.ts` re-exports `median`, `madScale`, `ContrastFit`, `fitContrast`,
   `applyContrast`, `composeFit`, `fitContrastFast` from the engine's `per-shard/contrast`.
   Evidence of equivalence: the engine's `test/contrast.test.ts` lockstep against this repo's
   compiled tools, 139,800 field-by-field comparisons over 200 streams, 0 mismatches (engine
   ADR 0032, v0.6.12-pre).
2. `tools/per-shard-whitening.ts` re-exports `estimateContrastAr1 as estimateAr1`,
   `whitenContrast as whiten`, `ContrastAr1Fit as Ar1Fit`. The WHY header stays, since ADRs and
   the SPEC cite it. Evidence: the two function bodies were diffed on 2026-09-23 and are identical
   token for token (same OLS lag-1 estimator, same Kendall correction `(1 + 3φ)/n`, same ±0.95
   clip, same innovation-variance fallback).
3. `tools/mixture-evalue.ts` imports and re-exports `gInc`, `G_CAP`, `BOUND_CLIP`,
   `BOUND_LAMBDAS`, `gBounded`, `IncrementKind` from the engine's `fleet/calibration-monitor`;
   `normalizedMixtureEValue` and `geometricMixtureEValue` stay here. Evidence: constants and
   `gInc` diffed identical on 2026-09-23; ADR 0028's 11,178-comparison equivalence run covered the
   monitor built on them. This closes the ADR 0027 coherence rule structurally: the monitor and
   the e-value object can no longer disagree on the increment family, because there is one copy.

## Not done, and why

- `normalizedMixtureEValue` / `geometricMixtureEValue` are not in the engine. They are the default
  per-shard e-value object for fleet e-BH (ADR 0019), which is engine-shaped under the charter;
  promoting them is an engine ADR with its own H0 battery, not a shim. Registered as a follow-up
  on knowledge WORKLIST C83.
- `emitter-contract.ts` still calls the ungated `eBenjaminiHochberg`. The engine's guarded entry
  point keys on detector envelopes; this gate keys on emitter validity classes — a different axis.
  Whether the emitter contract should map classes onto envelopes and route through
  `eBenjaminiHochbergGuarded` is a design question, left open on C83.
- The engine's lockstep test now compares the engine to itself through these shims and is
  retired engine-side in a separate PR.

## Reversal

Restore the three files from `git show 4126bfe:tools/<name>.ts`. No caller changes either way.
