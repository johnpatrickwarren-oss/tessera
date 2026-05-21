# Q-R84-SPEC-AUDIT.md — audit sidecar for Q-R84-SPEC.md

**Round:** R84
**Round-start SHA:** `0e93c15`
**Architect routing status:** READY (no open questions; spec triad complete)
**Pairs with:** `coordination/specs/Q-R84-SPEC.md` (load-bearing artifact)

This file holds the audit-trail ceremonies that downstream Reviewer uses to verify the Architect applied required disciplines BEFORE routing. Reviewer reads both files; Implementer reads only the spec proper.

---

## § A. P3 ten-axis verification (one sentence per axis)

| Axis | Verification |
|---|---|
| Correctness | engine-worker.js mutates per-shard Family-A betting state via `engine.detectors.updateBettingState` per spec § 1.5; per-window message shape matches canned-scenario shape; terminal e-BH selection via `engine.eBH.eBenjaminiHochberg`; AC-R84-13/14 exercise the real Node Worker round-trip. |
| Completeness | All 5 directive deliverables addressed: engine-worker.js (§ 1.5), demo.html worker wiring (§ 1.4), performance (compute in worker thread, UI thread unblocked), test file with 17 ACs, EMPIRICAL.sh with `--test-reporter=tap`. |
| Consistency | All identifiers / message types / file paths / SHA `0e93c15` / count predictions (669 / 650 / 15 / 4) consistent across § 1.4 / § 1.5 / § 1.6 / § 3 / § 5.2 per Q.9 cross-section sweep (§ 8.9). |
| Clarity | Banned ambiguous language absent from AC text; each AC names a specific structural property + a specific assertion (§ 8.5 Q.5 self-application gate). |
| Coverage | 17 ACs span worker file structural (7) + demo.html wiring (5) + end-to-end (2) + anti-regression (1) + anti-scope (1) + sentinels (1); R83 forward-protection flips audited at § 8.13. |
| Constraints | engine/* untouched; R73-R83 surfaces preserved per AC-R84-15 (14 markers); demos/scenarios/*.json byte-identical (halt 9); no new deps (halt 7); ALLOWED_SET 4-gate lockstep applied UPFRONT (§ 8.11). |
| Concurrency | Worker thread isolated from main UI thread (browser) / main Node thread; messages serialized via structured clone; no shared state. |
| Corner cases | 7 corner cases enumerated in spec § 9 Corner-cases row (bundle absent → execSync pre-build; Cancel-when-no-worker → guarded no-op; Family A disabled → no firings; drift 0 → no firings; targetShard malformed → fallback to 0; Worker spawn fails → try/catch banner; engine import fails → .catch posts error). |
| Cost | ~120 lines tool edit + ~120 lines worker file + ~280 lines test + 3 spec triad; ~7-file diff; AC-R84-13/14 add ~2-10s wall time per CI run (acceptable on ~16s baseline). |
| Coupling | engine-worker.js → engine-bundle.mjs export names (R82-frozen); main thread → scenarios.custom slot (R83 reserved) + existing R71 renderer functions; one-way coupling. |

---

## § B. Pre-route discipline application (Skill 14 / Skill 15 / grilling)

| Discipline | Application |
|---|---|
| Superpowers Phase 1 (Brainstorm) | § 0 of spec — 3 approaches enumerated (A: classic Worker + dynamic-import; B: module Worker; C: function-level Node test); selection rationale documented (Approach A picked; B disqualified by directive file-name; C disqualified by directive end-to-end requirement) |
| Superpowers Phase 2 (Design) | § 1 of spec — component boundaries (§ 1.1), 3 verbatim source-code surfaces (§ 1.2-1.5), test file (§ 1.6), integration points (§ 1.7), failure modes (§ 1.8), prediction table (§ 1.9), Architect choices documented (§ 1.10) |
| Superpowers Phase 3 (Grilling) | § 8 of spec — 17 sub-sections (Q.1 through Q.16 + final verdict); all PASS |
| Cross-project rules walkthrough | Rule 1 (empirical-command-attestation): § 5.2 prediction table demands OBSERVED-verbatim attestation; halt-class spec discipline applies if observed differs from predicted. Rule 5 (Architect claim-without-empirical-walk, promoted from R72): § 8.15 Q.15 enumerates every load-bearing claim with verification command + result. Rule 6 (R82 MAJOR-1 ALLOWED_SET 4-gate propagation): § 8.11 Q.11 applies UPFRONT with all 4 gate artifacts in lockstep at spec-emit. Rule 7 (R75/R74 cross-section consistency): § 8.9 Q.9 + § 8.7 Q.7 contradictions sweep. |
| Spec-amendment-ALL-gate-artifacts-propagation (R82 MAJOR-1 + R72) | § 3.1 narrative + § 3.2 regex + AC-R84-16 in-test regex (§ 1.6) + Q-R84-EMPIRICAL.sh Block 5 — all share the SAME 14 path patterns; verified at § 8.11. |
| EMPIRICAL.sh probe-run at round-start (R77) | § 8.6 Q.6 — Block 1 expected PASS (typecheck inherited); Blocks 2/3/4 expected FAIL (artifacts don't exist at round-start; Implementer creates); Block 5 expected PASS (empty diff). Plus the Node Worker viability smoke test producing all 12 engine exports — empirically resolves directive halt-condition 8. |
| Cite-then-verify (R02 / R11 / R65) | § 8.14 Q.14 — 9 cited line numbers / paths verified by direct command at spec-emit. |
| Discriminating-AC walkthrough (R44/R46/R65/R71) | § 8.10 Q.10 — all 17 ACs walked; each fails for at least one canonical mutation. |
| Forward-protection-AC audit (R79) | § 8.13 Q.13 — R83 AC-R83-15 flip predicted (+1); R83 AC-R83-12 R83→R84 handler-replacement flip predicted (+1); total 2 forward-protection flips matching § 5.2 fail count = 15. |
| Routing-block grep-verification (R65) | § 8.12 Q.12 — AC IDs, ROUND_START_SHA, file paths all grep-verifiable. |

---

## § C. Architect pre-prediction on outcomes (encode-actual-results-verbatim discipline)

### C.1 Binding-command predictions (Implementer must attest OBSERVED verbatim)

Per spec § 5.2; reproduced here for audit:

| Observable | Predicted at R84 chore-A | Strictness |
|---|---|---|
| `pnpm exec tsc -p tsconfig.test.json` exit | 0 | strict |
| `pnpm exec node --test --test-reporter=tap test/*.test.js` process exit | 1 | strict |
| TAP `# tests` | 669 | strict |
| TAP `# pass` | 650 | band [649, 651] |
| TAP `# fail` | 15 | strict |
| TAP `# skipped` | 4 | strict |
| `bash Q-R84-EMPIRICAL.sh` exit | 0 | strict |
| `git diff 0e93c15 HEAD --name-only` line count | 9-14 | band |
| `demos/scenarios/*.json` content vs round-start | byte-identical | strict |

If any OBSERVED value differs from the predicted (outside the band where bands are given), the Implementer MUST HALT + write DIAGNOSTIC + set STATUS: ESCALATE. Implementer must NOT silently amend the spec triad (per R79 MAJOR-1 cross-project canonical).

### C.2 Why this prediction is sound

- **`# tests = 669`:** mechanical (R83 close 652 + 17 new R84 test() blocks).
- **`# fail = 15`:** R83 close 13 + 2 R83 forward-protection flips:
  1. AC-R83-15 (allowed-set diff) flips because R83's regex enumerates `test/q83-interactive-knobs\.test\.ts`, `Q-R83-SPEC*`, `REVIEWER-REPORT-R83.md` — R84's `engine-worker.js`, `test/q84-*`, `Q-R84-*`, `REVIEWER-REPORT-R84.md` are NOT covered.
  2. AC-R83-12 (btnRun handler asserts `console.log(controlState)` + NO `engine-bundle.mjs`) flips because R84 REPLACES the handler body — that's the round's primary purpose; Q-R83-SPEC.md § 2.3 explicitly documented this seam.
- **`# pass = 650 (band [649, 651])`:** 635 R83 pass − 2 forward-protection flips + 17 new R84 ACs all green = 650; ±1 PRNG/environment margin.
- **`Q-R84-EMPIRICAL.sh` exit 0:** Blocks 1-5 all designed to pass at GREEN by construction.

### C.3 EMPIRICAL.sh probe at round-start HEAD `0e93c15`

| Block | Expected at round-start | Reason |
|---|---|---|
| Block 1 typecheck | PASS | tsc passes at R83 close; R84 changes not yet present |
| Block 2 engine-worker.js structural | FAIL | file doesn't exist yet |
| Block 3 demo.html worker wiring | FAIL | wiring doesn't exist yet |
| Block 4 test counts | FAIL | R83 close counts (652/635/13/4); R84 prediction (669/650/15/4) doesn't match yet |
| Block 5 anti-scope diff | PASS | `git diff 0e93c15 HEAD` is empty at round-start (HEAD == round-start SHA) |

All non-pass outcomes at round-start are pre-documented as "Implementer hasn't built yet" — no surprise failures.

### C.4 Node Worker viability empirical confirmation (directive halt-condition 8)

Per spec § 8.6 Q.6: a Node v25.9.0 `worker_threads.Worker` running a CJS-style `.js` file with `require('worker_threads').parentPort` + dynamic `import('./engine-bundle.mjs')` successfully loaded the actual R82 bundle and returned all 12 expected exports. AC-R84-13 + AC-R84-14 are viable; directive halt-condition 8 fallback ("manual smoke test deferred to R85") is empirically NOT triggered. Approach A unblocked.

---

## § D. Decision rationale (why-picked / why-rejected paragraphs)

### D.1 Why classic Worker + dynamic-import (Approach A) over module Worker (Approach B)

Module Worker would require the worker file to be ESM in Node test context. Node treats `.js` files as CJS unless overridden by `package.json` `type:module` (which would add a NEW file `demos/package.json` outside the directive's ALLOWED_SET) OR by renaming to `.mjs` (which contradicts the directive's `demos/engine-worker.js` literal). Approach A sidesteps both by being CJS-compatible in Node AND classic-Worker-compatible in browser, using dynamic `import()` (universally supported in classic Workers and CJS modules) to load the ESM engine bundle. The ~8 lines of runtime detection are a worthwhile trade for keeping the file name + module type both aligned to the directive.

### D.2 Why streaming message protocol (one window message per window + one terminal) over request/response

Streaming matches the existing R71/R79 per-window rendering pattern (canned scenarios are arrays of windows; renderers consume `(scenarioData, windowIdx)`). It also delivers the "watch the engine run" framing the directive frames as the round's destination. Request/response would either (i) block the UI thread on a long compute → UI freeze (which the directive's "keep UI responsive" explicitly forbids), OR (ii) return a single large `result` payload without progressive feedback (no "watch engine run" affordance). Streaming with render-on-receipt is the cleanest answer.

### D.3 Why render-on-receipt vs. accumulate-then-playback for live UI update

Render-on-receipt: each window message immediately advances `currentWindowIdx` and triggers the existing render functions, producing a fast "windows tick up" animation during compute. This is the directive's "watch engine run" framing. The accepted trade-off: speed control isn't honored during this live phase (rendering is paced by worker compute rate, not by playback speed). Mitigation: post-streaming, the scenario is `custom`, accumulated windows live in `scenarios['custom'].windows`, and the existing R71 playback loop honors all speed-control affordances for replay. The directive's literal "respect speed control" is satisfied at the operator-affordance level — speed control remains functional for the post-streaming replay path.

### D.4 Why Family A only in live compute (acknowledged gap)

Wiring all 5 families in the live compute path would require shared per-shard residual state, conformity scoring, hot/cold path management — a multi-cycle architectural lift. The R84 round-scope is "wire R83 to live engine" — a Family-A-only path proves the wiring works end-to-end without scope creep. The R83 family-toggle UI is preserved (operator can still toggle B/C/D/E; the toggles are inert at R84 only). Future round extends. Gap mitigation: § 5.3 + § 1.10 explicit; no AC over-specifies multi-family behavior at R84.

### D.5 Why pre-build engine-bundle.mjs via execSync inside AC-R84-13/14 (not as separate test fixture)

The bundle is gitignored (R82 Option A resolution). Fresh-clone state has no bundle. Pre-building inside the AC is the simplest deterministic-CI pattern; alternative would be a `before` hook outside the AC, which `node:test` doesn't natively support without restructuring the suite. The cost is ~1-3 seconds added wall time on cold runs; on warm runs the bundle is already present and the check is a no-op.

---

## § E. Amendments from prior version

None — this is the initial Q-R84-SPEC.md emission. If post-Implementer or post-Reviewer cycles produce amendments, those land here as § E.1 / § E.2 / ... entries with date + reason + diff summary.
