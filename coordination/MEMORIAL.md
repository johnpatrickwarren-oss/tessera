# Memorial — Tessera

_Per-project discipline record. Cross-project record: `~/.claude/CROSS-PROJECT-MEMORIAL.md`. Memorial Updater appends after each round._

_Bootstrap convention: this Memorial inherits the discipline state and active Memorials from DeploySignal (via engine vendoring at SHA `5a72371`). Inherited Memorials apply by default; Tessera-specific extensions / refinements are noted per-round below._

---

## Inherited active Memorials (from DeploySignal `5a72371`)

| Memorial | Discipline | Application moment | State (inherited) |
|---|---|---|---|
| **Memorial D** | Architectural-layer-coverage (4-factor prior weighting at hypothesis-tree time) | Architect brief-drafting | 20V/8C pre-Tessera; **22V/8C** post-Tessera-scoping-cycle 2026-05-15→2026-05-16 (2 new violations in this scoping cycle of MD-F6 sub-variant; see lineage below) |
| **Memorial F** | 4 sub-rules at brief-drafting time | Architect spec-emit | Active; sub-rules 1+2+3+4 all fire at any Tessera spec with compile-time substrate modifications |
| **Pasteable direction** | Lead pasteables with one fenced code block; prose after | TPM routing artifacts | Active; Tessera-relevant when Mode 1 routing emerges (Mode 2 uses NEXT-ROLE.md instead, so application surface is rarer) |
| **No-skip policy on statistical-invariant tests** | Ville / martingale / e-value bound tests assert or feature doesn't ship | Mac Claude test authoring | Active; load-bearing for Phase 1 + Phase 2 detector tests |
| **Worktree isolation** | Separate `git worktree add` per Mac Claude session | Mac Claude session startup | Active; pipeline IMPLEMENTER role invokes `superpowers:using-git-worktrees` at Step 0 |
| **Architect grilling discipline** | 10-axis adversarial pass pre-emit (CRITICAL / LIKELY-SURFACES / PRE-EMPTABLE) | Architect spec-emit | Active; demonstrated at Q-R01-SPEC v0.1 → v0.2 cycle |

---

## Tessera-specific Memorial state lineage (this overnight cycle)

The 2026-05-15 → 2026-05-16 scoping cycle produced **two violations** of the MD-F6 sub-variant within hours of each other:

| # | Event | Memorial D state |
|---|---|---|
| 0 | Pre-cycle (inherited DeploySignal post-Phase-3.d.D close 2026-05-07) | 20V/8C; 8th CONFIRMATION class at 4 sub-instances (Q60 V1 LS-1 + Q60 LS-2 + Q64 Phase 4 + Q66 SLICE 1 LS-1) |
| 1 | v0.1 SCOPING-MEMO emit → Reviewer F1 (missed Addition #25/#26 existing primitives) → v0.2 amendment | **21V/8C** (5th sub-instance: file-opened-discipline-paired-with-candidate-set-enumeration at SCOPE-PROPOSAL fidelity; MD-F6 sub-variant memorialized) |
| 2 | Q-R01-SPEC v0.1 emit → Reviewer F1 (missed actual `config.ts` inline-union state at SHA `5a72371`) → v0.2 amendment | **22V/8C** (6th sub-instance: MD-F6 at SPEC fidelity; SECOND occurrence same session; demonstrates discipline-application-gap pattern is stickier than memorialization) |

**Critical discipline-archive observation:** memorializing MD-F6 at sub-instance #5 (v0.2 SCOPING-MEMO) did NOT prevent sub-instance #6 (Q-R01-SPEC v0.1) within hours. **Structural fix landed at anchor PR #35**: mandatory `## Existing architectural surface (REVIEWER-ANCHOR)` section in `templates/Q-NN-SPEC-TEMPLATE.md` + `integrations/superpowers-claude-code/scripts/verify-citations.sh` mechanical verification. Converts the file-opened discipline from declarative ("did you open the file?") → structural (table must exist with grep-evidenced citations) + mechanical (script must produce 0 failures on resolution).

Post-anchor-PR-35-merge, Tessera SPEC-fidelity drafts (Q-R02-SPEC.md onward) MUST include the section. v0.3 SCOPING-MEMO + Q-R01-SPEC retroactively applied the section at SCOPE-PROPOSAL + SPEC fidelities respectively (commits `e8de97f` + `dee126d`). Both would have caught the originating MD-F6 violations at draft time if the section + script had been in place.

---

## Round R01 — Phase 1 SLICE 1 (engine vendoring + schema additions)

**Status:** Spec emitted (v0.2 post-Reviewer-amendment at `coordination/specs/Q-R01-SPEC.md`); Implementer fire **gated** on Q-J6 + Q-J1..Q-J5 + Q1-v0.2-acceptance + anchor PR #34/#35 merge (per `coordination/NEXT-ROLE.md` STATUS: ESCALATE).

**Pre-implementation Reviewer pass** (single-Reviewer cold-context; hybrid Reviewer is SLICE 3 territory per inherited Anchor commitment): 1 FAIL (F1 inherited type-state mismatch; MD-F6 sub-variant) + 5 GAP all AMENDED at Q-R01-SPEC v0.2.

**Implementer fire pending.** Post-fire content:
- Implementation diff + close-walk artifact at `coordination/MAC-CLAUDE-R01-CLOSE.md` (per Q-R01-SPEC § Deliverable)
- Post-implementation Reviewer audit at `coordination/reviews/REVIEWER-REPORT-R01.md`
- Memorial state delta evaluated at R01 close (architect-pre-prediction: no increment expected at SLICE 1 since engine vendoring is mechanical; if file-opened-discipline applied per new template section, MD-F6 doesn't fire)

---

## Reinforcement rules accumulated this project

(Populated by Memorial Updater after each round close.)

### Strategic dispositions

- **CONFIRMATION 2026-05-16 (operator decision; Q-J6):** Q-J6 cross-project sequencing dispositioned to option (iv) — Tessera takes priority; DeploySignal Phase E indefinitely deferred. Rationale: no customer pressure on DS; DS is technical artifact for resume building; Tessera is separate product at different abstraction level. Implication: all engineering capacity to Tessera; DS in maintenance-only state; Phase 3 DS-integration is optional / market-dependent.

(R01-and-beyond memorial entries populated by Memorial Updater after each round close.)

---

## Cross-project memorial cross-references

When Memorial Updater runs at R01 close, it appends to `~/.claude/CROSS-PROJECT-MEMORIAL.md` with:

- Tessera-specific reinforcements (project-scope only).
- Cross-project reinforcements (apply to any future Anchor project).

Candidate cross-project contributions from this overnight scoping cycle (await stabilization criterion — post-R01-close-walk per John 2026-05-15 Anchor-memorialization principle):

1. **SCOPE-PROPOSAL-TEMPLATE addition to anchor `templates/`** — codify the SCOPE-PROPOSAL fidelity level distinct from full SPEC; observed twice in this cycle (v0.1, v0.2, v0.3 of SCOPING-MEMO + retroactive § Existing architectural surface application).
2. **MD-F6 sub-variant of 8th CONFIRMATION class** — file-opened-discipline-paired-with-candidate-set-enumeration; structural fix landed at anchor PR #35 supersedes the declarative memorialization.
3. **Skill 14 symmetric-application observation** — catches BOTH narrowings AND widenings of stakeholder-requirement language; demonstrated when v0.1 widened John's "conditional attribution given event" to "causal attribution"; Reviewer F2 caught.
4. **Hybrid Reviewer pair-review-style invocation pattern** — empirical-evidence-load-bearing checkpoints (SLICE 3, Phase close walks); single-Reviewer sufficient at SLICE 1.
5. **Framing-check at TPM intake** — catches project-boundary-wrong-assumption class; observed when "Concord → Tessera" project-reframe was caught by John not by Reviewer (Reviewer audited within-the-wrong-framing).
6. **MD-F6 structural fix (anchor PR #35) origination case-study** — two same-session violations within hours of memorialization → declarative memorial insufficient; structural + mechanical enforcement combined. Pattern: when memorialization-alone-insufficient is empirically observed, escalate to template-section enforcement + script verification rather than another memorial entry.

---

_Memorial bootstrap: 2026-05-16 (Mode 2 retrofit). Inherited active Memorials from DeploySignal SHA `5a72371`; Tessera-specific lineage starts at this entry. Memorial Updater appends after R01 close-walk._
