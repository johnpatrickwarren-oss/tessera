# ADR 0007 — the per-shard anytime-valid FP guarantee does not survive real nonstationarity

- **Status:** Accepted (answers the "low, guaranteed FP/FD" question)
- **Date:** 2026-06-23

## Context

Tessera's headline promise is a *low, guaranteed* false-alarm rate: the betting e-process is
anytime-valid, so by Ville's inequality P(ever fire | healthy) ≤ α. Gap B (the structural-collapse
detector) was built specifically to test whether that guarantee actually holds on real telemetry —
on the structural-health signal class (`scrape_samples_scraped`) where the null should be the *most*
well-behaved. `tools/structural-replay.ts` measures realized FP on real healthy GWDG streams and
characterizes detection power against injected collapse.

## Finding

- **Detection power (FD): genuine.** On a clean baseline, the detector reliably catches a structural
  collapse beyond the noise floor (≈75% of full collapses within a 24-scrape window; latency a few
  scrapes). The detector *works*.
- **The FP guarantee: NOT honored on real data — and the reason is fundamental.** Even on the most
  stable, highest-count real scrape targets, realized per-stream FP was **100%** (vs α=1%).
  Inspection shows it fires on *persistent sub-percent level shifts* (a target settling from 5620 to
  5627 samples as series are added) — not on collapses. An anytime-valid e-process accumulates wealth
  on *any* persistent deviation, so on a signal that is never exactly stationary over days (every
  real scrape count), P(fire) → 1, not ≤ α. Raising the variance floor only defers it.

This is the same wall hit on the numeric path (NAB/GWDG/MIT over-firing ~1–3%); the structural path
makes the mechanism unambiguous: **the α bound is mathematically correct but conditional on exact
stationarity that real telemetry does not satisfy.**

## Decision

Record honestly: **a low, *guaranteed* per-shard FP is not achievable with a fixed-baseline
anytime-valid e-process on real telemetry** — numeric or structural. The promise as stated does not
survive contact with real nonstationary data. Detection *power* is fine; the *guarantee* is the
casualty.

## Why — and the paths that remain

- **Not "tune the floor / pick a better signal"** — we did (relative bet, variance floor, the
  best-behaved signal class) and it still fired on sub-percent drift. The cause is structural.
- **Bounded-horizon / windowed monitoring** restores a per-window bound but reintroduces
  multiple-testing across windows, and the regime-aware (adaptive) variant masks slow drift
  (ADR 0006). Not a clean fix.
- **Fleet-level e-BH FDR is the remaining real hope:** if drift is common-mode across shards, it
  cancels in the cross-shard *ranking*, so a truly-failing shard still stands out and the
  false-*discovery* proportion among alerts can be bounded even when each shard's per-shard bound is
  blown. This is Tessera's most important still-unvalidated claim — and the right next experiment.

## Consequences

- The "guaranteed low FP" framing must move from the *per-shard* level (false) to the *fleet-FDR*
  level (unvalidated) — or be dropped. Honesty here is the whole point of the artifact.
- Detection capability (numeric values + structural collapse) is real and complementary; the open
  problem is calibrated *error control* on nonstationary real data, not detection.

## Ruled out / gotchas

- GWDG has no real labeled structural collapse (verified — telemetry flows through the incidents);
  FD here is on injected/synthetic collapse. Real-labeled FD needs SURF Lisa or similar.
- Low-count integer scrape targets need a Poisson/beta-binomial e-process (out of scope); the failure
  above is on the *high-count, best-case* targets, so the finding is not a low-count artifact.
