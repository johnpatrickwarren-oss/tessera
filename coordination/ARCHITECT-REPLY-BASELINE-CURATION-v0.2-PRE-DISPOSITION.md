# ARCHITECT-REPLY — Baseline Curation v0.2 Pre-Disposition (John-Confirmed)

_From: Operator (John, 2026-05-16), via assisted architect-draft consolidation._
_To: SLICE 4 Architect (R05) + SLICE 5 Architect (R06)._
_Routed via: NEXT-ROLE.md state-machine after R04 close._
_Date: 2026-05-16._
_Type: **PRE-DISPOSITION — operator-confirmed**. All 9 Q-JC questions from `SCOPING-MEMO-BASELINE-CURATION-v0.2.md` § 5 dispositioned; SLICE 4 spec emit unblocked._
_Foundation: `SCOPING-MEMO-BASELINE-CURATION-v0.2.md` (companion memo); precedent in `ARCHITECT-REPLY-v0.3-PRE-DISPOSITION.md` for the Q-J1..Q-J5 dispositions._

---

## Why this artifact exists

`SCOPING-MEMO-BASELINE-CURATION-v0.2.md` enumerates 9 open architectural questions (Q-JC1, Q-JC2, Q-JC3, Q-JC4, Q-JC4a, Q-JC4b, Q-JC4c, Q-JC5, Q-JC6). Each has an architect-pre-prediction pick documented in the memo. John reviewed all 9 in this session (2026-05-16) and confirmed each pre-prediction as-is. This artifact captures the 9 dispositions in one structured place so the SLICE 4 / SLICE 5 Architect-role rounds can read memo + this disposition + R03/R04 close artifacts cold.

Mirrors the format of `ARCHITECT-REPLY-v0.3-PRE-DISPOSITION.md` which sealed Q-J1..Q-J5 for Tessera Phase 1 SLICE 1 (R01).

Distinction from the v0.3 precedent: those dispositions were architect-pre-predictions awaiting John override; **these are John-confirmed**. The SLICE 4 / SLICE 5 architect treats them as load-bearing dispositions, not as pre-predictions subject to revision.

---

## Q-JC1 — Vendoring policy for inherited calibration tools

**Pick:** **(α) Vendor at-pin verbatim**; Stage 2 is a NEW Tessera-only file `tools/curate-baseline-pre-pass.ts` that runs BEFORE `tools/calibrate.ts`.

**Confidence: HIGH.**

**Reasoning:** Mirrors the Tessera Phase 1 SLICE 1 success pattern — vendor inherited surface at-pin, write Tessera-native files for new behavior. (β) inlines behavior change into vendored files, triggering Memorial F sub-rule 2 substrate-stamped-fields-preservation risk. (γ) is unjustified scope creep with no clear architectural benefit.

**SLICE 4 binding:** § Component inventory must list `tools/calibrate.ts`, `tools/calibrators/family-c.ts`, `tools/curate-baseline-pipeline.ts` as vendored-at-pin; `tools/curate-baseline-pre-pass.ts` as new Tessera-native.

---

## Q-JC2 — Pre-pass vs always-on

**Pick:** **Pre-pass only.** Bounded to pre-calibration screening, not continuous streaming filtering of inbound observations.

**Confidence: HIGH.**

**Reasoning:** Always-on streaming filtering is detector territory and is already what Family A/C/D do continuously. Conflating curation with runtime detection introduces architectural ambiguity without solving any open problem. The conversation that originated this scoping work explicitly framed it as "auto-curate the training window before the detectors ever see it" — pre-pass.

**SLICE 4 binding:** § Anti-scope must explicitly fence off any always-on / streaming-filter behavior; if SLICE 4 implementation accidentally extends to runtime, that's a halt-and-route-back condition.

---

## Q-JC3 — Per-shard vs fleet-aggregate curation order

**Pick:** **Per-shard first** (Stage 2a per-shard within-window screening) → **then fleet-correlated** (Stage 2b FCP-1).

**Confidence: HIGH.**

**Reasoning:** Local outliers shouldn't survive into the FCP-1 step — they'd inflate the `X_w` count under H₀ and bias the e-process toward false-positive fleet-event detection. Reverse order risks misidentifying coincident-but-independent multi-shard local events as fleet-correlated (R-C3 in the memo's risk register).

**SLICE 4 binding:** § Integration points must enforce execution ordering Stage 2a → Stage 2b → calibrate (Stage 3a). Implementation-time ordering must be tested via an AC.

---

## Q-JC4 — FCP-1 statistical formulation

**Pick:** **Sequential e-process over windows** under H₀ (per-shard masks independent, `X_w ~ Binomial(N, p_base)`) vs H₁ (per-shard masks correlated, `X_w ~ Binomial(N, p_alt > p_base)`). Decision rule: declare window `w` fleet-event-contaminated when the running e-process `∏ e_w` exceeds `1/α_fleet`. Operator-tunable parameter is `α_fleet` (default 10⁻³); shard count threshold K is **derived**, not a parameter.

**Confidence: HIGH at framework choice; MEDIUM at formal correctness pending PR-F8 + architect-round brainstorm.**

**Reasoning:** Aligns with Tessera's existing Ville-bounded e-process commitment under Q-J1 hybrid disposition. Anytime-valid; no Bonferroni correction needed when properly formulated; integrates with the inherited betting-e-process pattern at `engine/detectors/family-c-betting-e-process.ts`. Supersedes v0.1's K%-threshold framing which was wrong at fleet scale (30% at N=1000 ≈ 100σ above H₀ mean, producing a test that essentially never fires).

**SLICE 5 binding:** § Mechanism must specify the e-process construction explicitly with formal `e_w` definition; PR-F8 pair-review evidence matrix must verify the martingale property holds under the chosen plug-in `p_base` estimation strategy (per Q-JC4b constraint).

---

## Q-JC4a — `p_alt` mixture/prior choice

**Pick:** **(β) Betting-adaptive mixture** mirroring `engine/detectors/family-c-betting-e-process.ts`.

**Confidence: HIGH at pattern choice; MEDIUM at specific betting strategy parameterization.**

**Reasoning:** Reuses inherited pair-review work (the betting-e-process is already pair-reviewed in the inherited engine). Uniform-mixture (α) is known-loose for narrow alternatives — if real fleet events produce small consistent rate shifts (e.g., `p_alt`=0.03 vs `p_base`=0.01), uniform-over-[0.02, 0.5] dilutes power. Betting-adaptive learns the actual alternative rate as windows accumulate, getting tighter as more evidence arrives.

**SLICE 5 binding:** § Mechanism must specify the betting strategy explicitly (e.g., GROW / KLY / Cover-style; the inherited Family C choice is the natural starting point). PR-F8 evidence matrix must include power curves under multiple `p_alt` values to verify the betting-adaptive choice doesn't introduce surprising power degradation at narrow alternatives.

---

## Q-JC4b — `p_base` estimation strategy

**Pick:** **(β) Bayesian shrinkage** toward fleet-aggregate prior.

**Confidence: HIGH at choice; LOAD-BEARING constraint on conditional-independence handling.**

**Reasoning:** Small-N stability is load-bearing — Tessera explicitly targets dev clusters at N=10 (per `SCOPING-MEMO-v0.3.md` framing), where MLE for `p_base` is unstable. The shrinkage hyperparameter (intensity) is a tunable design choice; the architect must justify a default value with synthetic-substrate evidence.

**LOAD-BEARING constraint regardless of choice:** the e-process martingale property requires `p_base` be estimated from data **disjoint** from the windows being tested (e.g., prior-window history), OR via a properly conditional e-process construction. Plug-in estimation from the same data being tested invalidates the Ville bound. The SLICE 5 spec must lock this down before any implementation — silent plug-in would be a CRITICAL Reviewer finding.

**SLICE 5 binding:** § Mechanism must specify (i) the shrinkage intensity default + (ii) the disjoint-data construction explicitly. PR-F8 evidence matrix must verify the martingale property via simulation under realistic `p_base` shifts across windows.

---

## Q-JC4c — Coupling with Q-J1 e-BH operator

**Pick:** **(α) Separate pipe.** FCP-1's e-process is calibration-time only; per-shard detector e-processes are runtime; no joint FDR control needed because they operate on disjoint surfaces.

**Confidence: HIGH.**

**Reasoning:** The two tests serve different roles: FCP-1 is a curation gate (which baseline windows feed calibration); per-shard detectors are runtime tests (live observations against the calibrated baseline). Coupling them via e-BH adds architectural complexity without statistical benefit — the FCP-1 result is a curation decision, not a discovery to be reported alongside per-shard discoveries.

**SLICE 5 binding:** § Anti-scope must fence off any e-BH coupling with the runtime detector pipeline. The FCP-1 e-process result must not feed the runtime e-BH operator under any path.

---

## Q-JC5 — Coupling to warm-start runtime (R03)

**Pick:** **Reuse R03's existing `residual_seed_hash` sentinel mechanism** to mark FCP-1-invalidated residuals.

**Confidence: HIGH.**

**Reasoning:** R03's spec already documents the seed-hash sentinel as "Enables runtime to detect when a fleet-aggregate refresh invalidates a cached residual" — FCP-1 invalidation IS a fleet-aggregate refresh case. Parallel mechanism would be duplication and would risk runtime inconsistency between two refresh signals.

**SLICE 5 binding:** § Integration points must specify the exact wire-format for FCP-1-driven seed-hash invalidation (sentinel value? null? specific magic string?) so the R03 runtime detection logic correctly recognizes FCP-1-invalidated residuals. Hidden coupling — architect must explicitly verify the wire format works under all R03 state-machine transitions.

---

## Q-JC6 — Speculative SR / RPCA / BOCPD inclusion

**Pick:** **No speculative bundling.** Empirical-demand-driven addition only — adopt as future slices IF Stage 2a + FCP-1 leave a measurable gap on real GPU-cluster traces.

**Confidence: HIGH.**

**Reasoning:** Standard PR-F discipline — no novel-literature work without empirical need. SR is the cheapest add (~200 LOC, FFT-only) and would be the first candidate IF gap is detected. RPCA (substantial; matrix factorization) and BOCPD (Bayesian inference machinery) each deserve their own slices. Pre-bundling all three would fire Memorial D pair-review-trigger × 3 simultaneously without empirical justification.

**SLICE 5 binding:** § Anti-scope must explicitly fence off SR / RPCA / BOCPD additions in SLICE 5; any addition is deferred to SLICE 6+ with explicit empirical-need trigger documented.

---

## Disposition summary

| Q-JC | Pick | Confidence | Most load-bearing? |
|---|---|---|---|
| Q-JC1 | (α) vendor at-pin + Tessera-native pre-pass file | HIGH | medium (drives Tessera/DeploySignal evolution path) |
| Q-JC2 | Pre-pass only | HIGH | low (safest disposition) |
| Q-JC3 | Per-shard first, then fleet-correlated | HIGH | high (wrong order → FCP-1 meaningless per R-C3) |
| Q-JC4 | Sequential e-process | HIGH at framework, MEDIUM at formal correctness | **highest** (test correctness depends on it) |
| Q-JC4a | (β) Betting-adaptive `p_alt` | HIGH | high (power properties depend on it) |
| Q-JC4b | (β) Bayesian shrinkage `p_base` + disjoint-data constraint | HIGH | **highest** (martingale property depends on it) |
| Q-JC4c | (α) Separate pipe from Q-J1 e-BH | HIGH | low (clean architectural boundary) |
| Q-JC5 | Reuse R03 `residual_seed_hash` mechanism | HIGH | medium (avoids runtime duplication) |
| Q-JC6 | No speculative SR/RPCA/BOCPD bundling | HIGH | low (standard PR-F discipline) |

**Highest-leverage cluster:** Q-JC4 + Q-JC4a + Q-JC4b together specify the statistical formulation; PR-F8 pair-review at SLICE 5 close must formally verify all three jointly.

**Hidden coupling architect must explicitly verify (per memo § Q-JC4 load-bearing notes):**
1. **Q-JC4a (β) × Q-JC4b (β) interaction:** betting-adaptive `p_alt` AND shrinkage `p_base` together produce a more intricate test than either alone. Architect should verify the interaction (does shrinkage of `p_base` affect the betting strategy's wealth process? probably not — betting process operates on the LR which is differentiable in `p_base` — but worth a paragraph).
2. **Q-JC5 × Q-JC4c × R03 wire format:** FCP-1 output is a curation-time signal that propagates to runtime via the seed-hash mechanism. SLICE 5 spec must lock the wire format at the seed-hash level.

---

## Memorial D state delta from this disposition

No increment (operator confirmation of architect-pre-predictions is not a Memorial D event in itself; the file-opened-discipline correction was already captured in the v0.1 → v0.2 memo revision). Memorial D state remains at **22V/8C**. PR-F8 trigger newly armed for SLICE 5; PR-F9 trigger newly armed for SLICE 4 (empirical performance measurement); PR-F10 conditional on Q-JC6 future-cycle invocation.

---

## Routing

Next role: **OPERATOR** (decide whether to launch R05 = SLICE 4 architect immediately or to read/review the memo + this disposition before launching).

If R05 launches: **`./run-pipeline.sh --round R05 --tier full`** — Architect reads:
- `coordination/PRD.md`
- `coordination/SCOPING-MEMO-v0.3.md` (canonical Tessera scope; provides Phase 1 / Phase 2 boundary context)
- `coordination/SCOPING-MEMO-BASELINE-CURATION-v0.2.md` (this curation work's scope)
- `coordination/ARCHITECT-REPLY-BASELINE-CURATION-v0.2-PRE-DISPOSITION.md` (this artifact — Q-JC1..Q-JC6 dispositions)
- `coordination/MEMORIAL.md` + `~/.claude/CROSS-PROJECT-MEMORIAL.md` (per role discipline)
- `coordination/specs/Q-R03-SPEC.md` + `Q-R04-SPEC.md` + their audit sidecars (R03/R04 close-state for warm-start mechanism)
- Inherited engine files at SHA `5a72371` per file-opened discipline

SLICE 4 scope (R05): Stage 1 vendoring + Stage 2a per-shard window screening + Stage 3a calibration handoff. Defers FCP-1 to R06 = SLICE 5.

SLICE 5 scope (R06): Stage 2b FCP-1 + Stage 3b warm-start eligibility tagging + PR-F8 pair-review on synthetic-fleet substrate.

---

_Disposition artifact authored 2026-05-16. All 9 Q-JC picks confirmed by John in this session. Mirrors v0.3 PRE-DISPOSITION format. SLICE 4 Architect-role round unblocked; SLICE 5 follows on SLICE 4 close. Architect-pre-prediction risk reduced via operator review (caught the K%-threshold framing error at v0.1 → v0.2 cost of ~10 minutes vs multi-round SLICE 5 fix cycle)._
