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

### Established POSITIVE results (use these)

| # | Result | Source |
|---|---|---|
| P1 | **UI mean-shift e-value** — `E[e\|H0] ≤ 1` for ANY φ incl. unit root (split-LR / universal inference). ⚠️ 2026-07-02 audit: the "by construction" PROOF has a hole in the engine variant (cal-eval temporally precedes test-train, so the split-LRT independence premise fails for φ≠0); holds **empirically** with ~6× slack (MC E≈0.15 at φ up to 0.999). Underpowered above φ≈0.8. | ADR 0010 + 2026-07-02 audit F5 |
| P2 | **safe-t e-value** (right-Haar / GROW) — variance nuisance integrated out, σ-exact at every cal length. Audit-confirmed exact. ⚠️ NB: the ADR 0013 nuisance-robust **BF** is NOT valid as implemented (E[BF\|H0]≈1.155 at every cal length — recentering breaks the proper-prior property; see ADR 0013 correction note); safe-t is the theorem-valid substitute. | ADR 0005; ADR 0013 correction |
| P3 | **e-BH controls FDR under ARBITRARY dependence** given valid per-input e-values. | Wang–Ramdas 2022 (foundational) |
| P4 | **Auto factor-rank selection** (sequential common-deflation-path null) — the *legitimate* route N3 failed to find: correct rank → homogeneous residual inflation → cancels in e-BH → protects fleet FDR. | ADR 0014 |
| P5 | **Common-mode ESTIMATION is the real detection/localization lever.** Oracle common-mode → 99–100% detection at 0% FPR even for small faults; full-series loading ABSORBS single-shard faults → 0%; cal-only loading → ~16% / 8% FPR. | ADR 0016 (FAIR test) |

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
  not a sufficiency proof. _Open — test on real GWDG (expected to FAIL; the diagnostic should say so)._
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

---

## 5. How to use this

1. Proposing a detector/FDR/e-value tuning? Check § 1 first — if it's N1–N6, it's closed.
2. Commissioning research? Check § 2 (open) and § 4 (already-run) before spending tokens.
3. New finding? Add a registry row (§ 1) or open question (§ 2) with its source ADR/PR.
4. Retrieved a paper PDF? Drop it in `research/papers/<arxiv-id>.pdf` and update its § 3 row.
