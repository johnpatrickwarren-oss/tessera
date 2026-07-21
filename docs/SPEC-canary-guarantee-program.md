# SPEC — Active synthetic-canary guarantee program (design + validation)

- **Date:** 2026-07-21
- **Status:** Experiment design (this document) + executable harness (`tools/canary-sim.ts`,
  `tools/canary-experiments.ts`, `test/canary-sim.test.ts`).
- **Question:** can controlled, versioned, randomized synthetic GPU workloads ("canaries") give
  Tessera a mathematically defensible FPR/FDR guarantee under realistic fleet nonstationarity,
  at an economically acceptable GPU cost?
- **Prior-decision constraints (RESEARCH-INDEX § 1 — consulted first, per CLAUDE.md):**
  - **N1** — per-shard *temporal* null guarantee is DEAD on nonstationary telemetry. Nothing here
    may claim a certified temporal per-unit null. The canary program targets the *spatial*
    (contemporaneous-peer) null instead, which ADR 0019 already identifies as Mode B's home.
  - **N6** — the ambitious two-level hierarchical-FDR theorem is DEAD. Topology levels get
    *separate per-family* e-BH runs (per-family FDR), never a combined cross-level guarantee.
  - **N3** — no cross-sectional empirical-null recalibration before e-BH.
  - **P3** — e-BH controls FDR under arbitrary dependence given valid per-input e-values: the
    load-bearing combination theorem.
  - **ADR 0019** — Mode B guarantee = spatial null (concurrent control); validity is an emitter
    contract with a revocable `validity_class`, enforced in code.
  - **ADR 0021/0022** — control contamination makes a pair contrast uninterpretable; the
    deployable rule is min-agreement over ≥2 comparable peers; comparability (κ gate) converts
    FDR risk into availability cost. GWDG anchor: passive comparability is availability-bound
    (8–23%) because real siblings run different jobs.
  - **ADR 0020** — anytime-valid calibration monitors pay a real delay penalty under mild drift;
    marginal monitors are blind to serial dependence. Envelope/anchored monitors inherit this.

## 1. Why canaries change the picture (hypothesis, to be tested)

Mode B's validated guarantee needs a comparable concurrent peer. On real fleets, passive
comparability is scarce (different jobs → common-mode does not cancel; GWDG: 8–23%). A canary
is a **controlled experiment**: same versioned workload, same inputs, same image, run on many
units in the same time window, with **randomized placement**. That does two things passive
telemetry cannot:

1. **Comparability by construction** — every contemporaneous executor of canary version v in
   context block B runs *the same job*, so the job factor (the decisive non-comparability axis,
   ADR 0022) is eliminated by design, not matched empirically.
2. **Design-based exchangeability** — if which units run the canary at time t is randomized
   within an eligibility block, the healthy-unit results are exchangeable *by the randomization*,
   yielding exact finite-sample rank p-values (conformal), independent of the (unknown,
   drifting) fleet state at t. Drift common to the window cancels in ranks.

## 2. The two nulls (kept strictly separate)

**H0-REL(u, B, w) — relative contemporaneous null.** Conditional on comparison block B (canary
version × probe type × GPU generation × firmware bucket × [optional finer context]) and window
w: unit u's canary result is exchangeable with the results of contemporaneous eligible peers in
(B, w). Supports localization of *relative* faults. **Blind to common-mode by construction** —
a fleet-wide slowdown moves all peers together and is invisible to ranks. Never claim
otherwise.

**H0-ANC(v) — anchored global null.** For canary version v under its versioned reference
envelope: the contemporaneous canary *population* statistic (e.g. trimmed median normalized
score) lies within the envelope. Detects common-mode degradation. This is a *temporal* null
(envelope certified at qualification time, applied later), so N1 applies: it cannot be
theorem-certified over an open horizon under environmental drift. Honest target = empirically
calibrated envelope + anytime-valid drift monitor with a controlled false-revocation rate
(calibration-monitor pattern, ADR 0019 #1). The mitigating structural fact (tested here): a
*controlled* workload's result is invariant to fleet workload-mix/scheduler drift except
through interference and environment (thermal season, firmware) — a much smaller drift surface
than passive telemetry's.

## 3. Statistical construction under test (the "preferred guarantee target")

Per probe execution round, within block (B, w):

1. **Scores.** Each executor u yields scalar badness score y_u (per metric; one-sided; ties
   broken by seeded uniform randomization).
2. **Conformal rank p-value.** p_u = (1 + #{peers j : y_j ≥ y_u}) / (K+1), K = #peers.
   Exact super-uniformity under H0-REL — finite-sample, distribution-free. Granularity floor
   p ≥ 1/(K+1) is a *power* cost, never a validity cost.
3. **Per-unit e-process.** e_u(t) = Π_rounds f(p) with f a mixture calibrator
   f(p) = mean_κ κ p^{κ−1}, κ ∈ {0.05..0.9} (∫f = 1). Each increment is conditionally valid
   given the past (peers are contemporaneous; placement randomized independently of past
   scores), so e_u is a nonnegative supermartingale under H0-REL ⇒ anytime-valid (Ville).
   **Adaptive probing of u (frequency escalation) does not break this**, provided the *peer
   draft* for each round remains randomized from the eligible block, not enriched with other
   suspects (§ 8 tests exactly this failure).
4. **Group e-processes.** For rack/switch/domain g: rank the group aggregate (median of member
   relative scores in (B, w)) among peer groups → group conformal p → group e-process.
   Separate hypothesis family per level (N6).
5. **FDR layer.** e-BH at level q per family over stopped e-values (stopping time shared per
   family; e-BH tolerates arbitrary within-family dependence, P3). Per-unit FWER-style paging:
   e_u ≥ 1/α (Ville) as the anytime-valid single-hypothesis contract.
6. **Anchored layer.** Envelope test on the population statistic per version; e-process over
   envelope exceedances with empirically-set tolerance; classified `empirically_audited`
   (Mode A per ADR 0019) unless a physical-tolerance argument is certified.

**The claim to be tested, precisely:** *conditional on (i) randomized placement within
eligibility blocks, (ii) block covariates capturing eligibility (gen/fw/version), (iii) no
unmodeled interference tying a unit's score to its own health-irrelevant context asymmetrically
vs peers, (iv) ties randomized — the per-round conformal p is exactly super-uniform in finite
samples; the per-unit product is an anytime-valid e-process; stopped e-BH per family controls
that family's FDR ≤ q at any stopping time measurable in the family's filtration.* Assumption
(iii) is where reality attacks; §§ 6–8 probe it.

## 4. Guarantee classes (used in all reporting)

| class | meaning |
|---|---|
| EXACT-FS | exact finite-sample, by randomization/conformal construction |
| ANYTIME | supermartingale + Ville / stopped e-BH; exact given valid increments |
| DEP-COND | exact under stated dependence condition |
| EMP-CAL | empirically calibrated approximation (report where it fails) |
| HEURISTIC | operational score, no calibration claim |

## 5. Simulator (`tools/canary-sim.ts`)

Probe-level event simulator (NOT a 1 Hz telemetry stream — the observation unit is one canary
execution). Topology: GPU → host (4) → rack (72, NVL72 convention) → leaf-switch group (4
racks) → power/cooling domain (16 racks) → region. N configurable 1k…100k. Context:
3 GPU generations (perf offset + variance), firmware within gen, software image, resident
workload class (interference), per-rack thermal offsets, region effects.

Score model per execution (badness scale, 1.0 = nominal):
`y = gen/fw effect × (1 + envDrift(t) + diurnal(t)·sens + rackEffect + regionEffect +
interference·load(t) + heteroNoise + faultEffect(u,t)) + measurementNoise`, with knobs per
healthy scenario H1–H14 (stationary; correlated; slow global drift **starting after the first
10% of the horizon**; diurnal; abrupt benign regime step; workload-mix change; scheduler-policy
change; per-rack/gen heteroskedasticity; missing/irregular execution; placement bias; canary
interference; partial exchangeability violation; all-peer common-mode slowdown; gradual aging).
Faults: single GPU / k GPUs / host / rack / leaf switch / power domain / region / fleet
common-mode / intermittent / class-conditional / DCGM-only / canary-only / correctness-only,
severities 0.1–5% + catastrophic, controlled onset.

Scheduler: round cadence dt, budget fraction β → concurrent probe slots; randomized placement
(stratified by block), optional placement-bias knob; two-stage adaptive mode (sentinel rate +
evidence-triggered escalation with configurable peer-draft policy). Seeded RNG (mulberry32-style,
no Date/Math.random); every run reproducible from (seed, config).

Horizon: 60 days minimum for any reported result (METHODOLOGY rule 1 in spirit: drift cycles
must be in-window; delayed-drift scenarios activate after day 6). `baseline-guard`'s
assertLongBaseline is honored on the one temporal-baseline method (B) — its history window is
≥ 56 d.

## 6. Comparison systems

| id | system | guarantee class targeted |
|---|---|---|
| A | passive proxy (trailing per-unit temporal baseline → z → BH) | none (known-broken; control) |
| B | static historical canary baseline (per-block history z / empirical quantile → BH) | EMP-CAL at best |
| C | contemporaneous peer ranks, coarse blocks, per-round BH | EXACT-FS per round |
| D | Mondrian conformal (fine blocks: +rack-tier context) | EXACT-FS per round |
| E | randomization/permutation test at group level | EXACT-FS |
| F | sequential e-process over rank increments (per unit + per group) | ANYTIME |
| G | stopped e-BH per topology family over F's e-values | ANYTIME (per family) |
| H | hybrid: G's discovery set + passive telemetry for within-scope attribution | inherits G for discovery; HEURISTIC for attribution |
| I | anchored global envelope detector | EMP-CAL (target); tested for when it breaks |

## 7. Experiments

- **E1 calibration (healthy).** H1–H14 × {A,B,C,D,F,G,I} × ≥20 seeds × 60 d. Metrics:
  per-test FPR vs α over time (early vs post-drift-onset windows), FDP distribution (not just
  mean), FWER for the paging rule, calibration under optional stopping (stop at first crossing
  vs fixed grid). Key contrast: B (historical) vs C/D/F (contemporaneous) after delayed drift.
- **E2 faults.** Fault catalog × severities × seeds, at fixed budget. Metrics: detection delay,
  power/recall, precision, localization level accuracy + hop distance, FDP among discoveries,
  false pages. REL vs ANC split: fleet common-mode must be caught by I and MISSED by C–G
  (assert the blindness rather than hide it).
- **E3 contamination.** Degraded-peer fraction 0–20%: rank validity for healthy units
  (conservativeness direction), power decay, reference-set refinement (trimmed/robust/coherent-
  component) — find the breaking level.
- **E4 adaptive sampling.** Sentinel+escalation vs fixed-rate at matched average budget:
  delay, peak cost, localization, and the **peer-draft validity experiment** (escalated rounds
  drafting random peers [valid] vs suspect-enriched peers [invalid → measure the damage]).
- **E5 economics.** Budgets β ∈ {0.01,0.02,0.05,0.1,0.2,0.5,1}%: coverage intervals per
  GPU/host/rack, minimum detectable severity vs delay, GPU-hours wasted vs canary GPU-hours,
  break-even fault sizes, Pareto frontier. Report GPU-hours natively; $/GPU-h conversion is a
  configurable multiplier only.
- **Tune/eval split.** Any tuning (calibrator mixture, block sizes, escalation thresholds) uses
  seeds 1–5; all reported numbers use disjoint seeds ≥ 100 and scenario/fault draws not used in
  tuning.

## 8. Failure modes deliberately hunted

1. Delayed drift certifying on the first 10% then breaking B (and A) — the headline contrast.
2. Placement bias (H10): non-random placement correlated with rack thermal state → conformal
   p anti-conservative. Measure size of violation vs bias strength.
3. Interference (H11): canary results coupled to co-located production load; if load is
   asymmetric across peers in a block, exchangeability breaks. Quantify.
4. Suspect-enriched peer drafts under escalation (adaptive-selection bias) — E4.
5. Rack-level fault with rack-blocked Mondrian conformal (D): blocking absorbs the fault →
   missed; must be caught by the rack-level family (G) — the level/blocking tradeoff, explicit.
6. Common-mode blindness of all relative methods (H13) — assert I catches, C–G do not.
7. Envelope staleness (I) under gradual environmental drift (H14) — false-alarm rate over time,
   drift-monitor revocation delay (ADR 0020 penalty expected).
8. Version mixing: observations across canary versions must never pool (enforced by block key);
   test that a version change mid-horizon does not manufacture discoveries.

## 9. Outputs

Architecture assessment; strongest-defensible-guarantee statement + assumption list +
violation list; this SPEC; the executable harness + tests; result tables (FPR/FDR/FDP-dist/
power/delay/localization ± CIs); cost curves + Pareto frontier; DCGM complementarity analysis;
MVP production canary design; verdict in the four-category scale.
