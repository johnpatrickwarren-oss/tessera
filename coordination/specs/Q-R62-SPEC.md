# Q-R62-SPEC — Phase 3 SLICE 3 WU-Phase3-3A (re-scoped per Option F): DS integration interface contract design (HTTP API types)

**Round:** R62 (full tier — Architect + Implementer + Reviewer + Memorial-Updater).
**Cluster shape:** single-cluster (Wave 9 of `coordination/WAVE-PLAN-09.md`; sole WU = re-scoped WU-Phase3-3A per Option F resolution at `ad6cc6b`).
**Phase / SLICE:** Phase 3 SLICE 3 (final Phase 3 SLICE; DS bi-directional integration foundation). WU-3A re-scoped from "engine npm package extract" (DEFERRED to Phase 4) to "DS integration interface contract design" — TypeScript types + HTTP transport metadata + contract documentation.
**Scope reference:** `coordination/PRD.md` § Phase 3 (FR-D4 line 442; AC-P9 line 452) + `coordination/WAVE-PLAN-09.md` § ⚠ R61 ESCALATE #2 → Option F amendment (lines 5–18) + `coordination/NEXT-ROLE.md` § R62 Round-scope directive (lines 75–177).
**PRD trace:** FR-D4 (line 442) — *"DS integration interface contract — HTTP API + TypeScript types shared between Tessera and DS"* · AC-P9 (line 452) — *"contract types live in `engine/ds-integration/`; Tessera↔DS bi-directional data flow operates via the contract independently of file-level engine extraction"* · US-08 (line 428) — bi-directional DS integration decoupling layer.
**Round-start SHA (anti-scope diff lower bound):** `ad6cc6b` (chore(R61): resolve ESCALATE #2 per Option F — defer engine npm extract; re-scope WU-3A; verified via `git rev-parse HEAD` at Architect session entry).
**Empirical baseline at session entry (verified by Architect via `node --test --test-reporter=tap test/*.test.js`):** `tests=399 / pass=394 / fail=2 / skipped=3`. Known fails: (a) `AC-R36-30: round-start-to-chore-A diff path-set ⊆ R36 allowed-set`; (b) `AC-R36-31: chore-A-to-HEAD diff ⊆ R36 post-chore-A allowed set (chore-B forward protection)`. Both are R36 forward-protection guards with CHORE_A_SHA literal (`87e372f` Phase 2 close) structurally older than HEAD; carry-forward from R58 close; NOT introduced by R62.
**Empirical typecheck baseline (verified by Architect via `npx tsc -p tsconfig.test.json`):** exit code 0; zero diagnostics. R62 inherits clean tsc surface from R58 close and must preserve it.
**Toolchain at session entry:** Node v25.9.0; TypeScript 5.9.3.

---

## § 0 Brainstorm phase (Superpowers — inline)

Five architectural axes have genuine multi-option choices. Each is brainstormed with three approaches, strengths / weaknesses / hidden assumptions / risks, and a selection rationale.

### § 0.1 File-layout decomposition inside `engine/ds-integration/`

**Approach A — Two contract files (`feed-contract.ts` + `event-contract.ts`) + `index.ts` barrel + `README.md` (PICKED).** Split the contract by direction: Tessera→DS lives in `feed-contract.ts`; DS→Tessera lives in `event-contract.ts`; `index.ts` re-exports both; `README.md` carries the human-readable contract description.

- **Strengths:** Each direction is independently reviewable. The two repos can be reasoned about as independent contracts (Tessera's outbound vs DS's outbound). Future contract version bumps may diverge per-direction; per-file isolation makes that straightforward. Matches the WAVE-PLAN-09 Step 2 D1-D5 analysis precedent (3B owns `feed.ts`; 3C owns `event-consumer.ts`; parallel-class file convention) — the contract artifacts pre-establish the file-ownership boundary that 3B+3C will adopt at Wave 10. JSDoc lives next to its type; README.md describes contract semantics + versioning policy + anti-scope.
- **Weaknesses:** Two files instead of one means readers must look at three sources of truth for the full contract (feed + event + barrel). Mitigated by `index.ts` barrel as the single import surface.
- **Hidden assumptions:** TypeScript supports `export * from` across files cleanly (verified at R56 + R58 precedent — `engine/topology/*-source.ts` use the same pattern). `README.md` is acceptable inside `engine/*` — precedent absent (no `README.md` inside engine/* today; verified via `ls engine/**/*.md` returning empty at session entry), but the directive (NEXT-ROLE.md:102) explicitly authorizes it.
- **Risks:** low.

**Approach B — Single `contract.ts` file holding both directions.** All types in one ~120-line file; no barrel; `README.md` separate.

- **Strengths:** One file to read; minimal directory clutter.
- **Weaknesses:** Couples the two directions in one source. Later contract-version divergence (e.g., feed bumps to v2 while events stay v1) forces a single file to track both versions. Reviewer cold-eye audit of a single dense file is more error-prone than two scoped files. Does NOT pre-establish the 3B+3C file-ownership boundary documented in WAVE-PLAN-09 Step 2.
- **Risks:** medium — couples per-direction contract evolution.

**Approach C — Sub-namespaced single module with two TypeScript namespaces (`namespace TesseraToDs { ... }; namespace DsToTessera { ... }`).** Single file; logical separation via namespaces.

- **Strengths:** Logical scoping within one file.
- **Weaknesses:** TypeScript discourages internal `namespace` keyword for new code (recommends ES modules per https://www.typescriptlang.org/docs/handbook/namespaces.html "Namespaces and Modules"). Inherited `engine/*` code uses zero `namespace` declarations (verified via grep — `grep -rn "^namespace\|^export namespace" engine/` = 0 matches at session entry). Introducing namespaces would be a new architectural pattern at low value (A2 trigger for Architect tier).
- **Risks:** medium-high — anti-precedent for inherited module-style code.

**Selection rationale:** Approach A. Per-direction file isolation; barrel preserves single-import surface; README pre-establishes 3B+3C file-ownership convention; matches WAVE-PLAN-09 Step 2 D-test analysis precedent. Approach C rejected for namespace anti-precedent.

### § 0.2 Wire-format type coupling to engine/types/verdict.ts

**Approach A — Define wire-format types as structurally-independent projections (PICKED).** The contract module declares its own `VerdictGroupPayload` interface — a self-contained type with no `import` from `'../types'` or `'../types/verdict'`. The projection mirrors the load-bearing subset of `VerdictGroup` (`engine/types/verdict.ts:198-231`) needed by DS: `group_id`, `deploy_id`, `window_start_ts`, `window_end_ts`, optional `cluster_event_id`, firing-summary metadata, and the A16 literal `correlational_not_causal: true`. Same approach for DS→Tessera: `DeployEventPayload` is a wire-format projection of the inherited `ClusterEvent` shape (`engine/events/event-feed.ts:17-31`) — structurally compatible but defined as its own interface.

- **Strengths:** DS implementations consume pure type definitions with zero dependency on Tessera-internal types. Future Tessera deltas to `engine/types/verdict.ts` (additional fields, schema evolution) do NOT silently break the wire contract — the projection is the stable surface. Matches "interface contract" framing per FR-D4 + AC-P9 (PRD:442 + :452): contract types are shared shapes both repos implement against, not engine-internal types re-exported. Preserves the npm-package deferral semantics — DS does not need to consume any Tessera engine code to implement the contract. The 5-value closed-set `ClusterEventKind` (`engine/events/event-feed.ts:10-15`: `'firmware_push' | 'model_redeploy' | 'env_change' | 'config_change' | 'capacity_change'`) is duplicated in the contract — a single source-of-divergence risk that is documented in § 5.5 D-2.
- **Weaknesses:** Two parallel shapes (engine-internal + wire-format) introduce a maintenance burden — when one evolves, the other must be considered. Mitigated by (a) explicit JSDoc cross-reference linking contract types to their engine counterparts; (b) the 3B+3C Wave 10 implementations are responsible for the projection mapping at the boundary; (c) the contract version literal (`'v1'`) pins the wire-format generation. The 5-value `ClusterEventKind` parallel adds the only enum risk; AC-R62-7 binds all 5 values to catch silent additions/removals.
- **Hidden assumptions:** DS does NOT need access to `VerdictGroup.verdicts` (the per-tick `FusedVerdict[]` array) or `VerdictGroup.root_cause` (the earliest-firing FusedVerdict) for the bi-directional integration's primary value. DS consumes the summary fields (group_id, deploy/correlation IDs, window bounds, firing count, confidence, A16). Future contract v2 could expand the projection without breaking v1 — additive optional fields are forward-compatible.
- **Risks:** low — projection convention is the cleaner interface; maintenance burden is bounded by JSDoc cross-references + explicit version literal.

**Approach B — Re-export engine types directly (`export type { VerdictGroup, ClusterEvent } from '../types/verdict'`).** Contract module re-exports from engine internals. DS imports the contract module and transitively imports Tessera engine types.

- **Strengths:** Zero duplication; one source of truth (the engine types).
- **Weaknesses:** DS-side consumers transitively depend on Tessera engine internals. Future delta to `engine/types/verdict.ts` (e.g., R63+ rounds adding fields) silently changes the wire format — a Tessera-internal change becomes a cross-repo breaking change with no surface. Defeats the "interface contract" framing — the contract becomes "Tessera engine types as of SHA X", not a stable wire schema. Forces DS to consume Tessera-evolved schema deltas it has no use for. Tightly couples npm-package deferral semantics to "DS must consume some Tessera engine module" — exactly what Option F deferred.
- **Risks:** high — couples DS to Tessera internal evolution.

**Approach C — Generic type parameter: `interface FeedRequest<Payload> { payload: Payload; ... }` parameterized over the wire-format shape.** Contract module declares generic envelopes; consumers provide the payload type.

- **Strengths:** Maximum flexibility; DS can use its own internal types as the payload.
- **Weaknesses:** "Interface contract" requires a CONCRETE shared shape, not a generic envelope. A contract that says "send me any payload" is no contract. The directive (NEXT-ROLE.md:97-99) says "request/response shapes for sending VerdictGroup data to DS" — concrete shape, not parameterized.
- **Risks:** high — fails contract framing.

**Selection rationale:** Approach A. Structurally-independent projection preserves cross-repo independence; pinned by JSDoc + contract_version literal; matches Option F resolution's "interface contract" framing.

### § 0.3 HTTP transport metadata (path + method) encoding

**Approach A — `as const` literal-typed constants + interface declaring the same literal types (PICKED).** Export both:
1. An interface (`TesseraToDsFeedEndpoint`) whose `path` and `method` fields use string-literal types (`path: '/v1/tessera/verdict-groups'; method: 'POST'`).
2. A matching `as const` constant (`TESSERA_TO_DS_FEED_ENDPOINT = { path: '/v1/tessera/verdict-groups', method: 'POST' } as const`).

Both pin the HTTP path + method as the single source of truth across Tessera + DS.

- **Strengths:** The interface gives type-level enforcement (any future implementation declaring `TesseraToDsFeedEndpoint` must use exactly these literals). The constant gives runtime access (3B implementation can read `TESSERA_TO_DS_FEED_ENDPOINT.path` to register the route). Zero runtime cost beyond ~50 bytes of literal-constant text per endpoint. No HTTP library dependency (W3-4 honored). Both directions of the contract can read from the same module.
- **Weaknesses:** Two declarations (interface + const) for the same information feels duplicative. Mitigated by the interface being a TYPE-level pin; the const being a VALUE-level pin. Different consumers use different ones.
- **Hidden assumptions:** `as const` produces zero runtime overhead beyond the literal text (verified — TypeScript compiles `{x: 'a'} as const` to `{x: 'a'}` JavaScript literal). The "no implementation" anti-scope (NEXT-ROLE.md:120 "types and contract shape only") permits literal-constant declarations — they encode shape, not behavior.
- **Risks:** low.

**Approach B — Interface only; no runtime constant.** Type-level pin only; consumers write the literal themselves.

- **Strengths:** Maximum minimalism; pure-types-only.
- **Weaknesses:** Each consumer site (Tessera-side route registration, DS-side HTTP client) writes `'/v1/tessera/verdict-groups'` inline, creating N copies of the literal. Single-source-of-truth violated.
- **Risks:** medium — drift surface across consumers.

**Approach C — Pure constants; no interface.** Just `export const TESSERA_TO_DS_FEED_ENDPOINT = ...`; no type-level pin.

- **Strengths:** Single declaration.
- **Weaknesses:** Type-level enforcement at consumer sites is weak; a consumer can ignore the const and write the wrong path with no type error.
- **Risks:** medium — type-checking gap.

**Selection rationale:** Approach A. Interface + const dual-encoding is small overhead (one extra declaration each) for both type-level and value-level enforcement. The two declarations are bound by AC-R62-9 to match.

### § 0.4 Contract documentation surface

**Approach A — `README.md` + per-type JSDoc inside `.ts` files (PICKED).** Human-readable contract description lives in `engine/ds-integration/README.md`; per-type JSDoc lives next to each interface. README covers: contract framing, endpoints, version policy, anti-scope. JSDoc covers: per-field semantics, cross-reference to engine internals.

- **Strengths:** Matches inherited convention — `engine/types/verdict.ts` carries heavy JSDoc per-interface (Addition #25 + #26 blocks at `engine/types/verdict.ts:175-247`); freeze-hook + topology adapters carry file-header comment blocks. README adds a higher-level overview that JSDoc cannot reasonably carry. Both layers serve different audiences: README for humans onboarding; JSDoc for IDE-assisted consumers + tsdoc tooling.
- **Weaknesses:** Two surfaces to keep in sync. Mitigated by the README being scope-level (versioning, anti-scope) while JSDoc is field-level (per-type semantics) — they cover non-overlapping concerns.
- **Hidden assumptions:** No precedent for `README.md` files inside `engine/*` (verified via `find engine -name 'README*'` = empty at session entry). The directive (NEXT-ROLE.md:102) explicitly authorizes it: `engine/ds-integration/README.md (or contract.ts JSDoc)`.
- **Risks:** low.

**Approach B — JSDoc only; no README.** All documentation in `.ts` file headers.

- **Strengths:** Single source; no precedent break.
- **Weaknesses:** File-header JSDoc cannot reasonably carry contract version policy, anti-scope framing, freeze-hook activation semantics, or cross-section linkage. Forces overload of `.ts` files with non-code content.
- **Risks:** medium — readability gap for cross-cutting concerns.

**Approach C — OpenAPI YAML companion.** Add `engine/ds-integration/openapi.yaml` alongside the TypeScript types.

- **Strengths:** Vendor-neutral; tooling ecosystem (codegen, validators).
- **Weaknesses:** Introduces a second source-of-truth that can drift from TS types (the spec drift problem OpenAPI tooling is designed to mitigate — but only WITH tooling that this spec doesn't include). NEXT-ROLE.md:100 W3-4 explicitly excludes `openapi-typescript` and similar tooling. Adding YAML without a generator means manual sync.
- **Risks:** high — drift surface; tooling explicitly out-of-scope.

**Selection rationale:** Approach A. README + JSDoc covers both audiences cleanly; precedent break for `engine/*/README.md` is authorized by directive; tooling-free.

### § 0.5 Test architecture for type contract verification

**Approach A — Runtime structural tests using TypeScript-compiled sample values (PICKED).** Each AC test constructs a sample value typed as the contract interface (`const sample: TesseraToDsFeedRequest = { ... }`), exercises the literal-type discriminators (e.g., `sample.contract_version === 'v1'`), and asserts type-narrowing properties at runtime (`typeof sample.verdict_group.group_id === 'string'`). TypeScript compile-time errors catch missing/wrong-type fields (bound by AC-R62-11 tsc-exit-0); runtime assertions catch literal-value drift.

- **Strengths:** Tests run under the existing `node --test test/*.test.js` harness — same toolchain as R58 + R56. Type contract verification gets both compile-time enforcement (any wrong field type fails tsc) AND runtime enforcement (any wrong literal value fails the test). Discriminating per Rule 3 — no `length >= 0` patterns; exact-equality on literals, exact-type on field types. Sample values pin discriminator union enumeration (each of the 5 ClusterEventKind values is exercised; each status discriminator value is exercised).
- **Weaknesses:** Sample-based tests can in principle miss adversarial regressions where the type's structural shape is preserved but semantics drift (e.g., field renamed but old name kept as a deprecated alias). The contract version literal is the safeguard: a v1-tagged sample must structurally match the v1 type; a future v2 schema would carry a new literal.
- **Hidden assumptions:** TypeScript type-narrowing at the test site (the `: TesseraToDsFeedRequest` annotation) is enforced by tsc — verified at R58 precedent (Q-R58-EMPIRICAL.sh + test/q58-live-fetch-interface.test.ts use the same pattern for the 5-adapter type pins).
- **Risks:** low.

**Approach B — Pure type-level assertions via `type Assert<X, Y>` helpers; no runtime tests.** Only compile-time enforcement.

- **Strengths:** No runtime; pure type verification.
- **Weaknesses:** Tessera's existing test infrastructure (`node --test test/*.test.js`) counts files with runtime tests. A pure-type-only test file would produce zero runtime tests, breaking the test-count attestation AC pattern (R22 IMPL MINOR-1 reinforcement). Per-AC test reporting (TAP `ok N`) becomes infeasible. Mismatches with R36/R53/R56/R58 precedent.
- **Risks:** medium — diverges from established test-count + per-AC TAP-reporting discipline.

**Approach C — Runtime JSON-schema validation against a schema literal.** Build a tiny ad-hoc validator (no external lib per W3-4) that checks sample values against a runtime schema description.

- **Strengths:** Tests catch structural drift.
- **Weaknesses:** Requires writing a validator. NEXT-ROLE.md:120 "types and contract shape only" — a validator IS implementation. Inflates scope.
- **Risks:** high — scope creep into implementation.

**Selection rationale:** Approach A. Runtime structural tests with typed sample values give both compile-time (tsc) and runtime (assertions) enforcement; matches R58/R56 precedent; preserves test-count attestation discipline.

### § 0.6 Selection summary

| Axis | Picked | Rejected | Why |
|---|---|---|---|
| § 0.1 File-layout decomposition | A — feed-contract.ts + event-contract.ts + index.ts + README.md | B (single contract.ts), C (namespaces) | Per-direction isolation; matches Wave 10 3B+3C ownership boundary; namespace anti-precedent |
| § 0.2 Wire-format coupling | A — structurally-independent projection | B (re-export engine types), C (generic envelope) | Cross-repo decoupling; preserves contract framing; pinned via contract_version literal |
| § 0.3 HTTP transport metadata | A — interface + `as const` constant | B (interface only), C (constants only) | Dual type-level + value-level enforcement; zero runtime cost |
| § 0.4 Documentation surface | A — README + per-type JSDoc | B (JSDoc only), C (OpenAPI YAML) | Two audiences served; tooling-free; directive-authorized |
| § 0.5 Test architecture | A — runtime structural tests with typed samples | B (type-only), C (JSON-schema validator) | Compile + runtime enforcement; preserves test-count + TAP discipline |

All five picks are independent; no pick contradicts PRD / WAVE-PLAN / NEXT-ROLE directive.

---

## § 1 Design phase (Superpowers — inline; precedes per-file pseudocode)

### § 1.1 Component boundaries

| Symbol | Owner | Lifecycle |
|---|---|---|
| `engine/ds-integration/feed-contract.ts` | NEW Tessera-original | Created this round (R62). Tessera→DS direction. |
| `engine/ds-integration/event-contract.ts` | NEW Tessera-original | Created this round (R62). DS→Tessera direction. |
| `engine/ds-integration/index.ts` | NEW Tessera-original | Barrel; re-exports both contract files. |
| `engine/ds-integration/README.md` | NEW Tessera-original | Human-readable contract documentation. |
| `test/q62-ds-integration-contract.test.ts` | NEW Tessera-original | 13 runtime tests binding AC-R62-1 through AC-R62-9, AC-R62-12 through AC-R62-15. |
| `TesseraToDsFeedRequest` / `TesseraToDsFeedResponse` / `VerdictGroupPayload` / `TesseraToDsAuthHeaders` / `TesseraToDsFeedEndpoint` / `TESSERA_TO_DS_FEED_ENDPOINT` | Owned by `engine/ds-integration/feed-contract.ts` | Exported types + 1 const. |
| `DsToTesseraEventRequest` / `DsToTesseraEventResponse` / `DeployEventPayload` / `DsToTesseraEventEndpoint` / `DS_TO_TESSERA_EVENT_ENDPOINT` | Owned by `engine/ds-integration/event-contract.ts` | Exported types + 1 const. |
| `engine/types/verdict.ts` | READ-ONLY (R56-frozen schema + R58 anti-scope) | Preserved inviolate. A16 literal at `:298` preserved. |
| `engine/events/event-feed.ts` | READ-ONLY (R34 Tessera-original; freeze-hook ClusterEvent source) | Preserved inviolate. Wire-format projection's 5-value `event_class` mirrors this file's `ClusterEventKind`. |
| `engine/events/freeze-hook.ts` | READ-ONLY (R34 Tessera-original) | Preserved inviolate. Wave 10 (3C) integrates with this surface; R62 establishes only the wire-format contract. |

### § 1.2 Data flows + integration points

```
                ┌────────────────────────────────────────────────────────────────┐
                │ Tessera engine (READ-ONLY for R62)                              │
                │                                                                  │
                │ engine/types/verdict.ts:198-231                                  │
                │   interface VerdictGroup {                                       │
                │     group_id, deploy_id, window_start_ts, window_end_ts,         │
                │     cluster_event_id?, ...                                       │
                │   }                                                              │
                │ engine/events/event-feed.ts:10-31                                │
                │   type ClusterEventKind = 'firmware_push' | 'model_redeploy'    │
                │                          | 'env_change' | 'config_change'        │
                │                          | 'capacity_change';                    │
                │   interface ClusterEvent { event_id, kind, event_ts, ... }      │
                └────────────────────────────────────────────────────────────────┘
                                          │ JSDoc cross-reference (no import)
                                          ▼
   ┌────────────────────────────────────────────────────────────────────────┐
   │ engine/ds-integration/ (NEW; R62; Tessera-original)                     │
   │                                                                          │
   │  ┌──────────────────────────────┐    ┌────────────────────────────────┐ │
   │  │ feed-contract.ts             │    │ event-contract.ts              │ │
   │  │ (Tessera → DS direction)     │    │ (DS → Tessera direction)       │ │
   │  │                              │    │                                │ │
   │  │ VerdictGroupPayload          │    │ DeployEventPayload             │ │
   │  │  (projection of VG)          │    │  (projection of ClusterEvent)  │ │
   │  │ TesseraToDsFeedRequest       │    │ DsToTesseraEventRequest        │ │
   │  │ TesseraToDsFeedResponse      │    │ DsToTesseraEventResponse       │ │
   │  │ TesseraToDsAuthHeaders       │    │ DsToTesseraEventEndpoint       │ │
   │  │ TesseraToDsFeedEndpoint      │    │ DS_TO_TESSERA_EVENT_ENDPOINT   │ │
   │  │ TESSERA_TO_DS_FEED_ENDPOINT  │    │                                │ │
   │  └─────────────┬────────────────┘    └─────────────┬──────────────────┘ │
   │                │ export * from         export * from │                    │
   │                ▼                                     ▼                    │
   │              ┌─────────────────────────────────────────┐                  │
   │              │ index.ts (barrel)                       │                  │
   │              └─────────────────────────────────────────┘                  │
   │                                                                          │
   │  README.md (contract overview, version policy, anti-scope, endpoints)    │
   └────────────────────────────────────────────────────────────────────────┘
                                          │ consumed at Wave 10 by:
                                          ▼
                ┌────────────────────────────────────────────────────────────┐
                │ Wave 10 (R63+; NOT R62 scope):                              │
                │  - WU-3B: engine/ds-integration/feed.ts (HTTP client impl)  │
                │  - WU-3C: engine/ds-integration/event-consumer.ts (server)  │
                │  Both import from the R62 contract module.                  │
                └────────────────────────────────────────────────────────────┘
```

### § 1.3 Integration points (verified against R62 PRD/WAVE-PLAN/NEXT-ROLE requirements)

1. **No `import` from `'../types'` or `'../events'` in any R62 contract file.** Per § 0.2 Approach A, the wire-format projections are structurally independent. Verified at spec-emit time via the per-file pseudocode in § 4 — every `import` statement is enumerated; only `import type` from sibling contract files within `engine/ds-integration/` appears (zero cross-boundary imports). Cross-repo decoupling preserved.

2. **A16 wire-format invariant propagation.** `engine/types/verdict.ts:298` declares the load-bearing literal `correlational_not_causal: true` on `TopologyCandidate`. The wire-format projection `VerdictGroupPayload` declares the SAME literal as a required field (`correlational_not_causal: true` literal type). Both must be preserved across the round — engine literal protected by anti-scope (no modification of `engine/types/verdict.ts`); wire-format literal protected by AC-R62-14.

3. **`ClusterEventKind` 5-value closed-set parity.** `engine/events/event-feed.ts:10-15` enumerates 5 values: `'firmware_push' | 'model_redeploy' | 'env_change' | 'config_change' | 'capacity_change'`. The wire-format `DeployEventPayload.event_class` declares the SAME 5-value union. AC-R62-7 binds all 5 values; a future drift (Tessera adds a 6th kind without contract update, or contract adds a 6th value without engine update) would surface either as a tsc error (if 3B/3C code mixes the types) or as a Reviewer cold-eye finding at R63+ rounds. The duplication is acknowledged as a single source-of-divergence risk in § 5.5 D-2.

4. **`VerdictGroupId` format compatibility.** `engine/types/verdict.ts:189-193` declares `VerdictGroupId = string` with format `group-{deploy_id}-{window_start_ts}`. The wire-format `VerdictGroupPayload.group_id` is typed `string` (no template-literal type to keep DS implementations unconstrained on format consumption). JSDoc cross-references the engine format. AC-R62-4 binds a sample value.

5. **Contract version literal pinning.** Both `TesseraToDsFeedRequest.contract_version` and `DsToTesseraEventRequest.contract_version` are typed `'v1'` (literal string type, not `string`). A future v2 contract would introduce a new module OR a discriminated union at this field. AC-R62-4 + AC-R62-6 bind the v1 literal.

### § 1.4 Failure modes at each integration point

| Integration point | Possible failure | R62 mitigation |
|---|---|---|
| Wire-format projection drift | `VerdictGroupPayload` field renamed/removed; engine `VerdictGroup` unchanged → DS reads obsolete shape | AC-R62-1 binds index.ts exports; AC-R62-4 binds the sample shape. Future Tessera evolution of `VerdictGroup` requires deliberate review of `VerdictGroupPayload` — JSDoc cross-reference creates the audit anchor. |
| A16 literal drift | `correlational_not_causal: true` accidentally typed as `boolean` instead of literal `true` | AC-R62-14 binds the literal-type via a sample value AND a substring grep on `feed-contract.ts`. Engine-side preserved by anti-scope item 2 + AC-R62-13. |
| ClusterEventKind drift | Contract adds/removes an `event_class` value out of sync with `engine/events/event-feed.ts` | AC-R62-7 binds all 5 values via type-assignment tests. Reviewer cold-eye verifies parity with `engine/events/event-feed.ts:10-15`. |
| HTTP endpoint literal drift | Path or method changes in interface but not const | AC-R62-9 binds the interface literal AND the const value AND asserts they match. Single source of truth. |
| Cross-boundary import accidentally introduced | A future round (or Implementer fix-up) adds `import { ... } from '../types'` to contract.ts | AC-R62-2 + AC-R62-12 (anti-scope diff) bound to ALLOWED_SET; Reviewer cold-eye reads each contract file's import block. |
| `engine/types/verdict.ts` accidentally modified | Anti-scope violation | AC-R62-12 anti-scope diff excludes verdict.ts from ALLOWED_SET. AC-R62-13 binds `correlational_not_causal: true` literal preservation defensively. |
| `engine/events/event-feed.ts` accidentally modified | Anti-scope violation | AC-R62-12 anti-scope diff excludes event-feed.ts. ClusterEventKind 5-value parity verified via AC-R62-7. |
| Test count drift (unrelated tests added/removed) | Implementer adds tests to other files | AC-R62-10 binds full test-summary; AC-R62-12 anti-scope diff covers test files (only `test/q62-ds-integration-contract.test.ts` permitted). |

### § 1.5 Type-pretest: TS literal-type + `as const` pseudocode (Architect verification)

The following pseudocode documents the Architect's pre-prediction that tsc accepts the prescribed patterns. The Implementer applies these patterns verbatim.

```typescript
// Pattern 1: literal-type discriminator + wire-format projection
export interface VerdictGroupPayload {
  group_id: string;
  // ... fields ...
  correlational_not_causal: true;  // literal type — NOT boolean
}

// Pattern 2: `as const` for endpoint metadata
export const TESSERA_TO_DS_FEED_ENDPOINT = {
  path: '/v1/tessera/verdict-groups',
  method: 'POST',
} as const;

// Pattern 3: type-narrowed interface mirroring `as const` literals
export interface TesseraToDsFeedEndpoint {
  readonly path: '/v1/tessera/verdict-groups';
  readonly method: 'POST';
}
```

**Architect pre-prediction:** tsc exit 0 against the prescribed patterns. Reasoning:
- Literal `true` is a valid type narrowing under TS 5.9 (verified via TS handbook + R56 + R58 precedent at `engine/types/verdict.ts:298`).
- `as const` produces deeply-readonly literal-typed objects; the `as const`-typed value is assignable to the matching interface that declares the same literals as readonly fields.
- No new external types referenced; the contract module is self-contained.

---

## § 2 Mechanism

### § 2.1 Wire-format contract — Tessera → DS feed

**Endpoint:** `POST /v1/tessera/verdict-groups`. Producer: Tessera-side WU-3B implementation (R63+). Consumer: DS-side correlation layer (separate PR per W3-1 Option A).

**Trigger:** Tessera-side WU-3B emits one `TesseraToDsFeedRequest` per closed `VerdictGroup` (one HTTP POST per emission; transport-layer batching out of scope for the contract).

**Request shape:** `TesseraToDsFeedRequest` carries `contract_version: 'v1'`, a `VerdictGroupPayload` (wire-format projection of `VerdictGroup`), and `emitted_at_ts` (Tessera-side emit timestamp, epoch seconds). The auth/identity headers (`TesseraToDsAuthHeaders`) carry `x-tessera-instance-id` (Tessera instance identity) and `authorization` (bearer credential placeholder; specific auth scheme — bearer / HMAC / mTLS — is OUT of scope at R62 and lands at R63+ Wave 10).

**Response shape:** `TesseraToDsFeedResponse` carries `contract_version: 'v1'`, a DS-assigned `correlation_key: string` (DS-side opaque identifier for downstream attribution audit), `status: 'accepted' | 'rejected'` discriminator, and an optional `reason?: string` (populated when status is `'rejected'`).

**Idempotency policy (documented in README):** DS implementations SHOULD treat `(verdict_group.group_id, emitted_at_ts)` as the idempotency key. A retransmission with the same key returns the same `correlation_key`. Idempotency enforcement is the consumer's responsibility — the contract does not mandate it at the type layer.

### § 2.2 Wire-format contract — DS → Tessera event

**Endpoint:** `POST /v1/tessera/deploy-events`. Producer: DS-side event publisher (separate PR per W3-1). Consumer: Tessera-side WU-3C event-consumer (R63+).

**Trigger:** DS emits one `DsToTesseraEventRequest` per cluster-level deploy event (firmware push / model redeploy / env change / config change / capacity change). The 5-value closed-set `event_class` mirrors `engine/events/event-feed.ts:10-15` `ClusterEventKind`.

**Request shape:** `DsToTesseraEventRequest` carries `contract_version: 'v1'`, a `DeployEventPayload` (wire-format projection of `ClusterEvent`), and `emitted_at_ts` (DS-side emit timestamp).

**Response shape:** `DsToTesseraEventResponse` carries `contract_version: 'v1'`, `status: 'accepted' | 'rejected'` discriminator, `freeze_hook_activated: boolean` (Tessera-side outcome — whether the event triggered Phase 2 freeze-hook activation for the matching `cluster_event_id` window), optional `freeze_hook_activated_at_ts?: number` (Tessera-side activation timestamp; absent when status is `'rejected'`), and optional `reason?: string`.

### § 2.3 Contract version policy

- `'v1'` is the initial release. The literal-type pin on `contract_version: 'v1'` (both request types) enforces version identity at the type layer.
- v2 (future) introduces a new contract module path OR a discriminated union over `contract_version`. NOT in R62 scope.
- Removal or renaming of any v1 field is a BREAKING change requiring v2 cutover. Addition of optional fields is BACKWARD-COMPATIBLE within v1 (additive optionals do not break consumers).

### § 2.4 What changes NOT prescribed by this spec

The spec does NOT prescribe:

- Any modification to `engine/types/verdict.ts` (anti-scope item 1).
- Any modification to `engine/events/event-feed.ts` (anti-scope item 2).
- Any modification to `engine/events/freeze-hook.ts` (anti-scope item 3).
- Any HTTP server / client implementation (W3-4 + NEXT-ROLE.md:120 anti-scope).
- Any auth scheme implementation (bearer vs HMAC vs mTLS — all deferred to R63+ Wave 10).
- Any DS-side modification (W3-1 Option A; separate PR).
- Any modification to `engine/topology/*`, `engine/l0/*`, `engine/fleet/*`, `engine/types/*` beyond the new `engine/ds-integration/` subdirectory.

### § 2.5 R56 MINOR-1 halt-condition discipline (carve-out for pre-documented two-state)

Per R56 MINOR-1 + R53 MINOR-1 reinforcement at CLAUDE-ARCHITECT.md: when § 1.4 / § 5 / § 6.1 reference test-count or binding-command attestation, the halt-condition trigger MUST carve out the pre-documented chore-A vs chore-B two-state mismatch (see § 5.4). § 6.1 halt condition #1 below applies this carve-out explicitly.

---

## § 3 Anti-scope + ALLOWED_SET (forward coverage per Rule 4)

### § 3.1 Anti-scope items

1. **NO modification of `engine/types/verdict.ts`.** R56-frozen schema; A16 literal at `:298` preserved structurally by absence of modification + defensively by AC-R62-13.
2. **NO modification of `engine/events/event-feed.ts`.** R34 Tessera-original; `ClusterEventKind` 5-value closed-set referenced by contract via JSDoc cross-reference only (no import).
3. **NO modification of `engine/events/freeze-hook.ts`.** R34 Tessera-original; Wave 10 WU-3C integrates with this surface in a future round.
4. **NO modification of any other `engine/*` file.** R62 ships only NEW files inside `engine/ds-integration/` subdirectory.
5. **NO HTTP server / client / library implementation.** Types + literal constants + documentation only (per W3-4 + NEXT-ROLE.md:120).
6. **NO new external dependencies.** No `openapi-typescript`, no `zod`, no HTTP libraries (per W3-4 Option A + NEXT-ROLE.md:100).
7. **NO DS-repo modification.** W3-1 Option A; DS-side implementation in separate PR after Wave 10.
8. **NO real-cluster work.** Path B inherited (A8/A11).
9. **NO Phase 3 SLICE 3 Wave 10 work** (WU-3B feed.ts; WU-3C event-consumer.ts + freeze-hook extension). R63+ scope.
10. **NO modification of any test file from R01-R58** (Phase 1+2+Phase3 frozen). Only the new `test/q62-ds-integration-contract.test.ts` lands.
11. **NO modification of `coordination/SCOPING-MEMO-v0.3.md`** UNLESS W3-5 opportunistic-close triggers. (At spec-emit time the W3-5 trigger does NOT fire: the contract design naturally lives in `engine/ds-integration/`; no SCOPING-MEMO § 9 or § 2.3 amendment is forced by this round.)
12. **NO modification of `~/.claude/CROSS-PROJECT-MEMORIAL.md`.**
13. **NO modification of `coordination/MEMORIAL-PHASE-*.md`** (R42 frozen shards).
14. **NO modification of `scripts/*` or `run-pipeline.sh`.**
15. **NO modification of `CLAUDE-*.md` REINFORCEMENTS sections.**
16. **NO modification of R42-R60 deliverables** (methodology files, hygiene stamp, candidates inventory, Wave-Plan, etc.).
17. **NO modification of `coordination/PRD.md`** (Option F amendments already landed at `ad6cc6b`).
18. **NO modification of `coordination/WAVE-PLAN-09.md`** (Option F amendment landed at `ad6cc6b`).
19. **NO modification of `coordination/VENDORING-MANIFEST.md`** (no vendored-with-deltas transitions at R62).
20. **NO opening GitHub PRs.**

### § 3.2 ALLOWED_SET (10-path enumeration, forward-coverage per Rule 4)

The chore-A diff `git diff ad6cc6b..<chore-A-SHA> --name-only | sort` MUST be a subset of:

```
coordination/MEMORIAL.md
coordination/NEXT-ROLE.md
coordination/specs/Q-R62-EMPIRICAL.sh
coordination/specs/Q-R62-SPEC-AUDIT.md
coordination/specs/Q-R62-SPEC.md
engine/ds-integration/README.md
engine/ds-integration/event-contract.ts
engine/ds-integration/feed-contract.ts
engine/ds-integration/index.ts
test/q62-ds-integration-contract.test.ts
```

Conditional 11th entry: `coordination/diagnostics/DIAGNOSTIC-R62-*.md` — added IFF a halt fires mid-round and the Implementer writes a DIAGNOSTIC (per § 6.1 halt-condition discipline). Pre-authorized per R25 MAJOR-2 reinforcement (CLAUDE-ARCHITECT.md REINFORCED 2026-05-18: spec-mandated DIAGNOSTIC paths MUST appear in ALLOWED_SET upfront).

### § 3.3 Git-trackability verification

All 10 base ALLOWED_SET paths verified at spec-emit time for git-trackability per R23 ARCH MINOR-2 reinforcement:

- `engine/ds-integration/` — parent directory `engine/` is tracked; NEW subdirectory will be `git add`-able (verified `engine/topology/` precedent for nested directories).
- `engine/ds-integration/README.md` — `*.md` is NOT in `.gitignore` (`.gitignore` excludes `*.js`, `*.js.map`, `*.log`, `*.bak`, `dist/`, `build/`, `coverage/`, etc.); markdown files inside `engine/` are git-trackable.
- `engine/ds-integration/*.ts` — `.ts` files inside `engine/` are git-trackable (precedent across all of `engine/`).
- `test/q62-ds-integration-contract.test.ts` — `test/` is tracked.
- `coordination/specs/Q-R62-SPEC.md` + `Q-R62-SPEC-AUDIT.md` + `Q-R62-EMPIRICAL.sh` — `coordination/specs/` is tracked.
- `coordination/MEMORIAL.md` + `coordination/NEXT-ROLE.md` — tracked.

Sibling `.js` artifacts produced by `tsc -p tsconfig.test.json` (`engine/ds-integration/*.js`, `test/q62-ds-integration-contract.test.js`) are gitignored per `.gitignore: *.js`; they exist on disk after tsc runs but are NOT in `git diff --name-only` output, so they do NOT inflate the diff and do NOT need to appear in ALLOWED_SET.

No `.gitignore` exclusions block any path in the ALLOWED_SET.

---

## § 4 Per-file pseudocode

### § 4.1 `engine/ds-integration/feed-contract.ts` (NEW; ~95 lines)

```typescript
// engine/ds-integration/feed-contract.ts — Phase 3 SLICE 3 WU-Phase3-3A (R62).
//
// Tessera→DS feed contract. Wire-format types + HTTP transport metadata for
// Tessera-side WU-3B (R63+) to send VerdictGroup observations to DS's
// correlation layer.
//
// R62 deliverable: types + literal constants only. No HTTP client; no
// implementation; no auth-scheme decision. Server/client implementation
// lands at Wave 10 (R63+) WU-3B.
//
// Wire-format projection convention: VerdictGroupPayload is a
// structurally-independent projection of `engine/types/verdict.ts:198-231`
// VerdictGroup. The projection does NOT import from '../types' to preserve
// cross-repo decoupling — DS implements the contract against pure type
// definitions without consuming Tessera engine internals (per FR-D4 +
// AC-P9 + Option F re-scoping).
//
// Tessera-original code. Extract target: NONE in R62 (engine npm extract
// DEFERRED per Option F to Phase 4 / dedicated design cycle).

/** Wire-format projection of `VerdictGroup` for DS consumption.
 *
 *  Cross-reference: `engine/types/verdict.ts:198-231` declares the
 *  engine-internal `VerdictGroup`. This projection mirrors the load-bearing
 *  summary subset; engine-internal evolution (additional fields) does NOT
 *  automatically flow to the wire format. Adding a wire-format field is a
 *  deliberate cross-repo contract change. */
export interface VerdictGroupPayload {
  /** Tessera VerdictGroupId; format `group-{deploy_id}-{window_start_ts}`
   *  per `engine/types/verdict.ts:189-193`. DS treats as opaque string. */
  group_id: string;
  /** Tessera deploy identifier. */
  deploy_id: string;
  /** Epoch seconds; first-ingested verdict's timestamp. */
  window_start_ts: number;
  /** Epoch seconds; actual close time or nominal `window_start_ts +
   *  window_seconds`. */
  window_end_ts: number;
  /** Optional cluster-level event correlation id propagated through the
   *  Phase 2 SLICE 1 outer aggregator (R18 schema delta). */
  cluster_event_id?: string;
  /** Count of distinct firing families in the closed VerdictGroup. */
  firing_family_count: number;
  /** `min(1, k / confidence_saturation)` per Addition #25 D3. */
  confidence: number;
  /** Required literal per Addition #26 D4 wire-format invariant.
   *  Mirrors `engine/types/verdict.ts:298`. */
  correlational_not_causal: true;
}

/** Auth/identity headers for the Tessera→DS feed.
 *
 *  R62: structural type only. Specific auth-scheme implementation
 *  (bearer / HMAC / mTLS) lands at R63+ Wave 10 WU-3B. */
export interface TesseraToDsAuthHeaders {
  /** Stable identifier for the Tessera instance emitting this payload. */
  'x-tessera-instance-id': string;
  /** Bearer-token placeholder; auth scheme deferred. */
  authorization: `Bearer ${string}`;
}

/** Top-level request payload sent by Tessera to DS when a VerdictGroup closes. */
export interface TesseraToDsFeedRequest {
  /** Contract version literal; bumped on breaking changes. v1 is initial. */
  contract_version: 'v1';
  /** Per-VerdictGroup observation payload (wire-format projection). */
  verdict_group: VerdictGroupPayload;
  /** Tessera-side emit timestamp (epoch seconds). */
  emitted_at_ts: number;
}

/** DS-side response after consuming a Tessera→DS feed request. */
export interface TesseraToDsFeedResponse {
  contract_version: 'v1';
  /** DS-assigned opaque identifier for downstream attribution audit. */
  correlation_key: string;
  /** Acceptance discriminator. */
  status: 'accepted' | 'rejected';
  /** Populated when `status === 'rejected'`. */
  reason?: string;
}

/** HTTP transport metadata pin (interface form — type-level). */
export interface TesseraToDsFeedEndpoint {
  readonly path: '/v1/tessera/verdict-groups';
  readonly method: 'POST';
}

/** HTTP transport metadata pin (const form — runtime-accessible literal). */
export const TESSERA_TO_DS_FEED_ENDPOINT = {
  path: '/v1/tessera/verdict-groups',
  method: 'POST',
} as const;
```

### § 4.2 `engine/ds-integration/event-contract.ts` (NEW; ~90 lines)

```typescript
// engine/ds-integration/event-contract.ts — Phase 3 SLICE 3 WU-Phase3-3A (R62).
//
// DS→Tessera deploy-event contract. Wire-format types + HTTP transport
// metadata for DS-side (separate PR after Wave 10) to send deploy events
// that Tessera's freeze-hook (`engine/events/freeze-hook.ts`) consumes.
//
// R62 deliverable: types + literal constants only. No HTTP server; no
// implementation. Server-side handler and freeze-hook integration land at
// Wave 10 (R63+) WU-3C.
//
// Wire-format projection convention: DeployEventPayload is a
// structurally-independent projection of `engine/events/event-feed.ts:17-31`
// ClusterEvent. The 5-value closed-set `event_class` mirrors
// `engine/events/event-feed.ts:10-15` ClusterEventKind by JSDoc reference;
// the contract DOES NOT import the engine type to preserve cross-repo
// decoupling.
//
// Tessera-original code.

/** Wire-format projection of `ClusterEvent` for Tessera consumption.
 *
 *  Cross-reference: `engine/events/event-feed.ts:17-31` declares the
 *  engine-internal `ClusterEvent`. The `event_class` 5-value union mirrors
 *  `engine/events/event-feed.ts:10-15` `ClusterEventKind` — parity audit is
 *  the Reviewer's responsibility (single source-of-divergence risk; see
 *  § 5.5 D-2). */
export interface DeployEventPayload {
  /** Event identifier; stable across DS retries; used as
   *  `cluster_event_id` downstream in Tessera's freeze-hook flow. */
  event_id: string;
  /** Closed-set 5 event classes. Mirrors `engine/events/event-feed.ts:10-15`
   *  ClusterEventKind. */
  event_class:
    | 'firmware_push'
    | 'model_redeploy'
    | 'env_change'
    | 'config_change'
    | 'capacity_change';
  /** Epoch seconds when the event occurred (point-shaped) or began
   *  (interval-shaped; event_window_end_ts populated). */
  event_ts: number;
  /** Optional; interval-shaped events set this to the end of the event
   *  window. Absent → point-shaped event. */
  event_window_end_ts?: number;
  /** Optional caller-supplied metadata; not used by Tessera consumer logic
   *  at R62 contract layer. */
  metadata?: Record<string, string>;
}

/** Top-level request payload sent by DS to Tessera when a deploy event fires. */
export interface DsToTesseraEventRequest {
  contract_version: 'v1';
  /** Per-event payload. */
  event: DeployEventPayload;
  /** DS-side emit timestamp (epoch seconds). */
  emitted_at_ts: number;
}

/** Tessera-side response after consuming a DS→Tessera event. */
export interface DsToTesseraEventResponse {
  contract_version: 'v1';
  /** Acceptance discriminator. */
  status: 'accepted' | 'rejected';
  /** Whether the event activated Tessera's Phase 2 freeze-hook for the
   *  matching (cluster_event_id, window). */
  freeze_hook_activated: boolean;
  /** Tessera-side activation timestamp (epoch seconds). Present when
   *  `freeze_hook_activated === true` and `status === 'accepted'`. */
  freeze_hook_activated_at_ts?: number;
  /** Populated when `status === 'rejected'`. */
  reason?: string;
}

/** HTTP transport metadata pin (interface form — type-level). */
export interface DsToTesseraEventEndpoint {
  readonly path: '/v1/tessera/deploy-events';
  readonly method: 'POST';
}

/** HTTP transport metadata pin (const form — runtime-accessible literal). */
export const DS_TO_TESSERA_EVENT_ENDPOINT = {
  path: '/v1/tessera/deploy-events',
  method: 'POST',
} as const;
```

### § 4.3 `engine/ds-integration/index.ts` (NEW; ~10 lines)

```typescript
// engine/ds-integration/index.ts — Phase 3 SLICE 3 WU-Phase3-3A (R62) barrel.
//
// Single import surface for the DS integration interface contract. Both
// directions (Tessera→DS feed; DS→Tessera event) are re-exported from this
// barrel. Tessera-side WU-3B + WU-3C (R63+) import the contract types from
// this path; DS-side (separate PR after Wave 10) implements against the
// same shape independently.

export * from './feed-contract';
export * from './event-contract';
```

### § 4.4 `engine/ds-integration/README.md` (NEW; ~80 lines)

The README MUST contain (in order) the following section headers AS LITERAL strings (each must appear exactly once; anchored at line start with `## ` prefix for AC-R62-3 discriminability):

```
# Tessera ↔ DeploySignal integration contract — v1 (R62)

This document is the human-readable description of the DS integration
interface contract. The TypeScript source-of-truth lives in
`feed-contract.ts` (Tessera→DS direction) and `event-contract.ts`
(DS→Tessera direction). The contract is types + HTTP transport metadata
only; no implementation. Server/client implementation lands at Phase 3
SLICE 3 Wave 10 (R63+) — `WU-3B` (Tessera→DS feed client) + `WU-3C`
(DS→Tessera event consumer + freeze-hook real-event activation).

## Tessera → DS feed

Endpoint: `POST /v1/tessera/verdict-groups`

Tessera-side WU-3B emits one `TesseraToDsFeedRequest` per closed
VerdictGroup (one HTTP POST per emission; transport-layer batching is out
of scope for the contract). The request carries a `VerdictGroupPayload`
(wire-format projection of `engine/types/verdict.ts:198-231` VerdictGroup),
a contract version literal `'v1'`, and a Tessera-side emit timestamp. The
response carries a DS-assigned `correlation_key`, a status discriminator
(`'accepted' | 'rejected'`), and an optional rejection reason.

Idempotency: DS implementations SHOULD treat `(verdict_group.group_id,
emitted_at_ts)` as the idempotency key. A retransmission with the same
key returns the same `correlation_key`. Enforcement is the consumer's
responsibility — the contract does not mandate it at the type layer.

## DS → Tessera event

Endpoint: `POST /v1/tessera/deploy-events`

DS emits one `DsToTesseraEventRequest` per cluster-level deploy event. The
5-value `event_class` closed-set (`'firmware_push' | 'model_redeploy' |
'env_change' | 'config_change' | 'capacity_change'`) mirrors
`engine/events/event-feed.ts:10-15` ClusterEventKind; cross-repo parity
audit is the Reviewer's responsibility. The response carries a status
discriminator, a `freeze_hook_activated` boolean (Tessera-side outcome),
and an optional activation timestamp + rejection reason.

## Versioning

The contract version literal is pinned at type level on every request:
`contract_version: 'v1'`. A future v2 contract introduces a new module
path OR a discriminated union over `contract_version`. Removal or
renaming of any v1 field is a BREAKING change requiring v2 cutover.
Addition of optional fields is BACKWARD-COMPATIBLE within v1.

## Anti-scope (R62)

The R62 round delivers TYPES + LITERAL CONSTANTS + DOCUMENTATION only. The
following are explicitly out of scope and land at later rounds:

- HTTP server / client implementation (Wave 10: WU-3B + WU-3C).
- Auth scheme implementation (bearer / HMAC / mTLS — deferred).
- DS-repo modification (separate PR per Coordinator W3-1 Option A).
- npm package extract (DEFERRED per Option F to Phase 4 / dedicated
  design cycle).
- Real-cluster integration (Path B inherited).
```

### § 4.5 `test/q62-ds-integration-contract.test.ts` (NEW; ~220 lines)

The test file imports the contract module via the barrel, declares typed sample values that exercise the wire-format shape, and asserts:

```typescript
// test/q62-ds-integration-contract.test.ts — R62 contract verification.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import { execSync } from 'node:child_process';

import {
  // feed-contract.ts exports
  type VerdictGroupPayload,
  type TesseraToDsAuthHeaders,
  type TesseraToDsFeedRequest,
  type TesseraToDsFeedResponse,
  type TesseraToDsFeedEndpoint,
  TESSERA_TO_DS_FEED_ENDPOINT,
  // event-contract.ts exports
  type DeployEventPayload,
  type DsToTesseraEventRequest,
  type DsToTesseraEventResponse,
  type DsToTesseraEventEndpoint,
  DS_TO_TESSERA_EVENT_ENDPOINT,
} from '../engine/ds-integration';

// ───────────────────────────────────────────────────────────────────────
// AC-R62-1: barrel exports the named symbols
// ───────────────────────────────────────────────────────────────────────
test('AC-R62-1: index.ts exports all 11 contract symbols (2 consts + 9 types via barrel)', () => {
  // The 2 runtime constants must be importable as values (typeof === 'object').
  assert.strictEqual(typeof TESSERA_TO_DS_FEED_ENDPOINT, 'object');
  assert.strictEqual(typeof DS_TO_TESSERA_EVENT_ENDPOINT, 'object');
  // The 9 interface types are erased at runtime; verifying their export
  // presence is tsc's responsibility (AC-R62-11). Compile success of the
  // 9 `type` imports above proves the type exports exist.
});

// ───────────────────────────────────────────────────────────────────────
// AC-R62-2: contract files exist with at least one exported interface each
// ───────────────────────────────────────────────────────────────────────
test('AC-R62-2: feed-contract.ts + event-contract.ts exist with exported interfaces', () => {
  const feedSrc = fs.readFileSync('engine/ds-integration/feed-contract.ts', 'utf-8');
  const eventSrc = fs.readFileSync('engine/ds-integration/event-contract.ts', 'utf-8');
  const feedInterfaceCount = (feedSrc.match(/^export interface /gm) || []).length;
  const eventInterfaceCount = (eventSrc.match(/^export interface /gm) || []).length;
  assert.strictEqual(feedInterfaceCount, 5,
    `feed-contract.ts expected 5 exported interfaces; found ${feedInterfaceCount}`);
  assert.strictEqual(eventInterfaceCount, 4,
    `event-contract.ts expected 4 exported interfaces; found ${eventInterfaceCount}`);
});

// ───────────────────────────────────────────────────────────────────────
// AC-R62-3: README.md exists with required section headers
// ───────────────────────────────────────────────────────────────────────
test('AC-R62-3: README.md contains exactly 4 anchored section headers', () => {
  const src = fs.readFileSync('engine/ds-integration/README.md', 'utf-8');
  // Each header must appear anchored at line start with `## ` prefix exactly once.
  const headers = [
    '## Tessera → DS feed',
    '## DS → Tessera event',
    '## Versioning',
    '## Anti-scope (R62)',
  ];
  for (const h of headers) {
    const escaped = h.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`^${escaped}$`, 'gm');
    const matches = src.match(re) || [];
    assert.strictEqual(matches.length, 1,
      `README.md header '${h}' expected exactly 1 match; found ${matches.length}`);
  }
});

// ───────────────────────────────────────────────────────────────────────
// AC-R62-4: TesseraToDsFeedRequest sample has required v1 fields + A16 literal
// ───────────────────────────────────────────────────────────────────────
test('AC-R62-4: TesseraToDsFeedRequest sample exhibits v1 + A16 + projection fields', () => {
  const sample: TesseraToDsFeedRequest = {
    contract_version: 'v1',
    verdict_group: {
      group_id: 'group-deploy-A-1700000000',
      deploy_id: 'deploy-A',
      window_start_ts: 1700000000,
      window_end_ts: 1700000300,
      cluster_event_id: 'event-firmware-push-42',
      firing_family_count: 2,
      confidence: 0.5,
      correlational_not_causal: true,
    },
    emitted_at_ts: 1700000305,
  };
  assert.strictEqual(sample.contract_version, 'v1');
  assert.strictEqual(sample.verdict_group.correlational_not_causal, true);
  assert.strictEqual(typeof sample.verdict_group.group_id, 'string');
  assert.strictEqual(typeof sample.verdict_group.deploy_id, 'string');
  assert.strictEqual(typeof sample.verdict_group.window_start_ts, 'number');
  assert.strictEqual(typeof sample.verdict_group.window_end_ts, 'number');
  assert.strictEqual(typeof sample.verdict_group.firing_family_count, 'number');
  assert.strictEqual(typeof sample.verdict_group.confidence, 'number');
  assert.strictEqual(typeof sample.emitted_at_ts, 'number');
});

// ───────────────────────────────────────────────────────────────────────
// AC-R62-5: cluster_event_id is optional + typed string when present
// ───────────────────────────────────────────────────────────────────────
test('AC-R62-5: VerdictGroupPayload.cluster_event_id is optional string', () => {
  const without: VerdictGroupPayload = {
    group_id: 'group-deploy-B-1700000100',
    deploy_id: 'deploy-B',
    window_start_ts: 1700000100,
    window_end_ts: 1700000400,
    firing_family_count: 0,
    confidence: 0,
    correlational_not_causal: true,
  };
  assert.strictEqual(without.cluster_event_id, undefined);
  const withId: VerdictGroupPayload = { ...without, cluster_event_id: 'event-X' };
  assert.strictEqual(typeof withId.cluster_event_id, 'string');
  assert.strictEqual(withId.cluster_event_id, 'event-X');
});

// ───────────────────────────────────────────────────────────────────────
// AC-R62-6: DsToTesseraEventRequest sample exhibits v1 + closed-set kind
// ───────────────────────────────────────────────────────────────────────
test('AC-R62-6: DsToTesseraEventRequest sample exhibits v1 + closed-set discriminator', () => {
  const sample: DsToTesseraEventRequest = {
    contract_version: 'v1',
    event: {
      event_id: 'event-deploy-42',
      event_class: 'firmware_push',
      event_ts: 1700000000,
    },
    emitted_at_ts: 1700000001,
  };
  assert.strictEqual(sample.contract_version, 'v1');
  assert.strictEqual(sample.event.event_class, 'firmware_push');
  assert.strictEqual(typeof sample.event.event_id, 'string');
  assert.strictEqual(typeof sample.event.event_ts, 'number');
  assert.strictEqual(sample.event.event_window_end_ts, undefined);
});

// ───────────────────────────────────────────────────────────────────────
// AC-R62-7: all 5 ClusterEventKind values are assignable to event_class
// ───────────────────────────────────────────────────────────────────────
test('AC-R62-7: DeployEventPayload.event_class accepts all 5 ClusterEventKind values', () => {
  const kinds: Array<DeployEventPayload['event_class']> = [
    'firmware_push',
    'model_redeploy',
    'env_change',
    'config_change',
    'capacity_change',
  ];
  assert.strictEqual(kinds.length, 5);
  // Each value is assignable to a sample DeployEventPayload (compile-time check).
  for (const k of kinds) {
    const sample: DeployEventPayload = {
      event_id: `event-${k}-test`,
      event_class: k,
      event_ts: 1700000000,
    };
    assert.strictEqual(sample.event_class, k);
  }
});

// ───────────────────────────────────────────────────────────────────────
// AC-R62-8: status discriminator union covers exactly 'accepted' | 'rejected'
// ───────────────────────────────────────────────────────────────────────
test('AC-R62-8: response status discriminator accepts both literal values in both directions', () => {
  const feedAccepted: TesseraToDsFeedResponse = {
    contract_version: 'v1',
    correlation_key: 'corr-1',
    status: 'accepted',
  };
  const feedRejected: TesseraToDsFeedResponse = {
    contract_version: 'v1',
    correlation_key: 'corr-2',
    status: 'rejected',
    reason: 'duplicate',
  };
  const eventAccepted: DsToTesseraEventResponse = {
    contract_version: 'v1',
    status: 'accepted',
    freeze_hook_activated: true,
    freeze_hook_activated_at_ts: 1700000010,
  };
  const eventRejected: DsToTesseraEventResponse = {
    contract_version: 'v1',
    status: 'rejected',
    freeze_hook_activated: false,
    reason: 'malformed-payload',
  };
  assert.strictEqual(feedAccepted.status, 'accepted');
  assert.strictEqual(feedRejected.status, 'rejected');
  assert.strictEqual(eventAccepted.status, 'accepted');
  assert.strictEqual(eventAccepted.freeze_hook_activated, true);
  assert.strictEqual(eventRejected.status, 'rejected');
  assert.strictEqual(eventRejected.freeze_hook_activated, false);
});

// ───────────────────────────────────────────────────────────────────────
// AC-R62-9: endpoint interface + const match (path + method literal pinning)
// ───────────────────────────────────────────────────────────────────────
test('AC-R62-9: endpoint constants match interface literal types in both directions', () => {
  const feedEp: TesseraToDsFeedEndpoint = TESSERA_TO_DS_FEED_ENDPOINT;
  const eventEp: DsToTesseraEventEndpoint = DS_TO_TESSERA_EVENT_ENDPOINT;
  assert.strictEqual(feedEp.path, '/v1/tessera/verdict-groups');
  assert.strictEqual(feedEp.method, 'POST');
  assert.strictEqual(eventEp.path, '/v1/tessera/deploy-events');
  assert.strictEqual(eventEp.method, 'POST');
});

// ───────────────────────────────────────────────────────────────────────
// AC-R62-12: anti-scope diff at chore-A ⊆ ALLOWED_SET (10 paths)
// ───────────────────────────────────────────────────────────────────────
test('AC-R62-12: round-start-to-chore-A diff ⊆ R62 allowed-set (chore-A SHA pinned)', () => {
  const ROUND_START = 'ad6cc6b';
  const CHORE_A_SHA = '<INJECTED-AT-CHORE-B>'; // Implementer replaces at chore-B
  if (CHORE_A_SHA === '<INJECTED-AT-CHORE-B>') {
    assert.fail('CHORE_A_SHA placeholder not injected — chore-B SHA backfill required');
  }
  const ALLOWED = [
    'coordination/MEMORIAL.md',
    'coordination/NEXT-ROLE.md',
    'coordination/specs/Q-R62-EMPIRICAL.sh',
    'coordination/specs/Q-R62-SPEC-AUDIT.md',
    'coordination/specs/Q-R62-SPEC.md',
    'engine/ds-integration/README.md',
    'engine/ds-integration/event-contract.ts',
    'engine/ds-integration/feed-contract.ts',
    'engine/ds-integration/index.ts',
    'test/q62-ds-integration-contract.test.ts',
  ];
  const out = execSync(`git diff ${ROUND_START}..${CHORE_A_SHA} --name-only`, { encoding: 'utf-8' })
    .split('\n').filter(s => s.length > 0).sort();
  const allowedSet = new Set(ALLOWED);
  const diagnosticRe = /^coordination\/diagnostics\/DIAGNOSTIC-R62-.*\.md$/;
  for (const p of out) {
    if (!allowedSet.has(p) && !diagnosticRe.test(p)) {
      assert.fail(`Unauthorized path in chore-A diff: ${p}`);
    }
  }
});

// ───────────────────────────────────────────────────────────────────────
// AC-R62-13: A16 — engine/types/verdict.ts retains 'correlational_not_causal: true' literal
// ───────────────────────────────────────────────────────────────────────
test('AC-R62-13: engine/types/verdict.ts retains correlational_not_causal:true literal (A16 defensive)', () => {
  const src = fs.readFileSync('engine/types/verdict.ts', 'utf-8');
  // Discriminating: match on the field-declaration line shape (literal-type
  // annotation `: true`), not just substring presence. The shape pins the
  // type-level invariant; a future regression demoting `: true` → `: boolean`
  // would still match a bare substring but fails this regex.
  const re = /^\s*correlational_not_causal:\s*true\s*;/m;
  assert.match(src, re,
    'engine/types/verdict.ts must declare correlational_not_causal as literal-type true');
});

// ───────────────────────────────────────────────────────────────────────
// AC-R62-14: A16 propagation — feed-contract.ts declares correlational_not_causal:true literal
// ───────────────────────────────────────────────────────────────────────
test('AC-R62-14: feed-contract.ts propagates correlational_not_causal:true literal (A16)', () => {
  const src = fs.readFileSync('engine/ds-integration/feed-contract.ts', 'utf-8');
  const re = /^\s*correlational_not_causal:\s*true\s*;/m;
  assert.match(src, re,
    'feed-contract.ts must declare correlational_not_causal as literal-type true');
});

// ───────────────────────────────────────────────────────────────────────
// AC-R62-15: chore-A-to-HEAD diff empty (forward-protection per R36/R53/R56/R58)
// ───────────────────────────────────────────────────────────────────────
test('AC-R62-15: chore-A-to-HEAD diff is empty (forward-protection)', () => {
  const CHORE_A_SHA = '<INJECTED-AT-CHORE-B>'; // Implementer replaces at chore-B
  if (CHORE_A_SHA === '<INJECTED-AT-CHORE-B>') {
    assert.fail('CHORE_A_SHA placeholder not injected — chore-B SHA backfill required');
  }
  const out = execSync(`git diff ${CHORE_A_SHA}..HEAD --name-only`, { encoding: 'utf-8' })
    .split('\n').filter(s => s.length > 0);
  assert.deepStrictEqual(out, [],
    `chore-A..HEAD diff expected empty; found: ${JSON.stringify(out)}`);
});
```

**Test count:** 13 runtime `test()` blocks (AC-R62-1 through AC-R62-9 + AC-R62-12 through AC-R62-15). AC-R62-10 (test summary) and AC-R62-11 (tsc exit) are binding-command attestations verified by `Q-R62-EMPIRICAL.sh`, not runtime tests.

### § 4.6 TACTICAL AUTONOMY clauses

The Implementer MAY:
- Adjust JSDoc wording without changing field semantics or type shapes.
- Add or omit blank lines / minor formatting consistent with the surrounding codebase style.
- Reorder `import` statements within standard ordering rules (Node std-lib → third-party → local).
- Rename test-local variable names (e.g., `sample` → `req` if clearer) without changing assertion shape.

The Implementer MAY NOT:
- Change any wire-format field name or type without HALT + DIAGNOSTIC (would violate the contract surface).
- Add new imports from `engine/types/*` or `engine/events/*` to the contract files (would defeat cross-repo decoupling per § 0.2 Approach A).
- Remove the A16 literal `correlational_not_causal: true` from `VerdictGroupPayload`.
- Modify the 5-value `event_class` closed-set to add/remove values.
- Skip the chore-A SHA injection for AC-R62-12 / AC-R62-15 placeholders.

### § 4.7 RED commit + GREEN commit ordering (R23 IMPL MINOR-1 reinforcement)

Implementer creates two commits at chore-A in this order:

1. **RED commit:** `test/q62-ds-integration-contract.test.ts` lands with `assert.fail('R62 RED — implementation pending')` stubs for all 13 test blocks; `engine/ds-integration/*.ts` files do NOT exist yet (test imports fail at module-resolution layer). `node --test test/q62-ds-integration-contract.test.js` fails because the test file's `.js` companion does not yet exist OR fails because the imported module is missing. Either failure mode is acceptable as RED.
2. **GREEN commit:** `engine/ds-integration/` complete (feed-contract.ts + event-contract.ts + index.ts + README.md); `test/q62-ds-integration-contract.test.ts` body replaces all `assert.fail` stubs with real assertions per § 4.5. `npx tsc -p tsconfig.test.json` runs to produce `.js` artifacts. `node --test` shows 11 of the 13 R62 tests pass and 2 fail at chore-A by construction (AC-R62-12 + AC-R62-15 placeholder SHA). Total chore-A summary: `412/405/4/3`. After chore-B SHA injection, all 13 R62 tests pass; chore-B summary: `412/407/2/3`.

The Implementer's chore-A summary attestation in NEXT-ROLE.md MUST cite the actual `node --test` summary at chore-A (`412/405/4/3`) — NOT the post-chore-B predicted value (`412/407/2/3`).

---

## § 5 Acceptance criteria

### § 5.1 Preamble

R62 ships 15 ACs total: 13 are bound to runtime tests in `test/q62-ds-integration-contract.test.ts` (AC-R62-1 through AC-R62-9 + AC-R62-12 through AC-R62-15); 2 are binding-command attestations verified by `Q-R62-EMPIRICAL.sh` (AC-R62-10 + AC-R62-11). The classification is consistent across § 4.5 (runtime test prescription), § 5.2 (AC table below), and Q-R62-EMPIRICAL.sh (attestation harness). Per R20 ARCH MINOR-1: every § 5 row's binding-type matches its § 4.x prescription.

### § 5.2 AC table

| AC | Given / When / Then | Binding | Type |
|---|---|---|---|
| **AC-R62-1** | Given the new `engine/ds-integration/` subdirectory, when `engine/ds-integration/index.ts` is loaded via barrel import, then both runtime constants (`TESSERA_TO_DS_FEED_ENDPOINT`, `DS_TO_TESSERA_EVENT_ENDPOINT`) are importable as objects AND all 9 named TypeScript types are import-resolvable (proven by tsc exit 0 against the test file's `type` imports). | test/q62:36-43 | runtime |
| **AC-R62-2** | Given the contract module structure, when `engine/ds-integration/feed-contract.ts` and `engine/ds-integration/event-contract.ts` are read, then feed-contract.ts has exactly 5 lines starting with `export interface ` AND event-contract.ts has exactly 4 lines starting with `export interface `. | test/q62:48-56 | runtime |
| **AC-R62-3** | Given the contract documentation, when `engine/ds-integration/README.md` is read, then it contains exactly 4 line-anchored section headers: `## Tessera → DS feed`, `## DS → Tessera event`, `## Versioning`, `## Anti-scope (R62)` (each exactly once). | test/q62:61-77 | runtime |
| **AC-R62-4** | Given a `TesseraToDsFeedRequest` sample with all required fields populated, when its fields are inspected at runtime, then `contract_version === 'v1'`, `verdict_group.correlational_not_causal === true`, AND every required field has the expected runtime `typeof` (`string` for IDs, `number` for timestamps). | test/q62:82-104 | runtime |
| **AC-R62-5** | Given a `VerdictGroupPayload` sample without `cluster_event_id` AND a copy with `cluster_event_id: 'event-X'`, when each is inspected, then the first has `cluster_event_id === undefined` AND the second has `cluster_event_id === 'event-X'` (typed `string`). | test/q62:109-122 | runtime |
| **AC-R62-6** | Given a `DsToTesseraEventRequest` sample, when its fields are inspected, then `contract_version === 'v1'`, `event.event_class === 'firmware_push'`, `event.event_id` has `typeof === 'string'`, `event.event_ts` has `typeof === 'number'`, AND optional `event_window_end_ts === undefined` when omitted. | test/q62:127-140 | runtime |
| **AC-R62-7** | Given each of the 5 `ClusterEventKind` discriminator values (`'firmware_push'`, `'model_redeploy'`, `'env_change'`, `'config_change'`, `'capacity_change'`), when each is assigned to a `DeployEventPayload.event_class` field, then the assignment compiles AND the array of 5 values has `length === 5`. | test/q62:145-162 | runtime |
| **AC-R62-8** | Given each of the 2 response status discriminator values (`'accepted'`, `'rejected'`) for both `TesseraToDsFeedResponse` AND `DsToTesseraEventResponse`, when sample values are constructed for each, then the literal status discriminator equals the assigned value AND, for the event response, `freeze_hook_activated === true` when status is `'accepted'` AND `freeze_hook_activated === false` when status is `'rejected'` (in the sample as constructed). | test/q62:167-198 | runtime |
| **AC-R62-9** | Given `TESSERA_TO_DS_FEED_ENDPOINT` and `DS_TO_TESSERA_EVENT_ENDPOINT` constants assigned to their respective endpoint interface types, when `.path` and `.method` are inspected, then `TESSERA_TO_DS_FEED_ENDPOINT.path === '/v1/tessera/verdict-groups'`, `DS_TO_TESSERA_EVENT_ENDPOINT.path === '/v1/tessera/deploy-events'`, AND both `.method === 'POST'`. | test/q62:203-213 | runtime |
| **AC-R62-10** | Given the toolchain state at chore-A SHA, when `node --test --test-reporter=tap test/*.test.js` runs, then the test summary equals `412/405/4/3` at chore-A (AC-R62-12 + AC-R62-15 each fail by construction due to placeholder SHA → 2 R62-placeholder fails + 2 R36 forward-protection fails = 4 fails total) AND equals `412/407/2/3` at chore-B post-SHA-injection (both AC-R62-12 + AC-R62-15 pass; only the 2 R36 forward-protection fails remain). Per R53 MINOR-1 + R56 MINOR-1 two-state reinforcement; AC-R62-12 and AC-R62-15 each fail by construction at chore-A but their failures resolve via the same chore-B SHA injection (1 SHA replacement, 2 placeholder-bound test blocks → 2 simultaneous pass transitions). | Q-R62-EMPIRICAL.sh AC-R62-10 block | binding-command |
| **AC-R62-11** | Given the toolchain state at chore-A SHA, when `npx tsc -p tsconfig.test.json` runs, then exit code = 0 AND zero diagnostics emitted. | Q-R62-EMPIRICAL.sh AC-R62-11 block | binding-command |
| **AC-R62-12** | Given chore-A SHA (CHORE_A_SHA injected at chore-B), when `git diff ad6cc6b..<CHORE_A_SHA> --name-only` runs, then the output is a subset of the 10-path ALLOWED_SET plus the conditional 11th `DIAGNOSTIC-R62-*.md` regex carve-out. | test/q62:218-241 | runtime |
| **AC-R62-13** | Given `engine/types/verdict.ts` at chore-A, when read, then the regex `/^\s*correlational_not_causal:\s*true\s*;/m` matches (A16 defensive — literal-type declaration preserved). | test/q62:246-255 | runtime |
| **AC-R62-14** | Given `engine/ds-integration/feed-contract.ts` at chore-A, when read, then the regex `/^\s*correlational_not_causal:\s*true\s*;/m` matches (A16 propagation — wire-format projection preserves the literal). | test/q62:260-267 | runtime |
| **AC-R62-15** | Given chore-A SHA (CHORE_A_SHA injected at chore-B), when `git diff <CHORE_A_SHA>..HEAD --name-only` runs, then the output is an empty array (forward-protection per R36/R53/R56/R58 precedent — chore-B SHA backfill is the ONLY post-chore-A modification; if any other path appears, an unauthorized post-chore-A modification has been introduced). | test/q62:272-281 | runtime |

### § 5.3 Branch-binding coverage table (R21 ARCH MINOR-2/3)

R62 deliverable is a TYPES + LITERALS module. There are zero runtime production branches (no `if`, no `switch`, no early return paths). Branch-binding coverage applies to:

- **Discriminator literal unions:** every named literal value in the contract is bound by an AC.
  - `contract_version: 'v1'` (4 occurrences across request/response types) — AC-R62-4 + AC-R62-6 + AC-R62-8.
  - `status: 'accepted' | 'rejected'` (2 occurrences, 2 values each = 4 literal sites) — AC-R62-8 binds both values in both directions.
  - `event_class` 5-value closed-set — AC-R62-7 binds all 5 values.
  - `correlational_not_causal: true` literal — AC-R62-4 + AC-R62-13 (engine) + AC-R62-14 (contract).
  - HTTP method `'POST'` (2 occurrences) — AC-R62-9 binds both.
  - HTTP path literals (`'/v1/tessera/verdict-groups'`, `'/v1/tessera/deploy-events'`) — AC-R62-9 binds both.
- **Optional field presence/absence:**
  - `cluster_event_id?` — AC-R62-5 binds both undefined and string-present states.
  - `event_window_end_ts?` — AC-R62-6 binds the undefined state.
  - `freeze_hook_activated_at_ts?` — AC-R62-8 binds the present (status=accepted) state.
  - `reason?` — AC-R62-8 binds the present (status=rejected) state.
- **Interface ↔ const matching:** AC-R62-9 binds the interface-vs-const equivalence for both endpoints.
- **Anti-scope branches:** AC-R62-12 binds the diff ⊆ ALLOWED_SET property; AC-R62-15 binds the chore-A-to-HEAD empty-diff forward protection.

No structurally-unreachable code in prescribed pseudocode. Every declared discriminator value, optional field, and literal pin has at least one binding AC.

### § 5.4 Test-count attestation (chore-A vs chore-B two-state)

Per R53 MINOR-1 + R56 MINOR-1 reinforcement, the spec carves out the pre-documented two-state mismatch from the halt trigger in § 6.1.

| State | Test summary | AC-R62-10 status | AC-R62-12 status | AC-R62-15 status | tsc exit |
|---|---|---|---|---|---|
| Round-start `ad6cc6b` (pre-R62) | 399/394/2/3 | N/A | N/A | N/A | 0 |
| Chore-A (SHA-placeholder state) | **412/405/4/3** | FAIL (mismatches chore-B prediction) | FAIL (placeholder SHA) | FAIL (placeholder SHA) | 0 |
| Chore-B (post-SHA-injection) | **412/407/2/3** | PASS | PASS | PASS | 0 |

The +13 tests = 13 new R62 runtime tests in `test/q62-ds-integration-contract.test.ts`. At chore-A, AC-R62-12 and AC-R62-15 EACH fail because their `CHORE_A_SHA` literal is the placeholder `<INJECTED-AT-CHORE-B>` (not a valid git ref → `assert.fail` fires in each test block). Pass count at chore-A = baseline 394 + 11 R62 tests that pass (AC-R62-1 through AC-R62-9, AC-R62-13, AC-R62-14) = 405. Fail count = baseline 2 (R36 forward-protection) + 2 R62 placeholder = 4. Both placeholders are resolved by a single chore-B SHA injection, so the chore-A→chore-B transition is a single replacement that lifts both ACs to PASS simultaneously (pass count goes from 405 → 407; fail count goes from 4 → 2). AC-R62-10 (test summary) similarly transitions PASS at chore-B because the predicted summary `412/407/2/3` matches the post-injection state.

**Why both AC-R62-12 and AC-R62-15 share the placeholder rather than only one:** the precedent at R58 used one placeholder-bound test (AC-R58-14). R62 splits the anti-scope-diff property into two ACs because (i) AC-R62-12 binds the round-start-to-chore-A coverage (the historical guarantee), and (ii) AC-R62-15 binds the chore-A-to-HEAD coverage (the forward-protection guarantee per R36 precedent). Two distinct properties → two ACs. Each individually fails at chore-A by construction; both pass simultaneously at chore-B.

### § 5.5 Honest-broker disclosures

- **D-1 — Wire-format projection duplication risk.** `VerdictGroupPayload` and `DeployEventPayload` are structural projections of engine internals (`VerdictGroup` + `ClusterEvent`). Engine evolution that intends to flow to the wire format requires deliberate contract update. JSDoc cross-references at every projection interface document this responsibility (§ 0.2 Approach A explicit).
- **D-2 — `ClusterEventKind` parity risk.** The 5-value `event_class` closed-set in `event-contract.ts` mirrors `engine/events/event-feed.ts:10-15`. If a future Tessera round adds a 6th `ClusterEventKind` without updating the contract, the engine type and wire-format type silently diverge. Mitigation: AC-R62-7 binds all 5 wire-format values; Reviewer cold-eye verifies parity at every relevant round. Compile-time mismatch surfaces in 3B/3C implementations that cast between types.
- **D-3 — Auth-scheme deferral.** `TesseraToDsAuthHeaders.authorization` is typed `` `Bearer ${string}` `` — the template-literal type narrows to bearer-token shape syntactically but does NOT validate or enforce a specific auth scheme (bearer/HMAC/mTLS choice is OUT of scope at R62 per W3-4 + § 2.1). R63+ Wave 10 WU-3B may switch to a different scheme; a v2 contract would re-shape this field.
- **D-4 — A16 substring-marker non-discrimination at the engine layer.** AC-R62-13 uses the regex `/^\s*correlational_not_causal:\s*true\s*;/m` against `engine/types/verdict.ts`. This is line-anchored and binds the literal-type declaration; per R56 MINOR-2 precedent, line-anchoring + literal-type-suffix (`: true`) is structurally discriminating (a regression demoting `: true` to `: boolean` fails the regex). AC-R62-14 uses the same regex against `feed-contract.ts` for the same discriminability property.
- **D-5 — README section-header discriminability.** AC-R62-3 anchors README section presence via `^## ...$` regex with exact-match-count = 1 per header. Generic substring keywords ("Versioning", "Anti-scope") would be incidentally-satisfiable (R41 MINOR-3/4 precedent); anchoring to `^## ` prefix + exact section text fixes the discriminability.
- **D-6 — TACTICAL AUTONOMY scope per R58 precedent.** Implementer permitted to adjust JSDoc wording / blank lines / variable names without HALT; not permitted to change field names, type shapes, the A16 literal, or the 5-value closed-set without HALT + DIAGNOSTIC. Bounded autonomy per CLAUDE-IMPLEMENTER.md § TACTICAL AUTONOMY.

### § 5.6 Self-confirming test risk (R41 derived rule sweep)

Per cross-project rule `self-confirming-test-assertion-specificity` (CROSS-PROJECT-MEMORIAL.md:3569; derived at R41 with 3+ instances threshold), substring markers used in AC bindings must uniquely identify their target.

- AC-R62-3 anchors to line-start with `^## ` prefix + exact section text + exact-match-count = 1. Discriminating: a section deletion produces match count 0; an accidental duplicate produces count 2. Both fail the AC. Not incidentally-satisfiable.
- AC-R62-13 + AC-R62-14 use line-anchored regex with literal-type suffix `: true`. Discriminating: a demotion to `boolean` would fail (regex requires literal `true` token); a comment-only mention `// correlational_not_causal: true` would NOT match (regex anchors to `^\s*` then the field name, not `^\s*//`). Per R56 MINOR-2 disclosure: the inherited engine-side literal at `engine/types/verdict.ts:298` is the only line in that file that matches this regex (verified at session entry via `grep -nE '^\s*correlational_not_causal:\s*true\s*;' engine/types/verdict.ts` → returns 1 line: `298:    correlational_not_causal: true;`). The JSDoc reference at `:281` does NOT match because it lacks the literal-type-suffix `: true;` shape.
- AC-R62-2 uses `^export interface ` line-anchor with exact count. Discriminating: future addition of a 6th `export interface ` to feed-contract.ts would fail the count check; future deletion would also fail.

---

## § 6 Halt conditions + post-route discipline

### § 6.1 Halt conditions (Implementer)

The Implementer HALTs and writes a DIAGNOSTIC (sets `STATUS: ESCALATE` in NEXT-ROLE.md) when any of the following fire:

1. **Q-R62-EMPIRICAL.sh exits non-zero at chore-A for any reason OTHER THAN the pre-documented AC-R62-10 / AC-R62-12 / AC-R62-15 two-state mismatch (placeholder SHA fails).** Per R56 MINOR-1 carve-out — the chore-A failures of these three ACs are documented in § 5.4 + § 4.5 test placeholder code + Q-R62-EMPIRICAL.sh AC blocks AND are resolved by the single chore-B SHA injection. They are NOT halt triggers.
2. **`npx tsc -p tsconfig.test.json` exits non-zero.** R62 inherits a clean tsc surface (exit 0); any regression introduced by the contract module is a halt condition. Resolution path: identify which prescribed pseudocode pattern tsc rejects; write DIAGNOSTIC with bounded options (e.g., A: adjust spec pseudocode; B: declaration-merging fallback; C: accept tsc error if it's a known TS 5.9 quirk with workaround).
3. **Any binding-command result CONTRADICTS the AC literal text** (Rule 1 `false-compliance-attestation` sub-class `empirical-command-attestation` per CROSS-PROJECT-MEMORIAL.md). Examples: tsc exits with diagnostics but ACTUAL exit code 0 (TS quirk); test summary deviates from predicted 412/406/3/3 at chore-A or 412/407/2/3 at chore-B for reasons other than the documented placeholder SHA failures. Resolution: encode the ACTUAL observed value verbatim in NEXT-ROLE.md attestation; do NOT reframe as compliance.
4. **Spec-vs-reality conflict mid-implementation.** Example: TypeScript rejects the literal-type field declaration; OR the projection interface declared in § 4 doesn't compile due to a circular import that's not visible at spec-emit time; OR cited engine line numbers (`engine/types/verdict.ts:298`, `engine/events/event-feed.ts:10-15`) have shifted (Implementer must `grep` to confirm). Halt + DIAGNOSTIC + bounded options (per Rule 6 `halt-discipline-no-DIAGNOSTIC-for-workaround`).
5. **Anti-scope diff at chore-A includes a path outside ALLOWED_SET.** Resolution: identify the path; if it's a legitimate scope expansion, write DIAGNOSTIC + ESCALATE for spec amendment (per R36 MAJOR-2 reinforcement — NEVER expand ALLOWED_SET in-test to absorb a deviation).
6. **An R61-class architectural-reality discovery** (Architect spec § 0.x premise is empirically false at Implementer time). Example: the contract type module structurally cannot be self-contained because some required projection field has no engine-side analogue. Per R61 ESCALATE precedent: HALT + DIAGNOSTIC + ESCALATE; surface bounded options; await operator decision.
7. **Phase 1+2+Phase3-SLICE-1+2 regressions.** Any pre-R62 test other than the R36 forward-protection guards (AC-R36-30 + AC-R36-31) regresses from PASS to FAIL. Halt + DIAGNOSTIC.

### § 6.2 Reviewer cold-eye discipline (post-route)

Reviewer at the Reviewer session re-runs:
1. `git rev-parse HEAD` to confirm SHA boundaries (round-start `ad6cc6b`, chore-A as attested, HEAD as chore-B post-injection).
2. `npx tsc -p tsconfig.test.json` independently — exit must = 0.
3. `node --test test/*.test.js` independently — summary must = `412/407/2/3` post-chore-B.
4. `bash coordination/specs/Q-R62-EMPIRICAL.sh` independently — all checks PASS.
5. `git diff ad6cc6b..HEAD --name-only` — confirm exactly 10 paths in ALLOWED_SET (or 11 with DIAGNOSTIC if halt fired).
6. Read each of the 4 new `engine/ds-integration/` files end-to-end — verify zero imports from `'../types'` / `'../events'` / cross-boundary engine paths.
7. Audit AC parity: every AC row in § 5.2 has its prescribed binding (runtime test OR Q-R62-EMPIRICAL.sh block) AND that binding actually exists in code.
8. Right-reasons audit of ≥ 3 ACs with adversarial counterfactuals (per CLAUDE-REVIEWER.md mandate).

---

## § 7 Cross-project rule enumeration (SPEC-AUTHORING-CHECKLIST.md Rule 7 Surface (a))

Per the canonical rule list at `~/.claude/CROSS-PROJECT-MEMORIAL.md`:

- **Rule 1 (`false-compliance-attestation`, canonical at :3478 region; `empirical-command-attestation` sub-class landed R46):** ACTIVE GATE. Q-R62-EMPIRICAL.sh runs at chore-A and produces verbatim binding-command output; the chore-A two-state mismatch is pre-documented (§ 5.4) and carved out from the halt trigger (§ 6.1 #1). Implementer attestation in NEXT-ROLE.md MUST encode ACTUAL observed values, not memorized spec text.
- **Rule 2 (`branch-binding-coverage-gate`, canonical at :3107; CLAUDE-COMMON.md REINFORCED 2026-05-17):** ACTIVE GATE. § 5.3 enumerates every discriminator literal, optional field state, and interface-vs-const matching; each has at least one binding AC. No structurally-unreachable code in prescribed pseudocode.
- **Rule 3 (`implementer-spec-test-assertion-coverage`, canonical at :3223 + R30 MINOR-1):** ACTIVE GATE. Per § 5.6: every test assertion uses discriminating patterns (line-anchored regex with literal-type suffix; exact-match-count = N; exact equality on literal values; `typeof === 'string'`/`'number'` instead of `length >= 0`).
- **Rule 4 (`anti-scope-allowed-set-forward-coverage`, canonical at :3347):** ACTIVE GATE. § 3.2 enumerates the 10-path ALLOWED_SET at spec-emit time. The spec is committed BEFORE the Implementer's RED commit (per R21 ARCH MINOR-1). Conditional 11th DIAGNOSTIC path pre-authorized per R25 MAJOR-2.
- **Rule 5 (`rule-derivation-without-self-application`, canonical at :3293+):** N/A — R62 does not derive a new cross-project rule. (R61 surfaced an Architect spec-emit-time empirical-verification gap that is currently 1st-tessera-instance; below 3-instance derivation threshold per CROSS-PROJECT-MEMORIAL.md convention.)
- **Rule 6 (`halt-discipline-no-DIAGNOSTIC-for-workaround`, canonical at :3375):** ACTIVE GATE. § 6.1 halt conditions enumerated; carve-out for pre-documented two-state mismatch per R56 MINOR-1. Spec-vs-reality conflict mid-implementation → HALT + DIAGNOSTIC + bounded options + ESCALATE.
- **Rule 7 (`derived-rule-propagation-mechanism-required`, canonical at :3478; Surface (a) SPEC-AUTHORING-CHECKLIST.md; Surface (b) `scripts/pre-commit-rule-sweep.sh`):** ACTIVE GATE per Surface (a) — this enumeration IS the active surface. Surface (b) the pre-commit script will run against the chore-A diff if the Implementer invokes it locally (not auto-fired). Surface (c) N/A no new rule derived.

---

## § 8 Open questions

**None — all resolved.**

The R61 ESCALATE #2 → Option F resolution at NEXT-ROLE.md § Operator resolution dispositioned all upstream architectural decisions:
- W3-1 (DS-side scope): RESOLVED Option A — Tessera-only design.
- W3-2 (file layout): RESOLVED NEW FORMULATION — `engine/ds-integration/` subdirectory inside Tessera repo.
- W3-3 (file convention): RESOLVED Coordinator default A/A — `engine/ds-integration/*` is the primary location.
- W3-4 (external deps): RESOLVED Option A — no new external dependencies.
- W3-5 (SCOPING-MEMO amendment): RESOLVED Option A opportunistic — at spec-emit time the W3-5 trigger does NOT fire (no natural touch of SCOPING-MEMO § 9 / § 2.3 from this round's deliverable).

The 5 § 0 brainstorm axes each have a single picked approach with rejected alternatives documented; no Architect-side ambiguity remains.

---

## § 9 P3 ten-axis verification

| Axis | One-sentence verification |
|---|---|
| **Correctness** | Wire-format projection types declare exact field name/type shape matching engine internals (per § 1.3 + § 4.1–§ 4.2); A16 literal `correlational_not_causal: true` preserved at both engine and contract layers; tsc exit 0 prescribed; 13 runtime test bindings exercise every literal value and optional state. |
| **Completeness** | All 15 ACs bind a verifiable property (binding column in § 5.2); every discriminator literal in § 5.3 has at least one binding AC; § 6.1 halt conditions enumerate 7 distinct failure modes covering empirical, tsc, contradiction, spec-vs-reality, anti-scope, R61-class, and regression cases. |
| **Consistency** | Cross-section consistency executed for: `'v1'` literal (5 sites: § 2.1, § 2.2, § 2.3, § 4.1, § 4.2, AC-R62-4 + AC-R62-6); ALLOWED_SET 10 paths (3 sites: § 3.2, § 4.5 test literal, Q-R62-EMPIRICAL.sh); 5-value `event_class` enum (4 sites: § 1.3, § 2.2, § 4.2, AC-R62-7); test count `412/406/3/3` chore-A + `412/407/2/3` chore-B (4 sites: § 4.7, § 5.2 AC-R62-10, § 5.4 table, Q-R62-EMPIRICAL.sh); A16 literal regex `/^\s*correlational_not_causal:\s*true\s*;/m` (3 sites: AC-R62-13 + AC-R62-14 in test, § 5.6 D-4); round-start SHA `ad6cc6b` (3 sites: spec preamble, § 3.2, § 4.5 test literal). |
| **Clarity** | No ambiguous language ("correctly", "appropriately", "as needed") in any AC; every AC uses "Given X, when Y, then Z" with concrete inputs and outputs; § 4 pseudocode includes exact import statements + exact type declarations; § 6.1 halt conditions include resolution paths for each trigger. |
| **Coverage** | 13 runtime tests + 2 binding-command attestations = 15 ACs covering: 9 structural type/literal pins, 1 anti-scope diff, 1 A16 engine preservation, 1 A16 contract propagation, 1 forward-protection, 1 test count, 1 tsc exit. Every prescribed file in § 4 has at least one binding AC; every § 5.3 discriminator/literal has at least one binding AC. |
| **Constraints** | A8/A11 (no real-cluster) inherited; A12 (vendored-at-pin engine internals) preserved by absence of modification to `engine/types/*`, `engine/events/*`, `engine/topology/*`, etc.; A16 preserved at both layers; A17 partially rescinded for SLICE 3 per WAVE-PLAN-09 (DS integration in scope at type-only level); W3-4 no-external-deps honored (zero new dependencies). |
| **Concurrency** | N/A — types-only deliverable with no runtime concurrency surface. Pure compile-time type declarations + literal constants; no async paths, no shared state, no race conditions. |
| **Corner cases** | Optional field absent vs present (cluster_event_id, event_window_end_ts, reason, freeze_hook_activated_at_ts) — each bound by an AC; literal-type vs boolean (correlational_not_causal: true vs boolean) — bound by regex shape; missing endpoint constant import — would fail tsc; 6th ClusterEventKind silently added — caught by AC-R62-7 count + Reviewer parity audit. |
| **Cost** | ~95 + 90 + 10 + 80 LoC = ~275 LoC across 4 new contract files; ~220 LoC test file; ~600 LoC spec + audit + empirical script. Diff size modest (10 paths in ALLOWED_SET). tsc surface unchanged (no new dependencies). |
| **Coupling** | Zero `import` from `'../types'` / `'../events'` / cross-boundary engine paths in any contract file (§ 1.3 #1 verified at spec-emit time + AC-R62-12 anti-scope diff bound at chore-A). Contract module is structurally self-contained except for sibling imports within `engine/ds-integration/`. Test file imports the barrel as a single point of contact. |

---

## § 10 Pre-emit grilling (Superpowers Review phase — inline)

### § 10.1 Adversarial self-review questions

**Q1: Is every claim in the spec verifiable?**

YES. Every line citation has been grep-verified or Read-verified at session-entry HEAD `ad6cc6b`:
- `engine/types/verdict.ts:189-193` (VerdictGroupId format) — verified via Read at session entry.
- `engine/types/verdict.ts:198-231` (VerdictGroup body) — verified via Read.
- `engine/types/verdict.ts:298` (A16 literal) — verified via Read.
- `engine/events/event-feed.ts:10-15` (ClusterEventKind 5-value) — verified via Read.
- `engine/events/event-feed.ts:17-31` (ClusterEvent body) — verified via Read.
- `engine/events/freeze-hook.ts:1-51` (freeze-hook surface) — verified via Read.
- Cross-project rule canonical landings at CROSS-PROJECT-MEMORIAL.md:3107/3223/3293/3347/3375/3478/3569 — grep-verified at session entry.
- ALLOWED_SET path git-trackability — verified via `.gitignore` check.
- Empirical baseline (`399/394/2/3`, tsc exit 0) — verified via direct command runs at session entry.

**Q2: Are there any unstated assumptions?**

NO. Surfaced explicitly:
- TS 5.9 supports `as const` + literal-type fields (cited TS handbook + R58 precedent).
- `engine/*` permits `.md` files (precedent absent but directive-authorized; verified via `ls engine/**/*.md` empty at session entry — first time; surfaced as § 4.4 explicit).
- The 5-value `ClusterEventKind` is the complete closed-set (verified at engine/events/event-feed.ts:10-15).
- The `chore-A vs chore-B two-state` pattern is established by R53/R56/R58 precedent (cited).

**Q3: Is any scope added beyond the request?**

NO. Verified:
- The 4 new files + 1 test + 3 spec artifacts + 2 routing artifacts = 10 paths exactly. Matches the directive's enumeration at NEXT-ROLE.md:96-110.
- Anti-scope items 1-20 enumerate every avoided surface (engine types, events, freeze-hook, HTTP impl, auth, DS-repo, real-cluster, etc.).
- The contract types align with the directive's enumeration: (a) Tessera→DS request/response/headers/correlation-key (§ 4.1) + (b) DS→Tessera request/response/freeze-hook-activation (§ 4.2). No additional types invented.
- HTTP transport metadata (path + method) is the minimal additional pin needed for "interface contract"; literal-constants only, no client/server.

**Q4: Can the Implementer act without guessing?**

YES. Verified:
- Every type field has explicit JSDoc semantics + type literal in § 4 pseudocode.
- Every test block has exact assertions in § 4.5.
- Every AC has explicit Given/When/Then in § 5.2 with binding location.
- TACTICAL AUTONOMY clauses in § 4.6 enumerate what's MAY-vary vs MUST-NOT-vary.
- Halt conditions in § 6.1 enumerate 7 distinct trigger states with resolution paths.
- No ambiguous language in any AC (every Then-clause is verifiable).

### § 10.2 Reinforcement sweep (10 most-recent cross-project + Tessera-local lessons)

| Lesson | Application in this spec |
|---|---|
| R61 OBS (spec-emit-time empirical verification per Architect) | All load-bearing premises verified at session entry via direct command runs (tsc, node --test, git rev-parse, grep of file:line citations). Documented per-citation in § 10.1 Q1. |
| R58 MINOR-1 (constructor-options symbol drift) | N/A for R62 — no constructor calls in pseudocode. Field-name verification still applied: all type field names grep-verified against engine internals at session entry. |
| R58 MINOR-3 (post-MOD line citation drift) | N/A for R62 — no inline MOD insertions. All new files; no line-range drift risk. |
| R58 MINOR-2 (non-discriminating sparse-data assertion) | Every AC assertion is discriminating (§ 5.6 explicit). No `length >= 0` patterns; line-anchored regex with literal-type suffix used for substring-presence checks. |
| R56 MINOR-1 (halt-condition pre-documented carve-out) | § 6.1 halt condition #1 explicitly carves out AC-R62-10 / AC-R62-12 / AC-R62-15 two-state pre-documented failures from the halt trigger. |
| R53 MINOR-1 (chore-A vs chore-B test-count two-state) | § 5.4 explicit two-state table; AC-R62-10 row in § 5.2 explicitly annotates the SHA boundary; Q-R62-EMPIRICAL.sh AC-R62-10 block predicts the chore-B value with chore-A FAIL pre-documented. |
| R47 / R49 (line-citation cite-then-verify) | Every cited file:line in this spec verified via Read or grep at session entry HEAD `ad6cc6b`; § 10.1 Q1 enumerates the verifications. |
| R41 / R36 (self-confirming substring markers) | § 5.6 explicit. Every substring marker uses line-anchored regex + exact-match-count = N; no generic keyword markers. |
| R20 ARCH MINOR-1 (AC-table preamble cross-check) | § 5.1 preamble matches § 5.2 binding column matches § 4.5 prescription (13 runtime + 2 binding-command). Cross-check executed inline. |
| R21 ARCH MINOR-1 (spec-commit-sequencing) | This spec + Q-R62-SPEC-AUDIT.md + Q-R62-EMPIRICAL.sh will be committed in a single dedicated commit BEFORE the Implementer's RED commit per chore-A sequencing discipline. |

### § 10.3 Cross-section consistency table

| Token | Sites | Consistent? |
|---|---|---|
| `'v1'` contract version | § 2.1 + § 2.2 + § 2.3 + § 4.1 (4 occurrences in feed-contract) + § 4.2 (3 occurrences in event-contract) + § 4.4 README + AC-R62-4 + AC-R62-6 + AC-R62-8 | YES — `'v1'` literal throughout |
| ALLOWED_SET 10 paths | § 3.2 + § 4.5 test literal (lines 226–235) + Q-R62-EMPIRICAL.sh AC-R62-12 advisory block | YES — byte-identical 10-path list |
| 5-value ClusterEventKind | § 1.3 + § 2.2 + § 4.2 pseudocode + § 4.4 README + AC-R62-7 test array | YES — same 5 values in same order |
| `correlational_not_causal: true` literal | § 1.3 + § 2.1 + § 4.1 pseudocode + § 4.4 README + AC-R62-4 + AC-R62-13 + AC-R62-14 regex + § 5.3 + § 5.6 D-4 | YES — same literal-type declaration |
| HTTP path `/v1/tessera/verdict-groups` | § 2.1 + § 4.1 (2 occurrences: interface + const) + § 4.4 README + AC-R62-9 | YES |
| HTTP path `/v1/tessera/deploy-events` | § 2.2 + § 4.2 (2 occurrences) + § 4.4 README + AC-R62-9 | YES |
| Test count chore-A `412/405/4/3` | § 4.7 RED/GREEN ordering + § 5.2 AC-R62-10 row + § 5.4 table + Q-R62-EMPIRICAL.sh AC-R62-10 block comment | YES (corrected from `412/406/3/3` at audit-emit time per Q-R62-SPEC-AUDIT § 3.1 + § 6.1; original prediction missed that AC-R62-12 + AC-R62-15 are TWO placeholder-bound test blocks, not one) |
| Test count chore-B `412/407/2/3` | § 4.7 + § 5.2 AC-R62-10 row + § 5.4 table + Q-R62-EMPIRICAL.sh AC-R62-10 block | YES |
| Round-start SHA `ad6cc6b` | Spec preamble + § 3.2 ALLOWED_SET base + § 4.5 test literal + Q-R62-EMPIRICAL.sh round-start | YES |
| 13 runtime tests + 2 binding-command ACs = 15 total | § 4.5 test count + § 5.1 preamble + § 5.2 binding column | YES |
| 10-path ALLOWED_SET + 1 conditional DIAGNOSTIC | § 3.2 + § 4.5 test (allowed-set + regex carve-out) + § 5.2 AC-R62-12 row | YES |

No contradictions surfaced. Per R01 cross-section consistency reinforcement.

### § 10.4 Pre-route checklist

- [x] Every line citation Read- or Grep-verified at session-entry HEAD `ad6cc6b`.
- [x] Empirical baseline verified via direct command runs (NOT inherited from prior round attestation).
- [x] ALLOWED_SET 10-path enumeration + 1 conditional DIAGNOSTIC carve-out.
- [x] Cross-project Rules 1-7 enumerated with active/N-A dispositions in § 7.
- [x] § 6.1 halt conditions carve out pre-documented two-state mismatch (R56 MINOR-1).
- [x] § 5.4 explicit chore-A vs chore-B two-state table (R53 MINOR-1).
- [x] Every AC has discriminating binding (§ 5.6; R41-derived rule sweep).
- [x] Branch-binding coverage table at § 5.3 enumerates every literal/optional/discriminator.
- [x] Cross-section consistency pass at § 10.3.
- [x] § 0 brainstorm 5 axes × 3 approaches each + selection rationale.
- [x] § 1 Design phase: component boundaries + integration points + failure modes.
- [x] All open questions resolved (§ 8 explicit "None").
- [x] AC-table preamble (§ 5.1) cross-checked against § 5.2 binding column (R20 ARCH MINOR-1).
- [x] Honest-broker disclosures enumerated (§ 5.5).
- [x] No scope beyond NEXT-ROLE.md:96-110 directive (§ 10.1 Q3).
- [x] Implementer can act without guessing (§ 10.1 Q4).

---

## § 11 Pipeline invocation

```bash
cd /Users/johnwarren/concord/tessera
./run-pipeline.sh --round R62 --tier full
```

Inputs the next role (IMPLEMENTER) consumes:
- `coordination/specs/Q-R62-SPEC.md` (this file)
- `coordination/specs/Q-R62-SPEC-AUDIT.md` (Architect ceremony sidecar)
- `coordination/specs/Q-R62-EMPIRICAL.sh` (chore-A verification harness)
- `coordination/NEXT-ROLE.md` § R62 Round-scope directive

The Implementer's chore-A sequence:
1. RED commit: test stubs + assert.fail bodies (per § 4.7).
2. GREEN commit: 4 contract files + complete test bodies (per § 4.5).
3. Run Q-R62-EMPIRICAL.sh; encode ACTUAL chore-A summary (`412/405/4/3`) verbatim in NEXT-ROLE.md attestation.
4. Chore-B: inject chore-A SHA into AC-R62-12 + AC-R62-15 placeholders; re-run tests (post-injection summary `412/407/2/3`); SHA-backfill commit.
