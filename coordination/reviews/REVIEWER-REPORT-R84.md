# REVIEWER-REPORT-R84.md — Live engine compute + Web Worker

**Round:** R84 (Phase 4 SLICE 3 round 3; full tier; cold-eye Reviewer)
**Round-start SHA:** `0e93c15`
**Implementer chore-A SHA:** `783423f` (GREEN); `1d08fcb` (routing)
**Reviewer session HEAD:** `1d08fcb`
**Inputs read:** `coordination/PRD.md`, `coordination/specs/Q-R84-SPEC.md`, `coordination/specs/Q-R84-SPEC-AUDIT.md`, `coordination/specs/Q-R84-EMPIRICAL.sh`, all R84 source files (`demos/engine-worker.js`, `tools/build-canned-demos.ts` diff, `demos/demo.html` diff regions, `test/q84-live-engine-compute.test.ts`), the relevant portion of `coordination/NEXT-ROLE.md`, `coordination/MEMORIAL.md` R84 sections, `~/.claude/CROSS-PROJECT-MEMORIAL.md` (Reviewer + Architect-claim-without-empirical-walk + spec-amendment-ALL-gate-artifacts-propagation sections).
**Inputs NOT read (cold-review independence):** `coordination/diagnostics/DIAGNOSTIC-R84-ac9-regex-limit.md`, `coordination/logs/ROUND-R84-ROUTING.md`, `.prompt-*.md`.

---

## § 1. Per-AC verification table

Each entry: status + binding source-file:line + observation.

| AC-ID  | Criterion (short)                                                          | Status | Evidence                                                                                                                                                                                                                                                                       |
| ------ | -------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| R84-1  | `demos/engine-worker.js` exists + > 200 bytes                              | PASS   | `demos/engine-worker.js` (118 lines, ~3.4KB; `git ls-files demos/engine-worker.js` → present). Test at `test/q84-live-engine-compute.test.ts:19-23`.                                                                                                                            |
| R84-2  | Runtime detection (`process.versions.node` + `self.postMessage`)           | PASS   | `demos/engine-worker.js:16` (`isNodeWorker = typeof process !== 'undefined' && process.versions && process.versions.node`) + `:27` (`self.postMessage(m)`). Test at `:25-31`.                                                                                                   |
| R84-3  | Dynamic `import()` of `engine-bundle.mjs`; no top-level static import      | PASS   | `demos/engine-worker.js:108` (`var enginePromise = import(getBundleSpecifier());`) + `:36,38` (specifier resolution). No top-level `import` lines (file begins with `'use strict';` then IIFE). Test at `:33-42`.                                                               |
| R84-4  | Filters inbound messages by `msg.type !== 'run'`                           | PASS   | `demos/engine-worker.js:111` (`if (!msg || msg.type !== 'run') return;`). Test at `:44-48`.                                                                                                                                                                                    |
| R84-5  | Emits `{type:'window', windowIdx, perShard}` per window                    | PASS   | `demos/engine-worker.js:92` (`port.post({ type: 'window', windowIdx: w, perShard: perShard, events: [] });`). Test at `:50-58`.                                                                                                                                                 |
| R84-6  | Emits terminal `{type:'terminal', fdr_K, fdr_qLevel, fdr_selected_indices, candidates}` | PASS | `demos/engine-worker.js:98-104`. Test at `:60-68`.                                                                                                                                                                                                                              |
| R84-7  | Emits `{type:'error', error}` on internal failure; uses `.catch`           | PASS   | `demos/engine-worker.js:114-115` (`.catch(function (err) { port.post({ type: 'error', error: ... }) })`). Test at `:70-76`.                                                                                                                                                     |
| R84-8  | Demo.html spawns `new Worker('./engine-worker.js')` inside `btnRun` handler | PASS  | `demos/demo.html:13045` (`worker = new Worker('./engine-worker.js');`), inside the `btnRun.addEventListener('click', ...)` block opening at `:13039`. Test at `:78-85`.                                                                                                         |
| R84-9  | `btnRun` handler postMessages `{type:"run", controlState}`                 | PASS (with finding) | `demos/demo.html:13107` (`worker.postMessage({ type: 'run', controlState: JSON.parse(JSON.stringify(controlState)) });`). Test at `:87-97`. **Note:** test assertion was changed post-ESCALATE from `runRegion![0]` to full `HTML`; see MAJOR-1.                       |
| R84-10 | `worker.onmessage` appends to `scenarios.custom.windows` and calls `drawFrame` | PASS | `demos/demo.html:13071-13101`; `scenarios['custom'].windows.push(...)` at `:13075`; `drawFrame(scenarios['custom'], ...)` at `:13081`. Test at `:99-111`.                                                                                                                       |
| R84-11 | `#btn-cancel` exists; click handler calls `worker.terminate()`             | PASS   | `demos/demo.html:319` (button declared, source at tool `HTML_TEMPLATE_HEAD` modification); `#btn-cancel` button literal at `:319`. Cancel handler at `:13111-13116`; `.terminate()` at `:13113`. Test at `:113-122`.                                                            |
| R84-12 | `#engine-error-banner` + `r84ShowError` + `worker.onerror`                 | PASS   | `demos/demo.html:319` (`<div id="engine-error-banner" class="error-banner" hidden></div>`); `function r84ShowError` at `:13023`; `worker.onerror` at `:13102`. Test at `:124-132`.                                                                                              |
| R84-13 | End-to-end Node Worker round-trip emits ≥1 window + exactly 1 terminal     | PASS   | Reviewer-rerun 5/5 in isolation; `node --test test/q84-live-engine-compute.test.js` returned 17/17 PASS each time. Test at `:134-174` builds `engine-bundle.mjs` if absent (via `pnpm exec node tools/build-browser-bundle.js`) then spawns Node `worker_threads.Worker`.       |
| R84-14 | Cancel halts streaming before all `windowCount=50` windows arrive          | PASS (with MINOR-2 finding on flake) | Reviewer-rerun 5/5 in isolation. Implementer TD-3 reports 1 flake (count=51) in ~5 full-suite runs; Node `worker_threads.terminate()` is async and races synchronous message emission. Test at `:176-213`.                                          |
| R84-15 | R71/R79/R80/R81/R82/R83 surface markers preserved                          | PASS (with MINOR-3 note on count) | All 16 markers found in `demos/demo.html`: BEGIN/END-TESSERA-SCENARIO-DATA (`:74,12915`); `live-verdict-banner` + `window-scrubber`; `--tessera-fam-a:`; `body.scrubbing`; R82 smoke-block delimiters at `:13560,13585` + `__tessera_r82_smoke__` at `:13578`; R83 surfaces. Test at `:215-239`. Spec § 5 table says "14 markers"; test asserts 16. |
| R84-16 | `git diff round-start..HEAD --name-only` ⊆ ALLOWED_SET                     | PASS   | 11 paths in diff (Reviewer rerun: `git diff 0e93c15 HEAD --name-only`); all 11 match the ALLOWED regex at `test/q84-live-engine-compute.test.ts:243-258`. Test at `:241-266`.                                                                                                   |
| R84-17 | typecheck sentinel + EMPIRICAL.sh has Block 1..5 markers                   | PASS   | `test/q84-live-engine-compute.test.js` exists (post-tsc); all 5 Block markers present in `coordination/specs/Q-R84-EMPIRICAL.sh:23, 33, 61, 91, 137`. Test at `:268-285`.                                                                                                       |

**Binding-command re-run by Reviewer (verbatim):**

```
$ pnpm exec tsc -p tsconfig.test.json ; echo $?
0

$ pnpm exec node --test --test-reporter=tap test/*.test.js 2>&1 | tail -10
1..628
# tests 669
# suites 3
# pass 650
# fail 15
# cancelled 0
# skipped 4
# todo 0
# duration_ms 5396.909166

$ bash coordination/specs/Q-R84-EMPIRICAL.sh ; echo $?
[15 PASS / 0 FAIL]
0

$ git diff 0e93c15 HEAD --name-only | wc -l
11
```

Implementer attestation in NEXT-ROLE.md (tsc=0, tests=669, pass=650, fail=15, skipped=4, EMPIRICAL.sh=0, diff line count=10) reproduces under Reviewer rerun. **Diff line-count mismatch:** Implementer attested 10; Reviewer observed 11. The 11th file is `coordination/diagnostics/DIAGNOSTIC-R84-ac9-regex-limit.md` — this exists in the working tree but the Implementer's attestation count was taken at chore-A pre-DIAGNOSTIC append OR was a manual miscount. The spec § 5.2 band is 9-14, so 11 is still in-band. Not a finding (in-band drift, expected by spec).

**Carry-forward 13 fails + 2 R83 forward-protection flips (= 15):** Reviewer-verified by running test/*.test.js and grepping for `not ok`. Identified at `pnpm exec node --test --test-reporter=tap test/*.test.js 2>&1 | grep "^not ok"`:
- AC-R36-21, AC-R36-30, AC-R36-31 (R36 carry-forward)
- R65 / R66 sibling-dep (R65/R66 carry-forward)
- AC-R77-14, AC-R77-17 (R77 carry-forward forward-protection)
- AC-R78-14 (R78 carry-forward)
- AC-R79-8, AC-R79-14 (R79 carry-forward)
- AC-R80-14, AC-R81-14, AC-R82-14 (forward-protection chain)
- **AC-R83-12 (NEW): R84 handler-replacement flipped this from PASS → FAIL** (predicted; spec § 2.6)
- **AC-R83-15 (NEW): R84 paths not in R83 ALLOWED regex flipped this from PASS → FAIL** (predicted; spec § 2.6, § 8.13)

Total: 15 fail. Matches prediction strict.

---

## § 2. Findings

### MAJOR-1 — Operator-resolution Step 1 NOT executed: spec § 1.6 (and SPEC-AUDIT § E) not amended

**File:** `coordination/specs/Q-R84-SPEC.md:468-476` (still contains pre-amendment AC-R84-9 prescription) + `coordination/specs/Q-R84-SPEC-AUDIT.md:117-119` (§ E says "None — this is the initial Q-R84-SPEC.md emission").

The Operator ESCALATE resolution at `coordination/NEXT-ROLE.md:13` defined **six numbered Implementer-scope steps**, the first of which is:

> "1. `Q-R84-SPEC.md § 1.6`: AC-R84-9 new assertion `/worker\.postMessage\s*\(\s*\{\s*type:\s*['"]run['"],\s*controlState\s*:/` (direct full-HTML; no region scoping)"

The Implementer executed steps 2-6 (test file, EMPIRICAL.sh prediction, GREEN commit, re-attest, route) but **did not execute step 1**: the spec body at `Q-R84-SPEC.md:468-476` still reads:

```ts
// ── AC-R84-9: demo.html postMessages a {type:"run",controlState} payload ──
test('AC-R84-9: btnRun handler posts {type:"run",controlState} to worker', () => {
  const runRegion = HTML.match(
    /btnRun\.addEventListener\s*\(\s*['"]click['"][\s\S]{0,3000}?\}\s*\)\s*;/);
  assert.ok(runRegion, 'btnRun click handler must be present');
  assert.match(runRegion![0],
    /worker\.postMessage\s*\(\s*\{[\s\S]*?type:\s*['"]run['"][\s\S]*?controlState/,
    'btnRun handler must postMessage({type:"run", controlState: ...})');
});
```

The test file `test/q84-live-engine-compute.test.ts:87-97` was amended (asserts against full `HTML`, not `runRegion![0]`) but the spec body that prescribes that test was not.

Spec § 5 table at `:894` still says "AC-R84-9 | ... | region-scoped regex on btnRun handler ..." — also stale.

**Why this is a discipline violation, not a documentation nit:**

`~/.claude/CROSS-PROJECT-MEMORIAL.md:291` defines the `spec-amendment-ALL-gate-artifacts-propagation` discipline, derived from R72 and R82 MAJOR-1. R82 was an exactly-analogous violation: operator-authorized amendment landed in 3 of 4 gate artifacts (regex, script variable, in-test regex) but missed the 4th (narrative inventory). Here, at R84, the operator amendment landed in only 2 of 3 named gate artifacts (test file, EMPIRICAL.sh prediction count) and missed the third (spec § 1.6 + SPEC-AUDIT § E).

Same memorial entry (R25 MAJOR-2/MAJOR-3 cross-project lineage; my-first-build line 3092): "Spec internal contradiction... but spec at HEAD still contains the contradiction... The spec-amendment-post-disposition step was skipped." The R84 case is the 5th tessera instance of `spec-not-amended-post-disposition` (R25 MAJOR-2 + R25 MAJOR-3 + R79 MAJOR-1 + R82 MAJOR-1 + R84 here).

**Implementer's MEMORIAL CONFIRMATION at `coordination/MEMORIAL.md:2546`** ("halt-discipline-not-fired-at-chore-A | ... AC-R84-9 amendment (drop handler-region scoping) is a bounded 1-line change authorized by the operator") incorrectly characterizes the scope of work completed. The operator authorized SIX steps; the Implementer completed five. The MEMORIAL CONFIRMATION at `:2544` similarly claims "AC-R84-9 passes via Option A amendment (assert on full HTML instead of region-scoped match)" without disclosing that step 1 of Option A was not applied.

**Impact:** Future readers of spec § 1.6 will see one prescription (region-scoped) and the test file will show another (full-HTML). If a future Architect re-emits the spec or a future Implementer treats spec § 1.6 as authoritative, they will see the pre-amendment regex. The spec triad is no longer the single source of truth for the test.

**Severity rationale:** This matches the R82 MAJOR-1 finding structure (gate-artifact-propagation incompleteness), which was MAJOR. Routing implication: spec triad must remain coherent across roles; this is the precondition for prefix-cache integrity per CLAUDE-COMMON.md "Within-round prefix-continuity invariant" (the Architect's spec must not be amended mid-round except via documented ESCALATE → operator → Architect-amends cycle — but here the operator authorized an amendment, the test was changed, and the spec was left stale).

### MINOR-1 — Implementer-applied regex differs from operator-prescribed regex

**File:** `test/q84-live-engine-compute.test.ts:94-96`.

Operator-prescribed regex (NEXT-ROLE.md:13):

```
/worker\.postMessage\s*\(\s*\{\s*type:\s*['"]run['"],\s*controlState\s*:/
```

Implementer-applied regex (test/q84-live-engine-compute.test.ts:95):

```
/worker\.postMessage\s*\(\s*\{[\s\S]*?type:\s*['"]run['"][\s\S]*?controlState/
```

The two regexes match the current `demos/demo.html:13107` identically, but their **discriminating power differs**:

- Operator's: requires `{` then ONLY whitespace then `type:` (no other keys allowed before `type:`); requires `,` then optional whitespace then `controlState` then `:` (the colon is required).
- Implementer's: `[\s\S]*?` lazy-matches ANY content between `{` and `type:` and between `type:` and `controlState` — would still match if the payload had unrelated keys added before/between/after.

The Implementer's TD-2 in `coordination/NEXT-ROLE.md:60` says only "drops handler-region scoping for the `postMessage` assertion" — true, but does not disclose that the regex pattern was also kept as the pre-amendment permissive variant rather than the operator-prescribed stricter variant.

For the present implementation: PASS in both. For future regression detection: Implementer's regex is materially less discriminating against payload-shape drift.

### MINOR-2 — AC-R84-14 is structurally flaky (TD-3 disclosed by Implementer)

**File:** `test/q84-live-engine-compute.test.ts:176-213` + `coordination/NEXT-ROLE.md:65-71`.

The test relies on `worker.terminate()` racing the worker's message emission. Implementer disclosed 1 flake in ~5 full-suite observed runs (count=51, expected < 50). Root cause: in Node `worker_threads`, the worker can post all 50 `window` messages + 1 `terminal` synchronously into the message queue before the main thread processes the first one; only after processing message #1 does the main thread call `terminate()`, by which point all 51 messages are already in flight.

Reviewer re-ran 5× in isolation: 5/5 PASS. The flake is low-rate but real and structural. The discriminating property the AC claims (terminate halts streaming) is approximate: the test verifies "fewer than 50 messages observed" which is satisfied probabilistically depending on event-loop scheduling, not because terminate actually pre-empts emission.

**Possible follow-up (NOT for this round; future-round consideration):** make the AC tolerate the race by sending a `windowCount: 200` with `topologySize: 'large'`, OR add an explicit synchronization (e.g., worker posts `{type:'ready'}` first, main thread terminates only after receiving it). Either widens the discriminating window or eliminates the race entirely.

### MINOR-3 — Spec § 5 table claims "14 markers" for AC-R84-15; test asserts 16

**File:** `coordination/specs/Q-R84-SPEC.md:900` ("AC-R84-15: anti-regression — R71/R79/R80/R81/R82/R83 markers preserved | 14 marker regex matches | Any prior round marker missing → FAIL") vs `test/q84-live-engine-compute.test.ts:215-239` (16 `assert.match(HTML, ...)` calls: 2 R71 + 2 R79 + 1 R80 + 1 R81 + 3 R82 + 7 R83).

Same count discrepancy in spec § 5.3 first bullet (claims `AC-R84-15` covers 14 markers). Spec § 8.1 mentions "all 14 markers preserved ✓" at the self-application gate. Test actually asserts 16. Cosmetic discrepancy; the discriminating power is the same (any missing marker fails the test).

### OBS-1 — `.gitignore *.js` pattern catches handwritten JS in `demos/`

**File:** `.gitignore:7` (`*.js`) + Implementer TD-1 disclosure in `coordination/NEXT-ROLE.md:55-58`.

The Implementer correctly force-tracked `demos/engine-worker.js` via `git add -f` and disclosed via TD-1. Once tracked, future modifications appear normally. The `.gitignore` is unchanged per anti-scope, but the pattern is a latent trap: any future contributor adding `demos/foo.js` will hit the same problem. `git check-ignore -v --no-index demos/engine-worker.js` returns `.gitignore:7: *.js demos/engine-worker.js` (Reviewer-verified).

Out-of-scope for R84; flagged as observation for a future round that wants to narrow the pattern to `dist/*.js` or `**/*.js.map` + co-located `*.js` next to `*.ts` source.

### OBS-2 — Spec citation `demos/demo.html:13452-13477` for R82 smoke block is stale post-R84

**File:** `coordination/specs/Q-R84-SPEC.md:63` and `:92` cite the R82 smoke block at `demos/demo.html:13452-13477`. Actual location post-R84 chore-A regen: lines 13560-13585 (Reviewer-verified by `grep -n "R82-SMOKE-BLOCK" demos/demo.html`).

This is an expected side-effect of R84 adding ~108 lines to the IIFE earlier in the file; the smoke-block markers are byte-identical, just renumbered. AC-R84-15's regex-based assertion is unaffected. The spec's hard-coded line citation is now stale — not a discipline violation (the spec was correct at spec-emit), but flagged so it isn't propagated forward into R85+ specs verbatim.

### OBS-3 — Forward-protection flips correctly predicted and attested

Both predicted R83 forward-protection flips materialized exactly as the Architect's pre-emit grilling Q.13 predicted:

- AC-R83-12 (handler-body-replacement flip): R84 replaces the R83 console.log body → AC-R83-12 fails. Spec § 2.6 + § 5.3 third bullet documented this.
- AC-R83-15 (ALLOWED-set flip): R84 paths (`demos/engine-worker.js`, `test/q84-*`, `Q-R84-*`, `REVIEWER-REPORT-R84.md`) are not in R83's ALLOWED regex → AC-R83-15 fails. Spec § 8.13 documented this.

Implementer attested fail=15 strict; Reviewer re-ran and observed fail=15. Forward-protection arithmetic (635 R83 pass close − 2 flips + 17 R84 new = 650 pass) confirmed within band [649, 651].

### OBS-4 — Diff line count attested 10, observed 11

NEXT-ROLE.md:51 attests `git diff 0e93c15 HEAD --name-only` line count = 10. Reviewer observed 11 (the 11th file being `coordination/diagnostics/DIAGNOSTIC-R84-ac9-regex-limit.md` written during ESCALATE).

Both 10 and 11 are within the spec § 5.2 band (9-14). The Implementer's attestation was taken at a different timestamp (likely pre-DIAGNOSTIC append OR after counting via a method that excluded the diagnostic). Not a discipline violation (in-band drift), but flagged because OBSERVED attestation values should match a `git diff` rerun by the Reviewer at the same SHA exactly. Either the Implementer's count was approximate, or there is a transcription error.

---

## § 3. Right-reasons audit

Three tests audited for spec-requirement traceability + self-confirming risk.

### Test A — AC-R84-13: end-to-end Node Worker round-trip

**File:** `test/q84-live-engine-compute.test.ts:134-174`.
**Spec requirement:** Q-R84-SPEC.md directive deliverable 4 ("End-to-end: Web Worker round-trip (Node v25 native Worker OR jsdom polyfill)") + § 5 AC table row.
**Right-reasons judgement:** The test spawns a real Node `worker_threads.Worker` against the actual production `demos/engine-worker.js` file via `pathToFileURL(WORKER_PATH)`. It uses the exact `controlState` shape that the browser would send. It builds the engine bundle (`pnpm exec node tools/build-browser-bundle.js`) if absent — so a fresh-clone CI environment exercises the full path including bundle construction. The discriminating property — at least 1 `window` message + exactly 1 `terminal` message + first window has `perShard.length === 6` — would all FAIL if the worker's port shim, dynamic import, run-message filter, or window-loop logic regressed. Not self-confirming. PASS.

### Test B — AC-R84-9: postMessage shape (with MAJOR-1 finding noted)

**File:** `test/q84-live-engine-compute.test.ts:87-97`.
**Spec requirement:** Q-R84-SPEC.md § 1.6 (still in pre-amendment form) + § 5 AC table row ("region-scoped regex on btnRun handler"). NOTE: spec body has NOT been amended to match the actual test (see MAJOR-1).
**Right-reasons judgement:** The test passes because `demos/demo.html:13107` contains `worker.postMessage({ type: 'run', controlState: ... })`. The discriminating property (postMessage exists with type:"run" and a controlState reference) is satisfied. **But:** the test does NOT verify the spec § 1.6 prescription (handler-region scoping). The test diverges from its spec source. This is a self-confirming RISK because the spec body was effectively rewritten by the test, not vice versa — a future spec amendment cycle would have to read the test file rather than the spec to know what the AC actually asserts.

### Test C — AC-R84-15: R71/R79/R80/R81/R82/R83 marker preservation

**File:** `test/q84-live-engine-compute.test.ts:215-239`.
**Spec requirement:** Q-R84-SPEC.md § 5 AC table ("anti-regression — R71/R79/R80/R81/R82/R83 markers preserved | 14 marker regex matches") + § 1.6 verbatim.
**Right-reasons judgement:** The test reads `demos/demo.html` from disk and matches 16 (not 14, per MINOR-3) literal markers. Each marker corresponds to a specific prior-round structural surface: R71 scenario data delimiters, R79 verdict-banner + scrubber IDs, R80 family palette CSS variable, R81 body.scrubbing class, R82 smoke-block + side-channel, R83 control-panel section + state declarations + event name + button IDs. None of these markers are produced by R84 logic; they all exist independently in the R71-R83 codepaths. A regression in any of them (e.g., a future Implementer accidentally truncates the smoke-block, drops a R83 button, or removes the R71 begin/end markers) would fail this test. Not self-confirming. PASS.

**All three tests verified as testing real behavior, not implementation echoes.** Test B has an audit-trail problem (spec drift), not a test-design problem.

---

## § 4. Cross-cutting checks

### TDD discipline

Verified via git log:
- RED commit `3056bc4` ("test(R84 RED): 17 assert.fail stubs for live engine compute ACs") — 73 lines, 17 `assert.fail('R84 RED: AC-R84-N')` stubs. Reviewer-verified at `git show 3056bc4 -- test/q84-live-engine-compute.test.ts`.
- GREEN commit `783423f` ("feat(R84 GREEN): live engine compute via Web Worker — chore-A") — replaces stubs with verbatim spec § 1.6 body (with TD-2 AC-R84-9 change).
- RED commit timestamp: 2026-05-21 03:47:16; GREEN: 04:14:21. RED-then-GREEN ordering preserved.

Discipline PASS. Same pattern as R83 (`bd48c1e` RED → `eaf8d62` GREEN) and R82.

### Halt discipline

Implementer correctly invoked halt-conditions #3 + #5 when the Architect's `{0,3000}?` regex window was found to be too narrow (handler ~3129 chars; postMessage outside captured region). Halt sequence verified:
- DIAGNOSTIC file written at `coordination/diagnostics/DIAGNOSTIC-R84-ac9-regex-limit.md` (Reviewer did not read content per cold-eye discipline; existence verified at `git diff 0e93c15 HEAD --name-only`).
- STATUS: ESCALATE set in NEXT-ROLE.md at commit `7df7851`.
- Operator dispatched Option A resolution at commit `90f2c96`.
- Implementer resumed at GREEN.

This is the correct halt protocol. Discipline PASS. (Side-finding MAJOR-1 about spec amendment not being applied in full is separate from the halt-discipline itself, which executed correctly.)

### No-skip / Anti-scope

- 11 paths changed (Reviewer rerun: `git diff 0e93c15 HEAD --name-only | wc -l` → 11). All 11 in ALLOWED_SET (Reviewer rerun verified each path against the regex). PASS.
- `demos/scenarios/*.json` byte-identical (Reviewer rerun: `git diff 0e93c15 HEAD -- 'demos/scenarios/*.json'` → 0 bytes). PASS.
- `engine/*` untouched (Reviewer rerun: `git diff 0e93c15 HEAD -- engine/` → 0 lines). PASS.
- R82 smoke block preserved at the byte level (text identical; just relocated by upstream insertions). PASS.
- R83 surfaces (`controlState`, `R83_DEFAULTS`, `emitControlChange`, `tessera:control-change`, `btnResetParams` handler, all per-control listeners) preserved in regenerated `demos/demo.html`. PASS.
- `package.json`, `pnpm-lock.yaml`, `.gitignore` unmodified. PASS.

Discipline PASS overall.

---

## § 5. Grilling output (on this report, before routing)

| Check                                                                                                 | Verdict |
| ----------------------------------------------------------------------------------------------------- | ------- |
| Every finding has a file:line reference                                                               | yes     |
| Any AC marked PASS without actual verification                                                        | no — all 17 ACs verified by Reviewer-reread of the source file at the cited line + binding-command rerun |
| Right-reasons audit completed for ≥3 tests                                                            | yes — AC-R84-13 (end-to-end real worker round-trip; not self-confirming), AC-R84-9 (passes but diverges from spec; flagged), AC-R84-15 (16 independent markers; not self-confirming) |
| MAJOR-1 has reproduction evidence                                                                     | yes — quoted operator resolution at `NEXT-ROLE.md:13`; quoted current spec § 1.6 lines 468-476; quoted current test file lines 87-97 (the divergence); referenced `SPEC-AUDIT.md:117-119` § E saying "None — initial emission" |
| Cross-cutting checks complete (TDD, halt, anti-scope)                                                 | yes     |
| MINOR-2 flake claim verified                                                                          | partial — Reviewer ran AC-R84-14 5× in isolation, observed 0 flakes; Implementer TD-3 disclosure (1 flake in ~5 full-suite runs) accepted at face value; the race-condition rationale is structurally correct independent of observation rate |
| Self-application: would I be able to act on this report cold as the next role (Memorial Updater)?     | yes — every finding has severity, file:line, and rationale; routing decision is explicit; CONFIRMATION + VIOLATION entries below are pre-formatted for MEMORIAL append |
| Any finding I deferred rather than made                                                               | no — MAJOR-1 is a definite finding (the spec was not amended; that is a factual claim verified by direct file read); MINORs and OBS are clearly bounded |

---

## § 6. Routing

CRITICAL count: **0**.
MAJOR count: **1** (spec-amendment-ALL-gate-artifacts-propagation; not amended at spec § 1.6 + SPEC-AUDIT § E).
MINOR count: **3**.
OBS count: **4**.

Per CLAUDE-REVIEWER.md routing rule: "CRITICAL exists → STATUS: ESCALATE; MAJOR or below → STATUS: MERGE-READY."

**STATUS: MERGE-READY**

The R84 substantive deliverable (live engine compute via Web Worker; per-window streaming protocol; Cancel mechanism; error banner; R71-R83 surface preservation) is sound and the 17 R84 ACs all pass at GREEN. The MAJOR-1 finding is about audit-trail completeness (the spec body was not amended in lockstep with the test file post-ESCALATE) — it should be addressed by a coordination chore that retro-amends Q-R84-SPEC.md § 1.6 + SPEC-AUDIT § E to match the test file. This is operator-decidable: amend now (small bounded chore) OR fold into R85's spec-emission audit.

---

## § 7. Memorial appendix — pre-formatted MEMORIAL.md entries

CONFIRMATION entries (Reviewer role discipline):

```
[tessera] CONFIRMATION: cold-eye-read-discipline | R84 REVIEWER: Read coordination/PRD.md, coordination/specs/Q-R84-SPEC.md, Q-R84-SPEC-AUDIT.md, Q-R84-EMPIRICAL.sh, all 4 R84 source files (engine-worker.js + tools/build-canned-demos.ts diff + demos/demo.html diff regions + test/q84-live-engine-compute.test.ts), coordination/NEXT-ROLE.md, coordination/MEMORIAL.md R84 sections, ~/.claude/CROSS-PROJECT-MEMORIAL.md. Did NOT read coordination/diagnostics/, coordination/logs/, or .prompt-*.md. | R84 | REVIEWER

[tessera] CONFIRMATION: binding-command-attestation-rerun | R84 REVIEWER: Independently reran tsc + node --test + EMPIRICAL.sh + git diff at HEAD 1d08fcb. Observed tsc exit 0, node-test exit 1, TAP tests=669 pass=650 fail=15 skipped=4, EMPIRICAL.sh exit 0 (15 PASS / 0 FAIL across 5 blocks), 11 paths in diff (all 11 in ALLOWED_SET). All Implementer attestations reproduce. Diff line-count Implementer-attested 10 vs Reviewer-observed 11 within spec § 5.2 band [9, 14]. | R84 | REVIEWER

[tessera] CONFIRMATION: per-AC-verification-with-evidence-citations | R84 REVIEWER: All 17 ACs verified PASS at HEAD with file:line evidence citations. Used direct file reads (demos/engine-worker.js, demos/demo.html, test/q84-live-engine-compute.test.ts) + binding-command reruns (Q-R84-EMPIRICAL.sh + isolation reruns of AC-R84-13/14). No AC marked PASS without specific source-line evidence. | R84 | REVIEWER

[tessera] CONFIRMATION: right-reasons-audit-3-tests | R84 REVIEWER: Audited AC-R84-13 (end-to-end Worker round-trip — spawns real Node worker_threads.Worker against production worker file; not self-confirming), AC-R84-9 (postMessage assertion — passes but diverges from spec § 1.6 prescription, flagged in MAJOR-1), AC-R84-15 (16 prior-round markers — independent of R84 logic, not self-confirming). 2 of 3 not self-confirming; 1 audit-trail risk flagged as a finding rather than self-confirming risk. | R84 | REVIEWER

[tessera] CONFIRMATION: forward-protection-flips-correctly-predicted | R84 REVIEWER: Both predicted R83 forward-protection flips materialized: AC-R83-12 (handler-replacement) PASS→FAIL; AC-R83-15 (ALLOWED-set) PASS→FAIL. Architect pre-emit grilling Q.13 predicted both; Implementer attestation captured both within strict prediction (15 fail = 13 carry-forward + 2 R83 flips). Reviewer verified by grepping for "^not ok" in TAP output. | R84 | REVIEWER

[tessera] CONFIRMATION: anti-scope-and-byte-identity-verified | R84 REVIEWER: Reran git diff 0e93c15 HEAD with path filters: demos/scenarios/*.json 0 bytes diff (byte-identical preservation); engine/* 0 lines diff (untouched); 11-path total diff all ⊆ ALLOWED_SET regex; R82 smoke block markers (R82-SMOKE-BLOCK-START/END + __tessera_r82_smoke__) preserved (relocated to lines 13560-13585 by R84's upstream IIFE additions, byte-identical content); R83 surfaces (controlState, R83_DEFAULTS, emitControlChange, tessera:control-change, btnResetParams) all preserved. | R84 | REVIEWER

[tessera] CONFIRMATION: role-boundary-no-fixes-applied | R84 REVIEWER: Documented findings only. Did not modify Q-R84-SPEC.md § 1.6 (MAJOR-1 finding — left for operator/coordination-chore resolution per Reviewer role boundary). Did not modify test/q84-live-engine-compute.test.ts (MINOR-1, MINOR-2 left as findings). Did not modify .gitignore (OBS-1 left as observation). | R84 | REVIEWER
```

VIOLATION entries (per CLAUDE-REVIEWER.md REINFORCED 2026-05-17: append VIOLATION for every finding ≥ MINOR; per REINFORCED 2026-05-19 second entry: `[role]` field names the COMMITTING role, not the detecting role):

```
[tessera] VIOLATION: spec-amendment-ALL-gate-artifacts-propagation | R84 REVIEWER MAJOR-1: Operator ESCALATE resolution at coordination/NEXT-ROLE.md:13 prescribed six numbered Implementer-scope steps; step 1 was "Q-R84-SPEC.md § 1.6: AC-R84-9 new assertion ... (direct full-HTML; no region scoping)". Implementer executed steps 2-6 (test file body, EMPIRICAL.sh prediction, GREEN commit, re-attest, route) but did not execute step 1. Q-R84-SPEC.md:468-476 still contains pre-amendment AC-R84-9 prescription with handler-region scoping. Q-R84-SPEC-AUDIT.md:117-119 § E still says "None — this is the initial Q-R84-SPEC.md emission". 5th tessera instance of spec-not-amended-post-disposition pattern (R25 MAJOR-2 + R25 MAJOR-3 + R79 MAJOR-1 + R82 MAJOR-1 + R84). | R84 | IMPLEMENTER

[tessera] VIOLATION: operator-resolution-regex-strictness-not-applied | R84 REVIEWER MINOR-1: Operator-prescribed regex at NEXT-ROLE.md:13 was strict: /worker\.postMessage\s*\(\s*\{\s*type:\s*['"]run['"],\s*controlState\s*:/ (no chars between `{` and `type:`; comma + colon required). Implementer-applied regex at test/q84-live-engine-compute.test.ts:95 is the original permissive pattern /worker\.postMessage\s*\(\s*\{[\s\S]*?type:\s*['"]run['"][\s\S]*?controlState/ (lazy any-chars match). Both pass against current demo.html; Implementer's regex is materially less discriminating against future payload-shape drift. TD-2 disclosure mentioned the scope change but not the regex-strictness deviation from operator prescription. | R84 | IMPLEMENTER

[tessera] VIOLATION: ac-r84-14-structurally-flaky-race-condition | R84 REVIEWER MINOR-2: AC-R84-14 (worker.terminate() halts streaming) is structurally flaky in Node worker_threads context. The worker can post all 51 messages synchronously into the message queue before the main thread processes message #1 and calls terminate(). Implementer disclosed TD-3 (1 flake in ~5 full-suite runs; count=51). Reviewer 5× isolation reruns all PASS, but the race is real and structural (worker_threads.terminate() is async; synchronous message emission can outrun it). The discriminating property "fewer than 50 messages" is satisfied probabilistically, not by terminate() actually pre-empting emission. | R84 | ARCHITECT

[tessera] VIOLATION: ac-r84-15-marker-count-mismatch-spec-test | R84 REVIEWER MINOR-3: Q-R84-SPEC.md § 5 AC table at :900 says "AC-R84-15 | ... | 14 marker regex matches"; test/q84-live-engine-compute.test.ts:215-239 contains 16 marker assert.match calls (2 R71 + 2 R79 + 1 R80 + 1 R81 + 3 R82 + 7 R83 = 16). Spec § 5.3 first bullet and § 8.1 also cite "14 markers". Cosmetic discrepancy; discriminating power unaffected. | R84 | ARCHITECT
```
