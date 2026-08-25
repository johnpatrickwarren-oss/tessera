# archive/anchor-pipeline/ — retired Anchor four-role pipeline

The AI-reviewing-AI pipeline (Architect → Implementer → Reviewer → Memorial Updater,
orchestrated by `run-pipeline.sh`) was retired on 2026-06-22 in favor of the current
workflow: direct commits gated by sprag (`invariants.json` / `baseline.json`) plus the
Anchor behavioral disciplines (spec-first, independent cold-eye review, durable
STATE/decisions trail). Archived here 2026-08-24 (external-review remediation) so the
repo root describes the workflow actually in use.

Contents:

- `run-pipeline.sh` — four-role pipeline orchestrator (Mode 2 single-cluster +
  `--coordinator` multi-cluster wave mode)
- `CLAUDE-COMMON.md` — universal disciplines + tier rubric, loaded for every role
- `CLAUDE-ARCHITECT.md` / `CLAUDE-IMPLEMENTER.md` / `CLAUDE-REVIEWER.md` /
  `CLAUDE-MEMORIAL.md` / `CLAUDE-COORDINATOR.md` — per-role disciplines with their
  accumulated REINFORCED history (the compounding record of R01–R94; do not edit)
- `templates/` — vendored Anchor multi-cluster templates (wave plan, cluster handoff,
  wave gate, coordinator memorial)

Nothing here runs in CI. `scripts/` still holds pipeline helper scripts
(`finalize-round.sh`, `anchor-*.sh`, `tier-router`, `build-role-context`, …) whose
root-relative references to these files now dangle — they are retired with the
pipeline and kept only because tests and fixtures reference some of them.
`test/q74-mu-haiku-reviewer-scope.test.ts` reads `run-pipeline.sh` and
`CLAUDE-REVIEWER.md` from this directory.
