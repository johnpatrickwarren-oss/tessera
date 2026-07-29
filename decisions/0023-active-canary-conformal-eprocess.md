# ADR 0023 — active synthetic canaries: randomized conformal ranks → e-processes → per-family stopped e-BH (PROPOSED — simulation-validated)

- **Date:** 2026-07-21
- **⚠️ CORRECTION (2026-07-21, same-day — clustersynth cross-check):** the originally-shipped
  per-unit/group accumulator was the **plain product e-process**, which suffers fixed-split
  dilution: E[log f(U)] < 0 under the null, so a fault onsetting after H healthy increments faces
  ~0.65·H nats of accumulated decay before any evidence counts (measured on the clustersynth
  cross-check: 13 d extra delay for a 4σ fault after 30 d of health; scales with history, so an
  always-on deployment would get arbitrarily slow). **Replaced with
  ½·(plain product) + ½·(geometric-onset-prior mixture)** `M_t = Σ_j (1−γ)γ^(j−1) Π_(s=j..t)
  f(p_s)`, γ=0.99 (`onsetUpdate`/`onsetValue`/`combinedEValue` in canary-sim.ts) — the mixture is
  the repo's established increment object (ADR 0019 normalized-mixture default; the 2026-07-02
  audit's mode-b-loop geometric-prior correction), and the product is its j=1 component, so the
  average is itself a nonnegative supermartingale with E=1 ⇒ Ville paging and stopped e-BH stay
  exact. The combination is within log 2 ≈ 0.7 nats of whichever wins: the product for short
  healthy histories (E5 measured the mixture-only prior cost at ~1–2 d on early-onset marginal
  faults), the mixture for long ones (delay onset-independent forever). All evidence numbers below
  are from the corrected accumulator. Cross-check artifacts:
  `tools/canary-crosscheck.ts` + `runs/2026-07-21-canary-sim/xcheck/`; findings in the program
  report § 8b — headline: ladder calibration transfers exactly to clustersynth telemetry; a
  4-idio-σ fault is only **0.13 own-σ** in passive counters (~30× SNR loss), so probe scores MUST
  come from the controlled workload itself, and estimated per-unit references reproduce the N1/ADR
  0013 pathologies (masking at sparse coverage; plug-in σ̂ compounding at dense coverage).
- **⚠️ CORRECTION 3 (2026-07-26 — A2-disp, P9; `research/2026-07-26-a2-dispersion.md`).** The A2
  line below is derived for persistent LOCATION offsets. Extending it to persistent DISPERSION
  (noise-scale multipliers — H8's actual mechanism) adds two things this ADR must carry:
  1. **The design gate is a PAIR: ICC ≲ 4% AND ς ≲ 0.15** (ς = between-unit spread of log
     within-unit SD, measured by `estimateDispersion` — the ICC gate is blind to it by
     construction). Measured Ville breach bracket ς̂ ∈ (0.15, 0.31) at T = 320, K = 30.
  2. **The § 5 residual-risk list must name the dispersion e-BH failure.** P8's "paging fails
     before FDR; e-BH selections 0.00 everywhere" is LOCATION-specific: a persistently noisy unit
     CONCENTRATES its inflation and crosses e-BH's N/q threshold individually — 14.8 false
     selections/run measured at ς̂ = 0.61, first nonzero at ς̂ = 0.31, from all-HEALTHY fleets.
     This is the first mechanism measured anywhere in the program that defeats Mode-B FDR from
     healthy units at scale.
  Also: the dispersion paging/detection floor is a ratio λ₀ (4.14× noise at K = 30; K = 10 blocks
  are immune; N7's duality applies — it is also the noisy-fault detection floor), H8's corrected
  horizon is T\* ≈ 3 (not 6), and the κ_min lever POINTS THE OPPOSITE WAY for this channel
  (raising it lowers λ₀), so retuning either κ_min or block size must quote both floors.
  **BOUNDARY + ENFORCEMENT UPDATE (2026-07-27 — A2-disp-ebh closed;
  `research/2026-07-27-a2-disp-ebh-boundary.md`).** (a) Brackets refined: paging breach onset
  ς̂ ∈ (0.244, 0.305); e-BH onset ς̂ ≈ 0.31 (rare, seed-dependent), robust failure from ς̂ ≈ 0.43 —
  the ς ≲ 0.15 gate keeps a ~2× margin. (b) ⚠️ **The fleet-size protection REVERSES for this
  channel (N12):** λ is rack-shared, so more units mean more rack draws, and one extreme rack
  cascades through e-BH's step-up (`N/(q·k)`) — false selections grow SUPERLINEARLY with N
  (0 / 3 / 26.5 per run at N = 1008/2016/4032, ς̂ = 0.61). Never argue "N/q is far away at our
  scale"; onset-vs-N at ≥ 10k units is open (A2-disp-ebh-scale). (c) **The pair gate is now
  ENFORCED IN CODE:** `tools/dispersion-monitor.ts` measures ς̂ + ICC on the believed-healthy
  panel (≥ 20 rounds, sticky demotion) and sets `EmitterContract.heterogeneityGatePassing`,
  which `isFdrBearing` requires for `constructionFamily = 'conformal_rank'` in EITHER
  FDR-bearing class — the runtime semantics of Correction 2's missing validity rung. The
  pooled-marginal monitors cannot do this job (β = 1, Correction 2 item 2).

- **⚠️ CORRECTION 4 (2026-07-28 — A2-disp-ebh-scale, N13;
  `research/2026-07-28-a2-disp-ebh-scale.md`).** Correction 3's "the ς ≲ 0.15 gate keeps a ~2×
  margin" was an N = 2016 statement and DOES NOT SURVIVE fleet scale. Measured onset (last-clean,
  onset) vs N: (0.31, 0.43) @ 2016 → (0.153, 0.183] @ 4k–10k → (0.123, 0.153] @ 20k — **the gate
  point itself fails 3/16 seeds** — → ≤ 0.065 @ 40k (~3× the instrument floor; knob-0 controls
  clean). No fixed ς̂ threshold protects `conformal_rank` e-BH accumulation at ≥ 20k units; the
  paging onset falls the same way. Pending the gate decision
  (**A2-disp-ebh-gate-decision** — scale-indexed thresholds / bounded selection domains /
  rack-local blocks), treat any `conformal_rank` emitter serving ≥ 20k units as
  heterogeneity-gate-FAILING regardless of measured ς̂. The measured positive alternative is the
  **rack-local conformal construction** (`research/2026-07-28-rack-local-conformal.md`): blocks
  within racks cancel the shared λ (premise = within-rack exchangeability, N-free) — A/A clean at
  ς̂ = 0.607 at N = 20160 where fleet-random makes 141.75 false selections/run, and MORE powerful
  under dispersion (recall 0.50 vs 0.07 at δ = 0.01) — at the disclosed cost that rack-level
  faults need their own (gated) channel. **DECIDED 2026-07-28: option (c) ADOPTED — ADR 0026**
  (`blockScope` contract property, scope-matched gate with pooled within-rack ς̂, whole-rack
  blocks K = 71, N13 cap enforced in code for fleet scope via `selectionDomainUnits`).

- **⚠️ CORRECTION 2 (2026-07-25/26 — the A2 line; six reports, see RESEARCH-INDEX § 4).** Three
  claims below need qualification. None of this invalidates the design; it narrows what may be
  claimed for it.
  1. **"EXACT-FS" for the unit family is exact PER ROUND only.** With `g(δ) = E[f(p)|δ]`,
     `E_δ[g] = 1` exactly (confirmed empirically to T=320 — per-test FPR stayed nominal in every
     scenario at every horizon), but `E[M_T] = E_δ[g(δ)^T] > 1` strictly for T ≥ 2 whenever
     persistent unit heterogeneity exists. Per-round validity does not survive accumulation. The
     validity-class lattice has no rung for "exact per round, drift-limited across rounds" and needs
     one. (P6)
  2. **The runtime uniformity monitor is PROVABLY BLIND to this failure mode**, not weakly powered.
     It tests the pooled *marginal* conformal-p distribution, which is exactly uniform at every θ by
     the same identity that gives `Λ(1) = 1`. So its miss rate against persistent-heterogeneity drift
     is **β = 1**, and § 5's "catches broad design breaks" cannot be relied on here. The gated
     guarantee is `sup FDR ≤ max(q, β)` and β has never been measured for any violation class.
  3. **The E1 calibration table is weaker evidence than it reads.** EIGHT of the fourteen healthy
     scenarios contain no unit-level persistent heterogeneity at all (this read "ten" until N11
     corrected the estimator; H10 and H11 do carry it, at ~1%) — the family varies drift, steps
     and common-mode, which a within-round rank cancels *by construction* — and at β=0.05% a unit
     accumulates only **T ≈ 5 rounds** over the whole 60-day horizon. E1 could not have detected the
     accumulation effect; it is not evidence against it.
  **What this is, in the end (N7):** an IDENTIFIABILITY result, not a defect. δ₀ — the persistent
  offset above which a healthy unit eventually pages — is the calibrator's Kelly break-even shift,
  i.e. the minimum persistent fault the detector has power against. δ₀ ≈ 1.02% degradation, which
  independently matches E2's measured rack detection floor. The system cannot page on 1% faults and
  ignore 1% benign persistent offsets. § 3's "hidden strata … a semantic boundary, not a bug" was
  right; the boundary now has a number.
  **Operationally:** paging degrades before FDR (P8 — per-family e-BH selections stayed at 0.00 in
  every measured cell), so the qualifier belongs on the paging claim.

  ⚠️ **DESIGN TARGET — FOUR SUPERSEDED FIGURES. USE ONLY THE LAST ROW.**
  Two were wrong, one was on a compressed axis, one extrapolated a boundary from a single point.
  The live figure is the first one that was MEASURED across the band rather than inferred:

  | figure | where it came from | why it is dead |
  |---|---|---|
  | ICC ≲ 0.25% | the loose `Λ` bound | `Λ` is true but operationally vacuous — it saturates at N while realised degradation was 3.3× (P7) |
  | ICC ≲ 9.5% | the steady-state first-passage rate | **falsified by measurement.** H15 sits AT it and runs **10.00 pages/run against a Ville budget of 2.016** — 5× over — and produces the first false e-BH selections seen in any cell. The steady-state form drops the sub-threshold `α^κ(δ)` bulk term |
  | ICC ≲ 1% | H16 measured clean to T=320 | **not wrong, but stated on a compressed axis.** The θ̂ estimator mirrored `execScore` instead of calling it and was biased DOWN twice over (A2-host). H16's true ICC is 1.49%, so the safe boundary is higher than this figure claimed |
  | ICC ≲ 1.5% | H16 on the corrected axis | superseded — H16 was the only clean point measured, so this extrapolated a boundary from one observation |
  | **ICC ≲ 4%** | the A2-icc sweep: bracketed, not extrapolated | **← live figure** |

  **Design target is ICC ≲ 4%** — MEASURED, not extrapolated (A2-icc, 2026-07-26). The sweep puts
  the Ville-budget breach between **6.32% and 8.36%** on both pipelines: 4.28% runs at 12% of budget,
  6.32% at 74%, 8.36% at 198%. 4% is the recommendation because 6.32% is the edge of what was
  measured and its margin is inside Poisson noise on the paged-unit count; it is not a claim that
  6% is unsafe.

  **This RELAXES the previous ≲1.5% by ~3×, and that is the operationally important part.** The
  design instruction is "enrich block keys until residual heterogeneity is below the fault size you
  care about", and enrichment cost rises steeply as the target falls. ≲1.5% came from H16 being the
  only clean scenario anyone had measured — a boundary extrapolated from a single point.

  **THE ICC AXIS WAS RESCALED 2026-07-26 (A2-host closed).** The estimator behind every earlier ICC
  figure mirrored `canary-sim.execScore` rather than calling it, and the mirror was wrong twice, both
  times biasing θ̂ down: it omitted the interference channel, and it used generation 1's noise scale
  for a generation 0 block. On the corrected scale H16 reads 1.49% (labelled 1.0%), H15 reads 12.40%
  (labelled 9.2%), H17 reads 32.97% (labelled 26.5%).

  **No paging result changed** — the simulation always included interference; only the axis was
  compressed, by ~1.3–1.5×. So the figures were internally consistent and the ≲1% advice was, by
  luck, conservative rather than dangerous. The real exposure was external: an ICC measured on real
  telemetry with a correct estimator would have been compared against these numbers and misread by
  ~1.4×, which is precisely the collision A2-θ-real was heading for.

  **The per-path caveat is now RESOLVED, negatively — a single global budget is correct.** The
  sweep ran every cell through both pipelines: the loop path pages less below the boundary (0.75 vs
  1.50 at 6.32%) but **breaches in the same cell**, and by 12.83% is marginally worse. N9 predicted
  this — the geometric mixture buys barrier height, which collapses as δ → δ₀, and the units that
  page are the tail with δ ≳ δ₀. It protects the units that were never going to page. Superseded
  caveat, retained for the record:
  1. ~~It is a single global number covering two paths with different exposure.~~ The 12.4% breakage
     was measured on the ACCUMULATOR path. The loop path (`geometricMixtureEValue`) carries a much
     higher barrier and attenuates false pages ~39× at δ=0.3 — but ~1× at δ₀, so the margin is real
     below δ₀ and absent at it (N9). Per-path budgeting is well-posed but unmeasured; until it is,
     the single ≲1% target governs both.

  **Design against δ₀, not against a rate.** δ₀(θ) = √(a₀² + (1+a₀²)θ²) with a₀ = 0.9128 moves only
  ~10% over θ ∈ [0, 0.5], whereas the rates above have already been wrong twice. Treat any paging
  rate as order-of-magnitude.

  Actionable single sentence, unchanged and still the point: *enrich block keys until residual
  persistent heterogeneity is below the fault size you care about detecting.*
- **Status:** PROPOSED. Design + full simulation program built and run (`tools/canary-sim.ts`,
  `tools/canary-experiments.ts`, `test/canary-sim.test.ts` — 10 tests; results in
  `runs/2026-07-21-canary-sim/`). No production probe runner exists; this ADR fixes the
  statistical contract a production implementation must satisfy.
- **Question:** can controlled, versioned, randomized synthetic GPU workloads give Tessera a
  mathematically defensible FPR/FDR guarantee under realistic fleet nonstationarity, at
  acceptable GPU cost? (SPEC: `docs/SPEC-canary-guarantee-program.md`.)
- **Builds on:** ADR 0019 (Mode B = spatial null; emitter-contract validity classes), ADR 0021/0022
  (control contamination; min-rule; comparable-peer availability is Mode B's binding constraint —
  GWDG: only 8–23% of real siblings are comparable because they run different jobs), N1 (temporal
  per-unit certification DEAD), N6 (no cross-level hierarchical-FDR theorem), P3 (e-BH under
  arbitrary dependence), O4 (stopped e-BH needs global-filtration validity).

## Decision (the contract)

An **active canary** is a controlled experiment the fleet cannot give us passively:

1. **Comparability by construction.** Every contemporaneous executor of canary version v in a
   comparison block runs the *same versioned workload* — the job factor, which caps passive Mode B
   at 8–23% coverage on real fleets (ADR 0022 GWDG anchor), is eliminated by design, not matched.
2. **Design-based exchangeability.** Placement randomized within an eligibility block ⇒ healthy
   executors' results are exchangeable *by the randomization*, whatever the (drifting) fleet state.
   Rank of a unit among its contemporaneous peers is an **exact finite-sample conformal p-value**;
   window-common drift cancels in ranks by construction — no baseline to go stale.

The statistical pipeline (implemented in `canary-sim.ts`, to be mirrored by production):

```
per window w, block B = (probe type × canary version × GPU gen × firmware [× finer]):
  p_u  = randomized conformal rank of u's badness score among B's executors     EXACT-FS
  e_u ×= mean_κ κ p_u^(κ−1)   (mixture calibrator; mean across probe channels)  ANYTIME
  group stat = mean standardized rank of members; MC-permutation p → group e    per level
  stops (fixed grid or optional): e-BH at q per topology family                 per-family FDR
  paging: e_u ≥ 1/α                                                             per-unit anytime FPR
  optional √(running-max e)−1 adjuster → SupFDR (time-uniform) at a power cost
```

Two nulls, never conflated:
- **H0-REL** (relative contemporaneous): supports localization; **structurally blind to
  common-mode** — all peers move together, ranks see nothing.
- **H0-ANC** (anchored versioned envelope): catches common-mode; is a *temporal* null, so N1
  applies — it is **empirically calibrated only** (Mode A / `empirically_audited`), mitigated by
  the fact that a *controlled* workload's drift surface is small (environment + interference,
  not workload mix).

Integration: the canary emitter is an `EmitterContract` (`canaryEmitter()` in canary-sim.ts) —
`construction_valid`, FDR-bearing **only while a runtime assumption monitor passes** (trimmed
two-sided uniformity martingale over the pooled conformal p's: catches broad design breaks —
placement bias, interference asymmetry, version mixing — while staying blind to sparse real
faults). Discoveries route through the gated `fdrBenjaminiHochberg` (ADR 0019 #3 pattern).

## The strongest defensible guarantee (and its class)

> **Conditional on (i) randomized placement within eligibility blocks, (ii) block keys capturing
> eligibility (probe/version/gen/firmware), (iii) no unmodeled asymmetric interference between the
> tested unit and its peers, (iv) randomized tie-breaking:** each per-round conformal p is exactly
> super-uniform (finite-sample, distribution-free); each unit/group e-process is an anytime-valid
> nonnegative supermartingale **with respect to the global filtration** (increments are
> conditionally valid given the entire past, because each round's randomization is fresh — this is
> what makes *stopped* e-BH sound here where O4 blocks it for passive telemetry); e-BH at any
> stopping time controls **that family's FDR ≤ q**; the paging rule controls per-unit anytime FPR
> ≤ α. Adding the √E−1 adjuster upgrades per-stop FDR to time-uniform SupFDR.

Explicitly NOT claimed: a cross-level "hierarchical FDR" theorem (N6 — families are separate);
common-mode coverage by the relative null; any temporal per-unit certification (N1); validity
under suspect-enriched peer drafting (measured to fail — see Evidence).

Guarantee classes used everywhere: EXACT-FS / ANYTIME / DEP-COND / EMP-CAL / HEURISTIC.
Known EMP-CAL degradations inside the design (stated, not hidden):
- **Group handicap.** Persistent *benign* group offsets (rack thermal tilt, H2/H8) are real
  relative deviations — the exact test would flag them forever. Subtracting a qualification-period
  offset fixes the operational semantics but makes group families EMP-CAL, not EXACT-FS.
- **Hidden strata (H12).** A persistent unit-level offset not in the block key (unmodeled hw
  revision) is indistinguishable from a mild fault for the *relative* null. This is a semantic
  boundary, not a bug: the discovery is "relatively deviant," and only block-key enrichment
  (versioned context) narrows it.
- **Anchored envelope** — EMP-CAL by construction (above).

## Evidence (runs/2026-07-21-canary-sim/, eval seeds ≥ 101, N=10,368 + 103,680 spot runs; full report `research/2026-07-21-canary-guarantee-program.md`)

- **E1 (calibration, 20 seeds × 14 scenarios × 60 d):** conformal per-test FPR = 0.0100 ± CI in
  EVERY scenario and every horizon quarter — incl. delayed drift, benign step, common-mode,
  placement bias, interference, hidden strata, 15% missingness. Historical canary baseline: Q4
  0.54 (delayed drift), 0.67 (common-mode), 0.11 (benign step). Passive-z: 2.1× nominal stationary,
  8.7× under drift. Distinct false groups 0.05–0.15/run; false pages ~1/run vs Ville budget 10.4;
  0 false monitor revocations in 280 healthy runs. √E−1 SupFDR variant: repeated-stop leakage → 0.
  **Scale-invariant at 103,680 GPUs.**
- **E2 (fault grid):** the controlling variable is COVERAGE, not severity. At β=0.05% (~0.09
  gpu-probes/GPU/day) single-GPU/host/leaf/intermittent faults are sentinel-invisible at any
  severity; rack@2% → 7/8 at 5.9 d, rack@5% → 8/8 at 4.9 d, power-domain@1% → 8/8, all correct
  level, stop-FDP ≤ 0.05. Fleet common-mode: 0/8 by relative methods (BY DESIGN), anchored ~6 h.
  dcgm-only/canary-only visibility split confirmed (hybrid H is the production shape).
- **E3 (contamination 0–20%):** conservative-direction degradation only (healthy p≤.01 rate
  0.0098→0.0060), FDP ≤ 0.055 throughout, detection 7/8→5-6/8 with stable delay, 0 false
  revocations. **No FDR-breaking contamination level within 20%.**
- **E4 (adaptive, β=0.2%, 3×gpu@5%):** escalation+random drafts: 19.9 d → 7.9 d at 27% lower
  realized cost, calibration intact, FDP ≈ q. SUSPECT-enriched drafts SLOW detection (8.9 d;
  suspects mask each other — the bias direction for a one-sided badness test is missed faults, not
  FPs). Optional-stopping FDP = fixed-grid FDP (global-filtration stopped e-BH holds).
- **E5 (economics, β 0.01–1%):** operating floor β≈0.05%; rack@5% at β=0.05%: 6/6 at 6.9 d,
  saved/cost 0.62 over one 60 d event (≈1 rack event/month breaks even); common-mode 1-day-earlier
  ≈ 60 days of budget; gpu@1% undetectable by sentinels at EVERY tested β — single-GPU
  small-degradation discovery does not pay at nominal capacity cost.

## Follow-ups (flagged)

- **Decompose `runCanarySim`** (carries `anchor:allow no-god-functions no-complex-functions`): the
  window loop is one 600-line stateful sweep; split into top-level stage functions around an
  explicit SimState when the harness next changes materially. Behavior is locked by the 10 tests +
  seeded `scoreChecksum` fingerprints, so the decomposition can be verified bit-identical.
- **Real-probe pilot** on the mac mini once its 56-day baseline clears (~2026-08-29): probe-runner
  mechanics, versioned anchored envelope on real drift, per-core relative ranks (E/P-core blocks) —
  power numbers must be re-measured on hardware (report § 10).
- **Probe-mix optimization**: leaf/host shares (15%/20%) are token coverage at sentinel budgets;
  the mix was not optimized.

## Consequences

- Mode B's coverage constraint (comparable peers) becomes a **design variable**: canaries
  manufacture comparability; availability-bound abstention shrinks to the (block, window) K floor.
- The FDR-bearing surface is the canary observation stream; passive telemetry remains Mode A
  (ranking/attribution within canary-discovered scopes — the hybrid H).
- A canary-definition change is a **new statistical version**: block keys include version; e-processes
  do not pool across versions (enforced by construction in the block key).
- Production MVP (from the program report): sentinel compute+HBM probes at ~0.05–0.1% budget,
  3h comparison windows, per-gen/firmware blocks, escalation with randomized peer drafts,
  correctness validation on every probe, anchored envelope per version for common-mode, weekly
  A/A audit + the runtime uniformity monitor wired to the emitter contract.
