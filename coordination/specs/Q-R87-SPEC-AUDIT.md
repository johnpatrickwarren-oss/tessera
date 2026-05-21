# Q-R87-SPEC-AUDIT.md — Architect audit sidecar

This sidecar accompanies `coordination/specs/Q-R87-SPEC.md`. It contains the audit-trail content (brainstorm + design records, P3 ten-axis verification, pre-emit grilling, Architect predictions, decision rationale) that is excluded from the spec proper per the role-file convention. Reviewer reads both files; Implementer reads only the spec proper.

**Round:** R87 — Phase 4 SLICE 5 hygiene round; full-tier.
**Round-start SHA:** `0eb8a51`.
**Author session:** 2026-05-21.

---

## § A1  Brainstorm phase — three approaches considered

R87 is a hygiene round with a narrow mandate: drop two structurally-vacuous forward-protection ACs from `test/q36-phase2-close-walk.test.ts`. The directive in NEXT-ROLE.md prescribes the core action (remove two test() blocks, add citation comment, update header range). The brainstorm scope is around **collateral cleanup** of the dead-code references those two ACs leave behind.

### Approach A — Minimum-touch deletion (literal directive)

Delete only the two test() blocks (current lines 639-690 and 692-725) and their preceding section-divider comments. Leave everything else untouched:
- Header docblock still cites `"AC-R36-1 through AC-R36-31"` (stale)
- Header docblock still contains the sentence about AC-R36-31 ("chore-B forward protection ... RED by design at chore-A")
- Header docblock's `Covers:` list still mentions `"anti-scope protection"` (stale)
- `import { execFileSync } from 'node:child_process';` at line 17 remains (unused but `noUnusedLocals: false`)
- AC-R36-3's `f !== 'q36-phase2-close-walk.test.ts'` self-exclusion at line 75 remains, with its inline comment citing the deleted AC-R36-30 explicitly (stale comment)

**Strengths:** Smallest possible diff. No risk of inadvertently breaking AC-R36-3 (the only other AC in q36 that could be affected by collateral changes). Easiest to review.

**Weaknesses:**
1. Leaves four separate locations in q36 with stale or dead references — exactly the kind of audit-trail debt that hygiene rounds are supposed to remove.
2. **Structurally fails** the EMPIRICAL.sh script committed at round-start: Block 3 line 76 asserts `grep -q "AC-R36-1 through AC-R36-29" "$Q36"`, which requires the header range to be updated. Block 3 line 70 asserts `grep -q "R87" && grep -q "R62" && grep -q "SPEC-AUTHORING-CHECKLIST"`, which requires the cite-comment to be added. Approach A omits both — it would fail chore-A's EMPIRICAL.sh.
3. The "anti-scope protection" Covers entry becomes outright misleading.

**Hidden assumptions:** Reviewer tolerates stale references; `noUnusedLocals: false` truly applies (verified — `tsconfig.json` line: `"noUnusedLocals": false`).

**Risks:** Reviewer MINOR findings on each stale reference; future-round debt; **chore-A failure due to EMPIRICAL.sh assertions Approach A cannot satisfy**.

**Verdict: REJECTED.** Approach A is structurally impossible given the round-start EMPIRICAL.sh assertions. Approach A's "literal directive reading" is incomplete because the directive also references EMPIRICAL.sh as an artifact that must pass.

### Approach B — Complete hygiene cleanup

Delete the two test() blocks + their section-divider comments + all four stale-reference sites in q36:
- Drop the now-unused `execFileSync` import (line 17)
- Update header range citation (line 3): `"1 through 31"` → `"1 through 29"`
- Drop the sentence about AC-R36-31 (lines 5-7)
- Drop `"anti-scope protection"` from the Covers list
- Remove the AC-R36-3 self-exclusion line (line 75) since its inline comment cites the deleted AC-R36-30 explicitly, and the exclusion itself is defensive against a now-impossible match (q36 has no `execFileSync('node', ...)` calls post-cleanup)
- Add a new R87 cleanup explanatory comment block at the end of the file (where the deleted tests used to live), citing R87 + R62 Option 1 + SPEC-AUTHORING-CHECKLIST

**Strengths:**
1. Clean post-state with zero stale references.
2. Satisfies EMPIRICAL.sh Block 3 assertions (header range, citation tokens).
3. Future-proof: a reader of post-R87 q36 sees no fossilized references to deleted ACs.
4. Removes dead code (the import) consistent with the hygiene mandate.

**Weaknesses:**
1. Wider blast radius than Approach A: 6 distinct edits to q36 instead of 2.
2. Removing the AC-R36-3 self-exclusion is a behavior change in that AC — it now scans q36 instead of excluding it. **Verification required at spec-emit:** AC-R36-3's pattern is `/execFileSync\s*\(\s*['"]node['"]/` (matches `execFileSync('node'…)` only). Post-R87 q36 contains no such call (the import is removed; all call sites were in deleted blocks; q36's remaining `execFileSync` references in AC-R36-11 and AC-R36-12 are inside string literals that don't match the `\(\s*['"]node['"]` pattern). **Verified at spec-emit by Architect via grep:** all 5 `execFileSync` mentions in q36 post-cleanup are inside strings looking for `'git'` or `'node'` patterns *in other files* — none of them are direct `execFileSync('node', ...)` invocations in q36.

**Hidden assumptions:**
- AC-R36-3 self-exclusion removal is behaviorally equivalent (verified above).
- `noUnusedLocals: false` means the unused import isn't strictly required for tsc; but removing it is still hygiene cleanup.
- The Reviewer accepts implicit-scope cleanup (the directive's "Update header comment" implies authorization to fix related stale citations within the same file).

**Risks:**
- Reviewer flags implicit-scope expansion as MINOR. Mitigation: § 9.3 of the spec proper enumerates each scope expansion and ties it to the directive's spirit.
- If AC-R36-3's pattern were buggy (e.g., over-matching), removing the self-exclusion could cause AC-R36-3 to fail. Mitigation: pattern verified by direct inspection; no other test files newly match the pattern.

### Approach C — Targeted hygiene (header + cite-comment only; preserve dead code)

Delete the two test() blocks + update the header range + add the cite-comment, but **leave** the unused `execFileSync` import and the AC-R36-3 self-exclusion (preserving "defensive code" rationale).

**Strengths:**
1. Satisfies EMPIRICAL.sh assertions (Block 3 header range + citation tokens).
2. Smaller diff than Approach B.

**Weaknesses:**
1. Leaves the AC-R36-3 self-exclusion's inline comment citing the deleted AC-R36-30 explicitly — a fossilized reference to a deleted AC inside the comment of a still-active test.
2. Leaves an unused import in source code that future readers must trace.
3. The "defensive code" rationale is weak: AC-R36-3's grep pattern cannot match anything in post-R87 q36 because q36 has no `execFileSync('node', ...)` calls.

**Hidden assumptions:** Reviewer tolerates the stale inline comment + unused import. Future maintainers don't get confused by the fossilized reference.

**Risks:** Reviewer MINOR on the stale inline comment (almost certain).

### Approach selected: **Approach B (Complete hygiene cleanup)**

**Why selected:**
1. **Forced choice:** Approach A is structurally infeasible (cannot pass round-start EMPIRICAL.sh). The real choice is between B and C.
2. **The directive's spirit is "carry-forward AC cleanup."** Leaving stale citations to deleted ACs in the same round that removes those ACs is incoherent. The R86 SPEC-AUTHORING-CHECKLIST tightening specifically targets stale-reference hygiene.
3. **The dead-code reduction is mechanically simple and well-verified.** Each scope expansion has a clear, narrow justification:
   - Unused import → removing dead code; tsconfig confirms `noUnusedLocals: false` (so tsc tolerates it), but the import is genuinely orphan.
   - AC-R36-3 self-exclusion → comment explicitly cites the deleted AC; the defensive function is moot (pattern can't match anything in post-cleanup q36).
   - "anti-scope protection" Covers entry → the only ACs providing that coverage were AC-R36-30 + AC-R36-31, both removed.
4. **The wider diff stays bounded to one file** (q36) plus the new q87 test file and the spec triad. Anti-scope (§ 5.1 of the spec proper) is fully preserved; no other test file is touched.

**Why others rejected:**
- **Approach A:** Cannot satisfy the round-start EMPIRICAL.sh (header range + cite-comment assertions). Structurally impossible.
- **Approach C:** Leaves the AC-R36-3 self-exclusion's inline comment as a fossilized citation to a deleted AC — exactly the kind of debris the hygiene round is supposed to remove. The "defensive" framing is weak because the exclusion cannot affect AC-R36-3's outcome in any reasonable future state.

**Trade-off accepted:** Slightly wider diff in exchange for a fully consistent post-state. Reviewer's job is easier because there are no stale references to flag; the wider scope is justified explicitly in spec § 9.3 with a one-line rationale per item.

---

## § A2  Design phase — component boundaries + integration points + failure modes

### Exists (unchanged surfaces)

- `coordination/specs/Q-R87-EMPIRICAL.sh` — pre-staged at round-start commit `0eb8a51`. Architect verified at spec-emit that the script's predictions are correct (no amendment required).
- All engine code (`engine/*`) — Phase 3 + R82 frozen.
- All other test files except q36 — frozen by spec § 5.1.
- All R73-R86 deliverables — frozen.
- `tools/*`, `run-pipeline.sh`, `~/.claude/CROSS-PROJECT-MEMORIAL.md` — frozen this round.

### Created

- `coordination/specs/Q-R87-SPEC.md` — this spec.
- `coordination/specs/Q-R87-SPEC-AUDIT.md` — this audit sidecar.
- `test/q87-carry-forward-cleanup.test.ts` (Implementer creates from § 3.2 pseudocode) — 5 runtime test() blocks.
- `coordination/reviews/REVIEWER-REPORT-R87.md` (Reviewer creates post-chore-A).

### Changed (single load-bearing modification site)

- `test/q36-phase2-close-walk.test.ts` — six edits (§ 3.1 of the spec proper):
  - Edit 1: remove line 17 (unused execFileSync import)
  - Edit 2: update lines 3-11 (file docblock — range, AC-R36-31 sentence, Covers entry)
  - Edit 3: remove line 75 (AC-R36-3 self-exclusion + stale comment)
  - Edit 4: remove lines 639-690 (AC-R36-30 block + section divider)
  - Edit 5: remove lines 692-725 (AC-R36-31 block + section divider)
  - Edit 6: append R87 cleanup explanatory comment block

### Integration points + data flows

1. **`test/q36-phase2-close-walk.test.ts` ↔ `Q-R87-EMPIRICAL.sh` Block 2:** Block 2 greps q36 for the absence of `^test('AC-R36-30:`, `^test('AC-R36-31:`, `'36ab019'`, and `'c49df0e'`. Edits 4 + 5 remove the test() blocks (handling the first two greps). Edit 6's verbatim text deliberately omits `'36ab019'` and `'c49df0e'` (handling the second two greps). Cross-verified in § 9.5 of the spec proper.

2. **`test/q36-phase2-close-walk.test.ts` ↔ `Q-R87-EMPIRICAL.sh` Block 3:** Block 3 greps q36 for the presence of `R87`, `R62`, `SPEC-AUTHORING-CHECKLIST`, and `AC-R36-1 through AC-R36-29`. Edit 2 produces the range citation; Edit 6 produces the other three citations. Cross-verified.

3. **`test/q36-phase2-close-walk.test.ts` AC-R36-3 ↔ filtered scan of test/ directory:** Before Edit 3, AC-R36-3 excludes q36 from its scan. After Edit 3, q36 is included. AC-R36-3's pattern is `/execFileSync\s*\(\s*['"]node['"]/`. Post-cleanup q36 contains:
   - Edit 6 prose mentions of `execFileSync` calls in narrative text — but these are inside `//` comments and don't form valid TypeScript/regex matches; the spec-emit Architect grep verified the pattern matches nothing in post-cleanup q36.
   - String-literal references inside AC-R36-11 and AC-R36-12 test bodies (e.g., `"execFileSync('git', ['diff'"`) — these are TypeScript string contents looking for `execFileSync('git'` patterns *in other files*, not `execFileSync('node'` calls.
   - The AC-R36-3 pattern requires `execFileSync(` immediately followed by `'node'` or `"node"`. Post-cleanup q36 has no such sequence.

4. **`test/q87-carry-forward-cleanup.test.ts` ↔ q36 (file-read at test runtime):** The new q87 test file reads q36 via `readFileSync` and asserts properties of its content. AC-R87-1..AC-R87-5 each bind a specific property derivable from Edits 1-6.

5. **`Q-R87-EMPIRICAL.sh` Block 4 ↔ full test suite TAP summary:** Block 4 runs `pnpm exec node --test --test-reporter=tap test/*.test.js` and asserts `# tests=692` (strict), `# fail ∈ [15, 16]` (band), `# pass ∈ [672, 673]` (band), `# skipped=4` (strict). Architect verified the arithmetic: baseline `# tests=689` + 5 new q87 test() blocks − 2 deleted q36 test() blocks = 692. Baseline `# fail=18` − 2 (the two deleted tests both currently fail) = 16 (or 15 if AC-R84-14 flakes low).

6. **`Q-R87-EMPIRICAL.sh` Block 5 ↔ git diff:** Block 5 runs `git diff 0eb8a51 HEAD --name-only` and asserts every path is in the ALLOWED_SET regex. Cross-verified against spec § 5.2 ALLOWED_SET inventory.

### Failure modes at each integration point

| Integration point | Failure mode | Mitigation |
|---|---|---|
| Edit 6 prose vs Block 2 grep | Edit 6 contains literal `'36ab019'` (with quotes) → Block 2 count > 0 → chore-A fail | Edit 6 verbatim text omits both quoted-SHA literals; § 9.5 self-application gate verifies. **Defect caught and resolved at spec-emit time.** |
| Edit 3 (AC-R36-3 self-exclusion removal) vs AC-R36-3 runtime | Post-cleanup q36 contains an `execFileSync('node', ...)` match → AC-R36-3 fails for the first time | Architect grep at spec-emit verified no such match exists in post-cleanup q36 |
| Test count arithmetic | Baseline drift between spec-emit and chore-A (e.g., a Memorial-Updater commit lands a new test() block on a CLAUDE-*.md or a Reviewer report has runtime tests — neither is expected) | Halt condition § 6.3 catches band violations |
| AC-R84-14 stochastic flake | AC-R84-14 flakes high at chore-A → `# fail = 17` → outside band [15, 16] | Halt condition § 6.3 requires a single re-run before HALTing; multi-run-discipline per CLAUDE-COORDINATOR.md (R85 REINFORCED) |
| Unauthorized path appears in diff | Implementer touches a file outside ALLOWED_SET → Block 5 fails | Halt condition § 6.10 + spec § 5.1 explicit enumeration |
| Stale references in q36 not fully removed by Edit 2 | Edit 2 misses the AC-R36-31 sentence OR the Covers entry → minor audit-trail debt but no AC failure | AC-R87-4 binds the range update; manual Reviewer visual diff covers the sentence + Covers entry (§ 5.3 acknowledged gap) |
| `execFileSync` import not removed (Edit 1 skipped) | tsc still passes (`noUnusedLocals: false`) but AC-R87-5 fails | AC-R87-5 binds the absence of the import regex; failure is loud |

### PRD verification

Per spec § 0 + § 2, the directive's primary deliverables map to spec sections:
- Directive item 1 (q36 modification) → § 3.1 Edits 1-6
- Directive item 2 (MEMORIAL.md append) → § 3.4
- Directive item 3 (q87 test file) → § 3.2
- Directive item 4 (EMPIRICAL.sh) → § 3.3 (no changes required)
- Directive's tier rationale (full-tier) → § 2 component inventory + § A1 brainstorm rationale
- Directive's anti-scope (R87 hard limits) → § 5.1
- Directive's halt conditions → § 6 (extended with R87-specific halts 8-10)

Directive's empirical claims about `87e372f` SHA and `6 carry-forward fails` are corrected in spec § 0. The mechanical behavior (drop 2 ACs, add cleanup citation) is unchanged.

---

## § A3  P3 ten-axis verification (this is the audit version; spec § 8 is the routing-time summary)

### Correctness

Every "Verbatim text the Implementer must write" block in § 3.1 was constructed by Architect from the actual round-start file content. Verified by direct `Read` of `test/q36-phase2-close-walk.test.ts` at HEAD = `0eb8a51`. EMPIRICAL.sh predictions cross-checked against actual TAP baseline observed by Architect:
- Baseline: `# tests 689 / # pass 667 / # fail 18 / # skipped 4`
- Predicted post-R87 chore-A: `# tests 692 / # pass ∈ [672, 673] / # fail ∈ [15, 16] / # skipped 4`
- Arithmetic: 689 + 5 − 2 = 692 ✓; 18 − 2 = 16 (high end) or 17 − 2 = 15 (low end, if AC-R84-14 stochastic flake fires low) ✓

### Completeness

Each directive deliverable maps to a spec section. Each AC binds one property of the post-cleanup state. The AC table covers:
- Structural removals: AC-R87-1 (test() blocks) + AC-R87-2 (SHA literals)
- Structural additions: AC-R87-3 (cite-comment) + AC-R87-4 (header range update)
- Dead-code removals: AC-R87-5 (execFileSync import)
- Binding-command attestations: AC-R87-6 (typecheck + TAP counts + EMPIRICAL.sh exit) + AC-R87-7 (anti-scope diff)

The AC-R36-3 self-exclusion removal (Edit 3) is **not** directly bound by an R87 AC; instead, the compensating coverage is:
- AC-R36-3's continued PASS at chore-A (asserted via TAP `# pass` band in AC-R87-6)
- The Edit 3 behavior-verification paragraph in spec § 3.1
- Section § 5.3 acknowledged gap-table

This is documented as an accepted gap (the cost of adding a positive AC for "AC-R36-3 still passes after self-exclusion removal" is high relative to the marginal coverage gain).

### Consistency

Cross-section cross-checks executed in § 9.6 of the spec proper:
- § 0 directive-corrections ↔ § 1 mechanism: consistent (uses corrected values).
- § 1 changes list ↔ § 2 component inventory: consistent (6 edits enumerated identically).
- § 3.1 Edit 6 verbatim text ↔ § 9.5 self-application gate: consistent (gate verified Edit 6 contains no quoted-SHA literals).
- § 4 AC table ↔ § 3 pseudocode: consistent (1:1 mapping of runtime ACs to test() blocks).
- § 4 AC-R87-6 bands ↔ § 3.3 EMPIRICAL.sh + § 9.1 baseline: arithmetic consistent.
- § 5.2 ALLOWED_SET regex ↔ EMPIRICAL.sh Block 5 line 146: byte-by-byte cross-checked.
- § 6 halt conditions ↔ § 3 Edits + § 4 ACs: every halt trigger maps to a concrete failure scenario.
- § 7 open questions ↔ § 9.x grilling: all assumptions resolved or explicitly gap-acknowledged.

### Clarity

The spec uses "Verbatim text the Implementer must write" blocks for every modified region. No prose like "update the comment appropriately" or "make the necessary changes" — every modification is fully specified.

### Coverage

Mapping table from spec sections to "Implementer can act without guessing" coverage:
- Removed import (Edit 1): full coverage — exact line specified, exact removal specified.
- Updated docblock (Edit 2): full coverage — exact "Target" text specified.
- Removed self-exclusion (Edit 3): full coverage — exact Before/After blocks specified.
- Removed test() block 1 (Edit 4): full coverage — exact line range specified.
- Removed test() block 2 (Edit 5): full coverage — exact line range specified.
- Added cleanup comment (Edit 6): full coverage — exact verbatim text specified.

### Constraints

Anti-scope (spec § 5.1) bars 9 path classes. ALLOWED_SET (spec § 5.2) enumerates 17 path classes byte-identical to EMPIRICAL.sh Block 5. Both gate artifacts are in lockstep per the R72/R82 `spec-amendment-ALL-gate-artifacts-propagation` discipline. No mid-round operator amendments are anticipated; if any are required, the carve-out for diagnostic files is in place.

### Concurrency

Not applicable. R87 is a single-cluster, single-file modification round; no parallel-cluster coordination; no test-runtime concurrency concerns.

### Corner cases

Enumerated in spec § 8 corner-cases row. Notable:
- Comment-vs-code SHA literal collision (caught by § 9.5 self-application; resolved by Edit 6 verbatim text design).
- AC-R36-3 self-exclusion removal behavioral equivalence (verified at spec-emit by Architect grep).
- AC-R84-14 stochastic flake at chore-A (mitigated by band [15, 16] + single re-run permission in halt condition 3).
- Trailing-newline / end-of-file structure (Edit 6 appended at end-of-file; trailing newline is a no-op for the test runner).

### Cost

Full-tier cost justified by:
1. Multiple cross-project disciplines load-bearing this round: empirical-premise verification (directive correction); architect-encoded-pattern self-application (Edit 6 vs Block 2); R72/R82 lockstep gate artifacts; multi-run-discipline for flake.
2. The R86 prophylactic-discipline-lowers-ESCALATE-risk thesis is tested here: the spec-emit pre-emit grilling caught a real defect (Edit 6 SHA-literal collision) that would have produced a chore-A failure without it. This validates R86's design.
3. Hygiene rounds with subtle interaction surfaces (AC-R36-3 behavior change; EMPIRICAL.sh script vs prose collision) benefit from the full architectural review the audit-tier downshift would skip.

The Architect's pre-prediction for the round (§ A4 below) is that Reviewer finds zero MAJOR/CRITICAL issues and 0-2 MINORs (e.g., a Reviewer flag on Approach B's scope expansion; a Reviewer flag on the § 5.3 acknowledged gaps).

### Coupling

Single load-bearing modification site (one test file). Spec triad + Reviewer report + Memorial appends. No engine code, no tools, no scripts touched. Decoupled from all in-flight work elsewhere in the project.

---

## § A4  Architect pre-prediction on outcomes (for Reviewer to verify post-chore-A)

The Architect predicts the following observable outcomes at the chore-A commit (Implementer's GREEN state):

| # | Prediction | Verification mechanism |
|---|---|---|
| 1 | `pnpm exec tsc -p tsconfig.test.json` exits 0 | TAP summary + EMPIRICAL.sh Block 1 |
| 2 | TAP `# tests` = 692 strict | EMPIRICAL.sh Block 4 |
| 3 | TAP `# pass` ∈ [672, 673] band | EMPIRICAL.sh Block 4 + Implementer NEXT-ROLE.md attestation |
| 4 | TAP `# fail` ∈ [15, 16] band | Same |
| 5 | TAP `# skipped` = 4 strict | Same |
| 6 | `bash coordination/specs/Q-R87-EMPIRICAL.sh` exits 0 | Direct script run |
| 7 | `git diff 0eb8a51 HEAD --name-only` line count between 8 and 12 (q36 + q87 + spec triad + Reviewer report? + Memorial + NEXT-ROLE; some files like CLAUDE-*.md only modified if MU adds REINFORCED lines, which is not expected for this round) | Direct git diff + EMPIRICAL.sh Block 5 |
| 8 | The 18 currently-failing tests at round-start become 16 failing at chore-A — specifically, AC-R36-30 + AC-R36-31 transition `fail → not present in suite`; all other 16 fails persist unchanged (R36-21, R65-2, R66-14, R77-14, R77-17, R78-14, R79-8, R79-14, R80-14, R81-14, R82-14, R83-12, R83-15, R84-14, R84-16, R85-19); 5 new q87 tests pass | Per-line TAP `^not ok` inspection |
| 9 | Reviewer finds zero CRITICAL findings | REVIEWER-REPORT-R87.md |
| 10 | Reviewer finds zero MAJOR findings (the spec's pre-emit grilling caught the only spec defect — Edit 6 prose-vs-Block-2 grep collision — and resolved it before routing) | REVIEWER-REPORT-R87.md |
| 11 | Reviewer finds 0-2 MINOR findings, candidate sources: (a) Approach B's implicit-scope expansions (`execFileSync` import removal, AC-R36-3 self-exclusion removal) — Reviewer may prefer a tighter scope; (b) § 5.3 acknowledged gaps; (c) the "anti-scope protection" Covers entry removal (Reviewer may consider an alternative replacement string rather than deletion) | REVIEWER-REPORT-R87.md |
| 12 | Implementer encounters no HALT conditions; goes straight to MERGE-READY after chore-A | NEXT-ROLE.md IMPLEMENTER routing block + absence of `coordination/diagnostics/DIAGNOSTIC-R87-*.md` |

**If any prediction is empirically refuted at Reviewer time, the Architect's spec-emit pre-emit grilling missed a gap; that becomes a MEMORIAL CONFIRMATION-VS-VIOLATION line at MU close.**

---

## § A5  Pre-route discipline application

### Superpowers: Brainstorm (CLAUDE-COMMON.md inlined)
Executed in § A1. Three approaches generated; one selected; rationale documented.

### Superpowers: Design (CLAUDE-COMMON.md inlined)
Executed in § A2. Component boundaries sketched; integration points + data flows enumerated; failure modes identified per integration point; PRD/directive verification per requirement.

### Superpowers: Review (CLAUDE-COMMON.md inlined)
Spec § 9.1-9.6 applies the Review phase: cold-read of spec from Implementer's perspective; every assumption surfaced; every deferred decision marked (none — all resolved); scope additions justified line-by-line; "can the Implementer act with zero clarifying questions?" — yes.

### Skill 14 (Architect-specific spec-completeness gate)

Walk every required spec section:
- [x] § 0 empirical-premise verification — directive corrections recorded
- [x] § 1 mechanism — every design decision made; no deferrals
- [x] § 2 component inventory — exists / created / changed / deleted enumerated
- [x] § 3 per-file pseudocode — full Implementer-actionable detail
- [x] § 4 acceptance criteria — Given/When/Then form; no ambiguous language
- [x] § 5 anti-scope — explicit list + ALLOWED_SET regex
- [x] § 6 halt conditions — extended for R87-specific halts
- [x] § 7 open questions — "None — all resolved"
- [x] § 8 P3 ten-axis — one sentence per axis (spec proper); full audit version in this sidecar § A3
- [x] § 9 grilling — adversarial self-review inline

### Skill 15 (Architect grilling against the directive)

- [x] Implementer can act without clarifying questions (§ 9.4)
- [x] Every claim verifiable at spec-emit time (§ 9.1)
- [x] Unstated assumptions surfaced (§ 9.2)
- [x] Scope additions justified (§ 9.3)
- [x] Architect-encoded pattern self-application gate executed (§ 9.5)
- [x] Spec-internal contradiction sweep executed (§ 9.6)
- [x] Cross-project rules applied UPFRONT (per directive)
  - [x] Rule 1 sub-class `empirical-command-attestation` — AC-R87-6 binds verbatim values
  - [x] Rule 2 sub-class `architect-encoded-regex-with-hardcoded-bounds` — self-application gate caught Edit 6 SHA collision
  - [x] Rule 3 self-application gate — applied to AC regex patterns
  - [x] Rule 4 multi-run-discipline — halt condition 3 allows single re-run for flake
  - [x] Rule 5 `spec-amendment-ALL-gate-artifacts-propagation` — spec § 5.2 ALLOWED_SET ↔ EMPIRICAL.sh Block 5 byte-identical
  - [x] Rule 6 Architect-claim-without-empirical-walk — spec § 0 + § 9.1 baseline verification + § A2 design verification
  - [x] Rule 7 fail-count band for flaky AC — AC-R87-6 fail band [15, 16] documents AC-R84-14 stochastic ±1

### Architect role boundary (CLAUDE-ARCHITECT.md)

- [x] No implementation code written by Architect
- [x] No test files opened by Architect during spec-emit (only the existing q36 test file was read; no `test/q87-*.test.ts` was written — the Implementer creates it from § 3.2 pseudocode)
- [x] All design decisions in spec; zero deferrals
- [x] Spec + audit sidecar committed before NEXT-ROLE.md routing block (R21 MINOR-1 discipline)

---

## § A6  Decision rationale — why-picked / why-rejected (summary)

**Picked:** Approach B (Complete hygiene cleanup) — § A1.

**Rejected:**
- **Approach A** (Minimum-touch): Cannot pass the round-start EMPIRICAL.sh (header range + cite-comment assertions). Structurally infeasible.
- **Approach C** (Targeted hygiene): Leaves the AC-R36-3 self-exclusion inline comment as a fossilized citation to a deleted AC — exactly the debris this hygiene round is supposed to remove. Weak "defensive code" framing.

**Trade-off accepted:** Slightly wider diff than the strict literal directive, in exchange for a fully consistent post-state with no stale references and no dead code. The wider diff stays bounded to one test file; the spec's § 9.3 scope-audit table makes each expansion's justification explicit and Reviewer-auditable.

**Alternative cleanly preserved:** Future-round MU can promote the "carry-forward AC cleanup" + R62 Option 1 precedent into a SPEC-AUTHORING-CHECKLIST.md entry, so future rounds avoid creating pinned-SHA forward-protection ACs in the first place. The R86 extension already addresses this discipline; R87 applies it retroactively.

---

## § A7  Amendments from prior version

This is the first emit of Q-R87-SPEC.md / Q-R87-SPEC-AUDIT.md. No prior version exists. No amendments to record.

---

*Audit complete. Spec is ready for routing.*
