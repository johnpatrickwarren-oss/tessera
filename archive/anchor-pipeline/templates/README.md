# Tessera methodology templates

Templates vendored verbatim from `anchor/templates/` at SHA `<pinned at MR-1 vendoring>` to support the Coordinator role and multi-cluster execution. See `coordination/VENDORING-MANIFEST.md` for the canonical-source pins and the per-file row in the manifest's "methodology" section.

## Tessera-local equivalents (path-reference adaptation)

The vendored templates reference `../skills/<NN-name>.md` and `../templates/<NAME>.md` paths relative to the anchor canonical root. In the Tessera tree, the equivalent content lives at the following project-root locations:

| Anchor reference | Tessera equivalent |
|---|---|
| `../skills/12-coordinator-role.md` | `../CLAUDE-COORDINATOR.md` |
| `../skills/11-round-scaling.md` | tier rubric inlined in `../CLAUDE-COMMON.md` (A1-A7 / S1-S5 / Z1-Z5) |
| `../skills/01-pre-emit-grilling.md` | grilling discipline inlined per-role in `../CLAUDE-{ARCHITECT,IMPLEMENTER,REVIEWER}.md` + Superpowers block in `../CLAUDE-COMMON.md` |
| `../skills/02-memorial-accretion.md` | memorial discipline inlined in `../CLAUDE-MEMORIAL.md` + per-role files |
| `../skills/09-role-anchoring.md` | role-stamp mechanism in `run-pipeline.sh` + `coordination/.role-stamp` (gitignored) |
| `../skills/10-product-manager-role.md` | `../coordination/PRD.md` is operator-owned; Coordinator reads it as input |
| `../templates/TPM-REPLY-TEMPLATE.md` | TPM role folded into `NEXT-ROLE.md` state per Mode 2 automated pipeline; no separate template needed |
| `case-studies/archfolio-coordinator-dryrun/*` | external anchor canonical artifacts; not in Tessera tree (refer to anchor repo for empirical context) |

## When templates apply

These templates only apply when Tessera operates in **multi-cluster mode** — i.e., when a Coordinator has produced a wave plan with ≥2 clusters in at least one wave. Single-pipeline (Mode 2) execution does not produce any of these artifacts. See `../CLAUDE-COORDINATOR.md` §"When NOT to apply" for the activation criterion.

## Anchor canonical-PR backflow

Because the vendored content is verbatim, refinements discovered in Tessera that should flow back to anchor canonical can be expressed as a unified diff against `anchor/templates/<NAME>.md` directly. The Tessera-local header above this section is *additive* — anchor canonical PRs land below it without overlap.
