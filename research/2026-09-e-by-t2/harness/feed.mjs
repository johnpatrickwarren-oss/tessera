// research/2026-09-e-by-t2/harness/feed.mjs — the study feed: `bundleFeed` (tools/telemetry-source.ts:149–184)
// with a monitoring-window offset (PREREGISTRATION §1 fact 1). At monStart = 0 it must equal the shipped feed
// cycle for cycle; P4 (v) checks that. Shipped code is not modified.
import { ROOT, require } from './config.mjs';
import { join } from 'node:path';

const { loadScenarioBundle } = require(join(ROOT, 'tools/clustersynth-scenario.js'));
const { loadControlPairs } = require(join(ROOT, 'tools/clustersynth-mode-b.js'));

const ser = (b, shard, counter) => b.series.get(`${shard}\0${counter}`);

function usablePairs(healthy, mon, pairs, counters) {
  const usable = new Map();
  for (const c of counters) {
    usable.set(c, pairs.filter((p) => ser(healthy, p.treatment, c) && ser(healthy, p.control, c) && ser(mon, p.treatment, c) && ser(mon, p.control, c)));
  }
  return usable;
}

/** Load both bundles once; returns the feed plus the loaded bundles (the truth needs the mon labels). */
export function loadPair(healthyDir, monDir) {
  return { healthy: loadScenarioBundle(healthyDir), mon: loadScenarioBundle(monDir), pairs: loadControlPairs(monDir) };
}

export function studyFeed({ healthy, mon, pairs }, nCycles, monStart) {
  const counters = mon.counters.map((c) => c.name);
  const usable = usablePairs(healthy, mon, pairs, counters);
  const tWin = mon.T - monStart;
  return {
    async baseline() {
      return {
        dtSeconds: healthy.dt_s,
        counters: counters.map((c) => ({
          counter: c,
          units: (usable.get(c) ?? []).map((p) => ({ shard: p.treatment, treatment: ser(healthy, p.treatment, c), control: ser(healthy, p.control, c) })),
        })).filter((cb) => cb.units.length),
      };
    },
    async poll(k) {
      if (k >= nCycles) return null;
      const monEnd = monStart + Math.floor(((k + 1) / nCycles) * tWin);
      const calLo = Math.floor((k / nCycles) * healthy.T), calHi = Math.floor(((k + 1) / nCycles) * healthy.T);
      return counters.map((c) => {
        const ps = usable.get(c) ?? [];
        return {
          counter: c,
          detection: ps.map((p) => ({ shard: p.treatment, treatment: ser(mon, p.treatment, c).slice(monStart, monEnd), control: ser(mon, p.control, c).slice(monStart, monEnd) })),
          cohort: ps.map((p) => ({ treatment: ser(healthy, p.treatment, c).slice(calLo, calHi), control: ser(healthy, p.control, c).slice(calLo, calHi) })),
        };
      }).filter((w) => w.detection.length);
    },
  };
}

/** Drain a feed into its cycles (for the P4 (v) equality check against the shipped bundleFeed). */
export async function drain(feed, nCycles) {
  const out = [await feed.baseline()];
  for (let k = 0; k < nCycles; k++) out.push(await feed.poll(k));
  return out;
}
