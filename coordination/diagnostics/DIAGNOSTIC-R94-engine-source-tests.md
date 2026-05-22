# DIAGNOSTIC-R94-engine-source-tests.md

**Round:** R94  
**Role:** IMPLEMENTER  
**Halt condition:** § 6.3 halt-11 + halt-9  
**Date:** 2026-05-21

---

## Spec claim (exact quotes)

From spec § 0.2 post-R94 prediction band table:
> "R94 delta: 0 (no carry-forward flip)"  
> "fail ∈ [20, 21]"

From spec § 0.1 analysis (last paragraph):
> "None of these flips PASS↔FAIL state at R94 chore-A (verified by inspection: each AC binds a path that R94 leaves un-newly-frozen — e.g., AC-R77-14 binds engine surfaces but they were already FAIL at R93). The substantive observation: R94 deletes ALL of engine/ AND modifies tsconfig.* + package.json — these were already in the diff window of every carry-forward anti-scope-diff AC. Engine deletion is a deeper modification but does not change the binary PASS/FAIL state of any already-FAIL AC."

---

## Reality

Full suite at current HEAD (post-Phase-B + Option A fix):

```
tests=758, pass=682, fail=72, skipped=4
```

**67 `not ok` lines observed** (5 additional fails are subtests counted separately by the runner). Verbatim `not ok` enumeration:

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
not ok 622 - AC-R84-14: worker.terminate() halts further message emission
not ok 624 - AC-R84-16: git diff round-start..HEAD ⊆ ALLOWED_SET
not ok 644 - AC-R85-19: git diff round-start..HEAD ⊆ ALLOWED_SET
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
```

---

## Root cause

**Pre-R94 carry-forward (expected):** 20 items from spec § 0.1 (confirmed in current list: Q1 AC-7, R36-19, R65, R66, R77-14, R77-17, R78-13, R78-14, R79-8, R79-14, R80-14, R81-14, R82-14, R83-12, R83-15, R84-16, R85-19, R89-8, R90-13, R91-12).

**Stochastic flake (within predicted band):** AC-R84-14 (1 item — predicted as ±1 band).

**Newly-failing (PASS→FAIL, triggering halt-11):** approximately 51 tests, grouped into four categories:

**Category A — Historical engine/*.ts source-file ACs (R01-R62):**  
Tests that read engine/*.ts files directly from the Tessera worktree to verify vendoring headers, SHA-pins, and specific field contents. These files were removed by `git rm -r engine/` in Phase B. The content is now only accessible via `node_modules/@johnpatrickwarren-oss/deploysignal-engine/dist/` (compiled .js, not .ts sources). Affected rounds: Q1, R18, R20, R23, R29, R30, R32, R34, R36, R38, R53, R56, R58, R62, R82.

**Category B — R90 engine-package ACs:**  
Tests that check `engine/package.json`, `engine/dist/`, and `engine/README.md` existence and content (AC-R90-1 through R90-12, R90-14). These were R90 deliverables that created the engine package structure. Post-R94 the package lives in the external repo; the local paths are gone.

**Category C — R91 configuration-state ACs:**  
Tests that check `tsconfig.json` still has `compilerOptions.paths` for the engine package (AC-R91-3), `package.json` dep is `file:./engine` (AC-R91-4), `pretest` is the old compound form (AC-R91-5), `engine/dist/` content (AC-R91-9), engine/*.ts byte-identical (AC-R91-13, R91-14). R94 intentionally changed all of these; the R91 tests verify the pre-R94 state.

**Category D — Prior-round anti-scope ACs that now include R94's changes:**  
AC-R93-7 checks `git diff fe74c64..HEAD ⊆ R93_ALLOWED_SET`. R94's changes (engine deletion, package.json, tsconfig.*, pnpm-lock.yaml) are not in R93's ALLOWED_SET, so this AC now fails.

**Why the Architect's prediction was wrong:**  
Spec § 0.1 final paragraph reasoned: "Engine deletion is a deeper modification but does not change the binary PASS/FAIL state of any already-FAIL AC." This was true for the already-failing ACs, but incorrectly assumed no PASSING ACs check the physical existence of engine/*.ts source files. Numerous historical ACs (Q1 through R91) were authored when engine/ was a local subdirectory and check its source files directly. These were PASSING at R93 (engine/ existed). Post-R94 (engine/ removed from Tessera), they fail with ENOENT on the source file paths.

---

## Options

**Option A: Accept newly-failing tests as permanent carry-forward.** These historical ACs are meaningfully defunct post-extraction — they verified the state of Tessera's local engine/ copy, which no longer exists by design. Update spec § 0 to document the enlarged carry-forward fail set (~72 tests instead of 20). No test files are modified. Downside: carry-forward count nearly quadruples; future rounds start from a larger baseline noise floor.

- *Consequence:* Q-R94-EMPIRICAL.sh Block 8 EXPECTED_FAIL would need to move from [20,21] to approximately [70,75] to reflect the new baseline. This requires Architect-authored spec amendment (prefix-continuity-invariant: Implementer cannot modify EMPIRICAL.sh).

**Option B: Expand R94 scope to delete or skip the ~51 newly-failing historical ACs.** Update/remove tests in Q1, R18, R20, R23, R29, R30, R32, R34, R36, R38, R53, R56, R58, R62, R82, R90, R91, R93 test files. Large scope expansion touching 15+ test files; requires operator authorization and ALLOWED_SET amendment. Restores fail count to ~21 (pre-R94 carry-forward + R84-14 flake).

- *Consequence:* R94 ALLOWED_SET must expand to include all modified test files; spec triad must be amended by Architect to add them.

**Option C: Accept R90/R91/R93 ACs as carry-forward only (partial Option A).** The R90-1 through R90-14, R91-3 through R91-14, and R93-7 failures are "forward-protection ACs for the pre-R94 state" — their failure post-R94 is structurally expected because R94 intentionally changes what they guard. Accept these ~20 as carry-forward. The Category A failures (historical vendoring checks) may require investigation into whether they can be tolerated long-term or need a follow-up cleanup round.

- *Consequence:* fail count ~41 (original 20 + ~20 R90/R91/R93 flips + ~1 flake). Still outside spec § 0.2 band. Would still require spec amendment to EMPIRICAL.sh Block 8.

**Option D: Empirically determine which newly-failing tests can be redirected to node_modules.** Some Category A tests check TypeScript source content (`.ts` files); those cannot be satisfied from `node_modules/@johnpatrickwarren-oss/deploysignal-engine/dist/*.js`. A targeted follow-up round could update these tests to read from the installed package's dist/ or to skip them with a documented reason. Intermediate state: proceed with Option A now, schedule a cleanup round (R95) to address the defunct vendoring ACs.

---

## Implementer recommendation

**Option A** (accept carry-forward + immediate Architect spec amendment to EMPIRICAL.sh Block 8) is the most structurally honest outcome — the historical ACs were valid guards for the pre-R94 state and are now defunct by design. Option B is also valid if the operator wants a clean fail floor immediately, but the scope is large.

The decision belongs to the operator. The Implementer cannot proceed to chore-A without operator resolution of which option to apply.
