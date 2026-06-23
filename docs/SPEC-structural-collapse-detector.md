# Spec — gap B structural-collapse detector + the FP-guarantee test

- **Date:** 2026-06-23
- **Status:** Accepted (cold-eye pending before merge)
- **Need:** Build the structural-collapse detector (the failure class the numeric detector is blind
  to) AND answer the load-bearing question: can the betting e-process deliver a *low, guaranteed* FP
  on real telemetry? The Ville bound (P(ever fire | healthy) ≤ α) is the promise; this tests whether
  it survives real data on the metric class (structural-health / scrape) where the null should be
  best-behaved.

## Deliverables
- **D1 — `tools/_gwdg-structural-loader.ts`**: extract per-(node,job,instance) `scrape_samples_scraped`
  series (one exporter's sample count = a stable-in-health structural signal). Healthy nulls (no
  labeled collapse in GWDG — verified).
- **D2 — `tools/structural-replay.ts`** (`pnpm structural-replay <dir>`):
  - **detector** `detectStructuralCollapse`: betting e-process on the RELATIVE level (value / healthy
    median), variance floored at `REL_FLOOR` so benign integer steps don't read as significant.
  - **FP**: realized false-alarm rate on real healthy streams vs α, broken out for stable (median ≥
    `STABLE_MIN`) high-count targets.
  - **FD**: detection power + latency vs injected collapse (severity × duration) on a CLEAN synthetic
    baseline (real streams over-fire, which would confound power).

## Acceptance criteria
- **AC-1** Loader keys by (node, job, instance) — NOT (node, instance), which interleaves exporters
  into a multimodal stream. Healthy nulls (`windows=[]`).
- **AC-2** `detectStructuralCollapse` is relative + variance-floored; restart-on-fire; Ville-bounded
  under stationary H0.
- **AC-3** FP is reported honestly against α, including the stable-target subset, with the mechanism
  when the guarantee fails (persistent sub-percent drift → anytime-valid P(fire)→1).
- **AC-4** FD on a clean synthetic baseline; the bounded-z saturation past the floor is stated (so
  severities above the floor behave identically — duration drives latency).
- **AC-5** Deterministic / byte-idempotent. Tests: loader keying; FP guarantee on benign integer
  steps (no fire); FD detects sharp collapse, ignores sub-floor dips. ADR + STATE.

## Anti-scope
- **AS-1** No engine change — `detectStructuralCollapse` is a harness detector.
- **AS-2** Low-count integer targets (median < `STABLE_MIN`) are out of scope — they need a
  count-appropriate (Poisson/beta-binomial) e-process.
- **AS-3** No real-labeled FD — GWDG has no structural collapse at its labels (verified); SURF Lisa
  is the next candidate.
- **AS-4** Single signal (`scrape_samples_scraped`); `up`/`scrape_duration` not swept.
