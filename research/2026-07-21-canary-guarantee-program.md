# Active synthetic-canary guarantee program — report

- **Date:** 2026-07-21
- **Artifacts:** design `docs/SPEC-canary-guarantee-program.md`; decision `decisions/0023-active-canary-conformal-eprocess.md`;
  code `tools/canary-sim.ts` + `tools/canary-experiments.ts`; tests `test/canary-sim.test.ts` (10);
  results `runs/2026-07-21-canary-sim/*.json` (+ run logs `runs/2026-07-21-canary-sim-*.log`).
- **Question:** can an active, randomized, versioned synthetic-canary program give Tessera a
  mathematically defensible FPR/FDR guarantee under realistic fleet nonstationarity, at an
  economically acceptable GPU cost?
- **Method:** probe-level fleet simulator (10,368 GPUs default; 103,680-GPU spot validation), 60-day
  horizons, 14 healthy-nonstationarity scenarios, full fault catalog, comparison ladder A–I,
  contamination/adaptive/economics sweeps. Tuning on seeds 1–5; all reported numbers from eval
  seeds ≥ 101. Reproduce with:
  `pnpm build && node tools/canary-experiments.js e1|e2|e3|e4|e5 [--seeds N] [--n GPUS] [--days D] [--supfdr]`.

## 1. Architecture assessment (current Tessera)

Inspected against executable code (not README claims). Load-bearing surfaces:

- **Validity gating exists and is real.** `tools/emitter-contract.ts` implements ADR 0019: only
  `theorem_valid`/`construction_valid` emitters with a passing runtime calibration monitor reach the
  FDR-bearing e-BH (`fdrBenjaminiHochberg` asserts eligibility; engine `eBenjaminiHochberg` does the
  selection). `baseline-monitor` is `empirically_audited` → Mode A (measured FDP, no guarantee) — the
  code is honest about this. Callers like `locality-drilldown.ts`/`peer-availability.ts` invoke the
  engine e-BH directly, bypassing the gate (they rely on upstream Mode-B gating; noted, not a bug).
- **The validated guarantee is the spatial null.** `mode-b-control.ts`/`clustersynth-mode-b.ts`:
  treatment−control differencing (shared common-mode cancels bit-for-bit) → whiten at idiosyncratic
  φ → normalized-mixture e-value → per-shard calibration + whiteness gate → e-BH. Validated to 2,304
  shards, FDP 0.000, incl. 1 Hz streaming (temporal null fails FDP≈0.97 at the same scale). Triad
  min-rule (ADR 0022 correction) handles control contamination.
- **The binding constraint on real fleets is comparability, not statistics.** GWDG anchor: only
  8–23% of real sibling GPUs have a κ-comparable peer because siblings run different jobs. Mode B is
  availability-bound; job-aware peer selection was named the coverage lever.
- **Temporal per-unit certification is dead** (N1, ADR 0007/0009/0012, emitter-prototype NO-GO), and
  the two-level hierarchical-FDR theorem is dead (N6). Any canary design must respect both.
- **Integration point for a canary source is clean.** The simulator's `canaryEmitter()` is an
  `EmitterContract` (`construction_valid`, revocable via a runtime monitor) that routes through the
  existing gated e-BH. A production probe runner would slot in as a new observation source feeding
  the same contract surface; **no architectural change to Tessera is required** — the canary stream
  is a new emitter class beside the existing Mode-B contrast emitters. The pieces Tessera lacks
  today: a probe scheduler/runner, the block-keyed rank/e-process layer (prototyped here), and the
  anchored envelope registry (per canary version).

**Verdict on repository readiness:** the experiment integrates without major architectural change;
the smallest viable production design is § 8.

## 2. Why canaries — what changes statistically

The canary is the active generalization of Mode B's concurrent control, fixing its two binding
constraints **by design rather than by matching**:

1. **Comparability is manufactured.** Every contemporaneous executor of canary version v runs the
   same versioned workload — the job factor (which caps passive comparability at 8–23%) is
   eliminated. The comparison block (probe × version × GPU gen × firmware × window) is exact by
   construction.
2. **Exchangeability is design-based.** Randomized placement within eligibility blocks makes
   healthy executors' results exchangeable by the randomization — a property of the *design*,
   independent of the drifting fleet state. Window-common drift cancels in ranks; there is **no
   baseline to go stale**, which is exactly the failure mode (N1) that killed the temporal null.
3. **Stopped e-BH becomes sound.** Each round's randomization is fresh, so per-unit e-process
   increments are conditionally valid given the ENTIRE past (global filtration) — the O4 leakage
   obstruction to data-dependent stopping does not arise. (Empirically verified: optional-stopping
   FDP matches fixed-grid FDP; § 4.)

Two nulls, never conflated (SPEC § 2): **H0-REL** (relative contemporaneous; supports localization;
structurally blind to common-mode) and **H0-ANC** (anchored versioned envelope; catches common-mode;
temporal ⇒ empirically calibrated only, N1).

## 3. The guarantee (precise statement, class, assumptions, violations)

**Strongest defensible claim** (tested, not assumed — evidence § 4):

> Within a comparison block (canary version × probe type × GPU generation × firmware × window),
> randomized contemporaneous canary executions yield exact super-uniform conformal rank p-values
> for healthy units, in finite samples, with no distributional assumptions [EXACT-FS]. The
> per-unit product of mixture-calibrated increments is an anytime-valid e-process w.r.t. the global
> filtration [ANYTIME]. At any stopping time, e-BH over a topology family's e-values controls that
> family's FDR ≤ q [ANYTIME, per family — arbitrary within-family dependence, P3]. The per-unit
> paging rule e ≥ 1/α controls per-unit anytime false-page probability ≤ α [ANYTIME]. The √E−1
> adjuster optionally upgrades per-stop FDR to time-uniform SupFDR at a power cost.

**Assumptions (all load-bearing; each tested):**

| # | assumption | violated by | measured consequence |
|---|---|---|---|
| A1 | placement randomized within block, independent of unit state | targeted/biased scheduling (H10), suspect-enriched escalation drafts (E4) | see § 4/§ 6 |
| A2 | block key captures eligibility (version/probe/gen/firmware) | hidden strata (H12), version mixing | mild per-test effect; e-process robust at unit level (calibrator insensitive to mild p-shift); blocks never pool across versions by construction |
| A3 | no asymmetric interference between tested unit and peers | shared-resource contention (H11) | § 4 |
| A4 | ties randomized | — | exact by construction |
| A5 | (group families) group's lagged self-reference is stable | fresh faults older than ~2 epochs; burn-in period | group families are **EMP-CAL**, not exact — see § 3.1 |
| A6 | (anchored) envelope transfers across time for a fixed version | environmental drift, firmware silent updates, seasonality (H3/H14) | anchored is **EMP-CAL**; benign-drift alarms measured (§ 4) |

**What is explicitly NOT claimed:** no cross-level hierarchical-FDR theorem (N6 — families are
separate, each with its own per-family FDR); no common-mode coverage by the relative null; no
temporal per-unit certification (N1); no validity under suspect-enriched adaptive drafts (measured
to fail, § 6); "FDR over discoveries" ≠ "FDR over *faults*" — the theorem attaches to the
exchangeability null (a discovery is "relatively deviant within block", which the fault taxonomy
then interprets).

### 3.1 Design findings the program forced (negative results turned into construction)

These were found by measurement during the program, in the spirit of not hiding failed tests:

1. **Naive qualification-period group handicap manufactures pseudo-faults.** Subtracting a group
   offset estimated from ~3–5 early samples injects the estimation noise as a persistent offset:
   ~12 false racks/run at 100k vs a Ville budget of 0.05. (Fix: lag + shrinkage + burn-in.)
2. **Pooled-execs permutation nulls under-cover under within-group correlated noise** (H2 rack OU):
   the group mean is over-dispersed vs iid draws → ~1.2 false racks/run. (Fix: rank the group stat
   among peer groups — common dispersion cancels in the cross-group rank.)
3. **Raw cross-group ranks compound serially for persistently-offset/noisier groups** (H2/H8):
   exchangeable per evaluation, but the same benignly-tilted rack occupies the extreme rank daily →
   E[increment | past] > 1 → ~4 false racks/run. (Fix: studentize each group's daily stat against
   its own lagged EW mean/sd — test the *change* in relative position.)
   **Consequence:** the group families' guarantee is honestly **EMP-CAL** (estimated self-reference),
   with a burn-in (~2 weeks) and a masking horizon (~12–16 d) — the group-level analogue of ADR
   0006. The unit-level family keeps the exact/anytime classes: per-exec noise dominates unit-level
   benign heterogeneity, and the mixture calibrator only rewards extreme ranks, so mild persistent
   unit offsets do not compound (measured: false pages within the Ville budget in all 14 scenarios).
4. **The min-p floor is a power law, not a validity law.** A comparison block with K peers cannot
   produce p < 1/(K+1)·(randomized): small fleets/budgets starve blocks (measured at 1,152 GPUs ×
   0.05%: zero testable blocks at 3 h windows). Comparison windows must pool enough contemporaneous
   executions; below that the system abstains — availability cost, never a false guarantee (the
   ADR 0022 κ-gate pattern, reappearing as the K floor).

## 4. E1 — calibration under healthy nonstationarity (RESULTS)

20 eval seeds × 14 scenarios × 60 d, N=10,368, β=0.05%, q=0.05, α_page=0.001. "Q1→Q4" = per-test
rate at α=.01 in the first vs last quarter of the horizon (delayed drift activates after day 6).
Full table with Wilson 95% CIs: `runs/2026-07-21-canary-sim/e1-calibration.json`.

| scenario | conformal (C/F) Q1→Q4 | historical (B) Q1→Q4 | passive (A) Q4 |
|---|---|---|---|
| H1 stationary | 0.0101 → 0.0098 | 0.0105 → 0.0101 | 0.0214 |
| H2 rack-correlated | 0.0101 → 0.0101 | 0.0104 → 0.0102 | 0.0213 |
| **H3 delayed slow drift** | **0.0101 → 0.0098** | **0.0221 → 0.5397** | **0.0866** |
| H4 diurnal | 0.0101 → 0.0100 | 0.0106 → 0.0097 | 0.0214 |
| **H5 abrupt benign step** | **0.0101 → 0.0098** | 0.0105 → **0.1146** | 0.0214 |
| H6 workload-mix change | 0.0100 → 0.0100 | 0.0103 → 0.0103 | 0.0214 |
| H7 scheduler change | 0.0100 → 0.0102 | 0.0103 → 0.0101 | 0.0214 |
| H8 heteroskedastic | 0.0103 → 0.0099 | 0.0149 → 0.0152 | 0.0214 |
| H9 missing 15% | 0.0100 → 0.0099 | 0.0101 → 0.0102 | 0.0212 |
| H10 placement bias | 0.0099 → 0.0098 | 0.0105 → 0.0105 | 0.0213 |
| H11 interference | 0.0100 → 0.0100 | 0.0101 → 0.0100 | 0.0214 |
| H12 hidden stratum | 0.0102 → 0.0099 | 0.0103 → 0.0103 | 0.0214 |
| **H13 common-mode step** | **0.0101 → 0.0098** | 0.0105 → **0.6664** | 0.0214 |
| H14 aging | 0.0102 → 0.0099 | 0.0114 → 0.0146 | 0.0243 |

- **The conformal contemporaneous null holds exact calibration in every scenario, every quarter**
  (all within Wilson CI of 0.0100). The historical canary baseline collapses exactly where the
  proposal predicted: 54× nominal under delayed drift, 67× under common-mode, 11× after one benign
  regime step. Passive per-unit z runs 2.1× nominal even when stationary (14-day per-unit baselines
  are data-starved — a structural passive weakness) and 8.7× under drift.
- **Symmetric placement bias (H10) does not break calibration** — when every execution shares the
  selection mechanism, the selected population is still exchangeable. The dangerous case is
  *asymmetric* selection between tested unit and peers (§ 6, suspect drafts).
- **e-BH families on healthy fleets:** 0–3 distinct false groups per 20 runs in every scenario
  (≈0.05–0.15/run, consistent with per-stop e-BH semantics under repeated daily stops); false unit
  selections ≈ 0–1 per 20 runs. With the **√E−1 SupFDR adjuster** the repeated-stop leakage
  disappears entirely (0 selection-stops in most scenarios — `e1-calibration-supfdr.json`) at a
  power cost; use it wherever automation consumes the standing discovery set.
- **Paging:** ~0.5–1.25 false pages/run vs a Ville budget of N·α = 10.4 — an order of magnitude
  inside the guarantee, in every scenario.
- **Runtime monitor:** 0 revocations across all 280 healthy runs (no false demotions B→A).
- **Scale invariance (103,680 GPUs, 5 seeds × H1/H3/H13):** conformal 0.0100 (Q4 0.00994–0.01013);
  historical fails identically (0.52 drift / 0.65 common-mode); anchored envelope detects the 3%
  fleet-wide slowdown at day 30.25 (~6 h after onset); under benign slow drift the anchored
  envelope raises ~81–92 alarms/run — **anchored cannot distinguish benign drift from common-mode
  degradation**; it is a triage feed, not a guarantee (`scale100k.json`).

## 5. E2 — detection, localization, DCGM complementarity (RESULTS)

8 eval seeds, N=10,368, 60 d, β=0.05%, onset day 20, healthy base H2. "eBH" = FDR-guaranteed
discovery covering the fault scope; delay in days from onset (`e2-faults.json`).

| fault | eBH det | median delay | correct level | stop-FDP |
|---|---|---|---|---|
| rack @1% | 4/8 | 10.9 d | 4/8 | 0.049 |
| rack @2% | 7/8 | 5.9 d | 7/8 | 0.007 |
| rack @5% | 8/8 | 4.9 d | 8/8 | 0.006 |
| power domain @1% | 8/8 | 10.9 d | 8/8 | 0.000 |
| gpu ×1, any severity ≤30% | 0/8 | — | — | — |
| gpu ×5 @5% | 0/8 (1/8 page) | — | — | — |
| host @1–5% (NVLink probe) | 0/8 | — | — | — |
| leaf switch @1–5% (xrack probe) | 0/8 | — | — | — |
| intermittent gpu (20% duty) | 0/8 | — | — | — |
| class-conditional rack @5% | 2/8 | 8.9 d | 2/8 | 0.071 |
| correctness gpu (5%/probe) | 0/8 | — | — | — |
| fleet common-mode @3% | 0/8 (by design) | anchored: ~6 h | — | — |

**The controlling variable is coverage, not severity.** At β=0.05%, each GPU receives ~0.09
gpu-probes/day (median revisit 132 h). Per-GPU e-processes therefore cannot accumulate within 45 d
at ANY severity — single-GPU, host (0.011 NVLink probes/host/day), leaf (1.6 path-touches/leaf/day),
intermittent, and correctness faults are all sentinel-invisible at this budget. Power comes from
aggregation: a rack pools ~7 member-probes/day and the rack/power families detect 1–5% faults in
5–11 days with per-family FDP ≤ q and correct level attribution. The relative null is correctly
blind to the fleet-wide slowdown (0/8), which the anchored envelope catches in ~6 h.

**DCGM complementarity** (visibility split, measured): dcgm-only faults — 0/8 for every canary
method, visible to passive telemetry only; canary-only faults (customer-visible, DCGM-invisible) —
detectable only by the canary channel (at group scale or via escalation); perf faults visible to
both, but only the canary side carries a guarantee. The production shape is therefore hybrid (H):
canary discoveries gate actions; passive DCGM telemetry does within-scope attribution and covers
the dcgm-only class. (The historical/passive per-exec "detection" columns in `e2-faults.json` are
uncontrolled — their E1 miscalibration means their apparent sensitivity comes with a false-alarm
rate that pages constantly; they are not comparable operating points.)

**Class-conditional faults** halve effective severity in mixed blocks (2/8 @5%) — workload-class
context belongs in the Mondrian key for probes that emulate class-specific behavior.

**Correctness channel:** at 5% manifestation/probe nothing accumulates at sentinel coverage; the
channel pays off only under escalation or near-deterministic manifestation — its real value is
turning probe validation failures into hard evidence at high manifestation rates.

## 6. E3/E4 — contamination and adaptive sampling (RESULTS)

**E3 — contamination** (fraction of fleet pre-degraded @1% from day 0; new rack@2% fault at day 20;
8 seeds; `e3-contamination.json`):

| contamination | healthy p≤.01 | new-fault detection | delay | stop-FDP | false revocations |
|---|---|---|---|---|---|
| 0% | 0.0098 | 7/8 | 4.9 d | 0.027 | 0 |
| 0.5% | 0.0095 | 5/8 | 4.9 d | 0.000 | 0 |
| 2% | 0.0094 | 5/8 | 4.9 d | 0.000 | 0 |
| 5% | 0.0084 | 5/8 | 4.9 d | 0.037 | 0 |
| 10% | 0.0074 | 6/8 | 4.9 d | 0.000 | 0 |
| 20% | 0.0060 | 6/8 | 5.9 d | 0.000 | 0 |

Contamination shifts rank methods in the **conservative** direction (degraded peers make healthy
units look relatively better): per-test FPR falls monotonically, FDP stays ≤ q, the monitor never
falsely revokes, and detection power dips modestly (~25%) with stable delay. **There is no
FDR-breaking contamination level within 20%** — contamination is a power cost, never a validity
cost, which is the structural advantage of ranks over the mean/covariance reference estimators that
ADR 0015 had to armor (robust location/trimming are already implicit in the rank).

**E4 — adaptive sampling** (β=0.2% average; 3 GPUs @5%, onset day 15; escalate at e≥4, 30% budget
reserve; 12 seeds; `e4-adaptive.json`):

| variant | detection | median delay | healthy p≤.01 | gpu-family FDP | GPU-h/run |
|---|---|---|---|---|---|
| fixed-rate | 12/12 | 19.9 d | 0.0099 | 0.038 | 29,168 |
| **adaptive, random peer drafts** | 12/12 | **7.9 d** | 0.0082¹ | 0.052 | **21,429** |
| adaptive, SUSPECT-enriched drafts | 12/12 | 8.9 d | 0.0083¹ | 0.045 | 21,477 |

¹ conservative shift: escalation floods the faulty units' blocks with their own extreme execs,
pushing healthy peers' ranks away from the tail — under-coverage, not inflation.

- **Escalation is the answer to the coverage wall**: 2.5× faster detection at 27% lower realized
  cost, with calibration intact and FDP ≈ q. Sentinels buy the trigger; escalation buys the delay.
- **Suspect-enriched peer drafts degrade detection, not FPR** — for a one-sided "worse than peers"
  test, comparing suspects against suspects makes them mask each other (evidence dilution; the
  co-located limit, e.g. drafting same-rack peers for a rack fault, masks completely — the group
  family's cross-rack comparisons cover exactly that case). The FP direction would arise from
  drafting systematically-healthy peers. Production rule stands: **escalation peer drafts must be
  freshly randomized from the eligibility block**; validity under adaptivity then follows from the
  conditional (per-round) validity of the increments — confirmed by the calibration columns.
- **Optional-stopping calibration** (E1's `stopsOptional`): first-crossing FDP matches fixed-grid
  FDP across scenarios — consistent with the global-filtration argument for stopped e-BH (§ 2.3).

**Coverage intervals at β=0.05% (measured, 100k):** GPU compute-probe revisit p50 129 h / p95
543 h; rack ~7 member-probes/day (≈3.4 h between member touches); leaf ~1.6 path-touches/day;
host NVLink ~0.011 probes/host/day (≈90 d — token coverage; host-level evidence should come from
member-GPU aggregation, not the collective probe, at sentinel budgets).

## 7. E5 — economics (RESULTS)

6 eval seeds per cell, N=10,368, 60 d (`e5-economics.json`). Detection = eBH or page; "saved" =
degraded GPU-h avoided vs discovery at horizon end (conservative counterfactual); "cost" = canary
GPU-h over the same period.

| β | revisit p50 | gpu1@5% det/delay | rack@1% det/delay | rack@5% det/delay | rack@5% saved/cost |
|---|---|---|---|---|---|
| 0.01% | 319 h | 0/6 | 0/6 | 0/6 | 0 |
| 0.02% | 242 h | 0/6 | 0/6 | 0/6 | 0 |
| 0.05% | 132 h | 0/6 | 1/6 · 17.9 d | 6/6 · 6.9 d | **0.62** |
| 0.10% | 72 h | 4/6 · 30 d | 4/6 · 8.9 d | 6/6 · 6.9 d | 0.31 |
| 0.20% | 39 h | 6/6 · 35.9 d | 6/6 · 10.9 d | 6/6 · 6.9 d | 0.15 |
| 0.50% | 15 h | 6/6 · 11.9 d | 6/6 · 8.9 d | 6/6 · 4.9 d | 0.06 |
| 1.00% | 9 h | 6/6 · 5.9 d | 6/6 · 6.9 d | 6/6 · 4.9 d | 0.03 |

Readings (all in GPU-hours; $/GPU-h is a configurable multiplier):

- **Budget floor:** below ~0.05% nothing is reliably detectable at this fleet size — blocks starve
  and coverage vanishes. The practical sentinel operating range is 0.05–0.2%.
- **Pareto frontier:** rack-scale faults are on the frontier at the LOWEST budget (0.05%: 6/6 at
  6.9 d, saved/cost 0.62 — a single rack@5% event per ~5 weeks fully pays the budget). Raising β
  buys single-GPU coverage at strongly diminishing economics (β=1% detects gpu@5% in 6 d but costs
  2,460 GPU-h/day to save ~1.6 GPU-h/day of degradation).
- **Minimum detectable degradation vs budget** (60 d horizon): β=0.05% → rack@~1–2%; β=0.1% →
  gpu@5% (slow) + rack@1%; β=1% → gpu@5% in days; gpu@1% is undetectable by sentinels at every β
  tested — it needs escalation-concentrated sampling (§ 6) or months of horizon.
- **What actually pays** (break-even framework below): common-mode events (anchored: a 3% fleet
  slowdown detected 1 day earlier repays ~60 days of a 0.05% budget), rack/domain events (≈1 rack
  event per month at 0.05% breaks even on capacity alone), and correctness/SLA faults whose value
  is not capacity-denominated. Single-GPU small-degradation discovery does NOT pay at nominal cost
  — it becomes economic only with opportunistic/preemptible execution (effective cost ≪ nominal)
  or as escalation triage on passive-telemetry leads.
- **Cost accounting at 100k (measured):** β=0.05% = ~503 execs/h, peak 52 concurrent GPUs (0.05%
  of fleet), 1,227 GPU-h/day, per-GPU revisit p50 129 h / p95 543 h.

### Break-even framework (report GPU-hours; $/GPU-h is a configurable multiplier)

Canary cost/day = β·N·24 GPU-h (β = budget fraction). A fault population of `Σ nAff·s` degraded
GPU-equivalents detected Δt hours earlier saves `Σ nAff·s·Δt` GPU-h. Break-even:
`Σ nAff·s·Δt ≥ β·N·T`. At β=0.05% on 100k GPUs (=50 GPU-equiv, 1,200 GPU-h/day):

- a **fleet-wide 3% slowdown** (3,000 GPU-equiv) detected **one day** earlier repays **60 days** of
  canary cost — common-mode events dominate the economics, and they are exactly what the anchored
  envelope catches within hours;
- a **72-GPU rack at 5%** (3.6 GPU-equiv) detected 5 days earlier repays ~10.8 days of cost;
- a **single 1%-degraded GPU** (0.01 GPU-equiv) can **never** repay nominal canary cost by
  capacity accounting alone — ~5,000 such GPUs would have to be continuously protected. Single-GPU
  value rests on (i) opportunistic/preemptible execution making β's effective cost ≪ nominal,
  (ii) correctness/SLA detection valued above GPU-hours, (iii) escalation concentrating cost only
  where evidence exists.

## 8. Minimum viable production design (recommendation)

1. **Probes:** single-GPU compute + HBM sentinels (300 s), host NVLink collective, cross-rack pair
   probe, E2E inference probe; all with output validation (the correctness channel is nearly-free
   evidence and catches SDC-class faults the perf channel misses). Versioned: code, kernel, inputs,
   batch/sequence, image, timeout, telemetry schema, resource envelope. A version change = a new
   statistical class; no pooling across versions (block key enforces).
2. **Budget:** 0.05–0.1% of fleet GPU-time; 3 h comparison windows at ≥10k-GPU scale; block =
   probe × version × gen × firmware. Small fleets need proportionally higher β (K floor).
3. **Statistics:** randomized placement (scheduler must LOG the randomization — it is the validity
   certificate); conformal ranks → mixture-calibrator e-processes (unit level); studentized-change
   cross-group conformal (rack/leaf/power/region families, burn-in 2 weeks); per-family stopped
   e-BH at q; per-unit paging at 1/α; √E−1 adjuster where a standing time-uniform discovery set is
   consumed by automation. Anchored envelope per version for common-mode with drift triage.
4. **Escalation:** two-stage; triggers on e-process thresholds; **escalation peer drafts MUST be
   freshly randomized** — never drawn from the suspect pool (measured failure, § 6); escalated
   evidence composes multiplicatively with sentinel evidence (same e-process).
5. **Contract integration:** one `EmitterContract` per (probe, version) — `construction_valid`,
   FDR-bearing only while the runtime uniformity monitor passes (trimmed two-sided calibrator
   martingale over pooled conformal p's; catches broad design breaks, blind to sparse faults);
   weekly A/A audit (placement randomization vs outcomes) as the second control.
6. **Division of labor with DCGM/passive:** canaries carry the guarantee; DCGM/passive telemetry
   (Mode A) does within-scope attribution, ranking, and covers dcgm-only fault classes; the
   canary discovery set gates actions (the mode-b-loop pattern).

## 9. Verdict

Against the four-category scale, **split by claim surface** (a single label would hide the
load-bearing distinction):

- **Relative contemporaneous guarantee (unit family + per-family stopped e-BH + paging):
  mathematically defensible and operationally useful** — under assumptions that are *restrictive
  but design-enforceable*: randomized placement (logged by the scheduler — the randomization IS the
  validity certificate), versioned blocks, randomized escalation drafts, block keys covering
  eligibility. Exact finite-sample conformal validity held at nominal in all 14 nonstationarity
  scenarios, at 10k and 100k scale, under 20% contamination, and under adaptive probing — the
  precise failure predicted for historical baselines (54–67× calibration collapse under delayed
  drift/common-mode) never touches the contemporaneous null, because there is no baseline to go
  stale.
- **Group/topology localization families: defensible only under restrictive assumptions, honestly
  EMP-CAL** — the studentized-change construction is calibrated everywhere tested, but its
  self-reference is estimated (burn-in ~2 weeks, masking horizon ~12–16 d), and the theorem
  attaches to the exchangeability null, not to "is a fault" (cf. the caution: score calibration ≠
  topology-level FDR). N6 stands: per-family FDR only, no cross-level theorem.
- **Anchored global (common-mode) detection: empirically useful but not guarantee-bearing** (N1 —
  a temporal null; catches a 3% fleet slowdown in ~6 h but cannot distinguish benign drift from
  degradation without triage).
- **Economics: viable at a narrow, real operating point.** β=0.05–0.1% + escalation pays for
  itself on rack/domain events (~1 rack event/month breaks even on capacity alone) and massively
  on common-mode events (1 day earlier ≈ 60 days of budget); it does NOT pay for small single-GPU
  faults on capacity accounting — those need opportunistic execution, SLA/correctness valuation, or
  passive-telemetry-triggered escalation (the hybrid).

**Final decision criteria (§ SPEC):** (1) better calibration than historical under delayed
nonstationarity — YES, decisively; (2) precisely scoped guarantee — YES (stated with classes);
(3) useful power for realistic faults — YES at group scale and via escalation, NO for sentinel-only
single-GPU faults at economic budgets; (4) cost below protected capacity — YES for the fault
classes that dominate fleet economics, NO for small unit faults; (5) complements DCGM — YES
(visibility split measured; hybrid is the design); (6) clear production contract — YES (§ 8 +
ADR 0023).

**Recommendation: adopt, scoped.** Build the MVP of § 8 with the guarantee claimed ONLY for the
relative contemporaneous surface (unit family; group families labeled empirically-calibrated;
anchored labeled triage). Do not build a canary program whose justification is single-GPU
small-degradation discovery — that use case fails the economics at every tested budget.

## 10. Threats to validity of this program itself

- Simulation, not hardware: score distributions are Gaussian-mixture idealizations; real probe
  runtimes have heavier tails and quantization. The conformal construction is distribution-free, so
  calibration transfers; POWER numbers (delays, minimum detectable severities) will shift and must
  be re-measured on a real probe pilot (the mac-mini real-telemetry program is the natural
  substrate once its 56-day baseline clears ~2026-08-29).
- Interference was modeled as load-coupling (H11) with symmetric selection; a real scheduler can
  create tested-vs-peer asymmetries the sim did not enumerate — the runtime uniformity monitor +
  weekly A/A audit are the production defenses, and both were exercised only synthetically here.
- The fixed probe-mix shares (30/20/20/15/15) were not optimized; leaf/host coverage conclusions
  are conditional on those shares.
- Tuning/eval split honored (tune seeds 1–5, eval ≥101), but all development iterations observed
  the same scenario FAMILY definitions; genuinely out-of-family drift shapes remain untested.
