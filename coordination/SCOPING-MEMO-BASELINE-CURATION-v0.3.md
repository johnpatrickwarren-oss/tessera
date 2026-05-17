# SCOPING-MEMO — Tessera Baseline Curation v0.3

_Author: Tessera architect (operator-led scoping; assisted draft; v0.3 amends v0.2 § 1 Executive summary + § 2 Stage 2b prose to narrow FCP-1 detection scope to **sustained fleet events** per operator-confirmed (B)+(D) disposition 2026-05-16 under authority-expansion)._ Companion to `SCOPING-MEMO-v0.3.md`. Q-cycle path: Tessera Phase 1 SLICE 5 amendment at R08 closes empirical-power gap surfaced by R07 PR-F8._

_Format: anchor `templates/Q-NN-SPEC-TEMPLATE.md` at SCOPE-PROPOSAL fidelity, mirroring `SCOPING-MEMO-v0.3.md`. References DeploySignal pin at SHA `5a72371` per Tessera Phase 1 vendoring policy._

---

## 1. Executive summary

At fleet scale (target ~10³ shards), baseline curation cannot be performed by hand. Tessera inherits robust per-cell estimators (Family C: MCD / MRCD / Ledoit-Wolf shrinkage) and an audit-emission pipeline (Q61 SPEC-1 D1–D4), but **does not inherit any contamination-screening stage that runs over the baseline window before per-cell calibration**. DeploySignal's calibration entry point `tools/calibrate.ts` reads a "healthy BaselineBundle" by stated assumption (`tools/calibrate.ts:3`); validating that assumption is operator-side work today.

This memo proposes a **bundle-level contamination-screening stage** that runs before calibration. It exploits the inherited per-cell robust estimators where appropriate, adds a **fleet-correlated-pattern primitive (FCP-1)** that DeploySignal does not need (DS is single-deployment) but Tessera does (N-shard fleet sees fleet-event-shaped contamination correlatedly across many shards), and emits audit records via the existing `BaselineCurationDecision` schema as new decisions D11–D13. Vendor at-pin where possible; novel work is bounded to FCP-1 and possibly one signal-processing primitive (Spectral Residual, ~200 LOC).

### 1.1 Detection scope (v0.3 narrowing, 2026-05-16, operator-confirmed under authority-expansion)

**FCP-1 detects SUSTAINED fleet events** (multi-window elevation across many windows): the canonical realistic threat model — deploy push, firmware rollout, cooling-zone failure, fleet-wide config change. Each of these events propagates a sustained elevation in per-shard contamination rate across many windows (minutes to hours of cluster wall-clock time). FCP-1's sequential betting-adaptive e-process accumulates wealth during the sustained elevation; the test fires when accumulated log-wealth crosses log(1/α_fleet).

**Transient single-window contamination is OUT of scope for SLICE 5.** R07 PR-F8 empirical evidence (q07-fleet-correlated test file; AC-12 + AC-13) demonstrated that single-window contamination spikes do NOT trigger FCP-1, even at strong p_alt=0.5: the martingale property of the betting e-process means the first window of a transient spike has log_S unchanged (ons_lambda=0 from clean training prior), and post-spike clean windows do not accumulate wealth. A transient spike at a single window with N=100 shards and α_fleet=10⁻³ produces 0 of 30 trials firing per the R07 PR-F8 evidence matrix.

**Why this narrowing is the right architectural disposition**: real fleet events are sustained by their physical nature (deploys take minutes to roll out; firmware pushes propagate across racks over tens of minutes; cooling-zone failures are sustained until intervention). A transient single-window spike is more likely a measurement-spike artifact than a real fleet event; per-shard runtime detectors (Family A/C/D) are the correct surface for transient artifact detection (they're designed for single-tick anomaly detection at per-shard granularity). FCP-1's role is cross-shard fleet-scale event detection at the calibration substrate; transient single-window detection would duplicate the per-shard runtime detector layer without architectural benefit.

**Phase 2+ candidate**: if real GPU-cluster operational evidence surfaces a demand for transient-single-window fleet-event detection (e.g., a recurring cluster-wide measurement glitch that lasts exactly one window), Phase 2 may add a SECOND detector tuned for that case (e.g., GROW mixture or static-λ formulation that has buildup-independent power per Reviewer's Option C). R08 documents this as future-cycle candidate — not blocking SLICE 5 close.

### 1.2 Order matters (preserved from v0.2)

Order matters: the current SLICE 2b work (R03/R04) is building warm-start residuals that cache against fleet-aggregate baselines. If those aggregates are contaminated, warm-start delivers poisoned-baseline behavior by default. Curation should be available before warm-start runtime gets exercised against production-shape fleet data.

## 1.5 Memo structure options considered

### (a) Single Phase 1 SLICE 4 covering vendoring + FCP-1 + integration — PICKED (provisional, pending Q-JC dispositions)

Mechanical-vendor the inherited curation tools (`tools/curate-baseline-pipeline.ts` + `tools/calibrate.ts` + `tools/calibrators/family-c.ts`) at SHA `5a72371`; add FCP-1 as decision D11; emit audit records via the existing pipeline. Single slice is justifiable because the inherited tools are well-decomposed and FCP-1 is a small additive primitive.

### (b) Split: vendor first (SLICE 4), FCP-1 second (SLICE 5) — REJECTED at scoping time

Tempting because it isolates novel-literature pair-review work from mechanical vendoring. Rejected because the vendoring without FCP-1 doesn't move Tessera forward — the inherited pipeline already runs and assumes a healthy bundle. The Tessera-native contribution IS FCP-1; without it, this is just a vendoring chore.

### (c) Spectral Residual + Robust PCA + BOCPD bundled — REJECTED at scoping time

Three novel-literature algorithms simultaneously fires Memorial D pair-review-trigger × 3 and adds substantial review burden without empirical justification for needing all three. Adopt only as needed; FCP-1 alone may suffice for the fleet-correlated-pattern detection case, with SR/RPCA/BOCPD as future-cycle additions if FCP-1 + inherited per-cell robust estimators leave detectable contamination gaps in real GPU-cluster traces.

### (d) Defer entirely to Phase 2 — REJECTED at scoping time

Tempting because Phase 2 already touches cross-shard correlation (Extension 3). Rejected because warm-start runtime is being implemented NOW in SLICE 2b (R03 landed; R04 just closed). Caching warm-start residuals against potentially-contaminated fleet aggregates before contamination screening exists is a multi-round rework risk. Phase 1 SLICE 4 puts curation on the critical path of the Tessera Phase 1 close.

## 1.6 Existing architectural surface (REVIEWER-ANCHOR — mandatory)

_All citations against DeploySignal main@SHA `5a72371`; Tessera vendoring pin per `coordination/VENDORING-MANIFEST.md`._

| Inherited surface | File@SHA `5a72371` | Lines | What it does | Tessera vendoring status |
|---|---|---|---|---|
| Robust per-cell covariance estimators (MCD / MRCD / Ledoit-Wolf) | `engine/types/families/c.ts` | `5-7` (covariance_method discriminator declaration); `373-378` (breakdown-point comment + h_support) | Per-cell robust estimators applied during calibration; configurable via `covariance_method: 'mcd' \| 'mrcd' \| 'ledoit_wolf'` on `FamilyCPerCell` | Vendored at-pin in Phase 1 SLICE 1 (`tessera/engine/types/families/c.ts`) |
| Audit-emission pipeline schema | `engine/types/config.ts` | `198-219` (`baseline_curation_pipeline_diagnostics` field + `BaselineCurationDecision` interface + `BaselineCurationDecisionId` union type) | Stamps per-decision audit records on `CompiledConfig.baseline_curation_pipeline_diagnostics`; **does NOT transform calibration state — inspection only** | Vendored at-pin in Phase 1 SLICE 1 (`tessera/engine/types/config.ts`) |
| Audit-emission pipeline tool | `tools/curate-baseline-pipeline.ts` | `1-261` (full file; 10 decisions, only D1–D4 implemented) | Orchestrates SLICE_1/2/3 decision passes; SLICE_1 ships D1–D4; SLICE_2/3 throw `NotImplementedError` | **NOT vendored in Tessera** |
| Calibration entry point | `tools/calibrate.ts` | `1-30` (header docstring); reads "healthy BaselineBundle" assumption stated at `:3` | Reads bundle + α-budget → emits CompiledConfig; **assumes input bundle is healthy** | **NOT vendored in Tessera** |
| Family C calibrator (where MCD/MRCD/LW are invoked) | `tools/calibrators/family-c.ts` | (full file) | Per-cell Family C parameter fitting with robust covariance method dispatch | **NOT vendored in Tessera** |
| Warm-start runtime (Tessera-native, in flight) | `tessera/engine/per-shard/warm-start.ts` (R03 landed) + `tessera/engine/per-shard/welford.ts` (R04 landed) | Recent commits `dea1d7a` (R03 GREEN), `7796f29` (R04 GREEN) | Per-shard residual state machine + online Welford statistics | **Tessera-native; written R03/R04**. Will cache residuals against fleet-aggregate baselines = the load-bearing reason curation matters NOW. |

**What is verifiably missing (REVIEWER-ANCHOR for downstream spec):**

1. **No bundle-level contamination-screening stage.** The inherited pipeline goes: (build BaselineBundle externally) → (assume bundle is healthy) → (calibrate per-cell with robust estimators) → (emit audit records). The "assume bundle is healthy" step is the gap.
2. **No fleet-correlated-pattern detection primitive.** Each cell's MCD/MRCD applies independently. Cross-cell contamination from a single fleet event (deploy, firmware push, cooling failure) — which contaminates many cells across many shards correlatedly — has no inherited treatment.
3. **D5–D10 are unimplemented in the audit pipeline** (`tools/curate-baseline-pipeline.ts:65-78` raise `NotImplementedError` for SLICE_2 and SLICE_3). D11+ (the FCP-1 audit decision proposed below) does not exist in the inherited enum.

**Correction to architect's prior conversational claim (2026-05-16, this session):** an earlier turn implied "DeploySignal already has a 10-decision baseline curation pipeline" with the suggestion that it performed contamination filtering. After opening `tools/curate-baseline-pipeline.ts`, this claim is corrected: the 10 decisions are **audit-emission records** (`pipeline does no calculation; just inspects state and stamps audit records`, `:23-25`), not contamination filtering steps. The originating-conversation's framing — "What DeploySignal doesn't yet do is run these as a pre-pass during baseline learning" — was substantively correct. This memo proceeds on the corrected basis. (Memorial D file-opened-discipline confirmation: claim corrected via direct file open, not from memory.)

---

## 2. Per-stage scope

The proposed work has three stages, mapped roughly to a single Phase 1 SLICE 4 or split across two slices depending on Q-JC1 disposition.

### Stage 1 — Vendor the inherited calibration toolchain

Vendor the three load-bearing tools at SHA `5a72371`:

- `tools/calibrate.ts` (entry point)
- `tools/calibrators/family-c.ts` (Family C MCD/MRCD/LW dispatch)
- `tools/curate-baseline-pipeline.ts` (audit-emission orchestrator)

Per-file VENDORED headers + manifest entries per Tessera Phase 1 SLICE 1 vendoring policy (`SCOPING-MEMO-v0.3.md` § 9). Vendoring policy for each file: at-pin (default) unless Tessera-specific deltas are needed at SLICE 4 — see Q-JC1 below.

### Stage 2 — Add bundle-level contamination screening (pre-calibration)

Insert a new stage **before** `tools/calibrate.ts` reads the bundle. Two sub-stages:

**Stage 2a — Per-shard within-window screening.** Run the inherited per-cell robust estimators (MCD/MRCD/LW) at the WINDOW level (not per-cell) to identify samples whose Mahalanobis distance under the robust subset exceeds the breakdown-point-derived cutoff. Output: per-(shard, time-window) contamination mask. Emit as `BaselineCurationDecision` record `D11`. This is well-bounded; the inherited estimators are already vendored.

**Stage 2b — Fleet-correlated-pattern primitive (FCP-1) — SUSTAINED-event detection (v0.3 narrowing).** Cross-shard correlated-mask detection via a sequential e-process formulation (v0.2 amendment supersedes v0.1's K%-of-shards threshold framing — see § Q-JC4; v0.3 narrowing supersedes v0.2's implicit "any fleet event" framing — see § 1.1 above). For each fleet-time-window `w`, let `X_w` denote the count of shards whose per-shard contamination mask (Stage 2a output) is 1 at window `w`. Form an e-value `e_w = L(X_w | Binomial(N, p_alt)) / L(X_w | Binomial(N, p_base))` comparing H₀ (per-shard masks independent under baseline contamination rate `p_base`) vs H₁ (per-shard masks correlated under fleet-event-elevated rate `p_alt > p_base`). The running product `∏ e_w` is a non-negative martingale under H₀; Ville's inequality gives anytime-valid fleet-FPR control at operator-set level `α_fleet`. Decision rule: declare window `w` fleet-event-contaminated when the running e-process exceeds `1/α_fleet`, then curate that window out from ALL shards' baselines (not just the masked-out shards). **Detection scope (v0.3)**: FCP-1 detects SUSTAINED fleet events — multi-window elevation. The sequential betting-adaptive e-process requires accumulation across many windows of elevation to reliably cross the threshold; transient single-window events do NOT accumulate sufficient wealth via the martingale construction. R07 PR-F8 evidence: AC-8 (30-window sustained injection) fires reliably; AC-12 + AC-13 (single-window injection) do NOT fire (intentional — single-window detection is out of scope; see § 1.1). Aligns with Q-J1 hybrid Ville + e-BH commitment; reuses inherited betting-e-process machinery for the `p_alt` mixture (see Q-JC4a). This is **the Tessera-native contribution** — DeploySignal's per-deployment calibrator has no notion of fleet-time-windows, so it cannot apply this primitive. Emit as decision `D12`.

### Stage 3 — Integration with calibration + warm-start runtime

Two integration points:

**Stage 3a — Curated bundle handoff to `calibrate.ts`.** `tools/calibrate.ts:3` says "reads a healthy BaselineBundle." With Stage 2 in place, this preserves the invariant: the calibrator still reads a healthy bundle; "healthy" is now produced by Stage 2 rather than asserted by external workflow.

**Stage 3b — Warm-start eligibility tagging.** The R03-landed warm-start state machine caches residuals against fleet-aggregate baselines. If Stage 2 identified a fleet-event window, residuals computed against that window must be flagged stale (set `residual_seed_hash` to a sentinel value or absent) so the runtime mechanism doesn't admit them. This couples to the R03 disposition for `residual_seed_hash` semantics. Emit as decision `D13`.

---

## 3. Q-cycle estimate

| Slice | Scope | Estimated Q-cycles | Dependencies |
|---|---|---|---|
| **Phase 1 SLICE 4 (preferred bundling)** | Stage 1 vendoring + Stage 2a per-shard window screening + Stage 3a calibration handoff. Defers FCP-1 to SLICE 5. | 1 round (full tier; ~45–60 min wall-clock at current pipeline speed) | R03/R04 close (✓); no novel literature work — pure vendoring + restructure of inherited code paths. |
| **Phase 1 SLICE 5** | Stage 2b FCP-1 fleet-correlated detection + Stage 3b warm-start eligibility tagging. | 1 round (full tier) | SLICE 4 close; SLICE 2b complete (warm-start runtime, eligibility-window decisions). |
| **Phase 1 SLICE 6 (optional — empirical add-ons)** | Spectral Residual / Robust PCA / BOCPD additions IF FCP-1 + inherited per-cell robust estimators leave detectable gaps in real GPU-cluster traces. | 1 round per algorithm added (full tier; each fires Memorial D pair-review-trigger) | SLICE 5 close + empirical evidence of FCP-1 insufficiency. |

**Total**: 2–5 rounds depending on Q-JC6 disposition (whether to add SR/RPCA/BOCPD speculatively or only on empirical demand).

## 4. Risk register

### 4.1 Statistical-correctness risks

- **R-C1** — FCP-1's e-process construction (specifically the `p_alt` mixture/prior choice per Q-JC4a, the `p_base` estimation strategy per Q-JC4b, and the conditional-independence handling of plug-in estimation) determines the test's power and Type-I-error properties. Under-powered → false-negative curation (real fleet events slip through). Over-aggressive → false-positive curation (curate-out healthy fleet-wide variations). Mitigation: PR-F8 pair-review trigger with explicit evidence matrix (synthetic-fleet H₀ + injected-fleet-event H₁); architect must enumerate ≥3 e-process formulations with rejection rationale, AND formally verify that `∏ e_w` retains the martingale property under the chosen plug-in `p_base` estimation strategy (standard fix: estimate `p_base` from disjoint prior-window data, or use a properly conditional e-process construction). Loss of martingale property invalidates Ville-bound FPR control.
- **R-C2** — Per-shard window screening (Stage 2a) using MCD/MRCD at the WINDOW level deviates from the inherited per-CELL application. Memorial F sub-rule 1 fires (compile-time substrate modification across read-paths). Architect must Step-0-grep all consumers of `family_C` to verify window-level application doesn't break the inherited per-cell semantic.
- **R-C3** — Order-of-application matters: Stage 2a (per-shard window) before Stage 2b (fleet-correlated) before calibration. If implementation reorders these, the FCP-1 detection becomes meaningless (calibrate uses contaminated cells; fleet-correlated detection runs against artifact-contaminated calibration output). Architect must enforce ordering via integration-point spec.

### 4.2 Engineering risks

- **R-E1** — `tools/calibrate.ts` is large (full size unknown until vendoring; visible header at `:1-30`); vendoring with-deltas at SLICE 4 risks Memorial F sub-rule 2 trigger (substrate-stamped-fields-preservation). Disposition options in Q-JC1.
- **R-E2** — Stage 2 adds a tools-level dependency between Tessera and the DeploySignal toolchain shape. If DeploySignal evolves `calibrate.ts` significantly at SHA > `5a72371`, Tessera's vendor-with-deltas drifts. Pin discipline (`SCOPING-MEMO-v0.3.md` § 9) applies.
- **R-E3** — Per-shard window screening over a fleet of ~10³ shards is O(N_shards × N_windows × MCD_cost_per_window). MCD has O(p²) per-window cost (p = signal dimensionality). At fleet scale this is non-trivial CPU time. Empirical PR-F5 measurement at SLICE 4 close.

### 4.3 Anti-scope risks (tempting absorptions to refuse)

- **A-C1** — Do NOT bundle SR / RPCA / BOCPD into SLICE 4 just because they're conceptually adjacent. Each is a separate Memorial D pair-review-novel-literature trigger; pre-empirical-evidence bundling violates inherited PR-F discipline.
- **A-C2** — Do NOT modify the inherited `BaselineCurationDecision` schema (additive extension only — new decision IDs D11/D12/D13 added to the union; existing D1–D10 untouched).
- **A-C3** — Do NOT modify the inherited per-cell calibration logic (Stage 1 is mechanical vendoring; Stage 2 is pre-calibration; Stage 3a hands a curated bundle TO `calibrate.ts` unchanged).
- **A-C4** — Do NOT implement D5–D10 (the inherited NotImplementedError stubs). They are inherited future work for DeploySignal; Tessera's contribution is D11–D13, independent of whether D5–D10 ever ship.
- **A-C5** — Do NOT pre-build a UI for contamination diagnostics. Audit records on `CompiledConfig.baseline_curation_pipeline_diagnostics` are the wire format; surface is operator-tools, deferred until methodology is proven.

---

## 5. Open architectural questions for John (Q-JC1 → Q-JC6)

(unchanged from v0.2 — Q-JC1 through Q-JC6 sections preserved verbatim, including all pre-prediction picks; the v0.3 narrowing in § 1.1 is a scope-claim narrowing applied AT THE OUTPUT level, NOT a Q-JC re-disposition. All Q-JC framework choices stand.)

### Q-JC1 — Vendoring policy for inherited calibration tools

Inherited `tools/calibrate.ts` + `tools/calibrators/family-c.ts` are NOT YET in Tessera. Three options:

- **(α) Vendor at-pin verbatim**, then Stage 2 is a NEW Tessera-only file `tools/curate-baseline-pre-pass.ts` that runs BEFORE calibrate. Cleanest separation; lowest Memorial F risk.
- **(β) Vendor with Stage 2 inlined at calibrate.ts top-of-main** — single file responsibility but high Memorial F sub-rule 2 risk.
- **(γ) Write Tessera-native calibrate-equivalent from scratch** — maximal flexibility, maximal scope creep, rejected without strong reason.

Architect-pre-prediction: (α). Memo asks for John confirmation; the (α) framing is what Stage 1/2/3 scope above assumes.

### Q-JC2 — Pre-pass vs always-on

The originating conversation framed this as a "pre-pass during baseline learning." Per-shard runtime drift detection (post-baseline) is a different problem — that's what Family A/C/D already do continuously. Confirm: this work is bounded to **pre-calibration screening**, not continuous-streaming filtering of inbound observations.

Architect-pre-prediction: yes, pre-pass only. Always-on filtering is detector territory.

### Q-JC3 — Per-shard vs fleet-aggregate curation order

Stage 2a is per-shard; Stage 2b is fleet-correlated. Two valid orderings:

- **Per-shard first** (Stage 2a → Stage 2b): each shard's local contamination handled independently; fleet event detected over the masks. Architect-pre-prediction: PICKED. Local outliers shouldn't survive into the fleet-correlated step.
- **Fleet-aggregate first** (reverse order): fleet event detected over raw windows; per-shard local screening filters the residue. Risk: fleet-step misidentifies coincident-but-independent multi-shard local events as fleet-correlated.

### Q-JC4 — FCP-1 statistical formulation

The fleet-correlated-window test is a sequential e-process over windows under H₀ (per-shard masks independent, `X_w ~ Binomial(N, p_base)`) vs H₁ (per-shard masks correlated under elevated rate, `X_w ~ Binomial(N, p_alt > p_base)`). The e-value `e_w = L(X_w | p_alt) / L(X_w | p_base)` is multiplied across windows; Ville's inequality gives anytime-valid fleet-FPR control at level `α_fleet`.

Operator-tunable parameter is `α_fleet` (architect-pre-prediction: 10⁻³, matching inherited per-detector α-budget). The shard count threshold K is a **derived quantity, not a parameter** — it's whatever shard count corresponds to crossing `1/α_fleet` on the running e-process, given N and the estimated `p_base`.

_(v0.2 amendment — supersedes v0.1's "K%-of-shards threshold with default 30%" framing. The original 30% pre-prediction was wrong at fleet scale: at N=1000 and `p_base=0.01`, 30% = 300 shards is ~100σ above the H₀ mean, producing a test that essentially never fires and provides no FPR control. As a sanity check, the Bonferroni-corrected binomial threshold at the same parameters with `α_fleet=10⁻³` and W=8640 windows yields K≈24 shards ≈ 2.4% of fleet, not 30%. The corrected formulation follows the e-process framework Tessera is already committed to via Q-J1.)_

### Q-JC4a — `p_alt` mixture/prior choice

The e-value `e_w` requires a specification of H₁. Two natural choices:

- **(α) Uniform mixture** over `p_alt ∈ [2·p_base, 0.5]`. Simple, robust, but known-loose for narrow alternatives.
- **(β) Betting-adaptive mixture** mirroring `engine/detectors/family-c-betting-e-process.ts`. Adapts to data; matches Tessera's existing detector machinery; pair-review-novel-literature surface is bounded because the betting-e-process is already pair-reviewed in the inherited engine.

Architect-pre-prediction: (β). Reuses inherited pair-review work; aligns with Q-J1.

### Q-JC4b — `p_base` estimation strategy

The H₀ distribution depends on `p_base`, which must be estimated from history. Two options:

- **(α) MLE from rolling N-window history per shard, then fleet-aggregate.** Simplest; stable at large N; potentially unstable at N < 100.
- **(β) Bayesian shrinkage toward fleet-aggregate prior.** More stable at small N; introduces a shrinkage-intensity hyperparameter.

Architect-pre-prediction: (β). The shrinkage cost is small; the small-fleet stability is load-bearing for Tessera's "any fleet size, including N=10 dev clusters" target.

**Load-bearing constraint regardless of choice:** the e-process martingale property requires that `p_base` be estimated from data **disjoint** from the windows being tested (e.g., prior-window history), OR via a properly conditional e-process construction. The SLICE 5 spec must lock this down explicitly before implementation; plug-in estimation from the same data being tested invalidates the Ville bound.

### Q-JC4c — Coupling with Q-J1 e-BH operator

Does FCP-1's e-process participate in the same e-BH FDR procedure as per-shard detectors, or is it a separate test pipe?

- **(α) Separate pipe** — FCP-1 is calibration-time only (curates the bundle before per-shard calibration); per-shard detector e-processes are runtime; no joint FDR control needed because they operate on disjoint surfaces.
- **(β) Joint pipe** — FCP-1's e-process participates in the same e-BH operator. Requires joint specification of discovery set and e-BH critical-value scaling.

Architect-pre-prediction: (α). The two tests serve different roles (curation gate vs runtime detection); coupling them via e-BH adds architectural complexity without statistical benefit — the FCP-1 result is a curation decision, not a discovery to be reported.

### Q-JC5 — Coupling to warm-start runtime (R03)

Stage 3b says fleet-event-contaminated windows must flag residuals stale. The R03 spec for `residual_seed_hash` mentioned the sentinel pattern. Confirm: Stage 3b uses the existing R03-disposed sentinel mechanism, not a parallel one.

Architect-pre-prediction: yes, same mechanism.

### Q-JC6 — Speculative SR / RPCA / BOCPD inclusion

Should SLICE 4 (or 5) pre-bundle one or more of Spectral Residual / Robust PCA / BOCPD? Pre-prediction: no — bundle only on empirical demand. SR is the cheapest add (~200 LOC, FFT-only) and could be the first if FCP-1 leaves a measurable gap. RPCA and BOCPD are substantial enough to deserve their own slices.

---

## 6. Pre-route discipline application (architect-side)

### Memorial D candidate-set enumeration

This memo's brainstorm enumerates 4 memo-structure options (§ 1.5) with picked + rejected rationale documented; per-stage 4 hypothesis-tree layers (calibration substrate / contamination screening / fleet-correlation / warm-start integration). MD discipline applies at brief-emit time per inherited cycle.

### Inherited Memorial F sub-rule application

- **F sub-rule 1** (compile-time-substrate multi-read-paths): Stage 2 adds new producer for `CompiledConfig.baseline_curation_pipeline_diagnostics` (decisions D11–D13). Architect must Step-0-grep all consumers when SLICE 4 spec drafts.
- **F sub-rule 2** (MERGE-vs-REPLACE substrate-stamped-fields-preservation): D1–D10 audit records must continue to populate; D11–D13 are additive.
- **F sub-rule 3** (ADR-anti-scope-preservation): all SCOPING-MEMO-v0.3 anti-scope clauses preserved; Q-J1..Q-J5 dispositions stand.
- **F sub-rule 4** (Pre-existing-property-vs-new-AC coherence): the Ville-bounded per-shard FPR guarantee (Q-J1 hybrid disposition) is preserved at the curation layer; FCP-1 detection is a calibration-input filter, not a detector-output filter.

### Pair-review trigger summary

- **PR-F8 (new for SLICE 5)** — FCP-1 statistical-correctness pair-review. Fleet-correlated-detection on synthetic-fleet H₀ + injected-fleet-event H₁ evidence matrix. Mandatory for SLICE 5 close.
- **PR-F9 (new for SLICE 4)** — Empirical performance pair-review. MCD per-window per-shard at N=10³ shards × M=30-day windows is a CPU profile that needs synthetic-substrate measurement.
- **PR-F10 (conditional)** — If Q-JC6 disposition includes SR / RPCA / BOCPD addition, each algorithm fires its own pair-review-novel-literature trigger.

### Skill 14 + 15 commitments

Skill 14 PRD-conjunction-cross-check: this memo IS the curation-pre-pass SCOPE-PROPOSAL; the SLICE 4 spec must demonstrate every § 2 stage conjunct binds to an AC. Skill 15 prescription-to-AC coverage: every line in § Per-stage scope traces to ≥1 AC in the SLICE 4 spec.

---

## 7. Topic close framing

How SLICE 4 resolves drives SLICE 5 + 6:

- **(a) Clean close on SLICE 4** (Stage 1 + 2a + 3a; per-shard window screening sound): SLICE 5 adds FCP-1 + Stage 3b. R04 → R05 → R06 sequential.
- **(b) Empirical surprise — MCD per-window cost prohibitive at fleet scale**: PR-F9 surfaces; architect re-evaluates whether per-window MCD vs per-cell-aggregated MCD is the right granularity. SLICE 5 may need to address empirical findings before FCP-1 lands.
- **(c) Empirical surprise — per-cell MCD/MRCD/LW already adequately screen contamination in practice**: FCP-1 demand falls; SLICE 5 deferred or descoped. Audit records D11 alone suffice. Possible at fleet load if real GPU-cluster contamination is predominantly within-cell rather than fleet-correlated. PR-F9 measurement informs this.
- **(d) Empirical surprise — FCP-1 alone insufficient; SR/RPCA/BOCPD needed**: SLICE 6 fires with one or more added algorithms; each fires its own PR-F10 cycle.

## 8. Discipline-archive significance

1. **First Tessera methodology contribution layered ON TOP of inherited DeploySignal infrastructure** (rather than vendor-only). The 10-decision audit pipeline accommodates Tessera-native decisions D11–D13 additively. Validates the vendor-first + delta-only strategy at architectural-extension scope.
2. **First Tessera Phase 1 use of the pair-review-novel-literature discipline** (Memorial D × PR-F trigger pattern). FCP-1 is the novel piece; demonstrates the methodology applies to fleet-architecture-derived primitives, not just DeploySignal-inherited substrate.
3. **Resolves the architectural ordering tension between warm-start runtime (in flight) and contamination screening (proposed)**. Without this memo, SLICE 2b could close with poisoned-baseline behavior latent. With it, SLICE 4 puts curation on the Phase 1 close critical path.

## 9. Vendoring policy implications

Per `SCOPING-MEMO-v0.3.md` § 9, vendoring policy for SLICE 4 additions:

- `tools/calibrate.ts` — **vendor at-pin** (Q-JC1 (α) preferred); Tessera-side pre-pass file written from scratch as `tools/curate-baseline-pre-pass.ts`.
- `tools/calibrators/family-c.ts` — vendor at-pin (no Tessera deltas needed; inherited robust estimators called directly by the pre-pass file).
- `tools/curate-baseline-pipeline.ts` — vendor at-pin; Tessera-side extension to D11/D12/D13 lives in `tools/curate-baseline-pre-pass.ts` (which calls the inherited orchestrator + adds its own three audit decisions).
- New Tessera-native file `tools/curate-baseline-pre-pass.ts` — net-new; not vendored.
- Manifest extension at SLICE 4 close per Tessera Phase 1 close-walk policy.

---

## 10. Open architect-side prerequisite work

Before SLICE 4 spec can draft, two preconditions:

1. **R03/R04 close-walk artifacts must stabilize** (✓ R03 ROUND-COMPLETE, ✓ R04 ROUND-COMPLETE — preconditions met as of 2026-05-16).
2. **John's Q-JC1..Q-JC6 dispositions** — this memo is the input gate; Architect Q-R05-SPEC drafting waits on the response.

---

_Memo v0.3 authored: 2026-05-16. Amends v0.2 § 1 Executive summary + § 2 Stage 2b prose to narrow FCP-1 detection scope to **sustained fleet events** per operator-confirmed (B)+(D) disposition 2026-05-16 under authority-expansion. Transient single-window contamination explicitly out of scope for SLICE 5; Phase 2+ candidate if real GPU-cluster operational evidence surfaces demand. Q-JC1-Q-JC6 framework dispositions UNCHANGED — v0.3 is a scope-claim narrowing applied at the OUTPUT level, NOT a Q-JC re-disposition. Memorial D state unchanged (the narrowing is not a novel-literature trigger — it documents the algorithm's actual empirically-demonstrated scope rather than introducing new algorithmic content). R07 PR-F8 pair-review trigger fulfilled at R07 with the narrowed scope; PR-F8 evidence matrix accepted at sustained-event scope per § 1.1._
