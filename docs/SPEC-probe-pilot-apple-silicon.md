# SPEC — Probes for the Apple Silicon real-probe pilot

- **Date:** 2026-07-27 (drafted and DECIDED same day)
- **Status:** **DECIDED — § 4's asks are resolved; § 0 is the committed design.** Decisions
  (2026-07-27): build the minimal trio P1-int + P4-mem + P5-gpu (P3-amx deferred until the trio
  lands); cadence 2 h ± U(0, 2 h); energy channel deferred to phase 2; P6-thermal stays cut.
  Implementation: `tools/probe/probes.swift` (one compiled binary — a compiled probe avoids the
  JIT warm-up that would contaminate the duration channel) + `tools/probe-runner.ts` (scheduler,
  lanes, ledger, scores) + `test/probe-runner.test.ts`. This was the one
  piece of pilot preparation that is NOT gated on the mac mini's 56-day baseline window
  (~2026-08-29): what the controlled probe workload actually *is* on Apple Silicon. The canary
  program's probes are abstract (`canary-sim.execScore`); `dcgmi`-style GPU diagnostics do not
  exist on this platform. Deciding the probe set now means the pilot can start the day the gate
  clears.
- **Consumes:** `docs/SPEC-canary-guarantee-program.md` (design), ADR 0023 + CORRECTIONS 1–3
  (guarantee scope, pair design gate ICC ≲ 4% AND ς ≲ 0.15), RESEARCH-INDEX N1/N7/P6–P9.
- **Instruments ready:** `estimateIcc` (θ̂) and `estimateDispersion` (ς̂) in
  `tools/heterogeneity-estimate.ts`; both floors (δ₀ location, λ₀ dispersion) computable from
  `tools/tail-probability.ts` / `tools/dispersion-drift.ts`.

## 0. Design (as decided)

Build the **minimal orthogonal trio** — P1-int (CPU/ALU, correctness-first), P4-mem (memory
subsystem, duration-first), P5-gpu (Metal compute, both channels) — at a **2 h ± U(0, 2 h)**
cadence, scoring **duration + error-count** per execution (the shipped two-channel calibrator
shape), with every execution window written to an exclusion ledger the passive-baseline
consumers excise. Add P3-amx fourth if the trio lands cleanly; cut P6-thermal unless someone
argues for it — it is the one candidate that actively degrades the passive baseline. Treat the
pilot as **Mode A only** (evidence/ranking, no guarantee claim): with the unit taxonomy below,
the pilot qualifies the instruments and the scoring path; it cannot deliver a fleet-grade
spatial null and should not pretend to.

## 1. What the pilot can and cannot measure — the honest unit taxonomy

**The central platform constraint: macOS on Apple Silicon has no core pinning.**
`THREAD_AFFINITY_POLICY` is not supported on arm64; the scheduler cannot be told "run this on
core 7." What IS addressable: **QoS class** steers work to the P-cluster vs the E-cluster
reliably, and the **GPU** is its own dispatch target. Consequences, stated up front so nobody
back-derives them from disappointing data:

1. **Individual cores are not units.** A pool of N worker threads shuffles across cores between
   rounds, so any persistent per-core effect is averaged away by the scheduler itself.
2. **Worker-slot "units" therefore form an A/A NULL panel by construction** — expected
   θ̂ = ς̂ = estimator floor. That is not a defect; it is exactly what instrument qualification
   needs: the trigamma null-floor check on REAL telemetry (the Gaussian-assumption backstop the
   A2-disp report § 6 calls for), on a panel where the truth is known to be ≈ 0.
3. **Addressable lanes are few**: P-cluster, E-cluster, GPU — and they are different block keys
   anyway (different silicon, the H12 hidden-stratum lesson), so cross-lane comparison is never
   a within-block rank.
4. **Fleet-grade θ̂/ς̂ needs a fleet.** The pilot's deliverables are: (a) real-telemetry null
   floors for both estimators, (b) probe-score distributions per lane (tail shape, diurnal
   sensitivity, macOS-update discontinuities), (c) the end-to-end scoring path exercised. The
   0.15–0.31 ς bracket and the 4% ICC gate get their real test only on multi-unit hardware.

## 2. Probe candidates

Every candidate: fixed versioned binary (hash in the block key), fixed inputs (seeded, baked at
build), self-checking (exact checksum — all kernels use fixed evaluation order, so results are
bit-deterministic on a given chip + OS + library version), short (sub-second target), emitting
`{t_start_ns, t_end_ns, duration_ns, errors, lane, probe_id, binary_hash}` per execution.

| id | workload | exercises | primary channel | fault class it would catch |
|---|---|---|---|---|
| **P1-int** | integer/branch/bit-twiddle loop with running checksum (~100 ms) | ALU, branch predictors, I-cache | errors (duration secondary) | CPU SDC — the fleet program's motivating fault class |
| **P2-fp** | NEON vector FMA chain, fixed order, exact-match checksum | FP/SIMD pipes | errors | FP-unit SDC |
| **P3-amx** | Accelerate `cblas_sgemm`, fixed seed, exact checksum | AMX/matrix units | errors + duration | matrix-unit SDC + throughput degradation (Accelerate version joins the block key) |
| **P4-mem** | STREAM-triad over a buffer ≫ L2 (~200 ms) | fabric, DRAM, thermal-adjacent | duration | bandwidth degradation, memory-path faults |
| **P5-gpu** | Metal compute matmul + reduction, exact checksum | GPU cores, GPU memory path | errors + duration | GPU SDC + perf — closest analogue to the fleet's dcgmi ladder |
| P6-thermal (cut by default) | 10–30 s sustained mixed load | power/thermal envelope | duration drift within probe | throttling pathologies — but it is the probe most disruptive to the passive baseline |

Channels map onto the shipped score model: `0.5·(calibrator(p_duration) + calibrator(p_err))`,
one rank per channel within the contemporaneous block. Energy-per-execution (time-aligned from
the already-running powermetrics stream) is a natural third channel — recommend deferring it to
a second phase so the pilot's scoring path stays identical to the validated two-channel shape.

## 3. Design parameters

- **Cadence:** every 2 h with U(0, 2 h) jitter — jitter is load-bearing (theta-tau § 7: fixed
  24 h-multiple spacing pins the diurnal phase and silently zeroes θ̂(H4)-class effects).
  ~12 rounds/day ⇒ an n = 40 panel per block key in ~3.5 days.
- **Randomized order** of probes within a round; randomized worker-slot assignment (the
  randomization is what makes the slot panel an honest A/A).
- **Block key:** `probe_id × binary_hash × chip_model × macos_build × lane`. A macOS or
  Accelerate update opens a NEW key epoch (the firmware-bucket analogue); never rank across
  epochs.
- **Horizon hygiene:** accumulators reset per measured T\* once θ̂/ς̂ exist (P7/P9); until then
  the pilot runs Mode A and no accumulator feeds any gate.
- **Baseline hygiene:** the probe daemon is SEPARATE from the powermetrics LaunchDaemon; every
  execution window goes to an exclusion ledger (`probe-windows.ndjson`) so passive-baseline
  consumers can excise probe intervals; nothing runs before the 56-day gate clears.

## 4. Decision asks — RESOLVED 2026-07-27 (per recommendation)

1. Which candidates to build (recommendation: P1-int, P4-mem, P5-gpu; P3-amx fourth).
2. Cadence (recommendation: 2 h ± U(0, 2 h)).
3. Energy channel now or phase 2 (recommendation: phase 2).
4. Whether P6-thermal earns an exception to the cut (recommendation: no).
