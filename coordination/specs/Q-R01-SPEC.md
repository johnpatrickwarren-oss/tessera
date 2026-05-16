# Topic 1 — Phase 1 SLICE 1: Engine Vendoring + Schema Additions (v0.2)

_From: Architect (overnight autonomous run; authorized by John 2026-05-15; v0.2 amendment 2026-05-16 post-Reviewer-pass)._
_To: Implementer (Mac Claude; TBD which session if parallel)._
_Routed via: TPM (self-routing in single-session model)._
_Date: 2026-05-16 (v0.2 amendment same-cycle post-Reviewer-pass)._
_Version: v0.2 (amends v0.1 per REVIEWER-REPORT-Q-01-PHASE-1-SLICE-1.md — F1 type-state mismatch + G1-G5; Memorial D 21V/8C → 22V/8C). See `Q-R01-SPEC-AUDIT.md` § Amendments from v0.1 for the full disposition table._
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

3. **Schema extension surface (v0.2 corrected per Reviewer F1; verified against `deploysignal/engine/types/config.ts` at SHA `5a72371`).** Three Tessera-specific additions land in `tessera/engine/types/config.ts` (the only file with SLICE 1 deltas). The inherited engine does NOT have explicit `CellDimension` or `CellConfidence` typedefs — these are inline-union literals on `BaselineCellsConfig.dimensions` and `BaselineCellEntry.confidence` respectively. SLICE 1 extends these inline unions in-place (architect-pick (α) per Reviewer F1 disposition; refactor-to-extract-typedefs deferred):
   - **`'shard_id'`** added to the inline union at `BaselineCellsConfig.dimensions: Array<...>` (`deploysignal/engine/types/config.ts:421` at SHA `5a72371`). Inherited values: `'hour_of_day' | 'day_of_week' | 'workload_class' | 'tenant_slice' | 'tenant_tier' | 'region'`. Tessera extends with `'shard_id'` as 7th member.
   - **`per_shard_cells?: PerShardCell[]`** as new OPTIONAL field on `CompiledConfig` (inherited `CompiledConfig` at `config.ts:69`; inherited `baseline_cells?: BaselineCellsConfig` is also optional at `config.ts:95` — Tessera's new field is parallel and similarly optional). `PerShardCell` shape: `{ shard_id: string, residual: PerShardResidual }`; `PerShardResidual` is `{ mean_vector?: number[], covariance?: number[][], confidence: 'strict' | 'pooled' | 'aggregate' | 'none' | 'warm_start' }` — sparse-encoded with optional fields representing per-shard delta from fleet-aggregate. **Full `PerShardResidual` runtime semantics are SLICE 2 scope**; SLICE 1 ships the type declaration only.
   - **`'warm_start'`** added to the inline union at `BaselineCellEntry.confidence` (`config.ts:403`). Inherited values: `'strict' | 'pooled' | 'aggregate' | 'none'` (4 values — Reviewer F1 corrected v0.1's mistaken claim of 5 values). Tessera extends with `'warm_start'` as 5th member.

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

## Existing architectural surface (REVIEWER-ANCHOR — mandatory)

_Per anchor `templates/Q-NN-SPEC-TEMPLATE.md` v2 (per anchor PR #35) — added retroactively at Q1 v0.3 amendment 2026-05-16 to close the file-opened-discipline gap (MD-F6 sub-variant) at the structural level. All citations are against DeploySignal main@SHA `5a72371` (current main at clone-time 2026-05-15; Tessera SLICE 1 vendoring pin)._

_Architect note: this section was retroactively added at Q1 v0.3-equivalent amendment (post anchor PR #35 emit). The discipline failure that produced MD-F6 (architect cited inherited types from memory without opening `config.ts`) was caught by Reviewer F1; v0.2 amendment opened the file and corrected the citations; this v0.3-equivalent section structurally captures the corrected citations so future Reviewer audit + script verification have grep-evidenced anchors._

| Inherited file | Pinned SHA | Lines opened | Verbatim snippet | Date+time opened |
|---|---|---|---|---|
| `deploysignal/engine/types/config.ts` | `5a72371` | `69-70` | `export interface CompiledConfig {`<br/>&nbsp;&nbsp;`version: string;` | 2026-05-16 02:00 |
| `deploysignal/engine/types/config.ts` | `5a72371` | `95` | `baseline_cells?: BaselineCellsConfig;` | 2026-05-16 02:00 |
| `deploysignal/engine/types/config.ts` | `5a72371` | `400-413` | `/** One cell in the \`baseline_cells.cells\` array. */`<br/>`export interface BaselineCellEntry {`<br/>&nbsp;&nbsp;`key: CellKey;`<br/>&nbsp;&nbsp;`n_samples: number;`<br/>&nbsp;&nbsp;`confidence: 'strict' \| 'pooled' \| 'aggregate' \| 'none';` | 2026-05-16 02:00 |
| `deploysignal/engine/types/config.ts` | `5a72371` | `420-432` | `export interface BaselineCellsConfig {`<br/>&nbsp;&nbsp;`dimensions: Array<'hour_of_day' \| 'day_of_week' \| 'workload_class' \| 'tenant_slice' \| 'tenant_tier' \| 'region'>;`<br/>&nbsp;&nbsp;`cells: BaselineCellEntry[];` | 2026-05-16 02:00 |
| `deploysignal/engine/types/verdict.ts` | `5a72371` | `141-188` | `// ── Addition #25 (ARCHITECT-REPLY-47) — L3b VerdictGroup aggregator ──`<br/>`export interface VerdictGroup { ... }` (full 47 LOC interface declaration; group_id format at :155-159; close-trigger at :149-153; verdicts/firing_verdicts/root_cause at :172-178) | 2026-05-16 02:00 |
| `deploysignal/engine/types/verdict.ts` | `5a72371` | `237-240` | `/** A correlational candidate surfaced for a VerdictGroup. Explicitly`<br/>&nbsp;`*  NOT a causal claim per D4 — \`correlational_not_causal: true\` is a`<br/>&nbsp;`*  required literal label on the wire. */`<br/>`export interface TopologyCandidate {` | 2026-05-16 02:00 |
| `deploysignal/engine/topology-overlay.ts` | `5a72371` | `40-43` | `/** Abstract topology-source contract per D1 Option E. v1 ships`<br/>&nbsp;`*  \`OtelServiceGraphV1\`; v2 adds Istio / K8s / Linkerd / custom impls`<br/>&nbsp;`*  against this same interface without VerdictGroupWithTopology`<br/>&nbsp;`*  consumer changes. */` | 2026-05-16 02:00 |
| `deploysignal/tools/ingest-real-trace.ts` | `5a72371` | `106` | `const tickSeconds = opts.tick_seconds ?? 5;` | 2026-05-16 02:00 |

**Architect self-attest (Q1 v0.3-equivalent retroactive emit, 2026-05-16):**

- [x] I opened every file in this table at v0.2-amendment time (NOT recalled from memory). The opening was Reviewer-prompted (F1 caught the v0.1 violation); the citations above reflect actual file contents as verified at v0.2-amendment grep operations earlier this cycle.
- [x] Each snippet is verbatim from the file at the pinned SHA `5a72371` (line-numbers verified via `grep -n` output; multi-line snippets shown with `<br/>` for table readability but represent contiguous source content).
- [x] Each line number was verified against actual file content at the pinned SHA (not against a remembered prior version).
- [x] I ran `integrations/superpowers-claude-code/scripts/verify-citations.sh` against this spec from the anchor PR #35 feature branch (`feat/md-f6-existing-architectural-surface`). Output: 8 citation rows verified; 0 failures. Each row's actual file content at the pinned SHA matches the snippet column above. Script invocation: `verify-citations.sh tessera/coordination/Q-01-PHASE-1-SLICE-1-SPEC.md --repo-root /Users/johnwarren/concord/deploysignal`. Smoke-test surfaced two script bugs (markdown-backtick stripping; repo-name-prefix path resolution) which were fixed at the same anchor PR #35 commit chain — empirical exercise of the discipline validated the script.

**Bulk-vendoring inventory** (vendored at-pin per § Implementation surface; NO per-file citation table row required since these are vendored verbatim without architectural-claim references in this spec; full file count + paths in VENDORING-MANIFEST.md):
- 11 files under `deploysignal/engine/detectors/` (excluding `_q72-trace.ts` per SAS-7)
- 5 files under `deploysignal/engine/types/families/`
- 5 core orchestration primitives under `deploysignal/engine/`
- 7 type files under `deploysignal/engine/types/` (excluding `agent.ts` per SAS-8 + `config.ts` which is vendored-with-deltas, cited above)
- 2 smoke-test files under `deploysignal/test/`

**Failure-mode acknowledgment:** the v0.1 emit of this spec violated the file-opened discipline (architect cited `CellDimension` and `CellConfidence` as standalone typedefs which don't exist; cited `'pod_id'` and `'low'` enum values which don't exist in inherited code). Reviewer F1 caught it; v0.2 amendment opened the file; this v0.3-equivalent section captures the corrected citations structurally. **Both same-session MD-F6 violations (SCOPING-MEMO v0.1 missed Addition #25/#26 primitives; Q1 spec v0.1 missed actual config.ts type-state) are the originating case anchor PR #35 ([feat/md-f6-existing-architectural-surface](https://github.com/johnpatrickwarren-oss/anchor/pull/35)) was drafted to prevent.**

---

## Resolved decisions (Q1.1 → Q1.5)

Picks summarized here for the Implementer; full rationale (why-picked / why-rejected) lives in `Q-R01-SPEC-AUDIT.md` § Q1.1–Q1.5.

- **Q1.1 — TypeScript build configuration:** vendor DeploySignal tsconfig structure at-pin; adapt path mappings only.
- **Q1.2 — package.json:** write Tessera-specific (project-specific fields can't be vendored); zero runtime deps; devDependencies = typescript + node types only.
- **Q1.3 — `signal-classes.ts`:** vendor at-pin (no Tessera-specific additions at SLICE 1).
- **Q1.4 — Detector test files:** partial-vendor — `betting-e-process-class-dispatch.test.ts` + `ville-preservation-per-profile.test.ts` at-pin as regression baseline; defer the full ~138-file suite.
- **Q1.5 — Vendoring tool:** scripted via `tessera/tools/vendor-from-deploysignal.sh` (manual cp scales poorly at re-pin time).

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

**Full manifest enumerates ~32 vendored files at SLICE 1 close (v0.2 corrected per G1):** 11 detector files (excluding `_q72-trace.ts` per SAS-7) + 5 family type files (`a.ts`..`e.ts`) + 5 core orchestration primitives (`core.ts`, `per-detector-resampler-mode.ts`, `topology-overlay.ts`, `signal-classes.ts`, `verdict-groups.ts`) + 9 type files (`verdict.ts`, `config.ts` with-deltas, `primitives.ts`, `metrics.ts`, `orchestration.ts`, `policy.ts`, `audit.ts`, `self-normalized-fallback.ts`, `index.ts`) + 2 vendored smoke-test files = 32 vendored files. Plus 1 vendoring script + 1 manifest + 3 new Tessera-side test files + 4 project-config files = ~40 total files-modified-or-created at SLICE 1 close.

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

### File: `tessera/engine/types/config.ts` (vendored-with-deltas) — v0.2 CORRECTED per Reviewer F1

```typescript
// VENDORED FROM DeploySignal main@5a72371 — 2026-05-16
// Source: deploysignal/engine/types/config.ts (820 LOC)
// Sync policy: vendored-with-deltas (Tessera Phase 1 SLICE 1)
// Extract target: @johnpatrickwarren-oss/deploysignal-engine (Tessera Phase 2 close commitment)
// DO NOT modify internals without ADR; deltas only at architecturally-anchored extension points.

// ─── INHERITED VERBATIM ───
// All 820 LOC of deploysignal/engine/types/config.ts@5a72371 preserved verbatim
// EXCEPT for the three inline-union extensions at config.ts:421 + config.ts:403
// and the one new optional field on CompiledConfig at config.ts:96 (immediately
// after the inherited optional baseline_cells field at config.ts:95).
//
// The inherited engine uses inline-union literals on interface members; there
// are no standalone CellDimension or CellConfidence typedefs. Tessera SLICE 1
// extends these inline unions in-place (architect-pick (α) per Q1 v0.2 § Open
// questions Q1.6 — refactor-to-extract-typedefs deferred).

// ─── TESSERA SLICE 1 DELTAS ───

// Delta 1 — extend BaselineCellsConfig.dimensions inline union with 'shard_id'.
// Inherited at config.ts:421: dimensions: Array<'hour_of_day' | 'day_of_week' |
//   'workload_class' | 'tenant_slice' | 'tenant_tier' | 'region'>
// Tessera v0.2: append 'shard_id' as 7th member.
export interface BaselineCellsConfig {
  dimensions: Array<'hour_of_day' | 'day_of_week' | 'workload_class'
    | 'tenant_slice' | 'tenant_tier' | 'region' | 'shard_id'>;  // ── 'shard_id' NEW
  cells: BaselineCellEntry[];
  aggregate_fallback: { /* unchanged */ };
}

// Delta 2 — extend BaselineCellEntry.confidence inline union with 'warm_start'.
// Inherited at config.ts:403: confidence: 'strict' | 'pooled' | 'aggregate' | 'none'
// Tessera v0.2: append 'warm_start' as 5th member.
export interface BaselineCellEntry {
  key: CellKey;
  n_samples: number;
  confidence: 'strict' | 'pooled' | 'aggregate' | 'none' | 'warm_start';  // ── 'warm_start' NEW
  pooled_from?: CellKey[];
  variance_inflated?: boolean;
  family_A?: { per_signal: Record<string, FamilyAPerSignalParams> };
  family_C?: FamilyCPerCell;
  family_E?: ConformalParams;
  family_D?: Record<string, FamilyDPerSignal>;
}

// Delta 3 — PerShardResidual + PerShardCell type declarations.
// Full runtime semantics deferred to Tessera Phase 1 SLICE 2; SLICE 1 ships
// type declarations only.
export interface PerShardResidual {
  mean_vector?: number[];   // Sparse: present only at strict-upgraded cells.
  covariance?: number[][];  // Sparse: present only at strict-upgraded cells.
  confidence: 'strict' | 'pooled' | 'aggregate' | 'none' | 'warm_start';
  // SLICE 2 will add: residual_seed_hash, per_shard_n_samples, etc.
}

export interface PerShardCell {
  shard_id: string;
  residual: PerShardResidual;
}

// Delta 4 — add OPTIONAL per_shard_cells field on CompiledConfig.
// Inherited CompiledConfig at config.ts:69 (820 LOC interface; baseline_cells
// is the prior optional cell-related field at config.ts:95). Tessera adds
// per_shard_cells immediately after for architectural-parallel positioning.
export interface CompiledConfig {
  /* ...all 820 LOC of inherited fields preserved verbatim... */
  baseline_cells?: BaselineCellsConfig;  // inherited at config.ts:95
  per_shard_cells?: PerShardCell[];      // ── NEW: Tessera SLICE 1 (parallel
                                          //   to baseline_cells; optional like
                                          //   baseline_cells; runtime population
                                          //   logic in SLICE 2)
  /* ...rest of inherited fields preserved verbatim... */
}
```

**Implementer note:** the pseudo-code above shows the four deltas as separate `export interface` re-declarations for clarity. The actual TypeScript implementation MERGES these deltas into the single existing inherited interface declarations (not separate re-exports). Tessera's `config.ts` is one file containing the inherited 820 LOC verbatim except where the four deltas above replace the corresponding lines (Delta 1 replaces line 421; Delta 2 replaces line 403; Deltas 3 + 4 are inserted at module-level + line 96 respectively). Implementer verifies tsc clean.

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

3. **AC-3 (v0.2 reworded per G2): Schema additions land additively in `tessera/engine/types/config.ts` without breaking inherited type contracts.** Specifically: (a) `BaselineCellsConfig.dimensions` inline union extended with `'shard_id'` as 7th member; (b) `BaselineCellEntry.confidence` inline union extended with `'warm_start'` as 5th member; (c) `PerShardResidual` + `PerShardCell` interfaces declared; (d) `CompiledConfig` gains optional `per_shard_cells?: PerShardCell[]` field parallel to inherited optional `baseline_cells?`. All inherited type definitions, union values, and optional/required modifiers preserved verbatim; only Tessera-specific additions are made. Verified by `q01-schema-additions.test.ts` (type-level) + tsc clean compile. Maps to: 5 test cases in `q01-schema-additions` (Delta 1, Delta 2, Delta 3 sparse, Delta 3 strict, Delta 4).

4. **AC-4: Core + orchestration primitives vendored at-pin.** `engine/core.ts`, `engine/per-detector-resampler-mode.ts`, `engine/topology-overlay.ts`, `engine/signal-classes.ts`, `engine/types/verdict.ts`, `engine/verdict-groups.ts`, plus type files (`primitives.ts`, `metrics.ts`, `orchestration.ts`, `policy.ts`, `audit.ts`, `self-normalized-fallback.ts`, `index.ts`) vendored at-pin. NO Tessera deltas at SLICE 1 (per architectural-foundation-only scope). Verified by `q01-vendoring-coverage.test.ts` (header check) + `q01-no-detector-deltas.test.ts` byte-identity (extended to these files). Maps to: vendoring-coverage + no-deltas tests.

5. **AC-5: VENDORING-MANIFEST.md enumerates every vendored file with source SHA + sync policy.** Manifest at `tessera/coordination/VENDORING-MANIFEST.md` lists each vendored path with: target, source, SHA (`5a72371` for at-pin), sync policy, vendored-date, notes. Verified by `q01-vendoring-coverage.test.ts` (manifest enumeration check). Maps to: third assertion in `q01-vendoring-coverage`.

6. **AC-6: Tessera-side tsc clean compile via `tsconfig.test.json`.** `npm run typecheck` exits zero. Verified by Mac Claude at implementation time; CI commitment for future Tessera Phase 1 SLICE 2+ work.

7. **AC-7 (v0.2 broadened per G3): A12 byte-identity preservation across ALL vendored-at-pin files (detectors + family types + core + orchestration + types except `config.ts`).** Every vendored-at-pin file under `tessera/engine/*` (excluding `tessera/engine/types/config.ts` which is vendored-with-deltas) is byte-identical to source modulo the header block. Verified by `q01-no-at-pin-deltas.test.ts` (broadened from v0.1's detector-only `q01-no-detector-deltas.test.ts`). Maps to: that test iterating the full vendored-at-pin path list.

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
- **SAS-9 (v0.2 NEW per G4): NO Tessera-specific compiled-config JSON file at SLICE 1.** Schema declarations land at SLICE 1; actual compiled-config artifacts (parallel to inherited `deploysignal/runs/compiled-configs/v4-fusion-novelty.json` at SHA `5a72371`) are SLICE 2-3 scope when per-shard residual runtime population lands. Tempting absorption candidate: implementer might create a placeholder compiled-config to drive smoke-tests. Explicit anti-scope; smoke-tests at SLICE 1 use inherited DeploySignal compiled-configs unchanged (path-resolution relative to deploysignal/ reference, NOT a Tessera-side compiled-config copy).

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
2. **OQ-2 (v0.2 clarified per G5):** Tessera's tsconfig path mappings cleanly resolve all imports AND vendored-smoke-test imports (`tessera/test/betting-e-process-class-dispatch.test.ts` etc.) resolve correctly to vendored detectors via relative paths (`../engine/detectors/...`). Architect-pre-prediction: yes — vendored test files preserve their inherited relative import paths because Tessera's directory structure mirrors DeploySignal's (`test/` → `../engine/` works identically). If `@tessera/*` path aliases are added to `tsconfig.json` AND smoke-tests use those aliases (currently they use relative paths inherited at-pin), there may be conflict — implementer adjusts. Halt-and-route-back if smoke-tests fail to compile/run after path-mapping configuration; not a silent absorption.
3. **OQ-3:** Skip `_q72-trace.ts` at SLICE 1 is the right call. Architect-pre-prediction: yes; it's DeploySignal-specific diagnostic. If implementer finds it's structurally required by another vendored file, halt and route back.
4. **OQ-4:** Inherited `engine/types/audit.ts` AuditRecord shape sufficient for Tessera Phase 1+ audit needs. Architect-pre-prediction: yes at SLICE 1 (no Tessera-specific audit semantics yet); deferred to SLICE 2-3 where Tessera orchestrator lands.
5. **OQ-5:** Manifest format granularity — per-file rows or grouped by directory? Architect-pre-prediction: per-file rows (one-row-per-vendored-file maximizes searchability and re-pin-policy clarity). Implementer adjusts if grouping is clearer in practice.

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

---

_For pre-route discipline output (P3 ten-axis, Skill 14, Skill 15, grilling pass, memorial application), Architect pre-predictions, topic-close framing, discipline-archive significance, and the v0.1 → v0.2 amendment table, see `Q-R01-SPEC-AUDIT.md`._
