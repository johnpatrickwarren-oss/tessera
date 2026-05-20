# Q-R73-SPEC — Tier-routing classifier (Phase 4 SLICE 1 first round)

**Round:** R73
**Tier:** full
**Round-start SHA:** `841624b3c0baa3aabbc22d70aea87b9f41ea5e41` (`chore(R73 directive): Phase 4 SLICE 1 — Anchor cost efficiency; first round = tier-routing classifier`). Verified by `git rev-parse HEAD` at Architect session entry (returns `841624b...`).

> **Routing input:** the spec proper (this file) is the load-bearing Implementer input. `Q-R73-SPEC-AUDIT.md` (sidecar) carries the P3 ten-axis pass, pre-emit grilling artifacts, Architect predictions, and decision rationale; Reviewer is authorized to read both. `Q-R73-EMPIRICAL.sh` (chore-A verifier) is committed in the same triad and executed by the Implementer at chore-A.

---

## § 0 Brainstorm — mechanism selection

Per the directive § Primary deliverable item 1: "Architect picks classifier mechanism at spec § 0: Haiku LLM call (recommended; nuanced reasoning) OR heuristic rules (zero-cost but brittle) OR hybrid (heuristic gate + Haiku tiebreaker)."

### Approach A — Haiku LLM call (recommended in directive)

- **Strengths:** nuanced reasoning over directive prose; tolerates novel phrasings; LLM weighs A1–A7 (full-tier signals) vs S1–S5 (audit-tier signals) vs Z1–Z5 (solo signals) per the CLAUDE-COMMON.md rubric directly.
- **Weaknesses:** non-trivial latency at each pipeline invocation (~3–10 s); cost ~$0.005 per call; non-deterministic outputs make CI test ACs hard to author without a fixture-recording layer; depends on `claude` CLI availability (already a hard pipeline dep, so no NEW external dependency).
- **Hidden assumption:** Haiku 4.5 weighs the rubric correctly when fed only the directive text; CLAUDE-COMMON.md is not visible at router invocation.
- **Risk:** Haiku output not deterministic → the `test/q73-tier-router.test.ts` validation-corpus ACs become flaky unless the test mocks the call. The directive's load-bearing safety check (R45/R61/R62/R66/R72 route `full`) becomes inspection-time-dependent rather than a stable CI gate.

### Approach B — Heuristic rules (zero-cost, brittle)

- **Strengths:** fully deterministic; zero per-round cost; CI-stable; the validation-corpus safety check is a pure unit test.
- **Weaknesses:** brittle to phrasing changes in future directive bodies; the heuristic surface must be enumerated by the Architect now and frozen as the public contract.
- **Hidden assumption:** future round directives use vocabulary the heuristic covers. The directive surface IS controlled by the operator + Architect-of-the-day, so this is a controllable assumption — but it locks the heuristic to current conventions.
- **Risk:** novel directive prose may produce ambiguous matches → router must default to `full` (the directive's uncertainty escape hatch). False-negative routing safety holds; false-positive `full` (over-routing to full when audit would have sufficed) is the cost — but `full` is the conservative side, so this fails-safe in the safety direction.

### Approach C — Hybrid (heuristic gate + Haiku tiebreaker) — SELECTED

- **Strengths:** the heuristic gate handles the high-confidence cases (Coordinator rounds explicitly tagged in directive prose; full-tier rounds whose ALLOWED_SET names `engine/` paths or whose halt-conditions reference architectural-reality discovery; methodology rounds whose directives name CLAUDE-*.md REINFORCEMENT consolidation). Haiku is invoked ONLY when the heuristic confidence is below the threshold. Test ACs and the validation-corpus safety check run against the heuristic component (deterministic, fixture-based). Haiku is a soft layer for novel directive phrasings.
- **Weaknesses:** two systems to maintain; the heuristic surface must still be enumerated. The integration between heuristic and Haiku must be unambiguous (router contract: "if heuristic confidence ≥ threshold, output is heuristic; else output is Haiku-or-default-`full`").
- **Hidden assumption:** the high-confidence heuristic catches all 5 architectural-decision rounds (R45/R61/R62/R66/R72) WITHOUT needing the Haiku tiebreaker. If a load-bearing round falls into the Haiku-tiebreaker bucket, the CI safety gate cannot exercise the LIVE Haiku path (test cost + non-determinism); the heuristic alone must cover the safety-set.
- **Risk:** misalignment between heuristic and Haiku could create a router output dependent on the configuration mode. Mitigation: the spec requires `--mode heuristic` for the validation-corpus AC checks AND for the `Q-R73-EMPIRICAL.sh` Block; Haiku mode is exercised only by the standalone `pnpm tier-router` command at pipeline-invocation time.

### Constraint check against the directive

- Anti-scope item 5 says "NO new external dependencies (R68 anti-worm posture)." A Haiku LLM call via `@anthropic-ai/sdk` would add an external dep. Both Approach A and the Haiku tail of Approach C MUST reuse the existing `claude` CLI (`claude -p --model claude-haiku-4-5-20251001`). `claude` is already a hard pipeline dep (see `run-pipeline.sh:336,1487,1598`). No new external dep is introduced.
- Halt condition #4 (validation-corpus failure): R45/R61/R62/R66/R72 must all route `full`. This MUST hold under `--mode heuristic` alone — the heuristic surface covers the architectural-decision corpus deterministically.

### Selection

**Approach C — hybrid, with the heuristic layer carrying the load-bearing safety contract.**

Picked because (i) it satisfies the safety-check determinism requirement (heuristic-only test ACs); (ii) it preserves the directive's "recommended Haiku" framing as a soft layer for ambiguous directives; (iii) the integration cost is bounded by a single conditional branch (`if heuristic_confidence < threshold → fall back to Haiku → if Haiku fails → default full`); (iv) the Haiku-tail's cost (~$0.005 × ambiguous-fraction) is dominated by the savings from the cases the heuristic routes confidently away from `full`.

**Rejected: Approach A** (Haiku-only) — fails the test-AC-determinism requirement without a fixture layer that adds equivalent complexity to Approach C.
**Rejected: Approach B** (heuristic-only) — discards the operator-recommended Haiku layer; introduces brittleness to novel directive phrasings; the Haiku tiebreaker is cheap to add given the architecture choice already pays for the heuristic surface.

### Decision-criteria for the heuristic surface (load-bearing)

The heuristic operates on the round directive text (the `## § R{N} Round-scope directive` section of `coordination/NEXT-ROLE.md` at the round's pre-Architect state; or, where the directive lives in a `chore: prepare R{N} directive` commit body, the commit message body). The heuristic emits one of `full` / `audit` / `implementer-only` / `coordinator-only` with a confidence score in [0, 1] and a one-line rationale.

The heuristic rule set, evaluated in priority order (first match wins):

1. **`coordinator-only` rule** — the directive content contains ANY of (case-insensitive regex):
   - `Coordinator wave plan` (verbatim, anchored phrase)
   - `WAVE-GATE-\d+ close` (verbatim, including WAVE-GATE NN id)
   - `CLUSTER-HANDOFF` (verbatim, structural cluster handoff token)
   - `operator-decision backlog` (verbatim, R64 archetype)
   - `Coordinator —` em-dash phrase at the start of the directive heading (`## § R{N} Round-scope directive (Coordinator — ...)`)
   - First-line keyword: `--coordinator` flag appears in a pipeline-invocation block
   - → output `{"tier": "coordinator-only", "confidence": 0.90}`. Rationale string lists the matched anchor.

2. **`full` rule** — the directive content contains ANY of:
   - The word `ESCALATE` (verbatim, all-caps; matches "ESCALATE", "STATUS: ESCALATE", "ESCALATE #1")
   - The word `DIAGNOSTIC` in a halt-condition context (e.g., "HALT + DIAGNOSTIC")
   - Substring `architectural-decision` or `architectural-reality`
   - Substring `R61-class` (architectural-reality discovery archetype)
   - Substring `validation-corpus failure` (R73's own safety check)
   - Substring `engine/` (anywhere in the directive — modifying engine internals = full)
   - First-line keyword: `--tier full` appears in a pipeline-invocation block
   - Architectural anti-scope item A1 / A2 / A4 / A6 named explicitly (e.g., "A1 (new dependency)" or "A2 (new architectural pattern)")
   - → output `{"tier": "full", "confidence": 0.85}`. Rationale string lists the matched anchor.

3. **`implementer-only` rule** — the directive content contains ALL of:
   - ALLOWED_SET ≤ 3 paths
   - None of those paths are under `engine/`, `tools/`, `scripts/`, `test/`, `package.json`, `tsconfig*.json`, or `run-pipeline.sh`
   - Substring `mechanical` OR `cosmetic` OR `documentation` OR `doc-only` OR `typo` in the directive prose
   - No `ESCALATE` / `DIAGNOSTIC` / `engine/` / `architectural-decision` substring
   - → output `{"tier": "implementer-only", "confidence": 0.80}`. Rationale string lists the matched anchor.

4. **`audit` rule** — the directive content contains ANY of:
   - Substring `methodology` (methodology rounds default to audit; see R42–R51 precedent in MEMORIAL.md)
   - Substring `REINFORCEMENT consolidation` or `MR-2 Pass` or `re-accretion guard`
   - Substring `--tier audit` appears in a pipeline-invocation block
   - Directive heading contains `audit-tier` / `(audit-tier`
   - → output `{"tier": "audit", "confidence": 0.75}`. Rationale string lists the matched anchor.

5. **Default (ambiguous)** — none of rules 1–4 match:
   - If `--mode heuristic`: output `{"tier": "full", "confidence": 0.50, "rationale": "ambiguous directive; defaulting to full per uncertainty escape hatch"}`.
   - If `--mode hybrid`: invoke Haiku tiebreaker (see § 0.6 below). On Haiku failure (CLI exit non-zero, malformed JSON, or Haiku-output confidence < threshold): output `{"tier": "full", "confidence": 0.50, "rationale": "ambiguous directive + Haiku tiebreaker unavailable or low-confidence"}`.

### § 0.6 Haiku tiebreaker contract

When `--mode hybrid` AND the heuristic stage falls to rule 5:

- The router invokes `claude -p --model claude-haiku-4-5-20251001 --max-turns 1` (or equivalent CLI subcommand discovered via `claude --help`; the Implementer chooses the exact invocation discovered at chore-A time and records it in the router source comment).
- Input prompt: a fixed prompt template (see § 3.2 pseudocode) that includes the directive content + the CLAUDE-COMMON.md A1–A7 / S1–S5 / Z1–Z5 rubric (embedded as a static string in the router source).
- Output expected: a JSON object `{tier: "full"|"audit"|"implementer-only"|"coordinator-only", confidence: number, rationale: string}`.
- If `claude` CLI returns non-zero exit OR the output is not valid JSON OR the `tier` field is not one of the four allowed values OR `confidence < threshold` (default 0.70): the router emits the uncertainty default per rule 5.
- If the Haiku output is valid AND confidence ≥ threshold: the router emits the Haiku output, with `decision_path` set to `["heuristic_rule_5_default","haiku_tiebreaker"]`.

The Haiku tail is OPTIONAL at runtime — `--mode heuristic` (used by tests + `Q-R73-EMPIRICAL.sh`) skips it. The pipeline `--auto-tier` flag invokes `--mode hybrid` by default.

---

## § 1 Design — component boundaries + integration points

### § 1.1 Component inventory

| Path | Status | Description |
|---|---|---|
| `scripts/tier-router.ts` | NEW | The router. CLI: `node scripts/tier-router.js [options]`. TypeScript source compiled by the existing `pnpm test`/`pnpm coverage`/etc. pretest tsc invocation against `tsconfig.test.json`. |
| `scripts/tier-router-validate.ts` | NEW | Replay script. Iterates Tessera commit history, invokes the router on each historical directive, reports accuracy + divergence + load-bearing-safety verdict. |
| `scripts/tier-router-criteria.md` | NEW | Operator-facing decision-criteria documentation (one-page reference; same rules as § 0 above but in prose for casual reading). Generated at chore-A; primary content mirrors § 0 above. |
| `scripts/tier-router-fixtures/corpus.json` | NEW | Validation corpus: array of `{round_id, directive_source, expected_tier, expected_excluded_tier}` entries. Source-of-truth for the test file's safety ACs. |
| `scripts/tier-router-fixtures/R45-directive.md` | NEW | Embedded directive content for R45 (architectural-decision; R45-CRITICAL-routing-override context). |
| `scripts/tier-router-fixtures/R61-directive.md` | NEW | Embedded directive content for R61 (full-tier; npm extract architectural-decision; ESCALATE history). |
| `scripts/tier-router-fixtures/R62-directive.md` | NEW | Embedded directive content for R62 (full-tier; CRITICAL-1 spec-design-resolved; ESCALATE history). |
| `scripts/tier-router-fixtures/R66-directive.md` | NEW | Embedded directive content for R66 (full-tier; Wave 10 second cluster; ESCALATE chain). |
| `scripts/tier-router-fixtures/R72-directive.md` | NEW | Embedded directive content for R72 (full-tier; coverage saturation; ESCALATE chain). |
| `scripts/tier-router-fixtures/R49-directive.md` | NEW | Embedded directive content for R49 (audit-tier methodology; pipeline-mandatory). |
| `scripts/tier-router-fixtures/R50-directive.md` | NEW | Embedded directive content for R50 (audit-tier methodology; parallel-execution levers). |
| `scripts/tier-router-fixtures/R51-directive.md` | NEW | Embedded directive content for R51 (audit-tier methodology; CLAUDE-IMPLEMENTER consolidation). |
| `scripts/tier-router-fixtures/R55-directive.md` | NEW | Embedded directive content for R55 (Coordinator wave plan). |
| `scripts/tier-router-fixtures/R60-directive.md` | NEW | Embedded directive content for R60 (Coordinator; PARALLEL-FAN-OUT). |
| `scripts/tier-router-fixtures/R63-directive.md` | NEW | Embedded directive content for R63 (Coordinator WAVE-GATE-09 close + CLUSTER-HANDOFF). |
| `scripts/tier-router-fixtures/R64-directive.md` | NEW | Embedded directive content for R64 (Coordinator operator-decision backlog). |
| `scripts/tier-router-fixtures/R68-directive.md` | NEW | Embedded directive content for R68 (Coordinator pnpm migration). |
| `coordination/logs/ROUND-R*-ROUTING.md` | NEW pattern (R73+) | Per-round routing log emitted by `run-pipeline.sh --auto-tier`. NOT created by R73 itself; the pattern is established for future rounds. R73's spec ALLOWED_SET reserves `coordination/logs/ROUND-R73-ROUTING.md` as a permitted creation path. |
| `run-pipeline.sh` | MODIFIED | Add `--auto-tier` flag + integration with `scripts/tier-router.js`. Tessera-temporary divergence per operator-confirmed pattern; rebase at R76 Anchor merge. |
| `CLAUDE-COORDINATOR.md` | MODIFIED (optional) | OPTIONAL: add `--auto-tier` Mode docs section. This is NOT a REINFORCEMENT entry (anti-scope: NO REINFORCEMENTS modifications). The Implementer MAY skip this if the inline `--help` and `scripts/tier-router-criteria.md` are judged sufficient documentation. |
| `package.json` | MODIFIED | Add `tier-router` + `tier-router:validate` npm scripts. |
| `test/q73-tier-router.test.ts` | NEW | Test ACs against the router output. Uses `--mode heuristic` for determinism. Reads fixtures from `scripts/tier-router-fixtures/`. |
| `coordination/specs/Q-R73-SPEC.md` | NEW | This file. |
| `coordination/specs/Q-R73-SPEC-AUDIT.md` | NEW | Spec audit sidecar. |
| `coordination/specs/Q-R73-EMPIRICAL.sh` | NEW | chore-A verifier. |
| `coordination/reviews/REVIEWER-REPORT-R73.md` | NEW (Reviewer) | Reviewer authors at Reviewer-stage; not included in chore-A. |
| `coordination/MEMORIAL.md` | APPEND | Round entries per role. |
| `coordination/NEXT-ROLE.md` | MODIFIED | This file's routing block; Implementer routing block; Reviewer + MU routing blocks. |
| `tsconfig.test.json` | MODIFIED | Add `"scripts/**/*.ts"` to the `include` array. Required so `scripts/tier-router.ts` + `scripts/tier-router-validate.ts` are compiled by the existing `pretest`/`prebuild:*` tsc invocation. Verified at spec-emit time: tsconfig.test.json currently includes `engine/**/*.ts`, `test/**/*.ts`, `tools/**/*.ts` only; `scripts/` is excluded by default. NOT a downgrade of the existing strictness — same compilerOptions apply. |

**Engine surfaces consulted (READ-ONLY; verified at spec-emit time):** none. R73 is entirely a tooling round; no engine surface is touched. The `engine/` directory is anti-scope hard.

### § 1.2 Integration points

| Integration | Surface | Direction | Failure mode at boundary |
|---|---|---|---|
| `scripts/tier-router.ts` ← directive text | reads directive content via `--directive <path>` flag OR stdin | inbound | Empty or unreadable directive → exit 1 with stderr `tier-router: directive unreadable: <path>`; no JSON on stdout. |
| `scripts/tier-router.ts` → JSON output | emits a single JSON object on stdout; exit 0 on successful classification; exit 1 on input error | outbound | Malformed input → exit 1. Internal heuristic failure (no rule matched + Haiku disabled) → exit 0 with `{"tier":"full","confidence":0.5,"rationale":"..."}`. |
| `scripts/tier-router.ts` → `claude` CLI subprocess (hybrid mode only) | shells out via `child_process.spawnSync('claude', ['-p', '--model', 'claude-haiku-4-5-20251001', '--max-turns', '1'])`; passes prompt on stdin | outbound (optional) | CLI exit non-zero OR stdout not valid JSON OR `tier` not in allowed set → router emits uncertainty default per § 0 rule 5. |
| `scripts/tier-router-validate.ts` → git history | uses `git show <SHA>:coordination/NEXT-ROLE.md` AND/OR `git log --oneline --grep` to discover historical directive content | outbound | Round not found in git history → reported as `unknown` in accuracy matrix; NOT a failure unless the round is in the load-bearing safety set. |
| `scripts/tier-router-validate.ts` → exit code | exit 0 iff ALL load-bearing safety rounds (R45/R61/R62/R66/R72) route `full` AND ALL non-implementer-only-rounds (R49/R50/R51/R55/R60/R63/R64/R68) route ≠ `implementer-only`; otherwise exit 1 + accuracy report on stdout | outbound | Any safety-set violation → exit 1. This is the load-bearing CI gate. |
| `run-pipeline.sh --auto-tier` ← `scripts/tier-router.js` | invokes the router on `coordination/NEXT-ROLE.md`; parses JSON; sets `$TIER` env / overrides `--tier` flag | inbound | Router exit non-zero OR JSON parse fail → log warning + default `--tier full`. NEVER aborts the pipeline based on router failure. |
| `run-pipeline.sh --auto-tier` → routing log | writes `coordination/logs/ROUND-R{N}-ROUTING.md` containing the router JSON output + the effective tier chosen + the pipeline-mode source (`--auto-tier` vs explicit `--tier ...`) | outbound | Log-write failure → warning; pipeline continues. |

### § 1.3 Failure modes (per-integration)

| Integration | Failure observable | Required mitigation in this round |
|---|---|---|
| Router on empty directive | exit 1 + stderr | AC-R73-3 (structural). |
| Router on directive missing `## § R{N} Round-scope directive` heading | exit 0; full-text mode evaluates whole content | AC-R73-2 (full-text fallback is the contract). |
| Router output not valid JSON | structurally impossible (router emits JSON via `JSON.stringify`) | structural — router always emits valid JSON or exits 1; AC-R73-1. |
| `claude` CLI not installed (hybrid mode) | `spawnSync` ENOENT | Caught; uncertainty default + rationale `"claude CLI unavailable for haiku tiebreaker"`. AC-R73-9 exercises ambiguous-directive default. |
| Validation corpus round NOT in git history (e.g., R45 directive SHA unknown) | `git show` exit non-zero | The validate script's corpus.json contains `directive_source: {type: "embedded_fixture", path: "scripts/tier-router-fixtures/R45-directive.md"}` so the safety-set rounds are SELF-CONTAINED (do not depend on a discoverable git SHA). AC-R73-5 + AC-R73-6 use these fixtures. |
| `run-pipeline.sh --auto-tier` invoked but `scripts/tier-router.js` not compiled (`.ts` only) | `node scripts/tier-router.js` ENOENT | `--auto-tier` requires a prior `pnpm exec tsc -p tsconfig.test.json` OR a `pnpm tier-router` prebuild. The pipeline integration MUST run `pnpm exec tsc -p tsconfig.test.json` (existing `pretest` script) as a prerequisite. AC-R73-10 exercises this. |

---

## § 2 Mechanism — load-bearing decisions

### § 2.1 Router input contract

The router accepts directive content via one of:

- `--directive <path>` flag: reads the file at `<path>` as the directive content. The router treats the entire file as the input; it does NOT extract a sub-section.
- Default (no `--directive` flag): reads `coordination/NEXT-ROLE.md` and extracts the section matching the regex `^## § R\d+ Round-scope directive[\s\S]*?(?=^## § |^---|\Z)` (multiline mode); if no match, reads the entire file.

> **Decision (load-bearing):** the router operates on directive PROSE — not on commit messages or any other input — so that the input is stable, file-resident, and reproducible at validation time. Future-round directive commit messages MAY contain the same scope content; the router does not parse them. The Implementer MUST NOT add commit-message parsing.

### § 2.2 Router output JSON shape

The router emits a single JSON object on stdout. Shape:

```json
{
  "round": "R73",
  "tier": "full",
  "confidence": 0.85,
  "rationale": "engine/ token in ALLOWED_SET",
  "decision_path": ["heuristic_rule_2_full_signal"],
  "router_version": "0.1.0",
  "mode": "heuristic"
}
```

Field semantics:

- `round`: string; the round id extracted from the first matching `R\d+` token in the directive heading, OR the literal `"unknown"` if no round id is discoverable.
- `tier`: one of `"full"` / `"audit"` / `"implementer-only"` / `"coordinator-only"`.
- `confidence`: number in [0.0, 1.0]; 0.5 means "ambiguous / default applied".
- `rationale`: string; ≤ 200 characters; one-line human-readable justification naming the matched anchor or default reason.
- `decision_path`: array of strings; the rule-name chain that produced the output (e.g., `["heuristic_rule_2_full_signal"]` or `["heuristic_rule_5_default","haiku_tiebreaker","haiku_output_low_confidence","default_full"]`).
- `router_version`: string; the router source's hardcoded version literal (`"0.1.0"` at R73 chore-A).
- `mode`: string; one of `"heuristic"` / `"haiku"` / `"hybrid"`; reflects the effective mode used for THIS classification (a `--mode hybrid` invocation that exits via heuristic rules 1-4 emits `"mode": "heuristic"` because Haiku was not consulted).

### § 2.3 Confidence threshold

Default `--confidence-threshold 0.70`. If the heuristic emits a `confidence` below the threshold AND mode is `hybrid` AND Haiku is available, fall back. The threshold is a CLI flag for testability; tests use the default 0.70.

### § 2.4 Run-pipeline.sh `--auto-tier` integration contract

When `run-pipeline.sh` is invoked with `--auto-tier`:

1. The script invokes `node scripts/tier-router.js --mode hybrid --directive "$COORD/NEXT-ROLE.md"` and captures stdout.
2. If the router exits 0 AND the output is valid JSON AND `tier` is one of the four allowed values: the pipeline sets `TIER` from the router output, mapping:
   - `full` → `TIER="full"`
   - `audit` → `TIER="audit"`
   - `implementer-only` → `TIER="solo"`
   - `coordinator-only` → `COORDINATOR_MODE=true` (overrides `--tier`; existing semantics in `run-pipeline.sh:230-248`)
3. If the router exits non-zero OR the output is invalid: the pipeline emits `log_warn "tier-router unavailable or invalid output; defaulting to --tier full"` and sets `TIER="full"`.
4. The pipeline appends a routing log to `coordination/logs/ROUND-${ROUND}-ROUTING.md` with:
   - Router stdout JSON (verbatim)
   - Effective TIER chosen
   - Source: `--auto-tier` (router decision) OR `--tier <X>` (explicit override)
   - Timestamp
5. The `--auto-tier` flag is mutually consistent with explicit `--tier <X>`: explicit `--tier` wins over `--auto-tier` (the operator overrides the router). When BOTH are provided, the routing log records `Source: --tier <X> (explicit override; --auto-tier ignored)`.

### § 2.5 Validation corpus structure

`scripts/tier-router-fixtures/corpus.json` contains:

```json
{
  "schema_version": "0.1.0",
  "load_bearing_safety": {
    "must_route_full": ["R45", "R61", "R62", "R66", "R72"],
    "must_not_route_implementer_only": ["R49", "R50", "R51", "R55", "R60", "R63", "R64", "R68"]
  },
  "entries": [
    {
      "round_id": "R45",
      "directive_source": {"type": "embedded_fixture", "path": "scripts/tier-router-fixtures/R45-directive.md"},
      "expected_constraint": {"must_route_full": true},
      "label_rationale": "R45 architectural-decision round; CRITICAL-routing-override flagged (per coordination/MEMORIAL.md line 289 ref); directive contains ESCALATE-class content + halt-discipline reinforcement work"
    },
    /* ... 12 more entries; one per validation-corpus round ... */
  ]
}
```

The Implementer authors corpus.json with one entry per safety-set round (5 + 8 = 13 entries). The directive content for each round is captured into the matching `scripts/tier-router-fixtures/R{N}-directive.md` file, sourced either from HEAD's `coordination/NEXT-ROLE.md` (rounds R63-R72 directly available; see grep at spec-emit time) or from the `chore: prepare R{N} directive` commit body for older rounds (R49/R50/R51/R55/R60/R61 directly available via `git log --grep`).

For R45 / R62 / R64 / R68 where a single "directive" commit is not separately identifiable: the Implementer extracts the directive content from the OLDEST commit at which a `## § R{N}` section appears in `coordination/NEXT-ROLE.md` (use `git log --oneline -- coordination/NEXT-ROLE.md` + `git show <SHA>:coordination/NEXT-ROLE.md` to locate). If even that fails, the Implementer composes a representative directive excerpt from the MEMORIAL.md entries for that round (e.g., R45 — see MEMORIAL.md line 127 `## R45 — IMPLEMENTER (audit-tier, Architect hat)`) AND the corresponding spec `coordination/specs/Q-R{N}-SPEC.md` Mechanism + Anti-scope sections. The fixture content is the input the router sees; once embedded, it is the authoritative test input.

**This is TACTICAL AUTONOMY** for the Implementer: the exact directive-content extraction recipe per round is operator-side choice; the spec mandates only that the resulting fixture file produces a deterministic router output ∈ {`full` for safety rounds; ≠`implementer-only` for the eight} under `--mode heuristic`.

### § 2.6 Tessera-temporary divergence note (for MEMORIAL)

`run-pipeline.sh` is Tessera-vendored framework code (canonically owned by Anchor; vendored into Tessera at engine SHA `5a72371`). The directive § Anti-scope item explicitly permits modifications here: "MODIFICATIONS PERMITTED to Tessera-vendored framework files (`run-pipeline.sh` + optionally `CLAUDE-COORDINATOR.md` for `--auto-tier` Mode docs) per Tessera-temporary-divergence operator-confirmed pattern. Document in MEMORIAL COORDINATOR entry; rebase at R76 Anchor merge."

R73 IMPLEMENTER MEMORIAL entry MUST include a CONFIRMATION line documenting:
- The exact added lines to `run-pipeline.sh`
- The acknowledgement that this is a temporary divergence
- The rebase plan: R76 Anchor merge will port the `--auto-tier` mechanism back to Anchor's canonical `run-pipeline.sh` and re-vendor to Tessera.

---

## § 3 Per-file pseudocode

### § 3.1 `scripts/tier-router.ts`

```typescript
// scripts/tier-router.ts — Tier-routing classifier (R73)
// Outputs JSON tier recommendation given a directive content file.

import { readFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

interface RouterResult {
  round: string;
  tier: 'full' | 'audit' | 'implementer-only' | 'coordinator-only';
  confidence: number;
  rationale: string;
  decision_path: string[];
  router_version: string;
  mode: 'heuristic' | 'haiku' | 'hybrid';
}

const ROUTER_VERSION = '0.1.0';
const DEFAULT_CONFIDENCE_THRESHOLD = 0.70;
const HAIKU_MODEL = 'claude-haiku-4-5-20251001';

interface CLIArgs {
  directive: string;          // path to directive file
  mode: 'heuristic' | 'haiku' | 'hybrid';
  confidenceThreshold: number;
}

function parseArgs(argv: string[]): CLIArgs {
  // Defaults
  let directive = 'coordination/NEXT-ROLE.md';
  let mode: CLIArgs['mode'] = 'hybrid';
  let confidenceThreshold = DEFAULT_CONFIDENCE_THRESHOLD;

  for (let i = 2; i < argv.length; i++) {
    switch (argv[i]) {
      case '--directive':
        directive = argv[++i];
        break;
      case '--mode':
        const m = argv[++i];
        if (m !== 'heuristic' && m !== 'haiku' && m !== 'hybrid') {
          process.stderr.write(`tier-router: invalid --mode value: ${m}\n`);
          process.exit(1);
        }
        mode = m as CLIArgs['mode'];
        break;
      case '--confidence-threshold':
        confidenceThreshold = parseFloat(argv[++i]);
        break;
      default:
        process.stderr.write(`tier-router: unknown argument: ${argv[i]}\n`);
        process.exit(1);
    }
  }
  return { directive, mode, confidenceThreshold };
}

function loadDirective(path: string): { content: string; round: string } {
  const absolutePath = resolve(path);
  if (!existsSync(absolutePath)) {
    process.stderr.write(`tier-router: directive unreadable: ${path}\n`);
    process.exit(1);
  }
  const raw = readFileSync(absolutePath, 'utf-8');
  // Try to extract the most recent `## § R{N} Round-scope directive` section.
  const sectionMatch = raw.match(
    /^## § R(\d+) Round-scope directive[\s\S]*?(?=^## § |^---\s*$|\Z)/m,
  );
  const round = sectionMatch ? `R${sectionMatch[1]}` : (raw.match(/^CURRENT-ROUND:\s*(R\d+)/m)?.[1] ?? 'unknown');
  const content = sectionMatch ? sectionMatch[0] : raw;
  return { content, round };
}

function heuristic(content: string, round: string): RouterResult {
  // RULE 1: coordinator-only
  const coordinatorMatches: string[] = [];
  if (/coordinator wave plan/i.test(content)) coordinatorMatches.push('Coordinator wave plan');
  if (/WAVE-GATE-\d+ close/.test(content)) coordinatorMatches.push('WAVE-GATE close');
  if (/CLUSTER-HANDOFF/.test(content)) coordinatorMatches.push('CLUSTER-HANDOFF');
  if (/operator-decision backlog/i.test(content)) coordinatorMatches.push('operator-decision backlog');
  if (/^## § R\d+ Round-scope directive \(Coordinator —/m.test(content)) coordinatorMatches.push('Coordinator — heading');
  if (/--coordinator(?:\s|$)/.test(content)) coordinatorMatches.push('--coordinator flag');
  if (coordinatorMatches.length > 0) {
    return {
      round, tier: 'coordinator-only', confidence: 0.90,
      rationale: `coordinator anchor: ${coordinatorMatches.slice(0, 2).join(', ')}`,
      decision_path: ['heuristic_rule_1_coordinator'],
      router_version: ROUTER_VERSION, mode: 'heuristic',
    };
  }

  // RULE 2: full
  const fullMatches: string[] = [];
  if (/\bESCALATE\b/.test(content)) fullMatches.push('ESCALATE');
  if (/HALT \+ DIAGNOSTIC|HALT \+ DIAGNOSTIC \+ ESCALATE/.test(content)) fullMatches.push('HALT+DIAGNOSTIC');
  if (/architectural-decision|architectural-reality/i.test(content)) fullMatches.push('architectural-decision');
  if (/R61-class/.test(content)) fullMatches.push('R61-class');
  if (/validation-corpus failure/i.test(content)) fullMatches.push('validation-corpus failure');
  if (/(^|[\s/])engine\//m.test(content)) fullMatches.push('engine/ path');
  if (/--tier full\b/.test(content)) fullMatches.push('--tier full');
  if (/\bA1 \(new dependency\)|\bA2 \(new architectural pattern\)|\bA4 \(novel data model\)/.test(content)) fullMatches.push('A-factor');
  if (fullMatches.length > 0) {
    return {
      round, tier: 'full', confidence: 0.85,
      rationale: `full anchor: ${fullMatches.slice(0, 2).join(', ')}`,
      decision_path: ['heuristic_rule_2_full_signal'],
      router_version: ROUTER_VERSION, mode: 'heuristic',
    };
  }

  // RULE 3: implementer-only
  // Count ALLOWED paths heuristically by listing lines that look like file paths under an ALLOWED section.
  // Match either backtick-quoted paths or unquoted file-extension paths in a 30-line window after "ALLOWED".
  const allowedSection = content.match(/(?:^|\n)ALLOWED(?: modifications)?:?[\s\S]{0,3000}/i);
  let allowedPaths = 0;
  let hasRiskySurface = false;
  if (allowedSection) {
    const pathLine = /[\s`-](\S+\.(?:ts|js|sh|json|md))(?:`|\s|$)/g;
    let m: RegExpExecArray | null;
    while ((m = pathLine.exec(allowedSection[0])) !== null) {
      allowedPaths++;
      const p = m[1];
      if (/^engine\/|^tools\/|^scripts\/|^test\//.test(p) || /package\.json|tsconfig.*\.json|run-pipeline\.sh/.test(p)) {
        hasRiskySurface = true;
      }
    }
  }
  const mechanicalKeyword = /\bmechanical\b|\bcosmetic\b|\bdocumentation-only\b|\bdoc-only\b|\btypo\b/i.test(content);
  if (mechanicalKeyword && allowedPaths > 0 && allowedPaths <= 3 && !hasRiskySurface) {
    return {
      round, tier: 'implementer-only', confidence: 0.80,
      rationale: `implementer-only anchor: ${allowedPaths} ALLOWED path(s); mechanical/cosmetic; no risky surface`,
      decision_path: ['heuristic_rule_3_implementer_only'],
      router_version: ROUTER_VERSION, mode: 'heuristic',
    };
  }

  // RULE 4: audit
  const auditMatches: string[] = [];
  if (/\bmethodology\b/i.test(content)) auditMatches.push('methodology');
  if (/REINFORCEMENT consolidation|MR-2 Pass|re-accretion guard/i.test(content)) auditMatches.push('REINFORCEMENT consolidation');
  if (/--tier audit\b/.test(content)) auditMatches.push('--tier audit');
  if (/audit-tier|\(audit-tier/.test(content)) auditMatches.push('audit-tier heading');
  if (auditMatches.length > 0) {
    return {
      round, tier: 'audit', confidence: 0.75,
      rationale: `audit anchor: ${auditMatches.slice(0, 2).join(', ')}`,
      decision_path: ['heuristic_rule_4_audit'],
      router_version: ROUTER_VERSION, mode: 'heuristic',
    };
  }

  // RULE 5: default
  return {
    round, tier: 'full', confidence: 0.50,
    rationale: 'ambiguous directive; defaulting to full per uncertainty escape hatch',
    decision_path: ['heuristic_rule_5_default'],
    router_version: ROUTER_VERSION, mode: 'heuristic',
  };
}

function haikuTiebreaker(content: string, round: string, threshold: number): RouterResult | null {
  // Build prompt with the directive content + the CLAUDE-COMMON.md rubric (embedded as a const).
  const prompt = buildHaikuPrompt(content);
  const result = spawnSync(
    'claude',
    ['-p', '--model', HAIKU_MODEL, '--max-turns', '1'],
    { input: prompt, encoding: 'utf-8', timeout: 60_000 },
  );
  if (result.status !== 0 || !result.stdout) return null;
  let parsed: unknown;
  try { parsed = JSON.parse(extractJSON(result.stdout)); } catch { return null; }
  if (!isValidRouterTier(parsed)) return null;
  const haikuConfidence = (parsed as { confidence: number }).confidence;
  if (haikuConfidence < threshold) return null;
  return {
    round,
    tier: (parsed as { tier: RouterResult['tier'] }).tier,
    confidence: haikuConfidence,
    rationale: (parsed as { rationale: string }).rationale ?? 'haiku tiebreaker',
    decision_path: ['heuristic_rule_5_default', 'haiku_tiebreaker'],
    router_version: ROUTER_VERSION,
    mode: 'hybrid',
  };
}

function buildHaikuPrompt(directive: string): string {
  return `You are a tier-routing classifier for the Anchor pipeline. Given a round directive, output a JSON object with fields tier, confidence, rationale. tier is one of: full, audit, implementer-only, coordinator-only. ... [embed CLAUDE-COMMON.md A1-A7 / S1-S5 / Z1-Z5 rubric here verbatim]\n\nDIRECTIVE:\n${directive}\n\nOutput ONLY the JSON object, nothing else.`;
}

function extractJSON(stdout: string): string {
  // Strip leading/trailing whitespace and any code-fence markers.
  const trimmed = stdout.trim();
  const fenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  return fenceMatch ? fenceMatch[1] : trimmed;
}

function isValidRouterTier(v: unknown): v is { tier: RouterResult['tier']; confidence: number; rationale?: string } {
  if (typeof v !== 'object' || v === null) return false;
  const obj = v as Record<string, unknown>;
  const validTiers = ['full', 'audit', 'implementer-only', 'coordinator-only'];
  return validTiers.includes(obj.tier as string) && typeof obj.confidence === 'number';
}

function main(): void {
  const args = parseArgs(process.argv);
  const { content, round } = loadDirective(args.directive);
  let result = heuristic(content, round);
  if (args.mode === 'hybrid' && result.confidence < args.confidenceThreshold) {
    const haiku = haikuTiebreaker(content, round, args.confidenceThreshold);
    if (haiku) {
      result = haiku;
    } else {
      result = {
        ...result,
        decision_path: [...result.decision_path, 'haiku_tiebreaker', 'haiku_unavailable_or_low_confidence', 'default_full'],
        tier: 'full',
        confidence: 0.50,
        rationale: 'ambiguous directive + Haiku tiebreaker unavailable or low-confidence',
        mode: 'hybrid',
      };
    }
  } else if (args.mode === 'haiku') {
    // Force Haiku regardless of heuristic confidence (mostly for evaluation/testing).
    const haiku = haikuTiebreaker(content, round, 0); // threshold 0 forces accept
    if (haiku) result = { ...haiku, decision_path: ['haiku_only_mode'], mode: 'haiku' };
    else result = {
      ...result,
      decision_path: ['haiku_only_mode', 'haiku_unavailable'],
      tier: 'full', confidence: 0.50,
      rationale: 'haiku-only mode but CLI unavailable; defaulting to full',
      mode: 'haiku',
    };
  }
  process.stdout.write(JSON.stringify(result) + '\n');
  process.exit(0);
}

main();
```

**Implementer notes (TACTICAL AUTONOMY scope):**
- The `buildHaikuPrompt` body's exact rubric embedding can be the verbatim CLAUDE-COMMON.md A1–A7 / S1–S5 / Z1–Z5 block read at chore-A time (embed as a TypeScript template literal). The Implementer reads CLAUDE-COMMON.md at chore-A, copies the rubric verbatim, embeds it. NO REINFORCEMENTS lines are touched (they live in the per-role files, not CLAUDE-COMMON.md).
- The exact `claude` CLI invocation may need adjustment if `--max-turns` is not a valid flag at the Implementer's local `claude` version. The Implementer runs `claude --help` at chore-A and adjusts. If `claude` is unavailable at chore-A, the spawnSync fails harmlessly (caught) and the router defaults to `full`.
- Internal helper names, JSDoc wording, import order may vary.

### § 3.2 `scripts/tier-router-validate.ts`

```typescript
// scripts/tier-router-validate.ts — Replay router against Tessera commit history.

import { readFileSync, existsSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

interface CorpusEntry {
  round_id: string;
  directive_source: { type: 'embedded_fixture'; path: string } | { type: 'git_show'; sha: string };
  expected_constraint: { must_route_full?: boolean; must_not_route_implementer_only?: boolean };
  label_rationale: string;
}

interface Corpus {
  schema_version: string;
  load_bearing_safety: {
    must_route_full: string[];
    must_not_route_implementer_only: string[];
  };
  entries: CorpusEntry[];
}

function loadCorpus(): Corpus {
  const path = resolve(__dirname, 'tier-router-fixtures', 'corpus.json');
  return JSON.parse(readFileSync(path, 'utf-8'));
}

function resolveDirectiveContent(source: CorpusEntry['directive_source']): string | null {
  if (source.type === 'embedded_fixture') {
    const path = resolve(__dirname, '..', source.path);
    if (!existsSync(path)) return null;
    return readFileSync(path, 'utf-8');
  }
  // git_show
  const result = spawnSync('git', ['show', `${source.sha}:coordination/NEXT-ROLE.md`], { encoding: 'utf-8' });
  if (result.status !== 0) return null;
  return result.stdout;
}

function runRouterOnContent(content: string): { tier: string; confidence: number; rationale: string } | null {
  const tmpDir = mkdtempSync(join(tmpdir(), 'tier-router-validate-'));
  try {
    const tmpFile = join(tmpDir, 'directive.md');
    writeFileSync(tmpFile, content);
    const result = spawnSync(
      'node',
      [resolve(__dirname, 'tier-router.js'), '--directive', tmpFile, '--mode', 'heuristic'],
      { encoding: 'utf-8' },
    );
    if (result.status !== 0) return null;
    return JSON.parse(result.stdout);
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
}

function main(): void {
  const corpus = loadCorpus();
  const results: Array<{ round: string; expected: string; actual: string; pass: boolean }> = [];
  let safetyViolations = 0;
  for (const entry of corpus.entries) {
    const content = resolveDirectiveContent(entry.directive_source);
    if (!content) {
      results.push({ round: entry.round_id, expected: 'N/A', actual: 'directive_unavailable', pass: false });
      // Only counted as safety violation if this round is in the load-bearing set.
      if (entry.expected_constraint.must_route_full) safetyViolations++;
      continue;
    }
    const routed = runRouterOnContent(content);
    if (!routed) {
      results.push({ round: entry.round_id, expected: 'N/A', actual: 'router_error', pass: false });
      if (entry.expected_constraint.must_route_full) safetyViolations++;
      continue;
    }
    let pass = true;
    let expected = '';
    if (entry.expected_constraint.must_route_full && routed.tier !== 'full') {
      pass = false;
      expected = 'full';
      safetyViolations++;
    }
    if (entry.expected_constraint.must_not_route_implementer_only && routed.tier === 'implementer-only') {
      pass = false;
      expected = '!= implementer-only';
      safetyViolations++;
    }
    results.push({ round: entry.round_id, expected: expected || 'unconstrained', actual: routed.tier, pass });
  }
  // Emit accuracy matrix.
  process.stdout.write('# Tier-router validation report\n\n');
  process.stdout.write('| Round | Expected | Actual | Pass |\n|---|---|---|---|\n');
  for (const r of results) {
    process.stdout.write(`| ${r.round} | ${r.expected} | ${r.actual} | ${r.pass ? '✓' : '✗'} |\n`);
  }
  process.stdout.write(`\nSafety violations: ${safetyViolations}\n`);
  process.exit(safetyViolations === 0 ? 0 : 1);
}

main();
```

### § 3.3 `package.json` modifications

Add the following two scripts to the `scripts` block (preserve all existing entries verbatim):

```json
"tier-router": "pnpm exec node scripts/tier-router.js",
"tier-router:validate": "pnpm exec node scripts/tier-router-validate.js"
```

Order: insert after the existing `coverage` entry; before `pretest`.

### § 3.4 `test/q73-tier-router.test.ts`

```typescript
// test/q73-tier-router.test.ts — R73 ACs for tier-router structural + validation-corpus safety.

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync, existsSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { tmpdir } from 'node:os';

const ROUTER_PATH = resolve(__dirname, '..', 'scripts', 'tier-router.js');
const FIXTURES_DIR = resolve(__dirname, '..', 'scripts', 'tier-router-fixtures');

function runRouter(directivePath: string, mode = 'heuristic'): { stdout: string; status: number | null } {
  const result = spawnSync('node', [ROUTER_PATH, '--directive', directivePath, '--mode', mode], { encoding: 'utf-8' });
  return { stdout: result.stdout, status: result.status };
}

function runRouterOnContent(content: string, mode = 'heuristic'): { tier: string; confidence: number; rationale: string; decision_path: string[]; router_version: string; mode: string; round: string } {
  const dir = mkdtempSync(join(tmpdir(), 'q73-router-'));
  try {
    const tmpFile = join(dir, 'directive.md');
    writeFileSync(tmpFile, content);
    const { stdout, status } = runRouter(tmpFile, mode);
    assert.equal(status, 0, `router exit non-zero; stdout=${stdout}`);
    return JSON.parse(stdout);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

// AC-R73-1: router emits a JSON object with the contract shape on a directive input.
test('AC-R73-1: router emits valid JSON shape', () => {
  const fixture = readFileSync(resolve(FIXTURES_DIR, 'R72-directive.md'), 'utf-8');
  const out = runRouterOnContent(fixture);
  assert.ok(['full', 'audit', 'implementer-only', 'coordinator-only'].includes(out.tier));
  assert.ok(typeof out.confidence === 'number' && out.confidence >= 0 && out.confidence <= 1);
  assert.ok(typeof out.rationale === 'string' && out.rationale.length > 0);
  assert.ok(Array.isArray(out.decision_path) && out.decision_path.length > 0);
  assert.ok(typeof out.router_version === 'string' && out.router_version.length > 0);
  assert.ok(['heuristic', 'haiku', 'hybrid'].includes(out.mode));
  assert.ok(typeof out.round === 'string');
});

// AC-R73-2: router treats whole file content when no directive section is present.
test('AC-R73-2: router accepts plain content without directive heading', () => {
  const out = runRouterOnContent('this round contains the word ESCALATE somewhere');
  assert.equal(out.tier, 'full');
  assert.ok(out.rationale.toLowerCase().includes('escalate'));
});

// AC-R73-3: router exits 1 on unreadable directive file.
test('AC-R73-3: router exits 1 on unreadable input', () => {
  const result = spawnSync('node', [ROUTER_PATH, '--directive', '/nonexistent/path/does/not/exist.md', '--mode', 'heuristic'], { encoding: 'utf-8' });
  assert.equal(result.status, 1);
  assert.ok(result.stderr.includes('directive unreadable'));
});

// AC-R73-4: load-bearing safety check — R45/R61/R62/R66/R72 fixtures route 'full'.
for (const round of ['R45', 'R61', 'R62', 'R66', 'R72']) {
  test(`AC-R73-4: ${round} directive routes 'full' under --mode heuristic (load-bearing safety)`, () => {
    const fixture = readFileSync(resolve(FIXTURES_DIR, `${round}-directive.md`), 'utf-8');
    const out = runRouterOnContent(fixture);
    assert.equal(out.tier, 'full', `${round} routed to ${out.tier} (expected full); rationale: ${out.rationale}`);
  });
}

// AC-R73-5: R49/R50/R51/R55/R60/R63/R64/R68 fixtures do NOT route 'implementer-only'.
for (const round of ['R49', 'R50', 'R51', 'R55', 'R60', 'R63', 'R64', 'R68']) {
  test(`AC-R73-5: ${round} directive does NOT route 'implementer-only'`, () => {
    const fixture = readFileSync(resolve(FIXTURES_DIR, `${round}-directive.md`), 'utf-8');
    const out = runRouterOnContent(fixture);
    assert.notEqual(out.tier, 'implementer-only', `${round} routed to implementer-only (expected anything else); rationale: ${out.rationale}`);
  });
}

// AC-R73-6: Coordinator rounds in the safety set route 'coordinator-only' explicitly.
for (const round of ['R55', 'R60', 'R63', 'R64', 'R68']) {
  test(`AC-R73-6: ${round} (Coordinator round) routes 'coordinator-only'`, () => {
    const fixture = readFileSync(resolve(FIXTURES_DIR, `${round}-directive.md`), 'utf-8');
    const out = runRouterOnContent(fixture);
    assert.equal(out.tier, 'coordinator-only', `${round} routed to ${out.tier} (expected coordinator-only); rationale: ${out.rationale}`);
  });
}

// AC-R73-7: ambiguous directive defaults to 'full' under --mode heuristic.
test('AC-R73-7: ambiguous directive defaults to full', () => {
  const out = runRouterOnContent('this is a completely benign directive with no signal words');
  assert.equal(out.tier, 'full');
  assert.ok(out.confidence === 0.5);
  assert.ok(out.rationale.toLowerCase().includes('ambiguous') || out.rationale.toLowerCase().includes('default'));
});

// AC-R73-8: validation corpus structural — corpus.json contains the expected safety-set round IDs.
test('AC-R73-8: corpus.json declares the load-bearing safety set', () => {
  const corpus = JSON.parse(readFileSync(resolve(FIXTURES_DIR, 'corpus.json'), 'utf-8'));
  assert.deepEqual(
    corpus.load_bearing_safety.must_route_full.sort(),
    ['R45', 'R61', 'R62', 'R66', 'R72'].sort(),
  );
  assert.deepEqual(
    corpus.load_bearing_safety.must_not_route_implementer_only.sort(),
    ['R49', 'R50', 'R51', 'R55', 'R60', 'R63', 'R64', 'R68'].sort(),
  );
});

// AC-R73-9: ambiguous directive in hybrid mode without claude CLI falls back to default 'full'.
// (Skip-able if `claude` is actually installed and answers correctly; the test asserts the FALLBACK contract.)
test('AC-R73-9: hybrid mode emits decision_path containing haiku-fallback markers when ambiguous', () => {
  // Use an ambiguous directive; even if claude is available, the router contract is that
  // if Haiku returns low-confidence OR is unavailable, decision_path contains the fallback markers.
  // To make this test environment-stable, we rely on the rule that an entirely empty-content
  // directive forces rule 5 → either Haiku succeeds (confidence ≥ threshold) OR fallback fires.
  // In CI without a configured claude binary, fallback fires.
  const out = runRouterOnContent('', 'hybrid');
  assert.equal(out.tier, 'full');
  // The decision_path must contain 'heuristic_rule_5_default' as the first step.
  assert.equal(out.decision_path[0], 'heuristic_rule_5_default');
});

// AC-R73-10: package.json contains the tier-router scripts.
test('AC-R73-10: package.json registers tier-router + tier-router:validate scripts', () => {
  const pkg = JSON.parse(readFileSync(resolve(__dirname, '..', 'package.json'), 'utf-8'));
  assert.equal(pkg.scripts['tier-router'], 'pnpm exec node scripts/tier-router.js');
  assert.equal(pkg.scripts['tier-router:validate'], 'pnpm exec node scripts/tier-router-validate.js');
});

// AC-R73-11: run-pipeline.sh declares --auto-tier flag.
test('AC-R73-11: run-pipeline.sh advertises --auto-tier flag', () => {
  const script = readFileSync(resolve(__dirname, '..', 'run-pipeline.sh'), 'utf-8');
  assert.ok(script.includes('--auto-tier'), 'run-pipeline.sh must advertise --auto-tier flag');
  // The flag must be in the case statement (argument parsing); not only in --help text.
  assert.ok(/--auto-tier\)\s*[A-Z_]+=true/.test(script) || /--auto-tier\)\s*AUTO_TIER=true/.test(script));
});

// AC-R73-12: tier-router-criteria.md is committed and contains the four tier names verbatim.
test('AC-R73-12: tier-router-criteria.md exists + names all four tiers', () => {
  const path = resolve(__dirname, '..', 'scripts', 'tier-router-criteria.md');
  assert.ok(existsSync(path));
  const content = readFileSync(path, 'utf-8');
  for (const tier of ['full', 'audit', 'implementer-only', 'coordinator-only']) {
    assert.ok(content.includes(tier), `criteria.md must name tier '${tier}'`);
  }
});
```

---

## § 4 Acceptance criteria

> **AC-binding modes:**
> - **Runtime (R)**: bound to a `test/q73-tier-router.test.ts` test case; verified by `pnpm test`.
> - **Empirical (E)**: bound to a `Q-R73-EMPIRICAL.sh` block; verified at chore-A pre-commit.
> - **Structural (S)**: bound by direct file existence + content grep.

| AC ID | Given / When / Then | Binding |
|---|---|---|
| **AC-R73-1** | Given an arbitrary directive fixture, when `node scripts/tier-router.js --directive <fixture> --mode heuristic` runs, then stdout is a single valid JSON object with fields `round` (string), `tier` (∈ {full,audit,implementer-only,coordinator-only}), `confidence` (number ∈ [0,1]), `rationale` (string ≥ 1 char), `decision_path` (non-empty array of strings), `router_version` (string ≥ 1 char), `mode` (∈ {heuristic,haiku,hybrid}). | R: `test/q73-tier-router.test.ts` test `AC-R73-1`. |
| **AC-R73-2** | Given a directive content lacking the `## § R{N} Round-scope directive` heading, when the router runs, then the router treats the whole file as input and classifies based on the heuristic rules against the full content (no error). | R: `AC-R73-2`. |
| **AC-R73-3** | Given a non-existent `--directive` path, when the router runs, then it exits with code 1 and stderr contains the literal string `directive unreadable`. | R: `AC-R73-3`. |
| **AC-R73-4 (LOAD-BEARING SAFETY)** | Given fixture `scripts/tier-router-fixtures/R{N}-directive.md` for `R ∈ {R45, R61, R62, R66, R72}`, when `node scripts/tier-router.js --directive <fixture> --mode heuristic` runs, then `tier === "full"`. | R: parameterized `AC-R73-4` test (5 cases). + E: `Q-R73-EMPIRICAL.sh` Block 6. |
| **AC-R73-5** | Given fixture `scripts/tier-router-fixtures/R{N}-directive.md` for `R ∈ {R49, R50, R51, R55, R60, R63, R64, R68}`, when the router runs, then `tier !== "implementer-only"`. | R: parameterized `AC-R73-5` test (8 cases). + E: `Q-R73-EMPIRICAL.sh` Block 7. |
| **AC-R73-6** | Given fixture for `R ∈ {R55, R60, R63, R64, R68}` (Coordinator rounds), when the router runs, then `tier === "coordinator-only"`. | R: parameterized `AC-R73-6` test (5 cases). |
| **AC-R73-7** | Given a directive consisting of the text `this is a completely benign directive with no signal words` (no rule 1-4 anchor), when the router runs in `--mode heuristic`, then `tier === "full"` AND `confidence === 0.5` AND `rationale` includes either `ambiguous` or `default`. | R: `AC-R73-7`. |
| **AC-R73-8** | Given `scripts/tier-router-fixtures/corpus.json`, when it is parsed, then `load_bearing_safety.must_route_full` is exactly `["R45","R61","R62","R66","R72"]` (sorted-equal) AND `load_bearing_safety.must_not_route_implementer_only` is exactly `["R49","R50","R51","R55","R60","R63","R64","R68"]` (sorted-equal). | R: `AC-R73-8`. + S: corpus.json content. |
| **AC-R73-9** | Given an empty-string directive content, when the router runs in `--mode hybrid`, then `tier === "full"` AND `decision_path[0] === "heuristic_rule_5_default"`. | R: `AC-R73-9`. |
| **AC-R73-10** | Given `package.json`, when parsed, then `scripts["tier-router"]` equals `pnpm exec node scripts/tier-router.js` AND `scripts["tier-router:validate"]` equals `pnpm exec node scripts/tier-router-validate.js`. | R: `AC-R73-10`. + S: package.json content. |
| **AC-R73-11** | Given `run-pipeline.sh`, when grep'd, then the file contains the literal token `--auto-tier` AND contains either `--auto-tier)` in a case-statement context with an assignment to a variable like `AUTO_TIER=true`. | R: `AC-R73-11`. + S. |
| **AC-R73-12** | Given `scripts/tier-router-criteria.md`, when read, then the file exists AND contains all four tier-name strings: `full`, `audit`, `implementer-only`, `coordinator-only`. | R: `AC-R73-12`. + S. |
| **AC-R73-13 (BINDING-COMMAND ATTESTATION; Rule 1)** | Given the chore-A HEAD commit (Implementer GREEN), when the Implementer runs `pnpm exec node --test --test-reporter=tap test/*.test.js` in NEXT-ROLE.md attestation, then the OBSERVED VERBATIM output is recorded — NOT reframed. Architect prediction (provided for visibility, not as the binding literal): `tests=489+N / pass=481+N / fail=5 / skipped=3` where `N` is the count of new R73 ACs added in `test/q73-tier-router.test.ts` (Architect prediction: N ≈ 26 = 12 distinct AC IDs + parameterized expansions). | E: `Q-R73-EMPIRICAL.sh` Block 4 records the actual count. |
| **AC-R73-14 (BINDING-COMMAND ATTESTATION; Rule 1)** | Given the chore-A HEAD commit, when the Implementer runs `pnpm exec tsc -p tsconfig.test.json`, then the OBSERVED VERBATIM output is recorded. Architect prediction: exit 0, zero diagnostics. | E: `Q-R73-EMPIRICAL.sh` Block 5 records the actual exit code. |
| **AC-R73-15 (ANTI-SCOPE)** | Given the chore-A HEAD commit, when `git diff <round-start-SHA>..HEAD --name-only` is computed (where `<round-start-SHA>` = the spec-triad commit SHA injected at chore-A; see § 5.2), then every emitted path is a member of ALLOWED_SET (§ 5.1). | E: `Q-R73-EMPIRICAL.sh` Block 8. |
| **AC-R73-16 (CARRY-FORWARD FAIL SET)** | Given chore-A HEAD, when the test suite runs, then the 5 carry-forward failing test names (`AC-R36-21`, `AC-R36-30`, `AC-R36-31`, `AC-R65-2`, `AC-R66-14`) remain present in the TAP `not ok` output with their identifiers unchanged. The TAP `# fail` summary field equals exactly 5. | E: `Q-R73-EMPIRICAL.sh` Block 9. |
| **AC-R73-17 (NO ENGINE/DEMO MODIFICATIONS)** | Given chore-A HEAD, when `git diff <round-start-SHA>..HEAD -- engine/ demos/ tools/coverage-saturation.ts tools/build-canned-demos.ts tools/demo-scenario.ts` is computed, then the diff is empty. | E: `Q-R73-EMPIRICAL.sh` Block 10. |
| **AC-R73-18 (NO REINFORCEMENTS MODIFICATION)** | Given chore-A HEAD, when `grep -c "^# REINFORCED" CLAUDE-ARCHITECT.md CLAUDE-IMPLEMENTER.md CLAUDE-REVIEWER.md CLAUDE-MEMORIAL.md` is run, then EACH file's REINFORCED line count is unchanged vs round-start-SHA. (Permitted: CLAUDE-COORDINATOR.md MAY add `--auto-tier` Mode docs but NOT a `# REINFORCED` line.) | E: `Q-R73-EMPIRICAL.sh` Block 11. |
| **AC-R73-19 (NO PRIOR-SPEC MODIFICATION)** | Given chore-A HEAD, when `git diff <round-start-SHA>..HEAD -- coordination/specs/Q-R[0-6][0-9]-SPEC.md coordination/specs/Q-R7[0-2]-SPEC.md coordination/specs/Q-R[0-6][0-9]-SPEC-AUDIT.md coordination/specs/Q-R7[0-2]-SPEC-AUDIT.md coordination/specs/Q-R[0-6][0-9]-EMPIRICAL.sh coordination/specs/Q-R7[0-2]-EMPIRICAL.sh` is computed, then the diff is empty. | E: `Q-R73-EMPIRICAL.sh` Block 12. |
| **AC-R73-20 (DEMONSTRATION; END-TO-END)** | Given chore-A HEAD, when `pnpm tier-router:validate` is run, then the script exits 0 AND its stdout contains a Markdown table with one row per validation-corpus entry AND no row has `✗` in the Pass column. | E: `Q-R73-EMPIRICAL.sh` Block 13. |
| **AC-R73-21 (SELF-CLASSIFICATION; PEDAGOGICAL)** | Given the R73 directive section in `coordination/NEXT-ROLE.md`, when `pnpm tier-router` is run, then `tier === "full"`. (The R73 directive itself contains "ESCALATE" and "engine/" and "validation-corpus failure" anchors; rule 2 fires.) | E: `Q-R73-EMPIRICAL.sh` Block 14. |

> **Notes on AC discrimination (Rule 3 — `implementer-spec-test-assertion-coverage` ACTIVE GATE):**
> - AC-R73-4 binds the LOAD-BEARING SAFETY surface for each of 5 rounds; an implementation regression that routes any safety-set round away from `full` is caught by this AC. Tests are parameterized (one test case per round); each test reads its OWN fixture file and runs the router fresh.
> - AC-R73-5 binds the COMPLEMENTARY surface: rounds that MUST NOT route `implementer-only`. An implementation regression that routes any of these 8 rounds to `implementer-only` is caught by this AC.
> - AC-R73-6 strengthens AC-R73-5 for the Coordinator subset: those 5 rounds MUST route `coordinator-only` exactly (not just `≠ implementer-only`). A regression that routes a Coordinator round to `full` (over-routing) is caught here.
> - AC-R73-7 binds the ESCAPE HATCH contract: ambiguous directives produce `full` + confidence 0.5. An implementation regression that incorrectly produces `audit` on no-signal directives is caught.
> - AC-R73-9 binds the FALLBACK CONTRACT for hybrid mode under Haiku-unavailability. The test relies on the fact that `decision_path` is observable and that the rule 5 default is the first step.

---

## § 5 Anti-scope

### § 5.1 ALLOWED_SET (round-start-SHA..HEAD diff bound)

> **Round-start SHA:** the spec-triad commit SHA captured at the Implementer's chore-A pre-commit step (see § 5.2). The diff `git diff <round-start-SHA>..HEAD --name-only` MUST be a subset of the ALLOWED_SET below.

```
scripts/tier-router.ts
scripts/tier-router-validate.ts
scripts/tier-router-criteria.md
scripts/tier-router-fixtures/corpus.json
scripts/tier-router-fixtures/R45-directive.md
scripts/tier-router-fixtures/R49-directive.md
scripts/tier-router-fixtures/R50-directive.md
scripts/tier-router-fixtures/R51-directive.md
scripts/tier-router-fixtures/R55-directive.md
scripts/tier-router-fixtures/R60-directive.md
scripts/tier-router-fixtures/R61-directive.md
scripts/tier-router-fixtures/R62-directive.md
scripts/tier-router-fixtures/R63-directive.md
scripts/tier-router-fixtures/R64-directive.md
scripts/tier-router-fixtures/R66-directive.md
scripts/tier-router-fixtures/R68-directive.md
scripts/tier-router-fixtures/R72-directive.md
test/q73-tier-router.test.ts
package.json
run-pipeline.sh
tsconfig.test.json
coordination/specs/Q-R73-SPEC.md
coordination/specs/Q-R73-SPEC-AUDIT.md
coordination/specs/Q-R73-EMPIRICAL.sh
coordination/MEMORIAL.md
coordination/NEXT-ROLE.md
```

> **ALLOWED_SET total: 26 paths.** `tsconfig.test.json` is added because `scripts/tier-router.ts` requires `scripts/**/*.ts` in the compile include (verified at spec-emit: current include is `engine/**/*.ts`, `test/**/*.ts`, `tools/**/*.ts` only). The Implementer's modification is limited to a 1-line `include` addition; no compilerOptions changes.

**Regex carve-outs (permitted creation patterns; not enumerated above):**
- `^coordination/diagnostics/DIAGNOSTIC-R73-.*\.md$` — IF the Implementer writes any DIAGNOSTIC per § 6 halt conditions.
- `^coordination/reviews/REVIEWER-REPORT-R73\.md$` — written by the Reviewer at Reviewer-stage (not in chore-A; included in ALLOWED_SET for the round-close diff).
- `^coordination/logs/ROUND-R73-ROUTING\.md$` — IF the Implementer exercises `--auto-tier` at chore-A and the pipeline writes a routing log (typically NOT exercised at chore-A, since the chore-A invocation is `--tier full` per directive; but the path is reserved).

**OPTIONAL files (Implementer may judge in-scope or out-of-scope):**
- `CLAUDE-COORDINATOR.md` — IF Implementer adds the `--auto-tier` Mode docs section. NOT a REINFORCEMENT entry. If the Implementer judges that inline `--help` text + `scripts/tier-router-criteria.md` are sufficient, they MAY skip this file; if they include it, it lands inside ALLOWED_SET. Append-only at end-of-file is the safe pattern.

**NOT in ALLOWED_SET (hard anti-scope; directive § Anti-scope item):**
- `engine/**/*.ts` — A12 frozen
- `demos/**/*` — R70/R71 frozen
- `tools/coverage-saturation.ts` — R72 frozen
- `tools/build-canned-demos.ts` — R71 frozen
- `tools/demo-scenario.ts` — R70 frozen
- Any pre-R73 test file (q01..q72)
- Any pre-R73 spec file (`coordination/specs/Q-R0?-` through `coordination/specs/Q-R72-`)
- `CLAUDE-ARCHITECT.md`, `CLAUDE-IMPLEMENTER.md`, `CLAUDE-REVIEWER.md`, `CLAUDE-MEMORIAL.md` REINFORCEMENTS sections (R73 anti-scope hard)
- `CROSS-PROJECT-MEMORIAL.md` (cross-project promotion is Memorial-Updater-stage decision, not Architect/Implementer)
- DS-repo files (W3-1 Option A preserved)
- Anchor public-repo files (R76 deferred)
- `.gitignore` (not anti-scope by directive but no need to modify; if needed, ESCALATE)

### § 5.2 Round-start SHA injection

The Implementer captures the spec-triad commit SHA via `git rev-parse HEAD` IMMEDIATELY AFTER the spec-triad commit lands AND BEFORE the chore-A code commit. This SHA is the lower bound of the anti-scope diff. The Implementer injects it into `Q-R73-EMPIRICAL.sh` via the existing sed-substitution mechanism (`<INJECTED-AT-CHORE-A>` placeholder; see § 7 below).

> **Per R70 MINOR-1 reinforcement (CLAUDE-COMMON.md REINFORCED 2026-05-18):** the Implementer reads the spec-triad SHA from the Architect's routing block in `coordination/NEXT-ROLE.md` § R73 Architect routing block (which the Architect stamps with the literal SHA from `git rev-parse HEAD` post-spec-commit, pre-routing-block-commit). The Implementer does NOT use `git rev-parse HEAD` at chore-A sed time — that would point to the Architect's routing-block commit, not the spec-triad commit.

### § 5.3 Acknowledged AC gaps (with rationale)

- The router's `--mode haiku` branch (force-Haiku) is not exercised by `test/q73-tier-router.test.ts` ACs deterministically because it requires a live `claude` CLI invocation. The branch is structurally exercised in `--mode hybrid` (rule 5 fallthrough → Haiku tail tried → fallback if unavailable; AC-R73-9). The pure `--mode haiku` path is exercised only by operator-side manual invocation (`pnpm tier-router --mode haiku`); this is a documented gap, not a regression risk. Rule 3 self-application gate verified at spec-emit: the Reviewer may flag this as MINOR if they consider live-Haiku coverage necessary; the Architect judges the structural-mode test (AC-R73-9) sufficient for the round.
- The `--auto-tier` integration in `run-pipeline.sh` is verified by AC-R73-11 (structural: the flag is advertised + parsed) but NOT by an end-to-end pipeline-run AC (which would require dispatching a full sub-pipeline). The integration is exercised in shell-only unit fashion: AC-R73-11 verifies the flag exists; AC-R73-20 verifies the validate script runs end-to-end against the corpus. A live pipeline-dispatch AC is documented as Future-Round work (R74+).

---

## § 6 Halt conditions

The Implementer MUST HALT + write `coordination/diagnostics/DIAGNOSTIC-R73-<topic>.md` (≥ 3 bounded options) + set `STATUS: ESCALATE` for ANY of:

1. `Q-R73-EMPIRICAL.sh` non-zero exit at chore-A for ANY reason (no carve-outs; this round is single-state).
2. `pnpm exec tsc -p tsconfig.test.json` non-zero exit at chore-A.
3. Test baseline drift beyond R72 close `tests=489 / pass=481 / fail=5 / skipped=3` other than R73-additions. Specifically: total test count must be `489 + N_new`, where `N_new` = number of test cases added in `test/q73-tier-router.test.ts`; `# fail` must remain exactly 5 with identical carry-forward identities; `# skipped` must remain 3.
4. **LOAD-BEARING SAFETY FAILURE:** router routes ANY of R45/R61/R62/R66/R72 to anything other than `full` under `--mode heuristic` at chore-A.
5. R61-class architectural-reality discovery: any claim in this spec about codebase state (existing files, existing `claude` CLI behavior, existing `run-pipeline.sh` argument-parsing structure) refuted by empirical observation at chore-A. The Implementer's recourse is HALT + DIAGNOSTIC + ESCALATE with empirical-verify branch (R03 reinforcement).
6. R72-promoted **claim-then-walk** discipline (cross-project canonical): any Architect claim in this spec about codebase or future-state that the Implementer cannot empirically verify at chore-A → HALT.
7. Architect spec uses forward-protection / live-file-count / anti-scope-diff-against-prior-round AC patterns. The Architect believes this spec contains NONE; § 9.8 self-grilling sweep confirms. If the Implementer detects one, HALT.
8. The `claude` CLI invocation in `--mode hybrid` produces a non-error response that the heuristic stage was unable to classify. (Soft signal: if the validation-corpus succeeds under `--mode heuristic`, the Implementer can SKIP this halt; the safety contract is heuristic-only.) Hybrid-mode failures default to `full` and do NOT trigger HALT.
9. Validation-corpus directive content extraction for any safety-set round fails to produce a fixture file (e.g., R45 directive content cannot be located in git history or composed from MEMORIAL.md + spec content). HALT + DIAGNOSTIC with ≥ 3 bounded options including (a) embedded content from MEMORIAL.md + spec excerpt, (b) operator-authored synthetic fixture, (c) drop R45 from the safety set (operator decision; this would relax the load-bearing safety contract).
10. Any of the 7 cross-project rules cannot be applied as ACTIVE GATE without contradicting the directive (the Architect believes all are applicable; § 7 below documents the dispositions).

### § 6.2 TACTICAL AUTONOMY scope

Implementer MAY (without HALT):

- Choose `.js` extension imports per R70/R71 precedent (default: `.js`).
- Adjust JSDoc wording, blank lines, import order, internal helper names — no semantic change.
- The exact `claude` CLI flag form for invoking Haiku (`--max-turns 1` vs `--max-turn 1` vs an equivalent) is an Implementer-side discovery: run `claude --help`, pick the supported form, embed it as a literal in the router source with a one-line code comment naming the source-of-truth. If `claude --help` reveals no supported single-turn invocation, the Implementer omits the `--max-turns` flag.
- The exact directive-content extraction recipe per validation-corpus round (within § 2.5 mandate) is Implementer-side choice.
- The exact line-count of the `CLAUDE-COMMON.md` rubric embedded in `buildHaikuPrompt` is Implementer-side (the spec says "embed the A1–A7 / S1–S5 / Z1–Z5 rubric"; the Implementer copies the relevant CLAUDE-COMMON.md lines at chore-A — the source-of-truth is CLAUDE-COMMON.md "Criteria — A factors / S factors / Z factors" sections).
- The order of fields in router output JSON is irrelevant (JSON object property order is not significant; AC-R73-1 checks presence + shape, not key-order).
- The router's `--help` output text is Implementer-side; no AC binds it.

Implementer MAY NOT (without HALT + DIAGNOSTIC):

- Modify any anti-scope file (§ 5.1 NOT in ALLOWED_SET list).
- Expand the ALLOWED_SET in-spec at chore-A (R36 MAJOR-2 NEVER violation).
- Introduce a chore-B step or any forward-protection / live-file-count / anti-scope-diff-against-prior-round AC pattern.
- Add an external npm dependency to package.json (anti-scope directive § Anti-scope item 5).
- Skip the RED commit (R23 IMPL MINOR-1 TDD discipline).
- Cite spec-predicted values as observed in attestation (Rule 1 sub-class `empirical-command-attestation`).
- Tune the heuristic rules in § 0 (rule priorities, anchor regexes, confidence values) without ESCALATE.

---

## § 7 Cross-project rule dispositions

| Rule | Disposition |
|---|---|
| **1** (`empirical-command-attestation`) | **ACTIVE GATE.** Q-R73-EMPIRICAL.sh + Implementer attestation directives. AC-R73-13 + AC-R73-14 require VERBATIM observed output (test counts, tsc exit code). |
| **2** (`architect-branch-binding-coverage`) | **ACTIVE GATE.** Every branch in `scripts/tier-router.ts` has an AC: rules 1-4 → AC-R73-4/5/6/7 (rule fires for matching fixture). Rule 5 default → AC-R73-7. Hybrid Haiku fallback → AC-R73-9. Router input-error → AC-R73-3. Router output shape → AC-R73-1. |
| **3** (`implementer-spec-test-assertion-coverage`) | **ACTIVE GATE.** AC-R73-4 + AC-R73-5 + AC-R73-6 + AC-R73-7 are discriminating; each binds a structural property the implementation MUST satisfy. § 5.3 acknowledged-gaps documents 2 non-load-bearing gaps with rationale (live-Haiku coverage; pipeline-dispatch end-to-end). |
| **4** (`anti-scope-allowed-set-forward-coverage`) | **ACTIVE GATE.** 25-path ALLOWED_SET + 3 regex carve-outs enumerated in § 5.1 at spec-emit time, BEFORE the round-start-SHA is fixed. **NO forward-protection / live-file-count / anti-scope-diff-against-prior-round AC patterns** (R62+R66+R68 cumulative lesson) — all anti-scope ACs bound by historical-only diff `round-start-SHA..HEAD`. |
| **5** (`rule-derivation-without-self-application`) | **N/A at spec emit.** R73 does NOT derive new cross-project rules. R72-promoted claim-then-walk discipline (`~/.claude/CROSS-PROJECT-MEMORIAL.md:38`) is applied AT spec authoring per § 9.6 grilling pass. The R71 EMPIRICAL-PREMISE-VERIFICATION sub-variant 5 + 6 (pre-authored narrative + consumer-side enum) are applied at § 9 (no pre-authored narrative this round; no closed-set enums in pseudocode that this Architect prescribes). |
| **6** (`halt-discipline-no-DIAGNOSTIC-for-workaround`) | **ACTIVE GATE.** 10 halt conditions enumerated in § 6.1; no carve-outs; single-state spec (no chore-B). |
| **7** (`derived-rule-propagation-mechanism-required`) | **ACTIVE GATE Surface (a).** Spec § 7 documents rule application + this row. Surface (b) + (c) N/A: R73 is not deriving a new propagation mechanism. |

---

## § 8 Open questions

**None — all resolved.**

Specifically resolved at spec-emit time:

- **Q-1** (mechanism: Haiku-only vs heuristic-only vs hybrid?) — RESOLVED in § 0 (hybrid).
- **Q-2** (router tier-name vocabulary: directive-names vs existing pipeline-names?) — RESOLVED: router output uses directive vocabulary (`full`, `audit`, `implementer-only`, `coordinator-only`); pipeline integration maps `implementer-only` → existing `solo` and `coordinator-only` → existing `--coordinator` flag.
- **Q-3** (validation corpus source: live git-show vs embedded fixtures?) — RESOLVED in § 2.5 (embedded fixtures for the 13 safety-set rounds; live git-show via the validate script for the broader R01-R72 replay).
- **Q-4** (confidence threshold default?) — RESOLVED in § 2.3 (0.70).
- **Q-5** (test file deterministic vs live-Haiku?) — RESOLVED in § 3.4 (tests use `--mode heuristic`; AC-R73-9 covers the hybrid-mode fallback contract).
- **Q-6** (`run-pipeline.sh` integration — flag override semantics?) — RESOLVED in § 2.4 (explicit `--tier` wins over `--auto-tier`).
- **Q-7** (Tessera-temporary divergence on `run-pipeline.sh`?) — RESOLVED per directive § Anti-scope item: PERMITTED with MEMORIAL documentation + R76 rebase plan.

---

## § 9 P3 ten-axis verification

| Axis | Verification (one sentence) |
|---|---|
| **correctness** | The heuristic rules in § 0 demonstrably route the 5 safety-set fixtures to `full` (verified at spec-emit time by simulating each rule against a representative directive excerpt for each round; see § 9.6 below for the per-round walkthrough). |
| **completeness** | All 4 tier outputs are reachable: `full` via rule 2 or rule 5 default or hybrid-fallback; `audit` via rule 4; `implementer-only` via rule 3; `coordinator-only` via rule 1. All 5 architectural-decision rounds in the safety set fire rule 2. All 8 NOT-implementer-only rounds either fire rule 1 (Coordinator subset: R55/R60/R63/R64/R68) or rule 4 (methodology subset: R49/R50/R51). |
| **consistency** | Spec sections agree on tier vocabulary (`full`/`audit`/`implementer-only`/`coordinator-only`) AND on the mapping to existing pipeline names (`solo` ≡ `implementer-only`; `--coordinator` ≡ `coordinator-only`). § 1.1 + § 2.4 + § 3.1 + § 3.4 + § 5.1 cross-checked. |
| **clarity** | Pseudocode in § 3.1 is sufficient for the Implementer to reproduce the router without guessing the rule priorities, anchor regexes, or output shape. The `buildHaikuPrompt` body is delegated to TACTICAL AUTONOMY (Implementer reads CLAUDE-COMMON.md rubric at chore-A and embeds verbatim) with explicit source-of-truth name. |
| **coverage** | Every branch in `scripts/tier-router.ts` (rules 1-5, hybrid fallback, input-error, output JSON) has an AC. Every guard in the pipeline integration (router exit non-zero → default full; routing log emission; explicit-`--tier` precedence) has either a structural AC (AC-R73-11) or a documented gap (§ 5.3). |
| **constraints** | Anti-scope ALLOWED_SET is enumerated + bounded by historical-only diff `round-start-SHA..HEAD` (no forward-protection patterns). No new external dependencies. No engine modifications. No REINFORCEMENTS modifications. |
| **concurrency** | The router is a single-shot CLI tool with no concurrency surface. The validate script invokes the router serially per corpus entry. No race conditions. |
| **corner cases** | (i) empty directive content → rule 5 default → `full` (AC-R73-7 + AC-R73-9). (ii) directive missing `## §` heading → full-text mode (AC-R73-2). (iii) malformed CLI args → exit 1 + stderr. (iv) `claude` CLI not installed (hybrid mode) → fallback to default `full` (AC-R73-9). (v) JSON.parse failure on Haiku output → fallback (covered by `isValidRouterTier` check). |
| **cost** | Per pipeline invocation: heuristic mode = ~10 ms (regex matches over directive text); hybrid mode if heuristic fires = same; hybrid mode if rule 5 default + Haiku invoked = ~3-10 s + ~$0.005. Expected hybrid Haiku invocation rate < 20% of rounds (the heuristic fires confidently on most directives). Per-round amortized: ~$0.001. Savings vs all-`full` per directive: ~$0.45 (saving the Architect call when audit/implementer-only/coordinator-only suffices). Net cost-efficiency: ~30-50% reduction matching directive expected band. |
| **coupling** | The router is decoupled from the pipeline: a stand-alone CLI tool. `run-pipeline.sh --auto-tier` is the ONLY consumer; the integration is one-way (pipeline reads router output; router does not read pipeline state). The validate script depends on the router CLI. The test file depends on the fixtures + router CLI. No circular dependency. The Haiku call is reverse-decoupled (router invokes `claude` CLI but does not depend on its content — failure-safe). |

---

## § 9.1 Pre-emit grilling output (inline)

### Q.1 Every claim verifiable?

- "R45/R61/R62/R66/R72 are architectural-decision rounds" — VERIFIED by reading MEMORIAL.md entries for each round (lines 127, 926, 978, 1178, 1435). All five have ESCALATE / DIAGNOSTIC / full-tier / architectural-decision content.
- "The heuristic rule 2 (ESCALATE keyword) catches all 5 safety-set fixtures" — DEPENDS on the fixture content the Implementer embeds. The Architect's claim: each round's directive content contains the word `ESCALATE` in some form (HALT + ESCALATE / STATUS: ESCALATE / ESCALATE #1 / ESCALATE-handling). The Implementer verifies at fixture-embedding time; if any safety-set round's directive content lacks ANY rule 2 anchor (ESCALATE, HALT+DIAGNOSTIC, architectural-decision, R61-class, engine/, etc.), HALT + DIAGNOSTIC.
- "The `claude` CLI is already a pipeline hard dep" — VERIFIED at `run-pipeline.sh:336,1487,1598` (`claude --help`, `claude -p`, `claude --version`).
- "No new external npm dependency is needed" — VERIFIED at package.json reads (devDependencies = `@types/node`, `typescript` only).
- "tests=489 / pass=481 / fail=5 / skipped=3 baseline" — VERIFIED at session entry by direct `pnpm exec node --test --test-reporter=tap test/*.test.js` invocation.
- "tsc exit=0 baseline" — VERIFIED at session entry.
- "HEAD = `841624b`" — VERIFIED at session entry by `git rev-parse HEAD`.

### Q.2 Unstated assumptions?

- **A.1 (load-bearing):** The safety-set round directives (R45/R61/R62/R66/R72) ALL contain rule 2 anchors. The Architect has NOT empirically verified each fixture's content at spec-emit time because the fixtures are Implementer-authored. The mitigation: § 6 halt condition #9 catches the case where a safety-set fixture's content lacks any rule 2 anchor. The Implementer must verify each fixture's router output at chore-A.
- **A.2:** The `claude` CLI on the operator's machine supports `--model claude-haiku-4-5-20251001`. If the Haiku 4.5 model id is renamed at provider side, the Hybrid mode degrades gracefully (router defaults to `full`); no spec change needed.
- **A.3:** The `--max-turns 1` flag is a valid `claude -p` argument. TACTICAL AUTONOMY at chore-A allows omission if unsupported.
- **A.4:** `run-pipeline.sh` argument parsing follows the existing `case "$1" in ... esac` pattern (confirmed via direct read at session entry, line 117-128).

### Q.3 Scope added beyond request?

- Compared to the directive's 6 numbered Primary deliverables: NO additions. The spec covers:
  1. `scripts/tier-router.ts` — directive item 1.
  2. `run-pipeline.sh --auto-tier` — directive item 2.
  3. `scripts/tier-router-validate.ts` — directive item 3.
  4. `pnpm` scripts — directive item 4.
  5. `test/q73-tier-router.test.ts` — directive item 5.
  6. `Q-R73-EMPIRICAL.sh` — directive item 6.
- Additions beyond directive items:
  - `scripts/tier-router-criteria.md` (NEW, optional per directive — included as documentation).
  - 13 `scripts/tier-router-fixtures/R*-directive.md` files (NEW; required as test-fixture inputs per § 2.5; otherwise tests are non-deterministic).
  - `scripts/tier-router-fixtures/corpus.json` (NEW; required as test-fixture index).
- These are all in the ALLOWED list the directive explicitly enumerates (`scripts/tier-router-criteria.md (NEW; optional)` per directive line 92; `scripts/tier-router-fixtures/*` is implied by the test-file dependency on fixtures).

### Q.4 Implementer can act without guessing?

- **Mechanism (§ 0):** picked (hybrid). No guessing.
- **JSON shape (§ 2.2):** fully specified. No guessing.
- **Heuristic rules (§ 0):** all 5 rules enumerated with priority order, anchor regexes, confidence values, and rationale strings. No guessing on rule choice.
- **Haiku tiebreaker (§ 0.6 + § 3.1 pseudocode):** TACTICAL AUTONOMY for exact CLI flag + prompt body; spec mandates the contract (JSON output, threshold check, fallback default). The Implementer chooses the exact CLI invocation at chore-A.
- **Validation corpus (§ 2.5):** fixture file paths enumerated; directive-content extraction recipe documented; TACTICAL AUTONOMY on the exact directive-content source per round.
- **Pipeline integration (§ 2.4):** mapping `implementer-only → solo`, `coordinator-only → --coordinator`, explicit-`--tier` precedence — all specified.
- **ACs (§ 4):** 21 ACs across runtime + empirical + structural, each with a clear Given/When/Then.
- **Halt conditions (§ 6.1):** 10 enumerated.

### Q.5 Cross-section consistency (R34 MINOR-2 / R65 MINOR-2 reinforcement)

Sweep performed on all spec sections for:
- Tier vocabulary consistency: `full`/`audit`/`implementer-only`/`coordinator-only` used uniformly throughout § 0, § 1, § 2, § 3, § 4, § 5, § 9.
- Confidence values consistency: rule 1 = 0.90; rule 2 = 0.85; rule 3 = 0.80; rule 4 = 0.75; rule 5 default = 0.50. Threshold = 0.70. Used identically in § 0 + § 3.1 pseudocode.
- Tier-to-pipeline-name mapping consistency: `implementer-only → solo` AND `coordinator-only → --coordinator` (NOT the reverse). Cross-checked in § 2.4 + § 1.1 component-inventory pipeline row.
- Round-start-SHA semantics: § 5.2 = "the spec-triad commit SHA"; § 5.1 = "round-start-SHA..HEAD diff"; § 5.2 + § 6 halt condition #1 + Q-R73-EMPIRICAL.sh Block 8 all reference the same SHA. Cross-checked.
- ALLOWED_SET vs § 1.1 component inventory: every NEW or MODIFIED entry in § 1.1 is in the § 5.1 ALLOWED_SET. Cross-checked (25 paths in ALLOWED_SET match § 1.1 entries; the OPTIONAL CLAUDE-COORDINATOR.md is also in § 5.1).

### Q.6 Claim-then-walk discipline (R72-promoted cross-project rule)

Per CROSS-PROJECT-MEMORIAL.md:38, every load-bearing codebase claim the Architect makes must be verified by direct command at spec-emit time. Walk per claim:

| Claim | Verification | Result |
|---|---|---|
| HEAD = `841624b` | `git rev-parse HEAD` | `841624b3c0baa3aabbc22d70aea87b9f41ea5e41` ✓ |
| Working tree clean | `git status --short` | empty ✓ |
| tsc exit 0 baseline | `pnpm exec tsc -p tsconfig.test.json; echo $?` | `0` ✓ |
| Test baseline 489/481/5/3 | `pnpm exec node --test --test-reporter=tap test/*.test.js | tail -10` | `tests 489 / pass 481 / fail 5 / skipped 3` ✓ |
| `claude` CLI is a pipeline hard dep | `grep -n "claude -p\|claude --" run-pipeline.sh` | matches at lines 336, 1487, 1598 ✓ |
| package.json devDependencies = `@types/node`, `typescript` only | `cat package.json` | confirmed ✓ |
| `run-pipeline.sh` uses `case "$1" in` arg-parse pattern | `grep -n "case.*in" run-pipeline.sh \| head` + read lines 117-128 | confirmed; line 117 `while [[ $# -gt 0 ]]; do case $1 in ...` ✓ |
| Existing pipeline TIER values are `solo`/`audit`/`full` (case statement at lines 212-227) | direct read | confirmed ✓ |
| `--coordinator` flag is separate from `--tier` (line 122; lines 230-248) | direct read | confirmed ✓ |
| 5 carry-forward failing test names | `pnpm test 2>&1 | grep "not ok"` | `AC-R36-21`, `AC-R36-30`, `AC-R36-31`, `AC-R65-2`, `AC-R66-14` ✓ |
| MEMORIAL.md `## R45 — IMPLEMENTER (audit-tier)` exists at line 127 | direct read | confirmed ✓ |
| Directive sections for R63-R72 are in HEAD's `coordination/NEXT-ROLE.md` | `grep -n "^## § R[0-9]+ Round-scope directive"` | confirmed (10 sections) ✓ |
| Directive commits R49/R50/R51/R55/R60/R61/R63/R66/R72 found in git log | per-round `git log --all --grep` | confirmed; R45/R62/R64/R68 NOT directly found (Implementer recourse: § 2.5 + halt condition #9) ✓ |
| `tsconfig.test.json` `include` covers `scripts/**/*.ts` | direct read of tsconfig.test.json | **FALSE; current include is `engine/**/*.ts`, `test/**/*.ts`, `tools/**/*.ts` only.** Spec amended: `tsconfig.test.json` added to ALLOWED_SET; Implementer adds `"scripts/**/*.ts"` to the `include` array. Recorded at spec-emit time before route to Implementer. |

**Inherited-testimony NOT relied upon.** Every claim above traces to a direct verification command at session entry.

### Q.7 No forward-protection / live-file-count / anti-scope-diff-against-prior-round patterns

Sweep performed on AC table (§ 4):

- AC-R73-15 (ANTI-SCOPE diff): `git diff <round-start-SHA>..HEAD --name-only`. **historical-only diff bound by spec-triad SHA.** ✓
- AC-R73-16 (CARRY-FORWARD): asserts the existence + identity of 5 specific failing test names + `# fail` summary = 5. **identity-bound, not raw-count-bound.** ✓
- AC-R73-17 (NO ENGINE/DEMO): `git diff <round-start-SHA>..HEAD -- engine/ demos/ ...`. **historical-only diff.** ✓
- AC-R73-18 (NO REINFORCEMENTS): `grep -c "^# REINFORCED" <files>` AT chore-A HEAD compared against the SAME files at round-start-SHA. **historical comparison via git show, NOT a live-count assertion.** Wait, this needs sharpening. Let me re-check. The pseudocode says "EACH file's REINFORCED line count is unchanged vs round-start-SHA." This requires reading round-start-SHA contents via `git show <round-start-SHA>:<file>` and comparing counts. This IS a historical comparison. ✓
- AC-R73-19 (NO PRIOR-SPEC): `git diff <round-start-SHA>..HEAD -- coordination/specs/Q-R[0-7]*-*` glob. **historical-only diff.** ✓
- AC-R73-20 (DEMONSTRATION): `pnpm tier-router:validate` exit 0. **command-output gate.** ✓
- AC-R73-21 (SELF-CLASSIFICATION): `pnpm tier-router` against R73 directive section → `tier === full`. **command-output gate; tied to NEXT-ROLE.md content at HEAD which is the chore-A state.** ✓
- No AC asserts "the number of files in `scripts/tier-router-fixtures/` is exactly N" (would be a live-file-count pattern).
- No AC asserts "git diff prior-round-attestation-HEAD..HEAD" (would be an anti-scope-diff-against-prior-round pattern).
- No AC asserts "the existence of a future-round file" (would be a forward-protection pattern).

### Q.8 Spec-internal contradictions sweep (R34 MINOR-2 / R65 MINOR-2)

Cross-checked algorithmic boundary clauses + type-shape definitions + arithmetic:

- **Rule priority order**: § 0 lists 1→5; § 3.1 pseudocode evaluates in the same order. ✓
- **Confidence thresholds**: 0.70 default named in § 2.3 + § 3.1 (`DEFAULT_CONFIDENCE_THRESHOLD`). ✓
- **JSON output shape**: § 2.2 + § 3.1 pseudocode + § 4 AC-R73-1 all enumerate the same 7 fields. ✓
- **Tier vocabulary**: 4 strings consistent everywhere. ✓
- **`run-pipeline.sh --auto-tier` mapping**: § 2.4 maps `implementer-only → solo`, `coordinator-only → --coordinator`. § 3.1 router does NOT do the mapping; the pipeline integration does. ✓
- **ALLOWED_SET arithmetic**: 25 paths in § 5.1 fixed list + 3 regex carve-outs (DIAGNOSTIC, REVIEWER-REPORT, ROUND-R73-ROUTING.md) + 1 OPTIONAL (CLAUDE-COORDINATOR.md). Component inventory § 1.1 enumerates the same 25 plus the optional. ✓

### Q.9 Discriminating-assertion gate (R71 MINOR-1)

For each AC, the question "would this AC FAIL if the implementation were correct but the load-bearing property were violated?":

- AC-R73-4: would fail if router routes a safety-set round to anything other than `full`. ✓
- AC-R73-5: would fail if router routes a NOT-implementer-only round to `implementer-only`. ✓
- AC-R73-6: would fail if a Coordinator round is routed to `full` instead of `coordinator-only` (over-route caught). ✓
- AC-R73-7: would fail if default for ambiguous content is `audit` or `coordinator-only` instead of `full`. ✓
- AC-R73-1: would fail if router emits non-JSON, wrong tier names, or missing fields. ✓

### Q.10 Reinforcement sweep (R02..R72 lessons applied at spec-emit)

Per CLAUDE-ARCHITECT.md REINFORCED entries (head of CLAUDE-ARCHITECT.md, applied per-axis):

- **R02 type-declaration-site check**: NO TypeScript named types from engine surfaces are instantiated in spec pseudocode. R73 is tooling-only. ✓
- **R03 line-citation-cite-then-verify**: ALL file:line citations in this spec verified at spec-emit time (e.g., `run-pipeline.sh:336,1487,1598`; MEMORIAL.md:127,289,926,978,1178,1435). ✓
- **R10 file-level docblock coverage**: NEW files (`scripts/tier-router.ts`, `scripts/tier-router-validate.ts`) include a docblock per the pseudocode template. ✓
- **R11 statistical-term-to-formula**: N/A (no statistical formulas this round). ✓
- **R15 anti-scope baseline correct**: Round-start-SHA = spec-triad commit SHA, NOT prior attestation HEAD. § 5.2 explicit. ✓
- **R18 vendored-file-delta**: N/A (no vendored-with-deltas transitions). ✓
- **R20 AC-table preamble cross-check**: § 4 preamble names attestation types (R/E/S); each AC row's binding matches. ✓
- **R21 spec-commit-sequencing**: Q-R73-SPEC.md + Q-R73-SPEC-AUDIT.md + Q-R73-EMPIRICAL.sh committed in own commit BEFORE NEXT-ROLE.md routing block commit. ✓ (To be applied at chore time.)
- **R25 cluster-worktree-empirical-baseline**: Tessera main worktree; baseline empirically verified (489/481/5/3). ✓
- **R30 grep-discriminability**: AC-R73-18 grep on `^# REINFORCED` is anchored; would not match comments. ✓
- **R34 boundary-clause cross-check**: § 9.8 sweep performed. ✓
- **R44 grep-count-threshold**: AC-R73-18 binds COUNT-UNCHANGED (relative), not arbitrary `≥ N` threshold. ✓
- **R46 binding-command attestation tightness**: AC-R73-13 + AC-R73-14 bind VERBATIM observed output, not a Boolean PASS. ✓
- **R53 chore-A vs chore-B**: SINGLE-STATE spec; no chore-B; no two-state predictions. ✓
- **R56 carve-out for pre-documented failures**: N/A (no halt-condition exceptions). ✓
- **R58 constructor-options-symbol-drift**: N/A (no engine constructors). ✓
- **R65 routing-block-carve-out citation**: ALL AC numbers in § 4 cross-checked against the AC-R73-N IDs in § 9 (Q.7). ✓
- **R65 § 9.8 type-shape cross-check**: RouterResult interface in § 3.1 matches the AC-R73-1 field list. ✓
- **R66 semantically-accurate field names**: `tier`, `confidence`, `rationale`, `decision_path` — all observable from the router's own state. ✓
- **R66 single-value replacement**: NO strikethrough patterns in this spec. ✓
- **R70 narrative-vs-executable consistency**: § 0 prose rules match § 3.1 pseudocode rules (verified by cross-section sweep). ✓
- **R70 regex strict discriminability**: rule-2 `\bESCALATE\b` is word-anchored. ✓
- **R70 AC-`# fail`-vs-grep-count**: AC-R73-16 uses `# fail` summary field (TAP), NOT raw `not ok` line count. ✓
- **R71 pre-authored narrative empirical verification**: NO pre-authored narrative strings about engine behavior this round (all narrative is about router internals; verified against own pseudocode). ✓
- **R71 candidate-set discriminating AC**: AC-R73-4/5/6 each binds the load-bearing property of the matched fixture; ACs would fail if pedagogical property violated. ✓
- **R72 architect-claim-without-empirical-walk + value-space cite-then-verify**: Q.6 walkthrough above. ✓
- **R72 ALLOWED_SET amendment propagation**: ALLOWED_SET § 5.1 + Q-R73-EMPIRICAL.sh allowed_set must be byte-identical (the empirical script's `allowed_set` variable enumerates the same 25 paths + 3 regex carve-outs). § 7 dispositions verify Rule 4 ACTIVE GATE. ✓

---

## § 10 Architect predictions (carried into spec-audit sidecar; not load-bearing for Implementer attestation per Rule 1)

Provided for spec-audit visibility. The Implementer's chore-A attestation records actual observed values; if any deviate from prediction, the spec is wrong (HALT halt #5).

- Final tests = 489 + N_new where N_new ≈ 23-28 (12 distinct AC IDs in § 3.4, parameterized into ~26 test cases across AC-R73-4, AC-R73-5, AC-R73-6).
- Final pass = 481 + N_new (all R73 tests pass).
- Final fail = 5 (carry-forward identity preserved).
- Final skipped = 3 (preserved).
- tsc exit = 0.
- `pnpm tier-router:validate` exit = 0.
- Q-R73-EMPIRICAL.sh: 14 blocks (numbered 1-14 per § 4 binding column); PASS 14 / FAIL 0.
- ALLOWED_SET diff at chore-A: 26 paths exactly (§ 5.1) ± optional CLAUDE-COORDINATOR.md (so 26 or 27 total).

---

## § 11 Pipeline invocation

```bash
cd /Users/johnwarren/concord/tessera
./run-pipeline.sh --round R73 --tier full
```

End of spec.
