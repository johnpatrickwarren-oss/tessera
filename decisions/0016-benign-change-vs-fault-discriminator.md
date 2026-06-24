# ADR 0016 — benign-change vs fault discriminator (Lever B)

- **Date:** 2026-06-24
- **Status:** Accepted (cold-eye SHIP-WITH-FIXES — all findings addressed)
- **Builds on:** ADR 0015 (Lever A removes common-mode benign change; the shard-specific residual is
  what remains), ADR 0013 (the BF mean-shift e-value + its same-variance scope), ADR 0011 (a per-fire
  run-length discriminator FAILED), ADR 0006 (adaptive re-record masking tradeoff).

## Context

Lever A (ADR 0015) delivers FDR ≤ q on a common-mode-coupled fleet, but the SHARD-SPECIFIC residual it
leaves — which dominates real GWDG firing — needs a discriminator: a legitimate workload/phase shift on
one shard fires the e-value exactly as a fault does. ADR 0011 showed a per-fire run-length discriminator
fails (benign drift and faults both fire at run-length ~9), so persistence is not the signal.

## Construction

Hypothesis: a benign shard-specific change is a STEP to a new stable regime (a MEAN shift, same
distribution shape — the lifecycle re-records it); a FAULT is a DISTRIBUTIONAL change the mean-shift BF
does NOT model. A complementary fault-SIGNATURE test on the whitened residual:
- **variance** — F = innovation-variance(test)/innovation-variance(cal) (SDC / bit-flip → inflation);
- **trend** — OLS slope t-stat on the WHITENED innovations (degradation ramp); whitening is essential —
  on raw autocorrelated values the t-stat is ~400× inflated, manufacturing spurious benign trends;
- **collapse** — downward drop of the test mean in cal-σ units (detachment).

`classify`: signature present → **fault**; else a mean-shift BF fire → **benign**; else → healthy.

## Result (`pnpm fault-disc`, `shadow-results/fault-discriminator-report.md`)

- **Confusion matrix (400 trials/type):** healthy→healthy 100%, benign→benign 100%, fault-{variance,
  trend,collapse}→fault 100%, with a benign false-fault floor of ~0.3% (the trend-tail). The signature
  test cleanly routes signature-bearing faults to fault and a clean mean step to benign.
- **Detection does not cliff at the chosen fault sizes** (cold-eye-verified): variance caught to ×1.5,
  trend to total≈4–5, collapse to ≈6σ — the thresholds (F>2, t>4, collapse>6σ) are above the edge, not
  tuned to barely pass.
- **THE IRREDUCIBLE LIMIT (the honest negative):** a fault whose only signature is a mean step the size
  of a benign change → classified **100% benign (missed)**. It is statistically identical to a benign
  mean step (the two generators are byte-identical by construction) — a real limit, not a tuning gap.
- **The event channel is the only resolver:** treating an unexplained mean fire (fired, no signature,
  NO event) as a fault catches the mean-only fault. The event-gating table shows the SHAPE of the
  dependence, but `meanonly_caught=100%` and `benign_falsefault=1−coverage` are algebraic IDENTITIES of
  the model (faults carry no event, benign carry one w.p. coverage) — NOT measured power; real event
  coverage is unknown. This is exactly the role of Tessera's event-conditioned freeze-hook.

## Decision

**Lever B separates benign change from faults that have a distributional signature** (variance / trend /
collapse), the per-shard companion to Lever A's FP/FDR guarantee. A clean benign mean step is absorbed
as benign. **A mean-only fault is irreducibly confusable with benign change** and is resolvable only by
an external event/topology signal — the catch rate is set by event coverage, not by the statistics.

## Honest bounds

- **Signature-bearing faults only.** Mean-only faults need the event channel (above).
- **Collapse is one-sided (downward):** an upward benign step is invisible to it; a downward benign step
  ≥6σ is indistinguishable from a collapse (magnitude, not benign-vs-fault, in that direction).
- **Event-channel power is ASSUMED, not measured** — real benign/fault event coverage is unknown.
- **Re-record masking** of slow faults is the ADR 0006 tradeoff, not re-measured here.
- **Synthetic ground truth** — no real labeled benign-vs-fault dataset exists.

## The two-lever picture (ADRs 0015 + 0016)

Fleet FP/FDR ≤ q by construction on a common-mode-coupled fleet (Lever A), PLUS a per-shard
benign/fault discriminator for signature-bearing faults (Lever B). The end-to-end guarantee's remaining
real-world gaps are: a genuinely common-mode-coupled real substrate (GWDG is not one), the mean-only
fault (needs a real event feed), and a multi-factor common-mode for heterogeneous loadings. The BF
e-value is the load-bearing primitive throughout — it is what makes both the fleet residual (0015) and
the mean-shift trigger (0016) valid.
