// test/fleet-fdr.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { eBH, terminalEValue, fleetResiduals, runFleetFdr, eValueValidity, Q } from '../tools/fleet-fdr.js';
import { probationaryEnd } from '../tools/shadow-replay.js';

test('eBH rejects the k* largest e-values per the N/(q*k) rule', () => {
  // N=5, q=0.1 -> threshold 50/k. e=[200,150,0.5,0.5,0.5]: k=1 200>=50, k=2 150>=25, k=3 0.5<16.7.
  const rej = eBH([200, 150, 0.5, 0.5, 0.5], 0.1);
  assert.equal(rej.length, 2);
  assert.deepEqual([...rej].sort((a, b) => a - b), [0, 1]);
  // all-small e-values -> reject none
  assert.equal(eBH([0.5, 0.5, 0.5, 0.5, 0.5], 0.1).length, 0);
});

test('terminalEValue: flat series ~1 (no evidence); persistent shift -> large e-value', () => {
  const flat = new Array(800).fill(1000);
  const probEnd = probationaryEnd(flat.length);
  assert.ok(terminalEValue(flat, probEnd) <= 1, 'flat null e-value must stay ~<=1');
  const shifted = flat.map((v, i) => (i >= 400 ? v + 30 : v));
  assert.ok(terminalEValue(shifted, probEnd) >= 1 / Q, 'a persistent shift must accumulate a large e-value');
});

test('fleetResiduals removes the common-mode (per-timestamp median)', () => {
  const X = [[1, 2, 3], [1, 2, 3], [5, 6, 7]];
  const R = fleetResiduals(X);
  assert.deepEqual(R[0], [0, 0, 0]);
  assert.deepEqual(R[1], [0, 0, 0]);
  assert.deepEqual(R[2], [4, 4, 4]); // the offset shard's deviation from the fleet
});

test('root cause: whitening fixes autocorrelation; the PLUG-IN baseline is the invalidator', () => {
  const rows = eValueValidity(200);
  const get = (frag: string) => rows.find((v) => v.label.includes(frag))!;
  assert.ok(get('iid · true').valid, 'iid + true baseline is a valid e-value (E[e]<=1, P(fire)<=alpha)');
  assert.ok(!get('iid · PLUG-IN').valid, 'plug-in baseline alone invalidates the e-value (even iid)');
  assert.ok(!get('NO whitening').valid, 'AR(1) UN-whitened is invalid (ignoring autocorrelation)');
  assert.ok(get('true baseline · WHITENED').valid, 'AR(1) WHITENED with true baseline is VALID — whitening fixes autocorrelation');
  assert.ok(!get('PLUG-IN baseline · WHITENED').valid, 'plug-in baseline survives whitening -> still invalid (the root cause)');
});

test('consequence: fleet e-BH does NOT rescue the guarantee — naive, relative, AND relative+whitening all fail', () => {
  const r = runFleetFdr(); // synthetic only (no gwdg dir)
  assert.ok(r.synthetic.naive_mean_fdp > Q + 0.05, `naive FDP (${r.synthetic.naive_mean_fdp}) must exceed q`);
  assert.ok(r.synthetic.rel_mean_fdp > Q + 0.05, `fleet-relative FDP (${r.synthetic.rel_mean_fdp}) must exceed q`);
  assert.ok(r.synthetic.rel_whitened_mean_fdp > Q + 0.05, `relative+whitening FDP (${r.synthetic.rel_whitened_mean_fdp}) must ALSO exceed q — plug-in baseline survives every mitigation`);
  assert.ok(r.synthetic.rel_mean_power >= 0.5, `relative still has power (${r.synthetic.rel_mean_power}) — finds failures but drowns them`);
});
