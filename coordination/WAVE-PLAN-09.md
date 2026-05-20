# WAVE-PLAN-09 — Wave Plan v1: Tessera Phase 3 SLICE 3 (DeploySignal Integration)

**From:** Coordinator TPM (R60 — third Phase 3 Coordinator invocation; PRD-decomposition + DAG + wave sequencing for Phase 3 SLICE 3)
**Date:** 2026-05-19
**Version:** v1 (initial Phase 3 SLICE 3 wave plan; opens the final Phase 3 SLICE)
**Foundation:** `coordination/PRD.md` § Phase 3 Scope → SLICE 3 sub-section (lines 483–487, FR-D1 + FR-D2 + FR-D3, AC-P8); `coordination/SCOPING-MEMO-v0.3.md` § 9 (engine vendoring policy — extract-to-npm commitment); `coordination/WAVE-GATE-08.md` § Forward-flags (lines 82–103, PARALLEL-FAN-OUT mandate for 3B+3C); `coordination/WAVE-PLAN-07.md` (R55 SLICE 2 wave plan; split-with-sequential precedent reference); `coordination/WAVE-PLAN-06.md` (R52 SLICE 1 wave plan; bundle-with-Architect-override precedent)
**Type:** wave plan — Phase 3 SLICE 3 PRD decomposition + DAG + wave sequencing
**Round-start SHA:** `383c1e8` (chore(R59): WAVE-GATE-08 close; Phase 3 SLICE 2 closes); HEAD at plan emit `c896b16` (chore(R60) directive prep)
**Relationship to prior plans:** **Sibling, not supersession.** WAVE-PLAN-01/02/03 (Phase 2) and WAVE-PLAN-06/07 (Phase 3 SLICE 1+2) preserved on disk per Coordinator versioning discipline. WAVE-PLAN-09.md opens Phase 3 SLICE 3 dispatch; final Phase 3 SLICE. **SLICE 3 close == Phase 3 close == project-close-candidate** per PRD § Phase 3 success metrics line 508.

---

## Plan summary

**Three work units, two sequential waves, single-cluster + 2-cluster-parallel-fan-out.** WU-Phase3-3A (engine npm package extract) is foundational and dispatches as a single full-tier cluster in Wave 9. After WAVE-GATE-09 close authorizes WU-3B + WU-3C dispatch, **WU-Phase3-3B (Tessera → DS feed) and WU-Phase3-3C (DS → Tessera event consumer) dispatch as PARALLEL CLUSTERS in Wave 10**. This is the **first Phase 3 wave to leverage the parallel-cluster pattern**; the operator's R60 PARALLEL-FAN-OUT mandate (NEXT-ROLE.md:127) was empirically tested against D1-D5 and **confirmed: 3B and 3C are genuinely independent post-3A** (no D1 shared-output, no D2 cross-AC reference, no D5-strict write-conflict; D4 file-tree contention resolvable via parallel-class file convention inside a new `engine/ds-integration/` subdirectory).

**Fan-out analysis (3B ↔ 3C):**

- **D1 (shared output ownership): LOW.** 3B writes Tessera→DS feed code (`engine/ds-integration/feed.ts` Coordinator-default; Architect picks at spec time). 3C writes Tessera-side DS event consumer (`engine/ds-integration/event-consumer.ts` Coordinator-default; Architect picks at spec time). Parallel-class file convention precedent: R28+R29+R30+R53+R56 each owned a distinct file in `engine/topology/`. The same convention applied to `engine/ds-integration/` keeps 3B+3C output-ownership disjoint.
- **D2 (AC reference): LOW.** 3B's ACs bind Tessera-produces-VerdictGroup-payload-consumable-by-DS direction. 3C's ACs bind Tessera-consumes-DS-event-feed-and-activates-freeze-hook direction. These are reverse-direction concerns; neither AC set references the other WU's surfaces. (See Step 2 inter-WU edge table for the full argument.)
- **D3 (anti-scope adjacency): LOW with judgment-call.** Both touch DS integration. 3C extends the Phase 2 freeze-hook to take real DS events (instead of synthetic VerdictGroups); 3B propagates VerdictGroups Tessera-internal-and-out-to-DS. The freeze-hook is Phase 2 frozen surface; 3C extends it via constructor/factory addition (not body modification). 3B does NOT touch the freeze-hook. No anti-scope adjacency between 3B and 3C themselves; both have anti-scope adjacency with the Phase 2 freeze-hook (R20+R21+R36 frozen), which each WU's own anti-scope clause handles independently.
- **D4 (file-tree overlap): LOW.** Both touch `engine/ds-integration/*` (new subdirectory). Resolvable via parallel-class file convention (distinct files per WU). Worktree isolation under `scripts/multi-track-cluster-setup.sh` keeps in-flight diffs in separate cluster branches.
- **D5 (schema/migration write-conflict): LOW with file-layout discipline.** Potential D5-contention: if 3B and 3C both add types to a shared `engine/ds-integration/types.ts`. Resolution: each WU owns its own types file (3B owns feed-types; 3C owns event-types). If shared DS-integration types prove necessary at spec time, escalate as a CLUSTER-HANDOFF amendment for the operator to decide between (a) pre-landed shared-types substrate in Wave 9 or (b) sequential dispatch in Wave 10 forfeiting the parallelism. Coordinator default: file-layout-isolated parallel-class. See Step 3 Judgment call 2.

**Verdict: PARALLEL-FAN-OUT (Option C) is the correct shape for Wave 10.** This honors the operator's NEXT-ROLE.md:127 directive ("default-to-sequential REJECTED without empirical D-test demonstration") AND the underlying R24 fan-out preference ("PREFER fan-out when D1-D5 tests show clean independence"). Phase 2 Wave 2 precedent (WU-01 SLURM + WU-02 K8S + WU-03 NVLINK in 3-cluster parallel) is the structural reference. 3B+3C in 2-cluster parallel matches the operational-cap-of-5 constraint (CLAUDE-COORDINATOR.md §Step 5).

| Wave | Cluster count | Foundation? | Notes |
|---|---|---|---|
| 9 | 1 (single-cluster) | **YES — WU-Phase3-3A is the SLICE 3 foundation** | WU-Phase3-3A: engine npm package extract (`@johnpatrickwarren-oss/deploysignal-engine`). Foundational per CLAUDE-COORDINATOR.md §Step 4 ("outputs are inputs to 3+ other work units across 2+ domains/modules" — applies: WU-3A's npm package is consumed by 3B + 3C inside Tessera AND by sibling DS repo outside Tessera). Eliminates vendoring-drift R-E6 risk row per PRD AC-P8. Full tier (A1+A2+A4+A6+A7 — architectural restructure; substantial novelty; touches Tessera AND DS repos). |
| 10 | 2 (PARALLEL clusters) | No | WU-Phase3-3B (Tessera → DS feed) + WU-Phase3-3C (DS → Tessera event consumer + freeze-hook real-event activation). Both full tier. Both dispatched in parallel via `scripts/multi-track-cluster-setup.sh` (one cluster each). CLUSTER-HANDOFF-WAVE10-3A-3B + CLUSTER-HANDOFF-WAVE10-3A-3C emitted at WAVE-GATE-09 close documenting the npm package contract that BOTH consume. |

**Recommended operator action per wave:**

- **Wave 9 (WU-3A dispatch):** `./run-pipeline.sh --tier full` from the main worktree at `~/concord/tessera`. Standard single-cluster dispatch. NOT `--coordinator`. NOT `multi-track-cluster-setup.sh`. The npm package extract is single-cluster work even though it touches a sibling repo — see Step 3 Judgment call 1.
- **Wave 10 (WU-3B + WU-3C parallel dispatch):** Operator invokes `scripts/multi-track-cluster-setup.sh` per cluster (one for each WU), then dispatches each cluster's pipeline via `./run-pipeline.sh` from the cluster worktree. Coordinator role NOT in-loop during cluster execution; Coordinator re-engages at WAVE-GATE-10 close.

**Tier-aware consolidation Reviewer at wave-gate close (per R50):**

- **WAVE-GATE-09 (after Wave 9 / 3A):** Single-cluster full-tier with cluster-internal Reviewer → consolidation Reviewer **OPTIONAL** per R50. The wave-aggregate verifier mechanical gate is sufficient absent cross-cluster integration concerns. WAVE-GATE-09 emits CLUSTER-HANDOFF-WAVE10-3A-3B + CLUSTER-HANDOFF-WAVE10-3A-3C documenting npm package contract.
- **WAVE-GATE-10 (after Wave 10 / 3B + 3C parallel):** Both clusters full-tier with cluster-internal Reviewer → consolidation Reviewer **OPTIONAL** per R50. Coordinator decides invoke-or-not based on cross-cluster integration concerns. **Recommended invocation: YES** for WAVE-GATE-10 because SLICE 3 close == Phase 3 close == project-close-candidate, and the consolidation Reviewer's cross-cluster integration audit is high-value at a milestone of this magnitude. Per NEXT-ROLE.md:55–56 framing, this is "Coordinator decides invoke-or-not"; this plan's recommendation is YES.

**Inter-wave handoff:** Two `CLUSTER-HANDOFF-WAVE10-*.md` artifacts emit at WAVE-GATE-09 close (Wave 9 → Wave 10 boundary):

- `coordination/CLUSTER-HANDOFF-WAVE10-3A-3B.md` — npm package contract for WU-3B consumption
- `coordination/CLUSTER-HANDOFF-WAVE10-3A-3C.md` — npm package contract for WU-3C consumption

Per CLAUDE-COORDINATOR.md §Cluster handoff inventory ("created when target cluster dispatches, not pre-created"), these artifacts are **NOT pre-emitted at WAVE-PLAN-09 v1 emission time** — they land at WAVE-GATE-09 close per established Phase 2 + Phase 3 convention. Both handoff artifacts share the same source (WU-3A npm package) but have distinct target clusters (3B and 3C); per the template's "one edge, one file" discipline, two separate handoff files emit, NOT one combined file.

**SLICE 3 close → Phase 3 close → project-close transition:** After WAVE-GATE-10 close, operator authorizes Phase 3 close-walk (SLICE-close audit) OR proceeds directly to project-close per PRD § Phase 3 success metrics line 508 ("Project close: Tessera v1 published to `github.com/johnpatrickwarren-oss/tessera`; vendor coverage AWS Trainium + AWS Inferentia + Google TPU + NVIDIA NVLink + Slurm + K8s; real-cluster validation precedent set; engine npm package published"). Phase 3 close-walk decision is **out-of-scope for this plan**; surfaced as OQ-Phase3-W3-4 below.

---

## PRD provenance

- **PRD source:** `coordination/PRD.md` § Phase 3 Scope → SLICE 3 sub-section (lines 483–487); FR-D1 (line 439); FR-D2 (line 440); FR-D3 (line 441); AC-P8 (line 450); PRD § Phase 3 SLICE structure SLICE 3 sub-section (lines 483–487); PRD § Project goal line 340 ("the shared subset extracts to a separate npm package at Tessera Phase 2 close" — note: PRD says "Phase 2 close" but SLICE structure places extract in Phase 3 SLICE 3; treat SLICE 3 placement as authoritative per Phase 3 PRD authoring 2026-05-19).
- **PRD version at plan time:** Phase 3 scope authored 2026-05-19 at `620d0e2` (post-R51); SCOPING-MEMO-v0.3.md still v0.3 per OQ-P3-11 carry-forward default.
- **Anti-scope clauses referenced (PRD lines 452–459 + inherited A1–A17 from SCOPING-MEMO § 2.3):**
  - **A10 carve-out preserved (PRD:456):** L0 contract preprocessing in scope; SLICE 3 does NOT extend to live DCGM per Path B carry-forward (OQ-P3-9 RESOLVED 2026-05-19 at WAVE-GATE-06; preserved at WAVE-GATE-08). Hardware-diagnostic territory remains anti-scope.
  - **A8/A11 (PRD:457):** NO real customer telemetry; per Path B, NO rented GPU infrastructure at SLICE 3. SLICE 3 ships against synthetic VerdictGroups + synthetic DS event-feed fixtures only.
  - **NEW Phase 3 anti-scope (PRD:459):** NO vendor-locked code paths. The npm package surface MUST work across both Tessera AND DS consumers; no Tessera-internal hooks that prevent DS-side consumption (and vice versa).
  - **A12 (inherited from § 2.3):** WU-3A is the **single license** to modify vendored-at-pin engine internals — the entire extract-to-npm operation IS modification of `engine/*` (moving files to a new package). The Architect at spec time MUST update `coordination/VENDORING-MANIFEST.md` to reflect every file's new location (npm package vs Tessera-tree) and re-establish the `AT_PIN_FILES` discipline against the package's published versions. This is a vendoring-discipline reset moment per SCOPING-MEMO § 9.
  - **A13 (inherited):** Rule-based + statistical only; NO ML-based attribution. SLICE 3 DS integration ships rule-based event-feed-to-freeze-hook gating only.
  - **A16 (inherited):** `correlational_not_causal: true` wire-format invariant preserved. 3B's VerdictGroup→DS payload MUST preserve the label at the wire boundary; 3C's freeze-hook activation MUST NOT mutate the label.
  - **A17 RESCINDED for SLICE 3:** SCOPING-MEMO § 2.1 A17 ("NO DeploySignal-integration scope at Phase 1 + 2; decoupled-for-now; Phase 3+ commitment") is the carve-out that AUTHORIZES SLICE 3. SLICE 3 is the Phase 3+ commitment landing; A17 no longer fences DS integration at this slice.
  - **Path B disposition (PRD-relevant; OQ-P3-9 RESOLVED 2026-05-19 at WAVE-GATE-06 + preserved at WAVE-GATE-08):** Per NEXT-ROLE.md:16 — Path B: no real-cluster work. SLICE 3 deliverables operate on synthetic VerdictGroups for DS event-conditional attribution validation. **Phase 3 SLICE 3 does NOT introduce real-cluster scope** even though it integrates with the sibling DS repo (DS itself does not require a live cluster; DS event-feed fixtures suffice).
- **Open PRD questions deferred to operator:** 1 carry-forward (OQ-P3-11 SCOPING-MEMO v0.4 — default extend v0.3) + 5 new Coordinator OQs (OQ-Phase3-W3-1 through OQ-Phase3-W3-5; see Open questions section below).
- **Tessera-local rule audit applied:** PRD's "Apply all 7 cross-project rules UPFRONT" directive honored per NEXT-ROLE.md:87–90; Rules 1 + 4 + 6 are ACTIVE GATES at this plan emit. Rules 2/3/5/7 are N/A for Coordinator-only role per directive framing.
  - **Rule 1 (`false-compliance-attestation`)** ACTIVE GATE applied throughout: every PRD line citation grep-verified at HEAD `c896b16`; every DS-repo claim cited with absolute path under `/Users/johnwarren/concord/deploysignal/` and retrieval date 2026-05-19 (the Architect at WU-3A spec time will extend the DS-repo evidence base with verbatim quotes per established R52/R55 cite-then-verify discipline). No memorized claims about DS repo structure.
  - **Rule 4 (`anti-scope-allowed-set-forward-coverage`)** ACTIVE GATE: Coordinator stayed within NEXT-ROLE.md:79–84 ALLOWED_SET (this WAVE-PLAN-09.md NEW + COORDINATOR-MEMORIAL.md append + NEXT-ROLE.md STATUS update). CLUSTER-HANDOFF-WAVE10-3A-3B/3C.md NOT created at plan time per CLAUDE-COORDINATOR.md handoff-at-target-dispatch convention. Coordinator did NOT modify SCOPING-MEMO / PRD / engine / test / scripts / CLAUDE-*.md / MEMORIAL-PHASE-*.md frozen shards.
  - **Rule 6 (`halt-discipline-no-DIAGNOSTIC-for-workaround`)** ACTIVE GATE: Coordinator evaluated 3 halt conditions per NEXT-ROLE.md:94–96:
    1. **PRD § Phase 3 SLICE 3 sub-section internally inconsistent:** FR-D1/D2/D3 wording at PRD:439–441 traces cleanly to SLICE 3 sub-section at PRD:483–487 and to AC-P8 at PRD:450. No internal inconsistency. **NO HALT.**
    2. **D-test analysis surfaces unexpected serial dependency between 3B and 3C:** Coordinator applied D1-D5 explicitly (see Plan summary above + Step 2 below); analysis demonstrated genuine independence post-3A. **NO HALT — parallel-fan-out empirically justified.**
    3. **DS repo accessibility:** Verified at plan emit time: `/Users/johnwarren/concord/deploysignal/` exists as sibling directory to `/Users/johnwarren/concord/tessera/` (per `ls /Users/johnwarren/concord/` retrieval 2026-05-19). Cluster Architect at R61 dispatch can `cd ../deploysignal && git log` for context. **NO HALT.**

---

## Step 1 — Work unit extraction (deterministic)

Per `CLAUDE-COORDINATOR.md` §DAG construction discipline Step 1. WUs extracted from PRD § Phase 3 SLICE 3 sub-section structure; no work unit invented; each PRD-enumerated WU maps 1:1 to one extracted WU.

| WU ID | Source PRD feature | Acceptance criteria (frame; per-AC enumeration is the cluster Architect's job) | Bounding anti-scope | File tree scope |
|---|---|---|---|---|
| **WU-Phase3-3A** | FR-D1 (PRD:439); AC-P8 (PRD:450); PRD § Phase 3 SLICE structure SLICE 3 sub-section line 485 ("WU-Phase3-3A: Engine npm package extract (`@johnpatrickwarren-oss/deploysignal-engine`). Vendoring-drift R-E6 structural resolution. Tier: full (architectural restructure)."); SCOPING-MEMO-v0.3.md § 9 (engine vendoring policy); PRD § Project goal line 340 ("the shared subset extracts to a separate npm package"); PRD § Success metrics line 407 ("engine extracted to shared npm package (vendor-first commitment realized)"). | **Engine npm package extract.** Extract the shared engine subset (currently vendored-at-pin in Tessera's `engine/*` tree at SHA `5a72371`) into a new npm package `@johnpatrickwarren-oss/deploysignal-engine`. Both Tessera AND sibling DS repo become consumers of the published package version (replacing per-file SHA-pin re-vendoring). Vendoring-drift R-E6 risk row structurally eliminated. Frame-level AC scope: (a) Package manifest exists at the chosen package root with name `@johnpatrickwarren-oss/deploysignal-engine` (Coordinator default; Architect may rename via OQ — see OQ-Phase3-W3-1); package version follows semver convention; (b) Package exports the shared engine surface — at minimum: `engine/core.ts` (TrendBuffer + signal classes) + `engine/detectors/*` + `engine/o0/*` + `engine/per-detector-resampler-mode.ts` + `engine/loader.ts` + per Architect's read of which surfaces are Tessera-original-vs-shared at `5a72371` per VENDORING-MANIFEST.md; (c) Tessera-side `import` statements updated from relative `engine/*` paths to npm-package paths (`from '@johnpatrickwarren-oss/deploysignal-engine'`); Tessera-original files (L0 contract, topology adapters, common-mode-attribution, freeze-hook, fleet/verdict-consumer) STAY in Tessera tree (likely move to `src/` or remain at `engine/` per OQ-Phase3-W3-2); (d) DS-side `import` statements updated similarly — **this is cross-repo work**; Architect at spec time decides scope-cut between (i) ship both repos' updates in WU-3A vs (ii) ship Tessera-side only and route DS-side via a DS PR; default is (i) per AC-P8's "both repos consume the same version"; (e) `VENDORING-MANIFEST.md` reset — every formerly-vendored-at-pin file's row updated to reflect npm-package source (no more per-file SHA pins for those rows); `AT_PIN_FILES` discipline adapted to verify npm version pin instead of per-file SHA; (f) `correlational_not_causal: true` invariant preserved through the extract (A16 defensive); (g) Test count + tsc exit code ACs (anchored to chore-A SHA; encode ACTUAL `tsc` exit code + ACTUAL `node --test` pass/fail counts per Rule 1 `false-compliance-attestation`); (h) Anti-scope diff AC (per TQ-4 γ pattern; SHA-pinned to chore-A); (i) Cross-repo build verification AC: both Tessera AND DS repos build successfully after extract (DS-side: `cd ../deploysignal && npm test` exits clean OR equivalent); (j) Backward-compat AC: pre-extract test baseline preserved post-extract — Tessera's 399-test baseline (per WAVE-GATE-08:24 R58 close) holds modulo R36 forward-protection failures + the q01 byte-identity test which becomes obsolete post-extract (byte-identity check against `../deploysignal/engine/*` no longer applies because the source-of-truth is the npm package). Architect at spec time decides q01 disposition: (i) re-purpose to verify npm-package version pin OR (ii) deprecate with explicit comment OR (iii) ESCALATE for operator disposition. **Target AC count: 14–18** (architectural-restructure inherently spans wide; Architect retains split-decision flexibility per R20+R21 precedent if AC count exceeds 18 — see Step 3 Judgment call 1 for the bundle-vs-split-vs-substrate analysis). | **A12 RESCINDED for WU-3A SPECIFICALLY.** WU-3A IS the vendored-at-pin modification (extract operation moves vendored files to a new package). The rescission is bounded: only WU-3A in SLICE 3 has A12 license; WU-3B and WU-3C inherit A12 (NO modification of engine/*) and may only consume the npm package as an import surface. **A10 / A13 / A16 (inherited):** preserved — no hardware diagnosis; no ML; correlational-not-causal preserved. **A11 (inherited):** synthetic-fixture-only at the test surface. **A17 RESCINDED for WU-3A SPECIFICALLY.** WU-3A is the DS-integration foundation enabling 3B + 3C; A17 no longer fences this. **NEW Phase 3 anti-scope per PRD:459:** NO vendor-locked code paths. The npm package surface MUST work for both Tessera AND DS consumers; no Tessera-internal hooks. **NO modification of Phase 1 / Phase 2 / Phase 3 SLICE 1+2 deliverables EXCEPT through the lens of the extract.** The extract moves files; it does NOT change their behavior. If the Architect identifies behavior-changing modifications as load-bearing for clean extract, ESCALATE rather than absorb (analogous to A12-bounded escalation in prior phases). **NO drafting of WU-3B or WU-3C scope** (Wave 10 cluster Architects' job). **NO real-cluster work** per Path B. **DS-repo modification scope: explicitly authorized for WU-3A** (cross-repo extract); WU-3A Architect coordinates Tessera + DS commits. **NO opening of GitHub PRs** per NEXT-ROLE.md:77 — pre-PR commit landings only at WU-3A; PR opening is operator discretion at Phase 3 close. | NEW package directory at a Coordinator-default location (e.g., `~/concord/deploysignal-engine/` as sibling to tessera + deploysignal; OR `~/concord/tessera/packages/deploysignal-engine/` monorepo-style; OR extract into the existing `~/concord/deploysignal/` repo with package.json at a sub-path — see OQ-Phase3-W3-1); MODIFY `package.json` (Tessera-side) to add `@johnpatrickwarren-oss/deploysignal-engine` as a dependency; MODIFY all Tessera-side import statements that currently import from `engine/*` paths to import from the npm package (Architect grep-enumerates at spec time; Coordinator estimate: ~30–50 files based on `engine/` surface size); MODIFY `coordination/VENDORING-MANIFEST.md` (reset to reflect npm-package source for formerly-vendored files); MODIFY DS-side files if Architect picks scope-option (i) above. MOVE the extracted engine source files: `engine/core.ts`, `engine/detectors/*`, `engine/o0/*`, `engine/per-detector-resampler-mode.ts`, `engine/loader.ts`, `engine/signal-classes.ts`, `engine/events/*`, `engine/per-shard/*` (Architect refines list at spec time based on VENDORING-MANIFEST.md row inventory). STAY in Tessera tree (likely renamed/relocated; Architect decides): `engine/l0/*` (Tessera-original L0 contract); `engine/topology/*` (Tessera-original topology adapters); `engine/fleet/verdict-consumer.ts` (Tessera-original); `engine/verdict-groups.ts` (vendored-with-deltas — Architect decides if it stays in npm package as the L3b base + Tessera-side delta file, OR moves entirely to Tessera-tree as a Tessera-original — this is the same shape question as R18+R20 cluster_event_id deltas); `engine/types/verdict.ts` (vendored-with-deltas; same question). NEW tests for the extracted-package surface (Architect picks: test against published package version OR test against the package's source directory). |
| **WU-Phase3-3B** | FR-D2 (PRD:440); PRD § Phase 3 SLICE structure SLICE 3 sub-section line 486 ("WU-Phase3-3B: Bi-directional DS integration (Tessera → DS feeds correlation layer; DS → Tessera event feed). Tier: full."); US-08 (PRD:428); AC-P4 (PRD:379 — extends to DS event-conditional drift attribution via real deploy events). **Scope note: PRD line 486 enumerates both directions ("Tessera → DS feeds correlation layer; DS → Tessera event feed") under one WU label; NEXT-ROLE.md:25–26 SPLITS those into WU-3B = Tessera→DS only and WU-3C = DS→Tessera only. Coordinator honors NEXT-ROLE.md split (operator-directed; enables parallel-fan-out).** | **Tessera → DS feed (bi-directional integration — outbound half).** Implement the code path by which Tessera per-shard VerdictGroup outputs feed DS's correlation layer. The DS correlation layer's deploy-event context is the consumer. Tessera produces VerdictGroup payloads (with `cluster_event_id` propagation per R20+R21 SLICE 2.A/B); 3B serializes them in a format consumable by DS's existing event-conditional attribution. Frame-level AC scope: (a) Feed-serialization function exists at the chosen file (default `engine/ds-integration/feed.ts`; Architect picks at spec time per OQ-Phase3-W3-2 + W3-3): takes VerdictGroup + cluster_event_id + Tessera-side timestamp + per-shard verdict context; produces a payload type consumable by DS correlation layer per DS's documented input contract; (b) Per-AC verification using synthetic VerdictGroup fixtures (Path B; no real cluster needed); (c) Wire-format invariant preservation: `correlational_not_causal: true` MUST appear in every emitted feed payload (A16 defensive; AC binds at wire boundary literal); (d) Empty / null VerdictGroup graceful handling (no throw; emit empty payload OR omit emit per Architect's design choice + DS-side acceptance); (e) End-to-end fixture AC: Tessera produces VerdictGroup → feed serializes → consumed-as-input by a DS-side fixture function that simulates the DS correlation layer's intake (Architect picks DS-side function to use; if DS doesn't yet have one, ESCALATE OR co-author with WU-3A scope); (f) npm package consumption AC: 3B's feed.ts imports its engine surfaces from `@johnpatrickwarren-oss/deploysignal-engine` (post-3A landing); zero imports from raw `engine/*` paths (the legacy paths may no longer exist post-3A); (g) Anti-scope diff AC (per TQ-4 γ pattern; SHA-pinned to chore-A); (h) Typecheck + test count ACs (anchored to chore-A SHA; encode ACTUAL exit code + counts per Rule 1). **Target AC count: 10–14** (single-direction integration, narrower than the bi-directional bundling at the PRD label; falls within R20+R21 split-decision threshold of 18). | **A8/A10/A11/A12/A13/A16/A17-INHERITED for WU-3B.** **A12:** NO modification of engine internals (post-3A: the npm package is read-only consumer surface). NO modification of Phase 2 freeze-hook (3C's territory); NO modification of Phase 2 VerdictGrouper (R20 frozen); NO modification of Phase 2 fleet-merge consumer (R21 frozen). **A17 PARTIALLY RESCINDED for SLICE 3:** DS integration in scope (this WU's whole purpose); but DS-side modification scope-cut depends on WU-3A's resolution of OQ-Phase3-W3-1 + the DS-side AC for 3B's feed consumption — if DS-side function exists post-3A, 3B does NOT modify DS; if 3B's feed AC requires a new DS-side intake function, 3B coordinates with operator on whether to ship that DS-side change as part of WU-3B or to ESCALATE for a follow-up DS PR. **NO modification of WU-3A deliverables** (Wave 9 frozen). **NO modification of WU-3C territory** (DS → Tessera direction; that's 3C's exclusive scope). **NO real-cluster work** per Path B. **NO opening of GitHub PRs.** **NEW Phase 3 anti-scope per PRD:459:** vendor-neutral interface — 3B's feed serialization MUST work whether the consumer is DS or any hypothetical alternative correlation-layer consumer with the same wire format. **NO use of WU-3C's freeze-hook-extension surface** (3B does NOT depend on real-event-fed freeze-hook; 3B's outputs feed DS, not the freeze-hook). | NEW `engine/ds-integration/feed.ts` (Coordinator-default location; Architect picks at spec time — see OQ-Phase3-W3-2); NEW `test/q{NN}-ds-integration-feed.test.ts` (Architect confirms round number at session entry); NEW `test/_substrate/ds-integration-feed-fixture-*.json` (Tessera-original synthetic VerdictGroup fixtures + DS-side consumer-simulation fixtures); possibly NEW `engine/ds-integration/feed-types.ts` (Architect's call at spec time — see OQ-Phase3-W3-3). READ-ONLY: `@johnpatrickwarren-oss/deploysignal-engine` (npm package; WU-3A deliverable; consumed via import); `engine/verdict-groups.ts` (R20 vendored-with-deltas frozen; possibly relocated by 3A); `engine/fleet/verdict-consumer.ts` (R21 frozen; Tessera-original); `engine/types/verdict.ts` (R18+ vendored-with-deltas; possibly relocated by 3A); Phase 2 + Phase 3 SLICE 1+2 deliverables (all frozen). |
| **WU-Phase3-3C** | FR-D3 (PRD:441); PRD § Phase 3 SLICE structure SLICE 3 sub-section line 487 ("WU-Phase3-3C: Real-deploy-event freeze-hook (replaces synthetic VerdictGroups in event-conditional attribution). Tier: full."); US-08 (PRD:428); AC-P3 (PRD:378) + AC-P4 (PRD:379) — extends event-conditional drift attribution to use real DS events. **Scope split per NEXT-ROLE.md:26** — DS → Tessera direction (inbound half of bi-directional integration). | **DS → Tessera event consumer + freeze-hook real-event activation (inbound half).** Implement the code path by which Tessera's Phase 2 freeze-hook (currently activated by synthetic VerdictGroups in Phase 2 R20+R21 + R36 close-walk) gates against REAL DS deploy events. The DS event feed is the input; the Tessera freeze-hook is the consumer. Frame-level AC scope: (a) DS event consumer function exists at the chosen file (default `engine/ds-integration/event-consumer.ts`; Architect picks at spec time per OQ-Phase3-W3-2): consumes a DS event payload (deploy_id, cluster_event_id, event timestamp, event class); produces a `FreezeHookInput`-compatible type that the Phase 2 freeze-hook ingests; (b) Freeze-hook extension AC: the Phase 2 freeze-hook (location TBD by Architect — likely `engine/fleet/freeze-hook.ts` or similar; if not yet a discrete module, ESCALATE for re-decomposition per CLAUDE-COORDINATOR.md §Promotion mid-round) accepts an `eventSource: 'synthetic' | 'ds-real'` parameter (or analogous discriminator); behavior preserved for `'synthetic'` (Phase 2 backward compat); new behavior for `'ds-real'` consumes the DS event consumer output; (c) End-to-end fixture AC: synthetic DS event feed (Tessera-side fixture in lieu of real cluster per Path B) → event consumer → freeze-hook activation → per-shard verdict gating; (d) Synthetic-DS-event fixture sufficiency AC: the synthetic DS event fixtures cover the AC-P3 event classes (firmware push / deploy / config change) per PRD:378; (e) Wire-format invariant preservation: freeze-hook output retains `correlational_not_causal: true` (A16 defensive — even with real DS events, correlation-not-causation labeling preserved); (f) npm package consumption AC: 3C imports its engine surfaces from `@johnpatrickwarren-oss/deploysignal-engine` (post-3A); zero imports from raw `engine/*` paths; (g) Backward compat AC: Phase 2 + Phase 3 SLICE 1+2 freeze-hook behavior preserved under `eventSource: 'synthetic'`; existing Phase 2 freeze-hook tests pass unchanged; (h) Anti-scope diff AC (per TQ-4 γ pattern; SHA-pinned to chore-A); (i) Typecheck + test count ACs (anchored to chore-A SHA; encode ACTUAL exit code + counts per Rule 1). **Target AC count: 12–16** (freeze-hook extension is wider than 3B because it touches a Phase 2 frozen surface via additive parameter + new behavior path; falls within R20+R21 split-decision threshold of 18). | **A8/A10/A11/A12/A13/A16/A17-INHERITED for WU-3C.** **A12:** NO modification of engine internals (post-3A: npm package read-only). **EXCEPTION — Phase 2 freeze-hook extension:** if the Phase 2 freeze-hook is a discrete Tessera-original file (not vendored-at-pin), 3C extends it via additive parameter (eventSource discriminator) — this is NOT an A12 violation because Tessera-original files are extension-allowed under vendored-with-deltas pattern, OR the freeze-hook is already structured for extension. Architect verifies at spec time. If the freeze-hook is vendored-at-pin, 3C must use a wrapper pattern + ESCALATE OR transition the file to vendored-with-deltas with full two-step maintenance per PHASE-2-SLICE-1-CLOSE-WALK § 2. **A17 PARTIALLY RESCINDED for SLICE 3:** DS integration in scope. **NO modification of WU-3A deliverables** (Wave 9 frozen). **NO modification of WU-3B territory** (Tessera → DS direction; 3B's exclusive scope). **NO real-cluster work** per Path B — synthetic DS event fixtures only. **NO opening of GitHub PRs.** **NEW Phase 3 anti-scope per PRD:459:** vendor-neutral — 3C's event consumer MUST work for any event source matching the DS event format (not DS-implementation-specific). **NO use of WU-3B's feed output as 3C's input** (architecturally these are reverse directions; 3C consumes DS events, not Tessera→DS feed outputs). | NEW `engine/ds-integration/event-consumer.ts` (Coordinator-default location; Architect picks at spec time — see OQ-Phase3-W3-2); MODIFY existing freeze-hook module (location TBD by Architect; Phase 2 deliverable) — additive parameter only (eventSource discriminator); NEW `test/q{NN}-ds-integration-event-consumer.test.ts`; NEW `test/_substrate/ds-event-fixture-*.json` (synthetic DS event fixtures covering AC-P3 event classes); possibly NEW `engine/ds-integration/event-types.ts` (Architect's call at spec time — see OQ-Phase3-W3-3). READ-ONLY: `@johnpatrickwarren-oss/deploysignal-engine` (WU-3A deliverable); `engine/verdict-groups.ts` (R20 frozen + possibly relocated by 3A); `engine/fleet/verdict-consumer.ts` (R21 frozen); Phase 2 + Phase 3 SLICE 1+2 deliverables (all frozen); 3B's feed.ts (Wave 10 sibling; 3C does NOT depend on it). |

### Merge reasoning

**No merging applied within SLICE 3.** PRD § Phase 3 SLICE structure SLICE 3 sub-section enumerates 3 distinct WUs (3A npm extract + 3B Tessera→DS + 3C DS→Tessera). PRD line 486 nominally groups 3B+3C under one label ("Bi-directional DS integration") but NEXT-ROLE.md:25–26 directive splits them per operator-directed PARALLEL-FAN-OUT mandate — splitting them is structurally enabling for parallel-cluster dispatch. Coordinator honors the NEXT-ROLE.md split. Bundle alternative (single WU for 3B+3C combined) is evaluated as Step 3 Judgment call 1 and rejected.

### Splitting reasoning

**3A is NOT split.** The npm package extract is one architectural operation (move files + update imports + reset VENDORING-MANIFEST + verify both repos build). Splitting into sub-WUs (e.g., 3A.1 = package scaffold; 3A.2 = file moves; 3A.3 = import-statement updates; 3A.4 = DS-side updates) would create artificial dependency chains within a single architectural restructure. Architect retains spec-time split-decision discretion via R20+R21 precedent if AC count exceeds 18.

**3B+3C split per NEXT-ROLE.md directive.** Operator directive PARALLEL-FAN-OUT mandates evaluation of Option C for 3B+3C. Splitting them into separate WUs is the structural enabler for parallel-cluster dispatch.

---

## Step 2 — Dependency edge identification (deterministic)

Per `CLAUDE-COORDINATOR.md` §DAG construction discipline Step 2. Each edge cites the dependency test that fired (D1–D5) and the confidence level.

### Inter-WU edges within SLICE 3

| Source | Target | Test | Confidence | Reasoning |
|---|---|---|---|---|
| **WU-Phase3-3A** | **WU-Phase3-3B** | **D1 (shared output ownership)** | **HIGH** | WU-3A creates the npm package `@johnpatrickwarren-oss/deploysignal-engine` AND updates Tessera's import surface from `engine/*` relative paths to the npm package. WU-3B's frame-level AC scope (f) (above Step 1 table) explicitly requires "3B's feed.ts imports its engine surfaces from `@johnpatrickwarren-oss/deploysignal-engine` (post-3A landing); zero imports from raw `engine/*` paths". WU-3B cannot exist before WU-3A because the npm package WU-3B imports from does not yet exist pre-3A. **D1 HIGH forces sequential ordering: WU-3A → WU-3B.** |
| **WU-Phase3-3A** | **WU-Phase3-3C** | **D1 (shared output ownership)** | **HIGH** | Identical reasoning to WU-3A → WU-3B. WU-3C's frame-level AC scope (f) requires npm package import; pre-3A the package doesn't exist. **D1 HIGH forces sequential ordering: WU-3A → WU-3C.** |
| **WU-Phase3-3A** | **WU-Phase3-3B** | **D2 (AC reference)** | **HIGH** | WU-3B's package-consumption AC references WU-3A's npm package by name (`@johnpatrickwarren-oss/deploysignal-engine`). Same reasoning as D1 above — AC literal depends on package existing. |
| **WU-Phase3-3A** | **WU-Phase3-3C** | **D2 (AC reference)** | **HIGH** | Symmetric to WU-3A → 3B. |
| **WU-Phase3-3B** | **WU-Phase3-3C** | **D1 (shared output ownership)** | **LOW (no edge)** | WU-3B owns `engine/ds-integration/feed.ts` (Tessera→DS direction). WU-3C owns `engine/ds-integration/event-consumer.ts` (DS→Tessera direction) + additive parameter on Phase 2 freeze-hook. Parallel-class file convention: each WU writes to a distinct file. **No shared output. D1 does NOT fire between 3B and 3C.** Verified via Coordinator's check at plan emit time: 3B and 3C have zero overlapping NEW files in their respective file-tree-scope columns above. |
| **WU-Phase3-3B** | **WU-Phase3-3C** | **D2 (AC reference)** | **LOW (no edge)** | WU-3B's ACs bind the Tessera-produces-VerdictGroup-payload-to-DS direction; WU-3C's ACs bind the Tessera-consumes-DS-event-feed direction. Neither AC set references the other WU's surfaces. The bi-directional integration at PRD line 486 is REALIZED by 3B+3C jointly but DESCRIBED by separate ACs (one direction per WU). 3C does NOT consume 3B's feed output; 3B does NOT consume 3C's event-consumer output. **D2 does NOT fire between 3B and 3C.** |
| **WU-Phase3-3B** | **WU-Phase3-3C** | **D3 (anti-scope adjacency)** | **LOW with judgment-call** | Both WUs touch DS integration territory broadly. 3C extends Phase 2 freeze-hook with eventSource discriminator; 3B does NOT touch freeze-hook. Potential implicit assumption: "DS integration means both directions are wired together end-to-end." Coordinator judgment: the directions ARE independently testable (3B against synthetic DS-consumer-simulation fixtures per AC scope (e); 3C against synthetic DS-event-fixtures per AC scope (c/d)). End-to-end wiring (3B output → DS → 3C input) is a Phase-3-close-walk concern, NOT a per-WU concern. **D3 does NOT fire as a dependency.** |
| **WU-Phase3-3B** | **WU-Phase3-3C** | **D4 (file tree overlap)** | **LOW (contention not dependency)** | Both touch `engine/ds-integration/*` (new subdirectory created by whichever WU lands first OR by WU-3A scope if Architect pre-lands the directory scaffold). Resolvable via parallel-class file convention (3B owns feed.ts; 3C owns event-consumer.ts) + worktree isolation under `scripts/multi-track-cluster-setup.sh`. **D4 LOW — contention risk, not a dependency edge.** |
| **WU-Phase3-3B** | **WU-Phase3-3C** | **D5 (schema/migration write-conflict)** | **LOW with file-layout discipline** | Potential D5-contention: if 3B and 3C both add types to a shared file like `engine/ds-integration/types.ts`. Resolution: each WU owns its own types file (3B owns `feed-types.ts`; 3C owns `event-types.ts`). If at spec time the Architects find shared types necessary (e.g., shared `DSEvent` discriminated union), they coordinate via Coordinator and decide between (a) pre-landed shared-types substrate added to WU-3A scope OR (b) sequential dispatch in Wave 10 forfeiting parallelism. Coordinator default at plan emit time: file-layout-isolated parallel-class (no shared types file). **D5-strict does NOT fire; D5-contention is a watch-item for cluster Architects, not a Coordinator-time blocker.** See Step 3 Judgment call 2. |

**Inter-WU edge summary for the 3B ↔ 3C pair:** D1 LOW + D2 LOW + D3 LOW (judgment) + D4 LOW (contention) + D5 LOW (with discipline). **No edges fire between 3B and 3C. Parallel dispatch is structurally clean.**

### Inbound to WU-Phase3-3A from prior Phase deliverables (informational; Phase 2 + Phase 3 SLICE 1+2 frozen)

| Source | Target | Test | Confidence | Reasoning |
|---|---|---|---|---|
| **All vendored-at-pin engine files** (Phase 1 + Phase 2 + Phase 3 SLICE 1+2 deliverables) | **WU-Phase3-3A** | D1 (shared output ownership — MODIFICATION TARGET) | **HIGH × N** | WU-3A modifies the entire vendored-at-pin engine surface as part of the extract operation. Per VENDORING-MANIFEST.md row inventory, this covers `engine/core.ts`, `engine/detectors/*`, `engine/o0/*`, `engine/loader.ts`, etc. — the Architect grep-enumerates at spec time. This is the A12-rescission scope and is the load-bearing reason WU-3A is full-tier (architectural restructure). |
| **All Tessera-original files that import from engine/\*** | **WU-Phase3-3A** | D1 (shared output ownership — MODIFICATION TARGET) | **HIGH × N** | WU-3A updates ~30–50 Tessera-original import statements from `engine/*` relative paths to npm package paths. Coordinator estimate based on `engine/` surface size; Architect enumerates at spec time via `grep -r "from '\.\./engine"` etc. |
| **DS sibling repo** (`~/concord/deploysignal/`) | **WU-Phase3-3A** | D2 (AC reference) + D1 (shared output if Architect picks scope-option (i)) | MEDIUM-to-HIGH | AC-P8 binds "both Tessera + DeploySignal repos consume the same version". If WU-3A picks scope-option (i) (Tessera-side AND DS-side updates in WU-3A), this becomes D1 HIGH on the DS-side import surface. If WU-3A picks scope-option (ii) (Tessera-side only; route DS via separate PR), this remains D2 MEDIUM for the cross-repo AC binding. Operator decides at Architect spec time. |
| **`coordination/VENDORING-MANIFEST.md`** | **WU-Phase3-3A** | D1 (shared output) | HIGH | VENDORING-MANIFEST.md reset is a load-bearing AC frame component (Step 1 frame-level AC scope (e)). Per established R18+R20+R23+R53+R56 two-step maintenance pattern, but applied at architectural-restructure scale. |
| **`coordination/SCOPING-MEMO-v0.3.md` § 9 (engine vendoring policy)** | **WU-Phase3-3A** | D2 (AC reference / policy authorization) | HIGH | SCOPING-MEMO § 9 is the policy authorization for the extract operation. WU-3A's success is the realization of SCOPING-MEMO § 9's extract commitment per Project goal line 340 + Success metrics line 407. WU-3A may need to amend § 9 at spec time to reflect the post-extract state — surfaced as OQ-Phase3-W3-5. |
| **R36 Phase 2 close-walk + WAVE-GATE-06/07/08 (Phase 3 SLICE 1+2 closes)** | **WU-Phase3-3A** | D2 (SLICE-close precedent + carry-forward pre-flags) | MEDIUM | WU-3A Architect reads PHASE-2-CLOSE-WALK.md (R36) + WAVE-GATE-06/07/08.md + WAVE-PLAN-06/07.md + COORDINATOR-MEMORIAL.md (Phase 3 sections) as primary inputs alongside the PRD + SCOPING-MEMO. |

### Inbound to WU-Phase3-3B (Wave 10) from Wave 9 close + Phase 2/3 frozen deliverables

| Source | Target | Test | Confidence | Reasoning |
|---|---|---|---|---|
| **WU-Phase3-3A (npm package; Wave 9)** | **WU-Phase3-3B (Wave 10)** | D1 HIGH + D2 HIGH | (already captured in inter-WU table above) | The WAVE-GATE-09 close emits CLUSTER-HANDOFF-WAVE10-3A-3B.md documenting the npm package contract that WU-3B will consume. |
| **WU-00 (L0 contract; R25; Phase 2 Wave 1)** | **WU-Phase3-3B** | D2 (AC reference / interface contract) | LOW (informational) | Tessera's L0 contract operates upstream of VerdictGroup serialization; 3B's feed.ts consumes VerdictGroup outputs that have already passed through L0. Edge is interface-only; no direct import. |
| **WU-Phase2 R20 (VerdictGrouper) + R21 (fleet-merge consumer)** | **WU-Phase3-3B** | D2 (AC reference) | MEDIUM | 3B's feed serializes VerdictGroup outputs produced by R20's VerdictGrouper + R21's FleetTickIngest. These are R20+R21 frozen surfaces; 3B consumes them via import. |

### Inbound to WU-Phase3-3C (Wave 10) from Wave 9 close + Phase 2/3 frozen deliverables

| Source | Target | Test | Confidence | Reasoning |
|---|---|---|---|---|
| **WU-Phase3-3A (npm package; Wave 9)** | **WU-Phase3-3C (Wave 10)** | D1 HIGH + D2 HIGH | (already captured in inter-WU table above) | The WAVE-GATE-09 close emits CLUSTER-HANDOFF-WAVE10-3A-3C.md documenting the npm package contract that WU-3C will consume. |
| **Phase 2 freeze-hook (R20 + R21 + R36 close-walk frozen)** | **WU-Phase3-3C** | D1 (shared output — MODIFICATION TARGET via additive parameter) | MEDIUM-HIGH | 3C extends the Phase 2 freeze-hook with an `eventSource` discriminator. The extension is additive (backward compat preserved); the freeze-hook's existing behavior under `'synthetic'` is the R20+R21+R36 frozen contract. If the freeze-hook is vendored-at-pin (Architect verifies at spec time), 3C must use a wrapper pattern OR transition the file to vendored-with-deltas with full two-step maintenance. If the freeze-hook is Tessera-original (likely), 3C extends it directly. |
| **WU-Phase2 R20 (VerdictGrouper) + R21 (fleet-merge consumer)** | **WU-Phase3-3C** | D2 (AC reference) | MEDIUM | 3C's event-consumer produces a FreezeHookInput-compatible type the Phase 2 freeze-hook consumes. The freeze-hook's input contract is R20+R21 frozen. |

### Pairwise check of bundle-vs-split-vs-parallel-fan-out candidates for SLICE 3 (informational — parallel-fan-out for 3B+3C is the chosen shape per Plan summary)

Per the same framing as WAVE-PLAN-06 + WAVE-PLAN-07 Step 2 pairwise checks.

| Pair / candidate | D1? | D2? | D5-strict? | D4? | Fan-out viable? |
|---|---|---|---|---|---|
| WU-3A ↔ WU-3B (parallel candidate) | **YES — D1 HIGH** (3B cannot import from package that doesn't exist) | **YES — D1+D2 HIGH** | NO | YES (`package.json` + import statements; manageable but sequencing required) | **NO — parallel dispatch structurally impossible.** Sequential ordering forced. |
| WU-3A ↔ WU-3C (parallel candidate) | **YES — D1 HIGH** (same reasoning as 3A↔3B) | **YES** | NO | YES (manageable) | **NO — parallel dispatch structurally impossible.** Sequential ordering forced. |
| WU-3B ↔ WU-3C (parallel candidate) | **NO — D1 LOW** (distinct file ownership per parallel-class convention) | **NO — D2 LOW** (reverse-direction concerns; non-overlapping ACs) | **NO — D5 LOW** (file-layout-isolated types) | YES (`engine/ds-integration/*` directory; resolvable via worktree isolation + parallel-class file convention) | **YES — clean independence post-3A.** Coordinator chooses parallel-fan-out per operator R60 mandate + R24 baseline directive. |
| 3B + 3C bundled into a single WU-3BC (vs split per NEXT-ROLE.md) | (collapses to single WU; no inter-WU edge) | (no inter-WU edge in bundle) | (no inter-WU edge in bundle) | (no inter-WU edge in bundle) | Bundle alternative evaluated as Step 3 Judgment call 1 and rejected per operator-directed split + parallel-fan-out enabling. |

**Verdict for fan-out availability inside SLICE 3:** **CLEAN INDEPENDENCE for 3B+3C post-3A.** Wave 9 sequential (3A); Wave 10 parallel-fan-out (3B + 3C). This is the first Phase 3 wave to leverage the parallel-cluster pattern.

### Contention risks (not dependencies)

| Work units | Shared files | Resolution |
|---|---|---|
| WU-Phase3-3A ↔ all vendored-at-pin engine files | `engine/*` tree (~10+ files per VENDORING-MANIFEST.md inventory) | A12 RESCINDED for WU-3A — the rescission IS the resolution. Architect at spec time enumerates the full move-list in spec component inventory. |
| WU-Phase3-3A ↔ `coordination/VENDORING-MANIFEST.md` | VENDORING-MANIFEST.md (all formerly-vendored-at-pin rows) | Reset operation per Step 1 frame-level AC scope (e); Architect handles in spec § 4-class component inventory. |
| WU-Phase3-3B ↔ WU-Phase3-3C ↔ `engine/ds-integration/*` directory | Both WUs land NEW files in the same new directory | Parallel-class file convention (precedent: `engine/topology/*` with 6 vendor-specific source files per R28/R29/R30/R53/R56/R58); worktree isolation via `scripts/multi-track-cluster-setup.sh`. **No shared-output write-conflict between 3B and 3C.** |
| WU-Phase3-3B + WU-Phase3-3C ↔ `package.json` (Tessera) | Both WUs may need to add test-related dependencies (e.g., a DS event-format validation lib) | LOW risk — Phase 3 SLICE 3 ships against synthetic fixtures (Path B); no external runtime dependency anticipated for either WU. If at spec time either Architect identifies a new dependency, surface via OQ-Phase3-W3-4 OR ESCALATE for cross-cluster coordination. |
| WU-Phase3-3C ↔ Phase 2 freeze-hook (R20+R21+R36 frozen) | The freeze-hook module (location TBD by Architect) | Additive parameter only (eventSource discriminator); backward compat preserved (`'synthetic'` mode = R20+R21+R36 behavior). If the freeze-hook is vendored-at-pin, ESCALATE OR transition to vendored-with-deltas with full two-step maintenance per PHASE-2-SLICE-1-CLOSE-WALK § 2 pattern. |
| Coordinator-emitted artifacts (WAVE-PLAN-09; CLUSTER-HANDOFF-WAVE10-3A-3B; CLUSTER-HANDOFF-WAVE10-3A-3C) ↔ cluster-emitted artifacts | Coordination directory namespace | Coordinator owns Coordinator artifacts; clusters own cluster artifacts; no overlap. CLUSTER-HANDOFF artifacts emit at WAVE-GATE-09 close per handoff-at-target-dispatch convention. |

---

## Step 3 — Claude judgment at ambiguity boundaries

### Judgment call 1 — SLICE 3 decomposition: bundle 3B+3C vs split into parallel clusters

- **Ambiguity:** PRD § Phase 3 SLICE structure SLICE 3 sub-section line 486 (WU-Phase3-3B) labels the bi-directional integration as a single WU; NEXT-ROLE.md:25–26 splits it into 3B (Tessera→DS) + 3C (DS→Tessera). The split-vs-bundle question is structurally important because:
  - Bundle (single WU-3B containing both directions) → single-cluster Wave 10; no parallel-fan-out opportunity.
  - Split into 3B + 3C → Wave 10 candidate for parallel-fan-out OR sequential single-cluster waves.
  - NEXT-ROLE.md:127 operator mandate: PARALLEL-FAN-OUT MUST be evaluated for 3B+3C; default-to-sequential REJECTED without empirical D-test demonstration.
- **Candidate resolutions:**
  - **(a) Split + parallel-fan-out (Option C; Coordinator's recommendation per operator R60 mandate + empirical D-test analysis).** 3B and 3C dispatch as parallel clusters in Wave 10 after WAVE-GATE-09 (3A) close. Per Step 2 inter-WU edge table: D1 LOW + D2 LOW + D3 LOW + D4 LOW (contention only) + D5 LOW with file-layout discipline. Clean independence empirically demonstrated.
  - **(b) Split + sequential (Option B).** 3B in Wave 10; 3C in Wave 11 (or vice versa). Honors PRD-suggested grouping but forfeits parallelism. Rejected per operator R60 mandate — no D-test edge fired that genuinely forces serial dependency between 3B and 3C.
  - **(c) Bundle into single WU-3BC (Option A).** Both directions in one cluster. Architecturally analogous to R52 WU-Phase3-1 bundled Trainium+Inferentia. **Rejected because:** R52's bundle was justified by D5-strict write-conflict on the shared `'neuron_link_peer'` enum literal (both chip families add the same literal). SLICE 3 has no equivalent D5-strict force — 3B and 3C own distinct files and distinct types (per Step 2 D5 row). Bundle would forfeit the parallel-fan-out opportunity without architectural justification.
- **Claude's judgment:** Option (a) — Split + parallel-fan-out.
- **Reasoning:** Four factors favor parallel-fan-out:
  1. **Empirical D-test analysis demonstrates clean independence.** Step 2 inter-WU edge table for 3B↔3C: D1 LOW + D2 LOW + D3 LOW + D4 LOW (contention) + D5 LOW (with file-layout discipline). No D-test edge fires as a dependency. Per CLAUDE-COORDINATOR.md §Step 2 framework, this is exactly the case where parallel-fan-out applies cleanly.
  2. **Operator R60 PARALLEL-FAN-OUT mandate (NEXT-ROLE.md:127) explicitly authorizes — and requires — this evaluation.** The mandate's REJECTED-default-to-sequential clause is satisfied: Coordinator did not default; Coordinator performed full D-test analysis and found the independence empirically.
  3. **Phase 2 Wave 2 precedent (3-cluster parallel WU-01 SLURM + WU-02 K8S + WU-03 NVLINK).** Per WAVE-PLAN-02 (R24 emit) + WAVE-GATE-02 (R31 close) confirmations, the 3-cluster parallel dispatch worked cleanly: zero inter-cluster contention; clean review separability; 0-MAJOR aggregate. SLICE 3 Wave 10 with 2-cluster parallel-fan-out follows the same pattern at smaller cluster count (well under the operational cap of 5).
  4. **AC count reviewability + reverse-direction architectural distinctness.** 3B target AC count 10–14; 3C target AC count 12–16. Bundled total = 22–30, exceeding the R20+R21 split-decision threshold of 18 even before accounting for the two directions' architecturally distinct concerns (3B: outbound serialization; 3C: inbound consumption + freeze-hook extension). Split is cleaner regardless of parallel-vs-sequential dispatch; pairing it with parallel-fan-out adds the parallelism dividend.
- **Resulting placement:** Wave 9 (single-cluster): WU-Phase3-3A. Wave 10 (PARALLEL CLUSTERS): WU-Phase3-3B + WU-Phase3-3C. CLUSTER-HANDOFF-WAVE10-3A-3B.md + CLUSTER-HANDOFF-WAVE10-3A-3C.md emitted at WAVE-GATE-09 close (not pre-emitted at WAVE-PLAN-09 v1).

### Judgment call 2 — Shared types between 3B and 3C: pre-land in WU-3A vs file-isolated per WU

- **Ambiguity:** WU-3B and WU-3C may need shared DS-integration types (e.g., a shared `DSEvent` discriminated union; a shared serialization-version constant). If both WUs add to a shared `engine/ds-integration/types.ts` file, D5-contention fires. Options:
  - **(a) File-isolated parallel-class (Coordinator default).** 3B owns `engine/ds-integration/feed-types.ts`; 3C owns `engine/ds-integration/event-types.ts`. Shared types either don't exist (each WU's types are direction-specific) OR are pre-landed by WU-3A as part of the scaffold.
  - **(b) Pre-landed shared-types substrate in WU-3A.** WU-3A's frame-level AC scope expanded to include `engine/ds-integration/types.ts` (or equivalent). Subsequent 3B + 3C reference the shared types as READ-ONLY. Eliminates D5-contention; expands WU-3A scope.
  - **(c) Sequential dispatch in Wave 10 forfeiting parallelism.** Rejected per Judgment call 1.
- **Candidate resolutions:**
  - Pre-decide at plan time: (a) or (b).
  - Defer to cluster Architects: surface as cross-cluster OQ for WU-3A Architect to resolve.
- **Claude's judgment:** Defer to cluster Architects with Coordinator default (a) — file-isolated parallel-class. The shared-types necessity depends on the WU-3A Architect's read of DS-side intake function signatures + DS event format. If WU-3A Architect determines that shared types are necessary across 3B+3C, expand WU-3A scope to pre-land them (option (b)) via CLUSTER-HANDOFF amendment at WAVE-GATE-09 close. If 3B+3C Architects at Wave 10 dispatch determine that direction-specific types suffice, default (a) holds.
- **Resulting OQ:** OQ-Phase3-W3-3 below.

### Judgment call 3 — npm package extract scope-cut: Tessera-side only vs Tessera+DS-side combined

- **Ambiguity:** WU-3A's AC-P8 requires "both Tessera + DeploySignal repos consume the same version". Two scope-cuts:
  - **(i) Tessera+DS combined in WU-3A.** WU-3A modifies BOTH Tessera AND DS repos. Architect coordinates commits across both repos. Operator decides whether to land DS-side commits before/after Tessera-side (e.g., via cross-repo dependency on package publication).
  - **(ii) Tessera-side only in WU-3A; DS-side via separate DS PR.** WU-3A ships Tessera-side extract + npm package; DS-side update happens via a separate DS-repo PR outside Tessera's pipeline. AC-P8's "both repos consume" is split across two artifacts.
- **Candidate resolutions:**
  - **(α) Operator-decided at WU-3A dispatch (recommended; OQ surfaced).** Operator picks scope-cut at R61 dispatch based on operational considerations (package-publication infrastructure; DS-repo access; CI coordination).
  - **(β) Coordinator pre-decides at plan time.** Coordinator default: (i) combined per AC-P8's explicit "both repos consume the same version" framing. Tradeoff: makes WU-3A's blast radius larger.
- **Claude's judgment:** Defer to operator (α). Surface as OQ-Phase3-W3-1 below. Coordinator default in absence of operator override: (ii) Tessera-side only + DS-side via separate PR — this reduces WU-3A's blast radius and matches the existing Tessera coordination boundary (the pipeline operates on Tessera; DS-side PRs are operator-routed). AC-P8 still achievable: Tessera-side npm package publication enables DS-side consumption; AC-P8 verification at SLICE 3 close (or Phase 3 close) confirms both repos consume the published version.
- **Resulting OQ:** OQ-Phase3-W3-1 below.

### Judgment call 4 — npm package physical location: monorepo sub-package vs sibling repo vs DS-repo sub-path

- **Ambiguity:** Where does the extracted npm package physically live?
  - **(a) Sibling repo:** `~/concord/deploysignal-engine/` as a new repo alongside `tessera` + `deploysignal`. Clean separation; new repo to publish from.
  - **(b) Tessera monorepo sub-package:** `~/concord/tessera/packages/deploysignal-engine/`. Tessera owns the package source; publishes to npm; Tessera consumes via workspace OR via published version.
  - **(c) DS repo sub-path:** `~/concord/deploysignal/packages/deploysignal-engine/`. DS owns the package source (matches the "shared from DS" framing); both Tessera + DS consume via published version.
  - **(d) Extract from DS in place:** restructure DS to expose its engine as the npm package directly (no separate sub-path; DS itself IS the engine package + DS-specific surfaces).
- **Candidate resolutions:**
  - **(α) Operator-decided at WU-3A dispatch (recommended; OQ surfaced).**
  - **(β) Coordinator pre-decides at plan time.** Coordinator default: (c) DS repo sub-path. Rationale: per SCOPING-MEMO § 9 + Project goal line 340 ("the shared subset extracts to a separate npm package"), the source-of-truth for the engine code is DS (where it originates at SHA `5a72371`); placing the package source in DS preserves the upstream-flow. Tessera consumes the published version.
- **Claude's judgment:** Defer to operator (α). Coordinator default (c) absent override. Surface as OQ-Phase3-W3-2 below.
- **Resulting OQ:** OQ-Phase3-W3-2 below.

### Judgment call 5 — File-layout convention for Tessera-side DS-integration code post-extract

- **Ambiguity:** After WU-3A's extract, Tessera's `engine/*` tree shrinks dramatically (most files move to the npm package). Tessera-original files (L0, topology adapters, common-mode-attribution, freeze-hook, fleet/verdict-consumer) stay. Where does 3B+3C's NEW DS-integration code live?
  - **(a) Continue under `engine/ds-integration/*`** (Coordinator default; preserves directory-naming continuity).
  - **(b) Move to a new top-level directory like `src/ds-integration/*`** (post-extract restructure: Tessera-original code under `src/`; npm-package code consumed via import only).
- **Candidate resolutions:** Defer to WU-3A Architect at spec time (Coordinator does NOT pre-decide post-extract directory naming).
- **Claude's judgment:** Defer to WU-3A Architect. Coordinator default (a) — `engine/ds-integration/` — applies absent Architect override. The Architect's decision propagates as CLUSTER-HANDOFF directive for 3B+3C in Wave 10.
- **Resulting OQ:** OQ-Phase3-W3-3 below.

### Judgment call 6 — Whether to pre-flag SCOPING-MEMO § 9 amendment scope to the WU-3A Architect

- **Ambiguity:** Per OQ-P3-11 carry-forward (default: extend v0.3 with Phase 3 amendments rather than v0.4). SCOPING-MEMO § 9 currently documents the vendor-first commitment + extract-to-npm-package-at-Tessera-Phase-2-close commitment. WU-3A's success operationally amends § 9 (extract is no longer a future commitment; it's a current state). Should WU-3A include § 9 amendment scope, OR defer to a Phase-3-close-walk?
- **Candidate resolutions:**
  - **(a) WU-3A closes opportunistically IF Architect spec touches SCOPING-MEMO anyway** (matches R52 OQ-Phase3-W1-2 + R55 OQ-Phase3-W2-2 + Phase 2 R32 MAJOR-1 carry-forward pattern).
  - **(b) Defer to Phase 3 close-walk.**
- **Claude's judgment:** Option (a) by default; Architect's call at spec time. WU-3A's architectural-restructure scope makes § 9 amendment a natural fit IF the spec already includes VENDORING-MANIFEST.md reset (Step 1 frame-level AC scope (e)). If at spec time the Architect determines § 9 amendment expands scope unmanageably, defer to close-walk.
- **Resulting OQ:** OQ-Phase3-W3-5 below.

---

## Step 4 — DAG validation

Per `CLAUDE-COORDINATOR.md` §DAG construction discipline Step 4.

- [x] **Cycle check.** No circular dependencies. WU-3A → WU-3B (D1 HIGH + D2 HIGH); WU-3A → WU-3C (D1 HIGH + D2 HIGH); 3B ↔ 3C (zero edges per Step 2). Inbound edges from Phase 2 + Phase 3 SLICE 1+2 all flow forward from frozen prior phases (no reverse edges). DS sibling repo dependency on WU-3A is forward (DS consumes the published package post-extract). No cycles.
- [x] **Island check.** Three WUs. WU-3A has high outbound edge density (to 3B, to 3C, to DS-repo) + high inbound edge density (from all vendored-at-pin engine files; from SCOPING-MEMO § 9 policy authorization). WU-3B and WU-3C each have one inbound D1+D2 HIGH edge from 3A and zero inter-WU edges with each other. **No WU is islanded.**
- [x] **Foundation identification.** Per CLAUDE-COORDINATOR.md §Step 4 ("Work units whose outputs are inputs to 3+ other work units **across 2+ domains/modules** are foundations"):
  - **WU-Phase3-3A:** outbound to WU-3B (Tessera→DS direction; Tessera-side) + WU-3C (DS→Tessera direction; Tessera-side) + DS sibling repo (DS-side import surface update; DS-side) + all future Tessera rounds that import from the new npm package (Tessera-side). Domains crossed: Tessera-side import surface + DS-side import surface + future-rounds-import-surface. **3+ outputs across 2+ domains satisfied. WU-3A IS a foundation.** This is the first Phase 3 WU to qualify as foundation by the literal rule text (Phase 3 SLICE 1's WU-Phase3-1 had outbound edges within `engine/topology/*` domain only; Phase 3 SLICE 2's WU-2A/2B similar). The foundation classification is what forces WU-3A into Wave 9 (sequential before Wave 10), which mechanically blocks parallel-fan-out of 3B+3C at Wave 9 boundary — they MUST wait for 3A.

---

## Step 5 — Wave sequencing

| Wave | Work units | Rationale |
|---|---|---|
| **9** | WU-Phase3-3A (engine npm package extract) | Foundation per Step 4. D1 HIGH outbound to both 3B and 3C forces 3A to land first. Single-cluster wave; full tier per Step 6. Architect retains spec-time split-decision flexibility per R20+R21 precedent if AC count exceeds 18 (target 14–18). Architectural restructure scope warrants single-cluster ownership; cross-repo scope (Tessera + possibly DS) further argues against fan-out (cross-repo coordination is a single-Architect concern). |
| **10** | WU-Phase3-3B (Tessera → DS feed) + WU-Phase3-3C (DS → Tessera event consumer + freeze-hook real-event activation) **in PARALLEL clusters** | 2-cluster parallel-fan-out wave. Both full tier per Step 6. Per Step 2 inter-WU edge analysis: D1 LOW + D2 LOW + D3 LOW + D4 LOW (contention) + D5 LOW (with file-layout discipline). Clean independence post-3A; parallel dispatch structurally enabled. Honors operator R60 PARALLEL-FAN-OUT mandate + R24 baseline directive. Within operational cap of 5 clusters/wave per CLAUDE-COORDINATOR.md §Step 5. |

### Wave dispatch order (within each wave, parallel)

- **Wave 9:** Single full-tier cluster via standard `./run-pipeline.sh --tier full` from the main worktree at `~/concord/tessera`. NO `--coordinator`; NO `multi-track-cluster-setup.sh`. Cross-repo work (DS-side updates if Architect picks scope-option (i)) is coordinated within the single Architect-Implementer-Reviewer-Memorial cluster — Architect spec articulates both-repos scope-cut.
- **Wave 10:** Two parallel full-tier clusters via `scripts/multi-track-cluster-setup.sh` (one cluster per WU). Each cluster runs `./run-pipeline.sh --tier full` from its own worktree branch. Coordinator NOT in-loop during cluster execution; Coordinator re-engages at WAVE-GATE-10 close.

### Inter-wave handoffs

Two CLUSTER-HANDOFF artifacts emit at WAVE-GATE-09 close (Wave 9 → Wave 10 boundary):

- `coordination/CLUSTER-HANDOFF-WAVE10-3A-3B.md` (D1 HIGH + D2 HIGH; npm package contract for WU-3B consumption)
- `coordination/CLUSTER-HANDOFF-WAVE10-3A-3C.md` (D1 HIGH + D2 HIGH; npm package contract for WU-3C consumption)

Per CLAUDE-COORDINATOR.md §Cluster handoff inventory ("created when target cluster dispatches, not pre-created"), neither artifact is pre-emitted at WAVE-PLAN-09 v1 emission time. The forward-looking entries appear in the Cluster handoff inventory section below.

---

## Step 6 — Tier classifications

Per the tier rubric inlined in `CLAUDE-COMMON.md` (A1-A7 / S1-S5 / Z1-Z5). **Each cluster self-governs its own tier at session start; this column records the Coordinator's prior, not a binding instruction.**

| WU ID | Coordinator tier | Matched criteria | Rationale |
|---|---|---|---|
| **WU-Phase3-3A** | **full** | **A1** (new dependency — npm package infrastructure; npm registry publication); **A2** (new architectural pattern — first cross-repo extract in Tessera's history; first npm package as a dependency target); **A4** (novel data model surface — npm package manifest + export interface + version-pin discipline replaces per-file SHA-pin discipline); **A6** (large blast radius — touches ALL vendored-at-pin engine files + ALL Tessera-side import statements + possibly DS-side import statements; cross-repo blast radius if scope-option (i) selected); **A7** (first-time territory — Tessera has never extracted code to an external package; vendoring policy reset moment). | Full-tier prior matches PRD § Phase 3 SLICE structure line 485 explicit "Tier: full (architectural restructure)". Audit-tier insufficient: A1+A2+A4+A6+A7 conjunction sets the tier ceiling; downgrade would skip cold-eye Architect on a foundational architectural-restructure surface. |
| **WU-Phase3-3B** | **full** | **A1** (new dependency — npm package surface consumed via import); **A2** (new architectural pattern — first cross-repo integration in Tessera; first Tessera→DS feed serialization); **A4** (novel data model — feed payload type + DS-side consumer-simulation interface); **A6** (potential cross-repo blast radius if Architect's AC scope (e) requires DS-side fixture changes). | Full-tier prior matches PRD § Phase 3 SLICE structure line 486 explicit "Tier: full". Audit-tier insufficient: A1+A2+A4+A6 conjunction; DS integration is novel surface relative to all prior Tessera work. |
| **WU-Phase3-3C** | **full** | **A1** (new dependency — npm package surface); **A2** (new architectural pattern — DS event consumer; freeze-hook extension via additive parameter); **A4** (novel data model — DS event type + FreezeHookInput-compatible discriminator); **A6** (touches Phase 2 frozen freeze-hook surface — additive parameter but high blast radius for backward-compat preservation). | Full-tier prior matches PRD § Phase 3 SLICE structure line 487 explicit "Tier: full". Audit-tier insufficient: A1+A2+A4+A6 conjunction; freeze-hook extension across Phase 2 frozen surface demands cold-eye Architect. |

### Tier prior discrepancies

(Empty at v1 emission — no Wave 9 or Wave 10 cluster yet to surface a discrepancy.)

| WU ID | Coordinator prior | Cluster self-assessed | Wave gate where surfaced |
|---|---|---|---|
| — | — | — | — |

---

## Cluster handoff inventory

Per CLAUDE-COORDINATOR.md §Cluster handoff inventory, handoff artifacts are created at dispatch of the target cluster (not pre-created at plan time). **No CLUSTER-HANDOFF artifacts emitted at this plan time.**

| Handoff artifact | From WU | To WU | Wave boundary | D-test that fired | Emitted at |
|---|---|---|---|---|---|
| `coordination/CLUSTER-HANDOFF-WAVE10-3A-3B.md` | WU-Phase3-3A (Wave 9) | WU-Phase3-3B (Wave 10) | Wave 9 → Wave 10 gate | D1 HIGH + D2 HIGH | **NOT emitted at WAVE-PLAN-09 v1.** Will emit at WAVE-GATE-09 close. |
| `coordination/CLUSTER-HANDOFF-WAVE10-3A-3C.md` | WU-Phase3-3A (Wave 9) | WU-Phase3-3C (Wave 10) | Wave 9 → Wave 10 gate | D1 HIGH + D2 HIGH | **NOT emitted at WAVE-PLAN-09 v1.** Will emit at WAVE-GATE-09 close. |

**Rationale for zero handoff artifacts at WAVE-PLAN-09 v1:** Per CLAUDE-COORDINATOR.md convention, the handoff artifact lands at the wave gate that authorizes its target cluster's dispatch (i.e., at WAVE-GATE-09 close, which authorizes Wave 10 dispatch of WU-3B + WU-3C). The two handoff artifacts share the same source (WU-3A npm package) but have distinct target clusters (3B and 3C); per the template's "one edge, one file, one clear accountability boundary" discipline (CLUSTER-HANDOFF-TEMPLATE.md:5–7), two separate handoff files emit, NOT one combined file.

**Cross-cluster handoff content sketch (Coordinator preview for grilling purposes; actual artifacts emit at WAVE-GATE-09 close):**

Both CLUSTER-HANDOFF-WAVE10-3A-3* artifacts will document:
- npm package name + version pinned at WAVE-GATE-09 close
- Package exported surfaces (which symbols are importable; which are internal)
- Tessera-side import statement convention (relative paths post-extract; if any exceptions)
- Cross-cluster contract for `engine/ds-integration/*` directory naming (WU-3A may pre-land the directory scaffold; Architect decides)
- Phase 2 freeze-hook location (3C-specific; documented so 3C's Architect knows where to apply additive parameter)
- Shared-types disposition (per OQ-Phase3-W3-3 resolution): file-isolated (default) or pre-landed by 3A
- DS-side modification scope-cut (per OQ-Phase3-W3-1 resolution): combined or split-PR
- npm package physical location (per OQ-Phase3-W3-2 resolution): sibling repo, monorepo, DS-repo sub-path, or in-place

Template: `templates/CLUSTER-HANDOFF-TEMPLATE.md`.

---

## Pre-emit grilling

Per `CLAUDE-COMMON.md` Superpowers Review block + Coordinator's pre-emit grilling discipline (CLAUDE-COORDINATOR.md):

- [x] **Every dependency edge is verifiable.** Step 2's tables each cite a specific D-test with concrete reasoning. Inter-WU edges between 3A→3B and 3A→3C are D1 HIGH + D2 HIGH grounded in WU-3B's frame-level AC scope (f) + WU-3C's frame-level AC scope (f) — both require npm package import (which doesn't exist pre-3A). 3B↔3C edges are all LOW per Step 2 inter-WU edge table; file-layout discipline + parallel-class convention + reverse-direction architectural distinctness are the load-bearing reasons. Inbound informational edges from Phase 2 + Phase 3 SLICE 1+2 honestly classified as MEDIUM (interface contract / SLICE-close precedent) or HIGH (modification target for WU-3A's extract scope).
- [x] **No unstated assumptions.** Five Step 3 judgment calls surfaced: (1) bundle-vs-split-vs-parallel-fan-out for 3B+3C with 4-factor reasoning favoring parallel-fan-out; (2) shared types between 3B+3C deferred to cluster Architects with file-isolated default; (3) npm package extract scope-cut (Tessera+DS combined vs Tessera-only) deferred to operator with Coordinator default (ii) Tessera-only; (4) npm package physical location deferred to operator with Coordinator default (c) DS-repo sub-path; (5) Tessera-side post-extract file-layout deferred to WU-3A Architect with Coordinator default (a) `engine/ds-integration/`; (6) SCOPING-MEMO § 9 amendment timing deferred to Architect with Coordinator default (a) opportunistic close. Each judgment call documented with bounded options + reasoning + Coordinator default. **Critically: the PARALLEL-FAN-OUT decision is NOT a Coordinator default; it is the operator-mandated empirical analysis with full D-test evidence (Step 2 inter-WU edge table + Step 3 Judgment call 1 4-factor reasoning).**
- [x] **No scope added beyond PRD.** WU-3A traces to PRD lines 439 (FR-D1) + 450 (AC-P8) + 485 (SLICE structure). WU-3B traces to PRD lines 440 (FR-D2 — Tessera→DS half) + 486 (SLICE structure, split per NEXT-ROLE.md:25–26). WU-3C traces to PRD lines 441 (FR-D3) + 487 (SLICE structure) + AC-P3/P4 (PRD:378–379, extended to real DS events). SCOPING-MEMO § 9 (engine vendoring policy) cited for WU-3A authorization. No invented WUs; no scope expansion beyond what PRD enumerates. The NEXT-ROLE.md split of PRD line 486's "bi-directional DS integration" into 3B + 3C is operator-directed per NEXT-ROLE.md:25–26, NOT a Coordinator scope addition.
- [x] **Cluster can act without guessing.** Each WU has (a) PRD trace + SCOPING-MEMO cross-reference + WAVE-GATE-08 forward-flag carry-forward; (b) frame-level AC scope per per-direction breakdown in Step 1 table; (c) bounding anti-scope (A8/A10/A11/A12/A13/A16 + A17/A12 selective rescissions for 3A + NEW Phase 3 anti-scope + frozen-prior-deliverable enumeration); (d) file tree scope (NEW / MODIFY / READ-ONLY annotations with explicit defaults + spec-time-Architect-discretion points); (e) tier verdict (full for all three) with A1-A7 conjunction documented; (f) Architect spec-time discretion clearly bounded (split-decision threshold; file-layout choice; opportunistic SCOPING-MEMO § 9 amendment; cross-repo scope-cut).
- [x] **DAG is acyclic.** Step 4 cycle check passed. Two directed edges (3A→3B; 3A→3C); zero inter-edge between 3B and 3C; zero reverse edges. Inbound edges from frozen prior phases are forward-flowing.
- [x] **Tier priors are defensible.** WU-3A full-tier prior cites A1+A2+A4+A6+A7 (matches PRD line 485 explicit "Tier: full (architectural restructure)"). WU-3B full-tier prior cites A1+A2+A4+A6 (matches PRD line 486 explicit "Tier: full"). WU-3C full-tier prior cites A1+A2+A4+A6 (matches PRD line 487 explicit "Tier: full"). Per-WU AC count targets (14–18 for 3A; 10–14 for 3B; 12–16 for 3C) fall at or below R20+R21 split-decision threshold (18); Architects retain escalation discretion at spec time.

**Adversarial review notes (additional self-grilling):**

- **Risk: "Parallel-fan-out for 3B+3C is theoretically clean but the operator may want sequential dispatch anyway to manage cluster-review load."** Response: Operator R60 directive (NEXT-ROLE.md:127) explicitly forbids defaulting to sequential without empirical D-test demonstration. Coordinator performed empirical D-test analysis (Step 2 inter-WU edge table) and Step 3 Judgment call 1 with 4-factor reasoning. The Coordinator's verdict is recommendation, not binding; operator retains override authority at Wave 10 dispatch time. If at WAVE-GATE-09 close operator wants sequential dispatch instead, the wave plan can be amended to WAVE-PLAN-09-v2 splitting Wave 10 into two single-cluster waves. **The Coordinator's job at this plan time is to surface the empirical evidence; the operator's job at WAVE-GATE-09 close is to authorize Wave 10 dispatch shape.**

- **Risk: "WU-3A scope is too large — npm extract + manifest reset + cross-repo coordination + import-statement updates in ~30–50 files is a single AC suite that exceeds the 18-AC R20+R21 threshold."** Response: Target AC count 14–18; Architect retains split-decision flexibility per R20+R21 precedent if exceeded. If at spec time the Architect determines 14–18 is insufficient for the extract's natural granularity, ESCALATE to Coordinator for WAVE-PLAN-09-v2 splitting WU-3A into sub-WUs (e.g., 3A.1 = package scaffold + Tessera-side imports; 3A.2 = DS-side imports + cross-repo verification). This is the standard R20+R21 release valve — DO NOT silently split. Coordinator's plan at v1 emit preserves WU-3A as a single WU per PRD line 485 + the architectural-restructure framing.

- **Risk: "Path B dependency on synthetic DS event fixtures means 3C's freeze-hook real-event activation is not actually validated against real DS events — only synthetic DS-event-shaped fixtures."** Response: This is the Path B trade-off accepted at WAVE-GATE-06 close (OQ-P3-9 RESOLVED 2026-05-19). Path A would have introduced real-cluster scope but was declined. The synthetic-fixture validation provides AC-P4-equivalent confidence at the Tessera+SLICE-3 boundary; real-DS-events validation would be a Phase 4 (or post-project) concern if ever pursued. Coordinator notes this in 3C's anti-scope ("synthetic DS event fixtures only") so the Architect's spec doesn't accidentally pull in real-DS-event scope.

- **Risk: "WU-3A's cross-repo scope (potentially modifying ~/concord/deploysignal/) is outside Tessera's pipeline boundary. The pipeline operates on the Tessera worktree; DS-repo modifications are not tracked by `git diff --name-only` from the Tessera HEAD."** Response: Surfaced as OQ-Phase3-W3-1 with Coordinator default (ii) Tessera-only + DS-side via separate PR (the operator-favorable default for pipeline-boundary preservation). If operator selects (i) combined, the WU-3A Architect coordinates DS-side commits explicitly in spec component inventory; cross-repo anti-scope diff verification becomes a manual cross-repo grep, not the standard Tessera-side `git diff`. Coordinator flags this explicitly so the operator's choice is informed.

- **Risk: "npm package publication requires npm registry account + publication infrastructure that may not yet exist."** Response: Per NEXT-ROLE.md:77 "NO opening of GitHub PRs" + operator-routed dispatching, WU-3A ships pre-PR commit landings only. npm package PUBLICATION (to the npm registry) is operator-discretion at Phase 3 close, NOT a WU-3A AC. WU-3A creates the package artifact + manifest + builds; publication is downstream. AC-P8 ("both Tessera + DeploySignal repos consume the same version") may be validated against a local-only package version (e.g., `file:` reference in package.json) at WU-3A close; npm-registry publication validation is a Phase-3-close gate item. Architect spec articulates this delineation.

- **Risk: "Phase 2 freeze-hook location is `engine/fleet/...` or some related path; 3C MUST grep-verify the actual location before spec time. If the freeze-hook turns out to be in `engine/verdict-groups.ts` (R20 vendored-with-deltas), the additive-parameter approach must handle vendored-with-deltas discipline correctly."** Response: 3C's Architect grep-verifies at spec time; if freeze-hook is in a vendored-with-deltas file, applies the two-step maintenance pattern (per PHASE-2-SLICE-1-CLOSE-WALK § 2). 3C anti-scope explicitly mentions this case (Step 1 table 3C anti-scope column: "If the freeze-hook is vendored-at-pin, ESCALATE OR transition to vendored-with-deltas with full two-step maintenance").

- **Risk: "The PRD's 'bi-directional' framing (line 486) suggests 3B and 3C have an end-to-end-wired test surface (3B emits → DS → 3C consumes). The 3B+3C parallel-fan-out doesn't naturally produce that end-to-end test."** Response: Per Step 3 Judgment call 1 reasoning factor 4 + Step 2 D3 LOW row: end-to-end wiring is a Phase-3-close-walk concern, NOT a per-WU concern. 3B validates its outbound feed against a Tessera-side DS-consumer-simulation fixture (AC scope (e)); 3C validates its inbound consumer against a Tessera-side synthetic DS-event fixture (AC scope (c)). The integration of 3B's output → 3C's input is a Phase-3-close-walk audit item (post-WAVE-GATE-10), NOT a Wave-10 cluster scope item.

- **Risk: "Naming-convention drift for WAVE-PLAN-09 + CLUSTER-HANDOFF-WAVE10-* — does this honor R54 globally-sequential WAVE-NN convention?"** Response: YES. Per WAVE-GATE-06/07/08 + this plan: Phase 2 used WAVE-01..05; Phase 3 SLICE 1 = WAVE-06; SLICE 2 = WAVE-07 + WAVE-08; SLICE 3 starts at WAVE-09. WAVE-PLAN-09.md matches the first wave it dispatches (Wave 9). WAVE-GATE-09 (closes Wave 9) + WAVE-GATE-10 (closes Wave 10) are the future gate artifacts. CLUSTER-HANDOFF-WAVE10-*.md naming matches the wave at which they apply (the target cluster's dispatch wave, Wave 10).

- **Risk: "User prompt mentions deliverable as `coordination/WAVE-PLAN-06.md` (line `Deliverable: coordination/WAVE-PLAN-06.md`) but NEXT-ROLE.md:21 + 80 specifies `coordination/WAVE-PLAN-09.md`."** Response: NEXT-ROLE.md is the authoritative directive (it's the file the Coordinator was instructed to read in order and use as round-scope directive per the user prompt's "Read these before doing anything (in order)" list, with NEXT-ROLE.md as item 3). The "WAVE-PLAN-06" reference in the user-prompt scaffolding is drift; the canonical WAVE-NN convention places SLICE 3's first plan at WAVE-PLAN-09. Coordinator emits to WAVE-PLAN-09.md per NEXT-ROLE.md + the convention.

- **Risk: "Rule 4 (anti-scope-allowed-set-forward-coverage) — does this Coordinator emission respect the ALLOWED_SET in NEXT-ROLE.md:79–84?"** Response: YES. The Coordinator emits only to: (a) `coordination/WAVE-PLAN-09.md` (this file, NEW); (b) `coordination/COORDINATOR-MEMORIAL.md` (append; performed after this artifact emits); (c) `coordination/MEMORIAL.md` (Coordinator-section append at round close; performed at round close not at plan emit); (d) `coordination/NEXT-ROLE.md` (STATUS update at round close). CLUSTER-HANDOFF artifacts NOT emitted at plan time per handoff-at-target-dispatch convention. No modifications to SCOPING-MEMO / PRD / engine / test / scripts / CLAUDE-*.md / MEMORIAL-PHASE-*.md frozen shards.

- **Risk: "Wave-aggregate verifier at WAVE-GATE-09 (single-cluster Wave 9) + WAVE-GATE-10 (2-cluster Wave 10) — different behavior expected at each."** Response: WAVE-GATE-09: single-cluster wave; advisory items expected per WAVE-GATE-06/07/08 precedent (no cluster fragments found; informational). WAVE-GATE-10: 2-cluster wave; aggregate ALLOWED_SET union check + cross-cluster contract drift check + MEMORIAL fragment semantic-conflict detection all become LOAD-BEARING (this is the first Phase 3 wave with multi-cluster dispatch since Phase 2 Wave 2). Tier-aware consolidation Reviewer per R50: WAVE-GATE-09 OPTIONAL (single-cluster full-tier); WAVE-GATE-10 OPTIONAL per R50 (both clusters full-tier with cluster-internal Reviewer) but Coordinator recommendation YES because of Phase-3-close milestone magnitude.

If any check fails: revise this plan before routing. **All 6 checklist items + 11 adversarial notes addressed inline; no failed checks.**

---

## Open questions for operator

The Coordinator does NOT resolve these — they require operator-level decisions or are deferred to the Architect at spec time.

**OQ-Phase3-W3-1 (NEW — npm package extract scope-cut: Tessera+DS combined vs Tessera-side only):**
- **Option A (Recommended; Coordinator default for pipeline-boundary preservation):** Tessera-side only in WU-3A; DS-side update via separate DS-repo PR outside Tessera pipeline. AC-P8's "both repos consume the same version" satisfied via Tessera-side npm package publication + DS-side consumption verification at SLICE 3 close (Phase 3 close-walk).
- **Option B:** Tessera+DS combined in WU-3A. Architect coordinates Tessera AND DS commits within WU-3A scope. Larger blast radius; honors AC-P8's "both repos consume" framing literally in one cluster cycle.
- **Default if no operator answer:** Coordinator prior is A. WU-3A Architect's call at spec time per OQ resolution.

**OQ-Phase3-W3-2 (NEW — npm package physical location):**
- **Option A:** Sibling repo at `~/concord/deploysignal-engine/`. Clean separation; new repo to publish from.
- **Option B:** Tessera monorepo sub-package at `~/concord/tessera/packages/deploysignal-engine/`. Tessera owns the package source.
- **Option C (Recommended; Coordinator default):** DS repo sub-path at `~/concord/deploysignal/packages/deploysignal-engine/`. Source-of-truth for the engine code is DS (where it originates at SHA `5a72371`); placing the package source in DS preserves the upstream-flow.
- **Option D:** Extract from DS in-place — restructure DS to expose its engine as the npm package directly (no separate sub-path).
- **Default if no operator answer:** Coordinator prior is C. WU-3A Architect's call at spec time.

**OQ-Phase3-W3-3 (NEW — Tessera-side post-extract file-layout for DS-integration code + shared-types disposition between 3B and 3C):**
- **Sub-question (a) — directory naming:** Continue under `engine/ds-integration/*` (Coordinator default A) OR migrate to a new top-level like `src/ds-integration/*` post-extract (Option B). WU-3A Architect's call at spec time.
- **Sub-question (b) — shared types between 3B and 3C:** File-isolated parallel-class (3B owns `feed-types.ts`; 3C owns `event-types.ts`; Coordinator default A) OR pre-landed shared-types substrate added to WU-3A scope (`engine/ds-integration/types.ts`; Option B). If the WU-3A Architect determines shared types are necessary across 3B+3C, expand WU-3A scope to pre-land them via CLUSTER-HANDOFF amendment at WAVE-GATE-09 close.
- **Default if no operator answer:** Coordinator prior is A for both sub-questions.

**OQ-Phase3-W3-4 (NEW — new external dependencies introduced by 3B or 3C):**
- **Option A (Recommended; Coordinator default):** No new external dependencies; ship against synthetic fixtures only per Path B. 3B's DS-side consumer-simulation is a Tessera-original fixture function; 3C's DS event fixtures are Tessera-original JSON.
- **Option B:** Allow 3B or 3C Architects to introduce a new dev-dependency (e.g., DS event format validation lib) if it materially simplifies the spec. Each new dependency requires explicit OQ surfacing + operator approval (per Phase 3 anti-scope: NO vendor-locked code paths; new dependencies cross-cluster-vetted).
- **Default if no operator answer:** Coordinator prior is A. Architects at Wave 10 surface OQ if dependency need arises.

**OQ-Phase3-W3-5 (NEW — SCOPING-MEMO § 9 amendment timing for Phase 3 SLICE 3 + § 2.3 amendment timing for SLICE 3 deliverables):**
- **Option A (Recommended; Coordinator default for WU-3A; matches R52/R55 OQ-Phase3-W*-2 carry-forward pattern):** WU-3A closes opportunistically IF Architect spec touches SCOPING-MEMO § 9 anyway (e.g., to mark the extract-to-npm commitment as REALIZED rather than FUTURE). § 2.3 amendments for 3B+3C surfaces (e.g., adding a "DS integration" sub-extension reflecting Phase 3 SLICE 3 landings) deferred to Phase 3 close-walk.
- **Option B:** Defer all SCOPING-MEMO amendments to a Phase 3 close-walk dedicated round.
- **Default if no operator answer:** Coordinator prior is A. WU-3A Architect's call at spec time.

**OQ-P3-9 (CARRY-FORWARD — RESOLVED at WAVE-GATE-06 close; Path B; preserved at WAVE-GATE-08):**
- Operator selected Path B at WAVE-GATE-06: DEFER cluster rental for live-DCGM L0 contract validation. AC-P6 DEFERRED. SLICE 3 inherits Path B's "no real-cluster work" constraint; 3B+3C ship against synthetic fixtures only.
- **No action required at this plan time.** Recorded for context.

**OQ-P3-11 (CARRY-FORWARD from PRD — DEFAULT EXTEND v0.3; ESCALATE IF REVIEWER FLAGS):**
- SCOPING-MEMO v0.4 needed? Default: extend v0.3 with Phase 3 amendments at future close-walks (OQ-Phase3-W3-5). Escalate to v0.4 only if Reviewer at SLICE 3 close flags scope-creep beyond v0.3 amendments.

---

## Wave 9 dispatch authorization

**Plan verdict:** READY-TO-DISPATCH (Wave 9).

OQ-Phase3-W3-1 (extract scope-cut) + OQ-Phase3-W3-2 (package location) + OQ-Phase3-W3-3 (file-layout + shared types) + OQ-Phase3-W3-4 (new dependencies) + OQ-Phase3-W3-5 (SCOPING-MEMO amendment timing) are NOT blocking — Architect spec-time discretion with Coordinator defaults. OQ-P3-9 RESOLVED Path B at WAVE-GATE-06. OQ-P3-11 default extend v0.3.

Wave 9 cluster authorized for dispatch:

| Cluster | Work unit | Tier (Coordinator prior) | Dispatch routing |
|---|---|---|---|
| (single cluster) | WU-Phase3-3A (engine npm package extract) | full | `./run-pipeline.sh --tier full` from `~/concord/tessera` main worktree |

**Pre-dispatch operator actions (Wave 9):**

1. (Recommended) Answer OQ-Phase3-W3-1 (extract scope-cut) at R61 dispatch time — affects WU-3A blast radius materially. Coordinator default A (Tessera-only + DS-side via separate PR) applies absent answer; this is the recommended pipeline-boundary-preserving choice.
2. (Recommended) Answer OQ-Phase3-W3-2 (package location) at R61 dispatch time — affects WU-3A directory ownership. Coordinator default C (DS-repo sub-path) applies absent answer.
3. (Optional) Answer OQ-Phase3-W3-3 + OQ-Phase3-W3-4 + OQ-Phase3-W3-5 — Architect can resolve at spec time absent operator override.
4. (Required by NEXT-ROLE.md:85–90 + Rule 7 propagation directive) Confirm `scripts/pre-commit-rule-sweep.sh` + SPEC-AUTHORING-CHECKLIST.md gates inherited from Phase 2 + Phase 3 SLICE 1+2 close are operational at WU-3A dispatch.
5. Run `./run-pipeline.sh --tier full` from the main worktree at `~/concord/tessera`.

**Post-Wave-9 actions (Coordinator-owned, future round — NOT R60 scope):**

6. At Wave 9 gate (next Coordinator invocation after WU-3A cluster close), Coordinator authors `coordination/WAVE-GATE-09.md` per `templates/WAVE-GATE-TEMPLATE.md`, applying:
   - Per-cluster Reviewer report verification (MERGE-READY status check)
   - `scripts/verify-wave-aggregate.sh WAVE-09` exit 0 (single-cluster wave; advisory items expected as informational per WAVE-GATE-06/07/08 precedent)
   - Tier-aware consolidation Reviewer per R50: cluster ran full-tier → consolidation Reviewer OPTIONAL; operator may invoke `--consolidation-reviewer` flag if cross-repo integration concerns surface
   - Phase 3 SLICE 3 anti-scope verification (NO real-cluster access per Path B; vendor-neutral interface; selective A12/A17 rescissions verified to be bounded to WU-3A only)
   - **Emit `coordination/CLUSTER-HANDOFF-WAVE10-3A-3B.md` + `coordination/CLUSTER-HANDOFF-WAVE10-3A-3C.md`** documenting the WU-3A npm package contract that BOTH WU-3B and WU-3C will consume at Wave 10 (per CLAUDE-COORDINATOR.md handoff-at-target-dispatch convention; one file per directed edge per template discipline)
   - Resolve OQ-Phase3-W3-3 sub-question (b) (shared types) if WU-3A Architect deferred to operator — update Coordinator default before Wave 10 dispatch

7. **Wave 10 dispatch authorization after WAVE-GATE-09 close: 2-cluster PARALLEL dispatch.** Operator invokes `scripts/multi-track-cluster-setup.sh` per cluster:
   - Cluster `cluster/wu-phase3-3b-tessera-to-ds-R{63-or-Coordinator-decides}` for WU-Phase3-3B
   - Cluster `cluster/wu-phase3-3c-ds-to-tessera-R{63-or-Coordinator-decides}` for WU-Phase3-3C
   Each cluster runs `./run-pipeline.sh --tier full` from its own worktree branch. Coordinator NOT in-loop during cluster execution.

8. At Wave 10 gate (Coordinator invocation after BOTH Wave 10 clusters close), Coordinator authors `coordination/WAVE-GATE-10.md` per template; applies:
   - Per-cluster Reviewer report verification (BOTH MERGE-READY)
   - `scripts/verify-wave-aggregate.sh WAVE-10` exit 0 (2-cluster wave; aggregate ALLOWED_SET union check + cross-cluster contract drift check + MEMORIAL fragment semantic-conflict detection all become LOAD-BEARING — first Phase 3 multi-cluster wave)
   - **Tier-aware consolidation Reviewer per R50: both clusters full-tier → consolidation Reviewer OPTIONAL. Coordinator recommendation: INVOKE for Phase-3-close milestone magnitude.** Operator decides invoke-or-not.
   - Phase 3 SLICE 3 close declaration + Phase 3 close milestone stamp candidate
   - Forward-flags for Phase 3 close-walk OR project-close dispatch (per OQ surfaced at WAVE-GATE-10 close)

9. **Phase 3 close-walk decision (post-WAVE-GATE-10):** future Coordinator OR operator-led round emits `coordination/PHASE-3-CLOSE-WALK.md` (analogous to PHASE-2-CLOSE-WALK.md + PHASE-2-SLICE-{1,2}-CLOSE-WALK.md) OR proceeds directly to project-close per PRD § Phase 3 success metrics line 508. Operator decides at WAVE-GATE-10.

---

## Version history

| Version | Date | Trigger | What changed |
|---|---|---|---|
| v1 | 2026-05-19 | R60 third Phase 3 Coordinator invocation; Phase 3 SLICE 2 closed at R59 WAVE-GATE-08 (Path B preserved); R60 directive (NEXT-ROLE.md) requested SLICE 3 wave plan emission with PARALLEL-FAN-OUT evaluation for 3B+3C per pipeline `--coordinator` mode | Initial Phase 3 SLICE 3 wave plan. Three WUs (WU-Phase3-3A npm package extract + WU-Phase3-3B Tessera→DS feed + WU-Phase3-3C DS→Tessera event consumer + freeze-hook real-event activation); two waves (Wave 9 single-cluster + Wave 10 2-cluster PARALLEL-FAN-OUT). Option C (parallel-fan-out for 3B+3C) chosen per operator R60 mandate + empirical D-test analysis demonstrating clean independence (D1+D2+D3+D4+D5 all LOW between 3B and 3C). Option A (bundle 3B+3C) and Option B (split sequential) both evaluated and rejected per Step 3 Judgment call 1 4-factor reasoning. Full tier for all three WUs per A1+A2+A4+A6+A7 (3A) and A1+A2+A4+A6 (3B, 3C). 5 new OQs (OQ-Phase3-W3-1 through W3-5). OQ-P3-9 Path B carry-forward. OQ-P3-11 default extend v0.3. 11 adversarial review notes appended to pre-emit grilling. Wave 9 dispatch authorized via `./run-pipeline.sh --tier full` from main worktree (single-cluster; no `--coordinator`; no `multi-track-cluster-setup.sh`). Wave 10 dispatch (post-WAVE-GATE-09) authorized via `scripts/multi-track-cluster-setup.sh` per cluster + `./run-pipeline.sh --tier full` per worktree. CLUSTER-HANDOFF-WAVE10-3A-3B.md + CLUSTER-HANDOFF-WAVE10-3A-3C.md NOT pre-emitted (land at WAVE-GATE-09 close per CLAUDE-COORDINATOR.md handoff timing convention). Globally-sequential WAVE-NN naming honored: WAVE-09 = SLICE 3 first wave; WAVE-10 = SLICE 3 second wave; WAVE-PLAN-09.md = matching plan filename. WU-Phase3-3A identified as foundation per CLAUDE-COORDINATOR.md §Step 4 (outputs to 3+ WUs across 2+ domains: Tessera-side import surface + DS-side import surface + future-rounds import surface). SLICE 3 close == Phase 3 close == project-close-candidate per PRD § Phase 3 success metrics. |

---

## Pipeline invocation (Wave 9 cluster dispatch — operator runs at SLICE 3 dispatch time, not at R60 emit time)

```bash
cd /Users/johnwarren/concord/tessera
./run-pipeline.sh --tier full
```

(Standard single-pipeline dispatch for Wave 9's single full-tier cluster. NOT `--coordinator` mode; NOT `multi-track-cluster-setup.sh`. WAVE-GATE-09 + Wave 10 dispatch via multi-track + WAVE-GATE-10 + Phase 3 close-walk decision are separate Coordinator/operator rounds after Wave 9 cluster close.)

**Wave 10 dispatch invocation (post-WAVE-GATE-09; for operator reference):**

```bash
cd /Users/johnwarren/concord/tessera
# Cluster 1 setup (Tessera → DS feed):
scripts/multi-track-cluster-setup.sh --cluster wu-phase3-3b-tessera-to-ds
# Cluster 2 setup (DS → Tessera event consumer):
scripts/multi-track-cluster-setup.sh --cluster wu-phase3-3c-ds-to-tessera
# Then in each cluster worktree, dispatch the pipeline:
cd ~/projects/tessera-clusters/wu-phase3-3b-tessera-to-ds && ./run-pipeline.sh --tier full
cd ~/projects/tessera-clusters/wu-phase3-3c-ds-to-tessera && ./run-pipeline.sh --tier full
# (Both can run concurrently in separate terminals.)
```
