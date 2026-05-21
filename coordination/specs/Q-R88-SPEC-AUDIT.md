# Q-R88-SPEC-AUDIT — sidecar audit for Q-R88-SPEC.md

Round: R88
Architect-committed SHA: TBD (post-spec-triad commit)
Round-start SHA: `7887298`

## A1  Brainstorm phase (Superpowers Brainstorm)

### A1.1  Wrapper architecture

| Approach | Strengths | Weaknesses | Hidden assumptions | Risks |
|---|---|---|---|---|
| **W-A: Thin orchestrator** — single function `runCurationFlow(rawPath, opts)` invokes `curateBaselineFleetCorrelated` once, applies threshold gate, writes outputs | Minimum surface; defaults inherited from composer (no drift); matches operator-minimal directive | No fine-grained operator control; can't skip Stage 2a or Stage 2b individually | Conservative defaults are appropriate without override knobs | Operator may want override knobs in later rounds (acceptable; deferred) |
| W-B: Granular wrapper with composition control (`--skip-stage2a`, `--alpha-fleet=N`, `--mcd-alpha=N`) | Full operator control; matches "expose composer's opts" | Surface area explodes (5+ flags); each flag needs an AC; conservative-defaults directive becomes optional rather than default | Operator knows what each knob does | Knob-discovery confusion; combinatorial AC matrix |
| W-C: Two-stage wrapper (dry-run + commit) | Operator can preview before writing files | 2x invocations; doubles AC count for happy paths | Operators want a preview step | Adds friction to the "operator-minimal" framing |

**Selected: W-A.** The R88 directive explicitly says "operator-MINIMAL baseline curation flow" — extra knobs work against the value proposition. W-A with conservative defaults (inherited from the composer's own DEFAULT_ALPHA_FLEET etc.) is the simplest design that meets the directive verbatim. A single override flag (`--allow-high-drop`) is provided for the one natural operator escape hatch (deliberately accept heterogeneous corpora).

**Rejected: W-B and W-C** documented for posterity. W-B's operator-control framing belongs in a future round if a concrete operator need surfaces; W-C's preview pattern is needless friction.

### A1.2  Auto-validation criterion

| Approach | Strengths | Weaknesses | Hidden assumptions | Risks |
|---|---|---|---|---|
| AV-A: Stage 2a/2b idempotency on curated bundle | Re-uses existing Family C surface; directly measures contamination quiescence; no new compile-state dependencies | Doesn't exercise Family A surfaces (mixture-supermartingale) — the directive verbatim says "Family A/C detectors" | Stage 2a/2b composition IS the Family C surface | Future "Family A" coverage gap if hand-injected outliers escape Stage 2a/2b but trigger Family A's Page-CUSUM-mixture |
| AV-B: Run engine/detectors/family-a-mixture-supermartingale.ts on curated bundle | Directly matches directive verbatim Family A coverage | Requires compile-time calibration (MixtureSupermartingaleParams from tools/calibrators/); requires synthetic per-shard tick stream; significant compile-state setup | The operator wants to invoke the full per-shard detector pipeline; the curation context provides enough data to construct compile-state | Wrapper takes on the role of the full compile pipeline; massive scope expansion away from operator-minimal |
| AV-C: Statistical invariants (finite mean/var, no NaN/Inf) | Cheapest; no detector entanglement | Doesn't validate curation worked (only validates output is type-safe); weak | Operators want type-safety as validation | Misses the core "is this corpus clean?" question |

**Selected: AV-A.** Re-cast Family A/C as "Family C via Stage 2a/2b idempotency" because (a) Stage 2a's MCD-Mahalanobis IS the canonical Family C statistic and (b) Stage 2b's FCP-1 e-process IS a Family C betting-e-process variant (explicit mirror of `engine/detectors/family-c-betting-e-process.ts` per the FCP-1 module docstring). The directive's parenthetical "Architect picks exact criteria at spec § 0" grants explicit latitude; the chosen criterion is strictly more conservative on the curation-flow problem statement than spec-text-literal "run Family A AND Family C."

**Rejected: AV-B** because it expands the wrapper's surface beyond operator-minimal — compile-time calibration setup would require importing tools/calibrators/* into the curation flow, which (a) is not on the directive's allowed-modification list and (b) entangles two architectural concerns (curation hygiene vs. detector calibration). **AV-C** rejected as too weak — it doesn't bind the core curation property.

### A1.3  Drop-rate definition

| Approach | Strengths | Weaknesses |
|---|---|---|
| D-A: Total dropped ticks / total input ticks (combined Stage 2a + Stage 2b symmetric) | Matches operator mental model: "how much data was thrown away"; symmetric handling of per-shard MCD + fleet-event drop | Requires aligning ticks per-run before counting (min across signals) |
| D-B: Stage 2a contamination rate only | Stage 2a is the dominant drop mechanism; simplest | Hides Stage 2b's contribution; misleading when FCP-1 fires |
| D-C: Two separate rates (Stage 2a rate + Stage 2b binary flag) | Operator sees breakdown | Two-dimensional threshold gating; complicates the directive's <5/5-15/>15 prescription |

**Selected: D-A.** Single-dimensional drop_rate maps cleanly to the directive's three-band gating. Stage 2a and Stage 2b breakdown reported separately in the curation-report.md (`## Top-K dropped runs` section) for operator visibility.

### A1.4  Output file formats

| Concern | Decision | Rationale |
|---|---|---|
| Curated bundle | JSON (pretty-printed) | Matches input format; human-readable |
| Curation report | Markdown | Operator-readable; matches directive |
| Audit trail | JSONL (one record per line) | Standard for append-only audit logs; per-decision record granularity |

### A1.5  Threshold-band edge cases

| Edge case | Decision |
|---|---|
| `drop_rate === 0.05` (exact boundary) | LOW band ends at strict `<`; 0.05 falls into MODERATE. Documented at § 1.5. |
| `drop_rate === 0.15` (exact boundary) | MODERATE band ends at strict `<`; 0.15 falls into HIGH. Documented at § 1.5. |
| `n_ticks_input === 0` | Convention `drop_rate = 0`; LOW band; output written. Documented at § 1.4. |
| validation-failed + drop_rate ≥ 0.15 + override ON | Validation-failure short-circuits → exit 1 / 'Review needed'. Override is structurally ignored. Documented at § 1.5 + AC-R88-5. |

## A2  Design phase (Superpowers Design)

### A2.1  Component boundaries

- **EXISTS (untouched):** `tools/curate-baseline-pre-pass.ts`, `tools/curate-baseline-fleet-correlated.ts`, `tools/curate-baseline-pipeline.ts`, `tools/calibrators/*`, `engine/types/config.ts`, `engine/*`, all prior tests.
- **CREATED:** `tools/curate-baseline.ts`, `test/q88-baseline-curation-flow.test.ts`, 3 `test/_substrate/curation-corpus-*.json`, spec triad.
- **CHANGED:** `package.json` (1 script line), `README.md` (1 section insertion), `coordination/MEMORIAL.md` + `NEXT-ROLE.md` (appends).

### A2.2  Data flow

```
<raw-data.json>
    ↓ loadBundle()
BaselineBundle (raw)
    ↓ curateBaselineFleetCorrelated() [Stage 2a + Stage 2b composed; emits D11/D12/D13]
{ curatedBundle, decisions, fcp1State }
    ↓ countAlignedTicks(raw) - countAlignedTicks(curated) → drop_rate
    ↓ runAutoValidation(curated) [re-run Stage 2a/2b on curated]
{ passed, summary }
    ↓ decideOutcome(drop_rate, passed, allowHighDrop)
{ exit_code, headline, threshold_band }
    ↓ buildReportMarkdown() + writeOutputs()
{ curated-baseline.json, curation-report.md, curation-decisions.jsonl }
    ↓ process.exit(exit_code) [CLI guard]
```

### A2.3  Integration points

| Integration point | Verification |
|---|---|
| Wrapper → `curateBaselineFleetCorrelated` | Function signature verified at § 0.3 (Q-R88-SPEC.md). |
| Wrapper → `engine/types/config.ts` types | Type-only imports; verified at § 0.6. |
| Wrapper → `node:fs` + `node:path` | Standard library; no version constraint. |
| package.json → `node tools/curate-baseline.js` | Compiled-output filename matches `tools/curate-baseline.ts` per `tsconfig.test.json` output convention (verified by file presence of `tools/curate-baseline-pre-pass.js` etc. in git). |
| Test file → wrapper exports | All 5 exports named in § 3.1 + imported in § 3.2. |
| EMPIRICAL.sh → all 6 blocks | Each block syntax-validated by Architect during § 9.8 pre-flight simulation. |

### A2.4  Failure modes at each integration point

| Integration point | Failure mode | Handler |
|---|---|---|
| `loadBundle()` reads non-existent path | ENOENT throw | try/catch in `loadBundle` → throws Error with "cannot read <path>" prefix; CLI's outer try/catch → exit 2 |
| `loadBundle()` reads non-JSON | SyntaxError throw | try/catch → "invalid JSON at <path>" prefix; exit 2 |
| `loadBundle()` JSON missing required field | Explicit throw in shape verification | "bundle missing field <field>" prefix; exit 2 |
| `curateBaselineFleetCorrelated` throws (e.g., MCD failure on adversarial input) | Existing function's internal error handling | Propagates to wrapper's CLI try/catch → exit 2 |
| `runAutoValidation` throws | Propagates to outer try/catch → exit 2 |
| `writeOutputs` fails on disk write (permission, disk full) | ENOENT/EACCES throw | Propagates to outer try/catch → exit 2 |
| Type error at compile time | tsc fails → halt condition 2 |

## A3  Architect pre-prediction on outcomes (binding-command predictions)

| Binding command | Predicted at chore-A | Source of prediction |
|---|---|---|
| `pnpm exec tsc -p tsconfig.test.json; echo $?` | `0` | Wrapper imports verified to exist at HEAD; no new external dependencies |
| `pnpm exec node --test --test-reporter=tap test/*.test.js \| grep -E '^# tests'` | `# tests 702` | Round-start 692 + 10 new q88 test() blocks |
| `pnpm exec node --test --test-reporter=tap test/*.test.js \| grep -E '^# fail'` | `# fail 15` OR `# fail 16` (band; AC-R84-14 stochastic flake per R85 lesson) | Round-start fail=15; no pre-R88 test transitions PASS→FAIL; AC-R84-14 may oscillate ±1 |
| `pnpm exec node --test --test-reporter=tap test/*.test.js \| grep -E '^# pass'` | `# pass 682` OR `# pass 683` (band; complement of fail band) | Round-start pass=673 + 10 new q88 ACs all pass |
| `pnpm exec node --test --test-reporter=tap test/*.test.js \| grep -E '^# skipped'` | `# skipped 4` strict | No new skipped tests |
| `bash coordination/specs/Q-R88-EMPIRICAL.sh; echo $?` | `0` | All 6 blocks pass per § 9.8 simulation |
| `git diff 7887298 HEAD --name-only \| grep -Ev '<ALLOWED_SET>' \| wc -l` | `0` | All modifications in ALLOWED_SET per § 5.2 |
| `runCurationFlow('test/_substrate/curation-corpus-clean.json', { outDir: tmp })` exit_code | `0` | Clean fixture should yield drop_rate < 0.05 (Implementer tunes if not) |
| `runCurationFlow('test/_substrate/curation-corpus-moderate.json', { outDir: tmp })` exit_code | `0` (with warning) | Moderate fixture should yield 0.05 ≤ drop_rate < 0.15 |
| `runCurationFlow('test/_substrate/curation-corpus-heterogeneous.json', { outDir: tmp })` exit_code | `1` (without override) | Heterogeneous fixture should yield drop_rate ≥ 0.15 |
| `runCurationFlow(<heterogeneous>, { allowHighDrop: true })` exit_code | `0` | Override bypasses high-drop HALT |
| Predicted file count in chore-A diff | 14-17 files | spec triad (3) + tools/curate-baseline (.ts + .js = 2) + test file (.ts + .js = 2) + 3 fixtures + package.json + README.md + NEXT-ROLE.md + MEMORIAL.md + optional logs/reviewer reports |

## A4  Decision rationale (why-picked + why-rejected)

### A4.1  Wrapper architecture: why W-A over W-B / W-C

The R88 directive uses the literal phrase "operator-minimal baseline curation flow" and lists a single `--out` flag and a single CLI invocation. W-B's expanded surface contradicts that operator-minimal stance — every flag introduces an AC, and operators who want specific overrides should use the underlying `curateBaselineFleetCorrelated()` programmatic API directly. W-C's preview-then-commit pattern adds friction without solving a stated problem; the directive's threshold gating already provides the operator-visibility surface. W-A composes Stage 2a/2b once, applies threshold gating, writes outputs — exactly the directive's prescription.

### A4.2  Auto-validation: why AV-A over AV-B / AV-C

AV-B (engine/detectors/family-a-* with compile-state setup) drags the wrapper across an architectural boundary: the curation flow operates on raw `BaselineBundle` data; the per-shard detector pipeline operates on a `CompiledConfig` built from a curated bundle. AV-B would require the wrapper to also invoke `tools/calibrators/*` to build the compile-state — a separate subsystem that handles per-cell μ/Σ/signal-class derivation. That's not in the R88 directive's anti-scope-respecting allowed modifications.

AV-A (Stage 2a/2b idempotency) re-uses the EXACT surface the wrapper is already invoking. The interpretation that Stage 2a/2b composition IS the Family C surface is structurally correct: `tools/curate-baseline-fleet-correlated.ts:1-25` explicitly documents the FCP-1 e-process as "mirroring engine/detectors/family-c-betting-e-process.ts ONS pattern" at the docstring level. The Family C detector quiescence criterion is well-defined: zero Stage 2a contamination flags + zero Stage 2b FCP-1 fires on the curated bundle.

AV-C (statistical invariants) was rejected immediately as too weak — it validates type-safety, not curation hygiene. A NaN-free degenerate corpus could still be totally contaminated.

### A4.3  Drop-rate formula: why D-A over D-B / D-C

D-A's single combined metric matches the directive's three-band gating naturally. D-B's Stage-2a-only metric would under-report when Stage 2b fires (a fleet event drops one window across ALL runs — material data loss invisible in a Stage-2a-only metric). D-C's two-dimensional metric complicates the gating: which dimension dominates? The directive's three-band gating is one-dimensional; matching the metric is the simplest design.

### A4.4  Fixture construction: empirical-band fixtures vs. predicted-drop-rate fixtures

I considered prescribing exact drop_rates per fixture (e.g., "corpus-clean must have drop_rate = 0.025"). Rejected because the Architect can't predict MCD's exact output without running the algorithm — a per-tick literal-list of 240 doubles is below the threshold of architecturally-tractable empirical prediction. Instead, the spec prescribes BANDS the fixture must land in; the Implementer tunes fixture construction (sample size, distribution mix) until observed drop_rate is in-band. This puts the empirical adjustment in the Implementer's tactical-autonomy space, where it belongs (analogous to fixture-tuning in R71's hierarchical-evalue scenario, which was acknowledged to require empirical tuning).

### A4.5  CLI guard: `require.main === module` (CommonJS) vs. `import.meta.url` (ESM)

Verified at § 0.7 that 7 of 7 existing tools/*.ts use `require.main === module`. The project's tsconfig.test.json compiles to CommonJS (verified by the import idiom `import { readFileSync } from 'node:fs'` working alongside `require.main`). R88 matches the existing convention. Future ESM migration is out of scope.

### A4.6  Fail-count band (R85 / R87 lesson)

AC-R84-14 is documented as ~25% stochastic flake (R85 REVIEWER MINOR-2). R87 EMPIRICAL.sh Block 4 used a band `[15, 16]` for fail count. R88 inherits the same flakiness and uses the same band approach: `# fail ∈ [15, 16]` strict. R88-specific fail count delta is 0 (no fix to AC-R84-14 in R88), so the band carries forward verbatim. If the Implementer observes fail = 17 or fail = 14 at chore-A, halt condition 3 fires (a single re-run permitted; further drift → DIAGNOSTIC).

### A4.7  Conservative defaults: pass-no-opts vs. explicit pass-defaults

The wrapper does NOT pass any `FleetCorrelatedOpts` to `curateBaselineFleetCorrelated()`. The composer applies its own `?? DEFAULT_*` fallbacks. This is the canonical single-source-of-truth pattern: the defaults live in ONE place (the composer module); the wrapper does not redefine them. If a future round wants operator override, the wrapper can begin passing opts then; today's spec keeps defaults inherited.

## A5  Amendments from prior version

(none — first version of Q-R88-SPEC)

## A6  Round-of-derivation Surface (c) check (Rule 7)

R88 does NOT anticipate landing a new cross-project rule at MU stage. The spec's § 7 enumeration includes all 7 canonical rules with explicit R88 application; no new rule is derived from R88 findings at spec-emit time.

If during round execution a new violation pattern surfaces that crosses the 3-instance threshold, the MU may derive a new rule at MU stage. In that case Surface (c) (round-of-derivation self-application) applies retroactively to the round's own chore-A diff per CROSS-PROJECT-MEMORIAL.md:3478 canonical text.

## A7  Cross-section consistency table (R01 / R65 lesson)

Walked each load-bearing identifier through all spec sections; no drift detected (per Q-R88-SPEC.md § 9.6).

## A8  R86 prophylactic + R87 sub-pattern variant check

R87 sub-pattern (prose-claim-about-post-edit-state) check: R88 does NOT modify any existing file via Edit-then-delete pattern. The 3 file modifications are:
1. `package.json` — add a single script line (no delete; no prose-claim about post-edit).
2. `README.md` — insert a NEW section between two existing sections (no delete; no prose-claim about post-edit). The Architect verified at § 0 that the new section heading `## Baseline curation` does NOT exist in the round-start file (zero grep hits) — directly addressing R81 MAJOR-3 lesson.
3. New file creations (`tools/curate-baseline.ts`, test file, 3 fixtures) — by definition no prose-claim about post-edit content of pre-existing files.

R86 prophylactic check: all prescribed grep/awk patterns in EMPIRICAL.sh + ACs were tested against the spec's own pseudocode at § 9.5. Stage 2a/2b function signatures verified by direct file Read (§ 0.3, § 0.4).

## A9  Operator escalation criteria

The Architect does NOT set STATUS: ESCALATE for R88. All PRD ambiguities resolved at spec-authoring time:
- "Architect picks exact criteria at spec § 0" for auto-validation → resolved by § 1.3 (AV-A re-cast rationale).
- "Override flags documented" → resolved by single `--allow-high-drop` flag with rationale.
- Conservative defaults → resolved by pass-no-opts pattern.
- Threshold gating → resolved verbatim per directive.

If the operator disagrees with any decision at routing time, this audit file documents the alternatives that were rejected and why — to enable focused redirection rather than a full re-spec.

---

End of Q-R88-SPEC-AUDIT.md
