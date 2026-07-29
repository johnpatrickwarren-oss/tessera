# ADR 0027 — Increment-family coherence: the monitor tests the family the emitter accumulates; Catoni assessed and not adopted

- **Date:** 2026-07-28
- **Status:** ACCEPTED — implemented (calibration-monitor kind knob, default 'bounded'; all
  existing gaussian-family call sites pinned; srEDetector + serial monitor kind knobs, defaults
  unchanged). Follows the operator direction "Catoni swap, where relevant" — the measurement
  resolved "where relevant" to the BOUNDED family, not Catoni (§ 2).
- **Builds on:** the 2026-07-02 audit F7/F9 (the clipped-linear `gBounded` family + the
  `'bounded'` default in `e-value.ts`'s certified constructors), ADR 0019 #2 (the runtime
  calibration monitor), ADR 0020 (marginal-monitor blindness), the O2-fit measurement
  (`research/2026-07-28-o2-fit-robust-catoni.md`).

## 1. The rule

**A calibration monitor must test the SAME increment family its emitter accumulates.** The
monitor's verdict means "the residual null is broken FOR THIS INCREMENT"; families differ in
what breaks them:

- The GAUSSIAN family (`gInc`) is broken by heavy tails and σ̂ error (audit F7: 10 % σ̂
  under-estimate → null mean 0.52 → 7.6) — its monitor MUST fire on those.
- The BOUNDED family (`gBounded`, clipped linear) is exactly valid under any tail and any
  symmetric scale error — a bounded-family emitter monitored with `gInc` gets FALSELY demoted
  by conditions its own increment absorbs.

Implementation: `CalibrationMonitorOptions.incrementKind` ('gaussian' | 'bounded'), default
**'bounded'** to match the FDR-bearing certified-constructor default in `e-value.ts`. Every
existing production call site (mode-b-control, clustersynth-mode-b ×2, mode-b-loop) accumulates
GAUSSIAN-family e-values and is now PINNED `'gaussian'` explicitly — published behavior
unchanged, family declared at each site. Linear bets mix at the CAPITAL level (per-λ capitals,
Ville on their average), not per-tick.

## 2. Catoni: assessed, not adopted

The operator-approved direction was a Catoni swap. The three-way measurement
(o2-fit note + the in-session gInc/catoni/bounded table) shows the audit's bounded family
DOMINATES robust/plain Catoni on every axis Tessera cares about: exact validity under σ̂ error
(0.0 % vs 1.5 % crossings at ×1.1 scale) with NO variance premise (Catoni's denominator needs
assumed σ² ≥ true variance), better small-shift power (85.5 % vs 32.3 % @ 0.1σ), better
intermittent-fault sensitivity (21.5 % vs 8.3 %) with benign-burst validity. Catoni's only edge
is marginal t₃ tightness. `catoniPhi`/`robustCatoniIncrement` stay available in
`tools/o2-robust-eprocess.ts` as the contaminated-validity-insurance option (3√ε·σ floor,
disclosed); they enter no production path.

## 3. A discovery the swap surfaced: β = 1 blindness is a GAUSSIAN-family property

ADR 0020's "the marginal monitor is provably blind to a unit-marginal AR(1)" does NOT carry to
the bounded family: the bounded product has `E[∏(1+λc/B)] = ∏(1 + λ²ρ·E[c²]/B²) > 1` under
serial dependence, so the bounded-kind monitor DETECTS unit-marginal AR(1) (measured ~0.41
revocation at ρ = 0.6, T = 800). This is coherent, not a false alarm: the bounded EMITTER's
premise is conditional mean-zero, which AR(1) violates — the emitter's own e-values are equally
invalid there. For bounded-family emitters the marginal monitor therefore carries real serial
power ADR 0020 said no marginal monitor had — the whiteness crutch stays for the gaussian
family; test-locked both ways (`test/serial-calibration.test.ts`).

## 4. Scope of the knobs (defaults unchanged where power is the point)

- `srEDetector(resid, alpha, patience, kind)` — 'gaussian' default kept (max power on the
  certified standardized null; Wall-A + the monitor own the premise); 'bounded' available for
  distribution-doubt regimes (per-λ SR recursions averaged; both threshold guarantees hold with
  E[g_λ|H0] = 1 EXACTLY). Heavy-tail false-alarm validity test-locked.
- Serial monitor (`serial-calibration.ts`) — kind knob; 'bounded' variant: marginal per-λ +
  serial per-c capitals with b = c·clip(r_prev)/B; exact conditional validity under any tail.
  Measured: valid on heavy-tailed white noise, ~100 % catch on AR(1) under heavy tails —
  test-locked. Default 'gaussian' (the tool's documented construction; not in production —
  whiteness retained per ADR 0020).

## 5. Tests

+3 coherence tests (calibration-monitor: 1.5× scale error revokes gaussian / not bounded;
bounded catches center shifts; clean-null Ville), +2 serial (bounded detects AR(1) — coherent;
bounded valid on heavy-tail white + catches AR under heavy tails), +1 SR (bounded kind
heavy-tail validity + shift detection), HEADLINE test re-pinned to 'gaussian' with the family
caveat recorded. Suite 1007/1000/0/7.
