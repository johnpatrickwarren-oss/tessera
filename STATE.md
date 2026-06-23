# Project state

**Last updated:** 2026-06-23 · **by:** John Warren (with Claude)

## What this is
Tessera — statistically-rigorous per-shard behavioral observation for AI clusters, built on the
DeploySignal statistical-detector engine. Current work: moving from caveated artifact toward
production by validating on REAL telemetry (Tier 2: ingestion + shadow harness), on top of the
per-shard e-process validity work and the sprag + Anchor quality stack.

## Done (this branch — shadow-replay-nab)
- **First real-data validation (crosses the artifact line).** `tools/shadow-replay.ts`
  (`pnpm shadow-replay <nab-dir>`) + `tools/_nab-loader.ts` replay REAL labeled telemetry (Numenta
  Anomaly Benchmark) through the production betting e-process (engine `updateBettingState`, AR(1)
  whitening calibrated to mirror production), observe-only, and score real calibration (FP rate on
  real quiescent data) + detection (TP/latency on labeled anomalies). See ADR 0002 +
  `docs/SPEC-shadow-replay-real-telemetry.md`; report at `shadow-results/nab-shadow-report.md`.
- **Honest first numbers (36 datasets, α=0.01):** detection 29% of labeled windows; FP ≈ 8.9/1k
  normal pts. Quiet on clean data + some real signals (0 FP), detects real failures well on others
  (machine_temperature 3/3, rogue_agent 2/2), but MISCALIBRATED on real signals with non-AR(1)
  structure (regime shifts/multimodality, e.g. rds_cpu ~116 FP/1k) and misses subtle anomalies at
  default α. This is the real compass for production gaps.
- Tests +9 (NAB parsing + scoring logic); suite 557 pass / 0 fail / 10 skip; gate green; report idempotent.
- **Scope boundary (stated in the report):** validates the PER-SIGNAL detector on real telemetry
  only — NOT cluster/topology/fleet (no real multi-shard data); NAB anomalies are operational, not GPU-SDC.

## Done
- **Validity gap found + validated.** The Family A *betting e-process* loses its Ville guarantee
  under temporal autocorrelation (type-I inflation up to ~192×; fleet FDR ~73%). The engine already
  pre-whitens its OTHER detectors via `ar1_phi` (mixture-supermartingale / Page-CUSUM / ar-p /
  seasonal); the betting path is the one left out. Tessera's `tools/per-shard-whitening.ts` mirrors
  the engine's `ar1_phi` formula and the matrix tool demonstrates whitening fixes the betting path.
  See `decisions/0001-pre-whitening-over-rho-stamped-threshold.md` (incl. the corrected premise).
- **Validity-envelope matrix tool** (`tools/calibration-envelope.ts`, `pnpm calibration-envelope`):
  deterministic, idempotent; characterizes type-I + fleet-FDR across a misspecification grid and
  shows raw-vs-whitened AR rows. Output: `coverage-matrices/calibration-envelope.{json,md}`.
- Whitened AR PASSES for all rho <= 0.9 at 100% detection power; raw fails at 6.7×–192×.
- Tests: +15 (per-shard-whitening; calibration-envelope helpers + verdict rule + e-BH split + the
  fix-path end-to-end). Full suite 548 pass / 0 fail / 10 skip (documented clustersynth-fixture gates).
- sprag gate wired (`invariants.json` + `baseline.json`), migrated from the unenforced
  `arch-invariants.json` (REMEDIATION_PLAN M4); pre-commit hook installed; gate added to CI
  (`.github/workflows/ci.yml`) via `npx @johnpwarren.dev/sprag`. Gate PASSes (exit 0); verified it
  bites (require-tests 28→29 BLOCK on a removed test).
- Cold-eye review (Anchor Discipline 1) done — fresh-context adversarial audit, verdict
  SHIP-WITH-FIXES, no Critical/High. All findings addressed: added verdict/split/fix-path tests
  (M1), wired sprag into CI + fixed stale CI comment (M2/L3), documented the power-drift magnitude
  and seasonal-variance framing (L4/L5).

- **Engine betting-path fix shipped + pinned.** `deploysignal-engine` PR #16 (consume `ar1_phi`) +
  #17 (make `last_x_centered` optional — backward-compat, caught by this bump) merged; tagged
  `v0.3.3-pre`. Tessera pin bumped `v0.3.1-pre → v0.3.3-pre`. The bump also pulled the engine's
  public-hardening sweep (18 commits); its "truthful activation flag" change required aligning
  `q66 AC-R66-1` to assert honest non-activation for the unwired consumer. Suite 548/0/10-skip;
  `calibration-envelope` matrix byte-identical (the validator drives `updateBettingState` with
  phi=0, so the bump is correctly a no-op there).

- **Validator now exercises the engine's production whitening path.** `calibration-envelope`'s
  whitened mode passes the calibrated `phi` to `updateBettingState`'s `ar1Phi` param AND the matching
  innovation variance `sigma^2*(1-phi^2)` as `sigmaSquared` — exactly what `fit-production-substrate`
  stamps (`baseline_sigma_squared` = innovation variance when `ar1_phi` is set). So the validator now
  mirrors production: the whitened residual is standardized at unit scale (properly calibrated, not
  conservative). Fixes a prior validator bug that passed the marginal variance (over-conservative,
  and the basis of an incorrect "engine standardizes against marginal" claim — now corrected).
  Result: FPR ~ alpha for rho <= 0.9; rho=0.95 retains a genuine ~1.8x near-unit-root residual.
  `per-shard-whitening.ts` is now calibration/reference only. Suite 548/0/10; matrix idempotent; gate green.

- **Engine: bias-corrected phi estimator shipped.** `deploysignal-engine` PR #18 added the Kendall
  `(1+3*phi)/n` correction to `ar1Phi` + `computePerSignalAr1Phi`; merged, tagged `v0.3.4-pre`.
  Tessera pinned `v0.3.3-pre -> v0.3.4-pre` (matrix byte-identical — the validator computes phi via
  its own bias-corrected estimator, so the engine calibrator change is a no-op for it; this just
  keeps Tessera on current engine). Both queued follow-ups now closed.

- **Near-unit-root investigated + ADR'd.** Diagnosis overturned the "AR(p) / ~1.8x" framing: at the
  TRUE phi even rho=0.99 is controlled, so it is NOT a model-order problem. The failure is the phi
  CLIP ceiling (0.95) — a rho=0.99 signal is whitened with phi=0.95 and stays ~43% inflated. AR(p)
  would not help (no higher-order structure); loosening the clip is unsafe (innovation variance ->
  0). Aligned the validator's estimator clip to the engine's 0.95 and added rho=0.99 to the matrix
  so the cliff is visible. Recommended fix = route near-unit-root to the self-normalized fallback —
  engine ADR 0003 (Proposed), pending sign-off (behavior change on the betting path).

## Next
- **DECISION NEEDED:** implement engine ADR 0003 (betting path respects the near-unit-root /
  self-normalized-fallback threshold the mixture path already uses)? Behavior change for high-phi
  signals; needs operator sign-off + threshold confirmation.

## Open questions / blockers
- None blocking. Whether to push the whitening fix upstream into the shared engine package (vs
  keep Tessera-side) is deferred to a later ADR if the problem proves shared with DeploySignal.

## Pointers
- Spec: `docs/SPEC-per-shard-validity-under-autocorrelation.md`
- Decisions: `decisions/` (ADR 0001)
- Architectural rules (deterministic): `invariants.json` + `baseline.json` (sprag)
- Validity evidence: `coverage-matrices/calibration-envelope.md`
