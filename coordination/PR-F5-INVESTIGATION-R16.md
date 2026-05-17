# PR-F5 Storage Investigation — R16 Findings

_Investigation round R16. Produced 2026-05-17. Input: R14 TQ-1 hypothesis; NEXT-ROLE.md R16 scope._
_Operator decision required: choose disposition (α), (β), or (δ). R16 does NOT pre-dispose._

---

## Summary

**d-mismatch hypothesis: REFUTED.**

The ratio does not approach 1.2-1.5× at high d. It converges toward ~N = 1000. At d=100, the measured ratio is 1006.5×. The architect's 1.2-1.5× prediction is structurally incompatible with N=1000 shards storing per-shard cells; the minimum achievable ratio with any non-trivial per-shard encoding is ≈ N.

**welford_state: LOAD-BEARING for compiled-config persistence.**

Cold-start without welford_state resets the Welford accumulator to n=1, discarding all prior accumulated statistics (mean, covariance). Empirically confirmed via AC-R16-4.

**Diagonal-only covariance: reduces ratio ~40× at d=100; structurally breaks Family C.**

---

## Item 1 — Dimension-dependence table

**Methodology:** Single-shard proxy + N=1000 extrapolation (Approach B per spec § Brainstorm). Builds K=168 fleet cells and K=168 single-shard cells at each d; estimates N=1000 total as `N_SHARDS × singleShardBytes`. Justified by AC-10's verified linear scaling (1059.9 vs 1000, ~6% deviation from shard_id length variation; single-shard proxy consistent across all d). d=10 proxy (1233.1×) matches full-N AC-8 measurement (1237.7×) within 0.4%.

_Source: `test/q14-pr-f5-storage.test.ts` R16 AC-R16-1/2 test output. All values OBSERVED._

| d  | fleet KB | 1-shard KB | ratio (×) = (fleet + 1000×1-shard) / fleet |
|----|----------|------------|--------------------------------------------|
| 10 | 67.9     | 83.6       | 1233.1                                     |
| 25 | 269.0    | 284.3      | 1057.7                                     |
| 50 | 930.2    | 943.6      | 1015.5                                     |
| 100| 3478.7   | 3497.7     | 1006.5                                     |

**Interpretation:**

As d increases, the d×d matrices (covariance in fleet, m2 in per-shard) dominate both fleet and per-shard cell sizes equally. The per-shard overhead fields (shard_id, residual_seed_hash, last_observed_at) contribute a shrinking fraction of per-cell bytes. Ratio converges from 1233× at d=10 toward an asymptote of ≈ N+1 = 1001 as d→∞.

**d-mismatch hypothesis verdict:**

The hypothesis that "ratio approaches 1.2-1.5× at high d" is **REFUTED**. At d=100, ratio = 1006.5×. The ratio IS d-dependent (decreases as d grows) — the hypothesis was partially right about the direction — but converges toward N=1000, not toward 1.2-1.5×.

**Structural explanation:**

The prediction of 1.2-1.5× would require per-shard total ≤ 0.5 × fleet total:
- Per-shard total ≈ N × K × per_shard_per_cell ≈ N × fleet total (since per_shard_per_cell ≈ fleet_per_cell at all d)
- For ratio = 1.5×: N × per_shard_per_cell = 0.5 × fleet_per_cell → per_shard_per_cell = fleet_per_cell / 2000

Achieving per_shard_per_cell = fleet_per_cell / 2000 is impossible with any meaningful per-shard residual content. The minimum achievable ratio for N=1000 shards with any per-shard cells is ≈ N+1 ≈ 1001. The architect's prediction failed to account for the N×K multiplicative factor.

The prediction would have been correct only for N ≤ ~3-5 shards, or if per-shard cells were not stored in the compiled-config at all.

---

## Item 2 — Welford-state persistence requirement

**Static trace (`engine/per-shard/runtime.ts:100-103`):**

```typescript
const accumulatorBase: WelfordState =
  seedChanged || current.welford_state === undefined
    ? initialWelfordState(obs.sampleVector.length)
    : current.welford_state;
```

When `current.welford_state === undefined` (compiled-config loaded without welford_state field): `initialWelfordState(d)` returns `{ n: 0, mean: [0,...,0], m2: [[0,...],[...]] }`. The first new sample sets n=1. All prior accumulated statistics (mean, covariance, n) are lost.

**Empirical confirmation (`test/q16-pr-f5-investigation.test.ts` AC-R16-3/4):**

AC-R16-3: welford_state survives JSON.stringify → JSON.parse round-trip exactly (deep-equal). The persistence layer does not corrupt it.

AC-R16-4:
- WITH welford_state (n=25) → updatePerShardResidual → result.welford_state.n === **26** (continued)
- WITHOUT welford_state → updatePerShardResidual → result.welford_state.n === **1** (reset)

**Verdict: welford_state IS load-bearing for compiled-config persistence.**

Omitting welford_state from the compiled-config would cause any warm_start or strict tier residual to silently lose its accumulated statistics on cold-start. The system would appear to run correctly (no crash) but accuracy of the per-shard mean/covariance estimates would restart from 0 observations on each restart.

**Cold-start redesign feasibility:** A redesign where welford_state is NOT persisted (and cold-start re-accumulates from raw observations) would require the Tessera runtime to store raw observation history, which is currently anti-scope (Phase 2+ scope). Not a viable R16 option.

---

## Item 3 — Diagonal-only covariance feasibility

**Storage estimate if welford_state.m2 were diagonal-only (d values instead of d×d):**

Methodology: from empirical per-cell byte counts, estimate m2 savings as (d²-d) × 2.1 bytes/float (derived from observed increments: d=10→25 yields ~2.21 bytes/float; d=50→100 yields ~2.06 bytes/float; average ≈ 2.1). Diagonal single-shard = singleShardBytes − K×(d²-d)×2.1. All values are estimates; ±10% accuracy.

| d   | singleShardBytes | m2 savings (est.) | diagonal single-shard (est.) | diagonal ratio (est.) |
|-----|-----------------|-------------------|------------------------------|-----------------------|
| 10  | 83.6 KB         | 31 KB             | 52.6 KB                      | ~775×                 |
| 25  | 284.3 KB        | 207 KB            | 77.3 KB                      | ~289×                 |
| 50  | 943.6 KB        | 844 KB            | 99.5 KB                      | ~108×                 |
| 100 | 3497.7 KB       | 3411 KB           | 86.6 KB                      | ~26×                  |

**Architectural feasibility:**

Diagonal-only m2 would break **Family C Hotelling T² semantics**. The Hotelling T² statistic requires:

_T² = (x̄ − μ₀)ᵀ Σ⁻¹ (x̄ − μ₀)_

where Σ⁻¹ is the inverse of the FULL sample covariance matrix (precision matrix). A diagonal approximation eliminates off-diagonal covariance terms, effectively assuming signal dimensions are independent. This is a different statistical model (Gaussian with diagonal covariance), not a lossless compression of the existing model.

Consequence: Family C detectors would no longer detect correlated cross-signal deviations (e.g., signal_A up, signal_B down by correlated amount). This changes the detection semantics inherited from DeploySignal Phase 3.d.D.

**R16 does NOT recommend implementing diagonal-only.** Documenting the storage estimate only, per anti-scope. Any decision to pursue diagonal-only is Architect scope in a future round (requires statistical correctness analysis + PRD impact assessment).

---

## Item 4 — Operator disposition options

### (α) Architecture-revise

**Evidence-informed framing:**

Achieving the 1.2-1.5× target requires a structural change to what is stored in the compiled-config, not incremental compression:
- Diagonal-only at d=100: reduces to ~26× (still 17× above target)
- Eliminating welford_state: breaks cold-start accuracy (and would still give ~6-10× ratio from cell overhead)
- No single known mechanism reaches 1.2-1.5× at N=1000

Viable α revisions (each requires separate Architect analysis round):
1. **Reduce N-shards in compiled-config:** Store only M < N "representative" or "exemplary" shards; remainder re-warms from live observations. Tradeoff: reduces accuracy guarantee per PRD AC-P2.
2. **Sparse encoding by tier:** Omit warm_start/none cells from compiled-config entirely; only persist strict-tier cells. With N=1000 × K=168 cells, most may be warm_start or none at any snapshot time — potential for >10× reduction.
3. **Rank-reduced residual:** Store compressed welford_state (top-k principal components instead of full m2). Statistical correctness degraded; requires PRD impact analysis.

**Recommendation from R16:** Option 2 (sparse encoding by tier) is the least invasive and most consistent with the existing sparse-encoding inverse-convention (R02). If most cells are warm_start/none at compiled-config snapshot time, storing only strict-tier cells could reduce per-shard total substantially while preserving strict-tier accuracy. This should be the subject of a future Architect round if (α) is chosen.

### (β) Pitch-revise

**Evidence-informed framing:**

Update v0.3 § 2.2 prediction to empirical truth:

> "Per-shard compiled-config storage: at N=1000 shards × K=168 cells × d=10 signal dimensions with warm_start residuals fully populated, empirical overhead ratio = 1237.7× fleet baseline. Ratio is dimension-dependent (1006.5× at d=100) but converges toward N, not toward 1.2-1.5×. The original 1.2-1.5× prediction did not account for the N×K multiplicative factor. Sparse-encoding (none tier) reduces ratio to ~229×; warm_start tier is the dominant overhead contributor. Storage is dominated by welford_state.m2 (d×d matrix, load-bearing for cold-start continuity)."

Phase 2 proceeds without a storage gate. Storage-compression SLICE (diagonal-only? tier-sparse encoding?) added to Phase 2 SLICE 2+ scope, not as an activation gate. Fleet operators targeting the N=1000, d=10 regime should expect ~82 MB per-shard JSON at warm_start tier.

### (δ) Defer

**Evidence-informed framing:**

Phase 2 cross-shard correlation (FR-E3a/b/c) does not materially change the per-shard cell storage structure. Each shard still has K cells with welford_state. Deferral does not produce new storage-reduction opportunities at Phase 2 entry.

However, Phase 2 may reduce the fraction of warm_start cells if strict-tier convergence is faster in cluster operation, moderating the ratio somewhat. This effect is unquantified.

Not recommended: v0.3 § 2.2 "load-bearing acceptance failure" criterion (>2× deviation) is formally triggered at 1237.7×. Documenting the deviation as acknowledged-provisional is less clean than (β).

---

## Correction-propagation check (R09 MAJOR-1 reinforcement)

Sites citing the 1237.7× number or the d-mismatch hypothesis:
1. `test/q14-pr-f5-storage.test.ts:14-18` — header note. No correction needed: the note explains d=10 overhead (accurate) without claiming the ratio would be 1.2-1.5× at high d.
2. `coordination/PHASE-1-CLOSE-WALK.md` — cites 1237.7× as an observed fact (accurate). No correction needed.
3. `coordination/OVERNIGHT-LOG-2026-05-17.md` — cites 1237.7× + d-mismatch hypothesis as "architect's recommendation for (γ)." No correction needed; R16 is the investigation; findings replace the hypothesis.
4. `coordination/SCOPING-MEMO-v0.3.md § 2.2` — the load-bearing prediction claim. Requires update IF operator chooses (β). Not updated by R16 (anti-scope; operator decision gates the revision).

No files corrected by R16 itself. Operator amendment of SCOPING-MEMO-v0.3.md § 2.2 is (β)-scope.

---

_R16 investigation complete. Operator picks disposition. R16 routes to REVIEWER._
