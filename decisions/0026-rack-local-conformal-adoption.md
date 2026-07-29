# ADR 0026 — Rack-local conformal blocks adopted as the fleet-scale answer to N13 (option C)

- **Date:** 2026-07-28
- **Status:** ACCEPTED (operator decision, this date) — contract + gate wiring implemented;
  sim-side draft integration and the rack-level channel are named follow-ups.
- **Decides:** open item **A2-disp-ebh-gate-decision** (`research/2026-07-28-a2-disp-ebh-scale.md`
  § 4) as **option (c)**. Options (a) scale-indexed thresholds and (b) bounded selection domains
  were considered and rejected as primary: (a) is progressively vacuous as fleets grow (the safe
  region shrinks toward the instrument floor); (b) weakens the fleet FDR statement to
  per-partition statements while the onset at 10k is itself only 6-seed-clean. (b) survives as
  the CONTRACT CAP for emitters that stay fleet-scoped.
- **Builds on:** ADR 0023 CORR 3 (pair gate) + CORR 4 (N13 — no fixed ς̂ gate at ≥20k units);
  `research/2026-07-28-rack-local-conformal.md` (the measurements this decision rests on);
  ADR 0025 (the contract-as-compile-error philosophy this extends to scope).

## The decision

For `conformal_rank` emitters, the block-formation scope becomes a declared contract property:

1. **`blockScope: 'rack'`** — every conformal block is drawn WITHIN one rack. The rack-shared
   multiplier λ cancels by rank invariance (a shared scale/location cannot reorder a within-rack
   block), so the accumulation premise weakens from fleet-level to **within-rack exchangeability
   — N-free**. Measured: A/A clean at every ς̂ to 0.607 at N = 2016 and N = 20160 (fleet-random
   there: 141.75 false selections/run); A/B power under dispersion DOMINATES (recall 0.50 vs 0.07
   at δ = 0.01) with zero false selections; small high-δ recall dip (0.96 vs 1.00) from
   inflated-σ racks.
2. **Block size: the whole rack (K = 71)** — measured best at every power cell (recall 1.00 /
   0.56 / 0.79 vs 0.95 / 0.50 / 0.78 at K = 23), clean A/A, no leftover units. K-sensitivity in
   `runs/2026-07-28-a2-disp-ebh-scale/krack-sensitivity.json`; K = 11 costs real power (0.40).
3. **The gate follows the premise:** a rack-scoped emitter's `heterogeneityGatePassing` must come
   from a **scope='rack' monitor** (`tools/dispersion-monitor.ts`): ICC on the rack×round-demeaned
   panel, ς̂ as the **pooled within-rack** log-SD spread — each rack's own dispersion estimate is
   invariant to its λ_r, which is exactly the invariance the construction has. A fleet-scoped
   pair says nothing about the within-rack premise; `applyHeterogeneityGate` THROWS on a scope
   mismatch. Within-rack per-unit dispersion still demotes (the premise moved inside the rack,
   not away — test-locked).
4. **Fleet scope keeps the pair gate AND gains the N13 cap:** a fleet-scoped `conformal_rank`
   emitter declaring `selectionDomainUnits ≥ N13_FLEET_CAP` (20 160 — the measured breach size,
   not a safety certificate below it) is not FDR-bearing regardless of its gate verdict.
   Undeclared domain size ⇒ the cap is not checked in code; ADR 0023 CORR 4's prose rule still
   binds the operator.

## Scope disclosure (what C does NOT buy)

- **Rack-level faults are structurally invisible** to a rack-scoped emitter — a rack degrading
  together cancels out of every within-rack comparison. Rack-level detection needs a separate
  rack-vs-fleet channel (racks as units), which faces the SAME dispersion question one level up
  (leaf/pod-shared effects across racks) and therefore needs its own gate — and, at large rack
  counts, potentially its own N13. That channel is a follow-up, not a footnote: until it exists,
  Mode-B claims from rack-scoped emitters cover unit-level faults only.
- **Within-rack exchangeability is a real premise.** The substrate satisfies it by construction;
  real racks may not (host-level structure, HBM batches, airflow position). A2-disp-real
  (~09-21) must measure the within-rack pair on real probe scores; if it breaches, the same
  argument recurses to host-local blocks at K ≤ 7 with the measured power cost of small K.
- **Per-rack power varies** where fleet-random averaged it: high-λ racks see less. Fleet-mean
  recall hides that spread; per-rack recall reporting is part of the sim follow-up.

## Follow-ups (named)

| item | what |
|---|---|
| ~~C-sim~~ | **DONE same day**: `blocking: 'rack-local'` in `runCanarySim` — rack-cohort sentinel drafting, rack block keys (gpu execs), rack-mate escalation drafts, per-λ recall split (`RunResult.lambdaSplit`). Validated at 20 160 GPUs / 60 d / 0.5 % budget / heteroRackSd 1.0: coarse = 448 false pages + 5449 false selections with calibration exact AND the monitor silent (β = 1 blindness in vivo); rack-local = 3 pages, 0 false selections, MORE true detections (13 vs 8 of 20). λ split: recall 9/9 low-λ vs 4/11 high-λ racks — the disclosed cost, measured. At the 0.05 % sentinel budget BOTH arms look clean (T ≈ 5 rounds/unit — sparse coverage masks the failure); the construction matters exactly where coverage/rounds grow. Research note § 3c. |
| ~~C-rack-channel~~ | **VERIFIED same day** (research note § 3c addendum): the 1–6 false HOSTS were the nvlink per-host family still on coarse keys — the same disease one level up; closed by host-cohort drafting + rack keys for host execs (18 hosts/rack). After: rack-local false groups = {} in every arm; host fault still detects (d42.9 with 0 false selections vs coarse d16.9 amid ~5.5k). Group families (rack/leaf/power/region): zero false groups under strong dispersion at 280 racks — the studentized-change lagged-sd handicap removes persistent group dispersion by design. UNSWEPT: larger rack counts for the group-level comparison (N13-at-rack-count); the group families stay EMP-CAL as always. |
| A2-disp-real | within-rack pair on real probe scores at the mini gate (~09-21) — the premise measurement |
| C-rng-transfer | tessera-rng: onset-vs-N sweep on their fabric decides whether their ADR-0051 fixed gate has the same disease (their per-leaf dispersion may be iid — the collapse may not reproduce); queued for that repo's session |

## Tests

`test/dispersion-monitor.test.ts` (+4): rack-shared ς fails fleet gate / passes rack gate;
within-rack ς fails rack gate; scope-mismatch throws both directions; N13 cap binds fleet scope
with a passing gate and exempts rack scope. `test/rack-local-conformal.test.ts` (3): construction
invariants. Measurements: `research/2026-07-28-rack-local-conformal.md`.
