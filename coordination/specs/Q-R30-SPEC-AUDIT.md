# Q-R30-SPEC-AUDIT — Architect audit-trail sidecar for R30

**Round:** R30 (Wave 2 / cluster `wu-03-nvlink-adapter`).
**Author:** Architect (Claude Opus 4.7).
**Companion spec:** `coordination/specs/Q-R30-SPEC.md`.
**Date:** 2026-05-18.

This sidecar captures the audit-trail content the Reviewer needs to evaluate the Architect's pre-route discipline application. The Implementer reads only Q-R30-SPEC.md proper; the Reviewer reads both.

---

## 1. P3 ten-axis verification (one sentence per axis)

See Q-R30-SPEC.md § 8. Reproduced here for the audit trail:

1. **Correctness** — exact arithmetic identities at AC-R30-10 (wrap rate); deterministic AC outputs.
2. **Completeness** — every PRD requirement maps to ≥1 AC; § 1.2 integration-point table cross-checks all.
3. **Consistency** — § 5 preamble matches § 4 prescription; § 0 picks (A/A/A) referenced consistently across § 2/§ 4/§ 5.
4. **Clarity** — no banned ambiguous-language tokens in AC text; concrete numeric / string-equality expectations.
5. **Coverage** — 18 ACs exhaust the PRD AC bullets; runtime vs attestation classification explicit.
6. **Constraints** — tier `full` per A1+A2+A4+A6; anti-scope (§ 3); Wave-1-frozen files consumed only; R25 MAJOR-3 tolerance (0.001/0.01) applied at AC-R30-13.
7. **Concurrency** — parser pure-functional; no shared state; single-threaded test execution.
8. **Corner cases** — empty input throws; sparse partial=true; multi-link dedup; self-peer defensive guard; fallback-chain undefined-undefined; reset path with omitted width.
9. **Cost** — ~120 LOC prod + ~150 LOC test; 18 ACs; 2 fixture files; ~15 min Implementer time.
10. **Coupling** — production code couples to topology-overlay (read-only), verdict.ts (types), counter-rate-transform (consume); test code adds TrendBuffer + synthetic counter generator imports.

---

## 2. Pre-route discipline application

### 2.1 Superpowers Brainstorm
Three axes brainstormed × three approaches each (§ 0.1/0.2/0.3); selection rationale documented inline. See Q-R30-SPEC.md § 0.

### 2.2 Superpowers Design
Component boundaries + integration points + failure modes sketched in Q-R30-SPEC.md § 1 (precedes per-file pseudocode at § 4).

### 2.3 Superpowers Review
Self-review applied: re-read as Implementer-receiving-cold; re-read as Reviewer-receiving-cold; documented in Q-R30-SPEC.md § 9 grilling output.

### 2.4 CLAUDE-ARCHITECT.md reinforcement sweep
26 reinforcement lines reviewed; applicable items applied. Full table at Q-R30-SPEC.md § 9.2.

### 2.5 Branch-binding coverage gate (R21 ARCH MINOR-2/3)
Every guard / fallback / default in prescribed production code has either a binding AC or a documented coverage-limitation note:

| Code surface | Binding AC | Mutation-killable? |
|---|---|---|
| `parseNvlinkStatus` regex match `GPU_HEADER_RE` | AC-R30-1 (4 nodes), AC-R30-8 (throws on no-match) | ✓ |
| `parseNvlinkStatus` regex match `LINK_PEER_RE` | AC-R30-1 (6 edges), AC-R30-7 (0 edges sparse) | ✓ |
| `parseNvlinkStatus` self-peer guard `if (a === b) continue` | NOT BOUND — defensive code per § 4.1 implementation note | ✗ (intentional; no AC fires) |
| `parseNvlinkStatus` edge dedup `Set<string>` | AC-R30-4 (uniqueness assertion) | ✓ |
| `parseNvlinkStatus` canonical ordering `a < b ? a : b` | AC-R30-4 (canonical from < to) | ✓ |
| `parseNvlinkStatus` `partial = edges.length === 0` | AC-R30-7 (partial=true), AC-R30-1 (partial=false) | ✓ |
| `parseNvlinkStatus` throw on no-GPU | AC-R30-8 | ✓ |
| `NvlinkTopologySource` constructor id fallback (3 branches a/b/c) | AC-R30-9 sub-cases (a)(b)(c) | ✓ |
| `NvlinkTopologySource` constructor version fallback (3 branches a/b/c) | AC-R30-9 sub-cases (a)(b)(c) | ✓ |
| `NvlinkTopologySource.fetchSnapshot` identity return | AC-R30-5 | ✓ |
| `NvlinkTopologySource.snapshotHash` delegation | AC-R30-6 | ✓ |
| `ingestNvlinkErrorCounter` baked counter_width=32 | AC-R30-10 (wrap fires with 32); AC-R30-12 (reset arm; counter_width=32 doesn't enable wrap because prev below threshold) | ✓ |
| `transformPair` width ?? 64 default at counter-rate-transform.ts:119 | AC-R30-14 (input shape exercised) | ✗ (structural limitation per § 7.1 OQ; not mutation-killable without changing transform body which is anti-scoped) |

One AC-not-bound defensive surface (`self-peer guard`) and one structurally-unkillable-mutation surface (`?? 64`) — both explicitly documented.

### 2.6 Architect pre-prediction
Recorded at Q-R30-SPEC.md § 1.4. Predicted outcomes:
- AC-R30-1..15: all PASS (18 runtime tests at chore-A).
- AC-R30-16: tsc exit 2 (TS2688 + TS5107 pre-existing only; zero new diagnostics).
- AC-R30-17: tests=259 / pass=257 / fail=2 (243/241/2 baseline + 16 new R30 runtime tests; AC-R30-16/17 are attestation-only and add no `test()` block).
- AC-R30-18: round-start-to-chore-A diff ⊆ 8-entry allowed-set.

Reviewer comparison: if Implementer attestation differs from prediction, the Reviewer should compare predicted-vs-actual and flag any systematic discrepancy.

### 2.7 Decision rationale (why-picked / why-rejected for each § 0 axis)

**§ 0.1 — Module decomposition (A picked; B+C rejected):**
- **Why A:** matches R23 precedent (`HardwareTopologySource` single file); cohesive — all NVLink-specific code in one location; PRD's prescribed primary module is a single file (`engine/topology/nvlink-source.ts`); small surface (~3 exports).
- **Why not B:** three new files for ~120 LOC is over-decomposition; departs from R23 precedent.
- **Why not C:** placing the L0-helper under `engine/l0/` would invite a future `engine/l0/<other>-counter-ingest.ts` proliferation, polluting the L0 layer with adapter-specific glue.

**§ 0.2 — Parser strategy (A picked; B+C rejected):**
- **Why A:** minimum scope; no parser-library dependency (matches A1 anti-scope on new deps); easy to test deterministically.
- **Why not B:** state machine adds 5× LOC for no R30 demand driver.
- **Why not C:** new npm dep would force a Coordinator-level halt cycle for dependency evaluation; out-of-scope expansion.

**§ 0.3 — Edge representation (A picked; B+C rejected):**
- **Why A:** matches inherited BFS bidirectional treatment (`engine/topology-overlay.ts:265-267`); minimum-edges representation; deterministic-hash-friendly.
- **Why not B:** edge surface inflated; same BFS outcome; redundant.
- **Why not C:** same redundancy without per-pair multi-link aggregation benefit.

### 2.8 Amendments from prior version
N/A — this is the initial spec emission for R30. No prior version.

### 2.9 Re-evaluation of prior brainstorm picks (if applicable)
N/A — no ESCALATE disposition triggered re-selection of a previously-rejected approach.

---

## 3. Empirical premise verification log (R08 reinforcement)

Each load-bearing factual claim about cluster baseline behavior is verified by an Architect-side command run, NOT inherited from prior-round testimony.

| Claim | Verification command | Observed output | Spec section |
|---|---|---|---|
| Baseline test count = 243/241/2 | `node --test test/*.test.js` (Architect run at session entry) | `tests 243; pass 241; fail 2`; failing: q01 AC-7 ENOENT + AC-R26-16 forward-protection | § Empirical baseline; § 1.4 prediction |
| `tsc` exit code at baseline = 2 | `npx tsc -p tsconfig.test.json; echo "EXIT=$?"` (Architect run at session entry) | `error TS2688: Cannot find type definition file for 'node'.`; `error TS5107: ... 'moduleResolution=node10' is deprecated ...`; `EXIT=2` | § Empirical baseline; § 1.4 prediction |
| `engine/topology-overlay.ts` lines 50-55 (TopologySource interface) | direct Read at lines 50-55 | matches spec citation (`export interface TopologySource { readonly id: string; readonly version: string; fetchSnapshot(ctx?): Promise<TopologySnapshot>; snapshotHash(snapshot): string; }`) | § 1.2 integration table |
| `engine/types/verdict.ts` line 245 includes `'gpu_shard'` in `kind` union | direct Read at line 245 | matches; full union `'service' \| 'database' \| 'queue' \| 'external' \| 'gpu_shard' \| 'rack' \| 'psu' \| 'cooling_zone'` | § 1.2 integration table |
| `engine/types/verdict.ts` line 255 includes `'nvlink_peer'` in `relationship` union | direct Read at line 255 | matches; full union `'calls' \| 'reads' \| 'writes' \| 'publishes' \| 'contains' \| 'nvlink_peer'` | § 1.2 integration table |
| `engine/l0/counter-rate-transform.ts` line 119 `width = meta.counter_width ?? 64` | direct Read at line 119 | matches; full line `const width = meta.counter_width ?? 64;` | § 4.1 spec citation + § 7.1 OQ |
| `engine/hardware-topology-source.ts` lines 26-44 (R23 class — structural precedent) | direct Read | matches; class declaration + constructor + 2 methods | § 1.1 inventory + § 2.2 structural-parallel claim |
| `test/_substrate/synthetic-counter-generator.ts` factory signatures | direct Read | `makeWrap32Pair` defaults prev=4_200_000_000 / next=50; `makeMissedScrapePair` interval=2×expected; `makeResetPair` prev=5000 / next=10; `makeVariableIntervalSequence` takes `intervals_seconds: number[]` | § 1.3 failure-mode table; AC-R30-10..13 |
| R26 chore-A SHA `9b78a19` + AC-R26-16 ALLOWED_SET diff | `git diff 9b78a19..HEAD --name-only` | 25 paths; AC-R26-16 fails because most paths are outside R26's 7-entry allowed-set (Wave-1 merge commits + Wave-2 routing chores + R30 routing chore) | § Empirical baseline (pre-existing fail attribution) |
| R30 round-start SHA `5bb427c` (routing commit; nothing between this and Architect work) | `git log --oneline -5` | `5bb427c R30 routing: cluster wu-03-nvlink-adapter ...`; preceding commits are R28+R29+R30 prep + Wave-1 gate + Wave-1 merges; no intermediate operator-prep commit between `5bb427c` and Architect session | § 3 anti-scope baseline + AC-R30-18 BASELINE_SHA |

All load-bearing premises empirically verified at Architect session entry; no inherited-attestation premises load-bear in this spec.

---

## 4. Anti-scope set verification (R23 ARCH MINOR-2 reinforcement)

8 paths in the allowed-set, verified for git-trackability:

| Path | Status | Verification |
|---|---|---|
| `engine/topology/nvlink-source.ts` | NEW (will be tracked post-Implementer commit) | Parent dir `engine/topology/` exists and contains tracked files (e.g., `common-mode-attribution.ts`); `.gitignore` does not exclude `*.ts` |
| `test/q30-nvlink-adapter.test.ts` | NEW (will be tracked) | Parent dir `test/` contains tracked `.ts` files; `.gitignore` does not exclude `*.ts` in `test/` |
| `test/_substrate/nvlink-fixture-well-formed.txt` | NEW (will be tracked) | Parent dir `test/_substrate/` exists; `.gitignore` does not exclude `*.txt` |
| `test/_substrate/nvlink-fixture-sparse.txt` | NEW (will be tracked) | Same as above |
| `coordination/specs/Q-R30-SPEC.md` | NEW (created by Architect; will be tracked) | Parent dir `coordination/specs/` contains tracked `.md` files |
| `coordination/specs/Q-R30-SPEC-AUDIT.md` | NEW (this file; will be tracked) | Same as above |
| `coordination/NEXT-ROLE.md` | MOD (already tracked) | `git ls-files coordination/NEXT-ROLE.md` returns the path |
| `coordination/MEMORIAL.md` | MOD (already tracked) | `git ls-files coordination/MEMORIAL.md` returns the path |

All 8 paths git-trackable. Conditional 9th entry (`coordination/diagnostics/DIAGNOSTIC-R30-*.md`) also git-trackable when created — parent dir `coordination/diagnostics/` exists.

---

## 5. Reviewer-handoff checklist (R20 ARCH MINOR-1 + reviewer-readability)

- [x] § 5 AC-table preamble classification (runtime vs attestation) matches § 4 prescription; verified at § 9.2 reinforcement-sweep R20 row.
- [x] Every AC's "Bound by" reference points to a `test()` declaration in § 4.4 OR to an Implementer attestation prescription in § 4.4 implementer-notes (for AC-R30-16/17).
- [x] All 18 ACs have concrete pass/fail outcomes (no probabilistic ambiguity).
- [x] AC numbering is contiguous and matches the count claimed in § 5 preamble.
- [x] Per-component coverage of branch-binding gate documented at section 2.5 above with explicit acknowledgments of the two unbound surfaces (defensive self-peer guard; structurally-unkillable `?? 64`).
- [x] R25 / R26 reinforcement lessons applied: empirical baseline encoded honestly; allowed-set conditional 9th entry pre-authorized; false-compliance-attestation prevention prescribed at § 6.3.

---

## 6. Honest-broker disclosures (R25 MINOR-2 transparency precedent)

The Architect transparently surfaces the following:

1. **AC-R30-14 cannot mutation-kill the `?? 64` expression** (§ 7.1) — the AC closes the coverage gap (omitted-counter_width input shape exercised) but the underlying code path has no behavioral distinction between `width = 64` and `width = undefined`. Structural fix is anti-scoped (A12 — counter-rate-transform.ts is Wave-1-frozen). Documented in OQ; not a halt.
2. **GPU-id lex-vs-numeric ordering** (§ 7.2) — for single-digit IDs (R30 fixtures) lex order matches numeric; for double-digit IDs a future round may need adjustment. Documented as forward-flag; not a halt.
3. **R26 AC-R26-16 baseline fail is a pre-existing inheritance, not a regression** — R26's CHORE_A_SHA literal (`9b78a19`) predates Wave-1 merge commits + Wave-2 routing chore + R30 routing commit; `git diff 9b78a19..HEAD` produces 25 paths outside R26's 7-entry allowed-set. This is the same class of issue WAVE-GATE-01 § Pre-flag (R25 MAJOR-2) anticipated for Wave-2 clusters consuming R25's spec. AC-R30-17 attests the empirical baseline (243/241/2) honestly; do NOT reframe.
4. **The single-file decomposition (§ 0.1 Approach A) mixes "topology parsing" and "L0 counter ingestion"** — these are conceptually distinct domains. The Architect picked single-file per the R23 precedent + PRD's prescribed primary-module location, but a future Wave-3+ refactor could split if multiple counter-ingestion adapters proliferate. Out-of-scope for R30.

---

_End of Q-R30-SPEC-AUDIT.md._
