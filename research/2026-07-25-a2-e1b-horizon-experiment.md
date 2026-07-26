# 2026-07-25 — A2-E1b: the mechanism is confirmed, and my own damage estimate was wrong

- **Artifacts:** `tools/horizon-experiment.ts`; tests `test/horizon-experiment.test.ts` (5);
  `runs/2026-07-25-a2/horizon.json`. Reproduce:
  `pnpm build && node tools/horizon-experiment.js --scenario H1,H12,H2 --seeds 4`.
- **Closes:** open item **A2-E1b** from `research/2026-07-25-theta-tau-measurement.md` § 8.
- **Design:** all-healthy (A/A) fleet, so every page and every e-BH selection is a false positive.
  Every statistical primitive — `conformalP`, `calibrator`, `onsetUpdate`, `combinedEValue`,
  `eBhSelect` — is **imported from canary-sim.ts**, not reimplemented, so a discrepancy cannot be an
  artefact of a parallel implementation. Only the healthy score substrate is local.

The experiment was set up to test three predictions at once, because the *conjunction* is what
identifies the mechanism:

- **P1** per-test conformal FPR stays exactly nominal at every horizon `T`
- **P2** the accumulator's mean null value tracks `Λ(T) = E_δ[g(δ)^T]`
- **P3** paging and e-BH error rates grow once `T` exceeds `T*`

**P1 and P3 confirmed. P2 refuted — and the refutation matters more than the confirmations.**

---

## 1. Result

N = 2016 units, K = 30 peers, α_page = 0.001 (Ville budget `N·α` = 2.016 pages/run), 4 seeds.

| | T=10 | T=40 | T=80 | T=160 | T=320 |
|---|---|---|---|---|---|
| **H1** (θ≈0, control) per-test FPR | 0.0088 | 0.0088 | 0.0091 | 0.0092 | 0.0117 |
| **H1** false pages/run | **0.00** | **0.00** | **0.00** | **0.00** | **0.00** |
| **H2** (θ=0.42) per-test FPR | 0.0072 | 0.0097 | 0.0097 | 0.0094 | 0.0109 |
| **H2** false pages/run | 0.25 | 0.50 | 1.75 | **3.50** | **6.75** |

**P1 holds:** per-test FPR sits at nominal 0.01 in both scenarios at every horizon, including
T = 320. Exactly as (★) requires — Λ(1) = 1 regardless of θ.

**P3 holds, with a clean control:** the iid scenario pages **zero** times at every horizon out to
T = 320. The rack-correlated scenario grows monotonically and **breaches the Ville budget at
T ≈ 100**, reaching 3.3× the budget at T = 320. The anytime false-page guarantee `P(∃t: M_t ≥ 1/α) ≤ α`
is violated, while per-test calibration is perfect. That is the A2 signature and nothing else
produces it: a harness bug, a mis-set threshold or a broken rank would move P1 too.

## 2. P2 refuted — Λ is a bound, not an estimable quantity

The observed mean accumulator value came out at **0.24–0.73** against predictions of `10²` to `10⁶`,
and it *decreases* with T rather than growing.

This is not a numerical error, it is a fact about `Λ`. `Λ(T) = E_δ[g(δ)^T]` is dominated by the
upper tail of `δ`; at long horizons the saddle point sits at a `δ` whose probability is far below
`1/N`. No fleet-sized sample mean can see it. Meanwhile the *bulk* of units drift downward, because
`E[log f(U)] < 0` — the fixed-split dilution the ADR 0023 correction is about. So the sample mean
falls while the true mean explodes, and both are correct.

**Consequence, stated plainly: my previous report over-claimed the operational damage.**
`research/2026-07-25-conjecture-a2-resolution.md` § 2 says a one-year deployment sits where
`Λ > 10⁶`, and reads as though the guarantee evaporates. What is true is that the **bound**
degrades by `10⁶`; the **realised** error rate at T = 320 degrades by 3.3×. e-BH's FDR bound is not
tight under this failure mode, and I should not have presented the bound as if it were the error
rate. The corrected claim is in § 4.

A test now pins this negative result in place so nobody "fixes" the observed column to match the
predicted one.

## 3. The paging surface fails before the FDR surface

False e-BH selections were **0.00 in every cell**, including H2 at T = 320 where paging was 3.3× over
budget. The reason is structural: e-BH's threshold for a single rejection is `N/q` = 40,320 here, so
a handful of exploding units cannot clear it, whereas the paging rule `e ≥ 1/α` = 1000 is per-unit
and has no such protection.

So the two Mode-B guarantees degrade in a definite order:

> **per-unit anytime paging breaks first; per-family FDR is substantially more robust, and its
> robustness improves with fleet size.**

Neither report anticipated this, and it is directly actionable: the paging threshold, not the FDR
level, is the parameter to defend, and it is the one whose validity claim should carry the horizon
qualifier.

## 4. Corrected statement of the A2 consequence

> Persistent unit heterogeneity leaves per-round conformal validity exactly intact and degrades the
> accumulated guarantees at a rate governed by `θ` and the horizon `T`. The e-BH FDR *bound* inflates
> by `Λ(T) = E_δ[g^T]`, which becomes astronomically loose, but `Λ` is not the realised error rate:
> measured on an A/A fleet at rack-correlated heterogeneity (ICC 15%), the anytime paging rate
> exceeds its Ville budget from `T ≈ 100` rounds and reaches 3.3× at `T = 320`, while per-family
> e-BH selections remain at zero throughout.

At β = 0.05% (0.09 probes/unit/day), T = 100 rounds is roughly **3 years** of deployment; at
β = 0.2% it is about 9 months; under E4-style escalation, which concentrates executions on suspect
units, far sooner. So this is a real defect with a slow fuse, not an emergency — the opposite of what
the previous report implied.

## 5. What still stands from the earlier reports

- The identity (★) and Proposition A2 — unaffected; P1 is a direct confirmation of its first clause.
- `T* ≈ 0.592/θ` as the horizon at which the **bound** doubles — correct as stated, but it is a bound
  horizon, not an operational one. The operational horizon measured here is ~30× longer.
- The θ/τ measurement — unaffected. Ten of fourteen E1 scenarios still carry no unit-level persistent
  heterogeneity, and τ ≫ T* still holds.
- The claim that E1 could not have detected this — **strengthened**. E1's T ≈ 5 is 20× below where
  the effect becomes visible even in the worst scenario.

## 6. Threats to validity

- **One block size, one fleet size.** N = 2016, K = 30. The e-BH robustness argument in § 3 predicts
  the FDR surface degrades *later* at larger N; untested.
- **Four seeds** at the long horizons. The false-page counts are small integers (0.25 = one page
  across four runs), so the T=10/T=40 cells are noisy; the trend and the T≥80 cells are not.
- **The `Λ` gap is not quantified.** § 2 establishes that the bound is loose, not *how* loose as a
  function of N and T. A tail-probability calculation (what fraction of units exceed `1/α` at
  horizon T) would give the realised rate directly and is the obvious next piece of theory —
  and it is what should replace `Λ` in the guarantee text.
- Substrate is canary-sim's healthy model, with the interference channel still unmodelled
  (θ̂ remains a lower bound).

## 7. Open items

| id | item | priority |
|---|---|---|
| A2-tail | derive `P(∃t≤T: M_t ≥ 1/α)` directly instead of bounding it by `α·Λ(T)` — the realised rate is the quantity the product needs | **high — replaces the loose bound in the guarantee text** |
| A2-page | put the horizon qualifier on the paging claim specifically (§ 3), not on the FDR claim | high |
| A2-N | repeat at N ∈ {10k, 100k} to test the "FDR robustness improves with N" prediction | medium |
| A2-θ-real | unchanged: real-fleet θ needs the probe pilot | high |
