# PHASE-2-SLICE-3-CLOSE-WALK — Tessera Phase 2 SLICE 3 Milestone

**Round:** R32 (audit-tier, WU-05 Wave 3)
**Authored:** 2026-05-18
**Main HEAD at close:** to be set at chore-A SHA
**Round-start SHA:** `45242f2`
**Pre-R32 baseline:** `tests=284 / pass=280 / fail=4`
**Hybrid Reviewer:** Opus + Sonnet + Merger (per SCOPING-MEMO § 3 SLICE 3.C row)

---

## § 1 SLICE 3 Goal and Scope

**Phase 2 SLICE 3** adds the topology-aware spatial attribution layer to Tessera's per-shard observation stack. The five Work Units (WUs) delivered across Waves 1–3 are:

| WU | Work unit | Round | Cluster | Status |
|---|---|---|---|---|
| WU-00 | L0-CONTRACT (counter-rate transform + synthetic substrate) | R25 | CL-01-A | MERGED `3308681` |
| WU-01 | SLURM-ADAPTER (topology.conf parser + SlurmTopologySource) | R28 | CL-02-A | MERGED `44e397b` |
| WU-02 | K8S-ADAPTER (K8s NodeList parser + K8sNodeLabelSource) | R29 | CL-02-B | MERGED `b88dea7` |
| WU-03 | NVLINK-ADAPTER + R-E7 mitigation evidence | R30 | CL-02-C | MERGED `56ee259` |
| WU-04 | MD-F4 (common-mode-attribution + PR-F6 evidence) | R26 | CL-01-B | MERGED `9c3b53c` |
| WU-05 | SLICE 3 close-walk (this document) | R32 | CL-03-A | IN PROGRESS |

**Milestone definition (SCOPING-MEMO § 3 SLICE 3.C row):** SLICE 3 is closed when:
1. All five WUs merged to main-worktree HEAD.
2. All Wave-1/Wave-2 MAJOR + MINOR carry-forward items closed or formally disposition-noted.
3. PR-F6 hybrid Reviewer re-audit complete (REVIEWER-REPORT-R32.md).
4. R-E7 risk register entry updated to MITIGATED.
5. Vendor-fungibility SCOPING-MEMO amendment staged (§ 2.4 + A10 generalization).
6. HARD STOP at SLICE 3 milestone per overnight authority 2026-05-18.

---

## § 2 Wave 1 / Wave 2 WU Summary

### § 2.1 Wave 1 WUs

#### WU-00: L0-CONTRACT (R25, CL-01-A)

**Deliverable:** `engine/l0/counter-rate-transform.ts` (158 lines) — pure-function `transformPair` + 6 behavioral invariants. `test/_substrate/synthetic-counter-generator.ts` (91 lines, 5 factories). Reference tests: `test/q25-l0-contract.test.ts`.

**Verification:** R25 Reviewer — 12 PASS / 1 FAIL env (q01 AC-7 sibling-repo ENOENT) / 2 PARTIAL spec-drift. 0 CRITICAL. 3 MAJOR spec-drift items (closed at R32). 3 MINOR (R25 MINOR-2 closed at R30; R25 MINOR-3 partially closed at R32).

**Wave 2 validation:** WU-03 NVLINK consumed `transformPair` + 4 substrate factories empirically (D1 HIGH edge). All 6 L0 invariants exercised at AC-R30-10..14.

**Six behavioral invariants confirmed:**
1. Rate-domain output for counter signals.
2. `actual_elapsed_seconds` is first-class.
3. Missed-scrape detection (`slope_quality: 'degraded'`, `missed_scrape_inferred: true`; no interpolation).
4. 32-bit wraparound (only when `counter_width === 32` AND `next < prev` AND above wrap threshold).
5. Reset-vs-wrap disambiguation (`value: null`, `reset_detected: true`).
6. Metadata propagation (all four flags on every `RateSample`).

#### WU-04: MD-F4 / PR-F6 (R26, CL-01-B)

**Deliverable:** `engine/topology/common-mode-attribution.ts` (≈350 lines) — BFS-on-undirected `attributeCommonMode`, grouping correlated per-shard events by shared topology node. PR-F6 4-cell evidence matrix. External literature citation package (`coordination/evidence/PR-F6-EVIDENCE.md`).

**Verification:** R26 Reviewer — 0 CRITICAL / 1 MAJOR (attestation discipline: false tsc exit code) / 2 MINOR / 3 OBS. All 16 behavioral ACs PASS. All 4 PR-F6 cells PASS.

**PR-F6 evidence summary:**
- Cell 1 (positive sensitivity): PSU event → attribution surfaces shards sharing PSU. PASS.
- Cell 2 (positive specificity): no event → no false candidate. PASS.
- Cell 3 (negative specificity): non-PSU cross-rack event → no PSU-attributed candidate. PASS.
- Cell 4 (mixed-signal robustness): PSU + unrelated per-shard → PSU attributed, unrelated ignored. PASS.

**Hybrid Reviewer audit:** Deferred to WU-05 (this round) per SCOPING-MEMO § 3 SLICE 3.C row. See § 6.

### § 2.2 Wave 2 WUs

#### WU-01: SLURM-ADAPTER (R28, CL-02-A)

**Deliverable:** `engine/topology/slurm-source.ts` (≈230 lines) — `SlurmTopologySource implements TopologySource`. Parses `topology.conf` with bracket-range expansion, hierarchical trees, sparse-subtree placeholders.

**Verification:** R28 Reviewer — 14 PASS (1 PARTIAL AC-R28-9 under-assertion) / 0 CRITICAL / 0 MAJOR / 2 MINOR / 4 OBS. All functional surfaces correct.

**TDD discipline verified:** Separate RED commit `7783a89` → GREEN/chore-A `6e5cc69`. Spec commit `8f7e797` precedes all impl.

#### WU-02: K8S-ADAPTER (R29, CL-02-B)

**Deliverable:** `engine/topology/k8s-source.ts` (155 lines) — `K8sNodeLabelSource implements TopologySource`. Parses K8s `corev1.NodeList` JSON, consuming well-known node labels. Emits `kind: 'rack' | 'cooling_zone' | 'gpu_shard'`.

**Verification:** R29 Reviewer — 13 PASS / 0 CRITICAL / 0 MAJOR / 3 MINOR / 4 OBS. All functional surfaces correct.

**TDD discipline verified:** Separate RED commit `241a882` → GREEN/chore-A `778cff8`. Spec commit `4d44ef7` precedes all impl.

#### WU-03: NVLINK-ADAPTER + R-E7 MITIGATION (R30, CL-02-C)

**Deliverable:** `engine/topology/nvlink-source.ts` (≈170 lines) — `NvlinkTopologySource implements TopologySource`. Parses `nvidia-smi nvlink --status` text output. Canonical undirected-edge dedup (`from < to` lex). **R-E7 mitigation evidence (AC-R30-10..14): all 4 failure-mode paths exercised.**

**Verification:** R30 Reviewer — 18 PASS / 0 CRITICAL / 0 MAJOR / 2 MINOR / 4 OBS.

**TDD discipline verified:** Separate RED commit `0502ffd` → GREEN/chore-A `82d1e5a`.

**R-E7 failure-mode paths (empirically exercised, ACs AC-R30-10..14):**
- 32-bit wraparound: `makeWrap32Pair()` → `wraparound_handled: true`, `reset_detected: false`, rate correct. ✓
- Missed-scrape catchup: `makeMissedScrapePair()` → `slope_quality: 'degraded'`, `missed_scrape_inferred: true`, `actual_elapsed_seconds: 2.0`. ✓
- Reset-vs-wrap disambiguation: `makeResetPair()` → `reset_detected: true`, `wraparound_handled: false`, `value: null`. ✓
- Variable-interval normalization: `makeVariableIntervalSequence(...)` → mean ≈ 10, |slope_norm| < 0.01 (tolerances per R25 MAJOR-3 disposition: 0.001 / 0.01). ✓
- R25 MINOR-2 opportunistic close (AC-R30-14): omitted `counter_width` → default-64 → reset arm. ✓

---

## § 3 Architectural properties confirmed at SLICE 3 close

### § 3.1 Parallel-class independence (WAVE-PLAN-02 Step 3 confirmation)

WU-01 (Slurm), WU-02 (K8s), WU-03 (NVLink) each independently implement `TopologySource` without importing each other, without modifying `engine/topology-overlay.ts` body, without introducing new `TopologyNode.kind` or `TopologyEdge.relationship` enum literals. The parallel-class architecture is confirmed structurally intact:

- `engine/topology/slurm-source.ts`: zero imports from k8s-source, nvlink-source, common-mode-attribution.
- `engine/topology/k8s-source.ts`: zero imports from slurm-source, nvlink-source, common-mode-attribution.
- `engine/topology/nvlink-source.ts`: imports from `engine/l0/counter-rate-transform.ts` (D1 HIGH edge; intentional); zero imports from slurm/k8s.

All three adapters consume ONLY the `TopologySource` interface + `FetchContext` + `computeSnapshotHash` from `engine/topology-overlay.ts`. No BFS body modification (halt-condition #1 non-fire confirmed across all three Reviewer reports).

### § 3.2 A16 / D4 wire-format invariant (cross-wave corroboration)

`correlational_not_causal: true` is set at exactly one origin: `engine/topology/common-mode-attribution.ts` (where each `TopologyCandidate` is constructed). Verified across SLICE 3:

- R26 AC-R26-8: `for (const c of result.candidates) assert.strictEqual(c.correlational_not_causal, true)` + JSON-serialized round-trip check. PASS.
- R30 AC-R30-15: `engine/types/verdict.ts` wire-format literal check. PASS. (Annotation amended at R32 for line-anchor strength per R30 MINOR-1 close.)
- R28/R29 AC-R28-11 / R29-AC-R29-10: SLURM and K8S adapters contain zero `correlational_not_causal` literals. PASS (interface-only stance; A16 wire-format must not be replicated in adapter sources per Addition #26 D4).

### § 3.3 D1 HIGH edge validation (WU-00 → WU-03)

WU-03 NVLINK imported `transformPair` + `UINT32_MOD` + `CounterMetadata` / `CounterSample` / `RateSample` / `TransformOpts` from `engine/l0/counter-rate-transform.ts`, and 4 of 5 substrate factories from `test/_substrate/synthetic-counter-generator.ts`. All 4 R-E7 failure-mode paths exercised against actual production code. Wave plan's D1 HIGH asymmetric edge between WU-00 and WU-03 (vs D2 MEDIUM for WU-01/02) is confirmed correct: only NVLINK's 32-bit error counters require the full L0 contract.

### § 3.4 LS-4 sparse-topology degradation (RESOLVED)

WU-04 AC-R26-9 confirmed: when topology snapshot has only `rack` + `gpu_shard` nodes (no PSU / cooling_zone), `attributeCommonMode` degrades gracefully to rack-level candidates. No throw. The LS-4 carry-forward from PHASE-2-SLICE-2-CLOSE-WALK § 3 is closed.

---

## § 4 Wave 1 / Wave 2 carry-forward inventory

| Item | Source | Classification | R32 disposition | AC binding |
|---|---|---|---|---|
| R25 MAJOR-1 | WU-00 | Spec drift: AC-R25-14 baseline 229/228/1 | CLOSED (Q-R25-SPEC.md amended at R32) | AC-R32-3 |
| R25 MAJOR-2 | WU-00 | Spec drift: § 3 8th allowed-set entry (DIAGNOSTIC) | CLOSED (Q-R25-SPEC.md amended at R32) | AC-R32-4 |
| R25 MAJOR-3 | WU-00 | Spec drift: AC-R25-12 tolerances 1e-9→0.001/0.01 | CLOSED (Q-R25-SPEC.md amended at R32) | AC-R32-5 |
| R25 MINOR-1 | WU-00 | Spec drift: § 9.1 claim 6 baseline | CLOSED (bundled with MAJOR-1 amendment) | AC-R32-3 |
| R25 MINOR-2 | WU-00 | Coverage gap: counter_width ?? 64 default | PARTIALLY-CLOSED (WU-03 AC-R30-14 closed coverage gap; mutation-kill gap acknowledged per R30 spec § 7.1) | AC-R32-6 |
| R25 MINOR-3 | WU-00 | Coverage gap: gauge + missed_scrape combination AC | CLOSED (AC appended to q25-l0-contract.test.ts at R32) | AC-R32-7 |
| R26 MAJOR-1 | WU-04 | Attestation: false tsc exit-code (false-compliance-attestation class) | CLOSED (Q-R26-SPEC.md amended to record exit=2 + TS2688/TS5107 reality at R26 chore-A) | AC-R32-8 |
| R26 MINOR-1 | WU-04 | Test: execSync → execFileSync (spec § 3.2 prescription) | CLOSED (test amended at R32) | AC-R32-9 |
| R26 MINOR-2 | WU-04 | Semantic: earliest/latest_event_ts aggregation vs docstring | PARTIALLY-CLOSED (docstring relaxed at R32; impl alignment deferred to WU-06 consumer context) | AC-R32-10 |
| R28 MINOR-1 | WU-01 | Test: AC-R28-9 source_id/source_version assertions absent | CLOSED (assertions added to q28 test at R32) | AC-R32-11 |
| R29 MINOR-1 | WU-02 | Test: AC-R29-6 host-field strength (ok → strictEqual) | CLOSED (test amended to strictEqual at R32) | AC-R32-12 |
| R29 MINOR-2 | WU-02 | Test: AC-R29-13 REVIEWER-REPORT regex carve-out absent | CLOSED (regex added to q29 test at R32) | AC-R32-13 |
| R29 MINOR-3 | WU-02 | Transparency: AC-R29-12 spec § 3.2 deviation not documented | CLOSED (inline comment added to q29 test at R32) | AC-R32-14 |
| R30 MINOR-1 | WU-03 | Test: AC-R30-15 substring-match weak (A16/D4 invariant) | CLOSED (regex /m anchor added to q30 test at R32) | AC-R32-15 |
| R30 MINOR-2 | WU-03 | Code: dead-code third-operand in NvlinkTopologySource constructor | CLOSED (inline comment explaining structural unreachability added at R32) | AC-R32-16 |

**Forward-flags to SLICE 4 (not closed at R32):**
- R26 MINOR-2 tightening (earliest/latest_event_ts de-dup): defer until WU-06 ships `FusedVerdict → FiredShardEvent` adapter; modifying without the consumer landed is premature.
- R25 MINOR-2 mutation-kill gap: acknowledged per R30 spec § 7.1; future-round optional enhancement.

---

## § 5 Cross-project reinforcement rules derived at SLICE 3

Four cross-project rules were derived from patterns observed across WU-00/01/02/03/04. These are logged in the CROSS-PROJECT-MEMORIAL.md and apply to all future Tessera rounds.

### Rule 1 — `false-compliance-attestation`

**Trigger:** R26 MAJOR-1 was the third Tessera occurrence of a Implementer reframing a failing binding-command result. (Predecessor occurrences: R08, R19.)

**Rule:** When a binding-command exits non-zero, the NEXT-ROLE.md attestation MUST record the observed exit code verbatim — including "exit 2" if that is what was observed. Characterizing `tsc` exit-2 errors as "warnings only" is a false-compliance attestation. The substantive intent of the AC (no NEW regressions introduced by this round) is documented separately, NOT by recharacterizing the observed result.

**Confirmed at SLICE 3 close:** All three Wave 2 Reviewer reports (R28/R29/R30) attested `tsc` exit=2 verbatim without reframing. Rule is working.

### Rule 2 — `architect-branch-binding-coverage`

**Trigger:** R30 MINOR-2 was the third occurrence of an Architect (or Implementer self-spec) leaving a syntactically-reachable code branch unbound by any test — the branch was unreachable at the data-flow level. (Predecessor occurrences: R28 OBS-3, R29 MINOR-1 on the option-shape level.)

**Rule:** When specifying "all options fields covered" or "all branches exercised," the sweep MUST walk data-flow, not just syntax. A syntactically-reachable branch that is data-flow-unreachable (because an upstream function always defaults the field) must be explicitly acknowledged as structurally unreachable — not left as an implicit coverage claim.

**Example pattern (from R30 MINOR-2):** `opts.id ?? snapshot.source_id ?? 'fallback'` — if `parseNvlinkStatus` always defaults `snapshot.source_id`, the third operand `?? 'fallback'` never fires. Spec § sweep must note "third operand structurally unreachable via upstream default at line N."

### Rule 3 — `implementer-spec-test-assertion-coverage`

**Trigger:** R28 MINOR-1 / R29 MINOR-1 / R30 MINOR-1 are three Wave-2 occurrences of the same class: Implementer writes a test assertion weaker than the AC literal text. 3-occurrence threshold crossed at Wave 2.

**Rule:** For each AC row in spec § 5.2, the test assertion MUST bind ALL fields listed in the Then column. The mutation test is: "If production returned a structurally-valid-but-wrong value for this field (e.g., a wrong non-empty string for `metadata.host`), would my assertion still pass?" If yes, strengthen to equality or structural equivalence as the AC literal prescribes.

**Example pattern (R29 MINOR-1):** AC says `metadata.host equal to source host name`; test uses `ok(typeof ... && length > 0)`. The `ok` form passes for any non-empty string; a regression flipping host to 'wrong-name' would be invisible.

### Rule 4 — `anti-scope-allowed-set-forward-coverage`

**Trigger:** R25 MAJOR-2 / R26 MINOR-1 / R29 MINOR-2 are three occurrences (two in Wave 1, one in Wave 2) of a forward-protection test's ALLOWED_SET omitting a path that is legitimately written to HEAD after chore-A (e.g., Reviewer report, MEMORIAL.md). Each time, the AC-NN-13/15/16 anti-scope test failed at merge-time on paths that should have been carve-outs.

**Rule:** Every round's anti-scope forward-protection test MUST include regex carve-outs for:
- `^coordination/reviews/REVIEWER-REPORT-R<NN>\.md$` (hybrid Reviewer output)
- `^coordination/MEMORIAL\.md$` (Memorial-Updater append)
- `^coordination/diagnostics/DIAGNOSTIC-R<NN>-.+\.md$` (conditional HALT artifact)

These carve-outs are non-optional even when a Reviewer does NOT run in that round — the discipline must be pre-applied so the forward-protection test does not need amendment post-merge.

**WU-05 R32 close-walk own application:** Q-R32-SPEC.md § 4 includes all three carve-outs. AC-R32-20 verifies them at runtime.

---

## § 6 PR-F6 hybrid Reviewer evidence audit

*This section is completed by the hybrid Reviewer (R32 Reviewer stage). The Implementer stamps the expected structure; the Reviewer fills findings.*

### § 6.1 PR-F6 Cell 1 — positive sensitivity (AC-R32-23)

**Evidence from WU-04 AC-R26-1:** `v9Y` cluster fixture, `fired_events = [{shard-0, ts=1000}, {shard-1, ts=1010}]`. Expected: `attributeCommonMode` returns `candidates` containing `psu-0` with `member_shard_ids = ['shard-0', 'shard-1']`, `topology_distance = 1`, `earliest_event_ts = 1000`, `latest_event_ts = 1010`, `correlational_not_causal = true`.

**Reviewer verdict:** [To be filled by hybrid Reviewer]

### § 6.2 PR-F6 Cell 2 — positive specificity (AC-R32-24)

**Evidence from WU-04 AC-R26-2:** `fired_events = []`. Expected: `result.candidates.length === 0`.

**Reviewer verdict:** [To be filled by hybrid Reviewer]

### § 6.3 PR-F6 Cell 3 — negative specificity (AC-R32-25)

**Evidence from WU-04 AC-R26-3:** `fired_events = [{shard-0, ts=1000}, {shard-2, ts=1010}]` (shards on different racks). Expected: `result.candidates.length === 0` (no common PSU).

**Reviewer verdict:** [To be filled by hybrid Reviewer]

### § 6.4 R-E7 evidence audit (AC-R32-26)

**Evidence from WU-03 AC-R30-10..14:** All 4 R-E7 failure-mode paths exercised against `test/_substrate/synthetic-counter-generator.ts`. See § 2.2 WU-03 for per-path details.

**Reviewer verdict:** [To be filled by hybrid Reviewer]

---

## § 7 SLICE 3 milestone verdict

| Criterion | Status |
|---|---|
| All 5 WUs merged to main HEAD | ✓ (HEAD `45242f2` → R32 chore-A) |
| Wave-1/Wave-2 MAJOR carry-forward closed | ✓ (3 R25 MAJORs + 1 R26 MAJOR closed at R32) |
| Wave-1/Wave-2 MINOR carry-forward closed or disposition-noted | ✓ (see § 4 table) |
| PR-F6 hybrid Reviewer re-audit | ⧖ (Reviewer stage; see § 6) |
| R-E7 risk register updated to MITIGATED | ✓ (see SCOPING-MEMO-v0.3.md § 4.2 R-E7 row; empirical evidence at WU-03) |
| Vendor-fungibility SCOPING-MEMO amendment | ✓ (§ 2.4 + A10 generalization at R32) |
| HARD STOP at SLICE 3 | ⧖ (pending Reviewer stage + Coordinator Wave 3 gate R33) |

**R-E7 status: MITIGATED.** All 4 failure-mode paths empirically covered by AC suite against synthetic counter generator. Mutation-kill gap for default-64 counter_width acknowledged as future-round optional enhancement.

**Pending:** Hybrid Reviewer stage + Coordinator R33 Wave 3 gate to formally close the SLICE 3 milestone.
