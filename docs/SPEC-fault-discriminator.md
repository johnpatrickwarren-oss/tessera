# Spec — benign-change vs fault discriminator (Lever B)

- **Date:** 2026-06-24
- **Status:** Accepted (cold-eye SHIP-WITH-FIXES — all findings addressed; ADR 0016)
- **Need:** Lever A (ADR 0015) removes COMMON-MODE benign change and delivers FDR ≤ q on a
  common-mode-coupled fleet. What it leaves — and what dominates the real GWDG firing — is
  **shard-SPECIFIC** change: a legitimate workload/phase shift on one shard fires the e-value exactly
  as a fault does. ADR 0011 already showed a per-fire run-length discriminator FAILS (benign drift and
  faults both fire at run-length ~9). This builds the discriminator that the per-shard layer needs, and
  measures its honest envelope.

## The hypothesis

A shard-specific **benign** change is a STEP to a new stable regime — same distribution shape, shifted
MEAN — which the operator's lifecycle (ADR 0011) absorbs by re-recording the baseline. A **fault** is a
DISTRIBUTIONAL change beyond a mean shift: variance inflation (SDC / bit-flips), a trend (degradation),
or collapse (detachment / missing). The production BF e-value (ADR 0013) already tests a mean shift
*assuming stable innovation variance* — so a complementary **distributional-signature** test separates
the two without external signals, FOR FAULTS THAT HAVE A SIGNATURE.

## The construction

On a shard that Lever A flags (fire on the robust residual R[i]), classify the post-change segment:
1. **Mean-step score** — the BF mean-shift evidence (already have it).
2. **Distributional score** — evidence the post-change window differs from calibration in something
   OTHER than the mean: (a) variance ratio (post/cal innovation variance) via an F-style test;
   (b) trend (slope of the post-change residual ≠ 0); (c) collapse (post-change level at/below a
   degenerate floor). Combine into a "fault-signature" e-value/score that is ~0 for a pure mean step.
3. **Decision:** mean-step-only → BENIGN → re-record (suppress, accept new normal); distributional
   signature present → FAULT → escalate. Optionally gate on an EVENT channel (a known deploy/schedule
   event at the onset → force benign), modelling Tessera's freeze-hook — measured as a function of
   event coverage.

## Deliverables
- **D1 — `tools/fault-discriminator.ts`** (`pnpm fault-disc [gwdg-dir]`):
  - `varianceRatioScore`, `trendScore`, `collapseScore`, and a combined `faultSignature(residual, m, n)`.
  - `classify(residual, m, n)` → {benign-mean-step | fault | indeterminate}.
  - A fleet experiment: shards = healthy + benign-mean-step + fault (variance / trend / collapse), run
    Lever A → discriminator → measure (i) benign FP after discrimination vs before, (ii) fault
    detection by fault TYPE, (iii) the irreducible mean-only-fault confusion.
- **D2 — `shadow-results/fault-discriminator-report.{json,md}`** (deterministic, idempotent).

## Acceptance criteria
- **AC-1** `faultSignature` is ~0 (below threshold) for a pure mean STEP (benign) and clearly positive
  for variance-inflation / trend / collapse — pinned per signature type.
- **AC-2** End-to-end: on a fleet of {healthy, benign-mean-step, fault}, the discriminator drives the
  benign-change FALSE-fault rate down (re-records benign steps) while keeping detection high for faults
  WITH a distributional signature. Report the confusion matrix.
- **AC-3 (the honest negative)** A fault whose ONLY signature is a mean step of the same size as the
  benign changes is NOT separable by the signature test — detection collapses to chance there. This is
  measured and stated as the irreducible limit (needs the event/topology channel).
- **AC-4** Event-gated variant: with an event channel covering fraction p of benign changes, the
  benign FP falls with p; quantify. States that the discriminator's ceiling without events is set by
  the mean-only-fault confusion (AC-3).
- **AC-5** Deterministic, idempotent; tests pin the signature scores (AC-1), the confusion matrix
  direction (AC-2), and the irreducible-limit collapse (AC-3).
- **AC-7** Honest verdict: the per-shard guarantee is FP/FDR ≤ q (Lever A) PLUS a benign/fault
  discriminator that works for faults with a distributional signature; mean-only faults are
  irreducibly confusable with benign change without an external event/topology signal — which is
  exactly the role of Tessera's event-conditioned freeze-hook.

## Out of scope
- **Re-record masking latency** (the original AC-5): whether re-recording on a benign step masks a
  later slow fault. This is the ADR 0006 adaptive-masking tradeoff, already measured there — NOT
  re-measured here. (Moved from acceptance criteria to out-of-scope to match what the tool builds.)
- Topology-correlation discrimination (rack/NVLink-local fault vs idiosyncratic benign) — needs a real
  coupled-topology substrate; named as future.
- A real labeled benign-vs-fault dataset (none available) — synthetic ground truth for the confusion
  matrix; real GWDG used to show the residual firing is benign-mean-step-like (FP-only).
- The event channel's REAL coverage is unknown/unmeasured — the event-gating sweep shows the SHAPE of
  the dependence (an identity given the model), not a measured catch rate.
