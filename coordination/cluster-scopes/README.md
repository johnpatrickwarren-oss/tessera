# Cluster scope blocks

This directory holds per-cluster PRD scope blocks authored by the
Coordinator. The `multi-track-cluster-setup.sh --scope <PATH>` flag
plants these into each cluster worktree's `coordination/PRD.md` at
dispatch time.

Layout convention:

    cluster-scopes/
    └── wave-1/
        ├── wu-p2-1.md
        ├── wu-p1-1.md
        └── ...

One file per work unit per wave. Each file contains a PRD scope block
matching the format the cluster's pipeline expects at the top of
coordination/PRD.md (Tier verdict + Scope + ACs + Anti-scope +
Reinforcements in scope + Cluster context).

See `MULTI-TRACK-RUNBOOK.md` for the full dispatch flow.
