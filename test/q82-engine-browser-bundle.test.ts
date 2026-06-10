import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

import {
  computeSnapshotHash,
  pureJsSha256,
} from '@johnpatrickwarren-oss/deploysignal-engine/topology-overlay';

// ── AC-R82-6: computeSnapshotHash sync surface preserved (Node path) ──
test('AC-R82-6: computeSnapshotHash returns a 64-char hex sync', () => {
  const snap = {
    nodes: [{ id: 'a' }, { id: 'b' }],
    edges: [{ from: 'a', to: 'b', relationship: 'contains' }],
    fetched_at_ts: 0,
    source_id: 's',
    source_version: 'v',
  };
  // Cast is required because our test snap is a minimal fixture; full type is richer.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const h = computeSnapshotHash(snap as any);
  assert.equal(typeof h, 'string', 'must return string synchronously');
  assert.ok(/^[0-9a-f]{64}$/.test(h), `expected 64-char lowercase hex; got "${h}"`);
});

// ── AC-R82-7: pureJsSha256 byte-identity with node:crypto for >= 3 FIPS vectors ──
test('AC-R82-7: pureJsSha256 matches node:crypto for FIPS test vectors', () => {
  const vectors = [
    { input: '', expected: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855' },
    { input: 'abc', expected: 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad' },
    { input: 'abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq',
      expected: '248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1' },
  ];
  for (const v of vectors) {
    const nodeHash = createHash('sha256').update(v.input).digest('hex');
    const pureHash = pureJsSha256(v.input);
    assert.equal(nodeHash, v.expected,
      `node:crypto baseline broken for ${JSON.stringify(v.input).slice(0, 25)}`);
    assert.equal(pureHash, v.expected,
      `pureJsSha256 disagrees with FIPS baseline for ${JSON.stringify(v.input).slice(0, 25)}`);
    assert.equal(nodeHash, pureHash,
      `pureJsSha256 / node:crypto divergence for ${JSON.stringify(v.input).slice(0, 25)}`);
  }
});
