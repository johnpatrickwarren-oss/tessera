# Q-R94-SPEC-AUDIT.md — Architect audit-trail sidecar

_R94 Phase 5 SLICE 4 round 1 of 1. Audit-trail content per CLAUDE-ARCHITECT.md role-block step 6 ("Audit-trail content goes in coordination/specs/Q-RNN-SPEC-AUDIT.md")._

---

## A1. Superpowers brainstorm — 3 distinct approaches

### A1.1 Approach A — `git filter-repo --subdirectory-filter engine` (PICKED)

**Mechanism:** Clone Tessera fresh to scratch dir; run `git filter-repo --force --subdirectory-filter engine`; this rewrites history so every commit's tree contains only the engine/ subtree contents at root. Push to new GitHub repo; tag `v0.1.0-pre`.

**Strengths:**
- History-preserving: per-commit blame chain back to R01 vendoring + Tessera-evolution deltas survives
- Canonical: this is git-filter-repo's documented primary use case
- Content-byte-identical: HEAD tree equals Tessera HEAD's `engine/` subtree
- Fast: filter-repo is significantly faster than git-subtree-split on large histories
- Atomic at the local-clone level: either the filter succeeds wholesale or fails wholesale; no partial-state risk

**Weaknesses:**
- Requires `git-filter-repo` install (not bundled with git core); one-time install dependency
- Rewritten commit SHAs differ from Tessera's (acceptable: commit dates + messages survive; SHA continuity is not load-bearing)
- Filter-repo removes all `origin` remotes by default (safety feature); requires explicit `git remote add origin <new-url>` step

**Hidden assumptions:**
- Tessera's git history is clean enough that filter-repo succeeds without manual intervention (verified P0.1 + P0.18: engine/ is git-tracked, clean, no submodules)
- Homebrew is available for install (verified P0.10: brew 5.1.11 present)

**Risks:**
- If filter-repo encounters an unexpected branch / ref / tag that references engine/ from outside, the filter may fail or produce surprising output. Mitigation: `--force` flag + Phase A step 4 verification (`ls -la` + commit count check) BEFORE pushing.

### A1.2 Approach B — `git subtree split --prefix=engine`

**Mechanism:** Use built-in `git subtree split` to produce a synthetic branch with engine/ contents at root; push that branch + tag.

**Strengths:**
- No external tool install (built into core git)
- Same byte-identical tree result as filter-repo

**Weaknesses:**
- Slower than filter-repo on large histories (subtree-split scales O(commits × tree-objects); filter-repo is single-pass)
- Less canonical: filter-repo is the recommended approach per git-filter-repo's documentation
- Subtree-split's history-preservation semantics differ subtly (synthetic merge commits; less clean history graph)

**Hidden assumptions:** built-in git's subtree split handles the engine/ subtree cleanly across all R01-R94 commits.

**Risks:** unknown edge cases with subtree-split + commits that touch BOTH engine/ AND non-engine/ paths simultaneously.

**Rejected because:** filter-repo is documented as the canonical tool for exactly this use case; operator's directive explicitly authorizes `git-filter-repo --subdirectory-filter`; the install cost is negligible (one `brew install`).

### A1.3 Approach C — Manual `cp -r engine /tmp/new-repo && git init`

**Mechanism:** Copy engine/ subtree contents to new directory; initialize fresh git repo; single initial commit; push + tag.

**Strengths:**
- Trivial to execute (no filter-repo install)
- Smallest possible history graph (1 commit)

**Weaknesses:**
- Loses ALL history: blame chain from R01 vendoring + Tessera-evolution deltas are erased
- Violates directive operator-locked decision: "History preservation: YES"
- Future re-pin / re-extract cycles cannot leverage the engine/ commit history

**Hidden assumptions:** operator does not care about provenance.

**Risks:** post-extraction debugging would require returning to Tessera's history to understand any engine/ file's evolution.

**Rejected because:** directive operator-locked decision violates this approach.

### A1.4 Constraint elimination

Per directive header:
1. **"History preservation: YES"** → eliminates Approach C
2. **"via `git filter-repo --subdirectory-filter engine`"** → explicitly selects Approach A; Approach B remains technically viable but is not the operator-named choice

### A1.5 Selection rationale

**PICKED: Approach A.** Operator-named in directive; history-preserving; canonical tool; one-time install cost is negligible.

**REJECTED Approach B:** valid but not operator-named; would require Architect-deviation justification.
**REJECTED Approach C:** explicitly contradicts directive operator-locked "History preservation: YES" decision.

---

## A2. Superpowers design — component sketch + integration points + failure modes

### A2.1 Component boundaries

**Exists pre-R94:**
- Tessera worktree at `/Users/johnwarren/concord/tessera/`
- `engine/` subtree (git-tracked source + gitignored dist/ build output)
- `engine/package.json` (R90 deliverable; package boundary)
- Tessera consumes engine via `file:./engine` (R91 state)
- `tsconfig.json` + `tsconfig.test.json` configured for in-tree engine source

**Created at R94:**
- New GitHub repository `johnpatrickwarren-oss/deploysignal-engine` (PUBLIC, Apache-2.0)
- Tag `v0.1.0-pre` on new repo's HEAD
- Tessera `coordination/specs/Q-R94-*` (spec triad)
- Tessera `test/q94-engine-repo-extraction.test.ts` (13 ACs)

**Changed at R94:**
- Tessera `package.json` (3 line deltas)
- Tessera `tsconfig.json` (structural simplification)
- Tessera `tsconfig.test.json` (include trim)
- Tessera `.gitignore` (R90's engine/*.tgz lines removed)
- Tessera `pnpm-lock.yaml` (regenerated by `pnpm install`)
- Tessera `coordination/VENDORING-MANIFEST.md` (header note appended)

**Deleted at R94:**
- Tessera `engine/**/*` (all git-tracked + gitignored content; `git rm -r engine/`)

### A2.2 Data flow

```
[Tessera worktree HEAD = 9e24aa4]
        │
        │ git clone --no-local → /tmp/r94-engine-extract/tessera-clone
        ↓
[Scratch clone]
        │
        │ git filter-repo --subdirectory-filter engine
        ↓
[Filtered clone: engine/ contents at root, history preserved]
        │
        │ gh repo create + git push + tag + push tag
        ↓
[New repo at github.com/johnpatrickwarren-oss/deploysignal-engine, tag v0.1.0-pre]
        │
        │ [Tessera-side: package.json dep URL change]
        ↓
[Tessera package.json depends on github:.../deploysignal-engine#v0.1.0-pre]
        │
        │ pnpm install → resolves github: dep → downloads + links into node_modules/
        ↓
[node_modules/@johnpatrickwarren-oss/deploysignal-engine/ populated from new repo's tag]
        │
        │ [Tessera-side: git rm -r engine/; tsconfig.* updates; .gitignore trim]
        ↓
[Tessera tree: no engine/ subtree; tsconfig refers to package boundary only]
        │
        │ pnpm exec tsc -p tsconfig.test.json (tests typecheck via node_modules resolution)
        │ node --test test/*.test.js (tests run via require.resolve → node_modules)
        ↓
[Full suite GREEN; q94 ACs all PASS at chore-A]
```

### A2.3 Integration points (10 enumerated)

| # | Integration point | Verifying AC | Failure mode |
|---|---|---|---|
| 1 | git-filter-repo CLI ↔ scratch clone | (External; Implementer attests exit code) | filter-repo errors → § 6.1 halt-1 |
| 2 | gh CLI ↔ GitHub API for repo creation | (External; Implementer attests) | gh API error → § 6.1 halt-2 |
| 3 | git push ↔ new GitHub repo | (External) | push fails → halt-3 |
| 4 | git tag push ↔ new GitHub repo | (External) | tag push fails → halt-4 |
| 5 | gh release view ↔ new GitHub repo tag | (External) | tag not reachable → halt-5 |
| 6 | pnpm install ↔ github: URL resolution | AC-R94-3 (post-install verification) | pnpm fails → § 6.2 halt-6 |
| 7 | Tessera package.json ↔ pnpm dependency resolution | AC-R94-2 (URL literal) + AC-R94-3 (resolved package) | URL malformed → q94 RED + chore-A FAIL |
| 8 | tsconfig.json + tsconfig.test.json ↔ TypeScript compiler | AC-R94-5 + AC-R94-6 (config shape) + AC-R94-10 (tsc exit 0) | typecheck fails → § 6.3 halt-8 |
| 9 | node module resolution ↔ test imports | AC-R94-4 (createRequire resolves) + AC-R94-12 (consumer files retain package imports) | resolution fails → q94 RED |
| 10 | git diff ROUND_START_SHA..HEAD ↔ ALLOWED_REGEX | AC-R94-11 + Q-R94-EMPIRICAL.sh Block 11 | unauthorized path → § 6.3 halt-10 |

### A2.4 Failure modes per integration point

See § A2.3 column 4 + § 6 of main spec.

---

## A3. Pre-emit grilling output

(Mirrored in Q-R94-SPEC.md § 7 for spec-side reading. The version here is the audit-trail-grade version with the Architect's deliberation.)

### A3.1 Verifiability (Q.1)

Verified that every claim in the spec maps to either (a) a binding AC; (b) an EMPIRICAL.sh block; (c) a direct P0.x premise; (d) a prescriptive instruction with self-evident success criterion. No "trust me" claims.

### A3.2 Unstated assumptions (Q.2)

6 enumerated (§ 7.2 of main spec). All verified at session entry where possible:
- Branch name `main` confirmed (`git rev-parse --abbrev-ref HEAD` = `main`)
- engine/ is git-tracked (P0.1)
- homebrew available (P0.10)
- gh has `repo` scope (P0.11)

The "network connectivity required at chore-A" assumption is operator-implicit (pnpm install resolves github: dep over network). Documented as known dependency.

### A3.3 Scope-added audit (Q.3)

ONE in-scope cleanup beyond strict directive: § 3.5 `.gitignore` line removal (R90's `engine/*.tgz` rule + comment). Rationale: post-R94 the targeted path doesn't exist; leaving stale lines is benign but removing is cleaner. Documented explicitly in § 7.3 of main spec. Alternative ("KEEP for minimal-diff") rejected; cleanup is preferred.

### A3.4 Implementer can act (Q.4)

YES. Phase A is 9 verbatim bash commands; Phase B is 6 prescribed file deltas with full post-content provided; Phase C is verbatim 280-line test file source + verbatim EMPIRICAL.sh.

The only tactical-autonomy latitude is filter-repo flag variation (`--force` placement) and Phase A's exact `gh repo create` description string. Both are pre-prescribed in § 3.1.

### A3.5 R86 prophylactic self-application gate (Q.5)

Walked each Architect-encoded pattern in q94 source through the prescribed implementation and verified compatibility with:
- FORWARD-PROTECTION-AC-REGISTRY Entry 2 (`scripts/check-no-execfilesync-spawn.sh`): q94 uses `execFileSync('git', ...)` ONLY (NOT 'node') → hook does not trigger on q94 → no APPROVED-list update needed
- FORWARD-PROTECTION-AC-REGISTRY Entry 6 (AC-R36-4): q94 does NOT scan q29/q32/q34 for SHA pins → not affected
- AC-R77-16 (subprocess test-count): q94 does NOT use `spawnSync('node', ...)` → not affected

Concluded: q94 introduces NO new forward-protection-AC pattern.

### A3.6 R82 ALLOWED_SET 4-surface propagation (Q.6)

Verified ALLOWED_REGEX byte-identical across:
1. Q-R94-SPEC.md § 5.2 (this spec)
2. test/q94-engine-repo-extraction.test.ts `ALLOWED_REGEX` constant (AC-R94-11)
3. Q-R94-EMPIRICAL.sh Block 11 ALLOWED_REGEX variable
4. NEXT-ROLE.md routing block attestation (Implementer-side; copy-paste from § 5.2)

Surfaces 1-3 are byte-identical at spec-emit. Surface 4 is Implementer-emitted at chore-A; the discipline is to copy from surface 1.

### A3.7 R85 fail-count-band (Q.7)

Per § 0.2 prediction: `fail ∈ [20, 21]` band (not strict) accommodating AC-R84-14 ~25% stochastic flake (R85 CRITICAL-1 REINFORCED 2026-05-21).

### A3.8 R86/R87/R88/R89 sub-pattern compliance (Q.8)

- **R86 prophylactic walk:** § A3.5 above
- **R87 prose-claim-about-post-edit-state:** § 7.6 of main spec confirms no R87-class claim in R94
- **R88 grep-semantics:** P0.17, P0.18 use direct Read + `git ls-files` / `git check-ignore` (not bare grep)
- **R89 TAP-reporter flag-ordering:** all EMPIRICAL.sh blocks use `--test-reporter=tap` BEFORE `test/*.test.js`
- **R89 MAJOR-2 (no first-N-lines byte-identical):** confirmed no R94 AC of that form

### A3.9 Spec-internal contradiction sweep (Q.9)

Walked § 1.7 binding table count (13 rows) against § 4 AC count (13 ACs): MATCH.
Walked § 5.2 regex alternation count (14 path patterns inside outer parens) against § 5.3 narrative table row count (14 rows): MATCH.
Walked § 0.2 predicted band literals (`[733, 734]`, `[20, 21]`, `758`) against AC-R94-9 assertion regex: MATCH.
Walked § 3.5 .gitignore claim ("removes lines 19-20") against P0.17 pre-edit state: MATCH.

No contradictions.

### A3.10 R74 regex self-application + R75 sub-variants (Q.10)

- AC-R94-2 regex `/^github:johnpatrickwarren-oss\/deploysignal-engine#v0\.1\.0-pre$/`: walked against spec § 3.2 prescribed literal `"github:johnpatrickwarren-oss/deploysignal-engine#v0.1.0-pre"` → MATCH (anchored exact).
- AC-R94-4 regex `/node_modules.*@johnpatrickwarren-oss\/deploysignal-engine\/dist\/.+\.js$/`: walked against P0.20 observed resolution path → MATCH (loose to accommodate pnpm-link path variance).
- AC-R94-8 regex `/^## R94 extraction note/m`: walked against § 3.6 prescribed heading → MATCH.
- AC-R94-11 ALLOWED_REGEX: walked alternation-by-alternation against § 5.3 narrative paths + § 2.3 changed files → MATCH (every path covered).

### A3.11 EMPIRICAL.sh probe-run at spec-emit (Q.11)

Run after spec-triad authoring: see § 7.10 of main spec for expected per-block outcomes (3 PASS / 8 FAIL — matches R86 expected pre-impl state). Architect runs the probe in own session at spec-emit; verbatim output captured at Architect-routing time.

---

## A4. Decision rationale (why-picked + why-rejected)

### A4.1 Why filter-repo over subtree-split or manual

**Picked:** Operator-named in directive ("History preservation: YES, via git filter-repo --subdirectory-filter engine"). Canonical tool for the exact use case. Negligible install cost.

**Rejected subtree-split:** valid alternative; not operator-named; would require Architect deviation justification.

**Rejected manual cp:** violates "History preservation: YES" directive decision.

### A4.2 Why git-dep over npm publish

**Picked:** Directive operator-locked: "first-cycle adoption" → git-dep. Aligns with R90 README pre-disclosure ("For first-cycle consumption (R91/R92), this package is consumed via git-dependency").

**Rejected npm publish:** out of scope; future-cycle decision; would couple package availability to npm registry state (publish revocation, version-string immutability).

### A4.3 Why drop tsconfig paths (vs repoint to node_modules)

**Picked DROP:** `moduleResolution: "node"` (already set) finds packages in node_modules/ without paths mapping. Adding paths mapping to node_modules is redundant.

**Rejected REPOINT:** would introduce structural complexity (path alias inside tsconfig pointing into node_modules) without semantic benefit.

### A4.4 Why brew install over pip3

**Picked brew:** homebrew is installed (P0.10); brew installs are isolated, sudo-free, cleanly uninstallable. Canonical macOS approach for CLI tools.

**Rejected pip3:** would add to user site-packages outside brew's tracking; pip3 from CommandLineTools (Python 3.9) is old; pipx (a cleaner alternative) is not installed.

**Rejected pipx setup:** two-step; more ceremony for a one-time install.

### A4.5 Why ROUND_START_SHA = 9e24aa4 (directive commit) without placeholder injection

**Picked stable SHA:** directive commit is parent of spec-triad commit; SHA stable from directive-commit onward; no placeholder injection needed (R53 MINOR-1 + R62 CRITICAL-1 class structural-vacuity avoided).

**Rejected placeholder injection (`<INJECTED-AT-CHORE-B>` pattern):** unnecessary complexity for a single-chore-A round; R53 + R62 lessons concur.

### A4.6 Why 13 ACs (not 10, not 20)

Directive minimum: 10. Architect's coverage requires:
- Tessera state (5 ACs: AC-R94-1, 5, 6, 7, 8)
- Package boundary (4 ACs: 2, 3, 4, 12)
- Verification (3 ACs: 9, 10, 11)
- Self-application (1 AC: 13)

= 13 ACs. Each adds independent coverage; no redundancy. Going to 20 would require synthetic granularity. Picked 13 = directive minimum + 3 for completeness.

---

## A5. Architect pre-prediction (chore-A outcomes)

| Outcome | Prediction |
|---|---|
| Phase A: `brew install git-filter-repo` | PASS (homebrew 5.1.11 healthy per P0.10) |
| Phase A: `git filter-repo` | PASS (engine/ is tracked + clean per P0.1) |
| Phase A: `gh repo create` | PASS (operator authorized; `repo` scope per P0.11) |
| Phase A: `git push -u origin main` | PASS (new empty repo accepts push) |
| Phase A: `git tag + push tag` | PASS |
| Phase A: `gh release view v0.1.0-pre` | PASS (after possible 30s eventual-consistency delay) |
| Phase B: `pnpm install` resolves github: dep | PASS (tag reachable; package.json at repo root) |
| Phase B: `git rm -r engine/` | PASS (engine/ is tracked) |
| Phase C: `pnpm exec tsc -p tsconfig.test.json` | exit 0 (tests typecheck via node_modules) |
| Phase C: full test suite | tests=758, pass ∈ [733, 734], fail ∈ [20, 21], skip=4 |
| Phase C: q94 ACs | 13/13 PASS |
| Phase C: anti-scope diff | ⊆ ALLOWED_SET |
| Q-R94-EMPIRICAL.sh exit code at chore-A HEAD | 0 (all 11 blocks PASS) |

Reviewer-side independent re-run prediction: same as above. No claims inherited from Implementer attestation (R08 MAJOR-2 lesson honored at Reviewer stage).

---

## A6. Amendments from prior version

N/A — this is v1.0 of the spec triad. No prior version exists. (R94 has no fix-cycle resumption history per CLAUDE-ARCHITECT.md § "Fix-cycle considerations".)

---

## A7. Verbatim probe-run capture (R86 prophylactic + R89 sub-pattern)

After spec-triad authoring + commit, the Architect runs `bash coordination/specs/Q-R94-EMPIRICAL.sh` at HEAD `9e24aa4` (i.e., before chore-A; pre-impl state).

### A7.1 Actual probe-run output at Architect session (verbatim)

Captured 2026-05-21 immediately after spec-triad authoring (pre-Architect-routing-commit):

```
── Block 1: ROUND_START_SHA constant verifies ──
  PASS: ROUND_START_SHA 9e24aa4 resolves to a valid commit
── Block 2: engine/ subdirectory removed from Tessera tree ──
  FAIL: engine/ directory still present
── Block 3: package.json dep is github: with v0.1.0-pre tag ──
  FAIL: dep URL observed: file:./engine (expected github:johnpatrickwarren-oss/deploysignal-engine#v0.1.0-pre)
── Block 4: pnpm exec tsc -p tsconfig.test.json exits 0 ──
  PASS: tsc -p tsconfig.test.json exits 0
── Block 5: tsconfig.json shape (empty include; no paths/outDir/baseUrl/rootDir) ──
  FAIL: tsconfig.json issues: BAD:include not empty;outDir present;rootDir present;baseUrl present;paths present
── Block 6: tsconfig.test.json include excludes engine/**/*.ts ──
  FAIL: tsconfig.test.json issues: BAD: hasEngine=true hasTest=true hasTools=true hasScripts=true
── Block 7: VENDORING-MANIFEST.md has R94 extraction header note ──
  FAIL: VENDORING-MANIFEST.md missing R94 extraction header note (or missing filter-repo / new-repo references)
── Block 8: full TAP within band ──
  FAIL: tests=745 (expected 758); pass=721 (expected [733,734]); fail=20 (expected [20,21]); skip=4 (expected 4)
── Block 9: q94 ACs all PASS ──
  FAIL: test/q94-engine-repo-extraction.test.js not found (pretest may not have built it)
── Block 10: anti-scope diff ⊆ ALLOWED_REGEX ──
  PASS: every diff path matches ALLOWED_REGEX
── Block 11: ALLOWED_REGEX byte-identical (script ↔ q94 test) ──
  FAIL: test/q94-engine-repo-extraction.test.ts not found

Total: 3 PASS / 8 FAIL (11 blocks).
Exit: 1
```

Matches § 7.10 prediction (3 PASS / 8 FAIL) exactly. Per-block expected vs observed:

| Block | Predicted | Observed | Match |
|---|---|---|---|
| 1 (round-start SHA) | PASS | PASS | ✓ |
| 2 (engine/ removed) | FAIL (pre-impl) | FAIL | ✓ |
| 3 (github: dep) | FAIL (pre-impl) | FAIL | ✓ |
| 4 (tsc test-tier) | PASS (P0.12) | PASS | ✓ |
| 5 (tsconfig.json shape) | FAIL (pre-impl) | FAIL | ✓ |
| 6 (tsconfig.test.json) | FAIL (pre-impl) | FAIL | ✓ |
| 7 (VENDORING-MANIFEST) | FAIL (pre-impl) | FAIL | ✓ |
| 8 (TAP band) | FAIL (745 not in [758] band) | FAIL (tests=745) | ✓ |
| 9 (q94 ACs all PASS) | FAIL (file does not exist) | FAIL | ✓ |
| 10 (anti-scope diff) | PASS (HEAD == ROUND_START) | PASS | ✓ |
| 11 (regex byte-identity) | FAIL (q94 file does not exist) | FAIL | ✓ |

R86 prophylactic + R89 sub-pattern discipline upheld: probe ran cleanly + matched expected output verbatim.

### A7.2 Expected per-block outcomes (reference)

```
── Block 1: ROUND_START_SHA constant verifies ──
  PASS: round-start SHA constant matches HEAD parent

── Block 2: engine/ subdirectory removed from Tessera tree ──
  FAIL: engine/ still present (pre-impl)

── Block 3: package.json dep is github:johnpatrickwarren-oss/deploysignal-engine#v0.1.0-pre ──
  FAIL: dep URL still file:./engine (pre-impl)

── Block 4: pnpm exec tsc -p tsconfig.test.json exits 0 ──
  PASS: tsc -p tsconfig.test.json exits 0

── Block 5: tsconfig.json has empty include + no paths/outDir/baseUrl ──
  FAIL: tsconfig.json still has paths/outDir/etc (pre-impl)

── Block 6: tsconfig.test.json include excludes engine/**/*.ts ──
  FAIL: still includes engine/**/*.ts (pre-impl)

── Block 7: VENDORING-MANIFEST.md has R94 extraction header note ──
  FAIL: no R94 note (pre-impl)

── Block 8: full TAP within band tests=758 / pass∈[733,734] / fail∈[20,21] / skip=4 ──
  FAIL: pre-impl tests=745; band expects 758

── Block 9: q94 ACs all PASS ──
  FAIL: q94 file does not exist yet (pre-impl)

── Block 10: anti-scope diff round-start..HEAD ⊆ ALLOWED_SET ──
  PASS: HEAD == ROUND_START at spec-emit; diff is empty (trivially ⊆ ALLOWED)

── Block 11: ALLOWED_REGEX byte-identical across surfaces ──
  FAIL: q94 file does not exist yet to compare (pre-impl)

Total: 3 PASS / 8 FAIL.
Exit: 1
```

Actual probe-run output will be captured + appended to Q-R94-SPEC-AUDIT.md at chore-A by the Architect's pre-routing step (per R85 CRITICAL-1 R86 prophylactic-discipline propagation).

---

**End of Q-R94-SPEC-AUDIT.md.**
