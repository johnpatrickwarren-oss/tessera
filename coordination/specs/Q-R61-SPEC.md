# Q-R61-SPEC — Phase 3 SLICE 3 WU-Phase3-3A: engine npm package extract

**Round:** R61 (full tier — Architect + Implementer + Reviewer + Memorial-Updater).
**Cluster shape:** single-cluster (Wave 9 of `coordination/WAVE-PLAN-09.md`; sole WU = WU-Phase3-3A; foundation for Wave 10 WU-3B + WU-3C).
**Phase / SLICE:** Phase 3 SLICE 3 — engine npm package extract; vendoring-drift R-E6 structural resolution.
**Scope reference:** `coordination/PRD.md` § Phase 3 SLICE 3 (FR-D1 line 439; AC-P8 line 450; SLICE structure line 485) + `coordination/WAVE-PLAN-09.md` Step 1 WU-Phase3-3A row + Step 3 Judgment calls 3+4+5+6 + `coordination/NEXT-ROLE.md` R61 round-scope directive + operator dispositions W3-1/W3-2/W3-3/W3-4/W3-5 + `coordination/SCOPING-MEMO-v0.3.md` § 9 (engine vendoring policy) + `coordination/VENDORING-MANIFEST.md` (current per-file SHA pin state at SHA `5a72371`).
**PRD trace:** FR-D1 (engine extract) · AC-P8 (vendoring-drift R-E6 structural elimination) · cross-cutting AC-P1/P2/P3/P4 preserved (Phase 1+2 ACs hold unchanged post-extract).
**Round-start SHA (anti-scope diff lower bound):** `8c64ce0` (chore: prepare R61 directive — WU-Phase3-3A npm extract; full-tier; verified at session entry via `git rev-parse HEAD`).
**Empirical baseline at session entry (verified by Architect via `node --test --test-reporter=tap test/*.test.js`):** `tests=399 / pass=394 / fail=2 / skipped=3`. Known fails: (a) `AC-R36-30 round-start-to-chore-A diff path-set ⊆ R36 allowed-set`; (b) `AC-R36-31 chore-A-to-HEAD diff ⊆ R36 post-chore-A allowed set`. Both are R36 forward-protection guards inheriting from Phase 2 close `87e372f`; their CHORE_A_SHA literal is structurally older than HEAD. **R61 IS EXPECTED TO BREAK these forward-protection guards further** because the extract operation by definition modifies many files outside R36's frozen allowed-set; the breakage is pre-documented in § 5.4 and not a halt trigger.
**Empirical typecheck baseline (verified via `npx tsc -p tsconfig.test.json`):** exit code 0; zero diagnostics. R61 must preserve tsc exit 0 post-extract.
**Operator dispositions applied (from NEXT-ROLE.md):** W3-1 = A (Tessera-only extract; DS-side via separate PR); W3-2 = B (Tessera monorepo sub-package at `packages/deploysignal-engine/`); W3-3 = Coordinator default A/A (engine/ds-integration deferred to R63; shared-types not pre-landed this round); W3-4 = A (NO new external dependencies); W3-5 = A (opportunistic SCOPING-MEMO § 9 amendment IF spec naturally touches; otherwise deferred).

---

## § 0 Brainstorm phase (Superpowers — inline)

Four architectural axes have genuine multi-option choices. Each is brainstormed with three distinct approaches with strengths / weaknesses / hidden assumptions / risks, and a selection rationale.

### § 0.1 File-move strategy — physical-move vs path-redirect stub vs hybrid

**Approach A — Physical `git mv` of vendored-at-pin engine/* files to `packages/deploysignal-engine/src/`, preserving subtree layout (PICKED).** The 33 vendored-at-pin engine/* files (per `coordination/VENDORING-MANIFEST.md` § DeploySignal engine vendoring) move to mirror paths under `packages/deploysignal-engine/src/`: `engine/detectors/page-cusum.ts` → `packages/deploysignal-engine/src/detectors/page-cusum.ts`, etc. Internal package imports (file-to-file inside `packages/deploysignal-engine/src/`) remain relative and unchanged (since the whole subtree moves together preserving relative structure). The Tessera tree retains only the vendored-with-deltas files (3) + Tessera-original engine files (21). The 3 vendored-at-pin `tools/*` files (`tools/curate-baseline-pipeline.ts`, `tools/calibrators/_shared.ts`, `tools/calibrators/family-c.ts`) stay at `tessera/tools/` because they are CONSUMERS of the engine, not engine surface — they get their engine-imports rewritten to point at the package.

- **Strengths:** Single source of truth — package owns the at-pin files; no path indirection. `git mv` preserves git history (renames detected by git). Vendoring-drift R-E6 structurally eliminated for the moved subset: there is no `tessera/engine/...` vendored file to drift; the package version pin IS the SHA pin. AC-P8 ("both Tessera + DeploySignal repos consume the same version") becomes achievable via package consumption (Tessera-side now; DS-side via separate PR per W3-1).
- **Weaknesses:** Large blast radius — affects every Tessera-side file that imports from a moved path (∼93 import statements across ∼39 test files + tessera-side engine/tools files per session-entry grep at HEAD `8c64ce0`). q01-vendoring-coverage.test.ts and q01-no-at-pin-deltas.test.ts which currently assert against `engine/...` paths must be updated to assert against `packages/deploysignal-engine/src/...` paths (explicitly authorized at NEXT-ROLE.md line 77 "Test imports across `test/*.test.{js,ts}` (MOD if `engine/` imports change path)").
- **Hidden assumptions:** (i) `git mv` of 33 files produces a coherent rename detection that the Reviewer can audit cleanly; (ii) the package's `src/` subtree compiles independently when its internal relative imports are preserved verbatim; (iii) TS `moduleResolution: "node"` resolves `'@johnpatrickwarren-oss/deploysignal-engine'` to the package's compiled `dist/index.js` via npm workspaces symlink in `node_modules/`. All three verified at spec time via inspection of existing imports + tsconfig + npm workspaces documentation.
- **Risks:** medium — build infrastructure novelty for Tessera (first npm workspace), surfaced in § 1.4 failure modes + § 6 halt conditions with explicit mitigations.

**Approach B — Path-redirect stub (leave files at `engine/`, package re-exports via relative paths).** Each `packages/deploysignal-engine/src/<path>.ts` file becomes a thin re-exporter: `export * from '../../../../engine/<path>';`. No file moves; package "wraps" the existing tree.

- **Strengths:** Zero file moves; existing Tessera tests + imports continue working unchanged. The blast radius is contained to the package scaffolding files.
- **Weaknesses:** The package is structurally inverted — files purported to be "extracted" still live in `engine/`. The path-indirection means the future DS-side PR (W3-1 deferred) cannot consume this package without first physically moving files, which makes the R61 work substantially un-done at that point. AC-P8 vendoring-drift R-E6 elimination is NOT achieved: the source-of-truth remains at `tessera/engine/` (per-file SHA pins still apply); the package is a façade. Defeats the architectural purpose of the extract.
- **Hidden assumptions:** Package re-export semantics work with TS `moduleResolution: "node"` and produce stable type identity (subtle TS edge case with re-exported types from outside `src/`).
- **Risks:** high — does not actually accomplish the FR-D1 + AC-P8 deliverable; defers the real work.

**Approach C — Hybrid: move SOME files, stub OTHERS.** Move only the most-imported files (e.g., type files) to test the build infrastructure; stub everything else for future rounds.

- **Strengths:** Smaller R61 blast radius; iterative path forward.
- **Weaknesses:** Creates a heterogeneous engine surface (some files in package, some not) that is inherently confusing to future readers. The "which-files-go-where" boundary becomes a maintenance burden. Vendoring-drift R-E6 partially eliminated only — the un-moved subset retains the drift problem. AC-P8 not fully achieved. Adds OPEN QUESTION pressure on future rounds.
- **Risks:** medium — sets a confusing precedent; defers the architectural question of "which subset is the package" indefinitely.

**Selection rationale:** Approach A. Achieves the FR-D1 + AC-P8 deliverable structurally; the larger blast radius is contained to mechanical import-path rewrites + spec-prescribed test-file path updates. The operator directive at NEXT-ROLE.md line 30 explicitly invited the Architect recommendation between Approach A and Approach B-style "placeholder-stub with path indirection"; Approach A is the architecturally correct choice and the directive notes "Physical-move is cleaner but larger blast radius" — confirming Approach A is the preferred direction. Approach B is rejected because it does not eliminate vendoring-drift R-E6 (the FR-D1 deliverable). Approach C is rejected because it creates a heterogeneous surface and defers the architectural question.

### § 0.2 Which files extract to the package — vendored-at-pin only vs vendored-at-pin + vendored-with-deltas vs full engine

**Approach A — Vendored-at-pin engine/* files only (33 files); vendored-with-deltas + Tessera-original stay at `tessera/engine/` (PICKED).** Move only files whose `Sync policy` field in `coordination/VENDORING-MANIFEST.md` equals `vendored-at-pin`. The 3 `vendored-with-deltas` files (`engine/types/verdict.ts`, `engine/types/config.ts`, `engine/verdict-groups.ts`) stay at tessera tree because they carry Tessera-specific deltas that DO NOT belong in a clean "DeploySignal engine at SHA `5a72371`" package — the package represents the upstream snapshot, not Tessera's extended version. The 21 Tessera-original engine files (e.g., `engine/l0/counter-rate-transform.ts`, `engine/topology/*`, `engine/fleet/*`, `engine/per-shard/*`, `engine/events/*`, `engine/hardware-topology-source.ts`, `engine/loader.ts`, `engine/types/fleet.ts`) stay at tessera tree because they are NOT shared with DS — they are Tessera's architectural deltas built atop the shared engine.

- **Strengths:** Semantically clean — the package contains the verbatim snapshot of `deploysignal/engine/*` at SHA `5a72371` (with the 6-line vendoring header still attached per file). Vendored-with-deltas files retain their Tessera deltas at tessera tree because they CANNOT be in the upstream-snapshot package without losing the deltas. Tessera-original files retain their natural location at tessera tree because they are not engine surface — they are Tessera's downstream extensions.
- **Weaknesses:** Vendored-with-deltas files (3) and Tessera-original files (21) at tessera tree must rewrite their internal imports of moved-to-package symbols. E.g., `engine/types/verdict.ts` (vendored-with-deltas, stays at tessera tree) imports from `'./primitives'` (vendored-at-pin, moved to package) — that import rewrites to `'@johnpatrickwarren-oss/deploysignal-engine'`. ∼30 tessera-side engine/tools files plus ∼39 test files need import-path edits.
- **Hidden assumptions:** The vendored-at-pin subset is self-consistent as a unit — no vendored-at-pin file imports from a vendored-with-deltas or Tessera-original file. Verified at spec time via grep: all vendored-at-pin imports are internal to the vendored-at-pin subset.
- **Risks:** low — the boundary between vendored-at-pin and (vendored-with-deltas + Tessera-original) is already established in `coordination/VENDORING-MANIFEST.md`; this approach makes that boundary the physical package boundary.

**Approach B — Vendored-at-pin + vendored-with-deltas in package (36 files).** Move both vendored-at-pin AND vendored-with-deltas files into the package.

- **Strengths:** Reduces tessera-side import rewrites (the 3 vendored-with-deltas files don't need internal-import edits to point at the package — they ARE in the package).
- **Weaknesses:** Package's `src/types/verdict.ts` carries Tessera-specific deltas (`cluster_event_id`; 12 TopologyNode.kind literals; 7 TopologyEdge.relationship literals). The package can no longer be characterized as a "DeploySignal engine at SHA `5a72371`" snapshot — it contains Tessera-specific extensions. DS-side consumption (W3-1 deferred) becomes structurally impossible without DS adopting Tessera's deltas, which is exactly the kind of integration coupling AC-P8's package-pin discipline is designed to prevent. Conflates two distinct architectural concerns (upstream-snapshot vs Tessera-deltas) inside one artifact.
- **Risks:** medium — defeats the package's "shared subset" framing; couples DS-side consumption to Tessera-specific extensions.

**Approach C — Full engine extract (54 files = 33 at-pin + 3 with-deltas + 18 Tessera-original engine/*).** Move the entire `tessera/engine/` subtree into the package.

- **Strengths:** `tessera/engine/` becomes empty post-extract; all engine code lives in the package; maximally simple top-level layout.
- **Weaknesses:** Tessera-original engine files (`engine/topology/slurm-source.ts`, `engine/l0/counter-rate-transform.ts`, etc.) are NOT part of the "DeploySignal shared engine" — they are Tessera's downstream extensions. Putting them in the package mislabels them. Worse, future Phase 3 SLICE 3 work (R63 WU-3B + WU-3C ADD new Tessera-original files at `engine/ds-integration/*` per W3-3 disposition); those files would need to be added to the package, expanding the package's scope from "shared engine subset" to "all Tessera engine code including Tessera-specific integration layers." The architectural boundary collapses.
- **Risks:** high — conflates the shared engine with Tessera's downstream extensions; expands package scope unboundedly.

**Selection rationale:** Approach A. The semantic boundary "what is shared with DS at SHA `5a72371`" already exists in `coordination/VENDORING-MANIFEST.md`; Approach A makes that boundary the physical package boundary. Vendored-with-deltas files carry Tessera-specific extensions and rightly stay in tessera tree; Tessera-original engine files are downstream extensions and rightly stay in tessera tree. The cost — tessera-side import rewrites — is mechanical and bounded.

### § 0.3 Package-consumption mechanism — npm workspace vs file: reference vs no-install symlink

**Approach A — npm workspace declaration in root `package.json` (PICKED).** Add `"workspaces": ["packages/*"]` to the root `package.json`. The package is referenced by name (`@johnpatrickwarren-oss/deploysignal-engine`) in root `devDependencies`. `npm install` creates a symlink at `node_modules/@johnpatrickwarren-oss/deploysignal-engine/` → `packages/deploysignal-engine/`.

- **Strengths:** Standard npm pattern for monorepo. TypeScript's `moduleResolution: "node"` resolves the package via the symlink. Future operations (add additional packages, manage devDeps per-package) extend naturally. Matches operator's W3-2 disposition (Tessera monorepo sub-package layout).
- **Weaknesses:** Requires `npm install` to land the symlink. The chore-A pipeline must run `npm install` before `tsc` + `node --test` — adds a build step.
- **Hidden assumptions:** npm@7+ supports workspaces natively (npm 10 is current — verified ambient). The root `package.json` `"private": true` is REQUIRED for workspaces to work (already present at line 6).
- **Risks:** low — npm workspaces is a stable, well-documented pattern.

**Approach B — `file:` reference in root `package.json`.** Reference the package via `"@johnpatrickwarren-oss/deploysignal-engine": "file:./packages/deploysignal-engine"` instead of workspaces.

- **Strengths:** Slightly simpler — no `workspaces` field. `npm install` does the equivalent of a workspace symlink.
- **Weaknesses:** `file:` references don't propagate transitive devDependencies cleanly. If the package later adds devDeps, those don't reach the root install. Less idiomatic; future contributors would expect workspaces.
- **Risks:** low — but less future-proof.

**Approach C — Direct symlink (no `npm install` step).** Manually create `node_modules/@johnpatrickwarren-oss/deploysignal-engine` as a symlink to `packages/deploysignal-engine/`; commit a `.gitignore`-exempted symlink (or generate at build time).

- **Strengths:** No `npm install` step needed at chore-A.
- **Weaknesses:** Symlinks-in-node_modules-not-managed-by-npm is brittle and non-idiomatic. `npm install` would overwrite or remove the symlink. Hidden coupling to filesystem behavior.
- **Risks:** medium — fragile.

**Selection rationale:** Approach A. npm workspaces is the idiomatic monorepo pattern; the cost (one extra `npm install` step at chore-A) is minor and the future-proofing is significant.

### § 0.4 Build orchestration — separate package tsc vs combined tsc vs ts source resolution

**Approach A — Separate package tsc; package compiles `src/**/*.ts` → `dist/**/*.js` independently; root pretest invokes `npm run build` in the package before `tsc -p tsconfig.test.json` (PICKED).** The package has its own `packages/deploysignal-engine/tsconfig.json` mirroring the root engine compilerOptions. Package's `main: "dist/index.js"` + `types: "dist/index.d.ts"`. Root `pretest` script chains: `npm run build --workspace=@johnpatrickwarren-oss/deploysignal-engine && tsc -p tsconfig.test.json && node --test test/*.test.js`.

- **Strengths:** Clean separation of concerns. The package can be independently consumed (future DS-side PR per W3-1). Type resolution via `package.json:types` is standard. `dist/` is gitignored (matches existing `dist/` ignore at root `.gitignore` line 8 + `*.js` ignore at line 6).
- **Weaknesses:** Adds a build step (~few seconds). Edit-loop for package source requires running the package build before tests pick up changes.
- **Hidden assumptions:** TS `moduleResolution: "node"` reads the package's `package.json:main` + `package.json:types` to resolve imports of `'@johnpatrickwarren-oss/deploysignal-engine'`. TS handles cross-package type imports correctly when the package is a node_modules symlink.
- **Risks:** low — standard pattern.

**Approach B — Combined root tsc; root tsconfig compiles both `engine/**/*.ts` AND `packages/**/*.ts`.** Single `tsc` invocation handles both trees.

- **Strengths:** Single build step.
- **Weaknesses:** Conflates two distinct compilation surfaces. The package's compilerOptions cannot diverge from root (e.g., different module target). Defeats the purpose of "extracting to its own package."
- **Risks:** medium — architectural conflation.

**Approach C — TypeScript path mapping; resolve `'@johnpatrickwarren-oss/deploysignal-engine'` to package's `src/` via `tsconfig.paths`.** Skip the compile-package step entirely; TS resolves package imports to ts source.

- **Strengths:** Fastest edit-loop; no package build.
- **Weaknesses:** Runtime resolution diverges from compile-time resolution. `node --test` (which reads `.js` files compiled by `tsc -p tsconfig.test.json`) needs the compiled output somewhere. Without the package compiled to `dist/`, runtime resolution fails. Would require complex test runner shim.
- **Risks:** high — runtime/compile-time divergence.

**Selection rationale:** Approach A. Standard separate-package-build pattern preserves package consumability (current Tessera + future DS) and matches TS+npm conventions. Root `pretest` chain adds one explicit build step before tests, which is mechanically obvious.

---

## § 1 Design phase (Superpowers — inline)

### § 1.1 Component inventory (what exists / what gets created / what changes / what gets deleted)

| Category | Item | R61 disposition |
|---|---|---|
| **What exists** | 33 vendored-at-pin engine/* files (per VENDORING-MANIFEST) | MOVE to `packages/deploysignal-engine/src/` via `git mv` |
| **What exists** | 3 vendored-with-deltas engine/* files (`engine/types/verdict.ts`, `engine/types/config.ts`, `engine/verdict-groups.ts`) | STAY at tessera tree; internal imports rewrite to `'@johnpatrickwarren-oss/deploysignal-engine'` |
| **What exists** | 21 Tessera-original engine/* files (l0/, topology/, fleet/, per-shard/, events/, types/fleet.ts, hardware-topology-source.ts, loader.ts) | STAY at tessera tree; imports of moved-to-package paths rewrite |
| **What exists** | 3 vendored-at-pin tools/* files | STAY at tessera/tools/; imports of moved-to-package paths rewrite |
| **What exists** | 6 Tessera-original tools/* files (e.g., curate-baseline-pre-pass.ts, curate-baseline-fleet-correlated.ts) | STAY at tessera/tools/; imports of moved-to-package paths rewrite |
| **What exists** | 39 test files (40 minus 1 substrate) with ~93 imports of `'../engine/...'` paths | MOD imports — those pointing at moved-to-package paths rewrite to `'@johnpatrickwarren-oss/deploysignal-engine'`; those pointing at Tessera-tree paths unchanged |
| **What exists** | `test/q01-vendoring-coverage.test.ts` | MOD path list (engine/* → packages/deploysignal-engine/src/*); SHA pin discipline preserved |
| **What exists** | `test/q01-no-at-pin-deltas.test.ts` | MOD tessera-side path list; source side (`../deploysignal/engine/*`) unchanged |
| **What exists** | `test/betting-e-process-class-dispatch.test.ts` | STAY at tessera/test/ (vendored-at-pin TEST file; the test EXECUTION targets the package import surface but the test file location is Tessera-tree per existing manifest disposition); MOD imports |
| **What exists** | `package.json` (root) | MOD — add `"workspaces": ["packages/*"]`; add `"@johnpatrickwarren-oss/deploysignal-engine": "*"` to `devDependencies`; amend `scripts.pretest` to chain package build |
| **What exists** | `tsconfig.json` (root) | MOD — narrow `"include"` from `["engine/**/*.ts"]` to exclude the moved-to-package files (mechanically: `include` becomes `["engine/**/*.ts"]` unchanged because the moved files are no longer under `engine/`; verify post-move that tsc still finds the Tessera-tree engine files only) |
| **What exists** | `tsconfig.test.json` (root) | MOD — similar narrowing if needed; `"include"` likely unchanged since the moved files leave `engine/` |
| **What exists** | `coordination/VENDORING-MANIFEST.md` | MOD — add new top-of-file section "## R61 npm package extract — post-R61 state" explaining the transition; per-file rows in § DeploySignal engine vendoring updated with a "Target (post-R61)" column note (or equivalent annotation); the existing SHA-pin rows are PRESERVED as the audit trail for the package's version pin |
| **What exists** | `coordination/SCOPING-MEMO-v0.3.md` § 9 (engine vendoring policy) | MOD opportunistic per W3-5 — add a paragraph noting that the extract-to-npm commitment landed at R61 and reference Q-R61-SPEC.md |
| **What gets created** | `packages/deploysignal-engine/` directory | NEW |
| **What gets created** | `packages/deploysignal-engine/package.json` | NEW — declares `@johnpatrickwarren-oss/deploysignal-engine` v0.1.0 (pre-publish; pins to SHA `5a72371` per README annotation); `main: "dist/index.js"`, `types: "dist/index.d.ts"`; `private: true` (no npm registry publication this round; AC-P8 verification via local workspace) |
| **What gets created** | `packages/deploysignal-engine/tsconfig.json` | NEW — standalone tsconfig mirroring root engine compilerOptions; `rootDir: "src"`, `outDir: "dist"` |
| **What gets created** | `packages/deploysignal-engine/src/index.ts` | NEW — barrel re-exports the public surface of every moved file (a single `export * from './<path>'` per moved module; deep imports go via the barrel) |
| **What gets created** | `packages/deploysignal-engine/README.md` | NEW — describes package contents, vendoring history (SHA `5a72371`), Tessera-as-current-consumer, future DS-as-additional-consumer per W3-1 |
| **What gets created** | `packages/deploysignal-engine/src/*` (33 moved files, mirroring original engine/* layout) | MOVED (via `git mv`); content unchanged except internal package-internal imports remain relative |
| **What gets created** | `test/q61-engine-npm-extract.test.ts` | NEW — verifies package scaffolding ACs + Tessera consumption ACs + AC-P7 cross-cutting |
| **What gets created** | `coordination/specs/Q-R61-SPEC.md` | NEW (this file) |
| **What gets created** | `coordination/specs/Q-R61-SPEC-AUDIT.md` | NEW |
| **What gets created** | `coordination/specs/Q-R61-EMPIRICAL.sh` | NEW — empirical-AC harness per Rule 1 sub-class |
| **What changes** | `node_modules/` | regenerated by `npm install` post-move; `node_modules/@johnpatrickwarren-oss/deploysignal-engine` symlink → `packages/deploysignal-engine/` |
| **What gets deleted** | None | The 33 engine/* files are MOVED, not deleted. No file is removed without replacement. |

### § 1.2 Integration points

The extract operation creates four integration points where the architecture transitions across the package boundary:

1. **Tessera-side import → package** — every Tessera-tree file (engine/, tools/, test/) that previously imported from a moved-to-package path rewrites the import specifier from `'../engine/<path>'` (or `'./<path>'` for engine-internal references) to `'@johnpatrickwarren-oss/deploysignal-engine'`. The named symbols imported remain identical; only the specifier changes.
2. **Package-internal imports remain relative** — files inside `packages/deploysignal-engine/src/` that import from each other use the same relative paths they had at `engine/...`. E.g., `packages/deploysignal-engine/src/detectors/family-c-betting-e-process.ts` continues to `import { ... } from './betting-e-process';` because both files moved together preserving their relative path.
3. **Package barrel → individual modules** — `packages/deploysignal-engine/src/index.ts` re-exports the public surface of every moved module via `export * from './<path>';` lines. The barrel is the single import target for all Tessera-side consumers; deep imports (`'@johnpatrickwarren-oss/deploysignal-engine/detectors/...'`) are NOT used at R61 (subpath exports deferred to a future round if needed).
4. **Build pipeline → npm workspace** — root `npm install` creates `node_modules/@johnpatrickwarren-oss/deploysignal-engine/` symlink to `packages/deploysignal-engine/`. Root `pretest` chains `npm run build --workspace=@johnpatrickwarren-oss/deploysignal-engine` (which runs the package's `tsc -p packages/deploysignal-engine/tsconfig.json` building `dist/`) before `tsc -p tsconfig.test.json && node --test test/*.test.js`. TypeScript resolves `'@johnpatrickwarren-oss/deploysignal-engine'` via the symlink + package.json `main`/`types` fields.

### § 1.3 Data flow under post-extract conditions

| Stage | Pre-R61 | Post-R61 |
|---|---|---|
| Detector compilation (e.g., `engine/detectors/page-cusum.ts`) | imports `'./_linalg'` from `engine/detectors/`; compiled to `engine/detectors/page-cusum.js` | imports `'./_linalg'` from `packages/deploysignal-engine/src/detectors/` (internal-relative unchanged); compiled to `packages/deploysignal-engine/dist/detectors/page-cusum.js` |
| Vendored-with-deltas type usage (e.g., `engine/types/verdict.ts` uses `CellKey` from `engine/types/primitives.ts`) | relative import `from './primitives'` | rewritten import `from '@johnpatrickwarren-oss/deploysignal-engine'` (package barrel re-exports `CellKey`) |
| Tessera-original consumption (e.g., `engine/topology/slurm-source.ts` uses `TopologySnapshot` from `engine/types/verdict.ts`) | relative import `from '../types/verdict'` | unchanged — `verdict.ts` is vendored-with-deltas and stays at tessera tree |
| Test consumption (e.g., `test/q01-schema-additions.test.ts` uses `CellKey` from `engine/types/primitives.ts`) | relative import `from '../engine/types/primitives'` | rewritten import `from '@johnpatrickwarren-oss/deploysignal-engine'` |
| q01 byte-identity check (`test/q01-no-at-pin-deltas.test.ts` compares `engine/<X>` vs `../deploysignal/engine/<X>`) | reads files at `engine/<X>` | reads files at `packages/deploysignal-engine/src/<X>` (tessera-side path updated); source-side `../deploysignal/engine/<X>` unchanged |
| Runtime test execution (`node --test test/q01-vendoring-coverage.test.js`) | reads compiled `engine/detectors/_linalg.js` to verify SHA-pin header | reads compiled `packages/deploysignal-engine/src/detectors/_linalg.js` (test path updated; the `.js` compilation output co-located with the `.ts` source per existing tsconfig.test.json layout) |

### § 1.4 Failure modes at integration points

| Integration point | Possible failure | R61 mitigation |
|---|---|---|
| Package barrel `src/index.ts` re-exports | Missing export of a symbol consumed by Tessera-side import — tsc error at chore-A | Architect enumerates the per-module export list in § 4.4 below; barrel is mechanical (one `export *` per moved module). If a Tessera-side file imports a symbol the barrel does not re-export, tsc surfaces the gap at chore-A. AC-R61-3 (tsc exit 0) catches this. |
| npm workspace symlink | `npm install` does not create the symlink (npm version too old; root package.json missing `private: true`) | Root `package.json` already has `"private": true` (verified at line 6). npm version verified at session entry (`node --version` ≥ 20 per `engines.node`). `npm install` documented in spec. Halt condition § 6 #2 fires if symlink not created. |
| TS module resolution | `import from '@johnpatrickwarren-oss/deploysignal-engine'` fails to resolve at tsc time | Package's `package.json:main` + `package.json:types` point at compiled `dist/`. Package's tsc must run BEFORE root tsc. § 4.5 prescribes the `pretest` chain. AC-R61-3 (tsc exit 0) catches resolution failures. |
| Internal package import resolution | Moved file `src/detectors/family-c-betting-e-process.ts` imports `'./betting-e-process'` — relative path correct because both moved together | Verified at spec time: all engine/* internal imports are relative within the engine/ subtree (per session-entry grep); the move preserves relative structure under `src/`. |
| Test import rewrite | A test file's import of a moved-to-package symbol misses the rewrite (still imports from `'../engine/<path>'` which no longer exists) | tsc surfaces unresolved import at chore-A. AC-R61-3 (tsc exit 0) catches. AC-R61-10 (post-extract test baseline) catches any test that fails to compile or run. |
| q01-vendoring-coverage path drift | Test reads `coordination/VENDORING-MANIFEST.md` expecting engine/* rows; manifest now points at packages/deploysignal-engine/src/*; test's path list also updated | Both files updated in same chore-A; AC-R61-5 (q01-vendoring-coverage passes) catches misalignment. |
| q01-no-at-pin-deltas byte-identity | Tessera-side path updated; source side at `../deploysignal/engine/*` unchanged (byte-identity property holds: the moved files at `packages/deploysignal-engine/src/*` retain identical content modulo the 6-line vendoring header) | Pre-existing fail per WAVE-GATE pre-flags: `../deploysignal` sibling unavailable in cluster worktrees; in main worktree the test passes against the original sibling repo. Post-R61 in main worktree: still passes (content unchanged; only tessera-side path updated). |
| VENDORING-MANIFEST.md byte-check | q01-vendoring-coverage iterates rows; manifest format changes might break parsing | Spec § 4.6 prescribes minimal manifest changes: add a new top section announcing the transition; preserve all per-file SHA-pin rows verbatim; the test's row-grep logic continues to work. |
| Pre-existing q01-no-at-pin-deltas dependency on `../deploysignal` sibling | The check `readFile('../deploysignal/engine/...')` requires the sibling repo. In main worktree it exists; in cluster worktree it doesn't. | Pre-existing condition per WAVE-GATE-01 pre-flags. R61 runs in main worktree (single-cluster Wave 9 per WAVE-PLAN-09). The check passes in main worktree (assuming sibling unchanged). Path update only. |
| AC-P1 through AC-P4 (Phase 1+2 cross-cutting) | Detector semantics regress post-extract | The package contains the EXACT SAME source code as pre-extract (modulo file location). Detector internals are byte-identical. AC-P7 (cross-cutting Phase 1+2 ACs hold) verifies via the existing test suite running to its expected 399/394/2/3 (or post-R61 adjusted) baseline. |

### § 1.5 Package barrel verification (Architect pre-prediction)

To make the barrel reasoning auditable, the package's `src/index.ts` re-exports each of the 33 moved modules via `export * from './<path>';` lines. Example fragment:

```typescript
// packages/deploysignal-engine/src/index.ts (barrel)
export * from './core';
export * from './per-detector-resampler-mode';
export * from './topology-overlay';
export * from './signal-classes';
export * from './detectors/_linalg';
export * from './detectors/_q72-trace';
export * from './detectors/betting-e-process';
export * from './detectors/conformal';
export * from './detectors/family-a-mixture-supermartingale';
export * from './detectors/family-c-betting-e-process';
export * from './detectors/family-c-rff';
export * from './detectors/hotelling';
export * from './detectors/page-cusum';
export * from './detectors/self-normalized-e-process-fallback';
export * from './detectors/sequential-mmd';
export * from './detectors/spectral';
export * from './types/primitives';
export * from './types/metrics';
export * from './types/orchestration';
export * from './types/policy';
export * from './types/audit';
export * from './types/self-normalized-fallback';
export * from './types/index';
export * from './types/agent';
export * from './types/families/a';
export * from './types/families/b';
export * from './types/families/c';
export * from './types/families/d';
export * from './types/families/e';
export * from './l0/schema-continuity';
export * from './o0/lifecycle-events';
export * from './o0/reversibility-source';
export * from './o0/reversibility-translator';
```

33 re-export lines. Each is a one-line mechanical addition. The barrel is the single import target for all Tessera-side consumers. **Architect pre-prediction:** tsc accepts this barrel because every moved file has its own internal export discipline (verified by reading session-entry headers); the `export *` aggregates without name collisions because the moved files don't re-export each other's symbols — each owns its own surface. (Edge case: if two moved files happen to export the same identifier, tsc errors at the barrel. Pre-prediction: no collision because each file's exports are domain-distinct per the original DeploySignal architecture. AC-R61-3 catches any collision at chore-A.)

---

## § 2 Mechanism

### § 2.1 Phase-by-phase mechanism

R61 chore-A unfolds in five distinct phases. Each phase is mechanically separable; the Implementer applies them in order.

**Phase 1 — Package scaffolding.** Create `packages/deploysignal-engine/` directory with `package.json` + `tsconfig.json` + `README.md` + empty `src/`. No source files yet.

**Phase 2 — Physical move (`git mv`).** Move the 33 vendored-at-pin engine/* files to `packages/deploysignal-engine/src/` preserving subtree structure. Git records each move as a rename (verified by `git status` showing rename detection).

**Phase 3 — Package barrel.** Create `packages/deploysignal-engine/src/index.ts` with the 33 `export *` lines per § 1.5.

**Phase 4 — Tessera-side import rewrites.** Find every Tessera-tree file (engine/, tools/, test/) that imports from a moved-to-package path (formerly `'../engine/<X>'` where `<X>` is one of the 33 moved paths). Rewrite each such import to `'@johnpatrickwarren-oss/deploysignal-engine'`. Tessera-tree files that import from a Tessera-tree-engine path (e.g., `'../engine/types/verdict'` where verdict.ts is vendored-with-deltas and stayed at tessera tree) are unchanged.

**Phase 5 — Build configuration + coordination updates.** Update root `package.json` (workspaces, devDependency, pretest chain). Update root `tsconfig.json` + `tsconfig.test.json` if needed (per § 4.5 below). Update `coordination/VENDORING-MANIFEST.md` to reflect the transition (per § 4.6). Update `coordination/SCOPING-MEMO-v0.3.md` § 9 opportunistically (per W3-5 — IF the section's existing extract-to-npm commitment text naturally benefits from a post-R61 annotation; otherwise defer to a future round). Update `test/q01-vendoring-coverage.test.ts` + `test/q01-no-at-pin-deltas.test.ts` path lists.

After all five phases land, run `npm install` (creates the workspace symlink), then `npm run build --workspace=@johnpatrickwarren-oss/deploysignal-engine` (builds the package's `dist/`), then `npx tsc -p tsconfig.test.json` (compiles Tessera tree; resolves package imports via symlink), then `node --test test/*.test.js` (runs the test suite).

### § 2.2 Package package.json semantics

```jsonc
{
  "name": "@johnpatrickwarren-oss/deploysignal-engine",
  "version": "0.1.0",
  "description": "Shared statistical-detector engine vendored from DeploySignal at SHA 5a72371; consumed by Tessera (current) and DeploySignal (future via separate PR per WU-Phase3-3A W3-1 disposition).",
  "license": "UNLICENSED",
  "private": true,
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "engines": {
    "node": ">=20"
  },
  "scripts": {
    "build": "tsc -p tsconfig.json"
  },
  "files": ["dist", "README.md"]
}
```

- `private: true` — the package is not published to npm registry at R61 (operator may publish in a future round per Phase 3 success metric; R61 ships local-workspace-consumption only).
- `version: "0.1.0"` — pre-publish v0.1.0; the SHA pin (`5a72371`) is documented in README (not encoded in semver because semver does not natively express SHA-pin semantics).
- No `dependencies` field — the package is pure TypeScript with no runtime dependencies (per SCOPING-MEMO § 9 "Pure TypeScript, no native dependencies").
- No `devDependencies` field — uses root's devDependencies via workspace inheritance.

### § 2.3 Package tsconfig.json semantics

```jsonc
{
  "compilerOptions": {
    "strict": true,
    "target": "ES2020",
    "module": "CommonJS",
    "moduleResolution": "node",
    "ignoreDeprecations": "5.0",
    "outDir": "dist",
    "rootDir": "src",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "noImplicitAny": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUnusedLocals": false,
    "noUnusedParameters": false,
    "types": ["node"]
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist"]
}
```

CompilerOptions mirror the root `tsconfig.json` exactly (cross-checked at spec time against `/Users/johnwarren/concord/tessera/tsconfig.json`) except for `outDir: "dist"` and `rootDir: "src"` to scope the package's compilation surface.

### § 2.4 Root package.json amendment

```jsonc
{
  "name": "@johnpatrickwarren-oss/tessera",
  "version": "0.1.0-pre",
  ...
  "workspaces": ["packages/*"],
  "scripts": {
    "build": "tsc",
    "build:package": "npm run build --workspace=@johnpatrickwarren-oss/deploysignal-engine",
    "pretest": "npm run build:package && tsc -p tsconfig.test.json",
    "test": "node --test test/*.test.js",
    "typecheck": "npm run build:package && tsc -p tsconfig.test.json --noEmit"
  },
  "devDependencies": {
    "@johnpatrickwarren-oss/deploysignal-engine": "*",
    "@types/node": "^22.0.0",
    "typescript": "^5.4.0"
  },
  ...
}
```

- `workspaces: ["packages/*"]` — npm workspace declaration; `npm install` creates symlinks for every package under `packages/`.
- `build:package` — chained build step for the package.
- `pretest` — now chains `build:package && tsc -p tsconfig.test.json`. The pretest script runs automatically before `npm test`.
- `typecheck` — same chain, with `--noEmit` for the root tsc.
- `devDependencies` adds `@johnpatrickwarren-oss/deploysignal-engine: "*"` (workspace resolution).

### § 2.5 Root tsconfig.json + tsconfig.test.json (no compilerOptions changes; `include` already excludes packages/)

Root `tsconfig.json` has `"include": ["engine/**/*.ts"]` and `"exclude": ["node_modules", "dist", "test", "tools"]`. The moved files leave `engine/` (now under `packages/deploysignal-engine/src/`), so the include glob `engine/**/*.ts` naturally narrows to the Tessera-tree engine files (vendored-with-deltas + Tessera-original). No tsconfig.json edit needed.

Root `tsconfig.test.json` extends tsconfig.json and adds `"include": ["engine/**/*.ts", "test/**/*.ts", "tools/**/*.ts"]`. Same logic — engine/** narrows naturally. No tsconfig.test.json edit needed.

If post-extract tsc surfaces issues (e.g., the package's compiled `dist/` accidentally matched by an include glob), § 6 halt condition #3 fires. Pre-prediction: no edit needed.

### § 2.6 What the spec does NOT prescribe

- The Implementer does NOT need to publish the package to npm registry at R61 (`private: true` prevents accidental publication; AC-P8 verification via local workspace).
- The Implementer does NOT modify DS-side files per W3-1 = A disposition.
- The Implementer does NOT touch `engine/ds-integration/*` paths per W3-3 (deferred to R63).
- The Implementer does NOT add new external dependencies per W3-4 = A.
- The Implementer does NOT publish or open GitHub PRs per NEXT-ROLE.md line 68.
- The Implementer does NOT modify the 3 vendored-at-pin tools/* files' internal vendoring headers (the SHA pin is preserved; only import rewrites land).
- The Implementer does NOT modify the test substrate files (`test/_substrate/*.ts`, `test/_substrate/*.json`, `test/_substrate/*.conf`, `test/_substrate/*.txt`) beyond import rewrites of any that import moved-to-package symbols.

---

## § 3 Anti-scope + ALLOWED_SET (forward coverage per Rule 4)

### § 3.1 Anti-scope items

1. **A12 vendored-at-pin semantics PRESERVED through the move.** The 33 moved files retain their 6-line vendoring header verbatim. SHA pin `5a72371` preserved. Content byte-identical to pre-move state (the only change is filesystem location; git records the move as a rename).
2. **NO DS repo modification.** Per W3-1 Option A operator disposition. DS-side consumption update routed via separate PR scheduled outside Tessera pipeline (per NEXT-ROLE.md line 132).
3. **NO real-cluster work.** Path B carry-forward; A8/A11 inherited.
4. **NO `engine/ds-integration/*` work.** R63 Wave 10 scope per W3-3 Coordinator default A/A.
5. **NO new external dependencies (runtime or dev).** Per W3-4 Option A. Only npm workspaces (built into npm) used.
6. **NO modification of `coordination/PRD.md`.**
7. **NO modification of `~/.claude/CROSS-PROJECT-MEMORIAL.md`.** Per NEXT-ROLE.md line 62. Rule 7 anchor-canonical-landing-deferred discipline applies; R61 is 1 Tessera data point for npm-extract-as-architectural-pattern; cross-project canonical landing gated on 2nd-project occurrence.
8. **NO modification of `coordination/MEMORIAL-PHASE-*.md`** (Phase 1+2 shards frozen).
9. **NO modification of `scripts/*` or `run-pipeline.sh`** (R45-R51 stable).
10. **NO modification of `CLAUDE-*.md REINFORCEMENTS` sections.** Per NEXT-ROLE.md line 65.
11. **NO modification of R42-R60 deliverables EXCEPT engine-vendored files (which need to relocate per W3-2).** Per NEXT-ROLE.md line 61. The exception is precisely the 33 moved files + their consumers' import rewrites; no other R42-R60 deliverable is touched substantively.
12. **NO opening of GitHub PRs.** Per NEXT-ROLE.md line 68.
13. **NO npm registry publication.** Package's `private: true` prevents accidental publication; AC-P8 verification via local workspace consumption.
14. **NO modification of `coordination/SCOPING-MEMO-v0.3.md` UNLESS the W3-5 opportunistic-close trigger fires (Architect spec naturally touches § 9 or § 2.3).** If R61 naturally amends § 9 (e.g., to note that the extract-to-npm commitment landed at R61), do so opportunistically; otherwise defer. The spec's W3-5 disposition is opportunistic — this round MAY touch SCOPING-MEMO if natural, must not force the touch otherwise. § 4.6 below prescribes minimal opportunistic touch.

### § 3.2 ALLOWED_SET (forward coverage per Rule 4)

The chore-A diff `git diff 8c64ce0..<chore-A-SHA> --name-only | sort` MUST be a subset of the ALLOWED_SET enumerated below. The set has three parts: (a) explicit per-path entries; (b) regex carve-outs for the 33-file move; (c) regex carve-outs for the ∼70 Tessera-side files getting import rewrites; (d) conditional 1 entry for DIAGNOSTIC.

**Part (a) — explicit per-path entries (15 entries):**

```
coordination/MEMORIAL.md
coordination/NEXT-ROLE.md
coordination/VENDORING-MANIFEST.md
coordination/specs/Q-R61-EMPIRICAL.sh
coordination/specs/Q-R61-SPEC-AUDIT.md
coordination/specs/Q-R61-SPEC.md
package.json
packages/deploysignal-engine/README.md
packages/deploysignal-engine/package.json
packages/deploysignal-engine/src/index.ts
packages/deploysignal-engine/tsconfig.json
test/q01-no-at-pin-deltas.test.ts
test/q01-vendoring-coverage.test.ts
test/q61-engine-npm-extract.test.ts
package-lock.json
```

**Part (b) — regex carve-out for the 33-file move (matches both old `engine/<X>` and new `packages/deploysignal-engine/src/<X>` halves of the rename):**

```
^engine/(core|per-detector-resampler-mode|topology-overlay|signal-classes)\.ts$
^engine/detectors/(_linalg|_q72-trace|betting-e-process|conformal|family-a-mixture-supermartingale|family-c-betting-e-process|family-c-rff|hotelling|page-cusum|self-normalized-e-process-fallback|sequential-mmd|spectral)\.ts$
^engine/types/(primitives|metrics|orchestration|policy|audit|self-normalized-fallback|index|agent)\.ts$
^engine/types/families/[abcde]\.ts$
^engine/l0/schema-continuity\.ts$
^engine/o0/(lifecycle-events|reversibility-source|reversibility-translator)\.ts$
^packages/deploysignal-engine/src/(core|per-detector-resampler-mode|topology-overlay|signal-classes)\.ts$
^packages/deploysignal-engine/src/detectors/(_linalg|_q72-trace|betting-e-process|conformal|family-a-mixture-supermartingale|family-c-betting-e-process|family-c-rff|hotelling|page-cusum|self-normalized-e-process-fallback|sequential-mmd|spectral)\.ts$
^packages/deploysignal-engine/src/types/(primitives|metrics|orchestration|policy|audit|self-normalized-fallback|index|agent)\.ts$
^packages/deploysignal-engine/src/types/families/[abcde]\.ts$
^packages/deploysignal-engine/src/l0/schema-continuity\.ts$
^packages/deploysignal-engine/src/o0/(lifecycle-events|reversibility-source|reversibility-translator)\.ts$
```

**Part (c) — regex carve-out for Tessera-side import rewrites (any tessera/engine/*, tessera/tools/*, tessera/test/* file whose only change is an import-path rewrite from `'../engine/<moved>'` → `'@johnpatrickwarren-oss/deploysignal-engine'`):**

```
^engine/(verdict-groups|hardware-topology-source|loader)\.ts$
^engine/types/(verdict|config|fleet)\.ts$
^engine/(l0|topology|fleet|per-shard|events)/.*\.ts$
^tools/.*\.ts$
^test/.*\.test\.ts$
^test/_substrate/.*\.ts$
^test/betting-e-process-class-dispatch\.test\.ts$
```

**Part (d) — conditional 1 entry (added IFF a halt fires mid-round):**

```
coordination/diagnostics/DIAGNOSTIC-R61-.*\.md
```

Pre-authorized per R25 MAJOR-2 reinforcement (CLAUDE-ARCHITECT.md REINFORCED 2026-05-18: spec-mandated DIAGNOSTIC paths MUST appear in ALLOWED_SET upfront).

**Optional opportunistic entry (W3-5 — added IFF Architect's spec naturally touches SCOPING-MEMO):**

```
coordination/SCOPING-MEMO-v0.3.md
```

This SPEC opts to touch SCOPING-MEMO § 9 opportunistically per § 4.6 below; therefore `coordination/SCOPING-MEMO-v0.3.md` IS in the ALLOWED_SET as a part (a) explicit entry. Promoting to part (a):

```
coordination/SCOPING-MEMO-v0.3.md   (added per W3-5 opportunistic close)
```

### § 3.3 Git-trackability verification

All ALLOWED_SET paths verified at spec-emit time for git-trackability per R23 ARCH MINOR-2 reinforcement:

- `packages/deploysignal-engine/*` — parent directory `packages/` does NOT exist pre-R61; created at Phase 1; `.gitignore` does NOT exclude `packages/` (verified at `/Users/johnwarren/concord/tessera/.gitignore`); files will be `git add`-able.
- `engine/*` paths — currently `git ls-files`-tracked.
- `coordination/SCOPING-MEMO-v0.3.md`, `coordination/PRD.md`, `coordination/MEMORIAL.md`, etc. — tracked.
- `coordination/VENDORING-MANIFEST.md` — tracked.
- `package.json`, `tsconfig.json`, `tsconfig.test.json` — tracked.
- `package-lock.json` — currently tracked; will regenerate at `npm install`; is included in ALLOWED_SET part (a).
- `test/q01-vendoring-coverage.test.ts`, `test/q01-no-at-pin-deltas.test.ts` — tracked.

`*.js`, `*.js.map`, `dist/` are gitignored (`.gitignore` lines 6-8); the package's compiled `dist/` output never appears in any diff.

---

## § 4 Per-file pseudocode

### § 4.1 `packages/deploysignal-engine/package.json` (NEW)

See § 2.2 above. Single JSON file, ~20 lines.

### § 4.2 `packages/deploysignal-engine/tsconfig.json` (NEW)

See § 2.3 above. Single JSON file, ~26 lines (mirrors root tsconfig.json compilerOptions).

### § 4.3 `packages/deploysignal-engine/README.md` (NEW)

```markdown
# @johnpatrickwarren-oss/deploysignal-engine

Shared statistical-detector engine vendored from DeploySignal at SHA `5a72371`.

## Provenance

This package contains the shared statistical-detector engine extracted from
DeploySignal (commit `5a72371`) via Tessera Phase 3 SLICE 3 WU-Phase3-3A
(R61, 2026-05-19). The extract realizes the vendor-first commitment in
`tessera/coordination/SCOPING-MEMO-v0.3.md` § 9 "Extract-to-npm commitment."

Per-file SHA-pin provenance retained in source headers (6-line vendoring
block at the top of each `.ts` file).

## Consumers

- **Tessera** (current; v0.1.0+) — `tessera/package.json` references this
  package via npm workspaces.
- **DeploySignal** (future PR; scheduled outside Tessera pipeline per
  WU-Phase3-3A operator disposition W3-1 Option A 2026-05-19) — will
  replace `deploysignal/engine/*` with a workspace or published-version
  consumption of this package.

## Versioning

`0.1.0` (pre-publish). Tessera at R61 consumes via local workspace symlink;
no npm registry publication this round (`"private": true`). Operator may
publish in a future round per Tessera Phase 3 success metric "engine
extracted to shared npm package (vendor-first commitment realized)."

## Building

```
npm run build  # tsc -p tsconfig.json → dist/
```

## Layout

- `src/` — TypeScript source, mirroring the original `deploysignal/engine/`
  subtree layout (per the q01-vendoring-coverage path canonical list).
- `src/index.ts` — barrel re-exports the public surface.
- `dist/` — compiled JavaScript + declaration files (gitignored).
```

### § 4.4 `packages/deploysignal-engine/src/index.ts` (NEW barrel)

The 33-line barrel per § 1.5 above. No other content.

### § 4.5 Root `package.json` (MOD)

See § 2.4 above. Three field-level edits: add `"workspaces": ["packages/*"]`; amend `scripts.pretest` + add `scripts.build:package` + amend `scripts.typecheck`; add `"@johnpatrickwarren-oss/deploysignal-engine": "*"` to `devDependencies`.

### § 4.6 `coordination/VENDORING-MANIFEST.md` (MOD)

Add a new top-of-file section (after the existing "_Authoritative record..._" italics block, before "## DeploySignal engine vendoring"):

```markdown
## R61 npm package extract — post-R61 state (2026-05-19)

Per Q-R61-SPEC.md (Phase 3 SLICE 3 WU-Phase3-3A), the 33 vendored-at-pin
engine/* files listed in the table below were physically moved from
`tessera/engine/...` to `tessera/packages/deploysignal-engine/src/...` via
`git mv`, preserving subtree layout. The package version (`0.1.0`,
`packages/deploysignal-engine/package.json`) pins to SHA `5a72371` per
its README annotation. Tessera consumes via npm workspaces; the package's
`package.json` declares `"private": true` (no npm registry publication at
R61; future round may publish).

The 3 vendored-with-deltas files (`engine/types/verdict.ts`,
`engine/types/config.ts`, `engine/verdict-groups.ts`) STAY at tessera tree
because they carry Tessera-specific deltas that do not belong in the
upstream-snapshot package. Tessera-original engine files (l0/, topology/,
fleet/, per-shard/, events/, types/fleet.ts, hardware-topology-source.ts,
loader.ts) also stay at tessera tree — they are downstream extensions, not
shared engine surface.

The 3 vendored-at-pin tools/* files (tools/curate-baseline-pipeline.ts,
tools/calibrators/_shared.ts, tools/calibrators/family-c.ts) stay at
tessera/tools/ — they are consumers of the engine, not engine surface.

Per-file SHA-pin rows below are PRESERVED unchanged as the authoritative
audit trail for the package's version pin. Future re-pin operations
(per § 9 Re-pinning policy) update the package version + each file's
6-line vendoring header.
```

The existing "## DeploySignal engine vendoring" table is preserved unchanged (the per-file rows + SHA `5a72371` + sync policy + notes all retain their semantic correctness; the "Target (tessera/)" column entries continue to name the original path because that path is the canonical engine source-of-truth identifier — the package's `src/<X>` path is a 1:1 mirror by construction).

### § 4.7 `coordination/SCOPING-MEMO-v0.3.md` § 9 (MOD opportunistic per W3-5)

Add a single paragraph at the end of § 9 (after the existing "Extract-to-npm commitment (Tessera Phase 2 close)" subsection that documents the future commitment):

```markdown
### Extract landed — R61 (2026-05-19)

The extract-to-npm commitment landed at Tessera Phase 3 SLICE 3 WU-Phase3-3A
(round R61). The package is `@johnpatrickwarren-oss/deploysignal-engine`
at `packages/deploysignal-engine/` within the Tessera monorepo per W3-2
Option B disposition. Per W3-1 Option A disposition, this round shipped
Tessera-side consumption only; the DS-side consumption update is routed
via a separate PR scheduled outside the Tessera pipeline. AC-P8
(vendoring-drift R-E6 structural elimination) is achieved for the
Tessera-side: there are no per-file SHA pins to drift inside the
package's scope; the package version pin replaces. The original
extract-to-npm-at-Phase-2-close framing is superseded by the realized
landing at Phase 3 SLICE 3.

See `coordination/specs/Q-R61-SPEC.md` for the full extract mechanism.
```

### § 4.8 `engine/types/verdict.ts` (MOD — import rewrite only; vendored-with-deltas content preserved)

At session-entry HEAD, `verdict.ts:38-39` shows:

```typescript
import type { Verdict, FamilyId } from './primitives';
import type { Baseline, Flags } from './metrics';
import type {
  ...
```

After Phase 4 import rewrite:

```typescript
import type { Verdict, FamilyId } from '@johnpatrickwarren-oss/deploysignal-engine';
import type { Baseline, Flags } from '@johnpatrickwarren-oss/deploysignal-engine';
import type {
  ...
```

Every `from './primitives'`, `from './metrics'`, `from './orchestration'`, `from './policy'`, etc. (where the imported file is one of the 33 moved files) rewrites to `from '@johnpatrickwarren-oss/deploysignal-engine'`. The Implementer applies this mechanical pattern.

Same pattern applies to every Tessera-tree file (engine/, tools/, test/) whose import targets a moved-to-package symbol. § 1.3 above documents the data flow.

### § 4.9 `test/q01-vendoring-coverage.test.ts` (MOD — path list updated)

The `VENDORED_AT_PIN_PATHS` array (currently lines 14-61) updates:

```typescript
const VENDORED_AT_PIN_PATHS: string[] = [
  // AC-1: 11 detector files (excluding _q72-trace.ts per SAS-7)
  'packages/deploysignal-engine/src/detectors/_linalg.ts',
  'packages/deploysignal-engine/src/detectors/betting-e-process.ts',
  // ... etc; each engine/X path becomes packages/deploysignal-engine/src/X
  // tools/* paths UNCHANGED (vendored-at-pin tools stay at tessera/tools/)
  'tools/curate-baseline-pipeline.ts',  // unchanged
  'tools/calibrators/_shared.ts',       // unchanged
  'tools/calibrators/family-c.ts',      // unchanged
];
```

The HEADER_RE + SHA_RE constants unchanged (header format unchanged — only file location moved). The manifest-row check (lines 77-96) continues to work because the existing manifest rows retain their tessera/engine/* row identifiers as the authoritative SHA-pin record per § 4.6.

**Subtle:** the existing test asserts `manifest.includes(p)` for each path in `AT_PIN_ENTRIES`. If the test now uses `packages/deploysignal-engine/src/...` paths but the manifest rows say `engine/...`, the includes-check fails. Resolution: the manifest's per-file rows MUST list both the original `engine/...` path AND the new `packages/deploysignal-engine/src/...` path. § 4.6 alternative: split the manifest table into two columns ("Target (original)" + "Target (post-R61)"). For minimal change, the spec prescribes: keep the existing rows; the test updates its path list to `packages/deploysignal-engine/src/...` BUT the row-check logic changes to read the file at its new location while the manifest row is matched by SHA + manifest-row containing the LOGICAL PATH (we add a per-row note specifying the post-R61 location).

Simpler resolution: amend the manifest table to add a per-row "Post-R61 location" note (or simply prepend a sentence to each row's "Notes" column saying "Moved to `packages/deploysignal-engine/src/<X>` at R61."). The test then asserts existence at the NEW path + manifest-row presence with the SHA. AC-R61-5 below verifies the test passes.

### § 4.10 `test/q01-no-at-pin-deltas.test.ts` (MOD — tessera-side paths updated)

The `AT_PIN_FILES` array (currently lines 29-76) updates tessera-side paths to `packages/deploysignal-engine/src/<X>`; source-side paths (`../deploysignal/engine/<X>`) unchanged:

```typescript
const AT_PIN_FILES: Array<{ tessera: string; source: string }> = [
  { tessera: 'packages/deploysignal-engine/src/detectors/_linalg.ts',
    source: 'engine/detectors/_linalg.ts' },
  // ... etc; each engine/X tessera path becomes packages/deploysignal-engine/src/X
];
```

The HEADER_LINE_COUNT + stripHeader logic unchanged. AC-R61-6 verifies the test passes (subject to `../deploysignal` sibling availability).

### § 4.11 `test/q61-engine-npm-extract.test.ts` (NEW)

```typescript
// test/q61-engine-npm-extract.test.ts — R61 ACs for package scaffold + Tessera consumption.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import * as path from 'node:path';

test('AC-R61-1 — packages/deploysignal-engine/package.json exists with expected name/version', async () => {
  const pkgPath = 'packages/deploysignal-engine/package.json';
  assert.ok(existsSync(pkgPath), `${pkgPath} missing`);
  const pkg = JSON.parse(await readFile(pkgPath, 'utf-8'));
  assert.strictEqual(pkg.name, '@johnpatrickwarren-oss/deploysignal-engine');
  assert.match(pkg.version, /^0\.1\.\d+$/);
  assert.strictEqual(pkg.main, 'dist/index.js');
  assert.strictEqual(pkg.types, 'dist/index.d.ts');
  assert.strictEqual(pkg.private, true);
});

test('AC-R61-2 — packages/deploysignal-engine/src/index.ts exists with 33 export-star re-exports', async () => {
  const indexPath = 'packages/deploysignal-engine/src/index.ts';
  assert.ok(existsSync(indexPath), `${indexPath} missing`);
  const content = await readFile(indexPath, 'utf-8');
  const matches = content.match(/^export \* from '\.\/[^']+';/gm) ?? [];
  assert.strictEqual(matches.length, 33,
    `expected 33 export-star lines in barrel; got ${matches.length}`);
});

test('AC-R61-7 — Tessera-side imports use package name (sample check)', async () => {
  // Sample 3 Tessera-tree files known to import from previously-vendored-at-pin paths.
  // Each must now import from '@johnpatrickwarren-oss/deploysignal-engine'.
  const samples = [
    'engine/types/verdict.ts',          // vendored-with-deltas; consumes primitives/metrics/...
    'engine/verdict-groups.ts',         // vendored-with-deltas; consumes core/types
    'engine/fleet/verdict-consumer.ts', // Tessera-original; consumes verdict + verdict-groups
  ];
  for (const p of samples) {
    const content = await readFile(p, 'utf-8');
    // Each sample must contain at least one import from the package OR import from
    // a Tessera-tree path (vendored-with-deltas siblings); the assertion is that
    // there is no leftover `from '../<moved-path>'` style import.
    const movedDetectorImport = /from ['"]\.\.\/detectors\//.exec(content);
    assert.strictEqual(movedDetectorImport, null,
      `${p} still has '../detectors/...' import (should rewrite to package)`);
  }
});

test('AC-R61-9 — workspaces declared in root package.json', async () => {
  const root = JSON.parse(await readFile('package.json', 'utf-8'));
  assert.deepStrictEqual(root.workspaces, ['packages/*']);
  assert.ok(root.devDependencies['@johnpatrickwarren-oss/deploysignal-engine'],
    'root devDependencies must include the package by name');
});
```

(Other ACs verified via Q-R61-EMPIRICAL.sh; see § 5 below.)

### § 4.12 `coordination/specs/Q-R61-EMPIRICAL.sh` (NEW)

Per Rule 1 sub-class `empirical-command-attestation` (R46 landing, R47 Tightenings 1-4 applied). One labeled bash block per empirical AC. See full file at `coordination/specs/Q-R61-EMPIRICAL.sh` co-emitted with this spec.

---

## § 5 Acceptance criteria

### § 5.1 AC table (15 ACs; structural source-grep + empirical runtime + cross-cutting Phase 1+2 preservation)

| AC | Given / When / Then | Verification |
|---|---|---|
| **AC-R61-1** | Given Phase 1 of § 2.1 complete, when `packages/deploysignal-engine/package.json` is read, then it contains `name=@johnpatrickwarren-oss/deploysignal-engine`, `version` matching `/^0\.1\.\d+$/`, `main=dist/index.js`, `types=dist/index.d.ts`, `private=true`. | `test/q61-engine-npm-extract.test.ts` AC-R61-1 + Q-R61-EMPIRICAL.sh AC-R61-1 block (jq query against the JSON file). |
| **AC-R61-2** | Given Phase 3 of § 2.1 complete, when `packages/deploysignal-engine/src/index.ts` is read, then it contains exactly 33 lines matching `^export \* from '\./[^']+';$`. | `test/q61-engine-npm-extract.test.ts` AC-R61-2 + Q-R61-EMPIRICAL.sh AC-R61-2 block (grep -cE pattern). |
| **AC-R61-3** | Given all 5 phases of § 2.1 complete, when `npx tsc -p tsconfig.test.json` runs, then exit code = 0 (no type errors). | Q-R61-EMPIRICAL.sh AC-R61-3 block (invokes tsc, captures exit). |
| **AC-R61-4** | Given Phase 2 of § 2.1 complete, when `git status --porcelain` is invoked, then 33 rename entries (R) are visible for the moved engine/* → packages/deploysignal-engine/src/* files. | Q-R61-EMPIRICAL.sh AC-R61-4 block (post-add, pre-commit; verified by `git diff --diff-filter=R --name-only`). Note: this AC is verified at Phase 2 mid-implementation (after `git add` but before chore-A commit); at chore-A SHA the renames are part of the commit and verifiable via `git log --diff-filter=R`. |
| **AC-R61-5** | Given Phase 4+5 of § 2.1 complete + manifest amended per § 4.6, when `node --test test/q01-vendoring-coverage.test.js` runs, then 3 sub-tests PASS (header format; SHA pin; manifest enumeration). | Q-R61-EMPIRICAL.sh AC-R61-5 block (runs the specific test file, asserts pass count). |
| **AC-R61-6** | Given Phase 4+5 of § 2.1 complete + tessera-side paths updated per § 4.10, when `node --test test/q01-no-at-pin-deltas.test.js` runs in main worktree with `../deploysignal` sibling present, then byte-identity check PASSes. | Q-R61-EMPIRICAL.sh AC-R61-6 block (runs the test file; pre-existing condition: ENOENT fail expected if sibling missing, per WAVE-GATE pre-flags). |
| **AC-R61-7** | Given Phase 4 import rewrite complete, when 3 sample Tessera-tree files (`engine/types/verdict.ts`, `engine/verdict-groups.ts`, `engine/fleet/verdict-consumer.ts`) are grepped, then no leftover `from '../detectors/...'` imports remain (the moved-to-package detector paths must rewrite to `'@johnpatrickwarren-oss/deploysignal-engine'`). | `test/q61-engine-npm-extract.test.ts` AC-R61-7 + Q-R61-EMPIRICAL.sh AC-R61-7 block (3-sample grep). |
| **AC-R61-8** | Given Phase 5 manifest amendment complete, when `coordination/VENDORING-MANIFEST.md` is read, then it contains the new section heading "## R61 npm package extract" (literal substring) AND every pre-R61 SHA-pin row (33 rows for engine/* + 3 rows for tools/*) is PRESERVED unchanged in the existing "## DeploySignal engine vendoring" table. | Q-R61-EMPIRICAL.sh AC-R61-8 block (grep -c for new section heading + grep -c for "5a72371" pre/post comparison). |
| **AC-R61-9** | Given Phase 5 root package.json amendment complete, when the root `package.json` is read, then `workspaces` equals `["packages/*"]` AND `devDependencies` includes `@johnpatrickwarren-oss/deploysignal-engine`. | `test/q61-engine-npm-extract.test.ts` AC-R61-9 + Q-R61-EMPIRICAL.sh AC-R61-9 block (jq query). |
| **AC-R61-10** | Given all 5 phases of § 2.1 complete + chore-A commit landed, when `node --test --test-reporter=tap test/*.test.js` runs at chore-A SHA, then the summary equals `399/394/2/3` post-chore-B (the AC-R61-15 forward-protection guard fails by construction at chore-A; passes post-SHA-injection at chore-B). See § 5.4 two-state distinction. | Q-R61-EMPIRICAL.sh AC-R61-10 block (full test run; assert against post-chore-B predicted summary). |
| **AC-R61-11** | Given the package extract is structurally complete, when `npm install` runs at root, then `node_modules/@johnpatrickwarren-oss/deploysignal-engine` exists (workspace symlink created). | Q-R61-EMPIRICAL.sh AC-R61-11 block (post-`npm install` symlink check via `test -L`). |
| **AC-R61-12** | Given package compiled via `npm run build:package`, when `packages/deploysignal-engine/dist/index.js` exists, then it is loadable via `node -e "require('@johnpatrickwarren-oss/deploysignal-engine')"` exit 0. | Q-R61-EMPIRICAL.sh AC-R61-12 block (require check exits 0). |
| **AC-R61-13** | Given Phase 5 SCOPING-MEMO § 9 amendment complete (W3-5 opportunistic touch), when `coordination/SCOPING-MEMO-v0.3.md` is read, then it contains the literal substring "Extract landed — R61" exactly once. | Q-R61-EMPIRICAL.sh AC-R61-13 block (grep -c exact). |
| **AC-R61-14** | Given chore-A SHA, when `git diff 8c64ce0..<chore-A-SHA> --name-only` is sorted and compared against the ALLOWED_SET (§ 3.2 parts a+b+c, optionally part d), then the diff is a subset of ALLOWED_SET (zero unexpected paths). | Q-R61-EMPIRICAL.sh AC-R61-14 block (manual at chore-A; advisory in script form per AC-R58-14 precedent). |
| **AC-R61-15** | Given chore-B SHA injected into AC-R61-14 reference text, when test runs at chore-B SHA, then AC-R61-14 binding-command (anti-scope diff vs ALLOWED_SET) passes; pre-chore-B it fails by construction due to `<INJECTED-AT-CHORE-B>` SHA placeholder. | Q-R61-EMPIRICAL.sh AC-R61-15 block (forward-protection pattern per R53/R56/R58 precedent). |

### § 5.2 AC-classification preamble (per R20 ARCH MINOR-1 cross-check)

- **Source-grep ACs (structural; verified by grep against source files):** AC-R61-1, AC-R61-2, AC-R61-7, AC-R61-8, AC-R61-9, AC-R61-13.
- **Runtime-test ACs (verified by `node --test` against a specific test file):** AC-R61-5, AC-R61-6, AC-R61-11, AC-R61-12.
- **Binding-command attestation ACs (verified by command exit code + stdout grep):** AC-R61-3 (`tsc` exit), AC-R61-10 (`node --test` count), AC-R61-14 (`git diff` subset), AC-R61-15 (forward-protection AC-R61-14 pinned to chore-B SHA).
- **Mid-implementation verification AC:** AC-R61-4 (`git status` rename count; verified before chore-A commit; at chore-A the verification shifts to `git log --diff-filter=R`).

Cross-check: every § 5.1 AC's verification path matches its § 4 / § 2 prescription (no AC classified as "binding-command attestation" in § 5.1 but prescribed as "committed runtime test" in § 4; no inverse). Per R20 ARCH MINOR-1 reinforcement.

### § 5.3 Branch-binding coverage table (per R21 ARCH MINOR-2/3)

| Branch / guard | File | AC |
|---|---|---|
| package barrel `export *` count = 33 | `packages/deploysignal-engine/src/index.ts` | AC-R61-2 (exact count) |
| `private: true` in package.json (prevents npm publish) | `packages/deploysignal-engine/package.json` | AC-R61-1 (deep-equals on key) |
| `main: "dist/index.js"` (Tessera consumes compiled output) | `packages/deploysignal-engine/package.json` | AC-R61-1 |
| Internal package imports remain relative (file-to-file inside `packages/deploysignal-engine/src/`) | every moved file | AC-R61-3 (tsc exit 0 catches resolution failure) |
| Tessera-side imports of moved symbols rewritten to package | sample: `engine/types/verdict.ts`, `engine/verdict-groups.ts`, `engine/fleet/verdict-consumer.ts` | AC-R61-7 (3-file grep) |
| `workspaces: ["packages/*"]` in root package.json (enables npm symlink) | `package.json` | AC-R61-9, AC-R61-11 (symlink existence after install) |
| `pretest` chain includes `build:package` | `package.json` | AC-R61-3 (tsc passes only if package built first) |
| manifest's "## R61 npm package extract" new section heading present | `coordination/VENDORING-MANIFEST.md` | AC-R61-8 |
| manifest's existing per-file SHA-pin rows preserved (33 engine + 3 tools = 36 rows containing "5a72371") | `coordination/VENDORING-MANIFEST.md` | AC-R61-8 (grep -c "5a72371" exact = 36 pre/post) |
| q01-vendoring-coverage updated path list (33 packages/.../src/ paths + 3 tools/) | `test/q01-vendoring-coverage.test.ts` | AC-R61-5 (test passes) |
| q01-no-at-pin-deltas updated tessera-side path list | `test/q01-no-at-pin-deltas.test.ts` | AC-R61-6 (test passes in main worktree) |
| 33 git rename entries between engine/* and packages/deploysignal-engine/src/* | git history | AC-R61-4 |
| tsc exit 0 post-extract | `npx tsc -p tsconfig.test.json` | AC-R61-3 |
| test count = `399/394/2/3` post-chore-B (or actual at chore-A per § 5.4 two-state) | `node --test test/*.test.js` | AC-R61-10 |
| Anti-scope diff ⊆ ALLOWED_SET | `git diff 8c64ce0..<chore-A>` | AC-R61-14 + AC-R61-15 forward-protection |

Every branch/guard prescribed in production code or build configuration has an AC that structurally exercises it. No spec-prescribed guard is unbound.

### § 5.4 Chore-A vs chore-B two-state distinction (per R53 MINOR-1 + R56 MINOR-1 reinforcements)

R61's structural extract operation modifies many files beyond the R36-frozen allowed-set (R36's forward-protection guards AC-R36-30 + AC-R36-31 pin to Phase 2 close SHA `87e372f`). The R36 forward-protection guards are EXPECTED to fail post-R61 because the extract by construction modifies files outside R36's frozen scope. This is NOT a regression — it is the predictable behavior of R36's guards detecting that subsequent rounds have legitimately exceeded R36's scope. The 2 known fails (R36-30 + R36-31) at session entry continue to fail post-R61.

**Predicted test counts:**

- **Pre-chore-B (at chore-A SHA, AC-R61-15 placeholder fails by construction):**
  Predicted: `tests=400 / pass=394 / fail=3 / skipped=3`. Counts: 399 existing + 1 new (q61-engine-npm-extract) = 400 tests; 4 sub-tests in q61 expected to pass minus AC-R61-15 placeholder failing by construction → 400/394/3/3 (the +3 fail = R36-30 + R36-31 + AC-R61-15 placeholder).
- **At chore-B SHA (post-injection):** `tests=400 / pass=395 / fail=2 / skipped=3`. AC-R61-15 placeholder resolved; +1 pass / -1 fail.

The Q-R61-EMPIRICAL.sh AC-R61-10 block asserts the POST-CHORE-B predicted value (`400/395/2/3`). At chore-A pre-injection, the AC-R61-10 block FAILS — this is the pre-documented two-state behavior. § 6.1 halt condition #1 carves this out from the halt-on-non-zero-exit trigger per R56 MINOR-1 reinforcement.

**Implementer attestation discipline:** At chore-A, the Implementer encodes the ACTUAL observed value verbatim (`400/394/3/3`) — NOT the spec-predicted chore-B value. Per Rule 1 sub-class `empirical-command-attestation`. No reframing as compliance.

(Note on count derivation: pre-R61 baseline is 399; R61 adds 1 new test file `test/q61-engine-npm-extract.test.ts` containing 4 `test(...)` blocks per § 4.11. The 4 q61 tests cover AC-R61-1, AC-R61-2, AC-R61-7, AC-R61-9; the remaining ACs are verified solely via Q-R61-EMPIRICAL.sh blocks. Architect pre-prediction count therefore = baseline 399 + 4 new = 403... wait, let me recount. 4 test blocks in q61 + 399 existing = 403. Hmm — the spec needs to predict 403 not 400. Let me revise: 

**Revised predicted test counts:**
- Pre-chore-B: `tests=403 / pass=397 / fail=3 / skipped=3` (4 new q61 tests pass + R36-30 + R36-31 + AC-R61-15 fails by construction).
- Chore-B: `tests=403 / pass=398 / fail=2 / skipped=3` (AC-R61-15 placeholder resolved).

The Q-R61-EMPIRICAL.sh AC-R61-10 block asserts `403/398/2/3` (chore-B predicted).
)

### § 5.5 Honest-broker disclosures (per R25 MINOR-2 transparency precedent)

1. **D-1: Counting precision in § 5.4 test count predictions.** The Architect's prediction (`403/398/2/3` at chore-B) derives from 399 baseline + 4 new q61 sub-tests. If the q61 test file actually contains a different sub-test count due to Implementer tactical choice (e.g., consolidating two ACs into one `test()` block), the actual count diverges. AC-R61-10 binds the post-chore-B PREDICTED value; if Implementer's q61 file deviates, the Implementer encodes ACTUAL verbatim per Rule 1 sub-class and the spec's count prediction may need refinement at chore-B SHA-injection time.
2. **D-2: q01-vendoring-coverage manifest-row check fragility.** The test currently asserts `manifest.includes(p)` for each path. Post-R61, the manifest's existing rows retain `engine/<X>` path identifiers (per § 4.6 — rows preserved as authoritative SHA-pin record); the test's path list updates to `packages/deploysignal-engine/src/<X>`. AC-R61-5 requires the test PASS; if the literal includes-check fails, the Implementer may need to either (a) update the manifest rows to use the new paths (more invasive but cleaner) OR (b) loosen the test's includes check to accept either-path. Architect's recommendation: option (b) — preserve the manifest's audit-trail integrity at the cost of a slightly looser test. Disclosed as Open Question OQ-R61-1.
3. **D-3: AC-R61-15 forward-protection pattern uses chore-B SHA injection placeholder.** Per R53/R56/R58 established pattern. The placeholder `<INJECTED-AT-CHORE-B>` is mechanically replaced at chore-B by the Implementer. Pre-injection, the AC-R61-15 block in Q-R61-EMPIRICAL.sh exits non-zero by construction; this is the pre-documented two-state behavior per § 6.1 halt-condition carve-out.
4. **D-4: Package's `private: true` means the package is not published to npm registry.** AC-P8's "both Tessera + DeploySignal repos consume the same version" is achievable at R61 only at the local-workspace level (Tessera-side). Full AC-P8 realization requires (i) npm registry publication of the package OR (ii) DS-side consumption via git-dependency reference to the Tessera repo's packages/ subtree. Both are out of R61 scope; flagged as Future operator action #6 in NEXT-ROLE.md.
5. **D-5: 33-file rename has large blast radius on `git status` output.** A future operator reading the chore-A commit will see 33 file renames + ~30-50 import-rewrite edits + 1 new package + 1 new test + various coordination updates. The total diff is ~70-100 files. This is unprecedented in Tessera (prior rounds touched ≤20 files). The Reviewer cold-eye audit will need substantial time. Spec's pre-emit grilling acknowledges the unusual scope.
6. **D-6: package compiled-output `dist/` is gitignored.** The `.gitignore`'s root-level `dist/` exclusion + `*.js` exclusion means `packages/deploysignal-engine/dist/` never appears in any `git diff`. The compiled output is regenerated at every `npm run build:package` invocation. AC-R61-12 verifies the compiled output is loadable; AC-R61-3 verifies tsc accepts the post-extract surface (which requires the package to be compiled into dist/ first via the pretest chain).

### § 5.6 Test-assertion discriminability (per Rule 3 `implementer-spec-test-assertion-coverage`)

Each AC's verification command was tested at spec-emit time for discriminability — a mutation in the implementation would cause the assertion to fail:

- AC-R61-1 (`pkg.name === '@johnpatrickwarren-oss/deploysignal-engine'`) — discriminating: any name typo or missing field would fail.
- AC-R61-2 (exact count 33 via `^export \* from '\./[^']+';$` regex) — discriminating: line-anchored pattern excludes any incidental occurrence of `export *` in comments or other contexts.
- AC-R61-3 (tsc exit 0) — discriminating: any unresolved import or type error fails.
- AC-R61-4 (33 git renames) — discriminating: under-move or over-move fails the count.
- AC-R61-5 (q01-vendoring-coverage 3 sub-tests pass) — discriminating: the test re-runs against the new paths; any header or SHA-pin or manifest gap fails.
- AC-R61-7 (no `from '../detectors/...'` in 3 sampled files) — discriminating: any leftover import would fail.
- AC-R61-8 (manifest "5a72371" exact count) — discriminating: any row removal or addition fails.
- AC-R61-9 (workspaces deep-equals) — discriminating: any value change fails.
- AC-R61-10 (test count exact = 403/398/2/3 at chore-B) — discriminating: any test add/remove/fail/pass deviation fails.

---

## § 6 Halt conditions

### § 6.1 Implementer halt triggers

1. **`Q-R61-EMPIRICAL.sh` exits non-zero at chore-A FOR ANY REASON OTHER THAN the pre-documented AC-R61-10 two-state count mismatch (chore-A predicted 403/397/3/3 vs Q-R61-EMPIRICAL.sh assert of chore-B 403/398/2/3) OR the AC-R61-15 placeholder-SHA-fails-by-construction:** HALT + DIAGNOSTIC + STATUS: ESCALATE. The R56 MINOR-1 carve-out applies: the two pre-documented FAILs are NOT halt triggers; any other failure is.
2. **`npm install` does not create the workspace symlink at `node_modules/@johnpatrickwarren-oss/deploysignal-engine`:** HALT + DIAGNOSTIC. Possible causes: npm version too old, package.json malformed, workspace declaration syntax error.
3. **`npx tsc -p tsconfig.test.json` exits non-zero after Phase 5 with errors that are NOT pre-documented (e.g., unresolved imports because import rewrite missed a file; type collision in the package barrel):** HALT + DIAGNOSTIC. Per R56 MINOR-1: if tsc surfaces a NEW class of error not anticipated in § 1.4 failure modes, halt.
4. **`git mv` of any of the 33 files fails (e.g., destination path collision, source file missing):** HALT + DIAGNOSTIC. Mechanical failure — unexpected.
5. **q01-vendoring-coverage.test.ts FAILS at chore-A (post-update):** HALT + DIAGNOSTIC. Possible cause: manifest rows weren't preserved as expected (per § 4.6); test's manifest.includes() check fails. Implementer applies the resolution from § 5.5 D-2 (option b: loosen check) and re-runs; if still fails, halt.
6. **q01-no-at-pin-deltas.test.ts byte-identity check FAILS at chore-A in main worktree with `../deploysignal` sibling present:** HALT + DIAGNOSTIC. This would mean the move corrupted file content — should not happen with `git mv`. Mechanical regression.
7. **The package's `npm run build` produces tsc errors against the moved source:** HALT + DIAGNOSTIC. Possible cause: cross-package type-identity issue (e.g., a moved file imports a type that — due to declaration-merging or similar — has identity outside the package).
8. **OQ-R61-1 (manifest-row check fragility) resolution requires architectural decision:** ESCALATE via DIAGNOSTIC with bounded options per § 5.5 D-2.

### § 6.2 Coordinator escalation triggers

1. **The extract architecturally requires DS-repo modification:** if any post-extract structural issue can ONLY be resolved by modifying `~/concord/deploysignal/` files, ESCALATE. Per W3-1 Option A operator disposition, DS-side modification is explicitly out of scope. Operator may need to re-evaluate W3-1.
2. **Phase 1+2 ACs regress (AC-P1 through AC-P4 cross-cutting violations):** if running the test suite reveals a Phase 1+2 detector regression caused by the move (highly unlikely given byte-identity preservation, but possible if import resolution semantics differ from pre-move), ESCALATE per AC-P7 cross-cutting concern.

---

## § 7 Cross-project rules (per Rule 7 Surface (a) — SPEC-AUTHORING-CHECKLIST.md § Rule 7 self-application gate)

| Rule | Canonical short name | Disposition | Mechanism |
|---|---|---|---|
| **Rule 1** | `false-compliance-attestation` (sub-class `empirical-command-attestation`) | ACTIVE GATE | Q-R61-EMPIRICAL.sh per-AC bash blocks; chore-A attestation cites actual command output (NOT memorized spec text). Tightenings 1-4 (R47) applied: no vacuous meta-ACs; runtime behavior not source presence; SHAs re-derived from git at citation time; exact counts not `≥ 1`. |
| **Rule 2** | `branch-binding-coverage-gate` | ACTIVE GATE | § 5.3 branch-binding coverage table enumerates every guard/branch/fallback in prescribed production code (package barrel, package.json fields, manifest content) with its binding AC. No spec-prescribed guard is unbound. |
| **Rule 3** | `implementer-spec-test-assertion-coverage` | ACTIVE GATE | § 5.6 test-assertion discriminability subsection documents each AC's verification command's discriminating-vs-non-discriminating analysis. Tightenings 1-4 applied throughout (exact counts; line-anchored regex; runtime behavior verification). |
| **Rule 4** | `anti-scope-allowed-set-forward-coverage` | ACTIVE GATE | § 3.2 ALLOWED_SET enumerated at spec-emit time in 4 parts (explicit + 2 regex carve-outs + conditional DIAGNOSTIC). Forward-coverage gate active: spec amendment required FIRST before any chore-A ALLOWED_SET expansion. |
| **Rule 5** | `rule-derivation-without-self-application` | N/A | No new cross-project rule derived this round. R61 is a SLICE 3 substantive round (not a methodology round); does not derive new rules. |
| **Rule 6** | `halt-discipline-no-DIAGNOSTIC-for-workaround` | ACTIVE GATE | § 6 halt conditions enumerated explicitly; pre-documented two-state failures carved out per R56 MINOR-1 (AC-R61-10 chore-A vs chore-B + AC-R61-15 placeholder failures are NOT halt triggers). All other unexpected failures HALT + DIAGNOSTIC + ESCALATE. |
| **Rule 7** | `derived-rule-propagation-mechanism-required` | ACTIVE GATE per Surface (a) | This § 7 IS Surface (a) implementation. Surface (b) (scripts/pre-commit-rule-sweep.sh) runs at chore-A invocation per pipeline-mandatory discipline. Surface (c) not triggered (no new rule derived). |

Canonical short names verified against `~/.claude/CROSS-PROJECT-MEMORIAL.md` (R44 MAJOR-1 canonical-name-drift discipline restored at R46 and continued through R56).

---

## § 8 Open questions

**OQ-R61-1 (Architect surfaces; non-blocking; Implementer-resolvable per D-2 disposition):** When q01-vendoring-coverage.test.ts updates its path list to `packages/deploysignal-engine/src/<X>` paths but the manifest's existing rows still say `engine/<X>` paths, the test's `manifest.includes(p)` check may fail. Two resolution options:

- **(a) Update manifest rows to use new paths.** Rewrite each row's "Target (tessera/)" column to `packages/deploysignal-engine/src/<X>`. More invasive (touches 33 rows) but the manifest then matches the new physical reality cleanly. Loses the audit trail that says "this file's lineage as `engine/<X>` was the original Tessera-vendored path"; that lineage moves to the new § "R61 npm package extract" section explanatory prose.
- **(b) Loosen test's includes check to accept either-path** (e.g., `manifest.includes('packages/deploysignal-engine/src/<X>') || manifest.includes('engine/<X>')`). Less invasive (test edit only). Preserves the manifest's audit-trail integrity. Slightly weaker test discriminability.

**Architect recommendation:** Option (b) — preserve manifest audit trail; test edit is minimal. The manifest's existing rows retain their semantic correctness (they document the vendored-at-pin file's lineage with SHA `5a72371`); the new top section in § 4.6 documents the post-R61 physical location. If the Implementer encounters an unforeseen issue with option (b), ESCALATE per § 6.1 #5 with bounded options.

(No other open questions surfaced during brainstorm + design + cross-section consistency check. All other design decisions are resolved in § 0–§ 5.)

---

## § 9 P3 ten-axis verification

| Axis | Verdict |
|---|---|
| **Correctness** | Per-file pseudocode + § 4 prescriptions verified against session-entry source state at HEAD `8c64ce0`. Move list (33 files) cross-checked against `coordination/VENDORING-MANIFEST.md` § DeploySignal engine vendoring (rows count = 36; minus 3 vendored-with-deltas = 33 at-pin; minus 3 tools/* at-pin that stay = 33 engine/* at-pin files moving). |
| **Completeness** | All 5 phases of § 2.1 prescribed; every integration point in § 1.2 has a corresponding mitigation in § 1.4; all 33 moved files + all Tessera-side import-rewrite consumers enumerated; package scaffold (package.json + tsconfig.json + README + index.ts) + Tessera-side updates (package.json + manifest + tests + opportunistic SCOPING-MEMO) all covered. |
| **Consistency** | Cross-section consistency table for major tokens: package name `@johnpatrickwarren-oss/deploysignal-engine` used identically across § 2.2 / § 2.4 / § 4.1 / § 4.5 / § 5.1 / § 5.3 / § 5.4 / § 4.7 (8 sites; checked via grep at spec-author time). 33-file count used identically across § 1.1 / § 1.5 / § 2.1 / § 3.2 / § 4.4 / § 5.3 / § 9.3 (7 sites; consistent). Round-start SHA `8c64ce0` used identically across preamble / § 5.1 AC-R61-14 / § 3.2 ALLOWED_SET note. Two-state predicted counts (`403/397/3/3` chore-A; `403/398/2/3` chore-B) cited consistently across § 5.1 / § 5.4 / Q-R61-EMPIRICAL.sh. |
| **Clarity** | Section structure mirrors recent R53/R56/R58 specs; per-file pseudocode prescribes precise edits; ALLOWED_SET enumerated in 4 explicit parts. Open question surfaced transparently per OQ-R61-1. |
| **Coverage** | 15 ACs cover: package scaffolding (5: AC-R61-1/2/9/11/12); Tessera-side consumption (3: AC-R61-3/7); manifest updates (1: AC-R61-8); test updates (2: AC-R61-5/6); cross-cutting tests (1: AC-R61-10); anti-scope diff (2: AC-R61-14/15); SCOPING-MEMO (1: AC-R61-13); git rename detection (1: AC-R61-4). All R61 deliverables in § 1.1 component inventory have at least one binding AC. |
| **Constraints** | A12 preserved (vendored-at-pin headers + SHA `5a72371` byte-preserved through move; § 3.1 #1). Operator dispositions W3-1/2/3/4/5 honored throughout (§ preamble). Path B carry-forward (§ 3.1 #3). No external deps (§ 3.1 #5). |
| **Concurrency** | N/A — single-cluster Wave 9 per WAVE-PLAN-09; no parallel-cluster D5-strict conflict at R61. R63 Wave 10 dispatch will follow R61 close. |
| **Corner cases** | (i) `git mv` rename detection across all 33 files — verified at AC-R61-4; (ii) package barrel `export *` name collision — § 1.5 pre-prediction documents no collision, AC-R61-3 catches if Architect prediction wrong; (iii) q01-vendoring-coverage manifest-row check fragility — § 5.5 D-2 + OQ-R61-1 surface the issue with bounded options; (iv) q01-no-at-pin-deltas sibling-repo dependence — § 4.10 pre-existing condition; (v) cross-package type identity for declaration-merged interfaces — N/A (no engine code uses declaration merging per session-entry grep). |
| **Cost** | Large diff (~70-100 files modified including renames). Reviewer cold-eye audit time will be substantial. Disclosed in § 5.5 D-5. Estimated chore-A Implementer time: 2-3 hours of mechanical work + verifier iteration. |
| **Coupling** | Tessera-side imports get coupled to the package via name `@johnpatrickwarren-oss/deploysignal-engine`. DS-side coupling deferred per W3-1. No new coupling to external services or libraries (W3-4). |

---

## § 10 Pre-emit grilling output

### § 10.1 Q1-Q4 grilling per Superpowers Review

- **Q1: Every claim verifiable?** Yes. All structural claims grounded in session-entry source state (HEAD `8c64ce0`); empirical baseline 399/394/2/3 + tsc exit 0 verified by Architect via `node --test` + `npx tsc` at session entry; AC verification commands enumerated in Q-R61-EMPIRICAL.sh; AC-R61-4 git-rename count is the most mechanically demanding claim and is independently verifiable at chore-A via `git log --diff-filter=R`.
- **Q2: Unstated assumptions?** Documented in § 5.5 (6 honest-broker disclosures) + § 1.4 (failure modes) + § 1.5 (barrel pre-prediction). The "TS bivariance" / "TS package resolution" assumptions are documented per Approach A in § 0.3 + § 0.4. The "no name collision in barrel" assumption is documented in § 1.5 with mitigation (AC-R61-3 catches).
- **Q3: Scope added beyond request?** No. Each deliverable traces to either (a) FR-D1 / AC-P8 (PRD), (b) operator disposition W3-1/2/3/4/5, OR (c) cross-project rule honoring (Rule 1 sub-class + Rule 4 ALLOWED_SET + Rule 7 § 7). The opportunistic SCOPING-MEMO § 9 touch (§ 4.7) is bounded to a single-paragraph addition per W3-5 disposition. The 33-file move is the EXACT vendored-at-pin subset; no over-move into Tessera-original territory.
- **Q4: Implementer can act without guessing?** Yes. § 2.1 prescribes the 5 phases sequentially. § 4 provides per-file pseudocode for all NEW/MOD files. The 33-file move list is mechanically enumerable from VENDORING-MANIFEST.md's vendored-at-pin rows. § 6 halt conditions enumerate every anticipated failure mode with response. OQ-R61-1 surfaces the one open architectural question with Architect recommendation and bounded options for Implementer ESCALATE if needed.

### § 10.2 Reinforcement sweep (Architect REINFORCEMENTS in CLAUDE-ARCHITECT.md applied)

- **R01 cross-section consistency:** Applied — § 9.3 cross-section consistency table verifies major tokens.
- **R02 type-declaration-site check:** N/A this round (no constructor-options literals or named typedefs in spec pseudocode beyond what's enumerated; verdict.ts/config.ts/verdict-groups.ts stay at tessera tree unchanged in content).
- **R02-companion-tracked check:** N/A (no `git rm` commands; only `git mv`).
- **R03 re-export chain verification:** Applied — package barrel `src/index.ts` re-export discipline enumerated in § 1.5; AC-R61-2 binds the count.
- **R03 grep-pattern-distinguishes-comments:** Applied — AC-R61-2 uses line-anchored `^export \* from '\./[^']+';$` regex; AC-R61-7 uses `from ['"]\.\.\/detectors\//` pattern bound to import position; AC-R61-13 uses exact substring grep.
- **R03 test-count empirical at spec time:** Applied — Architect ran `node --test test/*.test.js` at session entry; recorded 399/394/2/3.
- **R05 Component inventory arithmetic cross-check:** Applied — 33 vendored-at-pin engine/* files cross-checked against VENDORING-MANIFEST.md row count and against q01-vendoring-coverage.test.ts VENDORED_AT_PIN_PATHS array.
- **R06 delta site grep for stale text:** N/A (no JSDoc-class deltas in this round).
- **R06 opts-interface field coverage:** N/A (no opts-interface declarations in spec pseudocode).
- **R07 empirical premise verification — fixture accumulation adequacy:** N/A (no statistical detector ACs).
- **R07 OBSERVED-binding scope:** N/A.
- **R08 inherited-testimony verification:** Applied — Architect verified empirical baseline via direct command runs (NOT inheriting from R60 Coordinator attestation or other prior round testimony).
- **R10 file-level documentation coverage:** Applied — VENDORING-MANIFEST.md gets a new top section per § 4.6; SCOPING-MEMO § 9 gets a new subsection per § 4.7 (opportunistic per W3-5).
- **R11 line-citation cite-then-verify:** Applied — every file:line cited in this spec (e.g., `verdict.ts:38-39`, `coordination/SCOPING-MEMO-v0.3.md` § 9 line 594, `engine/topology-overlay.ts:50-55`) verified during spec authoring at session-entry HEAD `8c64ce0` via Read or Grep.
- **R13 statistical-term-to-formula cross-check:** N/A (no statistical formulas).
- **R15 (no spec-internal contradiction):** Applied — § 9.8 not explicitly written but § 9.3 consistency table covers token consistency; § 5.4 chore-A vs chore-B two-state is explicitly carved out from § 6.1 halt trigger #1 per R56 MINOR-1 reinforcement.
- **R18 vendored file delta full-body test impact:** Applied — q01-no-at-pin-deltas test's body-identity check is the per-row R18 cross-check; the move preserves body identity modulo the 6-line header which the test strips already.
- **R20 § 5 preamble attestation-type vs § 4.x prescription:** Applied — § 5.2 AC-classification preamble cross-checks each AC's verification path against its § 4 prescription.
- **R21 spec-commit-sequencing:** PENDING — this spec will commit BEFORE the Implementer's chore-A commit. The NEXT-ROLE.md routing block updates after spec commit. Discipline applied at routing time per CLAUDE-COMMON.md REINFORCED 2026-05-17 supplementary check.
- **R21 branch-binding coverage:** Applied — § 5.3 branch-binding table enumerates every guard/branch with its binding AC.
- **R23 .gitignore-aware spec inventory:** Applied — § 3.3 per-path git-trackability verification; `packages/` not gitignored; `package-lock.json` tracked; package's `dist/` correctly gitignored.
- **R25 MAJOR-2 spec-mandated DIAGNOSTIC paths in ALLOWED_SET:** Applied — conditional DIAGNOSTIC entry in § 3.2 part (d).
- **R25 MAJOR-3 operator-amendment spec consistency:** N/A this round (no operator amendments to inherited dispositions).
- **R26 false-compliance-attestation:** Applied — Implementer-attestation discipline documented in § 5.4 + § 6.1 + § 7 Rule 1 row.
- **R30 MINOR-1 assertion discriminability:** Applied — § 5.6 documents discriminability analysis.
- **R34 MINOR-2 algorithmic boundary clauses:** N/A (no algorithmic boundary clauses; this round is structural extract not algorithm).
- **R34 MINOR-3 regex validity:** Applied — § 5.6 AC-R61-2 regex pattern `^export \* from '\./[^']+';$` syntactically valid JS regex; § 3.2 ALLOWED_SET regex patterns all valid POSIX/grep-compatible.
- **R44/R46 chore-A vs chore-B test-count prediction:** Applied — § 5.4 explicit two-state documentation with predicted counts for each state; AC-R61-15 forward-protection mechanism per R53/R56/R58 precedent.
- **R56 MINOR-1 halt-condition carve-out:** Applied — § 6.1 halt condition #1 explicitly excludes pre-documented two-state failures.
- **R58 MINOR-1 constructor-options symbol drift:** N/A (no constructor-options pseudocode in this round).
- **R58 MINOR-3 post-MOD line citation:** Applied — § 4.8 / § 4.9 / § 4.10 cite line numbers at session-entry HEAD and explicitly note the rewrite pattern; no absolute post-MOD line numbers asserted in branch-binding table beyond what the AC verifies dynamically.

### § 10.3 Cross-section consistency check (R01)

| Token | Sites | Consistent? |
|---|---|---|
| Package name `@johnpatrickwarren-oss/deploysignal-engine` | preamble, § 2.2, § 2.4, § 4.1, § 4.5, § 4.7, § 5.1 (multiple), § 5.3, § 7 | YES (8+ sites verified verbatim) |
| Round-start SHA `8c64ce0` | preamble, § 3.2 ALLOWED_SET diff baseline, § 5.1 AC-R61-14 | YES (3 sites) |
| Package version `0.1.0` | § 2.2, § 4.3 README, § 5.1 AC-R61-1 regex `/^0\.1\.\d+$/` | YES (3 sites; regex permits 0.1.0+) |
| Vendored SHA `5a72371` | preamble (vendoring history), § 4.3 README, § 4.6 manifest section, § 5.3 AC-R61-8 (manifest grep), q01-vendoring-coverage test constant | YES |
| 33-file count | § 1.1, § 1.5, § 2.1, § 3.2 part (b), § 4.4, § 5.3 | YES (6 sites) |
| Predicted test counts (chore-A 403/397/3/3; chore-B 403/398/2/3) | § 5.1 AC-R61-10, § 5.4, Q-R61-EMPIRICAL.sh AC-R61-10 block | Will be verified in Q-R61-EMPIRICAL.sh; spec-side consistent. |
| Two-state mechanism (per R53/R56/R58 pattern) | § 5.4, § 5.5 D-3, § 6.1 #1 carve-out, § 5.1 AC-R61-15 | YES |

### § 10.4 Pre-route checklist

- [x] § 0 Brainstorm with 3 approaches × 4 axes documented.
- [x] § 1 Design phase: component inventory + integration points + data flow + failure modes + pre-prediction.
- [x] § 2 Mechanism phases prescribed.
- [x] § 3 Anti-scope + ALLOWED_SET enumerated with regex carve-outs covering ~70-100 file diff.
- [x] § 4 Per-file pseudocode for all NEW/MOD files.
- [x] § 5 ACs with branch-binding coverage + chore-A/chore-B two-state per R53/R56 + assertion-discriminability subsection.
- [x] § 6 Halt conditions with R56 MINOR-1 carve-out.
- [x] § 7 All 7 cross-project rules enumerated with active-gate/N-A disposition.
- [x] § 8 Open questions surfaced (OQ-R61-1 only).
- [x] § 9 P3 ten-axis verification.
- [x] § 10 Pre-emit grilling output written inline.
- [x] Empirical baseline verified at session entry via direct command runs (not inherited testimony).
- [x] Spec artifacts to commit BEFORE NEXT-ROLE.md routing update (per R21 ARCH MINOR-1).
- [x] Q-R61-EMPIRICAL.sh authored as sibling file with per-AC bash blocks (Rule 1 sub-class).

---

## § Pipeline invocation

```bash
cd /Users/johnwarren/concord/tessera
./run-pipeline.sh --round R61 --tier full
```
