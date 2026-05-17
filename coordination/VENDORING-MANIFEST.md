# Vendoring Manifest

_Authoritative record of files vendored from DeploySignal into Tessera with source SHA + sync policy._
_Maintained by `tools/vendor-from-deploysignal.sh`. Re-pin via `PINNED_SHA=<new-sha> ./tools/vendor-from-deploysignal.sh ...` per SCOPING-MEMO-v0.3 § 9 re-pinning policy._

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
| engine/topology-overlay.ts | engine/topology-overlay.ts | 5a72371 | vendored-at-pin | 2026-05-16 | |
| engine/signal-classes.ts | engine/signal-classes.ts | 5a72371 | vendored-at-pin | 2026-05-16 | |
| engine/verdict-groups.ts | engine/verdict-groups.ts | 5a72371 | vendored-at-pin | 2026-05-16 | |
| engine/types/verdict.ts | engine/types/verdict.ts | 5a72371 | vendored-at-pin | 2026-05-16 | |
| engine/types/primitives.ts | engine/types/primitives.ts | 5a72371 | vendored-at-pin | 2026-05-16 | |
| engine/types/metrics.ts | engine/types/metrics.ts | 5a72371 | vendored-at-pin | 2026-05-16 | |
| engine/types/orchestration.ts | engine/types/orchestration.ts | 5a72371 | vendored-at-pin | 2026-05-16 | |
| engine/types/policy.ts | engine/types/policy.ts | 5a72371 | vendored-at-pin | 2026-05-16 | |
| engine/types/audit.ts | engine/types/audit.ts | 5a72371 | vendored-at-pin | 2026-05-16 | |
| engine/types/self-normalized-fallback.ts | engine/types/self-normalized-fallback.ts | 5a72371 | vendored-at-pin | 2026-05-16 | |
| engine/types/index.ts | engine/types/index.ts | 5a72371 | vendored-at-pin | 2026-05-16 | |
| engine/types/agent.ts | engine/types/agent.ts | 5a72371 | vendored-at-pin | 2026-05-16 | Compilation dependency for config.ts + index.ts; Addition #27 dormant at Phase 1 |
| engine/l0/schema-continuity.ts | engine/l0/schema-continuity.ts | 5a72371 | vendored-at-pin | 2026-05-16 | Compilation dependency for 7 detector files; L0 gating-layer infra |
| engine/types/config.ts | engine/types/config.ts | 5a72371 | vendored-with-deltas | 2026-05-16 | SLICE 1 deltas: shard_id dimension + warm_start confidence + PerShardResidual/PerShardCell + per_shard_cells field |
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
