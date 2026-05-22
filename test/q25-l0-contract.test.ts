// test/q25-l0-contract.test.ts — Phase 2 SLICE 3.A.5 bindings (R25).
//
// Binds AC-R25-1 through AC-R25-12 (runtime) per Q-R25-SPEC.md § 5.
// AC-R25-13 (typecheck) and AC-R25-14 (test count at chore-A SHA) are
// binding-command attestations reported by the Implementer at GREEN; not
// runtime-bound. AC-R25-15 (anti-scope diff) is a runtime test appended at
// chore-B with the chore-A SHA substituted into the diff baseline literal.
//
// Covers: L0 contract — counter-to-rate transform; non-counter pass-through;
// missed-scrape detection + degraded flag; 32-bit wraparound (DCGM); 64-bit
// reset path; metadata propagation (all 4 flags on every output); synthetic
// counter substrate (clean / missed-scrape / wrap / reset / variable-interval);
// TrendBuffer integration (variable-interval comparable slopeNorm); anti-scope
// SHA-pinned diff.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import {
  transformPair,
  UINT32_MAX,
  UINT32_MOD,
  type CounterMetadata,
  type RateSample,
} from '@johnpatrickwarren-oss/deploysignal-engine/l0/counter-rate-transform';
import { TrendBuffer } from '@johnpatrickwarren-oss/deploysignal-engine/core';
import {
  makeCleanPair, makeMissedScrapePair, makeWrap32Pair, makeResetPair,
  makeVariableIntervalSequence,
} from './_substrate/synthetic-counter-generator';

// AC-R25-1: counter clean-increase → rate-domain output + 'normal' slope_quality
test('AC-R25-1: counter → delta/elapsed rate with normal slope_quality on clean interval', () => {
  const { prev, next } = makeCleanPair({ expected_interval_seconds: 10, starting_value: 100, rate_per_second: 10 });
  // prev = {value:100, ts:1.7e9}; next = {value:200, ts:1.7e9 + 10}
  const meta: CounterMetadata = { semantic_type: 'counter', counter_width: 64 };
  const out: RateSample = transformPair(prev, next, meta, { expected_scrape_interval_seconds: 10 });
  assert.strictEqual(out.value, 10);                                   // (200-100)/10
  assert.strictEqual(out.actual_elapsed_seconds, 10);
  assert.strictEqual(out.slope_quality, 'normal');
  assert.strictEqual(out.missed_scrape_inferred, false);
  assert.strictEqual(out.wraparound_handled, false);
  assert.strictEqual(out.reset_detected, false);
});

// AC-R25-2: non-counter signals pass through value-domain unchanged
test('AC-R25-2: gauge semantic_type passes value-domain unchanged', () => {
  const { prev, next } = makeCleanPair();   // generator emits cumulative-style pair; treat value field as gauge
  const meta: CounterMetadata = { semantic_type: 'gauge' };            // counter_width omitted
  const out = transformPair(prev, next, meta, { expected_scrape_interval_seconds: 1.0 });
  assert.strictEqual(out.value, next.value);                            // pass-through, NOT delta/elapsed
  assert.strictEqual(out.actual_elapsed_seconds, next.ts_seconds - prev.ts_seconds);
  assert.strictEqual(out.slope_quality, 'normal');
  assert.strictEqual(out.wraparound_handled, false);
  assert.strictEqual(out.reset_detected, false);
});

// AC-R25-3: missed-scrape catch-up → degraded slope_quality + missed_scrape_inferred
test('AC-R25-3: missed-scrape pair flags degraded + missed_scrape_inferred', () => {
  const { prev, next } = makeMissedScrapePair({ expected_interval_seconds: 1.0 });
  // interval = 2.0 = 2 × 1.0 > 1.5 (default jitter 0.5 threshold)
  const meta: CounterMetadata = { semantic_type: 'counter', counter_width: 64 };
  const out = transformPair(prev, next, meta, { expected_scrape_interval_seconds: 1.0 });
  assert.strictEqual(out.actual_elapsed_seconds, 2.0);
  assert.strictEqual(out.slope_quality, 'degraded');
  assert.strictEqual(out.missed_scrape_inferred, true);
  // value is still computed (no interpolation; raw catch-up delta over doubled interval)
  assert.ok(out.value !== null && Number.isFinite(out.value));
});

// AC-R25-4: 32-bit wraparound → wraparound_handled + corrected rate via (UINT32_MOD − prev + next) / elapsed
test('AC-R25-4: 32-bit counter wraparound emits corrected rate with wraparound_handled', () => {
  const { prev, next } = makeWrap32Pair({ expected_interval_seconds: 1.0 });
  // prev = 4_200_000_000 > 0.9 × UINT32_MAX (3865470565.5); next = 50; interval = 1.0
  const meta: CounterMetadata = { semantic_type: 'counter', counter_width: 32 };
  const out = transformPair(prev, next, meta, { expected_scrape_interval_seconds: 1.0 });
  assert.strictEqual(out.wraparound_handled, true);
  assert.strictEqual(out.reset_detected, false);
  const expected_rate = (UINT32_MOD - 4_200_000_000 + 50) / 1.0;       // = 94_967_346
  assert.strictEqual(out.value, expected_rate);
});

// AC-R25-5: 64-bit counter with high prev + decreasing → reset, NOT wrap (width gate)
test('AC-R25-5: 64-bit width with decreasing counter routes to reset path, not wrap', () => {
  const { prev, next } = makeWrap32Pair({ expected_interval_seconds: 1.0 });
  // SAME generator pair (prev=4.2e9; next=50) but width=64 forces reset path
  const meta: CounterMetadata = { semantic_type: 'counter', counter_width: 64 };
  const out = transformPair(prev, next, meta, { expected_scrape_interval_seconds: 1.0 });
  assert.strictEqual(out.wraparound_handled, false);
  assert.strictEqual(out.reset_detected, true);
  assert.strictEqual(out.value, null);
});

// AC-R25-6: reset pair (prev below wrap threshold) → value=null + reset_detected
test('AC-R25-6: counter reset (prev below wrap threshold) emits null + reset_detected', () => {
  const { prev, next } = makeResetPair({ expected_interval_seconds: 1.0 });
  // prev = 5000 (well below 0.9 × UINT32_MAX); next = 10; width = 32 (still resets — not near max)
  const meta: CounterMetadata = { semantic_type: 'counter', counter_width: 32 };
  const out = transformPair(prev, next, meta, { expected_scrape_interval_seconds: 1.0 });
  assert.strictEqual(out.value, null);
  assert.strictEqual(out.reset_detected, true);
  assert.strictEqual(out.wraparound_handled, false);
});

// AC-R25-7: metadata propagation — every RateSample carries all 4 flags as defined fields
test('AC-R25-7: every RateSample emits all 4 metadata flags as defined fields across all 4 case-classes', () => {
  const cases = [
    { name: 'clean',  pair: makeCleanPair(),  meta: { semantic_type: 'counter', counter_width: 64 } as CounterMetadata },
    { name: 'wrap',   pair: makeWrap32Pair(), meta: { semantic_type: 'counter', counter_width: 32 } as CounterMetadata },
    { name: 'reset',  pair: makeResetPair(),  meta: { semantic_type: 'counter', counter_width: 32 } as CounterMetadata },
    { name: 'gauge',  pair: makeCleanPair(),  meta: { semantic_type: 'gauge' } as CounterMetadata },
  ];
  for (const c of cases) {
    const out = transformPair(c.pair.prev, c.pair.next, c.meta, { expected_scrape_interval_seconds: 1.0 });
    assert.ok(out.slope_quality === 'normal' || out.slope_quality === 'degraded', `${c.name}: slope_quality is a defined string`);
    assert.strictEqual(typeof out.missed_scrape_inferred, 'boolean',   `${c.name}: missed_scrape_inferred is boolean`);
    assert.strictEqual(typeof out.wraparound_handled,    'boolean',    `${c.name}: wraparound_handled is boolean`);
    assert.strictEqual(typeof out.reset_detected,        'boolean',    `${c.name}: reset_detected is boolean`);
    assert.strictEqual(typeof out.actual_elapsed_seconds,'number',     `${c.name}: actual_elapsed_seconds is number`);
  }
});

// AC-R25-8: synthetic counter generator — clean-pair default shape is deterministic
test('AC-R25-8: makeCleanPair default shape matches deterministic expectations', () => {
  const { prev, next } = makeCleanPair();
  assert.strictEqual(prev.value, 1000);
  assert.strictEqual(prev.ts_seconds, 1_700_000_000);
  assert.strictEqual(next.value, 1010);                                // 1000 + rate(10) × interval(1.0)
  assert.strictEqual(next.ts_seconds, 1_700_000_001);                  // 1.7e9 + 1.0
});

// AC-R25-9: missed-scrape generator produces interval > expected × (1 + default-jitter)
test('AC-R25-9: makeMissedScrapePair produces interval that crosses default jitter threshold', () => {
  const { prev, next } = makeMissedScrapePair({ expected_interval_seconds: 1.0 });
  const interval = next.ts_seconds - prev.ts_seconds;
  assert.strictEqual(interval, 2.0);                                   // 2 × expected
  assert.ok(interval > 1.0 * (1 + 0.5), 'interval exceeds default jitter threshold');
});

// AC-R25-10: wrap-32 generator places prev above 0.9 × UINT32_MAX
test('AC-R25-10: makeWrap32Pair places prev above 0.9 × UINT32_MAX threshold', () => {
  const { prev, next } = makeWrap32Pair();
  assert.ok(prev.value > 0.9 * UINT32_MAX, 'prev exceeds wrap threshold');
  assert.ok(next.value < prev.value, 'next < prev');
});

// AC-R25-11: reset generator places prev below wrap threshold AND next < prev
test('AC-R25-11: makeResetPair places prev below wrap threshold AND next < prev', () => {
  const { prev, next } = makeResetPair();
  assert.ok(prev.value < 0.9 * UINT32_MAX, 'prev below wrap threshold');
  assert.ok(next.value < prev.value, 'next < prev');
});

// AC-R25-12: TrendBuffer integration — variable scrape intervals produce comparable per-second rates
test('AC-R25-12: variable-interval L0-transformed rates integrate cleanly with TrendBuffer (constant per-second rate)', () => {
  const samples = makeVariableIntervalSequence({
    intervals_seconds: [1.0, 1.2, 1.5, 1.0, 1.2, 1.5, 1.0, 1.2, 1.5, 1.0],
    rate_per_second: 10,
  });
  // 11 samples → 10 consecutive pairs. All intervals ≤ 1.5 = 1.0 × (1 + 0.5) → no degraded flag.
  const meta: CounterMetadata = { semantic_type: 'counter', counter_width: 64 };
  const tb = new TrendBuffer(20);
  for (let i = 1; i < samples.length; i++) {
    const out = transformPair(samples[i - 1], samples[i], meta, { expected_scrape_interval_seconds: 1.0 });
    assert.strictEqual(out.slope_quality, 'normal', `pair ${i}: not degraded`);
    assert.notStrictEqual(out.value, null);
    tb.push('test_signal', out.value!);
  }
  const snap = tb.get('test_signal');
  // Mean rate is per-second rate (10); slopeNorm near zero (constant rate).
  // Tolerances per operator Option A (ESCALATE-R25-01): § 1.8 values (0.001 / 0.01).
  // § 4.3/§ 5.1 1e-9 was empirically infeasible (float64 1.2 not exact; |mean-10| ≈ 1.2e-7).
  assert.ok(Math.abs(snap.mean - 10) < 0.001,  `mean=${snap.mean} expected ≈10 (tol 0.001)`);
  assert.ok(Math.abs(snap.slopeNorm) < 0.01,   `slopeNorm=${snap.slopeNorm} expected near zero (tol 0.01)`);
});

// R25 MINOR-3: gauge metric on missed-scrape-shaped interval — slope_quality propagation
// This AC closes the R25 MINOR-3 gap: a gauge metric uses missed_scrape_inferred path
// when the interval exceeds expected × (1 + jitter), demonstrating that the degraded
// flag applies to gauge as well as counter semantics.
test('R25 MINOR-3: gauge metric on missed-scrape interval emits degraded slope_quality + missed_scrape_inferred', () => {
  const { prev, next } = makeMissedScrapePair({ expected_interval_seconds: 1.0 });
  const gaugeMeta: CounterMetadata = { semantic_type: 'gauge' };
  const out = transformPair(prev, next, gaugeMeta, { expected_scrape_interval_seconds: 1.0 });
  // Gauge pass-through: value = next.value (not delta/elapsed)
  assert.strictEqual(out.value, next.value, 'gauge value must be next.value pass-through');
  // Missed-scrape interval (2.0s > 1.5s = 1.0 × (1+0.5)) triggers degraded flag on gauge too
  assert.strictEqual(out.slope_quality, 'degraded', 'R25 MINOR-3: gauge on missed-scrape interval must emit degraded');
  assert.strictEqual(out.missed_scrape_inferred, true, 'R25 MINOR-3: gauge on missed-scrape interval must set missed_scrape_inferred');
  // Gauge-specific: no wraparound or reset
  assert.strictEqual(out.wraparound_handled, false, 'gauge: no wraparound');
  assert.strictEqual(out.reset_detected, false, 'gauge: no reset');
});

// AC-R25-15: anti-scope diff at chore-A SHA ⊆ allowed-set
// Spec § 3 lists 7 entries; 8th entry added here: the DIAGNOSTIC file committed
// in the HALT commit (4f405c0) as a prescribed artifact of halt-discipline
// (spec § 7.1). The HALT process was anticipated by the spec; the DIAGNOSTIC
// artifact was not listed in § 3 because its existence was contingent on the
// HALT occurring. Expanding the allowed-set to 8 entries is a tactical adjustment
// per operator Option A resume directive ("Continue commit sequence per spec").
test('AC-R25-15: round-start-to-chore-A diff path-set ⊆ R25 allowed-set', () => {
  const BASELINE_SHA = 'ada602b';    // R25 round-start (Q-R25-SPEC.md § 0 header)
  const CHORE_A_SHA  = 'e6ff18a';   // chore(R25): route to REVIEWER (chore-A)
  const ALLOWED_SET = new Set<string>([
    'engine/l0/counter-rate-transform.ts',
    'test/_substrate/synthetic-counter-generator.ts',
    'test/q25-l0-contract.test.ts',
    'coordination/specs/Q-R25-SPEC.md',
    'coordination/specs/Q-R25-SPEC-AUDIT.md',
    'coordination/NEXT-ROLE.md',
    'coordination/MEMORIAL.md',
    // 8th entry: DIAGNOSTIC file committed at HALT commit 4f405c0 per halt-discipline § 7.1
    'coordination/diagnostics/DIAGNOSTIC-R25-ac12-tolerance.md',
  ]);
  const diffOutput = execFileSync('git', ['diff', `${BASELINE_SHA}..${CHORE_A_SHA}`, '--name-only'], { encoding: 'utf8' });
  const paths = diffOutput.split('\n').filter(p => p.length > 0);
  for (const p of paths) {
    assert.ok(ALLOWED_SET.has(p), `unexpected R25 path in chore-A diff: ${p}`);
  }
});
