# ROUND-R25-SUMMARY — Phase 2 SLICE 3.A.5 (L0 contract for Tessera)

**Round:** R25 (full tier — Architect + Implementer + Reviewer + Memorial-Updater)
**Cluster:** `wu-00-l0-contract` (Wave 1, first multi-cluster round)
**Branch:** `cluster/wu-00-l0-contract-R25`
**Baseline SHA:** `ada602b` · **chore-A SHA:** `e6ff18a` · **HEAD:** `6a07b1a`
**Status:** MERGE-READY (no CRITICAL; 3 MAJOR + 3 MINOR + 2 OBS — all Architect-attributable spec/audit-trail drift)

---

## What worked

**Architect:**
- 17-gate grilling applied with all 15 load-bearing facts verified; brainstorm across 5 architectural axes; spec-commit-sequencing, gitignore-aware allowed-set, count-AC-SHA-anchoring all applied.
- 5 halt scenarios pre-anticipated (§ 7.1) with prescribed responses; scenario (c) fired exactly as designed.
- Branch-binding table for all 10 `transformPair` conditionals; narrative-vs-prescription cross-check across all sections.
- Tessera-original `CounterMetadata` correctly sidestepped A12 anti-scope (no modification to `engine/l0/schema-continuity.ts`).

**Implementer:**
- Halt-discipline scenario (c) executed correctly: DIAGNOSTIC-R25-ac12-tolerance.md written with exact spec quote, empirical evidence, 3 bounded options, empirically-verify command. No silent test mutation.
- RED commit `2f2552e` committed before any production code — TDD audit trail preserved across the HALT/ESCALATE/resume sequence (10th consecutive Reviewer-side TDD verification R02–R25).
- Operator Option A applied verbatim at resume; all 12 ACs PASS; line citations all verified by `grep -n "^test("` before chore-A commit (R21 discipline applied, 0 drift found by Reviewer).
- Clean anti-scope: only spec-prescribed files touched (+ DIAGNOSTIC file at HALT); no frozen engine/* or pre-R25 test files modified.

**Reviewer:**
- Cold-review boundary held: diagnostics/, Q-R25-SPEC-AUDIT.md, logs/, .prompt-*.md all excluded.
- Independent binding commands confirmed test count (230/229/1), typecheck (EXIT 0), and 12+1 line citations.
- Adversarial mandate honored: 3 MAJOR + 3 MINOR + 2 OBS surfaced despite all 12 ACs passing functionally.
- Right-reasons audit for 3 tests with counterfactual mutations; all 3 pass as not-self-confirming.
- 6 VIOLATION entries appended to MEMORIAL.md per R16 reinforcement (count matches finding count).

**Multi-cluster ESCALATE resolution (first tessera instance):**
The HALT → DIAGNOSTIC → STATUS:ESCALATE → operator-disposition → resume sequence executed correctly across all four actors. The four-actor coordination protocol works under multi-cluster worktree methodology.

---

## What violated discipline (role, discipline, what happened)

**MAJOR-1 — Architect, pre-emit-grilling / spec-wording:**
Spec § 9.1 claim 6 ("Baseline test count = 217 / 0") was verified via `git log --oneline -- test/` (confirms no new test files since R23) but NOT via `node --test` in the cluster worktree. The cluster worktree lacks `../deploysignal`, causing q01 AC-7 to fail environmentally (pass=216 / fail=1 at session start). Spec § 9.7 claim that "all 15 claims verified by direct file-open or empirical command" is false for claim 6. AC-R25-14 in spec § 5.1 prescribes `pass=229 / fail=0`; actual at chore-A is `pass=228 / fail=1`. Spec was not amended after operator disposition.

*Secondary — Implementer, halt-discipline scenario (b):*
Spec § 7.1 scenario (b) "baseline count differs from 217" should have independently fired when pass=216 / fail=1 at session entry, but the environmental failure was folded as a subordinate note into the ESCALATE-R25-01 DIAGNOSTIC for scenario (c). Not a separate halt condition.

**MAJOR-2 — Architect, pre-emit-grilling / spec-reasoning; Implementer, anti-scope/allowed-set:**
Spec § 9.10 reasoning ("DIAGNOSTIC files are outside chore-A diff scope — created in a separate route-back commit") was empirically wrong. HALT commit 4f405c0 committed the DIAGNOSTIC file BEFORE chore-A `e6ff18a`, placing it in the round-start-to-chore-A diff range. Spec § 3 allowed-set (7 entries) never acknowledged this. Implementer performed a unilateral tactical expansion of `ALLOWED_SET` in the test (8th entry added) rather than HALTing for spec amendment. The forward-protection mechanism cannot audit itself because the test reads its own literal.

**MAJOR-3 — Architect, spec-internal-contradiction-not-amended:**
Spec contradiction between § 1.8 (0.001 / 0.01) and § 4.3/§ 5.1 (1e-9) correctly triggered Implementer HALT. Operator dispositioned Option A (§ 1.8 is authoritative). Test was updated. But spec at HEAD still has the contradiction: § 4.3 line 752 and § 5.1 AC-R25-12 row still prescribe `1e-9`. The spec-amendment-post-disposition step was skipped.

**MINOR-1 — Architect:** (root cause of MAJOR-1 — see above)

**MINOR-2 — Architect, branch-binding-coverage:**
Spec § 9.13 claims "all 10 branches have ≥ 1 binding AC." Wrong. `const width = meta.counter_width ?? 64` at `counter-rate-transform.ts:119` is not bound by any AC. AC-R25-2 (gauge) returns at line 107-115 BEFORE reaching line 119. All counter ACs explicitly pass `counter_width`, so removing `?? 64` would fail no test. Mutation not caught by § 9.13 structural inspection.

**MINOR-3 — Architect, AC-scope:**
AC-R25-2 uses `makeCleanPair()` (clean interval, no missed-scrape). Spec § 1.6 prescribes "missed-scrape applies to non-counter signals too." The gauge + missed-scrape combination is never tested. Removing `slope_quality` propagation on the pass-through return (impl line 111) would fail no test.

---

## Root cause analysis

**MAJOR-1 root cause:** The Architect's § 9.7 verification table uses "direct file-open or empirical command" but classifies `node --test` as optional (used git log instead). In multi-cluster worktrees with different environments, the git-log proxy is insufficient — it confirms file history but not runtime pass/fail. This is a methodology-friction gap specific to multi-cluster execution introduced in Wave 1.

**MAJOR-2 root cause (Architect):** Spec § 9.10 reasoning was a logical error: "DIAGNOSTIC files are committed in a separate route-back commit" assumed the HALT fires AFTER chore-A, but the halt-discipline prescribes committing the DIAGNOSTIC file at HALT time (before chore-A). The two prescriptions are structurally incompatible; the Architect did not trace through the sequence.

**MAJOR-2 root cause (Implementer):** Faced with an extra diff path not in the allowed-set, the Implementer correctly identified it as a legitimate HALT artifact but chose tactical self-expansion (1 test line) over a HALT/ESCALATE cycle. The R19 MAJOR-1/2 reinforcements cover anti-scope modifications to production files; the specific case of "ALLOWED_SET in the forward-protection test diverges from spec § 3" was not explicitly reinforced.

**MAJOR-3 root cause:** The spec-amendment-after-operator-disposition step is not part of the standard round-close checklist and was not prescribed in the Architect's CLAUDE-ARCHITECT.md reinforcements. The Implementer correctly followed the operator directive (update test); neither role independently owned the spec-section-amendment step.

**MINOR-2 root cause:** Branch-binding coverage verification relied on structural inspection ("which branch does this AC reach?") rather than mutation reasoning ("if I remove this guard, does any AC fail?"). The distinction matters for `?? N` defaults because the "reaching AC" may exercise only the non-default arm of the containing conditional.

---

## Reinforcements added (file path + line summary)

**CLAUDE-ARCHITECT.md** (22 → 26 REINFORCED lines; +4 lines):
1. Multi-cluster worktree baseline: run `node --test` at session start for pass/fail; do not inherit reference-round attestations in cluster environments. *(Root cause of MAJOR-1)*
2. HALT commit within chore-A diff range: allowed-set spec must account for DIAGNOSTIC files committed mid-round. *(MAJOR-2)*
3. Spec-amendment after ESCALATE disposition: Architect must amend non-authoritative sections after every operator ESCALATE resolution. *(MAJOR-3)*
4. Branch-binding mutation check: `?? N` defaults verified by mutation test ("if removed, does any AC fail?"), not structural inspection alone. *(MINOR-2)*

**CLAUDE-IMPLEMENTER.md** (37 → 39 REINFORCED lines; +2 lines):
1. Halt-condition (b) pass/fail granularity: baseline fail≠0 is a halt-condition even when total count matches spec; write a separate DIAGNOSTIC, not a subordinate note. *(MAJOR-1 secondary, MINOR-1)*
2. Allowed-set expansion requires HALT not tactical self-expansion: ALLOWED_SET drift from spec § 3 must go through DIAGNOSTIC + ESCALATE for Architect spec amendment. *(MAJOR-2 secondary)*

---

## Watch list for next round

- **Spec-amendment-after-ESCALATE**: Three spec sections (§ 5.1 AC-R25-14, § 3/§ 4.6/§ 9.6/§ 9.7 ALLOWED_SET, § 4.3/§ 5.1 tolerance) remain unresolved at HEAD. The Architect should amend these as a discrete spec-amendment commit (or at R26 Architect session start). If left unresolved, Wave 2 ingestion-adapter Architects may propagate wrong tolerances or count attestations.
- **Multi-cluster q01 AC-7 environmental failure**: The cluster worktree lack of `../deploysignal` is a methodology-friction surface captured for Coordinator-level attention. Until resolved, every cluster round will have `fail=1` pre-existing. Future cluster-round Architects must account for this in the baseline claim (e.g., "tests=N / pass=(N-1) / fail=1 (q01 AC-7 environmental pre-existing)").
- **Branch-binding gap (MINOR-2)**: `counter-rate-transform.ts:119` `?? 64` default is structurally unbound. A Wave 2 ingestion adapter calling `transformPair` with `semantic_type: 'counter'` and no `counter_width` depends on this default; the test suite cannot catch its removal.
- **Gauge + missed-scrape (MINOR-3)**: `slope_quality` propagation on the pass-through return path (impl line 111) is untested for the degraded case. Removing it would fail no current test.

---

## Emerging cross-project patterns

- **"spec-not-amended-post-disposition"** is a new tessera violation class (R25 first occurrence). The ESCALATE mechanism correctly surfaces contradictions; the spec-amendment step must be owned explicitly (Architect or as a distinct follow-up commit). Adding a chore-A checklist item: "if any operator ESCALATE disposition occurred, amend the non-authoritative spec sections before chore-A" would close this.
- **Multi-cluster environment drift** introduces Architect verification obligations not present in single-cluster rounds. Specifically: (a) run `node --test` at session start in the cluster worktree; (b) account for DIAGNOSTIC files in the allowed-set when halt-fires are anticipated in spec § 9.10; (c) do not inherit pass/fail baseline from reference-round cross-project-memorial entries.
- **Tactical self-expansion vs HALT**: The R25 MAJOR-2 Implementer secondary attribution reveals a gap in Implementer reinforcements — the case of "ALLOWED_SET in the forward-protection test diverges from spec § 3 (not a production-file scope violation)" was not covered. The new REINFORCED line closes this gap.

---

## Recommend reinforcement consolidation

**CLAUDE-IMPLEMENTER.md is at 39 REINFORCED lines** (threshold is 30). This is the second consecutive round above threshold (37 at R24 close). Run:
```
./scripts/consolidate-reinforcements.sh
```
to archive REINFORCED lines older than 180 days and keep the file navigable. The script is operator-gated and does not auto-run. Recommend running before R26 cluster round.
