# 2026-07-28 — A2-disp-ebh-scale: the e-BH onset collapses with fleet size; the fixed-ς̂ gate cannot be tightened out of trouble at ≥20k units

- **Artifacts:** `tools/dispersion-ebh-scale.ts` (fleet-size × knob grid over the a2-disp-ebh
  harness; onset/last-safe extraction). Sweep artifacts: `runs/2026-07-28-a2-disp-ebh-scale/`
  (main grids n{4032,10080,20160,40320}.json, fine + low-ς̂ probes at 20160/40320, knob-0
  controls). Reproduce: `pnpm build && node tools/dispersion-ebh-scale.js --sizes 20160 --seeds 6`.
- **Closes:** open item **A2-disp-ebh-scale** (a2-disp-ebh report § 5). Method identical to that
  report: A/A only, shipped primitives only, e-BH run EVERY round; every selection below is false.
  Sizes are rack multiples (72/rack); K = 30, q = 0.05, T = 320; ς̂ per variant on the standard
  1440 × 40 measurement panel (N-independent by convention).
- **Companion:** `research/2026-07-28-rack-local-conformal.md` — the construction whose validity
  premise this failure cannot touch; measured clean at ς̂ = 0.607, N = 20160 the same day.

## 1. The onset bracket vs fleet size (the headline)

"Onset" = smallest measured ς̂ with ≥1 false e-BH selection in any seed within T = 320 (a
first-crossing EVENT, not a terminal count — at the low edge the selections are transient, which
in the always-on loop still fires an action). Brackets, with seeds:

| N | racks | last all-seeds-clean ς̂ | onset ς̂ | evidence at onset |
|---|---|---|---|---|
| 2016 | 28 | 0.305 (4 seeds) | ≈0.31–0.43 | boundary report |
| 4032 | 56 | 0.153 (6) | 0.183 | 1/6 seeds |
| 10080 | 140 | 0.153 (6) | 0.183 | 1/6 seeds |
| 20160 | 280 | **0.123 (16)** | **0.153** | **3/16 seeds — the design-gate point itself** |
| 40320 | 560 | 0.023 (8; instrument floor) | **≤0.065** | 1/8 at 0.065, 1/8 at 0.094, 2/8 at 0.123 |

Knob-0 controls are clean (0/16 at N = 20160, 0/8 at N = 40320, pages far under budget), so the
low-ς̂ events are dispersion-driven, not an artifact of running e-BH every round at large N.

1. **The onset falls monotonically with N and does not plateau.** (0.31, 0.43) at 2k → (0.153,
   0.183] at 4k–10k → (0.123, 0.153] at 20k → ≤0.065 at 40k.
2. **The ADR 0023 pair-gate design target ς ≲ 0.15 is dead as an e-BH validity premise at ≥20k
   units.** At N = 20160 the gate point itself (ς̂ = 0.153) produced false selections in 3/16
   seeds; the coarse grid's 0/6 was seed luck. The "~2–3× margin" statement from the N = 2016
   boundary report does not survive scale.
3. **At 40k there is no usable fixed threshold at all.** Events occur at ς̂ = 0.065 — ~3× the
   instrument floor (0.023) and far below anything a real fleet will achieve (H8's realistic
   setting measures ς̂ = 0.31; the mini probe pilot will measure the real number). Tightening
   the gate is not a rescue at this scale; only the construction change is.
4. **Terminal counts continue N12's superlinear growth**: at ς̂ = 0.607, T = 320 sel/run = 1.8 /
   26.8 / 88.8 / 161.7 / 384.3 at N = 2016/4032/10080/20160/40320. Scale is exposure, with no
   sign of the extreme-value saturation an optimist might hope for.
5. **The paging wall falls too.** Ville-budget breach at ς̂ = 0.213 from N = 10080 up (14.2 >
   10.1; 28.3 > 20.2; 78.0 > 40.3); at N = 40320 the paging bracket is (0.153, 0.183) —
   the same collapse, lower barrier.

## 2. Mechanism (nothing new — the N12 cascade, quantified across N)

More racks ⇒ more draws of the shared per-rack λ ⇒ the fleet-max accumulator is an extreme-value
statistic in the RACK count, against a barrier that grows only like ln N; the step-up cascade
then converts the first crossing into a rack-sized batch. All measured orderings (onset falls
with N, counts superlinear, e-BH onset above paging onset at fixed N — until both hit the floor)
are consequences of that one structure.

## 3. Threats to validity, named

- Onset events at the low edge are RARE and burst-dominated: brackets are evidence of existence,
  not rates; 6–16 seeds per point (recorded per row in the JSON). A clean 0/6 at 4032–10080's
  0.153 does NOT certify that point at higher seed counts — 20160's 3/16 is the cautionary tale.
- ς̂ is measured on the standard 1440 × 40 panel per convention; the per-run realized rack-λ draw
  at 560 racks has a fatter max than the measurement panel sees — which is the mechanism, but it
  means "onset ς̂" indexes variants, not per-run realized dispersion.
- T = 320 rounds; longer horizons can only lower the onset (more first-passage time).

## 4. Operational consequence (decision needed — recorded, not taken)

The pair gate stays NECESSARY (it still gates paging at moderate N, and ICC ≲ 4% is untouched by
this note), but its ς half is NOT SUFFICIENT for `conformal_rank` e-BH accumulation at fleet
scale. The options on the table, for the ADR:

- **(a) Scale-indexed gate** — thresholds per selection-domain size (e.g. ς ≲ 0.12 at ≤20k;
  nothing certifiable at 40k). Honest but progressively vacuous as fleets grow.
- **(b) Bound the selection domain** — run e-BH per partition of ≤~10k units. Reduces exposure
  but the onset at 10k is already ≤0.183 at 6 seeds and unverified at 16; partitioning also
  weakens e-BH's fleet-level FDR statement to per-partition statements.
- **(c) Rack-local conformal blocks** (companion note) — kills the dispersion channel by
  construction (premise N-free; measured clean at ς̂ 0.607, N 20160, and MORE powerful under
  dispersion), at the disclosed cost that rack-level faults need their own channel, which still
  needs a gate at rack granularity.

The companion note's § 5 lists what (c) needs to be adoptable. Until a decision:
`dispersion-monitor`'s gate keeps its current thresholds for paging semantics, but any
`conformal_rank` emitter serving fleets ≥20k should be treated as heterogeneity-gate-failing
regardless of measured ς̂ — undefined-means-not-passing already covers the unmeasured case; this
extends it to the measured-but-unprotectable case pending the ADR.

## 5. Open after this pass

| id | item | priority |
|---|---|---|
| ~~A2-disp-ebh-gate-decision~~ | **DECIDED same day: (c), with (b) surviving as the in-code cap for fleet-scoped emitters — ADR 0026** | closed |
| A2-disp-rack-local-adoption | the companion note's § 5 checklist (rack-level channel story, contract wiring, K sensitivity) | high if (c) |
| A2-disp-real | unchanged — real ς̂ from the probe pilot (~09-21), now ALSO wants within-rack ς̂ for the rack-local premise | high, gated |
| A2-disp-ebh-horizon | onset vs T at fixed N (T = 320 is one slice; the always-on loop runs longer) | medium |
