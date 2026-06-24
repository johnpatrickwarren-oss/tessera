# ADR 0017 — the nuisance-robust evidence stack is promoted to the engine; tools/* become thin harnesses

- **Date:** 2026-06-24
- **Status:** Accepted (cold-eye SHIP — migration is behaviour-preserving; full suite 616/0/10 unchanged)
- **Builds on:** ADR 0013 (nuisance-robust BF e-value), ADR 0015 (contamination-robust fleet common-mode),
  ADR 0016 (benign-change vs fault discriminator), ADR 0011 (epoch-level lifecycle re-record), and the
  engine/consumer charter (deploysignal-engine ADR 0004).

## Context

ADRs 0013/0015/0016/0011 validated, in Tessera, the four primitives that close the per-shard and
fleet FP/FDR story: a *valid* nuisance-robust e-value, a contamination-robust common-mode, a
distributional-signature detector, and an epoch-level baseline-lifecycle trigger. Per the
engine/consumer charter (engine ADR 0004), anything that *constructs/maintains a baseline or detects
significant deviation from it, with its validity accounting* belongs in the shared engine; only the
domain data-plane and policy stay in the consumer. These four were all engine-shaped, built in Tessera
to be promoted once proven.

## Decision

The stack was promoted into `deploysignal-engine` as PRs A–E and released as **v0.4.0-pre**:

| engine surface | Tessera origin |
|---|---|
| `detectors/nuisance-robust-bf-e-value.ts` (`nuisanceRobustBFEValue`) | ADR 0013 |
| `fleet/common-mode.ts` (`robustLocation`, `contaminationRobustResiduals`) | ADR 0015 |
| `detectors/distributional-signature.ts` (`distributionalSignature`) | ADR 0016 |
| `per-shard/baseline-lifecycle.ts` (`updateBaselineLifecycle`) | ADR 0011 |
| `detectors/validity-envelope.ts` + `fleet/guarantee.ts` (envelopes + FDR-path gate) | the assembled guarantee's honesty accounting |

Tessera now **pins `#v0.4.0-pre`** and its `tools/{fleet-fdr,nuisance-robust-evalue,
contamination-robust-fleet,fault-discriminator,lifecycle-monitor}.ts` are **thin wrappers that delegate
to the engine** (also dropping the local `eBH` reimplementation in favour of `eBenjaminiHochberg`). The
tools keep their exported signatures (no caller churn) and their report/validation harnesses, so they
now **cross-check the engine** on Tessera's synthetic + real data rather than re-implementing the math.

## Consequences / notes

- The engine uses its native Kendall-corrected AR(1) (vs Tessera's mirror), so individual e-values
  shift slightly; the **validity properties** the reports measure (E[e|H0] ≤ 1 at all scales, FDP ≤ q,
  the trend-whitening null, the lifecycle drift/fault tradeoff) are unchanged — full suite still
  616/0/10.
- The engine BF enforces a **cal ≥ 100** floor (the plug-in-variance honesty fix from engine PR A); all
  Tessera call sites use m ≥ 150, so no behaviour change.
- The lifecycle delegation is behaviourally equivalent at the default cooldown = window (the engine
  clears its alarm window on re-record; the Tessera original relied on cooldown — equivalent there).
- The single source of truth for this math is now the engine. Future changes (e.g. the variance-robust
  NIG/t BF, multi-factor common-mode) land in the engine and flow to Tessera via the pin.
