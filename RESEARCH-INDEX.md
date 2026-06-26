# Research & Prior-Decisions Index

**Read this BEFORE proposing any detector / FDR / e-value tuning, or commissioning new
literature research.** Much of the statistical-method design space is already settled —
the registry below lists what has been tried and *closed* (walls / rejections) so we stop
re-deriving it. This file is the canonical entry point; it indexes the engine's decision
log (`../deploysignal-engine/decisions/`, the ADRs), the e-value literature, and our
deep-research outputs.

> Why this exists: across 2026-06-24…26 we repeatedly rebuilt experiments and nearly
> re-proposed tunings that the engine ADRs had already settled (e.g. the clustersynth
> "fair test", cross-sectional recalibration). The findings were one `grep` away but not
> *consulted first*. This index + the CLAUDE.md pointer fix the "didn't look" failure.

---

## 1. Negative-results registry — SETTLED / CLOSED (do not re-litigate)

Each item: the idea, the verdict, and the authoritative source. "Source" paths are in the
**engine** repo (`../deploysignal-engine/decisions/`).

| # | Idea / tuning | Verdict | Source |
|---|---|---|---|
| N1 | **Per-alert guarantee** `E[e_j\|H0] ≤ 1` per shard on real telemetry | **DEAD — fundamental.** Within-window nonstationarity (drift/regime) is irreducible per-shard; only the cross-shard contrast separates drift from the nuisance. | ADR 0012 (real GWDG) |
| N2 | **Integrate the AR(1) φ nuisance out / HAC deflation** to restore short-cal validity | **WALL.** 4 independent control mechanisms built, all leak at high φ / near unit root; the heavy-tailed null *mean* (what e-BH needs) is uncontrollable at short cal. | ADR 0009 (corrects 0007 #1) |
| N3 | **Cross-sectional empirical-null recalibration** (Efron-style) to force `E[e]≈1` before e-BH | **REJECTED.** e-BH is rank/scale-invariant (`e-BH(e/μ,q) ≡ e-BH(e,q/μ)`): recalibration either silently tightens `q/μ̂` (power collapse) or, per-group, inflates a deflated null group to FDP=1. Wrong tool. | ADR 0013 |
| N4 | **Lee–Ren conditional-calibration boosting** as an FDR fix | **It's a POWER lever, NOT an FDR fix.** Deterministic superset (`K_boosted ≥ K_plain`) at the *stated* FDR; when the base null is violated by nonstationarity it amplifies TP+FP together. Verified in Tessera PR #33. | ADR 0006 + Tessera PR #33 |
| N5 | **Blier-Wong–Wang threshold sharpening** for the e-BH procedure | **DROPPED.** `B^AD = 1` — no threshold improvement is possible under arbitrary dependence (the regime fleet e-BH relies on). Gains need PRDS / log-concave survival only. | ADR 0006 |
| N6 | **Two-level hierarchical-FDR guarantee** (shard→rack→fleet) | **Ambitious version DEAD** (3 ways). Survivor: flat e-BH + topology used only to define a tighter common-mode contrast + a separate group-fault detector — **per-group FDP, no global guarantee.** | ADR 0015 |

### Established POSITIVE results (use these)

| # | Result | Source |
|---|---|---|
| P1 | **UI mean-shift e-value** — `E[e\|H0] ≤ 1` by construction for ANY φ incl. unit root (split-LR / universal inference). The validity answer; underpowered above φ≈0.8. | ADR 0010 |
| P2 | **safe-t e-value** (right-Haar / GROW) — variance nuisance integrated out, σ-exact at every cal length. | ADR 0005 |
| P3 | **e-BH controls FDR under ARBITRARY dependence** given valid per-input e-values. | Wang–Ramdas 2022 (foundational) |
| P4 | **Auto factor-rank selection** (sequential common-deflation-path null) — the *legitimate* route N3 failed to find: correct rank → homogeneous residual inflation → cancels in e-BH → protects fleet FDR. | ADR 0014 |
| P5 | **Common-mode ESTIMATION is the real detection/localization lever.** Oracle common-mode → 99–100% detection at 0% FPR even for small faults; full-series loading ABSORBS single-shard faults → 0%; cal-only loading → ~16% / 8% FPR. | ADR 0016 (FAIR test) |

> The single most important framing (THESIS-VERDICT-2026-06-25): detection + ranking is
> **ALIVE**; the per-alert guarantee is **DEAD**; fleet-FDR is **EMPIRICAL not a theorem**;
> localization is **achievable but bottlenecked by common-mode estimation**.

---

## 2. Open questions (genuinely unsettled — fair game for new work)

- **O1 — error metric choice.** Which should we commit to controlling: FDR vs SupFDR vs
  FWER vs **EOP (error over patience)** vs a TDP lower bound? Dandapanthula–Ramdas argue
  worst-case FDR/FWER and finite ARL are in *fundamental tension* in multi-stream change
  detection. **This is the highest-value open decision.** (Being researched — see § 4.)
- **O2 — principled robust / contaminated e-process** to replace the ad-hoc Tukey center
  (with breakdown guarantees). No off-the-shelf construction exists (ADR 0005 Thread C).
- **O3 — transient-fault early detection.** A fault with onset→offset *inside* the test
  window is diluted by a fixed cal/test split (power → ~0). Do horizon-aware / time-sensitive
  betting or online-upgrade procedures help? (Being researched — see § 4.)
- **O4 — stopped/online e-BH validity** for per-shard→fleet aggregation under a global
  stopping rule (no-leakage condition). (Being researched — see § 4.)

---

## 3. Bibliography (e-value / anytime-valid multiple testing)

Convention: PDFs (when retrieved) live in `research/papers/<arxiv-id>.pdf` (gitignored;
copyright). **Tag:** `[WALL]` = touches our upstream problem (per-stream validity /
nonstationarity / transient detection / metric choice); `[LAYER]` = improves the
FDR-combination layer above already-valid e-values. Tags marked *pending* are confirmed by
the § 4 deep-research pass.

| Paper | arXiv / venue | Tag | Status |
|---|---|---|---|
| Dandapanthula & Ramdas 2025 — Multiple testing in multi-stream sequential change detection | (pending) | **[WALL]** metric choice (EOP) | pending verification |
| Wang, Dandapanthula & Ramdas 2025 — Anytime-valid FDR control with the stopped e-BH procedure | (pending) | [WALL]? aggregation validity | pending |
| Tavyrikov, Goeman & de Heide 2025 — Carefree multiple testing with e-processes | (pending) | [LAYER] suprema/running-max | pending |
| Xu & Ramdas 2024 — Online multiple testing with e-values (e-LOND) | (pending) | [LAYER] online | pending |
| Fischer, Xu & Ramdas 2024/25 — Online generalization of (e-)BH (SupFDR) | (pending) | [WALL]? late-upgrade | pending |
| Wang & Ramdas 2022 — FDR control with e-values (e-BH) | JRSS-B 2022 | [LAYER] foundational | confirmed (P3) |
| Choe & Ramdas 2024/26 — Combining Evidence Across Filtrations | (pending) | [WALL]? cross-filtration | pending |
| Blier-Wong & Wang 2024 — Improved thresholds for e-values | (pending) | [LAYER] thresholds | confirmed dropped (N5) |
| Goeman/de Heide/Solari 2025 — e-Partitioning Principle | (pending) | [LAYER] post-hoc/RCA | pending |
| Xu/Solari/Fischer/de Heide/Ramdas/Goeman 2025/26 — Bringing Closure to FDR Control | (pending) | [LAYER] post-hoc/RCA | pending |
| Preuße 2025/26 — Anytime-valid simultaneous TDP lower bounds | (pending) | [WALL]? post-alert TDP | pending |
| Clerico 2026 — Time-sensitive anytime-valid testing | (pending) | [WALL]? transient/early | pending |
| Taga, Oymak & Shekhar 2026 — Learning to Bet for Horizon-Aware AVT | (pending) | [WALL]? transient/early | pending |
| Koning & van Meer 2026 — Anytime validity is free | JRSS-B 2026 | [WALL]? sequentialize | pending |
| Grünwald, de Heide & Koolen 2024 — Safe Testing | JRSS-B 2024 (1906.07801) | [LAYER] foundational | confirmed (P2) |
| Vovk & Wang 2024 — Merging sequential e-values via martingales | EJS 2024 | [LAYER] combination | pending |
| Ramdas 2025 — Hypothesis Testing with E-values (monograph) | — | reference | pending |
| Farran 2026 — Anytime-Valid Calibration Monitoring | (pending) | [WALL]? drift monitoring | pending |
| Prediction-Powered E-Values 2025 | (pending) | [WALL]? auxiliary-model FP | pending |

_(Full curated list — incl. e-GAI, online closed testing, FWER-with-e-values, Vovk–Wang
true/false discoveries, Blanchard–Neuvial–Roquain — in the source message; add rows as read.)_

---

## 4. Deep-research outputs

- **2026-06-26 — primary-source audit of the priority papers** (run `wf_b69c520a-589`):
  reads the actual PDFs, adversarially verifies each claim, classifies [WALL]/[LAYER], and
  answers O1/O3/O4. **Report:** _pending — link the saved report here on completion, and
  backfill the § 3 tags + § 2 open-question resolutions from it._

---

## 5. How to use this

1. Proposing a detector/FDR/e-value tuning? Check § 1 first — if it's N1–N6, it's closed.
2. Commissioning research? Check § 2 (open) and § 4 (already-run) before spending tokens.
3. New finding? Add a registry row (§ 1) or open question (§ 2) with its source ADR/PR.
4. Retrieved a paper PDF? Drop it in `research/papers/<arxiv-id>.pdf` and update its § 3 row.
