# REVIEWER-REPORT-R16

_Audit-tier investigation round: TQ-1 (γ) — PR-F5 storage methodology investigation._
_Reviewer: cold-audit of R16 spec + tests + findings document. Produced 2026-05-17._

---

## § 0. Reviewer-side binding verification (R06+ standing policy)

Independently run at HEAD `7a7d596`:

| Item | Result |
|---|---|
| `npm run typecheck` | exit 0 |
| `npm test` (all 18 test files) | **171/0** |
| `node --test test/q14-pr-f5-storage.test.js` | 4/0 |
| `node --test test/q16-pr-f5-investigation.test.js` | 2/0 |

R16 Implementer attestation table (171/0) confirmed against Reviewer-side run. 12th consecutive round of independent binding-command execution.

Coordination chore step 7 verified: `git diff ef47759..7a7d596 -- src/ tests/ tools/ engine/ coordination/specs/` is empty (SHA-B touches only NEXT-ROLE.md).

R16 file inventory (`git diff --stat 6df47cd..HEAD`):
- `coordination/MEMORIAL.md` (+18)
- `coordination/NEXT-ROLE.md` (+54)
- `coordination/PR-F5-INVESTIGATION-R16.md` (+163, new)
- `coordination/specs/Q-R16-SPEC.md` (+134, new)
- `test/q14-pr-f5-storage.test.ts` (+91 / −2)
- `test/q16-pr-f5-investigation.test.ts` (+79, new)

Matches the spec § Design component inventory exactly. No engine/ or src/ or tools/ changes.

---

## § 1. Per-AC verification table

| AC-ID | Criterion (short) | Status | Evidence |
|---|---|---|---|
| AC-R16-1 | At d ∈ {10,25,50,100}, ratio (fleet + 1000×single)/fleet ≥ 500 | **PASS** | `test/q14-pr-f5-storage.test.ts:243-248` asserts `ratio >= 500` in loop; OBSERVED at HEAD: 1233.1 / 1057.7 / 1015.5 / 1006.5 (all ≥ 500). |
| AC-R16-2 | Ratios strictly decrease as d increases | **PASS** | `test/q14-pr-f5-storage.test.ts:251-256` asserts `rows[i].ratio < rows[i-1].ratio` for i=1..3; verified at HEAD (1233.1 > 1057.7 > 1015.5 > 1006.5). |
| AC-R16-3 | welford_state survives JSON round-trip (deep-equal) | **PASS** (with disclosure) | `test/q16-pr-f5-investigation.test.ts:34-37` asserts deepStrictEqual on round-tripped welford_state + n, mean, m2. _Disclosure_: test exercises Node.js built-in `JSON.parse(JSON.stringify(...))` rather than calling `engine/loader.ts:loadCompiledConfig`; the loader is a pass-through over `JSON.parse` (loader.ts:33) so the substrate behavior is equivalent, but the production-code path itself is not invoked. See MINOR-2. |
| AC-R16-4 | WITH welford_state → n=26; WITHOUT → n=1 | **PASS** | `test/q16-pr-f5-investigation.test.ts:56-78` calls production `updatePerShardResidual` on both cases; asserts `resultWith.welford_state!.n === 26` (line 59) and `resultWithout.welford_state!.n === 1` (line 72). Static trace `engine/per-shard/runtime.ts:100-103` confirms the cold-start branch logic. |
| AC-R16-5 | Findings doc contains (a) d-dependence table, (b) welford verdict + runtime.ts:101 cite, (c) diagonal-only table, (d) α/β/δ framings | **PASS** (with disclosure) | (a) `coordination/PR-F5-INVESTIGATION-R16.md:22-33` — 4-row table d=10/25/50/100. (b) Section "Item 2" lines 55-81 with `runtime.ts:100-103` code block. (c) Section "Item 3" lines 84-107 — 4-row diagonal-only table. (d) Section "Item 4" lines 113-147 — (α), (β), (δ) sub-sections each citing R16 measurements. _Disclosure_: (α) sub-section contains a "Recommendation from R16: Option 2 (sparse encoding by tier)" line that tightens the spec's "framings" language into a recommendation — see MINOR-3. |

All 5 ACs PASS. 2 carry disclosure tied to MINOR findings.

---

## § 2. Findings

### MAJOR
None.

### MINOR

**MINOR-1 — Single-shard proxy methodology inconsistency vs AC-8 reference**

The AC-R16-1/2 single-shard proxy at `test/q14-pr-f5-storage.test.ts:200-218` builds residuals that include `last_observed_at: 1000000`, while:
- the AC-8 full-N measurement at `test/q14-pr-f5-storage.test.ts:55-71` (function `buildWarmStartPerShardCells`) omits `last_observed_at`,
- and AC-10's single-shard reference at `test/q14-pr-f5-storage.test.ts:138-154` also omits it.

The R16 proxy additionally fixes `shard_id='shard-0'` (7 chars), while AC-8 / AC-10 full-N uses 'shard-0'..'shard-999' (7-10 chars; mean shard_id length is longer than the proxy's).

Net effect: the R16 d=10 proxy adds ~26 bytes/cell (from `"last_observed_at":1000000,`) but loses ~average-shard_id-length-delta bytes/cell from fixing 'shard-0'. The two biases partially cancel, producing the 1233.1× R16 proxy ratio vs 1237.7× AC-8 full-N ratio (0.4% delta, per findings § Item 1).

`PR-F5-INVESTIGATION-R16.md:24` describes this as "matches full-N AC-8 measurement (1237.7×) within 0.4%". The match is real but accidental (two compensating biases). The R16 proxy is internally consistent across d values (use this for AC-R16-2 monotone-decrease purposes — the comparison there is structural, not absolute), but the cross-check against AC-8 is weaker than the findings doc suggests.

The investigation conclusion (d-mismatch hypothesis REFUTED; ratio remains > 1000× at all measured d) is robust to either methodology; this finding does not undermine the load-bearing claim. It is a precision/transparency gap in the methodology framing.

**MINOR-2 — AC-R16-3 does not exercise loadCompiledConfig directly**

The spec § 3 AC-R16-3 text references "the JSON persistence layer used by loadCompiledConfig". The test at `test/q16-pr-f5-investigation.test.ts:31` uses `JSON.parse(JSON.stringify(residual))` rather than constructing a CompiledConfig JSON string and calling `engine/loader.ts:loadCompiledConfig`.

`engine/loader.ts:32-61` is a pass-through over `JSON.parse` (does no transformation of nested optional fields like welford_state), so the test's substrate is functionally equivalent — but the production code path is not actually invoked by AC-R16-3. The test verifies what JavaScript's JSON layer does, not what Tessera's loader does.

Consequence: a hypothetical future change to `loadCompiledConfig` that strips or normalizes welford_state (e.g., a "v2 schema migration") would not be caught by AC-R16-3 as written. Suggested follow-up: have a future round wrap `JSON.stringify({version, compiler_version, compiled_at, baseline_ref, alpha_budget, per_shard_cells: [...with welford_state...]})`, call `loadCompiledConfig` on it, and assert the welford_state survives via the real loader path. R16 self-detection of this gap not required; documenting here for downstream awareness.

**MINOR-3 — Findings doc § Item 4 (α) tightens "framings" into "recommendation"**

Spec § 4 anti-scope:
> "No architectural disposition (R16 surfaces evidence + options; operator picks α/β/δ after reviewing findings)."

Spec AC-R16-5(d):
> "disposition framings for options α, β, and δ citing the R16 measurements".

`coordination/PR-F5-INVESTIGATION-R16.md:127` says:
> "Recommendation from R16: Option 2 (sparse encoding by tier) is the least invasive…"

This is a sub-α recommendation (which flavor of α, not whether α vs β vs δ), so it doesn't violate the headline anti-scope on the top-level disposition. But it does move past pure "framings" into operator-decision territory at the sub-α level. Tone is "R16-recommends-option-2-if-α-chosen" rather than "α has these three sub-options, here is evidence on each".

Reviewer's read: the sub-recommendation is defensible analytically (Option 2 is the least invasive and most consistent with the existing R02 sparse-encoding inverse-convention), but the framing should arguably be neutral per spec. Operator should be aware that R16 is leaning toward Option 2 within α, not pretending neutrality.

### OBS

**OBS-1 — Diagonal-only ratio (26× at d=100) is an asymmetric estimate**

`PR-F5-INVESTIGATION-R16.md:90-95` reports diagonal-only ratios assuming only `welford_state.m2` is diagonalized; the fleet baseline's `family_C.covariance` (also d×d) remains full-rank in the calculation. § Item 4 (α) recapitulates this as "Diagonal-only at d=100: reduces to ~26× (still 17× above target)" (line 118).

If diagonal-only were applied symmetrically (both fleet `family_C.covariance` AND per-shard `welford_state.m2` become diagonal-d-vectors), both sides of the ratio shrink proportionally and the ratio at d=100 would remain ≈ N ≈ 1000, not drop to 26×. The 26× figure presupposes an architecturally asymmetric model where per-shard is diagonalized but fleet is not.

Whether the asymmetric model is architecturally meaningful is exactly the question the findings doc punts to a future Architect round (line 107). This is not a correctness defect — but the operator reading § Item 4 (α) might mistakenly infer that diagonal-only is a 40× compression. The 40× absolute compression is real per-shard; the ratio reduction depends on whether fleet shrinks too.

**OBS-2 — AC-R16-4 surfaces but does not flag the n_samples / welford_state.n state divergence**

When `updatePerShardResidual` runs on the WITHOUT-welford_state residual (current.n_samples=25, welford_state absent, same seed), the result has:
- `n_samples=26` (from `observeSample`'s normal increment branch at `engine/per-shard/warm-start.ts:90`)
- `welford_state.n=1` (from `runtime.ts:101` cold-start branch reinitializing the accumulator)

`test/q16-pr-f5-investigation.test.ts:72` correctly asserts `welford_state.n === 1` to validate load-bearing-ness, but does not assert anything about the resulting `n_samples` (which is 26, inconsistent with the welford_state's view of having seen 1 sample). The finding doc § Item 2 line 78 says "appear to run correctly (no crash) but accuracy of the per-shard mean/covariance estimates would restart from 0" — which captures the failure mode, but does not call out the internal state divergence between the state-machine counter and the accumulator counter.

This is a property of the production code (runtime.ts composes observeSample + welford with independent counters); R16 happened to surface it. Documenting here so a future round considering "what to persist in compiled-config" sees the divergence. Not a R16 defect.

**OBS-3 — Spec § Design analytical prediction has a minor arithmetic mismatch**

`coordination/specs/Q-R16-SPEC.md:55-57` writes:
> "At d=10 (baseline): fleet ≈ 67.9 KB; single-shard ≈ 79.2 KB; ratio ≈ 1 + 1000 × (79200/69530) ≈ 1 + 1000 × 1.14 ≈ 1140."

The denominator 69530 ≈ 67.9 KB × 1024 = 69530 bytes — consistent. 79200/69530 = 1.139. So the prediction is 1140. Observed: 1237.7. Internally consistent; just confusingly notated (KB vs bytes mixed without unit conversion shown). Cosmetic.

**OBS-4 — `last_observed_at` divergence between AC-8 and AC-R16-1/2 single-shard inputs is not disclosed in test header or findings doc**

Tied to MINOR-1. The R14 AC-8/9/10 test code at `test/q14-pr-f5-storage.test.ts:55-86` does not set `last_observed_at`; the R16 AC-R16-1/2 helper at lines 200-218 does. Neither the file header note (lines 1-22) nor the findings doc disclose this divergence. A future R-round reviewing PR-F5 evidence might be surprised by the discrepancy.

---

## § 3. Right-reasons audit

**Test 1: AC-R16-1/2 dimension-dependence (`test/q14-pr-f5-storage.test.ts:179-257`)**

- Requirement traced: spec § 2 Mechanism Item 1; AC-R16-1 (ratio ≥ 500); AC-R16-2 (monotone decrease).
- Self-confirming check: the test calls `JSON.stringify(...)` on cell arrays it constructs. The implementation under test is JavaScript's native JSON serializer (not Tessera code). The refutation threshold (500×) is externally derived in the spec § 2 — not invented inside the test. Monotone-decrease is a structural prediction documented in the spec § Design (d²-domination convergence). The test does not re-implement JSON.stringify nor invent the ratio formula — it computes the formula spelled out in the spec's mechanism text.
- Verdict: NOT self-confirming. The test measures real JSON-serialization behavior against externally-stated thresholds.

**Test 2: AC-R16-3 welford_state round-trip (`test/q16-pr-f5-investigation.test.ts:21-38`)**

- Requirement traced: spec § 3 AC-R16-3 (deep-equal round-trip).
- Self-confirming check: the test seeds a residual with literal welford_state `{n:25, mean:[1,2], m2:[[4,0],[0,4]]}`, round-trips via `JSON.parse(JSON.stringify(...))`, and asserts deep equality of n, mean, and m2 against the same literals. The expected values come from the input data — they cannot be derived from re-implementing the production code, because the production code (Node.js JSON) is fixed.
- Verdict: NOT self-confirming, but note: the test exercises Node.js's JSON layer, not Tessera's loader. See MINOR-2 — this is a coverage-shape observation, not a self-confirming flaw.

**Test 3: AC-R16-4 cold-start reset (`test/q16-pr-f5-investigation.test.ts:41-79`)**

- Requirement traced: spec § 3 AC-R16-4 (load-bearing determination via n=26 vs n=1).
- Self-confirming check: the test calls the actual production function `updatePerShardResidual` from `engine/per-shard/runtime.ts:82`. The expected values (`n === 26` and `n === 1`) come from:
  - n=26: 25 (initial) + 1 (one new sample applied by `updateWelford`'s `state.n + 1` line at `welford.ts:69`)
  - n=1: 0 (fresh accumulator from `initialWelfordState`) + 1 (first sample)
- These are mechanical consequences of the Welford recurrence and the runtime.ts:101 branch, not implementation choices reflected in the test. The test does not re-implement updatePerShardResidual.
- Verdict: NOT self-confirming. The strongest of the three R16 tests for production-code coverage.

---

## § 4. Cross-cutting checks

**TDD discipline (verified via git history):**
- RED commit `00a70f3`: adds 3 `assert.fail` placeholders for AC-R16-1/2, AC-R16-3, AC-R16-4 BEFORE implementations land. Verified via `git show 00a70f3`; reviewer confirmed the RED commit's q14 file ends with `assert.fail('RED: d-parameterized measurement not yet implemented')` (line 257) and q16 file has `assert.fail('RED:...')` for both new tests. 168 pass / 3 fail at RED.
- GREEN commit `9ccbb61`: implements the three tests. 171 pass / 0 fail.
- TDD ordering preserved. 13th consecutive round of TDD pre-test discipline.

**Halt discipline:**
- Spec § 1 + § 5 frame the welford_state persistence question as resolvable by static trace (`runtime.ts:101`) rather than architectural ambiguity. NEXT-ROLE.md (read for routing context only) had defined a split-condition: if Item 2 surfaced an architectural ambiguity, HALT + DIAGNOSTIC. The Implementer's analysis correctly assessed the question as empirically testable (AC-R16-4 captures it) rather than architectural.
- Reviewer-independent check: the question "should welford_state be persisted in compiled-config?" IS architectural at a deep design layer (e.g., one could imagine a re-warm-from-observations strategy), but the narrower question "does the current runtime require welford_state for cold-start to preserve history?" is empirically testable (and AC-R16-4 answers it). The spec correctly scoped to the narrower empirical question and routed the architectural framing to "Item 4 (α) Architecture-revise" as an operator-decision item.
- No HALT-discipline violation. (Reviewer notes for record: this is a discriminating call — the Implementer's interpretation is defensible given the spec's framing.)

**Anti-scope check:**
- Spec § 4 forbids: engine file changes; compression mechanism; diagonal-only implementation; AC-8/9/10 test modifications; architectural disposition; Phase 2 scope.
- Verified via `git diff --stat 6df47cd HEAD`: only 6 files touched (4 coordination, 2 test). Zero engine/ or src/ changes. AC-8/9/10 tests preserved verbatim (verified via `git diff 6df47cd 9ccbb61 -- test/q14-pr-f5-storage.test.ts`: only file-header note added and one new test appended; lines 28-172 unchanged).
- Anti-scope held. One soft scope creep flagged as MINOR-3 (sub-α recommendation).

**Inherited-testimony empirical verification (R08 MAJOR-2 reinforcement):**
- R14's header note hypothesis at `test/q14-pr-f5-storage.test.ts:13-18` was "prediction assumed high-d (d≈50+) fleet baseline; d=10 makes per-shard welford_state dominant." The Implementer did not summarize this as fact; AC-R16-1/2 empirically tests it across d ∈ {10,25,50,100} and the findings doc REFUTES the prediction (1.2-1.5× at high d). The R14 header was correctly treated as a hypothesis to be tested, not as established fact.

**Correction-propagation (R09 MAJOR-1 reinforcement):**
- Findings doc § "Correction-propagation check" (line 151-159) enumerates sites citing 1237.7× or the d-mismatch hypothesis: q14 test header, PHASE-1-CLOSE-WALK.md, OVERNIGHT-LOG-2026-05-17.md, SCOPING-MEMO-v0.3.md § 2.2. Each is assessed for whether correction is needed; the last is correctly identified as out-of-scope (operator (β) decision gates the revision).
- Discipline applied. R16 did not silently update sibling sites.

---

## § 5. Pre-emit grilling

| Check | Verdict |
|---|---|
| Every finding (MINOR-1/2/3, OBS-1/2/3/4) has file:line reference? | YES |
| Any AC marked PASS without actual verification? | NO — every PASS row cites a file:line in test code AND OBSERVED value from Reviewer-side test run. AC-R16-3 and AC-R16-5 carry explicit disclosures tied to MINOR findings. |
| Right-reasons audit completed for 3+ tests? | YES — three tests audited (AC-R16-1/2, AC-R16-3, AC-R16-4), each with spec-requirement traceability + self-confirming check + verdict. |
| Cross-cutting checks all run? | YES — TDD (git log), halt-discipline, anti-scope (git diff --stat), inherited-testimony, correction-propagation each addressed. |
| Cold-review boundary held? | YES — did not consult `coordination/diagnostics/` (none for R16), `coordination/logs/`, or `.prompt-*.md` files. NEXT-ROLE.md read for spec-input pointers and split-condition framing only. |

All grilling checks PASS.

---

## § 6. Routing

CRITICAL: 0
MAJOR: 0
MINOR: 3
OBS: 4

Per CLAUDE-COMMON.md routing rule: MAJOR or below → **STATUS: MERGE-READY**.

R16 investigation is complete. Operator now picks TQ-1 disposition (α architecture-revise / β pitch-revise / δ defer) per `coordination/PR-F5-INVESTIGATION-R16.md` § Item 4, informed by MINOR-1 (proxy methodology caveat), OBS-1 (diagonal-only asymmetric estimate caveat), and MINOR-3 (R16's internal sub-α recommendation toward Option 2 sparse-tier encoding).

---

_End of REVIEWER-REPORT-R16._
