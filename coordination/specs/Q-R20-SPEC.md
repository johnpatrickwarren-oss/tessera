# Q-R20-SPEC — Phase 2 SLICE 2.A (VerdictGrouper cluster_event_id scope re-architecture, aggregator-contract-only)

**Round:** R20 (full tier — A4 novel data-model semantics for composite cluster-event scope + A6 blast-radius on `engine/verdict-groups.ts` and every existing VerdictGroup consumer)
**Inputs to Implementer:** this file + `coordination/NEXT-ROLE.md` (operator round scope, halt conditions, baseline SHAs) + `coordination/PRD.md` (FR-E3a, AC-P4) + `coordination/SCOPING-MEMO-v0.3.md` (§ 2.3 + § 9 vendoring-with-deltas policy) + `coordination/PHASE-2-SLICE-1-CLOSE-WALK.md` (§ 2 vendored-with-deltas two-step pattern + § 2 anti-scope diff-range SHA anchoring) + existing `engine/types/verdict.ts` (post-R18) + existing `engine/verdict-groups.ts` (vendored-at-pin pre-R20).

**Sidecar:** `coordination/specs/Q-R20-SPEC-AUDIT.md` (Architect ceremony content; Implementer is NOT required to read).

**R20 baseline SHA:** `cecd677` (HEAD at session start; last commit before R20 work — `chore(R20-prep): NEXT-ROLE.md → R20 Architect; SLICE 2 scope direction`).

**Pre-R20 baseline test count:** 181 / 0 (per R19 attestation at HEAD `0a8832b`; cold-verified by R19 Reviewer). R20 adds new q20 tests; OBSERVED total reported by Implementer per R03 MINOR-4 reinforcement.

---

## 0. Brainstorm phase (Superpowers — inline)

### Problem framing

NEXT-ROLE.md (R20 routing) frames SLICE 2 as: outer aggregator extending vendored L3b `VerdictGroup` aggregator with `cluster_event_id` scope + fleet-merge consumption layer + per-shard verdict aggregation contract with `cluster_event_id` propagation. **VerdictGroup scope re-architecture cost dominates this slice** (per `SCOPING-MEMO-v0.3.md` § 2.3 line 345). Recommendation to split fleet-merge consumption layer to a later slice round if R20 spec scope exceeds ~12 ACs.

NEXT-ROLE.md poses 6 architectural questions for the brainstorm:

1. Cluster-event-id origination point: (a) ingest() parameter / (b) per-call context object / (c) field on FusedVerdict / (d) aggregator config.
2. group_id format under cluster-event scope: composite / scoped / conditional.
3. Multi-deploy-per-event semantics: how does the aggregator key when one cluster_event_id spans multiple deploy_ids?
4. Backward-compat path: required vs optional in consumer contract.
5. Late-arrival classification under cluster-event scope (Addition #25 D2 preservation).
6. Fleet-merge consumption layer split decision.

### Brainstorm — three distinct approaches to the aggregator scope re-architecture

**Approach A — In-place delta on `engine/verdict-groups.ts` with ingest-opts-driven cluster_event_id; (cluster_event_id, deploy_id, window_start_ts) keying; legacy mode coexisting with cluster-event mode; aggregator-contract-only at R20 (defer fleet-merge consumption to R21).**

Concrete shape:
- Extend `VerdictGroupOpts` and `ingest()` opts argument with optional `cluster_event_id?: string`.
- Internal keying transitions from `openByDeploy: Map<deployId, VerdictGroup>` to `openByGroupKey: Map<groupKey, VerdictGroup>` where `groupKey = ${cluster_event_id ?? ''}|${deploy_id}`.
- `group_id` format: conditional — composite `group-{cluster_event_id}-{deploy_id}-{window_start_ts}` when cluster_event_id is present at open time; inherited `group-{deploy_id}-{window_start_ts}` preserved when cluster_event_id is absent (legacy mode).
- VerdictGroup carries `cluster_event_id` populated at open time from ingest opts (R18 type-field already exists; SLICE 2 wires the writer).
- Late-arrival match requires tuple-equality on (cluster_event_id, deploy_id) including undefined==undefined.
- Strengths: minimal type-surface churn (R18 already added the optional field); legacy callers unchanged; SLICE 4 event-feed becomes a natural producer of `cluster_event_id` at ingest-time without modifying FusedVerdict shape (A14 anti-scope preserved). Forward-compatible for R21 fleet-merge consumption layer.
- Weaknesses: introduces `vendored-with-deltas` transition on `engine/verdict-groups.ts` (mitigation: pre-handle per PHASE-2-SLICE-1-CLOSE-WALK § 2 two-step pattern in spec component inventory upfront).
- Hidden assumptions: ingest-time origination is acceptable (SLICE 4 event-feed will populate via this signature). Verified by SCOPING-MEMO-v0.3.md § 2.3 dependency graph — Phase 2 event-feed → Phase 1 freeze-hook AND → Phase 2 outer-aggregator scope.
- Risks: legacy callers still work because `cluster_event_id` is optional; new callers compose explicitly. The (cluster_event_id ?? '') segment in the key string is a string-coalescence, not a coercion of meaning; both undefined and explicit empty-string collapse to the same key, but the spec treats empty-string as semantically equivalent to absent (rare edge case worth a single AC).

**Approach B — Field-on-FusedVerdict origination (cluster_event_id flows on the verdict itself).**

Concrete shape:
- Add `cluster_event_id?: string` to FusedVerdict (engine/types/verdict.ts).
- VerdictGrouper reads `verdict.cluster_event_id` directly; no ingest opts change.
- Same keying + group_id + late-arrival rules as Approach A.

- Strengths: aggregator API unchanged at the signature level; caller-of-caller propagation is automatic.
- Weaknesses: violates v0.3 Extension 1 anti-scope **A14** ("NO modification to per-shard verdict shape"). FusedVerdict is per-shard / per-fusion-tick; cluster_event_id is per-cluster-event-window — different lifecycle. Tying the two creates a producer-consumer coupling that SLICE 4 event-feed would have to invert (event-feed → orchestrator → fusion → verdict), instead of the natural (event-feed → aggregator-ingest directly).
- Hidden assumptions: that every producer of FusedVerdict is positioned to know the active cluster_event_id at fusion-tick time. SCOPING-MEMO-v0.3.md § 2.3 line 218 places the event-feed at the cluster-level ingestion surface — orthogonal to per-shard fusion. Empirically false-coupled.
- Risks: A14 anti-scope breach; pulls fusion-layer code into SLICE 2 scope (cross-section anti-scope expansion); high blast radius.

**Approach C — Per-call context object (separate from FusedVerdict + separate from ingest opts).**

Concrete shape:
- Add a `ClusterEventContext` interface and a separate `setClusterEventContext(ctx)` method on VerdictGrouper.
- Subsequent `ingest()` calls consult the most-recently-set context for cluster_event_id propagation.

- Strengths: stateful context decouples per-call signature from per-event metadata.
- Weaknesses: introduces hidden state in the aggregator (mutable property). Hidden-state APIs are precisely what the inherited engine constraint (Phase-3.d.D close per v0.3 § 1 + Addition #25 D6 zero-latency-penalty) cautions against. Forces callers to manage context lifecycle separately from ingest lifecycle.
- Hidden assumptions: that the context lifecycle matches the ingest lifecycle. In practice (per SCOPING-MEMO-v0.3.md § 2.3), a cluster event may span concurrent deploy_ids and overlapping windows — the most-recently-set context is racy under any non-trivial concurrency, and even under single-threaded use it creates an ordering invariant the caller has to remember.
- Risks: hidden-state class of bugs; high test coverage required to pin down ordering semantics; less ergonomic than (A) for SLICE 4 event-feed which is naturally per-event not per-stream.

### Constraint elimination

- **Anti-scope A14** ("NO modification to per-shard verdict shape", v0.3 § 2.3) eliminates **Approach B**.
- **Architectural hidden-state hazard** (inherited engine zero-latency-penalty + Addition #25 D6) eliminates **Approach C**.
- **R18 type-surface already in place** (`VerdictGroup.cluster_event_id?: string` field exists per engine/types/verdict.ts:201-209) confirms Approach A's writer-side wiring is the natural SLICE 2 follow-on.

### Selection — Approach A

**Why picked.** Minimal cross-engine blast radius (only `engine/verdict-groups.ts` modified; vendored-with-deltas transition pre-handled per § 9 + § 2 close-walk pattern). Backward-compat preserved end-to-end (existing callers untouched; legacy mode coexists with cluster-event mode). SLICE 4 event-feed has a clean producer surface (ingest-time `cluster_event_id` argument). Per-shard verdict shape preserved (A14). VerdictGroup.cluster_event_id field added at R18 SLICE 1 becomes load-bearing at SLICE 2 — direct alignment with NEXT-ROLE.md framing.

**Why rejected — Approach B.** A14 anti-scope breach. FusedVerdict is the wrong attachment site for a cluster-level event identifier; per-shard verdict producer is not positioned to know the active cluster_event_id.

**Why rejected — Approach C.** Hidden mutable state in the aggregator. Adds a context-lifecycle invariant callers must remember. Worse ergonomics than (A) for the SLICE 4 event-feed which is naturally per-event.

### Disposition of NEXT-ROLE.md architectural questions

| Q | Resolution | Where |
|---|---|---|
| Q1 — Cluster-event-id origination | (a) ingest opts parameter | § 2.1 + AC-R20-1 |
| Q2 — group_id format | **Conditional** — composite when cluster_event_id present, inherited when absent | § 2.2 + AC-R20-4, AC-R20-5 |
| Q3 — Multi-deploy-per-event semantics | **One group per (cluster_event_id, deploy_id, window_start_ts) tuple** | § 2.3 + AC-R20-6, AC-R20-7 |
| Q4 — Backward-compat path | **Legacy mode coexisting with cluster-event mode** (cluster_event_id optional; absent → inherited deploy_id-only scope) | § 2.4 + AC-R20-3, AC-R20-5 |
| Q5 — Late-arrival classification | **Tuple-equality match** on (cluster_event_id, deploy_id); mismatch → open new group | § 2.5 + AC-R20-8 |
| Q6 — Fleet-merge consumption split | **Split** — R20 = aggregator-contract-only (this spec); R21 = fleet-merge consumption layer wiring | § 7 + spec scope-fence in § 6 |

---

## 1. Design phase sketch (Superpowers — inline)

### Component boundaries

| What | State | Where |
|---|---|---|
| `VerdictGroup` interface (incl. `cluster_event_id?: string` field added at R18) | EXISTS — unchanged at R20 | `engine/types/verdict.ts:180-213` |
| `VerdictGroupOpts` interface | EXISTS — unchanged at R20 (constructor opts are static, not per-ingest) | `engine/verdict-groups.ts:32-39` |
| `VerdictGrouper.ingest()` signature + opts argument | EXISTS — **CHANGED**: add optional `cluster_event_id?: string` to the per-call opts object | `engine/verdict-groups.ts:75-79` |
| `VerdictGrouper` internal keying | EXISTS — **CHANGED**: `openByDeploy: Map<string, VerdictGroup>` → `openByGroupKey: Map<string, VerdictGroup>` where key = `${cluster_event_id ?? ''}|${deploy_id}` | `engine/verdict-groups.ts:66` |
| `VerdictGrouper.openGroup()` private helper | EXISTS — **CHANGED**: accepts cluster_event_id; populates VerdictGroup.cluster_event_id + composes group_id under conditional format | `engine/verdict-groups.ts:145-163` |
| `VerdictGrouper.groupId()` private helper | EXISTS — **CHANGED**: branch on cluster_event_id presence → composite vs inherited format | `engine/verdict-groups.ts:141-143` |
| `VerdictGrouper.findRecentClosedForDeploy()` | EXISTS — **CHANGED**: rename + extend to find by (cluster_event_id, deploy_id) tuple | `engine/verdict-groups.ts:216-225` |
| `VerdictGrouper.openGroupForDeploy()` public accessor | EXISTS — **CHANGED**: extend to accept (cluster_event_id?, deploy_id) for symmetric lookup; legacy single-arg behavior preserved when cluster_event_id omitted | `engine/verdict-groups.ts:135-137` |
| `VerdictGrouper.closeDeployGroup()` private | EXISTS — **CHANGED**: rename + accept (cluster_event_id, deploy_id) tuple; identical close semantics | `engine/verdict-groups.ts:171-184` |
| `engine/verdict-groups.ts` vendoring header (lines 1-5) | EXISTS — preserved byte-identical | `engine/verdict-groups.ts:1-5` |
| `engine/verdict-groups.ts` Tessera amendment annotation block | NEW — inserted after line 5 (Delta 4 analog to R18) | new |
| `coordination/VENDORING-MANIFEST.md` row for `engine/verdict-groups.ts` | EXISTS — **CHANGED**: status `vendored-at-pin` → `vendored-with-deltas`; notes column populated | `coordination/VENDORING-MANIFEST.md:28` |
| `test/q01-no-at-pin-deltas.test.ts` AT_PIN_FILES list | EXISTS — **CHANGED**: remove `engine/verdict-groups.ts` line; update file-count comment to track | `test/q01-no-at-pin-deltas.test.ts:48-52` |
| `test/q20-verdict-grouper-cluster-event-scope.test.ts` | CREATED | new |
| `coordination/specs/Q-R20-SPEC.md` + `Q-R20-SPEC-AUDIT.md` | CREATED | this file + sidecar |
| `engine/topology-overlay.ts` (BFS, computeSnapshotHash, TopologyEnricher) | UNCHANGED — NOT in R20 scope | `engine/topology-overlay.ts` |
| `engine/types/verdict.ts` | UNCHANGED at R20 (R18 SLICE 1 type already shipped `cluster_event_id?` field; R20 only wires the writer) | `engine/types/verdict.ts` |
| Fleet-merge layer (`engine/fleet/combine.ts`, `engine/fleet/detectors.ts`, `engine/fleet/e-bh.ts`) | UNCHANGED — explicitly anti-scoped per NEXT-ROLE.md A12 / SLICE-2 split | `engine/fleet/*` |
| `test/_substrate/v9X-cluster.ts` (R18) | UNCHANGED — explicitly anti-scoped per NEXT-ROLE.md | `test/_substrate/v9X-cluster.ts` |
| `test/_substrate/factories.ts` | UNCHANGED — read-only reference if Implementer chooses to use cell/baseline factories (none required at R20) | `test/_substrate/factories.ts` |

### Integration points (each verified against PRD / scope-memo / inherited-engine contract)

1. **`engine/verdict-groups.ts` ← ingest opts.cluster_event_id (new contract).** Consumers: existing in-tree callers of `VerdictGrouper.ingest()` (none — VerdictGrouper is currently exercised only by inherited engine code paths that R20 does NOT activate; per grep, no Tessera test or production code instantiates VerdictGrouper directly pre-R20). New R20 q20 tests are the first Tessera consumers. Additive optional opts field preserves all conceivable legacy callers.
2. **`engine/verdict-groups.ts` ← internal keying transition (openByDeploy → openByGroupKey).** Consumers: ONLY internal — no public method exposed `openByDeploy` directly. `openGroupForDeploy(deploy_id)` is the one public accessor; SLICE 2 extends it to `openGroupForDeploy(deploy_id, cluster_event_id?)` with legacy single-arg form preserved (default cluster_event_id = undefined; key string `'|${deploy_id}'`).
3. **`engine/types/verdict.ts` ← VerdictGroup.cluster_event_id (already shipped at R18 SLICE 1).** Consumers: this R20 work POPULATES the field at open-time inside `openGroup()`. No type change at R20.
4. **`coordination/VENDORING-MANIFEST.md` ← row status transition for `engine/verdict-groups.ts`.** Consumers: `tools/vendor-from-deploysignal.sh` (re-pinning policy); audit-trail at every close-walk. Transition is mechanical per PHASE-2-SLICE-1-CLOSE-WALK § 2 two-step pattern.
5. **`test/q01-no-at-pin-deltas.test.ts` ← AT_PIN_FILES list removal of `engine/verdict-groups.ts`.** Consumers: this test itself (byte-identity assertion vs DeploySignal source). Removal is mechanical per PHASE-2-SLICE-1-CLOSE-WALK § 2.
6. **`test/q20-*.test.ts` → `engine/verdict-groups`.** New consumer. Imports `VerdictGrouper`. Uses inline FusedVerdict literals (no fixture module needed at R20 — round size constraint; v9X is topology-only and not relevant here).

### Integration-point verification against PRD / scope-memo

- **FR-E3a (Phase 2 outer aggregator).** SLICE 2 (this round, aggregator-contract part) wires `cluster_event_id` propagation through the VerdictGrouper contract. ✓
- **AC-P4 (Phase 2 close).** Per-shard verdict attribution distinguishing (i) single-shard / (ii) topology-localized / (iii) fleet-event-conditional — SLICE 2 enables the (iii) leg via the cluster-event keying. ✓
- **Anti-scope A14** ("NO modification to per-shard verdict shape", v0.3 § 2.3). FusedVerdict shape unchanged. ✓
- **Anti-scope A16** (Addition #26 D4 `correlational_not_causal: true` wire-format). Unchanged. ✓
- **Inherited Addition #25 D2** (window-based close at `(deploy_id, window_start_ts)` scope). PRESERVED in legacy mode (absent cluster_event_id); EXTENDED to `(cluster_event_id, deploy_id, window_start_ts)` scope in cluster-event mode. Close-trigger semantic identical (window elapsed OR terminal verdict OR flush). NEXT-ROLE.md "NO Addition #25 D2 reversal" satisfied — D2 is preserved/extended, not reversed.
- **Inherited Addition #25 D5** (group_id format `group-{deploy_id}-{window_start_ts}`). PRESERVED in legacy mode; EXTENDED to composite `group-{cluster_event_id}-{deploy_id}-{window_start_ts}` in cluster-event mode. NEXT-ROLE.md "NO Addition #25 D5 reversal beyond minimum" satisfied — the factory pattern + format-string discipline are preserved; the inherited format-string is unchanged in absence of cluster_event_id.

### Failure modes (per integration point)

1. **Existing callers of `openGroupForDeploy(deploy_id)` break.** Mitigation: default cluster_event_id argument to `undefined`; key string `'|${deploy_id}'` matches a group opened in legacy mode. Backward-compat preserved at the API level.
2. **`q01-no-at-pin-deltas` test fails because `engine/verdict-groups.ts` body diverges from DeploySignal source.** Pre-handled via two-step maintenance pattern: VENDORING-MANIFEST.md row transitions to vendored-with-deltas + AT_PIN_FILES list removes the file (Component inventory binds both deltas explicitly; AC-R20-10 + AC-R20-11 verify).
3. **`q01-vendoring-coverage` test fails because the canonical first-line SHA pin moves.** Mitigation: the Tessera amendment annotation block (Delta 4 analog) lives BELOW line 5; lines 1-5 stay byte-identical. The vendoring-coverage test only reads the first line (per R18 verification at AC-R18-9). AC-R20-15 binds the annotation placement.
4. **Empty-string `cluster_event_id: ''` semantics ambiguous.** Disposition (§ 2.6): empty-string is semantically equivalent to absent — the spec treats `''` and `undefined` as the same key segment. AC-R20-6's edge-case row covers this explicitly (alternative: reject empty-string at the boundary; rejected — adds runtime validation that the type system can't enforce, doesn't help any caller).
5. **Late-arrival on partial-overlap windows (closed group with no cluster_event_id; new verdict with cluster_event_id).** Disposition (§ 2.5): strict tuple match → mismatch → open new group (not attached). AC-R20-8 covers.
6. **Open-group inventory could carry hidden state across (cluster_event_id, deploy_id) tuples that share deploy_id.** Mitigation: keying transition isolates groups by full tuple; close-trigger reads only the matching tuple's open group; no cross-tuple state leakage. AC-R20-7 covers via a concurrent-tuples scenario.

---

## 2. Mechanism (every design decision made here; nothing deferred to Implementer)

R20 ships three artifacts, plus two maintenance bookkeeping edits (VENDORING-MANIFEST.md row + q01 AT_PIN_FILES) pre-handled upfront per PHASE-2-SLICE-1-CLOSE-WALK § 2 two-step pattern, plus the corresponding routing + Architect-ceremony artifacts.

### 2.1 Ingest opts argument (Q1 origination disposition)

`VerdictGrouper.ingest()` currently accepts `(verdict, ts_seconds, opts: { terminal?: boolean })`. R20 extends `opts` with one optional field:

```
opts: { terminal?: boolean; cluster_event_id?: string }
```

- Optional; absent → legacy mode preserved.
- Per-call (not per-instance) — a single VerdictGrouper instance can ingest verdicts under different cluster_event_ids over its lifetime, exactly how SLICE 4's event-feed will drive it.
- No constructor-time `VerdictGroupOpts` change (constructor controls static knobs — window_seconds, grace_seconds, confidence_saturation — none of which depend on cluster_event_id).

**Rationale.** Approach A in § 0 brainstorm. Eliminates Approaches B (A14 anti-scope) and C (hidden state).

### 2.2 group_id format (Q2 disposition — conditional)

The inherited `groupId(deployId, window_start_ts)` returns `\`group-${deployId}-${window_start_ts}\``. R20 extends:

- **Absent cluster_event_id** (legacy mode): `\`group-${deployId}-${window_start_ts}\`` — byte-identical to inherited. AC-R20-5 binds.
- **Present cluster_event_id** (cluster-event mode): `\`group-${cluster_event_id}-${deployId}-${window_start_ts}\``. AC-R20-4 binds.

**Rationale.** Conditional preserves backward compat at the wire level (existing audit consumers that pattern-match on `group-{deploy_id}-{ts}` continue to work for legacy-mode groups). Composite extends naturally — cluster_event_id is prepended at the highest scope level, matching the natural hierarchy in the dependency graph (cluster event → deploy → window). NEXT-ROLE.md "NO Addition #25 D5 reversal beyond minimum" honored — format-string discipline preserved; inherited format unchanged when cluster_event_id is absent.

### 2.3 Multi-deploy-per-event keying (Q3 disposition — one group per (cluster_event_id, deploy_id, window_start_ts) tuple)

Internal open-group map transitions:

- **Before (inherited):** `openByDeploy: Map<string, VerdictGroup>` keyed on `deploy_id`.
- **After (R20):** `openByGroupKey: Map<string, VerdictGroup>` keyed on `groupKey(cluster_event_id, deploy_id) = ${cluster_event_id ?? ''}|${deploy_id}`.

A single `cluster_event_id` value (e.g., `'cluster-firmware-2026-05-17'`) spanning two deploys (e.g., `'deploy-A'` and `'deploy-B'`) produces TWO distinct open groups (keys `'cluster-firmware-2026-05-17|deploy-A'` and `'cluster-firmware-2026-05-17|deploy-B'`). Both groups carry the same `cluster_event_id` field on the VerdictGroup; the SLICE 2 outer-aggregator wiring (R21 — out of R20 scope) will roll them up by cluster_event_id at consumer time.

**Rationale.** Preserves per-shard / per-deploy attribution (US-01 cluster oncall needs to distinguish "shard 47 deploy A" from "shard 47 deploy B" even when they share a cluster_event_id). Inherited per-deploy keying semantic is preserved within the legacy-mode subset of the key space. SLICE 3 topology overlay can join across deploys at the cluster_event_id level without losing per-deploy granularity. Option B (collapse all deploys' verdicts into a single per-event group) would lose per-shard attribution; Option C (two groups per ingest — parallel per-deploy + per-cluster-event hierarchy) would double the open-group footprint without architectural benefit at R20.

### 2.4 Backward-compat path (Q4 disposition — legacy mode coexisting with cluster-event mode)

`cluster_event_id` is **optional at the consumer contract** at R20. Absent → inherited deploy_id-only scope (legacy mode). Present → composite scope (cluster-event mode). Both modes coexist on the same VerdictGrouper instance across a sequence of ingest calls. The decision to require `cluster_event_id` at any future SLICE is **out of R20 scope** (SLICE 4 event-feed activation may revisit; documented as a future architectural decision but not a R20 commitment).

**Rationale.** Preserves backward-compat end-to-end. No existing caller is forced to change. New callers (R21 fleet-merge consumption layer; SLICE 4 event-feed) opt into cluster-event mode by passing `cluster_event_id`.

### 2.5 Late-arrival classification (Q5 disposition — tuple-equality match)

The inherited `findRecentClosedForDeploy(deployId, ts)` is renamed to `findRecentClosedForKey(cluster_event_id, deploy_id, ts)` and matches on tuple equality:

- Late-arrival attaches to a recently-closed group iff (a) the closed group's `(cluster_event_id, deploy_id)` tuple equals the incoming verdict's tuple (treating undefined and `''` as equivalent per § 2.6), AND (b) `ts - closed_at_ts ≤ grace_seconds` (inherited D2 grace window).
- Tuple mismatch (cluster_event_id mismatched OR deploy_id mismatched OR one present + one absent) → no attach → open new group.

This applies symmetrically:
- Legacy-mode incoming + legacy-mode closed (both undefined cluster_event_id) → existing behavior preserved (D2 + grace-window late-arrival semantic identical to inherited).
- Cluster-event-mode incoming with cluster_event_id 'X' + closed group with cluster_event_id 'X' + same deploy_id → attach (matches inherited late-arrival semantic, just under composite scope).
- Cluster-event-mode incoming with cluster_event_id 'X' + closed group with cluster_event_id 'Y' (any deploy) → no attach (different scope).

**Rationale.** Preserves Addition #25 D2 strictly in legacy mode. Extends D2 conservatively in cluster-event mode — late-arrival is a within-scope phenomenon; a verdict for cluster-event 'X' should not attach to a closed group for cluster-event 'Y' even when deploy_ids coincide (different scope = different incident in the audit trail). NEXT-ROLE.md "NO Addition #25 D2 reversal" honored.

### 2.6 Empty-string equivalence (edge case)

Per § 1 failure mode 4: the key-string segment `${cluster_event_id ?? ''}` makes `cluster_event_id: undefined` and `cluster_event_id: ''` map to the same key. The spec treats these as semantically equivalent — empty-string is an absent cluster_event_id. No runtime validation rejects empty-string. The group_id format follows: empty-string cluster_event_id → legacy `group-{deploy_id}-{window_start_ts}` (per § 2.2 because the conditional checks `cluster_event_id ? composite : inherited`, and the empty-string is falsy). AC-R20-6's covered-edge-case row asserts this.

### 2.7 Header annotation block on `engine/verdict-groups.ts` (Delta 4 analog to R18)

Per `SCOPING-MEMO-v0.3.md` § 9 vendoring-with-deltas policy. The existing lines 1-5 (canonical `VENDORED FROM DeploySignal main@5a72371 — 2026-05-16` block) are preserved byte-identical. An annotation block is inserted after line 5 and before the existing module-purpose comment at line 7, summarizing R20 deltas:

- VerdictGrouper.ingest opts.cluster_event_id added (§ 2.1)
- Internal keying extended to (cluster_event_id, deploy_id) tuple (§ 2.3)
- group_id format conditional per cluster_event_id presence (§ 2.2)
- VerdictGroup.cluster_event_id field populated at open-time (R18 SLICE 1 type-surface wired)
- All deltas additive; preserves Addition #25 D2 (window/terminal/grace close semantics) and D5 (format-string discipline; inherited format unchanged in legacy mode)

The annotation block ends with a blank line before the existing line 7 comment (matches the R18 verdict.ts pattern at lines 6-15).

### 2.8 Manifest + AT_PIN_FILES two-step maintenance (pre-handled per PHASE-2-SLICE-1-CLOSE-WALK § 2)

1. **`coordination/VENDORING-MANIFEST.md` row update (line 28).** Status `vendored-at-pin` → `vendored-with-deltas`. Notes column populated with R20 delta summary (parallels the R18 verdict.ts row at line 29).
2. **`test/q01-no-at-pin-deltas.test.ts` AT_PIN_FILES list update.** Remove the `engine/verdict-groups.ts` entry (line 52 in current state; verify line by reading at session start). Update the in-file comment at line 53 to note both verdict.ts (R18) and verdict-groups.ts (R20) are excluded as vendored-with-deltas.

Both updates land in the same GREEN commit as the verdict-groups.ts deltas + new q20 test file (single conceptual change; per PHASE-2-SLICE-1-CLOSE-WALK § 2 two-step pattern, the maintenance edits accompany the production delta in the same change set, not a separate ESCALATE round as at R18).

### 2.9 New test file `test/q20-verdict-grouper-cluster-event-scope.test.ts`

Binds AC-R20-1 through AC-R20-9 (runtime) + AC-R20-15 (vendoring header preservation) via runtime checks. AC-R20-10 (manifest row), AC-R20-11 (AT_PIN_FILES), AC-R20-12 (anti-scope diff), AC-R20-13 (typecheck), AC-R20-14 (full suite count) are binding-command attestations reported by the Implementer at GREEN. AC count target per NEXT-ROLE.md routing — 15 total ACs for a full-tier scope re-architecture round is consistent with the precedent at R11/R13/R18; staying under the R20 split-or-not threshold per § 7.

### 2.10 NEXT-ROLE.md routing block update (Architect-side, applied now)

Update the top three lines from:

```
CURRENT-ROUND: R20
NEXT-ROLE: ARCHITECT
STATUS: READY
```

To:

```
CURRENT-ROUND: R20
NEXT-ROLE: IMPLEMENTER
STATUS: READY
Inputs: coordination/specs/Q-R20-SPEC.md (+ Q-R20-SPEC-AUDIT.md sidecar)
```

Leave **all subsequent operator-authored sections of NEXT-ROLE.md byte-identical** (round-scope directive, inputs list, anti-scope, architectural questions section, escalation items, routing notes, readiness state — all load-bearing for downstream roles per R18 precedent).

---

## 3. Component inventory

| Path | State | Touch type | Bound ACs |
|---|---|---|---|
| `engine/verdict-groups.ts` | CHANGED | Internal keying + ingest opts + group_id format + late-arrival lookup + header annotation block | AC-R20-1, -2, -4, -5, -6, -7, -8, -9, -13, -15 |
| `engine/verdict-groups.js` | CHANGED (compiled output) | regenerated by typecheck/build | AC-R20-13 |
| `engine/types/verdict.ts` | UNCHANGED at R20 (R18 already shipped the optional field) | (read-only reference) | AC-R20-2, AC-R20-3 (assertions over the field; no type change) |
| `engine/topology-overlay.ts` | UNCHANGED | (read-only) | (anti-scope) |
| `engine/types/agent.ts` / `engine/types/orchestration.ts` (VerdictGroup type-import consumers) | UNCHANGED | (R20 introduces no shape change to VerdictGroup) | (anti-scope) |
| `engine/fleet/combine.ts` / `engine/fleet/detectors.ts` / `engine/fleet/e-bh.ts` | UNCHANGED | NEXT-ROLE.md anti-scope (SLICE-2 split — fleet-merge consumption deferred to R21) | (anti-scope) |
| `test/_substrate/v9X-cluster.ts` (R18) | UNCHANGED | NEXT-ROLE.md anti-scope | (anti-scope) |
| `test/_substrate/factories.ts` | UNCHANGED | (read-only reference; R20 q20 tests use inline FusedVerdict literals — round-size discipline) | (no AC binding) |
| `coordination/VENDORING-MANIFEST.md` | CHANGED | Row 28 status `vendored-at-pin` → `vendored-with-deltas` + notes column populated | AC-R20-10 |
| `test/q01-no-at-pin-deltas.test.ts` | CHANGED | AT_PIN_FILES list removes `engine/verdict-groups.ts` entry + comment block at lines 53-55 updated | AC-R20-11 |
| `test/q01-no-at-pin-deltas.test.js` | CHANGED (compiled output) | regenerated | (consequential) |
| `test/q20-verdict-grouper-cluster-event-scope.test.ts` | CREATED | new file (~200-260 LoC; ~10 runtime tests) | AC-R20-1 through -9 + -15 |
| `test/q20-verdict-grouper-cluster-event-scope.test.js` | CREATED | compiled output | AC-R20-14 |
| `coordination/specs/Q-R20-SPEC.md` | CREATED | this file | (routing artifact) |
| `coordination/specs/Q-R20-SPEC-AUDIT.md` | CREATED | sidecar | (audit-trail) |
| `coordination/NEXT-ROLE.md` | CHANGED | routing block update (top 4 lines) + Implementer adds attestation block at chore time | (coordination) |
| `coordination/MEMORIAL.md` | CHANGED (append-only) | Architect / Implementer / Reviewer / Memorial-Updater each append ceremony sections | (coordination) |

**Anti-scope verification path-set (allowed entries in `git diff cecd677..<MERGE-READY-SHA> --name-only` at Implementer GREEN attestation):**

```
engine/verdict-groups.ts
engine/verdict-groups.js
coordination/VENDORING-MANIFEST.md
test/q01-no-at-pin-deltas.test.ts
test/q01-no-at-pin-deltas.test.js
test/q20-verdict-grouper-cluster-event-scope.test.ts
test/q20-verdict-grouper-cluster-event-scope.test.js
coordination/specs/Q-R20-SPEC.md
coordination/specs/Q-R20-SPEC-AUDIT.md
coordination/NEXT-ROLE.md
coordination/MEMORIAL.md
```

11 entries. AC-R20-12 binds. `<MERGE-READY-SHA>` is the Implementer-side coordination-chore SHA-A per CLAUDE-IMPLEMENTER.md two-commit-attestation pattern (TQ-4 γ — SHA-pinned end-bound, not HEAD).

---

## 4. Per-file pseudocode (only where algorithm IS the architectural decision)

Per CLAUDE-ARCHITECT.md spec-depth guidance: "Per-file pseudocode is appropriate only when the algorithm IS the architectural decision — not for routine wiring." R20's load-bearing algorithmic choices are the keying transition + the conditional group_id format + the late-arrival tuple-match. Routine wiring (TypeScript syntax, import statements, JSDoc paraphrase) is left to the Implementer. Exact Delta location lines (66, 75-79, 88-93, 141-143, 145-163, 171-184, 216-225, etc.) are documented in § 1 component boundaries and § 3 component inventory; the Implementer applies the deltas at the actual declaration sites, which are stable in the current file (verified by Architect open of `engine/verdict-groups.ts` at session start).

### 4.1 `engine/verdict-groups.ts` — algorithm-level pseudocode for keying + group_id + late-arrival

```
// Internal key composition (replaces openByDeploy keying)
function groupKey(cluster_event_id: string | undefined, deploy_id: string): string {
  // Treat empty-string as equivalent to undefined (§ 2.6).
  // Falsy cluster_event_id (undefined or empty-string) collapses to the
  // legacy-mode key '|${deploy_id}'.
  const eventSeg = cluster_event_id ? cluster_event_id : '';
  return `${eventSeg}|${deploy_id}`;
}

// Replace `private readonly openByDeploy: Map<string, VerdictGroup>` with
// `private readonly openByGroupKey: Map<string, VerdictGroup>` keyed via
// groupKey().

// group_id composition (replaces existing groupId(deployId, ts))
function groupId(
  cluster_event_id: string | undefined,
  deploy_id: string,
  window_start_ts: number,
): string {
  // Conditional per § 2.2. Falsy cluster_event_id → inherited format
  // preserved byte-identical (legacy mode); truthy → composite.
  if (cluster_event_id) {
    return `group-${cluster_event_id}-${deploy_id}-${window_start_ts}`;
  }
  return `group-${deploy_id}-${window_start_ts}`;
}

// ingest() opts argument extension (§ 2.1)
ingest(
  verdict: FusedVerdict,
  ts_seconds: number,
  opts: { terminal?: boolean; cluster_event_id?: string } = {},
): IngestResult {
  const deployId = verdict.deploy_ref;
  const clusterEventId = opts.cluster_event_id;
  const key = groupKey(clusterEventId, deployId);

  // ... evictStaleClosed() unchanged ...

  let openGroup = this.openByGroupKey.get(key);
  // Window-elapsed close: unchanged semantic (D2 preserved); uses key
  // instead of deployId for the openByGroupKey lookup. The close-trigger
  // condition `ts_seconds - openGroup.window_start_ts > this.windowSeconds`
  // is byte-identical.
  if (openGroup && ts_seconds - openGroup.window_start_ts > this.windowSeconds) {
    closedByThisCall = this.closeGroup(key, ts_seconds, 'window_elapsed')!;
    openGroup = undefined;
    rotated = true;
  }

  // Late-arrival attach (D2 preserved; tuple-match per § 2.5)
  if (!openGroup) {
    const lateTarget = rotated
      ? null
      : this.findRecentClosedForKey(clusterEventId, deployId, ts_seconds);
    if (lateTarget) {
      // ... attach + recomputeDerived(lateTarget) — unchanged from inherited ...
      lateArrival = true;
      attributed = lateTarget;
    } else {
      attributed = this.openGroupAt(key, clusterEventId, deployId, verdict, ts_seconds);
    }
  } else {
    this.appendToOpen(openGroup, verdict);
    attributed = openGroup;
  }

  // Terminal-close: unchanged semantic; uses key instead of deployId.
  if (opts.terminal && !lateArrival && !attributed.closed) {
    const terminalClose = this.closeGroup(key, ts_seconds, 'terminal_verdict');
    if (terminalClose && !closedByThisCall) closedByThisCall = terminalClose;
  }

  return { closed: closedByThisCall, late_arrival: lateArrival, attributed_group: attributed };
}

// openGroup() rename to openGroupAt(key, cluster_event_id, deploy_id, verdict, ts)
// — composes group_id via groupId(cluster_event_id, deploy_id, ts) (§ 2.2);
// populates VerdictGroup.cluster_event_id field from arg (R18 type-surface wired);
// inserts into openByGroupKey.set(key, group). All other VerdictGroup fields
// constructed identically to the inherited factory.

// closeGroup() (rename of closeDeployGroup) accepts a key string; performs
// openByGroupKey.delete(key); sets closed = true, closed_at_ts = ts,
// window_end_ts = ts; inserts into recentlyClosed map keyed by group_id
// (unchanged map shape; group_id values now potentially composite — does not
// affect collision-freeness because (cluster_event_id, deploy_id, ts) is
// still unique by construction).

// findRecentClosedForKey(cluster_event_id, deploy_id, ts) replaces
// findRecentClosedForDeploy(deployId, ts). Body loops recentlyClosed.values()
// and matches tuple-equality:
//   g.deploy_id === deploy_id AND
//   (g.cluster_event_id ?? '') === (cluster_event_id ?? '') AND
//   ts - (g.closed_at_ts ?? -Infinity) <= graceSeconds
// Pick most-recently-closed tie-breaker preserved.

// openGroupForDeploy(deploy_id) signature extension to optional 2nd arg:
//   openGroupForDeploy(deploy_id, cluster_event_id?: string): VerdictGroup | undefined
// Body: return this.openByGroupKey.get(groupKey(cluster_event_id, deploy_id)).
// Single-arg legacy call default cluster_event_id = undefined → key
// '|${deploy_id}' → returns legacy-mode group (or undefined). Backward
// compat preserved.
```

The compiled JavaScript output is regenerated by `npx tsc`. No additional source files require modification.

### 4.2 `test/q20-verdict-grouper-cluster-event-scope.test.ts` — algorithm-level structure

The test file binds AC-R20-1 through AC-R20-9 + AC-R20-15 via runtime checks (each AC = one `node:test` test block). Implementer composes individual test bodies using `VerdictGrouper` + inline FusedVerdict literals. No fixture module is required — round size + scope limit. FusedVerdict construction: each literal carries `deploy_ref`, `tick`, `firing_families: []` (or with-fires for late-arrival cases), `verdict: 'proceed'` (or appropriate), `per_family_verdicts: {A: null, B: null, C: null, D: null, E: null}`, `total_alpha_spent: 0`, `fusion_topology: 'cascade'`. Helper closure for FusedVerdict construction is acceptable but not required.

The Implementer follows R03/R05 MINOR-2 verification-command-soundness reinforcement when composing assertion regexes (e.g., AC-R20-15 grep patterns must distinguish executable strings from comment text).

### 4.3 `coordination/VENDORING-MANIFEST.md` — row 28 update (§ 2.8 step 1)

Locate the current row at line 28:

```
| engine/verdict-groups.ts | engine/verdict-groups.ts | 5a72371 | vendored-at-pin | 2026-05-16 | |
```

Replace with:

```
| engine/verdict-groups.ts | engine/verdict-groups.ts | 5a72371 | vendored-with-deltas | 2026-05-17 | R20 Phase 2 SLICE 2.A deltas: VerdictGrouper.ingest opts.cluster_event_id; openByGroupKey tuple-keying; conditional group_id format; tuple-match late-arrival lookup. Additive per-call opts + additive internal keying (preserves Addition #25 D2 + D5; legacy mode unchanged when cluster_event_id absent). |
```

The R20 row format matches the R18 verdict.ts row (line 29) verbatim modulo content. The "Vendored" date column updates to `2026-05-17` reflecting R20 delta apply date.

### 4.4 `test/q01-no-at-pin-deltas.test.ts` — AT_PIN_FILES list update (§ 2.8 step 2)

Locate the current entry at line 52:

```
  { tessera: 'engine/verdict-groups.ts',                           source: 'engine/verdict-groups.ts' },
```

Remove this line. Update the comment block at lines 53-55 from:

```
  // Type files (at-pin; 7 files; config.ts excluded — vendored-with-deltas at R01;
  //                                verdict.ts excluded — vendored-with-deltas at R18 for
  //                                cluster_event_id + TopologyNode.kind + TopologyEdge.relationship)
```

To (preserve all other comment-block content; expand the exclusion summary):

```
  // Type files (at-pin; 7 files; config.ts excluded — vendored-with-deltas at R01;
  //                                verdict.ts excluded — vendored-with-deltas at R18 for
  //                                cluster_event_id + TopologyNode.kind + TopologyEdge.relationship;
  //                                verdict-groups.ts excluded — vendored-with-deltas at R20 for
  //                                cluster_event_id scope keying + composite group_id)
```

Also update the file-header comment at lines 6-8 from "Scope: detectors (11) + family types (5) + core orchestration (5) + …" — specifically the "core orchestration (5)" sub-count which currently includes `engine/verdict-groups.ts`. Update to "core orchestration (4)" and add a parenthetical note: "(verdict-groups.ts excluded at R20)".

Effective new AT_PIN_FILES count = 33 (was 34) → matches the q01-vendoring-coverage file count which checks the FIRST-LINE header only and is unaffected by the at-pin-deltas list. (No change required to q01-vendoring-coverage's expected count — the manifest still enumerates 40 vendored paths; the at-pin-deltas list specifically excludes the 2 vendored-with-deltas files.)

### 4.5 `engine/verdict-groups.ts` header annotation (Delta 4 analog to R18)

After line 5 (the existing `// DO NOT modify internals without ADR; deltas only at architecturally-anchored extension points...` line) and BEFORE the existing line 7 module-purpose comment (`// engine/verdict-groups.ts — Addition #25 (ARCHITECT-REPLY-47) L3b aggregator.`), insert:

```
// Tessera Phase 2 SLICE 2.A amendments (R20, 2026-05-17) — wire VerdictGroup.cluster_event_id
// per SCOPING-MEMO-v0.3.md § 2.3 + § 9 vendored-with-deltas policy:
//   1. VerdictGrouper.ingest opts adds optional cluster_event_id?: string (per-call origination).
//   2. Internal keying transitions to (cluster_event_id, deploy_id) tuple via groupKey() helper;
//      legacy single-deploy mode preserved when cluster_event_id is absent.
//   3. group_id format is conditional: composite `group-{cluster_event_id}-{deploy_id}-{ts}`
//      when cluster_event_id present; inherited `group-{deploy_id}-{ts}` preserved when absent.
//   4. Late-arrival lookup matches on (cluster_event_id, deploy_id) tuple-equality; mismatch
//      opens a new group rather than attaching across scopes (D2 preserved/extended).
// All deltas additive; Addition #25 D2 + D5 preserved (legacy mode byte-identical at the
// observable level; cluster-event mode is a strict superset of behavior).
```

Followed by a blank line, then the existing line 7 module-purpose comment continues unchanged. The 5-line vendoring header (lines 1-5) is preserved byte-identical; q01-vendoring-coverage's first-line SHA-pin check passes; AC-R20-15 binds.

### 4.6 RED → GREEN cycle (TDD discipline; required per CLAUDE-IMPLEMENTER.md + R04 precedent)

1. **RED commit.** Write `test/q20-*.test.ts` with `assert.fail('RED: AC-R20-N pending')` placeholders in each of the ~10 test bodies (one per runtime AC). Do NOT yet modify `engine/verdict-groups.ts`. Do NOT yet update VENDORING-MANIFEST.md or q01-no-at-pin-deltas.test.ts. Compile (`npx tsc --noEmit`) — may fail on missing imports if the q20 test imports anything not yet present; expected. Run `node --test test/*.test.js`; expect 181 pass + 10 fail at q20 (or similar pattern depending on placeholder failure shape). Commit message: `chore(R20): RED — q20 placeholders`.

2. **GREEN commit.** Apply all R20 deltas to `engine/verdict-groups.ts` (§ 2.1 + § 2.2 + § 2.3 + § 2.5 + § 2.7 + § 4.1 pseudocode). Update `coordination/VENDORING-MANIFEST.md` (§ 4.3). Update `test/q01-no-at-pin-deltas.test.ts` (§ 4.4). Replace each `assert.fail('RED: ...')` with the real test body. Compile (`npx tsc --noEmit` exits 0). Run `node --test test/*.test.js`; expected 181 (baseline) + ~10 (new q20) = ~191 pass / 0 fail. Implementer reports OBSERVED per-file counts per R03 MINOR-4. Commit message: `feat(R20): GREEN — Phase 2 SLICE 2.A VerdictGrouper cluster_event_id scope keying`.

3. **Coordination chore commits.** Per CLAUDE-IMPLEMENTER.md two-commit attestation pattern: SHA-A `chore(R20): coordination artifacts`; SHA-B `chore(R20): record attestation SHA <SHA-A>`. The `<MERGE-READY-SHA>` for AC-R20-12 is SHA-A (per TQ-4 γ disposition — anti-scope diff end-bound is the round's MERGE-READY SHA, not HEAD).

### 4.7 Anti-scope diff end-bound (TQ-4 γ pattern, applied upfront per PHASE-2-SLICE-1-CLOSE-WALK § 2)

AC-R20-12 binds:

```
git diff cecd677..<MERGE-READY-SHA> --name-only ⊆ allowed-set (§ 3 path-set)
```

The Implementer substitutes `<MERGE-READY-SHA>` at GREEN attestation time = coordination-chore SHA-A (per § 4.6 step 3). The substituted literal is committed in the q20 test file body so future re-runs evaluate against fixed historical SHAs (forward-protection per round; intentional — TQ-4 γ disposition specifies SHA-pinned end-bound, not HEAD).

The Implementer fills in the SHA literal AFTER coordination chore commits land. Per R15 MINOR-1 reinforcement, the baseline SHA `cecd677` is the last commit immediately before R20 work began (verified via `git log` at session start; the R19 Memorial-Updater commits + operator-prep commit `cecd677` itself constitute the post-R19 window; `cecd677` is the inclusive lower bound — the spec, q20 test, and engine deltas all land AFTER `cecd677`).

---

## 5. Acceptance criteria

All ACs verified at Implementer GREEN attestation. Counts per AC-R20-14 are OBSERVED per R03 MINOR-4 (Implementer reports actual per-file counts; not predicted).

| AC | Given / When / Then |
|---|---|
| **AC-R20-1** | Given `engine/verdict-groups.ts` after the R20 deltas are applied, when a caller invokes `VerdictGrouper.ingest(verdict, ts, { cluster_event_id: 'evt-X' })`, then the call typechecks AND returns an `IngestResult` whose `attributed_group.cluster_event_id === 'evt-X'`. |
| **AC-R20-2** | Given the same VerdictGrouper instance and verdict shape, when ingest is called with `{ cluster_event_id: 'evt-X' }`, then `result.attributed_group.cluster_event_id === 'evt-X'` AND the same group is retrievable via `openGroupForDeploy(deploy_id, 'evt-X')`. |
| **AC-R20-3** | Given a VerdictGrouper instance, when ingest is called with `{}` (no cluster_event_id) OR `{ terminal: true }` (terminal only, no cluster_event_id), then `result.attributed_group.cluster_event_id === undefined` AND legacy-mode behavior holds (group_id matches inherited format per AC-R20-5). |
| **AC-R20-4** | Given a VerdictGrouper instance, when ingest is called with `{ cluster_event_id: 'evt-X' }` on a verdict with `deploy_ref: 'deploy-A'` at `ts_seconds: 1700000000`, then `result.attributed_group.group_id === 'group-evt-X-deploy-A-1700000000'` (composite format per § 2.2). |
| **AC-R20-5** | Given a VerdictGrouper instance, when ingest is called WITHOUT cluster_event_id on a verdict with `deploy_ref: 'deploy-A'` at `ts_seconds: 1700000000`, then `result.attributed_group.group_id === 'group-deploy-A-1700000000'` (inherited Addition #25 D5 format byte-identical). |
| **AC-R20-6** | Given a VerdictGrouper instance, when (a) ingest is called twice with `deploy_ref: 'deploy-A'` and different cluster_event_ids `'evt-X'` and `'evt-Y'` at non-window-elapsed timestamps, then two distinct open groups exist (distinct group_ids; `openGroupForDeploy('deploy-A', 'evt-X')` and `openGroupForDeploy('deploy-A', 'evt-Y')` return distinct VerdictGroup instances); AND (b) ingest with `{ cluster_event_id: '' }` is treated equivalently to absent cluster_event_id (resulting group_id matches inherited format per AC-R20-5). |
| **AC-R20-7** | Given a VerdictGrouper instance, when ingest is called twice with the SAME `cluster_event_id: 'evt-X'` but distinct `deploy_ref` values `'deploy-A'` and `'deploy-B'` at non-window-elapsed timestamps, then two distinct open groups exist (distinct group_ids; both VerdictGroups carry `cluster_event_id === 'evt-X'`). |
| **AC-R20-8** | Given a VerdictGrouper instance with `grace_seconds: 300` and a closed group at `ts: 1700000000` with `(cluster_event_id: 'evt-X', deploy_id: 'deploy-A')`, when a late-arriving verdict at `ts: 1700000100` (within grace) is ingested with: (a) `{ cluster_event_id: 'evt-X' }` and `deploy_ref: 'deploy-A'` → THEN attaches to the closed group (`result.late_arrival === true`); (b) `{ cluster_event_id: 'evt-Y' }` and `deploy_ref: 'deploy-A'` → THEN opens a new group (`result.late_arrival === false`; new group's cluster_event_id is 'evt-Y'); (c) no `cluster_event_id` opts and `deploy_ref: 'deploy-A'` → THEN opens a new group (legacy-mode incoming; tuple mismatch with closed group's `cluster_event_id: 'evt-X'`); (d) `{ cluster_event_id: 'evt-X' }` and `deploy_ref: 'deploy-B'` → THEN opens a new group (deploy_id mismatch). |
| **AC-R20-9** | Given a VerdictGrouper instance, when ingest is called in legacy mode (no `cluster_event_id`) AND the verdict triggers (a) window-elapsed close (`ts_seconds - openGroup.window_start_ts > windowSeconds`), (b) terminal close (`opts.terminal === true`), (c) flush() invocation, OR (d) late-arrival attach within `grace_seconds`, THEN the observable IngestResult shape and contents are byte-identical to the inherited pre-R20 behavior on the same sequence: `closed` field, `late_arrival` field, `attributed_group.group_id` field, `attributed_group.closed_at_ts`, `attributed_group.late_arrival_verdicts` all match the inherited contract; Addition #25 D2 grace-window preserved verbatim. |
| **AC-R20-10** | Given `coordination/VENDORING-MANIFEST.md` after R20 maintenance edit, when grepped for the `engine/verdict-groups.ts` row, then exactly one row matches AND its 4th column (Sync policy) is `vendored-with-deltas` AND its 6th column (Notes) contains the substring `R20` AND `cluster_event_id`. |
| **AC-R20-11** | Given `test/q01-no-at-pin-deltas.test.ts` after R20 maintenance edit, when the file is parsed, then the AT_PIN_FILES constant array does NOT contain an entry whose `tessera` field equals `engine/verdict-groups.ts` (binding: runtime-imported AT_PIN_FILES array length excludes the verdict-groups.ts entry); AND on running `node --test test/q01-no-at-pin-deltas.test.js`, the test passes (no byte-identity violation because verdict-groups.ts is excluded from the at-pin set). |
| **AC-R20-12** | Given the Implementer GREEN coordination-chore SHA-A, when `git diff cecd677..<SHA-A> --name-only` is invoked, then the resulting path-set is a subset of the 11-entry allowed-set enumerated in § 3 (each touched path is in the allowed-set; nothing in the allowed-set is required to appear). The Implementer substitutes `<SHA-A>` into the q20 test body before the chore-B commit; AC-R20-12 binds at the substituted-literal level (forward-protection: future commits do not affect this AC because both end-bounds are SHA-pinned per TQ-4 γ). |
| **AC-R20-13** | Given Deltas applied + maintenance edits + new q20 test file, when the Implementer runs `npx tsc --noEmit`, then exit code is 0 (Implementer reports OBSERVED). |
| **AC-R20-14** | Given the GREEN state, when the Implementer runs `node --test test/*.test.js`, then total pass = 181 (pre-R20 baseline per R19 attestation) + (q20 OBSERVED count) AND total fail = 0; Implementer reports per-file OBSERVED counts (per R03 MINOR-4 reinforcement); the q20 file's count matches the runtime AC enumeration (AC-R20-1 through AC-R20-9 + AC-R20-15 → 10 tests if each AC = one test, OR Implementer reports actual sub-test count if AC-R20-8's four sub-cases are split per the (a)/(b)/(c)/(d) shape into multiple `test()` calls). If observed total differs from the predicted sum, the Implementer halts with DIAGNOSTIC (likely cause: pre-R20 baseline drift). |
| **AC-R20-15** | Given `engine/verdict-groups.ts` after R20 deltas + header annotation, when the file's first line is read, then it matches `/^\/\/ VENDORED FROM DeploySignal main@5a72371/` (canonical SHA-pin line preserved byte-identical per § 2.7); AND grepping the file with `/Tessera Phase 2 SLICE 2.A amendments \(R20/` matches exactly one line (the annotation block opening line per § 4.5). |

---

## 6. Anti-scope (explicit; HALT if any temptation actioned)

R20 does NOT do any of the following — each is explicitly out of scope per NEXT-ROLE.md, the SCOPING-MEMO, or R20's SLICE-2.A scope-fence. Tempting items each map to a halt class.

| Item | Why out-of-scope | Halt class |
|---|---|---|
| HardwareTopologySource concrete impl | Phase 2 SLICE 3 per v0.3 § 2.3 + § 3; NEXT-ROLE.md anti-scope explicit | spec-internal HALT |
| Deployment-event-feed ingestion | Phase 2 SLICE 4 per v0.3 § 3; NEXT-ROLE.md anti-scope explicit | spec-internal HALT |
| Fleet-merge consumption layer wiring (`engine/fleet/combine.ts`, `engine/fleet/detectors.ts`, `engine/fleet/e-bh.ts` consumer-side changes) | R21 per SLICE-2 split (this spec § 0 + § 7); NEXT-ROLE.md anti-scope explicit | spec-internal HALT |
| Modification of fleet-merge layer at all (any `engine/fleet/*` file) | NEXT-ROLE.md anti-scope explicit | spec-internal HALT |
| Modification of `engine/topology-overlay.ts` (BFS / hash / Enricher) | NEXT-ROLE.md A12; not in R20 surface | spec-internal HALT |
| Modification of `engine/types/verdict.ts` (any type change including VerdictGroup shape) | R18 already shipped the cluster_event_id type field; R20 only wires the writer | spec-internal HALT |
| Modification of any other `engine/types/*.ts` file | NEXT-ROLE.md A12; not in R20 surface | spec-internal HALT |
| Modification of any detector under `engine/detectors/*.ts` | Inherited A12/A5 anti-scope (Phase-3.d.D close) | spec-internal HALT |
| Modification of `test/_substrate/v9X-cluster.ts` | NEXT-ROLE.md anti-scope explicit (R18 substrate frozen for SLICE 2-4 consumers) | spec-internal HALT |
| Modification of any prior-round test file (q02-q19, betting-e-process-class-dispatch) EXCEPT q01-no-at-pin-deltas | q01-no-at-pin-deltas.test.ts is the SOLE prior-round test file permitted (maintenance pattern per PHASE-2-SLICE-1-CLOSE-WALK § 2; covered in component inventory + AC-R20-11) | spec-internal HALT |
| Required-not-optional change to `cluster_event_id` at the contract level | Q4 disposition: optional + legacy mode coexists; SLICE-4 may revisit | spec-internal HALT |
| Reversal of Addition #25 D2 (window-based close at `(deploy_id, window_start_ts)` scope) | NEXT-ROLE.md anti-scope explicit; spec § 2.5 preserves D2 in legacy mode + extends conservatively in cluster-event mode | spec-internal HALT |
| Reversal of Addition #25 D5 beyond minimum | Spec § 2.2 preserves inherited format in legacy mode; extends to composite in cluster-event mode (within "minimum amendment" envelope per NEXT-ROLE.md) | spec-internal HALT |
| Reversal of Addition #26 D4 (`correlational_not_causal: true` wire-format) | NEXT-ROLE.md anti-scope explicit (A16 inherited); spec touches no Addition #26 surface | spec-internal HALT |
| Modification of `coordination/SCOPING-MEMO-v0.3.md` or `coordination/PRD.md` | Operator-authored; spec emission cannot edit upstream artifacts | NEXT-ROLE.md halt analog (d) |
| Disposition of any operator-gate item (PR #38, OQ-1 calibrate.ts, OQ-R08-3 transient detectors) | Operator triage scope; R20 does not touch these | NEXT-ROLE.md halt analog (f) |
| Bundling R21 fleet-merge consumption into R20 | SLICE-2 split per spec § 0 + § 7 + NEXT-ROLE.md "AC count target" guidance | spec-internal HALT |
| Adding a separate FusedVerdict.cluster_event_id field (Approach B) | Rejected at brainstorm; A14 anti-scope (v0.3 § 2.3) | spec-internal HALT |
| Introducing a stateful per-instance `setClusterEventContext()` API (Approach C) | Rejected at brainstorm; hidden-state hazard | spec-internal HALT |
| Modifying constructor signature `VerdictGroupOpts` to accept cluster_event_id at instance-time | Per § 2.1 — cluster_event_id is per-call, not per-instance; constructor knobs unchanged | spec-internal HALT |
| Renaming or relocating `test/q20-verdict-grouper-cluster-event-scope.test.ts` | Spec § 3 + § 4.2 prescribe the path explicitly | spec-internal HALT |
| Modifying VENDORING-MANIFEST.md rows other than line 28 (engine/verdict-groups.ts) | Only the verdict-groups.ts row transition is in R20 scope | spec-internal HALT |

---

## 7. Open questions

**None — all resolved.**

The following potential ambiguities were considered and explicitly dispositioned inline:

1. **Q1 origination point** — Resolved: (a) ingest opts parameter per § 2.1. Approaches B (FusedVerdict field) and C (stateful context) rejected at brainstorm § 0.
2. **Q2 group_id format** — Resolved: conditional (composite when cluster_event_id present, inherited when absent) per § 2.2. AC-R20-4 + AC-R20-5 bind.
3. **Q3 multi-deploy-per-event** — Resolved: one group per (cluster_event_id, deploy_id, window_start_ts) tuple per § 2.3. AC-R20-6 + AC-R20-7 bind.
4. **Q4 backward-compat** — Resolved: legacy mode coexists with cluster-event mode per § 2.4. AC-R20-3 + AC-R20-5 bind.
5. **Q5 late-arrival semantics** — Resolved: tuple-equality match per § 2.5. AC-R20-8 binds all four sub-cases.
6. **Q6 fleet-merge split** — Resolved: split per § 0 disposition + § 6 anti-scope; R20 = aggregator-contract-only; R21 = fleet-merge consumption.
7. **Empty-string equivalence** — Resolved per § 2.6: `cluster_event_id: ''` equivalent to absent cluster_event_id. AC-R20-6 sub-case (b) binds.
8. **`openGroupForDeploy` signature** — Resolved per § 1 + § 4.1: extended to optional 2nd cluster_event_id arg with default undefined; single-arg legacy form preserved as a strict subset of the new signature.
9. **Header annotation placement** — Resolved per § 2.7 + § 4.5: after line 5, before line 7; preserves first-line SHA pin byte-identical (q01-vendoring-coverage check unaffected).
10. **AC-R20-12 baseline SHA** — Resolved per § 4.7 + R15 MINOR-1 reinforcement: `cecd677` (HEAD at session start).
11. **AC-R20-12 end-bound** — Resolved per § 4.7 + TQ-4 γ disposition: `<MERGE-READY-SHA>` filled in by Implementer at GREEN as coordination-chore SHA-A; substituted literal preserves forward-protection consistency with R18 + R19 precedent.
12. **q01 vs q01-no-at-pin-deltas vs q01-vendoring-coverage** — Resolved per § 4.4: only q01-no-at-pin-deltas.test.ts requires modification (AT_PIN_FILES list); q01-vendoring-coverage is unaffected because the first-line header line is preserved byte-identical via § 2.7 annotation placement; q01-schema-additions is unaffected (config.ts-scoped, unrelated to R20).
13. **q20 test file naming** — Resolved per § 4.2: `test/q20-verdict-grouper-cluster-event-scope.test.ts`. Matches Tessera naming convention (q<round>-<topic>.test.ts).

---

## 8. P3 ten-axis verification (one sentence per axis)

- **Correctness.** Each delta in § 2 (ingest opts, keying transition, conditional group_id, tuple-match late-arrival, header annotation) is type-additive and verified against the actual `engine/verdict-groups.ts` declaration sites (lines 30, 32-39, 57-73, 75-79, 88-93, 117-122, 135-137, 141-143, 145-163, 171-184, 216-225, 227-233) — confirmed by file open at session start, not from memory or prior-round testimony.
- **Completeness.** All 6 NEXT-ROLE.md architectural questions are explicitly dispositioned in § 0 (brainstorm disposition table); all 7 NEXT-ROLE.md anti-scope clauses are explicitly addressed in § 6; spec ACs map 1:1 to dispositions (AC-R20-1 ↔ Q1; AC-R20-4/-5 ↔ Q2; AC-R20-6/-7 ↔ Q3; AC-R20-3/-5 ↔ Q4; AC-R20-8 ↔ Q5; R20/R21 split ↔ Q6).
- **Consistency.** Cross-section consistency pass (R02 reinforcement, 12th application): the tokens `cluster_event_id`, `openByGroupKey`, `groupKey`, `findRecentClosedForKey`, `group-{cluster_event_id}-{deploy_id}-{window_start_ts}` (composite format), `group-{deploy_id}-{window_start_ts}` (inherited format), `vendored-with-deltas`, `cecd677` (baseline SHA), `<MERGE-READY-SHA>` (end-bound placeholder), and AC-R20-N numbering are byte-identical across § Mechanism + § Component inventory + § Per-file pseudocode + § Acceptance criteria + § Anti-scope + § Open questions; the Q-R20-SPEC-AUDIT.md sidecar carries the cross-section token enumeration log.
- **Clarity.** Each delta carries a BEFORE/AFTER or pseudocode block in § 2 or § 4; each AC has Given/When/Then with concrete assertion form; the Implementer can act on the spec without re-reading inherited DeploySignal sources (declarations and behavioral expectations are quoted inline).
- **Coverage.** AC-R20-1/-2/-3 bind the opts-parameter contract (Q1); AC-R20-4/-5 bind the group_id conditional format (Q2); AC-R20-6/-7 bind multi-event + multi-deploy keying (Q3); AC-R20-3/-5 also bind backward-compat (Q4 — sharing with the legacy-mode coverage); AC-R20-8 binds late-arrival tuple-match (Q5) across 4 sub-cases; AC-R20-9 binds D2 legacy-mode regression coverage; AC-R20-10/-11/-15 bind the maintenance bookkeeping + header annotation (§ 2.7 + § 2.8); AC-R20-12 binds anti-scope diff (TQ-4 γ); AC-R20-13/-14 bind binding-command outcomes (typecheck + test count).
- **Constraints.** v0.3 § 9 vendoring-with-deltas policy honored (§ 2.7 + § 2.8 + § 4.5); A12/A5 detector-internals anti-scope honored (no detector or non-verdict-groups engine file changes); Addition #25 D2 + D5 preserved/extended within "minimum amendment" envelope; Addition #26 D4 preserved (no Addition #26 surface touched); NEXT-ROLE.md anti-scope all addressed in § 6; AC count = 15 (consistent with R11/R13/R18 full-tier precedent for scope re-architecture rounds; R20 split-or-not threshold per Q6 disposition keeps R21 fleet-merge consumption as a separate round).
- **Concurrency.** No concurrency surface introduced; VerdictGrouper is single-threaded (matches inherited engine — Addition #25 D6 zero-latency-penalty guarantee). The internal Map keying transition (openByDeploy → openByGroupKey) preserves single-threaded semantics; no race condition is introduced. Late-arrival lookup remains O(|recentlyClosed|) linear; tuple-match adds O(1) per comparison; identical worst-case complexity to inherited.
- **Corner cases.** Empty-string cluster_event_id equivalence with undefined (§ 2.6; AC-R20-6 sub-case b); legacy-mode incoming + cluster-event-mode closed late-arrival mismatch (§ 2.5; AC-R20-8 sub-case c); cluster-event-mode incoming + legacy-mode closed late-arrival mismatch (symmetric, AC-R20-8 sub-case c handles); multi-deploy concurrent open under same cluster_event_id (AC-R20-7); same deploy under multiple cluster_event_ids (AC-R20-6 sub-case a); D2 grace-window preservation in legacy mode (AC-R20-9 sub-case d).
- **Cost.** Round size: 1 production file modified (engine/verdict-groups.ts) + 2 bookkeeping edits (VENDORING-MANIFEST.md + q01-no-at-pin-deltas.test.ts) + 1 new test file (q20) + 1 new spec + 1 new audit sidecar + 1 routing block update. AC count = 15. Estimated LoC delta ≈ 350 (≈ 100 in verdict-groups.ts diff including header annotation; ≈ 200 in q20 test file; ≈ 5 in VENDORING-MANIFEST.md; ≈ 10 in q01 maintenance; ≈ 10 in NEXT-ROLE.md routing update). Within precedent envelope for full-tier scope re-architecture rounds.
- **Coupling.** SLICE-2.A deliberately couples ONLY at the VerdictGrouper internal-state surface (private `openByDeploy` map + private helpers); ZERO public-API breakage (ingest opts is additive; openGroupForDeploy single-arg form preserved); ZERO non-verdict-groups engine file modified; q20 test file is an isolated consumer (no fixture-module dependency at R20); R21 fleet-merge consumption layer is the natural next consumer of the SLICE-2.A contract.

---

## 9. Grilling output (Superpowers Review phase — adversarial self-review, inline)

Per CLAUDE-ARCHITECT.md pre-emit-grilling reinforcements at R02 / R03 / R05 / R06 / R10 / R11 / R13 / R15 / R17 / R18 / R19.

### 9.1 Every claim verifiable?

| Claim | Verifiable how? | Verdict |
|---|---|---|
| `VerdictGrouper` is declared at `engine/verdict-groups.ts:61-234` with `openByDeploy: Map<string, VerdictGroup>` private field | File opened at session start; lines 61-234 read (full class body) | PASS |
| `VerdictGroup` interface at `engine/types/verdict.ts:180-213` includes `cluster_event_id?: string` (R18 SLICE 1 field) | File opened; lines 180-213 read; field at line 209 | PASS |
| Inherited `groupId(deployId, window_start_ts)` private method at line 141-143 returns `\`group-${deployId}-${window_start_ts}\`` | File opened; line 142 read verbatim | PASS |
| Inherited `findRecentClosedForDeploy(deployId, ts)` private at lines 216-225 loops `recentlyClosed.values()` matching `deploy_id` + grace_seconds | File opened; method body read | PASS |
| Inherited `openGroup(deployId, verdict, ts)` factory at lines 145-163 enumerates required VerdictGroup fields by name | File opened; lines 145-163 read | PASS |
| `engine/verdict-groups.ts` is currently `vendored-at-pin` per VENDORING-MANIFEST.md line 28 | Manifest file read; line 28 confirms status `vendored-at-pin` | PASS |
| `engine/verdict-groups.ts` first-line header is `// VENDORED FROM DeploySignal main@5a72371 — 2026-05-16` | File opened; line 1 read | PASS |
| `test/q01-no-at-pin-deltas.test.ts` AT_PIN_FILES at lines 28-74 contains `engine/verdict-groups.ts` entry at line 52 | File opened; AT_PIN_FILES enumerated; line 52 verified | PASS |
| No Tessera in-tree caller currently instantiates `VerdictGrouper` directly | Grep for `new VerdictGrouper` across engine/, tools/, src/, test/ — zero matches | PASS |
| `engine/topology-overlay.ts` BFS at lines 262-285 is bidirectional (inherited; relevant for R18-shipped 'contains' edges, not R20 scope) | Verified R18 (per R18 spec § 9.1); not R20 scope but documented for cross-reference | PASS (inherited) |
| FusedVerdict shape preserved (A14 anti-scope) | R20 modifies VerdictGrouper internals + ingest opts only; FusedVerdict type declaration at `engine/types/verdict.ts:112-126` is read-only reference | PASS |
| Pre-R20 baseline 181/0 test count | R19 attestation in NEXT-ROLE.md + R19 Reviewer report cold-verification; PHASE-2-SLICE-1-CLOSE-WALK.md § 1 confirms | PASS (inherited from R19) |
| 40 vendored files in manifest | R18 AC-R18-9 binds; R19 inherits; R20 maintenance transitions 1 row from `vendored-at-pin` to `vendored-with-deltas` (count unchanged; one more row in the `vendored-with-deltas` subset) | PASS |
| Baseline SHA `cecd677` is HEAD at session start | `git log --oneline -10` first row at session start | PASS |

### 9.2 Unstated assumptions?

- **Assumption A:** `engine/verdict-groups.js` will be regenerated by the Implementer's `npx tsc` compile step and is therefore expected in the AC-R20-12 allowed-set. Mitigation: explicitly listed in § 3 component inventory + § 4.7 allowed-set enumeration. PASS.
- **Assumption B:** No existing Tessera test or production code instantiates VerdictGrouper directly pre-R20. Mitigation: verified by grep at session start (zero matches across engine/, tools/, src/, test/ for `new VerdictGrouper`); q20 test is the first in-tree consumer. If a hidden consumer exists, the Implementer would discover it at typecheck or test-run time and HALT per CLAUDE-IMPLEMENTER.md halt condition (a) (typecheck breakage) or (b) (test breakage). PASS (defensive).
- **Assumption C:** Compiled .js files for engine/verdict-groups.ts AND test/q01-no-at-pin-deltas.test.ts will appear in the git diff (not gitignored). Mitigation: Tessera `.gitignore` declares `*.js` per R18 attestation — `.js` siblings will be ABSENT from `git diff` per R18 precedent. § 3 allowed-set lists `.js` entries defensively (per R18 spec § 3 convention) but they won't actually show up in the diff path-set; AC-R20-12's "subset of" relation tolerates absent entries. PASS.
- **Assumption D:** No other process between session start and Implementer GREEN will commit unrelated files that broaden the `git diff cecd677..<SHA-A>` set beyond the allowed-set. Mitigation: AC-R20-12 binds at GREEN-attestation time; per CLAUDE-IMPLEMENTER.md halt-discipline, an unexpected file → HALT + DIAGNOSTIC, NOT silent allowed-set expansion (R19 MAJOR-2 reinforcement applies). PASS.
- **Assumption E:** The Implementer fills in `<MERGE-READY-SHA>` at GREEN-attestation time per TQ-4 γ. Mitigation: § 4.7 explicitly prescribes the substitution; AC-R20-12 Given/When/Then references the literal `<SHA-A>` value (substituted at attestation time). PASS.
- **Assumption F:** Empty-string `''` cluster_event_id behaves identically to undefined per § 2.6. Mitigation: AC-R20-6 sub-case (b) binds explicitly. PASS.
- **No unstated assumptions remain.**

### 9.3 Scope added beyond request?

NEXT-ROLE.md R20 ROUND-SCOPE-DIRECTIVE lists: outer aggregator extending vendored L3b VerdictGroup aggregator with cluster_event_id scope; fleet-merge consumption layer; per-shard verdict aggregation contract with cluster_event_id propagation. **Recommendation: split fleet-merge consumption to a later slice round if R20 ACs > 12.**

Spec deliverables: VerdictGrouper internal scope re-architecture (ingest opts + keying + group_id + late-arrival) + cluster_event_id contract propagation; **fleet-merge consumption layer EXPLICITLY deferred to R21 per § 6 + § 7 Q6 disposition** (AC count would have exceeded 20 if bundled; split honors NEXT-ROLE.md guidance).

Pre-handled bookkeeping (VENDORING-MANIFEST.md row + q01-no-at-pin-deltas AT_PIN_FILES + header annotation block) — UPFRONT per NEXT-ROLE.md "If R20 spec scope determines `engine/verdict-groups.ts` needs deltas, spec MUST include manifest + AT_PIN_FILES maintenance steps in component inventory upfront (avoids R18-style ESCALATE on routine vendoring-with-deltas bookkeeping)" — explicit operator directive.

Mapping: 1:1 with NEXT-ROLE.md round-scope directive minus fleet-merge consumption (deferred per operator guidance). **No scope added beyond request.** PASS.

### 9.4 Implementer can act without guessing?

| Decision point | Resolved here? |
|---|---|
| Where does cluster_event_id originate (per-call vs per-instance vs FusedVerdict field) | YES — § 2.1 + § 0 brainstorm (Approach A picked; B + C rejected with rationale) |
| Whether to add constructor opts cluster_event_id | YES — NO; § 2.1 explicit (per-call only) |
| How to compose group_id when cluster_event_id present | YES — § 2.2 conditional with composite format (composite vs inherited) |
| How to key the internal open-group map | YES — § 2.3 `${cluster_event_id ?? ''}|${deploy_id}` via groupKey() helper |
| What to do on empty-string cluster_event_id | YES — § 2.6 + AC-R20-6 sub-case (b) (treat as absent) |
| What to do with multi-deploy-per-event verdicts | YES — § 2.3 (separate groups per (cluster_event_id, deploy_id) tuple) |
| How late-arrival matches under cluster_event scope | YES — § 2.5 (tuple-equality, including undefined==undefined) |
| Whether the contract requires cluster_event_id | YES — NO; § 2.4 (optional; legacy mode coexists) |
| Whether to modify VerdictGroup type shape | YES — NO (R18 already shipped the optional field; R20 only wires the writer) |
| Whether to modify FusedVerdict shape | YES — NO; § 0 brainstorm Approach B rejected (A14 anti-scope) |
| Whether to introduce stateful per-instance context | YES — NO; § 0 brainstorm Approach C rejected (hidden state) |
| Whether to modify fleet-merge consumers | YES — NO; § 6 + § 7 Q6 (R21 scope) |
| Whether to bundle q20 with new fixture module | YES — NO (round size; inline FusedVerdict literals) |
| Manifest row update sequencing | YES — § 2.8 + § 4.3 (same GREEN commit as engine/verdict-groups.ts deltas) |
| AT_PIN_FILES list update sequencing | YES — § 2.8 + § 4.4 (same GREEN commit) |
| Header annotation placement on engine/verdict-groups.ts | YES — § 2.7 + § 4.5 (after line 5, before existing line 7) |
| RED → GREEN commit boundary | YES — § 4.6 (RED: placeholders in q20 only; GREEN: deltas + maintenance + real test bodies) |
| Anti-scope baseline SHA | YES — `cecd677` (§ 4.7 + § 7 disposition 10) |
| Anti-scope end-bound | YES — coordination-chore SHA-A (TQ-4 γ; § 4.7 + § 7 disposition 11) |
| Test file path | YES — `test/q20-verdict-grouper-cluster-event-scope.test.ts` (§ 4.2 + § 7 disposition 13) |
| Test count expected at GREEN | YES — 181 (baseline) + OBSERVED q20 count (Implementer reports actual) per AC-R20-14 |
| openGroupForDeploy signature extension | YES — § 1 + § 4.1 (optional 2nd arg `cluster_event_id?`; single-arg legacy form preserved) |

**Implementer can act with zero clarifying questions.** PASS.

### 9.5 Verification-command-soundness pass (per R03 MINOR-2 reinforcement)

- AC-R20-15 pattern `/^\/\/ VENDORED FROM DeploySignal main@5a72371/`: the `^` anchor ensures the regex matches only the canonical first line (the Tessera amendment block per § 4.5 lives below line 5 and would not match the anchored regex even if reordered). Sound.
- AC-R20-15 pattern `/Tessera Phase 2 SLICE 2.A amendments \(R20/`: literal `(` and `R20` distinguish the annotation block opening line from any other comment text in the file. Verified by inspecting the full file — no other line in the inherited DeploySignal source contains the string "Phase 2 SLICE 2.A" (DeploySignal does not use Tessera SLICE numbering). Sound.
- AC-R20-4 / AC-R20-5 group_id format assertions: literal-string equality (`assert.strictEqual(result.attributed_group.group_id, 'group-evt-X-deploy-A-1700000000')`); not regex-based; no comment-text matching hazard. Sound.
- AC-R20-10 manifest grep: cell-parser-based (split on `|`; check column 4 = sync policy + column 6 = notes column substring match for `R20` AND `cluster_event_id`). Sound (parser-level, not raw regex).
- AC-R20-11 AT_PIN_FILES check: runtime-import the AT_PIN_FILES constant from the test module + assertion that no entry's `tessera` field equals `engine/verdict-groups.ts`. Sound (runtime semantics, not text matching).
- AC-R20-12 anti-scope diff: literal git command `git diff cecd677..<SHA-A> --name-only`; output parsed by line; subset check against allowed-set. Sound (no regex; no comment hazard).

### 9.6 Spec-internal-contradiction pass (per R15 MINOR-3 reinforcement)

Cross-checked every (resolved-decision, downstream-section) pair:

- **§ 2.1 ingest opts** ↔ **§ 2.3 internal keying**: opts.cluster_event_id is read into local `clusterEventId` variable; passed to `groupKey(clusterEventId, deployId)`; consistent.
- **§ 2.2 group_id format conditional** ↔ **§ 2.3 keying** ↔ **§ 2.5 late-arrival tuple match**: all three use the same `cluster_event_id` semantic (truthy → cluster-event mode; falsy → legacy mode). Empty-string equivalence (§ 2.6) is consistent across all three sections.
- **§ 2.4 backward-compat** ↔ **§ 2.1 optional opts** ↔ **AC-R20-3 (legacy mode test)**: optional consistently across spec, brainstorm, and AC.
- **§ 2.5 late-arrival tuple match** ↔ **§ 2.4 legacy mode** ↔ **AC-R20-8 sub-cases (a)/(b)/(c)/(d)**: tuple-equality formulation accommodates undefined-undefined match (legacy mode regression preserved) as one specific tuple value.
- **§ 2.7 header annotation placement** ↔ **AC-R20-15 (first-line preservation)** ↔ **AC-R20-15 (annotation grep)**: lines 1-5 byte-identical preserves the first-line regex match; annotation block at line 6+ is what the second AC-R20-15 grep matches.
- **§ 2.8 maintenance steps** ↔ **AC-R20-10 (manifest)** ↔ **AC-R20-11 (AT_PIN_FILES)**: both steps in same GREEN commit; both ACs verify the resulting state.
- **§ 6 anti-scope (no FusedVerdict modification)** ↔ **§ 0 Approach B rejection** ↔ **§ 1 integration points**: FusedVerdict shape is read-only reference throughout R20.
- **§ 6 anti-scope (fleet-merge layer untouched)** ↔ **§ 0 Q6 disposition (split)** ↔ **§ 7 Q6 resolution**: SLICE-2.A scope-fence consistent.
- **§ 6 anti-scope (D5 minimum-amendment envelope)** ↔ **§ 2.2 conditional format**: composite format extension is the minimum amendment necessary to express cluster_event scope at the group_id surface; inherited format preserved verbatim in legacy mode. Consistent with NEXT-ROLE.md "may be extended… but the factory pattern + format-string discipline must be preserved" guidance.
- **§ 5 AC-R20-9 (legacy-mode D2 regression coverage)** ↔ **§ 2.5 (tuple-match preserves legacy)** ↔ **§ 2.4 (backward-compat preserved)**: triple-bound preservation; consistent.

**No spec-internal contradictions detected.**

### 9.7 Empirical-premise-verification pass (per R08 MAJOR-2 reinforcement)

- Premise "no current Tessera caller instantiates VerdictGrouper directly": **verified by grep at session start** (`new VerdictGrouper` across engine/, tools/, src/, test/ = zero matches); not inherited testimony.
- Premise "engine/verdict-groups.ts is currently vendored-at-pin": **verified by direct read of VENDORING-MANIFEST.md line 28 at session start**; not inherited.
- Premise "engine/verdict-groups.ts current first-line header is `VENDORED FROM DeploySignal main@5a72371 — 2026-05-16`": **verified by direct read of line 1 at session start**.
- Premise "VerdictGroup currently has the cluster_event_id?: string field at engine/types/verdict.ts:201-209": **verified by direct read at session start**; R18 ship confirmed.
- Premise "test/q01-no-at-pin-deltas.test.ts AT_PIN_FILES contains engine/verdict-groups.ts at line 52": **verified by direct read at session start**.
- Premise "pre-R20 baseline test count 181/0": **inherited from R19 attestation** (PHASE-2-SLICE-1-CLOSE-WALK.md § 1 + R19 Reviewer report cold-verification). Mitigation: AC-R20-14 re-verifies at Implementer GREEN; if observed total differs, HALT with DIAGNOSTIC per CLAUDE-IMPLEMENTER.md. PASS via inheritance + AC re-check.
- Premise "40 vendored files in manifest": **inherited from R18 AC-R18-9** + R19 verification carry-forward. Mitigation: R20 maintenance transitions 1 row (vendored-at-pin → vendored-with-deltas) but does not change the file count; AC-R20-10 verifies the specific row state directly. PASS via inheritance + AC re-check.

### 9.8 Vendored-file-delta assertion-surface enumeration pass (per R18 OBS-2 reinforcement)

Per CLAUDE-ARCHITECT.md REINFORCED 2026-05-16 (R18 derived): "For every planned delta to a vendored file, enumerate ALL existing tests that open or read that file and trace each test's FULL assertion surface against the planned delta." Application to `engine/verdict-groups.ts`:

| Test file | Assertion surface against engine/verdict-groups.ts | R20 impact | Mitigation |
|---|---|---|---|
| `test/q01-no-at-pin-deltas.test.ts` | Byte-identity vs DeploySignal source modulo 6-line header | **R20 BREAKS** (body diverges by deltas + new annotation block) | § 2.8 step 2: REMOVE `engine/verdict-groups.ts` from AT_PIN_FILES list in same GREEN commit; AC-R20-11 binds |
| `test/q01-vendoring-coverage.test.ts` | First-line SHA pin regex `/VENDORED FROM DeploySignal main@5a72371/` | **R20 PRESERVES** (annotation block placement after line 5 keeps lines 1-5 byte-identical) | § 2.7 + § 4.5 explicit; AC-R20-15 verifies first-line preservation |
| `test/q01-schema-additions.test.ts` | Tests config.ts schema (per file name) | **R20 NO IMPACT** (config.ts unchanged) | None required |
| `test/q18-phase2-slice1-topology-substrate.test.ts` | AC-R18-7 greps verdict-groups.ts for D5 template-literal `group-${deployId}-${window_start_ts}` substring | **R20 PRESERVES** (conditional format § 2.2 keeps the inherited substring present in the `else` branch of the conditional; existing `groupId()` private becomes a 2-branch conditional both containing the inherited template literal as one branch) | § 2.2 explicit; the inherited template-literal substring still appears in the legacy-mode branch — preservation byte-identical at the substring level |
| `test/q20-verdict-grouper-cluster-event-scope.test.ts` (new) | Behavioral assertions on VerdictGrouper public API | **R20 IS the test producer** (creates assertions consistent with deltas) | None — by design |

No other test file imports VerdictGrouper or reads engine/verdict-groups.ts. Verified by `grep -r 'VerdictGrouper\|verdict-groups' test/` at session start (5 matches; all enumerated above).

**Key finding (R18 OBS-2 application correct):** the q18 AC-R18-7 substring `/group-\$\{deployId\}-\$\{window_start_ts\}/` continues to match in R20 because the inherited template literal text still appears in the file — specifically in the `else` branch of the new conditional `groupId()` method. The R20 deltas ADD a new branch with the composite format but do NOT remove the inherited template literal. AC-R18-7 (R18) → still PASSES at R20 GREEN. This is the assertion-surface that the R18 reinforcement specifically flags; R20 spec validated against it.

### 9.9 Anti-scope diff baseline + end-bound soundness pass (per R15 MINOR-1 + TQ-4 γ reinforcement)

- **Baseline `cecd677`**: HEAD at session start; verified via `git log --oneline -1` returns `cecd677`. The R19 close window concluded at `0a8832b` (R19 attestation) → `cecd677` (R20-prep operator commit). Per R15 MINOR-1, baseline = "last commit immediately before current round's work began" — `cecd677` is the inclusive boundary (R20 work begins AFTER this SHA).
- **End-bound `<MERGE-READY-SHA>` = coordination-chore SHA-A**: per TQ-4 γ disposition (PHASE-2-SLICE-1-CLOSE-WALK § 2). The Implementer fills in the SHA at GREEN-attestation time. Forward-protection: AC-R20-12 evaluates against fixed historical SHAs once chore-A lands; subsequent Memorial-Updater commits to CLAUDE-*.md or other coordination artifacts do not cause AC-R20-12 to false-fail (they fall AFTER chore-A in the commit timeline).
- **Allowed-set completeness check**: all files modified in R20 work appear in the 11-entry allowed-set (§ 3 component inventory); no orphan files. If GREEN reveals an unanticipated file in the diff, Implementer HALTs per CLAUDE-IMPLEMENTER.md (R19 MAJOR-2 reinforcement — no silent allowed-set expansion).

### 9.10 Halt-discipline scope coverage (per R08 + R19 MAJOR-1/2/3/4 reinforcements)

Spec internal pre-anticipation of halt scenarios:

- **If `npx tsc --noEmit` fails at GREEN** → HALT (b) condition; DIAGNOSTIC required. Spec § 4 prescribes the public API surface (ingest opts extension, openGroupForDeploy single-arg-or-two-arg, etc.); a typecheck failure indicates Implementer-side error — not a spec gap — and is resolvable without operator escalation in the normal Implementer-correct path.
- **If pre-R20 baseline drift (test count != 181 pre-q20-add)** → HALT (b) per AC-R20-14 explicit prescription; DIAGNOSTIC with bounded options including (A) investigate baseline drift cause, (B) defer R20 GREEN until baseline restored. Per R08 MAJOR-2 + R19 MAJOR-2 reinforcements.
- **If `q01-no-at-pin-deltas.test.ts` fails at GREEN despite the AT_PIN_FILES removal step** → HALT; likely cause: an additional vendored file's body diverged unexpectedly. DIAGNOSTIC required; do NOT silently extend AT_PIN_FILES removal beyond `engine/verdict-groups.ts`.
- **If anti-scope diff `git diff cecd677..<SHA-A>` includes a file not in the 11-entry allowed-set** → HALT; DIAGNOSTIC with bounded options including (A) operator-amend spec allowed-set, (B) revert the unanticipated file change. Per R19 MAJOR-1/2 reinforcement: NO silent allowed-set expansion; NO modification of the AC-R20-12 SHA-pin to suppress the failure.
- **If header annotation placement breaks `q01-vendoring-coverage` first-line check** → HALT (a) typecheck/test breakage; cause would be misplacing annotation above line 5; DIAGNOSTIC required. Spec § 4.5 prescribes "after line 5, before line 7" explicitly to prevent this.
- **All halt scenarios route to DIAGNOSTIC + STATUS: ESCALATE per CLAUDE-IMPLEMENTER.md**, NOT silent in-line resolution.

### 9.11 Memorial-self-exoneration guard (per CLAUDE-COMMON.md REINFORCED 2026-05-16 + R19 MAJOR-4 reinforcement)

The Architect ceremony section of MEMORIAL.md will be appended by the Architect at routing time. The spec prescribes (implicit per ceremony) that the Architect's MEMORIAL entries are CONFIRMATION-only (Architect role at R20 — no spec-emit violations claimed). If the spec turns out to have a defect surfaced at Implementer or Reviewer, those roles document it and the Memorial-Updater reinforces — the Architect does NOT retroactively self-exonerate. R19 MAJOR-4 + R08 reinforcement preempted in this expectation.

### 9.12 Final verdict

All 11 grilling gates PASS. Spec is ready to route to Implementer.

---

_End of Q-R20-SPEC.md._
