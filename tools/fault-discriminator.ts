// tools/fault-discriminator.ts — Lever B (ADR 0016): separate shard-SPECIFIC BENIGN change from a
// FAULT, on the signal Lever A (ADR 0015) leaves (the shard-specific residual that dominates real
// GWDG firing). ADR 0011 showed a per-fire run-length discriminator FAILS (benign drift and faults
// both fire at run-length ~9), so persistence alone is not the signal.
//
// HYPOTHESIS: a benign shard-specific change is a STEP to a new stable regime — a MEAN shift with the
// SAME distribution shape — which the lifecycle (ADR 0011) absorbs by re-recording. A FAULT is a
// DISTRIBUTIONAL change the mean-shift BF (ADR 0013) does NOT model: variance inflation (SDC/bit-flip),
// a trend (degradation), or collapse (detachment). A complementary fault-SIGNATURE test (variance /
// trend / collapse) separates them — FOR FAULTS THAT HAVE A SIGNATURE.
//
// THE IRREDUCIBLE LIMIT (the honest negative): a fault whose ONLY signature is a mean step the same
// size as a benign change is statistically indistinguishable from benign change. Only an external
// EVENT signal (deploy/schedule — Tessera's freeze-hook) breaks the tie: an unexplained mean fire (no
// event) is treated as a fault, at a benign-FP cost of (1 − event_coverage). Tessera-original; NOT vendored.

import { estimateAr1 } from './per-shard-whitening.js';
import { nuisanceRobustEValue } from './nuisance-robust-evalue.js';
import { mulberry32, scramble, gaussian } from './calibration-envelope.js';
import * as fs from 'node:fs';
import * as path from 'node:path';

export const ALPHA = 0.01;
export const M = 600, N = 200, BASE = 1000, NOISE = 2, RHO = 0.5;
export const BENIGN_DELTA = 4;          // benign mean step (≈2σ) — and the size of the mean-only fault
export const FAULT_VAR_MULT = 3;        // variance-inflation fault: test std ×3
export const FAULT_TREND = 10;          // degradation ramp: total rise over the test window
export const FAULT_COLLAPSE = 40;       // detachment: downward drop (≈20σ) toward a degenerate floor
// signature thresholds (principled, fixed; benign false-trip rate is MEASURED, not assumed)
export const F_THRESH = 2.0, T_THRESH = 4.0, COLLAPSE_THRESH = 6.0;
export const TRIALS = 400;

export type ShardType = 'healthy' | 'benign' | 'fault-variance' | 'fault-trend' | 'fault-collapse' | 'fault-meanonly';
export type Verdict = 'healthy' | 'benign' | 'fault';

function mean(xs: ReadonlyArray<number>): number { return xs.reduce((a, b) => a + b, 0) / xs.length; }
function variance(xs: ReadonlyArray<number>, mu: number): number { return xs.reduce((a, b) => a + (b - mu) ** 2, 0) / Math.max(1, xs.length - 1); }
function round3(x: number): number { return Math.round(x * 1000) / 1000; }

/** Whitened innovations r_t = x_t − φ·x_{t−1} over [a,b) using a calibration φ. */
function whiten(v: ReadonlyArray<number>, phi: number, a: number, b: number): number[] {
  const r: number[] = [];
  for (let t = Math.max(a, 1); t < b; t++) r.push(v[t] - phi * v[t - 1]);
  return r;
}

export interface Signature { fRatio: number; tStat: number; collapseSigma: number; hasSignature: boolean; }

/** Fault-signature scores on the test window vs calibration — evidence of a change OTHER than a clean
 *  mean step: (a) innovation-variance ratio (F), (b) trend t-stat, (c) downward collapse in σ units. */
export function faultSignature(v: ReadonlyArray<number>, m: number, n: number): Signature {
  const phi = estimateAr1(v.slice(0, m)).phi;
  const wc = whiten(v, phi, 1, m), wt = whiten(v, phi, m, m + n);
  const s2c = Math.max(variance(wc, mean(wc)), 1e-9);
  const fRatio = Math.max(variance(wt, mean(wt)), 1e-9) / s2c;
  // trend: OLS slope on the WHITENED test innovations (iid → the iid slope-se is valid; raw values
  // are autocorrelated and would inflate the t-stat → spurious trends). A real ramp survives whitening
  // as a slope ≈ b·(1−φ), so a degradation still trips; AR(1) noise no longer does.
  const nt = wt.length, tbar = (nt - 1) / 2, wtbar = mean(wt);
  let stt = 0, sty = 0;
  for (let k = 0; k < nt; k++) { stt += (k - tbar) ** 2; sty += (k - tbar) * (wt[k] - wtbar); }
  const slope = stt > 0 ? sty / stt : 0;
  const tStat = Math.abs(slope) / Math.sqrt(s2c / Math.max(stt, 1e-9));
  // collapse: how far the test RAW mean sits BELOW the cal RAW mean, in cal-σ units (detachment → large)
  const calMean = mean(v.slice(0, m)), testMean = mean(v.slice(m, m + n));
  const sigmaCal = Math.sqrt(Math.max(variance(v.slice(0, m), calMean), 1e-9));
  const collapseSigma = Math.max(0, (calMean - testMean) / sigmaCal);
  return { fRatio, tStat, collapseSigma, hasSignature: fRatio > F_THRESH || tStat > T_THRESH || collapseSigma > COLLAPSE_THRESH };
}

/** Did the mean-shift BF e-value fire? (the "a change happened" trigger). */
export function bfFired(v: ReadonlyArray<number>, m: number, n: number): boolean {
  return nuisanceRobustEValue(v, m, n) >= 1 / ALPHA;
}

/** Signature-only classifier (no event channel): fault-signature → fault; else a mean fire → benign. */
export function classify(v: ReadonlyArray<number>, m: number, n: number): Verdict {
  if (faultSignature(v, m, n).hasSignature) return 'fault';
  return bfFired(v, m, n) ? 'benign' : 'healthy';
}

/** Event-gated classifier: an unexplained mean fire (fired, no signature, NO event) is treated as a
 *  fault; a fire WITH an event is benign (explained). This is the only way to catch a mean-only fault. */
export function classifyWithEvent(v: ReadonlyArray<number>, m: number, n: number, hasEvent: boolean): Verdict {
  if (faultSignature(v, m, n).hasSignature) return 'fault';
  if (!bfFired(v, m, n)) return 'healthy';
  return hasEvent ? 'benign' : 'fault';
}

// ── synthetic single-shard streams (the shard-specific residual Lever A leaves) ──
export function genShard(rng: () => number, type: ShardType, delta: number = BENIGN_DELTA): number[] {
  const v: number[] = []; let p = gaussian(rng);
  for (let t = 0; t < M + N; t++) {
    const test = t >= M;
    const stdMult = test && type === 'fault-variance' ? FAULT_VAR_MULT : 1;
    p = RHO * p + Math.sqrt(1 - RHO * RHO) * gaussian(rng);
    let x = BASE + NOISE * stdMult * p;
    if (test && (type === 'benign' || type === 'fault-meanonly')) x += delta;
    if (test && type === 'fault-trend') x += (FAULT_TREND * (t - M)) / N;
    if (test && type === 'fault-collapse') x -= FAULT_COLLAPSE;
    v.push(x);
  }
  return v;
}

const TYPES: ShardType[] = ['healthy', 'benign', 'fault-variance', 'fault-trend', 'fault-collapse', 'fault-meanonly'];

export interface DiscriminatorReport {
  schema_version: 'tessera-fault-discriminator-v1';
  params: { alpha: number; m: number; n: number; benign_delta: number; trials: number; thresholds: { f: number; t: number; collapse: number } };
  signatures: Array<{ type: ShardType; mean_f_ratio: number; mean_t_stat: number; mean_collapse_sigma: number; signature_rate: number }>;
  confusion: Array<{ type: ShardType; healthy: number; benign: number; fault: number }>;
  irreducible: { meanonly_caught: number; benign_falsefault: number; note: string };
  event_gating: Array<{ coverage: number; benign_falsefault: number; meanonly_caught: number }>;
}

function signatures(): DiscriminatorReport['signatures'] {
  return TYPES.map((type) => {
    let f = 0, t = 0, c = 0, sig = 0;
    for (let s = 0; s < TRIALS; s++) {
      const g = faultSignature(genShard(mulberry32(scramble(17 + s * 13)), type), M, N);
      f += g.fRatio; t += g.tStat; c += g.collapseSigma; if (g.hasSignature) sig++;
    }
    return { type, mean_f_ratio: round3(f / TRIALS), mean_t_stat: round3(t / TRIALS), mean_collapse_sigma: round3(c / TRIALS), signature_rate: round3(sig / TRIALS) };
  });
}

function confusion(): DiscriminatorReport['confusion'] {
  return TYPES.map((type) => {
    const count: Record<Verdict, number> = { healthy: 0, benign: 0, fault: 0 };
    for (let s = 0; s < TRIALS; s++) count[classify(genShard(mulberry32(scramble(101 + s * 13)), type), M, N)]++;
    return { type, healthy: round3(count.healthy / TRIALS), benign: round3(count.benign / TRIALS), fault: round3(count.fault / TRIALS) };
  });
}

/** Event-gating: benign changes carry an event w.p. `coverage`; faults never do. Measures how the
 *  unexplained-fire→fault rule trades benign false-faults against catching the mean-only fault. */
function eventGating(): DiscriminatorReport['event_gating'] {
  return [0, 0.5, 0.9, 1.0].map((coverage) => {
    let benignFF = 0, meanonlyCaught = 0;
    for (let s = 0; s < TRIALS; s++) {
      const rngE = mulberry32(scramble(555 + s));
      const benignHasEvent = rngE() < coverage; // a benign change is explained by an event w.p. coverage
      if (classifyWithEvent(genShard(mulberry32(scramble(201 + s * 13)), 'benign'), M, N, benignHasEvent) === 'fault') benignFF++;
      if (classifyWithEvent(genShard(mulberry32(scramble(909 + s * 13)), 'fault-meanonly'), M, N, false) === 'fault') meanonlyCaught++;
    }
    return { coverage, benign_falsefault: round3(benignFF / TRIALS), meanonly_caught: round3(meanonlyCaught / TRIALS) };
  });
}

export function runDiscriminator(): DiscriminatorReport {
  const conf = confusion();
  const mo = conf.find((c) => c.type === 'fault-meanonly')!, bn = conf.find((c) => c.type === 'benign')!;
  return {
    schema_version: 'tessera-fault-discriminator-v1',
    params: { alpha: ALPHA, m: M, n: N, benign_delta: BENIGN_DELTA, trials: TRIALS, thresholds: { f: F_THRESH, t: T_THRESH, collapse: COLLAPSE_THRESH } },
    signatures: signatures(), confusion: conf,
    irreducible: { meanonly_caught: mo.fault, benign_falsefault: bn.fault, note: 'signature-only classifier: a mean-only fault is classified BENIGN (missed) — indistinguishable from a benign mean step without an event signal' },
    event_gating: eventGating(),
  };
}

function pct(x: number): string { return (x * 100).toFixed(1) + '%'; }

function confusionLines(r: DiscriminatorReport): string[] {
  const L = ['## Confusion matrix — true type → predicted verdict', '', '| true type \\ predicted | healthy | benign | fault |', '|---|---|---|---|'];
  for (const c of r.confusion) L.push(`| ${c.type} | ${pct(c.healthy)} | ${pct(c.benign)} | ${pct(c.fault)} |`);
  L.push('');
  L.push('The signature test routes the three signature-bearing fault types (variance / trend / collapse) to **fault**, and a clean benign mean step to **benign** — while a pure mean fire alone never escalates to fault. The diagonal-ish structure (faults→fault, benign→benign) is the discriminator working.');
  L.push('');
  return L;
}

function eventLines(r: DiscriminatorReport): string[] {
  const L = ['## The irreducible limit + the event channel', ''];
  L.push(`**Mean-only fault (the irreducible case):** a fault whose only signature is a mean step the size of a benign change is classified **${pct(r.irreducible.meanonly_caught)} fault** by the signature-only classifier — i.e. it is MISSED (routed to benign), because it is statistically identical to a benign mean step. No signature test can separate them; this is a real limit, not a tuning gap.`);
  L.push('');
  L.push('**The only fix is an external EVENT signal** (deploy/schedule — Tessera\'s freeze-hook): treat an unexplained mean fire (fired, no signature, NO event) as a fault. With benign changes carrying an event with coverage p (faults never do):');
  L.push('');
  L.push('| event coverage of benign | benign false-fault | mean-only fault caught |');
  L.push('|---|---|---|');
  for (const e of r.event_gating) L.push(`| ${pct(e.coverage)} | ${pct(e.benign_falsefault)} | ${pct(e.meanonly_caught)} |`);
  L.push('');
  L.push('As event coverage → 100%, the unexplained-fire→fault rule catches the mean-only fault while the benign false-fault rate falls to 0 — the discriminator\'s ceiling for mean-only faults is set entirely by event coverage, NOT by the signature test. This is exactly the role of Tessera\'s event-conditioned freeze-hook.');
  L.push('');
  L.push('**This table RESTATES the event model, it does not measure event power.** Under the assumption "faults carry no event, benign changes carry one with probability p," `meanonly_caught = 100%` and `benign_falsefault = 1 − p` are algebraic IDENTITIES, not results. The real-world value depends on the actual event coverage of benign vs faulty changes, which is **unknown/unmeasured here** (it needs a real deploy/schedule feed — Tessera\'s DS-integration freeze-hook). What this section establishes is the SHAPE of the dependence and that the channel is the only lever for mean-only faults — not a measured catch rate.');
  L.push('');
  return L;
}

function renderMd(r: DiscriminatorReport): string {
  const L: string[] = [];
  L.push('# Tessera — benign-change vs fault discriminator (Lever B)');
  L.push('');
  L.push(`Lever A (ADR 0015) removes COMMON-MODE benign change; the shard-SPECIFIC residual it leaves — which dominates real GWDG firing — needs this discriminator. Hypothesis: benign = stable MEAN step (re-recordable); fault = DISTRIBUTIONAL change (variance / trend / collapse) the mean-shift BF does not model. Thresholds: F>${r.params.thresholds.f}, trend t>${r.params.thresholds.t}, collapse>${r.params.thresholds.collapse}σ. ${r.params.trials} trials/type, m=${r.params.m}/n=${r.params.n}, benign step δ=${r.params.benign_delta}.`);
  L.push('');
  L.push('## Fault-signature scores by shard type (benign false-trip rate is MEASURED)');
  L.push('');
  L.push('| type | mean F (var ratio) | mean trend t | mean collapse σ | signature rate |');
  L.push('|---|---|---|---|---|');
  for (const s of r.signatures) L.push(`| ${s.type} | ${s.mean_f_ratio} | ${s.mean_t_stat} | ${s.mean_collapse_sigma} | ${pct(s.signature_rate)} |`);
  L.push('');
  L.push('A clean benign mean step (and the mean-only fault) leave the signature near baseline; variance / trend / collapse faults each trip their own score. The benign signature rate is the false-fault floor of the signature test.');
  L.push('');
  for (const line of confusionLines(r)) L.push(line);
  for (const line of eventLines(r)) L.push(line);
  L.push('## Verdict');
  L.push('');
  L.push('**Lever B separates benign change from faults that have a distributional signature** (variance / trend / collapse → routed to fault), while a clean benign mean step is correctly absorbed as benign — the per-shard companion to Lever A\'s FP/FDR guarantee. **The honest limit:** a fault whose only signature is a mean step the size of a benign change is irreducibly confusable with benign change; only an external event/topology signal resolves it, and the mean-only-fault catch rate is set by event coverage (Tessera\'s freeze-hook), not by the statistics.');
  L.push('');
  L.push('> **Scope:** synthetic ground truth (no real benign-vs-fault labels). Fault models are stylized (variance/trend/collapse). The collapse score is **one-sided (downward only)**: an UPWARD benign step of any size is invisible to it, but a DOWNWARD benign step ≥6σ is indistinguishable from a collapse — collapse separates on magnitude, not benign-vs-fault, in that direction. Re-record masking of slow faults is the ADR 0006 tradeoff, not re-measured here.');
  L.push('');
  return L.join('\n');
}

export function writeDiscriminator(outDir: string): { json: string; md: string } {
  const report = runDiscriminator();
  fs.mkdirSync(outDir, { recursive: true });
  const json = path.join(outDir, 'fault-discriminator-report.json');
  const md = path.join(outDir, 'fault-discriminator-report.md');
  fs.writeFileSync(json, JSON.stringify(report, null, 2) + '\n');
  fs.writeFileSync(md, renderMd(report));
  return { json, md };
}

if (require.main === module) { // CommonJS CLI guard (tsconfig compiles to CJS)
  const out = path.join(path.resolve(__dirname, '..'), 'shadow-results');
  const r = writeDiscriminator(out);
  process.stdout.write(`Fault-discriminator report:\n  ${path.relative(process.cwd(), r.json)}\n  ${path.relative(process.cwd(), r.md)}\n`);
  process.exit(0);
}
