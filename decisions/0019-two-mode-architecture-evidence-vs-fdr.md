# ADR 0019 — two-mode architecture: evidence/ranking (default) vs FDR-guaranteed (conditional), gated by an emitter-contract validity class

- **Date:** 2026-06-27
- **Status:** Accepted (architecture decision). Grounds the product claim in what is provable; supersedes
  the implicit "Tessera provides fleet-FDR control" framing. Code hooks specified; enforcement to follow
  the `baseline-guard` pattern.
- **Builds on / grounded in:** the THESIS-VERDICT (RESEARCH-INDEX, 2026-06-25: detection+ranking ALIVE,
  per-alert guarantee DEAD, fleet-FDR EMPIRICAL not a theorem); registry N1 (per-alert validity dead on
  real telemetry — only the cross-shard contrast separates drift), O5 (conditional fleet-FDR via the
  common-mode covariate, Assumption 3.1), P1 (UI e-value valid-by-construction for any φ on baselined
  residuals), P3 (e-BH controls FDR given valid e-values), P5 (common-mode estimation is the lever);
  ADR 0018 (e-detector / SupFDR adjuster / conditional-Markov gate prototypes).
- **Evidence base (this round, 2026-06-27):** the long-window high-cadence runs on the mac mini and the
  `tools/emitter-prototype.ts` A/B (see § Evidence).

## Decision

Split Tessera's product surface into two explicit modes, and make the boundary a **machine-checked
property of the detector emitter**, not a global claim:

- **Mode A — evidence/ranking (DEFAULT).** Sequential evidence detectors produce per-shard / per-region
  rankings + early warning, with full audit trails and **abstention** when validity cannot be established.
  **No FDR claim.** This is the always-on continuous-fleet-observation product.
- **Mode B — FDR-guaranteed (CONDITIONAL, narrow).** e-BH-controlled discovery, admitted **only** for
  emitter contracts whose conditional null is `theorem_valid` or `construction_valid` over the monitoring
  horizon. This is the deployment/canary-gating product.

The honest claim language (replaces any "Tessera provides FDR control over fleet detections"):

> Tessera provides FDR control only for detector emitters whose conditional null validity is established
> by construction over the monitoring horizon. For nonstationary telemetry where such validity cannot be
> established, Tessera operates in evidence-ranking mode with abstention and full audit trails.

## The emitter contract is the unit of validity (not the counter)

The thing that must satisfy null e-validity is **not a counter** but the whole emitter:

```
emitter_contract:
  baseline_version          # the curated ≥2-month baseline (loadings + scale)
  conditioning_variables    # the covariates X_n the null is conditioned on (common-mode, regime, ...)
  residualizer              # how raw → residual
  increment                 # the e-increment formula (default: normalized convex mixture; see below)
  stopping_aggregation      # local+global filtration, stopping rule, fleet aggregation
  horizon                   # the monitoring window the validity claim covers
  validity_class:           # ── gates entry to FDR-bearing e-BH ──
    - theorem_valid         #   } only these two enter Mode B
    - construction_valid    #   }
    - empirically_audited   # Mode A (ranking/RCA) only — NOT FDR-bearing (see § Evidence)
    - heuristic             # Mode A
    - rca_only              # post-hoc only
```

| stream / validity_class | alert/ranking (A) | RCA | FDR theorem (B) |
|---|---|---|---|
| theorem_valid e-process | yes | yes | **yes** |
| construction_valid conservative e-process | yes | yes | **yes** |
| empirically_audited only | yes (with caveat) | yes | **no** |
| whiteness-passed residual | maybe | yes | no |
| raw threshold / heuristic | maybe | yes | no |

## Three load-bearing qualifications (do not drop — they are why this is real, not a relabel)

1. **`construction_valid` is not a static stamp; it binds to a named conditional model + regime and is
   revocable at runtime.** Validity is a property of **(increment × conditional null model × horizon)**,
   never of the increment alone. The emitter-prototype proved this: the normalized-mixture increment is
   construction-valid *on N(0,1)* and still produced healthy `mean(e) ~ 1e150` because the residual was
   not N(0,1). Therefore Mode-B membership requires a **runtime calibration monitor** that demotes an
   emitter B → A the moment its conditional assumptions break (anytime-valid calibration monitoring —
   biblio `Farran 2026`, the missing piece). A class without a live monitor manufactures false confidence.

2. **Mode B's guarantee comes from a SPATIAL null (concurrent control), not a certified TEMPORAL null.**
   Everything that broke FDR was the *temporal* per-shard null (validity over a long window; time-varying
   drift; uncertifiable future). N1 says it: only the cross-shard contrast separates drift from nuisance.
   So Mode B's natural, achievable home is **comparative** settings — treatment vs control, canary vs the
   rest of the fleet — where shared nonstationarity cancels in the comparison and the **control is the
   null**. Mapping:
   - **Mode B = deployment/canary gating** (comparative, controlled horizon; concurrent control absorbs
     nonstationarity → a real guarantee). The DeploySignal heritage.
   - **Mode A = continuous always-on fleet observation** (no concurrent control; time-varying per-shard
     null → ranking + abstain).

3. **Enforce `validity_class` in code, mirroring `baseline-guard`.** An emitter without
   `theorem_valid|construction_valid` AND a currently-passing calibration monitor is **excluded from the
   FDR-bearing e-BH path by the code** (the way short windows now throw). Otherwise it regresses to "every
   counter gets a guarantee." Validity is opt-in and revocable, never default.

## Evidence (2026-06-27)

Pipeline: correct/scaled `baseline-monitor` (60-day hourly baseline + long 1Hz/1-min monitoring, all 5
DCGM counters), per `docs/METHODOLOGY-scale-and-duration-testing.md`.

- **1Hz monitoring, R=8 (576 GPUs):** every counter ABSTAINS — the per-shard residual is autocorrelated at
  1-second sampling (idiosyncratic OU noise, lag-1 ≈ exp(−1/τ): sm_util 0.14 … temp 0.999). The Wall-A
  gate correctly refuses to certify. Detection (e-detector recall 12/13) survives; the null does not.
- **1-min monitoring, R=8 — multi-seed:** the 4 stationary counters CERTIFY (residual whitened, ρ≈0.005,
  ~90% markov-plausible) but the aggregate **FDP = 0.50, 0.72** across seeds (q=0.1). Certification (lag-1
  whiteness) is necessary but **not sufficient** for FDR.
- **emitter-prototype A/B (`tools/emitter-prototype.ts`):**
  - The e-detector fed e-BH the **raw Shiryaev–Roberts statistic** `M^SR = Σ_j Λ^(j)`, whose null
    expectation is ≈ T (a SUM of T e-processes), so it is **not an e-value**; the √E−1 SupFDR adjuster
    (which assumes a genuine e-process) cannot rescue it. Replacing it with a **convex onset mixture**
    (normalize by T → a real e-process) cut selections 576 → ~12 with recall kept. **Adopt this as the
    default increment object.**
  - But healthy `mean(e) ~ 1e150` and certFDP stayed 0.73–0.91 — the binding failure is **residual
    null-invalidity**, not the increment object.
  - **Per-shard prefix audit (the go/no-go for empirical certification): NO-GO.** Abstaining shards whose
    pre-fault prefix already shows `e ≥ 1/α_audit` removed only ~5% and left certFDP 0.73–0.91 — because
    the breaking drift is **time-varying** (clean prefix, drifts later). Finite past data cannot certify
    future conditional validity when the nonstationarity is itself time-varying. This is N1, with a
    concrete mechanism, and it is precisely why `empirically_audited` must NOT be FDR-bearing.

## Consequences

- **Product claim narrows and becomes credible.** README / methodology / capstone language updated to the
  two-mode statement above. Continuous fleet monitoring is Mode A by default; Mode B is opt-in, conditional,
  and (today) comparative.
- **Default increment object changes:** the normalized convex-mixture e-value replaces the raw SR statistic
  wherever a per-shard value enters fleet e-BH (a real, cheap correctness fix; ADR 0018's SupFDR adjuster
  applies to *that* object, not the raw SR sum).
- **Research frontier is sharpened (O5):** the binding problem is conditional exchangeability/calibration
  of the residual process *over time*. The only theorem path is a conditional null model rich enough
  (time-varying load / diurnal / regime / common-mode / scheduler / workload-mix / scrape state / topology
  shared components / sub-hour baselines) that the residual stays valid across the horizon — and the
  theorem must attach to that model; replay cannot create it after the fact.
- **What does NOT change:** detection + ranking + localization remain strong and shippable (Mode A); the
  ≥2-month baseline rule (`baseline-guard`) and the scaled streaming/multi-core pipeline stand.

## Prior art / external corroboration (deep research, 2026-06-28)

A primary-source survey (run `wf_34494774-318`; 23/25 claims 3-vote-verified; report
`research/2026-06-28-concurrent-control-spatial-null.md`) confirms Mode B's concurrent-control spatial null
is established prior art, and names its pitfalls:
- **Concurrent-control comparison is canonical practice** for exactly our reason — Google SRE Workbook:
  "time is one of the biggest sources of change"; canarying (Netflix Kayenta / Spinnaker) judges a canary vs
  a *concurrent* control with Mann-Whitney + an effect-size floor. Peer/fleet "odd-one-out" detection
  (Hendrickx et al. MSSP 2020, arXiv:1912.12941; GREYHOUND ATC'25, cohort-median >10%) is the same idea, on
  the same three assumptions we rely on: majority-healthy, identical signature, comparable environment.
- **Control contamination is worse than stated here.** The DiD-under-interference econometrics (Mealli–
  Viviens arXiv:2512.21176; Xiao–Sun arXiv:2509.24259) proves a fault leaking into the control makes the
  contrast estimand `TATT − ASC` — **uninterpretable** (recovers neither magnitude, direction, nor sign),
  not merely weakened. The common-mode blind spot (fleet-wide faults cancel by design) is acknowledged as
  structural across this literature.
- **Surfaced gap → ADR 0021 (Proposed):** a *runtime control-twin validity detector*. We monitor the
  residual (calibration + serial/whiteness) but have no explicit test for "the fault leaked into the twin"
  or "the loadings diverged," which the DiD result says is precisely the failure that silently invalidates
  the contrast. ADR 0021 specs it (cancellation-quality + control-cohort-consistency tests; the contrast's
  sign-blindness makes contamination a FALSE-POSITIVE source, not only a miss).

## Follow-ups (flagged)

- ~~Implement `validity_class` as a code gate on the e-BH entry (mirror `tools/baseline-guard.ts`).~~
  **DONE (commit 4733e62):** `tools/emitter-contract.ts` — `EmitterContract`/`ValidityClass`,
  `isFdrBearing`/`modeOf`, throwing `assertFdrEligible` (CS_ALLOW_UNVALIDATED=1 plumbing escape), gated
  `fdrBenjaminiHochberg`, `routeEmitters`. `construction_valid` is FDR-bearing only while
  `calibrationMonitorPassing===true` (pre-wires the runtime monitor below). `baseline-monitor` is wired
  as `empirically_audited` → routed Mode A; the renderer no longer claims an FDR guarantee for it.
  `test/emitter-contract.test.ts` (8) locks it; suite 709 pass.
- ~~Promote the normalized convex-mixture increment to the default e-value in `baseline-monitor`~~ **DONE
  (commit 6cf8c10):** `tools/mixture-evalue.ts` (`normalizedMixtureEValue`) is now the object fed to fleet
  e-BH in both paths; the e-detector peak is kept only for the Mode-A recall metric. End-to-end the
  selections drop from ~576/counter (raw SR) to ~50 total; the residual-ceiling FDP remains (N1/O5).
- ~~Runtime calibration monitor (anytime-valid; `Farran 2026`) to make `validity_class` revocable.~~
  **DONE (commit pending):** `tools/calibration-monitor.ts` — an anytime-valid calibration test
  martingale W_t = ∏ g(r_s) over a believed-null reference stream; Ville: P(sup W ≥ 1/α | H0) ≤ α. Crosses
  1/α_cal ⇒ revoke (sticky), setting `calibrationMonitorPassing=false`, which the gate consumes to demote
  the emitter B→A. `applyCalibrationMonitor(contract, referenceNullResiduals)` binds it to the contract.
  Sound vs the prefix-audit NO-GO: that tried to CERTIFY THE FUTURE (failed on time-varying drift); this
  REVOKES THE PRESENT (anytime-valid, runs forever at a controlled false-revocation rate). Scope named:
  tests MARGINAL calibration (the binding mean/scale failure), weak against pure serial dependence
  (the harder O5 frontier). `test/calibration-monitor.test.ts` (7) — null stays Mode B, drift demotes
  B→A. Live wiring lands with the Mode-B harness below (it feeds the control cohort to the monitor).
- ~~Mode B comparative/concurrent-control evaluation (treatment vs control, canary vs fleet) — the spatial
  null is the achievable guarantee; build the harness for it.~~ **DONE (commit pending):**
  `tools/mode-b-control.ts` — a self-contained synthetic ground-truth harness (house pattern, cf.
  `fleet-fdr.ts`). Over a persistent stationary AR(1) ρ=0.95 common-mode with heterogeneous loadings +
  injected mean-shift faults, the paired concurrent control cancels the common-mode EXACTLY (per shard,
  not via a cross-sectional median), giving a construction-valid spatial null. Measured (300 trials,
  q=0.1): **Mode B FDP 0.099 ≤ q, power 0.64; temporal (no control) FDP 0.28** — the spatial null
  controls FDR where the temporal one does not. Wires #1 + #2 LIVE: the control cohort feeds the calib
  monitor; a `construction_valid` emitter enters gated `fdrBenjaminiHochberg` only while the monitor (∏g
  marginal calibration) AND a Wall-A whiteness check both pass. A BROKEN control (independent INTEGRATED
  drift → genuinely breaks FDR, ungated FDP 0.64) is revoked ~72–76% and demoted B→A, so the gate
  prevents the wrong guarantee. The ~25% it misses is the integrated-after-whitening serial-dependence
  residual the marginal monitor is documented-weak against (the whiteness check is what lifts the catch
  rate from 12%→76%). `test/mode-b-control.test.ts` (3). **PRODUCTION follow-up:** a clustersynth
  scenario with a labeled fault-free CONTROL ARM sharing the same factor instances + a ≥2-month scale run
  on the mac mini — see the new follow-up below.
- ~~**NEW (productionization):** add a labeled control arm to clustersynth ... and run `mode-b-control`
  semantics on real-topology scale on the mini.~~ **DONE.**
  - **clustersynth (commit 4e0797e):** `controlArm` / `CS_CONTROL_ARM=1` emits a matched control twin per
    GPU — same factor instances + loadings, independent idiosyncratic noise, NEVER faulted; `control.json`
    pairs treatment→control. The contrast cancels the common-mode bit-for-bit (model-free).
  - **Tessera (commits fddec22, 5b6df18):** `tools/clustersynth-mode-b.ts` + `clustersynth-mode-b-ramp.sh`
    consume the control arm: model-free contrast → whiten at idiosyncratic φ → baseline-standardize →
    normalized-mixture e-value → gate (construction_valid + PER-SHARD calibration monitor + Wall-A
    whiteness) → e-BH. Per-shard calibration (not pooled — pooling 100s×1000s of increments over-revokes).
  - **2-MONTH SCALE VALIDATION (mac mini, real gb200 topology, 60d hourly baseline + 60d monitoring):**
    the spatial-null contrast controls FDR with near-full recall up to **2304 shards (1152 treatment +
    1152 control)** — R=1/4/8/16: **FDP 0.000**, recall 1.00/1.00/0.99/0.99; R=8 × 5 seeds: **mean FDP
    0.002**, recall 0.98–1.00. All counters Mode B. The contrast cancels common-mode (cdu/pod) faults BY
    DESIGN — those are fleet-level events out of a per-shard detector's scope. This is the achievable
    guarantee from a SPATIAL null, validated at scale on the canonical substrate.
  - **1 Hz MIXED-CADENCE VALIDATION (mac mini, hourly 60d baseline + 6h 1 Hz monitoring) — DONE
    (commit 59b4da5):** the contrast makes 1 Hz TRACTABLE where the temporal null catastrophically
    fails. To 2304 shards (R=1/4/8) and across 5 seeds: spatial-null **FDP 0.000**; the naive TEMPORAL
    null over-selects **FDP ≈ 0.97** (flags up to ALL 576 shards — the documented 1 Hz failure,
    reproduced at scale). 4/5 counters get a clean Mode-B guarantee at 1 Hz (power_w/sm_util/hbm/nvlink,
    recall ~1.0); **gpu_temp_c consistently abstains (Mode A)** — τ=120 s → idiosyncratic φ≈0.99, still
    near-unit-root after the common-mode cancels, so the monitor honestly revokes. Two enabling fixes:
    (i) cadence-aware fitting (estimate φ/scale at the monitoring cadence from the mon pre-fault prefix,
    since the OU φ=exp(−dt/τ) is cadence-dependent); (ii) CENTER-BEFORE-WHITEN — the independent
    treatment/control baselines give the contrast a nonzero mean, and `whiten` returns the seed tick
    unchanged, so without centering it was an ~8σ outlier that spuriously tripped the monitor. The
    in-memory path handles 6 h × 1 Hz at these scales; a long (≥days) 1 Hz window would want
    streaming/multi-core.
  - **STREAMING + MULTI-CORE for multi-day 1 Hz — DONE (commit 9a3e2f6):** `tools/clustersynth-mode-b.ts`
    gained a worker_threads byte-range streaming path (mirrors baseline-monitor) that NEVER materialises
    the bundle — each worker streams a byte range of the mon counters.ndjson, pairs each treatment row
    with its adjacent control row (`monPairs`, owning a pair iff its treatment starts in [byteStart,
    byteEnd), reading past the boundary to complete a straddling pair), computes the contrast e-value +
    calibration/whiteness scalars, and discards the arrays. Memory is O(2 rows × T) per worker, flat in
    fleet size. Byte-identical to the in-memory mixed path; same-cadence stays in-memory (it fits from the
    longer healthy baseline). **Validated (mac mini, 60d hourly baseline + 72 h 1 Hz monitoring, 3 days):**
    spatial-null **FDP 0.000** to 2304 shards on monitoring bundles of **1.3 / 5.2 / 10 GB** (R=1/4/8),
    analysed in 3 / 16 / 31 s; the temporal null still flags all 576 (FDP ≈0.97); gpu_temp_c abstains
    (whiteness ~2% over the long window). Peak RSS on the 5.2 GB bundle = **~2.4 GB** (dominated by the 14
    worker V8 isolates + GC high-water; the per-worker working set is just 2 rows) — and FLAT IN FLEET SIZE
    (per-worker memory is O(window×workers), not O(shards×window); the per-pair records are tiny scalars),
    so R=8's 10 GB bundle peaks at roughly the same RSS, where the in-memory path would scale with the full
    bundle. `monPairs` boundary coverage is unit-tested (1/2/3/5/7/13/64-way splits, incl. cuts between
    treatment and control).
- **ALWAYS-ON Mode B CONTROL LOOP — DONE (commit f27239e):** `tools/mode-b-loop.ts` is the orchestration
  layer that makes the two-mode architecture OPERATIONAL — it wires Mode-B FDR discoveries to actions.
  Each cycle, per emitter: update the PER-SHARD anytime-valid calibration monitors over the control cohort
  (they ACCUMULATE across cycles); decide construction validity NOW (broad calibration pass + Wall-A
  whiteness); route through the validity-class gate; if Mode B, run the gated e-BH and reconcile the
  discovery set against standing actions — DISPATCH new, WITHDRAW resolved; on a B→A transition (guarantee
  revoked) WITHDRAW ALL standing actions. Enforced + tested invariants (`test/mode-b-loop.test.ts`, 9):
  **no action without a live guarantee**, **revocation withdraws**, **debounce**, **resolution withdraws**,
  **anytime-valid accumulation** (drift spread across cycles revokes; healthy cohorts don't spuriously
  revoke; `rearm` re-establishes), **parallel/per-emitter** routing. The concrete action (block/page/
  remediate) is the injected `ActionSink`; the loop only says "FDR-controlled discovery, act"/"stand down".
  End-to-end replay CLI over a clustersynth bundle: all 5 counters enter Mode B and 23 actions dispatch at
  the cycles where each fault's evidence first crosses the e-BH threshold (early-warning→action), debounced.
  This is the operational answer to "how does Mode B get triggered": NOT by an event, but by a continuously-
  evaluated precondition (concurrent control present + construction currently valid); Mode A is the always-on
  substrate, Mode B a per-emitter overlay that emits FDR-keyed actions only while its guarantee is live.
- `tools/emitter-prototype.ts` retained as the research artifact behind this ADR (prototype; not pipeline).
