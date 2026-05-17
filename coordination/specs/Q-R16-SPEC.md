# Q-R16-SPEC — PR-F5 Storage Measurement Investigation

_Audit-tier (S4 + S2). Implementer self-specs and executes; Reviewer cold-audits. Spec authored 2026-05-17._

---

## § Brainstorm

**Problem:** R14 measured a 1237.7× overhead ratio at d=10. The architect's v0.3 § 2.2 prediction was 1.2-1.5×. R14's header note hypothesizes the deviation is due to d-mismatch: "prediction assumed high-d (d≈50+) fleet baseline." R16 tests this hypothesis empirically across d ∈ {10, 25, 50, 100}.

**Approach A — Full N×K arrays at all d values**
Build 1000×168 = 168,000 cells at each d. Direct measurement; no extrapolation needed.
- Strengths: Maximum empirical rigor; matches existing AC-8 method exactly.
- Weaknesses: d=50 requires ~3.4 GB heap; d=100 requires ~13 GB heap → OOM.
- Risk: d=100 triggers HALT + DIAGNOSTIC per NEXT-ROLE.md halt-condition list.
- Hidden assumption: Node.js can survive 3+ GB heap under test.

**Approach B — Single-shard proxy + N extrapolation** ← SELECTED
Build K=168 fleet cells and K=168 single-shard cells at each d; multiply single-shard bytes × N to estimate N=1000 total.
- Strengths: Safe at all d including d=100; empirical per d (not purely analytical); AC-10 already validates linear scaling (observed 1059.9 vs expected 1000; ~6% deviation for shard-ID length variation).
- Weaknesses: Extrapolation introduces ~6% noise vs direct measurement; known and bounded.
- Risk: None. Both fleet and single-shard at d=100 require only K=168 cells × d² ≈ 168 × 10,000 = 1.68M floats → ~13 MB heap; feasible.
- Hidden assumption: Scaling linearity at other d values — validated by the d²-domination structure shared by both fleet and per-shard cells.

**Approach C — Analytical formula only**
Compute ratio = 1 + N × (overhead_s + 4d + 4d²) / (overhead_f + 4d + 4d²) for each d.
- Strengths: No memory concerns; exact asymptotic math.
- Weaknesses: Approximation only; JSON encoding overhead not accounted for precisely.
- Risk: 5-15% error; insufficient rigor for an empirical investigation round.

**Approach D — Mixed empirical (low d) and analytical (high d)**
Weaknesses: Inconsistent methodology across d values; harder to interpret; adds complexity.

**Selected: Approach B.** Eliminates Approach A (OOM at d=100), C (insufficient rigor), D (inconsistent methodology). Approach B is most rigorous while safe. The ~6% N-extrapolation noise is known and bounded (from AC-10's measured 1059.9 vs 1000 ratio).

---

## § Design

**Component inventory:**
- MODIFIED: `test/q14-pr-f5-storage.test.ts` — add one new test for Item 1 (d-dimension table). Existing 3 tests (AC-8/9/10) unchanged.
- CREATED: `test/q16-pr-f5-investigation.test.ts` — 2 new tests for Item 2 (welford_state cold-start persistence).
- CREATED: `coordination/PR-F5-INVESTIGATION-R16.md` — findings + operator options briefing.

**Integration points:**
1. `test/q14-pr-f5-storage.test.ts` → `test/_substrate/factories.ts` (makeCellKey, makePerShardResidual, makePerShardCell): factories use shallow-merge overrides and accept arbitrary-length arrays → parameterization by d is inline (no factory changes needed).
2. `test/q16-pr-f5-investigation.test.ts` → `engine/per-shard/runtime.ts` (`updatePerShardResidual`, `ExtendedSampleObservation`): tests existing behavior of the cold-start accumulator branch at runtime.ts:101 (`current.welford_state === undefined → initialWelfordState`).

**Failure modes:**
- Item 1 d=100 OOM: NOT expected with single-shard proxy (168 cells × 10,200 fields ≈ 13 MB). If it does occur: HALT + DIAGNOSTIC.
- Item 2 behavioral divergence: if `updatePerShardResidual` behaves differently than the static trace predicts → HALT + DIAGNOSTIC.
- Linear-scaling assumption fails at high d: if AC-R16-2 monotone-decrease check fails (ratio increases at some d), the d-mismatch hypothesis is partially confirmed → document in findings without HALT.

**Pre-investigation analytical predictions (record for comparison against observed):**
At d=10 (baseline): fleet ≈ 67.9 KB; single-shard ≈ 79.2 KB; ratio ≈ 1 + 1000 × (79200/69530) ≈ 1 + 1000 × 1.14 ≈ 1140. Observed: 1237.7×.

At high d, both fleet and single-shard cells are dominated by d×d matrices; ratio → 1 + N × (d²+d+overhead_s)/(d²+d+overhead_f) → 1 + N ≈ 1001. The d-mismatch hypothesis (ratio → 1.2-1.5×) is structurally impossible: it would require N × per_shard_per_cell ≈ 0.2 × fleet_per_cell, i.e., per_shard_per_cell ≈ fleet_per_cell / 5000 — impossible for any non-trivial per-shard encoding at N=1000.

**welford_state static trace** (`engine/per-shard/runtime.ts:100-103`):
```
const accumulatorBase: WelfordState =
  seedChanged || current.welford_state === undefined
    ? initialWelfordState(obs.sampleVector.length)
    : current.welford_state;
```
When `current.welford_state === undefined` (cold-start from compiled-config without welford_state): accumulator reinitializes to `{n:0, mean:[0,...], m2:[[0,...],...]}`. First sample gives `n=1`. Conclusion: welford_state IS load-bearing for accumulated statistics (mean and covariance history lost on cold-start without it).

---

## 1. Goal

R16 verifies the PR-F5 measurement methodology and produces an operator-ready findings document for TQ-1 disposition. R14 measured a 1237.7× overhead ratio at d=10 with a d-mismatch hypothesis. This round tests that hypothesis by re-measuring at d ∈ {10, 25, 50, 100} (Item 1), traces the welford_state persistence requirement (Item 2), estimates the diagonal-only storage impact (Item 3), and synthesizes into a findings document with option framings for operator disposition (α architecture-revise / β pitch-revise / δ defer). R16 does NOT pick the disposition.

---

## 2. Mechanism

**Item 1 — d-parameterized re-measurement:**
Build K=168 fleet cells (family_C with d-dimensional mean_vector + covariance) and K=168 single-shard per-shard cells (welford_state with d-dimensional mean + m2) at each d ∈ {10, 25, 50, 100}. Measure JSON byte size of each. Estimate N=1000 overhead ratio as `(fleetBytes + N_SHARDS × singleShardBytes) / fleetBytes`. Report a table. Assert ratio ≥ 500 at all d (refutation threshold; 1.2-1.5× target is ~400× lower). Assert ratio decreases monotonically with d (d-mismatch partial-validity check). Use inline helper functions `buildFleetBaselineAtD(d, k)` and `buildSingleShardCellsAtD(d, k)` in the test file; no factory changes required.

**Item 2 — welford_state persistence requirement:**
Static trace: `runtime.ts:101` branches on `current.welford_state === undefined` → fresh `initialWelfordState`. Empirical test: call `updatePerShardResidual` on a warm_start residual WITH and WITHOUT welford_state populated; assert resulting `welford_state.n` differs (26 vs 1). This is the load-bearing test: n=26 means accumulator continued; n=1 means reset.

**Item 3 — diagonal-only estimate:**
At each d, compute: `diagBytes(d) = singleShardBytes(d) − m2_savings(d)` where `m2_savings(d) = (d×d − d) × bytes_per_float`. Document in the findings doc. Note that diagonal-only m2 would break Family C Hotelling T² semantics (the statistic requires a full-rank precision matrix for the Mahalanobis distance; diagonal approximation is a different statistical model). R16 documents the storage estimate; architectural feasibility is an Architect scope item in a future round.

**Coordination artifacts:** `coordination/specs/Q-R16-SPEC.md` (this file), `test/q14-pr-f5-storage.test.ts` (modified), `test/q16-pr-f5-investigation.test.ts` (new), `coordination/PR-F5-INVESTIGATION-R16.md` (new).

---

## 3. Acceptance criteria

**AC-R16-1:** Given d ∈ {10, 25, 50, 100}, when the d-parameterized measurement test runs, then for each d the estimated N=1000 overhead ratio `(fleetBytes + 1000 × singleShardBytes) / fleetBytes` is ≥ 500. (Refutation threshold: if d-mismatch hypothesis were true, ratio at d=100 would be ~1.5×; ≥500 at every d empirically refutes it.)

**AC-R16-2:** Given the d-parameterized table from AC-R16-1, when the ratios are compared in order d=10, 25, 50, 100, then each successive ratio is strictly less than the previous (monotone decrease). (Verifies d-dependence direction: as d grows, overhead per cell equalizes between fleet and per-shard, so ratio converges toward N.)

**AC-R16-3:** Given a PerShardResidual with `welford_state: { n: 25, mean: [1, 2], m2: [[4, 0], [0, 4]] }`, when `JSON.stringify` → `JSON.parse` round-trips it, then the round-tripped `welford_state` deep-equals the original. (Verifies welford_state survives the JSON persistence layer used by loadCompiledConfig.)

**AC-R16-4:** Given two residuals identical except one has `welford_state: { n: 25, mean: [1, 2], m2: [[4, 0], [0, 4]] }` and the other has `welford_state` absent, when `updatePerShardResidual` is called on each with an identical sample `sampleVector: [0.1, 0.2]`, then the residual WITH welford_state produces `welford_state.n === 26` and the residual WITHOUT produces `welford_state.n === 1`. (Verifies load-bearing determination: n=26 = continued accumulation; n=1 = cold-start reset.)

**AC-R16-5:** Given the findings document `coordination/PR-F5-INVESTIGATION-R16.md`, then it contains: (a) a dimension-dependence table with 4 rows (d=10, 25, 50, 100) reporting fleet bytes, single-shard bytes, and estimated N=1000 ratio; (b) a welford_state persistence verdict with the runtime.ts:101 code citation; (c) a diagonal-only storage estimate table at d ∈ {10, 25, 50, 100}; (d) disposition framings for options α, β, and δ citing the R16 measurements. (Verifies deliverable completeness; each sub-item is independently checkable by the Reviewer.)

---

## 4. Anti-scope

- **No changes to vendored engine files** (A12/A5 inherited; runtime.ts, welford.ts, warm-start.ts, engine/types/ are read-only or unchanged).
- **No compression mechanism implementation** (α architecture-revise is an operator decision; R16 estimates only).
- **No diagonal-only implementation** (PerShardResidual schema and WelfordState are unchanged; estimate only).
- **No change to existing AC-8/9/10 tests** in q14-pr-f5-storage.test.ts (existing binding tests preserved as-is; new test added alongside).
- **No architectural disposition** (R16 surfaces evidence + options; operator picks α/β/δ after reviewing findings).
- **No Phase 2 scope** (cross-shard correlation, topology, event-feed all deferred per PRD FR-E3a/b/c).

---

## 5. Open questions

None — all resolved.

The welford_state persistence question (NEXT-ROLE.md split-condition) was resolvable by static trace: `runtime.ts:101` is deterministic (empirically testable). AC-R16-4 provides the empirical confirmation; no architectural ambiguity requiring operator gate.

---

## § Pre-emit grilling (spec-author pass)

1. **Every claim backed by verifiable evidence?** Yes: runtime.ts:101 cited by line; existing measurement 1237.7× verified by running `node --test test/q14-pr-f5-storage.test.js`; factories.ts confirmed to accept arbitrary-length arrays via shallow-merge; analytical prediction documented inline with formula.

2. **Unstated assumptions?** Two surfaced: (a) linear scaling holds at all d — justified by d²-domination of both fleet and per-shard; (b) factories support arbitrary welford_state arrays — confirmed (makePerShardResidual takes `Partial<PerShardResidual>` overrides).

3. **Scope beyond what was requested?** No new production code. No compression implementation. d=100 handled safely via single-shard proxy without OOM.

4. **Can Reviewer act with zero clarifying questions?** Yes: ACs are formula-specific (ratio ≥ 500; n === 26 vs n === 1); findings doc sections are enumerated (a)-(d); anti-scope explicitly fences architectural decisions.

**Grilling catch:** AC-R16-2 monotone-decrease assertion could fail if the shard-ID-length effect at d=10 causes the observed ratio to be an outlier rather than a smooth curve. Mitigation: the single-shard proxy is consistent at all d (always shard_id='shard-0'), so the extrapolated ratio IS consistent. The AC is safe.
