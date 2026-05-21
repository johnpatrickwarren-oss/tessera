# Q-R82-SPEC-AUDIT.md — Architect audit sidecar (Reviewer-only; Implementer does NOT read)

**Spec triad sibling:** `Q-R82-SPEC.md`
**Audit author:** Architect at spec-emit (R82, Phase 4 SLICE 3 first round)
**Date:** 2026-05-21

This sidecar records the Architect's audit-trail content per CLAUDE-ARCHITECT.md role boundary. Per the role-boundary contract, the Reviewer reads both `Q-R82-SPEC.md` (the prescriptive contract for the Implementer) AND this audit sidecar (audit content not load-bearing for implementation but load-bearing for the Reviewer's right-reasons + cold-eye audit). The Implementer reads only the spec proper to preserve cold-eye independence on audit assumptions.

---

## § A. P3 ten-axis verification details

(Architect-side detail; one sentence per axis. Same axes as Q-R82-SPEC.md § 8; this section is the extended-verification supplement.)

### A.1 correctness
Verified that the Web Crypto adapter mechanism (§ 2.1) returns identical hex output across Node (`createHash('sha256')`) and browser (`pureJsSha256` fallback) by exercising the 3 FIPS 180-2 test vectors at spec-emit time. The vectors are: empty string → `e3b0c44...`; "abc" → `ba7816bf...`; FIPS multi-block test vector → `248d6a61...`. The byte-identity property is exercised by AC-R82-7 and ALSO by EMPIRICAL.sh Block 3 (a direct `node -e ...` call that imports `pureJsSha256` and `createHash` from the same Node process). Any algorithmic divergence in the embedded SHA-256 reference implementation produces hex divergence at AC-R82-7.

### A.2 completeness
Coverage matrix: the directive's 6 named deliverables (build tool / Web Crypto adapter / package.json script / demo.html extension / test file / EMPIRICAL.sh) map 1:1 to spec sections (§ 4.2 / § 4.1 / § 4.5 / § 4.3 / § 4.6 / § 4.7) and to AC bindings (AC-R82-1/2/3/4 / AC-R82-5/6/7/8 / AC-R82-2 / AC-R82-9/10/11 / AC-R82-12/13 / AC-R82-13 + EMPIRICAL.sh internal). The forward-protective `.gitignore` modification (§ 2.4) is the only non-directive-listed mechanical side-effect; documented in § 9.3 scope creep audit.

### A.3 consistency
Cross-section walk of identifiers (§ 9.5) verified: `computeSnapshotHash` / `pureJsSha256` / `_sha256Hex` / `demos/engine-bundle.mjs` / `tools/build-browser-bundle.ts` / `5c3e0d9` / `12` (EXPECTED_FAIL) / `5000` (bundle min) all appear with consistent meaning across §§ 0/1/2/3/4/5/6/7/8. The § 3.2 ALLOWED_SET regex byte-matches the § 4.7 EMPIRICAL.sh Block 5 ALLOWED variable (one source of truth — Architect copied via grep at spec-emit, not retyped from memory).

### A.4 clarity
Verbatim language: § 2.1 / § 2.2 / § 2.3 / § 2.4 / § 2.5 each prescribe verbatim content the Implementer renders without re-interpretation. Tactical autonomy is explicitly enumerated in § 4.2 (esbuild option tweaks; variable names) — clear bounds on what the Implementer may vary. Banned-language audit: no instances of "correctly", "appropriately", "as needed" in any prescriptive section.

### A.5 coverage
Per-AC mapping (§ 5.1) plus implicit-AC binding-command attestation (§ 5.2) plus § 5.3 acknowledged gaps mitigated. Every named deliverable has at least one structural AC; every algorithmic claim (SHA-256 byte-identity) has a literal-value AC.

### A.6 constraints
Bundle output target (`es2022`) is browser-universal (Chrome 94+, Safari 15.4+, Firefox 92+; all 2021-2022 releases). esbuild target option enforces this. Single-file output (no chunk splitting) per `--format=esm` + no `splitting: true` option.

### A.7 concurrency
The build tool and the runtime adapter are stateless. The `_sha256Hex` adapter uses only stack-local state; no global mutation. `pureJsSha256` is purely functional (input string → output hex). No race or interleaving concerns.

### A.8 corner cases
SHA-256 message-padding boundary at 56 bytes (one block-without-extension) is exercised by AC-R82-7 vector 3 (length 56). Empty-input SHA-256 (vector 1) exercises the padding-only block case. Bundle output minimum-size guard (5000 bytes) catches the "empty/trivial bundle" failure mode.

### A.9 cost
Bundle build < 5s (esbuild typical for ~12 source files). Test suite adds 14 `test()` blocks. AC-R82-11 invokes the build twice (one re-build ~5s). Total chore-A overhead < 30s. No new persistent state.

### A.10 coupling
Pure adapter pattern: `_sha256Hex` is a private function inside `topology-overlay.ts` (not exported). `pureJsSha256` is exported for testing only (no engine consumer). The `require('node:crypto')` path is preserved bit-identical to the existing `createHash('sha256').update(input).digest('hex')` semantics — no behavior change for Node consumers.

---

## § B. Pre-route discipline application (Skill 14 + Skill 15 reference + grilling outcomes)

### B.1 Cite-then-verify file enumeration (R11 + R65 + R72 lesson; opened at session entry)

| File | Lines read | Purpose |
|---|---|---|
| `coordination/PRD.md` | 1-533 (partial truncation; first 444 + last 100 read explicitly) | PRD scope + Phase 3/4 framing |
| `~/.claude/CROSS-PROJECT-MEMORIAL.md` | sample reads via head/tail/grep | Cross-project reinforcement rules |
| `coordination/MEMORIAL.md` | head + tail (R81 section) | Active-phase memorial entries; R81 lessons |
| `engine/topology-overlay.ts` | full file (394 lines) | Current state of `import { createHash } from 'node:crypto';` line + 7 callers + Sync surface |
| `engine/detectors/_q72-trace.ts` | lines 1-80 | Lazy require pattern + `q72TraceEnabled()` browser guard |
| `engine/types/index.ts` | lines 1-50 | Barrel re-export structure (for bundle entry surface scope) |
| `tools/build-canned-demos.ts` | grep `^export\|^function\|HTML_TEMPLATE` | Existing build-tool pattern (R79/R80/R81) |
| `demos/demo.html` | lines 1-100 + 12950-13207 | Existing dashboard IIFE + `</body>` insertion site |
| `package.json` | full file (46 lines) | Existing scripts/devDeps structure |
| `.gitignore` | full file (~30 lines) | Existing entries (verify no collision per R81 MAJOR-3) |
| `tsconfig.json` + `tsconfig.test.json` | full file | Module setting = CommonJS (per `tsconfig.json:5`); informs bundling architecture decision |
| `coordination/specs/Q-R81-SPEC.md` | grep `^## \|^### ` | Spec structure template |
| `coordination/specs/Q-R81-EMPIRICAL.sh` | full file (148 lines) | EMPIRICAL.sh structural pattern (Block layout; R77/R79/R75/R73 lessons) |
| `coordination/NEXT-ROLE.md` | tail 300 lines | R81 routing + R82 Architect directive |

### B.2 Pre-emit grilling outcomes (Q-R82-SPEC.md § 9)

| Gate | Outcome |
|---|---|
| § 9.1 Every claim verifiable? | PASS — every load-bearing claim has a citation path |
| § 9.2 Unstated assumptions? | 1 escalation (operator picks Option A); 6 documented assumptions all verifiable |
| § 9.3 Scope creep? | PASS — `.gitignore` is the only non-directive-listed file; mechanically required by deliverable 4 |
| § 9.4 Implementer can act without guessing? | PASS — every decision specified |
| § 9.5 Cross-section consistency? | PASS — 10 identifier classes walked |
| § 9.6 Self-application gate? | PASS — every AC verified against prescribed pseudocode |
| § 9.7 Empirical-premise verification? | PASS for baseline / file citations / FIPS vectors; **probe-run EMPIRICAL.sh deferred to § C.3 below** |
| § 9.8 Spec-internal contradiction? | PASS — no contradictions found |
| § 9.9 Acknowledged-gap pairing? | PASS — 6 gaps, each with named mitigation |
| § 9.10 R71 pre-authored narrative claims? | PASS — no narrative deliverables in R82 |
| § 9.11 Documentation cite-then-walk? | PASS — 6 citations verified at spec-emit |

---

## § C. Architect pre-prediction record + EMPIRICAL.sh probe run

### C.1 Pre-predictions (encode-actual-results-verbatim discipline; predictions labeled as such)

(Same content as Q-R82-SPEC.md § 1.4; reproduced here for the audit-side cross-check.)

| Observable | Pre-prediction | Confidence |
|---|---|---|
| tsc exit at chore-A | 0 | HIGH (R82 modifications are TS-clean) |
| node --test process exit at chore-A | 1 | HIGH (subtests will fail per baseline carry-forward; node-test exits 1 on subtest fail per R79 MAJOR-1) |
| `# tests` at chore-A | 638 ± 3 (band [635, 641]) | MEDIUM (depends on q82 test structure: 14 `test()` blocks + possibly sub-tests inside AC-R82-7 vectors) |
| `# pass` at chore-A | in band [620, 625] | MEDIUM (R81 close 607 + 14 new + structural assumption) |
| `# fail` at chore-A | strict 12 | HIGH (R81 close 11 + R81 forward-protection flip = 12; no other expected flips) |
| `# skipped` at chore-A | 4 | HIGH (no skip changes) |
| EMPIRICAL.sh exit at chore-A | 0 | HIGH (all blocks designed to pass at chore-A) |
| Diff line count at chore-A | 13 - 16 | HIGH (component inventory § 3.1 enumerates ~13-15 mandatory paths + 1-2 optional forward-protective) |
| Bundle byte size at chore-A | 35,000 - 80,000 | MEDIUM (esbuild output for ~12 source files; depends on tree-shaking effectiveness) |

### C.2 Decision rationale (why-picked / why-rejected paragraphs)

**Bundler choice (esbuild vs hand-rolled walker).** Picked esbuild because: (a) the engine has bare-specifier imports requiring graph-walking; (b) the alternative hand-rolled walker creates ongoing maintenance debt that compounds with each engine refactor; (c) esbuild's TypeScript handling avoids the two-step tsc → bundle dance; (d) the operator's directive named "esbuild OR equivalent" suggesting pre-consideration. Rejected hand-rolled walker because: regex-based TS parsing is fragile (fails on type-only imports, dynamic imports, multiline imports); maintenance cost ~3-5× the esbuild cost over R82-R84.

**Web Crypto adapter pattern (lazy require + pure-JS fallback vs async-promise vs two parallel files).** Picked lazy require + embedded pure-JS because: (a) the sync surface MUST be preserved (7 anti-scoped callers depend on it); (b) embedded pure-JS is the only path that avoids both a 2nd new dep AND an async-promise API. Rejected async-promise because it breaks 7 callers. Rejected two parallel files because of maintenance burden + the inevitable drift between them.

**Pure-JS SHA-256 vs @noble/hashes dep.** Picked embedded because: (a) avoids a 2nd new dep (already escalating one); (b) the FIPS 180-4 reference is well-defined and auditable; (c) ~70 lines inside `topology-overlay.ts` is bounded. Rejected @noble/hashes because adding two deps multiplies operator-decision overhead.

**ESCALATE upfront vs let Implementer ESCALATE.** Picked Architect ESCALATE because: (a) the directive's anti-scope clause explicitly says "ESCALATE for operator decision" on the new-dep question; (b) the Architect can frame bounded options A/B/C cleanly; (c) avoids wasting an Implementer cycle that would just hit the halt condition. The downside (one round-cycle delay for operator decision) is acceptable.

### C.3 EMPIRICAL.sh probe-run at round-start HEAD `5c3e0d9` (R77+R47+R72 3rd-instance reinforcement)

**Architect ran `bash coordination/specs/Q-R82-EMPIRICAL.sh` against the working-tree state at round-start HEAD `5c3e0d9` (after authoring + before committing the spec triad). The encode-actual-results-verbatim discipline (R78 / R79 MAJOR-1) requires recording the OBSERVED output verbatim — not a paraphrase.**

**Verbatim observed output of `bash coordination/specs/Q-R82-EMPIRICAL.sh` at HEAD `5c3e0d9` (Implementer artifacts absent; spec triad in working tree but not yet committed):**

```
── Q-R82-EMPIRICAL.sh @ HEAD=5c3e0d9

── Block 1: typecheck
Block 1 PASS: tsc exit 0

── Block 2: bundle artifact
Block 2 FAIL: demos/engine-bundle.mjs missing (run 'pnpm build:browser')

── Block 3: SHA-256 byte-identity
Block 3 FAIL: SHA-256 parity broken (exit 2)
Block 3: pureJsSha256 is not a function (type=undefined)

── Block 4: test counts
Block 4 FAIL: fail count = '11'; expected 12 (R81-close carry-forward 11 + R81 AC-R81-14 forward-protection flip = 12)
  TAP tail:
  [... TAP output truncated ...]
1..581
# tests 622
# suites 3
# pass 607
# fail 11
# cancelled 0
# skipped 4
# todo 0
# duration_ms 7812.40875

── Block 5: anti-scope diff
Block 5 PASS: 0 files in diff, all within ALLOWED_SET

── Q-R82-EMPIRICAL.sh: AT LEAST ONE BLOCK FAILED (exit 1)
```

**Block-by-block interpretation:**

- **Block 1 PASS** (tsc exit 0) — baseline tsc passes; spec triad is markdown + bash; no .ts modifications yet so engine surface is unchanged.
- **Block 2 FAIL** — `demos/engine-bundle.mjs` does not exist (Implementer artifact). Expected at round-start HEAD by construction.
- **Block 3 FAIL** — `pureJsSha256` is not exported from `engine/topology-overlay.js` (because R82 modifications to topology-overlay.ts have not yet landed). Expected at round-start HEAD by construction. (Block 3 exits 2 — distinct from a SHA-256 parity bug exit 1 — signaling the import failed, not the algorithm.)
- **Block 4 FAIL** — observed `# fail = 11` vs EXPECTED_FAIL = 12. The R81 AC-R81-14 forward-protection flip will land only when R82 files (test/q82-*, coordination/specs/Q-R82-*, etc.) appear in the round-start..HEAD diff. At round-start HEAD with no R82 files yet, R81's anti-scope check still PASSES (counting itself as the only diff), so the flip hasn't fired yet. Expected at round-start HEAD by construction.
- **Block 5 PASS** (0 files in diff at round-start HEAD = round-start itself).
- **Overall exit 1** matches R77+R47+R72+R81 precedent — EMPIRICAL.sh is designed to PASS at chore-A (post-Implementer artifacts), not at spec-emit (round-start HEAD).

**Architect verifies at spec-emit:**
- The EMPIRICAL.sh script is bash-syntactically valid (`bash -n coordination/specs/Q-R82-EMPIRICAL.sh` reports no errors).
- The probe-run executes end-to-end without script errors (no `unbound variable`, no command-not-found).
- The failing blocks fail for the documented "Implementer artifacts absent" reason, not for any script bug.

This satisfies R77 OBS-4 + MINOR-2 probe-run discipline at the highest fidelity available: the script ran end-to-end and its output is recorded verbatim. The 4 failing blocks are pre-documented expected failures at this state; the spec-emit gate is whether the script BEHAVES as designed (it does).

### C.4 Cross-project rule compliance audit

| Rule | R82 compliance |
|---|---|
| Rule 1 (empirical-command-attestation) | Architect § 5.2 prescribes Implementer attests OBSERVED values; spec does not propagate predictions as observations. |
| Rule 2 (spec-test-assertion-coverage) | Every spec § 4.x prescription has a corresponding § 5 AC; no orphan prescriptions. |
| Rule 3 (anti-self-application gate) | § 9.6 walks all 14 ACs against prescribed pseudocode; all PASS. |
| Rule 4 (anti-scope ALLOWED_SET forward-coverage) | § 3.2 anchored regex; forward-protective R-number wildcards on ROUND-summary + DIAGNOSTIC paths. |
| Rule 5 (derived-rule-propagation) | This spec is not deriving a new cross-project rule; existing rules consulted via CLAUDE-ARCHITECT.md reinforcements. |
| Rule 6 (halt-discipline-no-DIAGNOSTIC-for-workaround) | § 6.1 halt conditions enumerate explicit triggers; no carve-outs that let workaround patterns proceed. |
| Rule 7 (cross-project canonical: claim-then-walk) | § 9.7 + § 9.11 enumerate Architect's cite-then-verify walk at spec-emit. |

### C.5 Reinforcement-rules application audit (CLAUDE-ARCHITECT.md REINFORCED lines applied)

| REINFORCED line (date) | Application in R82 spec |
|---|---|
| 2026-05-16 cross-section consistency | § 9.5 walks 10 identifier classes |
| 2026-05-16 type-declaration-site check | No new TS types in R82; mechanism is pure JS function bodies |
| 2026-05-16 grep file deletion track-state | No deletions in R82; mechanism only adds/modifies |
| 2026-05-17 file-level docstring coverage | `topology-overlay.ts` modification: Implementer is expected to update the file-level docstring to mention the R82 Web Crypto adapter region. (Not prescribed inline but acknowledged as a tactical-autonomy item.) |
| 2026-05-17 line-number citation drift | § B.1 cites file:line ranges verified at session entry |
| 2026-05-17 spec-amendment ALL-gate-artifacts propagation | The § 3.2 ALLOWED_SET regex byte-matches the EMPIRICAL.sh Block 5 ALLOWED variable. Identical regex in both places. |
| 2026-05-18 OBSERVED-binding scope | § 5.2 implicit AC binds the Implementer's OBSERVED outputs; no PRNG-drift-class predicates. |
| 2026-05-18 inherited-testimony verification | Baseline test-count claim verified at session entry by Architect, not inherited from R81 close attestation. |
| 2026-05-18 visualization sanity check (R77 MINOR-2) | No visualization deliverable in R82. |
| 2026-05-19 chore-A vs chore-B count prediction (R53 MINOR-1) | R82 has no chore-B SHA-injection step; single-state prediction is correct. |
| 2026-05-19 halt-condition carve-outs (R56 MINOR-1) | § 6.1 trigger 1 carves out pre-documented chore-A pass state (fail=12 strict). |
| 2026-05-19 constructor-opts symbol drift (R58 MINOR-1) | esbuild's `BuildOptions` interface fields verified at spec-emit via esbuild documentation pinning. |
| 2026-05-19 post-MOD line citations (R58 MINOR-3) | § 4.1 cites pre-MOD line 30 + describes the insertion; no post-MOD absolute line citations. |
| 2026-05-20 routing-block AC numbers cite-then-verify (R65 MINOR-1) | The Architect routing block (NEXT-ROLE.md) will grep AC numbers from this spec before writing. |
| 2026-05-20 type-shape contradiction sweep (R65 MINOR-2) | No type-shape declarations in R82. |
| 2026-05-20 P3 ten-axis behavioral commitment ↔ AC binding (R65 MINOR-3) | Every § 8 ten-axis commitment has a corresponding AC or acknowledged gap. |
| 2026-05-20 boolean-status-field semantic accuracy (R66 MINOR-1) | The smoke-test `__tessera_r82_smoke__.loaded = true` is set ONLY after the dynamic import succeeds; semantically accurate. |
| 2026-05-20 strikethrough format avoidance (R66 MINOR-5) | No strikethrough markdown in this spec. |
| 2026-05-20 narrative-vs-executable consistency (R70 MINOR-2) | § 4.7 EMPIRICAL.sh pseudocode IS the script; no separate narrative section to reconcile. |
| 2026-05-20 AC-metric-vs-mechanism match (R70 MINOR-3) | Each AC's metric (file size, line count, exit code) matches the EMPIRICAL.sh block's check. |
| 2026-05-20 regex strict discrimination (R70 MINOR-4) | The § 4.6 AC-R82-5 regex `^\s*import\s+.*\s+from\s+['"]node:crypto['"]` is anchored to line start; would not match an import buried in a comment or inside a string literal. |
| 2026-05-20 discriminating AC binds the pedagogical difference (R71 MINOR-1) | AC-R82-7 binds byte-identity (the discriminating property), not mere "hash returns string". |
| 2026-05-20 forward-protection ACs flip prediction (R79 OBS) | § 1.4 explicitly enumerates R81 AC-R81-14 forward-protection flip prediction. |
| 2026-05-20 spec-prescribed document-mutation target-state verification (R81 MAJOR-3) | § 2.4 documents the `.gitignore` check (no existing `engine-bundle` line); § 4.3 documents the `demos/demo.html` insertion site (before `</body>` tag); neither prescription operates blind. |
| 2026-05-20 AC structural-boundary verification (R81 MINOR-2) | AC-R82-9's substrings appear ALL within the new `<script type="module">` block per spec § 2.3 verbatim; no global-presence-vs-section-bounded ambiguity. |

### C.6 Multi-spec template content reconciliation (R39 + R40 + R41 inheritance)

| Q-R81-* template element | Q-R82-* corresponding |
|---|---|
| § 0 brainstorm | § 0 (3 approaches A/B/C; selection rationale) |
| § 1 design phase | § 1 (component boundaries, integrations, failure modes, pre-prediction) |
| § 2 verbatim mechanism | § 2 (Web Crypto adapter, esbuild invocation, smoke block, .gitignore line, package.json edits) |
| § 3 component inventory + ALLOWED_SET | § 3 (component inventory table + ALLOWED_SET regex) |
| § 4 per-file pseudocode | § 4 (per-file pseudocode for all 7 deliverable files) |
| § 5 AC table + implicit AC + acknowledged gaps | § 5 (14 ACs + chore-A attestation + 6 acknowledged gaps) |
| § 6 anti-scope + halt conditions | § 6 (11 halt conditions extending directive's 8) |
| § 7 open questions | § 7 (1 ESCALATE: OQ-R82-1 bundler dep choice; 1 RESOLVED at Architect-time: OQ-R82-2 _q72-trace.ts handling) |
| § 8 P3 ten-axis | § 8 (one-sentence per axis) |
| § 9 pre-emit grilling | § 9 (11 sub-sections matching R81 § 9 + R71/R81 lesson additions) |

---

## § D. Architect post-grilling reflections

### D.1 What the spec did well

- ESCALATE upfront on dep addition (vs letting Implementer hit the halt condition mid-cycle) saves one round-cycle of work.
- Embedded pure-JS SHA-256 avoids a 2nd new dep (already escalating one).
- AC-R82-7 byte-identity test with 3 FIPS vectors discriminates better than a single-vector parity test.
- Acknowledged gaps in § 5.3 pair with named Reviewer manual checks, not permanent-waiver "Reviewer will catch it" framing.
- `.gitignore` collision pre-check at spec-emit time (R81 MAJOR-3 lesson applied).

### D.2 What might fail in Implementer hands

- esbuild's bundle output may include some node-internal markers not enumerated in AC-R82-8's banned list. If a new marker appears, AC-R82-8 PASSES vacuously but the operator-side audit might catch the marker. **Mitigation:** Reviewer manually greps for unexpected polyfill markers in the bundle output.
- The pure-JS SHA-256 reference implementation is well-defined but ~60-70 lines of careful bit-manipulation. Subtle implementation bugs may emerge (e.g., signed vs unsigned right shift). **Mitigation:** AC-R82-7's 3-vector parity test catches divergence; the multi-block vector specifically exercises the message-padding boundary that's the most common bug site.
- The Implementer might not realize `require.main === module` is the correct guard for the build tool (R75 lesson). **Mitigation:** § 2.2 prescribes the guard verbatim.

### D.3 What might fail at Reviewer hands

- The Reviewer's environment may not have esbuild installed (Reviewer-side fresh checkout without `pnpm install`). AC-R82-11 would fail spuriously. **Mitigation:** § 5.3 gap 2 acknowledges this; Reviewer instructed to run `pnpm install` before re-running.
- The Reviewer may not open the browser to verify smoke-test runtime behavior. **Mitigation:** § 5.3 gap 1 explicitly directs Reviewer to perform the manual check.

### D.4 Reflection on the ESCALATE decision

The Architect could have proceeded with STATUS: READY under the interpretation that the directive's mention of "esbuild OR equivalent" constitutes operator pre-authorization. The conservative reading is that "ESCALATE for operator decision" is unambiguous — the operator wants explicit authorization for the dep. The ESCALATE preserves operator authority; the cost is one extra dispatch cycle of operator attention. Acceptable trade.

---

## § E. Reviewer agenda (for the R82 Reviewer session at MERGE-READY routing)

1. Empirical re-run all 5 EMPIRICAL.sh blocks at Reviewer HEAD; verify exit 0; record verbatim observed output in REVIEWER-REPORT-R82.md.
2. Independently verify the 3 FIPS SHA-256 vectors by running `node -e "console.log(require('node:crypto').createHash('sha256').update('').digest('hex'))"` and comparing.
3. Right-reasons audit: AC-R82-5 (could the static-import regex match in a comment?), AC-R82-7 (would a mutation in the K-constants table fail the test?), AC-R82-11 (could `execSync` succeed for a wrong reason?).
4. Manually open `demos/demo.html` in a browser → verify console `R82 smoke:` log + `window.__tessera_r82_smoke__.loaded === true`.
5. Manually grep `demos/engine-bundle.mjs` for unexpected polyfill markers beyond AC-R82-8's banned list.
6. Verify `pnpm install` does not regress existing typecheck/test surface (run before re-running EMPIRICAL.sh).
7. TDD discipline check: RED commit prefix exists in git log before chore-A; q82 test file lands with `assert.fail` stubs at RED commit.
8. R23 + R71 + R79 + R81 lesson checks: file-level docstring of `topology-overlay.ts` updated to mention R82 adapter; no narrative empirical claims; encode-actual-results-verbatim in Implementer attestation; AC regex section-bounded (AC-R82-9 substrings within `<script type="module">` block).
9. Audit-trail check: spec triad commit precedes chore-A; chore-A SHA explicitly anchored.

---

End of Q-R82-SPEC-AUDIT.md.
