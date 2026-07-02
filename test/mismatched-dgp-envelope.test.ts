// test/mismatched-dgp-envelope.test.ts — R79 falsification boundary (W4, 2026-07-02 audit F12).
// Locks the committed matrix's qualitative shape: the oracle-DGP (iid) row is clean, and the
// mismatched nulls that the R72/R77 matrices never test inflate the naked detector's FPR massively.
// If a change makes these numbers drift, the committed artifact must be regenerated deliberately.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';

interface Row { name: string; nullFireRate: number; rampDetectRate: number }
const rows: Row[] = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'coverage-matrices', 'R79-mismatched-dgp.json'), 'utf8'));
const byName = new Map(rows.map((r) => [r.name, r]));

test('R79: the iid (R72/R77-regime) null is clean; detection at the default cell is full', () => {
  const iid = byName.get('iid-gaussian')!;
  assert.ok(iid.nullFireRate <= 0.02, `iid null FPR ${iid.nullFireRate}`);
  assert.ok(iid.rampDetectRate >= 0.99, `iid ramp detection ${iid.rampDetectRate}`);
});

test('R79: autocorrelated and regime-shifted nulls BREAK the naked oracle-baseline detector', () => {
  assert.ok(byName.get('ar1-rho0.9')!.nullFireRate >= 0.5, 'ρ=0.9 null fires most of the time');
  assert.ok(byName.get('ar1-rho0.95')!.nullFireRate >= 0.5, 'ρ=0.95 null fires most of the time');
  assert.ok(byName.get('regime-step')!.nullFireRate >= 0.5, 'a NULL regime step reads as a fault');
  // monotone in ρ (loose — locks the direction, not the decimals)
  assert.ok(byName.get('ar1-rho0.5')!.nullFireRate < byName.get('ar1-rho0.9')!.nullFireRate);
});

test('R79: every DGP row is present (the boundary table cannot silently shrink)', () => {
  for (const n of ['iid-gaussian', 'ar1-rho0.5', 'ar1-rho0.9', 'ar1-rho0.95', 't3-tails', 'regime-step', 'diurnal']) {
    assert.ok(byName.has(n), `missing DGP row ${n}`);
  }
});
