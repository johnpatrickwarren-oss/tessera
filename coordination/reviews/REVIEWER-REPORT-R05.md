# REVIEWER-REPORT-R05 — Tessera Phase 1 SLICE 2b3: Welford-into-PerShardResidual composition

_From: Reviewer (R05 pipeline run, cold-read)._
_To: Memorial Updater._
_Date: 2026-05-16._
_HEAD at audit: `8ad0fb2` (chore: record attestation SHA). GREEN HEAD: `8d724de`. RED HEAD: `43a5b00`._
_Spec: `coordination/specs/Q-R05-SPEC.md` (full). Audit sidecar: `coordination/specs/Q-R05-SPEC-AUDIT.md` (full, per CLAUDE-REVIEWER.md)._

---

## §0 Reading manifest (cold-review independence audit)

Permitted inputs consulted:
- `coordination/PRD.md` (full)
- `coordination/specs/Q-R05-SPEC.md` (full, via 2 offset reads)
- `coordination/specs/Q-R05-SPEC-AUDIT.md` (full)
- `coordination/NEXT-ROLE.md` (full)
- `coordination/MEMORIAL.md` (R05 section via offset read; tail through line 545)
- `engine/types/config.ts` (targeted lines 850–895 + grep of welford_state/WelfordState)
- `engine/per-shard/runtime.ts` (full, R05-CREATED)
- `engine/per-shard/welford.ts` (full, post-Delta 3)
- `engine/per-shard/warm-start.ts` (full, R03-shipped, unchanged at R05)
- `test/q05-per-shard-runtime.test.ts` (full, R05-CREATED)
- `test/_substrate/factories.ts` (full)
- `tsconfig.json` + `tsconfig.test.json` (full)
- `~/.claude/CROSS-PROJECT-MEMORIAL.md` (Reviewer section + tessera R02/R03/R04 entries via grep + offset reads)
- Git state via `git log --oneline -20`, `git show 43a5b00 --stat`, `git show 8d724de --stat`, `git diff aee274c..8d724de --stat`, `git diff aee274c..8d724de -- engine/types/config.ts`, `git diff aee274c..8d724de -- engine/per-shard/welford.ts`, `git ls-files engine/per-shard/runtime.ts test/q05-per-shard-runtime.test.ts`

NOT consulted (cold-review boundary preserved): `coordination/diagnostics/` (verified absent for R05 — no DIAGNOSTIC files); `coordination/logs/`; `.prompt-*.md`; prior-round reviewer reports beyond the AC-16 baseline cross-check fence (used `coordination/NEXT-ROLE.md` § Pre-R05 regression baseline as the cited source for 44-test pre-R05 count rather than re-opening REVIEWER-REPORT-R04.md).

Independent binding-command execution (4th consecutive Tessera Reviewer run): all 5 binding commands re-run by Reviewer at HEAD `8ad0fb2` (matches GREEN HEAD `8d724de` for source/test content); results recorded inline at AC-14–AC-19 rows.

---

## §1 Per-AC verification table

19 ACs in spec § Acceptance criteria; all evidence is Reviewer-run independent verification (no reliance on IMPLEMENTER attestation other than as cross-check).

| AC | Criterion (short) | Status | Evidence |
|---|---|---|---|
| AC-1 | Cold-start composition → merged residual literal | PASS | `test/q05-per-shard-runtime.test.ts:20-37` "R05 AC-1 …" passes (Reviewer-run `node --test`). Hand-trace re-verified: initialWelfordState(2) + updateWelford([3,5]) → {n:1, mean:[3,5], m2:[[0,0],[0,0]]} matches assertion. |
| AC-2 | Two-sample closed-form mean/m2 | PASS | `test/q05-per-shard-runtime.test.ts:40-58` "R05 AC-2 …" passes. Reviewer hand-traced: samples [[0,0],[2,4]] → mean=[1,2], m2=[[2,4],[4,8]] (R04 AC-3 closed-form). |
| AC-3 | n=19→20 transition + confidence='warm_start' + welford_state.n=20 | PASS | `test/q05-per-shard-runtime.test.ts:61-77` passes. (See OBS-1 re: vacuous m2 fixture; AC bind is the n+confidence transition, not m2 correctness.) |
| AC-4 | Baseline-refresh resets accumulator | PASS | `test/q05-per-shard-runtime.test.ts:80-105` passes. Asserts {n:1, mean:[7,9], m2:[[0,0],[0,0]]} after refresh + first sample under new seed; also asserts mean_delta cleared. |
| AC-5 | First-time-seed normal increment initializes accumulator | PASS | `test/q05-per-shard-runtime.test.ts:108-124` passes. d=3 fixture; asserts {n:1, mean:[4,6,8], m2:[[0,0,0],[0,0,0],[0,0,0]]}. |
| AC-6 | Stable-seed dimension mismatch throws /dimension mismatch/ | PASS | `test/q05-per-shard-runtime.test.ts:127-143` passes. `assert.throws(…, /dimension mismatch/)` binds the propagated message from `updateWelford` at `engine/per-shard/welford.ts:64-66`. |
| AC-7 | Input residual not mutated (JSON.stringify snapshot equality) | PASS | `test/q05-per-shard-runtime.test.ts:146-161` passes. Snapshot taken before discarded call; verified deep mutation would change JSON serialization. |
| AC-8 | welford_state populated across tier transitions (n=18→21, none→warm_start) | PASS | `test/q05-per-shard-runtime.test.ts:164-184` passes. (See OBS-1 re: vacuous m2 fixture.) |
| AC-9 | welford_state populated at strict tier (n=59→60) | PASS | `test/q05-per-shard-runtime.test.ts:187-204` passes. Binds welford_state present + n=60 + confidence='strict'. |
| AC-10 | welfordMean over composed updates returns [3,3] | PASS | `test/q05-per-shard-runtime.test.ts:207-220` passes. Samples [[1,1],[3,3],[5,5]]; mean externally hand-derivable. |
| AC-11 | welford_state survives JSON.parse(JSON.stringify(…)) round-trip | PASS | `test/q05-per-shard-runtime.test.ts:223-239` passes. `deepStrictEqual` on welford_state pre/post round-trip. |
| AC-12 | initialPerShardResidual() produces welford_state === undefined | PASS | `test/q05-per-shard-runtime.test.ts:242-245` passes. Cold-start contract preserved (R03 inheritance). |
| AC-13 | Direct observeSample → welford_state undefined (R03 contract preserved) | PASS | `test/q05-per-shard-runtime.test.ts:248-259` passes. (See MINOR-3 re: attestation discrepancy on dynamic-vs-top-level form.) |
| AC-14 | Two-commit TDD ordering (RED `test/q05…` before GREEN runtime.ts + Delta 1 + Delta 3) | PASS | `git log --oneline -- test/q05-per-shard-runtime.test.ts engine/per-shard/runtime.ts` → `8d724de` (GREEN) followed by `43a5b00` (RED — earlier). `git show 43a5b00 --stat` → only `test/q05-per-shard-runtime.test.ts` (+264). `git show 43a5b00 -- engine/per-shard/runtime.ts engine/types/config.ts engine/per-shard/welford.ts` → empty (no production code at RED). Genuine RED state. |
| AC-15 | `npm run typecheck` → exit 0 | PASS | Reviewer-run: `npm run typecheck` → exit 0, no output. |
| AC-16 | Pre-R05 test count regression check: 44 pass / 0 fail | PASS | Reviewer-run: `node --test q01-vendoring-coverage + q01-no-at-pin-deltas + q01-schema-additions + q02-schema-extension + q03-warm-start-runtime + q04-welford-stats + betting-e-process` → pass 44 / fail 0. Per-file: q01-vc=3, q01-no=1, q01-sa=5, q02=6, q03=13, q04=11, smoke=5 (matches NEXT-ROLE.md baseline exactly). |
| AC-17 | `node --test test/q05-per-shard-runtime.test.js` → 13/0 | PASS | Reviewer-run: pass 13 / fail 0. |
| AC-18 | `node --test test/betting-e-process-class-dispatch.test.js` → 5/0 | PASS | Reviewer-run: pass 5 / fail 0. |
| AC-19 | welford.ts JSDoc literal-content greps (Q-R03-SPEC-AUDIT.md → 0; engine/per-shard/runtime.ts → ≥1; updatePerShardResidual → ≥1) | PASS | Reviewer-run: `grep -c "Q-R03-SPEC-AUDIT.md" engine/per-shard/welford.ts` → 0. `grep -c "engine/per-shard/runtime.ts" engine/per-shard/welford.ts` → 2. `grep -c "updatePerShardResidual" engine/per-shard/welford.ts` → 2. All three conditions satisfied. |

**Score: 19/19 PASS, 0 PARTIAL, 0 FAIL.**

---

## §2 Findings

Adversarial mandate honored. 11 scan vectors applied (composition correctness; observeSample spread interactions; reset/normal-increment branch correctness; dimensionality enforcement boundary; immutability; serialization; tier-transition welford_state persistence; right-reasons audit; spec-internal consistency; attestation accuracy; anti-scope). 0 CRITICAL + 0 MAJOR. Findings below.

### MINOR-1 — Spec § Component inventory undercounts the in-file AC binding (Architect spec-internal inconsistency)

**Location:** `coordination/specs/Q-R05-SPEC.md:80` (Component inventory row for `test/q05-per-shard-runtime.test.ts`).

**What:** Component inventory says Delta 4 binds "AC-1 through AC-11 + AC-19 surfaces." Actual in-file binding is AC-1 through AC-13 (13 tests; the file has tests named "R05 AC-1 …" through "R05 AC-13 …"). Spec lines 321 (Per-file pseudocode docstring `// test/q05-per-shard-runtime.test.ts — R05 AC-1 through AC-13 + AC-19.`) and 715 (P3 ten-axis Coverage row `AC-1 through AC-13 + AC-17 against test/q05-per-shard-runtime.test.ts (13 in-file tests + 1 file-passes assertion)`) both correctly say AC-13. Component inventory contradicts the other two sites.

**Impact:** Implementer correctly followed the per-file pseudocode (AC-1 through AC-13) — actual file has the right tests. Discrepancy is spec-side, did not propagate into implementation. Reviewer cross-checked via three independent locations; only line 80 is wrong.

**Class:** Recurrence of the spec-prescription-vs-spec-prose drift pattern (R03 MINOR-4 — Architect's per-file test counts inconsistent with the source of truth). Cross-section consistency pass (15 row checks) did not catch this; the rows audit resolved-decision tokens but not in-spec arithmetic. Reinforcement candidate: add a "narrative-vs-pseudocode AC-count cross-check" gate before grilling sign-off.

**Disposition:** Architect spec hygiene item; non-blocking; SLICE 2b4+ disposition candidate.

### MINOR-2 — Dead-weight imports of WARM_START_THRESHOLD + STRICT_UPGRADE_THRESHOLD in q05 test

**Location:** `test/q05-per-shard-runtime.test.ts:13-15` (imports); usages: zero references in test bodies (`grep -nw "WARM_START_THRESHOLD\|STRICT_UPGRADE_THRESHOLD" test/q05-per-shard-runtime.test.ts` shows only one occurrence inside a `// below WARM_START_THRESHOLD` comment at line 57).

**What:** The test file imports `WARM_START_THRESHOLD` and `STRICT_UPGRADE_THRESHOLD` per the spec's Integration points §5 (the architect's prescribed import list). Neither constant is referenced from any executable expression — fixtures use hardcoded magic numbers `n_samples: 19` (AC-3), `n_samples: 18` (AC-8 walking to n=21), `n_samples: 59` (AC-9). The fixtures' transition assertions (`confidence: 'warm_start'` at n=20; `confidence: 'strict'` at n=60) implicitly assume the PRD AC-P2 literals 20 and 60 but do not name them via the imported constants.

**Impact:** `tsconfig.json` has `noUnusedLocals: false`, so dead imports do not fail typecheck. However: (a) the imports are noise — they read as if they're load-bearing; (b) if a future round changes WARM_START_THRESHOLD or STRICT_UPGRADE_THRESHOLD, the hardcoded fixtures would silently become stale relative to the threshold (the tests would still fail on the literal-tier assertion, but the diagnostic chain would not surface the threshold-vs-fixture relationship); (c) the spec's intent (per Integration points §5 listing them as imports) was probably to bind the fixtures against the constants — the implementer faithfully imported but did not consume.

**Class:** Test-hygiene / dead-import. Symmetric to OBS pattern from R03 OBS findings on import surfaces.

**Disposition:** Remove unused imports OR rewrite fixtures to derive from the constants (e.g., `n_samples: WARM_START_THRESHOLD - 1`). R06+ disposition candidate (q05 test surface naturally touched if/when threshold consumers expand).

### MINOR-3 — Implementer MEMORIAL CONFIRMATION attestation discrepancy (AC-13 import form)

**Location:** `coordination/MEMORIAL.md:515` (R05 IMPLEMENTER halt-discipline CONFIRMATION) vs `test/q05-per-shard-runtime.test.ts:251`.

**What:** IMPLEMENTER CONFIRMATION in MEMORIAL.md states: "AC-13 dynamic-vs-top-level import tactical choice resolved as top-level import (either form per spec note; functionally equivalent; selected top-level for idiomatic consistency with other test imports)." Actual implementation at line 251: `const { observeSample } = await import('../engine/per-shard/warm-start');` — this is the dynamic import form, not top-level. The top-level import statement at lines 11-15 imports `initialPerShardResidual`, `WARM_START_THRESHOLD`, `STRICT_UPGRADE_THRESHOLD` from warm-start but NOT `observeSample`.

**Impact:** Spec note explicitly allowed either form ("Implementer may use top-level import equivalently; either form satisfies AC-13"). AC-13 passes. The functional outcome is correct. The discrepancy is between the IMPLEMENTER's attestation in MEMORIAL.md (claims top-level) and what was committed (dynamic). This is an attestation-accuracy issue, not a correctness issue.

**Class:** Attestation-accuracy. Same root-cause class as R03 MINOR-4 (Implementer attested a count inconsistent with observed reality). One-round remediation (R04) did not address attestation accuracy on free-form tactical claims; this is the first such recurrence in narrative form.

**Disposition:** Memorial Updater should record this as a VIOLATION entry; Implementer-role discipline reinforcement candidate.

### OBS-1 — AC-3, AC-8, AC-9 use vacuous welford_state fixtures (mean=[0,0], m2=[[0,0],[0,0]], sample=[0,0])

**Location:** `test/q05-per-shard-runtime.test.ts:63-77` (AC-3); `test/q05-per-shard-runtime.test.ts:164-184` (AC-8); `test/q05-per-shard-runtime.test.ts:187-204` (AC-9).

**What:** All three tier-transition tests construct fixtures with zero-vector welford_state.mean and zero-matrix welford_state.m2, then apply zero-vector samples. Under the Welford recurrence, this is degenerate: deltaOld = sample - mean = [0,0] - [0,0] = [0,0]; newMean = mean + deltaOld/newN = [0,0]; newM2 = M2 + deltaOld ⊗ (sample - newMean) = [[0,0],[0,0]]. The post-state mean/m2 are unchanged from the fixture inputs. The tests bind only welford_state.n (the count increment) + the R03 state-machine confidence transition, not mean/m2 correctness.

**Impact:** Coverage of mean/m2 correctness across tier transitions is unbound. AC-2 covers mean/m2 correctness at cold-start with non-trivial values; tier-transition mean/m2 behavior is functionally identical (same updateWelford code path), so the gap is theoretical. A bug that miscomputed mean/m2 only at tier-transition boundaries (highly implausible — there is no tier-transition-specific code path in `updatePerShardResidual`) would not be caught by AC-3/8/9 but would be caught by AC-2-style assertions at higher n_samples. The architect pre-prediction explicitly flagged this as a likely Reviewer observation (audit sidecar §10 (a)).

**Disposition:** Non-blocking. Same finding class as R04 OBS-3 (numerical-stability one-sided test). Future tightening: parametrize AC-3/8/9 fixtures with non-trivial mean/m2 + non-zero samples, or add a dedicated "tier-transition does not affect Welford recurrence" test with hand-computed expectations.

### OBS-2 — No test exercises baseline-refresh combined with dimensionality change

**Location:** `test/q05-per-shard-runtime.test.ts:80-105` (AC-4: baseline-refresh, but new sample is d=2 matching the stale accumulator's d=2).

**What:** AC-4 exercises baseline-refresh with the new seed's first sample at d=2 (same dimensionality as the stale d=2 accumulator). The implicit semantic claim ("baseline-refresh resets the accumulator; the new sample's dimensionality establishes d afresh") would only be observably tested if the new sample had different dimensionality from the stale accumulator. A test where the stale accumulator was d=2 but the new-seed first sample is d=3 (or d=1) would directly bind the "new dimensionality is adopted on refresh" semantic. Currently this semantic is asserted only via the spec docstring on `ExtendedSampleObservation` (`engine/per-shard/runtime.ts:30-35`) and `accumulatorBase: WelfordState = … ? initialWelfordState(obs.sampleVector.length) : …` at `engine/per-shard/runtime.ts:83-86`.

**Impact:** A bug that, on baseline-refresh, initialized the new accumulator at the *stale* dimensionality rather than `obs.sampleVector.length` would not be caught by AC-4. updateWelford would either silently pass (if d matched coincidentally) or throw a misleading dimension-mismatch error. The implementation at runtime.ts line 85 (`initialWelfordState(obs.sampleVector.length)`) is provably correct via direct code reading.

**Disposition:** Non-blocking. Coverage gap; R06+ disposition candidate.

### OBS-3 — welford_state read-back: only welfordMean exercised; welfordCovariance unread

**Location:** `test/q05-per-shard-runtime.test.ts:16` (only `welfordMean` imported from welford); `welfordCovariance` not consumed anywhere in q05.

**What:** Architect pre-prediction (audit sidecar §10 (c)): "welford_state read-back coverage gap (only AC-10 reads welfordMean back; no test reads welfordCovariance back — same class as R04 OBS-1)." AC-10 reads `welfordMean(r.welford_state!)`; AC-11 deep-equals the welford_state object (not a derived covariance). No q05 test calls `welfordCovariance(residual.welford_state)` to verify the threaded covariance accumulator is internally consistent under composition.

**Impact:** Same class as R04 OBS-1 (welfordCovariance defensive-copy unbound). welfordCovariance's correctness at R04 is established by q04 AC-5/AC-7/AC-8; whether composition preserves welfordCovariance-readability under updatePerShardResidual is not directly bound at R05. R06 introduces the strict-tier covariance emission path (per audit sidecar § Q-R05 → Q-R06 sequencing) and will naturally bind welfordCovariance composition; until then, the read-back is unverified.

**Disposition:** Non-blocking. R06 will naturally close per Q-R06 scope.

### OBS-4 — AC-13 dynamic import form is unusual style

**Location:** `test/q05-per-shard-runtime.test.ts:251`.

**What:** `const { observeSample } = await import('../engine/per-shard/warm-start');` uses a dynamic import inside an async test body. Spec explicitly permitted either form ("Implementer may use top-level import equivalently"); the spec rationale (audit sidecar §10) was that dynamic import "emphasizes the runtime.ts ↔ warm-start.ts boundary." The dynamic form requires `async` on the test callback and incurs a runtime resolve cost (negligible in this test).

**Impact:** Test passes; readability slightly degraded vs top-level. Pairs with MINOR-3: implementer attested top-level but committed dynamic.

**Disposition:** Cosmetic. Move to top-level import for consistency, or keep as-is if the boundary-emphasis intent is the desired signal.

### OBS-5 — Implementer test-count attestation reports total inconsistent with stated baseline

**Location:** `coordination/MEMORIAL.md:519` (R05 IMPLEMENTER halt-discipline CONFIRMATION final sentence): "Pre-R05 test baseline 44 → post-R05 57 (44 + 13 q05) with 0 regressions."

**What:** The arithmetic 44 + 13 = 57 is correct. However, the post-R05 figure is reported only in the MEMORIAL — the NEXT-ROLE.md test summary breaks it into the pre-R05 baseline (44, AC-16) + the q05 file (13, AC-17) separately and does not aggregate. The MEMORIAL aggregate "57 total" is not a spec-bound figure (no AC requires the aggregate; AC-16 + AC-17 are independent counts). Minor.

**Impact:** No correctness implication; just notes that the aggregate is an Implementer-introduced figure not traceable to a spec AC.

**Disposition:** Non-blocking. Observation only.

---

## §3 Right-reasons audit (3 tests)

### Test A — AC-1 (cold-start composition)
- **Spec requirement traced:** AC-1 in Q-R05-SPEC.md § Acceptance criteria — "_Given_ initialPerShardResidual() and obs={observedAt:1000,residualSeedHash:'sha:a',sampleVector:[3,5]}, _when_ updatePerShardResidual(initial,obs) is called, _then_ the result equals {n_samples:1, confidence:'none', residual_seed_hash:'sha:a', last_observed_at:1000, welford_state:{n:1, mean:[3,5], m2:[[0,0],[0,0]]}} exactly."
- **Hand-mutation analysis:**
  - If `updatePerShardResidual` returned `current` verbatim → welford_state would be undefined; assertion `next.welford_state !== undefined` fails.
  - If `updatePerShardResidual` skipped the updateWelford call (returned `initialWelfordState(2)` only) → welford_state.mean = [0,0] not [3,5]; assertion fails.
  - If updatePerShardResidual passed `obs.sampleVector` as `obs` to observeSample (signature confusion) → typecheck would fail at runtime.ts compile.
- **Verdict:** PASS by correctness, not self-confirming. The literal post-state `{n:1, mean:[3,5], m2:[[0,0],[0,0]]}` is externally derived from R04 first-sample contract (q04 AC-1/AC-2 closed-form), not from re-implementing Welford in the test.

### Test B — AC-7 (immutability)
- **Spec requirement traced:** AC-7 in Q-R05-SPEC.md § Acceptance criteria — "_Given_ a residual before with populated n_samples/confidence/residual_seed_hash/welford_state, _when_ updatePerShardResidual(before,obs) is called and the return value is discarded, _then_ JSON.stringify(before) is unchanged across the call."
- **Hand-mutation analysis:**
  - If `updatePerShardResidual` mutated `current.n_samples` in place (e.g., `current.n_samples += 1` instead of returning a new object) → JSON.stringify(before).n_samples would change from 5 to 6; assertion fails.
  - If `updateWelford` mutated `state.mean` or `state.m2` in place → before.welford_state.mean / m2 would change; JSON.stringify(before) would differ; assertion fails.
  - If runtime.ts mutated `current.welford_state` to point to the new accumulator → JSON.stringify(before).welford_state would change; assertion fails.
- **Verdict:** PASS by correctness, not self-confirming. JSON.stringify is a structural deep-walk; the snapshot equality is a robust mutation detector that does not re-implement the production code.

### Test C — AC-10 (welfordMean read-back over composed updates)
- **Spec requirement traced:** AC-10 in Q-R05-SPEC.md § Acceptance criteria — "_Given_ a sequence of three samples [[1,1],[3,3],[5,5]] applied via updatePerShardResidual under stable seed, _when_ welfordMean(result.welford_state) is called, _then_ it returns [3,3] exactly."
- **Hand-mutation analysis:**
  - Mean of [[1,1],[3,3],[5,5]] = [(1+3+5)/3, (1+3+5)/3] = [3,3]. Externally derivable arithmetic mean; not Welford-derived from test code.
  - If `updateWelford` had an off-by-one bug (e.g., divided by n instead of newN) → mean drift; assertion fails.
  - If `updatePerShardResidual` discarded the threaded accumulator (re-initialized each call) → welford_state.n would be 1 (only last sample), mean=[5,5]; assertion fails.
  - If welfordMean returned a reference to state.mean instead of a copy → values would still be [3,3]; assertion passes but defensive-copy contract unbound (covered by q04 AC-9).
- **Verdict:** PASS by correctness, not self-confirming. The expected [3,3] is the externally-derivable arithmetic mean; the test exercises three independent things (threading, accumulation, read-back) with one literal assertion that fails on any of them.

---

## §4 Cross-cutting checks

**TDD discipline:** PASS. RED commit `43a5b00` precedes GREEN commit `8d724de`. `git show 43a5b00 --stat` shows only `test/q05-per-shard-runtime.test.ts` added (+264, single file). `git show 43a5b00 -- engine/per-shard/runtime.ts engine/types/config.ts engine/per-shard/welford.ts` is empty (no production code at RED). GREEN commit bundles runtime.ts (CREATED, +95) + config.ts Delta 1 (+18/-7) + welford.ts Delta 3 (+5/-6 ≈ JSDoc-only); bundling rationale documented in audit sidecar § TDD discipline (the schema delta and the consumer must land together because the test file imports from both). Genuine RED state: at the RED commit, `npm run typecheck` would fail with TS2307 (module not found) AND TS2353/TS2339 (welford_state not on PerShardResidual) — verified by the IMPLEMENTER attestation in commit `43a5b00` message + by Reviewer's hand-trace of the test file's imports against pre-R05 type surfaces. 5th consecutive Tessera Reviewer-side TDD verification (R02 + R03 + R04 + R05 + the inherited cross-project pattern); pattern fully established.

**No-skip / halt-discipline:** PASS. No `.skip` / `.todo` / `xfail` in q05 (verified via grep). No DIAGNOSTIC files in coordination/diagnostics/ for R05. No genuine HALT condition was unaddressed; the spec's pseudocode + Implementer notes + AC bindings left zero architectural ambiguity. The dynamic-vs-top-level AC-13 import was a tactical choice explicitly permitted by the spec note; the implementer picked dynamic (despite MEMORIAL stating top-level — see MINOR-3) and AC-13 passes either way.

**Anti-scope:** PASS. Git diff `aee274c..8d724de` touches exactly the 4 spec-prescribed surfaces: `engine/per-shard/runtime.ts` (CREATED), `engine/per-shard/welford.ts` (Delta 3 JSDoc-only, +5/-6), `engine/types/config.ts` (Delta 1, +18/-7), `test/q05-per-shard-runtime.test.ts` (CREATED, +264). Reviewer verified R05-SAS-2 (warm-start.ts untouched: `git diff aee274c..8d724de -- engine/per-shard/warm-start.ts` — empty), R05-SAS-12 (q01/q02/q03/q04 test files untouched: empty diffs), R05-SAS-14 (factories.ts untouched: empty diff), R05-SAS-11 (tsconfig.json / tsconfig.test.json / package.json untouched: empty diffs), R05-SAS-13 (no welfordCovariance defensive-copy test added; no other R04 OBS bundled), R05-SAS-15 (no inherited engine internals modified; runtime.ts has zero inherited imports). Compiled artifacts (`.js` files in engine/per-shard/ and test/) are tsc build outputs; not committed source (per `.gitignore` convention not verified explicitly but consistent with prior rounds). No new dependencies; no package.json delta.

**Cold-review boundary:** PASS. Reviewer did not consult coordination/diagnostics/ (verified empty for R05), coordination/logs/, or any .prompt-*.md file. Audit sidecar Q-R05-SPEC-AUDIT.md WAS consulted per CLAUDE-REVIEWER.md mandate (load-bearing for audit). REVIEWER-REPORT-R04.md was NOT re-opened; the 44-test pre-R05 baseline was sourced from coordination/NEXT-ROLE.md (which itself cites the AC-16 baseline) rather than re-reading the prior round's reviewer report.

**Architect-discipline reinforcement state (5-round trajectory):**
- Cross-section consistency pass (R01-derived): 5th consecutive Tessera application; 15 row checks executed; PASS-as-asserted by Architect. Reviewer spot-checked rows 1 (accumulator-strategy), 4 (function name), 7 (baseline-refresh-resets-accumulator), 13 (sparse-encoding NOT applied to welford_state) — all canonical surfaces match spec pseudocode + tests.
- Type-declaration-site discipline (R02-derived): 4th consecutive application; WelfordState at welford.ts:32 (architect cited :33 — off-by-one trivial), PerShardResidual at config.ts:868 (architect cited :860-880 — range matches), SampleObservation at warm-start.ts:26 (cited correctly). All declaration sites verified by Reviewer file reads.
- Re-export-chain-check discipline (R03-derived): 2nd application; WelfordState declared and exported at welford.ts:32 directly; no re-export chain. config.ts:25 import resolves cleanly; typecheck PASS.
- Grep-pattern-soundness discipline (R03-derived): 2nd application; AC-19 greps target JSDoc literal text intentionally (the comments ARE the verification target; not a false-positive class). Note 1's revised pattern `grep -nE "^\\s+welford_state\\?: " engine/types/config.ts` correctly excludes docstring matches.
- Empirically-verified-test-count discipline (R03-derived): 2nd application; AC-16 baseline (44) reported as OBSERVED counts by Implementer per spec direction; AC-17 (13) is structurally pre-determined.

---

## §5 Grilling output (on this report, pre-routing)

1. **Every finding has file:line evidence?** YES. MINOR-1 cites Q-R05-SPEC.md:80 + :321 + :715. MINOR-2 cites test/q05-per-shard-runtime.test.ts:13-15 + :57. MINOR-3 cites coordination/MEMORIAL.md:515 + test/q05-per-shard-runtime.test.ts:251. OBS-1 cites test/q05-per-shard-runtime.test.ts:63-77/164-184/187-204. OBS-2 cites test/q05-per-shard-runtime.test.ts:80-105 + engine/per-shard/runtime.ts:30-35/83-86. OBS-3 cites test/q05-per-shard-runtime.test.ts:16. OBS-4 cites test/q05-per-shard-runtime.test.ts:251. OBS-5 cites coordination/MEMORIAL.md:519. All findings have file:line references.

2. **Any AC marked PASS without actual verification?** NO. Each AC's evidence column cites either a specific test name (Reviewer-run pass) or a Reviewer-run binding command with the observed outcome. No "appears correct" rows.

3. **Right-reasons audit completed for 3+ tests?** YES. Test A (AC-1), Test B (AC-7), Test C (AC-10) audited with hand-mutation analysis for each; all three classified not self-confirming with reasoning.

4. **Adversarial mandate honored?** YES. 11 scan vectors applied; 3 MINORs + 5 OBSs surfaced. 0 CRITICAL + 0 MAJOR. The zero-findings-failed-audit risk is mitigated by MINOR-1 (spec-internal inconsistency caught by independent cross-section consistency check), MINOR-3 (attestation-vs-code discrepancy caught by independent code reading vs MEMORIAL reading), and OBS-1/2/3 (coverage-gap pattern at tier-transition vacuous fixtures + dimensionality-change-at-refresh + welfordCovariance unread).

5. **Cold-review boundary held?** YES. Diagnostics/, logs/, .prompt-*.md, REVIEWER-REPORT-R04.md not consulted. Audit sidecar consulted per CLAUDE-REVIEWER.md mandate.

6. **All 5 binding commands run independently by Reviewer?** YES. (1) `npm run typecheck` → exit 0; (2) `node --test test/q05*.js` → 13/0; (3) `node --test test/q01* test/q02* test/q03* test/q04* test/betting*` → 44/0; (4) `node --test test/betting-e-process-class-dispatch.test.js` → 5/0; (5) git history + grep verification for AC-14 + AC-19 → confirmed. 5th consecutive Tessera Reviewer-side independent binding-command execution.

**Grilling verdict: PASS.** Report is ready for Memorial Updater routing.

---

## §6 Architect pre-prediction grading

(Spec audit sidecar § Architect pre-predictions on outcomes; Reviewer grades observed vs predicted.)

| # | Prediction | Observed | Grade |
|---|---|---|---|
| 1 | All 19 ACs PASS at first IMPLEMENTER pass; no fix-cycle | 19/19 PASS; 0 fix-cycle | CORRECT |
| 2 | Zero halt conditions | Zero | CORRECT |
| 3 | TDD ordering verifiable via two-commit RED→GREEN | Verified at git log | CORRECT |
| 4 | Implementer Q-cycle ~2-3 hours | Not measurable from artifact; commit timestamps suggest ~3 min between RED and GREEN (consistent with mechanical composition) | UNVERIFIABLE-FROM-ARTIFACT |
| 5 | ≤2 MINOR + ≤4 OBS; 0 MAJOR + 0 CRITICAL; likely findings (a) AC-3 vacuous m2 (b) dynamic-vs-top-level import (c) welfordCovariance unread (d) welford_state JSDoc wording | 3 MINOR + 5 OBS; 0 MAJOR + 0 CRITICAL. (a) Predicted → OBS-1. (b) Predicted → OBS-4. (c) Predicted → OBS-3. (d) Not flagged (Reviewer judged JSDoc wording adequate). MINOR-1 spec-internal inconsistency was NOT pre-predicted. MINOR-3 attestation-vs-code discrepancy was NOT pre-predicted. | MOSTLY-CORRECT (3/4 specific predictions hit; 2 unpredicted MINORs surfaced) |
| 6 | 4 CONFIRMATIONs expected; no Memorial D violations | Memorial Updater's call; Reviewer surfaces 1 likely MEMORIAL VIOLATION class (MINOR-3 attestation-accuracy) + multiple CONFIRMATIONs | DEFERRED-TO-MEMORIAL-UPDATER |
| 7 | Session-crash risk low | No crash | CORRECT |
| 8 | R04 OBS-5 closure success | Delta 3 lands cleanly; AC-19 PASS | CORRECT |
| 9 | All 6 architect-discipline reinforcements applied + verifiable | Verified at §4 | CORRECT |
| 10 | R06 architect picks mean_delta + sparse-encoding-enforcement | Future round; non-falsifiable here | DEFERRED |
| 11 | welford_state naming divergence flagged | Reviewer did not flag — snake_case is internally consistent with PerShardResidual convention; pre-emptive defense in spec text was sufficient | CORRECT |
| 12 | Module-path divergence flagged | Reviewer did not flag — `runtime.ts` is more concise than `per-shard-runtime.ts`; pre-emptive defense sufficient | CORRECT |

**Grading verdict:** 7/9 verifiable predictions CORRECT; 1 MOSTLY-CORRECT (predicted findings hit, but unpredicted MINORs surfaced); 1 UNVERIFIABLE-FROM-ARTIFACT. No prediction was WRONG. Architect pre-prediction discipline at high accuracy; the two unpredicted MINORs (spec-internal AC-count drift; attestation-vs-code discrepancy) are reinforcement-candidate classes worth flagging for R06+ pre-emit grilling.

---

## §7 Routing

**Verdict:** MERGE-READY.

0 CRITICAL + 0 MAJOR + 3 MINOR + 5 OBS. All 19 ACs PASS. TDD ordering verified. Anti-scope clean (4 surfaces touched, all spec-prescribed). Cold-review boundary held. All 5 binding commands independently re-run by Reviewer.

The 3 MINORs are non-blocking:
- MINOR-1 is spec-side (Architect Component inventory undercount); implementation followed the correct per-file pseudocode.
- MINOR-2 is test-hygiene (dead imports); zero functional impact.
- MINOR-3 is attestation-accuracy (MEMORIAL CONFIRMATION inconsistent with committed code); zero functional impact.

The 5 OBSs are coverage-gap notes for R06+ disposition. No correctness regressions. R05 implementation substrate is sound and matches spec-prescribed semantics.

**STATUS: MERGE-READY → Memorial Updater.**

---

_End of REVIEWER-REPORT-R05.md._
