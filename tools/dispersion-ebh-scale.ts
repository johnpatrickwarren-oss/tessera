// tools/dispersion-ebh-scale.ts — A2-disp-ebh-scale: the e-BH onset ς̂ as the fleet grows past 10k.
//
// WHAT THIS CLOSES (a2-disp-ebh report § 5, open item A2-disp-ebh-scale). The boundary report
// measured the e-BH onset at ς̂ ≈ 0.31–0.43 — at N = 2016 only — and then found (N12) that the
// fleet-size protection REVERSES: rack-shared λ + the step-up cascade make false selections grow
// superlinearly in N (0 / 3 / 26.5 per run at 1008/2016/4032, knob 1.0). Extreme-rack statistics
// can only pull the onset DOWN as N grows. This harness measures HOW FAR: the full (N × knob)
// grid at N up to 40 320 units (560 racks), bracketing the onset ς̂ at each fleet size and — the
// operational question — whether the design gate ς ≲ 0.15 keeps a usable margin at 10k–40k.
//
// MECHANISM REVIEW (why the onset must fall). The first selection needs max_u e_u ≥ N/q. Against
// iid unit-level λ the barrier's ln N growth wins. But λ is PER-RACK: the fleet max is an
// extreme-value statistic in the number of RACKS, and each new rack is a fresh draw of a shared
// multiplier that its ~72 units all ride. More racks ⇒ a fatter right tail for the best-financed
// unit ⇒ first crossing earlier and at smaller ς — and the step-up cascade then converts one
// crossing into a rack-sized batch of selections.
//
// A/A ONLY, SHIPPED PRIMITIVES ONLY — same substrate, scoring path, and conventions as
// dispersion-ebh-boundary.ts (scoreRound → conformalP → calibrator → ½/½ accumulator → eBhSelect
// every round; every selection below is false). Sizes are rack multiples (72/rack).
//
// Run: `pnpm build && node tools/dispersion-ebh-scale.js [--sizes 4032,10080] [--seeds 6] [--json out.json]`
// Report: research/2026-07-28-a2-disp-ebh-scale.md

import { runEbhVariant, type EbhBoundaryRow } from './dispersion-ebh-boundary.js';

/** Knob grid biased toward the measured N=2016 onset region (ς̂ 0.15–0.43), plus the two
 *  strong-failure anchors. 0.25 is the design-gate point (ς̂ ≈ 0.153). */
export const SCALE_KNOB_GRID: ReadonlyArray<number> = [0.25, 0.3, 0.35, 0.4, 0.45, 0.5, 0.7, 1.0];

/** Rack multiples (72/rack): 56, 140, 280, 560 racks. 4032 anchors against the N12 sweep. */
export const SCALE_SIZES: ReadonlyArray<number> = [4032, 10080, 20160, 40320];

export interface ScaleGridResult {
  nUnits: number;
  rows: EbhBoundaryRow[];
  /** smallest measured ς̂ with ≥1 false selection in any seed (Infinity if none). */
  onsetVarsigma: number;
  /** largest measured ς̂ with zero selections across all seeds BELOW the onset (0 if none). */
  lastSafeVarsigma: number;
}

/** Onset = smallest measured ς̂ with ≥1 selection event in any seed; lastSafe = largest ς̂ BELOW
 *  the onset with zero events across all seeds. Pure — extracted so the bracket rule is testable
 *  without running sweeps. */
export function onsetBracket(rows: ReadonlyArray<Pick<EbhBoundaryRow, 'varsigmaHat' | 'seedsWithSel'>>): {
  onsetVarsigma: number; lastSafeVarsigma: number;
} {
  const withSel = rows.filter((r) => r.seedsWithSel > 0);
  const onsetVarsigma = withSel.length ? Math.min(...withSel.map((r) => r.varsigmaHat)) : Infinity;
  const safe = rows.filter((r) => r.seedsWithSel === 0 && r.varsigmaHat < onsetVarsigma);
  return {
    onsetVarsigma,
    lastSafeVarsigma: safe.length ? Math.max(...safe.map((r) => r.varsigmaHat)) : 0,
  };
}

export function scaleGrid(
  nUnits: number,
  grid: ReadonlyArray<number> = SCALE_KNOB_GRID,
  seeds = 6,
  horizons: ReadonlyArray<number> = [80, 160, 320],
): ScaleGridResult {
  const rows = grid.map((k) => runEbhVariant(k, { seeds, nUnits, horizons: [...horizons] }));
  return { nUnits, rows, ...onsetBracket(rows) };
}

// ─────────────────────────────────────────────────────────────────────────────

const f1 = (x: number): string => (Number.isFinite(x) ? x.toFixed(1) : '∞');
const meanFinite = (xs: number[]): number => {
  const f = xs.filter(Number.isFinite);
  return f.length ? f.reduce((a, b) => a + b, 0) / f.length : Infinity;
};

export function report(sizes: ReadonlyArray<number>, seeds: number): { lines: string[]; data: Record<string, unknown> } {
  const L: string[] = [];
  L.push('A2-disp-ebh-scale — e-BH onset ς̂ vs fleet size (A/A; every selection FALSE)');
  L.push(`sizes: ${sizes.join(', ')} units (${sizes.map((n) => n / 72).join(', ')} racks); ${seeds} seeds/point`);
  const results: ScaleGridResult[] = [];
  for (const n of sizes) {
    const g = scaleGrid(n, SCALE_KNOB_GRID, seeds);
    results.push(g);
    L.push('');
    L.push(`N = ${n} (N/q = ${n / 0.05}):`);
    L.push('  knob   ς̂       firstSel(mean, seeds w/ sel)  seeds w/ sel   T=80 sel/run   T=320 sel/run   T=320 pages/run (budget)');
    for (const r of g.rows) {
      const p80 = r.points.find((p) => p.T === 80), p320 = r.points[r.points.length - 1];
      L.push(`  ${String(r.knob).padEnd(5)} ${r.varsigmaHat.toFixed(3)}  ${f1(meanFinite(r.firstSelRounds)).padStart(10)}                       ${r.seedsWithSel}/${r.firstSelRounds.length}        ${f1(p80?.falseSelectionsPerRun ?? NaN).padStart(8)}       ${f1(p320.falseSelectionsPerRun).padStart(8)}          ${f1(p320.falsePagesPerRun).padStart(8)} (${p320.villeBudget.toFixed(1)})`);
    }
    L.push(`  onset ς̂: ${Number.isFinite(g.onsetVarsigma) ? g.onsetVarsigma.toFixed(3) : 'none'}; last all-seeds-clean ς̂ below onset: ${g.lastSafeVarsigma.toFixed(3)}`);
  }
  L.push('');
  L.push('onset bracket vs N (lastSafe, onset):');
  for (const g of results) {
    L.push(`  N=${String(g.nUnits).padEnd(6)} (${g.lastSafeVarsigma.toFixed(3)}, ${Number.isFinite(g.onsetVarsigma) ? g.onsetVarsigma.toFixed(3) : '∞'})`);
  }
  return { lines: L, data: { seeds, results } };
}

if (require.main === module) {
  const argAfter = (flag: string): string | undefined => {
    const i = process.argv.indexOf(flag);
    return i >= 0 ? process.argv[i + 1] : undefined;
  };
  const sizes = argAfter('--sizes')?.split(',').map(Number) ?? [...SCALE_SIZES];
  const seeds = Number(argAfter('--seeds') ?? 6);
  const { lines, data } = report(sizes, seeds);
  for (const l of lines) console.log(l);
  const out = argAfter('--json');
  if (out) {
    require('fs').writeFileSync(out, JSON.stringify(data, null, 2));
    console.log(`\nwrote ${out}`);
  }
}
