# Q-R58-SPEC-AUDIT — Architect ceremony sidecar

**Round:** R58 (full tier).
**Companion to:** `coordination/specs/Q-R58-SPEC.md`.
**Author:** Architect at session SHA `7e9d399` (round-start HEAD).
**Purpose:** P3 ten-axis verification, pre-route discipline application, Architect pre-prediction, decision rationale, honest-broker disclosures. Reviewer reads both this audit + the spec proper. Implementer reads only the spec proper.

---

## § 1 Audit-trail provenance

### § 1.1 Inputs read at session entry

- `coordination/PRD.md` (full)
- `~/.claude/CROSS-PROJECT-MEMORIAL.md` (relevant Reinforcement rules + Rule 7 canonical text at line 3478)
- `coordination/MEMORIAL.md` (active R42-R56 entries, in full)
- `coordination/MEMORIAL-PHASE-1.md` + `MEMORIAL-PHASE-2.md` (NOT read; no cross-phase back-reference required for R58)
- `coordination/NEXT-ROLE.md` (R58 round-scope directive; full)
- `coordination/WAVE-PLAN-07.md` (Wave 8 section; Step 1 WU-Phase3-2B row; Step 3 Judgment call 1)
- `coordination/CLUSTER-HANDOFF-WAVE07-2A-2B.md` (full; TPU adapter contract)
- `coordination/SPEC-AUTHORING-CHECKLIST.md` (Rule 7 Surface (a) requirements; Tightenings 1-4)
- `coordination/specs/Q-R56-SPEC.md` (§ 0 + § 5 + § 9-10 patterns; reference precedent)
- `coordination/specs/Q-R56-EMPIRICAL.sh` (full; verifier shape precedent)
- `engine/topology-overlay.ts` (full; vendored-at-pin verification + `FetchContext` declaration site)
- `engine/topology/slurm-source.ts` (full)
- `engine/topology/k8s-source.ts` (partial — lines 1-80 covering interface conformance surface)
- `engine/topology/nvlink-source.ts` (partial — lines 1-80 + 120-160 covering class signature)
- `engine/topology/neuron-source.ts` (partial — lines 1-80 + 140-180 covering class signature)
- `engine/topology/tpu-source.ts` (partial — lines 170-210 covering class signature; class fetchSnapshot at :201-203)
- `engine/types/verdict.ts` (grep for TopologyNodeKind + TopologyEdgeRelationship; lines 254 + 264 verified)
- `test/q56-tpu-adapter.test.ts` (test file pattern precedent; AC-R56-12 + AC-R56-15 shape)

### § 1.2 Inputs explicitly NOT read

- `coordination/diagnostics/` (cold-eye boundary; only opens at HALT/escalate)
- `coordination/logs/`
- `.prompt-*.md` files
- prior `REVIEWER-REPORT-R*.md` files (cold-eye boundary)
- `MEMORIAL-PHASE-1.md` + `MEMORIAL-PHASE-2.md` shards (no cross-phase back-reference needed)

### § 1.3 Session-entry binding-command runs

| Command | Output | SHA |
|---|---|---|
| `git rev-parse HEAD` | `7e9d399d566c78f2da6210cbf5e2157c667c2b45` | (this is the SHA) |
| `node --test --test-reporter=tap test/*.test.js \| grep -E '^# '` | `tests=387 / pass=382 / fail=2 / skipped=3` | 7e9d399 |
| `npx tsc -p tsconfig.test.json; echo $?` | `0` | 7e9d399 |
| `ls test/_substrate/ \| grep sparse` | 5 sparse fixtures present (slurm/k8s/nvlink/neuron/tpu) | 7e9d399 |
| `grep TopologyEdgeRelationship engine/types/verdict.ts -n` | line 264 (7 union members; tpu_ici_peer present per R56 close) | 7e9d399 |
| `grep TopologyNodeKind engine/types/verdict.ts -n` | line 254 (11 union members; tpu_shard present per R56 close — actual count includes Phase 1 base + Phase 2/3 additions) | 7e9d399 |

### § 1.4 Architect pre-prediction table

| Property | Prediction at chore-A | Confidence | Reasoning |
|---|---|---|---|
| `npx tsc -p tsconfig.test.json` exit code | 0 | HIGH | TS bivariance allows method-parameter widening at impl site; baseline tsc clean at session entry; new file `engine/topology/fetch-context.ts` adds one type-only export; per-adapter changes are signature-widening only. |
| `node --test` summary at chore-A pre-AC-R58-14-SHA-injection | `399/393/3/3` | HIGH | 387 baseline + 12 new R58 runtime tests = 399. 3 fails = R36-30 + R36-31 (carry-forward) + AC-R58-14 placeholder. |
| `node --test` summary at chore-B post-AC-R58-14-SHA-injection | `399/394/2/3` | HIGH | AC-R58-14 transitions FAIL → PASS after SHA injection. |
| `git diff 7e9d399..<chore-A> --name-only` path count | 12 | HIGH | ALLOWED_SET enumerated upfront; no fixtures added; no schema mods. |
| AC-R58-7 throw path fires across all 5 adapters | PASS | HIGH | Prescribed verbatim in pseudocode; vendor literal per adapter. |
| AC-R58-9 sparse-data resilience PASSes across all 5 adapters | PASS | HIGH | Existing sparse fixtures already validated by R28/R29/R30/R53/R56 tests; AC-R58-9 re-exercises through the new `fetchSnapshot(ctx?)` widened signature. |
| AC-R58-11 `correlational_not_causal: true` literal present | PASS | HIGH | R56-frozen `engine/types/verdict.ts` carries the literal at :298 (declaration) + :281 (JSDoc); R58 anti-scope forbids modification. |

---

## § 2 P3 ten-axis verification (one sentence per axis; companion to spec § 9)

| Axis | Verification |
|---|---|
| Correctness | TS bivariance + method-parameter widening verified against TS handbook + existing 5 adapters' `_ctx?: FetchContext` signature; throw semantics testable by AC-R58-7 exact-equality. |
| Completeness | 14 ACs cover: type existence (AC-R58-1); per-adapter no-arg fallback (AC-R58-2-6); Path B throw (AC-R58-7); Path B soft-fields fallback (AC-R58-8); sparse-data resilience (AC-R58-9); cross-adapter snapshotHash delegation (AC-R58-10); A16 (AC-R58-11); typecheck (AC-R58-12); test-count (AC-R58-13 two-state); anti-scope diff (AC-R58-14). No load-bearing property unbound. |
| Consistency | Cross-section table § 10.3 in spec verifies 9 tokens × 7 sites all consistent. |
| Clarity | Per-file line-resolution pseudocode + uniform error-message format + sorted-alphabetical ALLOWED_SET. |
| Coverage | § 5.5 branch-binding coverage table enumerates every guard / fallback / branch with its binding AC; no structurally-unreachable code prescribed. |
| Constraints | A12 honored; CLUSTER-HANDOFF anti-scope honored; NEXT-ROLE.md anti-scope honored; PRD Phase 3 anti-scope honored; vendor-neutral interface preserved. |
| Concurrency | Single-cluster wave; no parallel dispatch; `fetchSnapshot` is `async` but no shared mutable state. |
| Corner cases | ctx-undefined + ctx-with-soft-fields + ctx-with-apiEndpoint + sparse-fixtures + chore-A two-state mismatch (per R53 MINOR-1) all covered. |
| Cost | ~1750 LOC total (most in test file + coordination artifacts); ~10 LOC delta per adapter file. Single-cluster full-tier execution at standard time budget. |
| Coupling | One new import in 5 adapters (`TopologyFetchContext`); one new type-only file; zero schema modifications; vendored-at-pin file untouched. |

---

## § 3 Pre-route discipline application log (per cross-project rules + REINFORCEMENTS)

### § 3.1 Rule 1 sub-class `empirical-command-attestation` (R46 canonical landing)

- Session-entry baseline values come from FRESH command runs (§ 1.3 table), NOT memorized from R56 attestation.
- Test count predictions encoded with explicit two-state distinction (chore-A vs chore-B) per R53 MINOR-1.
- Q-R58-EMPIRICAL.sh applies R47 Tightenings 1-4: no vacuous meta-ACs; runtime command checks (not source-greps where structurally inappropriate); SHA values re-derived from git; exact counts where structurally fixed.

### § 3.2 R02 type-declaration-site check

- `FetchContext` declaration verified at `engine/topology-overlay.ts:57-60` via Read.
- `TopologySource` interface declaration verified at `engine/topology-overlay.ts:50-55`.
- `TopologyNodeKind` union at `engine/types/verdict.ts:254` verified via grep.
- `TopologyEdgeRelationship` union at `engine/types/verdict.ts:264` verified via grep.

### § 3.3 R11 / R47 MINOR-5 / R49 MINOR-5 line-citation cite-then-verify

Every line-number citation in the spec verified by direct Read or grep at session entry:

| Citation | Verified at |
|---|---|
| `engine/topology-overlay.ts:50-55` (interface) | Read at session entry |
| `engine/topology-overlay.ts:57-60` (FetchContext) | Read at session entry |
| `engine/topology-overlay.ts:1-5` (vendored-at-pin header) | Read at session entry |
| `engine/topology-overlay.ts:69-78` (computeSnapshotHash) | Read at session entry |
| `engine/topology-overlay.ts:262-267` (BFS adjacency) | Read at session entry |
| `engine/topology-overlay.ts:111-160` (OtelServiceGraphV1) | Read at session entry |
| `engine/topology-overlay.ts:217-228` (enrichment_error path) | Read at session entry |
| `engine/topology/slurm-source.ts:21-25` (import block) | Read at session entry |
| `engine/topology/slurm-source.ts:58-60` (fetchSnapshot) | Read at session entry |
| `engine/topology/k8s-source.ts:26-30` (import block) | Read at session entry |
| `engine/topology/k8s-source.ts:68-70` (fetchSnapshot) | Read at session entry |
| `engine/topology/nvlink-source.ts:24-28` (import block) | Read at session entry |
| `engine/topology/nvlink-source.ts:140-142` (fetchSnapshot) | Grep `async fetchSnapshot` at session entry |
| `engine/topology/neuron-source.ts:25-29` (import block) | Read at session entry |
| `engine/topology/neuron-source.ts:166-168` (fetchSnapshot) | Read at session entry |
| `engine/topology/tpu-source.ts:32` (FetchContext import) | Grep `FetchContext\|class TpuTopologySource` at session entry |
| `engine/topology/tpu-source.ts:201-203` (fetchSnapshot) | Read at session entry |
| `engine/types/verdict.ts:254` (TopologyNodeKind) | Grep at session entry |
| `engine/types/verdict.ts:264` (TopologyEdgeRelationship) | Grep at session entry |
| `engine/types/verdict.ts:281` (JSDoc `correlational_not_causal: true`) | Inherited from R56 spec audit § 3 (R56-frozen) |
| `engine/types/verdict.ts:298` (declaration `correlational_not_causal: true`) | Inherited from R56 spec audit § 3 (R56-frozen) |

**Forward-flag per R53 MINOR-3:** spec is time-pinned at SHA `7e9d399`. If the Implementer adds header docblock to any of the 5 MOD adapter files (R53 pattern), the cited `fetchSnapshot` lines may shift downward by ~10 lines. Spec citations are correct at this SHA; downstream readers resolving citations should consult `git show 7e9d399:<file>`.

### § 3.4 R23 ARCH MINOR-2 `.gitignore`-aware spec inventories

All 12 ALLOWED_SET base paths verified git-trackable at session entry (no `.gitignore` exclusion blocks any path). See spec § 3.3.

### § 3.5 R20 ARCH MINOR-1 AC-table preamble cross-check

Executed in spec § 5.3: § 5.1 preamble's classification of AC-R58-12/13 (binding-command) vs AC-R58-14 (runtime) cross-checked against § 4.7 test pseudocode. Classification matches structural prescription.

### § 3.6 R21 ARCH MINOR-2/3 branch-binding coverage

Spec § 5.5 enumerates every guard / fallback / branch with its binding AC. No structurally-unreachable code.

### § 3.7 R25 MAJOR-2 + R56 MINOR-1 spec-internal-contradiction sweep

- AC-R25-14 reinforcement (count predictions distinguish chore-A vs chore-B SHA): spec § 5.4 + § 6.1 carve-out applied.
- R56 MINOR-1 halt-trigger carve-out: spec § 6.1 halt condition #1 explicitly excludes the pre-documented AC-R58-13 two-state mismatch from halt trigger.
- R25 MAJOR-3 reinforcement (spec amendment after operator ESCALATE disposition): N/A — no operator ESCALATE this round.

### § 3.8 R34 MINOR-2 algorithmic boundary clauses cross-check

Boundary clauses in spec: "ctx?.apiEndpoint !== undefined" (strict equality on undefined; only undefined falls through; null/empty-string would trigger throw — verified by reading the pseudocode literally). No conflicting boundary conventions across sections.

### § 3.9 R34 MINOR-3 regex / JS-syntax validity

No regex literals in spec pseudocode. AC-R58-7 uses exact `===` equality on error message string.

### § 3.10 R44 MINOR-3 empirical-AC threshold binding tightness

- AC-R58-7 uses exact `===` equality (tightest possible binding for error message check).
- AC-R58-1 type-existence check is structural (type import + literal assignment); cannot be incidentally satisfied.
- AC-R58-11 substring-presence: intentionally less discriminating; disclosed in spec § 5.6 + D-3 below.
- AC-R58-9/10 parametrized across 5 adapters; each adapter must satisfy the property (cross-adapter consistency).

### § 3.11 R46 MINOR-1+2 + R51 MINOR-1 substring-marker uniqueness

- AC-R58-7 error message contains `LIVE_FETCH_NOT_IMPLEMENTED_PATH_B: <vendor>` — unique discriminating string per adapter; cannot be incidentally satisfied.
- AC-R58-11 substring `correlational_not_causal: true` — disclosed as 2-site (line 281 JSDoc + line 298 declaration); R51 MINOR-1 + R56 MINOR-2 precedent.

### § 3.12 R30 MINOR-1 discriminability completeness check

Section-scoped `awk` not needed (no per-section grep ACs). All counts use `assert_eq` with structurally-fixed values per Q-R58-EMPIRICAL.sh.

---

## § 4 ALLOWED_SET git-trackability verification

| Path | git-trackable? | Evidence |
|---|---|---|
| `coordination/MEMORIAL.md` | Yes | `git ls-files coordination/MEMORIAL.md` returns the path |
| `coordination/NEXT-ROLE.md` | Yes | tracked |
| `coordination/specs/Q-R58-EMPIRICAL.sh` | Will be | parent `coordination/specs/` tracked (Q-R56-EMPIRICAL.sh present) |
| `coordination/specs/Q-R58-SPEC-AUDIT.md` | Will be | same parent |
| `coordination/specs/Q-R58-SPEC.md` | Will be | same parent |
| `engine/topology/fetch-context.ts` | Will be | parent `engine/topology/` tracked (5 adapters present) |
| `engine/topology/k8s-source.ts` | Yes | tracked |
| `engine/topology/neuron-source.ts` | Yes | tracked |
| `engine/topology/nvlink-source.ts` | Yes | tracked |
| `engine/topology/slurm-source.ts` | Yes | tracked |
| `engine/topology/tpu-source.ts` | Yes | tracked |
| `test/q58-live-fetch-interface.test.ts` | Will be | parent `test/` tracked (q56-tpu-adapter.test.ts present) |

No `.gitignore` exclusion blocks any path. R23 ARCH MINOR-2 honored.

---

## § 5 Honest-broker disclosures

### D-1 Operator-directive divergence on `engine/topology-overlay.ts`

NEXT-ROLE.md line 22-26 + line 67 ALLOWED_SET names `engine/topology-overlay.ts (MOD - ...)`. Spec § 0.1 Approach A diverges: NEW Tessera-original file `engine/topology/fetch-context.ts` instead of MOD to topology-overlay.ts. Rationale documented in spec § 0.1 + § 8 OQ-R58-1. Architect recommendation: Approach A (PICKED) honors A12 inviolate + WAVE-PLAN-07 line 73 frame-AC (a) "design pattern adapters CAN use without modifying interface" + matches established Tessera convention for vendored-at-pin preservation. The operator-directive language ("or wherever the interface is declared") admits both approaches; Approach A is the architecturally cleaner branch. If the operator overrides to Approach B, the Implementer would need a single spec-amendment to swap the `engine/topology/fetch-context.ts` entries to `engine/topology-overlay.ts` modifications + adjust ALLOWED_SET to include `coordination/VENDORING-MANIFEST.md` (for the vendored-with-deltas transition row note refresh).

### D-2 TACTICAL AUTONOMY clause: `FetchContext` import removal

Each MOD adapter file currently imports `type FetchContext` from `../topology-overlay`. After the signature widening to `ctx?: TopologyFetchContext`, the `FetchContext` import is unused (the inherited `TopologySource` interface still references it but the import is consumed by the type-system at typecheck time, not by the adapter's local module scope). A future strict-lint config (TS6133 / `noUnusedLocals: true`) would surface this as a warning. The Implementer MAY remove `type FetchContext,` from each MOD adapter's import block as a tactical fix; this is NOT prescribed by the spec but is permitted under the TACTICAL AUTONOMY clause. Disclosure: not load-bearing for any R58 AC; documented for Reviewer awareness.

### D-3 AC-R58-11 substring non-discrimination

AC-R58-11 binds the presence of literal `'correlational_not_causal: true'` in `engine/types/verdict.ts` via `text.includes(...)`. The literal appears at 2 sites (`:281` JSDoc + `:298` type-body declaration) per R56 spec audit § 6 disclosure 6 + R56 MINOR-2 Reviewer report. A future regression removing only the `:298` declaration while leaving the `:281` JSDoc intact would still PASS AC-R58-11. Mitigation: TypeScript compile would catch the type-body removal (because the `'correlational_not_causal: true'` is a type literal in the field declaration — removing it would change the union shape). Same disposition precedent as R30/R53/R56 — explicitly accepted as non-discriminating for the wire-format invariant ("literal must appear", not "literal must appear at specific line"). R51 MINOR-1 substring-marker uniqueness rule acknowledged and disclosed; A16 spec wording is structural-presence only.

### D-4 AC-R58-9 sparse-data resilience scope

The spec re-exercises EXISTING sparse fixtures (`slurm-fixture-sparse.conf` + `k8s-nodelist-fixture-sparse-no-gpu.json` + `nvlink-fixture-sparse.txt` + `neuron-fixture-sparse.json` + `tpu-fixture-sparse-subcube.json`) through the new widened `fetchSnapshot(ctx?: TopologyFetchContext)` signature. The fixtures themselves were validated by R28/R29/R30/R53/R56 cluster-internal tests; R58 does NOT validate new sparse semantics — it validates that the widened signature does not break existing sparse-data handling. If the Reviewer interprets "sparse-data resilience tests" (NEXT-ROLE.md line 31) as requiring new fixtures or new sparse semantics, the Architect's PICKED scope diverges; disclosed transparently here.

### D-5 Test count baseline assumption

§ 1.4 prediction `387 + 12 = 399` assumes no concurrent test additions between the round-start SHA `7e9d399` and chore-A. If the Implementer's chore-A baseline shifts (e.g., due to an intervening commit), the AC-R58-13 prediction must update; per Rule 1 sub-class `empirical-command-attestation`, the Implementer encodes the actual observed value and amends the spec if it deviates beyond R58's own additions.

### D-6 Single-file decomposition for `TopologyFetchContext`

The interface lives in one file `engine/topology/fetch-context.ts` (~25 LOC). A future extension might add per-vendor context shapes (e.g., `SlurmFetchContext extends TopologyFetchContext` with Slurm-specific endpoint metadata). Spec does NOT prescribe such per-vendor extensions for R58 (Path B); SLICE 2C / SLICE 3 work would add them. Disclosure: forward-flag for future-round consideration.

---

## § 6 Amendments from prior version

This is v1 of Q-R58-SPEC. No prior version; no amendments.

---

## § 7 Pipeline + dispatch

```bash
cd /Users/johnwarren/concord/tessera
./run-pipeline.sh --round R58 --tier full
```

Standard single-cluster full-tier dispatch from main worktree. NOT `--coordinator`; NOT `multi-track-cluster-setup.sh`.
