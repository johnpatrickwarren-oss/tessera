# Project state — see HANDOFF.md

`HANDOFF.md` is the single source of truth for project state: current status, suite
counts, what's built, what's next, and (since 2026-08-24) the ongoing arc history.

The pre-2026-06-28 decision/arc history that used to live here is frozen at
`docs/STATE-HISTORY.md`. The decision trail is `decisions/` (ADRs).

This file remains as a pointer; the sprag durable-trail gate (`invariants.json`,
`require_paths`) checks that a `STATE.md` and `decisions/` exist. Do not resume
writing history here.
