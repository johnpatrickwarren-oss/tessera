/**
 * canary-experiments — the E1–E5 validation program over tools/canary-sim.ts
 * (docs/SPEC-canary-guarantee-program.md § 7).
 *
 *   node tools/canary-experiments.js e1 [--seeds N] [--n GPUS] [--days D]   calibration (healthy H1–H14)
 *   node tools/canary-experiments.js e2 [...]                               fault grid (power/delay/localization)
 *   node tools/canary-experiments.js e3 [...]                               contamination sweep
 *   node tools/canary-experiments.js e4 [...]                               adaptive vs fixed sampling
 *   node tools/canary-experiments.js e5 [...]                               budget/economics sweep
 *
 * Seeds: tuning used seeds 1–5 during development; ALL reported numbers use eval seeds ≥ 101
 * (disjoint), per the tune/eval split in the SPEC. Results land in runs/2026-07-21-canary-sim/.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  runCanarySim, defaultConfig, HEALTHY_SCENARIOS, ScenarioKnobs, FaultSpec, SimConfig,
  RunResult, GPUS_PER_RACK, RACKS_PER_LEAF, RACKS_PER_POWER, Level, MethodCal,
} from './canary-sim';

const OUT_DIR = path.join(__dirname, '..', 'runs', '2026-07-21-canary-sim');
const EVAL_SEED_BASE = 101;

function args(): { cmd: string; seeds: number; n: number; days: number; supfdr: boolean } {
  const a = process.argv.slice(2);
  const get = (k: string, d: number) => { const i = a.indexOf(`--${k}`); return i >= 0 ? Number(a[i + 1]) : d; };
  return { cmd: a[0] ?? 'e1', seeds: get('seeds', 20), n: get('n', 10368), days: get('days', 60), supfdr: a.includes('--supfdr') };
}
let SUPFDR = false;

export function wilson(k: number, n: number): { lo: number; hi: number } {
  if (n === 0) return { lo: 0, hi: 1 };
  const p = k / n, z = 1.96, z2 = z * z;
  const den = 1 + z2 / n, c = p + z2 / (2 * n), h = z * Math.sqrt((p * (1 - p) + z2 / (4 * n)) / n);
  return { lo: Math.max(0, (c - h) / den), hi: Math.min(1, (c + h) / den) };
}

export function fmtRate(k: number, n: number): string {
  if (n === 0) return '—';
  const { lo, hi } = wilson(k, n);
  return `${(k / n).toFixed(4)} [${lo.toFixed(4)},${hi.toFixed(4)}]`;
}

function save(name: string, obj: unknown): void {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUT_DIR, name), JSON.stringify(obj, (_k, v) =>
    v instanceof Map ? Object.fromEntries(v) : v, 1));
  console.log(`\nwrote ${path.join(OUT_DIR, name)}`);
}

interface CalAgg { tests: number; le01: number; le05: number; q: Array<{ tests: number; le01: number }> }
const freshAgg = (): CalAgg => ({ tests: 0, le01: 0, le05: 0, q: [0, 1, 2, 3].map(() => ({ tests: 0, le01: 0 })) });
function addCal(a: CalAgg, c: MethodCal): void {
  a.tests += c.healthyTests; a.le01 += c.healthyLe01; a.le05 += c.healthyLe05;
  for (let i = 0; i < 4; i++) { a.q[i].tests += c.byQuarter[i].tests; a.q[i].le01 += c.byQuarter[i].le01; }
}

// ── E1: calibration under healthy nonstationarity ───────────────────────────────────────────

function e1(seeds: number, n: number, days: number): void {
  console.log(`E1 calibration — ${seeds} seeds × ${Object.keys(HEALTHY_SCENARIOS).length} scenarios, N=${n}, ${days}d`);
  const rows: any[] = [];
  for (const [key, scen] of Object.entries(HEALTHY_SCENARIOS)) {
    const agg = { conformal: freshAgg(), historical: freshAgg(), passive: freshAgg() };
    let stopsWithSel = 0, falseSelUnion = 0, falsePages = 0, monitorRevoked = 0;
    let benignAnchorAlarms = 0, cmDetects = 0, optionalFdpN = 0, optionalFdpSum = 0;
    const monitorDays: number[] = [];
    const famSel: Record<string, number> = {};
    const famDistinctFalse: Record<string, number> = {};
    for (let s = 0; s < seeds; s++) {
      const cfg = defaultConfig({ seed: EVAL_SEED_BASE + s, nGpus: n, days, scenario: scen, supFdrAdjust: SUPFDR });
      const r = runCanarySim(cfg);
      addCal(agg.conformal, r.calConformal); addCal(agg.historical, r.calHistorical); addCal(agg.passive, r.calPassive);
      stopsWithSel += r.stops.length;
      for (const st of r.stops) famSel[st.family] = (famSel[st.family] ?? 0) + st.selected.length;
      for (const [fam, k] of Object.entries(r.falseGroupsDistinct)) famDistinctFalse[fam] = (famDistinctFalse[fam] ?? 0) + k;
      falseSelUnion += r.gpuEverSelectedFalse;
      falsePages += r.falsePages;
      if (r.monitorRevokedDay !== null) { monitorRevoked++; monitorDays.push(r.monitorRevokedDay); }
      benignAnchorAlarms += r.anchoredAlarms.filter(a => a.benign).length;
      if (r.anchoredDetectDay !== null) cmDetects++;
      for (const st of r.stopsOptional) { optionalFdpN++; optionalFdpSum += st.fdp; }
    }
    const row = {
      scenario: scen.name,
      conformal01: fmtRate(agg.conformal.le01, agg.conformal.tests),
      conformalQ1: fmtRate(agg.conformal.q[0].le01, agg.conformal.q[0].tests),
      conformalQ4: fmtRate(agg.conformal.q[3].le01, agg.conformal.q[3].tests),
      historical01: fmtRate(agg.historical.le01, agg.historical.tests),
      historicalQ1: fmtRate(agg.historical.q[0].le01, agg.historical.q[0].tests),
      historicalQ4: fmtRate(agg.historical.q[3].le01, agg.historical.q[3].tests),
      passive01: fmtRate(agg.passive.le01, agg.passive.tests),
      passiveQ4: fmtRate(agg.passive.q[3].le01, agg.passive.q[3].tests),
      ebhStopsWithSelections: stopsWithSel, ebhSelectionsByFamily: famSel,
      distinctFalseGroups: famDistinctFalse, falseUnitSelectionsUnion: falseSelUnion,
      falsePages, monitorRevokedRuns: monitorRevoked,
      monitorRevokeDayMedian: monitorDays.length ? monitorDays.sort((a, b) => a - b)[Math.floor(monitorDays.length / 2)] : null,
      benignAnchorAlarms, commonModeDetectRuns: cmDetects,
      optionalStopMeanFdp: optionalFdpN ? (optionalFdpSum / optionalFdpN).toFixed(3) : '—',
    };
    rows.push(row);
    console.log(`  ${scen.name}: conformal .01→${row.conformal01} (Q1 ${row.conformalQ1} → Q4 ${row.conformalQ4}) | ` +
      `historical Q1 ${row.historicalQ1} → Q4 ${row.historicalQ4} | passive Q4 ${row.passiveQ4} | ` +
      `eBH sel-stops ${stopsWithSel} ${JSON.stringify(famSel)} distinctFalseGroups ${JSON.stringify(famDistinctFalse)}, ` +
      `false-unit-union ${falseSelUnion}, pages ${falsePages}, revoked ${monitorRevoked}/${seeds}`);
  }
  save(SUPFDR ? 'e1-calibration-supfdr.json' : 'e1-calibration.json', { seeds, n, days, supFdrAdjust: SUPFDR, rows });
}

// ── E2: fault grid ──────────────────────────────────────────────────────────────────────────

interface E2Row {
  fault: string; level: string; severity: number; kind: string; seeds: number;
  detectedEbh: number; medianDelayEbh: number | null;
  detectedPage: number; medianDelayPage: number | null;
  detectedHist: number; medianDelayHist: number | null;
  detectedPassive: number; medianDelayPassive: number | null;
  localizedCorrectLevel: number; meanStopFdp: string; unionRecall: string;
}

export function median(xs: number[]): number | null {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
}

function runFaultCase(name: string, mk: (seed: number) => FaultSpec[], seeds: number, n: number, days: number,
  scen: ScenarioKnobs, over?: Partial<SimConfig>): E2Row {
  const dEbh: number[] = [], dPage: number[] = [], dHist: number[] = [], dPass: number[] = [];
  let detE = 0, detP = 0, detH = 0, detD = 0, loc = 0, fdpSum = 0, fdpN = 0, recallK = 0, recallN = 0;
  let level = '', severity = 0, kind = '';
  for (let s = 0; s < seeds; s++) {
    const faults = mk(EVAL_SEED_BASE + s);
    level = faults[0].level; severity = faults[0].severity; kind = faults[0].kind;
    const cfg = defaultConfig({ seed: EVAL_SEED_BASE + s, nGpus: n, days, scenario: scen, faults, ...over });
    const r = runCanarySim(cfg);
    const f0 = faults[0];
    const onset = f0.onsetDay;
    const g = (m: Map<string, number>) => { const d = m.get(f0.id); return d !== undefined ? d - onset : null; };
    const de = g(r.eprocDetectDay); if (de !== null) { detE++; dEbh.push(de); }
    const dp = g(r.pageDetectDay); if (dp !== null) { detP++; dPage.push(dp); }
    const dh = g(r.historicalDetectDay); if (dh !== null) { detH++; dHist.push(dh); }
    const dd = g(r.passiveDetectDay); if (dd !== null) { detD++; dPass.push(dd); }
    if (r.faultOutcomes.find(o => o.id === f0.id)?.localizedCorrectLevel) loc++;
    for (const st of r.stops) { fdpSum += st.fdp; fdpN++; }
    recallK += r.gpuEverSelectedTrue; recallN += r.gpuEverDegraded;
  }
  return {
    fault: name, level, severity, kind, seeds,
    detectedEbh: detE, medianDelayEbh: median(dEbh),
    detectedPage: detP, medianDelayPage: median(dPage),
    detectedHist: detH, medianDelayHist: median(dHist),
    detectedPassive: detD, medianDelayPassive: median(dPass),
    localizedCorrectLevel: loc,
    meanStopFdp: fdpN ? (fdpSum / fdpN).toFixed(3) : '—',
    unionRecall: recallN ? (recallK / recallN).toFixed(3) : '—',
  };
}

function e2(seeds: number, n: number, days: number): void {
  console.log(`E2 fault grid — ${seeds} seeds, N=${n}, ${days}d, scenario H2 (correlated healthy base)`);
  const scen = HEALTHY_SCENARIOS.H2;
  const onset = 20;
  const rows: E2Row[] = [];
  const sevs = [0.001, 0.0025, 0.005, 0.01, 0.02, 0.05, 0.3];
  for (const sev of sevs) {
    rows.push(runFaultCase(`gpu1@${sev}`, () => [{ id: 'F', level: 'gpu' as Level, target: 0, count: 1, onsetDay: onset, severity: sev, kind: 'perf' as const }], seeds, n, days, scen));
    rows.push(runFaultCase(`rack1@${sev}`, seed => [{ id: 'F', level: 'rack' as Level, target: (seed * 7) % Math.floor(n / GPUS_PER_RACK), onsetDay: onset, severity: sev, kind: 'perf' as const }], seeds, n, days, scen));
  }
  for (const sev of [0.01, 0.05]) {
    rows.push(runFaultCase(`gpu5@${sev}`, () => [{ id: 'F', level: 'gpu' as Level, target: 0, count: 5, onsetDay: onset, severity: sev, kind: 'perf' as const }], seeds, n, days, scen));
    rows.push(runFaultCase(`host1@${sev}`, seed => [{ id: 'F', level: 'host' as Level, target: (seed * 13) % Math.floor(n / 4), onsetDay: onset, severity: sev, kind: 'perf' as const }], seeds, n, days, scen));
    rows.push(runFaultCase(`leaf1@${sev}`, seed => [{ id: 'F', level: 'leaf' as Level, target: (seed * 3) % Math.max(1, Math.floor(n / GPUS_PER_RACK / RACKS_PER_LEAF)), onsetDay: onset, severity: sev, kind: 'perf' as const }], seeds, n, days, scen));
    rows.push(runFaultCase(`power1@${sev}`, seed => [{ id: 'F', level: 'power' as Level, target: (seed * 5) % Math.max(1, Math.floor(n / GPUS_PER_RACK / RACKS_PER_POWER)), onsetDay: onset, severity: sev, kind: 'perf' as const }], seeds, n, days, scen));
    rows.push(runFaultCase(`intermittent-gpu@${sev}`, () => [{ id: 'F', level: 'gpu' as Level, target: 0, count: 1, onsetDay: onset, severity: sev, kind: 'intermittent' as const, dutyCycle: 0.2 }], seeds, n, days, scen));
    rows.push(runFaultCase(`class-cond-rack@${sev}`, seed => [{ id: 'F', level: 'rack' as Level, target: (seed * 7) % Math.floor(n / GPUS_PER_RACK), onsetDay: onset, severity: sev, kind: 'classConditional' as const, workloadClass: 1 }], seeds, n, days, scen));
    rows.push(runFaultCase(`canary-only-gpu@${sev}`, () => [{ id: 'F', level: 'gpu' as Level, target: 0, count: 1, onsetDay: onset, severity: sev, kind: 'canaryOnly' as const }], seeds, n, days, scen));
    rows.push(runFaultCase(`dcgm-only-gpu@${sev}`, () => [{ id: 'F', level: 'gpu' as Level, target: 0, count: 1, onsetDay: onset, severity: sev, kind: 'dcgmOnly' as const }], seeds, n, days, scen));
  }
  rows.push(runFaultCase('correctness-gpu@p=0.05', () => [{ id: 'F', level: 'gpu' as Level, target: 0, count: 1, onsetDay: onset, severity: 0.05, kind: 'correctness' as const }], seeds, n, days, scen));
  rows.push(runFaultCase('fleet-common-mode@0.03', () => [{ id: 'F', level: 'fleet' as Level, target: 0, onsetDay: 30, severity: 0.03, kind: 'perf' as const }], seeds, n, days, scen));

  console.log('\n  fault              det(eBH) med-delay | det(page) | det(hist) | det(passive) | loc-level | FDP | recall');
  for (const r of rows) {
    console.log(`  ${r.fault.padEnd(24)} ${r.detectedEbh}/${r.seeds} ${r.medianDelayEbh?.toFixed(1) ?? '—'}d | ` +
      `${r.detectedPage}/${r.seeds} | ${r.detectedHist}/${r.seeds} | ${r.detectedPassive}/${r.seeds} | ` +
      `${r.localizedCorrectLevel}/${r.seeds} | ${r.meanStopFdp} | ${r.unionRecall}`);
  }
  save('e2-faults.json', { seeds, n, days, rows });
}

// ── E3: contamination sweep ─────────────────────────────────────────────────────────────────

function e3(seeds: number, n: number, days: number): void {
  console.log(`E3 contamination — pre-degraded peer fraction sweep, N=${n}, ${days}d`);
  const fracs = [0, 0.001, 0.005, 0.01, 0.02, 0.05, 0.1, 0.2];
  const rows: any[] = [];
  for (const c of fracs) {
    const agg = freshAgg();
    let detE = 0, delays: number[] = [], fdpSum = 0, fdpN = 0, monRevoked = 0;
    for (let s = 0; s < seeds; s++) {
      const nCont = Math.round(c * n);
      const faults: FaultSpec[] = [];
      if (nCont > 0) faults.push({ id: 'CONT', level: 'gpu', target: 0, count: nCont, onsetDay: 0, severity: 0.01, kind: 'perf' });
      // power probe must sit ABOVE the sentinel coverage wall → rack-level fault (group family)
      faults.push({ id: 'F', level: 'rack', target: (EVAL_SEED_BASE + s) % Math.floor(n / GPUS_PER_RACK), onsetDay: 20, severity: 0.02, kind: 'perf' });
      const cfg = defaultConfig({ seed: EVAL_SEED_BASE + s, nGpus: n, days, scenario: HEALTHY_SCENARIOS.H2, faults });
      const r = runCanarySim(cfg);
      addCal(agg, r.calConformal);
      const d = r.eprocDetectDay.get('F'); if (d !== undefined) { detE++; delays.push(d - 20); }
      for (const st of r.stops) { fdpSum += st.fdp; fdpN++; }
      if (r.monitorRevokedDay !== null) monRevoked++;
    }
    const row = {
      contamination: c, healthyConformal01: fmtRate(agg.le01, agg.tests),
      newFaultDetected: `${detE}/${seeds}`, medianDelay: median(delays),
      meanStopFdp: fdpN ? (fdpSum / fdpN).toFixed(3) : '—', monitorRevoked: monRevoked,
    };
    rows.push(row);
    console.log(`  c=${(c * 100).toFixed(1)}%: healthy p≤.01 ${row.healthyConformal01} | new-fault det ${row.newFaultDetected} ` +
      `delay ${row.medianDelay?.toFixed(1) ?? '—'}d | stop-FDP ${row.meanStopFdp} | revoked ${monRevoked}/${seeds}`);
  }
  save('e3-contamination.json', { seeds, n, days, rows });
}

// ── E4: adaptive vs fixed sampling ──────────────────────────────────────────────────────────

function e4(seeds: number, n: number, days: number): void {
  console.log(`E4 adaptive sampling — fixed vs escalation (random-draft vs suspect-draft), N=${n}, ${days}d`);
  // β=0.2% (revisit ~39 h) + 3 GPUs @5%: above the trigger floor so escalation actually engages;
  // at 1%/0.05% neither fixed nor adaptive ever triggers (the coverage wall — see E2/E5).
  const variants: Array<{ name: string; over: Partial<SimConfig> }> = [
    { name: 'fixed', over: { budgetFrac: 0.002 } },
    { name: 'adaptive-random-draft', over: { budgetFrac: 0.002, adaptive: { enabled: true, escalateAt: 4, deescalateBelow: 1.2, escalationBudgetFrac: 0.3, peerDraft: 'random' } } },
    { name: 'adaptive-SUSPECT-draft', over: { budgetFrac: 0.002, adaptive: { enabled: true, escalateAt: 4, deescalateBelow: 1.2, escalationBudgetFrac: 0.3, peerDraft: 'suspects' } } },
  ];
  const rows: any[] = [];
  for (const v of variants) {
    const agg = freshAgg();
    let detE = 0, delays: number[] = [], falsePages = 0, falseUnion = 0, gpuH = 0, fdpSum = 0, fdpN = 0;
    for (let s = 0; s < seeds; s++) {
      const faults: FaultSpec[] = [{ id: 'F', level: 'gpu', target: 0, count: 3, onsetDay: 15, severity: 0.05, kind: 'perf' }];
      const cfg = defaultConfig({ seed: EVAL_SEED_BASE + s, nGpus: n, days, scenario: HEALTHY_SCENARIOS.H2, faults, ...v.over });
      const r = runCanarySim(cfg);
      addCal(agg, r.calConformal);
      const d = r.eprocDetectDay.get('F') ?? r.pageDetectDay.get('F'); if (d !== undefined) { detE++; delays.push(d - 15); }
      falsePages += r.falsePages; falseUnion += r.gpuEverSelectedFalse;
      gpuH += r.gpuSecondsTotal / 3600;
      for (const st of r.stops.filter(x => x.family === 'gpu')) { fdpSum += st.fdp; fdpN++; }
    }
    const row = {
      variant: v.name, healthyConformal01: fmtRate(agg.le01, agg.tests),
      detected: `${detE}/${seeds}`, medianDelayDays: median(delays),
      falsePages, falseUnitSelectionsUnion: falseUnion,
      meanGpuFamilyStopFdp: fdpN ? (fdpSum / fdpN).toFixed(3) : '—',
      meanGpuHoursPerRun: (gpuH / seeds).toFixed(0),
    };
    rows.push(row);
    console.log(`  ${v.name.padEnd(24)}: det ${row.detected} delay ${row.medianDelayDays?.toFixed(1) ?? '—'}d | ` +
      `healthy .01 ${row.healthyConformal01} | falsePages ${falsePages} falseUnion ${falseUnion} | ` +
      `FDP ${row.meanGpuFamilyStopFdp} | GPU-h/run ${row.meanGpuHoursPerRun}`);
  }
  save('e4-adaptive.json', { seeds, n, days, rows });
}

// ── E5: budget / economics sweep ────────────────────────────────────────────────────────────

function e5(seeds: number, n: number, days: number): void {
  console.log(`E5 economics — budget sweep, N=${n}, ${days}d`);
  const budgets = [0.0001, 0.0002, 0.0005, 0.001, 0.002, 0.005, 0.01];
  const faultsDef: Array<{ name: string; sev: number; mk: (seed: number) => FaultSpec[] ; nAff: number }> = [
    { name: 'gpu1@1%', sev: 0.01, nAff: 1, mk: () => [{ id: 'F', level: 'gpu', target: 0, count: 1, onsetDay: 15, severity: 0.01, kind: 'perf' }] },
    { name: 'gpu1@5%', sev: 0.05, nAff: 1, mk: () => [{ id: 'F', level: 'gpu', target: 0, count: 1, onsetDay: 15, severity: 0.05, kind: 'perf' }] },
    { name: 'rack1@1%', sev: 0.01, nAff: GPUS_PER_RACK, mk: seed => [{ id: 'F', level: 'rack', target: (seed * 7) % Math.floor(n / GPUS_PER_RACK), onsetDay: 15, severity: 0.01, kind: 'perf' }] },
    { name: 'rack1@5%', sev: 0.05, nAff: GPUS_PER_RACK, mk: seed => [{ id: 'F', level: 'rack', target: (seed * 7) % Math.floor(n / GPUS_PER_RACK), onsetDay: 15, severity: 0.05, kind: 'perf' }] },
  ];
  const rows: any[] = [];
  for (const b of budgets) {
    for (const fd of faultsDef) {
      let det = 0; const delays: number[] = []; let gpuHTotal = 0; let revisit50 = 0, revisit95 = 0, execs = 0, peak = 0;
      for (let s = 0; s < seeds; s++) {
        const cfg = defaultConfig({ seed: EVAL_SEED_BASE + s, nGpus: n, days, budgetFrac: b, scenario: HEALTHY_SCENARIOS.H2, faults: fd.mk(EVAL_SEED_BASE + s) });
        const r = runCanarySim(cfg);
        const d = r.eprocDetectDay.get('F') ?? r.pageDetectDay.get('F');
        if (d !== undefined) { det++; delays.push(d - 15); }
        gpuHTotal += r.gpuSecondsTotal / 3600;
        revisit50 += r.revisitP50Hours; revisit95 += r.revisitP95Hours; execs += r.execCount; peak = Math.max(peak, r.peakConcurrentGpus);
      }
      const medDelay = median(delays);
      const canaryGpuHPerDay = gpuHTotal / seeds / days;
      // GPU-hours wasted before detection = nAff × severity × delay(h); saved vs a passive
      // discovery horizon assumed at the horizon end for undetected (conservative: days-15)
      const delayH = (medDelay ?? (days - 15)) * 24;
      const wastedGpuH = fd.nAff * fd.sev * delayH;
      const passiveDelayH = (days - 15) * 24; // no-canary counterfactual: found at horizon end
      const savedGpuH = fd.nAff * fd.sev * Math.max(0, passiveDelayH - delayH);
      const dailyCanaryCost = canaryGpuHPerDay;
      rows.push({
        budgetPct: (b * 100).toFixed(2), fault: fd.name,
        detected: `${det}/${seeds}`, medianDelayDays: medDelay,
        revisitP50H: (revisit50 / seeds).toFixed(1), revisitP95H: (revisit95 / seeds).toFixed(1),
        execsPerHour: Math.round(execs / seeds / (days * 24)), peakConcurrentGpus: peak,
        canaryGpuHoursPerDay: dailyCanaryCost.toFixed(1),
        wastedGpuH: wastedGpuH.toFixed(1), savedGpuHvsHorizonEnd: savedGpuH.toFixed(1),
        savedOverCost: (savedGpuH / Math.max(1e-9, dailyCanaryCost * (days - 15))).toFixed(2),
      });
      console.log(`  β=${(b * 100).toFixed(2)}% ${fd.name.padEnd(10)}: det ${det}/${seeds} delay ${medDelay?.toFixed(1) ?? '—'}d ` +
        `revisit p50 ${(revisit50 / seeds).toFixed(0)}h | canary ${dailyCanaryCost.toFixed(1)} GPU-h/d | saved/cost ${(savedGpuH / Math.max(1e-9, dailyCanaryCost * (days - 15))).toFixed(2)}`);
    }
  }
  save('e5-economics.json', { seeds, n, days, rows });
}

// ── main ────────────────────────────────────────────────────────────────────────────────────

if (require.main === module) {
  const { cmd, seeds, n, days, supfdr } = args();
  SUPFDR = supfdr;
  const t0 = process.hrtime.bigint();
  if (cmd === 'e1') e1(seeds, n, days);
  else if (cmd === 'e2') e2(seeds, n, days);
  else if (cmd === 'e3') e3(seeds, n, days);
  else if (cmd === 'e4') e4(seeds, n, days);
  else if (cmd === 'e5') e5(seeds, n, days);
  else { console.error(`unknown command ${cmd}`); process.exit(2); }
  console.log(`done in ${(Number(process.hrtime.bigint() - t0) / 1e9).toFixed(1)}s`);
}
