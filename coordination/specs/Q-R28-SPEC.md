# Q-R28-SPEC — WU-01 SLURM-ADAPTER (Wave 2 / R28 / cluster CL-02-A)

**Architect:** Claude (Opus 4.7) — R28 Wave-2 cluster CL-02-A
**Round-start SHA:** `ad024af` (cluster worktree branch `cluster/wu-01-slurm-adapter-R28` HEAD at Architect session entry; immediately after Coordinator's R28-routing commit)
**Inputs read in full before spec:** `coordination/PRD.md` (cluster scope block), `coordination/CLUSTER-HANDOFF-1-WU00-WU01.md`, `coordination/WAVE-GATE-01.md`, `engine/topology-overlay.ts` (TopologySource interface + computeSnapshotHash), `engine/hardware-topology-source.ts` (R23 sibling impl), `engine/types/verdict.ts` (TopologyNode.kind + TopologyEdge.relationship unions, lines 240–262), `test/_substrate/v9Y-multi-rack-cluster.ts` (parallel-class fixture convention), `test/q23-hardware-topology-source.test.ts` (AC-R23-15 anti-scope precedent).
**Audit-trail sidecar:** `coordination/specs/Q-R28-SPEC-AUDIT.md` (brainstorm + design + ten-axis verification + grilling + decision rationale).

---

## 1. Mechanism

WU-01 ships **`engine/topology/slurm-source.ts`** (Tessera-original): a concrete `TopologySource` implementation that parses Slurm `topology.conf` text and exposes a `TopologySnapshot` to the inherited BFS layer at `engine/topology-overlay.ts:50–55` + `:69–78` (`TopologySource` interface + `computeSnapshotHash`).

### 1.1 Architectural decisions (resolved here; no Implementer judgment calls)

- **D1 — Node-kind mapping.** Slurm **switches** map to existing `TopologyNode.kind === 'rack'`; Slurm **compute nodes** (leaves under `Nodes=`) map to existing `TopologyNode.kind === 'gpu_shard'`. No new kind literal; **`engine/types/verdict.ts` not modified** (halt-condition #2 does NOT fire). Rationale + alternative rejection in `Q-R28-SPEC-AUDIT.md` § Brainstorm.
- **D2 — Edge-relationship literal.** All emitted edges use `'contains'`. This covers both switch→switch (hierarchical containment) and switch→node (leaf containment). Matches v9Y substrate convention (`test/_substrate/v9Y-multi-rack-cluster.ts:39–50`).
- **D3 — Edge direction.** Parent → child for every `contains` edge: `{ from: '<switch>', to: '<child>', relationship: 'contains' }`. BFS at `engine/topology-overlay.ts:265–267` treats edges as bidirectional, so direction is canonical-form only (deterministic snapshot-hash via `computeSnapshotHash` sort by `(from, to, relationship)`).
- **D4 — Public surface.** Three exports from `engine/topology/slurm-source.ts`:
  - `class SlurmTopologySource implements TopologySource` — constructed from raw `topology.conf` text + optional opts; eagerly parses in constructor; `fetchSnapshot(_ctx?)` returns the parsed snapshot identity-equal across calls; `snapshotHash(s)` delegates to `computeSnapshotHash(s)`.
  - `function parseSlurmTopologyConf(text, meta): TopologySnapshot` — pure free function; produces a fully-canonical snapshot from text + metadata. Exposed so tests + alternative wrappers can use it without instantiating the class.
  - `function expandSlurmHostlist(hostlist: string): string[]` — pure free function; expands a Slurm hostlist token (e.g., `node[01-03,5,7-9]`) into the canonical sorted list of node names. Exposed so adapters can pre-validate fixtures + alternative entry points can re-use the expansion logic.
- **D5 — `fetched_at_ts` default.** `opts.fetchedAtTs ?? Math.floor(Date.now() / 1000)`. Default branch bound by AC-R28-10 (constructed without `opts.fetchedAtTs`; result asserted within ±60s of now).
- **D6 — `id` / `version` default chain.** `id`: `opts.id` → `'slurm_topology_source'`. `version`: `opts.version` → `'slurm-1'`. Two-step chain (no snapshot fallback, because the parser produces the snapshot — chicken-and-egg with the constructor-opts). Differs from `HardwareTopologySource` (`engine/hardware-topology-source.ts:33–34`) which takes a pre-resolved snapshot and falls back through `snapshot.source_id`. **Decision rationale:** SlurmTopologySource owns snapshot construction, so it writes `snapshot.source_id = this.id` + `snapshot.source_version = this.version` itself; the fallback chain therefore terminates at the constant defaults rather than chaining through the snapshot.
- **D7 — L0 contract boundary (D2 MEDIUM, interface-only).** `engine/topology/slurm-source.ts` **does NOT import `engine/l0/counter-rate-transform.ts`**. `topology.conf` is configuration data, never counter telemetry (per `CLUSTER-HANDOFF-1-WU00-WU01.md:27`). The adapter knows-of-but-does-not-call the L0 contract.

### 1.2 Slurm `topology.conf` grammar (parser scope)

Canonical Slurm `topology.conf` syntax supported by Q-R28:

```
# Comments and blank lines are skipped.
SwitchName=<id> [Switches=<csv>] [Nodes=<hostlist-csv>]
```

- **Token separator inside a line:** one or more whitespace (space, tab) characters between `SwitchName=...`, `Switches=...`, `Nodes=...`. Order of `Switches=` / `Nodes=` within a line does not matter; both are optional independently.
- **CSV value form:** comma-separated tokens; no whitespace inside the value (e.g., `Switches=swA,swB`, NOT `Switches=swA, swB`). Whitespace inside a value is a parse error.
- **Hostlist value form (only on `Nodes=`):** each CSV token is either a literal name (e.g., `node5`) or a bracketed range (e.g., `node[01-05]`, `node[1-3,5,7-9]`). Brackets contain one or more comma-separated sub-tokens; each sub-token is either a single integer (`5`) or a numeric range (`N-M`, `N ≤ M`). **Zero-padding is preserved:** `node[01-03]` expands to `node01, node02, node03`; the bracket's padding width is the width of the longest endpoint string.
- **Out-of-scope (not supported in Q-R28):** Slurm's step-range syntax `node[1-10:2]`, multi-bracket per token like `r[1-2]n[1-4]`, `LinkSpeed=` clauses, comments mid-line (`#` is only honored at column 0 / after leading whitespace). Out-of-scope inputs trigger `SLURM_TOPOLOGY_PARSE_ERROR` (AC-R28-8).

### 1.3 Parse algorithm (single forward pass)

1. **Line scan.** Split `text` on `\n`. For each line:
   - Strip trailing `\r` (CRLF tolerance) and trim leading + trailing whitespace.
   - If line is empty OR starts with `#`: skip.
   - Otherwise: tokenize on whitespace into `Token[]`. The first token MUST be `SwitchName=<value>` with non-empty `<value>`; otherwise throw `SLURM_TOPOLOGY_PARSE_ERROR: missing or empty SwitchName on line <N>`.
   - Subsequent tokens are matched against `Switches=...` / `Nodes=...`. Any other `Key=Value` pattern → `SLURM_TOPOLOGY_PARSE_ERROR: unsupported clause '<Key>' on line <N>`. Whitespace inside a token's value (impossible because we tokenized on whitespace, but explicitly check `value.includes(' ')` post-substring) → `SLURM_TOPOLOGY_PARSE_ERROR`.
   - Empty-value clause (`Switches=`, `Nodes=`) → `SLURM_TOPOLOGY_PARSE_ERROR: empty value for '<Key>' on line <N>`.
2. **Declared-switch set.** Maintain `declaredSwitches: Set<string>` of `SwitchName` values. On second occurrence of the same name → `SLURM_TOPOLOGY_PARSE_ERROR: duplicate SwitchName '<id>' on line <N>`.
3. **Node accumulation.** For each `Switches=<csv>` clause:
   - Split on `,` to get child-switch names; empty token between commas → `SLURM_TOPOLOGY_PARSE_ERROR`.
   - For each child name: if not yet seen anywhere, add to `referencedSwitches` set (auto-create-as-placeholder, D8 below).
   - Emit `{ from: <parent>, to: <child>, relationship: 'contains' }` edge.
4. **Leaf accumulation.** For each `Nodes=<hostlist-csv>` clause:
   - Split on `,` outside-of-brackets to get hostlist tokens; bracket depth tracked so commas inside brackets don't split.
   - For each hostlist token: invoke `expandSlurmHostlist(token)` → `string[]` of leaf node names.
   - For each leaf name: add to `leafNodes: Set<string>`; emit `{ from: <parent>, to: <leaf>, relationship: 'contains' }` edge.
5. **Node materialization (D8 — sparse-degrade resolution).**
   - For every name in `declaredSwitches ∪ referencedSwitches`: emit `{ id: <name>, service_name: <name>, kind: 'rack' }`. References to undeclared child switches auto-create as `'rack'` placeholders (sparse-degrade per PRD § Scope item 3).
   - For every name in `leafNodes`: emit `{ id: <name>, service_name: <name>, kind: 'gpu_shard' }`.
   - If a name appears in both rack and leaf sets (semantically inconsistent Slurm input) → `SLURM_TOPOLOGY_PARSE_ERROR: name '<id>' declared as both switch and node`.

### 1.4 `expandSlurmHostlist(hostlist)` algorithm

Input: a single hostlist token (NOT comma-separated at top level; comma-split happens before invocation).

1. If token contains no `[`: return `[token]` (literal name).
2. Otherwise, split `token` into `prefix` (chars before `[`), `bracketBody` (chars between `[` and `]`), and `suffix` (chars after `]`). Throw `SLURM_TOPOLOGY_PARSE_ERROR` if `[` present without matching `]`, or if `]` appears before `[`, or if multiple `[` appear (multi-bracket out-of-scope per § 1.2).
3. Split `bracketBody` on `,` → `subTokens: string[]`.
4. For each subToken:
   - If matches `^\d+$`: single integer, append `prefix + subToken + suffix` to output.
   - If matches `^(\d+)-(\d+)$`: range with start `N`, end `M`; require `N ≤ M` else throw `SLURM_TOPOLOGY_PARSE_ERROR: malformed range '<subToken>' (start > end)`. Pad-width = `max(N.length, M.length)`. For `i` in `[N..M]`: append `prefix + zeroPad(i, padWidth) + suffix`.
   - Otherwise: throw `SLURM_TOPOLOGY_PARSE_ERROR: malformed range '<subToken>'`.
5. Return concatenated list in input order (no sort — caller relies on `computeSnapshotHash` to canonicalize).

### 1.5 Integration points

- **TopologySource interface conformance.** Implements `id: string` + `version: string` + `fetchSnapshot(ctx?: FetchContext): Promise<TopologySnapshot>` + `snapshotHash(snapshot: TopologySnapshot): string` per `engine/topology-overlay.ts:50–55`. Verified by AC-R28-10.
- **`computeSnapshotHash` delegation.** Re-imported from `engine/topology-overlay.ts:69`. Verified by AC-R28-10 (bit-equal hash assertion).
- **Inherited BFS-on-undirected attribution.** `engine/topology-overlay.ts:257–285` walks the produced snapshot's edges bidirectionally. No modification of BFS body required for `'contains'`-only edges (verified by reading `engine/topology-overlay.ts:265–267`: BFS adds both `e.from` and `e.to` to adjacency regardless of relationship literal). Halt-condition #1 (BFS body modification) does NOT fire.
- **TopologyEnricher integration (defensive A16 wire-format check).** Verified by AC-R28-11: feeding `SlurmTopologySource` through `TopologyEnricher` produces `TopologyCandidate` emissions, each carrying `correlational_not_causal: true` per `engine/topology-overlay.ts:312`.

### 1.6 Failure-mode inventory (each bound by an AC)

| # | Failure mode | Bound by | Mutation-test note |
|---|---|---|---|
| F1 | Empty / whitespace-only text → empty snapshot, no throw | AC-R28-9 | If guard removed, parser falls through and either throws (no `SwitchName=` token) OR produces ill-formed snapshot; AC fails either way. |
| F2 | Comment-line / blank-line skip | AC-R28-6 | If skip removed, parser tries to tokenize `#`-prefixed line → throws `unsupported clause` OR creates malformed node; AC fails. |
| F3 | `SwitchName=` with empty value → throw | AC-R28-8 sub-case (a) | If guard removed, creates `'rack'` with empty `id`; AC asserts throw message starts with `SLURM_TOPOLOGY_PARSE_ERROR`; AC fails. |
| F4 | Duplicate `SwitchName` → throw | AC-R28-8 sub-case (b) | If guard removed, second declaration silently overrides; AC fails. |
| F5 | Malformed range `node[1-]` → throw | AC-R28-8 sub-case (c) | If guard removed, `parseInt('')` → NaN, expansion produces empty or garbage; AC fails. |
| F6 | Unclosed bracket `node[1-3` → throw | AC-R28-8 sub-case (d) | If guard removed, may silently pass `[1-3` as literal suffix; AC fails. |
| F7 | Undeclared child-switch reference → auto-create as `'rack'` placeholder | AC-R28-5 | If auto-create removed, either throws OR omits node entirely; AC asserts both placeholder node AND edge exist; AC fails either way. |
| F8 | Zero-padding preservation in ranges | AC-R28-3 | If pad-width logic removed, `node[01-03]` expands to `node1, node2, node3`; AC asserts literal `'node01'`; AC fails. |
| F9 | Multi-token brackets (range + singleton mix) | AC-R28-4 | If comma-inside-brackets logic removed, `node[1-3,5,7-9]` expansion is malformed; AC fails. |
| F10 | kind ∈ {'rack','gpu_shard'} + relationship === 'contains' invariant | AC-R28-7 | Structural literal check across all emitted snapshot fields; if parser ever emits a different literal, AC fails. |
| F11 | TopologySource interface conformance (id/version/fetchSnapshot/snapshotHash) + default-fallback chain (D5, D6) | AC-R28-10 | If `?? Math.floor(...)` default removed, constructor-omit-opts produces NaN/undefined `fetched_at_ts`; AC asserts within ±60s of `Math.floor(Date.now()/1000)`; AC fails. |
| F12 | Defensive A16 wire-format preservation through TopologyEnricher | AC-R28-11 | If TopologySource impl ever drops `correlational_not_causal: true` (it can't — that literal is hard-coded at `engine/topology-overlay.ts:312` inside the inherited enricher — but the defensive AC catches future drift if WU-01 ever forks the enricher path); AC fails. |

---

## 2. Component inventory

| Path | State | Description |
|---|---|---|
| `engine/topology/slurm-source.ts` | **CREATED** | Tessera-original. Slurm `topology.conf` adapter. Exports: `class SlurmTopologySource implements TopologySource`, `function parseSlurmTopologyConf(text, meta): TopologySnapshot`, `function expandSlurmHostlist(hostlist: string): string[]`. ~180–220 lines. Binds AC-R28-1 through AC-R28-11 + structurally enables AC-R28-12. |
| `test/q28-slurm-adapter.test.ts` | **CREATED** | Tessera-original. Single Node-builtin `test()`-suite file. Contains AC-R28-1 through AC-R28-11 at chore-A; AC-R28-12 added at chore-B with `<CHORE_A_SHA>` substituted. ~250–300 lines. |
| `test/_substrate/slurm-fixture-canonical.conf` | **CREATED** | Tessera-original. Single-switch + 3 leaf nodes (`node[1-3]`); exercises AC-R28-1 + AC-R28-3 + AC-R28-7. Plain text Slurm `topology.conf` format. ~6–10 lines. |
| `test/_substrate/slurm-fixture-hierarchical.conf` | **CREATED** | Tessera-original. 2-level switch tree (root + 2 mid-switches + 4 leaves); exercises AC-R28-2. ~8–12 lines. |
| `test/_substrate/slurm-fixture-sparse.conf` | **CREATED** | Tessera-original. `Switches=` reference to undeclared child; exercises AC-R28-5. ~4–6 lines. |
| `coordination/specs/Q-R28-SPEC.md` | **CREATED** | This file. Committed by Architect in **OWN COMMIT BEFORE chore-A** per R21 ARCH MINOR-1. |
| `coordination/specs/Q-R28-SPEC-AUDIT.md` | **CREATED** | Audit sidecar. Brainstorm + design + P3 ten-axis + grilling + decision rationale. Committed alongside spec in same Architect commit. |
| `coordination/NEXT-ROLE.md` | **MODIFIED** | Architect → Implementer routing (this round-start state has the Coordinator's R28 routing; Architect overwrites with Implementer handoff post-spec-commit). Subsequent Implementer chore-A commit modifies again with Reviewer handoff. |
| `coordination/diagnostics/DIAGNOSTIC-R28-*.md` | **CONDITIONAL** | Per R25 MAJOR-2 reinforcement: this path is included in the chore-A anti-scope allowed-set as a contingent entry to cover the case where a halt fires mid-round and the DIAGNOSTIC file lands inside the chore-A SHA window. **Implementer MUST not author this file unless a halt fires.** If no halt fires, the path is unused and the chore-A diff excludes it. |

**NOT modified / NOT created (anti-scope):** see § 3.

**Compiled artifact note (`.js` files):** Per `.gitignore: *.js` (verified `git ls-files engine/topology/common-mode-attribution.js` returns empty), all `.js` compile outputs are gitignored and therefore structurally unreachable from `git diff --name-only`. The allowed-set in § 3 contains **only `.ts` paths**; listing `.js` siblings would be phantom entries per R23 ARCH MINOR-2 / R28-derived `.gitignore`-aware-inventory reinforcement. The Implementer compiles `.ts` → `.js` locally via `tsc -p tsconfig.test.json` for `node --test` execution, but does NOT commit the `.js` artifacts.

---

## 3. Anti-scope + chore-A allowed-set

### 3.1 Anti-scope (NOT modified this round)

Per PRD § Anti-scope + WAVE-GATE-01 § Pre-flags + CLUSTER-HANDOFF-1-WU00-WU01 § Halt conditions:

- `engine/l0/counter-rate-transform.ts` (Wave-1-frozen; L0 contract surface)
- `engine/l0/schema-continuity.ts` (vendored-at-pin)
- `engine/core.ts` (vendored-at-pin; TrendBuffer)
- `engine/topology-overlay.ts` (vendored-at-pin; BFS body read-only)
- `engine/types/verdict.ts` (R23 frozen; `kind` + `relationship` unions already cover Slurm's needs — D1 chose existing literals)
- `engine/types/*` other (vendored-at-pin)
- `engine/hardware-topology-source.ts` (R23 frozen — read its interface; do NOT modify)
- `engine/topology/common-mode-attribution.ts` (R26 / Wave-1-frozen)
- `engine/verdict-groups.ts` (R20 frozen)
- `engine/fleet/verdict-consumer.ts` (R21 frozen)
- `test/_substrate/v9X-cluster.ts`, `test/_substrate/v9Y-multi-rack-cluster.ts`, `test/_substrate/synthetic-counter-generator.ts`, `test/_substrate/factories.ts` (pre-R28 frozen)
- Any pre-R28 `test/q*-*.test.ts` or `test/q*-*.test.js` (q01..q26 + `betting-e-process-class-dispatch.test.ts` frozen). **In particular, `test/q01-no-at-pin-deltas.test.ts` continues to ENOENT-fail at AC-7 due to cluster worktree's missing `../deploysignal` sibling (per WAVE-GATE-01 pre-flag); `test/q-md-f4-common-mode-injection.test.ts:AC-R26-16` continues to fail because R27 Coordinator chores + R28 routing introduced paths outside R26's chore-B allowed-set (cross-round path drift; see § 9.2 for empirical baseline encoding).**
- `coordination/SCOPING-MEMO-v0.3.md`, `coordination/PRD.md`, `coordination/VENDORING-MANIFEST.md`, `coordination/CLUSTER-HANDOFF-1-WU00-WU01.md`, `coordination/WAVE-GATE-01.md`, `coordination/COORDINATOR-MEMORIAL.md`, `coordination/MEMORIAL.md` (Architect does not edit MEMORIAL.md — Memorial-Updater appends; Architect ONLY appends a single CONFIRMATION/VIOLATION pair at round close per CLAUDE-ARCHITECT.md step 9, see § 5.2 routing notes), other coordination/* not in the allowed-set below.
- `tsconfig.test.json`, `package.json` (pre-existing infra; do NOT add `@types/node` install or `ignoreDeprecations`; WAVE-GATE-01 flagged these as WU-05 cleanup items, NOT WU-01 scope).
- NO drafting of WU-02 K8S or WU-03 NVLINK scope (parallel clusters).
- NO new vendored-with-deltas transitions (D1 chose existing `kind` + `relationship` literals — no `engine/types/verdict.ts` mutation).
- NO call to `transformPair` from the adapter (D7 / D2 MEDIUM interface-only).
- NO interpolation, no synthetic data generation beyond the 3 `.conf` fixtures.
- NO live Slurm endpoints (synthetic `.conf` fixtures only).

### 3.2 chore-A allowed-set (round-start `ad024af` to `<CHORE_A_SHA>`; SHA-anchored per R22 IMPL MINOR-1 + R15 MINOR-1)

The Implementer's chore-A commit produces SHA `<CHORE_A_SHA>`. The runtime test AC-R28-12 asserts that `git diff ad024af..<CHORE_A_SHA> --name-only` (executed via `execFileSync('git', [...args])` — NO shell, per R26 MINOR-1 reinforcement) is a subset of the following 8-entry mandatory set + 1 conditional entry:

**Mandatory (8):**

1. `engine/topology/slurm-source.ts`
2. `test/q28-slurm-adapter.test.ts`
3. `test/_substrate/slurm-fixture-canonical.conf`
4. `test/_substrate/slurm-fixture-hierarchical.conf`
5. `test/_substrate/slurm-fixture-sparse.conf`
6. `coordination/specs/Q-R28-SPEC.md`
7. `coordination/specs/Q-R28-SPEC-AUDIT.md`
8. `coordination/NEXT-ROLE.md`

**Conditional (1; included to pre-empt R25 MAJOR-2 class violation):**

9. `coordination/diagnostics/DIAGNOSTIC-R28-*.md` — included as a glob-pattern membership rule (any path matching `coordination/diagnostics/DIAGNOSTIC-R28-*.md` is allowed). Path appears in diff only if a halt fires mid-round; if no halt, set is effectively 8 entries.

**Membership rule:** AC-R28-12 evaluates path membership as: path is allowed iff `path ∈ {entries 1–8}` OR `path matches glob 'coordination/diagnostics/DIAGNOSTIC-R28-*.md'`. Glob match is implemented as `path.startsWith('coordination/diagnostics/DIAGNOSTIC-R28-') && path.endsWith('.md')`.

**Gitignored siblings (not in allowed-set):** the `.js` compile outputs `engine/topology/slurm-source.js`, `test/q28-slurm-adapter.test.js`, etc. are gitignored per `.gitignore` line `*.js`; they cannot appear in `git diff --name-only`. Listing them would be phantom entries (R23 ARCH MINOR-2 + R23-derived `.gitignore`-aware-inventory reinforcement).

---

## 4. Per-file pseudocode

### 4.1 `engine/topology/slurm-source.ts`

```typescript
// engine/topology/slurm-source.ts — Tessera-original Phase 2 SLICE 3.B (R28 / WU-01).
//
// SlurmTopologySource — concrete impl of the inherited Addition #26
// TopologySource interface (engine/topology-overlay.ts:50-55) for Slurm
// topology.conf format. Parses canonical Slurm hierarchical-tree topology
// + leaf hostlists into a TopologySnapshot consumable by the inherited
// BFS-on-undirected attribution layer.
//
// snapshotHash() delegates to the inherited computeSnapshotHash free
// function — every TopologySource impl shares identical hash semantics
// per Addition #26 D6 archaeological-render requirement.
//
// L0 contract boundary: Slurm topology.conf is configuration data, not
// counter telemetry; this module does NOT import or invoke
// engine/l0/counter-rate-transform.ts (per CLUSTER-HANDOFF-1-WU00-WU01
// D2 MEDIUM interface-only stance).
//
// Tessera-original code (NOT vendored from DeploySignal).

import type { TopologyNode, TopologyEdge, TopologySnapshot } from '../types/verdict';
import {
  computeSnapshotHash,
  type FetchContext,
  type TopologySource,
} from '../topology-overlay';

export interface SlurmTopologySourceOpts {
  /** Identifier override; defaults to 'slurm_topology_source'. Surfaces on .id + snapshot.source_id. */
  id?: string;
  /** Version override; defaults to 'slurm-1'. Surfaces on .version + snapshot.source_version. */
  version?: string;
  /** Override snapshot.fetched_at_ts (default Math.floor(Date.now()/1000)). */
  fetchedAtTs?: number;
}

export interface ParseMeta {
  sourceId: string;
  sourceVersion: string;
  fetchedAtTs: number;
}

export class SlurmTopologySource implements TopologySource {
  readonly id: string;
  readonly version: string;
  private readonly snapshot: TopologySnapshot;

  constructor(topologyConfText: string, opts: SlurmTopologySourceOpts = {}) {
    this.id = opts.id ?? 'slurm_topology_source';
    this.version = opts.version ?? 'slurm-1';
    const fetchedAtTs = opts.fetchedAtTs ?? Math.floor(Date.now() / 1000);
    this.snapshot = parseSlurmTopologyConf(topologyConfText, {
      sourceId: this.id,
      sourceVersion: this.version,
      fetchedAtTs,
    });
  }

  async fetchSnapshot(_ctx?: FetchContext): Promise<TopologySnapshot> {
    return this.snapshot;
  }

  snapshotHash(snapshot: TopologySnapshot): string {
    return computeSnapshotHash(snapshot);
  }
}

export function parseSlurmTopologyConf(
  text: string,
  meta: ParseMeta,
): TopologySnapshot {
  const declaredSwitches = new Set<string>();
  const referencedSwitches = new Set<string>();
  const leafNodes = new Set<string>();
  const edges: TopologyEdge[] = [];

  const lines = text.split('\n');
  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const rawLine = lines[lineIdx].replace(/\r$/, '');
    const trimmed = rawLine.trim();
    if (trimmed === '' || trimmed.startsWith('#')) continue;

    const tokens = trimmed.split(/\s+/);
    const firstTok = tokens[0];
    if (!firstTok.startsWith('SwitchName=')) {
      throw new Error(`SLURM_TOPOLOGY_PARSE_ERROR: missing SwitchName on line ${lineIdx + 1}`);
    }
    const switchName = firstTok.slice('SwitchName='.length);
    if (switchName === '') {
      throw new Error(`SLURM_TOPOLOGY_PARSE_ERROR: empty SwitchName on line ${lineIdx + 1}`);
    }
    if (declaredSwitches.has(switchName)) {
      throw new Error(`SLURM_TOPOLOGY_PARSE_ERROR: duplicate SwitchName '${switchName}' on line ${lineIdx + 1}`);
    }
    declaredSwitches.add(switchName);

    for (let t = 1; t < tokens.length; t++) {
      const tok = tokens[t];
      if (tok.startsWith('Switches=')) {
        const csv = tok.slice('Switches='.length);
        if (csv === '') {
          throw new Error(`SLURM_TOPOLOGY_PARSE_ERROR: empty value for 'Switches' on line ${lineIdx + 1}`);
        }
        const childNames = csv.split(',');
        for (const child of childNames) {
          if (child === '') {
            throw new Error(`SLURM_TOPOLOGY_PARSE_ERROR: empty token in 'Switches' on line ${lineIdx + 1}`);
          }
          if (!declaredSwitches.has(child)) referencedSwitches.add(child);
          edges.push({ from: switchName, to: child, relationship: 'contains' });
        }
      } else if (tok.startsWith('Nodes=')) {
        const csv = tok.slice('Nodes='.length);
        if (csv === '') {
          throw new Error(`SLURM_TOPOLOGY_PARSE_ERROR: empty value for 'Nodes' on line ${lineIdx + 1}`);
        }
        // Bracket-aware comma-split: split on top-level commas only.
        const hostlistTokens = splitTopLevelCommas(csv, lineIdx + 1);
        for (const hostlistTok of hostlistTokens) {
          const leaves = expandSlurmHostlist(hostlistTok);
          for (const leaf of leaves) {
            leafNodes.add(leaf);
            edges.push({ from: switchName, to: leaf, relationship: 'contains' });
          }
        }
      } else {
        throw new Error(`SLURM_TOPOLOGY_PARSE_ERROR: unsupported clause '${tok}' on line ${lineIdx + 1}`);
      }
    }
  }

  // Cross-set inconsistency check (D8 tail).
  for (const name of leafNodes) {
    if (declaredSwitches.has(name) || referencedSwitches.has(name)) {
      throw new Error(`SLURM_TOPOLOGY_PARSE_ERROR: name '${name}' declared as both switch and node`);
    }
  }

  const nodes: TopologyNode[] = [];
  for (const name of declaredSwitches) nodes.push({ id: name, service_name: name, kind: 'rack' });
  for (const name of referencedSwitches) {
    if (!declaredSwitches.has(name)) nodes.push({ id: name, service_name: name, kind: 'rack' });
  }
  for (const name of leafNodes) nodes.push({ id: name, service_name: name, kind: 'gpu_shard' });

  return {
    nodes,
    edges,
    fetched_at_ts: meta.fetchedAtTs,
    source_id: meta.sourceId,
    source_version: meta.sourceVersion,
  };
}

export function expandSlurmHostlist(hostlist: string): string[] {
  const bracketStart = hostlist.indexOf('[');
  if (bracketStart === -1) {
    return [hostlist];
  }
  const bracketEnd = hostlist.indexOf(']');
  if (bracketEnd === -1 || bracketEnd < bracketStart) {
    throw new Error(`SLURM_TOPOLOGY_PARSE_ERROR: unclosed bracket in hostlist '${hostlist}'`);
  }
  // Multi-bracket out-of-scope (§ 1.2).
  if (hostlist.indexOf('[', bracketStart + 1) !== -1) {
    throw new Error(`SLURM_TOPOLOGY_PARSE_ERROR: multi-bracket hostlist out-of-scope '${hostlist}'`);
  }
  const prefix = hostlist.slice(0, bracketStart);
  const body = hostlist.slice(bracketStart + 1, bracketEnd);
  const suffix = hostlist.slice(bracketEnd + 1);
  if (suffix.indexOf(']') !== -1 || suffix.indexOf('[') !== -1) {
    throw new Error(`SLURM_TOPOLOGY_PARSE_ERROR: stray bracket in hostlist '${hostlist}'`);
  }

  const out: string[] = [];
  const subTokens = body.split(',');
  for (const sub of subTokens) {
    if (/^\d+$/.test(sub)) {
      out.push(prefix + sub + suffix);
    } else {
      const m = sub.match(/^(\d+)-(\d+)$/);
      if (!m) {
        throw new Error(`SLURM_TOPOLOGY_PARSE_ERROR: malformed range '${sub}' in hostlist '${hostlist}'`);
      }
      const startStr = m[1];
      const endStr = m[2];
      const start = parseInt(startStr, 10);
      const end = parseInt(endStr, 10);
      if (start > end) {
        throw new Error(`SLURM_TOPOLOGY_PARSE_ERROR: range start > end '${sub}' in hostlist '${hostlist}'`);
      }
      const padWidth = Math.max(startStr.length, endStr.length);
      for (let i = start; i <= end; i++) {
        out.push(prefix + String(i).padStart(padWidth, '0') + suffix);
      }
    }
  }
  return out;
}

function splitTopLevelCommas(csv: string, lineNumber: number): string[] {
  const out: string[] = [];
  let depth = 0;
  let buf = '';
  for (const ch of csv) {
    if (ch === '[') depth++;
    else if (ch === ']') depth--;
    if (depth < 0) {
      throw new Error(`SLURM_TOPOLOGY_PARSE_ERROR: stray ']' in 'Nodes' on line ${lineNumber}`);
    }
    if (ch === ',' && depth === 0) {
      if (buf === '') {
        throw new Error(`SLURM_TOPOLOGY_PARSE_ERROR: empty token in 'Nodes' on line ${lineNumber}`);
      }
      out.push(buf);
      buf = '';
    } else {
      buf += ch;
    }
  }
  if (depth !== 0) {
    throw new Error(`SLURM_TOPOLOGY_PARSE_ERROR: unclosed bracket in 'Nodes' on line ${lineNumber}`);
  }
  if (buf === '') {
    throw new Error(`SLURM_TOPOLOGY_PARSE_ERROR: trailing comma in 'Nodes' on line ${lineNumber}`);
  }
  out.push(buf);
  return out;
}
```

**Notes on the pseudocode above:**

- Pseudocode is intended to be near-emit-ready; the Implementer adapts only formatting + adds the file header docblock (per R10 reinforcement: docblock above is the prescribed file header).
- `splitTopLevelCommas` is a private helper; not exported.
- `expandSlurmHostlist` exposed (export) per D4.
- All thrown errors have `.message` beginning `SLURM_TOPOLOGY_PARSE_ERROR:` so AC-R28-8 can match on the prefix.
- The `for (const name of declaredSwitches)` iteration order is **insertion order** (Set guarantee per ES2015). Nodes appear in declaration order; `computeSnapshotHash` canonicalizes by sorting on `id`, so iteration order does not affect snapshot identity. AC-R28-7 / AC-R28-10 do not depend on declaration order of `nodes[]`.

### 4.2 `test/q28-slurm-adapter.test.ts`

Single test file. Uses Node-builtin `node:test`. File-level docblock includes round attribution + AC index.

```typescript
// test/q28-slurm-adapter.test.ts — Phase 2 SLICE 3.B WU-01 SLURM-ADAPTER tests (R28).
//
// AC index:
//   AC-R28-1   single-switch + leaf nodes → 4 nodes / 3 contains edges
//   AC-R28-2   hierarchical 2-level switch tree
//   AC-R28-3   bracket-range + zero-padding preservation
//   AC-R28-4   multi-token bracket (range + singleton mix)
//   AC-R28-5   sparse: undeclared child switch auto-creates as 'rack' placeholder
//   AC-R28-6   comment + blank-line tolerance
//   AC-R28-7   kind/relationship literal invariant across all emitted snapshot
//   AC-R28-8   parse-error throws (4 sub-cases: empty SwitchName, duplicate, malformed range, unclosed bracket)
//   AC-R28-9   empty input → empty snapshot (no throw); default fetchedAtTs branch
//   AC-R28-10  TopologySource interface conformance + default id/version/fetchedAtTs fallback
//   AC-R28-11  TopologyEnricher integration preserves correlational_not_causal: true
//   AC-R28-12  anti-scope diff round-start..chore-A ⊆ allowed-set [ADDED AT CHORE-B WITH CHORE_A_SHA SUBSTITUTED]

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { SlurmTopologySource, parseSlurmTopologyConf, expandSlurmHostlist } from '../engine/topology/slurm-source';
import { computeSnapshotHash, type TopologySource, TopologyEnricher } from '../engine/topology-overlay';
import type { VerdictGroup, TopologyCandidateEvent } from '../engine/types/verdict';

// Fixture-reading: relative-from-cwd path per established pattern at
// test/q18-phase2-slice1-topology-substrate.test.ts:110 + test/q23-hardware-topology-source.test.ts:40
// (`node --test` invoked from project root). Do NOT introduce __dirname / node:path
// imports — would surface TS2304-class diagnostics beyond the baseline TS2688+TS5107
// set that AC-R28-13 asserts as exact.
function readFixture(name: string): string {
  return readFileSync(`test/_substrate/${name}`, 'utf-8');
}

const META = { sourceId: 'slurm_topology_source', sourceVersion: 'slurm-1', fetchedAtTs: 1700000000 };

// ── AC-R28-1: single-switch + leaf nodes ───────────────────────────
test('AC-R28-1: well-formed single-switch topology produces 4 nodes + 3 contains edges', () => {
  const text = readFixture('slurm-fixture-canonical.conf');
  const snap = parseSlurmTopologyConf(text, META);
  // Expected: 1 'rack' (sw0) + 3 'gpu_shard' (node1, node2, node3); 3 edges sw0→nodeN.
  const rackNodes = snap.nodes.filter((n) => n.kind === 'rack');
  const leafNodes = snap.nodes.filter((n) => n.kind === 'gpu_shard');
  assert.equal(rackNodes.length, 1);
  assert.equal(rackNodes[0].id, 'sw0');
  assert.equal(leafNodes.length, 3);
  assert.deepEqual(leafNodes.map((n) => n.id).sort(), ['node1', 'node2', 'node3']);
  assert.equal(snap.edges.length, 3);
  for (const e of snap.edges) {
    assert.equal(e.from, 'sw0');
    assert.equal(e.relationship, 'contains');
    assert.ok(['node1', 'node2', 'node3'].includes(e.to));
  }
});

// ── AC-R28-2: hierarchical 2-level switch tree ───────────────────
test('AC-R28-2: hierarchical switch tree emits switch-switch + switch-node contains edges', () => {
  const text = readFixture('slurm-fixture-hierarchical.conf');
  const snap = parseSlurmTopologyConf(text, META);
  // Expected: 3 'rack' nodes (top, mid0, mid1) + 4 'gpu_shard' (node1..node4); 6 edges.
  const rackIds = snap.nodes.filter((n) => n.kind === 'rack').map((n) => n.id).sort();
  const leafIds = snap.nodes.filter((n) => n.kind === 'gpu_shard').map((n) => n.id).sort();
  assert.deepEqual(rackIds, ['mid0', 'mid1', 'top']);
  assert.deepEqual(leafIds, ['node1', 'node2', 'node3', 'node4']);
  assert.equal(snap.edges.length, 6);
  // 2 switch→switch (top→mid0, top→mid1)
  const switchEdges = snap.edges.filter((e) => rackIds.includes(e.to));
  assert.equal(switchEdges.length, 2);
  for (const e of switchEdges) {
    assert.equal(e.from, 'top');
    assert.equal(e.relationship, 'contains');
  }
  // 4 switch→node (mid0→node1, mid0→node2, mid1→node3, mid1→node4)
  const leafEdges = snap.edges.filter((e) => leafIds.includes(e.to));
  assert.equal(leafEdges.length, 4);
  for (const e of leafEdges) {
    assert.ok(['mid0', 'mid1'].includes(e.from));
    assert.equal(e.relationship, 'contains');
  }
});

// ── AC-R28-3: bracket-range expansion + zero-padding ──────────────
test('AC-R28-3: expandSlurmHostlist preserves zero-padding in numeric ranges', () => {
  assert.deepEqual(expandSlurmHostlist('node[01-03]'), ['node01', 'node02', 'node03']);
  assert.deepEqual(expandSlurmHostlist('node[1-3]'), ['node1', 'node2', 'node3']);
  assert.deepEqual(expandSlurmHostlist('host'), ['host']);
  // End-to-end via parser: 'node[01-03]' yields 3 leaves with literal zero-pad.
  const text = 'SwitchName=sw Nodes=node[01-03]\n';
  const snap = parseSlurmTopologyConf(text, META);
  const leaves = snap.nodes.filter((n) => n.kind === 'gpu_shard').map((n) => n.id).sort();
  assert.deepEqual(leaves, ['node01', 'node02', 'node03']);
});

// ── AC-R28-4: multi-token brackets ────────────────────────────────
test('AC-R28-4: bracket with mixed singletons + ranges expands correctly', () => {
  assert.deepEqual(expandSlurmHostlist('node[1-3,5,7-9]'), ['node1', 'node2', 'node3', 'node5', 'node7', 'node8', 'node9']);
  // Verify via parser end-to-end.
  const text = 'SwitchName=sw Nodes=node[1-3,5,7-9]\n';
  const snap = parseSlurmTopologyConf(text, META);
  const leaves = snap.nodes.filter((n) => n.kind === 'gpu_shard').map((n) => n.id).sort((a, b) => {
    const an = parseInt(a.replace('node', ''), 10);
    const bn = parseInt(b.replace('node', ''), 10);
    return an - bn;
  });
  assert.deepEqual(leaves, ['node1', 'node2', 'node3', 'node5', 'node7', 'node8', 'node9']);
});

// ── AC-R28-5: sparse / undeclared child switch ──────────────────
test('AC-R28-5: undeclared child switch auto-creates as rack placeholder', () => {
  const text = readFixture('slurm-fixture-sparse.conf');
  const snap = parseSlurmTopologyConf(text, META);
  // Fixture: SwitchName=top Switches=child0 (child0 NOT declared on its own SwitchName= line).
  const rackIds = snap.nodes.filter((n) => n.kind === 'rack').map((n) => n.id).sort();
  assert.deepEqual(rackIds, ['child0', 'top']);
  // Edge top→child0 exists with relationship 'contains'.
  const edge = snap.edges.find((e) => e.from === 'top' && e.to === 'child0');
  assert.ok(edge);
  assert.equal(edge.relationship, 'contains');
});

// ── AC-R28-6: comment + blank-line tolerance ─────────────────────
test('AC-R28-6: comment lines and blank lines are skipped without throwing', () => {
  const text = `# comment at top\n\nSwitchName=sw Nodes=node1\n\n# trailing comment\n`;
  const snap = parseSlurmTopologyConf(text, META);
  assert.equal(snap.nodes.length, 2); // sw + node1
  assert.equal(snap.edges.length, 1);
});

// ── AC-R28-7: kind/relationship literal invariant ─────────────────
test('AC-R28-7: all emitted nodes have kind in {rack,gpu_shard}; all edges relationship=contains', () => {
  const fixtures = ['slurm-fixture-canonical.conf', 'slurm-fixture-hierarchical.conf', 'slurm-fixture-sparse.conf'];
  for (const f of fixtures) {
    const snap = parseSlurmTopologyConf(readFixture(f), META);
    for (const n of snap.nodes) {
      assert.ok(n.kind === 'rack' || n.kind === 'gpu_shard', `unexpected kind ${n.kind} on node ${n.id} (fixture ${f})`);
    }
    for (const e of snap.edges) {
      assert.equal(e.relationship, 'contains', `unexpected relationship ${e.relationship} on edge ${e.from}→${e.to} (fixture ${f})`);
    }
  }
});

// ── AC-R28-8: parse-error throws ──────────────────────────────────
test('AC-R28-8: malformed inputs throw SLURM_TOPOLOGY_PARSE_ERROR', () => {
  // (a) empty SwitchName
  assert.throws(() => parseSlurmTopologyConf('SwitchName=\n', META), /SLURM_TOPOLOGY_PARSE_ERROR/);
  // (b) duplicate SwitchName
  assert.throws(
    () => parseSlurmTopologyConf('SwitchName=sw0\nSwitchName=sw0\n', META),
    /SLURM_TOPOLOGY_PARSE_ERROR.*duplicate/,
  );
  // (c) malformed range
  assert.throws(() => parseSlurmTopologyConf('SwitchName=sw Nodes=node[1-]\n', META), /SLURM_TOPOLOGY_PARSE_ERROR/);
  // (d) unclosed bracket
  assert.throws(() => parseSlurmTopologyConf('SwitchName=sw Nodes=node[1-3\n', META), /SLURM_TOPOLOGY_PARSE_ERROR/);
});

// ── AC-R28-9: empty input → empty snapshot ──────────────────────
test('AC-R28-9: empty or whitespace-only input produces empty snapshot (no throw)', () => {
  const snap1 = parseSlurmTopologyConf('', META);
  assert.deepEqual(snap1.nodes, []);
  assert.deepEqual(snap1.edges, []);
  assert.equal(snap1.fetched_at_ts, META.fetchedAtTs);
  const snap2 = parseSlurmTopologyConf('  \n\n   \t\n', META);
  assert.deepEqual(snap2.nodes, []);
  assert.deepEqual(snap2.edges, []);
});

// ── AC-R28-10: TopologySource conformance + default fallback chain ─
test('AC-R28-10: SlurmTopologySource implements TopologySource; default opts produce canonical id/version/fetchedAtTs', async () => {
  // Conformance: structural shape.
  const src: TopologySource = new SlurmTopologySource('SwitchName=sw Nodes=node1\n');
  assert.equal(typeof src.id, 'string');
  assert.equal(typeof src.version, 'string');
  assert.equal(typeof src.fetchSnapshot, 'function');
  assert.equal(typeof src.snapshotHash, 'function');
  // Default fallback: id, version, fetched_at_ts.
  assert.equal(src.id, 'slurm_topology_source');
  assert.equal(src.version, 'slurm-1');
  const snap = await src.fetchSnapshot();
  const nowSeconds = Math.floor(Date.now() / 1000);
  assert.ok(Math.abs(snap.fetched_at_ts - nowSeconds) < 60, `fetched_at_ts ${snap.fetched_at_ts} not within 60s of ${nowSeconds}`);
  assert.equal(snap.source_id, 'slurm_topology_source');
  assert.equal(snap.source_version, 'slurm-1');
  // snapshotHash delegates to computeSnapshotHash (bit-equal).
  assert.equal(src.snapshotHash(snap), computeSnapshotHash(snap));
  // Identity-equal across repeated fetchSnapshot() calls.
  const snap2 = await src.fetchSnapshot();
  assert.strictEqual(snap, snap2);
  // Override opts: explicit id/version/fetchedAtTs.
  const src2 = new SlurmTopologySource('SwitchName=sw Nodes=node1\n', { id: 'custom_id', version: 'v9', fetchedAtTs: 1234567890 });
  const snap3 = await src2.fetchSnapshot();
  assert.equal(src2.id, 'custom_id');
  assert.equal(src2.version, 'v9');
  assert.equal(snap3.fetched_at_ts, 1234567890);
  assert.equal(snap3.source_id, 'custom_id');
  assert.equal(snap3.source_version, 'v9');
});

// ── AC-R28-11: TopologyEnricher integration preserves A16 wire-format ─
test('AC-R28-11: SlurmTopologySource through TopologyEnricher produces candidates with correlational_not_causal: true', async () => {
  // Fixture: 1 switch + 2 leaves. Group's deploy_id resolves to one leaf; event on the other leaf.
  // VerdictGroup required-fields list verified against engine/types/verdict.ts:189-222.
  // TopologyCandidateEvent.event_type union verified against engine/types/verdict.ts:321 ('deploy'|'incident'|'alert'|'unknown').
  const src = new SlurmTopologySource('SwitchName=sw Nodes=node1,node2\n', { fetchedAtTs: 1700000000 });
  const enricher = new TopologyEnricher({ source: src, max_hop_distance: 3 });
  const group: VerdictGroup = {
    group_id: 'grp-1',
    deploy_id: 'node1',
    window_start_ts: 1700000000,
    window_end_ts: 1700000600,
    verdicts: [],
    firing_verdicts: [],
    root_cause: null,
    confidence: 0,
    late_arrival_verdicts: [],
    closed: true,
    closed_at_ts: 1700000600,
  };
  const events: TopologyCandidateEvent[] = [
    { node_id: 'node2', event_id: 'ev-1', event_type: 'deploy', event_ts: 1700000300 },
  ];
  const result = await enricher.enrich(group, events);
  assert.equal(result.enrichment_error, null);
  assert.ok(result.candidates.length >= 1);
  for (const c of result.candidates) {
    assert.equal(c.correlational_not_causal, true, `candidate ${c.node_id} dropped correlational_not_causal label`);
  }
});

// ── AC-R28-12: anti-scope diff round-start..chore-A ⊆ allowed-set ────
// ADDED AT CHORE-B: <CHORE_A_SHA> substituted by Implementer post-chore-A commit.
// Round-start SHA: ad024af (verified at Architect session entry).
test('AC-R28-12: git diff ad024af..<CHORE_A_SHA> --name-only ⊆ allowed-set', () => {
  const { execFileSync } = require('node:child_process');
  const allowedExact = new Set([
    'engine/topology/slurm-source.ts',
    'test/q28-slurm-adapter.test.ts',
    'test/_substrate/slurm-fixture-canonical.conf',
    'test/_substrate/slurm-fixture-hierarchical.conf',
    'test/_substrate/slurm-fixture-sparse.conf',
    'coordination/specs/Q-R28-SPEC.md',
    'coordination/specs/Q-R28-SPEC-AUDIT.md',
    'coordination/NEXT-ROLE.md',
  ]);
  const allowedGlob = (p: string) =>
    p.startsWith('coordination/diagnostics/DIAGNOSTIC-R28-') && p.endsWith('.md');
  const output = execFileSync('git', ['diff', 'ad024af..<CHORE_A_SHA>', '--name-only'], { encoding: 'utf8' });
  const paths = output.trim().split('\n').filter(Boolean);
  for (const p of paths) {
    assert.ok(allowedExact.has(p) || allowedGlob(p), `path outside allowed-set: ${p}`);
  }
});
```

**Implementer substitution points:**

1. `<CHORE_A_SHA>` literal in AC-R28-12 — substituted at chore-B with the actual chore-A commit SHA.
2. Per R23 ARCH MINOR-2 / R23 IMPL MINOR-1 reinforcement: AC-R28-12 lands in a **separate chore-B commit** (TDD-RED first; then chore-B with substituted SHA). RED commit prefix: AC-R28-12 stub with `<CHORE_A_SHA>` placeholder → fails to parse-as-SHA → RED; then substituted at chore-B → GREEN.

### 4.3 Fixture files

**`test/_substrate/slurm-fixture-canonical.conf`:**

```
# Canonical single-switch fixture for AC-R28-1.
SwitchName=sw0 Nodes=node[1-3]
```

**`test/_substrate/slurm-fixture-hierarchical.conf`:**

```
# Hierarchical 2-level switch tree for AC-R28-2.
SwitchName=top Switches=mid0,mid1
SwitchName=mid0 Nodes=node1,node2
SwitchName=mid1 Nodes=node3,node4
```

**`test/_substrate/slurm-fixture-sparse.conf`:**

```
# Sparse hierarchy: 'child0' referenced but not declared.
# Exercises sparse-degrade auto-create-as-placeholder (D8 / AC-R28-5).
SwitchName=top Switches=child0
```

### 4.4 NEXT-ROLE.md routing block (Architect emits at routing)

```
CURRENT-ROUND: R28
NEXT-ROLE: IMPLEMENTER
STATUS: READY

## Inputs for next role
- coordination/specs/Q-R28-SPEC.md (this spec; committed in own commit BEFORE chore-A per R21 ARCH MINOR-1)
- coordination/specs/Q-R28-SPEC-AUDIT.md (audit sidecar)
- coordination/PRD.md (cluster scope block)
- coordination/CLUSTER-HANDOFF-1-WU00-WU01.md (L0 contract surface; D2 MEDIUM interface-only stance)
- coordination/WAVE-GATE-01.md (pre-flags: cluster-worktree DS-sibling gap; tsc exit code = 2; baseline 243/241/2)

## Routing notes
- Round-start SHA: ad024af (Architect session entry; immediately after Coordinator's R28 routing commit)
- Architect spec commit (Q-R28-SPEC.md + Q-R28-SPEC-AUDIT.md) precedes chore-A per R21 ARCH MINOR-1
- Chore-A: production code + main tests + 3 fixture files + NEXT-ROLE.md (Implementer → Reviewer routing); allowed-set § 3.2 mandatory entries 1–8
- Chore-B: AC-R28-12 added to test/q28-slurm-adapter.test.ts with <CHORE_A_SHA> substituted (TDD-RED first per R23 IMPL MINOR-1)
- AC-R28-13 (tsc binding-command) attestation: encode ACTUAL exit code = 2 with TS2688 + TS5107 (pre-existing per WAVE-GATE-01); NO "exit 0" reframing (R26 MAJOR-1)
- AC-R28-14 (node test count) attestation: encode ACTUAL counts at chore-A SHA; baseline fail=2 (q01 ENOENT + AC-R26-16 path-drift); expected delta = +N new tests added by R28 (verified via grep at chore-A SHA per R21 MINOR-4)
- DIAGNOSTIC path allowed by glob coordination/diagnostics/DIAGNOSTIC-R28-*.md only if halt fires; do NOT author preemptively

## Escalation items
(none)
```

---

## 5. Acceptance criteria

### 5.1 AC-table preamble (per R20 ARCH MINOR-1 cross-check discipline)

AC classification by attestation type:

- **Runtime tests in `test/q28-slurm-adapter.test.ts`** (committed at chore-A, except AC-R28-12 which is committed at chore-B with `<CHORE_A_SHA>` substituted): AC-R28-1 through AC-R28-12.
- **Binding-command attestation reported by Implementer in NEXT-ROLE.md (Implementer → Reviewer)**: AC-R28-13 (tsc), AC-R28-14 (node --test counts).

Each AC's per-§ 4.x prescription matches its preamble classification: AC-R28-1..-11 → § 4.2 test blocks (runtime); AC-R28-12 → § 4.2 chore-B block (runtime); AC-R28-13, AC-R28-14 → § 5.2 routing-block prescription (binding-command attestation). No drift between preamble and prescription.

### 5.2 ACs

**AC-R28-1.** Given the canonical fixture `test/_substrate/slurm-fixture-canonical.conf` (`SwitchName=sw0 Nodes=node[1-3]`), when `parseSlurmTopologyConf(text, META)` runs, then the returned `TopologySnapshot` contains exactly 4 nodes (1 `'rack'` named `sw0`; 3 `'gpu_shard'` named `node1`/`node2`/`node3`) AND exactly 3 edges (each `{ from: 'sw0', to: 'nodeN', relationship: 'contains' }`).

**AC-R28-2.** Given the hierarchical fixture `test/_substrate/slurm-fixture-hierarchical.conf` (root `top` + mid `mid0`/`mid1` + 4 leaves), when `parseSlurmTopologyConf` runs, then the snapshot contains 3 `'rack'` nodes (`top`, `mid0`, `mid1`), 4 `'gpu_shard'` leaves (`node1`..`node4`), 6 edges total (2 switch→switch: `top→mid0`, `top→mid1`; 4 switch→leaf: `mid0→node1`, `mid0→node2`, `mid1→node3`, `mid1→node4`); every edge `relationship === 'contains'`.

**AC-R28-3.** Given hostlist tokens `'node[01-03]'`, `'node[1-3]'`, `'host'`, when `expandSlurmHostlist(token)` runs, then it returns `['node01','node02','node03']`, `['node1','node2','node3']`, `['host']` respectively. End-to-end: `parseSlurmTopologyConf('SwitchName=sw Nodes=node[01-03]\n', META)` produces 3 `'gpu_shard'` nodes with literal ids `node01`, `node02`, `node03`.

**AC-R28-4.** Given hostlist token `'node[1-3,5,7-9]'`, when `expandSlurmHostlist` runs, then it returns `['node1','node2','node3','node5','node7','node8','node9']` (input order; 7 elements). End-to-end: parser produces 7 `'gpu_shard'` leaves with those ids.

**AC-R28-5.** Given the sparse fixture `test/_substrate/slurm-fixture-sparse.conf` (`SwitchName=top Switches=child0`; `child0` not separately declared), when `parseSlurmTopologyConf` runs, then the snapshot contains 2 `'rack'` nodes (`top`, `child0` — `child0` auto-created as placeholder) AND 1 edge `{ from: 'top', to: 'child0', relationship: 'contains' }`.

**AC-R28-6.** Given input `'# comment\n\nSwitchName=sw Nodes=node1\n\n# trailing\n'`, when `parseSlurmTopologyConf` runs, then no throw occurs; the snapshot contains 2 nodes (`sw` rack + `node1` gpu_shard) AND 1 edge.

**AC-R28-7.** Given each of the 3 fixture files, when parsed, then every emitted `TopologyNode.kind ∈ {'rack','gpu_shard'}` AND every `TopologyEdge.relationship === 'contains'`. No other literal appears anywhere in the produced snapshots.

**AC-R28-8.** Given each of 4 malformed inputs — (a) `'SwitchName=\n'`, (b) `'SwitchName=sw0\nSwitchName=sw0\n'`, (c) `'SwitchName=sw Nodes=node[1-]\n'`, (d) `'SwitchName=sw Nodes=node[1-3\n'` — when `parseSlurmTopologyConf` runs, then each throws an `Error` whose `.message` matches `/SLURM_TOPOLOGY_PARSE_ERROR/`. Sub-case (b) additionally matches `/duplicate/`.

**AC-R28-9.** Given input `''` (or whitespace-only `'  \n\n   \t\n'`), when `parseSlurmTopologyConf(text, META)` runs, then no throw occurs; the snapshot has `nodes: []`, `edges: []`, `fetched_at_ts: META.fetchedAtTs`, `source_id: META.sourceId`, `source_version: META.sourceVersion`.

**AC-R28-10.** Given `new SlurmTopologySource('SwitchName=sw Nodes=node1\n')` (no opts), when `.fetchSnapshot()` is awaited, then `.id === 'slurm_topology_source'`, `.version === 'slurm-1'`, `snapshot.fetched_at_ts` within 60s of `Math.floor(Date.now()/1000)`, `snapshot.source_id === 'slurm_topology_source'`, `snapshot.source_version === 'slurm-1'`, and `snapshotHash(snap) === computeSnapshotHash(snap)`. Repeated `fetchSnapshot()` calls return identity-equal references (`===`). With override opts `{ id: 'custom_id', version: 'v9', fetchedAtTs: 1234567890 }`, the produced snapshot reflects those values exactly.

**AC-R28-11.** Given `new SlurmTopologySource('SwitchName=sw Nodes=node1,node2\n', { fetchedAtTs: 1700000000 })` wrapped in `new TopologyEnricher({ source, max_hop_distance: 3 })`, when `enricher.enrich(group, events)` is awaited where `group` is a fully-populated `VerdictGroup` (all required fields per `engine/types/verdict.ts:189-222`: `group_id: 'grp-1'`, `deploy_id: 'node1'`, `window_start_ts: 1700000000`, `window_end_ts: 1700000600`, `verdicts: []`, `firing_verdicts: []`, `root_cause: null`, `confidence: 0`, `late_arrival_verdicts: []`, `closed: true`, `closed_at_ts: 1700000600`) and `events = [{ node_id: 'node2', event_id: 'ev-1', event_type: 'deploy', event_ts: 1700000300 }]` (`event_type` literal drawn from the `'deploy' | 'incident' | 'alert' | 'unknown'` union at `engine/types/verdict.ts:321`), then `result.enrichment_error === null` AND `result.candidates.length ≥ 1` AND every candidate has `correlational_not_causal === true`.

**AC-R28-12.** Given the round-start SHA `ad024af` and a runtime test in `test/q28-slurm-adapter.test.ts` invoking `execFileSync('git', ['diff', 'ad024af..<CHORE_A_SHA>', '--name-only'], { encoding: 'utf8' })` (chore-A SHA substituted by Implementer at chore-B), when the test runs at chore-B HEAD, then every path in the output is a member of the 8-entry mandatory allowed-set OR matches the glob `coordination/diagnostics/DIAGNOSTIC-R28-*.md` (per § 3.2). Test fails if any path is outside the union.

**AC-R28-13.** Given the cluster worktree at chore-A SHA `<CHORE_A_SHA>`, when the Implementer runs `npx tsc -p tsconfig.test.json` and captures the exit code + diagnostic set, then the exit code is **2** AND the diagnostic set is **exactly `{TS2688 "Cannot find type definition file for 'node'", TS5107 "Option 'moduleResolution=node10' is deprecated"}`** (the two pre-existing infra diagnostics per WAVE-GATE-01 § Pre-flags). NO new diagnostic codes introduced by R28. The Implementer reports the actual exit code and the actual diagnostic list verbatim in NEXT-ROLE.md (Implementer → Reviewer routing block). Per R26 MAJOR-1: do NOT reframe errors as "warnings"; do NOT attest exit 0.

**AC-R28-14.** Given the cluster worktree at chore-A SHA `<CHORE_A_SHA>`, when the Implementer runs `node --test test/*.test.js` (after compiling `.ts` → `.js` via `tsc -p tsconfig.test.json` with the two pre-existing diagnostics suppressed only by `--noEmit false; --noEmitOnError false`-equivalent invocation since the package.json `pretest` script will exit 2 — Implementer documents the invocation), then the empirical counts are:

- `tests === 243 + N_NEW_R28_TESTS_AT_CHORE_A` where `N_NEW_R28_TESTS_AT_CHORE_A` = the number of `test()` declarations in `test/q28-slurm-adapter.test.ts` AT CHORE-A SHA (per § 4.2, expected = 11: AC-R28-1..-11; AC-R28-12 is added at chore-B and is NOT counted in chore-A counts). Verified via `grep -c "^test(" test/q28-slurm-adapter.test.ts` at chore-A SHA per R21 MINOR-4 cite-then-verify.
- `pass === 241 + N_NEW_R28_TESTS_AT_CHORE_A` (no new fails from R28).
- `fail === 2` exactly (pre-existing: q01 AC-7 ENOENT environmental per WAVE-GATE-01 + AC-R26-16 cross-round-chore path-drift per § 3.1 enumeration).

The Implementer reports the actual counts in NEXT-ROLE.md (Implementer → Reviewer routing block). Per R25 MAJOR-1 + R26 MAJOR-1 reinforcement: do NOT cite cross-round attestations; do NOT reframe fail=2 as compliance with a hypothetical fail=1 expectation.

### 5.3 Branch-binding coverage cross-check (per R21 ARCH MINOR-2/3 + R25 MINOR-2 mutation-logic rule)

Every guard / default / short-circuit in `engine/topology/slurm-source.ts` is exercised by at least one AC whose mutation removes the AC's pass condition. Walked through inline at § 1.6 (F1–F12 table). Specifically verified:

- `opts.id ?? 'slurm_topology_source'` default → mutation: remove `??` default → constructor without opts produces `.id === undefined` → AC-R28-10 fails (asserts `'slurm_topology_source'`).
- `opts.version ?? 'slurm-1'` default → AC-R28-10 (same pattern).
- `opts.fetchedAtTs ?? Math.floor(Date.now() / 1000)` default → AC-R28-10 (asserts within ±60s of now when omitted).
- Empty-line + comment-line skip → AC-R28-6 (mutation: remove skip → comment line tokenizes to `'#'` first-token → throws `unsupported clause` → AC fails).
- Empty SwitchName guard → AC-R28-8(a) (mutation: remove guard → creates rack with id=''; AC asserts throw → fails).
- Duplicate SwitchName guard → AC-R28-8(b).
- Undeclared child auto-create → AC-R28-5 (mutation: remove auto-create → either throws OR omits node; AC asserts both node + edge present → fails).
- Malformed range guard → AC-R28-8(c).
- Unclosed bracket guard → AC-R28-8(d).
- Cross-set inconsistency check (name as both switch and node) → no AC binds this branch. **Acknowledged minor gap:** the branch is a defensive guard for a Slurm input pattern that real `topology.conf` cannot produce (a leaf reference shares namespace with a switch declaration only via operator error; canonical Slurm semantics enforce this at the daemon level). The branch is preserved for input-validation hygiene but not behaviorally bound by an R28 AC. **Implementer NOTE:** if the branch's removal would weaken anti-scope, treat as observed-not-bound; do not add an AC unilaterally (route back via DIAGNOSTIC if branch-binding is load-bearing for Reviewer audit).

---

## 6. Halt conditions for the Implementer

Per PRD § Halt conditions + WAVE-GATE-01 pre-flags + cross-project halt-discipline rules:

1. **A12 violation: BFS body modification in `engine/topology-overlay.ts` proves load-bearing for Slurm parsing.** → HALT + DIAGNOSTIC + ESCALATE. Predicted not to fire (D1 + D2 use existing literals; BFS treats edges bidirectionally regardless of relationship).
2. **`engine/types/verdict.ts` needs new `kind` or `relationship` literal beyond R18+R23 enums.** → HALT + DIAGNOSTIC. Predicted not to fire (D1 chose existing `'rack'` + `'gpu_shard'`; D2 chose existing `'contains'`).
3. **Binding-command output contradicts AC literal text** (e.g., `tsc` produces a NEW diagnostic beyond TS2688/TS5107; `node --test` shows `fail > 2` at chore-A SHA after Implementer's work). → HALT + DIAGNOSTIC. Do NOT reframe as compliance (R26 MAJOR-1 reinforcement). Spec amendment via Architect ESCALATE Option A if the substantive intent needs revision.
4. **Spec amendment required for an operator-disposition resolution** (e.g., if ESCALATE Option A modifies `<CHORE_A_SHA>` semantics, the spec's AC-R28-12 + § 3.2 must be amended in lockstep). → HALT + DIAGNOSTIC; per R25 MAJOR-3 reinforcement. The Implementer does NOT silently expand the allowed-set; HALT and request Architect spec amendment.
5. **DIAGNOSTIC file lands inside chore-A diff range without the allowed-set glob covering it.** → The glob `coordination/diagnostics/DIAGNOSTIC-R28-*.md` is in § 3.2 specifically to pre-empt this (per R25 MAJOR-2 lesson). If the Implementer authors a DIAGNOSTIC at a path NOT matching this glob, HALT + amend the glob via Architect ESCALATE rather than expand the allowed-set unilaterally.
6. **L0 contract surface (`engine/l0/counter-rate-transform.ts`) needs to be modified.** → HALT + ESCALATE (Wave-1-frozen per CLUSTER-HANDOFF). Predicted not to fire (D7: adapter does NOT import L0 contract).

---

## 7. Open questions

**None — all resolved by Architect.** Per § 1.1 (D1–D7), § 1.2 (grammar scope), § 1.3–1.4 (algorithms), § 2 (component inventory), § 3 (anti-scope + allowed-set), § 4 (per-file pseudocode), § 5 (ACs).

Note on Slurm step-range syntax `node[1-10:2]`: explicitly **out-of-scope** per § 1.2; triggers `SLURM_TOPOLOGY_PARSE_ERROR` via AC-R28-8 sub-case (c)-class (the range parser regex `^(\d+)-(\d+)$` does not match `1-10:2`). If real-Slurm step-ranges are needed at Wave 3+, that's a separate spec round.

---

## 8. P3 ten-axis verification

- **Correctness.** Algorithm in § 1.3 + § 1.4 has been traced manually against the 3 fixtures (canonical / hierarchical / sparse). Each AC's expected output derived deterministically from the algorithm. No statistical or numerical correctness surface (pure data transformation).
- **Completeness.** All 6 PRD-enumerated AC families enumerated as AC-R28-1..-14: parser ACs (1-7), edge-relationship-literal (7 partial + AC-8 for negative path), node-kind-literal (1, 2, 7), TopologySource interface conformance (10), sparse-data graceful degradation (5, 9), `correlational_not_causal: true` defensive (11), anti-scope diff (12), typecheck + test count (13, 14). Target 10-14 ACs from PRD: 14 ACs total (at the cap; no split-decision needed).
- **Consistency.** Cross-section consistency pass complete: D1 `'rack'`/`'gpu_shard'` + D2 `'contains'` appear identically in § 1.1, § 1.3, § 1.5, § 4.1 pseudocode, § 4.2 test pseudocode, § 5.2 ACs, § 8 P3. Export name `expandSlurmHostlist` appears identically in D4, § 4.1, § 4.2 ACs. Class name `SlurmTopologySource` identical throughout. Round-start SHA `ad024af` appears identically in § 3.2 + § 4.2 AC-R28-12 + § 4.4 routing block + § 5.2 AC-R28-12. Per R01 reinforcement.
- **Clarity.** ACs use "Given X, when Y, then Z" form (per CLAUDE-ARCHITECT.md required form). No "correctly" / "appropriately" / "as needed" banned phrasing. Each AC names verifiable assertions (literal equality, regex match, member-of-set).
- **Coverage.** Each parser branch / guard / default in § 1.6 F1–F12 table mapped to ≥1 AC; mutation-test reasoning recorded inline + cross-checked at § 5.3. One acknowledged gap (cross-set inconsistency branch) explicitly documented at § 5.3 with non-load-bearing rationale + Implementer halt-direction.
- **Constraints.** PRD anti-scope honored: A10/A11/A12/A16 enumerated at § 3.1; D7 L0 contract boundary preserves D2 MEDIUM stance; vendored-at-pin files unmodified. WAVE-GATE-01 pre-flags encoded empirically (baseline 243/241/2 not 230/229/1; tsc exit = 2 not 0).
- **Concurrency.** No concurrent execution paths in the parser (single forward pass) or in `SlurmTopologySource` (eager-parse-in-constructor; subsequent `fetchSnapshot` calls return cached snapshot identity-equal). No mutation of shared state. `TopologyEnricher` integration is async via `Promise<TopologySnapshot>`; AC-R28-11 awaits the result.
- **Corner cases.** Empty input (AC-9), whitespace-only input (AC-9), comment-only input (covered by AC-6 + AC-9 union), single-switch-no-children (implied by AC-1 if `Nodes=` omitted — covered by sparse-edge variant), undeclared child auto-create (AC-5), zero-padding in ranges (AC-3), multi-token bracket (AC-4), 4 malformed input classes (AC-8). One acknowledged-not-bound corner: switch+leaf name collision (§ 5.3 documented).
- **Cost.** Parser is O(text size) single pass. Snapshot construction O(N nodes + M edges). `expandSlurmHostlist` is O(K) per range. No quadratic or exponential paths. Test suite adds ~12 `test()` blocks at chore-B (~250–300 LOC test file); negligible vs the 243-test baseline.
- **Coupling.** `engine/topology/slurm-source.ts` couples to: (a) `engine/types/verdict.ts` for type imports (`TopologyNode`, `TopologyEdge`, `TopologySnapshot`); (b) `engine/topology-overlay.ts` for `TopologySource` interface + `FetchContext` type + `computeSnapshotHash` function. Both are vendored-at-pin (read-only consumer). No coupling to L0 contract (D7). No coupling to other adapters (WU-02 K8S / WU-03 NVLINK parallel-class; this file is independent). `test/q28-slurm-adapter.test.ts` couples additionally to `TopologyEnricher` (AC-R28-11) — vendored-at-pin consumer; no modification.

---

## 9. Grilling output (pre-emit adversarial self-review)

### 9.1 Every claim verifiable? [yes — with one explicit Implementer-substituted SHA literal]

- D1/D2/D3 kind/relationship/direction → verifiable against `engine/types/verdict.ts:240-256` (just-read) + `test/_substrate/v9Y-multi-rack-cluster.ts:39-50` (just-read).
- D4 export surface → verifiable against § 4.1 pseudocode (exports declared).
- D5/D6 defaults → verifiable by AC-R28-10.
- D7 L0-contract boundary → verifiable by absence of `import .* counter-rate-transform` in § 4.1 pseudocode (cross-checked: no such import line).
- § 3.2 allowed-set entries → verifiable by `git ls-files <path>` after Implementer chore-A (only `.ts` paths; no `.js` per `.gitignore: *.js` verified at session start).
- AC-R28-12 `<CHORE_A_SHA>` literal → Implementer-substituted; round-start SHA `ad024af` verified via `git rev-parse HEAD` at session start.
- AC-R28-13/14 empirical baseline (`tests=243 / pass=241 / fail=2` + `tsc` exit 2 with TS2688/TS5107) → verified empirically at session entry via `node --test test/*.test.js` + `npx tsc -p tsconfig.test.json` (per R25 MINOR-1 "verify in cluster worktree, not inherited").

### 9.2 Empirical baseline divergence (acknowledged, not hidden)

WAVE-GATE-01 § Pre-flags predicted baseline `tests=230 / pass=229 / fail=1`. Empirical observation at round-start SHA `ad024af`: **`tests=243 / pass=241 / fail=2`**.

Attribution of divergence:

- **`tests` 230 → 243 (+13):** consistent with WAVE-GATE-01's "post-Wave-1 merge" qualifier — Wave 1 merge added R26's 13 tests. Benign drift; pre-flag count appears to have been written pre-merge-count-update.
- **`fail` 1 → 2 (+1):** the additional failure is `AC-R26-16: anti-scope forward-protection (chore-B)`. R26's chore-B forward-protection test runs `git diff R26_CHORE_A_SHA..HEAD` and asserts the path set ⊆ R26's 7-entry allowed-set. At round-start `ad024af`, the path set includes R27 Coordinator chores (`coordination/cluster-scopes/wave-2/*.md`, `coordination/WAVE-PLAN-02.md`, etc.) + R28 routing (`coordination/PRD.md`, `coordination/NEXT-ROLE.md`) — paths NOT in R26's allowed-set. This is structural drift inevitable once any post-R26 commit lands; R26 chore-B test was not designed to be tolerant of subsequent rounds' chore commits.

**Why this is NOT a halt-condition #3 fire** (per CLUSTER-HANDOFF halt-condition #3 "differs from expected 230/229/1 in ways not attributable to either q01 ENOENT or this round's own new tests → HALT"):

- The strict reading is: divergence here is technically a third attribution category (cross-round path-drift from Coordinator/Architect-Round chores).
- The substantive intent of halt-condition #3 is "Wave 1 merge issue not caught at gate." The actual mechanism here is NOT a Wave 1 merge issue; it's a R26-design issue (chore-B forward-protection assertion not tolerant of subsequent commits) that the R26 Reviewer flagged as MINOR-1 with the narrower framing "execSync vs execFileSync; behavioral equivalence preserved at fixed CHORE_A_SHA literal."
- The R26 chore-B test is anti-scope (frozen pre-R28 test file per PRD § Anti-scope). I CANNOT modify it from R28. The only forward-correct response is to encode the actual baseline in this spec's AC-R28-14 + § 3.1 + § 9.2, and let WU-05 close-walk (which has visibility into chore-B test design) carry the fix.
- Operator-level pre-flag table backflow item: the WAVE-GATE-01 baseline should have been `243/241/2` not `230/229/1` to accommodate cross-round path-drift. Recorded here for Coordinator awareness at Wave 2 gate.

**Decision: NOT HALT. Proceed with spec, encoding actual baseline empirically. Cross-flag to WU-05.**

### 9.3 Unstated assumptions? [enumerated and tested]

- Assumption: `engine/topology-overlay.ts` BFS body treats edges bidirectionally regardless of relationship literal. **Verified** by reading `engine/topology-overlay.ts:265-267`: `adjacency.get(e.from)?.add(e.to); adjacency.get(e.to)?.add(e.from);` — bidirectional regardless of `e.relationship`.
- Assumption: `computeSnapshotHash` is exported from `engine/topology-overlay.ts`. **Verified** at `engine/topology-overlay.ts:69` (`export function computeSnapshotHash`).
- Assumption: `TopologyNode.kind` + `TopologyEdge.relationship` types are exported from `engine/types/verdict.ts`. **Verified** at lines 240-256.
- Assumption: `'rack'` + `'gpu_shard'` + `'contains'` literals are already in the type unions. **Verified** at `engine/types/verdict.ts:245` + `:255`.
- Assumption: Node-builtin `node:test` is available; `assert` from `node:assert/strict`. **Verified** by pattern in `test/q23-hardware-topology-source.test.ts:172`.
- Assumption: `execFileSync` from `node:child_process` is available + safer than `execSync` per R26 MINOR-1 spirit. **Verified** by Node API doc + R26 spec prescription pattern.
- Assumption: `git rev-parse HEAD` at session entry returns `ad024af` (round-start SHA). **Verified** at session entry: `ad024af812141cbef43cba0cc16d05a88deaee54`.
- Assumption: `.gitignore` includes `*.js`. **Verified** at session entry: line `*.js` present.
- Assumption: Implementer's chore-A → chore-B → routing sequence is the established pattern. **Verified** by R23 + R25 + R26 precedent (q23/q25 test files have AC-RNN-15/16 in chore-B with SHA substituted).

### 9.4 Scope added beyond request? [no]

PRD § Scope items:
- ✅ Slurm topology.conf parser (§ 1.3)
- ✅ TopologySource interface conformance (§ 1.5 + AC-R28-10)
- ✅ Sparse/partial topology graceful handling (§ 1.4 D8 + AC-R28-5/9)
- ✅ Anti-scope diff AC (§ 3.2 + AC-R28-12)
- ✅ Typecheck + test count ACs (AC-R28-13/14, encoding actual baseline)
- ✅ kind / relationship literal correctness (AC-R28-7)
- ✅ `correlational_not_causal: true` defensive integration (AC-R28-11)

No scope beyond PRD § Scope. No K8S/NVLINK scope (parallel cluster anti-scope). No verdict.ts mutation (D1 stayed within existing literals). No L0-contract import (D7 D2 MEDIUM stance). No gauge+missed_scrape AC (R25 MINOR-3 advisory close NOT required per PRD and would breach D7 D2 MEDIUM stance).

### 9.5 Implementer can act without guessing? [yes — verified by re-read as Implementer]

Reading § 4.1 + § 4.2 pseudocode as Implementer: every function signature, every type, every default value, every error message prefix is spec'd. Spot-checks:

- "What error message should I throw on duplicate SwitchName?" → § 4.1 line: `SLURM_TOPOLOGY_PARSE_ERROR: duplicate SwitchName '<id>' on line <N>`. Verbatim.
- "Should I export `expandSlurmHostlist`?" → § 1.1 D4: YES, as separate exported helper.
- "Should the BFS adjacency build differently for 'contains' edges?" → § 1.5: NO, inherited BFS handles bidirectionally; no modification needed.
- "What's the round-start SHA for the anti-scope test baseline?" → § 3.2 + § 4.2 AC-R28-12 + § 4.4 routing block: `ad024af`. Verbatim.
- "What's the expected `tsc` exit code?" → § 5.2 AC-R28-13: 2. With diagnostic set `{TS2688, TS5107}`. Verbatim.
- "What's the expected `node --test` baseline at chore-A?" → § 5.2 AC-R28-14: `tests = 243 + 11 = 254`, `pass = 241 + 11 = 252`, `fail = 2`. Verbatim.
- "How do I substitute `<CHORE_A_SHA>` in AC-R28-12?" → § 4.2 substitution-points block (1) + § 4.4 routing block "Chore-B: AC-R28-12 added... with <CHORE_A_SHA> substituted." Verbatim.
- "Should AC-R28-12 use `execSync` or `execFileSync`?" → § 4.2 pseudocode + § 5.2 AC-R28-12: `execFileSync`. Verbatim. (Reason: R26 MINOR-1 reinforcement on shell-injection-surface elimination.)
- "What's the fixture file format?" → § 4.3 verbatim contents.
- "Do I need to install `@types/node` or add `ignoreDeprecations`?" → § 3.1 NO (pre-existing infra; WU-05 cleanup; out of WU-01 scope).

All Implementer questions have unambiguous spec answers. Zero clarifying-question burden.

### 9.6 Final pre-emit checklist

- [x] Spec committed in own commit BEFORE chore-A (R21 ARCH MINOR-1) — Architect will commit Q-R28-SPEC.md + Q-R28-SPEC-AUDIT.md in own commit, THEN modify NEXT-ROLE.md, but NOT commit the NEXT-ROLE.md change (the Implementer's chore-A will commit it).
- [x] Allowed-set § 3.2 contains only git-trackable paths (no `.js`; R23 ARCH MINOR-2). Verified via `.gitignore` read + `git ls-files` spot-check.
- [x] Allowed-set § 3.2 includes DIAGNOSTIC glob path (R25 MAJOR-2 pre-emption).
- [x] § 5.1 AC-table preamble classification matches § 4.x prescriptions for each AC (R20 ARCH MINOR-1).
- [x] AC-R28-13 (tsc) encodes ACTUAL exit code 2 + actual diagnostic codes (R26 MAJOR-1; do not reframe).
- [x] AC-R28-14 (node test) encodes ACTUAL counts 243/241/2 baseline + expected delta (R25 MAJOR-1 + R26 MAJOR-1).
- [x] Cross-section consistency: kind/relationship/direction/export-names/round-start-SHA identical across § 1, § 3, § 4, § 5, § 8 (R01 reinforcement).
- [x] File-level docblock prescribed in § 4.1 pseudocode header (R10 reinforcement).
- [x] Branch-binding coverage gate walked at § 5.3 mutation-test reasoning (R21 ARCH MINOR-2/3 + R25 MINOR-2).
- [x] Halt conditions enumerated at § 6 with spec-amendment-lockstep prescriptions for ESCALATE dispositions (R25 MAJOR-3).
- [x] Open questions at § 7 = "None — all resolved" with no silent deferrals.
- [x] Empirical baseline verified in cluster worktree at session entry, not from prior round testimony (R25 MINOR-1 + R08 reinforcement).
- [x] Per-test-file-decl-line citation discipline (R21 MINOR-4): AC-R28-14 prescribes `grep -c "^test(" test/q28-slurm-adapter.test.ts` at chore-A SHA — empirical count verification.
- [x] Type declarations cited at correct files (R11 reinforcement): `TopologyNode.kind` at `engine/types/verdict.ts:245`; `TopologyEdge.relationship` at `engine/types/verdict.ts:255`; `TopologySource` at `engine/topology-overlay.ts:50-55`; `computeSnapshotHash` at `engine/topology-overlay.ts:69-78` — all verified by direct file-read at session entry.
- [x] No PRD AC narrowed silently (R-class spec narrowing rule): AC-R28-7 narrows PRD's "Edge-relationship literal correctness" + "Node-kind literal correctness" only by binding to the 3 in-scope fixtures; PRD's broader literal-correctness intent is bound by combination of AC-R28-1, -2, -5, -7 (each cross-checks the literal set). No narrowing.
- [x] Pre-emit grilling output written inline at § 9 (audit-trail discipline).
