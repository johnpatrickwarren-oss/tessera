# Q-R95-SPEC.md — Defunct AC Cleanup
**Round:** R95 | **Tier:** audit (Implementer wears Architect hat) | **Date:** 2026-05-22

---

## § 0. Pre-R95 empirical state (R91 MAJOR-4 verbatim discipline)

**Command run at R95 round-start SHA `e535a53`:**
```
node --test --test-reporter=tap test/*.test.js 2>&1 | grep '^not ok'
```

**Verbatim `not ok` enumeration (70 items):**
```
not ok 19 - Q1 AC-7 — every vendored-at-pin file is byte-identical to source modulo header
not ok 25 - Q1 AC-1/AC-2/AC-4 — every vendored file has the required header format
not ok 26 - Q1 AC-1/AC-2/AC-4 — every vendored file references the expected pinned SHA
not ok 191 - AC-R18-7: Inherited Addition #25 D5 — group_id format retained at engine/verdict-groups.ts
not ok 192 - AC-R18-8: Inherited Addition #26 D4 — TopologyCandidate.correlational_not_causal literal true type retained
not ok 193 - AC-R18-9: All 40 vendored files retain SHA pin 5a72371 in first-line header
not ok 205 - AC-R20-15: engine/verdict-groups.ts first-line SHA pin preserved; annotation block present
not ok 227 - AC-R23-10: engine/verdict-groups.ts preserves Addition #25 D5 group_id format
not ok 228 - AC-R23-11: engine/types/verdict.ts preserves Addition #26 D4 correlational_not_causal: true
not ok 229 - AC-R23-12: vendored .ts file count === 40 and each has SHA-pin header
not ok 266 - AC-R29-10 / A16 preservation — k8s-source.ts contains zero occurrences of correlational_not_causal
not ok 284 - AC-R30-15: A16 preservation — verdict.ts retains correlational_not_causal: true literal
not ok 295 - AC-R32-10: common-mode-attribution.ts earliest_event_ts docstring aligned with impl
not ok 301 - AC-R32-16: nvlink-source.ts constructor dead-code at :133-134 has comment OR third operand removed
not ok 315 - AC-R34-10: correlational_not_causal: true declaration regex /m on event-conditional-attribution.ts
not ok 317 - AC-R34-12: correlational_not_causal: false absent from all engine/events/*.ts files
not ok 321 - AC-R34-16: engine/types/config.ts has Delta 5 header entry and freeze_hook_enabled field
not ok 338 - AC-R36-13: common-mode-attribution.ts computes event_ts per distinct member_shard
not ok 344 - AC-R36-19: CLAUDE-ARCHITECT.md has 3 new REINFORCED 2026-05-18 entries from STAGED Item 5
not ok 346 - AC-R36-21: CLAUDE-IMPLEMENTER.md has ≤30 distinct REINFORCED block entries after MR-2
not ok 350 - AC-R36-25: correlational_not_causal is literal type true at all emit sites
not ok 354 - AC-R38-2: earliest_event_ts and latest_event_ts docstrings describe per-distinct-shard semantics
not ok 370 - AC-R53-12: A16 — verdict.ts retains 'correlational_not_causal: true' literal
not ok 383 - AC-R56-12: A16 — verdict.ts retains 'correlational_not_causal: true' literal
not ok 395 - AC-R58-11: A16 — verdict.ts retains 'correlational_not_causal: true' literal
not ok 398 - AC-R62-2: feed-contract.ts + event-contract.ts exist with exported interfaces
not ok 399 - AC-R62-3: README.md contains exactly 4 anchored section headers
not ok 407 - AC-R62-13: engine/types/verdict.ts retains correlational_not_causal:true literal (A16 defensive)
not ok 408 - AC-R62-14: feed-contract.ts propagates correlational_not_causal:true literal (A16)
not ok 409 - R65 WU-Phase3-3B Tessera→DS feed adapter
not ok 410 - R66 WU-Phase3-3C DS→Tessera event consumer + freeze-hook factory
not ok 519 - AC-R77-14: frozen engine + tools + scripts surfaces byte-identical to round-start
not ok 522 - AC-R77-17: anti-scope diff round-start..HEAD ⊆ ALLOWED_SET
not ok 535 - AC-R78-13: R77 detector-envelope outputs byte-identical to round-start
not ok 536 - AC-R78-14: anti-scope diff round-start..HEAD ⊆ ALLOWED_SET
not ok 544 - AC-R79-8: per_window_detectors has 5 family keys; family_a non-null iff "A" in detector_families
not ok 550 - AC-R79-14: anti-scope diff c87bdfe..HEAD ⊆ ALLOWED_SET
not ok 564 - AC-R80-14: git diff from round-start to HEAD contains only ALLOWED files
not ok 578 - AC-R81-14: git diff from round-start to HEAD contains only ALLOWED files
not ok 583 - AC-R82-5: engine/topology-overlay.ts removed top-level node:crypto static import
not ok 589 - AC-R82-11: pnpm build:browser is invokable and idempotent
not ok 592 - AC-R82-14: git diff round-start..HEAD <= ALLOWED_SET
not ok 604 - AC-R83-12: btnRun click handler console.logs controlState (R83 placeholder)
not ok 607 - AC-R83-15: git diff round-start..HEAD ⊆ ALLOWED_SET
not ok 624 - AC-R84-16: git diff round-start..HEAD ⊆ ALLOWED_SET
not ok 644 - AC-R85-19: git diff round-start..HEAD ⊆ ALLOWED_SET
not ok 665 - AC-R89-5: CLAUDE-IMPLEMENTER.md has ≤30 REINFORCED block entries after R89 folding (AC-R36-21 FLIP)
not ok 668 - AC-R89-8: active NEXT-ROLE.md preserves first 126 lines (R89 directive block) byte-identical
not ok 669 - AC-R90-1: engine/package.json exists and parses as JSON with required top-level keys
not ok 670 - AC-R90-2: engine/package.json name === "@johnpatrickwarren-oss/deploysignal-engine"
not ok 671 - AC-R90-3: engine/package.json version === "0.1.0-pre" and license === "Apache-2.0"
not ok 672 - AC-R90-4: engine/package.json exports map includes the prescribed subpath enumeration
not ok 673 - AC-R90-5: engine/package.json repository.directory === "engine"
not ok 674 - AC-R90-6: root tsconfig.json outDir === "engine/dist" (changed from "dist/engine")
not ok 675 - AC-R90-7: engine build artifact present at engine/dist with sentinel files emitted
not ok 676 - AC-R90-8: pnpm pack from engine/ produces the expected tarball (run-on-demand)
not ok 677 - AC-R90-9: tarball contains compiled engine output AND excludes test/coordination/tools
not ok 678 - AC-R90-10: engine/README.md exists and contains expected sections
not ok 680 - AC-R90-12: root package.json has new pack:engine script and existing scripts unchanged
not ok 681 - AC-R90-13: anti-scope diff round-start..HEAD ⊆ ALLOWED_SET
not ok 682 - AC-R90-14: backwards-compat — engine algorithm files unchanged byte-identical against round-start
not ok 685 - AC-R91-3: tsconfig.json has compilerOptions.paths entries for @johnpatrickwarren-oss/deploysignal-engine
not ok 686 - AC-R91-4: root package.json dependencies includes @johnpatrickwarren-oss/deploysignal-engine: file:./engine
not ok 687 - AC-R91-5: root package.json scripts.pretest === "tsc && tsc -p tsconfig.test.json"
not ok 691 - AC-R91-9: engine/dist/ contains the 5 representative resolution targets as .js
not ok 694 - AC-R91-12: anti-scope diff round-start..HEAD ⊆ ALLOWED_SET
not ok 695 - AC-R91-13: engine/*.ts (algorithm + types + barrel) byte-identical to ROUND_START_SHA
not ok 696 - AC-R91-14: engine/package.json + engine/README.md byte-identical to ROUND_START_SHA (R90 deliverables forward-protected)
not ok 703 - AC-R93-7: anti-scope diff fe74c64..HEAD ⊆ ALLOWED_SET
not ok 715 - AC-R94-11: anti-scope diff round-start..HEAD ⊆ ALLOWED_SET
```

**Suite summary:** tests=758, pass=679, fail=75, skip=4

**Cross-reference against DIAGNOSTIC-R94-engine-source-tests.md:**

The DIAGNOSTIC categorized 67 `not ok` lines at R94-close. Current pre-R95 has 70 `not ok` lines — 3 additional failures since R94 close:
- `not ok 346 - AC-R36-21` — CLAUDE-IMPLEMENTER.md now has >30 REINFORCED entries (R94 MU added one); **new carry-forward, NOT defunct**
- `not ok 665 - AC-R89-5` — same >30 threshold; **new carry-forward, NOT defunct**
- `not ok 715 - AC-R94-11` — R94 ALLOWED_REGEX does not include CLAUDE-IMPLEMENTER.md (modified by R94 MU commits d26998f/379ff9a); **Category D extended, DELETE**

The 20 pre-R94 carry-forward items confirmed present (unchanged from DIAGNOSTIC): Q1 AC-7, R36-19, R65, R66, R77-14, R77-17, R78-13, R78-14, R79-8, R79-14, R80-14, R81-14, R82-14, R83-12, R83-15, R84-16, R85-19, R89-8, R90-13, R91-12.

---

## § 1. Motivation

R94 deleted Tessera's local `engine/` subdirectory (extracted to `johnpatrickwarren-oss/deploysignal-engine`, tagged `v0.1.0-pre`). This caused ~51 historical test assertions to flip PASS→FAIL with ENOENT — they read engine/*.ts source files directly from the Tessera worktree, which no longer exist by design. These ACs verified the pre-extraction state of Tessera's vendored engine copy. Post-extraction they are structurally defunct: the artifact they guarded (local engine/*.ts files) has been superseded by the external repo.

This round removes the defunct AC blocks, restoring the fail-baseline noise floor from ~75 to ~27.

---

## § 2. Brainstorm

### Approach A: Mass deletion (CHOSEN)
Remove all defunct test() blocks. Leave surrounding (non-defunct) ACs byte-identical. Add R95 removal comments adjacent to each deleted block.

**Strengths:** Clean, permanent, gives accurate signal. Restores fail-floor. Each deletion is mechanical — DIAGNOSTIC pre-enumerated every AC ID.
**Weaknesses:** Touches 19 test files; error-prone if wrong AC accidentally deleted.
**Risks:** Over-deletion (removing an AC that is NOT defunct); under-deletion (leaving a defunct AC behind).
**Mitigates via:** Per-file cite-then-walk (see § 4 table), Reviewer cold-eye cross-verification against this spec's §4.

### Approach B: Skip-with-comment (REJECTED)
Replace failing test body with `t.skip('defunct post-R94 engine extraction')`. Keep test() declarations.

**Rejected because:** Skipped tests are still counted in the suite (as `skip`), not eliminated from `fail`. The fail count would not improve; only the failure mode changes from ENOENT error to skip. This does not achieve the stated goal (restore noise floor). Also creates misleading "pending" semantics for tests that are permanently obsolete, not temporarily suspended.

### Approach C: Redirect to node_modules dist/
Update Category A tests to read compiled .js from `node_modules/@johnpatrickwarren-oss/deploysignal-engine/dist/` instead of engine/*.ts source.

**Rejected because:** The ACs verify TypeScript source properties (SHA-pin headers, literal type declarations, docstring content). These properties are not present in compiled .js output — the dist/ directory contains transpiled JavaScript, not TypeScript source. Redirecting would require rewriting the assertions (not just the path), which is substantive scope beyond R95. Also, the entire value of these checks was as vendoring integrity guards for the local copy; that governance responsibility has moved to the engine repo.

**Selection rationale:** Approach A is the structurally honest outcome. The deleted ACs were meaningful guards for a state that no longer exists. Their removal is documentation of design evolution, not information loss.

---

## § 3. Design sketch

**Component inventory:**

| Component | Action |
|---|---|
| 19 existing test files | DELETE defunct AC blocks (§ 4 enumerates per-file) |
| test/q94-engine-repo-extraction.test.ts | Also DELETE vacuous AC-R94-9 + AC-R94-10 (R94 Reviewer MAJOR-1+2) |
| test/q95-defunct-ac-cleanup.test.ts | CREATE (new, 7 ACs) |
| templates/SPEC-AUTHORING-CHECKLIST.md | CREATE (R94 MAJOR-3 hard-limit gate; R91 MAJOR-4 verbatim fail-set gate) |
| coordination/VENDORING-MANIFEST.md | APPEND R95 header note only |
| coordination/specs/Q-R95-{SPEC,SPEC-AUDIT,EMPIRICAL.sh} | CREATE |
| coordination/MEMORIAL.md | APPEND (MU role, post-round) |
| coordination/NEXT-ROLE.md | UPDATE (routing + R94 MAJOR-4 flag preserved) |

**Integration points:**

1. Test runner (`node --test test/*.test.js`): each deleted block removes one failing test; each q95 AC adds one passing test. Net: fail count drops ~48; pass count changes ±.
2. TypeScript compiler (`pnpm exec tsc -p tsconfig.test.json`): no production code changes; only test files modified. Typecheck must remain at exit 0.
3. Anti-scope guard (`ALLOWED_REGEX` in q95 + EMPIRICAL.sh Block 1): verifies only R95-prescribed paths are in the diff.
4. SPEC-AUTHORING-CHECKLIST.md: new artifact; must be referenced by q95 AC-R95-6.
5. NEXT-ROLE.md: R94 MAJOR-4 flag preserved verbatim; q95 AC-R95-7 verifies it.

**Failure modes:**

- Over-deletion: accidentally delete a non-defunct AC → that AC's test disappears silently; Reviewer cross-verifies §4 table.
- Under-deletion: miss a defunct AC → one extra `not ok` remains; Reviewer cold-eye catches vs §4 count.
- Stale carry-forward: accidentally touch R90-13 or R91-12 (anti-scope ACs that must STAY) → spec §4 marks these KEEP.
- SPEC-AUTHORING-CHECKLIST.md path mismatch: creates file but AC-R95-6 uses wrong path → grilling catches.

---

## § 4. Per-file AC enumeration with dispositions

R95 ROUND_START_SHA: `e535a53` (chore(R95 directive) commit)

Legend: DELETE = remove test block + add R95 comment; KEEP = not touched.

### Category A — Historical engine/*.ts source-file ACs

All Category A ACs read engine/*.ts files that no longer exist in the Tessera worktree post-R94. Disposition: **DELETE**.

**test/q01-vendoring-coverage.test.ts** (96 lines)

| AC ID | Line | Disposition | Reason |
|---|---|---|---|
| Q1 AC-7 (vendored-at-pin byte-identical) | (carry-forward) | **KEEP** | Pre-R94 carry-forward; not in Category A |
| Q1 AC-1/AC-2/AC-4 (header format) | 63 | **DELETE** | Reads engine/*.ts source files → ENOENT |
| Q1 AC-1/AC-2/AC-4 (pinned SHA) | 70 | **DELETE** | Reads engine/*.ts source files → ENOENT |

Note: Q1 AC-5 (VENDORING-MANIFEST.md enumeration, line 77) is NOT in the not-ok list — **KEEP**.

**test/q18-phase2-slice1-topology-substrate.test.ts** (170 lines)

| AC ID | Line | Disposition | Reason |
|---|---|---|---|
| AC-R18-7 | 109 | **DELETE** | Reads engine/verdict-groups.ts → ENOENT |
| AC-R18-8 | 114 | **DELETE** | Reads engine/types/verdict.ts → ENOENT |
| AC-R18-9 | 119 | **DELETE** | Reads 40 vendored engine/*.ts files → ENOENT |

**test/q20-verdict-grouper-cluster-event-scope.test.ts** (214 lines)

| AC ID | Line | Disposition | Reason |
|---|---|---|---|
| AC-R20-15 | 207 | **DELETE** | Reads engine/verdict-groups.ts → ENOENT |

**test/q23-hardware-topology-source.test.ts** (193 lines)

| AC ID | Line | Disposition | Reason |
|---|---|---|---|
| AC-R23-10 | 134 | **DELETE** | Reads engine/verdict-groups.ts → ENOENT |
| AC-R23-11 | 140 | **DELETE** | Reads engine/types/verdict.ts → ENOENT |
| AC-R23-12 | 146 | **DELETE** | Reads 40 vendored engine/*.ts files → ENOENT |

**test/q29-k8s-adapter.test.ts** (328 lines)

| AC ID | Line | Disposition | Reason |
|---|---|---|---|
| AC-R29-10 | 208 | **DELETE** | Reads engine/topology/k8s-source.ts → ENOENT |

**test/q30-nvlink-adapter.test.ts** (235 lines)

| AC ID | Line | Disposition | Reason |
|---|---|---|---|
| AC-R30-15 | 204 | **DELETE** | Reads engine/types/verdict.ts → ENOENT |

**test/q32-slice3-close-walk.test.ts** (343 lines)

| AC ID | Line | Disposition | Reason |
|---|---|---|---|
| AC-R32-10 | 136 | **DELETE** | Reads engine/events/common-mode-attribution.ts → ENOENT |
| AC-R32-16 | 231 | **DELETE** | Reads engine/topology/nvlink-source.ts → ENOENT |

**test/q34-event-conditional-attribution.test.ts** (406 lines)

| AC ID | Line | Disposition | Reason |
|---|---|---|---|
| AC-R34-10 | 167 | **DELETE** | Reads engine/events/event-conditional-attribution.ts → ENOENT |
| AC-R34-12 | 189 | **DELETE** | Reads engine/events/*.ts files → ENOENT |
| AC-R34-16 | 250 | **DELETE** | Reads engine/types/config.ts → ENOENT |

**test/q36-phase2-close-walk.test.ts** (655 lines)

| AC ID | Line | Disposition | Reason |
|---|---|---|---|
| AC-R36-13 | 277 | **DELETE** | Reads engine/events/common-mode-attribution.ts → ENOENT |
| AC-R36-19 | (not defunct) | **KEEP** | Pre-R94 carry-forward (CLAUDE-ARCHITECT.md check, different failure reason) |
| AC-R36-21 | (not defunct) | **KEEP** | Carry-forward (CLAUDE-IMPLEMENTER.md >30 entries) |
| AC-R36-25 | 550 | **DELETE** | Reads engine/events/*.ts files → ENOENT |

**test/q38-verification.test.ts** (137 lines)

| AC ID | Line | Disposition | Reason |
|---|---|---|---|
| AC-R38-2 | 82 | **DELETE** | Reads engine/events/common-mode-attribution.ts → ENOENT |

**test/q53-neuron-adapter.test.ts** (204 lines)

| AC ID | Line | Disposition | Reason |
|---|---|---|---|
| AC-R53-12 | 171 | **DELETE** | Reads engine/types/verdict.ts → ENOENT |

**test/q56-tpu-adapter.test.ts** (216 lines)

| AC ID | Line | Disposition | Reason |
|---|---|---|---|
| AC-R56-12 | 183 | **DELETE** | Reads engine/types/verdict.ts → ENOENT |

**test/q58-live-fetch-interface.test.ts** (210 lines)

| AC ID | Line | Disposition | Reason |
|---|---|---|---|
| AC-R58-11 | 173 | **DELETE** | Reads engine/types/verdict.ts → ENOENT |

**test/q62-ds-integration-contract.test.ts** (268 lines)

| AC ID | Line | Disposition | Reason |
|---|---|---|---|
| AC-R62-2 | 39 | **DELETE** | Reads engine/ds-integration/*.ts → ENOENT |
| AC-R62-3 | 53 | **DELETE** | Reads engine/README.md → ENOENT |
| AC-R62-13 | 241 | **DELETE** | Reads engine/types/verdict.ts → ENOENT |
| AC-R62-14 | 255 | **DELETE** | Reads engine/ds-integration/*.ts → ENOENT |

**test/q82-engine-browser-bundle.test.ts** (215 lines)

| AC ID | Line | Disposition | Reason |
|---|---|---|---|
| AC-R82-5 | 71 | **DELETE** | Reads engine/topology/topology-overlay.ts → ENOENT |
| AC-R82-11 | 151 | **DELETE** | Invokes `pnpm build:browser` which reads engine/ → fails |

**Category A total: 28 DELETE**

---

### Category B — R90 engine-package ACs

All Category B ACs check `engine/package.json`, `engine/dist/`, or `engine/README.md` at their Tessera-local path, which was removed by R94. Disposition: **DELETE** (except R90-13 anti-scope diff which is carry-forward).

**test/q90-engine-package-extract.test.ts** (195 lines)

| AC ID | Line | Disposition | Reason |
|---|---|---|---|
| AC-R90-1 | 20 | **DELETE** | Reads engine/package.json → ENOENT |
| AC-R90-2 | 30 | **DELETE** | Reads engine/package.json → ENOENT |
| AC-R90-3 | 35 | **DELETE** | Reads engine/package.json → ENOENT |
| AC-R90-4 | 41 | **DELETE** | Reads engine/package.json → ENOENT |
| AC-R90-5 | 63 | **DELETE** | Reads engine/package.json → ENOENT |
| AC-R90-6 | 70 | **DELETE** | Reads tsconfig.json for outDir (pre-R94 value) |
| AC-R90-7 | 76 | **DELETE** | Reads engine/dist/ → ENOENT |
| AC-R90-8 | 96 | **DELETE** | Runs `pnpm pack` from engine/ → fails |
| AC-R90-9 | 109 | **DELETE** | Reads engine/ tarball → ENOENT |
| AC-R90-10 | 135 | **DELETE** | Reads engine/README.md → ENOENT |
| AC-R90-11 | 146 | **DELETE** | Reads VENDORING-MANIFEST.md for R90 note — currently PASSING but content now superseded by R95 note; delete to avoid confusion |
| AC-R90-12 | 156 | **DELETE** | Reads package.json scripts.pack:engine (removed by R94) |
| AC-R90-13 | 166 | **KEEP** | Pre-R94 carry-forward anti-scope diff; failure reason is R94 diff; must stay |
| AC-R90-14 | 176 | **DELETE** | Reads engine/*.ts byte-identity → ENOENT |

**Category B total: 13 DELETE, 1 KEEP (R90-13)**

---

### Category C — R91 config-state ACs

Category C ACs check the pre-R94 configuration state (paths mapping, file:./engine dep, old pretest script, engine/dist/ contents, engine/*.ts byte-identity). R94 intentionally changed all of these. Disposition: **DELETE** (except R91-12 anti-scope diff which is carry-forward).

**test/q91-engine-package-consumption.test.ts** (210 lines)

| AC ID | Line | Disposition | Reason |
|---|---|---|---|
| AC-R91-3 | 42 | **DELETE** | Checks tsconfig.json paths (removed by R94) |
| AC-R91-4 | 60 | **DELETE** | Checks package.json dep === file:./engine (changed to github:... by R94) |
| AC-R91-5 | 71 | **DELETE** | Checks scripts.pretest === old compound form (changed by R94) |
| AC-R91-9 | 125 | **DELETE** | Reads engine/dist/ → ENOENT |
| AC-R91-12 | 172 | **KEEP** | Pre-R94 carry-forward anti-scope diff; must stay |
| AC-R91-13 | 182 | **DELETE** | Reads engine/*.ts byte-identity → ENOENT |
| AC-R91-14 | 204 | **DELETE** | Reads engine/package.json + engine/README.md → ENOENT |

**Category C total: 6 DELETE, 1 KEEP (R91-12)**

---

### Category D — Prior-round anti-scope ACs that include R94 changes (extended)

These ACs use `git diff <round-start>..HEAD` to check their round's diff ⊆ allowed-set. R94's changes (engine/ deletion, package.json, tsconfig.*, CLAUDE-IMPLEMENTER.md) are not in those older allowed-sets, so these ACs fail.

**test/q93-slice3-close-hygiene.test.ts** (114 lines)

| AC ID | Line | Disposition | Reason |
|---|---|---|---|
| AC-R93-7 | 87 | **DELETE** | R93 ALLOWED_SET doesn't include R94's diff paths |

**test/q94-engine-repo-extraction.test.ts** (160 lines)

| AC ID | Line | Disposition | Reason |
|---|---|---|---|
| AC-R94-9 | 99 | **DELETE** | Vacuous per R94 Reviewer MAJOR-1: checks spec file for literal strings, not actual runner output |
| AC-R94-10 | 110 | **DELETE** | Vacuous per R94 Reviewer MAJOR-2: checks EMPIRICAL.sh for literal string, not actual typecheck |
| AC-R94-11 | 116 | **DELETE** | R94 ALLOWED_REGEX doesn't include CLAUDE-IMPLEMENTER.md (modified by R94 MU commits d26998f/379ff9a) |

**Category D total: 4 DELETE**

---

### Summary table

| Category | Files | DELETE | KEEP |
|---|---|---|---|
| A (engine src) | q01,q18,q20,q23,q29,q30,q32,q34,q36,q38,q53,q56,q58,q62,q82 | 28 | 0 |
| B (R90 pkg) | q90 | 13 | 1 (R90-13) |
| C (R91 cfg) | q91 | 6 | 1 (R91-12) |
| D (anti-scope) | q93, q94 | 4 | 0 |
| **Total** | **19 files** | **51** | **2** |

---

## § 5. ALLOWED_SET (R95)

Round start SHA: `e535a53`

Exact enumeration of files R95 may modify:

```
coordination/MEMORIAL.md
coordination/NEXT-ROLE.md
coordination/VENDORING-MANIFEST.md
coordination/specs/Q-R95-SPEC.md
coordination/specs/Q-R95-SPEC-AUDIT.md
coordination/specs/Q-R95-EMPIRICAL.sh
coordination/reviews/REVIEWER-REPORT-R95.md
coordination/logs/ROUND-R95-*.md  (wildcard)
coordination/diagnostics/DIAGNOSTIC-R95-*.md  (wildcard, if any halt)
templates/SPEC-AUTHORING-CHECKLIST.md
test/q01-vendoring-coverage.test.ts
test/q18-phase2-slice1-topology-substrate.test.ts
test/q20-verdict-grouper-cluster-event-scope.test.ts
test/q23-hardware-topology-source.test.ts
test/q29-k8s-adapter.test.ts
test/q30-nvlink-adapter.test.ts
test/q32-slice3-close-walk.test.ts
test/q34-event-conditional-attribution.test.ts
test/q36-phase2-close-walk.test.ts
test/q38-verification.test.ts
test/q53-neuron-adapter.test.ts
test/q56-tpu-adapter.test.ts
test/q58-live-fetch-interface.test.ts
test/q62-ds-integration-contract.test.ts
test/q82-engine-browser-bundle.test.ts
test/q90-engine-package-extract.test.ts
test/q91-engine-package-consumption.test.ts
test/q93-slice3-close-hygiene.test.ts
test/q94-engine-repo-extraction.test.ts
test/q95-defunct-ac-cleanup.test.ts
```

ALLOWED_REGEX (JavaScript):
```
^(coordination/MEMORIAL\.md|coordination/NEXT-ROLE\.md|coordination/VENDORING-MANIFEST\.md|coordination/specs/Q-R95-(SPEC|SPEC-AUDIT|EMPIRICAL)\.(md|sh)|coordination/reviews/REVIEWER-REPORT-R95\.md|coordination/logs/ROUND-R95-[A-Z0-9-]+\.md|coordination/diagnostics/DIAGNOSTIC-R95-[a-z0-9-]+\.md|templates/SPEC-AUTHORING-CHECKLIST\.md|test/q01-vendoring-coverage\.test\.ts|test/q18-phase2-slice1-topology-substrate\.test\.ts|test/q20-verdict-grouper-cluster-event-scope\.test\.ts|test/q23-hardware-topology-source\.test\.ts|test/q29-k8s-adapter\.test\.ts|test/q30-nvlink-adapter\.test\.ts|test/q32-slice3-close-walk\.test\.ts|test/q34-event-conditional-attribution\.test\.ts|test/q36-phase2-close-walk\.test\.ts|test/q38-verification\.test\.ts|test/q53-neuron-adapter\.test\.ts|test/q56-tpu-adapter\.test\.ts|test/q58-live-fetch-interface\.test\.ts|test/q62-ds-integration-contract\.test\.ts|test/q82-engine-browser-bundle\.test\.ts|test/q90-engine-package-extract\.test\.ts|test/q91-engine-package-consumption\.test\.ts|test/q93-slice3-close-hygiene\.test\.ts|test/q94-engine-repo-extraction\.test\.ts|test/q95-defunct-ac-cleanup\.test\.ts)$
```

---

## § 6. ACs for test/q95-defunct-ac-cleanup.test.ts

**Given** the R95 chore-A commit has been applied  
**When** the q95 test file is evaluated  
**Then** each AC below passes

### AC-R95-1: Category A defunct ACs absent from 5 representative test files

Given R95 deleted Category A ACs, when grepping for their test() declaration strings (using the `test('AC-ID:` prefix pattern which uniquely identifies the test declaration), then each returns count 0:
- `test('AC-R18-7:` absent from test/q18-phase2-slice1-topology-substrate.ts
- `test('AC-R20-15:` absent from test/q20-verdict-grouper-cluster-event-scope.ts
- `test('AC-R29-10` absent from test/q29-k8s-adapter.ts (uses `/` separator, pattern `test('AC-R29-10`)
- `test('AC-R30-15:` absent from test/q30-nvlink-adapter.ts
- `test('AC-R38-2:` absent from test/q38-verification.ts

### AC-R95-2: Category B+C defunct ACs absent from q90 and q91

Given R95 deleted Category B and C ACs, when grepping for test() declaration strings, then:
- `test('AC-R90-1:` absent from test/q90-engine-package-extract.ts
- `test('AC-R90-12:` absent from test/q90-engine-package-extract.ts
- `test('AC-R91-3:` absent from test/q91-engine-package-consumption.ts
- `test('AC-R91-5:` absent from test/q91-engine-package-consumption.ts

### AC-R95-3: Category D defunct ACs absent from q93 and q94

Given R95 deleted Category D ACs, when grepping, then:
- `test('AC-R93-7:` absent from test/q93-slice3-close-hygiene.ts
- `test('AC-R94-11:` absent from test/q94-engine-repo-extraction.ts
- `test('AC-R94-9:` absent from test/q94-engine-repo-extraction.ts (vacuous AC deleted)
- `test('AC-R94-10:` absent from test/q94-engine-repo-extraction.ts (vacuous AC deleted)

### AC-R95-4: Carry-forward anti-scope ACs still present in q90 and q91

Given R95 must NOT over-delete, when grepping for retained ACs, then:
- `test('AC-R90-13:` present in test/q90-engine-package-extract.ts (count ≥ 1)
- `test('AC-R91-12:` present in test/q91-engine-package-consumption.ts (count ≥ 1)

### AC-R95-5: VENDORING-MANIFEST.md has R95 cleanup header note

Given R95 deliverable 6, when reading coordination/VENDORING-MANIFEST.md, then:
- File matches `/^## R95 defunct AC cleanup note/m`

### AC-R95-6: templates/SPEC-AUTHORING-CHECKLIST.md contains R94 MAJOR-3 hard-limit gate text

Given R95 deliverable 4, when reading templates/SPEC-AUTHORING-CHECKLIST.md, then:
- File contains: `"transparent disclosure of hard-limit anti-scope deviation does NOT substitute for HALT+DIAGNOSTIC+ESCALATE"`

### AC-R95-7: coordination/NEXT-ROLE.md preserves R94 MAJOR-4 operator-decision flag

Given R95 deliverable 5 (preserve R94 MAJOR-4 flag for operator), when reading coordination/NEXT-ROLE.md, then:
- File contains: `"tag immutable; options: live-with vs delete+re-tag"`

---

## § 7. Anti-scope hard limits (verbatim from R95 directive)

- **NO modification of any non-defunct AC** — every modified AC must be in §4 DELETE list
- **NO modification of `engine/` content** — local `engine/` doesn't exist; external repo not touched
- **NO modification of Tessera's R91-migrated import paths** (`@johnpatrickwarren-oss/deploysignal-engine/...`)
- **NO modification of Tessera root package.json or tsconfig.json or pnpm-lock.yaml** (R94 frozen)
- **NO modification of `tools/curate-baseline.ts` or any R88 deliverable** (frozen)
- **NO modification of R73-R94 substantive deliverables** beyond the defunct AC cleanup (frozen)
- **NO new external dependencies**
- **NO DS-side work** (PR #20 update is Coordinator-direct, separate)
- **NO modification of CLAUDE-*.md files beyond MU's normal REINFORCED appends** (R89 sustaining mechanism)
- **NO modification of `coordination/MEMORIAL-PHASE-*.md` shards** (R89 archival stands)
- **NO real-cluster; NO DS-repo modifications**
- **NO new tag operations on engine repo** (MAJOR-4 resolution is operator-decision, not R95 scope)

---

## § 8. Halt conditions

1. Q-R95-EMPIRICAL.sh non-zero exit at chore-A
2. `pnpm exec tsc -p tsconfig.test.json` non-zero exit
3. Test suite fail-count outside Architect-predicted post-cleanup band [24, 30]
4. ANY non-defunct AC accidentally deleted or modified — detect via per-file cite-then-walk diff against §4 table
5. ANY test file modified that is NOT in §5 ALLOWED_SET: HALT + DIAGNOSTIC
6. New external dependency required: HALT + DIAGNOSTIC + ESCALATE
7. R88-or-prior substantive deliverable modified beyond defunct AC removal: HALT + DIAGNOSTIC + ESCALATE
8. Any engine/ content modification: HALT + DIAGNOSTIC + ESCALATE
9. **R94-MAJOR-3-applied:** any hard-limit anti-scope deviation discovered at chore-A: HALT + DIAGNOSTIC + ESCALATE (NOT TD-disclosure-and-proceed)

---

## § 9. Predicted post-R95 state (R91 MAJOR-4 lesson: encode exact band)

**Derivation:**

| Metric | Pre-R95 | Change | Post-R95 |
|---|---|---|---|
| tests | 758 | −51 (deleted) +7 (q95) | ≈ 714 |
| pass | 679 | −3 (deleted passing: R90-11, R94-9, R94-10) +7 (q95) | ≈ 683 |
| fail | 75 | −48 (deleted failing ACs) | ≈ 27 |
| skip | 4 | 0 | 4 |

Deleted failing ACs: Category A (28) + Category B failing (12) + Category C (6) + Category D failing (2) = 48.  
Deleted passing ACs: R90-11 (1) + R94-9 (1) + R94-10 (1) = 3.

Check: 714 = 683 + 27 + 4 ✓

**Stochastic adjustment:** AC-R84-14 flips ±1 (measured empirically at ~25% rate). This can push fail to 28.

**Band:** fail ∈ [**24, 30**] (base 27 ± 3 for counting uncertainty + stochastic flake).

The EMPIRICAL.sh Block 7 encodes `EXPECTED_FAIL_MIN=24` and `EXPECTED_FAIL_MAX=30`.

---

## § 10. Acknowledged coverage gaps and open questions

**Coverage gap:** The q95 test file does not include a subprocess-based fail-count AC (unlike q94-9 which was vacuous and is being deleted). The fail-count band verification is handled exclusively by EMPIRICAL.sh Block 7. This is intentional: a subprocess-based fail-count AC in q95 would either (a) be vacuous when run via `node --test` (NODE_TEST_CONTEXT guard causes skip) — the exact defect we're removing from q94, or (b) require a custom recursion guard (`Q95_NO_RECURSE` env var) that adds complexity without proportional value. EMPIRICAL.sh Block 7 provides the authoritative count verification; q95's ACs verify structural correctness of the deletions (specific AC identifiers absent/present), which is orthogonal and non-vacuous.

**Open questions:** None. All design decisions resolved in this spec.

---

## § 11. Grilling self-check (pre-emit)

1. Every claim backed by empirical data: ✓ (§0 not-ok list run at round-start SHA; §4 line citations verified via grep)
2. Unstated assumptions: none detected
3. Scope beyond request: none (no AC modifications, no production code)
4. Next role (Reviewer) can act with zero clarifying questions: ✓ (§4 table is exhaustive; §5 ALLOWED_SET is enumerated; §6 ACs have exact Given/When/Then with specific markers)
5. Non-defunct ACs in §4 marked KEEP: verified (R90-13:166, R91-12:172)
6. R94-9/R94-10 disposition: DELETE justified (vacuous per R94 Reviewer MAJOR-1+2; EMPIRICAL.sh Block N provides substantive count check)
7. AC-R36-3 status: DROPPED at R93 (2026-05-21) — no carve-out update required for q95; confirmed via q36-phase2-close-walk.test.ts:71
