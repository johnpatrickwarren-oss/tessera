// tools/instrumented-capstone.ts — the engine-backed capstone (engine ADR 0019).
//
// The fleet-relative capstone (tools/fleet-relative-capstone.ts) established the
// HONEST negative result: a median/trimmed-mean common-mode center SEPARATES faults
// (power ≈ 1) but does NOT control FDR, because the faults themselves contaminate the
// center — their onset shifts it, so every healthy shard's residual gets a spurious
// step and false-fires (ADR 0012). Its own header named the fix: a contamination-robust
// common-mode (factor model) + a baseline-robust e-value.
//
// This capstone wires that fix on the engine L1 kit and shows the contrast:
//   raw fleet → instrumentedCommonModeResiduals (regress each shard on MEASURED factors,
//   fit on the healthy reference window only) → universalInferenceMeanShiftEValue
//   (E[e|H0] ≤ 1 by construction for ANY φ, ADR 0010) → eBenjaminiHochberg (fleet-FDR).
//
// Because the common-mode factor is MEASURED (instrumented), the faults cannot
// contaminate it, so healthy-shard residuals stay null and the e-BH selection controls
// the EMPIRICAL fleet-FDP while keeping high power.
//
// HONEST SCOPE (do not dress up — see project memory + handoff): this is an EMPIRICAL
// fleet-FDR demonstration on SYNTHETIC data with CLEAN instrumented factors, reproducing
// the engine ADR 0019 capstone. It is NOT a provable per-shard FDR guarantee (irreducible
// per-shard nonstationarity, ADR 0012), and it depends on the instrumented factor being
// clean — estimating the common-mode from the shard signals themselves fails (ADR 0017).
// The point: the INSTRUMENTED common-mode is the power+FDR lever, validated here against
// the median-center control on the same fleets.
//
// Tessera-original; NOT vendored.

import { mulberry32, gaussian } from './calibration-envelope.js';
import { fleetResiduals } from './fleet-fdr.js';
import {
  alignToGrid,
  validateFactorTelemetry,
  resolveFactorMembership,
  type FactorTelemetry,
} from '@johnpatrickwarren-oss/deploysignal-engine/baseline/factor-telemetry';
import { instrumentedCommonModeResiduals } from '@johnpatrickwarren-oss/deploysignal-engine/fleet/instrumented-common-mode';
import { universalInferenceMeanShiftEValue } from '@johnpatrickwarren-oss/deploysignal-engine/detectors/universal-inference-e-value';
import { eBenjaminiHochberg } from '@johnpatrickwarren-oss/deploysignal-engine/fleet/e-bh';

export const N = 60, T = 2000, M = 1500, N_TEST = 300, FONSET = 1550;
export const RHO = 0.5, DRIFT = 0.5, NOISE = 2, LVL = 5, STEP = 10;
export const DEFAULT_MFAIL = 10, TRIALS = 60;
export const QS = [0.1, 0.05, 0.01] as const;
export const FAULT_FRACS = [2, 5, 10, 20] as const;

const FACTOR_ID = 'fleet-common-mode';

export interface Fleet {
  /** `[shard][tick]` counter matrix. */
  X: number[][];
  /** True per-shard fault mask. */
  failed: boolean[];
  /** The (measured) fleet common-mode factor — a shared random walk. */
  cm: number[];
}

/** Synthetic fleet: shared random-walk common-mode + per-shard level + AR(1) noise +
 *  a step fault in the first `mfail` shards from FONSET (mfail=0 → null fleet). The
 *  common-mode `cm` is returned so it can be fed as a MEASURED factor (the whole point:
 *  a fault cannot contaminate a factor the product measures directly). */
export function genFleet(rng: () => number, mfail: number): Fleet {
  const cm = new Array<number>(T).fill(0);
  for (let t = 1; t < T; t++) cm[t] = cm[t - 1] + DRIFT * gaussian(rng);
  const failed = Array.from({ length: N }, (_, i) => i < mfail);
  const X: number[][] = [];
  for (let i = 0; i < N; i++) {
    const lvl = LVL * gaussian(rng);
    const row = new Array<number>(T);
    let p = gaussian(rng);
    for (let t = 0; t < T; t++) {
      p = RHO * p + Math.sqrt(1 - RHO * RHO) * gaussian(rng);
      row[t] = 1000 + cm[t] + lvl + NOISE * p + (failed[i] && t >= FONSET ? STEP : 0);
    }
    X[i] = row;
  }
  return { X, failed, cm };
}

/** STEP 5 — assemble the measured common-mode into a validated FactorTelemetry on the
 *  analysis grid, and resolve per-shard membership (every shard loads on the one factor).
 *  Exercises alignToGrid (the simple irregular-stream case) → FactorTelemetry →
 *  validateFactorTelemetry → resolveFactorMembership, the L2 ingestion contract. */
export function assembleCommonModeTelemetry(cm: ReadonlyArray<number>, nShards: number): {
  factorSignals: number[][];
  membership: number[][];
} {
  // Resample the factor onto the grid t0=0, dt=1, ticks=T (here it already lies on the
  // grid, so 'hold' reproduces it — but this is the real ingestion path a product uses).
  const samples = cm.map((v, t) => ({ t, v }));
  const aligned = alignToGrid(samples, 0, 1, T, { method: 'hold' });
  const ft: FactorTelemetry = { signals: [aligned], factorIds: [FACTOR_ID], t0: 0, dt: 1, ticks: T };
  validateFactorTelemetry(ft, T);
  const membershipByFactorId = Array.from({ length: nShards }, () => [FACTOR_ID]);
  const membership = resolveFactorMembership(ft.factorIds, membershipByFactorId);
  return { factorSignals: ft.signals.map((s) => [...s]), membership };
}

/** Per-shard mean-shift e-value over the cal/test split (ADR 0010 universal inference;
 *  E[e|H0] ≤ 1 for ANY φ, so e-BH on these controls FDR when the residuals are null). */
function uiEValues(R: ReadonlyArray<ReadonlyArray<number>>): number[] {
  const cal = { start: 0, len: M };
  const test = { start: M, len: N_TEST };
  return R.map((r) => universalInferenceMeanShiftEValue(r, cal, test));
}

/** STEP 6 — instrumented detection path: remove the measured common-mode, then score. */
export function instrumentedEValues(fleet: Fleet): number[] {
  const { factorSignals, membership } = assembleCommonModeTelemetry(fleet.cm, fleet.X.length);
  const R = instrumentedCommonModeResiduals(fleet.X, M, factorSignals, membership);
  return uiEValues(R);
}

/** Control path: median-center common-mode (the old capstone's contaminated estimator). */
export function medianEValues(fleet: Fleet): number[] {
  return uiEValues(fleetResiduals(fleet.X));
}

export interface Outcome { fdp: number; power: number; K: number; }

/** e-BH selection scored against the true fault mask: FDP = false / max(1,K); power =
 *  true / nFail (1 when there are no faults and none selected). */
export function score(eValues: ReadonlyArray<number>, failed: ReadonlyArray<boolean>, q: number): Outcome {
  // anchor:allow certified-fdr-path: measurement harness — `score` exists to compute FDP/power against the `failed` ground-truth mask of a synthetic fleet; it never returns a selection to act on.
  const { selected, K } = eBenjaminiHochberg(eValues, q);
  let falseSel = 0, trueSel = 0;
  for (const i of selected) (failed[i] ? trueSel++ : falseSel++);
  const nFail = failed.filter(Boolean).length;
  return {
    fdp: K > 0 ? falseSel / K : 0,
    power: nFail > 0 ? trueSel / nFail : (K === 0 ? 1 : 0),
    K,
  };
}

export interface TrialSummary { instrumented: Outcome; median: Outcome; }

/** Average FDP/power over `trials` independent fleets at fault count `mfail`, FDR target `q`. */
export function runTrials(mfail: number, q: number, trials = TRIALS, seed0 = 0x5EED >>> 0): TrialSummary {
  const acc = (): Outcome => ({ fdp: 0, power: 0, K: 0 });
  const inst = acc(), med = acc();
  for (let tr = 0; tr < trials; tr++) {
    const rng = mulberry32((seed0 + tr * 2654435761) >>> 0);
    const fleet = genFleet(rng, mfail);
    const i = score(instrumentedEValues(fleet), fleet.failed, q);
    const m = score(medianEValues(fleet), fleet.failed, q);
    inst.fdp += i.fdp; inst.power += i.power; inst.K += i.K;
    med.fdp += m.fdp; med.power += m.power; med.K += m.K;
  }
  const norm = (o: Outcome): Outcome => ({ fdp: o.fdp / trials, power: o.power / trials, K: o.K / trials });
  return { instrumented: norm(inst), median: norm(med) };
}

/** Render the instrumented-vs-median FDP/power table across QS × FAULT_FRACS. */
export function renderCapstone(trials = TRIALS): string {
  const pad = (s: string, w: number): string => s.padStart(w);
  const lines: string[] = [];
  lines.push('Instrumented common-mode capstone (engine ADR 0019) — EMPIRICAL fleet-FDR on synthetic data.');
  lines.push(`N=${N} shards, T=${T}, cal=[0,${M}), test=[${M},${M + N_TEST}), fault step=${STEP} from t=${FONSET}, ${trials} trials/cell.`);
  lines.push('');
  lines.push('  q     mfail | instrumented FDP  power |  median(control) FDP  power');
  lines.push('  ------------+--------------------------+----------------------------');
  for (const q of QS) {
    for (const mfail of FAULT_FRACS) {
      const r = runTrials(mfail, q, trials);
      lines.push(
        `  ${pad(q.toString(), 5)} ${pad(String(mfail), 5)} | `
        + `${pad(r.instrumented.fdp.toFixed(3), 14)}  ${pad(r.instrumented.power.toFixed(3), 5)} | `
        + `${pad(r.median.fdp.toFixed(3), 18)}  ${pad(r.median.power.toFixed(3), 5)}`);
    }
  }
  return lines.join('\n');
}

if (require.main === module) { // CommonJS CLI guard (tsconfig compiles to CJS)
  process.stdout.write(renderCapstone() + '\n');
  process.exit(0);
}
