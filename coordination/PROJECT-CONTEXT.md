# PROJECT-CONTEXT — Tessera Coordination Workspace

_Authored: 2026-05-15. Transitional context note explaining the audit trail of artifacts in this directory pending Tessera v0.3 product-framing reframe._

## What this directory contains

Architect + Reviewer + Disposition artifacts for the Tessera scoping cycle. Per [Anchor](https://github.com/johnpatrickwarren-oss/anchor) PROJECT-ROLES discipline, coordination artifacts live under each product repo's `coordination/` directory.

## Audit-trail history (2026-05-15)

The four scoping artifacts in this directory were originally authored under a working assumption that the fleet-mode architecture would land as **Phase F + Phase G of DeploySignal main**. The Tessera-as-separate-product reframing landed mid-session (post-disposition, John 2026-05-15) and reclassifies them:

| Artifact | Original framing | Tessera-product framing (pending v0.3) |
|---|---|---|
| `ARCHITECT-MEMO-fleet-mode-scoping-v0.1.md` | Phase F + G of DeploySignal | Tessera Phase 1 + 2 founding architecture |
| `REVIEWER-REPORT-fleet-mode-scoping-v0.1.md` | Audit of v0.1 (single-Reviewer cold-context) | Audit preserved; product reframing is post-Reviewer scope shift |
| `ARCHITECT-MEMO-fleet-mode-scoping-v0.2.md` | Phase F + G amendment post-Reviewer (10/10 findings addressed) | Tessera Phase 1 + 2 amendment (engine inherited from DeploySignal) |
| `ARCHITECT-REPLY-fleet-mode-scoping-v0.1-DISPOSITION.md` | Architect disposition closing v0.1 → v0.2 cycle | Disposition preserved; phase-letter reframe handled at v0.3 |

The artifacts are **preserved as-is** for audit-trail integrity — the discipline-archive significance (Memorial D state 20V/8C → 21V/8C, MD-F6 candidate-set addition, Skill 14 retroactive cross-check observations, Skill 15 forward commitment, hybrid Reviewer pair-review commitment) all carry forward into Tessera regardless of the phase-letter framing.

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
