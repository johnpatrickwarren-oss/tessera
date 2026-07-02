// tools/locality-drilldown.ts — COARSE-TO-FINE locality drill-down (2026-07-02 audit F11/W3b).
//
// WHY. Registry N6 (ADR 0015) killed the two-level hierarchical-FDR *GUARANTEE* — it did NOT kill
// hierarchical *localization*. What the pipeline lacked is the honest middle N6 permits: descend the
// topology coarse→fine, testing group-level evidence at each level, and report the FINEST level at
// which the evidence identifies — abstaining below it. This structurally prevents the failure the
// audit called out (claiming shard-level locality on rack-level evidence): a shard is only ever named
// if the shard level itself rejects.
//
// CONSTRUCTION. Per level, each group's evidence is the ARITHMETIC MEAN of its members' e-values —
// the mean of valid e-values is a valid e-value, so the group statistic is calibrated evidence whose
// validity is INHERITED from the inputs (Mode B callers pass the min-triad contrast e-values, which
// makes this the GREYHOUND division of labor: contrast evidence for localization). Level 0 runs e-BH
// across all groups at q; level k+1 tests ONLY the children of level-k rejections, again by e-BH at q.
//
// HONEST SCOPE (read before quoting error rates):
//   • The level-0 e-BH satisfies FDR ≤ q across level-0 groups (valid inputs ⇒ Wang–Ramdas).
//   • DEEPER levels are tested CONDITIONAL ON DESCENT — a data-dependent selection. No global,
//     selection-adjusted, or per-level unconditional FDR theorem is claimed for them (that is
//     exactly the ambitious version N6 proved dead three ways). The construction's value is
//     STRUCTURED localization with abstention, not a new guarantee.
//   • Group means have power when a group contains STRONG members (concentrated faults). A diffuse
//     weak group-level fault (every member slightly shifted, none individually evidential) does NOT
//     inflate a mean of e-values — detecting that class needs a dedicated group-vs-fleet detector on
//     group AGGREGATES (ADR 0015 v2, still unbuilt). Abstention on that class is correct behavior
//     here, not a bug.
//
// Tessera-original; NOT vendored.

import { eBenjaminiHochberg } from '@johnpatrickwarren-oss/deploysignal-engine/fleet/e-bh';

/** One level of the hierarchy, coarse→fine: `groups[i]` = the group id of shard i at this level.
 *  The FINEST level is typically the shard itself (groups[i] = i). */
export interface DrillLevel { name: string; groups: ReadonlyArray<number>; }

export interface LevelResult {
  name: string;
  /** Group ids TESTED at this level (level 0: all; deeper: children of rejected parents). */
  tested: number[];
  /** Group ids rejected by e-BH at this level (among `tested`). */
  rejected: number[];
  /** Per rejected group: its mean e-value. */
  eValues: Map<number, number>;
}

export interface DrillDownResult {
  levels: LevelResult[];
  /** The FINEST level index at which anything was identified (−1 = nothing anywhere → full abstain). */
  finestIdentified: number;
  /** Shard indices identified at the finest (last) level — non-empty ONLY if the drill reached and
   *  rejected at the shard level. Coarser identifications are in `levels`, deliberately NOT here. */
  identifiedShards: number[];
}

const mean = (xs: number[]): number => xs.reduce((a, b) => a + b, 0) / xs.length;

/** Members of each group at a level, optionally restricted to a shard subset. */
function membersByGroup(groups: ReadonlyArray<number>, restrict?: ReadonlySet<number>): Map<number, number[]> {
  const m = new Map<number, number[]>();
  groups.forEach((g, i) => {
    if (restrict && !restrict.has(i)) return;
    let a = m.get(g); if (!a) { a = []; m.set(g, a); }
    a.push(i);
  });
  return m;
}

/** Run the coarse-to-fine drill-down. `levels` must be ordered coarse→fine; the last level should be
 *  per-shard (groups[i] = i) if shard-level identification is desired. `eValues[i]` must be a VALID
 *  e-value per shard (validity inherited — pass the Mode B min-triad contrast e-values where
 *  available; the temporal mixture e-value otherwise, with its Mode A caveats). */
export function drillDown(eValues: ReadonlyArray<number>, levels: ReadonlyArray<DrillLevel>, q = 0.1): DrillDownResult {
  const out: LevelResult[] = [];
  let restrict: ReadonlySet<number> | undefined; // shards inside rejected parents; undefined = all
  let finest = -1;
  for (let L = 0; L < levels.length; L++) {
    const byGroup = membersByGroup(levels[L].groups, restrict);
    const gids = [...byGroup.keys()].sort((a, b) => a - b);
    const gE = gids.map((g) => mean(byGroup.get(g)!.map((i) => eValues[i])));
    const sel = new Set(eBenjaminiHochberg(gE, q).selected);
    const rejected = gids.filter((_, k) => sel.has(k));
    const eMap = new Map<number, number>();
    rejected.forEach((g) => eMap.set(g, gE[gids.indexOf(g)]));
    out.push({ name: levels[L].name, tested: gids, rejected, eValues: eMap });
    if (rejected.length === 0) break; // abstain below this level — nothing to descend into
    finest = L;
    const next = new Set<number>();
    for (const g of rejected) for (const i of byGroup.get(g)!) next.add(i);
    restrict = next;
  }
  const last = out.length - 1;
  const identifiedShards = finest === levels.length - 1 && finest >= 0
    ? out[last].rejected.slice() // finest level is per-shard: group id = shard index
    : [];
  return { levels: out, finestIdentified: finest, identifiedShards };
}

/** Human-readable summary: what was identified, at which level, and where the drill abstained. */
export function renderDrillDown(r: DrillDownResult, levelNames?: string[]): string {
  const L: string[] = [];
  L.push('═══ COARSE-TO-FINE LOCALITY DRILL-DOWN (per-level e-BH on group-mean e-values) ═══');
  for (let i = 0; i < r.levels.length; i++) {
    const lv = r.levels[i];
    L.push(`  level ${i} (${lv.name}): tested ${lv.tested.length} groups → rejected ${lv.rejected.length}`
      + (lv.rejected.length ? `  [${lv.rejected.slice(0, 8).join(', ')}${lv.rejected.length > 8 ? ', …' : ''}]` : ''));
  }
  if (r.finestIdentified < 0) {
    L.push('  VERDICT: no evidence at any level — full abstention.');
  } else {
    const name = (levelNames ?? r.levels.map((l) => l.name))[r.finestIdentified];
    L.push(`  VERDICT: evidence identifies at the ${name.toUpperCase()} level` +
      (r.identifiedShards.length
        ? ` — shard-exact: [${r.identifiedShards.slice(0, 10).join(', ')}${r.identifiedShards.length > 10 ? ', …' : ''}]`
        : ' — ABSTAINING below it (no shard-level claim).'));
  }
  L.push('  NB: level 0 carries FDR ≤ q (valid inputs); deeper levels are conditional-on-descent —');
  L.push('  structured localization with abstention, NOT a hierarchical guarantee (registry N6).');
  return L.join('\n');
}
