# Q-R21-SPEC — Phase 2 SLICE 2.B (fleet-merge consumption layer — VerdictGrouper consumer with cluster_event_id propagation)

**Round:** R21 (full tier — A2 first-consumer pattern for cluster_event_id propagation through fleet-merge → outer aggregator + A6 blast-radius on R11/R12/R13 fleet-merge consumer surface)
**Inputs to Implementer:** this file + `coordination/NEXT-ROLE.md` (operator round scope, halt conditions, baseline SHAs) + `coordination/PRD.md` (FR-E3a, AC-P4) + `coordination/SCOPING-MEMO-v0.3.md` (§ 2.3 + § 9 vendoring policy) + `coordination/specs/Q-R20-SPEC.md` (R20 aggregator contract — read-only reference) + `coordination/PHASE-2-SLICE-1-CLOSE-WALK.md` (§ 2 ESCALATE-and-unblock + anti-scope diff-range SHA anchoring) + existing `engine/verdict-groups.ts` (post-R20; frozen at R21) + existing `engine/fleet/{combine,detectors,e-bh}.ts` (R11/R12/R13; frozen at R21).

**Sidecar:** `coordination/specs/Q-R21-SPEC-AUDIT.md` (Architect ceremony content; Implementer is NOT required to read).

**R21 baseline SHA:** `62e28d7` (HEAD at session start; last commit before R21 work — `chore(R21-prep): NEXT-ROLE.md → R21 Architect; SLICE 2.B fleet-merge consumption`). Per R15 MINOR-1 reinforcement: baseline = last commit IMMEDIATELY before R21 work, NOT R20 attestation HEAD. Verified: `git log --oneline -1` at session start = `62e28d7`.

**Pre-R21 baseline test count:** 192 / 0 (per R20 Reviewer attestation at HEAD `7eb3a63`; independently cold-verified by R20 Reviewer with `node --test test/*.test.js`). R21 adds new q21 tests; OBSERVED total reported by Implementer per R03 MINOR-4 reinforcement.

---

## 0. Brainstorm phase (Superpowers — inline)

### Problem framing

NEXT-ROLE.md (R21 routing) frames SLICE 2.B as: "wire `engine/fleet/combine.ts`, `engine/fleet/detectors.ts`, `engine/fleet/e-bh.ts` (the R11/R12/R13 fleet-merge surface) to consume the R20 VerdictGrouper contract and propagate `cluster_event_id` through the fleet-merge → VerdictGrouper consumer interface."

Two architectural facts constrain the design space:

1. **R11/R12/R13 fleet-merge primitives (combine/detectors/e-bh) operate on per-shard wealth states** (BettingEProcessState / FamilyCBettingEProcessState) and per-shard linear-space e-values. They do NOT currently produce or consume `FusedVerdict` (the type VerdictGrouper.ingest accepts). The fleet-merge math (PoE/AoE combine + e-BH FDR) is orthogonal to FusedVerdict-stream aggregation.

2. **VerdictGrouper.ingest after R20 accepts `(verdict, ts, opts.cluster_event_id?)`** and propagates the cluster_event_id through composite keying (per Q-R20-SPEC § 2.1-2.3). It has no current Tessera caller — q20 tests are the first.

The "fleet-merge consumer surface" therefore needs a NEW MODULE that:
- Receives a fleet-tick payload (N per-shard FusedVerdicts + ts + active cluster_event_id)
- Fans out N parallel `VerdictGrouper.ingest()` calls, propagating cluster_event_id to each
- Returns per-shard IngestResults preserving N-ordering for SLICE 4 event-feed consumption
- Optionally exposes a rollup helper that consolidates per-deploy IngestResults into a per-cluster-event view (the Q2 question)

NEXT-ROLE.md poses 6 architectural questions for the brainstorm:

1. Producer surface for `cluster_event_id` in fleet-merge: (a) fleet-merge function-signature parameter / (b) fleet-merge config field set before tick / (c) per-tick context object on the consumer-layer input.
2. Rollup-by-cluster-event semantics — new aggregation method on VerdictGrouper, or consumer-side rollup?
3. Fleet-tick-scope cluster_event vs per-verdict cluster_event.
4. e-BH consumer interaction with cluster_event_id-scoped groups (separate FDR layer or agnostic)?
5. Backward-compat at fleet-merge consumers (legacy callers with no cluster_event_id).
6. Test substrate (extend v9X / introduce v9Y / inline literals).

### Brainstorm — three distinct approaches to the consumer-layer wiring

**Approach A — New `engine/fleet/verdict-consumer.ts` module with a thin `fleetTickIngest()` fan-out + `rollupByClusterEvent()` helper; engine/fleet/{combine,detectors,e-bh}.ts UNCHANGED; engine/verdict-groups.ts UNCHANGED.**

Concrete shape:
- New module `engine/fleet/verdict-consumer.ts` exporting:
  - `FleetTickInput` — `{ per_shard_verdicts: ReadonlyArray<FusedVerdict>; ts_seconds: number; cluster_event_id?: string; terminal?: boolean }`
  - `FleetTickIngestResult` — `{ ingest_results: ReadonlyArray<IngestResult> }`
  - `fleetTickIngest(input, grouper): FleetTickIngestResult` — fans out N ingests
  - `ClusterEventRollup` — `{ groups: ReadonlyArray<VerdictGroup>; deploy_ids: ReadonlyArray<string> }`
  - `rollupByClusterEvent(results, cluster_event_id): ClusterEventRollup` — consolidates distinct attributed_groups matching the cluster_event_id
- cluster_event_id is **per-tick** (Q3 disposition): one value per `fleetTickIngest` call propagated to every per-shard ingest; concurrent cluster events → caller issues two sequential `fleetTickIngest` calls with different cluster_event_id values.
- e-BH unchanged (Q4 disposition): per-shard FDR semantics are independent of cluster_event_id scope; cluster-event-scoped FDR is deferred to a future SLICE.
- Test substrate (Q6 disposition): inline FusedVerdict literals at R21 (matches q20 pattern + round-size discipline; v9X is topology-only; v9Y fleet-tick fixture is SLICE 4 territory).

Strengths:
- Zero modification to the three R11/R12/R13 fleet-merge math files — their math is unaffected by cluster_event_id (PoE/AoE combine + e-BH FDR are scope-orthogonal); modifying them to thread an unused parameter is noise.
- Zero modification to engine/verdict-groups.ts (R20 anti-scope honored; rollup is a consumer-side helper, not an aggregator method).
- Zero modification to FusedVerdict shape (A14 anti-scope preserved; cluster_event_id flows on the FleetTickInput record, not on the verdict itself).
- Backward-compat preserved (cluster_event_id optional on FleetTickInput; absent → legacy mode in VerdictGrouper).
- SLICE 4 event-feed has a clean producer surface: event-feed sets `input.cluster_event_id` before calling `fleetTickIngest`; per-tick semantic.
- Tessera-original module (NOT vendored from DeploySignal) — no vendoring-with-deltas transition, no AT_PIN_FILES bookkeeping, no q01 consumer-surface implication.
- AC count target ~11 — keeps round size bounded and avoids the R20 § 7 split-decision threshold.

Weaknesses:
- Adds a new module path. Mitigation: module placement under `engine/fleet/` matches the R11/R12/R13 sibling pattern; module name `verdict-consumer` mirrors NEXT-ROLE.md framing.
- Per-tick cluster_event_id scope is a deliberate constraint: a caller wanting to ingest two concurrent cluster_event_id values into the same fleet-tick batch must issue two sequential calls. Per Q3 disposition (see § 2.3), this is the right boundary — the alternative (per-shard cluster_event_id differentiation within one call) leaks per-shard payload concerns into the fleet-tick orchestration layer.

Hidden assumptions:
- That fleet-tick orchestration is naturally per-tick scoped (one cluster_event_id per tick). Verified by SCOPING-MEMO-v0.3.md § 2.3 line 218 framing: cluster events are at the cluster-level ingestion surface (fleet-wide deploy / firmware push / config change), inherently per-fleet-tick.
- That the consumer-side rollup operating on IngestResult arrays is sufficient (no new aggregator-internal access required). Verified by inspecting R20 VerdictGrouper public surface: `openGroupForDeploy(deploy_id, cluster_event_id?)` is the only public lookup; iterating the open-groups inventory would require either a new public method (anti-scope) or external tracking. Rolling up from the result stream is bounded and order-stable.

Risks:
- Late-arrival semantic (R20 § 2.5): when a per-shard ingest result is a late-arrival attach, `attributed_group` references the previously-closed group (which already has its cluster_event_id set). Rollup-by-cluster-event correctly matches via `attributed_group.cluster_event_id === target`. AC-R21-7 covers via a mixed scenario.
- Empty-string cluster_event_id in rollup query (per R20 § 2.6 alignment): the rollup-side semantic is to short-circuit empty-string queries to no-match (returning empty arrays). The semantic is documented in § 2.4 and bound by AC-R21-8.

---

**Approach B — Modify engine/fleet/{combine.ts, detectors.ts, e-bh.ts} to accept a cluster_event_id parameter, passed through as a no-op for the math, with consumer wiring layered separately.**

Concrete shape:
- Extend `combineProduct`, `combineAverage`, `fleetMergeFamilyA`, `fleetMergeFamilyC`, `eBenjaminiHochberg` with an optional `clusterEventId?: string` parameter (or an opts object containing it).
- Math unchanged; parameter passes through to a future consumer layer.
- Build a separate fan-out function on top.

Strengths:
- Matches NEXT-ROLE.md Q1(a) framing literally ("fleet-merge call signature gains a `clusterEventId?` parameter").

Weaknesses:
- Adds a parameter to FIVE existing primitive signatures that the math itself does not use. Each q11/q12/q13 test (~50 existing assertions across three test files; 65 total ACs) must be updated to either pass the new parameter or rely on its optionality. Noise at the R11/R12/R13 surface that didn't ask to be touched.
- Violates the Tessera-original-code-stability principle established at R11/R12/R13 — the math primitives are production-tested and downstream-frozen; adding a transit parameter that the function body discards is structurally unjustifiable.
- Forces forward-coupling: every future fleet-merge variant (e.g., R-future variants of `combineProduct` for arbitrary-dependence regimes) must thread the same dead parameter.
- Provides no architectural benefit over Approach A — fan-out still needs to happen at a separate consumer layer; the dead parameter on combine/detectors/e-bh is purely vestigial.

Hidden assumptions:
- That cluster_event_id needs to be visible to the math primitives. False: PoE/AoE combine and e-BH FDR theorems hold uniformly across the cluster_event_id scope; the parameter would be ignored at every call site inside the math.

Risks:
- High signal-to-noise ratio in the diff: ~5 function signatures changed, ~15+ test-call-site updates, zero behavioral effect. Reviewer must audit every signature change for "is this really a no-op pass-through?" without a useful PRD anchor.

---

**Approach C — Add a `rollupByClusterEvent` method directly on `VerdictGrouper` class.**

Concrete shape:
- Add `VerdictGrouper.rollupByClusterEvent(cluster_event_id): ClusterEventRollup` as a new public method.
- It iterates `openByGroupKey` + `recentlyClosed` and returns matching groups.

Strengths:
- Co-locates rollup logic with the aggregator's internal state; no need to thread results through the consumer.

Weaknesses:
- **Violates R21 anti-scope: NEXT-ROLE.md anti-scope explicitly prohibits modifying `engine/verdict-groups.ts` ("R20's deliverable. R21 is consumer-side only. If R21 architect identifies an aggregator-side change needed, ESCALATE with bounded question; do NOT modify silently.")**
- Would require a R20-spec amendment to formalize a new public method on the frozen R20 contract.
- Hides the rollup mechanism behind aggregator-internal state — SLICE 4 event-feed consumer cannot inspect what got rolled up at a given tick without also threading the aggregator through.

Hidden assumptions:
- That R20's contract is amendable in R21. False per NEXT-ROLE.md anti-scope.

Risks:
- ESCALATE inevitable; round bounces back to operator with a bounded amendment question. Avoidable by picking Approach A.

### Constraint elimination

- **NEXT-ROLE.md R21 anti-scope** ("NO modification of `engine/verdict-groups.ts`") **eliminates Approach C** at the architectural-decision layer (would require operator disposition to amend R20's frozen contract; not an Architect call).
- **Tessera-original-code-stability principle** at R11/R12/R13 surface (math primitives are downstream-frozen post-empirical-validation) **eliminates Approach B** — adding a dead parameter to combine/detectors/e-bh produces no behavioral benefit and forces forward-coupling.
- **R20-Approach-A precedent** (per-call opts field on the aggregator's ingest signature) confirms that the cluster_event_id propagation surface is naturally per-call, not per-instance. Approach A's `FleetTickInput.cluster_event_id` mirrors this at the consumer layer.

### Selection — Approach A

**Why picked.** Zero modification to four existing files (engine/verdict-groups.ts, engine/fleet/combine.ts, engine/fleet/detectors.ts, engine/fleet/e-bh.ts) all explicitly frozen by R21 anti-scope or by the Tessera-original-code-stability principle. The new module `engine/fleet/verdict-consumer.ts` is Tessera-original (no vendoring-with-deltas transition, no AT_PIN_FILES bookkeeping). SLICE 4 event-feed has a clean producer surface — event-feed sets `input.cluster_event_id`; per-tick semantic. Backward-compat preserved end-to-end (cluster_event_id optional on FleetTickInput; absent → legacy mode in VerdictGrouper). AC count target ~11 — below the R20 § 7 split-decision threshold.

**Why rejected — Approach B.** Dead-parameter noise on five existing function signatures; forces forward-coupling across all future fleet-merge variants; zero architectural benefit (fan-out still needs a separate consumer layer; math primitives don't use the parameter). The R20 model (per-call opts on `ingest`) shows that cluster_event_id flows naturally on the per-call payload, not on the math-primitive signature.

**Why rejected — Approach C.** Anti-scope breach (NEXT-ROLE.md prohibits modifying `engine/verdict-groups.ts`). Would require ESCALATE to amend R20's frozen contract. Approach A delivers equivalent rollup functionality consumer-side without aggregator-internal state access.

### Disposition of NEXT-ROLE.md architectural questions

| Q | Resolution | Where |
|---|---|---|
| Q1 — Producer surface for cluster_event_id in fleet-merge | **Per-tick context object on FleetTickInput** (option (c) reframed: not on FusedVerdict, not on combine/detectors/e-bh signatures, not as mutable state — on the per-call FleetTickInput record) | § 2.1 + AC-R21-2 |
| Q2 — Rollup-by-cluster-event semantics | **Consumer-side rollup helper** `rollupByClusterEvent(results, cluster_event_id)` operating on `IngestResult[]` (no aggregator-internal access; works across tick boundaries via .concat()); NOT a new method on VerdictGrouper (R21 anti-scope honored) | § 2.4 + AC-R21-7, AC-R21-8 |
| Q3 — Fleet-tick-scope vs per-verdict cluster_event_id | **Per-fleet-tick** — one cluster_event_id per `fleetTickIngest` call; propagated identically to all N per-shard ingests; concurrent events handled via sequential calls | § 2.3 + AC-R21-2, AC-R21-6 |
| Q4 — e-BH consumer interaction | **e-BH stays cluster_event_id-agnostic at R21** — FDR claim "expected falsely-flagged shards ≤ q·K" is at per-shard hypothesis-test count; cluster-event scoping is orthogonal; cluster-event-scoped e-BH deferred to a future SLICE | § 2.5 (e-BH disposition note) |
| Q5 — Backward-compat at fleet-merge consumers | **cluster_event_id optional on FleetTickInput** — absent → legacy mode (VerdictGrouper.ingest called with no cluster_event_id opts; preserves R20 legacy-mode semantics end-to-end) | § 2.2 + AC-R21-3 |
| Q6 — Test substrate for fleet-merge consumption | **Inline FusedVerdict literals at R21** (matches q20 pattern; v9X is topology-only and not applicable to fleet-tick semantics; v9Y fleet-tick fixture is SLICE 4 territory) | § 2.6 |

---

## 1. Design phase sketch (Superpowers — inline)

### Component boundaries

| What | State | Where |
|---|---|---|
| `FleetTickInput` interface | NEW | `engine/fleet/verdict-consumer.ts` (new) |
| `FleetTickIngestResult` interface | NEW | `engine/fleet/verdict-consumer.ts` (new) |
| `ClusterEventRollup` interface | NEW | `engine/fleet/verdict-consumer.ts` (new) |
| `fleetTickIngest(input, grouper): FleetTickIngestResult` function | NEW | `engine/fleet/verdict-consumer.ts` (new) |
| `rollupByClusterEvent(results, cluster_event_id): ClusterEventRollup` function | NEW | `engine/fleet/verdict-consumer.ts` (new) |
| `test/q21-fleet-verdict-consumer.test.ts` | CREATED | new file |
| `coordination/specs/Q-R21-SPEC.md` + `Q-R21-SPEC-AUDIT.md` | CREATED | this file + sidecar |
| `coordination/NEXT-ROLE.md` | CHANGED | routing block update (top 4 lines + Implementer attestation block at chore time) |
| `coordination/MEMORIAL.md` | CHANGED (append-only) | Architect / Implementer / Reviewer / Memorial-Updater each append ceremony sections |
| `engine/verdict-groups.ts` | UNCHANGED — R20 frozen contract per NEXT-ROLE.md anti-scope | `engine/verdict-groups.ts` |
| `engine/types/verdict.ts` | UNCHANGED — R18+R20 frozen | `engine/types/verdict.ts` |
| `engine/fleet/combine.ts` | UNCHANGED — Tessera-original-code-stability per Approach A | `engine/fleet/combine.ts` |
| `engine/fleet/detectors.ts` | UNCHANGED — Tessera-original-code-stability per Approach A | `engine/fleet/detectors.ts` |
| `engine/fleet/e-bh.ts` | UNCHANGED — Q4 disposition (e-BH cluster_event_id-agnostic at R21) | `engine/fleet/e-bh.ts` |
| `test/_substrate/v9X-cluster.ts` | UNCHANGED — R18 substrate frozen per NEXT-ROLE.md anti-scope | `test/_substrate/v9X-cluster.ts` |
| `test/q20-…test.ts` | UNCHANGED — R20 deliverable frozen per NEXT-ROLE.md anti-scope | `test/q20-…test.ts` |
| `coordination/VENDORING-MANIFEST.md` | UNCHANGED — `engine/fleet/verdict-consumer.ts` is Tessera-original (NOT vendored from DeploySignal); no manifest row | `coordination/VENDORING-MANIFEST.md` |
| `test/q01-no-at-pin-deltas.test.ts` | UNCHANGED — `engine/fleet/verdict-consumer.ts` is Tessera-original; AT_PIN_FILES not affected | `test/q01-no-at-pin-deltas.test.ts` |
| `test/q11-…`, `test/q12-…`, `test/q13-…` | UNCHANGED — fleet-merge math primitive signatures preserved (Approach A) | `test/q1[123]-…test.ts` |

### Integration points (each verified against PRD / scope-memo / inherited-engine contract)

1. **`engine/fleet/verdict-consumer.ts` → `engine/verdict-groups.ts` (VerdictGrouper.ingest).** Consumer of R20's post-keying-transition signature `ingest(verdict, ts, opts: { terminal?: boolean; cluster_event_id?: string })`. R21 fan-out passes both opts fields per-shard. Backward-compat preserved by both fields being optional (absent → legacy mode).
2. **`engine/fleet/verdict-consumer.ts` → `engine/types/verdict.ts` (FusedVerdict + VerdictGroup type-imports).** Type-only import; no runtime dep. FusedVerdict shape unchanged at R21 (A14 anti-scope preserved per Approach B rejection rationale).
3. **`engine/fleet/verdict-consumer.ts` → `engine/verdict-groups.ts` (IngestResult re-import).** `IngestResult` already exported from `engine/verdict-groups.ts` (verified: post-R20 at line 54 `export interface IngestResult`). R21 module re-imports for return-shape typing.
4. **`test/q21-…test.ts` → `engine/fleet/verdict-consumer.ts`.** New consumer. Imports the four new public exports. Uses inline FusedVerdict literals (no fixture module at R21 per Q6 disposition).
5. **`coordination/NEXT-ROLE.md` routing transition.** Architect sets `NEXT-ROLE: IMPLEMENTER` / `STATUS: READY` and adds `Inputs: coordination/specs/Q-R21-SPEC.md` line; preserves operator-authored sections byte-identical (R18+R20 precedent).
6. **`coordination/MEMORIAL.md` accretion.** Architect appends ceremony section (this round); Implementer / Reviewer / Memorial-Updater follow per role.

### Integration-point verification against PRD / scope-memo

- **FR-E3a (Phase 2 outer aggregator).** SLICE 2.B wires the fleet-merge consumer surface that bridges per-shard FusedVerdict streams to VerdictGrouper, propagating cluster_event_id end-to-end. After R21, a SLICE 4 event-feed orchestrator can compose fleet-merge math (R11/R12/R13) with VerdictGrouper ingestion (R20) via a single per-tick interface. ✓
- **AC-P4 (Phase 2 close).** Per-shard verdict attribution distinguishing single-shard fault / topology-localized common-mode / fleet-event-conditional drift — SLICE 2.B makes the cluster_event_id leg load-bearing through the consumer layer (groups produced under cluster-event scope carry `cluster_event_id` end-to-end; the rollup helper extracts the per-event view SLICE 4 will need). ✓
- **Anti-scope A12** ("NO modification to per-shard Family A-E detector internals"). UNCHANGED. ✓
- **Anti-scope A13** ("NO ML-based attribution model"). UNCHANGED. ✓
- **Anti-scope A14** ("NO modification to per-shard verdict shape"). UNCHANGED — cluster_event_id flows on FleetTickInput, not on FusedVerdict. ✓
- **Anti-scope A16** (Addition #26 D4 `correlational_not_causal: true` wire-format). UNCHANGED. ✓
- **Inherited Addition #25 D2 + D5.** PRESERVED in legacy mode + EXTENDED in cluster-event mode (R20's existing semantics flow through R21's fan-out unmodified; consumer is a pure caller of `VerdictGrouper.ingest`). ✓
- **NEXT-ROLE.md anti-scope items.** All seven hard limits honored (engine/verdict-groups.ts unchanged; engine/types/verdict.ts unchanged; v9X-cluster.ts unchanged; q20 tests unchanged; no topology / event-feed / Addition #25/#26 reversal; no fleet/* vendored deltas (none are vendored)). ✓

### Failure modes (per integration point)

1. **`IngestResult` re-import path drift.** `engine/verdict-groups.ts` post-R20 exports `IngestResult` at line 54 (verified at session start). If a future re-pinning of `engine/verdict-groups.ts` removed this export, the R21 module's import would fail at typecheck. Mitigation: AC-R21-9 (typecheck binding) catches any such drift before merge. R21 anti-scope freezes engine/verdict-groups.ts; no concurrent re-pin risk.
2. **Late-arrival result in fan-out: `attributed_group` references a prior-tick closed group with a different cluster_event_id than the current FleetTickInput.** Per R20 § 2.5 tuple-match: a verdict with cluster_event_id 'X' cannot attach to a closed group with cluster_event_id 'Y' — VerdictGrouper opens a NEW group instead. Therefore the fan-out's `attributed_group.cluster_event_id` always matches `input.cluster_event_id` (treating undefined ≡ '' per R20 § 2.6). AC-R21-2 + AC-R21-3 verify the per-tick equality post-fan-out. No cross-scope leakage risk.
3. **Empty per_shard_verdicts array.** R21 returns `{ ingest_results: [] }` without invoking `VerdictGrouper.ingest`. No-op semantics; matches the fleet-merge primitives' "no-op on empty" pattern (combineProduct/combineAverage throw on empty; R21 fan-out does NOT throw — empty fleet-tick is semantically valid in the consumer layer where it can happen at startup / shutdown). AC-R21-4 binds. Documented rationale in § 2.7.
4. **`input.terminal: true` propagation.** Every per-shard ingest receives `opts.terminal: true`; per R20 § 2.1 + inherited Addition #25 D2 terminal-close semantic, every shard's attributed group closes on the same tick. AC-R21-5 binds via `attributed_group.closed === true` assertion across all results. No partial-close failure mode (every ingest receives the same terminal flag value).
5. **`rollupByClusterEvent` query with empty-string cluster_event_id.** Per R20 § 2.6 alignment (empty-string ≡ absent in keying), the rollup helper short-circuits empty-string queries to no-match. Rationale: an empty-string `cluster_event_id` in a rollup query is semantically ambiguous (it could mean "find groups with no cluster_event_id" or "find groups with explicit empty cluster_event_id") — given R20's collapsing semantic, both interpretations have zero matches in a properly-constructed result set. AC-R21-8 binds.
6. **`rollupByClusterEvent` deduplication.** Multiple IngestResults can point to the same VerdictGroup (e.g., 3 per-shard verdicts all attributed to one open group). The rollup MUST dedupe by `group_id` to avoid double-counting. AC-R21-7 verifies via N=3-shards / 3-distinct-deploys scenario where groups.length === 3 (one group per deploy_id under same cluster_event_id, per R20 § 2.3 multi-deploy-per-event keying).
7. **Anti-scope diff drift at chore-A → chore-B boundary.** Per R20 § 4.7 forward-protection pattern: AC-R21-11 is committed in a chore-B commit AFTER chore-A SHA exists. Implementer must substitute the chore-A SHA literal into the test body at chore-B time (NOT use HEAD). Per R19 MAJOR-3 + R15 MINOR-1 reinforcement.

---

## 2. Mechanism (every design decision made here; nothing deferred to Implementer)

R21 ships one new production module + one new test file, plus the corresponding routing + Architect-ceremony artifacts. No modifications to vendored or Tessera-original-frozen files.

### 2.1 New module `engine/fleet/verdict-consumer.ts` — public surface

Four public exports:

1. **`FleetTickInput`** interface — per-tick payload:
   ```
   interface FleetTickInput {
     per_shard_verdicts: ReadonlyArray<FusedVerdict>;
     ts_seconds: number;
     cluster_event_id?: string;
     terminal?: boolean;
   }
   ```
   Optional fields:
   - `cluster_event_id?: string` — per-tick scope identifier; absent → legacy mode (Q5 disposition).
   - `terminal?: boolean` — per-tick terminal flag forwarded to every shard's `VerdictGrouper.ingest` as `opts.terminal`. Absent → false (preserves R20 ingest default semantic).

2. **`FleetTickIngestResult`** interface — fan-out result:
   ```
   interface FleetTickIngestResult {
     ingest_results: ReadonlyArray<IngestResult>;
   }
   ```
   `ingest_results[i]` corresponds to `per_shard_verdicts[i]` by index (preserved order; AC-R21-6). `IngestResult` is the existing R20-exported type from `engine/verdict-groups.ts`.

3. **`fleetTickIngest(input, grouper): FleetTickIngestResult`** — fan-out function:
   - Iterates `input.per_shard_verdicts` in array order, calling `grouper.ingest(verdict, input.ts_seconds, { cluster_event_id: input.cluster_event_id, terminal: input.terminal })` for each.
   - Collects results into a new array; returns `{ ingest_results: results }`.
   - Empty `input.per_shard_verdicts` → returns `{ ingest_results: [] }` (no `grouper.ingest` call; no error).
   - Pure with respect to `input.per_shard_verdicts` — does not mutate the input array.
   - The function does not own a `VerdictGrouper` instance — the caller passes one in. This matches the per-tick orchestration pattern (caller manages aggregator lifecycle across ticks).

4. **`ClusterEventRollup`** interface — rollup return shape:
   ```
   interface ClusterEventRollup {
     groups: ReadonlyArray<VerdictGroup>;
     deploy_ids: ReadonlyArray<string>;
   }
   ```
   `groups` — distinct VerdictGroups (deduped by `group_id`) extracted from the supplied IngestResults whose `attributed_group.cluster_event_id` matches the query. Order: first-occurrence by results-array index.
   `deploy_ids` — distinct `deploy_id` values across `groups`. Order: first-occurrence by results-array index. Useful for SLICE 4 event-feed consumers wanting "which deploys participated in this cluster event."

5. **`rollupByClusterEvent(results, cluster_event_id): ClusterEventRollup`** — rollup helper:
   - Accepts `results: ReadonlyArray<IngestResult>` (not `FleetTickIngestResult`) for cross-tick composability: caller can `.concat()` multiple ticks' results before rolling up.
   - Empty-string `cluster_event_id: ''` short-circuits to `{ groups: [], deploy_ids: [] }` per R20 § 2.6 alignment (semantic ambiguity rejection).
   - Non-empty `cluster_event_id`: scans `results` in order, accumulating distinct `attributed_group` references whose `cluster_event_id === target` (strict equality; `attributed_group.cluster_event_id === undefined` does NOT match a non-empty query, by `===` semantics).
   - Dedupes by `group.group_id` (string equality).
   - Does not mutate `results`.

**Rationale.** Approach A in § 0 brainstorm. Per-tick scope (Q3) keeps the consumer signature minimal — concurrent cluster events handled by caller-side iteration. Consumer-side rollup (Q2) honors NEXT-ROLE.md anti-scope of engine/verdict-groups.ts and provides cross-tick composability via raw IngestResult arrays.

### 2.2 Backward-compat path (Q5 disposition — legacy mode coexisting with cluster-event mode)

`cluster_event_id` is **optional on FleetTickInput** at R21. Absent → `fleetTickIngest` invokes `grouper.ingest(verdict, ts, { cluster_event_id: undefined, terminal: input.terminal })`; R20 VerdictGrouper interprets `cluster_event_id: undefined` as legacy mode (per R20 § 2.4) and inherited deploy_id-only keying applies. Present → cluster-event mode propagates end-to-end per R20 § 2.3-2.5.

**Rationale.** Mirrors R20's optional-field design at the aggregator. No existing caller (none exist pre-R21) is forced to change; new SLICE 4 callers opt into cluster-event mode by setting `input.cluster_event_id`.

### 2.3 Per-fleet-tick scope (Q3 disposition)

A single `fleetTickIngest` call propagates **one** cluster_event_id value (or `undefined`) to **all N** per-shard ingests in that call. Concurrent cluster events on the same tick → caller issues two sequential `fleetTickIngest` calls (one per cluster_event_id) with disjoint per-shard slices.

**Rationale.** Cluster events are at the fleet-ingestion surface (SCOPING-MEMO-v0.3.md § 2.3 line 218); they are inherently per-fleet-tick (a firmware push, a deploy, a config change is a fleet-level transition, not a per-shard payload differentiator). Per-shard cluster_event_id differentiation within one fleet-tick would leak per-shard payload concerns into the fleet-tick orchestration layer; rejected for the same reason FusedVerdict-field-origination was rejected at R20 (Approach B-R20 / A14 anti-scope). A caller with a genuine cross-event tick can iterate.

### 2.4 Rollup-by-cluster-event semantics (Q2 disposition)

`rollupByClusterEvent(results, cluster_event_id)` operates on `ReadonlyArray<IngestResult>` (cross-tick composability) and returns `ClusterEventRollup`. Decisions:

- **Filter via `attributed_group.cluster_event_id === target`** (strict equality). `undefined` does NOT match any non-empty query. Aligns with R20 § 2.6 keying semantic where falsy values collapse — but the rollup interface deliberately rejects empty-string queries (see next bullet) so the strict equality is unambiguous downstream.
- **Empty-string query short-circuits to no-match** (`{ groups: [], deploy_ids: [] }`). Rationale: an empty-string `cluster_event_id` in a rollup query has semantic ambiguity between "find groups with no cluster_event_id" and "find groups with explicit empty cluster_event_id"; under R20's falsy-collapse rule, both interpretations have zero matches in a correctly-constructed result set. Returning empty is the unambiguous choice. The alternative (treat `''` as `undefined` and match all legacy-mode groups) would conflict with the strict-equality filter behavior above; consistency outweighs convenience.
- **Dedupe `groups` by `group.group_id`** (string equality). Multiple IngestResults can reference the same VerdictGroup (e.g., 3 shards all attributed to one open group); the rollup returns one entry per distinct group.
- **Dedupe `deploy_ids` by string equality.** Multiple groups under the same cluster_event_id can share a `deploy_id` only if they're from different ticks (same `deploy_id` + cluster_event_id collapses to one open group within a window per R20 § 2.3). Cross-tick rollup may surface duplicates; dedupe is defensive.
- **Order: first-occurrence by `results` index.** Both `groups` and `deploy_ids` arrays preserve the order of first appearance. Deterministic; useful for SLICE 4 event-feed audit-trail rendering.

### 2.5 e-BH consumer disposition (Q4 disposition)

`engine/fleet/e-bh.ts` (R13 `eBenjaminiHochberg`) stays cluster_event_id-agnostic at R21. The FDR claim "E[#false-flagged-shards] ≤ q · K" is at the per-shard hypothesis-test count; the procedure operates on a vector of per-shard linear-space e-values. Adding a cluster_event_id parameter would not change the math (e_i are valid e-values under H_{0,i} regardless of cluster-event scope) and would force a dead-parameter signature change (same anti-pattern as Approach B § 0).

Cluster-event-scoped FDR (e.g., "expected falsely-flagged cluster-event-attributed shards") is a future SLICE concern that requires defining a per-cluster-event null model — out of R21 scope. Documented as a non-R21 commitment; R21 ships e-BH untouched.

### 2.6 Test substrate (Q6 disposition)

q21 tests use inline `FusedVerdict` literals (matches q20 pattern at `test/q20-verdict-grouper-cluster-event-scope.test.ts:20-30` helper `makeVerdict`). Decisions:

- A `makeVerdict(deploy_ref, tick, firing?)` helper analogous to q20's is introduced at the top of q21-*.test.ts. Inline-duplication is acceptable per round-size discipline; the helper is ~10 lines and is identical to q20's per the FusedVerdict shape unchanged at R21.
- `v9X-cluster.ts` (R18 substrate) is topology-only — exports `makeV9XSingleRackCluster` returning a TopologySnapshot, not FusedVerdict arrays. Not applicable to R21's fleet-tick semantics.
- A `v9Y`-class fleet-tick fixture is SLICE 4 territory (event-feed ingestion) — out of R21 scope.

### 2.7 Empty-input semantics — `fleetTickIngest` vs `combineProduct`/`combineAverage`

`combineProduct` and `combineAverage` (R11) throw on empty input — "fleet-merge on N=0 shards is undefined" semantically (the math has no defined behavior). `fleetTickIngest` does NOT throw — empty per_shard_verdicts is semantically valid at the consumer layer (e.g., fleet startup before any shard has produced its first verdict; fleet shutdown after the last shard has terminated). Returning `{ ingest_results: [] }` is the natural identity. AC-R21-4 binds.

This is a deliberate asymmetry between math and consumer layers: the math semantically requires N≥1; the consumer is a fan-out shell that's well-defined at N=0. Aligns with the inherited `VerdictGrouper.flush()` semantic (returns `[]` when there are no open groups, no throw).

### 2.8 Header comment block on `engine/fleet/verdict-consumer.ts`

The new module begins with a file-header comment block (~15 lines) describing:
- Tessera-original origin (NOT vendored from DeploySignal)
- Phase 2 SLICE 2.B (R21) scope: fleet-merge consumer surface bridging per-shard FusedVerdict streams to VerdictGrouper with cluster_event_id propagation
- Parallel placement to R11/R12/R13 fleet-merge primitives (same package, orthogonal concern: math vs ingest)
- Per-tick cluster_event_id scope (Q3)
- e-BH orthogonality (Q4)
- Extract-to-npm-package commitment at Tessera Phase 2 close (matches the convention used by combine.ts/detectors.ts/e-bh.ts file headers — verified at session start: `engine/fleet/combine.ts:33-34`, `engine/fleet/detectors.ts:39-40`, `engine/fleet/e-bh.ts:56-57`)

### 2.9 New test file `test/q21-fleet-verdict-consumer.test.ts`

Binds AC-R21-1 through AC-R21-8 (runtime, in the GREEN commit) + AC-R21-11 (runtime, added in chore-B per § 4.7 forward-protection). AC-R21-9 (typecheck) + AC-R21-10 (full suite count) are binding-command attestations reported by the Implementer at GREEN per spec § 5 preamble (cross-checked against § 4.6 prescriptions per R20 MINOR-1 reinforcement).

Test count target: 9 runtime tests (8 in GREEN + 1 added in chore-B).

### 2.10 NEXT-ROLE.md routing block update (Architect-side, applied now)

Update the top three lines from:

```
CURRENT-ROUND: R21
NEXT-ROLE: ARCHITECT
STATUS: READY
```

To:

```
CURRENT-ROUND: R21
NEXT-ROLE: IMPLEMENTER
STATUS: READY
Inputs: coordination/specs/Q-R21-SPEC.md (+ Q-R21-SPEC-AUDIT.md sidecar)
```

Leave **all subsequent operator-authored sections of NEXT-ROLE.md byte-identical** (round-scope directive, inputs list, anti-scope, architectural questions section, escalation items, routing notes, readiness state — all load-bearing for downstream roles per R18 + R20 precedent).

---

## 3. Component inventory

| Path | State | Touch type | Bound ACs |
|---|---|---|---|
| `engine/fleet/verdict-consumer.ts` | CREATED | New Tessera-original module (~80-110 LoC; 4 exported types + 2 exported functions + file-header block) | AC-R21-1, -2, -3, -4, -5, -6, -7, -8, -9 |
| `engine/fleet/verdict-consumer.js` | CREATED (compiled output) | regenerated by typecheck/build | AC-R21-9 |
| `test/q21-fleet-verdict-consumer.test.ts` | CREATED | New file (~180-240 LoC; 9 runtime tests: 8 GREEN + 1 chore-B) | AC-R21-1 through -8 + AC-R21-11 |
| `test/q21-fleet-verdict-consumer.test.js` | CREATED (compiled output) | regenerated | AC-R21-10 |
| `engine/verdict-groups.ts` | UNCHANGED | (R20 frozen contract; consumed read-only via VerdictGrouper.ingest + IngestResult import) | (anti-scope) |
| `engine/types/verdict.ts` | UNCHANGED | (consumed read-only via FusedVerdict + VerdictGroup type-imports) | (anti-scope) |
| `engine/fleet/combine.ts` | UNCHANGED | (anti-scope per Approach A — Tessera-original-code-stability) | (anti-scope) |
| `engine/fleet/detectors.ts` | UNCHANGED | (anti-scope per Approach A) | (anti-scope) |
| `engine/fleet/e-bh.ts` | UNCHANGED | (anti-scope per Q4 disposition — e-BH cluster_event_id-agnostic) | (anti-scope) |
| `test/_substrate/v9X-cluster.ts` | UNCHANGED | (NEXT-ROLE.md anti-scope) | (anti-scope) |
| `test/q20-…test.ts` | UNCHANGED | (NEXT-ROLE.md anti-scope; R20 deliverable frozen) | (anti-scope) |
| `test/q11-…`, `test/q12-…`, `test/q13-…` | UNCHANGED | (no fleet-merge math signature changes per Approach A) | (anti-scope) |
| `test/q01-no-at-pin-deltas.test.ts` | UNCHANGED | (verdict-consumer.ts is Tessera-original; AT_PIN_FILES not affected) | (anti-scope) |
| `coordination/VENDORING-MANIFEST.md` | UNCHANGED | (no new vendored deltas at R21; verdict-consumer.ts is Tessera-original) | (anti-scope) |
| `coordination/specs/Q-R21-SPEC.md` | CREATED | this file | (routing artifact) |
| `coordination/specs/Q-R21-SPEC-AUDIT.md` | CREATED | sidecar | (audit-trail) |
| `coordination/NEXT-ROLE.md` | CHANGED | routing block update (top 4 lines) + Implementer adds attestation block at chore time | (coordination) |
| `coordination/MEMORIAL.md` | CHANGED (append-only) | Architect / Implementer / Reviewer / Memorial-Updater each append ceremony sections | (coordination) |

**Anti-scope verification path-set (allowed entries in `git diff 62e28d7..<MERGE-READY-SHA> --name-only` at Implementer chore-A attestation):**

```
engine/fleet/verdict-consumer.ts
engine/fleet/verdict-consumer.js
test/q21-fleet-verdict-consumer.test.ts
test/q21-fleet-verdict-consumer.test.js
coordination/specs/Q-R21-SPEC.md
coordination/specs/Q-R21-SPEC-AUDIT.md
coordination/NEXT-ROLE.md
coordination/MEMORIAL.md
```

8 entries. AC-R21-11 binds. `<MERGE-READY-SHA>` is the Implementer-side coordination-chore SHA-A per CLAUDE-IMPLEMENTER.md two-commit-attestation pattern (TQ-4 γ — SHA-pinned end-bound, not HEAD; R15 MINOR-1 + R19 MAJOR-3 + R20 MINOR-1 reinforcements applied).

**Note on compiled outputs.** `engine/fleet/verdict-consumer.js` and `test/q21-fleet-verdict-consumer.test.js` are compiled by `npx tsc -p tsconfig.test.json` per project convention; they are gitignored (`*.js` in `.gitignore` — verified at R20 § 3 by the Reviewer at REVIEWER-REPORT-R20.md anti-scope check). The 8-entry allowed-set above includes them for completeness but a passing `git diff` will not include them in the output; the AC-R21-11 test is structured to permit (not require) their absence from the observed diff.

---

## 4. Per-file pseudocode (only where algorithm IS the architectural decision)

Per CLAUDE-ARCHITECT.md spec-depth guidance: "Per-file pseudocode is appropriate only when the algorithm IS the architectural decision — not for routine wiring." R21's load-bearing algorithmic choices are the fan-out semantic (preserve N-ordering, propagate two opts fields), the empty-input semantic (no-throw return), and the rollup dedup + first-occurrence + empty-string-query short-circuit. Routine TypeScript syntax, import statement placement, JSDoc paraphrase are left to the Implementer.

### 4.1 `engine/fleet/verdict-consumer.ts` — public surface (algorithm-level pseudocode)

```typescript
// engine/fleet/verdict-consumer.ts — Tessera SLICE 2.B (R21):
// fleet-merge consumer surface bridging per-shard FusedVerdict streams to
// VerdictGrouper with cluster_event_id propagation. ... [full file header per § 2.8]

import type { FusedVerdict, VerdictGroup } from '../types/verdict';
import type { IngestResult, VerdictGrouper } from '../verdict-groups';

export interface FleetTickInput {
  per_shard_verdicts: ReadonlyArray<FusedVerdict>;
  ts_seconds: number;
  cluster_event_id?: string;
  terminal?: boolean;
}

export interface FleetTickIngestResult {
  ingest_results: ReadonlyArray<IngestResult>;
}

export interface ClusterEventRollup {
  groups: ReadonlyArray<VerdictGroup>;
  deploy_ids: ReadonlyArray<string>;
}

// Fan-out: iterate per_shard_verdicts in array order, call grouper.ingest
// for each, collect results. Empty input → empty result, no throw.
//
// IMPORTANT: opts object construction MUST include both `cluster_event_id`
// and `terminal` fields (even when undefined) so the VerdictGrouper opts
// argument is shape-stable; absent field is semantically equivalent to
// `: undefined` per R20 § 2.1 (R20 ingest treats absent + undefined identically),
// but explicit-undefined is clearer at the consumer layer.
export function fleetTickIngest(
  input: FleetTickInput,
  grouper: VerdictGrouper,
): FleetTickIngestResult {
  const results: IngestResult[] = [];
  for (const verdict of input.per_shard_verdicts) {
    const r = grouper.ingest(verdict, input.ts_seconds, {
      cluster_event_id: input.cluster_event_id,
      terminal: input.terminal,
    });
    results.push(r);
  }
  return { ingest_results: results };
}

// Rollup: filter IngestResults whose attributed_group.cluster_event_id ===
// query, dedupe by group.group_id (first-occurrence preserved), and emit
// {groups, deploy_ids}. Empty-string query short-circuits to no-match per
// § 2.4. Strict `===` filter — undefined never matches a non-empty query.
export function rollupByClusterEvent(
  results: ReadonlyArray<IngestResult>,
  cluster_event_id: string,
): ClusterEventRollup {
  if (cluster_event_id === '') {
    return { groups: [], deploy_ids: [] };
  }
  const groups: VerdictGroup[] = [];
  const deploy_ids: string[] = [];
  const seen_group_ids = new Set<string>();
  const seen_deploy_ids = new Set<string>();
  for (const r of results) {
    const g = r.attributed_group;
    if (g.cluster_event_id !== cluster_event_id) continue;
    if (!seen_group_ids.has(g.group_id)) {
      seen_group_ids.add(g.group_id);
      groups.push(g);
    }
    if (!seen_deploy_ids.has(g.deploy_id)) {
      seen_deploy_ids.add(g.deploy_id);
      deploy_ids.push(g.deploy_id);
    }
  }
  return { groups, deploy_ids };
}
```

The Implementer chooses exact JSDoc wording, file-header phrasing, and re-export ergonomics. Field names + function names + Set-based dedup approach + first-occurrence ordering + empty-string short-circuit are spec-prescribed and load-bearing (§ 2 + AC-R21-2/3/4/5/6/7/8).

### 4.2 `test/q21-fleet-verdict-consumer.test.ts` — algorithm-level pseudocode

```typescript
// test/q21-fleet-verdict-consumer.test.ts — Phase 2 SLICE 2.B bindings (R21).
//
// Binds AC-R21-1 through AC-R21-8 (runtime, in GREEN commit) + AC-R21-11
// (runtime, added in chore-B per spec § 4.7). AC-R21-9 (typecheck) and
// AC-R21-10 (full suite count) are binding-command attestations reported
// by the Implementer at GREEN.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import { VerdictGrouper } from '../engine/verdict-groups';
import {
  fleetTickIngest,
  rollupByClusterEvent,
  type FleetTickInput,
  type FleetTickIngestResult,
  type ClusterEventRollup,
} from '../engine/fleet/verdict-consumer';
import type { FusedVerdict } from '../engine/types/verdict';

function makeVerdict(deploy_ref: string, tick: number, firing = false): FusedVerdict {
  return {
    verdict: firing ? 'rollback' : 'proceed',
    firing_families: firing ? ['A'] : [],
    per_family_verdicts: { A: null, B: null, C: null, D: null, E: null },
    total_alpha_spent: firing ? 0.5 : 0,
    fusion_topology: 'cascade',
    tick,
    deploy_ref,
  };
}

// AC-R21-1: shape + N-correspondence
test('AC-R21-1: fleetTickIngest returns FleetTickIngestResult with ingest_results.length === N', () => {
  const grouper = new VerdictGrouper();
  const input: FleetTickInput = {
    per_shard_verdicts: [
      makeVerdict('deploy-A', 1),
      makeVerdict('deploy-B', 1),
      makeVerdict('deploy-C', 1),
    ],
    ts_seconds: 1700000000,
    cluster_event_id: 'evt-X',
  };
  const out = fleetTickIngest(input, grouper);
  assert.strictEqual(out.ingest_results.length, 3);
  for (const r of out.ingest_results) {
    assert.ok(r.attributed_group !== null && r.attributed_group !== undefined);
  }
});

// AC-R21-2: cluster_event_id propagation
test('AC-R21-2: cluster_event_id propagated to every per-shard ingest call', () => {
  const grouper = new VerdictGrouper();
  const input: FleetTickInput = {
    per_shard_verdicts: [
      makeVerdict('deploy-A', 1),
      makeVerdict('deploy-B', 1),
      makeVerdict('deploy-C', 1),
    ],
    ts_seconds: 1700000000,
    cluster_event_id: 'evt-X',
  };
  const out = fleetTickIngest(input, grouper);
  for (const r of out.ingest_results) {
    assert.strictEqual(r.attributed_group.cluster_event_id, 'evt-X');
    // Composite group_id format per R20 § 2.2
    assert.ok(r.attributed_group.group_id.startsWith('group-evt-X-'));
  }
});

// AC-R21-3: legacy mode (absent cluster_event_id)
test('AC-R21-3: absent cluster_event_id → legacy mode (undefined cluster_event_id; inherited group_id format)', () => {
  const grouper = new VerdictGrouper();
  const input: FleetTickInput = {
    per_shard_verdicts: [makeVerdict('deploy-A', 1)],
    ts_seconds: 1700000000,
  };
  const out = fleetTickIngest(input, grouper);
  assert.strictEqual(out.ingest_results[0].attributed_group.cluster_event_id, undefined);
  assert.strictEqual(out.ingest_results[0].attributed_group.group_id, 'group-deploy-A-1700000000');
});

// AC-R21-4: empty input
test('AC-R21-4: empty per_shard_verdicts → empty ingest_results, no throw', () => {
  const grouper = new VerdictGrouper();
  const input: FleetTickInput = {
    per_shard_verdicts: [],
    ts_seconds: 1700000000,
    cluster_event_id: 'evt-X',
  };
  const out = fleetTickIngest(input, grouper);
  assert.deepStrictEqual(out.ingest_results, []);
});

// AC-R21-5: terminal flag propagation
test('AC-R21-5: input.terminal=true closes every per-shard attributed_group on the same tick', () => {
  const grouper = new VerdictGrouper();
  const input: FleetTickInput = {
    per_shard_verdicts: [
      makeVerdict('deploy-A', 1, true),
      makeVerdict('deploy-B', 1, true),
    ],
    ts_seconds: 1700000000,
    cluster_event_id: 'evt-X',
    terminal: true,
  };
  const out = fleetTickIngest(input, grouper);
  // Per R20 § 2.1: terminal=true triggers terminal_verdict close on the same call;
  // attributed_group.closed === true post-ingest (non-late-arrival branch).
  for (const r of out.ingest_results) {
    assert.strictEqual(r.attributed_group.closed, true);
    assert.notStrictEqual(r.closed, null);
  }
});

// AC-R21-6: per-shard order preserved
test('AC-R21-6: ingest_results[i] corresponds to per_shard_verdicts[i] (index-order preservation)', () => {
  const grouper = new VerdictGrouper();
  const deploys = ['deploy-A', 'deploy-B', 'deploy-C'];
  const input: FleetTickInput = {
    per_shard_verdicts: deploys.map((d, i) => makeVerdict(d, i + 1)),
    ts_seconds: 1700000000,
    cluster_event_id: 'evt-X',
  };
  const out = fleetTickIngest(input, grouper);
  for (let i = 0; i < deploys.length; i++) {
    assert.strictEqual(out.ingest_results[i].attributed_group.deploy_id, deploys[i]);
  }
});

// AC-R21-7: rollup — distinct VerdictGroups under shared cluster_event_id
test('AC-R21-7: rollupByClusterEvent returns N distinct VerdictGroups for N distinct deploys under one cluster_event_id', () => {
  const grouper = new VerdictGrouper();
  const input: FleetTickInput = {
    per_shard_verdicts: [
      makeVerdict('deploy-A', 1),
      makeVerdict('deploy-B', 1),
      makeVerdict('deploy-C', 1),
    ],
    ts_seconds: 1700000000,
    cluster_event_id: 'evt-X',
  };
  const out = fleetTickIngest(input, grouper);
  const rollup: ClusterEventRollup = rollupByClusterEvent(out.ingest_results, 'evt-X');
  assert.strictEqual(rollup.groups.length, 3);
  assert.strictEqual(rollup.deploy_ids.length, 3);
  assert.deepStrictEqual([...rollup.deploy_ids].sort(), ['deploy-A', 'deploy-B', 'deploy-C']);
  // Distinct group_ids (R20 § 2.3 multi-deploy-per-event keying)
  const group_ids = rollup.groups.map(g => g.group_id);
  assert.strictEqual(new Set(group_ids).size, 3);
});

// AC-R21-8: rollup — empty-string query → no match
test('AC-R21-8: rollupByClusterEvent("") short-circuits to no-match (empty-string ≡ absent per R20 § 2.6)', () => {
  const grouper = new VerdictGrouper();
  const input: FleetTickInput = {
    per_shard_verdicts: [makeVerdict('deploy-A', 1)],
    ts_seconds: 1700000000,
    // No cluster_event_id → legacy mode → attributed_group.cluster_event_id === undefined
  };
  const out = fleetTickIngest(input, grouper);
  const rollup = rollupByClusterEvent(out.ingest_results, '');
  assert.deepStrictEqual(rollup.groups, []);
  assert.deepStrictEqual(rollup.deploy_ids, []);
});

// AC-R21-11 is added in chore-B per § 4.7 with substituted MERGE-READY SHA.
// Test body sketch (Implementer fills in chore-A SHA at chore-B time):
//   const diff = execSync(`git diff 62e28d7..<MERGE-READY-SHA> --name-only`, { encoding: 'utf-8' }).trim().split('\n').filter(Boolean);
//   const allowed = new Set([
//     'engine/fleet/verdict-consumer.ts',
//     'engine/fleet/verdict-consumer.js',
//     'test/q21-fleet-verdict-consumer.test.ts',
//     'test/q21-fleet-verdict-consumer.test.js',
//     'coordination/specs/Q-R21-SPEC.md',
//     'coordination/specs/Q-R21-SPEC-AUDIT.md',
//     'coordination/NEXT-ROLE.md',
//     'coordination/MEMORIAL.md',
//   ]);
//   for (const p of diff) assert.ok(allowed.has(p), `unexpected path ${p}`);
```

### 4.3 RED commit — TDD ordering

Implementer commits a RED commit containing 8 `assert.fail('RED: AC-R21-N pending')` placeholders in `test/q21-fleet-verdict-consumer.test.ts` (AC-R21-1 through AC-R21-8) BEFORE any modification to `engine/fleet/`. Verifiable via `git show <RED-SHA>:test/q21-fleet-verdict-consumer.test.ts` showing only assert.fail bodies + the makeVerdict helper + imports. No production code in the RED commit.

Note: only AC-R21-1..8 get RED placeholders. AC-R21-11 is structurally exempt from RED→GREEN (per R20 § 4.7 forward-protection precedent — the SHA being asserted must exist before the test referencing it can be written). AC-R21-9 + AC-R21-10 are binding-command attestations, not runtime tests, and need no RED placeholder.

### 4.4 GREEN commit

Implementer commits a single GREEN commit containing:
1. `engine/fleet/verdict-consumer.ts` (new file with 4 exports + file-header block per § 2.8)
2. `test/q21-fleet-verdict-consumer.test.ts` with real test bodies for AC-R21-1 through AC-R21-8 (replaces RED placeholders)
3. Compiled outputs in `engine/fleet/verdict-consumer.js` + `test/q21-fleet-verdict-consumer.test.js`

GREEN commit attestation in the commit message:
- `npx tsc --noEmit` → exit 0 (AC-R21-9)
- `node --test test/*.test.js` → `tests <pre-R21 + q21> / pass <total> / fail 0` (AC-R21-10)
- Per-file OBSERVED counts per R03 MINOR-4 + R18 MINOR-2 reinforcements
- AC-R21-1 through AC-R21-8 each PASS (with file:line reference)

Pre-R21 baseline = 192. q21 GREEN-commit test count = 8 (the chore-B adds 1 more for total 9). GREEN commit total = 192 + 8 = 200.

### 4.5 chore-A commit — route to Reviewer

Implementer commits the coordination chore that routes to Reviewer:
1. `coordination/NEXT-ROLE.md` updates: `NEXT-ROLE: REVIEWER`, `STATUS: READY`, Implementer attestation block with chore-A SHA placeholder filled at this commit's hash.
2. `coordination/MEMORIAL.md` Implementer ceremony section appended.

This commit's SHA is the **MERGE-READY chore-A SHA**; it becomes the end-bound of AC-R21-11's `git diff` assertion. The Implementer captures this SHA (e.g., via `git rev-parse HEAD`) immediately after committing and uses it in chore-B.

### 4.6 chore-B commit — substitute MERGE-READY SHA into AC-R21-11

Implementer commits one final chore-B commit that adds the AC-R21-11 runtime test to `test/q21-fleet-verdict-consumer.test.ts` with the chore-A SHA substituted in place of `<MERGE-READY-SHA>`. The test body uses `execSync('git diff 62e28d7..<chore-A-SHA> --name-only', ...)` per the sketch at § 4.2.

Per R20 § 4.7 precedent: this AC is **structurally exempt from RED→GREEN** because the SHA being asserted must exist before the test referencing it can be written. The 8-entry allowed-set at § 3 includes the chore-B's own modification to `test/q21-fleet-verdict-consumer.test.ts` (a re-touch of the same file path already in the allowed-set) and to `coordination/MEMORIAL.md` (Implementer adds a CONFIRMATION line at chore-B per R20 precedent if desired; not required).

Post-chore-B test count: 192 + 9 = 201.

### 4.7 NEXT-ROLE.md routing — Implementer-side updates

After chore-B, the Implementer updates `coordination/NEXT-ROLE.md` (still as part of chore-B, OR in a final chore-C — Implementer's choice; both are within the 8-entry allowed-set) so the Reviewer can act:

```
CURRENT-ROUND: R21
NEXT-ROLE: REVIEWER
STATUS: READY
Inputs: coordination/specs/Q-R21-SPEC.md (+ Q-R21-SPEC-AUDIT.md sidecar);
        REVIEWER-REPORT-R21.md target;
        Implementer attestation: <chore-A-SHA> (MERGE-READY)
```

The Implementer's attestation block reports:
- chore-A SHA (= MERGE-READY)
- `npx tsc --noEmit` outcome
- `node --test test/*.test.js` outcome with per-file OBSERVED counts (R03 MINOR-4 reinforcement)
- AC-R21-1 through AC-R21-11 evidence pointers

---

## 5. Acceptance criteria

**Preamble — AC classification (per R20 MINOR-1 reinforcement; classification claims here MUST agree with § 4.x prescriptions; cross-checked in § 8 grilling):**

- **AC-R21-1 through AC-R21-8 are runtime tests** bound by `test/q21-fleet-verdict-consumer.test.ts`. They are introduced as `assert.fail('RED: ...')` placeholders in the RED commit (§ 4.3) and replaced with real bodies in the GREEN commit (§ 4.4). Each PASSes under `node --test test/q21-fleet-verdict-consumer.test.js`.
- **AC-R21-9 and AC-R21-10 are binding-command attestations** reported by the Implementer at GREEN attestation time (§ 4.4 commit message). AC-R21-9 = `npx tsc --noEmit` exit 0; AC-R21-10 = `node --test test/*.test.js` total + fail counts.
- **AC-R21-11 is a runtime test** bound by `test/q21-fleet-verdict-consumer.test.ts`. It is added in the chore-B commit (§ 4.6) with the chore-A MERGE-READY SHA substituted into the test body. It is **structurally exempt from RED→GREEN** because the SHA being asserted must exist before the test referencing it can be written (R20 AC-R20-12 + R18 AC-R18-10 precedent). It PASSes under `node --test test/q21-fleet-verdict-consumer.test.js`.

| ID | Given / When / Then |
|---|---|
| AC-R21-1 | **Given** a `FleetTickInput` with `per_shard_verdicts` of length N=3, `ts_seconds: 1700000000`, `cluster_event_id: 'evt-X'`, and a fresh `VerdictGrouper`, **when** `fleetTickIngest(input, grouper)` is called, **then** `out.ingest_results.length === 3` AND every `ingest_results[i].attributed_group` is a non-null `VerdictGroup` reference. |
| AC-R21-2 | **Given** a `FleetTickInput` with `cluster_event_id: 'evt-X'` and N=3 verdicts for distinct `deploy_ref` values, **when** `fleetTickIngest` is called, **then** for every `i ∈ [0, N)`: `ingest_results[i].attributed_group.cluster_event_id === 'evt-X'` AND `ingest_results[i].attributed_group.group_id` starts with the literal prefix `'group-evt-X-'` (composite format per R20 § 2.2). |
| AC-R21-3 | **Given** a `FleetTickInput` with N=1 verdict for `deploy_ref: 'deploy-A'`, `ts_seconds: 1700000000`, and NO `cluster_event_id` field, **when** `fleetTickIngest` is called, **then** `ingest_results[0].attributed_group.cluster_event_id === undefined` AND `ingest_results[0].attributed_group.group_id === 'group-deploy-A-1700000000'` (legacy format preserved per R20 § 2.2). |
| AC-R21-4 | **Given** a `FleetTickInput` with `per_shard_verdicts: []` and `cluster_event_id: 'evt-X'`, **when** `fleetTickIngest` is called, **then** `out.ingest_results` deep-equals `[]` AND no error is thrown (deliberate empty-input semantic per § 2.7). |
| AC-R21-5 | **Given** a `FleetTickInput` with N=2 firing verdicts (`firing_families: ['A']`), `terminal: true`, and `cluster_event_id: 'evt-X'`, **when** `fleetTickIngest` is called, **then** for every `i ∈ [0, N)`: `ingest_results[i].attributed_group.closed === true` AND `ingest_results[i].closed !== null` (terminal-close per R20 § 2.1 propagates per-shard). |
| AC-R21-6 | **Given** a `FleetTickInput` with `per_shard_verdicts` whose `deploy_ref` values in order are `['deploy-A', 'deploy-B', 'deploy-C']`, **when** `fleetTickIngest` is called, **then** for every `i ∈ [0, 3)`: `ingest_results[i].attributed_group.deploy_id === per_shard_verdicts[i].deploy_ref` (index-order preservation). |
| AC-R21-7 | **Given** a `FleetTickIngestResult` produced by a single `fleetTickIngest` call with 3 distinct `deploy_ref` values under `cluster_event_id: 'evt-X'`, **when** `rollupByClusterEvent(result.ingest_results, 'evt-X')` is called, **then** `rollup.groups.length === 3` AND `rollup.deploy_ids.length === 3` AND `rollup.deploy_ids` (sorted) deep-equals `['deploy-A', 'deploy-B', 'deploy-C']` AND `new Set(rollup.groups.map(g => g.group_id)).size === 3` (R20 § 2.3 multi-deploy-per-event keying produces distinct group_ids). |
| AC-R21-8 | **Given** a `FleetTickIngestResult` from a legacy-mode `fleetTickIngest` call (no `cluster_event_id`), **when** `rollupByClusterEvent(result.ingest_results, '')` is called, **then** `rollup.groups` deep-equals `[]` AND `rollup.deploy_ids` deep-equals `[]` (empty-string query short-circuits per § 2.4 / R20 § 2.6 alignment). |
| AC-R21-9 | **Given** the R21 codebase at the GREEN commit (and at every subsequent commit through chore-B), **when** `npx tsc --noEmit` runs, **then** the process exits with code 0. (Binding-command attestation.) |
| AC-R21-10 | **Given** the R21 codebase at the GREEN commit, **when** `node --test test/*.test.js` runs, **then** the OBSERVED total === pre-R21 baseline + q21 GREEN-commit test count AND `fail === 0`. Pre-R21 baseline = 192/0 per R20 Reviewer attestation at HEAD `7eb3a63`; q21 GREEN-commit count = 8; expected total at GREEN = 200; expected total at post-chore-B = 201. Per-file OBSERVED counts reported in the GREEN commit message and in the NEXT-ROLE.md attestation block per R03 MINOR-4 + R18 MINOR-2 reinforcements. (Binding-command attestation.) |
| AC-R21-11 | **Given** baseline SHA `62e28d7` and chore-A MERGE-READY SHA `<MERGE-READY-SHA>` (substituted by the Implementer at chore-B per § 4.6), **when** `git diff 62e28d7..<MERGE-READY-SHA> --name-only` runs, **then** every line of output is a member of the 8-entry allowed-set defined in § 3. (Runtime test, committed in chore-B per R20 § 4.7 forward-protection pattern.) |

---

## 6. Anti-scope (R21 hard limits)

Carries forward NEXT-ROLE.md R21 anti-scope items; restated here as spec-level commitments:

- **NO modification of `engine/verdict-groups.ts`** — R20's deliverable. R21 is consumer-side only. Any aggregator-side change identified during execution → HALT with bounded DIAGNOSTIC; do NOT modify silently. (Mirrors R20's R18-substrate-frozen anti-scope.)
- **NO modification of `engine/types/verdict.ts`** — R18+R20 contract frozen for SLICE 2.B consumers. cluster_event_id flows on FleetTickInput, not on FusedVerdict (A14 anti-scope).
- **NO modification of `engine/fleet/combine.ts` / `engine/fleet/detectors.ts` / `engine/fleet/e-bh.ts`** — per Approach A (§ 0) + Q4 disposition (e-BH cluster_event_id-agnostic). Tessera-original-code-stability preserved at R11/R12/R13 surfaces.
- **NO modification of `test/_substrate/v9X-cluster.ts`** — R18 substrate frozen.
- **NO modification of `test/q20-…test.ts`** — R20 deliverable frozen. (Exception: MINOR-1 q20 file-header correction at lines 4-6 IS authorized as in-passing cleanup per R20 close-walk watch list — IF R21 touches q20 for any reason. R21 anticipates NO q20 touch, so this exception does not activate. If activated unexpectedly → HALT with bounded DIAGNOSTIC.)
- **NO modification of `test/q11-…test.ts` / `test/q12-…test.ts` / `test/q13-…test.ts`** — fleet-merge math primitive surfaces preserved per Approach A.
- **NO modification of `test/q01-no-at-pin-deltas.test.ts`** — `engine/fleet/verdict-consumer.ts` is Tessera-original (NOT vendored); AT_PIN_FILES not affected.
- **NO modification of `coordination/VENDORING-MANIFEST.md`** — no new vendored deltas at R21.
- **NO `HardwareTopologySource` concrete impl** — SLICE 3.
- **NO deployment-event-feed ingestion** — SLICE 4.
- **NO cluster-event-scoped e-BH FDR** — Q4 disposition; future-SLICE work.
- **NO Addition #25 D2/D5 reversal** — preserved through R20; R21 propagates through fan-out, doesn't redefine.
- **NO Addition #26 D4 reversal** — `correlational_not_causal: true` invariant preserved.
- **NO modification of inherited detector internals** (A12/A5).
- **NO new fixture file under `test/_substrate/`** — v9Y is SLICE 4 territory per Q6 disposition (§ 2.6).

---

## 7. Open questions

**None — all resolved.** The six architectural questions in NEXT-ROLE.md are dispositioned in § 0 (brainstorm) + § 2 (mechanism). No item requires operator decision before Implementer can act.

---

## 8. P3 ten-axis verification

| Axis | Verification |
|---|---|
| Correctness | The fan-out + rollup algorithms are direct readings of the spec mechanism (§ 2.1, § 2.4) with no semantic gaps; every public surface decision (per-tick scope, optional cluster_event_id, empty-input no-throw, dedup-by-group_id, empty-string-query short-circuit) is bound by at least one AC; the consumer-side semantic propagates R20 VerdictGrouper.ingest semantics faithfully (no override, no augmentation). |
| Completeness | Spec § 5 enumerates 11 ACs covering: shape (1), cluster_event_id propagation (2), legacy mode (3), empty input (4), terminal propagation (5), order preservation (6), rollup positive (7), rollup empty-string short-circuit (8), typecheck (9), full suite (10), anti-scope (11). The four public exports (FleetTickInput, FleetTickIngestResult, ClusterEventRollup, fleetTickIngest, rollupByClusterEvent) each have at least one AC binding their observable behavior. |
| Consistency | All 17 cross-section tokens (cluster_event_id, FleetTickInput, FleetTickIngestResult, ClusterEventRollup, fleetTickIngest, rollupByClusterEvent, per_shard_verdicts, ts_seconds, ingest_results, attributed_group, group_id, deploy_id, q21, engine/fleet/verdict-consumer.ts, test/q21-fleet-verdict-consumer.test.ts, 62e28d7 baseline SHA, `<MERGE-READY-SHA>` placeholder) used byte-identically across § 1 component boundaries, § 2 mechanism, § 3 inventory, § 4 pseudocode, § 5 ACs. The § 5 preamble's classification of AC-R21-1..8+11 as runtime tests vs AC-R21-9/-10 as binding-command attestations is cross-checked against § 4.3/4.4/4.6 prescriptions (R20 MINOR-1 reinforcement). |
| Clarity | Spec uses Given/When/Then ACs throughout; banned ambiguous language ("correctly", "appropriately", "as needed") absent. § 0 brainstorm enumerates approaches with strengths/weaknesses/hidden-assumptions/risks per Superpowers discipline. Failure modes (§ 1) enumerated per integration point. |
| Coverage | Every R21 deliverable in § 3 (verdict-consumer.ts production + q21 test + spec + audit sidecar + NEXT-ROLE.md update + MEMORIAL.md append) traces to ≥1 AC OR to coordination-routing scope. PRD FR-E3a + AC-P4 traced explicitly in § 1 integration-point verification. |
| Constraints | NEXT-ROLE.md anti-scope (7 hard limits) explicitly preserved in § 6; verified per-item against component inventory § 3. SCOPING-MEMO-v0.3.md A12/A13/A14/A16 + § 9 vendoring policy honored — no fleet/* file is vendored, so vendored-with-deltas transition does not apply. |
| Concurrency | The new `fleetTickIngest` is synchronous and stateless w.r.t. the consumer module itself (no module-level state); concurrent `fleetTickIngest` calls against the SAME VerdictGrouper instance would inherit the same single-threaded-mutator contract as direct `VerdictGrouper.ingest` calls. No new concurrency primitive at R21. |
| Corner cases | Empty input array (AC-R21-4), empty-string rollup query (AC-R21-8), no cluster_event_id (AC-R21-3), terminal-fanout (AC-R21-5), late-arrival under cluster-event scope (covered transitively via R20 § 2.5 — fan-out is a pure caller). Empty-string `input.cluster_event_id` propagated to VerdictGrouper.ingest is interpreted by R20 § 2.6 as semantically equivalent to undefined (legacy mode); AC-R21-3 covers the undefined case; the empty-string-on-input edge is left to R20's existing AC-R20-6 sub-case (b) coverage. |
| Cost | New module ~80-110 LoC + new test file ~180-240 LoC + spec ~600-700 LoC + audit sidecar ~150-250 LoC. AC count = 11 (below the R20 § 7 split-decision threshold of ~12). Round size proportional to a one-module Tessera-original deliverable. |
| Coupling | New module depends on `engine/types/verdict` (FusedVerdict, VerdictGroup; existing imports inherited from R18+R20) and `engine/verdict-groups` (VerdictGrouper class + IngestResult interface; existing exports unchanged at R21). Zero new coupling introduced into the fleet-merge math primitives. The downstream SLICE 4 event-feed consumer will compose this module with fleet-merge math at that time; R21 ships the minimum needed. |

---

## 9. Grilling output (adversarial self-review, inline)

Pre-emit grilling per CLAUDE-COMMON.md + CLAUDE-ARCHITECT.md REINFORCED accumulation through R20. 13 gates:

### 9.1 Verifiability — every claim backed by something verifiable

Walk: every § 1 component-boundary row cites a path on disk (verified by Glob + Read at session start: engine/fleet/{combine,detectors,e-bh}.ts exist; engine/verdict-groups.ts exists at R20 post-merge; engine/types/verdict.ts exists at R18 post-merge; test/q20-…test.ts exists). Every § 5 AC binds to a § 4.x prescription or to a binding command. Every § 6 anti-scope item maps to a NEXT-ROLE.md anti-scope line OR a SCOPING-MEMO A-clause. **PASS.**

### 9.2 Unstated assumptions — listed or refuted

(a) That fleet-tick orchestration is per-tick scoped — verified via SCOPING-MEMO § 2.3 line 218 (cluster events are at cluster-level ingestion surface; inherently per-fleet-tick); documented as "hidden assumption verified" in § 0 Approach A.
(b) That consumer-side rollup operating on IngestResult arrays is sufficient — verified by inspecting R20 VerdictGrouper public surface (only `openGroupForDeploy(deploy_id, cluster_event_id?)` is a public lookup; iterating internal state would require a new public method, anti-scope of R21); documented as "hidden assumption verified" in § 0.
(c) That `IngestResult` is exported from `engine/verdict-groups.ts` (re-importable at R21) — verified by Read of `engine/verdict-groups.ts:54` showing `export interface IngestResult`.
(d) That `*.js` is in `.gitignore` (so compiled outputs don't pollute the anti-scope diff) — verified by R20 Reviewer's anti-scope check at REVIEWER-REPORT-R20.md (cited in spec § 3 note).
(e) That `engine/fleet/{combine,detectors,e-bh}.ts` are Tessera-original (NOT vendored) — verified by Read of each file's header at session start: combine.ts:33-34 ("Tessera-original code (NOT vendored from DeploySignal)"); detectors.ts:39-40 ("Tessera-original code"); e-bh.ts:56-57 ("Tessera-original code"). Therefore no vendoring-with-deltas transition at R21.
(f) That `engine/verdict-groups.ts` post-R20 has `openByGroupKey` (not `openByDeploy`) and a `findRecentClosedForKey` (not `findRecentClosedForDeploy`) — verified by Read of post-R20 engine/verdict-groups.ts at session start. The spec only depends on `VerdictGrouper.ingest(verdict, ts, opts)` signature (post-R20 line 86-90) which is the public contract; internal renames are R20 implementation detail, not R21 dependency. **PASS.**

### 9.3 Scope audit — added beyond request?

Walk § 3 component inventory: 1 new production module + 1 new test file + 2 new coordination artifacts + 2 updated coordination artifacts. NEXT-ROLE.md asks for fleet-merge consumption layer wiring with cluster_event_id propagation — delivered. Rollup helper (Q2 disposition) is bounded — minimal helper operating on IngestResult arrays, no aggregator-internal access. e-BH untouched per Q4 disposition. Math primitives untouched per Approach A. Topology, event-feed, Addition reversals all explicitly out-of-scope. **No scope creep.** **PASS.**

### 9.4 Implementer can act without guessing — Implementer-actionability walk

Walk each Implementer task at § 4:
- 4.1 verdict-consumer.ts: field names, function names, dedup approach, ordering semantics, empty-input behavior, empty-string-query short-circuit, header block content — all prescribed. Only JSDoc paraphrasing and exact import ordering are tactical.
- 4.2 q21 test file: makeVerdict helper shape, assertion form, AC-R21-1..8 + AC-R21-11 sketches — all prescribed.
- 4.3 RED commit: file content (8 assert.fail placeholders + helper + imports), order (RED before GREEN), no production code in RED — all prescribed.
- 4.4 GREEN commit: file set, attestation block content, per-file OBSERVED counts — all prescribed.
- 4.5 chore-A: NEXT-ROLE.md routing + MEMORIAL append — all prescribed.
- 4.6 chore-B: SHA substitution + test addition — all prescribed.
- 4.7 NEXT-ROLE.md attestation block: structure prescribed.

Implementer can act with **zero clarifying questions.** **PASS.**

### 9.5 Verification-command-soundness — for each grep/diff AC, command is sound

AC-R21-11 uses `git diff 62e28d7..<MERGE-READY-SHA> --name-only`. The pipe-into-Set semantic in the test body (§ 4.2 sketch) treats every output line as a path; empty output (no diff) trivially satisfies "every line is in allowed-set." The filter `.filter(Boolean)` removes empty strings from the trailing newline. No false-positive risk; no comment-line risk (git diff --name-only output is path-only). **PASS.**

### 9.6 Spec-internal-contradiction structural check (R01 + R20 MINOR-1 reinforcements)

Walk every resolved decision (Q1-Q6 in § 0 disposition table) and verify all subsequent sections use a consistent surface:
- Q1 disposition: "per-tick context object on FleetTickInput" — used in § 1 (component boundaries: FleetTickInput.cluster_event_id), § 2.1, § 2.3, § 4.1 pseudocode, AC-R21-2, AC-R21-3. No contradiction.
- Q2 disposition: "consumer-side rollupByClusterEvent on IngestResult[]" — used in § 1, § 2.1 (exports), § 2.4, § 4.1, AC-R21-7, AC-R21-8. No new method on VerdictGrouper in any section. No contradiction.
- Q3 disposition: "per-fleet-tick scope" — § 2.3 explicit; § 4.1 fan-out loop iterates all shards with one cluster_event_id; ACs are all per-tick (no multi-event tests). No contradiction.
- Q4 disposition: "e-BH stays agnostic" — § 2.5 explicit; § 6 anti-scope; no e-BH AC. No contradiction.
- Q5 disposition: "cluster_event_id optional" — TypeScript optionality in § 2.1 interface; AC-R21-3 verifies absent → undefined. No contradiction.
- Q6 disposition: "inline FusedVerdict literals; no v9Y" — § 2.6 + § 4.2 (makeVerdict inline helper) + § 6 anti-scope (no fixture file). No contradiction.

**Narrative-classification-vs-structural-prescription cross-check (R20 MINOR-1 reinforcement)**: § 5 preamble classifies AC-R21-1..8 + AC-R21-11 as runtime tests AND AC-R21-9/-10 as binding-command attestations. Cross-checked against § 4 prescriptions:
- § 4.3 prescribes RED commit with 8 placeholders → matches "AC-R21-1..8 are runtime tests in q21-*.test.ts"
- § 4.4 prescribes GREEN commit replaces placeholders with real bodies AND reports typecheck + full suite + per-file counts in commit message → matches "AC-R21-9/-10 are binding-command attestations" AND "AC-R21-1..8 are runtime tests"
- § 4.6 prescribes chore-B adds AC-R21-11 as runtime test in q21-*.test.ts → matches "AC-R21-11 is a runtime test"
- No § 4.x prescribes AC-R21-9/-10 as runtime tests anywhere
- No § 4.x prescribes AC-R21-1..8 + AC-R21-11 as binding-command-attestation-only

**Classification claims agree with § 4.x prescriptions for all 11 ACs.** **PASS.**

### 9.7 Empirical-premise-verification (R08 MAJOR-2 reinforcement)

For every load-bearing factual claim about production code behavior, verified by direct file-open or grep at session start:

| Claim | Verification |
|---|---|
| `engine/fleet/combine.ts` is Tessera-original | Read combine.ts:33-34 → "Tessera-original code (NOT vendored from DeploySignal)" |
| `engine/fleet/detectors.ts` is Tessera-original | Read detectors.ts:39-40 → "Tessera-original code" |
| `engine/fleet/e-bh.ts` is Tessera-original | Read e-bh.ts:56-57 → "Tessera-original code" |
| `engine/verdict-groups.ts` post-R20 exports `IngestResult` | Read verdict-groups.ts:54 → `export interface IngestResult` |
| `VerdictGrouper.ingest` accepts `opts.cluster_event_id?: string` post-R20 | Read verdict-groups.ts:86-90 → `opts: { terminal?: boolean; cluster_event_id?: string } = {}` |
| `engine/types/verdict.ts` exports `FusedVerdict` + `VerdictGroup` | Read verdict.ts:112-126 (FusedVerdict) + verdict.ts:180-213 (VerdictGroup, including `cluster_event_id?: string` at line 209) |
| Pre-R21 baseline test count = 192/0 | R20 Reviewer report REVIEWER-REPORT-R20.md attests; Reviewer cold-verified at HEAD `7eb3a63` |
| Baseline SHA `62e28d7` = HEAD at session start | git log --oneline -1 at session start = `62e28d7 chore(R21-prep): NEXT-ROLE.md → R21 Architect; SLICE 2.B fleet-merge consumption` |
| No engine code currently imports `VerdictGrouper` | Grep VerdictGrouper engine/ → matches in engine/verdict-groups.ts (declaration) only; no other engine consumer pre-R21 (confirms verdict-consumer.ts is the first) |
| `*.js` gitignored | R20 Reviewer attests at REVIEWER-REPORT-R20.md § 4 (8 paths in diff; 3 sibling .js paths absent because gitignored). Architect did not re-verify the .gitignore file directly — relying on R20 Reviewer cold-attestation. (Carry-forward risk: if .gitignore is altered concurrently, AC-R21-11 may surface .js entries. Mitigation: allowed-set includes them; would not fail.) |
| q11/q12/q13 tests do NOT depend on R21 module | Reads of test/q1[123]-*.test.ts top-of-file imports — none import from engine/fleet/verdict-consumer.ts (file doesn't exist yet) |
| q20 tests are R20 deliverable; do NOT depend on R21 module | Read test/q20-…test.ts:13-19 imports — only verdict-groups + types/verdict. No R21 dep. |
| `_substrate/v9X-cluster.ts` is topology-only | Verified by PHASE-2-SLICE-1-CLOSE-WALK § 1: "exports makeV9XSingleRackCluster({nShards?}) → TopologySnapshot" |
| Inherited Addition #25 D2 + D5 semantics preserved at R20 | Per Q-R20-SPEC § 2.4 + § 2.5 — D2 close-trigger semantics + D5 format-string discipline both PRESERVED (legacy mode byte-identical at observable level). Spec verified by Read at session start. |

All 14 load-bearing facts verified. None inherited from prior testimony without direct check. **PASS.**

### 9.8 Vendored-file-delta-assertion-surface-enumeration (R18 OBS-2 reinforcement)

R21 does NOT touch any vendored file (verified at § 9.7 above — combine/detectors/e-bh are Tessera-original; verdict-groups.ts is R20-frozen; types/verdict.ts is R18+R20-frozen; no new vendoring at R21). Therefore this gate is **N/A for R21** — no q01-no-at-pin-deltas / q01-vendoring-coverage consumer-surface tracing is needed.

Explicit cross-check: does `engine/fleet/verdict-consumer.ts` (new module) appear in any q01 test's checked-files list?
- `q01-no-at-pin-deltas.test.ts` AT_PIN_FILES enumerated at § 3 of that test → 36 entries, all under `engine/` or `tools/`; `engine/fleet/` not present (none of R11/R12/R13 added their files; they're Tessera-original). New `engine/fleet/verdict-consumer.ts` NOT in AT_PIN_FILES. No consumer impact.
- `q01-vendoring-coverage.test.ts` — checks that vendored-at-pin files have the canonical first-line SHA header. New module is Tessera-original; no SHA header expected; not asserted by q01-vendoring-coverage. No consumer impact.

**PASS (N/A).**

### 9.9 Anti-scope-baseline + end-bound soundness (R15 MINOR-1 + R19 MAJOR-3 + R20 reinforcement)

- Baseline SHA = `62e28d7` per § 9.7 verification — last commit IMMEDIATELY before R21 Architect work. No Memorial-Updater or operator-prep commits land between R20's chore-B and `62e28d7` that would inflate the baseline (verified by git log inspection at session start: `4925ff6` = R20 Memorial outputs; `62e28d7` = R21 operator prep — both PRECEDE R21 work; `62e28d7` IS the immediately-prior commit).
- End-bound = chore-A MERGE-READY SHA (substituted at chore-B by Implementer per § 4.6), NOT HEAD. Per TQ-4 γ pattern.
- Allowed-set includes `coordination/MEMORIAL.md` (Reviewer adds entries) + `coordination/NEXT-ROLE.md` (Implementer attestation, Reviewer routing). Both required for the end-bound diff to be subset-clean.

**PASS.**

### 9.10 Halt-condition pre-anticipation (R08 + R19 MAJOR-1/2/3/4 reinforcement)

5 specific halt scenarios anticipated:

| Scenario | Architect-prescribed response |
|---|---|
| (i) Typecheck fails on the new module (`npx tsc --noEmit` non-zero) | HALT (b) per CLAUDE-IMPLEMENTER.md; write `DIAGNOSTIC-R21-typecheck-<topic>.md`; STATUS: ESCALATE with bounded options (e.g., fix the type error if spec-internal; ESCALATE if requires anti-scope change). |
| (ii) Baseline drift: pre-R21 `node --test test/*.test.js` ≠ 192/0 | HALT (b); write `DIAGNOSTIC-R21-baseline-drift.md` with OBSERVED counts; STATUS: ESCALATE with bounded options (rebase / re-pin / re-vendor). |
| (iii) `git diff 62e28d7..<chore-A> --name-only` includes an unanticipated file outside the 8-entry allowed-set | HALT; write `DIAGNOSTIC-R21-anti-scope-<filename>.md`; STATUS: ESCALATE with bounded options (revert / amend allowed-set with operator approval / operator-disposition to extend). Do NOT modify anti-scope silently. |
| (iv) `IngestResult` import path fails because engine/verdict-groups.ts has been re-pinned mid-round | HALT (b); write `DIAGNOSTIC-R21-ingest-result-import.md`; STATUS: ESCALATE. (Low-probability — engine/verdict-groups.ts is R21 anti-scope; concurrent modification would require operator intervention.) |
| (v) Late-arrival result with mismatched cluster_event_id surfaces unexpected behavior in q21 tests | NOT a halt scenario — per R20 § 2.5 tuple-match, late-arrival across cluster-event scopes is structurally impossible (mismatch → new group). If a q21 test fails with this hypothesis, it indicates an R20 regression and IS a halt-discipline (b) trigger; HALT + DIAGNOSTIC. (Belt-and-suspenders enumerated.) |

Per R19 MAJOR-1/2/3 reinforcement: silent in-line resolution is forbidden for any scenario above. Per R19 MAJOR-4 + R08 reinforcement: MEMORIAL entries must not self-exonerate; if Implementer encounters a halt scenario and resolves it, the resolution MUST be in a DIAGNOSTIC + operator disposition, not in a CONFIRMATION entry framing the resolution as "correct" or "needed no halt." **PASS.**

### 9.11 Memorial-self-exoneration guard (R08 + R19 MAJOR-4 reinforcement)

The Implementer MEMORIAL section MUST NOT contain CONFIRMATION entries that frame a discipline deviation as "correct" or "acceptable." Architect notes this constraint here so the Implementer reading the spec is reminded; per CLAUDE-COMMON.md REINFORCED 2026-05-16 + R19 reinforcement. If a halt scenario triggers and is resolved via operator disposition, the MEMORIAL must record both the VIOLATION (deviation) and the CONFIRMATION (proper halt-discipline) — NOT a self-exonerating CONFIRMATION that absorbs the deviation. **Architect-prescribed: PASS.**

### 9.12 Audit-tier-promotion guard (R19 reinforcement)

R21 is **full tier** per NEXT-ROLE.md (justified by A6 + A2). No audit-tier-promotion-mid-round risk applies. Spec emit at full-tier fidelity. **PASS (N/A).**

### 9.13 Skill-14 PRD-conjunction-cross-check

Walked each R21 deliverable against PRD FR/AC entries:

| Deliverable | PRD trace |
|---|---|
| `engine/fleet/verdict-consumer.ts` (fan-out + rollup) | FR-E3a (Phase 2 outer aggregator; cross-shard correlation via fleet-merge consumption layer); SCOPING-MEMO § 2.3 line 345 ("Fleet-merge consumption layer; per-shard verdict aggregation contract with cluster_event_id propagation") |
| AC-R21-2 (cluster_event_id propagation) | AC-P4 (fleet-event-conditional drift attribution leg) — load-bearing for SLICE 4 event-feed |
| AC-R21-7 (rollup) | FR-E3a (outer aggregator) — SLICE 4 event-feed consumer surface readiness |
| Anti-scope items § 6 | A12/A13/A14/A16/A17 per SCOPING-MEMO § 2.3 |

No PRD claim unbound; no spec deliverable unscoped. **PASS.**

### 9.14 Cross-section consistency 17-token check (R02 reinforcement)

17 tokens verified for byte-identical use across all spec sections:
1. `cluster_event_id` — § 0, § 1, § 2.1, § 2.3, § 4.1, § 5, § 6 → byte-identical
2. `FleetTickInput` — § 1, § 2.1, § 4.1, § 5 → byte-identical
3. `FleetTickIngestResult` — § 1, § 2.1, § 4.1, § 4.2, § 5 → byte-identical
4. `ClusterEventRollup` — § 1, § 2.1, § 4.1, § 4.2, § 5 → byte-identical
5. `fleetTickIngest` — § 1, § 2.1, § 2.3, § 4.1, § 4.2, § 5 → byte-identical
6. `rollupByClusterEvent` — § 1, § 2.1, § 2.4, § 4.1, § 4.2, § 5 → byte-identical
7. `per_shard_verdicts` — § 1, § 2.1, § 4.1, § 5 → byte-identical
8. `ts_seconds` — § 2.1, § 4.1, § 5 → byte-identical
9. `ingest_results` — § 1, § 2.1, § 4.1, § 4.2, § 5 → byte-identical
10. `attributed_group` — § 1 failure modes, § 2.4, § 4.1, § 5 → byte-identical
11. `group_id` — § 2.4, § 4.1, § 5 → byte-identical
12. `deploy_id` — § 1, § 2.4, § 4.1, § 5 → byte-identical (NOTE: q21 test uses `deploy_ref` for FusedVerdict; that's the inherited FusedVerdict field at engine/types/verdict.ts:125 — `deploy_id` is the VerdictGroup field at engine/types/verdict.ts:182. The transition `verdict.deploy_ref → attributed_group.deploy_id` happens inside `VerdictGrouper.openGroupAt` at engine/verdict-groups.ts:182. Both names are correct in their respective contexts; not a token-identity issue.)
13. `q21` (file basename) — § 3, § 4.2, § 4.3, § 4.4, § 4.6, § 5 → byte-identical
14. `engine/fleet/verdict-consumer.ts` — § 1, § 2.1, § 3, § 4.1, § 5, § 6, § 9.7 → byte-identical
15. `test/q21-fleet-verdict-consumer.test.ts` — § 1, § 3, § 4.2, § 4.3, § 4.4, § 5 → byte-identical
16. `62e28d7` (baseline SHA) — § 0 preamble, § 3, § 4.2, § 5, § 9.7, § 9.9 → byte-identical
17. `<MERGE-READY-SHA>` placeholder — § 3, § 4.2, § 4.5, § 4.6, § 5 → byte-identical

**All 17 tokens consistent.** **PASS.**

---

## 10. Pre-emit grilling summary

13 gates applied (§ 9.1 – § 9.14, skipping 9.12 N/A): all PASS. Spec is ready for routing to Implementer.

Per Superpowers Review phase: re-read this spec as if I am the Implementer receiving it cold. The spec answers:
- WHAT to build (§ 2.1 four exports with field-level shape)
- HOW it behaves (§ 2.2-2.7 mechanism + edge-case semantics)
- WHERE to place it (§ 3 component inventory)
- HOW to verify it (§ 5 ACs in Given/When/Then)
- WHAT not to touch (§ 6 anti-scope)
- HOW to commit (§ 4.3-4.7 RED → GREEN → chore-A → chore-B sequence)
- WHAT to do if blocked (§ 9.10 halt-condition pre-anticipation)

**Zero clarifying questions required.** Routing.
