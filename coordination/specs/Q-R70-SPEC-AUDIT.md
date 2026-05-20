# Q-R70-SPEC-AUDIT.md — Architect ceremony sidecar for R70

**Round:** R70 (post-Phase-3-close demo scenario runner)
**Round-start SHA:** `4e30c2f` (chore(R70 directive))
**Audit scope:** P3 ten-axis verification + pre-route discipline application + Architect pre-prediction + decision rationale. Reviewer-authorized read; Implementer reads Q-R70-SPEC.md proper only.

---

## § 1. Architect session-entry empirical baseline

**Verified by direct command run at session entry, NOT inherited from R69 close attestation (per R25 MINOR-1):**

- `git rev-parse HEAD` → `4e30c2fe9558b9d9a5de2e60ec9c93f727680e52`
- `pnpm exec tsc -p tsconfig.test.json` → exit 0, zero diagnostics
- `pnpm exec node --test --test-reporter=tap test/*.test.js` → `tests=444 / pass=436 / fail=5 / skipped=3` (exit 1)
- Carry-forward fail identities (from `grep "^not ok"`): AC-R36-21, AC-R36-30, AC-R36-31, AC-R65-2, AC-R66-14 (5 — matches directive § Anti-scope item 6)
- `git status` → clean working tree

**Toolchain at session entry:** pnpm 11.x, Node v25.x, TypeScript per devDependencies pinned `^5.4.0`.

---

## § 2. P3 ten-axis verification (one sentence per axis)

**Correctness.** Each scenario invokes its named engine surface at the exact signature documented in Q-R70-SPEC § 1.3, verified by direct file read at the cited line ranges (Architect read `engine/detectors/betting-e-process.ts:72`, `engine/topology/common-mode-attribution.ts:131`, `engine/ds-integration/freeze-hook-factory.ts:87`, etc.).

**Completeness.** All 4 directive-required scenarios + Q-R70-EMPIRICAL.sh + package.json mods + README mods + 11 runtime ACs + 8 attestation ACs land per spec § 3; the § 5.1 branch-binding table proves every production branch has a covering AC OR an acknowledged gap with rationale.

**Consistency.** § 10.5 cross-section consistency sweep run: 4 scenario names + 5-AC carry-forward set + ALLOWED_SET 8 paths + `Demo complete.` literal all verified identical across spec sections by re-grep at spec close.

**Clarity.** No banned vague language ("correctly", "appropriately", "as needed") present in any AC; each AC uses Given/When/Then with concrete observable outcomes (regex match, deep equality, exit code, file existence).

**Coverage.** § 5.1 maps every switch case + every guard branch to a covering AC; 2 acknowledged non-load-bearing gaps (parseCliArg CLI glue + Box-Muller log-floor) documented with rationale.

**Constraints.** Anti-scope (engine frozen + no new deps + no real-cluster + no DS-repo + no round-evolution-fragile patterns) exhaustively enumerated at § 3.3 + § 6.1; 8-path ALLOWED_SET + 1 regex carve-out at § 3.2 is the binding diff-subset gate.

**Concurrency.** Single-process, single-threaded, fully synchronous; `DsEventConsumer` constructed but never `.start()`-ed so no HTTP bind; factory's `setTimeout` stubbed via injection; no async/await; no concurrency surface.

**Corner cases.** Box-Muller `rng()==0` (2^-32 probability) defensively floored; `updateBettingState` σ²==0 guard verified at engine source line 158; `attributeCommonMode` unknown-shard silently-skip path is avoided by construction (snapshot built first); unknown ScenarioName routes through the `never`-exhaustiveness throw at the switch's default case.

**Cost.** Per-scenario runtime <10 s well under the 30-60 s directive ceiling; Family A scenarios are 300 ticks × O(1) updateBettingState; attribution scenario is O(8·6 + 1); event-conditional scenario is constant-time; total under 1 s for all 4 if invoked end-to-end.

**Coupling.** Demo couples ONLY to the 7 engine surfaces enumerated in spec § 1.3 (all post-Phase-3-frozen); no coupling to test fixtures, prior-round specs, or DS-repo code; README couples to file-path link only; package.json couples to one CLI invocation string.

---

## § 3. Pre-route discipline application (Architect-side cross-project rule self-application)

| Rule | Architect-side application |
|---|---|
| 1 (`empirical-command-attestation`) | Baseline `444/436/5/3` encoded verbatim in spec § 5.2 from session-entry run; not inherited. |
| 2 (`architect-branch-binding-coverage`) | § 5.1 branch-binding table covers every production-code branch; 2 acknowledged gaps with rationale. |
| 3 (Implementer-side) | Spec § 4.2 prescribes discriminating assertions per AC; spec § 5.3 audits each AC's discriminability. |
| 4 (`anti-scope-allowed-set-forward-coverage`) | 8-path ALLOWED_SET enumerated upfront at § 3.2; NO live-file-count / forward-protection / anti-scope-diff-against-prior-round patterns per R62+R66+R68 cumulative lesson. |
| 5 (`rule-derivation-without-self-application`) | N/A at spec emit; the `ac-pattern-round-evolution-fragility` candidate from R62+R66+R68 was already flagged at R68 close; this round AVOIDS the pattern per directive halt #6 but does not derive a new rule. |
| 6 (`halt-discipline-no-DIAGNOSTIC-for-workaround`) | 10 halt conditions enumerated at § 6.1; NO carve-out for any pre-documented failure (per R56 reinforcement: halt-condition triggers exhaustive). |
| 7 (`derived-rule-propagation-mechanism-required`) | Surface (a) — § 7 of spec proper names every rule + disposition. Surface (b) — Implementer runs pre-commit-rule-sweep at chore-A per § 11. Surface (c) — N/A (no new rule derived). |

**Pre-emit grilling sweep** (§ 10 of spec proper):
- 10.1 verifiability — every claim verifiable; 4 spot-checks pass.
- 10.2 unstated assumptions — 5 assumptions surfaced and documented; assumption E (`.gitignore` excludes `*.js`) deferred to Implementer-time verification with explicit defensive ALLOWED_SET inclusion.
- 10.3 scope added — none; directive items 1-6 mapped 1:1.
- 10.4 Implementer guessing — none; TACTICAL AUTONOMY surface enumerated explicitly.
- 10.5 cross-section consistency — 7 cross-section tokens verified consistent.
- 10.6 R02-R68 architectural reinforcement sweep — 35 reinforcements checked; no outstanding violations at spec emit.

---

## § 4. Architect pre-prediction on outcomes

**At chore-A (post-Implementer):**

| Observable | Predicted value | Confidence |
|---|---|---|
| `pnpm exec tsc -p tsconfig.test.json` exit code | 0, zero diagnostics | HIGH (compilation is mechanical; no novel TS surface) |
| `pnpm exec node --test --test-reporter=tap test/*.test.js` test count | 455 | HIGH (444 baseline + 11 new q70 ACs) |
| `pnpm exec node --test ...` pass count | 447 | HIGH (436 baseline + 11 new q70 ACs all passing) |
| `pnpm exec node --test ...` fail count | 5 | HIGH (carry-forward stable; no new fails introduced) |
| `pnpm exec node --test ...` skipped count | 3 | HIGH (Phase 2 skipped tests preserved) |
| `pnpm exec node --test ...` exit code | 1 (non-zero due to carry-forward fails; same as session-entry baseline) | HIGH |
| `bash coordination/specs/Q-R70-EMPIRICAL.sh` block PASS count | 8 | HIGH |
| `bash coordination/specs/Q-R70-EMPIRICAL.sh` exit code | 0 | HIGH |
| AC-R70-1 (clean-baseline no firings) outcome | PASS — wealth stays well below 200 for all 10 shards | HIGH (under N(0,1) draws, expected M_t stays ≈ 1) |
| AC-R70-2 (sdc-drift shard-04 fires) outcome | PASS — under `SDC_DRIFT_PER_WINDOW = 0.4` from window 6 across 24 remaining windows, the cumulative drift contribution drives shard-04's wealth past 200 well before window 30 | **MEDIUM-HIGH — empirical confirmation at Implementer GREEN** (per § 6.1 halt #8: if drift constant insufficient, Implementer tunes within [0.3, 0.8]) |
| AC-R70-3 (common-mode-rack 1 candidate) outcome | PASS — `attributeCommonMode` deterministically surfaces exactly 1 candidate per the snapshot's rack-A 3-shard connection | HIGH (engine semantics verified at spec emit) |
| AC-R70-4 (event-conditional freeze) outcome | PASS — `activator.update()` returns input residual unchanged via reference equality | HIGH (engine semantics verified at spec emit) |
| AC-R70-5..8 (determinism) outcomes | PASS — LCG + Box-Muller + no Math.random + no Date.now + no process.hrtime | HIGH |
| AC-R70-9 (unknown scenario throws) outcome | PASS — exhaustiveness `never` assertion fires | HIGH |
| AC-R70-10 (listScenarios canonical order) outcome | PASS — const array literal matches | HIGH |
| AC-R70-11 (footer + non-empty) outcome | PASS — renderFooter trailing newline preserved | HIGH |

**Architect prediction caveat per § 5.2 in spec proper:** the test count + pass count predictions are derived arithmetic from spec § 4.2 (11 `test(...)` blocks under one `describe`). Implementer encodes ACTUAL counts verbatim at NEXT-ROLE.md attestation; do NOT reframe to match the prediction (Rule 1 sub-class `empirical-command-attestation`).

**Architect prediction caveat on SDC drift:** MEDIUM-HIGH confidence on AC-R70-2 because the wealth-martingale crossing depends on the specific LCG output sequence; if `SDC_DRIFT_PER_WINDOW = 0.4` produces a chosen-seed trajectory that does not cross threshold by window 30, the Implementer's TACTICAL AUTONOMY (within [0.3, 0.8] band) is the resolution mechanism. If the chosen seed's wealth crosses threshold BEFORE window 6 (drift not yet injected), it's a numerical anomaly that triggers halt #8 + DIAGNOSTIC.

---

## § 5. Decision rationale (what was picked vs rejected at architect time)

### Choice 1: Single-file vs multi-file demo runner layout

**Picked:** single file `tools/demo-scenario.ts` (~400 lines).

**Rejected:** multi-file `tools/demo-scenario.ts` + `tools/demo-scenarios/{clean-baseline,sdc-drift,common-mode-rack,event-conditional}.ts`.

**Why:** the 4 scenarios are tightly coupled to a shared LCG + shared ASCII renderer + shared `ScenarioResult` shape; splitting them across files would require either re-exporting the renderer (artificial coupling surface) or duplicating it (drift risk). The 400-line single-file form is below the threshold where readability degrades for a tools/ script. Future scenarios (operator may want a 5th or 6th) can split-then if file size becomes the bottleneck.

### Choice 2: Engine surfaces invoked per scenario (Approach C selection)

**Picked:** Selective engine integration — each scenario calls ONE engine surface directly with synthetic inputs that bypass calibrator + full-pipeline wiring.

**Rejected:** Approach A (full pipeline integration) and Approach B (pure narrator with no engine).

**Why:** see Q-R70-SPEC § 0 brainstorm + selection rationale. Briefly: A is over-budget on wiring + runtime; B doesn't demonstrate the product. C is the only approach that simultaneously honors anti-scope, exercises real engine, fits runtime budget, and produces a viewable narrative.

### Choice 3: 4 scenarios (vs 3 vs 5+)

**Picked:** clean-baseline + sdc-drift + common-mode-rack + event-conditional.

**Rejected:** 3-scenario (drop one) and 5+-scenario (add `e-bh-fdr` or `family-c-rff`).

**Why:** the 4 scenarios map 1:1 to PRD US-01..04. Dropping any one would leave a US uncovered. Adding `e-bh-fdr` would require constructing a 100-shard `FusedVerdict` array which is significant wiring; deferred to a future Phase 4 demo extension. Adding `family-c-rff` would require building the kernel-MMD-witness substrate which is similarly heavy.

### Choice 4: ASCII format (header + topology + table + verdict block)

**Picked:** `═════` heavy horizontal line headers + plain markdown-like tables + bulleted candidate list + canonical `Demo complete.` footer.

**Rejected:** Box-drawing UTF-8 tables (e.g., `┌─┬─┐`); colored ANSI escapes; JSON/YAML output formats.

**Why:** plain UTF-8 dividers render in all terminals + GitHub README + Slack snippets without rendering oddities. ANSI colors would require either a color-detection branch or unconditional color output that breaks pipe-to-file use cases. Box-drawing tables require careful column-width arithmetic that's brittle to scenario evolution. JSON/YAML defeats the narrative goal ("show this in 30 seconds").

### Choice 5: Determinism mechanism (LCG vs cryptographic RNG vs no RNG)

**Picked:** Numerical-Recipes 32-bit LCG with Box-Muller for Gaussian draws.

**Rejected:** `Math.random()` (not seedable), `crypto.randomBytes` (overkill + slower), no RNG (would require hard-coded numbers per shard per window which is brittle to evolution).

**Why:** the LCG is a 5-line implementation, deterministic by design, fast, and produces uniform-ish draws sufficient for a demo. The 32-bit state may have correlations a real statistician would flag, but for a 30-tick × 10-shard × 4-scenario demo this is overkill rigor. Box-Muller is the standard textbook transform.

### Choice 6: Demo-α (`5e-3` → threshold = 200) vs production α (`~3.3e-5` → threshold ≈ 30_000)

**Picked:** Demo-α = 5e-3.

**Rejected:** Production α = 4e-4/6 · 0.5 ≈ 3.3e-5.

**Why:** the production threshold of ~30,000 requires either many more windows (>100) OR a much larger drift constant (~1.5+) to cross within a 30-window demo. Demo-α = 5e-3 (threshold = 200) is the smallest α that produces a visible crossing within the 30-window budget under a moderate drift constant. The README + scenario header text discloses the demo's α choice ("threshold = 1/α = 200") so a viewer who later reads the production code is not surprised by the larger production threshold. This is a **disclosed pedagogical simplification**, not a numerical fudge.

### Choice 7: No subprocess test for CLI behavior

**Picked:** Tests invoke `runScenario` directly; no subprocess spawn of `pnpm demo <scenario>`.

**Rejected:** Spawn `pnpm demo` via `child_process.execSync` and assert on stdout.

**Why:** subprocess tests are 100-1000× slower (1 s vs ~1 ms per scenario) and add a `pnpm`-on-PATH dependency at test time. Direct invocation tests every load-bearing assertion the subprocess test would; the CLI glue is a 20-line wrapper covered by Q-R70-EMPIRICAL.sh Block 6 (file-text grep for `runScenario` switch + CLI guard structure).

### Choice 8: No chore-B; no SHA-injection two-state pattern

**Picked:** Single-state spec; chore-A is the only verification commit.

**Rejected:** Two-state spec (chore-A fails some AC; chore-B injects a SHA that flips the AC to pass).

**Why:** R62 + R56 + R66 cumulative reinforcement establishes that forward-protection two-state ACs are structurally fragile (chore-A failing-by-design is hard to attest verbatim; subsequent rounds add files that change diff counts incidentally). R70 has no need for the two-state pattern — the demo's verification is straightforward (run tests + check files exist + check anti-scope diff). The Q-R70-EMPIRICAL.sh `$ROUND_START_SHA` injection IS a one-time placeholder substitution at chore-A, NOT a chore-B two-state pattern (the SHA is stable post-injection; only one state exists).

---

## § 6. Cite-then-verify sweep (Architect surface)

Per CLAUDE-ARCHITECT REINFORCED 2026-05-20 (R65 MINOR-1): every specific AC number, file path, or section reference cited in this audit OR in the spec proper has been grep-verified or read-verified at spec close.

| Citation in spec proper | Verification at spec close |
|---|---|
| `engine/detectors/betting-e-process.ts:72` `freshBettingState` | Read at session entry; line 72-82 confirmed. |
| `engine/detectors/betting-e-process.ts:151` `updateBettingState` | Read at session entry; line 151-175 confirmed; in-place mutation at lines 165-173 confirmed. |
| `engine/topology/common-mode-attribution.ts:131` `attributeCommonMode` | Read at session entry; line 131-226 confirmed. |
| `engine/ds-integration/event-consumer.ts:169` `DsEventConsumer` class | Read at session entry; line 169 + constructor 176-181 confirmed (no `.start()` in constructor). |
| `engine/ds-integration/freeze-hook-factory.ts:87` `createFreezeHookFromDsEvents` | Read at session entry; lines 87-143 confirmed; opts surface 53-66 confirmed. |
| `engine/events/freeze-hook.ts:40` `freezeAwareUpdatePerShardResidual` + freeze gate at line 47 | Read at session entry; line 40 + 47 confirmed. |
| `engine/per-shard/warm-start.ts:38` `initialPerShardResidual` | Read at session entry; line 38-40 confirmed (returns `{n_samples:0, confidence:'none'}`). |
| `engine/types/verdict.ts:254` `TopologyNode.kind` enum + `:264` `TopologyEdge.relationship` | Read at session entry; line 254 + 264 confirmed (includes `'rack'` + `'gpu_shard'` + `'contains'`). |
| `tsconfig.test.json:6-8` includes `tools/**/*.ts` | Read at session entry; confirmed. |
| Directive halt #3 baseline `444/436/5/3` | NEXT-ROLE.md:89 grep-confirmed; matches session-entry empirical observation. |
| Directive ALLOWED modifications list (line 63-73) | NEXT-ROLE.md read; confirmed 11-path list matches § 3 inventory. |
| `coordination/MEMORIAL.md` carry-forward AC names (R36-21 / R36-30 / R36-31 / R65-2 / R66-14) | NEXT-ROLE.md grep at lines 207-211 + 209 confirmed (R68 close attestation lists all 5). |

**All citations verified. ✓**

---

## § 7. Amendments from prior version

**This is the first emission of Q-R70-SPEC.md.** No amendments. Future amendments (if ESCALATE fires) will be appended here with date + reason + scope.

---

_End of Q-R70-SPEC-AUDIT.md._
