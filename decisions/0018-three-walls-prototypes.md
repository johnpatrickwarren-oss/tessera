# ADR 0018 — three-walls prototypes: e-detector (B), SupFDR adjuster (Fleet), conditional-Markov diagnostic (A)

- **Date:** 2026-06-26
- **Status:** **PROTOTYPES (Tessera-side, validated).** Three new `tools/` modules + tests implementing
  the named constructions the 2026-06-26 research passes identified for the three open walls. All
  Tessera-original; NOT vendored. Durable home for the load-bearing primitives is the ENGINE
  (`detectors/`, `fleet/`) — porting is a flagged follow-up (see § Sequencing), kept Tessera-side
  first per the established pattern (prototype → validate → port).
- **Builds on / grounded in:** RESEARCH-INDEX.md (§ 1 registry, § 2 O3/O4/O5), the two research
  reports (`research/2026-06-26-*.md`), engine ADR 0010 (UI e-value — the increment), 0016/0017
  (common-mode estimation is the lever). Reviewed by two independent cold-eye subagents (verdicts §).
- **Scope decision:** the user asked to work Wall A, Wall B, Fleet Multiplicity. Built in DEPENDENCY
  order (B → Fleet → A) because they compose: the e-detector (B) produces the per-shard running
  statistic, the SupFDR adjuster (Fleet) consumes its running max valid-at-all-times, and the
  conditional-Markov diagnostic (A) is the validity *condition* tying them to a conditional guarantee.

## The three walls and what shipped

| Wall | Construction (source) | Module | Result |
|---|---|---|---|
| **B — transient power** | E-detector: Shiryaev–Roberts `M^SR_n = Σ_j Λ^(j)_n` over candidate onsets, increment `Λ^(j)` = sequentialized UI e-value, threshold `1/α` (Shin–Ramdas–Rinaldo, arXiv:2203.03532) | `tools/e-detector.ts` | Recovers transient power the terminal UI dilutes to ~0: **~90% vs 0%** on a *favourable synthetic* regime; **1–2/4 vs 0/4** on a *real adversarial clustersynth bundle* (capped by Wall A — see § Real-bundle). ROC-matched at 5% false-alarm. |
| **Fleet — FDR-at-all-times** | √E−1 adjuster on running-max e-processes → valid all-times e-values → e-BH controls **SupFDR ≤ q** (Tavyrikov–Goeman–de Heide "Carefree", arXiv:2501.19360) | `tools/supfdr.ts` | Naive running-max e-BH leaks (≈1.08α); the adjuster controls SupFDR ≤ q. `∫_1^∞ A(e)/e² de = 1` verified. Accept-to-reject monotone. |
| **A — per-stream validity (O5)** | Operationalized **Assumption 3.1** (`Y_n ⊥ past \| X_n`) diagnostic + the demonstration that it tracks stopped-e-BH fleet-FDR (Wang–Dandapanthula–Ramdas, arXiv:2502.08539) | `tools/conditional-markov.ts` | As common-mode estimation degrades, the conditional-Markov score rises AND stopped-e-BH FDR crosses q — a GOOD common-mode estimate *earns* a conditional fleet-FDR guarantee. |

Integrated demonstration + report: `tools/walls-validation.ts` (`pnpm walls-validation`). Tests:
`test/{e-detector,supfdr,conditional-markov,walls-validation}.test.ts` (19 tests). Suite green
(677 tests; the single intermittent failure is the pre-existing q84 `worker.terminate()` flake).

## The load-bearing finding (preserve — do not re-litigate)

**Walls A and B are SEPARATE, non-interacting walls, and no construction closes both.** The e-detector
closes the transient-POWER wall (B) by mixing over candidate onsets. But its VALIDITY reduces to each
increment `Λ^(j)` being a genuine e-process under the nonstationary null — i.e. **Wall A re-enters
inside the increment** (`E[e|H0] ≤ 1` per ADR 0007/0012). On clustersynth (benign on validity — its
nonstationarity is removable common-mode, ADR 0016) the increment is valid; on real GWDG telemetry it
is not, and no amount of e-detector machinery fixes that. The SupFDR adjuster (Fleet) is provenance-
agnostic — it assumes each input is a valid e-process and does NOT touch Wall A either.

**Wall A is recoverable only CONDITIONALLY (O5):** if a good common-mode estimate makes the residual
conditionally Markov given the covariate (Assumption 3.1), the fleet inherits a *conditional* stopped-
e-BH FDR theorem. This makes "common-mode estimation is the lever" (ADR 0016/0017, a power result) ALSO
a *validity* result. The `walls-validation` sweep demonstrates the consequence empirically: removal
completeness oracle→none ⇒ diagnostic 0.06→0.60, stopped-FDR 0.02→0.55. **The per-alert guarantee
stays dead (ADR 0012); on real GWDG the per-shard nonstationarity is irreducible so no covariate earns
it — the diagnostic is the honest readout that says so.** The metric to control for the streaming
detector remains **EOP**, not worst-case FDR (RESEARCH-INDEX O1; worst-case FDR is uncontrollable at
finite ARL by the Dandapanthula–Ramdas impossibility theorem).

## Engineering decisions (and honest caveats)

1. **Tessera-side prototypes, not engine edits.** Matches the established pattern; lets the
   constructions validate against clustersynth before incurring cross-repo engine churn (engine is
   pinned at v0.6.0-pre). The increment (`Λ^(j)` = `universalInferenceMeanShiftEValue`) and the e-BH
   operator are imported from the engine unchanged.
2. **e-detector increment = the fixed-horizon UI e-value, sequentialized over onsets.** The OPEN
   question (RESEARCH-INDEX O3) is whether the UI's fixed-horizon `E[e|H0] ≤ 1` survives promotion to
   an anytime-valid `Λ^(j)` under the nonstationary null. We do NOT claim it does; we measure the
   empirical null behaviour and recommend e-SR over e-CUSUM per Remark 2.13. Strided onset/eval grids
   are conservative SUB-mixtures (valid, lower power) — a tractability choice, logged not silent.
3. **Adjuster route, not donation-e-LOND.** The √E−1 adjuster is self-contained with an exact integral
   identity. Donation/online-closure e-LOND (arXiv:2603.24792) is the alternative SupFDR route (can be
   tighter) but needs α-investing bookkeeping — left as a follow-up. The adjuster's power penalty is
   real (√ shrinkage); measured (it keeps power on clear alternatives, is conservative on FDR).
4. **Wall A is a NECESSARY-condition diagnostic, not a sufficiency proof.** Assumption 3.1 is a
   population conditional-independence statement; the diagnostic is a finite-sample lag-1 + Ljung–Box +
   partial-coefficient check. A shard that passes can still violate 3.1 at higher-order lags. The sweep
   models "estimation quality" as removal completeness `α` — an abstraction of the lever, NOT a claim
   that real estimators interpolate it linearly.

## Real clustersynth-bundle validation (the genuine end-to-end test)

`tools/walls-validation.ts` runs on FAVOURABLE synthetic data. The honest end-to-end test is against a
bundle generated by the **separate clustersynth repo** (`~/concord/clustersynth`):
`clustersynth scenario config.json --out-dir DIR` (gb200, 1 pod / 720 shards, T=256, full
nonstationarity thermal+diurnal+regime, mixed transient faults, seed 7) → fed through the instrumented
pipeline. Tool: `tools/clustersynth-edetector.ts` (`pnpm clustersynth-edetector <bundle-dir>`); smoke
test on the committed mini bundle in `test/clustersynth-edetector.test.ts`.

**Result (the two-walls thesis confirmed on real data):**

| counter | transient mean_shifts | e-detector | terminal | residual \|ρ₁\| | markov-plausible (healthy) |
|---|---|---|---|---|---|
| hbm_bw_gbps | 2 | **1/2** | 0/2 | 0.190 | 24% |
| sm_util | 1 | 0/1 | 0/1 | 0.253 | 18% |
| gpu_temp_c | 1 | 0/1 | 0/1 | 0.319 | 6% |
| **total** | **4** | **1/4** | **0/4** | ≈0.25 | ≈15% |

- The terminal mean-shift UI e-value is **fully diluted** (0/4) — Wall B, on real data.
- The e-detector **beats it** (1/4, → 2/4 at calLen=35) but falls **far short of the synthetic ~90%**.
- **Wall A explains the cap, per-counter:** the instrumented residual is NOT conditionally white (median
  lag-1 |ρ| ≈ 0.25; only ~15% of healthy shards markov-plausible), so the UI increments are not clean
  e-processes and their power collapses (ADR 0016 finding 2: power falls steeply above φ≈0.25). The
  cleanest residual (hbm, ρ=0.19, 24%) is exactly where the e-detector scores; the dirtiest (gpu_temp_c,
  ρ=0.32, 6%) is where it fails. **The Wall-A diagnostic predicts where Wall B's fix works.**
- **Conclusion:** both walls bind on real data, and no construction here closes both — the e-detector
  closes the cal/test dilution (Wall B), but per-stream validity (Wall A) re-enters inside the increment.
  Better common-mode estimation (ADR 0016/0017) is the lever that would lift it. This is a MORE honest and
  more valuable result than the synthetic 90%: the three tools compose to a coherent, self-explaining
  picture on genuine clustersynth telemetry.

## Calibration regime — these prototypes use a SHORT in-window prefix, NOT a long baseline (KNOWN GAP)

Every prototype here calibrates its null from a SHORT in-window prefix — `calLen = floor(0.1·T)` ≈ 25–30
ticks (the e-detector's `cal` window, the e-process scale σ̂, the diagnostic's reference). It is **NOT**
a 6-week+ baseline built by seeing weeks of healthy data and trimming large anomalies. The synthetic and
clustersynth bundles are themselves short (T ≤ 768 ticks), so no long history is even present in them.

**This understates how clean the null can be, and partly explains the real-bundle cap.** On a long
HEALTHY clustersynth window (T=512), lengthening the calibration transforms the residual:

| calLen | residual median \|ρ₁\| | markov-plausible (healthy shards) |
|---|---|---|
| 25 (short, what the prototypes use) | ≈0.10–0.22 | **15–40%** |
| 100 | ≈0.04 | ≈74–79% |
| 300 ("weeks") | ≈0.03 | **≈94%** |

So a longer baseline lets the instrumented common-mode estimate the per-shard loadings far better → the
residual becomes conditionally white (the Assumption-3.1 null) → the UI increments become valid and
powerful. The "Wall A caps the e-detector at 1–2/4" result above is therefore **partly a
short-calibration artifact**, not purely the validity wall. (On a longer faulted bundle, calLen 25→70
dropped residual \|ρ₁\| from ≈0.27 to ≈0.06.)

**The correct design is the engine's existing baseline kit** — `compile-baseline.ts` (per-shard
seasonal + multivariate baseline; ADR 0019) + contamination-robust trimming (Tukey, ADR 0015 — the "toss
large anomalies to get an accurate healthy null" step). The detector's calibration should be that
weeks-long, anomaly-trimmed baseline, NOT a short prefix; the prototypes' `calLen` is exactly the seam
where it plugs in. **Follow-up (high priority): wire the compiled long baseline as the e-detector /
diagnostic calibration and re-measure transient recall** — expected to rise toward the favourable-
synthetic regime on clustersynth.

**Caveat (do not over-correct):** clustersynth's nonstationarity is *removable* common-mode (ADR 0016),
so a long baseline approaches the oracle there. On REAL GWDG telemetry the within-window per-shard
nonstationarity is *irreducible* (ADR 0012) — a long baseline helps but leaves a residual floor that no
baseline removes. The per-alert guarantee still stays dead.

## Cold-eye verdicts (two independent adversarial reviews)

- **`e-detector.ts` — SOUND.** No correctness bugs; window bounds verified end-to-end (0 UI throws
  across the default 199-call grid; aligned candidate not dropped). The absolute 1/α threshold
  empirically calibrates to ≈α false-alarm (better than the header's pessimism); the ROC-matched
  transient win is a genuine structural property (collapses on a *persistent* fault, as it should).
  *Fix applied:* the misleading `[j, n−j)` window shorthand clarified to `{start:j,len:n−j} = [j,n)`.
- **`supfdr.ts` — SOUND.** Adjuster math exact (∫=1 by hand; E[A(sup)]∈[0.28,0.83]≤1 empirically up to
  horizon 5000; raw E[sup]∈[2.9,10.4] genuinely inflated); `supFdp` correct. *Overclaim fixed:* the
  naive running-max does NOT robustly exceed q under independence (converges to ≈0.96q at sims=2000 —
  Ville is protective); the test title/prose + module header now state the honest claim — naive runs
  AT the q boundary with **no theorem**, the adjuster sits far below **with one** (the ~90× separation
  is the real, theorem-backed result). The assertion was already correctly hedged (`naive > 0.06`).
- **`conditional-markov.ts` — SOUND.** All math verified to 13 digits vs numpy/scipy (the 3×3
  normal-equations t-stat, Ljung–Box Q, autocorr, OLS). *Disclosure added:* `markovPlausible` is a
  heuristic gate (the `condLag1Tol` constant's effective σ drifts with T), not a calibrated test.
- **`walls-validation.ts` sweep — was UNSOUND, now CORRECTED.** Cold-eye caught a **confound**: the
  original sweep's FDR gradient was driven by a surviving positive-MEAN thermal ramp (a level effect =
  the already-closed plug-in-baseline leak, ADR 0012), NOT by the conditional-Markov serial dependence
  the diagnostic measures — demeaning the residual collapsed the FDR leak while leaving condLag1
  unchanged. **Fix:** the common factor is now ZERO-MEAN (ramp=0, high-persistence AR(1)), so degrading
  removal degrades ONLY the residual's serial dependence; the leak now **survives per-shard demeaning**
  (poor 0.13→0.09, none 0.32→0.23 still leak), confirming the diagnostic→FDR link is causal, not baked
  in. Also disclosed: the partial-past t-leg is inert in the X≡0 sweep config (full 3-leg path is
  exercised in unit tests); the global stopping time is the realistic fleet *decision rule*, NOT the
  leak mechanism (terminal-time leaks at least as much — stopping mitigates). The sweep is now framed
  honestly as "the diagnostic PREDICTS the known serial-dependence validity failure" (the O5
  contribution), not as new evidence of leakage.

## Sequencing (follow-ups, not done here)

- **Port the e-detector primitive to `engine/detectors/`** and the adjuster to `engine/fleet/` if the
  prototypes hold up — they are general, not Tessera-specific.
- **Quantify the e-detector detection-DELAY vs an onset-oracle** and its degradation as φ→0.9 + drift
  grows (RESEARCH-INDEX O3, still open).
- **Donation-e-LOND** as the alternative SupFDR layer (tighter; arXiv:2603.24792).
- **Wire the e-detector into the clustersynth-scenario harness** once a bundle with long-enough
  transient windows exists (the committed mini bundle is T=60 — below the UI power floor; the
  transient win is shown on synthetic transients in `walls-validation`).
- **Test Assumption 3.1 on real GWDG telemetry** (expected to FAIL — the diagnostic should report it).
