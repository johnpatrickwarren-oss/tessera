import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  Rng, buildTopology, calibrator, conformalP, eBhSelect, bhSelect, normTailP,
  runCanarySim, defaultConfig, HEALTHY_SCENARIOS, GPUS_PER_RACK, canaryEmitter,
} from '../tools/canary-sim.js';
import { modeOf } from '../tools/emitter-contract.js';

test('conformal p is exactly uniform under an exchangeable null', () => {
  const rng = new Rng(11);
  const N = 20000, K = 24;
  let le01 = 0, le05 = 0, le25 = 0;
  for (let t = 0; t < N; t++) {
    const peers: number[] = [];
    for (let i = 0; i < K; i++) peers.push(rng.norm());
    const p = conformalP(rng.norm(), peers, rng.next());
    if (p <= 0.01) le01++;
    if (p <= 0.05) le05++;
    if (p <= 0.25) le25++;
  }
  // 3-sigma binomial bands
  assert.ok(Math.abs(le01 / N - 0.01) < 3 * Math.sqrt(0.01 * 0.99 / N), `p<=.01 rate ${le01 / N}`);
  assert.ok(Math.abs(le05 / N - 0.05) < 3 * Math.sqrt(0.05 * 0.95 / N), `p<=.05 rate ${le05 / N}`);
  assert.ok(Math.abs(le25 / N - 0.25) < 3 * Math.sqrt(0.25 * 0.75 / N), `p<=.25 rate ${le25 / N}`);
});

test('mixture calibrator integrates to 1 and is decreasing (e-increment validity)', () => {
  // ∫₀¹ f(p) dp = 1 exactly for f = mean_k k p^(k-1) (analytic). The p→0 singularity defeats
  // naive quadrature (and Var[f(U)] = ∞ for κ<0.5 defeats MC), so verify the implementation by
  // matching the numeric integral on [ε,1] against the analytic antiderivative mean_k (1 − ε^k).
  const KAPPAS = [0.05, 0.1, 0.2, 0.4, 0.6, 0.8];
  const eps = 1e-6, M = 2_000_000;
  let s = 0;
  const h = (1 - eps) / M;
  for (let i = 0; i < M; i++) s += calibrator(eps + (i + 0.5) * h) * h;
  const analytic = KAPPAS.reduce((a, k) => a + (1 - Math.pow(eps, k)), 0) / KAPPAS.length;
  assert.ok(Math.abs(s - analytic) < 0.005, `integral ${s} vs analytic ${analytic}`);
  // decreasing ⇒ E[f(P)] ≤ 1 for any super-uniform P (validity under conservative p)
  let prev = Infinity;
  for (let p = 0.001; p <= 1; p += 0.001) { const v = calibrator(p); assert.ok(v <= prev + 1e-12); prev = v; }
});

test('per-unit e-process stays supermartingale-bounded on a healthy fleet (FWER proxy)', () => {
  const cfg = defaultConfig({
    seed: 3, nGpus: 16 * GPUS_PER_RACK, days: 8, scenario: HEALTHY_SCENARIOS.H1, budgetFrac: 0.005,
  });
  const r = runCanarySim(cfg);
  assert.ok(r.calConformal.healthyTests > 5000, `too few conformal tests (${r.calConformal.healthyTests}) — blocks starved`);
  // paging threshold 1/alphaPage = 1000; Ville union bound over 1152 units at alpha=0.001 ⇒ ~1 expected
  assert.ok(r.falsePages <= 5, `false pages ${r.falsePages}`);
  // healthy conformal calibration at alpha=0.01 within 4 sigma
  const rate = r.calConformal.healthyLe01 / Math.max(1, r.calConformal.healthyTests);
  const band = 4 * Math.sqrt(0.01 * 0.99 / Math.max(1, r.calConformal.healthyTests));
  assert.ok(Math.abs(rate - 0.01) < band + 0.002, `healthy p<=.01 rate ${rate} (n=${r.calConformal.healthyTests})`);
});

test('e-BH selection rule matches the e-BH definition', () => {
  // n=4, q=0.5: sorted e = [20, 10, 1, 0.1]; thresholds n/(q k) = 8, 4, 8/3, 2
  const sel = eBhSelect([0.1, 20, 1, 10], 0.5);
  assert.deepEqual([...sel].sort(), [1, 3]);
  assert.deepEqual(eBhSelect([0.5, 0.5, 0.5, 0.5], 0.1), []);
});

test('BH on uniform p controls false selections', () => {
  const rng = new Rng(9);
  let totalSel = 0;
  for (let t = 0; t < 50; t++) {
    const ps: number[] = [];
    for (let i = 0; i < 500; i++) ps.push(rng.next());
    totalSel += bhSelect(ps, 0.1).length;
  }
  assert.ok(totalSel <= 25, `null BH selections ${totalSel} over 50 trials`); // ~q per trial at most in expectation under independence
});

test('faulty unit is detected and healthy FDP stays controlled (smoke, plumbing-scale)', () => {
  const cfg = defaultConfig({
    seed: 21, nGpus: 16 * GPUS_PER_RACK, days: 12, budgetFrac: 0.01,
    scenario: HEALTHY_SCENARIOS.H2,
    faults: [{ id: 'f1', level: 'gpu', target: 0, count: 3, onsetDay: 2, severity: 0.05, kind: 'perf' }],
  });
  const r = runCanarySim(cfg);
  assert.ok(r.eprocDetectDay.has('f1') || r.pageDetectDay.has('f1'), 'severe fault undetected');
  const gpuStops = r.stops.filter(s => s.family === 'gpu');
  const worstFdp = Math.max(0, ...gpuStops.map(s => s.fdp));
  assert.ok(worstFdp <= 0.5, `gpu-family stop FDP ${worstFdp}`);
});

test('topology mapping is consistent', () => {
  const rng = new Rng(2);
  const t = buildTopology(3 * GPUS_PER_RACK, rng, 0);
  assert.equal(t.n % GPUS_PER_RACK, 0);
  for (let g = 0; g < t.n; g++) {
    assert.equal(t.rackOf[g], Math.floor(t.hostOf[g] / 18));
    assert.ok(t.leafOf[g] <= t.rackOf[g]);
  }
});

test('same seed reproduces identical results; different seed differs', () => {
  const mk = (seed: number) => runCanarySim(defaultConfig({
    seed, nGpus: 8 * GPUS_PER_RACK, days: 6, budgetFrac: 0.005, scenario: HEALTHY_SCENARIOS.H4,
  }));
  const a = mk(42), b = mk(42), c = mk(43);
  assert.equal(a.execCount, b.execCount);
  assert.equal(a.scoreChecksum, b.scoreChecksum);
  assert.equal(a.gpuSecondsTotal, b.gpuSecondsTotal);
  assert.notEqual(a.scoreChecksum, c.scoreChecksum);
});

test('canary emitter is construction_valid and revocable (Mode B only while monitor passes)', () => {
  assert.equal(modeOf(canaryEmitter(true)), 'B');
  assert.equal(modeOf(canaryEmitter(false)), 'A');
});

test('normTailP sane', () => {
  assert.ok(Math.abs(normTailP(0) - 0.5) < 1e-3);
  assert.ok(normTailP(3) < 0.002 && normTailP(3) > 1e-4);
  assert.ok(normTailP(-3) > 0.998);
});
