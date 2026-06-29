// test/peer-availability.test.ts — the ADR 0022 comparable-peer AVAILABILITY study (the triad's binding
// real-world constraint, § Cost). Real in-group sibling peers (own loadings, κ-selected) replace the
// exact-copy twins. Asserts the study's load-bearing properties: availability falls with loading
// heterogeneity and rises with pool size; the min-agreement triad controls FDP where the pair detector
// (FP-dominated by contaminated peers) does not; and the κ gate makes non-comparability an availability
// cost, not an FDR risk.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { genGroup, bestPeers, studyPoint, type PeerOptions } from '../tools/peer-availability.js';

const DEF: Required<PeerOptions> = {
  groups: 12, shardsPerGroup: 24, T: 300, phi: 0.6, loadMean: 6, loadHetero: 0,
  idioSd: 0.6, faultMag: 4, faultFrac: 0.05, kappaThresh: 0.1, q: 0.1,
};

test('a matched (zero-heterogeneity) peer cancels the common-mode — tiny κ', () => {
  const g = genGroup(1, 0, { ...DEF, loadHetero: 0 }, new Set());
  const { kappas } = bestPeers(g, 0);
  assert.ok(kappas[0] < 0.05, `best matched peer κ ${kappas[0].toFixed(3)} should be ≪ 0.1`);
  assert.ok(kappas[1] < 0.05, `2nd matched peer κ ${kappas[1].toFixed(3)} should be ≪ 0.1`);
});

test('D1: availability falls with loading heterogeneity (fixed pool) and rises with pool size (fixed hetero)', () => {
  const seeds = 4;
  const lo = studyPoint(0.0, 24, seeds, DEF).avail.fracAvailable;
  const hi = studyPoint(0.8, 24, seeds, DEF).avail.fracAvailable;
  assert.ok(lo >= 0.99, `homogeneous siblings → ~all available (${lo.toFixed(3)})`);
  assert.ok(hi < lo - 0.1, `heterogeneity ↑ → availability ↓ (${hi.toFixed(3)} vs ${lo.toFixed(3)})`);

  const small = studyPoint(0.4, 8, seeds, DEF).avail.fracAvailable;
  const rack = studyPoint(0.4, 72, seeds, DEF).avail.fracAvailable;
  assert.ok(rack > small + 0.1, `bigger peer pool → more triads available (S=72 ${rack.toFixed(3)} > S=8 ${small.toFixed(3)})`);
});

test('D2: the min-agreement triad controls FDP where the pair detector (contaminated peers) does not', () => {
  // At clustersynth-realistic heterogeneity (0.4) with a rack-scale pool, real peers + min-agreement keep
  // FDP ≤ q; the bare t−c1 pair is FP-dominated by faulted peers (sign-blind contamination).
  const r = studyPoint(0.4, 72, 6, DEF).fdr;
  assert.ok(r.pairFdp > 0.3, `pair detector should be FP-dominated by contaminated peers (FDP ${r.pairFdp.toFixed(3)})`);
  assert.ok(r.triadFdp <= 0.12, `min-agreement triad controls FDP ≈ q (${r.triadFdp.toFixed(3)})`);
  assert.ok(r.triadFdp < r.pairFdp - 0.2, `triad cuts the pair detector's false positives (${r.triadFdp.toFixed(3)} ≪ ${r.pairFdp.toFixed(3)})`);
  assert.ok(r.triadRecall >= 0.7, `triad keeps usable recall on genuine faults (${r.triadRecall.toFixed(3)})`);
});

test('the κ gate makes non-comparability an AVAILABILITY cost, not an FDR risk', () => {
  // As heterogeneity grows, availability drops but the scored (κ-passing) triads still control FDP — the
  // leaky peers are excluded (unavailable) rather than admitted as false guarantees.
  const seeds = 4;
  const mid = studyPoint(0.4, 72, seeds, DEF);
  const high = studyPoint(0.8, 72, seeds, DEF);
  assert.ok(high.avail.fracAvailable < mid.avail.fracAvailable, 'availability falls with heterogeneity');
  assert.ok(mid.fdr.triadFdp <= 0.12 && high.fdr.triadFdp <= 0.15, `FDP stays ≈ q despite falling availability (${mid.fdr.triadFdp.toFixed(3)}, ${high.fdr.triadFdp.toFixed(3)})`);
});
