// tools/mixture-evalue.ts — the default per-shard e-VALUE object for fleet e-BH (ADR 0019).
//
// WHY THIS EXISTS. The e-detector's running statistic M^SR_t = Σ_{j≤t} Λ^(j)_t is a SUM of t
// per-onset e-processes, so E[M^SR_t | H0] ≈ t — it is NOT an e-value (E ≤ 1), and feeding its
// running max to e-BH over-selects (measured FDP 0.5–0.7; the √E−1 SupFDR adjuster cannot rescue
// it because the adjuster assumes a genuine e-process). The fix is a CONVEX onset mixture (weights
// summing to 1, i.e. normalise by T): a convex combination of e-processes IS an e-process
// (E[·|H0] ≤ 1), so its running max → √E−1 adjuster → a valid all-times e-value for e-BH.
//
// Increment: Gaussian-LR mixture g(r) = mean_λ exp(λr − λ²/2) over λ ∈ ±{0.5,1,2}; each term is an
// e-value under N(0,1), the uniform mixture preserves E ≤ 1, and a per-tick cap keeps it bounded
// (E[min(g,cap)] ≤ E[g] ≤ 1 — conservative, and makes the empirical mean auditable). The residual
// fed in is the baseline-standardised per-shard residual (≈ N(0,1) under a valid conditional null).
//
// Validity is by CONSTRUCTION on a valid null; it does NOT certify that the residual's null holds
// (that is the emitter contract's job — ADR 0019, validity_class). Tessera-original.
//
// Since engine v0.9.0-pre the e-value objects live in the engine (engine ADR 0034, Tessera ADR 0032):
// detectors/onset-mixture-e-value.ts carries normalizedMixtureEValue, geometricMixtureEValue,
// GEO_RHOS and the √E−1 adjuster, ported from this file line for line and held in lockstep by the
// engine's test/onset-mixture-e-value.test.ts against this repo's compiled tools until this file
// became a re-export (> 2,000 comparisons, 0 mismatches, 2026-09-24). The construction's validity
// envelopes and its guarantee row live there too. This file is a re-export so every caller path
// (`./mixture-evalue.js`) and every ADR citation stays valid.

// ── Increments: served by the engine (Tessera ADR 0030, engine ADR 0033 step 2) ──────────────
//
// gInc (λ ∈ ±{0.5, 1, 2}, cap 100) and the bounded bet (BOUND_CLIP 3, the eight ±λ, gBounded)
// were ported into the engine's fleet/calibration-monitor.ts with these constants verbatim
// (engine ADR 0027; Tessera ADR 0028 measured the equivalence field by field). Verified
// body-identical again on 2026-09-23. Imported and re-exported here so this module and the
// engine's monitor can never drift apart on the increment family (ADR 0027 coherence rule).
import {
  gInc, G_CAP, BOUND_CLIP, BOUND_LAMBDAS, gBounded, type IncrementKind,
} from '@johnpatrickwarren-oss/deploysignal-engine/fleet/calibration-monitor';
export { gInc, G_CAP, BOUND_CLIP, BOUND_LAMBDAS, gBounded, type IncrementKind };

// ── The e-value objects: served by the engine (engine ADR 0034, Tessera ADR 0032) ────────────
export {
  normalizedMixtureEValue,
  geometricMixtureEValue,
  GEO_RHOS,
} from '@johnpatrickwarren-oss/deploysignal-engine/detectors/onset-mixture-e-value';
