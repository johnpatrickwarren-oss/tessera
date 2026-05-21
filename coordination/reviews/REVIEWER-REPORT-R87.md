# REVIEWER-REPORT-R87.md — Cold-eye audit of R87 chore-A

**Round:** R87 (Phase 4 SLICE 5 hygiene round; full-tier)
**Round-start SHA:** `0eb8a51`
**Reviewer-HEAD SHA at audit:** `46fa41f`
**Reviewer session:** 2026-05-21

---

## § 0  Reviewer-run binding commands (cold replication)

Independently re-ran every binding command at HEAD = `46fa41f`:

| Command | Observed |
|---|---|
| `pnpm exec tsc -p tsconfig.test.json` | exit `0` |
| `pnpm exec node --test --test-reporter=tap test/*.test.js` | `# tests 692 / # pass 673 / # fail 15 / # skipped 4` |
| `bash coordination/specs/Q-R87-EMPIRICAL.sh` | `10 PASS / 0 FAIL`; exit `0` |
| `git diff 0eb8a51 HEAD --name-only` | 8 paths: `coordination/MEMORIAL.md`, `coordination/NEXT-ROLE.md`, `coordination/diagnostics/DIAGNOSTIC-R87-ac36-3-self-exclusion.md`, `coordination/specs/Q-R87-EMPIRICAL.sh`, `coordination/specs/Q-R87-SPEC-AUDIT.md`, `coordination/specs/Q-R87-SPEC.md`, `test/q36-phase2-close-walk.test.ts`, `test/q87-carry-forward-cleanup.test.ts` — all match § 5.2 ALLOWED_SET |

All four binding-command outputs match the Implementer's NEXT-ROLE.md attestation verbatim (encode-actual-results-verbatim discipline satisfied).

---

## § 1  Per-AC verification table

| AC-ID | Criterion (short) | Status | Evidence (file:line or test name) |
|---|---|---|---|
| AC-R87-1 | q36 contains zero `^test('AC-R36-30:` and `^test('AC-R36-31:` matches | PASS | `test/q87-carry-forward-cleanup.test.ts:23-32` (runtime AC) + Reviewer `grep -c "^test('AC-R36-30:\|^test('AC-R36-31:" test/q36-phase2-close-walk.test.ts` → 0 |
| AC-R87-2 | q36 contains no `= '36ab019'` or `= 'c49df0e'` variable assignments | PASS | `test/q87-carry-forward-cleanup.test.ts:34-45` + EMPIRICAL.sh Block 2 (`grep -c "'36ab019'\|'c49df0e'" test/q36-phase2-close-walk.test.ts` → 0/0) |
| AC-R87-3 | q36 cites "R87 cleanup: AC-R36-30 + AC-R36-31 dropped" + "R62 Option 1" + "SPEC-AUTHORING-CHECKLIST" | PASS | `test/q87-carry-forward-cleanup.test.ts:47-65` + Reviewer-verified at `test/q36-phase2-close-walk.test.ts:643` (cleanup header), `:655` (R62 Option 1), `:659` (SPEC-AUTHORING-CHECKLIST) |
| AC-R87-4 | q36 header cites "AC-R36-1 through AC-R36-29"; not "1 through 31" | PASS | `test/q87-carry-forward-cleanup.test.ts:67-79` + Reviewer-verified at `test/q36-phase2-close-walk.test.ts:3` (range updated) |
| AC-R87-5 | q36 does not match `import { execFileSync } from 'node:child_process'` | PASS | `test/q87-carry-forward-cleanup.test.ts:81-93` + Reviewer-verified at `test/q36-phase2-close-walk.test.ts:17-20` (import absent; only `node:fs` + `node:path` imports remain) |
| AC-R87-6 | tsc exit 0 + TAP `# tests=692` + `# fail∈[15,16]` + `# pass∈[672,673]` + `# skipped=4` + EMPIRICAL.sh exit 0 | PASS | Reviewer-replicated binding commands (§ 0 above); all five sub-conditions satisfied |
| AC-R87-7 | `git diff 0eb8a51 HEAD --name-only` ⊆ § 5.2 ALLOWED_SET | PASS | Reviewer-replicated (§ 0 above); 8 paths emitted, all match the ALLOWED_SET regex; `Q-R87-EMPIRICAL.sh` Block 5 also reports `anti-scope diff ⊆ ALLOWED_SET` |

**Per-AC summary: 7/7 PASS.**

---

## § 2  Findings

### MAJOR-1 — Architect spec § 3.1 Edit 3 "Behavior verification" empirically false

**File:** `coordination/specs/Q-R87-SPEC.md:169` (Edit 3 "Behavior verification" paragraph)

**Claim in spec:**
> "After this edit, AC-R36-3 will scan `q36-phase2-close-walk.test.ts`. AC-R36-3's pattern is `/execFileSync\s*\(\s*['"]node['"]/` (matching `execFileSync('node'…)` only). Post-R87, q36 contains **no** `execFileSync` call (the import is removed in Edit 1; all call sites are in deleted blocks). Therefore including q36 in the scan does not flip AC-R36-3's outcome."

**Empirical reality:** AC-R36-3's own assertion error message at `test/q36-phase2-close-walk.test.ts:91` is the template literal:

```typescript
`These test files carry execFileSync('node',...) — transitive hang risk: ${violations.join(', ')}`,
```

The literal substring `execFileSync('node',` inside this string matches the AC-R36-3 grep pattern `/execFileSync\s*\(\s*['"]node['"]/`. The Architect's claim "q36 contains no execFileSync call" was true at the *call-expression* level but false at the *regex-pattern-match* level. The Architect did not actually grep post-Edit-cleanup q36 against the AC-R36-3 pattern to verify zero matches — only inspected the regex semantics in isolation (spec § 9.1 row "AC-R36-3's pattern... matches 'node' only (not 'git')").

**Detection:** Implementer halted at commit `c0f9dc8` per spec § 6 halt condition 6 ("Edit produces… a behavior change in AC-R36-3 that this spec did not predict"). Operator Option A resolution at commit `e3135e7` restored the self-exclusion line with a corrected comment. The current q36 state has Edits 1, 2, 4, 5, 6 applied but Edit 3 explicitly reverted.

**Discipline violated:** Cross-project canonical `Architect-claim-without-empirical-walk` (CROSS-PROJECT-MEMORIAL.md "Reinforcement rules derived" entry, promoted from R72; this is the 8th Tessera-instance per Operator-resolution narrative at `coordination/NEXT-ROLE.md:11`).

**Why MAJOR (not CRITICAL):** The substantive deliverable is sound — the final post-Option-A state is correct. EMPIRICAL.sh exit 0, all 5 q87 runtime ACs PASS, anti-scope clean. The defect lies in the *spec authoring* (architect-claim-without-empirical-walk), not in the *deliverable*. Mitigated end-to-end by Implementer halt-discipline + operator resolution.

**Sub-pattern (R87-novel):** prose-claim-about-post-edit-state vs in-AC-pattern-encoding. R86 SPEC-AUTHORING-CHECKLIST tightening covered Architect-encoded patterns (where the Architect writes a regex *into* a new AC); it did NOT cover Architect prose-verification of a *pre-existing* pattern's behavior under post-edit state. This sub-pattern should be promoted at R87 MU.

### MAJOR-2 — Self-application gate (§ 9.5) omitted AC-R36-3's pattern

**File:** `coordination/specs/Q-R87-SPEC.md:570-587` (§ 9.5 self-application gate table)

The gate enumerated 14 patterns for spec-emit-time verification but did not include AC-R36-3's pre-existing pattern `/execFileSync\s*\(\s*['"]node['"]/` even though spec § 3.1 Edit 3 made a load-bearing behavior claim about how that pattern matches post-cleanup q36. A complete gate would have added a 15th row:

| # | Pattern | Source | Expected outcome against post-cleanup q36 |
|---|---|---|---|
| 15 | `/execFileSync\s*\(\s*['"]node['"]/` | AC-R36-3 body (pre-existing) — verify Edit 3 "Behavior verification" claim | Should produce 0 matches per spec claim → empirically produces 1 match against q36:91 |

Pasting this 15th pattern against the prescribed post-cleanup q36 file would have surfaced MAJOR-1 at spec-emit, NOT at chore-A. The gate's discipline was bounded to "Architect-encoded patterns this spec authors" but not extended to "pre-existing patterns whose behavior this spec asserts."

**Why MAJOR (not CRITICAL):** Sub-pattern of MAJOR-1; same root cause; same end-to-end mitigation. Documented separately because the fix is different — MAJOR-1 fixes "verify post-Edit grep state via empirical command run"; MAJOR-2 fixes "extend self-application gate to include pre-existing patterns whose behavior is asserted by the spec."

### MINOR-1 — MEMORIAL VIOLATION entry mis-classifies discipline + mis-tags committing role

**File:** `coordination/MEMORIAL.md` (R87 IMPLEMENTER section; VIOLATION line)

**Current text:**
> `VIOLATION: halt-discipline | Spec § 6 halt condition 6 fired: Edit 3 (AC-R36-3 self-exclusion removal) produced a behavior change in AC-R36-3 that the spec did not predict. … HALT triggered per §6.6. DIAGNOSTIC written to coordination/diagnostics/DIAGNOSTIC-R87-ac36-3-self-exclusion.md. STATUS: ESCALATE. | R87 | IMPLEMENTER`

**Two issues:**

1. **Discipline header is mis-classified.** The Implementer's response — wrote DIAGNOSTIC, set STATUS: ESCALATE — IS halt-discipline correctly applied. That's a CONFIRMATION of halt-discipline, not a VIOLATION. The actual violation is `Architect-claim-without-empirical-walk` (the Architect-authored Edit 3 spec premise being empirically false).
2. **[role] field tag-attribution is wrong** per CLAUDE-REVIEWER.md REINFORCED 2026-05-19: "[role] = who wrote the artifact that contains the error." The error lives in the Architect's spec (§ 3.1 Edit 3 behavior verification). The [role] tag should be `ARCHITECT`, not `IMPLEMENTER`.

**Corrected entry would read:**
> `VIOLATION: architect-claim-without-empirical-walk | Spec § 3.1 Edit 3 "Behavior verification" claimed "post-R87 q36 contains no execFileSync call"; empirically the AC-R36-3 error message literal at q36:91 contains the substring execFileSync('node',...) which matches the AC-R36-3 grep pattern. 8th Tessera instance of this discipline; sub-pattern variant: prose-claim-about-post-edit-state. | R87 | ARCHITECT`
>
> `CONFIRMATION: halt-discipline | Spec § 6 halt condition 6 fired correctly when Edit 3 caused unpredicted AC-R36-3 behavior change. Implementer wrote DIAGNOSTIC-R87-ac36-3-self-exclusion.md + set STATUS: ESCALATE; did not silently patch. | R87 | IMPLEMENTER`

**Why MINOR:** Audit-trail accuracy; does not change the deliverable but distorts the cross-round role-attribution signal Memorial Updater compounds on.

### MINOR-2 — Spec § 3.1 Edit 3 not amended post-disposition

**File:** `coordination/specs/Q-R87-SPEC.md:136-169` (Edit 3 section in full)

After operator Option A resolution restored the AC-R36-3 self-exclusion, the spec file `Q-R87-SPEC.md` was NOT amended to mark Edit 3 as superseded/invalidated. The current spec reads as if Edit 3 is a valid prescription; the only authoritative audit-trail of the Option A reversal is in `coordination/NEXT-ROLE.md` (Operator resolution block, lines 11-24) and the inline comment at q36:78.

Per `spec-not-amended-post-disposition` discipline (R79 MAJOR-1 cross-project canonical), when an ESCALATE Option A applies, both the spec narrative AND any sibling enforcement surfaces should be amended in lockstep so the audit trail is self-contained. The current state requires a future reader to cross-reference NEXT-ROLE.md to discover that Edit 3 was not applied — a "stale spec" hazard for any future round that re-uses Q-R87-SPEC.md as a precedent template.

**Mitigation present:** q36:78 inline comment cites "R87 Option A resolution preserves this line; spec Edit 3 was empirically infeasible per DIAGNOSTIC-R87-ac36-3-self-exclusion.md" — partial in-tree audit trail.

**Why MINOR (not MAJOR):** End-to-end audit trail exists (NEXT-ROLE.md + q36:78 + DIAGNOSTIC + MEMORIAL Implementer VIOLATION entry); the spec staleness is a documentation-completeness gap, not a deliverable defect.

### OBS-1 — Architect pre-prediction § A4 partially refuted

**File:** `coordination/specs/Q-R87-SPEC-AUDIT.md` § A4 (Architect pre-prediction table)

Two of the 12 pre-predictions were empirically refuted:

- Prediction #10: "Reviewer finds zero MAJOR findings (the spec's pre-emit grilling caught the only spec defect — Edit 6 prose-vs-Block-2 grep collision — and resolved it before routing)" — refuted by MAJOR-1 + MAJOR-2 above.
- Prediction #12: "Implementer encounters no HALT conditions; goes straight to MERGE-READY after chore-A" — refuted (Implementer halted at commit `c0f9dc8`; Option A resolution at `e3135e7`).

The spec audit § A4 explicitly noted "If any prediction is empirically refuted at Reviewer time, the Architect's spec-emit pre-emit grilling missed a gap; that becomes a MEMORIAL CONFIRMATION-VS-VIOLATION line at MU close." Flag for MU.

**No action required by Reviewer.** This is a data point feeding the next-round Architect prediction-discipline calibration.

### OBS-2 — Carry-forward fails reduced 18 → 15/16 (not 17 → 15/16)

**File:** N/A (observation derived from `pnpm exec node --test --test-reporter=tap test/*.test.js` output)

Spec § 0 stated 18 carry-forward fails at round-start (high end of AC-R84-14 ±1 band). R87 dropped 2 (AC-R36-30 + AC-R36-31). Reviewer observed `# fail 15` — low end of expected band [15, 16] (AC-R84-14 stochastic flake at low end this run). The remaining 15-16 carry-forward fails are documented anti-scope/forward-protection carry-forwards from R65, R66, R77-R85 plus the R36-21 + AC-R83-12 + AC-R79-8 known gaps — in scope per spec § 0 narrative. No action required.

---

## § 3  Right-reasons audit (3 tests)

### Test 1 — `AC-R87-1: q36 contains no AC-R36-30 or AC-R36-31 test() block`

- **Spec requirement traced:** Q-R87-SPEC.md § 3.1 Edits 4 + 5 (remove AC-R36-30 + AC-R36-31 test() blocks) + § 4 AC-R87-1 row.
- **Test logic:** Uses line-anchored regex `^test\('AC-R36-30:` and `^test\('AC-R36-31:` (gm flags) against `readFileSync(q36)` content. Anchoring at `^` prevents matching narrative comments at q36:12-13 + 643-666 that mention "AC-R36-30/AC-R36-31" inside prose.
- **Self-confirming check:** Test does not re-implement any production logic — it scans a static text file. The test would fail (correctly) if the Implementer removed only one of the two blocks, or removed only the section divider but left the test() block. The line-anchor is appropriately discriminating.
- **Verdict:** Not self-confirming. Passes for the right reasons.

### Test 2 — `AC-R87-3: q36 contains R87 cleanup comment citing R62 + SPEC-AUTHORING-CHECKLIST`

- **Spec requirement traced:** Q-R87-SPEC.md § 3.1 Edit 6 (append explanatory comment block) + § 4 AC-R87-3 row.
- **Test logic:** Three `content.includes(...)` assertions for: `'R87 cleanup: AC-R36-30 + AC-R36-31 dropped'`, `'R62 Option 1'`, `'SPEC-AUTHORING-CHECKLIST'`. The first token is discriminating (a full section-header line from Edit 6's verbatim text), not merely a bare `R87` mention.
- **Self-confirming check:** Static text-file scan; not re-implementing production logic. Mild concern: the test doesn't bind position (a regression putting Edit 6's text at the top of the file would still pass); spec § 5.3 acknowledged this gap. The discriminating section-header line is sufficient defense against accidental partial deletion.
- **Verdict:** Not self-confirming. Passes for the right reasons. The acknowledged position-binding gap is acceptable per spec § 5.3.

### Test 3 — `AC-R87-5: q36 does not import execFileSync (unused after deletions)`

- **Spec requirement traced:** Q-R87-SPEC.md § 3.1 Edit 1 (remove unused import) + § 4 AC-R87-5 row.
- **Test logic:** Regex `/import\s*\{\s*execFileSync\s*\}\s*from\s*['"]node:child_process['"]/` applied to file content with `.test()`. Pattern is import-statement-anchored — does NOT match bare symbol mentions in string literals or comments (which exist in q36's AC-R36-11 and AC-R36-12 assertions and in Edit 6's comment block referring to the deleted call sites).
- **Self-confirming check:** Static text scan; not re-implementing production logic. The regex is appropriately discriminating between import statements and incidental mentions of the `execFileSync` symbol.
- **Verdict:** Not self-confirming. Passes for the right reasons.

---

## § 4  Cross-cutting checks

### TDD discipline

**Verified.** `git log --oneline` shows:

- `a0ec513` test(R87 RED): add q87 carry-forward AC cleanup test stubs — all 5 fail
- `c0f9dc8` chore(R87 ESCALATE): partial chore-A + halt-discipline — spec-premise failure in Edit 3
- `e3135e7` chore(R87): resolve ESCALATE Option A — restore AC-R36-3 self-exclusion
- `ccfe166` chore(R87 chore-A): IMPLEMENTER routing block + MEMORIAL — Option A resolved
- `14a8a84` chore(R87 chore-A): backfill coordination SHA ccfe166
- `46fa41f` chore(R87 chore-A): update top-of-file NEXT-ROLE → REVIEWER

`test/q87-carry-forward-cleanup.test.ts` created at `a0ec513` (RED commit) BEFORE the implementation chain. The RED commit was independently verifiable: against unmodified q36, all 5 q87 tests fail (this is what the Implementer's NEXT-ROLE.md attests, and the per-commit isolation in git history corroborates it).

### No-skip / halt discipline

**Verified.** Implementer hit spec § 6 halt condition 6 when applying Edit 3, wrote `coordination/diagnostics/DIAGNOSTIC-R87-ac36-3-self-exclusion.md`, set STATUS: ESCALATE at commit `c0f9dc8`. No silent workaround applied. Operator Option A resolution at `e3135e7` restored the self-exclusion with a corrected comment. This is the canonical halt-discipline pattern (write DIAGNOSTIC → ESCALATE → operator decides → resume).

### Anti-scope

**Verified.** `git diff 0eb8a51 HEAD --name-only` emits 8 paths, all matching the § 5.2 ALLOWED_SET regex. `engine/*` untouched; `tools/*` untouched; `package.json` untouched; no prior-round spec files modified; no real-cluster or DS-repo operations.

**One DIAGNOSTIC file added:** `coordination/diagnostics/DIAGNOSTIC-R87-ac36-3-self-exclusion.md` — authorized by the DIAGNOSTIC carve-out at § 5.2 (`coordination/diagnostics/DIAGNOSTIC-R[0-9]+-.*\.md`).

**No scope additions beyond spec/directive prescription** (the spec's implicit scope expansion to remove the unused import and AC-R36-3 self-exclusion was Architect-authorized scope, then partially reverted via Option A).

---

## § 5  Grilling output (on this report, before routing)

- **Every finding has a file:line reference?** YES — MAJOR-1: Q-R87-SPEC.md:169 + q36:91; MAJOR-2: Q-R87-SPEC.md:570-587; MINOR-1: MEMORIAL.md R87 IMPLEMENTER section; MINOR-2: Q-R87-SPEC.md:136-169; OBS-1: Q-R87-SPEC-AUDIT.md § A4; OBS-2: TAP output reference.
- **Any AC marked PASS without actual verification?** NO — every PASS row in § 1 cites either a runtime q87 test() + Reviewer-independent grep, or a Reviewer-replicated binding command from § 0.
- **Right-reasons audit completed for 3+ tests?** YES — AC-R87-1, AC-R87-3, AC-R87-5 in § 3.
- **Routing rule strict-application:** Two MAJOR findings exist; zero CRITICAL findings. Per CLAUDE-REVIEWER.md routing rule: "CRITICAL exists → STATUS: ESCALATE; MAJOR or below → STATUS: MERGE-READY." Routing to MERGE-READY.

---

## § 6  Routing

**STATUS: MERGE-READY**

Two MAJOR findings (architect-claim-without-empirical-walk; self-application gate gap) are spec-authoring-discipline defects that the Implementer's halt-discipline + Operator Option A resolution mitigated end-to-end. Substantive deliverable is sound:

- All 5 q87 runtime ACs PASS
- AC-R87-6 binding-command attestations match Reviewer-replicated output verbatim
- AC-R87-7 anti-scope diff ⊆ ALLOWED_SET
- EMPIRICAL.sh exit 0
- TDD RED commit `a0ec513` independently verifiable
- No silent halt; correct DIAGNOSTIC + ESCALATE + Option A chain

Memorial Updater should:

1. Memorialize MAJOR-1 as **8th Tessera-instance of architect-claim-without-empirical-walk** with sub-pattern variant `prose-claim-about-post-edit-state` (R87-novel sub-pattern; consider cross-project canonical sharpening).
2. Re-classify the Implementer's existing MEMORIAL.md VIOLATION entry per MINOR-1: split into (a) `architect-claim-without-empirical-walk | … | R87 | ARCHITECT` VIOLATION; (b) `halt-discipline | Implementer wrote DIAGNOSTIC + ESCALATE on Edit 3 failure | R87 | IMPLEMENTER` CONFIRMATION.
3. Record OBS-1 Architect-pre-prediction refutation against § A4 predictions #10 + #12.
4. Optionally: amend Q-R87-SPEC.md § 3.1 Edit 3 with a `[R87 Option A: superseded]` marker per MINOR-2 (operator-discretionary; in-tree audit trail exists without it).

---

## § 7  Inputs Reviewer read (context-isolation attestation)

- `coordination/PRD.md` (header + Phase 3 sections relevant to R87 context)
- `coordination/specs/Q-R87-SPEC.md` (full)
- `coordination/specs/Q-R87-EMPIRICAL.sh` (full)
- `test/q36-phase2-close-walk.test.ts` (full)
- `test/q87-carry-forward-cleanup.test.ts` (full)
- `git log` recent history (commits 0eb8a51..46fa41f)
- `git diff 0eb8a51 HEAD` (q36, NEXT-ROLE.md, MEMORIAL.md targeted)
- `git show 0eb8a51:test/q36-phase2-close-walk.test.ts` (round-start state of AC-R36-3 body for empirical verification)
- `~/.claude/CROSS-PROJECT-MEMORIAL.md` (Reviewer section; reinforcement-rules-derived index)
- Reviewer-replicated binding-command runs (tsc + node --test + EMPIRICAL.sh + git diff name-only)

**Did NOT consult:** `coordination/diagnostics/` (cold-review independence preserved); `coordination/logs/`; `.prompt-*.md` files; `coordination/specs/Q-R87-SPEC-AUDIT.md` body beyond § A4 (referenced for OBS-1 prediction list only).
