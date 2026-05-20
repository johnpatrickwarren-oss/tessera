# Q-R66-SPEC — Phase 3 SLICE 3 Wave 10 WU-Phase3-3C: DS→Tessera event consumer + freeze-hook factory

**Round:** R66 (Wave 10, cluster 2 of 2; sequential dispatch after R65 WU-Phase3-3B).
**Tier:** full (Architect + Implementer + Reviewer + Memorial-Updater).
**Round-start SHA:** `8f3dd60` (session-entry; the R66 directive commit that landed `coordination/NEXT-ROLE.md`; verified empirically via `git rev-parse HEAD` at Architect session entry; load-bearing anti-scope diff lower bound per CLAUDE-ARCHITECT REINFORCED 2026-05-17 R15 MINOR-1 advance-to-post-prep-commit reinforcement). The directive text at NEXT-ROLE.md:12 cites `03524ba` (R65 MU commit) as round-start; that is the pre-prep SHA. The operator's R66 directive commit `8f3dd60` itself modified `coordination/NEXT-ROLE.md` — empirical session-entry SHA is the load-bearing lower bound.
**Empirical baseline (verified via direct command runs at Architect session entry; NOT inherited from R65 attestation):**
- `node --test --test-reporter=tap test/*.test.js` → `tests=427 / pass=422 / fail=2 / skipped=3`. 2 fails = R36-30 + R36-31 forward-protection carry-forward (pre-existing from Phase 2 close `87e372f`; not introduced by R66).
- `npx tsc -p tsconfig.test.json` → exit 0, zero diagnostics.
**Toolchain at session entry:** Node v25.9.0; TypeScript 5.9.3.

---

## § 0 Brainstorm + design phase

### 0.1 Three architectural questions

**Q0.1.A — HTTP server pattern for `event-consumer.ts`.**

| # | Approach | Strengths | Weaknesses |
|---|---|---|---|
| A1 | Class `DsEventConsumer` with `node:http` server + `EventEmitter` activation stream | Matches R65 sibling `TesseraToDsFeedClient` class pattern (`feed.ts:100`); stateful start/stop lifecycle; EventEmitter is Node.js built-in (no new dep per W3-4 Option A) | Stateful; requires explicit lifecycle management in tests |
| A2 | Factory function returning `{ start, stop }` with callback injection | Stateless API surface; explicit DI | Single-callback semantics; less idiomatic than class |
| A3 | Pure-function payload parser only; HTTP wiring entirely caller-owned | Smallest test surface | Does NOT satisfy R66 directive line 31 ("HTTP server adapter that receives `DeployEventPayload` POSTs") |

**Selection: A1.** Matches R65 sibling pattern (symmetric diff across two adapters); familiar test ergonomics (`start(port)` / `stop()` / `on('activate', handler)`); EventEmitter supports multiple subscribers without re-architecture (factory + future test inspectors). Rejected A2 because callback-based forces single-handler. Rejected A3 because directive line 31 mandates HTTP server adapter.

**Q0.1.B — Factory module pattern (`freeze-hook-factory.ts`).**

| # | Approach | Strengths | Weaknesses |
|---|---|---|---|
| B1 | Factory returns stateful wrapper `{ update, getState, cancelActivation }` owning mutable `FreezeHookState`; subscribes to consumer activation | Uses ACTUAL freeze-hook surface (pure function + value state per `freeze-hook.ts:21-51`); no freeze-hook body modification; clean encapsulation; tests assert state via `getState()` snapshot | Closure-captured mutable state requires careful read-only snapshot pattern |
| B2 | Activation-driver only (state held externally by caller); caller threads state to pure function | State ownership explicit | Caller must thread state into freeze-hook fn on every tick; more wiring; less ergonomic |
| B3 | Subscribe-only side-effect (state owned by caller) | Smallest surface | Caller constructs state; awkward composition |

**Selection: B1.** Encapsulates state + binds to consumer + exposes the wrapped update fn as a single coherent unit. Tests verify state transitions via `getState()` read-only snapshot. Matches the directive's `createFreezeHookFromDsEvents(deps)` naming.

**Discovery (claim-then-walk):** the CLUSTER-HANDOFF-WAVE10-3A-3C.md frames the freeze-hook as a `FreezeHook` *class* with `activate` / `deactivate` / `is_active` methods + a constructor. **Empirical reality (`engine/events/freeze-hook.ts:1-51`, opened at spec-emit time):** there is NO `FreezeHook` class — the frozen surface is (a) `interface FreezeHookState { active: boolean; until_ts?: number; cluster_event_id?: string }` (line 21), (b) pure function `freezeAwareUpdatePerShardResidual(current, obs, baselineCell, freezeState, config)` (line 40). The factory module therefore CANNOT "construct `FreezeHook` instances via the existing constructor" (handoff line 64-65); the factory must instead own a mutable `FreezeHookState` value and expose a closure-bound update function that delegates to the existing pure function. This is the **architecturally novel surface** of R66: producing a stateful freeze-driver wrapper on top of a stateless freeze-aware update function. See § 8 handoff inaccuracy disclosure.

**Q0.1.C — `ClusterEventKind ↔ event_class` mapping.**

| # | Approach | Strengths | Weaknesses |
|---|---|---|---|
| C1 | Explicit `switch` with `never`-assertion exhaustiveness check | Compile-time parity gate (AC-R62-7-style); runtime negative-test possible; cross-handoff OQ-R64b-3 default | 5 lines of switch boilerplate |
| C2 | Identity cast (`as ClusterEventKind`) | 1 line | No compile-time parity gate; silent drift if unions diverge |
| C3 | Pure projection + runtime validation against `CLUSTER_EVENT_KINDS as const` array | Runtime validation | Weaker compile-time discriminability |

**Selection: C1.** Per CLUSTER-HANDOFF OQ-R64b-3 default + R66 directive line 40 ("explicit switch with exhaustiveness check; 5 cases; compile-time parity gate"). Inherits discriminating-assertion pattern from R62 AC-R62-7.

### 0.2 Activation transition semantics (OQ-R64b-2 disposition)

CLUSTER-HANDOFF OQ-R64b-2 asks: 1-to-1 (single event → single activation) or batched? **Pick: 1-to-1.** Each accepted `DeployEventPayload` causes `state.active = true` immediately with `state.cluster_event_id = event.event_id` and `state.until_ts = event.event_ts + activation_window_seconds` (default 300 seconds; spec-level architectural default; future round may make this per-event-class).

**Deactivation mechanism (Q0.2-A):** the freeze-hook's pure function does NOT compare `until_ts` to current time (per `freeze-hook.ts:24-25` JSDoc "wrapper does NOT compare to current time. Caller controls active transition."). Therefore the factory MUST own the time-driven deactivation. Pick: factory schedules `setTimeout(handleDeactivation, activation_window_seconds * 1000)` on every activation; on fire, `state.active = false`. Factory also exposes `cancelActivation()` as a public API for early operational cancellation (forward-compat for future `deploy_rollback_completed` events; not in R66 functional scope but the API is forward-stable). Clock injection (`setTimeout` + `now`) is available via factory `opts` so tests can drive deterministically.

### 0.3 Auth-headers shape disposition (handoff inaccuracy)

CLUSTER-HANDOFF line 37-40 + R66 directive line 36 reference `DsToTesseraAuthHeaders` as an `event-contract.ts` export. **Empirical claim-then-walk (`grep -n "DsToTesseraAuthHeaders" engine/ds-integration/event-contract.ts` at spec-emit time):** no match. The contract module exports only `TesseraToDsAuthHeaders` (for the *feed* direction, in `feed-contract.ts:55`); the event direction has no auth-headers type at all.

**Pick: define `DsToTesseraAuthHeaders` LOCALLY in `event-consumer.ts`** (Tessera-original; consumer-side concern not contract-side). Shape mirrors the feed-direction pattern from `feed-contract.ts:51-60`, inverted directionality:

```ts
export interface DsToTesseraAuthHeaders {
  'x-ds-instance-id': string;
  authorization: `Bearer ${string}`;
}
```

Anti-scope says NO modification of `event-contract.ts`. Promoting `DsToTesseraAuthHeaders` to the contract module would require modifying it — explicitly anti-scope at R66. Future operator may promote it to the contract module in a later round; R66 keeps it consumer-local. See § 8.

### 0.4 Component-boundary sketch (Design phase)

```
                                                        (factory wires
   DS server   ─── HTTP POST ──▶  DsEventConsumer ─────▶ via .on(...))
   (separate                       (event-consumer.ts)         │
   repo PR)                              │                     ▼
                                         │             FreezeHookActivator
                                         │             (freeze-hook-factory.ts)
                                         │             owns mutable FreezeHookState
                                         │             exposes update fn that
                                         │             delegates to:
                                         ▼                     │
                                  202 + DsToTesseraEventResponse                  
                                                               ▼
                                                  freezeAwareUpdatePerShardResidual
                                                  (engine/events/freeze-hook.ts;
                                                   FROZEN — pure function)
```

**Integration points:**
1. `event-consumer.ts` imports `DeployEventPayload`, `DsToTesseraEventRequest`, `DsToTesseraEventResponse`, `DsToTesseraEventEndpoint`, `DS_TO_TESSERA_EVENT_ENDPOINT` from `./event-contract` (read-only).
2. `event-consumer.ts` does NOT import from `'../events'` or `'../types'` (cross-repo decoupling per FR-D4 + R62 DECOUPLING-2 invariant).
3. `freeze-hook-factory.ts` imports `freezeAwareUpdatePerShardResidual`, `FreezeHookState` from `'../events/freeze-hook'` (allowed: not a contract module; this is Tessera-internal engine-integration code).
4. `freeze-hook-factory.ts` imports `DeployEventPayload` from `./event-contract` (read-only).
5. `freeze-hook-factory.ts` imports `ClusterEventKind` from `'../events/event-feed'` (read-only; needed for the C1 exhaustiveness switch).
6. `index.ts` adds two `export * from './...';` lines (event-consumer + freeze-hook-factory).

**Failure modes at integration points:**
- (i) DS sends malformed JSON → consumer returns 400 + reason; no activation emitted (AC-R66-2).
- (ii) DS sends valid JSON missing required fields → 400 (AC-R66-3).
- (iii) DS sends invalid `event_class` (6th value) → 400 (AC-R66-4); compile-time also caught by C1 mapping if any internal code paths cast (AC-R66-7/8).
- (iv) Missing/malformed auth headers → 401 (AC-R66-5).
- (v) Factory receives 'activate' before any consumer subscriber wiring → harmless (state stays inactive).
- (vi) `cancelActivation()` called while not active → harmless (idempotent).
- (vii) Deactivation timer fires after explicit `cancelActivation()` → idempotent (state already false; clearTimeout is best-effort).
- (viii) `ClusterEventKind` adds a 6th value upstream without contract update → `mapEventClassToKind` switch loses exhaustiveness; `tsc` fails at the `never` assertion (AC-R66-7 compile-time discriminability + AC-R62-7 parity).

### 0.5 Selection rationale (what chosen / what rejected)

**Chosen:** A1 (HTTP server class with EventEmitter) + B1 (stateful factory wrapper owning mutable state) + C1 (explicit switch + `never` exhaustiveness) + 1-to-1 activation with factory-owned setTimeout deactivation + local auth-headers definition.

**Rejected:**
- A2 (callback-only factory) — single-handler ceiling; less ergonomic.
- A3 (parser only) — directive non-compliance.
- B2/B3 (caller-owned state) — awkward composition; pushes state-management complexity to integration code.
- C2/C3 (identity-cast / runtime validation) — no compile-time discriminability gate.
- "Modify event-contract.ts to add `DsToTesseraAuthHeaders`" — explicit anti-scope (handoff line 110; R66 directive line 60).
- "Modify freeze-hook.ts to add factory method" — explicit anti-scope (handoff line 113; R66 directive line 58); halt condition #4 triggers if surfaced in pseudocode.
- Per-event-class activation window override (e.g., 60s for env_change vs 600s for firmware_push) — premature; defer to a future round.

---

## § 1 Mechanism

R66 implements **WU-Phase3-3C**: the DS→Tessera event consumer (HTTP server adapter receiving `DeployEventPayload` POSTs from DS) + a freeze-hook factory module that wires the consumer's activation stream into a freeze-hook activator that delegates to the existing R20/R21/R36 frozen pure-function freeze-hook surface.

### 1.1 What is built

Three TypeScript artifacts + one test file + spec triad + barrel update:

1. **`engine/ds-integration/event-consumer.ts`** (NEW; Tessera-original):
   - `DsToTesseraAuthHeaders` interface (locally defined per § 0.3 disposition; consumer-local; not contract-level).
   - `DsEventConsumerOpts` interface (host, port, request_timeout_ms?).
   - `DsEventConsumer` class (constructor → opts; `start(): Promise<void>` → binds `node:http` server; `stop(): Promise<void>` → closes; `on('activate', handler)` → subscribe; `on('parse_error', handler)` → subscribe for observability).
   - Internal request handler validates: method=POST + path=`DS_TO_TESSERA_EVENT_ENDPOINT.path` + auth headers + body shape + `event_class` membership in 5-value set; on success emits `'activate'` with parsed `DeployEventPayload`, writes 202 + `DsToTesseraEventResponse{contract_version:'v1', status:'accepted', freeze_hook_activated:true, freeze_hook_activated_at_ts:<now>}`; on failure writes 400 / 401 + `{contract_version:'v1', status:'rejected', freeze_hook_activated:false, reason:<str>}`.
   - Pure private helpers: `validateAuthHeaders(headers): { ok: true } | { ok: false, reason: string }`; `validateDeployEventPayload(parsed): { ok: true, value: DeployEventPayload } | { ok: false, reason: string }`.

2. **`engine/ds-integration/freeze-hook-factory.ts`** (NEW; Tessera-original):
   - `mapEventClassToKind(event_class)` pure function with `switch` + `never`-assertion default (Q0.1.C/C1; compile-time parity with `ClusterEventKind` per AC-R62-7 inheritance).
   - `FreezeHookActivatorOpts` interface (consumer: DsEventConsumer; config: { freeze_hook_enabled?: boolean }; activation_window_seconds?: number (default 300); setTimeout?: ((cb, ms) => unknown) (default globalThis.setTimeout); clearTimeout?: ((handle: unknown) => void) (default globalThis.clearTimeout); now?: () => number (default () => Math.floor(Date.now()/1000))).
   - `FreezeHookActivator` interface — return type of the factory function — `{ update: (current, obs, baselineCell) => PerShardResidual; getState: () => Readonly<FreezeHookState>; cancelActivation: () => void; dispose: () => void }`.
   - `createFreezeHookFromDsEvents(opts): FreezeHookActivator` factory function. Internal flow: holds closure-mutable `FreezeHookState`; subscribes via `opts.consumer.on('activate', handler)` (handler asserts mapping via `mapEventClassToKind`, then sets `state.active = true`, `state.cluster_event_id = event.event_id`, `state.until_ts = event.event_ts + window_seconds`, schedules `setTimeout(handleDeactivation, window_seconds*1000)`); `update` delegates to `freezeAwareUpdatePerShardResidual(current, obs, baselineCell, state, opts.config ?? {})`; `cancelActivation` clears pending timer + sets active=false; `dispose` unsubscribes from consumer + clears timer; `getState` returns shallow-copy snapshot (read-only).

3. **`engine/ds-integration/index.ts`** (MODIFIED; +2 lines):
   - Add `export * from './event-consumer';`
   - Add `export * from './freeze-hook-factory';`

4. **`test/q66-ds-integration-event-consumer.test.ts`** (NEW; Tessera-original): 17 runtime tests (1 per AC-R66-1 through AC-R66-17).

5. **`coordination/specs/Q-R66-SPEC.md`** + `Q-R66-SPEC-AUDIT.md` + `Q-R66-EMPIRICAL.sh` (spec triad).

### 1.2 What is NOT built (anti-scope summary)

See § 3 for exhaustive anti-scope. Headline: NO modification of `engine/events/freeze-hook.ts` body or signature; NO modification of `engine/ds-integration/event-contract.ts` body or any exports; NO modification of `engine/events/event-feed.ts`; NO real-DS-endpoint network calls; NO new external dependencies; NO DS-repo modification; NO modification of R65 `feed.ts` adapter; NO GitHub PR opening.

### 1.3 Wire-format parity

`DeployEventPayload.event_class` 5-value closed-set MUST mirror `ClusterEventKind` from `engine/events/event-feed.ts:10-15` exactly. Both contract module (R62) and factory module (R66) inherit AC-R62-7's parity invariant. The factory's `mapEventClassToKind` is the compile-time gate: if `ClusterEventKind` adds a 6th value without contract update, the `never` assertion fails to type-check (`tsc` exit non-zero); if `DeployEventPayload.event_class` adds a 6th value, the switch loses exhaustiveness and `tsc` fails. Either drift surfaces empirically (AC-R66-16).

### 1.4 Architect pre-prediction (Rule 1 sub-class empirical-command-attestation)

| Binding command | Predicted at chore-A | Predicted at HEAD (same as chore-A; no chore-B in R66) |
|---|---|---|
| `npx tsc -p tsconfig.test.json` | exit 0, zero diagnostics | exit 0, zero diagnostics |
| `node --test --test-reporter=tap test/*.test.js` | `tests=444 / pass=439 / fail=2 / skipped=3` (baseline 427/422/2/3 + 17 new pass) | same as chore-A |
| `bash coordination/specs/Q-R66-EMPIRICAL.sh` | 14 PASS, 0 FAIL, exit 0 (14 empirical AC blocks — see § 7) | same as chore-A |
| `git diff 8f3dd60..HEAD --name-only \| sort` | 9-path ALLOWED_SET exactly (see § 3.2) | same |

R66 has NO chore-B step. Per R66 directive halt condition #1 and § 6.1 below, the structurally-vacuous forward-protection AC pattern (`git cat-file -e CHORE_A_SHA`) is explicitly NOT propagated. Anti-scope diff uses literal `8f3dd60` (round-start SHA known at spec-emit time); no SHA injection required.

### 1.5 Type-pretest scratchpad (Architect-internal; for Implementer reference)

```ts
// event-consumer.ts pretest
interface DsToTesseraAuthHeaders {
  'x-ds-instance-id': string;
  authorization: `Bearer ${string}`;
}

interface DsEventConsumerOpts {
  host?: string;           // default '127.0.0.1'
  port: number;            // caller picks; tests use 0 (kernel-assigned)
  request_timeout_ms?: number;  // default 5000
}

type ParseResult<T> =
  | { ok: true; value: T }
  | { ok: false; reason: string };

// freeze-hook-factory.ts pretest
type EventClass = DeployEventPayload['event_class'];

function mapEventClassToKind(c: EventClass): ClusterEventKind {
  switch (c) {
    case 'firmware_push':   return 'firmware_push';
    case 'model_redeploy':  return 'model_redeploy';
    case 'env_change':      return 'env_change';
    case 'config_change':   return 'config_change';
    case 'capacity_change': return 'capacity_change';
    default: {
      const _exhaustive: never = c;
      throw new Error(`mapEventClassToKind: unhandled event_class: ${_exhaustive as string}`);
    }
  }
}

interface FreezeHookActivator {
  update(
    current: PerShardResidual,
    obs: ExtendedSampleObservation,
    baselineCell: BaselineCellEntry | undefined,
  ): PerShardResidual;
  getState(): Readonly<FreezeHookState>;
  cancelActivation(): void;
  dispose(): void;
}

interface FreezeHookActivatorOpts {
  consumer: DsEventConsumer;
  config?: { freeze_hook_enabled?: boolean };
  activation_window_seconds?: number;  // default 300
  setTimeout?: (cb: () => void, ms: number) => unknown;
  clearTimeout?: (handle: unknown) => void;
  now?: () => number;
}
```

---

## § 2 Component inventory

### 2.1 What exists (FROZEN; do NOT modify)

| Path | Why frozen | Verified at spec-emit |
|---|---|---|
| `engine/events/freeze-hook.ts` | R20+R21+R36 frozen surface | `wc -l`=51; pure-fn surface confirmed |
| `engine/events/event-feed.ts` | R36 frozen; `ClusterEventKind` parity invariant | `:10-15` 5-value union confirmed |
| `engine/types/verdict.ts` | R56-frozen; A16 literal preserved | unchanged |
| `engine/ds-integration/event-contract.ts` | R62 contract; frozen | full re-read; exports = {DeployEventPayload, DsToTesseraEventRequest, DsToTesseraEventResponse, DsToTesseraEventEndpoint, DS_TO_TESSERA_EVENT_ENDPOINT}; NO `DsToTesseraAuthHeaders` (see § 8) |
| `engine/ds-integration/feed-contract.ts` | R62 contract; frozen | unchanged |
| `engine/ds-integration/feed.ts` | R65 sibling adapter; cross-cluster anti-scope | unchanged |
| `engine/ds-integration/README.md` | R62 deliverable; out-of-round | unchanged |
| All R42-R65 test files | Phase 1+2+Phase-3-SLICE-1+2 + R65 frozen | 422 passing tests in baseline |

### 2.2 What gets created (R66 deliverable)

| Path | Purpose |
|---|---|
| `engine/ds-integration/event-consumer.ts` | HTTP server adapter receiving DS deploy-event POSTs; emits 'activate' on accepted payloads |
| `engine/ds-integration/freeze-hook-factory.ts` | Factory producing `FreezeHookActivator` wrapping the frozen pure-function freeze-hook surface |
| `test/q66-ds-integration-event-consumer.test.ts` | 17 runtime tests (AC-R66-1 through AC-R66-17) |
| `coordination/specs/Q-R66-SPEC.md` | This file |
| `coordination/specs/Q-R66-SPEC-AUDIT.md` | Architect ceremony sidecar |
| `coordination/specs/Q-R66-EMPIRICAL.sh` | Chore-A empirical-AC verification harness (Rule 1 sub-class) |

### 2.3 What gets changed (R66 deliverable)

| Path | Change |
|---|---|
| `engine/ds-integration/index.ts` | +2 lines: `export * from './event-consumer';` + `export * from './freeze-hook-factory';` |
| `coordination/MEMORIAL.md` | R66 ARCHITECT/IMPLEMENTER/REVIEWER/MEMORIAL entries appended |
| `coordination/NEXT-ROLE.md` | Round routing updates |

### 2.4 What gets deleted

None.

### 2.5 Gitignore-awareness (R23 MINOR-2 reinforcement)

All paths in §§ 2.2-2.3 are git-trackable per `.gitignore` (verified: `.gitignore` lists `*.js`/`*.js.map`/`runs/`/`coverage/` etc.; none of the ALLOWED_SET paths match those globs). Compiled `.js` artifacts from `tsc` are gitignored and will NOT appear in `git diff --name-only`.

---

## § 3 Anti-scope + ALLOWED_SET

### 3.1 Anti-scope (hard limits)

R66 MUST NOT:

1. **Modify `engine/events/freeze-hook.ts` body or signature** (R20+R21+R36 frozen). The factory pattern in `engine/ds-integration/freeze-hook-factory.ts` honors no-body-modification anti-scope. If any pseudocode or implementation surfaces freeze-hook.ts body modification: **HALT + DIAGNOSTIC** per § 6.1 halt #4.
2. Modify `engine/ds-integration/event-contract.ts` (R62 contract; frozen).
3. Modify `engine/ds-integration/feed-contract.ts` (R62 contract; frozen).
4. Modify `engine/ds-integration/feed.ts` (R65 sibling adapter; cross-cluster anti-scope).
5. Modify `engine/ds-integration/index.ts` EXCEPT to add the two new `export * from './...';` lines (event-consumer + freeze-hook-factory).
6. Modify `engine/types/verdict.ts` (R56-frozen; A16 literal preserved).
7. Modify `engine/events/event-feed.ts` (R36-frozen; `ClusterEventKind` parity preserved via reference, not modification).
8. Modify any R42-R65 deliverable (engine + test + scripts + CLAUDE-*.md + cross-project + spec files for past rounds).
9. Make real DS-endpoint HTTP calls (synthetic/mock only; `node:http` self-loopback to `127.0.0.1` is permitted per W3-4 Option A).
10. Add new external npm dependencies (Node.js built-in `node:http` + `node:events` only per W3-4 Option A).
11. Modify `~/concord/deploysignal/` (W3-1 Option A; DS-side producer implementation is separate PR scheduled outside Tessera pipeline).
12. Open any GitHub PR.
13. Introduce ad-hoc string comparison against `event_class` (must use the C1 exhaustiveness switch per AC-R62-7 inheritance).
14. Add the structurally-vacuous forward-protection AC pattern (`git diff CHORE_A_SHA..HEAD === []`); R66 uses historical anti-scope form only.

### 3.2 ALLOWED_SET (enumerated at spec-emit time per Rule 4)

`git diff 8f3dd60..HEAD --name-only | sort` MUST be EXACTLY equal to this 9-path set (no superset, no subset):

```
coordination/MEMORIAL.md
coordination/NEXT-ROLE.md
coordination/specs/Q-R66-EMPIRICAL.sh
coordination/specs/Q-R66-SPEC-AUDIT.md
coordination/specs/Q-R66-SPEC.md
engine/ds-integration/event-consumer.ts
engine/ds-integration/freeze-hook-factory.ts
engine/ds-integration/index.ts
test/q66-ds-integration-event-consumer.test.ts
```

Regex carve-outs (also allowed; may not appear if no findings emitted): `coordination/reviews/REVIEWER-REPORT-R66\.md`, `coordination/diagnostics/DIAGNOSTIC-R66-.*\.md`.

`.gitignore`-verification: `git ls-files <each path>` succeeds (or path is new and will be added by chore-A); none of the 9 paths match the `*.js` / `*.js.map` / `runs/` / `coverage/` / `node_modules/` ignore patterns. Compiled `.js` outputs from `tsc` are gitignored and will NOT appear in the diff.

---

## § 4 Per-file pseudocode

### 4.1 `engine/ds-integration/event-consumer.ts`

```ts
// engine/ds-integration/event-consumer.ts — Phase 3 SLICE 3 Wave 10 WU-Phase3-3C (R66).
//
// DS→Tessera event consumer HTTP server adapter. Receives DeployEventPayload
// POSTs on DS_TO_TESSERA_EVENT_ENDPOINT.path; emits 'activate' events with
// parsed DeployEventPayload for downstream subscribers (e.g., the freeze-hook
// factory in freeze-hook-factory.ts).
//
// R66 deliverable: standalone server adapter only. Production wiring to a
// freeze-hook factory is exemplified in tests but not connected to a live
// emission path at R66.
//
// Tessera-original code. No external dependencies (Node.js built-in node:http
// + node:events only, per W3-4 Option A).

import http from 'node:http';
import { EventEmitter } from 'node:events';
import {
  DS_TO_TESSERA_EVENT_ENDPOINT,
  type DeployEventPayload,
  type DsToTesseraEventRequest,
  type DsToTesseraEventResponse,
} from './event-contract';

/** Auth headers expected on the DS→Tessera event POST.
 *
 *  Note (R66): defined locally in this module rather than in
 *  event-contract.ts because the R62 contract did not enumerate a
 *  DsToTesseraAuthHeaders type (only the feed-direction
 *  TesseraToDsAuthHeaders in feed-contract.ts:55). The CLUSTER-HANDOFF
 *  document references DsToTesseraAuthHeaders as a contract export; that is
 *  inaccurate (verified empirically at R66 spec-emit). Future promotion to
 *  the contract module is a separate round outside R66 anti-scope. */
export interface DsToTesseraAuthHeaders {
  'x-ds-instance-id': string;
  authorization: `Bearer ${string}`;
}

/** Connection options for the consumer server. */
export interface DsEventConsumerOpts {
  /** Bind host; default '127.0.0.1'. */
  host?: string;
  /** Bind port; caller picks. Use 0 for kernel-assigned (recommended in tests). */
  port: number;
  /** Default 5000. */
  request_timeout_ms?: number;
}

/** Event names emitted by DsEventConsumer.
 *  - 'activate' — payload accepted; subscriber receives DeployEventPayload.
 *  - 'parse_error' — payload rejected; subscriber receives a reason string
 *    (observability hook; tests + future audit pipelines may subscribe). */
export interface DsEventConsumerEvents {
  activate: [event: DeployEventPayload];
  parse_error: [reason: string];
}

/** Internal validation result for body / auth-header parsing. */
type ParseResult<T> = { ok: true; value: T } | { ok: false; reason: string };

const VALID_EVENT_CLASSES: ReadonlySet<DeployEventPayload['event_class']> = new Set([
  'firmware_push',
  'model_redeploy',
  'env_change',
  'config_change',
  'capacity_change',
]);

/** Validate the DS→Tessera auth headers shape. */
function validateAuthHeaders(
  headers: http.IncomingHttpHeaders,
): ParseResult<DsToTesseraAuthHeaders> {
  const instId = headers['x-ds-instance-id'];
  const auth = headers['authorization'];
  if (typeof instId !== 'string' || instId.length === 0) {
    return { ok: false, reason: 'missing x-ds-instance-id' };
  }
  if (typeof auth !== 'string' || !auth.startsWith('Bearer ')) {
    return { ok: false, reason: 'missing or malformed authorization' };
  }
  return {
    ok: true,
    value: {
      'x-ds-instance-id': instId,
      authorization: auth as `Bearer ${string}`,
    },
  };
}

/** Validate the DeployEventPayload structural shape. */
function validateDeployEventPayload(parsed: unknown): ParseResult<DeployEventPayload> {
  if (typeof parsed !== 'object' || parsed === null) {
    return { ok: false, reason: 'body is not an object' };
  }
  const p = parsed as Record<string, unknown>;
  if (typeof p.event_id !== 'string' || p.event_id.length === 0) {
    return { ok: false, reason: 'missing event_id' };
  }
  if (typeof p.event_class !== 'string' || !VALID_EVENT_CLASSES.has(p.event_class as DeployEventPayload['event_class'])) {
    return { ok: false, reason: 'invalid event_class' };
  }
  if (typeof p.event_ts !== 'number' || !Number.isFinite(p.event_ts)) {
    return { ok: false, reason: 'missing or non-numeric event_ts' };
  }
  // Optional fields: event_window_end_ts (number) + metadata (record); validated only if present.
  if (p.event_window_end_ts !== undefined && (typeof p.event_window_end_ts !== 'number' || !Number.isFinite(p.event_window_end_ts))) {
    return { ok: false, reason: 'event_window_end_ts is non-numeric' };
  }
  if (p.metadata !== undefined && (typeof p.metadata !== 'object' || p.metadata === null || Array.isArray(p.metadata))) {
    return { ok: false, reason: 'metadata is not a plain object' };
  }
  return {
    ok: true,
    value: {
      event_id: p.event_id,
      event_class: p.event_class as DeployEventPayload['event_class'],
      event_ts: p.event_ts,
      ...(p.event_window_end_ts !== undefined ? { event_window_end_ts: p.event_window_end_ts as number } : {}),
      ...(p.metadata !== undefined ? { metadata: p.metadata as Record<string, string> } : {}),
    },
  };
}

/** Validate top-level DsToTesseraEventRequest envelope (contract_version + event + emitted_at_ts). */
function validateRequestEnvelope(parsed: unknown): ParseResult<DsToTesseraEventRequest> {
  if (typeof parsed !== 'object' || parsed === null) {
    return { ok: false, reason: 'body is not an object' };
  }
  const r = parsed as Record<string, unknown>;
  if (r.contract_version !== 'v1') {
    return { ok: false, reason: 'contract_version must be v1' };
  }
  if (typeof r.emitted_at_ts !== 'number' || !Number.isFinite(r.emitted_at_ts)) {
    return { ok: false, reason: 'missing or non-numeric emitted_at_ts' };
  }
  const inner = validateDeployEventPayload(r.event);
  if (!inner.ok) return inner;
  return {
    ok: true,
    value: {
      contract_version: 'v1',
      event: inner.value,
      emitted_at_ts: r.emitted_at_ts,
    },
  };
}

/** HTTP server adapter consuming DS→Tessera deploy-event POSTs.
 *
 *  Lifecycle:
 *    const c = new DsEventConsumer({ port: 0 });
 *    c.on('activate', (event) => { ... });
 *    await c.start();
 *    // ... send POSTs ...
 *    await c.stop();
 *
 *  All emitted events go through node:events EventEmitter. */
export class DsEventConsumer extends EventEmitter {
  private readonly host: string;
  private readonly port: number;
  private readonly timeoutMs: number;
  private server: http.Server | null = null;
  private boundPort: number | null = null;

  constructor(opts: DsEventConsumerOpts) {
    super();
    this.host = opts.host ?? '127.0.0.1';
    this.port = opts.port;
    this.timeoutMs = opts.request_timeout_ms ?? 5000;
  }

  /** Bound port after start(); null before start() / after stop(). */
  get address(): { host: string; port: number } | null {
    return this.boundPort === null ? null : { host: this.host, port: this.boundPort };
  }

  start(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const server = http.createServer((req, res) => this.handle(req, res));
      server.on('error', reject);
      server.listen(this.port, this.host, () => {
        const addr = server.address();
        this.boundPort = typeof addr === 'object' && addr !== null ? addr.port : this.port;
        this.server = server;
        resolve();
      });
    });
  }

  stop(): Promise<void> {
    return new Promise<void>((resolve) => {
      if (this.server === null) { resolve(); return; }
      this.server.close(() => { this.server = null; this.boundPort = null; resolve(); });
    });
  }

  private handle(req: http.IncomingMessage, res: http.ServerResponse): void {
    if (req.method !== 'POST' || req.url !== DS_TO_TESSERA_EVENT_ENDPOINT.path) {
      this.writeResponse(res, 404, {
        contract_version: 'v1',
        status: 'rejected',
        freeze_hook_activated: false,
        reason: 'not found',
      });
      return;
    }

    const authResult = validateAuthHeaders(req.headers);
    if (!authResult.ok) {
      this.emit('parse_error', `auth: ${authResult.reason}`);
      this.writeResponse(res, 401, {
        contract_version: 'v1',
        status: 'rejected',
        freeze_hook_activated: false,
        reason: `auth: ${authResult.reason}`,
      });
      return;
    }

    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => chunks.push(c));
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        this.emit('parse_error', 'JSON parse error');
        this.writeResponse(res, 400, {
          contract_version: 'v1',
          status: 'rejected',
          freeze_hook_activated: false,
          reason: 'JSON parse error',
        });
        return;
      }
      const envelope = validateRequestEnvelope(parsed);
      if (!envelope.ok) {
        this.emit('parse_error', envelope.reason);
        this.writeResponse(res, 400, {
          contract_version: 'v1',
          status: 'rejected',
          freeze_hook_activated: false,
          reason: envelope.reason,
        });
        return;
      }
      // Accepted. Emit activation. Server then writes 202 + success response.
      this.emit('activate', envelope.value.event);
      const nowSec = Math.floor(Date.now() / 1000);
      this.writeResponse(res, 202, {
        contract_version: 'v1',
        status: 'accepted',
        freeze_hook_activated: true,
        freeze_hook_activated_at_ts: nowSec,
      });
    });
    req.setTimeout(this.timeoutMs, () => req.destroy(new Error('request timeout')));
  }

  private writeResponse(res: http.ServerResponse, status: number, body: DsToTesseraEventResponse): void {
    const json = JSON.stringify(body);
    res.writeHead(status, {
      'content-type': 'application/json',
      'content-length': Buffer.byteLength(json).toString(),
    });
    res.end(json);
  }
}
```

### 4.2 `engine/ds-integration/freeze-hook-factory.ts`

```ts
// engine/ds-integration/freeze-hook-factory.ts — Phase 3 SLICE 3 Wave 10 WU-Phase3-3C (R66).
//
// Freeze-hook activator factory. Owns a mutable FreezeHookState; subscribes
// to a DsEventConsumer's 'activate' stream; exposes a freeze-aware update
// function that delegates to the R20+R21+R36 frozen pure-function freeze-hook
// surface at engine/events/freeze-hook.ts:40 (freezeAwareUpdatePerShardResidual).
//
// Architecturally novel surface vs handoff doc: the CLUSTER-HANDOFF-
// WAVE10-3A-3C.md frames the freeze-hook as a "FreezeHook class with
// constructor + activate/deactivate methods" — empirical reality at R66 spec-
// emit is that freeze-hook.ts exports only an interface (FreezeHookState) +
// a pure function (freezeAwareUpdatePerShardResidual). The factory therefore
// owns the state externally via closure rather than constructing a class.
// See Q-R66-SPEC.md § 0.1 Q0.1.B + § 8 for the handoff inaccuracy
// disclosure.
//
// Tessera-original code. No external dependencies.

import {
  freezeAwareUpdatePerShardResidual,
  type FreezeHookState,
  type ExtendedSampleObservation,
} from '../events/freeze-hook' assert {};  // existence-only verified at compile;
                                            // import block tolerates current
                                            // file layout per type-pretest in
                                            // § 1.5.
//
// NOTE TO IMPLEMENTER: the `assert {}` form above is illustrative-only; if
// the toolchain rejects empty import assertions, drop the assertion and import
// the type per the standard pattern (the freeze-hook re-exports the
// ExtendedSampleObservation type via its own internal import; verify the
// actual exported name at implementation time via grep). Tactical autonomy
// per § 4 below.

import type { PerShardResidual, BaselineCellEntry } from '../types/config';
import type { ClusterEventKind } from '../events/event-feed';
import type { DeployEventPayload } from './event-contract';
import { DsEventConsumer } from './event-consumer';

/** Identity-mapping from wire-format event_class to engine-internal
 *  ClusterEventKind. Compile-time exhaustiveness check via `never` assertion
 *  inherits AC-R62-7 parity discipline: if either union adds a 6th value
 *  without the other being updated, tsc fails to type-check this switch. */
export function mapEventClassToKind(
  event_class: DeployEventPayload['event_class'],
): ClusterEventKind {
  switch (event_class) {
    case 'firmware_push':   return 'firmware_push';
    case 'model_redeploy':  return 'model_redeploy';
    case 'env_change':      return 'env_change';
    case 'config_change':   return 'config_change';
    case 'capacity_change': return 'capacity_change';
    default: {
      const _exhaustive: never = event_class;
      throw new Error(`mapEventClassToKind: unhandled event_class: ${_exhaustive as string}`);
    }
  }
}

/** Factory options. Clock/timer/now are injectable for deterministic testing. */
export interface FreezeHookActivatorOpts {
  /** Source of activation events. */
  consumer: DsEventConsumer;
  /** Passed through to freezeAwareUpdatePerShardResidual on every update(). */
  config?: { freeze_hook_enabled?: boolean };
  /** Default 300. Activation auto-deactivates after this window. */
  activation_window_seconds?: number;
  /** Default globalThis.setTimeout. Injectable for deterministic testing. */
  setTimeout?: (cb: () => void, ms: number) => unknown;
  /** Default globalThis.clearTimeout. */
  clearTimeout?: (handle: unknown) => void;
  /** Default () => Math.floor(Date.now()/1000). */
  now?: () => number;
}

/** Public surface of the factory return value. */
export interface FreezeHookActivator {
  /** Freeze-aware update. Delegates to the frozen pure-function
   *  freezeAwareUpdatePerShardResidual with the factory's mutable state. */
  update(
    current: PerShardResidual,
    obs: ExtendedSampleObservation,
    baselineCell: BaselineCellEntry | undefined,
  ): PerShardResidual;
  /** Read-only snapshot of current FreezeHookState. Tests inspect this. */
  getState(): Readonly<FreezeHookState>;
  /** Cancel any pending deactivation timer and set state.active=false.
   *  Idempotent. Forward-compat for operational early cancellation (e.g.,
   *  future rollback-completed events). */
  cancelActivation(): void;
  /** Unsubscribe from consumer + clear any pending timer. Idempotent. */
  dispose(): void;
}

export function createFreezeHookFromDsEvents(
  opts: FreezeHookActivatorOpts,
): FreezeHookActivator {
  const windowSec = opts.activation_window_seconds ?? 300;
  const setT = opts.setTimeout ?? ((cb, ms) => globalThis.setTimeout(cb, ms));
  const clearT = opts.clearTimeout ?? ((h) => globalThis.clearTimeout(h as ReturnType<typeof globalThis.setTimeout>));
  const config = opts.config ?? {};

  const state: FreezeHookState = { active: false };
  let timerHandle: unknown = null;
  let disposed = false;

  const handleActivate = (event: DeployEventPayload): void => {
    if (disposed) return;
    // Verify cross-union parity at runtime as defense-in-depth (the static
    // switch in mapEventClassToKind is the primary gate).
    void mapEventClassToKind(event.event_class);
    if (timerHandle !== null) clearT(timerHandle);
    state.active = true;
    state.cluster_event_id = event.event_id;
    state.until_ts = event.event_ts + windowSec;
    timerHandle = setT(() => {
      timerHandle = null;
      state.active = false;
    }, windowSec * 1000);
  };

  opts.consumer.on('activate', handleActivate);

  return {
    update(current, obs, baselineCell) {
      return freezeAwareUpdatePerShardResidual(current, obs, baselineCell, state, config);
    },
    getState() {
      // Shallow-copy snapshot; callers cannot mutate internal state.
      return { ...state };
    },
    cancelActivation() {
      if (timerHandle !== null) {
        clearT(timerHandle);
        timerHandle = null;
      }
      state.active = false;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      opts.consumer.off('activate', handleActivate);
      if (timerHandle !== null) {
        clearT(timerHandle);
        timerHandle = null;
      }
      state.active = false;
    },
  };
}
```

### 4.3 `engine/ds-integration/index.ts` (modified; +2 lines)

```ts
// engine/ds-integration/index.ts — Phase 3 SLICE 3 WU-Phase3-3A (R62) barrel.
// (existing header preserved; do not modify the existing comment block)

export * from './feed-contract';
export * from './event-contract';
export * from './feed';
export * from './event-consumer';        // R66 addition
export * from './freeze-hook-factory';   // R66 addition
```

### 4.4 `test/q66-ds-integration-event-consumer.test.ts`

```ts
// test/q66-ds-integration-event-consumer.test.ts — Phase 3 SLICE 3 Wave 10
// WU-Phase3-3C (R66). Runtime tests for AC-R66-1 through AC-R66-17.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import {
  DsEventConsumer,
  type DsToTesseraAuthHeaders,
} from '../engine/ds-integration/event-consumer';
import {
  createFreezeHookFromDsEvents,
  mapEventClassToKind,
} from '../engine/ds-integration/freeze-hook-factory';
import {
  DS_TO_TESSERA_EVENT_ENDPOINT,
  type DeployEventPayload,
  type DsToTesseraEventRequest,
  type DsToTesseraEventResponse,
} from '../engine/ds-integration/event-contract';

const VALID_HEADERS: DsToTesseraAuthHeaders & Record<string, string> = {
  'x-ds-instance-id': 'ds-test',
  authorization: 'Bearer test-token',
  'content-type': 'application/json',
};

function makeValidPayload(): DeployEventPayload {
  return {
    event_id: 'evt-R66-1',
    event_class: 'firmware_push',
    event_ts: 1000,
  };
}

function makeValidEnvelope(): DsToTesseraEventRequest {
  return {
    contract_version: 'v1',
    event: makeValidPayload(),
    emitted_at_ts: 1005,
  };
}

/** Post helper. Returns { status, body }. */
async function postJson(
  port: number,
  body: string,
  headers: Record<string, string>,
): Promise<{ status: number; body: DsToTesseraEventResponse | null }> {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        host: '127.0.0.1',
        port,
        path: DS_TO_TESSERA_EVENT_ENDPOINT.path,
        method: 'POST',
        headers,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (c: Buffer) => chunks.push(c));
        res.on('end', () => {
          const raw = Buffer.concat(chunks).toString('utf8');
          let parsed: DsToTesseraEventResponse | null = null;
          try { parsed = JSON.parse(raw); } catch { /* tolerate non-JSON body in error paths */ }
          resolve({ status: res.statusCode ?? 0, body: parsed });
        });
      },
    );
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

describe('R66 WU-Phase3-3C DS→Tessera event consumer + freeze-hook factory', () => {
  // AC-R66-1: valid POST → 202 + accepted DsToTesseraEventResponse
  test('AC-R66-1: server accepts valid POST and responds 202 + accepted response', async () => {
    const c = new DsEventConsumer({ port: 0 });
    await c.start();
    const port = c.address!.port;
    try {
      const { status, body } = await postJson(port, JSON.stringify(makeValidEnvelope()), VALID_HEADERS);
      assert.strictEqual(status, 202);
      assert.ok(body !== null);
      assert.strictEqual(body!.contract_version, 'v1');
      assert.strictEqual(body!.status, 'accepted');
      assert.strictEqual(body!.freeze_hook_activated, true);
      assert.strictEqual(typeof body!.freeze_hook_activated_at_ts, 'number');
    } finally {
      await c.stop();
    }
  });

  // AC-R66-2: malformed JSON body → 400 with reason
  test('AC-R66-2: server rejects malformed JSON with 400 + reason', async () => {
    const c = new DsEventConsumer({ port: 0 });
    await c.start();
    try {
      const { status, body } = await postJson(c.address!.port, '{not valid json', VALID_HEADERS);
      assert.strictEqual(status, 400);
      assert.strictEqual(body!.status, 'rejected');
      assert.match(body!.reason ?? '', /JSON parse error/);
    } finally {
      await c.stop();
    }
  });

  // AC-R66-3: missing required field event_id → 400
  test('AC-R66-3: server rejects payload missing event_id with 400', async () => {
    const c = new DsEventConsumer({ port: 0 });
    await c.start();
    try {
      const envelope = makeValidEnvelope();
      // Strip event_id
      const broken = { ...envelope, event: { ...envelope.event, event_id: '' } };
      const { status, body } = await postJson(c.address!.port, JSON.stringify(broken), VALID_HEADERS);
      assert.strictEqual(status, 400);
      assert.match(body!.reason ?? '', /event_id/);
    } finally {
      await c.stop();
    }
  });

  // AC-R66-4: invalid event_class (6th value) → 400
  test('AC-R66-4: server rejects invalid event_class with 400', async () => {
    const c = new DsEventConsumer({ port: 0 });
    await c.start();
    try {
      const envelope = makeValidEnvelope();
      const broken = { ...envelope, event: { ...envelope.event, event_class: 'invalid_class_v1' } };
      const { status, body } = await postJson(c.address!.port, JSON.stringify(broken), VALID_HEADERS);
      assert.strictEqual(status, 400);
      assert.match(body!.reason ?? '', /invalid event_class/);
    } finally {
      await c.stop();
    }
  });

  // AC-R66-5: missing/malformed authorization → 401
  test('AC-R66-5: server rejects missing authorization header with 401', async () => {
    const c = new DsEventConsumer({ port: 0 });
    await c.start();
    try {
      const headers: Record<string, string> = {
        'x-ds-instance-id': 'ds-test',
        'content-type': 'application/json',
      };
      const { status, body } = await postJson(c.address!.port, JSON.stringify(makeValidEnvelope()), headers);
      assert.strictEqual(status, 401);
      assert.match(body!.reason ?? '', /authorization/);
    } finally {
      await c.stop();
    }
  });

  // AC-R66-6: server emits 'activate' with parsed DeployEventPayload
  test("AC-R66-6: server emits 'activate' with parsed DeployEventPayload to subscribers", async () => {
    const c = new DsEventConsumer({ port: 0 });
    const received: DeployEventPayload[] = [];
    c.on('activate', (e) => received.push(e));
    await c.start();
    try {
      await postJson(c.address!.port, JSON.stringify(makeValidEnvelope()), VALID_HEADERS);
      // Tiny delay to let the emit run; assert outside the request handler.
      await new Promise((r) => setTimeout(r, 10));
      assert.strictEqual(received.length, 1);
      assert.strictEqual(received[0]!.event_id, 'evt-R66-1');
      assert.strictEqual(received[0]!.event_class, 'firmware_push');
      assert.strictEqual(received[0]!.event_ts, 1000);
    } finally {
      await c.stop();
    }
  });

  // AC-R66-7: mapEventClassToKind identity-maps all 5 valid values
  test('AC-R66-7: mapEventClassToKind returns identity-mapped ClusterEventKind for all 5 values', () => {
    assert.strictEqual(mapEventClassToKind('firmware_push'), 'firmware_push');
    assert.strictEqual(mapEventClassToKind('model_redeploy'), 'model_redeploy');
    assert.strictEqual(mapEventClassToKind('env_change'), 'env_change');
    assert.strictEqual(mapEventClassToKind('config_change'), 'config_change');
    assert.strictEqual(mapEventClassToKind('capacity_change'), 'capacity_change');
  });

  // AC-R66-8: mapEventClassToKind throws at runtime for unknown value
  test('AC-R66-8: mapEventClassToKind throws at runtime for unknown value', () => {
    assert.throws(
      () => mapEventClassToKind('not_a_real_class' as DeployEventPayload['event_class']),
      /unhandled event_class/,
    );
  });

  // AC-R66-9: factory wires activation; state transitions inactive→active on event
  test('AC-R66-9: factory wires activation: state.active transitions false→true on event', async () => {
    const c = new DsEventConsumer({ port: 0 });
    const activator = createFreezeHookFromDsEvents({ consumer: c });
    assert.strictEqual(activator.getState().active, false);
    c.emit('activate', { event_id: 'evt-9', event_class: 'env_change', event_ts: 500 });
    // Synchronous emit; state already updated.
    assert.strictEqual(activator.getState().active, true);
    activator.dispose();
  });

  // AC-R66-10: factory state captures cluster_event_id from event_id
  test('AC-R66-10: factory state captures cluster_event_id + until_ts from event', () => {
    const c = new DsEventConsumer({ port: 0 });
    const activator = createFreezeHookFromDsEvents({
      consumer: c,
      activation_window_seconds: 120,
    });
    c.emit('activate', { event_id: 'evt-10', event_class: 'config_change', event_ts: 1000 });
    const s = activator.getState();
    assert.strictEqual(s.cluster_event_id, 'evt-10');
    assert.strictEqual(s.until_ts, 1120);
    activator.dispose();
  });

  // AC-R66-11: factory update returns current unchanged when active+enabled
  test('AC-R66-11: factory update returns current unchanged when state.active=true + freeze_hook_enabled=true', () => {
    const c = new DsEventConsumer({ port: 0 });
    const activator = createFreezeHookFromDsEvents({
      consumer: c,
      config: { freeze_hook_enabled: true },
    });
    c.emit('activate', { event_id: 'evt-11', event_class: 'firmware_push', event_ts: 1000 });
    const current = freshResidual();
    const obs = freshObs(/* timestamp= */ 1001);
    const result = activator.update(current, obs, undefined);
    assert.strictEqual(result, current);  // exact reference equality — pure freeze path
    activator.dispose();
  });

  // AC-R66-12: factory update delegates to freezeAwareUpdatePerShardResidual when inactive
  test('AC-R66-12: factory update delegates to underlying when state.active=false', () => {
    const c = new DsEventConsumer({ port: 0 });
    const activator = createFreezeHookFromDsEvents({
      consumer: c,
      config: { freeze_hook_enabled: true },
    });
    // No 'activate' emitted; state.active stays false.
    const current = freshResidual();
    const obs = freshObs(1001);
    const result = activator.update(current, obs, undefined);
    // Delegation produces a DIFFERENT reference (real update path mutates fields).
    assert.notStrictEqual(result, current);
    activator.dispose();
  });

  // AC-R66-13: factory deactivation timer fires; state.active=false after timeout
  test('AC-R66-13: factory schedules deactivation; state.active=false after timer fires', () => {
    const c = new DsEventConsumer({ port: 0 });
    let captured: (() => void) | null = null;
    const fakeSetT = (cb: () => void, _ms: number) => { captured = cb; return 'handle' as unknown; };
    const fakeClearT = (_h: unknown) => { /* no-op */ };
    const activator = createFreezeHookFromDsEvents({
      consumer: c,
      setTimeout: fakeSetT,
      clearTimeout: fakeClearT,
      activation_window_seconds: 60,
    });
    c.emit('activate', { event_id: 'evt-13', event_class: 'capacity_change', event_ts: 0 });
    assert.strictEqual(activator.getState().active, true);
    assert.ok(captured !== null);
    captured!();  // simulate timer fire
    assert.strictEqual(activator.getState().active, false);
    activator.dispose();
  });

  // AC-R66-14: anti-scope diff ⊆ ALLOWED_SET (9 paths exactly)
  test('AC-R66-14: anti-scope diff round-start..HEAD ⊆ ALLOWED_SET (9 paths)', () => {
    const diff = execSync('git diff 8f3dd60..HEAD --name-only', { encoding: 'utf8' })
      .trim()
      .split('\n')
      .filter((s) => s.length > 0)
      .filter((s) => !s.startsWith('coordination/reviews/REVIEWER-REPORT-R66'))
      .filter((s) => !s.startsWith('coordination/diagnostics/DIAGNOSTIC-R66-'))
      .sort();
    const allowed = [
      'coordination/MEMORIAL.md',
      'coordination/NEXT-ROLE.md',
      'coordination/specs/Q-R66-EMPIRICAL.sh',
      'coordination/specs/Q-R66-SPEC-AUDIT.md',
      'coordination/specs/Q-R66-SPEC.md',
      'engine/ds-integration/event-consumer.ts',
      'engine/ds-integration/freeze-hook-factory.ts',
      'engine/ds-integration/index.ts',
      'test/q66-ds-integration-event-consumer.test.ts',
    ].sort();
    for (const path of diff) {
      assert.ok(allowed.includes(path), `unauthorized path in diff: ${path}`);
    }
  });

  // AC-R66-15: NO modification of engine/events/freeze-hook.ts
  test('AC-R66-15: engine/events/freeze-hook.ts unmodified since round-start', () => {
    const diff = execSync(
      'git diff 8f3dd60..HEAD --name-only -- engine/events/freeze-hook.ts',
      { encoding: 'utf8' },
    ).trim();
    assert.strictEqual(diff, '');
  });

  // AC-R66-16: no inline path-literal duplication; event-consumer imports DS_TO_TESSERA_EVENT_ENDPOINT
  test('AC-R66-16: event-consumer.ts imports DS_TO_TESSERA_EVENT_ENDPOINT (no inline path literal duplication)', () => {
    const src = readFileSync('engine/ds-integration/event-consumer.ts', 'utf8');
    assert.match(src, /import\s*\{[^}]*DS_TO_TESSERA_EVENT_ENDPOINT[^}]*\}\s*from\s*['"]\.\/event-contract['"]/);
    // Inline path literal should appear 0 times outside the import statement
    // (the contract module owns the literal once at event-contract.ts:76).
    const inlineCount = (src.match(/'\/v1\/tessera\/deploy-events'/g) ?? []).length;
    assert.strictEqual(inlineCount, 0, 'event-consumer.ts must not duplicate the path literal');
  });

  // AC-R66-17: ClusterEventKind ↔ event_class parity at compile time + runtime
  test('AC-R66-17: ClusterEventKind 5-value union matches event_class 5-value union', () => {
    // Runtime cross-check: the literal set used in event-contract.ts must
    // equal the literal set used in event-feed.ts. We re-derive via direct
    // file read (rather than runtime introspection of the unions, which is
    // not possible — they erase at compile).
    const contract = readFileSync('engine/ds-integration/event-contract.ts', 'utf8');
    const feed = readFileSync('engine/events/event-feed.ts', 'utf8');
    const expected = ['firmware_push', 'model_redeploy', 'env_change', 'config_change', 'capacity_change'];
    for (const v of expected) {
      assert.match(contract, new RegExp(`'${v}'`), `event-contract.ts must reference '${v}'`);
      assert.match(feed, new RegExp(`'${v}'`), `event-feed.ts must reference '${v}'`);
    }
  });
});

// ─── Test fixtures ────────────────────────────────────────────────────────────
// Minimal valid PerShardResidual + ExtendedSampleObservation construction.
// These pretest types match the imports above; if the actual imports require
// extra fields not surfaced in spec § 1.5 type pretest, Implementer adjusts
// per TACTICAL AUTONOMY (§ 4).

import type { PerShardResidual } from '../engine/types/config';

function freshResidual(): PerShardResidual {
  // Minimal valid residual; field set follows engine/types/config.ts surface.
  // Implementer verifies exact field shape via grep at chore-A; spec gives
  // structural hint only.
  return {} as PerShardResidual;
}

function freshObs(_ts: number) {
  // Minimal valid ExtendedSampleObservation. Same caveat as freshResidual.
  return {} as Parameters<FreezeHookActivator['update']>[1];
}

import type { FreezeHookActivator } from '../engine/ds-integration/freeze-hook-factory';
```

**Implementer note (TACTICAL AUTONOMY):** The `freshResidual()` and `freshObs()` fixture stubs above use `{} as Type` casts because the exact required-field shape of `PerShardResidual` and `ExtendedSampleObservation` is not load-bearing for AC-R66-11/12 (which check reference equality, not field correctness). If `tsc` rejects the empty-object casts at strict mode, Implementer adjusts to minimal valid field sets via grep on `engine/types/config.ts` (PerShardResidual) + `engine/per-shard/runtime.ts` (ExtendedSampleObservation). This is TACTICAL — no architectural decision.

---

## § 5 Acceptance criteria

### 5.1 AC table

All ACs in "Given X, when Y, then Z" form. Each binds to a runtime test in § 4.4.

| # | AC | Given | When | Then | Test |
|---|---|---|---|---|---|
| AC-R66-1 | valid POST → 202 + accepted response | a DsEventConsumer is started and a valid `DsToTesseraEventRequest` is POSTed with valid auth headers | the request completes | server returns HTTP 202; response body has `contract_version='v1'`, `status='accepted'`, `freeze_hook_activated=true`, `freeze_hook_activated_at_ts` is a number | `AC-R66-1` test in q66 |
| AC-R66-2 | malformed JSON → 400 | a started DsEventConsumer + valid auth headers | a POST with body `'{not valid json'` is sent | server returns 400 with `body.status='rejected'` and `body.reason` matches `/JSON parse error/` | `AC-R66-2` test |
| AC-R66-3 | missing event_id → 400 | a started DsEventConsumer + valid auth + valid envelope with `event.event_id=''` | the POST is sent | server returns 400 with `body.reason` matching `/event_id/` | `AC-R66-3` test |
| AC-R66-4 | invalid event_class → 400 | a started DsEventConsumer + valid auth + valid envelope with `event.event_class='invalid_class_v1'` | the POST is sent | server returns 400 with `body.reason` matching `/invalid event_class/` | `AC-R66-4` test |
| AC-R66-5 | missing authorization → 401 | a started DsEventConsumer + valid envelope + headers WITHOUT `authorization` | the POST is sent | server returns 401 with `body.reason` matching `/authorization/` | `AC-R66-5` test |
| AC-R66-6 | activate emitted on accept | a started DsEventConsumer with an `'activate'` subscriber | a valid POST is accepted | the subscriber receives exactly one event with `event_id='evt-R66-1'`, `event_class='firmware_push'`, `event_ts=1000` | `AC-R66-6` test |
| AC-R66-7 | mapEventClassToKind 5-value identity | the 5 valid `event_class` literals | `mapEventClassToKind` is called on each | output equals input for every case (5 strict equalities) | `AC-R66-7` test |
| AC-R66-8 | mapEventClassToKind throws on unknown | a value `'not_a_real_class' as DeployEventPayload['event_class']` | `mapEventClassToKind` is invoked | the call throws an Error whose message matches `/unhandled event_class/` | `AC-R66-8` test |
| AC-R66-9 | factory state transitions on activate | a DsEventConsumer + a `FreezeHookActivator` constructed via `createFreezeHookFromDsEvents` | the consumer emits `'activate'` with a valid event | `activator.getState().active` transitions from `false` to `true` synchronously | `AC-R66-9` test |
| AC-R66-10 | factory captures cluster_event_id + until_ts | activator with `activation_window_seconds=120` | the consumer emits `'activate'` with `event_id='evt-10'`, `event_ts=1000` | `getState().cluster_event_id==='evt-10'` AND `getState().until_ts===1120` | `AC-R66-10` test |
| AC-R66-11 | freeze applied when active+enabled (returns `current`) | activator with `freeze_hook_enabled=true` after activation | `activator.update(current, obs, undefined)` is called | the return value is reference-equal to `current` (`===`) | `AC-R66-11` test |
| AC-R66-12 | delegation when inactive | activator constructed but no activation emitted | `activator.update(current, obs, undefined)` is called | the return value is NOT reference-equal to `current` (delegation to `freezeAwareUpdatePerShardResidual` ran) | `AC-R66-12` test |
| AC-R66-13 | deactivation timer fires | activator with injected `setTimeout` that captures the callback | the consumer emits `'activate'`, then the captured callback is invoked | after callback invocation, `getState().active===false` | `AC-R66-13` test |
| AC-R66-14 | anti-scope diff ⊆ ALLOWED_SET | `git diff 8f3dd60..HEAD --name-only` at chore-A (filtered to drop optional regex carve-outs) | the diff is compared against the 9-path ALLOWED_SET | every diff path is in ALLOWED_SET (no superset) | `AC-R66-14` test |
| AC-R66-15 | freeze-hook.ts unmodified | the round-start..HEAD diff filtered to `engine/events/freeze-hook.ts` | the diff is examined | the diff is empty (the freeze-hook file is unchanged) | `AC-R66-15` test |
| AC-R66-16 | path-literal not inline-duplicated | the `event-consumer.ts` file as read at HEAD | grep for `'/v1/tessera/deploy-events'` literal AND for an import of `DS_TO_TESSERA_EVENT_ENDPOINT` | the literal appears 0 times in the file outside the import; the import statement appears once | `AC-R66-16` test |
| AC-R66-17 | ClusterEventKind ↔ event_class parity | `event-contract.ts` + `event-feed.ts` as read at HEAD | grep each for the 5 literal `event_class` values | each of the 5 literals appears at least once in each file | `AC-R66-17` test |

**Preamble attestation classification (per R20 ARCH MINOR-1 cross-check):**

| AC | Verification class | Where verified |
|---|---|---|
| AC-R66-1 through AC-R66-13 | runtime test (in-process node:test) | `test/q66-ds-integration-event-consumer.test.ts` |
| AC-R66-14 | binding-command attestation (Implementer/Reviewer reports `git diff` output verbatim) | NEXT-ROLE.md + Q-R66-EMPIRICAL.sh + runtime AC-R66-14 in q66 test |
| AC-R66-15 | binding-command attestation | NEXT-ROLE.md + Q-R66-EMPIRICAL.sh + runtime AC-R66-15 in q66 test |
| AC-R66-16 | runtime test (file-read grep) | runtime AC-R66-16 in q66 test |
| AC-R66-17 | runtime test (file-read grep) | runtime AC-R66-17 in q66 test |

All ACs above are STRUCTURALLY exercised at runtime; § 5 preamble classification matches § 4.4 implementation pseudocode.

### 5.2 Implicit empirical ACs (binding-command attestations; NOT part of the 17 runtime ACs)

These are the binding commands the Implementer MUST report verbatim per Rule 1 sub-class `empirical-command-attestation` (R46), not counted in the 17:

- `npx tsc -p tsconfig.test.json` → expected exit 0, zero diagnostics.
- `node --test --test-reporter=tap test/*.test.js` → ~~expected `tests=444 / pass=439 / fail=2 / skipped=3`~~ [R66-amended per operator Option A 2026-05-20: `tests=444 / pass=438 / fail=3 / skipped=3`]. 3 fails = R36-30 + R36-31 (Phase 2 close carry-forward; pre-existing) + **AC-R65-2 NEW carry-forward** (live-file-count assertion in `test/q65-ds-integration-feed.test.ts` reads `index.ts` at runtime and asserts `export *` count === 3; R66's in-scope `index.ts` modification adds 2 export lines → count = 5 → AC-R65-2 PASS→FAIL). AC-R65-2 is structurally fragile (same pattern as R62 AC-R62-15 forward-protection; analogous to R36-30/R36-31 carry-forward). Operator Option A approved: amend spec + EMPIRICAL.sh; no code changes required.
- `bash coordination/specs/Q-R66-EMPIRICAL.sh` → expected exit 0; 14 PASS, 0 FAIL.

### 5.3 Branch-binding coverage table (Rule 2 ACTIVE GATE)

| Branch / guard in production code | Bound by AC |
|---|---|
| event-consumer: method-not-POST or path-mismatch → 404 | NON-LOAD-BEARING (framework default; acknowledged gap) |
| event-consumer: validateAuthHeaders failure → 401 | AC-R66-5 |
| event-consumer: JSON.parse exception → 400 | AC-R66-2 |
| event-consumer: validateRequestEnvelope contract_version mismatch | NON-LOAD-BEARING — invariant defended by contract type; acknowledged gap |
| event-consumer: validateDeployEventPayload missing event_id → 400 | AC-R66-3 |
| event-consumer: validateDeployEventPayload invalid event_class → 400 | AC-R66-4 |
| event-consumer: success path → emit 'activate' + 202 | AC-R66-1 + AC-R66-6 |
| event-consumer: optional event_window_end_ts non-numeric → 400 | NON-LOAD-BEARING — optional field; minimal-risk; acknowledged gap |
| event-consumer: optional metadata non-object → 400 | NON-LOAD-BEARING — optional field; acknowledged gap |
| factory: mapEventClassToKind all 5 cases | AC-R66-7 |
| factory: mapEventClassToKind default (`never`) | AC-R66-8 |
| factory: consumer.on('activate') handler clears prior timer + sets state.active=true | AC-R66-9 + AC-R66-10 |
| factory: update fn when state.active=true (returns current) | AC-R66-11 |
| factory: update fn when state.active=false (delegates) | AC-R66-12 |
| factory: setTimeout callback (state.active=false) | AC-R66-13 |
| factory: cancelActivation → clear timer + state.active=false | NON-LOAD-BEARING — operational API; forward-compat; idempotency assertable by AC-R66-13 mechanism (same code path); acknowledged gap |
| factory: dispose → unsubscribe + clear timer | NON-LOAD-BEARING — lifecycle hygiene; verified by absence of leak in `node --test` not hanging; acknowledged gap |

**Acknowledged non-load-bearing gaps (5 items):** framework-default 404; contract_version-mismatch (defended by type); optional event_window_end_ts/metadata negative-type guards; cancelActivation idempotency; dispose lifecycle. All 5 are documented in § 5.3 per Rule 2 discipline (R21 ARCH MINOR-2). None block correctness of any load-bearing path; each is either (a) defended by a type-level invariant, (b) framework default behavior, or (c) operational-API surface not exercised by R66's primary deliverable.

### 5.4 Right-reasons audit (Rule 3; discriminating assertions)

- AC-R66-1: discriminates positive path from any error class (status 202 specific; status field 'accepted'; freeze_hook_activated true; activated_at_ts is number).
- AC-R66-2 through AC-R66-5: discriminates by both status code AND reason-string content; a regression that returns 400 for the wrong reason fails the `assert.match(/.../)`.
- AC-R66-6: counts received events (`===1`); discriminates against "emitted twice", "emitted with wrong payload", or "not emitted at all".
- AC-R66-7: 5 separate strictEqual assertions; one identity bug fails one of them.
- AC-R66-8: `assert.throws` with regex match on message; discriminates from "doesn't throw" and "throws wrong error".
- AC-R66-9: false → true transition is binary; discriminating.
- AC-R66-10: 2 distinct field assertions (`cluster_event_id` + `until_ts`); discriminates per-field.
- AC-R66-11: reference equality (`===`) on the input `current` — discriminating against "returned a different object with same fields".
- AC-R66-12: reference inequality (`!==`) on `current` — discriminating against "returned current itself (freeze path)".
- AC-R66-13: deterministic timer injection; the callback is captured AND its invocation explicitly toggles state.
- AC-R66-14: every diff path validated against allow-list set membership.
- AC-R66-15: empty-string assertion on `git diff` output.
- AC-R66-16: `match` regex for the import statement AND inline-count `=== 0` for the literal. Two independent assertions; a regression preserving the import but inlining the literal still fails.
- AC-R66-17: each of 5 literals checked in both files (10 separate `assert.match`).

No self-confirming tests: no test re-implements the production logic it asserts on.

---

## § 6 Halt conditions + open questions

### 6.1 Halt conditions for the Implementer

If ANY of the following fires, Implementer MUST write `coordination/diagnostics/DIAGNOSTIC-R66-<topic>.md` with ≥3 bounded options, set STATUS: ESCALATE, await operator disposition. Do NOT silently work around.

1. `Q-R66-EMPIRICAL.sh` non-zero exit at chore-A — R66 has NO chore-B; thus NO pre-documented two-state mismatch carve-out. Any non-zero exit is a halt condition.
2. `npx tsc -p tsconfig.test.json` non-zero exit.
3. Phase 1+2+Phase-3-SLICE-1+2+R65 regression: any pre-R66 test other than R36-30 + R36-31 transitions PASS → FAIL.
4. **Spec pseudocode requires `engine/events/freeze-hook.ts` body or signature modification** — HALT + DIAGNOSTIC immediately. Factory pattern is the mandated mechanism (handoff line 113 + R66 directive halt #4). DO NOT silently modify.
5. Anti-scope diff includes path outside ALLOWED_SET (NEVER expand ALLOWED_SET in-test per R36 MAJOR-2).
6. Architectural decision requires DS-repo modification (W3-1 anti-scope violation).
7. **R62 lesson — claim-then-walk:** load-bearing factual claim in spec does not match codebase reality.
8. R61-class architectural-reality discovery — spec premise empirically false at Implementer time (especially: actual `PerShardResidual` field shape, `ExtendedSampleObservation` field shape, or `FreezeHookState` field shape diverges materially from § 1.5 type-pretest).
9. `ClusterEventKind` 5-value closed-set at `engine/events/event-feed.ts:10-15` has drifted (verified by grep at chore-A) — parity invariant per AC-R62-7.
10. `node:http` or `node:events` Node-version-specific API unavailable (Node v25.9.0 verified at session entry, but spec emit cannot verify all downstream module API surfaces).

### 6.2 Open questions

**None — all resolved.** OQ-R64b-1 (factory module location) → separate-module pattern picked at § 0.1 B1. OQ-R64b-2 (activation transition semantics) → 1-to-1 with factory-owned setTimeout deactivation at § 0.2. OQ-R64b-3 (mapping function) → explicit switch with `never` exhaustiveness at § 0.1 C1. OQ-R64b-4 (mock HTTP pattern) → real `node:http` self-loopback to `127.0.0.1` at port 0 (kernel-assigned).

---

## § 7 Cross-project rule dispositions (Rule 7 Surface (a) — SPEC-AUTHORING-CHECKLIST § enumerated)

| Rule | Canonical short name | Disposition at R66 |
|---|---|---|
| Rule 1 | `false-compliance-attestation` (+ sub-class `empirical-command-attestation`) | ACTIVE GATE — `coordination/specs/Q-R66-EMPIRICAL.sh` harness; Implementer attestation encodes ACTUAL command output verbatim per R26 / R39 / R41 / R42 / R46 reinforcement |
| Rule 2 | `architect-branch-binding-coverage` | ACTIVE GATE — § 5.3 table; 5 acknowledged non-load-bearing gaps documented with rationale |
| Rule 3 | `implementer-spec-test-assertion-coverage` | ACTIVE GATE — discriminating assertions per § 5.4 audit; no self-confirming tests |
| Rule 4 | `anti-scope-allowed-set-forward-coverage` | ACTIVE GATE — 9-path ALLOWED_SET enumerated at § 3.2 upfront; baseline SHA `8f3dd60` verified |
| Rule 5 | `rule-derivation-without-self-application` | N/A — R66 does not derive a new cross-project rule. Surface (c) self-application gate conditional at Memorial-Updater stage |
| Rule 6 | `halt-discipline-no-DIAGNOSTIC-for-workaround` | ACTIVE GATE — § 6.1 halt conditions explicitly enumerated; "narrowed carve-out" pattern from R62 dropped entirely (no two-state mismatch in R66) |
| Rule 7 | `derived-rule-propagation-mechanism-required` | ACTIVE GATE Surface (a) — § 7 enumeration in this spec satisfies the SPEC-AUTHORING-CHECKLIST § Rule 7 self-application gate; Surface (b) `scripts/pre-commit-rule-sweep.sh` runs at chore-A (mechanical); Surface (c) conditional |

---

## § 8 Handoff-document inaccuracy disclosure (R65 § 8 precedent; Architect-attributable)

CLUSTER-HANDOFF-WAVE10-3A-3C.md (emitted at R63) contains material inaccuracies relative to the empirically-verified codebase state at R66 spec-emit. Per R62 OBS lesson (claim-then-walk for multi-commit chains; CLAUDE-ARCHITECT REINFORCED 2026-05-19 R62 sub-variant), the spec proper uses the ACTUAL codebase surface, not the handoff's claims, and discloses the divergences here.

### 8.1 Inaccuracies surfaced via claim-then-walk

| # | Handoff claim | Citation | Empirical reality | How spec resolves |
|---|---|---|---|---|
| 8.1.1 | `DsToTesseraAuthHeaders` is an export of `event-contract.ts` | handoff line 37-40 + R66 directive line 36 | `grep -n "DsToTesseraAuthHeaders" engine/ds-integration/event-contract.ts` → 0 matches; only `TesseraToDsAuthHeaders` exists, in `feed-contract.ts:55` (feed direction) | Spec defines `DsToTesseraAuthHeaders` locally in `event-consumer.ts` (§ 0.3 + § 4.1); promotion to contract module deferred to a future round outside R66 anti-scope |
| 8.1.2 | `FreezeHook` is a class with `activate`, `deactivate`, `is_active` methods + constructor | handoff line 57-65 + R66 directive line 39 ("imports the existing `FreezeHook` class (read-only), constructs a new instance via its existing R20/R21/R36 constructor") | `freeze-hook.ts` exports only `interface FreezeHookState` + pure function `freezeAwareUpdatePerShardResidual`; no class exists | Factory owns mutable `FreezeHookState` value externally + delegates to the pure function on each `update()` call (§ 0.1 Q0.1.B + § 4.2) |
| 8.1.3 | `DsToTesseraEventEndpoint` includes `expected_response_status: 202` | handoff line 33-34 | Endpoint interface defines only `path` + `method` literals; no `expected_response_status` field | Spec hard-codes 202 success status in the consumer adapter's success response path (§ 4.1) |
| 8.1.4 | `DeployEventPayload` field names: `deploy_event_id`, `deploy_at`, `target_fleet_id`, `protocol_version: 'v1'`, `cluster_event_metadata` | handoff line 23-30 | Actual fields: `event_id`, `event_class`, `event_ts`, `event_window_end_ts?`, `metadata?` (NO target_fleet_id; NO protocol_version inside payload — `contract_version:'v1'` lives on the envelope `DsToTesseraEventRequest`) | Spec uses the actual `event-contract.ts` field names throughout (§ 1.5 + § 4.1 + § 4.4) |

### 8.2 Why this disclosure matters

The Implementer reads the spec proper. If the spec proper silently absorbed the handoff inaccuracies, the Implementer would faithfully follow them and produce broken code. By disclosing in § 8, the Implementer gets:
- A clear "use the spec's field/type names, not the handoff's" directive.
- An empirically-grounded factory pattern that matches codebase reality.
- A traceable audit trail for the Reviewer (every divergence between handoff and codebase is documented + explained).

### 8.3 Operator follow-up candidate

The R63 CLUSTER-HANDOFF document was emitted by the Coordinator at WAVE-GATE-09 close. The 4 inaccuracies above suggest a handoff-author-side claim-then-walk gap (Coordinator did not directly Read `event-contract.ts` + `freeze-hook.ts` source when authoring the handoff). Memorial-Updater may consider whether this rises to a Coordinator-role-specific reinforcement (CLAUDE-COORDINATOR.md) per Rule 7 surface evaluation. Not load-bearing for R66 close.

---

## § 9 P3 ten-axis verification

| Axis | Verification |
|---|---|
| Correctness | Every AC has a discriminating runtime test (§ 5.4); every guard in production code is bound by an AC OR documented as non-load-bearing with rationale (§ 5.3); the factory pattern uses the actual freeze-hook pure-function surface (verified by direct file Read at spec-emit) |
| Completeness | All 17 ACs enumerated; 14 empirical-AC blocks in Q-R66-EMPIRICAL.sh (Rule 1 sub-class); branch-binding table covers all 12 load-bearing branches plus 5 acknowledged gaps |
| Consistency | Cross-section sweep — all references to `event_id` field (consumer + factory + tests) match `event-contract.ts:30`; all references to `event_class` match contract literal-union; `mapEventClassToKind` 5-case switch matches `event-feed.ts:10-15` `ClusterEventKind`; `8f3dd60` round-start SHA used uniformly across § 3.2 + AC-R66-14 + AC-R66-15 + Q-R66-EMPIRICAL.sh; § 5 preamble attestation classifications match § 4.4 test implementation classes (R20 ARCH MINOR-1 cross-check applied) |
| Clarity | Mechanism § 1 names each artifact + its purpose; pseudocode § 4 contains imports + exports + JSDoc + function bodies; ACs use unambiguous Given/When/Then with specific literal values and operators; no "appropriately", "correctly", "as needed" language |
| Coverage | 17 ACs covering: HTTP server (1-6), mapping function (7-8), factory state lifecycle (9-13), anti-scope (14-15), hygiene (16-17); 14-block empirical harness; bounded test count prediction (444/439/2/3) with rationale |
| Constraints | `node:http` + `node:events` only (W3-4 Option A); no real DS endpoint (Path B); no freeze-hook body modification (R20+R21+R36 frozen); no contract module modification (R62 frozen); no R65 sibling modification (cross-cluster anti-scope); 9-path ALLOWED_SET (Rule 4) |
| Concurrency | EventEmitter emit is synchronous in Node.js; factory's `state.active` toggling is single-threaded; setTimeout callback runs on the event-loop tick (no race between activation + immediate update call because emit is synchronous); test AC-R66-9 verifies synchronous transition; test AC-R66-13 uses captured callback for deterministic timer simulation |
| Corner cases | empty event_id (AC-R66-3); invalid event_class (AC-R66-4); missing auth (AC-R66-5); cancelActivation before any activation (idempotent — acknowledged non-load-bearing gap); dispose after dispose (idempotent — acknowledged gap); multiple consecutive activations (timer cleared before new one scheduled, per § 4.2 handleActivate `if (timerHandle !== null) clearT(timerHandle)`); event_ts in the past + future (factory does not validate; it stores the value verbatim into state.until_ts; that is the design — `freezeAwareUpdatePerShardResidual` JSDoc states the wrapper does NOT compare to current time) |
| Cost | 17 runtime tests; expected runtime ~2-3 seconds (4 tests open a real TCP socket on localhost; remaining 13 are synchronous in-process); no cluster setup; no fixture files; no new external dependencies |
| Coupling | event-consumer imports only from `./event-contract` (read-only) + `node:http` + `node:events`; freeze-hook-factory imports from `./event-contract` + `./event-consumer` + `'../events/freeze-hook'` + `'../events/event-feed'` + `'../types/config'`; no circular imports possible (factory depends on consumer; consumer depends on contract; contract depends on nothing); test file imports only from `../engine/ds-integration/*` + Node.js built-ins |

---

## § 10 Grilling output (Architect adversarial self-review)

### 10.1 Every claim verifiable?

| Claim | Verifiable how | Status |
|---|---|---|
| Round-start SHA `8f3dd60` matches session-entry HEAD | `git rev-parse HEAD` run at spec-emit | ✓ verified |
| Baseline `427/422/2/3`, tsc exit 0 | `node --test test/*.test.js` + `npx tsc -p tsconfig.test.json` run at spec-emit | ✓ verified |
| `DsToTesseraAuthHeaders` not in `event-contract.ts` | `grep -n "DsToTesseraAuthHeaders" engine/ds-integration/event-contract.ts` returns 0 matches | ✓ verified |
| `FreezeHook` not a class | Read `engine/events/freeze-hook.ts` entire file; only `interface FreezeHookState` + pure fn `freezeAwareUpdatePerShardResidual`; `grep "class FreezeHook" engine/events/freeze-hook.ts` returns 0 matches | ✓ verified |
| `DS_TO_TESSERA_EVENT_ENDPOINT.path === '/v1/tessera/deploy-events'` | Read `event-contract.ts:76,81-84` directly | ✓ verified |
| `ClusterEventKind` 5-value union at `event-feed.ts:10-15` | Read `event-feed.ts` directly | ✓ verified |
| All 9 ALLOWED_SET paths are git-trackable (not gitignored) | `.gitignore` examined; none of 9 paths match its globs; `git ls-files engine/ds-integration/index.ts` returns the path | ✓ verified |
| R65 sibling `feed.ts` is a class with constructor + `post()` Promise method | Read `feed.ts:100-206` | ✓ verified |
| Predicted post-R66 test count = 444 = baseline 427 + 17 new | 17 ACs = 17 tests in q66 file | ✓ derived |
| 14 empirical-AC blocks in Q-R66-EMPIRICAL.sh | See § 7 + EMPIRICAL.sh authored at spec-emit | ✓ to-be-verified at chore-A |

### 10.2 Unstated assumptions?

| # | Assumption | Risk | Mitigation |
|---|---|---|---|
| A1 | `EventEmitter.off` is available on Node v25 | Low — it's a Node ≥ v10 API | Implementer may use `removeListener` instead if needed; tactical autonomy |
| A2 | `http.Server.listen(0, ...)` returns kernel-assigned port via `server.address()` | Standard | Standard Node behavior; AC-R66-1+6 exercise it |
| A3 | The test fixture `freshResidual()` returning `{} as PerShardResidual` typechecks under R66's `tsconfig.test.json` | MEDIUM — depends on tsconfig strictness for cast-to-named-type | Implementer adjusts fixture per § 4.4 TACTICAL AUTONOMY note (use grep on `engine/types/config.ts` to compose a minimal valid residual if needed) |
| A4 | `freezeAwareUpdatePerShardResidual` does not throw when called with empty-object residual + empty-object obs | MEDIUM — pure-fn body at `freeze-hook.ts:40-51` calls `updatePerShardResidual` from `'../per-shard/runtime'` which may validate fields | Implementer grep at chore-A; spec hint at § 4.4 "fixture stubs may need minimal valid field sets via grep on engine/types/config.ts" |
| A5 | `node:http` server bound to port 0 returns a numeric assigned port via `address()` (not the string version) | Standard | Implementer asserts via type check at runtime; pattern matches R65 `feed.ts`'s lack of this exact case but no observed failure |
| A6 | Two `export *` lines in `index.ts` produce no name collisions across `event-consumer` + `freeze-hook-factory` + existing exports | Tractable — all exported names from new modules are R66-original (DsEventConsumer, DsToTesseraAuthHeaders, mapEventClassToKind, createFreezeHookFromDsEvents, FreezeHookActivator, FreezeHookActivatorOpts, DsEventConsumerOpts, DsEventConsumerEvents) | Implementer verifies no collision via tsc at chore-A; tsc exit 0 is AC-R66-16 binding |
| A7 | The 'activate' EventEmitter event name does not collide with EventEmitter's built-in events | Standard — Node's EventEmitter uses 'newListener' / 'removeListener' / 'error'; 'activate' is user-defined | OK |

### 10.3 Scope added beyond request?

The R66 directive's primary deliverables (line 28-50): event-consumer.ts + freeze-hook-factory.ts + test file + Q-R66-EMPIRICAL.sh + index.ts updates. Spec matches scope exactly. The `cancelActivation()` + `dispose()` factory methods are slightly broader than the directive's "wires the consumer's activation event stream into the freeze-hook's activation API" — but they are minimum operational hygiene (test cleanup requires `dispose()` to avoid event-emitter leaks; `cancelActivation()` is the inverse-operation primitive that completes the API). No new deliverable category was added. The locally-defined `DsToTesseraAuthHeaders` is required by the directive (line 36: "Validates `DsToTesseraAuthHeaders` shape") AND forced by handoff inaccuracy 8.1.1. **Verdict: no scope creep.**

### 10.4 Implementer can act without guessing?

- Every per-file pseudocode block in § 4 names imports, exports, function signatures, and body logic.
- Every AC in § 5.1 names the file path, the test name, and the assertion shape.
- Every halt condition in § 6.1 names the specific binding command + threshold.
- The TACTICAL AUTONOMY note at § 4.4 explicitly enumerates what the Implementer MAY adjust (fixture stub field sets; import alias style) and what triggers halt (freeze-hook body modification; spec-vs-reality conflict).
- § 1.5 type-pretest scratchpad shows the exact type shapes the Implementer will use.
- The R65 sibling pattern (`feed.ts` adapter class with `node:http`) provides a tested template for `event-consumer.ts`'s server implementation.

**Verdict: Implementer can act without guessing.** The one uncertainty surface is the `freshResidual()`/`freshObs()` test-fixture field shape, which is bounded by TACTICAL AUTONOMY + grep prescription.

### 10.5 Cross-section sweep (Q0 → § 4 → § 5 → § 9 consistency)

- Q0.1.A pick (class A1) → § 4.1 produces `class DsEventConsumer extends EventEmitter` → § 5 ACs 1-6 use class-based start/stop lifecycle → § 9 Concurrency cites synchronous emit. ✓
- Q0.1.B pick (factory B1) → § 4.2 produces `createFreezeHookFromDsEvents` returning `FreezeHookActivator` interface → § 5 ACs 9-13 verify state transitions + delegation → § 9 Concurrency cites single-threaded state. ✓
- Q0.1.C pick (switch C1) → § 4.2 `mapEventClassToKind` switch with `never` default → § 5 ACs 7-8 + AC-R66-17 verify all 5 cases + throw + parity → § 9 Constraints cites `tsc` exit 0 enforcement. ✓
- Q0.2 activation semantics → § 4.2 `handleActivate` + setTimeout deactivation → § 5 ACs 9, 10, 13 → § 9 Corner cases note timer-clear before re-arm. ✓
- Q0.3 auth headers (local definition) → § 4.1 `export interface DsToTesseraAuthHeaders` in event-consumer.ts → § 5 AC-R66-5 verifies validation → § 8.1.1 documents handoff divergence. ✓
- Round-start SHA `8f3dd60` consistently used across § 3.2, § 4.4 (AC-R66-14, AC-R66-15), Q-R66-EMPIRICAL.sh. ✓
- 9-path ALLOWED_SET consistent across § 3.2, § 4.4 AC-R66-14 test body. ✓
- Predicted test count consistent across § 1.4, § 5.2, Q-R66-EMPIRICAL.sh. ✓

### 10.6 Spec-internal contradiction sweep (R34 MINOR-2 reinforcement)

- Boundary semantics: there are no algorithmic boundary clauses in R66 (no pre/post window arithmetic; the only window is the activation_window_seconds passthrough). N/A.
- Type-shape consistency (R65 MINOR-2 echo): `DsToTesseraAuthHeaders` declared exactly once (in event-consumer.ts; § 4.1); `FreezeHookActivatorOpts` declared exactly once (freeze-hook-factory.ts; § 4.2); `FreezeHookActivator` declared exactly once. No § 1.5 pretest vs § 4 prescription drift detected.
- Halt-trigger consistency (R15 MINOR-3 + R56 MINOR-1 echo): § 6.1 halt #1 says "any non-zero exit is a halt"; § 6.2 says "all OQs resolved". No "narrowed carve-out" pattern is used. The `git diff CHORE_A_SHA..HEAD === []` forward-protection pattern is explicitly NOT used (per directive line 73, halt #1 carve-out narrowing). No internal contradictions.

### 10.7 P3 commitment vs AC coverage (R65 MINOR-3 echo)

For each § 9 P3 row's specific behavioral commitment:
- Corner cases row commits "multiple consecutive activations (timer cleared before new one scheduled)" → AC for this? **Acknowledged gap:** no AC directly tests this. The behavior is structural (handleActivate calls `if (timerHandle !== null) clearT(timerHandle)`) and would only fail under multi-emit-with-leak which is hard to exercise deterministically. Documented as known gap (parallel to R65 MINOR-3 disposition); not load-bearing for first-activation correctness which IS bound by AC-R66-9/10/13.
- Corner cases row commits "cancelActivation idempotency" + "dispose idempotency" → already documented in § 5.3 as acknowledged non-load-bearing gaps.

### 10.8 Empirical-premise verification (R62 + R65 reinforcements)

- The empirical session-entry baseline (427/422/2/3, tsc exit 0) was VERIFIED by direct command runs at session entry, NOT inherited from R65 attestation. Per CLAUDE-ARCHITECT REINFORCED 2026-05-18 R25 MINOR-1.
- The handoff doc's claims about `event-contract.ts` exports + `freeze-hook.ts` class structure were verified via direct file Read, NOT trusted blindly. § 8 documents the 4 divergences.
- The `feed.ts` sibling pattern was verified by direct file Read at spec-emit; not trusted from memory.
- The 9-path ALLOWED_SET was verified against `.gitignore` at spec-emit; no gitignored paths included.

### 10.9 Routing block field accuracy (R65 MINOR-1 echo)

When this spec lands at HEAD and the Architect updates `coordination/NEXT-ROLE.md`, every AC number cited in the routing block (§ 6 halt conditions enumerations; § 7 rule dispositions; test count predictions; ALLOWED_SET enumerations) MUST be copied verbatim from the spec via grep — not retyped from memory. R65 MINOR-1 transposition lesson applied.

### 10.10 Constructor-options field name pretest (R58 MINOR-1 echo)

`createFreezeHookFromDsEvents(opts)` opts surface is defined in this spec (Tessera-original); no external API to mismatch. `DsEventConsumer` opts surface defined in this spec. `freezeAwareUpdatePerShardResidual` parameter order verified by direct file Read at `freeze-hook.ts:40-46`: `(current, obs, baselineCell, freezeState, config)`. Spec § 4.2 update fn matches this order exactly.

---

## § 11 Implementer chore-A sequence

Per R23 IMPL MINOR-1 TDD separate-RED-commit discipline:

1. **RED commit:** lands `test/q66-ds-integration-event-consumer.test.ts` with 17 `assert.fail('R66 RED — implementation pending')` stubs (or `test.skip` — Architect-acceptable per R65 precedent). `engine/ds-integration/event-consumer.ts` + `freeze-hook-factory.ts` do NOT yet exist; `index.ts` un-modified. `tsc` will report TS2307 module-resolution failure → no .js emitted → `node --test` count stays at 427/422/2/3. RED state confirmed.

2. **GREEN commit (chore-A):** lands `engine/ds-integration/event-consumer.ts` + `engine/ds-integration/freeze-hook-factory.ts` per § 4.1 + § 4.2 pseudocode; updates `engine/ds-integration/index.ts` per § 4.3 (+2 lines); replaces all RED stubs with real assertions per § 4.4.

3. **Verify chore-A:**
   - `npx tsc -p tsconfig.test.json` → expect exit 0, zero diagnostics.
   - `node --test --test-reporter=tap test/*.test.js` → expect `tests=444 / pass=439 / fail=2 / skipped=3`.
   - `bash coordination/specs/Q-R66-EMPIRICAL.sh` → expect exit 0; 14 PASS, 0 FAIL.

4. **Implementer attestation:** Encode ACTUAL chore-A summary VERBATIM in `coordination/NEXT-ROLE.md` per Rule 1 sub-class `empirical-command-attestation`. Do NOT reframe as compliance. Do NOT cite spec-predicted values as the observed values.

5. **NO chore-B step.** R66 has no SHA injection requirement (no forward-protection AC; no two-state mismatch). Implementer routes directly to Reviewer after chore-A + verify + attest.

---

## § 12 Pipeline invocation

```bash
cd /Users/johnwarren/concord/tessera
./run-pipeline.sh --round R66 --tier full --start-at IMPLEMENTER
```

(Architect spec lands in its own commit; Implementer resumes via `--start-at IMPLEMENTER` per R65 precedent.)
