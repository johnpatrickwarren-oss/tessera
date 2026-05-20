# DIAGNOSTIC-R61-cross-boundary-at-pin-imports.md

**Round:** R61 | **Role:** IMPLEMENTER | **Status:** HALT → ESCALATE

---

## Spec claim (exact quote)

> § 0.2 Approach A — Hidden assumptions: "The vendored-at-pin subset is self-consistent as a unit — no vendored-at-pin file imports from a vendored-with-deltas or Tessera-original file. **Verified at spec time via grep: all vendored-at-pin imports are internal to the vendored-at-pin subset.**"

> § 6.1 halt condition #7: "The package's `npm run build` produces tsc errors against the moved source: HALT + DIAGNOSTIC."

---

## Reality

The spec's hidden assumption is empirically FALSE. Multiple vendored-at-pin engine/* files (designated to move to `packages/deploysignal-engine/src/`) have direct import dependencies on `engine/types/verdict.ts` and `engine/types/config.ts` — both of which are **vendored-with-deltas and designated to STAY at tessera tree**.

### Affected at-pin files (imports from verdict.ts and/or config.ts):

| At-pin file (moves to package) | Import that fails | Source type |
|---|---|---|
| `engine/types/orchestration.ts` | `import type { Scenario } from './verdict'` | verdict.ts stays at tessera |
| `engine/types/orchestration.ts` | `import type { CompiledConfig } from './config'` | config.ts stays at tessera |
| `engine/types/policy.ts` | `import type { FusedVerdict, DetectorVerdict } from './verdict'` | verdict.ts stays at tessera |
| `engine/types/audit.ts` | `import type { VerdictGroupId, TopologyCandidate } from './verdict'` | verdict.ts stays at tessera |
| `engine/types/index.ts` | `export * from './verdict'` | verdict.ts stays at tessera |
| `engine/types/index.ts` | `export * from './config'` | config.ts stays at tessera |
| `engine/o0/lifecycle-events.ts` | `import type { AuditRecord, AuditRecordV2, CellKey, FamilyId, Verdict } from '../types'` | ../types resolves to types/index.ts → verdict.ts |
| `engine/o0/reversibility-translator.ts` | `import type { ... } from '../types'` | same chain |

### Consequence

When any of these 8 files is moved to `packages/deploysignal-engine/src/`, the package's `tsc -p packages/deploysignal-engine/tsconfig.json` will fail:
- `orchestration.ts` can't find `./verdict` (not in package)
- `policy.ts` can't find `./verdict`
- `audit.ts` can't find `./verdict`
- `types/index.ts` can't find `./verdict` or `./config`
- `lifecycle-events.ts` and `reversibility-translator.ts` fail transitively via `../types`

This makes **halt condition § 6.1 #7 fire before chore-A can be completed**.

### Root cause

In the original DeploySignal repo at SHA `5a72371`, ALL 33 files were co-located with `verdict.ts` and `config.ts` (all were at-pin). The spec's "no cross-category imports" claim would have been true in that context. However, Tessera's delta additions to `verdict.ts` (adding `cluster_event_id`, `TopologyNode.kind` union members, `TopologyEdge.relationship` union members across R18/R23/R53/R56) and `config.ts` (adding SLICE 1+4 deltas) made those files **vendored-with-deltas**, breaking the at-pin set's internal consistency.

---

## Empirical verification

```bash
# Verify the cross-boundary imports (run from tessera root):
grep -n "from '\./verdict\|from '\./config" \
  engine/types/orchestration.ts \
  engine/types/policy.ts \
  engine/types/audit.ts \
  engine/types/index.ts

grep -n "from '\.\./types" \
  engine/o0/lifecycle-events.ts \
  engine/o0/reversibility-translator.ts
```

---

## Resolution options

### Option A — Include DS-original `verdict.ts` + `config.ts` in the package

Add the **DS-original versions** (SHA `5a72371`, without Tessera deltas) of `verdict.ts` and `config.ts` to `packages/deploysignal-engine/src/types/`. This restores the package's self-consistency: all at-pin files can import from `./verdict` and `./config` within the package.

The tessera-side `engine/types/verdict.ts` and `engine/types/config.ts` (vendored-with-deltas) stay at tessera tree. They would need import rewrites:
- Their `from './primitives'` etc. imports (of moved at-pin types) → `from '@johnpatrickwarren-oss/deploysignal-engine'`
- Their extensions (`cluster_event_id`, `TopologyNode.kind` union additions, etc.) stay as tessera-specific deltas ON TOP of the base types

The package expands from 33 files to 35 files (33 + 2). Barrel has 35 `export *` lines. AC-R61-2 checks 35.

**Source for DS-original verdict.ts + config.ts:** Available at `~/concord/deploysignal/engine/types/verdict.ts` and `~/concord/deploysignal/engine/types/config.ts` IF the deploysignal sibling is at SHA `5a72371`. Operator must confirm availability.

**Trade-off:** Larger scope change; requires DS-side file access; tessera vendored-with-deltas files must be restructured to extend the package types. Package is semantically clean as "DS at SHA 5a72371". Future DS-side consumption (W3-1 deferred) would use identical types.

**Complexity:** HIGH — tessera's verdict.ts/config.ts delta architecture must be refactored to cleanly extend package base types.

---

### Option B — Reduce the at-pin set to exclude cross-boundary-dependent files

Do NOT move the 8 problematic at-pin files to the package. Move only the 25 at-pin files whose imports are fully self-contained within the at-pin set:

**Excluded from package (stay at tessera + get import rewrites):**
- `engine/types/orchestration.ts`
- `engine/types/policy.ts`
- `engine/types/audit.ts`
- `engine/types/index.ts`
- `engine/o0/lifecycle-events.ts`
- `engine/o0/reversibility-translator.ts`

(Note: `engine/types/agent.ts` and `engine/types/self-normalized-fallback.ts` need individual import verification — see empirical check below.)

**Package moves (25 confirmed-clean files):**
- All 11 detector files
- All 5 family type files
- `engine/core.ts`, `engine/per-detector-resampler-mode.ts`, `engine/topology-overlay.ts`, `engine/signal-classes.ts`
- `engine/types/primitives.ts`, `engine/types/metrics.ts`
- `engine/l0/schema-continuity.ts`
- `engine/o0/reversibility-source.ts`

(= 25 files; exact count to be verified empirically.)

The 8 excluded files stay at tessera tree and get import rewrites for any moved symbols they reference.

Barrel has 25 `export *` lines. AC-R61-2 checks 25 (not 33).

**Empirical verification for Option B:**
```bash
# Check self-contained agent.ts and self-normalized-fallback.ts:
grep -n "^import" engine/types/agent.ts engine/types/self-normalized-fallback.ts
# Check reversibility-source.ts:
grep -n "^import" engine/o0/reversibility-source.ts
```

**Trade-off:** Package is smaller but still self-consistent. DS-side consumption (W3-1 future) works for the reduced surface. The 8 excluded files at tessera do NOT benefit from the at-pin → package transition (they still have per-file SHA pins). Architecturally simpler; avoids delta restructuring. AC-R61-2 count changes from 33 to ~25.

**Complexity:** MEDIUM — fewer files to move; same import-rewrite scope; narrower package API surface.

---

### Option C — Modify content of cross-boundary-dependent at-pin files (violates A12)

When moving the 8 problematic files to the package, strip/replace the cross-boundary imports:
- `orchestration.ts`: stub out `Scenario` (use `any`) and replace `CompiledConfig` import
- `policy.ts`: stub out `FusedVerdict`, `DetectorVerdict`
- `audit.ts`: stub out `VerdictGroupId`, `TopologyCandidate`
- `types/index.ts`: remove `export * from './verdict'` and `export * from './config'`
- `lifecycle-events.ts`, `reversibility-translator.ts`: fix transitive dependencies

**Explicitly violates § 3.1 #1 (A12 anti-scope):** "The 33 moved files retain their 6-line vendoring header verbatim. SHA pin `5a72371` preserved. Content byte-identical to pre-move state."

This option requires **explicit operator override of A12** to proceed. The package would NOT be a verbatim copy of DS at SHA `5a72371` for the modified files.

**Trade-off:** All 33 files move; package compiles; but type surface is degraded (stubs instead of real types). DS-side consumption (W3-1 future) would receive weakened types. A12 violation is permanent in the package.

**Complexity:** HIGH — each modified file requires careful stub design to maintain type safety.

---

## Operator decision required

Select one of A / B / C. Include any sub-constraints:
- For **Option A**: confirm `~/concord/deploysignal/` is at SHA `5a72371` and accessible; confirm that the tessera-side delta architecture restructuring is acceptable scope for R61 or should be deferred.
- For **Option B**: confirm that the reduced at-pin set (25 files vs 33) is acceptable for AC-P8 / FR-D1 partial realization; confirm the 8 excluded files receiving only import-rewrites (not relocation) is an acceptable outcome.
- For **Option C**: confirm explicit A12 override; specify which stubs/replacements are acceptable.

---

## Halt compliance record

Per CLAUDE-IMPLEMENTER.md halt discipline:
- Halt triggers: halt condition (b) "spec/reality conflict cannot be resolved without changing the round's component inventory" AND § 6.1 #7 "package npm run build produces tsc errors."
- DIAGNOSTIC written: `coordination/diagnostics/DIAGNOSTIC-R61-cross-boundary-at-pin-imports.md`
- NEXT-ROLE.md updated: STATUS: ESCALATE
- MEMORIAL.md: VIOLATION entry appended (halt-discipline observed — HALT taken correctly per discipline).
- No implementation attempted (no chore-A commit).
