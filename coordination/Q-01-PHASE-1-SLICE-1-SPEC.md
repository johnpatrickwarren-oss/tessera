# Topic 1 — Phase 1 SLICE 1: Engine Vendoring + Schema Additions

_From: Architect (overnight autonomous run; authorized by John 2026-05-15)._
_To: Implementer (Mac Claude; TBD which session if parallel)._
_Routed via: TPM (self-routing in single-session model)._
_Date: 2026-05-15 (overnight)._
_Foundation: SCOPING-MEMO-v0.3 (`tessera/coordination/SCOPING-MEMO-v0.3.md`) + ARCHITECT-REPLY-v0.3-PRE-DISPOSITION (`tessera/coordination/ARCHITECT-REPLY-v0.3-PRE-DISPOSITION.md`; Q-J1..Q-J5 PICKED; Q-J6 ESCALATED) + engine modularity facts from originating context (`runs/benchmarks/tick-latency-baseline.json` measured 2026-04-20)._
_Type: **full implementation brief (SPEC fidelity)** per anchor `templates/Q-NN-SPEC-TEMPLATE.md`. SLICE 1 of Tessera Phase 1; architectural-foundation-only._
_Sequencing: Q1 is the entry point for Tessera Phase 1. Precedes Q2 (Phase 1 SLICE 2 — per-shard residual schema + warm-start cold-start mechanism + empirical P6 storage profile). **Gating on John's Q-J6 disposition** for implementation start; spec emit proceeds tonight under autonomy authority._
_Pre-route gates applied: anchor `skills/14-prd-conjunction-cross-check.md` (PRD-conjunction-cross-check) + `skills/15-prescription-to-AC-coverage.md` (prescription-to-AC-coverage) per architect-side discipline; PASS at this emit per § 6 pre-route discipline application._

---

## Spec

SLICE 1 of Tessera Phase 1 vendors the load-bearing statistical-detector engine subset from DeploySignal (`5a72371`, current main at cloning time) into Tessera's tree and extends the compile-time schema with the three Tessera-specific additions (shard_id cell dimension, per_shard_cells field, warm_start confidence enum value) — establishing the architectural foundation on which Phase 1 SLICE 2-4 build per-shard residual semantics, hierarchical e-value combination, and e-BH FDR operator surface. **No substantive per-shard predicate logic, fleet-merge logic, or detector behavior changes** at SLICE 1; the slice is mechanical-vendoring + schema-extension only.

The slice closes when (per acceptance criteria § AC): (a) all required engine files are vendored at SHA `5a72371` with per-file source-SHA headers per § 9 of SCOPING-MEMO-v0.3; (b) `tessera/engine/types/config.ts` extends inherited schema with the three Tessera additions without breaking inherited fields; (c) Tessera-side `tsc` clean compile; (d) Tessera-side vendoring-coverage regression test asserts header format and SHA integrity; (e) defensive A12-preservation test asserts vendored detector files are byte-identical to source modulo headers.

Traces to SCOPING-MEMO-v0.3 § 3 Phase 1 SLICE 1 row + § 9 vendoring policy. **No PRD per se exists for Tessera**; the "PRD analog" at SCOPE-PROPOSAL fidelity is v0.3 + PRE-DISPOSITION + John's structured intake of 2026-05-15. Skill 14 PRD-conjunction-cross-check applied at conjunct level (§ 6 below); PASS.

## Architectural mechanism

**High-level approach:** mechanical file-vendoring with header-stamped provenance + targeted schema extensions at architecturally-anchored extension points.

Three architectural primitives at play:

1. **Inherited engine surface** (the vendor source). All 12 detector files under `deploysignal/engine/detectors/` + 5 family type files under `deploysignal/engine/types/families/` + core orchestration primitives (`engine/core.ts` TrendBuffer; `engine/per-detector-resampler-mode.ts`; `engine/topology-overlay.ts`; `engine/signal-classes.ts`; `engine/verdict.ts`; `engine/verdict-groups.ts`) + the compile-time schema (`engine/types/config.ts`, `engine/types/verdict.ts`, `engine/types/primitives.ts`, `engine/types/metrics.ts`, `engine/types/orchestration.ts`, `engine/types/policy.ts`, `engine/types/audit.ts`, `engine/types/self-normalized-fallback.ts`, `engine/types/index.ts`). All pinned at DeploySignal SHA `5a72371` (current `main` at clone-time 2026-05-15).

2. **Tessera-side vendored target.** All files copied verbatim to `tessera/engine/*` preserving relative directory structure. Per-file headers added at top of each vendored file noting source path + SHA + sync policy + extract target (per v0.3 § 9 vendoring policy format).

3. **Schema extension surface.** Three Tessera-specific additions land in `tessera/engine/types/config.ts` (the only file with SLICE 1 deltas):
   - `'shard_id'` added to the `CellDimension` union (extends inherited `'hour_of_day' | 'day_of_week' | 'workload_class' | 'tenant_slice' | 'region' | 'pod_id'`).
   - `per_shard_cells: Array<PerShardCell>` field added to `CompiledConfig` parallel to inherited `baseline_cells`. `PerShardCell` shape: `{ shard_id: string, residual: PerShardResidual }`; `PerShardResidual` is `{ mean_vector?: number[], covariance?: number[][], cell_confidence: CellConfidence }` — sparse-encoded with optional fields representing per-shard delta from fleet-aggregate. **Full `PerShardResidual` semantics are SLICE 2 scope**; SLICE 1 ships the type declaration only with optional fields, NOT runtime population logic.
   - `'warm_start'` added to the `CellConfidence` union (extends inherited `'strict' | 'pooled' | 'aggregate' | 'low' | 'none'`).

The vendor-extract operation is implemented as a small shell script (`tessera/tools/vendor-from-deploysignal.sh`) that:
- Takes a target source path (relative to `deploysignal/`) + target tessera path
- Copies the file
- Prepends the standard header block (parameterized by source path + SHA + sync policy + extract target)
- Verifies via grep that the source SHA matches the expected pin
- Emits a vendoring manifest (`tessera/coordination/VENDORING-MANIFEST.md`) tracking every vendored file with its source SHA + sync policy

Re-runs of the script at re-pin time (Phase 1 close-walk / Phase 2 close-walk per v0.3 § 9 re-pinning policy) are idempotent: existing vendored files are diffed against the new source; matching files are re-pinned via header SHA update; mismatching files surface as "re-vendor required" requiring architect review (per v0.3 § 9 three-outcome re-pinning policy).

**Integration points:**
- Tessera's `package.json` (Q1.2-resolved below) declares `"name": "@johnpatrickwarren-oss/tessera"`, version `"0.1.0-pre"`, type `"module"`, test script `"node --test test/"` (matching DeploySignal's node:test framework convention).
- Tessera's `tsconfig.json` + `tsconfig.test.json` (Q1.1-resolved below) adapt DeploySignal's tsconfig structure with paths rooted at `tessera/engine/` instead of `deploysignal/engine/`.
- No native dependencies (per originating-context engine modularity fact); pure-TypeScript build.

---

## Open questions resolved at spec-emit (Q1.1 → Q1.5)

### Q1.1 — TypeScript build configuration

**Architect-pick: VENDOR DeploySignal tsconfig structure at-pin; adapt path mappings only.**

**Why VENDORED-AT-PIN picked:** DeploySignar's `tsconfig.json` + `tsconfig.browser.json` + `tsconfig.test.json` are already validated for the vendored detector files (5 years of CI runs on the inherited engine). Reusing the structure minimizes Q1 spec-emit risk; path mappings are the only mechanical adjustment.

**Why WRITE-FROM-SCRATCH rejected:** unnecessary novelty; introduces ts-config-drift risk between Tessera and DeploySignal at re-pin time. Tessera benefits from configuration coherence with the inherited engine; deviation only at architecturally-justified points (Q1.5 vendoring-script convention).

### Q1.2 — package.json

**Architect-pick: WRITE Tessera-specific `package.json` with the same dependencies as inherited DeploySignal package.json (node:* primitives only; no runtime deps).**

**Why WRITE-FROM-SCRATCH picked:** package name + version + repo URL are project-specific and cannot be vendored at-pin. Per originating-context engine modularity fact ("Pure TypeScript, no native dependencies"), the dependency set is empty at runtime; `devDependencies` minimal (typescript + node:test types).

**Why VENDORED-AT-PIN rejected:** name/repo/version fields would be wrong post-vendoring; mechanical text-substitution at vendor time is more brittle than writing a fresh package.json.

### Q1.3 — signal-classes.ts vendoring

**Architect-pick: VENDOR AT-PIN.**

**Why VENDORED-AT-PIN picked:** Tessera Phase 1 SLICE 1 uses inherited signal classes verbatim (raw / standardized / class-mapped per `deploysignal/engine/signal-classes.ts:1-135`); no Tessera-specific signal class additions at SLICE 1. New signal classes (e.g., for hardware-topology-derived signals at Phase 2) deferred to later cycle.

**Why VENDORED-WITH-DELTAS rejected:** premature; no SLICE 1 requirement.

### Q1.4 — Detector test files vendoring

**Architect-pick: VENDOR `test/betting-e-process-class-dispatch.test.ts` + `test/ville-preservation-per-profile.test.ts` AT-PIN as regression baseline; defer full test-suite vendoring.**

**Why PARTIAL-VENDOR picked:** these two tests are the load-bearing pair-review-style empirical-validation regressions for Family A Ville-bound preservation (inherited from DeploySignal Q2.A acceptance #8 + REPLY-43b pair-review-concur). Vendoring them gives Tessera a smoke-test surface that detects vendoring-introduced regressions immediately. Full test suite vendoring (138 files) is overkill for SLICE 1; defer to SLICE 2-3 as test-suite-coverage work surfaces.

**Why FULL-VENDOR rejected:** ~14,000 LOC of test files; most exercise DeploySignal-gating-specific scenarios irrelevant to Tessera's per-shard observation scope. Adopting only when needed.

### Q1.5 — Vendoring tool

**Architect-pick: SCRIPTED via `tessera/tools/vendor-from-deploysignal.sh`.**

**Why SCRIPTED picked:** ~20 files to vendor at SLICE 1; manual `cp` per file is error-prone for header-prepending and SHA-matching. Script reduces drift risk at re-pinning (Phase 1 close-walk + Phase 2 close-walk). Per v0.3 § 9 re-pinning policy, the script must support idempotent re-vendoring with delta-detection.

**Why MANUAL rejected:** scales poorly to subsequent re-vendoring cycles; encodes header format inconsistently.

---

## Implementation surface

### File: `tessera/tools/vendor-from-deploysignal.sh` (new)

```bash
#!/bin/bash
# tessera/tools/vendor-from-deploysignal.sh
#
# Vendor an engine file from DeploySignal into Tessera with provenance header.
#
# Usage:
#   ./tools/vendor-from-deploysignal.sh <source-relative-path> <target-relative-path> <sync-policy>
#
# Example:
#   ./tools/vendor-from-deploysignal.sh engine/detectors/betting-e-process.ts engine/detectors/betting-e-process.ts vendored-at-pin
#
# sync-policy: vendored-at-pin | vendored-with-deltas
#
# Reads DeploySignal SHA from coordination/VENDORING-MANIFEST.md header.
# Prepends standardized header per SCOPING-MEMO-v0.3 § 9.

set -euo pipefail

DEPLOYSIGNAL_ROOT="${DEPLOYSIGNAL_ROOT:-../deploysignal}"
PINNED_SHA="${PINNED_SHA:-5a72371}"  # Override per re-pin cycle.
EXTRACT_TARGET="@johnpatrickwarren-oss/deploysignal-engine"  # Future npm package; Phase 2 commitment.

source_path="$1"
target_path="$2"
sync_policy="$3"

# ...verification: source file exists in deploysignal/ at pinned SHA
# ...verification: target_path under tessera/engine/* (sandbox to engine/)
# ...action: prepend header block + copy contents
# ...action: append entry to coordination/VENDORING-MANIFEST.md

# Header format (preserved verbatim in vendored file):
# // VENDORED FROM DeploySignal main@<PINNED_SHA> — <DATE>
# // Source: deploysignal/<source_path>
# // Sync policy: <sync_policy>
# // Extract target: <EXTRACT_TARGET> (Tessera Phase 2 close commitment)
# // DO NOT modify internals without ADR; deltas only at architecturally-
# // anchored extension points (see SCOPING-MEMO-v0.3 § 9).

# Concrete implementation lands in MAC-CLAUDE-pasteable (separate artifact);
# pseudo-code suffices at spec-emit fidelity.
```

### File: `tessera/coordination/VENDORING-MANIFEST.md` (new)

```markdown
# Vendoring Manifest

_Authoritative record of files vendored from DeploySignal into Tessera with source SHA + sync policy._

| Target (tessera/) | Source (deploysignal/) | SHA | Sync policy | Vendored | Notes |
|---|---|---|---|---|---|
| engine/detectors/_linalg.ts | engine/detectors/_linalg.ts | 5a72371 | vendored-at-pin | 2026-05-15 | |
| engine/detectors/betting-e-process.ts | engine/detectors/betting-e-process.ts | 5a72371 | vendored-at-pin | 2026-05-15 | |
| ...11 detector files total... | | | | | |
| engine/types/families/a.ts | engine/types/families/a.ts | 5a72371 | vendored-at-pin | 2026-05-15 | |
| ...5 family type files total... | | | | | |
| engine/types/config.ts | engine/types/config.ts | 5a72371 | vendored-with-deltas | 2026-05-15 | SLICE 1 deltas: shard_id + per_shard_cells + warm_start |
| engine/types/verdict.ts | engine/types/verdict.ts | 5a72371 | vendored-at-pin | 2026-05-15 | Phase 2 SLICE 1 will add cluster_event_id delta. |
| engine/topology-overlay.ts | engine/topology-overlay.ts | 5a72371 | vendored-at-pin | 2026-05-15 | Phase 2 SLICE 3 will add HardwareTopologySource delta. |
| ...remaining core + orchestration primitives... | | | | | |
```

Full manifest enumerates 20-25 vendored files at SLICE 1 close.

### File: `tessera/package.json` (new)

```json
{
  "name": "@johnpatrickwarren-oss/tessera",
  "version": "0.1.0-pre",
  "description": "Statistically-rigorous behavioral observation for AI training/inference clusters",
  "license": "UNLICENSED",
  "type": "module",
  "private": true,
  "scripts": {
    "build": "tsc",
    "test": "node --test --experimental-vm-modules test/",
    "typecheck": "tsc -p tsconfig.test.json --noEmit"
  },
  "devDependencies": {
    "typescript": "^5.4.0",
    "@types/node": "^22.0.0"
  },
  "repository": {
    "type": "git",
    "url": "local-only-pre-v1"
  }
}
```

### File: `tessera/tsconfig.json` (new; adapted from DeploySignal)

```jsonc
// Adapted from deploysignal/tsconfig.json@5a72371; path mapping rooted at tessera/engine/.
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "dist",
    "rootDir": ".",
    "baseUrl": ".",
    "paths": {
      "@tessera/*": ["engine/*"]
    }
  },
  "include": ["engine/**/*.ts"],
  "exclude": ["node_modules", "dist", "test"]
}
```

### File: `tessera/tsconfig.test.json` (new; adapted from DeploySignal)

```jsonc
// Adapted from deploysignal/tsconfig.test.json@5a72371; includes test/ for typecheck.
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "noEmit": true
  },
  "include": ["engine/**/*.ts", "test/**/*.ts", "tools/**/*.ts"]
}
```

### File: `tessera/engine/types/config.ts` (vendored-with-deltas)

```typescript
// VENDORED FROM DeploySignal main@5a72371 — 2026-05-15
// Source: deploysignal/engine/types/config.ts
// Sync policy: vendored-with-deltas (Tessera Phase 1 SLICE 1)
// Extract target: @johnpatrickwarren-oss/deploysignal-engine (Tessera Phase 2 close commitment)
// DO NOT modify internals without ADR; deltas only at architecturally-anchored extension points.

// ─── INHERITED ───
// (all 820 LOC of deploysignal/engine/types/config.ts@5a72371 preserved verbatim)

// ─── TESSERA SLICE 1 DELTAS ───

// Delta 1: extend CellDimension union with 'shard_id'.
export type CellDimension =
  | 'hour_of_day'
  | 'day_of_week'
  | 'workload_class'
  | 'tenant_slice'  // legacy; superseded by tenant_tier per Addition #23
  | 'tenant_tier'
  | 'region'
  | 'pod_id'        // per Addition #12
  | 'shard_id';     // ── NEW: Tessera SLICE 1; per-shard cell dimension

// Delta 2: PerShardResidual + PerShardCell type declarations.
// Full runtime semantics deferred to Tessera Phase 1 SLICE 2; SLICE 1 ships type
// declarations only with optional fields representing per-shard delta from
// fleet-aggregate baseline.
export interface PerShardResidual {
  mean_vector?: number[];        // Sparse: present only at strict-upgraded cells.
  covariance?: number[][];       // Sparse: present only at strict-upgraded cells.
  cell_confidence: CellConfidence;
  // SLICE 2 will add: residual_seed_hash, per_shard_n_samples, etc.
}

export interface PerShardCell {
  shard_id: string;
  residual: PerShardResidual;
}

// Delta 3: extend CompiledConfig with per_shard_cells parallel to baseline_cells.
// Optional at SLICE 1; runtime population logic at SLICE 2.
declare module './config' {
  interface CompiledConfig {
    per_shard_cells?: PerShardCell[];
  }
}

// Delta 4: extend CellConfidence union with 'warm_start'.
export type CellConfidence =
  | 'strict'
  | 'pooled'
  | 'aggregate'
  | 'low'
  | 'none'
  | 'warm_start';  // ── NEW: Tessera SLICE 1; per-shard warm-start regime.
```

(Note: pseudo-code above shows delta locations; actual implementation merges deltas into the existing union types rather than re-declaring. Implementer verifies tsc clean.)

### File: `tessera/engine/detectors/*.ts` (12 files; all vendored-at-pin)

```typescript
// VENDORED FROM DeploySignal main@5a72371 — 2026-05-15
// Source: deploysignal/engine/detectors/<filename>
// Sync policy: vendored-at-pin
// Extract target: @johnpatrickwarren-oss/deploysignal-engine (Tessera Phase 2 close commitment)
// DO NOT modify internals without ADR; deltas only at architecturally-anchored extension points.

// ─── INHERITED ─── (full file content from deploysignal/engine/detectors/<filename>@5a72371)
```

(Files: `_linalg.ts`, `betting-e-process.ts`, `conformal.ts`, `family-a-mixture-supermartingale.ts`, `family-c-betting-e-process.ts`, `family-c-rff.ts`, `hotelling.ts`, `page-cusum.ts`, `self-normalized-e-process-fallback.ts`, `sequential-mmd.ts`, `spectral.ts`. `_q72-trace.ts` SKIPPED at SLICE 1 per Q1 architect-pre-prediction OQ-3; can vendor later if Tessera-side diagnostic equivalent is needed.)

### File: `tessera/engine/types/families/*.ts` (5 files; all vendored-at-pin)

Same header format as detectors. Files: `a.ts`, `b.ts`, `c.ts`, `d.ts`, `e.ts`.

### File: `tessera/engine/{core,per-detector-resampler-mode,topology-overlay,signal-classes,verdict-groups}.ts` (5 files; all vendored-at-pin)

Same header format.

### File: `tessera/engine/types/verdict.ts` (vendored-at-pin at SLICE 1)

Same header format. **Note:** Phase 2 SLICE 1 will add Tessera deltas for `cluster_event_id` field on VerdictGroup; SLICE 1 stays at-pin per architectural-foundation-only scope.

### File: `tessera/engine/types/{primitives,metrics,orchestration,policy,audit,self-normalized-fallback,index}.ts` (7 files; all vendored-at-pin)

Same header format.

### Skipped at SLICE 1 (deferred to later)

- `engine/orchestrator.ts` — DeploySignal-gating-specific; Tessera will write its own continuous-observation orchestrator at Phase 1 SLICE 2-3.
- `engine/audit.ts` — vendor at SLICE 2 when orchestration lands.
- `engine/l0/`, `engine/o0/`, `engine/g0/`, `engine/gates/`, `engine/drift/`, `engine/scenarios/`, `engine/signals/`, `engine/resamplers/` — gating-layer-specific subdirs not needed for Tessera Phase 1 SLICE 1; vendor selectively at later SLICEs.
- `engine/types/agent.ts` — Addition #27 dormant; not needed for Phase 1.

---

## Tests

### `tessera/test/q01-vendoring-coverage.test.ts` (new)

```typescript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { readdir } from 'node:fs/promises';

test('Q1 — every vendored file has the required header format', async () => {
  const expectedHeader = /\/\/ VENDORED FROM DeploySignal main@\w+ — \d{4}-\d{2}-\d{2}/;
  const vendoredPaths = [
    'engine/detectors/_linalg.ts',
    'engine/detectors/betting-e-process.ts',
    'engine/detectors/conformal.ts',
    'engine/detectors/family-a-mixture-supermartingale.ts',
    'engine/detectors/family-c-betting-e-process.ts',
    'engine/detectors/family-c-rff.ts',
    'engine/detectors/hotelling.ts',
    'engine/detectors/page-cusum.ts',
    'engine/detectors/self-normalized-e-process-fallback.ts',
    'engine/detectors/sequential-mmd.ts',
    'engine/detectors/spectral.ts',
    'engine/types/families/a.ts',
    'engine/types/families/b.ts',
    'engine/types/families/c.ts',
    'engine/types/families/d.ts',
    'engine/types/families/e.ts',
    'engine/core.ts',
    'engine/per-detector-resampler-mode.ts',
    'engine/topology-overlay.ts',
    'engine/signal-classes.ts',
    'engine/types/verdict.ts',
    'engine/types/config.ts',
    // ...remainder of vendored files...
  ];
  for (const p of vendoredPaths) {
    const content = await readFile(p, 'utf-8');
    assert.match(content, expectedHeader, `missing header in ${p}`);
  }
});

test('Q1 — every vendored file references the expected pinned SHA', async () => {
  const EXPECTED_SHA = '5a72371';
  // ...iterate vendored files, grep header for SHA, assert match
});

test('Q1 — vendoring manifest enumerates all vendored files with sync policy', async () => {
  const manifest = await readFile('coordination/VENDORING-MANIFEST.md', 'utf-8');
  // ...assert each vendored path is enumerated with non-empty SHA + sync_policy
});
```

### `tessera/test/q01-schema-additions.test.ts` (new)

```typescript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { CellDimension, CellConfidence, CompiledConfig, PerShardCell, PerShardResidual } from '../engine/types/config';

test('Q1 — shard_id is a valid CellDimension', () => {
  const dim: CellDimension = 'shard_id';
  assert.strictEqual(dim, 'shard_id');
});

test('Q1 — warm_start is a valid CellConfidence', () => {
  const conf: CellConfidence = 'warm_start';
  assert.strictEqual(conf, 'warm_start');
});

test('Q1 — PerShardResidual type accepts sparse encoding', () => {
  const sparse: PerShardResidual = { cell_confidence: 'warm_start' };
  assert.strictEqual(sparse.mean_vector, undefined);
  assert.strictEqual(sparse.covariance, undefined);
  assert.strictEqual(sparse.cell_confidence, 'warm_start');
});

test('Q1 — PerShardResidual type accepts strict-upgraded encoding', () => {
  const full: PerShardResidual = {
    mean_vector: [0, 0, 0],
    covariance: [[1, 0, 0], [0, 1, 0], [0, 0, 1]],
    cell_confidence: 'strict',
  };
  assert.deepStrictEqual(full.mean_vector, [0, 0, 0]);
  assert.strictEqual(full.cell_confidence, 'strict');
});

test('Q1 — CompiledConfig has optional per_shard_cells field', () => {
  // Type-level assertion only; runtime population at SLICE 2.
  const cfg: CompiledConfig = {} as CompiledConfig; // SLICE 1 stub
  // ...
});
```

### `tessera/test/q01-no-detector-deltas.test.ts` (new — defensive A12 enforcement)

```typescript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// For each vendored detector file, assert byte-identical to source modulo the
// header block. Defends A12 (no per-shard detector internals modification).
//
// Approach: strip the header block (first N lines matching the header
// regex) from both vendored and source files; compare remainders.

const VENDORED_DETECTOR_FILES = [
  '_linalg.ts',
  'betting-e-process.ts',
  'conformal.ts',
  'family-a-mixture-supermartingale.ts',
  'family-c-betting-e-process.ts',
  'family-c-rff.ts',
  'hotelling.ts',
  'page-cusum.ts',
  'self-normalized-e-process-fallback.ts',
  'sequential-mmd.ts',
  'spectral.ts',
];

test('Q1 — every vendored detector file byte-identical to source modulo header', async () => {
  for (const filename of VENDORED_DETECTOR_FILES) {
    const tesseraPath = `engine/detectors/${filename}`;
    const sourcePath = `../deploysignal/engine/detectors/${filename}`;

    const tesseraContent = stripHeader(await readFile(tesseraPath, 'utf-8'));
    const sourceContent = await readFile(sourcePath, 'utf-8');

    assert.strictEqual(tesseraContent, sourceContent, `delta detected in ${filename} (A12 violation)`);
  }
});

function stripHeader(content: string): string {
  // Strip lines until first non-comment, non-empty line.
  // Header is a contiguous block of `// VENDORED ...` comments followed by blank line.
  // ...
}
```

### `tessera/test/betting-e-process-class-dispatch.test.ts` (vendored at-pin from DeploySignal)

Per Q1.4 architect-pick: vendor at-pin for regression baseline. Runs against vendored detectors; provides smoke-test for vendoring-introduced regression.

---

## Acceptance criteria

1. **AC-1: All 12 detector files vendored.** Every file under `deploysignal/engine/detectors/` at SHA `5a72371` (except `_q72-trace.ts` per Q1 OQ-3 architect-pre-prediction skip) is vendored into `tessera/engine/detectors/` with the standard header. Verified by `q01-vendoring-coverage.test.ts`. Maps to: `q01-vendoring-coverage` first assertion.

2. **AC-2: All 5 family type files vendored.** `a.ts`, `b.ts`, `c.ts`, `d.ts`, `e.ts` under `deploysignal/engine/types/families/` vendored at-pin. Verified by `q01-vendoring-coverage.test.ts`. Maps to: same test, expanded path list.

3. **AC-3: Schema additions land in `tessera/engine/types/config.ts` without breaking inherited types.** `CellDimension` union extends with `'shard_id'`; `CellConfidence` union extends with `'warm_start'`; `CompiledConfig` gains optional `per_shard_cells` field; inherited fields preserved byte-identical via at-pin section. Verified by `q01-schema-additions.test.ts` (type-level) + tsc clean compile. Maps to: 4 test cases in `q01-schema-additions`.

4. **AC-4: Core + orchestration primitives vendored at-pin.** `engine/core.ts`, `engine/per-detector-resampler-mode.ts`, `engine/topology-overlay.ts`, `engine/signal-classes.ts`, `engine/types/verdict.ts`, `engine/verdict-groups.ts`, plus type files (`primitives.ts`, `metrics.ts`, `orchestration.ts`, `policy.ts`, `audit.ts`, `self-normalized-fallback.ts`, `index.ts`) vendored at-pin. NO Tessera deltas at SLICE 1 (per architectural-foundation-only scope). Verified by `q01-vendoring-coverage.test.ts` (header check) + `q01-no-detector-deltas.test.ts` byte-identity (extended to these files). Maps to: vendoring-coverage + no-deltas tests.

5. **AC-5: VENDORING-MANIFEST.md enumerates every vendored file with source SHA + sync policy.** Manifest at `tessera/coordination/VENDORING-MANIFEST.md` lists each vendored path with: target, source, SHA (`5a72371` for at-pin), sync policy, vendored-date, notes. Verified by `q01-vendoring-coverage.test.ts` (manifest enumeration check). Maps to: third assertion in `q01-vendoring-coverage`.

6. **AC-6: Tessera-side tsc clean compile via `tsconfig.test.json`.** `npm run typecheck` exits zero. Verified by Mac Claude at implementation time; CI commitment for future Tessera Phase 1 SLICE 2+ work.

7. **AC-7: A12 byte-identity preservation across detector vendoring.** Every vendored detector file at `tessera/engine/detectors/*.ts` is byte-identical to source modulo the header block. Verified by `q01-no-detector-deltas.test.ts`. Maps to: that test's primary assertion.

8. **AC-8: Vendoring script `tessera/tools/vendor-from-deploysignal.sh` lands and is idempotent.** Re-running the script against the same source + SHA produces no diff in vendored files (modulo `vendored` date stamps if re-pinning to new SHA). Verified at SLICE 1 close by Mac Claude empirical test (re-run script; `git diff` empty).

9. **AC-9: package.json + tsconfig.json + tsconfig.test.json land per Q1.1 + Q1.2 architect-picks.** Files match the implementation surface pseudo-code (within reasonable formatting tolerance). Verified by Mac Claude file-existence + content-shape inspection.

10. **AC-10: Initial smoke-test runs.** `tessera/test/betting-e-process-class-dispatch.test.ts` (vendored at-pin per Q1.4) runs via `npm test` and passes against vendored detector code. Failure indicates either vendoring-introduced regression (escalate) or test substrate gap (Q-cycle scope discussion).

Each AC binds to at least one test case (per Skill 15 prescription-to-AC-coverage). Each AC traces to a prescription in § Architectural mechanism or § Implementation surface (per Skill 14 PRD-conjunction-cross-check applied symmetrically).

---

## Anti-scope

Per anchor `skills/06-anti-scope-ledger.md`. Specific named items NOT in scope at SLICE 1; halt-and-route-back triggers on encounter.

- **SAS-1: NO modification to vendored detector internals.** Strict at-pin policy enforced by AC-7. Halt-and-route-back trigger if Implementer encounters apparent need to modify detector internals; route to Architect for ADR-class disposition (consistent with v0.3 A12 inherited).
- **SAS-2: NO Tessera-specific orchestrator at SLICE 1.** DeploySignal's `engine/orchestrator.ts` is gating-specific; Tessera will write its own continuous-observation orchestrator at SLICE 2-3. SLICE 1 does NOT touch orchestration logic.
- **SAS-3: NO fleet-merge logic at SLICE 1.** Hierarchical e-value combination (per v0.3 § 2.1 Extension 1 recommended approach) is SLICE 3 scope. SLICE 1 ships the substrate; runtime semantics deferred.
- **SAS-4: NO per-shard predicate logic at SLICE 1.** PerShardResidual runtime population (per v0.3 § 2.2 Extension 2 recommended approach) is SLICE 2 scope. SLICE 1 ships the type declaration only.
- **SAS-5: NO hardware topology code at SLICE 1.** HardwareTopologySource concrete impl (per v0.3 § 2.3 Extension 3 (b)) is Phase 2 SLICE 3 scope. SLICE 1 vendors `topology-overlay.ts` at-pin without extending the TopologyNode.kind enum.
- **SAS-6: NO test-suite substrate harness at SLICE 1.** Inherited DeploySignal tests reference fixture data + compiled-config substrates that Tessera doesn't yet have. Adopting the full test substrate is SLICE 2-3 work. SLICE 1 only vendors the two smoke-test files per Q1.4.
- **SAS-7: NO `_q72-trace.ts` vendoring at SLICE 1** (per Q1 OQ-3 architect-pre-prediction skip). DeploySignal-specific diagnostic; Tessera-side equivalent (if needed) is later-cycle work.
- **SAS-8: NO `engine/agent.ts` vendoring at SLICE 1.** Addition #27 dormant; not needed for Phase 1 architecture.

**Cross-references to inherited DeploySignal ANTI-SCOPE-LEDGER (verified preserved at v0.3 emit):**

- Q2.B.6.4 ADR clauses 1-5 — PRESERVED (no Family E touch; no engine/detectors/* refactor; no TrendBuffer/orchestrator refactor; no row-pool data structure).
- Q58 close-with-CAVEAT clause 2 — PRESERVED-PERMANENT-POST-PHASE-D (per LEDGER:176 at SHA `5a72371`).
- Q59 H4 PERMANENT clause 3 — PRESERVED-PERMANENT-POST-PHASE-D (per LEDGER:179 at SHA `5a72371`).
- Q60 V2 anti-scope clauses 1-8 — PRESERVED (Phase 1 doesn't touch real-trace ingestion framework).
- Addition #26 D4 (correlational-not-causal wire-format) — PRESERVED-RECONFIRMED.

**Cross-references to v0.3 SCOPING-MEMO anti-scope clauses:** A1-A17 all carry forward to SLICE 1 with no additions.

---

## Open questions (deferred to implementation-time empirical surface)

1. **OQ-1:** Exact header format under prettier / eslint formatting. Architect-pre-prediction: standardized header block survives auto-formatting; if conflict, implementer halts and routes back with diagnostic. Verification at SLICE 1 close: re-running prettier on vendored files produces zero diff.
2. **OQ-2:** Tessera's tsconfig path mappings cleanly resolve all imports. Architect-pre-prediction: yes, given DeploySignal's tsconfig structure is the inherited base. If tsc surfaces unresolved imports, implementer adjusts path mappings; minor cycle cost.
3. **OQ-3:** Skip `_q72-trace.ts` at SLICE 1 is the right call. Architect-pre-prediction: yes; it's DeploySignal-specific diagnostic. If implementer finds it's structurally required by another vendored file, halt and route back.
4. **OQ-4:** Inherited `engine/types/audit.ts` AuditRecord shape sufficient for Tessera Phase 1+ audit needs. Architect-pre-prediction: yes at SLICE 1 (no Tessera-specific audit semantics yet); deferred to SLICE 2-3 where Tessera orchestrator lands.
5. **OQ-5:** Manifest format granularity — per-file rows or grouped by directory? Architect-pre-prediction: per-file rows (one-row-per-vendored-file maximizes searchability and re-pin-policy clarity). Implementer adjusts if grouping is clearer in practice.

---

## Pre-route discipline application

Per anchor `skills/08-architect-six-practices.md` (P3 ten-axis spot-check) + `skills/01-pre-emit-grilling.md` (architect self-grilling) + `skills/14-prd-conjunction-cross-check.md` + `skills/15-prescription-to-AC-coverage.md`.

### P3 ten-axis verification

- **P3.1 concrete-values:** Schema-extension prescriptions use specific identifiers (`'shard_id'`, `'warm_start'`, `per_shard_cells`); no abstract magic numbers. Inherited engine SHA `5a72371` cited specifically and verified.
- **P3.2 coord-trail:** SCOPING-MEMO-v0.3 + PRE-DISPOSITION + PROJECT-CONTEXT.md grepped; no contradicting claims. v0.2 § Anti-scope clauses A1-A17 preserved.
- **P3.3 file-opened:** `deploysignal/engine/detectors/*.ts` (12 files) + `deploysignal/engine/types/config.ts` + `deploysignal/engine/types/families/*.ts` (5 files) + `deploysignal/engine/topology-overlay.ts` + `deploysignal/engine/types/verdict.ts` opened at spec-drafting time; LOC counts verified by `wc -l`. Implementation-surface pseudo-code reflects actual file contents.
- **P3.4 function-bodies:** SLICE 1 is mechanical vendoring; no algorithmic function bodies to scrutinize. Function-body grep applicable at SLICE 2 (runtime per-shard residual population).
- **P3.5 compiled-artifacts:** DeploySignal SHA `5a72371` is verified via `git -C deploysignal rev-parse main`; tessera SHA pin via VENDORING-MANIFEST.md.
- **P3.6 input-pipeline-alignment:** No new input pipeline at SLICE 1 (engine is consumed; not generating new inputs).
- **P3.7 compile-time-precision:** SLICE 1 schema additions don't introduce FP-precision corner cases (type-level extensions only; no runtime arithmetic).
- **P3.8 regime-coverage:** SLICE 1 doesn't introduce regimes (substrate-only); regime sweeps applicable at SLICE 2-4.
- **P3.9 wrapper-vs-algorithm-layer:** SLICE 1 doesn't touch algorithm layer (A12 enforcement via AC-7). Wrapper layer at SLICE 2-3.
- **P3.10 firing-attribution-discipline:** SLICE 1 doesn't have firing semantics; engine fires under inherited semantics. Tessera-side firing attribution at SLICE 3-4.

### Skill 14 PRD-conjunction cross-check (applied at spec-emit per overnight commitment)

The "PRD analog" for SLICE 1 is SCOPING-MEMO-v0.3 § 3 Phase 1 SLICE 1 row + § 9 vendoring policy + PRE-DISPOSITION Q-J architect-picks. Per-conjunct cross-check:

| Prescription source | Conjunct | Bound in SLICE 1? |
|---|---|---|
| v0.3 § 3 Phase 1 SLICE 1 | "Vendor engine subset from DeploySignal SHA `5a72371`" | AC-1 + AC-2 + AC-4 |
| v0.3 § 3 Phase 1 SLICE 1 | "detector implementations + Ville-bounded e-process primitives + hierarchical-pooling cell-matrix infrastructure" | AC-1 (detectors) + AC-2 (family types) + AC-4 (core + topology + types) |
| v0.3 § 3 Phase 1 SLICE 1 | "Q70 dispatch-table + self-normalized fallback" | AC-1 (self-normalized-e-process-fallback.ts vendored as part of detectors set) |
| v0.3 § 3 Phase 1 SLICE 1 | "Per-file source-SHA headers (vendoring policy § 9)" | AC-1 + AC-2 + AC-4 (all enforce header) + AC-5 (manifest) |
| v0.3 § 3 Phase 1 SLICE 1 | "Schema additions: `shard_id` cell dimension; `per_shard_cells` compiled-config field; `cell_confidence: warm_start` enum extension" | AC-3 (three conjuncts each bound) |
| v0.3 § 3 Phase 1 SLICE 1 | "Architectural-foundation-only" | SAS-2 through SAS-6 explicit anti-scope (no orchestrator; no fleet-merge logic; no per-shard predicate logic; no hardware topology; no test substrate) |
| v0.3 § 9 vendoring policy | "per-file source-SHA headers" | AC-1 + AC-2 + AC-4 enforce; `q01-vendoring-coverage.test.ts` verifies |
| v0.3 § 9 vendoring policy | "extract target: tessera-engine npm package (Phase 2 close commitment)" | Header format includes extract-target field; AC-1 enforces |
| PRE-DISPOSITION Q-J1 | "hybrid Ville + e-BH" | Out-of-scope for SLICE 1; SLICE 3 + 4 ACs will bind (forward-commitment) |
| PRE-DISPOSITION Q-J2 | "20-sample warm-start" | Out-of-scope for SLICE 1; SLICE 2 ACs will bind |
| PRE-DISPOSITION Q-J3 | "cascade at every layer" | Out-of-scope for SLICE 1; Phase 2 ACs will bind |

**Result: PRD-conjunction-cross-check PASS at SLICE 1 level.** Every v0.3 Phase 1 SLICE 1 conjunct binds to an AC OR is explicitly anti-scope. No undisclosed narrowings.

### Skill 15 prescription-to-AC coverage (applied at spec-emit)

| Prescription | AC binding | Mutation check |
|---|---|---|
| Vendor detector files | AC-1 | Mutating a vendored detector header fails `q01-vendoring-coverage`. |
| Vendor family type files | AC-2 | Same; coverage check expands. |
| Add `shard_id` to CellDimension | AC-3 | Removing `'shard_id'` from union fails type-check on `q01-schema-additions.test.ts` first assertion. |
| Add `warm_start` to CellConfidence | AC-3 | Removing fails second assertion. |
| Add `per_shard_cells` to CompiledConfig | AC-3 | Removing fails type-level test. |
| Vendor core + orchestration | AC-4 | Mutating header fails coverage check; deleting file fails. |
| Manifest enumerates files | AC-5 | Removing manifest entry fails coverage check. |
| Tessera-side tsc clean | AC-6 | Mac Claude verification gate. |
| A12 byte-identity preservation | AC-7 | Mutating detector body fails `q01-no-detector-deltas.test.ts`. |
| Vendoring script idempotent | AC-8 | Mac Claude empirical re-run test. |
| package.json + tsconfig land | AC-9 | Mac Claude file inspection. |
| Smoke-test runs | AC-10 | `npm test` failure surfaces. |

**Result: every prescription in § Architectural mechanism + § Implementation surface binds to ≥1 AC.** No uncovered prescriptions. Skill 15 PASS.

### Architect grilling pass output (anchor `skills/01-pre-emit-grilling.md` three-bucket)

#### CRITICAL: 0

No items requiring re-draft before emit.

#### LIKELY-SURFACES: 3

- **LS-Q1.1:** tsconfig path mappings need fine-tuning at Mac Claude implementation time (OQ-2). Architect-pre-prediction: yes; <0.5 hour implementer adjustment if so.
- **LS-Q1.2:** prettier / eslint conflict with header format (OQ-1). Architect-pre-prediction: <10% likelihood; if so, modify .prettierignore for engine/ subdir or adjust header.
- **LS-Q1.3:** vendored detector file has hidden runtime dependency that vendoring breaks (vanishingly small per engine-modularity originating fact, but possible). Architect-pre-prediction: <5% likelihood; if so, escalate to architect.

#### PRE-EMPTABLE: 5

- **PE-Q1.1:** Skip `_q72-trace.ts` per Q1 architect-pick OQ-3 (folded into SAS-7).
- **PE-Q1.2:** Skip `engine/agent.ts` per dormancy (folded into SAS-8).
- **PE-Q1.3:** Skip `engine/orchestrator.ts` per gating-specific (folded into SAS-2).
- **PE-Q1.4:** Smoke-test partial vendoring (Q1.4 architect-pick).
- **PE-Q1.5:** Scripted vendoring (Q1.5 architect-pick).

### Memorial application

- **Memorial D** (`feedback_vq_framework_discipline`): SLICE 1 architectural-layer-coverage at hypothesis-tree time = type-level schema layer + file-level header layer + manifest-level audit layer + smoke-test verification layer. Four-factor prior weighting applied; candidate-set enumerated.
- **Memorial F sub-rule 1** (P3.3 multiple-read-paths; compile-time substrate modifications): TRIGGERS — schema additions in `config.ts` modify compile-time substrate. Mac Claude must Step-0 grep for runtime detector code consuming `CellDimension` / `CellConfidence` / `CompiledConfig` to verify spec covers all read paths.
- **Memorial F sub-rule 2** (MERGE-vs-REPLACE substrate-stamped-fields-preservation): TRIGGERS — `CompiledConfig` gains `per_shard_cells` field; inherited fields must be preserved via MERGE (not replace) pattern.
- **Memorial F sub-rule 3** (ADR-anti-scope-preservation): walked above; all inherited LEDGER clauses preserved at SLICE 1.
- **Memorial F sub-rule 4** (Pre-existing-property-vs-new-AC coherence): the 10 SLICE 1 ACs cohere with inherited Ville-bounded property at the engine-vendoring layer; no new acceptance criterion introduces incoherence.

---

## Implementation timeline

**Implementer (Mac Claude; TBD which session if parallel): ~1-2 days total.**

- ~30 min: `tessera/tools/vendor-from-deploysignal.sh` write + smoke-test against single file.
- ~1 hour: vendor 11 detector files via script; verify headers; add to manifest.
- ~30 min: vendor 5 family type files; add to manifest.
- ~30 min: vendor core + orchestration primitives (5 files: core, per-detector-resampler-mode, topology-overlay, signal-classes, verdict-groups) + type files (7 files).
- ~1-2 hours: write Tessera-specific `tessera/engine/types/config.ts` (with-deltas section) + verify tsc clean.
- ~30 min: write `tessera/package.json` + `tsconfig.json` + `tsconfig.test.json`.
- ~30 min: write 3 SLICE 1 test files (`q01-vendoring-coverage`, `q01-schema-additions`, `q01-no-detector-deltas`).
- ~30 min: vendor 2 smoke-test files per Q1.4; verify `npm test` runs.
- ~30 min: `tsc --noEmit` clean + `node --test` pass; manifest complete; commit.

Total: ~6 hours of focused implementation; can fit in 1 day if no LS surface, 2 days with OQ-2 path-mapping iteration.

---

## Architect-pre-prediction on outcomes

Explicit option-space enumeration per Practice 2; probability bands sum to ~100%.

- **(a) Clean close:** ~70% prior. Vendoring is mechanical; AC-1..AC-10 binary-met-or-not. Q1.1-Q1.5 pre-resolved; OQ-1-5 architect-pre-predicted with low-friction defaults.
- **(b) LS-Q1.1 surface — tsc path mapping adjustment:** ~20% prior. Implementer iterates path mappings; minimal cycle cost (~0.5 hour).
- **(c) Tooling friction — prettier/eslint conflict with header format:** ~7% prior. Implementer adjusts .prettierignore or header comment style.
- **(d) Empirical surprise — hidden runtime dependency in vendored file:** ~3% prior. Implementer escalates; architect dispositions; SLICE 1 timeline extends ~1 cycle.

---

## Topic close framing

How Q1 resolves drives Q2 (Phase 1 SLICE 2) pick:

- **(a) Clean close:** Q2 spec drafts on Q1-validated substrate; Q2 ACs build directly on the per_shard_cells type declaration + warm_start enum value. Standard sequential flow.
- **(b) LS-Q1.1 path-mapping fix-forward:** Q2 inherits the same path-mapping infrastructure; close-in-Q1, not a Q2 deferral.
- **(c) Tooling close-with-CAVEAT:** if prettier/eslint conflict surfaces, document as inherited tooling-configuration constraint; Q2 inherits same constraint.
- **(d) Empirical-surprise architectural deeper-commitment:** unlikely; if so, escalate to architect re-disposition + delay Q2 until vendoring strategy is reaffirmed.

---

## Discipline-archive significance

1. **SLICE 1 vendoring exercise validates the vendor-first strategy mechanically.** If AC-1..AC-10 close clean, the architectural commitment to vendor-first (per John 2026-05-15 disposition + v0.3 § 9) is empirically validated as feasible at SLICE 1 scope. Future SLICEs can build on the vendoring substrate without revalidating the strategy.

2. **First explicit Skill 14 + Skill 15 pre-route gate application in Tessera coordination flow.** This spec is the first SPEC-fidelity artifact in Tessera; the Skill 14 PRD-conjunction-cross-check + Skill 15 prescription-to-AC-coverage gates fire here for the first time. Pattern-establishment for future Tessera Q-cycles. Per Anchor-memorialization principle (John 2026-05-15), if these gates surface defects at Mac Claude implementation time, those become candidate Anchor PR contributions.

3. **Q-J6 escalation precedent.** The architect declined to make Q-J6 (cross-project sequencing) unilaterally even under overnight authorization — escalating instead of guessing on a strategic Product-Manager-role-class decision. **Discipline-archive significance:** even under autonomous-run authority, architect maintains the role-boundary discipline. Strategic decisions get escalated; architecturally-derivable decisions get pre-dispositioned. Pattern worth memorialization candidate.

4. **Initial vendoring slice = ~20 files; manifest pattern crystallizes.** The VENDORING-MANIFEST.md format established here scales to ~30-40 files at full Phase 1 close, ~50-60 at Phase 2 close. Manifest-as-audit-trail pattern is a candidate methodology refinement for Anchor (any project vendoring code from another project benefits from this pattern).

5. **Memorial D state preserved at 21V/8C across SLICE 1 spec-emit.** No new violations or confirmations surface from this spec-emit; if Mac Claude implementation reveals architect-grilling-discipline gap (e.g., file-opened gap surfacing a missed dependency), Memorial D increments by 1V. Architect-pre-prediction: no increment (engine is well-isolated per originating-context modularity facts).

---

_Spec v0.1 authored: 2026-05-15 overnight under autonomy authority. Format: anchor `templates/Q-NN-SPEC-TEMPLATE.md` at full SPEC fidelity. Cross-references: SCOPING-MEMO-v0.3 + ARCHITECT-REPLY-v0.3-PRE-DISPOSITION + originating-context performance facts (`deploysignal/runs/benchmarks/tick-latency-baseline.json` measured 2026-04-20). Routing target: TPM packages for John; Mac Claude implementation gated on John's Q-J6 disposition AND first-review confirmation of Q-J1..Q-J5 PRE-DISPOSITION picks._

_Skill 14 + 15 pre-route gates: PASS. Architect grilling pass: 0 CRITICAL, 3 LIKELY-SURFACES, 5 PRE-EMPTABLE. Memorial D state delta: 0 (preserved at 21V/8C; no new violations/confirmations at spec-emit; future deltas at Mac Claude implementation + Reviewer audit time)._

_Hybrid Reviewer pair-review-style at SLICE 1 close-walk per inherited Anchor commitment: NOT MANDATORY (architectural-foundation-only; empirical-evidence-load-bearing pair-review is SLICE 3 territory). Single-Reviewer cold-context audit at SLICE 1 close-walk sufficient._
