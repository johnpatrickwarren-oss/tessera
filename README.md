# Tessera

**Statistically-rigorous behavioral observation for AI training/inference clusters.**

Tessera detects deviations in AI cluster behavior at the per-shard level and across the overarching cluster, surfacing issues before they cause impact. It uses the statistical-detector engine derived from [DeploySignal](https://github.com/johnpatrickwarren-oss/deploysignal) — Family A/C/D/E detectors, Ville-bounded e-processes, hierarchical baseline pooling — applied to a fundamentally different operational scope: a running tightly-coupled AI cluster (100-10000 GPU shards in the exemplar case) rather than a single deployment decision gate.

## Status

**Phase 3 closed; v1 publication candidate (2026-05-20); engine npm extract shipped (R90/R94).** 90+ rounds of iterative-spec-with-cold-eye-Reviewer development have shipped vendor coverage across the major AI compute substrates plus a bi-directional integration interface with DeploySignal. Current package version is `0.1.0-pre`; the v1 tag lands with the publication gate.

| Phase | Scope | Status |
|---|---|---|
| Phase 1 | Engine vendoring + SCOPING-MEMO-v0.3 foundations | Closed |
| Phase 2 | Per-shard residual semantics + hierarchical e-value combination + e-BH FDR + freeze-hook | Closed |
| Phase 3 SLICE 1 | AWS Trainium + AWS Inferentia (Neuron Link topology) adapters | Closed |
| Phase 3 SLICE 2 | Google TPU/ICI adapter + `fetchSnapshot(ctx)` live-fetch interface across 5 adapters | Closed |
| Phase 3 SLICE 3 | DS integration interface contract + Tessera→DS feed + DS→Tessera event consumer + freeze-hook real-event factory | Closed |
| Phase 4 | Engine npm extract → [`deploysignal-engine`](https://github.com/johnpatrickwarren-oss/deploysignal-engine) (R90/R94) | Closed |
| Phase 4 (candidate) | Real-cluster DCGM validation; methodology framework consolidation | Pending |

## What Tessera does

**Per-shard observation primitives:**
- TopologySnapshot ingestion from 6 vendor adapters (Slurm, Kubernetes, NVLink, AWS Neuron Trainium + Inferentia, Google TPU/ICI)
- `TopologySource.fetchSnapshot(ctx?)` interface with sparse-data resilience
- Per-shard residual semantics + topology-aware freeze-hook
- Hierarchical e-value combination across shard/host/rack layers
- e-BH FDR control over the per-shard verdict surface — **conditional**, see *Two operating modes* below

**Two operating modes (ADR 0019).** FDR control is not unconditional on nonstationary fleet telemetry; the per-shard *temporal* null cannot be certified when drift is itself time-varying. Tessera therefore runs in two modes, gated per emitter by a `validity_class`:

- **Mode A — evidence/ranking (DEFAULT).** Always-on continuous fleet observation: per-shard / per-region rankings + early warning, full audit trails, and **abstention** when validity cannot be established. **No FDR claim.**
- **Mode B — FDR-guaranteed (CONDITIONAL, narrow).** e-BH-controlled discovery, admitted **only** for emitter contracts whose conditional null is `theorem_valid` or `construction_valid` over the horizon — in practice a **spatial null** (a concurrent control / canary, treatment − control), which cancels the common-mode the temporal null cannot. The guarantee is revocable: a live calibration monitor demotes an emitter B→A the moment its construction breaks.

> Tessera provides FDR control only for detector emitters whose conditional null validity is established by construction over the monitoring horizon. For nonstationary telemetry where such validity cannot be established, Tessera operates in evidence-ranking mode with abstention and full audit trails.

The always-on Mode B control loop ([`tools/mode-b-loop.ts`](./tools/mode-b-loop.ts)) wires FDR-controlled discoveries to the control plane via two deploy adapters: a live telemetry+control feed ([`tools/telemetry-source.ts`](./tools/telemetry-source.ts)) and pluggable [`ActionSink`s](./tools/action-sinks.ts) (rollout-gate / pager / remediation + durable audit). See [`decisions/0019-two-mode-architecture-evidence-vs-fdr.md`](./decisions/0019-two-mode-architecture-evidence-vs-fdr.md).

**DeploySignal integration:**
- HTTP API contract (TypeScript types + endpoint metadata) at `@johnpatrickwarren-oss/deploysignal-engine/ds-integration`
- Tessera→DS feed adapter: per-shard `VerdictGroup` observations → DS correlation layer
- DS→Tessera event consumer + factory: real deploy-event-driven freeze-hook activation
- Bi-directional contract eliminates engine duplication; the engine itself now ships as a shared npm package (extracted R90/R94)

## What Tessera does NOT do

- **Hardware diagnosis.** Tessera observes counter behavior; per-GPU fault attribution remains anti-scope (A10 carve-out preserved across all phases).
- **Real-cluster DCGM validation** as of v1. Validated against synthetic fixtures derived from public Neuron SDK + JAX topology code + TPU v4/v5 papers. Real-cluster rental validation is a Phase 4 candidate (Path B selected at Phase 3 SLICE 1/2 gate per OQ-P3-9).
- **Customer telemetry consumption.** A8/A11 inherited from Phase 1; only operator-controlled rental environments or synthetic fixtures are in-scope.

## Tessera vs DeploySignal

| | DeploySignal | Tessera |
|---|---|---|
| Scope | One canary deployment → one verdict | N shards of a running cluster → per-shard + cluster-wide observation |
| Stakeholder | Production SRE / deployment owner | Cluster oncall / AI infra operator |
| Output | Proceed / extend / rollback decision | Per-shard deviation attribution + fleet-event vs shard-fault distinction |
| Trigger | Each deployment | Continuous |
| Failure class | Pre-existing-detector classes applied to canary metrics | Same engine; per-shard SDC-class faults that DCGM/NVML don't catch; topology-localized common-mode failures; event-conditional drift attribution |

Tessera is **not** a fork or extension of DeploySignal — it's a separate product that reuses the statistical engine. The two integrate via HTTP contract (the engine package's `ds-integration` surface) rather than runtime code sharing.

## Engine sourcing

The statistical-detector engine is consumed as the npm package [`@johnpatrickwarren-oss/deploysignal-engine`](https://github.com/johnpatrickwarren-oss/deploysignal-engine), pinned in `package.json` to a tagged commit (`#v0.3.1-pre`). The package is the Tessera-evolved snapshot of the engine originally vendored from DeploySignal at SHA `5a72371` (per-file deltas were tracked in the pipeline's vendoring manifest); the extract shipped in rounds R90/R94, removing the former in-repo `engine/` tree.

A small calibration subset remains vendored in-repo at `tools/calibrators/*` (each file carries a source-path + SHA header and a sync-policy note).

## Getting started

Requires Node ≥ 22.13 and pnpm ≥ 11 (pnpm 11 requires Node ≥ 22.13).

```bash
git clone https://github.com/johnpatrickwarren-oss/tessera.git
cd tessera
pnpm install
pnpm test      # runs the full test suite (~7 skip without local clustersynth s2/c0 fixtures)
pnpm build     # tsc compile (tools + scripts + tests, via tsconfig.test.json)
pnpm clustersynth-e2e   # end-to-end pipeline on clustersynth topology (s0 in-repo; s1/s2 need local fixtures)
```

> Current build status (date, suite pass/skip, what's built) lives in **`HANDOFF.md`** — the single source of truth.

## Quick demo

Tessera ships two demo surfaces — a CLI for terminal walk-through (R70) and a browser dashboard for clickable exploration (R71).

### Browser dashboard

```bash
open demos/demo.html      # canned mode: opens in default browser; no install / no server required
```

The dashboard pages through 8 pre-recorded scenarios (clean baseline, single-shard SDC drift, rack-localized common mode, event-conditional freeze, FDR control, hierarchical e-value combination, sparse-data resilience, and topology-spanning common mode) with Play / Pause / Reset / Speed controls, an audit-trail panel, a reasoning panel, and a suggested-next-actions panel. All scenarios are deterministic and regeneratable via `pnpm build:demos`. The dashboard ships as a single static HTML file with vanilla CSS/JS — no external dependencies; **canned mode** opens directly from `file://`.

Dashboard controls:

- **Scrubber** — drag the slider in the top controls to jump to any window (0 through 29).
  Scrubbing pauses playback automatically; release the slider to resume manual control.
- **Keyboard** — `space` toggles play/pause; `→` and `←` step forward and backward one window;
  `r` resets the current scenario.
- **Speed** — 1×, 2×, 4× playback (500ms / 250ms / 125ms per window).
- **Per-firing receipts** — the provenance panel collapses individual firing receipts; click
  any receipt summary to expand its evidence JSON.

For a minute-by-minute walkthrough (clean-baseline → SDC-drift → common-mode-rack →
event-conditional) see [`demos/DEMO-SCRIPT.md`](demos/DEMO-SCRIPT.md).

#### Live mode (requires a build step + local HTTP server)

The dashboard ships a **Live mode toggle** at the top of the page (R85). Switching to
**Live** activates the parameter control panel (drift magnitude, window count, α
threshold, target shard, topology size, detector families) and routes the Run button
through a Web Worker that loads the engine bundle in-browser and streams per-window
state back to the UI. Use the scrubber to replay the run at any speed; click Cancel to
terminate mid-stream. See [`demos/DEMO-SCRIPT.md` § Minute 10:00 – 12:00](./demos/DEMO-SCRIPT.md#minute-1000--1200--live-mode-interactive)
for the live-mode walkthrough.

Unlike canned mode, Live mode needs two extra steps: the engine bundle
(`demos/engine-bundle.mjs`) is a gitignored build artifact, and browsers refuse to
construct a `Worker` from a `file://` origin — so serve `demos/` over HTTP:

```bash
pnpm build:browser              # writes demos/engine-bundle.mjs
python3 -m http.server -d demos # or: npx serve demos
open http://localhost:8000/demo.html
```

### CLI scenarios

Run any of four canned scenarios in the terminal:

```bash
pnpm demo clean-baseline       # healthy fleet — no firings
pnpm demo sdc-drift            # silent SDC drift on shard-04 → Family A betting fires
pnpm demo common-mode-rack     # 3 shards on shared rack → 1 common-mode candidate
pnpm demo event-conditional    # firmware-push event → freeze-hook activates
```

Each scenario runs in under 30 seconds, produces deterministic ASCII output, and exercises one real engine surface against synthetic inputs (no live cluster needed). Source: [`tools/demo-scenario.ts`](./tools/demo-scenario.ts).

### Regenerating canned scenarios

```bash
pnpm build:demos        # regenerates demos/scenarios/*.json + demos/demo.html
```

Idempotent: re-running produces byte-identical files. The 8 scenario JSON files double as audit-inspectable evidence of what the dashboard shows. Source: [`tools/build-canned-demos.ts`](./tools/build-canned-demos.ts).

## Scale-and-duration testing

Running tessera detection against clustersynth scenario telemetry at scale (many racks)
or over a long window follows a fixed methodology — **read it before any such test**:
[`docs/METHODOLOGY-scale-and-duration-testing.md`](./docs/METHODOLOGY-scale-and-duration-testing.md).
Two rules it exists to enforce, because both mistakes keep recurring:

- **Window ≥ 2 months, never a snapshot.** Tessera needs a ~2-month baseline, and the
  nonstationarity is wall-clock-keyed (diurnal/weekly/regime). A short window measures
  an unrepresentative slice, not whether detection works.
- **Ramp racks with a resource model** (cores/RAM/disk/time), not by guessing. The
  scenario scorer is streaming + multi-core, so RAM is rarely the wall — single-core
  CPU time usually is.

The harness:

```bash
# ramp racks at the 2-month 1Hz temperature window (auto cores-1 workers); enforces the
# 2-month minimum. RACKS="1 4 8 16" or MAX_RACKS=64; see the doc for all env knobs.
tools/clustersynth-ramp.sh

# or run one bundle directly:
node tools/clustersynth-scenario.js <bundle-dir> [q]   # CS_WORKERS=N (default cores-1; 1=single-core)
```

`tools/clustersynth-scenario.ts` streams `counters.ndjson`/`factors.ndjson` (no
~512 MB single-string cap), scores one shard at a time (flat RAM), and fans the
per-shard work across `worker_threads` (the e-BH FDR combine is central and cheap).
Generation restricts to a counter subset via `CS_COUNTERS` (clustersynth-side).

## Methodology

Tessera was developed using the [Anchor](https://github.com/johnpatrickwarren-oss/anchor) coordination methodology — a four-role pipeline (Architect → Implementer → Reviewer → Memorial-Updater) with cold-eye discipline, threshold-aware reinforcement accretion, and explicit ESCALATE patterns for spec/reality mismatches.

The full audit trail is preserved in this repo's commit history (every round's role-tagged commits, cold-eye Reviewer reports, Memorial-Updater outputs, and ESCALATE-resolution patterns are public). The pipeline's working state lives in a `coordination/` directory that is **pipeline-local and gitignored** (not part of the published repo); it holds:

- `PRD.md` — Product requirements (per-phase scope)
- `SCOPING-MEMO-v0.3.md` — Engine vendoring policy + cross-cutting anti-scope
- `WAVE-PLAN-*.md` — Coordinator wave plans (PRD decomposition + DAG analysis)
- `WAVE-GATE-*.md` — Wave-close attestations
- `MEMORIAL.md` — Cross-round violation + confirmation ledger
- `specs/Q-RNN-SPEC.md` — Per-round Architect specifications

CLAUDE-*.md files at the repo root hold the per-role pipeline disciplines (CLAUDE-COMMON.md + CLAUDE-ARCHITECT.md + CLAUDE-IMPLEMENTER.md + CLAUDE-REVIEWER.md + CLAUDE-MEMORIAL.md + CLAUDE-COORDINATOR.md). The architecture ratchet gates declared in `arch-invariants.json` are enforced by the external Anchor harness during pipeline rounds (the gate runner is not vendored here); repository CI (`.github/workflows/ci.yml`) runs typecheck + tests + the browser-bundle build on every push/PR.

## Layout

```
tessera/
├── README.md                     # This file
├── LICENSE                       # Apache 2.0
├── package.json                  # pnpm-managed (packageManager: pnpm@11.x)
│                                 #   engine dep: @johnpatrickwarren-oss/deploysignal-engine
│                                 #   (Family A/C/D/E detectors, topology adapters, e-BH,
│                                 #   per-shard runtime, ds-integration — extracted R90/R94)
├── pnpm-lock.yaml + pnpm-workspace.yaml
├── tsconfig.json + tsconfig.test.json
├── CLAUDE-*.md                   # Anchor pipeline role disciplines
├── run-pipeline.sh               # Anchor four-role pipeline orchestrator
├── bench/                        # clustersynth perf bench (fixtures generated locally)
├── coverage-matrices/            # R72/R77/R78 deterministic coverage + envelope matrices
├── demos/                        # Browser dashboard + worker + DEMO-SCRIPT + scenario JSON
├── scripts/                      # Pipeline scripts (verify-*.sh, finalize-round.sh, tier-router, …)
├── templates/                    # Anchor project templates
├── test/                         # full suite (per-AC; per-round files q01–q88 + e2e harnesses) — live count in HANDOFF.md
└── tools/                        # Product CLIs: demo scenarios, canned-demo + browser-bundle
                                  #   builders, coverage/envelope generators, baseline curation,
                                  #   vendored calibrators (tools/calibrators/*)
```

(The pipeline's `coordination/` working directory is local-only and gitignored — see Methodology.)

## Coverage

Tessera R72 validates the engine against 6 failure types × 20 parameter variations = 120 cases. Generate the matrix with:

```bash
pnpm coverage
```

See `coverage-matrices/R72-saturation-matrix.md` for the human-readable summary; `coverage-matrices/R72-saturation-matrix.json` is the machine-readable data. The matrix is deterministic — re-running produces byte-identical output.

| Type | Detection floor | Attribution floor |
|---|---|---|
| sdc-drift | 16 / 20 | ≥ 95% |
| common-mode-rack | 20 / 20 | ≥ 95% |
| event-conditional | 20 / 20 | ≥ 95% |
| fdr-multiple-testing | 16 / 20 | ≥ 95% |
| hierarchical-evalue | 12 / 20 | ≥ 95% (and ≥ 80% fleet-fires-before-per-shard) |
| topology-spanning-common-mode | 16 / 20 | ≥ 95% |

### Detection envelope (R77)

Tessera R77 characterizes the per-shard detector's detection probability across drift magnitude × window count × α threshold × detector family (Family A betting vs Family C ONS comparison). Generate the envelope matrix with:

```bash
pnpm detector-envelope
```

See `coverage-matrices/R77-detection-envelope.md` for the human-readable summary with detection curves; `coverage-matrices/R77-detection-envelope-matrix.json` is the machine-readable data (504 cells, 2520 trials).

At default settings (α=0.005, window_count=200, Family A): **≈100% detection for all drift magnitudes from 0.050 to 0.375**. The transitional detection band is at window_count=30 with magnitude < 0.10. Family A outperforms Family C in the short-window/low-magnitude regime (the boundary cells where tuning choices matter most).

Operator tuning guidance: see `scripts/detector-tuning-recommendation.md`.

### Topology-walk tuning envelope (R78)

Tessera R78 characterizes the tuning envelope of `attributeCommonMode` along two operator-visible dials — `max_hop_distance` and `min_member_count` — over 5 scenario classes × 30 cells × 5 trials. Generate the envelope matrix with:

```bash
pnpm topology-walk-tuning
```

See `coverage-matrices/R78-topology-walk-tuning.md` for the human-readable per-scenario summary; `coverage-matrices/R78-topology-walk-tuning-matrix.json` is the machine-readable data (30 cells, 150 trials).

Key findings: at the Tessera default `max_hop_distance=1`, the cooling_zone node is structurally unreachable (shard→rack→cz is hop=2). Lifting to `max_hop_distance=2` catches all cross-rack CZ common-modes with no shadow-rack false-positives. `max_hop_distance=3` introduces structural false-positive attribution — not recommended for 2-tier topologies.

Operator tuning guidance: see `scripts/topology-walk-tuning-recommendation.md`.

## Baseline curation

Tessera R88 ships a one-command operator entry point that composes the baseline curation pipeline (Stage 2a per-shard MCD-Mahalanobis screening + Stage 2b FCP-1 fleet-correlated e-process) and produces a validated baseline corpus plus a human-readable report.

```bash
pnpm curate-baseline path/to/raw-baseline.json
# defaults to writing curated-baseline/ in the cwd
# add --out <dir> to change; --allow-high-drop to override the >15% HALT
```

The wrapper applies conservative defaults inherited from `tools/curate-baseline-fleet-correlated.ts` (α_fleet=1e-3, χ²ₚ=0.975, MCD α=0.75), runs an auto-validation pass (Family C detector quiescence on the curated baseline via Stage 2a/2b idempotency), and gates the exit code on drop rate:

| Drop rate | Headline | Exit |
|---|---|---|
| `< 5%` | Baseline ready | 0 |
| `5–15%` | Baseline ready (with warning) | 0 |
| `≥ 15%` | Heterogeneous corpus | 1 (use `--allow-high-drop` to override) |
| validation failed | Review needed | 1 (never overridable) |

Three artifacts land under `<out-dir>/`: the curated `curated-baseline.json`, the markdown `curation-report.md`, and the per-decision audit trail `curation-decisions.jsonl` (one JSON line per `BaselineCurationDecision` record — D11 Stage 2a, D12 Stage 2b, D13 Stage 3b wire format).

Source: [`tools/curate-baseline.ts`](./tools/curate-baseline.ts).

## License

Apache 2.0. See `LICENSE`.

## Contact

John Warren · john.patrick.warren@gmail.com
