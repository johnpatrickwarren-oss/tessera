# Deep-research: e-value / anytime-valid metric audit for Tessera

- **Date:** 2026-06-26
- **Run:** deep-research `wf_b69c520a-589` — 22 sources fetched, 102 claims extracted, 25
  adversarially verified (3-vote), 24 confirmed / 1 killed. All priority papers read from
  the OPEN arXiv versions (no paywall needed).
- **Question:** which error metric should Tessera control, and which priority papers touch
  our actual upstream WALL (per-stream validity under nonstationarity, transient-fault
  power, metric choice) vs only the FDR-combination LAYER.

## Headline

**Control EOP (Error Over Patience) for the streaming detector, not a static worst-case
FDR.** This rests on a verified IMPOSSIBILITY theorem, and it reframes the per-alert vs
fleet-FDR tension we have been circling.

## Verified findings (with sources)

1. **[WALL] Impossibility — finite ARL ⇒ worst-case FDR/FWER = 1.** Dandapanthula &
   Ramdas 2025 (**arXiv:2501.04130**), Thm 4.1/4.2: *"any algorithm with finite average
   run length (ARL) must have a trivial worst-case false detection rate (FDR), family-wise
   error rate (FWER), per-family error rate (PFER), and global error rate (GER); thus, any
   attempt to control these Type I error metrics is fundamentally in conflict with the
   desire for a finite ARL."* Tessera needs finite ARL (bounded detection delay), so
   worst-case FDR is uncontrollable for the live detector *by theorem*. (3-0)

2. **[WALL] EOP is the controllable metric.** Same paper: `EOP = sup over change-locations
   ξ and stopping times τ of [Type I error at τ] / E[τ]`, where `E[τ]` is "patience."
   Bounding `EOP ≤ α` forces small error for fast (low-patience) declarations, tolerates
   larger error for slow ones, and *implies* `ARL ≥ 1/α`. Controllable exactly where
   worst-case FDR is not. (3-0)

3. **[WALL/LAYER bridge] e-detectors are the right object for a monitored shard.** Same
   paper combines **e-detectors** — a nonneg. filtration-adapted `(M_t)` with
   `E_P[M_τ] ≤ E_P[τ]` for ALL stopping times τ (generalizes CUSUM / Shiryaev–Roberts) —
   with e-BH / e-Bonferroni, controlling EOP under general dependence *within and across*
   streams. Distinct from our **terminal-window** e-values (which bound `E[e] ≤ 1` at one
   fixed time): the e-detector bound *scales with* `E[τ]`, the correct object for continuous
   monitoring rather than a fixed cal/test split. (3-0)

4. **[WALL for us] The exact no-leakage condition — and why our fleet-FDR is only
   empirical.** Wang, Dandapanthula & Ramdas 2025 (**arXiv:2502.08539**, stopped e-BH):
   stopping multiple e-processes at a common GLOBAL stopping time yields valid e-values
   ONLY if every e-process *and* the stopping time are adapted to the SAME global filtration;
   per-shard e-processes are LOCAL by default, and naive fleet stopping lets information
   leak across time (worked counterexample `E[M_τ]=1.25 > 1`). The exact sufficient fix is
   the Markov-type **causal Assumption 3.1**: for `n≥2`, `Y_n ⊥ (X_1..X_{n−1}; Y_1..Y_{n−1})
   | X_n` — the current responses depend on the past ONLY through the current covariate `X_n`
   (arbitrary contemporaneous cross-shard dependence given `X_n` is still allowed). Under
   3.1, local e-processes become global (Thm 3.3) and stopped e-BH controls FDR (Cor 3.4).
   **Tessera's within-window nonstationarity (drift/thermal/regime) means a shard's value
   depends on its own recent past not only through an observed covariate → Assumption 3.1
   plausibly FAILS → fleet-stopped e-BH does NOT inherit an automatic FDR theorem.** This
   *corroborates* our established "fleet-FDR ≤ q is empirical, not a theorem." (3-0; this
   Tessera mapping is our application inference, not a paper claim — verify empirically.)

5. **[LAYER] Closed e-BH — a free power upgrade, same caveat as boosting.** Xu, Fischer &
   Ramdas 2025 (**arXiv:2504.11759**): the closed e-BH procedure is a usually-strict
   improvement over e-BH for the SAME e-values (`R^eBH ⊆ R^eBH̄`; standard e-BH is
   inadmissible). Pure combination layer — like Lee–Ren boosting it AMPLIFIES rejections,
   so it does not fix (and would worsen) any regime where the per-shard null is violated.
   (3-0)

6. **[LAYER] e-BH foundational dependence condition.** Wang & Ramdas 2022 (**arXiv:2009.02824**,
   JRSS-B 84(3):822): e-BH controls FDR under ARBITRARY dependence between input e-values
   (no PRDS). Confirms the theorem we rely on. (verified)

## The one genuinely new, actionable bridge

Finding 4 ties the literature to our established **"common-mode estimation is the real
lever"** result in a way that's bigger than a power tweak:

> If Tessera can find an **observed covariate `X_n`** (the common-mode estimate — thermal /
> utilization / factor signal) such that conditioning on it makes the per-shard residual
> approximately Markov (`Y_n ⊥ past | X_n`), it **RESTORES the global-e-process property and
> EARNS the stopped-e-BH FDR theorem** — turning the empirical fleet-FDR into a *conditional*
> theorem-backed guarantee.

So a better common-mode estimator is not only the detection lever (oracle → 99%); it is
plausibly the path to a *real* (Assumption-3.1-conditional) fleet-FDR guarantee. The
per-alert guarantee stays dead; a conditional fleet guarantee may be recoverable.

## Metric recommendation (the highest-value decision)

- **Streaming per-shard/fleet detector → control EOP** (error per unit patience). Reason:
  finite ARL makes worst-case FDR/FWER uncontrollable (Finding 1); EOP is controllable in
  that regime and degrades gracefully (`ARL ≥ 1/α`).
- **Anytime-valid fleet FDR (stopped e-BH) → keep only as a CONDITIONAL guarantee**,
  contingent on the Assumption-3.1 covariate (Finding 4). Do not market unconditional
  fleet-FDR.
- **FWER** — even more conservative, equally killed by the impossibility. **TDP lower
  bound** — a post-hoc reporting layer, not a live-control target.

## ADR integrity check

No primary source CONTRADICTS the engine ADRs (0005/0006/0009/0013) I relied on. The
stopped-e-BH paper *corroborates* the "fleet-FDR is empirical not a theorem" finding by
naming the exact condition (Assumption 3.1) whose failure explains it. One claim was
correctly killed: stopped e-BH does NOT require cross-stream *independence* — the real,
weaker condition is causal Assumption 3.1 (arbitrary past + contemporaneous dependence OK).

## NOT resolved this pass (verification budget; not paywall)

The second-tier papers did not surface confirmed claims (only 25/102 claims verified;
7 budget-dropped). Crucially, **our actual core wall — transient-fault power** (a fault
with onset→offset inside the test window, diluted by a fixed split) — remains unaddressed.
Candidate primaries (all on arXiv, NOT paywalled), for a dedicated follow-up read:
- Transient / horizon-aware betting: Clerico 2026, Taga–Oymak–Shekhar 2026, Koning–van Meer
  2026 (fetched arXiv:2605.06521, 2603.19551, 2502.04294 — not yet verified).
- Online e-BH / SupFDR late-upgrade: Xu–Ramdas e-LOND, Fischer–Xu–Ramdas (arXiv:2501.19360,
  2407.20683).
- Post-alert TDP / RCA re-slicing: Preuße 2025/26, e-Partitioning, closure.
