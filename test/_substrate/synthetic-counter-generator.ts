// test/_substrate/synthetic-counter-generator.ts — Phase 2 SLICE 3.A.5 substrate (R25).
//
// Synthetic counter generator for L0-contract empirical validation. Five
// factories produce sample pairs (clean / missed-scrape / 32-bit wrap /
// reset) plus one sequence-builder for variable-interval integration with
// TrendBuffer (AC-R25-12).
//
// Naming convention parallels test/_substrate/factories.ts and v9X-cluster.ts:
//   make<Case>(overrides?) → ResultType; defaults are deterministic-test
//   friendly (base_ts = 1700000000, starting_value = 1000, expected_interval = 1.0,
//   rate_per_second = 10); opts shallow-merged.
//
// Tessera-original code (NOT vendored from DeploySignal).

import type { CounterSample } from '@johnpatrickwarren-oss/deploysignal-engine/l0/counter-rate-transform';

const DEFAULT_BASE_TS = 1_700_000_000;
const DEFAULT_STARTING_VALUE = 1000;
const DEFAULT_EXPECTED_INTERVAL = 1.0;
const DEFAULT_RATE_PER_SECOND = 10;

export interface SyntheticCounterOpts {
  expected_interval_seconds?: number;
  base_ts?: number;
  starting_value?: number;
  rate_per_second?: number;
}

export function makeCleanPair(opts: SyntheticCounterOpts = {}): { prev: CounterSample; next: CounterSample } {
  const interval  = opts.expected_interval_seconds ?? DEFAULT_EXPECTED_INTERVAL;
  const baseTs    = opts.base_ts                   ?? DEFAULT_BASE_TS;
  const startVal  = opts.starting_value            ?? DEFAULT_STARTING_VALUE;
  const rate      = opts.rate_per_second           ?? DEFAULT_RATE_PER_SECOND;
  return {
    prev: { value: startVal,                   ts_seconds: baseTs },
    next: { value: startVal + rate * interval, ts_seconds: baseTs + interval },
  };
}

export function makeMissedScrapePair(opts: SyntheticCounterOpts = {}): { prev: CounterSample; next: CounterSample } {
  // Interval = 2 × expected (above default 1.5 threshold); counter increments by
  // rate × 2 × interval (catch-up — the missed sample's delta carried over).
  const interval  = opts.expected_interval_seconds ?? DEFAULT_EXPECTED_INTERVAL;
  const baseTs    = opts.base_ts                   ?? DEFAULT_BASE_TS;
  const startVal  = opts.starting_value            ?? DEFAULT_STARTING_VALUE;
  const rate      = opts.rate_per_second           ?? DEFAULT_RATE_PER_SECOND;
  return {
    prev: { value: startVal,                         ts_seconds: baseTs },
    next: { value: startVal + rate * 2 * interval,   ts_seconds: baseTs + 2 * interval },
  };
}

export function makeWrap32Pair(opts: SyntheticCounterOpts = {}): { prev: CounterSample; next: CounterSample } {
  // prev = 4_200_000_000 > 0.9 × UINT32_MAX (= 3_865_470_565.5); next small.
  const interval  = opts.expected_interval_seconds ?? DEFAULT_EXPECTED_INTERVAL;
  const baseTs    = opts.base_ts                   ?? DEFAULT_BASE_TS;
  return {
    prev: { value: 4_200_000_000, ts_seconds: baseTs },
    next: { value: 50,            ts_seconds: baseTs + interval },
  };
}

export function makeResetPair(opts: SyntheticCounterOpts = {}): { prev: CounterSample; next: CounterSample } {
  // prev = 5000 (well below wrap threshold); next very small (10).
  const interval  = opts.expected_interval_seconds ?? DEFAULT_EXPECTED_INTERVAL;
  const baseTs    = opts.base_ts                   ?? DEFAULT_BASE_TS;
  return {
    prev: { value: 5000, ts_seconds: baseTs },
    next: { value: 10,   ts_seconds: baseTs + interval },
  };
}

export function makeVariableIntervalSequence(opts: {
  intervals_seconds: number[];
  rate_per_second?: number;
  starting_value?: number;
  base_ts?: number;
}): CounterSample[] {
  const rate     = opts.rate_per_second ?? DEFAULT_RATE_PER_SECOND;
  const startVal = opts.starting_value  ?? DEFAULT_STARTING_VALUE;
  const baseTs   = opts.base_ts         ?? DEFAULT_BASE_TS;
  const samples: CounterSample[] = [{ value: startVal, ts_seconds: baseTs }];
  let curValue = startVal;
  let curTs = baseTs;
  for (const dt of opts.intervals_seconds) {
    curValue += rate * dt;
    curTs += dt;
    samples.push({ value: curValue, ts_seconds: curTs });
  }
  return samples;
}
