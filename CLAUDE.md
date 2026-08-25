# Tessera

# ── WORKFLOW ──────────────────────────────────────────────────────────────────
# Current workflow (since 2026-06-22): direct commits gated by sprag
# (invariants.json / baseline.json, enforced in CI and the commit hook) plus the
# Anchor behavioral disciplines — spec-first, independent cold-eye subagent
# review for statistical claims, durable trail in HANDOFF.md + decisions/.
#
# The retired Anchor four-role pipeline (run-pipeline.sh + the six CLAUDE-*.md
# role files + templates/) lives in archive/anchor-pipeline/ — see its README.
# Do not run it; its REINFORCED history is preserved there read-only.
#
# HANDOFF.md is the SINGLE SOURCE OF TRUTH for current status (date · suite
# counts · what's built · what's next). The durable decision/arc history is
# docs/STATE-HISTORY.md; STATE.md at the root is a thin pointer kept for the
# sprag durable-trail gate.

# ── PROJECT CONTEXT ───────────────────────────────────────────────────────────
# Tessera is the per-shard observation layer derived from DeploySignal's
# statistical-detector engine. Phase 1 vendors the load-bearing engine subset
# and extends the compile-time schema with shard-level primitives; later phases
# add per-shard residual semantics, hierarchical e-value combination, and the
# e-BH FDR operator surface.
#
# Vendoring policy + manifest: coordination/SCOPING-MEMO-v0.3.md § 9 +
# coordination/VENDORING-MANIFEST.md (coordination/ is local-only, gitignored).
#
# ── PRIOR DECISIONS — READ BEFORE PROPOSING STATISTICAL TUNINGS ────────────────
# BEFORE proposing any detector / FDR / e-value tuning, or commissioning new
# literature research, READ RESEARCH-INDEX.md. Its § 1 negative-results registry
# lists what is already CLOSED (walls / rejections — φ-integration, cross-sectional
# recalibration, boosting-as-FDR-fix, per-alert guarantee, etc.) with pointers to
# the engine ADRs (../deploysignal-engine/decisions/) and the e-value literature.
# This exists because we repeatedly re-derived settled findings; consult it first.
#
# ── BEFORE ANY SCALE / DURATION TEST (clustersynth scenario telemetry) ─────────
# READ docs/METHODOLOGY-scale-and-duration-testing.md first.
# (1) WINDOW ≥ 2 MONTHS — ENFORCED IN CODE. tools/baseline-guard.ts assertLongBaseline()
#     is called by every e-betting entry point and THROWS below 56 days (ticks×dt_s/86400,
#     cadence-agnostic). Short windows make e-betting invalid, period. The only escape is
#     CS_ALLOW_SHORT=1 (plumbing smokes only; prints an INVALID-FOR-FINDINGS banner). Do
#     NOT set it to make a real run pass. test/baseline-guard.test.ts locks this in.
# (2) RIGHT HARNESS — the CANONICAL pipeline is tools/baseline-monitor.ts (robust long
#     baseline → e-detector → Wall-A gate → e-BH; ABSTAINS on I(1)/flagged counters — the
#     trend-detector routing lives in the SEPARATE tools/metric-router.ts CLI, which the
#     ramp does not invoke), plus tools/clustersynth-e2e.ts for localization.
#     tools/clustersynth-scenario.ts is a DIAGNOSTIC scorer only (terminal mean-shift, no
#     e-detector/gate) — underpowered; do not report findings from it.
# (3) Ramp racks with a resource model (cores/RAM/disk/time): tools/clustersynth-ramp.sh.
#     Counter subset + parallel generation: CS_COUNTERS / CS_SHARD_RANGE (clustersynth-side).
## Knowledge base — read before working here

`~/concord/knowledge` is an LLM-maintained wiki: the statistics, engineering methodology, and design
standards behind the repos in `~/concord`. It is a separate git repository and it is the **single
entry point**. Do not point at any other standards document.

- `knowledge/SCHEMA.md` — how the wiki is written and read. Read first.
- `knowledge/index.md` — root router, topics only. Two hops to any page.
- `knowledge/WORKLIST.md` — outstanding work and unresolved contradictions.

**Check the wiki before claiming anything** about detector maths, validity, or study results. It
records retractions and superseded claims that this repo may still carry, so a doc in this repo
agreeing with you is not confirmation.

**Write findings back as wiki pages** under its schema. Do not correct the wiki by editing repo
docs, and do not leave a finding only in a commit message.

Design and writing standards route through `knowledge/design/` to `~/concord/junction`, which is
canonical for both. `WRITING-STYLE.md` exists only there.

**Communication with John** follows `~/concord/knowledge/design/pages/session-communication.md`:
verify first; cite code, not prose; lead with corrections; decisions get 3+ numbered options with a
recommendation; state what you did not do; a reply is as long as the finding.

**Default test harness:** clustersynth for fleet/topology-shaped work (operator ruling 2026-08-05).
Substrate routing: `~/concord/knowledge/methodology/pages/test-substrates.md`.
