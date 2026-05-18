# DIAGNOSTIC-R25-ac12-tolerance.md

**Round:** R25  
**Role:** IMPLEMENTER  
**AC affected:** AC-R25-12 (TrendBuffer integration — variable-interval comparable slopeNorm)  
**Halt trigger:** Spec-internal contradiction (§ 1.8 vs § 4.3/§ 5.1) + spec premise fails empirically (R08 reinforcement)

---

## Spec claim (exact quote — § 4.3 GREEN-commit pseudocode)

```
assert.ok(Math.abs(snap.mean - 10) < 1e-9,
    `mean=${snap.mean} expected 10 exactly (deterministic generator)`);
assert.ok(Math.abs(snap.slopeNorm) < 1e-9,
    `slopeNorm=${snap.slopeNorm} expected near zero`);
```

And from § 5.1 AC-R25-12 table:
> "the TrendBuffer snapshot `mean === 10` (to 1e-9 tolerance — exact arithmetic on synthetic data)"

## Contradicting spec claim (§ 1.8 — Mechanism description, same spec)

```
asserts: `Math.abs(snap.mean - 10) < 0.001` (mean equals per-second rate)
AND `Math.abs(snap.slopeNorm) < 0.01` (flat trend; constant rate produces near-zero slopeNorm)
```

§ 1.8 prescribes `0.001` and `0.01`. § 4.3/§ 5.1 prescribes `1e-9` and `1e-9`. These are mutually incompatible for the `1e-9` mean threshold.

## Reality (empirical evidence)

```
intervals_seconds: [1.0, 1.2, 1.5, 1.0, 1.2, 1.5, 1.0, 1.2, 1.5, 1.0]
rate_per_second: 10
```

Float64 representation of 1.2: `1.2000000476837158` (not exact in IEEE 754 binary64)

Per-pair rates observed (from node evaluation):
```
pair 1 rate: 10              elapsed: 1
pair 2 rate: 9.999999602635718  elapsed: 1.2000000476837158
pair 3 rate: 10              elapsed: 1.5
pair 4 rate: 10              elapsed: 1
pair 5 rate: 9.999999602635718  elapsed: 1.2000000476837158
pair 6 rate: 10              elapsed: 1.5
pair 7 rate: 10              elapsed: 1
pair 8 rate: 9.999999602635718  elapsed: 1.2000000476837158
pair 9 rate: 10              elapsed: 1.5
pair 10 rate: 10             elapsed: 1
TrendBuffer mean: 9.999999880790716
|mean - 10|: 1.1920928422171073e-7   (≈ 1.2e-7)
slopeNorm: 7.224804411028632e-10     (within 1e-9 ✓)
```

**Mean tolerance fails:** `1.2e-7 > 1e-9` — the `< 1e-9` assertion fails.  
**slopeNorm tolerance passes:** `7.2e-10 < 1e-9` — the `< 1e-9` assertion passes.  
**Mean within § 1.8 tolerance:** `1.2e-7 < 0.001` — passes the § 1.8 threshold.

Root cause: the generator uses `curValue += rate * dt` where `dt = 1.2` is not exactly representable in float64 binary. The elapsed computation `next.ts_seconds - prev.ts_seconds` accumulates the same float64 artifact: `1.2000000476837158`. The rate `delta / elapsed = (rate * 1.2000000476837158) / 1.2000000476837158` should cancel exactly, but floating-point arithmetic is NOT associative and the numerator `curValue += 10 * 1.2` accumulates error in the `curValue` that doesn't fully cancel at division time.

## Resolution options

**Option A — Use § 1.8 tolerances (`mean < 0.001`, `slopeNorm < 0.01`)**

Replace the `< 1e-9` assertions with the values from § 1.8. Both assertions pass with these tolerances. The counterfactual discriminator is preserved: a non-normalized implementation (raw per-tick deltas instead of per-second rates) would produce mean ≈ 11.8 (weighted average of 10, 12, 15) — far outside `0.001`.

Risk: slightly weaker than § 4.3 intended, but the § 1.8 values are what the Mechanism section prescribed before tightening.

**Option B — Use intermediate empirical tolerances (`mean < 1e-6`, `slopeNorm < 1e-9`)**

`mean < 1e-6` comfortably covers the observed `1.2e-7` and the slopeNorm `1e-9` already passes. The counterfactual discriminator is preserved (raw-delta mean ~11.8 fails `< 1e-6` by 6 orders of magnitude). This is tighter than § 1.8 while being empirically achievable.

**Option C — Change intervals to float64-exact values**

Replace `[1.0, 1.2, 1.5, ...]` with intervals that ARE exactly representable in float64 (e.g., `[1.0, 1.25, 1.5, ...]` — 1.25 = 5/4 is exact; 1.5 = 3/2 is exact). The mean would then be exactly 10.0 and the `1e-9` threshold would pass. This changes the empirical scenario (loses the 1.2s case) but preserves the spec's intent.

**Recommendation for operator:** Option A is the safest — it restores the values from § 1.8 which account for float64 behavior and preserves the discriminator. Option B gives tighter bounds if desired. Option C requires a generator change.

## Empirically verify

```bash
node -e "
const { makeVariableIntervalSequence } = require('./test/_substrate/synthetic-counter-generator');
const { transformPair } = require('./engine/l0/counter-rate-transform');
const { TrendBuffer } = require('./engine/core');
const samples = makeVariableIntervalSequence({
  intervals_seconds: [1.0, 1.2, 1.5, 1.0, 1.2, 1.5, 1.0, 1.2, 1.5, 1.0],
  rate_per_second: 10,
});
const meta = { semantic_type: 'counter', counter_width: 64 };
const tb = new TrendBuffer(20);
for (let i = 1; i < samples.length; i++) {
  const out = transformPair(samples[i-1], samples[i], meta, { expected_scrape_interval_seconds: 1.0 });
  tb.push('test_signal', out.value);
}
const snap = tb.get('test_signal');
console.log('|mean - 10|:', Math.abs(snap.mean - 10));
console.log('|slopeNorm|:', Math.abs(snap.slopeNorm));
console.log('passes 0.001:', Math.abs(snap.mean - 10) < 0.001);
console.log('passes 1e-6:', Math.abs(snap.mean - 10) < 1e-6);
console.log('passes 1e-9:', Math.abs(snap.mean - 10) < 1e-9);
"
```
