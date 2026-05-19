# Tessera — Coordinator role block

# ── COORDINATOR ───────────────────────────────────────────────────────────────
# Active when: THIS SESSION ROLE = COORDINATOR
# Common disciplines (Superpowers, universal disciplines, tier rubric) are in
# CLAUDE-COMMON.md, loaded alongside this file.
#
# The Coordinator role is OPT-IN per project. It only loads when the operator
# launches the pipeline in --coordinator mode (or invokes the Coordinator
# directly via interactive session) for multi-cluster wave planning. The
# four-role automated pipeline (Mode 2) does NOT load this file — Mode 2 is
# single-cluster execution; the Coordinator role does not exist in that
# context.
#
# Methodology source: anchor/skills/12-coordinator-role.md (vendored verbatim
# below with path-reference adaptations to Tessera-local equivalents — see
# templates/README.md for the path mapping).

## Tessera path-reference adaptations

When this file references anchor canonical paths, the Tessera equivalents are:

| Anchor reference | Tessera equivalent |
|---|---|
| `skills/12-coordinator-role.md` | this file (`CLAUDE-COORDINATOR.md`) |
| `skills/11-round-scaling.md` | tier rubric (A1-A7 / S1-S5 / Z1-Z5) inlined in `CLAUDE-COMMON.md` |
| `skills/01-pre-emit-grilling.md` | grilling discipline inlined per-role in `CLAUDE-{ARCHITECT,IMPLEMENTER,REVIEWER}.md` |
| `skills/02-memorial-accretion.md` | memorial discipline inlined in `CLAUDE-MEMORIAL.md` + per-role |
| `skills/09-role-anchoring.md` | role-stamp mechanism in `run-pipeline.sh` + `coordination/.role-stamp` |
| `skills/10-product-manager-role.md` | `coordination/PRD.md` is operator-owned; Coordinator reads it as input |
| `templates/WAVE-PLAN-TEMPLATE.md` | `templates/WAVE-PLAN-TEMPLATE.md` (vendored) |
| `templates/CLUSTER-HANDOFF-TEMPLATE.md` | `templates/CLUSTER-HANDOFF-TEMPLATE.md` (vendored) |
| `templates/WAVE-GATE-TEMPLATE.md` | `templates/WAVE-GATE-TEMPLATE.md` (vendored) |
| `templates/COORDINATOR-MEMORIAL-TEMPLATE.md` | `templates/COORDINATOR-MEMORIAL-TEMPLATE.md` (vendored) |
| `templates/TPM-REPLY-TEMPLATE.md` | TPM role folded into `NEXT-ROLE.md` state per Mode 2; no separate template |
| `case-studies/archfolio-coordinator-dryrun/*` | external anchor canonical artifacts; not in Tessera tree |

---

# Skill: Coordinator — PRD Decomposition and Wave Planning

**Trigger:** Project has a structured PRD and is ready to begin multi-cluster
parallel execution.
**Application moment:** After PRD is finalized and before any implementation
begins. Re-applied at scope revisions that affect work unit boundaries or
dependency edges.
**Owner:** Coordinator TPM — a dedicated session whose scope is cross-wave
orchestration only. Distinct from any cluster-level TPM work.

## What it is

The Coordinator role owns how a structured PRD becomes a dependency graph,
and how that graph becomes a sequenced wave plan that parallel clusters
can execute against.

This skill is upstream of all cluster dispatch. No cluster receives work
until the Coordinator has produced a validated wave plan with explicit
dependency edges, work unit classifications, and wave gate criteria. The
wave plan is the Coordinator's primary artifact — the analog of the
Architect's spec or the PM's PRD, but at the program level rather than the
feature level.

## Why a separate role

The existing TPM role (in Tessera: folded into `NEXT-ROLE.md` state per
Mode 2 automated pipeline) handles routing within a project — forwarding
specs to implementers, grilling artifacts before emit, tracking memorial
state. That role operates inside a single coordination cycle.

The Coordinator operates across cycles and across clusters. Its job is
not to route work but to determine what work exists, what order it must
happen in, and how many streams can run simultaneously. Conflating this
with intra-cycle TPM routing produces a role that is doing two
qualitatively different things and doing neither with full discipline.

The Coordinator has no reach inside any cluster. Once a cluster receives
its work unit, the Coordinator's job for that cluster is done until the
wave gate. What happens inside the cluster — whether it scales to
include an Architect, whether the Reviewer rejects and the cluster
retries — is not the Coordinator's concern until the cluster's output
surfaces at the wave gate.

## Coordinator scope and out-of-scope

**In scope:**
- PRD decomposition into candidate work units
- Dependency edge identification and DAG construction
- Wave sequencing from the DAG
- Work unit classification (novelty/complexity tier)
- Wave gate execution across all cluster outputs
- Cross-cluster dependency artifact management
- Resequencing dependent clusters when a wave gate surfaces a rejection
- Memorial accretion at the coordinator level

**Out of scope:**
- Spec drafting (Architect's role within clusters)
- Implementation (Implementer's role within clusters)
- Spec-vs-implementation audit (Reviewer's role within clusters)
- Intra-cluster routing decisions
- Retry decisions within a cluster (cluster handles internally up to halt threshold)
- Mid-project conversion from a serial pipeline to multi-track
  dispatch. The Coordinator assumes a clean start — DAG construction
  applies to the full remaining PRD. Projects already mid-stride on a
  serial pipeline require a separate transition protocol (TBD) that
  is out of scope for this role.

## DAG construction discipline

### Step 1 — Deterministic work unit extraction

Extract candidate work units directly from PRD structure. A well-formed
PRD has explicit features, acceptance criteria, and anti-scope. Each feature
is a candidate work unit. Do not invent work units; do not merge features
without explicit reasoning captured in the wave plan artifact.

For each candidate work unit, record:
- Work unit ID (e.g., WU-01, WU-02)
- Source PRD feature reference
- Acceptance criteria (verbatim from PRD)
- Anti-scope clauses that bound this unit
- File tree scope (which directories/files this unit touches)

This extraction is deterministic. Same PRD → same candidate work units.
No Claude judgment required at this step.

### Step 2 — Dependency edge identification

For each pair of work units, apply the following deterministic dependency
tests in order. If any test fires, record a dependency edge with the test
that fired as the reason.

**Test ordering rationale.** D1 and D5 are primary tests catching the
most common dependency patterns (shared output ownership; schema
write-conflict). D2, D3, and D4 are backup tests whose value varies
with PRD style — interface-contract-heavy PRDs surface more D2 edges;
PRDs without clean module boundaries surface more D3 edges; PRDs with
heavy shared-foundation file overlap surface more D4 contention. On
well-structured PRDs (explicit data flows, clean module separation),
D2 and D3 may surface zero unique edges. This is not a defect; it
reflects the PRD's structure doing dependency work upstream.

**Test D1 — Shared output ownership.** Does WU-A write to a file, schema,
or interface that WU-B reads from? If yes: WU-A → WU-B (A must complete
before B dispatches).

**Test D2 — Acceptance criterion reference.** Does WU-B's acceptance
criteria mention a behavior, data structure, or interface that WU-A's
acceptance criteria define? If yes: WU-A → WU-B.

**Test D3 — Anti-scope boundary adjacency.** Is WU-B's scope adjacent to
WU-A's anti-scope in a way that creates an implicit assumption? Flag for
Claude judgment (Step 3).

**Test D4 — File tree overlap.** Do WU-A and WU-B touch the same files?
If yes: record as a contention risk, not necessarily a dependency.
Resolve via worktree isolation unless the overlap is in a shared
foundation file, in which case: WU-A → WU-B or serialize.

**Test D5 — Migration write-conflict.** Does WU-A's intended migration
write to a table, column, or constraint that WU-B's intended migration
also writes? Two outcomes:

- **D5-strict (write-conflict).** If yes — WUs touch the same schema
  surface — record a serial dependency edge: WU-A → WU-B, where A's
  intended schema state lands first. Escalate to Step 3 if the
  intended order is ambiguous from the PRD. This is a HIGH-confidence
  dependency on par with D1/D2.
- **D5-contention (disjoint-schema).** If both WUs add migrations but
  against entirely separate tables / columns / constraints, this is
  NOT a strict dependency. Log it as a contention risk in the D4 file
  tree overlap table (shared file: the migration directory). The
  migration lock described under Shared-resource arbitration arbitrates
  the seconds-long migration-generation step so both clusters can
  dispatch in parallel.

The distinction matters because migration history is linear only at
*apply* time (filenames have a monotonic prefix, ORMs apply in name
order). Linearity at apply does not require dispatch to be serial.
Two independent table additions can be authored against the same base
schema in parallel and merge in either order. Forcing them into
separate waves to honor a non-existent constraint forfeits
parallelism for no correctness benefit.

Record every edge with: source work unit, target work unit, dependency
test that fired, confidence (HIGH if D1/D2/D5, MEDIUM if D3/D4).

### Step 3 — Claude judgment at ambiguity boundaries

Escalate to Claude only when:
- A dependency edge has MEDIUM confidence and the consequence of getting
  it wrong is a merge conflict or spec contradiction
- Two work units have no deterministic dependency edge but share a
  conceptual assumption that isn't captured in file tree or acceptance
  criteria
- Anti-scope boundary adjacency (D3) fired and the implicit assumption
  isn't resolvable by reading the PRD more carefully

For each Claude judgment call, record:
- The specific ambiguity (quote the relevant PRD text)
- The two candidate resolutions (parallel vs. sequential)
- Claude's judgment and the reasoning
- Resulting edge (or confirmed independence)

Claude judgment calls are logged as judgment artifacts, not deterministic
rules. The audit trail distinguishes them from D1/D2 edges.

### Step 4 — DAG validation

Before proceeding to wave planning, validate the DAG:

- **Cycle check.** No circular dependencies. If a cycle exists, surface
  to human operator — it indicates a PRD structural problem, not a DAG
  construction problem.
- **Island check.** Any work unit with no edges (no dependencies in or
  out) is a candidate for Wave 1 or any wave. Flag for explicit placement.
- **Foundation identification.** Work units whose outputs are inputs to
  3+ other work units **across 2+ domains/modules** are foundations.
  They must land in Wave 1 regardless of their own dependency-in count.
  Data models, shared interfaces, and core API contracts are the typical
  foundation candidates. The "2+ domains" requirement filters out
  false-positive foundations — a WU that feeds 3 follow-ons all within
  the same module is a domain head, not a cross-cutting foundation, and
  doesn't earn Wave 1 placement on connectivity alone.

### Step 5 — Wave sequencing

From the validated DAG, assign work units to waves:

- **Wave 1:** Foundations + any work unit with no dependency-in edges
- **Wave N+1:** Work units whose all dependency-in edges point to work
  units completing in Wave N or earlier
- **Final wave:** Integration, cross-cutting concerns, hardening — work
  units that touch outputs from multiple prior waves

**Operational cap on intra-wave parallelism.** Even when the DAG
allows N concurrent clusters in a single wave, default to a cap of
**≤5 clusters per wave**. Operator review burden, log volume, and
arbitration-lock contention all scale super-linearly past that point.
When the DAG allows N>cap WUs in a wave, sub-wave them into
`ceil(N/cap)` consecutive waves containing arbitrary subsets — DAG
correctness is preserved because intra-wave units are independent by
construction (no edges among them), so any sub-partition respects the
dependency graph. The cap is configurable via
`coordination/multi-track-config.json` `max-parallelism-per-wave`
(default 5).

Record the wave plan as a durable artifact (`WAVE-PLAN-NN.md` in
`coordination/`). The wave plan is the Coordinator's primary output
and the input to cluster dispatch.

## Work unit classification

Each work unit receives a tier classification that determines the cluster
role configuration. This classification is self-governing — each cluster
reads its work unit and applies the rubric independently. The Coordinator
records the expected tier in the wave plan, but the cluster's own
assessment governs.

The tier names align with the tier rubric in `CLAUDE-COMMON.md`
(A1-A7 / S1-S5 / Z1-Z5):

**`solo` — Implementer only:**
- Work unit is well-understood (similar to prior work in this project or codebase)
- Acceptance criteria are unambiguous and fully testable
- No novel algorithms, data structures, or integration patterns
- File tree scope is narrow and well-bounded

**`audit` — Implementer + Reviewer:**
- Work unit involves moderate complexity or cross-cutting concerns
- Acceptance criteria require interpretation at the boundary
- Implementation approach is known but verification is non-trivial
- File tree scope touches shared infrastructure

**`full` — Architect + Implementer + Reviewer:**
- Work unit is novel relative to the existing codebase
- Acceptance criteria involve emergent behavior or integration contracts
  not yet defined
- Implementation approach requires design decisions with downstream
  consequences
- File tree scope touches foundations or public interfaces

When in doubt, classify up. A `full` cluster that didn't need the
Architect costs one extra role's overhead. A `solo` cluster that needed
an Architect and didn't have one costs a Reviewer rejection and a retry
cycle.

### Cluster tier configurations vs. single-pipeline tiers

The cluster tier configurations above differ from the single-pipeline
tiers in `CLAUDE-COMMON.md` in one specific way: **clusters in
multi-cluster execution omit the per-cluster Memorial-Updater role.**
A separate Memorial-Updater per cluster would produce concurrent appends
to `MEMORIAL.md` and `CROSS-PROJECT-MEMORIAL.md` across N parallel
clusters — a race condition.

In multi-cluster mode, memorial duties redistribute:
- **Per-cluster CONFIRMATION/VIOLATION entries** are written inline by
  the cluster's Implementer (in `solo`) or by the Reviewer at the end of
  the Reviewer report (in `audit`/`full`). They land in
  `coordination/clusters/<cluster-id>/MEMORIAL-fragment.md`.
- **Wave-gate aggregation** is the Coordinator's job. At each wave gate,
  the Coordinator collects cluster memorial fragments and appends them
  to the project's `MEMORIAL.md` and `CROSS-PROJECT-MEMORIAL.md` under a
  single lock.
- **Coordinator-level memorial** (DAG construction and wave planning
  patterns) lives in `COORDINATOR-MEMORIAL.md` as described below.

In single-pipeline (Mode 2) mode, the Memorial-Updater role remains as
a separate fourth role per round — no parallelism, no race, no need to
collapse.

For the operational mechanism — locking primitives, fragment merge
order, timeout discipline, cross-project memorial freshness, schema
migration arbitration, and CLAUDE.md stamping under parallelism — see
Shared-resource arbitration in multi-track mode below.

## Wave gate discipline

The wave gate is the Coordinator's primary quality control mechanism
between waves. It is not a rubber stamp — it is the program-level
equivalent of the four-anchor pre-merge defense, applied across all
cluster outputs simultaneously.

Wave gate checklist (run before dispatching Wave N+1):

- [ ] All Wave N clusters have emitted a Reviewer report (or explicit
      scope-reduction disposition per two-slice pattern)
- [ ] No CRITICAL findings in any Reviewer report are unresolved
- [ ] All cross-cluster dependency artifacts for Wave N outputs are
      current and accurate
- [ ] Anti-scope clauses from the PRD are preserved across all Wave N
      outputs
- [ ] No Wave N output has silently expanded scope into Wave N+1 territory
- [ ] Memorial state at wave gate is captured in `WAVE-GATE-NN.md`

**Wave gate failure handling:**

| Failure type | Coordinator action |
|---|---|
| Reviewer rejection, self-contained | Cluster retries internally; wave gate holds until resolved |
| Reviewer rejection with downstream implications | Coordinator resequences dependent clusters; records resequencing in `WAVE-GATE-NN.md` |
| Spec ambiguity surfaced by Reviewer | Coordinator routes back to Architect (if cluster had one) or spawns Architect for a targeted spec amendment before retry |
| Scope expansion detected | Coordinator issues anti-scope correction; cluster revises before wave gate clears |

The wave gate never advances under CRITICAL unresolved findings.
LIKELY-SURFACES findings from any cluster are pre-flagged to the next
wave's relevant clusters before dispatch.

### Tier-aware consolidation Reviewer at wave-gate close

**Canonical text (R50):** Multi-cluster parallel waves where any constituent cluster
ran `--tier solo` (no per-cluster Reviewer) MUST run a cold-eye consolidation Reviewer
at wave-gate before STATUS: WAVE-COMPLETE. The Coordinator wave-gate aggregation is NOT
a substitute for a Reviewer — it is bookkeeping. Cross-cluster contract drift, aggregate
scope creep, and MEMORIAL fragment semantic-conflict are visible only at the consolidated
layer.

**When mandatory:** Any constituent cluster in Wave N ran `--tier solo`. No per-cluster
Reviewer means no cold-eye on that cluster's work. The tier-aware consolidation Reviewer
provides the missing audit at the wave boundary.

**When optional:** All clusters ran `--tier audit` or `--tier full` (each had their own
Reviewer). Consolidation Reviewer can still be explicitly requested for additional
cross-cluster integration coverage.

**Invocation:**

```bash
# Wave-gate close — mandatory consolidation Reviewer fires automatically if solo-tier detected:
./run-pipeline.sh --coordinator --wave-gate WAVE-01

# Force consolidation Reviewer even when all clusters ran audit/full tiers:
./run-pipeline.sh --coordinator --wave-gate WAVE-01 --consolidation-reviewer
```

**Wave-gate close flow sequence** (run-pipeline.sh `--coordinator --wave-gate`):
1. **Aggregate verifier:** `scripts/verify-wave-aggregate.sh WAVE-NN` — three mechanical
   checks: ALLOWED_SET union, cross-cluster contract drift (advisory), MEMORIAL fragment
   semantic-conflict detection (advisory).
2. **Tier detection:** scan `coordination/clusters/*/MEMORIAL-fragment.md` files for
   REVIEWER-authored CONFIRMATION entries (absence → solo-tier heuristic).
3. **Consolidation Reviewer** (mandatory if solo-tier detected; optional otherwise):
   spawns a fresh Reviewer session with consolidated wave state as input.
4. **STATUS: WAVE-COMPLETE** — set in `coordination/NEXT-ROLE.md` after the above.

> **Canonical text landed at:** R50 (2026-05-19). Closes the "no cold-eye review at
> consolidation when clusters ran solo-tier" gap identified in the R42-R47 design analysis.
> See `coordination/SPEC-AUTHORING-CHECKLIST.md` § Wave-aggregate verification discipline.

### Hybrid Reviewer mandate at close-walk class

Close-walk class rounds require hybrid Reviewer (Opus + Sonnet merged), not advisory. The
hybrid Reviewer runs two independent cold-eye passes and a merger step, providing coverage
complementarity (Opus catches AC-literal narrowings; Sonnet catches procedural violations —
per `coordination/EVAL-SONNET-REVIEWER-2026-05-15.md`).

**Close-walk class defined mechanically:**
- Phase-close round (e.g., R15 Phase 1 close, R37 WAVE-GATE-05 Phase 2 close)
- SLICE-close round (SLICE 1/2/3/4 close-walks)
- Sub-Phase-close round (Phase 2 close-walk variants, WU-05 SLICE 3 close-walk)
- Multi-cluster wave-consolidation round (any WU-NN consolidating multiple Wave N clusters)
- Any round where the operator explicitly sets `CLOSE-WALK-CLASS: true` in `coordination/NEXT-ROLE.md`

**Invocation:** add `CLOSE-WALK-CLASS: true` to the round's `coordination/NEXT-ROLE.md`
directive. `scripts/finalize-round.sh` reads this field and passes `--hybrid-reviewer` to
`run-pipeline.sh` automatically. Alternatively, pass `--hybrid-reviewer` directly:

```bash
./run-pipeline.sh --round R<NN> --tier audit --hybrid-reviewer
```

> **Canonical text landed at:** R49 (2026-05-19). Prior usage: R32/R36/R37/R39 (hybrid
> used 4+ times before formalization; this section makes it MANDATORY for the named class).

## Shared-resource arbitration in multi-track mode

Multi-track parallelism introduces several project-shared and
operator-global resources that cannot be written concurrently without
data loss or correctness violations. The Coordinator owns serialization
at every such boundary. The structural principle:

> Tracks execute independently; the Coordinator coordinates only the
> moments where they cannot.

Single-pipeline (Mode 2) execution does not require these mechanisms —
one writer, one cycle, serialization is trivial. The disciplines below
apply only when two or more tracks may be active concurrently against
the same project working tree.

### Resources requiring arbitration

| Resource | Writer | Arbitration mechanism |
|---|---|---|
| `coordination/MEMORIAL.md` | Coordinator at wave gate | Cluster fragments aggregated under a single project lock |
| `~/.claude/CROSS-PROJECT-MEMORIAL.md` | Operator-driven merge script | Per-project shards merged in batch on operator cadence (default weekly) |
| `CLAUDE-*.md` (canonical role files) | Coordinator at wave gate | Reinforcement appends under the same project lock as memorial |
| Per-session role/round stamp | Pipeline dispatcher | Per-track stamped copies; canonical is never stamped |
| Migration directory (e.g., `prisma/migrations/`) | Cluster Implementer | DAG D5 enforces serial dependency; migration lock catches D5 misses |

### Memorial state

**Project memorial (`coordination/MEMORIAL.md`).** Clusters never write
directly. Each cluster emits a fragment at
`coordination/clusters/<cluster-id>/MEMORIAL-fragment.md` (single-writer
inside the cluster — no concurrency). At the wave gate, the Coordinator
takes a `flock(2)` advisory lock on `coordination/.MEMORIAL.lock`,
appends all fragments from the just-completed wave to the **active
`MEMORIAL.md`** in deterministic order (cluster-id ASC, then fragment
line order), and releases the lock. Fragments are appended verbatim —
no rewriting. Append target is always the active file; past-phase
shards (`coordination/MEMORIAL-PHASE-N.md`) are frozen and never
appended-to. See CLAUDE-COMMON.md "Memorial sharding (R42 onward)" for
the shard layout + read protocol.

**Cross-project memorial (`~/.claude/CROSS-PROJECT-MEMORIAL.md`).** Not
written per round. Each project accumulates its own per-project shard
at `~/.claude/projects/<project-id>/MEMORIAL-shard.md`. A separate
operator-invoked script (`~/anchor/integrations/superpowers-claude-code/
merge-cross-project-memorial.sh`, to be added as the integration ships)
folds all per-project shards into the canonical cross-project file in
batch. Default cadence: weekly. The cross-project memorial is advisory
context for Architect/Reviewer reads, not load-bearing per-round state.

**Per-cluster fragment format.** CONFIRMATION/VIOLATION lines in the
same format as `MEMORIAL.md`. Each line tagged with cluster ID and
work unit ID so the Coordinator's merge is deterministic even if
fragment file timestamps drift.

### CLAUDE-*.md role/round stamping

In Mode 2, `run-pipeline.sh` stamps the project's role-stamp file with the
current role and round at session start. Under multi-track parallelism,
concurrent stamping by parallel sessions produces undefined state.

Arbitration:

- The pipeline dispatcher writes per-track stamped copies to
  `coordination/clusters/<cluster-id>/.role-stamp`. Each cluster session
  reads its own per-track copy as the role-anchored file. Per-track
  copies are ephemeral (`coordination/clusters/` should be `.gitignore`d)
  and regenerated at each session start.
- The canonical `CLAUDE-*.md` files (version-controlled) hold only the
  methodology body and accumulated reinforcements. The canonical files
  are never stamped.
- The Coordinator appends new reinforcements to the canonical files at
  wave gate under the same `flock(2)` lock that serializes memorial
  merges (`coordination/.MEMORIAL.lock` — one lock, both files).

### Schema migrations

Tessera does not have a schema-migration surface (no database; vendoring
substrate only). The migration arbitration sections of the anchor
canonical skill apply when a Tessera-derived project adds a migration
surface. Preserved here for canonical-PR backflow fidelity.

**Layer 1 — D5-strict: planning-time serialization.** When two work
units write to the same table / column / constraint, D5 records a
serial dependency edge and the Coordinator places them in different
waves. No runtime arbitration needed; the linear migration history
aligns naturally with the wave sequence. Zero runtime cost.

**Layer 2 — D5-contention: execution-time lock.** When two work units
both add migrations but against disjoint schema surfaces, D5 logs a
contention risk (in the D4 file-tree-overlap table) rather than a
dependency edge. Both clusters can dispatch in parallel. At
migration-generation time, each cluster takes `flock(2)` on
`<migration-dir>/.migration.lock` so the seconds-long file-creation
step (filename timestamp, migration SQL emission) is serialized.

### Arbitration primitives

**Locking.** All arbitration uses `flock(2)` advisory locks on lock
files inside the project working tree. Reliable on macOS and Linux
local filesystems. Not reliable on network-mounted file systems (NFS,
SMB, iCloud Drive, Dropbox synced folders). Multi-track Anchor requires
the project working tree on a local filesystem. Lock files are tagged
with the holding PID so stale locks can be cleared deterministically.

**Poll loop.** Lock acquisition uses a 5-second poll loop with a
per-resource timeout. Defaults: memorial / CLAUDE-*.md merge at wave gate
= 30 minutes; migration = 10 minutes.

**No daemon.** All arbitration is file-based. Crash recovery: stale-lock
detection runs at pipeline start (`run-pipeline.sh` pre-flight).

**Observability.** The Coordinator writes
`coordination/multi-track-status.json` at each lock acquire/release —
a one-shot snapshot (no append).

### When NOT to apply

These mechanisms exist for genuine multi-track execution. They are
overhead in Mode 2. Apply only when:

- Two or more cluster sessions may be active on the same project at the
  same wall-clock time
- The Coordinator has emitted a wave plan with ≥2 clusters in at least
  one wave
- The operator has explicitly enabled multi-track dispatch (the
  `--coordinator` mode flag on `run-pipeline.sh`)

If the project's wave plan has at most one cluster per wave, the
Coordinator dispatches sequentially and the arbitration mechanisms are
inert. The methodology degrades gracefully to single-pipeline behavior.

## Memorial accretion at the coordinator level

The Coordinator maintains its own memorial layer, separate from any
cluster's memorial state. Coordinator memorials capture patterns at the
DAG construction and wave planning level — not implementation-level
failures.

Memorialize when:
- A dependency edge that was classified HIGH confidence turned out to be
  wrong at wave gate (adjust D1/D2 test application)
- A Claude judgment call at Step 3 resolved differently than the wave
  gate evidence suggested (adjust escalation threshold)
- A work unit classified `solo` required a `full` cluster (adjust
  classification rubric)
- A wave gate failure pattern repeats across two or more projects
  (promote to coordinator-level discipline)

Track violations and confirmations per memorial. Same discipline as the
memorial accretion pattern in `CLAUDE-MEMORIAL.md` but applied to
coordinator-level failure patterns rather than implementation-level
ones.

## Coordinator artifacts

| Artifact | Location | Purpose |
|---|---|---|
| `WAVE-PLAN-NN.md` | `coordination/` | DAG + wave assignments + tier classifications; primary coordinator output. Fillable scaffold: `templates/WAVE-PLAN-TEMPLATE.md`. Version per revision (do not edit in place). |
| `WAVE-GATE-NN.md` | `coordination/` | Wave gate checklist results + failure dispositions per wave. Fillable scaffold: `templates/WAVE-GATE-TEMPLATE.md`. Version per wave (do not edit in place). |
| `CLUSTER-HANDOFF-NN-WU[A]-WU[B].md` | `coordination/` | Cross-cluster dependency contract for a directed edge. Fillable scaffold: `templates/CLUSTER-HANDOFF-TEMPLATE.md`. One file per edge — do not merge multiple edges. |
| `COORDINATOR-MEMORIAL.md` | `coordination/` | Coordinator-level failure-driven discipline accumulation. Fillable scaffold: `templates/COORDINATOR-MEMORIAL-TEMPLATE.md`. Append-only. |
| `clusters/<cluster-id>/MEMORIAL-fragment.md` | `coordination/` | Per-cluster memorial fragments, aggregated by Coordinator at wave gate |

## Relationship to existing TPM role

In Tessera, the intra-cluster TPM role is folded into `NEXT-ROLE.md`
state per Mode 2 automated pipeline — no separate TPM session per
cluster. The Coordinator operates at the program-level layer above all
clusters and does not replace the cluster-internal routing.

A Tessera project using the Coordinator has:

- One Coordinator session (cross-wave, cross-cluster)
- Per-cluster Architect/Implementer/Reviewer sessions in worktrees
  (dispatched via the multi-track scripts; see `scripts/anchor-wave-init.sh`,
  `scripts/multi-track-cluster-setup.sh`, `scripts/multi-track-verify-wave-merge.sh`)
- `NEXT-ROLE.md` state per cluster (in the cluster's worktree) handles
  intra-cluster routing autonomously

## Common pitfalls

- **Coordinator reaching inside clusters.** Once a cluster is
  dispatched, the Coordinator waits for the wave gate. Intervening in
  cluster-internal decisions breaks the accountability boundary.
- **Skipping the deterministic steps and going straight to Claude.**
  D1 and D2 catch the majority of real dependencies. Claude judgment
  at obvious boundaries is expensive and untraceable.
- **Wave plan as a living document during execution.** The wave plan
  is fixed at dispatch time. Changes surface at the wave gate and
  produce a new wave plan revision, not an in-flight edit.
- **Treating tier classification as the Coordinator's final word.**
  The cluster self-governs its own tier. The Coordinator's
  classification is a prior, not an instruction.
- **Wave gate as a formality.** The wave gate is the program's only
  cross-cluster quality check. A rubber-stamp wave gate creates false
  confidence that cross-cluster integration has been verified.
- **Treating the migration lock as a substitute for D5.** D5 catches
  migration ownership at planning time for zero runtime cost; the lock
  is a fallback when D5 misclassified the work unit.
- **Adding arbitration mechanisms to Mode 2 work.** Lock files,
  per-track CLAUDE.md copies, and fragment merging are pure overhead
  in single-pipeline mode. Apply only when ≥2 cluster sessions run
  concurrently.

## Cost

DAG construction: 30-60 minutes for a 10-20 work unit PRD, longer for
larger scope or higher ambiguity.

Wave gate execution: 15-30 minutes per wave, scaling with number of
clusters.

Coordinator memorial maintenance: 5-10 minutes per wave gate, triggered
by failure patterns.

Recovers cost at the first prevented merge conflict from incorrect
parallelization, or the first wave gate that catches a cross-cluster
spec contradiction before it propagates.

## Coordinator role boundary

Do not write implementation code. Do not draft cluster-level specs. Do
not modify any cluster's NEXT-ROLE.md or in-flight artifacts. All
cross-cluster coordination → Coordinator artifacts (`WAVE-PLAN-NN.md`,
`WAVE-GATE-NN.md`, `CLUSTER-HANDOFF-*.md`, `COORDINATOR-MEMORIAL.md`).

# ── COORDINATOR REINFORCEMENTS ────────────────────────────────────────────────
# Memorial Updater (or Coordinator at wave gate) appends Coordinator-specific
# reinforcement lines here when a coordinator-level violation surfaces. Do not
# delete; accumulated history is the compounding value.
#
# Example:
# # REINFORCED 2026-MM-DD — Coordinator must verify CLUSTER-HANDOFF artifact
# #   filenames match the WU pairing they describe (filename-vs-content drift
# #   surfaced at Wave 2 gate; D1 edge was correctly identified but the handoff
# #   artifact was named after a different WU pair).
