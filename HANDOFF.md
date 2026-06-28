# Handoff — Tessera two-mode architecture (ADRs 0019–0022 + scale validation)

**Date:** 2026-06-28 · **Branch:** `three-walls-prototypes` · **Tessera HEAD:** `9b4e69e` · **clustersynth
HEAD:** `35c3afa` (branch `scenario-counter-subset-streamed-factors`). Both repos clean + pushed.
**Suite:** 771 pass / 0 fail / 7 skip (the lone intermittent "fail 1" is the pre-existing flaky q84
worker-terminate timing test — passes in isolation; not ours).

**Read first:** `decisions/0019` (architecture) → `0020` (serial monitor) → `0021` (twin-validity, negative)
→ `0022` (control triad). Then `RESEARCH-INDEX.md` §1–4 and `docs/METHODOLOGY-scale-and-duration-testing.md`.
Memory carries the condensed version (`project_adr0019_two_mode_architecture` + the feedback notes).

---

## The architecture (one paragraph)
Tessera is **two modes**, gated per-emitter by a `validity_class`: **Mode A — evidence/ranking + abstain
(DEFAULT, no FDR claim)**, the always-on substrate; **Mode B — FDR-guaranteed (conditional, narrow)**, e-BH
discovery admitted only for `theorem_valid`/`construction_valid` emitters. Mode B's guarantee is a **SPATIAL
null** — a concurrent control twin, `d = treatment − control`, which cancels the common-mode the temporal
per-shard null cannot on nonstationary GPU telemetry. A runtime calibration monitor + Wall-A whiteness gate
construction validity and revoke (B→A) when it breaks.

---

## This session — what shipped (newest first)

- **2-MONTH 1 Hz BASELINE finding (`9b4e69e`) + streaming long-baseline fit (`01bdab0`).** Closed a real
  gap: the mixed-cadence path fits φ from a ~29-min mon **prefix**, not the 2-month baseline (the ≥56d guard
  checked an hourly baseline the fit ignored → partly illusory). Built a **streaming same-cadence
  long-baseline fit** (`tools/contrast.ts fitContrastFast` = mean/SD, O(n) no-sort; `clustersynth-mode-b.ts`
  Phase-1 stream baseline→per-shard fits, Phase-2 stream mon→detect; flat memory; dispatched for
  same-cadence base>1GB or `CS_LONG_BASELINE=1`). Ran a genuine 60d **1 Hz** baseline (5.18M ticks/series) +
  6h 1 Hz mon, RACKS 1/2/4/8, gpu_temp_c+power_w (R=8 base ~83GB, gen 610s/analysis 191s). **FINDING:
  gpu_temp_c's 1 Hz abstention is INTRINSIC, not a short-baseline artifact** — a stable 2-month baseline
  HELPS (whiteness 41%→65–75%, FDR clean at FDP 0.000 vs the prefix-fit run's 0.003–0.007) but gpu_temp_c
  still abstains every tier (τ=120s → near-unit-root φ≈0.992; can't out-baseline the physics), and that's
  CORRECT (it would over-fire in Mode B; temporal comparator FDP ~0.97). power_w certifies Mode B, FDP
  0.000, recall 1.000.
- **FULL-CLUSTER tests (mac mini): hourly (`c380fc1`) + 1 Hz (`991ecf2`).** Both to **9,216 observation
  units** (4,608 treatment GPUs + 4,608 controls). Hourly: FDP 0.000 every tier, recall→0.995. 1 Hz
  (prefix-fit, streaming): FDP ≤0.007, recall ~0.79, gpu_temp_c abstains, 7GB bundle/22s flat memory.
- **ADR 0022 — CONTROL TRIAD: BUILT + VALIDATED (in-memory) (`c7f81ce`, clustersynth `35c3afa`).** Two
  matched control twins → `c1−c2` is a clean control-vs-control null. Recovers BOTH ADR 0021 failure modes:
  contaminated-control detection (cohort can't) and the sign-blind false positive. `scoreCounterModeB` →
  `applyTriadRouting` (flag bad controls via `c1−c2`, detect on the clean sibling `t−c2`). Validated mini
  (72 GPU) + mac-mini R=8 (1728 shards): control-only contamination drives the twin-pair detector to FDP
  ~0.58 → triad **0.000** at recall 1.000; non-regressive. clustersynth `CS_TRIAD` emits `#ctrl2`.
- **ADR 0021 — twin-validity detector: BUILT, VALIDATED, found INSUFFICIENT (negative result) (`44a4f00`).**
  A twin-PAIR detector can't restore FDR: κ (cancellation ratio) catches decorrelation but misses the
  sustained-shift harm (FDP bottoms ~0.20 > q, + over-excludes clean pairs); contamination is undetectable
  by twin-pair stats (sign-blind contrast + heterogeneous-loading cohort wall). NOT wired into the gate. The
  κ machinery (`tools/contamination-detector.ts`) + clustersynth `CS_CONTAMINATE`/`CS_DECORRELATE` modes
  (`d2a5e0e`) are kept as artifacts. Pointed to → ADR 0022.
- **Deep research ×2 (3-vote verified) (`0172808`), reports in `research/2026-06-28-*.md`.** (1) Anytime-valid
  testing — CORROBORATES ADR 0020's negative result (SKIT ~1/√HSIC, PITMonitor longer delay under local
  drift); stopped-e-BH causal condition = the concrete O5 check. (2) Concurrent-control methodology — Mode B
  is established prior art; DiD-under-interference proves control contamination makes the contrast estimand
  uninterpretable (TATT−ASC) → motivated ADR 0021/0022.
- **ADR 0020 — serial-dependence calibration monitor: built + WIRING REVERTED (negative at 1 Hz)
  (`f9ea4c3`).** `tools/serial-calibration.ts` (bet λ_t=c·r_{t-1}, averaged with the marginal martingale) is
  sound + validated synthetically, but wiring it to RETIRE the whiteness gate regressed 1 Hz (gpu_temp_c
  over-fired: the betting monitor needs accumulation the short healthy prefix can't provide). **Whiteness
  RETAINED.** Kept as a research artifact.
- **Deploy adapters (`4097f66`).** `tools/telemetry-source.ts` (live `TelemetryFeed` seam + `liveCycles` +
  `runModeBLoopAsync` + reference `bundleFeed` + CLI) and `tools/action-sinks.ts` (Jsonl audit / webhook
  rollout-gate+pager / command remediation / fan-out; buffered I/O + `drain`). README two-mode language
  (`6e9f853`).

---

## REMAINING (lower priority)
- **(ADR 0022) Streaming-path triad** — `applyTriadRouting` is in-memory only; the streaming/mixed-cadence
  path reports `flaggedControls:0`. Wire the triad into the streaming reducer for 1 Hz at scale.
- **(ADR 0022) Comparable-peer availability study** — the triad's binding real-world constraint (two matched
  peers/shard); validate against a real topology (§ Cost). Hardware cost is ~free unless controls are
  dedicated canaries (decomposed in ADR 0022 § Cost: controls 2× but data/compute +50%, memory flat).
- **(ADR 0020 research) Strengthen the calibration monitor vs serial dependence** so the whiteness check can
  eventually retire — or accept whiteness is the better tool (the negative result suggests the latter).
- **(non-comparability)** — still a separate open axis the triad doesn't address (treatment↔control loadings
  diverging); ADR 0021 § Follow-ups.
- **Real-cluster (DCGM) validation** — everything is on synthetic clustersynth telemetry; the Phase-4
  candidate. The two-mode guarantee, deploy seams, and triad are all validated only against the harness.

---

## Key file map
- `decisions/0019–0022-*.md` — the architecture + the three follow-on ADRs.
- `tools/emitter-contract.ts` — validity_class gate (ADR 0019 #1).
- `tools/calibration-monitor.ts` — marginal runtime monitor (#2); `tools/serial-calibration.ts` — the serial
  monitor (ADR 0020, not in the gate).
- `tools/clustersynth-mode-b.ts` — the Mode B pipeline: in-memory + mixed-cadence streaming (prefix fit) +
  **same-cadence long-baseline streaming** (`renderModeBLongBaseline`, ADR 0022 1 Hz) + the **triad**
  (`applyTriadRouting`). `tools/contrast.ts` — `fitContrast`/`fitContrastFast`/`applyContrast` (shared).
- `tools/contamination-detector.ts` — κ machinery (ADR 0021 artifact, not gated).
- `tools/mode-b-loop.ts` — always-on loop; `tools/telemetry-source.ts` + `tools/action-sinks.ts` — deploy seams.
- `tools/clustersynth-mode-b-ramp.sh` — the scale entry point. **GOTCHA: it reads `COUNTERS=` (env), NOT
  `CS_COUNTERS` — it overrides the latter.** Pass `COUNTERS=gpu_temp_c,power_w` to subset.
- clustersynth `src/harness/{scenario,factor-model}.ts` — control arm + `CS_TRIAD` / `CS_CONTAMINATE` /
  `CS_DECORRELATE_FRAC` fault modes + the `faultId` seam.

---

## Mac-mini test infra (persists, reusable)
- **Tailscale:** `ssh 100.84.57.58` (user `johnwarren`, key auth). 14 cores, 64GB, macOS. Drive **T9** at
  `/Volumes/T9` (~3.6TB). node v22.13.1 + pnpm at `~/node/bin` (prefix PATH). Repos at `~/concord/{tessera,
  clustersynth}` (rsync'd WITH node_modules — no GitHub auth). Build: `PATH=$HOME/node/bin:$PATH pnpm build`.
- **Sync before a run:** `rsync -az tools/ 100.84.57.58:concord/tessera/tools/` (+ `../clustersynth/src/` if
  changed), then rebuild both on the mini. (The mini is synced as of this session's runs.)
- **Hourly Mode B ramp:** `OUT=/Volumes/T9/<name>; nohup caffeinate -dimsu env PATH=$HOME/node/bin:$PATH
  RACKS="8 16 32 64" WORKERS=14 BASE_DAYS=60 BASE_DT=3600 MON_DT=3600 OUTDIR=$OUT bash
  ~/concord/tessera/tools/clustersynth-mode-b-ramp.sh >$OUT/nohup.out 2>&1 &` (cheap, ~90s to 9,216 units).
- **1 Hz mixed-cadence:** add `MON_DT=1 MON_HOURS=6`. **2-month 1 Hz same-cadence (long-baseline fit):**
  `BASE_DT=1 BASE_DAYS=60 MON_DT=1 MON_HOURS=6 COUNTERS="gpu_temp_c,power_w"` (restrict counters — 1 Hz×2mo
  is only feasible for a few; R=8 baseline ~83GB, ~13min/tier; auto-routes to the long-baseline streaming path).
- **GOTCHAs:** the mini auto-installs macOS updates and can **reboot** mid-run (killed a prior overnight); the
  ramp is **resumable** via `.done-$R` markers — relaunch the same command/OUTDIR. caffeinate ≠ reboot
  protection. A transient SSH "connection reset" ≠ a reboot (check `uptime`). `KEEP=1` keeps bundles
  (default deletes per tier).

---

## The thread that's "live" if you want to continue
The 2-month 1 Hz finding (gpu_temp_c abstention is intrinsic) closed the methodology gap. The most natural
next steps are the two ADR 0022 follow-ups (streaming-path triad + comparable-peer study), or finally moving
off synthetic telemetry toward real-cluster DCGM validation (Phase 4). Nothing is mid-flight or broken.
