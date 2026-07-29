# 2026-07-28 — O2-fit measured: the ε-tax prices robustness out of the δ₀ band; plain Catoni is the free win

- **Artifacts:** `tools/o2-robust-eprocess.ts` (exact Wang–Ramdas Lemma-3 implementation +
  three-question harness), `test/o2-robust-eprocess.test.ts` (3 — the φ sandwich, the
  supermartingale mean ≤ 1 under adversarial within-ε contamination, and the mis-specification
  leak locked as a POSITIVE assertion: under-assumed ε MUST break the bound, else the premise
  is decorative). Readout: `runs/2026-07-28-a2-disp-ebh-scale/o2-fit.json`
  (T = 2000, α = 0.01, 400 seeds/cell). Reproduce:
  `pnpm build && node tools/o2-robust-eprocess.js --seeds 400`.
- **Closes:** the O2-fit measurement program opened by the same-day disposition note. O2's
  registry row moves from "constructions exist, fit unmeasured" to the three answers below.

## The construction (implemented exactly)

Robust Catoni supermartingale (arXiv:2301.09573 Lemma 3): increments
`exp(φ(λx)) / (1 + λ²σ²/2 + 1.5ε)` with Catoni's log-influence φ (|φ| ≤ log 2) — a nonnegative
supermartingale under ANY law within TV-radius ε of a clean law with mean 0 and variance ≤ σ².
ε = 0 recovers plain (non-robust) Catoni. Arms: robust at ε_assumed ∈ {0.01, 0.05, 0.1}
(width-optimal λ = 0.5√ε), plain Catoni (λ = 0.25), and the naive Gaussian mixture bet over the
e-detector's λ grid.

## F1 — validity: impeccable where assumed, and the premise has teeth

| null stream | robust(.1) | robust(.05) | robust(.01) | catoni(0) | gaussMix |
|---|---|---|---|---|---|
| clean N(0,1) | 0.0 % | 0.0 % | 0.0 % | 0.8 % | 0.8 % |
| t₃ (unit var) | 0.0 % | 0.0 % | 0.0 % | 0.3 % | **5.3 %** |
| 1 % +10σ contamination | 0.0 % | 0.0 % | 0.0 % | 2.8 % | **96.8 %** |
| 5 % +10σ contamination | 0.0 % | 0.0 % | **99.0 %** | **85.5 %** | **100 %** |

(Ville crossing rates at α = 1 %.) Correctly-specified robust arms never leak, including on
contaminated nulls. The mis-specification cliff is real and measured twice: ε_assumed = 0.01
against ε_true = 0.05 fires 99 % (and the unit test locks E[increment] > 1 under under-assumed
ε). The naive Gaussian bet leaks even on plain heavy tails — the ADR 0009/0010 explosion
mechanism, reproduced in one line.

## F2 — power: the ε-tax has a closed form and it excludes the δ₀ band

The denominator charges log(1 + 1.5ε) per tick regardless of data; with the width-optimal
λ = 0.5√ε the drift goes positive only for shifts **δ ≳ 3√ε·σ**. Measured exactly on that
boundary: robust(ε = 0.01) misses δ = 0.25σ (< 0.3σ floor, 0 %) and catches δ = 0.5σ (100 % @
median t = 510); robust(ε ≥ 0.05) misses everything ≤ 0.5σ. Plain Catoni: 32 % @ δ = 0.1σ,
100 % @ 0.25σ — comparable to the Gaussian bet (19 % / 100 %) while staying valid on heavy
tails. **Conclusion: TV-ball robustness at any ε worth having (≥ 1 %) prices the construction
out of small-sustained-shift detection.** It can serve as a validity-hardened screen for
moderate/large shifts under contamination; it cannot serve the δ₀-floor program.

## F3 — the laundering trap is structural, not a tuning artifact

Same 2 % spike rate, benign (symmetric ±10σ, mean-preserving) vs fault (one-sided +10σ):

| arm | benign bursts | fault bursts |
|---|---|---|
| robust (any ε ≥ 0.01) | 0.0 % | **0.0 %** |
| catoni(0) | 1.0 % | 8.3 % |
| gaussMix | **85.5 %** | 100 % |

The robust arms cannot fire on the intermittent fault WITHOUT firing on the benign burst —
they are the same object inside a TV ball, which is the tessera-rng ADR-0051 lesson
("robust-only launders tails") now measured on this side. The Gaussian bet "detects" the fault
by being invalid on the benign twin. Plain Catoni sits between: valid on benign (1 % ≈ α),
weak-but-nonzero on the fault. **Discriminating intermittent faults from benign bursts is not a
robustness-level question — it needs structure** (sign/asymmetry-aware betting, or the
correctness channel, which is where SDC detection already lives in the canary design).

## Disposition (what changes, what doesn't)

1. **Adopt-nothing-robust for the accumulation path**: the ε-tax verdict means the robust
   Catoni does not replace anything in the δ₀-floor detection stack.
2. **Plain Catoni is the candidate increment hardening** — heavy-tail validity (0.3 % vs 5.3 %)
   at near-zero power cost vs the Gaussian bet. Where a raw-residual Gaussian bet would ship
   (serial-calibration-style monitors, non-conformal emitters), the bounded-influence increment
   is strictly the better default. Follow-up if wanted: swap-in behind the existing monitor
   interfaces + re-run their validation suites.
3. **O2 itself**: the "principled replacement for the ad-hoc Tukey center" exists and is
   implementable in 20 lines — but its honest role is contaminated-VALIDITY insurance at a
   measured 3√ε·σ power floor, not a free upgrade. The registry row should carry both numbers.
