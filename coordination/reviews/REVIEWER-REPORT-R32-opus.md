# REVIEWER-REPORT-R32-opus — Tessera R32 WU-05 SLICE 3 Close-Walk (Opus pass, hybrid)

**Reviewer:** Opus (one of two parallel hybrid reviewers; merger consolidates with Sonnet pass)
**Round:** R32 (audit-tier; WU-05 Wave 3; SLICE 3 close-walk)
**Baseline SHA:** `45242f2`
**Chore-A SHA:** `6466940`
**HEAD SHA:** `7f737d6`

**Binding commands run independently by this Reviewer (against HEAD):**
- `npx tsc -p tsconfig.test.json` → exit 0 (no diagnostics) ✓
- `node --test test/*.test.js` → `tests=305 / pass=299 / fail=6` (HEAD reading; Implementer's
  chore-A-anchored attestation of `305/297/8` was independently verified consistent: chore-B
  substitution converts AC-R32-19/20 from RED → GREEN at HEAD, leaving 6 fails)

**Pre-R32 baseline:** `tests=284 / pass=280 / fail=4` (per spec § header; empirically reachable
by `git checkout 45242f2 && node --test`, not re-verified inline this pass — trusting the
Implementer's session-start measurement plus the +21 = 305 delta arithmetic)

**Mandate posture:** Findings posture is adversarial-thorough. The Implementer made several
substantive judgment calls that are mostly defensible but include at least one structural
defect in the Tessera scoping artifact that the AC suite does not catch.

---

## § 1 Per-AC verification table

| AC | Criterion (short) | Status | Evidence |
|---|---|---|---|
| AC-R32-1 | PHASE-2-SLICE-3-CLOSE-WALK.md exists w/ §1–§6 | PASS | `coordination/PHASE-2-SLICE-3-CLOSE-WALK.md:12,35,104,134,160,203` (six `## §` headers present); `q32:27-34` PASS |
| AC-R32-2 | SCOPING-MEMO has Vendor fungibility + A10 generalized | PASS-WITH-DEFECT | String content present at `SCOPING-MEMO-v0.3.md:267` ("Vendor fungibility") + `:255` (A10 mentions AMD, Trainium, TPU). **But test is structurally weak** — see MAJOR-1 below. `q32:37-46` PASS |
| AC-R32-3 | Q-R25-SPEC AC-R25-14 contains 228 | PASS | `Q-R25-SPEC.md:846` (`AC-R25-14 \| ... pass=228 / fail=1`); `q32:49-57` PASS |
| AC-R32-4 | Q-R25-SPEC contains DIAGNOSTIC-R25-ac12-tolerance.md | PASS | `Q-R25-SPEC.md:272` (in retroactive R32 amendment block in § 3); `q32:60-66` PASS |
| AC-R32-5 | Q-R25-SPEC AC-R25-12 contains 0.001 and 0.01 (not 1e-9) | PASS | `Q-R25-SPEC.md:202` (§ 1.8 header), `:754-755` (pseudocode), `:841` (AC-R25-12 row); 1e-9 retained only inside `<` comparisons in § 1.8 narrative and replaced inline; `q32:69-76` PASS |
| AC-R32-6 | q30 test contains R25 MINOR-2 closing reference | PASS | `test/q30-nvlink-adapter.test.ts:15,183,190` (pre-existing from R30; preserved through R32 edit); `q32:79-85` PASS |
| AC-R32-7 | q25 test contains R25 MINOR-3 gauge + missed_scrape AC | PASS (BUT TEST SUBSTANTIVELY WEAKER THAN SPEC TEXT) | Test added at `test/q25-l0-contract.test.ts:181-192`. Test exercises real `transformPair` w/ gauge + missed-scrape input, asserts `slope_quality === 'degraded'`, `missed_scrape_inferred === true`. Behavior verified correct against `engine/l0/counter-rate-transform.ts:103-107` (non-counter pass-through still computes `missed_scrape_inferred`/`slope_quality`). **AC test itself only asserts literal string "MINOR-3" presence — see MAJOR-2.** `q32:88-96` PASS |
| AC-R32-8 | Q-R26-SPEC reflects tsc exit=2 reality | PASS | `Q-R26-SPEC.md:552` (R32 amendment paragraph appended to AC-R26-14 row contains "exit code is 2" + "TS2688/TS5107"); `q32:99-108` PASS |
| AC-R32-9 | q-md-f4 AC-R26-16 uses execFileSync | PASS | `test/q-md-f4-common-mode-injection.test.ts:247,258` (require name swapped + call site swapped); `q32:111-119` PASS. Note: pre-existing AC-R26-16 still fails at runtime due to UNRELATED post-chore-A allowed-set being stale — that pre-existing fail is in the baseline 4. |
| AC-R32-10 | common-mode-attribution.ts docstring relaxed | PASS | `engine/topology/common-mode-attribution.ts:68-70` (misleading "one record per distinct member shard" text removed; "iteration over all touches" wording substituted); `q32:122-131` PASS. Implementer chose option B (relax docstring) over option A (tighten impl) per § 4 table partial-close disposition. |
| AC-R32-11 | q28 AC-R28-9 asserts source_id + source_version | PASS (BUT INCOMPLETE — see MINOR-3) | `test/q28-slurm-adapter.test.ts:163-164` adds the two `strictEqual` calls for `snap1`. But `snap2` (whitespace-only input — the parallel sub-case at `:166-169`) was NOT updated; assertions cover only the empty-string path, not the whitespace path. `q32:134-141` PASS. |
| AC-R32-12 | q29 AC-R29-6 uses strictEqual for host | PASS | `test/q29-k8s-adapter.test.ts:131` (`strictEqual(gpu.metadata?.host, expectedHost, ...)`); `length > 0` pattern removed; `q32:144-157` PASS. Stronger than typical R32 string-match tests — checks presence AND absence. |
| AC-R32-13 | q29 AC-R29-13 carve-out contains REVIEWER-REPORT regex | PASS (test substantively weak — see MINOR-1) | `test/q29-k8s-adapter.test.ts:291-292,303` (regex declared + wired into filter); `q32:160-169` PASS. Test only checks for literal string "REVIEWER-REPORT" in 1000-char window after AC-R29-13 declaration — a comment satisfies it without functional regex. The Implementer did write a functional regex, so the substantive fix is correct; the AC itself is weak. |
| AC-R32-14 | q29 AC-R29-12 has spec § 3.2 / Node.js v25 comment | PASS (test substantively weak) | `test/q29-k8s-adapter.test.ts:243-245` (comment added explicitly referencing "spec § 3.2 deviation"); `q32:172-184` PASS. Same string-match weakness as MINOR-1. |
| AC-R32-15 | q30 AC-R30-15 uses regex `/m` or `assert.match` | PASS | `test/q30-nvlink-adapter.test.ts:205-208` (uses `/^\s*correlational_not_causal:\s*true\s*;/m.test(verdict)`); double-checks regex presence AND absence of plain `includes()`; `q32:187-202` PASS. Stronger than other R32 ACs. |
| AC-R32-16 | nvlink-source.ts :133-134 has dead-code comment OR simplified ?? chain | PASS | `engine/topology/nvlink-source.ts:133-135` (3-line inline comment "structurally unreachable...parseNvlinkStatus always defaults..."); `q32:205-216` PASS. |
| AC-R32-17 | REVIEWER-REPORT-R32.md exists | RED (by design) | `coordination/reviews/REVIEWER-REPORT-R32.md` does not exist at chore-A; will be created by Merger after this Opus pass + Sonnet pass complete. Documented as RED in NEXT-ROLE.md attestation table. |
| AC-R32-18 | REVIEWER-REPORT-R32.md has 0 CRITICAL | RED (by design) | Cannot evaluate without file existing. Same disposition as AC-R32-17. |
| AC-R32-19 | round-start→chore-A diff ⊆ allowed-set | PASS | `q32:237-266` PASS at HEAD; empirically `git diff 45242f2..6466940 --name-only` yields exactly the 16 allowed-set entries (verified independently). |
| AC-R32-20 | chore-A→HEAD diff ⊆ allowed-set + carve-outs | PASS | `q32:269-309` PASS at HEAD; empirically `git diff 6466940..HEAD --name-only` yields `coordination/NEXT-ROLE.md` + `test/q32-slice3-close-walk.test.ts` (both in allowed-set). |
| AC-R32-21 | tsc exit 0 at chore-A | PASS | Implementer attestation `tsc exit=0`; independently verified at HEAD `tsc exit=0`; chore-A SHA presumed-stable for tsconfig (no tsconfig change in R32). |
| AC-R32-22 | node --test reports empirical counts | PASS | Implementer attested `305/297/8` at chore-A; HEAD shows `305/299/6`; delta of +2 passes from chore-B AC-R32-19/20 substitution accounts for the gap exactly. No reframing detected per `false-compliance-attestation` rule. |
| AC-R32-23 | PR-F6 Cell 1 (positive sensitivity) sound | PASS | WU-04 R26 AC-R26-1 evidence in PHASE-2-SLICE-3-CLOSE-WALK.md § 6.1; underlying test at `test/q-md-f4-common-mode-injection.test.ts` exercises v9Y fixture with PSU-shared shards; produces `candidates` with `psu-0` shared_node_id + `correlational_not_causal: true`. Evidence package complete. |
| AC-R32-24 | PR-F6 Cell 2 (positive specificity) sound | PASS | WU-04 R26 AC-R26-2 evidence: empty `fired_events` → `candidates.length === 0`. Trivially correct; structural assertion adequate. |
| AC-R32-25 | PR-F6 Cell 3 (negative specificity) sound | PASS | WU-04 R26 AC-R26-3 evidence: shards on different racks → no common-mode candidate surfaces. v9Y fixture geometry confirms PSU-1 / PSU-2 are distinct, so cross-rack PSU correlation cannot fire. Sound. |
| AC-R32-26 | R-E7 evidence sound, classified MITIGATED | PASS | WU-03 R30 AC-R30-10..14 evidence: all four failure-mode paths (32-bit wrap, missed-scrape, reset-vs-wrap, variable-interval comparable slopeNorm) exercised by AC against synthetic counter generator. Evidence is sound. PHASE-2-SLICE-3-CLOSE-WALK.md § 7 records R-E7 status as MITIGATED. Mutation-kill gap for default-64 counter_width acknowledged as future-round optional enhancement (per R30 spec § 7.1 + PHASE-2-SLICE-3-CLOSE-WALK § 4 disposition). |

**Note on PR-F6 Cell 4** (mixed-signal robustness): Cell 4 is described in PHASE-2-SLICE-3-CLOSE-WALK.md § 2.1 ("PSU event + concurrent unrelated per-shard event → attribution surfaces PSU-attributed correctly, ignores unrelated event") but is NOT enumerated as a separate Reviewer-verified AC in Q-R32-SPEC.md § 3 (the spec only enumerates Cell 1/2/3 as AC-R32-23/24/25). This is a spec omission — see MINOR-4 below.

---

## § 2 Findings

### MAJOR-1 — Structural defect: SCOPING-MEMO-v0.3.md vendor-fungibility heading inserted INSIDE the anti-scope bullet list, severing A14's rationale

**File:line:** `coordination/SCOPING-MEMO-v0.3.md:263-289`

**What's wrong (three coupled problems):**

1. **A14 mutilated.** Pre-R32 (per diff `45242f2..HEAD`), A14 read:
   ```
   - **A14: NO modification to per-shard verdict shape.** Inherited verdict shape preserved;
     fleet-level output is NEW shape layered on top (parallel to inherited Addition #12
     per-pod precedent).
   ```
   Post-R32 (current HEAD `:265`), A14 reads:
   ```
   - **A14: NO modification to per-shard verdict shape.**
   ```
   A14's load-bearing rationale ("Inherited verdict shape preserved; fleet-level output is NEW
   shape layered on top (parallel to inherited Addition #12 per-pod precedent)") was severed
   from A14.

2. **An `### Vendor fungibility` h3 heading was inserted at `:267`**, between bullet A14
   (`:265`) and bullet A15 (`:287`). Markdown bullet lists do not survive an interleaved h3
   heading: the renderer terminates the A12–A14 list, renders the heading + its content as a
   stand-alone section, then starts a NEW bullet list at A15–A17. Visually, A14 will appear
   orphaned at the end of one list, the vendor-fungibility section will appear as an
   independent doc subsection, and A15–A17 will appear as a new list with no preamble.

3. **A14's severed rationale was appended (out of context) to the end of the TAGGED-FUTURE
   vendor-adapter paragraph at `:286`**:
   ```
   ...new vendor-specific test substrate; consumes L0 contract by interface. No modification
   to inherited engine internals (A12 preserved). Inherited verdict shape preserved;
   fleet-level output is NEW shape layered on top (parallel to inherited Addition #12 per-pod
   precedent).
   ```
   The trailing sentence is grammatically jarring — it claims "Inherited verdict shape
   preserved" in the middle of a paragraph about *future vendor adapters*, where the
   antecedent of "Inherited verdict shape" is unclear. Semantically the sentence is now
   homeless: it's not part of A14 (where it belongs) and it doesn't belong in the
   TAGGED-FUTURE adapter paragraph.

**Why this is MAJOR not MINOR:**

- SCOPING-MEMO-v0.3.md is the load-bearing scoping artifact for Tessera (PRD lines 3, 425
  designate it as canonical). Corrupting the anti-scope section of the canonical scoping
  artifact is structural damage to the project's load-bearing reference.
- A14 ("NO modification to per-shard verdict shape") is one of the inherited A-anti-scope
  constraints carrying forward from DeploySignal Phase-3.d.D. Its rationale text is the
  precedent-tie ("parallel to inherited Addition #12 per-pod precedent"). Stripping the
  rationale weakens future-round reasoning about A14's applicability.
- The spec amendment table at `:123` claims "§ 2.4 + A10 generalization" but the actual
  insertion is between A14 and A15 of § 2.3, NOT at § 2.4 (which is the pre-existing
  "Dependency graph between extensions" section at `:302`). The amendment table is
  inconsistent with the actual file layout.

**Recommended fix (NOT applied by Reviewer; documented for next-round action):**
- Restore A14's full rationale to `:265`.
- Move the `### Vendor fungibility` block out of the bullet list (e.g., insert it AFTER A17
  at `:289` as a new subsection of § 2.3, or relocate to a true § 2.4 entry by renumbering
  the pre-existing "Dependency graph" to § 2.5).
- Remove the orphaned "Inherited verdict shape preserved..." sentence from the TAGGED-FUTURE
  paragraph (`:286`).

**Why AC-R32-2 did not catch this:** AC-R32-2 string-matches `"Vendor fungibility"` OR
`"§ 2.4"` AND any one of `"AMD"`, `"Trainium"`, `"TPU runtime"`. All four strings are present
in the corrupted file. The AC is structurally blind to placement context. See MAJOR-2 below.

---

### MAJOR-2 — Multiple R32 ACs are substantively weaker than the spec text they bind, allowing self-confirming or trivially-satisfied test outcomes

This finding aggregates a coherent pattern across AC-R32-2, AC-R32-7, AC-R32-13, and AC-R32-14.
The Implementer explicitly authored Rule 3 (`implementer-spec-test-assertion-coverage`) in
PHASE-2-SLICE-3-CLOSE-WALK.md § 5 lines 180-186 — and then proceeded to violate it
inside R32's own AC suite.

The rule (verbatim from § 5.3): _"For each AC row in spec § 5.2, the test assertion MUST bind
ALL fields listed in the Then column. The mutation test is: 'If production returned a
structurally-valid-but-wrong value for this field..., would my assertion still pass?' If yes,
strengthen to equality or structural equivalence as the AC literal prescribes."_

**Instances:**

(a) **AC-R32-2 (spec § 3 row 2):** Spec text requires SCOPING-MEMO contains "`§ 2.4`" or
   "`Vendor fungibility`" section AND A10 generalized. Test at `q32:37-46` uses only string
   presence. **Mutation test failure:** The structural defect in MAJOR-1 (heading misplaced
   inside bullet list, A14 mutilated) does not flip the AC. A correct strengthening would
   verify the section sits at a top-level h3 outside the bullet list, e.g., by checking
   that `### Vendor fungibility` appears AFTER the last `- **A17` bullet.

(b) **AC-R32-7 (spec § 3 row 7):** Spec text requires q25 test contains a test "asserting
   `slope_quality` of a gauge metric on a missed-scrape-shaped interval (both `'gauge'` and
   `missed_scrape` or `degraded` in the appended test body)". Test at `q32:88-96` asserts
   only `content.includes('MINOR-3')`. **Mutation test failure:** A no-op test with just
   `// R25 MINOR-3` in a comment and no `assert` calls would satisfy the AC. The
   actual added test at `test/q25-l0-contract.test.ts:181-192` is substantively correct
   (uses `strictEqual` on `slope_quality`, `missed_scrape_inferred`, etc.) — but the AC does
   not bind any of that correctness. Strengthening: check for both `'gauge'` literal AND
   either `missed_scrape` OR `degraded` literal, as the spec text actually prescribed.

(c) **AC-R32-13 (spec § 3 row 13):** Spec text requires "the ALLOWED_SET or carve-out logic
   contains `REVIEWER-REPORT` regex pattern". Test at `q32:160-169` only checks
   `acSection.includes('REVIEWER-REPORT')`. **Mutation test failure:** A comment
   `// REVIEWER-REPORT not needed` would satisfy the AC. Implementer's actual change is
   correct (regex declared + wired into filter chain at `test/q29-k8s-adapter.test.ts:291-303`),
   but the AC does not verify the regex is wired. Strengthening: check for
   `REVIEWER_REPORT_REGEX` identifier presence AND `REVIEWER_REPORT_REGEX.test(` call.

(d) **AC-R32-14 (spec § 3 row 14):** Spec text requires AC-R29-12 contains "inline comment
   referencing `spec § 3.2` or `Node.js v25` and the `env: subEnv` strip". Test at `q32:172-184`
   only checks for the presence of `spec § 3.2` or `§ 3.2`. **Mutation test failure:** A
   comment block above an unrelated test could satisfy the AC. Implementer's actual change is
   correct (comment placed near the env-strip block), but the AC doesn't verify the comment is
   adjacent to the `env: subEnv` line.

**Why this is MAJOR not MINOR:** The Implementer derived the rule for *prior* rounds' failures
(R28/R29/R30 MINOR-1 instances) and recorded the 3-occurrence threshold-crossed reinforcement.
Embedding 4 NEW instances of the same pattern inside the R32 close-walk — the very round that
ratifies the rule — is a self-undermining failure of the discipline. Each instance is
individually MINOR; the *pattern of recurrence inside the round that derives the cross-project
rule* is the structurally important class-level defect.

**Files:line refs:**
- AC-R32-2: `test/q32-slice3-close-walk.test.ts:37-46`
- AC-R32-7: `test/q32-slice3-close-walk.test.ts:88-96`
- AC-R32-13: `test/q32-slice3-close-walk.test.ts:160-169`
- AC-R32-14: `test/q32-slice3-close-walk.test.ts:172-184`

---

### MINOR-1 — Q-R32-SPEC.md § 2.2 cites "vendor-fungibility § 2.4" but actual placement is mid-§ 2.3 bullet list

**File:line:** `coordination/specs/Q-R32-SPEC.md:38` ("vendor-fungibility § 2.4 + A10 + § 1.7 + PRD US-01")

The spec § 2.2 cites the new section at § 2.4, but the actual SCOPING-MEMO file places the
new section between A14 and A15 of § 2.3 (not at § 2.4 — the pre-existing § 2.4 is
"Dependency graph between extensions" at `SCOPING-MEMO-v0.3.md:302`). The amendment table at
`SCOPING-MEMO-v0.3.md:123` more accurately says "Vendor fungibility subsection added to § 2.3
Extension 3" — but Q-R32-SPEC.md remains stale.

Defect class: spec-implementation drift.

Recommended fix: update Q-R32-SPEC.md § 2.2 wording, OR (preferred) relocate the new section
to a true § 2.4 in the SCOPING-MEMO file (which would also fix MAJOR-1's structural issue).

---

### MINOR-2 — Q-R26-SPEC.md AC-R26-14 row retains the original "exit code is 0" claim verbatim alongside the R32 amendment

**File:line:** `coordination/specs/Q-R26-SPEC.md:552`

The AC-R26-14 amendment appends an "R32 post-round amendment" paragraph to the row but does
NOT update the leading sentence:
```
| AC-R26-14 | Given the chore-A SHA `<CHORE-A-SHA>`, when `npx tsc -p tsconfig.test.json` is
run from the worktree root, then the exit code is 0 (zero diagnostics). **R32 post-round
amendment (R26 MAJOR-1):** The empirical exit code at R26 chore-A was exit code is 2 ...
```

A future reader of this AC row will see two contradictory exit-code claims in the same cell.
The R32 amendment paragraph is corrective, but the original "exit code is 0" assertion is
still authoritative-looking. The R26 MAJOR-1 disposition would be more cleanly served by
either:
- Strikethrough on the original AC text, OR
- Moving the amendment to a sidecar note under the table with a `[R32-amended]` marker on the
  original row.

AC-R32-8 (`Q-R26-SPEC.md contains "exit code is 2" or "exit 2" or "TS2688" or "TS5107"`) PASS
verifies the amendment is present but doesn't catch the duplication.

---

### MINOR-3 — AC-R28-9 R28 MINOR-1 fix only updates the `snap1` (empty-input) sub-case, not the `snap2` (whitespace-only) sub-case

**File:line:** `test/q28-slurm-adapter.test.ts:160-171`

The R28 MINOR-1 cleanup adds `assert.strictEqual(snap1.source_id, META.sourceId)` and
`assert.strictEqual(snap1.source_version, META.sourceVersion)` after the first
`parseSlurmTopologyConf('')` call. The sibling sub-case `parseSlurmTopologyConf('  \n\n   \t\n', META)` at `:166-169` has the same shape but does not get the new assertions.

Both sub-cases exercise the same parser entry point, so the assertion-coverage gap is mostly
cosmetic — production behavior is identical for both. But the close-walk's stated intent was
to strengthen AC-R28-9 to the R28 MINOR-1 spec text (which doesn't distinguish sub-cases).
Strict adherence to the cleanup would have applied the new assertions to both sub-snapshots
or refactored to a parameterized test.

---

### MINOR-4 — PR-F6 Cell 4 (mixed-signal robustness) is referenced in PHASE-2-SLICE-3-CLOSE-WALK.md § 2.1 but NOT enumerated as a Reviewer-verified AC in Q-R32-SPEC.md § 3

**File:line:** `coordination/specs/Q-R32-SPEC.md:90-92` (only AC-R32-23/24/25 enumerate Cells
1/2/3); `coordination/PHASE-2-SLICE-3-CLOSE-WALK.md:60-65` (Cell 4 listed in the WU-04
deliverable summary)

The original PRD scope for WU-04 specified a **4-cell** PR-F6 evidence matrix
(`coordination/PRD.md:262-266`, listing Cell 1, 2, 3, **4**). The R32 spec only created
Reviewer-verified ACs (AC-R32-23/24/25) for Cells 1, 2, 3 — Cell 4 (mixed-signal robustness)
was dropped from the hybrid Reviewer audit surface.

The PHASE-2-SLICE-3-CLOSE-WALK.md § 6 PR-F6 audit subsections also only enumerate Cells 1/2/3
(at `:208-218`); Cell 4 has no dedicated audit subsection.

This is a missed AC. The Implementer's audit-tier self-spec should have either (a) included
a fourth Reviewer-verified AC for Cell 4, or (b) explicitly noted Cell 4 as out-of-scope with
disposition justification. Neither happened.

---

### OBS-1 — AC-R32-7 substantive correctness verified independently

Despite the AC-R32-7 string-match weakness flagged in MAJOR-2(b), the underlying test at
`test/q25-l0-contract.test.ts:185-192` is substantively correct. The L0 transform at
`engine/l0/counter-rate-transform.ts:103-115` computes `missed_scrape_inferred` and
`slope_quality` for ALL semantic types (the non-counter pass-through branch at `:107-116`
emits these flags via the same shared computation at `:103-104`). The R25 MINOR-3 closure is
behaviorally complete; only the binding AC is weak.

---

### OBS-2 — Implementer self-noted anti-scope-discovery-ordering violation re: PRD.md edit

**File:line:** `coordination/MEMORIAL.md:2611` (VIOLATION self-write)

The Implementer wrote a VIOLATION entry for editing `coordination/PRD.md` before adding it
to the spec § 4 allowed-set. The self-classification ("not a HALT-condition because PRD.md
is not in test/ directory") cites the REINFORCED 2026-05-17 absolute-anti-scope rule.

The Reviewer accepts the self-classification as accurate (the REINFORCED 2026-05-17 rule
indeed scopes to test/ paths). The retroactive spec amendment + transparent VIOLATION entry
honor the audit-trail discipline.

---

### OBS-3 — Q-R25-SPEC.md amendment block placement is "in § 3 anti-scope" rather than at the relevant AC

**File:line:** `coordination/specs/Q-R25-SPEC.md:272` (R32 amendment block sits at end of
§ 3 anti-scope section)

The R32 amendment for R25 MAJOR-2 ("DIAGNOSTIC-R25-ac12-tolerance.md as 8th allowed-set entry")
is appended to the END of § 3 rather than amending the actual 7-entry ALLOWED_SET list higher
in § 3 (where the list is at `:251` or so). A future reader of § 3 will see the 7-entry list,
not realize that R32 amended it to 8 effective entries until they reach the amendment block at
`:272`. Forensic readability could be improved by either inline-strikethrough on the original
"7-entry" claim or a forward pointer at the original list site.

---

### OBS-4 — Implementer chose Option B (relax docstring) over Option A (tighten impl) for R26 MINOR-2

**File:line:** `engine/topology/common-mode-attribution.ts:65-72`;
`coordination/PHASE-2-SLICE-3-CLOSE-WALK.md:146-156`

The Implementer's disposition for R26 MINOR-2 was to relax the docstring rather than tighten
the implementation. The close-walk § 4 table records this as "PARTIALLY-CLOSED (docstring
relaxed at R32; impl alignment deferred to WU-06 consumer context)". The choice is defensible
— tightening the impl in isolation (without a consumer that exercises distinct member-shard
aggregation) would be speculative — but the "deferred to WU-06 consumer context" is a
forward-flag without an explicit WU-06-scope entry in any committed plan; SLICE 4 entry is
also HARD-STOPPED per overnight authority.

Observation, not action-required. Just flagging that "deferred to WU-06" needs a planning
artifact to ensure the deferral actually fires when SLICE 4 work resumes.

---

## § 3 Right-reasons audit (3 tests)

### Test 1: AC-R32-3 — "Q-R25-SPEC.md AC-R25-14 reflects corrected baseline 229/228/1"

**Spec requirement:** R25 MAJOR-1 amendment — correct AC-R25-14 from 229/0 to 229/228/1.

**Self-confirming check:** Test reads `Q-R25-SPEC.md`, regex-extracts the AC-R25-14 row,
asserts `.includes('228') || .includes('pass=228')`. The test does NOT re-implement spec
parsing or production logic; it only checks the spec text was updated. Pass condition is
externally-determined (the corrected count "228" comes from empirical R25 measurement, not
from R32 code).

**Verdict:** Not self-confirming. Trace to spec requirement intact.

### Test 2: AC-R32-10 — "common-mode-attribution.ts earliest_event_ts docstring aligned with impl"

**Spec requirement:** R26 MINOR-2 amendment — either tighten impl OR relax docstring.

**Self-confirming check:** Test asserts ABSENCE of the misleading phrase "one record per
distinct member shard, picking the earliest" in the file content. The test does NOT
re-implement docstring generation; it specifies the literal text that must NOT appear, and
that text was the pre-R32 docstring content (verifiable in `git show 45242f2:engine/topology/common-mode-attribution.ts`).

**Verdict:** Not self-confirming. The "what must be absent" text is externally-anchored to the
pre-R32 docstring. PASSES because the Implementer removed exactly that phrase.

**Edge note:** The test passes for either disposition (tighten impl OR relax docstring) — if
the impl had been tightened (and docstring left intact), the misleading phrase would still be
present and the test would FAIL. So the test is biased toward Option B. This is consistent
with the Implementer's chosen disposition but does not gate-keep Option A correctly.

### Test 3: AC-R32-15 — "q30 AC-R30-15 uses regex with /m flag or line anchor"

**Spec requirement:** R30 MINOR-1 fix — substitute regex assertion for substring `includes()`
in the A16/D4 wire-format invariant check.

**Self-confirming check:** Test asserts presence of (`/m` OR `test(` OR `.match(` OR
`assert.match`) AND absence of `.includes(`. The test prescribes both a positive and a
negative pattern — strictly stronger than typical R32 string-match ACs.

**Verdict:** Not self-confirming. The mutation test (revert to `includes()`) would correctly
flip the AC. Two-sided assertion is the right pattern; AC-R32-12 follows the same shape.

---

## § 4 Cross-cutting checks

### § 4.1 TDD discipline

Verified via `git log --oneline -8`:
- `7893bd7 feat(R32-red): Q-R32-SPEC + q32 close-walk tests (RED state)` — RED tests + spec
- `8e465cb feat(R32): SLICE 3 close-walk — Deliverables 1+2+3 (Wave 3 WU-05)` — GREEN
- `6466940 chore(R32): route to REVIEWER — coordination artifacts (chore-A)`
- `7f737d6 chore(R32-B): substitute chore-A SHA 6466940 into AC-R32-19/20 forward-protection`

Separate RED commit precedes GREEN commit (R23 IMPL MINOR-1 reinforcement satisfied). Audit-
tier-allowed bundling of spec + RED tests in one commit is acceptable per the audit-tier
protocol where the Implementer wears the Architect hat. **TDD discipline: PASS.**

### § 4.2 No-skip halt discipline

The Implementer claimed "No halt conditions fired this round" (`coordination/MEMORIAL.md:2602`).
Spec § 5 says "Note on tsc exit code discrepancy: Pre-flags predicted exit=2; empirical session-
start measurement is exit=0. No HALT required — exit=0 is strictly better than exit=2; no
false-compliance-attestation risk." This is correctly reasoned — false-compliance-attestation
fires when the AC is *stronger* than reality (claiming exit=0 when reality is exit=2), not the
other way around.

The PRD.md anti-scope-discovery-ordering self-VIOLATION (`MEMORIAL.md:2611`) discloses that
PRD.md was edited before being added to the spec's allowed-set. The Implementer correctly
classifies this as not-HALT-eligible (REINFORCED 2026-05-17 rule scopes to test/ paths) and
applies retroactive spec amendment. Marginal but defensible. **Halt discipline: PASS.**

### § 4.3 Anti-scope

Empirical verification: `git diff 45242f2..HEAD --name-only` produces exactly the 16 entries
in Q-R32-SPEC.md § 4 allowed-set. No paths outside the allowed-set.

Independently verified that NO modification of A12-restricted files:
- `engine/l0/counter-rate-transform.ts` — unchanged ✓
- `engine/topology/{slurm,k8s}-source.ts` — unchanged ✓
- `engine/topology-overlay.ts` — unchanged ✓
- `engine/core.ts` — unchanged ✓
- Pre-R25 test files (q01..q23, betting-e-process) — unchanged ✓

Modified files within the engine/* tree:
- `engine/topology/common-mode-attribution.ts` — only docstring at `:65-72` modified (no body
  change to BFS-on-undirected logic); confirms R26 MINOR-2 disposition was applied as a
  docstring-only edit.
- `engine/topology/nvlink-source.ts` — only `:131-135` modified (added 3 inline comment
  lines); constructor body unchanged.

**Anti-scope: PASS.**

---

## § 5 Grilling output (on this report, before routing)

- Every finding has a file:line reference? **YES.** Every MAJOR/MINOR/OBS entry above
  includes specific file:line evidence.
- Any AC marked PASS without actual verification? **NO.** Each PASS row in § 1 cites either a
  file:line (for content-binding ACs) or an independently-run command result (for
  binding-command ACs). AC-R32-17/18 marked RED with explicit "by design" disposition.
- Right-reasons audit completed for 3+ tests? **YES** — § 3 audits AC-R32-3, AC-R32-10,
  AC-R32-15 against spec traceability + self-confirming risk.
- Have I marked every place I assumed something the next role cannot verify? **YES.** Most
  notable assumption: the pre-R32 baseline `284/280/4` is trusted from the Implementer's
  session-start measurement, not re-run by me at SHA `45242f2`. This is a typical Reviewer
  assumption since re-running at baseline requires `.js` rebuild at that SHA.
- Have I confirmed no scope beyond the request was added? **YES.** Verified Reviewer wrote
  only this report file; no other file modifications were made.

**Independence note:** This Opus pass is one of two parallel hybrid Reviewer passes. The
Sonnet pass runs concurrently; the Merger consolidates both into `REVIEWER-REPORT-R32.md`.
This report does NOT update `coordination/NEXT-ROLE.md` or `coordination/MEMORIAL.md` per
hybrid-mode instructions.

---

## § 6 Verdict (Opus pass, advisory)

**0 CRITICAL.** 2 MAJOR (SCOPING-MEMO structural defect; recurrent assertion-weakness pattern
embedded in R32's own AC suite while it ratifies the rule against it). 4 MINOR. 4 OBS.

Final hybrid verdict is the Merger's call after consolidating with the Sonnet pass. Opus
recommendation absent merger conflict: **MERGE-READY** — MAJOR-1 and MAJOR-2 are real defects
but neither is a correctness/security/data-integrity blocker; both are documentation /
audit-trail concerns that a R33 Coordinator follow-up or a SLICE-4-entry priming round can
address cleanly. The substantive R32 work (close-walk doc, vendor-fungibility content, 13
cleanup items, hybrid-Reviewer wiring) is sound. R-E7 MITIGATED classification is supported
by the WU-03 evidence.
