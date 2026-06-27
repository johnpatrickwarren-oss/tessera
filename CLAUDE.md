# Tessera

# ─────────────────────────────────────────────────────────────────────────────
# HOW THIS FILE WORKS
#
# This file is the INTERACTIVE-SESSION loader. Interactive Claude Code sessions
# auto-load CLAUDE.md from the working directory; the headless pipeline does NOT
# load this file — it assembles its own system prompt from the split files
# below.
#
# Keep this file thin. Project-wide context belongs here. Discipline content
# belongs in the per-role files so the pipeline can load only what each role
# needs.
#
# File layout:
#   CLAUDE-COMMON.md       Universal disciplines + Superpowers + tier rubric.
#                          Loaded for every role.
#   CLAUDE-ARCHITECT.md    Architect role block + Architect reinforcements.
#   CLAUDE-IMPLEMENTER.md  Implementer role block + Implementer reinforcements.
#   CLAUDE-REVIEWER.md     Reviewer role block + Reviewer reinforcements.
#   CLAUDE-MEMORIAL.md     Memorial Updater role block + Memorial reinforcements.
#   CLAUDE-COORDINATOR.md  Coordinator role block + Coordinator reinforcements.
#                          OPT-IN per project; loaded only in --coordinator mode
#                          (multi-cluster wave planning). The four-role pipeline
#                          does NOT load this file. See MR-1 vendoring 2026-05-18.
#   coordination/.role-stamp  (gitignored) per-invocation role identity.
#
# The pipeline (run-pipeline.sh) concatenates CLAUDE-COMMON.md + the matching
# CLAUDE-<ROLE>.md + .role-stamp as the system prompt for each role session.
# That keeps the cacheable prefix byte-identical across worktrees while halving
# per-session prompt weight versus loading a monolithic CLAUDE.md.
#
# Multi-cluster execution (--coordinator mode + multi-track scripts) is
# documented in CLAUDE-COORDINATOR.md and templates/README.md. Single-cluster
# (Mode 2) execution is the default and does not load Coordinator content.
#
# Memorial Updater appends REINFORCED lines to the role file matching the
# violating role (or CLAUDE-COMMON.md for cross-role lessons). Do not delete
# prior reinforcements — accumulated history is the compounding value.
#
# To start a new project: cp CLAUDE.md.template CLAUDE.md, fill in project
# name; copy the CLAUDE-*.md templates similarly. Add coordination/.role-stamp
# to .gitignore.
# ─────────────────────────────────────────────────────────────────────────────

# ── INTERACTIVE-SESSION DEFAULT ───────────────────────────────────────────────
# When you're working in an interactive Claude Code session and want the full
# role discipline loaded:
#   1. Identify the role you're acting as (or "all").
#   2. Read CLAUDE-COMMON.md plus the relevant CLAUDE-<ROLE>.md file(s).
# When you're working at the operator level (deciding which round to run,
# resolving an escalation, reviewing outputs), the universal disciplines in
# CLAUDE-COMMON.md are usually sufficient.
# When you are acting as the Coordinator (multi-cluster wave planning):
# read CLAUDE-COMMON.md + CLAUDE-COORDINATOR.md (only). The Coordinator
# does not read other CLAUDE-<ROLE>.md files; cluster-internal disciplines
# load in cluster sessions, not in the Coordinator session.

# ── PROJECT CONTEXT ───────────────────────────────────────────────────────────
# Tessera is the per-shard observation layer derived from DeploySignal's
# statistical-detector engine. Phase 1 vendors the load-bearing engine subset
# and extends the compile-time schema with shard-level primitives; later phases
# add per-shard residual semantics, hierarchical e-value combination, and the
# e-BH FDR operator surface.
#
# Coordination artifacts live in coordination/. Vendoring policy + manifest:
# coordination/SCOPING-MEMO-v0.3.md § 9 + coordination/VENDORING-MANIFEST.md.
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
#     baseline → e-detector → Wall-A gate → e-BH; routes I(1) counters to a trend detector),
#     plus tools/clustersynth-e2e.ts for localization. tools/clustersynth-scenario.ts is a
#     DIAGNOSTIC scorer only (terminal mean-shift, no e-detector/gate) — underpowered; do
#     not report findings from it.
# (3) Ramp racks with a resource model (cores/RAM/disk/time): tools/clustersynth-ramp.sh.
#     Counter subset + parallel generation: CS_COUNTERS / CS_SHARD_RANGE (clustersynth-side).
