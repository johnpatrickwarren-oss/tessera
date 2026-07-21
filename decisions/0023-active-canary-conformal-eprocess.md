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
