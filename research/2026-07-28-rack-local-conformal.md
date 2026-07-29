# 2026-07-28 — Rack-local conformal blocks: a dispersion-immune construction (prototype)

- **Artifacts:** `tools/rack-local-conformal.ts` (both-arms harness: A/A validity + A/B power on
  identical panels). Run artifacts: `runs/2026-07-28-a2-disp-ebh-scale/rack-local-proto.json`.
  Reproduce: `pnpm build && node tools/rack-local-conformal.js --seeds 4`.
- **Status: ADOPTED same day — ADR 0026 (operator decision, option C of the scale note § 4).**
  Contract + gate wiring landed (`blockScope`, scope-matched monitor, N13 cap); sim-side draft
  integration and the rack-level channel are ADR 0026's named follow-ups. This note records the
  measurement the decision rests on.
- **Context:** the pair gate (ADR 0023 CORR 3, a2-disp-ebh) currently answers dispersion by
  ABSTAINING — ς̂ > 0.15 demotes the emitter. This is the first measured positive alternative: a
  construction whose validity premise the dispersion channel cannot violate.

## 1. The idea

The channel that breaks e-BH (a2-disp-ebh § 3, N12) is a per-rack noise multiplier λ shared by
all ~72 units of a rack and persistent across the run. Fleet-random blocks compare a high-λ unit
against mostly other-rack peers; it out-ranks its block round after round, and the accumulator
finances a crossing from healthy units. Draw every conformal block WITHIN one rack instead and all
K+1 members share λ: the multiplier cancels, and the per-round rank is exactly uniform under
within-rack exchangeability. The premise the Lean-proved rank e-value needs is *weakened* from
fleet-level to rack-level exchangeability — which the dispersion channel satisfies by
construction, not by gate. The location channel (per-unit offsets, θ/ICC) is untouched: the ICC
half of the pair gate still binds; the ς half stops being a validity premise for unit-level
selection.

## 2. Measured — validity (A/A, N = 2016, T = 320, 4 seeds, identical panels)

Fleet-random K = 30 (shipped path) vs rack-local K = 23 (three blocks of 24 per 72-GPU rack):

| knob | ς̂ | fleet sel/run | fleet pages/run | rack-local sel/run | rack-local pages/run |
|---|---|---|---|---|---|
| 0 | 0.023 | 0.00 | 0.50 | 0.00 | 0.25 |
| 0.5 | 0.305 | 0.00 | 2.25 | 0.00 | 0.00 |
| 0.7 | 0.427 | 0.25 | 11.25 | 0.00 | 0.25 |
| 1.0 | 0.607 | 1.75 | 37.75 | 0.00 | 0.00 |

Rack-local is clean at every measured ς̂ — zero false selections and pages inside the Ville budget
(2.0) up to ς̂ = 0.607, where the shipped path pages 19× budget. Not a power tax doing the work:
the same arm's A/B recall below is *higher* under dispersion.

## 3. Measured — power (A/B, 20 faulty units ×(1+δ) from t = 0, recall at T = 320)

| knob | δ | fleet recall | fleet false sel | rack-local recall | rack-local false sel |
|---|---|---|---|---|---|
| 0 | 0.01 | 0.89 | 0.00 | 0.95 | 0.00 |
| 0 | 0.02 | 1.00 | 0.00 | 1.00 | 0.00 |
| 0 | 0.05 | 1.00 | 0.00 | 1.00 | 0.00 |
| 1.0 | 0.01 | 0.07 | 1.75 | 0.50 | 0.00 |
| 1.0 | 0.02 | 0.55 | 1.75 | 0.78 | 0.00 |
| 1.0 | 0.05 | 1.00 | 2.00 | 0.96 | 0.00 |

Under no dispersion the arms match (rack-local marginally better at δ = 0.01 — within-rack
comparison removes rack-static/gen structure from the contrast). Under strong dispersion
rack-local DOMINATES at small-to-moderate δ (0.50 vs 0.07; 0.78 vs 0.55) with zero false
selections against 1.75–2.0. The predicted cost appears only at δ = 0.05: 0.96 vs 1.00 — faulty
units in high-λ racks are measured against their rack's inflated σ.

## 3b. Scale check (A/A, N = 20160, T = 320, 4 seeds)

The construction's premise is N-free, and the measurement agrees — at the fleet size where the
shipped path's failure is catastrophic, rack-local stays clean:

| knob | ς̂ | fleet sel/run | fleet pages/run | rack-local sel/run | rack-local pages/run (budget 20.2) |
|---|---|---|---|---|---|
| 0.5 | 0.305 | 2.75 | 107.8 | 0.00 | 1.5 |
| 1.0 | 0.607 | 141.75 | 579.8 | 0.00 | 1.8 |

## 3c. Full-sim integration (C-sim, same day — `blocking: 'rack-local'` in `runCanarySim`)

Rack-cohort sentinel drafting (minPeers+1 units of one random rack per draft — randomization
moves to rack-uniform × within-rack-uniform) + rack block keys for gpu execs + rack-mate
escalation drafts + the per-λ recall split. Validation at 20 160 GPUs, 60 days, 0.5 % budget,
heteroRackSd = 1.0 (`runs/2026-07-28-a2-disp-ebh-scale/csim-validation-hibudget.json`; the
0.05 % sentinel-budget run is uninformative — T ≈ 5 rounds/unit masks the failure in BOTH arms,
`csim-validation.json`):

| | coarse | rack-local |
|---|---|---|
| A/A false pages (Ville budget 20.2) | 448 | 3 |
| A/A false gpu e-BH selections (cumulative / distinct units) | 5449 / 246 | 0 / 0 |
| healthy per-exec calibration @ .01 (n ≈ 1.4 M) | 0.0100 | 0.0101 |
| unit fault (20 × 3 %, onset d5): first e-BH detection day | 25.9 | 27.9 |
| true-selected of 20 degraded | 8 | 13 |
| falsely-selected healthy units (fault arm) | 254 | 0 |
| runtime uniformity monitor | never revokes | never revokes |

The full path reproduces both halves of the story: the fleet construction fails at scale with
EVERY per-round check green (calibration exact, monitor silent — the β = 1 blindness, in vivo),
and rack-local is clean with MORE true detections. The λ split shows the disclosed cost
precisely: rack-local recall 9/9 in low-λ racks vs 4/11 in high-λ racks.

**Host-family leak, found and closed (same day).** The first integration left nvlink (per-host
family) on coarse keys — and it leaked exactly as the mechanism predicts one level up: 1–6 false
HOST selections/run in the otherwise-clean rack-local arm. Fix: nvlink drafts HOST cohorts
within a rack (18 hosts/rack ≥ minPeers+1) and host execs take the rack key. After
(`csim-hostfamily.json`): rack-local false groups = {} in both arms; a host-level fault (5 %,
onset d5) still detects — day 42.9 with ZERO false selections, vs coarse day 16.9 amid ~5.5k
false selections (speed without validity). The remaining delay is sentinel-coverage economics
for a 4-GPU host, not the construction. Group families (rack/leaf/power/region) showed zero
false groups in every arm — the studentized-change lagged-sd handicap removes persistent group
dispersion by design; verified here at 280 racks, larger rack counts unswept.

## 4. Costs, stated plainly

1. **Rack-level faults leave this channel.** A whole rack degrading together cancels out of every
   within-rack comparison. Rack-level detection needs a separate rack-vs-fleet channel, which
   faces the same dispersion problem one level up (rack-λ dispersion across racks) and therefore
   still needs the pair gate at that granularity. The fix scopes the guarantee to unit-level
   faults; it does not recover fleet-wide rack selection under dispersion.
2. **Within-rack exchangeability is the new premise.** In the substrate it holds by construction
   (unit offsets iid within rack). In real fleets, host-level structure (4–9 hosts/rack, shared
   HBM batches, airflow position) can break it — the same argument then recurses to host-local
   blocks at K ≤ 7. The A2-disp-real probe pilot should measure within-rack ς̂ alongside the
   fleet-level number.
3. **Per-rack power varies** where fleet-random blocks average it: high-λ racks see less, low-λ
   racks see more. The fleet-mean recall above hides that spread.

## 5. What would make this adoptable (the ADR checklist this note is not)

- ~~Rack-local at scale~~ MEASURED (§ 3b): clean at N = 20160, ς̂ = 0.607, where fleet-random
  makes 141.75 false selections/run.
- The rack-level channel's story under dispersion (group e-values / W3 machinery at rack
  granularity + the gate).
- Emitter-contract wiring: a `blockScope: 'rack'` construction family whose gate requirement drops
  the ς half and keeps the ICC half — with the within-rack exchangeability premise named.
- K sensitivity (23 vs 71-as-one-block) and leftover-unit fairness at rack sizes not divisible by
  K+1.
