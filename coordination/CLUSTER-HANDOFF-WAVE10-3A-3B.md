# CLUSTER-HANDOFF-WAVE10-3A-3B — Feed-contract interface for WU-Phase3-3B consumption

**Producer:** WU-Phase3-3A re-scoped (closed R62; chore-A `0018502b` + chore-B `5771458` + Option 1 coord chore `3e833f4` + MU `3b8f684`)
**Consumer:** WU-Phase3-3B (R64a dispatch; Tessera → DS feed implementation)
**Emitted at:** WAVE-GATE-09 close (R63)
**Date:** 2026-05-20

---

## Purpose

WU-Phase3-3B implements the Tessera→DS feed adapter (sends `VerdictGroup` observations to DS correlation layer over HTTP). This handoff documents the contract module surface as it landed at R62 so R64a's Architect can spec the adapter implementation against a stable interface. **R64a MUST consume `engine/ds-integration/feed-contract.ts` types directly; MUST NOT modify the contract surface.**

---

## Feed-contract surface (R62 deliverable; do NOT modify at R64a)

**Module:** `engine/ds-integration/feed-contract.ts`
**Barrel re-export:** `engine/ds-integration/index.ts`

### Exports

1. **`VerdictGroupPayload`** (interface) — wire-format projection of `engine/types/verdict.ts:198-231` `VerdictGroup`. Required fields (per spec § 4.1 + AC-R62-4 + AC-R62-14):
   - `verdict_group_id: string`
   - `correlational_not_causal: true` — **literal type** (NOT `boolean`); A16 propagation from `engine/types/verdict.ts:298`
   - `verdict_set: ReadonlyArray<{ shard_id: string; verdict_label: string; e_value?: number; ... }>` — structural projection (Architect at R64a verifies exact field shape via spec § 4.1 pseudocode)
   - `tessera_at: string` (ISO-8601 timestamp)
   - `protocol_version: 'v1'` — literal type

2. **`TesseraToDsFeedEndpoint`** (interface + `as const` constant pair):
   - `path: '/v1/tessera/verdict-groups'` — literal type
   - `method: 'POST'` — literal type
   - `expected_response_status: 201` — literal type
   - Companion constant: `TESSERA_TO_DS_FEED_ENDPOINT: TesseraToDsFeedEndpoint` (frozen runtime value)

3. **`TesseraToDsAuthHeaders`** (interface):
   - `authorization: \`Bearer ${string}\`` — template-literal type narrowing to bearer-token shape (does NOT validate or enforce specific scheme; auth-scheme deferral per spec § 5.5 D-3)
   - `x-tessera-protocol: 'v1'` — literal type
   - `content-type: 'application/json'` — literal type

### Wire-format invariants (A16 propagation)

- `correlational_not_causal: true` MUST remain literal type at the wire-format projection. Any regression to `boolean` would fail AC-R62-14 regex `/^\s*correlational_not_causal:\s*true\s*;/m`.
- The literal-type protection extends from engine internals (`engine/types/verdict.ts:298` defended by AC-R62-13) through the wire-format projection. **R64a MUST preserve the literal type in any feed implementation that constructs `VerdictGroupPayload` values.**

---

## Schema state at R62 close

`engine/types/verdict.ts` and `engine/events/event-feed.ts` are UNTOUCHED by R62 (anti-scope; verified by AC-R62-12 diff ⊆ ALLOWED_SET). The contract module references these engine types structurally (via wire-format projection) but does NOT import from them — cross-repo decoupling per FR-D4. R64a MAY read these engine types for wire-format alignment but MUST NOT import them into the feed adapter implementation.

---

## Cross-cluster contract for R64a (WU-Phase3-3B) consumption

**What R64a inherits stable:**
1. `engine/ds-integration/feed-contract.ts` exists; exports `VerdictGroupPayload` + `TesseraToDsFeedEndpoint` + `TESSERA_TO_DS_FEED_ENDPOINT` + `TesseraToDsAuthHeaders`.
2. `engine/ds-integration/index.ts` barrel re-exports the contract types.
3. Zero imports from `'../types'` / `'../events'` in the contract module (verified at R62 by DECOUPLING-1 EMPIRICAL.sh check).
4. A16 literal `correlational_not_causal: true` protected at both engine and wire-format layers.

**What R64a extends (implementation only; NO contract modification):**
1. **NEW module:** `engine/ds-integration/feed.ts` (Coordinator file-tree default; Architect picks at R64a spec time) — implements HTTP client adapter that constructs `VerdictGroupPayload` from `VerdictGroup` engine types + sends POST to `TESSERA_TO_DS_FEED_ENDPOINT.path` with `TesseraToDsAuthHeaders`.
2. Tessera-side wiring: somewhere in the engine fleet, the freeze-hook or verdict-emit path opt-in calls the feed adapter when DS integration is configured. R64a Architect designs the wiring approach (event-driven vs polled vs imperative-call); NO body modification of R20/R21/R36 frozen surfaces.
3. Synthetic-fixture tests validating the adapter's wire format matches the contract (no real DS endpoint; mock HTTP server OR pure-function payload-construction tests).

**Schema-write-conflict risk vs WU-3C: LOW.** R64a writes `engine/ds-integration/feed.ts`-class adapter file. R64b writes `engine/ds-integration/event-consumer.ts`-class adapter file. Disjoint files. Both inherit the contract module (read-only from 3A's output); neither modifies the contract module. D5 test passes cleanly.

**R64a architect-spec verification (recommended at spec emit):**
1. Read `engine/ds-integration/feed-contract.ts` to confirm interface signatures + literal types.
2. Read `engine/ds-integration/index.ts` to confirm barrel re-export shape.
3. Read `engine/types/verdict.ts:198-231` to confirm engine-side `VerdictGroup` shape (wire-format projection alignment).
4. Read `coordination/specs/Q-R62-SPEC.md` § 4.1 (feed-contract pseudocode) + § 5.3 (branch-binding coverage table) for the contract's design rationale.
5. **Apply R62 OBS lesson (claim-then-walk for multi-commit chains):** Architect MUST walk through every claim about contract shape via direct file Read at spec-emit time; do NOT rely on memorized contract structure from this handoff alone.

---

## Anti-scope for R64a with respect to this handoff

- R64a MUST NOT modify `engine/ds-integration/feed-contract.ts` (contract module; frozen post-R62).
- R64a MUST NOT modify `engine/ds-integration/index.ts` (barrel; frozen post-R62) EXCEPT to add new exports for the feed adapter implementation.
- R64a MUST NOT modify `engine/ds-integration/event-contract.ts` (WU-3C surface; cross-cluster anti-scope).
- R64a MUST NOT modify `engine/types/verdict.ts` (R56-frozen; A16 literal at `:298` preserved).
- R64a MUST NOT modify `engine/events/event-feed.ts` (R36-frozen; ClusterEventKind 5-value parity is WU-3C concern).
- R64a MUST NOT modify `engine/events/freeze-hook.ts` body (R20/R21/R36 frozen; WU-3C extends via constructor/factory addition ONLY).
- R64a MUST NOT add real-DS-endpoint HTTP calls (Path B; synthetic fixtures + mock HTTP only).
- R64a MUST NOT introduce new external dependencies (W3-4 Option A; HTTP via Node.js built-in `node:http` or fetch).
- R64a MUST NOT modify `coordination/specs/Q-R62-SPEC.md` (R62 spec frozen post-Option 1 coordination chore).
- R64a MUST NOT touch `~/concord/deploysignal/` (W3-1 Option A; DS-side implementation is separate PR scheduled outside Tessera pipeline).

---

## Forward-flags for R64a Architect

- **OQ-R64a-1 candidate:** Wiring approach for Tessera-side feed dispatch (event-driven via freeze-hook callback vs polled via background timer vs imperative call from existing emit path). Architect picks at spec time; document tradeoffs in spec § 0 brainstorm.
- **OQ-R64a-2 candidate:** Mock HTTP server pattern (synthetic-fixture style per Path B). Options: Node.js built-in `node:http` test server / pure-function payload-construction test only (no actual HTTP roundtrip). Architect picks.
- **R62 lesson — apply claim-then-walk:** When Architect spec § 0.2 makes any claim about codebase property OR multi-commit chain behavior, MUST run actual grep / Read / diff command at spec-emit time. R62 surfaced the structural-vacuity of AC-R62-15 because the Architect did not walk through what chore-B actually commits. Same lesson applies to claims about contract shape, freeze-hook surface, or wire format here.

---

## Version history

| Date | Change |
|---|---|
| 2026-05-20 | CLUSTER-HANDOFF-WAVE10-3A-3B.md emitted at R63 (WAVE-GATE-09 close); documents feed-contract surface (R62 deliverable) for R64a WU-Phase3-3B consumption. |
