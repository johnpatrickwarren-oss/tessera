# REVIEWER-REPORT-R90 — engine npm extract (Phase 5 SLICE 3 round 1)

**Reviewer session HEAD:** `7e9062b` (Implementer routing commit).
**Round-start SHA:** `65edb85` (R90 directive).
**Tier:** full.
**Verdict:** MERGE-READY (0 CRITICAL / 0 MAJOR / 4 MINOR / 3 OBS).
**Empirical baseline reproduced at Reviewer HEAD:**

- `bash coordination/specs/Q-R90-EMPIRICAL.sh` → exit 0; 9/9 blocks PASS.
- `node --test --test-reporter=tap test/q90-engine-package-extract.test.js` → 14 pass / 0 fail.
- `node --test --test-reporter=tap test/*.test.js` → tests=724 / pass=704 / fail=16 / skipped=4.
  - `fail=16` ∈ predicted band `[16,17]` (low end; AC-R84-14 not flaking this run).
  - `pass=704` ∈ predicted band `[702,707]`.
- `git diff 65edb85 HEAD --name-only` → 12 paths, all in ALLOWED_SET regex.
- Tarball at `engine/johnpatrickwarren-oss-deploysignal-engine-0.1.0-pre.tgz` (279 KB; 255 entries; no raw `.ts`; no `package/{test,coordination,tools,scripts,demos}/` entries).
- `engine/dist/` populated with 252 files (63 source × 4 outputs each).

---

## § 1. Per-AC verification table

| AC ID | Criterion (short) | Status | Evidence |
|---|---|---|---|
| AC-R90-1 | `engine/package.json` parses; required top-level keys present | PASS | `engine/package.json:1-57` — `name`, `version`, `description`, `license`, `main`, `types`, `files`, `repository`, `exports` all present. q90 test:20-28 ran green at Reviewer HEAD. |
| AC-R90-2 | name === `@johnpatrickwarren-oss/deploysignal-engine` | PASS | `engine/package.json:2`. |
| AC-R90-3 | version === `0.1.0-pre` AND license === `Apache-2.0` | PASS | `engine/package.json:3,5`. |
| AC-R90-4 | exports map includes prescribed subpaths + wildcards | PASS | `engine/package.json:21-56` — 16 exact-anchor subpaths + 8 wildcards all present. (Coverage gap: AC only checks 16+8 of the ~35 prescribed exports; see MINOR-2.) |
| AC-R90-5 | repository.directory === `engine`; url matches tessera | PASS | `engine/package.json:16-20`. |
| AC-R90-6 | tsconfig.json outDir === `engine/dist`; rootDir === `engine` | PASS | `tsconfig.json:8-9`. |
| AC-R90-7 | engine/dist sentinels exist (10 paths) | PASS | `find engine/dist -type f \| wc -l` = 252; all 10 sentinels present incl. `types/index.{js,d.ts}`, `topology-overlay.{js,d.ts}`, `detectors/betting-e-process.{js,d.ts}`, `ds-integration/index.js`, `fleet/e-bh.js`, `per-shard/runtime.js`, `l0/counter-rate-transform.js`. |
| AC-R90-8 | `pnpm pack` from engine/ produces named tarball | PASS | `engine/johnpatrickwarren-oss-deploysignal-engine-0.1.0-pre.tgz` (279 KB) exists; pnpm pack exit 0. |
| AC-R90-9 | tarball content gate (required + anti-content + no raw .ts) | PASS | `tar -tzf` reproduced at Reviewer HEAD: 255 entries; `package/dist/types/index.js`, `package/dist/topology-overlay.js`, `package/dist/detectors/betting-e-process.js`, `package/package.json`, `package/README.md` all present; no `package/{test,coordination,tools,scripts,demos}/`; no raw `.ts` (grep `\.ts$ \| grep -v \.d\.ts$` returns empty). |
| AC-R90-10 | engine/README.md has required section headers + git+ssh URL | PASS | `engine/README.md:1,7,17,31,24` — all 4 anchor patterns match. |
| AC-R90-11 | VENDORING-MANIFEST.md head has R90 markers | PASS | `coordination/VENDORING-MANIFEST.md:8-10` — R90, 2026-05-21, package name, engine/package.json all in head zone. |
| AC-R90-12 | root package.json has `pack:engine` + preserved sentinel keys | PASS | `package.json:31` adds `pack:engine`; all 12 sentinel keys (`build`, `curate-baseline`, `predemo`, `demo`, `build:browser`, `build:demos`, `coverage`, `test`, `typecheck`, `tier-router`, `mu-model-select`, `build-role-context`) present. (Coverage gap: AC does not runtime-verify the script; see MINOR-2 + OBS-3.) |
| AC-R90-13 | anti-scope diff ⊆ ALLOWED_SET regex | PASS | 12 modified paths: `.gitignore`, `coordination/{MEMORIAL.md,NEXT-ROLE.md,VENDORING-MANIFEST.md,specs/Q-R90-{SPEC.md,SPEC-AUDIT.md,EMPIRICAL.sh}}`, `engine/{README.md,package.json}`, `package.json`, `test/q90-engine-package-extract.test.ts`, `tsconfig.json` — all match ALLOWED_SET regex. |
| AC-R90-14 | 10 engine sentinels byte-identical against round-start | PASS | `git diff 65edb85 HEAD -- engine/` shows only NEW files (README.md, package.json); no modifications to algorithm/types files. |

**14/14 PASS at Reviewer HEAD.**

---

## § 2. Findings

### CRITICAL — none.

### MAJOR — none.

### MINOR

**MINOR-1 — Spec § 0 P0.2 empirical baseline off-by-one count of `engine/types/index.ts` re-exports.** | ARCHITECT
- Spec `coordination/specs/Q-R90-SPEC.md` § 0 P0.2 row asserts: "12 `export * from` lines: `./primitives`, `./metrics`, `./families/{a,b,c,d,e}`, `./agent`, `./verdict`, `./policy`, `./audit`, `./config`, `./orchestration`".
- The prose enumeration itself lists 13 items (1 primitives + 1 metrics + 5 families + 1 agent + 1 verdict + 1 policy + 1 audit + 1 config + 1 orchestration = 13). The count "12" is wrong.
- Verified at Reviewer HEAD: `engine/types/index.ts:20-32` contains 13 `export * from` statements.
- Same class as CROSS-PROJECT-MEMORIAL.md `spec-literal-count-not-verified` (R40 ARCHITECT precedent): the literal integer in a P0 row was not cross-validated against the file at spec-emit. Does NOT affect any AC (the exports map prescription covers fleet + self-normalized-fallback as explicit subpaths anyway, consistent with the file's *actual* re-export surface). But the verbatim-attestation discipline (R44/R88 area) requires P0 row integers to match the file at the recorded SHA.
- Evidence: `engine/types/index.ts:20-32` (13 lines); spec § 0 P0.2.

**MINOR-2 — Acknowledged-gap completeness: § 5.4 does not enumerate two real coverage gaps.** | ARCHITECT
- Spec § 5.4 lists 5 acknowledged AC gaps but omits:
  - (a) **AC-R90-4 exports-enumeration coverage gap.** The AC asserts 16 exact-anchor subpaths + 8 wildcards. The spec § 3.1 prescription has ~35 exports. AC-R90-4 does NOT bind: `./types/agent`, `./types/audit`, `./types/fleet`, `./types/metrics`, `./types/orchestration`, `./types/policy`, `./types/self-normalized-fallback`, `./types/families/b`, `./types/families/d`, `./types/families/e`, `./signal-classes`, `./verdict-groups`, `./hardware-topology-source`, `./loader`, `./per-detector-resampler-mode`, `./topology-overlay`. If Implementer dropped any of these, AC-R90-4 would not detect it (Implementer happens to have included them all — verified at `engine/package.json:21-56`).
  - (b) **AC-R90-12 no runtime verification of `pack:engine` script.** AC-R90-12 only asserts `'pack:engine' in rootPkg.scripts`. The script body `"cd engine && pnpm exec tsc --project ../tsconfig.json && pnpm pack"` could be syntactically broken and AC-R90-12 would still pass. The build pipeline IS exercised by AC-R90-7 + AC-R90-8 — but those invoke the underlying commands directly, not via the script. This is a forward-protection gap for R91+ (when consumers may rely on `pnpm pack:engine` as the canonical entry).
- Both gaps are inactive in this round (Implementer happened to produce a fully compliant artifact), but the spec's gap-enumeration discipline (CLAUDE-ARCHITECT SPEC-PRESCRIPTION-DISCIPLINE composite + R74 MINOR-2 minimum-mitigation pairing) requires acknowledging structural gaps even when fully-discharged this round.
- Evidence: `Q-R90-SPEC.md` § 5.4 (5 rows); compare against § 3.1 (~35 exports) and § 3.5 (script body never AC-bound).

**MINOR-3 — `.gitignore` delta is 2 lines (comment + rule), spec § 4.2 step 6 prescribed 1 line.** | IMPLEMENTER
- Spec § 4.2 step 6 says: "`.gitignore` +1 line (`engine/*.tgz`)".
- Actual diff (`git diff 65edb85 HEAD -- .gitignore`) shows 2 added lines:
  ```
  +# R90: engine pack tarball (produced by `cd engine && pnpm pack`; regenerated per test run)
  +engine/*.tgz
  ```
- The comment is helpful and improves discoverability; it does not break any AC. But the spec's prescribed pseudocode said one line. Same class as the "spec-pseudocode-narrowing-or-widening" Implementer-side discipline observations (see precedent in tessera R02 "Implementer made a silent in-line fix to spec §3.53 fixture" type — small additive deviation from verbatim pseudocode).
- This is borderline OBS but recording at MINOR because the verbatim-pseudocode discipline matters more in spec-driven rounds than the comment's value here.
- Evidence: `.gitignore:19-20`; `Q-R90-SPEC.md` § 4.2 step 6.

**MINOR-4 — Spec § 0 P0.13 import-count claim (56) doesn't reproduce.** | ARCHITECT
- Spec § 0 P0.13 asserts: "56 distinct relative imports spanning..." with the cited command `grep -hoE "from '\\.\\.[^']+'" test/*.ts tools/*.ts | sort -u`.
- Reviewer reproduced at Reviewer HEAD with the analogous engine-scoped grep `grep -hoE "from '\\.\\./engine[^']*'" test/*.ts tools/*.ts | sort -u | wc -l` → 48. The spec's cited command (broader `\.\.` not anchored to `engine`) likely yields a different count due to includes-non-engine `'..'` imports (e.g., `'../node_modules'`-style), so the discrepancy may be partly grep-command variance.
- Either way, the load-bearing claim ("the exports map covers every actual external-consumption subpath") is independently verified — every observed `'../engine/...'` import has a matching exact or wildcard subpath in the prescribed exports map. The numerical "56" claim itself is unverifiable from the spec's recorded grep at Reviewer HEAD. Same class as MINOR-1: empirical-baseline integer not cross-validated.
- Evidence: `Q-R90-SPEC.md` § 0 P0.13; reproduced grep at Reviewer HEAD.

### OBS

**OBS-1 — Stray `johnpatrickwarren-oss-tessera-0.1.0-pre.tgz` at repo root is NOT gitignored.** | N/A (developer artifact)
- `git status` at Reviewer HEAD shows untracked `johnpatrickwarren-oss-tessera-0.1.0-pre.tgz` (4.4 MB) at repo root.
- This tarball is the result of `pnpm pack` from the repo root (packs the root Tessera package, name `@johnpatrickwarren-oss/tessera`). Not produced by any R90 deliverable: the `pack:engine` script CDs into `engine/`; the q90 test sets `cwd: ENGINE_DIR`; both produce engine tarballs in `engine/`.
- The R90 `.gitignore` addition (`engine/*.tgz`) is correctly scoped to engine output; a stray root tarball lives outside its scope.
- Reviewer noted because the file is uncommitted and visible in `git status` post-round; a future round (R91+ hygiene) could broaden the gitignore to `*.tgz` repo-wide. Not a R90 defect.
- A second stray `johnpatrickwarren-oss-tessera-0.1.0-pre.tgz` (8.8 MB) ALSO appears IN `engine/` — gitignored by `engine/*.tgz` so not visible in `git status`, but its provenance is unclear and may reflect a developer running `pnpm pack` with `--pack-destination engine/` from the root (which would pack the root tessera package and drop it inside engine/). Worth noting for R91+ hygiene.
- Evidence: `git status`; `ls -la engine/ | grep tgz`.

**OBS-2 — Phase numbering inconsistency: R90 frames as "Phase 5 SLICE 3 round 1"; PRD AC-P8 says "DEFERRED to Phase 4 / dedicated design cycle".** | ARCHITECT (echoing R90 directive)
- `coordination/PRD.md:439,451,510` (AC-P8 + FR-D1) repeatedly say engine npm extract is "DEFERRED to Phase 4 / dedicated design cycle per R61 ESCALATE #2 → Option F resolution."
- Q-R90-SPEC.md frame line 1 + § 11 + § A7 + R90 directive header all say "Phase 5 SLICE 3 round 1".
- Could be intentional re-numbering (the dedicated cycle landing as Phase 5 instead of Phase 4) — but the PRD has not been amended to reflect this. The R93 close-walk should reconcile: either amend PRD AC-P8 "DEFERRED to Phase 4" → "DEFERRED to Phase 5" with rationale, OR retitle R90-R93 as "Phase 4 SLICE 1 ..." per the PRD's reservation.
- Not a R90 deliverable defect; OBS for the chain.
- Evidence: PRD line 439, 451, 510 vs Q-R90-SPEC.md line 1.

**OBS-3 — `pack:engine` script is not exercised by any R90 AC.** | ARCHITECT
- AC-R90-12 asserts the key `pack:engine` exists in `scripts`. No AC runs the script.
- The build pipeline IS verified end-to-end by AC-R90-7 (sentinels present after tsc) + AC-R90-8 (`pnpm pack` from engine/) — but those bind the underlying commands, not the script wrapper. A typo or path bug in the script body would slip past R90 ACs.
- Consider in R91 (when Tessera-internal consumers begin using the package): an AC that runs `pnpm pack:engine` and asserts tarball-presence would close this gap.
- Evidence: q90 test AC-R90-12 (lines 156-164); `package.json:31` script body.

---

## § 3. Right-reasons audit (3 tests)

**Test 1: `AC-R90-9` — tarball content gate.**
- Spec requirement: § 1.4 (backwards-compat) + § 3.1 `files` field whitelist + § 5.1 AC table row 9 (anti-content + required-content).
- Test mechanism: `tar -tzf <tarball>` is the canonical npm-pack content listing; `listing.includes('package/dist/types/index.js')` and `!listing.includes('package/test/')` are independent observables.
- Right-reasons check: the assertions test what the spec requires (tarball contains compiled output, excludes test/coordination/tools/scripts/demos, no raw `.ts`). The Implementer-authored `files` field in `engine/package.json:8-15` enumerates `dist/**/*` patterns + `README.md` + `package.json`. If the Implementer accidentally added `test/**` to `files`, the test would catch it. The test passes because the spec's `files` enumeration is correctly restrictive AND tsc's `outDir: engine/dist` correctly directs compiled output to that whitelist surface. NOT self-confirming.

**Test 2: `AC-R90-13` — anti-scope diff.**
- Spec requirement: § 5.3 ALLOWED_SET regex; § 6 anti-scope enumeration.
- Test mechanism: `git diff <ROUND_START_SHA> HEAD --name-only` → filter through regex → assert violators array is empty.
- Right-reasons check: ROUND_START_SHA = `65edb85` is hard-coded (Architect's deliberate choice per § A4.5 — the directive commit pre-exists spec-emit; no placeholder-injection vacuity per R53 MINOR-1 / R62 CRITICAL-1 class). The regex was independently authored by Architect from a pre-emit empirical walk over the directive's ALLOWED enumeration. If the Implementer modified an engine source file (anti-scope violation), the diff would include the unauthorized path AND the regex would reject it. NOT self-confirming (external git-history baseline + regex from spec).

**Test 3: `AC-R90-14` — engine sentinel byte-identity.**
- Spec requirement: § 6 anti-scope "NO modification of engine algorithm files" + spec § A2.3 integration point 6.
- Test mechanism: `git show 65edb85:<path>` (frozen historical content) vs `readFileSync(<path>)` (current). 10 sentinels span detectors, types, fleet, per-shard, l0, ds-integration, topology, topology-overlay, core.
- Right-reasons check: the comparison is against frozen historical bytes from git, not against any Implementer-authored fixture. If even one character changed in any of the 10 sentinels, `strictEqual` would fail with a specific path. The sentinels span 7 of the 10 engine subdirectories, so a byte-modification in any major subsystem would be caught. NOT self-confirming.

**Right-reasons audit verdict:** 3/3 tests bind external/structural truth; zero self-confirming.

---

## § 4. Cross-cutting checks

**TDD discipline.** Git log shows:
- `353eaa7 test(R90 RED): q90-engine-package-extract — 14 ACs, 12 FAIL / 2 PASS at RED` (RED commit; tests precede implementation)
- `0353553 feat(R90 GREEN): engine npm extract — package boundary + build artifact` (GREEN commit; implementation follows)
- The 2 ACs passing at RED would be AC-R90-13 (anti-scope diff over RED chore SHA includes only spec triad + test file + coordination; all in ALLOWED_SET) and AC-R90-14 (engine sentinels unmodified at RED). Structurally consistent with RED-then-GREEN.
- TDD discipline: PASS.

**No-skip / halt discipline.** No `.skip`, no `xfail`, no `assert.fail` placeholders in `test/q90-engine-package-extract.test.ts` at HEAD. All 14 ACs are live assertions. Implementer encountered no spec gap requiring HALT (no DIAGNOSTIC files; no STATUS: ESCALATE in routing). Spec § 0 was empirically grounded by Architect; no spec amendment fired in this round.
- No-skip / halt discipline: PASS.

**Anti-scope sweep.** `git diff 65edb85 HEAD --name-only` yields 12 paths; each maps to ALLOWED_SET enumeration § 5.3:
- `.gitignore` (row 6 — explicit ALLOWED, Architect scope-extension § 4.1)
- `package.json` (row 4 — explicit ALLOWED, Architect scope-extension § 3.5)
- `tsconfig.json` (row 3 — explicit ALLOWED, § 3.4 outDir delta)
- `engine/{README.md,package.json}` (rows 1,2 — NEW; explicit ALLOWED, § 3.1, § 3.2)
- `test/q90-engine-package-extract.test.ts` (row 8 — NEW q-test, § 3.3)
- `coordination/specs/Q-R90-{SPEC.md,SPEC-AUDIT.md,EMPIRICAL.sh}` (rows 9-11 — Architect spec triad)
- `coordination/VENDORING-MANIFEST.md` (row 7 — header insertion, § 3.6)
- `coordination/{MEMORIAL.md,NEXT-ROLE.md}` (rows 13-14 — coordination cycle)
- Zero unauthorized paths.
- Anti-scope: PASS.

**Engine source frozen.** `git diff 65edb85 HEAD -- engine/` shows only NEW files; no modifications to any of the 63 engine sources. The 10 sentinel byte-identity AC backed by this.
- Engine-source-frozen invariant: PASS.

---

## § 5. Self-grilling output (Reviewer adversarial sweep on this report)

1. **Every finding has file:line reference?** YES — MINOR-1 cites `engine/types/index.ts:20-32`; MINOR-2(a)(b) cites `engine/package.json:21-56` + `Q-R90-SPEC.md § 3.1, § 3.5, § 5.4`; MINOR-3 cites `.gitignore:19-20` + `Q-R90-SPEC.md § 4.2 step 6`; MINOR-4 cites `Q-R90-SPEC.md § 0 P0.13`; OBS-1 cites `git status`; OBS-2 cites PRD lines + spec; OBS-3 cites q90 test:156-164 + `package.json:31`. ✓
2. **Any AC marked PASS without actual verification?** NO — every PASS in the § 1 table has either a specific file:line in the artifact or a binding-command reproduction at Reviewer HEAD. The empirical baseline block at the top of the report records the actual binding-command output. ✓
3. **Right-reasons audit completed for 3+ tests?** YES — AC-R90-9, AC-R90-13, AC-R90-14 audited in § 3 with explicit mechanism + self-confirming check. ✓
4. **Did I look hard enough? Are there findings I might have missed?**
   - Searched spec § 0 (14 P0 rows) for empirical-claim drift; found 2 (MINOR-1, MINOR-4).
   - Searched § 5.4 acknowledged-gap completeness; found 2 missing gaps (MINOR-2(a)(b)).
   - Searched diff for prescribed-vs-actual pseudocode divergence; found .gitignore extra comment (MINOR-3).
   - Cross-checked PRD against R90 frame; found phase-numbering inconsistency (OBS-2).
   - Cross-checked AC-R90-12 binding scope; found script-body not runtime-tested (OBS-3 + MINOR-2(b)).
   - Cross-checked tarball lifecycle hygiene; found stray root-level tessera tarball (OBS-1).
   - No additional findings surfaced after a final pass over the spec + diff + tarball + test file.

5. **Routing rule strict application** (CLAUDE-REVIEWER REINFORCED 2026-05-19): 0 CRITICAL → MERGE-READY. No operator-decision flag required. The MINORs are all empirical-baseline / acknowledged-gap / pseudocode-narrowing class — not deliverable defects.

---

## § 6. Routing decision

**STATUS:** MERGE-READY.

**Rationale:** 0 CRITICAL findings. All 14 ACs PASS at Reviewer HEAD. 4 MINOR findings are all discipline-adjacent (spec empirical-baseline drift + acknowledged-gap completeness + small pseudocode-narrowing) and do not affect the deliverable's substantive correctness. 3 OBS findings are informational.

**Memorial-Updater inputs:**
- This report: `coordination/reviews/REVIEWER-REPORT-R90.md`.
- Q-R90 spec triad: `coordination/specs/Q-R90-{SPEC.md,SPEC-AUDIT.md,EMPIRICAL.sh}`.
- Architect + Implementer + Reviewer MEMORIAL.md entries (Reviewer to append after this report).

**Next role:** MEMORIAL-UPDATER.
