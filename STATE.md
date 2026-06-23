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

## In flight
- **Upstream the betting-path fix into `deploysignal-engine`** (decision A, 2026-06-22): consume
  `ar1_phi` in `updateBettingState`/`evaluateBettingEProcess`, mirroring the mixture-supermartingale
  pattern. Separate repo PR + ADR. Tessera picks it up on the next pinned engine bump.

## Next
- Commit/PR the Tessera validator work (branch + PR).
- After the engine PR merges + a version bump: bump Tessera's pinned engine dep and re-run
  `pnpm calibration-envelope` to confirm the betting path now whitens in-engine.
- (Future engine ADR) AR(p>1) / near-unit-root (rho=0.95) whitening.

## Open questions / blockers
- None blocking. Whether to push the whitening fix upstream into the shared engine package (vs
  keep Tessera-side) is deferred to a later ADR if the problem proves shared with DeploySignal.

## Pointers
- Spec: `docs/SPEC-per-shard-validity-under-autocorrelation.md`
- Decisions: `decisions/` (ADR 0001)
- Architectural rules (deterministic): `invariants.json` + `baseline.json` (sprag)
- Validity evidence: `coverage-matrices/calibration-envelope.md`
