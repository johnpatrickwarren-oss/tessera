# 2026-07-02 — Full math audit: Tessera + engine vs the cited papers

Five parallel audit passes over the repo's mathematical claim surface, each verifying code against
the primary sources (arXiv:2009.02824 e-BH; 2501.19360 Carefree; 2502.08539 stopped e-BH;
2203.03532 e-detectors; 1906.07801 safe testing; universal inference), including Monte-Carlo
re-derivation where a claim was numerically checkable. Passes: (1) e-value constructions,
(2) e-BH/FDR layer, (3) Mode B spatial null, (4) localization/locality, (5) baseline/whitening +
top-level claims.

**Fixes shipped same-day** (branch `audit/math-correctness-fixes`) are marked ✅ FIXED. Items
marked ⚠️ STANDING are open work.

---

## Confirmed exact (verified against the papers)

- **Engine e-BH** (`fleet/e-bh.js`): exact Wang–Ramdas threshold `k·e_(k) ≥ N/q`; conservative
  tie/missing handling; no p↔e conversions anywhere on the FDR path.
- **√E−1 SupFDR adjuster** (`tools/supfdr.ts`): `∫₁^∞(√e−1)/e² de = 1` exact; applied to the
  running max per Carefree Thm 1; the 1.08α naive-leak figure matches the paper's simulation.
- **`normalizedMixtureEValue`** (`tools/mixture-evalue.ts`): `(M_t + (T−1−t))/T` is a genuine
  uniform convex mixture over onset e-processes; ADR 0019's raw-SR diagnosis (E≈T) is correct.
- **safe-t** (engine): exactly the right-Haar/GROW construction — E[BF|H0] = 1 uniformly over the
  composite location-scale null. (This is the valid version of what ADR 0013's BF attempted.)
- **serial-calibration** (`tools/serial-calibration.ts`): predictable bet, finite mixture, convex
  combination with the marginal martingale — all valid; the ADR 0020 negative result is honestly
  documented and externally corroborated.
- **Stopping discipline**: every production e-BH call site except the mode-b-loop is fixed-time.
- **min(e_{t−c1}, e_{t−c2})** (`tools/peer-availability.ts`): min taken AFTER the e-value map —
  valid conservative e-value, conditional on ≥1 sibling being a clean null.
- Negative-result ADRs (0008/0009/0012/0013-N3/0015/0019 raw-SR) match the literature.

---

## F1 — Engine nuisance-robust BF is not an e-value (CRITICAL; ⚠️ STANDING, engine-side)

`deploysignal-engine detectors/nuisance-robust-bf-e-value.ts:199-206` recenters both whitened
samples by the ESTIMATED calibration mean, then evaluates a proper-prior N(0,τ²) marginal-likelihood
ratio. A proper prior centered at 0 is not shift-invariant — the recentering is plug-in through the
back door. Ideal-case exact null mean with prior scale x = n·tauMult:

    E[BF|H0] = (1+2x)/√((1+x)(1+3x))  →  2/√3 ≈ 1.1547 as x→∞

i.e. ≈1.155 at EVERY calibration length (MC-verified against the shipped function: x=1 → 1.0637 ±
0.0014 vs theory 1.0607). The original validation missed it because the statistic is heavily
sub-Ville in the tails — the mean excess lives in a tail K=600 MC cannot sample. Impact bounded
(FDR ≤ 1.155q) but "E[BF|H0] ≤ 1 by construction" (engine header, envelope metadata, ADR 0013) is a
false theorem claim. **Fix: substitute the engine's own safe-t; deprecate the BF.** ADR 0013 carries
a correction note (✅ shipped).

## F2 — gaussian-lr-evalue plug-in invalidity (CRITICAL; ✅ FIXED — caveats + demotion to diagnostics)

`tools/gaussian-lr-evalue.ts` claimed E[e|H0]=1, but `shiftZ` standardizes by the plug-in cal-window
SD; with estimated s the true null mean DIVERGES (E[exp(cz²)] with t-tails; measured cal=30 →
E ≈ 1.6×10⁵). Its "exact" survival understates the plug-in tail, making the conditional-calibration
boost anti-conservative (partially confounds the PR #33 / N4 reading). Header now carries the caveat
and both functions are marked oracle-null diagnostics; a valid replacement is safe-t with its exact
t-based survival.

## F3 — metric-router fed the SR peak to e-BH (CRITICAL, live path; ✅ FIXED)

`tools/metric-router.ts` stationary path scored shards with `eDetector(...).peak` — the SR
running-max, E[M^SR|H0] ≈ #onsets, NOT an e-value — and fed it to `eBenjaminiHochberg`, reporting
"CERTIFIED". The exact pre-ADR-0019 mistake, fixed in baseline-monitor but missed here. Now e-BH
gets `normalizedMixtureEValue`; the peak survives only as the ROC-matched recall statistic.

## F4 — Triad flag-then-substitute routing had no covering theorem (CRITICAL; ✅ FIXED — min rule)

`applyTriadRouting` (in-memory + streaming reducer + control-triad prototype) overwrote a flagged
shard's detection e-value with e_{t−c2}. Flag (c1−c2) and substitute (t−c2) share c2's idiosyncratic
noise (corr ≈ ½ under matched twins); conditioning on {flagged} — including false flags at rate ~q —
up-tilts the substituted value. E[e_routed|H0] ≤ 1 was never established; the FDP 0.000 was empirics.
Replaced everywhere by the unconditional **min rule** min(e_{t−c1}, e_{t−c2}); the sibling null is
reporting-only. ADR 0022 carries a correction note. Cost: recall ~0.87 in the same-sign
fault+contamination corner (already measured in peer-availability).

## F5 — mode-b-loop per-cycle re-normalization broke the cross-cycle theorem (CRITICAL; ✅ FIXED)

`mode-b-loop.ts` re-scored `normalizedMixtureEValue(s.slice(0, monEnd))` each cycle: weights 1/T_k
change per cycle, so cycle values are NOT prefixes of one e-process — dispatch-at-first-crossing was
uncovered optional stopping (no bound on the ever-dispatched set; renormalization shrinkage could
spuriously "resolve" real-fault actions). **Fix: `geometricMixtureEValue`** — Shiryaev onset prior
w_j = ρ(1−ρ)^{j−1} mixed over a fixed hazard grid ρ ∈ {1/64, 1/1024, 1/16384}; horizon-independent
weights ⇒ one e-process ⇒ the adjusted running max is prefix-monotone and e-BH on it controls
**SupFDR ≤ q at every look including data-dependent ones** (Carefree Thm 1). Tests lock in
prefix-monotonicity + the empirical null bound. `normalizedMixtureEValue` remains correct for
fixed-window terminal analyses (scope note added).

## F6 — UI "any φ by construction" proof hole (GAP; documented in RESEARCH-INDEX P1; ⚠️ STANDING, engine-side)

The engine's UI variant's independence premise (eval ⟂ train given predecessors) is false for the
standard call pattern: the cal-eval half temporally PRECEDES the test-train half, so the Fubini step
doesn't close for φ ≠ 0. Empirically no violation (MC E ≈ 0.13–0.17 at φ up to 0.999; ~6× structural
slack) — P1 stands empirically; "by construction" overstates. Engine-side fix: sequential/predictable
numerator (fit on strictly past data), which would also make the e-detector increments genuine
e-processes (closing O3 by construction).

## F7 — Plug-in nuisance sensitivity of the guarantee-bearing increment (GAP; 🔧 PARTIALLY HARDENED — W1 2026-07-02, see addendum below)

Quantified: 10% under-estimate of σ̂ drives E[mixture output|H0] from 0.52 to **7.6**. In both
canonical paths, center/scale/φ/loadings are plug-in; safe-t and the UI e-value are wired into
NEITHER (zero imports). What holds the Mode B claim up is a set of uncalibrated constants:
`|ρ₁| ≤ 0.1` (≈2.2 Bartlett SEs at n=500, ≈250 SEs at 5.18M ticks), `passFrac ≥ 0.8 ∧ whiteFrac ≥
0.5`, `CALIB_FEED_CAP=500`, `DETECTOR_NULL_TOL=1.3` (a ~30% FDR-budget giveaway). Fixes: Student-t
predictive increments (safe-t logic) for σ; φ-grid mixture over φ̂ ± 2SE; Bartlett-scaled gate
thresholds; aggregated cohort e-process for the demotion decision.

## F8 — Mixed-cadence guard loophole (GAP; ✅ FIXED for triad bundles — W1 2026-07-02, see addendum)

On the mixed-cadence streaming path the ≥56d guard checks a baseline whose SERIES the fit never
reads — the actual fit comes from the first ~8% of the monitoring window, assuming clustersynth's
onset ≥ 0.1T convention (DGP knowledge in a production-faithful path; a fault in the first 8%
contaminates its own null). Also ADR 0009's quantitative validity condition (n/m ≤ 0.4 tick ratio)
is never checked — 60d baseline + 60d monitoring passes at n/m = 1. Fixes: assert on the fit feed;
add the n/m check + an effective-sample-size floor; fit the mon-cadence null from the control cohort.

## F9 — Spatial-null distributional assumptions unaudited on real data (GAP; 🔧 PARTIALLY ADDRESSED — W1 built + MEASURED the trade-off, see addendum)

The Gaussian-LR increment needs the standardized contrast residual conditionally 1-sub-Gaussian;
never audited on real contrast residuals (raw-telemetry kurtosis up to 1540, ADR 0011; the cap does
not restore E[g] ≤ 1). **Best fix is structural: distribution-free spatial increments** — under H0
the (t, c) pair is within-tick exchangeable, so sign-flip / sequential-rank e-values on the contrast
are exact for ANY tail (echoes the Kayenta Mann–Whitney prior art). Also: κ measures variance leak
while ADR 0021 proved the harm is mean-shift leak (a shift-sensitive comparability gate would
reconcile the ADR 0021 vs peer-availability tension); peer selection and fit reuse the same window
(winner's curse — time-split them).

## F10 — κ narrative math (MINOR; ✅ FIXED)

Under matched loadings κ = 2σ_n²/(λ²σ_f²+σ_n²), so the common-mode variance fraction is **1 − κ/2**
(κ→2 at zero common-mode), not 1 − κ. power_w κ=0.88 ⇒ ~56% shared variance, not ~12%; κ≤0.1 ⇔
≥95% shared (the gate is a high bar by construction). `gwdg-comparability.ts`,
`peer-availability.ts` GWDG rows, and `contamination-detector.ts` docs corrected.

## F11 — Localization/locality gaps (GAP; 🔧 PROGRAM LARGELY BUILT — W3 2026-07-02, see addendum)

- `attributeCommonMode` (engine) is uncalibrated co-firing clustering: absolute member count ≥2, no
  null model, no temporal coincidence window. False-candidate probability ≈ C(g,2)α² grows with
  group size: g=72, α=0.01 → ≈0.15 per rack per window, linear in rack count. R78 swept a 6-shard
  toy and cannot see this.
- **No locality error metric exists** (hop distance attributed→true, stratified shard/rack/zone,
  misses counted). "Attribution ≥95%" is conditional-on-detection; the hierarchical-evalue type's
  definition is tautological (README caveat shipped ✅); `groupAttribution` scored an empty selection
  as 1.0 (✅ FIXED → NaN).
- No leave-one-shard-out factors: a 2-member domain's robust center is the average — a faulty member
  self-absorbs half the fault and mirrors a spurious excursion onto its sibling.
- The Wall-A conditional-Markov gate is invoked with a ZERO covariate (`baseline-monitor.ts:192`) —
  degenerates to marginal whiteness; it never conditions on the actual common-mode estimate (the O5
  point). Also `partialPastTStat` omits X_{n−1}; fixed thresholds drift in effective level with T.
- Detection and localization share the same temporal statistic — the inverse of GREYHOUND's division
  (contrast for localization, temporal for detection); the validated Mode B contrast is not wired
  into the localization path.

**Program (ordered by locality payoff):** (1) calibrated group e-values (mean of member e-values is
an e-value; binomial tail vs α̂_fleet at minimum) + a coincidence window, replacing the co-firing
count; (2) coarse-to-fine e-value drill-down with per-level q, reporting the finest identified level
and abstaining below it (N6 killed the global guarantee, not the drill-down; e-Partitioning when
verified); (3) leave-one-out factors for domains ≤5 (or refuse to deflate 2–3-member domains, route
to Mode B); (4) hop-distance locality metric, unconditional, then re-baseline the README table;
(5) rank candidates post-detection by the κ-gated peer contrast; feed the real fitted common-mode to
the Wall-A gate.

## F12 — Claims vs measurement (✅ FIXED where doc-level; ⚠️ validation work standing)

- R72/R77 run on an iid-Gaussian ORACLE-baseline DGP (`updateBettingState(x, 0, 1, α)`); R77 "drift
  magnitude" is a ramp SLOPE reaching 10–75σ terminal at the quoted defaults, 5 trials/cell. README
  caveats shipped ✅. Standing: add mismatched-DGP rows (AR(1) ρ ∈ {0.5,0.9,0.95}, t₃, regime switch,
  diurnal) so the table carries its own falsification boundary; raise trials/cell.
- Scale headlines: 4–8σ sustained faults only, 5 seeds, no committed machine-readable artifacts;
  `mode-b-control` FDP 0.099 vs q=0.1 (boundary — consistent-with-control, no margin). Standing:
  ≥20-seed committed artifacts + a 1–3σ magnitude sweep.
- METHODOLOGY/CLAUDE.md claimed baseline-monitor "routes I(1) counters to a trend detector" — it
  abstains; metric-router is a separate CLI the ramp never invokes. ✅ FIXED.
- O1/EOP: decided, zero code. RESEARCH-INDEX status corrected ✅; implementing EOP tracking is the
  open item that would give Mode A its first stated controllable error metric.

---

## Free power on the table (not validity — opportunities)

1. **Closed e-BH** (arXiv:2504.11759): usually-strict superset of e-BH rejections, same e-values,
   same assumptions — drop-in at `emitter-contract.ts`. (Implement from the closure construction;
   the "E_j ≥ 1/(αk)" shortcut was refuted 0-3 in the 2026-06-28 pass. N4 discipline applies.)
2. **No adjuster tax at fixed-time terminal analyses**: the terminal mixture value (E ≤ 1 at fixed
   T) is valid unadjusted; pay √E−1 only where an all-times reading is real (the loop).
3. **Weighted e-BH** (weights averaging to 1): Mode-A rankings as priors on the Mode B family.
4. **Donation e-LOND** (arXiv:2603.24792) as the tighter SupFDR route vs the √-shrinkage.
5. **Conjugate (Robbins) betting**: ∫exp(λr−λ²/2)dN(0,c²)(λ) = (1+c²)^{−1/2}exp(c²r²/(2(1+c²))) —
   closed form, replaces the 6-point λ grid; or GRAPA-style predictable betting.
6. **Sequential-UI increments** in the e-detector (numerator fit on strictly-past data) → genuine
   SRR e-detector with real ARL theorem (closes O3 by construction) and repairs the F6 proof hole.

## Addendum — W3 follow-through (2026-07-02, same-day)

**Engine v0.6.3-pre (ADR 0022-engine):** `attributeCommonMode` gains calibrated group evidence —
`group_e_value` (mean of member e-values over ALL members; validity inherited), `binom_tail`
(size-calibrated Binomial(g, α̂) tail — the raw ≥2-count rule false-candidates quadratically in group
size: measured .01→.24→.88 at g=4/18/72 vs ≤.03 flat calibrated), and a temporal coincidence window;
legacy calls byte-identical. `detectionOrientedResiduals` deflates 2–5-member domains against
LEAVE-ONE-OUT factors applied exactly once post-sweeps (iterated LOO annihilates the pair contrast —
measured; the ≤3-member sibling mirror is intrinsic, r_b + λ̂_b·r_a ∝ b, and documented: localize
small domains at pair granularity). 237/237.

**Tessera W3b:** hop-level `LocalityMetric` in the e2e pipeline (unconditional exact/rack/missed +
precision splits — the metric F11 said was absent); `tools/locality-drilldown.ts` coarse-to-fine
per-level e-BH on group-mean e-values reporting the FINEST identified level with abstention below
(level 0 carries FDR ≤ q; deeper levels conditional-on-descent — the honest middle N6 permits;
diffuse-weak group faults abstain by construction, ADR 0015 v2 remains the open detector for those);
Wall-A/3.1 diagnostic now receives the FITTED common-mode prediction as its covariate (was a zero
vector — marginal whiteness only) and the partial-past regression includes X_{n−1}; tolerance gets a
2-Bartlett-SE noise floor; the vacuous hierarchical-evalue attribution is now reported UNMEASURED
(matrix regenerated: 94 attribution-correct, was 114 with the 20 tautological rows; README + floor
test updated so it cannot silently return).

## Addendum — W1/W2 follow-through (2026-07-02, same-day)

**W1 (Mode B hardening).** (a) F8 FIXED for triad bundles: mixed-cadence fits now take the CENTER from
the ≥2-month baseline contrast (cadence-independent — the guard finally guards a feed that is used) and
the DYNAMICS from the FULL-window mon-cadence c1−c2 sibling (fault-free known null; 12×+ the old 8%
prefix; the "onsets ≥ 0.1·T" DGP assumption is gone), with the calibration monitor run over the FULL
detection-length sibling feed (in-sample standardization ⇒ the CALIB_FEED_CAP rationale does not apply
— this is ADR 0020's named "deeper fix", and it is load-bearing: without it the better sibling φ̂ let
gpu_temp_c pass lag-1 whiteness at 1 Hz and FDP hit 0.779 in a probe run; with it the counter REVOKES
and FDP returns to 0.000 at unchanged recall 0.794). (b) Whiteness gates now carry an explicit
noise floor (max(0.1, 2/√n)) documenting the effect-size-vs-significance regime. (c) F9: a
distribution-robust linear bounded-bet increment family ('bounded', mixture-evalue.ts) was BUILT and
MEASURED — exactly valid under any conditionally mean-zero clipped residual, but VARIANCE-BLIND
(E[1+λc]=1 under any symmetric law), and a scale probe showed that blindness halves recall on
detachment/variance-signal faults (clean R=8 0.987→0.539). The Gaussian increment's scale-error
fragility and its variance-fault power are the same sensitivity; Mode B therefore stays Gaussian with
the fragility managed by (a) + the ∏g monitor, and 'bounded' ships as the option for
mean-shift-only monitoring under distribution doubt. (d) baseline-monitor prints the ADR 0009
n/m > 0.4 plug-in advisory.

**W2 (O1/O3).** `srEDetector` (tools/e-detector.ts): SR over genuine e-process increments (fixed-grid
Gaussian-LR mixture) at threshold patience/α ⇒ per-window false-alarm ≤ α (Doob on the SR
submartingale, E[M_n]=n) AND ARL ≥ patience/α ⇒ **EOP ≤ α** — both conditional on the certified
residual null. O1 implemented; O3's construction gap closed conditionally (no promotion question for
this variant; the UI-increment e-detector remains the disclosed-empirical comparator). Reported as the
sr@T/α column + EOP statement in baseline-monitor.

## Version nit

The engine pin tag `#v0.6.0-pre` ships `"version": "0.5.0-pre"` in its own package.json (source repo
at 0.6.1-pre). Constructions match across dist/source; the self-reported version is stale.
