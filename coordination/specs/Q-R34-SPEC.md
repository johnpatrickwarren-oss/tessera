# Q-R34-SPEC — Tessera Phase 2 SLICE 4 (WU-06): Event-conditional correlational attribution + freeze-hook coupling

**Round:** R34 (Wave 4, single cluster, full tier; main worktree).
**Architect:** Claude (Opus 4.7).
**Date:** 2026-05-18.
**Primary inputs read:** PRD.md (full); WU-06 scope block (`coordination/cluster-scopes/wave-4/wu-06-event-conditional-attribution.md`); 6 CLUSTER-HANDOFF-3-*-WU06 artifacts; WAVE-GATE-03; WAVE-PLAN-03; SCOPING-MEMO-v0.3 § 2.3 Extension 3 (c) + § 2.4 + § 4.2 R-S3/R-S5 + § 4.4 PR-F7; `engine/topology/common-mode-attribution.ts` (architectural pattern WU-06 extends); `engine/types/verdict.ts` (A16 type-declaration site); `engine/per-shard/{warm-start,runtime}.ts` + `engine/types/config.ts` (inherited Phase 1 per-shard substrate); `~/.claude/CROSS-PROJECT-MEMORIAL.md` (5 cross-project rules; Rule 5 NEW at R33 gate).
**Audit-sidecar:** `coordination/specs/Q-R34-SPEC-AUDIT.md` (P3 10-axis verification + decision rationale + Architect pre-predictions + brainstorm decision audit). Reviewer reads both files; Implementer reads only this file.

---

## 0. Preamble — overrides, premise corrections, baseline

### 0.1 OQ defaults applied

| OQ | Default | Applied | Rationale |
|---|---|---|---|
| OQ-W3-1 (event-feed file layout) | A — single-file `engine/events/event-feed.ts` | **A accepted** | Matches WU-00 + WU-04 single-file neighbor convention; YAGNI on producer-split. |
| OQ-W3-2 (freeze-hook coupling scope) | A — vendored-with-deltas on inherited Phase 1 substrate | **A REFINED** (combined wrapper + config-flag — see § 0.2) | Empirical-premise check (§ 0.2) revealed no pre-engineered freeze-hook substrate exists in inherited Phase 1 code; default A's literal application is impossible. The refined approach delivers the architectural intent of default A via two cooperating surfaces. |
| OQ-W3-3 (SCOPING-MEMO MAJOR-1 surgery timing) | B — defer to WU-07 close-walk | **B accepted** | Cleaner scope-bounding for WU-06; R34 does not touch SCOPING-MEMO. |
| OQ-W3-4 (event-feed schema closed-set vs extensible) | (Architect's call) | **Closed-set 5 event-classes** (firmware push, model redeploy, env change, config change, capacity change per SCOPING-MEMO § 2.3) | No Phase 2 driver for extensibility; YAGNI; closed-set is more discriminative under cold-Reviewer audit. Forward-extensibility absorbed by adding a literal union member at Phase 3+ (single-line vendored-with-deltas delta on event-feed.ts at that time). |

### 0.2 Empirical-premise correction (per R02 + R08 reinforcement)

The scope block (line 59) and WU-05 handoff (line 57) describe a "Phase 1 freeze-hook activation coupling" that requires "vendored-with-deltas check on inherited Phase 1 substrate (OQ-W3-2)" with the substrate "likely at `engine/baseline-cells.ts` or `engine/per-shard-residual.ts` (Architect verifies at session entry per empirical-premise-verification reinforcement — do NOT cite from memory)."

**Verified empirically at session entry, HEAD `e7547a0`:**

| Check | Command | Observed |
|---|---|---|
| `engine/baselines/` directory | `ls engine/baselines/` | does not exist |
| `engine/baseline*.ts` files | `ls engine/baseline*.ts` | no matches |
| `freeze_hook` / `freezeHook` / `freeze-hook` symbol in engine/ | `grep` over `engine/` | **zero hits in production code** (3 hits in `coordination/SCOPING-MEMO-v0.3.md`, `coordination/ARCHITECT-REPLY-v0.3-PRE-DISPOSITION.md`, `coordination/CLUSTER-HANDOFF-3-WU05-WU06.md`; all narrative only) |
| `freeze_hook_enabled` / `freezeHookEnabled` flag in engine/ | `grep` | zero hits |
| Per-shard substrate composition | `ls engine/per-shard/` | `warm-start.ts` + `runtime.ts` + `welford.ts` — all Tessera-original (no `VENDORED FROM` header; § 2.4 VENDORING-MANIFEST confirms not vendored). No freeze branch in `updatePerShardResidual`. |
| `updatePerShardResidual` production callers | `grep -rn updatePerShardResidual engine/` | only at its own definition site (`engine/per-shard/runtime.ts:82`); zero inherited-engine callers. Wrapper interception is complete for the current call surface. |

**Conclusion:** The premise "freeze-hook was pre-engineered into Phase 1 SLICE 2-3 baseline-cells substrate" is contradicted by the code. The aspirational symbol `freeze_hook_enabled` is referenced only in coordination/ narrative artifacts. WU-06 introduces the freeze-hook surface; there is nothing to "activate."

**This is not a halt condition** — it is a refinement of OQ-W3-2 default A. Default A's literal application ("vendored-with-deltas on existing freeze-hook substrate") is impossible; the architectural intent (give the Phase 1 substrate a freeze surface that Phase 2's event-feed can drive) is preserved by the combined approach in § 1.

### 0.3 Approach selection — D (wrapper + config-flag combo)

Per Superpowers Brainstorm (full enumeration in `Q-R34-SPEC-AUDIT.md` § 1):

| # | Approach | Verdict | One-line reason |
|---|---|---|---|
| A | Wrapper-only (new `engine/events/freeze-hook.ts`; no config delta) | rejected | Misses SCOPING-MEMO § 1.7 narrative ("Phase 1 ships with `freeze_hook_enabled: false`") — the inherited substrate needs a touchpoint for the activation flag, otherwise WU-07 Phase 2 close-walk ADR cannot stamp the activation transition cleanly. |
| B | Vendored-with-deltas on `engine/per-shard/runtime.ts` (modify `updatePerShardResidual` body) | **invalid** | Premise check: `runtime.ts` is Tessera-original (no `VENDORED FROM` header). Vendored-with-deltas does not apply to Tessera-original files; there are no inherited "deltas" to track. |
| C | Vendored-with-deltas on `engine/types/config.ts` only (add flag; no wrapper) | rejected | Pure plumbing; no execution surface. Flag with no consumer is decorative; the freeze logic still has to live somewhere. |
| D | **Combined: wrapper `engine/events/freeze-hook.ts` + config Delta 5 `freeze_hook_enabled?: boolean`** | **PICKED** | Wrapper provides freeze execution at the call-site boundary; config flag is the inherited-substrate touchpoint for Phase 1+2 activation semantics. Two-step vendored-with-deltas maintenance on config.ts (manifest + AT_PIN_FILES) is the established R18/R20 pattern; AT_PIN_FILES already excludes config.ts (vendored-with-deltas since R01), so config.ts delta count goes 4→5 with no AT_PIN_FILES list edit required. |
| E | Defer Surface 3 to Phase 3+ (drop freeze-hook from R34) | rejected | Violates round directive; scope block + WAVE-PLAN-03 + WAVE-GATE-03 mandate Surface 3 in R34. Not a unilateral Architect option. |

### 0.4 Attribution method — interrupted time series (ITS) primitive

Per PR-F7 trigger condition (SCOPING-MEMO § 4.4) literature anchors are CausalImpact (Brodersen 2015) / synthetic control (Abadie 2010) / ITS (Bernal 2017). **WU-06 implements ITS-class pre/post window comparison** as the load-bearing statistical primitive:

- CausalImpact (Bayesian structural time-series) is overweight for binary per-shard verdict streams (fire/no-fire) and requires a control series; impedance-mismatched at fleet scope.
- Synthetic control requires a donor pool of non-treated units; all fleet shards see the same event simultaneously, so the donor pool is empty by construction.
- ITS pre/post-window comparison maps directly to the 4-cell PR-F7 evidence matrix: pre-window per-shard firing rate vs post-window firing rate, classified per shard. Operates on `FiredShardEvent` lists (the WU-04 input shape) — no new ingestion machinery required at the attribution layer.

External literature citations remain all three (Brodersen / Abadie / Bernal) for completeness of the PR-F7 evidence package per WU-04→WU-06 handoff § "External literature citation evidence package."

### 0.5 Baseline at session entry (per WAVE-GATE-03 pre-flag; R25 MAJOR-1 reinforcement: verify empirically, do NOT cite cross-round)

| Metric | Observed at HEAD `e7547a0` | Pre-flag (Coordinator R33) | Match? |
|---|---|---|---|
| `node --test test/*.test.js` total | tests=305 | 305 | ✅ |
| pass | 299 | 299 | ✅ |
| fail | 6 | 6 | ✅ |
| `npx tsc -p tsconfig.test.json` exit | 0 | 0 | ✅ |

The 6 pre-existing fails are environmental + R32 forward-protection ACs failing on the post-chore-A diff window now that R33-prep commits have advanced HEAD. Per WAVE-GATE-03 pre-flag classification + R26-derived `false-compliance-attestation` rule: encode actual exit codes / counts verbatim; do NOT reframe as compliance. The R34 chore-A SHA will be downstream of `e7547a0`; R34 count ACs anchor to the chore-A SHA explicitly per R22 IMPL MINOR-1.

### 0.6 R26 MINOR-2 deferred impl alignment (carry-forward disposition)

R32 OBS-4 + WU-04→WU-06 handoff § Carry-forward: `engine/topology/common-mode-attribution.ts:65-72` docstring relaxed at R32; per-distinct-member-shard impl alignment for `earliest_event_ts`/`latest_event_ts` deferred to WU-06 consumer context **IF WU-06 ships a `FusedVerdict → FiredShardEvent` adapter site**.

**Decision: R26 MINOR-2 does NOT close at WU-06.** R34 event-conditional attribution operates on `FiredShardEvent` directly (mirroring the WU-04 input shape) and does not introduce the `FusedVerdict → FiredShardEvent` adapter — that adapter is a Phase 3+ orchestrator integration surface (analogous to inherited Addition #14 lifecycle wiring). The R26 MINOR-2 deferral therefore continues to WU-07 close-walk per the conditional clause in WU-04→WU-06 handoff § Carry-forward.

---

## 1. Mechanism

### 1.1 Architectural surfaces (4)

**Surface 1 — Event-feed substrate** (`engine/events/event-feed.ts`; Tessera-original; NEW)

Closed-set 5-event-class deployment-event stream. Producer-side contract: caller supplies a `ClusterEvent[]` list (sorted by `event_ts` asc; ties broken by `event_id` lex asc); Tessera consumes via an `EventFeed` interface mirroring inherited `flags`-input contract pattern (per `deploysignal/ARCHITECTURE.md` tick contract `{live, baseline, flags}`).

**Closed-set 5 event classes** (per SCOPING-MEMO § 2.3 enumeration):
- `firmware_push`
- `model_redeploy`
- `env_change`
- `config_change`
- `capacity_change`

`ClusterEvent.event_id` is the caller-supplied stable string used as `cluster_event_id` downstream (identity threading; no separate mapping table). `ClusterEvent.event_ts` is epoch seconds. Optional `ClusterEvent.event_window_end_ts` permits explicit-interval events (window-shaped); when absent, the event is point-shaped and the post-window calculation uses `event_ts + DEFAULT_POST_WINDOW_SECONDS`.

The substrate ships with one canonical synthetic implementation, `SyntheticEventFeed`, used in WU-06 tests and consumable by WU-07 close-walk fixtures. No live deployment-pipeline ingestion (A11).

**Surface 2 — Event-conditional correlational attribution layer** (`engine/events/event-conditional-attribution.ts`; Tessera-original; NEW)

Pure-function `attributeEventConditional(input): EventConditionalAttributionResult`. Mirrors `engine/topology/common-mode-attribution.ts` architectural pattern (pure-function transform; deterministic; sorted-by-deterministic-keys output; A16 wire-format invariant enforced as TypeScript literal-type at compile time AND regex-anchored at type-declaration site AND JSON-serialized round-trip at AC level).

ITS-class pre/post window comparison per cluster event:

1. Enumerate `(cluster_event, fired_shard_subset)` pairs by iterating event-feed × `FiredShardEvent[]`.
2. For each event window `[event_ts - pre_window_seconds, event_ts]` (pre) and `[event_ts, event_ts + post_window_seconds]` (post), count the fired shards whose `event_ts` falls inside each window.
3. Surface an `EventConditionalCandidate` when the post-window count over the pre-window count satisfies: post ≥ DEFAULT_MIN_POST_COUNT (default 2; singletons not candidates) AND post-pre ≥ DEFAULT_MIN_POST_MINUS_PRE_DELTA (default 1; observed elevation over pre-window baseline).
4. Cell 4 confounding-discrimination: each post-window fired shard is classified as event-correlated if its post-window `event_ts` falls within `correlation_window_seconds` (default 60s) of the cluster event's `event_ts`; otherwise classified as unrelated (latent-fault-revealed). The candidate's `member_shard_ids` list contains ONLY event-correlated shards; unrelated shards are excluded.
5. Output: list of `EventConditionalCandidate` sorted by `(event_ts asc, cluster_event_id lex asc)` for determinism.

**Surface 3 — Phase 1 freeze-hook activation coupling** (combined wrapper + config-flag; see § 0.2/0.3 for premise correction)

`engine/events/freeze-hook.ts` (Tessera-original; NEW) exposes:

```
freezeAwareUpdatePerShardResidual(
  current: PerShardResidual,
  obs: ExtendedSampleObservation,
  baselineCell: BaselineCellEntry | undefined,
  freezeState: FreezeHookState,
  config: { freeze_hook_enabled?: boolean }
): PerShardResidual
```

When `config.freeze_hook_enabled === true` AND `freezeState.active === true`: returns `current` (referential — same object reference, exact `n_samples`/`confidence`/`welford_state` preserved). Otherwise: delegates to `updatePerShardResidual(current, obs, baselineCell)` unmodified.

`engine/types/config.ts` receives **Delta 5**: `CompiledConfig.freeze_hook_enabled?: boolean` (optional; default-absent equivalent to `false`). Header inventory updated from 4 deltas → 5 deltas. VENDORING-MANIFEST.md row updated to reflect 5 deltas. AT_PIN_FILES list in `test/q01-no-at-pin-deltas.test.ts` requires no change (config.ts already excluded as vendored-with-deltas since R01 per file:9 + file:53 — see § 2.5).

`FreezeHookState` shape (lives in `freeze-hook.ts`):
```
interface FreezeHookState {
  active: boolean;
  until_ts?: number;
  cluster_event_id?: string;
}
```

The state is produced upstream by Surface 1 / Surface 2 callers; the wrapper is stateless. No production caller invocation path is introduced in R34; the wrapper is exercised by AC tests directly. Phase 1+2 currently has zero production callers of `updatePerShardResidual` (verified empirically — see § 0.2); Phase 3+ orchestrator integration will route through `freezeAwareUpdatePerShardResidual` (TAGGED-FUTURE).

**Surface 4 — PR-F7 4-cell evidence matrix** (`coordination/evidence/PR-F7-EVIDENCE.md`; NEW)

Empirical 4-cell evidence package + external literature citations. Each cell is a Reviewer-verified AC in `test/q34-event-conditional-attribution.test.ts` (per R32 MINOR-4 reinforcement: avoid the PR-F6 Cell-4-not-Reviewer-verified gap class). Citations: Brodersen et al. 2015 + Abadie et al. 2010 + Bernal et al. 2017; each with URL + retrieval date 2026-05-18 + verbatim quote ≥30 chars.

### 1.2 Wire-format invariant — A16 binding (HIGHEST RELEVANCE)

`EventConditionalCandidate.correlational_not_causal: true` is a TypeScript literal type AND a literal field value AND a regex-anchored declaration site AND a JSON-serialized round-trip-verified emission. WU-04 binding precedent (AC-R26-8 strictEqual + R32 AC-R32-15 /m-anchor regex) inherited at-least-equally rigorously.

| Binding site | WU-04 / R32 precedent | R34 binding |
|---|---|---|
| Type-declaration site (`engine/events/event-conditional-attribution.ts` declaration of `EventConditionalCandidate` interface) | Regex `/^\s*correlational_not_causal:\s*true\s*;/m` over file content | AC-R34-10 — same regex with `/m` anchor; matches the field declaration line |
| Wire-format / JSON-serialized origin | `strictEqual(JSON.parse(JSON.stringify(candidate)).correlational_not_causal, true)` | AC-R34-11 — same shape; runs over every emitted candidate from the 4 PR-F7 cells |
| Two-sided absence | (introduced at R34) | AC-R34-12 — `regex.test(/correlational_not_causal:\s*false/)` over `engine/events/*.ts` is `false` AND `content.includes('correlational_not_causal: false')` is `false`. Two assertions to satisfy Rule 5 strong-binding. |

### 1.3 Failure-mode enumeration (F-table for branch-binding coverage)

Per Rule 2 (architect-branch-binding-coverage) + R28 OBS-1 reinforcement. Each failure mode maps to an AC OR explicit acknowledged-gap rationale.

| F# | Branch / guard | File:line region | Binding AC | Rationale if not bound |
|---|---|---|---|---|
| F1 | `event_id ≡ cluster_event_id` threading (no mapping; identity) | event-conditional-attribution.ts post-impl line ~150 | AC-R34-3 | — |
| F2 | Empty event-feed → empty candidates list | event-conditional-attribution.ts early-return | AC-R34-9 | — |
| F3 | Empty `fired_events` → empty candidates list | event-conditional-attribution.ts early-return | AC-R34-9 (same shape) | — |
| F4 | Singleton post-window fire (count=1) excluded | aggregation filter | AC-R34-6 (Cell 3 negative specificity — single firing in post window does not surface) | — |
| F5 | Post-window count > pre-window count required (delta filter) | aggregation filter | AC-R34-4 (Cell 1) + AC-R34-5 (Cell 2: no event → no elevation → no candidate) | — |
| F6 | Per-shard correlation classification (within `correlation_window_seconds`) — Cell 4 confounding-discrimination | classification predicate | AC-R34-7 (Cell 4 — unrelated shard excluded from member_shard_ids) | — |
| F7 | `correlational_not_causal: true` literal preserved at emit site | candidate construction | AC-R34-10 + AC-R34-11 + AC-R34-12 (three-way binding) | — |
| F8 | Sort determinism — `(event_ts asc, cluster_event_id lex asc)` | output sort | AC-R34-4 (Cell 1 with two events ordered by event_ts) | — |
| F9 | Wrapper freeze branch — both flags true → no-op pass-through | freeze-hook.ts | AC-R34-13 | — |
| F10 | Wrapper delegate branch — config flag false → delegate even when freezeState active | freeze-hook.ts | AC-R34-14 | — |
| F11 | Wrapper delegate branch — freezeState inactive → delegate | freeze-hook.ts | AC-R34-15 | — |
| F12 | Wrapper — config flag absent equivalent to false | freeze-hook.ts | AC-R34-14 (same branch; absent === false) | — |
| F13 | `freeze_hook_enabled` field declared on CompiledConfig | engine/types/config.ts new field | AC-R34-16 | — |
| F14 | Closed-set 5 event-class union enforced at type level | engine/events/event-feed.ts | AC-R34-1 | — |
| F15 | SyntheticEventFeed returns events in caller-provided order | engine/events/event-feed.ts | AC-R34-2 | — |
| F16 | ITS pre/post window defaults + non-overlap | event-conditional-attribution.ts opts | AC-R34-8 | — |
| F17 | Anti-scope diff ⊆ ALLOWED_SET ∪ regex carve-outs | meta | AC-R34-19 | — |
| F18 | tsc exits 0 verbatim | meta | AC-R34-20 | — |
| F19 | test count baseline + R34 ACs encoded verbatim | meta | AC-R34-21 | — |
| F20 | VENDORING-MANIFEST.md row reflects 5 deltas | engine/types/config.ts manifest sync | AC-R34-18 | — |
| F21 | PR-F7 evidence package shape (≥3 citations × URL + date + verbatim quote ≥30 chars) | coordination/evidence/PR-F7-EVIDENCE.md | AC-R34-17 | — |

**Acknowledged gaps (no binding AC; non-load-bearing):**

- A21 (event_window_end_ts handling for interval-shaped events). The optional field is declared per § 1.1 but no AC exercises the interval-shaped path — point-shaped events (the common case) are exercised across AC-R34-4..7. Rationale: WU-06 ships point-shaped events as the spec'ied primary input; interval-shaped events are forward-extensibility for Phase 3+ event sources that emit start/end pairs. A missing AC here is a coverage acknowledgment, not a defect. Documented per R28 OBS-1 reinforcement.

---

## 2. Component inventory

### 2.1 Created (Tessera-original; NEW at R34)

| Path | LOC estimate | Purpose |
|---|---|---|
| `engine/events/event-feed.ts` | ~80 | ClusterEvent type (closed-set 5 classes) + EventFeed interface + SyntheticEventFeed impl + types re-exports |
| `engine/events/event-conditional-attribution.ts` | ~250 | attributeEventConditional pure function + EventConditionalCandidate type (`correlational_not_causal: true` literal) + EventConditionalAttributionInput/Result + ITS pre/post window primitives |
| `engine/events/freeze-hook.ts` | ~50 | freezeAwareUpdatePerShardResidual wrapper + FreezeHookState interface |
| `test/q34-event-conditional-attribution.test.ts` | ~600 | 21 R34 ACs (test() declarations); imports from engine/events/* + engine/types/config.ts + engine/per-shard/runtime.ts; reads evidence/PR-F7-EVIDENCE.md for AC-R34-17 |
| `test/_substrate/v9Z-event-cluster.ts` | ~150 | Tessera-original event-cluster substrate extending v9Y topology with event-feed fixtures + 4-cell scripted timelines |
| `coordination/evidence/PR-F7-EVIDENCE.md` | ~120 | PR-F7 4-cell evidence package + 3+ external literature citations (Brodersen / Abadie / Bernal) with URLs + retrieval dates + verbatim quotes |
| `coordination/specs/Q-R34-SPEC.md` | (this file) | The spec |
| `coordination/specs/Q-R34-SPEC-AUDIT.md` | (sidecar) | P3 10-axis + decision rationale + Brainstorm decision audit + Architect pre-predictions |

### 2.2 Changed (vendored-with-deltas; pre-existing inherited file)

| Path | Delta | Maintenance |
|---|---|---|
| `engine/types/config.ts` | **Delta 5 (NEW at R34): `CompiledConfig.freeze_hook_enabled?: boolean` (optional; default-absent ≡ false).** Inline addition adjacent to existing `per_shard_cells?: PerShardCell[]` field. Header inventory updated from "4 changes" → "5 changes" with Delta 5 line added. | Two-step pattern UPFRONT: (a) `coordination/VENDORING-MANIFEST.md` row updated to reflect 5 deltas (text edit only — see § 2.4); (b) `test/q01-no-at-pin-deltas.test.ts` AT_PIN_FILES list requires NO change because config.ts is already excluded as vendored-with-deltas (file:9 + file:53; verified at session entry). |
| `coordination/VENDORING-MANIFEST.md` | Row for `engine/types/config.ts` notes column extended to include Delta 5 wording. | Same commit as config.ts; landed in chore-A. |

### 2.3 Changed (coordination/routing — non-engine; mandatory chore-A artifacts)

| Path | Change |
|---|---|
| `coordination/NEXT-ROLE.md` | Architect routing block: CURRENT-ROUND R34, NEXT-ROLE IMPLEMENTER, STATUS READY, Inputs Q-R34-SPEC.md (+ Q-R34-SPEC-AUDIT.md). |
| `coordination/MEMORIAL.md` | Architect CONFIRMATION lines per Architect role boundary § Append after Architect role completes. |
| `test/q01-no-at-pin-deltas.test.ts` | NO change required (config.ts already excluded; verified at session entry). |

### 2.4 Anti-scope reverse — files NOT modified at R34 (READ-ONLY)

Reinforces the headline anti-scope clauses (§ 5):

- All Wave 1+2+3 deliverables: `engine/l0/counter-rate-transform.ts` (R25); `engine/topology/{common-mode-attribution,slurm-source,k8s-source,nvlink-source}.ts` (R26/R28/R29/R30).
- All inherited vendored-at-pin engine internals: `engine/topology-overlay.ts`, `engine/core.ts`, `engine/hardware-topology-source.ts` (R23), every file under `engine/detectors/`, `engine/types/families/`, `engine/types/{primitives,metrics,policy,orchestration,audit,agent,self-normalized-fallback,index}.ts`.
- `engine/types/verdict.ts` (vendored-with-deltas across R18+R20+R23; not modified at R34).
- `engine/verdict-groups.ts` (vendored-with-deltas at R20; not modified at R34).
- `engine/fleet/verdict-consumer.ts` (R21; not modified at R34).
- `engine/per-shard/{warm-start,runtime,welford}.ts` (Tessera-original; not modified at R34 — § 0.3 Approach B rejected explicitly).
- All v9X/v9Y substrates (R18/R23 frozen).
- All pre-R34 test files (q01..q32, q-md-f4-common-mode-injection, betting-e-process-class-dispatch).
- `coordination/SCOPING-MEMO-v0.3.md` (R32 MAJOR-1 surgery deferred to WU-07 per OQ-W3-3 = B).
- `coordination/PRD.md`.
- `multi-track-cluster-setup.sh` and all `scripts/*` (operator-owned methodology backflow).
- `CLAUDE-IMPLEMENTER.md` (MR-2 consolidation staged for Phase 2 close per `coordination/STAGED-FOR-PHASE-2-CLOSE.md` Item 1).

### 2.5 .gitignore-aware spec inventory (per R23 ARCH MINOR-2 reinforcement)

Every path listed in § 2.1, § 2.2, § 2.3, and § 5 ALLOWED_SET is git-trackable: none match `.gitignore` patterns (verified via the absence of `.gitignore` patterns matching `engine/events/`, `test/q34-`, `test/_substrate/v9Z-`, `coordination/evidence/PR-F7-`, or `coordination/specs/Q-R34-`). Compiled `.js` outputs are gitignored and explicitly **not listed** in the allowed-set per R23 MINOR-2 lesson reinforced at R23 (`.gitignore`-aware spec inventories).

---

## 3. Per-file pseudocode

### 3.1 `engine/events/event-feed.ts`

```ts
// engine/events/event-feed.ts — Tessera Phase 2 SLICE 4 (R34) WU-06 Surface 1.
//
// Closed-set 5-event-class deployment-event substrate. Producer-side contract:
// caller supplies a ClusterEvent list; EventFeed.fetchSince(ts) returns the
// subset whose event_ts > ts. Mirrors inherited `flags`-input pattern at
// cluster-event scope.
//
// Tessera-original code (NOT vendored). Extract target: Tessera Phase 2 close.

export type ClusterEventKind =
  | 'firmware_push'
  | 'model_redeploy'
  | 'env_change'
  | 'config_change'
  | 'capacity_change';

export interface ClusterEvent {
  /** Caller-supplied stable identifier; used as cluster_event_id downstream
   *  (identity threading; no separate mapping). */
  event_id: string;
  /** Closed-set 5 event classes; see ClusterEventKind. */
  kind: ClusterEventKind;
  /** Epoch seconds when the event occurred (point-shaped) or began
   *  (interval-shaped; event_window_end_ts populated). */
  event_ts: number;
  /** Optional; interval-shaped events set this to the end of the event
   *  window. Absent → point-shaped event. */
  event_window_end_ts?: number;
  /** Optional caller-supplied metadata; not used by attribution logic. */
  metadata?: Record<string, string>;
}

export interface EventFeed {
  /** Returns the subset of events with event_ts > since_ts, sorted asc by
   *  (event_ts, event_id). Returns [] when no events match. */
  fetchSince(since_ts: number): readonly ClusterEvent[];
}

export class SyntheticEventFeed implements EventFeed {
  private readonly events: readonly ClusterEvent[];

  constructor(events: readonly ClusterEvent[]) {
    // Defensive copy + canonical sort (event_ts asc; event_id lex asc on tie).
    // Caller may supply events in any order; canonical sort is the public contract.
    const copy = [...events];
    copy.sort((a, b) => {
      if (a.event_ts !== b.event_ts) return a.event_ts - b.event_ts;
      return a.event_id < b.event_id ? -1 : a.event_id > b.event_id ? 1 : 0;
    });
    this.events = copy;
  }

  fetchSince(since_ts: number): readonly ClusterEvent[] {
    return this.events.filter((e) => e.event_ts > since_ts);
  }
}
```

### 3.2 `engine/events/event-conditional-attribution.ts`

```ts
// engine/events/event-conditional-attribution.ts — Tessera Phase 2 SLICE 4 (R34) WU-06 Surface 2.
//
// Event-conditional correlational attribution layer (MD-F5; PR-F7 trigger).
// ITS-class pre/post window comparison per cluster event; mirrors WU-04
// common-mode-attribution.ts architectural pattern (pure function; deterministic;
// sorted output; A16 wire-format invariant enforced as TS literal-type +
// regex-anchored declaration + JSON round-trip).
//
// Tessera-original code. Extract target: Tessera Phase 2 close.

import type { FiredShardEvent } from '../topology/common-mode-attribution';
import type { ClusterEvent } from './event-feed';

// ── Public types ─────────────────────────────────────────────────────

export interface EventConditionalCandidate {
  /** The triggering ClusterEvent.event_id. Threaded through as
   *  cluster_event_id downstream. */
  cluster_event_id: string;
  cluster_event_kind: ClusterEvent['kind'];
  /** Event timestamp from ClusterEvent.event_ts. */
  event_ts: number;
  /** Distinct shard ids whose post-window event_ts falls within
   *  correlation_window_seconds of cluster_event.event_ts. Sorted lex asc.
   *  Excludes unrelated post-window fires (Cell 4 confounding-discrimination). */
  member_shard_ids: readonly string[];
  /** Cached length of member_shard_ids. */
  member_count: number;
  /** Count of fired shards within the pre-window. ITS baseline. */
  pre_window_count: number;
  /** Count of fired shards within the post-window correlated with this event
   *  (== member_count by construction). ITS post measurement. */
  post_window_count: number;
  /** Literal `true` per inherited Addition #26 D4. Forces audit
   *  consumers to acknowledge the non-causal labeling in type contracts.
   *  NOT a boolean — the literal-type prevents any code path from
   *  setting this to `false`. */
  correlational_not_causal: true;
}

export interface EventConditionalAttributionOpts {
  /** ITS pre-window length in seconds. Default 300 (5 min). */
  pre_window_seconds?: number;
  /** ITS post-window length in seconds. Default 300 (5 min). */
  post_window_seconds?: number;
  /** Per-shard event-correlation window in seconds (Cell 4 discriminator).
   *  Default 60. A post-window fired shard is event-correlated when
   *  |shard.event_ts - cluster_event.event_ts| <= correlation_window_seconds. */
  correlation_window_seconds?: number;
  /** Min post-window correlated count required to surface a candidate.
   *  Default 2 (singletons not common-mode). */
  min_post_count?: number;
  /** Min (post - pre) elevation required to surface a candidate.
   *  Default 1 (observed elevation over pre-window baseline). */
  min_post_minus_pre_delta?: number;
  /** Injected clock for deterministic tests. */
  now?: () => number;
}

export interface EventConditionalAttributionInput {
  fired_events: readonly FiredShardEvent[];
  cluster_events: readonly ClusterEvent[];
  opts?: EventConditionalAttributionOpts;
}

export interface EventConditionalAttributionResult {
  candidates: readonly EventConditionalCandidate[];
  attributed_at_ts: number;
}

// ── Module constants ─────────────────────────────────────────────────

export const DEFAULT_PRE_WINDOW_SECONDS = 300;
export const DEFAULT_POST_WINDOW_SECONDS = 300;
export const DEFAULT_CORRELATION_WINDOW_SECONDS = 60;
export const DEFAULT_MIN_POST_COUNT = 2;
export const DEFAULT_MIN_POST_MINUS_PRE_DELTA = 1;

// ── Public function ──────────────────────────────────────────────────

export function attributeEventConditional(
  input: EventConditionalAttributionInput,
): EventConditionalAttributionResult {
  const { fired_events, cluster_events } = input;
  const opts = input.opts ?? {};
  const preWindow = opts.pre_window_seconds ?? DEFAULT_PRE_WINDOW_SECONDS;
  const postWindow = opts.post_window_seconds ?? DEFAULT_POST_WINDOW_SECONDS;
  const correlationWindow = opts.correlation_window_seconds ?? DEFAULT_CORRELATION_WINDOW_SECONDS;
  const minPostCount = opts.min_post_count ?? DEFAULT_MIN_POST_COUNT;
  const minDelta = opts.min_post_minus_pre_delta ?? DEFAULT_MIN_POST_MINUS_PRE_DELTA;
  const now = opts.now ?? (() => Math.floor(Date.now() / 1000));

  const candidates: EventConditionalCandidate[] = [];

  for (const ev of cluster_events) {
    const preStart = ev.event_ts - preWindow;
    const preEnd = ev.event_ts;
    const postStart = ev.event_ts;
    const postEnd = ev.event_ts + postWindow;

    // Pre-window count (ITS baseline).
    let preCount = 0;
    for (const fe of fired_events) {
      if (fe.event_ts > preStart && fe.event_ts <= preEnd) preCount += 1;
    }

    // Post-window correlated subset (Cell 4 discriminator).
    const correlatedShardSet = new Set<string>();
    let postCountAll = 0;
    for (const fe of fired_events) {
      if (fe.event_ts >= postStart && fe.event_ts < postEnd) {
        postCountAll += 1;
        if (Math.abs(fe.event_ts - ev.event_ts) <= correlationWindow) {
          correlatedShardSet.add(fe.shard_node_id);
        }
      }
    }

    const memberShardIds = Array.from(correlatedShardSet).sort();
    const memberCount = memberShardIds.length;

    // Surface filters: (a) min correlated count; (b) min elevation over pre baseline.
    if (memberCount < minPostCount) continue;
    if (memberCount - preCount < minDelta) continue;

    candidates.push({
      cluster_event_id: ev.event_id,
      cluster_event_kind: ev.kind,
      event_ts: ev.event_ts,
      member_shard_ids: memberShardIds,
      member_count: memberCount,
      pre_window_count: preCount,
      post_window_count: memberCount,
      correlational_not_causal: true,
    });
  }

  // Deterministic sort: (event_ts asc, cluster_event_id lex asc).
  candidates.sort((a, b) => {
    if (a.event_ts !== b.event_ts) return a.event_ts - b.event_ts;
    return a.cluster_event_id < b.cluster_event_id ? -1 : a.cluster_event_id > b.cluster_event_id ? 1 : 0;
  });

  return { candidates, attributed_at_ts: now() };
}
```

### 3.3 `engine/events/freeze-hook.ts`

```ts
// engine/events/freeze-hook.ts — Tessera Phase 2 SLICE 4 (R34) WU-06 Surface 3.
//
// Phase 1 freeze-hook activation coupling. Wraps the inherited Phase 1
// per-shard runtime composition (updatePerShardResidual at
// engine/per-shard/runtime.ts:82); when freezeState.active AND
// config.freeze_hook_enabled, returns current residual unchanged so the
// event-driven drift is NOT absorbed into per-shard residual during the
// post-event window.
//
// Tessera-original code. See Q-R34-SPEC § 0.2 for empirical-premise
// correction (no pre-engineered freeze-hook substrate existed in inherited
// Phase 1 code; this wrapper introduces the surface). Extract target:
// Tessera Phase 2 close.

import {
  updatePerShardResidual,
  type ExtendedSampleObservation,
} from '../per-shard/runtime';
import type { PerShardResidual, BaselineCellEntry } from '../types/config';

export interface FreezeHookState {
  /** True when the per-shard baseline accumulation should be paused. */
  active: boolean;
  /** Optional epoch-seconds expiry; informational only — wrapper does NOT
   *  compare to current time. Caller controls active transition. */
  until_ts?: number;
  /** Optional ClusterEvent.event_id that drove this freeze. Informational. */
  cluster_event_id?: string;
}

/** Freeze-aware wrapper around updatePerShardResidual.
 *
 *  Decision matrix:
 *    config.freeze_hook_enabled  freezeState.active  Behavior
 *    true                        true                Returns `current` unchanged (FREEZE).
 *    true                        false               Delegates to updatePerShardResidual.
 *    false (or absent)           any                 Delegates to updatePerShardResidual.
 *
 *  Pure function: no mutation of inputs. */
export function freezeAwareUpdatePerShardResidual(
  current: PerShardResidual,
  obs: ExtendedSampleObservation,
  baselineCell: BaselineCellEntry | undefined,
  freezeState: FreezeHookState,
  config: { freeze_hook_enabled?: boolean },
): PerShardResidual {
  if (config.freeze_hook_enabled === true && freezeState.active === true) {
    return current;
  }
  return updatePerShardResidual(current, obs, baselineCell);
}
```

### 3.4 `engine/types/config.ts` — Delta 5

Modify the header block (line 7-13 in current file) from "TESSERA SLICE 1 DELTAS (4 changes to inherited 820 LOC)" to "TESSERA DELTAS (5 changes to inherited 820 LOC)" with Delta 5 line added:

```
// ─── TESSERA DELTAS (5 changes to inherited 820 LOC) ───────────────
// Delta 1: BaselineCellsConfig.dimensions extended with 'shard_id' as 7th member.
// Delta 2: BaselineCellEntry.confidence extended with 'warm_start' as 5th member.
// Delta 3: PerShardResidual + PerShardCell new interface declarations at module level.
// Delta 4: CompiledConfig.per_shard_cells?: PerShardCell[] new optional field.
// Delta 5 (R34): CompiledConfig.freeze_hook_enabled?: boolean new optional field
//          (Phase 2 SLICE 4 event-driven freeze hook activation flag; default-absent
//          equivalent to false; consumed by engine/events/freeze-hook.ts wrapper).
// Convenience: CellDimension + CellConfidence type aliases added for test/type consumers.
// Inline union extensions are in-place per architect-pick (α); typedef-extract deferred to SLICE 2+.
```

Add the new field to the `CompiledConfig` interface adjacent to `per_shard_cells?: PerShardCell[]`:

```ts
  /** R34 Delta 5 — Phase 2 SLICE 4 event-driven freeze-hook activation flag.
   *  Default-absent equivalent to false. When true AND the runtime caller
   *  supplies a FreezeHookState with active=true (see
   *  engine/events/freeze-hook.ts), per-shard baseline accumulation pauses
   *  during the post-deploy-event window so event-driven drift is NOT
   *  absorbed into per-shard residual. Per SCOPING-MEMO-v0.3 § 2.4
   *  circular-coupling surface. */
  freeze_hook_enabled?: boolean;
```

### 3.5 `coordination/VENDORING-MANIFEST.md` — config.ts row update

Modify the row for `engine/types/config.ts` (currently line 41) Notes column from:
```
SLICE 1 deltas: shard_id dimension + warm_start confidence + PerShardResidual/PerShardCell + per_shard_cells field
```
to:
```
SLICE 1+SLICE 4 deltas (5 total): SLICE 1 (R01) deltas 1-4 — shard_id dimension + warm_start confidence + PerShardResidual/PerShardCell + per_shard_cells field. R34 delta 5 — CompiledConfig.freeze_hook_enabled?: boolean (Phase 2 SLICE 4 event-driven freeze hook activation flag).
```

### 3.6 `test/q34-event-conditional-attribution.test.ts`

21 `test()` declarations binding AC-R34-1 through AC-R34-21. Each test's body asserts the AC's "Then" clause one-for-one (Rule 3 — implementer-spec-test-assertion-coverage):

**Imports** (top of file):
```
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import {
  attributeEventConditional,
  type EventConditionalCandidate,
  DEFAULT_PRE_WINDOW_SECONDS,
  DEFAULT_POST_WINDOW_SECONDS,
  DEFAULT_CORRELATION_WINDOW_SECONDS,
} from '../engine/events/event-conditional-attribution';
import { SyntheticEventFeed, type ClusterEvent } from '../engine/events/event-feed';
import {
  freezeAwareUpdatePerShardResidual,
  type FreezeHookState,
} from '../engine/events/freeze-hook';
import { initialPerShardResidual } from '../engine/per-shard/warm-start';
import type { PerShardResidual } from '../engine/types/config';
import { buildV9ZSubstrate, scenarioCell1, scenarioCell2, scenarioCell3, scenarioCell4 } from './_substrate/v9Z-event-cluster';
```

**Test structure (selected; full text per AC enumeration in § 4):**

```ts
// AC-R34-1 — ClusterEvent type closed-set 5 event-classes
test('AC-R34-1: ClusterEvent.kind is closed-set 5-class union', () => {
  const validKinds: ClusterEvent['kind'][] = [
    'firmware_push', 'model_redeploy', 'env_change', 'config_change', 'capacity_change',
  ];
  assert.strictEqual(validKinds.length, 5);
  // Two-sided: each kind constructs cleanly + a synthetic event is shape-conformant.
  for (const k of validKinds) {
    const ev: ClusterEvent = { event_id: `e-${k}`, kind: k, event_ts: 1000 };
    assert.strictEqual(ev.kind, k);
    assert.strictEqual(typeof ev.event_id, 'string');
    assert.strictEqual(typeof ev.event_ts, 'number');
  }
});

// AC-R34-10 — A16 type-declaration regex with /m anchor
test('AC-R34-10: correlational_not_causal: true declaration regex /m', () => {
  const content = readFileSync('engine/events/event-conditional-attribution.ts', 'utf8');
  const declRe = /^\s*correlational_not_causal:\s*true\s*;/m;
  assert.strictEqual(declRe.test(content), true);
});

// AC-R34-12 — A16 two-sided absence (Rule 5 strong)
test('AC-R34-12: correlational_not_causal: false absent from engine/events/*.ts', () => {
  for (const path of [
    'engine/events/event-feed.ts',
    'engine/events/event-conditional-attribution.ts',
    'engine/events/freeze-hook.ts',
  ]) {
    const content = readFileSync(path, 'utf8');
    const falseRe = /correlational_not_causal:\s*false/;
    assert.strictEqual(falseRe.test(content), false, `${path} contains correlational_not_causal: false`);
    assert.strictEqual(content.includes('correlational_not_causal: false'), false, `${path} substring`);
  }
});

// AC-R34-13 — Wrapper FREEZE branch (both flags true → unchanged)
test('AC-R34-13: wrapper freezes when both flags true', () => {
  const current: PerShardResidual = { ...initialPerShardResidual(), n_samples: 5, confidence: 'none' };
  const obs = { observedAt: 1000, residualSeedHash: 's-1', sampleVector: [1, 2, 3] };
  const freezeState: FreezeHookState = { active: true, cluster_event_id: 'e-1' };
  const result = freezeAwareUpdatePerShardResidual(current, obs, undefined, freezeState, { freeze_hook_enabled: true });
  assert.strictEqual(result.n_samples, 5);  // n unchanged
  assert.strictEqual(result.confidence, 'none');
  assert.strictEqual(result.welford_state, current.welford_state);  // same reference / both undefined
});

// AC-R34-17 — PR-F7 evidence package (3+ citations × URL + date + verbatim quote ≥30 chars)
test('AC-R34-17: PR-F7 evidence package shape', () => {
  const content = readFileSync('coordination/evidence/PR-F7-EVIDENCE.md', 'utf8');
  // Three required citations, each with URL + retrieval date 2026-05-18 + a verbatim quote
  // of >= 30 chars. Match three separate citation blocks via regex with anchored headers.
  const citationBlocks = content.match(/##\s+(Brodersen|Abadie|Bernal)[\s\S]*?(?=^##\s|\Z)/gm);
  assert.notStrictEqual(citationBlocks, null);
  assert.strictEqual(citationBlocks!.length >= 3, true);
  for (const block of citationBlocks!) {
    assert.match(block, /https?:\/\/\S+/);
    assert.match(block, /2026-05-18/);
    // Verbatim quote: lines starting with ">", concatenated length >= 30.
    const quoteLines = block.match(/^>\s.*/gm) ?? [];
    const totalQuoteLen = quoteLines.reduce((s, l) => s + l.length, 0);
    assert.strictEqual(totalQuoteLen >= 30, true, `citation block quote length < 30: ${block.slice(0, 100)}`);
  }
});

// AC-R34-19 — Anti-scope diff (Rule 4)
test('AC-R34-19: anti-scope diff chore-A SHA..HEAD ⊆ ALLOWED_SET ∪ regex carve-outs', () => {
  const CHORE_A_SHA = process.env.R34_CHORE_A_SHA ?? '__placeholder__';  // Implementer sets at chore-A creation
  const ALLOWED_SET: ReadonlyArray<string> = [
    'engine/events/event-feed.ts',
    'engine/events/event-conditional-attribution.ts',
    'engine/events/freeze-hook.ts',
    'engine/types/config.ts',
    'coordination/VENDORING-MANIFEST.md',
    'coordination/evidence/PR-F7-EVIDENCE.md',
    'coordination/specs/Q-R34-SPEC.md',
    'coordination/specs/Q-R34-SPEC-AUDIT.md',
    'coordination/NEXT-ROLE.md',
    'test/q34-event-conditional-attribution.test.ts',
    'test/q34-event-conditional-attribution.test.js',  // compiled output for node --test
    'test/_substrate/v9Z-event-cluster.ts',
    'test/_substrate/v9Z-event-cluster.js',
  ];
  const ALLOWED_REGEX: ReadonlyArray<RegExp> = [
    /^coordination\/MEMORIAL\.md$/,
    /^coordination\/reviews\/REVIEWER-REPORT-R34(-opus|-sonnet)?\.md$/,
    /^coordination\/diagnostics\/DIAGNOSTIC-R34-.*\.md$/,
    /^coordination\/logs\/ROUND-R34-SUMMARY\.md$/,
  ];
  const diffOut = execFileSync('git', ['diff', `${CHORE_A_SHA}..HEAD`, '--name-only']).toString().trim();
  const paths = diffOut === '' ? [] : diffOut.split('\n');
  const violations = paths.filter((p) =>
    !ALLOWED_SET.includes(p) && !ALLOWED_REGEX.some((re) => re.test(p)),
  );
  assert.deepStrictEqual(violations, []);
});

// AC-R34-21 — Test count baseline + R34 ACs (per R22 IMPL MINOR-1)
test('AC-R34-21: test count = baseline 305 + 21 R34 ACs = 326 / pass 320 / fail 6 (baseline carry)', () => {
  // Anchored to chore-A SHA's expected post-implementation count at chore-B/HEAD.
  // At chore-A (RED commit), all 21 R34 ACs fail: tests=326, pass=299, fail=27.
  // At chore-B (GREEN), all 21 R34 ACs pass: tests=326, pass=320, fail=6.
  // This AC observes whichever SHA the binding command runs at (Reviewer runs at HEAD).
  const out = execFileSync('node', ['--test', '--test-reporter=tap', ...glob('test/*.test.js')]).toString();
  const tests = parseInt(out.match(/^# tests (\d+)$/m)![1], 10);
  const pass = parseInt(out.match(/^# pass (\d+)$/m)![1], 10);
  const fail = parseInt(out.match(/^# fail (\d+)$/m)![1], 10);
  assert.strictEqual(tests, 326);  // 305 baseline + 21 R34
  assert.strictEqual(pass, 320);   // 299 baseline + 21 R34 GREEN
  assert.strictEqual(fail, 6);     // 6 baseline pre-existing (AC-R32-20 + 5 others)
});
```

Note: the spec deliberately defers exact wiring of all 21 test bodies to the Implementer (Implementer's tactical autonomy). The pseudocode above is sufficient to verify shape; the Implementer transcribes the patterns above for AC-R34-2..9, 11, 14..16, 18, 20 following the same one-for-one Then→assertion convention. Per Rule 3: each AC's Then-column field has an assertion line.

### 3.7 `test/_substrate/v9Z-event-cluster.ts`

Extends `v9Y-multi-rack-cluster` (R23-frozen — NOT modified) with 4 named scenario builders (`scenarioCell1`, `scenarioCell2`, `scenarioCell3`, `scenarioCell4`) returning `{ cluster_events: ClusterEvent[], fired_events: FiredShardEvent[] }`:

- `scenarioCell1` — PR-F7 Cell 1: 1 ClusterEvent at t=1000; 3 FiredShardEvent in post-window correlated (within 60s) + 0 in pre-window. Expected: 1 candidate with member_count=3.
- `scenarioCell2` — PR-F7 Cell 2: 0 ClusterEvents; 0 FiredShardEvents. Expected: 0 candidates.
- `scenarioCell3` — PR-F7 Cell 3: 1 ClusterEvent at t=2000; 1 FiredShardEvent at t=2030 (singleton; below min_post_count=2). Expected: 0 candidates.
- `scenarioCell4` — PR-F7 Cell 4: 1 ClusterEvent at t=3000; 4 FiredShardEvent total: 2 within correlation window (correlated), 2 outside correlation window but inside post-window (unrelated). Expected: 1 candidate; member_shard_ids contains only the 2 correlated shards; the 2 unrelated shard ids NOT in member_shard_ids.

Substrate also exports `buildV9ZSubstrate()` returning a TopologySnapshot extended with event-feed-related metadata (used by future Phase 3+ integrations; currently informational).

### 3.8 `coordination/evidence/PR-F7-EVIDENCE.md`

Markdown document with three ##-anchored sections (one per citation). Each section contains: (a) URL, (b) retrieval date 2026-05-18, (c) verbatim quote inside `>` blockquote of total length ≥30 chars + (d) Tessera-relevance commentary. Plus a Cells 1-4 summary table linking to the named scenarios in `v9Z-event-cluster.ts` + AC-R34-4..7.

Citations:
- `## Brodersen et al. 2015 — Inferring causal impact using Bayesian structural time-series models`
- `## Abadie et al. 2010 — Synthetic Control Methods for Comparative Case Studies`
- `## Bernal et al. 2017 — Interrupted time series regression for the evaluation of public health interventions`

---

## 4. Acceptance criteria

All ACs use strong binding patterns per Rule 3 + Rule 5 self-application (see § 9.5 Rule 5 sweep). Each AC has a binding test in `test/q34-event-conditional-attribution.test.ts`. ACs are deliberately phrased so that a future regression in the spec'ied behavior changes a specific assertion result (mutation test).

| # | Given | When | Then |
|---|---|---|---|
| AC-R34-1 | the `ClusterEvent` type from `engine/events/event-feed.ts` | a ClusterEvent literal is constructed with each of the 5 spec'ied kinds (`firmware_push`, `model_redeploy`, `env_change`, `config_change`, `capacity_change`) | each kind value is strictly equal to itself; `event_id` is string; `event_ts` is number; the union has exactly 5 members (closed-set) |
| AC-R34-2 | a SyntheticEventFeed constructed with caller-supplied events out of order | `.fetchSince(0)` is called | returned events are sorted by `(event_ts asc, event_id lex asc)`; empty input → returns empty array (no throw) |
| AC-R34-3 | a `ClusterEvent` with `event_id = "evt-r34-3"` and an `attributeEventConditional` invocation producing a candidate for that event | the candidate.cluster_event_id is read | `strictEqual(candidate.cluster_event_id, "evt-r34-3")` (identity threading; no mapping table) |
| AC-R34-4 | PR-F7 Cell 1 scenario from `v9Z-event-cluster.scenarioCell1` (1 ClusterEvent + 3 correlated post-window fires) | `attributeEventConditional` is called | exactly 1 EventConditionalCandidate returned; member_count === 3; member_shard_ids deepStrictEqual to the 3 correlated shard ids in lex-asc order; pre_window_count === 0; post_window_count === 3; correlational_not_causal === true |
| AC-R34-5 | PR-F7 Cell 2 scenario (no events, no fires) | `attributeEventConditional` is called | candidates array is empty (strictEqual length 0) |
| AC-R34-6 | PR-F7 Cell 3 scenario (1 ClusterEvent + 1 singleton post-window fire correlated; below min_post_count=2) | `attributeEventConditional` is called | candidates array is empty (singleton not surfaced; F4 branch exercised) |
| AC-R34-7 | PR-F7 Cell 4 scenario (1 ClusterEvent + 2 correlated post-window fires + 2 unrelated post-window fires) | `attributeEventConditional` is called | exactly 1 EventConditionalCandidate; member_count === 2; member_shard_ids contains ONLY the 2 correlated shard ids (deepStrictEqual to lex-sorted list); the 2 unrelated shard ids are NOT present in member_shard_ids (verified via `assert.strictEqual(member_shard_ids.includes("<unrelated-id>"), false)` for each) |
| AC-R34-8 | the `DEFAULT_PRE_WINDOW_SECONDS`, `DEFAULT_POST_WINDOW_SECONDS`, `DEFAULT_CORRELATION_WINDOW_SECONDS` exports | their values are read | strictEqual to 300, 300, 60 respectively; for a ClusterEvent at event_ts=T, the pre window `(T-300, T]` and post window `[T, T+300)` are non-overlapping (post starts at T, pre ends at T; verified by constructing two adjacent FiredShardEvents and observing classification) |
| AC-R34-9 | empty `cluster_events` AND empty `fired_events` | `attributeEventConditional` is called | candidates array is empty (no throw; graceful degradation) |
| AC-R34-10 | `engine/events/event-conditional-attribution.ts` file content | read into memory and tested against regex `/^\s*correlational_not_causal:\s*true\s*;/m` | regex.test === true (A16 type-declaration site preserved); type-declaration of `EventConditionalCandidate` interface contains the literal field declaration |
| AC-R34-11 | an EventConditionalCandidate emitted from `attributeEventConditional` (using Cell 1 scenario) | JSON round-trip: `JSON.parse(JSON.stringify(candidate))` | parsed.correlational_not_causal strictEqual `true` (A16 wire-format invariant survives serialization) |
| AC-R34-12 | each file under `engine/events/*.ts` (event-feed.ts, event-conditional-attribution.ts, freeze-hook.ts) | content read and tested against (a) regex `/correlational_not_causal:\s*false/` AND (b) substring `"correlational_not_causal: false"` | (a) regex.test === false AND (b) content.includes === false (two-sided absence; Rule 5 strong binding) |
| AC-R34-13 | a PerShardResidual with `n_samples=5`, `confidence='none'`, and a `FreezeHookState { active: true }` plus `config = { freeze_hook_enabled: true }` | `freezeAwareUpdatePerShardResidual(current, obs, undefined, freezeState, config)` is called | returned residual.n_samples strictEqual 5 (FREEZE — no increment); returned residual.confidence strictEqual 'none'; returned residual.welford_state strictEqual current.welford_state (referential equality OR both undefined) |
| AC-R34-14 | a PerShardResidual with `n_samples=5`, `confidence='none'`, `FreezeHookState { active: true }` plus `config = { freeze_hook_enabled: false }` | `freezeAwareUpdatePerShardResidual` is called | returned residual.n_samples strictEqual 6 (DELEGATE — n incremented; freeze flag false overrides active state); confidence per state-machine transition |
| AC-R34-15 | a PerShardResidual with `n_samples=5`, `confidence='none'`, `FreezeHookState { active: false }` plus `config = { freeze_hook_enabled: true }` | `freezeAwareUpdatePerShardResidual` is called | returned residual.n_samples strictEqual 6 (DELEGATE — n incremented; freezeState inactive) |
| AC-R34-16 | `engine/types/config.ts` file content | content read and tested for (a) header inventory line containing literal substring `"Delta 5"` AND `"freeze_hook_enabled"` AND (b) presence of declaration line matching regex `/^\s*freeze_hook_enabled\?:\s*boolean;/m` | (a) both substrings present; (b) regex.test === true |
| AC-R34-17 | `coordination/evidence/PR-F7-EVIDENCE.md` file content | content read | (a) at least 3 ##-anchored citation blocks matching headers Brodersen / Abadie / Bernal; (b) each block contains a URL matching `/https?:\/\/\S+/`; (c) each block contains literal date `"2026-05-18"`; (d) each block contains blockquote lines (starting `>`) summing to ≥30 chars |
| AC-R34-18 | `coordination/VENDORING-MANIFEST.md` file content | content read | row for `engine/types/config.ts` notes column contains literal substring `"5 total"` (or equivalent enumeration) AND substring `"freeze_hook_enabled"` AND substring `"R34"` |
| AC-R34-19 | `R34_CHORE_A_SHA` env var or inline-recorded SHA + git diff from chore-A SHA to HEAD | `git diff <chore-A-SHA>..HEAD --name-only` is executed | every path returned is ⊆ ALLOWED_SET ∪ regex carve-outs (ALLOWED_SET in § 5; carve-outs: REVIEWER-REPORT-R34*.md, DIAGNOSTIC-R34-*.md, MEMORIAL.md, ROUND-R34-SUMMARY.md); violations array deepStrictEqual `[]` |
| AC-R34-20 | the R34 implementation state | `execFileSync('npx', ['tsc', '-p', 'tsconfig.test.json'])` is invoked | command exits 0 verbatim (per Rule 1 false-compliance-attestation — actual exit code encoded; do NOT reframe) |
| AC-R34-21 | the R34 implementation state at chore-B HEAD | `node --test test/*.test.js` is invoked (TAP reporter) | `# tests` line strictEqual 326 (305 baseline + 21 R34); `# pass` line strictEqual 320 (299 baseline + 21 R34 GREEN); `# fail` line strictEqual 6 (baseline pre-existing carry-forward only) |

**AC count: 21.** Within scope target 18-24.

---

## 5. Anti-scope (allowed-set spec for chore-A → HEAD diff)

The R34 chore-A SHA is the bottom of the diff anchor (per R22 IMPL MINOR-1). The R34 ALLOWED_SET — file paths permitted to differ between chore-A and HEAD — is:

```
ALLOWED_SET (literal-match):
  engine/events/event-feed.ts
  engine/events/event-conditional-attribution.ts
  engine/events/freeze-hook.ts
  engine/types/config.ts
  coordination/VENDORING-MANIFEST.md
  coordination/evidence/PR-F7-EVIDENCE.md
  coordination/specs/Q-R34-SPEC.md
  coordination/specs/Q-R34-SPEC-AUDIT.md
  coordination/NEXT-ROLE.md
  test/q34-event-conditional-attribution.test.ts
  test/q34-event-conditional-attribution.test.js
  test/_substrate/v9Z-event-cluster.ts
  test/_substrate/v9Z-event-cluster.js
```

```
ALLOWED_REGEX (carve-out patterns; per Rule 4 forward-coverage):
  ^coordination\/MEMORIAL\.md$
  ^coordination\/reviews\/REVIEWER-REPORT-R34(-opus|-sonnet)?\.md$
  ^coordination\/diagnostics\/DIAGNOSTIC-R34-.*\.md$
  ^coordination\/logs\/ROUND-R34-SUMMARY\.md$
```

### 5.1 Anti-scope rationale (forward-coverage; Rule 4)

- `coordination/MEMORIAL.md` regex: Architect appends a CONFIRMATION block during this round; Memorial-Updater appends final round summary later. Both post-chore-A modifications.
- `coordination/reviews/REVIEWER-REPORT-R34*.md` regex (with optional `-opus`/`-sonnet` suffix): standard Reviewer post-chore-A commit; opus/sonnet variants accommodate future hybrid Reviewer dispatch (NOT used at R34 per scope block, but pattern reserved per WAVE-PLAN-03 convention).
- `coordination/diagnostics/DIAGNOSTIC-R34-*.md` regex: if any halt fires mid-round (e.g., per § 7 halt conditions), the DIAGNOSTIC file lands BEFORE chore-A and is in the diff range (per R25 MAJOR-2 reinforcement: halt commits land DIAGNOSTIC pre-chore-A; ALLOWED_SET must accommodate).
- `coordination/logs/ROUND-R34-SUMMARY.md` regex: Memorial-Updater convention.

### 5.2 Anti-scope hard limits (full enumeration from scope block + WAVE-GATE-03)

Headline:
- A12 (engine internals frozen; vendored-with-deltas ONLY at config.ts Delta 5 per § 0.3)
- A10 (hardware diagnosis fenced — event-feed ingests *deployment* events, not hardware-fault signals)
- A11 (synthetic only — NO live deployment-pipeline endpoints; SyntheticEventFeed only)
- **A16 — Addition #26 D4 `correlational_not_causal: true` PRESERVED at every event-conditional emit site — HIGHEST RELEVANCE; regex /m anchor + JSON round-trip + two-sided absence (AC-R34-10/11/12)**
- A13 (rule-based + statistical only — ITS / pre-post comparison; NO ML)
- A17 (no DeploySignal-integration scope)
- NO modification of any Wave 1+2+3 deliverable
- NO modification of any pre-R34 test file
- NO modification of `engine/types/verdict.ts` (R18/R20/R23 frozen; R34 does NOT extend the verdict type union)
- NO modification of `engine/per-shard/{warm-start,runtime,welford}.ts` (Tessera-original; not modified at R34 — § 0.3 Approach B rejected)
- NO modification of `coordination/SCOPING-MEMO-v0.3.md` (R32 MAJOR-1 surgery deferred to WU-07 per OQ-W3-3 = B)
- NO modification of `coordination/PRD.md`
- NO modification of `multi-track-cluster-setup.sh` or any `scripts/*` (operator-owned)
- NO modification of `CLAUDE-IMPLEMENTER.md` (MR-2 consolidation staged for Phase 2 close)
- NO R32 carry-forward closures (WU-07 punch list) — explicitly: SCOPING-MEMO MAJOR-1; 4 weak ACs (AC-R32-2/7/13/14); execSync at q25/q30; R26 MINOR-2 (carries forward per § 0.6)
- NO PR-F7 hybrid Reviewer at R34 (fires at WU-07 per SCOPING-MEMO § 3)

---

## 6. Open questions

**None — all resolved.**

OQ-W3-1 (file layout) accepted default A.  
OQ-W3-2 (freeze-hook coupling scope) refined to D (wrapper + config-flag combo) per empirical-premise correction in § 0.2; rationale documented.  
OQ-W3-3 (SCOPING-MEMO surgery timing) accepted default B (deferred to WU-07).  
OQ-W3-4 (event-feed schema scope) resolved closed-set 5 event-classes per SCOPING-MEMO § 2.3 enumeration; rationale in § 0.1.

Attribution method (ITS-class pre/post window) selected per § 0.4 with literature citations covered by all three Brodersen / Abadie / Bernal anchors per PR-F7 trigger requirement.

R26 MINOR-2 deferred impl alignment carries forward to WU-07 per § 0.6 (WU-06 does NOT ship the `FusedVerdict → FiredShardEvent` adapter consumer site).

---

## 7. Halt conditions for the Implementer

Per scope block § Halt conditions + § 0.2 empirical-premise discipline:

1. **A16 D4 reversal surface emerges** — any code path or AC that cannot preserve `correlational_not_causal: true` literal under cold-Reviewer audit. HALT + DIAGNOSTIC + ESCALATE (highest priority).
2. **Freeze-hook wrapper exposes a hole** — discover that a production caller of `updatePerShardResidual` exists outside the file (re-run `grep -rn 'updatePerShardResidual' engine/` at chore-A SHA; if hits ≥2, wrapper interception is incomplete). HALT + DIAGNOSTIC; bounded options should include (Option A) update the inherited caller to use the wrapper, (Option B) escalate to operator for Approach B (vendored-with-deltas on runtime.ts).
3. **PR-F7 external literature URL is dead** — if any of the 3 cited URLs (Brodersen / Abadie / Bernal) no longer resolve at chore-A SHA. HALT + DIAGNOSTIC; do NOT silently accept dead links (same discipline as WU-04 PR-F6 R26).
4. **Binding-command output contradicts AC literal text** — per Rule 1 (false-compliance-attestation). If `tsc` exits non-zero or `node --test` counts diverge from the spec. HALT + DIAGNOSTIC; do NOT reframe as compliance.
5. **Event-conditional attribution surfaces a structural false-positive** — if PR-F7 Cell 4 (confounding-discrimination) cannot eliminate the unrelated post-window fires via the spec'ied `correlation_window_seconds` discriminator at any AC-bound default. HALT + DIAGNOSTIC; bounded options for refining the discriminator window OR escalating attribution-method redesign.
6. **Rule 5 self-application sweep at GREEN identifies a non-discriminating AC** — at chore-B preparation time, the Implementer re-runs the grep + mutation sweep (§ 9.5) on `test/q34-event-conditional-attribution.test.ts`; if any AC's assertion would pass under a structurally-valid-but-spec-violating implementation (mutation test fails to flip), the AC must be strengthened. If strengthening requires scope expansion that the Implementer cannot bound, HALT for operator decision.

---

## 8. P3 ten-axis verification

Moved to `Q-R34-SPEC-AUDIT.md` § 2 per Architect role boundary (audit-trail content in sidecar; Reviewer reads both).

---

## 9. Pre-emit grilling

### 9.1 Every claim verifiable?

| Claim | Evidence | Verdict |
|---|---|---|
| Baseline tests=305/pass=299/fail=6 | empirical run at HEAD `e7547a0` (§ 0.5) | VERIFIED |
| tsc exit=0 | empirical run at HEAD `e7547a0` (§ 0.5) | VERIFIED |
| No inherited freeze-hook substrate | empirical grep over `engine/` (§ 0.2) | VERIFIED |
| `updatePerShardResidual` has no inherited engine callers | `grep -rn 'updatePerShardResidual' engine/` (§ 0.2) | VERIFIED |
| `engine/per-shard/runtime.ts` is Tessera-original (not vendored-at-pin) | manifest verification + file header check (no `VENDORED FROM` header) | VERIFIED |
| config.ts already vendored-with-deltas; AT_PIN_FILES exclusion preserved | manifest § 41 + q01-no-at-pin-deltas.test.ts:9,53 | VERIFIED |
| A16 binding precedent (R26 + R32) | direct read of `engine/topology/common-mode-attribution.ts:74-78` + `engine/types/verdict.ts:287-289` | VERIFIED |
| 5 cross-project rules canonical text | CROSS-PROJECT-MEMORIAL.md lines 3289-3296 (Rule 5 NEW) + R32 close-walk § 5.3 | VERIFIED |
| OQ defaults applied per overnight authority | NEXT-ROLE.md R33 round-scope directive + WAVE-PLAN-03 § Open questions | VERIFIED |
| PR-F7 literature citations (Brodersen / Abadie / Bernal) — load-bearing for evidence package | spec inputs § Citations (SCOPING-MEMO § 2.3 + § 4.4 + WU-04→WU-06 handoff § Pre-flags) | VERIFIED at spec level — Implementer verifies URL liveness at chore-A SHA per § 7 halt condition #3 |

### 9.2 Unstated assumptions?

- (a) **R34 chore-A SHA is downstream of `e7547a0`.** The baseline run was at `e7547a0`; chore-A will be downstream (Implementer's first commit). All count claims and anti-scope diffs anchor to chore-A SHA, not to `e7547a0`. AC-R34-21 implicitly assumes the 6 baseline fails carry forward from `e7547a0` to chore-A; if the Implementer's spec-emit commit re-runs the suite at a SHA where new fails appear (e.g., environmental drift), the baseline carry assumption fails. **Mitigation**: § 0.5 explicitly verified at `e7547a0`; if drift occurs, halt condition #4 (false-compliance-attestation) fires.
- (b) **`engine/events/` directory does not exist at session start.** Implementer creates it. Verified via `ls engine/` (no `events/` entry) at session entry.
- (c) **`coordination/evidence/` directory exists.** Verified — R26 PR-F6-EVIDENCE.md lives there (per WAVE-GATE-03 § PR-F6 evidence package).
- (d) **AT_PIN_FILES list at `test/q01-no-at-pin-deltas.test.ts` already excludes config.ts.** Verified at session entry (file:9 + file:53). No edit required for the Delta 5 transition.

None of these assumptions are load-bearing in ways the Implementer cannot verify themselves; all are recorded for cold-Reviewer audit transparency.

### 9.3 Scope added beyond request?

NO. Round directive maps 1:1 to spec deliverables:
- WU-06 scope block 4 architectural surfaces → spec § 1 4 surfaces.
- Target AC count 18-24 → spec § 4 21 ACs.
- All 5 cross-project rules → applied per § 9.5 (Rule 5) + AC-R34-19 (Rule 4) + AC-R34-20 (Rule 1) + § 1.3 F-table (Rule 2) + each AC strong binding (Rule 3).

Anti-scope (§ 5) explicitly lists what is NOT in scope; cross-checked against scope block § Anti-scope and WAVE-GATE-03 § Anti-scope reminder.

### 9.4 Implementer can act without guessing?

YES. Verified by re-reading spec § 1-7 as if I am the Implementer cold:

- Each NEW file path, type signature, function signature, default constant value, and module structure is spec'ied in § 3 pseudocode.
- Every AC has a binding test sketch in § 3.6 with the same shape repeated for ACs not fully transcribed (one-for-one Then-clause-to-assertion convention per Rule 3).
- The ALLOWED_SET + regex carve-outs in § 5 are literal-enumerable; no AC requires the Implementer to invent additional paths.
- Halt conditions (§ 7) cover the 6 known surfaces the Implementer might encounter where Architect judgment is preferable to Implementer judgment.

### 9.5 Rule 5 self-application sweep (NEWLY DERIVED at R33 gate; first procedural application at the dispatch layer)

Per cross-project Rule 5 (CROSS-PROJECT-MEMORIAL.md:3296): "When a cross-project rule is derived from prior-round violations and that derivation is committed in a round N, the [Architect at spec-emit time] MUST perform a self-audit of the current round's AC suite against the newly derived rule. Procedure: for each newly derived assertion-coverage rule, grep the current test pseudocode for the weak patterns it prohibits (`content.includes(`, `.length > 0`, `typeof x ===`, `assert.ok(` for equality-AC bindings) and apply the mutation test to every match. If the mutation test passes without triggering a different assertion, the AC is too weak and must be strengthened."

#### 9.5.1 Grep sweep on AC pseudocode

The following patterns were searched across the AC tables (§ 4) and pseudocode (§ 3.6):

| Pattern | Permitted contexts | Disallowed contexts | Findings in R34 spec |
|---|---|---|---|
| `content.includes(...)` | (a) two-sided assertions (presence + structural verification); (b) explicit absence checks where regex AND substring are both asserted | sole presence check on a structural requirement | **AC-R34-12** uses `content.includes(...)` for the absence check side; paired with regex.test (two-sided). **AC-R34-16** uses substring matching for header inventory line; paired with regex on the field-declaration site (structural + textual). **AC-R34-17** uses substring matching for retrieval date `"2026-05-18"`; paired with regex on URL. **AC-R34-18** uses substring matching for manifest row text; structural row identifier (literal-equality is the spec'ied invariant). All three uses two-sided OR substring-equality (Rule 5 PASS). |
| `.length > 0` | (a) "at least N" assertions where N≥2 with structural verification of contents | `length > 0` as sole presence check | NONE in R34 spec. AC-R34-17 uses `citationBlocks!.length >= 3` (strong; specific lower-bound count). |
| `typeof x === 'string'` (or similar typeof checks) | type contract narrowing where strict type cannot be observed at the JS layer | sole assertion on a structural value | AC-R34-1 uses `typeof ev.event_id, 'string'` paired with `strictEqual` on kind value (structural). PASS. |
| `assert.ok(...)` | (a) boolean truthiness with secondary structural check | sole truthiness check on equality-AC | NONE in R34 spec. All boolean checks use `strictEqual` or `notStrictEqual`. |

#### 9.5.2 Mutation tests per AC (cold-read; sample)

For each AC, ask: "if production were to return a different-but-structurally-valid value, would the assertion still pass?"

| AC | Mutation example | Would assertion still pass? | Verdict |
|---|---|---|---|
| AC-R34-1 | `kind` extended to a 6th value `firmware_rollback` | NO — closed-set comparison fails on 6th member; spec'ies exact 5-member union | STRONG |
| AC-R34-4 | Cell 1 implementation returns 4 candidates (over-emitting) | NO — `strictEqual(candidates.length, 1)` fails | STRONG |
| AC-R34-7 | Cell 4 implementation includes unrelated shards in member_shard_ids | NO — `deepStrictEqual(member_shard_ids, ...)` on lex-sorted correlated list fails | STRONG |
| AC-R34-10 | type declaration changed to `correlational_not_causal: boolean;` (not literal `true`) | NO — regex requires `true` literal (matched). Could mutation `correlational_not_causal: true | false;` pass? The regex `/^\s*correlational_not_causal:\s*true\s*;/m` matches a line that ENDS with `true;`. A union `true | false;` would still match `true |` — but the spec also requires AC-R34-11 (JSON round-trip strictEqual true) which a `true \| false` field could still satisfy at runtime if implementation always emits `true`. **However, AC-R34-12 asserts two-sided absence of `correlational_not_causal: false`** — this would fail on a `true | false` union declaration. **Three-way binding** (10 + 11 + 12) covers the mutation surface jointly. STRONG. | STRONG (three-way joint binding) |
| AC-R34-13 | wrapper FREEZE branch implemented as `return { ...current }` (object copy, not reference) | strictEqual on n_samples + confidence STILL passes (values equal); strictEqual on welford_state — if both are undefined, reference equality is N/A; if welford_state is a populated object, `{ ...current }` produces a NEW reference, and `strictEqual` would FAIL → mutation correctly flips. PASS for populated state. For undefined state (initial), both sides are `undefined` and pass — but n_samples + confidence still bind the FREEZE semantic. Acceptable; the test uses a populated residual (n_samples=5) so `welford_state` is set when invoked from runtime. | STRONG (joint structural binding) |
| AC-R34-17 | PR-F7 evidence package ships with 3 citations BUT one citation has no verbatim quote | quote-length check `totalQuoteLen >= 30` fails for that block → assertion fails. STRONG. |  STRONG |
| AC-R34-19 | Implementer accidentally modifies an out-of-scope file | violations array non-empty → `deepStrictEqual(violations, [])` fails. STRONG. | STRONG |
| AC-R34-20 | tsc emits a warning but exits 0 | exit 0 verbatim; no reframing required (warnings ≠ errors per Rule 1). STRONG. | STRONG |
| AC-R34-21 | Implementer ships only 20 R34 ACs (one missing) | tests=325 → strictEqual fails. Implementer ships 22 R34 ACs (one extra) → tests=327 → strictEqual fails. STRONG. | STRONG |

#### 9.5.3 Verdict

All 21 R34 ACs use strong binding patterns. The 3 `content.includes(...)` instances (AC-R34-12, AC-R34-16, AC-R34-18) are paired with structural / regex / equality assertions per the permitted-context rule. AC-R34-17's `length >= 3` is a specific lower-bound count, not a presence check.

**Rule 5 self-application: PASS at spec-emit time.** The Implementer must re-run this sweep at chore-B preparation per halt condition #6.

### 9.6 Cross-section consistency pass (per R01 reinforcement)

Resolved decisions (§ 0.1 + § 0.3) and named identifiers were grep-checked across sections § 1, § 3, § 4, § 5:

| Identifier | § 1 | § 3 | § 4 | § 5 |
|---|---|---|---|---|
| `ClusterEventKind` 5-class union | § 1.1 | § 3.1 | AC-R34-1 | — |
| `EventConditionalCandidate` | § 1.1, § 1.2 | § 3.2 | AC-R34-4..7, 10..12 | — |
| `freezeAwareUpdatePerShardResidual` | § 1.1 (S3) | § 3.3 | AC-R34-13..15 | — |
| `freeze_hook_enabled` field | § 1.1 (S3) | § 3.4 | AC-R34-13..15, AC-R34-16 | — |
| `correlational_not_causal: true` | § 1.2, § 1.3 F7 | § 3.2 declaration | AC-R34-10..12 | A16 in § 5.2 |
| ALLOWED_SET paths | — | § 3.6 test body | AC-R34-19 | § 5 |
| Closed-set 5 event classes | § 0.1, § 1.1 | § 3.1 | AC-R34-1 | — |
| ITS pre/post window defaults (300/300/60) | § 1.1 (S2) | § 3.2 module constants | AC-R34-8 | — |

All identifiers consistent across sections; closed-set member values consistent; default constant values consistent (300 / 300 / 60 / 2 / 1).

### 9.7 Empirical-premise verification (per R08 + R28 reinforcement)

Per R08 MAJOR-2: empirically verify every load-bearing factual claim about production behavior before emitting spec. All premises in this spec inherit from R32 or earlier are listed:

| Premise | Source claim | Verified empirically | Verdict |
|---|---|---|---|
| Baseline counts | WAVE-GATE-03 pre-flag (tests=305/pass=299/fail=6) | Yes (§ 0.5) — `node --test test/*.test.js` at `e7547a0` | MATCHES |
| tsc exit 0 | WAVE-GATE-03 pre-flag | Yes (§ 0.5) — `npx tsc -p tsconfig.test.json` | MATCHES |
| Pre-engineered freeze-hook substrate | scope block + WU-05 handoff | NO (§ 0.2) | **CORRECTED in § 0.2** |
| `updatePerShardResidual` callers | (not previously claimed; verified independently) | Yes (§ 0.2) — `grep -rn 'updatePerShardResidual' engine/` | only self-reference |
| config.ts vendored-with-deltas | manifest § 41 | Yes (read manifest + file header) | MATCHES |
| AT_PIN_FILES exclusion for config.ts | (assumed by Architect; verified) | Yes — q01-no-at-pin-deltas.test.ts:9,53 | MATCHES |
| A16 type-declaration regex pattern from R30 MINOR-1 fix | WU-04→WU-06 handoff § A16 binding precedent | Yes — direct read of `engine/topology/common-mode-attribution.ts:74-78` (literal value `true` declared) | MATCHES |
| PR-F7 literature URLs (Brodersen / Abadie / Bernal) live | spec inputs | NOT YET — Implementer verifies at chore-A SHA per § 7 halt condition #3 | DEFERRED to Implementer at chore-A |

The single corrected premise is documented in § 0.2 with the empirical method. No silent premise-acceptance; § 0.6 (R26 MINOR-2 carry-forward) and § 0.5 (baseline) similarly verified.

### 9.8 Spec-internal-contradiction sweep (per R15 reinforcement)

Cross-check that no two spec sections prescribe conflicting actions for the same trigger:

- **§ 1.1 S3 says wrapper returns `current` unchanged when both flags true; § 3.3 pseudocode confirms; § 4 AC-R34-13 confirms strictEqual on n_samples / confidence / welford_state.** Single consistent prescription.
- **§ 1.1 S3 says wrapper delegates when either flag false; § 4 AC-R34-14 (config flag false) + AC-R34-15 (freezeState inactive) confirm.** Single consistent prescription per branch.
- **§ 5 ALLOWED_SET regex `^coordination\/diagnostics\/DIAGNOSTIC-R34-.*\.md$` + halt conditions § 7 prescribe DIAGNOSTIC creation.** Consistent (no contradiction with AC-R34-19 anti-scope: DIAGNOSTIC files are explicitly carved out).
- **§ 0.1 OQ-W3-3 = B (defer to WU-07) + § 5 anti-scope hard limit "NO modification of coordination/SCOPING-MEMO-v0.3.md"**: consistent.

No internal contradictions found.

### 9.9 Anti-scope ALLOWED_SET completeness pass (per R29 + R25 MAJOR-2 reinforcement)

Every file the Implementer will create/modify across the full R34 chain (Architect-spec-emit → chore-A → impl-and-test → chore-B → Reviewer-routing) is in § 5 ALLOWED_SET ∪ regex carve-outs:

- Architect-emit: Q-R34-SPEC.md + Q-R34-SPEC-AUDIT.md (literal in ALLOWED_SET); NEXT-ROLE.md (literal); MEMORIAL.md (regex carve-out).
- Implementer chore-A: 3 new engine/events/* files (literal); config.ts (literal); VENDORING-MANIFEST.md (literal); test file (literal); substrate (literal); evidence file (literal); NEXT-ROLE.md (literal). Plus .js compiled outputs for the test + substrate (literal).
- Implementer halt (conditional): DIAGNOSTIC-R34-*.md (regex carve-out).
- Reviewer post-chore-B: REVIEWER-REPORT-R34.md (regex carve-out).
- Memorial-Updater post-Reviewer: ROUND-R34-SUMMARY.md (regex carve-out); MEMORIAL.md append (regex carve-out); potentially CLAUDE-*.md REINFORCED lines (NOT in allowed-set — see anti-scope MR-2 deferral; the Memorial-Updater's CLAUDE-*.md write is OUT-OF-SCOPE for R34 per "NO modification of CLAUDE-IMPLEMENTER.md" in § 5.2 hard limits; this means Memorial-Updater's typical reinforcement append-step is NOT in this round's allowed-set — the Memorial-Updater can write to MEMORIAL.md (carve-out) but NOT to CLAUDE-IMPLEMENTER.md/CLAUDE-ARCHITECT.md/etc.

**Caveat acknowledged**: Memorial-Updater historically appends REINFORCED lines to CLAUDE-*.md files. Per round-scope directive § Anti-scope: "NO CLAUDE-IMPLEMENTER.md consolidation (operator-triggered MR-2 staged for Phase 2 close)" — this is about *consolidation*, not about *appending* REINFORCED lines. The two are different operations. **Disposition**: a REINFORCED-line append to a CLAUDE-*.md file at R34 close would fail AC-R34-19 unless explicitly carved out. **Decision**: The Memorial-Updater at R34 close MUST EITHER (a) hold off on CLAUDE-*.md REINFORCED appends if no new violation/confirmation patterns surfaced in R34, OR (b) treat the append as out-of-scope per the MR-2 staging note and route the pattern to STAGED-FOR-PHASE-2-CLOSE.md. The spec does NOT add CLAUDE-*.md to the ALLOWED_SET regex carve-outs because the Memorial-Updater convention is project-wide and would re-introduce the R29 MINOR-2 forward-coverage gap if added unconditionally. This decision is explicitly flagged in § 9.9 for cold-Reviewer audit.

No other file modifications required across the R34 chain.

---

_End of Q-R34-SPEC.md. Audit-sidecar at `Q-R34-SPEC-AUDIT.md` contains P3 ten-axis verification + decision rationale + Architect pre-predictions + brainstorm enumeration._
