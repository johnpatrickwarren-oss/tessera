# Project state

**Last updated:** 2026-06-22 · **by:** John Warren (with Claude)

## What this is
Tessera — statistically-rigorous per-shard behavioral observation for AI clusters, built on the
DeploySignal statistical-detector engine. Current work: closing a validity gap in the per-shard
e-process under autocorrelated telemetry, and standing up the sprag + Anchor quality stack
(replacing the retired AI-reviewing-AI pipeline).

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

## Next
- (Future engine ADR) AR(p>1) / near-unit-root (rho=0.95) whitening.
- Optional: a follow-up to exercise the in-engine betting-path whitening through a stamped
  `ar1_phi` config (the validator currently demonstrates the fix via its own transform).

## Open questions / blockers
- None blocking. Whether to push the whitening fix upstream into the shared engine package (vs
  keep Tessera-side) is deferred to a later ADR if the problem proves shared with DeploySignal.

## Pointers
- Spec: `docs/SPEC-per-shard-validity-under-autocorrelation.md`
- Decisions: `decisions/` (ADR 0001)
- Architectural rules (deterministic): `invariants.json` + `baseline.json` (sprag)
- Validity evidence: `coverage-matrices/calibration-envelope.md`
