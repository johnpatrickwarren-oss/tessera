# 2026-07-28 — Donation e-BH assessed (no gain on this substrate); O2's "no off-the-shelf construction" is outdated

Two literature-backlog items closed in one pass. Sources: arXiv:2603.24792 (Xu–Fischer–Ramdas,
donation/e-closure online FDR, v3 2026-07-08; PDF read, §§ 1–2 + App. D–E) and the Huber-robust
line (arXiv:2301.09573 AISTATS 2023; arXiv:2408.14015).

## 1. Donation e-BH / donation e-LOND (the Fleet-SupFDR row's open pointer)

- **Artifacts:** `tools/donation-ebh.ts` (offline donation e-BH per App. D.3 Thm 16 + the
  comparison harness), `test/donation-ebh.test.ts` (3 — superset property on 200 random inputs,
  hand cases incl. the exactly-zero boundary where a unit at E = 1 is rejected on donated mass).

**Scope finding first: the paper's SupFDR machinery does not map to Tessera's shape.** Its
online model is a STREAM — hypothesis t arrives at time t, one e-value each, discovery sets
monotone. Tessera is a FIXED family of N units with e-processes re-tested at every stop.
Donation e-LOND / closed e-LOND answer the stream question; they are not a tighter route to our
per-family sup-over-time FDP, and composing donations with the √E−1 running-max adjuster
preserves each fixed-time bound but carries NO proven sup-over-time guarantee. The √E−1
adjuster (`tools/supfdr.ts`) remains the SupFDR route for the fixed family.

**What does map: offline donation e-BH (Thm 16)** — reject the r largest iff
`Σ_{i≤r} min(E_(i) − m/(qr), 1) + Σ_{i>r} min(E_(i), 1) ≥ 0` — a strict superset of e-BH at
every fixed time, FDR ≤ q under arbitrary dependence, no new assumptions. **Measured on the
shipped substrate: zero gain.** A/A selections identical (0.00/0.00); recall identical at
δ ∈ {0.006, 0.008, 0.01} (0.00/0.11/0.91 both arms; N = 2016, T = 320, 6 seeds). Mechanism:
donation needs donable sub-threshold mass (units with E near 1) and a populated near-threshold
band. Our accumulators DECAY healthy units toward 0 (nothing to donate), and first passage is
burst-dominated (a faulty unit is either far past m/(qr) or nowhere near it — P7's κ geometry).
The theoretical strict improvement is empirically vacuous here. **Disposition: keep
`eBhSelect`; `donationEbhSelect` stays available as a free (never-worse) drop-in should a
future emitter produce near-1 null e-values** — e.g. short-horizon or restart-heavy regimes —
with the standing caveat that under a VIOLATED premise a superset selector can only enlarge the
failure (the gate owns the premise, as ever).

## 2. O2 disposition — robust/contaminated e-process (ADR 0005 Thread C)

O2's registry line says "no off-the-shelf construction exists." That is no longer true:

- **Huber-robust confidence sequences** (Wang–Ramdas, arXiv:2301.09573): robust exponential
  supermartingales for a mean under ε-contamination + p-th-moment heavy tails, attaining the
  optimal nonsequential width up to constants, explicitly queryable as e-values/e-processes.
  The influence-capped-bet construction is exactly the "principled replacement for the ad-hoc
  Tukey center" O2 asks for, with a breakdown parameter in the theorem rather than a heuristic.
- **Huber-robust likelihood-ratio tests** (arXiv:2408.14015): e-value-flavored robust LR for
  composite nulls/alternatives — the same family, test-shaped.

**What stays open (the honest residue):** fit, not existence. Our null is not a raw mean — it
is the standardized-residual / conformal-rank null after baselining, and the contamination we
face is structured (faulty units, regime windows) rather than i.i.d. ε-mixture rows. Whether
the robust supermartingale (a) composes with the baselining/whitening stack, (b) keeps
acceptable power at our δ₀ ≈ 1 % floor (robustness bought the tessera-rng ADR-0051 lesson:
robust-only LAUNDERS tail subpopulations — a robust center can hide exactly the units we hunt),
and (c) beats the median-center comparator (ADR 0011's best center) is a measurement program,
not a literature fact. O2's registry entry should read: **constructions exist
(2301.09573 / 2408.14015); open item = evaluation against the residual null with the
tail-laundering trap named.**
