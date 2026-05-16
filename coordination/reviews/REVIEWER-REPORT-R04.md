# REVIEWER-REPORT-R04 (Phase 1 SLICE 2b2 — Welford online statistics + R03 carry-forward closures)

_From: Reviewer (R04 pipeline run; cold audit per CLAUDE-REVIEWER.md)._
_To: Memorial Updater (then operator)._
_Date: 2026-05-16._
_Spec: `coordination/specs/Q-R04-SPEC.md` (v0.1) + `coordination/specs/Q-R04-SPEC-AUDIT.md` (v0.1)._
_HEAD at audit: `9e8304a` (chore: record attestation SHA in NEXT-ROLE.md); GREEN commit `7796f29`; RED commit `4468b5e`; pre-R04 baseline `2160b7e`._
_Tier: full (A2 + A4 + A7 per spec preamble; rubric verdict recorded in audit sidecar)._

---

## §0 — Pre-grilling reading manifest

Cold-read inputs (no diagnostics/, no logs/, no .prompt-*.md):

- `coordination/PRD.md` (full; 92 lines)
- `coordination/specs/Q-R04-SPEC.md` (full; 775 lines)
- `coordination/specs/Q-R04-SPEC-AUDIT.md` (full; 355 lines)
- `engine/per-shard/welford.ts` (full; 115 lines)
- `engine/per-shard/warm-start.ts` (full; 104 lines) — verified unchanged R03→R04 below
- `test/q04-welford-stats.test.ts` (full; 190 lines)
- `test/q03-warm-start-runtime.test.ts` (full; 194 lines) — Delta 3 audited inline
- `test/_substrate/factories.ts` (full; 78 lines) — verified unchanged R03→R04
- `coordination/NEXT-ROLE.md` (full; 56 lines)
- `~/.claude/CROSS-PROJECT-MEMORIAL.md` (Reviewer-section grep; recurring issue-class scan — self-confirming tests, AC-outrunning-pseudocode, file:line evidence rigor)

Reviewer-run binding commands (R06+ standing policy; independent of Implementer attestation):

- `git log --oneline -- engine/per-shard/welford.ts test/q04-welford-stats.test.ts test/q03-warm-start-runtime.test.ts` — RED `4468b5e` precedes GREEN `7796f29` (AC-14 ✓)
- `grep -n "^import" engine/per-shard/welford.ts` — exit 1, 0 matches (zero inherited imports ✓)
- `git diff 2160b7e..7796f29 -- engine/per-shard/warm-start.ts engine/types/config.ts package.json tsconfig.json tsconfig.test.json test/_substrate/factories.ts` — empty (anti-scope clean per R04-SAS-1/2/10/17 ✓)
- `npm run typecheck` — exit 0; clean output (AC-15 ✓)
- `node --test test/q04-welford-stats.test.js` — pass 11 / fail 0 (AC-17 ✓)
- `node --test test/q03-warm-start-runtime.test.js` — pass 13 / fail 0 (q03 unified post-Delta-3)
- `node --test test/q01-vendoring-coverage.test.js test/q01-no-at-pin-deltas.test.js test/q01-schema-additions.test.js test/q02-schema-extension.test.js test/betting-e-process-class-dispatch.test.js` — pass 20 / fail 0; per-file q01-vc=3, q01-no=1, q01-sa=5, q02-se=6, smoke=5 (AC-16 + AC-18 ✓)
- Total observed: 11 + 13 + 20 = 44 — matches Implementer attestation in NEXT-ROLE.md:35.

---

## §1 — Per-AC verification table

| AC | Criterion (short) | Status | Evidence (file:line / test name) |
|----|-------------------|--------|----------------------------------|
| AC-1 | `initialWelfordState(d)` zeros of correct shape | PASS | `test/q04-welford-stats.test.ts:58-63` "R04 AC-1 …"; impl `engine/per-shard/welford.ts:45-54`; runtime `pass` confirmed |
| AC-2 | first-sample (n=0→n=1) mean=sample, m2=zeros | PASS | `test/q04-welford-stats.test.ts:65-72` "R04 AC-2 …"; impl `welford.ts:69-89`; runtime `pass` (see also OBS-2 below) |
| AC-3 | second-sample (n=1→n=2) mean=[1,2], m2=[[2,4],[4,8]] | PASS | `test/q04-welford-stats.test.ts:74-82` "R04 AC-3 …"; impl `welford.ts:80-86`; closed-form hand-verified — Reviewer re-traced: deltaOld=[2,4], newMean=[1,2], deltaNew=[1,2] → M2 = [[2·1,2·2],[4·1,4·2]] = [[2,4],[4,8]] ✓ |
| AC-4 | Welford mean equals naive mean (n=10), err<1e-12 | PASS | `test/q04-welford-stats.test.ts:84-94` "R04 AC-4 …"; runtime `pass` |
| AC-5 | Welford sample cov equals naive two-pass (n=20), err<1e-10 | PASS | `test/q04-welford-stats.test.ts:96-111` "R04 AC-5 …"; runtime `pass` (see right-reasons audit §3.A) |
| AC-6 | Welford numerically stable on shifted data (1e8), err<1e-4 | PASS | `test/q04-welford-stats.test.ts:113-136` "R04 AC-6 …"; impl uses Welford recurrence at `welford.ts:80-86` rather than sum-of-squares; runtime `pass`. See OBS-3 for one-sided bound observation. |
| AC-7 | `welfordCovariance` returns null for n<2 | PASS | `test/q04-welford-stats.test.ts:138-142` "R04 AC-7 …"; impl `welford.ts:101-103`; runtime `pass` |
| AC-8 | sample-cov divisor (n−1): cov[0][0]≈82.5/9 AND ≠8.25 | PASS | `test/q04-welford-stats.test.ts:144-157` "R04 AC-8 …"; impl `welford.ts:106` (`divisor = state.n - 1`); bidirectional convention binding (see right-reasons audit §3.B) |
| AC-9 | `welfordMean` returns defensive copy | PASS | `test/q04-welford-stats.test.ts:159-166` "R04 AC-9 …"; impl `welford.ts:94-96` (`[...state.mean]`); runtime `pass`. (No analog test for `welfordCovariance` — see OBS-1.) |
| AC-10 | `updateWelford` throws on dimension mismatch | PASS | `test/q04-welford-stats.test.ts:168-173` "R04 AC-10 …"; impl `welford.ts:63-68`; three sub-cases (under-, over-, empty-) verified; runtime `pass` |
| AC-11 | `updateWelford` does not mutate input state | PASS | `test/q04-welford-stats.test.ts:175-190` "R04 AC-11 …"; impl `welford.ts:69-89` (fresh allocations for `deltaOld`, `newMean`, `newM2`; never writes to `state.*`); runtime `pass`. JSON-snapshot pre/post first AND second call. |
| AC-12 | Strict-tier seed-mismatch reset clears mean_vector + covariance | PASS | `test/q03-warm-start-runtime.test.ts:149-174` "R04 AC-12 …"; impl `engine/per-shard/warm-start.ts:77-88` (reset branch constructs fresh literal omitting mean_vector/covariance/mean_delta); load-bearing fixture sets `mean_vector: [1,2,3]` + `covariance: [[1,0,0],[0,1,0],[0,0,1]]`; runtime `pass`. Closes R03 OBS-2 (see right-reasons audit §3.C) |
| AC-13 | `observeSample` does not mutate input residual | PASS | `test/q03-warm-start-runtime.test.ts:177-193` "R04 AC-13 …"; impl `warm-start.ts:96-103` uses `{ ...current, … }` (object-spread, not in-place mutation); JSON-snapshot pre/post; runtime `pass`. Closes R03 MINOR-5. Covers only normal-increment branch (see OBS-4). |
| AC-14 | TDD ordering verifiable in git history | PASS | `git log --oneline` (Reviewer-run): `4468b5e` test(R04) RED precedes `7796f29` feat(R04) GREEN. `git show 4468b5e --stat`: only `test/q04-welford-stats.test.ts` (+190). `git show 7796f29 --stat`: `engine/per-shard/welford.ts` (+114) + `test/q03-warm-start-runtime.test.ts` (+69 / −2). Two-commit sequence as prescribed by Implementer note 4. |
| AC-15 | `npm run typecheck` exits clean | PASS | Reviewer ran `npm run typecheck` at HEAD `9e8304a` → exit 0, no errors, no warnings |
| AC-16 | All R01+R02+R03 tests still pass | PASS | Reviewer ran the five-file invocation: pass 20 / fail 0. Observed per-file counts (Implementer reports OBSERVED, no pre-stated counts per R03 MINOR-4 reinforcement): q01-vendoring-coverage=3, q01-no-at-pin-deltas=1, q01-schema-additions=5, q02-schema-extension=6, smoke=5. q03 grew 11→13 (AC-12 + AC-13 additions) — verified separately. |
| AC-17 | R04 q04 test file passes 11/0 | PASS | Reviewer ran `node --test test/q04-welford-stats.test.js` → tests 11, pass 11, fail 0, skipped 0, todo 0 |
| AC-18 | Smoke test passes | PASS | Reviewer ran `node --test test/betting-e-process-class-dispatch.test.js` → pass 5 / fail 0 (subset of AC-16 invocation) |

**Summary: 18/18 PASS. Zero FAIL. Zero PARTIAL.**

---

## §2 — Findings

### CRITICAL

(none)

### MAJOR

(none)

### MINOR

(none — all surfaced gaps are accepted-residual per spec and recorded as OBS.)

### OBS

**OBS-1 — `welfordCovariance` defensive-copy property is JSDoc-claimed but test-unbound.**
File: `engine/per-shard/welford.ts:100-103` (JSDoc "Returns a defensive deep copy.") + `engine/per-shard/welford.ts:107-113` (implementation does construct fresh d×d via `Array.from(...)` and pointwise division — defensive by construction).
Observation: AC-9 binds defensive-copy isolation for `welfordMean` (mutation of `m[0]` does not affect `state.mean[0]`); no analog AC verifies the same property for `welfordCovariance`. By inspection, the implementation cannot leak shared references — `cov[i]` is `new Array(d).fill(0)` then filled with primitive divisions of `state.m2[i][j]` — so the property holds by construction at HEAD `9e8304a`. Future regression to e.g. `return state.m2.slice()` (top-level slice; inner arrays still shared) would not be caught by any current test.
Severity: OBS, not MINOR — the property is currently load-bearing-by-construction; the architect noted on welfordCovariance JSDoc but did not bind it. The downstream consumer count is zero at R04 (R05 architect's call to decide whether to harden).
Recommended (non-binding): pick up alongside the R05 accumulator-strategy decision if `welfordCovariance` is composed into a hot caller; otherwise leave as accepted residual.

**OBS-2 — AC-2 m2-zeros assertion is tautological at n=1 (necessary but not discriminating).**
File: `test/q04-welford-stats.test.ts:65-72` (AC-2 test) + `engine/per-shard/welford.ts:80-86` (M2 update loop).
Observation: at n=1, the M2 update is `newM2[i][j] = 0 + deltaOld[i] * (sample[j] − newMean[j])` where `newMean[j] = 0 + (sample[j] − 0) / 1 = sample[j]`, so `(sample[j] − newMean[j]) = 0` always — and `newM2[i][j] = 0` for **any** first-sample input. AC-2's `m2 === [[0,0],[0,0]]` assertion would pass for any first sample, not specifically [5, 7]. AC-2 is not self-confirming (it does cross-check the mean assertion `mean === [5, 7]`, which IS discriminating), and AC-3 supplies the load-bearing M2 binding (closed-form [[2,4],[4,8]] is sensitive to formula bugs). The architect documented this corner case at spec P3.1 ("at n=1, the M2 contribution is (x − 0)(x − x) = 0").
Severity: OBS — coverage is layered correctly between AC-2 (mean at n=1) and AC-3 (M2 at n=2). No action required.

**OBS-3 — AC-6 numerical-stability test bounds Welford error one-sidedly.**
File: `test/q04-welford-stats.test.ts:113-136` (AC-6).
Observation: the test asserts `err < 1e-4` for Welford on shifted-data vs naive-on-recentered-data, but does NOT also assert that naive-on-shifted-data fails (i.e., `naiveErr > 1e-4` or similar). A bug in Welford that happened to also pass `err < 1e-4` (because at sample-magnitude 1e8 the naive-on-recentered baseline is exact and Welford has very small float-error budget) would still pass the test. The architect explicitly accepted this residual at spec OQ-4 ("implementing naive solely to assert it fails adds complexity for a property documented in Welford's literature"). Cross-check with AC-5 (Welford vs naive on well-conditioned sin/cos data, err<1e-10) limits the failure surface to "Welford-correct-on-small-data-but-wrong-on-shifted-data" — a narrow regime.
Severity: OBS — architect-acknowledged spec OQ-4 disposition; future-proofing improvement, not a current defect.

**OBS-4 — AC-13 covers only the normal-increment branch of `observeSample`.**
File: `test/q03-warm-start-runtime.test.ts:177-193` + `engine/per-shard/warm-start.ts:69-103`.
Observation: AC-13's fixture uses `before.residual_seed_hash === 'sha:a'` and `obs.residualSeedHash === 'sha:a'` → drives the normal-increment branch (`{ ...current, n_samples: newN, ... }` at lines 96-102). The seed-changed branch at lines 77-88 (which constructs a fresh literal, no `...current` spread) is not tested for input invariance. By code inspection, the seed-changed branch cannot mutate input (it never writes to `current`); the architect explicitly notes this in spec § Mechanism primitive 4 ("the seed-reset branch constructs a new object literal explicitly (no `...current` spread), so the obvious in-place-mutation regression isn't surface-applicable there"). A future change to the reset branch that introduced spread-based reuse would not be caught by AC-13.
Severity: OBS — architect-acknowledged residual; reset-branch immutability holds by construction at HEAD `9e8304a`.

**OBS-5 — JSDoc in `welford.ts` points readers to R03 audit sidecar for R05 sequencing context.**
File: `engine/per-shard/welford.ts:22-23` and `engine/per-shard/welford.ts:31-32` (twice).
Observation: the JSDoc refers readers to `Q-R03-SPEC-AUDIT.md § Q-R03 → Q-R04 sequencing context` for the accumulator-strategy decision space. That section does exist in the R03 sidecar (verified at `coordination/specs/Q-R03-SPEC-AUDIT.md:99`). However, the active R05 architectural-decision space is now restated more current and fully in `Q-R04-SPEC-AUDIT.md § Q-R04 → Q-R05 sequencing context` (the document the R05 architect will read first). The spec's per-file pseudocode (Q-R04-SPEC.md:156-158) prescribed the R03 reference and the Implementer faithfully matched it. A future reader's natural reference path is one step removed.
Severity: OBS — architect-spec-pseudocode authoring choice; the implementation matches spec verbatim. Pickup at next round that naturally touches `welford.ts`.

**OBS-6 — `welfordCovariance` JSDoc says "Returns a defensive deep copy"; implementation constructs fresh matrix from divisions, not a copy of `state.m2`.**
File: `engine/per-shard/welford.ts:100-103` (JSDoc) + `:107-113` (implementation).
Observation: the JSDoc wording "defensive deep copy" suggests a `structuredClone(state.m2)`-style operation, but the implementation never copies `state.m2` — it builds a fresh `cov[i][j] = state.m2[i][j] / divisor` matrix. Mutation isolation holds either way (the output shares no array references with `state.m2`), so the operational property is correct, but the wording could mislead a future reader into thinking the function would round-trip `state.m2` unchanged (it never does — division-by-(n−1) always applied).
Severity: OBS — wording-precision quibble; observable behavior is correct.

**OBS-7 — AC-11 final two assertions (`s1.n === 1`, `s1.mean === [1,2]`) are redundant given the first JSON-snapshot assertion.**
File: `test/q04-welford-stats.test.ts:181-190`.
Observation: AC-11 comment line 186-187 says "s1 must also not be mutated by the second update on s0 (catches shared-reference bugs between s1's internal arrays and s0's internal arrays)." However, if updateWelford incorrectly mutated state in place AND returned the mutated state (e.g. `state.n++; state.mean = sample; return state;`), then s1 === s0 and `s1.mean === s0.mean === [1, 2]` (mutated). The first snapshot assertion at line 181 (`JSON.stringify(s0) === snapshot0`) would already fail because `snapshot0` captured n=0/mean=[0,0]/m2=[[0,0],[0,0]] and post-mutation s0 has n=1/mean=[1,2]. The final two assertions add redundancy, not new coverage. Note: this strengthens AC-11 (more independently-checking assertions is fine); it is not a defect — just a discoverability comment.
Severity: OBS — comment-accuracy quibble; no action.

---

## §3 — Right-reasons audit (3 tests)

Three tests selected for adversarial spec-traceability + self-confirming-pattern audit. Each: (i) what spec requirement does it cover; (ii) does it pass because the code is correct, or because the test was written to confirm its own implementation?

### §3.A — AC-5 Welford-vs-naive cross-check (`test/q04-welford-stats.test.ts:96-111`)

**Spec requirement covered:** AC-5 (Q-R04-SPEC.md:590); F-1 (numerical-stability regression vs naive two-pass; Q-R04-SPEC.md:91 declines the broader form because well-conditioned data isn't the load-bearing regime — AC-6 handles that side). The test asserts Welford-computed covariance over 20 sin/cos samples matches naive two-pass within 1e-10 element-wise max.

**Self-confirming risk analysis:** This is the test with the highest a priori self-confirming risk in the R04 set. The Welford implementation (production at `engine/per-shard/welford.ts:80-86`) and the naive two-pass implementation (inline at `test/q04-welford-stats.test.ts:27-41`) are both implementations of the same statistic. If both had the same bug (e.g., off-by-one on the divisor, mis-keyed outer product, etc.), the cross-check would PASS while the production output was numerically wrong.

**Mitigation in place (verified):**
1. AC-3 (`test/q04-welford-stats.test.ts:74-82`) provides an INDEPENDENT closed-form binding: samples `[[0,0], [2,4]]` → mean=[1,2], M2=[[2,4],[4,8]]. The expected values are derivable from textbook formula application with no naive-implementation involvement. A Welford with a same-bug-as-naive (e.g., wrong divisor — but AC-3 tests m2 pre-division) would fail AC-3 if the M2 update formula were wrong.
2. AC-8 (`test/q04-welford-stats.test.ts:144-157`) provides an INDEPENDENT closed-form binding on the divisor: samples [0..9] → cov[0][0] = 82.5/9 ≈ 9.1666. The 82.5 numerator was hand-derivable from the formula (Reviewer re-verified: squared deviations [20.25, 12.25, 6.25, 2.25, 0.25, 0.25, 2.25, 6.25, 12.25, 20.25] sum to 82.5). The /9 vs /10 bidirectional bind catches divisor-convention bugs.
3. AC-6 (numerical stability) anchors a different failure regime — shifted data — and does NOT use the naive two-pass for the comparison side (uses naive-on-recentered as a numerically-clean reference). A "Welford with formula bug + naive with same bug" would fail AC-6 unless the bug happened to also be shift-invariant.

**Verdict:** AC-5 is potentially-self-confirming as a standalone test, but the layered defense (AC-3 closed-form + AC-8 closed-form + AC-6 different-regime) renders the layered binding adequate. Not a finding.

### §3.B — AC-8 sample-vs-population covariance convention (`test/q04-welford-stats.test.ts:144-157`)

**Spec requirement covered:** AC-8 (Q-R04-SPEC.md:596); F-2 (divisor convention error; Q-R04-SPEC.md:91); D2 (audit sidecar resolved decision — sample covariance n−1 divisor picked over population n).

**Spec traceability:** the test asserts `cov[0][0] ≈ 82.5 / 9` (n−1 = 9 sample-cov divisor) AND `cov[0][0] ≠ 8.25` (n = 10 population-cov divisor). Both numeric targets are hand-derivable from textbook formula: mean of [0..9] = 4.5; sum of squared deviations = 2·(0.25 + 2.25 + 6.25 + 12.25 + 20.25) = 2·41.25 = 82.5. Reviewer hand-verified.

**Self-confirming pattern check:** the test does NOT reuse any production code path to derive the expected values — `82.5 / 9` and `8.25` are literal numeric constants in the test file. The production `welfordCovariance` returns a value that is compared against externally-computed constants. There is no path by which a buggy Welford could co-vary with these constants. Not self-confirming.

**Defense surface:** if the production code were changed from `state.n - 1` (welford.ts:106) to `state.n` (population convention), the test would catch it via both assertions: `cov[0][0]` would equal 8.25 (not 9.166…), failing the first AND triggering the second's `> 0.5` not-equals threshold.

**Verdict:** Not self-confirming. Strong bidirectional convention binding.

### §3.C — AC-12 strict-tier seed-mismatch reset (`test/q03-warm-start-runtime.test.ts:149-174`)

**Spec requirement covered:** AC-12 (Q-R04-SPEC.md:604); R03 OBS-2 closure (Q-R03-SPEC explicit carry-forward); F-7 (strict-tier reset regression in observeSample — Q-R04-SPEC.md:96).

**Spec traceability:** the fixture establishes strict-tier sparse encoding (R02 convention: strict tier carries `mean_vector` + `covariance`; warm_start tier carries `mean_delta`). The test uses `makePerShardResidual({ n_samples: 200, confidence: 'strict', mean_vector: [1.0, 2.0, 3.0], covariance: [[1, 0, 0], [0, 1, 0], [0, 0, 1]], residual_seed_hash: 'sha:old', last_observed_at: 100 })`. After `observeSample(..., { residualSeedHash: 'sha:new' })`, the test asserts `mean_vector === undefined` AND `covariance === undefined`.

**Self-confirming pattern check:** the test does NOT call any production helper to derive the post-state. Expected values (`n_samples === 1`, `confidence === 'none'`, `mean_vector === undefined`, `covariance === undefined`, `residual_seed_hash === 'sha:new'`, `last_observed_at === 200`) are literal constants enumerated in the test. The production code at `engine/per-shard/warm-start.ts:77-88` constructs a fresh literal `{ n_samples: 1, confidence: 'none', residual_seed_hash: obs.residualSeedHash, last_observed_at: obs.observedAt }` omitting `mean_vector`/`covariance`/`mean_delta`.

**Load-bearing defense surface (the R03 OBS-2 closure rationale):** if the reset branch were regressed to spread-based form `{ ...current, n_samples: 1, confidence: 'none', residual_seed_hash: obs.residualSeedHash, last_observed_at: obs.observedAt }`, `current.mean_vector` and `current.covariance` would propagate into the output (they're populated in the fixture) — the assertions at q03 file lines 170-171 would catch this. The R03 AC-9 fixture (warm_start tier; mean_vector/covariance undefined in input) cannot distinguish spread-based from explicit-construction resets because the input doesn't populate those fields. AC-12 supplies the missing discrimination.

**Verdict:** Not self-confirming; load-bearing exactly as the spec carry-forward dispositions claim.

---

## §4 — Cross-cutting checks

### TDD discipline (Implementer note 4 prescription)

**Verified independently via `git log --oneline`:**

- `4468b5e` — `test(R04): RED commit — q04-welford-stats test skeleton`. `git show 4468b5e --stat`: `test/q04-welford-stats.test.ts | 190 +++…` (single file; 190 insertions). Commit message states: "Imports from ../engine/per-shard/welford which does not yet exist → tsc exits non-zero with TS2307." Reviewer-side cross-check: at `4468b5e`, no `engine/per-shard/welford.ts` exists in the working tree — verified by checking that the GREEN commit `7796f29` creates it (+114 insertions, fresh file).
- `7796f29` — `feat(R04): GREEN — Welford online stats module + R03 carry-forward closures`. `git show 7796f29 --stat`: 3 files, +181/-2. `engine/per-shard/welford.ts` created (+114); `test/q03-warm-start-runtime.test.ts` modified (+69/-2, additive plus header-comment edits); `test/q04-welford-stats.test.ts` NOT in this commit (already at RED `4468b5e`).

Two-commit RED-GREEN ordering as prescribed. AC-14 passes. **Fourth consecutive Tessera Reviewer-verified TDD round** (R02 = 1st, R03 = 2nd, R04 = 3rd — though spec audit claims 3rd; this is in fact the 3rd standalone Tessera-original TDD verification given R01 was the inherited-vendoring round; either count is defensible).

### No-skip / halt discipline

- No `.skip` / `it.todo` / `xfail` in any R04 test (grep would surface; manual scan of q04 and q03 files confirms).
- No DIAGNOSTIC files created during R04 (verified by `coordination/diagnostics/` directory state — but per cold-review boundary, Reviewer did not enter that directory; Implementer NEXT-ROLE.md "Escalation items: (none)" is the attested signal).
- No spec gaps where Implementer made design choices. The pseudocode is fully concrete; the open questions (OQ-1 through OQ-5) all carry "Implementer does not act on this in R04" architect notes. Verified by re-reading the q04 + welford.ts files: no defensive code paths that look like silent gap-filling.

### Anti-scope adherence

Verified independently via `git diff 2160b7e..7796f29 -- <SAS-fenced files>`:

| Anti-scope clause | Files | Diff result | Status |
|---|---|---|---|
| R04-SAS-1 | `engine/types/config.ts` | empty | ✓ |
| R04-SAS-2 | `engine/per-shard/warm-start.ts` | empty | ✓ |
| R04-SAS-10 | `tsconfig.json`, `tsconfig.test.json`, `package.json` | empty | ✓ |
| R04-SAS-11 | `tools/vendor-from-deploysignal.sh` | empty | ✓ |
| R04-SAS-12 | inherited vendored engine internals | (Reviewer spot-check `engine/core.ts`, `engine/detectors/family-c-rff.ts`) empty | ✓ |
| R04-SAS-17 | `test/_substrate/factories.ts` | empty | ✓ |
| R04-SAS-18 | `test/q01-*.test.ts`, `test/q02-*.test.ts` | empty | ✓ |
| R04-SAS-19 | `coordination/VENDORING-MANIFEST.md` | empty | ✓ |
| R04-SAS-20 | `coordination/PRD.md` | empty | ✓ |

No anti-scope violations. Surfaces of change: exactly 1 production CREATED + 1 test CREATED + 1 test MODIFIED-additively = 3 surfaces, as enumerated in spec § Component inventory + manifest cross-check.

### R03 carry-forward dispositions

- **R03 MINOR-1** (AC-9 vacuous assertion clarification): closed via Delta 3c (in-place clarifying comment above q03 line 104 test). Reviewer-verified at `test/q03-warm-start-runtime.test.ts:90-103` — 14-line prose comment present; AC-9 test name + assertions unchanged.
- **R03 MINOR-5** (immutability of `current` not bound by any test): closed via Delta 3b (AC-13 JSON-snapshot immutability test). Reviewer-verified at `test/q03-warm-start-runtime.test.ts:177-193`. The cited regression `current.n_samples++; return current;` would mutate `before.n_samples` from 30 to 31; `JSON.stringify(before)` would differ from `snapshot`; assertion at line 192 would fail. ✓ load-bearing closure.
- **R03 OBS-2** (no test bind for reset-from-`'strict'`): closed via Delta 3a (AC-12 strict-tier reset test). Reviewer-verified at `test/q03-warm-start-runtime.test.ts:149-174` (see §3.C above). ✓
- **R03 MINOR-2** (grep-pattern-soundness reinforcement): consumed at R04 spec-authoring time per architect's claim. Reviewer-verified that R04 spec contains NO grep-evidence ACs by scanning § Acceptance criteria 1-18 — none use `grep` as evidence. ✓
- **R03 MINOR-3** (re-export-chain-check reinforcement): consumed. Reviewer-verified via `grep -n "^import" engine/per-shard/welford.ts` → 0 matches; no re-export chain to verify. ✓
- **R03 MINOR-4** (empirically-verified test counts): consumed. AC-16 prose lists baseline counts as informational (per R03 Reviewer-verified at `e698c20`); does NOT pre-state post-R04 counts in an AC. Implementer NEXT-ROLE.md:33 reports OBSERVED counts. ✓
- **R03 OBS-1 / OBS-3 / OBS-4 / OBS-5**: explicitly deferred per R04-SAS-21. No R04 surface to repair. ✓

All 10 R03 findings dispositioned coherently.

---

## §5 — Pre-route grilling (on this report)

- **Q: Every finding has a file:line reference?** Yes. OBS-1 cites `welford.ts:100-103` + `:107-113`; OBS-2 cites `q04-welford-stats.test.ts:65-72` + `welford.ts:80-86`; OBS-3 cites `q04-welford-stats.test.ts:113-136`; OBS-4 cites `q03-warm-start-runtime.test.ts:177-193` + `warm-start.ts:69-103`; OBS-5 cites `welford.ts:22-23` + `:31-32`; OBS-6 cites `welford.ts:100-103` + `:107-113`; OBS-7 cites `q04-welford-stats.test.ts:181-190`.
- **Q: Any AC marked PASS without actual verification?** No. Every PASS row cites either (a) a directly-run test name (q04/q03), (b) a Reviewer-side binding command with observed output, or (c) a file:line implementation location. AC-14/AC-15/AC-16/AC-17/AC-18 are bound by Reviewer-run commands (not relied on Implementer attestation). AC-3 includes a Reviewer-side hand-re-trace of the closed-form M2.
- **Q: Right-reasons audit completed for 3+ tests?** Yes — AC-5, AC-8, AC-12. The AC-5 audit specifically surfaces the partial self-confirming risk and the layered defense closing it. None of the three found self-confirming.
- **Q: Cross-cutting checks complete?** Yes — TDD git-log evidence, no-skip/halt scan, anti-scope diff at 9 SAS clauses, all 10 R03 carry-forward dispositions verified.
- **Q: Cold-review boundary held?** Yes. Did NOT read `coordination/diagnostics/`, `coordination/logs/`, `coordination/.prompt-*.md`. Read PRD.md, both Q-R04 spec files, production source, test files, factories substrate, CROSS-PROJECT-MEMORIAL.md (Reviewer-section grep + sample reads), NEXT-ROLE.md, git log/diff/show, and ran independent binding commands.
- **Q: Adversarial mandate honored — assumed at least one mistake and looked hard?** Yes. Scanned for: divisor-convention errors (AC-8 closed-form bind catches), M2 update-formula symmetric-shortcut errors (Implementer note 2 explicitly forbids; impl uses West asymmetric form), shared-reference defensive-copy violations (AC-9 binds welfordMean; OBS-1 flags welfordCovariance not bound), in-place mutation regressions (AC-11 + AC-13 bind), strict-tier reset regressions (AC-12 binds), tautological assertions (OBS-2 flags AC-2's n=1 m2-zeros), one-sided numerical bounds (OBS-3 flags AC-6), uncovered branches (OBS-4 flags AC-13 normal-increment-only), spec-pseudocode-drift (OBS-5 flags JSDoc stale-pointer to R03 sidecar), wording-precision (OBS-6 flags "defensive deep copy" wording), redundant assertions (OBS-7 flags AC-11 tail). Seven OBS surfaced. Zero CRITICAL / MAJOR / MINOR — implementation is genuinely small + textbook + well-tested.

**Grilling: PASS.** Report is ready for routing.

---

## §6 — Routing

**Severity tally:** 0 CRITICAL + 0 MAJOR + 0 MINOR + 7 OBS.

**Routing rule:** CRITICAL exists → ESCALATE; else → MERGE-READY.

**Verdict: STATUS: MERGE-READY.**

Spec-side discipline (full tier per A2 + A4 + A7) was applied correctly: brainstorm enumerated 5 candidates and rejected 4 with explicit rationale; Skill 14 PRD-conjunction-cross-check caught Approach C's "fresh-init at strict entry" violation at brainstorm time; cross-section consistency pass executed 12 resolved-decision checks; carry-forward dispositions are coherent across MINOR/OBS/architect-reinforcement classes.

Implementation-side discipline (R04 GREEN at `7796f29`): hand-trace of the M2 update is correct (Reviewer re-verified Implementer note 5 manually); the M2 update uses the West asymmetric form (mean_old left, mean_new right) per Implementer note 2 — no shortcut to `deltaOld[i] * deltaOld[j]`; pure-function discipline holds (no in-place mutation of `state.*`); zero inherited imports verified by grep; all 44 tests pass; typecheck clean; TDD ordering verified in git log.

This is the third consecutive Tessera Reviewer round with 0 CRITICAL + 0 MAJOR (R02 + R03 + R04 streak). R04 is also the first Tessera round to ship at 0 MINOR — substrate is genuinely sound.

---

_Reviewer signature: this report covers the artifacts at HEAD `9e8304a` (chore commit including the routing/attestation chore series). The audit was conducted by independent file reads + independent binding-command execution; Implementer attestation in NEXT-ROLE.md was cross-referenced but not relied on as primary evidence for any AC._
