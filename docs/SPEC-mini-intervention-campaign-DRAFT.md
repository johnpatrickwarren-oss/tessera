# SPEC (DRAFT) — Phase-2 intervention campaign on the mac mini

- **Date:** 2026-07-27
- **Status:** **DRAFT — pacing and permissions need owner sign-off (§ 5).** Fills the standing
  "Phase-2 intervention campaign AFTER ~Aug 29 (spec + pacing)" item. Nothing here runs before
  the 56-day gate; `mini-interventions.ts` itself warns against baseline-window use.
- **Machinery that already exists:** `tools/mini-interventions.ts` (cpu-load / lowpower /
  gpu-load + ground-truth journal), `tools/mini-bundle.ts --journal` (journal → `labels.json`
  faults), the canonical scoring path (baseline-monitor + e2e), and now the probe pilot
  (`tools/probe-runner.ts`) sharing the box post-gate.
- **Purpose:** detection/localization scored against KNOWN truth on real physics — the first
  labeled-fault evidence on non-simulated hardware. Mode A throughout; nothing here supports a
  guarantee claim (single box, no spatial null).

## 1. Timeline (post-gate)

- **Phase 2a — clean A/A soak, ~14 days, NO interventions.** Probe pilot starts (its own
  qualification needs an intervention-free A/A period: null floors for θ̂/ς̂ on the worker-slot
  panel, per-lane score distributions). Passive pipeline runs in parallel on the live feed
  (mode-b-loop audit-only soak — the other standing next-step). A/A false-positive budget
  measured here is the reference for 2b.
- **Phase 2b — campaign, ~21 days.** Interventions per § 2, probes still running: an
  intervention is ALSO a labeled event for the probe channel (a cpu-load on the E-cluster should
  move E-lane probe durations — cross-instrument corroboration for free).

## 2. The ladder (all via `mini-interventions.ts`, journaled)

| type | knobs | levels | designed target |
|---|---|---|---|
| cpu-load | qos=background | workers 2 / 4 / 8 × durations 10 min / 1 h / 6 h | E-cores (c0–c3) |
| cpu-load | qos=default | workers 2 / 4 / 8 × durations 10 min / 1 h / 6 h | P-cores (c4–c13) |
| lowpower | — | 1 h / 6 h | ALL cores (freq signature) |
| gpu-load | `GPU_LOAD_CMD` = the P5 probe binary in a loop — the Metal load the tool was missing | 10 min / 1 h | package/GPU counters |

Replicates: 2 per cell, randomized start times (jitter, as everywhere). ~2 × 30 cells ≈ 60
events over 21 days ⇒ ≤ 3/day, ≥ 4 h spacing, and **1 day in 3 kept intervention-free** as
interleaved A/A (the FP reference decays if it is only measured once).

## 3. Hygiene (bidirectional, both instruments on one box)

- Probe windows are EXCISED from the passive stream before bundling (`tools/probe-excise.ts`,
  built + tested; margin 2 s; excised gaps ≪ mini-bundle's 60 s forward-fill).
- Intervention windows are LABELS for the passive pipeline and EXCLUSIONS for the probe-score
  analysis (a probe execution during a cpu-load event is measuring the intervention, not the
  silicon) — same window logic, opposite roles. Journal is the single source of truth for both.
- Remote-access sessions (ssh/rsync pulls) get journal `note` entries; they are real load.

## 4. Scoring & success criteria (Mode A)

- `mini-bundle --journal` → labels; canonical baseline-monitor + e2e scorer; per-event:
  detected? localized to the designed shard set (E vs P vs package)? delay?
- Success: (i) A/A days stay within the 2a FP reference; (ii) 6 h cpu-load events detected with
  correct cluster localization; (iii) lowpower events detected as common-mode, NOT localized;
  (iv) the 10 min cells are EXPECTED misses at 1 Hz passive cadence — they bound the floor, and
  finding them "detected" would itself be suspicious (leakage check).
- Probe channel (secondary): E-lane probe durations shift during E-targeted loads; P-lane flat —
  the designed-target separation, cross-checked against § 2's designed_shards.

## 5. Owner sign-off needed (the § the campaign waits on)

1. **lowpower events**: require root and flip a machine-wide power setting for hours — OK?
2. **Pacing**: ≤ 3 events/day over ~3 weeks acceptable for whatever else the mini does?
3. **Concurrency**: probes keep running through 2b (recommended — corroboration + exclusion
   handles the contamination) vs alternating days?
4. **Physical interventions** (vent blocking, ambient temperature): NOT in scope as drafted —
  only include if you want them, and they would be manual + journaled by hand.
5. **Execution mode**: campaign driver as a launchd timer on the mini vs manually-initiated
  sessions (recommended: a paced driver script + journal, reviewed daily).
