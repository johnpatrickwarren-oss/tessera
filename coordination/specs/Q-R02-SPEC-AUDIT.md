# Q-R02-SPEC AUDIT SIDECAR (v0.1)

_Sidecar to `Q-R02-SPEC.md`. Contains brainstorm full rationale, resolved-decision why-picked/why-rejected, pre-route discipline application, architect pre-predictions, and Q-R02 → Q-R03 sequencing context — content that documents how the spec was produced but does not need to be loaded by the Implementer cold-reading the spec._

_Reviewer reads BOTH this file and `Q-R02-SPEC.md`. Implementer reads ONLY `Q-R02-SPEC.md` (plus source files)._

---

## Brainstorm (Superpowers Brainstorm phase output)

Five distinct approaches were generated and evaluated before R02 spec authoring began. Each evaluated against strengths / weaknesses / hidden assumptions / risks; selection rationale documented at the end.

### Approach A — Full SLICE 2 per SCOPING-MEMO

**Scope:** Schema extension + compile-time hierarchical-pool extension + warm-start cold-start runtime mechanism + P3 axis 5 compiled-artifact verification at synthetic N=100 shard fleet + empirical P6 storage profile (PR-F5).

**Strengths:** Matches scoping-memo roadmap exactly. Delivers AC-P2 user-facing capability (alerts within 20 samples) in one round. Closes Phase 1 SLICE 2 atomically.

**Weaknesses:** Five deliverables in one round equals or exceeds the R01 context load that crashed the IMPLEMENTER session. Mixing schema (compile-time) + runtime + empirical-measurement in one round violates the natural architectural-layer boundary. Warm-start mechanism warrants its own brainstorm + design cycle — bundling it into a multi-deliverable round dilutes both.

**Hidden assumptions:** That the per-role CLAUDE.md split (commit `c8f8ba7`) is sufficient mitigation for the 4-5 deliverable context load. That warm-start mechanism has enough architectural pre-clarity not to need its own brainstorm.

**Risks:** Session crash recurrence; spec quality degradation from scope-pressure; another R01-style "Implementer absorbs scope creep silently."

### Approach B — SLICE 2a (schema-only) + R01 carry-forward dispositions

**Scope:** Extend `PerShardResidual` with runtime-required fields; restructure `PerShardCell` to mirror inherited `BaselineCellEntry`; extract `CellDimension` + `CellConfidence` typedefs canonically; bundle architecturally-load-bearing R01 carry-forwards (anti-scope vendoring acceptance via spec text, manifest gap fix, module-model canonicalization, dead-test removal); defer warm-start runtime + compiled-artifact verification + P6 measurement to R03 (SLICE 2b).

**Strengths:** Tight scope (1 schema file + 1 manifest fix + 1 test file + 2 deletions). Mirrors R01's successful mechanical-vendoring pattern (typecheck = win). Closes R01 carry-forwards systematically without a ceremonial "fix-cycle" round. Splits SLICE 2 into clean 2a (compile-time) / 2b (runtime) boundary mirroring DeploySignal Q66 `.γ → .γ.b → .γ.c` iterative-refinement precedent cited in SCOPING-MEMO § 2.2. Lowest context-pressure risk. TDD-verifiable (test-first feasible per AC-13).

**Weaknesses:** Doesn't deliver AC-P2 user-facing capability this round (deferred one round to R03). Splits scoping-memo's atomic-feeling SLICE 2 into 2a/2b (operator cognitive overhead of two-round phase 1 sub-slice).

**Hidden assumptions:** That the operator implicitly approves splitting SLICE 2 into 2a/2b (architect scoping discretion within the SCOPING-MEMO roadmap). That R01 fix-cycle items are appropriate to bundle into R02's spec rather than a separate fix-cycle round.

**Risks:** If SLICE 2a schema fields are mis-derived, SLICE 2b implementer hits halt conditions (mitigated by binding the field set to SCOPING-MEMO § 2.2 storage-encoding clause + R01 spec § Mechanism Delta 3 commitment).

### Approach C — R02 = pure R01 fix-cycle

**Scope:** Address all 5 R01 MAJORs + all 9 R01 MINORs as architectural dispositions; NO new architectural surface; defer all SLICE 2 work to R03.

**Strengths:** Smallest scope possible. Discipline-clean: no new behavioral work until prior round disciplinary debt closed. Validates the per-role CLAUDE.md split on simple work before adding complexity.

**Weaknesses:** Wastes a round on non-behavioral work — the operator already manually closed MAJOR-1 (tsconfig) without a full pipeline round, demonstrating that fix-cycle work doesn't always need ceremony. Does not advance Phase 1 progress. Most R01 MINORs (3/4/5/6/8/9) are sub-surfaces that don't benefit from architect-level disposition without being co-located with their parent surface change.

**Hidden assumptions:** That R01 MAJORs all require ARCHITECT disposition (they do, but the spec amendments are small enough to bundle).

**Risks:** Round produces no behavioral progress; pipeline overhead for ceremonial work.

### Approach D — SLICE 2b (warm-start runtime only, skip schema)

**Scope:** Implement warm-start cold-start runtime logic; compiled-artifact verification at synthetic N=100 shard fleet; skip schema extension (use SLICE 1 shape as-is).

**Strengths:** Delivers AC-P2 user capability. Tackles architecturally-load-bearing piece head-on.

**Weaknesses:** SLICE 1 schema is provably insufficient for runtime (missing `n_samples`, `residual_seed_hash`, etc.); the architect-pre-prediction at R01 spec line 35 commits "SLICE 2 will add ..." which acknowledges this gap. Runtime cannot proceed without schema. Approach is structurally incoherent.

**ELIMINATED** — schema is a hard prerequisite for runtime.

### Approach E — Empirical P6 storage profile only

**Scope:** Measure storage at N=1000 shard fleet to validate ~1.2-1.5× single-instance-footprint architect-pre-prediction; no schema or runtime work.

**Strengths:** Decouples empirical measurement from architectural work; could surface "schema is the wrong size" before SLICE 2 commits to a shape.

**Weaknesses:** Cannot measure storage without populated `per_shard_cells` data; populated data requires runtime which requires schema. Measurement is a downstream verification, not a foundation.

**ELIMINATED** — measurement requires runtime which requires schema.

### Selection — Approach B

**Rationale for selection:** R01's failure mode (session crash at coordination under 4-deliverable context load) is the dominant risk signal entering R02. The per-role CLAUDE.md split (commit `c8f8ba7`) addresses one root cause but defense-in-depth says: also right-size scope. Approach B is the smallest scope that delivers architectural progress beyond pure ceremony. The compile-time / runtime boundary is a natural architectural-layer split (mirroring the DeploySignal Q66 iterative-refinement precedent referenced in SCOPING-MEMO § 2.2). The R01 carry-forward bundling co-locates dispositions with the same `config.ts` file the schema work touches — efficient.

**Rejection rationales:**
- A rejected: 5-deliverable scope = repeat of R01 failure mode; high cost if crashed.
- C rejected: pure ceremonial work; can be absorbed into B with no marginal cost.
- D + E eliminated: structural incoherence (D = runtime without schema; E = measurement without runtime).

**Tier rubric verdict:** **full** tier. Factors fired:
- **A2** (new architectural pattern with no precedent in the codebase) — typedef-extraction-as-canonical pattern is new at Tessera; mirrors inherited `BaselineCellEntry` shape but the per-shard-residual analog is novel.
- **A4** (novel data model) — `PerShardResidual` extension to four new optional + one new mandatory field, plus `PerShardCell` restructure, qualifies as novel data-model evolution beyond R01's thin schema declaration.
- **A7** (first-time territory) — Tessera Phase 1 SLICE 2 has no precedent; SLICE 1 was the only prior round.

**Q-cycle estimate:** ~3-4 hours of focused Implementer work. Substantially less than the 1-2 days SLICE 1 (R01) estimated, because the schema changes are localized to one file and the test surface is small.

---

## Q-R02 → Q-R03 sequencing context

R03 (SLICE 2b) scope inferred from this R02 narrowing:
- Warm-start runtime mechanism (read `PerShardResidual` from compiled-config; populate from observed samples; transition `confidence` per (n_samples ≥ 20 → 'warm_start') and (n_samples ≥ 60 → 'strict') thresholds; use `residual_seed_hash` for fleet-aggregate-refresh invalidation; use `last_observed_at` for warm-start window eligibility).
- Compiled-artifact loading (read a synthetic-cluster Tessera-side compiled-config JSON; verify schema additions round-trip through serialize/deserialize).
- P3 axis 5 compiled-artifact verification at synthetic N=100 shard fleet.
- PR-F5 empirical storage profile (measure populated `per_shard_cells` footprint vs single-instance baseline; validate the 1.2-1.5× architect-pre-prediction within ±2× tolerance per SCOPING-MEMO § 2.2 storage-footprint clause).

R03 will also need to decide:
- Whether `tools/vendor-from-deploysignal.sh` needs hardening (OQ-1 deferred from R02).
- Whether `test/q01-vendoring-coverage.test.ts` iteration should broaden to include `test/*` paths (OQ-2 deferred from R02).
- Whether a Tessera-side compiled-config substrate factory needs to land alongside the runtime (likely yes — synthetic-cluster test fixture generation will need it).
- Whether the `as any` cast on `CellKey` test literals should be replaced by a CellKey factory (OQ-4 deferred from R02 with a "bounded budget" instruction).

R03 will not be a separate fix-cycle: the R01 carry-forwards bundled at R02 close out the architecturally-load-bearing items, and R03 work has its own surface to bundle remaining R01 MINORs (3/4/5/6/8/9) when touched.

---

## Pre-route discipline application

### Skill 14 — PRD-conjunction-cross-check (symmetric)

PRD AC-P2 conjuncts: "warm-start `cell_confidence` enables alerts within 20 per-shard samples" + "strict-upgrade at 60 samples preserves inherited single-instance behavior."

R02 narrows AC-P2 delivery to schema only (no runtime alerting at SLICE 2a). The PRD conjunct "enables alerts within 20 per-shard samples" is **not delivered this round**; spec preamble + R02-SAS-1/2/3 explicitly fence the runtime work to SLICE 2b. No silent narrowing — the deferral is explicit. Skill 14 symmetric-application: R02 spec narrows scope (delivery deferred); spec text documents the narrowing. PASS.

### Skill 15 — Prescription-to-AC-coverage

Every § Mechanism Delta binds to one or more AC:
- Delta 5 (`PerShardResidual` field extension) → AC-1, AC-2
- Delta 6 (`PerShardCell` restructure) → AC-3, AC-7 (test update)
- Delta 7 (typedef extraction) → AC-4, AC-5
- Delta 8 (q01-schema-additions test update) → AC-7
- Delta 9 (ville-preservation deletion) → AC-11
- Delta 10 (manifest fix) → AC-9, AC-10
- Delta 11 (new q02 test file) → AC-1 through AC-5, AC-8

Tsc-clean + smoke-test pass → AC-6, AC-12. TDD ordering → AC-13.

Every AC binds to a runnable check (test invocation or grep) or to Implementer-side commit-time attestation. PASS.

### Memorial sweep

Inherited active memorials applied:
- **Memorial D** (architectural-layer-coverage at hypothesis-tree time): brainstorm enumerated 5 candidates; 3 rejected with explicit weakness rationale; 2 eliminated as structurally incoherent. Selection of B documented above.
- **Memorial F** (compile-time substrate change sub-rules 1+2+3+4): file-opened (P3.3); inherited type-state cited (`engine/types/config.ts` lines 100-125, 400-450, 830-868 verified); candidate-set enumeration (5 approaches); no narrowing of stakeholder requirements (SLICE 2 → 2a is documented narrowing, not silent).
- **No-skip-policy on statistical-invariant tests**: ville-preservation deletion explicitly defended as "removed pending substrate availability" (not silent skip); manifest documents the substrate-availability gate.
- **R01 ARCHITECT cross-section consistency reinforcement** (from CROSS-PROJECT-MEMORIAL.md line 906 + CLAUDE-ARCHITECT.md reinforcement): executed in dedicated § Cross-section consistency pass section of the spec, 9 resolved-decision checks all PASS.

### Compilation-dependency enumeration (R01 MAJOR-3 lesson — applied this round)

Per R01 MAJOR-3, the Architect must enumerate compilation dependencies before declaring anti-scope on a target file. R02 schema deltas operate on `engine/types/config.ts`; compilation dependencies of this file are inherited and were already vendored at R01 (verified — file imports nothing from outside the vendored tree). The deltas (5/6/7) add type declarations without introducing new external dependencies. No new anti-scope-vs-compilation-deps tension at R02. PASS.

---

## Architect pre-predictions on outcomes

Each prediction is committed before the round runs so the post-round Memorial Updater can grade prediction accuracy.

1. **AC outcome:** All 13 ACs PASS at first IMPLEMENTER pass (no fix-cycle required). Schema work is mechanical and bounded; `tsc` clean is the dominant risk and is verifiable in <1 min.
2. **Halt conditions:** zero — schema deltas are precisely scoped; § Per-file pseudocode is line-range-cited; Implementer notes are mandatory with verification commands. The most likely surprise (OQ-5: latent inherited compile failure on Delta 7 extraction) is architect-pre-predicted as "no" and Implementer is instructed to HALT with mechanical fix if wrong.
3. **TDD ordering:** verifiable via two-commit sequence (RED commit = test/q02-schema-extension.test.ts + updated test/q01-schema-additions.test.ts; GREEN commit = engine/types/config.ts Deltas 5/6/7). R01 MINOR-9 gap closes.
4. **Implementer Q-cycle:** ~3 hours total (15 min q02 test write; 30 min Delta 5/6/7 land + tsc clean; 15 min q01 test update; 15 min manifest + ville-preservation delete + tsc/test pass attestation; 30 min coordination artifacts). Comfortably under R01's 2-day budget.
5. **Reviewer findings:** ≤2 MINOR + 0 MAJOR expected. Surface is small enough that scope-creep risk is low; the brainstorm + carry-forward bundling discipline addresses the dominant R01 failure classes.
6. **Memorial state delta:** No new Memorial D violations expected (file-opened applied; candidate-set enumerated). One CONFIRMATION expected for the R01 ARCHITECT cross-section-consistency reinforcement (first round of its application as a structural pass). One CONFIRMATION expected for Memorial F compile-time-substrate-change sub-rule application.
7. **Session-crash risk:** low. Per-role CLAUDE.md split active; spec is one-file-focused; test surface small; no orchestration or multi-file compile coordination. Defense-in-depth via scope narrowing is the load-bearing mitigation.

---

## Decision rationale (per resolved decision)

### D1 — Schema field set for `PerShardResidual` extension

**Picked:** Four fields total — `n_samples: number` (mandatory); `mean_delta?: number[]` + `residual_seed_hash?: string` + `last_observed_at?: number` (optional).

**Why picked:** R01 spec § Mechanism Delta 3 explicitly committed "SLICE 2 will add: residual_seed_hash, per_shard_n_samples, etc." (line 289). The four fields are derived from SCOPING-MEMO § 2.2 storage-encoding-and-runtime-requirements clauses: `n_samples` for warm-start (n ≥ 20) and strict-upgrade (n ≥ 60) transitions; `mean_delta` for sparse-encoded warm-start residual (delta from fleet-aggregate); `residual_seed_hash` for fleet-aggregate-refresh invalidation; `last_observed_at` for warm-start eligibility window logic. Each field directly enables one SLICE 2b runtime semantic; no speculative fields added.

**Why fewer fields rejected:** Stopping at `n_samples` alone would force SLICE 2b to either skip warm-start (defeating AC-P2) or extend the schema mid-SLICE-2b (re-introducing scope drift). The four-field set is the minimum that supports SLICE 2b's full runtime surface.

**Why more fields rejected:** Adding `strict_upgrade_history?` or per-detector-family residual fields was considered and rejected as speculative — SLICE 2b can extend if needed; SLICE 2a ships the minimum derivable from SCOPING-MEMO clauses.

### D2 — `PerShardCell` restructure (additive vs breaking)

**Picked:** Breaking restructure — `{ shard_id, key: CellKey, residual: PerShardResidual }` (was `{ shard_id, residual }`).

**Why breaking-restructure picked:** Mirrors inherited `BaselineCellEntry { key: CellKey, ... }` shape exactly. Makes per-`(shard_id, cell_key)` lookup the natural array iteration pattern. R01 explicitly committed to provisional schema ("Full PerShardResidual runtime semantics are SLICE 2 scope; SLICE 1 ships the type declaration only" — R01 spec line 35), so breaking-change is in-bounds.

**Why additive-via-`cell_key?: CellKey` rejected:** Making `cell_key` optional would split (shard_id, cell_key) lookup logic across two code paths at SLICE 2b (Optional handling = noise). Mirror of inherited `BaselineCellEntry.key: CellKey` (mandatory) is cleaner.

**Why nested-record alternative rejected:** `PerShardCell { shard_id, residuals: Record<CellKey, PerShardResidual> }` was considered. Cons: JSON-serializes less cleanly (CellKey-as-object-key requires stringification); doesn't mirror inherited shape. Pros: O(1) per-cell lookup. The lookup-perf advantage is illusory at SLICE 2a (no runtime); architectural-consistency with inherited shape wins.

### D3 — Typedef extraction (`CellDimension` + `CellConfidence`) as canonical

**Picked:** Extract typedefs canonically; replace inline unions in interfaces with typedef references; remove the R01-shipped convenience-alias duplicates.

**Why extract-canonically picked:** Single source of truth (closes R01 MINOR-1 drift risk). Spec test surfaces and consumer surfaces both import the canonical typedef. Aligns with the architect-deferred path R01 chose ("refactor-to-extract-typedefs deferred") — the deferral was justified at SLICE 1 (no extraction need); at SLICE 2a where the schema is changing anyway, extraction is now justified.

**Why keep-inline-only rejected:** Forces test/consumer code to use `BaselineCellsConfig['dimensions'][number]` indexed-access types (verbose; less ergonomic). Doesn't close the MINOR-1 alias drift.

**Why keep-both-with-explicit-relationship rejected:** Two sources of truth always drift over multi-round timelines. No structural reason to retain both.

### D4 — R01 carry-forward bundling (which MAJORs/MINORs are bundled into R02)

**Picked:** Bundle MAJOR-3 (anti-scope acceptance via spec text), MAJOR-4 (manifest fix), MAJOR-5 (module-model documentation), MINOR-1 (typedef extraction closure), MINOR-2 (field-name canonicalization), MINOR-7 (dead-test removal). Defer MINOR-3/4/5/6/8/9 to when their parent surface is next touched.

**Why this bundling picked:** The bundled items either (a) directly touch `engine/types/config.ts` or `VENDORING-MANIFEST.md` (the two files R02 modifies for architectural reasons), or (b) require architect-level disposition that cannot wait for opportunistic surface change. MAJOR-3 (anti-scope acceptance) is a spec-text disposition with no code change. MAJOR-4 manifest fix is a one-row append. MAJOR-5 is documentation-only. MINOR-1/2/7 directly affect the test files and config.ts surfaces being touched.

**Why deferred items rejected for R02:** MINOR-3 (HEADER_LINE_COUNT robustness) lives in q01-no-at-pin-deltas test file which R02 does not touch. MINOR-4/5/6 (vendoring script hardening) lives in `tools/vendor-from-deploysignal.sh` which R02 does not touch. MINOR-8 (header cosmetic) is sub-cosmetic and can wait. MINOR-9 (TDD-evidence single-commit landing) is structurally addressed by R02 AC-13 (two-commit sequence required) rather than by retroactive disposition.

### D5 — Deferral of warm-start runtime to R03 (Approach B selection)

**Picked:** SLICE 2a (compile-time schema only); defer SLICE 2b (warm-start runtime + compiled-artifact verification + P6 measurement) to R03.

**Why deferred:** Per Approach B selection rationale above. Defense-in-depth against R01 session-crash recurrence; clean architectural-layer split; better TDD verifiability.

**Why not deferred (Approach A) rejected:** See Approach A weaknesses + risks; primarily session-crash recurrence risk + scope-creep risk from multi-deliverable rounds.

---

## Amendments from prior version

v0.1 — initial R02 spec emit, 2026-05-16. No prior version.
