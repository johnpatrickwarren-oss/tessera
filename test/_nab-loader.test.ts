// test/_nab-loader.test.ts — ACs for the NAB ingestion adapter (AC-1..AC-3).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseTs, parseNabCsv, computeIsAnomaly, windowsForKey } from '../tools/_nab-loader.js';

test('AC-1: parseTs is UTC + timezone-independent (manual parse, not Date.parse)', () => {
  assert.equal(parseTs('2014-04-10 00:04:00'), Date.UTC(2014, 3, 10, 0, 4, 0));
  assert.equal(parseTs('2014-04-10 07:15:00.000000'), Date.UTC(2014, 3, 10, 7, 15, 0));
  // fractional seconds floored to ms
  assert.equal(parseTs('2014-04-10 07:15:00.500000'), Date.UTC(2014, 3, 10, 7, 15, 0, 500));
  assert.throws(() => parseTs('not-a-date'), /unparseable/);
});

test('AC-1: parseNabCsv parses header + rows in order, tolerates blank trailing lines', () => {
  const txt = 'timestamp,value\n2014-04-10 00:04:00,91.95\n2014-04-10 00:09:00,94.8\n\n';
  const { ts_epoch_ms, values } = parseNabCsv(txt);
  assert.deepEqual(values, [91.95, 94.8]);
  assert.equal(ts_epoch_ms[0], Date.UTC(2014, 3, 10, 0, 4, 0));
  assert.throws(() => parseNabCsv('timestamp,value\n2014-04-10 00:04:00,abc\n'), /non-numeric/);
});

test('AC-2: computeIsAnomaly marks rows inside any window (inclusive)', () => {
  const ts = [10, 20, 30, 40, 50];
  const flags = computeIsAnomaly(ts, [[20, 30]]);
  assert.deepEqual(flags, [false, true, true, false, false]); // 20 and 30 inclusive
  assert.deepEqual(computeIsAnomaly(ts, []), [false, false, false, false, false]); // empty -> all normal
});

test('AC-3: windowsForKey returns null for an absent key (no silent all-normal)', () => {
  const combined = { 'cat/a.csv': [['2014-04-10 00:00:00', '2014-04-10 01:00:00']] as [string, string][], 'cat/b.csv': [] as [string, string][] };
  const w = windowsForKey(combined, 'cat/a.csv');
  assert.ok(w && w.length === 1 && w[0][0] === Date.UTC(2014, 3, 10, 0, 0, 0));
  assert.deepEqual(windowsForKey(combined, 'cat/b.csv'), []); // present-but-empty is [], not null
  assert.equal(windowsForKey(combined, 'cat/missing.csv'), null); // absent -> null
});
