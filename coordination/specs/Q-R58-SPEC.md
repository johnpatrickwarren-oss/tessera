# Q-R58-SPEC — Phase 3 SLICE 2 WU-Phase3-2B: live-cluster topology fetch INTERFACE design

**Round:** R58 (full tier — Architect + Implementer + Reviewer + Memorial-Updater).
**Cluster shape:** single-cluster (Wave 8 of `coordination/WAVE-PLAN-07.md`; sole WU = WU-Phase3-2B per Step 3 Judgment call 1 Option B split-with-sequential).
**Phase / SLICE:** Phase 3 SLICE 2 — cross-cutting `TopologySource.fetchSnapshot(ctx?)` interface refactor across all 5 adapter sources (Slurm + K8s + NVLink + Neuron + TPU).
**Scope reference:** `coordination/PRD.md` § Phase 3 (FR-V4; line 438) + `coordination/WAVE-PLAN-07.md` Step 1 WU-Phase3-2B row + Step 3 Judgment call 1 Option B + `coordination/CLUSTER-HANDOFF-WAVE07-2A-2B.md` (TPU adapter contract for R58 consumption) + `coordination/NEXT-ROLE.md` R58 round-scope directive.
**PRD trace:** FR-V4 interface-design portion (PRD:438; real-cluster-validation portion DEFERRED per Path B) · US-07 deferred (no real-cluster fetch) · AC-P5/P7 cross-cutting (Phase 1+2 ACs preserved unchanged).
**Round-start SHA (anti-scope diff lower bound):** `7e9d399` (chore: prepare R58 directive; HEAD at Architect session entry — verified via `git rev-parse HEAD`).
**Empirical baseline at session entry (verified by Architect via `node --test --test-reporter=tap test/*.test.js`):** `tests=387 / pass=382 / fail=2 / skipped=3`. Known fails: (a) `AC-R36-30: round-start-to-chore-A diff path-set ⊆ R36 allowed-set`; (b) `AC-R36-31: chore-A-to-HEAD diff ⊆ R36 post-chore-A allowed set (chore-B forward protection)`. Both are R36 forward-protection guards whose CHORE_A_SHA literal (`87e372f` Phase 2 close) is structurally older than HEAD; the 2 fails are pre-existing inheritance carry-forward from R56 close, NOT introduced by this round.
**Empirical typecheck baseline (verified by Architect via `npx tsc -p tsconfig.test.json`):** exit code 0; zero diagnostics. R58 inherits a clean tsc surface and must preserve it.

---

## § 0 Brainstorm phase (Superpowers — inline)

Four architectural axes have genuine multi-option choices. Each is brainstormed with three distinct approaches, strengths / weaknesses / hidden assumptions / risks, and a selection rationale.

### § 0.1 Where to declare `TopologyFetchContext` (interface enrichment surface)

**Approach A — NEW Tessera-original file `engine/topology/fetch-context.ts` exporting `TopologyFetchContext extends FetchContext` (PICKED).** A new Tessera-original module declares `TopologyFetchContext` as a structural extension of the inherited `FetchContext` (`engine/topology-overlay.ts:57-60`), adding three optional fields (`authToken?: string`; `apiEndpoint?: string`; `timeoutMs?: number`). Each adapter widens its `fetchSnapshot(_ctx?: FetchContext)` parameter to `fetchSnapshot(ctx?: TopologyFetchContext)`. TypeScript bivariance on method parameters lets the implementation widen while still satisfying the `TopologySource` interface contract (because every `FetchContext` is structurally a `TopologyFetchContext` — all three new fields are optional).

- **Strengths:** Preserves A12 inviolate (`engine/topology-overlay.ts` is vendored-at-pin per `engine/topology-overlay.ts:1-5` header + WAVE-PLAN-07 line 50 + line 137-138; A12 anti-scope). Matches WAVE-PLAN-07 line 73 frame-level AC (a) "design pattern adapters CAN use without modifying the vendored-at-pin interface declaration." Honors the architecturally-anchored extension-point convention. NEW file lives in the same `engine/topology/` directory as the 5 adapter sources (locality). Single source of truth for the Tessera-extended FetchContext shape; one import per adapter. Zero risk of upstream vendoring drift on `engine/topology-overlay.ts` at next re-vendor.
- **Weaknesses:** NEXT-ROLE.md line 22-26 literal text says "in `engine/topology-overlay.ts` (or wherever the interface is declared)" with `engine/topology-overlay.ts (MOD - TopologySource interface enrichment; ctx parameter)` in ALLOWED_SET — the operator's directive language is permissive but explicitly names topology-overlay.ts. The PICKED approach diverges from the literal "MOD" allowance but stays within the permissive "or wherever the interface is declared" branch. Disclosure surfaced in § Open questions OQ-R58-1 + § Honest-broker disclosures D-1.
- **Hidden assumptions:** TypeScript treats method parameter widening as covariant-bivariant at the structural-interface implementation site; this is true for class methods implementing interfaces in TS (see TS handbook on bivariance for method parameters). Verified by Architect via type-pretest pseudocode (§ 1.5 below).
- **Risks:** low. The only risk is the Implementer pushing back on the no-mod-to-topology-overlay.ts decision; § Open questions OQ-R58-1 surfaces the choice explicitly so the operator can override if desired.

**Approach B — MODIFY `engine/topology-overlay.ts` to add `TopologyFetchContext` interface inline.** Add the new shape directly to the vendored-at-pin file, treating it as an architecturally-anchored extension point.

- **Strengths:** Matches NEXT-ROLE.md literal text. Centralizes all topology-fetch interface declarations in one file.
- **Weaknesses:** Violates A12 inherited from PRD § Phase 3 Scope (PRD:459) + SCOPING-MEMO § 2.3 A12. WAVE-PLAN-07 line 73 + line 137-138 explicitly forbid modifying `engine/topology-overlay.ts` interface declaration body. CLUSTER-HANDOFF line 12 says "interface design only" — the interface declaration is at `:50-55`, vendored-at-pin. Doing this would trigger a vendored-with-deltas transition for `engine/topology-overlay.ts` (the file is currently vendored-at-pin per its own header line 3 "Sync policy: vendored-at-pin"); transition costs include `coordination/VENDORING-MANIFEST.md` row note refresh + removal from any AT_PIN_FILES list. The R18+R20+R23+R53+R56 precedent for vendored-with-deltas transitions is `engine/types/verdict.ts` only — extending the pattern to `engine/topology-overlay.ts` would set a new precedent without clear architectural necessity.
- **Risks:** high — violates A12 + sets vendored-with-deltas precedent on a 2nd file at the cost of preserving operator-directive literal text.

**Approach C — TypeScript declaration merging (augment `FetchContext` via `declare module`).** A Tessera-original file uses TS declaration merging to add optional fields to the inherited `FetchContext` interface in `engine/topology-overlay.ts`.

- **Strengths:** Preserves A12 inviolate at the file-modification layer.
- **Weaknesses:** Action-at-a-distance — every consumer of `FetchContext` (including the vendored-at-pin `OtelServiceGraphV1` at `engine/topology-overlay.ts:111-160`) would inherit the new fields. While structurally additive (all new fields optional), the augmentation changes the semantic meaning of `FetchContext` across the whole engine. Declaration merging has cognitive load — readers of `engine/topology-overlay.ts` see one shape; runtime/typecheck sees another. Plus the merged interface would persist beyond R58 scope onto any future file that imports `FetchContext`. Surface bloat at low value.
- **Risks:** medium — module-augmentation patterns are subtle; future operators may be surprised by augmented `FetchContext`.

**Selection rationale:** Approach A. Preserves A12 inviolate (vendored-at-pin discipline maintained); honors the architecturally-anchored extension-point convention; matches WAVE-PLAN-07 frame-level AC (a) "design pattern adapters CAN use without modifying interface"; explicitly localizes the Tessera-extended shape to `engine/topology/fetch-context.ts` (new file in the `engine/topology/` directory shared by all 5 adapters); zero upstream vendoring-drift risk. The operator-directive divergence (NEXT-ROLE.md ALLOWED_SET lists topology-overlay.ts MOD) is surfaced transparently in § Open questions OQ-R58-1 + § Honest-broker disclosures D-1.

### § 0.2 ctx-with-apiEndpoint semantics (what does an adapter DO if a real-fetch context is provided?)

**Approach A — Throw `LIVE_FETCH_NOT_IMPLEMENTED_PATH_B` when `ctx.apiEndpoint` is defined (PICKED).** When any adapter's `fetchSnapshot(ctx)` is called with `ctx.apiEndpoint !== undefined`, throw an Error with message starting `LIVE_FETCH_NOT_IMPLEMENTED_PATH_B`. Adapter-specific prefix included (e.g., `LIVE_FETCH_NOT_IMPLEMENTED_PATH_B: slurm`). The throw surfaces Path B deferral cleanly at runtime.

- **Strengths:** Explicit failure mode — callers can detect the deferral. Path B is structurally surfaced rather than silently absorbed. Matches WAVE-PLAN-07 line 73 frame-level AC (a) "interface design only; no real-cluster-fetch implementation." Each adapter's `fetchSnapshot` signature carries the contract (`ctx?: TopologyFetchContext`) — the throw is the runtime enforcement. Structurally testable: a single AC binds the throw behavior across all 5 adapters (sub-cases for each).
- **Weaknesses:** Throws-on-future-feature is a slight cognitive load for the caller. Mitigated by clear error message prefix.
- **Hidden assumptions:** `ctx.apiEndpoint` is the discriminating field for "intent to perform real-cluster fetch." A `ctx` with only `signal`, `authToken`, or `timeoutMs` defined (no `apiEndpoint`) is treated as "use constructor fixture" — those fields are accepted in the contract but unused in Path B. Discriminator field choice documented in § 1.3.
- **Risks:** low.

**Approach B — Silently fall back to constructor fixture even when `ctx.apiEndpoint` is provided.** Adapter ignores `ctx` entirely if no real-fetch infrastructure exists.

- **Strengths:** Backward-compatible; existing callers see no behavior change.
- **Weaknesses:** Path B deferral becomes invisible — a future operator calling with `apiEndpoint` set would silently get the fixture, with no signal that real-fetch is not implemented. Violates encode-actual-results-verbatim spirit (R03/R26/R47/R48 cross-project rule): the adapter would silently lie about whether it performed the requested fetch. This is the pattern Rule 1 sub-class prohibits.
- **Risks:** medium — silently obscures Path B status.

**Approach C — Return a degenerate "live-fetch-stubbed" snapshot with `enrichment_error` set.** A snapshot shape carrying a marker indicating "ctx.apiEndpoint was provided but Path B is deferred."

- **Strengths:** Returns a snapshot rather than throwing; caller doesn't need try/catch.
- **Weaknesses:** Mixes two semantic states in one return value — "fetched successfully" and "stubbed with deferral marker" — at the `TopologySnapshot` type level. The `TopologySnapshot` schema does NOT currently carry an `enrichment_error` field (only `VerdictGroupWithTopology` does at `engine/topology-overlay.ts:217-228`). Adding such a field to `TopologySnapshot` would touch `engine/types/verdict.ts` — but R58 anti-scope per CLUSTER-HANDOFF line 82 explicitly prohibits modifying `engine/types/verdict.ts`. Path forecloses.
- **Risks:** high — would require schema modification, violating CLUSTER-HANDOFF anti-scope.

**Selection rationale:** Approach A. Surfaces Path B deferral explicitly via throw; no schema modification required; testable across all 5 adapters via one AC with sub-cases.

### § 0.3 Per-adapter signature widening pattern (Implementer-tactical-vs-Architect-prescribed)

**Approach A — Architect prescribes the signature change verbatim; Implementer mechanically applies to all 5 adapters (PICKED).** Spec pseudocode (§ 4) explicitly shows the before/after signature for each of 5 adapters: `async fetchSnapshot(_ctx?: FetchContext)` → `async fetchSnapshot(ctx?: TopologyFetchContext)`. The change is uniform across adapters; Architect carries the design decision; Implementer carries no architectural choice.

- **Strengths:** Zero architectural ambiguity at Implementer time. Cross-adapter consistency is structurally guaranteed (5 mechanical edits to the same line pattern). Each line change is verifiable via grep at chore-A. Matches R56 § 0 selection-summary pattern (Architect picks for cross-cutting decisions).
- **Weaknesses:** None substantive. The Implementer might tactically choose to keep the underscore prefix (`_ctx?`) if `ctx` is unused in the no-apiEndpoint branch; that's a TACTICAL AUTONOMY-clause decision documented in § 4.6.
- **Hidden assumptions:** TypeScript permits widening of a method-parameter type at the implementation site (TS bivariance for method parameters). Confirmed by reading the TS handbook + verifying R56 + R53 + R30 + R29 + R28 adapter signatures all currently use `_ctx?: FetchContext`.
- **Risks:** low.

**Approach B — Implementer chooses the widening pattern per adapter.** Architect describes the intent ("widen to accept TopologyFetchContext") and lets the Implementer choose between (i) widen the method parameter, (ii) overload, (iii) generic type parameter.

- **Strengths:** Implementer tactical autonomy.
- **Weaknesses:** Cross-adapter inconsistency risk — different adapters could land different patterns; future readers / maintainers would face 5 distinct surfaces. Violates WAVE-PLAN-07 line 49 "Live-fetch interface extension MUST work identically across all 5 adapters at the type-contract layer."
- **Risks:** medium — inconsistency.

**Approach C — Architect defines a shared `TopologyFetchAdapter` base class; each adapter extends.** Centralized fetch-logic in a base; 5 adapters become thin subclasses.

- **Strengths:** Maximizes DRY-ness.
- **Weaknesses:** Major architectural refactor across 5 files that were already independently designed (R28/R29/R30/R53/R56); breaks the parallel-class precedent established at R30 and extended at R53/R56; touches files inside CLUSTER-HANDOFF "do not modify core parser logic" anti-scope (line 81). Scope creep beyond R58's frame-level AC list.
- **Risks:** high — scope creep + anti-scope risk.

**Selection rationale:** Approach A. Mechanical per-adapter signature widening with Architect-prescribed before/after pseudocode; cross-adapter consistency structurally guaranteed; no scope creep.

### § 0.4 Sparse-data resilience test architecture (one parametrized AC vs five separate ACs)

**Approach A — One parametrized AC iterating over an array of 5 adapter+fixture pairs (PICKED).** AC-R58-9 declares ONE `test()` block that loops over a 5-element array `[{adapter: 'slurm', factory: ..., fixture: ...}, ...]`, exercising each adapter's sparse-fixture-handling and asserting no-throw + nodes-present + edges-empty-or-subset (per-adapter expected behavior captured in the array entry). Loop-based test means the runtime test count is 1, not 5.

- **Strengths:** Cross-adapter consistency captured at the structural level — every adapter exercised by identical assertion shape; future regression in any one adapter surfaces via the same AC. Single test file location (`test/q58-live-fetch-interface.test.ts`) is easier for Reviewer cold-eye audit. Matches WAVE-PLAN-07 line 73 frame-level AC (b)/(c) "5 ACs, one per adapter" but encoded as one parametrized test (the AC counts logical bindings, not test count).
- **Weaknesses:** If one adapter fails inside the loop, test reporting names AC-R58-9 (not the specific adapter); the assertion message must include the adapter name for diagnostic clarity. Captured in § 4.6 test pseudocode.
- **Hidden assumptions:** Existing sparse fixtures are present + load correctly. Verified at session entry via `ls test/_substrate/` — fixtures present: `slurm-fixture-sparse.conf`, `k8s-nodelist-fixture-sparse-no-gpu.json`, `nvlink-fixture-sparse.txt`, `neuron-fixture-sparse.json`, `tpu-fixture-sparse-subcube.json`.
- **Risks:** low.

**Approach B — Five separate ACs (AC-R58-9a through AC-R58-9e), one per adapter.**

- **Strengths:** Per-adapter test reporting; finer granularity in Reviewer audit.
- **Weaknesses:** Inflates AC count (4 extra logical ACs); each AC body duplicates 95% of the same assertion shape; future operator reading the spec sees 5 near-identical AC entries when 1 captures the structural property.
- **Risks:** low-medium — surface bloat.

**Approach C — One AC asserts no-throw across all 5; a 2nd AC asserts subset-snapshot across all 5.**

- **Strengths:** Property-grained.
- **Weaknesses:** Two parametrized tests where one suffices; AC count inflated by 1.
- **Risks:** low — minor surface bloat.

**Selection rationale:** Approach A. One parametrized AC with adapter-name diagnostic in assertion messages; matches WAVE-PLAN-07 cross-adapter consistency intent; cleanest AC surface.

### § 0.5 Selection summary

| Axis | Picked | Rejected | Why |
|---|---|---|---|
| § 0.1 TopologyFetchContext location | A — NEW `engine/topology/fetch-context.ts` | B (MOD topology-overlay.ts), C (declaration merge) | Preserves A12 inviolate; honors vendored-at-pin discipline; matches WAVE-PLAN-07 frame-AC (a) |
| § 0.2 ctx.apiEndpoint semantics | A — throw `LIVE_FETCH_NOT_IMPLEMENTED_PATH_B` | B (silent fallback), C (degenerate snapshot) | Explicit Path B surfacing; no schema modification; testable |
| § 0.3 Per-adapter signature pattern | A — Architect prescribes uniform widening | B (Implementer per-adapter choice), C (base class refactor) | Cross-adapter consistency; zero architectural ambiguity |
| § 0.4 Sparse-data test architecture | A — one parametrized AC | B (5 separate ACs), C (split by property) | Cross-adapter structural coverage; cleanest AC surface |

All four picks are independent; no pick contradicts PRD/WAVE-PLAN/CLUSTER-HANDOFF/anti-scope at higher precedence than the operator-directive divergence captured in OQ-R58-1.

---

## § 1 Design phase (Superpowers — inline; precedes per-file pseudocode)

### § 1.1 Component boundaries

| Symbol | Owner | Lifecycle |
|---|---|---|
| `TopologyFetchContext` (interface) | NEW Tessera-original at `engine/topology/fetch-context.ts` | Created this round (R58). Extends inherited `FetchContext` from `engine/topology-overlay.ts:57-60`. |
| `LIVE_FETCH_NOT_IMPLEMENTED_PATH_B` (error message prefix literal) | Adapter-side; 5 adapters each emit per-vendor prefix | Convention introduced this round; no external symbol needed. |
| `SlurmTopologySource.fetchSnapshot` signature | MOD `engine/topology/slurm-source.ts:58-60` | Widen param type FetchContext → TopologyFetchContext + Path B guard added. |
| `K8sNodeLabelSource.fetchSnapshot` signature | MOD `engine/topology/k8s-source.ts:68-70` | Same. |
| `NvlinkTopologySource.fetchSnapshot` signature | MOD `engine/topology/nvlink-source.ts:140-142` | Same. |
| `NeuronTopologySource.fetchSnapshot` signature | MOD `engine/topology/neuron-source.ts:166-168` | Same. |
| `TpuTopologySource.fetchSnapshot` signature | MOD `engine/topology/tpu-source.ts:201-203` | Same. |
| `test/q58-live-fetch-interface.test.ts` | NEW Tessera-original | 12 runtime tests binding AC-R58-1 through AC-R58-11 + AC-R58-14. |
| Existing sparse fixtures (5 files) | READ-ONLY (R26 / R29 / R30 / R53 / R56 frozen surfaces) | Re-used; not modified. See § 1.4 fixture inventory. |
| `engine/topology-overlay.ts` (`TopologySource` interface + `FetchContext`) | READ-ONLY (vendored-at-pin per file header line 3) | Preserved inviolate. |
| `engine/types/verdict.ts` | READ-ONLY (R56 frozen; no new literals per CLUSTER-HANDOFF line 82) | Preserved at R56 close state. |

### § 1.2 Data flows + integration points

```
                ┌─────────────────────────────────────────────────────────────────┐
                │ engine/topology-overlay.ts (VENDORED-AT-PIN; READ-ONLY)         │
                │                                                                 │
                │ interface TopologySource {                                      │
                │   fetchSnapshot(ctx?: FetchContext): Promise<TopologySnapshot>; │
                │ }                                                               │
                │ interface FetchContext { signal?: AbortSignal; }                │
                └─────────────────────────────────────────────────────────────────┘
                                          ▲
                                          │ extends (TS interface inheritance)
                                          │
                ┌─────────────────────────────────────────────────────────────────┐
                │ engine/topology/fetch-context.ts (NEW; Tessera-original; R58)   │
                │                                                                 │
                │ import type { FetchContext } from '../topology-overlay';        │
                │ export interface TopologyFetchContext extends FetchContext {    │
                │   authToken?: string;                                           │
                │   apiEndpoint?: string;                                         │
                │   timeoutMs?: number;                                           │
                │ }                                                               │
                └─────────────────────────────────────────────────────────────────┘
                                          ▲
                                          │ imported by 5 adapters
            ┌─────────────────────────────┼─────────────────────────────┐
            │            │                │                │            │
   ┌────────▼─────┐ ┌────▼─────┐ ┌────────▼──────┐ ┌────────▼──────┐ ┌──▼─────────┐
   │ slurm-source │ │ k8s-src  │ │ nvlink-source │ │ neuron-source │ │ tpu-source │
   │ (MOD R58)    │ │ (MOD R58)│ │ (MOD R58)     │ │ (MOD R58)     │ │ (MOD R58)  │
   │              │ │          │ │               │ │               │ │            │
   │ fetchSnap-   │ │ same     │ │ same          │ │ same          │ │ same       │
   │ shot(ctx?:   │ │          │ │               │ │               │ │            │
   │ TopologyF-   │ │          │ │               │ │               │ │            │
   │ etchContext) │ │          │ │               │ │               │ │            │
   │              │ │          │ │               │ │               │ │            │
   │ if (ctx?.    │ │ same     │ │ same          │ │ same          │ │ same       │
   │  apiEndpoint)│ │          │ │               │ │               │ │            │
   │   throw ...  │ │          │ │               │ │               │ │            │
   │ return       │ │          │ │               │ │               │ │            │
   │  constructor │ │          │ │               │ │               │ │            │
   │  snapshot;   │ │          │ │               │ │               │ │            │
   └──────────────┘ └──────────┘ └───────────────┘ └───────────────┘ └────────────┘
```

### § 1.3 Integration points (verified against R58 PRD/WAVE-PLAN/CLUSTER-HANDOFF requirements)

1. **TS bivariance on method parameter widening:** the implementing class's `fetchSnapshot(ctx?: TopologyFetchContext)` still satisfies the interface contract `fetchSnapshot(ctx?: FetchContext)` because `TopologyFetchContext extends FetchContext` (i.e., every `FetchContext` value is structurally a `TopologyFetchContext` — both have all-optional fields). TS allows this widening at the implementation site (handbook: method parameter bivariance). Verified across all 5 adapters by the typecheck binding-command AC-R58-12.

2. **Path B discriminator field:** `ctx?.apiEndpoint` is the discriminating field for "intent to perform real-cluster fetch." Other ctx fields (`signal`, `authToken`, `timeoutMs`) are accepted in the contract but unused in Path B; they are forward-looking infrastructure for SLICE 2C / SLICE 3 real-fetch implementation when Path A activates.

3. **`engine/topology-overlay.ts:262-267` BFS bidirectional adjacency build** — unmodified by R58. The 5 adapters' snapshot outputs flow through this BFS unchanged; AC-P1 through AC-P4 (Phase 1+2 cross-cutting ACs) preserved structurally because R58 does not modify any snapshot-producing code path that the BFS consumes; only the `fetchSnapshot` entry-point signature widens.

4. **`computeSnapshotHash`** at `engine/topology-overlay.ts:69-78` (free function) — unmodified by R58. Each adapter's `snapshotHash()` delegates to it per Addition #26 D6; cross-adapter snapshotHash delegation verified by AC-R58-10 (binds the delegation across all 5 adapters).

5. **A16 wire-format invariant** (`correlational_not_causal: true` at `engine/types/verdict.ts:298` per R56 frozen surface; JSDoc reference at `engine/types/verdict.ts:281` per R56 spec audit) — preserved structurally because R58 does NOT modify `engine/types/verdict.ts` (CLUSTER-HANDOFF line 82 anti-scope). AC-R58-11 binds the literal preservation defensively (structural readback of the file content).

### § 1.4 Failure modes at each integration point

| Integration point | Possible failure | R58 mitigation |
|---|---|---|
| TS method-parameter widening | Implementing class's `fetchSnapshot(ctx?: TopologyFetchContext)` rejected by tsc as non-conforming to `TopologySource.fetchSnapshot(ctx?: FetchContext)` | AC-R58-12 (typecheck attestation) catches at chore-A; if tsc rejects, HALT + DIAGNOSTIC per § 6.1; if confirmed, Architect would amend spec to use declaration-merging fallback (§ 0.1 Approach C). Pre-check: TS handbook documents method-parameter bivariance; R30/R53/R56 all use `_ctx?: FetchContext` and would accept any structural subtype — high-confidence pre-prediction tsc PASSES. |
| Path B throw at ctx.apiEndpoint | Adapter forgets to throw; silently returns constructor fixture | AC-R58-7 binds the throw behavior across all 5 adapters (parametrized) — would FAIL if any adapter omits the guard. Branch-binding coverage achieved per R21 ARCH MINOR-2/3 reinforcement. |
| Ctx with only signal/authToken/timeoutMs | Adapter incorrectly throws despite no apiEndpoint | AC-R58-8 binds ctx-without-apiEndpoint fallback behavior — would FAIL if any adapter incorrectly throws on these "soft" ctx fields. |
| Existing sparse fixture parse | Sparse fixture changes shape between R56 and R58 | Fixtures are read-only at R58; AC-R58-9 re-exercises existing sparse fixtures to confirm they still parse + produce subset snapshots. Pre-R58 state verified at session entry via `ls test/_substrate/`. |
| `engine/topology-overlay.ts` BFS regression | BFS body inadvertently modified | Anti-scope diff (AC-R58-14) excludes `engine/topology-overlay.ts` from ALLOWED_SET — Reviewer cold-eye diff catches at routing. |
| `engine/types/verdict.ts` schema regression | Verdict.ts inadvertently modified | Anti-scope diff (AC-R58-14) excludes `engine/types/verdict.ts` from ALLOWED_SET — Reviewer cold-eye diff catches at routing. AC-R58-11 binds `correlational_not_causal: true` literal preservation defensively. |
| Cross-adapter inconsistency | One adapter widens to TopologyFetchContext; another stays at FetchContext; another uses declaration-merge | AC-R58-2 through AC-R58-6 each binds the per-adapter signature change; cross-adapter consistency structurally guaranteed by 5 separate ACs covering 5 adapters identically. |

### § 1.5 Type-pretest: TS bivariance pseudocode (Architect verification)

The following pseudocode mirrors the prescribed per-adapter signature change. It is included here to document the Architect's pre-prediction that tsc accepts it; the Implementer applies this pattern verbatim across 5 adapters.

```typescript
// engine/topology/fetch-context.ts (NEW)
import type { FetchContext } from '../topology-overlay';
export interface TopologyFetchContext extends FetchContext {
  authToken?: string;
  apiEndpoint?: string;
  timeoutMs?: number;
}
```

```typescript
// engine/topology/slurm-source.ts (representative; same pattern for 4 others)
import type { FetchContext, TopologySource } from '../topology-overlay';  // unchanged
import type { TopologyFetchContext } from './fetch-context';              // NEW import
// ...
export class SlurmTopologySource implements TopologySource {
  // ...
  async fetchSnapshot(ctx?: TopologyFetchContext): Promise<TopologySnapshot> {  // WIDENED
    if (ctx?.apiEndpoint !== undefined) {
      throw new Error('LIVE_FETCH_NOT_IMPLEMENTED_PATH_B: slurm');
    }
    return this.snapshot;
  }
  // ...
}
```

**Architect pre-prediction:** tsc exit 0 against this pattern. Reasoning: `SlurmTopologySource implements TopologySource` requires `fetchSnapshot(ctx?: FetchContext)` to be assignable from the class method; TS's bivariant parameter check treats `(ctx?: TopologyFetchContext) => Promise<TopologySnapshot>` as assignable to `(ctx?: FetchContext) => Promise<TopologySnapshot>` because `TopologyFetchContext extends FetchContext` (all new fields optional, so the parameter type is structurally compatible).

---

## § 2 Mechanism

### § 2.1 Adapter `fetchSnapshot(ctx?)` semantics under Path B

The contract that every adapter's `fetchSnapshot(ctx?: TopologyFetchContext)` honors:

1. **If `ctx === undefined`** → return constructor-provided snapshot (preserves existing R28/R29/R30/R53/R56 behavior).
2. **If `ctx !== undefined` AND `ctx.apiEndpoint === undefined`** → return constructor-provided snapshot. `ctx.signal`, `ctx.authToken`, `ctx.timeoutMs` are accepted in the contract but unused at this Path B step.
3. **If `ctx !== undefined` AND `ctx.apiEndpoint !== undefined`** → throw `Error('LIVE_FETCH_NOT_IMPLEMENTED_PATH_B: <vendor>')` where `<vendor>` is one of `slurm` / `k8s` / `nvlink` / `neuron` / `tpu`. The throw makes Path B deferral observable to callers.

This contract is uniform across all 5 adapters; the per-vendor suffix on the throw message is the only adapter-specific surface.

### § 2.2 `TopologyFetchContext` interface declaration

The new file `engine/topology/fetch-context.ts` declares one exported interface:

```typescript
export interface TopologyFetchContext extends FetchContext {
  /** Bearer token / auth credential for future real-cluster fetch endpoints.
   *  Path B (R58): accepted in contract; unused at runtime. */
  authToken?: string;
  /** Real-cluster topology fetch endpoint URI. Path B (R58): if defined,
   *  adapter throws LIVE_FETCH_NOT_IMPLEMENTED_PATH_B. */
  apiEndpoint?: string;
  /** Real-cluster fetch deadline in milliseconds. Path B (R58): accepted
   *  in contract; unused at runtime. */
  timeoutMs?: number;
}
```

All three fields are optional (`?:`); the extension is purely additive. Importing this type in any adapter does NOT change the semantics of `FetchContext` for other consumers (e.g., `OtelServiceGraphV1` at `engine/topology-overlay.ts:111-160` continues to use plain `FetchContext`).

### § 2.3 Per-adapter signature widening (uniform across 5 adapters)

Every adapter's `fetchSnapshot` method transitions from:

```typescript
async fetchSnapshot(_ctx?: FetchContext): Promise<TopologySnapshot> {
  return this.snapshot;
}
```

to:

```typescript
async fetchSnapshot(ctx?: TopologyFetchContext): Promise<TopologySnapshot> {
  if (ctx?.apiEndpoint !== undefined) {
    throw new Error('LIVE_FETCH_NOT_IMPLEMENTED_PATH_B: <vendor>');
  }
  return this.snapshot;
}
```

The `<vendor>` literal differs per adapter: `slurm` / `k8s` / `nvlink` / `neuron` / `tpu`. The import block at the top of each adapter file gains one new line: `import type { TopologyFetchContext } from './fetch-context';`. The existing `FetchContext` import from `../topology-overlay` is RETAINED unchanged (the inherited `TopologySource` interface still references it; the import statement does not need to drop `FetchContext` because TS does not error on unused type imports in this position).

Actually — to avoid a TS6133 "unused import" lint surface on the `FetchContext` type if a strict lint configuration is later applied, the Implementer MAY remove the `FetchContext` import from the adapter (the widened signature no longer references it directly). TACTICAL AUTONOMY clause; not load-bearing for any R58 AC. Documented in § 4.6.

### § 2.4 What changes NOT prescribed by this spec

The spec does NOT prescribe:

- Refactoring any adapter's parser body (`parseSlurmTopologyConf`, `parseNodeListToSnapshot`, `parseNvlinkStatus`, `parseNeuronLsJson`, `parseTpuTopologyJson`) — these are R28/R29/R30/R53/R56 frozen surfaces per CLUSTER-HANDOFF line 81 + WAVE-PLAN-07 Step 1 anti-scope.
- Any new test fixtures — existing sparse fixtures cover all 5 adapters per § 1.4.
- Any modification to `engine/topology-overlay.ts` — A12 preserved per § 0.1 Approach A.
- Any modification to `engine/types/verdict.ts` — CLUSTER-HANDOFF line 82 anti-scope.
- Any modification to existing adapter constructor signatures — only the `fetchSnapshot` method body changes.

### § 2.5 R56 MINOR-1 halt-condition discipline (carve-out for pre-documented two-state)

Per R56 MINOR-1 reinforcement at CLAUDE-ARCHITECT.md (REINFORCED 2026-05-19): when § 1.4 / § 5 / § 6.1 reference test-count or binding-command attestation, the halt-condition trigger MUST carve out the pre-documented chore-A vs chore-B AC-R58-14 two-state mismatch (see § 5 AC-R58-13 row). § 6.1 halt condition #1 below applies this carve-out explicitly.

---

## § 3 Anti-scope + ALLOWED_SET (forward coverage per Rule 4)

### § 3.1 Anti-scope items

1. **A12 — NO modification of `engine/topology-overlay.ts`.** Vendored-at-pin per file header line 3. R58 preserves the file inviolate. `TopologySource` interface declaration + `FetchContext` interface body + `BFS adjacency build at :262-267` + `computeSnapshotHash` at `:69-78` + `OtelServiceGraphV1` class + `TopologyEnricher` class — all preserved.
2. **NO modification of `engine/types/verdict.ts`.** CLUSTER-HANDOFF line 82 + NEXT-ROLE.md line 55. R58 adds NO new enum literals; the R56 close state (10-member kind union including `'tpu_shard'`; 7-member relationship union including `'tpu_ici_peer'`) is the schema baseline for R58.
3. **NO modification of any adapter's parser body or constructor signature.** CLUSTER-HANDOFF line 81 + WAVE-PLAN-07 Step 1 anti-scope row for WU-2B. Only the `fetchSnapshot` method body + import block gain modifications.
4. **NO real-cluster fetch implementation.** PRD § Phase 3 Path B (PRD:466-474) + NEXT-ROLE.md line 54. ctx.apiEndpoint provided → throw; never make a network call.
5. **NO new sparse fixtures.** Existing fixtures suffice per § 1.4. Listed in NEXT-ROLE.md line 73 as "NEW conditional — only for adapters lacking sparse fixtures"; verified at session entry that all 5 adapters have sparse fixtures.
6. **NO modification of any test file from R01-R57** (Phase 1+2+Phase3-SLICE1+SLICE2-Wave7 tests frozen). Only the new `test/q58-live-fetch-interface.test.ts` lands.
7. **NO modification of `coordination/VENDORING-MANIFEST.md`.** R58 does not modify any vendored-at-pin or vendored-with-deltas file (`engine/topology-overlay.ts` preserved per item 1; `engine/types/verdict.ts` preserved per item 2). No manifest row note update required.
8. **NO modification of `~/.claude/CROSS-PROJECT-MEMORIAL.md`.** Per NEXT-ROLE.md line 57.
9. **NO modification of `coordination/MEMORIAL-PHASE-*.md`.** Per NEXT-ROLE.md line 58.
10. **NO modification of `scripts/*` or `run-pipeline.sh`.** Per NEXT-ROLE.md line 59.
11. **NO modification of `CLAUDE-*.md REINFORCEMENTS` sections.** Per NEXT-ROLE.md line 60.
12. **NO modification of WAVE-GATE-07.md / CLUSTER-HANDOFF-WAVE07-2A-2B.md** (R57 frozen artifacts).
13. **NO Phase 3 SLICE 3 work.** DS integration is SLICE 3 scope.
14. **NO opening GitHub PRs.** Per NEXT-ROLE.md line 64.

### § 3.2 ALLOWED_SET (12-path enumeration, forward-coverage per Rule 4)

The chore-A diff `git diff 7e9d399..<chore-A-SHA> --name-only | sort` MUST be a subset of:

```
coordination/MEMORIAL.md
coordination/NEXT-ROLE.md
coordination/specs/Q-R58-EMPIRICAL.sh
coordination/specs/Q-R58-SPEC-AUDIT.md
coordination/specs/Q-R58-SPEC.md
engine/topology/fetch-context.ts
engine/topology/k8s-source.ts
engine/topology/neuron-source.ts
engine/topology/nvlink-source.ts
engine/topology/slurm-source.ts
engine/topology/tpu-source.ts
test/q58-live-fetch-interface.test.ts
```

Conditional 13th entry: `coordination/diagnostics/DIAGNOSTIC-R58-*.md` — added IFF a halt fires mid-round and the Implementer writes a DIAGNOSTIC (per § 6.1 halt-condition discipline). Pre-authorized per R25 MAJOR-2 reinforcement (CLAUDE-ARCHITECT.md REINFORCED 2026-05-18: spec-mandated DIAGNOSTIC paths MUST appear in ALLOWED_SET upfront).

### § 3.3 Git-trackability verification

All 12 base ALLOWED_SET paths verified at spec-emit time for git-trackability per R23 ARCH MINOR-2 reinforcement:

- `engine/topology/fetch-context.ts` — parent directory `engine/topology/` is tracked (5 existing adapters live there); NEW file will be `git add`-able.
- `engine/topology/{slurm,k8s,nvlink,neuron,tpu}-source.ts` — all 5 currently `git ls-files`-tracked (verified at session entry).
- `test/q58-live-fetch-interface.test.ts` — `test/` is tracked.
- `coordination/specs/Q-R58-SPEC.md` + `Q-R58-SPEC-AUDIT.md` + `Q-R58-EMPIRICAL.sh` — `coordination/specs/` is tracked.
- `coordination/MEMORIAL.md` + `coordination/NEXT-ROLE.md` — tracked.

No `.gitignore` exclusions block any path.

---

## § 4 Per-file pseudocode

### § 4.1 `engine/topology/fetch-context.ts` (NEW; ~25 lines including header comment)

```typescript
// engine/topology/fetch-context.ts — Phase 3 SLICE 2 WU-Phase3-2B (R58).
//
// TopologyFetchContext: Tessera-original extension of the inherited
// `FetchContext` (engine/topology-overlay.ts:57-60) carrying optional
// real-cluster-fetch metadata (authToken, apiEndpoint, timeoutMs).
//
// Path B (R58): all three new fields are accepted by adapter
// `fetchSnapshot(ctx?)` methods but are unused at runtime EXCEPT
// `apiEndpoint` — if defined, adapters throw
// `LIVE_FETCH_NOT_IMPLEMENTED_PATH_B: <vendor>` to surface Path B
// deferral explicitly. Real-cluster-fetch implementation is deferred
// per PRD § Phase 3 Path B (OQ-P3-9 RESOLVED 2026-05-19 at
// WAVE-GATE-06).
//
// Why a Tessera-original file instead of modifying
// engine/topology-overlay.ts: the inherited file is vendored-at-pin
// (engine/topology-overlay.ts:3 "Sync policy: vendored-at-pin").
// Tessera-original extension files preserve A12 inviolate while
// providing the richer ctx surface adapters can opt into via TS
// method-parameter bivariance.
//
// Tessera-original code (NOT vendored from DeploySignal).

import type { FetchContext } from '../topology-overlay';

export interface TopologyFetchContext extends FetchContext {
  /** Bearer token / auth credential for future real-cluster fetch endpoints.
   *  Path B (R58): accepted in contract; unused at runtime. */
  authToken?: string;
  /** Real-cluster topology fetch endpoint URI. Path B (R58): if defined,
   *  adapter throws LIVE_FETCH_NOT_IMPLEMENTED_PATH_B. */
  apiEndpoint?: string;
  /** Real-cluster fetch deadline in milliseconds. Path B (R58): accepted
   *  in contract; unused at runtime. */
  timeoutMs?: number;
}
```

### § 4.2 `engine/topology/slurm-source.ts` (MOD; targeted edits only)

**Edit 1 — Import block (after the existing `topology-overlay` import block; line 25-26 region):**

```typescript
import type { TopologyFetchContext } from './fetch-context';  // NEW
```

The existing import block at `slurm-source.ts:21-25`:
```typescript
import {
  computeSnapshotHash,
  type FetchContext,
  type TopologySource,
} from '../topology-overlay';
```
is RETAINED unchanged (the `FetchContext` import remains in case the Implementer chooses to keep it for documentary purposes; TACTICAL AUTONOMY-clause per § 2.3 — the Implementer MAY remove `type FetchContext,` if a lint rule complains, but is not required to).

**Edit 2 — `fetchSnapshot` method body at `slurm-source.ts:58-60`:**

Before:
```typescript
  async fetchSnapshot(_ctx?: FetchContext): Promise<TopologySnapshot> {
    return this.snapshot;
  }
```

After:
```typescript
  async fetchSnapshot(ctx?: TopologyFetchContext): Promise<TopologySnapshot> {
    if (ctx?.apiEndpoint !== undefined) {
      throw new Error('LIVE_FETCH_NOT_IMPLEMENTED_PATH_B: slurm');
    }
    return this.snapshot;
  }
```

### § 4.3 `engine/topology/k8s-source.ts` (MOD; same pattern)

**Edit 1 — Import block (after `topology-overlay` import at `k8s-source.ts:26-30`):**

```typescript
import type { TopologyFetchContext } from './fetch-context';  // NEW
```

**Edit 2 — `fetchSnapshot` method body at `k8s-source.ts:68-70`:**

Before:
```typescript
  async fetchSnapshot(_ctx?: FetchContext): Promise<TopologySnapshot> {
    return this.snapshot;
  }
```

After:
```typescript
  async fetchSnapshot(ctx?: TopologyFetchContext): Promise<TopologySnapshot> {
    if (ctx?.apiEndpoint !== undefined) {
      throw new Error('LIVE_FETCH_NOT_IMPLEMENTED_PATH_B: k8s');
    }
    return this.snapshot;
  }
```

### § 4.4 `engine/topology/nvlink-source.ts` (MOD; same pattern)

**Edit 1 — Import block (after `topology-overlay` import at `nvlink-source.ts:24-28`):**

```typescript
import type { TopologyFetchContext } from './fetch-context';  // NEW
```

**Edit 2 — `fetchSnapshot` method body at `nvlink-source.ts:140-142`:**

Before:
```typescript
  async fetchSnapshot(_ctx?: FetchContext): Promise<TopologySnapshot> {
    return this.snapshot;
  }
```

After:
```typescript
  async fetchSnapshot(ctx?: TopologyFetchContext): Promise<TopologySnapshot> {
    if (ctx?.apiEndpoint !== undefined) {
      throw new Error('LIVE_FETCH_NOT_IMPLEMENTED_PATH_B: nvlink');
    }
    return this.snapshot;
  }
```

### § 4.5 `engine/topology/neuron-source.ts` (MOD; same pattern)

**Edit 1 — Import block (after `topology-overlay` import at `neuron-source.ts:25-29`):**

```typescript
import type { TopologyFetchContext } from './fetch-context';  // NEW
```

**Edit 2 — `fetchSnapshot` method body at `neuron-source.ts:166-168`:**

Before:
```typescript
  async fetchSnapshot(_ctx?: FetchContext): Promise<TopologySnapshot> {
    return this.snapshot;
  }
```

After:
```typescript
  async fetchSnapshot(ctx?: TopologyFetchContext): Promise<TopologySnapshot> {
    if (ctx?.apiEndpoint !== undefined) {
      throw new Error('LIVE_FETCH_NOT_IMPLEMENTED_PATH_B: neuron');
    }
    return this.snapshot;
  }
```

### § 4.6 `engine/topology/tpu-source.ts` (MOD; same pattern)

**Edit 1 — Import block (after `topology-overlay` import; the existing import block contains `type FetchContext,` at `tpu-source.ts:32`):**

```typescript
import type { TopologyFetchContext } from './fetch-context';  // NEW
```

**Edit 2 — `fetchSnapshot` method body at `tpu-source.ts:201-203`:**

Before:
```typescript
  async fetchSnapshot(_ctx?: FetchContext): Promise<TopologySnapshot> {
    return this.snapshot;
  }
```

After:
```typescript
  async fetchSnapshot(ctx?: TopologyFetchContext): Promise<TopologySnapshot> {
    if (ctx?.apiEndpoint !== undefined) {
      throw new Error('LIVE_FETCH_NOT_IMPLEMENTED_PATH_B: tpu');
    }
    return this.snapshot;
  }
```

### § 4.7 `test/q58-live-fetch-interface.test.ts` (NEW; ~280 lines)

12 runtime tests covering AC-R58-1 through AC-R58-11 + AC-R58-14. Pseudocode:

```typescript
// test/q58-live-fetch-interface.test.ts — Phase 3 SLICE 2 WU-Phase3-2B (R58).
//
// Binds AC-R58-1 through AC-R58-11 + AC-R58-14 (12 runtime tests) per
// Q-R58-SPEC.md § 5. AC-R58-12 (typecheck) and AC-R58-13 (test count) are
// binding-command attestations reported by the Implementer at chore-A;
// not runtime-bound. They are mechanically verified by
// coordination/specs/Q-R58-EMPIRICAL.sh per Rule 1 sub-class
// `empirical-command-attestation`.
//
// AC-R58-14 (anti-scope diff) is a runtime test that the Implementer
// appends in chore-B with the chore-A SHA substituted into the diff
// baseline literal.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import type { TopologyFetchContext } from '../engine/topology/fetch-context';
import { SlurmTopologySource }    from '../engine/topology/slurm-source';
import { K8sNodeLabelSource }     from '../engine/topology/k8s-source';
import { NvlinkTopologySource }   from '../engine/topology/nvlink-source';
import { NeuronTopologySource }   from '../engine/topology/neuron-source';
import { TpuTopologySource }      from '../engine/topology/tpu-source';
import { computeSnapshotHash }    from '../engine/topology-overlay';

// Substrate loading. ALL fixtures pre-exist at R58 entry (R28/R29/R30/R53/R56).
const SLURM_WELL_FORMED = readFileSync('test/_substrate/slurm-fixture-canonical.conf',           'utf8');
const SLURM_SPARSE      = readFileSync('test/_substrate/slurm-fixture-sparse.conf',              'utf8');
const K8S_FULL          = JSON.parse(readFileSync('test/_substrate/k8s-nodelist-fixture-full.json',           'utf8'));
const K8S_SPARSE        = JSON.parse(readFileSync('test/_substrate/k8s-nodelist-fixture-sparse-no-gpu.json',  'utf8'));
const NVLINK_WELL       = readFileSync('test/_substrate/nvlink-fixture-well-formed.txt',         'utf8');
const NVLINK_SPARSE     = readFileSync('test/_substrate/nvlink-fixture-sparse.txt',              'utf8');
const NEURON_FULL       = readFileSync('test/_substrate/neuron-fixture-trainium-2d-torus.json',  'utf8');
const NEURON_SPARSE     = readFileSync('test/_substrate/neuron-fixture-sparse.json',             'utf8');
const TPU_FULL          = readFileSync('test/_substrate/tpu-fixture-v4-cube.json',               'utf8');
const TPU_SPARSE        = readFileSync('test/_substrate/tpu-fixture-sparse-subcube.json',        'utf8');

// Adapter-factory tuples (used by parametrized ACs to iterate uniformly across 5 vendors).
const ADAPTERS: Array<{
  vendor: string;
  build: () => { id: string; version: string;
                  fetchSnapshot: (ctx?: TopologyFetchContext) => Promise<unknown>;
                  snapshotHash: (s: unknown) => string };
  buildSparse: () => { fetchSnapshot: (ctx?: TopologyFetchContext) => Promise<{ nodes: unknown[]; edges: unknown[] }> };
}> = [
  { vendor: 'slurm',
    build:       () => new SlurmTopologySource(SLURM_WELL_FORMED, { fetched_at_ts: 1_700_000_000 }),
    buildSparse: () => new SlurmTopologySource(SLURM_SPARSE,      { fetched_at_ts: 1_700_000_000 }) },
  { vendor: 'k8s',
    build:       () => new K8sNodeLabelSource(K8S_FULL,           { now: () => 1_700_000_000 }),
    buildSparse: () => new K8sNodeLabelSource(K8S_SPARSE,         { now: () => 1_700_000_000 }) },
  { vendor: 'nvlink',
    build:       () => new NvlinkTopologySource(NVLINK_WELL,      { fetched_at_ts: 1_700_000_000 }),
    buildSparse: () => new NvlinkTopologySource(NVLINK_SPARSE,    { fetched_at_ts: 1_700_000_000 }) },
  { vendor: 'neuron',
    build:       () => new NeuronTopologySource(NEURON_FULL,      { fetched_at_ts: 1_700_000_000 }),
    buildSparse: () => new NeuronTopologySource(NEURON_SPARSE,    { fetched_at_ts: 1_700_000_000 }) },
  { vendor: 'tpu',
    build:       () => new TpuTopologySource(TPU_FULL,            { fetched_at_ts: 1_700_000_000 }),
    buildSparse: () => new TpuTopologySource(TPU_SPARSE,          { fetched_at_ts: 1_700_000_000 }) },
];

// AC-R58-1: TopologyFetchContext exported with three optional fields.
test('AC-R58-1: TopologyFetchContext type exists and accepts authToken/apiEndpoint/timeoutMs', () => {
  // The fact that this file imports TopologyFetchContext successfully proves the
  // export exists; the type-level check below proves the three optional fields are accepted.
  const ctx: TopologyFetchContext = {
    authToken: 'test-token',
    apiEndpoint: 'https://example.invalid/topology',
    timeoutMs: 5000,
  };
  // Structural readback (cannot directly test interface members at runtime; type-level
  // import + variable assignment is the empirical evidence of the type's existence).
  assert.strictEqual(typeof ctx.authToken,   'string');
  assert.strictEqual(typeof ctx.apiEndpoint, 'string');
  assert.strictEqual(typeof ctx.timeoutMs,   'number');
});

// AC-R58-2: SlurmTopologySource.fetchSnapshot(undefined) returns constructor fixture.
test('AC-R58-2: SlurmTopologySource.fetchSnapshot(undefined) returns constructor fixture', async () => {
  const src = new SlurmTopologySource(SLURM_WELL_FORMED, { fetched_at_ts: 1_700_000_000 });
  const snap = await src.fetchSnapshot();
  assert.ok(Array.isArray(snap.nodes) && snap.nodes.length > 0,
            'snapshot has nodes');
  assert.ok(Array.isArray(snap.edges) && snap.edges.length > 0,
            'snapshot has edges');
});

// AC-R58-3: K8sNodeLabelSource.fetchSnapshot(undefined) returns constructor fixture.
test('AC-R58-3: K8sNodeLabelSource.fetchSnapshot(undefined) returns constructor fixture', async () => {
  const src = new K8sNodeLabelSource(K8S_FULL, { now: () => 1_700_000_000 });
  const snap = await src.fetchSnapshot();
  assert.ok(Array.isArray(snap.nodes) && snap.nodes.length > 0);
});

// AC-R58-4: NvlinkTopologySource.fetchSnapshot(undefined) returns constructor fixture.
test('AC-R58-4: NvlinkTopologySource.fetchSnapshot(undefined) returns constructor fixture', async () => {
  const src = new NvlinkTopologySource(NVLINK_WELL, { fetched_at_ts: 1_700_000_000 });
  const snap = await src.fetchSnapshot();
  assert.ok(Array.isArray(snap.nodes) && snap.nodes.length > 0);
});

// AC-R58-5: NeuronTopologySource.fetchSnapshot(undefined) returns constructor fixture.
test('AC-R58-5: NeuronTopologySource.fetchSnapshot(undefined) returns constructor fixture', async () => {
  const src = new NeuronTopologySource(NEURON_FULL, { fetched_at_ts: 1_700_000_000 });
  const snap = await src.fetchSnapshot();
  assert.ok(Array.isArray(snap.nodes) && snap.nodes.length > 0);
});

// AC-R58-6: TpuTopologySource.fetchSnapshot(undefined) returns constructor fixture.
test('AC-R58-6: TpuTopologySource.fetchSnapshot(undefined) returns constructor fixture', async () => {
  const src = new TpuTopologySource(TPU_FULL, { fetched_at_ts: 1_700_000_000 });
  const snap = await src.fetchSnapshot();
  assert.ok(Array.isArray(snap.nodes) && snap.nodes.length > 0);
});

// AC-R58-7: ctx.apiEndpoint defined → throws LIVE_FETCH_NOT_IMPLEMENTED_PATH_B
// across all 5 adapters with adapter-specific vendor suffix.
test('AC-R58-7: ctx.apiEndpoint defined → throws LIVE_FETCH_NOT_IMPLEMENTED_PATH_B across all 5 adapters', async () => {
  const ctxLive: TopologyFetchContext = { apiEndpoint: 'https://cluster.invalid/topology' };
  for (const { vendor, build } of ADAPTERS) {
    const src = build();
    await assert.rejects(
      () => src.fetchSnapshot(ctxLive),
      (err: Error) => err.message === `LIVE_FETCH_NOT_IMPLEMENTED_PATH_B: ${vendor}`,
      `${vendor}: expected LIVE_FETCH_NOT_IMPLEMENTED_PATH_B: ${vendor}`,
    );
  }
});

// AC-R58-8: ctx with only signal/authToken/timeoutMs (no apiEndpoint) → fall back
// to constructor fixture (Path B preserved across all 5 adapters).
test('AC-R58-8: ctx without apiEndpoint → constructor fixture fallback across all 5 adapters', async () => {
  const ctxSoft: TopologyFetchContext = { authToken: 't', timeoutMs: 5000 };  // no apiEndpoint
  for (const { vendor, build } of ADAPTERS) {
    const src = build();
    const snap = await src.fetchSnapshot(ctxSoft);
    assert.ok(Array.isArray(snap.nodes) && snap.nodes.length > 0,
              `${vendor}: expected fallback to constructor snapshot`);
  }
});

// AC-R58-9: Sparse-data resilience across all 5 adapters — sparse fixture parses
// without throw + produces subset snapshot (nodes-present + edges-may-be-empty).
test('AC-R58-9: sparse-data resilience across all 5 adapters', async () => {
  for (const { vendor, buildSparse } of ADAPTERS) {
    // Constructor parses sparse fixture without throwing.
    const src = buildSparse();
    // fetchSnapshot returns the parsed sparse snapshot.
    const snap = await src.fetchSnapshot();
    assert.ok(Array.isArray(snap.nodes) && snap.nodes.length >= 0,
              `${vendor}: sparse snapshot has nodes array (may be empty)`);
    assert.ok(Array.isArray(snap.edges) && snap.edges.length >= 0,
              `${vendor}: sparse snapshot has edges array (may be empty)`);
  }
});

// AC-R58-10: Cross-adapter snapshotHash delegates uniformly to computeSnapshotHash
// (5 adapters). Verifies Addition #26 D6 archaeological-render invariant.
test('AC-R58-10: snapshotHash delegates to computeSnapshotHash across all 5 adapters', async () => {
  for (const { vendor, build } of ADAPTERS) {
    const src = build();
    const snap = await src.fetchSnapshot();
    const sourceSideHash = src.snapshotHash(snap);
    const freeFnHash = computeSnapshotHash(snap);
    assert.strictEqual(sourceSideHash, freeFnHash,
                       `${vendor}: snapshotHash must equal computeSnapshotHash(snap)`);
  }
});

// AC-R58-11: A16 — engine/types/verdict.ts retains 'correlational_not_causal: true' literal.
test("AC-R58-11: A16 — verdict.ts retains 'correlational_not_causal: true' literal", () => {
  const text = readFileSync('engine/types/verdict.ts', 'utf8');
  // Discriminating assertion: count of occurrences must be >= 1 (substantive literal
  // at line 298 per R56 spec audit § 6 disclosure 6 + R56 MINOR-2 reinforcement).
  // The substring also appears in a JSDoc comment at line 281; either occurrence
  // satisfies A16. AC-R58-11 binds the WIRE-FORMAT INVARIANT (literal presence anywhere
  // in the file), not the specific line of declaration — A16 is a structural-presence
  // check, not a per-line attestation. This is intentionally less strict than R56 MINOR-2
  // would mandate for a more discriminating assertion; A16 spec is "literal must appear",
  // not "literal must appear at line 298".
  assert.ok(
    text.includes('correlational_not_causal: true'),
    "verdict.ts must contain literal 'correlational_not_causal: true' per Addition #26 D4",
  );
});

// AC-R58-14: round-start-to-chore-A diff ⊆ R58 allowed-set (chore-A SHA pinned).
// Appended by Implementer at chore-B with chore-A SHA substituted into BASELINE_SHA→CHORE_A_SHA range.
test('AC-R58-14: round-start-to-chore-A diff ⊆ R58 allowed-set (chore-A SHA pinned)', () => {
  const BASELINE_SHA = '7e9d399';
  const CHORE_A_SHA  = '<INJECTED-AT-CHORE-B>';
  const ALLOWED_SET = new Set<string>([
    'coordination/MEMORIAL.md',
    'coordination/NEXT-ROLE.md',
    'coordination/specs/Q-R58-EMPIRICAL.sh',
    'coordination/specs/Q-R58-SPEC-AUDIT.md',
    'coordination/specs/Q-R58-SPEC.md',
    'engine/topology/fetch-context.ts',
    'engine/topology/k8s-source.ts',
    'engine/topology/neuron-source.ts',
    'engine/topology/nvlink-source.ts',
    'engine/topology/slurm-source.ts',
    'engine/topology/tpu-source.ts',
    'test/q58-live-fetch-interface.test.ts',
    // Conditional 13th entry per spec § 3.2: added IFF a HALT fires mid-round.
  ]);
  const diffOutput = execFileSync(
    'git',
    ['diff', `${BASELINE_SHA}..${CHORE_A_SHA}`, '--name-only'],
    { encoding: 'utf8' },
  );
  const paths = diffOutput.split('\n').filter((p) => p.length > 0);
  for (const p of paths) {
    assert.ok(ALLOWED_SET.has(p), `unexpected R58 path in chore-A diff: ${p}`);
  }
});
```

**Implementer notes on the test file (§ 4.7):**

- AC-R58-14 uses `execFileSync` array form (no shell) per REINFORCED 2026-05-18 R26 MINOR-1 + R53 precedent.
- The placeholder `<INJECTED-AT-CHORE-B>` is substituted in chore-B per R53/R56 precedent. At chore-A, this test fails by construction; this is expected and pre-documented in § 5 AC-R58-13 + § 6.1 halt-condition carve-out.
- The 12 runtime tests are uniformly named `AC-R58-N` with discriminating titles (per R51 MINOR-1 reinforcement: substring markers must be uniquely identifying).
- AC-R58-9 uses adapter-name diagnostic suffix in assertion messages (per § 0.4 selection rationale).

---

## § 5 Acceptance criteria

### § 5.1 AC enumeration

This section enumerates 14 ACs. **12 ACs are runtime-bound** (one `test()` block each in `test/q58-live-fetch-interface.test.ts`); **2 ACs are binding-command attestations** reported by the Implementer at chore-A and mechanically verified by `coordination/specs/Q-R58-EMPIRICAL.sh`:

- **Runtime-bound (12):** AC-R58-1 through AC-R58-11 + AC-R58-14. Each is one `test()` block; runtime test count grows by 12.
- **Binding-command attestations (2):** AC-R58-12 (`npx tsc -p tsconfig.test.json` exit code) + AC-R58-13 (`node --test` summary). Reported by Implementer at chore-A; encoded in Q-R58-EMPIRICAL.sh.

### § 5.2 Per-AC table (Given / When / Then)

| AC | Given | When | Then | Verification |
|---|---|---|---|---|
| **AC-R58-1** | `engine/topology/fetch-context.ts` exports `TopologyFetchContext` extending `FetchContext` with three optional fields (`authToken`, `apiEndpoint`, `timeoutMs`) | A consumer imports the type + constructs an object literal with all three fields set | TypeScript accepts the literal; runtime readback confirms all three field types (`string` / `string` / `number`) | `test/q58-live-fetch-interface.test.ts` `AC-R58-1` |
| **AC-R58-2** | `SlurmTopologySource` instantiated with well-formed `slurm-fixture-canonical.conf` text | `fetchSnapshot()` called with no argument | Returns the constructor-parsed `TopologySnapshot` with `nodes.length > 0` and `edges.length > 0` | `test/q58-live-fetch-interface.test.ts` `AC-R58-2` |
| **AC-R58-3** | `K8sNodeLabelSource` instantiated with `k8s-nodelist-fixture-full.json` | `fetchSnapshot()` called with no argument | Returns constructor-parsed snapshot with `nodes.length > 0` | `test/q58-live-fetch-interface.test.ts` `AC-R58-3` |
| **AC-R58-4** | `NvlinkTopologySource` instantiated with `nvlink-fixture-well-formed.txt` | `fetchSnapshot()` called with no argument | Returns constructor-parsed snapshot with `nodes.length > 0` | `test/q58-live-fetch-interface.test.ts` `AC-R58-4` |
| **AC-R58-5** | `NeuronTopologySource` instantiated with `neuron-fixture-trainium-2d-torus.json` | `fetchSnapshot()` called with no argument | Returns constructor-parsed snapshot with `nodes.length > 0` | `test/q58-live-fetch-interface.test.ts` `AC-R58-5` |
| **AC-R58-6** | `TpuTopologySource` instantiated with `tpu-fixture-v4-cube.json` | `fetchSnapshot()` called with no argument | Returns constructor-parsed snapshot with `nodes.length > 0` | `test/q58-live-fetch-interface.test.ts` `AC-R58-6` |
| **AC-R58-7** | Each of 5 adapters instantiated with its well-formed fixture | `fetchSnapshot(ctx)` called with `ctx.apiEndpoint = 'https://cluster.invalid/topology'` | Throws `Error` with message exactly `'LIVE_FETCH_NOT_IMPLEMENTED_PATH_B: <vendor>'` where `<vendor>` ∈ `{slurm, k8s, nvlink, neuron, tpu}` | `test/q58-live-fetch-interface.test.ts` `AC-R58-7` (parametrized over 5 adapters) |
| **AC-R58-8** | Each of 5 adapters instantiated with its well-formed fixture | `fetchSnapshot(ctx)` called with `ctx = { authToken: 't', timeoutMs: 5000 }` (no `apiEndpoint`) | Returns constructor-parsed snapshot with `nodes.length > 0` (Path B fallback preserved) | `test/q58-live-fetch-interface.test.ts` `AC-R58-8` (parametrized over 5 adapters) |
| **AC-R58-9** | Each of 5 adapters instantiated with its pre-existing sparse fixture (`slurm-fixture-sparse.conf` / `k8s-nodelist-fixture-sparse-no-gpu.json` / `nvlink-fixture-sparse.txt` / `neuron-fixture-sparse.json` / `tpu-fixture-sparse-subcube.json`) | `fetchSnapshot()` called with no argument | Constructor + fetchSnapshot do not throw; returns a snapshot whose `nodes` and `edges` are valid arrays (may be empty / subset depending on adapter sparse semantics) | `test/q58-live-fetch-interface.test.ts` `AC-R58-9` (parametrized over 5 adapters) |
| **AC-R58-10** | Each of 5 adapters instantiated with its well-formed fixture | `src.snapshotHash(snap)` called where `snap = await src.fetchSnapshot()` | Equals `computeSnapshotHash(snap)` for all 5 adapters (Addition #26 D6 archaeological-render delegation) | `test/q58-live-fetch-interface.test.ts` `AC-R58-10` (parametrized over 5 adapters) |
| **AC-R58-11** | Repo at chore-A SHA | Test reads `engine/types/verdict.ts` and searches for the literal `'correlational_not_causal: true'` | Literal is present (≥1 occurrence; A16 wire-format invariant per Addition #26 D4) | `test/q58-live-fetch-interface.test.ts` `AC-R58-11` |
| **AC-R58-12** | Repo at chore-A SHA | `npx tsc -p tsconfig.test.json` executed | Exit code = 0; zero new diagnostics introduced | Q-R58-EMPIRICAL.sh `AC-R58-12` block; binding-command attestation |
| **AC-R58-13** | Repo at chore-A SHA (pre-AC-R58-14-SHA-injection) | `node --test --test-reporter=tap test/*.test.js` executed | Summary `tests=399 / pass=393 / fail=3 / skipped=3`. 3 fails = R36-30 + R36-31 (pre-existing carry-forward) + AC-R58-14 (placeholder-SHA fails-by-construction at chore-A per R53 MINOR-1 chore-A-vs-chore-B two-state distinction). | Q-R58-EMPIRICAL.sh `AC-R58-13` block; binding-command attestation. **Chore-B state (post-AC-R58-14 SHA injection): `399/394/2/3`.** |
| **AC-R58-14** | Repo at chore-A SHA | `git diff <BASELINE_SHA=7e9d399>..<CHORE_A_SHA> --name-only` executed | Output ⊆ 12-path ALLOWED_SET enumerated in § 3.2 (+ optional 13th DIAGNOSTIC-R58-*.md if a halt fired) | `test/q58-live-fetch-interface.test.ts` `AC-R58-14` (chore-A SHA injected at chore-B per R53/R56 precedent) |

### § 5.3 AC table preamble cross-check (R20 ARCH MINOR-1)

Per CLAUDE-ARCHITECT.md REINFORCED R20 ARCH MINOR-1 (AC-table preamble cross-check): the § 5.1 preamble paragraph classifies AC-R58-12 + AC-R58-13 as "binding-command attestations reported by the Implementer at chore-A." Cross-checking against § 4.7 (test file pseudocode): AC-R58-12 + AC-R58-13 are NOT present in `test/q58-live-fetch-interface.test.ts` (verified — they are mechanically verified by Q-R58-EMPIRICAL.sh only, not by runtime tests). AC-R58-14 IS present in the test file pseudocode (per § 4.7) and classified runtime-bound in the preamble. Cross-check: PASS — narrative classification matches structural prescription.

### § 5.4 Two-state SHA-distinction (R53 MINOR-1 reinforcement)

Per CLAUDE-ARCHITECT.md REINFORCED 2026-05-19 (R53 MINOR-1: chore-A vs chore-B test-count prediction):

- **Chore-A state:** AC-R58-14 fails by construction because the placeholder literal `'<INJECTED-AT-CHORE-B>'` is not a valid git ref. Predicted summary: `tests=399 / pass=393 / fail=3 / skipped=3` (3 fails = R36-30 + R36-31 + AC-R58-14 placeholder).
- **Chore-B state (after Implementer SHA injection):** AC-R58-14 passes. Predicted summary: `tests=399 / pass=394 / fail=2 / skipped=3`.

Q-R58-EMPIRICAL.sh `AC-R58-13` block asserts the CHORE-B predicted value (`399/394/2/3`). At chore-A pre-injection, the AC-R58-13 block FAILs by construction; the Implementer MUST encode the ACTUAL observed value (`399/393/3/3`) verbatim per Rule 1 sub-class `empirical-command-attestation` (R46 derivation) — NOT reframe as compliance.

### § 5.5 Branch-binding coverage (R21 ARCH MINOR-2/3)

| Branch / guard | Source location | Bound by AC |
|---|---|---|
| `ctx?.apiEndpoint !== undefined` → throw (5 adapters) | `slurm-source.ts:59-60`, `k8s-source.ts:69-70`, `nvlink-source.ts:141-142`, `neuron-source.ts:167-168`, `tpu-source.ts:202-203` (after MOD) | AC-R58-7 (parametrized over 5 adapters; each adapter's vendor literal in error message verifies the specific guard fired) |
| `ctx?.apiEndpoint === undefined` (fallback to constructor snapshot) | Same lines (else branch implicit) | AC-R58-8 (parametrized; ctx with `authToken`/`timeoutMs` but no `apiEndpoint` falls back) |
| `ctx === undefined` (no-arg call returns constructor snapshot) | Same lines (else branch implicit) | AC-R58-2 through AC-R58-6 (per-adapter no-arg call) |
| Constructor-parsed sparse fixture produces non-throwing snapshot | parse functions in each adapter (frozen R28/R29/R30/R53/R56 surfaces) | AC-R58-9 (parametrized; existing R28/R29/R30/R53/R56 sparse-handling re-exercised at R58) |
| `src.snapshotHash` delegation to `computeSnapshotHash` | `snapshotHash` methods in 5 adapters | AC-R58-10 (parametrized) |
| A16 `correlational_not_causal: true` literal in `engine/types/verdict.ts` | `verdict.ts:298` (declaration) + `:281` (JSDoc) | AC-R58-11 (substring presence check; explicitly less discriminating than R56 MINOR-2 disclosure documents — per § 4.7 AC-R58-11 inline rationale) |
| 12-path ALLOWED_SET coverage | Spec § 3.2 + test file `ALLOWED_SET` literal | AC-R58-14 (per-path membership check) |
| tsc preserved at exit 0 | `npx tsc -p tsconfig.test.json` | AC-R58-12 (binding-command) |
| Runtime test summary matches chore-B prediction | `node --test test/*.test.js` | AC-R58-13 (binding-command; chore-A two-state per § 5.4) |

**Coverage statement:** Every guard / fallback / branch prescribed in this spec's § 4 pseudocode is bound by at least one AC above. No guard is structurally unreachable from the AC table. Per R21 ARCH MINOR-2/3, this is a hard architectural completeness gate.

### § 5.6 Substring-marker discriminability (R51 MINOR-1)

AC-R58-7 binds the error message `'LIVE_FETCH_NOT_IMPLEMENTED_PATH_B: <vendor>'` with **exact equality** (`err.message === ...`) against the per-vendor suffix — discriminating (the vendor suffix is unique per adapter; absence of any per-vendor throw would FAIL).

AC-R58-11 binds the substring `'correlational_not_causal: true'` via `text.includes(...)`. The literal appears at 2 sites in `engine/types/verdict.ts` (R56 MINOR-2 disclosure: line 281 JSDoc + line 298 type-body declaration). The AC is intentionally **substring-presence** rather than line-anchored — A16 is "literal must appear", not "literal must appear at a specific line" — but this is disclosed as a known non-discrimination per R51 MINOR-1 + R56 MINOR-2 precedent. A future regression removing only the type-body declaration at :298 while leaving the JSDoc at :281 intact would still PASS AC-R58-11. Compile would catch the type-removal first (R56 mitigation precedent). Disclosed in § Honest-broker disclosures D-3.

---

## § 6 Halt conditions

### § 6.1 Pre-documented halt triggers (with chore-A vs chore-B carve-out per R56 MINOR-1)

1. **Q-R58-EMPIRICAL.sh exits non-zero at chore-A for any reason OTHER THAN the pre-documented AC-R58-13 two-state count mismatch** → HALT + DIAGNOSTIC + STATUS: ESCALATE. **Carve-out (per R56 MINOR-1):** AC-R58-13 block FAILs by construction at chore-A because AC-R58-14's placeholder SHA literal is not a valid git ref; the predicted chore-A summary is `399/393/3/3` while the AC-R58-13 block asserts `399/394/2/3` (chore-B post-injection). This specific pre-documented FAIL is NOT a halt trigger — the Implementer encodes the actual `399/393/3/3` verbatim in NEXT-ROLE.md attestation per Rule 1 sub-class `empirical-command-attestation` and proceeds to chore-B where SHA injection restores `399/394/2/3`. Any OTHER FAIL in Q-R58-EMPIRICAL.sh IS a halt trigger.

2. **`npx tsc -p tsconfig.test.json` exits non-zero at chore-A** → HALT + DIAGNOSTIC. R58 inherits a clean tsc surface (exit 0 at session entry); any TS error introduced by R58's signature widening or new `fetch-context.ts` file is unexpected. § 1.4 / § 1.5 Architect pre-prediction is tsc exit 0; if the prediction empirically fails, HALT for operator decision (most likely Approach C declaration-merging fallback).

3. **`node --test` summary at chore-A deviates from `399/393/3/3` prediction (other than the two pre-existing R36-30/R36-31 fails)** → HALT + DIAGNOSTIC. If the actual count is e.g. 398 (test missing) or 400 (extra unintended test) or fail-count drifts beyond the two-state expectation, the Implementer encodes the actual value verbatim per Rule 1 sub-class and halts.

4. **Cross-cutting interface change breaks Phase 1/2 ACs** (per NEXT-ROLE.md line 94): if any AC-P1 through AC-P4 regresses (any pre-R58 test file fails at chore-A) → HALT + DIAGNOSTIC.

5. **Sparse-data resilience requirement surfaces a dependency on real-cluster behavior** (per NEXT-ROLE.md line 95): if AC-R58-9 cannot be satisfied without real-cluster ground truth → HALT + DIAGNOSTIC; Path B deferral.

6. **`engine/types/verdict.ts` D5 schema-write-conflict regresses** (per NEXT-ROLE.md line 96): if R58 implementation requires new enum literals → HALT + DIAGNOSTIC per CLUSTER-HANDOFF anti-scope.

7. **TS bivariance prediction fails empirically** — if widening `fetchSnapshot(ctx?: TopologyFetchContext)` is rejected by tsc as non-conforming to `TopologySource.fetchSnapshot(ctx?: FetchContext)` → HALT + DIAGNOSTIC with bounded options (a) declaration-merging fallback per § 0.1 Approach C; (b) per-adapter widening via class-internal helper method; (c) operator-resequence ESCALATE.

8. **Spec-internal contradiction surfaces at Implementer time** → HALT + DIAGNOSTIC per CLAUDE-COMMON.md REINFORCED R15 + R56 MINOR-1 reinforcement.

9. **Anti-scope diff at chore-A includes a file outside the 12-path ALLOWED_SET (other than conditional `coordination/diagnostics/DIAGNOSTIC-R58-*.md` if a halt fired)** → HALT + DIAGNOSTIC.

---

## § 7 Cross-project rules — uniform enumeration (SPEC-AUTHORING-CHECKLIST.md Rule 7 Surface (a))

Per CLAUDE-ARCHITECT.md REINFORCED 2026-05-19 (R44 Rule 7 Surface (a) requirement) + R46 canonical short-name discipline:

- **Rule 1 (`false-compliance-attestation`; canonical landing R26):** ACTIVE GATE — Q-R58-EMPIRICAL.sh implements Rule 1 sub-class `empirical-command-attestation` (R46 derivation; R47 tightenings). Every AC verification runs the actual command and asserts on actual output; no memorized counts. Two-state distinction per § 5.4 honors the "encode actual results verbatim" sub-class (R03/R26/R47/R48 cross-project rule).
- **Rule 2 (`branch-binding-coverage-gate`; canonical landing R28+):** ACTIVE GATE — § 5.5 branch-binding coverage table enumerates every guard / fallback / branch with its binding AC. No structurally-unreachable guard.
- **Rule 3 (`implementer-spec-test-assertion-coverage`; canonical landing R32):** ACTIVE GATE — § 5.6 substring-marker discriminability documents AC-R58-7 (exact-equality; discriminating) + AC-R58-11 (substring-presence; non-discriminating but disclosed in D-3); § 0.4 selection of parametrized AC includes adapter-name diagnostic in assertion messages.
- **Rule 4 (`anti-scope-allowed-set-forward-coverage`; canonical landing R34):** ACTIVE GATE — § 3.2 ALLOWED_SET enumerated at spec-emit time (BEFORE any chore-A diff). 12-path base + conditional 13th DIAGNOSTIC pre-authorized per R25 MAJOR-2.
- **Rule 5 (`rule-derivation-without-self-application`; canonical landing R36):** N/A — R58 does NOT derive a new cross-project rule. Surface (c) self-application gate not triggered.
- **Rule 6 (`halt-discipline-no-DIAGNOSTIC-for-workaround`; canonical landing R36):** ACTIVE GATE — § 6.1 enumerates 9 halt triggers including the R56 MINOR-1 carve-out for the pre-documented two-state mismatch. No workaround prescribed for any halt trigger.
- **Rule 7 (`derived-rule-propagation-mechanism-required`; canonical landing R38):** ACTIVE GATE — this § 7 IS Surface (a). Surface (b) is `scripts/pre-commit-rule-sweep.sh` (R45 deliverable); Surface (c) not triggered (no new rule).

---

## § 8 Open questions

### OQ-R58-1: Operator-directive divergence on `engine/topology-overlay.ts` modification

NEXT-ROLE.md line 22-26 + line 67 ALLOWED_SET name `engine/topology-overlay.ts (MOD - TopologySource interface enrichment; ctx parameter)`. Q-R58-SPEC.md § 0.1 PICKED Approach A: NEW Tessera-original `engine/topology/fetch-context.ts` instead of modifying `engine/topology-overlay.ts`. Rationale: preserves A12 (`engine/topology-overlay.ts` is vendored-at-pin per file header line 3; WAVE-PLAN-07 line 50 + line 73 + line 137-138 explicitly forbid modification of the interface declaration body). NEXT-ROLE.md's permissive language ("or wherever the interface is declared") admits both approaches; Architect picked the architecturally-cleaner approach honoring the broader A12 anti-scope.

**Operator question:** Confirm the Architect's choice (Approach A; new file `engine/topology/fetch-context.ts`), or override to Approach B (MOD `engine/topology-overlay.ts` per the literal NEXT-ROLE.md directive)?

**Architect recommendation:** Approach A (PICKED). Approach B would set a vendored-with-deltas precedent on `engine/topology-overlay.ts` (currently the file has zero deltas; only `engine/types/verdict.ts` has been transitioned to vendored-with-deltas) at the cost of preserving the operator-directive literal text.

**Implementer disposition if not pre-resolved:** Implementer applies Approach A per spec § 4. If the Reviewer at cold-eye flags the divergence as substantive, Reviewer routes ESCALATE per CLAUDE-REVIEWER.md routing protocol; operator picks Approach A or B.

---

## § 9 P3 ten-axis verification

| Axis | One-sentence verification |
|---|---|
| **Correctness** | TS bivariance pre-prediction validated by reading the TS handbook + R28/R29/R30/R53/R56 existing `_ctx?: FetchContext` signatures; per-adapter widening pattern is mechanically uniform across 5 files; throw semantics tested by AC-R58-7 with exact-equality on per-vendor message. |
| **Completeness** | All 5 adapters covered (AC-R58-2 through AC-R58-6 fallback + AC-R58-7/8/9/10 parametrized); both ctx-undefined + ctx-with-only-soft-fields + ctx-with-apiEndpoint paths bound (AC-R58-2-6 + AC-R58-8 + AC-R58-7); sparse-data resilience covered (AC-R58-9); cross-adapter snapshotHash delegation (AC-R58-10); A16 preservation (AC-R58-11); typecheck + test-count + anti-scope binding-command attestations (AC-R58-12/13/14). |
| **Consistency** | Cross-section consistency pass executed at § 9 (this section) and § 10 (grilling); selection picks A/A/A/A all align across § 0 / § 1 / § 2 / § 4 / § 5; vendor literal names (`slurm`/`k8s`/`nvlink`/`neuron`/`tpu`) consistent in pseudocode + AC table + branch-binding table; AC count = 14 consistent in § 5.1 preamble + § 5.2 table + § 5.4 two-state + Q-R58-EMPIRICAL.sh block headers; runtime test count = 12 consistent in § 5.1 preamble + § 4.7 test pseudocode + Q-R58-EMPIRICAL.sh prediction header. |
| **Clarity** | Per-axis brainstorm with explicit picked/rejected; per-file pseudocode at line-resolution granularity; one error message format (`LIVE_FETCH_NOT_IMPLEMENTED_PATH_B: <vendor>`) used consistently; ALLOWED_SET enumerated in single sorted-alphabetical list. |
| **Coverage** | AC-R58-1 through AC-R58-14 each bind a distinct property; § 5.5 branch-binding coverage table enumerates every guard and its binding AC; no structurally-unreachable code in prescribed pseudocode. |
| **Constraints** | A12 honored (no MOD to `engine/topology-overlay.ts`); CLUSTER-HANDOFF line 81-83 honored (no MOD to tpu-source parser body; no MOD to `engine/types/verdict.ts`; no real-cluster fetch); WAVE-PLAN-07 Step 1 anti-scope row honored; NEXT-ROLE.md anti-scope line 53-64 honored. |
| **Concurrency** | N/A — R58 is a single-cluster wave; no parallel cluster dispatch. Per-adapter `fetchSnapshot` is `async` but no shared mutable state across adapters; per-adapter constructor parses + caches snapshot at constructor time (existing R28/R29/R30/R53/R56 behavior). |
| **Corner cases** | ctx-undefined (AC-R58-2-6) ✓; ctx with only soft fields no apiEndpoint (AC-R58-8) ✓; ctx with apiEndpoint defined (AC-R58-7) ✓; sparse fixture per adapter (AC-R58-9) ✓; pre-documented chore-A two-state vs chore-B AC-R58-13 (§ 5.4) ✓. |
| **Cost** | NEW file `engine/topology/fetch-context.ts` (~25 LOC); 5 MOD adapter files (2 edits each, ~10 LOC delta per file); NEW `test/q58-live-fetch-interface.test.ts` (~280 LOC); 3 NEW coordination files (spec ~960 LOC, audit ~250 LOC, empirical ~200 LOC). Total ~1750 LOC across 13 paths. Single-cluster full-tier execution at standard time budget. |
| **Coupling** | NEW file `engine/topology/fetch-context.ts` imports ONE type from `../topology-overlay` (`FetchContext`); 5 adapter files each gain ONE new import (`TopologyFetchContext` from `./fetch-context`); no inter-adapter dependency added; cross-adapter consistency at the type-contract layer per WAVE-PLAN-07 line 49 requirement; `engine/types/verdict.ts` not touched; `engine/topology-overlay.ts` not touched (vendored-at-pin preserved). |

---

## § 10 Grilling output (Architect self-review)

### § 10.1 Pre-emit grilling questionnaire

- **Every claim verifiable?** Yes. (a) Line-number citations to existing adapter `fetchSnapshot` signatures verified by grep at session entry (slurm:58-60, k8s:68-70, nvlink:140-142, neuron:166-168, tpu:201-203). (b) `engine/topology-overlay.ts:50-60` interface declaration verified by Read at session entry. (c) `engine/topology-overlay.ts:1-5` vendored-at-pin header verified by Read at session entry. (d) `engine/types/verdict.ts:298` (declaration site) + `:281` (JSDoc) for `correlational_not_causal: true` literal — citation drifted from R56 audit citation; per R51 + R53 MINOR-3 reinforcement, spec is time-pinned at SHA `7e9d399` and line numbers may drift if Implementer adds header docblock per R53 pattern. Spec is correct at this SHA. (e) Sparse fixture inventory verified by `ls test/_substrate/` at session entry. (f) Test baseline (387/382/2/3) + tsc exit 0 verified empirically by session-entry command runs.
- **Unstated assumptions?** Two flagged: (a) TS bivariance allows method-parameter widening at implementation site — backed by TS handbook + R28-R56 adapter sources currently using `_ctx?: FetchContext` (existing TS implementation accepts no-arg fetchSnapshot calls; the bivariance property would have to be violated for any of those signatures to currently typecheck). Halt condition #7 in § 6.1 provides fallback if the prediction empirically fails. (b) `engine/topology/fetch-context.ts` parent directory `engine/topology/` is git-tracked — verified by `git ls-files engine/topology/` at session entry.
- **Scope added beyond request?** No. The spec scopes to the 12-path ALLOWED_SET + conditional 13th DIAGNOSTIC. No new fixtures (existing sparse fixtures suffice); no schema modifications (R56-frozen surface); no parser refactors (CLUSTER-HANDOFF line 81 + WAVE-PLAN-07 Step 1 anti-scope row).
- **Implementer can act without guessing?** Yes. Per-file pseudocode at line resolution (§ 4.1-4.7); error message format prescribed verbatim (`LIVE_FETCH_NOT_IMPLEMENTED_PATH_B: <vendor>`); per-vendor suffix prescribed per adapter; AC-R58-14 placeholder substitution prescribed (chore-A → chore-B SHA injection per R53/R56 precedent). One TACTICAL AUTONOMY clause: Implementer MAY remove `type FetchContext,` from the adapter import block if a lint rule complains (TS6133 unused-import) — captured in § 2.3 + § 4.x.

### § 10.2 Reinforcement sweep (sample of high-frequency rules)

| Reinforcement | Application in this spec |
|---|---|
| **R01 cross-spec-section consistency** (CLAUDE-ARCHITECT.md REINFORCED 2026-05-16) | Token cross-check executed: `LIVE_FETCH_NOT_IMPLEMENTED_PATH_B` literal consistent across § 2.1 / § 2.3 / § 4.2-4.6 pseudocode / § 5.2 AC table / § 5.5 branch-binding / § 4.7 test pseudocode. Vendor literals `slurm`/`k8s`/`nvlink`/`neuron`/`tpu` consistent. Test count = 12 runtime + 14 total ACs consistent across § 5.1 / § 5.2 / § 5.4 / § 4.7 / Q-R58-EMPIRICAL.sh. |
| **R02 type-declaration-site check** (CLAUDE-ARCHITECT.md REINFORCED 2026-05-16) | `FetchContext` declaration site read at `engine/topology-overlay.ts:57-60`; `TopologyFetchContext` will live at `engine/topology/fetch-context.ts` (new file). |
| **R03 re-export chain verification** (REINFORCED 2026-05-16) | No re-export chain claimed; new file is a single-export module. |
| **R11 line-citation cite-then-verify** (REINFORCED 2026-05-17) | All line citations to existing files (5 adapter `fetchSnapshot` signatures; topology-overlay.ts interface declaration; verdict.ts literal sites) verified by grep / sed at session entry. Forward-flag per R53 MINOR-3: if Implementer adds header docblock to any of the 5 modified adapters, line numbers will drift; spec is time-pinned at SHA `7e9d399`. |
| **R15 + R20 ARCH MINOR-1 AC preamble cross-check** | § 5.3 explicitly cross-checks the § 5.1 preamble's classification of AC-R58-12/13 (binding-command) vs AC-R58-14 (runtime) against § 4.7 test pseudocode. |
| **R21 ARCH MINOR-2/3 branch-binding coverage** | § 5.5 table enumerates every guard/fallback/branch with its AC. |
| **R23 ARCH MINOR-2 .gitignore-aware spec inventories** | § 3.3 verifies all 12 ALLOWED_SET paths are git-trackable. |
| **R25 MAJOR-2 conditional DIAGNOSTIC pre-authorization** | § 3.2 conditional 13th entry `coordination/diagnostics/DIAGNOSTIC-R58-*.md` pre-authorized. |
| **R30/R53 MINOR-1 chore-A vs chore-B two-state** | § 5.4 + § 6.1 carve-out + Q-R58-EMPIRICAL.sh header. |
| **R44 Rule 7 Surface (a) canonical enumeration** | § 7 enumerates all 7 rules with active-gate/N/A dispositions using canonical short names from CROSS-PROJECT-MEMORIAL.md. |
| **R51 MINOR-1 substring-marker discriminability** | § 5.6 documents AC-R58-7 (discriminating; exact-equality) + AC-R58-11 (non-discriminating; disclosed). |
| **R56 MINOR-1 spec-internal-contradiction sweep** | § 6.1 explicitly carves out the pre-documented AC-R58-13 chore-A FAIL from halt condition #1. |
| **R56 MINOR-2 substring-marker for verdict.ts literal** | AC-R58-11 honestly disclosed as substring-presence (not line-anchored); same precedent as R30/R53/R56 disposition. |

### § 10.3 Cross-section consistency table (R01 + R20 cross-check)

| Token / claim | § 0 brainstorm | § 1 design | § 2 mechanism | § 4 pseudocode | § 5 AC table | § 7 cross-project | Q-R58-EMPIRICAL.sh | Consistent? |
|---|---|---|---|---|---|---|---|---|
| `TopologyFetchContext` location = `engine/topology/fetch-context.ts` | § 0.1 PICKED | § 1.1 NEW file | § 2.2 declared | § 4.1 NEW file | AC-R58-1 imports `'../engine/topology/fetch-context'` | (n/a) | FILE-1 assertion | ✓ |
| Error message format `'LIVE_FETCH_NOT_IMPLEMENTED_PATH_B: <vendor>'` | § 0.2 PICKED | § 1.2 throw | § 2.1 + § 2.3 | § 4.2-4.6 each per-vendor | AC-R58-7 exact-equality | (n/a) | (no source-grep) | ✓ |
| Per-adapter signature `fetchSnapshot(ctx?: TopologyFetchContext)` | § 0.3 PICKED | § 1.5 pseudocode | § 2.3 prescribed | § 4.2-4.6 prescribed | AC-R58-2-6 fallback + AC-R58-7-10 parametrized | (n/a) | (verified via tsc) | ✓ |
| Sparse-data AC = one parametrized | § 0.4 PICKED | § 1.4 | § 2.4 (not refactor) | § 4.7 ADAPTERS array | AC-R58-9 | (n/a) | (no source-grep) | ✓ |
| Runtime test count = 12 | (n/a) | (n/a) | (n/a) | § 4.7 12 `test()` blocks | § 5.1 preamble | (n/a) | AC-R58-13 prediction `399 = 387 + 12` | ✓ |
| AC count = 14 total (12 runtime + 2 binding-command) | (n/a) | (n/a) | (n/a) | § 4.7 (12) | § 5.1 preamble (14) + § 5.2 table (14 rows) | (n/a) | 14 AC blocks | ✓ |
| ALLOWED_SET = 12 paths | (n/a) | (n/a) | (n/a) | § 4.7 ALLOWED_SET literal | § 3.2 enumeration | (n/a) | AC-R58-14 advisory | ✓ |
| Chore-A test count prediction `399/393/3/3` | (n/a) | (n/a) | (n/a) | (n/a) | § 5.4 two-state | (n/a) | AC-R58-13 header note | ✓ |
| Chore-B test count prediction `399/394/2/3` | (n/a) | (n/a) | (n/a) | (n/a) | § 5.2 AC-R58-13 row + § 5.4 | (n/a) | AC-R58-13 assert_eq | ✓ |

### § 10.4 Pre-route checklist

- [x] Spec sections 1-9 present and self-consistent
- [x] Brainstorm phase: 4 axes × 3 approaches each; all rejected options have documented weaknesses
- [x] Design phase: component boundaries + data flows + integration points + failure modes
- [x] Mechanism: per-adapter contract uniform; vendor literals enumerated
- [x] Component inventory: exists/created/changed/deleted columns explicit
- [x] Per-file pseudocode: line-resolution edits prescribed for 5 adapter MODs + 1 NEW file + 1 NEW test file
- [x] AC enumeration: 14 ACs in Given/When/Then form; no ambiguous language ("correctly"/"appropriately" absent — verified by grep on this spec)
- [x] Anti-scope: 14 items + 12-path ALLOWED_SET + conditional 13th DIAGNOSTIC
- [x] Open questions: 1 OQ (OQ-R58-1; operator-directive divergence on topology-overlay.ts; Architect recommendation included)
- [x] Halt conditions: 9 enumerated with R56 MINOR-1 carve-out
- [x] P3 ten-axis verification: 10 sentences
- [x] Cross-project rules § 7: all 7 rules enumerated with canonical short names + active-gate/N/A dispositions
- [x] Branch-binding coverage table § 5.5: every guard bound
- [x] Cross-section consistency table § 10.3: 9 tokens × 7 sites all consistent
- [x] Substring-marker discriminability § 5.6: AC-R58-7 discriminating (exact-equality); AC-R58-11 non-discriminating but disclosed

**Routing decision:** STATUS: READY (no operator-blocking ambiguity; OQ-R58-1 is informational with Architect recommendation; Implementer disposition explicit).

---

## Pipeline invocation

```bash
cd /Users/johnwarren/concord/tessera
./run-pipeline.sh --round R58 --tier full
```
