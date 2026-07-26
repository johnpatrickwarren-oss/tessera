# Tessera — Lean 4 formalisation

**Build status: NEVER COMPILED.** These files were authored in an environment with no Lean toolchain
(`leanprover.github.io` sits outside the network allowlist), so nothing here has been machine-checked.
Every proof is `sorry` with the paper argument in a comment. Treat this as a *specification of what
to prove*, with a head start on the definitions — not as a verified development.

To build:

```
cd lean && lake update && lake build
```

## Why this exists

`tools/e-value.ts` makes the e-value an opaque type whose every producer must NAME the argument it
relies on (a `Certificate`). The type cannot check those arguments — it can only stop unnamed
quantities reaching e-BH, which is what audit findings F1–F5 all did. This directory is the other
half: the queue of named arguments, one Lean theorem at a time. `LEAN_QUEUE` in `tools/e-value.ts`
holds the mapping; a certificate's `lean` field stays `undefined` until the corresponding theorem
actually builds.

## What is here

| file | content |
|---|---|
| `Tessera/EValue.lean` | `IsEValue`, closure under `min` / convex mean / countable mixture, calibrator → e-value |
| `Tessera/EBH.lean` | e-BH in sorting-free self-consistent form; the deterministic FDP lemma; FDR under arbitrary dependence; the √e−1 adjuster identity |
| `Tessera/Conformal.lean` | randomised rank exactly uniform under exchangeability; Proposition A2 (drift identity) |

## Priority order

1. **`EBH.fdp_pointwise`** — the whole of e-BH rests on it, it is deterministic and finite (no
   measure theory, no order statistics, no independence), and it is the hypothesis F1–F5 violated.
   The sorting-free `admissible`/`kStar` presentation exists specifically to make this reachable:
   the proof is `card_reject` (self-consistency, by maximality) followed by rearrangement.
2. **`EBH.fdr_le`** — linearity of expectation on top of (1).
3. **`EValue.min_isEValue`, `convexMean_isEValue`** — short, and they are the combinators the
   production code actually composes.
4. **`Conformal.rank_uniform`** — a counting argument over `S_{K+1}`; no measure theory beyond the
   pushforward.
5. **`EValue.calibrate_isEValue`** — layer-cake / stochastic-dominance argument.
6. **`Conformal.accumulator_mean`** — needs conditional expectation and disintegration; the first
   genuinely measure-theoretic item, and the one that changed the product claim.

## Statement validation (the part that IS checked)

Formalising the wrong statement is the failure mode Lean does not protect against, so each statement
was validated numerically against the **shipped** implementations before being written down:

| theorem | check | result |
|---|---|---|
| `EBH.fdp_pointwise` | 995,245 selections from the shipped engine e-BH, five adversarial input families (zeros+spikes, heavy tails, integer ties, values pinned at the threshold, log-uniform) | **0 violations; worst slack exactly 0.0** — the bound is attained, as it must be at the threshold |
| `Conformal.rank_uniform` | exhaustive over all permutations of `S_{K+1}`, K = 2,3,4, against shipped `conformalP`, jitter integrated out | `E[p] = 0.500000`, `E[p²] = 0.333333` — exactly `Unif[0,1]`, not merely super-uniform |
| `EValue.IsCalibrator` for the shipped grid | `∫f = 1` by substitution quadrature; antitonicity over 2×10⁵ points | holds; the shipped `p ≥ 1e-12` floor makes it strictly conservative |
| `EValue.min_isEValue` / `convexMean_isEValue` | Monte-Carlo on perfectly correlated inputs (worst case for a min rule) | `E[min] = 0.864 ≤ 1`, `E[mean] = 0.864 ≤ 1` |
| `Conformal.accumulator_mean` | Monte-Carlo against the shipped rank construction, Rao-Blackwellised over the jitter (the raw increment has infinite variance) | matches `Λ(T)` to 3% |

Reproduce: `test/e-value.test.ts`, `test/exchangeability-drift.test.ts`, and
`research/2026-07-26-lean-formalisation.md` § 2.

## Deliberate omissions

- **No `product(EValue[])`.** The product of e-values is an e-value only when they are sequentially
  conditional; a free-standing product over a list cannot express that and would re-create audit
  finding F5. Accumulation appears only as a supermartingale over a filtration.
- **Gap A (adaptive design validity) is not formalised.** Its hypothesis (H-EX) is a claim about the
  probe scheduler, not about mathematics; formalising it before the scheduler contract is written
  down would just relocate the assumption. See
  `research/2026-07-25-formal-statements-adaptivity-and-gating.md` § 1.
- **`Λ(T)` is formalised for completeness only.** The A2-E1b experiment showed it is true and
  operationally vacuous; the guarantee the product should carry is the first-passage rate in
  `research/2026-07-25-a2-tail-probability.md`, which is not yet formalised.
