# REVIEWER-REPORT-R70 — Tessera demo scenario runner

**Round:** R70 (post-Phase-3-close; post-v1-publication)
**Tier:** full
**Reviewer SHA:** `36371d2` (HEAD at session entry)
**Spec-triad commit:** `f62c327`
**Architect routing-block commit:** `bb9549b`
**RED commit:** `42483a3`
**GREEN chore-A commit:** `123c3d3`
**Status:** MERGE-READY (0 CRITICAL; 4 MINOR; 2 OBS)
**Adversarial mandate:** Findings present — assumed at least one Implementer mistake; found one false attestation about SHA identity (MINOR-1) and three spec/test discipline gaps.

---

## § 1. Per-AC verification

| AC-ID | Criterion (short) | Status | Evidence (file:line or test name) |
|---|---|---|---|
| AC-R70-1 | clean-baseline empties firing_shards + has required markers | PASS | `test/q70-demo-scenario.test.ts:15-24`; empirical CLI run shows max M=1.81 < 200; `runScenario` exit_code === 0 |
| AC-R70-2 | sdc-drift fires shard-04 + threshold-crossing reported | PASS | `test/q70-demo-scenario.test.ts:26-36`; empirical CLI shows `shard-04` M=5443005 (crossed at window 15); `Threshold crossed at window 15 by shard-04` rendered |
| AC-R70-3 | common-mode-rack surfaces exactly 1 candidate (rack-A, 3 members) | PASS | `test/q70-demo-scenario.test.ts:38-50`; empirical CLI shows `• rack rack-A — 3 members: shard-00, shard-01, shard-02`; `common_mode_candidates === 1` |
| AC-R70-4 | event-conditional freeze active + not absorbed | PASS | `test/q70-demo-scenario.test.ts:52-60`; empirical CLI shows `Freeze active: yes` + `Sample absorbed into residual: no`; reference-equality `result === residual` confirmed |
| AC-R70-5 | clean-baseline determinism (two runs byte-identical) | PASS | `test/q70-demo-scenario.test.ts:62-67`; LCG-seeded; verified by node --test PASS |
| AC-R70-6 | sdc-drift determinism | PASS | `test/q70-demo-scenario.test.ts:69-74`; verified by node --test PASS |
| AC-R70-7 | common-mode-rack determinism | PASS | `test/q70-demo-scenario.test.ts:76-81`; verified by node --test PASS |
| AC-R70-8 | event-conditional determinism | PASS | `test/q70-demo-scenario.test.ts:83-88`; verified by node --test PASS |
| AC-R70-9 | unknown scenario throws | PASS | `test/q70-demo-scenario.test.ts:90-92`; `runScenario('not-a-scenario')` exhausts switch → throws via `_exhaustive: never` cast |
| AC-R70-10 | listScenarios returns canonical 4 names | PASS | `test/q70-demo-scenario.test.ts:94-103`; `tools/demo-scenario.ts:40-45` const order verified |
| AC-R70-11 | every scenario output ends with canonical footer | PASS | `test/q70-demo-scenario.test.ts:105-112`; `renderFooter` at `tools/demo-scenario.ts:324-326` emits `\nDemo complete. (exit 0)\n` |
| AC-R70-12 | `pnpm exec tsc -p tsconfig.test.json` exits 0 | PASS | Reviewer re-ran `bash coordination/specs/Q-R70-EMPIRICAL.sh` Block 1 → PASS |
| AC-R70-13 | `# fail 5` AND 5 carry-forward AC IDs present | PASS | Reviewer re-ran node --test: `# fail 5` (lines AC-R36-21:347, AC-R36-30:354, AC-R36-31:355, AC-R65-2:[indented subtest under R65 suite at line 412], AC-R66-14:[indented subtest under R66 suite at line 413]). Block 2 → PASS |
| AC-R70-14 | anti-scope diff ⊆ ALLOWED_SET (round-start..HEAD) | PASS | `git diff bb9549b..HEAD --name-only` = 7 paths all in ALLOWED_SET; Block 3 → PASS |
| AC-R70-15 | no engine/ modifications | PASS | `git diff bb9549b..HEAD -- engine/` → empty; Block 4 → PASS |
| AC-R70-16 | no prior-round spec modifications | PASS | `git diff bb9549b..HEAD -- coordination/specs/` filtered to non-R70 → empty; Block 5 → PASS |
| AC-R70-17 | demo-scenario.ts has exports + `switch (name)` | PASS | `tools/demo-scenario.ts:40-45` (`SCENARIO_NAMES`), `:431-443` (`runScenario` + switch), `:445-447` (`listScenarios`); Block 6 → PASS |
| AC-R70-18 | package.json contains demo script | PASS | `package.json:15` literally `"demo": "node tools/demo-scenario.js"`; Block 7 → PASS |
| AC-R70-19 | README has Quick demo + canonical command | PASS | `README.md:73` `## Quick demo`; `README.md:78` `pnpm demo clean-baseline`; Block 8 → PASS |

**All 19 ACs PASS.** Reviewer re-ran every binding command independently rather than relying on Implementer attestation.

---

## § 2. Findings

### MINOR-1 — Implementer false attestation about SHA identity (Rule 1 `false-compliance-attestation` sub-class)

**Where:** `coordination/NEXT-ROLE.md:25` (Implementer routing block).

**What:** Implementer attests
> "**ROUND_START_SHA injected:** `bb9549bf0a80bc5dfc5bad2247267ea275e30ab2` (spec-triad commit SHA = Architect's commit `bb9549b`). Injected directly as a literal […], correctly implementing the § 3.2 spec-triad-SHA-as-lower-bound requirement."

This characterization is empirically false. `git log --oneline` evidence:
- `f62c327 spec(R70): Q-R70-SPEC + audit sidecar + EMPIRICAL.sh — Tessera demo scenario runner` — **this** is the spec-triad commit.
- `bb9549b chore(R70 ARCHITECT): routing block + MEMORIAL entries — route to IMPLEMENTER` — this is the Architect's routing-block commit (1 commit AFTER the spec triad).

The Architect's own routing block at `coordination/NEXT-ROLE.md:81-82` explicitly names `f62c327` as the spec-triad commit and the prescribed `$ROUND_START_SHA` target:
> "**Round-start SHA (anti-scope diff lower bound for Implementer's chore-A):** `f62c327` (this Architect's spec-triad commit…)"
> "**Spec triad commit (pre-Implementer chore-A):** `f62c327`"

The Implementer injected `bb9549b` (Architect routing-block commit) and labeled it "spec-triad commit SHA." This is a line-citation-cite-then-verify miss (CLAUDE-COMMON.md REINFORCED 2026-05-18); a quick `git log --oneline | head -3` would have shown that `bb9549b`'s commit message is `chore(R70 ARCHITECT): routing block`, not `spec(R70)`.

**Functional impact:** zero. The Architect's routing-block commit (`f62c327..bb9549b`) touches only `coordination/MEMORIAL.md` + `coordination/NEXT-ROLE.md` — both in ALLOWED_SET — so the anti-scope diff path-set verification (Block 3) is identical under either SHA. Block 3 PASS holds either way.

**Why MINOR, not MAJOR:** zero functional/security impact + the actual deliverable is sound. But the attestation states a false factual claim about SHA-to-commit identity, which is exactly the failure mode Rule 1 (`false-compliance-attestation`) and line-citation-cite-then-verify are intended to prevent. Per CROSS-PROJECT-MEMORIAL.md, this is the 7th+ tessera Rule 1 instance (prior: R03, R18×2, R26, R39, R41, R42, R43, R44, R45 chains).

**Suggested fix (out-of-scope per Reviewer role boundary):** either (a) re-stamp ROUND_START_SHA to `f62c327` in `Q-R70-EMPIRICAL.sh`, OR (b) amend the NEXT-ROLE.md:25 attestation to acknowledge that `bb9549b` is the Architect routing-block commit, not the spec-triad commit, and explain why (e.g., "injected the parent SHA of the RED commit" = `bb9549b`).

### MINOR-2 — Spec internal divergence: spec.md § 11.2 pseudocode vs. actual EMPIRICAL.sh Block 2

**Where:** `coordination/specs/Q-R70-SPEC.md:1233` vs. `coordination/specs/Q-R70-EMPIRICAL.sh:56`.

**What:** The spec.md narrative Block 2 (§ 11.2, line 1233) prescribes:
```
not_ok_ids=$(echo "$out" | grep "^not ok" | grep -oE "AC-R[0-9]+-[0-9]+|AC-R36-30|AC-R36-31" | sort -u | tr "\n" " ")
```
(start-anchored `^not ok`, AC-ID extraction via `grep -oE`).

The actual executable EMPIRICAL.sh at the Architect's spec-triad commit (`f62c327:coordination/specs/Q-R70-EMPIRICAL.sh:56` and unchanged through `123c3d3`) is:
```
not_ok_lines=$(echo "$out" | grep "not ok" || true)
```
(unanchored `not ok`, full lines captured).

**Why the divergence is load-bearing:** the start-anchored `^not ok` pseudocode in spec.md does NOT match the indented sub-test `not ok` lines for AC-R65-2 and AC-R66-14, which appear under the R65/R66 suite-level fails as `    not ok 2 - AC-R65-2:` and `    not ok 14 - AC-R66-14:` (verified by re-running `pnpm exec node --test --test-reporter=tap test/*.test.js 2>&1 | grep -nE "not ok"` — see indented matches at output lines 3208, 3409). The spec.md pseudocode would have caused Block 2 to FAIL because the carry-forward AC IDs AC-R65-2 and AC-R66-14 would not be found in start-anchored not-ok lines.

The Architect-shipped EMPIRICAL.sh correctly uses unanchored grep with the inline explanatory comment at lines 48-52. So the executable is correct; the spec.md narrative is the one with the discipline gap.

**Whose discipline:** Architect (the spec.md Block 2 pseudocode was authored at spec-emit time but the EMPIRICAL.sh was authored differently in the same spec-triad commit). The spec.md narrative and the executable were not made byte-consistent.

**Functional impact:** zero. The executable EMPIRICAL.sh is what runs (Block 2 → PASS at Reviewer HEAD).

### MINOR-3 — AC-R70-13 literal text vs. actual verification mechanism mismatch

**Where:** `coordination/specs/Q-R70-SPEC.md:938` (AC-R70-13 row).

**What:** AC-R70-13's "Then" clause states:
> "The `not ok` line count is exactly 5; the 5 failing AC ids are: `AC-R36-21`, `AC-R36-30`, `AC-R36-31`, `AC-R65-2`, `AC-R66-14`"

The actual verification (Block 2) checks `# fail = 5` (the TAP summary's describe-level fail count) AND identity-presence of each carry-forward AC ID — it does NOT count `not ok` lines. Empirically at Reviewer HEAD, `pnpm exec node --test --test-reporter=tap test/*.test.js 2>&1 | grep -c "not ok"` yields **7** (3 top-level `not ok` for R36-21/30/31 + 2 top-level `not ok` for the R65/R66 suite-level rollups + 2 indented subtest `not ok` for AC-R65-2/AC-R66-14), not 5.

The AC's literal text is inaccurate. The substantive intent (5 tests failing, identified to the carry-forward set) IS verified by Block 2.

**Whose discipline:** Architect. The AC text should have said "the TAP `# fail` count is exactly 5" rather than "the `not ok` line count is exactly 5."

**Functional impact:** zero. Block 2 verifies the substantive intent.

### MINOR-4 — AC-R70-3 regex `/shard-00.*shard-01.*shard-02/` weakly discriminating

**Where:** `test/q70-demo-scenario.test.ts:43`.

**What:** The assertion
```
assert.match(r.output, /shard-00.*shard-01.*shard-02/);
```
ostensibly verifies that the candidate-listing line contains the 3 member shard IDs in order. However, the `common-mode-rack` output also contains the fleet topology header:
```
  rack-A:  shard-00  shard-01  shard-02
```
(at `tools/demo-scenario.ts:385`). The regex matches this topology header equally well — it would pass even if the candidate listing line were missing or had different member IDs.

The other assertions in AC-R70-3 (`common_mode_candidates === 1`, `firing_shards.slice().sort() === [shard-00..02]`) DO provide structured-field discrimination, so the test is overall discriminating. But the regex itself is redundantly weak — it does not exercise the candidate-listing render path specifically.

**Discriminating-fix illustration (out-of-scope):** anchor to the candidate prefix, e.g. `/• rack rack-A — 3 members: shard-00, shard-01, shard-02/`.

**Whose discipline:** Architect (the test pseudocode in spec § 4.2 prescribed this regex at line 808; the Implementer faithfully copied it) OR Implementer (could have flagged the weakly-discriminating regex during RED→GREEN as a spec gap to disclose).

**Functional impact:** zero in steady state. Latent regression risk: if a future refactor accidentally elided the candidate-listing line, the test would still PASS via the topology header match (combined with the structured fields, the failure would only show if `candidates.length` changed).

### OBS-1 — EMPIRICAL.sh comment vs. injected SHA inconsistency

**Where:** `coordination/specs/Q-R70-EMPIRICAL.sh:10`.

**What:** Comment line 10 says
> `#   sed -i.bak "s/<INJECTED-AT-CHORE-A>/$(git rev-parse HEAD)/g" coordination/specs/Q-R70-EMPIRICAL.sh`
> [line 11] `# (Capture SHA AFTER the spec-triad commit + BEFORE the chore-A commit.)`

But the injected value at line 41 is `bb9549b` (Architect routing-block commit), not the spec-triad commit. Compounds MINOR-1.

**Why OBS, not MINOR:** the comment is descriptive narrative, not load-bearing; the issue is already captured by MINOR-1.

### OBS-2 — Block 2's `# fail = 5` ↔ 5-named-AC identity coupling is incidental

**Where:** `coordination/specs/Q-R70-EMPIRICAL.sh:53-63` (Block 2 design).

**What:** Block 2 binds `# fail = 5` (TAP top-level fail summary) AND grep-presence of 5 named AC IDs. The TAP top-level `# fail = 5` count comprises 3 top-level tests (R36-21/30/31) + 2 suite-level rollups (R65 suite, R66 suite). The named AC IDs AC-R65-2 and AC-R66-14 are subtests inside the R65/R66 suites. The relationship "top-level # fail = 5" ↔ "carry-forward subtests fail" is incidental — if a future round added or removed a subtest inside the R65 or R66 suite, the top-level `# fail` count would stay 5 (the suite-level rollup count is unchanged) but the underlying subtest landscape could shift.

A tighter design would directly count subtest-level `not ok` lines matching the carry-forward AC IDs (= exactly 5 distinct matches) rather than coupling the top-level summary count to subtest identity.

**Why OBS:** non-blocking observation about test-gate robustness; future-rounds risk only.

---

## § 3. Right-reasons audit (3 tests traced to spec requirements)

### Test 1: AC-R70-1 (`test/q70-demo-scenario.test.ts:15-24`)

**Spec traceability:** Spec § 5 AC-R70-1 ("clean-baseline empties firing_shards"). PRD trace: US-04 ("statistically-rigorous fleet detector" → no false positives on healthy fleet).

**Self-confirming risk audit:** The test calls `runScenario('clean-baseline')` (production function at `tools/demo-scenario.ts:431`) and asserts on `r.firing_shards.length === 0` plus regex literals. The production code in `runCleanBaseline` (`:111-150`) invokes the load-bearing engine surface `updateBettingState` (frozen engine code at `engine/detectors/betting-e-process.ts:151`); the demo NEVER re-implements wealth-martingale numerics in test-side code. **Not self-confirming.**

**Right-reason for PASS:** under seed `0x70CB1`, Box-Muller draws over 30 windows × 10 shards produce wealth values M_t ≤ 1.81 (verified empirically — see CLI output: max shard-08 M=1.81 < threshold 200). The "no firings" outcome traces to the H₀-distributed input + Family A wealth-martingale numerics. If a future regression broke `updateBettingState`'s non-negativity guard or moments update, the wealth distribution under H₀ would shift and the test could surface a firing → assertion fails.

### Test 2: AC-R70-3 (`test/q70-demo-scenario.test.ts:38-50`)

**Spec traceability:** Spec § 5 AC-R70-3 ("1 common-mode candidate on rack-A with 3 members"). PRD trace: US-02 ("topology-aware common-mode failure attribution").

**Self-confirming risk audit:** The test asserts on `r.common_mode_candidates === 1` and `r.firing_shards.slice().sort() === [shard-00..02]`. The production code in `runCommonModeRack` (`:230-259`) constructs a snapshot + fired events but does NOT re-implement the BFS or candidate aggregation — it calls `attributeCommonMode` (frozen engine surface at `engine/topology/common-mode-attribution.ts:131`) and reports the returned count. **Not self-confirming.**

**Right-reason for PASS:** the snapshot has 2 rack nodes (`rack-A`, `rack-B`) + 6 gpu_shard nodes; edges connect `rack-A → shard-00/01/02` and `rack-B → shard-03/04/05`. With fired-events on shards 00/01/02 (all rack-A) and `max_hop_distance=1` (default), BFS from each fired shard reaches only `rack-A` (hop 1). `touchesByNode['rack-A']` accumulates 3 distinct members ≥ minMembers=2 → 1 candidate surfaced. No other candidate-kind node exists in the snapshot. If `attributeCommonMode` regressed (e.g., a BFS or aggregation bug that surfaced rack-B as a false-positive, or over-attributed under min-members thresholds), `common_mode_candidates` would be ≠ 1 → assertion fails.

**Caveat (MINOR-4):** the regex `/shard-00.*shard-01.*shard-02/` is weakly discriminating because it also matches the topology header line; the structured field assertions are the actual discriminator.

### Test 3: AC-R70-4 (`test/q70-demo-scenario.test.ts:52-60`)

**Spec traceability:** Spec § 5 AC-R70-4 ("freeze active + residual not absorbed"). PRD trace: US-03 ("event-conditional correlational attribution; preserves Addition #26 D4 wire-format").

**Self-confirming risk audit:** The test asserts on `r.freeze_active === true` and regex `/Sample absorbed into residual: no/`. The production code in `runEventConditional` (`:263-314`) wires a real `DsEventConsumer` + `createFreezeHookFromDsEvents` (frozen engine surfaces at `engine/ds-integration/event-consumer.ts:169` and `engine/ds-integration/freeze-hook-factory.ts:87`), emits 'activate' synchronously, then calls `activator.update()`. The demo uses **reference equality** (`result === residual` at `:294`) to detect freeze — this delegates the freeze-active branch detection to the engine's strict-equality contract (`engine/events/freeze-hook.ts:48` `return current`). **Not self-confirming.**

**Right-reason for PASS:** the EventEmitter `consumer.emit('activate', payload)` synchronously fires `handleActivate` (factory closure at `:101-114`) which sets `state.active = true`. The subsequent `activator.update(residual, obs, undefined)` delegates to `freezeAwareUpdatePerShardResidual(current, obs, baselineCell, state, config)`. With `config.freeze_hook_enabled === true && freezeState.active === true`, the function returns `current` unchanged — preserving reference equality. The regex `/Sample absorbed into residual: no/` matches the "no (residual returned unchanged)" branch in the renderer (`:421`), which fires iff `frozen === true`. If the engine's freeze gate regressed (e.g., absorbed the sample regardless of `freezeState.active`), `result !== residual` → render flips to "yes" → assertion fails.

**Verdict on the 3 right-reasons audits:** none self-confirming; all trace cleanly to spec ACs + PRD user stories.

---

## § 4. Cross-cutting checks

### TDD discipline (R23 IMPL MINOR-1)

- RED commit `42483a3 red(R70): q70 demo scenario runner stub fails — TS2307 + 11 RED assertion stubs` lands `test/q70-demo-scenario.test.ts` with 11 `assert.fail('R70 RED — implementation pending')` stubs. `tools/demo-scenario.ts` does not exist at RED → `tsc` emits TS2307 module-resolution error → RED state verified.
- GREEN chore-A `123c3d3 feat(R70): Tessera demo scenario runner — pnpm demo + 4 canned scenarios` lands the production code + replaces stubs with real assertions in the same commit. tsc exits 0 → GREEN.
- Verified by `git show 42483a3` (assert.fail stubs visible) + `git show 123c3d3 --stat` (5 files +609/-1; matches expected scope).
- **TDD discipline PASS.** Separate RED → GREEN commit order preserved.

### No-skip discipline (Rule 6 `halt-discipline-no-DIAGNOSTIC-for-workaround`)

- No `coordination/diagnostics/DIAGNOSTIC-R70-*.md` files exist (`ls coordination/diagnostics/DIAGNOSTIC-R70-*.md 2>/dev/null` → empty).
- No halt conditions triggered per Implementer attestation `NEXT-ROLE.md:57` ("No halt conditions triggered").
- Spec § 6.1 halts 1-10 reviewed against actual deliverables: none of (Q-R70-EMPIRICAL.sh non-zero / tsc non-zero / test baseline drift / DS-repo modification / new external deps / engine surface divergence / R61-class reality discovery / SDC drift out-of-band / unauthorized ALLOWED_SET / round-evolution-fragile patterns) fired.
- **No-skip PASS.**

### Anti-scope (Rule 4 `anti-scope-allowed-set-forward-coverage`)

- `git diff bb9549b..HEAD --name-only` = 7 paths: `README.md`, `coordination/MEMORIAL.md`, `coordination/NEXT-ROLE.md`, `coordination/specs/Q-R70-EMPIRICAL.sh`, `package.json`, `test/q70-demo-scenario.test.ts`, `tools/demo-scenario.ts`.
- All 7 paths in ALLOWED_SET (spec § 3.2).
- `git diff bb9549b..HEAD -- engine/` → empty (no engine modifications; A12 preserved).
- `git diff bb9549b..HEAD -- coordination/specs/` filtered to non-R70 → empty (no prior-round spec modifications).
- Also verified with the spec-triad commit lower bound: `git diff f62c327..HEAD --name-only` = 9 paths (the 7 above + `coordination/specs/Q-R70-SPEC-AUDIT.md` + `coordination/specs/Q-R70-SPEC.md`); all 9 are R70 spec-triad files in ALLOWED_SET.
- **Anti-scope PASS** under either SHA choice.

---

## § 5. Grilling output (self-review on this report)

| Check | Status |
|---|---|
| Every finding has a file:line reference | YES — all 4 MINORs + 2 OBS cite file:line |
| Any AC marked PASS without actual verification | NO — Reviewer independently re-ran `bash coordination/specs/Q-R70-EMPIRICAL.sh` (8/0 PASS/FAIL) + `pnpm exec node --test --test-reporter=tap test/*.test.js` (tests=455/pass=447/fail=5/skipped=3 verified) + `pnpm demo {clean-baseline,sdc-drift,common-mode-rack,event-conditional}` (4 CLI runs verified, scenario-specific output markers visible) + `git diff bb9549b..HEAD --name-only` (7 paths ⊆ ALLOWED_SET) |
| Right-reasons audit completed for 3+ tests | YES — AC-R70-1, AC-R70-3, AC-R70-4 audited; none self-confirming |
| Cold-review boundary preserved | YES — did NOT read `coordination/diagnostics/`, `coordination/logs/`, or `.prompt-*.md` files |
| Adversarial mandate honored | YES — assumed Implementer made ≥1 mistake; found MINOR-1 (false SHA attestation) + 3 other discipline gaps |
| Cite-then-verify on file:line citations | YES — every cited line re-verified by direct file read or grep before this report committed |

---

## § 6. Routing

**NEXT-ROLE:** MEMORIAL-UPDATER
**STATUS:** MERGE-READY (0 CRITICAL; 4 MINOR; 2 OBS — none blocking merge per CLAUDE-REVIEWER routing rule "MAJOR or below → STATUS: MERGE-READY")

Reviewer report path: `coordination/reviews/REVIEWER-REPORT-R70.md`.

Memorial-Updater inputs:
1. This report (`coordination/reviews/REVIEWER-REPORT-R70.md`)
2. `coordination/specs/Q-R70-SPEC.md` + `coordination/specs/Q-R70-SPEC-AUDIT.md` (Architect ceremony sidecar)
3. `coordination/NEXT-ROLE.md` (existing Architect + Implementer + Reviewer routing blocks)
4. `coordination/MEMORIAL.md` (Reviewer will append VIOLATION entries per CLAUDE-REVIEWER REINFORCED 2026-05-17 before routing)
5. `~/.claude/CROSS-PROJECT-MEMORIAL.md` (for cross-project rule sweep — Memorial-Updater pickup)

---

_End of REVIEWER-REPORT-R70.md._
