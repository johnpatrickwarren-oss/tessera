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
} from '@johnpatrickwarren-oss/deploysignal-engine/detectors/betting-e-process';
import {
  attributeCommonMode,
  type FiredShardEvent,
} from '@johnpatrickwarren-oss/deploysignal-engine/topology/common-mode-attribution';
import { DsEventConsumer } from '@johnpatrickwarren-oss/deploysignal-engine/ds-integration/event-consumer';
import { createFreezeHookFromDsEvents } from '@johnpatrickwarren-oss/deploysignal-engine/ds-integration/freeze-hook-factory';
import { initialPerShardResidual } from '@johnpatrickwarren-oss/deploysignal-engine/per-shard/warm-start';
import type { TopologySnapshot, TopologyNode, TopologyEdge } from '@johnpatrickwarren-oss/deploysignal-engine/types/verdict';
import type { ExtendedSampleObservation } from '@johnpatrickwarren-oss/deploysignal-engine/per-shard/runtime';
import type { DeployEventPayload } from '@johnpatrickwarren-oss/deploysignal-engine/ds-integration/event-contract';

// (Note: tools/* import convention uses `.js` extensions per existing
//  tools/curate-baseline-pipeline.ts neighbor file at tools/curate-baseline-pipeline.ts:44.
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
const SDC_DRIFT_PER_WINDOW = 0.4;          // injected mean shift per window (tunable within [0.3, 0.8] per spec § 4.1)

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
