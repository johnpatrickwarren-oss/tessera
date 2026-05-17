# Q-R18-SPEC-AUDIT.md — Architect ceremony sidecar

Companion to `Q-R18-SPEC.md`. Per CLAUDE-ARCHITECT.md convention, this sidecar carries audit-trail content the Implementer does NOT need to read to act on the spec. Reviewer reads both files; Memorial-Updater reads as needed.

---

## 1. Inputs consulted (cold-start at session entry)

| Artifact | Read mode | Purpose |
|---|---|---|
| `coordination/PRD.md` | full (93 lines) | FR-E1/E2/E3 + AC-P1/P4 + anti-scope A8/A11/A12/A16/A17 |
| `coordination/NEXT-ROLE.md` | full (131 lines) | Operator-set R18 scope, halt conditions, pre-R18 baseline, coordination chore, post-R18 chain |
| `coordination/MEMORIAL.md` | targeted offset reads (lines 1500-1668) + grep | R15 / R16 / R17 sections + R02 Memorial-D classification context |
| `~/.claude/CROSS-PROJECT-MEMORIAL.md` | head (line counts only) + grep for "Reinforcement rules derived" | Confirmed 39 reinforcement-section headings exist; full-file size 500.7KB exceeds 256KB single-read limit. Cross-cutting reinforcements inherited via CLAUDE-COMMON.md + CLAUDE-ARCHITECT.md REINFORCED lines (17 ARCH + 1 COMMON + reinforcements in scope of NEXT-ROLE.md instruction set) |
| `coordination/SCOPING-MEMO-v0.3.md` | targeted greps for `v9X`, `Phase 2 SLICE 1`, `cluster_event_id`, `TopologyNode.kind`, `Addition #25 D2/D5`, §§ 2.3, 9, Q-J4, Q-J5 | v0.3 § 2.3 SLICE 1 row (line 344); § 9.4 vendoring policy (line 557); Q-J4 disposition (line 434-438) |
| `coordination/PHASE-1-CLOSE-WALK.md` | offset 240-300 | Q-J4(i) SLICE 1 minimum-viable disposition (line 250); TQ-1 disposition (β) confirmed (line 257-273) |
| `engine/types/verdict.ts` | full (303 lines) | TopologyNode declaration verdict.ts:212-219; TopologyEdge declaration verdict.ts:222-229; VerdictGroup declaration verdict.ts:170-194; TopologyCandidate.correlational_not_causal:261 |
| `engine/topology-overlay.ts` | full (394 lines) | BFS bidirectionality verified (lines 262-285); computeSnapshotHash relationship-lex-sort verified (lines 71-75) |
| `engine/verdict-groups.ts` | offset 140-235 | VerdictGroup factory openGroup verified at lines 145-163; group_id format `group-${deployId}-${window_start_ts}` verified at line 142 |
| `engine/types/` directory listing | bash ls | Confirmed verdict.ts is the single declaration site for Topology* + VerdictGroup |
| `test/_substrate/factories.ts` | head 80 | Convention `make<TypeName>(overrides?)`; shallow-merge opts pattern adopted by v9X module |
| Repo-wide grep | `TopologyNode|TopologyEdge|kind ===|relationship ===|\.kind\b|\.relationship\b` across engine/, tools/, src/, test/ | Verified no exhaustive switches on TopologyNode.kind or TopologyEdge.relationship anywhere |
| Repo-wide grep | `VerdictGroup\b` across engine/, tools/, src/, test/ | Identified all consumer sites; verified additive optional field is safe |

**Files NOT consulted (cold-start discipline):**
- prior Reviewer reports REVIEWER-REPORT-R02 through REVIEWER-REPORT-R17.md (except R17 cited via NEXT-ROLE.md attestation context)
- coordination/diagnostics/ contents (existence-check only; none for R18)
- coordination/logs/ contents
- `.prompt-*.md` files
- prior round specs Q-R01 through Q-R17 (architectural decisions inherited via SCOPING-MEMO-v0.3.md + NEXT-ROLE.md only)

---

## 2. Citation-accuracy notes (NEXT-ROLE.md → actual file)

Per the R11 reinforcement (extract specific cited lines; verify identifier names), I verified each cited location:

| NEXT-ROLE.md citation | Actual location | Status |
|---|---|---|
| "Addition #25 VerdictGroup declaration site at `engine/types/verdict.ts:141-188`" | `engine/types/verdict.ts:170-194` | Cited range is ~30 lines off relative to current file state; the actual VerdictGroup interface declaration body. Inherited from v0.3 § 1.6 REVIEWER-ANCHOR table (file evolved across vendoring + R01-R17 work). **Spec uses corrected 170-194 citation.** |
| "Addition #26 TopologyNode/TopologyEdge at `engine/topology-overlay.ts:40-43`" | `engine/topology-overlay.ts:32-42` (import statement; NOT declaration) and `engine/types/verdict.ts:212-219` (TopologyNode actual declaration), `:222-229` (TopologyEdge actual declaration) | NEXT-ROLE.md cited the import-statement lines, not the declaration sites. **Spec uses corrected verdict.ts:212-219 + :222-229 citations.** |
| "TopologyCandidate context at `engine/types/verdict.ts:237-240`" | `engine/types/verdict.ts:246-262` (TopologyCandidate interface declaration) | Cited range refers to TopologySnapshot fields (lines 237-240), not TopologyCandidate. **Spec uses corrected 246-262 citation; Addition #26 D4 literal-true field at line 261 specifically.** |

These citation drifts do NOT affect deliverables (deltas are correctly targeted at the actual declaration sites). They are noted here so the Reviewer's citation-accuracy audit can cross-reference.

---

## 3. Pre-route discipline application log

### 3.1 Skill 14 (PRD conjunction cross-check) applied

For each R18-SHIPS item, cross-checked against PRD FR/AC entries:
- TopologyNode.kind extension ← FR-E3a (Phase 2 outer aggregator) ← AC-P4
- TopologyEdge.relationship extension ← FR-E3b (topology-aware spatial attribution); SLICE 1 ships the type-surface, SLICE 3 ships consumer
- VerdictGroup.cluster_event_id ← FR-E3a + FR-E3c (event-conditional correlational attribution); SLICE 1 ships the field, SLICE 2 wires aggregator
- v9X fixture ← R-E3 (synthetic-cluster substrate decoupling); load-bearing for SLICE 3 PR-F6 pair-review test infra
- New test file ← bound to the 5 items above + inherited-contract preservation (D2/D5/D4) + vendoring-pin preservation

No PRD claim is unbound; no spec deliverable is unscoped.

### 3.2 Skill 15 (file-opened-discipline paired with candidate-set enumeration) applied

Per MD-F6 sub-class discipline: candidate-set enumeration is paired with file-opened verification.
- Candidate types touched: TopologyNode, TopologyEdge, VerdictGroup, TopologySnapshot, TopologyCandidate → all declaration sites opened at `engine/types/verdict.ts`.
- Candidate consumers: topology-overlay.ts (BFS, hash, Enricher), verdict-groups.ts (factory), agent.ts + orchestration.ts (parameter-only) → all opened or grep-verified.
- Candidate fixture modules: factories.ts (cell-domain) → opened to confirm v9X is a separate domain, not an extension.

### 3.3 R02 cross-section consistency pass (11th consecutive application)

Token table — each row's token usage byte-checked across Mechanism + Component inventory + Per-file pseudocode + Acceptance criteria + Anti-scope:

| Token | Mech | Inv | Pseudo | AC | Anti |
|---|---|---|---|---|---|
| `'gpu_shard'` | ✓ | ✓ | ✓ | ✓ | (n/a — not anti-scoped) |
| `'rack'` | ✓ | ✓ | ✓ | ✓ | (n/a) |
| `'contains'` | ✓ | ✓ | ✓ | ✓ | (n/a) |
| `cluster_event_id` | ✓ | ✓ | ✓ | ✓ | (n/a) |
| `makeV9XSingleRackCluster` | ✓ | ✓ | ✓ | ✓ | (n/a) |
| `v9X_synthetic_single_rack` | ✓ | (n/a) | ✓ | ✓ | (n/a) |
| `b640c6c` | ✓ | ✓ | ✓ | ✓ | (n/a) |
| `5a72371` | ✓ | ✓ | ✓ | ✓ | (n/a) |
| `'psu'` / `'cooling_zone'` | (excl.) | (n/a) | (n/a) | (n/a) | ✓ |
| `'nvlink_peer'` / `'shares_psu'` / `'co_located_in_rack'` | (excl.) | (n/a) | (n/a) | (n/a) | ✓ |
| HardwareTopologySource | (excl.) | (n/a) | (n/a) | (n/a) | ✓ |

All consistent.

### 3.4 R03 verification-command-soundness pass

Per § 9.5 of the spec: AC-R18-7, -8, -9 grep patterns all checked for false-positive matches in comments. All sound.

### 3.5 R08 empirical-premise-verification pass

Per § 9.7 of the spec: all load-bearing premises verified by direct file open or grep, not inherited testimony. The single inherited premise (40 vendored files) is re-verified empirically by AC-R18-9 at Implementer GREEN.

### 3.6 R09 correction-propagation pass

For each cross-cutting change:
- VerdictGroup.cluster_event_id additive optional → consumers enumerated: verdict-groups.ts factory (verified safe, no factory change), agent.ts:81 (parameter typing only), orchestration.ts:182 (parameter typing only), topology-overlay.ts:213/288/333 (read-only access). All safe under additive optional.
- TopologyNode.kind extension → consumers enumerated: topology-overlay.ts (BFS + hash, no switch on kind), no test consumers, no tools/ or src/ consumers. Safe under additive union.
- TopologyEdge.relationship extension → consumers enumerated: topology-overlay.ts:71-75 lex-sort (additive-safe), topology-overlay.ts:262-285 BFS (no switch). Safe.

### 3.7 R10 docblock-coverage check on modified files

`engine/types/verdict.ts` has a file-header docblock (lines 1-5 + 7-8). Delta 4 prescribes adding an amendment-annotation block AFTER line 5; the existing module-purpose comment at line 7-8 remains accurate (it describes the file's full scope as Scenario / orchestrator / fusion / detector-verdict / verdict-group / topology overlay artifacts — still all present after deltas). No further docblock changes needed.

### 3.8 R15 anti-scope-baseline check

Baseline `b640c6c` cross-verified against R18 prep commit (`chore(R18): log R17 close + prepare NEXT-ROLE.md for Phase 2 SLICE 1`). No operator-prep commits land between session start and Architect work; baseline is correct. AC-R18-10 allowed-set explicitly includes spec-mandated paths (Q-R18-SPEC.md + Q-R18-SPEC-AUDIT.md) — no spec-mandate-vs-allowed-set internal contradiction.

---

## 4. Architect pre-prediction on outcomes

**Test count.** GREEN total expected = 171 + 10 = **181 pass / 0 fail**; per-file q18 count = **10/0**. Implementer reports OBSERVED.

**Vendoring-coverage regression at q01.** Prediction: **0 failures**. Delta 4 placement preserves lines 1-5 byte-identically; first-line SHA pin check passes.

**Typecheck regression.** Prediction: **exit 0**. All three deltas are type-additive (no removal of existing union members; no removal of required fields). The new optional field default-omitted at the inherited factory typechecks fine.

**Anti-scope diff size.** Prediction: **10 paths** in `git diff b640c6c..HEAD --name-only` at GREEN attestation (the 10 entries in AC-R18-10 allowed-set). May be fewer if compiled .js files are gitignored; AC binds subset-of-allowed, not equality.

**Reviewer findings.** Prediction: 0 CRITICAL + 0 MAJOR + 0-2 MINOR + 0-3 OBS. R18 is a small focused round with clear contracts; spec-internal contradictions cross-checked at § 9.6; pre-emit grilling 7-gate PASS. The most likely MINOR surface is a small drift in compile-output gitignore vs allowed-set bookkeeping. Implementer-discretion paths (e.g., exact comment wording in v9X-cluster.ts beyond the prescribed pseudocode) could surface OBS-class findings.

**Halt-condition firings.** Prediction: 0. All five NEXT-ROLE.md halt conditions are pre-dispositioned (D2/D5 preserved by design; kind switch verified absent; contains BFS semantic explicitly inherited; v9X format specified; scope expansion explicitly anti-scoped). No empirical premise is wrong (per § 9.7 grilling).

---

## 5. Decision rationale (long-form, why-picked / why-rejected)

(Companion to the spec's § 0 Brainstorm — extends the rationale with the long-form trade-off framing per CLAUDE-ARCHITECT.md convention.)

### 5.1 Why Approach C (hybrid in-place delta + dedicated v9X module) picked

Approach C honors three distinct constraints simultaneously:
1. **v0.3 § 9.4 vendoring-policy compliance.** The memo explicitly prescribes in-place deltas with header amendment at Phase 2 SLICE 1. Approach A also honors this; Approach B does not. So compliance narrowed the field to {A, C}.
2. **Forward-compatibility for SLICE 2-4 fixture growth.** v0.3 § 2.3 SLICE 3 enumerates "Common-mode failure-injection empirical test (rack-localized PSU event simulation on synthetic v9X cluster substrate)" — i.e., v9X grows to include PSU + cooling_zone nodes + injected events. A dedicated module accommodates this growth without churning factories.ts.
3. **Single-responsibility per module.** factories.ts is cell-domain; v9X-cluster.ts is topology-domain. Mixing erodes module purpose.

Approach A would either inline v9X in the test file (mixes test-binding with fixture-building) or extend factories.ts (mixes domains). Both are functionally equivalent at SLICE 1; both impose refactor cost at SLICE 2-3.

### 5.2 Why Approach B (Tessera-fork extension types) rejected

The fundamental problem: an inherited factory (`engine/verdict-groups.ts:147`) constructs `VerdictGroup`, not `VerdictGroupTessera`. For Phase 2 SLICE 2's outer aggregator to set `cluster_event_id` on output groups, one of three things must happen:
- modify the inherited factory to accept the extended type (defeats "vendored untouched"), OR
- widen the inherited type at the boundary in Tessera code (verbose + error-prone + N-call-site coupling), OR
- copy-and-fork the factory into Tessera scope (worst — duplicates D2/D5/D7/D8 logic that we want to inherit).

In contrast, Approach C / A's additive-optional field on the inherited type lets the inherited factory continue working unchanged AND lets Tessera SLICE 2 set the new field on the same shape the inherited factory produces. The vendoring-policy directive (v0.3 § 9.4) reflects exactly this design intent: deltas at the type-surface, not type-forks.

### 5.3 Why `'contains'` BFS bidirectional semantic accepted at SLICE 1

Two alternatives were considered:
- (a) ACCEPT inherited bidirectional BFS for `'contains'` at SLICE 1; defer directional/parent-of-aware BFS to SLICE 3+ HardwareTopologySource ADR.
- (b) Modify `engine/topology-overlay.ts:262-285` BFS to treat `'contains'` directionally (parent→child only, not child→parent).

(b) was rejected because:
- it modifies the inherited engine internals (A12/A5 anti-scope violation),
- SLICE 1's purpose is type-surface extension, not BFS-traversal refinement,
- the appropriate place to evaluate BFS-on-undirected adaptation is PR-F6 (Phase 2 SLICE 3) per v0.3 § 4.2 + § 2.3 line 213 (interface-refinement candidate explicitly tagged for PR-F6),
- a directional choice at SLICE 1 forecloses options the PR-F6 evaluation may want (e.g., the pair-reviewer may conclude that `'contains'` should be bidirectional in BFS for topology-localized common-mode detection, since shard-failure can propagate both up — "rack-level event surfaces because all shards in the rack fired" — and down — "shard fires, want to know which rack").

(a) defers the decision explicitly with full architectural-decision documentation in the spec. This is not a silent choice; it is a documented deferral with the next pair-review trigger named.

### 5.4 Why R18 ships an audit sidecar at all

R18 is full-tier; the operator round-scope (NEXT-ROLE.md line 105) confirms `--tier full` based on A2 (new architectural pattern — first Phase 2 work) + A4 (novel data model — TopologyNode.kind + TopologyEdge.relationship enum extensions + VerdictGroup interface change). Full-tier preserves the Architect-Reviewer separation; the sidecar feeds Reviewer's audit-trail review without bloating the Implementer-facing spec.

---

## 6. Amendments from prior version

None. This is the initial Q-R18-SPEC.md emission. No amendments.

---

_End of Q-R18-SPEC-AUDIT.md._
