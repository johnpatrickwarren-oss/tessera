/**
 * canary-sim — probe-level simulator + statistical methods for the active synthetic-canary
 * guarantee program (docs/SPEC-canary-guarantee-program.md).
 *
 * The observation unit is one canary EXECUTION (a controlled, versioned probe run on a unit),
 * not a 1 Hz telemetry stream. The statistical core under test:
 *
 *   randomized contemporaneous placement within a comparison block
 *     → exact conformal rank p-values (finite-sample, distribution-free)   [EXACT-FS]
 *     → mixture-calibrator e-process per unit / per topology group          [ANYTIME]
 *     → stopped e-BH per topology family (flat per family — N6 forbids a
 *       cross-level hierarchical theorem)                                   [ANYTIME per family]
 *
 * Prior-decision constraints honored (RESEARCH-INDEX § 1): N1 (no temporal per-unit
 * certification — the anchored envelope is empirically calibrated, never theorem-valid),
 * N3 (no cross-sectional recalibration before e-BH), N6 (per-family FDR only),
 * ADR 0019 (validity is an EmitterContract, revocable at runtime — the canary emitter here
 * routes through the certified, proof-carrying e-BH gate — ADR 0025).
 */

import { certifiedFdrBenjaminiHochberg, EmitterContract } from './emitter-contract';
import { eFromOnsetAccumulator, eSupAdjusted, type EValue } from './e-value.js';

// ── 1. RNG (seeded; no Math.random / Date anywhere) ─────────────────────────────────────────

export class Rng {
  private s: number;
  private spare: number | null = null;
  constructor(seed: number) { this.s = seed >>> 0; if (this.s === 0) this.s = 0x9e3779b9; }
  next(): number { // mulberry32
    this.s = (this.s + 0x6d2b79f5) >>> 0;
    let t = this.s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  norm(): number {
    if (this.spare !== null) { const v = this.spare; this.spare = null; return v; }
    let u = 0, v = 0;
    do { u = this.next(); } while (u === 0);
    v = this.next();
    const m = Math.sqrt(-2 * Math.log(u));
    this.spare = m * Math.sin(2 * Math.PI * v);
    return m * Math.cos(2 * Math.PI * v);
  }
  int(n: number): number { return Math.floor(this.next() * n) % n; }
  pick<T>(a: readonly T[]): T { return a[this.int(a.length)]; }
}

// ── 2. Topology & context ───────────────────────────────────────────────────────────────────

/** Per-execution unit-noise SD by generation, and measurement noise. Exported because
 *  `heterogeneity-estimate` needs the SD of the block it measures, and hard-coding a copy is exactly
 *  how that tool came to use 0.010 (gen 1) for a gen-0 block — overstating within-unit noise by 25%
 *  and DEFLATING every ICC it reported. Single source. */
export const GEN_SIGMA_BY_GEN = [0.008, 0.010, 0.013] as const;
export const MEAS_SIGMA = 0.005;

export const GPUS_PER_HOST = 4;         // GB200 compute tray
export const HOSTS_PER_RACK = 18;       // NVL72: 72 GPUs / rack
export const GPUS_PER_RACK = GPUS_PER_HOST * HOSTS_PER_RACK;
export const RACKS_PER_LEAF = 4;
export const RACKS_PER_POWER = 16;      // power/cooling domain
export const RACKS_PER_REGION = 64;

export type Level = 'gpu' | 'host' | 'rack' | 'leaf' | 'power' | 'region' | 'fleet';
export const GROUP_LEVELS: readonly Level[] = ['host', 'rack', 'leaf', 'power', 'region'];

export interface Topology {
  n: number;                    // #GPUs
  nHosts: number; nRacks: number; nLeaves: number; nPowers: number; nRegions: number;
  hostOf: Int32Array; rackOf: Int32Array; leafOf: Int32Array; powerOf: Int32Array; regionOf: Int32Array;
  genOfRack: Int8Array;         // 0/1/2 (rack-homogeneous)
  fwOfRack: Int8Array;          // firmware bucket within gen
  classOfHost: Int8Array;       // resident workload class 0..3
  hiddenOfGpu: Uint8Array;      // H12 hidden stratum membership (unmodeled hw revision)
}

export function buildTopology(n: number, rng: Rng, hiddenStratumFrac: number): Topology {
  const nRacks = Math.max(2, Math.ceil(n / GPUS_PER_RACK));
  const nGpus = nRacks * GPUS_PER_RACK;
  const nHosts = nRacks * HOSTS_PER_RACK;
  const nLeaves = Math.ceil(nRacks / RACKS_PER_LEAF);
  const nPowers = Math.ceil(nRacks / RACKS_PER_POWER);
  const nRegions = Math.max(1, Math.ceil(nRacks / RACKS_PER_REGION));
  const hostOf = new Int32Array(nGpus), rackOf = new Int32Array(nGpus);
  const leafOf = new Int32Array(nGpus), powerOf = new Int32Array(nGpus), regionOf = new Int32Array(nGpus);
  for (let g = 0; g < nGpus; g++) {
    hostOf[g] = Math.floor(g / GPUS_PER_HOST);
    rackOf[g] = Math.floor(g / GPUS_PER_RACK);
    leafOf[g] = Math.floor(rackOf[g] / RACKS_PER_LEAF);
    powerOf[g] = Math.floor(rackOf[g] / RACKS_PER_POWER);
    regionOf[g] = Math.floor(rackOf[g] / RACKS_PER_REGION);
  }
  const genOfRack = new Int8Array(nRacks), fwOfRack = new Int8Array(nRacks);
  for (let r = 0; r < nRacks; r++) {
    const u = rng.next();
    genOfRack[r] = u < 0.5 ? 0 : u < 0.8 ? 1 : 2;   // 50/30/20 generation mix
    fwOfRack[r] = rng.next() < 0.6 ? 0 : 1;          // firmware bucket within gen
  }
  const classOfHost = new Int8Array(nHosts);
  for (let h = 0; h < nHosts; h++) classOfHost[h] = rng.int(4);
  const hiddenOfGpu = new Uint8Array(nGpus);
  for (let g = 0; g < nGpus; g++) hiddenOfGpu[g] = rng.next() < hiddenStratumFrac ? 1 : 0;
  return { n: nGpus, nHosts, nRacks, nLeaves, nPowers, nRegions, hostOf, rackOf, leafOf, powerOf, regionOf, genOfRack, fwOfRack, classOfHost, hiddenOfGpu };
}

// ── 3. Healthy scenarios ────────────────────────────────────────────────────────────────────

export interface ScenarioKnobs {
  name: string;
  rackStaticSd: number;         // persistent rack effect (fraction of score)
  rackOuSd: number;             // rack-correlated OU (H2)
  rackOuTauH: number;
  globalDriftPerDay: number;    // H3 — starts at driftOnsetDay (DELAYED)
  driftOnsetDay: number;
  diurnalAmp: number;           // H4 environment leak into canary scores
  regimeStepDay: number;        // H5 abrupt benign step (-1 = off)
  regimeStepSize: number;
  workloadMixChangeDay: number; // H6 (-1 = off) — host load level shifts
  schedulerChangeDay: number;   // H7 (-1 = off) — placement distribution changes
  heteroRackSd: number;         // H8 log-scale spread of per-rack noise multiplier
  missingRate: number;          // H9 exec produces no result
  placementBias: number;        // H10 sentinel placement ∝ exp(-bias·load) (targeted execs unbiased)
  interferenceCoef: number;     // H11 score coupling to co-located load
  hiddenStratumFrac: number;    // H12 unmodeled stratum fraction
  hiddenStratumOffset: number;
  commonModeStepDay: number;    // H13 fleet-wide slowdown (-1 = off) — benign-null variants use 0 size
  commonModeStepSize: number;
  agingSdPerDay: number;        // H14 per-unit aging slope sd
  /** H15-H17 (2026-07-26): CONTINUOUS per-unit PERSISTENT offset, sd as a fraction of score.
   *  The gap the theta/tau measurement found: the original 14 scenarios vary drift, steps and
   *  common-mode -- all round- or fleet-common, which a within-round rank cancels BY CONSTRUCTION --
   *  so ten of them contain no unit-level persistence at all and the accumulation effect had nothing
   *  to act on. Persistent unit offsets are what actually drive an e-process across rounds
   *  (research/2026-07-25-theta-tau-measurement.md). Default 0: every pre-existing scenario is
   *  byte-identical, and no rng is drawn unless the knob is set. */
  unitOffsetSd: number;
}

const BASE: ScenarioKnobs = {
  name: 'H1-stationary-iid', rackStaticSd: 0, rackOuSd: 0, rackOuTauH: 6,
  globalDriftPerDay: 0, driftOnsetDay: 6, diurnalAmp: 0, regimeStepDay: -1, regimeStepSize: 0,
  workloadMixChangeDay: -1, schedulerChangeDay: -1, heteroRackSd: 0, missingRate: 0.01,
  placementBias: 0, interferenceCoef: 0.002, hiddenStratumFrac: 0, hiddenStratumOffset: 0,
  commonModeStepDay: -1, commonModeStepSize: 0, agingSdPerDay: 0, unitOffsetSd: 0,
};

export const HEALTHY_SCENARIOS: Record<string, ScenarioKnobs> = {
  H1: { ...BASE },
  H2: { ...BASE, name: 'H2-correlated', rackStaticSd: 0.004, rackOuSd: 0.004, rackOuTauH: 8 },
  H3: { ...BASE, name: 'H3-delayed-slow-drift', globalDriftPerDay: 0.0006, driftOnsetDay: 6 },
  H4: { ...BASE, name: 'H4-diurnal', diurnalAmp: 0.008 },
  H5: { ...BASE, name: 'H5-abrupt-benign-step', regimeStepDay: 30, regimeStepSize: 0.012 },
  H6: { ...BASE, name: 'H6-workload-mix-change', workloadMixChangeDay: 25, interferenceCoef: 0.006 },
  H7: { ...BASE, name: 'H7-scheduler-change', schedulerChangeDay: 25, interferenceCoef: 0.006 },
  H8: { ...BASE, name: 'H8-heteroskedastic', heteroRackSd: 0.5, rackStaticSd: 0.003 },
  H9: { ...BASE, name: 'H9-missing-irregular', missingRate: 0.15 },
  H10: { ...BASE, name: 'H10-placement-bias', placementBias: 2.0, interferenceCoef: 0.008 },
  H11: { ...BASE, name: 'H11-interference', interferenceCoef: 0.010 },
  H12: { ...BASE, name: 'H12-partial-exch-violation', hiddenStratumFrac: 0.05, hiddenStratumOffset: 0.006 },
  H13: { ...BASE, name: 'H13-common-mode-slowdown', commonModeStepDay: 30, commonModeStepSize: 0.03 },
  H14: { ...BASE, name: 'H14-aging', agingSdPerDay: 0.00004, rackStaticSd: 0.002 },
  // ── unit-level persistent heterogeneity (2026-07-26) ──────────────────────────────────────
  // `unitOffsetSd = theta * sigma_exec`, and for the gen-0 block these are drawn against
  // sigma_exec = sqrt(0.008^2 + 0.005^2) = 0.009434 — NOT the 0.011180 (gen 1) originally used here.
  // ⚠️ THE NAMES AND THE ORIGINAL ICC COMMENTS ARE STALE, AND THE KNOB VALUES ARE NOT.
  // These three were tuned against the pre-N11 estimator, which was biased down twice over, so the
  // ICCs they were named for were never their real ICCs. The knobs are deliberately UNCHANGED (every
  // published paging result was measured on them); only the labels were wrong. Measured on the
  // corrected axis: H16 = 1.49%, H15 = 12.40%, H17 = 32.97%. See RESEARCH-INDEX N11.
  H15: { ...BASE, name: 'H15-unit-persistent-at-target', unitOffsetSd: 0.003578 },   // ICC 12.40% (labelled 9.3%)
  H16: { ...BASE, name: 'H16-unit-persistent-mild', unitOffsetSd: 0.001118 },        // ICC  1.49% (labelled 1.0%)
  H17: { ...BASE, name: 'H17-unit-persistent-severe', unitOffsetSd: 0.006708 },      // ICC 32.97% (labelled 26.5%)
};

// ── 4. Probes & faults ──────────────────────────────────────────────────────────────────────

export type ProbeType = 'compute' | 'hbm' | 'nvlink' | 'xrack' | 'e2e';
export const PROBE_TYPES: readonly ProbeType[] = ['compute', 'hbm', 'nvlink', 'xrack', 'e2e'];
/** budget share, gpus consumed, duration seconds */
export const PROBE_SPEC: Record<ProbeType, { mix: number; gpus: number; secs: number }> = {
  compute: { mix: 0.30, gpus: 1, secs: 300 },
  hbm:     { mix: 0.20, gpus: 1, secs: 300 },
  nvlink:  { mix: 0.20, gpus: GPUS_PER_HOST, secs: 300 },
  xrack:   { mix: 0.15, gpus: 8, secs: 300 },
  e2e:     { mix: 0.15, gpus: 1, secs: 180 },
};

export type FaultKind = 'perf' | 'correctness' | 'dcgmOnly' | 'canaryOnly' | 'classConditional' | 'intermittent';

export interface FaultSpec {
  id: string;
  level: Level;
  target: number;            // index at that level; for level 'gpu' with count>1, first of `count` random gpus
  count?: number;
  onsetDay: number;
  durationDays?: number;     // undefined = to end of horizon
  severity: number;          // fractional degradation (0.001..0.5); correctness: per-probe failure prob
  kind: FaultKind;
  workloadClass?: number;    // for classConditional
  dutyCycle?: number;        // for intermittent (fraction of hours active)
  gpuIds?: number[];         // resolved at sim start for level 'gpu'
}

/** Is gpu g inside fault f's topology scope? (fleet = everyone) */
function inScopeAt(topo: Topology, f: FaultSpec, g: number): boolean {
  return f.level === 'fleet' ? true :
    f.level === 'gpu' ? (f.gpuIds ?? []).includes(g) :
    f.level === 'host' ? topo.hostOf[g] === f.target :
    f.level === 'rack' ? topo.rackOf[g] === f.target :
    f.level === 'leaf' ? topo.leafOf[g] === f.target :
    f.level === 'power' ? topo.powerOf[g] === f.target :
    topo.regionOf[g] === f.target;
}

/** probe sensitivity to a fault, by fault level (network faults only visible to fabric probes, etc.) */
function probeSensitivity(pt: ProbeType, f: FaultSpec): number {
  if (f.level === 'leaf') return pt === 'xrack' ? 1 : pt === 'e2e' ? 0.3 : 0;
  if (f.kind === 'canaryOnly' || f.kind === 'perf' || f.kind === 'intermittent' || f.kind === 'classConditional') {
    if (pt === 'xrack') return 0.3;
    return 1;
  }
  if (f.kind === 'dcgmOnly') return 0;       // visible in passive telemetry only
  if (f.kind === 'correctness') return 0;    // handled on the correctness channel
  return 1;
}

// ── 5. Fleet state & score model ────────────────────────────────────────────────────────────

export interface SimConfig {
  seed: number;
  nGpus: number;
  days: number;
  windowHours: number;        // comparison-window width (scheduling + blocking unit)
  budgetFrac: number;         // e.g. 0.0005 = 0.05% of fleet GPU-time
  scenario: ScenarioKnobs;
  faults: FaultSpec[];
  q: number;                  // e-BH level
  alphaPage: number;          // per-unit anytime paging threshold e ≥ 1/alphaPage
  stopEveryHours: number;     // e-BH stopping grid
  /** Block keys: 'coarse' = pt|ver|gen; 'mondrian' adds fw|region; 'rack-local' (ADR 0026) keys
   *  gpu-unit execs by pt|ver|RACK and drafts sentinels in RACK COHORTS so blocks fill — the
   *  rack-shared λ cancels by within-rack rank invariance (N13's fix). Host/path execs keep
   *  coarse keys (rack-level faults are the group families' channel, not this one). */
  blocking: 'coarse' | 'mondrian' | 'rack-local';
  adaptive?: AdaptiveConfig;
  historyDays: number;        // method B history window (must be ≥ 14; SPEC uses 14 within a ≥56d horizon)
  refreshHistory: boolean;    // method B variant
  minPeers: number;           // K floor for a block-window to count
  groupHandicap: boolean;     // subtract qualification-period group rank offsets (EMP-CAL adjustment)
  supFdrAdjust: boolean;      // feed √(running-max e)−1 to e-BH (all-times/SupFDR-valid; power cost)
  canaryVersionChangeDay?: number;  // version change mid-horizon (block key changes — must not pool)
}

export interface AdaptiveConfig {
  enabled: boolean;
  escalateAt: number;         // e-process threshold to escalate
  deescalateBelow: number;
  escalationBudgetFrac: number; // fraction of total budget reserved for escalation
  peerDraft: 'random' | 'suspects';  // 'suspects' is the DELIBERATELY-INVALID design (E4)
}

export interface Exec {
  unit: number;               // gpu id (or host id for nvlink — see unitKind)
  unitKind: 'gpu' | 'host' | 'path';
  pt: ProbeType;
  y: number;                  // badness score (1 = nominal)
  err: boolean;               // correctness-validation failure
  leafA?: number; leafB?: number;  // xrack path endpoints
  targeted: boolean;          // escalation-forced exec (vs sentinel draft)
  gpuSeconds: number;
}

interface FleetState {
  topo: Topology;
  agingSlope: Float64Array;   // per-gpu per-day
  unitOffset: Float64Array;   // per-gpu PERSISTENT offset (H15-H17)
  rackStatic: Float64Array;
  rackOu: Float64Array;
  rackNoiseMult: Float64Array;
  genSigma: number[];         // per-generation noise scale
  genBase: number[];          // per-generation nominal score (cancels in ranks; matters for B/I)
  fwBase: number[];
}

function initFleet(cfg: SimConfig, rng: Rng): FleetState {
  const topo = buildTopology(cfg.nGpus, rng, cfg.scenario.hiddenStratumFrac);
  const agingSlope = new Float64Array(topo.n);
  for (let g = 0; g < topo.n; g++) agingSlope[g] = Math.abs(rng.norm()) * cfg.scenario.agingSdPerDay;
  const unitOffset = new Float64Array(topo.n);
  // guarded: drawing unconditionally would shift the rng stream and move every published figure
  if (cfg.scenario.unitOffsetSd > 0) {
    for (let g = 0; g < topo.n; g++) unitOffset[g] = rng.norm() * cfg.scenario.unitOffsetSd;
  }
  const rackStatic = new Float64Array(topo.nRacks);
  const rackOu = new Float64Array(topo.nRacks);
  const rackNoiseMult = new Float64Array(topo.nRacks).fill(1);
  for (let r = 0; r < topo.nRacks; r++) {
    rackStatic[r] = rng.norm() * cfg.scenario.rackStaticSd;
    rackNoiseMult[r] = Math.exp(rng.norm() * cfg.scenario.heteroRackSd);
  }
  return { topo, agingSlope, unitOffset, rackStatic, rackOu, rackNoiseMult, genSigma: [...GEN_SIGMA_BY_GEN], genBase: [1.0, 0.92, 1.1], fwBase: [1.0, 1.005] };
}

/** host load in [0,1] at window w (drives interference + placement bias) */
function hostLoad(st: FleetState, cfg: SimConfig, h: number, tHours: number, rng: Rng): number {
  const cls = st.topo.classOfHost[h];
  const s = cfg.scenario;
  let base = 0.45 + 0.1 * cls;
  if (s.workloadMixChangeDay >= 0 && tHours / 24 >= s.workloadMixChangeDay) base += (cls % 2 === 0 ? 0.15 : -0.1);
  const diurnal = 0.25 * Math.sin(2 * Math.PI * (tHours % 24) / 24 + cls);
  const v = base + diurnal + 0.1 * rng.norm();
  return Math.min(1, Math.max(0, v));
}

/**
 * Healthy score panel for ONE block key, generated by the REAL `execScore`.
 *
 * WHY THIS LIVES HERE. `tools/heterogeneity-estimate.ts` used to MIRROR `execScore` with the fault
 * terms dropped, importing the knobs "so the two cannot drift apart". The knobs did not drift; the
 * MODEL did — the mirror silently omitted `interferenceCoef · hostLoad(...)`, because `hostLoad` is
 * not exported and could not be reproduced without duplicating it. That omission is not cosmetic:
 * host load carries a persistent per-host component, so every θ̂ measured against the mirror was a
 * LOWER bound, and it was a lower bound precisely for H6/H7/H10/H11 — the four interference-driven
 * scenarios, which are exactly the four that reported θ = 0.
 *
 * Importing constants does not couple two implementations; only calling the same code does. So the
 * estimator now calls this, and there is no second score model to keep in sync.
 *
 * ONE BLOCK KEY. A conformal rank compares within (probe × version × gen × firmware), so the panel
 * selects only GPUs whose rack carries the requested `gen`/`fw`. `rackStatic` is deliberately NOT
 * filtered out: racks sharing a block key differ by it, and that is a genuine persistent between-unit
 * component of the block, not contamination.
 */
export function healthyScorePanel(scenario: ScenarioKnobs, opts: {
  nUnits: number; nRounds: number; hoursBetween: number; seed: number;
  probe?: ProbeType; gen?: number; fw?: number; nGpus?: number;
}): { scores: number[][]; hours: number[]; units: number[] } {
  const probe = opts.probe ?? 'compute';
  const gen = opts.gen ?? 0, fw = opts.fw ?? 0;
  // (gen 0, fw 0) is ~50%·60% = 30% of racks IN EXPECTATION, but the rack draw is binomial and runs
  // low often enough to matter: at 71 racks a real seed yielded 14 where 21 were expected (−1.9σ).
  // Oversample by 1.8× and verify — the throw below is the check, this is just the margin.
  const wantRacks = Math.ceil((opts.nUnits / GPUS_PER_RACK / 0.3) * 1.8) + 8;
  const nGpus = opts.nGpus ?? wantRacks * GPUS_PER_RACK;
  const days = (opts.nRounds * opts.hoursBetween) / 24;
  const cfg: SimConfig = {
    seed: opts.seed, nGpus, days, windowHours: opts.hoursBetween, budgetFrac: 0.0005,
    scenario, faults: [], q: 0.05, alphaPage: 1e-3, stopEveryHours: opts.hoursBetween,
    blocking: 'coarse',
    // Selection/decision knobs. NONE of these reach `execScore` — they govern scheduling, blocking
    // and the e-BH path, which this panel deliberately bypasses. Set to the SPEC defaults so the
    // config is well-formed rather than to values that imply a claim about the panel.
    historyDays: 14, refreshHistory: false, minPeers: 8, groupHandicap: false, supFdrAdjust: false,
  };
  const rng = new Rng(opts.seed);
  const st = initFleet(cfg, rng);
  const units: number[] = [];
  for (let g = 0; g < st.topo.n && units.length < opts.nUnits; g++) {
    const r = st.topo.rackOf[g];
    if (st.topo.genOfRack[r] === gen && st.topo.fwOfRack[r] === fw) units.push(g);
  }
  if (units.length < opts.nUnits) {
    throw new Error(
      `healthyScorePanel: only ${units.length} GPUs carry (gen=${gen}, fw=${fw}) in a ${nGpus}-GPU ` +
      `fleet; need ${opts.nUnits}. Raise opts.nGpus.`);
  }
  const hours = Array.from({ length: opts.nRounds }, (_, k) => k * opts.hoursBetween);
  const scores = units.map(() => new Array<number>(opts.nRounds));
  // The rack OU state (H2) is advanced by the MAIN LOOP, not by execScore — see the sweep at the
  // `s.rackOuSd > 0` branch. A panel that only calls execScore would silently drop H2's channel,
  // which is the same species of omission this function exists to remove. Same recursion, stepped
  // by the revisit interval.
  const ouA = Math.exp(-opts.hoursBetween / Math.max(scenario.rackOuTauH, 1e-9));
  const ouInnov = scenario.rackOuSd * Math.sqrt(1 - ouA * ouA);
  // Round-major: every unit is scored before the next round opens, as in the real schedule. This
  // fixes the rng consumption order, so the panel is deterministic in `seed`.
  for (let k = 0; k < opts.nRounds; k++) {
    if (scenario.rackOuSd > 0) {
      for (let r = 0; r < st.topo.nRacks; r++) st.rackOu[r] = ouA * st.rackOu[r] + ouInnov * rng.norm();
    }
    for (let u = 0; u < units.length; u++) {
      // EXECUTION-TIME JITTER, uniform within the revisit interval: probe placement is randomised in
      // time as well as in space. Without it a revisit interval that is a multiple of 24 h pins every
      // execution of a unit to one diurnal phase and the H4 diurnal term vanishes IDENTICALLY — which
      // silently reported θ(H4) = 0 the first time the estimator was run. The main sim gets phase
      // variety for free by sweeping many windows; a per-unit revisit series does not.
      const tExec = hours[k] + rng.next() * opts.hoursBetween;
      scores[u][k] = execScore(cfg, st, units[u], probe, tExec, rng).y;
    }
  }
  return { scores, hours, units };
}

/** Sum of active canary-visible fault severities for (gpu, probe, window). */
function faultEffect(cfg: SimConfig, st: FleetState, g: number, pt: ProbeType, tHours: number, rng: Rng): number {
  const t = st.topo; const day = tHours / 24;
  let eff = 0;
  for (const f of cfg.faults) {
    if (day < f.onsetDay) continue;
    if (f.durationDays !== undefined && day >= f.onsetDay + f.durationDays) continue;
    if (f.kind === 'intermittent') {
      const duty = f.dutyCycle ?? 0.2;
      // deterministic pseudo-random duty pattern keyed to hour (reproducible)
      const h = Math.floor(tHours);
      const u = ((h * 2654435761 + f.id.length * 97) >>> 0) % 1000 / 1000;
      if (u >= duty) continue;
    }
    if (f.kind === 'classConditional' && st.topo.classOfHost[t.hostOf[g]] !== (f.workloadClass ?? 0)) continue;
    if (!inScopeAt(t, f, g)) continue;
    eff += f.severity * probeSensitivity(pt, f);
  }
  return eff;
}

function correctnessFailProb(cfg: SimConfig, st: FleetState, g: number, tHours: number): number {
  const day = tHours / 24;
  let p = 0.0005; // healthy base validation-failure rate
  for (const f of cfg.faults) {
    if (f.kind !== 'correctness') continue;
    if (day < f.onsetDay) continue;
    if (f.durationDays !== undefined && day >= f.onsetDay + f.durationDays) continue;
    const inScope = f.level === 'gpu' ? (f.gpuIds ?? []).includes(g) :
      f.level === 'host' ? st.topo.hostOf[g] === f.target :
      f.level === 'rack' ? st.topo.rackOf[g] === f.target : f.level === 'fleet';
    if (inScope) p = Math.max(p, f.severity);
  }
  return p;
}

/** One canary execution's badness score. */
function execScore(cfg: SimConfig, st: FleetState, g: number, pt: ProbeType, tHours: number, rng: Rng): { y: number; err: boolean } {
  const s = cfg.scenario; const t = st.topo;
  const rack = t.rackOf[g], gen = t.genOfRack[rack], day = tHours / 24;
  let y = st.genBase[gen] * st.fwBase[t.fwOfRack[rack]];
  let rel = 0;
  if (s.globalDriftPerDay > 0 && day >= s.driftOnsetDay) rel += s.globalDriftPerDay * (day - s.driftOnsetDay);
  if (s.regimeStepDay >= 0 && day >= s.regimeStepDay) rel += s.regimeStepSize;
  if (s.commonModeStepDay >= 0 && day >= s.commonModeStepDay) rel += s.commonModeStepSize;
  rel += s.diurnalAmp * Math.sin(2 * Math.PI * (tHours % 24) / 24) * (0.5 + t.hiddenOfGpu[g] * 0.0 + (g % 7) / 7);
  rel += st.rackStatic[rack] + st.rackOu[rack];
  rel += st.agingSlope[g] * day;
  rel += st.unitOffset[g];
  if (t.hiddenOfGpu[g]) rel += s.hiddenStratumOffset;
  rel += s.interferenceCoef * hostLoad(st, cfg, t.hostOf[g], tHours, rng);
  rel += faultEffect(cfg, st, g, pt, tHours, rng);
  const sigma = st.genSigma[gen] * st.rackNoiseMult[rack];
  rel += sigma * rng.norm() + MEAS_SIGMA * rng.norm(); // unit noise + measurement noise
  const err = rng.next() < correctnessFailProb(cfg, st, g, tHours);
  return { y: y * (1 + rel), err };
}

// ── 6. Statistical primitives ───────────────────────────────────────────────────────────────

// ── onset-mixture e-process (fixes fixed-split dilution) ────────────────────────────────────
// A plain product e-process pays for its healthy past: E[log f(U)] < 0, so by a late fault onset
// the process sits at e.g. 1e-17 and detection delay grows with healthy history (measured on the
// clustersynth cross-check: 13 d for a 4σ fault that needs ~4 probes of evidence). The repo's
// established fix (ADR 0019 default increment; mode-b-loop geometric-onset-prior correction,
// 2026-07-02 audit) is the onset mixture M_t = Σ_j w_j Π_{s=j..t} f(p_s) with FIXED geometric
// weights w_j = (1−γ)γ^(j−1): a countable convex combination of e-processes each conditionally
// valid from its own onset ⇒ M is a genuine nonnegative supermartingale with E[M_0]=1 ⇒ Ville
// paging and stopped e-BH remain exact, while detection delay becomes onset-independent.
// Recursion: G_t = f_t·(G_{t−1} + w_t), M_t = G_t + γ^t (untriggered-onset tail).
export const ONSET_GAMMA = 0.99;
export function onsetUpdate(g: number, k: number, f: number): number {
  return f * (g + (1 - ONSET_GAMMA) * Math.pow(ONSET_GAMMA, k));
}
export function onsetValue(g: number, k: number): number {
  return g + Math.pow(ONSET_GAMMA, k);
}
/** Reported e-value: ½·(plain product) + ½·(onset mixture). Both are valid supermartingales
 *  (the product is the mixture's j=1 component), so the average is one too — and it is within
 *  log 2 ≈ 0.7 nats of whichever wins: the product for short healthy histories (no prior
 *  penalty), the mixture for long ones (no dilution). E5 measured the mixture-only prior cost
 *  at ~1–2 d on early-onset marginal faults; this recovers it. */
export function combinedEValue(prod: number, g: number, k: number): number {
  return 0.5 * prod + 0.5 * onsetValue(g, k);
}

const KAPPAS = [0.05, 0.1, 0.2, 0.4, 0.6, 0.8];
/** mixture p→e calibrator: mean_κ κ p^{κ-1}; ∫₀¹ f = 1 exactly, f decreasing ⇒ E[f(P)] ≤ 1 for super-uniform P. */
export function calibrator(p: number): number {
  const pc = Math.max(p, 1e-12);
  let s = 0;
  for (const k of KAPPAS) s += k * Math.pow(pc, k - 1);
  return s / KAPPAS.length;
}

/** exact randomized conformal rank p: (#{peers > y} + U·(1 + #{peers = y})) / (K+1), one-sided high-is-bad. */
export function conformalP(y: number, peers: readonly number[], u: number): number {
  let gt = 0, eq = 0;
  for (const v of peers) { if (v > y) gt++; else if (v === y) eq++; }
  return (gt + u * (1 + eq)) / (peers.length + 1);
}

/** e-BH selection over raw e-values (engine rule), used where no contract gate applies (comparators). */
export function eBhSelect(e: readonly number[], q: number): number[] {
  const idx = e.map((v, i) => i).sort((a, b) => e[b] - e[a]);
  const n = e.length;
  let K = 0;
  for (let k = 1; k <= n; k++) if (e[idx[k - 1]] >= n / (q * k)) K = k;
  return idx.slice(0, K);
}

/** BH over p-values (for the p-value comparators A/B/C/D). */
export function bhSelect(p: readonly number[], q: number): number[] {
  const idx = p.map((v, i) => i).sort((a, b) => p[a] - p[b]);
  const n = p.length;
  let K = 0;
  for (let k = 1; k <= n; k++) if (p[idx[k - 1]] <= (q * k) / n) K = k;
  return idx.slice(0, K);
}

export function normTailP(z: number): number { // one-sided upper
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989422804014327 * Math.exp(-z * z / 2);
  let pr = d * t * (0.319381530 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  if (z < 0) pr = 1 - pr;
  return Math.min(1, Math.max(1e-16, pr));
}

/** The canary emitter contract (ADR 0019 integration point). construction_valid, revocable. */
export function canaryEmitter(monitorPassing: boolean): EmitterContract {
  return {
    id: 'canary/contemporaneous-rank-eprocess',
    baselineVersion: 'none (contemporaneous spatial null; no temporal baseline)',
    conditioningVariables: ['canary_version', 'probe_type', 'gpu_generation', 'firmware', 'window'],
    residualizer: 'randomized conformal rank among contemporaneous same-block peers',
    increment: 'mixture calibrator mean_k k*p^(k-1) over exact conformal p',
    stoppingAggregation: 'per-unit product e-process (global filtration); stopped e-BH per topology family',
    horizon: 'continuous; validity per-increment by randomization',
    validityClass: 'construction_valid',
    calibrationMonitorPassing: monitorPassing,
  };
}

// ── 7. Run state (methods A–I evaluated in one pass) ────────────────────────────────────────

export interface MethodCal { healthyTests: number; healthyLe01: number; healthyLe05: number; byQuarter: Array<{ tests: number; le01: number }> }
function freshCal(): MethodCal { return { healthyTests: 0, healthyLe01: 0, healthyLe05: 0, byQuarter: [0, 1, 2, 3].map(() => ({ tests: 0, le01: 0 })) }; }
function tallyCal(c: MethodCal, p: number, healthy: boolean, quarter: number): void {
  if (!healthy) return;
  c.healthyTests++;
  if (p <= 0.01) c.healthyLe01++;
  if (p <= 0.05) c.healthyLe05++;
  const q = c.byQuarter[quarter]; q.tests++; if (p <= 0.01) q.le01++;
}

export interface StopRecord { day: number; family: Level | 'gpu'; selected: number[]; nTrue: number; nFalse: number; fdp: number }

export interface RunResult {
  cfg: SimConfig;
  // calibration (healthy-unit per-test behavior)
  calConformal: MethodCal;          // C/D per-exec conformal p
  calHistorical: MethodCal;         // B z→p
  calPassive: MethodCal;            // A z→p (daily)
  // e-process families
  stops: StopRecord[];              // gated e-BH stops per family
  stopsOptional: StopRecord[];      // optional-stopping variant (first-crossing per family)
  falsePages: number;               // healthy units crossing 1/alphaPage
  truePages: number;
  pagesTotalHealthyUnitWindows: number;
  // per-fault outcomes
  faultOutcomes: FaultOutcome[];
  // anchored global detector
  anchoredAlarms: Array<{ day: number; benign: boolean }>;
  anchoredDetectDay: number | null; // first alarm during an active fleet/common-mode fault
  // monitor / contract
  monitorRevokedDay: number | null;
  // costs
  gpuSecondsTotal: number; execCount: number; peakConcurrentGpus: number;
  revisitP50Hours: number; revisitP95Hours: number;
  // historical-B discoveries for delay comparison
  historicalDetectDay: Map<string, number>;
  passiveDetectDay: Map<string, number>;
  eprocDetectDay: Map<string, number>;     // stopped e-BH (family matching fault level or gpu)
  pageDetectDay: Map<string, number>;
  blocksSkippedSmallK: number;
  scoreChecksum: number;                   // reproducibility fingerprint (sum of exec scores)
  // union-over-horizon discovery quality (gpu family)
  gpuEverDegraded: number; gpuEverSelectedTrue: number; gpuEverSelectedFalse: number;
  /** ADR 0026 per-rack-λ power split (fleet-mean recall hides it): ever-degraded and
   *  true-selected gpu counts split by whether the unit's rack noise multiplier sits above the
   *  fleet median. Meaningful only when the scenario has heteroRackSd > 0 (else the split is an
   *  arbitrary halving). */
  lambdaSplit: { degHigh: number; selTrueHigh: number; degLow: number; selTrueLow: number };
  falseGroupsDistinct: Record<string, number>;   // distinct falsely-selected groups per family
}

export interface FaultOutcome {
  id: string; level: Level; severity: number; kind: FaultKind; onsetDay: number;
  nAffectedGpus: number;
  detectDayEbh: number | null;      // gated e-BH discovery covering scope
  detectFamily: string | null;
  detectDayPage: number | null;
  detectDayHistorical: number | null;
  detectDayPassive: number | null;
  localizedCorrectLevel: boolean;   // discovery family == fault level (gpu-count faults → 'gpu')
}

interface GroupState { prod: Float64Array; g: Float64Array; k: Float64Array; e: Float64Array; max: Float64Array; }

// standardized rank u in (0,1) for each exec within its block (used for group stats)
function standardizedRanks(scores: number[], rng: Rng): number[] {
  const idx = scores.map((_, i) => i).sort((a, b) => scores[a] - scores[b]);
  const u = new Array<number>(scores.length);
  for (let r = 0; r < idx.length; r++) u[idx[r]] = (r + rng.next()) / idx.length;
  return u;
}

// ── 8. The simulator ────────────────────────────────────────────────────────────────────────

// Simulation main loop: one stateful window sweep over ~30 interacting stages (scheduler, blocks,
// methods A–I, monitors, stops). A gate-compliant decomposition would thread a ~25-field context
// through ~20 top-level stage functions; deferred as an ADR 0023 follow-up — behavior is locked by
// test/canary-sim.test.ts (10) + the seeded scoreChecksum fingerprint.
export function runCanarySim(cfg: SimConfig): RunResult { // anchor:allow no-god-functions anchor:allow no-complex-functions
  const rng = new Rng(cfg.seed);
  // Dedicated stream for the group-rank second pass (rack-local): its tie-break draws must not
  // perturb the unit channel's stream (coarse runs consume nothing from it, so coarse streams
  // are byte-identical to pre-ADR-0026 runs).
  const rngGroup = new Rng(cfg.seed ^ 0x51ed2701);
  const st = initFleet(cfg, rng);
  const topo = st.topo;
  const s = cfg.scenario;
  // resolve gpu-level fault targets
  for (const f of cfg.faults) {
    if (f.level === 'gpu' && !f.gpuIds) {
      const ids = new Set<number>();
      while (ids.size < (f.count ?? 1)) ids.add(rng.int(topo.n));
      f.gpuIds = [...ids];
    }
  }

  const windows = Math.floor((cfg.days * 24) / cfg.windowHours);
  const secsPerWindow = cfg.windowHours * 3600;
  const budgetGpuSecondsPerWindow = cfg.budgetFrac * topo.n * secsPerWindow;
  const escFrac = cfg.adaptive?.enabled ? cfg.adaptive.escalationBudgetFrac : 0;

  // per-unit / per-group e-processes
  // e-process state per unit/group: prod (plain product), g/k (onset mixture);
  // reported e-value = combinedEValue(prod, g, k). e/max hold the CURRENT value + running max.
  const prodGpu = new Float64Array(topo.n).fill(1);
  const gGpu = new Float64Array(topo.n);
  const kGpu = new Float64Array(topo.n);
  const eGpu = new Float64Array(topo.n).fill(1);
  const eGpuMax = new Float64Array(topo.n).fill(1);
  const mkGroup = (n2: number): GroupState => ({
    prod: new Float64Array(n2).fill(1), g: new Float64Array(n2), k: new Float64Array(n2),
    e: new Float64Array(n2).fill(1), max: new Float64Array(n2).fill(1),
  });
  const groups: Record<string, GroupState> = {
    host: mkGroup(topo.nHosts), rack: mkGroup(topo.nRacks), leaf: mkGroup(topo.nLeaves),
    power: mkGroup(topo.nPowers), region: mkGroup(topo.nRegions),
  };
  const E_CAP = 1e30;

  // method B history per block key
  const hist = new Map<string, { n: number; mean: number; m2: number }>();
  const histAdd = (k: string, y: number) => {
    let h = hist.get(k); if (!h) { h = { n: 0, mean: 0, m2: 0 }; hist.set(k, h); }
    h.n++; const d = y - h.mean; h.mean += d / h.n; h.m2 += d * (y - h.mean);
  };
  // refresh variant: trailing buffer
  const histBuf = new Map<string, number[]>();

  // passive telemetry (method A): daily per-gpu metric, trailing 14d baseline
  const passiveHist: Float64Array[] = [];

  // anchored envelope (method I): per (pt,gen) qualification stats from days 0..5
  const qualStats = new Map<string, number[]>();
  const envelope = new Map<string, { med: number; mad: number }>();
  let envelopeSealed = false;
  const anchoredExceed = new Map<string, number>(); // consecutive exceedances per key

  // runtime assumption monitor (trimmed uniformity martingale over healthy-bulk conformal p's)
  let monitorLogE = 0, monitorMax = 0;
  let monitorRevokedDay: number | null = null;
  const ALPHA_MON = 0.01;

  // escalation state
  const escalated = new Set<number>();

  // group handicap: lagged epoch-based estimate of each group's persistent benign rank offset.
  // Uses ONLY epochs ≥ HANDICAP_LAG_EPOCHS old (a fresh fault does not contaminate its own
  // reference), exponentially decayed, and SHRUNK by n/(n+HANDICAP_SHRINK_N) — a noisy early
  // estimate must not inject a persistent pseudo-fault (the failure the un-shrunk qualification
  // handicap exhibited: ~12 false racks/run at 100k vs a Ville budget of 0.05). Cost: a real
  // fault older than ~2 epochs starts being absorbed (masking horizon ≈ 12–16 d — the group-level
  // analogue of ADR 0006). EMP-CAL adjustment by construction.
  const QUAL_DAYS = 5; // anchored-envelope qualification only
  const EPOCH_DAYS = 6, HANDICAP_LAG_EPOCHS = 2, HANDICAP_SHRINK_N = 12, HANDICAP_DECAY = 0.7;
  const GROUP_EVAL_HOURS = 24;
  const groupBuf: Record<'rack' | 'power' | 'region' | 'leaf', Map<number, number[]>> = {
    rack: new Map(), power: new Map(), region: new Map(), leaf: new Map(),
  };
  const epochStats = new Map<string, Map<number, { s: number; s2: number; n: number }>>();
  const pushHandicap = (hk: string, epoch: number, obs: number): void => {
    let m = epochStats.get(hk); if (!m) { m = new Map(); epochStats.set(hk, m); }
    const st = m.get(epoch) ?? { s: 0, s2: 0, n: 0 }; st.s += obs; st.s2 += obs * obs; st.n++; m.set(epoch, st);
  };
  /** lagged EW mean/sd of a group's daily rank stat (its own benign persistent position+dispersion). */
  const handicapFor = (hk: string, epoch: number): { mean: number; sd: number; neff: number } | null => {
    const m = epochStats.get(hk); if (!m) return null;
    let ws = 0, ws2 = 0, wn = 0;
    for (const [ep, st] of m) {
      if (ep > epoch - HANDICAP_LAG_EPOCHS) continue;
      const decay = Math.pow(HANDICAP_DECAY, epoch - HANDICAP_LAG_EPOCHS - ep);
      ws += decay * st.s; ws2 += decay * st.s2; wn += decay * st.n;
    }
    if (wn <= 0) return null;
    const mean = ws / wn;
    const varr = Math.max(ws2 / wn - mean * mean, 0);
    return { mean, sd: Math.sqrt(varr), neff: wn };
  };
  const HANDICAP_BURNIN_NEFF = 8, HANDICAP_SD_FLOOR = 0.02;

  // metrics
  const res: RunResult = {
    cfg, calConformal: freshCal(), calHistorical: freshCal(), calPassive: freshCal(),
    stops: [], stopsOptional: [], falsePages: 0, truePages: 0, pagesTotalHealthyUnitWindows: 0,
    faultOutcomes: [], anchoredAlarms: [], anchoredDetectDay: null, monitorRevokedDay: null,
    gpuSecondsTotal: 0, execCount: 0, peakConcurrentGpus: 0,
    revisitP50Hours: 0, revisitP95Hours: 0,
    historicalDetectDay: new Map(), passiveDetectDay: new Map(), eprocDetectDay: new Map(), pageDetectDay: new Map(),
    blocksSkippedSmallK: 0, scoreChecksum: 0,
    gpuEverDegraded: 0, gpuEverSelectedTrue: 0, gpuEverSelectedFalse: 0,
    lambdaSplit: { degHigh: 0, selTrueHigh: 0, degLow: 0, selTrueLow: 0 },
    falseGroupsDistinct: {},
  };
  const everSelTrue = new Uint8Array(topo.n), everSelFalse = new Uint8Array(topo.n), everDeg = new Uint8Array(topo.n);
  const falseGroupSel = new Map<string, Set<number>>();
  const lastProbed = new Float64Array(topo.n).fill(-1);
  const revisitSamples: number[] = [];
  const paged = new Uint8Array(topo.n);
  const optStopped: Record<string, boolean> = { gpu: false, host: false, rack: false, leaf: false, power: false, region: false };

  const gpuDegraded = (g: number, day: number): boolean => {
    for (const f of cfg.faults) {
      if (f.kind === 'dcgmOnly') continue;
      if (day < f.onsetDay) continue;
      if (f.durationDays !== undefined && day >= f.onsetDay + f.durationDays + 1) continue;
      if (inScopeAt(topo, f, g)) return true;
    }
    return false;
  };
  const groupDegraded = (level: Level, gi: number, day: number): boolean => {
    const of = level === 'host' ? topo.hostOf : level === 'rack' ? topo.rackOf : level === 'leaf' ? topo.leafOf : level === 'power' ? topo.powerOf : topo.regionOf;
    for (let g = 0; g < topo.n; g++) if (of[g] === gi && gpuDegraded(g, day)) return true;
    return false;
  };
  const anyRelativeVisibleFaultActive = (day: number): boolean =>
    cfg.faults.some(f => f.kind !== 'dcgmOnly' && f.level !== 'fleet' && day >= f.onsetDay && (f.durationDays === undefined || day < f.onsetDay + f.durationDays));
  const commonModeActive = (day: number): boolean =>
    (s.commonModeStepDay >= 0 && s.commonModeStepSize > 0 && day >= s.commonModeStepDay) ||
    cfg.faults.some(f => f.level === 'fleet' && day >= f.onsetDay && (f.durationDays === undefined || day < f.onsetDay + f.durationDays));

  const recordDetect = (m: Map<string, number>, day: number, isCovered: (f: FaultSpec) => boolean) => {
    for (const f of cfg.faults) {
      if (m.has(f.id) || day < f.onsetDay) continue;
      if (isCovered(f)) m.set(f.id, day);
    }
  };

  const version = () => (cfg.canaryVersionChangeDay !== undefined ? 'v2' : 'v1');

  // ── main loop over windows ──
  for (let w = 0; w < windows; w++) {
    const tHours = w * cfg.windowHours;
    const day = tHours / 24;
    const quarter = Math.min(3, Math.floor((4 * w) / windows));
    const ver = cfg.canaryVersionChangeDay !== undefined && day >= cfg.canaryVersionChangeDay ? 'v2' : 'v1';

    // rack OU update
    if (s.rackOuSd > 0) {
      const a = Math.exp(-cfg.windowHours / s.rackOuTauH);
      const innov = s.rackOuSd * Math.sqrt(1 - a * a);
      for (let r = 0; r < topo.nRacks; r++) st.rackOu[r] = a * st.rackOu[r] + innov * rng.norm();
    }

    // ── schedule execs for this window ──
    const execs: Exec[] = [];
    let gpuSecondsThisWindow = 0;
    const sentinelBudget = budgetGpuSecondsPerWindow * (1 - escFrac);
    const escBudget = budgetGpuSecondsPerWindow * escFrac;

    // sentinel sampling per probe type
    for (const pt of PROBE_TYPES) {
      const spec = PROBE_SPEC[pt];
      const nExec = Math.floor((sentinelBudget * spec.mix) / (spec.gpus * spec.secs));
      for (let i = 0; i < nExec; i++) {
        if (pt === 'xrack') {
          // pick two racks in same region
          const rA = rng.int(topo.nRacks);
          const region = Math.floor(rA / RACKS_PER_REGION);
          const regionRacks = Math.min(RACKS_PER_REGION, topo.nRacks - region * RACKS_PER_REGION);
          let rB = region * RACKS_PER_REGION + rng.int(regionRacks);
          if (rB === rA) rB = region * RACKS_PER_REGION + (rB + 1 - region * RACKS_PER_REGION) % regionRacks;
          const gA = rA * GPUS_PER_RACK + rng.int(GPUS_PER_RACK);
          const gB = rB * GPUS_PER_RACK + rng.int(GPUS_PER_RACK);
          const sA = execScore(cfg, st, gA, pt, tHours, rng), sB = execScore(cfg, st, gB, pt, tHours, rng);
          const y = (sA.y + sB.y) / 2;
          execs.push({ unit: gA, unitKind: 'path', pt, y, err: sA.err || sB.err, leafA: topo.leafOf[gA], leafB: topo.leafOf[gB], targeted: false, gpuSeconds: spec.gpus * spec.secs });
          gpuSecondsThisWindow += spec.gpus * spec.secs;
          continue;
        }
        // rack-cohort drafting (ADR 0026): under rack-local blocking, sentinels are drafted
        // minPeers+1 at a time from ONE random rack — randomized placement moves to
        // (rack uniform) × (units uniform-without-replacement within rack), which is exactly the
        // within-rack exchangeability the rack-local block key needs, and it makes rack blocks
        // reach the minPeers floor at sparse coverage. Cohort members consume this loop's
        // remaining exec budget. nvlink drafts HOST cohorts (18 hosts/rack ≥ minPeers+1) — the
        // per-host family otherwise keeps the coarse key and carries the same dispersion disease
        // one level up (measured: 1–6 false hosts/run leaked while gpu-family read 0).
        if (cfg.blocking === 'rack-local') {
          const r0 = rng.int(topo.nRacks);
          const perRack = pt === 'nvlink' ? HOSTS_PER_RACK : GPUS_PER_RACK;
          const cohortSize = Math.min(cfg.minPeers + 1, nExec - i, perRack);
          const drafted = new Set<number>();
          while (drafted.size < cohortSize) drafted.add(rng.int(perRack));
          for (const member of drafted) {
            if (rng.next() < s.missingRate) continue;
            const g = pt === 'nvlink'
              ? (r0 * HOSTS_PER_RACK + member) * GPUS_PER_HOST + rng.int(GPUS_PER_HOST)
              : r0 * GPUS_PER_RACK + member;
            const sc = execScore(cfg, st, g, pt, tHours, rng);
            const unit = pt === 'nvlink' ? topo.hostOf[g] : g;
            execs.push({ unit, unitKind: pt === 'nvlink' ? 'host' : 'gpu', pt, y: sc.y, err: sc.err, targeted: false, gpuSeconds: spec.gpus * spec.secs });
            gpuSecondsThisWindow += spec.gpus * spec.secs;
            if (pt !== 'nvlink') {
              if (lastProbed[g] >= 0) revisitSamples.push(tHours - lastProbed[g]);
              lastProbed[g] = tHours;
            }
          }
          i += cohortSize - 1;
          continue;
        }
        // unit draw (placement bias: sentinel placement ∝ exp(-bias·hostLoad))
        let g = rng.int(topo.n);
        if (s.placementBias > 0) {
          for (let tries = 0; tries < 4; tries++) {
            const cand = rng.int(topo.n);
            const load = hostLoad(st, cfg, topo.hostOf[cand], tHours, rng);
            if (rng.next() < Math.exp(-s.placementBias * load)) { g = cand; break; }
          }
        }
        if (s.schedulerChangeDay >= 0 && day >= s.schedulerChangeDay && s.placementBias === 0) {
          // scheduler-policy change: placement becomes rack-clustered (still health-independent)
          const r = rng.int(topo.nRacks);
          g = r * GPUS_PER_RACK + rng.int(GPUS_PER_RACK);
        }
        if (rng.next() < s.missingRate) continue; // exec produced no result
        const sc = execScore(cfg, st, g, pt, tHours, rng);
        const unit = pt === 'nvlink' ? topo.hostOf[g] : g;
        execs.push({ unit, unitKind: pt === 'nvlink' ? 'host' : 'gpu', pt, y: sc.y, err: sc.err, targeted: false, gpuSeconds: spec.gpus * spec.secs });
        gpuSecondsThisWindow += spec.gpus * spec.secs;
        if (pt !== 'nvlink') { if (lastProbed[g] >= 0) revisitSamples.push(tHours - lastProbed[g]); lastProbed[g] = tHours; }
      }
    }

    // escalation execs (adaptive): forced probe of each escalated unit + peer draft
    if (cfg.adaptive?.enabled && escalated.size > 0) {
      const spec = PROBE_SPEC.compute;
      let budget = escBudget;
      for (const g of escalated) {
        if (budget < spec.secs * 3) break;
        const sc = execScore(cfg, st, g, 'compute', tHours, rng);
        execs.push({ unit: g, unitKind: 'gpu', pt: 'compute', y: sc.y, err: sc.err, targeted: true, gpuSeconds: spec.secs });
        budget -= spec.secs; gpuSecondsThisWindow += spec.secs;
        // draft 2 peers per escalated unit
        for (let j = 0; j < 2 && budget >= spec.secs; j++) {
          let peer: number;
          if (cfg.adaptive.peerDraft === 'suspects' && escalated.size > 3 && rng.next() < 0.7) {
            const arr = [...escalated]; peer = arr[rng.int(arr.length)];
          } else if (cfg.blocking === 'rack-local') {
            // freshly-randomized draft WITHIN the escalated unit's rack — the rack-local
            // comparison set (still health-independent; suspects mode above stays the
            // deliberately-invalid E4 design)
            peer = topo.rackOf[g] * GPUS_PER_RACK + rng.int(GPUS_PER_RACK);
          } else {
            peer = rng.int(topo.n);
          }
          const ps = execScore(cfg, st, peer, 'compute', tHours, rng);
          execs.push({ unit: peer, unitKind: 'gpu', pt: 'compute', y: ps.y, err: ps.err, targeted: false, gpuSeconds: spec.secs });
          budget -= spec.secs; gpuSecondsThisWindow += spec.secs;
        }
      }
    }

    res.gpuSecondsTotal += gpuSecondsThisWindow;
    res.execCount += execs.length;
    for (const ex of execs) res.scoreChecksum += ex.y;
    res.peakConcurrentGpus = Math.max(res.peakConcurrentGpus, Math.ceil(gpuSecondsThisWindow / secsPerWindow));

    // ── block, rank, update methods ──
    // block key: coarse = pt|ver|gen ; mondrian adds fw|region
    const blocks = new Map<string, number[]>(); // key -> exec indices
    for (let i = 0; i < execs.length; i++) {
      const ex = execs[i];
      const g = ex.unitKind === 'host' ? ex.unit * GPUS_PER_HOST : ex.unit; // representative gpu for context
      const rack = topo.rackOf[Math.min(g, topo.n - 1)];
      const gen = topo.genOfRack[rack], fw = topo.fwOfRack[rack], region = topo.regionOf[Math.min(g, topo.n - 1)];
      const key = cfg.blocking === 'rack-local' && ex.unitKind !== 'path'
        ? `${ex.pt}|${ver}|r${rack}` // rack determines gen|fw; the shared rack λ cancels in-rank (ADR 0026)
        : cfg.blocking === 'mondrian'
          ? `${ex.pt}|${ver}|${gen}|${fw}|${region}`
          : `${ex.pt}|${ver}|${gen}`;
      let arr = blocks.get(key); if (!arr) { arr = []; blocks.set(key, arr); }
      arr.push(i);
    }

    const pOfExec = new Float64Array(execs.length).fill(NaN);
    const pErrOfExec = new Float64Array(execs.length).fill(NaN);
    const uOfExec = new Float64Array(execs.length).fill(NaN);
    // Group-family ranks (ADR 0026): under rack-local blocking the block ranks are WITHIN-rack,
    // which makes every rank's rack-mean 0.5 by construction — a rack-level fault would be
    // invisible to the rack/power/region group families too (measured: a 5% rack fault detected
    // d11.9 under coarse is undetected by ANY family under rack-local). So the group buffers are
    // fed from a SECOND, coarse-keyed ranking pass over the same gpu execs: the unit channel
    // stays rack-local (dispersion-immune), the group channel keeps its cross-rack contrast —
    // and, honestly, its group-level dispersion exposure, which its studentized-change lagged-sd
    // handicap owns (verified clean at 280 racks under heteroRackSd 1.0).
    const uGroupOfExec = new Float64Array(execs.length).fill(NaN);
    const monPs: number[] = [];

    for (const [key, idxs] of blocks) {
      if (idxs.length < cfg.minPeers) { res.blocksSkippedSmallK++; continue; }
      const ys = idxs.map(i => execs[i].y);
      const us = standardizedRanks(ys, rng);
      for (let j = 0; j < idxs.length; j++) {
        const i = idxs[j];
        const peers = ys.filter((_, k) => k !== j);
        const p = conformalP(ys[j], peers, rng.next());
        // correctness channel: exact randomized conformal p on the binary error indicator —
        // mine=1: gt=0, ties = #err peers ⇒ p = U·(1+errPeers)/(K+1); mine=0 analogously.
        {
          const errPeers = idxs.reduce((a, k, kk) => a + (kk !== j && execs[k].err ? 1 : 0), 0);
          const K1 = idxs.length; // peers + self
          pErrOfExec[i] = execs[i].err
            ? rng.next() * (1 + errPeers) / K1
            : (errPeers + rng.next() * (K1 - errPeers)) / K1;
        }
        pOfExec[i] = p; uOfExec[i] = us[j]; uGroupOfExec[i] = us[j];
        monPs.push(p);
        // calibration tally (healthy = unit not degraded now)
        const gRep = execs[i].unitKind === 'host' ? execs[i].unit * GPUS_PER_HOST : execs[i].unit;
        const healthy = execs[i].unitKind === 'path'
          ? true // path execs: calibration tracked only when no leaf fault touches either end
            && !cfg.faults.some(f => f.level === 'leaf' && day >= f.onsetDay && (execs[i].leafA === f.target || execs[i].leafB === f.target))
          : !gpuDegraded(Math.min(gRep, topo.n - 1), day);
        tallyCal(res.calConformal, p, healthy, quarter);

        // method B (historical)
        const h = cfg.refreshHistory ? undefined : hist.get(key);
        if (day < cfg.historyDays) { histAdd(key, execs[i].y); if (cfg.refreshHistory) { let b = histBuf.get(key); if (!b) { b = []; histBuf.set(key, b); } b.push(execs[i].y); } }
        else {
          let mean: number | undefined, sd: number | undefined;
          if (cfg.refreshHistory) {
            const b = histBuf.get(key);
            if (b && b.length > 30) { mean = b.reduce((a, v) => a + v, 0) / b.length; sd = Math.sqrt(b.reduce((a, v) => a + (v - mean!) ** 2, 0) / b.length); }
            const bb = histBuf.get(key) ?? []; bb.push(execs[i].y); if (bb.length > 2000) bb.shift(); histBuf.set(key, bb);
          } else if (h && h.n > 30) { mean = h.mean; sd = Math.sqrt(h.m2 / (h.n - 1)); }
          if (mean !== undefined && sd !== undefined && sd > 0) {
            const pB = normTailP((execs[i].y - mean) / sd);
            tallyCal(res.calHistorical, pB, healthy, quarter);
            if (pB <= 0.001 && !healthy) {
              recordDetect(res.historicalDetectDay, day, f => {
                const gg = Math.min(gRep, topo.n - 1);
                return f.level === 'gpu' ? (f.gpuIds ?? []).includes(gg) : f.level === 'fleet' ? true :
                  f.level === 'host' ? topo.hostOf[gg] === f.target : f.level === 'rack' ? topo.rackOf[gg] === f.target :
                  f.level === 'leaf' ? topo.leafOf[gg] === f.target : f.level === 'power' ? topo.powerOf[gg] === f.target : topo.regionOf[gg] === f.target;
              });
            }
          }
        }
      }
    }

    // ── group-rank second pass (rack-local only): coarse-keyed ranks for the group families ──
    if (cfg.blocking === 'rack-local') {
      const coarseBlocks = new Map<string, number[]>();
      for (let i = 0; i < execs.length; i++) {
        if (execs[i].unitKind !== 'gpu') continue;
        const g = execs[i].unit;
        const gen = topo.genOfRack[topo.rackOf[g]];
        const key = `${execs[i].pt}|${ver}|${gen}`;
        let arr = coarseBlocks.get(key); if (!arr) { arr = []; coarseBlocks.set(key, arr); }
        arr.push(i);
      }
      for (const idxs of coarseBlocks.values()) {
        if (idxs.length < cfg.minPeers) continue;
        const us = standardizedRanks(idxs.map(i => execs[i].y), rngGroup);
        for (let j = 0; j < idxs.length; j++) uGroupOfExec[idxs[j]] = us[j];
      }
    }

    // ── e-process updates ──
    // per-gpu: mean of calibrated increments across this window's gpu-attributed execs
    const gpuInc = new Map<number, { s: number; n: number }>();
    const hostInc = new Map<number, { s: number; n: number }>();
    for (let i = 0; i < execs.length; i++) {
      if (Number.isNaN(pOfExec[i])) continue;
      // perf + correctness channels: each marginally valid ⇒ their mean is a valid increment
      const f = 0.5 * (calibrator(pOfExec[i]) + calibrator(pErrOfExec[i]));
      if (execs[i].unitKind === 'gpu') {
        const a = gpuInc.get(execs[i].unit) ?? { s: 0, n: 0 }; a.s += f; a.n++; gpuInc.set(execs[i].unit, a);
      } else if (execs[i].unitKind === 'host') {
        const a = hostInc.get(execs[i].unit) ?? { s: 0, n: 0 }; a.s += f; a.n++; hostInc.set(execs[i].unit, a);
      }
    }
    for (const [g, a] of gpuInc) {
      const f = a.s / a.n;
      prodGpu[g] = Math.min(E_CAP, prodGpu[g] * f);
      gGpu[g] = Math.min(E_CAP, onsetUpdate(gGpu[g], kGpu[g], f));
      kGpu[g]++;
      eGpu[g] = combinedEValue(prodGpu[g], gGpu[g], kGpu[g]);
    }
    for (const [h, a] of hostInc) {
      const st2 = groups.host;
      const f = a.s / a.n;
      st2.prod[h] = Math.min(E_CAP, st2.prod[h] * f);
      st2.g[h] = Math.min(E_CAP, onsetUpdate(st2.g[h], st2.k[h], f));
      st2.k[h]++;
      st2.e[h] = combinedEValue(st2.prod[h], st2.g[h], st2.k[h]);
    }

    // group-level accumulation: member standardized ranks buffer across windows; the cross-group
    // conformal test runs once per GROUP_EVAL_HOURS (daily) so each group has enough executions
    // (at 0.05% budget a rack sees ~7 gpu-execs/day but <1 per 3h window).
    // groupHandicap (default): subtract each group's qualification-period mean rank offset before
    // testing. Persistent BENIGN group effects (H2/H8 rack offsets) otherwise accumulate into the
    // group e-process as false "relative fault" evidence. NOTE the honest cost: the handicap is an
    // ESTIMATED adjustment, so the adjusted group families are EMP-CAL, not exact-finite-sample
    // (the un-adjusted variant is exact for the null "group not relatively worse", which is not
    // the null operators want). SPEC § 8 item 5.
    const groupAccumulate = (level: 'rack' | 'power' | 'region') => {
      const of = level === 'rack' ? topo.rackOf : level === 'power' ? topo.powerOf : topo.regionOf;
      const buf = groupBuf[level];
      for (let i = 0; i < execs.length; i++) {
        if (Number.isNaN(uGroupOfExec[i]) || execs[i].unitKind !== 'gpu') continue;
        const gi = of[execs[i].unit];
        let arr = buf.get(gi); if (!arr) { arr = []; buf.set(gi, arr); }
        arr.push(uGroupOfExec[i]); // coarse-keyed rank under rack-local — cross-rack contrast preserved
      }
    };
    groupAccumulate('rack'); groupAccumulate('power'); groupAccumulate('region');
    for (let i = 0; i < execs.length; i++) {
      if (execs[i].unitKind !== 'path' || Number.isNaN(uOfExec[i])) continue;
      for (const lf of [execs[i].leafA!, execs[i].leafB!]) {
        let arr = groupBuf.leaf.get(lf); if (!arr) { arr = []; groupBuf.leaf.set(lf, arr); }
        arr.push(uOfExec[i]);
      }
    }

    const atGroupEval = ((tHours + cfg.windowHours) % GROUP_EVAL_HOURS) === 0;
    if (atGroupEval) {
      // Cross-group conformal on the STUDENTIZED CHANGE in each group's daily rank stat:
      //   stat_g = (obs_g − laggedEWmean_g) / max(laggedEWsd_g, floor)
      // Rationale (measured failures behind each piece):
      // - raw cross-group ranks are exchangeable per eval, but a persistently-offset group
      //   (H2 rack tilt) occupies the extreme rank EVERY day → serially dependent increments
      //   compound (E[f(p)|past] > 1) → ~4 false racks/run. Subtracting the group's own lagged
      //   mean removes persistent position.
      // - a persistently NOISIER group (H8) occupies extremes more often at equal mean →
      //   dividing by the group's own lagged sd removes persistent dispersion.
      // - the lag (≥2 epochs) keeps a fresh fault out of its own reference; the burn-in
      //   (neff ≥ 8 daily stats) keeps early estimation noise from minting pseudo-faults
      //   (the naive qualification handicap produced ~12 false racks/run at 100k).
      // Cost: group families are EMP-CAL (estimated reference), groups are untestable during
      // burn-in (~2 weeks), and faults older than ~2 epochs get progressively absorbed
      // (masking horizon ≈ 12–16 d — the group-level analogue of ADR 0006).
      const epoch = Math.floor(day / EPOCH_DAYS);
      for (const level of ['rack', 'power', 'region', 'leaf'] as const) {
        const buf = groupBuf[level];
        const minM = level === 'leaf' ? 2 : 3;
        const stats: Array<{ gi: number; z: number }> = [];
        for (const [gi, arr] of buf) {
          if (arr.length < minM) continue;
          const obs = arr.reduce((a, v) => a + v, 0) / arr.length;
          const hk = `${level}:${gi}`;
          const h = handicapFor(hk, epoch);
          pushHandicap(hk, epoch, obs);
          if (cfg.groupHandicap) {
            if (!h || h.neff < HANDICAP_BURNIN_NEFF) continue; // burn-in: not yet testable
            stats.push({ gi, z: (obs - h.mean) / Math.max(h.sd, HANDICAP_SD_FLOOR) });
          } else {
            stats.push({ gi, z: (obs - 0.5) * Math.sqrt(12 * arr.length) });
          }
        }
        buf.clear();
        if (stats.length < 8) continue; // need enough peer groups for a meaningful rank
        const st2 = groups[level];
        for (const g2 of stats) {
          const peersZ = stats.filter(s2 => s2.gi !== g2.gi).map(s2 => s2.z);
          const pG = conformalP(g2.z, peersZ, rng.next());
          const fG = calibrator(pG);
          st2.prod[g2.gi] = Math.min(E_CAP, st2.prod[g2.gi] * fG);
          st2.g[g2.gi] = Math.min(E_CAP, onsetUpdate(st2.g[g2.gi], st2.k[g2.gi], fG));
          st2.k[g2.gi]++;
          st2.e[g2.gi] = combinedEValue(st2.prod[g2.gi], st2.g[g2.gi], st2.k[g2.gi]);
        }
      }
    }

    // running-max e-processes (for the optional √E−1 SupFDR adjuster)
    for (let g = 0; g < topo.n; g++) if (eGpu[g] > eGpuMax[g]) eGpuMax[g] = eGpu[g];
    for (const fam of Object.values(groups)) for (let i = 0; i < fam.e.length; i++) if (fam.e[i] > fam.max[i]) fam.max[i] = fam.e[i];

    // ── runtime assumption monitor (trimmed two-sided uniformity martingale) ──
    if (monPs.length >= 20 && monitorRevokedDay === null) {
      const sorted = [...monPs].sort((a, b) => a - b);
      const lo = Math.floor(sorted.length * 0.02), hi = Math.ceil(sorted.length * 0.98);
      const trimmed = sorted.slice(lo, hi);
      let mean = 0;
      for (const p of trimmed) mean += 0.5 * (calibrator(p) + calibrator(1 - p));
      mean /= trimmed.length;
      monitorLogE += Math.log(Math.max(mean, 1e-12));
      monitorMax = Math.max(monitorMax, monitorLogE);
      if (monitorMax >= Math.log(1 / ALPHA_MON)) monitorRevokedDay = day;
    }

    // ── paging (per-unit anytime rule e ≥ 1/alphaPage) ──
    for (let g = 0; g < topo.n; g++) {
      const healthy = !gpuDegraded(g, day);
      if (healthy) res.pagesTotalHealthyUnitWindows++;
      if (!paged[g] && eGpu[g] >= 1 / cfg.alphaPage) {
        paged[g] = 1;
        if (healthy) res.falsePages++; else {
          res.truePages++;
          recordDetect(res.pageDetectDay, day, f =>
            f.level === 'gpu' ? (f.gpuIds ?? []).includes(g) :
            f.level === 'host' ? topo.hostOf[g] === f.target : f.level === 'rack' ? topo.rackOf[g] === f.target :
            f.level === 'power' ? topo.powerOf[g] === f.target : f.level === 'region' ? topo.regionOf[g] === f.target : false);
        }
      }
      if (paged[g] && eGpu[g] < 0.5 / cfg.alphaPage) paged[g] = 0; // re-arm after evidence decays
    }

    // ── adaptive escalation bookkeeping ──
    if (cfg.adaptive?.enabled) {
      for (let g = 0; g < topo.n; g++) {
        if (!escalated.has(g) && eGpu[g] >= cfg.adaptive.escalateAt) escalated.add(g);
        else if (escalated.has(g) && eGpu[g] < cfg.adaptive.deescalateBelow) escalated.delete(g);
      }
    }

    // ── anchored global detector (method I) ──
    {
      const byKey = new Map<string, number[]>();
      for (let i = 0; i < execs.length; i++) {
        if (execs[i].unitKind !== 'gpu') continue;
        const g = execs[i].unit; const gen = topo.genOfRack[topo.rackOf[g]];
        const key = `${execs[i].pt}|${ver}|${gen}`;
        let arr = byKey.get(key); if (!arr) { arr = []; byKey.set(key, arr); }
        arr.push(execs[i].y);
      }
      if (day < 5) {
        for (const [k, arr] of byKey) { let q = qualStats.get(k); if (!q) { q = []; qualStats.set(k, q); } for (const v of arr) q.push(v); }
      } else {
        if (!envelopeSealed) {
          for (const [k, arr] of qualStats) {
            const sorted2 = [...arr].sort((a, b) => a - b);
            const med = sorted2[Math.floor(sorted2.length / 2)];
            const devs = sorted2.map(v => Math.abs(v - med)).sort((a, b) => a - b);
            envelope.set(k, { med, mad: Math.max(devs[Math.floor(devs.length / 2)], 1e-6) });
          }
          envelopeSealed = true;
        }
        for (const [k, arr] of byKey) {
          const env = envelope.get(k); if (!env || arr.length < 10) continue;
          const sorted2 = [...arr].sort((a, b) => a - b);
          const med = sorted2[Math.floor(sorted2.length / 2)];
          const z = (med - env.med) / (1.4826 * env.mad / Math.sqrt(arr.length));
          const cnt = (anchoredExceed.get(k) ?? 0);
          if (Math.abs(z) > 6) anchoredExceed.set(k, cnt + 1); else anchoredExceed.set(k, 0);
          if (cnt + 1 >= 3 && Math.abs(z) > 6) {
            const isCm = commonModeActive(day);
            res.anchoredAlarms.push({ day, benign: !isCm });
            if (isCm && res.anchoredDetectDay === null) res.anchoredDetectDay = day;
            anchoredExceed.set(k, -50); // debounce this key
          }
        }
      }
    }

    // ── passive telemetry (method A) — daily grid ──
    if ((tHours % 24) === 0) {
      const daily = new Float64Array(topo.n);
      for (let g = 0; g < topo.n; g++) {
        const rack = topo.rackOf[g];
        let rel = st.rackStatic[rack] + st.rackOu[rack] + st.agingSlope[g] * day;
        if (s.globalDriftPerDay > 0 && day >= s.driftOnsetDay) rel += s.globalDriftPerDay * (day - s.driftOnsetDay);
        if (s.regimeStepDay >= 0 && day >= s.regimeStepDay) rel += s.regimeStepSize;
        // passive sees perf + dcgmOnly faults, not canaryOnly
        for (const f of cfg.faults) {
          if (f.kind === 'canaryOnly' || f.kind === 'correctness') continue;
          if (day < f.onsetDay) continue;
          if (f.durationDays !== undefined && day >= f.onsetDay + f.durationDays) continue;
          const inScope = f.level === 'fleet' ? true : f.level === 'gpu' ? (f.gpuIds ?? []).includes(g) :
            f.level === 'host' ? topo.hostOf[g] === f.target : f.level === 'rack' ? topo.rackOf[g] === f.target :
            f.level === 'leaf' ? false : f.level === 'power' ? topo.powerOf[g] === f.target : topo.regionOf[g] === f.target;
          if (inScope) rel += f.severity * (f.kind === 'dcgmOnly' ? 1 : 0.7); // passive sees an attenuated shadow of perf faults
        }
        daily[g] = 1 + rel + 0.004 * rng.norm();
      }
      passiveHist.push(daily);
      if (passiveHist.length > 15) passiveHist.shift();
      if (passiveHist.length === 15) {
        const ps: number[] = []; const healthyFlags: boolean[] = []; const gids: number[] = [];
        for (let g = 0; g < topo.n; g++) {
          let mean = 0; for (let d2 = 0; d2 < 14; d2++) mean += passiveHist[d2][g];
          mean /= 14;
          let sd = 0; for (let d2 = 0; d2 < 14; d2++) sd += (passiveHist[d2][g] - mean) ** 2;
          sd = Math.sqrt(sd / 13);
          if (sd <= 0) continue;
          const p = normTailP((passiveHist[14][g] - mean) / sd);
          ps.push(p); gids.push(g);
          const healthy = !gpuDegraded(g, day);
          healthyFlags.push(healthy);
          tallyCal(res.calPassive, p, healthy, quarter);
        }
        const sel = bhSelect(ps, cfg.q);
        for (const si of sel) {
          if (!healthyFlags[si]) {
            const g = gids[si];
            recordDetect(res.passiveDetectDay, day, f =>
              f.level === 'gpu' ? (f.gpuIds ?? []).includes(g) : f.level === 'fleet' ? true :
              f.level === 'host' ? topo.hostOf[g] === f.target : f.level === 'rack' ? topo.rackOf[g] === f.target :
              f.level === 'leaf' ? false : f.level === 'power' ? topo.powerOf[g] === f.target : topo.regionOf[g] === f.target);
          }
        }
      }
    }

    // ── stopped e-BH per family (gated through the emitter contract) ──
    const atStop = ((tHours + cfg.windowHours) % cfg.stopEveryHours) === 0;
    if (atStop && day >= 1) {
      const monitorPassing = monitorRevokedDay === null;
      const contract = canaryEmitter(monitorPassing);
      // ADR 0025: e-BH inputs are proof-carrying. The adjusted branch records its real derivation —
      // √E−1 applied to the running max of the ½/½ accumulator — rather than an anonymous number.
      // `supAdjuster(v) = v > 1 ? √v − 1 : 0` is identical to the previous `max(√v − 1, 0)` for
      // v ≥ 0, so no published figure moves.
      const adj = (e: Float64Array, m: Float64Array): EValue[] =>
        cfg.supFdrAdjust
          ? Array.from(m, (v) => eSupAdjusted(eFromOnsetAccumulator(v)))
          : Array.from(e, (v) => eFromOnsetAccumulator(v));
      const families: Array<{ name: Level | 'gpu'; e: EValue[]; degraded: (i: number) => boolean }> = [
        { name: 'gpu', e: adj(eGpu, eGpuMax), degraded: i => gpuDegraded(i, day) },
        { name: 'host', e: adj(groups.host.e, groups.host.max), degraded: i => groupDegraded('host', i, day) },
        { name: 'rack', e: adj(groups.rack.e, groups.rack.max), degraded: i => groupDegraded('rack', i, day) },
        { name: 'leaf', e: adj(groups.leaf.e, groups.leaf.max), degraded: i => groupDegraded('leaf', i, day) },
        { name: 'power', e: adj(groups.power.e, groups.power.max), degraded: i => groupDegraded('power', i, day) },
        { name: 'region', e: adj(groups.region.e, groups.region.max), degraded: i => groupDegraded('region', i, day) },
      ];
      for (const fam of families) {
        if (!monitorPassing) break; // Mode A: abstain — no FDR-bearing discoveries
        const arr = fam.e;
        const { selected } = certifiedFdrBenjaminiHochberg(arr, cfg.q, contract, `canary-sim/${fam.name}`);
        if (selected.length === 0) continue;
        let nTrue = 0, nFalse = 0;
        for (const i of selected) {
          const deg = fam.degraded(i);
          if (deg) nTrue++; else nFalse++;
          if (fam.name === 'gpu') { if (deg) everSelTrue[i] = 1; else everSelFalse[i] = 1; }
          else if (!deg) {
            let set = falseGroupSel.get(fam.name); if (!set) { set = new Set(); falseGroupSel.set(fam.name, set); }
            set.add(i);
          }
        }
        res.stops.push({ day, family: fam.name, selected: [...selected], nTrue, nFalse, fdp: nFalse / selected.length });
        // fault detection bookkeeping
        recordDetect(res.eprocDetectDay, day, f => {
          if (fam.name === 'gpu') {
            return selected.some(g2 => f.level === 'gpu' ? (f.gpuIds ?? []).includes(g2) :
              f.level === 'host' ? topo.hostOf[g2] === f.target : f.level === 'rack' ? topo.rackOf[g2] === f.target :
              f.level === 'power' ? topo.powerOf[g2] === f.target : f.level === 'region' ? topo.regionOf[g2] === f.target : false);
          }
          if (fam.name === f.level) return selected.includes(f.target);
          return false;
        });
        // optional-stopping variant: first window where this family selects anything
        if (!optStopped[fam.name]) {
          optStopped[fam.name] = true;
          res.stopsOptional.push({ day, family: fam.name, selected: [...selected], nTrue, nFalse, fdp: nFalse / selected.length });
        }
      }
    }
  }

  // ── final bookkeeping ──
  for (const f of cfg.faults) {
    if (f.kind === 'dcgmOnly') continue;
    for (let g = 0; g < topo.n; g++) {
      const inScope = f.level === 'fleet' ? true : f.level === 'gpu' ? (f.gpuIds ?? []).includes(g) :
        f.level === 'host' ? topo.hostOf[g] === f.target : f.level === 'rack' ? topo.rackOf[g] === f.target :
        f.level === 'leaf' ? topo.leafOf[g] === f.target : f.level === 'power' ? topo.powerOf[g] === f.target :
        topo.regionOf[g] === f.target;
      if (inScope) everDeg[g] = 1;
    }
  }
  const lambdaMedian = [...st.rackNoiseMult].sort((a, b) => a - b)[Math.floor(topo.nRacks / 2)];
  for (let g = 0; g < topo.n; g++) {
    res.gpuEverDegraded += everDeg[g];
    res.gpuEverSelectedTrue += everSelTrue[g];
    res.gpuEverSelectedFalse += everSelFalse[g];
    const high = st.rackNoiseMult[topo.rackOf[g]] > lambdaMedian;
    if (everDeg[g]) { if (high) res.lambdaSplit.degHigh++; else res.lambdaSplit.degLow++; }
    if (everSelTrue[g]) { if (high) res.lambdaSplit.selTrueHigh++; else res.lambdaSplit.selTrueLow++; }
  }
  res.monitorRevokedDay = monitorRevokedDay;
  for (const [famName, set] of falseGroupSel) res.falseGroupsDistinct[famName] = set.size;
  revisitSamples.sort((a, b) => a - b);
  res.revisitP50Hours = revisitSamples.length ? revisitSamples[Math.floor(revisitSamples.length * 0.5)] : NaN;
  res.revisitP95Hours = revisitSamples.length ? revisitSamples[Math.floor(revisitSamples.length * 0.95)] : NaN;

  for (const f of cfg.faults) {
    const nAffected = f.level === 'fleet' ? topo.n : f.level === 'gpu' ? (f.gpuIds ?? []).length :
      f.level === 'host' ? GPUS_PER_HOST : f.level === 'rack' ? GPUS_PER_RACK :
      f.level === 'leaf' ? GPUS_PER_RACK * RACKS_PER_LEAF : f.level === 'power' ? GPUS_PER_RACK * RACKS_PER_POWER :
      GPUS_PER_RACK * RACKS_PER_REGION;
    const ebh = res.eprocDetectDay.get(f.id) ?? null;
    const famStop = res.stops.find(s2 => s2.day === ebh && (s2.family === f.level || (f.level === 'gpu' && s2.family === 'gpu')));
    res.faultOutcomes.push({
      id: f.id, level: f.level, severity: f.severity, kind: f.kind, onsetDay: f.onsetDay,
      nAffectedGpus: Math.min(nAffected, topo.n),
      detectDayEbh: ebh, detectFamily: famStop ? String(famStop.family) : ebh !== null ? 'gpu' : null,
      detectDayPage: res.pageDetectDay.get(f.id) ?? null,
      detectDayHistorical: res.historicalDetectDay.get(f.id) ?? null,
      detectDayPassive: res.passiveDetectDay.get(f.id) ?? null,
      localizedCorrectLevel: famStop !== undefined && famStop.family === (f.level === 'fleet' ? 'region' : f.level),
    });
  }
  return res;
}

// ── 9. Convenience ──────────────────────────────────────────────────────────────────────────

export function defaultConfig(over: Partial<SimConfig> & { seed: number }): SimConfig {
  return {
    nGpus: 10368, days: 60, windowHours: 3, budgetFrac: 0.0005,
    scenario: HEALTHY_SCENARIOS.H1, faults: [], q: 0.05, alphaPage: 0.001,
    stopEveryHours: 24, blocking: 'coarse', historyDays: 14, refreshHistory: false, minPeers: 8, groupHandicap: true, supFdrAdjust: false,
    ...over,
  };
}

if (require.main === module) {
  const t0 = process.hrtime.bigint();
  const cfg = defaultConfig({ seed: 7, nGpus: 2 * GPUS_PER_RACK * RACKS_PER_LEAF * 2, days: 20, scenario: HEALTHY_SCENARIOS.H2 });
  process.env.CS_ALLOW_SHORT === '1' || cfg.days >= 56 || console.error('note: demo run < 56d — plumbing only, not a finding');
  const r = runCanarySim(cfg);
  const ms = Number(process.hrtime.bigint() - t0) / 1e6;
  console.log(`demo: ${r.execCount} execs, gpu-hours ${(r.gpuSecondsTotal / 3600).toFixed(0)}, ` +
    `healthy p≤.01 rate ${(r.calConformal.healthyLe01 / Math.max(1, r.calConformal.healthyTests)).toFixed(4)}, ` +
    `stops ${r.stops.length}, falsePages ${r.falsePages}, ${ms.toFixed(0)} ms`);
}
