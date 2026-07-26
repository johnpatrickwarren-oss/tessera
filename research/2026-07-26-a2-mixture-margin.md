# 2026-07-26 — the geometric mixture buys A2 margin by raising the BARRIER, not by capping the horizon

- **Artifacts:** `tools/a2-mixture-margin.ts`; `test/a2-mixture-margin.test.ts`.
- **Question asked:** `mode-b-loop` does not use the plain accumulator — it uses
  `geometricMixtureEValue`, whose onset prior is horizon-independent. Is the hazard grid ρ therefore
  a design lever against A2, bounding the accumulation the plain product suffers?
- **Answer:** **Partly, and not by the mechanism proposed.** The prior is not a horizon cap; the
  growth rate is `m(δ)` on both paths. What the mixture does is raise the barrier the evidence walk
  must cross, which squares an already-small false-page probability *below* δ₀ and does nothing
  *above* it. **ρ is not a substitute for the δ₀ contract.**

---

## 1. The hypothesis, and why it was wrong

The proposal was that the geometric prior `w_j = ρ(1−ρ)^{j−1}` concentrates on short post-onset
windows, so the effective horizon is ~`1/(1−γ)` rather than `T`, capping `Λ`.

Unrolling the shipped recursion `S_t = g_t(S_{t−1} + w_t)` refutes it:

> `E[S_t | δ] = Σ_{i=1..t} ρ(1−ρ)^{t−i} · m^i`,  `m = m(δ) = E[g | δ]`

where `i` is the run length. The **longest** run (`i = t`, earliest onset) carries the **largest**
weight `ρ`, not the smallest — the geometric prior favours EARLY onsets, exactly as
`mixture-evalue.ts` says in its own docstring. Summing the geometric series,

> `E[S_t | δ] ≈ ρ · m^(t+1) / (m − 1 + ρ)`

and as `m → 1⁺` the `ρ` in the numerator cancels the `(m − 1 + ρ) ≈ ρ` in the denominator. In the
small-heterogeneity regime — the regime that matters — **the mixture inflates at the same rate as
the plain product.** The prior changes the constant, not the exponent.

## 2. A methodological trap, recorded because it produced a confidently wrong answer first

The first measurement estimated `E[M_T]` by Monte Carlo over the shipped function and reported a
per-round growth rate of ≈1.0007 at every δ, flat, with `E[M_400] < 1.1` even at `m = 1.08` — an
apparently clean refutation of A2 itself.

It is an artefact. This is the same wall as A2-E1b (`Λ is a bound, not an estimable mean`, already a
committed test): the mean is dominated by tail mass at probabilities far below `1/N`, so a
20k-replicate sample mean tracks the **median** path while the true mean grows geometrically. Any
Monte-Carlo estimate of `E[M_T]` in this construction will report "no growth" for a quantity that is
growing without bound.

**Do not measure `Λ`. Measure first passage.** `tools/a2-mixture-margin.ts` therefore reports paging
rates, and its header says why.

## 3. What the mixture actually changes

Two effects raise the level `log M` must reach before the unit pages:

| effect | size |
|---|---|
| the onset weight `log ρ` | ≈ −4.16 at the fastest hazard (ρ = 1/64) |
| the √E−1 adjuster: crossing needs `mixPeak ≳ 1/α²`, not `1/α` | **doubles** the barrier |

Below δ₀ the drift is negative and first passage over a barrier `L` goes as `e^{−κL}`. Doubling `L`
therefore **squares** the false-page probability: `α^κ → ρ^κ · α^{2κ}`. Above δ₀ the drift is
positive, the walk crosses eventually whatever the barrier, and the mixture only **delays** the page.

## 4. Measured (α = 0.01, 20k replicates/cell, δ in execution-noise SDs, δ₀ = 0.9128)

Emitted by `node tools/a2-mixture-margin.js` — reproduce with `report()`.

| δ | m(δ) | T=100 plain | T=100 geo | T=100 atten. | T=400 plain | T=400 geo | T=400 atten. |
|---|---|---|---|---|---|---|---|
| 0.00 | 1.00000 | 0.00430 | 0.00000 | never fired | 0.00430 | 0.00000 | never fired |
| 0.30 | 1.08069 | 0.01225 | 0.00015 | **81.7×** | 0.01165 | 0.00030 | **38.8×** |
| 0.60 | 1.34715 | 0.12755 | 0.01130 | 11.3× | 0.13960 | 0.04920 | 2.8× |
| 0.90 | 1.88118 | 0.76425 | 0.39430 | 1.9× | 0.97685 | 0.96445 | **1.0×** |
| 1.20 | 2.85102 | 0.99865 | 0.98130 | 1.0× | 1.00000 | 1.00000 | 1.0× |

The attenuation columns are the finding: **39× at δ = 0.3, and gone by δ = 0.9.** The margin erodes
exactly as the drift turns — the signature of a barrier effect, not a rate effect.

It erodes in the OTHER argument too. At δ = 0.3 the attenuation falls 81.7× → 38.8× as the horizon
goes 100 → 400, and at δ = 0.9 it falls 1.9× → 1.0×. A barrier buys time; it does not buy a bound.
Read the δ = 0.9 row across: the mixture goes 0.394 → 0.964. It is not holding the line, it is
postponing the crossing.

## 5. Consequences

1. **δ₀ remains the design boundary.** ρ buys a large margin where margin already existed and none
   where it did not. This reinforces rather than displaces the identifiability result: above δ₀ a
   benign persistent offset and a genuine fault are the same event.
2. **But the loop path has materially more headroom than the accumulator path below δ₀**, and the
   ICC budget should probably be set per-path rather than globally. The H15 finding (ICC 12.4% → 10
   pages/run against a Ville budget of 2.016) was measured on the accumulator path; whether the loop
   path tolerates more ICC at the same δ is now a well-posed and cheap question. **This does not
   license raising the published target** — the verified-safe figure stays ICC ≲ 1.5% (N11-corrected
   axis) until measured.
3. **The √E−1 adjuster is doing double duty.** It was adopted for SupFDR validity under optional
   stopping (Carefree, arXiv:2501.19360). Squaring the sub-δ₀ false-page probability is a second,
   unclaimed benefit, and it is the larger of the two barrier effects.

## 6. Scope

Single unit; no e-BH selection layer; gaussian `gInc` increment; persistent LOCATION offset only —
persistent *dispersion* (H8's actual mechanism, open item A2-disp) is not covered and the drift
identity is not obviously portable to it. δ is in execution-noise SDs. The closed form for `m(δ)` is
exact for the uncapped increment and therefore a conservative upper bound on the shipped `G_CAP`-
clipped one.
