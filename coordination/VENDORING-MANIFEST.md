# Vendoring Manifest

_Authoritative record of files vendored from DeploySignal **and from anchor methodology canonical** into Tessera with source SHA + sync policy._
_DeploySignal engine files maintained by `tools/vendor-from-deploysignal.sh`. Anchor methodology files vendored manually per MR-1 (methodology round). Re-pin via `PINNED_SHA=<new-sha> ./tools/vendor-from-deploysignal.sh ...` per SCOPING-MEMO-v0.3 § 9 re-pinning policy (engine files); anchor methodology re-pin per operator decision (no automated script yet)._

---

## R90 extraction note (2026-05-21)

Phase 5 SLICE 3 round 1 (R90) extracted the engine to the `@johnpatrickwarren-oss/deploysignal-engine` npm package per `engine/package.json`. Layout: Option A — engine remains at `engine/`; standalone sub-package. Build artifact emitted to `engine/dist/` (root tsconfig.json `outDir` changed from `dist/engine` to `engine/dist`). Consumption migration (Tessera-internal in R91, DS-side in R92) is deferred to subsequent rounds. Per-row vendored-at-pin / vendored-with-deltas SHAs below are UNCHANGED by R90 (the extraction is structural; engine source content is byte-identical to round-start SHA `65edb85` — verified by AC-R90-14).

---

## R94 extraction note (2026-05-21)

Per Q-R94-SPEC.md, the engine subtree at Tessera SHA `9e24aa4` was extracted to its own dedicated repository (`github.com/johnpatrickwarren-oss/deploysignal-engine`) via `git filter-repo --subdirectory-filter engine` and tagged `v0.1.0-pre`. Tessera consumes the engine via git-dependency from R94 onward.

**Effect on this manifest:** per-file vendored-at-pin SHA rows below remain frozen as historical provenance (R42 + R89 archival-discipline). The rows describe Tessera's engine state AT-PIN to DeploySignal `5a72371`; the same content is mirrored in the new repo's filter-repo'd history at corresponding commits. Future re-pins (per Tessera close-walk discipline) update the new repo + this manifest in lockstep.

---

## R91 consumption-migration note (2026-05-21)

Phase 5 SLICE 3 round 2 (R91) dogfooded the `@johnpatrickwarren-oss/deploysignal-engine` package boundary by migrating Tessera's own `test/* + tools/* + test/_substrate/* + tools/calibrators/*` consumers (~50 files; 90 distinct relative imports) from `'../engine/...'` to `'@johnpatrickwarren-oss/deploysignal-engine/...'` package-path imports. Resolution mechanism: TypeScript `paths` mapping in `tsconfig.json` (for tsc compile-time) + `file:./engine` dependency in root `package.json` (for Node runtime via `node_modules/@johnpatrickwarren-oss/deploysignal-engine` symlink + exports map → `engine/dist/`). Pretest extended to `"tsc && tsc -p tsconfig.test.json"` to build `engine/dist/` before tests run. Per-row vendored-at-pin / vendored-with-deltas SHAs UNCHANGED by R91 (engine source content byte-identical to R90 close per AC-R91-13 + AC-R91-14; pnpm-workspace.yaml + .gitignore preserved per R82 intent). R92 (next round) repeats the same migration on the DS-side codebase.

---

## R95 defunct AC cleanup note (2026-05-22)

Phase 5 SLICE 4 hygiene round (R95) removed ~51 defunct test assertions that had been testing
Tessera's local `engine/` source files, which were deleted by R94 (engine extraction to the
`@johnpatrickwarren-oss/deploysignal-engine` git-dependency repo). The defunct ACs were
categorized as: Category A (historical vendoring/SHA-pin checks reading `engine/*.ts`);
Category B (R90 engine-package ACs reading `engine/package.json` + `engine/dist/`);
Category C (R91 config-state ACs verifying the pre-R94 `file:./engine` dep + paths mapping);
Category D (prior-round anti-scope diff ACs whose ALLOWED_SET didn't account for R94 MU commits).
Per-row vendored-at-pin / vendored-with-deltas SHAs below are UNCHANGED by R95.
Fail baseline restored from ~75 to ~27 (band [24, 30]).

---

## DeploySignal engine vendoring

| Target (tessera/) | Source (deploysignal/) | SHA | Sync policy | Vendored | Notes |
|---|---|---|---|---|---|
| engine/detectors/_linalg.ts | engine/detectors/_linalg.ts | 5a72371 | vendored-at-pin | 2026-05-16 | |
| engine/detectors/betting-e-process.ts | engine/detectors/betting-e-process.ts | 5a72371 | vendored-at-pin | 2026-05-16 | |
| engine/detectors/conformal.ts | engine/detectors/conformal.ts | 5a72371 | vendored-at-pin | 2026-05-16 | |
| engine/detectors/family-a-mixture-supermartingale.ts | engine/detectors/family-a-mixture-supermartingale.ts | 5a72371 | vendored-at-pin | 2026-05-16 | |
| engine/detectors/family-c-betting-e-process.ts | engine/detectors/family-c-betting-e-process.ts | 5a72371 | vendored-at-pin | 2026-05-16 | |
| engine/detectors/family-c-rff.ts | engine/detectors/family-c-rff.ts | 5a72371 | vendored-at-pin | 2026-05-16 | |
| engine/detectors/hotelling.ts | engine/detectors/hotelling.ts | 5a72371 | vendored-at-pin | 2026-05-16 | |
| engine/detectors/page-cusum.ts | engine/detectors/page-cusum.ts | 5a72371 | vendored-at-pin | 2026-05-16 | |
| engine/detectors/self-normalized-e-process-fallback.ts | engine/detectors/self-normalized-e-process-fallback.ts | 5a72371 | vendored-at-pin | 2026-05-16 | |
| engine/detectors/sequential-mmd.ts | engine/detectors/sequential-mmd.ts | 5a72371 | vendored-at-pin | 2026-05-16 | |
| engine/detectors/spectral.ts | engine/detectors/spectral.ts | 5a72371 | vendored-at-pin | 2026-05-16 | |
| engine/types/families/a.ts | engine/types/families/a.ts | 5a72371 | vendored-at-pin | 2026-05-16 | |
| engine/types/families/b.ts | engine/types/families/b.ts | 5a72371 | vendored-at-pin | 2026-05-16 | |
| engine/types/families/c.ts | engine/types/families/c.ts | 5a72371 | vendored-at-pin | 2026-05-16 | |
| engine/types/families/d.ts | engine/types/families/d.ts | 5a72371 | vendored-at-pin | 2026-05-16 | |
| engine/types/families/e.ts | engine/types/families/e.ts | 5a72371 | vendored-at-pin | 2026-05-16 | |
| engine/core.ts | engine/core.ts | 5a72371 | vendored-at-pin | 2026-05-16 | |
| engine/per-detector-resampler-mode.ts | engine/per-detector-resampler-mode.ts | 5a72371 | vendored-at-pin | 2026-05-16 | |
| engine/topology-overlay.ts | engine/topology-overlay.ts | 5a72371 | vendored-with-deltas | 2026-05-16 | R82 Phase 4 SLICE 3 deltas: lazy `require('node:crypto')` adapter replaces static top-level import; embedded pure-JS SHA-256 fallback (`pureJsSha256`) for browser-bundle path; `computeSnapshotHash` body calls `_sha256Hex` adapter. All 7 callers of `computeSnapshotHash` see unchanged sync surface. Reclassification: vendored-at-pin → vendored-with-deltas (2nd Tessera instance; 1st: verdict.ts at R18). |
| engine/signal-classes.ts | engine/signal-classes.ts | 5a72371 | vendored-at-pin | 2026-05-16 | |
| engine/verdict-groups.ts | engine/verdict-groups.ts | 5a72371 | vendored-with-deltas | 2026-05-17 | R20 Phase 2 SLICE 2.A deltas: VerdictGrouper.ingest opts.cluster_event_id; openByGroupKey tuple-keying; conditional group_id format; tuple-match late-arrival lookup. Additive per-call opts + additive internal keying (preserves Addition #25 D2 + D5; legacy mode unchanged when cluster_event_id absent). |
| engine/types/verdict.ts | engine/types/verdict.ts | 5a72371 | vendored-with-deltas | 2026-05-17 | R18 Phase 2 SLICE 1 deltas: VerdictGroup `cluster_event_id?: string` (Phase 2 outer-aggregator hook); TopologyNode.kind union extends with `\| 'gpu_shard' \| 'rack'`; TopologyEdge.relationship union extends with `\| 'contains'`. Additive optional field + additive union members (preserves Addition #25 D2/D5 + Addition #26 D4). R23 Phase 2 SLICE 3.A deltas: TopologyNode.kind union extends with `\| 'psu' \| 'cooling_zone'`; TopologyEdge.relationship union extends with `\| 'nvlink_peer'`. Additive union members; preserves Addition #25 D2/D5 + Addition #26 D4. R53 Phase 3 SLICE 1 deltas: TopologyNode.kind union extends with `\| 'trainium_chip' \| 'inferentia_chip'`; TopologyEdge.relationship union extends with `\| 'neuron_link_peer'`. Additive union members; preserves Addition #25 D2/D5 + Addition #26 D4. R56 Phase 3 SLICE 2 deltas: TopologyNode.kind union extends with `\| 'tpu_shard'`; TopologyEdge.relationship union extends with `\| 'tpu_ici_peer'`. Additive union members; preserves Addition #25 D2/D5 + Addition #26 D4. |
| engine/types/primitives.ts | engine/types/primitives.ts | 5a72371 | vendored-at-pin | 2026-05-16 | |
| engine/types/metrics.ts | engine/types/metrics.ts | 5a72371 | vendored-at-pin | 2026-05-16 | |
| engine/types/orchestration.ts | engine/types/orchestration.ts | 5a72371 | vendored-at-pin | 2026-05-16 | |
| engine/types/policy.ts | engine/types/policy.ts | 5a72371 | vendored-at-pin | 2026-05-16 | |
| engine/types/audit.ts | engine/types/audit.ts | 5a72371 | vendored-at-pin | 2026-05-16 | |
| engine/types/self-normalized-fallback.ts | engine/types/self-normalized-fallback.ts | 5a72371 | vendored-at-pin | 2026-05-16 | |
| engine/types/index.ts | engine/types/index.ts | 5a72371 | vendored-at-pin | 2026-05-16 | |
| engine/types/agent.ts | engine/types/agent.ts | 5a72371 | vendored-at-pin | 2026-05-16 | Compilation dependency for config.ts + index.ts; Addition #27 dormant at Phase 1 |
| engine/l0/schema-continuity.ts | engine/l0/schema-continuity.ts | 5a72371 | vendored-at-pin | 2026-05-16 | Compilation dependency for 7 detector files; L0 gating-layer infra |
| engine/types/config.ts | engine/types/config.ts | 5a72371 | vendored-with-deltas | 2026-05-16 | SLICE 1+SLICE 4 deltas (5 total): SLICE 1 (R01) deltas 1-4 — shard_id dimension + warm_start confidence + PerShardResidual/PerShardCell + per_shard_cells field. R34 delta 5 — CompiledConfig.freeze_hook_enabled?: boolean (Phase 2 SLICE 4 event-driven freeze hook activation flag). |
| engine/detectors/_q72-trace.ts | engine/detectors/_q72-trace.ts | 5a72371 | vendored-at-pin | 2026-05-16 | Compilation dependency for family-c-betting-e-process.ts; env-gated Q72 diagnostic (no-op in production) |
| engine/o0/lifecycle-events.ts | engine/o0/lifecycle-events.ts | 5a72371 | vendored-at-pin | 2026-05-16 | Compilation dependency for types/verdict.ts + types/orchestration.ts; O0 lifecycle type contracts |
| engine/o0/reversibility-source.ts | engine/o0/reversibility-source.ts | 5a72371 | vendored-at-pin | 2026-05-16 | Compilation dependency for types/orchestration.ts; O0 reversibility type contract |
| engine/o0/reversibility-translator.ts | engine/o0/reversibility-translator.ts | 5a72371 | vendored-at-pin | 2026-05-16 | Compilation dependency for types/verdict.ts; O0 reversibility action type |
| test/betting-e-process-class-dispatch.test.ts | test/betting-e-process-class-dispatch.test.ts | 5a72371 | vendored-at-pin | 2026-05-16 | Smoke test for Family C dispatch regression detection; vendored R01 per Q1.4 |
| test/ville-preservation-per-profile.test.ts | test/ville-preservation-per-profile.test.ts | 5a72371 | REMOVED-AT-R02 | 2026-05-16 | Removed at R02 per R01 MINOR-7 disposition: test shells to `tools/calibrate.js` which Tessera does not carry at SLICE 1/2a (SAS-6). Re-vendor decision deferred to SLICE 2b. |
| tools/curate-baseline-pipeline.ts | tools/curate-baseline-pipeline.ts | 5a72371 | vendored-at-pin | 2026-05-16 | Tessera SLICE 4 (R06) audit-emission orchestrator; imports from already-vendored engine/types/config.ts only |
| tools/calibrators/_shared.ts | tools/calibrators/_shared.ts | 5a72371 | vendored-at-pin | 2026-05-16 | Tessera SLICE 4 (R06) numerical primitives (mulberry32 / gaussian / choleskyLocal); compilation-dep leaf for family-c.ts |
| tools/calibrators/family-c.ts | tools/calibrators/family-c.ts | 5a72371 | vendored-at-pin | 2026-05-16 | Tessera SLICE 4 (R06) MCD/MRCD/Ledoit-Wolf calibrators; consumed by tools/curate-baseline-pre-pass.ts |

---

## Anchor methodology vendoring (MR-1 — 2026-05-18)

_Anchor canonical methodology files vendored verbatim to enable the Coordinator role + multi-cluster execution. Source: `~/concord/anchor/` at SHA pinned below. Re-pin per operator decision when anchor canonical evolves; refresh is mechanical (file-level copy + header re-write)._

| Target (tessera/) | Source (anchor/) | SHA | Sync policy | Vendored | Notes |
|---|---|---|---|---|---|
| CLAUDE-COORDINATOR.md | skills/12-coordinator-role.md | d27ac4e | vendored-with-deltas | 2026-05-18 | MR-1 vendoring. Adapted to per-role-file format (header + role-active-when + REINFORCEMENTS section); path-references rewritten to Tessera-local equivalents (see file's "Tessera path-reference adaptations" header table); migration-arbitration section preserved verbatim for canonical-PR backflow even though Tessera lacks a schema-migration surface. |
| templates/WAVE-PLAN-TEMPLATE.md | templates/WAVE-PLAN-TEMPLATE.md | d27ac4e | vendored-at-pin | 2026-05-18 | MR-1 vendoring. Verbatim copy; anchor-relative path references preserved (per `templates/README.md` Tessera-local pointer table). |
| templates/CLUSTER-HANDOFF-TEMPLATE.md | templates/CLUSTER-HANDOFF-TEMPLATE.md | d27ac4e | vendored-at-pin | 2026-05-18 | MR-1 vendoring. Verbatim copy. |
| templates/WAVE-GATE-TEMPLATE.md | templates/WAVE-GATE-TEMPLATE.md | d27ac4e | vendored-at-pin | 2026-05-18 | MR-1 vendoring. Verbatim copy. |
| templates/COORDINATOR-MEMORIAL-TEMPLATE.md | templates/COORDINATOR-MEMORIAL-TEMPLATE.md | d27ac4e | vendored-at-pin | 2026-05-18 | MR-1 vendoring. Verbatim copy. |
| templates/PROJECT-ROLES-TEMPLATE.md | templates/PROJECT-ROLES-TEMPLATE.md | d27ac4e | vendored-at-pin | 2026-05-18 | MR-1 vendoring. Verbatim copy. |
| templates/README.md | (none — Tessera-original) | n/a | tessera-original | 2026-05-18 | MR-1 vendoring. Tessera-local pointer table mapping anchor-relative references to project-root equivalents. |

**Why vendored:** The Mode 2 retrofit at commit `e84a7c8` brought across the multi-track scripts (`scripts/anchor-wave-init.sh`, `scripts/multi-track-cluster-setup.sh`, `scripts/multi-track-verify-wave-merge.sh`) but not the role-discipline file or templates the scripts reference. Result: plumbing without discipline; multi-track infrastructure was structurally unusable. MR-1 closes the gap so the Coordinator can produce wave plans against R24+ scope and the scripts can dispatch against them.

**Sync policy notes:** `vendored-at-pin` for the templates (verbatim copies; re-vendor via `cp` when anchor canonical updates). `vendored-with-deltas` for `CLAUDE-COORDINATOR.md` (header adaptation + path-reference rewrites for Tessera-local equivalents; the body is verbatim from anchor skill text below the header — preserved this way to enable canonical-PR backflow via unified diff against the anchor source).

---

## Verification log

Per `coordination/SCOPING-MEMO-v0.3.md` § 9 Re-pinning policy: "At every Tessera close-walk (Phase 1 close + Phase 2 close), architect verifies all per-file vendored headers against current DeploySignal main."

### 2026-05-17 — R15 Phase 1 close walk verification

**Method:** `grep -l "VENDORED FROM DeploySignal main@5a72371" <file>` per manifest row.

**Scope:** 41 manifest rows; 40 files currently on disk (1 row REMOVED-AT-R02 per disposition at manifest row 45).

**Result:**

| Target | SHA verified | Header present | Notes |
|---|---|---|---|
| engine/detectors/_linalg.ts | 5a72371 | YES | |
| engine/detectors/betting-e-process.ts | 5a72371 | YES | |
| engine/detectors/conformal.ts | 5a72371 | YES | |
| engine/detectors/family-a-mixture-supermartingale.ts | 5a72371 | YES | |
| engine/detectors/family-c-betting-e-process.ts | 5a72371 | YES | |
| engine/detectors/family-c-rff.ts | 5a72371 | YES | |
| engine/detectors/hotelling.ts | 5a72371 | YES | |
| engine/detectors/page-cusum.ts | 5a72371 | YES | |
| engine/detectors/self-normalized-e-process-fallback.ts | 5a72371 | YES | |
| engine/detectors/sequential-mmd.ts | 5a72371 | YES | |
| engine/detectors/spectral.ts | 5a72371 | YES | |
| engine/types/families/a.ts | 5a72371 | YES | |
| engine/types/families/b.ts | 5a72371 | YES | |
| engine/types/families/c.ts | 5a72371 | YES | |
| engine/types/families/d.ts | 5a72371 | YES | |
| engine/types/families/e.ts | 5a72371 | YES | |
| engine/core.ts | 5a72371 | YES | |
| engine/per-detector-resampler-mode.ts | 5a72371 | YES | |
| engine/topology-overlay.ts | 5a72371 | YES | |
| engine/signal-classes.ts | 5a72371 | YES | |
| engine/verdict-groups.ts | 5a72371 | YES | |
| engine/types/verdict.ts | 5a72371 | YES | |
| engine/types/primitives.ts | 5a72371 | YES | |
| engine/types/metrics.ts | 5a72371 | YES | |
| engine/types/orchestration.ts | 5a72371 | YES | |
| engine/types/policy.ts | 5a72371 | YES | |
| engine/types/audit.ts | 5a72371 | YES | |
| engine/types/self-normalized-fallback.ts | 5a72371 | YES | |
| engine/types/index.ts | 5a72371 | YES | |
| engine/types/agent.ts | 5a72371 | YES | |
| engine/l0/schema-continuity.ts | 5a72371 | YES | |
| engine/types/config.ts | 5a72371 | YES | |
| engine/detectors/_q72-trace.ts | 5a72371 | YES | |
| engine/o0/lifecycle-events.ts | 5a72371 | YES | |
| engine/o0/reversibility-source.ts | 5a72371 | YES | |
| engine/o0/reversibility-translator.ts | 5a72371 | YES | |
| test/betting-e-process-class-dispatch.test.ts | 5a72371 | YES | |
| test/ville-preservation-per-profile.test.ts | N/A | N/A | REMOVED-AT-R02 per R01 MINOR-7 disposition: test shells to `tools/calibrate.js` which Tessera does not carry at SLICE 1/2a. Re-vendor decision deferred to SLICE 2b / operator gate (OQ-1 / Q-JC1). |
| tools/curate-baseline-pipeline.ts | 5a72371 | YES | |
| tools/calibrators/_shared.ts | 5a72371 | YES | |
| tools/calibrators/family-c.ts | 5a72371 | YES | |

**Aggregate:**
- Headers verified at SHA `5a72371`: **40/40** files on-disk.
- REMOVED-AT-R02 (no on-disk file): 1 (`test/ville-preservation-per-profile.test.ts`).
- Drift surfaced: **no**.
- Re-pin disposition: deferred to operator gate (per R15 anti-scope at `NEXT-ROLE.md` :61; auto-re-pin forbidden).

**Idempotency of `tools/vendor-from-deploysignal.sh`:** carry-forward from R01 AC-8 close (idempotency tested at R01 close per Q-R01-SPEC; not re-run at R15 because re-running requires the DeploySignal sibling repository present at the expected path, which is outside R15 anti-scope per `NEXT-ROLE.md` :63 "no new production code").
