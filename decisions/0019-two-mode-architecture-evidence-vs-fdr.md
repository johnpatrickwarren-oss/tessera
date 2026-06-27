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

## Follow-ups (flagged)

- Implement `validity_class` as a code gate on the e-BH entry (mirror `tools/baseline-guard.ts`).
- Promote the normalized convex-mixture increment to the default e-value in `baseline-monitor` (currently
  raw e-detector peak → SupFDR adjuster; the adjuster is correct only on a genuine e-process).
- Runtime calibration monitor (anytime-valid; `Farran 2026`) to make `validity_class` revocable.
- Mode B comparative/concurrent-control evaluation (treatment vs control, canary vs fleet) — the spatial
  null is the achievable guarantee; build the harness for it.
- `tools/emitter-prototype.ts` retained as the research artifact behind this ADR (prototype; not pipeline).
