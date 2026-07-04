// test/dcgmi-diag.test.ts — the deployment-side wrapper for the diag-probe sink. The invariants:
// EXIT-CODE CONTRACT (0 pass · 1 fault · 2 orchestration error) with the JSON verdict winning when
// parseable and unparseable output NEVER claimed as a pass; an unresolvable/unreachable host is an
// orchestration error, not a diagnosis; the schema walk survives DCGM's version-to-version JSON
// nesting changes (it keys on the stable `status` atom); and the exec subcommand reuses the same
// shard→host mapping for cordon/uncordon with {host}/{shard} substitution and exit passthrough.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import {
  resolveHost, interpretDiagJson, parseDiagStdout, main,
  EXIT_PASS, EXIT_FAULT, EXIT_ORCH,
} from '../tools/dcgmi-diag.js';

// A DCGM-v3-shaped document; the walker must not depend on this exact nesting.
const FIXTURE_PASS = {
  'DCGM GPU Diagnostic': {
    test_categories: [
      {
        category: 'Deployment',
        tests: [
          { name: 'Denylist', results: [{ gpu_ids: '0,1,2,3', status: 'Pass' }] },
          { name: 'NVML Library', results: [{ status: 'Pass' }] },
        ],
      },
      {
        category: 'Integration',
        tests: [{ name: 'PCIe', results: [{ gpu_id: 0, status: 'Pass' }, { gpu_id: 1, status: 'Skip' }] }],
      },
    ],
  },
};
const FIXTURE_FAIL = JSON.parse(JSON.stringify(FIXTURE_PASS));
FIXTURE_FAIL['DCGM GPU Diagnostic'].test_categories[1].tests[0].results[1] = { gpu_id: 1, status: 'Fail' };
const FIXTURE_WARN = JSON.parse(JSON.stringify(FIXTURE_PASS));
FIXTURE_WARN['DCGM GPU Diagnostic'].test_categories[0].tests[1].results[0] = { status: 'Warn' };

// ─── host resolution ──────────────────────────────────────────────────────────────────────────────

function hostmapFile(map: Record<string, string>): string {
  const f = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'hostmap-')), 'hosts.json');
  fs.writeFileSync(f, JSON.stringify(map));
  return f;
}

test('resolveHost: hostmap wins, a missing shard THROWS (never identity-falls-back to a wrong host)', () => {
  const f = hostmapFile({ s0: 'host-a.local' });
  assert.equal(resolveHost('s0', { hostmapFile: f }), 'host-a.local');
  assert.throws(() => resolveHost('s1', { hostmapFile: f }), /not in hostmap/);
});

test('resolveHost: template substitutes {shard}; bare identity otherwise', () => {
  assert.equal(resolveHost('s7', { template: '{shard}.gpu.local' }), 's7.gpu.local');
  assert.equal(resolveHost('node-3', {}), 'node-3');
});

// ─── JSON interpretation ──────────────────────────────────────────────────────────────────────────

test('interpretDiagJson: all-pass document → no fault; Skip does not count as fault', () => {
  const v = interpretDiagJson(FIXTURE_PASS);
  assert.equal(v.fault, false);
  assert.equal(v.findings.length, 0);
  assert.equal(v.statusesSeen, 4);
});

test('interpretDiagJson: a Fail is found with its test name and gpu id, wherever it nests', () => {
  const v = interpretDiagJson(FIXTURE_FAIL);
  assert.equal(v.fault, true);
  assert.deepEqual(v.findings, [{ test: 'PCIe', status: 'Fail', gpuIds: '1' }]);
});

test('interpretDiagJson: Warn counts only with warnAsFault', () => {
  assert.equal(interpretDiagJson(FIXTURE_WARN).fault, false);
  const v = interpretDiagJson(FIXTURE_WARN, { warnAsFault: true });
  assert.equal(v.fault, true);
  assert.equal(v.findings[0].test, 'NVML Library');
});

test('interpretDiagJson: a document with NO status fields throws (unparseable ≠ pass)', () => {
  assert.throws(() => interpretDiagJson({ hello: 'world' }), /no test statuses/);
});

test('parseDiagStdout tolerates banner lines before the JSON; no JSON throws', () => {
  const doc = parseDiagStdout('Successfully ran diagnostic.\n' + JSON.stringify(FIXTURE_PASS));
  assert.equal(interpretDiagJson(doc).fault, false);
  assert.throws(() => parseDiagStdout('command not found'), /no JSON/);
});

// ─── the diag subcommand exit contract (injected exec — no real dcgmi) ────────────────────────────

type ExecCall = { cmd: string; args: string[] };
function fakeExec(calls: ExecCall[], result: { code: number; stdout: string; stderr?: string }) {
  return async (cmd: string, args: string[]) => {
    calls.push({ cmd, args });
    return { code: result.code, stdout: result.stdout, stderr: result.stderr ?? '' };
  };
}

test('diag: pass → EXIT_PASS, with the host resolved through the map and -j requested', async () => {
  const f = hostmapFile({ s0: 'host-a.local' });
  const calls: ExecCall[] = [];
  const code = await main(['diag', '--shard', 's0', '--level', '3', '--hostmap', f],
    fakeExec(calls, { code: 0, stdout: JSON.stringify(FIXTURE_PASS) }));
  assert.equal(code, EXIT_PASS);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].cmd, 'dcgmi');
  assert.deepEqual(calls[0].args, ['diag', '-r', '3', '--host', 'host-a.local', '-j']);
});

test('diag: a failing test → EXIT_FAULT (the only code the sink confirms on)', async () => {
  const code = await main(['diag', '--shard', 's0', '--level', '1'],
    fakeExec([], { code: 0, stdout: JSON.stringify(FIXTURE_FAIL) }));
  assert.equal(code, EXIT_FAULT);
});

test('diag: JSON verdict wins over a nonzero dcgmi exit when a fault IS found', async () => {
  const code = await main(['diag', '--shard', 's0', '--level', '1'],
    fakeExec([], { code: 227, stdout: JSON.stringify(FIXTURE_FAIL) }));
  assert.equal(code, EXIT_FAULT);
});

test('diag: unparseable output → EXIT_ORCH, never claimed as a pass', async () => {
  const code = await main(['diag', '--shard', 's0', '--level', '1'],
    fakeExec([], { code: 0, stdout: 'Error: unable to establish a connection to the specified host\n' }));
  assert.equal(code, EXIT_ORCH);
});

test('diag: all-pass JSON but nonzero dcgmi exit → EXIT_ORCH (something is off; do not claim a pass)', async () => {
  const code = await main(['diag', '--shard', 's0', '--level', '1'],
    fakeExec([], { code: 3, stdout: JSON.stringify(FIXTURE_PASS) }));
  assert.equal(code, EXIT_ORCH);
});

test('diag: dcgmi missing / spawn failure → EXIT_ORCH', async () => {
  const code = await main(['diag', '--shard', 's0', '--level', '1'],
    fakeExec([], { code: -1, stdout: '', stderr: 'ENOENT' }));
  assert.equal(code, EXIT_ORCH);
});

test('diag: an unresolvable shard → EXIT_ORCH without ever invoking dcgmi', async () => {
  const f = hostmapFile({ s0: 'host-a.local' });
  const calls: ExecCall[] = [];
  const code = await main(['diag', '--shard', 'sX', '--level', '1', '--hostmap', f],
    fakeExec(calls, { code: 0, stdout: JSON.stringify(FIXTURE_PASS) }));
  assert.equal(code, EXIT_ORCH);
  assert.equal(calls.length, 0);
});

// ─── the exec subcommand (cordon/uncordon reuse the same mapping) ─────────────────────────────────

test('exec: substitutes {host}/{shard} and passes the child exit code through', async () => {
  const f = hostmapFile({ s0: 'host-a.local' });
  const calls: ExecCall[] = [];
  const ok = await main(['exec', '--shard', 's0', '--hostmap', f, '--', 'kubectl', 'cordon', '{host}', '--reason', 'probe:{shard}'],
    fakeExec(calls, { code: 0, stdout: '' }));
  assert.equal(ok, 0);
  assert.equal(calls[0].cmd, 'kubectl');
  assert.deepEqual(calls[0].args, ['cordon', 'host-a.local', '--reason', 'probe:s0']);

  const fail = await main(['exec', '--shard', 's0', '--hostmap', f, '--', 'kubectl', 'cordon', '{host}'],
    fakeExec([], { code: 4, stdout: '' }));
  assert.equal(fail, 4, 'child failure passes through so the sink sees it');
});
