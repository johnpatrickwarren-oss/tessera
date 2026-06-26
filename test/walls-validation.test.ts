// test/walls-validation.test.ts — the integrated three-walls demonstration. Asserts the O5 thesis
// (the conditional-Markov diagnostic tracks stopped-e-BH fleet-FDR control as common-mode quality
// degrades) plus the Wall-B and Fleet headline results, all deterministic.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assumption31Sweep, wallBRecap, fleetRecap, QUALITIES } from '../tools/walls-validation.js';

// NOTE (post-cold-eye): the sweep uses a ZERO-MEAN AR factor (ramp=0), so degrading common-mode
// removal degrades ONLY the residual's serial dependence (what the diagnostic reads), not its level.
// The earlier ramp version confounded the FDR gradient with a surviving-mean (plug-in-baseline) leak;
// this version's leak survives per-shard demeaning, so the diagnostic→FDR link is causal, not baked-in.
test('Wall A (O5): the diagnostic tracks fleet-FDR validity as common-mode quality degrades', () => {
  const rows = assumption31Sweep();
  assert.deepEqual(rows.map((r) => r.quality), QUALITIES);
  const [oracle, good, poor, none] = rows;

  // A good common-mode estimate EARNS the conditional guarantee: residual ~white, FDR ≤ q.
  assert.ok(oracle.stoppedEbhFdr <= 0.1, `oracle should control FDR ≤ q; got ${oracle.stoppedEbhFdr}`);
  assert.ok(good.stoppedEbhFdr <= 0.1, `good should control FDR ≤ q; got ${good.stoppedEbhFdr}`);
  assert.ok(oracle.markovPlausibleFrac > 0.7, `oracle should be markov-plausible; got ${oracle.markovPlausibleFrac}`);

  // A poor/absent estimate LOSES it: residual carries the factor, FDR leaks above q.
  assert.ok(poor.stoppedEbhFdr > 0.1, `poor common-mode should leak above q; got ${poor.stoppedEbhFdr}`);
  assert.ok(none.stoppedEbhFdr > 0.1, `no common-mode removal should leak above q; got ${none.stoppedEbhFdr}`);
  assert.ok(none.markovPlausibleFrac < 0.15, `none should be markov-implausible; got ${none.markovPlausibleFrac}`);

  // The diagnostic and the consequence both degrade MONOTONICALLY (small Monte-Carlo slack).
  for (let i = 1; i < rows.length; i++) {
    assert.ok(rows[i].meanCondLag1 >= rows[i - 1].meanCondLag1 - 0.02,
      `condLag1 should be nondecreasing as quality degrades (${rows[i - 1].quality}→${rows[i].quality})`);
    assert.ok(rows[i].stoppedEbhFdr >= rows[i - 1].stoppedEbhFdr - 0.05,
      `FDR should be nondecreasing as quality degrades (${rows[i - 1].quality}→${rows[i].quality})`);
  }
});

test('Wall B: the e-detector beats the terminal UI e-value on transient faults', () => {
  const { eDetect, terminalDetect } = wallBRecap();
  assert.ok(eDetect >= 0.6, `e-detector should recover transient power; got ${eDetect}`);
  assert.ok(eDetect - terminalDetect >= 0.4, `e-detector should beat terminal by a wide margin; e=${eDetect} t=${terminalDetect}`);
});

test('Fleet: the adjuster controls SupFDR ≤ q where the naive running max does not', () => {
  const { naive, adjusted, q } = fleetRecap();
  assert.ok(adjusted <= q, `adjusted SupFDR should be ≤ q; got ${adjusted}`);
  assert.ok(naive > adjusted, `naive should be worse than adjusted; naive=${naive} adjusted=${adjusted}`);
  assert.ok(naive > 0.04, `naive should be elevated toward the q boundary; got ${naive}`);
});
