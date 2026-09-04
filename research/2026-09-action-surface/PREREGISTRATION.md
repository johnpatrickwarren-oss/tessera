# Pre-registration — margins and e-BY effect intervals on the Mode-B action surface (`2026-09-action-surface`, ADR 0029)

- **Study id:** `2026-09-action-surface`
- **Register:** `~/concord/knowledge/WORKLIST.md` (Tessera consumer surface, 2026-09-03);
  `knowledge/stats/pages/e-by-surface-2026-09-03.md` and `e-by-fcr-2026-09-03.md` (the same
  composition measured in tessera-rng and the engine); `knowledge/stats/pages/ramdas-wang-2025.md`
  §7 (Proposition 13.4, Definition 13.6, Theorem 13.7) and §4 (Proposition 9.12, the e-BH
  threshold form).
- **Discipline:** `knowledge/methodology/pre-registration-discipline`; `harness-discipline`.
- **Engine:** v0.6.11-pre (`fleet/e-bh.ts` `log_threshold_e`/`log_margin`, engine ADR 0027;
  `fleet/e-by.ts` and `mixtureConfidenceSequenceAt`, engine ADR 0030).
- **Status: REGISTERED, NOT RUN.** At this commit `CertifiedSelection` carries `{selected, K,
  evidence, certificateIds, openPremises}` only (`tools/emitter-contract.ts:237`), the loop keeps
  `.selected` and discards the rest (`tools/mode-b-loop.ts:180`), `FleetAction` is `{emitter,
  shard, cycle, eValue, q}` (`:35`), and no per-shard object retains the residual sum. Committed
  first so that no endpoint, band or seed below is chosen after a number is seen; a later change
  is an amendment, appended and dated.

## 1. The system, from code

Per cycle, the telemetry seam turns each treatment shard's raw contrast `d = treatment − control`
into a standardized residual window `r = applyContrast(d, fit)` — centered at the baseline fit's
`center`, whitened at its `φ`, standardized by `(loc, scale)` (`tools/contrast.ts:28-31`) — and
hands the loop only the window's e-value (`tools/telemetry-source.ts` `windowToEmitter`). The
loop runs the certified e-BH per emitter (`certifiedFdrBenjaminiHochberg`,
`tools/emitter-contract.ts:258`), dispatches each newly selected shard as a `FleetAction`, and the
`JsonlAuditSink` writes `{op, emitter, shard, cycle, eValue, q}` (`tools/action-sinks.ts:57`).
Nothing downstream says how far a shard sat from the threshold, or how large its shift is.

Two engine surfaces answer that at no new statistical cost:

- **Margins.** The engine's e-BH already returns `log_threshold_e = log(N/(q·max(K,1)))` and each
  input's `log_margin` (≥ 0 iff selected; Proposition 9.12). DIAGNOSTIC, no guarantee: the
  threshold moves with K.
- **Effect intervals.** On the standardized residual the Gaussian-mixture confidence sequence's
  level-free inputs are the window's residual sum `S_t` and length `t` (σ² = 1, `ρ` registered):
  `C(α) = S_t/t ± sqrt(v·log(v/(α²ρ)))/t`, `v = t + ρ`. Its e-process `M_t(S_t − tm)` does not
  involve α, and the window end is a fixed time, so the family is level-free e-CIs
  (Proposition 13.4); e-BY at `α_i = δ|S|/K` gives FCR ≤ δ for any selection rule under any
  dependence (Theorem 13.7). The interval is for the WINDOW-MEAN contrast shift from the baseline
  fit, in standardized units — not the post-onset shift the SR onset mixture detects.

**Premise, and who checks it.** An un-shifted shard's residual is conditionally mean-zero
sub-Gaussian(1) under the reference law. That is exactly what the loop's per-shard calibration
monitors test on the known-null cohort with `incrementKind: 'gaussian'` (`mode-b-loop.ts:164`,
`E[exp(λr − λ²/2)] ≤ 1` over λ ∈ {±0.5, ±1, ±2}), and it is the same gate that licenses Mode B.
So the interval is licensed by the gate that licenses the dispatch and disappears with it (Mode A
dispatches nothing). Under a constant contrast shift Δ the residual shift is `Δ/scale` at the
window's first tick and `Δ(1−φ)/scale` after it (the whitening); the window mean is their
weighted mean. With no baseline fit the seam self-fits the window (`fits?.get(shard) ??
fitContrast(d)`), its center is the window's own median, and the residual mean is ≈ 0 by
construction — so no interval is emitted for a self-fitted shard.

## 2. What will be built (registered, not yet written)

- `CertifiedSelection` gains `logThresholdE` and `logMargins` (index-aligned with the inputs),
  read from the engine's output the function already has.
- `EmitterCycle.csInputs?`: per shard `{ S_t, t } | null`, aligned with `shards`; the seam fills
  it from the standardized window when a baseline fit was used, `null` when it self-fitted.
- `FleetAction` gains optional `logMargin`, `logThresholdE` and `effect: { alphaI, t, center,
  halfWidth, lower, upper }`; `EmitterReport` gains `logThresholdE`; the audit sink's dispatch
  and withdraw records carry the same fields when present. `ModeBLoopOptions.fcrDelta` defaults to
  `q`. `ρ = CS_SIGMA_SQUARED_PRIOR = 1`, registered here.
- e-BY per emitter per cycle: universe `K = shards.length`, selected `S'` = the discovered shards
  that carry `csInputs`, `α_i = fcrDelta·|S'|/K`, through the engine's `eBenjaminiYekutieli`.
- Tessera ADR 0029. Nothing else moves: selection, α, the Mode gate, reconcile, the sinks' effects
  and the demo bundles are unchanged; a cycle without `csInputs` produces actions and records
  byte-identical to today's.

## 3. The study

Synthetic windows in the seam's own shape (`RawCounterWindow`), one counter. Per shard,
treatment and control are independent AR(1) streams with `φ = 0.5` and unit innovations; the
contrast is their difference; a faulted shard's treatment carries a constant shift `Δ ∈ {0, 4, 8}`
over the whole monitoring window (`T = 300`). **Baseline fits are fixed** for the study: one
800-tick healthy contrast per shard, `fitContrast`, seed `0xba5e`. `K = 40` shards, the first
`F = 4` faulted. Cohort: 10 healthy control-vs-control pairs of length 300 per cycle. One cycle
per replication (the loop from a fresh state), `q = 0.05`, `fcrDelta ∈ {0.05, 0.10}`.

Two selection rules on the same replication:

- **Rule A — the shipped rule:** the loop's dispatched set for the cycle (certified e-BH at
  q = 0.05 on the seam's e-values), intervals = the `FleetAction.effect` the sink received.
- **Rule B — extremeness:** the 3 shards with the largest `|S_t|/√t`, intervals from the same
  `csInputs` through the engine's `eBenjaminiYekutieli` at `fcrDelta·3/40`.

**Truth.** `θ = 0` exactly for every un-faulted shard and for every shard at Δ = 0. For a faulted
shard at Δ > 0, `θ` is the mean standardized residual over the window under the fixed fit,
estimated by Monte Carlo over `M = 2,000` windows on seeds disjoint from the study's (se ≈ 0.002),
reported with its se. A miss is `θ ∉ [lower, upper]`.

`N = 500` replications per Δ; seeds `20260908 + 7919·i + 10⁶·cell`; truth seeds `40000001 + 7919·j`.
FCP per replication = misses / (intervals ∨ 1); `fcr` = mean FCP, `fcr_se` its standard error.

**Endpoints.**

- **P1a — exact-truth FCR under adversarial selection (ship gate).** Rule B, Δ = 0, both
  fcrDelta: `fcr ≤ δ + 3·fcr_se`. Registered prediction: HELD, far under δ.
- **P1b — FCR under the shipped rule on faulted windows.** Rule A, Δ ∈ {4, 8}, both fcrDelta:
  `fcr ≤ δ + 3·fcr_se` with the Monte-Carlo truth on faulted shards. Prediction: HELD.
- **P2 — exact-truth shards among the dispatched are covered (reported).** Rule A, Δ ∈ {4, 8}:
  among dispatched un-faulted shards (false dispatches), miss fraction; expected to be a small
  population (e-BH at q = 0.05), reported with its count.
- **P3 — informativeness (reported).** Rule A, Δ > 0: fraction of dispatched faulted shards whose
  interval excludes 0; mean half-width; width ratio e-BY/naive.
- **P4 — structural.** Every `FleetAction.effect` equals the closed form from its `csInputs` at
  1e-12; every dispatched shard's `logMargin ≥ 0` and every non-dispatched shard's `< 0` on every
  replication (Proposition 9.12); a cycle whose emitter is Mode A dispatches nothing and carries
  no interval; a cycle with `csInputs` omitted produces `FleetAction`s deep-equal to today's shape.

Harness rules: no catch; imports the repo's compiled `tools/*.js` (Tessera's own pattern) and the
engine's `fleet/e-by` from `node_modules`; `analysis/check_report.mjs` re-renders `REPORT.md`
from `cells.json` and requires byte equality.

## 4. Ship rule

P1a HELD at both levels and P4 HELD → ADR 0029 ACCEPTED, the fields ship. P1b FAILED with P1a
HELD → ship, with the finding filed and the estimand's caveat on the field. P1a or P4 FAILED →
nothing ships; a contradiction with Theorem 13.7 (or Proposition 9.12) is filed at
`confidence: contested` and the study stops.

## 5. Not measured

The estimation premise (fits fixed by design); multi-cycle accumulation (the interval is per
window, and the loop's running e-value is not the CS's object); the 'bounded' increment kind;
real telemetry; clustersynth bundles (the reference feed) beyond the existing end-to-end test.
