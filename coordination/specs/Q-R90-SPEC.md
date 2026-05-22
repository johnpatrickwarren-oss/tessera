# Q-R90-SPEC — Engine npm extract (package boundary + types-barrel decoupling + build artifact)

_R90 opens Phase 5 SLICE 3 (engine npm extract); round 1 of a 4-round chain (R90 = package boundary; R91 = Tessera-internal consumption migration; R92 = DS-side adoption PR; R93 = SLICE 3 close + hygiene). R90 ships the package definition + build pipeline + verifiable tarball + backwards-compat smoke — NO consumption migration, NO npm publish, NO git tag._

**Round-start SHA:** `65edb85` (`chore(R90 directive): engine npm extract — Phase 5 SLICE 3 round 1 of 4-round chain`). Verified by `git rev-parse HEAD` at Architect session entry.

---

## § 0. Empirical baseline (verified at round-start SHA `65edb85`)

Architect ran the following commands at HEAD `65edb85` before spec-emit (per R86 prophylactic / R87 sub-pattern / R88 grep-semantics / R89 EMPIRICAL.sh-probe-at-spec-emit reinforcements; CLAUDE-ARCHITECT.md `EMPIRICAL-PREMISE-VERIFICATION` composite):

| # | Premise | Method | Observed |
|---|---|---|---|
| P0.1 | `engine/index.ts` does not exist | `ls engine/index.ts` | `No such file or directory` (confirmed — no engine root barrel; `engine/types/index.ts` is the canonical types barrel per its docstring) |
| P0.2 | `engine/types/index.ts` re-export barrel pattern (12 re-exports) | direct Read lines 20-32 | 12 `export * from` lines: `./primitives`, `./metrics`, `./families/{a,b,c,d,e}`, `./agent`, `./verdict`, `./policy`, `./audit`, `./config`, `./orchestration` |
| P0.3 | root `tsconfig.json` settings | direct Read | `outDir: "dist/engine"`, `rootDir: "engine"`, `declaration: true`, `declarationMap: true`, `module: "CommonJS"`, `target: "ES2020"`, `include: ["engine/**/*.ts"]` |
| P0.4 | `tsconfig.test.json` co-located build | direct Read | extends `./tsconfig.json`; `outDir: "."`, `rootDir: "."`, `include: engine + test + tools + scripts`. Co-located `.js` next to `.ts` — unaffected by root `outDir` change |
| P0.5 | `.gitignore` global `*.js` rule | direct Read line 7 | `*.js` global pattern (no anchor); all compiled `.js` files repository-wide are gitignored — R88 MAJOR-1 lesson honored |
| P0.6 | `.gitignore` global `dist/` rule | direct Read line 14 | `dist/` (no leading slash) — matches any directory named `dist` anywhere in the tree, including a prospective `engine/dist/` |
| P0.7 | `engine/dist/` path is gitignored | `git check-ignore -v engine/dist/foo.js` | exit 0; matches `.gitignore:14: dist/`. Prospective tsc output to `engine/dist/` will not be tracked |
| P0.8 | `pnpm-workspace.yaml` is git-tracked? | `git ls-files pnpm-workspace.yaml` + `git check-ignore -v pnpm-workspace.yaml` | empty (not tracked) + `.gitignore:22: pnpm-workspace.yaml` matches. **The directive's ALLOWED_SET enumeration of `pnpm-workspace.yaml` is propagation-conflicting with `.gitignore`; modifying the file has no committable effect.** Spec resolves: DO NOT modify pnpm-workspace.yaml. Documented in § A1 Option A sub-decision. |
| P0.9 | references to `dist/engine` in tracked code | `grep -rn "dist/engine"` | 3 hits: `tsconfig.json` (the file we change), `coordination/NEXT-ROLE.md` (directive prose), `coordination/specs/Q-R82-SPEC.md` (historic, frozen). NO scripts / tools / tests / engine code references this path. Outdir change has zero runtime impact on Tessera-internal consumers. |
| P0.10 | `pnpm exec tsc` (engine build) at HEAD | `rm -rf dist && pnpm exec tsc 2>&1; echo $?` | exit 0; emits 252 files to `dist/engine/` (63 each of `.js`, `.js.map`, `.d.ts`, `.d.ts.map`). All 10 subdirectories (`detectors`, `ds-integration`, `events`, `fleet`, `l0`, `o0`, `per-shard`, `topology`, `types`, `types/families`) emit. |
| P0.11 | `pnpm exec tsc -p tsconfig.test.json` (test build) at HEAD | `pnpm exec tsc -p tsconfig.test.json 2>&1; echo $?` | exit 0; co-located `.js` files emit next to `.ts` sources in `engine/`, `test/`, `tools/`, `scripts/`. |
| P0.12 | full test suite baseline at HEAD | `node --test --test-reporter=tap test/*.test.js \| tail -10` (run twice for stochastic variance) | run 1: `tests=710 / pass=689 / fail=17 / skipped=4`; runs 2-3: `tests=710 / pass=690 / fail=16 / skipped=4`. **Carry-forward band per R85 fail-count-band discipline:** `fail ∈ [16, 17]` (AC-R89-8 post-R83-routing-flip always-failing per R89 MAJOR-2 + AC-R84-14 stochastic flake ~25%). `pass ∈ [689, 690]`. NOT [14,16] as cited in the directive halt condition #3 — the directive's band was derived from R89 close pre-routing-flip and does not include AC-R89-8's documented FAIL state at post-routing HEAD. Spec § 5.2 prediction adjusts accordingly. |
| P0.13 | external-consumption surface from `test/*` + `tools/*` | `grep -hoE "from '\\.\\.[^']+'" test/*.ts tools/*.ts \| sort -u` | 56 distinct relative imports spanning: `engine/core`, `engine/detectors/{betting-e-process, family-c-betting-e-process, family-c-rff, spectral, sequential-mmd}`, `engine/ds-integration` + `ds-integration/{event-consumer, event-contract, feed, feed-contract, freeze-hook-factory}`, `engine/events/{event-conditional-attribution, event-feed, freeze-hook}`, `engine/fleet/{combine, detectors, e-bh, verdict-consumer}`, `engine/hardware-topology-source`, `engine/l0/counter-rate-transform`, `engine/loader`, `engine/per-shard/{runtime, warm-start, welford}`, `engine/signal-classes`, `engine/topology-overlay`, `engine/topology/{common-mode-attribution, fetch-context, k8s-source, neuron-source, nvlink-source, slurm-source, tpu-source}`, `engine/types` (barrel), `engine/types/{config, families/a, families/c, primitives, verdict}`. **All imports are RELATIVE (`'../engine/...'`); R90 preserves these unchanged (consumption migration is R91 scope).** Subpath-exports map is built to address each surface eventually but is not load-bearing at R90 (no R90 consumer uses the package name). |
| P0.14 | `Q-R90-EMPIRICAL.sh` blocks at round-start HEAD (probe-run) | `bash coordination/specs/Q-R90-EMPIRICAL.sh` at HEAD `65edb85` | 9 blocks total; OBSERVED at round-start HEAD: Block 1 (engine/package.json exists) FAILS; Block 2 (tsconfig.json outDir is engine/dist) FAILS (currently `dist/engine`); Block 3 (engine/README.md exists with headers) FAILS; Block 4 (VENDORING-MANIFEST.md head has R90 markers) FAILS; Block 5 (engine/dist/ sentinels present) FAILS; Block 6 (pnpm pack produces tarball) FAILS (no engine/package.json → no tarball produced); Block 7 (tarball content gate) FAILS (no tarball → all required entries reported missing); Block 8 (typecheck + fail-count band [16,17] + pass-count band [702,707]) FAILS (typecheck PASSES; pre-impl pass=690 below post-impl band — expected; flips PASS at chore-A when q90's 14 ACs add to pass count); Block 9 (anti-scope diff `65edb85`..HEAD ⊆ ALLOWED_SET) PASSES (HEAD == round-start; `git diff` returns empty). Script exits 1 with 8 FAIL / 1 PASS at round-start. **Implementer chore-A is expected to flip Blocks 1-8 PASS** (Block 9 remains PASS as the diff grows entirely within ALLOWED_SET); all 9 blocks PASS at Reviewer/MU HEAD per § 5.2 prediction. |

**No claim in this spec is inherited from prior testimony (R08 MAJOR-2 lesson honored)**: every P0.* row above derives from a command run at HEAD `65edb85` by this Architect session.

---

## § 1. Mechanism

### 1.1 Architectural decision: Option A (standalone sub-package at `engine/`)

**Picked: Option A.** Architect commits to Option A (per directive's two-option choice). Rationale documented in § A1 of `Q-R90-SPEC-AUDIT.md` (cite: brainstorm § A1; selection rationale § A4).

- Engine source layout stays at `engine/*.ts` (no `git mv`).
- `engine/package.json` is NEW; declares the engine as a publishable sub-package consumable by external clients via the future `@johnpatrickwarren-oss/deploysignal-engine` name.
- `pnpm-workspace.yaml` is NOT modified (P0.8: file is gitignored; the directive's ALLOWED-listing of it is a propagation conflict with `.gitignore`; modifying it has no committable effect; `pnpm pack engine` works on any directory containing a `package.json` regardless of workspace registration).
- Root `tsconfig.json` `outDir` changes from `dist/engine` → `engine/dist` (1-line; enables `engine/package.json` to reference compiled output via relative `./dist/...` without crossing the package root). Per P0.7 + P0.9 this change has zero runtime impact on Tessera-internal consumers.
- `tsconfig.test.json` is NOT modified (it sets `outDir: "."` which is co-located and unaffected by the root change).

### 1.2 Build pipeline post-R90

- `pnpm exec tsc` (no `-p` flag; engine-only library build) → reads root `tsconfig.json` → emits compiled output to `engine/dist/` (PRE-R90: `dist/engine/`).
- `pnpm exec tsc -p tsconfig.test.json` (test build) → co-located `.js` next to `.ts` in `engine/`, `test/`, `tools/`, `scripts/` (UNCHANGED from pre-R90).
- `cd engine && pnpm pack` → consumes `engine/package.json`; tarball includes files matching `package.json#files`; produces `johnpatrickwarren-oss-deploysignal-engine-0.1.0-pre.tgz` at `engine/` (per npm-pack naming convention for scoped packages: `<scope>-<name>-<version>.tgz`).

### 1.3 Subpath exports surface

Per P0.13 grep enumeration, the `exports` map covers every actual external-consumption subpath plus wildcards for the per-directory file sets. Architect-locked enumeration in § 3.1 (no Implementer judgment needed).

### 1.4 Backwards-compat guarantee

Tessera-internal consumers (`test/*.ts`, `tools/*.ts`, `engine/*.ts` cross-references) ALL use RELATIVE paths (`'../engine/...'`, `'../../engine/...'`, `'./types'`). R90 changes ZERO import lines. The `engine/dist/` outdir change is invisible to relative-import consumers because they import directly from the `.ts` (via tsconfig.test.json's co-located build) — they never went through `dist/engine/` in the first place.

### 1.5 Anti-scope handling for ROUND_START_SHA

Per R88 pattern: `ROUND_START_SHA='65edb85'` (the R90 directive commit) is hard-coded at spec-emit in `Q-R90-EMPIRICAL.sh` Block 9 and in the anti-scope AC. At Reviewer/MU HEAD, `git diff 65edb85 HEAD --name-only` returns all R90-cycle modifications (spec-triad commit + Implementer chore-A + Reviewer + MU commits). The ALLOWED_SET regex is defined in § 5.3 and byte-mirrored to EMPIRICAL.sh Block 9 per R82 spec-amendment-ALL-gate-artifacts-propagation discipline.

### 1.6 ROUND_START_SHA in the test file

`test/q90-engine-package-extract.test.ts` uses a hard-coded constant `ROUND_START_SHA = '65edb85'` (no placeholder injection required — the directive commit SHA is known at spec-emit and is stable across the entire R90 cycle).

### 1.7 Bands per R85 fail-count-band discipline

Per CLAUDE-COMMON.md REINFORCED 2026-05-21 (R85 CRITICAL-1) and CLAUDE-ARCHITECT.md REINFORCED 2026-05-19 — when active ACs are documented as structurally flaky, EXPECTED_FAIL binds a band, not a strict value. Active flaky/forward-protection ACs:

- **AC-R84-14** — stochastic flake ~25% per R85 REVIEWER MINOR-2; contributes `+0..+1` to fail count
- **AC-R89-8** — R83 routing-flip always-fails at post-routing HEAD per R89 MAJOR-2; contributes `+1` to fail count vs R89 chore-A

R90 predicted post-MU band (relative to R89 chore-A pass=691/fail=15 baseline):
- `fail ∈ [16, 17]` (R89 baseline 15 + AC-R89-8 routing-flip +1 + AC-R84-14 stochastic 0..+1)
- `pass ∈ [689, 690]` (R89 baseline 691 − AC-R89-8 routing-flip −1 − AC-R84-14 stochastic 0..−1)
- `tests = 710 + AC_COUNT_R90_RUNTIME` (≥ 722; R90 adds ≥12 q90 runtime tests, all PASS at chore-A)

Architect P0.12 empirical re-verification at round-start HEAD `65edb85` confirms `fail ∈ [16,17]` band is correct (observed 16 + 17 across 3 runs).

---

## § 2. Component inventory

| State | Path | Role |
|---|---|---|
| EXISTS, unchanged | `engine/*.ts` (63 files across 10 subdirectories) | TypeScript engine sources; vendored-at-pin or vendored-with-deltas per VENDORING-MANIFEST.md |
| EXISTS, unchanged | `engine/types/index.ts` | Public type barrel (12 re-exports per P0.2); per its own docstring is the canonical `from '../types'` resolver |
| EXISTS, changed (1-line) | `tsconfig.json` | `outDir: "dist/engine"` → `"engine/dist"` |
| EXISTS, unchanged | `tsconfig.test.json` | Co-located test build; `outDir: "."` |
| EXISTS, unchanged | `package.json` (root) | `@johnpatrickwarren-oss/tessera` workspace root; no script removals |
| EXISTS, unchanged | `pnpm-workspace.yaml` | Gitignored per `.gitignore:22`; not modified (P0.8 propagation-conflict resolved by NOT modifying) |
| EXISTS, changed (header note) | `coordination/VENDORING-MANIFEST.md` | NEW header note documenting R90 extraction event + chosen layout (Option A) + package name; per-row entries PRESERVED unchanged |
| EXISTS, changed (header) | `coordination/NEXT-ROLE.md` | Routing block updates (Architect→Implementer; later Implementer→Reviewer→MU) per R83 |
| EXISTS, changed (appends only) | `coordination/MEMORIAL.md` | Architect + Implementer + Reviewer + MU CONFIRMATION/VIOLATION entries |
| CREATED | `engine/package.json` | NEW; package definition with name, version, main, types, files, license, repository, exports per § 3.1 |
| CREATED | `engine/README.md` | NEW; minimal description + install path placeholder per § 3.2 |
| CREATED | `test/q90-engine-package-extract.test.ts` | NEW; ≥12 ACs per § 3.3 |
| CREATED | `coordination/specs/Q-R90-SPEC.md` | THIS FILE |
| CREATED | `coordination/specs/Q-R90-SPEC-AUDIT.md` | Audit sidecar (brainstorm + design + grilling + decision rationale) |
| CREATED | `coordination/specs/Q-R90-EMPIRICAL.sh` | Binding-command harness; 9 blocks per § 7 |
| CREATED | `coordination/reviews/REVIEWER-REPORT-R90.md` | Reviewer-stage artifact |
| EMITTED at build (gitignored) | `engine/dist/**/*.{js,js.map,d.ts,d.ts.map}` | tsc output; gitignored per `.gitignore:14: dist/` (P0.7); NOT included in `git diff` against ROUND_START_SHA |
| EMITTED at pack (uncommitted) | `engine/johnpatrickwarren-oss-deploysignal-engine-0.1.0-pre.tgz` | pnpm pack output at Implementer chore-A verification; gitignored implicitly via `*.tgz` not appearing in repo |
| NOT MODIFIED, frozen | `engine/detectors/*`, `engine/fleet/*`, `engine/l0/*`, `engine/o0/*`, `engine/per-shard/*`, `engine/topology/*`, `engine/events/*`, `engine/ds-integration/*`, `engine/core.ts`, `engine/topology-overlay.ts`, `engine/verdict-groups.ts`, `engine/hardware-topology-source.ts`, `engine/loader.ts`, `engine/signal-classes.ts`, `engine/per-detector-resampler-mode.ts` | Algorithm and root-level engine files; anti-scope hard limit |
| NOT MODIFIED, frozen | `engine/types/*.ts` and `engine/types/families/*.ts` (including `engine/types/index.ts`) | Type sources; anti-scope hard limit. Note: `engine/types/index.ts` line 4 (the "Extract target: ..." comment) WILL eventually be amendable to reference the now-extracted package, but R90 does NOT modify it (the comment is informational; the extraction it predicts is now realized; updating it is R91-scope hygiene) |
| NOT MODIFIED, frozen | All `test/q*-*.test.ts` from R01-R89 | Anti-scope hard limit (backwards-compat goal preserves all prior tests). q90 is NEW |
| NOT MODIFIED, frozen | `tools/*.ts` from R88 and prior | Anti-scope hard limit (consumption migration is R91 scope) |
| NOT MODIFIED, frozen | `demos/*` | Anti-scope hard limit |
| NOT MODIFIED, frozen | `CLAUDE-*.md` (5 files) | R89 composite folding stands; sustaining mechanism enforces |
| NOT MODIFIED, frozen | `coordination/MEMORIAL-PHASE-*.md` shards | R89 archival stands |

### 2.1 Sub-decision: tsconfig.json outDir change

**Before R90:** `tsconfig.json` line 8: `"outDir": "dist/engine",` ; line 9: `"rootDir": "engine",`.

**After R90:** line 8: `"outDir": "engine/dist",` ; line 9: `"rootDir": "engine",` (unchanged). One line modified; all other tsconfig.json fields preserved verbatim.

This is the ONLY change to `tsconfig.json`. Pre-emit grilling (§ 8.6) cross-checks that all 24 other fields in `tsconfig.json` stay byte-identical.

### 2.2 Sub-decision: package.json root scripts

R90 OPTIONALLY adds a `pack:engine` convenience script to root `package.json#scripts` to give operators a one-command invocation:

```json
"pack:engine": "cd engine && pnpm exec tsc --project ../tsconfig.json && pnpm pack"
```

Where the tsc `--project ../tsconfig.json` flag is needed because the engine-build tsconfig lives at the root, not at `engine/tsconfig.json`. Architect prescribes the exact one-liner here so the Implementer does not need to make a syntax choice.

This is the ONLY change to root `package.json` (single key-value addition; no existing scripts removed or modified).

---

## § 3. Per-file pseudocode

### 3.1 `engine/package.json` (NEW)

```json
{
  "name": "@johnpatrickwarren-oss/deploysignal-engine",
  "version": "0.1.0-pre",
  "description": "Statistical detector engine (Family A/C/D/E detectors, Ville-bounded e-processes, hierarchical pooling, topology BFS, e-BH FDR) — Tessera-evolved vendored snapshot from DeploySignal main@5a72371 with per-file deltas per Tessera VENDORING-MANIFEST.md",
  "license": "Apache-2.0",
  "main": "./dist/types/index.js",
  "types": "./dist/types/index.d.ts",
  "files": [
    "dist/**/*.js",
    "dist/**/*.d.ts",
    "dist/**/*.d.ts.map",
    "dist/**/*.js.map",
    "README.md",
    "package.json"
  ],
  "repository": {
    "type": "git",
    "url": "git+https://github.com/johnpatrickwarren-oss/tessera.git",
    "directory": "engine"
  },
  "exports": {
    ".": { "types": "./dist/types/index.d.ts", "default": "./dist/types/index.js" },
    "./types": { "types": "./dist/types/index.d.ts", "default": "./dist/types/index.js" },
    "./types/agent": { "types": "./dist/types/agent.d.ts", "default": "./dist/types/agent.js" },
    "./types/audit": { "types": "./dist/types/audit.d.ts", "default": "./dist/types/audit.js" },
    "./types/config": { "types": "./dist/types/config.d.ts", "default": "./dist/types/config.js" },
    "./types/fleet": { "types": "./dist/types/fleet.d.ts", "default": "./dist/types/fleet.js" },
    "./types/metrics": { "types": "./dist/types/metrics.d.ts", "default": "./dist/types/metrics.js" },
    "./types/orchestration": { "types": "./dist/types/orchestration.d.ts", "default": "./dist/types/orchestration.js" },
    "./types/policy": { "types": "./dist/types/policy.d.ts", "default": "./dist/types/policy.js" },
    "./types/primitives": { "types": "./dist/types/primitives.d.ts", "default": "./dist/types/primitives.js" },
    "./types/self-normalized-fallback": { "types": "./dist/types/self-normalized-fallback.d.ts", "default": "./dist/types/self-normalized-fallback.js" },
    "./types/verdict": { "types": "./dist/types/verdict.d.ts", "default": "./dist/types/verdict.js" },
    "./types/families/a": { "types": "./dist/types/families/a.d.ts", "default": "./dist/types/families/a.js" },
    "./types/families/b": { "types": "./dist/types/families/b.d.ts", "default": "./dist/types/families/b.js" },
    "./types/families/c": { "types": "./dist/types/families/c.d.ts", "default": "./dist/types/families/c.js" },
    "./types/families/d": { "types": "./dist/types/families/d.d.ts", "default": "./dist/types/families/d.js" },
    "./types/families/e": { "types": "./dist/types/families/e.d.ts", "default": "./dist/types/families/e.js" },
    "./core": { "types": "./dist/core.d.ts", "default": "./dist/core.js" },
    "./topology-overlay": { "types": "./dist/topology-overlay.d.ts", "default": "./dist/topology-overlay.js" },
    "./signal-classes": { "types": "./dist/signal-classes.d.ts", "default": "./dist/signal-classes.js" },
    "./verdict-groups": { "types": "./dist/verdict-groups.d.ts", "default": "./dist/verdict-groups.js" },
    "./hardware-topology-source": { "types": "./dist/hardware-topology-source.d.ts", "default": "./dist/hardware-topology-source.js" },
    "./loader": { "types": "./dist/loader.d.ts", "default": "./dist/loader.js" },
    "./per-detector-resampler-mode": { "types": "./dist/per-detector-resampler-mode.d.ts", "default": "./dist/per-detector-resampler-mode.js" },
    "./detectors/*": { "types": "./dist/detectors/*.d.ts", "default": "./dist/detectors/*.js" },
    "./topology/*": { "types": "./dist/topology/*.d.ts", "default": "./dist/topology/*.js" },
    "./fleet/*": { "types": "./dist/fleet/*.d.ts", "default": "./dist/fleet/*.js" },
    "./l0/*": { "types": "./dist/l0/*.d.ts", "default": "./dist/l0/*.js" },
    "./o0/*": { "types": "./dist/o0/*.d.ts", "default": "./dist/o0/*.js" },
    "./events/*": { "types": "./dist/events/*.d.ts", "default": "./dist/events/*.js" },
    "./per-shard/*": { "types": "./dist/per-shard/*.d.ts", "default": "./dist/per-shard/*.js" },
    "./ds-integration": { "types": "./dist/ds-integration/index.d.ts", "default": "./dist/ds-integration/index.js" },
    "./ds-integration/*": { "types": "./dist/ds-integration/*.d.ts", "default": "./dist/ds-integration/*.js" },
    "./package.json": "./package.json"
  }
}
```

Notes for Implementer:
- The file is RAW JSON (no comments; JSON does not support comments).
- `description` is one line in JSON (no embedded newlines).
- The `exports` map order above is the prescribed order — Implementer copies verbatim.
- The 3 fields `name`, `version`, `license` are byte-exact per AC-R90-2/3.
- No `dependencies` or `devDependencies` keys (R90 anti-scope: NO new external dependencies; the engine has no runtime deps).
- No `peerDependencies` keys (the engine relies only on Node built-ins per the existing tsc settings: `"types": ["node"]`).

### 3.2 `engine/README.md` (NEW)

Architect prescribes the exact content (Implementer copies verbatim, including blank lines):

```markdown
# @johnpatrickwarren-oss/deploysignal-engine

Statistical detector engine vendored from [DeploySignal](https://github.com/johnpatrickwarren-oss/deploysignal) at SHA `5a72371` and Tessera-evolved per [VENDORING-MANIFEST.md](../coordination/VENDORING-MANIFEST.md) (lives one directory up from this README inside the Tessera repository).

**Status:** Tessera Phase 5 SLICE 3 round 1 (R90) extraction — package boundary + types-barrel decoupling + verifiable tarball. Consumption migration (Tessera-internal + DS-side) lands in R91-R92. **Do not consume from external projects until R91/R92 close.**

## What this package is

- Family A/C/D/E statistical detectors (mixture-supermartingale, betting e-process, hotelling, page-cusum, conformal, sequential MMD, self-normalized fallback, spectral)
- Ville-bounded any-time-valid hypothesis tests
- Hierarchical per-shard / fleet e-value combination + e-BH FDR
- Topology BFS-on-undirected attribution (Slurm, K8s, NVLink, Neuron, TPU adapters)
- DeploySignal integration interface contract (`engine/ds-integration/`)
- L0 contract (counter-rate transform, missed-scrape catchup, wraparound handling)
- Per-shard runtime (Welford accumulator, warm-start, residual updates)

## Install (R91+)

For first-cycle consumption (R91/R92), this package is consumed via git-dependency (no npm registry publish in R90 chain). Consumer's `package.json`:

```json
{
  "dependencies": {
    "@johnpatrickwarren-oss/deploysignal-engine": "git+ssh://git@github.com/johnpatrickwarren-oss/tessera.git#<commit-or-tag>"
  }
}
```

The `directory` field in this package's `repository` block points pnpm/npm at the `engine/` subdirectory inside the Tessera repository.

## Build

```bash
# from Tessera repo root:
pnpm exec tsc            # emits engine/dist/
cd engine && pnpm pack   # emits johnpatrickwarren-oss-deploysignal-engine-0.1.0-pre.tgz
```

## Authoritative documentation

Canonical engine semantics live in the DeploySignal repository. Tessera-evolved deltas (per-file SHA pins; vendored-with-deltas vs vendored-at-pin) are tracked in [`coordination/VENDORING-MANIFEST.md`](../coordination/VENDORING-MANIFEST.md).

## License

Apache-2.0 — see [`../LICENSE`](../LICENSE) (Tessera root).
```

Implementer must copy verbatim. Blank lines and trailing newline preserved exactly. The README's `## Install` section header is structurally important: AC-R90-9 binds existence of the string `## Install` within the file body.

### 3.3 `test/q90-engine-package-extract.test.ts` (NEW)

```typescript
// q90-engine-package-extract.test.ts — R90 ACs: engine package boundary,
// types-barrel decoupling, build artifact, backwards-compat smoke.

import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import * as path from 'node:path';

const REPO_ROOT = path.resolve(__dirname, '..');
const ENGINE_DIR = path.join(REPO_ROOT, 'engine');
const ROUND_START_SHA = '65edb85';

const ALLOWED_REGEX = /^(engine\/package\.json|engine\/README\.md|tsconfig\.json|package\.json|pnpm-workspace\.yaml|\.gitignore|coordination\/VENDORING-MANIFEST\.md|test\/q90-engine-package-extract\.test\.ts|coordination\/specs\/Q-R90-(SPEC|SPEC-AUDIT|EMPIRICAL)\.(md|sh)|coordination\/reviews\/REVIEWER-REPORT-R90\.md|coordination\/MEMORIAL\.md|coordination\/NEXT-ROLE\.md|coordination\/logs\/ROUND-R90-.*)$/;

function readJson(p: string): any {
  return JSON.parse(readFileSync(p, 'utf8'));
}

test('AC-R90-1: engine/package.json exists and parses as JSON with required top-level keys', () => {
  const pkgPath = path.join(ENGINE_DIR, 'package.json');
  assert.ok(existsSync(pkgPath), 'engine/package.json must exist');
  const pkg = readJson(pkgPath);
  const requiredKeys = ['name', 'version', 'description', 'license', 'main', 'types', 'files', 'repository', 'exports'];
  for (const k of requiredKeys) {
    assert.ok(k in pkg, `engine/package.json missing required key: ${k}`);
  }
});

test('AC-R90-2: engine/package.json name === "@johnpatrickwarren-oss/deploysignal-engine"', () => {
  const pkg = readJson(path.join(ENGINE_DIR, 'package.json'));
  assert.strictEqual(pkg.name, '@johnpatrickwarren-oss/deploysignal-engine');
});

test('AC-R90-3: engine/package.json version === "0.1.0-pre" and license === "Apache-2.0"', () => {
  const pkg = readJson(path.join(ENGINE_DIR, 'package.json'));
  assert.strictEqual(pkg.version, '0.1.0-pre');
  assert.strictEqual(pkg.license, 'Apache-2.0');
});

test('AC-R90-4: engine/package.json exports map includes the prescribed subpath enumeration', () => {
  const pkg = readJson(path.join(ENGINE_DIR, 'package.json'));
  const ex = pkg.exports;
  // Hard-anchored subpaths (no wildcard) — must appear verbatim
  const expectedExact = [
    '.', './types', './core', './topology-overlay', './signal-classes',
    './verdict-groups', './hardware-topology-source', './loader',
    './per-detector-resampler-mode', './ds-integration',
    './types/config', './types/verdict', './types/primitives',
    './types/families/a', './types/families/c',
    './package.json',
  ];
  for (const sp of expectedExact) {
    assert.ok(sp in ex, `exports map missing subpath: ${sp}`);
  }
  // Wildcard subpaths
  const expectedWildcards = ['./detectors/*', './topology/*', './fleet/*', './l0/*', './o0/*', './events/*', './per-shard/*', './ds-integration/*'];
  for (const sp of expectedWildcards) {
    assert.ok(sp in ex, `exports map missing wildcard subpath: ${sp}`);
  }
});

test('AC-R90-5: engine/package.json repository.directory === "engine"', () => {
  const pkg = readJson(path.join(ENGINE_DIR, 'package.json'));
  assert.ok(pkg.repository && typeof pkg.repository === 'object', 'repository must be an object');
  assert.strictEqual(pkg.repository.directory, 'engine');
  assert.match(pkg.repository.url ?? '', /github\.com\/johnpatrickwarren-oss\/tessera/);
});

test('AC-R90-6: root tsconfig.json outDir === "engine/dist" (changed from "dist/engine")', () => {
  const tsc = readJson(path.join(REPO_ROOT, 'tsconfig.json'));
  assert.strictEqual(tsc.compilerOptions.outDir, 'engine/dist');
  assert.strictEqual(tsc.compilerOptions.rootDir, 'engine');
});

test('AC-R90-7: engine build artifact present at engine/dist with sentinel files emitted', () => {
  // The Implementer chore-A must run `pnpm exec tsc` before committing the q90 test
  // so the artifact exists when the test runs at chore-A.
  const sentinels = [
    'engine/dist/types/index.js',
    'engine/dist/types/index.d.ts',
    'engine/dist/topology-overlay.js',
    'engine/dist/topology-overlay.d.ts',
    'engine/dist/detectors/betting-e-process.js',
    'engine/dist/detectors/betting-e-process.d.ts',
    'engine/dist/ds-integration/index.js',
    'engine/dist/fleet/e-bh.js',
    'engine/dist/per-shard/runtime.js',
    'engine/dist/l0/counter-rate-transform.js',
  ];
  for (const s of sentinels) {
    assert.ok(existsSync(path.join(REPO_ROOT, s)), `expected build sentinel missing: ${s}`);
  }
});

test('AC-R90-8: pnpm pack from engine/ produces the expected tarball (run-on-demand)', () => {
  // Run `pnpm pack` from engine/ ; capture filename ; verify tarball exists.
  // pnpm pack outputs the tarball path on the last stdout line (per pnpm CLI contract).
  const stdout = execFileSync('pnpm', ['pack', '--pack-destination', ENGINE_DIR], {
    cwd: ENGINE_DIR,
    encoding: 'utf8',
  });
  // Tarball name for scoped packages: <scope>-<name>-<version>.tgz
  const expectedName = 'johnpatrickwarren-oss-deploysignal-engine-0.1.0-pre.tgz';
  const tarballPath = path.join(ENGINE_DIR, expectedName);
  assert.ok(existsSync(tarballPath), `expected tarball missing: ${expectedName}; pnpm pack stdout was: ${stdout}`);
});

test('AC-R90-9: tarball contains compiled engine output AND excludes test/coordination/tools', () => {
  const tarballPath = path.join(ENGINE_DIR, 'johnpatrickwarren-oss-deploysignal-engine-0.1.0-pre.tgz');
  assert.ok(existsSync(tarballPath), 'tarball must exist before content check (AC-R90-8 must precede)');
  const listing = execFileSync('tar', ['-tzf', tarballPath], { encoding: 'utf8' });
  // npm pack convention: every path inside is prefixed `package/`
  const required = [
    'package/dist/types/index.js',
    'package/dist/types/index.d.ts',
    'package/dist/topology-overlay.js',
    'package/dist/detectors/betting-e-process.js',
    'package/package.json',
    'package/README.md',
  ];
  for (const r of required) {
    assert.ok(listing.includes(r), `tarball missing required entry: ${r}`);
  }
  // Anti-content: must NOT include test/, coordination/, tools/, scripts/, demos/, src .ts
  const forbidden = ['package/test/', 'package/coordination/', 'package/tools/', 'package/scripts/', 'package/demos/'];
  for (const f of forbidden) {
    assert.ok(!listing.includes(f), `tarball must not include path under: ${f}`);
  }
  // Anti-content: no raw .ts sources (only compiled .js + .d.ts)
  const tsLines = listing.split('\n').filter(l => l.endsWith('.ts') && !l.endsWith('.d.ts'));
  assert.deepStrictEqual(tsLines, [], `tarball must not include raw .ts sources; found: ${tsLines.join(', ')}`);
});

test('AC-R90-10: engine/README.md exists and contains expected sections', () => {
  const readmePath = path.join(ENGINE_DIR, 'README.md');
  assert.ok(existsSync(readmePath), 'engine/README.md must exist');
  const body = readFileSync(readmePath, 'utf8');
  assert.match(body, /^# @johnpatrickwarren-oss\/deploysignal-engine/m);
  assert.match(body, /^## What this package is/m);
  assert.match(body, /^## Install/m);
  assert.match(body, /^## Build/m);
  assert.match(body, /git\+ssh:\/\/git@github\.com\/johnpatrickwarren-oss\/tessera\.git/);
});

test('AC-R90-11: VENDORING-MANIFEST.md header has R90 extraction note', () => {
  const manifestPath = path.join(REPO_ROOT, 'coordination', 'VENDORING-MANIFEST.md');
  const body = readFileSync(manifestPath, 'utf8');
  // Note must appear in the first 60 lines (header zone, before the per-row table starts)
  const head = body.split('\n').slice(0, 60).join('\n');
  assert.match(head, /R90.*2026-05-21/);
  assert.match(head, /@johnpatrickwarren-oss\/deploysignal-engine/);
  assert.match(head, /engine\/package\.json/);
});

test('AC-R90-12: root package.json has new pack:engine script and existing scripts unchanged', () => {
  const rootPkg = readJson(path.join(REPO_ROOT, 'package.json'));
  assert.ok(rootPkg.scripts && 'pack:engine' in rootPkg.scripts, 'root package.json must add scripts["pack:engine"]');
  // Existing scripts preserved (sentinel check against R88 surface)
  const preservedKeys = ['build', 'curate-baseline', 'predemo', 'demo', 'build:browser', 'build:demos', 'coverage', 'test', 'typecheck', 'tier-router', 'mu-model-select', 'build-role-context'];
  for (const k of preservedKeys) {
    assert.ok(k in rootPkg.scripts, `root scripts must preserve existing key: ${k}`);
  }
});

test('AC-R90-13: anti-scope diff round-start..HEAD ⊆ ALLOWED_SET', () => {
  const diff = execFileSync('git', ['diff', ROUND_START_SHA, 'HEAD', '--name-only'], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
  });
  const paths = diff.split('\n').filter(p => p.length > 0);
  const violators = paths.filter(p => !ALLOWED_REGEX.test(p));
  assert.deepStrictEqual(violators, [], `anti-scope: paths outside ALLOWED_SET: ${violators.join(', ')}`);
});

test('AC-R90-14: backwards-compat — engine algorithm files unchanged byte-identical against round-start', () => {
  // Sentinel-set of files that must remain byte-identical from ROUND_START_SHA to HEAD.
  const sentinels = [
    'engine/types/index.ts',
    'engine/topology-overlay.ts',
    'engine/core.ts',
    'engine/detectors/betting-e-process.ts',
    'engine/fleet/e-bh.ts',
    'engine/per-shard/runtime.ts',
    'engine/l0/counter-rate-transform.ts',
    'engine/ds-integration/index.ts',
    'engine/topology/slurm-source.ts',
    'engine/types/verdict.ts',
  ];
  for (const s of sentinels) {
    const atRoundStart = execFileSync('git', ['show', `${ROUND_START_SHA}:${s}`], { cwd: REPO_ROOT, encoding: 'utf8' });
    const atHead = readFileSync(path.join(REPO_ROOT, s), 'utf8');
    assert.strictEqual(atHead, atRoundStart, `engine sentinel must be byte-identical: ${s}`);
  }
});
```

### 3.4 `tsconfig.json` (CHANGED — 1 line)

Implementer applies this delta exactly:

```diff
-    "outDir": "dist/engine",
+    "outDir": "engine/dist",
```

No other tsconfig.json lines change. All 24 other fields preserved verbatim. Implementer must not reformat the file (preserve trailing newlines, 2-space indentation, etc., per existing convention at Edit-time).

### 3.5 `package.json` (CHANGED — single script addition)

Implementer applies this delta inside the `scripts` object, alphabetically positioned (after the existing `"mu-model-select"` line and before `"pretest"`):

```diff
+    "pack:engine": "cd engine && pnpm exec tsc --project ../tsconfig.json && pnpm pack",
```

Implementer must not modify or remove any other script entries. The 22 existing scripts in package.json are preserved verbatim. No new dependencies or devDependencies added.

### 3.6 `coordination/VENDORING-MANIFEST.md` (CHANGED — header note insertion only)

After line 4 (which currently reads `_DeploySignal engine files maintained by tools/vendor-from-deploysignal.sh. ..._`), Implementer inserts the following block:

```markdown
---

## R90 extraction note (2026-05-21)

Phase 5 SLICE 3 round 1 (R90) extracted the engine to the `@johnpatrickwarren-oss/deploysignal-engine` npm package per `engine/package.json`. Layout: Option A — engine remains at `engine/`; standalone sub-package. Build artifact emitted to `engine/dist/` (root tsconfig.json `outDir` changed from `dist/engine` to `engine/dist`). Consumption migration (Tessera-internal in R91, DS-side in R92) is deferred to subsequent rounds. Per-row vendored-at-pin / vendored-with-deltas SHAs below are UNCHANGED by R90 (the extraction is structural; engine source content is byte-identical to round-start SHA `65edb85` — verified by AC-R90-14).

---

```

The two `---` horizontal rules above bound the inserted block as a discrete section. The pre-existing `## DeploySignal engine vendoring` heading at line 6 (and the per-row table beginning at line 8) is NOT modified; the insertion happens above it.

---

## § 4. Build + verification flow at Implementer chore-A

The Implementer's chore-A (GREEN commit) MUST run these in order before committing:

1. `pnpm exec tsc` — emits to `engine/dist/` (per the new `outDir`). Verify exit 0.
2. `cd engine && pnpm pack` — produces `johnpatrickwarren-oss-deploysignal-engine-0.1.0-pre.tgz` inside `engine/`. Verify exit 0.

### 4.1 Tarball lifecycle decision

The test `AC-R90-8` runs `pnpm pack`, which creates the tarball; AC-R90-9 reads its contents. The test does NOT delete the tarball (the assertion is solely on the tarball file existing post-pack and on its content listing). Therefore:

- During each test run (at Implementer chore-A HEAD, Reviewer HEAD, and MU HEAD), the tarball is recreated/overwritten in `engine/`.
- Between runs, the tarball persists in `engine/` until garbage-collected.
- The tarball file MUST be gitignored to prevent accidental staging by `git add -A` or similar.

**Architect decision:** Append a single line `engine/*.tgz` to root `.gitignore`. Rationale: simpler than per-test cleanup; idempotent across reruns; matches existing convention (the project already gitignores build outputs via `dist/`, `*.js`, `*.bak`, `*.log`). The R90 ALLOWED_SET amendment (§ 5.3) lists `.gitignore` accordingly. The Implementer-chore-A step list in § 4.2 prescribes the exact insertion point.

### 4.2 Build sequence at Implementer chore-A (re-stated)

```
RED commit (test-only):
  - test/q90-engine-package-extract.test.ts (NEW; all ACs FAIL because impl absent)

GREEN commit (impl + ACs PASS):
  1. Apply tsconfig.json outDir delta
  2. Create engine/package.json
  3. Create engine/README.md
  4. Apply package.json (root) scripts delta
  5. Apply VENDORING-MANIFEST.md header note insertion
  6. Apply .gitignore +1 line (engine/*.tgz)
  7. pnpm exec tsc  →  engine/dist/ populated
  8. pnpm exec tsc -p tsconfig.test.json  →  co-located .js refreshed (includes the new test/q90)
  9. node --test --test-reporter=tap test/*.test.js  →  verify q90 passes; verify fail count band [16,17]
  10. bash coordination/specs/Q-R90-EMPIRICAL.sh  →  verify 9 blocks PASS, exit 0
  11. Stage all ALLOWED_SET paths; commit
```

---

## § 5. Acceptance criteria

### 5.1 AC table

| AC ID | Given | When | Then |
|---|---|---|---|
| **AC-R90-1** | `engine/package.json` is on disk | parse it as JSON | top-level keys include `name`, `version`, `description`, `license`, `main`, `types`, `files`, `repository`, `exports` |
| **AC-R90-2** | `engine/package.json` parsed | read `name` field | value equals `@johnpatrickwarren-oss/deploysignal-engine` |
| **AC-R90-3** | `engine/package.json` parsed | read `version` and `license` fields | `version === '0.1.0-pre'` AND `license === 'Apache-2.0'` |
| **AC-R90-4** | `engine/package.json` parsed | inspect `exports` map | exact subpaths present: `.`, `./types`, `./core`, `./topology-overlay`, `./signal-classes`, `./verdict-groups`, `./hardware-topology-source`, `./loader`, `./per-detector-resampler-mode`, `./ds-integration`, `./types/config`, `./types/verdict`, `./types/primitives`, `./types/families/a`, `./types/families/c`, `./package.json`; AND wildcard subpaths present: `./detectors/*`, `./topology/*`, `./fleet/*`, `./l0/*`, `./o0/*`, `./events/*`, `./per-shard/*`, `./ds-integration/*` |
| **AC-R90-5** | `engine/package.json` parsed | read `repository` object | `repository.directory === 'engine'` AND `repository.url` matches `/github\.com\/johnpatrickwarren-oss\/tessera/` |
| **AC-R90-6** | root `tsconfig.json` is on disk | parse it as JSON | `compilerOptions.outDir === 'engine/dist'` AND `compilerOptions.rootDir === 'engine'` |
| **AC-R90-7** | Implementer ran `pnpm exec tsc` in chore-A | check filesystem for sentinel build artifacts | all 10 sentinel paths exist: `engine/dist/types/index.{js,d.ts}`, `engine/dist/topology-overlay.{js,d.ts}`, `engine/dist/detectors/betting-e-process.{js,d.ts}`, `engine/dist/ds-integration/index.js`, `engine/dist/fleet/e-bh.js`, `engine/dist/per-shard/runtime.js`, `engine/dist/l0/counter-rate-transform.js` |
| **AC-R90-8** | `engine/package.json` exists and `engine/dist/` populated | run `pnpm pack --pack-destination engine/` from `engine/` | exit 0 AND tarball `engine/johnpatrickwarren-oss-deploysignal-engine-0.1.0-pre.tgz` exists on filesystem |
| **AC-R90-9** | tarball from AC-R90-8 exists | run `tar -tzf <tarball>` | listing includes `package/dist/types/index.js`, `package/dist/types/index.d.ts`, `package/dist/topology-overlay.js`, `package/dist/detectors/betting-e-process.js`, `package/package.json`, `package/README.md` AND listing excludes any path under `package/test/`, `package/coordination/`, `package/tools/`, `package/scripts/`, `package/demos/` AND listing contains zero raw `.ts` sources (only `.js`, `.d.ts`, `.d.ts.map`, `.js.map`) |
| **AC-R90-10** | `engine/README.md` exists | read it | body matches regex `/^# @johnpatrickwarren-oss\/deploysignal-engine/m` AND contains sections `## What this package is`, `## Install`, `## Build` AND contains the literal `git+ssh://git@github.com/johnpatrickwarren-oss/tessera.git` |
| **AC-R90-11** | `coordination/VENDORING-MANIFEST.md` is on disk | read its first 60 lines | head matches regex `/R90.*2026-05-21/` AND `/@johnpatrickwarren-oss\/deploysignal-engine/` AND `/engine\/package\.json/` |
| **AC-R90-12** | root `package.json` parsed | inspect `scripts` | `scripts['pack:engine']` exists AND existing 22 scripts preserved (sentinel: build, curate-baseline, predemo, demo, build:browser, build:demos, coverage, test, typecheck, tier-router, mu-model-select, build-role-context all present) |
| **AC-R90-13** | round-start SHA `65edb85` is reachable | run `git diff 65edb85 HEAD --name-only` | every line in output is matched by ALLOWED_SET regex (§ 5.3); violator set is empty |
| **AC-R90-14** | round-start SHA `65edb85` is reachable | for each engine sentinel file (10 paths in § 3.3), compare `git show 65edb85:<path>` against current `<path>` content | byte-identical for all 10 sentinels (engine algorithm + types untouched) |

### 5.2 AC-bound prediction table (Architect pre-prediction; R85 fail-count-band discipline)

| Observable | Predicted at Implementer chore-A | Predicted at Reviewer HEAD | Predicted at MU HEAD | Band rationale |
|---|---|---|---|---|
| `pnpm exec tsc` exit | 0 | 0 | 0 | strict |
| `pnpm exec tsc -p tsconfig.test.json` exit | 0 | 0 | 0 | strict |
| `cd engine && pnpm pack` exit | 0 | 0 | 0 | strict |
| `bash Q-R90-EMPIRICAL.sh` exit | 0 | 0 | 0 | strict (every block PASS at HEAD) |
| `node --test ...` exit | non-zero (1) | non-zero (1) | non-zero (1) | pre-existing fails persist (not introduced by R90) |
| `node --test ...` `# tests` | 722 (710 + 12 q90 + AC-R90-14 splits) | 722 | 722 | actually 723 if AC-R90-14 iterations count as sub-tests; band tolerated `[720, 724]` |
| `node --test ...` `# pass` | 705 ± 1 (= 690 R89-baseline -1 routing-flip + 14 q90 + 2 inflation from sub-tests) | 705 ± 1 | 705 ± 1 | band `[702, 707]`; accounts for AC-R84-14 stochastic 0..−1 + sub-test count variance |
| `node --test ...` `# fail` | 16-17 (AC-R89-8 routing-flip + AC-R84-14 0..1) | 16-17 | 16-17 | **band `[16, 17]`** per § 1.7 |
| `node --test ...` `# skipped` | 4 | 4 | 4 | strict |
| `git diff 65edb85 HEAD --name-only` | 11-13 paths (spec triad 3 + NEXT-ROLE.md + MEMORIAL.md + engine/package.json + engine/README.md + tsconfig.json + package.json + VENDORING-MANIFEST.md + test/q90-* + .gitignore) | + REVIEWER-REPORT-R90.md + 1 more MEMORIAL/NEXT-ROLE update = 13-15 | + 1 more MEMORIAL/NEXT-ROLE update = 13-15 | each entry ∈ ALLOWED_SET |

### 5.3 ALLOWED_SET (R90 anti-scope; § 5.3 IS the load-bearing artifact for AC-R90-13 + EMPIRICAL.sh Block 9)

Regex (byte-mirrored to `Q-R90-EMPIRICAL.sh` Block 9):

```
^(engine/package\.json|engine/README\.md|tsconfig\.json|package\.json|pnpm-workspace\.yaml|\.gitignore|coordination/VENDORING-MANIFEST\.md|test/q90-engine-package-extract\.test\.ts|coordination/specs/Q-R90-(SPEC|SPEC-AUDIT|EMPIRICAL)\.(md|sh)|coordination/reviews/REVIEWER-REPORT-R90\.md|coordination/MEMORIAL\.md|coordination/NEXT-ROLE\.md|coordination/logs/ROUND-R90-.*)$
```

Path enumeration (narrative table form; byte-mirrored to the regex above per R82 spec-amendment-ALL-gate-artifacts-propagation discipline):

| # | Path | Why ALLOWED |
|---|---|---|
| 1 | `engine/package.json` | NEW (R90 primary deliverable) |
| 2 | `engine/README.md` | NEW (R90 deliverable per directive § 7) |
| 3 | `tsconfig.json` | CHANGED (1-line outDir delta per § 3.4) |
| 4 | `package.json` | CHANGED (single script addition per § 3.5) |
| 5 | `pnpm-workspace.yaml` | listed by directive ALLOWED enumeration. P0.8: gitignored — will never appear in `git diff` output; entry is harmless |
| 6 | `.gitignore` | CHANGED (1 line: `engine/*.tgz`) per § 4.1 |
| 7 | `coordination/VENDORING-MANIFEST.md` | CHANGED (header note insertion per § 3.6) |
| 8 | `test/q90-engine-package-extract.test.ts` | NEW (R90 q-test) |
| 9-11 | `coordination/specs/Q-R90-{SPEC,SPEC-AUDIT,EMPIRICAL}.{md,sh}` | NEW (R90 spec triad) |
| 12 | `coordination/reviews/REVIEWER-REPORT-R90.md` | NEW (Reviewer stage artifact) |
| 13 | `coordination/MEMORIAL.md` | CHANGED (per-role CONFIRMATION/VIOLATION appends) |
| 14 | `coordination/NEXT-ROLE.md` | CHANGED (routing block updates per R83) |
| 15 | `coordination/logs/ROUND-R90-*.md` | CHANGED (pipeline run logs; gitignored implicitly via `coordination/.prompt-*.md` rule? No — `coordination/logs/ROUND-R*.md` is NOT gitignored; these files DO appear in git diff and are explicitly ALLOWED here) |

### 5.4 Acknowledged AC gaps

| Gap | Why acknowledged | Minimum mitigation |
|---|---|---|
| No AC binds `engine/dist/` tracking status (whether dist/ is gitignored as expected) | gitignore semantics verified at P0.7 (Architect direct empirical command); not a load-bearing AC for any consumer | Reviewer cross-checks: `git check-ignore -v engine/dist/foo.js` should exit 0 at Reviewer HEAD; if NOT, file an issue (engineering hygiene). Not a R90 fail. |
| No AC binds `pnpm pack` excluding the not-yet-built `engine/dist/` (i.e., what happens if the Implementer skips step 7 of § 4.2) | Implementer chore-A flow is prescribed step-by-step in § 4.2; AC-R90-7 binds the dist/ artifact existing before pack runs in AC-R90-8 (AC-R90-7 ordering precedes AC-R90-8 by test name; node:test runs tests in file order) | AC-R90-9 binds tarball CONTENT including dist/ paths — if Implementer skipped tsc, tarball is missing entries and AC-R90-9 FAILS |
| No AC binds runtime `require.resolve('@johnpatrickwarren-oss/deploysignal-engine')` resolving against the local engine/ directory (would require `pnpm link` setup or workspace registration) | R91 scope (consumption migration). The R90 deliverable is the package DEFINITION + buildable tarball; consumer resolution lands in R91 | Documented; R91 spec will bind resolution ACs |
| No AC asserts the tarball is a valid npm tarball at the protocol level (e.g., parseable by `npm publish --dry-run`) | npm publish is anti-scoped per R90 directive ("NO npm publish") | `pnpm pack` exit 0 + `tar -tzf` enumeration provide sufficient signal for R90 |
| No AC asserts no NEW external dependency was added by the Implementer (e.g., no new entry in `dependencies` or `devDependencies` in either `engine/package.json` or root `package.json`) | engine/package.json prescribed structure (§ 3.1) has zero deps fields; root package.json delta (§ 3.5) is single-script-addition without dep changes | Reviewer reads both files cold-eye; will catch any unprescribed dep |

---

## § 6. Anti-scope (R90 hard limits)

Carried verbatim from R90 directive (NEXT-ROLE.md lines 74-87) and supplemented with spec-derived additions:

- **NO modification of engine algorithm files** (`engine/detectors/*`, `engine/fleet/*`, `engine/l0/*`, `engine/o0/*`, `engine/per-shard/*`, `engine/topology/*`, `engine/events/*`, `engine/ds-integration/*` content) — extraction is structural-only this round
- **NO modification of `engine/types/*.ts` content** (barrel + re-exports + all 12 types files preserved); even `engine/types/index.ts` is NOT modified (the line-4 "Extract target" comment is updated in R91-scope hygiene, not R90)
- **NO modification of Tessera-internal consumers** (`test/*.ts` other than NEW q90, `tools/*.ts`, `demos/*`)
- **NO modification of `tools/curate-baseline.ts` or any R88 deliverable** (frozen)
- **NO modification of R73-R89 substantive deliverables** (frozen)
- **NO modification of any pre-R90 test file** (q01..q89 frozen; q90 is NEW)
- **NO new external dependencies** (no entries added to `dependencies` / `devDependencies` of either package.json)
- **NO npm publish** (git-dependency is the consumption mechanism per R91/R92; R90 produces tarball only)
- **NO git tag creation** (semver tagging is R91/R92 scope)
- **NO real-cluster; NO DS-repo; NO `gh repo` operations beyond push to Tessera public**
- **NO modification of pre-R90 carry-forward AC fail set** (AC-R84-14 stochastic flake band preserved; AC-R89-8 acknowledged-failing per R89 MAJOR-2)
- **NO modification of `CLAUDE-*.md` files** (R89 composite folding stands; sustaining mechanism enforces)
- **NO modification of `coordination/MEMORIAL-PHASE-*.md` shards** (R89 archival stands; back-references preserved)
- **NO modification of `pnpm-workspace.yaml`** (gitignored per P0.8; modifying it has no committable effect)
- **NO `git mv` for engine/ → packages/engine/** (Option A chosen; Option B explicitly rejected per § A1)

---

## § 7. Q-R90-EMPIRICAL.sh — block enumeration

See `coordination/specs/Q-R90-EMPIRICAL.sh` for the full script. Summary of blocks:

| Block | Purpose | Binding command(s) | Expected at chore-A HEAD |
|---|---|---|---|
| 1 | `engine/package.json` exists | `test -f engine/package.json` | exit 0 |
| 2 | tsconfig outDir is `engine/dist` | `node -e "process.exit(JSON.parse(require('fs').readFileSync('tsconfig.json','utf8')).compilerOptions.outDir === 'engine/dist' ? 0 : 1)"` | exit 0 |
| 3 | `engine/README.md` exists with `## Install` header | `test -f engine/README.md && grep -q '^## Install' engine/README.md` | exit 0 |
| 4 | VENDORING-MANIFEST.md head has R90 + 2026-05-21 + `@johnpatrickwarren-oss/deploysignal-engine` | `head -60 coordination/VENDORING-MANIFEST.md \| grep -q 'R90' && head -60 ... \| grep -q '2026-05-21' && head -60 ... \| grep -q '@johnpatrickwarren-oss/deploysignal-engine'` | exit 0 |
| 5 | `engine/dist/` build artifact sentinels exist | `test -f engine/dist/types/index.js && test -f engine/dist/topology-overlay.js && test -f engine/dist/detectors/betting-e-process.js` | exit 0 |
| 6 | `pnpm pack` produces expected tarball name | `cd engine && pnpm pack --pack-destination . >/dev/null 2>&1 && test -f johnpatrickwarren-oss-deploysignal-engine-0.1.0-pre.tgz` | exit 0 |
| 7 | tarball content contains expected entries + excludes test/coordination | `tar -tzf engine/johnpatrickwarren-oss-deploysignal-engine-0.1.0-pre.tgz \| grep -q 'package/dist/types/index.js' && tar ... \| grep -qv 'package/test/' && ...` | exit 0 |
| 8 | test build typecheck + full test fail count band | `pnpm exec tsc -p tsconfig.test.json && node --test --test-reporter=tap test/*.test.js 2>&1 \| tail -10 \| grep '^# fail '` exits 0 AND parsed fail count ∈ [16, 17] | exit 0 |
| 9 | anti-scope diff `git diff 65edb85 HEAD --name-only` ⊆ ALLOWED_SET regex | piped through `grep -Ev "$ALLOWED"` produces empty output | exit 0 |

All blocks MUST use `--test-reporter=tap` BEFORE test files per R77 + R89 MAJOR-1 sub-pattern (flag-ordering: `node --test --test-reporter=tap test/*.test.js`, never `node --test test/*.test.js --test-reporter=tap`).

Block 8 fail-count band: `EXPECTED_FAIL_MIN=16` `EXPECTED_FAIL_MAX=17` (not strict equality; R85 fail-count-band discipline).

---

## § 8. Pre-emit grilling

Per CLAUDE-ARCHITECT.md + CLAUDE-COMMON.md REINFORCED entries; this section IS the load-bearing audit trail (R20 ARCH MINOR-1 + R75 self-application gate).

### 8.1 Q: Every claim verifiable?

For every spec § that makes an empirical claim, the evidence is in § 0 P0.1-P0.14 with command output recorded verbatim. Architect-prediction rows in § 5.2 are clearly labeled as predictions and bind via AC verification at Reviewer HEAD. **YES — every claim is verifiable.**

### 8.2 Q: Unstated assumptions?

| Assumption | Verified at | Risk if wrong |
|---|---|---|
| `pnpm pack` produces `<scope>-<name>-<version>.tgz` for scoped packages | npm-pack docs; standard npm/pnpm CLI convention | If pnpm pack format differs, AC-R90-8 tarball-name assertion fails → HALT + DIAGNOSTIC. Architect explicitly chose `--pack-destination` flag to be defensive about cwd. |
| `tar -tzf` is available on the Implementer's Darwin platform | macOS ships BSD tar by default; `tar -tzf` is supported on BSD tar | If BSD tar lacks the flag, AC-R90-9 fails → HALT + DIAGNOSTIC. Verified: P0.14 (Architect ran `tar` locally — no error). |
| `engine/dist/` is git-ignored by `.gitignore:14: dist/` | P0.7 `git check-ignore` empirical verification | If recursive `dist/` pattern doesn't match `engine/dist/`, build output gets accidentally committed (not load-bearing for R90 ACs but engineering hygiene). |
| Existing test count baseline is 710 | P0.12 empirical verification (`# tests 710`) | If R89 attestation count was wrong, fail-count band would need adjustment (Architect uses OBSERVED count, not attested count; R88 false-compliance-attestation discipline). |
| R83 routing-flip causes AC-R89-8 to fail at non-chore-A HEAD | R89 MAJOR-2 documentation in MEMORIAL.md:163 | If R83 routing-flip behavior changes by R90 close, fail count would shift. Architect uses OBSERVED band, not predicted; band derived empirically (P0.12). |

**No unstated assumptions remain.** Each Architect prediction is annotated with its verification source.

### 8.3 Q: Scope added beyond request?

Cross-check against directive § Primary deliverables (NEXT-ROLE.md lines 26-68):

| Directive item | Spec coverage | Beyond directive? |
|---|---|---|
| Engine package boundary declared (Option A vs B picked) | § 1.1 + § A1 | No |
| Package metadata (name, version, main, types, files, license, repository, exports) | § 3.1 | No |
| Types-barrel decoupling preserved | § 1.4 + AC-R90-14 (engine sentinels byte-identical) | No |
| Build artifact verifiable (tsc + pnpm pack) | § 3.4 + § 4.2 + AC-R90-7/8 | No |
| Backwards-compat smoke (test suite passes; tsc exits 0; tools/* still build) | § 1.4 + § 5.2 + AC-R90-13 band + AC-R90-14 sentinels | No |
| VENDORING-MANIFEST.md header note | § 3.6 + AC-R90-11 | No |
| README at engine package root | § 3.2 + AC-R90-10 | No |
| `test/q90-engine-package-extract.test.ts` ≥ 10 ACs | § 3.3 + § 5.1 (14 ACs) | No (exceeds minimum) |
| Q-R90-EMPIRICAL.sh with `--test-reporter=tap` BEFORE files | § 7 + script delivered | No |
| `pack:engine` script convenience (not in directive) | § 3.5 + AC-R90-12 | **Added by Architect.** Rationale: directive ALLOWED `package.json` modifications; one-command pack is operator-friendly; verified harmless via AC-R90-12 (existing scripts preserved). **Document this as a scope-extension; Operator may strike if wanted.** |
| `.gitignore` `engine/*.tgz` line (not in directive ALLOWED) | § 4.1 + ALLOWED_SET row 6 | **Added by Architect.** Rationale: tarball lifecycle requires either per-test cleanup OR gitignore. Architect picks gitignore (simpler; idempotent; persists across test runs). Documented as scope-extension; minimal impact (1 line append). |

Two scope extensions documented (`pack:engine` script + `.gitignore` line). Both are minimal-blast-radius and Architect-justified. No silent additions.

### 8.4 Q: Implementer can act without guessing?

Cross-check § 3 per-file pseudocode for completeness:

- **engine/package.json**: 100% byte-verbatim JSON content prescribed.
- **engine/README.md**: 100% byte-verbatim markdown content prescribed.
- **tsconfig.json**: exact diff prescribed.
- **package.json (root)**: exact diff prescribed (single-line script addition at named insertion point).
- **VENDORING-MANIFEST.md**: exact markdown insertion + insertion point prescribed.
- **.gitignore**: exact text prescribed (1 line).
- **test/q90-engine-package-extract.test.ts**: 100% byte-verbatim TypeScript prescribed.
- **Q-R90-EMPIRICAL.sh**: § 7 block table + full script in companion file.

Zero design decisions deferred. Implementer copies verbatim; runs the prescribed build sequence (§ 4.2); commits.

### 8.5 Q: Rule 5 self-application gate (R86 prophylactic + R87 + R88 + R89)?

Walked § 7 EMPIRICAL.sh block prescriptions through prescribed implementation:

- Block 1 (`test -f engine/package.json`): trivially correct.
- Block 2 (`node -e ... outDir === 'engine/dist'`): verify by running against R90-modified tsconfig.json mentally: `JSON.parse(file).compilerOptions.outDir` = `'engine/dist'` → comparison returns true → process.exit(0). ✓
- Block 3 (`grep -q '^## Install'`): the README § 3.2 has the literal line `## Install` (line 18); anchored start-of-line; grep matches. ✓
- Block 4: head -60 of post-R90 VENDORING-MANIFEST.md contains the inserted block from § 3.6 starting at line 6 (after pre-existing line 4 + blank line). The inserted block has all 3 patterns. ✓
- Block 5: post-R90 `engine/dist/` after `pnpm exec tsc` contains all 3 sentinels per P0.10. ✓
- Block 6: `pnpm pack --pack-destination .` from `engine/` cwd produces tarball at `engine/<scoped-name>.tgz`. Confirmed via pnpm CLI docs. ✓
- Block 7: `tar -tzf` listing includes `package/dist/types/index.js` (verified — npm pack convention prefixes `package/`). ✓
- Block 8: `pnpm exec tsc -p tsconfig.test.json` exit 0 (P0.11) + `node --test --test-reporter=tap test/*.test.js` produces TAP format (R77 + R89 lesson — flag-ordering correct: `--test-reporter=tap` BEFORE files). ✓
- Block 9: ALLOWED regex matches every entry in § 5.3 path table (cross-checked manually below in § 8.6).

### 8.6 Q: ALLOWED_SET regex vs path enumeration consistency (R72 + R82 ALL-gate-artifacts-propagation)?

Walk the regex against each path in § 5.3 table:

| Path | Regex match? |
|---|---|
| engine/package.json | `engine/package\.json` ✓ |
| engine/README.md | `engine/README\.md` ✓ |
| tsconfig.json | `tsconfig\.json` ✓ |
| package.json | `package\.json` ✓ (root match; engine/package.json is a separate path; regex alternation handles both) |
| pnpm-workspace.yaml | `pnpm-workspace\.yaml` ✓ |
| .gitignore | `\.gitignore` ✓ |
| coordination/VENDORING-MANIFEST.md | `coordination/VENDORING-MANIFEST\.md` ✓ |
| test/q90-engine-package-extract.test.ts | `test/q90-engine-package-extract\.test\.ts` ✓ |
| coordination/specs/Q-R90-SPEC.md | `coordination/specs/Q-R90-(SPEC\|SPEC-AUDIT\|EMPIRICAL)\.(md\|sh)` ✓ |
| coordination/specs/Q-R90-SPEC-AUDIT.md | same regex ✓ |
| coordination/specs/Q-R90-EMPIRICAL.sh | same regex ✓ |
| coordination/reviews/REVIEWER-REPORT-R90.md | `coordination/reviews/REVIEWER-REPORT-R90\.md` ✓ |
| coordination/MEMORIAL.md | `coordination/MEMORIAL\.md` ✓ |
| coordination/NEXT-ROLE.md | `coordination/NEXT-ROLE\.md` ✓ |
| coordination/logs/ROUND-R90-ROUTING.md | `coordination/logs/ROUND-R90-.*` ✓ |

Regex anchors `^...$` on both ends per Block 9 implementation. No path in the table fails the regex. **Per R82 propagation discipline:** § 5.3 table, § 5.3 regex, and EMPIRICAL.sh Block 9 ALLOWED are all derived from the same source (this spec) and must be updated in lockstep. If any future round amends this table, EMPIRICAL.sh MUST be amended in the same commit.

### 8.7 Q: R85 fail-count-band carried forward?

Yes. § 1.7 + § 5.2 + § 7 Block 8 all use band `[16, 17]` (or `[16, 18]` if R90 introduces any flake, which it doesn't per Architect prediction). Strict equality avoided. Active flaky AC names (AC-R84-14 + AC-R89-8) cited verbatim.

### 8.8 Q: R86 prophylactic + R87 + R88 sub-patterns?

- **R86 prophylactic (self-application gate):** § 8.5 walks every encoded pattern through the prescribed implementation. ✓
- **R87 prose-claim-about-post-edit-state:** R90 has no Edit-of-existing-file with prose claim about post-edit state. Changes are either (a) single-line outdir replacement in tsconfig.json (no prose claim) OR (b) header-note insertion above an existing section (no prose claim about post-edit absence). VENDORING-MANIFEST.md insertion at § 3.6 is an ADD-ONLY operation — § 8.3 spec wording does not claim "after this insertion, X will not be present"; it asserts "the inserted block is present" (positive assertion). ✓
- **R88 grep-semantics:** Architect did NOT rely on grep for any .gitignore claim. P0.5 + P0.7 use direct Read + `git check-ignore` (the structurally-correct command). ✓
- **R89 EMPIRICAL.sh probe-at-spec-emit:** Architect ran Block 9 (anti-scope diff) at HEAD `65edb85` and verified the regex was self-consistent. Cannot fully probe Blocks 1-6 at round-start HEAD because the impl artifacts don't exist yet — but the EXPECTED-FAIL state at round-start is documented in § 0 P0.14: Blocks 1-6 + 8 FAIL pre-impl (expected; Implementer flips them PASS at chore-A); Block 7 + 9 PASS at round-start (Block 9 with only `coordination/logs/ROUND-R90-ROUTING.md` untracked + spec-triad files yet-to-commit).

### 8.9 Q: Spec-internal-contradiction sweep (CLAUDE-ARCHITECT.md SPEC-INTERNAL-CONSISTENCY composite)?

Cross-check for: (a) algorithmic boundaries; (b) type-shape consistency; (c) AC text vs § 4.x prescription; (d) P3 commitments having AC binding; (e) bands across § 1.7 / § 5.2 / § 7 Block 8.

- (a) No algorithmic boundary primitives in R90.
- (b) No type definitions in R90.
- (c) Each AC § 5.1 row cites the § 3.x prescription it binds; spot-check 3: AC-R90-2 ↔ § 3.1 line 2 ✓; AC-R90-6 ↔ § 3.4 ✓; AC-R90-11 ↔ § 3.6 ✓.
- (d) § 9 P3 commitments — see § 9 below; each P3 row maps to an AC ID.
- (e) Bands: § 1.7 `[16,17]`; § 5.2 `[16,17]`; § 7 Block 8 `EXPECTED_FAIL_MIN=16, EXPECTED_FAIL_MAX=17`. Consistent. ✓

### 8.10 Q: R74 self-application-gate (regex AC validates against its own pseudocode)?

For AC-R90-13: ALLOWED regex's literal alternation matches each path produced by the Implementer's prescribed work. Walked § 8.6. ✓

For AC-R90-10: README regex `/^# @johnpatrickwarren-oss\/deploysignal-engine/m` validates against § 3.2 line 1: `# @johnpatrickwarren-oss/deploysignal-engine`. ✓ All section regexes (`^## What this package is`, `^## Install`, `^## Build`) validate against § 3.2 lines 5, 18, 31. ✓

For AC-R90-4 exports map: each exact subpath enumerated in the AC matches a key in § 3.1's exports object. ✓ Each wildcard subpath ditto. ✓

### 8.11 Q: All 7 cross-project rules applied UPFRONT?

| Rule | Application |
|---|---|
| **Rule 1** (empirical-command-attestation) | EMPIRICAL.sh Block 9 + AC-R90-13 attest from verbatim `git diff` output. § 0 P0.* derive from verbatim command output. |
| **Rule 2** (branch-binding-coverage) | Each branch in the prescribed prod artifacts has an AC: engine/package.json fields → AC-R90-1/2/3/4/5; tsconfig delta → AC-R90-6; build artifact → AC-R90-7; tarball → AC-R90-8/9; README → AC-R90-10; VENDORING-MANIFEST.md → AC-R90-11; pack:engine script → AC-R90-12; .gitignore line → covered transitively via tarball lifecycle (AC-R90-9 anti-content gates). |
| **Rule 3** (per-AC assertion coverage) | § 8.10 walks AC text vs assertion shape; each AC's "Then" clause binds a specific observable. |
| **Rule 4** (anti-scope-allowed-set-forward-coverage) | ALLOWED_SET enumerated in § 5.3 mirror-table + regex + EMPIRICAL.sh Block 9 + AC-R90-13 (4 surfaces; R82 propagation discipline). |
| **Rule 5** (self-application gate) | § 8.5 walks every encoded pattern. § 8.10 walks regex ACs. |
| **Rule 6** (halt-discipline-no-DIAGNOSTIC-for-workaround) | § 6 anti-scope + § 4.1 tarball-lifecycle decision both document explicit choices vs implicit workarounds. No halt-condition is bypassed via judgment call. |
| **Rule 7** (derived-rule-propagation-mechanism-required) | No new rule derived at Architect stage. If MU surfaces a new rule, propagation per Rule 7 is sustained by `scripts/check-claude-md-thresholds.sh` (R89 sustaining mechanism). |

---

## § 9. P3 ten-axis verification

| Axis | Verification |
|---|---|
| **correctness** | § 3.x pseudocode matches directive deliverables; § 0 empirical baselines verified at round-start HEAD; AC-R90-1..14 each bind a verifiable observable; build pipeline (tsc → engine/dist/ → pnpm pack → tarball) is the standard pnpm/npm pattern (no novel mechanism). |
| **completeness** | All 9 R90 directive primary deliverables addressed (§ 8.3 table). 14 ACs cover package metadata (1-5), build pipeline (6-8), content gates (9-11), root-package + anti-scope (12-14). |
| **consistency** | ALLOWED_SET text table (§ 5.3), regex (§ 5.3 + EMPIRICAL.sh Block 9), and AC-R90-13 binding are byte-mirrored (§ 8.6). Bands `[16,17]` cross-cited in § 1.7, § 5.2, § 7 (§ 8.9 e). |
| **clarity** | Each AC row uses Given/When/Then; § 3 pseudocode is byte-verbatim for content files; § 4.2 build sequence is numbered step-by-step. No ambiguous language ("correctly", "appropriately"). |
| **coverage** | Every directive deliverable has AC binding. Backwards-compat is split across AC-R90-13 (path-level diff) + AC-R90-14 (byte-level engine sentinels) + AC-R90-12 (root scripts preserved) + § 5.2 band (test-suite continues passing). |
| **constraints** | NFRs preserved: backwards-compat (AC-R90-14); inherited Ville bounds (no algorithm modification per anti-scope); engine vendoring-at-pin (per-row SHAs unchanged in VENDORING-MANIFEST.md). Anti-scope hard limits enumerated § 6. |
| **concurrency** | R90 is single-threaded (no parallel cluster work). No concurrency primitives introduced. |
| **corner cases** | Tarball name format for scoped packages (verified npm convention); empty `git diff` output handled (regex matches `^...$` against empty input → no violator); stochastic flake band (R85 discipline applied); R83 routing-flip carries-forward (AC-R89-8 acknowledged-failing). |
| **cost** | Reviewer/MU cycle cost low: 9 EMPIRICAL.sh blocks + 14 q90 runtime ACs + full test suite re-run. No subagent dispatch needed. |
| **coupling** | Architecturally Option A minimizes coupling: zero changes to engine algorithm + types + tools/* + test/*. Only build-infra delta is `tsconfig.json` outDir (1 line) + `engine/package.json` (NEW). |

---

## § 10. Open questions

**None — all resolved.**

The directive's two-option choice (Option A vs Option B) is resolved in § 1.1 in favor of A. The directive's ALLOWED-listing of `pnpm-workspace.yaml` is resolved in § 1.1 + § 5.3 + § 8.3 by NOT modifying it (gitignored). The directive's predicted fail band `[14,16]` is resolved in § 1.7 + § 5.2 in favor of the empirically-observed band `[16,17]` (the directive's band omitted the AC-R89-8 routing-flip carry-forward; Architect uses observed, per R88 empirical-command-attestation discipline).

---

## § 11. Reviewer / MU read path

Reviewer reads at order:
1. PRD.md (or this spec inline)
2. Q-R90-SPEC.md (this file)
3. Q-R90-SPEC-AUDIT.md (sidecar — brainstorm + design + audit-trail)
4. Q-R90-EMPIRICAL.sh (independently re-runs at Reviewer HEAD)
5. test/q90-engine-package-extract.test.ts (independently runs at Reviewer HEAD)
6. coordination/MEMORIAL.md tail (Architect + Implementer entries)

Memorial-Updater reads same set + REVIEWER-REPORT-R90.md.

The spec proper (§ 1-§ 11 above) contains every decision; the audit sidecar contains brainstorm/design/why-picked-rationale; the empirical harness contains attestation commands. Each role acts cold from these files alone.
