# Topology-walk tuning recommendations — Tessera topology-walk envelope (R78)

This document is the operator-facing companion to the empirical envelope
matrix at `coverage-matrices/R78-topology-walk-tuning-matrix.json` +
`coverage-matrices/R78-topology-walk-tuning.md`.

## Empirical envelope (what the sweep shows)

The R78 matrix sweeps `max_hop_distance ∈ {1, 2, 3}` × `min_member_count ∈
{2, 3}` across 5 scenario classes × 5 PRNG-seeded trials = 30 cells / 150
trials. All values below are read from the matrix at HEAD.

**At `max_hop_distance=1` (Tessera default):** the cooling_zone node `cz-1`
sits at hop=2 from every shard in the 2-rack topology (shard → rack → cz).
It is structurally unreachable regardless of `min_member_count`. Cells 0 and
1 (POS-CZ-SPARSE, hop=1, min=2 and min=3) both show `cz_detection_count=0/5`;
cells 6 and 7 (POS-CZ-FULL, hop=1, min=2 and min=3) likewise show
`cz_detection_count=0/5`. Rack-level attribution still works at hop=1: cells
6, 12, 18, 19 (POS-CZ-FULL and POS-RACK-* at hop=1, min=2) show
`rack_detection_count=5/5`, confirming that single-rack common modes are
detected at the default setting.

**At `max_hop_distance=2` + `min_member_count=2` (recommended for CZ-aware
operators):** cz-1 becomes reachable. Cell 2 (POS-CZ-SPARSE: 1 shard from
each rack) shows `cz_detection_count=5/5`; cell 8 (POS-CZ-FULL: 2 shards
from each rack) shows `cz_detection_count=5/5`. Single-rack events are also
surface: cells 14 (POS-RACK-2) and 20 (POS-RACK-3) each show
`rack_detection_count=5/5`. No `shadow_rack_fp` events occur at hop=2 (cells
2, 3, 8, 9, 14, 15, 20, 21 all show `shadow_rack_fp_count=0/5`).

**At `max_hop_distance=2` + `min_member_count=3` (strict FP budget):** cell
3 (POS-CZ-SPARSE, hop=2, min=3) shows `cz_detection_count=0/5` — the sparse
2-shard cross-rack event fails the 3-member threshold and is missed. Cell 9
(POS-CZ-FULL, hop=2, min=3) shows `cz_detection_count=5/5` — 4-shard
cross-rack events still clear the threshold. Cell 15 (POS-RACK-2, hop=2,
min=3) shows `rack_detection_count=0/5` — 2-shard single-rack events are also
missed. Operators who need to detect all sparse cross-rack events must use
`min_member_count=2`.

**At `max_hop_distance=3` (NOT recommended for 2-tier topologies):** the BFS
propagates through the cooling_zone back down to the OTHER rack's shards. This
surfaces the un-fired rack as a `rack` candidate — a structural false-positive.
Cells 4, 10, 11, 16, 22, 23 all show `shadow_rack_fp_count=5/5` under
POS-CZ-SPARSE/FULL/RACK-*/RACK-3 with min=2 or min=3 where any rack candidate
appears. Cell 28 (NEG-INDEP, hop=3, min=2) shows `shadow_rack_fp_count=1/5`.
This false attribution is not suppressible by `min_member_count` alone at
hop=3 on a 2-tier topology — tightening min=3 eliminates it only for
low-member-count scenarios (cell 29 shows `shadow_rack_fp_count=0/5` for
NEG-INDEP at hop=3, min=3, but cells 11 and 23 show shadow_rack_fp=5/5 even
at min=3 for POS-CZ-FULL and POS-RACK-3).

**NEG-INDEP false-positive rate (independent random firings, Bernoulli p=0.2
per shard):**
- hop=1, min=2 (cell 24): `cz=0/5, rack=2/5, shadow=0/5` — ~40% rack FP rate.
- hop=1, min=3 (cell 25): `cz=0/5, rack=0/5, shadow=0/5` — 0% FP rate.
- hop=2, min=2 (cell 26): `cz=1/5, rack=1/5, shadow=0/5` — ~20% cz + rack FP.
  Counter-example: cell 27 (hop=2, min=3) also shows `cz=1/5` — one trial
  produced ≥3 cross-rack shards from NEG-INDEP, clearing the min=3 threshold.
  This is PRNG-path outcome (5 trials), not a tuning effect; the direction is
  non-monotone at this cell pair.
- hop=2, min=3 (cell 27): `cz=1/5, rack=0/5, shadow=0/5` — ~20% cz FP; 0% rack FP.
- hop=3, min=2 (cell 28): `cz=1/5, rack=1/5, shadow=1/5` — ~20% all three categories.
- hop=3, min=3 (cell 29): `cz=0/5, rack=0/5, shadow=0/5` — 0% FP rate.

## Tuning levers operators can adjust

Two levers are operator-visible (no engine modification required — Option
(iii) per Q-R78-SPEC § 0):

1. **`max_hop_distance`** — BFS depth from each fired shard.
   - `1` (Tessera default): rack-level attribution only; structurally misses
     cooling_zone-attributed common-modes.
   - `2`: catches cooling_zone common-modes; no shadow-rack FP at 2-tier
     topologies; introduces moderate FP-rate on random firings.
   - `3` (or higher): introduces shadow-rack FP — BFS propagates through
     cooling_zone back down to the OTHER rack's shards, surfacing the
     un-fired rack as a candidate. **NOT RECOMMENDED for 2-tier topologies.**

2. **`min_member_count`** — minimum distinct fired shards required to
   surface a candidate at any kind.
   - `2` (Tessera default): catches sparse common-modes (2-shard cross-rack
     events); permissive FP on noise.
   - `3`: requires ≥3 fired shards; misses 2-shard sparse cross-rack events
     but tightens FP-rate, including suppressing some shadow-rack FP at
     hop=3.

## Recommended operator defaults (matrix-derived)

| Cluster topology class | Recommended (hop, min) | Trade-off |
|---|---|---|
| 1-tier (rack only — Tessera default substrate) | `(1, 2)` | Tessera ships this — rack attribution only; no cz support needed |
| 2-tier with shared cooling-zone (R72 / R78 substrate) | `(2, 2)` | Catches all CZ events including 2-shard sparse; accepts ~20% FP on independent noise |
| 2-tier with strict FP budget | `(2, 3)` | Misses 2-shard sparse CZ events; tightens FP suppression |
| 3+ tier (deeper switch hierarchies) | OUT OF R78 SCOPE | See § 5.3 acknowledged gap; characterize per cluster |

## Theoretical attribution floor (cannot cross)

The current `attributeCommonMode` surface ([engine/topology/common-mode-
attribution.ts](../engine/topology/common-mode-attribution.ts)) walks an
undirected BFS to bounded hop-distance, then surfaces every node of an
eligible kind with ≥`min_member_count` distinct fired-shard touches. The
structural limits at the 2-rack-1-cz topology:
- hop=1: cz is at hop=2 — cannot surface regardless of `min_member_count`.
- hop=3+: BFS reaches the other rack via cz; surfaces un-fired racks. No
  operator dial inside the existing engine can suppress this (option (iii)
  defers a per-kind cap mechanism; see § How to use this document below).

The module exports `DEFAULT_MAX_HOP_DISTANCE = 1` and `DEFAULT_MIN_MEMBER_COUNT = 2`
as the global defaults (`engine/topology/common-mode-attribution.ts:115-116`).
Per-call `opts` override both; the defaults apply when `opts` is omitted or
the field is `undefined`.

## How to use this document

**Machine-readable data:** The full 30-cell matrix with per-trial fired sets,
candidate snapshots, and classification detail is at
`coverage-matrices/R78-topology-walk-tuning-matrix.json`. The
human-readable per-scenario summary table is at
`coverage-matrices/R78-topology-walk-tuning.md`.

**Applying the tuning:** Pass `opts` to `attributeCommonMode` to override the
global defaults. For a 2-tier CZ-aware operator:

```typescript
const result = attributeCommonMode({
  fired_events,
  snapshot,
  opts: { max_hop_distance: 2, min_member_count: 2 },
});
```

No engine modification is required (Option (iii) per Q-R78-SPEC § 0).

**How gap 2 was surfaced:** The R72 coverage saturation sweep
(`coverage-matrices/R72-saturation-matrix.json`) exposed that
`topology-spanning-common-mode` was detected in only 16/20 (80%) of
variations — the 4 missed variations were variation_idx 0, 5, 10, 15, all at
`max_hop_distance=1` against the cz-spanning 2-rack fixture. The structural
cause is documented above. R78 characterizes the full tuning envelope so
operators can make an informed choice between the three viable operating
points: `(1, 2)`, `(2, 2)`, and `(2, 3)`.

**Future supersession:** If a Phase 5 engine option adds `min_member_count_by_kind`
(Option (i) deferred per Q-R78-SPEC § 0) or a `attributeCommonModeWithKindPriority`
variant (Option (ii) deferred), this document would be superseded by a new
per-kind tuning recommendation. The per-cell matrix structure is intentionally
parameterizable — a future round can re-run the sweep against a new fixture or
new opts surface without re-spec'ing the methodology.
