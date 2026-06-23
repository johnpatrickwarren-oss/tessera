# ADR 0006 — adaptive baselining masks slow drifts; do NOT upstream as a static replacement

- **Status:** Accepted (qualifies the "next step" of ADR 0005)
- **Date:** 2026-06-23

## Context

ADR 0005 showed adaptive (regime-aware, trailing-window) baselining cut false alarms ~5× on a NULL
GPU dataset (MIT), and flagged that the **detection tradeoff was unmeasured** — a rolling baseline
can mask a slow drift by tracking it. This ADR is that measurement (the gate before upstreaming),
via `tools/adaptive-tradeoff.ts`: a controlled synthetic AR(1)+ramp sweep + GWDG real faults.

## Result

**Synthetic sweep (AR(1) ρ=0.5, ramp onset mid-stream, α=0.01, adaptive window=300):**

| ramp slope/step | static detect | adaptive detect | static pre-FP | adaptive pre-FP |
|---|---|---|---|---|
| 0 (null) | 13.9% | 0.0% | 7.9% | 2.1% |
| 0.003 | 99.0% | **76.5%** | 6.1% | 1.3% |
| ≥0.01 | 100% | 100% | ~7% | ~2% |

**GWDG real GPU faults:** static 33.3% detection @ 29.1 FP/1k → adaptive **2.4%** detection @ 6.9
FP/1k.

So: adaptive cuts FP ~4× consistently, but **masks drifts slower than ~0.01/step** (76.5% vs 99% at
slope 0.003), and on real GPU faults (slow signals) it **collapses detection 33%→2.4%**.

## Decision

**Do NOT upstream adaptive baselining as a replacement for the static baseline.** The MIT "5× FP
win" was real but measured on a null dataset; on labeled data adaptive **trades away detection** —
it is a FP-vs-slow-drift tradeoff, not a free win. Naive adaptive-replace-static would gut Tessera's
ability to catch exactly the slow-onset faults it exists to catch.

## Why — and why not the alternatives

- **Chosen (don't replace static; pursue a hybrid)** — the data is unambiguous that a pure rolling
  baseline masks slow drifts (synthetic + real agree).
- **Not "adopt adaptive, it cut FP 5×"** — that conclusion from ADR 0005 was a null-dataset artifact;
  this is the honest-measurement correction.
- **Recommended path: hybrid** — e.g., run static + adaptive in parallel and alert on static while
  using adaptive to suppress regime-shift false alarms only when no slow-drift hypothesis is active;
  or freeze/lengthen the adaptive window on suspicion. Needs design before any engine change.

## Consequences

- The over-firing problem (gaps proven on NAB/GWDG/MIT) does NOT have a clean drop-in fix; the real
  work is a hybrid that cuts regime-shift FP without masking slow drifts. That is the next design
  question, not a done deal.
- `replayFiresAdaptive` stays a harness prototype (unchanged engine).

## Ruled out / gotchas

- "Detection" is **within the trial horizon**, so the slow-slope shortfall (76.5% vs 99%) bundles
  *permanent masking* with *detection delayed past the horizon*. We do not separate them — both are
  operationally bad for monitoring (a fault caught much later ≈ one missed), and the verdict (don't
  upstream as a static replacement) is identical either way. A horizon-extended decomposition is
  future work if the exact `window` is to be tuned.
- Single AR(1) ρ + linear ramps; step-vs-ramp and AR(p) not swept (first characterization).
- GWDG detection is detachment-heavy + day-level — but the direction (massive masking) is stark and
  consistent with the synthetic threshold, so the verdict holds.
