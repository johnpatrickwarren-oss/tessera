# Deep-research: transient-fault detection power (focused pass)

- **Date:** 2026-06-26
- **Run:** deep-research `wf_54ed96dd-e49` (focused follow-up; the first attempt
  `wf_bda1bb1d-d9c` died on a transient scope-step StructuredOutput error). 16 sources,
  77 claims, 25 verified 3-vote, 24 confirmed / 1 killed. All read from open arXiv.
- **Question:** is there a concrete construction that detects a TRANSIENT mean shift
  (onset→offset inside the test window, unknown timing) without the fixed cal/test split
  diluting it to ~0 power — and does it survive our nonstationary per-stream null?

## The answer (blunt)

**Transient power and per-stream validity are TWO SEPARATE WALLS. The e-detector closes the
first; nothing here closes the second.**

- **Wall B — transient power: SOLVED in principle by the e-detector** (Shin, Ramdas &
  Rinaldo, **arXiv:2203.03532**). It mixes over candidate change-points so the running
  statistic accumulates whenever the fault is active, regardless of unknown onset/offset —
  dissolving the fixed-split dilution.
- **Wall A — per-stream validity under nonstationarity: UNCHANGED.** The e-detector's
  validity reduces to each per-candidate increment `Λ^(j)` being a genuine e-process under
  the AR(1)+drift null — exactly Tessera's already-failing per-stream `E[e|H0]≤1` (ADR
  0007/0008/0012). The paper concedes this verbatim (Remark 2.13).

## Per-paper (verified)

1. **Koning & van Meer, "Anytime Validity is Free" — arXiv:2501.03982** (JRSS-B 2026; the
   first pass's guessed id `2605.06521` was WRONG). Sequentializes any fixed-horizon valid
   test into `φ_n := E^P[φ | F_n]` (Doob martingale), anytime-valid (Thm 1), matching the
   fixed-horizon test **exactly at the horizon N**. **"Free" = TERMINAL-time equivalence
   ONLY:** for `n<N` it's a P-martingale tracking *the conditional probability the terminal
   test will reject* — running-max does not raise expected evidence, so **it does NOT improve
   transient/early detection on its own.** Presupposes a known null P; the composite-null
   version (Thm 2) is where the nuisance null re-enters ("uninteresting" tests, Remark 6).
   **Verdict: PARTIAL** — gives clean sequentialization, not transient power, not validity.

2. **E-detectors — Shin, Ramdas & Rinaldo, arXiv:2203.03532** (the construction used in
   Dandapanthula–Ramdas 2501.04130). An e-detector is a nonneg adapted `M` with
   `E_{P,∞}[M_τ] ≤ E_{P,∞}[τ]` for ALL stopping times and ALL pre-change `P` (Def 2.2);
   `N* = inf{n: M_n ≥ 1/α}` controls ARL at level α (Thm 2.4) with **NO assumption on
   changepoint location or post-change law** (Remark 2.1). Explicit mix over change-points
   (Def 2.6): **Shiryaev–Roberts `M^SR_n = Σ_{j=1}^n Λ^(j)_n`** or **CUSUM
   `M^CU_n = max_{j≤n} Λ^(j)_n`**, each `Λ^(j)` an e-process started at candidate onset `j`.
   Admits **universal-inference increments** (Remark 2.10) and **nonstationary pre-change
   streams** (Sec 2.1). **Verdict: YES — this is the named construction for transient power.**
   *Caveat (Remark 2.13, verbatim):* under a nonstationary/unknown null "computing a tight or
   even valid threshold can be challenging … `c_α = 1/α` seems the only reasonable choice …
   use the e-SR procedure rather than e-CUSUM." Validity of `Λ^(j)` is **required, not granted.**

3. **Clerico 2026, "Time-sensitive anytime-valid testing" (arXiv:2603.19551)** and
   **4. Taga–Oymak–Shekhar, "Learning to Bet for Horizon-Aware AVT"** — **NO surviving
   verified claims this pass.** Whether reward-early-rejection betting or finite-horizon
   optimal-control betting helps a bounded transient window remains **unverified** (a
   dedicated read is still owed).

5. **Fleet multiplicity layer (FDR-at-all-times):**
   - **Naive running-max e-BH FAILS** (FDR ≈ 1.08α) — Tavyrikov, Goeman & de Heide,
     "Carefree multiple testing with e-processes," **arXiv:2501.19360** (Prop 1). *(The
     first pass mislabeled this id as "Xu–Ramdas e-LOND" — it is the Carefree paper.)*
   - **FDR-sup IS controllable** via an **adjuster** `A` (increasing, `A(∞)=∞`,
     `∫A(E)/E²dE=1`; e.g. `A(E)=√E−1`): e-BH on adjusted running maxima controls FDR-sup at
     `K0·α/K` under arbitrary dependence (Thm 1), with **accept-to-reject monotonicity** (the
     "upgrade a shard later" property). Cost: an "appreciable," **unquantified** power penalty.
   - **e-LOND (Xu & Ramdas, arXiv:2311.06412** — NOT 2501.19360) controls FDR under arbitrary
     dependence **at the stopped configuration, not time-uniformly** (the time-uniform
     overclaim was REFUTED 0-3). **Donation/online-closure e-LOND (Xu, Fischer & Ramdas,
     arXiv:2603.24792)** controls **SupFDR** (`E[sup_t FDP(R_t)]`) under arbitrary dependence,
     strictly improving e-LOND. Both are agnostic to e-value provenance — they do **not**
     touch per-stream validity.

## Recommended construction to prototype

**An e-detector (Shiryaev–Roberts `Σ_j Λ^(j)` — recommended over CUSUM for the nonstationary
null per Remark 2.13) whose per-candidate increments `Λ^(j)` are the sequentialized
universal-inference / nuisance-robust e-value, thresholded at `1/α`.** Compose at the fleet
layer with donation-e-LOND or adjusted running-max e-BH for SupFDR under arbitrary cross-shard
dependence (accept the adjuster power penalty). This is transient-robust by construction.

**The load-bearing caveat:** it removes the cal/test dilution but the **nonstationary-null
validity problem persists inside each `Λ^(j)`** — Tessera's open per-stream `E[e|H0]≤1` wall
(ADR 0007/0008). The nuisance-robust UI e-value on BASELINED residuals (ADR 0010/0011) must
supply the increment; and the open question is whether that fixed-horizon validity **survives
promotion to all stopping times** inside the e-detector (`sup_P E[Λ^(j)_τ | F_{j-1}] ≤ 1`).

## Integrity / corrections

- No contradiction with the first pass or engine ADRs; the e-detector result *corroborates*
  the "two separate walls" framing.
- arXiv-id corrections to propagate to RESEARCH-INDEX § 3: Koning–van Meer = **2501.03982**
  (was 2605.06521); e-LOND = **2311.06412** (was mislabeled 2501.19360); **2501.19360** =
  Tavyrikov–Goeman–de Heide "Carefree"; e-detectors = **2203.03532**; SupFDR online =
  **2603.24792**.

## Still open
- The quantified detection-DELAY / power cost of the e-detector vs an oracle that knows
  onset/offset, and how it degrades as φ→0.9 + drift grows.
- Clerico / Taga–Oymak–Shekhar (reward-early / horizon-aware betting) — unverified.
- Whether the UI e-value's fixed-horizon `E[e|H0]≤1` survives promotion to an anytime-valid
  `Λ^(j)` under the nonstationary null (the seam where Wall A re-enters).
