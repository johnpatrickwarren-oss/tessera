# Tessera — Code Review Remediation Plan

- **Date:** 2026-06-10
- **Commit reviewed:** `eae2499` (default branch, fresh clone of `github.com/johnpatrickwarren-oss/tessera`)
- **Reviewer:** automated deep review (full source, tests, scripts, configs; test suite executed)

## Summary

Tessera's product code (curation pipeline, demo scenarios, envelope/coverage tools) is in good shape: the statistical tooling is careful, deterministic-output claims were verified byte-identical (R72 coverage matrix and `build:demos` both regenerate with no diff), the CLI demo scenarios run correctly, shell scripts parse cleanly, no secrets are committed, and the engine dependency is commit-pinned in `pnpm-lock.yaml`. However, the repo is broken **at the toolchain boundary** following the R90 engine npm extract: `tools/build-browser-bundle.ts` still imports the deleted in-repo `engine/` tree, so the browser bundle (and therefore the dashboard's headline "Live mode") cannot be built, and two tests fail at HEAD. Independently, every `pnpm run` / `pnpm test` / `pnpm exec` invocation on a fresh clone exits 1 under the pinned `pnpm@11.1.2` because the esbuild build-script approval cannot be satisfied (`pnpm-workspace.yaml` is gitignored and `package.json#pnpm.onlyBuiltDependencies` is not honored). The README is also materially stale post-extract (documents an `engine/` directory and `coordination/` directory that are not in the repo), and there is no CI, so none of these breaks were caught.

**Test suite results (run via `tsc -p tsconfig.test.json && node --test test/*.test.js`, bypassing the broken pnpm wrapper):** 543 tests — **531 pass, 2 fail, 10 skip** (`node --test` exit code 1). Failures: `AC-R84-13` and `AC-R84-14` in `test/q84-live-engine-compute.test.ts` (broken browser-bundle build; see C1/H1). Skips: 10 clustersynth tests gated on gitignored fixtures (documented in `bench/README.md`; expected).

---

## Critical

### C1. `pnpm build:browser` is broken — bundle entry imports the deleted `engine/` directory

- **Files:** `tools/build-browser-bundle.ts:15-31`; `demos/engine-worker.js:43-46`; `.gitignore` (`demos/engine-bundle.mjs` ignored)
- **Problem:** The esbuild entry source hardcodes nine imports from `./engine/...` (`./engine/topology-overlay`, `./engine/detectors/betting-e-process`, `./engine/fleet/e-bh`, etc.). The in-repo `engine/` tree was removed when the engine was extracted to the npm package `@johnpatrickwarren-oss/deploysignal-engine` (commit `07d99bb`, "R90: engine npm extract"), but this entry was never updated. Verified: `node tools/build-browser-bundle.js` fails with 9 `Could not resolve "./engine/..."` errors.
- **Impact:**
  - `demos/engine-bundle.mjs` is gitignored and cannot be regenerated → the dashboard's **Live mode** (README lines 85–91, DEMO-SCRIPT minute 10:00–12:00) is unusable from this repo.
  - Tests `AC-R84-13`/`AC-R84-14` (`test/q84-live-engine-compute.test.ts:135-205`) build the bundle on demand and therefore **fail at HEAD** — the suite is red.
- **Remediation:** Rewrite `ENTRY_SOURCE` to re-export from the package, e.g. `from '@johnpatrickwarren-oss/deploysignal-engine/topology-overlay'`, `.../detectors/betting-e-process`, `.../fleet/e-bh`, `.../per-shard/runtime`, `.../events/freeze-hook`, `.../topology/common-mode-attribution`, `.../types` (same subpaths the tests already import). Re-run `pnpm build:browser` and the q84 tests to confirm green.

## High

### H1. Fresh-clone `pnpm install && pnpm test` fails — esbuild build-script approval unsatisfiable

- **Files:** `package.json:54-56` (`pnpm.onlyBuiltDependencies: ["esbuild"]`), `.gitignore:24-25` (ignores `pnpm-workspace.yaml`), `README.md:61-71` (Getting started)
- **Problem:** Under the pinned `packageManager: pnpm@11.1.2`, the `onlyBuiltDependencies` setting in `package.json` is not honored (pnpm ≥ 10 reads it from `pnpm-workspace.yaml`), and `.gitignore` explicitly ignores `pnpm-workspace.yaml` (commented as "auto-created by pnpm; project-local; not tracked"). Result: esbuild's build script is "Ignored", and pnpm's pre-run dependency check then fails **every** scripted invocation. Verified: `pnpm run typecheck` → exit 1 with `[ERR_PNPM_IGNORED_BUILDS] Ignored build scripts: esbuild@0.28.0`; same failure inside the test suite wherever tests shell out to `pnpm exec` (q84). The README quick-start (`pnpm install; pnpm test`) does not work on a fresh clone.
- **Remediation:** Commit a `pnpm-workspace.yaml` containing `onlyBuiltDependencies: [esbuild]` and remove the `.gitignore` entry (or, alternatively, list esbuild under `ignoredBuiltDependencies` — its bundled binary ships via optionalDependencies and the postinstall is not required). Then verify `pnpm install && pnpm test` passes from a clean clone.

### H2. Test suite is red at HEAD (2 failures), and the failing tests contradict their own skip contract

- **Files:** `test/q84-live-engine-compute.test.ts:135-141, 177-181`
- **Problem:** 531/543 pass; `AC-R84-13` and `AC-R84-14` fail (downstream of C1 + H1). Additionally, the comment at line 136 says "Skip with explicit reason if bundle isn't present (gitignored / not built)" but the code instead **builds** the bundle via `execSync('pnpm exec node tools/build-browser-bundle.js')` — so the test inherits both the broken build and the pnpm wrapper failure, and its failure message (a pnpm install stack trace) obscures the root cause.
- **Remediation:** Fix C1 and H1 first (the tests then pass). Also make the q84 build step call `node tools/build-browser-bundle.js` directly (no `pnpm exec`, avoiding the dep-check) or implement the documented `t.skip()` path with the build as an opt-in, so a missing/broken bundle yields a clear diagnostic.

## Medium

### M1. README materially misdescribes the repository post-R90 engine extract

- **Files:** `README.md:53-59` (Engine sourcing), `README.md:118-127` (Methodology — `coordination/` contents), `README.md:129-153` (Layout)
- **Problem:** Verified against the tree at `eae2499`:
  - The Layout section lists `engine/` with `core.ts`, `detectors/`, `topology/`, `types/`, `events/`, `ds-integration/`, `per-shard/`, `l0/, l1/, fleet/, o0/` — **no `engine/` directory exists**; the engine is now the npm dependency `@johnpatrickwarren-oss/deploysignal-engine#v0.3.1-pre`.
  - "Engine sourcing" says "Tessera vendors the load-bearing engine subset … Each vendored file carries a header" and calls the npm extract "deferred to Phase 4" — the extract has already happened; only `tools/calibrators/*` remain vendored.
  - The Methodology section says "The `coordination/` directory contains: PRD.md, SCOPING-MEMO…" — `coordination/` is gitignored (`.gitignore:28-33`) and not in the published repo.
  - Layout shows `run-pipeline.sh` under `scripts/` and at root simultaneously; it exists only at root (also echoed at `run-pipeline.sh:768`, which tells the operator to run `scripts/run-pipeline.sh`).
- **Remediation:** Rewrite the Layout/Engine-sourcing/Methodology sections to reflect the engine-as-dependency architecture, mark `coordination/` as pipeline-local (not published), and correct the `run-pipeline.sh` path.

### M2. Dashboard "Live mode" cannot work as documented even after the bundle is fixed

- **Files:** `README.md:79-91` ("no install / no server required", "opens from `file://`"), `demos/demo.html:13189` (`worker = new Worker('./engine-worker.js')`), `demos/DEMO-SCRIPT.md:186+`
- **Problem:** Canned mode genuinely works from `file://` (all 8 scenarios are inlined as `<script type="application/json">` blocks — verified at `demos/demo.html:443-12609`). But Live mode constructs a classic `Worker` from a relative URL: Chromium and Safari refuse worker construction from `file://` origins (origin `null`), so the Live toggle's Run button will error unless the page is served over HTTP. Combined with `demos/engine-bundle.mjs` being gitignored (and the build broken, C1), a user following the README cannot reach a working Live mode.
- **Remediation:** Either ship the bundle and document an HTTP serving step for Live mode (`python3 -m http.server` / `npx serve demos`), or detect `location.protocol === 'file:'` in `demo.html` and show a targeted error banner. Update README/DEMO-SCRIPT to scope the "no server required" claim to canned mode.

### M3. `pnpm build` is a no-op — root tsconfig compiles zero files

- **Files:** `tsconfig.json:20` (`"include": []`), `package.json` (`"build": "tsc"`), `README.md:70` (`pnpm build # tsc compile`)
- **Problem:** The root `tsconfig.json` has an empty `include` array, so `tsc` type-checks/emits nothing. Verified: `tsc --listFiles` lists only `node_modules` lib/types files. The README advertises `pnpm build` as a meaningful compile step; all real compilation happens through `tsconfig.test.json` pre-hooks.
- **Remediation:** Either remove the `build` script + README line, or point it at `tsconfig.test.json` (`"build": "tsc -p tsconfig.test.json"`) so it matches what the project actually builds.

### M4. Declared architecture gates are unenforced; repository has no CI

- **Files:** `arch-invariants.json` (4 block-severity invariants, `"engine": "ast-grep"`); no `.github/` directory anywhere in the repo
- **Problem:** `arch-invariants.json` declares ratchet gates (max complexity 12, max function length 150, no time-bomb tests, product-tests-must-not-read-`coordination/`) with `"severity": "block"`, but nothing in this repo consumes the file: no script references it (`grep -rl arch-invariants` over scripts/tools/tests/run-pipeline.sh returns nothing) and `ast-grep` is not a dependency. There are also no CI workflows at all, which is why a red test suite (H2) and a broken build (C1) exist at HEAD of the default branch.
- **Remediation:** Add a GitHub Actions workflow that runs `pnpm install`, `pnpm typecheck`, `pnpm test`, and `pnpm build:browser` on push/PR; add (or vendor the invocation of) the gate runner that consumes `arch-invariants.json`, or document that the gate runs from an external harness.

## Low

### L1. `scripts/tier-router.ts` CLI robustness + import side effects

- **Files:** `scripts/tier-router.ts:34-56, 326`; same pattern in `scripts/measure-cache-effect.ts:83` and `scripts/mu-model-select.ts`
- **Problem:** (a) `main()` executes at module load with `process.exit()` — unlike the `if (require.main === module)` guard used by every `tools/*` CLI, so importing the module for reuse/testing runs the CLI; (b) `--directive`/`--mode`/`--confidence-threshold` as the final argument reads `argv[++i]` → `undefined` (crash or `parseFloat(undefined)` → `NaN`, which silently disables the hybrid tiebreaker because `confidence < NaN` is always false); (c) `--roles` in `measure-cache-effect.ts:25` is cast to `Role[]` without validation.
- **Remediation:** Add the module-main guard, validate flag values (reject missing/NaN), and validate `--roles` members.

### L2. `run-pipeline.sh` lockfile acquisition is non-atomic

- **Files:** `run-pipeline.sh:430-476`
- **Problem:** Lock acquisition is check-then-create (`[[ -f "$LOCKFILE" ]]` … `cat > "$LOCKFILE"`), a TOCTOU race — two concurrent invocations for the same round can both acquire the lock. Stale-lock cleanup trusts the PID line without comm-name verification.
- **Remediation:** Use atomic creation (`set -o noclobber; > "$LOCKFILE"` or `mkdir "$LOCKFILE.d"`); minor since this is a single-operator tool.

### L3. Stale references and dead test constants

- **Files/evidence:**
  - `test/q82-engine-browser-bundle.test.ts:13-21` — dead constants `TOPOLOGY_OVERLAY_PATH` (points to nonexistent `engine/topology-overlay.ts`), `BUNDLE_PATH`, `BUILD_TOOL_PATH`, `ROUND_START_SHA`, plus unused `execSync` import — leftovers from a trimmed test file.
  - `CLAUDE-COMMON.md:252` references `templates/PRD-TEMPLATE.md`, which does not exist in `templates/`.
  - `run-pipeline.sh:768` directs the operator to `scripts/run-pipeline.sh` (script lives at repo root).
- **Remediation:** Delete dead constants/imports; fix or remove the two stale path references.

### L4. README drift (counts, versions, duplication)

- **Files:** `README.md:9, 69, 149` ("67+ rounds", "~440 tests", "440+ tests (q01–q66)") vs. reality (543 tests, test files through `q88`); `README.md:73` and `README.md:225` — two separate `## Quick demo` sections with overlapping/duplicated dashboard content; `package.json:4` `0.1.0-pre` vs. README "v1 publication candidate".
- **Remediation:** Merge the duplicate Quick-demo sections, refresh counts, and align the version story (either tag a v1 RC or soften the README claim).

### L5. Detection-envelope trial seeds are serially correlated

- **Files:** `tools/detector-envelope.ts:57, 207` (`seed = PREFIX ^ (cell_idx*5 + ti)`, fed to an LCG); same pattern in `tools/topology-walk-tuning.ts`
- **Problem:** Adjacent integer seeds into a pure LCG produce correlated streams, so the 5 "independent" trials per cell are statistically related; detection-rate cells are noisier/biased relative to the implied independent-trials interpretation. Determinism is unaffected.
- **Remediation:** Hash the seed before use (e.g., mulberry32/splitmix64 scramble of `PREFIX ^ index`, as `tools/calibrators/_shared.ts:mulberry32` already provides) when next regenerating the envelope; note the change in the matrix `schema_version`.

### L6. 10 tests permanently skip on fresh clones (informational)

- **Files:** `test/q-clustersynth-smoke.test.ts`, `test/q-r06-federation-attribution.test.ts`, `test/q-md-f4-common-mode-injection.test.ts`; `.gitignore` (`test/_substrate/clustersynth-*.json`)
- **Problem:** The clustersynth fixture JSONs are gitignored, so these tests always skip outside a machine where the fixtures were generated (`bench/README.md` documents the generation steps). Acceptable, but the skips are easy to mistake for green coverage.
- **Remediation:** Optionally commit one small fixture (S2-scale) or emit a louder skip diagnostic pointing at `bench/README.md`.

---

## Verified-good (no action)

- `pnpm coverage` (R72) and `pnpm build:demos` regenerate **byte-identical** committed artifacts (idempotency claims hold).
- CLI demo scenarios (`node tools/demo-scenario.js <name>`) run deterministically and match documented behavior.
- No committed secrets / keys; `.gitignore` covers `.env*`; lockfile pins the engine dependency to a commit tarball (`8ccbd18c…`).
- All shell scripts pass `bash -n`; no `eval`/`curl|bash` patterns; the `--dangerously-skip-permissions` fallback in `run-pipeline.sh` is operator-facing and loudly warned.
- Baseline-curation flow (`tools/curate-baseline*.ts`): threshold gating, validation short-circuit, and audit-record emission match the README contract (exit codes verified against `decideOutcome` and the R88 tests).

---

## Prioritized remediation checklist

- [x] **C1** Repoint `tools/build-browser-bundle.ts` `ENTRY_SOURCE` imports from `./engine/*` to `@johnpatrickwarren-oss/deploysignal-engine/*`; confirm `node tools/build-browser-bundle.js` emits `demos/engine-bundle.mjs`.
- [x] **H1** Commit `pnpm-workspace.yaml` with `onlyBuiltDependencies: [esbuild]` (and drop the `.gitignore` entry); verify fresh-clone `pnpm install && pnpm test` exits 0.
- [x] **H2** Re-run the suite → expect 543/543 (minus documented skips); change q84's bundle bootstrap to call `node` directly or implement the documented skip path.
- [x] **M1** Rewrite README Layout / Engine-sourcing / Methodology sections to reflect the post-R90 engine-as-npm-dependency reality and the local-only `coordination/` directory.
- [x] **M2** Document HTTP serving for Live mode (or add a `file://` detection banner in `demos/demo.html`); scope the "no server required" claim to canned mode.
- [x] **M3** Fix or remove the no-op `pnpm build` script (`tsconfig.json` `include: []`).
- [ ] **M4** Add a CI workflow (install + typecheck + test + build:browser); wire up or document the `arch-invariants.json` gate runner.
- [ ] **L1** Add `require.main` guards + flag validation to `scripts/tier-router.ts`, `scripts/measure-cache-effect.ts`, `scripts/mu-model-select.ts`.
- [ ] **L2** Make `run-pipeline.sh` lock acquisition atomic (`noclobber`/`mkdir`).
- [ ] **L3** Remove dead constants in `test/q82-engine-browser-bundle.test.ts`; fix `templates/PRD-TEMPLATE.md` and `scripts/run-pipeline.sh` stale references.
- [x] **L4** Deduplicate the two `## Quick demo` README sections; refresh test counts and version claims.
- [ ] **L5** Scramble per-trial seeds in `tools/detector-envelope.ts` / `tools/topology-walk-tuning.ts` on next regeneration.
- [ ] **L6** (Optional) Commit a small clustersynth fixture or improve skip diagnostics.
