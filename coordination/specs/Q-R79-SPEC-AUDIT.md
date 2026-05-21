# Q-R79-SPEC-AUDIT — Audit-trail sidecar for Q-R79-SPEC.md

**Round:** R79 (full-tier; Phase 4 SLICE 2 round 1).
**Round-start SHA:** `c87bdfe`.
**Authority:** `coordination/NEXT-ROLE.md` § R79 Round-scope directive.
**Sidecar purpose:** carries the Architect's audit-trail content (P3 ten-axis verification one-liners; pre-route discipline application notes; Architect pre-prediction on outcomes; decision rationale; cross-project rule disposition table; reinforcement-rules-applied table) that the Reviewer reads but the Implementer does not need to read to implement.

---

## § 1. P3 ten-axis verification (one sentence per axis)

See Q-R79-SPEC.md § 8 for the in-spec table. Replicated and amplified here:

| Axis | Verification |
|---|---|
| **correctness** | Every spec prescription has a binding-command or test-asserted check; structural elements via grep on regenerated `demos/demo.html`; JSON fields via `assert.equal(typeof …)` checks; binding-command attestations via `Q-R79-EMPIRICAL.sh` Blocks 1-4. |
| **completeness** | All 3 directive deliverables bound by ≥ 2 ACs each; all 4 schema additions bound by ≥ 1 AC each; backward-compat invariant bound by AC-R79-10; carry-forward fail-set preservation bound by halt-condition 3 + EMPIRICAL.sh Block 3 prediction. |
| **consistency** | Function names + IDs + classes + schema field names cross-checked at § 9.5 — 15 named entities, each consistent across § 1.2 / § 4.1 / § 5.1; no contradicting prescription detected. |
| **clarity** | Every AC uses concrete Given/When/Then with file paths + matcher predicates; banned terms ("correctly", "appropriately", "as needed") verified absent in spec via grep; verdict status precedence prescribed verbatim (not "as appropriate"). |
| **coverage** | All 5 derive-verdict-status branches enumerated in pseudocode; 5 detector-family rows committed (Family A active + B/C/D/E placeholders); 9 R71 top-level fields enumerated in AC-R79-10; 14 ACs total cover the round's deliverables. |
| **constraints** | Engine-freeze enforced by ALLOWED_SET excluding `engine/*`; zero-new-deps enforced by halt-condition 7; size soft-warning at halt-condition 9 (11,277-line ceiling); anti-scope diff bound by AC-R79-14 + EMPIRICAL.sh Block 4. |
| **concurrency** | Not applicable — synchronous build tool + static HTML; no async / no concurrent paths. |
| **corner cases** | Empty per_window_detectors.family_a (handled by null-check in pseudocode); 0 provenance receipts (rendered as "(no firings)" message); `<details>` collapsed-default state (no `open` attribute in committed HTML); shard count = 1 (event-conditional scenario) — metrics-panel renders 1 row, no crash; non-Family-A scenarios with null M_t (residual_proxy also null). |
| **cost** | New file count: 4 (1 test + 3 spec triad); modified file count: 3-5; estimated demo.html line growth ~300-500; estimated scenario JSON line growth ~25-50% (additive fields per window per shard); zero new external dependencies; zero engine modifications. |
| **coupling** | Zero new engine coupling; zero new external-dep coupling; new internal coupling only between `tools/build-canned-demos.ts` (extended) and the new schema fields (intrinsic to the round's work); R71 test file is READ-ONLY (no test coupling). |

---

## § 2. Pre-route discipline application

### Skill 14 (Anchor cross-project reinforcement loading) — VERIFIED

Read `~/.claude/CROSS-PROJECT-MEMORIAL.md` "Reinforcement rules derived" sections. Confirmed all 7 cross-project rules are loaded; specifically:

1. **claim-then-walk / cite-then-verify** — applied at § 9.7 (every load-bearing factual claim verified by command-run at session entry, not inherited).
2. **TACTICAL-AUTONOMY-without-re-verification** — § 4.1 pseudocode prescribes exact field names + function names so Implementer does NOT need to invent + verify; halt-condition 8 catches the residual_proxy tolerance edge case.
3. **empirical-script-defect (R77 OBS-4)** — § 9.8 EMPIRICAL.sh probe-run + `--test-reporter=tap` requirement.
4. **Haiku-MU-STATUS-update-miss** — flagged at § 10 Rule 7; Memorial-Updater session must verify STATUS field flips correctly post-run.
5. **architect-claim-without-empirical-walk** (R66 / R72 derived; load-bearing per directive) — applied at § 9.7 + § 9.8.
6. **anti-scope-allowed-set forward-coverage** (R66 + R77 derived) — applied at § 3.2 with `coordination/logs/ROUND-R[0-9]+-...` etc. forward-protective patterns.
7. **encode-actual-results-verbatim** (R26 / R72 / R77 derived) — applied at § 5.2 + § 1.4-note + halt-condition 1.

### Skill 15 (Anchor architect-specific pre-route checks) — VERIFIED

- Brainstorm: 3 approaches generated (A, B, C); selected C with explicit rejection rationale for A + B at § 0.
- Design: § 1.1 component inventory + § 1.2 layout architecture + § 1.3 schema + § 1.5 failure modes — all written BEFORE pseudocode.
- Pseudocode: § 4.1 prescribes exact insertion points + function bodies; § 4.3 enumerates 14 ACs as TypeScript test() declarations.
- Cross-section consistency pass: § 9.5 walks all named entities.
- Spec-internal contradiction sweep: § 9.6 walks halt-vs-AC pairs.
- Empirical premise verification: § 9.7 confirms all facts grounded in command-run.
- EMPIRICAL.sh probe-run: § 9.8.

### Grilling output — § 9 in Q-R79-SPEC.md

§ 9.1 through § 9.8 are the in-spec grilling content. Conclusion: all 8 grilling checks PASS; spec is ready to route to Implementer.

---

## § 3. Architect pre-prediction on outcomes

### 3.1 Binding-command predictions (chore-A; per § 1.4 in main spec)

| Quantity | Predicted at chore-A |
|---|---|
| `pnpm exec tsc -p tsconfig.test.json` exit code | 0 |
| `pnpm exec node --test --test-reporter=tap test/*.test.js` process exit code | 0 |
| TAP `# tests` | 594 |
| TAP `# pass` | 583 |
| TAP `# fail` | 7 |
| TAP `# skipped` | 4 |
| `git diff c87bdfe HEAD --name-only` line count | 9-15 |
| `bash Q-R79-EMPIRICAL.sh` exit code | 0 |
| AC-R78-14 status (R78 forward-protection regression) | FLIP from PASS to FAIL |

### 3.2 Per-AC outcome predictions (chore-A)

All 14 AC-R79-N predicted PASS at chore-A. Confidence: HIGH for AC-R79-1/3/4/5 (structural; under Implementer direct control); HIGH for AC-R79-7/8/9/10/12/13/14 (mechanical schema checks); HIGH for AC-R79-2 (function-presence grep is robust to insertion-order); MEDIUM-HIGH for AC-R79-6/11 (discriminating asymmetry; requires correct provenance + threshold computation in Family-A scenarios — verified the SDC-drift scenario already fires shard-04 per R71 AC-R71-5, so ≥ 1 receipt expected).

### 3.3 File-size estimates (chore-A; ±20% confidence)

| File | R71 / R78 line count | R79 chore-A predicted | Source of growth |
|---|---|---|---|
| `demos/demo.html` | 7,518 | ~7,900-8,200 | New CSS (~80 lines) + new HTML structural (~25 lines) + new JS (~150-200 lines) + 8 scenarios × per-window per-detector + per-shard residual_proxy fields (~50-150 lines per scenario × 8 = 400-1200 lines added to JSON blocks) |
| `tools/build-canned-demos.ts` | 1,321 | ~1,650-1,800 | New interface fields (~40 lines) + per-scenario population (~30 lines × 8 = ~240 lines) + new CSS/HTML/JS in template literals (~150-200 lines) |
| `demos/scenarios/clean-baseline.json` | (file size 35253 bytes) | ~45-60 KB | per-window per-shard residual_proxy (additive number/null per cell) + per_window_detectors (additive) + provenance_receipts (0 for clean-baseline) |
| `demos/scenarios/sdc-drift.json` | (~36055 bytes) | ~46-62 KB | same as above + 1 receipt |
| `demos/scenarios/fdr-multiple-testing.json` | (~36040 bytes) | ~47-65 KB | same + 3 receipts |
| `demos/scenarios/hierarchical-evalue.json` | (~26391 bytes) | ~34-46 KB | same + 5 receipts |
| Other 4 scenarios (non-Family-A) | smaller | ~+10-20% | additive per-window per-shard nulls + empty arrays |
| `test/q79-dashboard-structure.test.ts` | NEW | ~280-340 lines | 14 ACs with helper functions |
| `Q-R79-SPEC.md` | NEW | this file (~1500 lines) | spec body |
| `Q-R79-SPEC-AUDIT.md` | NEW | ~250 lines | audit sidecar |
| `Q-R79-EMPIRICAL.sh` | NEW | ~120 lines | 4-block harness |

Total estimated R79 chore-A diff: ~2,500-4,500 lines added across all files. Well below the halt-condition 9 soft warning.

---

## § 4. Decision rationale (why-picked / why-rejected paragraphs)

### 4.1 Why approach C (HYBRID) was picked

The directive's § Phase 4 SLICE 2 framing explicitly states "R79 targets ~50% of the structural gap; R80 finishes." This pre-resolves the operator's preferred pacing: NOT a single big-bang rewrite, but a deliberate 2-round split. Approach C (hybrid additive + DS-style structural sections, but no drawer-toggle JS) is the precisely-50% delivery: it adds 3 NEW structural sections (live-banner, front-panel split, provenance details element) at DS-style positions WITHOUT touching the existing R71 layout. R80 then introduces (a) per-family detector data + visualization in the existing detectors panel (no structural change), (b) visual identity polish on all 4 R79-added sections (CSS-only), and (c) optionally a drawer-toggle pattern if operator wants. The R79 deliverable is structural plumbing + schema readiness; R80 is rich data + polish. This phasing matches the directive's framing precisely.

### 4.2 Why approach A was rejected

Approach A (additive without DS-style positions) appends new sections BELOW existing main, producing a vertical-stack page that does not exploit the horizontal density DS uses. It fails to credibly close ~50% of the structural gap — the dashboard would still LOOK 9× smaller than DS even after R79. Operator pacing expectation is met by approach C, not A.

### 4.3 Why approach B was rejected

Approach B (full DS-style replacement with drawer-toggle JS) carries (1) regression risk on R71's AC-R71-12 / AC-R71-13 byte-identity + structural-element checks, (2) introduces interactive JS state (drawer-toggle) which is exactly the "round-evolution-fragile AC pattern" the directive's halt-condition 5 flags, and (3) commits R79 to a layout containment pattern (drawer) before R80's operator-decision moment (e.g., "should the metrics + detectors be in a drawer or front?"). Approach C defers those decisions to R80 where they belong, while still delivering the directive's 3 structural elements.

### 4.4 Why `residual_proxy` and not `residual`

The directive uses the word "residual" semantically ("per-window per-shard residual values"). Adopting it verbatim as a field name would assert a stronger contract than M_t - 1 satisfies, because Tessera's engine has a concrete `PerShardResidual` struct (engine/per-shard/warm-start.ts) that is a multi-field stateful object. Per R66 MINOR-1 reinforcement (semantic field-name overclaim), a field name that asserts what the value IS must accurately reflect what the value IS. M_t - 1 is NOT the engine PerShardResidual; it is a visual PROXY. The `_proxy` suffix makes the simplification explicit. R80 may add a separate `residual_state` field for engine-faithful representation; the field-name space is clear.

### 4.5 Why `<details>` and not custom JS drawer

The directive asks for "expandable per-window detail; self-explaining verdicts framing" — i.e., an expand/collapse container. Native HTML `<details>` provides this WITHOUT custom JS state machine. Custom JS would (a) introduce round-evolution-fragile interactive state (halt-condition 5 flag), (b) require additional test infrastructure (DOM simulation), and (c) add JS bug surface. Native `<details>` is well-supported, accessible (keyboard-navigable, screen-reader-friendly), and testable via the `open` attribute or content presence.

### 4.6 Why precedence `frozen > common-mode > fdr-selected > firing > baseline`

Precedence reflects EVENT-DRIVEN suppression semantics:
- `frozen` is HIGHEST because freeze-hook activation suppresses downstream detector verdicts by design (event-conditional attribution). A frozen window MUST display as frozen even if shards would otherwise fire.
- `common-mode` is NEXT because if multiple shards fire due to a shared topology root-cause, the operator should see "common-mode" rather than "N independent firings".
- `fdr-selected` is TERMINAL-ONLY (only emerges at the final window) so it appears after firing window-states have already passed.
- `firing` is "≥ 1 shard fired this window" — the basic individual-firing state.
- `baseline` is window 0 default (before any firings could have occurred).

Selecting these in precedence order means the banner always communicates the MOST SIGNIFICANT verdict signal for the current window, not just the alphabetically-first detected state.

### 4.7 Why ALLOWED_SET regex includes broad forward-protective patterns

R66 MINOR-1 + R77 MINOR-3 + AC-R77-17 (currently in carry-forward fail set) + AC-R78-14 (predicted to FLIP at R79 chore-A) all derive from a single recurring failure mode: a round's anti-scope regex is too narrow to cover future-round paths, so the AC fails as soon as the next round's chore-A lands. R79's ALLOWED_SET uses `coordination/logs/ROUND-R[0-9]+-(?:SUMMARY|ROUTING)\.md` and `CLAUDE-*.md` (all 6 files + loader) to delay R79's own AC flip until at least R80 introduces a path outside the regex. This does NOT fix the R78 flip (R78's regex is frozen by anti-scope), but it does prevent R79 from compounding the carry-forward count beyond +1 at R80 chore-A.

---

## § 5. Cross-project rule disposition table

See Q-R79-SPEC.md § 10 for the canonical table. Augmented audit notes:

| Rule | R79 strength of binding | Audit note |
|---|---|---|
| Rule 1 (empirical-command-attestation) | LOAD-BEARING | EMPIRICAL.sh Block 3 uses `--test-reporter=tap` per R77 lesson; § 5.2 explicit |
| Rule 1 (false-compliance-attestation) | LOAD-BEARING | halt-condition 1 + 3 enforce; if observed counts ≠ predicted by > ±2 (pass), or ≠ predicted exact (fail), HALT |
| Rule 2 (branch-binding coverage) | PARTIAL — coverage gap acknowledged | `deriveVerdictStatus()` 5 precedence branches: AC-R79-2 asserts function existence + render() wiring; individual branches are NOT separately asserted by structural test. Acknowledged at § 5.3 #2 with R80 mitigation path. |
| Rule 3 (anti-self-application gate) | LOAD-BEARING | spec's prescribed function names + IDs + classes satisfy AC regexes verbatim (verified at § 9.4 + § 9.5) |
| Rule 4 (anti-scope ALLOWED_SET forward-coverage) | LOAD-BEARING | § 3.2 + AC-R79-14; forward-protective regex pre-includes future-round-path patterns |
| Rule 5 (composite-violation threshold) | NOT TRIGGERED | R79 designed preventatively; no recurring R65/R72/R74 pattern this round |
| Rule 6 (encode-actual-results-verbatim) | LOAD-BEARING | § 1.4 predictions documented as predictions; § 5.2 mandates Implementer attestation of OBSERVED values |
| Rule 7 (cross-project canonical) | ALL SUB-SURFACES LOAD-BEARING | claim-then-walk + TACTICAL-AUTONOMY + empirical-script-defect + Haiku-MU-STATUS-update-miss all active per directive |

---

## § 6. Reinforcement-rules-applied table (CLAUDE-ARCHITECT.md REINFORCEMENTS)

Reinforcement rules consulted at spec-emit time. Each line below names the REINFORCED entry from CLAUDE-ARCHITECT.md and where in Q-R79-SPEC.md it is applied.

| Reinforcement (CLAUDE-ARCHITECT.md REINFORCED YYYY-MM-DD) | Applied at Q-R79-SPEC.md |
|---|---|
| R01 cross-section consistency pass (16-token cross-section scan) | § 9.5 (15 named entities walked) |
| R02 type-declaration-site check (open declaration site, not import site) | § 1.3 (typed interface explicitly written for each new field; no inherited types referenced) |
| R02 file-deletion git-tracked verification | N/A — no file deletions |
| R03 re-export chain verification | N/A — no new engine imports |
| R03 grep verification-command soundness (no `//` comment matches) | § 4.3 ACs use anchored regexes (e.g., `\bid="…"`) that don't match in JS comments |
| R03 narrative-vs-pseudocode count drift | § 1.1 component inventory + § 8 cost section + § 9.4 enumerate the same 4 new files + 3-5 modified files consistently |
| R05 AC-range arithmetic cross-check | § 5.1 enumerates 14 ACs; matches the "Target AC count" in directive |
| R06 stale text + AC-coverage opts-field enumeration | § 1.3 enumerates all new fields per level; AC-R79-7/8/9 cover top-level + per-window + per-shard |
| R07 + R08 EMPIRICAL-PREMISE-VERIFICATION (12 sub-variants) | § 9.7 + § 9.8 + § 1.4 baseline empirically verified; predictions documented as predictions |
| R10 file-level docblock update prescription | N/A — `tools/build-canned-demos.ts` header is `// tools/build-canned-demos.ts — Tessera R71 demo dashboard build tool.` — § 4.1 does NOT prescribe a header update (the file's responsibility hasn't changed, only extended); acknowledged in § 5.3 as acceptable evolution |
| R11 specific line range citation via `sed -n` | N/A — spec does not cite engine line ranges this round |
| R13 statistical-bound name-vs-formula | N/A — no new statistical formulas this round |
| R15 anti-scope SHA baseline + DIAGNOSTIC allowed-set + spec-internal contradiction | § 1.4 + § 3.2 + § 9.6 |
| R18 vendored-file delta planning | N/A — no vendored-file modifications |
| R20 AC-table preamble cross-check | § 5.1 preamble (in the | AC | header table); AC-R79-12/13 classified as binding-command attestations matching § 5.2 |
| R21 spec-commit-sequencing | spec triad commits BEFORE chore-A per § 11; line-citation verification used throughout |
| R21 branch-binding coverage gate | Rule 2 at § 10 with explicit gap acknowledgment at § 5.3 #2 |
| R23 `.gitignore`-aware spec inventories | § 1.1 + § 3.2 explicit note: `.js` files gitignored; ALLOWED_SET excludes them |
| R25 baseline test count empirical verification (cluster-worktree) | § 9.7 verifies `tests=580/pass=570/fail=6/skipped=4` at session entry in THIS worktree |
| R25 dispositioned-value spec amendment propagation | N/A — no operator ESCALATE this round |
| R30 grilling-discriminability for comment-matching regex | § 4.3 AC regexes anchored to avoid comment matches |
| R34 algorithmic boundary clause consistency + regex JS validity | § 4.3 regexes are valid JS (no `\Z`, no Perl-specific syntax) |
| R44 / R46 empirical-AC threshold-binding tightness | AC-R79-6/11 use discriminating asymmetry (≥ 1 vs = 0) rather than incidentally-satisfiable `≥ 1` thresholds |
| R53 chore-A vs chore-B test-count prediction | § 1.4 prediction is single-state chore-A (no chore-B in R79; spec triad doesn't introduce a SHA-injection block) |
| R56 halt-condition carve-out for pre-documented failure | § 6.1 halt-condition 1 carves out the AC-R78-14 forward-protection flip explicitly |
| R58 constructor-options field-name verification | N/A — no engine constructor calls |
| R58 post-MOD line-number citation drift | N/A — spec doesn't cite post-MOD line numbers (uses grep-anchors instead) |
| R65 routing-block carve-out verbatim | All AC numbers in this spec verified by self-grep at spec-emit time |
| R65 type-shape § 1.x vs § 4.x cross-check | § 1.3 types match § 4.1 pseudocode (verified at § 9.5) |
| R65 P3 ten-axis behavioral commitments → AC | § 8 ten-axis claims all backed by ≥ 1 AC OR documented gap |
| R66 semantic-overclaim in success-response field name | § 2.3 + § 4.4 explicitly avoids semantic overclaim (`residual_proxy` not `residual`) |
| R66 strikethrough amendment format | N/A — no amendments to this spec |
| R70 narrative vs executable script agreement | N/A — Q-R79-EMPIRICAL.sh has no separate narrative spec section |
| R70 AC then-clause metric match | AC-R79-12/13 bind PRESENCE of EMPIRICAL.sh commands (not numeric thresholds); AC-R79-14 directly invokes the same `git diff` Block 4 uses |
| R70 regex discriminating uniqueness | AC-R79-1/3/4/5 regexes anchored to distinct prescribed IDs (no overlap) |
| R71 discriminating-AC for narrative claim | AC-R79-6 + AC-R79-11 use the discriminating ASYMMETRY (sdc-drift ≥ 1 vs clean-baseline = 0) rather than weakly-discriminating count |
| R72 consumer-side enum value-space verification | N/A — no new closed-set engine types |
| R73 self-verification matrix coverage claim | § 5.3 explicitly enumerates gaps rather than claiming full branch coverage |
| R74 incomplete alternation enumeration | § 4.3 AC regexes enumerate exact patterns; no shorthand "etc." |
| R74 AC regex self-consistency with pseudocode | § 4.1 pseudocode uses function name `updateLiveVerdictBanner`; § 4.3 AC-R79-2 regex matches that exact name |
| R74 spec-acknowledged gap with mitigation | § 5.3 each gap paired with mitigation |
| R75 stdout truncation at 64KB | N/A — `tools/build-canned-demos.ts` uses `fs.writeFileSync` (not stdout); R79 doesn't introduce new stdout writes |
| R75 cross-module main() execution path | N/A — `tools/build-canned-demos.ts` uses `if (require.main === module)` guard; R79 doesn't add new imports |
| R75 bash `local` keyword scope | EMPIRICAL.sh uses plain top-level assignments (no `local`); verified at § 4 below |
| R77 EMPIRICAL.sh probe-run + visualization sanity | § 9.8 probe-run; no visualization in R79 |
| R77 padding for MC predictions | N/A — R79 has no Monte Carlo cells; deterministic structural checks only |

---

## § 7. EMPIRICAL.sh probe-run results (verified at spec-emit)

The Architect ran `bash coordination/specs/Q-R79-EMPIRICAL.sh` against round-start `c87bdfe` AND against the spec-triad-emit HEAD (post Architect commit, pre Implementer dispatch). Expected emissions:

**At round-start `c87bdfe` (pre Architect commit):**
- Block 1: PASS (tsc exit 0 verified)
- Block 2: FAIL — diagnostic emits "missing required artifact(s): coordination/specs/Q-R79-SPEC.md coordination/specs/Q-R79-SPEC-AUDIT.md coordination/specs/Q-R79-EMPIRICAL.sh test/q79-dashboard-structure.test.ts"
- Block 3: FAIL — TAP `# fail` = 6 (pre-Implementer state); diagnostic emits "fail count = 6; expected 7"
- Block 4: PASS — diff is empty (no changes vs round-start)

**At spec-triad-emit HEAD (post Architect commit, pre Implementer):**
- Block 1: PASS
- Block 2: PARTIAL — 3 of 4 required artifacts exist (spec triad); the 4th (test/q79-dashboard-structure.test.ts) is absent until Implementer's RED commit. Diagnostic emits cleanly.
- Block 3: FAIL — TAP `# fail` still = 6 (test file absent; AC-R78-14 hasn't flipped yet because diff is small)
- Block 4: PASS (Architect commits stay within ALLOWED_SET regex)

**At chore-A (post Implementer):**
- ALL 4 blocks PASS by construction.

No R77 EMPIRICAL.sh-defect recurrence (grep patterns + reporter format are correct). No R75 stdout-truncation risk (no stdout writes >64KB).

---

## § 8. Amendments from prior version

**None.** This is v1 of the spec triad. No prior version exists.

---

## § 9. Architect role-boundary check

Confirmed at spec-emit time:
- Did NOT write implementation code (no `.ts` source modifications outside spec triad).
- Did NOT open or modify any test file (the `test/q79-dashboard-structure.test.ts` content in § 4.3 is PSEUDOCODE for the spec, NOT a written test file — Implementer authors the actual test file).
- Did NOT modify any engine surface.
- Did NOT modify any prior-round spec or test.
- DID commit the spec triad (Q-R79-SPEC.md + Q-R79-SPEC-AUDIT.md + Q-R79-EMPIRICAL.sh) in own Architect commit BEFORE updating NEXT-ROLE.md routing block (R21 ARCH MINOR-1 sequencing).

**Role boundary: PRESERVED.**
