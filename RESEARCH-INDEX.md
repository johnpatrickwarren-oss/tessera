# Research & Prior-Decisions Index

**Read this BEFORE proposing any detector / FDR / e-value tuning, or commissioning new
literature research.** Much of the statistical-method design space is already settled —
the registry below lists what has been tried and *closed* (walls / rejections) so we stop
re-deriving it. This file is the canonical entry point; it indexes the engine's decision
log (`../deploysignal-engine/decisions/`, the ADRs), the e-value literature, and our
deep-research outputs.

> Why this exists: across 2026-06-24…26 we repeatedly rebuilt experiments and nearly
> re-proposed tunings that the engine ADRs had already settled (e.g. the clustersynth
> "fair test", cross-sectional recalibration). The findings were one `grep` away but not
> *consulted first*. This index + the CLAUDE.md pointer fix the "didn't look" failure.

---

## 1. Negative-results registry — SETTLED / CLOSED (do not re-litigate)

Each item: the idea, the verdict, and the authoritative source. "Source" paths are in the
**engine** repo (`../deploysignal-engine/decisions/`).

| # | Idea / tuning | Verdict | Source |
|---|---|---|---|
| N1 | **Per-alert guarantee** `E[e_j\|H0] ≤ 1` per shard on real telemetry | **DEAD — fundamental.** Within-window nonstationarity (drift/regime) is irreducible per-shard; only the cross-shard contrast separates drift from the nuisance. | ADR 0012 (real GWDG) |
| N2 | **Integrate the AR(1) φ nuisance out / HAC deflation** to restore short-cal validity | **WALL.** 4 independent control mechanisms built, all leak at high φ / near unit root; the heavy-tailed null *mean* (what e-BH needs) is uncontrollable at short cal. | ADR 0009 (corrects 0007 #1) |
| N3 | **Cross-sectional empirical-null recalibration** (Efron-style) to force `E[e]≈1` before e-BH | **REJECTED.** e-BH is rank/scale-invariant (`e-BH(e/μ,q) ≡ e-BH(e,q/μ)`): recalibration either silently tightens `q/μ̂` (power collapse) or, per-group, inflates a deflated null group to FDP=1. Wrong tool. | ADR 0013 |
| N4 | **Lee–Ren conditional-calibration boosting** as an FDR fix | **It's a POWER lever, NOT an FDR fix.** Deterministic superset (`K_boosted ≥ K_plain`) at the *stated* FDR; when the base null is violated by nonstationarity it amplifies TP+FP together. Verified in Tessera PR #33. | ADR 0006 + Tessera PR #33 |
| N5 | **Blier-Wong–Wang threshold sharpening** for the e-BH procedure | **DROPPED.** `B^AD = 1` — no threshold improvement is possible under arbitrary dependence (the regime fleet e-BH relies on). Gains need PRDS / log-concave survival only. | ADR 0006 |
| N6 | **Two-level hierarchical-FDR guarantee** (shard→rack→fleet) | **Ambitious version DEAD** (3 ways). Survivor: flat e-BH + topology used only to define a tighter common-mode contrast + a separate group-fault detector — **per-group FDP, no global guarantee.** | ADR 0015 |
| N7 | **A statistical fix for false pages caused by persistent unit heterogeneity** (canary unit family) | **DEAD — IDENTIFIABILITY, not a defect.** δ₀ (the persistent offset above which a healthy unit eventually pages) IS the calibrator's Kelly break-even shift, i.e. the *minimum persistent fault the detector has power against*. Same number because it is the same event: the rank sees only the shift. δ₀ ≈ 0.913·σ_exec ≈ **1.02% degradation**, which independently matches E2's measured rack detection floor (rack@1% 4/8, rack@2% 7/8). No calibrator, accumulator or threshold separates them. Only three responses exist: shrink θ via block-key enrichment; raise δ₀ via `κ_min` (costing exactly the power you blind yourself to); or reclassify persistent offsets as findings. | `research/2026-07-25-a2-delta0-derivation.md` |
| N8 | **Mean reversion rescuing the accumulation horizon** (hope that persistent offsets revert on timescale τ, replacing the exponent T by min(T,τ)) | **CLOSED NEGATIVE — measured; margin NARROWED by N11.** τ̂ = 400.9 / 37.0 / ∞ / ∞ / 38.2 / 46.7 rounds across the six canary-sim scenarios that carry unit-level persistence (H2/H8/H10/H11/H12/H14), everywhere **> 3× the corresponding T\***. `rackStatic`, the hidden stratum and the aging slope are set once at init and never revert; the exponent is T. ⚠️ The pre-N11 table reported margins > 20×; on the corrected axis H8 is the binding case at **6×** (τ=37 vs T\*=6), because host load contributes a FAST-reverting component that pulls the fitted τ of a mixed-channel scenario down. The conclusion survives — reversion does not rescue anything — but do not quote the old headroom. | `research/2026-07-25-theta-tau-measurement.md` § 4 (+ 2026-07-26 banner) |
| N9 | **The geometric onset prior (hazard ρ) as a design lever against A2** — hope that the horizon-INDEPENDENT weights in `geometricMixtureEValue` cap the effective accumulation horizon at ~1/(1−γ), so `mode-b-loop` is structurally safer than the plain accumulator | **CLOSED — ρ is NOT a δ₀ substitute.** Unrolling the shipped recursion, `E[S_t\|δ] = Σ_i ρ(1−ρ)^(t−i)·m^i`: the LONGEST run carries the LARGEST weight ρ (the prior favours EARLY onsets), so the leading term is `ρ·m^(t+1)/(m−1+ρ)` and as `m→1⁺` the ρ cancels. **Growth rate is m on both paths; nothing is capped.** What the mixture does buy is BARRIER height (`log ρ`, plus the √E−1 adjuster doubling the crossing level to ~1/α²), which squares the first-passage probability `α^κ → ρ^κ·α^(2κ)` — huge below δ₀, nil above it, where the walk crosses regardless and the mixture only DELAYS. Measured attenuation: **38.8× at δ=0.3, 2.8× at δ=0.6, 1.0× at δ=0.9** (T=400). Erodes in the horizon too (81.7×→38.8× at δ=0.3 as T goes 100→400). δ₀ remains the boundary. | `research/2026-07-26-a2-mixture-margin.md` |
| N10 | **Monte-Carlo estimation of `E[M_T]` / Λ(T)** as a way to test any A2 claim | **DEAD — it silently reports the wrong answer.** Λ is dominated by tail mass at probabilities far below 1/N, so a 20k-replicate sample mean tracks the MEDIAN path. Measured on the shipped mixture it reports a per-round growth rate of ≈1.0007 flat at every δ, and `E[M_400] < 1.1` where `m = 1.88` — an apparently clean refutation of A2 that is pure artefact. **Any A2 hypothesis must be tested via first passage (paging rate), never via the mean.** | `research/2026-07-26-a2-mixture-margin.md` § 2; `test/horizon-experiment.test.ts` ("Λ is a bound, not an estimable mean") |
| N11 | **Mirroring a shipped model in a measurement tool** — reimplementing `canary-sim.execScore` inside `heterogeneity-estimate` "with the knobs imported so the two cannot drift apart" | **DEAD — they drifted anyway, twice, both times biasing θ̂ DOWN.** (a) the mirror omitted `interferenceCoef · hostLoad(...)` entirely; (b) it declared `GEN_SIGMA = 0.010`, generation ONE's noise scale, for a generation-ZERO block — overstating within-unit noise 25% and deflating every ICC. **Importing CONSTANTS does not couple two implementations; only calling the same CODE does.** Fixed by deleting the mirror: `healthyPanel` delegates to `canary-sim.healthyScorePanel`, which calls the real `execScore`. Consequences: 6 of the original 14 scenarios carry persistence, not 4 (H10/H11 join — the two largest `interferenceCoef`); H16 1.0%→**1.49%**, H15 9.2%→**12.40%**, H17 26.5%→**32.97%**; H8's τ/T\* margin 10×→**6×**. No paging result changed — the axis was compressed ~1.4×, not the DGP. **Two A2-E1b assertions also had to be restated**, both because they pinned a LEVEL where the finding is a RELATION: (i) per-test conformal FPR is mildly inflated at short horizons (0.0141 at T=10 vs nominal 0.01, settling to 0.0106 by T=160) — but IDENTICALLY in the θ≈0 control and the θ=0.29 scenario, so it is NOT the A2 mechanism; it is canary-sim's diurnal term, which is modulated PER UNIT by `(g%7)/7` and so does not cancel in a within-round rank. P1 now asserts scenario-INDEPENDENCE, which is what made P1∧P3 discriminating. (ii) `Λ observed < 10` became false (it is ~8.5e3) though the finding got STARKER — predicted ~1.5e140, a ~136-order gap. The test now asserts the gap, not the level. | `research/2026-07-25-theta-tau-measurement.md` (2026-07-26 banner) |

| N12 | **Relying on e-BH's `N/q` threshold growth to protect large fleets under dispersion** — the hope that at 10k+ units the single-rejection barrier is simply too high to reach | **DEAD — the fleet-size direction REVERSES (measured).** The scalar-ς iid first-passage theory does predict the ln N barrier beats the ×N chances; the substrate (and real fleets) violate its iid-λ assumption: λ is a PER-RACK multiplier shared by ~72 units, so the fleet max is an extreme-value statistic in the number of RACKS, and once one unit of an extreme rack crosses `N/q`, e-BH's step-up drops the bar to `N/(q·k)` for its same-λ rack-mates — a CASCADE. Measured at ς̂=0.61: 0 / 3 / 26.5 false sel/run at N=1008/2016/4032 (superlinear; per-unit rate also GROWS; first selection EARLIER). Scale is exposure, not protection. ⚠️ **"the ς ≲ 0.15 gate is the protection" DID NOT SURVIVE the scale sweep — see N13**: at ≥20k units the gate point itself breaches. | `research/2026-07-27-a2-disp-ebh-boundary.md` § 3; scale: `research/2026-07-28-a2-disp-ebh-scale.md` |
| N13 | **A fixed-ς̂ design gate protecting e-BH accumulation at fleet scale** — the hope that ς ≲ 0.15 (or any fixed threshold) keeps `conformal_rank` e-BH valid as the fleet grows | **DEAD at ≥20k units — measured (A2-disp-ebh-scale).** The onset ς̂ collapses monotonically with N and does not plateau: (0.31, 0.43) @ N=2016 → (0.153, 0.183] @ 4k–10k → (0.123, 0.153] @ 20k (**the design-gate point ς̂=0.153 itself fails 3/16 seeds** — the coarse 0/6 was seed luck) → **≤0.065 @ 40k**, ~3× the instrument floor, with knob-0 controls clean (0/8, 0/16 — it is the dispersion channel, not an anytime-e-BH artifact). Paging onset falls the same way ((0.153, 0.183) at 40k). Tightening the threshold is not a rescue at 40k; the safe region shrinks toward the measurement floor. The measured positive alternative is the **rack-local conformal construction** (premise = within-rack exchangeability, N-free; clean at ς̂=0.607 @ N=20160 where fleet-random makes 141.75 false sel/run, and MORE powerful under dispersion). Gate decision **DECIDED same day: rack-local adoption (option C), ADR 0026** — the N13 cap survives in code for emitters that stay fleet-scoped. Do not quote ς ≲ 0.15 as sufficient for fleet-scale e-BH. | `research/2026-07-28-a2-disp-ebh-scale.md`; `research/2026-07-28-rack-local-conformal.md`; `decisions/0026-*` |

### Established POSITIVE results (use these)

| # | Result | Source |
|---|---|---|
| P1 | **UI mean-shift e-value** — `E[e\|H0] ≤ 1` for ANY φ incl. unit root (split-LR / universal inference). ⚠️ 2026-07-02 audit: the "by construction" PROOF has a hole in the engine variant (cal-eval temporally precedes test-train, so the split-LRT independence premise fails for φ≠0); holds **empirically** with ~6× slack (MC E≈0.15 at φ up to 0.999). Underpowered above φ≈0.8. | ADR 0010 + 2026-07-02 audit F5 |
| P2 | **safe-t e-value** (right-Haar / GROW) — variance nuisance integrated out, σ-exact at every cal length. Audit-confirmed exact. ⚠️ NB: the ADR 0013 nuisance-robust **BF** is NOT valid as implemented (E[BF\|H0]≈1.155 at every cal length — recentering breaks the proper-prior property; see ADR 0013 correction note); safe-t is the theorem-valid substitute. | ADR 0005; ADR 0013 correction |
| P3 | **e-BH controls FDR under ARBITRARY dependence** given valid per-input e-values. | Wang–Ramdas 2022 (foundational) |
| P4 | **Auto factor-rank selection** (sequential common-deflation-path null) — the *legitimate* route N3 failed to find: correct rank → homogeneous residual inflation → cancels in e-BH → protects fleet FDR. | ADR 0014 |
| P5 | **Common-mode ESTIMATION is the real detection/localization lever.** Oracle common-mode → 99–100% detection at 0% FPR even for small faults; full-series loading ABSORBS single-shard faults → 0%; cal-only loading → ~16% / 8% FPR. | ADR 0016 (FAIR test) |
| P6 | **The A2 drift identity.** With `g(δ) = E[f(p)|δ]` the conditional increment mean given a unit's persistent offset: `E_δ[g] = 1` (per-round conformal validity is EXACT — confirmed empirically to T=320) but `E[M_T] = E_δ[g(δ)^T] =: Λ(T)`, so per-round validity does **not** survive accumulation. `FDR ≤ q·Λ(T)` by e-BH scale-invariance (N3). ⚠️ Λ is TRUE and OPERATIONALLY VACUOUS — dominated by tail mass below 1/N; it saturates at N while measured degradation was 3.3×. Use P7, not Λ. | `research/2026-07-25-conjecture-a2-resolution.md` |
| P7 | **The operational form: a DRIFT condition, not a horizon.** `log M_t` is a random walk with drift `μ(δ) = E[log f(p)|δ]` (the Kelly log-growth rate); paging is first passage. Per-unit anytime page probability `≈ α^{κ(δ)}` where `κ(δ)` solves `E[f^κ|δ]=1` — **bounded by 1**, unlike `α·Λ`. Fleet rate `≈ N·P(δ ≥ δ₀)`, `δ₀(θ) = √(a₀² + (1+a₀²)θ²)`, `a₀ = 0.9128`. ⚠️ **The ICC target has been revised THREE times — use neither 0.25%, 9.5% nor 1%.** Measured on the H15–H17 unit-persistence scenarios, ON THE CORRECTED AXIS: ICC 1.49% is safe to T=320; **ICC 12.40% runs 5× over the paging budget** and produces the first false e-BH selections seen anywhere. The steady-state form drops the sub-threshold `α^{κ(δ)}` bulk term. ⚠️ **AXIS RESCALED 2026-07-26 (N11/A2-host): the θ̂ estimator was biased DOWN twice over.** On the corrected axis H16 = 1.49% (was labelled 1.0%), H15 = 12.40% (was 9.2%), H17 = 32.97% (was 26.5%). No paging result moved. **A2-icc CLOSED 2026-07-26 — the band was swept.** Ville-budget breach falls between **ICC 6.32% and 8.36%** on BOTH pipelines (4.28% → 12% of budget; 6.32% → 74%; 8.36% → 198%). **Design target ≲ 4%**, relaxing the previous ≲1.5% by ~3× — that figure had extrapolated from H16, the only clean point then measured. Per-path budgeting closes NEGATIVE: the loop path pages less below the boundary but breaches in the same cell and is marginally worse by 12.8%, exactly as N9 predicted (the mixture's barrier collapses as δ→δ₀, so it protects only units that were never going to page). Design against δ₀, which is stable; treat any rate as order-of-magnitude. | `research/2026-07-25-a2-tail-probability.md` (+ 2026-07-26 correction) |
| P8 | **Paging fails before FDR.** Measured on an A/A fleet: at ICC 15% the anytime paging rate breaches its Ville budget from T≈100 rounds and reaches 3.3× at T=320, while per-family e-BH false selections stayed at **0.00 in every cell**. e-BH's single-rejection threshold `N/q` protects it; the per-unit rule `e ≥ 1/α` has no such protection, and the gap widens with fleet size. Put the horizon/identifiability qualifier on the PAGING claim, not the FDR claim. ⚠️ **SCOPE NARROWED 2026-07-26 (P9): this is a LOCATION-channel result.** Under persistent DISPERSION heterogeneity e-BH fails too — 14.8 false selections/run at ς̂=0.61, first nonzero at ς̂=0.31 — because a persistently noisy unit CONCENTRATES its inflation and crosses `N/q` individually, where location spreads it across many sub-threshold units. For the dispersion channel the qualifier goes on BOTH claims. ⚠️ **"the gap widens with fleet size" is ALSO location-only (2026-07-27, N12): for dispersion the fleet-size direction REVERSES** — rack-shared λ + the e-BH step-up cascade make false selections grow superlinearly with N (0 / 3 / 26.5 per run at N=1008/2016/4032, ς̂=0.61). | `research/2026-07-25-a2-e1b-horizon-experiment.md` § 3; scope: `research/2026-07-26-a2-dispersion.md` § 4 + `research/2026-07-27-a2-disp-ebh-boundary.md` § 3 |

> The single most important framing (THESIS-VERDICT-2026-06-25): detection + ranking is
> **ALIVE**; the per-alert guarantee is **DEAD**; fleet-FDR is **EMPIRICAL not a theorem**;
> localization is **achievable but bottlenecked by common-mode estimation**.

> **ARCHITECTURE — ADR 0019 (2026-06-27), two modes.** Tessera ships **Mode A —
> evidence/ranking + abstention (DEFAULT, NO FDR claim)** for continuous fleet observation, and
> **Mode B — FDR-guaranteed (CONDITIONAL, narrow)** only for emitter contracts whose conditional
> null is theorem/construction-valid over the horizon. Unit of validity = the **emitter contract**
> (baseline+conditioning+residualizer+increment+stopping), carried as `validity_class`; only
> `theorem_valid`/`construction_valid` enter e-BH (enforce in code like `baseline-guard`). **Mode B's
> guarantee is a SPATIAL null (concurrent control: treatment/canary), not a certified temporal null** —
> the temporal per-shard null is uncertifiable on nonstationary GPU telemetry (2026-06-27: time-varying
> drift defeats finite-sample certification; `tools/emitter-prototype.ts` audit = NO-GO). Default
> increment object = **normalized convex-mixture e-value** (raw Shiryaev–Roberts sum is E≈T, not an
> e-value, so the SupFDR √E−1 adjuster can't rescue it). See `decisions/0019-*`.

---

| P9 | **The A2 drift analysis extends to persistent DISPERSION (A2-disp; H8's actual mechanism)** — unit noise-scale multipliers `λ = e^ν`, `ν ~ N(0, ς²)`, peers the scale MIXTURE (not a single Gaussian; that would break the identity). Per-round validity stays EXACT (E_ν[g] = 1.00000 measured; FPR nominal + variant-independent in A/A); the failure is serial, as always. **Channel structure:** ∞-block tilt `B = ∫f(p)(Φ⁻¹(p)²−1)dp = 9.63` ≈ 4.8× the location tilt A — but the finite block caps it 6.6× (K=30 effective tilt 1.47) vs ~2× for location, and in the ∞ limit g itself diverges. **Floor is a RATIO with sharp block dependence:** λ₀(K=10) = ∞ (immune), λ₀(K=30) = 4.14×, λ₀(K=100) = 2.38× — by N7 duality also the noisy-fault DETECTION floor. **κ_min points the OPPOSITE way** (0.05→0.2 LOWERS λ₀ 4.14→2.19; the location lever has a dispersion cost). **ς is estimable and the ICC gate is blind to it** (`estimateDispersion`, χ²/trigamma-corrected log-variance spread; null floor 0.034). H8: ς̂ = 0.31, τ_disp = ∞ ⇒ corrected T\* ≈ 3 (was 6). **Measured Ville breach bracket: ς̂ ∈ (0.15, 0.31)** at T=320, K=30 (0.5 vs 12 pages, budget 2) ⇒ **design target ς ≲ 0.15, ALONGSIDE ICC ≲ 4% — the gate is now a pair.** Steady-state P(λ≥λ₀) misses the ς̂=0.31 breach entirely (finite-T Lundberg bulk dominates — noisy units swing between BOTH extreme cells); finite-T form gets orderings exactly, rates order-of-magnitude (~2–20×; scalar ς compresses the rack-diluted tail). **BOUNDARY SWEPT 2026-07-27 (A2-disp-ebh CLOSED):** paging bracket narrows to **ς̂ ∈ (0.244, 0.305)**; e-BH onset **ς̂ ≈ 0.31 (rare, seed-dependent 0–0.5 sel/run), robust failure from ς̂ ≈ 0.43**; rates burst-dominated (1.8/3.0/14.8 sel/run across seed sets at ς̂=0.61 — an extreme-RACK event count, not accumulated unit events). Fleet-size direction reverses (N12). **Pair gate now ENFORCED at runtime:** `tools/dispersion-monitor.ts` (ς̂+ICC panel estimators, sticky demotion) → `EmitterContract.heterogeneityGatePassing`, required for `conformal_rank` emitters in EITHER FDR-bearing class — the runtime form of Correction 2's missing validity rung. | `research/2026-07-26-a2-dispersion.md`; boundary: `research/2026-07-27-a2-disp-ebh-boundary.md` |

## 2. Open questions (genuinely unsettled — fair game for new work)

- **O1 — error metric choice. ✅ DECIDED (2026-06-26) — ✅ IMPLEMENTED (2026-07-02 W2).**
  Control **EOP (error over patience)** for the streaming detector: Dandapanthula–Ramdas
  (arXiv:2501.04130) PROVE that finite ARL ⇒ worst-case FDR/FWER/PFER = 1, so worst-case FDR is
  uncontrollable for a fast-detection live detector. EOP is controllable (`ARL ≥ 1/α`). Keep
  anytime-valid fleet-FDR (stopped e-BH) only as a CONDITIONAL guarantee (see O4). FWER = worse;
  TDP = a post-hoc reporting layer, not a live target. **Implemented (W2): `srEDetector`
  (tools/e-detector.ts) — SR over GENUINE e-process increments (fixed-grid Gaussian-LR mixture) at
  threshold patience/α ⇒ P(false alarm within the window) ≤ α (Doob on the SR submartingale) AND
  ARL ≥ patience/α ⇒ EOP ≤ α — both as theorems CONDITIONAL on the certified residual null (the
  Wall-A gate owns the premise). Reported as the sr@T/α column + EOP statement in baseline-monitor.**
- **O2 — principled robust / contaminated e-process** to replace the ad-hoc Tukey center
  (with breakdown guarantees). No off-the-shelf construction exists (ADR 0005 Thread C). _Still open._
- **O3 — transient-fault early detection. ✅ RESOLVED IN PRINCIPLE + 🔧 PROTOTYPED (2026-06-26).**
  The named construction is the **e-detector** (Shin–Ramdas–Rinaldo, **arXiv:2203.03532**):
  Shiryaev–Roberts `M^SR_n = Σ_{j≤n} Λ^(j)_n` (recommended) or CUSUM `max_{j≤n} Λ^(j)_n`,
  each `Λ^(j)` an e-process started at candidate onset `j`; threshold `1/α` → ARL control with
  NO assumption on changepoint location/post-change law. It dissolves the fixed-split dilution.
  Koning–van Meer "free" sequentialization (arXiv:**2501.03982**) only matches terminal power,
  does not add transient power. **CRITICAL:** this is a SEPARATE wall from O2/per-stream
  validity — the e-detector's validity reduces to each `Λ^(j)` being a valid e-process under
  the nonstationary null, i.e. our open `E[e|H0]≤1` wall persists inside the increments. Two
  walls, one closed. **PROTOTYPE: `tools/e-detector.ts` (Tessera ADR 0018)** — e-SR over
  sequentialized UI increments; ~90% transient detection vs 0% terminal (ROC-matched). _Still open:
  whether the UI's fixed-horizon validity survives promotion to anytime `Λ^(j)`; detection-delay/power
  cost vs oracle; Clerico (2603.19551) / Taga–Oymak–Shekhar reward-early betting (unverified)._
- **O4 — stopped/online e-BH validity. PARTLY RESOLVED.** The exact no-leakage condition is
  the Markov causal **Assumption 3.1** (Wang–Dandapanthula–Ramdas, arXiv:2502.08539):
  `Y_n ⊥ past | X_n`. Per-shard e-processes are LOCAL by default; naive fleet stopping leaks
  (E[M_τ]=1.25 counterexample). Our nonstationarity plausibly VIOLATES 3.1 → no automatic
  fleet-FDR theorem (corroborates the empirical-only finding).
- **O5 — Assumption-3.1 via the common-mode covariate (NEW, high-value direction). 🔧 PROTOTYPED
  (2026-06-26).** If a good observed common-mode estimate `X_n` makes the per-shard residual
  conditionally Markov (`Y_n ⊥ past | X_n`), it RESTORES the global-e-process property and EARNS a
  *conditional* theorem-backed fleet-FDR (Cor 3.4 of 2502.08539). This makes "better common-mode
  estimation" (ADR 0016's lever, P5) not just a power knob but the path to a real conditional
  guarantee. Per-alert stays dead; conditional fleet may be recoverable. **PROTOTYPE:
  `tools/conditional-markov.ts` + the `tools/walls-validation.ts` sweep (Tessera ADR 0018)** — an
  operational Assumption-3.1 diagnostic (residual conditional-whiteness); empirically, as common-mode
  removal degrades the diagnostic rises AND stopped-e-BH fleet-FDR crosses q. NECESSARY-condition gate,
  not a sufficiency proof. **GWDG test DONE (2026-07-28): FAILED AS PREDICTED, and the diagnostic
  says so — 0/384 cells markov-plausible** (LOO common-mode covariate; conditioning halves serial
  dependence on workload counters — POWER 0.90→0.51 — and barely dents thermal/clock; medians
  0.46–0.85, not borderline). No conditional fleet-FDR theorem earned on this substrate with this
  covariate; the fleet claim stays empirical (consistent with N1/ADR 0019). The condLag1 medians
  are the quantified baseline any forecast-as-X_n (ADR 0024 upside) must beat.
  `research/2026-07-28-gwdg-o5-diagnostic.md`; `tools/gwdg-o5-diagnostic.ts`.
  **O3 construction-gap update (2026-07-02 W2): CLOSED CONDITIONALLY — `srEDetector` uses per-onset
  increments Λ^(j) = Π g(r_s) with the FIXED-grid Gaussian-LR mixture, which ARE genuine e-processes
  given the standardized residual null, so the SRR ARL theorem holds conditional on the emitter
  contract (no promotion question remains for that variant; the UI-increment e-detector stays the
  disclosed-empirical comparator for unstandardized regimes). The remaining open item is the residual
  null itself — the same wall the two-mode gates own.**
  - **O5 calibration sub-result — anytime-valid SERIAL-dependence monitor. ✅ DONE (2026-06-27, ADR
    0020).** The runtime calibration monitor (ADR 0019 #2) tests only the MARGINAL increment `g(r_t)`, so
    it is provably blind to a unit-marginal AR(1) (catch ≈0% at every ρ); ADR 0019 #3 patched that with a
    fixed-threshold lag-1 whiteness AND-gate (the crutch, ~76% on integrated drift). `tools/serial-
    calibration.ts` makes it anytime-valid: bet `λ_t = c·r_{t-1}` in the canonical conditional e-value
    `exp(λ_t·r_t − λ_t²/2)` (E[·|F_{t-1}]=1 for any past), mixed over `c∈±{.3,.6}`, AVERAGED with the
    marginal martingale. Synthetic harness (600-tick streams): near-unit-root/integrated drift ~100%, iid
    null 0%≤α, marginal breaks preserved. **BUT does NOT subsume whiteness in production — NEGATIVE result
    (mac-mini 1 Hz, commit 25452f7 wired → 2bf76f2 reverted).** The wiring regressed 1 Hz: `gpu_temp_c`
    (near-unit-root residual) stayed Mode B and over-fired (FDP 0.97, aggregate 0.87) where whiteness
    correctly abstains it (FDP 0.000). MECHANISM: whiteness *estimates ρ̂* from the prefix and thresholds it
    (sensitive from short data); the betting monitor must *accumulate* evidence, and the healthy prefix
    (≤1728 ticks) is far shorter than the 21 600-tick detection horizon over which the mild residual is
    destructive — so it never accumulates enough (uncapping doesn't help; the prefix is the limit).
    **Whiteness RETAINED.** Open: the always-on loop accumulates the cohort over the full duration → could
    catch it there (un-validated); or feed a calibration reference at the detection length. ADR 0020.

- **O6 — learned-forecaster residualization (DSIPTS et al.). ⛔ DEFERRED, ENTRY-GATED (2026-07-22,
  ADR 0024).** Evaluated and NOT proceeding now: the cheap in-engine covariate-augmented
  statistical residualizer must be built and benchmarked FIRST (it is the mandatory comparator and
  likely winner per the DLinear-line evidence); Architecture D (baseline-lifecycle scoring) needs a
  MEASURED lifecycle failure rate before any build; DSIPTS-native anomaly scoring rejected
  outright. Gates G1–G4 in `decisions/0024-*` apply to any Tessera testing/changes once the mac
  mini 1 Hz baseline clears (~2026-08-29) — incl. the three-arm race (statistical / forecast /
  spatial-null), the σ̂-perturbation probe, long-window-only null gates (GWDG cannot serve them),
  and the strictly-exogenous covariate allowlist. Upside if gates open: forecast-as-X_n for O5
  (conditional fleet-FDR via Assumption 3.1).
- **Fleet SupFDR (FDR-at-all-times). 🔧 PROTOTYPED (2026-06-26).** `tools/supfdr.ts` (Tessera ADR
  0018): the √E−1 adjuster (Carefree, arXiv:2501.19360) makes a running-max e-process a valid all-times
  e-value (`∫_1^∞ A(e)/e² de = 1`), so e-BH controls **SupFDR ≤ q** under arbitrary dependence where
  naive running-max e-BH leaks (≈1.08α). Accept-to-reject monotone; real (√-shrinkage) power penalty.
  _Open: donation-e-LOND (arXiv:2603.24792) as the tighter alternative SupFDR route._

---

## 3. Bibliography (e-value / anytime-valid multiple testing)

Convention: PDFs (when retrieved) live in `research/papers/<arxiv-id>.pdf` (gitignored;
copyright). **Tag:** `[WALL]` = touches our upstream problem (per-stream validity /
nonstationarity / transient detection / metric choice); `[LAYER]` = improves the
FDR-combination layer above already-valid e-values. Tags marked *pending* are confirmed by
the § 4 deep-research pass.

| Paper | arXiv / venue | Tag | Status |
|---|---|---|---|
| Dandapanthula & Ramdas 2025 — Multiple testing in multi-stream sequential change detection | **arXiv:2501.04130** | **[WALL]** metric choice (EOP) + impossibility | ✅ VERIFIED 3-0 (O1) |
| Wang, Dandapanthula & Ramdas 2025 — Anytime-valid FDR control with the stopped e-BH procedure | **arXiv:2502.08539** | **[WALL]** aggregation validity (Assumption 3.1) | ✅ VERIFIED 3-0 (O4/O5) |
| Xu, Fischer & Ramdas 2025 — Bringing closure to FDR control (closed e-BH) | **arXiv:2504.11759** | [LAYER] power upgrade | ✅ VERIFIED 3-0 (free power, same boosting caveat) |
| **Shin, Ramdas & Rinaldo — E-detectors: nonparametric sequential change detection** | **arXiv:2203.03532** | **[WALL]** transient onset — O3 | ✅ VERIFIED 3-0 — the construction that closes the transient wall |
| **Koning & van Meer 2026 — Anytime validity is free** | **arXiv:2501.03982** (JRSS-B; ~~2605.06521~~) | [WALL] sequentialize | ✅ VERIFIED — "free" = terminal-equivalence only; no transient gain |
| Tavyrikov, Goeman & de Heide 2025 — Carefree multiple testing with e-processes (FDR-sup adjuster) | **arXiv:2501.19360** | [LAYER] suprema/running-max | ✅ VERIFIED 3-0 — naive running-max e-BH fails (1.08α); adjuster needed |
| Xu & Ramdas 2024 — Online multiple testing with e-values (e-LOND) | **arXiv:2311.06412** (~~2501.19360~~) | [LAYER] online FDR | ✅ VERIFIED — FDR at stopped config, NOT time-uniform |
| Xu, Fischer & Ramdas 2026 — Online e-closure + donation compound e-values (SupFDR) | **arXiv:2603.24792** | [LAYER] SupFDR / late-upgrade | ✅ VERIFIED 3-0 — SupFDR under arbitrary dependence |
| Wang & Ramdas 2022 — FDR control with e-values (e-BH) | arXiv:2009.02824 / JRSS-B 84(3):822 | [LAYER] foundational | ✅ confirmed (P3) |
| Choe & Ramdas 2024/26 — Combining Evidence Across Filtrations (adjust-then-combine) | **arXiv:2402.09698** | [LAYER] cross-filtration | ✅ VERIFIED 3-0 — adjusters lift e-processes across filtrations (necessary, not just sufficient) |
| Blier-Wong & Wang 2024 — Improved thresholds for e-values | arXiv:2408.11307 | [LAYER] thresholds | confirmed dropped (N5) |
| Goeman/de Heide/Solari 2025 — e-Partitioning Principle | (pending) | [LAYER] post-hoc/RCA | pending |
| Xu/Solari/Fischer/de Heide/Ramdas/Goeman 2025/26 — Bringing Closure to FDR Control | (pending) | [LAYER] post-hoc/RCA | pending |
| Preuße 2025/26 — Anytime-valid simultaneous TDP lower bounds | (pending) | [WALL]? post-alert TDP | pending |
| Clerico 2026 — Time-sensitive anytime-valid testing | arXiv:2603.19551 | **[WALL]?** reward-early betting — O3 | NOT verified (2 passes) — open follow-up |
| Taga, Oymak & Shekhar 2026 — Learning to Bet for Horizon-Aware AVT | (pending) | **[WALL]?** horizon-aware betting — O3 | NOT verified (2 passes) — open follow-up |
| Grünwald, de Heide & Koolen 2024 — Safe Testing | JRSS-B 2024 (1906.07801) | [LAYER] foundational | confirmed (P2) |
| Vovk & Wang 2024 — Merging sequential e-values via martingales | EJS 2024 | [LAYER] combination | pending |
| Ramdas 2025 — Hypothesis Testing with E-values (monograph) | — | reference | pending |
| Farran 2026 — Anytime-Valid Calibration Monitoring (PITMonitor) | **arXiv:2603.13156** | **[WALL]** drift/calibration monitoring | ✅ VERIFIED 3-0 — mixture e-process PIT monitor; **substantially longer delay under *local* (mild) drift** (corroborates ADR 0020) |
| Saha & Ramdas 2024 — Testing Exchangeability by Pairwise Betting | **arXiv:2310.14293** (AISTATS) | **[WALL]** serial-dependence e-test | ✅ VERIFIED 3-0 — single-obs betting powerless; pairwise → power-one (even-stopping caveat) |
| Podkopaev, Blöbaum, Kasiviswanathan & Ramdas 2023 — Sequential Kernelized Independence (SKIT) | **arXiv:2212.07383** (ICML) | **[WALL]** independence-via-betting; mild-regime power | ✅ VERIFIED 3-0 — detection time `~log(1/α)/√HSIC` (mild dep → long delay; ADR 0020) |
| Grünwald, Henzi & Lardy 2024 — Anytime-valid conditional independence (e-statistics) | **arXiv:2209.12637** (JASA) | **[WALL]** CI-via-betting (model-X cost) | ✅ VERIFIED 3-0 |
| Shaer, Maman & Romano 2023 — Model-free sequential testing of conditional independence | **arXiv:2210.00354** (AISTATS) | **[WALL]** CI-via-betting (model-X CRT) | ✅ VERIFIED 3-0 |
| Prediction-Powered E-Values 2025 | (pending) | [WALL]? auxiliary-model FP | pending |

_(Full curated list — incl. e-GAI, online closed testing, FWER-with-e-values, Vovk–Wang
true/false discoveries, Blanchard–Neuvial–Roquain — in the source message; add rows as read.)_

---

## 4. Deep-research outputs

- **2026-06-26 — primary-source audit of the priority papers** (run `wf_b69c520a-589`;
  24/25 claims verified 3-vote, all priority papers read from open arXiv). **Report:**
  [research/2026-06-26-evalue-metric-audit.md](research/2026-06-26-evalue-metric-audit.md).
  Headline: control **EOP** for the streaming detector (a verified impossibility theorem
  makes worst-case FDR uncontrollable at finite ARL); fleet-FDR stays conditional on the
  stopped-e-BH no-leakage condition (Assumption 3.1), which our nonstationarity plausibly
  violates — corroborating "fleet-FDR is empirical, not a theorem." No source contradicts
  ADR 0005/0006/0009/0013.
- **2026-06-26 — transient-fault detection, focused pass** (run `wf_54ed96dd-e49`; 24/25
  verified). **Report:**
  [research/2026-06-26-transient-fault-detection.md](research/2026-06-26-transient-fault-detection.md).
  Headline: transient power and per-stream validity are **two separate walls**. The
  **e-detector** (Shin–Ramdas–Rinaldo, arXiv:2203.03532; SR `Σ_j Λ^(j)` / CUSUM `max_j`
  over candidate onsets) is the named construction that closes the transient wall; the
  nonstationary-null validity wall persists inside the increments `Λ^(j)`. Koning–van Meer
  "free" = terminal-equivalence only (sequentializes, doesn't add transient power). Fleet
  layer: naive running-max e-BH FAILS (FDR≈1.08α); SupFDR needs an adjuster / donation-e-LOND
  (power penalty).
- **2026-06-28 — anytime-valid serial-dependence/calibration testing & FDR-at-all-times** (run
  `wf_ec62d949-67d`; 24/25 verified). **Report:**
  [research/2026-06-28-anytime-valid-serial-and-fdr.md](research/2026-06-28-anytime-valid-serial-and-fdr.md).
  Headline: the literature CORROBORATES ADR 0020's negative result — anytime-valid monitors pay a real power
  penalty in the MILD-dependence regime (SKIT detection time `~1/√HSIC`, arXiv:2212.07383; PITMonitor/Farran
  2026 longer delay under *local* drift, arXiv:2603.13156), and no source matches short-window `ρ̂`
  sensitivity for mild-but-accumulating dependence. Hybrid estimate-then-bet = open lever (conjectural).
  Constructions: pairwise-betting exchangeability (Saha–Ramdas, arXiv:2310.14293), CI-via-betting
  (Grünwald–Henzi–Lardy 2209.12637; Shaer–Maman–Romano 2210.00354, model-X cost). The stopped-e-BH causal
  condition (2502.08539) is the concrete check for conditional fleet-FDR (O5).
- **2026-06-28 — concurrent-control / spatial-null methodology (Mode B prior art + pitfalls)** (run
  `wf_34494774-318`; 23/25 verified). **Report:**
  [research/2026-06-28-concurrent-control-spatial-null.md](research/2026-06-28-concurrent-control-spatial-null.md).
  Headline: Mode B (ADR 0019) is established prior art — concurrent-control canarying (Google SRE; Netflix
  Kayenta Mann-Whitney + effect-size floor) + peer/fleet "odd-one-out" (Hendrickx MSSP 2020 arXiv:1912.12941;
  GREYHOUND ATC'25 cohort-median >10%). UPGRADE to the contamination framing: DiD-under-interference
  (arXiv:2512.21176/2509.24259) proves a fault leaking into the control makes the contrast estimand
  TATT−ASC — *uninterpretable* (neither magnitude/direction/sign), not merely weakened. **Gap → ADR 0021
  (BUILT + NEGATIVE RESULT):** a twin-PAIR validity detector was implemented + validated and found
  INSUFFICIENT — κ (cancellation ratio) catches decorrelation but does NOT restore FDR (the harm is a
  sustained shift from low-κ pairs, not variance leak; sweep bottoms at FDP ~0.20 > q + over-excludes clean
  pairs); contamination is undetectable by twin-pair stats (sign-blind contrast + the heterogeneous-loading
  cohort wall, ADR 0012/0015). Real fix = a CONTROL TRIAD (two twins → matched control-vs-control null) →
  **ADR 0022, BUILT + VALIDATED (in-memory):** clustersynth CS_TRIAD 2nd twin + `applyTriadRouting` in
  clustersynth-mode-b.ts (flag contaminated controls via `c1−c2`, re-route detection to the clean sibling
  `t−c2`). Validated end-to-end on real topology, control-only contamination vs the corrected positive set:
  mini twin-pair FDP 0.579→triad 0.000 (recall 1.000), mac-mini R=8 (1728 shards) 0.588→0.000; non-regressive.
  COST (ADR 0022 §Cost): +50% data/compute, memory flat, hardware doubling ONLY for dedicated canaries;
  binding constraint = comparable-peer availability. **Both follow-ups DONE:** streaming-path triad (commit
  0a69e59, 1 Hz validated to R=8 incl. 2-month long-baseline); and the comparable-peer AVAILABILITY study
  (`tools/peer-availability.ts`): real κ-selected sibling peers (not exact-copy twins) at clustersynth's
  `LAMBDA_HETERO=0.4` → ~96% of shards have ≥2 comparable peers at rack-scale pools (availability rises with
  pool, falls with heterogeneity); the deployable real-peer rule is `min(t−c1, t−c2)` agreement (no
  designated-clean sibling; min is a valid conservative e-value) → FDP ≤ q at EVERY heterogeneity (pair
  detector FP-dominated ≈0.5). The κ gate converts non-comparability from an FDR risk into an availability
  cost (no comparable peer → no triad → abstain, Mode A). **REAL-TELEMETRY ANCHOR (Phase 4 first cut,
  `tools/gwdg-comparability.ts`):** measured within-node peer κ on real GWDG A100 DCGM (Zenodo
  10.5281/zenodo.19052367) — median κ 0.42/0.88/0.64 (temp/power/util), only 8–23% of GPUs have a κ≤0.1
  peer (real siblings run different JOBS → little workload common-mode cancels; temp best via shared cooling,
  power worst). Only the STRUCTURAL κ is valid off GWDG — detection/FDR would NOT be (≤10-day incident
  windows ≠ a representative baseline; baseline-guard forbids it; a thin baseline's fit fails to transfer →
  A/A false-fires from thinness, not a real property — DO NOT report GWDG detection/FDR). Calibrated the
  synthetic model to the real κ (added a per-job common-mode → bimodal κ; `--gwdg`): at real availability the
  κ-gated min-triad controls FDP ≤ q on the eligible subset (0.03/0.00/0.07). Real-cluster Mode B is
  AVAILABILITY-bound, not FDR-broken; **job-aware peer selection** is the coverage lever; a representative-
  baseline null/detection run needs a long continuous feed (shadow-deploy — no public dataset supplies one).
  NB: tiling/padding short data to fake a baseline is INVALID (adds duration, zero info; games the guard).
  GREYHOUND uses contrast for localization, temporal for detection.
- **2026-07-21 — active synthetic-canary guarantee program (simulation-validated; ADR 0023).**
  **Report:** [research/2026-07-21-canary-guarantee-program.md](research/2026-07-21-canary-guarantee-program.md);
  SPEC `docs/SPEC-canary-guarantee-program.md`; harness `tools/canary-sim.ts`/`canary-experiments.ts`;
  results `runs/2026-07-21-canary-sim/`. Headline: **randomized contemporaneous canary ranks give the
  design-based version of Mode B's spatial null** — controlled versioned workload manufactures the
  comparability that caps passive Mode B at 8–23% (ADR 0022 GWDG), and randomized placement yields
  EXACT finite-sample conformal p → anytime e-process (global filtration ⇒ stopped e-BH sound, O4
  satisfied by construction) → per-family FDR. Calibration exactly nominal in all 14 healthy-drift
  scenarios at 10k+100k GPUs where historical baselines collapse (0.54–0.67); contamination ≤20% is
  conservative-only; adaptive escalation valid with RANDOM peer drafts (suspect drafts mask).
  NEGATIVE results (§ 3.1 of report): naive qualification group-handicap mints pseudo-faults from
  estimation noise; pooled-execs permutation under-covers under within-group correlated noise; raw
  cross-group ranks compound serially on persistent benign offsets → the surviving group construction
  (studentized-change cross-group conformal, lag+burn-in) is EMP-CAL, per-family only (N6 stands).
  ECONOMICS: coverage, not severity, is the wall — sentinel β=0.05% detects rack@2–5% in ~5–7 d
  (≈1 rack event/month breaks even) and anchored catches 3% common-mode in ~6 h (1 day earlier ≈ 60
  days of budget); single-GPU @1% is sentinel-undetectable at every β ≤ 1% — do NOT justify a canary
  program on small single-GPU discovery. Verdict: adopt scoped (guarantee = relative contemporaneous
  surface only; anchored = triage, N1). **SAME-DAY CROSS-CHECK on clustersynth
  (`tools/canary-crosscheck.ts`, report § 8b): (a) caught + fixed fixed-split dilution — plain
  product e-processes replaced by the geometric-onset-prior mixture (ADR 0023 correction; delay now
  onset-independent); (b) ladder calibration transfers exactly to the calibrated generative model
  (A/A 0.0096–0.0102); (c) a 4-idio-σ fault ≈ 0.13 own-σ in passive counters (~30× SNR loss) ⇒
  probe scores MUST come from the controlled workload itself — passive sampling + estimated
  per-unit references reproduce the N1/ADR-0013 pathologies (masking at sparse coverage, plug-in σ̂
  compounding at dense); with probe-like SNR, recall 0.96–1.00 and cdu shared faults detect in
  0–8 d.**
- **2026-07-02 — full math audit of Tessera + engine vs the cited papers** (5 parallel audit passes:
  e-value constructions, e-BH/FDR layer, Mode B spatial null, localization, baseline/whitening+claims).
  **Report:** [research/2026-07-02-math-audit.md](research/2026-07-02-math-audit.md). CONFIRMED exact:
  engine e-BH, √E−1 SupFDR adjuster, normalized onset mixture, safe-t, serial-calibration composition,
  fixed-time stopping discipline. **Corrected in the same-day fix PR:** metric-router fed the SR
  running-max peak (not an e-value) to e-BH; triad flag-then-substitute routing → **min rule** (ADR 0022
  correction); mode-b-loop per-cycle re-normalization → **geometric onset prior** (one e-process across
  cycles ⇒ SupFDR ≤ q covers first-crossing dispatch); gaussian-lr plug-in caveat; κ common-mode fraction
  = 1−κ/2; groupAttribution empty-selection bug; R72/R77 oracle-DGP + ramp-slope caveats. **Standing
  (not yet fixed):** engine BF invalidity (E≈1.155 — ADR 0013 correction; substitute safe-t, engine-side);
  UI "by construction" proof hole (P1 note; empirically fine); plug-in σ̂/φ̂ sensitivity of the mixture
  increment (10% σ̂ error ⇒ null mean 0.52→7.6) held only by uncalibrated gates; mixed-cadence prefix-fit
  guard loophole; no locality (hop-distance) metric; localization improvement program (calibrated group
  e-values, coarse-to-fine drill-down, leave-one-out factors, contrast-based ranking). See the report's
  prioritized recommendation list.

- **2026-07-25/26 — the A2 line: adaptivity, monitor gating, and persistent heterogeneity.** Six
  reports, in dependency order. Each one CHANGED the conclusion of the previous, so read them in
  sequence or read only the last two.
  1. [formal-statements-adaptivity-and-gating](research/2026-07-25-formal-statements-adaptivity-and-gating.md)
     — the ADR 0023 guarantee is a five-link chain; links L1/L4 rest on one prose sentence
     (*"each round's randomization is fresh"*). States **Gap A** (design ignorability; suspect-enriched
     drafting breaks conditional exchangeability, and only via persistent components) and **Gap B**
     (the guarantee runs behind a revocable monitor ⇒ `sup FDR ≤ max(q, β)`, β = the monitor's miss
     rate, never measured). Localises the E4 failure: per-test rate went CONSERVATIVE (0.0082) while
     FDP tripled, so the break is in accumulation/stopping, **not** in rank super-uniformity.
  2. [conjecture-a2-resolution](research/2026-07-25-conjecture-a2-resolution.md) — P6 above. Carries
     a same-day correction note. ⚠️ Its ICC ≲ 0.25% target is DEAD — but so is the 9.5% that first
     replaced it. **The live figure is ICC ≲ 1.5%**, on the axis corrected by N11 (the earlier figures were measured with a downward-biased estimator); see P7,
     which now carries both corrections. Do not read "superseded by P7" as "P7's original number".
  3. [theta-tau-measurement](research/2026-07-25-theta-tau-measurement.md) — **eight of fourteen E1
     healthy scenarios contain no unit-level persistent heterogeneity at all** (the family varies
     round- and fleet-common effects, which a within-round rank cancels by construction).
     ⚠️ **Was "ten of fourteen" before N11 rescaled the axis**: H10 and H11 crossed the floor once the
     interference channel entered the estimator. On the corrected axis, where persistence exists it is
     H2 ICC 10.8%, H14 9.4%, H8 3.9%, H12 2.0%, **H11 1.3%, H10 0.8%** — note the last two are REAL
     but modest, so "where it exists it is large" no longer holds. τ closes negative (N8, narrower
     margin). E1's whole 60-day horizon is **T ≈ 5 rounds per unit** at β=0.05%.
  4. [a2-e1b-horizon-experiment](research/2026-07-25-a2-e1b-horizon-experiment.md) — P8 above.
     A/A sweep to T=320 on the SHIPPED primitives: per-test FPR nominal everywhere; iid control pages
     zero at every horizon; H2 breaches the Ville budget. Refutes the Λ magnitude.
  5. [a2-tail-probability](research/2026-07-25-a2-tail-probability.md) — P7 above.
  6. [a2-delta0-derivation](research/2026-07-25-a2-delta0-derivation.md) — N7 above. The one to read
     if you read only one.
  7. [a2-dispersion](research/2026-07-26-a2-dispersion.md) — P9 above, closing A2-disp: the whole
     machinery re-derived for the noise-SCALE channel (H8's actual mechanism). Read for the pair
     design gate (ICC ≲ 4% AND ς ≲ 0.15), the λ₀ block-immunity table, the reversed κ_min lever,
     and the e-BH failure that narrows P8 to the location channel.
  8. [a2-disp-ebh-boundary](research/2026-07-27-a2-disp-ebh-boundary.md) — closes A2-disp-ebh:
     paging bracket narrowed to ς̂ ∈ (0.244, 0.305); e-BH onset ς̂ ≈ 0.31 (rare) / robust from
     0.43; **the fleet-size protection REVERSES under dispersion** (N12 — rack-shared λ + e-BH
     step-up cascade; scale is exposure, not protection); the pair gate becomes ENFORCED CODE
     (`tools/dispersion-monitor.ts` → `heterogeneityGatePassing`, consumed by the validity gate for
     `conformal_rank` emitters of either class). Opens A2-disp-ebh-scale (onset vs N at ≥10k).
  9. [a2-disp-ebh-scale](research/2026-07-28-a2-disp-ebh-scale.md) — closes A2-disp-ebh-scale.
     **N13: the e-BH onset COLLAPSES with fleet size and the fixed-ς̂ gate cannot be tightened out
     of trouble.** Onset bracket (last-clean, onset): (0.31, 0.43) @ N=2016 → (0.153, 0.183] @
     4k–10k → (0.123, 0.153] @ 20k (**the ς ≲ 0.15 design-gate point itself fails 3/16 seeds**)
     → ≤0.065 @ 40k (~3× the instrument floor; knob-0 controls clean, so it is the dispersion
     channel, not an anytime artifact). Terminal counts stay superlinear (384 sel/run @ ς̂=0.607,
     N=40320). Gate decision (scale-indexed / bounded selection domain / rack-local construction)
     recorded as A2-disp-ebh-gate-decision — NOT taken.
  10. [rack-local-conformal](research/2026-07-28-rack-local-conformal.md) — **the first measured
     POSITIVE alternative to abstention under dispersion**: blocks drawn within racks cancel the
     shared λ by construction (premise weakens to within-rack exchangeability, N-free). A/A clean
     at every ς̂ to 0.607 at N=2016 AND N=20160 (where fleet-random makes 141.75 false sel/run);
     A/B power DOMINATES under dispersion (0.50 vs 0.07 recall @ δ=0.01, ς̂=0.607) with zero
     false selections. Costs disclosed: rack-level faults leave the channel; within-rack
     exchangeability is the new premise (probe pilot should measure within-rack ς̂). **ADOPTED
     same day (ADR 0026, option C):** `blockScope` contract property + scope-matched gate
     (pooled within-rack ς̂ — rack-demeaning alone does NOT cancel a scale multiplier, the
     rank's invariance does) + whole-rack blocks K=71 (measured best) + N13 cap in code
     (`selectionDomainUnits ≥ 20160` at fleet scope ⇒ not FDR-bearing). **C-sim DONE:
     `blocking: 'rack-local'` in the full sim — @20 160 GPUs/60 d/0.5 % budget the coarse arm
     makes 5449 false selections with calibration exact AND the uniformity monitor silent (the
     β=1 blindness in vivo) while rack-local makes 0 with more true detections (note § 3c).**
     Remaining: C-rack-channel verification, A2-disp-real within-rack pair.
  11. [a2-disp-ebh-horizon](research/2026-07-28-a2-disp-ebh-horizon.md) — closes the horizon +
     rack-count questions. **Dispersion first-passage risk is FRONT-LOADED in T** (the γ=0.99
     onset prior discounts late onsets): fleet onset brackets T-STABLE to 2560 @ N=2016 and
     1280 @ N=20160 — **N13's fleet-size collapse is the ONLY eroding direction** (caveat: a
     property of THIS accumulator; restarts/flatter priors re-expose late risk). **Within-rack
     walls (rack scope, K=71): ς_within ∈ (0.15, 0.2]** — the scope='rack' default ς ≤ 0.15
     validated as the first cut (thin paging margin 1.8/2.0); K is the relief lever
     (K=23 ≈ +tolerance, −0.05 recall). **No N13 at rack count**: group channel clean to 2240
     racks (2/12 runs show one false rack; no cascade — rack draws are iid across racks here;
     leaf/pod-shared knobs unexercised).
  Harnesses: `tools/exchangeability-drift.ts`, `tools/heterogeneity-estimate.ts`,
  `tools/horizon-experiment.ts`, `tools/tail-probability.ts`, `tools/dispersion-drift.ts`,
  `tools/dispersion-ebh-boundary.ts`, `tools/dispersion-ebh-scale.ts`,
  `tools/rack-local-conformal.ts` (+ `tools/dispersion-monitor.ts` runtime gate; tests, 68 total).
- **2026-07-26 — proof-carrying e-values + Lean scaffold.** `tools/e-value.ts` makes the e-value an
  OPAQUE type constructible only by certified constructors/combinators, each carrying the argument it
  relies on; `certifiedFdrBenjaminiHochberg` takes `readonly EValue[]`, so audit findings F1–F5 (all
  the same bug: a non-e-value entering the FDR path) become COMPILE errors — asserted with
  `@ts-expect-error` in `test/e-value.test.ts`. `lean/` holds the discharge queue (**never compiled**
  — no toolchain; all `sorry`). Statements validated against the shipped code first: the e-BH FDP
  lemma over **995,245 engine selections across five adversarial families, 0 violations, worst slack
  exactly 0.0**; rank uniformity EXHAUSTIVELY over `S_{K+1}` for K=2,3,4. See `lean/README.md` and
  `LEAN_QUEUE` in `tools/e-value.ts`. ADR 0025.

---

## 5. How to use this

1. Proposing a detector/FDR/e-value tuning? Check § 1 first — if it's N1–N6, it's closed.
2. Commissioning research? Check § 2 (open) and § 4 (already-run) before spending tokens.
3. New finding? Add a registry row (§ 1) or open question (§ 2) with its source ADR/PR.
4. Retrieved a paper PDF? Drop it in `research/papers/<arxiv-id>.pdf` and update its § 3 row.
