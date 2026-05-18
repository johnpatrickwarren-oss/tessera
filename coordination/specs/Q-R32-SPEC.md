# Q-R32-SPEC — Phase 2 SLICE 3 Close Walk (WU-05 Wave 3)

**Round:** R32 (audit tier — Implementer authors spec + executes)
**Cluster:** `wu-05-slice-3-close-walk` (Wave 3, single cluster; main worktree)
**Phase / SLICE:** Phase 2 SLICE 3 close-walk + hybrid Reviewer PR-F6 consolidation
**Baseline SHA:** `45242f2` (round-start; `chore(R32-prep): WU-05 scope block + NEXT-ROLE for Wave 3 dispatch`)
**Pre-R32 baseline test count:** `tests=284 / pass=280 / fail=4` (empirically verified at session start)
**Pre-R32 tsc exit:** `0` (empirically verified; pre-flags predicted 2 — infra resolved between R30 and R32 main-worktree merge)

---

## § 1 Goal

Produce the Phase 2 SLICE 3 milestone deliverables: (1) the SLICE 3 close-walk document aggregating Wave 1 + Wave 2 outputs; (2) a vendor-fungibility SCOPING-MEMO amendment staged for operator approval; (3) 13 pre-authorized MINOR cleanup items from Wave 1 + Wave 2 carry-forward inventory; (4) route to hybrid Reviewer (Opus + Sonnet + Merger) for PR-F6 + R-E7 evidence consolidation. After this round + Coordinator Wave 3 gate (R33): HARD STOP at SLICE 3 milestone per overnight authority.

---

## § 2 Mechanism

### § 2.1 Brainstorm (3 approaches evaluated)

**Approach A — Sequential deliverables (1→2→3 in order):** Write close-walk doc first, then SCOPING-MEMO amendment, then cleanup items. Pro: clean commit sequence. Con: nothing.

**Approach B — Document deliverables first (1+2), then cleanups (3) (SELECTED):** Same sequence but explicitly separates the architectural documentation work (Deliverables 1+2 = writing-intensive) from the surgical edits (Deliverable 3 = file-patch-intensive). Makes each commit cohesive.

**Approach C — Cleanup-first (3), then documents (1+2):** Apply MINOR fixes while source context is fresh, then write the synthesis doc. Pro: cleanup happens with source code details fresh. Con: close-walk doc authors before cleanup is applied, requiring a loop.

**Selection:** Approach B. Write doc + amendment as unified "synthesis" work, then apply surgical cleanups. Each commit tells a clean story.

### § 2.2 Component inventory

**New files:**
- `coordination/specs/Q-R32-SPEC.md` (this file)
- `test/q32-slice3-close-walk.test.ts` (R32 runtime tests)
- `coordination/PHASE-2-SLICE-3-CLOSE-WALK.md` (Deliverable 1)

**Modified files (Deliverable 2):**
- `coordination/SCOPING-MEMO-v0.3.md` (vendor-fungibility § 2.4 + A10 + § 1.7 + PRD US-01)

**Modified files (Deliverable 3 — pre-authorized cleanup):**
- `coordination/specs/Q-R25-SPEC.md` (R25 MAJOR-1/2/3: AC-R25-14 count, § 3 8th entry, AC-R25-12 tolerances)
- `coordination/specs/Q-R26-SPEC.md` (R26 MAJOR-1: AC-R26-14 tsc-exit-code reality)
- `test/q25-l0-contract.test.ts` (R25 MINOR-3: gauge+missed_scrape AC append)
- `test/q-md-f4-common-mode-injection.test.ts` (R26 MINOR-1: execSync → execFileSync)
- `engine/topology/common-mode-attribution.ts` (R26 MINOR-2: earliest/latest_event_ts aggregation alignment)
- `test/q28-slurm-adapter.test.ts` (R28 MINOR-1: AC-R28-9 source_id/source_version assertions)
- `test/q29-k8s-adapter.test.ts` (R29 MINOR-1/2/3: strictEqual for host; REVIEWER-REPORT regex; Node.js v25 comment)
- `test/q30-nvlink-adapter.test.ts` (R30 MINOR-1: AC-R30-15 regex line-anchor)
- `engine/topology/nvlink-source.ts` (R30 MINOR-2: dead-code inline comment at :133-134)

**Coordination chore:**
- `coordination/NEXT-ROLE.md`, `coordination/MEMORIAL.md`

### § 2.3 Integration points

- **Deliverable 1** reads all 5 CLUSTER-HANDOFF-2-WU{00,01,02,03,04}-WU05.md artifacts + WAVE-GATE-02 + all Wave 1/Wave 2 specs and Reviewer reports. Pure documentation synthesis — no production code impact.
- **Deliverable 2** edits SCOPING-MEMO-v0.3.md at 4 locations. Operator-reviewable; does not change any A10 fundamental intent, only generalizes wording across vendor stacks.
- **Deliverable 3** cleanup items are surgical single-file/single-section edits. Failure modes: spec amendment doesn't locate the right section → grep-verify before editing.
- **R25 MINOR-2**: WU-03 AC-R30-14 already closed it — disposition = note in § 4 table; no code edit needed.
- **tsc discrepancy**: pre-flags predicted exit=2; actual is exit=0. Q-R26-SPEC.md MAJOR-1 amendment records the R26 empirical reality (exit=2 at R26 chore-A) while NEXT-ROLE.md attestation for R32 records exit=0.

---

## § 3 Acceptance criteria

| AC | Given / When / Then | Type | Verifier |
|---|---|---|---|
| **AC-R32-1** | Given the close-walk document authored at R32, when `coordination/PHASE-2-SLICE-3-CLOSE-WALK.md` is read, then it exists and contains section headers `## § 1`, `## § 2`, `## § 3`, `## § 4`, `## § 5`, `## § 6` | Runtime | q32:AC-R32-1 |
| **AC-R32-2** | Given the vendor-fungibility amendment, when `coordination/SCOPING-MEMO-v0.3.md` is read, then it contains `§ 2.4` or `Vendor fungibility` section AND A10 text includes at least one of `AMD`, `Trainium`, `TPU` (vendor generalization) | Runtime | q32:AC-R32-2 |
| **AC-R32-3** | Given R25 MAJOR-1 spec amendment, when `coordination/specs/Q-R25-SPEC.md` is read, then the AC-R25-14 row contains `228` (corrected pass count: 228/1, not 229/0) | Runtime | q32:AC-R32-3 |
| **AC-R32-4** | Given R25 MAJOR-2 spec amendment, when `coordination/specs/Q-R25-SPEC.md` is read, then it contains the string `DIAGNOSTIC-R25-ac12-tolerance.md` (8th allowed-set entry present in spec) | Runtime | q32:AC-R32-4 |
| **AC-R32-5** | Given R25 MAJOR-3 spec amendment, when `coordination/specs/Q-R25-SPEC.md` is read, then the AC-R25-12 row contains `0.001` and `0.01` (corrected tolerance values; not `1e-9`) | Runtime | q32:AC-R32-5 |
| **AC-R32-6** | Given R25 MINOR-2 disposition (WU-03 closed), when `test/q30-nvlink-adapter.test.ts` is read, then it contains `R25 MINOR-2` (AC-R30-14 closing reference) | Runtime | q32:AC-R32-6 |
| **AC-R32-7** | Given R25 MINOR-3 AC appended, when `test/q25-l0-contract.test.ts` is read, then it contains a test asserting `slope_quality` of a gauge metric on a missed-scrape-shaped interval (both `'gauge'` and `missed_scrape` or `degraded` in the appended test body) | Runtime | q32:AC-R32-7 |
| **AC-R32-8** | Given R26 MAJOR-1 spec amendment, when `coordination/specs/Q-R26-SPEC.md` is read, then the binding-cmd section contains `exit code is 2` or `exit 2` or `TS2688` (reflects R26 empirical reality; not "exit code is 0" alone) | Runtime | q32:AC-R32-8 |
| **AC-R32-9** | Given R26 MINOR-1 fix, when `test/q-md-f4-common-mode-injection.test.ts` is read at AC-R26-16, then the git-diff call uses `execFileSync` (not `execSync`) | Runtime | q32:AC-R32-9 |
| **AC-R32-10** | Given R26 MINOR-2 fix (tightening impl), when `engine/topology/common-mode-attribution.ts` lines 180-201 are read, then the `earliest`/`latest` aggregation iterates `touches` filtered to distinct member-shard entries OR the module docstring at `:67-72` is relaxed to match the current iteration-over-all-touches behavior | Runtime | q32:AC-R32-10 |
| **AC-R32-11** | Given R28 MINOR-1 fix, when `test/q28-slurm-adapter.test.ts` AC-R28-9 test is read, then it contains `source_id` assertion AND `source_version` assertion (both present in the empty-input test body) | Runtime | q32:AC-R32-11 |
| **AC-R32-12** | Given R29 MINOR-1 fix, when `test/q29-k8s-adapter.test.ts` AC-R29-6 test is read, then the host metadata assertion uses `strictEqual` (not `ok(...length > 0)`) | Runtime | q32:AC-R32-12 |
| **AC-R32-13** | Given R29 MINOR-2 fix, when `test/q29-k8s-adapter.test.ts` AC-R29-13 test is read, then the ALLOWED_SET or carve-out logic contains `REVIEWER-REPORT` regex pattern | Runtime | q32:AC-R32-13 |
| **AC-R32-14** | Given R29 MINOR-3 fix, when `test/q29-k8s-adapter.test.ts` AC-R29-12 test is read, then it contains an inline comment referencing `spec § 3.2` or `Node.js v25` and the `env: subEnv` strip | Runtime | q32:AC-R32-14 |
| **AC-R32-15** | Given R30 MINOR-1 fix, when `test/q30-nvlink-adapter.test.ts` AC-R30-15 test is read, then the assertion uses a regex with the `/m` flag or a structural anchor (not a plain `includes(...)` call) | Runtime | q32:AC-R32-15 |
| **AC-R32-16** | Given R30 MINOR-2 fix, when `engine/topology/nvlink-source.ts` lines 133-134 are read, then the third-operand `?? 'nvlink_topology_source'` / `?? 'nvlink-1'` is either removed OR accompanied by an inline comment explaining structural unreachability | Runtime | q32:AC-R32-16 |
| **AC-R32-17** | Given the hybrid Reviewer runs at R32, when `coordination/reviews/REVIEWER-REPORT-R32.md` is read, then the file exists (RED at chore-A; GREEN after Reviewer commits) | Runtime | q32:AC-R32-17 |
| **AC-R32-18** | Given `coordination/reviews/REVIEWER-REPORT-R32.md` exists, when its content is read, then it does not contain `CRITICAL` as a finding classification (0 CRITICAL findings) | Runtime | q32:AC-R32-18 |
| **AC-R32-19** | Given round-start SHA `45242f2` and chore-A SHA `<CHORE_A_SHA>`, when `git diff BASELINE..CHORE_A --name-only` is run, then all paths are in the § 4 allowed-set | Runtime | q32:AC-R32-19 |
| **AC-R32-20** | Given chore-A SHA `<CHORE_A_SHA>`, when `git diff CHORE_A..HEAD --name-only` is run, then all paths are in the § 4 allowed-set OR match the REVIEWER-REPORT regex OR are `coordination/MEMORIAL.md` (forward-protection; RED at chore-A; GREEN after Reviewer + Memorial commits) | Runtime | q32:AC-R32-20 |
| **AC-R32-21** | Given the R32 codebase at chore-A SHA `<CHORE_A_SHA>`, when `npx tsc -p tsconfig.test.json` is run, then exit code is 0 | Binding-command attestation (NEXT-ROLE.md) | Implementer at chore-A |
| **AC-R32-22** | Given the R32 codebase at chore-A SHA `<CHORE_A_SHA>`, when `node --test test/*.test.js` is run, then output reports observed `tests` / `pass` / `fail` counts (empirically encoded; do NOT reframe per R26 MAJOR-1 reinforcement) | Binding-command attestation (NEXT-ROLE.md) | Implementer at chore-A |
| **AC-R32-23** (Reviewer) | Given the WU-04 PR-F6 Cell 1 evidence (PSU event injected → attribution surfaces), when hybrid Reviewer audits, then the cell evidence is found sound (positive sensitivity confirmed) | Reviewer-verified | REVIEWER-REPORT-R32.md § PR-F6 |
| **AC-R32-24** (Reviewer) | Given the WU-04 PR-F6 Cell 2 evidence (no event → no false common-mode), when hybrid Reviewer audits, then the cell evidence is found sound (positive specificity confirmed) | Reviewer-verified | REVIEWER-REPORT-R32.md § PR-F6 |
| **AC-R32-25** (Reviewer) | Given the WU-04 PR-F6 Cell 3 evidence (non-PSU event → not PSU-attributed), when hybrid Reviewer audits, then cell evidence is found sound (negative specificity confirmed) | Reviewer-verified | REVIEWER-REPORT-R32.md § PR-F6 |
| **AC-R32-26** (Reviewer) | Given the WU-03 R-E7 mitigation evidence (32-bit wrap + missed-scrape + variable-interval + reset-vs-wrap all bound by AC against synthetic counter generator), when hybrid Reviewer audits, then R-E7 evidence is found sound and R-E7 classified MITIGATED | Reviewer-verified | REVIEWER-REPORT-R32.md § R-E7 |

---

## § 4 Anti-scope allowed-set

**Round-start SHA (diff lower bound):** `45242f2`

**Allowed-set (15 entries):**

1. `coordination/specs/Q-R32-SPEC.md`
2. `test/q32-slice3-close-walk.test.ts`
3. `coordination/PHASE-2-SLICE-3-CLOSE-WALK.md`
4. `coordination/SCOPING-MEMO-v0.3.md`
5. `coordination/specs/Q-R25-SPEC.md`
6. `coordination/specs/Q-R26-SPEC.md`
7. `test/q25-l0-contract.test.ts`
8. `test/q-md-f4-common-mode-injection.test.ts`
9. `engine/topology/common-mode-attribution.ts`
10. `test/q28-slurm-adapter.test.ts`
11. `test/q29-k8s-adapter.test.ts`
12. `test/q30-nvlink-adapter.test.ts`
13. `engine/topology/nvlink-source.ts`
14. `coordination/NEXT-ROLE.md`
15. `coordination/MEMORIAL.md`

**Conditional 16th entry:** `coordination/diagnostics/DIAGNOSTIC-R32-<topic>.md` (IFF a HALT fires mid-round per halt-discipline).

**Forward-coverage carve-outs (chore-B forward-protection):**
- `^coordination\/reviews\/REVIEWER-REPORT-R32\.md$` (hybrid Reviewer merger output)
- `^coordination\/MEMORIAL\.md$` (Memorial-Updater append; already in allowed-set)
- `^coordination\/diagnostics\/DIAGNOSTIC-R32-.+\.md$` (conditional HALT artifact)

**Hard anti-scope (R32-specific, beyond CLAUDE-COMMON.md universals):**

- NO modification of `engine/l0/counter-rate-transform.ts` (Wave-1-frozen R25)
- NO modification of `test/_substrate/synthetic-counter-generator.ts` (Wave-1-frozen R25)
- NO modification of `engine/topology/{slurm,k8s}-source.ts` (Wave-2-frozen R28/R29)
- NO modification of `engine/topology-overlay.ts` body (vendored-at-pin)
- NO modification of pre-R25 test files (q01..q23, q-md-f4 OUTSIDE R26 MINOR-1 targeted edit, betting-e-process)
- NO modification of COORDINATOR-MEMORIAL.md (Coordinator-only)
- NO modification of CLUSTER-HANDOFF-2-* artifacts (frozen at Wave 2 gate)
- NO SLICE 4 work; NO new vendor adapter code; NO multi-track-cluster-setup.sh modification

---

## § 5 Open questions

**None — all resolved.** Scope fully defined by wu-05-slice-3-close-walk.md + STAGED-FOR-WU-05-SCOPE.md + WAVE-GATE-02.md. Execution can proceed immediately.

**Note on tsc exit code discrepancy:** Pre-flags predicted exit=2 (main-worktree TS2688/TS5107); empirical session-start measurement is exit=0. No HALT required — exit=0 is strictly better than exit=2; no false-compliance-attestation risk; R32 will attest exit=0 verbatim per false-compliance-attestation rule. Q-R26-SPEC.md MAJOR-1 amendment records the R26-specific historical reality (exit=2 at R26 chore-A) independently.

**Note on R25 MINOR-2:** WU-03 AC-R30-14 closed it opportunistically. Disposition = note in § 4 table of PHASE-2-SLICE-3-CLOSE-WALK.md; no code edit needed.
