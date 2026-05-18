# ROUND-R30-SUMMARY — Phase 2 SLICE 3.B WU-03 NVLink Topology Adapter

**Round:** R30 (full tier — Architect + Implementer + Reviewer + Memorial-Updater)
**Cluster:** `wu-03-nvlink-adapter` (Wave 2 / WAVE-PLAN-02)
**Branch:** `cluster/wu-03-nvlink-adapter-R30`
**Date:** 2026-05-18
**Status:** MERGE-READY (0 CRITICAL / 0 MAJOR / 2 MINOR / 4 OBS)

---

## What worked

- **Full Architect spec depth (Q-R30-SPEC.md § 0–9):** Three brainstorm axes (module decomp / parser strategy / edge representation) each with 3 approaches + selection rationale. Design-phase component inventory, integration-point verification table (9 rows), and failure-mode table (12 rows) completed before per-file pseudocode. § 9 grilling applied 26 standing REINFORCED sweeps + 4-question adversarial walkthrough.
- **Empirical baseline verification in cluster worktree:** Architect ran `node --test` and `npx tsc` in THIS cluster worktree at session start (R25 MINOR-1 + R08 reinforcements applied correctly), establishing 243/241/2 + tsc exit 2 as the verified baseline — not inherited from any prior round's attestations.
- **Clean TDD audit trail:** RED commit `0502ffd` (16 tests fail — module-not-found) precedes GREEN commit `82d1e5a` (all 16 pass). Separate-RED-commit discipline (R23 reinforcement) applied for the second consecutive new-production-code round. Breaks nothing in the pre-existing 257-test suite.
- **Correct binding-command attestation:** `tsc` exit code 2 attested as "2" verbatim, never reframed as "0 (warnings only)." Predicted 259/257/2 matched actual empirically. R26 MAJOR-1 reinforcement applied; no false-compliance-attestation event.
- **Anti-scope clean (exactly 8 paths):** Round-start-to-HEAD diff produces exactly the 8-entry allowed-set. No modification to any Wave-1-frozen file (engine/topology-overlay.ts, engine/l0/counter-rate-transform.ts, engine/types/verdict.ts, engine/hardware-topology-source.ts, test/_substrate/synthetic-counter-generator.ts, prior test files).
- **R-E7 mitigation evidence complete:** All 4 of 4 L0 invariant paths exercised via ingestNvlinkErrorCounter (32-bit wraparound via AC-R30-10; missed-scrape via AC-R30-11; reset-vs-wrap via AC-R30-12; variable-interval normalization via AC-R30-13). R25 MINOR-2 opportunistic close (AC-R30-14) also delivered.
- **Reviewer adversarial mandate honored:** 2 MINOR + 4 OBS findings surfaced from cold-read — not a rubber-stamp. MINOR-1 and MINOR-2 represent genuine coverage-gate gaps not flagged by the spec's own grilling. Reviewer pre-route grilling (6-gate) completed before routing.
- **Right-reasons audit (3 tests, none self-confirming):** AC-R30-4, AC-R30-10, AC-R30-13 each bound to external invariants (fixture structure, frozen substrate constants, L0-contract formula). Three structurally distinct failure modes each; no self-confirming-test pattern.

---

## What violated discipline (role, discipline, what happened)

### VIOLATION 1 — IMPLEMENTER + ARCHITECT / branch-binding-coverage-gate / MINOR-1
**Test AC-R30-15 uses a broad substring assertion for A16 critical invariant.**
`verdict.includes('correlational_not_causal: true')` at `test/q30-nvlink-adapter.test.ts:202-206` matches BOTH `engine/types/verdict.ts:289` (type-declaration body — the guarded location) AND `:272` (JSDoc backtick occurrence — not the guarded location). Removing `:289` while preserving `:272` would leave the assertion passing while the Addition #26 D4 wire-format invariant is silently broken.

The Architect's spec § 9.2 R03 grilling sweep noted the comment-match but characterized it as "intentional, since the literal is in the type declaration body, not a comment" — without computing whether the assertion can actually discriminate the two occurrences. The Implementer translated the spec faithfully (the spec prescribed this assertion); the grilling gateway accepted an ambiguous situation without completing the discriminability check.

### VIOLATION 2 — IMPLEMENTER + ARCHITECT / branch-binding-coverage-gate / MINOR-2
**NvlinkTopologySource constructor has structurally unreachable third-operand fallbacks.**
`this.id = opts.id ?? snapshot.source_id ?? 'nvlink_topology_source'` at `engine/topology/nvlink-source.ts:133` — the third operand `'nvlink_topology_source'` is dead code because `parseNvlinkStatus` always defaults `snapshot.source_id` (`:108`), and `TopologySnapshot.source_id` is typed `string` (required, never undefined).

AC-R30-9 sub-case (c) (`new NvlinkTopologySource(WELL_FORMED, {})` → `id === 'nvlink_topology_source'`) passes via the parser-side default, not the constructor's third operand. Spec § 9.2 R06 sweep claimed "all opts fields covered" without tracing data flow through `parseNvlinkStatus`'s own defaults. IDIOMATIC — matches `HardwareTopologySource` precedent — but the coverage claim is structurally inaccurate for the dead operands.

---

## Root cause analysis

### MINOR-1 root cause
The Architect's § 9.2 grilling sweep performs a **presence check** (does the spec acknowledge the issue?) rather than a **resolution check** (has the assertion been validated as discriminating?). When a grilling note says "pattern also matches comment — intentional," the natural next question is "does removing the type-declaration occurrence while preserving the comment occurrence break the assertion?" — but this question was not computed. The grilling stopped at acknowledgment instead of resolution.

The Implementer translated the spec prescription faithfully; the weak assertion originated from the spec's prescribed form, not from independent Implementer judgment.

### MINOR-2 root cause
The Architect's § 9.2 R06 opts-coverage sweep performed a **syntactic coverage check** (are all opts fields referenced in the fallback chain?) rather than a **data-flow coverage check** (can each step of the chain actually be reached?). Tracing through `parseNvlinkStatus`'s defaulting behavior — which the spec authored in § 2.1 and § 4.1 — would have revealed that `snapshot.source_id` / `snapshot.source_version` are always defined at the constructor body.

The Implementer implemented the spec-prescribed chain (§ 2.2) correctly. The dead code is a consequence of an architecturally correct spec design (parser provides defaults so the class doesn't need to duplicate them), but the grilling coverage claim overreached.

### Shared pattern
Both MINORs reflect a grilling gap: noting an issue or a claim without validating whether the assertion / coverage gate actually delivers the stated guarantee. The gap between "I noted it" and "I verified it holds" is where the discipline breaks.

---

## Reinforcements added

| File | What was added | Triggered by |
|---|---|---|
| `CLAUDE-IMPLEMENTER.md` | REINFORCED 2026-05-18 — For critical-invariant ACs, write discriminating assertions anchored to the specific structural location (regex with line anchoring), not broad substring checks that match multiple file occurrences. | MINOR-1 |
| `CLAUDE-IMPLEMENTER.md` | REINFORCED 2026-05-18 — When implementing multi-level fallback chains (`a ?? b ?? c`), verify each level is structurally reachable by tracing data flow through called functions' own defaults. Dead code must be removed or explicitly documented as defensive. | MINOR-2 |
| `CLAUDE-ARCHITECT.md` | REINFORCED 2026-05-18 — When grilling sweep notes "pattern also matches comment/JSDoc," complete the discriminability check: would the assertion pass if only the comment occurrence remained? If yes, the assertion must be strengthened before spec emit. | MINOR-1 |
| `CLAUDE-ARCHITECT.md` | REINFORCED 2026-05-18 — When § 9.x R06 opts-coverage sweep claims "all opts fields covered," trace coverage through FULL data flow including called functions' return values. Syntactic inspection of the chain is insufficient; ask what inputs actually reach each `??` operand. | MINOR-2 |

**CLAUDE-IMPLEMENTER.md line count:** 44 REINFORCED lines after R30 (was 42 before; +2 this round). Above the 30-line consolidation threshold.

---

## Watch list for next round

1. **AC-R30-15 discriminability gap (carry-forward candidate):** The A16 guard in `test/q30-nvlink-adapter.test.ts:202-206` uses a non-discriminating assertion. Suggested fix: `/^\s*correlational_not_causal:\s*true\s*;/m` regex. No round is mandated for this fix, but it should appear on the WU-05 or close-walk round's improvement list.

2. **NvlinkTopologySource constructor dead code (carry-forward):** The third-operand `?? 'nvlink_topology_source'` and `?? 'nvlink-1'` at `nvlink-source.ts:133-134` are structurally unreachable. Either document explicitly as defensive or remove. Low priority (idiomatic; matches established precedent), but the dead-code surface is unverified territory.

3. **OBS-1 spec internal inconsistency:** Spec § 9.2 "R25 MAJOR-1 empirical baseline" row mentions "261/259/2" in one cell while all other references say "259/257/2." This is a minor documentation error with no impl impact; if spec is ever re-read for a future close-walk, the conflicting cell should be corrected.

4. **OBS-2/OBS-3 chore-A scope sequencing:** Spec § 10 step 4 and § 5 AC-R30-18 prescribe incompatible scopes for chore-A (sweep-inclusive vs placeholder-injection). Both OBS share the same root cause (§ 10 wording not updated to reflect the placeholder mechanism). Future Architect writing chore sequencing prescriptions should verify that a "sweep-inclusive chore-A" is compatible with the SHA-placeholder-injection mechanism used in AC-R30-18 class tests.

5. **CLAUDE-IMPLEMENTER.md consolidation:** 44 REINFORCED lines — 5th consecutive round above the 30-line threshold. Operator should run `./scripts/consolidate-reinforcements.sh` before the next round to archive lines older than 180 days and keep the file navigable.

---

## Emerging cross-project patterns

- **Grilling acknowledgment ≠ grilling resolution:** R30 introduces the first tessera `branch-binding-coverage-gate` violations. The root cause in both cases is a grilling sweep that acknowledged an ambiguity or coverage claim without resolving whether the guarantee actually holds. This is a new sub-class of Architect grilling violation (prior violations were about: phantom .js entries in allowed-set [R23], empirical baseline verification method [R25], spec-amendment-after-disposition [R25]).

- **Cross-cluster R30 context:** wu-03-nvlink-adapter is the third Wave 2 cluster to complete (alongside wu-01-slurm-adapter and wu-02-k8s-adapter). This cluster's first round (R30) achieves the cleanest result of the Wave 2 set: 0 CRITICAL / 0 MAJOR vs R25's 3 MAJOR / 3 MINOR. The R25/R26 reinforcements on halt-discipline and attestation-layer fidelity are visibly propagating: R30 has zero attestation-layer violations.

- **TDD audit-trail streak:** Two consecutive new-production-code rounds (R26 + R30) both honor the separate-RED-commit discipline after R23's streak-breaking event. The R23 reinforcement is working.

---

## Recommend reinforcement consolidation

**CLAUDE-IMPLEMENTER.md is at 44 REINFORCED lines** (threshold: 30). This is the 5th consecutive round where the file exceeds the threshold. Run:

```
./scripts/consolidate-reinforcements.sh
```

to archive REINFORCED lines older than 180 days. This is operator-triggered; the script does not auto-run.
