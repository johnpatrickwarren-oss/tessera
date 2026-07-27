# Handoff — Tessera two-mode architecture (ADRs 0019–0025 + scale validation)

> **SINGLE SOURCE OF TRUTH for current status** (date · suite · what's built · what's next). `STATE.md` is the
> durable decision/arc trail (history); `README.md` defers here for the live count. Keep this header current.

**Date:** 2026-07-27 · **Branch:** `main` (in sync with origin, `63a4983`) · **clustersynth
HEAD:** `b0f0530` (main; control-arm + `CS_FAULT_MAG` merged).
**Suite:** 957 tests · 950 pass / 0 fail / 7 skip (skips = local clustersynth s2/c0 fixtures).

**Read first:** `decisions/0019` (architecture) → `0022` (control triad) → `0023` (canary guarantee
program — including CORRECTION 1 + 2) → `0025` (proof-carrying e-values). Then `RESEARCH-INDEX.md`
§1–4 and `docs/METHODOLOGY-scale-and-duration-testing.md`.
Memory carries the condensed version (`project_adr0019_two_mode_architecture` + the feedback notes).

---

## The architecture (one paragraph)
Tessera is **two modes**, gated per-emitter by a `validity_class`: **Mode A — evidence/ranking + abstain
(DEFAULT, no FDR claim)**, the always-on substrate; **Mode B — FDR-guaranteed (conditional, narrow)**, e-BH
discovery admitted only for `theorem_valid`/`construction_valid` emitters. Mode B's guarantee is a **SPATIAL
null** — a concurrent control twin, `d = treatment − control`, which cancels the common-mode the temporal
per-shard null cannot on nonstationary GPU telemetry. A runtime calibration monitor + Wall-A whiteness gate
construction validity and revoke (B→A) when it breaks.

---

## What shipped (newest first)

- **PROOF-CARRYING E-VALUES (2026-07-26 — ADR 0025, `89dfeca`).** Five of the six CRITICAL findings
  in the 2026-07-02 math audit are the SAME bug: a non-e-value entering the FDR-bearing e-BH path.
  `tools/e-value.ts` makes `EValue` an OPAQUE branded type constructible only via certified
  constructors/combinators, each carrying a `Certificate` (claim as an inequality, evidence class
  theorem/construction/empirical, unchecked premises; derivations inherit the weakest input's class;
  no free-standing product — accumulation only via the stateful `EProcess`).
  `certifiedFdrBenjaminiHochberg` (`tools/emitter-contract.ts`) takes `readonly EValue[]` and
  cross-checks evidence class against the emitter's `validity_class`, returning the certificate
  chain + open premises with every Mode-B selection. Audit F3 (SR running max fed to e-BH, reported
  "CERTIFIED") is now a COMPILE error, `@ts-expect-error`-locked (18 tests). `lean/` is the
  discharge queue and **NOW BUILDS (Lean 4.32.1 + Mathlib): `fdr_le` — e-BH controls FDR under
  arbitrary dependence — is PROVED with no `sorry` beneath it**, via `card_reject` → `fdp_pointwise`
  → `fdp_le_sum` → `fdr_le_of_pointwise`. `fdp_pointwise` is proved in BOTH representations
  (`lean/core` over Nat/List, zero deps; `Tessera/` over Finset/ℝ) and they agree.
  **THE WHOLE `lean/` TREE IS SORRY-FREE (2026-07-26, second + third pass).** § 1 (validity
  chain): `rank_uniform` (the randomised conformal rank is EXACTLY Unif[0,1] under
  exchangeability + independent jitter, ties and all), `rank_superUniform`, `calibrate_isEValue`,
  `tsum_convexMean_isEValue`, `supAdjuster_integral`, composed as
  `Conformal.calibrated_rank_isEValue`; chained with `fdr_le`: exchangeable block + independent
  Unif[0,1] jitter → exact rank → calibrator → e-value → e-BH → FDR ≤ q, no informal step.
  § 2 (Proposition A2, on the honest mixing-law + Markov-kernel conditional-i.i.d. model, all in
  ℝ≥0∞ with zero integrability side conditions): `marginal_validity`, `accumulator_mean`
  (E[M_T] = E[g(Δ)^T], an equality), and `accumulator_ge_one` — the machine-checked NEGATIVE
  result that per-round validity does not survive accumulation. Remaining informal scope: H-EX
  itself (a scheduler contract, deliberately unformalised) and the quantitative drift RATES
  (strictness of A2(3); numerical by design).
  **Proving found FIVE statement-level bugs simulation had passed** (junk-value `∑'` weights
  made `tsum_convexMean` FALSE; `calibrate` lacked measurability; `SuperUniform` was UNSATISFIABLE
  over negative α; `rank_superUniform` had NO independence hypothesis and was FALSE; the § 2
  placeholder-`g` statements were CONTENTLESS) — see
  `research/2026-07-26-lean-formalisation.md` § 3. The STATEMENTS were
  validated numerically first (e-BH FDP lemma: 995,245 engine selections across five adversarial
  families, 0 violations, worst slack exactly 0.0; rank uniformity exhaustive over `S_{K+1}`,
  K=2–4). See `lean/README.md` + `LEAN_QUEUE`.

- **THE A2 LINE — persistent unit heterogeneity vs the canary guarantee (2026-07-25/26,
  `37897e6`+`e831578`; six reports `research/2026-07-25-*`, four harnesses + 41 tests;
  RESEARCH-INDEX N7/N8/P6–P8; ADR 0023 CORRECTION 2).** Per-round conformal validity is EXACT and
  does NOT survive accumulation: `E[M_T] = E_δ[g(δ)^T] > 1` for T ≥ 2 whenever persistent unit
  heterogeneity exists (P6). The Λ bound is TRUE and OPERATIONALLY VACUOUS — the operational form is
  a drift/first-passage condition. ⚠️ **DESIGN TARGET: ICC ≲ 4% — four earlier figures superseded, see below.**
  0.25% and 9.5% were wrong; 1% was right but on a compressed axis. The θ̂ estimator MIRRORED
  `canary-sim.execScore` instead of calling it and was biased down twice over — it dropped the
  interference channel and used gen-1's noise scale for a gen-0 block (**A2-host, CLOSED
  2026-07-26**: the mirror is gone, `healthyPanel` now calls the real `execScore`). On the corrected
  axis H16 = 1.49%, H15 = 12.40%, H17 = 32.97%; **no paging result moved**, only the axis. **A2-icc is now CLOSED**: the band was swept and the breach falls between
  **6.32% and 8.36%** on both pipelines, so the design target is **ICC ≲ 4%** — a ~3× RELAXATION,
  since ≲1.5% had extrapolated from a single clean point. Per-path budgeting closed NEGATIVE (both
  pipelines breach in the same cell; N9 predicted it). `research/2026-07-26-icc-sweep.md`. Design against δ₀, stable to ~10% over θ ∈ [0,0.5]; treat
  any rate as order-of-magnitude (P7).
  Mean reversion measured CLOSED-negative — τ̂ > 3× every horizon, binding case H8 at **6×** (N8; the pre-N11 table said ≥20×, do not quote that headroom). **Paging fails BEFORE
  FDR** (P8): A/A to T=320 on the shipped primitives, H2 (ICC 11%) breaches its Ville budget 3.3×
  while per-family e-BH false selections stayed **0.00 in every cell**; the pooled-marginal
  uniformity monitor is PROVABLY BLIND to this class (β = 1; gated guarantee is
  `sup FDR ≤ max(q, β)` — Gap B). End state is IDENTIFIABILITY, not a defect (N7): δ₀ = the
  calibrator's Kelly break-even shift = the detection floor ≈ **1.02% degradation** (independently
  matches E2's rack floor). Narrows ADR 0023's claims; does NOT invalidate the design. Actionable:
  enrich block keys until residual persistent heterogeneity is below the fault size you care about.
  **A2-disp CLOSED (2026-07-26 — P9, ADR 0023 CORRECTION 3; `research/2026-07-26-a2-dispersion.md`;
  `tools/dispersion-drift.ts` + `estimateDispersion`, 10 tests).** The machinery re-derived for the
  noise-SCALE channel (H8's actual mechanism): ∞-block tilt B = 9.63 ≈ 4.8×A but the finite block
  caps it 6.6× (K=30 tilt 1.47); floor is a RATIO λ₀ = 4.14× noise at K=30, **K=10 immune**,
  falling with K (power/validity trade sharper than location); **κ_min points the OPPOSITE way**
  (raising it lowers λ₀). ς is estimable (χ²-corrected log-variance spread; the ICC gate is blind
  to it); H8: ς̂ = 0.31, τ_disp = ∞, corrected T\* ≈ 3 (was 6). A/A validation: dispersion-only
  fleet (θ̂ at floor — location model predicts NOTHING) breaches Ville budget 6× by T=320, FPR
  nominal + variant-independent throughout. **Design gate is now a PAIR: ICC ≲ 4% AND ς ≲ 0.15**
  (breach bracket ς̂ 0.15–0.31). ⚠️ **P8 SCOPE NARROWED: e-BH FAILS under dispersion** — 14.8
  false selections/run at ς̂ = 0.61 (first nonzero at 0.31) from healthy units; a noisy unit
  concentrates inflation and crosses N/q individually. Steady-state P(λ≥λ₀) misses the breach
  (finite-T Lundberg bulk dominates); orderings exact, rates order-of-magnitude.

- **Catch-up 2026-07-04 → 07-22 (merged to main while this file was stale):**
  **Diag-probe** (PRs #51/#52): cordon → escalating `dcgmi diag` → uncordon `ActionSink` +
  annotate-only result feedback (confirmed stays cordoned; clean never withdraws) + per-group probe
  quota + `tools/dcgmi-diag.ts` (shard→host mapping, JSON→exit contract 0/1/2).
  **Canary guarantee program** (ADR 0023, PRs #54/#55): active randomized canaries = design-based
  spatial null; conformal ranks → ½·product+½·onset-mixture e-process → per-family e-BH; coverage
  (not severity) is the wall; adopt scoped; the clustersynth cross-check quantified the controlled
  workload as load-bearing (~30× SNR loss in passive counters) and fixed fixed-split dilution
  (CORRECTION 1). **ADR 0024** (PR #56): DSIPTS/learned-forecaster residualization DEFERRED,
  entry-gated (O6). **Mini 1 Hz real-telemetry baseline** running since 07-04; the 56-day
  baseline-guard gate clears ~2026-08-29.

- **60d @ 1 Hz LONG-BASELINE RE-VALIDATION on the mac mini M4 Pro (2026-07-02,
  `runs/2026-07-02-1hz-longbaseline-revalidation/`).** The one production path still resting on
  pre-audit validation, re-run under the shipped stack (min rule + W1 + corrected positives, engine
  v0.6.3-pre): canonical finding reproduces EXACTLY (power_w Mode B FDP 0.000 / power 1.000 every tier
  to R=8 = 1,728 units; gpu_temp_c abstains every tier; temporal comparator ≈0.96–0.99 FDP), and the
  path's FIRST contaminated-control run holds FDP 0.000 every tier with contaminated controls flagged.
  Cross-machine determinism confirmed (R=1 tier bit-identical M5 laptop vs M4 Pro mini). En route:
  PR #49 (ramp parts deleted as appended — halves peak disk; the ~125 GB R=8 tier now fits a 151
  GB-free volume) and a PROVENANCE CORRECTION — today's earlier run artifacts said "mac mini" but ran
  on the M5 MacBook Pro; the two runs/ READMEs + ADR 0022 note now say so. Remote setup: tailscale
  ssh, corepack-pnpm shim, rsynced trees.

- **W4 VALIDATION HONESTY (2026-07-02) — the audit's last standing items.** 20-seed Mode B artifact
  (`runs/2026-07-02-modeb-20seed-and-magnitude/`): R=8 hourly, FDP **0.000 on every one of 46 runs**
  (0/2,921 selections); contaminated pooled recall 0.969, clean 0.972. Small-fault sweep via the new
  clustersynth `CS_FAULT_MAG` knob (clustersynth PR #4, `b0f0530`): **1–2σ → recall 0.804, 2–3σ →
  0.996, both at FDP 0.000** — the 4–8σ-only caveat replaced by a measured power curve. **R79
  mismatched-DGP falsification boundary** (`coverage-matrices/R79-mismatched-dgp.*` +
  `tools/mismatched-dgp-envelope.ts`, test-locked): the oracle-parameter cell clean on iid (FPR 0.000)
  false-fires 0.905/0.940/0.980 under ρ=0.9/ρ=0.95/null-regime-step — the committed reason R72/R77
  numbers are wiring validation, not robustness claims. README points at it.

- **W3 LOCALITY PROGRAM (2026-07-02): engine v0.6.3-pre + tessera locality layer.** Engine (PR #37):
  calibrated group attribution (`group_e_value` mean-of-members, `binom_tail` size-calibrated
  co-firing score — raw ≥2-count false-candidates quadratically in rack size, measured — plus a
  temporal coincidence window) and LEAVE-ONE-OUT factors for 2–5-member domains (once-only,
  post-sweeps; the ≤3-member mirror is intrinsic and documented). Tessera: hop-level
  `LocalityMetric` (unconditional exact/rack/missed + precision splits) in clustersynth-e2e;
  `tools/locality-drilldown.ts` (coarse-to-fine per-level e-BH, finest-identified-level with
  abstention — no hierarchical guarantee claimed, N6); Wall-A diagnostic conditions on the FITTED
  common-mode prediction (was a zero covariate) + X_{n−1} in the partial-past test + noise-floor
  tolerance; hierarchical-evalue attribution honestly UNMEASURED (matrix regenerated 94
  attribution-correct, was 114 vacuous; README + floor test updated). Engine pin → v0.6.3-pre.

- **MIN-RULE SCALE RE-VALIDATION + ENGINE v0.6.2-pre PIN (2026-07-02, after the audit fixes below).**
  (1) Engine PR #36 merged + tagged **v0.6.2-pre**: `nuisanceRobustBFEValue` @deprecated with the
  corrected envelope (`validUnderEstimatedBaseline: false` — the FDR gate no longer auto-admits it;
  safe-t named as the substitute; new regression test demonstrates E[BF|H0] > 1 at x=1 ≈ theory
  1.0607), UI "by construction" → empirically-audited (interleaved-split proof gap), ADR 0004/0010
  correction notes; suite 226/226. Tessera pin bumped (PR #44, main `864c029`), suite 794/787.
  (2) **Mac-mini ramp re-run under the MIN RULE** (`runs/2026-07-02-modeb-min-rule-ramp/`): the ADR
  0022 headline reproduced with a theorem behind it — contaminated-control hourly ramp **FDP 0.000
  every tier/seed, R=8 × 5 seeds pooled recall 0.990** (corrected positive set); clean triad
  non-regression FDP 0.000 recall 1.000/1.000/0.987 (R=1/4/8); 1 Hz mixed-cadence streaming R=8
  FDP 0.000 recall 0.794 (= pre-min-rule prefix-fit level, no streaming regression). En route,
  fixed a harness metric bug: the aggregate scorer now drops control-contaminated (treatment-
  healthy) shards from the positive set per the clustersynth `control.json` contract
  (`loadContaminatedHealthyTreatments`) — previously recall was diluted by design-undetectable
  shards and a contaminated shard that fired would have counted as a TRUE positive (understating
  FDP). Locked by a new fixture test.
- **2026-07-02 MATH AUDIT + CORRECTNESS FIXES (`research/2026-07-02-math-audit.md`; RESEARCH-INDEX §4).**
  Five parallel audit passes verified the code against the cited papers. CONFIRMED exact: engine e-BH,
  √E−1 adjuster, normalized onset mixture, safe-t, serial-calibration. FIXED in this branch: (1)
  metric-router fed the SR running-max peak (NOT an e-value) to e-BH → now the normalized mixture;
  (2) triad flag-then-substitute routing (no covering theorem — flag and substitute share c2's noise)
  → the **min rule** `min(e_{t−c1}, e_{t−c2})` everywhere, sibling null reporting-only (ADR 0022
  correction note); (3) mode-b-loop's per-cycle re-normalized mixture (cross-cycle optional stopping,
  no theorem on dispatched actions) → **`geometricMixtureEValue`** (Shiryaev onset prior,
  horizon-independent weights ⇒ one e-process ⇒ SupFDR ≤ q covers first-crossing dispatch); (4)
  gaussian-lr plug-in caveat (E[e|H0] diverges with estimated cal SD — diagnostics only); κ
  common-mode fraction corrected to **1 − κ/2** (power_w ~56% shared, not ~12%); groupAttribution
  empty-selection=1 bug → NaN; emitter-prototype prefix stat relabeled Ville-tail-bounded; R72/R77
  oracle-DGP + ramp-slope caveats in README; METHODOLOGY/CLAUDE.md no longer claim baseline-monitor
  routes I(1) (it abstains; metric-router is a separate CLI). STANDING (not fixed here): engine BF
  invalidity E[BF|H0]≈1.155 (ADR 0013 correction note; substitute safe-t — ENGINE-side); UI "by
  construction" proof hole (empirically fine — P1 note); plug-in σ̂/φ̂ sensitivity held by uncalibrated
  gates; mixed-cadence guard loophole; no locality (hop-distance) metric + the localization program;
  EOP decided-but-unimplemented. Full prioritized list in the audit report.
- **REAL-CLUSTER Phase 4 first cut: GWDG κ measurement + realism-calibrated availability (this session).**
  Anchored the (synthetic) peer-availability study to REAL telemetry. `tools/gwdg-comparability.ts` measures
  within-node peer comparability on the real GWDG A100 DCGM dataset (Zenodo 10.5281/zenodo.19052367, 4 GPUs/
  node, labeled detachment faults): median best-peer **κ 0.42 / 0.88 / 0.64** (temp/power/util), only **8–23 %**
  of GPUs have a κ≤0.1 peer — real siblings run different **jobs**, so little workload common-mode cancels
  (temp best via shared cooling, power worst). **Methodology guard-rail (important):** only the STRUCTURAL κ
  is valid off GWDG — its files are ≤10-day incident windows, NOT a representative baseline, so detection/FDR
  on it are INVALID (a thin baseline's fit fails to transfer → an A/A test false-fires from thinness, which I
  initially mis-ran and **retracted**; `baseline-guard` exists for exactly this). Tiling/padding short data to
  fake a 2-month baseline is also invalid (adds duration, zero info; games the guard). The valid move:
  **calibrate the synthetic generator to the real κ** — added a per-job common-mode to `peer-availability.ts`
  (bimodal κ like a real shared cluster), tuned the job count so the comparable fraction matches GWDG
  (`node tools/peer-availability.js --gwdg`). Result: at the real operating point, the κ-gated min-agreement
  triad controls **FDP ≤ q on the eligible subset** (0.03/0.00/0.07) where the pair detector is FP-dominated
  (≈0.5). **Conclusion: real-cluster Mode B is AVAILABILITY-bound, not FDR-broken** — abstains on 77–92 % of
  GPUs (no false guarantee), certifies the comparable minority; **job-aware peer selection is the coverage
  lever**. A representative-baseline null/detection run still needs a long continuous feed (shadow-deploy; no
  public dataset supplies one). 6 tests; suite 783 pass. ADR 0022 § Real-telemetry anchor + RESEARCH-INDEX §4.
- **ADR 0022 COMPARABLE-PEER AVAILABILITY STUDY: DONE (this session).** The last ADR 0022 follow-up — the
  triad's binding real-world constraint. All prior validation used clustersynth's EXACT-COPY twins
  (`#ctrl`/`#ctrl2` share the treatment's loadings perfectly); real deployment uses REAL sibling shards with
  their own loadings (clustersynth jitters λ by `LAMBDA_HETERO=0.4`). `tools/peer-availability.ts` (+ 4 tests)
  selects real in-group peers by the κ cancellation ratio and answers two questions. **D1 Availability:** at
  realistic heterogeneity (0.4), fraction of shards with ≥2 comparable peers = 0.76 / 0.92 / **0.96** for
  pool sizes 8 / 24 / **72 (a rack)** — real clusters give large in-group pools (rack 72, power-feed 576, CDU
  1,152), so availability is favorable; it bites only in small/heterogeneous clusters. **D2 FDR under real
  peers:** real peers have NO designated-clean sibling, so the deployable rule is `min(e_{t−c1}, e_{t−c2})` —
  require BOTH peers to agree (a single contaminated peer fires only one contrast → not selected; `min` is a
  valid conservative e-value). Result: triad **FDP ≤ q at every heterogeneity** (pair detector FP-dominated
  ≈0.5), recall ~0.87. **Key finding:** the κ gate converts non-comparability from an FDR risk into an
  AVAILABILITY cost — a shard with no comparable peer gets no triad → abstains (Mode A), never a false
  guarantee. Open: job-aware peer pre-selection; fleet-wide common-mode blind spot (unchanged). ADR 0022 +
  RESEARCH-INDEX §4 updated. **This closes ALL ADR 0022 follow-ups.**
- **ADR 0022 STREAMING-PATH TRIAD: WIRED + 1 Hz VALIDATED (this session).** Closed the top remaining ADR
  0022 item — the triad now routes in the STREAMING reducer, not just in-memory. New `monTriples` byte-range
  generator captures clustersynth's contiguous `treatment → #ctrl → #ctrl2` triple (degrades to `[t,c1,null]`
  for non-triad bundles); the mixed-cadence worker (`runCmbWorker`) and the long-baseline workers
  (`runLbFitWorker`/`runLbDetectWorker`) emit `flagE` (c1−c2 sibling null) + `eC2` (t−c2 clean sibling); the
  SHARED `reduceCmbCounter` does the fleet routing (`badControl = eBH(flagE)`, overwrite `e[i]=eC2[i]`,
  report `flaggedControls`) — so BOTH streaming paths get the triad from one code site, mirroring the
  in-memory `applyTriadRouting`. The ramp (`clustersynth-mode-b-ramp.sh`) now forwards
  `CS_TRIAD`/`CS_CONTAMINATE[_FRAC]`/`CS_DECORRELATE_FRAC` (via `env`, since a bash array can't be an inline
  assignment-prefix). **Mac-mini 1 Hz mixed-cadence ramp (hourly 2-month baseline + 6 h 1 Hz mon, streaming,
  to R=8 = 576+576 units):** contaminated (`CS_CONTAMINATE=control`) → `power_w` (Mode B) flags 0/3/3/5
  contaminated controls at R=1/2/4/8 (was hard-`0` before), FDP **0.000** every tier; clean (triad on, no
  contamination) R=8 → `power_w` flags **0**, recall **1.000**, FDP 0.000 (no false-flag of healthy Mode-B
  controls). `gpu_temp_c` abstains (Mode A, ~41% whiteness) in both — its large flag count is the known
  near-unit-root artifact, computed but never acted on (Mode A never selects), consistent with in-memory.
  **Then end-to-end on the SAME-CADENCE LONG-BASELINE path** (the heavy one — genuine 60d 1 Hz baseline =
  5.18M ticks/series, `CS_LONG_BASELINE=1`, triad on, clean): `power_w` certifies Mode B at **FDP 0.000 /
  recall 1.000 / flagged 0 every tier** R=1/2/4/8 (to 1,152 units), `gpu_temp_c` abstains every tier
  (whiteness 67–75%, better than prefix-fit's 41% — the 2-month baseline helps but can't out-baseline the
  physics; its sibling-null flags are the same artifact, unactioned). So the long-baseline Phase-1/Phase-2
  triad code runs at full 2-month 1 Hz scale **without breaking or false-flagging the Mode-B counter** —
  the canonical 1 Hz finding (`9b4e69e`) reproduced through the triad-wired code. Peak ~169 GB on T9, no reboot.
  **Also fixed a latent `linesFrom` bug** found en route: it unconditionally skipped the first line when
  `byteStart>0`, so a byte boundary landing exactly on a line start dropped that line from BOTH workers
  (benign at scale where row lengths vary — but `monPairs` had it too). Now skips only a genuinely mid-line
  straddler; the `9×2` parity test locks it in. Suite 775 pass. **REMAINING ADR 0022 item is now just the
  comparable-peer availability study.**
- **2-MONTH 1 Hz BASELINE finding (`9b4e69e`) + streaming long-baseline fit (`01bdab0`).** Closed a real
  gap: the mixed-cadence path fits φ from a ~29-min mon **prefix**, not the 2-month baseline (the ≥56d guard
  checked an hourly baseline the fit ignored → partly illusory). Built a **streaming same-cadence
  long-baseline fit** (`tools/contrast.ts fitContrastFast` = mean/SD, O(n) no-sort; `clustersynth-mode-b.ts`
  Phase-1 stream baseline→per-shard fits, Phase-2 stream mon→detect; flat memory; dispatched for
  same-cadence base>1GB or `CS_LONG_BASELINE=1`). Ran a genuine 60d **1 Hz** baseline (5.18M ticks/series) +
  6h 1 Hz mon, RACKS 1/2/4/8, gpu_temp_c+power_w (R=8 base ~83GB, gen 610s/analysis 191s). **FINDING:
  gpu_temp_c's 1 Hz abstention is INTRINSIC, not a short-baseline artifact** — a stable 2-month baseline
  HELPS (whiteness 41%→65–75%, FDR clean at FDP 0.000 vs the prefix-fit run's 0.003–0.007) but gpu_temp_c
  still abstains every tier (τ=120s → near-unit-root φ≈0.992; can't out-baseline the physics), and that's
  CORRECT (it would over-fire in Mode B; temporal comparator FDP ~0.97). power_w certifies Mode B, FDP
  0.000, recall 1.000.
- **FULL-CLUSTER tests (mac mini): hourly (`c380fc1`) + 1 Hz (`991ecf2`).** Both to **9,216 observation
  units** (4,608 treatment GPUs + 4,608 controls). Hourly: FDP 0.000 every tier, recall→0.995. 1 Hz
  (prefix-fit, streaming): FDP ≤0.007, recall ~0.79, gpu_temp_c abstains, 7GB bundle/22s flat memory.
- **ADR 0022 — CONTROL TRIAD: BUILT + VALIDATED (in-memory) (`c7f81ce`, clustersynth `35c3afa`).** Two
  matched control twins → `c1−c2` is a clean control-vs-control null. Recovers BOTH ADR 0021 failure modes:
  contaminated-control detection (cohort can't) and the sign-blind false positive. `scoreCounterModeB` →
  `applyTriadRouting` (flag bad controls via `c1−c2`, detect on the clean sibling `t−c2`). Validated mini
  (72 GPU) + mac-mini R=8 (1728 shards): control-only contamination drives the twin-pair detector to FDP
  ~0.58 → triad **0.000** at recall 1.000; non-regressive. clustersynth `CS_TRIAD` emits `#ctrl2`.
- **ADR 0021 — twin-validity detector: BUILT, VALIDATED, found INSUFFICIENT (negative result) (`44a4f00`).**
  A twin-PAIR detector can't restore FDR: κ (cancellation ratio) catches decorrelation but misses the
  sustained-shift harm (FDP bottoms ~0.20 > q, + over-excludes clean pairs); contamination is undetectable
  by twin-pair stats (sign-blind contrast + heterogeneous-loading cohort wall). NOT wired into the gate. The
  κ machinery (`tools/contamination-detector.ts`) + clustersynth `CS_CONTAMINATE`/`CS_DECORRELATE` modes
  (`d2a5e0e`) are kept as artifacts. Pointed to → ADR 0022.
- **Deep research ×2 (3-vote verified) (`0172808`), reports in `research/2026-06-28-*.md`.** (1) Anytime-valid
  testing — CORROBORATES ADR 0020's negative result (SKIT ~1/√HSIC, PITMonitor longer delay under local
  drift); stopped-e-BH causal condition = the concrete O5 check. (2) Concurrent-control methodology — Mode B
  is established prior art; DiD-under-interference proves control contamination makes the contrast estimand
  uninterpretable (TATT−ASC) → motivated ADR 0021/0022.
- **ADR 0020 — serial-dependence calibration monitor: built + WIRING REVERTED (negative at 1 Hz)
  (`f9ea4c3`).** `tools/serial-calibration.ts` (bet λ_t=c·r_{t-1}, averaged with the marginal martingale) is
  sound + validated synthetically, but wiring it to RETIRE the whiteness gate regressed 1 Hz (gpu_temp_c
  over-fired: the betting monitor needs accumulation the short healthy prefix can't provide). **Whiteness
  RETAINED.** Kept as a research artifact.
- **Deploy adapters (`4097f66`).** `tools/telemetry-source.ts` (live `TelemetryFeed` seam + `liveCycles` +
  `runModeBLoopAsync` + reference `bundleFeed` + CLI) and `tools/action-sinks.ts` (Jsonl audit / webhook
  rollout-gate+pager / command remediation / fan-out; buffered I/O + `drain`). README two-mode language
  (`6e9f853`).

---

## REMAINING (lower priority)
- ~~**(ADR 0022) Streaming-path triad**~~ — DONE (wired into `reduceCmbCounter`; 1 Hz validated). See "what shipped".
- ~~**(ADR 0022) Comparable-peer availability study**~~ — DONE this session (`tools/peer-availability.ts`):
  real κ-selected peers, ~96% availability at rack scale + realistic heterogeneity, `min`-agreement rule
  controls FDP ≤ q; non-comparability → an availability cost, not an FDR risk. **All ADR 0022 items closed.**
- **(job-aware peer selection)** — the availability study's one open thread: real peers must also match on the
  *job* factor; the κ gate catches mismatches empirically, but job-aware pre-selection would raise availability.
- **(ADR 0020 research) Strengthen the calibration monitor vs serial dependence** so the whiteness check can
  eventually retire — or accept whiteness is the better tool (the negative result suggests the latter).
- **Real-cluster (DCGM) validation** — everything is on synthetic clustersynth telemetry; the Phase-4
  candidate. The two-mode guarantee, deploy seams, and triad are all validated only against the harness.

---

## Key file map
- `decisions/0019–0025-*.md` — the architecture + follow-on ADRs (0023 canary program w/ corrections;
  0024 DSIPTS deferred; 0025 proof-carrying e-values).
- `tools/e-value.ts` — opaque `EValue` + certified constructors/combinators + `EProcess` + `LEAN_QUEUE`
  (ADR 0025); `lean/` — Lean development, BUILDS (4.32.1 + Mathlib), ENTIRELY SORRY-FREE:
  validity chain + A2 accumulation results both machine-checked.
- `tools/emitter-contract.ts` — validity_class gate (ADR 0019 #1) + `certifiedFdrBenjaminiHochberg`
  (the proof-carrying Mode-B e-BH entry point — prefer over `fdrBenjaminiHochberg`).
- `tools/canary-sim.ts` + `tools/canary-experiments.ts` + `tools/canary-crosscheck.ts` — ADR 0023 program;
  `tools/{exchangeability-drift,heterogeneity-estimate,horizon-experiment,tail-probability}.ts` — the A2
  harnesses (analysis, not runtime paths).
- `tools/calibration-monitor.ts` — marginal runtime monitor (#2); `tools/serial-calibration.ts` — the serial
  monitor (ADR 0020, not in the gate).
- `tools/clustersynth-mode-b.ts` — the Mode B pipeline: in-memory + mixed-cadence streaming (prefix fit) +
  **same-cadence long-baseline streaming** (`renderModeBLongBaseline`, ADR 0022 1 Hz) + the **triad** — now
  in BOTH the in-memory path (`applyTriadRouting`) AND the streaming reducer (`reduceCmbCounter`, fed by
  `monTriples` + per-worker `flagE`/`eC2`). `tools/contrast.ts` — `fitContrast`/`fitContrastFast`/`applyContrast`.
- `tools/contamination-detector.ts` — κ machinery (ADR 0021 artifact, not gated); reused by `peer-availability.ts`.
- `tools/peer-availability.ts` — ADR 0022 comparable-peer availability study (real κ-selected peers, `min`-agreement
  rule, job-structured model); `node tools/peer-availability.js [seeds]` or `--gwdg` (real-calibrated). Analysis, not a runtime path.
- `tools/gwdg-comparability.ts` — real-A100 within-node peer κ measurement (`node tools/gwdg-comparability.js <gwdg-dir>`,
  decompress `telemetry/*.bz2` first). STRUCTURAL κ only — GWDG detection/FDR are INVALID (short incident windows).
- `tools/mode-b-loop.ts` — always-on loop; `tools/telemetry-source.ts` + `tools/action-sinks.ts` — deploy seams.
- `tools/clustersynth-mode-b-ramp.sh` — the scale entry point. **GOTCHA: it reads `COUNTERS=` (env), NOT
  `CS_COUNTERS` — it overrides the latter.** Pass `COUNTERS=gpu_temp_c,power_w` to subset.
- clustersynth `src/harness/{scenario,factor-model}.ts` — control arm + `CS_TRIAD` / `CS_CONTAMINATE` /
  `CS_DECORRELATE_FRAC` fault modes + the `faultId` seam.

---

## Mac-mini test infra (persists, reusable)
- **Tailscale:** `ssh 100.84.57.58` (user `johnwarren`, key auth). 14 cores, 64GB, macOS. Drive **T9** at
  `/Volumes/T9` (~3.6TB). node v22.13.1 + pnpm at `~/node/bin` (prefix PATH). Repos at `~/concord/{tessera,
  clustersynth}` (rsync'd WITH node_modules — no GitHub auth). Build: `PATH=$HOME/node/bin:$PATH pnpm build`.
- **Sync before a run:** `rsync -az tools/ 100.84.57.58:concord/tessera/tools/` (+ `../clustersynth/src/` if
  changed), then rebuild both on the mini. (The mini is synced as of this session's runs.)
- **Hourly Mode B ramp:** `OUT=/Volumes/T9/<name>; nohup caffeinate -dimsu env PATH=$HOME/node/bin:$PATH
  RACKS="8 16 32 64" WORKERS=14 BASE_DAYS=60 BASE_DT=3600 MON_DT=3600 OUTDIR=$OUT bash
  ~/concord/tessera/tools/clustersynth-mode-b-ramp.sh >$OUT/nohup.out 2>&1 &` (cheap, ~90s to 9,216 units).
- **1 Hz mixed-cadence:** add `MON_DT=1 MON_HOURS=6`. **2-month 1 Hz same-cadence (long-baseline fit):**
  `BASE_DT=1 BASE_DAYS=60 MON_DT=1 MON_HOURS=6 COUNTERS="gpu_temp_c,power_w"` (restrict counters — 1 Hz×2mo
  is only feasible for a few; R=8 baseline ~83GB, ~13min/tier; auto-routes to the long-baseline streaming path).
- **GOTCHAs:** the mini auto-installs macOS updates and can **reboot** mid-run (killed a prior overnight); the
  ramp is **resumable** via `.done-$R` markers — relaunch the same command/OUTDIR. caffeinate ≠ reboot
  protection. A transient SSH "connection reset" ≠ a reboot (check `uptime`). `KEEP=1` keeps bundles
  (default deletes per tier).

---

## The thread that's "live" if you want to continue
ADR 0022 is fully closed and now has a **real-telemetry anchor** (GWDG κ measurement → realism-calibrated
availability). Phase 4 (real-cluster) has its first cut: the STRUCTURAL comparability question is answered on
real A100s (availability-bound, job-factor binding). What remains for a full Phase 4 is a **representative-
baseline null/detection run**, which needs a long continuous DCGM feed — the **shadow-deploy path** (wire
`telemetry-source.ts` to a live feed, accumulate a real baseline over weeks, reconcile discoveries against the
cluster incident log). No public dataset supplies a long-enough continuous concurrent-GPU baseline (GWDG =
≤10-day incident windows; MIT = per-job fragments) — and faking one by tiling/padding is invalid (a recurring
methodology trap: it adds duration with zero information and games `baseline-guard`). The concrete next code
step toward wider coverage is **job-aware peer selection** (match peers by workload). The ADR 0020 serial-
monitor research is the other smaller thread. Nothing is mid-flight or broken.

Newer threads (2026-07-26): the **mini real-probe pilot** once the 56-day baseline gate clears (~08-29) —
probe spec DECIDED + BUILT (2026-07-27, `docs/SPEC-probe-pilot-apple-silicon.md`): trio P1-int/P4-mem/P5-gpu
in one compiled Swift binary (`tools/probe/`, goldens baked, P5 = CPU-vs-GPU cross-check every run) +
`tools/probe-runner.ts` (2h±U(0,2h) jitter, P/E lanes via taskpolicy -b — verified 3.5× duration separation —
GPU lane, block-key epochs on OS/binary change, scores + exclusion ledger ndjson, `notBefore` daemon gate for
the mini, plist template + README). Verified end-to-end on the MBP (--once: 5 executions SDC-clean). Deploy to
the mini ONLY after the gate (~08-29). NB no core pinning on arm64 macOS ⇒ worker-slot panel is an A/A null
by construction — instrument qualification, not fleet ς̂/θ̂;
**block-key enrichment** for the canary design (the one lever ADR 0023 CORRECTIONS 2+3 leave — drive residual
persistent heterogeneity below the target fault size; measure achievable ICC **and ς** on real telemetry —
the gate is now the pair ICC ≲ 4% AND ς ≲ 0.15, and `estimateDispersion` is the second instrument); the
**Lean discharge queue: EMPTY** (`lean/` is sorry-free; `Certificate.lean` fields flipped; remaining
candidates only if a consumer needs them — A2(3) strictness, the first-passage form);
per-call-site **migration to `certifiedFdrBenjaminiHochberg`**; and a **validity-class rung** for
"exact per round, drift-limited across rounds" (Correction 2 item 1).
