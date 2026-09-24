# ADR 0031 — The topology sources, the DS↔Tessera contract, the event feed and the L0 counter transform come home from the engine

- **Date:** 2026-09-23
- **Status:** ACCEPTED — 21 modules and their README returned from the engine's `adapters/` tree
  unchanged in content; 28 importers repointed; the five engine tests that covered them moved in.
- **Builds on:** ADR 0030 (step 2: the three statistical duplicates became re-exports); engine
  ADR 0033 (the library boundary; this is its step 4 for Tessera) and its addendum; the R90/R94
  extract that put these files in the engine in the first place.

## Problem

Engine ADR 0033 drew the line: what *constructs a baseline or detects deviation from it, with its
validity accounting* is the engine's; the domain data-plane is the consumer's. Every file under the
engine's `adapters/topology/`, `adapters/ds-integration/`, `adapters/events/`,
`adapters/l0/counter-rate-transform.ts`, `adapters/topology-overlay.ts`,
`adapters/hardware-topology-source.ts` and `adapters/loader.ts` is Tessera's data-plane — the
file headers say "Tessera-original code" — and was imported by Tessera alone. They lived in the
engine only because the R90 extract moved the whole in-repo `engine/` tree at once.

## Decision

1. The 21 modules live under `tools/` in the same relative layout (`tools/topology/…`,
   `tools/events/…`, `tools/ds-integration/…`, `tools/l0/counter-rate-transform.ts`,
   `tools/topology-overlay.ts`, `tools/hardware-topology-source.ts`, `tools/loader.ts`), each
   with a provenance header in place of the engine's. Their imports of engine *library* modules
   (`types/…`, `per-shard/runtime`) stay package imports; their imports of each other stay
   relative. `tools/ds-integration/README.md` comes with them.
2. The five engine tests that exercised them move in under base names
   (`common-mode-attribution`, `counter-rate-transform`, `event-consumer`,
   `event-conditional-attribution`, `slurm-source`); the engine keeps its copies until its major
   deletes `adapters/`.
3. 28 importers (tools, tests, the `bench/` perf harness, the browser-bundle entry) point at the
   local files. `demos/engine-bundle.mjs` bundles the local `topology-overlay`, `freeze-hook` and
   `common-mode-attribution`.
4. **Gate accounting, stated in full.** The complexity ratchet (`no-complex-functions`, baseline 5)
   would have risen by ten: ten grandfathered functions that were out of the gate's view inside
   `node_modules`. Each carries the gate's audited `anchor:allow` line with that reason. The
   `require-tests` ratchet (baseline 26) matches a module to a test by base name only, so
   Tessera's round-numbered tests (`q29-k8s-adapter`, …) do not count as covering `k8s-source`;
   the fourteen modules without a base-name test carry `anchor:allow require-tests` naming the
   Tessera test that does cover each. Counted with suppressions ignored, `tools/` has 14 complex
   functions (ten of them these) and 40 uncovered modules (fourteen of them these); with them
   honoured, 3 and 26 — the baseline. No baseline
   was re-recorded and no bypass was used. Note for the gate's maintainer: suppressions in
   subdirectories are enforced but not listed in the gate's `~` report, which reads top-level
   files only.

## Not done, and why

- `test/q25-l0-contract.test.ts` and `test/q30-nvlink-adapter.test.ts` imported `TrendBuffer` from
  the engine's `core`, a DeploySignal runtime module that leaves the engine at its major. **Done
  2026-09-23 (the PR after this one):** the two assertions (AC-R25-12, AC-R30-13) now read the
  mean and normalized OLS slope from `test/_substrate/rate-summary.ts`, which defines both numbers
  with the maths TrendBuffer used, so the tolerances keep their meaning; the claim is restated as
  what it always was — a constant per-second rate under variable scrape intervals.
- The alternative to fourteen `require-tests` suppressions — renaming Tessera's round-numbered
  tests to base names — was not taken: the `q##-` names carry the round they closed.

## Reversal

Delete the 21 files and five tests, restore the 28 importers from `git show 2c6c3d5`, and the
package's alias paths (`…/topology/*`, `…/ds-integration`, …) still resolve until the engine major.
