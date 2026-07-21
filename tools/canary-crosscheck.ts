/**
 * canary-crosscheck — re-test the ADR 0023 canary statistical ladder on CLUSTERSYNTH telemetry
 * instead of canary-sim's hand-rolled score model (report section 10 threat: power numbers depend
 * on score-distribution assumptions; clustersynth's generative model is the calibrated one).
 *
 * A "probe execution" is emulated as a randomized contemporaneous SAMPLE of a shard's counter
 * values at a tick: per tick, `probesPerHour` shards are drawn at random; each probed shard's
 * per-counter value is conformal-ranked among the tick's probed peers; increments feed the same
 * calibrator -> e-process -> gated e-BH ladder as canary-sim. NOTE this is the CONSERVATIVE
 * stress: scores carry the full resident-workload factor variance with heterogeneous loadings (a
 * real controlled probe displaces the resident job) — the canary construction gets none of its
 * controlled-workload advantage here.
 *
 *   node tools/canary-crosscheck.js <bundleDir> [--seed N] [--probes N] [--q 0.05] [--out FILE]
 *
 * Bundle generation (documented, not automated here — clustersynth checked out as a sibling):
 *   CS_COUNTERS="power_w,sm_util" [CS_FAULT_MAG="2:2"] \
 *     ../clustersynth/node_modules/.bin/tsx ../clustersynth/src/cli.ts scenario cfg.json --out-dir DIR
 * with cfg = { family:"gb200", pods:4, racksPerPod:8, seed,
 *   window:{steps:1440, dt_s:3600}, nonstationarity:["thermal","diurnal","weekly","regime"],
 *   faults:false | {rate:0.02, sharedFaults:0, levels:["gpu"], types:["mean_shift"]} }
 */

import * as fs from 'node:fs';
import { loadScenarioBundle, ScenarioBundle } from './clustersynth-scenario';
import { Rng, calibrator, conformalP, canaryEmitter, onsetUpdate, combinedEValue } from './canary-sim';
import { fdrBenjaminiHochberg } from './emitter-contract';

/** series map key separator used by loadScenarioBundle (NUL) */
const SEP = String.fromCharCode(0);

export interface CrossCfg {
  seed: number;
  probesPerHour: number;
  q: number;
  alphaPage: number;
  minPeers: number;
  stopEveryTicks: number;
  /** Emulate the CONTROLLED-WORKLOAD property: studentize each probe against the shard's own
   *  lagged reference before cross-sectional ranking. Raw passive counters have between-shard
   *  (resident-job) spread far above the within-shard fault scale, so raw cross-sectional ranks
   *  are power-less against idiosyncratic faults AND compound on persistent outlier shards
   *  (measured: recall 0.000 at 4 sigma; 2-5 false shards/run). A real canary removes that
   *  spread PHYSICALLY (same versioned workload on every unit); this estimated reference is the
   *  passive-data stand-in for that physical property, with the burn-in/lag/masking costs of an
   *  estimate (which a real probe does not pay). */
  unitHandicap: boolean;
}

export const DEFAULT_CROSS: CrossCfg = { seed: 1, probesPerHour: 48, q: 0.05, alphaPage: 0.001, minPeers: 8, stopEveryTicks: 24, unitHandicap: false };

/** epoch-bucketed lagged EW reference (mean/sd) per key — the same lag/burn-in discipline as
 *  GroupFamily, reused for per-(shard,counter) references in unitHandicap mode. */
export class EpochRef {
  static readonly EPOCH_TICKS = 6 * 24; static readonly LAG = 2; static readonly DECAY = 0.7;
  private readonly epochs = new Map<string, Map<number, { s: number; s2: number; n: number }>>();
  push(key: string, tick: number, v: number): void {
    const ep = Math.floor(tick / EpochRef.EPOCH_TICKS);
    let m = this.epochs.get(key); if (!m) { m = new Map(); this.epochs.set(key, m); }
    const st = m.get(ep) ?? { s: 0, s2: 0, n: 0 };
    st.s += v; st.s2 += v * v; st.n++; m.set(ep, st);
  }
  ref(key: string, tick: number): { mean: number; sd: number; neff: number } | null {
    const epoch = Math.floor(tick / EpochRef.EPOCH_TICKS);
    const m = this.epochs.get(key);
    if (!m) return null;
    let ws = 0, ws2 = 0, wn = 0;
    for (const [ep, st] of m) {
      if (ep > epoch - EpochRef.LAG) continue;
      const decay = Math.pow(EpochRef.DECAY, epoch - EpochRef.LAG - ep);
      ws += decay * st.s; ws2 += decay * st.s2; wn += decay * st.n;
    }
    if (wn <= 0) return null;
    const mean = ws / wn;
    return { mean, sd: Math.sqrt(Math.max(ws2 / wn - mean * mean, 0)), neff: wn };
  }
}

/** structural subset of a clustersynth fault label used here */
export interface CrossFault { level: string; type: string; t_onset: number; t_offset: number; affected_shards: string[]; counter?: string | null }

/** cluster-0-pod-3-rack-5-tray-2-gpu-1 -> cluster-0-pod-3-rack-5 (generator-owned id scheme) */
export function rackKey(id: string): string {
  const i = id.indexOf('-rack-');
  if (i < 0) return id;
  let j = i + 6;
  while (j < id.length && id[j] !== '-') j++;
  return id.slice(0, j);
}

/** shard -> its fault labels (for truth lookups) */
export function faultsByShard(faults: readonly CrossFault[]): Map<string, CrossFault[]> {
  const m = new Map<string, CrossFault[]>();
  for (const f of faults) {
    for (const s of f.affected_shards) {
      const a = m.get(s) ?? []; a.push(f); m.set(s, a);
    }
  }
  return m;
}

/** is the shard inside any active fault window at `tick` (with `grace` ticks of hangover)? */
export function shardFaultedAt(byShard: Map<string, CrossFault[]>, shard: string, tick: number, grace = 0): boolean {
  const fl = byShard.get(shard);
  if (!fl) return false;
  return fl.some(f => tick >= f.t_onset && tick < f.t_offset + grace);
}

/** The ADR 0023 group construction (studentized change vs the group's own lagged EW reference,
 *  cross-group conformal rank, calibrator e-process). Mirrors canary-sim's in-loop version;
 *  kept standalone so it is reusable and unit-testable without the fleet simulator. */
export class GroupFamily {
  static readonly EPOCH_DAYS = 6; static readonly LAG = 2; static readonly DECAY = 0.7;
  static readonly BURNIN_NEFF = 8; static readonly SD_FLOOR = 0.02; static readonly MIN_M = 3; static readonly MIN_GROUPS = 8;
  /** current combined (½ product + ½ onset-mixture) e-value per group */
  readonly e = new Map<string, number>();
  private readonly mix = new Map<string, { prod: number; g: number; k: number }>();
  private readonly buf = new Map<string, number[]>();
  private readonly epochs = new Map<string, Map<number, { s: number; s2: number; n: number }>>();

  accumulate(group: string, u: number): void {
    const a = this.buf.get(group) ?? []; a.push(u); this.buf.set(group, a);
  }

  private reference(group: string, epoch: number): { mean: number; sd: number; neff: number } | null {
    const m = this.epochs.get(group);
    if (!m) return null;
    let ws = 0, ws2 = 0, wn = 0;
    for (const [ep, st] of m) {
      if (ep > epoch - GroupFamily.LAG) continue;
      const decay = Math.pow(GroupFamily.DECAY, epoch - GroupFamily.LAG - ep);
      ws += decay * st.s; ws2 += decay * st.s2; wn += decay * st.n;
    }
    if (wn <= 0) return null;
    const mean = ws / wn;
    return { mean, sd: Math.sqrt(Math.max(ws2 / wn - mean * mean, 0)), neff: wn };
  }

  private push(group: string, epoch: number, obs: number): void {
    let m = this.epochs.get(group); if (!m) { m = new Map(); this.epochs.set(group, m); }
    const st = m.get(epoch) ?? { s: 0, s2: 0, n: 0 };
    st.s += obs; st.s2 += obs * obs; st.n++; m.set(epoch, st);
  }

  /** run the daily cross-group test over accumulated ranks; applies e-process increments */
  evalDaily(day: number, rng: Rng): void {
    const epoch = Math.floor(day / GroupFamily.EPOCH_DAYS);
    const stats: Array<{ g: string; z: number }> = [];
    for (const [g, arr] of this.buf) {
      if (arr.length < GroupFamily.MIN_M) continue;
      const obs = arr.reduce((a, v) => a + v, 0) / arr.length;
      const ref = this.reference(g, epoch);
      this.push(g, epoch, obs);
      if (!ref || ref.neff < GroupFamily.BURNIN_NEFF) continue;
      stats.push({ g, z: (obs - ref.mean) / Math.max(ref.sd, GroupFamily.SD_FLOOR) });
    }
    this.buf.clear();
    if (stats.length < GroupFamily.MIN_GROUPS) return;
    for (const s of stats) {
      const peers = stats.filter(o => o.g !== s.g).map(o => o.z);
      const p = conformalP(s.z, peers, rng.next());
      const m = this.mix.get(s.g) ?? { prod: 1, g: 0, k: 0 };
      const f = calibrator(p);
      m.prod = Math.min(1e30, m.prod * f);
      m.g = Math.min(1e30, onsetUpdate(m.g, m.k, f));
      m.k++;
      this.mix.set(s.g, m);
      this.e.set(s.g, combinedEValue(m.prod, m.g, m.k));
    }
  }
}

export interface CrossStop { day: number; family: 'shard' | 'rack'; nSel: number; nTrue: number; fdp: number }

export interface CrossResult {
  dir: string; cfg: CrossCfg; nShards: number; days: number;
  probesPerShardPerDay: number;
  healthyTests: number; healthyLe01: number; healthyLe01Q4: number; healthyTestsQ4: number;
  falsePages: number; monitorRevokedDay: number | null;
  stops: CrossStop[];
  distinctFalseShards: number; distinctFalseRacks: number;
  faultDetects: Array<{ level: string; type: string; visible: boolean; onsetDay: number; magShards: number; detectDay: number | null; via: string | null }>;
  /** recall over gpu mean_shift faults VISIBLE in the loaded counter set (a fault targeting an
   *  unloaded counter produces no signal in this bundle and is excluded, not counted as a miss) */
  recallMeanShiftGpu: number | null;
}

/** raw or unit-handicapped probe scores for one counter; null score = shard not yet testable */
function probeScores(
  b: ScenarioBundle, c: string, probed: number[], t: number, cfg: CrossCfg, unitRef: EpochRef | null,
): Array<number | null> {
  return probed.map(i => {
    const x = b.series.get(b.shardIds[i] + SEP + c)![t];
    if (!cfg.unitHandicap) return x;
    const key = b.shardIds[i] + SEP + c;
    const r = unitRef!.ref(key, t);
    unitRef!.push(key, t, x);
    if (!r || r.neff < 8) return null; // burn-in: not yet testable
    return (x - r.mean) / Math.max(r.sd, 1e-9);
  });
}

/** one tick: draw probes, rank per counter among testable peers, return increments + rank u's */
function probeTick(
  b: ScenarioBundle, counters: string[], probed: number[], t: number, rng: Rng, cfg: CrossCfg, unitRef: EpochRef | null,
): { inc: Map<number, number>; us: Array<{ shard: number; u: number }>; ps: number[]; psShard: number[] } {
  const incSum = new Map<number, { s: number; n: number }>();
  const us: Array<{ shard: number; u: number }> = [];
  const ps: number[] = [];
  const psShard: number[] = [];
  for (const c of counters) {
    const scored = probeScores(b, c, probed, t, cfg, unitRef);
    const idx = probed.map((_s, j) => j).filter(j => scored[j] !== null);
    if (idx.length < cfg.minPeers) continue;
    const vals = idx.map(j => scored[j] as number);
    const order = vals.map((_v, i) => i).sort((a, z) => vals[a] - vals[z]);
    const rankOf = new Array<number>(vals.length);
    for (let r = 0; r < order.length; r++) rankOf[order[r]] = r;
    for (let k = 0; k < idx.length; k++) {
      const peers = vals.filter((_, m) => m !== k);
      const p = conformalP(vals[k], peers, rng.next());
      ps.push(p); psShard.push(probed[idx[k]]);
      const a = incSum.get(probed[idx[k]]) ?? { s: 0, n: 0 };
      a.s += calibrator(p); a.n++; incSum.set(probed[idx[k]], a);
      us.push({ shard: probed[idx[k]], u: (rankOf[k] + rng.next()) / vals.length });
    }
  }
  const inc = new Map<number, number>();
  for (const [i, a] of incSum) inc.set(i, a.s / a.n); // mean over the counters actually tested
  return { inc, us, ps, psShard };
}

/** trimmed two-sided uniformity increment for the runtime assumption monitor */
function monitorIncrement(ps: number[]): number {
  const sorted = [...ps].sort((a, z) => a - z);
  const lo = Math.floor(sorted.length * 0.02), hi = Math.ceil(sorted.length * 0.98);
  let mean = 0;
  const trimmed = sorted.slice(lo, hi);
  for (const p of trimmed) mean += 0.5 * (calibrator(p) + calibrator(1 - p));
  return Math.log(Math.max(mean / trimmed.length, 1e-12));
}

export function runCrosscheckOnBundle(b: ScenarioBundle, cfg: CrossCfg, dir = '(in-memory)'): CrossResult {
  const rng = new Rng(cfg.seed);
  const counters = b.counters.map(c => c.name).filter(c => b.series.has(b.shardIds[0] + SEP + c));
  const n = b.shardIds.length;
  const byShard = faultsByShard(b.faults as unknown as CrossFault[]);
  const rackOfIdx = b.shardIds.map(rackKey);
  const e = new Float64Array(n).fill(1);
  const prodMix = new Float64Array(n).fill(1);
  const gMix = new Float64Array(n);
  const kMix = new Float64Array(n);
  const rack = new GroupFamily();
  const paged = new Uint8Array(n);
  const everSelShard = new Set<number>(); const everSelFalseShard = new Set<number>();
  const everSelFalseRack = new Set<string>();
  const res: CrossResult = {
    dir, cfg, nShards: n, days: (b.T * b.dt_s) / 86400,
    probesPerShardPerDay: (cfg.probesPerHour * 24 * b.dt_s) / 3600 / n,
    healthyTests: 0, healthyLe01: 0, healthyLe01Q4: 0, healthyTestsQ4: 0,
    falsePages: 0, monitorRevokedDay: null, stops: [],
    distinctFalseShards: 0, distinctFalseRacks: 0, faultDetects: [], recallMeanShiftGpu: null,
  };
  let monLog = 0, monMax = 0;
  const detectDay = new Map<CrossFault, { day: number; via: string }>();

  const unitRef = cfg.unitHandicap ? new EpochRef() : null;
  for (let t = 0; t < b.T; t++) {
    const day = (t * b.dt_s) / 86400;
    const probed = drawDistinct(rng, n, Math.min(cfg.probesPerHour, n));
    if (probed.length < cfg.minPeers) continue;
    const { inc, us, ps, psShard } = probeTick(b, counters, probed, t, rng, cfg, unitRef);
    for (const [i, f] of inc) {
      prodMix[i] = Math.min(1e30, prodMix[i] * f);
      gMix[i] = Math.min(1e30, onsetUpdate(gMix[i], kMix[i], f));
      kMix[i]++;
      e[i] = combinedEValue(prodMix[i], gMix[i], kMix[i]);
    }
    for (const { shard, u } of us) rack.accumulate(rackOfIdx[shard], u);
    tallyHealthy(res, b, byShard, ps, psShard, t);
    if (res.monitorRevokedDay === null && ps.length >= 20) {
      monLog += monitorIncrement(ps); monMax = Math.max(monMax, monLog);
      if (monMax >= Math.log(100)) res.monitorRevokedDay = day;
    }
    pageSweep(res, b, byShard, e, paged, cfg, t, detectDay);
    if ((t + 1) % cfg.stopEveryTicks === 0) {
      rack.evalDaily(day, rng);
      stopEval(res, b, byShard, rackOfIdx, e, rack, cfg, t, day, detectDay, everSelShard, everSelFalseShard, everSelFalseRack);
    }
  }
  finishResult(res, b, counters, detectDay, everSelShard, everSelFalseShard, everSelFalseRack);
  return res;
}

function drawDistinct(rng: Rng, n: number, k: number): number[] {
  const set = new Set<number>();
  while (set.size < k) set.add(rng.int(n));
  return [...set];
}

function tallyHealthy(res: CrossResult, b: ScenarioBundle, byShard: Map<string, CrossFault[]>, ps: number[], psShard: number[], t: number): void {
  const q4 = t >= (3 * b.T) / 4;
  for (let j = 0; j < ps.length; j++) {
    if (shardFaultedAt(byShard, b.shardIds[psShard[j]], t)) continue;
    res.healthyTests++;
    if (ps[j] <= 0.01) res.healthyLe01++;
    if (q4) { res.healthyTestsQ4++; if (ps[j] <= 0.01) res.healthyLe01Q4++; }
  }
}

function pageSweep(res: CrossResult, b: ScenarioBundle, byShard: Map<string, CrossFault[]>, e: Float64Array, paged: Uint8Array, cfg: CrossCfg, t: number, detectDay: Map<CrossFault, { day: number; via: string }>): void {
  for (let i = 0; i < e.length; i++) {
    if (!paged[i] && e[i] >= 1 / cfg.alphaPage) {
      paged[i] = 1;
      const faulted = shardFaultedAt(byShard, b.shardIds[i], t, cfg.stopEveryTicks);
      if (!faulted) res.falsePages++;
      else recordFaultDetect(byShard, b.shardIds[i], t, (t * b.dt_s) / 86400, 'page', detectDay);
    }
    if (paged[i] && e[i] < 0.5 / cfg.alphaPage) paged[i] = 0;
  }
}

function recordFaultDetect(byShard: Map<string, CrossFault[]>, shard: string, t: number, day: number, via: string, detectDay: Map<CrossFault, { day: number; via: string }>): void {
  for (const f of byShard.get(shard) ?? []) {
    if (t >= f.t_onset && !detectDay.has(f)) detectDay.set(f, { day, via });
  }
}

function stopEval(
  res: CrossResult, b: ScenarioBundle, byShard: Map<string, CrossFault[]>, rackOfIdx: string[],
  e: Float64Array, rack: GroupFamily, cfg: CrossCfg, t: number, day: number,
  detectDay: Map<CrossFault, { day: number; via: string }>,
  everSelShard: Set<number>, everSelFalseShard: Set<number>, everSelFalseRack: Set<string>,
): void {
  if (res.monitorRevokedDay !== null) return; // Mode A: abstain — no FDR-bearing discoveries
  const contract = canaryEmitter(true);
  const { selected } = fdrBenjaminiHochberg(Array.from(e), cfg.q, contract, 'canary-crosscheck/shard');
  if (selected.length > 0) {
    let nTrue = 0;
    for (const i of selected) {
      everSelShard.add(i);
      const truth = shardFaultedAt(byShard, b.shardIds[i], t, cfg.stopEveryTicks);
      if (truth) { nTrue++; recordFaultDetect(byShard, b.shardIds[i], t, day, 'ebh-shard', detectDay); }
      else everSelFalseShard.add(i);
    }
    res.stops.push({ day, family: 'shard', nSel: selected.length, nTrue, fdp: (selected.length - nTrue) / selected.length });
  }
  const rackIds = [...rack.e.keys()];
  if (rackIds.length === 0) return;
  const { selected: selR } = fdrBenjaminiHochberg(rackIds.map(r => rack.e.get(r)!), cfg.q, contract, 'canary-crosscheck/rack');
  if (selR.length === 0) return;
  let nTrueR = 0;
  for (const ri of selR) {
    const rid = rackIds[ri];
    const members = b.shardIds.filter((_, i) => rackOfIdx[i] === rid);
    const truth = members.some(s => shardFaultedAt(byShard, s, t, cfg.stopEveryTicks));
    if (truth) { nTrueR++; for (const s of members) recordFaultDetect(byShard, s, t, day, 'ebh-rack', detectDay); }
    else everSelFalseRack.add(rid);
  }
  res.stops.push({ day, family: 'rack', nSel: selR.length, nTrue: nTrueR, fdp: (selR.length - nTrueR) / selR.length });
}

function finishResult(res: CrossResult, b: ScenarioBundle, counters: string[], detectDay: Map<CrossFault, { day: number; via: string }>, everSelShard: Set<number>, everSelFalseShard: Set<number>, everSelFalseRack: Set<string>): void {
  res.distinctFalseShards = everSelFalseShard.size;
  res.distinctFalseRacks = everSelFalseRack.size;
  let msTotal = 0, msDetected = 0;
  for (const f of b.faults as unknown as CrossFault[]) {
    const visible = f.counter == null || counters.includes(f.counter);
    const d = detectDay.get(f) ?? null;
    res.faultDetects.push({
      level: f.level, type: f.type, visible, onsetDay: (f.t_onset * b.dt_s) / 86400,
      magShards: f.affected_shards.length,
      detectDay: d ? d.day : null, via: d ? d.via : null,
    });
    if (f.level === 'gpu' && f.type === 'mean_shift' && visible) {
      for (const s of f.affected_shards) {
        msTotal++;
        const i = b.shardIds.indexOf(s);
        if (i >= 0 && everSelShard.has(i)) msDetected++;
      }
    }
  }
  res.recallMeanShiftGpu = msTotal ? msDetected / msTotal : null;
}

// ---- CLI ----------------------------------------------------------------------------------

function cliArgs(): { dir: string; cfg: CrossCfg; out: string | null } {
  const a = process.argv.slice(2);
  const dir = a.find(x => !x.startsWith('--'));
  if (!dir) { console.error('usage: canary-crosscheck <bundleDir> [--seed N] [--probes N] [--q X] [--out FILE]'); process.exit(2); }
  const num = (k: string, d: number) => { const i = a.indexOf(`--${k}`); return i >= 0 ? Number(a[i + 1]) : d; };
  const oi = a.indexOf('--out');
  return {
    dir,
    cfg: { ...DEFAULT_CROSS, seed: num('seed', 1), probesPerHour: num('probes', 48), q: num('q', 0.05), unitHandicap: a.includes('--unit-handicap') },
    out: oi >= 0 ? a[oi + 1] : null,
  };
}

if (require.main === module) {
  const { dir, cfg, out } = cliArgs();
  const b = loadScenarioBundle(dir);
  const r = runCrosscheckOnBundle(b, cfg, dir);
  const meanFdp = (fam: string) => {
    const st = r.stops.filter(s => s.family === fam);
    return st.length ? (st.reduce((a, s) => a + s.fdp, 0) / st.length).toFixed(3) : '(none)';
  };
  console.log(`crosscheck ${dir}: ${r.nShards} shards x ${r.days.toFixed(0)}d, ${r.probesPerShardPerDay.toFixed(2)} probes/shard/day`);
  console.log(`  healthy p<=.01 ${(r.healthyLe01 / Math.max(1, r.healthyTests)).toFixed(4)} (Q4 ${(r.healthyLe01Q4 / Math.max(1, r.healthyTestsQ4)).toFixed(4)}, n=${r.healthyTests})`);
  console.log(`  falsePages ${r.falsePages} | distinct false shards ${r.distinctFalseShards} racks ${r.distinctFalseRacks} | monitor ${r.monitorRevokedDay === null ? 'ok' : `REVOKED d${r.monitorRevokedDay.toFixed(1)}`}`);
  console.log(`  stop-FDP shard ${meanFdp('shard')} rack ${meanFdp('rack')} | recall(gpu mean_shift shards) ${r.recallMeanShiftGpu?.toFixed(3) ?? '(none)'}`);
  for (const f of r.faultDetects) {
    if (!f.visible) continue;
    console.log(`  fault ${f.level}/${f.type} onset d${f.onsetDay.toFixed(1)} (${f.magShards} shards): ` +
      (f.detectDay !== null ? `detected d${f.detectDay.toFixed(1)} (+${(f.detectDay - f.onsetDay).toFixed(1)}d, ${f.via})` : 'NOT DETECTED'));
  }
  if (out) fs.writeFileSync(out, JSON.stringify(r, (_k, v) => (v instanceof Map ? undefined : v), 1));
}
