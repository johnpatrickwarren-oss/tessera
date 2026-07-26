# 2026-07-25 — A2-tail: the guarantee is a drift condition, and the design target was 36× too strict

- **Artifacts:** `tools/tail-probability.ts`; tests `test/tail-probability.test.ts` (7);
  `runs/2026-07-25-a2/tail.json`. Reproduce: `pnpm build && node tools/tail-probability.js`.
- **Closes:** open item **A2-tail** from `research/2026-07-25-a2-e1b-horizon-experiment.md` § 7.
- **Supersedes:** the `α·Λ(T)` framing in `research/2026-07-25-conjecture-a2-resolution.md`, and the
  "ICC ≲ 0.25%" design target in that report's § 2.

---

## 1. The right object

Conditional on a unit's persistent offset δ, the calibrated increments are i.i.d., so `log M_t` is a
**random walk with drift** `μ(δ) = E[log f(p)|δ]` and variance `σ²(δ)`. Paging at `e ≥ 1/α` is that
walk crossing `b = log(1/α)`. This is a first-passage problem, and it behaves nothing like the mean:

- `μ(δ) < 0` — the typical unit. This is the fixed-split dilution (`E[log f(U)] < 0`), the same
  effect the ADR 0023 correction is about. The walk drifts **away** from the threshold; crossing is
  exponentially unlikely and *more* unlikely the longer you wait relative to the barrier.
- `μ(δ) > 0` — the walk drifts **toward** it and crossing becomes certain given enough rounds.

So the fleet rate is governed by the **fraction of units whose drift has turned positive** — a
bounded, estimable quantity — not by an unbounded moment. That is precisely why the realised rate
degrades gracefully while `Λ` explodes.

### 1.1 Lundberg exponent — the per-unit statement

Let `κ(δ) > 0` solve `E[f(p)^κ | δ] = 1`. Since `Φ_δ(κ) = E[f^κ|δ]` is convex with `Φ_δ(0)=1` and
`Φ_δ(1) = g(δ)`:

| | κ | anytime page probability |
|---|---|---|
| `g(δ) < 1` (most units) | > 1 | `≈ α^κ` **< α** — conservative |
| `g(δ) = 1` | = 1 | `≈ α` — Ville exactly tight |
| `g(δ) > 1` | < 1 | `≈ α^κ` **> α**, but **≤ 1** |

**`α^κ ≤ 1` is the whole difference from `α·Λ`, which is unbounded.** A unit's page probability can
never exceed 1 however heterogeneous the fleet; the previous bound had forgotten that, which is the
entire source of the 10⁶ over-statement.

## 2. The invariant worth remembering

Define **δ₀, the drift-reversal offset**: the persistent offset at which `μ(δ)` changes sign.

| θ | 0 | 0.12 | 0.25 | 0.42 |
|---|---|---|---|---|
| **δ₀** | 0.913 | 0.921 | ~0.95 | 1.011 |

**δ₀ ≈ 1 execution-noise SD, essentially independent of θ — and of α, and of T.** Those only change
how long crossing takes, not whether it eventually happens. So:

> **A unit will eventually page spuriously if and only if its persistent offset exceeds about one
> execution-noise standard deviation. The fleet's steady-state false-page count is ≈ N·P(δ ≥ δ₀).**

That is the guarantee statement the product should carry. It is interpretable, it is a property of
the *design* rather than of a horizon, and it replaces a quantity (Λ) that cannot be measured.

## ⚠️ CORRECTION (2026-07-26) — the ICC target in § 3 is measurably too permissive

§ 3 derives **ICC ≲ 9.5%** from the steady-state condition `N·P(δ ≥ δ₀) ≤ N·α`. Direct measurement
on the newly-added unit-persistence scenarios (H15–H17, `canary-sim.ts`; A/A, N=2016, K=30,
α=10⁻³, Ville budget 2.016 pages/run) says otherwise:

| scenario | ICC | pages/run at T=320 | vs budget | false e-BH selections |
|---|---|---|---|---|
| H16 | 1.0% | **0.00** | safe at every T ≤ 320 | 0.00 |
| **H15** | **9.2%** | **10.00** | **5× over** (breaches ≈ T=60) | **3.00** |
| H17 | 26.5% | 90.75 | 45× over | 63.75 |

H15 sits *at* the derived target and runs 5× over budget. The steady-state form under-counts because
it keeps only the `δ ≥ δ₀` population and drops the sub-threshold contribution — every unit below δ₀
still crosses with probability `α^{κ(δ)} > 0`, and at fleet scale that bulk term is not negligible.
(Note this misses in the opposite direction from § 4's H2 comparison, where the diffusion form
*over*-predicted 3×. The rate is a Gaussian tail composed with a first-passage probability; § 4's
warning that it is order-of-magnitude only was, if anything, understated.)

**Withdraw ICC ≲ 9.5%.** What is measured, ON THE AXIS CORRECTED BY N11 (2026-07-26 — the θ̂ estimator was biased down twice over; these figures were originally stated as 1% and 9%): **ICC ≲ 1.5% is safe** to T=320, 12.4% is not. The true
boundary lies between and needs a sweep — added as A2-icc below. Design against **δ₀** (§ 2), which
is stable and was not affected by this correction.

**Second finding:** H15 is the first cell in which **false e-BH selections appear at all** (3.00 at
T=320; H17 reaches 63.75). This refines P8 — per-family FDR is markedly more robust than paging, but
it is not immune; it breaks later and at higher heterogeneity, not never.

## 3. The design target was 36× too strict

The fleet rate `N·P(δ ≥ δ₀)` with `δ ~ N(0,θ²)` and `δ₀ ≈ 1` stays inside the Ville budget `N·α`
when `1 − Φ(1/θ) ≤ α`. At `α = 10⁻³` that is `1/θ ≥ 3.09`, i.e.

```
θ ≤ 0.32        ⇔        ICC ≲ 9.5%
```

The conjecture-resolution report demanded **ICC ≲ 0.25%** for a month of horizon. That target came
from the loose Λ bound and is wrong by a factor of ~36 in the permissive direction. Re-reading the
measured scenarios against the corrected target:

| scenario | ICC | vs corrected target (9.5%) |
|---|---|---|
| H12 hidden-stratum | 1.4% | **inside** |
| H8 heteroskedastic | 4.0% | **inside** |
| H14 aging | 8.1% | inside, with little margin |
| H2 rack-correlated | 11.1% | **outside** |

Only one of the four scenarios that carry unit-level persistence is actually outside the budget —
and it is the one the A2-E1b experiment measured breaching, at 3.3×. The story is consistent, and it
is far less alarming than the previous report.

## 4. Accuracy: right structure, order-of-magnitude rate

Predicted vs measured (N=2016, K=30, α=10⁻³, A2-E1b substrate):

| | T=10 | T=40 | T=80 | T=160 | T=320 |
|---|---|---|---|---|---|
| H2 predicted pages/run | 0.20 | 6.88 | 12.87 | 17.69 | 20.78 |
| **H2 measured** | **0.25** | **0.50** | **1.75** | **3.50** | **6.75** |
| H1 predicted / measured | 0.00 / 0.00 | 0.00 / 0.00 | 0.00 / 0.00 | 0.00 / 0.00 | 0.00 / 0.00 |
| old α·Λ bound | 2016 | 2016 | 2016 | 2016 | 2016 |

- The iid control is predicted exactly (0.00 everywhere, at every horizon out to 1280).
- Short horizon is good: 0.20 predicted vs 0.25 measured at T=10.
- Long horizon **over-predicts by ~3×**: the diffusion approximation reaches the barrier sooner than
  the real (right-skewed, discretely-monitored) walk. Two corrections are already applied — the ½ in
  the ½/½ accumulator (`b = log(2/α)`) and the Broadie–Glasserman–Kou discrete-monitoring shift
  (`+0.5826σ`) — and they fixed the short-T cell; the residual gap is in the crossing-*time* profile.
- The old bound is **10²–10⁸× looser** and saturates at N in every cell, i.e. it carries no
  information at all.

**Why the rate should not be over-trusted:** it is `N·P(δ ≥ δ₀)`, a Gaussian tail, so a 20% error in
`δ₀/θ` moves it by ~3×. `δ₀` itself is stable (§ 2) and `θ` is estimable; the *rate* is the fragile
composition of the two. Use δ₀ as the design criterion and the rate as an order of magnitude.

A long-horizon check (H2, N=1008, T ∈ {160, 320, 640, 1280}) shows the measured count saturating by
T≈320 and flat thereafter, consistent with a fixed at-risk population rather than unbounded growth —
which is the qualitative claim of § 1. The absolute counts at that fleet size are too small
(1.0 pages/run over 2 seeds) to sharpen the calibration.

## 5. What this changes

| previous statement | corrected |
|---|---|
| `FDR ≤ q·Λ(T)`, Λ → 10⁶ | true but vacuous; the bound saturates. Use `N·P(δ ≥ δ₀)` for paging |
| "ICC ≲ 0.25% for a month of horizon" | **ICC ≲ 9.5%** for the paging budget at α=10⁻³ |
| `T* ≈ 0.592/θ` as *the* horizon | that is the horizon at which the BOUND doubles; operationally there is no horizon, there is a δ₀ threshold |
| the guarantee is horizon-limited | the guarantee is **drift-limited**: safe iff δ < δ₀, at any horizon |

The mitigations from the resolution report survive with different weights. Block-key enrichment is
still first (it directly shrinks θ). Raising `κ_min` still helps and now has a cleaner reading: it
raises `δ₀`. Capping block size still helps. **Rotating accumulators every T\* rounds is no longer
indicated** — it was a response to the Λ framing, and since the at-risk population is fixed rather
than growing, rotation would reset the healthy majority's protective negative drift for nothing.

## 6. Threats to validity

- **Diffusion approximation.** Two moments of a right-skewed increment; the residual 3× at long T
  lives here. A saddle-point or exact-Lundberg finite-T treatment would tighten it.
- **δ₀ ≈ 1σ_exec is measured on the Gaussian-location block model** at K=30 and the shipped κ-grid.
  Its near-invariance across θ is a strong hint it is structural, but it has not been derived.
- **Everything downstream of θ.** Real-fleet θ still needs the probe pilot; the ICC ≲ 9.5% target is
  only useful once someone measures the left-hand side.
- **Paging only.** § 3 of the E1b report showed per-family e-BH is far more robust (zero false
  selections in every cell). This analysis says nothing new about the FDR surface.

## 7. Open items

| id | item | priority |
|---|---|---|
| A2-δ₀ | derive δ₀ ≈ 1σ_exec analytically — if it is structural it is the single number the design turns on | **high** |
| A2-θ-real | unchanged: measure θ on real probe scores | **high** |
| A2-doc | propagate the corrected ICC target into ADR 0023 and the program report | high |
| A2-time | saddle-point finite-T crossing profile to remove the residual 3× | medium |
| A2-N | confirm the FDR surface stays clean at N = 10k/100k | medium |
