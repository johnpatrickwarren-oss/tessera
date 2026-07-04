// test/mini-interventions.test.ts — the Phase-2 intervention runner. The invariants: the ground-
// truth journal records the DESIGNED targets and the true duration; state-changing interventions
// ALWAYS restore (pmset 0 even after failures downstream); failed attempts are journaled too
// (ground truth includes failures — an unjournaled failed run would poison a later A/A read); and
// campaigns run sequentially with their pacing respected. All via fake deps — nothing is spawned.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runIntervention, runCampaign, E_CORES, ALL_CORES, type InterventionDeps, type InterventionSpec } from '../tools/mini-interventions.js';

function fakeDeps(journal: Array<Record<string, unknown>>, opts?: { pmsetFails?: boolean }) {
  const runs: string[][] = [];
  const started: string[][] = [];
  let t = 1_000_000_000_000;
  const deps: InterventionDeps = {
    run: async (c, a) => { runs.push([c, ...a]); return opts?.pmsetFails && c === 'pmset' && a.includes('1') ? 1 : 0; },
    start: (c, a) => { started.push([c, ...a]); return { kill: () => { /* fake */ }, done: Promise.resolve() }; },
    sleep: async (ms) => { t += ms; },
    now: () => t,
    appendJournal: (l) => journal.push(JSON.parse(l)),
  };
  return { deps, runs, started };
}

test('cpu-load: N taskpolicy workers at the requested QoS; journal carries designed E-core targets + true duration', async () => {
  const journal: Array<Record<string, unknown>> = [];
  const { deps, started } = fakeDeps(journal);
  await runIntervention({ type: 'cpu-load', durationS: 300, qos: 'background', workers: 3 }, deps);
  assert.equal(started.length, 3);
  assert.deepEqual(started[0].slice(0, 3), ['taskpolicy', '-c', 'background']);
  assert.equal(journal.length, 1);
  assert.deepEqual(journal[0].affected_shards, E_CORES);
  assert.equal((journal[0].t_end as number) - (journal[0].t_start as number), 300);
});

test('lowpower: pmset 1 … pmset 0 ALWAYS restores; all shards designed-affected', async () => {
  const journal: Array<Record<string, unknown>> = [];
  const { deps, runs } = fakeDeps(journal);
  await runIntervention({ type: 'lowpower', durationS: 60 }, deps);
  assert.deepEqual(runs, [['pmset', '-a', 'lowpowermode', '1'], ['pmset', '-a', 'lowpowermode', '0']]);
  assert.deepEqual(journal[0].affected_shards, ALL_CORES);
});

test('lowpower failure (no root): journaled as failed with NO affected shards, and throws', async () => {
  const journal: Array<Record<string, unknown>> = [];
  const { deps } = fakeDeps(journal, { pmsetFails: true });
  await assert.rejects(() => runIntervention({ type: 'lowpower', durationS: 60 }, deps), /requires root/);
  assert.equal(journal.length, 1, 'the failed attempt is still journaled — ground truth includes failures');
  assert.deepEqual(journal[0].affected_shards, []);
  assert.match(String(journal[0].failed), /requires root/);
});

test('--shards overrides the designed affected set', async () => {
  const journal: Array<Record<string, unknown>> = [];
  const { deps } = fakeDeps(journal);
  await runIntervention({ type: 'cpu-load', durationS: 60, qos: 'background', shards: ['c7'] }, deps);
  assert.deepEqual(journal[0].affected_shards, ['c7']);
});

test('campaign: sequential specs with sleepBeforeS pacing land in journal order', async () => {
  const journal: Array<Record<string, unknown>> = [];
  const { deps } = fakeDeps(journal);
  const specs: InterventionSpec[] = [
    { type: 'cpu-load', durationS: 100, qos: 'background', note: 'first' },
    { type: 'cpu-load', durationS: 100, qos: 'utility', sleepBeforeS: 600, note: 'second' },
  ];
  await runCampaign(specs, deps);
  assert.equal(journal.length, 2);
  assert.equal(journal[0].note, 'first');
  assert.equal(journal[1].note, 'second');
  assert.ok((journal[1].t_start as number) >= (journal[0].t_end as number) + 600, 'pacing respected');
});
