# Handoff — ADR 0019 follow-ups (next session)

**Date:** 2026-06-27 · **Branch:** `three-walls-prototypes` · **Latest commit:** `cffb7eb` (three ADR-0019 code follow-ups DONE; tree clean)
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

## REMAINING — productionization (the work for the new session)
- **Clustersynth labeled control arm.** Add a fault-free CONTROL cohort to the clustersynth scenario harness
  that shares the treatment's FACTOR INSTANCES (so the contrast cancels the common-mode exactly, as in the
  synthetic harness). Then run `tools/mode-b-control.ts` semantics on real-topology scale (≥2-month baseline)
  on the mac mini. The synthetic harness proves the statistics; this validates at fleet scale on the
  canonical substrate. Separate repo `../clustersynth`, branch `scenario-counter-subset-streamed-factors`.
- (lower) README/capstone claim language → the two-mode statement (ADR 0019 § Consequences). Partly done:
  baseline-monitor's renderer now states Mode A / no-guarantee honestly.
- (research) Strengthen the calibration monitor against serial dependence directly (the O5 frontier), to
  retire the whiteness-check composition crutch — would lift the broken-construction catch past ~76%.

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
- `tools/mode-b-control.ts` — the Mode B concurrent-control harness (follow-up #3).
- `tools/mixture-evalue.ts` — default fleet-e-BH e-value object (ADR 0019).
- `tools/baseline-monitor.ts` — canonical pipeline (streaming + multi-core; gate + e-detector + e-BH).
- `tools/baseline-guard.ts` — 2-month enforcement.
- `tools/clustersynth-ramp.sh` — the one correct test entry point (resumable).
- `tools/emitter-prototype.ts` — research artifact behind ADR 0019 (NOT pipeline).
- `tools/supfdr.ts`, `tools/e-detector.ts`, `tools/conditional-markov.ts` — ADR 0018 prototypes.
- `decisions/0019-*` — the architecture decision (+ follow-up status).
