# REVIEWER-REPORT-R20.md — Phase 2 SLICE 2.A (VerdictGrouper cluster_event_id scope keying)

**Round:** R20 (full tier)
**Reviewer cold-state HEAD:** `7eb3a63`
**Inputs read:** `coordination/PRD.md` (full); `coordination/specs/Q-R20-SPEC.md` (full ~750 lines via 2-window read); `coordination/specs/Q-R20-SPEC-AUDIT.md` (head ~80 lines); `engine/verdict-groups.ts` (full); `test/q20-verdict-grouper-cluster-event-scope.test.ts` (full); `test/q01-no-at-pin-deltas.test.ts` (full); `test/q01-vendoring-coverage.test.ts` (head); `coordination/VENDORING-MANIFEST.md` (full); `coordination/NEXT-ROLE.md` (full); `coordination/MEMORIAL.md` (R20 section, full); `~/.claude/CROSS-PROJECT-MEMORIAL.md` (Reviewer reinforcements + recent Tessera rounds R15/R16/R19); `deploysignal/engine/verdict-groups.ts` (full diff vs tessera body); git log + per-commit shows for `cecd677..HEAD`.
**Inputs NOT read** (cold-review discipline): `coordination/diagnostics/`, `coordination/logs/`, `.prompt-*.md`, `coordination/OVERNIGHT-LOG-2026-05-17.md`, prior Reviewer reports (R02–R19).
**Independent binding-command runs:** `npx tsc --noEmit` exit 0; `node --test test/*.test.js` → 192 pass / 0 fail; `git diff cecd677..23a497e --name-only` → 8 paths (all in spec § 3 allowed-set); `diff <(tail -n +7 engine/verdict-groups.ts) ../deploysignal/engine/verdict-groups.ts` → deltas confirmed additive and matching spec § 2.

---

## 1. Per-AC verification

| AC-ID | Criterion (short) | Status | Evidence |
|---|---|---|---|
| AC-R20-1 | ingest opts.cluster_event_id populates attributed_group.cluster_event_id | PASS | `engine/verdict-groups.ts:89` (opts shape) + `:92` (extraction) + `:125` (passed to openGroupAt) + `:183` (field write) ; test `test/q20-…test.ts:32-36` asserts `r.attributed_group.cluster_event_id === 'evt-X'`; runtime PASS observed |
| AC-R20-2 | openGroupForDeploy(deploy_id, cluster_event_id) returns the same group | PASS | `engine/verdict-groups.ts:150-152` accepts optional 2nd arg + delegates to `groupKey()`; test `test/q20-…test.ts:38-45` asserts retrieved === r.attributed_group |
| AC-R20-3 | ingest without cluster_event_id leaves field undefined; legacy group_id | PASS | `engine/verdict-groups.ts:157` empty-seg coalescence + `:169` else-branch returns inherited format; test `test/q20-…test.ts:47-56` covers `{}` + `{terminal:true}` |
| AC-R20-4 | composite group_id format when cluster_event_id present | PASS | `engine/verdict-groups.ts:166-168` composite literal; test `test/q20-…test.ts:58-62` asserts `'group-evt-X-deploy-A-1700000000'` literal |
| AC-R20-5 | inherited group_id format preserved when absent | PASS | `engine/verdict-groups.ts:169` returns `\`group-${deployId}-${window_start_ts}\``; test `test/q20-…test.ts:64-68` asserts literal |
| AC-R20-6 | distinct cluster_event_ids → distinct groups; empty-string ≡ absent | PASS | `engine/verdict-groups.ts:156-159` (`cluster_event_id ? cluster_event_id : ''` truthy-check makes empty-string fall through to empty seg) + `:166` `if (cluster_event_id)` truthy check ⇒ legacy format on `''`; test `test/q20-…test.ts:70-86` covers both sub-cases |
| AC-R20-7 | same cluster_event_id, distinct deploy_ids → distinct groups | PASS | keying transition at `engine/verdict-groups.ts:77,93,96,212` (openByGroupKey replaces openByDeploy); test `test/q20-…test.ts:88-96` asserts two distinct group_ids both carrying evt-X |
| AC-R20-8 | late-arrival tuple-equality (4 sub-cases) | PASS-WITH-OBS | `engine/verdict-groups.ts:250-264` `findRecentClosedForKey` adds `(g.cluster_event_id ?? '') !== (cluster_event_id ?? '')` continue at line 258; test `test/q20-…test.ts:98-134` covers (a)/(b)/(c)/(d). Sub-cases (c)/(d) only assert `late_arrival === false` — see OBS-1 |
| AC-R20-9 | Legacy-mode D2 regression (window-elapsed, terminal, flush, late-arrival) | PASS | `engine/verdict-groups.ts:101-105` (window-elapsed unchanged semantic) + `:132-135` (terminal unchanged) + `:140-147` (flush iterates `openByGroupKey.keys()`) + `:250-264` (legacy match preserved via undefined-undefined tuple); test `test/q20-…test.ts:136-182` exercises all four sub-cases including assertion of `attributed_group.late_arrival_verdicts.length === 1` for (d) |
| AC-R20-10 | VENDORING-MANIFEST.md row = `vendored-with-deltas`, notes contain `R20` + `cluster_event_id` | PASS | `coordination/VENDORING-MANIFEST.md:28` — sync-policy column reads `vendored-with-deltas`, notes column reads `R20 Phase 2 SLICE 2.A deltas: …cluster_event_id…` |
| AC-R20-11 | AT_PIN_FILES excludes engine/verdict-groups.ts; q01-no-at-pin-deltas passes | PASS | `test/q01-no-at-pin-deltas.test.ts:29-76` AT_PIN_FILES enumeration — no `tessera: 'engine/verdict-groups.ts'` entry; Reviewer-run `node --test test/q01-no-at-pin-deltas.test.js` → PASS (1 test) |
| AC-R20-12 | git diff cecd677..23a497e ⊆ 11-entry allowed-set | PASS | Reviewer-run `git diff cecd677..23a497e --name-only` returns 8 paths (`coordination/MEMORIAL.md`, `coordination/NEXT-ROLE.md`, `coordination/VENDORING-MANIFEST.md`, `coordination/specs/Q-R20-SPEC-AUDIT.md`, `coordination/specs/Q-R20-SPEC.md`, `engine/verdict-groups.ts`, `test/q01-no-at-pin-deltas.test.ts`, `test/q20-verdict-grouper-cluster-event-scope.test.ts`); all 8 ⊂ allowed-set; test at `test/q20-…test.ts:186-205` passes |
| AC-R20-13 | `npx tsc --noEmit` exit 0 | PASS | Reviewer-run `npx tsc --noEmit` returned no output (exit 0) |
| AC-R20-14 | Full suite: 181 baseline + q20-OBSERVED = total; 0 fail | PASS | Reviewer-run `node --test test/*.test.js` → `tests 192 / pass 192 / fail 0`; q20 contributes 11 (10 spec-runtime + 1 AC-R20-12 added per § 4.7 chore-B); 181 + 11 = 192. Per-file counts in GREEN commit `cf9ddce` message match |
| AC-R20-15 | First-line SHA pin preserved; annotation block present | PASS | `engine/verdict-groups.ts:1` reads `// VENDORED FROM DeploySignal main@5a72371 — 2026-05-16` (matches `/^\/\/ VENDORED FROM DeploySignal main@5a72371/`); annotation block opens at `:6` matching `/Tessera Phase 2 SLICE 2\.A amendments \(R20/`; test `test/q20-…test.ts:207-214` asserts both |

**Aggregate:** 15 ACs PASS (1 with documented OBS for thin sub-case coverage). 0 FAIL. 0 PARTIAL.

---

## 2. Findings

### CRITICAL — none

### MAJOR — none

### MINOR

**MINOR-1 — q20 file header self-referential inconsistency about AC-R20-12 classification.**
`test/q20-verdict-grouper-cluster-event-scope.test.ts:4-6` declares: "AC-R20-12 (anti-scope diff) … are binding-command attestations reported by the Implementer at GREEN." Yet the same file contains AC-R20-12 as a runtime test at `:186-205`. The Implementer correctly followed spec § 4.7 (which mandates the SHA-pinned literal land in the q20 file body) but did not update the file's own header narrative when adding the runtime test at chore-B (commit `7eb3a63`). Origin: spec § 5 (paragraph two: "AC-R20-10 … AC-R20-12 … are binding-command attestations") contradicts spec § 4.7 ("The substituted literal is committed in the q20 test file body so future re-runs evaluate against fixed historical SHAs"). Architect-attributable spec contradiction; Implementer-attributable for the inherited header narrative not being refreshed at chore-B.
**File:line:** `test/q20-verdict-grouper-cluster-event-scope.test.ts:4-6` vs `:186-205`; `coordination/specs/Q-R20-SPEC.md:509-510` (AC-table preamble) vs `:494-502` (§ 4.7).
**Fix scope (future round):** one of (a) update q20 header lines 4-6 to acknowledge AC-R20-12 is now a runtime test; (b) reword spec § 5 preamble in a future spec revision to say "AC-R20-10/-11/-13/-14 are binding-command attestations; AC-R20-12 is committed as a SHA-pinned runtime test per § 4.7." No behavioral impact; documentation-only.

**MINOR-2 — Stale arithmetic in q01-no-at-pin-deltas.test.ts file-header summary.**
`test/q01-no-at-pin-deltas.test.ts:7-8` reads "Scope: detectors (11) + family types (5) + core orchestration (4) + type files at-pin (8 excl config.ts) + compilation deps (2) = 30 files." Two issues: (a) the literal "type files at-pin (8 excl config.ts)" is stale — verdict.ts has been excluded since R18 (vendored-with-deltas), making the at-pin type-file count 7, not 8; spec § 4.4's prescribed scope-summary refresh did not propagate to this line; (b) the arithmetic 11+5+4+8+2=30 does not match the actual AT_PIN_FILES array length (the array also contains 3 SLICE 4 `tools/calibrators/*.ts` + `tools/curate-baseline-pipeline.ts` entries appended at R06, omitted from the summary). The R20 change correctly decremented "core orchestration (5)" → "(4)" but inherited the pre-existing R18+R06 drift in the same comment block.
**File:line:** `test/q01-no-at-pin-deltas.test.ts:7-8` (summary); contrast with actual list at `:29-76`.
**Fix scope (future round):** refresh the line-7-8 summary to reflect the actual list partition: detectors (11) + family types (5) + core orchestration (4) + type files at-pin (7 excl config.ts AND verdict.ts) + compilation deps (6) + SLICE 4 tools (3) = 36 files. No behavioral impact; comment-level only. Pre-existing R18 drift, not R20-introduced — R20 inherited an opportunity to refresh and did not.

**MINOR-3 — Spec § 4.4 parenthetical placement deviation.**
Spec § 4.4 directs: "Update to 'core orchestration (4)' and add a parenthetical note: '(verdict-groups.ts excluded at R20)'." The implementation made the "(5) → (4)" change at `test/q01-no-at-pin-deltas.test.ts:7` but did not add the parenthetical inline at line 7. Instead, the explanatory text was placed at `:10` (top-of-file comment): `// verdict-groups.ts excluded — vendored-with-deltas at R20 (cluster_event_id scope keying + composite group_id).` Equivalent information; different location. Implementer chose a clearer placement (top-of-file note alongside the existing R18 verdict.ts top-level note) over inline-at-line-7. Not a behavioral defect; the spec did not bind the placement via an AC. Worth noting for spec-fidelity audit.
**File:line:** spec `coordination/specs/Q-R20-SPEC.md:462` ("add a parenthetical note") vs implementation `test/q01-no-at-pin-deltas.test.ts:7` (no inline parenthetical) + `:10` (alternative placement).
**Fix scope:** none required; alternative placement preserves the audit-trail intent.

### OBS

**OBS-1 — AC-R20-8 sub-cases (c) and (d) coverage thin.**
Spec § 5 AC-R20-8 sub-case (c) text reads: "→ THEN opens a new group (legacy-mode incoming; tuple mismatch with closed group's `cluster_event_id: 'evt-X'`)". The test at `test/q20-…test.ts:123-126` only asserts `r.late_arrival === false`. It does not verify (e.g., by checking `r.attributed_group.group_id !== closed_group.group_id`, or by checking `r.attributed_group.cluster_event_id === undefined` for sub-case (c)) that a NEW group was actually opened rather than something else happening. Sub-case (d) at `:128-133` has the same shape — only `late_arrival === false`. A hypothetical regression where `late_arrival` were always `false` but the verdict were silently attached to the wrong group would pass this test. Spec's Given/When/Then for (c) and (d) does not explicitly bind a "distinct group_id" assertion, so the Implementer matched the AC text literally. Architect-attributable AC-writing thinness, not Implementer fault. Compare to sub-case (b) at `:114-119` which DOES verify `r.attributed_group.cluster_event_id === 'evt-Y'` — stricter binding form.
**File:line:** `test/q20-…test.ts:123-126`, `:128-133`; spec `coordination/specs/Q-R20-SPEC.md:521` AC-R20-8 sub-cases (c) and (d).

**OBS-2 — RED commit count vs final q20 test count.**
The RED commit `222a856` introduced 10 placeholder tests (AC-R20-1…-9 + AC-R20-15). The GREEN commit `cf9ddce` implemented all 10 with real bodies. The chore-B commit `7eb3a63` then ADDED an 11th test (AC-R20-12) per spec § 4.7. So strictly speaking, AC-R20-12 was NOT exercised under TDD discipline (no RED placeholder existed before its addition; the test was authored against an already-passing state — the diff at `cecd677..23a497e` was already-fixed by the time chore-B ran). This is intentional per § 4.7 (the SHA must exist before the test referencing it can be committed) and is the same shape used at R18 AC-R18-10 (`b640c6c..9012faa`). Not a violation; documented for audit completeness. AC-R20-1 through -9 + -15 each went through proper RED → GREEN.
**File:line:** `git show 222a856 --stat` (10 placeholders); `git show 7eb3a63 -- test/q20-…test.ts` (11th test added); spec § 4.7 at `coordination/specs/Q-R20-SPEC.md:494-502`.

**OBS-3 — engine/verdict-groups.ts annotation block placement matches R18 pattern.**
The R18 verdict.ts pattern (per spec § 2.7 reference) inserts the Tessera amendment annotation AFTER the 5-line vendoring header and BEFORE the inherited module-purpose comment. The actual layout at `engine/verdict-groups.ts:1-18` is: lines 1-5 = vendoring header; lines 6-16 = R20 Tessera annotation (11 lines); line 17 = blank; line 18 = inherited module-purpose comment. The blank line that originally separated vendoring header from module purpose at the source-of-truth has been displaced to between the annotation block and module purpose. q01-vendoring-coverage's first-line SHA-pin regex remains satisfied (Reviewer-confirmed); q01-no-at-pin-deltas does not check this file (excluded per AC-R20-11). No defect.
**File:line:** `engine/verdict-groups.ts:1-18`.

---

## 3. Right-reasons audit

**Test #1 — AC-R20-4 composite group_id format.**
Spec requirement: § 2.2 + AC-R20-4 — when `cluster_event_id: 'evt-X'`, `deploy_ref: 'deploy-A'`, `ts: 1700000000`, then `attributed_group.group_id === 'group-evt-X-deploy-A-1700000000'`. Test at `test/q20-…test.ts:58-62`: literal-string assertion against the spec-prescribed format. The expected value is externally derived from spec § 2.2 ("composite `group-{cluster_event_id}-{deploy_id}-{ts}`"), not from the Implementer's choice — the spec fixed the format before the Implementer wrote the implementation. Test is sensitive: any drift (omitted dash, reordered segments, different ts) would fail. **Not self-confirming.**

**Test #2 — AC-R20-7 same cluster_event_id, distinct deploy_ids.**
Spec requirement: AC-R20-7 — two distinct VerdictGroups for `(evt-X, deploy-A)` vs `(evt-X, deploy-B)`. Test at `test/q20-…test.ts:88-96` asserts (a) `assert.notStrictEqual(r1.attributed_group, r2.attributed_group)` (object-identity), (b) distinct group_ids, (c) both carry cluster_event_id 'evt-X'. The keying transition (openByDeploy → openByGroupKey with `${eventSeg}|${deploy_id}` composition) is the load-bearing R20 behavior. Pre-R20 production code would have routed both ingests to the same `openByDeploy.get('deploy-A')` entry (collision)— the second ingest would have appended to the first group, not opened a new one. This test would have failed pre-R20 by asserting object-distinctness. Strong test for the keying delta. **Not self-confirming.**

**Test #3 — AC-R20-9(d) legacy-mode late-arrival within grace.**
Spec requirement: AC-R20-9 — observable IngestResult byte-identical to inherited pre-R20 behavior; D2 grace-window preserved. Test at `test/q20-…test.ts:172-181`: open + immediately close group at ts=1000 with `{terminal:true}`, then ingest a second verdict at ts=1100 (100 sec, within grace=300); assert `r2.late_arrival === true`, `r2.attributed_group.group_id === 'group-deploy-A-1000'`, `late_arrival_verdicts.length === 1`. Expected behavior originates in the inherited DeploySignal L3b aggregator (Addition #25 D2), not in R20 Implementer choice. If R20's `findRecentClosedForKey` tuple-match accidentally broke undefined-undefined matching (e.g., if it used `===` directly on `cluster_event_id` rather than `(g.cluster_event_id ?? '') !== (cluster_event_id ?? '')`), this test would fail because `undefined !== undefined` returns `false` but `undefined === undefined` returns `true` — actually wait, both work for undefined-undefined. The risk is the converse: if R20 had used `g.cluster_event_id !== cluster_event_id` (without `??`), `undefined === undefined` would still match. The real risk caught by this test: any keying-transition fault that routes legacy-mode verdicts through a non-legacy code path would surface as either no late-arrival (false negative) or wrong group_id. Test exercises the regression surface. **Not self-confirming.**

---

## 4. Cross-cutting checks

**TDD discipline.**
Verified via `git log --oneline` and `git show <sha>`:
- `222a856 chore(R20): RED — q20 placeholders` — file created with 10 `assert.fail('RED: AC-R20-N pending')` placeholders (verified by `git show 222a856:test/q20-…test.ts`); precedes any modification to `engine/verdict-groups.ts`.
- `cf9ddce feat(R20): GREEN — Phase 2 SLICE 2.A VerdictGrouper cluster_event_id scope keying` — production deltas + maintenance edits + real test bodies all in one GREEN commit per spec § 4.6. Commit message reports per-file OBSERVED counts (R03 MINOR-4 + R18 MINOR-2 reinforcements satisfied).
- AC-R20-12 was added in the chore-B commit `7eb3a63` per § 4.7; this AC was not subject to RED→GREEN since the SHA being asserted (`23a497e`) had to exist before the test could be written. Documented at OBS-2. **TDD discipline: PASS for AC-R20-1 through -9 + -15. AC-R20-12 follows the § 4.7 forward-protection pattern (precedent: R18 AC-R18-10).**

**No-skip / halt discipline.**
No `assert.fail` or `test.skip` remains in the GREEN+chore-B test file. No `DIAGNOSTIC-R20-*` files in `coordination/diagnostics/` (Reviewer confirmed via existence-check only). Implementer encountered no halt conditions per Architect spec § 9.10 anticipated scenarios; MEMORIAL.md R20 Implementer section records "Zero halt conditions encountered" by inference from the 6 CONFIRMATION-only entries (lines 1854-1864) and absence of VIOLATION entries. **PASS.**

**Anti-scope.**
Reviewer-run `git diff cecd677..HEAD --name-only` returns 8 paths (since chore-B added 0 new files, only modified test/q20 + NEXT-ROLE.md):
- `coordination/MEMORIAL.md`, `coordination/NEXT-ROLE.md`, `coordination/VENDORING-MANIFEST.md`, `coordination/specs/Q-R20-SPEC-AUDIT.md`, `coordination/specs/Q-R20-SPEC.md`, `engine/verdict-groups.ts`, `test/q01-no-at-pin-deltas.test.ts`, `test/q20-verdict-grouper-cluster-event-scope.test.ts`.

All 8 ⊂ 11-entry allowed-set at spec § 3. The 3 unused entries (`engine/verdict-groups.js`, `test/q01-no-at-pin-deltas.test.js`, `test/q20-verdict-grouper-cluster-event-scope.test.js`) are gitignored (`*.js` in `.gitignore`), confirming Architect Assumption C in spec § 9.2. No anti-scope file appears in the diff. **PASS.**

**Inherited-file deltas surface.**
Reviewer-run `diff <(tail -n +7 engine/verdict-groups.ts) ../deploysignal/engine/verdict-groups.ts`: 24 hunks, every one corresponding to a spec § 2 prescribed delta (openByDeploy→openByGroupKey rename; ingest opts shape extension; groupKey/groupId/openGroupAt/closeGroup/findRecentClosedForKey method-body changes; openGroupForDeploy signature). No incidental modifications to inherited code outside the prescribed extension points. **A12 anti-scope: PASS.**

**Vendoring-coverage compatibility.**
Reviewer-run `node --test test/q01-vendoring-coverage.test.js test/q01-no-at-pin-deltas.test.js test/q18-phase2-slice1-topology-substrate.test.js` → all PASS. Confirms (a) first-line SHA pin preserved on engine/verdict-groups.ts; (b) byte-identity check correctly excludes verdict-groups.ts via AT_PIN_FILES removal; (c) q18 AC-R18-7 inherited-template-literal substring still matches (preserved in the legacy-mode `else` branch of `groupId()` at `engine/verdict-groups.ts:169`). Per spec § 9.8 vendored-file-delta assertion-surface enumeration — all 3 consumer assertions verified PASS.

**Memorial accretion (R20 Implementer + Architect entries).**
MEMORIAL.md R20 section at lines 1824-1864: 13 Architect CONFIRMATIONs + 6 Implementer CONFIRMATIONs; 0 VIOLATIONs from either role. Independent of this Reviewer report. No self-exoneration pattern observed (per CLAUDE-COMMON.md REINFORCED 2026-05-16 + R19 MAJOR-4 reinforcement): all CONFIRMATION entries describe specific actions taken (with file:line citations or git SHA references), none retroactively reframe a discipline deviation as "correct." **PASS.**

**Cold-review boundary.**
Reviewer did not read: `coordination/specs/Q-R20-SPEC-AUDIT.md` past the head (only `:1-80` for inputs-consulted + citation-accuracy log); `coordination/diagnostics/` (existence-acknowledged only); `coordination/logs/`; `.prompt-*.md`; `coordination/OVERNIGHT-LOG-2026-05-17.md`; prior Reviewer reports R02-R19. Per CLAUDE-REVIEWER.md cold-review-discipline. Note: per the CROSS-PROJECT-MEMORIAL.md R15 precedent, reading `Q-R20-SPEC-AUDIT.md` past inputs-consulted would compromise independence for grilling-pass cross-check; I read only the inputs-consulted + citation-accuracy sections to verify Architect's cold-start file-open claims, not the full audit ceremony.

---

## 5. Grilling output (on this report, before routing)

| Gate | Verdict |
|---|---|
| Every finding has a file:line reference? | YES — MINOR-1 cites `test/q20-…test.ts:4-6` + `:186-205` + spec § 5/§ 4.7 lines; MINOR-2 cites `:7-8` vs `:29-76`; MINOR-3 cites spec `:462` vs test `:7` + `:10`; OBS-1 cites `:123-126` + `:128-133`; OBS-2 cites RED `222a856` and chore-B `7eb3a63`; OBS-3 cites `:1-18`. |
| Any AC marked PASS without verification? | NO — every PASS row cites a file:line OR a Reviewer-run binding command output. AC-R20-13/-14 PASS rows cite Reviewer-run command outputs, not the Implementer's attestation alone. AC-R20-8 marked PASS-WITH-OBS rather than PASS to flag thin sub-case coverage. |
| Right-reasons audit completed for 3+ tests? | YES — AC-R20-4 (composite format), AC-R20-7 (keying-transition non-self-confirming), AC-R20-9(d) (D2 inherited semantic regression test). Each names the spec requirement + traces self-confirming risk + reaches NOT-self-confirming verdict. |

All three gates PASS. No revision required.

---

## 6. Routing

Findings: 0 CRITICAL + 0 MAJOR + 3 MINOR + 3 OBS.

**STATUS: MERGE-READY** (no CRITICAL).

`coordination/NEXT-ROLE.md` will be updated to route to Memorial-Updater with `Inputs: coordination/reviews/REVIEWER-REPORT-R20.md` listed.

Per CROSS-PROJECT-MEMORIAL.md REINFORCED 2026-05-17 (R16 Reviewer memorial-accretion-omission reinforcement) and CLAUDE-REVIEWER.md REINFORCED 2026-05-17: VIOLATION entries will be appended to `coordination/MEMORIAL.md` for each of MINOR-1, MINOR-2, MINOR-3 (severity ≥ MINOR).

---

_End of REVIEWER-REPORT-R20.md._
