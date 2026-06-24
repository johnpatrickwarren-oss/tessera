# Tessera — benign-change vs fault discriminator (Lever B)

Lever A (ADR 0015) removes COMMON-MODE benign change; the shard-SPECIFIC residual it leaves — which dominates real GWDG firing — needs this discriminator. Hypothesis: benign = stable MEAN step (re-recordable); fault = DISTRIBUTIONAL change (variance / trend / collapse) the mean-shift BF does not model. Thresholds: F>2, trend t>4, collapse>6σ. 400 trials/type, m=600/n=200, benign step δ=4.

## Fault-signature scores by shard type (benign false-trip rate is MEASURED)

| type | mean F (var ratio) | mean trend t | mean collapse σ | signature rate |
|---|---|---|---|---|
| healthy | 1.008 | 0.78 | 0.052 | 0.0% |
| benign | 1.016 | 0.783 | 0 | 0.3% |
| fault-variance | 9.081 | 2.342 | 0.145 | 100.0% |
| fault-trend | 1.708 | 11.765 | 0 | 100.0% |
| fault-collapse | 1.683 | 1.501 | 20.013 | 100.0% |
| fault-meanonly | 1.016 | 0.783 | 0 | 0.3% |

A clean benign mean step (and the mean-only fault) leave the signature near baseline; variance / trend / collapse faults each trip their own score. The benign signature rate is the false-fault floor of the signature test.

## Confusion matrix — true type → predicted verdict

| true type \ predicted | healthy | benign | fault |
|---|---|---|---|
| healthy | 100.0% | 0.0% | 0.0% |
| benign | 0.0% | 100.0% | 0.0% |
| fault-variance | 0.0% | 0.0% | 100.0% |
| fault-trend | 0.0% | 0.0% | 100.0% |
| fault-collapse | 0.0% | 0.0% | 100.0% |
| fault-meanonly | 0.0% | 100.0% | 0.0% |

The signature test routes the three signature-bearing fault types (variance / trend / collapse) to **fault**, and a clean benign mean step to **benign** — while a pure mean fire alone never escalates to fault. The diagonal-ish structure (faults→fault, benign→benign) is the discriminator working.

## The irreducible limit + the event channel

**Mean-only fault (the irreducible case):** a fault whose only signature is a mean step the size of a benign change is classified **0.0% fault** by the signature-only classifier — i.e. it is MISSED (routed to benign), because it is statistically identical to a benign mean step. No signature test can separate them; this is a real limit, not a tuning gap.

**The only fix is an external EVENT signal** (deploy/schedule — Tessera's freeze-hook): treat an unexplained mean fire (fired, no signature, NO event) as a fault. With benign changes carrying an event with coverage p (faults never do):

| event coverage of benign | benign false-fault | mean-only fault caught |
|---|---|---|
| 0.0% | 100.0% | 100.0% |
| 50.0% | 50.5% | 100.0% |
| 90.0% | 9.0% | 100.0% |
| 100.0% | 0.0% | 100.0% |

As event coverage → 100%, the unexplained-fire→fault rule catches the mean-only fault while the benign false-fault rate falls to 0 — the discriminator's ceiling for mean-only faults is set entirely by event coverage, NOT by the signature test. This is exactly the role of Tessera's event-conditioned freeze-hook.

**This table RESTATES the event model, it does not measure event power.** Under the assumption "faults carry no event, benign changes carry one with probability p," `meanonly_caught = 100%` and `benign_falsefault = 1 − p` are algebraic IDENTITIES, not results. The real-world value depends on the actual event coverage of benign vs faulty changes, which is **unknown/unmeasured here** (it needs a real deploy/schedule feed — Tessera's DS-integration freeze-hook). What this section establishes is the SHAPE of the dependence and that the channel is the only lever for mean-only faults — not a measured catch rate.

## Verdict

**Lever B separates benign change from faults that have a distributional signature** (variance / trend / collapse → routed to fault), while a clean benign mean step is correctly absorbed as benign — the per-shard companion to Lever A's FP/FDR guarantee. **The honest limit:** a fault whose only signature is a mean step the size of a benign change is irreducibly confusable with benign change; only an external event/topology signal resolves it, and the mean-only-fault catch rate is set by event coverage (Tessera's freeze-hook), not by the statistics.

> **Scope:** synthetic ground truth (no real benign-vs-fault labels). Fault models are stylized (variance/trend/collapse). The collapse score is **one-sided (downward only)**: an UPWARD benign step of any size is invisible to it, but a DOWNWARD benign step ≥6σ is indistinguishable from a collapse — collapse separates on magnitude, not benign-vs-fault, in that direction. Re-record masking of slow faults is the ADR 0006 tradeoff, not re-measured here.
