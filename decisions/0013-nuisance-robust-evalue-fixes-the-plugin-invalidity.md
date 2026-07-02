# ADR 0013 — a nuisance-baseline-robust e-value fixes the plug-in invalidity (ADR 0008 solved)

- **Status:** Accepted (the constructive fix for ADR 0008 — the arc's first remedy).
  **⚠️ CORRECTED IN PART (2026-07-02 math audit — see `research/2026-07-02-math-audit.md` F1).**
  The "E[BF|H0] ≤ 1 by construction" claim below is **FALSE as implemented**: the engine's
  `nuisance-robust-bf-e-value` recenters both samples by the ESTIMATED calibration mean before
  evaluating the proper-prior marginal likelihood — and a proper prior centered at 0 is not
  shift-invariant, so the recentering re-introduces the plug-in through the back door. Exact
  ideal-case null mean: E[BF|H0] = (1+2x)/√((1+x)(1+3x)) → 2/√3 ≈ **1.155** as the prior widens —
  at EVERY calibration length (MC-verified against the shipped function). The original validation
  missed it because the statistic is heavily sub-Ville in the tails (the mean excess lives in a
  tail K=600 Monte-Carlo cannot sample). Impact is bounded (e-BH FDR ≤ 1.155·q), and the
  location-INVARIANCE property below still holds — but the object is `empirically_audited`, not
  construction-valid. The theorem-valid replacement already exists in the engine: **safe-t**
  (right-Haar/GROW, ADR 0005), which integrates the location out by invariance rather than
  recentering. Substitution is engine-side work; until then do not cite this ADR as a validity
  theorem.
- **Date:** 2026-06-23

## Context

ADRs 0007/0008 established that the plug-in baseline (a frozen point estimate μ̂) makes the betting
e-process e-value invalid (E[e|H0]≫1) — it fires on the gap between μ̂ and the true mean, badly so when
calibration is under-powered — and that no baseline/fleet engineering fixes it. The recommended remedy
was an e-value that integrates the unknown baseline out. `tools/nuisance-robust-evalue.ts` builds and
tests it.

## Construction

A **two-sample sequential Bayes factor** (separate-means vs common-mean) on **whitened residuals**:
whiten by the AR(1) φ (no centering — the mean stays unknown), then test "test-window mean =
calibration mean" with both means integrated out under a proper N(0,τ²) prior. A Bayes factor with
proper priors satisfies **E[BF|H0] ≤ 1 by construction** → a valid e-value, and it never freezes a
point baseline → robust to the plug-in error. It is also location-invariant (a common offset to all
data leaves the e-value unchanged — the mean nuisance is genuinely integrated out).

## Finding

**Validity (E[e|H0], P(fire)) + detection, BF vs plug-in:**

| regime | BF E[e] | BF P(fire) | BF valid | BF detect | plug-in E[e] | plug-in P(fire) | plug-in valid |
|---|---|---|---|---|---|---|---|
| well-powered (m=1500,n=300) | 0.03 | 0% | ✅ | 100% | 0.53 | 0.2% | ✅ |
| **under-powered (m=300,n=680)** | 0.03 | 0% | ✅ | 100% | **440** | **2.2%** | ❌ |

**The BF is valid in BOTH regimes — including the under-powered one where the plug-in is
catastrophically invalid — while retaining 100% shift detection.** This breaches the ADR 0008 wall: a
valid e-value robust to plug-in baseline error + autocorrelation IS achievable.

**Real GWDG structural (fair, both terminal e-values):** BF ≈ plug-in at every calibration size —
m=600→41.8/43.6%, 300→27.3/30.9%, 150→25.5/30.9%. Both fire 25–44%, dominated by REAL benign mean
changes (rate grows with calibration-to-test separation), NOT estimation error. So on this data the
e-value fix moves the fire rate only a few pp. (The structural ADR 0008's "~100%" was a different
setup — first-crossing + short 15% baseline — not this terminal-e-value comparison.)

## Decision

**Adopt the two-sample BF e-value as the nuisance-baseline-robust e-value.** It rigorously solves the
ADR 0008 e-value invalidity (validity is a structural Bayes-factor property, confirmed where the plug-in
fails). It is NOT a real-data silver bullet — where benign change dominates (real structural), it ≈ the
plug-in; the e-value blocker is removed, but the *dominant* real-data problem (benign change vs fault)
remains the lifecycle/fleet's.

## Why — and the composition

- **Chosen (two-sample BF on whitened residuals)** — integrates the nuisance mean out (the exact ADR
  0008 failure), valid by construction, location-invariant, detects shifts.
- **Where it pays off: BF + lifecycle.** The lifecycle (ADR 0011) re-records on drift → SHORT fresh
  calibration epochs = the under-powered regime where the plug-in is invalid but the BF is valid. So
  the BF is what lets the lifecycle safely use fresh short calibration. Fleet-relative (ADR 0012) needs
  the same valid e-value for fleet-FDR (still pending a contamination-robust common-mode).

## Consequences — the arc's first constructive remedy

- The single blocker the whole arc converged on (invalid e-value, ADR 0008) is **removed in principle
  and validated** (synthetic decisive; real-data honest). The artifact's claim can now be: detection
  works; a *valid e-value* exists; an end-to-end calibrated guarantee needs BF + lifecycle integration
  + a contamination-robust fleet common-mode — all now well-posed.
- Engine promotion (replacing/augmenting updateBettingState's plug-in path) is the natural follow-on,
  after the BF+lifecycle integration is validated end-to-end.

## Ruled out / gotchas

- Synthetic validity is rigorous and checked at MULTIPLE scales — P(e≥k)≤1/k at k=10/100/1000 (not just
  k=1/α; that single-scale check is the exact property an earlier PR conflated). Real-data is a single
  metric/dataset.
- **Scope — same-variance assumption (H2):** the BF tests a MEAN shift assuming equal innovation
  variance in calibration and test. A test-window VARIANCE change with no mean shift inflates P(fire)
  (1×std→0%, 2×→2.5%, 3×→14.3%). So "valid by construction" is for the mean-shift null with stable
  variance; a variance change is out of the model. A variance-robust e-value (integrate the variance out
  via an NIG/t mixture) is the extension. Large variance jumps are rare for GPU counters over short
  windows, but the limit is real and disclosed.
- φ is plug-in (whitening); the BF handles the mean nuisance, not a misspecified φ (second order).
- τ²=25×innovation-var (diffuse but proper); a different proper prior changes the constant, not the
  validity.
