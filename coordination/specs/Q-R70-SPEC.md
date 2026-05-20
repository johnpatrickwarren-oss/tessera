# Q-R70-SPEC — Tessera demo scenario runner (post-publication leverage)

**Round:** R70 (post-Phase-3-close; post-v1-publication)
**Tier:** full (Architect + Implementer + Reviewer + Memorial-Updater)
**Round-start SHA:** `4e30c2f` (chore(R70 directive); verified at Architect session entry via `git rev-parse HEAD`)
**Spec-emit SHA:** to be stamped by Architect commit (this spec triad lands BEFORE chore-A per R21 ARCH MINOR-1)
**Authority:** `coordination/NEXT-ROLE.md` § R70 Round-scope directive (2026-05-20).

---

## § 0. Brainstorm (Superpowers Phase 1)

The R70 directive frames the gap: Tessera v1 has 440+ AC-bound discipline tests but no narrative demo. A visitor cannot, in 30 seconds, **see** what the engine does. The brainstorm produces three architectures for the demo runner and picks the best tradeoff.

### Approach A — Full-engine integration

Each scenario builds a complete `CompiledConfig` + `BaselineCellEntry` + multi-shard `PerShardCell` array, then drives the per-tick pipeline (Family A/C/D/E detector cascade + per-shard residual + fleet-merge + e-BH FDR + freeze-hook) over N synthetic ticks per scenario.

- **Strengths:** highest fidelity; demo IS the production pipeline; no "demo-only" code paths.
- **Weaknesses:** large wiring surface (`MSPRTParams` + `FamilyAPerSignalParams` + `BaselineCellEntry.family_A.per_signal` + `cfg.alpha_budget` + `bake_profiles` + `bonferroni_factor` etc.); brittle to engine evolution; per-scenario runtime likely > 60 s at N=10 shards; output drowns the narrative in audit-record noise.
- **Hidden assumption:** the calibrator path that normally fills `derivation.mean` / `derivation.empirical_variance` would have to be replaced by a hand-built `BaselineCellEntry`; that's a non-trivial fixture-construction effort that would itself need spec attention.
- **Risk:** R61-class architectural-reality discovery — claim-then-walk could surface that the full `evaluateBettingEProcess` path requires types or fields the demo can't synthesize without engine modification (anti-scope #2 violation).

### Approach B — Pure narrator (no engine invocation)

Each scenario synthesizes the verdict outputs directly (hard-coded numbers) and just renders ASCII. The engine is not invoked.

- **Strengths:** trivially deterministic; trivially fast; minimal wiring.
- **Weaknesses:** demo is fake — the README "Quick demo" surface would essentially be a video playback, not a live exercise of the product. A visitor cannot trust the demo demonstrates anything real about Tessera's behavior. PRD US-04 ("statistically-rigorous fleet detector") is not load-bearing if the demo bypasses the detector.
- **Hidden assumption:** "demo" means "screenshot" rather than "live exercise."
- **Risk:** the entire round becomes a documentation deliverable; reviewer would (rightly) ask "what does this prove?".

### Approach C — Selective engine integration (PICKED)

Each scenario exercises the ONE engine surface most relevant to its narrative, at the most direct API level, while synthesizing inputs that bypass the calibrator + full-pipeline wiring:

- `clean-baseline` → invokes `updateBettingState` (engine/detectors/betting-e-process.ts:151) N times per shard with H₀-distributed numbers; no firings.
- `sdc-drift` → invokes `updateBettingState` per shard; mean-shift injected on one shard from window k onward; wealth crosses 1/α threshold by window N; per-shard residual narrative (which-shard-specifically) is illustrated via the seeded wealth trajectory.
- `common-mode-rack` → invokes `attributeCommonMode` (engine/topology/common-mode-attribution.ts:131) on a hand-constructed `TopologySnapshot` with 3 fired shards on a shared rack; surfaces 1 common-mode candidate.
- `event-conditional` → constructs a `DsEventConsumer` (engine/ds-integration/event-consumer.ts:169) WITHOUT calling `.start()` (so no HTTP server binds); wires a `FreezeHookActivator` via `createFreezeHookFromDsEvents` (engine/ds-integration/freeze-hook-factory.ts:87); emits 'activate' on the consumer; calls `activator.update()` on a synthetic residual and shows residual is frozen.

The narrator-vs-engine boundary: synthetic inputs (mean, σ², draw values, topology fixture) are demo-side; the math + state transitions + attribution + freeze logic come from `engine/`.

- **Strengths:** real engine code paths exercised; bounded wiring per scenario; bounded runtime (<10 s per scenario); deterministic via seeded LCG; the demo IS Tessera's per-shard observation surface in miniature.
- **Weaknesses:** the demo doesn't run Family C/D/E or e-BH FDR; that's an honest narrative simplification disclosed in the scenario header text.
- **Hidden assumption:** Family A wealth-martingale numerics are the right "show this" surface (justified — it's the most-recognizable per-shard signal in Tessera's pitch).
- **Risk:** scenario picks a numerically-sensitive boundary case and the wealth doesn't actually cross 1/α at the expected window under the chosen seed. Mitigation: Implementer empirically tunes the injected drift magnitude until the chosen seed reliably crosses; the Architect's pseudocode commits to A SPECIFIC seed but allows the drift magnitude to be tuned in a narrow band (documented in pseudocode comments).

### Constraint elimination from PRD/directive

- Anti-scope #1 (no new external deps) eliminates any approach that wants `chalk`/`cli-table3`/etc.
- Anti-scope #2 (no engine modifications) eliminates any approach that wants to add a demo-only convenience function to engine/*.
- Halt #6 (R62+R66+R68 round-evolution AC fragility) eliminates forward-protection ACs, live-file-count ACs, and anti-scope-diff-against-prior-round ACs.
- 30-60 s per scenario eliminates Approach A (full pipeline at N=10 shards × N ticks would routinely exceed this).
- "Show this in 30 seconds" eliminates Approach B (a static screenshot is not a demo).

### Selection rationale

**Approach C selected.** It is the only approach that simultaneously (a) honors anti-scope, (b) exercises real engine code, (c) fits the runtime budget, and (d) produces narrative output a viewer can read.

**What was rejected:**
- A — wiring complexity blows the budget and would force a calibrator-bypass design that itself needs spec attention.
- B — produces a demo that doesn't actually demonstrate the product.

The selection rationale is documented inline above per Superpowers Brainstorm step 5.

---

## § 1. Design phase (Superpowers Phase 2)

### 1.1 Component boundaries

| Layer | Exists | Created | Changed | Deleted |
|---|---|---|---|---|
| Demo runner | — | `tools/demo-scenario.ts` (single file; ~400 lines TS) | — | — |
| Engine | `engine/detectors/betting-e-process.ts` (`updateBettingState`, `freshBettingState`), `engine/topology/common-mode-attribution.ts` (`attributeCommonMode`), `engine/ds-integration/event-consumer.ts` (`DsEventConsumer`), `engine/ds-integration/freeze-hook-factory.ts` (`createFreezeHookFromDsEvents`, `mapEventClassToKind`), `engine/events/freeze-hook.ts` (`freezeAwareUpdatePerShardResidual`), `engine/per-shard/warm-start.ts` (`initialPerShardResidual`) | — | — | — |
| Tests | — | `test/q70-demo-scenario.test.ts` (single file) | — | — |
| Package | `package.json` (scripts block) | — | adds 2 entries (`predemo`, `demo`) | — |
| README | `README.md` | — | adds 1 section ("Quick demo") between existing "Getting started" and "Methodology" | — |
| Spec triad | — | `Q-R70-SPEC.md`, `Q-R70-SPEC-AUDIT.md`, `Q-R70-EMPIRICAL.sh` | — | — |

### 1.2 Data flow per scenario

```
CLI invocation (pnpm demo <scenario>)
   → tools/demo-scenario.js (compiled from .ts)
   → parseArgs() picks scenario name
   → runScenario(name, opts) dispatches to one of:
       runCleanBaseline / runSdcDrift / runCommonModeRack / runEventConditional
   → each scenario function:
       a. seedRng(SCENARIO_SEED)
       b. buildSyntheticInputs()       — topology, baseline mean/σ², draw fn
       c. invoke ONE engine surface    — updateBettingState | attributeCommonMode | freezeAwareUpdatePerShardResidual
       d. collectResults()              — firing shards, candidates, state
       e. renderAscii()                  — header + topology diagram + table + verdict block
       f. return ScenarioResult { scenario, output, firing_shards, common_mode_candidates, freeze_active }
   → CLI prints result.output, exits 0
```

### 1.3 Integration points with engine surfaces (claim-then-walk verified at Architect session entry; engine SHA = `4e30c2f`)

| Engine entry point | Source file:line | Signature (verbatim) | Demo usage |
|---|---|---|---|
| `freshBettingState` | engine/detectors/betting-e-process.ts:72 | `(): BettingEProcessState` returning `{ M:1, bet:0, n:0, alphaConsumed:0, runningMean:0, runningSecondMoment:0, onsFallbackCount:0 }` | Allocate per-shard state in `clean-baseline` and `sdc-drift`. |
| `updateBettingState` | engine/detectors/betting-e-process.ts:151 | `(state: BettingEProcessState, x: number, baselineMean: number, sigmaSquared: number, perTickAlpha: number): number` — MUTATES state in-place; returns updated `state.M`. | Drive wealth martingale per shard per window in `clean-baseline` and `sdc-drift`. |
| `attributeCommonMode` | engine/topology/common-mode-attribution.ts:131 | `(input: CommonModeAttributionInput): CommonModeAttributionResult` where input = `{ fired_events: readonly FiredShardEvent[], snapshot: TopologySnapshot, opts?: CommonModeAttributionOpts }` and result includes `candidates: readonly CommonModeCandidate[]` | Surface common-mode candidate from synthetic 3-shard rack-localized firing set. |
| `DsEventConsumer` constructor | engine/ds-integration/event-consumer.ts:169 (extends EventEmitter) | `new DsEventConsumer(opts: DsEventConsumerOpts)` where opts = `{ host?, port: number, request_timeout_ms? }`; constructor does NOT bind a server — `.start()` does. | Construct a consumer with `{ port: 0 }`; never call `.start()`; the consumer is a typed EventEmitter for the factory to subscribe to. |
| `createFreezeHookFromDsEvents` | engine/ds-integration/freeze-hook-factory.ts:87 | `(opts: FreezeHookActivatorOpts): FreezeHookActivator` with `.update(current, obs, baselineCell)`, `.getState()`, `.cancelActivation()`, `.dispose()` | Wire the consumer to the freeze-hook surface; emit 'activate' on consumer; call `.update()`; observe that residual is returned unchanged when freeze is active. |
| `freezeAwareUpdatePerShardResidual` | engine/events/freeze-hook.ts:40 | `(current, obs, baselineCell, freezeState, config) => PerShardResidual`; returns `current` unchanged when `config.freeze_hook_enabled === true && freezeState.active === true`. | Invoked transitively by `activator.update()`; demo asserts on the reference-equality of the returned residual to demonstrate freeze. |
| `initialPerShardResidual` | engine/per-shard/warm-start.ts:38 | `(): PerShardResidual` returning `{ n_samples: 0, confidence: 'none' }`. | Seed the `event-conditional` scenario's per-shard residual. |

**Failure modes at each integration point:**

1. `updateBettingState` requires `sigmaSquared > 0` (line 158 guard `Math.max(sigmaSquared, 0)`; line 140 `denom > 0` check inside `boundedZ`). Demo passes σ² = 1; safe.
2. `updateBettingState` mutates state in-place — multiple calls accumulate. Demo allocates `freshBettingState()` per shard once at scenario start.
3. `attributeCommonMode` silently skips fired-events whose `shard_node_id` does not match any node in the snapshot (line 161 comment "F4: unknown shard silently skipped"). Demo builds the snapshot first, then the fired-events list referring to existing nodes — verified by construction.
4. `DsEventConsumer` extends `EventEmitter`. Emitting 'activate' before `createFreezeHookFromDsEvents` subscribes would lose the event. Demo wires the factory FIRST, then emits — fixed ordering.
5. `createFreezeHookFromDsEvents` uses `setTimeout` to auto-deactivate after `activation_window_seconds` (default 300, line 90). Demo passes a stub `setTimeout: (cb, ms) => null` (cast `as unknown`) so the activation does NOT auto-cancel within the demo's runtime window. **Documented design choice**: demo never calls `activator.dispose()` either — the process exits before the timer would fire under a real `setTimeout`.
6. `attributeCommonMode` candidate sort uses `KIND_SORT_ORDER = { psu: 0, rack: 1, cooling_zone: 2 }` (line 123). Demo's common-mode-rack scenario surfaces a `rack`-kind candidate; sort order is deterministic.
7. `freezeAwareUpdatePerShardResidual` consults `config.freeze_hook_enabled === true` (line 47, strict equality). Demo passes `{ freeze_hook_enabled: true }` for the freeze-active scenario; passes `{}` (or absent) for the reference-comparison "would have updated" demonstration.

---

## § 2. Mechanism

The R70 deliverable is a CLI runner at `tools/demo-scenario.ts` that, given a scenario name, exercises one engine surface against synthetic inputs and emits a deterministic ASCII narrative to stdout. The runner is a single `.ts` file compiled to `tools/demo-scenario.js` by the existing `tsconfig.test.json` build path (which already includes `tools/**/*.ts` per tsconfig.test.json:13-14).

The runner exposes one public function `runScenario(name: ScenarioName, opts?: ScenarioOpts): ScenarioResult` consumed BOTH by the CLI entry point AND by the q70 test file. CLI invokes via `process.argv` parsing; tests import `runScenario` directly. This avoids subprocess overhead in tests.

Determinism is achieved by a fixed LCG seeded at scenario start (no `Math.random()` calls; no `Date.now()` calls). All timestamps in scenarios are fixed literal values. Test assertions discriminate on STRUCTURAL output markers AND on the `ScenarioResult` structured fields (not on full byte-identical output) — this lets the Implementer iterate on cosmetic formatting without breaking discipline tests, while still proving discipline coverage.

### 2.1 The four scenarios

| Scenario name (CLI literal) | Engine surface exercised | Synthetic input | Visible behavior |
|---|---|---|---|
| `clean-baseline` | `freshBettingState` + `updateBettingState` | 10 shards × 30 windows × H₀-distributed draws (μ=0, σ²=1) | No firings; all shards' M_t stays ≪ 1/α; demo confirms "no false positives on healthy fleet." |
| `sdc-drift` | `freshBettingState` + `updateBettingState` | 10 shards × 30 windows × H₀ draws PLUS additive drift on shard-04 from window 6 onward | shard-04's M_t crosses the 1/α threshold; demo announces "shard-04 FIRE" + window-crossing window number. |
| `common-mode-rack` | `attributeCommonMode` | Hand-built `TopologySnapshot` with 6 gpu_shard nodes + 2 rack nodes + edges; 3 fired-shard events on shards in `rack-A` | 1 common-mode candidate surfaced (shared_node = `rack-A`, member_count = 3); demo announces "1 common-mode candidate." |
| `event-conditional` | `DsEventConsumer` + `createFreezeHookFromDsEvents` + `freezeAwareUpdatePerShardResidual` (transitively) | 1 shard's residual seeded via `initialPerShardResidual()`; consumer constructed (no `.start()`); factory wired; `consumer.emit('activate', payload)` called BEFORE `activator.update(...)` | activator.update() returns the SAME residual object (reference equality `===`); demo announces "freeze active: yes" + "absorbed: false." |

### 2.2 ASCII rendering (specified structure; cosmetic latitude under TACTICAL AUTONOMY)

Each scenario's output begins with a **fixed header** and ends with a **fixed verdict block**. The structure between header and verdict is scenario-specific.

**Header (all scenarios):**

```
═══════════════════════════════════════════════════════════════════
  Tessera demo · <scenario-name>
═══════════════════════════════════════════════════════════════════
```

The single-line `Tessera demo · <name>` literal MUST appear in stdout (asserted by tests).

**Verdict block (all scenarios):** ends with a single line `Demo complete. (exit 0)`. The literal `Demo complete.` MUST appear in stdout (asserted by tests).

**Scenario-specific markers** the tests assert on are enumerated in § 5 acceptance criteria.

### 2.3 Determinism mechanism

A 32-bit LCG (`state = (state * 1664525 + 1013904223) >>> 0`) produces uniform-ish draws scaled into the Gaussian region by Box-Muller. The seed per scenario is a fixed literal:

- `clean-baseline` → seed = `0x70CB1`
- `sdc-drift` → seed = `0x70D1F`
- `common-mode-rack` → seed = `0x70C2D` (used only for output-line ordering, since attribution is deterministic by snapshot structure)
- `event-conditional` → seed = `0x70E2C`

(Seed literal choice is arbitrary; Architect commits to these exact values so Reviewer can verify run-to-run identity at HEAD.)

No `Math.random()`, no `Date.now()`, no `process.hrtime()` calls. All "timestamps" embedded in demo output are fixed literal numbers (e.g., `fetched_at_ts: 1_700_000_000`).

### 2.4 Why these four scenarios (selection rationale)

The four scenarios were picked over alternatives (e.g., `e-bh-fdr`, `family-c-rff`, `topology-overlay-enrich`) because they map 1:1 to PRD user stories US-01 (fault attribution), US-02 (common-mode), US-03 (event-conditional), US-04 (statistical rigor — clean-baseline shows no false positives). Each one is the simplest possible demonstration of its US, fits in <10 s, and exercises one engine entry point. `e-bh-fdr` would require constructing a 100-shard FusedVerdict array and is omitted (out-of-scope at R70; candidate for a future Phase 4 demo extension).

---

## § 3. Component inventory + Anti-scope ALLOWED_SET

### 3.1 What exists / what gets created / what changes

**Existing files the demo reads (READ-ONLY; no modification):**

- `engine/detectors/betting-e-process.ts` — `freshBettingState`, `updateBettingState`, `BettingEProcessState` type (declared at `engine/types/families/a.ts:20`)
- `engine/topology/common-mode-attribution.ts` — `attributeCommonMode`, `FiredShardEvent`, `CommonModeCandidate`, `CommonModeAttributionInput`
- `engine/ds-integration/event-consumer.ts` — `DsEventConsumer` class
- `engine/ds-integration/freeze-hook-factory.ts` — `createFreezeHookFromDsEvents`, `FreezeHookActivator`, `FreezeHookActivatorOpts`
- `engine/ds-integration/event-contract.ts` — `DeployEventPayload` type
- `engine/events/freeze-hook.ts` — `FreezeHookState` type (transitively consumed via factory)
- `engine/per-shard/warm-start.ts` — `initialPerShardResidual`
- `engine/per-shard/runtime.ts` — `ExtendedSampleObservation` type
- `engine/types/verdict.ts` — `TopologyNode`, `TopologyEdge`, `TopologySnapshot` (R18 + R23 + R26 + R47 vendored-with-deltas — see file header)
- `engine/types/config.ts` — `PerShardResidual`, `BaselineCellEntry`

**Files CREATED at R70:**

| Path | Purpose |
|---|---|
| `tools/demo-scenario.ts` | Single-file demo runner; exports `runScenario`, `ScenarioName`, `ScenarioResult`; has CLI guard via `require.main === module` |
| `test/q70-demo-scenario.test.ts` | 11 ACs (see § 5) exercising the scenario surface |
| `coordination/specs/Q-R70-SPEC.md` | This file |
| `coordination/specs/Q-R70-SPEC-AUDIT.md` | Architect ceremony sidecar |
| `coordination/specs/Q-R70-EMPIRICAL.sh` | Chore-A verification harness (Rule 1 ACTIVE GATE) |

**Files MODIFIED at R70:**

| Path | Modification |
|---|---|
| `package.json` | Append two entries under `scripts`: `"predemo": "tsc -p tsconfig.test.json"` and `"demo": "node tools/demo-scenario.js"`. No other modifications. Trailing comma placement follows existing JSON style. |
| `README.md` | Insert a `## Quick demo` section after the existing `## Getting started` section and before the existing `## Methodology` section. 3-5 lines + a fenced code block. |
| `coordination/NEXT-ROLE.md` | Architect routing block + Implementer routing block + Reviewer routing block (one per role as the round progresses) |
| `coordination/MEMORIAL.md` | Per-role append-only entries (CONFIRMATION / VIOLATION) |

**Files CONDITIONALLY created (only on ESCALATE):**

| Path | Trigger |
|---|---|
| `coordination/diagnostics/DIAGNOSTIC-R70-<topic>.md` | Implementer hits any halt condition; pattern matches `coordination/diagnostics/DIAGNOSTIC-R70-*.md` |

**Files CREATED by Reviewer (not at chore-A):**

| Path | Owner |
|---|---|
| `coordination/reviews/REVIEWER-REPORT-R70.md` | Reviewer post-Implementer |
| `coordination/ROUND-R70-SUMMARY.md` | Memorial-Updater post-Reviewer |

### 3.2 Anti-scope ALLOWED_SET (chore-A diff path-set)

The chore-A commit's `git diff <round-start>..HEAD --name-only` MUST be a subset of the following enumerated ALLOWED_SET. The round-start SHA is `4e30c2f` (the directive commit; verified by `git rev-parse HEAD` at Architect session entry — the Architect's own spec-triad commit becomes the SHA Reviewer should diff from for chore-A path enumeration). Per R15 MINOR-1 reinforcement, the chore-A diff lower bound is the spec-triad commit SHA (post-Architect; pre-Implementer), not the directive commit, so Memorial-Updater + operator-prep commits do NOT inflate the diff.

**ALLOWED_SET for chore-A** (relative to the spec-triad commit SHA stamped by the Architect's commit):

```
tools/demo-scenario.ts
tools/demo-scenario.js                                      ← compiled output (gitignored per .gitignore *.js; would not appear in tracked diff — included defensively for the case where compilation outputs are tracked elsewhere)
test/q70-demo-scenario.test.ts
test/q70-demo-scenario.test.js                              ← compiled output (gitignored)
package.json
README.md
coordination/NEXT-ROLE.md
coordination/MEMORIAL.md
```

**Regex carve-outs (conditional paths that may appear at chore-A):**

```
coordination/diagnostics/DIAGNOSTIC-R70-.+\.md             ← only if Implementer halts
```

**Verification convention.** Per R23 ARCH MINOR-2: `git ls-files <path>` must return non-empty for any path listed above that is expected to be tracked. The `.js` rows are listed defensively; they are gitignored per `.gitignore` (which excludes compiled output) and therefore will NOT appear in `git diff --name-only` — so Implementer should not be surprised if the actual diff is shorter than the ALLOWED_SET. The diff-subset gate is one-directional: every PATH in the diff must appear in ALLOWED_SET; ALLOWED_SET entries are not required to appear in the diff.

**No "live-file-count" assertions, no "forward-protection" assertions, no "anti-scope diff against prior-round allowed-set" assertions.** Per R62+R66+R68 cumulative reinforcement. Q-R70-EMPIRICAL.sh binds chore-A's diff path-set against the historical (round-start..HEAD) bound only; no SHA-injection two-state pattern; no chore-B commit.

### 3.3 Frozen surfaces (NO modification at R70)

Per R70 directive § Anti-scope; cited here for spec-self-consistency:

1. `engine/**/*.ts` — entirety frozen (post-Phase-3 close; demo consumes engine, does not modify)
2. `engine/ds-integration/feed-contract.ts` + `event-contract.ts` (R62 frozen)
3. `engine/ds-integration/feed.ts` (R65 frozen)
4. `engine/ds-integration/event-consumer.ts` + `freeze-hook-factory.ts` (R66 frozen)
5. `engine/events/freeze-hook.ts` (R20+R21+R36 frozen)
6. `coordination/specs/Q-R*-SPEC.md` — all prior-round specs frozen
7. `CLAUDE-*.md` REINFORCEMENTS sections — frozen at R70 (Memorial-Updater discretion only)
8. `test/q01..q66.test.ts` — all pre-R70 tests frozen (only q70 added)
9. `R36-30 / R36-31 / AC-R36-21 / AC-R65-2 / AC-R66-14` carry-forward AC fail set — NOT modified at R70 (deferred to Phase 4 hygiene round per directive)
10. `LICENSE`, `pnpm-lock.yaml`, `.npmrc`, `tsconfig.json`, `tsconfig.test.json` — frozen at R70

---

## § 4. Per-file pseudocode

### 4.1 `tools/demo-scenario.ts` (NEW; single file; ~400 lines)

```typescript
// tools/demo-scenario.ts — Tessera R70 narrative scenario runner.
//
// Goal: convert Tessera from "440 passing AC-bound tests" to
// "show-someone-the-product-in-30-seconds." Four canned scenarios
// exercise one engine surface each; deterministic ASCII output.
//
// Anti-scope: no new external deps; no engine modifications;
// no real-cluster work; no DS-repo modifications.
//
// Tessera-original code. NOT vendored.

import {
  freshBettingState,
  updateBettingState,
} from '../engine/detectors/betting-e-process.js';
import {
  attributeCommonMode,
  type FiredShardEvent,
} from '../engine/topology/common-mode-attribution.js';
import { DsEventConsumer } from '../engine/ds-integration/event-consumer.js';
import { createFreezeHookFromDsEvents } from '../engine/ds-integration/freeze-hook-factory.js';
import { initialPerShardResidual } from '../engine/per-shard/warm-start.js';
import type { TopologySnapshot, TopologyNode, TopologyEdge } from '../engine/types/verdict.js';
import type { ExtendedSampleObservation } from '../engine/per-shard/runtime.js';
import type { DeployEventPayload } from '../engine/ds-integration/event-contract.js';

// (Note: tools/* import convention uses `.js` extensions per existing
//  tools/curate-baseline-pipeline.ts neighbor file at tools/curate-baseline-pipeline.ts:48-53.
//  TypeScript with CommonJS module emission resolves the `.js` to the
//  compiled output at runtime.)

// ── Public types ──────────────────────────────────────────────────────

export type ScenarioName =
  | 'clean-baseline'
  | 'sdc-drift'
  | 'common-mode-rack'
  | 'event-conditional';

export const SCENARIO_NAMES: ReadonlyArray<ScenarioName> = [
  'clean-baseline',
  'sdc-drift',
  'common-mode-rack',
  'event-conditional',
];

export interface ScenarioResult {
  scenario: ScenarioName;
  output: string;                          // Full ASCII output (header + body + verdict)
  firing_shards: ReadonlyArray<string>;    // Sorted lex asc; subset of fleet
  common_mode_candidates: number;          // 0 for non-common-mode scenarios
  freeze_active: boolean;                  // true only when event-conditional has emitted activate
  exit_code: 0;                            // Always 0 on successful runScenario; CLI maps to process.exitCode
}

export interface ScenarioOpts {
  // Currently empty. Reserved for future extension (e.g., shard count override).
  // Architect prescribes the empty shape so the Implementer can extend without
  // changing the public function signature at R70.
  readonly _reserved?: never;
}

// ── Deterministic LCG ──────────────────────────────────────────────────

const SCENARIO_SEEDS: Record<ScenarioName, number> = {
  'clean-baseline':    0x70CB1,
  'sdc-drift':         0x70D1F,
  'common-mode-rack':  0x70C2D,
  'event-conditional': 0x70E2C,
};

function makeLcg(seed: number): () => number {
  // Numerical Recipes LCG; returns uniform [0, 1).
  let s = seed >>> 0;
  return () => {
    s = ((s * 1664525) + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

function boxMullerGaussian(rng: () => number): number {
  // Standard Box-Muller; returns one N(0, 1) draw per call (discards the pair).
  const u1 = Math.max(rng(), 1e-12);  // floor away from 0 to avoid log(0)
  const u2 = rng();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

// ── Constants for clean-baseline + sdc-drift ──────────────────────────

const FLEET_SHARD_COUNT = 10;
const SHARD_IDS: ReadonlyArray<string> = [
  'shard-00', 'shard-01', 'shard-02', 'shard-03', 'shard-04',
  'shard-05', 'shard-06', 'shard-07', 'shard-08', 'shard-09',
];
const WINDOW_COUNT = 30;
const BASELINE_MEAN = 0;
const BASELINE_SIGMA_SQUARED = 1;
// α split convention: family-A α / Bonferroni · 0.5 = 4e-4/6 · 0.5 ≈ 3.3e-5;
// threshold = 1/α ≈ 30_000. Demo uses α_DEMO = 5e-3 so threshold = 200 (visible
// at scale across 30 windows under moderate injected drift; pedagogically clearer
// than the production threshold of ~30_000).
const DEMO_ALPHA = 5e-3;
const DEMO_THRESHOLD = 1 / DEMO_ALPHA;     // 200
// SDC-drift injection: additive shift starting at window 6, growing linearly.
const SDC_TARGET_SHARD_INDEX = 4;          // shard-04
const SDC_DRIFT_START_WINDOW = 6;          // 0-indexed; window 6 = the 7th
const SDC_DRIFT_PER_WINDOW = 0.4;          // injected mean shift per window (tunable; see § 4.1.7)

// ── Scenario: clean-baseline ──────────────────────────────────────────

function runCleanBaseline(): ScenarioResult {
  const rng = makeLcg(SCENARIO_SEEDS['clean-baseline']);
  const states = SHARD_IDS.map(() => freshBettingState());
  const firingShards: string[] = [];

  // Per-window per-shard observation.
  for (let w = 0; w < WINDOW_COUNT; w++) {
    for (let s = 0; s < FLEET_SHARD_COUNT; s++) {
      const draw = boxMullerGaussian(rng); // ~ N(0, 1) under H₀
      updateBettingState(
        states[s],
        draw + BASELINE_MEAN,
        BASELINE_MEAN,
        BASELINE_SIGMA_SQUARED,
        DEMO_ALPHA,
      );
    }
  }
  // Determine firing set (post-loop).
  for (let s = 0; s < FLEET_SHARD_COUNT; s++) {
    if (states[s].M >= DEMO_THRESHOLD) firingShards.push(SHARD_IDS[s]);
  }
  firingShards.sort();

  const output = renderBettingScenario({
    name: 'clean-baseline',
    description: 'Healthy NVIDIA NVLink fleet — no drift injected. Family A betting e-process stays in baseline.',
    states,
    firingShards,
  });

  return {
    scenario: 'clean-baseline',
    output,
    firing_shards: firingShards,
    common_mode_candidates: 0,
    freeze_active: false,
    exit_code: 0,
  };
}

// ── Scenario: sdc-drift ───────────────────────────────────────────────

function runSdcDrift(): ScenarioResult {
  const rng = makeLcg(SCENARIO_SEEDS['sdc-drift']);
  const states = SHARD_IDS.map(() => freshBettingState());
  let thresholdCrossedAtWindow: number | null = null;
  const firingShards: string[] = [];

  for (let w = 0; w < WINDOW_COUNT; w++) {
    for (let s = 0; s < FLEET_SHARD_COUNT; s++) {
      let draw = boxMullerGaussian(rng);
      if (s === SDC_TARGET_SHARD_INDEX && w >= SDC_DRIFT_START_WINDOW) {
        draw += SDC_DRIFT_PER_WINDOW * (w - SDC_DRIFT_START_WINDOW + 1);
      }
      updateBettingState(states[s], draw + BASELINE_MEAN, BASELINE_MEAN, BASELINE_SIGMA_SQUARED, DEMO_ALPHA);
    }
    // Track threshold-crossing window for the target shard.
    if (
      thresholdCrossedAtWindow === null &&
      states[SDC_TARGET_SHARD_INDEX].M >= DEMO_THRESHOLD
    ) {
      thresholdCrossedAtWindow = w;
    }
  }
  for (let s = 0; s < FLEET_SHARD_COUNT; s++) {
    if (states[s].M >= DEMO_THRESHOLD) firingShards.push(SHARD_IDS[s]);
  }
  firingShards.sort();

  const output = renderBettingScenario({
    name: 'sdc-drift',
    description: `Synthetic SDC drift on shard-04 from window ${SDC_DRIFT_START_WINDOW} onward (+${SDC_DRIFT_PER_WINDOW}/window). Family A betting wealth accumulates.`,
    states,
    firingShards,
    thresholdCrossedAtWindow,
  });

  return {
    scenario: 'sdc-drift',
    output,
    firing_shards: firingShards,
    common_mode_candidates: 0,
    freeze_active: false,
    exit_code: 0,
  };
}

// ── Scenario: common-mode-rack ────────────────────────────────────────

function buildSyntheticRackTopology(): TopologySnapshot {
  // 6 gpu_shard nodes split across 2 racks; rack contains shards via 'contains' edges.
  const nodes: TopologyNode[] = [
    { id: 'rack-A',   service_name: 'rack-A',   kind: 'rack' },
    { id: 'rack-B',   service_name: 'rack-B',   kind: 'rack' },
    { id: 'shard-00', service_name: 'shard-00', kind: 'gpu_shard' },
    { id: 'shard-01', service_name: 'shard-01', kind: 'gpu_shard' },
    { id: 'shard-02', service_name: 'shard-02', kind: 'gpu_shard' },
    { id: 'shard-03', service_name: 'shard-03', kind: 'gpu_shard' },
    { id: 'shard-04', service_name: 'shard-04', kind: 'gpu_shard' },
    { id: 'shard-05', service_name: 'shard-05', kind: 'gpu_shard' },
  ];
  const edges: TopologyEdge[] = [
    { from: 'rack-A', to: 'shard-00', relationship: 'contains' },
    { from: 'rack-A', to: 'shard-01', relationship: 'contains' },
    { from: 'rack-A', to: 'shard-02', relationship: 'contains' },
    { from: 'rack-B', to: 'shard-03', relationship: 'contains' },
    { from: 'rack-B', to: 'shard-04', relationship: 'contains' },
    { from: 'rack-B', to: 'shard-05', relationship: 'contains' },
  ];
  return {
    nodes,
    edges,
    fetched_at_ts: 1_700_000_000,
    source_id: 'tessera-demo-synthetic',
    source_version: 'v1-demo',
  };
}

function runCommonModeRack(): ScenarioResult {
  const snapshot = buildSyntheticRackTopology();
  // Fire shards 00, 01, 02 — all on rack-A.
  const firedEvents: FiredShardEvent[] = [
    { shard_node_id: 'shard-00', event_ts: 1_700_000_100, event_id: 'evt-cm-1' },
    { shard_node_id: 'shard-01', event_ts: 1_700_000_110, event_id: 'evt-cm-2' },
    { shard_node_id: 'shard-02', event_ts: 1_700_000_120, event_id: 'evt-cm-3' },
  ];
  const result = attributeCommonMode({
    fired_events: firedEvents,
    snapshot,
    opts: { now: () => 1_700_000_200 },     // deterministic clock
  });
  const firingShards = ['shard-00', 'shard-01', 'shard-02'];

  const output = renderCommonModeScenario({
    snapshot,
    firedEvents,
    candidates: result.candidates,
  });

  return {
    scenario: 'common-mode-rack',
    output,
    firing_shards: firingShards,
    common_mode_candidates: result.candidates.length,
    freeze_active: false,
    exit_code: 0,
  };
}

// ── Scenario: event-conditional ───────────────────────────────────────

function runEventConditional(): ScenarioResult {
  // Construct a DsEventConsumer WITHOUT calling .start() — no HTTP bind.
  const consumer = new DsEventConsumer({ port: 0 });
  // Suppress auto-deactivation by injecting a no-op setTimeout/clearTimeout.
  // The factory's typing requires (cb, ms) => unknown; we return null cast to unknown.
  const noopTimeout = (_cb: () => void, _ms: number): unknown => null;
  const noopClear = (_h: unknown): void => { /* no-op */ };
  const fixedNow = () => 1_700_000_200;
  const activator = createFreezeHookFromDsEvents({
    consumer,
    config: { freeze_hook_enabled: true },
    activation_window_seconds: 300,
    setTimeout: noopTimeout,
    clearTimeout: noopClear,
    now: fixedNow,
  });
  // Emit an activate event BEFORE calling update(); the factory's subscriber was wired in createFreezeHookFromDsEvents.
  const payload: DeployEventPayload = {
    event_id: 'evt-demo-firmware-push',
    event_class: 'firmware_push',
    event_ts: 1_700_000_180,
  };
  consumer.emit('activate', payload);

  const residual = initialPerShardResidual();
  const obs: ExtendedSampleObservation = {
    observedAt: 1_700_000_190_000,           // epoch milliseconds
    residualSeedHash: 'demo-seed-hash',
    sampleVector: [0.5, 0.4, 0.3],
  };
  const result = activator.update(residual, obs, undefined);
  const frozen = result === residual;        // reference equality: freeze path returns current unchanged
  const state = activator.getState();

  // Tear down (no-op since no timer was set, but discipline preserved).
  activator.dispose();

  const output = renderEventConditionalScenario({
    payload,
    state,
    frozen,
  });

  return {
    scenario: 'event-conditional',
    output,
    firing_shards: [],
    common_mode_candidates: 0,
    freeze_active: state.active,
    exit_code: 0,
  };
}

// ── ASCII renderers ───────────────────────────────────────────────────

const HR = '═══════════════════════════════════════════════════════════════════';

function renderHeader(name: ScenarioName): string {
  return [HR, `  Tessera demo · ${name}`, HR, ''].join('\n');
}

function renderFooter(): string {
  return '\nDemo complete. (exit 0)\n';
}

interface BettingRenderInput {
  name: 'clean-baseline' | 'sdc-drift';
  description: string;
  states: ReadonlyArray<{ M: number }>;
  firingShards: ReadonlyArray<string>;
  thresholdCrossedAtWindow?: number | null;
}

function renderBettingScenario(input: BettingRenderInput): string {
  const lines: string[] = [];
  lines.push(renderHeader(input.name));
  lines.push(input.description);
  lines.push('');
  lines.push('Fleet topology (2 racks × 5 shards):');
  lines.push('  rack-A:  shard-00  shard-01  shard-02  shard-03  shard-04');
  lines.push('  rack-B:  shard-05  shard-06  shard-07  shard-08  shard-09');
  lines.push('');
  lines.push(`Family A betting e-process — threshold = 1/α = ${DEMO_THRESHOLD}`);
  lines.push('');
  lines.push('  shard      |  M_t (wealth)  |  verdict');
  lines.push('  -----------+----------------+----------');
  for (let s = 0; s < FLEET_SHARD_COUNT; s++) {
    const M = input.states[s].M;
    const verdict = M >= DEMO_THRESHOLD ? 'FIRE' : 'clean';
    lines.push(`  ${SHARD_IDS[s].padEnd(10)} |  ${M.toFixed(2).padStart(13)} |  ${verdict}`);
  }
  lines.push('');
  if (input.firingShards.length === 0) {
    lines.push('Verdict: no firings. (clean baseline; demonstrates no-false-positives)');
  } else {
    lines.push(`Verdict: ${input.firingShards.length} shard(s) FIRE: ${input.firingShards.join(', ')}`);
    if (input.thresholdCrossedAtWindow !== null && input.thresholdCrossedAtWindow !== undefined) {
      lines.push(`Threshold crossed at window ${input.thresholdCrossedAtWindow} by shard-${String(SDC_TARGET_SHARD_INDEX).padStart(2, '0')}.`);
    }
    lines.push('Per-shard residual flags the specific drifted shard; other shards stay in baseline.');
  }
  lines.push(renderFooter());
  return lines.join('\n');
}

interface CommonModeRenderInput {
  snapshot: TopologySnapshot;
  firedEvents: ReadonlyArray<FiredShardEvent>;
  candidates: ReadonlyArray<{
    shared_node_id: string;
    shared_node_kind: 'psu' | 'rack' | 'cooling_zone';
    member_shard_ids: ReadonlyArray<string>;
    member_count: number;
  }>;
}

function renderCommonModeScenario(input: CommonModeRenderInput): string {
  const lines: string[] = [];
  lines.push(renderHeader('common-mode-rack'));
  lines.push('Synthetic 2-rack NVLink fleet (6 gpu_shard nodes). Fault injection: 3 shards on rack-A fire simultaneously.');
  lines.push('');
  lines.push('Fleet topology:');
  lines.push('  rack-A:  shard-00  shard-01  shard-02');
  lines.push('  rack-B:  shard-03  shard-04  shard-05');
  lines.push('');
  lines.push(`Fired shards: ${input.firedEvents.map((e) => e.shard_node_id).join(', ')}`);
  lines.push('');
  lines.push(`Common-mode attribution surfaced ${input.candidates.length} candidate(s):`);
  for (const c of input.candidates) {
    lines.push(`  • ${c.shared_node_kind} ${c.shared_node_id} — ${c.member_count} members: ${c.member_shard_ids.join(', ')}`);
  }
  lines.push('');
  lines.push('Without topology-aware attribution this would surface as 3 independent per-shard alerts.');
  lines.push('With topology-aware attribution it surfaces as 1 common-mode candidate on rack-A.');
  lines.push(renderFooter());
  return lines.join('\n');
}

interface EventConditionalRenderInput {
  payload: DeployEventPayload;
  state: { active: boolean; cluster_event_id?: string; until_ts?: number };
  frozen: boolean;
}

function renderEventConditionalScenario(input: EventConditionalRenderInput): string {
  const lines: string[] = [];
  lines.push(renderHeader('event-conditional'));
  lines.push('Synthetic deploy-event feed: DS emits a firmware_push event; Tessera freeze-hook activates.');
  lines.push('');
  lines.push('DS → Tessera deploy event received:');
  lines.push(`  event_id:    ${input.payload.event_id}`);
  lines.push(`  event_class: ${input.payload.event_class}`);
  lines.push(`  event_ts:    ${input.payload.event_ts}`);
  lines.push('');
  lines.push(`Freeze-hook state: active=${input.state.active}  cluster_event_id=${input.state.cluster_event_id ?? '(none)'}  until_ts=${input.state.until_ts ?? '(none)'}`);
  lines.push('');
  lines.push('Applying sample observation to shard-04 per-shard residual:');
  lines.push(`  Freeze active: ${input.state.active ? 'yes' : 'no'}`);
  lines.push(`  Sample absorbed into residual: ${input.frozen ? 'no (residual returned unchanged)' : 'yes (updated residual returned)'}`);
  lines.push('');
  lines.push('Tessera does NOT absorb event-driven drift into per-shard residual during the post-event window.');
  lines.push('Per-shard residual is preserved; downstream per-shard detectors see the pre-event baseline.');
  lines.push(renderFooter());
  return lines.join('\n');
}

// ── Public entry point ─────────────────────────────────────────────────

export function runScenario(name: ScenarioName, _opts?: ScenarioOpts): ScenarioResult {
  switch (name) {
    case 'clean-baseline':    return runCleanBaseline();
    case 'sdc-drift':         return runSdcDrift();
    case 'common-mode-rack':  return runCommonModeRack();
    case 'event-conditional': return runEventConditional();
    default: {
      // Exhaustiveness check; if a new ScenarioName is added without a case, tsc fails here.
      const _exhaustive: never = name;
      throw new Error(`runScenario: unknown scenario name: ${_exhaustive as string}`);
    }
  }
}

export function listScenarios(): ReadonlyArray<ScenarioName> {
  return SCENARIO_NAMES;
}

// ── CLI guard ─────────────────────────────────────────────────────────

function parseCliArg(): ScenarioName | null {
  const arg = process.argv[2];
  if (arg === undefined) return null;
  if (SCENARIO_NAMES.includes(arg as ScenarioName)) return arg as ScenarioName;
  return null;
}

function printUsage(): void {
  process.stdout.write(
    [
      'Usage: pnpm demo <scenario>',
      'Scenarios:',
      ...SCENARIO_NAMES.map((n) => `  - ${n}`),
      '',
    ].join('\n'),
  );
}

// CommonJS module-main guard (matches existing tools/* convention).
if (require.main === module) {
  const name = parseCliArg();
  if (name === null) {
    printUsage();
    process.exit(1);
  }
  const result = runScenario(name);
  process.stdout.write(result.output);
  process.exit(result.exit_code);
}
```

**Pseudocode notes the Implementer may resolve under TACTICAL AUTONOMY:**
- Import `.js` extension convention: matches `tools/curate-baseline-pipeline.ts` neighbor. If tsc errors at the demo's `.js` imports under the test tsconfig, Implementer drops the `.js` extension to match `engine/`/`test/` convention (single-line tactical fix; not a HALT condition).
- Box-Muller draw discards the pair (one call = one draw via `cos` only). Implementer may keep both draws via a small buffer (`pendingDraw` field on the rng) if it materially affects determinism observability; otherwise the discard form is the Architect prescription.
- `parseCliArg` could use `process.argv.indexOf` or `argv[2]` directly; Architect prescribes `argv[2]` for simplicity.
- The Architect prescribes `SDC_DRIFT_PER_WINDOW = 0.4` as an initial value. If under the chosen seed the wealth does NOT cross threshold by window 30, the Implementer may tune this constant within [0.3, 0.8] under TACTICAL AUTONOMY (must document the chosen final value in the GREEN commit message). If wealth crosses BEFORE window 6 (suspicious — would mean the rng has produced an outlier draw), Implementer HALTS with a DIAGNOSTIC.

### 4.2 `test/q70-demo-scenario.test.ts` (NEW; ~250 lines)

```typescript
// test/q70-demo-scenario.test.ts — R70 narrative demo scenario runner tests.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  runScenario,
  listScenarios,
  SCENARIO_NAMES,
  type ScenarioName,
  type ScenarioResult,
} from '../tools/demo-scenario';

describe('R70 demo scenario runner', () => {

  test('AC-R70-1: clean-baseline output contains expected literal markers', () => {
    const r = runScenario('clean-baseline');
    assert.strictEqual(r.scenario, 'clean-baseline');
    assert.match(r.output, /Tessera demo · clean-baseline/);
    assert.match(r.output, /Demo complete\./);
    assert.match(r.output, /Family A betting e-process/);
    assert.match(r.output, /no firings/);
    assert.strictEqual(r.firing_shards.length, 0);
    assert.strictEqual(r.exit_code, 0);
  });

  test('AC-R70-2: sdc-drift output contains shard-04 + FIRE + threshold crossing', () => {
    const r = runScenario('sdc-drift');
    assert.match(r.output, /Tessera demo · sdc-drift/);
    assert.match(r.output, /shard-04/);
    assert.match(r.output, /FIRE/);
    assert.match(r.output, /Threshold crossed at window/);
    assert.ok(r.firing_shards.includes('shard-04'), 'shard-04 must be in firing_shards');
    // Anti-self-confirmation: at least one shard fires AND the target shard fires.
    assert.ok(r.firing_shards.length >= 1, 'at least one shard must fire');
    assert.strictEqual(r.exit_code, 0);
  });

  test('AC-R70-3: common-mode-rack surfaces exactly 1 candidate on rack-A with 3 members', () => {
    const r = runScenario('common-mode-rack');
    assert.match(r.output, /Tessera demo · common-mode-rack/);
    assert.match(r.output, /rack rack-A/);
    assert.match(r.output, /common-mode attribution surfaced 1 candidate/i);
    assert.match(r.output, /shard-00.*shard-01.*shard-02/);
    assert.strictEqual(r.common_mode_candidates, 1);
    assert.deepStrictEqual(
      r.firing_shards.slice().sort(),
      ['shard-00', 'shard-01', 'shard-02'],
    );
    assert.strictEqual(r.exit_code, 0);
  });

  test('AC-R70-4: event-conditional shows freeze active + residual not absorbed', () => {
    const r = runScenario('event-conditional');
    assert.match(r.output, /Tessera demo · event-conditional/);
    assert.match(r.output, /event_class: firmware_push/);
    assert.match(r.output, /Freeze active: yes/);
    assert.match(r.output, /Sample absorbed into residual: no/);
    assert.strictEqual(r.freeze_active, true);
    assert.strictEqual(r.exit_code, 0);
  });

  test('AC-R70-5: clean-baseline determinism — two runs produce byte-identical output', () => {
    const a = runScenario('clean-baseline');
    const b = runScenario('clean-baseline');
    assert.strictEqual(a.output, b.output);
    assert.deepStrictEqual(a.firing_shards, b.firing_shards);
  });

  test('AC-R70-6: sdc-drift determinism — two runs produce byte-identical output', () => {
    const a = runScenario('sdc-drift');
    const b = runScenario('sdc-drift');
    assert.strictEqual(a.output, b.output);
    assert.deepStrictEqual(a.firing_shards, b.firing_shards);
  });

  test('AC-R70-7: common-mode-rack determinism — two runs produce byte-identical output', () => {
    const a = runScenario('common-mode-rack');
    const b = runScenario('common-mode-rack');
    assert.strictEqual(a.output, b.output);
    assert.deepStrictEqual(a.firing_shards, b.firing_shards);
  });

  test('AC-R70-8: event-conditional determinism — two runs produce byte-identical output', () => {
    const a = runScenario('event-conditional');
    const b = runScenario('event-conditional');
    assert.strictEqual(a.output, b.output);
    assert.strictEqual(a.freeze_active, b.freeze_active);
  });

  test('AC-R70-9: unknown scenario throws (exhaustiveness)', () => {
    assert.throws(() => runScenario('not-a-scenario' as ScenarioName));
  });

  test('AC-R70-10: listScenarios returns the canonical 4 names in order', () => {
    const names = listScenarios();
    assert.deepStrictEqual(names, [
      'clean-baseline',
      'sdc-drift',
      'common-mode-rack',
      'event-conditional',
    ]);
    assert.deepStrictEqual(SCENARIO_NAMES, names);
  });

  test('AC-R70-11: every scenario produces non-empty output AND exit_code === 0 AND its output ends with the canonical footer', () => {
    for (const name of SCENARIO_NAMES) {
      const r: ScenarioResult = runScenario(name);
      assert.ok(r.output.length > 0, `${name}: output non-empty`);
      assert.strictEqual(r.exit_code, 0, `${name}: exit_code === 0`);
      assert.ok(r.output.endsWith('Demo complete. (exit 0)\n'), `${name}: output ends with canonical footer`);
    }
  });

});
```

### 4.3 `package.json` modification

Insert into the `scripts` block, between the existing `"pretest"` and `"test"` entries (or at end of block — Implementer picks the placement matching the existing JSON style):

```json
    "predemo": "tsc -p tsconfig.test.json",
    "demo": "node tools/demo-scenario.js",
```

No other modifications. Trailing commas + JSON-validity preserved.

### 4.4 `README.md` modification

Insert a new section between the existing `## Getting started` and `## Methodology` sections. Exact content:

```markdown
## Quick demo

Once installed, run any of four canned scenarios to see Tessera detect synthetic faults end-to-end:

```bash
pnpm demo clean-baseline       # healthy fleet — no firings
pnpm demo sdc-drift            # silent SDC drift on shard-04 → Family A betting fires
pnpm demo common-mode-rack     # 3 shards on shared rack → 1 common-mode candidate
pnpm demo event-conditional    # firmware-push event → freeze-hook activates
```

Each scenario runs in under 30 seconds, produces deterministic ASCII output, and exercises one real engine surface against synthetic inputs (no live cluster needed). Source: [`tools/demo-scenario.ts`](./tools/demo-scenario.ts).
```

(Note: nested fenced code blocks inside a markdown section use four backticks at the outer fence. Implementer applies the standard markdown convention OR uses three-backtick fences with the section properly closed — TACTICAL AUTONOMY.)

### 4.5 `coordination/specs/Q-R70-EMPIRICAL.sh` (NEW; ~80 lines)

See § 11 for the verbatim contents.

---

## § 5. Acceptance criteria

Every AC in Given / When / Then form. Banned vague language ("correctly", "appropriately", "as needed") absent. Discriminating assertions per Rule 3.

| AC | Given | When | Then | Verification |
|---|---|---|---|---|
| AC-R70-1 | The clean-baseline scenario implementation lands per § 4.1 | `runScenario('clean-baseline')` is invoked | Result `firing_shards.length === 0`; output contains literals `Tessera demo · clean-baseline`, `Family A betting e-process`, `no firings`, `Demo complete.`; `exit_code === 0` | `test/q70-demo-scenario.test.ts` AC-R70-1 |
| AC-R70-2 | The sdc-drift scenario implementation lands per § 4.1 | `runScenario('sdc-drift')` is invoked | Result `firing_shards` includes `shard-04`; output contains literals `Tessera demo · sdc-drift`, `shard-04`, `FIRE`, `Threshold crossed at window`; `exit_code === 0` | `test/q70-demo-scenario.test.ts` AC-R70-2 |
| AC-R70-3 | The common-mode-rack scenario implementation lands per § 4.1 | `runScenario('common-mode-rack')` is invoked | Result `common_mode_candidates === 1`; `firing_shards` (sorted) `=== ['shard-00','shard-01','shard-02']`; output contains literal `rack rack-A` and a regex-match `common-mode attribution surfaced 1 candidate`; output contains the three shard ids consecutively (via regex `shard-00.*shard-01.*shard-02`) | `test/q70-demo-scenario.test.ts` AC-R70-3 |
| AC-R70-4 | The event-conditional scenario implementation lands per § 4.1 | `runScenario('event-conditional')` is invoked | Result `freeze_active === true`; output contains literals `event_class: firmware_push`, `Freeze active: yes`, `Sample absorbed into residual: no`; `exit_code === 0` | `test/q70-demo-scenario.test.ts` AC-R70-4 |
| AC-R70-5 | `runScenario('clean-baseline')` is invoked at any two distinct times in the same process | The two `output` strings are compared | Byte-identical | `test/q70-demo-scenario.test.ts` AC-R70-5 |
| AC-R70-6 | `runScenario('sdc-drift')` is invoked at any two distinct times in the same process | The two `output` strings are compared | Byte-identical | `test/q70-demo-scenario.test.ts` AC-R70-6 |
| AC-R70-7 | `runScenario('common-mode-rack')` is invoked at any two distinct times in the same process | The two `output` strings are compared | Byte-identical | `test/q70-demo-scenario.test.ts` AC-R70-7 |
| AC-R70-8 | `runScenario('event-conditional')` is invoked at any two distinct times in the same process | The two `output` strings are compared | Byte-identical AND `freeze_active` identical | `test/q70-demo-scenario.test.ts` AC-R70-8 |
| AC-R70-9 | An unknown scenario name (cast to ScenarioName for compilation) is passed to `runScenario` | The function is invoked | A thrown error containing `unknown scenario name` reaches the caller | `test/q70-demo-scenario.test.ts` AC-R70-9 |
| AC-R70-10 | `listScenarios()` is invoked | The returned array is compared to the canonical list | `=== ['clean-baseline','sdc-drift','common-mode-rack','event-conditional']` AND identity to `SCENARIO_NAMES` (deep equality) | `test/q70-demo-scenario.test.ts` AC-R70-10 |
| AC-R70-11 | Each of the 4 SCENARIO_NAMES is iterated | `runScenario(name)` is invoked for each | Every result has `output.length > 0`, `exit_code === 0`, and `output.endsWith('Demo complete. (exit 0)\n')` | `test/q70-demo-scenario.test.ts` AC-R70-11 |
| AC-R70-12 | The R70 deliverables land per § 3 | `pnpm exec tsc -p tsconfig.test.json` is run at chore-A | Exit 0; zero diagnostics | Q-R70-EMPIRICAL.sh Block 1 |
| AC-R70-13 | The R70 deliverables land per § 3 | `pnpm exec node --test --test-reporter=tap test/*.test.js` is run at chore-A | The `not ok` line count is exactly 5; the 5 failing AC ids are: `AC-R36-21`, `AC-R36-30`, `AC-R36-31`, `AC-R65-2`, `AC-R66-14` (the established carry-forward set per directive § Anti-scope item 6); no other test transitions PASS → FAIL | Q-R70-EMPIRICAL.sh Block 2 |
| AC-R70-14 | The R70 deliverables land per § 3 | `git diff <spec-triad-SHA>..HEAD --name-only` is run at chore-A | Every path appears in the § 3.2 ALLOWED_SET or matches the diagnostic regex carve-out `coordination/diagnostics/DIAGNOSTIC-R70-.+\.md` | Q-R70-EMPIRICAL.sh Block 3 |
| AC-R70-15 | The R70 deliverables land per § 3 | `git diff <round-start-SHA>..HEAD --name-only -- engine/` is run at chore-A | Output is empty (no engine/* modifications) | Q-R70-EMPIRICAL.sh Block 4 |
| AC-R70-16 | The R70 deliverables land per § 3 | `git diff <round-start-SHA>..HEAD --name-only -- coordination/specs/Q-R0*-SPEC.md coordination/specs/Q-R1*-SPEC.md coordination/specs/Q-R2*-SPEC.md coordination/specs/Q-R3*-SPEC.md coordination/specs/Q-R4*-SPEC.md coordination/specs/Q-R5*-SPEC.md coordination/specs/Q-R6*-SPEC.md` is run | Output is empty (no prior-round spec modifications) | Q-R70-EMPIRICAL.sh Block 5 |
| AC-R70-17 | The R70 deliverables land per § 3 | `tools/demo-scenario.ts` is read at HEAD | The file exists; contains exported symbol `runScenario`; contains exported symbol `listScenarios`; contains exported symbol `SCENARIO_NAMES`; contains a `switch (name)` block in `runScenario` body | Q-R70-EMPIRICAL.sh Block 6 |
| AC-R70-18 | The R70 deliverables land per § 3 | `package.json` is read at HEAD | The file contains a `"demo"` script entry under `scripts` | Q-R70-EMPIRICAL.sh Block 7 |
| AC-R70-19 | The R70 deliverables land per § 3 | `README.md` is read at HEAD | The file contains the heading `## Quick demo` AND the literal `pnpm demo clean-baseline` | Q-R70-EMPIRICAL.sh Block 8 |

**AC classification preamble (per R20 ARCH MINOR-1):** AC-R70-1 through AC-R70-11 are runtime tests in `test/q70-demo-scenario.test.ts` (each is an independent `test(...)` block under one top-level `describe`). AC-R70-12 through AC-R70-19 are binding-command attestations reported by the Implementer at GREEN AND independently re-runnable via Q-R70-EMPIRICAL.sh. AC-R70-12 + AC-R70-13 cover the `tsc` and `node --test` binding commands; AC-R70-14 through AC-R70-19 cover anti-scope diff + structural-property attestations.

### 5.1 Branch-binding coverage (Rule 2 ACTIVE GATE)

Every branch / guard / short-circuit in the production code MUST have an AC that structurally exercises it. The Implementer's RED→GREEN cycle MUST observe each AC fail at RED + pass at GREEN.

| Production branch | File:line | Covering AC | How exercised |
|---|---|---|---|
| `runScenario` switch case `'clean-baseline'` | tools/demo-scenario.ts (switch in runScenario; case order per § 4.1) | AC-R70-1 + AC-R70-5 | invoke + determinism |
| `runScenario` switch case `'sdc-drift'` | tools/demo-scenario.ts | AC-R70-2 + AC-R70-6 | invoke + determinism |
| `runScenario` switch case `'common-mode-rack'` | tools/demo-scenario.ts | AC-R70-3 + AC-R70-7 | invoke + determinism |
| `runScenario` switch case `'event-conditional'` | tools/demo-scenario.ts | AC-R70-4 + AC-R70-8 | invoke + determinism |
| `runScenario` default (exhaustiveness throw) | tools/demo-scenario.ts | AC-R70-9 | unknown name throws |
| `runCleanBaseline` firing-shard collection loop | tools/demo-scenario.ts | AC-R70-1 (zero firings expected) | empty firing_shards |
| `runSdcDrift` SDC injection branch (`s === SDC_TARGET_SHARD_INDEX && w >= SDC_DRIFT_START_WINDOW`) | tools/demo-scenario.ts | AC-R70-2 (shard-04 in firing_shards under injected drift) | drift fires; non-drift shards stay clean (the non-drift shards passing the AC implies the inverse branch is also exercised) |
| `runSdcDrift` threshold-crossing tracker (`thresholdCrossedAtWindow === null` first branch) | tools/demo-scenario.ts | AC-R70-2 (`Threshold crossed at window` line present iff crossing happened) | first-time-cross records window; non-null preserved |
| `runCommonModeRack` candidate-loop | tools/demo-scenario.ts | AC-R70-3 (`common_mode_candidates === 1`; member_count === 3) | exercises the candidate-loop's emit branch |
| `runEventConditional` reference-equality check (`result === residual`) | tools/demo-scenario.ts | AC-R70-4 (`Sample absorbed into residual: no`) | freeze-active path returns input unchanged |
| `parseCliArg` `arg === undefined` branch | tools/demo-scenario.ts | (no AC — CLI guard; covered by Q-R70-EMPIRICAL.sh + manual operator invocation; non-load-bearing for production test surface) | acknowledged gap with documented rationale |
| `parseCliArg` `SCENARIO_NAMES.includes(...)` branch | tools/demo-scenario.ts | (no AC — same rationale as above) | acknowledged gap |

**Acknowledged non-load-bearing coverage gaps** (per Rule 2 acknowledged-gaps workflow):
- `parseCliArg` and `printUsage` are CLI-glue invoked only via `pnpm demo`; the public `runScenario` API is the load-bearing surface. The Q-R70-EMPIRICAL.sh Block 6 verifies that the CLI symbols exist at the file-text level (cite-then-verify); a future round may add a subprocess test if operator wants tighter coverage.
- The Box-Muller `Math.max(rng(), 1e-12)` log-floor branch fires only when `rng()` returns 0 exactly; under the LCG-with-32-bit-state this happens with probability ≈ 2^-32 per draw. Architect prescribes the floor for defensive numerical safety; AC-R70-1 through AC-R70-8 incidentally exercise the non-floor path. No dedicated AC.

### 5.2 Predicted binding-command outcomes (Architect pre-prediction at spec emit)

**At chore-A SHA, the Implementer's empirical observations should match:**

- `pnpm exec tsc -p tsconfig.test.json` → exit 0, zero diagnostics.
- `pnpm exec node --test --test-reporter=tap test/*.test.js` → `tests=455 / pass=447 / fail=5 / skipped=3` (predicted; 444+11 new test() blocks under describe; actual count is the load-bearing observation per Rule 1 sub-class `empirical-command-attestation`).
- `bash coordination/specs/Q-R70-EMPIRICAL.sh` → all 8 blocks PASS, exit 0.

**Architect predicted-count caveat** (per R67-R68 cumulative lesson + R03 MINOR-4 in-spec arithmetic discipline):
- The 11 new test() blocks count is derived by enumerating AC-R70-1 through AC-R70-11 in § 4.2 pseudocode. Each AC has exactly one `test(...)` declaration; AC-R70-12 through AC-R70-19 are NOT runtime tests (they are binding-command attestations).
- The "fail=5" prediction encodes the directive's halt #3 baseline: AC-R36-21 + AC-R36-30 + AC-R36-31 + AC-R65-2 + AC-R66-14 stay failing; no new fails introduced.
- **If the Implementer's observed counts differ from the prediction** in ways OTHER than `+N tests / +N pass` for the new q70 test block, the Implementer MUST encode the ACTUAL values verbatim AND surface the divergence in NEXT-ROLE.md (per Rule 1 sub-class `empirical-command-attestation`). Do NOT reframe the actual observation to match the prediction.
- The Architect's prediction is **derived arithmetic, not an authoritative count.** Empirical observation is load-bearing.

### 5.3 Discriminating assertions (Rule 3 ACTIVE GATE)

Per Rule 3, every test assertion MUST be discriminating: a future implementation REGRESSION would fail the assertion, and a future implementation FIX would pass it. Spot-check:

- **AC-R70-2** `assert.ok(r.firing_shards.includes('shard-04'))` — if a future implementation broke the SDC injection branch, `firing_shards` would not include shard-04 and the assertion fails. Discriminating.
- **AC-R70-3** `assert.strictEqual(r.common_mode_candidates, 1)` — if `attributeCommonMode` returned 0 candidates (e.g., min_member_count miscount), assertion fails. If it returned 2 candidates (over-attribution), assertion fails. Discriminating.
- **AC-R70-4** `assert.match(r.output, /Sample absorbed into residual: no/)` + `assert.strictEqual(r.freeze_active, true)` — if the freeze branch were not exercised (e.g., factory's `freeze_hook_enabled` not set), the residual would be a new object (not `===`) and the output line would say "yes (updated residual returned)"; both assertions fail. Discriminating.
- **AC-R70-5 through AC-R70-8** byte-identity comparisons across two invocations — if the implementation introduced non-determinism (e.g., `Math.random()` slipped in), the two outputs would differ on at least one shard's M_t formatted value. Discriminating.
- **AC-R70-11** `output.endsWith('Demo complete. (exit 0)\n')` — if a future scenario's renderer dropped the footer, the assertion fails. Discriminating.

**Self-confirming-test risk audit:** AC-R70-3's regex `shard-00.*shard-01.*shard-02` matches across the candidate's member_shard_ids list (which is sorted lex asc per `attributeCommonMode`'s output contract at common-mode-attribution.ts:178). The assertion would pass even if the demo's renderer reordered the list; that's fine because the engine-side sort is the load-bearing contract; demo reorders would be a cosmetic change. **Not a self-confirming risk.**

---

## § 6. Open questions

**None — all resolved.**

The four scenarios + the single-file layout + the engine surfaces invoked + the seed values + the ALLOWED_SET were each picked at the Architect level after claim-then-walk verification (§ 1.3) and brainstorm tradeoff analysis (§ 0). No item carries forward to Implementer-as-decision.

### 6.1 Halt conditions (per directive)

The Implementer MUST HALT and write a `coordination/diagnostics/DIAGNOSTIC-R70-<topic>.md` with ≥ 3 bounded options + set `STATUS: ESCALATE` if any of the following fire:

1. **Q-R70-EMPIRICAL.sh non-zero exit at chore-A** for any reason (NO carve-out at R70; single-state spec; per R56 reinforcement, halt-condition triggers have no pre-documented failure exemption).
2. **`pnpm exec tsc -p tsconfig.test.json` non-zero exit.**
3. **Test baseline drift beyond directive baseline `444/436/5/3`** in ways other than R70-additions: any pre-R70 test other than the 5 carry-forward fails transitions PASS → FAIL.
4. **Architectural decision requires DS-repo modification** (W3-1 Option A anti-scope) — DS-side adoption is operator-scheduled at `~/concord/deploysignal/`, NOT this round.
5. **Architectural decision requires real-cluster work or new external dependencies** (Path B preserved; npm-deps anti-scope).
6. **R62+R66+R68 cumulative lesson** — claim-then-walk: load-bearing factual claim in spec does not match codebase reality at Implementer time. The 7 engine surfaces enumerated in § 1.3 were verified at spec-emit by the Architect; if Implementer finds divergence, HALT.
7. **R61-class architectural-reality discovery** — spec premise empirically false at Implementer time (e.g., `updateBettingState` does NOT mutate state in place; `attributeCommonMode` does NOT sort candidates; etc.). HALT + DIAGNOSTIC + ESCALATE.
8. **SDC drift tuning out-of-band** — if under seed `0x70D1F` and `SDC_DRIFT_PER_WINDOW` within `[0.3, 0.8]` the wealth still does not cross threshold by window 30, OR crosses BEFORE window 6 (suspicious outlier), HALT + DIAGNOSTIC + propose either (a) a different seed or (b) a different drift constant or (c) a different threshold.
9. **Anti-scope diff includes a path outside ALLOWED_SET + regex carve-out** (NEVER expand ALLOWED_SET in-test per R36 MAJOR-2).
10. **The directive's anti-scope round-evolution-fragile AC patterns (forward-protection / live-file-count / anti-scope-diff-against-prior-round) are inadvertently introduced.** HALT immediately — the cumulative R62+R66+R68 lesson forbids these patterns at R70.

**Resolution flow:** write DIAGNOSTIC with ≥ 3 bounded options; set `STATUS: ESCALATE` in NEXT-ROLE.md; await operator disposition. Do NOT proceed with a silent workaround.

---

## § 7. Cross-project rule dispositions

| Rule | Disposition at R70 |
|---|---|
| 1 (`false-compliance-attestation` + sub-class `empirical-command-attestation`) | **ACTIVE GATE** — Q-R70-EMPIRICAL.sh; Tightenings 1-4 applied. Implementer attestation in NEXT-ROLE.md uses verbatim observed values. |
| 2 (`architect-branch-binding-coverage`) | **ACTIVE GATE** — § 5.1 branch-binding table; 2 acknowledged non-load-bearing gaps with documented rationale. |
| 3 (`implementer-spec-test-assertion-coverage`) | **ACTIVE GATE** — discriminating assertions per § 5.3; self-confirming-test risk audited. |
| 4 (`anti-scope-allowed-set-forward-coverage`) | **ACTIVE GATE** — 8-path ALLOWED_SET enumerated upfront at § 3.2 + 1 regex carve-out; **NO live-file-count / forward-protection / anti-scope-diff-against-prior-round patterns** per R62+R66+R68 cumulative lesson. Historical-only diff bound (round-start..HEAD). |
| 5 (`rule-derivation-without-self-application`) | **N/A** at spec emit. The 3-instance `ac-pattern-round-evolution-fragility` candidate from R62+R66+R68 is at Memorial-Updater pickup; this round avoids the pattern but does not derive a new cross-project rule. |
| 6 (`halt-discipline-no-DIAGNOSTIC-for-workaround`) | **ACTIVE GATE** — § 6.1 enumerates 10 halt conditions. NO narrowed carve-outs; NO chore-B; single-state spec. |
| 7 (`derived-rule-propagation-mechanism-required`) | **ACTIVE GATE Surface (a)** — § 7 (this section) names every rule + disposition. Surface (b) pre-commit-rule-sweep is run at chore-A by Implementer per chore-A sequence § 11. Surface (c) N/A (no rule derived this round). |

---

## § 8. Handoff-doc inaccuracy disclosure (claim-then-walk discipline; R62 lesson)

The R70 directive references prior engine surfaces by name + path; the Architect verified each at spec-emit time via direct Read (per CLAUDE-ARCHITECT 2026-05-16 reinforcement: type-declaration-site check). No handoff-doc inaccuracies were detected at spec-emit. The 7 engine surfaces enumerated in § 1.3 are cited at exact signature, source file, and line number, each verified by direct file read.

**Sources verified (read at Architect session entry, engine SHA `4e30c2f`):**

1. `engine/detectors/betting-e-process.ts` — lines 72-82 (`freshBettingState`), 151-175 (`updateBettingState`).
2. `engine/topology/common-mode-attribution.ts` — lines 131-226 (`attributeCommonMode`); line 117 (`DEFAULT_CANDIDATE_NODE_KINDS`); line 123 (`KIND_SORT_ORDER`).
3. `engine/ds-integration/event-consumer.ts` — lines 169-291 (`DsEventConsumer` class), constructor at lines 176-181 (does NOT call `.start()` implicitly).
4. `engine/ds-integration/freeze-hook-factory.ts` — lines 87-143 (`createFreezeHookFromDsEvents`), with `setTimeout`/`clearTimeout`/`now` injectable per lines 61-65.
5. `engine/events/freeze-hook.ts` — lines 40-51 (`freezeAwareUpdatePerShardResidual`); freeze condition at line 47 (`config.freeze_hook_enabled === true && freezeState.active === true`).
6. `engine/per-shard/warm-start.ts` — line 38 (`initialPerShardResidual`).
7. `engine/types/verdict.ts` — `TopologyNode.kind` enum at line 254 (includes `'gpu_shard'`, `'rack'`); `TopologyEdge.relationship` at line 264 (includes `'contains'`).

---

## § 9. P3 ten-axis verification

| Axis | Verification (one sentence) |
|---|---|
| **Correctness** | Each scenario invokes the engine surface enumerated in § 1.3 with arguments matching the surface's documented signature; the Architect verified each signature by direct read at spec-emit. |
| **Completeness** | All 4 scenarios required by the directive are spec'd; all 19 ACs cover the load-bearing behavior; the § 5.1 branch-binding table proves every production branch has a covering AC or an acknowledged gap with rationale. |
| **Consistency** | The 4 SCENARIO_NAMES are referenced consistently across `runScenario` switch (§ 4.1), `SCENARIO_NAMES` const (§ 4.1), `listScenarios` (§ 4.1), test file imports (§ 4.2), AC-R70-10 (§ 5), and README quick-demo block (§ 4.4) — verified by re-grep at spec close. The `Demo complete.` literal appears in renderFooter (§ 4.1), AC-R70-1 + AC-R70-11 (§ 5), and Q-R70-EMPIRICAL.sh Block 6 (§ 11) — verified. |
| **Clarity** | No ambiguous language ("correctly", "appropriately", "as needed") present in ACs; each AC uses Given/When/Then with concrete observable outcomes (file existence, regex match, deep equality, exit code). |
| **Coverage** | The § 5.1 table maps every switch case + every guard branch in the production code to a covering AC; 2 acknowledged gaps (parseCliArg / Box-Muller floor) documented with rationale. |
| **Constraints** | Anti-scope (engine frozen, no new deps, no real-cluster, no DS-repo, no round-evolution-fragile patterns) is exhaustively enumerated in § 3.3 + § 6.1. The 8-path ALLOWED_SET + 1 regex carve-out (§ 3.2) is the binding diff-subset gate at chore-A. |
| **Concurrency** | The demo runner is single-process, single-threaded, fully synchronous. No async/await in `runScenario` or its sub-functions. The `DsEventConsumer` is constructed but never `.start()`-ed, so no HTTP threads bind. The factory's `setTimeout` is stubbed via injection. No concurrency surface. |
| **Corner cases** | Box-Muller `rng() === 0` (probability 2^-32 per draw) — defensive floor at `Math.max(rng(), 1e-12)`. `updateBettingState` with `sigmaSquared <= 0` (line 158 guards `Math.max(sigmaSquared, 0)`) — demo passes σ² = 1; safe. `attributeCommonMode` with shard-node-id absent from snapshot (line 161 silently skips) — demo builds snapshot first; shard ids match; safe. `parseCliArg` with `undefined` or unknown arg — handled via `null` return + `printUsage` + `process.exit(1)`. Unknown ScenarioName in `runScenario` — exhaustiveness `never` assertion throws. Empty `firing_shards` in clean-baseline — renderBettingScenario branches on length. |
| **Cost** | Demo runtime budget: <10 s per scenario (well under the 30-60 s directive ceiling). LCG + Box-Muller + 30 windows × 10 shards × O(1) updateBettingState = 300 ticks per Family A scenario; per-tick cost is dominated by `Math.sqrt`/`Math.log`. attributeCommonMode is O(N · E + C) over a 8-node × 6-edge topology — microseconds. event-conditional is a single update + single emit — microseconds. |
| **Coupling** | Demo couples ONLY to the 7 engine surfaces in § 1.3 (all stable post-Phase-3 close per anti-scope #2). No coupling to test fixtures, prior-round specs, or DS-repo code. README couples to file-path link `tools/demo-scenario.ts` — stable for the round. package.json couples to `node tools/demo-scenario.js` — stable for the round. |

---

## § 10. Grilling output (adversarial self-review; Superpowers Phase 3)

### 10.1 Is every claim verifiable? (per § 9 axis Correctness + Clarity)

- "10 shards across 2 racks" — verifiable by reading `SHARD_IDS` const (§ 4.1) length 10 + `buildSyntheticRackTopology` rack node count 2.
- "Wealth crosses 1/α at some window in [6, 29] for shard-04 under seed 0x70D1F + drift 0.4" — empirically verifiable by Implementer at RED+GREEN; if not, halt #8 fires and Implementer retunes within [0.3, 0.8].
- "common-mode-rack surfaces exactly 1 candidate" — verifiable by reading `attributeCommonMode` source: shards 00, 01, 02 are connected to rack-A only (not to rack-B); shards 03, 04, 05 are connected to rack-B only; firing only rack-A shards produces touches on rack-A only (min_member_count=2 default; 3 distinct member ≥ 2 → surface). No other candidate-kind node (psu, cooling_zone) exists in snapshot.
- "Reference equality `result === residual` when freeze is active" — verifiable by reading `freezeAwareUpdatePerShardResidual` (engine/events/freeze-hook.ts:47-49): `return current` when both gates pass.

**All claims verifiable. ✓**

### 10.2 Unstated assumptions?

- **Assumption A**: `updateBettingState` mutates state in-place. **Verified** by reading lines 165-173 — `state.M = Math.max(...)`; `state.bet = picked.bet`; etc. Confirmed at spec time.
- **Assumption B**: `DsEventConsumer` extending EventEmitter means `consumer.emit('activate', payload)` reaches the factory's `handleActivate` subscriber. **Verified** by reading `createFreezeHookFromDsEvents`:116 (`opts.consumer.on('activate', handleActivate);`).
- **Assumption C**: `process.argv[2]` is the first CLI argument after `pnpm demo ...` resolves. **Standard Node CLI convention**; no engine surface coupling. Demo behavior under `pnpm exec` may insert different argv layout. **Documented latitude**: Implementer may inspect `process.argv` in a debugger to confirm; if `argv[2]` is wrong, fix to `argv.length - 1` lookup (TACTICAL AUTONOMY; pretty-print-error remains).
- **Assumption D**: tsc + tsconfig.test.json compiles `tools/**/*.ts` to `tools/**/*.js` in-place (outDir is `.`). **Verified** by reading tsconfig.test.json:6-8.
- **Assumption E**: `.gitignore` excludes `*.js` so compiled output of `tools/demo-scenario.js` is not tracked. **Should be verified** by Implementer at chore-A via `git ls-files tools/demo-scenario.js` — if non-empty, the spec's "ALLOWED_SET gitignored row is defensive" framing fails. Add a verification block to Q-R70-EMPIRICAL.sh.

### 10.3 Scope added beyond request?

The directive lists:
1. `tools/demo-scenario.ts` (NEW) ✓
2. 3-4 canned scenarios (Architect picks 4) ✓
3. `package.json` `demo` script entry ✓
4. README "Quick demo" section ✓
5. `test/q70-demo-scenario.test.ts` (NEW) ✓
6. Q-R70-EMPIRICAL.sh ✓

**No scope added.** Architect did NOT prescribe:
- per-scenario shortcut scripts in package.json (`demo:sdc-drift` etc.) — directive item 3 says "Optionally"; omitted to minimize scope.
- helper file split (`tools/demo-scenarios/*.ts`) — single-file kept; directive permits but does not require multi-file.

### 10.4 Implementer can act without guessing?

- The 4 scenarios are spec'd with concrete seed values, fixed timestamps, fixed shard counts, fixed topology shape, exact AC literal markers, fixed alpha threshold.
- TACTICAL AUTONOMY scope is enumerated (§ 4.1 notes): import-extension convention, Box-Muller pair buffering, parseCliArg detail, SDC drift constant within [0.3, 0.8].
- HALT conditions (§ 6.1) cover all ambiguities the Architect could anticipate.

**Implementer can act without guessing. ✓**

### 10.5 Cross-section consistency pass (R01 MINOR / R65 MINOR-2 derived)

| Token | Section(s) where it appears | Consistency check |
|---|---|---|
| `SCENARIO_NAMES` | § 4.1 (const decl), § 4.1 (import in CLI guard), § 4.2 (test import), AC-R70-10 (§ 5), § 5.1 | All 4 names in same order; verified by grep. |
| `clean-baseline` literal | § 0 brainstorm, § 1.2, § 2.1, § 4.1 (case), § 4.2 (test), § 4.4 (README), AC-R70-1, AC-R70-5, AC-R70-10, AC-R70-11 | Identical literal everywhere. |
| `Demo complete. (exit 0)` | § 2.2 (renderFooter), § 4.1 (renderFooter), § 4.2 (AC-R70-11), § 5 (AC-R70-11 row) | Identical; trailing `\n` consistent. |
| `DEMO_THRESHOLD = 200` derived from `1 / 5e-3` | § 4.1 (const), § 4.1 (renderBettingScenario uses it), AC-R70-2 (FIRE assertion) | All references derive from `1/DEMO_ALPHA`. |
| `shard-04` | § 2.1 (scenario description), § 4.1 (`SDC_TARGET_SHARD_INDEX = 4` → `SHARD_IDS[4] === 'shard-04'`), § 4.2 (AC-R70-2 assertion), AC-R70-2 (§ 5) | Consistent. |
| ALLOWED_SET 8 paths | § 3.2 (enumeration), § 4.5 / § 11 (Q-R70-EMPIRICAL.sh Block 3) | Identical 8-path list. |
| 5-fail carry-forward set | § 3.3 item 9, § 5.2 prediction, AC-R70-13 (§ 5), § 6.1 halt #3 | All 4 sites name the same 5 AC ids. |

**Cross-section consistency verified. ✓**

### 10.6 Sweep against R02-R68 architectural reinforcements

| Reinforcement | Status at R70 spec |
|---|---|
| R01 MINOR — cross-section consistency for resolved decisions | § 10.5 sweep run; consistent. |
| R02 MINOR-3 / R03 MINOR-3 — type-declaration-site + re-export-chain check | § 8 records direct file reads at the type-declaration site for every engine surface invoked. `BettingEProcessState` declared at engine/types/families/a.ts:20 (not the detector file); demo imports the runtime function which itself imports the type — no re-export claim by demo. |
| R02 OBS-2 — file-deletion git-trackability | No file deletions at R70; N/A. |
| R03 MINOR-2 — grep verification distinguishes code from comments | Q-R70-EMPIRICAL.sh Block 6 uses `grep -nE '^export'` patterns that don't match comment lines (verified by spec-time spot-check). |
| R03 MINOR-4 — count AC verification by direct run | § 5.2 explicitly declares the predicted counts as "derived arithmetic, not authoritative"; Implementer encodes ACTUAL counts verbatim per Rule 1. |
| R05 MINOR-1 — Component-inventory AC range cross-check | § 3.1 + § 4 + § 5 reference 19 ACs with consistent count. |
| R06 MINOR-1 — JSDoc-update sibling-site discipline | No vendored-file JSDoc edits; N/A. |
| R06 MINOR-3 — opts sibling-field coverage | `ScenarioOpts._reserved` enumerated; `FreezeHookActivatorOpts` fields (setTimeout/clearTimeout/now) all enumerated in pseudocode. |
| R07 MAJOR-1 / MAJOR-2 / R08 MAJOR-2 — empirical premise + accumulation adequacy + OBSERVED-binding scope | § 6.1 halt #8 explicitly addresses SDC drift threshold-crossing as an empirical premise — Implementer verifies AT RED/GREEN; halt if not. Architect prediction is documented as derived-not-authoritative. |
| R10 MINOR-1 — file-level docblock update | Demo file is NEW; its docblock is authored at § 4.1. |
| R11 OBS-1 / OBS-2 — type-name + line-range citation accuracy | § 8 cites exact line numbers verified by spec-time read. |
| R13 MINOR-1 — statistical-term-to-formula match | Demo uses no formal-statistics named bounds; Box-Muller cited by name only and used per textbook formula. |
| R15 MINOR-1 / R23 MINOR-2 — round-start SHA + .gitignore-aware ALLOWED_SET | § 3.2 uses spec-triad SHA as round-start lower bound; .gitignored `*.js` rows annotated as defensive. |
| R15 MINOR-3 — no contradictory halt-condition prescriptions | § 6.1 halt list reviewed; no two halts trigger conflicting actions for the same condition. |
| R18 OBS-2 — vendored-file body-comparison test coverage | No vendored-file mods at R70; N/A. |
| R20 MINOR-1 — AC-table preamble vs § 4.x classification | § 5 preamble names AC-R70-12+ as binding-command attestations; § 4 pseudocode + § 11 Q-R70-EMPIRICAL.sh consistent. |
| R21 MINOR-1 — spec-commit BEFORE chore-A | § 11 specifies this; Architect commits spec triad in own commit. |
| R21 MINOR-2 / MINOR-3 — branch-binding for every guard | § 5.1 table covers all switch cases + guards. |
| R25 MINOR-1 — baseline empirical at session entry | § 5.2 baseline encoded from Architect's actual `pnpm exec node --test ...` run at session entry (444/436/5/3). |
| R25 MAJOR-3 — ESCALATE disposition cascade amendments | No prior ESCALATE on R70; N/A. |
| R30 MINOR-1 — discriminating-via-comment-or-code | AC-R70 assertions use code-position-aware patterns (deep equality, `endsWith`); comment matches not load-bearing. |
| R34 MINOR-2 — boundary-clause cross-section consistency | `>= SDC_DRIFT_START_WINDOW` (inclusive) used consistently in pseudocode + ACs. |
| R34 MINOR-3 — regex JS-validity | AC-R70 regexes use standard JS surface (`.` / `*` / character classes); no `\Z`. |
| R44 MINOR-3 / R46 MINOR-1+2 — empirical-AC threshold tightness | AC-R70-13 binds `not ok` count to exact 5 + identity to specific AC names (not `≥ 1`). AC-R70-3 binds to `=== 1` (not `≥ 1`). |
| R53 MINOR-1 / R56 MINOR-1 — chore-A vs chore-B count distinction + halt-condition carve-out | R70 has NO chore-B; single-state spec; halt conditions in § 6.1 do not carve out any pre-documented failure (per directive: no two-state pattern). |
| R58 MINOR-1 / MINOR-3 / R65 MINOR-1 — cite-then-verify (opts fields + post-MOD line numbers + routing-block AC numbers) | All AC numbers + literal markers + engine line numbers cited in this spec verified by grep at spec-emit. NEXT-ROLE.md routing block (to be written post-spec-commit) will copy AC numbers verbatim from this file. |
| R65 MINOR-2 — type-shape cross-section | `ScenarioResult` type defined once in § 4.1; consumed verbatim by § 4.2 tests. |
| R65 MINOR-3 — P3 commitments have AC coverage | § 9 commitments (empty firing_shards in clean-baseline, exit_code === 0, etc.) all have covering ACs (AC-R70-1, AC-R70-11). |
| R66 MINOR-1 — semantic-vs-literal field-name match | No success-response boolean status overclaims at R70; demo doesn't have HTTP response surface. |
| R66 MINOR-5 — single-value spec amendment with annotation | If R70 needs spec amendment post-ESCALATE, Implementer applies single-value replacement + `[Rnn-amended per Option X: reason]` annotation per R66 reinforcement. |
| R62 + R66 + R68 cumulative — no round-evolution-fragile AC patterns | § 3.2 + AC-R70-14 + AC-R70-15 use historical-only diffs (`round-start..HEAD`); NO forward-protection AC; NO live-file-count AC (the 5-fail count IS bound by identity to the named carry-forward set, not by raw count alone — see AC-R70-13). |

**Sweep complete. No outstanding reinforcement violations detected at spec emit. ✓**

---

## § 11. Implementer chore-A sequence + Q-R70-EMPIRICAL.sh contents

### 11.1 Chore-A sequence

1. **RED commit** (per R23 IMPL MINOR-1 TDD separate-RED-commit discipline):
   - Lands `test/q70-demo-scenario.test.ts` with 11 `assert.fail('R70 RED — implementation pending')` stubs in place of each AC-R70-1..11 assertion. `tools/demo-scenario.ts` does NOT yet exist; tsc TS2307 module-resolution failure at the test's `import { runScenario, ... } from '../tools/demo-scenario'`. Baseline runs: tsc exits non-zero (TS2307); `node --test` baseline at pre-R70 surface (444/436/5/3) plus the new q70 RED stub fails 11× under TS2307. RED state confirmed.
   - The RED commit message format: `red(R70): q70 demo scenario runner stub fails — TS2307 + 11 RED assertion stubs`.
2. **GREEN commit (chore-A)**:
   - Lands `tools/demo-scenario.ts` per § 4.1 pseudocode.
   - Lands `tools/demo-scenario.js` (auto-emitted by tsc; gitignored).
   - Replaces all RED stubs in `test/q70-demo-scenario.test.ts` with real assertions per § 4.2 pseudocode.
   - Modifies `package.json` per § 4.3.
   - Modifies `README.md` per § 4.4.
   - The GREEN commit message format: `feat(R70): Tessera demo scenario runner — pnpm demo + 4 canned scenarios`.
3. **Verify chore-A:**
   - `pnpm install` → exit 0 (no new deps so this should be a no-op; defensive run).
   - `pnpm exec tsc -p tsconfig.test.json` → exit 0; zero diagnostics.
   - `pnpm exec node --test --test-reporter=tap test/*.test.js` → record VERBATIM the `# tests N / # pass M / # fail K / # skipped J` lines. Predicted: K = 5 stable; M increases by 11 (the new q70 ACs).
   - `bash coordination/specs/Q-R70-EMPIRICAL.sh` → all 8 blocks PASS, exit 0.
4. **Implementer attestation:** Encode ACTUAL chore-A summary VERBATIM in NEXT-ROLE.md per Rule 1 sub-class `empirical-command-attestation`. Do NOT reframe as compliance. Do NOT cite spec-predicted values as observed values. Acknowledge any divergence with the Architect prediction.
5. **NO chore-B step.** R70 has NO SHA-injection requirement; NO forward-protection AC; NO two-state mismatch carve-out. Implementer routes directly to Reviewer after chore-A verification + attestation.

### 11.2 Q-R70-EMPIRICAL.sh contents (placed at `coordination/specs/Q-R70-EMPIRICAL.sh`)

```bash
#!/usr/bin/env bash
# Q-R70-EMPIRICAL.sh — R70 chore-A verification harness.
# Rule 1 ACTIVE GATE — Implementer runs at chore-A; Reviewer re-runs at REVIEWER HEAD.
#
# Convention: every block prints "PASS" or "FAIL" and increments counters.
# Exit code is 0 iff all blocks PASS.

set -u  # nounset; do NOT use -e (we want to run all blocks and tally)

cd "$(dirname "$0")/../.."  # to repo root

PASS_COUNT=0
FAIL_COUNT=0

assert_block() {
  # $1 = label  $2 = test command (single arg, bash -c'd)
  local label="$1"
  local cmd="$2"
  if bash -c "$cmd"; then
    echo "PASS  Block: $label"
    PASS_COUNT=$((PASS_COUNT + 1))
  else
    echo "FAIL  Block: $label"
    FAIL_COUNT=$((FAIL_COUNT + 1))
  fi
}

# Round-start SHA = the spec-triad commit SHA (the Architect's commit before chore-A).
# Implementer stamps this at chore-A pre-commit by capturing `git rev-parse HEAD~1`
# IF the most-recent commit is the GREEN commit (chore-A) — else uses the SHA of the
# Architect's spec commit directly. Architect prescribes the placeholder; Implementer
# substitutes at chore-A.
ROUND_START_SHA="${ROUND_START_SHA:-<INJECTED-AT-CHORE-A>}"

# ── Block 1: tsc exit 0 ──────────────────────────────────────────────
assert_block "tsc-exit-0" \
  'pnpm exec tsc -p tsconfig.test.json 2>&1 | grep -q . && exit 1 || true; pnpm exec tsc -p tsconfig.test.json'

# ── Block 2: node --test fail count is exactly 5 AND identity matches the carry-forward set ──
assert_block "node-test-fail-count-and-identity" '
  out=$(pnpm exec node --test --test-reporter=tap test/*.test.js 2>&1)
  fail_count=$(echo "$out" | grep -E "^# fail [0-9]+$" | awk "{print \$3}")
  not_ok_ids=$(echo "$out" | grep "^not ok" | grep -oE "AC-R[0-9]+-[0-9]+|AC-R36-30|AC-R36-31" | sort -u | tr "\n" " ")
  [ "$fail_count" = "5" ] && \
  echo "$not_ok_ids" | grep -q "AC-R36-21" && \
  echo "$not_ok_ids" | grep -q "AC-R36-30" && \
  echo "$not_ok_ids" | grep -q "AC-R36-31" && \
  echo "$not_ok_ids" | grep -q "AC-R65-2"  && \
  echo "$not_ok_ids" | grep -q "AC-R66-14"
'

# ── Block 3: anti-scope diff ⊆ ALLOWED_SET (historical: round-start..HEAD) ──
assert_block "anti-scope-allowed-set" '
  diff_paths=$(git diff "$ROUND_START_SHA"..HEAD --name-only)
  while IFS= read -r p; do
    [ -z "$p" ] && continue
    case "$p" in
      tools/demo-scenario.ts|tools/demo-scenario.js|\
test/q70-demo-scenario.test.ts|test/q70-demo-scenario.test.js|\
package.json|README.md|\
coordination/NEXT-ROLE.md|coordination/MEMORIAL.md|\
coordination/specs/Q-R70-SPEC.md|coordination/specs/Q-R70-SPEC-AUDIT.md|coordination/specs/Q-R70-EMPIRICAL.sh) ;;
      coordination/diagnostics/DIAGNOSTIC-R70-*.md) ;;  # regex carve-out
      *) echo "UNAUTHORIZED PATH: $p" >&2; exit 1 ;;
    esac
  done <<< "$diff_paths"
'

# ── Block 4: no engine/ modifications ───────────────────────────────
assert_block "no-engine-mods" '
  engine_diff=$(git diff "$ROUND_START_SHA"..HEAD --name-only -- engine/)
  [ -z "$engine_diff" ]
'

# ── Block 5: no prior-round spec modifications ──────────────────────
assert_block "no-prior-round-spec-mods" '
  prior_spec_diff=$(git diff "$ROUND_START_SHA"..HEAD --name-only -- "coordination/specs/Q-R*-SPEC.md" "coordination/specs/Q-R*-SPEC-AUDIT.md" | grep -vE "Q-R70-" || true)
  [ -z "$prior_spec_diff" ]
'

# ── Block 6: tools/demo-scenario.ts exports runScenario + listScenarios + SCENARIO_NAMES + has switch ──
assert_block "demo-scenario-structure" '
  test -f tools/demo-scenario.ts && \
  grep -qE "^export function runScenario"      tools/demo-scenario.ts && \
  grep -qE "^export function listScenarios"    tools/demo-scenario.ts && \
  grep -qE "^export const SCENARIO_NAMES"      tools/demo-scenario.ts && \
  grep -qE "^[[:space:]]*switch[[:space:]]*\(name\)" tools/demo-scenario.ts
'

# ── Block 7: package.json contains demo script ──────────────────────
assert_block "package-json-demo-script" '
  grep -qE "\"demo\":[[:space:]]*\"node tools/demo-scenario.js\"" package.json
'

# ── Block 8: README has Quick demo section + the canonical command literal ──
assert_block "readme-quick-demo" '
  grep -qE "^## Quick demo" README.md && \
  grep -qE "pnpm demo clean-baseline" README.md
'

echo ""
echo "── Q-R70-EMPIRICAL.sh summary ──"
echo "PASS: $PASS_COUNT"
echo "FAIL: $FAIL_COUNT"
[ "$FAIL_COUNT" -eq 0 ] || exit 1
exit 0
```

**Note on Block 3 path-match:** the case statement enumerates the 8 ALLOWED_SET paths plus the regex carve-out. The `.js` compiled outputs are listed defensively; if they appear (which would mean `.gitignore` is not excluding them), the block PASSes because they ARE in the allowed-set; if they don't appear (the normal case under `.gitignore: *.js`), the block also PASSes. Either way, Block 3 holds.

**Spec-emit-time grilling note on Q-R70-EMPIRICAL.sh:**
- The `$ROUND_START_SHA` placeholder is INJECTED-AT-CHORE-A by the Implementer (per R53/R56 reinforcement: the SHA is not known at Architect time because the chore-A commit's parent is the Architect's spec commit, whose SHA is only known after the Architect commits). The Implementer captures the parent SHA via `git rev-parse HEAD~1` after the GREEN commit lands, then injects.
- **This is NOT a forward-protection / SHA-injection two-state pattern.** R70 has NO chore-B. The SHA injection is a one-time, single-state operation: the Implementer captures the parent of the GREEN commit and writes it into the EMPIRICAL.sh in the same commit. Q-R70-EMPIRICAL.sh runs ONCE post-injection and the SHA is stable.
- If the Reviewer at HEAD wishes to re-run the harness, the SHA is already injected at the GREEN commit; `bash coordination/specs/Q-R70-EMPIRICAL.sh` works without further mutation.
- **Architect-prescribed injection mechanism**: Implementer replaces the literal `<INJECTED-AT-CHORE-A>` substring in Q-R70-EMPIRICAL.sh with the actual SHA via `sed -i.bak "s/<INJECTED-AT-CHORE-A>/$(git rev-parse HEAD)/g" coordination/specs/Q-R70-EMPIRICAL.sh && rm coordination/specs/Q-R70-EMPIRICAL.sh.bak` BEFORE committing chore-A. The SHA captured is the Architect's spec commit SHA (which is HEAD at the moment of injection, BEFORE the chore-A commit).
- TACTICAL AUTONOMY: Implementer may use `git rev-parse HEAD` or `git log -1 --format=%H` — equivalent.

---

## § 12. Pipeline invocation

```bash
cd /Users/johnwarren/concord/tessera
./run-pipeline.sh --round R70 --tier full
```

Per R70 directive line 113.

---

_End of Q-R70-SPEC.md. Next artifact: Q-R70-SPEC-AUDIT.md (Architect ceremony sidecar; Reviewer-authorized read; lands in the same spec-triad commit)._
