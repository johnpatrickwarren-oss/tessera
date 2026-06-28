// test/control-triad.test.ts — the control-triad PROTOTYPE (ADR 0022 candidate). Locks the two results that
// say the triad is worth building: a second control twin gives a clean per-control null that (1) detects a
// contaminated control where the heterogeneous cohort cannot, and (2) avoids the sign-blind false positive
// the twin-PAIR detector (ADR 0021) suffers — both under heterogeneous loadings.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runTriadExperiments } from '../tools/control-triad.js';

test('EXP1: the triad sibling (c1−c2) detects a contaminated control where the cohort cannot', () => {
  for (const seed of [1, 2, 3]) {
    const { exp1 } = runTriadExperiments(seed, 0.1);
    assert.ok(exp1.triadFdp <= 0.1 + 1e-9, `seed ${seed}: triad FDP ${exp1.triadFdp} should be ≤ q`);
    assert.ok(exp1.triadRecall > 0.9, `seed ${seed}: triad recall ${exp1.triadRecall} should be high`);
    // the cohort null is defeated by heterogeneous loadings — strictly worse than the matched sibling.
    assert.ok(exp1.cohortFdp > exp1.triadFdp + 0.1, `seed ${seed}: cohort FDP ${exp1.cohortFdp} should be far worse than triad ${exp1.triadFdp}`);
  }
});

test('EXP2: triad-protected detection avoids the control-only false positive the pair detector suffers', () => {
  for (const seed of [1, 2, 3]) {
    const { exp2 } = runTriadExperiments(seed, 0.1);
    assert.ok(exp2.pairFdp > 0.2, `seed ${seed}: the pair detector should false-fire on contaminated controls (FDP ${exp2.pairFdp})`);
    assert.ok(exp2.triadFdp <= 0.1 + 1e-9, `seed ${seed}: triad FDP ${exp2.triadFdp} should be ≤ q`);
    assert.ok(exp2.triadRecall > 0.9, `seed ${seed}: triad keeps full recall on real treatment faults (${exp2.triadRecall})`);
  }
});
