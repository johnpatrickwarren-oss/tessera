// test/q65-ds-integration-feed.test.ts — Phase 3 SLICE 3 Wave 10 WU-Phase3-3B (R65).
//
// Runtime tests binding AC-R65-1 through AC-R65-16. AC-R65-17 (tsc exit) and
// AC-R65-18 (test count) are verified via coordination/specs/Q-R65-EMPIRICAL.sh.
//
// Test architecture: in-process mock HTTP server (`http.createServer` on
// ephemeral port) + pure-function projection tests. See Q-R65-SPEC.md § 0.3.

import { describe, test } from 'node:test';
import { strict as assert } from 'node:assert';
import { existsSync, readFileSync } from 'node:fs';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { execSync } from 'node:child_process';

import {
  verdictGroupToFeedRequest,
  TesseraToDsFeedClient,
  type FeedResult,
} from '@johnpatrickwarren-oss/deploysignal-engine/ds-integration/feed';
import {
  TESSERA_TO_DS_FEED_ENDPOINT,
  type TesseraToDsAuthHeaders,
} from '@johnpatrickwarren-oss/deploysignal-engine/ds-integration/feed-contract';
import type { VerdictGroup, FusedVerdict } from '@johnpatrickwarren-oss/deploysignal-engine/types/verdict';

// ── Synthetic VerdictGroup builders ─────────────────────────────────────

function makeFusedVerdict(
  families: Array<'A' | 'B' | 'C' | 'D' | 'E'>,
  tick: number,
): FusedVerdict {
  // Minimal FusedVerdict shape; projection only reads `firing_families`.
  // Other fields are populated with placeholder values to satisfy the type.
  return {
    deploy_ref: 'deploy-x',
    tick,
    firing_families: families,
    total_alpha_spent: 0,
    // Other FusedVerdict fields default to engine-acceptable values; the
    // projection does not read them. The cast is necessary because the
    // FusedVerdict type carries additional fields the projection ignores.
  } as unknown as FusedVerdict;
}

function makeGroup(opts: {
  group_id?: string;
  deploy_id?: string;
  window_start_ts?: number;
  window_end_ts?: number;
  cluster_event_id?: string;
  firing_verdicts?: FusedVerdict[];
  confidence?: number;
}): VerdictGroup {
  return {
    group_id: opts.group_id ?? 'group-deploy-x-100',
    deploy_id: opts.deploy_id ?? 'deploy-x',
    window_start_ts: opts.window_start_ts ?? 100,
    window_end_ts: opts.window_end_ts ?? 400,
    cluster_event_id: opts.cluster_event_id,
    verdicts: opts.firing_verdicts ?? [],
    firing_verdicts: opts.firing_verdicts ?? [],
    root_cause: null,
    confidence: opts.confidence ?? 0.5,
    late_arrival_verdicts: [],
    closed: true,
    closed_at_ts: opts.window_end_ts ?? 400,
  };
}

// ── Mock HTTP server fixture ────────────────────────────────────────────

interface MockServer {
  url_host: string;
  url_port: number;
  received_method: string | null;
  received_url: string | null;
  received_headers: Record<string, string | string[] | undefined> | null;
  received_body: string | null;
  close: () => Promise<void>;
}

async function startMockServer(opts: {
  respond_status: number;
  respond_body: string;
}): Promise<MockServer> {
  const state: {
    method: string | null;
    url: string | null;
    headers: Record<string, string | string[] | undefined> | null;
    body: string | null;
  } = { method: null, url: null, headers: null, body: null };

  const server = http.createServer((req, res) => {
    state.method = req.method ?? null;
    state.url = req.url ?? null;
    state.headers = req.headers;
    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => chunks.push(c));
    req.on('end', () => {
      state.body = Buffer.concat(chunks).toString('utf8');
      res.statusCode = opts.respond_status;
      res.setHeader('content-type', 'application/json');
      res.end(opts.respond_body);
    });
  });

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const addr = server.address() as AddressInfo;

  return {
    url_host: '127.0.0.1',
    url_port: addr.port,
    get received_method() {
      return state.method;
    },
    get received_url() {
      return state.url;
    },
    get received_headers() {
      return state.headers;
    },
    get received_body() {
      return state.body;
    },
    close: () =>
      new Promise<void>((resolve, reject) =>
        server.close((err) => (err ? reject(err) : resolve())),
      ),
  };
}

const authHeaders: TesseraToDsAuthHeaders = {
  'x-tessera-instance-id': 'tessera-instance-1',
  authorization: 'Bearer test-token',
};

// ── AC bindings ─────────────────────────────────────────────────────────

describe('R65 WU-Phase3-3B Tessera→DS feed adapter', () => {
  test('AC-R65-1: engine/ds-integration/feed.ts exists', () => {
    assert.equal(existsSync('engine/ds-integration/feed.ts'), true);
  });

  test('AC-R65-2: engine/ds-integration/index.ts has 3 export-star lines', () => {
    const src = readFileSync('engine/ds-integration/index.ts', 'utf8');
    const matches = src.match(/^export \* from /gm);
    assert.equal(matches?.length ?? 0, 3);
  });

  test('AC-R65-3: verdictGroupToFeedRequest produces contract_version === "v1"', () => {
    const group = makeGroup({});
    const req = verdictGroupToFeedRequest(group, 500);
    assert.equal(req.contract_version, 'v1');
    assert.equal(req.emitted_at_ts, 500);
  });

  test('AC-R65-4: payload preserves correlational_not_causal: true literal (A16)', () => {
    const group = makeGroup({});
    const req = verdictGroupToFeedRequest(group, 500);
    // Strict equality on `true` (not truthy-check; not boolean coercion).
    assert.strictEqual(req.verdict_group.correlational_not_causal, true);
  });

  test('AC-R65-5: firing_family_count = Set-dedup over firing_verdicts × firing_families', () => {
    // Two firing verdicts: {A, B} and {B, C}. Dedup family set: {A, B, C}. Count = 3.
    // (NOT 4 — that would be the verdict-family pair count.)
    // (NOT 2 — that would be the verdict count.)
    const fv1 = makeFusedVerdict(['A', 'B'], 1);
    const fv2 = makeFusedVerdict(['B', 'C'], 2);
    const group = makeGroup({ firing_verdicts: [fv1, fv2] });
    const req = verdictGroupToFeedRequest(group, 500);
    assert.equal(req.verdict_group.firing_family_count, 3);
  });

  test('AC-R65-6: cluster_event_id propagated when present; omitted when absent', () => {
    const withEvent = makeGroup({ cluster_event_id: 'evt-42' });
    const withoutEvent = makeGroup({});

    const reqWith = verdictGroupToFeedRequest(withEvent, 500);
    const reqWithout = verdictGroupToFeedRequest(withoutEvent, 500);

    assert.equal(reqWith.verdict_group.cluster_event_id, 'evt-42');
    assert.equal('cluster_event_id' in reqWithout.verdict_group, false);
  });

  test('AC-R65-7: post() sends to TESSERA_TO_DS_FEED_ENDPOINT.path with method "POST"', async () => {
    const server = await startMockServer({
      respond_status: 201,
      respond_body: JSON.stringify({
        contract_version: 'v1',
        correlation_key: 'k1',
        status: 'accepted',
      }),
    });
    try {
      const client = new TesseraToDsFeedClient({
        host: server.url_host,
        port: server.url_port,
      });
      const req = verdictGroupToFeedRequest(makeGroup({}), 500);
      await client.post(req, authHeaders);
      assert.equal(server.received_method, 'POST');
      assert.equal(server.received_method, TESSERA_TO_DS_FEED_ENDPOINT.method);
      assert.equal(server.received_url, TESSERA_TO_DS_FEED_ENDPOINT.path);
      assert.equal(server.received_url, '/v1/tessera/verdict-groups');
    } finally {
      await server.close();
    }
  });

  test('AC-R65-8: auth headers (x-tessera-instance-id + authorization) propagated', async () => {
    const server = await startMockServer({
      respond_status: 201,
      respond_body: JSON.stringify({
        contract_version: 'v1',
        correlation_key: 'k2',
        status: 'accepted',
      }),
    });
    try {
      const client = new TesseraToDsFeedClient({
        host: server.url_host,
        port: server.url_port,
      });
      const req = verdictGroupToFeedRequest(makeGroup({}), 500);
      await client.post(req, authHeaders);
      assert.equal(
        server.received_headers?.['x-tessera-instance-id'],
        'tessera-instance-1',
      );
      assert.equal(server.received_headers?.authorization, 'Bearer test-token');
    } finally {
      await server.close();
    }
  });

  test('AC-R65-9: 4xx response → FeedError kind "http_4xx" + status_code preserved', async () => {
    const server = await startMockServer({
      respond_status: 400,
      respond_body: 'bad request',
    });
    try {
      const client = new TesseraToDsFeedClient({
        host: server.url_host,
        port: server.url_port,
      });
      const req = verdictGroupToFeedRequest(makeGroup({}), 500);
      const result: FeedResult = await client.post(req, authHeaders);
      assert.equal(result.ok, false);
      if (result.ok === false) {
        assert.equal(result.error.kind, 'http_4xx');
        assert.equal(result.error.status_code, 400);
      }
    } finally {
      await server.close();
    }
  });

  test('AC-R65-10: 5xx response → FeedError kind "http_5xx" + status_code preserved', async () => {
    const server = await startMockServer({
      respond_status: 503,
      respond_body: 'service unavailable',
    });
    try {
      const client = new TesseraToDsFeedClient({
        host: server.url_host,
        port: server.url_port,
      });
      const req = verdictGroupToFeedRequest(makeGroup({}), 500);
      const result: FeedResult = await client.post(req, authHeaders);
      assert.equal(result.ok, false);
      if (result.ok === false) {
        assert.equal(result.error.kind, 'http_5xx');
        assert.equal(result.error.status_code, 503);
      }
    } finally {
      await server.close();
    }
  });

  test('AC-R65-11: network error → FeedError kind "network_error"', async () => {
    // No server listening on this port; expect ECONNREFUSED.
    const client = new TesseraToDsFeedClient({
      host: '127.0.0.1',
      port: 1,  // Reserved port; refuses connection.
    });
    const req = verdictGroupToFeedRequest(makeGroup({}), 500);
    const result: FeedResult = await client.post(req, authHeaders);
    assert.equal(result.ok, false);
    if (result.ok === false) {
      assert.equal(result.error.kind, 'network_error');
    }
  });

  test('AC-R65-12: invalid JSON response → FeedError kind "invalid_response"', async () => {
    const server = await startMockServer({
      respond_status: 200,
      respond_body: 'not-json',
    });
    try {
      const client = new TesseraToDsFeedClient({
        host: server.url_host,
        port: server.url_port,
      });
      const req = verdictGroupToFeedRequest(makeGroup({}), 500);
      const result: FeedResult = await client.post(req, authHeaders);
      assert.equal(result.ok, false);
      if (result.ok === false) {
        assert.equal(result.error.kind, 'invalid_response');
        assert.match(result.error.reason, /JSON parse error/);
      }
    } finally {
      await server.close();
    }
  });

  test('AC-R65-13: shape-mismatch JSON response → FeedError kind "invalid_response"', async () => {
    const server = await startMockServer({
      respond_status: 200,
      // Missing required `correlation_key` field; shape check fails.
      respond_body: JSON.stringify({ contract_version: 'v1', status: 'accepted' }),
    });
    try {
      const client = new TesseraToDsFeedClient({
        host: server.url_host,
        port: server.url_port,
      });
      const req = verdictGroupToFeedRequest(makeGroup({}), 500);
      const result: FeedResult = await client.post(req, authHeaders);
      assert.equal(result.ok, false);
      if (result.ok === false) {
        assert.equal(result.error.kind, 'invalid_response');
        assert.match(result.error.reason, /shape mismatch/);
      }
    } finally {
      await server.close();
    }
  });

  test('AC-R65-14: valid response → FeedResult.ok = true + correlation_key preserved', async () => {
    const server = await startMockServer({
      respond_status: 201,
      respond_body: JSON.stringify({
        contract_version: 'v1',
        correlation_key: 'corr-key-xyz',
        status: 'accepted',
      }),
    });
    try {
      const client = new TesseraToDsFeedClient({
        host: server.url_host,
        port: server.url_port,
      });
      const req = verdictGroupToFeedRequest(makeGroup({}), 500);
      const result: FeedResult = await client.post(req, authHeaders);
      assert.equal(result.ok, true);
      if (result.ok === true) {
        assert.equal(result.response.correlation_key, 'corr-key-xyz');
        assert.equal(result.response.status, 'accepted');
        assert.equal(result.response.contract_version, 'v1');
      }
    } finally {
      await server.close();
    }
  });

  test('AC-R65-15: feed.ts imports TESSERA_TO_DS_FEED_ENDPOINT from feed-contract (no inline literal duplication)', () => {
    const src = readFileSync('engine/ds-integration/feed.ts', 'utf8');
    // Import statement present:
    assert.match(src, /TESSERA_TO_DS_FEED_ENDPOINT[^;]*from\s+'\.\/feed-contract'/s);
    // Endpoint path literal NOT inlined in feed.ts (only the import path itself):
    const pathOccurrences = (src.match(/'\/v1\/tessera\/verdict-groups'/g) || []).length;
    assert.equal(pathOccurrences, 0);
  });

  test('AC-R65-16: anti-scope diff round-start..CHORE_A_SHA ⊆ ALLOWED_SET', () => {
    // ⚠ Two-state AC. At chore-A pre-injection: CHORE_A_SHA is the placeholder
    // literal '<INJECTED-AT-CHORE-B>' which is not a valid git ref → this
    // test FAILS by construction (pre-documented per Q-R65-SPEC.md § 5.4 +
    // § 6.1 #1 carve-out for R56 MINOR-1 two-state mismatch). At chore-B
    // post-injection: the literal is replaced with the actual chore-A SHA
    // and this test PASSES.
    const ROUND_START_SHA = '59a03d0';
    const CHORE_A_SHA = 'e8d0cd1d7634c0ec7ba1d66f4f3808f87e9c357b';
    const ALLOWED_SET = new Set<string>([
      'coordination/MEMORIAL.md',
      'coordination/NEXT-ROLE.md',
      'coordination/specs/Q-R65-EMPIRICAL.sh',
      'coordination/specs/Q-R65-SPEC-AUDIT.md',
      'coordination/specs/Q-R65-SPEC.md',
      'engine/ds-integration/feed.ts',
      'engine/ds-integration/index.ts',
      'test/q65-ds-integration-feed.test.ts',
      // Conditional 9th entry (DIAGNOSTIC-R65-*.md) included opportunistically:
      // if a DIAGNOSTIC was written this round, it appears here. Pattern-match
      // via Set.has() — absence is fine.
    ]);
    const diff = execSync(
      `git diff ${ROUND_START_SHA}..${CHORE_A_SHA} --name-only`,
      { encoding: 'utf8' },
    )
      .trim()
      .split('\n')
      .filter((p) => p.length > 0);
    for (const path of diff) {
      const isDiagnostic = /^coordination\/diagnostics\/DIAGNOSTIC-R65-.+\.md$/.test(path);
      assert.ok(
        ALLOWED_SET.has(path) || isDiagnostic,
        `unauthorized path in diff: ${path}`,
      );
    }
  });
});
