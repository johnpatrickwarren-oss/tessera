# REVIEWER-REPORT — Q1 Phase 1 SLICE 1 Spec

_From: Reviewer (cold-context audit, single-session model)._
_To: Architect (direct route per inherited DeploySignal PROJECT-ROLES:25 + Tessera convention)._
_Date: 2026-05-16 (post-midnight overnight)._
_Audit target: `coordination/Q-01-PHASE-1-SLICE-1-SPEC.md` (committed `<tessera-sha-q1>`)._
_Scope: pre-implementation Reviewer audit at SPEC-emit fidelity — catches architect-side spec defects before Mac Claude implementation begins. Per inherited DISCIPLINE-REFERENCE:185-196 + anchor `skills/01-pre-emit-grilling.md` three-bucket adversarial pass + anchor `skills/14` + `skills/15`._

---

## Audit summary

| Class | Count | Items |
|---|---|---|
| **FAIL** | 1 | F1 inherited-engine-state-mismatch (P3.3 file-opened-discipline gap — same lineage as v0.1→v0.2 F1 finding; second occurrence in this session) |
| **GAP** | 5 | G1 file-count undercount; G2 AC-3 type-extension wording; G3 AC-7 scope; G4 missing SAS for compiled-config JSON; G5 vendored-smoke-test path imports |
| **PASS** | 4 | P1 Skill 14 PRD-conjunction; P2 Skill 15 prescription-to-AC; P3 architect grilling output (CRITICAL/LS/PE); P4 Memorial F sub-rule enumeration |

FAIL F1 gates Mac Claude implementation start — architect MUST amend Q1 spec to v0.2 with corrected inherited-engine type references before implementation begins. GAPs G1-G5 resolve in parallel (can batch into v0.2 amendment alongside F1 fix, or carry forward into Mac Claude implementation as documented open Qs).

---

## FAIL findings

### F1 — Inherited engine type-state mismatch (P3.3 file-opened-discipline gap; SECOND occurrence this session)

**Severity:** FAIL on core invariant (P3.3 file-opened; same Memorial D 8th-CONFIRMATION-class lineage as v0.1→v0.2 F1 finding — but here as a VIOLATION not a CONFIRMATION).

**Finding:** Q1 spec § Architectural mechanism + § Implementation surface cite multiple inherited-engine type-state references that don't match actual code at SHA `5a72371`. Reviewer verified by opening `deploysignal/engine/types/config.ts`:

| Spec claim | Actual at SHA `5a72371` | Spec location |
|---|---|---|
| `CellDimension` is a named typedef extending to `'shard_id'` | No `CellDimension` typedef exists. The enum is INLINED on `BaselineCellsConfig.dimensions: Array<'hour_of_day' \| 'day_of_week' \| 'workload_class' \| 'tenant_slice' \| 'tenant_tier' \| 'region'>` at `config.ts:421`. | Q1 spec § Implementation surface > `tessera/engine/types/config.ts` |
| Inherited `CellDimension` includes `'pod_id'` (Addition #12 cited) | No `'pod_id'` in the inline union at SHA `5a72371`. Addition #12 may have been documentation-only at this SHA; runtime config-layer integration was deferred. | Same |
| Inherited `CellConfidence` is `'strict' \| 'pooled' \| 'aggregate' \| 'low' \| 'none'` | Actual `BaselineCellEntry.confidence: 'strict' \| 'pooled' \| 'aggregate' \| 'none'` at `config.ts:403` — NO `'low'` value. `'low'` only appears in this file as a `default_risk_tier` value at line 136 + 686, unrelated to cell confidence. | Same |
| Implicit assumption: inherited `CompiledConfig.baseline_cells` required | Actual `baseline_cells?: BaselineCellsConfig` optional at `config.ts:95`. Implicit-required spec assumption isn't load-bearing for SLICE 1, but Memorial F sub-rule 2 (MERGE-vs-REPLACE preservation) requires architect to know the field's optionality. | Q1 spec § Implementation surface > `tessera/engine/types/config.ts` Delta 3 |

**Why it matters:**

1. **Implementer cannot follow the spec literally.** The pseudo-code at Q1 § Implementation surface > `tessera/engine/types/config.ts` shows `export type CellDimension = ...` and `export type CellConfidence = ...` — but these typedefs DON'T EXIST in the inherited code. Implementer either (a) creates new typedefs (which is a refactor beyond SLICE 1 scope) OR (b) extends the inline unions in place. Spec doesn't disambiguate.
2. **Schema extension surface is wrong.** Q1 spec claims Tessera adds `'shard_id'` to existing `CellDimension` union — but there is no `CellDimension` union to add to; there's an inline union literal on `BaselineCellsConfig.dimensions`. The actual SLICE 1 schema delta is either an inline-union extension at `config.ts:421` OR a refactor to extract `CellDimension` first.
3. **AC-3 wording is unimplementable as written.** "Inherited fields preserved byte-identical for non-Tessera-extended types" — but Tessera's extension touches inline-union literals (not standalone types), so byte-identical preservation is impossible at the AST level. Implementer needs reworded AC.

**Discipline class:** **Memorial D 22nd-VIOLATION precedent, SAME 8th-CONFIRMATION-class lineage as v0.1→v0.2 F1 (file-opened-discipline-paired-with-candidate-set-enumeration sub-variant; MD-F6 per v0.2 § 2.3 + v0.3 § 2.3).** Architect cited inherited types from memory (or from NORTH-STAR-ARCHITECTURE.md prose at Addition #2) without opening `deploysignal/engine/types/config.ts` at spec-drafting time. **This is the second occurrence of the exact same discipline gap in this session — the v0.1→v0.2 cycle memorialized MD-F6 specifically to prevent this recurrence; the discipline was not applied at Q1 spec drafting.**

Memorial D state should increment from 21V/8C → 22V/8C with this VIOLATION. The pre-disposition-emit at Q1 spec-emit time falsely claimed "Memorial D state preserved at 21V/8C; no new violations or confirmations at spec-emit" — this Reviewer pass surfaces the violation. Corrected stamp at v0.2-amendment-of-Q1: 22V/8C.

**Architect required action for Q1 spec v0.2 (or v0.3 if v0.2 nomenclature collides):**

- Open `deploysignal/engine/types/config.ts` at SHA `5a72371` AT BRIEF-DRAFTING TIME (the P3.3 discipline that was missed).
- Replace § Implementation surface > `tessera/engine/types/config.ts` Delta sections with corrected versions that either:
  - **(α)** Extend the inline unions at `BaselineCellsConfig.dimensions` and `BaselineCellEntry.confidence` in-place via `vendored-with-deltas` policy. Minimal refactor. Recommended for SLICE 1 architectural-foundation-only scope.
  - **(β)** Extract `CellDimension` + `CellConfidence` as standalone typedefs first, then extend. Adds refactor work to SLICE 1 scope; consistent with Tessera-side architectural cleanliness but inflates SLICE 1.
- Reword AC-3 to match the picked approach.
- Acknowledge Memorial D state delta 21V/8C → 22V/8C in the v0.2-amendment artifact.
- **Apply file-opened-discipline (P3.3) explicitly at v0.2-amendment time** — open the file, verify type-state, cite line numbers — to definitively close the discipline gap on the second iteration.

---

## GAP findings

### G1 — File-count undercount

Q1 spec § Implementation surface > VENDORING-MANIFEST claims "Full manifest enumerates 20-25 vendored files at SLICE 1 close." Reviewer count:

- 11 detector files (12 minus skipped `_q72-trace.ts`)
- 5 family type files (`a.ts` through `e.ts`)
- 5 core orchestration primitives (`core.ts`, `per-detector-resampler-mode.ts`, `topology-overlay.ts`, `signal-classes.ts`, `verdict-groups.ts`)
- 9 type files (`verdict.ts`, `config.ts` with-deltas, `primitives.ts`, `metrics.ts`, `orchestration.ts`, `policy.ts`, `audit.ts`, `self-normalized-fallback.ts`, `index.ts`)
- 2 vendored smoke-test files (per Q1.4 architect-pick)
- 1 vendoring script (`tools/vendor-from-deploysignal.sh`)
- 1 manifest (`coordination/VENDORING-MANIFEST.md`)
- 3 Tessera-side test files (new; not vendored: `q01-vendoring-coverage`, `q01-schema-additions`, `q01-no-detector-deltas`)
- 4 project-config files (`package.json`, `tsconfig.json`, `tsconfig.test.json`, plus implicit `.gitignore` which already exists)

**Vendored files specifically: ~32 (not 20-25).** Counting all new + modified files: ~35-40.

**Architect required action:** correct file-count in spec; minor; carries forward to manifest at implementation.

### G2 — AC-3 type-extension wording

Q1 spec AC-3 says "Inherited fields preserved byte-identical for non-Tessera-extended types." Per F1, this is technically incorrect — TypeScript inline-union literals don't byte-identical-preserve when extended; the extension touches the literal itself. Wording assumes a typedef-based extension that doesn't exist.

**Architect required action:** reword AC-3 along the lines of "Inherited type definitions in `BaselineCellsConfig`, `BaselineCellEntry`, and `CompiledConfig` are extended additively at SLICE 1; inherited fields and inherited union values preserved verbatim; only Tessera-specific union values + new optional field added." Reframes "byte-identical at file level" → "additively extended at type level."

### G3 — AC-7 scope

Q1 spec AC-7: "Every vendored detector file at `tessera/engine/detectors/*.ts` is byte-identical to source modulo the header block." But:
- AC-4 says core + orchestration primitives are "vendored at-pin; NO Tessera deltas at SLICE 1."
- The same byte-identity invariant should defensively apply to core + orchestration vendored-at-pin files.

`q01-no-detector-deltas.test.ts` test only iterates `VENDORED_DETECTOR_FILES`; doesn't cover at-pin-vendored core / orchestration / type files.

**Architect required action:** broaden AC-7 + corresponding test to cover ALL `vendored-at-pin` files (everything except `config.ts` which has deltas). Add to `q01-no-detector-deltas.test.ts` iteration list (rename to `q01-no-at-pin-deltas.test.ts` for accuracy).

### G4 — Missing SAS for compiled-config JSON

§ Anti-scope enumerates 8 SLICE-1-specific SAS clauses but doesn't explicitly anti-scope:

- **Tessera-specific compiled-config JSON file** (e.g., `tessera/runs/compiled-configs/tessera-v1-fleet.json`) is NOT a SLICE 1 deliverable. Schema declarations land at SLICE 1; actual compiled-config files (parallel to inherited `deploysignal/runs/compiled-configs/v4-fusion-novelty.json`) are SLICE 2-3 scope when per-shard residual runtime population lands.

Tempting absorption candidate: implementer might create a placeholder compiled-config to drive smoke-tests. Explicit SAS prevents.

**Architect required action:** add SAS-9 "NO Tessera-specific compiled-config JSON file at SLICE 1; schema declarations only."

### G5 — Vendored smoke-test path imports

Q1.4 architect-pick vendors `test/betting-e-process-class-dispatch.test.ts` and `test/ville-preservation-per-profile.test.ts` "at-pin" from DeploySignal into `tessera/test/`. But these tests have inherited import paths like `../engine/detectors/betting-e-process` that resolve correctly in DeploySignal's tree (test/ → ../engine/) but ALSO resolve correctly in Tessera's tree (test/ → ../engine/) GIVEN identical directory structure.

**HOWEVER:** if Tessera's `tsconfig.json` path mappings differ from DeploySignal's (per Q1.1 architect-pick "adapt path mappings only"), the imports may break.

**Architect required action:** clarify in Q1 spec OQ-2 that path-mapping adaptation must preserve relative-path resolution AND `@tessera/*` mappings must be consistent if added. Smoke-test compatibility is the validation gate. Implementer halt-and-route-back if smoke-tests fail to compile/run.

---

## PASS findings (what holds up)

### P1 — Skill 14 PRD-conjunction-cross-check application

Q1 spec § Pre-route discipline > Skill 14 table enumerates 11 conjuncts from v0.3 § 3 Phase 1 SLICE 1 + § 9 vendoring policy + PRE-DISPOSITION Q-Js. Every conjunct binds to AC or anti-scope. Reviewer verified by re-checking each row against the v0.3 source; no undisclosed narrowings. PASS.

### P2 — Skill 15 prescription-to-AC-coverage application

Q1 spec § Pre-route discipline > Skill 15 table enumerates 12 prescriptions; each binds to ≥1 AC with mutation-check semantics. Reviewer verified by re-checking each row against § Implementation surface + § Acceptance criteria; no uncovered prescriptions. PASS.

### P3 — Architect grilling pass output (CRITICAL/LIKELY-SURFACES/PRE-EMPTABLE)

Q1 spec § Pre-route discipline > Architect grilling pass: 0 CRITICAL / 3 LIKELY-SURFACES / 5 PRE-EMPTABLE. Reviewer verified the 8 enumerated items are accurately classified. PASS (with the note that F1 itself would be a CRITICAL if architect had applied P3.3 file-opened-discipline at draft time — but architect's own grilling pass missed it because the discipline gap was at the layer above the grilling).

### P4 — Memorial F sub-rule enumeration

Q1 spec § Pre-route discipline > Memorial application correctly enumerates which inherited Memorial F sub-rules fire (sub-rules 1, 2, 3, 4 all fire at SLICE 1 per Tessera's compile-time-substrate-modification + ADR-walking + new-AC scope). Reviewer verified application is comprehensive. PASS.

---

## Cross-cutting checks

| Check | Result | Notes |
|---|---|---|
| α-budget bookkeeping | N/A at SLICE 1 (no α-budget runtime semantics; SLICE 3 territory). | |
| No-skip policy on statistical-invariant tests | PASS (no test skips at SLICE 1; vendored smoke-tests + 3 new Tessera tests all run). | |
| Memorial cross-references current at file-state | FAIL → see F1 | Architect cited inherited types without opening `engine/types/config.ts`; v0.2 amendment closes. |
| Compiled artifact state opened (P3 axis #5) | N/A at SLICE 1 (no compiled-config artifact yet; schema-declarations only). | |
| Test count drift | N/A (no STATUS.md / CHEAT-SHEET.md in Tessera yet; first cycle). | |

---

## Discipline-archive significance

1. **MD-F6 file-opened-discipline failed twice in the same session.** v0.1→v0.2 F1 was the first occurrence (architect missed Addition #25/#26 primitives at v0.1 brief-drafting); Q1 spec → Q1-Reviewer F1 is the second (architect missed actual `CellDimension`/`CellConfidence` enum values at Q1 brief-drafting time). **Significance:** memorializing MD-F6 as a Memorial D candidate-set entry at v0.2 / v0.3 did NOT prevent recurrence at Q1 spec-emit. The discipline-application-gap pattern is stickier than the memorialization itself; **at v0.2-amendment-of-Q1 the architect must apply file-opened-discipline EXPLICITLY (as a checklist item, not as a mental note)** to definitively close. Pattern worth tightened-memorial.

2. **Cold-context Reviewer at SPEC-emit caught what architect grilling missed.** Architect's own pre-emit grilling pass enumerated 0 CRITICAL / 3 LS / 5 PE — but the grilling itself was conducted under the same file-opened-discipline gap that produced F1. Cold-context Reviewer (operating fresh, opening the actual files) catches what architect's own grilling structurally cannot. **Significance:** the discipline-archive observation in v0.2 § 8 item 10 (Skill 14 catches both narrowings AND widenings) generalizes — Reviewer-cold-context-vs-Architect-grilling at SPEC fidelity AND at SCOPE-PROPOSAL fidelity both catch the file-opened-discipline class.

3. **Memorial D state delta: 21V/8C → 22V/8C** (single VIOLATION classification for F1; same 8th-CONFIRMATION-class lineage; second sub-instance within the MD-F6 sub-variant in this session). Update at v0.2-amendment-of-Q1.

4. **First Tessera-specific Reviewer cycle establishes single-Reviewer cold-context audit pattern.** Hybrid Reviewer commitment per inherited Anchor `HYBRID-REVIEWER-DESIGN.md` is NOT MANDATORY at SLICE 1 (architectural-foundation-only); single-Reviewer cold-context sufficient AND demonstrated effective at F1 catch. Hybrid Reviewer becomes mandatory at SLICE 3 + Phase 2 SLICE 3 + Phase 2 close walk per inherited commitment.

5. **The forward-commitment in Q1 spec § Discipline-archive item 2 (Skill 14 + 15 pre-route gate application) was honored** but couldn't prevent F1 because F1 originates in a P3 axis discipline (P3.3 file-opened), not in Skill 14 or Skill 15. Skill 14 + 15 verify conjunct/prescription coverage given the types are correct; they don't verify type correctness against inherited source. **The complementary disciplines (P3.3 + Skill 14 + Skill 15) need joint application** — Skills 14 + 15 alone are insufficient. Worth flagging as candidate Anchor-memorialization (Skill 14 + 15 application MUST be paired with file-opened-discipline; otherwise covers conjuncts but doesn't verify correctness).

---

## Routing

Per inherited DeploySignal PROJECT-ROLES:25: REVIEWER-REPORT flows DIRECTLY to Architect for disposition (NOT via TPM). Tessera convention inherits this.

**Architect required next-step:**
- Disposition each finding (F1 AMENDED; G1-G5 AMENDED or DEFERRED).
- Amend Q1 spec to v0.2-of-Q1 with F1 + G1-G5 fixes. Specifically apply file-opened-discipline (P3.3) EXPLICITLY at brief-drafting time as a checklist item per Discipline-archive significance item 1 above.
- Update Memorial D state stamp: 21V/8C → 22V/8C.
- After v0.2-of-Q1 emit, Mac Claude implementation can proceed (still gated on John's Q-J6 disposition AND Q-J1..Q-J5 confirmation).

**TPM (downstream of architect):**
- Route v0.2-of-Q1 to John alongside SCOPING-MEMO-v0.3 + PRE-DISPOSITION + this REVIEWER-REPORT.
- John's review covers: (i) confirm/amend Q-J1..Q-J5 PRE-DISPOSITION; (ii) disposition Q-J6 (escalated); (iii) note Memorial D state delta + Q1 v0.2 amendments; (iv) authorize or defer Mac Claude implementation start.

---

_Report authored: 2026-05-16 (post-midnight, overnight cycle). Audit duration: ~30 min cold-context Reviewer pass. Format consistent with inherited DeploySignal REVIEWER-REPORT-NN.md project convention (DISCIPLINE-REFERENCE:185-196). For the Q1 spec this report audits, see `coordination/Q-01-PHASE-1-SLICE-1-SPEC.md`._

_Methodology note: this audit was performed without hybrid Reviewer (per Q1 spec footer commitment — single-Reviewer sufficient at SLICE 1 architectural-foundation-only). F1 was caught on single-Reviewer pass; hybrid would have caught it too (any cold-context audit opening `config.ts` would find it). Hybrid is mandatory at SLICE 3 + Phase 2 SLICE 3 + Phase 2 close walk per inherited Anchor commitment carried forward in v0.3 § 6._
