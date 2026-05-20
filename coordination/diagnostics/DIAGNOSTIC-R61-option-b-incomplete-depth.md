# DIAGNOSTIC-R61-option-b-incomplete-depth.md

**Round:** R61 | **Role:** IMPLEMENTER | **Status:** HALT → ESCALATE (second halt)

---

## Context

The operator resolved the first HALT (DIAGNOSTIC-R61-cross-boundary-at-pin-imports.md) by selecting Option B: reduce the AT-PIN set to ~25 self-consistent files. The NEXT-ROLE.md resolution listed 6 specific files to keep at tessera and expected ~25-27 files to move to the package. This diagnostic reports that the Option B analysis was based on **incomplete empirical verification** — the original diagnostic checked only a subset of the at-pin files.

---

## Spec claim (from NEXT-ROLE.md operator resolution)

> "**Option B** — Reduce the AT-PIN set to the ~25 self-consistent files; the 6 problematic files stay at tessera tree and receive only import-rewrites (not relocation). AC-R61-2 count changes from 33 to ~25."

> "**Package moves (25 confirmed-clean files):**
> - All 11 detector files
> - All 5 family type files
> - engine/core.ts, engine/per-detector-resampler-mode.ts, engine/topology-overlay.ts, engine/signal-classes.ts
> - engine/types/primitives.ts, engine/types/metrics.ts
> - engine/l0/schema-continuity.ts
> - engine/o0/reversibility-source.ts"

---

## Reality

The "25 confirmed-clean files" list is **empirically incorrect**. Comprehensive import-tracing (performed at Implementer session entry) reveals that nearly all algorithm-implementation files in the list import from `'../types'` or `'./types'`, which resolves to `engine/types/index.ts` — excluded from the package because `index.ts` re-exports from `verdict.ts` and `config.ts` (vendored-with-deltas, stay at tessera).

### Files in the "25 confirmed-clean" list that are actually cross-boundary dependent:

| File | Import that fails | Why it fails |
|---|---|---|
| `engine/core.ts` | `import type { ..., Verdict, Scenario, ... } from './types'` | `./types` barrel exports from `verdict.ts` (stays at tessera) |
| `engine/topology-overlay.ts` | `import type { ..., VerdictGroup, TopologySnapshot, ... } from './types'` | `./types` barrel exports from `verdict.ts` (stays at tessera) |
| `engine/l0/schema-continuity.ts` | `import type { SchemaContinuityRecord } from '../types'` | `SchemaContinuityRecord` defined in `policy.ts` (stays at tessera); barrel includes it |
| `engine/detectors/betting-e-process.ts` | `from '../types'` (CompiledConfig, DetectorVerdict, SchemaContinuityRecord) | All defined in excluded files |
| `engine/detectors/family-c-betting-e-process.ts` | `from '../types'` (CompiledConfig, SchemaContinuityRecord) | Same |
| `engine/detectors/spectral.ts` | `from '../types'` (CompiledConfig, SchemaContinuityRecord) | Same |
| `engine/detectors/hotelling.ts` | `from '../types'` (CompiledConfig, SchemaContinuityRecord, TenantTier) | Same |
| `engine/detectors/page-cusum.ts` | `from '../types'` (CompiledConfig, SchemaContinuityRecord, TenantTier) | Same |
| `engine/detectors/conformal.ts` | `from '../types'` (CompiledConfig, SchemaContinuityRecord) | Same |
| `engine/detectors/sequential-mmd.ts` | `from '../types'` (CompiledConfig, SchemaContinuityRecord) | Same |

**Key type locations:**
- `CompiledConfig` — defined in `engine/types/config.ts` (vendored-with-deltas, stays at tessera)
- `DetectorVerdict`, `FusedVerdict`, `Verdict`, `Scenario`, `VerdictGroup`, `TopologySnapshot` — defined in `engine/types/verdict.ts` (vendored-with-deltas, stays at tessera)
- `SchemaContinuityRecord`, `DetectorVerdict`, `FpClassifierConfig`, `TenantTier`, `FusedVerdict` — defined in `engine/types/policy.ts` (excluded per first diagnostic, imports `./verdict`)

**Root cause:** The first diagnostic checked whether specific files imported directly from `verdict.ts` or `config.ts`. It correctly identified that `policy.ts`, `audit.ts`, `orchestration.ts`, `agent.ts`, `index.ts`, `lifecycle-events.ts`, `reversibility-translator.ts` have cross-boundary imports. But it **missed the indirect cross-boundary path**: the "11 detector files" + `core.ts` + `topology-overlay.ts` + `schema-continuity.ts` import from the `'../types'` / `'./types'` barrel, which includes all the excluded types. Moving any file that imports from `'../types'` creates the same package tsc failure.

### Empirical verification commands

```bash
# Confirm all detector algorithm files import from '../types':
grep -l "from '\.\./types'" engine/detectors/betting-e-process.ts \
  engine/detectors/family-c-betting-e-process.ts engine/detectors/spectral.ts \
  engine/detectors/hotelling.ts engine/detectors/page-cusum.ts \
  engine/detectors/conformal.ts engine/detectors/sequential-mmd.ts

# Confirm core.ts and topology-overlay.ts import from './types':
grep "from '\./types'" engine/core.ts engine/topology-overlay.ts

# Confirm schema-continuity.ts imports from '../types':
grep "from '\.\./types'" engine/l0/schema-continuity.ts
```

### The actual self-consistent set (~16 files)

Files with **no cross-boundary imports** (the package CAN be self-consistent with these only):

| # | File | Why safe |
|---|---|---|
| 1 | engine/types/primitives.ts | No imports |
| 2 | engine/types/self-normalized-fallback.ts | No imports |
| 3 | engine/types/families/b.ts | No imports (`export {}`) |
| 4 | engine/types/families/a.ts | → signal-classes (safe), self-normalized-fallback (safe) |
| 5 | engine/types/families/c.ts | → self-normalized-fallback (safe) |
| 6 | engine/types/families/d.ts | → self-normalized-fallback (safe) |
| 7 | engine/types/families/e.ts | → self-normalized-fallback (safe) |
| 8 | engine/types/metrics.ts | → families/a,c,d,e (safe), family-a-mixture-supermartingale (safe) |
| 9 | engine/signal-classes.ts | No imports |
| 10 | engine/per-detector-resampler-mode.ts | No imports |
| 11 | engine/detectors/_linalg.ts | No imports |
| 12 | engine/detectors/_q72-trace.ts | No imports |
| 13 | engine/detectors/family-a-mixture-supermartingale.ts | → types/families/a (safe) |
| 14 | engine/detectors/self-normalized-e-process-fallback.ts | → types/self-normalized-fallback (safe) |
| 15 | engine/detectors/family-c-rff.ts | No imports |
| 16 | engine/o0/reversibility-source.ts | No imports |

**Total: 16 files.** None of the primary detection algorithms (betting-e-process, page-cusum, hotelling, spectral, conformal, sequential-mmd, family-c-betting-e-process) or the engine core (core.ts, topology-overlay.ts) are in this set.

---

## Consequence

Option B as specified in NEXT-ROLE.md (move ~25 "confirmed-clean" files) cannot be executed because the "25 confirmed-clean" list is incorrect. The actual choices are:

1. A **~16-file type/utility package** (truly self-consistent; no detection algorithm implementations)
2. **Expand the package to include the with-deltas types** to make the algorithm files self-consistent (~41 files with Tessera-extended types)
3. **Wrapper approach** — no file moves; package re-exports from tessera-local engine files

---

## Resolution options

### Option C — Move the ~16 truly self-consistent files

Move only the 16 files listed above. Package is a "type definitions + utility helpers" package. No detection algorithm implementations included.

**Achieves:**
- AC-P8 partial realization for the type surface (the shared types are in the package)
- The 16 files no longer have per-file SHA pins; the package version pin replaces for them
- AC-R61-2 barrel count = 16

**Does NOT achieve:**
- FR-D1 primary goal: "engine extracted" — the detection algorithms stay at tessera
- Future DS-side consumption would get type definitions only, not the algorithms
- Tessera-side detection files (betting-e-process, etc.) still import from tessera-local engine files

**Complexity:** LOW — clean, correct, small blast radius.

---

### Option D — Include Tessera-extended with-deltas types in the package

Expand the package to include ALL 33 original at-pin files PLUS the 8 "excluded" at-pin files from the first diagnostic (orchestration.ts, policy.ts, audit.ts, index.ts, agent.ts, lifecycle-events.ts, reversibility-translator.ts, schema-continuity.ts) PLUS core.ts and topology-overlay.ts. The cross-boundary issue is resolved by also including `engine/types/verdict.ts` and `engine/types/config.ts` (vendored-with-deltas) in the package WITH their Tessera deltas intact.

**Result:** Package contains all 33 at-pin engine files + 2 vendored-with-deltas type files (verdict.ts + config.ts) = 35 files. The package is self-consistent. The barrel has 35 export-star lines. Tessera-tree keeps only the 3 vendored-with-deltas files (verdict.ts, config.ts, verdict-groups.ts) which get import-rewrite treatment.

**Wait — but verdict.ts and config.ts at tessera tree ARE the same files.** If they're in the package AND at tessera tree, Tessera-tree code would need to choose: import from the package or from the local files. This creates duplication.

**Alternative D-variant:** Move verdict.ts and config.ts to the package (treating them as "package source of truth"); tessera tree gets import-rewrite treatment (imports `from '@johnpatrickwarren-oss/deploysignal-engine'`). But these files are `vendored-with-deltas` — moving them means the package contains Tessera-specific extensions (the GPU/rack/tpu node kinds, cluster_event_id fields, freeze_hook_enabled, etc.). This violates the "DS engine at SHA 5a72371" framing but achieves self-consistency.

**Achieves:**
- Full FR-D1 realization: all algorithm files in the package
- Package with detection algorithms usable by future DS-side PR (but with Tessera's delta types)
- AC-R61-2 barrel count ~35 (or more)

**Does NOT achieve:**
- "Clean DS-engine package" semantic — package contains Tessera-specific schema extensions
- DS-side (W3-1 deferred) would consume Tessera's extended types

**Complexity:** HIGH — larger scope change than originally planned; verdict.ts delta architecture must be reconciled.

---

### Option E — Wrapper approach (no file moves)

Create the package scaffold without moving any files. The package's `src/index.ts` re-exports from tessera-local engine files using relative paths:

```typescript
// packages/deploysignal-engine/src/index.ts
export * from '../../../engine/core';
export * from '../../../engine/topology-overlay';
// etc.
```

No file moves; existing engine files stay at `engine/`. The package is a thin re-export wrapper.

**Achieves:**
- Package exists at `packages/deploysignal-engine/`
- Tessera-side code can import from `'@johnpatrickwarren-oss/deploysignal-engine'`
- Package consumption works locally via npm workspaces

**Does NOT achieve:**
- Vendoring-drift R-E6 structural elimination (files still at `engine/` with per-file SHA pins)
- Future DS-side standalone consumption (package imports from tessera-local paths — cannot work outside Tessera repo)
- FR-D1 "engine extracted" — no physical extraction

**Complexity:** LOW — no file moves; spec § 0.1 explicitly analyzed and rejected this as "Approach B" for not achieving AC-P8.

---

## Operator decision required

Select one of C / D / E:

- **Option C:** Accept the ~16-file type-only package as R61's deliverable; detection algorithms remain at tessera; FR-D1 partially realized; future round may revisit.
- **Option D:** Expand the package to include verdict.ts + config.ts (Tessera-extended); full algorithm surface achievable; package contains Tessera-specific schema extensions (not a pure "DS at SHA 5a72371" package); confirm A12 override for verdict.ts/config.ts content (they stay byte-identical as Tessera-extended files, not the DS-original).
- **Option E:** Use wrapper/re-export approach; no file moves; FR-D1 and AC-P8 NOT achieved; lowest implementation risk; defer real extraction to a future round with a pre-designed type-separation strategy.

For **Option C:** Confirm that ~16 type files is acceptable for R61; confirm AC-R61-2 count = 16.

For **Option D:** Confirm that the package containing Tessera-extended verdict.ts + config.ts is acceptable (package is "Tessera's engine surface" not "pure DS at SHA 5a72371"); confirm barrel count ~35; confirm that all `'../types'` / `'./types'` barrel imports in algorithm files will resolve to the package's new `src/types/index.ts` (which will include the full barrel including verdict/config).

For **Option E:** Confirm that no file moves and no vendoring-drift R-E6 elimination is acceptable for R61; confirm FR-D1 is out of scope this round.

---

## Halt compliance record

Per CLAUDE-IMPLEMENTER.md halt discipline:
- Halt triggers: halt condition (b) "spec/reality conflict cannot be resolved without changing the round's component inventory" — Option B's ~25 "confirmed-clean files" empirically requires ~17 files that import from the types barrel (`'../types'`/`'./types'`), making them not self-consistent.
- DIAGNOSTIC written: `coordination/diagnostics/DIAGNOSTIC-R61-option-b-incomplete-depth.md`
- NEXT-ROLE.md updated: STATUS: ESCALATE
- MEMORIAL.md: VIOLATION entry appended (second halt in R61 — Option B analysis was incorrect; halt discipline applied correctly at point-of-discovery).
- No chore-A commit exists. Implementation halted before any source changes were staged or committed.
