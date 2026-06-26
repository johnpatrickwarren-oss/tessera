// tools/clustersynth-topology.ts — parse a clustersynth GB200 TopologySnapshot
// into the per-shard factor structure the engine fleet kit consumes.
//
// clustersynth (github.com/johnpatrickwarren-oss/clustersynth) emits a hierarchy:
//   rack --contains--> superchip --contains--> gpu_shard
//   psu  --power_supply--> superchip     (the power domain feeding a tray)
//   cz   --cooling--> rack               (the cooling zone serving a rack)
//   (pod --contains--> rack at the larger tiers; cluster --contains--> pod)
//
// From it we derive, per gpu_shard, its domain under each common-mode FACTOR KIND
// (cooling_zone, psu, pod-or-rack). Two consumer shapes are produced:
//   - factorPartitions / localizationGroups for `localizeFaults` (the engine
//     estimates the detection common-mode from this crossed structure);
//   - a flat `domains` list + per-shard `membership` (flat domain indices) for
//     `instrumentedCommonModeResiduals` (one MEASURED signal per domain).
//
// Tessera-original; NOT vendored.

import type { TopologySnapshot } from '@johnpatrickwarren-oss/deploysignal-engine/types/verdict';

/** Structural view of a topology node/edge (clustersynth uses `from`/`to` on edges). */
interface Node { id: string; kind: string; }
interface Edge { from: string; to: string; relationship: string; }

export interface ParsedTopology {
  /** gpu_shard ids in sorted order — defines the shard index used everywhere downstream. */
  shardIds: string[];
  nShards: number;
  /** Factor kinds in `factorPartitions` order (e.g. ['cooling_zone','psu','rack'] or '…pod'). */
  factorKinds: string[];
  /** Per kind, a length-nShards domain label per shard (≥0); -1 = shard not a member of that kind. */
  factorPartitions: number[][];
  /** Flat list of every domain instance across all kinds (one MEASURED common-mode signal each). */
  domains: ReadonlyArray<{ kind: string; id: string }>;
  /** Per shard, the flat `domains` indices it belongs to (its instrumented factor membership). */
  membership: number[][];
  /** Per-shard locality group (pod when present, else rack) for the topology-partitioned e-BH. */
  localizationGroups: number[];
  /** The node kind used for localizationGroups. */
  localizationKind: string;
}

/** Build the child→parent map from `contains` edges (parent = `from`, child = `to`). */
function containsParents(edges: Edge[]): Map<string, string> {
  const parent = new Map<string, string>();
  for (const e of edges) if (e.relationship === 'contains') parent.set(e.to, e.from);
  return parent;
}

/** All transitive `contains` ancestors of a node (nearest first). */
function ancestorsOf(id: string, parent: Map<string, string>): string[] {
  const out: string[] = [];
  let cur = id;
  const seen = new Set<string>([id]);
  while (parent.has(cur)) {
    cur = parent.get(cur)!;
    if (seen.has(cur)) break; // cycle guard
    seen.add(cur);
    out.push(cur);
  }
  return out;
}

/** Map a target node id → the source domain id, for a given edge relationship
 *  (e.g. relationship 'cooling': cz → rack gives rack-id → cz-id). */
function domainByTarget(edges: Edge[], relationship: string): Map<string, string> {
  const m = new Map<string, string>();
  for (const e of edges) if (e.relationship === relationship) m.set(e.to, e.from);
  return m;
}

/** Assign deterministic integer labels (sorted by id) to a set of domain ids. */
function labelMap(ids: Iterable<string>): Map<string, number> {
  const sorted = [...new Set(ids)].sort();
  return new Map(sorted.map((id, i) => [id, i]));
}

/** Resolve, per gpu_shard, the domain id under a factor kind via its ancestor set:
 *  the first ancestor that is a key of `targetToDomain` (cooling/power), or the
 *  first ancestor of `ancestorKind` (rack/pod). Returns null if unresolved. */
function resolveDomain(
  ancestors: string[],
  opts: { targetToDomain?: Map<string, string>; ancestorKind?: string; kindOf: Map<string, string> },
): string | null {
  if (opts.targetToDomain) {
    for (const a of ancestors) { const d = opts.targetToDomain.get(a); if (d !== undefined) return d; }
    return null;
  }
  for (const a of ancestors) if (opts.kindOf.get(a) === opts.ancestorKind) return a;
  return null;
}

/** Parse a clustersynth TopologySnapshot into the per-shard factor structure. */
export function parseTopology(snap: TopologySnapshot): ParsedTopology {
  const nodes = snap.nodes as unknown as Node[];
  const edges = snap.edges as unknown as Edge[];
  const kindOf = new Map<string, string>(nodes.map((n) => [n.id, n.kind]));
  const parent = containsParents(edges);

  const shardIds = nodes.filter((n) => n.kind === 'gpu_shard').map((n) => n.id).sort();
  const nShards = shardIds.length;

  const coolingByRack = domainByTarget(edges, 'cooling');        // rack-id → cz-id
  const powerBySuperchip = domainByTarget(edges, 'power_supply'); // superchip-id → psu-id
  const hasPod = nodes.some((n) => n.kind === 'pod');
  const localityKind = hasPod ? 'pod' : 'rack';

  // Per shard, resolve its cooling / power / locality domain ids.
  const ancestorsByShard = shardIds.map((id) => ancestorsOf(id, parent));
  const coolingIds = shardIds.map((_, i) => resolveDomain(ancestorsByShard[i], { targetToDomain: coolingByRack, kindOf }));
  const powerIds = shardIds.map((_, i) => resolveDomain(ancestorsByShard[i], { targetToDomain: powerBySuperchip, kindOf }));
  const localityIds = shardIds.map((_, i) => resolveDomain(ancestorsByShard[i], { ancestorKind: localityKind, kindOf }));

  const factorKinds = ['cooling_zone', 'psu', localityKind];
  const idsByKind = [coolingIds, powerIds, localityIds];
  const labelByKind = idsByKind.map((ids) => labelMap(ids.filter((x): x is string => x !== null)));
  const factorPartitions = idsByKind.map((ids, k) =>
    ids.map((id) => (id === null ? -1 : labelByKind[k].get(id)!)));

  // Flat domain list + per-shard membership for the instrumented (measured-signal) path.
  const domains: { kind: string; id: string }[] = [];
  const domainIndex = new Map<string, number>(); // "kind\0id" → flat index
  const keyOf = (kind: string, id: string): string => `${kind}\0${id}`;
  for (let k = 0; k < factorKinds.length; k++) {
    for (const id of [...labelByKind[k].keys()]) {
      domainIndex.set(keyOf(factorKinds[k], id), domains.length);
      domains.push({ kind: factorKinds[k], id });
    }
  }
  const membership = shardIds.map((_, i) => {
    const out: number[] = [];
    for (let k = 0; k < factorKinds.length; k++) {
      const id = idsByKind[k][i];
      if (id !== null) out.push(domainIndex.get(keyOf(factorKinds[k], id))!);
    }
    return out;
  });

  const localityLabel = labelByKind[2];
  const localizationGroups = localityIds.map((id) => (id === null ? -1 : localityLabel.get(id)!));

  return {
    shardIds, nShards, factorKinds, factorPartitions,
    domains, membership, localizationGroups, localizationKind: localityKind,
  };
}
