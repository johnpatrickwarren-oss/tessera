// tools/baseline-guard.ts — the SHORT-WINDOW GUARD.
//
// e-betting (e-values / e-processes / e-BH) requires a long, well-estimated healthy null.
// On a short calibration window the per-shard loadings are mis-estimated, the residual is
// not conditionally white, the e-process null is violated, and EVERY downstream number
// (power, FDP, recall) is meaningless. This has been re-discovered repeatedly, so it is
// now ENFORCED IN CODE: any e-betting harness must call assertLongBaseline() before it
// emits a result, and it THROWS unless the calibration/baseline spans ~2 months of
// wall-clock — regardless of cadence.
//
// The ONLY escape is CS_ALLOW_SHORT=1, intended solely for plumbing/wiring smoke tests on
// tiny fixtures. It does NOT silence the problem — it prints a loud banner branding the
// run's numbers as INVALID FOR FINDINGS, so a short-window result can never be mistaken
// for a real one.

/** Minimum healthy-baseline span for a valid e-betting result. ~2 months. */
export const MIN_BASELINE_DAYS = 56; // 8 weeks

const DAY_S = 86400;

/** Brand a run as plumbing-only when the short-window override is set. */
export function shortWindowOverride(): boolean {
  return process.env.CS_ALLOW_SHORT === '1';
}

/** Throw unless the calibration/baseline window spans >= MIN_BASELINE_DAYS of wall-clock.
 *  @param calTicks  number of calibration/baseline ticks (the healthy reference window).
 *  @param dtSeconds the cadence in seconds per tick (factors.json `dt_s`).
 *  @param where     a label for the harness/entry point (for the error message). */
export function assertLongBaseline(calTicks: number, dtSeconds: number, where: string): void {
  const days = (calTicks * dtSeconds) / DAY_S;
  if (shortWindowOverride()) {
    process.stderr.write(
      `\n⚠️  SHORT-WINDOW OVERRIDE (CS_ALLOW_SHORT=1) — ${where}: baseline ≈ ${days.toFixed(2)}d ` +
      `(< ${MIN_BASELINE_DAYS}d). Numbers below are PLUMBING ONLY and INVALID FOR FINDINGS.\n\n`);
    return;
  }
  if (!(days >= MIN_BASELINE_DAYS)) {
    throw new Error(
      `${where}: calibration/baseline ≈ ${days.toFixed(2)} days (calTicks=${calTicks} × dt_s=${dtSeconds}s) ` +
      `is below the ${MIN_BASELINE_DAYS}-day (~2-month) minimum. e-betting does NOT work on short ` +
      `windows — the per-shard null is invalid and every metric is meaningless. Generate a ~2-month ` +
      `baseline (hourly ≈ 1440 ticks, or 1Hz ≈ 5.18M ticks), or set CS_ALLOW_SHORT=1 ONLY for a ` +
      `plumbing smoke (results will be branded invalid).`);
  }
}
