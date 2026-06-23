# Spec — per-shard e-value validity under autocorrelation

- **Date:** 2026-06-22
- **Status:** Accepted (cold-eye reviewed; corrected after discovering the engine already has
  `ar1_phi` whitening — see ADR 0001 Ruled-out)
- **Need:** Tessera's headline claim is "statistically-rigorous behavioral observation." The
  Family A betting e-process and the e-BH FDR layer built on it are valid *only* if each per-shard
  e-value satisfies `E[e | H0] <= 1`. Empirical calibration (harness in `scratchpad/`, run
  2026-06-22 against the real engine) shows this holds under heavy tails and heteroscedasticity but
  **fails catastrophically under temporal autocorrelation** — the dominant feature of real GPU
  counter telemetry: type-I error inflates up to ~192x (AR(1) rho=0.95, alpha=0.005), and fleet
  e-BH FDR reaches ~73% against a 5% target. The engine already solves this for its OTHER detectors
  via the `ar1_phi` pre-whitening field (mixture-supermartingale, Page-CUSUM, ar-p, seasonal —
  calibrated by `fit-production-substrate.ts`, tested); the **betting e-process path is the one left
  out**, relying only on the `betting_sliding_buffer_threshold` ρ-stamped firing threshold, which is
  fragile to ρ misspecification (stamp at rho=0.5, run at rho=0.9 -> 51% FPR; measured) and was
  never validated.

## Deliverables

- **D1 — validity-envelope matrix tool.** A deterministic, idempotent `tools/` generator that
  characterizes per-shard type-I error and fleet e-BH FDR across a misspecification grid
  (autocorrelation, heavy tails, seasonality, heteroscedasticity), with the baseline calibrated to
  each generator's *true marginal moments* so H0 is literally true and any firing is a genuine
  false positive. Emits JSON + human-readable MD into `coverage-matrices/`.
- **D2 — whitening validator + the actual fix's home.** `tools/per-shard-whitening.ts` is a
  Tessera-side AR(1) pre-whitening transform + bias-corrected estimator that *mirrors the engine's
  `ar1_phi` formula*; the matrix tool (D1) uses it to demonstrate that whitening the betting path
  restores `FPR <= alpha` across the autocorrelation range at full power. It is a **validator**, not
  a production detector path (Tessera has no live runtime). The production fix — consuming `ar1_phi`
  in the engine's `updateBettingState`/`evaluateBettingEProcess` — is upstreamed to
  `deploysignal-engine` (separate PR + ADR), since the engine already owns `ar1_phi` and its
  calibrator. See ADR 0001.

## Acceptance criteria

Each criterion is independently checkable; the AC list is the test list and the cold-eye checklist.

### Whitening primitive (D2)

- **AC-1** `estimateAr1` returns a lag-1 AR coefficient `phi` and innovation variance `sigma2`
  from a baseline sample, **with the Kendall median-unbiased correction** `phi* = phi_ols +
  (1+3*phi_ols)/n` applied. *(Conjunct: both the estimate AND the bias correction.)*
- **AC-2** `whiten(x_t, x_prev, phi)` returns the innovation `x_t - phi*x_prev` for `t>=1` and
  `x_0` unchanged at `t=0` (no prior sample to difference against).
- **AC-3** On a pure iid-Gaussian baseline, `estimateAr1` returns `phi ≈ 0` (|phi| < 0.05 at
  n=4000), so whitening is approximately identity and does **not** degrade the already-valid case.
- **AC-4** The transform is pure (no I/O, no mutation of inputs) and carries no dependency on the
  vendored engine internals — it feeds the engine through the existing
  `updateBettingState(state, obs, 0, sigma2, alpha)` surface only.

### Validity-envelope matrix (D1)

- **AC-5** Generators included, each with analytic true marginal mean/variance used to calibrate
  the baseline: gaussian-iid (control), Student-t (df 3, 5), AR(1) (rho in a swept set incl. >=0.9),
  seasonal (cyclostationary, no trend), variance-regime (heteroscedastic). *(Conjunct: every listed
  generator present.)*
- **AC-6** Per-shard experiment reports observed type-I FPR with **Wilson 95% lower and upper
  bounds** and a one-sided PASS/FAIL verdict: a cell is `FAIL (inflated)` only when the observed
  rate is *significantly above* alpha (`Wilson-lower > alpha`). A grazing upper bound on a
  well-calibrated cell (inflation < 1) is Monte-Carlo noise, not a violation — flagging it would be
  a misleading-headline measurement (Discipline 5).
- **AC-7** Fleet experiment runs `eBenjaminiHochberg` on terminal per-shard e-values and reports
  empirical FDR vs q with a verdict.
- **AC-8** The matrix includes, for the AR(1) rows, **both** the unwhitened (raw) result **and** the
  whitened result, so the table itself demonstrates the fix. *(This is the core "fix is real" check.)*
- **AC-9** Whitened AR(1) null FPR verdict is `PASS` (not significantly above alpha) for rho <= 0.9.
  Near-unit-root is a documented boundary, not hidden: the phi estimate is clipped to [-0.95, 0.95]
  (matching the engine), so rho=0.99 is whitened with phi=0.95 and stays grossly inflated (~43%
  FPR); rho=0.95 is borderline (~1.8x at alpha=0.01). This is a stationarity-premise violation, NOT
  an AR(p) gap — see engine ADR 0003 (route near-unit-root to the self-normalized fallback).
- **AC-15** The whitened mode exercises the **engine's** production whitening path: it passes the
  calibrated `phi` to `updateBettingState`'s `ar1Phi` parameter AND the matching innovation variance
  `sigma^2*(1-phi^2)` as `sigmaSquared` — exactly what `fit-production-substrate` stamps as
  `baseline_sigma_squared` when `ar1_phi` is set. The engine pre-whitens internally; `raw` and
  `whiten` feed identical inputs and differ only in whether `phi` (+ innovation variance) is passed.
  It is NOT a Tessera-side transform. (Requires engine >= 0.3.3-pre.)
- **AC-10** Whitened detection power on a ramp drift is reported alongside, and is >= the
  documented floor (no "control by never firing").
- **AC-11** Output is **deterministic and idempotent**: re-running produces byte-identical JSON+MD.
  Seeds are scramble-hashed per trial (no serially-correlated LCG seeds — fixes the prior L5 defect
  in `tools/detector-envelope.ts`).

### Honest measurement & trail

- **AC-12** Every column name states what it measures; the rho=0.95 limitation and the AR(1)-only
  (not AR(p)) whitening order are stated in the MD, not relegated to a footnote on a misleading
  headline.
- **AC-13** Durable trail updated: an ADR records the choice of pre-whitening over the rho-stamped
  threshold (and why not), and `STATE.md` reflects the new state.

### Gate

- **AC-14** sprag is wired (`invariants.json` + captured `baseline.json`) and `arch.mjs check`
  passes (or only ratchet-baselined pre-existing debt remains); the stale unenforced
  `arch-invariants.json` is removed or migrated. New code ships with tests (sprag `require_tests`).

## Anti-scope (what this change will NOT do)

- **AS-1** No modification to the vendored engine *from within Tessera* (A12 vendored-at-pin). The
  Tessera artifact is the whitening validator only; the production betting-path fix is a separate,
  properly-scoped change in the `deploysignal-engine` repo (its own ADR + PR), not a Tessera edit.
- **AS-2** No AR(p>1) or seasonal/STL whitening. AR(1) only; higher-order and the rho=0.95
  near-unit-root regime are documented limitations + a future ADR, not delivered here.
- **AS-3** Does not regenerate or alter the published R72/R77/R78 matrices or their README claims.
- **AS-4** Does not adopt the rho-stamped `betting_sliding_buffer_threshold` approach (rejected; ADR).
- **AS-5** No live-runtime wiring (Tessera has none) and no real-cluster work.
- **AS-6** No Tessera-side phi-stamping. The engine already stamps `ar1_phi` (via
  `fit-production-substrate.ts`) and the Tessera `curate-baseline-pipeline.ts` is vendored-at-pin +
  audit-only — so phi-stamping is neither needed nor appropriate here. The betting-path consumption
  is the upstream engine change (AS-1).

## Traceability

- AC-1..AC-4, AC-8..AC-10  <- need: restore e-value validity under autocorrelation (the failure).
- AC-5..AC-7, AC-11        <- need: a trustworthy, reproducible validity-envelope (the missing evidence).
- AC-12..AC-13             <- Anchor disciplines 5 (honest measurement) + 6 (durable trail).
- AC-14                    <- Anchor: replace the unenforced arch-invariants.json with the sprag gate
                              (REMEDIATION_PLAN M4).
