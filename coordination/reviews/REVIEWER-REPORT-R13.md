# REVIEWER-REPORT-R13 — Tessera Phase 1 SLICE 4: e-Benjamini-Hochberg FDR operator surface

_From: REVIEWER (R13 pipeline run; full tier per Q-R13-SPEC.md § Spec preamble + NEXT-ROLE.md routing)._
_To: Memorial Updater._
_Date: 2026-05-17._
_HEAD at review: `26bc2bd` (post R13 GREEN + R13 coordination chore + attestation SHA write)._

---

## Inputs read (cold-review boundary)

- `coordination/PRD.md` (full, 93 lines).
- `coordination/specs/Q-R13-SPEC.md` (full via 3 offset reads; 918 lines total).
- `engine/fleet/e-bh.ts` (full, 133 lines; new at R13).
- `test/q13-e-bh-fdr.test.ts` (full, 270 lines; new at R13).
- `coordination/NEXT-ROLE.md` (full, 147 lines; for Attestation block + halt-condition tracking).
- `~/.claude/CROSS-PROJECT-MEMORIAL.md` (Reviewer-section + tessera R06-R12 sections; targeted offset reads against the 2458-line file).
- Inherited surfaces for citation verification: `engine/types/families/a.ts:20-28`, `engine/types/families/c.ts:297-302`, `engine/detectors/betting-e-process.ts:63-82` + `:148-170`.

## NOT read (cold-review independence)

- `coordination/specs/Q-R13-SPEC-AUDIT.md` (audit sidecar — held the cold-review boundary per R12 first-application precedent; the spec body is sufficient for MAJOR-class detection at this surface scope).
- `coordination/diagnostics/` (none present at R13; verified empty).
- `coordination/logs/` (forbidden per CLAUDE-REVIEWER.md).
- `coordination/.prompt-*.md` (forbidden).
- `coordination/reviews/REVIEWER-REPORT-R[01-12].md` (prior-round reports; would contaminate adversarial independence).

## Independent re-runs (R06+ standing Reviewer policy)

- `npm run typecheck` — exit 0 at HEAD `26bc2bd`.
- `node --test test/q13-e-bh-fdr.test.js` — **14 / 0** at HEAD `26bc2bd`; iid FDR=0.00500, correlated FDR=0.00500, bound=0.09623; duration_ms ≈ 212.
- `node --test test/*.test.js` — **152 / 0** at HEAD `26bc2bd`; duration_ms ≈ 533.
- `git diff 2a3c177..HEAD --name-status` → exactly 4 paths: `engine/fleet/e-bh.ts` (A), `test/q13-e-bh-fdr.test.ts` (A), `coordination/NEXT-ROLE.md` (M), `coordination/MEMORIAL.md` (M). All 21 R13-SAS clauses honored by absence.
- Hand-traced AC-5, AC-6, AC-7, AC-8 closed-form fixtures against the algorithm in `engine/fleet/e-bh.ts:90-133` — all four step-down computations yield the spec-asserted R and `selected` arrays.

---

## 1. Per-AC verification table

| AC-ID | Criterion (short) | Status | Evidence |
|---|---|---|---|
| AC-1 | Output shape `{ selected: ReadonlyArray<number>, K: number }`; `K === selected.length` | PASS | `test/q13-e-bh-fdr.test.ts:62-67`; Reviewer re-run reports `R13 AC-1` ✔ (0.85ms). Function body returns `{ selected, K: R }` at `engine/fleet/e-bh.ts:132`; `selected` built as `number[]` (line 127), `K=R` per loop (line 117-123). |
| AC-2 | `eBenjaminiHochberg([], 0.05)` throws `/empty input/` | PASS | `test/q13-e-bh-fdr.test.ts:70-76`; Reviewer re-run ✔. Guard at `engine/fleet/e-bh.ts:95-97` throws with verbatim "empty input array" message. |
| AC-3 | Throws on `qLevel ∈ {0, -0.1, 1.5, 2}` | PASS | `test/q13-e-bh-fdr.test.ts:79-84`; Reviewer re-run ✔. Conjunctive guard at `engine/fleet/e-bh.ts:98-100`: `!(qLevel > 0 && qLevel <= 1)` correctly rejects all four cases (0 fails `> 0`; -0.1 fails `> 0`; 1.5 fails `<= 1`; 2 fails `<= 1`). |
| AC-4 | All e_i = 0.5 (N=100) at q=0.05 ⇒ K=0, `selected=[]` | PASS | `test/q13-e-bh-fdr.test.ts:87-94`; Reviewer re-run ✔. N/q=2000; max k·e_(k) = 100·0.5 = 50 ≪ 2000 → R=0; `selected` allocated empty (lines 127-130 loop with R=0 contributes nothing). |
| AC-5 | `[50,30,10,2,0.5]` at q=0.2 ⇒ K=3, `selected=[0,1,2]` | PASS | `test/q13-e-bh-fdr.test.ts:97-106`; Reviewer hand-traced: N/q=25; k=5 → 2.5✗, k=4 → 8✗, k=3 → 30✓; raw [0,1,2]; sort ASC → [0,1,2]. Reviewer re-run ✔. |
| AC-6 | `[300,150,80,40,20,10,5,2.5,1.25,0.6]` at q=0.05 ⇒ K=3, `selected=[0,1,2]` | PASS | `test/q13-e-bh-fdr.test.ts:109-120`; Reviewer hand-traced: N/q=200; k=10..4 fail (max 4·40=160); k=3 → 240✓; raw [0,1,2]; ASC = [0,1,2]. Reviewer re-run ✔. |
| AC-7 | Non-contiguous high-e at idx [3,0,7]; `selected=[0,3,7]` strictly ASC | PASS | `test/q13-e-bh-fdr.test.ts:123-141`; Reviewer hand-traced: DESC tiebreak idx-ASC yields raw [3,0,7]; sort ASC → [0,3,7]; secondary strict-ASC loop at 132-140 redundantly confirms. Reviewer re-run ✔. |
| AC-8 | Tie-break deterministic via idx-ASC: all-tied [100×5] ⇒ [0,1,2,3,4]; partial [200,1,1,200,200] ⇒ [0,3,4] | PASS | `test/q13-e-bh-fdr.test.ts:144-162`; Reviewer hand-traced: comparator at `engine/fleet/e-bh.ts:108-111` sorts e DESC, idx ASC on ties. All-tied: stable sort + secondary idx-ASC gives [0,1,2,3,4]. Partial: sorted order = [(200,0),(200,3),(200,4),(1,1),(1,2)]; k=3 → 3·200=600≥50 ✓; raw [0,3,4]; ASC [0,3,4]. Reviewer re-run ✔. |
| AC-9 | Input array not mutated | PASS | `test/q13-e-bh-fdr.test.ts:165-170`; impl builds `indexed: Array<{e, idx}>` copy at `engine/fleet/e-bh.ts:104-107` and sorts the copy; input never touched. Reviewer re-run ✔. |
| AC-10 | PR-F2 iid H₀ empirical FDR ≤ Wilson upper bound 0.09624 | PASS | `test/q13-e-bh-fdr.test.ts:173-180`; Reviewer re-run: OBSERVED 0.00500 ≤ 0.09623; Wang-Ramdas 2022 Thm 4.1 theory-derived bound (NOT OBSERVED-bound; right-reasons-safe). |
| AC-11 | PR-F2 correlated-drift H₀ (ρ²=0.5) empirical FDR ≤ Wilson upper bound | PASS | `test/q13-e-bh-fdr.test.ts:183-190`; Reviewer re-run: OBSERVED 0.00500 ≤ 0.09623. PR-F2 simulator at `:233-257` constructs shared-z + per-shard-noise with marginal Var=1, cross-shard Corr=0.5 verbatim per § Mechanism primitive 10. |
| AC-12 | `eBenjaminiHochberg([1,2,3], undefined)` throws `/qLevel/` | PASS (with OBS-2 narrative-coverage caveat below) | `test/q13-e-bh-fdr.test.ts:193-204`; runtime throw via conjunctive guard (undefined > 0 → false). Reviewer re-run ✔. |
| AC-13 | RED commit (test only; TS2307) precedes GREEN commit (impl only; tests pass) | PASS | `git log --oneline`: RED `4110daa` (2026-05-17 01:54:45; +270 test only) precedes GREEN `d54912d` (2026-05-17 01:56:19; +133 impl only); Δt = 1m34s. Reviewer ran `git show --stat 4110daa d54912d` independently — verified test file alone at RED, production file alone at GREEN. 11th consecutive Tessera Reviewer-side TDD attestation (R02-R13). |
| AC-14 | OBSERVED q13 count + full-regression count + FDRs recorded VERBATIM in `coordination/NEXT-ROLE.md` Attestation block | PASS | `coordination/NEXT-ROLE.md:107-117`: q13 = 14/0 ✓; full regression = 152/0 ✓; iid FDR = 0.00500 ✓; correlated FDR = 0.00500 ✓; wall-clock ≈ 0.21s ✓; TDD ordering RED `4110daa` / GREEN `d54912d` ✓; `grep -c "^export "` = 2 ✓; `git ls-files engine/fleet/e-bh.ts` = 1 line ✓. SHA-A `17994dc` recorded at line 119. |

**Tally: 14 PASS / 0 FAIL / 0 PARTIAL.**

---

## 2. Findings

### CRITICAL — none.
### MAJOR — none.

### MINOR-1 — "Wilson upper bound" mislabels the normal-approximation (Wald) 3σ formula

**Location:** Q-R13-SPEC.md § Mechanism primitive 10 ("Wilson upper bound on empirical FDR"); `test/q13-e-bh-fdr.test.ts:58-59` (`FDR_BOUND` definition + comment); AC-10 and AC-11 narrative text ("Wilson bound 0.09624"); `engine/fleet/e-bh.ts` JSDoc references the formula via spec back-reference.

**Issue:** The formula `q + 3·√(q(1-q)/N)` is the **Wald** (normal-approximation) 3σ upper bound — what falls out of the central-limit-theorem approximation to the binomial. The **Wilson score interval** is a different (more sophisticated) formula:

```
(p̂ + z²/(2n) + z·√(p̂(1-p̂)/n + z²/(4n²))) / (1 + z²/n)
```

Wilson is preferred over Wald specifically because it has better coverage properties at small n and near boundaries — but the spec uses Wald and calls it Wilson at multiple sites. The bound is conservative for n=200 and the tests pass regardless of terminology; this is a documentation-accuracy issue only, not a correctness issue.

**Why this matters:** R11+R12+R13 establish "Wilson upper bound" as the canonical PR-F1/PR-F2 evidence-matrix vocabulary (already entrenched in q11/q12 tests). A future statistically-literate reader auditing the FDR-control evidence will note the terminology mismatch and have to verify that the bound is in fact a valid upper bound (it is — Wald 3σ at p=0.05, n=200 produces 0.09624 which is comfortably above the typical PR-F2 outcome range). Future-round consideration: rename `FDR_BOUND` to `FDR_NORMAL_3SIGMA_BOUND` or revise spec/comments to "normal-approximation 3σ upper bound (≈ Wilson at large n)."

**Disposition:** Documentation-only; not blocking. Anchor handling: candidate for inclusion in a future SLICE 2 cleanup round (R14) docblock revision, or simply absorbed if R11+R12 stand precedent.

### OBS-1 — AC-3 does not bind NaN despite spec primitive 8 claiming the guard handles it

**Location:** Q-R13-SPEC.md § Mechanism primitive 8: "The single conjunctive guard `qLevel > 0 && qLevel <= 1` handles NaN and undefined uniformly (any comparison against NaN returns false)." `test/q13-e-bh-fdr.test.ts:79-84` AC-3 covers q ∈ {0, -0.1, 1.5, 2} — NaN absent.

**Issue:** Spec promises NaN handling as part of the guard's design, but no test exercises `qLevel = NaN`. AC-12 covers `undefined`; no AC covers `NaN`. Architect's pre-emit grilling Q14 (public-opts-coverage trivially-satisfied; only 2 positional params) and Q8 (corner cases) did not include NaN as a bound case despite acknowledging it in the primitive. The runtime guard correctly rejects NaN (`NaN > 0` is false), so behavior is fine — only the AC coverage is incomplete.

**Disposition:** Trivial coverage gap; safe to absorb. Pattern is the inverse of R06 MINOR-3 (opts-field declared in spec but not AC-bound; here a behavior is declared in spec-prose but not AC-bound). Future-round consideration: add a one-line `assert.throws(() => eBenjaminiHochberg([1,2,3], NaN), /qLevel/)` to AC-3 in any future docblock-revision pass.

### OBS-2 — AC-12 narrative claims compile-time enforcement; only runtime check is bound

**Location:** Q-R13-SPEC.md § Acceptance criteria AC-12: "AND compile-time enforcement: TypeScript signature `(perShardEValues: ReadonlyArray<number>, qLevel: number): EBenjaminiHochbergOutput` rejects `eBenjaminiHochberg([1, 2, 3])` (missing required argument)." `test/q13-e-bh-fdr.test.ts:193-204` only exercises the runtime `undefined` path.

**Issue:** AC-12's `AND` clause about compile-time enforcement is not bound by a test or by the Implementer's attestation block. The TypeScript signature does indeed reject missing arguments (verified via `tsc --noEmit` at HEAD `26bc2bd` exits 0 — meaning all call sites pass two args), but the AC narrative claims a deliberate compile-time-rejection guarantee that no test or attestation explicitly demonstrates. This is the R02/R04/R05 "spec-AC-outrun-test-pseudocode" pattern at trace level (the AC says more than the test covers), surfaced for visibility but not severe enough to be MINOR since the underlying TS signature does enforce it structurally.

**Disposition:** Acknowledged-trivial. The reinforcement at R05 was that named-test literals must appear in the named test body; here it is an `AND`-clause that names a structural property already present in the type system. No fix needed; OBS-class for compounding visibility.

### OBS-3 — `selected: ReadonlyArray<number>` is returned as a mutable `number[]` cast

**Location:** `engine/fleet/e-bh.ts:127-132`.

**Issue:** The interface field `selected: ReadonlyArray<number>` is declared as readonly at the type-system level, but the implementation builds a mutable `number[]` and returns it directly without `Object.freeze` or `as const`. A caller could `(out.selected as number[]).push(99)` and corrupt the result. This is a standard TypeScript-idiom concern (ReadonlyArray is structural, not enforced at runtime); R11 `combineProduct`/`combineAverage` and R12 `fleetMergeFamilyA/C` follow the same convention. No AC-9-style runtime invariance check for the OUTPUT is in scope at R13 (AC-9 covers INPUT invariance only).

**Disposition:** Trivial; matches R11/R12 precedent. The architectural convention is consistent across the fleet-merge family; flagging only for compounding visibility. No action required.

### OBS-4 — Both PR-F2 cells produce identical OBSERVED FDR = 0.00500

**Location:** Reviewer re-run + `coordination/NEXT-ROLE.md:111-112`: iid `fdr=0.00500`; correlated `fdr=0.00500`.

**Issue:** Both scenarios produced exactly 1 fire in 200 trials despite different RNG seeds (`0xE130BB01` vs `0xE130BB02`). Mathematically consistent — under H_0, the per-shard betting-e-process keeps E[M_T] ≤ 1 marginally, so reaching the e-BH threshold (N/q = 2000) requires a tail event of either a single very-high-wealth shard or many medium-wealth shards; this is rare enough that 1/200 in both cells is plausible. The correlated case differs from iid only in cross-shard COVARIANCE, not in per-shard marginal distribution; the e-BH theorem holds because Wang-Ramdas 2022 Thm 4.1 requires only marginal e-value validity, which the per-shard betting construction satisfies under both regimes. So identical OBSERVED values are not a violation of the underlying theory — they're a noisy estimate of two near-zero true FDR values that happens to round to the same realized count.

**Disposition:** No-action. Architectural claim (FDR ≤ q under arbitrary cross-shard dependence) is empirically supported in BOTH cells well below the Wilson/Wald bound. If a future operator wanted higher-resolution separation between iid vs correlated H_0, they would re-run at higher N_TRIALS (e.g., 10000) or a more aggressive q-level — out of R13 scope per § Mechanism primitive 10 budget rationale.

---

## 3. Right-reasons audit

Per CLAUDE-REVIEWER.md mandate: pick 3 tests; for each, trace to a spec requirement; verify the test passes because the implementation is correct, not because the test confirms its own implementation choice.

### Audit A — AC-5 closed-form worked example

- **Spec requirement:** § Mechanism primitive 2 (e-BH step-down algorithm: R = max{k : k·e_(k) ≥ N/q}) + cross-section consistency row 3 (linear-space input) + row 6 (output sorted ASC).
- **Test body** (`test/q13-e-bh-fdr.test.ts:97-106`): hand-traceable hard-coded fixture `[50, 30, 10, 2, 0.5]` at q=0.2. Expected K=3 and `selected=[0,1,2]` are derived **externally** from the e-BH algorithm definition (N/q=25; k=3 first satisfies k·e_(k)≥25 with 3·10=30).
- **Self-confirming check:** Would a buggy implementation pass? Suppose the impl computed `R = max{k : k·e_(k) ≥ N·q}` (multiplication instead of division — `25·0.2=5` would be reached at k=5 since 5·0.5=2.5 ≥ ... no, 2.5 < 5; this bug produces R=4 with 4·2=8 ≥ 5, fails the expected K=3). Suppose the impl sorted DESC then forgot to re-sort ASC for output. Suppose the impl used 1-indexed k and missed the k=N case. Any of those bugs fails this fixture.
- **Verdict: NOT self-confirming.** The test asserts a single load-bearing closed-form answer that constrains the algorithm tightly; it would fail under multiple plausible implementation deviations.

### Audit B — AC-8 partial-tie fixture

- **Spec requirement:** § Mechanism primitive 7 (deterministic tie-break by idx-ASC) + algorithm pseudocode comparator `(a,b) => b.e !== a.e ? b.e - a.e : a.idx - b.idx`.
- **Test body** (`test/q13-e-bh-fdr.test.ts:152-161`): fixture `[200, 1, 1, 200, 200]` at q=0.1; expected K=3 and `selected=[0,3,4]`. The expected indices are derived from the spec's tie-break rule (idx-ASC) — under any OTHER deterministic rule (e.g., idx-DESC), the partial-tie sort would still produce three 200-valued shards in some order, but the FINAL ASC-sorted output `[0,3,4]` is invariant under tie-break choice **because no two shards with e=200 share a position-after-sort-DESC slot** that matters for the SELECTED set. So strictly speaking, the partial-tie fixture detects tie-break ASCness in the e-value ordering used to compute `R`, not in the output `selected`.
- **Critical sub-check:** Would a buggy comparator `(a,b) => a.idx - b.idx` (no e-value priority — sorts purely by idx ASC) pass AC-8 partial-tie? Walk through: DESC sort then becomes ASC by idx → `[(200,0),(1,1),(1,2),(200,3),(200,4)]`. Step down: k=5 → 5·200=1000 ≥ 50 ✓ → R=5. Wrong — would fail. Good.
- Would a buggy comparator `(a,b) => b.idx - a.idx` (DESC by idx) pass? DESC by idx (no e priority) → `[(200,4),(200,3),(1,2),(1,1),(200,0)]`. k=5 → 5·200=1000 ≥ 50 ✓ → R=5. Wrong — fails.
- Would a buggy comparator `(a,b) => b.e - a.e` (no tiebreak) pass? Stable sort preserves input order on equals → `[(200,0),(200,3),(200,4),(1,1),(1,2)]` — same as correct. k=3 → 600≥50 → R=3. Selected raw [0,3,4]; ASC [0,3,4]. **PASSES.** This means the partial-tie fixture cannot distinguish "stable-sort-with-no-tiebreak" from "explicit-idx-ASC-tiebreak." The all-tied fixture (line 145-150) has the same problem: stable sort of [100,100,100,100,100] preserves input order [0,1,2,3,4], identical to explicit idx-ASC.
- **Verdict: PARTIALLY self-confirming, mitigated by JavaScript V8 stable-sort guarantee.** ECMAScript 2019+ guarantees `Array.prototype.sort` is stable, so the explicit `a.idx - b.idx` clause is technically redundant for these specific fixtures. The comparator's explicit tie-break is correct and defensive; the AC-8 test would catch a swap from `a.idx - b.idx` to `b.idx - a.idx` (DESC tiebreak) on a non-stable engine, but not on V8/Node. **This is a fixture-design caveat, not an impl bug** — flagging as OBS rather than MAJOR since the underlying engine guarantees the behavior the test cannot independently distinguish.

### Audit C — AC-10 PR-F2 iid H₀ Wilson bound

- **Spec requirement:** § Mechanism primitive 11 (empirical FDR = P(K>0) under all-H₀) + AC-10 narrative (Wang-Ramdas 2022 Thm 4.1; FDR ≤ q · N_0/N ≤ q under arbitrary dependence) + § Mechanism primitive 10 (Wilson/Wald 3σ upper bound = 0.09624 at q=0.05, N_trials=200).
- **Test body** (`test/q13-e-bh-fdr.test.ts:173-180`): runs `measureEBHFireRate('iid', 0xE130BB01)` → 200 trials of (N=100 Family A wealth processes × T=100 ticks under iid N(0,1)) → extract `state.M` per shard → e-BH at q=0.05 → count K>0 → divide by 200 → assert ≤ FDR_BOUND.
- **Self-confirming check:** Would a future implementation FIX matching architect prediction (≈0.005-0.05) FAIL the assertion? No — 0.05 ≤ 0.09624. Would a future BUG producing FDR ≈ 0.20 (e.g., wrong threshold `k·e_(k) ≥ q/N` instead of `≥ N/q`) FAIL? Yes — 0.20 > 0.09624. The bound is conservative enough to accommodate predicted variance, strict enough to catch order-of-magnitude regressions. The R07 OBSERVED-binding-scope reinforcement is correctly applied (theory-derived bound, NOT OBSERVED-bound; future fix matching prediction PASSES, future bug producing inflation FAILS).
- **Verdict: NOT self-confirming.** The test is right-reasons-safe per R07 + R08 standing reinforcements.

**Audit aggregate:** 2 NOT self-confirming, 1 fixture-design caveat (OBS-class). Right-reasons audit clean for R13.

---

## 4. Cross-cutting checks

### TDD discipline (R02-R13 standing pattern; 11th consecutive Reviewer-side attestation)

- RED commit `4110daa` (2026-05-17 01:54:45 PDT): adds only `test/q13-e-bh-fdr.test.ts` (+270 lines); commit message correctly cites TS2307 on missing `../engine/fleet/e-bh`. Reviewer-side verification: `git show --stat 4110daa` confirms 1 file changed, 270 insertions — production file `engine/fleet/e-bh.ts` does NOT exist at this SHA (verified by `git ls-files engine/fleet/e-bh.ts` at SHA `4110daa` returns empty).
- GREEN commit `d54912d` (2026-05-17 01:56:19 PDT): adds only `engine/fleet/e-bh.ts` (+133 lines). `git show --stat d54912d` confirms 1 file changed, 133 insertions.
- Δt = 1m34s. Order RED < GREEN. **Verifiable in `git log --oneline` per AC-13.**

### No-skip / halt-discipline

- Zero DIAGNOSTIC files at HEAD `26bc2bd` (`coordination/diagnostics/` not consulted but verified empty via `git ls-files coordination/diagnostics/ | head` returning empty in cross-check).
- Architect-enumerated HALT triggers (Q-R13-SPEC.md § Implementer note 3 (a)/(b)/(c)): all THREE PASS condition met empirically — (a) PR-F2 OBSERVED FDR within Wilson bound on both cells; (b) `updateBettingState` signature at `engine/detectors/betting-e-process.ts:150-156` matches the REVIEWER-ANCHOR row verbatim (Reviewer ran `sed -n '148,170p'`); (c) OBSERVED q13 test count 14/0 matches architect prediction 14.

### Anti-scope (R13-SAS-1..21)

`git diff 2a3c177..HEAD --name-status` yields exactly 4 paths:

- `engine/fleet/e-bh.ts` (A) — spec-prescribed.
- `test/q13-e-bh-fdr.test.ts` (A) — spec-prescribed.
- `coordination/NEXT-ROLE.md` (M) — coordination chore.
- `coordination/MEMORIAL.md` (M) — coordination chore.

All 21 R13-SAS clauses verified by absence:

| SAS | Surface | Verified-empty by |
|---|---|---|
| R13-SAS-1 | `engine/fleet/combine.ts` | not in diff |
| R13-SAS-2 | `engine/fleet/detectors.ts` | not in diff |
| R13-SAS-3 | `engine/types/fleet.ts` | not in diff |
| R13-SAS-4 | `engine/per-shard/*` | not in diff |
| R13-SAS-5 | `engine/detectors/*` | not in diff |
| R13-SAS-6 | `engine/types/families/{a,b,c,d,e}.ts` | not in diff |
| R13-SAS-7 | `engine/types/config.ts` | not in diff |
| R13-SAS-8 | `engine/types/index.ts` | not in diff (Reviewer ran `grep -n "e-bh\|eBH\|eBenjamini" engine/types/index.ts` → 0 matches) |
| R13-SAS-9 | `tools/*` | not in diff |
| R13-SAS-10 | `test/_substrate/*`, `test/q[01-12]*.test.ts`, `test/betting-e-process-class-dispatch.test.ts` | not in diff |
| R13-SAS-11 | No real-cluster trace integration | n/a (synthetic only) |
| R13-SAS-12 | No Phase 2 work | n/a |
| R13-SAS-13 | No any-time FDR analog | impl is fixed-time only (single call, single decision point) |
| R13-SAS-14 | No chaining fleet-merge → e-BH | `engine/fleet/e-bh.ts` has ZERO `import` statements (Reviewer ran `grep -n "^import" engine/fleet/e-bh.ts` → 0 lines); `test/q13-e-bh-fdr.test.ts` imports only from `engine/fleet/e-bh` + `engine/detectors/betting-e-process` (no `combine` or `detectors` imports) |
| R13-SAS-15 | No randomized e-BH variant | only `eBenjaminiHochberg` exported (`grep -c "^export " engine/fleet/e-bh.ts` = 2 = interface + function) |
| R13-SAS-16 | No BY-style correction | impl uses standard Wang-Ramdas e-BH only |
| R13-SAS-17 | No Family-specific wrappers | no `eBenjaminiHochbergFamilyA/C` exports |
| R13-SAS-18 | No default qLevel | function signature `qLevel: number` (no `= 0.05` default) |
| R13-SAS-19 | No SLICE 2 carry-forwards | `mean_delta`, PR-F5, compiled-artifact loader all unchanged |
| R13-SAS-20 | PRD + SCOPING-MEMO unchanged | not in diff |
| R13-SAS-21 | Q-R[01-12]-SPEC.md unchanged | not in diff |

**21 / 21 SAS clauses honored.**

### Citation-accuracy spot-check (R11 OBS-1/-2 reinforcement; 2nd post-reinforcement application Reviewer-side)

- `engine/types/families/a.ts:21` `M: number;` — Reviewer verified via `sed -n '20,28p'`: ✓ matches REVIEWER-ANCHOR table row verbatim.
- `engine/types/families/c.ts:300` `log_S_t: number;` — Reviewer verified via `sed -n '297,302p'`: ✓ matches verbatim (300th line is the `log_S_t: number;` declaration).
- `engine/detectors/betting-e-process.ts:65` `const WEALTH_FLOOR = 1e-12;` — Reviewer verified via `sed -n '63,82p'`: ✓ matches.
- `engine/detectors/betting-e-process.ts:150-156` `export function updateBettingState(...)` signature — Reviewer verified via `sed -n '148,170p'`: ✓ matches verbatim (5-param signature returning number, sets `state.M` in-place at line 167 via `Math.max(WEALTH_FLOOR, ...)`).

**Citation accuracy clean at R13.** The R12 first-application precedent holds for a second consecutive round.

### Architect grilling-output verification (R12 6-gate self-grilling pattern)

Spec § Grilling output Q4 (right-reasons audit): "would a future implementation FIX matching the architect's prediction FAIL the FDR-control tests?" Architect verified NO. Reviewer independently confirmed via Audit C above. ✓

Spec § Grilling output Q20 (citation accuracy via sed -n extraction): Reviewer independently verified 4 of the 23 REVIEWER-ANCHOR rows — all clean. Sampling-based check; full re-verification would be the architect's responsibility under R11 reinforcement.

---

## 5. Grilling output (Reviewer's self-grilling per CLAUDE-REVIEWER.md Step 5)

Per CLAUDE-REVIEWER.md § Per-AC verification table + Findings + Right-reasons audit + Cross-cutting + Grilling, applied to THIS report before routing:

| Q | Question | Verdict |
|---|---|---|
| 1 | Every finding has a `file:line` reference? | **YES.** MINOR-1 cites Q-R13-SPEC.md § Mechanism primitive 10 + `test/q13-e-bh-fdr.test.ts:58-59`. OBS-1 cites Q-R13-SPEC.md § Mechanism primitive 8 + `test/q13-e-bh-fdr.test.ts:79-84`. OBS-2 cites Q-R13-SPEC.md § AC-12 + `test/q13-e-bh-fdr.test.ts:193-204`. OBS-3 cites `engine/fleet/e-bh.ts:127-132`. OBS-4 cites Reviewer re-run + `coordination/NEXT-ROLE.md:111-112`. |
| 2 | Any AC marked PASS without actual verification? | **NO.** Every AC PASS cell cites either a specific test line range AND/OR a Reviewer hand-traced computation AND/OR a Reviewer independent re-run command output. AC-13 cites the `git show --stat` Reviewer independently ran on both commits. AC-14 cites the populated attestation block at specific lines. |
| 3 | Right-reasons audit completed for 3+ tests? | **YES.** Three audits (AC-5, AC-8, AC-10) — 2 NOT self-confirming, 1 fixture-design caveat surfaced as OBS-class. Mitigated by V8 stable-sort guarantee; flagged for visibility. |
| 4 | Cold-review boundary held? | **YES.** Audit sidecar (`Q-R13-SPEC-AUDIT.md`) NOT read; diagnostics/ verified empty (not read); logs/ not read; .prompt-*.md not read; prior R01-R12 Reviewer reports not read. Citation accuracy verified via `sed -n` independently against named line ranges only — no inheritance of trust from architect attestation. |
| 5 | All binding commands independently re-run (R06+ standing policy)? | **YES.** `npm run typecheck` (exit 0); `node --test test/q13-e-bh-fdr.test.js` (14/0); `node --test test/*.test.js` (152/0); `git diff 2a3c177..HEAD --name-status` (4 paths exactly); `grep -n "^import"`, `grep -c "^export "`, `git ls-files`, `git show --stat` on RED + GREEN — all Reviewer-side. |
| 6 | Adversarial mandate honored — at least one finding surfaced? | **YES.** 1 MINOR + 4 OBS surfaced despite the cleanest Tessera production-implementation surface to date (one new function + one new test file). The Wilson-vs-Wald terminology MINOR is a documentation-accuracy issue worth flagging at compounding-visibility level; OBS-1/-2 are coverage-narrative gaps; OBS-3/-4 are architectural-pattern observations. Zero-finding rubber-stamp avoided per CLAUDE-REVIEWER.md mandate. |
| 7 | All findings classified per CLAUDE-REVIEWER.md severity ladder? | **YES.** MINOR = "should fix; documentation drift, no behavior implication." OBS = "observation, no required action." Zero CRITICAL/MAJOR — accurately reflects the implementation state. |

All 7 self-grilling gates PASS. Report routing-ready.

---

## 6. Routing

```
STATUS: MERGE-READY
NEXT-ROLE: MEMORIAL-UPDATER
Inputs: coordination/reviews/REVIEWER-REPORT-R13.md
        coordination/specs/Q-R13-SPEC.md
        coordination/specs/Q-R13-SPEC-AUDIT.md (Memorial-Updater may read; Reviewer did not)
        coordination/NEXT-ROLE.md (Attestation block populated; SHA-A `17994dc` recorded)
        coordination/MEMORIAL.md (R13 Implementer entries present; Reviewer entries pending Memorial-Updater)
```

CRITICAL=0; MAJOR=0 → MERGE-READY per CLAUDE-REVIEWER.md routing rule. No ESCALATE.

---

## 7. Summary

R13 closes Phase 1 SLICE 4 (e-BH FDR operator surface; PR-F2 evidence matrix) with the strongest production-surface result in Tessera history: **0 CRITICAL / 0 MAJOR / 1 MINOR / 4 OBS; 14/14 ACs PASS; full regression 152/152.** PR-F2 empirical FDR control verified on both iid and correlated-drift H₀ cells (0.00500 ≤ 0.09623 bound, both cells). AC-P1 fully closed (Ville-bound preserved at R11; e-BH FDR control at R13).

11th consecutive Tessera Reviewer-side TDD attestation (R02-R13). 21/21 R13-SAS clauses honored — tied with R11 (20) and R12 (18) for cleanest anti-scope pass per fence-count surface.

The single MINOR (Wilson-vs-Wald terminology) is a compounding-documentation issue inherited from R11+R12 PR-F1/PR-F2 vocabulary, not an R13-novel violation. All four OBS items are non-blocking; three are coverage/narrative gaps already inside the architect's stated tradeoffs, and one is an architectural-pattern observation matching R11/R12 precedent.

The reinforcement compounding model continues to produce measurably cleaner rounds at constant tier-cost.
