// tools/mismatched-dgp-envelope.ts — the FALSIFICATION BOUNDARY of the R72/R77 oracle-baseline
// numbers (W4, 2026-07-02 audit F12).
//
// WHY. The R72/R77 matrices run the Family-A betting detector on an iid-Gaussian DGP with the TRUE
// mean/variance passed as known constants. Their numbers validate wiring and relative tuning — not
// robustness. This matrix measures the SAME detector cell (oracle-parameter convention, α = 0.005,
// threshold 1/α, 200 windows — the R77 default) under MISMATCHED null DGPs, so the coverage story
// carries its own falsification boundary instead of implying the iid numbers generalize:
//   • iid-gaussian     — the R72/R77 reference (null FPR ≈ small).
//   • ar1-ρ0.5/0.9/0.95 — autocorrelated null fed as if iid (the repo's own ADR 0001 finding:
//     ~180× type-I inflation at ρ=0.95; this pins it in a committed artifact).
//   • t3-tails         — heavy-tailed null scaled to unit variance (ADR 0011's regime).
//   • regime-step      — a +1σ NULL regime step mid-window (nonstationary mean, no fault).
//   • diurnal          — a 1σ-amplitude sinusoid null (per-shard seasonality, no fault).
// Detection is also reported for a 0.05/window ramp (the R77 default cell) so power under mismatch
// is visible next to the FPR inflation.
//
// The production pipelines do NOT run this naked detector — baselining/whitening/common-mode removal
// + the Wall-A gate stand in front of it (that is the point of the architecture). This matrix
// documents what the ORACLE-DGP numbers do NOT claim. Deterministic; committed under
// coverage-matrices/R79-mismatched-dgp.*. Tessera-original; NOT vendored.

import { freshBettingState, updateBettingState } from '@johnpatrickwarren-oss/deploysignal-engine/detectors/betting-e-process';
import * as fs from 'node:fs';
import * as path from 'node:path';

const ALPHA = 0.005;
const WINDOWS = 200;
const TRIALS = 200; // per DGP per arm (null / ramp) — deterministic seeds
const RAMP = 0.05;  // the R77 default-cell ramp slope

function makeLcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => { s = ((s * 1664525) + 1013904223) >>> 0; return s / 0x100000000; };
}
function gauss(rng: () => number): number {
  const u1 = Math.max(rng(), 1e-12), u2 = rng();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}
/** Unit-variance t3 via N/√(χ²₃/3), rescaled by √(1/3) (Var t₃ = 3). */
function t3unit(rng: () => number): number {
  const n = gauss(rng);
  const c = gauss(rng) ** 2 + gauss(rng) ** 2 + gauss(rng) ** 2;
  return (n / Math.sqrt(c / 3)) / Math.sqrt(3);
}

export interface DgpSpec { name: string; next: (rng: () => number, state: { x: number }, w: number) => number; }

export const DGPS: DgpSpec[] = [
  { name: 'iid-gaussian', next: (rng) => gauss(rng) },
  { name: 'ar1-rho0.5', next: (rng, st) => (st.x = 0.5 * st.x + Math.sqrt(1 - 0.25) * gauss(rng)) },
  { name: 'ar1-rho0.9', next: (rng, st) => (st.x = 0.9 * st.x + Math.sqrt(1 - 0.81) * gauss(rng)) },
  { name: 'ar1-rho0.95', next: (rng, st) => (st.x = 0.95 * st.x + Math.sqrt(1 - 0.9025) * gauss(rng)) },
  { name: 't3-tails', next: (rng) => t3unit(rng) },
  { name: 'regime-step', next: (rng, _st, w) => gauss(rng) + (w >= WINDOWS / 2 ? 1 : 0) },
  { name: 'diurnal', next: (rng, _st, w) => gauss(rng) + Math.sin((2 * Math.PI * w) / 24) },
];

export interface DgpRow { name: string; nullFireRate: number; rampDetectRate: number; }

function fireRate(dgp: DgpSpec, ramp: number, seedBase: number): number {
  let fires = 0;
  for (let t = 0; t < TRIALS; t++) {
    const rng = makeLcg(seedBase + t * 7919);
    const st = { x: gauss(rng) };
    const state = freshBettingState();
    let fired = false;
    for (let w = 0; w < WINDOWS && !fired; w++) {
      const x = dgp.next(rng, st, w) + ramp * (w + 1);
      updateBettingState(state, x, 0, 1, ALPHA); // ORACLE params 0/1 — the R72/R77 convention under test
      if (state.M >= 1 / ALPHA) fired = true;
    }
    if (fired) fires++;
  }
  return fires / TRIALS;
}

export function buildMatrix(): DgpRow[] {
  return DGPS.map((d, i) => ({
    name: d.name,
    nullFireRate: fireRate(d, 0, 1000 + i * 100000),
    rampDetectRate: fireRate(d, RAMP, 5000 + i * 100000),
  }));
}

export function renderMatrix(rows: DgpRow[]): string {
  const L: string[] = [];
  L.push('# R79 — mismatched-DGP falsification boundary for the oracle-baseline coverage numbers');
  L.push('');
  L.push(`Family-A betting detector, ORACLE params (0/1), α=${ALPHA}, ${WINDOWS} windows, ${TRIALS} trials/arm.`);
  L.push('`null FPR` = fires on a FAULT-FREE stream of that DGP (any fire in the window). The iid row is');
  L.push('the R72/R77 operating regime; every other row is a null the oracle-DGP matrices never test.');
  L.push('The production pipelines interpose baselining/whitening/common-mode removal + the Wall-A gate —');
  L.push('this matrix documents what the R72/R77 numbers alone do NOT claim (2026-07-02 audit F12).');
  L.push('');
  L.push('| DGP | null FPR | ramp(0.05/w) detection |');
  L.push('|---|---|---|');
  for (const r of rows) L.push(`| ${r.name} | ${r.nullFireRate.toFixed(3)} | ${r.rampDetectRate.toFixed(3)} |`);
  return L.join('\n');
}

if (require.main === module) {
  const rows = buildMatrix();
  const outDir = path.join(__dirname, '..', 'coverage-matrices');
  fs.writeFileSync(path.join(outDir, 'R79-mismatched-dgp.json'), JSON.stringify(rows, null, 2) + '\n');
  fs.writeFileSync(path.join(outDir, 'R79-mismatched-dgp.md'), renderMatrix(rows) + '\n');
  process.stdout.write(renderMatrix(rows) + '\n');
  process.exit(0);
}
