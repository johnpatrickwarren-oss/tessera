# ADR 0025 — proof-carrying e-values: make the F1–F5 bug class unrepresentable

- **Date:** 2026-07-26
- **Status:** ACCEPTED (type + gate shipped, tests green). Lean discharge (updated 2026-07-26,
  same day, later session): **EValue.lean + EBH.lean SORRY-FREE and Conformal.lean § 1 proved —
  the validity chain (exchangeability → exact rank → calibrator → e-value → e-BH → FDR ≤ q) is
  machine-checked end to end**; only Conformal § 2 (the A2 accumulation identity) remains open.
  Proving found four statement-level bugs the numerics had passed — see
  `research/2026-07-26-lean-formalisation.md` § 3.
- **Artifacts:** `tools/e-value.ts`, `certifiedFdrBenjaminiHochberg` in `tools/emitter-contract.ts`,
  `test/e-value.test.ts` (18), `lean/` (builds on Lean 4.32.1 + Mathlib v4.32.1 — see
  `lean/README.md`; "never compiled" was true when this ADR was first written, that day's earlier
  session).

## Problem

Five of the six CRITICAL findings in the 2026-07-02 math audit are **the same bug**: a quantity that
is not an e-value entered the FDR-bearing e-BH path.

| | what entered e-BH | why it is not an e-value |
|---|---|---|
| F1 | engine nuisance-robust BF | `E[BF\|H0] ≈ 1.155` at every calibration length |
| F2 | `gaussianLrEValue` | plug-in SD ⇒ null mean diverges (≈1.6e5 at cal=30) |
| F3 | `eDetector(...).peak` | the SR running max, `E[M^SR\|H0] ≈ #onsets` — **live path, reported "CERTIFIED"** |
| F4 | triad flag-then-substitute | `E[e_routed\|H0] ≤ 1` never established |
| F5 | per-cycle re-normalised mixture | cycle values are not prefixes of one e-process |

Every one type-checked, because `eBenjaminiHochberg` takes `ReadonlyArray<number>` and every real
number is a candidate e-value. ADR 0019's `validity_class` is the right idea at the weakest available
strength: a **string tag checked at runtime**, describing the *emitter*, while the actual numbers flow
past it unchecked.

## Decision

`EValue` becomes an opaque type carrying the argument that makes it one.

1. **Opaque.** Branded with an unassigned `unique symbol`, so it cannot be built by a literal, a cast,
   or structural typing — only inside `tools/e-value.ts`.
2. **Certified constructors only.** `eNormalizedMixture`, `eGeometricMixture`, `eConformalRank`,
   `eFromEngineSafeT`. Each attaches a `Certificate`: the claim stated as an inequality, an evidence
   class (`theorem` / `construction` / `empirical`), the source ADR or arXiv id, the **unchecked
   premises**, and a `lean` field naming a machine-checked theorem once one exists.
3. **Small, true combinator set.** `eMin` (ADR 0022 min rule), `eConvexMean` (weights must sum to
   ≤ 1 — above 1 is the N3 rescaling error and is refused), `eSupAdjusted`. Derivations inherit the
   **weakest** input's evidence class.
4. **No free-standing product.** The product of e-values is an e-value only when they are
   sequentially conditional, which an array cannot express — offering one would re-create F5.
   Accumulation has exactly one entry point: the stateful `EProcess` (the ADR 0023 ½/½ accumulator),
   whose `skip()` localises the Gap C obligation that abstention be decided at the design stage.
5. **The gate.** `certifiedFdrBenjaminiHochberg` takes `readonly EValue[]` and additionally checks
   that every input's evidence class meets what the emitter's `validityClass` claims — a
   `theorem_valid` emitter fed `construction`-class numbers now throws. It returns the certificate
   chain and the de-duplicated open premises, so Gap A's `(H-EX)` hypothesis and the measured E4
   violation print next to every Mode-B selection.
6. **Loud escape hatch.** `unsafeEValue` requires a substantive justification and
   `CS_ALLOW_UNVALIDATED=1`, and is permanently `empirical`-class so it taints downstream.

`fdrBenjaminiHochberg` is retained unchanged; migration is per-call-site.

## Consequence

**F3 is now a compile error**, as are p-values, plug-in LR values, and forged objects with the right
shape — asserted with `@ts-expect-error`, which fails the build if the error does *not* occur.

## Migration (2026-07-26) and the gate that keeps it

All FDR-bearing call sites now route through `certifiedFdrBenjaminiHochberg`, each with the
certificate matching its real provenance:

| call site | provenance | certificate |
|---|---|---|
| `canary-sim` (6 topology families) | ½/½ accumulator, or √E−1 on its running max | `HALF_HALF_ACCUMULATOR`, derived through `SUP_ADJUSTED` when `supFdrAdjust` |
| `canary-crosscheck` (shard + rack) | `combinedEValue` | `HALF_HALF_ACCUMULATOR` |
| `clustersynth-mode-b` (in-memory) | `normalizedMixtureEValue`, triad min applied upstream | `NORMALIZED_MIXTURE` |
| `clustersynth-mode-b` (streaming) | as above, min rule now via the `eMin` combinator | `MIN_RULE ← NORMALIZED_MIXTURE` |
| `mode-b-control` | `normalizedMixtureEValue` | `NORMALIZED_MIXTURE` |
| `mode-b-loop` | `geometricMixtureEValue` — the horizon-independent object F5 requires | `GEOMETRIC_MIXTURE` |

A hand survey found two of these. The remaining three were found by the gate, which is the argument
for the gate: **`certified-fdr-path`** (`invariants.json`, `forbid_path` over `tools/`, ratchet)
blocks any new caller of the raw number-array form. `emitter-contract.ts` defines both and carries an
`anchor:allow certified-fdr-path` suppression; the raw function is marked `@deprecated`.

**Numerically transparent, and tested as such.** These call sites carry published figures (E1–E5,
mode-b FDP/recall), so moving a number to satisfy a type would have been the wrong trade. The only
arithmetic introduced is provably identity — `supAdjuster(v) = v>1 ? √v−1 : 0` is bit-equal to the
previous `max(√v−1, 0)` for `v ≥ 0`, and `eMin` is `Math.min`. Asserted with `Object.is` over
1.2M comparisons plus the clamp boundaries at `v = 1`. Full suite: 923 tests, 0 failures; gate clean
(`certified-fdr-path: 0`, baseline 6).

## What this does NOT do

A certificate is a **citation, not a proof**. The type forces every e-value entering e-BH to name the
argument it relies on and propagates the weakest link; it cannot check the argument. That is the
`lean/` queue's job, and today every entry is `sorry` — there is no Lean toolchain in the authoring
environment. `LEAN_QUEUE` in `tools/e-value.ts` holds the mapping and records how each *statement*
was validated in the meantime, which is the part that protects against formalising the wrong thing:

- e-BH FDP lemma — **995,245 selections from the shipped engine across five adversarial families;
  0 violations, worst slack exactly 0.0** (the bound is attained, as it must be at the threshold).
- rank uniformity — **exhaustive over `S_{K+1}` for K=2,3,4** vs shipped `conformalP`:
  `E[p]=0.500000`, `E[p²]=0.333333`, i.e. exactly `Unif[0,1]`.

A certificate's `lean` field stays `undefined` until its theorem actually builds.

## Alternatives rejected

- **Strengthen the runtime tag.** Does not help: F1–F5 all had honest-looking tags; the *numbers*
  were wrong, and no emitter-level string sees them.
- **Change the engine's `eBenjaminiHochberg` signature.** The engine is a separate repo consumed at a
  pin; Tessera wraps it instead, which also keeps the vendoring policy intact.
- **Boxed values everywhere including per-tick accumulation.** Rejected on allocation cost — the
  accumulator keeps raw internals and only produces an `EValue` at the e-BH boundary, which is where
  provenance is needed.
