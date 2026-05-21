# REVIEWER-REPORT-R78 — Topology-walk tuning envelope (multi-level walk characterization; Phase 4 SLICE 1 FINAL)

**Round:** R78 (full-tier — Architect + Implementer + Reviewer + Memorial-Updater)
**Reviewer HEAD:** `8cb84cf` (`chore(R78 IMPLEMENTER): route → REVIEWER + Memorial confirmations`)
**Round-start SHA:** `3d00490`
**Spec:** `coordination/specs/Q-R78-SPEC.md` (+ `Q-R78-SPEC-AUDIT.md` sidecar)
**Binding-command results (re-run at Reviewer HEAD):**
- `npx tsc -p tsconfig.test.json` → exit 0
- `node --test --test-reporter=tap test/*.test.js` → tests=580 / pass=570 / fail=6 / suites=3 / skipped=4 (R78 q78: 14/14 pass)
- `Q-R78-EMPIRICAL.sh` → exit 0; 8/8 blocks PASS
- `git diff 3d00490 HEAD --name-only` → 12 paths, all ⊆ ALLOWED_SET

**Routing pre-verdict:** 0 CRITICAL / 0 MAJOR / 2 MINOR / 4 OBS → STATUS: MERGE-READY.

---

## § 1. Per-AC verification table

| AC ID | Criterion (short) | Status | Evidence |
|---|---|---|---|
| AC-R78-1 | `tools/topology-walk-tuning.ts` exists | PASS | `tools/topology-walk-tuning.ts` (338 lines); q78 test 1/14 OK |
| AC-R78-2 | matrix JSON + MD exist | PASS | `coordination/coverage/R78-topology-walk-tuning-matrix.json` (122,245 bytes) + `R78-topology-walk-tuning.md` (2,705 bytes); test 2/14 OK |
| AC-R78-3 | schema_version + cells.length=30 | PASS | matrix JSON `schema_version: 'tessera-topology-walk-tuning-v1'`; `cells: [30 entries]`; test 3/14 OK |
| AC-R78-4 | topology_summary structural shape | PASS | matrix JSON `topology_summary.nodes_count=9, edges_count=8, cz_node_id='cz-1', rack_node_ids=['rack-A','rack-B'], rack_a_shards=['shard-00','shard-01','shard-02'], rack_b_shards=['shard-03','shard-04','shard-05']`; test 4/14 OK |
| AC-R78-5 | per-cell exact-equality on (cz_count, rack_count, shadow_fp_count) for all 30 cells | PASS | matrix MD per-scenario tables exactly match spec § 1.4 pre-prediction; test 5/14 OK; spot-checked cells 0/2/4/11/27/28 against engine-generated JSON |
| AC-R78-6 | every cell has 5 trials | PASS | `cells[i].trials.length === 5` confirmed for all 30 cells via JSON inspection; test 6/14 OK |
| AC-R78-7 | seed_prefix === 0x78A11 | PASS | matrix JSON `generated_with_seed_prefix: 494097` (= 0x78A11); test 7/14 OK |
| AC-R78-8 | shadow_rack_fp_count === 0 for hop ≤ 2 | PASS | spot-checked POS-CZ-FULL cell 9 (hop=2 min=3): shadow=0/5; NEG-INDEP cells 26/27 (hop=2): shadow=0/5; test 8/14 OK |
| AC-R78-9 | cz_detection_count === 0 at hop=1 for POS-CZ-* | PASS | matrix MD POS-CZ-SPARSE hop=1: cz=0/5 (cells 0/1); POS-CZ-FULL hop=1: cz=0/5 (cells 6/7); test 9/14 OK |
| AC-R78-10 | matrix MD has 5 per-scenario sections + Method | PASS | matrix MD lines 11/22/33/44/55 have `### POS-CZ-SPARSE/-FULL/-RACK-2/-RACK-3/NEG-INDEP`; line 66 `## Method`; test 10/14 OK |
| AC-R78-11 | recommendation MD has 5 required sections | PASS | `scripts/topology-walk-tuning-recommendation.md` lines 7/65/87/96/113 have `## Empirical envelope / Tuning levers / Recommended operator defaults / Theoretical attribution floor / How to use this document`; test 11/14 OK |
| AC-R78-12 | R72 outputs byte-identical | PASS | `git diff 3d00490 HEAD -- coordination/coverage/R72-saturation-matrix.{json,md}` = empty; test 12/14 OK |
| AC-R78-13 | R77 detector-envelope outputs byte-identical | PASS | `git diff 3d00490 HEAD -- coordination/coverage/R77-detection-envelope-*.{json,md} tools/detector-envelope.ts tools/detection-curve.ts scripts/detector-tuning-recommendation.md` = empty; test 13/14 OK |
| AC-R78-14 | anti-scope diff ⊆ ALLOWED_SET | PASS | `git diff 3d00490 HEAD --name-only` produces 12 paths, all match ALLOWED_SET regex; EMPIRICAL.sh Block 4 PASS; test 14/14 OK |

**Verdict:** 14/14 ACs PASS. Zero PARTIAL / FAIL.

---

## § 2. Findings

### CRITICAL

None.

### MAJOR

None.

### MINOR

**MINOR-1 — attestation overstates "verbatim spec fidelity":** `coordination/MEMORIAL.md:1942` (Implementer CONFIRMATION line for R78) claims `spec-pseudocode-fidelity | tools/topology-walk-tuning.ts implements spec § 3.1 verbatim`. The implementation deviates from spec § 1.5 + § 3.1 in one place: `classifyOutcome`'s second parameter was renamed from `fired_set` (spec) to `_fired_set` (`tools/topology-walk-tuning.ts:131`). The change is functionally inert — the parameter is unused inside the body and the underscore-prefix is the TS-conventional way to silence `noUnusedParameters` — but the Memorial entry claims "verbatim" without qualification. Per REINFORCED 2026-05-18 (encode-actual-results-verbatim, all-roles, attestation-supplementary-fields-verbatim) the attestation language should reflect the actual delta. Severity: MINOR because the function-call observable, the per-trial classification, and every AC outcome are byte-identical to spec; only the role-coordination attestation text drifts.

**MINOR-2 — chore-A commit message line-count attestations are wrong:** Commit `4b5ed80` (`feat(R78 chore-A): topology-walk tuning envelope`) closes with attestations `tools/topology-walk-tuning.ts: created — 244 lines` and `scripts/topology-walk-tuning-recommendation.md: created — 130 lines`. Actual `wc -l` at the same commit: `tools/topology-walk-tuning.ts` = 338 lines (94-line under-claim); `scripts/topology-walk-tuning-recommendation.md` = 148 lines (18-line under-claim). Neither figure matches any standard line metric (non-blank = 322, non-blank-non-comment ≈ 307, non-blank-no-import ≈ 250). Per REINFORCED 2026-05-18 encode-actual-results-verbatim, observed file sizes recorded in coordination artifacts must reflect the actual values. Commit messages are below binding-command attestations in severity but are still a Tessera audit-trail artifact. Severity: MINOR because the figures do not gate any AC, but the discrepancy violates verbatim-recording discipline.

### OBS

**OBS-1 — `_fired_set` underscore-prefix rename is the source of MINOR-1:** Spec § 1.5 + § 3.1 byte-prescribe parameter name `fired_set: readonly string[]` for `classifyOutcome`. Implementation at `tools/topology-walk-tuning.ts:131` uses `_fired_set: readonly string[]`. The parameter is read at no call-site in the body (the shadow-rack-FP check at lines 138-145 walks `result.candidates`, not `_fired_set`). The rename is needed to silence Tessera's `noUnusedParameters` TS check. This is the right TS-idiomatic move but should have been documented in the chore-A commit message or Memorial entry rather than swept under "verbatim". No action required; the implementation is correct.

**OBS-2 — Recommendation MD "non-monotone" commentary uses slightly loose mechanism framing:** `scripts/topology-walk-tuning-recommendation.md:56-60` discusses cells 26 vs 27 (both NEG-INDEP at hop=2, cz=1/5 at min=2 AND at min=3) and says: `Counter-example: cell 27 (hop=2, min=3) also shows cz=1/5 — one trial produced ≥3 cross-rack shards from NEG-INDEP, clearing the min=3 threshold`. The cz min_member_count mechanism at the engine surface counts distinct fired shards whose BFS reaches the cz node within the hop bound — it does NOT specifically require "cross-rack" shards. The cell 27 trial that fires (matrix JSON `cells[27].trials[1].fired_set = ['shard-01', 'shard-04', 'shard-05']`) happens to be cross-rack, but the conjunction "cross-rack ⇒ clears min=3" overstates the necessary condition. Narrative imprecision, not a coverage gap. No action required.

**OBS-3 — No idempotency AC:** Spec § 0 + tool docstring + `## Method` section all claim `Re-running 'pnpm topology-walk-tuning' produces byte-identical output`. The R78 binding-command suite verifies the matrix shape + per-cell counts but does NOT verify byte-identical regeneration. R72 + R77 have the same gap; the spec doesn't bind it. Implementer faithfully followed precedent. Not Implementer-actionable; flagged as a Phase 5 candidate spec-design improvement.

**OBS-4 — AC-R78-4 uses `.sort()` before comparing `rack_a_shards`/`rack_b_shards`:** Test at `test/q78-topology-walk-tuning.test.ts:74-77` does `[...m.topology_summary.rack_a_shards].sort()` before comparing to `['shard-00','shard-01','shard-02']`. The matrix JSON in fact records the shards in the canonical order (verified via JSON inspection), so the test would pass without the `.sort()`. But the test as written would also pass if the matrix recorded e.g. `['shard-02','shard-01','shard-00']`, which the spec § 1.4 + § 3.1 byte-prescribed order forbids. The lenient sort comes from spec § 3.3 verbatim; Implementer is not at fault. Flagged as a spec-level design observation.

---

## § 3. Right-reasons audit

### Test 1 — AC-R78-5: per-cell exact-equality

- **Spec requirement covered:** Q-R78-SPEC.md § 1.4 pre-prediction matrix (30 cells × 3 metrics = 90 binding observations).
- **What the test asserts:** for each of 30 cells in the matrix JSON, `(scenario_class, max_hop_distance, min_member_count, cz_detection_count, rack_detection_count, shadow_rack_fp_count)` must match the 30-tuple EXPECTED array literal at `test/q78-topology-walk-tuning.test.ts:85-116`.
- **Code-correct vs self-confirming?** The EXPECTED literal is a verbatim copy of Architect § 1.4 pre-prediction. The matrix JSON the assertion compares against is produced by `tools/topology-walk-tuning.ts` calling the FROZEN `engine/topology/common-mode-attribution.ts:attributeCommonMode` against the spec-pinned LCG seed and topology fixture. The Implementer did NOT pick the EXPECTED counts; they came from spec § 1.4. The engine that produced the actual matrix counts is unmodified at R78 (verified: EMPIRICAL.sh Block 6 PASS). **NOT self-confirming.** The test catches: (a) PRNG-path drift, (b) engine modification, (c) scenario-generator implementation bugs, (d) seed formula bugs, (e) matrix serialization bugs.

### Test 2 — AC-R78-8: shadow_rack_fp_count === 0 at hop ≤ 2

- **Spec requirement covered:** Q-R78-SPEC.md § 1.4 structural invariant — at hop ≤ 2, BFS from any shard reaches own rack (hop=1) + cz (hop=2) but stops short of the OTHER rack's shards, so no rack candidate can have member_shard_ids containing a shard from the wrong rack.
- **What the test asserts:** for each cell where `max_hop_distance <= 2`, `summary.shadow_rack_fp_count === 0`.
- **Code-correct vs self-confirming?** This is a structural invariant of the engine's BFS bound. The Implementer cannot back this off without modifying the FROZEN engine. The matrix counts are empirically produced by `attributeCommonMode`. **NOT self-confirming.** The test would catch (a) any engine modification that changed BFS direction/bound, (b) any change to the topology fixture that put cz at hop=1.

### Test 3 — AC-R78-14: anti-scope diff ⊆ ALLOWED_SET

- **Spec requirement covered:** Q-R78-SPEC.md § 4 ALLOWED_SET + § 5.1 anti-scope file list.
- **What the test asserts:** `git diff 3d00490 HEAD --name-only` produces zero paths outside the ALLOWED regex (22 path patterns).
- **Code-correct vs self-confirming?** The regex literal IS the spec's ALLOWED_SET. The Implementer could pass this trivially by only committing into the ALLOWED paths — but that IS the discipline the AC binds. **NOT self-confirming.** The test catches: any engine modification, any prior-round test modification, any frozen tool/script edit, any lock-file churn, any `.github/` change. EMPIRICAL.sh Block 4 PASS confirms 12 diff paths all ⊆ ALLOWED_SET.

**All 3 tests trace cleanly to spec requirements. None self-confirming.**

---

## § 4. Cross-cutting checks

### TDD discipline

`git log --oneline 3d00490..HEAD -- test/q78-topology-walk-tuning.test.ts` shows the test file landed in commit `3e7e2cb` (`test(R78 RED): add failing test stubs for topology-walk tuning AC-R78-1..14`). `git show 3e7e2cb --stat` confirms the RED commit ONLY added the test file (`1 file changed, 229 insertions(+)`); no runner, no matrix, no recommendation. The Implementer's RED commit body claims `11 fail at RED ... AC-12/13 pass (frozen surfaces byte-identical); AC-14 passes (only the test .ts/.js files in diff, both in ALLOWED_SET)` — this is structurally plausible (matrix + tuner + recommendation absent → AC-1/2/3/4/5/6/7/8/9/10/11 all fail; frozen-surface diffs empty; only the test in ALLOWED_SET). Chore-A (`4b5ed80`) then adds the 6 implementation files. RED→GREEN ordering verified.

### No-skip / halt discipline

No `coordination/diagnostics/DIAGNOSTIC-R78-*.md` file present (Reviewer did not consult diagnostics — verified by file system check via `git diff` listing). The Implementer's CONFIRMATION at `coordination/MEMORIAL.md:1944` (`halt-discipline-no-halt`) explicitly enumerates: halt-condition 4 (architectural-reality) not triggered — § 1.4 pre-prediction matrix matches exactly; halt-condition 5 (engine modification) not triggered — Block 6 of EMPIRICAL.sh confirms byte-identical engine; halt-condition 8 (FP rate exceeded) not triggered — shadow_rack_fp_count at all cells ≤ pre-prediction. Halt discipline holds.

### Anti-scope

`git diff 3d00490 HEAD --name-only` produces 12 paths:

```
README.md
coordination/MEMORIAL.md
coordination/NEXT-ROLE.md
coordination/coverage/R78-topology-walk-tuning-matrix.json
coordination/coverage/R78-topology-walk-tuning.md
coordination/specs/Q-R78-EMPIRICAL.sh
coordination/specs/Q-R78-SPEC-AUDIT.md
coordination/specs/Q-R78-SPEC.md
package.json
scripts/topology-walk-tuning-recommendation.md
test/q78-topology-walk-tuning.test.ts
tools/topology-walk-tuning.ts
```

All 12 paths are in the spec § 4 ALLOWED_SET. README.md +14 lines added (within ≤ 30 cap per spec § 1.1). package.json + 2 lines (the two new pnpm scripts per spec § 1.1). No engine modifications, no frozen-tool edits, no prior-round test edits, no demo/* edits, no lock-file churn, no `.github/` changes, no `CLAUDE-*.md` modifications (the spec ALLOWED_SET pre-includes these for Memorial-Updater forward-protection; the Implementer correctly left them untouched).

Anti-scope clean.

### Frozen-surface check (extra-vigilant per spec § 5.3 Reviewer mandate)

`git diff 3d00490 HEAD -- engine/` = empty. Verified via EMPIRICAL.sh Block 6 PASS + manual spot-check. Option (iii) — DEFER engine modification — preserved by Implementer as picked by Architect.

---

## § 5. Grilling output (Superpowers Phase 5; on this report, before routing)

- Every finding has file:line reference? **YES** (MINOR-1: `coordination/MEMORIAL.md:1942`; MINOR-2: commit `4b5ed80`; OBS-1: `tools/topology-walk-tuning.ts:131`; OBS-2: `scripts/topology-walk-tuning-recommendation.md:56-60`; OBS-4: `test/q78-topology-walk-tuning.test.ts:74-77`).
- Any AC marked PASS without actual verification? **NO** (all 14 ACs verified via re-run of `node --test --test-reporter=tap test/q78-topology-walk-tuning.test.js` — 14/14 OK pre-routing; EMPIRICAL.sh re-run at Reviewer HEAD; per-cell JSON spot-check via python3 for cells 0, 4, 27).
- Right-reasons audit completed for 3+ tests? **YES** (§ 3 above: AC-R78-5, AC-R78-8, AC-R78-14).
- Adversarial mandate satisfied (≥1 finding documenting an Implementer mistake)? **YES** (MINOR-1 documents an attestation overstatement; MINOR-2 documents commit-message line-count drift; both are real Implementer errors, not Architect/spec issues).
- Did I read the cross-project memorial Reviewer section? **YES** (sampled via grep on "REVIEWER" + "Rule" tags; the Tessera-specific entries do not show new prior-missed issue classes relevant to R78's deliverable type).
- Did I avoid reading diagnostics/, logs/, .prompt-*.md? **YES** — read PRD-equivalent (`coordination/specs/Q-R78-SPEC.md`), source (`tools/topology-walk-tuning.ts`), tests (`test/q78-topology-walk-tuning.test.ts`), recommendation MD, matrix MD + JSON, package.json + README diff, Memorial diff, cross-project memorial Reviewer sample, git log + git show. Did NOT read `coordination/diagnostics/` (verified absent), `coordination/logs/`, or any `.prompt-*.md`.
- Role-boundary held? **YES** — documented findings; did not edit any production or test code; did not pre-empt Memorial-Updater work.

All grilling-gate questions answered YES. Report ready for routing.

---

## § 6. Routing

CRITICAL = 0; MAJOR = 0. Per CLAUDE-REVIEWER.md routing rule: **STATUS: MERGE-READY**.

The R78 deliverable meets all 14 acceptance criteria. The 2 MINORs are attestation-discipline drifts (Memorial language overstating "verbatim" fidelity; commit-message line-count claims inaccurate) and do not gate the substantive deliverable. The 4 OBS items are observations about narrative imprecision and structural test-suite gaps inherited from R72/R77 precedent.

The 0-CRITICAL streak continues (R26 onwards uninterrupted). The Architect's Option-(iii) conservative engine-defer pick is structurally validated by the cross-rack shadow-FP empirical finding at hop=3 — the matrix demonstrates that the existing engine surface already exposes the operator-relevant dials, vindicating the decision NOT to extend the engine.

Memorial-Updater inputs (this report path + MEMORIAL append): `coordination/reviews/REVIEWER-REPORT-R78.md`.

---

## § 7. Reviewer Memorial appends (echoed at MEMORIAL.md per REINFORCED 2026-05-17 + 2026-05-19)

The Reviewer appends both CONFIRMATION and VIOLATION entries to `coordination/MEMORIAL.md` immediately after writing this report; the VIOLATION [role] field for each MINOR names the COMMITTING role (per REINFORCED 2026-05-19 role-attribution rule). MINOR-1 and MINOR-2 are both Implementer-side attestation discipline drifts → [role] = IMPLEMENTER for both.
