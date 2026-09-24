// test/_substrate/rate-summary.ts — mean and normalized OLS slope of a rate series.
//
// AC-R25-12 and AC-R30-13 assert that L0-transformed counter rates under VARIABLE scrape intervals
// are a constant per-second rate. Until 2026-09-23 they read that off DeploySignal's `TrendBuffer`
// (engine `core`, a DeploySignal runtime module that leaves the engine at its next major; engine
// ADR 0033). The two numbers the assertions use are defined here with the same maths TrendBuffer
// used, so the tolerances (0.001 on the mean, 0.01 on slopeNorm) keep their meaning: an OLS slope
// of the series against its index, divided by |mean|.
export interface RateSummary { n: number; mean: number; slopeNorm: number }

export function rateSummary(values: ReadonlyArray<number>): RateSummary {
  const n = values.length;
  if (n === 0) return { n: 0, mean: 0, slopeNorm: 0 };
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  for (let i = 0; i < n; i++) { sumX += i; sumY += values[i]; sumXY += i * values[i]; sumX2 += i * i; }
  const denom = n * sumX2 - sumX * sumX;
  const slope = denom !== 0 ? (n * sumXY - sumX * sumY) / denom : 0;
  const mean = sumY / n;
  return { n, mean, slopeNorm: mean !== 0 ? slope / Math.abs(mean) : 0 };
}
