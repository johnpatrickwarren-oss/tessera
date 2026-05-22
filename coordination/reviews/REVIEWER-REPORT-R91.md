# REVIEWER-REPORT-R91 — Tessera-internal engine package consumption migration

_Round: R91 (Phase 5 SLICE 3 round 2 of 4). Reviewer HEAD: `ef7f027` (R91 Implementer routing). ROUND_START_SHA: `a63da14`. Cold-eye audit per CLAUDE-REVIEWER.md; spec read from `coordination/specs/Q-R91-SPEC.md`; coordination/diagnostics/, coordination/logs/, .prompt-*.md NOT read._

---

## § 1 Per-AC verification table

All 14 ACs verified at Reviewer HEAD via direct command re-runs (not by reading Implementer attestations). Each row records actual observed evidence.

| AC-ID | Criterion (short) | Status | Evidence (file:line or command observation) |
|---|---|---|---|
| AC-R91-1 | Zero relative `../engine` imports in test/ + tools/ | PASS | `grep -rl "from ['\"]\\.\\..*engine" test/ tools/` → empty (run at HEAD; Q-R91-EMPIRICAL.sh Block 6 PASS) |
| AC-R91-2 | ≥50 consumer files use package-name import | PASS | `grep -rl "from ['\"]@johnpatrickwarren-oss/deploysignal-engine" test/ tools/ \| wc -l` → 50 (boundary; matches ≥50 threshold) |
| AC-R91-3 | tsconfig.json has paths mapping + baseUrl | PASS | tsconfig.json:23-27 contains `"baseUrl": "."`, `"paths"` with both required keys verbatim |
| AC-R91-4 | package.json file: dep on engine | PASS | package.json:36-38 contains `"dependencies": { "@johnpatrickwarren-oss/deploysignal-engine": "file:./engine" }` |
| AC-R91-5 | pretest extended | PASS | package.json:32 `"pretest": "tsc && tsc -p tsconfig.test.json"` |
| AC-R91-6 | node_modules symlink exists | PASS | `lstat node_modules/@johnpatrickwarren-oss/deploysignal-engine` → symlink → `../.pnpm/@johnpatrickwarren-oss+deploysignal-engine@file+engine/...` |
| AC-R91-7 | 5 require.resolve probes resolve under engine/dist | PASS | Each resolves to `.../engine/dist/<sub>.js`; verified independently with extra paths (`per-shard/runtime`, `fleet/verdict-consumer`) — all resolve |
| AC-R91-8 | `pnpm exec tsc -p tsconfig.test.json --noEmit` exit 0 | PASS | EMPIRICAL.sh Block 7 PASS at HEAD |
| AC-R91-9 | 5 engine/dist sentinels exist | PASS | All 5 paths exist as `.js` under engine/dist |
| AC-R91-10 | q91 own file has no relative `../engine` imports | PASS | `grep "from\\s+['\"]\\.\\.+/engine" test/q91-engine-package-consumption.test.ts` → empty |
| AC-R91-11 | VENDORING-MANIFEST.md has R91 + R90 headers | PASS | `grep "## R91 consumption-migration note (2026-05-21)"` matches; `## R90 extraction note (2026-05-21)` matches; package name reference matches |
| AC-R91-12 | Anti-scope diff ⊆ ALLOWED_SET | PASS | `git diff a63da14 HEAD --name-only \| grep -Ev <ALLOWED_REGEX>` → empty; 60 paths emitted, all in ALLOWED |
| AC-R91-13 | 10 engine sentinels byte-identical to ROUND_START_SHA | PASS | All 10 sentinels: `diff <(git show a63da14:<path>) <path>` → byte-equal for all (independently verified) |
| AC-R91-14 | engine/package.json + engine/README.md byte-identical | PASS | Both byte-equal to ROUND_START_SHA |

**All 14 R91 ACs PASS at Reviewer HEAD.** The substantive deliverable (consumption migration) is sound.

---

## § 2 Findings

### CRITICAL-1 — Pre-existing AC-R36-3 flipped PASS → FAIL; halt condition 4 triggered; Implementer bypassed halt

**File / line:** `test/q91-engine-package-consumption.test.ts:99-101` (AC-R91-7 `execFileSync('node', ['-e', ...])` pattern); `test/q36-phase2-close-walk.test.ts:74-79` (AC-R36-3 carve-out list)

**Evidence:**
1. AC-R36-3 reads (`test/q36-phase2-close-walk.test.ts:71-93`): "no other test files carry execFileSync node --test pattern". The carve-out list excludes ONLY q29/q34/q36. q91 is NOT in the carve-out.
2. q91 test file (added by RED commit `10cb3b1`) at line 99-101 carries `execFileSync('node', ['-e', ...])` for AC-R91-7's 5 require.resolve probes — this matches the AC-R36-3 forbidden pattern `/execFileSync\s*\(\s*['"]node['"]/`.
3. At ROUND_START_SHA (`a63da14`), q91 did not exist; the carve-out list was identical. AC-R36-3 PASSED at round-start (verified: `git show a63da14:test/q36-phase2-close-walk.test.ts` carve-out same; no q91 file to violate).
4. At Reviewer HEAD, AC-R36-3 FAILS — `not ok 329 - AC-R36-3: no other test files carry execFileSync node --test pattern` in the TAP run.
5. AC-R36-3 is NOT among the 12 carry-forward anti-scope-diff ACs enumerated in spec § 1.4 (R77-14, R77-17, R78-14, R79-14, R80-14, R81-14, R82-14, R83-15, R84-16, R85-19, R89-8, R90-13).

**Halt-condition impact:** Spec § 6 halt condition 4 reads — "ANY existing test file that PASSED pre-R91 fails post-R91 (other than the 12 documented anti-scope-diff carry-forward already-failing ACs from prior rounds; those binary stay FAIL regardless of additional violators) → HALT". AC-R36-3 satisfies this trigger exactly: it passed pre-R91, fails post-R91, and is not in the 12-AC carve-out. The Implementer was required to HALT + DIAGNOSTIC + ESCALATE. Instead they routed READY → REVIEWER (commit `ef7f027`).

**Halt-condition impact (compounding):** Spec § 6 halt condition 1 reads — "Q-R91-EMPIRICAL.sh non-zero exit at chore-A (any block fail other than pre-documented expected pre-impl state per § 8.11) → HALT". EMPIRICAL.sh stochastically yields Block 8 FAIL at HEAD (observed in 1 of 3 my runs: tests=738, pass=713, fail=21, skip=4 — fail=21 is OUTSIDE the [17, 20] band). The +1 increment over the spec-predicted upper bound is attributable to the AC-R36-3 flip raising baseline fail by +1. Halt condition 1 is stochastically triggered.

**Routing implication:** Per CLAUDE-REVIEWER.md REINFORCED 2026-05-19, "CRITICAL exists → STATUS: ESCALATE" is the canonical reading. This finding is NOT attestation-level (it is a real test regression that an existing AC structurally catches). The strict-routing reading applies: ESCALATE. Operator must decide whether to (a) require fix cycle to add q91 to q36 AC-R36-3 carve-out OR refactor AC-R91-7 to avoid `execFileSync('node',...)`, or (b) accept the regression and document the carry-forward set expansion.

**Suggested fix scope** (Reviewer does not implement per role boundary; documenting fix options for operator):
- Option A: amend `test/q36-phase2-close-walk.test.ts:74-79` to add `f !== 'q91-engine-package-consumption.test.ts'` to the carve-out filter. Cheapest. Test/* in ALLOWED_REGEX so anti-scope holds.
- Option B: refactor AC-R91-7 to use a `node:module` `createRequire(...)`.resolve directly (in-process), removing the `execFileSync('node',...)` pattern entirely. Cleaner architecturally but more invasive.
- Option C: spec amendment expanding the carry-forward fail set to include AC-R36-3 (acknowledging the regression). Discipline-corrosive but minimal-code.

---

### MAJOR-1 — Predicted close-state band [17, 20] is empirically too tight; halt condition 1 stochastically triggered at HEAD

**File / line:** `coordination/specs/Q-R91-SPEC.md:62-66` (§ 1.4 predicted close band); `coordination/specs/Q-R91-EMPIRICAL.sh:146-148` (Block 8 thresholds)

**Evidence:** 3 successive runs of `bash coordination/specs/Q-R91-EMPIRICAL.sh` at Reviewer HEAD:
- Run A: tests=738, pass=713, fail=21, skip=4 → Block 8 FAIL (pass below band, fail above band)
- Run B (separate `node --test`): tests=738, pass=714, fail=20, skip=4 → Block 8 PASS (both in band)
- Run C: tests=738, pass=713 (re-flake), fail=21 — direct repeat shows Block 8 fails again

**Diagnosis:** The band-derivation in § 1.4 was predicated on baseline fail=18 (per § 0 P0.11) + AC-R84-14 ±1 stochastic. With CRITICAL-1's AC-R36-3 flip adding +1 to baseline (now effectively 19), the upper tail of AC-R84-14 stochastic reaches 21, exceeding the band [17, 20] upper bound. The band was off-by-one for the actual observed variance.

**Coupling to CRITICAL-1:** This MAJOR is causally coupled to CRITICAL-1. If AC-R36-3 had not flipped (i.e., CRITICAL-1 had been caught by halt discipline), the band would have been within tolerance.

**Suggested fix scope:** Fix CRITICAL-1 (one of the 3 options). The band issue resolves automatically once AC-R36-3 stops being R91-flipped.

---

### MAJOR-2 — Spec § 1.4 carry-forward fail enumeration is incomplete; halt-condition-4 cross-check is degraded

**File / line:** `coordination/specs/Q-R91-SPEC.md:62-71` (§ 1.4 + forward-protection-AC walk)

**Evidence:** Spec § 1.4 lists "12 always-failing anti-scope-diff ACs" + AC-R83-12 deterministic. The actual baseline ~18 fails at round-start include at least 6 additional unenumerated fails: Q1 AC-7 (ENOENT environmental — acknowledged in PRD § Pre-flags but not in this spec), AC-R36-3 (PASSED pre-R91 — now flipped), AC-R36-19 (CLAUDE-ARCHITECT.md content drift), AC-R78-13 (R77 detector-envelope drift), AC-R79-8 (per_window_detectors structure drift), R65 + R66 (DS integration tests). Without an enumerated baseline, the Implementer's halt-condition-4 ("did a previously-passing AC flip to FAIL") check is degraded — the Implementer cannot reliably distinguish "carry-forward fail" from "new R91-induced flip".

**Discipline impact:** This is the failure-vector that allowed CRITICAL-1 to slip past. A complete pre-R91 fail set enumeration (one TAP run at a63da14, recorded verbatim) would have made the AC-R36-3 flip immediately visible.

**Suggested fix scope** (for future rounds, not R91 fix): future specs should record the full pre-impl fail set verbatim (paste the `not ok N - AC-X` list at session entry) rather than enumerating "12 anti-scope-diff ACs". Pattern is similar to R88 false-compliance-attestation lesson — encode observed verbatim, do not summarize.

---

### MINOR-1 — Spec § 8.10(c) off-by-one prediction (51 vs actual 50 grep match for AC-R91-2)

**File / line:** `coordination/specs/Q-R91-SPEC.md:765-767` (§ 8.10(c))

**Evidence:** Spec § 8.10(c) corrected itself: "the q91 test file's own source contains @johnpatrickwarren-oss/deploysignal-engine as STRING LITERALS inside test assertions ... Grep-rl will match this file too. So AC-R91-2 count includes q91 test file + 50 consumers = 51." Actual observation: `grep -rl "from ['\"]@johnpatrickwarren-oss/deploysignal-engine" test/ tools/ | wc -l` → 50. q91 does NOT match the grep regex because the regex anchors on `from '` prefix; q91 contains the package name only inside double-quoted string assertions (e.g., `paths['@johnpatrickwarren-oss/deploysignal-engine']`), never with a `from '` prefix. Off-by-one in the prediction; does not affect AC PASS/FAIL (50 ≥ 50 still satisfies).

**Implication:** AC-R91-2 is exactly at the boundary. If any consumer file were inadvertently dropped from migration (e.g., a tools/* file failing to receive replacement), count would slide below 50 and the AC would FAIL — which IS its intended behavior. The boundary is tight but functional.

---

### MINOR-2 — AC-R91-12 ALLOWED_REGEX self-confirming; mitigation via § 8.6 byte-mirror was upheld but is fragile

**File / line:** `test/q91-engine-package-consumption.test.ts:171` (inline regex); `coordination/specs/Q-R91-SPEC.md:561` (§ 5.3 regex); `coordination/specs/Q-R91-EMPIRICAL.sh:168` (Block 9 ALLOWED variable)

**Evidence:** The AC-R91-12 ALLOWED_REGEX is declared inline in q91 — the Implementer wrote both the ALLOWED set and the test that checks adherence. Self-confirming risk. Mitigation per spec § 8.6 is the 4-surface byte-mirror discipline (spec narrative § 5.2, machine regex § 5.3, test inline, EMPIRICAL.sh Block 9). I verified byte-identity by inspecting all three machine-readable surfaces (test, EMPIRICAL.sh, spec § 5.3 fenced code block) — all match. Discipline upheld at this round; mechanism remains fragile across future rounds if the byte-mirror discipline lapses.

---

### OBS-1 — pnpm-lock.yaml regeneration is not directly attested

**File / line:** `coordination/specs/Q-R91-SPEC.md:592` (§ 5.4 G-5)

**Evidence:** Spec acknowledges this gap. AC-R91-6 (node_modules symlink exists) transitively binds since the symlink only materializes after pnpm install runs. Acknowledged-mitigated.

### OBS-2 — Approach D pretest chain adds ~1-2s overhead to every `pnpm test` invocation

**Evidence:** Verified by running `pnpm test` and observing pretest output. Documented in spec § A1.1 Approach D weakness. UX trade-off; not blocking.

### OBS-3 — Stale-dist risk if developer invokes bare `node --test` instead of `pnpm test`

**Evidence:** Approach D's pretest hook only fires under `pnpm test`. A developer running `node --test test/q05-per-shard-runtime.test.js` after editing an engine file would resolve via the symlink to stale engine/dist (last-built artifact). Documented in spec § A2.4 failure mode 3. Not blocking but a discoverable footgun.

### OBS-4 — engine/dist build is duplicated by the pretest chain

**Evidence:** `pretest: "tsc && tsc -p tsconfig.test.json"`. The leading `tsc` (root tsconfig.json) builds engine/dist. The trailing `tsc -p tsconfig.test.json` ALSO compiles engine/**/*.ts (via tsconfig.test.json's `include` per P0.6) co-located with the source. Two builds of the same source surface. Spec § A1.1 Approach D documents this; spec § A4.6 rejects single-tsc-run as harder to reason about. Acknowledged.

---

## § 3 Right-reasons audit (3 tests)

### Test 1: AC-R91-3 (tsconfig.json paths mapping)

**Spec requirement:** § 3.1 (tsconfig delta — paths mapping load-bearing for tsc compile-time resolution per § 1.1).

**Assertion:** `paths["@johnpatrickwarren-oss/deploysignal-engine"]` deepEquals `["./engine/types/index"]`; `paths["@johnpatrickwarren-oss/deploysignal-engine/*"]` deepEquals `["./engine/*"]`; `baseUrl === "."`.

**Right-reasons:** Test passes BECAUSE tsconfig.json (tsconfig.json:23-27) was actually edited to add those exact literal keys/values. Independent observation. Removing baseUrl OR either paths key would cause the test to fail in a structurally specific way. NOT self-confirming.

### Test 2: AC-R91-7 (5 require.resolve probes)

**Spec requirement:** § 1.2 (Node-runtime resolution via symlink + exports map → engine/dist/<sub>.js).

**Assertion:** For each of 5 representative subpaths, `node -e "console.log(require.resolve(<sub>))"` stdout matches `/engine\/dist\/.*\.js$/`.

**Right-reasons:** Test passes BECAUSE Node's actual module resolver, given the file: dependency in package.json + pnpm install's materialization of node_modules/@johnpatrickwarren-oss/deploysignal-engine → engine, reads engine/package.json exports map and resolves to engine/dist/<sub>.js. I independently verified additional subpaths (`per-shard/runtime`, `fleet/verdict-consumer`) resolve the same way. Not self-confirming — this is a real runtime mechanism test.

### Test 3: AC-R91-13 (10 engine sentinels byte-identical)

**Spec requirement:** § 5.1 anti-scope (engine algorithm + types frozen at R77/R90).

**Assertion:** For each of 10 engine source files, `git show a63da14:<path>` exact-equals working-tree content.

**Right-reasons:** Test passes BECAUSE the Implementer did not modify any of the 10 sentinels (independently verified via `diff <(git show a63da14:<path>) <path>` for each — all byte-equal). The assertion mechanism is structural; an actual edit to any sentinel would fail with a specific diff. NOT self-confirming. Sentinel choice (10 files) covers types barrel + algorithms + DS integration + L0 + fleet — broad coverage of anti-scope surface.

**Right-reasons audit verdict:** All 3 audited ACs are NOT self-confirming. Real spec requirements traced. (AC-R91-12 ALLOWED_REGEX, though inline-self-set, is mitigated by the § 8.6 byte-mirror discipline — see MINOR-2.)

---

## § 4 Cross-cutting checks

### TDD discipline: PASS

Git log shows a separate RED commit BEFORE the GREEN chore-A commit:
- `10cb3b1 test(R91 RED): add q91 engine-package-consumption test file (14 ACs)`
- `79252b2 chore(R91 chore-A): Tessera-internal engine package consumption migration`

This matches spec § 11 Implementer step ordering. R23 IMPL MINOR-1 "TDD separate-RED-commit" reinforcement honored.

### No-skip: PASS

No `.skip` markers introduced; no halt-discipline bypass attempt other than the CRITICAL-1 halt-condition-4 failure (Implementer did NOT explicitly skip a known failure — they simply did not notice / acknowledge it).

### Anti-scope: PASS (mechanical) / structurally clean

`git diff a63da14 HEAD --name-only | grep -Ev <ALLOWED_REGEX>` returns empty. 60 paths emitted, all in ALLOWED_SET. Engine algorithm + types frozen per AC-R91-13/14. CLAUDE-*.md files unmodified (per R89 sustaining mechanism). No external-side effects (no npm publish, no git tag).

### Halt discipline: FAIL (see CRITICAL-1 for detail)

Halt condition 4 was triggered by AC-R36-3 flip. Halt condition 1 was stochastically triggered by Block 8 FAIL. Implementer routed READY anyway. This is the failure case captured by CRITICAL-1.

---

## § 5 Grilling output (self-review of this report before routing)

- Every finding has a file:line reference? **YES** — CRITICAL-1: q91:99-101 + q36:74-79; MAJOR-1: spec:62-66 + EMPIRICAL.sh:146-148; MAJOR-2: spec:62-71; MINOR-1: spec:765-767; MINOR-2: q91:171 + spec:561 + EMPIRICAL.sh:168; OBS-1: spec:592; OBS-2: spec § A1.1; OBS-3: spec § A2.4; OBS-4: package.json:32 + spec § A4.6.
- Any AC marked PASS without actual verification? **NO** — every AC has a directly observed binding-command result (re-run by me at Reviewer HEAD, not inherited from Implementer attestation).
- Right-reasons audit completed for 3+ tests? **YES** — AC-R91-3, AC-R91-7, AC-R91-13.
- Adversarial mandate satisfied (zero findings = failed audit)? **YES** — 1 CRITICAL, 2 MAJOR, 2 MINOR, 4 OBS.
- Pre-emit grilling on my own report (CLAUDE-REVIEWER inline Superpowers Review):
  - Re-read as next-role (Memorial-Updater or operator)? **YES**.
  - Marked places I assumed something Memorial-Updater cannot verify? **NO unverified assumptions** — every claim is backed by either a git command, a grep, or a TAP line citation.
  - Marked places a decision was deferred rather than made? **YES**: CRITICAL-1 fix scope is enumerated as 3 options for operator decision; I did not pick one (Reviewer role boundary).
  - Confirmed no scope beyond the request was added? **YES**.
  - Next role can act on this with zero clarifying questions? **YES**: routing is unambiguous (ESCALATE); CRITICAL-1 enumerates 3 fix options with cost framing; operator picks.

---

## § 6 Routing decision

**STATUS: ESCALATE**

**Reason:** CRITICAL-1 (AC-R36-3 flipped PASS → FAIL by q91; halt condition 4 trigger; Implementer bypassed halt). Per CLAUDE-REVIEWER.md routing rule "CRITICAL exists → STATUS: ESCALATE" (canonical reading per REINFORCED 2026-05-19).

**Operator decision required (bounded question per CLAUDE-COMMON.md escalation protocol):**

> R91 substantive deliverable (consumption migration) is sound — all 14 R91 ACs PASS at Reviewer HEAD, anti-scope clean, engine sentinels frozen, TDD discipline followed. However, q91 (added by RED commit `10cb3b1`) introduced a pre-existing-AC regression: AC-R36-3 (`test/q36-phase2-close-walk.test.ts:71-93`, "no other test files carry execFileSync node --test pattern") flipped PASS → FAIL because q91's AC-R91-7 uses `execFileSync('node', ['-e', ...])` and q91 was not added to q36's carve-out list (q36:74-79). This is a halt-condition-4 trigger that the Implementer bypassed. Three fix options:
>
> - **Option A** — Amend `test/q36-phase2-close-walk.test.ts:74-79` to add `f !== 'q91-engine-package-consumption.test.ts'` to the carve-out filter (1-line fix; test/* is in ALLOWED_REGEX so anti-scope holds; existing R87 precedent — q29/q34/q36 are all carved out by this same mechanism). Lowest-cost; preserves the AC-R91-7 mechanism.
> - **Option B** — Refactor AC-R91-7 to use `node:module` `createRequire(__filename)`'s `.resolve()` in-process (eliminates `execFileSync('node',...)` entirely; more architecturally clean; ~10-15 line change in q91).
> - **Option C** — Accept the regression and spec-amend § 1.4 carry-forward fail set to include AC-R36-3 (no code change; but ratifies a discipline-violating outcome — discouraged per R56 MINOR-1 + R86 prophylactic principles).
>
> Recommended: **Option A** (lowest cost; matches precedent; preserves spec § 1.2 dual-mode resolution test mechanism). Operator confirms which to apply, then a follow-up commit (chore-A amendment) lands the fix before MU dispatch.

---

## § 7 Inputs

- `coordination/PRD.md` (read)
- `coordination/specs/Q-R91-SPEC.md` (read in full, 867 lines)
- `coordination/specs/Q-R91-SPEC-AUDIT.md` (NOT read — sidecar; not load-bearing for Reviewer audit per spec § A6)
- `coordination/specs/Q-R91-EMPIRICAL.sh` (read + re-run at HEAD; 3 invocations)
- `test/q91-engine-package-consumption.test.ts` (read in full + re-run alone — 14/14 PASS at HEAD)
- `test/q36-phase2-close-walk.test.ts` (read AC-R36-3 carve-out at line 71-93 + at ROUND_START_SHA via `git show`)
- `tsconfig.json` (read in full)
- `package.json` (read in full)
- Migration spot-checks: `test/_substrate/factories.ts`, `test/_substrate/v9X-cluster.ts`, `tools/curate-baseline.ts`, `tools/calibrators/family-c.ts`, `test/q01-schema-additions.test.ts` (sampled imports)
- `~/.claude/CROSS-PROJECT-MEMORIAL.md` Reviewer section (consulted for previously-missed issue classes; AC-R36-3 PASS→FAIL flip aligns with R58 attribution-discipline + R56 halt-discipline patterns)
- `git diff a63da14 HEAD --name-only` (60 paths; all in ALLOWED_SET)
- `git log` (verified TDD ordering: RED before GREEN)
- `node --test --test-reporter=tap test/*.test.js` (full TAP suite re-run; not-ok list extracted)
- `bash coordination/specs/Q-R91-EMPIRICAL.sh` (3 re-runs at Reviewer HEAD)

This report path: `coordination/reviews/REVIEWER-REPORT-R91.md`.

---

_End of REVIEWER-REPORT-R91. Routing: ESCALATE — see § 6 bounded question for operator._
