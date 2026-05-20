# CLUSTER-HANDOFF-WAVE10-3A-3C — Event-contract interface for WU-Phase3-3C consumption

**Producer:** WU-Phase3-3A re-scoped (closed R62; chore-A `0018502b` + chore-B `5771458` + Option 1 coord chore `3e833f4` + MU `3b8f684`)
**Consumer:** WU-Phase3-3C (R64b dispatch; DS → Tessera event consumer + freeze-hook real-event activation)
**Emitted at:** WAVE-GATE-09 close (R63)
**Date:** 2026-05-20

---

## Purpose

WU-Phase3-3C implements the DS→Tessera event consumer (receives deploy events from DS via HTTP) and extends the Phase 2 freeze-hook (R20+R21+R36 frozen surface) to activate against real deploy events rather than synthetic VerdictGroups. This handoff documents the event-contract module surface as it landed at R62 + the freeze-hook extension surface so R64b's Architect can spec the consumer + freeze-hook activation against stable interfaces. **R64b MUST consume `engine/ds-integration/event-contract.ts` types directly; MUST NOT modify the contract surface; MUST NOT modify the freeze-hook body (only constructor/factory extension permitted).**

---

## Event-contract surface (R62 deliverable; do NOT modify at R64b)

**Module:** `engine/ds-integration/event-contract.ts`
**Barrel re-export:** `engine/ds-integration/index.ts`

### Exports

1. **`DeployEventPayload`** (interface) — wire-format projection for deploy events sent by DS. Required fields (per spec § 4.2):
   - `deploy_event_id: string`
   - `event_class: 'firmware_push' | 'model_redeploy' | 'env_change' | 'config_change' | 'capacity_change'` — 5-value closed-set; literal-union type; A16-equivalent parity protection via AC-R62-7
   - `deploy_at: string` (ISO-8601 timestamp)
   - `target_fleet_id: string`
   - `protocol_version: 'v1'` — literal type
   - `cluster_event_metadata?: { ... }` — optional structural projection of `engine/events/event-feed.ts:17-31` `ClusterEvent` (R64b Architect verifies exact field shape via spec § 4.2 pseudocode)

2. **`DsToTesseraEventEndpoint`** (interface + `as const` constant pair):
   - `path: '/v1/tessera/deploy-events'` — literal type
   - `method: 'POST'` — literal type
   - `expected_response_status: 202` — literal type
   - Companion constant: `DS_TO_TESSERA_EVENT_ENDPOINT: DsToTesseraEventEndpoint` (frozen runtime value)

3. **`DsToTesseraAuthHeaders`** (interface, distinct from `TesseraToDsAuthHeaders`):
   - `authorization: \`Bearer ${string}\`` — DS-issued token; template-literal narrowing
   - `x-ds-protocol: 'v1'` — literal type
   - `content-type: 'application/json'` — literal type

### ClusterEventKind 5-value parity invariant

The 5-value `event_class` closed-set in `event-contract.ts` mirrors `engine/events/event-feed.ts:10-15` `ClusterEventKind` exactly. Per spec § 5.5 D-2:

- **If a future Tessera round adds a 6th `ClusterEventKind` without updating the contract**, the engine type and wire-format type silently diverge.
- **Mitigation:** AC-R62-7 binds all 5 wire-format values at compile-time + runtime; Reviewer cold-eye verifies parity at every round that touches `engine/events/event-feed.ts` OR `engine/ds-integration/event-contract.ts`.
- **R64b responsibility:** the event consumer adapter MUST cast `DeployEventPayload.event_class` to `ClusterEventKind` via a discriminating switch/match (compile-time exhaustiveness ensures parity); MUST NOT introduce ad-hoc string comparison.

---

## Freeze-hook extension surface (Phase 2 R20+R21+R36 frozen; R64b extends via constructor/factory addition ONLY)

**Module:** `engine/events/freeze-hook.ts:1-51` (frozen surface)

**What is FROZEN (R64b MUST NOT modify):**
- Existing body of `FreezeHook` class methods (`activate`, `deactivate`, `is_active`, etc. per the R20 + R21 + R36 deliverable).
- Existing constructor signature (R20 deliverable).
- The Phase 2 synthetic-VerdictGroup activation path (R36 deliverable).

**What R64b MAY extend:**
- **NEW constructor variant** (factory function preferred over constructor overload for backwards-compat):
  ```typescript
  static FreezeHook.fromDsEventFeed(deps: { event_consumer: DsEventConsumer; ... }): FreezeHook
  ```
- **NEW dependency injection**: a `DsEventConsumer` adapter (R64b deliverable) that the factory passes into a frozen `FreezeHook` instance via its existing constructor. The `DsEventConsumer` exposes the activation event-stream that the freeze-hook subscribes to; freeze-hook body remains untouched.
- **NEW event-handler module**: per parallel-class file convention, R64b owns `engine/ds-integration/event-consumer.ts` (Coordinator default; Architect picks). This module implements the HTTP server adapter that receives DS event POSTs and converts them to the freeze-hook activation signal.

**Anti-scope clarification:** R64b extends the freeze-hook surface but does NOT modify its body. If the spec at R64b cannot achieve the activation pattern without freeze-hook body modification, R64b Architect MUST HALT + DIAGNOSTIC at spec-emit time (do NOT silently modify R20/R21/R36 frozen surface).

---

## Schema state at R62 close

`engine/types/verdict.ts`, `engine/events/event-feed.ts`, and `engine/events/freeze-hook.ts` are ALL UNTOUCHED by R62 (anti-scope; verified by AC-R62-12 diff ⊆ ALLOWED_SET). The event-contract module references the engine types structurally (5-value `event_class` mirrors `ClusterEventKind` exactly) but does NOT import from them — cross-repo decoupling per FR-D4. R64b MAY read these engine types for wire-format alignment but MUST NOT import them into the event-consumer adapter.

---

## Cross-cluster contract for R64b (WU-Phase3-3C) consumption

**What R64b inherits stable:**
1. `engine/ds-integration/event-contract.ts` exists; exports `DeployEventPayload` + `DsToTesseraEventEndpoint` + `DS_TO_TESSERA_EVENT_ENDPOINT` + `DsToTesseraAuthHeaders`.
2. `engine/ds-integration/index.ts` barrel re-exports the event-contract types.
3. Zero imports from `'../types'` / `'../events'` in the event-contract module (verified at R62 by DECOUPLING-2 EMPIRICAL.sh check).
4. `engine/events/freeze-hook.ts` Phase 2 frozen surface (R20+R21+R36 deliverable; body untouched since R36).
5. `engine/events/event-feed.ts` `ClusterEventKind` 5-value closed-set at `:10-15` (R36-frozen).

**What R64b extends (implementation + constructor/factory addition only; NO contract or freeze-hook body modification):**
1. **NEW module:** `engine/ds-integration/event-consumer.ts` (Coordinator file-tree default; Architect picks at R64b spec time) — implements HTTP server adapter that receives `DeployEventPayload` POSTs on `DS_TO_TESSERA_EVENT_ENDPOINT.path` and emits activation events to a downstream consumer (the freeze-hook factory).
2. **NEW factory method:** `FreezeHook.fromDsEventFeed(deps)` static method on the existing `FreezeHook` class (extension only; no body modification). Alternative pattern: a separate factory module `engine/ds-integration/freeze-hook-factory.ts`. R64b Architect picks at spec time; both patterns honor the no-body-modification anti-scope.
3. Synthetic-fixture tests validating the consumer's HTTP wire-format alignment + the freeze-hook activation transitions (synthetic deploy events; no real DS endpoint per Path B).

**Schema-write-conflict risk vs WU-3B: LOW.** R64a writes `engine/ds-integration/feed.ts`-class adapter file. R64b writes `engine/ds-integration/event-consumer.ts`-class adapter file + factory addition. Disjoint files. Both inherit the contract module (read-only from 3A's output); neither modifies the contract module. D5 test passes cleanly.

**Schema-write-conflict risk on `engine/events/freeze-hook.ts`:** if R64b factory pattern modifies freeze-hook to add the `fromDsEventFeed` static method, this touches the frozen surface. **Resolution per anti-scope:** R64b MUST use the separate factory module pattern (`engine/ds-integration/freeze-hook-factory.ts`) instead of modifying `freeze-hook.ts` directly. The factory module imports the existing `FreezeHook` class, constructs new instances via the existing constructor (read-only access to the freeze-hook API), and exposes the DS-event-driven activation path as a sibling factory. NO modification of `engine/events/freeze-hook.ts` body or signature.

**R64b architect-spec verification (recommended at spec emit):**
1. Read `engine/ds-integration/event-contract.ts` to confirm interface signatures + literal types + 5-value closed-set.
2. Read `engine/ds-integration/index.ts` to confirm barrel re-export shape.
3. Read `engine/events/event-feed.ts:10-15` to confirm 5-value `ClusterEventKind` parity (AC-R62-7 binding).
4. Read `engine/events/event-feed.ts:17-31` for `ClusterEvent` structural shape (wire-format projection alignment).
5. Read `engine/events/freeze-hook.ts:1-51` to confirm frozen surface; note the existing constructor signature + activation API for the factory module to consume.
6. Read `coordination/specs/Q-R62-SPEC.md` § 4.2 (event-contract pseudocode) + § 5.3 (branch-binding coverage table).
7. **Apply R62 OBS lesson (claim-then-walk for multi-commit chains):** Architect MUST walk through every claim about contract shape, freeze-hook surface, and `ClusterEventKind` parity via direct file Read at spec-emit time.

---

## Anti-scope for R64b with respect to this handoff

- R64b MUST NOT modify `engine/ds-integration/event-contract.ts` (contract module; frozen post-R62).
- R64b MUST NOT modify `engine/ds-integration/feed-contract.ts` (WU-3B surface; cross-cluster anti-scope).
- R64b MUST NOT modify `engine/ds-integration/index.ts` (barrel; frozen post-R62) EXCEPT to add new exports for the event-consumer adapter + factory module.
- R64b MUST NOT modify `engine/events/freeze-hook.ts` body or signature (R20+R21+R36 frozen). Factory pattern in a separate module preserves this anti-scope.
- R64b MUST NOT modify `engine/events/event-feed.ts` (R36-frozen; ClusterEventKind 5-value parity preserved).
- R64b MUST NOT modify `engine/types/verdict.ts` (R56-frozen; A16 literal preserved).
- R64b MUST NOT add real-DS-endpoint HTTP calls (Path B; synthetic fixtures + mock HTTP only).
- R64b MUST NOT introduce new external dependencies (W3-4 Option A; HTTP via Node.js built-in `node:http`).
- R64b MUST NOT modify `coordination/specs/Q-R62-SPEC.md` (R62 spec frozen post-Option 1 coordination chore).
- R64b MUST NOT touch `~/concord/deploysignal/` (W3-1 Option A; DS-side producer implementation is separate PR scheduled outside Tessera pipeline).

---

## Forward-flags for R64b Architect

- **OQ-R64b-1 candidate:** Factory pattern location — separate module `engine/ds-integration/freeze-hook-factory.ts` (recommended; honors no-body-modification anti-scope) vs static method on `FreezeHook` class (would require modifying freeze-hook.ts; rejected by anti-scope). Architect resolves at spec time; default = separate factory module.
- **OQ-R64b-2 candidate:** Activation transition semantics — does a single DS deploy event trigger a single freeze-hook activation, or does the event-consumer batch deploy events into freeze-hook activation windows? Architect designs at spec § 0 brainstorm.
- **OQ-R64b-3 candidate:** ClusterEventKind ↔ event_class mapping function — pure projection (5-to-5 identity) or explicit switch with exhaustiveness check (compile-time parity gate). Architect picks; default = explicit switch for AC-R62-7-style discriminability inheritance.
- **OQ-R64b-4 candidate:** Mock HTTP server pattern — Node.js built-in `node:http` server / pure-function payload-deserialization test only (no HTTP roundtrip). Architect picks.
- **R62 lesson — apply claim-then-walk:** When Architect spec § 0.2 makes any claim about codebase property OR freeze-hook surface OR ClusterEventKind parity, MUST run actual grep / Read at spec-emit time. R62 surfaced AC-R62-15 structural vacuity because the Architect did not walk through chore-B's actual diff. Same lesson applies to freeze-hook frozen surface claims here — verify the EXACT frozen API via direct file Read.

---

## Version history

| Date | Change |
|---|---|
| 2026-05-20 | CLUSTER-HANDOFF-WAVE10-3A-3C.md emitted at R63 (WAVE-GATE-09 close); documents event-contract surface (R62 deliverable) + freeze-hook extension constraints for R64b WU-Phase3-3C consumption. |
