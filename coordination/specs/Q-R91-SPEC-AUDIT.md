# Q-R91-SPEC-AUDIT — Architect audit-trail sidecar

_Audit-trail content per CLAUDE-ARCHITECT.md § 6 (sidecar separates audit-trail from Implementer-facing spec proper). Reviewer reads both files; the Implementer reads only Q-R91-SPEC.md._

ROUND_START_SHA = `a63da14`.

---

## § A1 Brainstorm — 3+ approaches with strengths/weaknesses/hidden assumptions/risks

Per Superpowers Brainstorm phase + CLAUDE-COMMON.md universal discipline. The directive named 4 candidate approaches; this audit walks all 4 with full trade-off analysis before selection.

### § A1.1 The 4 candidate approaches

#### Approach A — TypeScript paths mapping + file: dependency (single tsc invocation in pretest)

**Mechanism**:
- tsconfig.json adds `compilerOptions.paths` mapping `@johnpatrickwarren-oss/deploysignal-engine` → `./engine/types/index` and `@johnpatrickwarren-oss/deploysignal-engine/*` → `./engine/*` (engine source paths)
- root package.json adds `dependencies."@johnpatrickwarren-oss/deploysignal-engine": "file:./engine"`
- pnpm install creates `node_modules/@johnpatrickwarren-oss/deploysignal-engine` → `./engine` symlink
- Node resolves runtime imports via symlink + engine/package.json exports → engine/dist/*.js
- tsc resolves compile-time imports via paths mapping → engine/*.ts source

**Strengths**:
- Workspace-config-free (no pnpm-workspace.yaml workspace section needed)
- gitignore-compatible (R82 .gitignore line 24 `pnpm-workspace.yaml` exclusion preserved)
- Closest dogfood to DS-side migration pattern (R92 will likely use the same pattern)

**Weaknesses**:
- Dual-resolution mechanism — tsc reads engine source; Node reads engine/dist; they must stay consistent (mitigated by tsc producing semantically-equivalent .d.ts/.js from source)
- Relies on Implementer running `pnpm install` once; missing step → no symlink → runtime resolution fails
- If engine/dist is stale (developer ran `node --test` without `pnpm test`), Node runtime imports may fail OR resolve to stale code

**Hidden assumptions**:
- pnpm v11.1.2 file: dep creates a working symlink (verified by reading pnpm v11 docs + existence of similar patterns in pnpm ecosystem)
- Node Symlink + exports field combination resolves correctly (per Node ESM docs, yes)
- tsc emits .d.ts shapes consistent with .ts source (true in normal usage)

**Risks**:
- Implementer ad-hoc invocation of `node --test` (bypassing pretest) → stale engine/dist → runtime resolution fails on changed semantics
- pretest fails silently if `tsc` fails — but tsc exit propagates through `&&` chain so pretest sees the failure

#### Approach B — Force-commit pnpm-workspace.yaml with engine workspace entry

**Mechanism**:
- Edit pnpm-workspace.yaml to add `packages: ["engine"]` while preserving `allowBuilds: esbuild: true`
- `git add -f pnpm-workspace.yaml` + revert .gitignore line 24 (`pnpm-workspace.yaml` exclusion removed)
- pnpm install treats engine/ as a workspace package; creates a workspace-symlink at node_modules/@johnpatrickwarren-oss/deploysignal-engine

**Strengths**:
- Standard pnpm workspace flow (a well-trod path)
- Single resolution mechanism (workspace symlink); no dual-resolution-mode tension
- Future-proof for adding more in-tree packages

**Weaknesses**:
- OVERRIDES R82 .gitignore intent — pnpm v11 auto-overwrites pnpm-workspace.yaml during builds; the gitignored state was specifically to prevent pnpm-overwrite-vs-committed-state divergence
- Needs OPERATOR CONCURRENCE per directive halt condition 12: "Approach B chosen without operator concurrence documented in spec § A1: HALT"
- Adds escalation friction if operator declines → wasted Architect cycle
- Mixes workspace declaration (packages) with build-approval config (allowBuilds) in same file — two purposes for one file

**Hidden assumptions**:
- Operator will concur with reverting R82 .gitignore (NOT pre-secured — would require ESCALATE)
- pnpm v11 won't re-overwrite pnpm-workspace.yaml during install (would silently break workspace declaration)

**Risks**:
- R82 build-approval mechanism breaks if pnpm overwrites the file with auto-generated content (loses workspace declaration; or loses allowBuilds entries)
- Operator-decline at routing-time → spec must amend back to Approach A (additional round overhead)

#### Approach C — Subpath imports via root package.json `imports` field

**Mechanism**:
- Root package.json adds `"imports": { "#deploysignal-engine/*": "./engine/dist/*" }`
- All consumer imports become `#deploysignal-engine/...` (Node `#`-prefixed subpath imports)
- No paths mapping; no workspace; no file: dep

**Strengths**:
- Node-native (no TypeScript-specific resolution mechanism)
- Simplest single-mechanism approach
- No workspace overhead

**Weaknesses**:
- **DEFEATS THE DOGFOODING PURPOSE**: R91 directive intent is to validate consumption of the PUBLISHED PACKAGE NAME `@johnpatrickwarren-oss/deploysignal-engine`. The `#`-prefix subpath import is a different mechanism (intra-package, not external-package). DS-side migration (R92) would NOT follow the same pattern.
- tsc with `moduleResolution: "node"` does NOT honor `imports` field (only `node16` / `nodenext` / `bundler` do). Would need `moduleResolution` change → expansion of R91 anti-scope.

**Hidden assumptions**:
- moduleResolution upgrade is "safe" (false — would re-typecheck the entire engine surface with potentially-different resolution semantics)

**Risks**:
- moduleResolution change cascades through the entire repo's typecheck behavior; uncatchable at chore-A unless we run the entire suite. Anti-scope expansion + risk of unrelated test regressions.

#### Approach D — Hybrid: paths mapping + file: dep + pretest chain with leading engine build

**Mechanism**: Approach A + pretest extended from `tsc -p tsconfig.test.json` to `tsc && tsc -p tsconfig.test.json`. The leading `tsc` (root tsconfig) builds engine/dist BEFORE the second tsc (tsconfig.test.json) builds test+tools.

**Strengths**:
- All Approach A strengths preserved
- Pretest hook makes engine/dist guaranteed-current before tests run (mitigates Approach A's stale-dist risk)
- pnpm pretest ordering guarantees engine/dist exists before any `node --test` invocation through `pnpm test`

**Weaknesses**:
- All Approach A weaknesses except stale-dist (mitigated)
- pretest does double-tsc work (~1-2s added per test run)

**Hidden assumptions**:
- pretest hook fires reliably under all CI/local invocation patterns (true for `pnpm test`; not true for ad-hoc `node --test`)

**Risks**: Same as Approach A but stale-dist risk mitigated for the canonical `pnpm test` path.

### § A1.2 Constraints from PRD / directive eliminating options

| Constraint | Source | Implication |
|---|---|---|
| Directive halt condition 12: "Approach B chosen without operator concurrence documented in spec § A1: HALT" | R91 directive | Approach B requires operator pre-concurrence to be safe; not pre-secured at session entry; risk of ESCALATE cycle |
| Directive purpose: "dogfoods the R90-extracted engine package by switching Tessera's OWN internal consumers" + "validate as a consumable" | R91 directive § Motivation | The purpose is to validate consumption of the actual package name. Approach C (which uses `#`-prefix) does NOT use the package name; defeats the directive intent. ELIMINATES C. |
| R82 .gitignore intent (pnpm-workspace.yaml line 24 gitignored to avoid pnpm-overwrite issues) | CROSS-PROJECT-MEMORIAL.md R82 + Q-R82 spec | Approach B would override this. Preserving R82 requires Approach A or D. |
| R85 fail-count-band discipline (avoid escalations driven by mechanical infrastructure) | CROSS-PROJECT-MEMORIAL.md R85 + R83 | Approach B's ESCALATE risk is high; Approach A or D is the lower-risk choice |
| Directive recommendation: "Approach A or D recommended as least invasive" | R91 directive § Primary deliverables | Confirms D is the directive-aligned choice |

### § A1.3 Selection — Approach D

**Selected: Approach D**.

**Why-picked**:
- Preserves all directive-stated intent (dogfooding the actual package name; not modifying R82's `.gitignore` or `pnpm-workspace.yaml`)
- Single-step Implementer flow with no operator-escalation requirement (unlike B)
- Explicit handling of dual-compile-mode tension via pretest chain (improves on Approach A)
- Closest fit to expected R92 DS-side pattern (post-R91 the same technique transfers to DS-side migration)
- Lowest-risk path through the round (no operator-decision cycle; no moduleResolution change)

**Why-rejected — Approach A**:
- Subsumed by D (D = A + pretest chain extension; the only delta is the leading `tsc &&`)
- Stale-dist risk is real if Implementer (or future contributor) invokes `node --test` ad-hoc

**Why-rejected — Approach B**:
- Requires operator concurrence to revert R82 `.gitignore` exclusion of `pnpm-workspace.yaml`
- Operator concurrence NOT pre-secured at Architect session entry; obtaining it requires ESCALATE
- ESCALATE cycle adds overhead; if operator declines, must amend back to A or D (wasted work)
- Mixes pnpm-workspace.yaml's two purposes (workspace declaration vs build-approval) — fragility risk

**Why-rejected — Approach C**:
- Defeats the directive's dogfooding purpose (uses `#`-prefix not package name)
- Requires moduleResolution change → R91 anti-scope expansion → risk of unrelated test regressions
- DS-side migration (R92) would NOT follow the same pattern (DS-side will consume Tessera-published package by its name, not by `#`-prefix subpath imports)

---

## § A2 Design sketch (Superpowers Design phase)

### § A2.1 Component boundaries

**Exists at round-start (frozen by R91 anti-scope)**:
- `engine/detectors/*.ts` (Family A/C/D/E detector algorithms)
- `engine/fleet/*.ts` (fleet detector + e-BH FDR)
- `engine/l0/*.ts` (L0 schema-continuity + counter-rate-transform)
- `engine/o0/*.ts` (orchestration)
- `engine/per-shard/*.ts` (per-shard runtime + welford + warm-start)
- `engine/topology/*.ts` (topology adapters: slurm, k8s, nvlink, neuron, tpu, common-mode-attribution, fetch-context)
- `engine/events/*.ts` (event-feed + freeze-hook + event-conditional-attribution)
- `engine/ds-integration/*.ts` (DS event-consumer + feed + freeze-hook-factory)
- `engine/types/*.ts` (config + verdict + primitives + metrics + agent + audit + policy + orchestration + self-normalized-fallback + index barrel + families/*)
- `engine/core.ts`, `engine/topology-overlay.ts`, `engine/signal-classes.ts`, `engine/verdict-groups.ts`, `engine/hardware-topology-source.ts`, `engine/loader.ts`, `engine/per-detector-resampler-mode.ts`
- `engine/package.json` (R90 deliverable; 34-entry exports map)
- `engine/README.md` (R90 deliverable)
- `engine/dist/*` (R90-produced build artifact; gitignored; will be regenerated)
- `.gitignore` (R82 preserved)
- `pnpm-workspace.yaml` (R82 preserved; gitignored)

**Created at chore-A**:
- `test/q91-engine-package-consumption.test.ts` (NEW; 14 ACs)
- `coordination/specs/Q-R91-SPEC.md` (NEW)
- `coordination/specs/Q-R91-SPEC-AUDIT.md` (NEW; this file)
- `coordination/specs/Q-R91-EMPIRICAL.sh` (NEW)
- `coordination/reviews/REVIEWER-REPORT-R91.md` (NEW; Reviewer authors)
- `coordination/logs/ROUND-R91-*.md` (NEW; routing/summary)
- `node_modules/@johnpatrickwarren-oss/deploysignal-engine` (NEW symlink; not git-tracked)

**Changed at chore-A**:
- `tsconfig.json` (+5 lines for paths + baseUrl)
- `package.json` (+3 lines for dependencies; 1 line modified for pretest)
- `pnpm-lock.yaml` (auto-regenerated by pnpm install)
- ~30 `test/*.test.ts` files (mechanical import migration; semantic content unchanged)
- 5 `test/_substrate/*.ts` files (mechanical import migration; 3-level paths)
- ~9 `tools/*.ts` files (mechanical import migration)
- 1 `tools/calibrators/*.ts` file (mechanical import migration; 3-level paths)
- `coordination/VENDORING-MANIFEST.md` (R91 header note insertion)
- `coordination/MEMORIAL.md` (Memorial appends per role)
- `coordination/NEXT-ROLE.md` (routing block updates per role)

### § A2.2 Data flow diagram

```
[ Architect ]
     │
     ├─→ commit spec triad (this commit)
     │       Q-R91-SPEC.md
     │       Q-R91-SPEC-AUDIT.md  ← this file
     │       Q-R91-EMPIRICAL.sh
     │
     ├─→ probe-run EMPIRICAL.sh at HEAD (R86 prophylactic)
     │       expect: 9 FAIL / 1 PASS (matches pre-impl prediction)
     │
     └─→ commit NEXT-ROLE.md routing block + MEMORIAL append + this audit attestation
     
[ Implementer ]                                  
     │                                           
     ├─→ RED commit: drop test/q91-…test.ts      
     │       expect: 10+ FAIL / few PASS         
     │       (the q91 ACs that don't depend on   
     │        post-impl artifacts may PASS here) 
     │                                           
     ├─→ GREEN commit (chore-A):                 
     │       a) edit tsconfig.json (paths + baseUrl)
     │       b) edit package.json (dep + pretest)
     │       c) pnpm install (creates symlink + lockfile update)
     │       d) apply migration regex to ~45 files
     │       e) insert VENDORING-MANIFEST.md note
     │
     └─→ run Q-R91-EMPIRICAL.sh
             expect: 10 PASS / 0 FAIL, exit 0

[ pnpm test invocation chain at chore-A HEAD ]
     │
     ├─→ pretest fires
     │       1st: tsc                 → builds engine/dist/*.js
     │       2nd: tsc -p tsconfig.test.json → builds test/*.js + tools/*.js + engine/*.js co-located
     │
     ├─→ test fires: node --test test/*.test.js
     │       imports resolve at runtime via:
     │         @johnpatrickwarren-oss/deploysignal-engine/<sub>
     │              │
     │              ↓
     │         node_modules/@johnpatrickwarren-oss/deploysignal-engine/   [symlink]
     │              ↓ (symlink target)
     │         engine/                                                    [source dir]
     │              ↓ (reads package.json exports map)
     │         engine/dist/<sub>.js                                       [built artifact]
     │
     └─→ tap output: tests=738±, pass=716±, fail=17-20±, skip=4

[ tsc compile chain at chore-A HEAD ]
     │
     ├─→ For test/foo.test.ts containing
     │       import { X } from '@johnpatrickwarren-oss/deploysignal-engine/types/verdict'
     │
     ├─→ tsc applies tsconfig.test.json (extends tsconfig.json)
     │       sees compilerOptions.paths from tsconfig.json
     │       matches @johnpatrickwarren-oss/deploysignal-engine/* with * = types/verdict
     │       resolves to ./engine/types/verdict
     │       tries .ts → engine/types/verdict.ts (exists) ✓
     │
     └─→ tsc type-checks against engine/types/verdict.ts (source); emits test/foo.test.js
```

### § A2.3 Integration points + verification source

| # | Integration | Verification AC |
|---|---|---|
| 1 | tsc compilation ↔ tsconfig.json paths mapping | AC-R91-3 (mapping present); AC-R91-8 (tsc exits 0) |
| 2 | pnpm install ↔ node_modules symlink creation | AC-R91-4 (file: dep declared); AC-R91-6 (symlink exists) |
| 3 | Node runtime ↔ symlink + exports map | AC-R91-7 (5 require.resolve probes) |
| 4 | pretest chain ↔ engine/dist build sequencing | AC-R91-5 (pretest extended); AC-R91-9 (engine/dist sentinels exist) |
| 5 | Consumer files ↔ package-path imports | AC-R91-1 (zero relative); AC-R91-2 (≥50 package-path) |
| 6 | q91 test self-binding ↔ no relative imports in test file | AC-R91-10 (negative self-check) |
| 7 | Engine source frozen ↔ R77/R90 anti-scope | AC-R91-13 (engine sentinels byte-identical) |
| 8 | R90 deliverables frozen ↔ R90 anti-scope forward-protection | AC-R91-14 (package.json + README byte-identical) |
| 9 | Anti-scope adherence ↔ ALLOWED_REGEX gate | AC-R91-12 (diff ⊆ ALLOWED) |
| 10 | VENDORING-MANIFEST.md ↔ R91 documentation requirement | AC-R91-11 (R91 + R90 headers both present) |

### § A2.4 Failure modes per integration point

| # | Failure mode | Detection |
|---|---|---|
| 1 | paths mapping key typo (e.g., missing `/` in subpath wildcard) | AC-R91-3 deepEqual fails OR AC-R91-8 tsc non-zero |
| 2 | pnpm install fails (e.g., pnpm version mismatch, network issue) | AC-R91-6 symlink absent OR halt condition 13 fires |
| 3 | Stale engine/dist (developer ad-hoc node --test bypassing pretest) | AC-R91-9 sentinel absent OR AC-R91-7 require.resolve returns stale path |
| 4 | pretest hook not extended; engine/dist NOT built before tests | AC-R91-5 string mismatch OR AC-R91-7 require.resolve fails |
| 5 | Some consumer files missed in migration | AC-R91-1 grep returns non-empty OR AC-R91-2 file count < 50 |
| 6 | q91 test file accidentally contains `'../engine'` literal | AC-R91-10 fails |
| 7 | Engine source modified (anti-scope violation) | AC-R91-13 sentinel byte-identity fails |
| 8 | R90 deliverable modified (anti-scope violation) | AC-R91-14 byte-identity fails |
| 9 | Non-ALLOWED path added | AC-R91-12 violators non-empty |
| 10 | VENDORING-MANIFEST.md update missed or malformed | AC-R91-11 regex fails |

---

## § A3 Pre-route discipline application (R86 + R87 + R88 + R89 + R90 sub-patterns)

### § A3.1 R86 prophylactic — probe-run EMPIRICAL.sh at spec-emit

Per CROSS-PROJECT-MEMORIAL.md REINFORCED 2026-05-20 + R89 sub-pattern: probe-run Q-R91-EMPIRICAL.sh against round-start HEAD `a63da14` BEFORE routing. Expected outcome documented at Q-R91-SPEC.md § 8.11 (9 FAIL / 1 PASS pre-impl).

Probe-run is performed after the spec-triad files are written but BEFORE the Architect routes to Implementer. The actual probe-run output is captured in a routing-time attestation in NEXT-ROLE.md or in this audit's § A7.

### § A3.2 R87 sub-pattern — prose-claim-about-post-edit-state

R91 has 2 edit-of-existing-file patterns with prose claims about post-edit state:

(1) **`tsconfig.json` Delta 1 (§ 3.1)**: claim — "`baseUrl` + `paths` must be sibling keys of `moduleResolution` inside `compilerOptions`". Verification: opened `tsconfig.json` at HEAD `a63da14`; confirmed `compilerOptions` block exists and accepts sibling keys (existing keys: `strict`, `target`, `module`, `moduleResolution`, ...). Post-edit prose claim holds ✓.

(2) **`package.json` Delta § 3.2.1**: claim — "Insert IMMEDIATELY BEFORE the existing `"devDependencies": {` key". Verification: opened `package.json` at HEAD `a63da14`; confirmed `devDependencies` exists at line 36; valid JSON requires `dependencies` to be inserted with trailing comma before it. Post-edit prose claim holds ✓.

### § A3.3 R88 grep-semantics for .gitignore

P0.3 + P0.4 do NOT use bare grep (`grep tools .gitignore`-style) to check .gitignore matching behavior. They use direct file `Read` of `.gitignore` (confirming the literal pattern at line 24) AND `git ls-files pnpm-workspace.yaml` (confirming actual tracking state). The R88 MAJOR-1 lesson is honored.

### § A3.4 R89 sub-pattern — EMPIRICAL.sh TAP reporter flag ordering

Q-R91-EMPIRICAL.sh Blocks invoking `node --test` MUST use `--test-reporter=tap` BEFORE test files (`node --test --test-reporter=tap test/*.test.js`). Verified at Q-R91-EMPIRICAL.sh source. R89 MAJOR-1 lesson honored.

### § A3.5 R89 MAJOR-2 sub-pattern — no "first N lines byte-identical" against working-tree files

R91 has NO ACs of the form "first N lines byte-identical to source". AC-R91-13 + AC-R91-14 use `git show <SHA>:<path>` for full-content byte-identity against the stable ROUND_START_SHA `a63da14`. R89 MAJOR-2 lesson honored.

### § A3.6 R90 P0.8 lesson — gitignored config files

Approach D was selected SPECIFICALLY to avoid modifying `.gitignore` or `pnpm-workspace.yaml`. If Approach B had been chosen, this section would document operator concurrence rationale per R90 P0.8. § A1.3 records why Approach B was rejected.

### § A3.7 R82 spec-amendment-ALL-gate-artifacts-propagation

ALLOWED_SET appears in 4 byte-mirrored surfaces:
- Spec § 5.2 narrative inventory table (human-readable; reason column)
- Spec § 5.3 machine regex
- AC-R91-12 inline regex (in test file source per § 3.4)
- Q-R91-EMPIRICAL.sh Block 9 ALLOWED variable

All 4 surfaces walked at spec-emit; byte-identical regex content confirmed (the test-file inline regex and the EMPIRICAL.sh variable are identical except for shell quoting semantics — both encode the same alternation). R82 propagation discipline honored.

### § A3.8 R72 cite-then-verify

Every literal subpath enumerated in § 3.3 path table is verified against engine/package.json exports map (P0.13). Every line citation in this spec is cite-then-verify (e.g., `package.json:36` for devDependencies position — verified via direct Read).

### § A3.9 R65 routing-block cite-then-verify

The Architect routing block to Implementer in NEXT-ROLE.md will cite ACs and section numbers from this spec. All citations are byte-copied from the spec via grep — not re-typed from memory (R65 MINOR-1 lesson honored).

---

## § A4 Decision rationale (why-picked / why-rejected per major decision)

### § A4.1 Resolution mechanism: Approach D over A/B/C

See § A1.3.

### § A4.2 paths mapping target: `./engine/types/index` (bare) and `./engine/*` (wildcard)

**Why-picked**: 
- The bare `@johnpatrickwarren-oss/deploysignal-engine` import (without subpath) should resolve to the types barrel at `engine/types/index.ts` (consistent with engine/package.json `.` export key pointing at `./dist/types/index.js`).
- The wildcard `@johnpatrickwarren-oss/deploysignal-engine/*` maps to `./engine/*` (any sub-path under engine). Captures every subpath enumerated in engine/package.json exports map.

**Why-rejected alternatives**:
- `["./engine"]` (directory; no index.ts file path): would force tsc to find `engine/index.ts` (which doesn't exist; engine has no root barrel — engine/types/index.ts is the barrel)
- `["./engine/types/index", "./engine/*"]` for both keys: redundant; the bare key wouldn't need the wildcard's resolution

### § A4.3 .js extension stripping during migration

**Why-picked**: engine/package.json exports map keys are extensionless (e.g., `./detectors/*` not `./detectors/*.js`). Imports must match the exports key style. Stripping `.js` suffix from `from '../engine/detectors/foo.js'` is mandatory.

**Why-rejected**: keeping `.js` would force tsc paths mapping to look for `engine/detectors/foo.js.ts` (won't exist) AND Node runtime to look for the `.js` literal in the exports key (also won't match wildcard).

### § A4.4 ROUND_START_SHA = `a63da14` (directive commit; pre-spec-triad)

**Why-picked**: the directive commit is the parent of the spec-triad commit; SHA is stable from directive-commit onward; no placeholder injection needed; avoids R53 MINOR-1 + R62 CRITICAL-1 class structural-vacuity risk (where placeholder SHAs are injected at chore-B and ACs become structurally unsatisfiable).

**Why-rejected — chore-A SHA**: chore-A SHA is the Implementer's commit, which doesn't exist at spec-emit time; would require placeholder injection per R53; carries structural-vacuity risk.

### § A4.5 AC count: 14 (within directive target ≥8)

**Why-picked**: directive said "at least 8 ACs"; spec delivers 14 to cover:
- 2 grep-based migration completeness (AC-R91-1, AC-R91-2)
- 3 config-file structure (AC-R91-3, AC-R91-4, AC-R91-5)
- 2 installation + resolution (AC-R91-6, AC-R91-7)
- 1 compile (AC-R91-8)
- 1 build-artifact sentinel (AC-R91-9)
- 1 self-binding (AC-R91-10)
- 1 documentation (AC-R91-11)
- 1 anti-scope (AC-R91-12)
- 2 forward-protection (AC-R91-13, AC-R91-14)

**Why-rejected — fewer (8-10)**: would compromise § 5.4 acknowledged-gap coverage. R74 MINOR-2 minimum-mitigation discipline pairs each gap with either an AC or explicit mitigation; reducing ACs would require additional gaps that aren't load-bearing-justified.

**Why-rejected — more (15+)**: each extra AC adds Reviewer audit burden + branch-binding-coverage table burden; saturating coverage of all 50 individual consumer files via separate ACs adds no incremental value over the aggregate grep guards (AC-R91-1 + AC-R91-2) + tsc aggregate (AC-R91-8).

### § A4.6 Pretest chain order: `tsc && tsc -p tsconfig.test.json` (engine first, then tests)

**Why-picked**: engine/dist must exist before Node runtime imports resolve through the symlink + exports map. The leading `tsc` (root tsconfig.json) builds engine/dist; the trailing `tsc -p tsconfig.test.json` builds tests + tools co-located. Order matters: engine first, tests second.

**Why-rejected — reverse order**: tests would resolve through stale or missing engine/dist on first run.

**Why-rejected — combine into single tsc run**: the two tsconfigs have different `outDir`/`rootDir`/include/exclude settings that conflict (root: rootDir=engine, outDir=engine/dist; test: rootDir=., outDir=.). A combined run is technically possible but harder to reason about.

### § A4.7 Pre-impl baseline: observed 18-19 fail; predicted [17, 20] band

**Why-picked**: documented in § 1.4. Directive's stated band [16,17] is empirically refuted at R91 round-start (observed 18-19). Per R88 false-compliance-attestation discipline, spec uses empirically-observed band ± stochastic variance. Halt condition 3 binds the band.

**Why-rejected — directive's [16,17] band**: directly contradicts P0.11 observation. Encoding it would force the Implementer into halt-discipline violation at chore-A (binding-command empirical contradicts AC literal).

---

## § A5 Architect pre-prediction on outcomes

| Predicted observable | Expected value at chore-A |
|---|---|
| AC-R91-1 grep output | empty ✓ |
| AC-R91-2 file count | ~50-51 (50 consumers + q91 test file matches own string literal) |
| AC-R91-3 paths mapping | matches spec § 3.1 verbatim |
| AC-R91-4 file: dep | `"file:./engine"` |
| AC-R91-5 pretest | `"tsc && tsc -p tsconfig.test.json"` |
| AC-R91-6 symlink type | symlink (on macOS/Linux; pnpm v11 default) |
| AC-R91-7 5 resolves | each returns path under `engine/dist/...` |
| AC-R91-8 tsc exit | 0 |
| AC-R91-9 sentinels | 5/5 exist |
| AC-R91-10 self-binding | passes (no relative imports in own source) |
| AC-R91-11 VENDORING-MANIFEST | matches all 3 regex |
| AC-R91-12 anti-scope diff | violators empty |
| AC-R91-13 engine sentinels | 10/10 byte-identical |
| AC-R91-14 R90 deliverables | 2/2 byte-identical |
| Full test count | tests=738, pass=716, fail=18, skip=4 (±2 stochastic) |
| Q-R91-EMPIRICAL.sh exit | 0 (10 PASS) at chore-A HEAD |
| Tarball / git tag | NONE (R91 stays Tessera-internal per anti-scope) |

---

## § A6 Amendments from prior version

N/A — initial spec emission. If ESCALATE-resolution amendments occur, this section will record each amendment with its triggering ESCALATE DIAGNOSTIC reference + operator disposition.

---

## § A7 Probe-run output (R86 prophylactic — populated after spec-triad commit)

_To be filled in by Architect after Q-R91-EMPIRICAL.sh is finalized + spec-triad committed; before NEXT-ROLE.md routing block lands._

**Expected per § 8.11**: 9 FAIL / 1 PASS at round-start (pre-impl):
- Block 1 (paths) FAIL — not yet added
- Block 2 (file: dep) FAIL — not yet added
- Block 3 (pretest extended) FAIL — current pretest is `tsc -p tsconfig.test.json`
- Block 4 (node_modules symlink) FAIL — no install yet
- Block 5 (5 resolves) FAIL — no install
- Block 6 (zero relative engine imports) FAIL — 50 files still use relative
- Block 7 (tsc -p tsconfig.test.json exits 0) PASS — current state compiles
- Block 8 (test count band) FAIL — tests=724 outside [736,740]
- Block 9 (anti-scope diff) PASS — at round-start HEAD = ROUND_START_SHA, diff empty
- Block 10 (VENDORING-MANIFEST R91 header) FAIL — not yet added

**Actual probe-run output** (verbatim per R26 + R88 encode-actual-results-verbatim discipline):

```
── Block 1: tsconfig.json paths mapping present ──
  FAIL: tsconfig.json paths/baseUrl absent or wrong: key1=NO key2=NO baseUrl=undefined
── Block 2: package.json file: dep present ──
  FAIL: package.json file: dep absent or wrong: actual='undefined'
── Block 3: package.json pretest extended ──
  FAIL: package.json scripts.pretest wrong: actual='tsc -p tsconfig.test.json'
── Block 4: node_modules symlink/dir exists ──
  FAIL: node_modules/@johnpatrickwarren-oss/deploysignal-engine absent; pnpm install must run
── Block 5: 5 representative require.resolve probes ──
  FAIL: 5 / 5 subpath resolves failed
── Block 6: zero relative ../engine imports in test/ + tools/ ──
  FAIL: 50 files still contain relative ../engine imports
── Block 7: pnpm exec tsc -p tsconfig.test.json --noEmit exits 0 ──
  PASS: tsc -p tsconfig.test.json --noEmit exit 0
── Block 8: full test count band [R85 + R83] ──
  FAIL: test counts out of band: tests=724 pass=701 fail=19 (band [736,740]/[714,718]/[17,20]; pre-impl q91 ACs not yet present so test count below MIN)
── Block 9: anti-scope diff ⊆ ALLOWED_SET ──
  PASS: anti-scope diff round-start..HEAD ⊆ ALLOWED_SET
── Block 10: VENDORING-MANIFEST.md R91 + R90 headers ──
  FAIL: VENDORING-MANIFEST.md missing R91 header

─── Q-R91-EMPIRICAL.sh summary ───
  PASS: 2 / 10 blocks
  FAIL: 8 / 10 blocks
```

**Verdict**: Probe-run matches § 8.11 per-block predictions (Blocks 1-6 + 8 + 10 FAIL; Blocks 7 + 9 PASS). Note one observed fail-count value at Block 8 = 19 (within pre-impl [18,19] stochastic range observed across 3 prior baseline runs at HEAD `a63da14`); does not affect Block 8 PASS/FAIL state at probe time (already FAIL due to test count out of band). R86 prophylactic gate honored.
