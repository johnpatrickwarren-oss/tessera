// test/e-value.test.ts — the branded e-value type (tools/e-value.ts).
//
// Two kinds of test here, and the FIRST kind is the point of the module:
//
//   (1) COMPILE-TIME. `@ts-expect-error` fails the build if the expression it guards does NOT
//       error. So each one is a positive assertion that a specific audit bug is now unrepresentable:
//       raw numbers, SR running maxima, p-values and object literals cannot reach the FDR path.
//       These "tests" do their work during `tsc`; at runtime they are inert.
//
//   (2) RUNTIME. Monte-Carlo null means for the certified constructors/combinators (E[e|H0] ≤ 1),
//       the closure properties, the weakest-link evidence rule, and the escape hatch's refusal.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  type EValue, CERT, calibrate, eConformalRank, eMin, eConvexMean, eSupAdjusted,
  eNormalizedMixture, eGeometricMixture, eFromEngineSafeT, EProcess,
  weaker, weakest, meetsEvidence, certificateChain, openPremises, unsafeEValue,
  CALIBRATOR_KAPPAS, eFromOnsetAccumulator, eFromNormalizedMixture,
} from '../tools/e-value.js';
import { certifiedFdrBenjaminiHochberg, REQUIRED_EVIDENCE, type EmitterContract } from '../tools/emitter-contract.js';

function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function gauss(r: () => number): number {
  const u = Math.max(r(), 1e-12), v = r();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

const contract = (validityClass: EmitterContract['validityClass']): EmitterContract => ({
  id: 'test-emitter',
  baselineVersion: 'test',
  conditioningVariables: [],
  residualizer: 'none',
  increment: 'conformal-rank-calibrated',
  stoppingAggregation: 'fixed-time',
  horizon: 'test',
  validityClass,
  calibrationMonitorPassing: true,
});

// ─────────────────────────────────────────────────────────────────────────────
// (1) Compile-time: the audit's bug class is now unrepresentable
// ─────────────────────────────────────────────────────────────────────────────

test('COMPILE-TIME: audit F1–F5 quantities cannot reach the FDR path', () => {
  const q = 0.1;
  const c = contract('construction_valid');

  // F3 — THE live-path bug. `eDetector(...).peak` is the Shiryaev–Roberts running max, with
  // E[M^SR|H0] ≈ #onsets. It was passed to eBenjaminiHochberg and the run reported "CERTIFIED".
  // It is a plain `number`, so it no longer type-checks.
  const srPeak = 137.4;
  // @ts-expect-error an SR running max is not an EValue (audit F3)
  assert.throws(() => certifiedFdrBenjaminiHochberg([srPeak], q, c, 'test'), TypeError);

  // F2 — gaussianLrEValue: plug-in SD ⇒ the null mean diverges. A bare number.
  const plugInLr = 2.5;
  // @ts-expect-error a plug-in Gaussian-LR value is not an EValue (audit F2)
  void (() => certifiedFdrBenjaminiHochberg([plugInLr], q, c, 'test'));

  // A p-value is not an e-value, however small.
  const p = 0.001;
  // @ts-expect-error a p-value is not an e-value
  void (() => certifiedFdrBenjaminiHochberg([p], q, c, 'test'));

  // The brand blocks structural typing: an object with the right SHAPE is still not an EValue.
  const forged = { value: 1e9, cert: CERT.SAFE_T };
  // @ts-expect-error the unique-symbol brand defeats structural typing
  void (() => certifiedFdrBenjaminiHochberg([forged], q, c, 'test'));

  // And the combinators are closed over the type too — no laundering a number through eMin.
  // @ts-expect-error combinators only accept EValues
  void (() => eMin(srPeak));

  assert.ok(true, 'if this file compiled, every @ts-expect-error above fired');
});

test('COMPILE-TIME: there is deliberately no free-standing product over EValue[]', () => {
  // The product of e-values is an e-value only when they are SEQUENTIALLY conditional. Exposing
  // `product(EValue[])` would re-create audit F5 (per-cycle re-normalisation across looks).
  // Accumulation has exactly one entry point, and it is stateful.
  const mod = require('../tools/e-value.js') as Record<string, unknown>;
  assert.equal(mod.eProduct, undefined, 'no eProduct may exist — use EProcess');
  assert.equal(typeof mod.EProcess, 'function');
});

// ─────────────────────────────────────────────────────────────────────────────
// (2) Runtime: the certified constructions actually satisfy E[e|H0] ≤ 1
// ─────────────────────────────────────────────────────────────────────────────

test('calibrator integrates to 1 and is non-increasing (the two hypotheses it needs)', () => {
  // The identity is ∫₀¹ mean_κ κp^{κ−1} dp = mean_κ [p^κ]₀¹ = 1, exactly.
  //
  // Two quadrature hazards, both worth stating because both produced a wrong "failure" first:
  //   • f has an integrable singularity at 0 (κ = 0.05 ⇒ f ~ p^{−0.95}); a midpoint rule on a
  //     uniform grid under-estimates it badly (0.868 at N = 2e5). Substituting p = u^16 turns each
  //     term into 16κ·u^{16κ−1}, worst case a very mild u^{−0.2}.
  //   • `calibrate` FLOORS p at 1e-12 for numerical safety, which then dominates the substituted
  //     grid (0.950). So the exact identity belongs to the unclamped map; the shipped one is
  //     strictly conservative. Test both facts separately rather than blurring them.
  const N = 200_000;
  const exact = (p: number): number =>
    CALIBRATOR_KAPPAS.reduce((a, k) => a + k * Math.pow(p, k - 1), 0) / CALIBRATOR_KAPPAS.length;

  let s = 0, sClamped = 0;
  for (let i = 0; i < N; i++) {
    const u = (i + 0.5) / N;
    const jac = 16 * Math.pow(u, 15);
    const p = Math.pow(u, 16);
    s += exact(p) * jac;
    sClamped += calibrate(p) * jac;
  }
  assert.ok(Math.abs(s / N - 1) < 5e-3, `∫f should be exactly 1, got ${s / N}`);
  assert.ok(sClamped / N <= 1 + 1e-9, `the clamped implementation must stay conservative, got ${sClamped / N}`);

  // The floor only bites below any attainable conformal p: a block of K peers cannot produce
  // p < 1/(K+1), so the clamp is unreachable in production (it would need K > 1e12 peers).
  for (const p of [1e-9, 1e-6, 1e-3, 0.01, 0.5, 1]) {
    assert.ok(Math.abs(calibrate(p) - exact(p)) <= 1e-9 * Math.max(1, exact(p)),
      `clamp must not perturb attainable p (p=${p})`);
  }

  let prev = Infinity;
  for (let i = 1; i <= 1000; i++) {
    const f = calibrate(i / 1000);
    assert.ok(f <= prev + 1e-12, 'calibrator must be non-increasing (needed for super-uniform ⇒ E[f(P)] ≤ 1)');
    prev = f;
  }
  assert.ok(CALIBRATOR_KAPPAS.every((k) => k > 0 && k <= 1), 'κ ≤ 1 is what makes f non-increasing');
});

test('conformal-rank e-value has null mean ≤ 1 under exact uniformity', () => {
  const r = rng(101);
  let s = 0;
  const N = 200_000;
  for (let i = 0; i < N; i++) s += eConformalRank(r()).value;
  assert.ok(s / N <= 1.02, `E[e|H0] should be ≤ 1, got ${s / N}`);
});

test('min rule (ADR 0022 / audit F4): E[min] ≤ 1 even for perfectly correlated inputs', () => {
  const r = rng(7);
  let s = 0;
  const N = 100_000;
  for (let i = 0; i < N; i++) {
    const p = r();
    // worst case for a min rule: the two arguments are the SAME draw
    s += eMin(eConformalRank(p), eConformalRank(p)).value;
  }
  assert.ok(s / N <= 1.02, `E[min] should be ≤ 1, got ${s / N}`);
});

test('convex mean is an e-value; weights summing above 1 are refused (the N3 error)', () => {
  const a = eConformalRank(0.001);
  const b = eConformalRank(0.5);
  const m = eConvexMean([a, b]);
  assert.ok(Math.abs(m.value - (a.value + b.value) / 2) < 1e-12);
  // sub-convex is fine (conservative)
  assert.doesNotThrow(() => eConvexMean([a, b], [0.25, 0.25]));
  assert.throws(() => eConvexMean([a, b], [0.9, 0.9]), /sum to ≤ 1/);
  assert.throws(() => eConvexMean([a, b], [-0.1, 0.5]), /nonnegative/);
});

test('√E−1 adjuster: the RUNNING MAX of a null e-process is inflated, the adjusted value is not', () => {
  // A genuine test martingale under H0, then its running max, then the adjuster.
  const trials = 4000, T = 300, lambda = 0.4;
  let rawMax = 0, adjusted = 0;
  for (let t = 0; t < trials; t++) {
    const r = rng(9000 + t);
    const proc = new EProcess(CERT.CONFORMAL_RANK_CALIBRATED);
    for (let i = 0; i < T; i++) proc.update(Math.exp(lambda * gauss(r) - (lambda * lambda) / 2));
    const rm = proc.runningMax();
    rawMax += rm.value;
    adjusted += eSupAdjusted(rm).value;
  }
  rawMax /= trials; adjusted /= trials;
  assert.ok(adjusted <= 1.05, `adjusted running max must be a valid e-value, got ${adjusted}`);
  assert.ok(rawMax > adjusted, `raw running max (${rawMax}) should exceed the adjusted value (${adjusted}) — that gap is exactly why F3 over-selected`);
});

test('EProcess ½/½ accumulator: null mean ≤ 1, and the value is prefix-consistent across looks', () => {
  const trials = 3000, T = 200;
  let s = 0;
  for (let t = 0; t < trials; t++) {
    const r = rng(31_000 + t);
    const proc = new EProcess();
    for (let i = 0; i < T; i++) proc.update(calibrate(r()));
    s += proc.current().value;
  }
  assert.ok(s / trials <= 1.05, `E[M_T|H0] should be ≤ 1, got ${s / trials}`);

  // One process read at two times is the SAME process read later (the F5 property): the running max
  // is monotone, so selections are accept-to-reject monotone across looks.
  const r = rng(5);
  const proc = new EProcess();
  let prevMax = 1;
  for (let i = 0; i < 300; i++) {
    proc.update(calibrate(r()));
    const m = proc.runningMax().value;
    assert.ok(m >= prevMax - 1e-12, 'running max must be monotone across looks');
    prevMax = m;
  }
});

test('EProcess.skip advances the round counter without adding evidence', () => {
  const a = new EProcess();
  const b = new EProcess();
  for (let i = 0; i < 10; i++) { a.update(calibrate(0.5)); b.update(calibrate(0.5)); }
  b.skip(); b.skip();
  assert.equal(a.rounds, 10);
  assert.equal(b.rounds, 12);
  assert.ok(b.current().value <= a.current().value + 1e-9, 'skipping must not manufacture evidence');
});

test('mixture constructors are certified and produce nonnegative finite values', () => {
  const r = rng(77);
  const resid = Array.from({ length: 500 }, () => gauss(r));
  for (const e of [eNormalizedMixture(resid), eGeometricMixture(resid), eFromEngineSafeT(0.8)]) {
    assert.ok(e.value >= 0 && Number.isFinite(e.value));
    assert.ok(e.cert.id.length > 0);
  }
  // the caveat that killed F5 is recorded on the object, not just in a comment
  assert.ok(eNormalizedMixture(resid).cert.caveats?.some((c) => /HORIZON-DEPENDENT/.test(c)));
});

// ─────────────────────────────────────────────────────────────────────────────
// Evidence-class propagation and the gate
// ─────────────────────────────────────────────────────────────────────────────

test('weakest-link rule: a derivation inherits the weakest input class', () => {
  assert.equal(weaker('theorem', 'construction'), 'construction');
  assert.equal(weaker('construction', 'empirical'), 'empirical');
  assert.ok(meetsEvidence('theorem', 'construction'));
  assert.ok(!meetsEvidence('construction', 'theorem'));

  const r = rng(3);
  const thm = eConformalRank(r());                    // theorem
  const con = eNormalizedMixture([1, 0, -1, 0.5]);     // construction
  assert.equal(thm.cert.evidence, 'theorem');
  assert.equal(con.cert.evidence, 'construction');
  assert.equal(weakest([thm, con]), 'construction');
  // min of a theorem-class and a construction-class value is construction-class
  assert.equal(eMin(thm, con).cert.evidence, 'construction');
});

test('gate rejects a theorem_valid emitter fed construction-class numbers', () => {
  const con = eNormalizedMixture([1, 0, -1, 0.5]);
  assert.equal(REQUIRED_EVIDENCE.theorem_valid, 'theorem');
  assert.throws(
    () => certifiedFdrBenjaminiHochberg([con, con], 0.1, contract('theorem_valid'), 'test'),
    /demands theorem-class e-values/,
  );
  // the same numbers are fine under an honestly-declared construction_valid emitter
  assert.doesNotThrow(() => certifiedFdrBenjaminiHochberg([con, con], 0.1, contract('construction_valid'), 'test'));
});

test('gate still enforces ADR 0019 emitter eligibility', () => {
  const e = eConformalRank(0.001);
  assert.throws(
    () => certifiedFdrBenjaminiHochberg([e], 0.1, { ...contract('construction_valid'), calibrationMonitorPassing: false }, 'test'),
    /NOT admitted to the FDR-bearing e-BH path/,
  );
  assert.throws(
    () => certifiedFdrBenjaminiHochberg([e], 0.1, contract('empirically_audited'), 'test'),
    /not FDR-bearing/,
  );
});

test('selection carries its certificate chain and its OPEN premises', () => {
  const es = [eConformalRank(1e-6), eConformalRank(0.5), eConformalRank(0.9)];
  const sel = certifiedFdrBenjaminiHochberg(es, 0.5, contract('construction_valid'), 'test');
  assert.ok(sel.certificateIds.includes('conformal-rank-calibrated'));
  assert.equal(sel.evidence, 'theorem');
  // Gap A must be visible in the audit record, not buried in an ADR.
  assert.ok(sel.openPremises.some((p) => /H-EX/.test(p)), 'the exchangeability premise must surface');
  assert.ok(sel.openPremises.some((p) => /suspect-enriched/.test(p)), 'the measured E4 violation must surface');
});

test('certificateChain / openPremises walk derivations', () => {
  const combined = eSupAdjusted(eMin(eConformalRank(0.01), eNormalizedMixture([0.5, -0.5])));
  const ids = certificateChain(combined).map((c) => c.id);
  for (const id of ['sup-adjusted-running-max', 'min-rule', 'conformal-rank-calibrated', 'normalized-onset-mixture']) {
    assert.ok(ids.includes(id), `chain should include ${id}, got ${ids.join(',')}`);
  }
  assert.ok(openPremises(combined).length > 0);
});

// ─────────────────────────────────────────────────────────────────────────────
// The escape hatch
// ─────────────────────────────────────────────────────────────────────────────

test('unsafeEValue refuses without the override, and demands a real justification', () => {
  const prev = process.env.CS_ALLOW_UNVALIDATED;
  delete process.env.CS_ALLOW_UNVALIDATED;
  try {
    assert.throws(() => unsafeEValue(5, 'because I said so'), /substantive justification/);
    assert.throws(
      () => unsafeEValue(5, 'migration placeholder for the legacy triad path; owned by ADR 0022 follow-up'),
      /refused/,
    );
  } finally {
    if (prev === undefined) delete process.env.CS_ALLOW_UNVALIDATED; else process.env.CS_ALLOW_UNVALIDATED = prev;
  }
});

test('unsafeEValue is permanently empirical-class and taints downstream derivations', () => {
  const prev = process.env.CS_ALLOW_UNVALIDATED;
  process.env.CS_ALLOW_UNVALIDATED = '1';
  try {
    const u = unsafeEValue(3, 'migration placeholder for the legacy triad path; owned by ADR 0022 follow-up');
    assert.equal(u.cert.evidence, 'empirical');
    assert.equal(eMin(eConformalRank(0.001), u).cert.evidence, 'empirical');

    // Drop the override before probing the gate: with CS_ALLOW_UNVALIDATED=1 still set, the gate
    // WARNS instead of throwing (the ADR 0019 / baseline-guard convention). The point of this
    // assertion is the ordinary path — an empirical-class number cannot satisfy construction_valid.
    delete process.env.CS_ALLOW_UNVALIDATED;
    assert.throws(
      () => certifiedFdrBenjaminiHochberg([u], 0.1, contract('construction_valid'), 'test'),
      /demands construction-class e-values/,
    );
  } finally {
    if (prev === undefined) delete process.env.CS_ALLOW_UNVALIDATED; else process.env.CS_ALLOW_UNVALIDATED = prev;
  }
});

test('MIGRATION SAFETY: the adapters are numerically transparent (ADR 0025)', () => {
  // The three call sites migrated to certifiedFdrBenjaminiHochberg carry PUBLISHED figures
  // (canary-sim E1–E5, clustersynth mode-b FDP/recall). Routing them through the certified gate is
  // only legitimate if it cannot move a single number, so assert bit-exactness (Object.is, not ≈)
  // against the arithmetic each call site used before.
  const r = rng(20260726);
  for (let i = 0; i < 200_000; i++) {
    const v = Math.exp(24 * (r() - 0.5)); // 1e-5 … 1e5
    // canary-sim: `max(√v − 1, 0)` on the running max  ≡  eSupAdjusted ∘ eFromOnsetAccumulator
    assert.ok(Object.is(Math.max(Math.sqrt(v) - 1, 0), eSupAdjusted(eFromOnsetAccumulator(v)).value));
    // canary-sim unadjusted branch: the accumulator value passes through untouched
    assert.ok(Object.is(v, eFromOnsetAccumulator(v).value));
    // clustersynth-mode-b streaming: the ADR 0022 min rule  ≡  eMin
    const a = Math.exp(20 * (r() - 0.5)), b = Math.exp(20 * (r() - 0.5));
    assert.ok(Object.is(Math.min(a, b), eMin(eFromNormalizedMixture(a), eFromNormalizedMixture(b)).value));
  }
  // boundary cases a random sweep will not reach: the adjuster's clamp at 1 is where a rewrite
  // would most plausibly have drifted
  for (const v of [0, 1, 1 - 1e-16, 1 + 1e-16, Number.MIN_VALUE, 1e308]) {
    assert.ok(Object.is(Math.max(Math.sqrt(v) - 1, 0), eSupAdjusted(eFromOnsetAccumulator(v)).value),
      `adjuster differs at v=${v}`);
  }
});

test('adapters carry the certificate their name claims', () => {
  assert.equal(eFromOnsetAccumulator(2).cert.id, 'half-half-accumulator');
  assert.equal(eFromNormalizedMixture(2).cert.id, 'normalized-onset-mixture');
  // and the class both migrated emitters declare (construction_valid) accepts them
  assert.ok(meetsEvidence(eFromOnsetAccumulator(2).cert.evidence, 'construction'));
  assert.ok(meetsEvidence(eFromNormalizedMixture(2).cert.evidence, 'construction'));
  // min of two construction-class values stays construction-class — the claim made at
  // clustersynth-mode-b's in-place triad routing site
  assert.equal(eMin(eFromNormalizedMixture(1), eFromNormalizedMixture(2)).cert.evidence, 'construction');
});

test('negative or non-finite values are refused at construction', () => {
  assert.throws(() => eFromEngineSafeT(-1), /finite and nonnegative/);
  assert.throws(() => eFromEngineSafeT(NaN), /finite and nonnegative/);
  assert.throws(() => new EProcess().update(-0.5), /finite and nonnegative/);
});
