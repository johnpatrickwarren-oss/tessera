# PROJECT-CONTEXT — Tessera Coordination Workspace

_Authored: 2026-05-15. Transitional context note explaining the audit trail of artifacts in this directory pending Tessera v0.3 product-framing reframe._

## What this directory contains

Architect + Reviewer + Disposition artifacts for the Tessera scoping cycle. Per [Anchor](https://github.com/johnpatrickwarren-oss/anchor) PROJECT-ROLES discipline, coordination artifacts live under each product repo's `coordination/` directory.

## Audit-trail history (2026-05-15 → 2026-05-16)

Four scoping artifacts existed earlier in this directory under a working assumption that the fleet-mode architecture would land as **Phase F + Phase G of DeploySignal main**. The Tessera-as-separate-product reframing landed mid-session (John 2026-05-15) and superseded them. **Deleted 2026-05-16 post-John-disposition** (cleanup signal; PROJECT-CONTEXT.md captures the substantive history below; git history preserves the literal text at commits `884c08e`, `e4a956a`, `aa4fa97`):

| Deleted artifact | Original framing | Resolution |
|---|---|---|
| `ARCHITECT-MEMO-fleet-mode-scoping-v0.1.md` | Phase F + G of DeploySignal | Substantively subsumed into `SCOPING-MEMO-v0.3.md` (standalone Tessera-product framing). |
| `REVIEWER-REPORT-fleet-mode-scoping-v0.1.md` | Cold-context Reviewer audit of v0.1: 2 FAIL + 8 GAP + 6 PASS. F1 = missed Addition #25/#26 existing primitives; F2 = D4 correlational-not-causal stance conflict with v0.1's "causal attribution" framing of Extension 3 (c). | All findings addressed in `SCOPING-MEMO-v0.3.md` § 2.3 Extension 3 (builds on Addition #25/#26 explicitly; reframes (c) as event-conditional correlational attribution; A16 preserves D4); v0.3 § 8 item 10 captures the discipline-archive significance. |
| `ARCHITECT-MEMO-fleet-mode-scoping-v0.2.md` | Phase F + G amendment post-Reviewer (10/10 findings addressed) | Substantively superseded by `SCOPING-MEMO-v0.3.md` standalone replacement (Q-J6 reframed as cross-project sequencing; Phase letters renumbered Tessera Phase 1 + 2; A17 added; G6 probability bands recalibrated). |
| `ARCHITECT-REPLY-fleet-mode-scoping-v0.1-DISPOSITION.md` | Architect disposition closing v0.1 → v0.2 cycle. Memorial D state evolution: 20V/8C → 21V/8C; F1+F2 classified as 5th sub-instance of 8th CONFIRMATION class (MD-F6 sub-variant: file-opened-discipline-paired-with-candidate-set-enumeration). | Memorial D lineage continued in `ARCHITECT-REPLY-Q-01-DISPOSITION.md` § Memorial D state evolution (21V/8C → 22V/8C; 8th class extended to 6 sub-instances). Discipline-archive significance preserved across v0.3 + Q1 disposition. |

### Memorial D state lineage across this cycle

Compressed history of Memorial D evolution during the 2026-05-15 → 2026-05-16 scoping cycle (full text in v0.3 + Q1 disposition):

| Stamp | Cycle event | 8th CONFIRMATION class sub-instances |
|---|---|---|
| **20V/8C** | Pre-cycle (inherited from DeploySignal Phase-3.d.D close 2026-05-07) | 4 sub-instances (Q60 V1 LS-1 + Q60 LS-2 + Q64 Phase 4 + Q66 SLICE 1 LS-1 — all DeploySignal lineage) |
| **21V/8C** | Post v0.1 SCOPING-MEMO → Reviewer F1 (missed Addition #25/#26) + F2 (D4 conflict) | +5th sub-instance: file-opened-discipline-paired-with-candidate-set-enumeration at SCOPE-PROPOSAL fidelity (MD-F6 sub-variant memorialized) |
| **22V/8C** | Post Q1 spec v0.1 → Reviewer F1 (missed actual `CellDimension`/`CellConfidence` inline-union locations; cited typedefs from memory) | +6th sub-instance: MD-F6 sub-variant at SPEC fidelity (SECOND occurrence in same session; discipline-application-gap pattern is stickier than memorialization) |

**Critical observation surfaced by this lineage:** memorializing MD-F6 between sub-instances 5 and 6 did NOT prevent recurrence — the second violation happened hours after the memorialization. Pattern is stickier than the memorial. **Structural fix (in scope per John 2026-05-16):** ANCHOR-PR-CANDIDATE — add mandatory `## Existing architectural surface (REVIEWER-ANCHOR)` section to anchor `templates/Q-NN-SPEC-TEMPLATE.md` (and to a new `templates/SCOPE-PROPOSAL-TEMPLATE.md`) that forces explicit file:line citation + verbatim snippet for every inherited reference. Memorial entries describe the discipline; template enforcement executes it.

Substantive Reviewer findings + dispositions from the deleted-artifact cycle are addressed in the current canonical state — see `SCOPING-MEMO-v0.3.md` (substantive content of F1+F2+G1-G8 subsumed; full A1-A17 anti-scope; full MD-F1..MD-F6 candidate-set) + `ARCHITECT-REPLY-Q-01-DISPOSITION.md` (full Memorial D evolution table). The deleted-artifact files added no unique substantive content beyond what's preserved.

## Pending: Tessera v0.3 scoping memo

The v0.3 memo (TBD authoring) reframes the architectural commitment with these adjustments:

- **Phase letters:** "Phase F + Phase G of DeploySignal" → "Tessera Phase 1 + Phase 2" (Tessera's own roadmap; DeploySignal's Phase E remains DeploySignal's roadmap, decoupled).
- **Engine cross-references:** instead of "extending DeploySignal main at `engine/types/verdict.ts:141`," cite as "inherited from DeploySignal `engine/types/verdict.ts:141` at SHA `<pinned>`" — vendor-first sharing strategy per project-architecture decision (John 2026-05-15).
- **ADR walks:** DeploySignal's anti-scope-ledger clauses (Q2.B.6.4 / Q58 / Q59 / Q60 / Q66 etc.) referenced as "inherited engine constraints" rather than "DeploySignal LEDGER clauses to preserve at Phase F" — they constrain Tessera's vendored engine usage, not DeploySignal's main.
- **Anti-scope clauses A1-A16:** preserved with framing-context note. A10 (NO hardware-diagnostic / NVIDIA-stack territory), A11 (NO live customer cluster telemetry), A15 (NO multi-region / cross-cluster federation), A16 (NO Addition #26 D4 reversal) all carry forward identically. Some clauses are minor reframes (A2 referenced DeploySignal's Q58/Q59 clauses; Tessera inherits these via engine vendoring).
- **Open Qs Q-J1 through Q-J6:** preserved with phase-letter relabeling. The decisions themselves (operator-facing fleet guarantee target; cold-start latency target; cross-shard correlation output semantics; synthetic-cluster substrate scope; freeze-hook activation gate; phase-letter sequencing relative to DeploySignal's Phase E) all stay load-bearing under Tessera framing.
- **Q-J6 specifically:** the question shifts from "Phase F+G vs Phase E sequencing within DeploySignal" to "Tessera development timeline relative to DeploySignal's Phase E (production deployment hardening)." Cross-project sequencing rather than within-DeploySignal sequencing. Architect-pre-prediction shifts; recalibrate at v0.3.

## Project relationships

```
                     ┌─────────────────────────────┐
                     │  Anchor (methodology pack)  │
                     │  github.com/...-oss/anchor  │
                     └──────────────┬──────────────┘
                                    │ applies to
                            ┌───────┴───────┐
                            ▼               ▼
┌────────────────────────────────┐  ┌────────────────────────────────┐
│  DeploySignal                  │  │  Tessera                       │
│  (deployment gating)           │  │  (cluster behavioral obs.)     │
│  github.com/...-oss/           │  │  local-only pre-v1             │
│        deploysignal            │  │  → github.com/...-oss/tessera  │
└────────────────────────────────┘  └────────────────────────────────┘
                  │                                  ▲
                  └──────────────────────────────────┘
                          engine vendoring
                          (deploysignal source →
                           tessera vendored copies;
                           extract to npm package
                           at Tessera Phase 2)

                  ┌──────────────────────────────────┐
                  │  Optional future:                │
                  │  Tessera signals → DeploySignal  │
                  │  correlation layer (Phase 3+;    │
                  │  decoupled-for-now)              │
                  └──────────────────────────────────┘
```

**Engine sharing strategy:** vendor-first, extract-later (John disposition 2026-05-15). Tessera scaffold copies needed DeploySignal engine code into its own tree; per-file headers note source path + SHA + extract target. Once Tessera's needs across all three founding extensions are concrete (Phase 2 commitment), the shared subset extracts to a separate npm package (`@johnpatrickwarren-oss/deploysignal-engine` or similar; name TBD).

**Anchor-memorialization principle (John 2026-05-15):** discipline-archive observations from DeploySignal and Tessera should flow back into Anchor as methodology refinements. Candidate contributions from this scoping cycle:

1. SCOPE-PROPOSAL-TEMPLATE addition to `anchor/templates/` — codify the SCOPE-PROPOSAL fidelity level distinct from full SPEC.
2. MD-F6 sub-variant of 8th CONFIRMATION class (file-opened-discipline-paired-with-candidate-set-enumeration) — candidate Memorial D archive entry.
3. Skill 14 symmetric-application observation — catches BOTH narrowings AND widenings of stakeholder-requirement language; documentable as a Skill 14 reinforcement or example.
4. Hybrid Reviewer pair-review-style invocation at empirical-evidence-load-bearing checkpoints — Architect's commitment pattern observed in v0.2 § 8 item 12.

These get submitted as Anchor PRs once patterns stabilize across multiple project instances (e.g., post-Tessera Phase 1 close walk validates the pattern).

## Conventions for future Tessera coordination artifacts

- Architect memo files: `<TOPIC>-SPEC.md` or `<TOPIC>-SCOPING-MEMO-v<N>.md`.
- Reviewer reports: `REVIEWER-REPORT-<topic>-v<N>.md`.
- Architect dispositions: `ARCHITECT-REPLY-<topic>-<context>.md`.
- ADR clauses + anti-scope: Tessera's own `coordination/ANTI-SCOPE-LEDGER.md` once Tessera's first Q-cycle closes (currently no Tessera-specific LEDGER; DeploySignal LEDGER referenced via engine vendoring).
- Project-roles mapping: deferred until Tessera commits to multi-chat coordination (John-as-solo-operator at v0 sufficient).

---

_For Tessera's overall product framing, see [`../README.md`](../README.md). For Anchor methodology reference, see [github.com/johnpatrickwarren-oss/anchor](https://github.com/johnpatrickwarren-oss/anchor)._
