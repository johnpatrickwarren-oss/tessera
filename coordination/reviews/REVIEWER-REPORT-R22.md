# REVIEWER REPORT — R22 (Phase 2 SLICE 2 Close-Walk + R20/R21 MINOR cleanup)

**Tier:** audit (Implementer-authored spec)
**Baseline SHA:** `f7111c9`
**Implementer chore-A SHA:** `480fc43`
**HEAD at review:** `373b841` (post chore-B / chore-B2 / chore-B3)
**Inputs read:** `coordination/PRD.md`; `coordination/specs/Q-R22-SPEC.md`; `coordination/NEXT-ROLE.md`; `coordination/PHASE-2-SLICE-2-CLOSE-WALK.md`; `coordination/MEMORIAL.md` (R21 + R22 sections); R22-touched test files + `engine/fleet/verdict-consumer.ts` + `engine/verdict-groups.ts`; R20 + R21 Reviewer reports; `~/.claude/CROSS-PROJECT-MEMORIAL.md` (Reviewer-section spot checks).
**Inputs NOT read:** `coordination/diagnostics/` (none for R22); `coordination/logs/` (cold-review boundary); any `.prompt-*.md` (cold-review boundary).
**Post-R22 OBSERVED tests (Reviewer cold re-run at HEAD `373b841`):** `tests 204 / pass 204 / fail 0` (204 = 192 R20-baseline + 9 R21 + 2 R22 AC-R22-3/4 + 1 R22 AC-R22-8 chore-B test).

---

## 1. Per-AC verification table

| AC-ID | Criterion (short) | Status | Evidence |
|---|---|---|---|
| AC-R22-1 | PHASE-2-SLICE-2-CLOSE-WALK.md exists with required § 1–§ 6 content | PASS-WITH-OBS | `coordination/PHASE-2-SLICE-2-CLOSE-WALK.md:1-234`. § 1 names R18/R20/R21 + HEAD `480fc43` (line 10); § 2 has 4 themes (vendoring 2.1, split-decision 2.2, 0-MAJOR streak 2.3, line-citation-drift 2.4); § 3 names HardwareTopologySource + `engine/topology-overlay.ts:40-43` + OQ-1/OQ-R08-3/LS-4; § 4 has 8 disposition rows (covers R20 MINOR-1/2/3 + R21 MINOR-1/2/3 — see OBS-1 for R21 OBS-2 omission); § 5 REINFORCED counts COMMON:3 ARCH:21 IMPL:35 REVIEWER:1 MEMORIAL:0 = 60 (Reviewer cold-verified via `grep -c "^# REINFORCED" CLAUDE-*.md` → 3/21/35/1/0); § 6 cites Q-R20/R21/R22-SPEC.md + REVIEWER-REPORT-R20/R21.md |
| AC-R22-2 | q20:4-6 header removes AC-R20-12 from binding-command list; reclassifies as runtime test | PASS | `test/q20-verdict-grouper-cluster-event-scope.test.ts:4-6`. Line 4 lists `AC-R20-10 (manifest row), AC-R20-11 (AT_PIN_FILES), AC-R20-13 (typecheck),` — AC-R20-12 absent. Line 5–6 conclude "...are binding-command attestations reported by the / Implementer at GREEN. **AC-R20-12 (anti-scope diff) is a runtime test per § 4.7**." Both gating clauses satisfied |
| AC-R22-3 | q21 dedup-guard structural test; PASS on current code; FAIL if `seen_group_ids.has()` guard removed | PASS | `test/q21-fleet-verdict-consumer.test.ts:195-215` `test('AC-R22-3: rollupByClusterEvent deduplicates when multiple results share the same group_id')`. Cold-run `node --test test/q21-fleet-verdict-consumer.test.js` → AC-R22-3 ✔. Test setup proves the duplication-binding (`assert.strictEqual(out.ingest_results[0].attributed_group.group_id, out.ingest_results[1].attributed_group.group_id)` at :207-210); guard-binding asserted at `rollup.groups.length === 1` (:213). Guard at `engine/fleet/verdict-consumer.ts:87` confirmed by direct read. See OBS-3 for stronger-than-spec coverage note |
| AC-R22-4 | q21 short-circuit structural test; PASS on current code; FAIL if `:77-79` short-circuit removed | PASS | `test/q21-fleet-verdict-consumer.test.ts:225-239` `test("AC-R22-4: rollupByClusterEvent('') short-circuits even when groups have cluster_event_id === ''")`. Cold-run → AC-R22-4 ✔. Setup-binding asserts raw `''` storage (`assert.strictEqual(out.ingest_results[0].attributed_group.cluster_event_id, '')` at :234). Short-circuit-binding asserts `rollup.groups === []` at :237. Confirmed `engine/verdict-groups.ts:183` stores `cluster_event_id` raw (`cluster_event_id: cluster_event_id`); `engine/fleet/verdict-consumer.ts:77-79` short-circuit confirmed by direct read |
| AC-R22-5 | q01:8 line contains "36 files", "7", "6"; arithmetic sums to 36 | PASS | `test/q01-no-at-pin-deltas.test.ts:8` reads "type files at-pin (7 excl config.ts, verdict.ts) + compilation deps (6) + SLICE 4 tools (3) = 36 files." (a) "36 files" present ✓; (b) "7" + "6" present ✓; (c) arithmetic 11(detectors per line 7) + 5(family types per line 7) + 4(core per line 7) + 7(type files at-pin) + 6(compilation deps) + 3(SLICE 4 tools) = 36 ✓. Cross-verified against AT_PIN_FILES array at `:29-76` — Reviewer counted 11+5+4+7+6+3 = 36 entries; matches line 8 formula |
| AC-R22-6 | `npx tsc -p tsconfig.test.json` → exit 0 | PASS | Reviewer cold ran `npx tsc -p tsconfig.test.json` → exit 0 |
| AC-R22-7 | `node --test test/*.test.js` → pass 203 / fail 0 | PASS-WITH-MINOR | Spec literal says 203; Reviewer cold-run at HEAD `373b841` returns **204** / 0. The 203 was the count at chore-A (`480fc43`, immediately after the GREEN commit `1fe3aa2` + chore-A routing); chore-B (`44d7145`) added the AC-R22-8 runtime test → +1 = 204. AC-R22-7 is the GREEN-state binding per SHA-pinned-runtime-AC convention (R20 AC-R20-14 / R21 AC-R21-10 precedent). At chore-A SHA `480fc43`, Reviewer cold-checked via `git stash` + checkout (see Routing note); pass count confirmed 203 / 0. **See MINOR-1 for wording-vs-HEAD-divergence finding** |
| AC-R22-8 | `git diff f7111c9..480fc43 --name-only` ⊆ 8-entry allowed-set | PASS | `test/q21-fleet-verdict-consumer.test.ts:244-262` `test('AC-R22-8: git diff baseline..chore-A only contains allowed-set paths')`. Cold-run → AC-R22-8 ✔. Reviewer cold-ran `git diff f7111c9..480fc43 --name-only` → 7 paths: `coordination/{MEMORIAL,NEXT-ROLE,PHASE-2-SLICE-2-CLOSE-WALK}.md`, `coordination/specs/Q-R22-SPEC.md`, `test/q01-no-at-pin-deltas.test.ts`, `test/q20-…test.ts`, `test/q21-…test.ts`. All 7 ∈ allowed-set (8 entries; `test/q21-…test.js` is the only allowed-set entry not in the diff, since `.js` is gitignored in this project; matches R21 AC-R21-11 pattern) |

**Aggregate:** 8/8 ACs PASS (1 PASS-WITH-OBS for AC-R22-1 [R21 OBS-2 omission from disposition table]; 1 PASS-WITH-MINOR for AC-R22-7 [HEAD divergence; SHA-pinned-binding convention preserved]). 0 FAIL. 0 PARTIAL.

---

## 2. Findings

### CRITICAL — none.

### MAJOR — none.

### MINOR

**MINOR-1 — AC-R22-7 spec literal "= 203" does not hold at MERGE-READY HEAD; "after R22 implementation commits" is ambiguous between chore-A and post-chore-B.**

- Spec § 4.7: _"AC-R22-7 — Given the full test suite after R22 implementation commits, when `node --test test/*.test.js` runs, then pass count = 203 and fail count = 0. (Baseline 201 + 2 new AC-R22-3 + AC-R22-4 tests.)"_
- At MERGE-READY HEAD (`373b841`, post chore-B / chore-B2 / chore-B3), Reviewer cold-ran `node --test test/*.test.js` → `tests 204 / pass 204 / fail 0`. The 203 literal held at chore-A SHA `480fc43` only.
- The 204-at-HEAD is acknowledged by the Implementer in `coordination/NEXT-ROLE.md:165` ("Post chore-B count: 204 pass / 0 fail"), but the spec § 4.7 AC literal itself was not updated to disambiguate. A third-party reading the spec at HEAD will see the literal "= 203" and a passing test suite of 204 — a literal mismatch.
- The SHA-pinned-binding convention is established by R20 AC-R20-14 + R21 AC-R21-10 + R20/R21 chore-B forward-protection precedent, so the substance of the AC is intact. The finding is wording precision, not behavior.
- Suggested forward-fix (no R22 action required): future audit-tier specs that include a chore-B forward-protection AC should write the binding-command AC as "at chore-A SHA `<SHA>`, …" (anchored to a SHA, not the ambiguous "after R22 implementation commits"). Pattern equivalent to AC-R22-8's explicit SHA range.

### OBS

**OBS-1 — Close-walk § 4 disposition table omits R21 OBS-2 even though AC-R22-4 / Deliverable 4 materially closes it.**

- `coordination/reviews/REVIEWER-REPORT-R21.md` § 2 OBS-2: _"Empty-string `input.cluster_event_id` consumer-layer behavior is not directly AC-bound."_ The R21 OBS-2 surface is exactly what AC-R22-4 / Deliverable 4 added: a structural test that pins consumer-layer behavior when `input.cluster_event_id: ''` flows through `fleetTickIngest` → `rollupByClusterEvent`.
- The close-walk § 4 table at `coordination/PHASE-2-SLICE-2-CLOSE-WALK.md:174-182` has 8 rows: R20 MINOR-1/2/3 + R20 OBS-1 + R21 MINOR-1/2/3/4. R21 OBS-2 is not listed.
- AC-R22-1(d) gating language: _"a § 4 MINOR disposition table with ≥6 rows covering R20 MINOR-1/2/3, R21 MINOR-1/2/3."_ Strictly the AC passes (the 6 required rows are present). But cross-round audit traceability would improve by listing R21 OBS-2 as **CLOSED** by Deliverable 4. Not a spec violation; observation for future close-walk authoring.
- Other carry-forward OBS items from R20 + R21 (R20 OBS-2, OBS-3; R21 OBS-1, OBS-3, OBS-4) are appropriately omitted — they document established conventions, not actionable items.

**OBS-2 — Close-walk § 1 state-table reports "Test count | 203 / 0" at SLICE 2 close; current HEAD is 204.**

- `coordination/PHASE-2-SLICE-2-CLOSE-WALK.md:51` reports test count 203 at SLICE 2 close. The convention "HEAD at SLICE 2 close: `480fc43` (R22 chore-A)" is documented at the header (`:10`), so the convention is internally consistent.
- A future reader who runs `node --test test/*.test.js` at the actual git HEAD will observe 204 and not immediately reconcile against "203 at chore-A." The header line 10 disclosure prevents a true literal-vs-reality mismatch, but the close-walk could benefit from a footnote on `:51` clarifying "203 at `480fc43`; +1 to 204 at post-chore-B HEAD `373b841` (AC-R22-8 runtime test added per § 4.7 forward-protection)."
- Same shape as MINOR-1; close-walk inherits the ambiguity but documents the convention.

**OBS-3 — AC-R22-3 dedup test binds both `seen_group_ids` AND `seen_deploy_ids` guards.**

- Spec § 3 Deliverable 3 prescribes the test as exercising the `seen_group_ids.has()` guard at `engine/fleet/verdict-consumer.ts:87`. The test at `test/q21-fleet-verdict-consumer.test.ts:213-214` asserts BOTH `rollup.groups.length === 1` AND `rollup.deploy_ids.length === 1`.
- Failure-mode analysis: removing `seen_group_ids.has(g.group_id)` guard at `:87` → groups.length becomes 2 → first assertion fails. Removing `seen_deploy_ids.has(g.deploy_id)` guard at `:91` → deploy_ids.length becomes 2 → second assertion fails.
- The test thus structurally binds both dedup branches. This is stronger coverage than spec § 3 Deliverable 3 mandates. Positive observation; no fix required.

**OBS-4 — Close-walk § 6 commit chain lists through `a1afc24` (chore-B2) but cannot list its own enclosing commit `373b841` (chore-B3).**

- `coordination/PHASE-2-SLICE-2-CLOSE-WALK.md:219-224` enumerates ad12f46 → 1fe3aa2 → 480fc43 → 44d7145 → a1afc24. `373b841` is the commit that performs the substitution itself (resolves `<CHORE-B-SHA>` placeholder) and is structurally unable to include its own SHA.
- This is a known chicken-and-egg property of SHA-substitution patterns. Not actionable. Inherited convention from R20/R21.

---

## 3. Right-reasons audit (3 tests)

**Test 1 — `AC-R22-3: rollupByClusterEvent deduplicates when multiple results share the same group_id` (`test/q21-fleet-verdict-consumer.test.ts:195-215`)**

- **Spec requirement traced:** Spec § 3 Deliverable 3 + AC-R22-3 in § 4. Origin: REVIEWER-REPORT-R21.md MINOR-2 ("AC-R21-7 does not exercise the dedup-by-group_id branch in `rollupByClusterEvent`").
- **Why it passes:** Two verdicts with `deploy_ref: 'deploy-A'`, same `ts_seconds`, same `cluster_event_id: 'evt-X'` produce two IngestResults attributed to the SAME VerdictGroup (composite-key `evt-X|deploy-A` → single open group; second ingest appends to it via `appendToOpen`). `rollupByClusterEvent('evt-X', results)` then iterates over both results; first iter pushes the group; second iter finds `seen_group_ids.has(g.group_id) === true` → skips push. `rollup.groups.length === 1`.
- **Self-confirming check:** The test asserts the precondition (`out.ingest_results[0].attributed_group.group_id === out.ingest_results[1].attributed_group.group_id` at :207-210) BEFORE asserting the dedup outcome — this is the test setting up its own invariant, not the production code "confirming itself." If the VerdictGrouper composite-key logic were ever broken to produce different group_ids for the same `(cluster_event_id, deploy_ref, ts)` tuple, the precondition would fail and the dedup test would not be vacuous-passing. **NOT self-confirming.**

**Test 2 — `AC-R22-4: rollupByClusterEvent('') short-circuits even when groups have cluster_event_id === ''` (`test/q21-fleet-verdict-consumer.test.ts:225-239`)**

- **Spec requirement traced:** Spec § 3 Deliverable 4 + AC-R22-4 in § 4. Origin: REVIEWER-REPORT-R21.md MINOR-3 ("AC-R21-8 does not disambiguate the empty-string short-circuit branch from the strict-equality filter branch").
- **Why it passes:** `fleetTickIngest({per_shard_verdicts: [...], cluster_event_id: ''})` propagates `''` raw to `grouper.ingest`, which stores it raw on the VerdictGroup at `engine/verdict-groups.ts:183` (line 183: `cluster_event_id: cluster_event_id`). The group's `group_id` uses the legacy format because `'group-${cluster_event_id}-…'` is gated by `if (cluster_event_id)` (line 166), and `''` is falsy. So the group has `cluster_event_id === ''` AND `group_id === 'group-deploy-A-1700000000'`. The test asserts the raw-storage precondition at `:234`. Then `rollupByClusterEvent('', results)` hits the short-circuit at `engine/fleet/verdict-consumer.ts:77-79` and returns `{ groups: [], deploy_ids: [] }`.
- **Self-confirming check:** Failure-mode counterfactual — if the short-circuit lines 77-79 were removed, the loop body would evaluate `g.cluster_event_id !== cluster_event_id` → `'' !== ''` → `false` → continue NOT taken → push the group → `rollup.groups.length === 1`. The test would fail the final `deepStrictEqual(rollup.groups, [])` assertion. The raw-storage precondition at :234 prevents vacuous passing under an alternative implementation that coerces `''` to `undefined`. **NOT self-confirming.**

**Test 3 — AC-R22-1 close-walk doc structure (verification by Reviewer reading `coordination/PHASE-2-SLICE-2-CLOSE-WALK.md`)**

- **Spec requirement traced:** Spec § 4.1 — close-walk doc with 6 sections, each with specific content gating clauses (a)–(f).
- **Why it passes:** Doc-level verification, not a runtime test. Reviewer cold-read the document and verified each gating clause (see AC-R22-1 row in § 1).
- **Self-confirming check:** The doc structure is concrete and the gating clauses cite specific tokens (R18/R20/R21 names, REINFORCED count sums, AC numbers). The Reviewer can verify each clause without trusting the Implementer's attestation — e.g., `grep -c "^# REINFORCED" CLAUDE-*.md` cold-verified the § 5 numbers; `engine/topology-overlay.ts:40-43` cold-verified the TopologySource interface reference in § 3. **NOT self-confirming.**

**14th consecutive Tessera Reviewer right-reasons audit (R08–R22); no self-confirming test found.**

---

## 4. Cross-cutting checks

**TDD discipline.** R22 is structurally test-only. The GREEN commit (`1fe3aa2`) contains the close-walk doc, q20/q01 header fixes, and the two new q21 test rows (AC-R22-3, AC-R22-4). No production code changes anywhere — `git diff f7111c9..HEAD -- 'engine/*' 'test/_substrate/*' 'tools/*'` returns empty. The two structural tests bind to PRE-EXISTING production guards (`seen_group_ids` at `:87`; short-circuit at `:77-79`), so a traditional RED→GREEN cycle does not apply — the production code already exists and is correct; the gap was test coverage. The Implementer correctly memorialized this as `tdd-structural` (not `tdd-red-ordering`) in `coordination/MEMORIAL.md:2002`. Audit-tier MINOR-cleanup discipline: **✓**.

**No-skip / halt discipline.** No DIAGNOSTIC files filed; no `STATUS: ESCALATE` events; no halts. Implementer memorial entry at `coordination/MEMORIAL.md:2010` confirms: "No halt conditions encountered. No engine/*.ts conflicts (R22 anti-scope); no spec/reality conflicts." All ACs resolved per spec § 4 + NEXT-ROLE.md directives. **✓**.

**Anti-scope completeness gate.** Per CROSS-PROJECT-MEMORIAL.md REINFORCED 2026-05-17 (R19 reinforcement), Reviewer ran the round-start-to-HEAD diff: `git diff f7111c9..HEAD --name-only` returns exactly 7 paths — `coordination/{MEMORIAL,NEXT-ROLE,PHASE-2-SLICE-2-CLOSE-WALK}.md`, `coordination/specs/Q-R22-SPEC.md`, `test/q01-no-at-pin-deltas.test.ts`, `test/q20-verdict-grouper-cluster-event-scope.test.ts`, `test/q21-fleet-verdict-consumer.test.ts`. All 7 ∈ pre-authorized R22 scope per NEXT-ROLE.md lines 26-32. Scoped diff `git diff f7111c9..HEAD --name-only -- 'engine/*' 'test/_substrate/*' 'tools/*'` → empty. **✓**. (The AC-R22-8 in-test diff range `f7111c9..480fc43` is structurally the chore-A snapshot — the round-start-to-HEAD diff above is the load-bearing completeness check; both agree.)

**Architect ceremony (cold-spot check).** R22 is audit-tier (Implementer-authored spec). Spec file `coordination/specs/Q-R22-SPEC.md` was committed as Commit A (`ad12f46`) BEFORE Commit B (`1fe3aa2`) BEFORE chore-A (`480fc43`). R21 MINOR-1 reinforcement applied (Implementer memorial line 2000: "spec-commit-sequencing"). No Q-R22-SPEC-AUDIT.md sidecar required (no separate Architect role in audit-tier). **✓ with no MINOR**.

**Line-citation accuracy (cross-project rule active per R21 MINOR-4).** R22 attestation citations verified against actual `test()` declaration lines. AC-R22-3 cited `:195` — Reviewer cold-grep `grep -n "^test('AC-R22-3" test/q21-fleet-verdict-consumer.test.ts` → line 195 (verified). AC-R22-4 cited `:225` — verified. AC-R22-5 cited `:8` (header-line, not test declaration; acceptable for header-fix AC). AC-R22-2 cited `:4-6` (header lines; acceptable for header-fix AC). 1st post-derivation tessera round applying the cross-project line-citation rule without drift. **✓**.

---

## 5. Grilling output (on this report, before routing)

| Gate | Assessment |
|---|---|
| Every finding has a `file:line` reference? | YES — MINOR-1 cites spec § 4.7 + HEAD `373b841`; OBS-1 cites `coordination/PHASE-2-SLICE-2-CLOSE-WALK.md:174-182`; OBS-2 cites `:51` + `:10`; OBS-3 cites `test/q21-…test.ts:213-214` + `engine/fleet/verdict-consumer.ts:87` + `:91`; OBS-4 cites `:219-224` |
| Any AC marked PASS without verification? | NO — every PASS row cites a file:line OR a Reviewer-run binding command output. AC-R22-6 + AC-R22-7 cite cold Reviewer command output; AC-R22-3/4/8 cite cold `node --test` runs + direct production-code reads of the bound guards; AC-R22-1/2/5 cite direct file inspection + cross-verification (grep / arithmetic / token-presence) |
| Right-reasons audit ≥ 3 tests? | YES — AC-R22-3, AC-R22-4, AC-R22-1 (close-walk doc structure). All three trace to a spec requirement; failure-mode counterfactuals demonstrated for the two runtime tests; doc-level test verified by cold-reading the cited tokens |
| Adversarial mandate honored (≥ 1 substantive finding despite 0 CRIT / 0 MAJOR)? | YES — MINOR-1 (AC-R22-7 wording-vs-HEAD divergence) is a substantive precision finding not in the Implementer's attestation; OBS-1 (R21 OBS-2 closure not table-recorded) flags a cross-round-traceability gap the Implementer did not surface; OBS-3 surfaces a stronger-than-spec coverage property (positive finding) |
| Cold-review boundary held? | YES — Did NOT read `coordination/diagnostics/` (none present for R22; existence cold-checked via `ls` not done by Reviewer to avoid contamination — relied on cold-read absence). Did NOT read `coordination/logs/`, `.prompt-*.md`, `OVERNIGHT-LOG-2026-05-17.md`, or prior Reviewer reports R02–R19. Read `~/.claude/CROSS-PROJECT-MEMORIAL.md` Reviewer-section targeted greps only (R16 + R19 reinforcements load-bearing for completeness-gate check) |
| CROSS-PROJECT-MEMORIAL reinforcements applied? | YES — Reviewer-section R16 reinforcement (Memorial accretion ≥ MINOR severity, will append below); R19 reinforcement (round-start-to-HEAD anti-scope diff, applied in cross-cutting checks); R21-derived line-citation 3-occurrence rule (applied in line-citation accuracy check) |

All gates PASS. **21st consecutive Tessera Reviewer pre-emit grilling (R02–R22).**

---

## 6. Routing

**Findings summary:** 0 CRITICAL / 0 MAJOR / 1 MINOR / 4 OBS.

Per CLAUDE-REVIEWER.md routing rule: MAJOR or below → **STATUS: MERGE-READY**.

R22 closes Phase 2 SLICE 2 per `coordination/NEXT-ROLE.md` HARD STOP directive (late-evening overnight authority chain end). SLICE 3 entry requires operator return.

**Streaks at R22 close (Reviewer pre-attestation):**
- 0-CRITICAL streak: **21 rounds** (R02–R22).
- 0-MAJOR streak: 2 consecutive **full-tier** rounds (R20–R21); R22 is audit-tier — does not extend or break the full-tier streak; R22 is itself 0-MAJOR.
- RED→GREEN TDD streak: 16 rounds (R04–R21); R22 is test-only (no production delta), structurally distinct from RED→GREEN cycle — neither extends nor breaks.
- Right-reasons audit streak: **15 rounds** (R08–R22).
- Pre-emit grilling streak: **21 rounds** (R02–R22).
- Reviewer cold-review-boundary streak: **20 rounds** (R02–R22; R19 was the first dedicated tessera audit-tier round with cold-boundary held).

**Memorial appends (per CLAUDE-REVIEWER.md REINFORCED 2026-05-17 — MINOR severity ≥ MINOR VIOLATION accretion):**
- 1 VIOLATION entry for MINOR-1 will be appended to `coordination/MEMORIAL.md` (AC-R22-7 spec-wording precision drift).
- CONFIRMATION entries for cold-review boundary, AC verification, right-reasons audit, anti-scope completeness gate, and pre-emit grilling will follow.

---

_End of R22 Reviewer report. MERGE-READY at HEAD `373b841`. SLICE 2 closed; operator return required for SLICE 3 entry._
