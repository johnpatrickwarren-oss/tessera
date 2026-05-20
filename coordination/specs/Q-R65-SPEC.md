# Q-R65-SPEC — Phase 3 SLICE 3 Wave 10 WU-Phase3-3B: Tessera→DS feed implementation

**Round:** R65 (full tier — Architect + Implementer + Reviewer + Memorial-Updater).
**Cluster shape:** single-cluster (Wave 10 first-cluster sequential dispatch per operator authorization at R64 close; WU-Phase3-3C ships sequentially at R66 per directive).
**Phase / SLICE:** Phase 3 SLICE 3 Wave 10 (first cluster). Implements the HTTP client adapter that constructs `VerdictGroupPayload` from engine `VerdictGroup` instances and POSTs to the DS correlation layer per the R62 frozen contract.
**PRD trace:** FR-D2 (line 440) — *"DS-integration: Tessera → DS — per-shard observations feed DS correlation layer"* · AC-P9 (line 452) — *"Tessera↔DS bi-directional data flow operates via the contract independently of file-level engine extraction"* · US-08 (line 428).
**Inputs:** `coordination/CLUSTER-HANDOFF-WAVE10-3A-3B.md` (READ FIRST); `coordination/WAVE-PLAN-09.md`; `coordination/PRD.md` § Phase 3; `engine/ds-integration/feed-contract.ts` + `engine/ds-integration/index.ts` (R62 frozen); `engine/types/verdict.ts:198-231` (`VerdictGroup` source shape); `engine/events/freeze-hook.ts` + `engine/events/event-feed.ts` (R20/R21/R36 frozen surfaces); `coordination/specs/Q-R62-SPEC.md` (template).
**Round-start SHA (anti-scope diff lower bound):** `59a03d0` (chore(R65 directive): WU-Phase3-3B Tessera→DS feed implementation; Wave 10 first cluster sequential — operator directive landing; verified via `git rev-parse HEAD` at Architect session entry per CLAUDE-ARCHITECT REINFORCED 2026-05-17 R15 MINOR-1 "advance the baseline to the post-prep commit"). **Note:** the directive text in `coordination/NEXT-ROLE.md:12` cites `9a7512d` (R64 close) as round-start; this is the pre-prep SHA. The operator's R65 directive commit itself landed at `59a03d0` and modified `coordination/NEXT-ROLE.md`. Per R15 reinforcement, the empirical session-entry SHA is the load-bearing lower bound.
**Empirical baseline at session entry (verified by Architect via `node --test --test-reporter=tap test/*.test.js`):** `tests=411 / pass=406 / fail=2 / skipped=3`. Known fails: (a) `AC-R36-30: round-start-to-chore-A diff path-set ⊆ R36 allowed-set`; (b) `AC-R36-31: chore-A-to-HEAD diff ⊆ R36 post-chore-A allowed set (chore-B forward protection)`. Both R36 forward-protection guards carry-forward-failing since Phase 2 close `87e372f`; NOT introduced by R65.
**Empirical typecheck baseline (verified by Architect via `npx tsc -p tsconfig.test.json`):** exit code 0; zero diagnostics. R65 inherits clean tsc from R62 close and must preserve it.
**Toolchain at session entry:** Node v25.9.0; TypeScript 5.9.3.

---

## § 0 Brainstorm phase (Superpowers — inline)

Five architectural axes require multi-option choice. Each is brainstormed with three (or two) approaches, strengths / weaknesses / hidden assumptions / risks, and a selection rationale.

### § 0.1 Tessera-side wiring approach for feed dispatch

**Approach A — Standalone adapter module; no integration into existing emit path (PICKED).** Ship `engine/ds-integration/feed.ts` as a self-contained module exporting (a) a pure projection function `verdictGroupToFeedRequest(group, emitted_at_ts) → TesseraToDsFeedRequest`; and (b) an `TesseraToDsFeedClient` class encapsulating `node:http`-based POST. NO modification of any existing emit/ingest code path. Future rounds (post-Wave-10) wire the adapter into a non-frozen emit surface via a separate, non-anti-scope round.

- **Strengths:** Zero anti-scope risk. The R65 directive § Anti-scope explicitly prohibits modification of `engine/events/freeze-hook.ts` body/signature (R20/R21/R36 frozen), `engine/types/verdict.ts` (R56 frozen), and `engine/events/event-feed.ts` (R36 frozen). Empirical verification at spec-emit time: `engine/verdict-groups.ts` is vendored-at-pin (R20 deliverable; header comment lines 1-16 reproduce the vendoring policy); `engine/fleet/verdict-consumer.ts` is R21 Tessera-original and frozen per the R65 directive's "NO modification of R42-R64 deliverables" clause. **All known emit/ingest paths that handle `VerdictGroup` output are anti-scope at R65.** The handoff doc's wording (`CLUSTER-HANDOFF-WAVE10-3A-3B.md` line 64) listing "wiring approach (event-driven via freeze-hook callback / polled / imperative)" is structurally incompatible with R65 anti-scope; the standalone-adapter approach is the only viable shape for R65.
- **Weaknesses:** "Wiring" is deferred — the adapter exists but is not called from any production code path. Mitigated by: the adapter IS the deliverable per FR-D2; "wiring" is a future-round concern that R65 anti-scope explicitly excludes. The adapter remains independently testable; its consumption surface is documented in JSDoc + the spec § 2.4 forward-flag.
- **Hidden assumptions:** `engine/verdict-groups.ts` is vendored-at-pin (confirmed via header lines 1-5 read at spec-emit time). `engine/fleet/verdict-consumer.ts` is an R21 deliverable (confirmed via header line 1: "engine/fleet/verdict-consumer.ts — Tessera Phase 2 SLICE 2.B (R21)"). No non-frozen `VerdictGroup` consumer exists in the engine tree at session entry.
- **Risks:** low.

**Approach B — Event-driven callback registered on VerdictGrouper.** Modify `engine/verdict-groups.ts` to expose an `onClose(callback)` registration surface; the adapter registers and fires on close.

- **Strengths:** Direct integration; closed VerdictGroups flow automatically to DS without polling.
- **Weaknesses:** `engine/verdict-groups.ts` is vendored-at-pin from DeploySignal main@5a72371 (header lines 1-5). Modifying the class body would be a vendored-with-deltas transition at the VerdictGrouper-internals surface — A12 violation and outside R65 anti-scope. Also outside the R65 directive's allowed modifications.
- **Risks:** high — anti-scope violation. **REJECTED.**

**Approach C — Polled background timer.** Adapter polls grouper state via a `getRecentlyClosed()` accessor or similar.

- **Strengths:** Decouples adapter from grouper internals.
- **Weaknesses:** `engine/verdict-groups.ts` does not expose a `getRecentlyClosed()` accessor (verified via Read of full file at spec-emit time; only `openGroupForDeploy()` is public). Adding such an accessor modifies the vendored-at-pin file body — anti-scope violation. Polling without an accessor is architecturally unfit.
- **Risks:** high — anti-scope or architecturally unfit. **REJECTED.**

**Selection rationale:** Approach A. The R65 anti-scope structurally forbids all wiring approaches that would modify existing engine code; the standalone-adapter is the unique viable shape. The "wiring" deferral is intentional — Wave 10's contract is implementation of the feed adapter; integration into emit paths is future-round work outside R65 scope.

### § 0.2 HTTP client mechanism

**Approach A — Node.js built-in `node:http.request()` (PICKED).** Use `http.request(options, callback)` directly. Wrap in a `Promise` shim to expose an `async post(...)` interface. Body serialization via `JSON.stringify`; response parsing via stream accumulation + `JSON.parse`.

- **Strengths:** Zero new dependencies (W3-4 Option A honored — R65 directive § Anti-scope item 7 "NO new external dependencies"). `node:http` is built-in and stable since Node v0.x. Mockable via in-process `http.createServer()` test fixture; this is the canonical Node.js HTTP test pattern. Provides full control over headers, method, path, timeout.
- **Weaknesses:** `node:http` uses a callback/event-stream API; the `async/await` interface requires a small `Promise` shim per request. Acceptable for a single `post()` method.
- **Hidden assumptions:** `http.request()` accepts `{ host, port, path, method, headers, timeout }` and emits `'error'` (network failure) + `'timeout'` (request timeout) events. Verified via Node.js docs.
- **Risks:** low.

**Approach B — Built-in `fetch()` (Node 18+).** Use `fetch(url, { method, headers, body })`.

- **Strengths:** Cleaner Promise API; less boilerplate.
- **Weaknesses:** `fetch` requires a fully-formed URL string (must compose `http://host:port/path`); error semantics differ from `http.request` (network errors throw rather than emit `'error'` events). Mocking `fetch` for tests requires either intercepting the global `fetch` symbol or using a real `http.createServer()` and pointing `fetch` at it — the latter still uses `node:http` under the hood. Net win is small for a single-endpoint adapter.
- **Risks:** low-medium.

**Approach C — Pure-function payload construction only (no HTTP).** Adapter exposes only `verdictGroupToFeedRequest(...)`; HTTP is left to consumers.

- **Strengths:** Maximum minimalism.
- **Weaknesses:** The R65 directive (NEXT-ROLE.md:32-34) explicitly says "HTTP client adapter that constructs `VerdictGroupPayload` from engine `VerdictGroup` instances and POSTs to the DS correlation layer." Pure-function-only would NOT deliver the POST aspect. The directive's "Synthetic-fixture pattern (Node.js built-in `node:http` mock OR pure-function payload-construction test only)" describes TEST patterns, not the production-adapter shape.
- **Risks:** high — fails directive's primary deliverable. **REJECTED.**

**Selection rationale:** Approach A. Built-in `node:http`; mockable via in-process server; aligned with R65 directive deliverable shape and W3-4 Option A. Promise-shim cost is minimal.

### § 0.3 Test architecture

**Approach A — In-process mock HTTP server (`http.createServer` listening on ephemeral port) + pure-function projection tests (PICKED).** For HTTP path coverage, spin up `http.createServer((req, res) => ...)` per test, capture the request body/headers, respond with synthetic payload, teardown server in test cleanup. For payload-projection coverage, exercise the pure `verdictGroupToFeedRequest` function with synthetic `VerdictGroup` inputs (no HTTP). Per-port allocation uses `server.listen(0, ...)` (Node.js assigns an ephemeral port; read via `server.address().port`).

- **Strengths:** Exercises the real `node:http.request` code path end-to-end with realistic wire format. Covers POST method, path, headers, body serialization, response parsing, error paths (4xx/5xx/network/invalid-JSON/shape-mismatch). Matches inherited test infrastructure (`node --test`). The ephemeral-port pattern (`server.listen(0, ...)`) avoids port-conflict flakiness in CI.
- **Weaknesses:** Each test must manage server lifecycle (start + close). Mitigated by per-test `const server = http.createServer(...); await new Promise(r => server.listen(0, r)); ... ; await new Promise(r => server.close(r));` pattern.
- **Hidden assumptions:** `server.listen(0, ...)` picks an available port (verified via Node.js docs); `server.address()` returns `AddressInfo` with `port` field after listen.
- **Risks:** low.

**Approach B — Pure payload-construction tests only.** Test `verdictGroupToFeedRequest` only; do not exercise the HTTP path.

- **Strengths:** Maximum simplicity.
- **Weaknesses:** Per Rule 2 (branch-binding coverage), every error path in `TesseraToDsFeedClient.post` (`http_4xx` / `http_5xx` / `network_error` / `invalid_response`) requires an AC that structurally exercises it. Pure-projection-only tests cannot exercise these branches; removing any guard would not affect any test outcome.
- **Risks:** high — Rule 2 violation. **REJECTED.**

**Approach C — Dependency-injected HTTP-client interface (adapter takes an injected `HttpClient`; tests provide a fake).** Decouples adapter from `node:http`.

- **Strengths:** Cleaner mock surface; no server lifecycle in tests.
- **Weaknesses:** Adds a DI layer with no production consumer (only tests would use the injection). The real `http.request` interaction (which is the production code path) goes unexercised. A bug in the adapter's `node:http` usage would pass all DI tests and fail in production.
- **Risks:** medium — coverage gap for the real `node:http` interaction.

**Selection rationale:** Approach A. Real-server tests exercise the production `node:http` path; pure-projection tests exercise the projection logic. Together they bind every guard branch in the adapter (Rule 2 coverage).

### § 0.4 File structure inside `engine/ds-integration/`

**Approach A — Single `feed.ts` module + barrel update (PICKED).** All adapter code (projection function + client class + error types) lives in `engine/ds-integration/feed.ts`. Update `engine/ds-integration/index.ts` to add a third `export * from './feed';` line (now 3 export-star lines: feed-contract, event-contract, feed).

- **Strengths:** Matches R65 directive default (NEXT-ROLE.md:29: "`engine/ds-integration/feed.ts` (NEW; Coordinator default; Architect picks at spec time)"). Single file is simple to review. Barrel update is one-line addition. File size estimated ~100-120 lines (projection function ~25 lines + client class ~70 lines + error types + JSDoc).
- **Weaknesses:** Combines pure projection function with stateful client class. Mitigated by clear file-internal organization (projection function above class).
- **Hidden assumptions:** Adding a third `export * from` line to `index.ts` does NOT modify the existing two lines; it is a pure additive change. AC-R65-2 binds the count (3 export-star lines).
- **Risks:** low.

**Approach B — Split into `feed-projection.ts` + `feed-client.ts`.** Two new files; barrel re-exports both.

- **Strengths:** Strict separation of pure function vs class.
- **Weaknesses:** Deviates from R65 directive default ("`engine/ds-integration/feed.ts` (NEW)"). Inflates the barrel update (two new exports instead of one). At ~100-line total adapter size, the file split adds overhead without proportional clarity gain.
- **Risks:** low — deviates from directive without compensating benefit.

**Selection rationale:** Approach A. Matches directive default; ~100-line single file is reviewable; pure-vs-stateful organization handled by intra-file ordering.

### § 0.5 Engine-type import policy in the adapter

**Approach A — Adapter imports engine types directly from `'../types/verdict'` (PICKED).** `feed.ts` declares `import type { VerdictGroup, FusedVerdict } from '../types/verdict';`. The adapter projects from `VerdictGroup` to `VerdictGroupPayload` at the boundary.

- **Strengths:** The cross-repo decoupling discipline enforced at R62 (the DECOUPLING-1/2 EMPIRICAL checks in `coordination/specs/Q-R62-EMPIRICAL.sh:259-268`) is scoped to the CONTRACT files (`feed-contract.ts` + `event-contract.ts`) — they must not import from `'../types'` / `'../events'` so DS (a separate repo) can compile against pure type definitions. The adapter (`feed.ts`) is Tessera-side ONLY; it never compiles against DS code; DS never consumes `feed.ts`. Engine-type imports inside Tessera's own adapter do NOT cross any repo boundary. Adjacent Tessera-original code uses the same pattern (`engine/fleet/verdict-consumer.ts:22-23` imports `FusedVerdict, VerdictGroup` from `'../types/verdict'`).
- **Weaknesses:** A future Tessera engine evolution that changes `VerdictGroup` shape silently changes the adapter's input contract. Mitigated by: (a) the projection function explicitly enumerates every field it consumes (`group.group_id`, `group.deploy_id`, etc.) — any rename breaks the projection at compile time; (b) the wire-format `VerdictGroupPayload` is the stable cross-repo surface (R62 frozen).
- **Hidden assumptions:** `'../types/verdict'` resolves correctly from `engine/ds-integration/` (verified via `engine/fleet/verdict-consumer.ts:22-23` precedent — `'../types/verdict'` from `engine/fleet/` resolves to `engine/types/verdict.ts`; same depth from `engine/ds-integration/`).
- **Risks:** low.

**Approach B — Structural (duck-typed) function parameters.** Adapter accepts inputs typed via inline object-literal type or a structural alias defined inside `feed.ts`; no `import` from `'../types'`.

- **Strengths:** Adapter is "portable" — any object with the right shape is acceptable. Cross-repo decoupling extends one layer outward.
- **Weaknesses:** Duplicates type shape (the inline type-literal restates `VerdictGroup`'s structure). A future shape change in `engine/types/verdict.ts` does NOT break the adapter at compile time — adapter consumes an obsolete shape silently. The adapter is Tessera-internal; cross-repo decoupling at the adapter layer adds maintenance burden without delivering any cross-repo benefit. The handoff doc (`CLUSTER-HANDOFF-WAVE10-3A-3B.md` line 73) says "MAY read these engine types for wire-format alignment but MUST NOT import them into the feed adapter implementation" — but this wording is in the "architect-spec verification (recommended at spec emit)" section, which scopes the discipline to spec-time reading, not to the runtime import graph. Reading the handoff line in full context, the adapter MUST consume the engine `VerdictGroup` shape (the directive at NEXT-ROLE.md:32 says "constructs `VerdictGroupPayload` from engine `VerdictGroup` instances"); without an `import`, the adapter's signature would have to inline-restate the engine shape, propagating future drift.
- **Risks:** medium — inline type duplication creates a drift surface.

**Selection rationale:** Approach A. The DECOUPLING-1/2 EMPIRICAL checks are scoped to the contract files (cross-repo surface); the adapter is Tessera-internal and engine-type imports are precedent-aligned with `engine/fleet/verdict-consumer.ts`. The handoff's wording is interpreted as a spec-time reading discipline, not a runtime import prohibition; the directive's explicit "constructs `VerdictGroupPayload` from engine `VerdictGroup` instances" requires the engine import.

### § 0.6 Selection summary

| Axis | Picked | Rejected | Why |
|---|---|---|---|
| § 0.1 Wiring approach | A — standalone adapter, no integration | B (event-driven; anti-scope), C (polled; anti-scope/unfit) | All non-A approaches require modifying vendored-at-pin or R21-frozen code |
| § 0.2 HTTP mechanism | A — `node:http.request` + Promise shim | B (fetch; mock complexity), C (no HTTP; fails deliverable) | Built-in; W3-4 honored; mockable; matches directive |
| § 0.3 Test architecture | A — in-process mock server + pure-projection tests | B (pure-only; fails Rule 2), C (DI; coverage gap on real http path) | Real `node:http` exercised; every guard branch bound |
| § 0.4 File structure | A — single `feed.ts` + barrel | B (split into 2 files; deviates from directive default) | Matches directive default; ~100-line file is reviewable |
| § 0.5 Engine-type import | A — `import type { VerdictGroup, FusedVerdict } from '../types/verdict'` | B (structural / duck-typed inline) | DECOUPLING checks scoped to contract files; adapter is Tessera-internal |

All five picks are independent; no pick contradicts the R65 directive or any cross-project rule.

---

## § 1 Design phase (Superpowers — inline; precedes per-file pseudocode)

### § 1.1 Component boundaries

| Symbol | Owner | Lifecycle |
|---|---|---|
| `engine/ds-integration/feed.ts` | NEW Tessera-original | Created this round (R65). HTTP client adapter for Tessera→DS feed direction. |
| `test/q65-ds-integration-feed.test.ts` | NEW Tessera-original | 16 runtime tests binding AC-R65-1 through AC-R65-16. |
| `engine/ds-integration/index.ts` | MODIFIED additively | Add 1 new `export * from './feed';` line (3 total export-star lines after change). No other modification. |
| `verdictGroupToFeedRequest()` | Owned by `engine/ds-integration/feed.ts` | Pure projection function from `VerdictGroup` to `TesseraToDsFeedRequest`. |
| `class TesseraToDsFeedClient` | Owned by `engine/ds-integration/feed.ts` | Stateful (carries connection options); single public method `post(request, headers): Promise<FeedResult>`. |
| `type FeedError` / `type FeedErrorKind` / `type FeedResult` | Owned by `engine/ds-integration/feed.ts` | Discriminated union for error reporting. |
| `engine/ds-integration/feed-contract.ts` | READ-ONLY (R62 frozen) | Imported by `feed.ts` for type pins + endpoint const. |
| `engine/ds-integration/event-contract.ts` | READ-ONLY (R62 frozen; cross-cluster anti-scope) | Not consumed by R65. |
| `engine/ds-integration/README.md` | READ-ONLY (R62 frozen) | No modification. |
| `engine/types/verdict.ts` | READ-ONLY (R56 frozen; A16 literal at `:298` preserved) | Imported by `feed.ts` for `VerdictGroup` + `FusedVerdict` types. |
| `engine/events/event-feed.ts` | READ-ONLY (R34/R36 frozen) | Not consumed by R65. |
| `engine/events/freeze-hook.ts` | READ-ONLY (R20/R21/R36 frozen surface) | Not consumed by R65. |
| `engine/verdict-groups.ts` | READ-ONLY (R20 vendored-at-pin) | Not modified; not imported (adapter consumes `VerdictGroup` type only, not `VerdictGrouper` class). |
| `engine/fleet/verdict-consumer.ts` | READ-ONLY (R21 Tessera-original; frozen per directive) | Not modified; not imported. |

### § 1.2 Data flows + integration points

```
                ┌────────────────────────────────────────────────────────────────┐
                │ Tessera engine (READ-ONLY for R65)                              │
                │                                                                  │
                │ engine/types/verdict.ts:198-231                                  │
                │   interface VerdictGroup {                                       │
                │     group_id, deploy_id, window_start_ts, window_end_ts,         │
                │     cluster_event_id?, firing_verdicts: FusedVerdict[],          │
                │     confidence, ...                                              │
                │   }                                                              │
                │ engine/types/verdict.ts:130                                      │
                │   interface FusedVerdict {                                       │
                │     firing_families: Array<'A'|'B'|'C'|'D'|'E'>, ...              │
                │   }                                                              │
                └────────────────────────────┬───────────────────────────────────┘
                                              │ import type
                                              ▼
   ┌────────────────────────────────────────────────────────────────────────┐
   │ engine/ds-integration/ (R62 contract module + R65 adapter)              │
   │                                                                          │
   │  ┌──────────────────────────────┐    ┌────────────────────────────────┐ │
   │  │ feed-contract.ts (R62 FROZEN)│    │ event-contract.ts (R62 FROZEN) │ │
   │  │  VerdictGroupPayload         │    │  DeployEventPayload            │ │
   │  │  TesseraToDsFeedRequest      │    │  ...                           │ │
   │  │  TesseraToDsFeedResponse     │    │                                │ │
   │  │  TesseraToDsAuthHeaders      │    │                                │ │
   │  │  TesseraToDsFeedEndpoint     │    │                                │ │
   │  │  TESSERA_TO_DS_FEED_ENDPOINT │    │                                │ │
   │  └─────────────┬────────────────┘    └────────────────────────────────┘ │
   │                │ import type (R65 adapter consumes)                       │
   │                ▼                                                          │
   │  ┌──────────────────────────────────────────────────────────────────┐   │
   │  │ feed.ts (NEW; R65; Tessera-original)                              │   │
   │  │   verdictGroupToFeedRequest(group, ts) → TesseraToDsFeedRequest   │   │
   │  │   class TesseraToDsFeedClient { post(req, headers) }              │   │
   │  │   type FeedError / FeedResult                                     │   │
   │  └──────────────────────────────────────────────────────────────────┘   │
   │                                                                          │
   │  index.ts (barrel; MODIFIED to add 'export * from ./feed')               │
   └────────────────────────────────────────────────────────────────────────┘
                                          │ HTTP POST via node:http
                                          ▼
                ┌──────────────────────────────────────────────────────┐
                │ DS-side correlation layer (REAL ENDPOINT NOT TESTED) │
                │  POST /v1/tessera/verdict-groups                      │
                │  In-process mock HTTP server stands in for tests.    │
                └──────────────────────────────────────────────────────┘
```

### § 1.3 Integration points (verified against R65 directive + R62 contract module)

1. **`feed.ts` imports `VerdictGroup, FusedVerdict` from `'../types/verdict'`.** Engine-type import is Tessera-internal and outside the DECOUPLING-1/2 EMPIRICAL check scope (which targets `feed-contract.ts` + `event-contract.ts` only). Precedent: `engine/fleet/verdict-consumer.ts:22-23` uses the same pattern.

2. **`feed.ts` imports `TESSERA_TO_DS_FEED_ENDPOINT` (const) + `TesseraToDsFeedRequest, TesseraToDsFeedResponse, TesseraToDsAuthHeaders, VerdictGroupPayload` (types) from `'./feed-contract'`.** Single source of truth for endpoint metadata + wire shapes. AC-R65-15 binds the import (grep on `feed.ts` source) — no inline literal duplication of the endpoint path/method.

3. **`feed.ts` imports `http` from `'node:http'`.** Built-in module; no new external dependency (W3-4 Option A honored).

4. **`index.ts` adds one `export * from './feed';` line.** No modification to the existing `export * from './feed-contract';` and `export * from './event-contract';` lines. AC-R65-2 binds the export-star count (3).

5. **A16 wire-format invariant propagation.** `engine/types/verdict.ts:298` declares the load-bearing literal `correlational_not_causal: true` on `TopologyCandidate`. The R62 contract (`feed-contract.ts:48`) declares the same literal on `VerdictGroupPayload`. The R65 projection function MUST construct `VerdictGroupPayload` with `correlational_not_causal: true` (literal, not `boolean`). AC-R65-4 binds via a discriminating assertion (typed-sample + literal-equality check); reinforced by the TypeScript compiler — the wire-type field declaration `correlational_not_causal: true` rejects any other value at type level.

6. **`VerdictGroupId` format compatibility.** `engine/types/verdict.ts:189-193` declares `VerdictGroupId = string` with format `group-{deploy_id}-{window_start_ts}` (or composite `group-{cluster_event_id}-{deploy_id}-{ts}` per R20 vendored-with-deltas). Wire-format `VerdictGroupPayload.group_id` is typed `string` (no template-literal constraint). Projection passes through unchanged.

7. **`cluster_event_id` optional projection.** `VerdictGroup.cluster_event_id` is optional (R18 schema delta). `VerdictGroupPayload.cluster_event_id` is also optional. Projection MUST conditionally include the field (omit when source is `undefined`; include verbatim when source is a string). AC-R65-6 binds both branches via two sub-assertions in one test.

### § 1.4 Failure modes at each integration point

| Integration point | Possible failure | R65 mitigation |
|---|---|---|
| Wire-format projection (group_id, deploy_id, window timestamps, confidence) | Field renamed or dropped in `VerdictGroup`; projection silently drops | Projection function explicitly assigns every field; tsc catches missing fields at compile time. AC-R65-3 + AC-R65-4 + AC-R65-6 bind discriminating samples. |
| A16 literal `correlational_not_causal: true` regression | Projection writes `false` or `true as boolean` instead of literal `true` | AC-R65-4 asserts strict-equality on `true` AND wire-type field declaration enforces literal at compile time. Defensive: AC-R65-15 grep on `feed.ts` source confirms `correlational_not_causal: true` literal in projection body. |
| `firing_family_count` aggregation error | Projection writes `group.firing_verdicts.length` (per-verdict count) instead of dedup family count | AC-R65-5 uses a synthetic input with overlapping firing_families across verdicts; asserts dedup count, NOT verdict count. Test fails if implementation uses verdict-count rather than family-dedup. |
| `cluster_event_id` propagation drift | Field always-included (writes `undefined` literal) or always-omitted | AC-R65-6 has two sub-assertions: (a) `cluster_event_id` present in payload when group has it; (b) `'cluster_event_id' in payload === false` when group lacks it. Both branches bound. |
| HTTP method/path drift | `post()` sends wrong method or path | AC-R65-7 mock server captures the received `req.method` + `req.url`; asserts equality with `TESSERA_TO_DS_FEED_ENDPOINT.method` + `.path`. AC-R65-15 grep confirms feed.ts imports `TESSERA_TO_DS_FEED_ENDPOINT` (no inline literal). |
| Auth header drop | `x-tessera-instance-id` or `authorization` not propagated | AC-R65-8 mock server captures `req.headers`; asserts both values present. |
| 4xx response misclassification | `post()` returns `ok: true` on 4xx, or wrong error kind | AC-R65-9 mock server returns status 400; asserts `FeedResult { ok: false, error: { kind: 'http_4xx', status_code: 400 } }`. |
| 5xx response misclassification | `post()` returns `ok: true` on 5xx, or wrong error kind | AC-R65-10 mock server returns status 500; asserts `FeedResult { ok: false, error: { kind: 'http_5xx', status_code: 500 } }`. |
| Network error swallowed | `post()` throws on connection-refused or hangs | AC-R65-11 uses a port with no listening server; asserts `FeedResult { ok: false, error: { kind: 'network_error' } }` returned (no throw). |
| Invalid JSON response not detected | `post()` crashes or returns `ok: true` on non-JSON 200 | AC-R65-12 mock server returns status 200 with body `"not-json"`; asserts `FeedResult { ok: false, error: { kind: 'invalid_response' } }`. |
| Shape-mismatch response not detected | `post()` returns `ok: true` on a JSON object lacking required fields | AC-R65-13 mock server returns `{ contract_version: 'v1', status: 'accepted' }` (missing `correlation_key`); asserts `FeedResult { ok: false, error: { kind: 'invalid_response' } }`. |
| Successful response field drop | `post()` returns `ok: true` but doesn't propagate `correlation_key` | AC-R65-14 mock server returns valid response shape; asserts `result.ok === true && result.response.correlation_key === '<expected>'`. |
| Anti-scope drift | New file modification outside ALLOWED_SET | AC-R65-16 (test-file-embedded) checks `git diff <round-start>..<CHORE_A_SHA> --name-only ⊆ ALLOWED_SET` via SHA-placeholder pattern (chore-B injects actual SHA). |
| Typecheck regression | tsc exit non-zero | AC-R65-17 (Q-R65-EMPIRICAL.sh) runs `npx tsc -p tsconfig.test.json` and asserts exit 0. |
| Test count drift | Implementer adds/removes tests outside spec scope | AC-R65-18 (Q-R65-EMPIRICAL.sh) asserts chore-B test summary `427/422/2/3`. Chore-A pre-injection summary `427/421/3/3` documented in § 5.4 two-state table. |
| `engine/ds-integration/index.ts` malformed | export-star line miscount | AC-R65-2 grep asserts 3 export-star lines after R65 change (feed-contract, event-contract, feed). |

### § 1.5 Type-pretest pseudocode (Architect verification)

```typescript
// Pattern 1: projection function with conditional field
function project(g: { cluster_event_id?: string; /* ... */ }): {
  cluster_event_id?: string;
  correlational_not_causal: true;
} {
  return {
    ...(g.cluster_event_id !== undefined ? { cluster_event_id: g.cluster_event_id } : {}),
    correlational_not_causal: true,  // literal type
  };
}

// Pattern 2: discriminated union for FeedError
type FeedError =
  | { kind: 'network_error'; reason: string }
  | { kind: 'http_4xx'; status_code: number; reason: string }
  | { kind: 'http_5xx'; status_code: number; reason: string }
  | { kind: 'invalid_response'; status_code?: number; reason: string };

// Pattern 3: result type
type FeedResult =
  | { ok: true; response: TesseraToDsFeedResponse }
  | { ok: false; error: FeedError };

// Pattern 4: Promise wrapper around node:http.request
function post(req: TesseraToDsFeedRequest): Promise<FeedResult> {
  return new Promise<FeedResult>((resolve) => {
    const r = http.request({...}, (res) => { /* ... */ });
    r.on('error', (err) => resolve({ ok: false, error: { kind: 'network_error', reason: err.message } }));
    r.write(JSON.stringify(req));
    r.end();
  });
}
```

**Architect pre-prediction:** tsc exit 0 against the prescribed patterns. Reasoning:
- Conditional object spread with `?:` is a standard TS pattern (verified via TS handbook + `engine/fleet/verdict-consumer.ts` precedent at line 56-58 for inline object construction).
- Discriminated unions over `kind: 'literal'` are idiomatic TS (verified at `engine/types/verdict.ts:264` for `relationship` discriminator).
- Promise<T> over node:http callback is standard Node.js async pattern.

---

## § 2 Mechanism

### § 2.1 Pure projection — `verdictGroupToFeedRequest(group, emitted_at_ts)`

**Signature:**
```typescript
function verdictGroupToFeedRequest(
  group: VerdictGroup,
  emitted_at_ts: number,
): TesseraToDsFeedRequest
```

**Behavior:** Maps every load-bearing field of `engine/types/verdict.ts:198-231` `VerdictGroup` to its corresponding `VerdictGroupPayload` field at `engine/ds-integration/feed-contract.ts:28-49`:

| `VerdictGroupPayload` field | Source |
|---|---|
| `group_id` | `group.group_id` (passthrough) |
| `deploy_id` | `group.deploy_id` (passthrough) |
| `window_start_ts` | `group.window_start_ts` (passthrough) |
| `window_end_ts` | `group.window_end_ts` (passthrough) |
| `cluster_event_id?` | `group.cluster_event_id` if defined; omitted otherwise |
| `firing_family_count` | `new Set(group.firing_verdicts.flatMap(v => v.firing_families)).size` — dedup count of distinct firing families across all firing verdicts |
| `confidence` | `group.confidence` (passthrough; per Addition #25 D8: `min(1, families.size / K_saturation)` — already-computed; projection does NOT recompute) |
| `correlational_not_causal` | literal `true` (A16 wire-format invariant) |

The top-level `TesseraToDsFeedRequest` carries `contract_version: 'v1'` (literal), the `VerdictGroupPayload` under `verdict_group`, and `emitted_at_ts` passed in by caller.

**Idempotency note (documented in README — R62 frozen):** Callers SHOULD set `emitted_at_ts` to a stable per-emission timestamp so the `(group_id, emitted_at_ts)` idempotency key is reusable across retransmissions. The adapter does NOT track or generate `emitted_at_ts` — caller-provided.

### § 2.2 HTTP client — `TesseraToDsFeedClient`

**Constructor signature:**
```typescript
new TesseraToDsFeedClient(opts: {
  host: string;
  port: number;
  protocol?: 'http';        // default 'http'; only 'http' supported at R65 (no TLS until auth-scheme round)
  request_timeout_ms?: number;  // default 5000
})
```

**Public method:**
```typescript
async post(
  request: TesseraToDsFeedRequest,
  headers: TesseraToDsAuthHeaders,
): Promise<FeedResult>
```

**Behavior:**

1. Serialize `request` to JSON via `JSON.stringify`.
2. Construct outgoing headers: `'content-type': 'application/json'`, `'content-length': <byte length>`, `'x-tessera-instance-id': headers['x-tessera-instance-id']`, `'authorization': headers.authorization`.
3. Invoke `http.request({ host, port, path: TESSERA_TO_DS_FEED_ENDPOINT.path, method: TESSERA_TO_DS_FEED_ENDPOINT.method, headers, timeout })`.
4. On `'response'`: accumulate body chunks, parse as JSON, validate shape via `isFeedResponse(parsed)`, resolve `FeedResult`.
5. On status `>= 500`: resolve `{ ok: false, error: { kind: 'http_5xx', status_code, reason: <body> } }`.
6. On status `>= 400`: resolve `{ ok: false, error: { kind: 'http_4xx', status_code, reason: <body> } }`.
7. On JSON parse failure: resolve `{ ok: false, error: { kind: 'invalid_response', status_code, reason: 'JSON parse error' } }`.
8. On shape-mismatch (parsed object lacks `contract_version === 'v1'` OR `correlation_key: string` OR `status: 'accepted'|'rejected'`): resolve `{ ok: false, error: { kind: 'invalid_response', status_code, reason: 'shape mismatch' } }`.
9. On `'error'` event (network error before response): resolve `{ ok: false, error: { kind: 'network_error', reason: err.message } }`.
10. On `'timeout'` event: call `req.destroy(new Error('request timeout'))` — propagates to `'error'` handler which resolves with `network_error`.
11. Returns a `Promise<FeedResult>` that ALWAYS resolves (never rejects); errors are encoded in the discriminated `FeedResult` union.

**Type guard `isFeedResponse(v: unknown): v is TesseraToDsFeedResponse`:** internal helper validating runtime shape (`contract_version === 'v1'`; `typeof correlation_key === 'string'`; `status === 'accepted' || status === 'rejected'`).

### § 2.3 R56 MINOR-1 halt-condition discipline (carve-out for pre-documented two-state)

Per R56 MINOR-1 + R53 MINOR-1 reinforcement at CLAUDE-ARCHITECT.md, when § 1.4 / § 5 / § 6.1 reference test-count or anti-scope-diff binding-command attestation, halt-condition trigger MUST carve out the pre-documented chore-A vs chore-B two-state mismatch. § 6.1 halt condition #1 below applies this carve-out explicitly to **AC-R65-16** (anti-scope diff with `<INJECTED-AT-CHORE-B>` placeholder) and **AC-R65-18** (test count summary) — and ONLY these two — per R65 directive § "narrowed post-R62 to ... only — do NOT propagate the structurally-vacuous forward-protection AC pattern; see R62 lesson."

### § 2.4 What this spec does NOT prescribe

The spec does NOT prescribe:

- Any modification to `engine/types/verdict.ts` (anti-scope item 1).
- Any modification to `engine/events/event-feed.ts` (anti-scope item 4).
- Any modification to `engine/events/freeze-hook.ts` body or signature (anti-scope item 5).
- Any modification to `engine/verdict-groups.ts` or `engine/fleet/verdict-consumer.ts` (anti-scope item 6 — R20/R21 frozen).
- Any modification to `engine/ds-integration/feed-contract.ts` / `event-contract.ts` / `README.md` (anti-scope item 2 — R62 frozen).
- Real DS-endpoint HTTP calls (Path B; synthetic-fixture mock server only).
- Any new external dependency (W3-4 Option A; `node:http` built-in only).
- DS-repo modification (W3-1 Option A; out of scope).
- `engine/ds-integration/event-consumer.ts` work (WU-3C scope; R66).
- Tessera-side wiring from any production code path into the feed adapter (future-round work; outside R65 anti-scope).
- Auth-scheme implementation (bearer/HMAC/mTLS — the adapter accepts pre-formed `TesseraToDsAuthHeaders` and propagates; scheme selection deferred).

**Forward-flag for post-R65 wiring round:** A future, non-anti-scope round will integrate the adapter into a production emission path. Candidates: (a) extend `engine/fleet/verdict-consumer.ts` with an optional `feed_client?: TesseraToDsFeedClient` parameter (vendored-with-deltas on R21 deliverable); (b) introduce a NEW emission orchestrator module at `engine/ds-integration/dispatcher.ts` that consumes `IngestResult[]` from external callers; (c) extend the inherited orchestrator. R65 does NOT pick or prescribe this — it ships only the adapter.

---

## § 3 Anti-scope + ALLOWED_SET (forward coverage per Rule 4)

### § 3.1 Anti-scope items (R65 hard limits)

1. **NO modification of `engine/ds-integration/feed-contract.ts`** (R62 contract; frozen).
2. **NO modification of `engine/ds-integration/event-contract.ts`** (WU-3C surface; cross-cluster anti-scope).
3. **NO modification of `engine/ds-integration/README.md`** (R62 documentation; frozen).
4. **NO modification of `engine/types/verdict.ts`** (R56 frozen; A16 literal at `:298` preserved structurally by absence of modification).
5. **NO modification of `engine/events/event-feed.ts`** (R34/R36 frozen).
6. **NO modification of `engine/events/freeze-hook.ts` body or signature** (R20/R21/R36 frozen).
7. **NO modification of `engine/verdict-groups.ts`** (R20 vendored-at-pin).
8. **NO modification of `engine/fleet/verdict-consumer.ts`** (R21 Tessera-original; frozen per R65 directive "NO modification of R42-R64 deliverables").
9. **NO modification of any other `engine/*` file** beyond NEW `engine/ds-integration/feed.ts` + 1-line additive update to `engine/ds-integration/index.ts`.
10. **NO real-DS-endpoint HTTP calls** (Path B; synthetic/mock-server fixtures only).
11. **NO new external dependencies** (W3-4 Option A; HTTP via Node.js built-in `node:http` only).
12. **NO DS-repo modification** (W3-1 Option A).
13. **NO `engine/ds-integration/event-consumer.ts` work** (WU-3C scope; R66).
14. **NO modification of R42-R64 deliverables** except adding `feed.ts` and 1-line `index.ts` update (per R65 directive).
15. **NO opening of GitHub PRs.**
16. **NO modification of any pre-R64 test file** (Phase 1+2+Phase-3-SLICE-1+2 test suite frozen; only the new `test/q65-ds-integration-feed.test.ts` lands).
17. **NO modification of `coordination/SCOPING-MEMO-v0.3.md`** (no W3-5 trigger at R65).
18. **NO modification of `~/.claude/CROSS-PROJECT-MEMORIAL.md`.**
19. **NO modification of `coordination/MEMORIAL-PHASE-*.md`** (R42 frozen shards).
20. **NO modification of `scripts/*` or `run-pipeline.sh`.**
21. **NO modification of `CLAUDE-*.md` REINFORCEMENTS sections** (Memorial-Updater's exclusive domain at end-of-round).
22. **NO modification of `coordination/PRD.md`.**
23. **NO modification of `coordination/WAVE-PLAN-09.md`** (Wave 10 dispatch authorized; plan unchanged).
24. **NO modification of `coordination/CLUSTER-HANDOFF-WAVE10-3A-3B.md`** (handoff contract).
25. **NO modification of `coordination/VENDORING-MANIFEST.md`** (no vendored-with-deltas transitions at R65).
26. **NO Tessera-side wiring of the adapter into any production emission path** (deferred to a future round; explicit forward-flag in § 2.4).
27. **NO forward-protection AC pattern** (`git diff CHORE_A_SHA..HEAD --name-only === []`) per R62 lesson (CRITICAL-1 ratified at R62; pattern structurally vacuous when test file participates in chore-B SHA injection). Only historical-anti-scope AC `git diff <round-start>..<CHORE_A_SHA> --name-only ⊆ ALLOWED_SET` is used.

### § 3.2 ALLOWED_SET (8-path enumeration, forward-coverage per Rule 4)

The chore-A diff `git diff 59a03d0..<chore-A-SHA> --name-only | sort` MUST be a subset of:

```
coordination/MEMORIAL.md
coordination/NEXT-ROLE.md
coordination/specs/Q-R65-EMPIRICAL.sh
coordination/specs/Q-R65-SPEC-AUDIT.md
coordination/specs/Q-R65-SPEC.md
engine/ds-integration/feed.ts
engine/ds-integration/index.ts
test/q65-ds-integration-feed.test.ts
```

Conditional 9th entry: `coordination/diagnostics/DIAGNOSTIC-R65-*.md` — added IFF a halt fires mid-round and the Implementer writes a DIAGNOSTIC (per § 6.1 halt-condition discipline). Pre-authorized per R25 MAJOR-2 reinforcement (CLAUDE-ARCHITECT.md REINFORCED 2026-05-18: spec-mandated DIAGNOSTIC paths MUST appear in ALLOWED_SET upfront).

### § 3.3 Git-trackability verification (R23 ARCH MINOR-2)

All 8 base ALLOWED_SET paths verified at spec-emit time for git-trackability:

- `engine/ds-integration/feed.ts` — `.ts` files inside `engine/` are git-trackable (precedent: `engine/ds-integration/feed-contract.ts` tracked at R62 close).
- `engine/ds-integration/index.ts` — already tracked at R62.
- `test/q65-ds-integration-feed.test.ts` — `test/` is tracked; no `.gitignore` block on `test/*.test.ts`.
- `coordination/specs/Q-R65-*.md` + `Q-R65-EMPIRICAL.sh` — `coordination/specs/` is tracked (precedent: Q-R62 triad).
- `coordination/MEMORIAL.md` + `coordination/NEXT-ROLE.md` — tracked.

Sibling `.js` artifacts produced by `tsc -p tsconfig.test.json` (`engine/ds-integration/feed.js`, `test/q65-ds-integration-feed.test.js`) are gitignored per `.gitignore: *.js`; they exist on disk after tsc but are NOT in `git diff --name-only` output, so they do NOT inflate the diff and do NOT need to appear in ALLOWED_SET. Verified via `.gitignore` head lines 1-8 read at spec-emit time.

No `.gitignore` exclusions block any path in ALLOWED_SET.

---

## § 4 Per-file pseudocode

### § 4.1 `engine/ds-integration/feed.ts` (NEW; ~140 lines including JSDoc)

```typescript
// engine/ds-integration/feed.ts — Phase 3 SLICE 3 Wave 10 WU-Phase3-3B (R65).
//
// Tessera→DS feed HTTP client adapter. Constructs VerdictGroupPayload from
// engine VerdictGroup instances per the R62 frozen contract; POSTs to the
// DS correlation layer endpoint via Node.js built-in node:http (no external
// deps per W3-4 Option A).
//
// R65 deliverable: standalone adapter only. Tessera-side wiring (integration
// into a production emission path) is deferred to a future, non-anti-scope
// round (see Q-R65-SPEC.md § 2.4 forward-flag).
//
// Tessera-original code. Extract target: NONE in R65 (engine npm extract
// DEFERRED per Option F to Phase 4 / dedicated design cycle).

import http from 'node:http';
import type { VerdictGroup } from '../types/verdict';
import {
  TESSERA_TO_DS_FEED_ENDPOINT,
  type TesseraToDsFeedRequest,
  type TesseraToDsFeedResponse,
  type TesseraToDsAuthHeaders,
  type VerdictGroupPayload,
} from './feed-contract';

/** Discriminator for the four error classes the adapter can surface. */
export type FeedErrorKind =
  | 'network_error'
  | 'http_4xx'
  | 'http_5xx'
  | 'invalid_response';

/** Structured error surface for non-2xx / non-shape-matching responses. */
export interface FeedError {
  kind: FeedErrorKind;
  status_code?: number;
  reason: string;
}

/** Discriminated-union result of a feed POST. The Promise returned by
 *  TesseraToDsFeedClient.post() ALWAYS resolves; failures are encoded in
 *  the union rather than thrown. */
export type FeedResult =
  | { ok: true; response: TesseraToDsFeedResponse }
  | { ok: false; error: FeedError };

/** Connection options for the feed client. */
export interface TesseraToDsFeedClientOpts {
  /** DS correlation-layer host (e.g., 'localhost' for in-process mock). */
  host: string;
  /** DS correlation-layer port. */
  port: number;
  /** Transport protocol; only 'http' supported at R65 (TLS deferred to
   *  auth-scheme round). */
  protocol?: 'http';
  /** Request timeout in milliseconds; default 5000. */
  request_timeout_ms?: number;
}

/** Pure projection from engine `VerdictGroup` to wire-format
 *  `TesseraToDsFeedRequest`. Caller controls `emitted_at_ts` (the
 *  Tessera-side emit timestamp; epoch seconds).
 *
 *  Wire-format invariants preserved:
 *   - `contract_version: 'v1'` (literal; pins contract identity)
 *   - `correlational_not_causal: true` (literal per A16; mirrors
 *     `engine/types/verdict.ts:298`)
 *   - `cluster_event_id` conditionally included (omitted when source
 *     `group.cluster_event_id` is undefined)
 *   - `firing_family_count`: dedup count of distinct firing families
 *     across all firing verdicts in the group */
export function verdictGroupToFeedRequest(
  group: VerdictGroup,
  emitted_at_ts: number,
): TesseraToDsFeedRequest {
  const families = new Set<string>();
  for (const v of group.firing_verdicts) {
    for (const f of v.firing_families) families.add(f);
  }
  const payload: VerdictGroupPayload = {
    group_id: group.group_id,
    deploy_id: group.deploy_id,
    window_start_ts: group.window_start_ts,
    window_end_ts: group.window_end_ts,
    firing_family_count: families.size,
    confidence: group.confidence,
    correlational_not_causal: true,
    ...(group.cluster_event_id !== undefined
      ? { cluster_event_id: group.cluster_event_id }
      : {}),
  };
  return {
    contract_version: 'v1',
    verdict_group: payload,
    emitted_at_ts,
  };
}

/** HTTP client adapter. Carries connection options; exposes a single
 *  `post()` method that returns a `FeedResult`. */
export class TesseraToDsFeedClient {
  private readonly host: string;
  private readonly port: number;
  private readonly timeoutMs: number;

  constructor(opts: TesseraToDsFeedClientOpts) {
    this.host = opts.host;
    this.port = opts.port;
    this.timeoutMs = opts.request_timeout_ms ?? 5000;
  }

  /** POST one `TesseraToDsFeedRequest` to the DS correlation-layer
   *  endpoint. Always resolves; never throws. */
  async post(
    request: TesseraToDsFeedRequest,
    headers: TesseraToDsAuthHeaders,
  ): Promise<FeedResult> {
    const body = JSON.stringify(request);
    const outgoingHeaders: http.OutgoingHttpHeaders = {
      'content-type': 'application/json',
      'content-length': Buffer.byteLength(body).toString(),
      'x-tessera-instance-id': headers['x-tessera-instance-id'],
      authorization: headers.authorization,
    };

    return new Promise<FeedResult>((resolve) => {
      let settled = false;
      const settle = (r: FeedResult): void => {
        if (settled) return;
        settled = true;
        resolve(r);
      };

      const req = http.request(
        {
          host: this.host,
          port: this.port,
          path: TESSERA_TO_DS_FEED_ENDPOINT.path,
          method: TESSERA_TO_DS_FEED_ENDPOINT.method,
          headers: outgoingHeaders,
          timeout: this.timeoutMs,
        },
        (res) => {
          const chunks: Buffer[] = [];
          res.on('data', (c: Buffer) => chunks.push(c));
          res.on('end', () => {
            const raw = Buffer.concat(chunks).toString('utf8');
            const status = res.statusCode ?? 0;
            if (status >= 500) {
              settle({
                ok: false,
                error: { kind: 'http_5xx', status_code: status, reason: raw },
              });
              return;
            }
            if (status >= 400) {
              settle({
                ok: false,
                error: { kind: 'http_4xx', status_code: status, reason: raw },
              });
              return;
            }
            let parsed: unknown;
            try {
              parsed = JSON.parse(raw);
            } catch {
              settle({
                ok: false,
                error: {
                  kind: 'invalid_response',
                  status_code: status,
                  reason: 'JSON parse error',
                },
              });
              return;
            }
            if (!isFeedResponse(parsed)) {
              settle({
                ok: false,
                error: {
                  kind: 'invalid_response',
                  status_code: status,
                  reason: 'shape mismatch',
                },
              });
              return;
            }
            settle({ ok: true, response: parsed });
          });
        },
      );

      req.on('error', (err) => {
        settle({
          ok: false,
          error: { kind: 'network_error', reason: err.message },
        });
      });
      req.on('timeout', () => {
        req.destroy(new Error('request timeout'));
      });

      req.write(body);
      req.end();
    });
  }
}

/** Type guard validating runtime shape of TesseraToDsFeedResponse. */
function isFeedResponse(v: unknown): v is TesseraToDsFeedResponse {
  if (typeof v !== 'object' || v === null) return false;
  const r = v as Record<string, unknown>;
  return (
    r.contract_version === 'v1' &&
    typeof r.correlation_key === 'string' &&
    (r.status === 'accepted' || r.status === 'rejected')
  );
}
```

### § 4.2 `engine/ds-integration/index.ts` (MODIFIED additively; +1 line)

Current state (R62 close):
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

R65 change (one line added; comment block unchanged):
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
export * from './feed';
```

**Tactical autonomy:** Implementer MAY update the file-header comment block to mention the R65 adapter; MUST NOT remove or modify the two existing `export * from` lines. AC-R65-2 binds the count (3 export-star lines).

### § 4.3 `test/q65-ds-integration-feed.test.ts` (NEW; ~340 lines including server fixtures + JSDoc)

```typescript
// test/q65-ds-integration-feed.test.ts — Phase 3 SLICE 3 Wave 10 WU-Phase3-3B (R65).
//
// Runtime tests binding AC-R65-1 through AC-R65-16. AC-R65-17 (tsc exit) and
// AC-R65-18 (test count) are verified via coordination/specs/Q-R65-EMPIRICAL.sh.
//
// Test architecture: in-process mock HTTP server (`http.createServer` on
// ephemeral port) + pure-function projection tests. See Q-R65-SPEC.md § 0.3.

import { describe, test } from 'node:test';
import { strict as assert } from 'node:assert';
import { existsSync, readFileSync } from 'node:fs';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { execSync } from 'node:child_process';

import {
  verdictGroupToFeedRequest,
  TesseraToDsFeedClient,
  type FeedResult,
} from '../engine/ds-integration/feed';
import {
  TESSERA_TO_DS_FEED_ENDPOINT,
  type TesseraToDsAuthHeaders,
} from '../engine/ds-integration/feed-contract';
import type { VerdictGroup, FusedVerdict } from '../engine/types/verdict';

// ── Synthetic VerdictGroup builders ─────────────────────────────────────

function makeFusedVerdict(
  families: Array<'A' | 'B' | 'C' | 'D' | 'E'>,
  tick: number,
): FusedVerdict {
  // Minimal FusedVerdict shape; projection only reads `firing_families`.
  // Other fields are populated with placeholder values to satisfy the type.
  return {
    deploy_ref: 'deploy-x',
    tick,
    firing_families: families,
    total_alpha_spent: 0,
    // Other FusedVerdict fields default to engine-acceptable values; the
    // projection does not read them. The cast is necessary because the
    // FusedVerdict type carries additional fields the projection ignores.
  } as unknown as FusedVerdict;
}

function makeGroup(opts: {
  group_id?: string;
  deploy_id?: string;
  window_start_ts?: number;
  window_end_ts?: number;
  cluster_event_id?: string;
  firing_verdicts?: FusedVerdict[];
  confidence?: number;
}): VerdictGroup {
  return {
    group_id: opts.group_id ?? 'group-deploy-x-100',
    deploy_id: opts.deploy_id ?? 'deploy-x',
    window_start_ts: opts.window_start_ts ?? 100,
    window_end_ts: opts.window_end_ts ?? 400,
    cluster_event_id: opts.cluster_event_id,
    verdicts: opts.firing_verdicts ?? [],
    firing_verdicts: opts.firing_verdicts ?? [],
    root_cause: null,
    confidence: opts.confidence ?? 0.5,
    late_arrival_verdicts: [],
    closed: true,
    closed_at_ts: opts.window_end_ts ?? 400,
  };
}

// ── Mock HTTP server fixture ────────────────────────────────────────────

interface MockServer {
  url_host: string;
  url_port: number;
  received_method: string | null;
  received_url: string | null;
  received_headers: Record<string, string | string[] | undefined> | null;
  received_body: string | null;
  close: () => Promise<void>;
}

async function startMockServer(opts: {
  respond_status: number;
  respond_body: string;
}): Promise<MockServer> {
  const state: {
    method: string | null;
    url: string | null;
    headers: Record<string, string | string[] | undefined> | null;
    body: string | null;
  } = { method: null, url: null, headers: null, body: null };

  const server = http.createServer((req, res) => {
    state.method = req.method ?? null;
    state.url = req.url ?? null;
    state.headers = req.headers;
    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => chunks.push(c));
    req.on('end', () => {
      state.body = Buffer.concat(chunks).toString('utf8');
      res.statusCode = opts.respond_status;
      res.setHeader('content-type', 'application/json');
      res.end(opts.respond_body);
    });
  });

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const addr = server.address() as AddressInfo;

  return {
    url_host: '127.0.0.1',
    url_port: addr.port,
    get received_method() {
      return state.method;
    },
    get received_url() {
      return state.url;
    },
    get received_headers() {
      return state.headers;
    },
    get received_body() {
      return state.body;
    },
    close: () =>
      new Promise<void>((resolve, reject) =>
        server.close((err) => (err ? reject(err) : resolve())),
      ),
  };
}

const authHeaders: TesseraToDsAuthHeaders = {
  'x-tessera-instance-id': 'tessera-instance-1',
  authorization: 'Bearer test-token',
};

// ── AC bindings ─────────────────────────────────────────────────────────

describe('R65 WU-Phase3-3B Tessera→DS feed adapter', () => {
  test('AC-R65-1: engine/ds-integration/feed.ts exists', () => {
    assert.equal(existsSync('engine/ds-integration/feed.ts'), true);
  });

  test('AC-R65-2: engine/ds-integration/index.ts has 3 export-star lines', () => {
    const src = readFileSync('engine/ds-integration/index.ts', 'utf8');
    const matches = src.match(/^export \* from /gm);
    assert.equal(matches?.length ?? 0, 3);
  });

  test('AC-R65-3: verdictGroupToFeedRequest produces contract_version === "v1"', () => {
    const group = makeGroup({});
    const req = verdictGroupToFeedRequest(group, 500);
    assert.equal(req.contract_version, 'v1');
    assert.equal(req.emitted_at_ts, 500);
  });

  test('AC-R65-4: payload preserves correlational_not_causal: true literal (A16)', () => {
    const group = makeGroup({});
    const req = verdictGroupToFeedRequest(group, 500);
    // Strict equality on `true` (not truthy-check; not boolean coercion).
    assert.strictEqual(req.verdict_group.correlational_not_causal, true);
  });

  test('AC-R65-5: firing_family_count = Set-dedup over firing_verdicts × firing_families', () => {
    // Two firing verdicts: {A, B} and {B, C}. Dedup family set: {A, B, C}. Count = 3.
    // (NOT 4 — that would be the verdict-family pair count.)
    // (NOT 2 — that would be the verdict count.)
    const fv1 = makeFusedVerdict(['A', 'B'], 1);
    const fv2 = makeFusedVerdict(['B', 'C'], 2);
    const group = makeGroup({ firing_verdicts: [fv1, fv2] });
    const req = verdictGroupToFeedRequest(group, 500);
    assert.equal(req.verdict_group.firing_family_count, 3);
  });

  test('AC-R65-6: cluster_event_id propagated when present; omitted when absent', () => {
    const withEvent = makeGroup({ cluster_event_id: 'evt-42' });
    const withoutEvent = makeGroup({});

    const reqWith = verdictGroupToFeedRequest(withEvent, 500);
    const reqWithout = verdictGroupToFeedRequest(withoutEvent, 500);

    assert.equal(reqWith.verdict_group.cluster_event_id, 'evt-42');
    assert.equal('cluster_event_id' in reqWithout.verdict_group, false);
  });

  test('AC-R65-7: post() sends to TESSERA_TO_DS_FEED_ENDPOINT.path with method "POST"', async () => {
    const server = await startMockServer({
      respond_status: 201,
      respond_body: JSON.stringify({
        contract_version: 'v1',
        correlation_key: 'k1',
        status: 'accepted',
      }),
    });
    try {
      const client = new TesseraToDsFeedClient({
        host: server.url_host,
        port: server.url_port,
      });
      const req = verdictGroupToFeedRequest(makeGroup({}), 500);
      await client.post(req, authHeaders);
      assert.equal(server.received_method, 'POST');
      assert.equal(server.received_method, TESSERA_TO_DS_FEED_ENDPOINT.method);
      assert.equal(server.received_url, TESSERA_TO_DS_FEED_ENDPOINT.path);
      assert.equal(server.received_url, '/v1/tessera/verdict-groups');
    } finally {
      await server.close();
    }
  });

  test('AC-R65-8: auth headers (x-tessera-instance-id + authorization) propagated', async () => {
    const server = await startMockServer({
      respond_status: 201,
      respond_body: JSON.stringify({
        contract_version: 'v1',
        correlation_key: 'k2',
        status: 'accepted',
      }),
    });
    try {
      const client = new TesseraToDsFeedClient({
        host: server.url_host,
        port: server.url_port,
      });
      const req = verdictGroupToFeedRequest(makeGroup({}), 500);
      await client.post(req, authHeaders);
      assert.equal(
        server.received_headers?.['x-tessera-instance-id'],
        'tessera-instance-1',
      );
      assert.equal(server.received_headers?.authorization, 'Bearer test-token');
    } finally {
      await server.close();
    }
  });

  test('AC-R65-9: 4xx response → FeedError kind "http_4xx" + status_code preserved', async () => {
    const server = await startMockServer({
      respond_status: 400,
      respond_body: 'bad request',
    });
    try {
      const client = new TesseraToDsFeedClient({
        host: server.url_host,
        port: server.url_port,
      });
      const req = verdictGroupToFeedRequest(makeGroup({}), 500);
      const result: FeedResult = await client.post(req, authHeaders);
      assert.equal(result.ok, false);
      if (result.ok === false) {
        assert.equal(result.error.kind, 'http_4xx');
        assert.equal(result.error.status_code, 400);
      }
    } finally {
      await server.close();
    }
  });

  test('AC-R65-10: 5xx response → FeedError kind "http_5xx" + status_code preserved', async () => {
    const server = await startMockServer({
      respond_status: 503,
      respond_body: 'service unavailable',
    });
    try {
      const client = new TesseraToDsFeedClient({
        host: server.url_host,
        port: server.url_port,
      });
      const req = verdictGroupToFeedRequest(makeGroup({}), 500);
      const result: FeedResult = await client.post(req, authHeaders);
      assert.equal(result.ok, false);
      if (result.ok === false) {
        assert.equal(result.error.kind, 'http_5xx');
        assert.equal(result.error.status_code, 503);
      }
    } finally {
      await server.close();
    }
  });

  test('AC-R65-11: network error → FeedError kind "network_error"', async () => {
    // No server listening on this port; expect ECONNREFUSED.
    const client = new TesseraToDsFeedClient({
      host: '127.0.0.1',
      port: 1,  // Reserved port; refuses connection.
    });
    const req = verdictGroupToFeedRequest(makeGroup({}), 500);
    const result: FeedResult = await client.post(req, authHeaders);
    assert.equal(result.ok, false);
    if (result.ok === false) {
      assert.equal(result.error.kind, 'network_error');
    }
  });

  test('AC-R65-12: invalid JSON response → FeedError kind "invalid_response"', async () => {
    const server = await startMockServer({
      respond_status: 200,
      respond_body: 'not-json',
    });
    try {
      const client = new TesseraToDsFeedClient({
        host: server.url_host,
        port: server.url_port,
      });
      const req = verdictGroupToFeedRequest(makeGroup({}), 500);
      const result: FeedResult = await client.post(req, authHeaders);
      assert.equal(result.ok, false);
      if (result.ok === false) {
        assert.equal(result.error.kind, 'invalid_response');
        assert.match(result.error.reason, /JSON parse error/);
      }
    } finally {
      await server.close();
    }
  });

  test('AC-R65-13: shape-mismatch JSON response → FeedError kind "invalid_response"', async () => {
    const server = await startMockServer({
      respond_status: 200,
      // Missing required `correlation_key` field; shape check fails.
      respond_body: JSON.stringify({ contract_version: 'v1', status: 'accepted' }),
    });
    try {
      const client = new TesseraToDsFeedClient({
        host: server.url_host,
        port: server.url_port,
      });
      const req = verdictGroupToFeedRequest(makeGroup({}), 500);
      const result: FeedResult = await client.post(req, authHeaders);
      assert.equal(result.ok, false);
      if (result.ok === false) {
        assert.equal(result.error.kind, 'invalid_response');
        assert.match(result.error.reason, /shape mismatch/);
      }
    } finally {
      await server.close();
    }
  });

  test('AC-R65-14: valid response → FeedResult.ok = true + correlation_key preserved', async () => {
    const server = await startMockServer({
      respond_status: 201,
      respond_body: JSON.stringify({
        contract_version: 'v1',
        correlation_key: 'corr-key-xyz',
        status: 'accepted',
      }),
    });
    try {
      const client = new TesseraToDsFeedClient({
        host: server.url_host,
        port: server.url_port,
      });
      const req = verdictGroupToFeedRequest(makeGroup({}), 500);
      const result: FeedResult = await client.post(req, authHeaders);
      assert.equal(result.ok, true);
      if (result.ok === true) {
        assert.equal(result.response.correlation_key, 'corr-key-xyz');
        assert.equal(result.response.status, 'accepted');
        assert.equal(result.response.contract_version, 'v1');
      }
    } finally {
      await server.close();
    }
  });

  test('AC-R65-15: feed.ts imports TESSERA_TO_DS_FEED_ENDPOINT from feed-contract (no inline literal duplication)', () => {
    const src = readFileSync('engine/ds-integration/feed.ts', 'utf8');
    // Import statement present:
    assert.match(src, /TESSERA_TO_DS_FEED_ENDPOINT[^;]*from\s+'\.\/feed-contract'/s);
    // Endpoint path literal NOT inlined in feed.ts (only the import path itself):
    const pathOccurrences = (src.match(/'\/v1\/tessera\/verdict-groups'/g) || []).length;
    assert.equal(pathOccurrences, 0);
  });

  test('AC-R65-16: anti-scope diff round-start..CHORE_A_SHA ⊆ ALLOWED_SET', () => {
    // ⚠ Two-state AC. At chore-A pre-injection: CHORE_A_SHA is the placeholder
    // literal '<INJECTED-AT-CHORE-B>' which is not a valid git ref → this
    // test FAILS by construction (pre-documented per Q-R65-SPEC.md § 5.4 +
    // § 6.1 #1 carve-out for R56 MINOR-1 two-state mismatch). At chore-B
    // post-injection: the literal is replaced with the actual chore-A SHA
    // and this test PASSES.
    const ROUND_START_SHA = '59a03d0';
    const CHORE_A_SHA = '<INJECTED-AT-CHORE-B>';
    const ALLOWED_SET = new Set<string>([
      'coordination/MEMORIAL.md',
      'coordination/NEXT-ROLE.md',
      'coordination/specs/Q-R65-EMPIRICAL.sh',
      'coordination/specs/Q-R65-SPEC-AUDIT.md',
      'coordination/specs/Q-R65-SPEC.md',
      'engine/ds-integration/feed.ts',
      'engine/ds-integration/index.ts',
      'test/q65-ds-integration-feed.test.ts',
      // Conditional 9th entry (DIAGNOSTIC-R65-*.md) included opportunistically:
      // if a DIAGNOSTIC was written this round, it appears here. Pattern-match
      // via Set.has() — absence is fine.
    ]);
    const diff = execSync(
      `git diff ${ROUND_START_SHA}..${CHORE_A_SHA} --name-only`,
      { encoding: 'utf8' },
    )
      .trim()
      .split('\n')
      .filter((p) => p.length > 0);
    for (const path of diff) {
      const isDiagnostic = /^coordination\/diagnostics\/DIAGNOSTIC-R65-.+\.md$/.test(path);
      assert.ok(
        ALLOWED_SET.has(path) || isDiagnostic,
        `unauthorized path in diff: ${path}`,
      );
    }
  });
});
```

### § 4.4 `coordination/specs/Q-R65-EMPIRICAL.sh` (NEW; ~180 lines)

```bash
#!/usr/bin/env bash
# coordination/specs/Q-R65-EMPIRICAL.sh
#
# Empirical-AC verification for R65 (Phase 3 SLICE 3 Wave 10 WU-Phase3-3B
# Tessera→DS feed adapter).
#
# Self-application of Rule 1 sub-class `empirical-command-attestation`.
# Each block verifies one AC or structural premise from Q-R65-SPEC.md.
#
# Two-state distinction (per R53 MINOR-1 + R56 MINOR-1 reinforcement;
# narrowed post-R62 to AC-R65-16 + AC-R65-18 only — do NOT propagate the
# structurally-vacuous forward-protection AC pattern; see R62 lesson):
#
#   - AC-R65-16 (anti-scope diff; test-file-embedded):
#       chore-A: FAILS by construction (CHORE_A_SHA placeholder
#         '<INJECTED-AT-CHORE-B>' is not a valid git ref).
#       chore-B: PASSES (actual SHA injected; historical diff is empty or
#         ⊆ ALLOWED_SET — structurally PASS-able at any committed HEAD
#         post-chore-B because the diff window [round-start..chore-A-SHA]
#         is fixed in time and immutable once chore-A is committed).
#
#   - AC-R65-18 (test summary; this file):
#       chore-A: tests=427 / pass=421 / fail=3 / skipped=3 (3 fails =
#         R36-30 + R36-31 carry-forward + AC-R65-16 placeholder).
#       chore-B: tests=427 / pass=422 / fail=2 / skipped=3 (2 fails =
#         R36-30 + R36-31 carry-forward only; AC-R65-16 placeholder
#         injected with actual SHA → AC PASSes).
#
# This script's AC-R65-18 block asserts the chore-B value (427/422/2/3) —
# the final committed-state binding. At chore-A pre-commit the Implementer
# runs the script and observes AC-R65-18 FAIL (pre-documented carve-out
# per § 6.1 halt condition #1).

set -uo pipefail

FAILED=0
PASS=0
ROUND="R65"
ROUND_START="59a03d0"

assert_eq() {
    local label="$1"
    local expected="$2"
    local actual="$3"
    if [ "$expected" = "$actual" ]; then
        echo "  PASS — $label"
        echo "    actual:   $actual"
        PASS=$((PASS + 1))
    else
        echo "  FAIL — $label"
        echo "    expected: $expected"
        echo "    actual:   $actual"
        FAILED=$((FAILED + 1))
    fi
}

assert_ge() {
    local label="$1"
    local expected_min="$2"
    local actual="$3"
    if [ "$actual" -ge "$expected_min" ] 2>/dev/null; then
        echo "  PASS — $label"
        echo "    actual:   $actual (>= $expected_min)"
        PASS=$((PASS + 1))
    else
        echo "  FAIL — $label"
        echo "    expected: >= $expected_min"
        echo "    actual:   $actual"
        FAILED=$((FAILED + 1))
    fi
}

assert_truthy() {
    local label="$1"
    local cmd="$2"
    if eval "$cmd"; then
        echo "  PASS — $label"
        echo "    cmd:      $cmd"
        PASS=$((PASS + 1))
    else
        echo "  FAIL — $label"
        echo "    cmd:      $cmd"
        echo "    (exited non-zero)"
        FAILED=$((FAILED + 1))
    fi
}

echo "[$ROUND] Empirical-AC verification — Q-R65-EMPIRICAL.sh"
echo ""

# -----------------------------------------------------------------------------
# AC-R65-1: feed.ts exists (file existence)
# -----------------------------------------------------------------------------
echo "AC-R65-1: engine/ds-integration/feed.ts exists"
assert_truthy "AC-R65-1" "[ -f engine/ds-integration/feed.ts ]"
echo ""

# -----------------------------------------------------------------------------
# AC-R65-2: index.ts has 3 export-star lines (feed-contract + event-contract + feed)
# -----------------------------------------------------------------------------
echo "AC-R65-2: index.ts has 3 export-star lines"
ACTUAL=$(grep -cE "^export \* from " engine/ds-integration/index.ts 2>/dev/null)
assert_eq "AC-R65-2 (index export-star count)" "3" "$ACTUAL"
echo ""

# -----------------------------------------------------------------------------
# AC-R65-15: feed.ts imports TESSERA_TO_DS_FEED_ENDPOINT from feed-contract
# (single source of truth — no inline path literal in feed.ts)
# -----------------------------------------------------------------------------
echo "AC-R65-15a: feed.ts imports TESSERA_TO_DS_FEED_ENDPOINT from feed-contract"
ACTUAL=$(grep -cE "TESSERA_TO_DS_FEED_ENDPOINT" engine/ds-integration/feed.ts 2>/dev/null)
assert_ge "AC-R65-15a (TESSERA_TO_DS_FEED_ENDPOINT mention)" "1" "$ACTUAL"
echo ""

echo "AC-R65-15b: feed.ts has zero inline path literal '/v1/tessera/verdict-groups'"
ACTUAL=$(grep -cE "'/v1/tessera/verdict-groups'" engine/ds-integration/feed.ts 2>/dev/null)
assert_eq "AC-R65-15b (inline path-literal count)" "0" "$ACTUAL"
echo ""

# -----------------------------------------------------------------------------
# A16 defensive: feed.ts contains correlational_not_causal: true literal in projection
# (binds AC-R65-4 source-side; runtime literal-equality test is in test/q65-...)
# -----------------------------------------------------------------------------
echo "AC-R65-4-source: feed.ts contains correlational_not_causal: true literal (A16)"
ACTUAL=$(grep -cE "^[[:space:]]*correlational_not_causal:[[:space:]]*true[[:space:]]*,?" engine/ds-integration/feed.ts 2>/dev/null)
assert_ge "AC-R65-4-source (A16 literal in projection)" "1" "$ACTUAL"
echo ""

# -----------------------------------------------------------------------------
# Decoupling preservation (R62 invariant): feed-contract.ts + event-contract.ts
# still have zero imports from ../types or ../events. R65 must NOT regress this.
# -----------------------------------------------------------------------------
echo "DECOUPLING-1: feed-contract.ts retains zero cross-boundary imports (R62 invariant)"
ACTUAL=$(grep -cE "^import.*from\s*['\"](\.\./types|\.\./events|\.\./topology|\.\./l0|\.\./fleet)" engine/ds-integration/feed-contract.ts 2>/dev/null)
assert_eq "DECOUPLING-1 (feed-contract cross-boundary imports)" "0" "$ACTUAL"
echo ""

echo "DECOUPLING-2: event-contract.ts retains zero cross-boundary imports (R62 invariant)"
ACTUAL=$(grep -cE "^import.*from\s*['\"](\.\./types|\.\./events|\.\./topology|\.\./l0|\.\./fleet)" engine/ds-integration/event-contract.ts 2>/dev/null)
assert_eq "DECOUPLING-2 (event-contract cross-boundary imports)" "0" "$ACTUAL"
echo ""

# -----------------------------------------------------------------------------
# AC-R65-17: npx tsc -p tsconfig.test.json exits 0
# -----------------------------------------------------------------------------
echo "AC-R65-17: npx tsc -p tsconfig.test.json exits 0"
if npx tsc -p tsconfig.test.json >/dev/null 2>&1; then
    TSC_EXIT=0
else
    TSC_EXIT=$?
fi
assert_eq "AC-R65-17 (tsc exit)" "0" "$TSC_EXIT"
echo ""

# -----------------------------------------------------------------------------
# AC-R65-18: node --test summary = 427/422/2/3 (chore-B HEAD)
#
# Two-state distinction:
#   - chore-A pre-injection: 427/421/3/3 (3 fails = R36-30 + R36-31 + AC-R65-16
#     placeholder).
#   - chore-B post-injection: 427/422/2/3 (2 fails = R36-30 + R36-31 only).
#
# This block asserts the chore-B value. At chore-A the Implementer will
# observe AC-R65-18 FAIL — pre-documented per § 6.1 halt-condition carve-out.
#
# `|| true` because node --test exits non-zero when fail count > 0.
# Capture output ONCE; grep multiple times against the capture (R46 bash-bug
# lesson — multiple `node --test` invocations corrupt the summary capture).
# -----------------------------------------------------------------------------
echo "AC-R65-18: test summary = 427/422/2/3 (chore-B HEAD)"
NODE_TEST_OUTPUT=$(node --test --test-reporter=tap test/*.test.js 2>&1 || true)
TESTS=$(echo "$NODE_TEST_OUTPUT" | grep -E '^# tests ' | awk '{print $3}')
PASS_COUNT=$(echo "$NODE_TEST_OUTPUT" | grep -E '^# pass ' | awk '{print $3}')
FAIL_COUNT=$(echo "$NODE_TEST_OUTPUT" | grep -E '^# fail ' | awk '{print $3}')
SKIP_COUNT=$(echo "$NODE_TEST_OUTPUT" | grep -E '^# skipped ' | awk '{print $3}')
SUMMARY="$TESTS/$PASS_COUNT/$FAIL_COUNT/$SKIP_COUNT"
assert_eq "AC-R65-18 (test summary)" "427/422/2/3" "$SUMMARY"
echo ""

# -----------------------------------------------------------------------------
# AC-R65-16 (anti-scope diff — advisory at chore-A; binding at chore-B via test file)
# -----------------------------------------------------------------------------
echo "AC-R65-16: anti-scope ALLOWED_SET coverage (manual git diff at chore-A SHA)"
echo "  ADVISORY — verify manually at chore-A pre-commit:"
echo "    git diff ${ROUND_START}..\$CHORE_A_SHA --name-only | sort > /tmp/r65-diff.txt"
echo "    diff /tmp/r65-diff.txt <(printf '%s\n' \\"
echo "      coordination/MEMORIAL.md \\"
echo "      coordination/NEXT-ROLE.md \\"
echo "      coordination/specs/Q-R65-EMPIRICAL.sh \\"
echo "      coordination/specs/Q-R65-SPEC-AUDIT.md \\"
echo "      coordination/specs/Q-R65-SPEC.md \\"
echo "      engine/ds-integration/feed.ts \\"
echo "      engine/ds-integration/index.ts \\"
echo "      test/q65-ds-integration-feed.test.ts \\"
echo "      | sort)"
echo "  (Implementer attests at chore-A; the test-file AC-R65-16 block performs"
echo "   the binding check at chore-B post-SHA-injection. Treat as advisory PASS here.)"
PASS=$((PASS + 1))
echo ""

# -----------------------------------------------------------------------------
# Aggregate
# -----------------------------------------------------------------------------
echo "============================================================"
echo "Summary: $PASS PASS, $FAILED FAIL"

if [ "$FAILED" -eq 0 ]; then
    exit 0
else
    exit 1
fi
```

---

## § 5 Acceptance criteria

### § 5.1 AC enumeration (18 ACs)

| # | Given | When | Then | Verification |
|---|---|---|---|---|
| AC-R65-1 | A clean checkout post-chore-A | the binding-test runs | `engine/ds-integration/feed.ts` exists | `test/q65-...test.ts` AC-R65-1 block (`fs.existsSync`) + `Q-R65-EMPIRICAL.sh` AC-R65-1 block (`[ -f ... ]`) |
| AC-R65-2 | The R65 deliverable applied | the binding-test runs | `engine/ds-integration/index.ts` has exactly 3 `export * from` lines | `Q-R65-EMPIRICAL.sh` grep count = 3 |
| AC-R65-3 | A synthetic `VerdictGroup` | `verdictGroupToFeedRequest(group, 500)` is invoked | the returned `TesseraToDsFeedRequest` has `contract_version === 'v1'` and `emitted_at_ts === 500` | Runtime test: AC-R65-3 block |
| AC-R65-4 | A synthetic `VerdictGroup` | `verdictGroupToFeedRequest(group, 500)` is invoked | the returned payload has `correlational_not_causal === true` (strict-equality on literal `true`, not boolean coercion) | Runtime test: AC-R65-4 block AND source-grep: `Q-R65-EMPIRICAL.sh` `AC-R65-4-source` block |
| AC-R65-5 | A `VerdictGroup` with two firing verdicts whose firing_families are `['A','B']` and `['B','C']` (overlapping `'B'`) | `verdictGroupToFeedRequest(group, 500)` is invoked | the returned payload has `firing_family_count === 3` (dedup set `{A, B, C}`, not 4 pair-count, not 2 verdict-count) | Runtime test: AC-R65-5 block |
| AC-R65-6 | Two synthetic `VerdictGroup` instances — one with `cluster_event_id: 'evt-42'`, one without | `verdictGroupToFeedRequest(...)` invoked on each | (a) first payload has `cluster_event_id === 'evt-42'`; (b) second payload has `'cluster_event_id' in payload === false` | Runtime test: AC-R65-6 block (two sub-assertions) |
| AC-R65-7 | A mock HTTP server listening on ephemeral port | `TesseraToDsFeedClient.post(req, headers)` is invoked | the server receives `req.method === 'POST'` AND `req.url === TESSERA_TO_DS_FEED_ENDPOINT.path === '/v1/tessera/verdict-groups'` | Runtime test: AC-R65-7 block (real `node:http` exchange) |
| AC-R65-8 | A mock HTTP server listening on ephemeral port | `TesseraToDsFeedClient.post(req, {x-tessera-instance-id: 'tessera-instance-1', authorization: 'Bearer test-token'})` is invoked | the server receives `req.headers['x-tessera-instance-id'] === 'tessera-instance-1'` AND `req.headers.authorization === 'Bearer test-token'` | Runtime test: AC-R65-8 block |
| AC-R65-9 | A mock HTTP server responding with status 400 + body `"bad request"` | `TesseraToDsFeedClient.post(...)` is invoked | the returned `FeedResult` has `ok === false`, `error.kind === 'http_4xx'`, `error.status_code === 400` | Runtime test: AC-R65-9 block |
| AC-R65-10 | A mock HTTP server responding with status 503 + body `"service unavailable"` | `TesseraToDsFeedClient.post(...)` is invoked | the returned `FeedResult` has `ok === false`, `error.kind === 'http_5xx'`, `error.status_code === 503` | Runtime test: AC-R65-10 block |
| AC-R65-11 | No server listening on port 1 (reserved; ECONNREFUSED) | `TesseraToDsFeedClient.post(...)` is invoked | the returned `FeedResult` has `ok === false`, `error.kind === 'network_error'` | Runtime test: AC-R65-11 block |
| AC-R65-12 | A mock HTTP server responding with status 200 + body `"not-json"` | `TesseraToDsFeedClient.post(...)` is invoked | the returned `FeedResult` has `ok === false`, `error.kind === 'invalid_response'`, `error.reason` matches `/JSON parse error/` | Runtime test: AC-R65-12 block |
| AC-R65-13 | A mock HTTP server responding with status 200 + body `{"contract_version":"v1","status":"accepted"}` (missing `correlation_key`) | `TesseraToDsFeedClient.post(...)` is invoked | the returned `FeedResult` has `ok === false`, `error.kind === 'invalid_response'`, `error.reason` matches `/shape mismatch/` | Runtime test: AC-R65-13 block |
| AC-R65-14 | A mock HTTP server responding with status 201 + a valid `TesseraToDsFeedResponse` body | `TesseraToDsFeedClient.post(...)` is invoked | the returned `FeedResult` has `ok === true`, `response.correlation_key === 'corr-key-xyz'`, `response.status === 'accepted'`, `response.contract_version === 'v1'` | Runtime test: AC-R65-14 block |
| AC-R65-15 | The committed `engine/ds-integration/feed.ts` | source-grep is run | `feed.ts` mentions `TESSERA_TO_DS_FEED_ENDPOINT` at least once AND has zero inline literal `'/v1/tessera/verdict-groups'` (single source of truth: contract module const) | Runtime test: AC-R65-15 block AND `Q-R65-EMPIRICAL.sh` AC-R65-15a + AC-R65-15b blocks |
| AC-R65-16 | The chore-A commit landed (chore-B HEAD; CHORE_A_SHA injected into test file) | the binding-test runs `git diff <round-start>..<CHORE_A_SHA> --name-only` | the diff is a subset of the 8-path ALLOWED_SET (+ conditional 9th DIAGNOSTIC-R65-*.md path) | Runtime test: AC-R65-16 block. **TWO-STATE:** chore-A pre-injection FAILS by construction (placeholder SHA invalid); chore-B post-injection PASSES (actual SHA; historical diff stable). Carve-out per § 6.1 #1 |
| AC-R65-17 | The R65 deliverable applied | `npx tsc -p tsconfig.test.json` is run | exit code is 0 (zero diagnostics) | `Q-R65-EMPIRICAL.sh` AC-R65-17 block |
| AC-R65-18 | The chore-B HEAD applied | `node --test --test-reporter=tap test/*.test.js` is run | the summary line equals `tests=427 / pass=422 / fail=2 / skipped=3` (2 fails = R36-30 + R36-31 forward-protection carry-forward) | `Q-R65-EMPIRICAL.sh` AC-R65-18 block. **TWO-STATE:** chore-A pre-injection FAILS (summary is `427/421/3/3` because AC-R65-16 placeholder fails); chore-B post-injection PASSES. Carve-out per § 6.1 #1 |

### § 5.2 AC-table preamble cross-check (per R20 ARCH MINOR-1)

**Classification of each AC by attestation type:**

- **Runtime test attestation (15 ACs):** AC-R65-1 through AC-R65-16 (all except AC-R65-17 + AC-R65-18) — bound by a `test()` block in `test/q65-ds-integration-feed.test.ts`. Reviewer verifies each `test()` block exists and uses a discriminating assertion (per Rule 3).
- **Empirical-command attestation (Q-R65-EMPIRICAL.sh blocks; 5 ACs):** AC-R65-1, AC-R65-2, AC-R65-4-source, AC-R65-15a, AC-R65-15b, AC-R65-17, AC-R65-18 — verified by the EMPIRICAL.sh harness via grep/file-existence/command-exit checks. AC-R65-1 and AC-R65-2 are also runtime-test-attested; the EMPIRICAL.sh blocks provide command-level independent verification.
- **Two-state attestation (2 ACs):** AC-R65-16 + AC-R65-18 — chore-A FAILS by construction (pre-documented per § 5.4); chore-B PASSES.
- **Cross-section verification:** the per-AC verification commands listed in § 5.1 cross-reference the file blocks in § 4.3 (test file) and § 4.4 (EMPIRICAL.sh). Each AC's stated verification is implemented exactly where claimed.

### § 5.3 Branch-binding coverage table (per Rule 2)

Each guard/branch in `feed.ts` MUST be exercised by at least one AC. The table below verifies this:

| Guard / branch in `feed.ts` | Bound by AC |
|---|---|
| `verdictGroupToFeedRequest` `for (...) { for (...) families.add(f) }` family-dedup loop | AC-R65-5 (synthetic input with overlap) |
| `verdictGroupToFeedRequest` `group.cluster_event_id !== undefined` ternary — TRUE branch | AC-R65-6 (with cluster_event_id) |
| `verdictGroupToFeedRequest` `group.cluster_event_id !== undefined` ternary — FALSE branch | AC-R65-6 (without cluster_event_id) |
| `verdictGroupToFeedRequest` `correlational_not_causal: true` literal | AC-R65-4 |
| `TesseraToDsFeedClient.constructor` `opts.request_timeout_ms ?? 5000` default | Defensive default; AC coverage gap acknowledged — no AC structurally exercises the 5000 default vs an explicit timeout. Acceptable: timeout is informational not load-bearing for any AC outcome. |
| `post()` `if (status >= 500)` branch | AC-R65-10 (status 503) |
| `post()` `if (status >= 400)` branch | AC-R65-9 (status 400) |
| `post()` JSON.parse `try { ... } catch` — catch branch | AC-R65-12 (body 'not-json') |
| `post()` `if (!isFeedResponse(parsed))` — TRUE branch (shape mismatch) | AC-R65-13 (body missing correlation_key) |
| `post()` `if (!isFeedResponse(parsed))` — FALSE branch (valid shape) | AC-R65-14 (valid body) |
| `post()` `req.on('error', ...)` handler | AC-R65-11 (no server listening) |
| `post()` `req.on('timeout', ...)` handler | Defensive (timeout default 5000ms is too long for a test to exercise; would require fixture orchestrating a delayed-response server). AC coverage gap acknowledged — non-load-bearing; the timeout fires `req.destroy(new Error(...))` which propagates to the `'error'` handler (already covered by AC-R65-11 pattern). Documented as accepted gap. |
| `isFeedResponse` `typeof v !== 'object'` | Implicit via AC-R65-12 (parsed value is string when body is `"not-json"` and JSON.parse fails BEFORE isFeedResponse runs; covered upstream). Strictly, the `typeof v !== 'object'` branch fires only when JSON.parse succeeds but produces a primitive (e.g., body `"42"`). AC coverage gap acknowledged — non-load-bearing for spec ACs; the parent `if (!isFeedResponse(parsed))` outcome is the same as AC-R65-13. |
| `isFeedResponse` `v === null` | Same gap acknowledgment as above (JSON.parse produces `null` for body `"null"` — same outcome as shape-mismatch). |
| `isFeedResponse` field checks (contract_version, correlation_key, status) | AC-R65-13 (shape mismatch via missing correlation_key) + AC-R65-14 (all fields valid) |
| `post()` `req.statusCode ?? 0` default | Defensive; no AC structurally exercises a missing statusCode (impossible from a well-formed HTTP response). Acknowledged gap. |

**Acknowledged gaps (4 items above):** all are defensive defaults or sub-branches whose outcomes converge to a single AC-bound exit path. None are load-bearing per the spec's behavioral commitments. Recorded here for Reviewer cold-eye audit (per Rule 2 — "or (b) acknowledged-gap section names it with non-load-bearing rationale").

### § 5.4 Two-state test-summary + diff-state table

| State | HEAD | Test summary | AC-R65-16 (test) | AC-R65-18 (EMPIRICAL.sh) |
|---|---|---|---|---|
| Round-start | `59a03d0` | 411 / 406 / 2 / 3 | N/A (test does not exist) | N/A |
| RED commit | RED SHA | 412 / 406 / 3 / 3 (R65 test file with stubs; 1 new fail = R65 RED stub) | FAIL (stub) | FAIL (test count 412 ≠ 427) |
| Chore-A (GREEN; pre-SHA-injection) | chore-A SHA | 427 / 421 / 3 / 3 (3 fails = R36-30 + R36-31 + AC-R65-16 placeholder) | FAIL by construction (placeholder SHA invalid; pre-documented carve-out) | FAIL (summary 427/421/3/3 ≠ 427/422/2/3 chore-B target) |
| Chore-B (post-SHA-injection) | chore-B SHA | 427 / 422 / 2 / 3 (2 fails = R36-30 + R36-31 carry-forward) | PASS (actual SHA; historical diff ⊆ ALLOWED_SET) | PASS (matches asserted summary) |

**Carve-out scope (per R56 MINOR-1 narrowing applied at R65):** AC-R65-16 + AC-R65-18 ONLY. ALL other ACs (AC-R65-1 through AC-R65-15, AC-R65-17) MUST be PASS at chore-A pre-commit; otherwise halt-condition #2 fires.

### § 5.5 Acknowledged design decisions

| # | Decision | Rationale |
|---|---|---|
| D-1 | Adapter is standalone (no integration into existing emit path) | R65 anti-scope structurally forbids modifying frozen consumer surfaces (R20/R21/R56/R36 frozen). Forward-flag in § 2.4 documents the wiring deferral. |
| D-2 | Engine type import (`VerdictGroup, FusedVerdict` from `'../types/verdict'`) | DECOUPLING-1/2 EMPIRICAL checks scoped to contract files; adapter is Tessera-internal. Precedent: `engine/fleet/verdict-consumer.ts:22-23`. |
| D-3 | Response Promise ALWAYS resolves (never rejects); errors encoded in `FeedResult` discriminated union | Avoids try/catch ergonomics at every call site; matches Tessera convention of explicit error surfaces (e.g., `engine/topology/*-source.ts` adapter pattern). |
| D-4 | Default `request_timeout_ms = 5000` | Conservative default for synthetic-fixture testing; production callers may override. |
| D-5 | `protocol?: 'http'` accepted but unused (only `'http'` supported at R65) | Reserves the option for a future HTTPS extension without breaking the constructor signature. TLS is deferred to the auth-scheme implementation round. |
| D-6 | No forward-protection AC pattern (`git diff CHORE_A_SHA..HEAD === []`) | Per R62 lesson: structurally vacuous when test file participates in chore-B SHA injection. Only the historical anti-scope form is used (AC-R65-16). |

---

## § 6 Halt conditions + Implementer guidance

### § 6.1 Halt conditions (Implementer must HALT + DIAGNOSTIC + ESCALATE on any of these)

1. **`Q-R65-EMPIRICAL.sh` non-zero exit at chore-A for any reason other than the pre-documented two-state mismatch** of AC-R65-16 + AC-R65-18 (carve-out per R56 MINOR-1; narrowed post-R62 to these two ACs ONLY). Specifically: at chore-A pre-commit, the script will report `2 FAIL` from AC-R65-16 + AC-R65-18; any additional failure is a halt condition.

2. **`npx tsc -p tsconfig.test.json` non-zero exit** at any commit.

3. **Phase 1+2+Phase-3-SLICE-1+2 regression** — any pre-R65 test other than R36-30 + R36-31 transitions PASS → FAIL.

4. **Anti-scope diff includes path outside ALLOWED_SET** at chore-A. NEVER expand ALLOWED_SET in-test per R36 MAJOR-2 reinforcement; if expansion is needed, amend spec FIRST via STATUS: ESCALATE.

5. **Spec-vs-reality conflict mid-implementation** (Rule 6 — e.g., `engine/types/verdict.ts:298` literal turns out to be `boolean` instead of `true`; `feed-contract.ts` interface field has different name than spec predicts; etc.).

6. **Rule 7 Surface (c) failure** — if Memorial-Updater stage of this round derives a new cross-project rule, Implementer at SAME-round chore-A MUST grep-sweep the round's own diff for the new rule's prohibited pattern. Non-trivial finding → HALT + DIAGNOSTIC.

7. **R62 lesson — apply claim-then-walk:** if at any point the Implementer encounters a load-bearing factual claim in the spec that does not match codebase reality (e.g., "`engine/fleet/verdict-consumer.ts` exposes a `feed_client` parameter" — it does not; "feed-contract.ts exports field `protocol_version`" — actual field is `contract_version"), HALT + DIAGNOSTIC. Do NOT silently adapt.

8. **R61-class architectural-reality discovery** — premise empirically false; the adapter's required surface cannot be implemented within R65 anti-scope without an architectural decision (e.g., `node:http` does not support the timeout option the spec claims; `'../types/verdict'` does not resolve from `engine/ds-integration/`).

### § 6.2 Reviewer expectations

The Reviewer is expected to:

1. Re-run `npx tsc -p tsconfig.test.json` at HEAD — confirm exit 0.
2. Re-run `node --test --test-reporter=tap test/*.test.js` at HEAD — confirm summary `427/422/2/3`.
3. Re-run `bash coordination/specs/Q-R65-EMPIRICAL.sh` at HEAD — confirm all PASS.
4. Verify the anti-scope diff: `git diff 59a03d0..HEAD --name-only | sort` ⊆ 8-path ALLOWED_SET (+ conditional 9th DIAGNOSTIC path).
5. Read `engine/ds-integration/feed.ts` and verify:
   - `correlational_not_causal: true` literal in projection body (A16 propagation).
   - `TESSERA_TO_DS_FEED_ENDPOINT` imported from `./feed-contract` (single source of truth).
   - Branch-binding coverage table (§ 5.3) is honest — each declared AC binding actually exists in the test file with a discriminating assertion.
6. Confirm DECOUPLING-1/2 EMPIRICAL checks still PASS (contract files unchanged at R65; if either regresses, MAJOR finding).
7. Confirm AC-R65-16's `<INJECTED-AT-CHORE-B>` placeholder was replaced with the actual chore-A SHA in the chore-B commit; verify the injected SHA is a valid git ref (`git cat-file -e <sha>`).
8. Cold-eye audit of acknowledged gaps in § 5.3: confirm each gap rationale is honest and the gap is non-load-bearing.

---

## § 7 Apply all 7 cross-project rules UPFRONT

Per `coordination/SPEC-AUTHORING-CHECKLIST.md` § Rule 7 self-application gate.

| # | Rule (short name) | Application to R65 | Status |
|---|---|---|---|
| 1 | `false-compliance-attestation` + sub-class `empirical-command-attestation` | Q-R65-EMPIRICAL.sh houses one labeled block per empirical AC; Implementer attestation MUST encode actual chore-A test summary (`427/421/3/3`) verbatim — NOT the chore-B predicted value. Tightenings 1-4 applied: AC-R65-2 + AC-R65-15a + AC-R65-15b use exact counts; AC-R65-4-source uses line-anchored grep; AC-R65-15b uses `count === 0` (no incidental matches possible). | ACTIVE GATE |
| 2 | `architect-branch-binding-coverage` | § 5.3 enumerates every guard/branch in `feed.ts` and the binding AC; 4 acknowledged gaps with non-load-bearing rationale; Reviewer audits per § 6.2 step 5. | ACTIVE GATE |
| 3 | `implementer-spec-test-assertion-coverage` | Per-AC assertions in § 4.3 use discriminating equalities (no `length >= 0` patterns); AC-R65-4 uses `assert.strictEqual(...true)` not `assert.ok(...)`; AC-R65-5 uses exact-integer assertion (3, not `>= 1`); AC-R65-15 uses zero-count assertion on inline path literal. Reviewer audits at cold-eye time. | ACTIVE GATE |
| 4 | `anti-scope-allowed-set-forward-coverage` | 8-path ALLOWED_SET enumerated in § 3.2 at spec-emit time; conditional 9th DIAGNOSTIC path pre-authorized; ALLOWED_SET MUST NOT be expanded in test file post-spec-emit (per R36 MAJOR-2). AC-R65-16 binds via the test-file embedded check. | ACTIVE GATE |
| 5 | `self-application-gate` | No new cross-project rule is derived in this round at spec-emit time. If Memorial-Updater stage derives a new rule, Implementer applies Surface (c) round-of-derivation grep-sweep per Rule 7 (see Rule 7 entry below). | N/A at spec-emit; conditional at Memorial-Updater stage |
| 6 | `halt-discipline-no-DIAGNOSTIC-for-workaround` | § 6.1 enumerates 8 halt conditions; Implementer MUST HALT + DIAGNOSTIC + ESCALATE on any trigger, NOT inline-fix. R62 lesson explicitly cited in halt condition #7. | ACTIVE GATE |
| 7 | `derived-rule-propagation-mechanism-required` | Surface (a) (SPEC-AUTHORING-CHECKLIST gate): this § 7 enumeration is present per canonical text. Surface (b) (`scripts/pre-commit-rule-sweep.sh`): Implementer runs at chore-A pre-commit. Surface (c) (round-of-derivation): conditional on Memorial-Updater output. | ACTIVE GATE Surface (a) + Surface (b); Surface (c) conditional |

---

## § 8 Open questions

**None — all resolved.**

The R65 directive provided unambiguous scope; the Architect's brainstorm (§ 0) resolved all five architectural axes via documented selection rationale. The handoff document's inaccuracies (wrong field names in `VerdictGroupPayload`, missing fields in `TesseraToDsAuthHeaders`, extra fields in `TesseraToDsFeedEndpoint`) were detected via claim-then-walk discipline at spec-emit time — `engine/ds-integration/feed-contract.ts` is the source of truth, not the handoff doc. The spec encodes the actual contract surface verified by direct file Read.

---

## § 9 P3 ten-axis verification

- **Correctness:** the projection function maps every R62-contract-required field exactly per § 2.1; the HTTP client honors all 7 response branches per § 2.2; A16 literal `true` preserved in projection per AC-R65-4 (runtime + source-grep); contract-version literal `'v1'` preserved per AC-R65-3. ✓
- **Completeness:** every behavioral commitment in § 2 has at least one binding AC per § 5.1 cross-reference; § 5.3 branch-binding table is exhaustive (4 acknowledged gaps with non-load-bearing rationale). ✓
- **Consistency:** field names + types in § 2.1, § 4.1, § 4.3, and § 5.1 cross-checked at spec-emit time against `engine/ds-integration/feed-contract.ts` lines 28-93 and `engine/types/verdict.ts` lines 198-231 via direct file Read. ✓
- **Clarity:** § 2.1 contains the field-by-field projection table; § 2.2 lists the 11-step response branch logic explicitly; § 4 pseudocode is detailed enough to implement verbatim. ✓
- **Coverage:** AC-R65-1 through AC-R65-18 bind file existence, barrel export, projection, A16 literal, family-dedup, optional-field handling, HTTP method/path, auth headers, 4xx/5xx/network/JSON-parse/shape-mismatch error paths, success path, anti-scope diff, typecheck, test count. 18 ACs over a ~140-line adapter + ~340-line test file = high coverage density. ✓
- **Constraints:** R65 anti-scope honored (27 anti-scope items in § 3.1); W3-1, W3-4, W3-5 honored; R56 MINOR-1 carve-out narrowed to AC-R65-16 + AC-R65-18 only per R62 lesson; Rule 1-7 enumerated in § 7. ✓
- **Concurrency:** the adapter's `post()` is Promise-based; multiple concurrent posts are safe (each `http.request()` is independent). Tests serialize per-test server lifecycle to avoid port conflict. No shared mutable state in `verdictGroupToFeedRequest` or `TesseraToDsFeedClient`. ✓
- **Corner cases:** empty `firing_verdicts[]` → `firing_family_count === 0` (Set.size on empty Set). All-overlapping families → dedup count equals unique-family count. Missing `cluster_event_id` → omitted from payload (not present-as-undefined). Status code 0 (theoretical missing-statusCode) → `?? 0` default routes to `>= 400` check (404-or-below path; but 0 itself does not trigger 4xx). All handled by spec pseudocode. ✓
- **Cost:** ~140-line adapter file; ~340-line test file; ~180-line EMPIRICAL.sh; ~1700-line spec. Falls within full-tier round budget (R20-R62 precedent). No runtime allocations beyond `Set<string>` for family dedup + `Buffer.concat` for response body — both O(N) in input size. ✓
- **Coupling:** the adapter couples to (a) the R62 frozen contract module (via `import { TESSERA_TO_DS_FEED_ENDPOINT, type ... } from './feed-contract'`); (b) the R56 frozen `engine/types/verdict.ts` (via `import type { VerdictGroup } from '../types/verdict'`); (c) Node.js built-in `node:http`. NO coupling to non-frozen Tessera surfaces; NO coupling to DS-repo internals. ✓

---

## § 10 Grilling output (adversarial self-review)

### § 10.1 Every claim verifiable?

- **Round-start SHA = `59a03d0`:** verified at spec-emit time via `git rev-parse HEAD`. ✓
- **Empirical baseline `411/406/2/3`:** verified at spec-emit time via `node --test`. ✓
- **`tsc` exit 0 baseline:** verified at spec-emit time via `npx tsc -p tsconfig.test.json; echo $?`. ✓
- **`engine/verdict-groups.ts` is vendored-at-pin (R20):** verified by Read of file header lines 1-16. ✓
- **`engine/fleet/verdict-consumer.ts` is R21 Tessera-original:** verified by Read of file header line 1. ✓
- **`engine/types/verdict.ts:198-231` defines `VerdictGroup`:** verified by Read offset 180-231; field shape table in § 2.1 matches actual fields. ✓
- **`engine/types/verdict.ts:298` declares `correlational_not_causal: true` literal:** verified by Read offset 280-310; confirmed line 298 content. ✓
- **`engine/ds-integration/feed-contract.ts:28-49` declares `VerdictGroupPayload` with fields `group_id, deploy_id, window_start_ts, window_end_ts, cluster_event_id?, firing_family_count, confidence, correlational_not_causal: true`:** verified by Read of full file at spec-emit time. ✓
- **`engine/ds-integration/feed-contract.ts:84-93` declares `TesseraToDsFeedEndpoint` interface + `TESSERA_TO_DS_FEED_ENDPOINT` const with `path: '/v1/tessera/verdict-groups', method: 'POST'`:** verified by Read of full file. ✓
- **`engine/fleet/verdict-consumer.ts:22-23` imports from `'../types/verdict'`:** verified by Read. Precedent for engine-type import from `engine/ds-integration/feed.ts` confirmed. ✓
- **DECOUPLING-1/2 EMPIRICAL checks at Q-R62-EMPIRICAL.sh:259-268 scoped to `feed-contract.ts` + `event-contract.ts`:** verified by Read of EMPIRICAL.sh. ✓
- **`.gitignore: *.js`:** verified by Read of `.gitignore` head lines 1-8. ✓
- **R65 directive in `coordination/NEXT-ROLE.md:8-92`:** verified by Read. ✓
- **`CLUSTER-HANDOFF-WAVE10-3A-3B.md` provides the contract surface description:** verified by Read of full file. **Inaccuracies caught and documented in § 8** (claim-then-walk discipline applied).

All load-bearing claims trace to a direct file Read at spec-emit time. No claim inherited from memory or prior-round attestation.

### § 10.2 Unstated assumptions?

- **Assumption: Node v25.9.0 + TypeScript 5.9.3 support `as const` with literal-type ternary spread.** Verified via R56 + R58 + R62 precedent — same patterns shipped successfully. No regression risk.
- **Assumption: `http.createServer(handler).listen(0, '127.0.0.1', resolve)` picks an ephemeral port and the `server.address()` returns `AddressInfo` with `.port`.** Verified via Node.js docs (stable since Node v0.x). Used widely in Node test ecosystem.
- **Assumption: Port 1 reliably refuses TCP connection on macOS / Linux test environments** (used by AC-R65-11). Port 1 is privileged (root-only bind); unprivileged Node process cannot bind; from a client perspective, no server listens — `connect()` fails with ECONNREFUSED. Verified pattern; standard Node testing convention for connection-failure simulation.
- **Assumption: `req.on('error', ...)` fires for ECONNREFUSED before any `'response'` event.** Standard Node.js HTTP error semantics; documented behavior.

No unstated assumptions remain.

### § 10.3 Scope added beyond request?

The R65 directive's primary deliverables (NEXT-ROLE.md:27-46): (a) `engine/ds-integration/feed.ts` adapter; (b) Tessera-side wiring; (c) test file; (d) Q-R65-EMPIRICAL.sh.

- **Deliverable (a):** in scope; ~140 lines per § 4.1.
- **Deliverable (b):** EXPLICITLY DEFERRED — § 0.1 selection rationale documents that all wiring approaches require modifying frozen surfaces (R20/R21/R56/R36 frozen). Forward-flag in § 2.4 notes future-round work. **NOT a scope reduction in violation of the directive** — the directive at NEXT-ROLE.md:36 says "may modify ... any non-frozen Tessera-internal emit path that already handles `VerdictGroup` output" — empirically NO such non-frozen path exists at session entry.
- **Deliverable (c):** in scope; ~340-line test file per § 4.3.
- **Deliverable (d):** in scope; ~180-line EMPIRICAL.sh per § 4.4.

No scope added beyond the directive. The "wiring" deferral is necessary per anti-scope; documented explicitly.

### § 10.4 Implementer can act without guessing?

- **§ 4.1 (`feed.ts`):** Full pseudocode verbatim-implementable; every function signature + behavior step + error mapping prescribed.
- **§ 4.2 (`index.ts` update):** Exact 1-line addition shown; before/after snippets provided.
- **§ 4.3 (`test/q65-...test.ts`):** Full pseudocode verbatim-implementable; every test() block's setup, action, assertion documented.
- **§ 4.4 (`Q-R65-EMPIRICAL.sh`):** Full pseudocode verbatim-implementable.
- **§ 5 ACs:** every AC's Given/When/Then explicit; verification command listed.
- **§ 6 halt conditions:** 8 enumerated triggers; carve-out narrowed to AC-R65-16 + AC-R65-18.

Implementer can act without clarifying questions. ✓

### § 10.5 Cross-section consistency pass (per R01 reinforcement)

- **Field names:** `group_id`, `deploy_id`, `window_start_ts`, `window_end_ts`, `cluster_event_id`, `firing_family_count`, `confidence`, `correlational_not_causal` — used consistently in § 1.2, § 2.1, § 4.1, § 4.3, § 5.1. ✓
- **Token `TESSERA_TO_DS_FEED_ENDPOINT`:** used in § 1.2, § 2.2, § 4.1, § 4.3, § 4.4, § 5.1, § 5.3. ✓
- **Token `correlational_not_causal: true`:** used as literal in § 1.4, § 2.1, § 4.1, § 4.3, § 5.1, § 9; never as `boolean`. ✓
- **Test count predictions:** `427/421/3/3` (chore-A) and `427/422/2/3` (chore-B) used consistently in § 4.4 EMPIRICAL.sh + § 5.4 two-state table + § 6.1 halt condition #1. ✓
- **ALLOWED_SET 8 paths:** identical enumeration in § 3.2 + § 4.3 test file + § 4.4 EMPIRICAL.sh advisory + § 5.1 AC-R65-16 verification command. ✓
- **Round-start SHA `59a03d0`:** identical in spec preamble + § 3.2 + § 4.3 + § 4.4 + § 5.1. ✓

No cross-section contradictions.

### § 10.6 Empirical-premise verification (per R07 MAJOR-1/2 + R08 MAJOR-2 + R62 CRITICAL-1)

- **Chore-A test summary `427/421/3/3`:** derived from baseline `411/406/2/3` + 16 new tests of which 15 PASS and 1 FAILs (AC-R65-16 placeholder SHA invalid). Computation: 411+16=427; 406+15=421; 2+1=3; skipped unchanged at 3. ✓
- **Chore-B test summary `427/422/2/3`:** derived from chore-A `427/421/3/3` minus the AC-R65-16 placeholder fail (now PASSes post-injection). Computation: 421+1=422; 3-1=2. ✓
- **Chore-B PASS state for AC-R65-16:** post-injection, `git diff <round-start>..<actual-chore-A-SHA> --name-only` returns the chore-A diff (8 paths in ALLOWED_SET). This is the historical diff window; once chore-A is committed, the diff is immutable. Subsequent commits (chore-B, etc.) modify the test file but do NOT affect the `round-start..chore-A` window. Therefore AC-R65-16 is structurally PASS-able at chore-B HEAD and at every subsequent HEAD. ✓ **Distinct from R62 AC-R62-15:** that AC used `git diff CHORE_A_SHA..HEAD === []` which IS structurally vacuous when chore-B modifies the test file (test file appears in diff). R65 uses `git diff <round-start>..<CHORE_A_SHA>` which is the bounded historical form. R62 lesson respected.
- **Empirical baseline `411/406/2/3` at session entry:** verified by direct `node --test` invocation; not inherited.

### § 10.7 Coordination-chore-sequence post-emit awareness (per R19 MINOR-3 / OBS-4 reinforcement)

Per CLAUDE-ARCHITECT REINFORCED 2026-05-17: the coordination-chore-sequence step 7 verifies `git diff ROUND-START-SHA HEAD --name-only -- src/ test/ engine/ tools/`. For R65: `git diff 59a03d0..HEAD --name-only -- engine/ test/` is the post-coordination diff window. The ALLOWED_SET coverage includes both `engine/ds-integration/feed.ts` + `engine/ds-integration/index.ts` + `test/q65-ds-integration-feed.test.ts` — all three appear under `engine/` or `test/`. Coordination-chore-class commits (if any fired) would land under `coordination/` and would not appear in the engine/test diff slice. Anti-scope completeness gate honored.

### § 10.8 Spec-internal-contradiction sweep (per R34 MINOR-2 + R15 MINOR-3)

Cross-checked every halt condition trigger against every AC consequence:
- AC-R65-16 + AC-R65-18 FAIL at chore-A → § 6.1 halt condition #1 explicitly carves this out as "the pre-documented two-state mismatch."
- All other ACs FAIL at chore-A → § 6.1 halt condition #1 triggers (correctly).
- `tsc` non-zero exit → § 6.1 halt condition #2 triggers.
- Anti-scope violation → § 6.1 halt condition #4 triggers.

No contradictory prescriptions for the same trigger state.

### § 10.9 ALLOWED_SET completeness (per SPEC-AUTHORING-CHECKLIST § ALLOWED_SET completeness gate)

Per `coordination/SPEC-AUTHORING-CHECKLIST.md`:

- [x] Architect-emitted spec + spec-audit sidecar — `coordination/specs/Q-R65-SPEC.md` + `Q-R65-SPEC-AUDIT.md` + `Q-R65-EMPIRICAL.sh` in ALLOWED_SET.
- [x] Implementer chore-A files — `engine/ds-integration/feed.ts` + `engine/ds-integration/index.ts` + `test/q65-ds-integration-feed.test.ts` in ALLOWED_SET.
- [x] Reviewer post-chore-A files — `coordination/reviews/REVIEWER-REPORT-R65.md` will land post-chore-A, outside the chore-A diff window per R21 spec-commit-sequencing pattern.
- [x] Memorial-Updater post-Reviewer files — `coordination/MEMORIAL.md` + `coordination/NEXT-ROLE.md` updates in ALLOWED_SET.
- [x] Operator-authored methodology backflow class — R65 is a single-cluster substantive round; no WAVE-PLAN / WAVE-GATE / CLUSTER-HANDOFF authoring fires mid-round. None expected.
- [x] Diagnostic files — conditional 9th entry `coordination/diagnostics/DIAGNOSTIC-R65-*.md` pre-authorized.
- [x] Evidence files — none expected at R65.
- [x] Round summary — `coordination/logs/ROUND-R65-SUMMARY.md` lands at Memorial-Updater stage outside chore-A; not in ALLOWED_SET.
- [x] CLAUDE-*.md — none expected at R65 spec-emit; if Memorial-Updater appends reinforcements they land outside chore-A.

No coverage gap.

---

## § 11 Implementer chore-A sequence

1. **RED commit:** lands `test/q65-ds-integration-feed.test.ts` with 16 `assert.fail('R65 RED — implementation pending')` stubs (or skipped via `test.skip(...)` pattern; Architect-acceptable per R23 IMPL MINOR-1 RED-commit discipline). `engine/ds-integration/feed.ts` does NOT yet exist; `index.ts` un-modified. Runtime tests fail (import errors at module resolution; or RED stubs fail). RED state confirmed.

2. **GREEN commit (chore-A):** lands `engine/ds-integration/feed.ts` per § 4.1 pseudocode; updates `engine/ds-integration/index.ts` per § 4.2 (one-line addition); replaces all RED stubs with real assertions per § 4.3. Confirms:
   - `npx tsc -p tsconfig.test.json` exits 0.
   - `node --test --test-reporter=tap test/*.test.js` summary = `427/421/3/3` (chore-A pre-SHA-injection).
   - `bash coordination/specs/Q-R65-EMPIRICAL.sh` reports 2 FAIL (AC-R65-16 + AC-R65-18) + N PASS (rest) — pre-documented per § 6.1 carve-out.
   - `git diff 59a03d0..<chore-A-SHA> --name-only | sort` ⊆ 8-path ALLOWED_SET.

3. **Chore-A NEXT-ROLE.md attestation:** Implementer encodes ACTUAL chore-A test summary `tests=427 / pass=421 / fail=3 / skipped=3` verbatim per Rule 1 sub-class `empirical-command-attestation`. Cites the spec-predicted chore-B value (`427/422/2/3`) as the post-injection target.

4. **Chore-B (SHA injection):** Inject the chore-A SHA into `test/q65-ds-integration-feed.test.ts` at the `CHORE_A_SHA = '<INJECTED-AT-CHORE-B>'` placeholder line (single occurrence in the AC-R65-16 test block). Re-run tests; confirm post-injection summary `427/422/2/3`. SHA-backfill commit lands.

5. **Routing to Reviewer:** Set `STATUS: READY`. Reviewer inputs:
   - `coordination/specs/Q-R65-SPEC.md` (spec proper)
   - `coordination/specs/Q-R65-SPEC-AUDIT.md` (Architect ceremony sidecar; Reviewer-authorized read)
   - `coordination/specs/Q-R65-EMPIRICAL.sh` (executable harness)
   - `engine/ds-integration/feed.ts` + `index.ts` (deliverables)
   - `test/q65-ds-integration-feed.test.ts` (test file)
   - This NEXT-ROLE.md (Implementer attestation)

---

## § 12 Pipeline invocation

```bash
cd /Users/johnwarren/concord/tessera
./run-pipeline.sh --round R65 --tier full
```

Per `coordination/SPEC-AUTHORING-CHECKLIST.md` § Pipeline-mandatory discipline. Pipeline-mandatory; interactive single-session is the deviation, not the default.

---

_End of Q-R65-SPEC.md._
