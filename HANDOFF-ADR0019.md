# Handoff — ADR 0019 follow-ups (next session)

**Date:** 2026-06-27 · **Branch:** `three-walls-prototypes` · **Latest commit:** `f27239e` (3 follow-ups + control arm + 2-month hourly + 1 Hz mixed-cadence + multi-day 1 Hz streaming + ALWAYS-ON Mode B LOOP all DONE; tree clean)
**Read first:** `decisions/0019-two-mode-architecture-evidence-vs-fdr.md`, then `RESEARCH-INDEX.md` (§1–2 + the
ADR-0019 architecture note), then `docs/METHODOLOGY-scale-and-duration-testing.md`. Memory carries the
condensed version (`project_adr0019_two_mode_architecture`, `feedback_two_month_baseline_and_harness`,
`project_clustersynth_1hz_longwindow_harness`).

## The decision (one paragraph)
Tessera is **two modes**: **Mode A — evidence/ranking + abstention (DEFAULT, NO FDR claim)** for continuous
fleet observation; **Mode B — FDR-guaranteed (CONDITIONAL, narrow)** only for emitter contracts whose
conditional null is `theorem_valid`/`construction_valid` over the horizon. The unit of validity is the
**emitter contract** {baseline, conditioning vars, residualizer, increment, stopping/aggregation, horizon,
`validity_class`}; only the top two classes enter e-BH. **Mode B's guarantee is a SPATIAL null (concurrent
control: treatment/canary), NOT a certifiable temporal null** — the temporal per-shard null is uncertifiable
on nonstationary GPU telemetry (proven this session: time-varying drift defeats finite-sample certification).

## What's DONE (this session, all committed/pushed)
- **2-month baseline ENFORCED in code** — `tools/baseline-guard.ts` throws below 56 days (cadence-agnostic);
  `CS_ALLOW_SHORT=1` = plumbing-only banner; `test/baseline-guard.test.ts` locks it. (`b81e31c`)
- **Scaled pipeline is the default** — `tools/baseline-monitor.ts` streams + multi-core (all cores by
  default; `CS_WORKERS=1` = single-thread); mixed cadence (hourly baseline + 1Hz/1-min monitoring);
  `tools/clustersynth-ramp.sh` = ONE correct entry point (2-mo hourly baseline + long monitoring,
  `CS_SHARD_RANGE` all-core gen, resumable via `.done-$R` markers). (`e6f3bf6`, `1bbb76a`, `7cb9e50`)
- **ADR 0019 written + memorialized** (`63b4043`).
- **Normalized convex-mixture e-value is the default fleet-e-BH object** — `tools/mixture-evalue.ts`
  (`normalizedMixtureEValue`), wired into both baseline-monitor paths; raw Shiryaev–Roberts peak (E≈T, not an
  e-value) retired from the FDR path (kept only for the Mode-A recall metric). (`6cf8c10`)
- **clustersynth side** (separate repo `../clustersynth`, branch `scenario-counter-subset-streamed-factors`,
  **PR #1 open**): `CS_COUNTERS` subset, streamed `factors.ndjson` (meta-only `factors.json`),
  `CS_SHARD_RANGE`/`CS_COUNTERS_ONLY` parallel generation.

## Findings to NOT re-derive (this session's evidence)
- **1Hz monitoring → every counter ABSTAINS** (residual autocorrelated at 1s; lag-1≈exp(−1/τ)). Gate correct.
- **1-min monitoring → 4 stationary counters CERTIFY (ρ≈0.005) but aggregate FDP 0.50/0.72 (multi-seed) /
  0.78 (R=8)** — certification (lag-1 whiteness) is necessary, NOT sufficient.
- **Normalized mixture fixed the e-value OBJECT** (selections 576/counter → ~50 total) but the binding failure
  is **residual null-invalidity** (healthy mean(e)~1e150). **Per-shard prefix drift-audit = NO-GO** (drift is
  time-varying, not in the prefix) → empirical certification can't deliver FDR. This is registry **N1** with a
  concrete mechanism; it's why `empirically_audited` must not be FDR-bearing.

## DONE — the three code-side ADR 0019 follow-ups (this session, all committed; see decisions/0019 for detail)
1. **`validity_class` code gate** — `tools/emitter-contract.ts` (`4733e62`). EmitterContract/ValidityClass,
   `isFdrBearing`/`modeOf`, throwing `assertFdrEligible` (CS_ALLOW_UNVALIDATED escape), gated
   `fdrBenjaminiHochberg`, `routeEmitters`. construction_valid is FDR-bearing only while
   `calibrationMonitorPassing===true`. baseline-monitor wired as empirically_audited → Mode A (the
   renderer's old "FDR guarantee holds" overclaim is gone). `test/emitter-contract.test.ts` (8).
2. **Runtime calibration monitor** — `tools/calibration-monitor.ts` (`e162b83`). Anytime-valid ∏g test
   martingale over a believed-null reference; crosses 1/α ⇒ revoke (sticky) ⇒ demote B→A. Sound vs the
   prefix-audit NO-GO (revoke-the-present, not certify-the-future). Scope: marginal calibration; serial
   dependence is the documented blind spot. `test/calibration-monitor.test.ts` (7).
3. **Mode B concurrent-control harness** — `tools/mode-b-control.ts` (`cffb7eb`). Synthetic ground truth:
   paired concurrent control cancels the common-mode exactly → spatial null → **FDP 0.099 ≤ q, power 0.64**
   (temporal no-control = 0.28). Wires #1+#2 live; the monitor (∏g) **+ a Wall-A whiteness check** gate
   construction validity (whiteness covers the marginal monitor's serial-dependence blind spot — catch
   12%→76% on a broken integrated-drift control). `test/mode-b-control.test.ts` (3). Suite 719 pass.

## DONE — productionization (clustersynth control arm + 2-month scale validation)
- **Clustersynth labeled control arm** (commit clustersynth `4e0797e`, branch
  `scenario-counter-subset-streamed-factors`): `controlArm`/`CS_CONTROL_ARM=1` emits a matched control twin
  per GPU (same factor instances + loadings, independent noise, never faulted); `control.json` pairs them.
  The contrast cancels the common-mode bit-for-bit (gpu_temp_c var 254→0.56 at hourly). 90 CS tests pass.
- **Tessera Mode-B pipeline** (commits `fddec22`, `5b6df18`): `tools/clustersynth-mode-b.ts` (model-free
  contrast → whiten → standardize → mixture e-value → gate → e-BH; PER-SHARD calibration, NOT pooled) +
  `tools/clustersynth-mode-b-ramp.sh` (control-arm gen + harness, resumable, ≥2-month guard). Mini fixture
  `test/_substrate/clustersynth-mode-b-mini`; `test/clustersynth-mode-b.test.ts` (5). Suite 724 pass.
- **2-MONTH SCALE VALIDATION (mac mini, real gb200, 60d hourly baseline + 60d monitoring):** spatial-null
  contrast controls FDR with near-full recall to **2304 shards** — R=1/4/8/16 **FDP 0.000** (recall ≥0.99);
  R=8 × 5 seeds **mean FDP 0.002**. All counters Mode B. Common-mode (cdu/pod) faults are cancelled BY
  DESIGN (fleet-level events, out of a per-shard detector's scope). Mini T9 cleaned after the run.
  SCORING NOTE (learned the hard way): the FDR positive set is gpu-level (per-shard) faults; detachment is
  factor-wide so the scorer is detachment→loaded-counters aware (commit `5b6df18`).

## DONE — 1 Hz mixed-cadence validation (commit `59b4da5`)
- **The contrast makes 1 Hz TRACTABLE where the temporal null fails.** Hourly 60d baseline + 6h 1 Hz
  monitoring, mac mini, to 2304 shards (R=1/4/8) and 5 seeds: spatial-null **FDP 0.000**; naive TEMPORAL
  null over-selects **FDP ≈0.97** (flags up to ALL 576 shards — the documented 1 Hz failure at scale).
  4/5 counters get a clean Mode-B guarantee at 1 Hz; **gpu_temp_c abstains (Mode A)** — τ=120 s →
  idiosyncratic φ≈0.99, still near-unit-root after the common-mode cancels (honest revoke).
- Two enabling fixes (commit `59b4da5`): (1) cadence-aware fitting (estimate φ/scale + calibration at the
  monitoring cadence from the mon pre-fault prefix, since the OU φ=exp(−dt/τ) is cadence-dependent);
  (2) **center-before-whiten** — independent treatment/control baselines give the contrast a nonzero mean,
  and `whiten` returns the seed tick unchanged → without centering it was an ~8σ outlier that spuriously
  tripped the calibration monitor (revoking power_w/hbm/nvlink despite 100% whiteness). The ramp gained
  `BASE_DT`/`MON_DT`/`MON_HOURS` (set `MON_DT=1 MON_HOURS=6` for the 1 Hz run).

## DONE — streaming/multi-core for multi-day 1 Hz (commit `9a3e2f6`)
- `tools/clustersynth-mode-b.ts` gained a worker_threads byte-range streaming path (mirrors
  baseline-monitor): each worker streams a byte range of the mon counters.ndjson, pairs each treatment row
  with its adjacent control row (`monPairs` — owns a pair iff its treatment starts in [byteStart, byteEnd),
  reads past the boundary to complete a straddling pair, skips a leading orphan control), computes the
  contrast e-value + calibration/whiteness scalars, discards the arrays. **Memory O(2 rows × T) per worker,
  flat in fleet size.** Byte-identical to the in-memory mixed path; same-cadence stays in-memory (it fits
  from the longer healthy baseline, not the prefix). CLI dispatches by cadence × CS_WORKERS.
- **Validated (mac mini, 60d hourly baseline + 72 h 1 Hz monitoring, 3 days):** spatial-null **FDP 0.000**
  to 2304 shards on monitoring bundles of **1.3 / 5.2 / 10 GB** (R=1/4/8), analysed in **3 / 16 / 31 s**;
  temporal null still flags all 576 (FDP ≈0.97); gpu_temp_c abstains (whiteness ~2%). Peak RSS on the
  5.2 GB bundle ≈ **2.4 GB**, FLAT IN FLEET SIZE (per-worker mem is O(window×workers), not O(shards×window))
  — so R=8's 10 GB bundle peaks at roughly the same RSS. `monPairs` boundary coverage is unit-tested
  (1/2/3/5/7/13/64-way splits incl. cuts between treatment and control).

## DONE — always-on Mode B control loop (commit `f27239e`)
- `tools/mode-b-loop.ts` operationalizes the two modes: per cycle it accumulates the per-shard calibration
  monitors over the control cohort, routes each emitter via the validity-class gate, and (Mode B only)
  runs gated e-BH → dispatches FDR-controlled discoveries as actions / withdraws them on resolve or revoke.
  `ActionSink` is the injectable action layer (block/page/remediate); `ModeBLoop.step` is the unit;
  `runModeBLoop` is the driver. Invariants tested (9): no-action-without-guarantee, revocation-withdraws,
  debounce, resolution-withdraws, anytime-valid-accumulation (+ rearm), parallel-per-emitter. End-to-end
  replay CLI: `node tools/mode-b-loop.js <base> <mon> [nCycles]` (FDR discoveries → actions over a bundle).
- This is the operational "how Mode B triggers": a continuously-evaluated precondition (concurrent control
  present + construction currently valid), NOT an event. Mode A is the always-on substrate; Mode B is a
  per-emitter overlay that emits FDR-keyed actions only while its guarantee is live.

## DONE — deploy adapters + README + serial-calibration research (2026-06-27, commits 4097f66 / 6e9f853 / 259af23)
- **DEPLOY ADAPTERS (commit `4097f66`).** The loop was source/sink-agnostic; both production seams are now
  wired. INPUT: `tools/telemetry-source.ts` — `TelemetryFeed` (a deployment delivers raw treatment/control
  windows; the seam forms e-values with the SAME validated contrast math), `liveCycles` (fits per-shard
  baselines once, enforces the ≥2-month guard), `runModeBLoopAsync` (new, in `mode-b-loop.ts`; drives the
  loop over an async feed, drains a buffered sink each cycle), `bundleFeed` reference + deploy CLI.
  OUTPUT: `tools/action-sinks.ts` — `JsonlAuditSink` (durable NDJSON, sync), `WebhookActionSink`
  (rollout-gate/pager via HTTP), `CommandActionSink` (remediation), `FanOutSink`. I/O is BUFFERED so
  step() stays synchronous; `drain()` flushes, attempting every effect + throwing an aggregate on failure.
  Endpoints/commands are deployment config; fetch/exec injected for tests. 17 tests; CLI verified
  end-to-end on the mini fixture (5 counters Mode B, 23 actions dispatched+audited).
- **README two-mode language (commit `6e9f853`).** Corrected the unconditional "e-BH FDR control over the
  per-shard verdict surface" bullet + added a "Two operating modes" section (Mode A default / Mode B
  conditional, spatial null, revocable) with the canonical honest-claim paragraph. Capstone renderers were
  already honest. README half of the claim-language item closed.
- **SERIAL-DEPENDENCE CALIBRATION MONITOR (commit `259af23`, ADR 0020).** Closes the monitor's marginal
  blind spot (the O5 item the whiteness AND-gate was a crutch for). `tools/serial-calibration.ts`: bet
  `λ_t = c·r_{t-1}` in the canonical conditional e-value (E[·|F_{t-1}]=1 for any past), mixed over
  `c∈±{.3,.6}`, AVERAGED with the marginal martingale → one anytime-valid monitor at 1/α. Validated
  (500×600, α=0.01): near-unit-root/integrated drift ~100% (beats 76% whiteness baseline), iid null 0%≤α,
  marginal breaks preserved. Honest tradeoffs: mild ρ low power BY DESIGN, negative-ρ weaker, lag-1. 8 tests.

## NEGATIVE RESULT — serial-monitor wiring ATTEMPTED + REVERTED (2026-06-28, `25452f7` → `2bf76f2`, ADR 0020)
- The serial monitor was wired into the construction-validity gate (retiring the whiteness AND-gate) across
  `mode-b-loop.ts` / `clustersynth-mode-b.ts` (in-memory+streaming) / `telemetry-source.ts`, then **reverted
  after a mac-mini run**.
- **Hourly passed** (2-month, RACKS 8/16 → 2304 shards: FDP 0.000, all Mode B, no spurious revokes).
- **1 Hz REGRESSED.** Retiring whiteness left `gpu_temp_c` (idiosyncratic τ=120 s → near-unit-root φ≈0.99,
  residual single-φ whitening only partly flattens) in Mode B, over-firing: **FDP 0.971, 511/576 selected →
  aggregate FDP 0.869**. With whiteness RETAINED it correctly abstains (Mode A, whiteFrac 41%) → aggregate
  **FDP 0.000** (confirmed on the mini with the reverted code). The serial monitor passed `gpu_temp_c`'s
  feed even UNCAPPED (cap 500/1728/100000 identical).
- **Why (mechanism):** whiteness *estimates ρ̂* from the prefix and thresholds it (sensitive from short
  data); the betting monitor must *accumulate* sequential evidence, and the healthy prefix (≤1728 ticks) is
  far shorter than the 21 600-tick detection horizon over which the mild residual is destructive — so it
  never accumulates enough; the prefix length (not the feed cap) is the binding limit. **Whiteness RETAINED;
  serial-calibration kept as a research artifact.** Suite back to **758 pass**.

## ADR 0021 — control-twin validity detector: BUILT + VALIDATED + NOT SHIPPED (negative result, 2026-06-28)
- Implemented the twin-validity detector + clustersynth ground-truth fault modes and validated rigorously;
  a twin-PAIR detector cannot restore the FDR guarantee, so it is NOT wired into the Mode B gate (Mode B
  byte-identical; mini FDP still 0.000). Tessera commit `44a4f00`; clustersynth `d2a5e0e` (pushed).
- **κ (cancellation ratio) catches decorrelation but does NOT restore FDR:** decorr FDP 0.25; a threshold
  sweep bottoms at ~0.20 (> q) because the false positives come from LOW-κ pairs (the harm is a sustained
  shift from un-cancelled non-stationary common-mode, not variance leak), and it over-excludes clean
  weak-common-mode pairs. **Contamination is undetectable by twin-pair stats** (shared fault cancels →
  recall 1.0→0.42; control-only fault → sign-blind contrast; cohort reference hits the heterogeneous-loading
  wall ADR 0012/0015 — distributions overlap). Root cause: non-comparability re-introduces the temporal-null
  wall; contamination needs a clean per-control reference a cohort can't give.
- **Real fix = a CONTROL TRIAD** (two independent twins per treatment → matched control-vs-control null):
  clean per-control reference for contamination + direct comparability check. **ADR 0022 candidate.**
- Artifacts kept: `tools/contamination-detector.ts` (κ machinery, unit-tested), `tools/contrast.ts`
  (fitContrast/applyContrast extraction, re-exported), clustersynth `CS_CONTAMINATE`/`CS_DECORRELATE_FRAC`.

## ADR 0022 — control triad: BUILT + VALIDATED (in-memory path) (2026-06-28, clustersynth `35c3afa`, tessera `c7f81ce`)
- Prototyped (`tools/control-triad.ts`, 5 seeds) then BUILT: clustersynth `CS_TRIAD` emits a 2nd matched twin
  `#ctrl2` (control.json `control2` + `triad:true`); `scoreCounterModeB` → `applyTriadRouting` scores the
  `c1−c2` sibling null, e-BHs it to flag contaminated controls, and re-routes a flagged shard's detection to
  the clean sibling `t−c2`. Backward-compatible (no `control2` → unchanged pair behavior). Committed triad
  mini fixture + 3 tests.
- **Validated** end-to-end on real topology (control-only contamination, scored vs the corrected positive
  set): mini (72 GPU) twin-pair FDP 0.579 → triad **0.000** recall 1.000; mac-mini R=8 (1728 shards) 0.588 →
  **0.000** recall 1.000; non-regressive. Cost analysis in ADR 0022 § Cost (controls double but data/compute
  +50%; memory flat; hardware doubling only if controls are dedicated canaries; binding constraint =
  comparable-peer availability).
- **REMAINING (lower):** the STREAMING path triad (mixed-cadence 1 Hz; `flaggedControls:0` there now);
  non-comparability remains a separate axis the triad doesn't address; a real-topology comparable-peer study.

## REMAINING — lower priority
- (research, ADR 0020 § Follow-ups) The mac-mini finding is for the ONE-SHOT harness. The **always-on loop
  accumulates the control cohort over the full monitoring duration** (a feed as long as the detection
  horizon), so the serial monitor *might* catch the `gpu_temp_c`-style residual THERE — needs a multi-cycle
  loop replay on a long 1 Hz bundle to confirm. Alternatively feed a calibration reference at the detection
  length. Until then whiteness stays everywhere.
- (research) Lag-k extension of the serial monitor if real residuals show higher-order structure.

## Mac-mini re-sync note
The mini's `~/concord/{tessera,clustersynth}` were rsync'd (tools/ + src/ + package.json) and rebuilt this
session; they are AHEAD of their last git-synced point but NOT committed there. If you git-pull on the mini,
reconcile. The 2-month hourly ramp ran in SECONDS (hourly is cheap) — only 1 Hz/mixed-cadence needs an
overnight + the auto-reboot-resumable handling.

## Test infra (mac mini — persists; re-usable)
- **Tailscale:** `ssh 100.84.57.58` (user `johnwarren`, key auth works). 14 cores, 64GB, macOS 15. Drive **T9**
  at `/Volumes/T9` (ExFAT, ~3.6TB, fast SSD). node v22.13.1 + pnpm 11.1.2 at `~/node/bin` (prefix PATH).
  Repos at `~/concord/{tessera,clustersynth}` (rsync'd WITH node_modules — no GitHub auth needed). Build:
  `PATH=$HOME/node/bin:$PATH pnpm build`.
- **Run a ramp:** `OUT=/Volumes/T9/<name>; nohup caffeinate -dimsu env PATH=$HOME/node/bin:$PATH RACKS="8 16"
  WORKERS=14 BASE_DAYS=60 BASE_DT=3600 MON_DAYS=14 MON_DT=60 OUTDIR=$OUT bash ~/concord/tessera/tools/clustersynth-ramp.sh >$OUT/nohup.out 2>&1 &`
  (MON_DT=60 = 1-min, the tractable cadence; MON_DT=1 = true 1Hz, ~O(ticks) e-detector cost, heavy.)
- **GOTCHA:** the mini auto-installs macOS updates and **reboots** mid-run (killed the first overnight; T9
  remounts as a different disk node). The ramp is **resumable** (`.done-$R` markers) — just relaunch the same
  command with the same OUTDIR. Consider disabling auto-updates for long runs. caffeinate ≠ reboot protection.
- **Before deploying code to the mini:** `rsync -az ../tessera/tools/ 100.84.57.58:concord/tessera/tools/`
  (and `../clustersynth/src/` if changed), then rebuild on the mini.
- Re-sync needed next session: the mini's `~/concord/tessera` is a few commits behind (last synced ~`3747a17`).

## File map (the load-bearing pieces)
- `tools/emitter-contract.ts` — the validity_class gate (follow-up #1).
- `tools/calibration-monitor.ts` — the anytime-valid runtime monitor (follow-up #2).
- `tools/mode-b-control.ts` — the Mode B concurrent-control harness, SYNTHETIC (follow-up #3).
- `tools/clustersynth-mode-b.ts` — the Mode B pipeline on REAL clustersynth topology (productionization;
  in-memory + streaming/multi-core paths for multi-day 1 Hz).
- `tools/clustersynth-mode-b-ramp.sh` — the Mode B scale entry point (control-arm gen + harness, resumable;
  BASE_DT/MON_DT/MON_HOURS for mixed cadence).
- `tools/mode-b-loop.ts` — the ALWAYS-ON Mode B control loop: wires FDR discoveries to actions (ModeBLoop +
  ActionSink + the operational invariants), with an end-to-end clustersynth replay CLI.
- `tools/mixture-evalue.ts` — default fleet-e-BH e-value object (ADR 0019).
- `tools/baseline-monitor.ts` — canonical pipeline (streaming + multi-core; gate + e-detector + e-BH).
- `tools/baseline-guard.ts` — 2-month enforcement.
- `tools/clustersynth-ramp.sh` — the one correct test entry point (resumable).
- `tools/emitter-prototype.ts` — research artifact behind ADR 0019 (NOT pipeline).
- `tools/supfdr.ts`, `tools/e-detector.ts`, `tools/conditional-markov.ts` — ADR 0018 prototypes.
- `decisions/0019-*` — the architecture decision (+ follow-up status).
