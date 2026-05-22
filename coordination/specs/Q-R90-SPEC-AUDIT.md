# Q-R90-SPEC-AUDIT — Architect audit-trail sidecar

_Audit-trail sidecar for `Q-R90-SPEC.md`. Reviewer and MU read both files; the Implementer reads only the spec proper (per CLAUDE-ARCHITECT.md ARCHITECT block step 6 audit-trail discipline)._

---

## § A1. Brainstorm (Superpowers Brainstorm phase)

### A1.1 — Three distinct architectural approaches

**Approach 1: Standalone sub-package at `engine/` (directive's Option A)**

- Mechanism: `engine/package.json` (NEW) declares the engine as a publishable sub-package. Engine source stays at `engine/*.ts`. Root tsconfig.json `outDir` is adjusted from `dist/engine` to `engine/dist` so build artifact lives inside the package root. `pnpm pack engine` produces the tarball.
- **Strengths:**
  - Minimal git-history churn (no `git mv`)
  - Tessera-internal consumers' relative imports unchanged (zero `import` rewrites)
  - Single-line root tsconfig.json change
  - `engine/package.json` is a standalone artifact — no workspace-registration dependency
  - Backwards-compat guarantee trivially preserved (no Tessera-internal file modifications)
- **Weaknesses:**
  - Engine package "lives inside" the Tessera repo rather than at a conventional `packages/engine/` location
  - Less discoverable for engineers unfamiliar with the Tessera vendoring story
- **Hidden assumptions:**
  - `pnpm pack` works on any directory containing a `package.json` regardless of workspace registration (verified: `pnpm pack <dir>` requires only a valid package.json at the target directory)
  - Tarball name for scoped packages follows `<scope>-<name>-<version>.tgz` convention (verified via npm CLI docs; pnpm pack honors the same convention)
  - `tar -tzf` is available on Darwin (verified locally; BSD tar ships with macOS)
- **Risks:**
  - Layout deviation from convention may confuse future engineers (low risk; minor README + spec documentation addresses)
  - If `pnpm-workspace.yaml` registration becomes load-bearing later (e.g., for `pnpm publish` workflow), needs revisit. R90 anti-scopes publish so no immediate impact.

**Approach 2: Monorepo restructure at `packages/engine/` (directive's Option B)**

- Mechanism: `git mv engine packages/engine`. Update `pnpm-workspace.yaml`'s `packages:` list. Rewrite every Tessera-internal `import '../engine/...'` to `'../packages/engine/...'`. Update root `tsconfig.json` paths.
- **Strengths:**
  - Standard monorepo convention; familiar to engineers
  - Clean separation between Tessera-application code and engine library code
- **Weaknesses:**
  - Massive git rename diff (63 `engine/*.ts` files moved)
  - Every Tessera-internal `import '../engine/...'` line breaks until rewritten (estimated ≥120 import lines across `test/*`, `tools/*`, `engine/*.ts` self-references)
  - Root `tsconfig.json` paths need updating (`include`, `rootDir`, `outDir`)
  - `test/q*-*.test.ts` files break en masse — backwards-compat goal is violated mid-round and only restored after import rewrites complete
  - `pnpm-workspace.yaml` is gitignored (P0.8); workspace registration cannot persist in git
  - High risk of import-rewrite missing edge cases (e.g., dynamic imports, comment references) that surface as flaky test failures
- **Hidden assumptions:**
  - All `'../engine/...'` references are mechanically rewritable (most are; but tools/*.ts uses `.js` suffix imports — both `../engine/foo.js` and `../engine/foo` patterns present, both need rewriting)
  - `pnpm-workspace.yaml` modifications would persist — **EMPIRICALLY FALSE per P0.8**
- **Risks:**
  - Backwards-compat goal of R90 ("Tessera-internal consumers MUST continue working post-R90") is at high risk
  - If any import rewrite is missed, the test suite breaks and the round HALTs — adds cycle cost to the chain
  - Directive halt condition 11 ("Monorepo restructure (Option B) creates rename-diff that includes content changes: HALT (rename must be pure)") implies the directive itself foresees the risk

**Approach 3: Decorative-only `engine/package.json` (no build pipeline changes)**

- Mechanism: Create `engine/package.json` but leave `tsconfig.json` outDir at `dist/engine`. `engine/package.json`'s `files` field would have to either (a) include nothing (broken tarball) or (b) cross the package root via `../dist/engine/**` (npm pack will refuse or produce broken tarball).
- **Strengths:**
  - Zero build-infrastructure changes
- **Weaknesses:**
  - `pnpm pack` from `engine/` cannot include compiled output (it lives outside the package root at `dist/engine/`)
  - "Build artifact verifiable" deliverable (directive § 4) cannot be satisfied
  - Tarball is essentially empty (just `package.json` + `README.md`)
- **Hidden assumptions:**
  - `pnpm pack` allows `..` paths in `files` (FALSE — npm pack ignores parent-traversal paths for security)
- **Risks:**
  - Cannot satisfy directive deliverables — fails-by-design.

### A1.2 — Constraints that eliminate options

| Constraint (source) | Eliminates |
|---|---|
| "Backwards-compat: Tessera-internal consumers MUST continue working post-R90 (no breaking changes)" (directive § Motivation) | Approach 2 (high risk of import-rewrite breakage; many touch points; backwards-compat at risk mid-round) |
| "Build artifact verifiable" (directive § Primary deliverables item 4) | Approach 3 (tarball cannot include compiled output without modifying outDir or copying) |
| ".gitignore line 22: pnpm-workspace.yaml" (P0.8 empirical) | Approach 2 (workspace registration cannot persist; the structural premise of Option B's pnpm-workspace.yaml `packages:` list is uncommittable) |
| "halt condition 11: Monorepo restructure ... creates rename-diff that includes content changes: HALT (rename must be pure)" (directive § Halt conditions) | Approach 2 (the directive itself acknowledges Option B's high risk surface) |

### A1.3 — Selection

**Picked: Approach 1 (Option A — standalone sub-package).**

Rationale:
- Satisfies all directive primary deliverables (package boundary, metadata, types-barrel decoupling preserved, build artifact, backwards-compat, manifest note, README, q90 test, EMPIRICAL.sh).
- Minimal blast radius: 1-line `tsconfig.json` outDir change + 1-line `package.json` script addition + 1-line `.gitignore` append. New files (`engine/package.json`, `engine/README.md`, `test/q90-*`, spec triad). VENDORING-MANIFEST.md header note.
- Backwards-compat guarantee is structurally preserved (zero Tessera-internal `import` lines changed; AC-R90-14 binds byte-identity of 10 engine sentinels).
- `pnpm-workspace.yaml` gitignore conflict resolved by NOT modifying it (the directive's enumeration of it in ALLOWED_SET is a propagation gap — entering it in ALLOWED_SET is harmless because it never appears in `git diff` output).
- `engine/dist/` outDir change is invisible to Tessera-internal relative-import consumers (P0.13 verified all imports are relative `'../engine/...'` patterns).

**Rejected: Approach 2** — backwards-compat risk; pnpm-workspace.yaml gitignore conflict; the directive itself foresees the risk via halt condition 11.

**Rejected: Approach 3** — fails-by-design on "build artifact verifiable" deliverable.

---

## § A2. Design sketch (Superpowers Design phase)

### A2.1 — Component boundaries

| State | Boundary |
|---|---|
| EXISTS, untouched | engine/*.ts (63 files); engine/types/index.ts barrel; all 10 engine subdirectories; tsconfig.test.json; root LICENSE; root README.md |
| EXISTS, 1-line delta | tsconfig.json (outDir: dist/engine → engine/dist); root package.json (scripts: + pack:engine); .gitignore (+ engine/*.tgz) |
| EXISTS, header-only delta | coordination/VENDORING-MANIFEST.md (header note insert above per-row table) |
| EXISTS, normal coordination cycle | coordination/NEXT-ROLE.md; coordination/MEMORIAL.md |
| CREATED | engine/package.json; engine/README.md; test/q90-engine-package-extract.test.ts; coordination/specs/Q-R90-SPEC.md + Q-R90-SPEC-AUDIT.md + Q-R90-EMPIRICAL.sh; coordination/reviews/REVIEWER-REPORT-R90.md (Reviewer stage) |
| EMITTED at build (gitignored) | engine/dist/**/*.{js,d.ts,d.ts.map,js.map} |
| EMITTED at pack (gitignored) | engine/johnpatrickwarren-oss-deploysignal-engine-0.1.0-pre.tgz |

### A2.2 — Data flow

```
                                                    [Architect spec-triad commit]
                                                              │
                                                              ▼  ROUND_START_SHA = 65edb85 (R90 directive commit, immediate parent)
[Implementer RED: add q90 test only]──────────────────┐
                                                      ▼
[Implementer GREEN]──┬─ engine/package.json (NEW)
                     ├─ engine/README.md (NEW)
                     ├─ tsconfig.json (outDir delta)
                     ├─ package.json (pack:engine script)
                     ├─ .gitignore (engine/*.tgz)
                     ├─ VENDORING-MANIFEST.md (header note)
                     └─ pnpm exec tsc ──► engine/dist/ (gitignored; not in git diff)
                                                              │
                                                              ▼
                            [Implementer chore-A verification]
                            • pnpm exec tsc ─► engine/dist/ populated
                            • cd engine && pnpm pack ─► tarball at engine/<scoped>.tgz
                            • node --test ─► q90 ACs PASS + full suite fail band [16,17]
                            • bash Q-R90-EMPIRICAL.sh ─► 9 blocks PASS exit 0
                                                              │
                                                              ▼
                                              [Reviewer / MU re-run at HEAD]
```

### A2.3 — Integration points + per-point failure-mode analysis

| Integration point | Verified by | Failure mode |
|---|---|---|
| 1. tsc reads tsconfig.json outDir | AC-R90-6 | If outDir was not changed, `engine/dist/` won't be populated; AC-R90-7 (sentinels) FAILS |
| 2. tsc emits to engine/dist/ | AC-R90-7 sentinels (10 paths) | If a subdirectory fails to emit (e.g., events/, topology/), the specific sentinel for it FAILS |
| 3. tsconfig.test.json extends tsconfig.json | P0.4 + P0.11 | If outDir change leaks into test build (it shouldn't — tsconfig.test.json sets its own outDir to `.`), co-located .js paths would shift. Verified: tsconfig.test.json explicitly sets `outDir: "."` overriding parent |
| 4. pnpm pack consumes engine/package.json files field | AC-R90-8 + AC-R90-9 | If files glob `dist/**/*.js` doesn't match, tarball is empty. AC-R90-9 anti-content + required-content cross-checks |
| 5. tar -tzf reads tarball | AC-R90-9 listing assertion | If BSD tar incompatible, command errors; ACs fail loudly |
| 6. Tessera-internal '../engine/...' imports | AC-R90-14 + full test suite passes | If any engine source byte-changes, AC-R90-14 sentinel comparison FAILS at Reviewer HEAD |
| 7. dist/ gitignore matches engine/dist/ | P0.7 empirical | If gitignore pattern doesn't match recursively (it does — `dist/` no leading slash matches anywhere), engine/dist/ would accidentally appear in `git status` (engineering hygiene; not load-bearing for ACs) |
| 8. Anti-scope diff baseline (65edb85) reachable | AC-R90-13 | If round-start SHA becomes unreachable (rebase, force-push), AC fails. Not anticipated. |
| 9. Tarball appears in `engine/` after pack | AC-R90-8 | If pnpm pack writes to a different directory (e.g., cwd or temp), AC-R90-8 fails. The `--pack-destination` flag binds the output path. |
| 10. q90 test runs against built artifact | AC-R90-7/8 ordering | node:test runs tests in declaration order within a file. AC-R90-7 (artifact exists) declared before AC-R90-8 (pack runs). |

### A2.4 — Verification against PRD requirements

| PRD ref | R90 contribution |
|---|---|
| FR-D1 (DEFERRED 2026-05-20: engine npm extract) | **R90 closes this DEFERRED entry's structural pre-requisite.** R90 ships the package boundary + types-barrel decoupling. R91 ships Tessera-internal consumption migration. R92 ships DS-side adoption. R93 closes SLICE 3. |
| AC-P8 (DEFERRED 2026-05-20: engine extracted to npm pkg) | R90 is round 1 of the chain that satisfies AC-P8. R93 close re-confirms AC-P8 → ACHIEVED at SLICE 3 close. |
| A12 (NO modification of vendored-at-pin engine internals) | Preserved: AC-R90-14 byte-identity on 10 engine sentinels |
| Inherited Ville/martingale guarantees | Preserved: no algorithm modification in R90 |

---

## § A3. Pre-emit grilling output (this section IS the Architect's adversarial self-review)

Walked § 8 (Grilling output in spec proper). All 9 gates pass (§ 8.1 verifiable, § 8.2 unstated, § 8.3 scope-extension documented x2, § 8.4 implementer-can-act, § 8.5 R86 self-application, § 8.6 R72/R82 ALLOWED propagation, § 8.7 R85 band, § 8.8 R86+R87+R88+R89 sub-patterns, § 8.9 spec-internal contradiction sweep, § 8.10 R74 regex self-application, § 8.11 7 cross-project rules).

Two scope extensions documented in the spec, both Architect-justified and minimal-blast-radius:
- `pack:engine` script (1 line in root package.json)
- `engine/*.tgz` in .gitignore (1 line)

Operator may strike either without harm to R90's primary deliverables.

---

## § A4. Decision rationale (why-picked / why-rejected paragraphs)

### A4.1 — Why Option A (engine/ remains; sub-package layout)

Picked because it is the only approach that simultaneously satisfies:
- The directive's backwards-compat goal (zero Tessera-internal import rewrites)
- The directive's "build artifact verifiable" deliverable (tsc outDir adjustment enables `pnpm pack` to bundle compiled output)
- The R90 chain's R91 budget (no consumption migration; Architect-mandate is to leave consumers unchanged)
- The empirical reality of `pnpm-workspace.yaml` being gitignored (which structurally blocks Option B's workspace-registration premise)

The "less conventional layout" weakness is the only meaningful cost; addressed via README + VENDORING-MANIFEST.md header note documenting the choice.

### A4.2 — Why NOT Option B (monorepo restructure)

Rejected for four reasons:
1. **Backwards-compat risk:** ~120 import lines need rewriting across test/* + tools/* + engine/*.ts internal cross-references. Any miss is a test failure.
2. **`pnpm-workspace.yaml` gitignore conflict:** workspace registration is not committable in this repo per P0.8. Option B's structural premise breaks.
3. **Directive halt condition 11:** the directive itself anticipates the risk of Option B's rename diff including content changes.
4. **Chain budget:** R90 is round 1 of a 4-round chain; R91 is the appropriate round for consumption migration if such restructuring is ever desired. Doing it in R90 conflates extraction with consumption.

### A4.3 — Why NOT Option 3 (decorative-only)

Rejected because npm pack does not allow parent-directory paths in the `files` field (security feature). Without changing tsc's outDir or copying compiled output into the package, the tarball cannot include the engine's library content. This fails-by-design on "build artifact verifiable".

### A4.4 — Why outDir change from `dist/engine` → `engine/dist`

The minimal-disruption way to make `engine/package.json` reference compiled output via relative `./dist/...` is to put the compiled output inside the package. The 1-line change is invisible to all Tessera-internal consumers (P0.9: no scripts / tools / tests / engine code reference `dist/engine` at the path-resolution level; all 3 grep hits are documentation prose).

### A4.5 — Why hard-code ROUND_START_SHA = 65edb85 (no placeholder injection)

The R90 directive commit (`65edb85`) is committed BEFORE the Architect runs. The SHA is stable from the moment of directive-commit onward. The Implementer's chore-A commit is a descendant; the SHA reference resolves cleanly. There is no need for the placeholder-injection-at-chore-B pattern (which is required only when the AC binds against a SHA that doesn't yet exist at spec-emit). This avoids the R53 MINOR-1 / R62 CRITICAL-1 class of structural-vacuity bugs.

### A4.6 — Why band `[16, 17]` (R85 fail-count-band discipline)

- R89 close baseline was `tests=710 / pass=691 / fail=15 / skipped=4` at chore-A (`dbc529d`).
- AC-R89-8 flips PASS → FAIL the moment any subsequent commit changes the first 126 lines of NEXT-ROLE.md (per R89 MAJOR-2). The Architect-emit commit IS such a commit (top-of-file STATUS update lands in same commit as routing block per R83). Therefore at routing-flip HEAD, fail = 16.
- AC-R84-14 contributes 0..+1 stochastic per R85 (~25% flake rate).
- Combined band: `fail ∈ [16, 17]`.
- Empirically verified at round-start HEAD `65edb85` (P0.12): observed 16 + 17 across 3 runs.

The directive's halt-condition `fail ∈ [14, 16]` was inherited from R89 close pre-routing-flip and does not account for AC-R89-8's documented FAIL state at post-routing HEAD. The spec uses the empirically-observed band per R88 false-compliance-attestation discipline.

### A4.7 — Why include `pnpm-workspace.yaml` in ALLOWED_SET despite not modifying it

Three reasons:
1. The directive's ALLOWED enumeration listed it — preserving the listing avoids generating a spurious deviation flag for the Reviewer.
2. The file is gitignored; it will never appear in `git diff` output; the regex entry is structurally inactive.
3. If a future round amends this spec to permit pnpm-workspace.yaml modification (e.g., committing the file via `git add -f` for some hypothetical reason), the ALLOWED_SET already covers it.

Per R82 spec-amendment-ALL-gate-artifacts-propagation: the regex + the path table + EMPIRICAL.sh Block 9 ALLOWED variable are all derived from the same source and updated in lockstep.

### A4.8 — Why prescribe `pack:engine` script (scope extension)

Adding a one-command convenience for the most-likely-operator-invocation (build + pack engine) is low-cost and high-value. It does not change any deliverable; it is invariant under operator preference (operator may strike without affecting other ACs). AC-R90-12 binds existing scripts being preserved, so the addition is non-destructive.

If the Reviewer or operator considers this a violation of "minimal scope", it can be removed at MU stage by deleting one line from root package.json and removing AC-R90-12's `pack:engine` assertion. Architect treats this as low-risk; documented in § 8.3 as explicit scope-extension.

### A4.9 — Why prescribe `.gitignore` `engine/*.tgz` line (scope extension)

The tarball produced by `pnpm pack` is a build artifact that must NOT be committed. Two options:
(a) Per-test cleanup (e.g., delete after AC-R90-8) — fragile (must coordinate test ordering)
(b) Gitignore (idempotent; idempotent across reruns; clean)

Architect picks (b) per CLAUDE-ARCHITECT.md SPEC-PRESCRIPTION-DISCIPLINE composite (R23 ARCH MINOR-2 .gitignore-aware spec inventories). Adding one line to `.gitignore` is minimal blast radius. The amended ALLOWED_SET (§ 5.3) propagates this through the regex + EMPIRICAL.sh Block 9 + path table per R82 discipline.

---

## § A5. Architect pre-prediction (load-bearing for spec § 5.2 + R85 band carry-forward)

| Observable | Predicted | Confidence | Rationale |
|---|---|---|---|
| `pnpm exec tsc` exit 0 (engine build at post-impl HEAD) | YES | HIGH | tsc currently exits 0 at HEAD (P0.10); outDir change is single-line; no semantic shift |
| `pnpm exec tsc -p tsconfig.test.json` exit 0 | YES | HIGH | unchanged code surface; tsconfig.test.json outDir is `.` (independent of root outDir) |
| `pnpm pack` from engine/ exit 0 | YES | HIGH | pnpm pack is the standard pnpm CLI; engine/package.json shape is npm-standard |
| Tarball filename = `johnpatrickwarren-oss-deploysignal-engine-0.1.0-pre.tgz` | YES | HIGH | npm pack convention for scoped packages |
| Tarball contains `package/dist/types/index.js` | YES | HIGH | files glob `dist/**/*.js` matches; tsc emits to engine/dist/types/index.js |
| Tarball excludes test/coordination/tools | YES | HIGH | files field whitelist; npm pack honors files |
| `# tests` at chore-A | 720-724 | HIGH | 710 baseline + 14 q90 ACs (+ possible sub-test inflation in test runner) |
| `# pass` at chore-A | 702-707 | MEDIUM | 690 baseline + 14 q90 ACs - AC-R89-8 routing flip - AC-R84-14 stochastic 0..1 |
| `# fail` at chore-A | 16-17 | HIGH | R85 band derived from § 1.7 |
| `# skipped` at chore-A | 4 | HIGH | unchanged |
| `bash Q-R90-EMPIRICAL.sh` exit 0 (9 blocks PASS) | YES | HIGH | each block independently verified at spec § 8.5 |
| Q-R90-EMPIRICAL.sh probe at round-start HEAD | Block 9 PASS; Blocks 1-6+8 FAIL (expected pre-impl) | HIGH | empirical state pre-impl: artifacts absent |
| Reviewer findings | 0 CRITICAL / 0-1 MAJOR / 0-3 MINOR | MEDIUM | scope is small; well-prescribed; ALLOWED_SET propagation discipline applied; primary risks are tar/pnpm CLI behavior edge cases on Implementer's machine |
| Cross-project rule derivation at MU | 0 new rules | HIGH | Architect-disciplines fully applied; spec contains no claim-without-empirical-walk; no R72-class literal-set drift |

---

## § A6. Amendments from prior version

This is v1 of Q-R90-SPEC. No prior version. No amendments. (R90 directive committed at `65edb85`; Architect session entry SHA verified at `65edb85`; spec-emit at `65edb85` + spec-triad commit on top.)

---

## § A7. Notes for Memorial-Updater

If any of the following surface at Reviewer:
- AC-R90-13 violator path not in ALLOWED_SET → check § 5.3 propagation; spec-amendment-ALL-gate-artifacts-propagation discipline applies
- AC-R90-14 byte-identity failure → engine algorithm or types modification anti-scope violation; HALT
- Test fail count drift beyond `[16, 17]` → AC-R84-14 stochastic flake variance OR a new failure introduced by R90; if new, HALT + DIAGNOSTIC
- `pnpm pack` produces unexpected filename → Architect-spec-prescribed pseudocode pnpm pack convention claim error; root-cause vs pnpm CLI version
- Tarball includes raw .ts sources → `files` field interpretation error; root-cause in § 3.1 prescription

The R90 chain (R90-R93) close at SLICE 3 → AC-P8 ACHIEVED transition. MU at R93 close walks the chain and stamps SLICE 3 + Phase 5 SLICE 3 close.

---

## § A8. Empirical-premise-verification probe log (CLAUDE-ARCHITECT.md EMPIRICAL-PREMISE-VERIFICATION composite — all 28 sub-variants surveyed)

| Sub-variant | Applied at R90? | Evidence |
|---|---|---|
| Fixture accumulation adequacy (R07) | N/A | no e-process AC in R90 |
| OBSERVED-binding scope (R07) | N/A | no PRNG-bound AC in R90 |
| Inherited-testimony verification (R08) | YES | § 0 P0.* all derive from this Architect session commands; no claim inherited |
| Future-state git-simulation verification (R62) | YES | § A2.2 data flow walks chore-A diff at ROUND_START_SHA; no AC has chore-B placeholder-injection vacuity |
| Pre-authored narrative text verification (R71) | YES | § 3.2 README content has no empirical-property claim about engine behavior; § 3.6 VENDORING-MANIFEST insert claims "engine source content is byte-identical to round-start SHA `65edb85` — verified by AC-R90-14" — verified by Architect at spec-emit (engine sentinels unchanged at HEAD) |
| Consumer-side enum value-space cite-then-verify (R72) | N/A | no closed-set TS-union literal prescribed |
| Self-verification-matrix coverage-claim without branch walk (R73) | YES | § 9 P3 + § 5.1 AC coverage walked per-row in § 8 |
| Incomplete alternation enumeration in "no-match" claim (R74) | YES | § 5.3 ALLOWED regex alternations walked individually in § 8.6 |
| AC regex must be self-consistent with spec pseudocode (R74 MINOR-5) | YES | § 8.10 walks AC regex against § 3 pseudocode; README regexes match § 3.2 line content |
| Spec-acknowledged gap minimum mitigation (R74 MINOR-2) | YES | § 5.4 gap table has mitigation column |
| Pre-routing empirical validation gate (R77 OBS-4 + MINOR-2) | YES | § 0 P0.14 documents EMPIRICAL.sh probe-run at spec-emit |
| Discriminating AC threshold padded by 1 trial (R77 MINOR-4) | YES | § 1.7 band uses [16,17] with both extremes empirically observed |
| Spec-prescribed document-mutation instruction must verify target document state (R81 MAJOR-3) | YES | § 3.6 VENDORING-MANIFEST insertion verified against current file structure (line 4 = sync-policy prose; insertion at line 5 between header + per-row table); README.md root not modified — checked for collision with existing `## Install` heading: grepped engine/README.md — file does not exist yet (NEW); no collision |
| AC structural-boundary verification for sectioned documents (R81 MINOR-2) | YES | § 3.2 README section regexes anchor to `^##` (start of line) for each section; § 3.6 VENDORING-MANIFEST insert is bounded by `---` separators |
| Prose-claim-about-post-edit-state (R87 MAJOR-1) | YES | § 8.8 R87 walk — no prose-claim about post-edit state in R90 |
| Pre-emit-grilling cross-spec-section consistency (R01) | YES | § 8.9 sweep |
| Spec pseudocode instantiating named external type (R02) | N/A | no type instantiation |
| File-deletion git-rm verification (R02) | N/A | no deletions in R90 |
| Integration-points re-export verification (R03) | N/A | no re-export prescribed |
| Grep-soundness AC (R03) | N/A | no string-absence AC |
| Test-count AC chore-A SHA anchoring (R22 IMPL MINOR-1) | YES | § 1.5 + § 5.2 + AC-R90-13 all anchor to `ROUND_START_SHA='65edb85'` |
| Component-inventory vs P3 vs pseudocode count cross-check (R05) | YES | 14 ACs in § 5.1; § 3 has 14 pseudocode entries (counting sub-sections); § 9 coverage row says "14 ACs"; consistent |
| JSDoc / file-level docblock coverage (R10) | N/A | no JSDoc-bearing engine file modifications |
| Anti-scope git-diff baseline SHA (R15) | YES | ROUND_START_SHA = `65edb85` = R90 directive commit; § A4.5 rationale |
| Body-level vendored-file delta failure-mode analysis (R18) | N/A | engine files anti-scoped; no delta to vendored content |
| Spec AC preamble attestation-type vs § 4.x classification (R20) | YES | § 5.1 has no preamble classification; § 5.2 separately classifies predictions |
| Spec-commit-sequencing pre-chore-A (R21) | YES | Architect-pipeline contract: spec triad commit lands before Implementer's RED |
| Branch-binding coverage (R21+R28+R34) | YES | § 8.11 Rule 2 row |
| File-level docblock coverage (R10) | N/A | engine files anti-scoped |
| AC anti-scope allowed-set forward-coverage (R25 MAJOR-2) | YES | § 5.3 ALLOWED enumeration + R82 propagation discipline |
| Variable-naming-encodes-false-claim (R44 + R49 + R50) | YES | All Architect-introduced names (`pack:engine`, `engine/*.tgz`, `pack:engine`, `ROUND_START_SHA`) are descriptive and not falsely-suggestive |
| Empirical-AC threshold tightness (R44 MINOR-3 + R46) | YES | AC-R90-9 uses exact-string includes() / excludes pattern; AC-R90-11 anchors to specific 3-pattern co-occurrence; not `>= 1` bare grep |
| Chore-A vs chore-B test-count prediction (R53 MINOR-1) | YES | § 5.2 prediction table separates chore-A / Reviewer / MU columns; no placeholder injection needed (§ A4.5) |
| Halt-condition carve-out for failure-by-construction (R56 MINOR-1) | YES | no failure-by-construction in R90 (no SHA placeholder AC); halt conditions § 6 do not conflict with predicted failures |
| Constructor-options-symbol-drift (R58 MINOR-1) | N/A | no constructor in R90 |
| Post-MOD line-number drift (R58 MINOR-3) | N/A | no inline-guard insertions |
| Routing-block carve-out AC numbers (R65 MINOR-1) | YES | this Architect's NEXT-ROLE.md routing block (at commit time) will copy AC numbers verbatim from § 5.1 by grep |
| Boolean-status field semantic accuracy (R66 MINOR-1) | N/A | no success-response field in R90 |
| Amendment dual-value strikethrough format (R66 MINOR-5) | N/A | no in-spec amendment |
| Narrative vs executable script grep pattern reconciliation (R70 MINOR-2) | YES | § 7 block summaries vs Q-R90-EMPIRICAL.sh script verified consistent |
| AC discrimination via mechanism-named metric (R70 MINOR-3) | YES | AC-R90-9 binds tarball content via tar -tzf grep; same mechanism in EMPIRICAL.sh Block 7 |
| Regex strict-discriminating (R70 MINOR-4) | YES | AC-R90-9 anti-content list checks specific `package/<dir>/` prefixes; AC-R90-11 anchors on date + name + path co-occurrence |
| Pedagogical-claim-binding (R71 MINOR-1) | N/A | no scenario-narrative AC |
| Forward-protection-AC audit (R79 MAJOR-1 + R83 sub-pattern) | YES | § 1.7 + § 5.2 + § A4.6 account for AC-R89-8 forward-protection flip |
| AC-coverage-gap-mitigation-claim specificity (R83 MINOR-1) | YES | § 5.4 each gap has specific mitigation |
| Pass-count arithmetic with flips (R83 MINOR-2) | YES | § A4.6 arithmetic walks each contributor |
| End-to-end-test-race-conditions (R84 MINOR-2) | N/A | no async-termination AC |
| Spec-AC-count-consistency (R84 MINOR-3) | YES | 14 ACs counted in § 5.1; q90 test file has 14 test() blocks per § 3.3 |
| Self-application gate EMPIRICAL.sh shell-command patterns (R85 MAJOR-2) | YES | § 8.5 walks Block 4 (head -60 grep), Block 7 (tar -tzf grep), Block 9 (git diff grep -E -v) at spec-emit |
| Spec-amendment-ALL-gate-artifacts-propagation (R82 MAJOR-1 + R88 sub-pattern) | YES | § 5.3 narrative table, § 5.3 regex, EMPIRICAL.sh Block 9, and AC-R90-13 are 4 surfaces — all updated in lockstep |
| Empirical command verification distinguish global vs anchored patterns in infrastructure files (R88 MAJOR-1) | YES | P0.5 + P0.7 use direct Read + git check-ignore (correct semantics for global pattern; not bare grep) |
| Prose-claim-about-post-edit-state (R87 MAJOR-1) | YES | § 8.8 R87 sub-pattern check |
| Pre-emit grilling 9 gates (Rule 5 self-application) | YES | § 8.1 - § 8.11 (11 gates exceed the canonical 9; covers AC-coverage gates from R88 + R89 lessons) |

**No empirical premise is unchecked. No claim is inherited. No prediction is unanchored.** Architect proceeds to route.
