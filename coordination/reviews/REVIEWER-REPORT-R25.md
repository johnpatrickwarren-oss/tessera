# REVIEWER-REPORT-R25 — Phase 2 SLICE 3.A.5 (L0 contract for Tessera)

**Round:** R25 (full tier — Architect + Implementer + Reviewer + Memorial-Updater)
**Cluster:** `wu-00-l0-contract` (Wave 1)
**Branch:** `cluster/wu-00-l0-contract-R25`
**Baseline SHA:** `ada602b` · **chore-A SHA:** `e6ff18a` · **HEAD:** `6a07b1a`
**Spec:** `coordination/specs/Q-R25-SPEC.md` (1096 lines, single commit `4d9783b`; never amended)
**Routing verdict:** `STATUS: MERGE-READY` (no CRITICAL; 3 MAJOR + 3 MINOR + 2 OBS).

---

## § 1 Inputs read (cold-review boundary attested)

- `coordination/PRD.md` (full)
- `coordination/specs/Q-R25-SPEC.md` (full — chunked reads, all 1096 lines covered)
- `coordination/NEXT-ROLE.md` (full — Implementer attestation + operator disposition block)
- `engine/l0/counter-rate-transform.ts` (full)
- `engine/l0/schema-continuity.ts` (lines 35-58; READ-ONLY consumer verification)
- `engine/core.ts` (lines 1-120; TrendBuffer surface verification)
- `test/q25-l0-contract.test.ts` (full — 204 lines including AC-R25-15)
- `test/_substrate/synthetic-counter-generator.ts` (full)
- `~/.claude/CROSS-PROJECT-MEMORIAL.md` (Reviewer section sweep via grep + head reads)
- `git log` / `git show --stat` / `git diff ada602b..e6ff18a --name-only` (audit trail)

**NOT read** (cold-review independence preserved):
- `coordination/diagnostics/DIAGNOSTIC-R25-ac12-tolerance.md`
- `coordination/specs/Q-R25-SPEC-AUDIT.md`
- `coordination/logs/*`
- `coordination/.prompt-*.md`
- Prior-round Reviewer reports (R23, R24)
- `coordination/MEMORIAL.md` content (only structural existence verified via `ls`)

Reviewer-run binding commands:
- `npx tsc -p tsconfig.test.json` → **EXIT 0** (independently re-run)
- `node --test test/*.test.js` → **tests=230 / pass=229 / fail=1** (q01 AC-7 env; consistent with Implementer's attestation accounting for +1 from chore-B AC-R25-15)
- `grep -n "^test(" test/q25-l0-contract.test.ts` → line numbers match NEXT-ROLE.md attestation exactly
- `git diff ada602b..e6ff18a --name-only` → 8 paths

---

## § 2 Per-AC verification table

| AC-ID | Criterion (short) | Status | Evidence (file:line / command / value) |
|---|---|---|---|
| AC-R25-1 | counter clean-increase → delta/elapsed, normal slope_quality | **PASS** | `test/q25-l0-contract.test.ts:33-44` runs green; expected value 10 = (200-100)/10 verified independently; impl path `engine/l0/counter-rate-transform.ts:146-156` |
| AC-R25-2 | gauge pass-through (value-domain) | **PASS** | `test/q25-l0-contract.test.ts:47-56` runs green; assertion `out.value === next.value` (=1010) confirmed via impl path `engine/l0/counter-rate-transform.ts:107-115`. *Coverage gap noted below as MINOR-3.* |
| AC-R25-3 | missed-scrape → degraded + missed_scrape_inferred | **PASS** | `test/q25-l0-contract.test.ts:59-69` runs green; interval=2.0 exceeds 1.5 threshold per `transformPair:103`; impl produces `slope_quality='degraded'` (line 104) |
| AC-R25-4 | 32-bit wrap → corrected rate via (UINT32_MOD − prev + next) / elapsed | **PASS** | `test/q25-l0-contract.test.ts:72-81` runs green; expected_rate 94_967_346 = 4_294_967_296 − 4_200_000_000 + 50 verified arithmetically; impl `engine/l0/counter-rate-transform.ts:123-134` |
| AC-R25-5 | 64-bit width with decreasing → reset (not wrap) | **PASS** | `test/q25-l0-contract.test.ts:84-92` runs green; width gate at impl `engine/l0/counter-rate-transform.ts:124` (`width === 32`) forces reset path lines 137-144 |
| AC-R25-6 | prev below wrap threshold → reset path | **PASS** | `test/q25-l0-contract.test.ts:95-103` runs green; threshold `prev.value > 0.9 × UINT32_MAX` (impl line 123-124) is false for prev=5000; falls through to reset (lines 137-144) |
| AC-R25-7 | structural exhaustiveness — all 4 flags emitted on every output | **PASS** | `test/q25-l0-contract.test.ts:106-121` runs green across 4 case-classes (clean/wrap/reset/gauge); every code path in impl returns full `RateSample` shape (lines 108-115, 126-133, 137-144, 149-156) |
| AC-R25-8 | makeCleanPair default shape deterministic | **PASS** | `test/q25-l0-contract.test.ts:124-130` runs green; substrate defaults `engine/l0/.../synthetic-counter-generator.ts:17-20` (1_700_000_000 / 1000 / 1.0 / 10) produce next={1010, 1_700_000_001} as asserted |
| AC-R25-9 | makeMissedScrapePair crosses jitter threshold | **PASS** | `test/q25-l0-contract.test.ts:133-138` runs green; substrate `synthetic-counter-generator.ts:40-51` produces interval=2.0 > 1.5 |
| AC-R25-10 | makeWrap32Pair places prev above 0.9 × UINT32_MAX | **PASS** | `test/q25-l0-contract.test.ts:141-145` runs green; substrate sets `prev.value=4_200_000_000` > 3_865_470_565.5 |
| AC-R25-11 | makeResetPair places prev below threshold AND next<prev | **PASS** | `test/q25-l0-contract.test.ts:148-152` runs green; substrate sets `prev.value=5000, next.value=10` |
| AC-R25-12 | TrendBuffer integration — variable-interval mean≈10, slopeNorm≈0 | **PARTIAL** | `test/q25-l0-contract.test.ts:155-175` runs green AT OPERATOR-DISPOSITIONED TOLERANCE (0.001/0.01 per § 1.8). Spec § 4.3/§ 5.1 still prescribe 1e-9 (empirically infeasible). Spec NOT amended. See MAJOR-3. |
| AC-R25-13 | typecheck EXIT 0 | **PASS** | Reviewer-run `npx tsc -p tsconfig.test.json` → EXIT 0 with no diagnostics emitted |
| AC-R25-14 | tests=229 / pass=229 / fail=0 at chore-A SHA | **FAIL** | Reviewer-derived count at chore-A SHA `e6ff18a` matches Implementer's attestation: `tests=229 / pass=228 / fail=1` (q01 AC-7 env). Spec wording requires `fail=0`. Operator authority cited as override but spec never amended. See MAJOR-1. |
| AC-R25-15 | chore-A diff path-set ⊆ allowed-set | **PARTIAL** | Runtime test `test/q25-l0-contract.test.ts:184-203` runs green AT EXPANDED 8-ENTRY ALLOWED-SET. Spec § 3 prescribes 7 entries (§ 3 ne § 4.6, both consistent with each other at 7). Test enforces 8 (adds `coordination/diagnostics/DIAGNOSTIC-R25-ac12-tolerance.md`). Spec NOT amended. See MAJOR-2. |

**Summary:** 12 PASS · 1 FAIL · 2 PARTIAL. The implementation is functionally correct against the operator-directed semantics; the failures and partials are spec/implementation drift, not transform logic defects.

---

## § 3 Findings

### MAJOR-1 — AC-R25-14 binding-command attestation does not satisfy spec wording (`fail=0` required; `fail=1` actual). Spec NOT amended.

**Location:** `coordination/specs/Q-R25-SPEC.md` § 5.1 row AC-R25-14 (literal "tests=229 / pass=229 / fail=0"); `coordination/NEXT-ROLE.md:13` ("tests=229, pass=228, fail=1").

**Why a finding:** AC-R25-14 is a **binding-command attestation** AC. Spec § 5.1 wording is unambiguous (`fail=0`). At chore-A SHA `e6ff18a` the actual `node --test` output is `pass=228 fail=1`, because the q01 AC-7 `should fail when verdict.ts byte-identity broken` test fails environmentally (cluster worktree at `~/projects/tessera-clusters/wu-00-l0-contract` lacks the `../deploysignal` sibling). Operator dispositioned this as "MERGE-READY with documented pre-existing" (NEXT-ROLE.md:44-56), but the spec § 5.1 AC-R25-14 row was never amended to reflect the operator-acknowledged baseline. The audit trail therefore contains a spec literal (`fail=0`) that the attestation literal (`fail=1`) does not satisfy.

**Why this matters:** AC-R25-14 is the project's chore-A-SHA-anchored test-count attestation pattern (R22 IMPL MINOR-1 reinforcement). The exact-wording requirement is the discipline's force; "literal A but operator said B is OK" defeats the gate's purpose. A future Reviewer or Memorial Updater reading just spec + git history would see an unsatisfied AC literal with no in-artifact reconciliation.

**Source of defect:** Architect (spec § 9.1 claim 6 cited R23 testimony of 217/0 without empirically running `node --test` in the cluster worktree at session start; the multi-cluster methodology friction was not anticipated). The Implementer correctly halted the spec's 1e-9 issue but did NOT halt for scenario (b) "Baseline test count differs from 217" — they treated 217 as count-equal, ignoring that pass-count differs from 217.

**Right fix (Reviewer does NOT apply):** Architect amends Q-R25-SPEC.md § 5.1 AC-R25-14 row to read `tests=229 / pass=228 / fail=1` (with the pre-existing q01 AC-7 environmental fail acknowledged in spec § 9.1 claim 6) and adds a reconciliation note in § 7.1 scenario (b).

---

### MAJOR-2 — Spec § 3 allowed-set drift: spec prescribes 7 entries; test enforces 8. Spec NOT amended.

**Location:** `coordination/specs/Q-R25-SPEC.md` § 3 (lines 254-270, "Allowed-set (7 entries)"); § 4.6 (lines 783-799, `ALLOWED_SET` literal — 7 entries); § 9.6 cross-section consistency table (line 1014, "Allowed-set size 7 | YES"); § 9.7 gitignore-audit table (lines 1037-1044, 7 rows). `test/q25-l0-contract.test.ts:187-197` (8 entries — 7 from spec + `coordination/diagnostics/DIAGNOSTIC-R25-ac12-tolerance.md`).

**Why a finding:** The AC-R25-15 anti-scope runtime test is the round's forward-protection gate. It asserts membership of every chore-A-diff path in `ALLOWED_SET`. The spec defines `ALLOWED_SET` at 7 paths in three structural sites (§ 3, § 4.6, § 9.7), with the consistency check at § 9.6 explicitly asserting "7 entries each". The test ships 8. This is a structural test-vs-spec divergence that the AC-R25-15 forward-protection mechanism cannot itself catch (the test reads its own literal).

The empirical cause: the legitimate HALT at commit `4f405c0` (ESCALATE-R25-01) committed `coordination/diagnostics/DIAGNOSTIC-R25-ac12-tolerance.md` between baseline `ada602b` and chore-A `e6ff18a`. Spec § 9.10 reasoning ("DIAGNOSTIC files are coordination-tier and outside the chore-A diff scope (they would be created and committed in a separate route-back commit if a halt fires)") was **empirically wrong** — the HALT commit IS in the chore-A diff range when it occurs mid-round. The spec's allowed-set should have anticipated this either by (a) listing `coordination/diagnostics/DIAGNOSTIC-R25-*.md` as a conditional 8th entry, or (b) requiring the Implementer to amend the spec § 3 list before chore-B if a HALT fired.

**Why this matters:** Anti-scope SHA-pinned diff ACs are the project's headline forward-protection pattern (R20/R21/R22/R23 precedent). The point of locking spec → test ALLOWED_SET is to prevent the Implementer from silently broadening anti-scope. Allowing the test to ship a unilateral 8th entry — even with chore-B+ commit-message justification — sets the precedent that the test can drift from spec under "operator resume directive" rationale without spec amendment. Per CLAUDE-COMMON.md REINFORCED 2026-05-17, "audit-trail inaccuracy" from role-authored self-justification is itself a violation; this is the structural analog at the spec/test boundary.

**Source of defect:** Architect § 9.10 reasoning was wrong; Implementer applied a tactical expansion (test/q25-l0-contract.test.ts:178-183 inline comment) instead of HALTing for spec amendment.

**Right fix (Reviewer does NOT apply):** Architect amends Q-R25-SPEC.md § 3 to add the 8th entry (or the conditional rule) and updates § 4.6, § 9.6, § 9.7, § 9.10 in lockstep.

---

### MAJOR-3 — Spec internal contradiction (§ 1.8 vs § 4.3/§ 5.1) on AC-R25-12 tolerance persists at HEAD. Implementation matches § 1.8; § 4.3 and § 5.1 still prescribe 1e-9 (empirically infeasible).

**Location:** `coordination/specs/Q-R25-SPEC.md` § 1.8 line 210 ("`Math.abs(snap.mean - 10) < 0.001` ... `Math.abs(snap.slopeNorm) < 0.01`") vs § 4.3 line 752 ("`Math.abs(snap.mean - 10) < 1e-9`") and § 5.1 AC-R25-12 row line 839 ("to 1e-9 tolerance — exact arithmetic on synthetic data"). `test/q25-l0-contract.test.ts:173-174` ships 0.001/0.01 (matches § 1.8).

**Why a finding:** This is a classic R20 ARCH MINOR-1 "preamble-vs-prescription" contradiction — three independent sections of the same spec assert mutually incompatible tolerances. The Implementer correctly HALTed (commit `4f405c0`) under spec § 7.1 scenario (c). Operator dispositioned Option A (use § 1.8) and the test now matches. **But the spec at HEAD still contains the contradiction.** § 4.3 GREEN pseudocode and § 5.1 AC-R25-12 row both still prescribe 1e-9, which the test no longer matches. Future Reviewer/Memorial-Updater readers will see the same contradiction the Implementer halted on — and the resolution is buried in commit messages + NEXT-ROLE.md, not in the spec audit trail.

**Why this matters:** The spec is the load-bearing audit-trail artifact. A future reader (R26+ ingestion-adapter Architect, Wave 2 Reviewer, etc.) consulting Q-R25-SPEC.md as the L0-contract reference will encounter the original 1e-9 prescription and either (a) propagate the wrong tolerance into Wave 2 work, or (b) re-derive the disposition from scratch. The R20 ARCH MINOR-1 reinforcement exists precisely to prevent this class of drift.

**Source of defect:** Architect (original spec contained internal contradiction). The disposition path was correctly followed; the spec-amendment-post-disposition step was skipped.

**Right fix (Reviewer does NOT apply):** Architect amends Q-R25-SPEC.md § 4.3 line 752 and § 5.1 AC-R25-12 row (line 839) to match § 1.8 (0.001 / 0.01), with a § 9.x audit-trail note pointing to ESCALATE-R25-01 + operator disposition.

---

### MINOR-1 — Spec § 9.1 claim 6 ("Baseline test count = 217 / 0") was not empirically verified in the cluster worktree environment.

**Location:** `coordination/specs/Q-R25-SPEC.md` § 9.1 claim 6 (line 938): "Baseline test count = 217 / 0. R23 Reviewer attestation in CROSS-PROJECT-MEMORIAL.md tessera-R23 section confirms 217 at chore-A `d2286b2`..."

**Why a finding:** The Architect's verification was "git log --oneline -- test/ returning only pre-R23 commits as most recent" — i.e., verifying no test-file changes since R23. That confirms total = 217 but does NOT confirm pass/fail status. The cluster worktree is structurally different from the main tessera repo (no `../deploysignal` sibling), so q01 AC-7 was always going to fail in the cluster — discoverable in seconds via `node --test`. The Architect's § 9.7 claim ("All 15 numbered claims in § 9.1 verified by direct file-open or empirical command at session start") is therefore false for claim 6 (no `node --test` was run; only git log).

This is the root cause of MAJOR-1 (the AC-R25-14 wording defect). The spec encoded an empirically-stale R23 attestation as a current-state claim.

**Source of defect:** Architect.

---

### MINOR-2 — Branch-binding coverage gap: the `width = meta.counter_width ?? 64` default fallback in the counter arm is not bound by any AC.

**Location:** `engine/l0/counter-rate-transform.ts:119` (`const width = meta.counter_width ?? 64;`). Spec § 4.1 branch-binding table (line 460): "Default counter_width fallback (`meta.counter_width` absent) | AC-R25-2 (gauge has no counter_width) | AC-R25-2".

**Why a finding:** The spec § 9.13 closes with "All 10 enumerated branches/conditions in `transformPair` have ≥ 1 binding AC; structural exhaustiveness ... R21 MINOR-2/3 class of issue NOT present." This is **wrong**. AC-R25-2 uses `semantic_type: 'gauge'`, which routes to the non-counter pass-through branch at impl line 107-115. That branch returns BEFORE reaching line 119 where the `?? 64` default is evaluated. AC-R25-2 therefore does NOT exercise the counter-arm width-default fallback.

Empirical verification of the gap: if line 119 were mutated to `const width = meta.counter_width;` (removing the `?? 64`), `width` becomes `undefined` for counter cases that omit `counter_width`. Every AC that touches the counter arm (AC-R25-1, 3, 4, 5, 6, 7-counter cases, 12) passes `counter_width` explicitly, so this mutation would fail no test. The R21 ARCH MINOR-2/3 reinforcement (every guard must have a structurally-exercising AC) is violated.

**Why this matters:** The R21 reinforcement exists because branch-uncovered defaults are exactly the class of code that drifts. A future caller using `transformPair(prev, next, { semantic_type: 'counter' }, opts)` (no counter_width) depends on the `?? 64` default; the test suite cannot catch its removal.

**Source of defect:** Architect (branch-binding table assertion at § 4.1 line 460 is empirically wrong).

**Right fix (Reviewer does NOT apply):** Add a binding AC that calls `transformPair(prev, next, { semantic_type: 'counter' }, opts)` with `prev.value > next.value` and verifies `reset_detected === true` (the default-64 path), OR strengthen AC-R25-1 to omit `counter_width` to exercise the default.

---

### MINOR-3 — AC-R25-2 (gauge pass-through) does not exercise gauge + missed_scrape; flag-propagation through pass-through is only structurally confirmed at AC-R25-7.

**Location:** `test/q25-l0-contract.test.ts:47-56`. Spec § 1.6 prescribes "the missed-scrape semantic is interval-driven, not type-driven — so degraded flag applies for non-counter signals too". Impl `engine/l0/counter-rate-transform.ts:107-115` returns `slope_quality` (the variable computed at line 104, which CAN be `'degraded'`) on the pass-through path.

**Why a finding:** AC-R25-2 uses `makeCleanPair()` (interval=1.0) with `expected_scrape_interval_seconds: 1.0`. That can only ever produce `slope_quality: 'normal'`. The spec's invariant 1 + § 1.6 claim that "gauges flag degraded for missed-scrape intervals" is not bound. AC-R25-7 confirms structural type-shape (string is `'normal' | 'degraded'`) but never observes a `'degraded'` gauge case. Removing line 111 (`slope_quality,`) and hardcoding `slope_quality: 'normal'` on the pass-through return would fail no test.

**Source of defect:** Architect (AC scope omission).

---

### OBS-1 — chore-B+ commit `6a07b1a` is a third coordination chore commit beyond the spec's anticipated chore-A / chore-B sequence.

**Location:** `git log --oneline ada602b..HEAD` → 4 chore-class commits (RED, HALT, DISP, GREEN, chore-A, chore-B, chore-B+). Spec § 4.7 anticipated `chore-A` + `chore-B` only (lines 762-808). Commit `6a07b1a` "MEMORIAL — chore-B confirmations (allowed-set expansion)" is an ad-hoc 3rd chore commit appending Memorial entries after chore-B.

**Observation only:** the commit modifies only `coordination/MEMORIAL.md` (in allowed-set since chore-A); no anti-scope violation. But the spec's chore-sequence prescription is structurally incomplete — Memorial accretion after chore-B is not anticipated. Future rounds should either combine into chore-B or have spec explicitly anticipate chore-B+ memorial commits.

---

### OBS-2 — TrendBuffer windowSize=20 in AC-R25-12 is unmotivated; 10 would have sufficed for 10 pushes.

**Location:** `test/q25-l0-contract.test.ts:162` (`new TrendBuffer(20)`).

**Observation only:** Spec § 1.8 step 2 prescribes "window size 20, generous enough to hold all 10 transformed rates". Functionally fine. With windowSize=10 (default), the test would still produce the same snapshot (10 pushes, 10 values, no shift). The "20" feels like a defensive over-spec; mention only for cleanliness.

---

## § 4 Right-reasons audit (3 tests)

**Test A: AC-R25-1 (counter clean-increase)** — `test/q25-l0-contract.test.ts:33-44`

- **Spec requirement traced:** § 5.1 row AC-R25-1 → binds invariant 1 (rate-domain output) + invariant 2 (elapsed first-class) + invariant 6 (4 flags emitted).
- **Self-confirming check:** Test calls `makeCleanPair({...starting_value:100, rate_per_second:10, expected_interval_seconds:10})`. Expected rate `10` is computed externally as `(200-100)/10` — the test does NOT re-implement the production division. The constants flow from external invocation parameters into both the substrate generator and the expected assertion, but the substrate itself is independent code; it doesn't invoke `transformPair`.
- **Counterfactual mutation:** If `engine/l0/counter-rate-transform.ts:148` were mutated from `next.value - prev.value` to `next.value` (forgetting the delta), `out.value` would be 200 ≠ 10 — assertion fails. If line 150 were mutated to `delta` (forgetting `/actual_elapsed_seconds`), `out.value` would be 100 ≠ 10 — assertion fails.
- **Verdict:** Not self-confirming. ✓

**Test B: AC-R25-4 (32-bit wraparound)** — `test/q25-l0-contract.test.ts:72-81`

- **Spec requirement traced:** § 5.1 row AC-R25-4 → binds invariant 4 (DCGM 32-bit wraparound handling).
- **Self-confirming check:** Test imports `UINT32_MOD` from production and computes `expected_rate = (UINT32_MOD - 4_200_000_000 + 50) / 1.0`. This re-uses the production constant but does NOT re-use the production formula — the formula is asserted independently. If production used the WRONG constant (e.g., 2^32 - 1 instead of 2^32), the test's `expected_rate` would also be wrong, but the symmetry would NOT mask the production bug because: production uses `UINT32_MOD - prev.value + next.value` (line 125) and test uses `UINT32_MOD - 4_200_000_000 + 50` (line 79); both should equal 94_967_346 only if `UINT32_MOD === 4_294_967_296`. Mutating production's `UINT32_MOD` constant to `UINT32_MAX` would make both test-expectation AND production output drift by 1 in the same direction — DEPENDENCY RISK.
- **Counterfactual mutation:** If `engine/l0/counter-rate-transform.ts:125` were mutated from `(UINT32_MOD - prev.value) + next.value` to `(UINT32_MAX - prev.value) + next.value`, production output would be 94_967_345 but `expected_rate` (still using UINT32_MOD) would be 94_967_346 — assertion fails. ✓ Discriminator preserved if the mutation is in the FORMULA, not the CONSTANT.
- **Verdict:** Not self-confirming for formula mutations; weakly self-confirming for constant mutations (since test imports the constant). Acceptable per inherited engine convention; documented exposure.

**Test C: AC-R25-12 (TrendBuffer integration)** — `test/q25-l0-contract.test.ts:155-175`

- **Spec requirement traced:** § 5.1 row AC-R25-12 → binds invariant 2 (elapsed first-class) + invariant 6 (flags) + PRD load-bearing claim "Comparable slopeNorm follows from per-second-normalized inputs".
- **Self-confirming check:** Test pushes `transformPair`-output values into TrendBuffer. Asserts `snap.mean ≈ 10` (tolerance 0.001). The expected value `10` is the `rate_per_second` constant external to production. The test does NOT compute the snapshot's mean in parallel — it consumes TrendBuffer's `.get()` output directly.
- **Counterfactual mutation:** If `transformPair` returned `delta` instead of `delta/actual_elapsed_seconds` (line 150), raw deltas would be `[10, 12, 15, 10, 12, 15, 10, 12, 15, 10]`, mean = 12.1, `|12.1 - 10| = 2.1 ≫ 0.001` — assertion fails. The commit message claim "non-normalized impl mean ≈ 11.8" is approximate (actual is 12.1); the discriminator holds. ✓
- **Verdict:** Not self-confirming. The PRD load-bearing claim is empirically bound.

**All 3 tests:** trace to spec ACs, none self-confirming for the critical mutation classes. AC-R25-4 has a documented constant-import exposure (low risk; the constants are well-known 2^32 / 2^32-1).

---

## § 5 Cross-cutting checks

### § 5.1 TDD discipline

**Verified via git log + git show --stat:**
- RED commit `2f2552e test(R25-RED): q25-l0-contract stubs — AC-R25-1..12 pending` — file content includes `assert.fail` placeholders + imports that intentionally fail to typecheck.
- HALT commit `4f405c0` (mid-stream HALT; production files committed here per Implementer's halt-discipline).
- DISP commit `f7be96c` (operator disposition; only NEXT-ROLE.md modified).
- GREEN commit `c78374d feat(R25): L0 contract — AC-R25-12 GREEN (Option A tolerances)` — applies the disposition.
- chore-A `e6ff18a` and chore-B `4287020` follow.

RED-then-GREEN ordering is genuine and independently verifiable via git log. **10th consecutive tessera Reviewer-side TDD verification (R02-R25 streak).** ✓

### § 5.2 No-skip / halt discipline

**Halt discipline APPLIED CORRECTLY** at ESCALATE-R25-01:
- Spec § 7.1 scenario (c) "Any AC scenario produces output that conflicts with spec prescription → HALT" fired exactly as designed.
- DIAGNOSTIC file written (`coordination/diagnostics/DIAGNOSTIC-R25-ac12-tolerance.md`, committed at 4f405c0; NOT read by Reviewer per cold-review boundary, only existence confirmed via git diff path).
- Bounded options A/B/C presented.
- STATUS: ESCALATE set; operator-dispositioned; resumed.

**Halt discipline GAP**: spec § 7.1 scenario (b) "Baseline test count differs from 217 at session entry → HALT" did NOT fire even though pass-count differed (216 vs spec-claimed 217 healthy). The Implementer treated total=217 as count-equal. This is a R19 MAJOR-1/2-class issue (silent acceptance of spec-vs-reality drift), partially mitigated by the operator's explicit "MERGE-READY" disposition in NEXT-ROLE.md. Source: spec (b) was specified narrowly as "count differs" not "count/pass/fail differ" — Architect coverage gap.

### § 5.3 Anti-scope

`git diff ada602b..e6ff18a --name-only` produces 8 paths:
1. `coordination/MEMORIAL.md` ✓ in spec § 3 allowed-set
2. `coordination/NEXT-ROLE.md` ✓ in spec § 3 allowed-set
3. `coordination/diagnostics/DIAGNOSTIC-R25-ac12-tolerance.md` ✗ NOT in spec § 3 allowed-set (see MAJOR-2)
4. `coordination/specs/Q-R25-SPEC-AUDIT.md` ✓ in spec § 3 allowed-set
5. `coordination/specs/Q-R25-SPEC.md` ✓ in spec § 3 allowed-set
6. `engine/l0/counter-rate-transform.ts` ✓ in spec § 3 allowed-set
7. `test/_substrate/synthetic-counter-generator.ts` ✓ in spec § 3 allowed-set
8. `test/q25-l0-contract.test.ts` ✓ in spec § 3 allowed-set

No anti-scope violations beyond the documented DIAGNOSTIC-file expansion. No frozen-file modifications (engine/core.ts, engine/l0/schema-continuity.ts, engine/types/verdict.ts, engine/verdict-groups.ts, engine/fleet/verdict-consumer.ts, engine/hardware-topology-source.ts, engine/topology-overlay.ts, test/_substrate/v9X-cluster.ts, test/_substrate/v9Y-multi-rack-cluster.ts, pre-R25 q-* test files, VENDORING-MANIFEST.md, SCOPING-MEMO-v0.3.md, PRD.md). ✓

### § 5.4 Line-citation accuracy (cross-project rule R03/R18/R21)

Implementer's NEXT-ROLE.md attestation cites per-AC lines:
- AC-R25-1: 33 → actual 33 ✓
- AC-R25-2: 47 → actual 47 ✓
- AC-R25-3: 59 → actual 59 ✓
- AC-R25-4: 72 → actual 72 ✓
- AC-R25-5: 84 → actual 84 ✓
- AC-R25-6: 95 → actual 95 ✓
- AC-R25-7: 106 → actual 106 ✓
- AC-R25-8: 124 → actual 124 ✓
- AC-R25-9: 133 → actual 133 ✓
- AC-R25-10: 141 → actual 141 ✓
- AC-R25-11: 148 → actual 148 ✓
- AC-R25-12: 155 → actual 155 ✓

All 12 line citations verified via `grep -n "^test(" test/q25-l0-contract.test.ts`. Cite-then-verify discipline correctly applied. No line-citation-drift recurrence. ✓

### § 5.5 Role-boundary (Implementer)

Implementer wrote only the spec-prescribed files (+ the DIAGNOSTIC file at HALT) + coordination artifacts. No engine/* modifications beyond `engine/l0/counter-rate-transform.ts` (Tessera-original). No test/_substrate/* modifications beyond the new synthetic generator. ✓

---

## § 6 Grilling output on this report (pre-route gate)

- **Every finding has a file:line reference?** YES — every MAJOR / MINOR / OBS cites at least one file:line; MAJOR findings cite multiple sites.
- **Any AC marked PASS without actual verification?** NO — every PASS row cites either the runtime test (Reviewer re-ran via `node --test`), an independent arithmetic verification, or a direct binding-command re-execution (typecheck).
- **Right-reasons audit completed for 3+ tests?** YES — AC-R25-1, AC-R25-4, AC-R25-12 audited with counterfactual mutations.
- **Cold-review boundary held?** YES — diagnostics/, audit sidecar, logs/, .prompt-*.md, prior Reviewer reports not consulted.
- **Adversarial mandate honored (≥1 finding)?** YES — 3 MAJOR + 3 MINOR + 2 OBS.
- **MEMORIAL VIOLATION entries planned per Reviewer-R16 reinforcement?** YES — see MEMORIAL append step.

Grilling passes. Routing as MERGE-READY (no CRITICAL).

---

## § 7 Routing

- **STATUS:** `MERGE-READY` (3 MAJOR + 3 MINOR + 2 OBS; no CRITICAL).
- **NEXT-ROLE:** `MEMORIAL-UPDATER`.
- **Rationale for MERGE-READY despite 3 MAJOR:** All 3 MAJOR findings are spec/artifact drift (audit-trail completeness), not functional defects in the L0 contract surface. The implementation, tests, and operator disposition are coherent; the spec was not updated to reflect the operator-dispositioned changes. These are Architect-followup items for the next round / Wave 1 gate or a discrete spec-amendment commit, not blockers to merging the L0-contract surface.
- **If operator prefers CRITICAL routing** (spec-amendment-before-merge), this verdict is reversible — flag MAJOR-1/-2/-3 as CRITICAL and re-route via NEXT-ROLE.md ESCALATE block.

---

_Reviewer: Claude (Opus 4.7) — R25 cold review — `~/projects/tessera-clusters/wu-00-l0-contract` worktree at HEAD `6a07b1a`._
