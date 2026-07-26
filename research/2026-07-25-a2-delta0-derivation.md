# 2026-07-25 — δ₀ derived: the false-page threshold and the detection threshold are the same number

- **Artifacts:** `driftReversalClosedForm` in `tools/tail-probability.ts`; tests in
  `test/tail-probability.test.ts`. Closes open item **A2-δ₀**.
- **Result:** δ₀ is not a coincidence of the construction. It is the calibrator's **Kelly break-even
  shift** — the smallest persistent shift the detector has positive power against. Benign persistent
  heterogeneity above δ₀ and a genuine fault at δ₀ are the same event, and no procedure can separate
  them.

---

## 1. Closed form

`ψ(w) = log f(Φ(−w))` is asymptotically quadratic: the calibrator's smallest arm gives
`log f ≈ (κ_min−1)·log p`, and `log p ≈ −w²/2`, so `ψ(w) ~ (1−κ_min)·w²/2`.

Write `W = (δ+Z)/s ~ N(δ/s, 1/s²)` with `s² = 1+θ²`; then `μ(δ) = E[ψ(W)]`. Modelling `ψ` as
`β(w² − R²)/2` gives `μ(δ) = 0 ⇔ (δ/s)² + 1/s² = R²`. Eliminating `R` using the θ = 0 case
(`δ₀(0) =: a₀`, so `R² = a₀² + 1`):

> **δ₀(θ) = √( a₀² + (1 + a₀²)·θ² ),  a₀ = 0.9128**

| θ | numerically solved | closed form | error |
|---|---|---|---|
| 0 | 0.9128 | 0.9128 | 0.0% |
| 0.10 | 0.9186 | 0.9228 | 0.5% |
| 0.12 | 0.9211 | 0.9271 | 0.6% |
| 0.25 | 0.9487 | 0.9735 | 2.6% |
| 0.42 | 1.0115 | 1.0754 | 6.3% |
| 0.60 | 1.1067 | 1.2219 | 10.4% |

The residual is the quadratic model overstating ψ near the origin; it is monotone in θ and small
across the operating range. **The near-invariance observed empirically is explained: the θ-dependent
term carries the factor `(1+a₀²)/a₀² ≈ 2.2` against θ², so δ₀ moves only ~10% over θ ∈ [0, 0.5].**

## 2. What δ₀ actually is

`μ(δ) = E[log f(p) | δ]` is the **log-growth rate of the e-process** — the Kelly criterion for the
betting interpretation of the calibrator. Measured (θ=0, K=30):

| δ | μ (nats/round) | rounds to double |
|---|---|---|
| 0 | −0.5312 | never |
| 0.5 | −0.2675 | never |
| **0.913** | **+0.0002** | — (break-even) |
| 1.2 | +0.2046 | 3.4 |
| 1.5 | +0.4248 | 1.6 |
| 2.0 | +0.7772 | 0.9 |

So δ₀ is exactly where the calibrator's bet turns profitable. Below it the e-process is a losing
wager and decays; above it, it compounds.

**And a "persistent benign offset δ" and "a fault of magnitude δ" are the same input to this
detector.** Both shift a unit's score by δ relative to freshly-randomised peers; nothing in the
construction distinguishes them, because nothing *can* — the rank sees only the shift.

> **Theorem (informal).** δ₀ is simultaneously (i) the persistent offset above which a healthy unit
> will eventually page spuriously, and (ii) the minimum persistent fault magnitude the detector has
> power against. These are one number because they are one event.

## 3. The empirical check that matters

In canary-sim's units, `σ_exec = √(0.010² + 0.005²) = 0.01118` relative, so

```
δ₀ = 0.9128 · σ_exec = 1.02% degradation
```

E2 measured the rack detection floor independently, from the fault grid: **rack@1% detected 4/8,
rack@2% detected 7/8.** The floor sits between 1% and 2%.

The two numbers agree, and they were obtained from completely different directions — one from the
drift of the null accumulator, one from measured recall on injected faults. That is the strongest
corroboration in this whole line of work, and it is what makes § 2 more than an algebraic identity.

## 4. Consequences

**This is an identifiability result, not a defect.** The previous three reports read as though
persistent heterogeneity were breaking something. It isn't. The system pages on persistent shifts
above ~1% because that is what it was built to do, and it cannot be made to page on a 1% fault while
ignoring a 1% benign offset. ADR 0023 already says this qualitatively — *"a persistent unit-level
offset not in the block key is indistinguishable from a mild fault for the relative null… a semantic
boundary, not a bug"* — and § 1 puts a number on the boundary.

So there are exactly three responses, and only three:

1. **Shrink θ below δ₀** — block-key enrichment (SKU, firmware, hardware revision). Makes benign
   offsets smaller than the detection scale. This is the only response that keeps full power.
2. **Raise δ₀** — raise `κ_min`, deliberately blinding the detector below the heterogeneity scale.
   Costs exactly the power you are giving up, no more: δ₀ moves and the detection floor moves with
   it, together, always.
3. **Reclassify** — accept that "this rack has run 1% slow for two months" is an operational finding
   worth surfacing, and stop calling it a false positive. Given that E2's economics rest on rack-scale
   events at 1–5%, and that a persistent 1% rack offset is worth ~0.7 GPU-equivalents on a 72-GPU
   rack, this is defensible on its own terms.

**What is NOT available:** a statistical fix. There is no calibrator, accumulator, or threshold that
separates (i) from (ii), because they are the same event. Any proposal that claims to should be
checked against this section first.

## 5. Revised reading of the whole A2 line

| report | claim | status after this |
|---|---|---|
| A2 resolution | Λ(T) inflation, horizon T* ≈ 0.592/θ | correct for the *bound*; the bound is vacuous |
| A2 θ/τ measurement | 10/14 E1 scenarios carry no unit persistence; τ ≫ T* | unaffected, still the sharpest criticism of E1 |
| A2-E1b experiment | per-test FPR nominal at all T; paging grows only where θ>0 | unaffected — and now explained: those units crossed δ₀ |
| A2-tail | guarantee is a drift condition; ICC ≲ 9.5% | unaffected; δ₀ now has a closed form |
| **this** | δ₀ = detection floor; the effect is identifiability, not error | supersedes the framing of all four |

The engineering conclusion is much narrower than where this started: **enrich block keys until
residual persistent heterogeneity is below the fault size you care about detecting.** That is a
sentence ADR 0023 could carry, and it is falsifiable.

## 6. Threats to validity

- **a₀ = 0.9128 is specific** to the shipped κ-grid at K = 30 and the Gaussian-location block model.
  It should be recomputed for any change to the calibrator, and it is now cheap to do so.
- **The quadratic model for ψ** is asymptotic; § 1's table shows where it degrades (θ ≳ 0.4).
- **The E2 agreement is one comparison** on a simulated fault grid, not a fleet.
- **Group families are out of scope.** Everything here is the unit family; the group construction is
  studentised and EMP-CAL for separate reasons (program report § 3.1).
