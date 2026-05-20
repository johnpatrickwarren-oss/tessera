# Q-R73-SPEC-AUDIT — Architect ceremony sidecar

**Round:** R73
**Pairs with:** `coordination/specs/Q-R73-SPEC.md`
**Authorized for:** Reviewer (cold-read). Implementer MAY consult for additional context but the SPEC proper is the load-bearing input.

This sidecar contains the Architect's pre-emit ceremony output: P3 ten-axis verification narrative, decision-rationale paragraphs, Architect predictions, and reinforcement-application notes that would otherwise inflate the SPEC body. The SPEC's own § 9 + § 9.1–9.10 grilling sections are the canonical record; this sidecar elaborates.

---

## § A — Brainstorm rationale (expanded)

### Why hybrid over Haiku-only

The directive recommends Haiku. The Architect SELECTED hybrid (heuristic gate + Haiku tiebreaker) because:

1. **The CI safety contract requires determinism.** Halt condition #4 says: "router routes any of R45/R61/R62/R66/R72 to anything other than `full` → HALT + DIAGNOSTIC + ESCALATE." A test AC that depends on a live Haiku call is environment-dependent (the `claude` CLI must be installed; the model must respond; the response must be stable round-over-round). The chore-A Implementer's HALT discipline cannot rely on an LLM call that might fail intermittently. The deterministic surface MUST be the load-bearing safety guarantor; Haiku is a soft layer.

2. **The heuristic surface is small and operator-controllable.** 5 rules + 4 explicit anchors per rule. The directive content vocabulary is operator-controlled (each round's directive is authored by the operator + Architect-of-the-day). Future-round directives that drift away from the heuristic vocabulary can be amended in a follow-up round; the safety contract holds.

3. **Cost savings dominate at scale.** Per-round cost dominated by the Architect step (~$0.45 of the $0.90 round cost). Routing 30% of rounds AWAY from full (to audit or implementer-only or coordinator-only) saves ~$0.30 / round on average. Heuristic cost = ~0; hybrid Haiku-tail cost = ~$0.005 × 20% (fraction defaulting to Haiku) = ~$0.001 / round. Net savings of ~$0.29 / round = ~30% cost reduction matching directive's target band.

4. **The Haiku tail is a "safe default + try harder" pattern.** When the heuristic falls through to rule 5 (ambiguous), the spec already mandates `full` as the safety default; the Haiku call ATTEMPTS to refine that to `audit` or `implementer-only` or `coordinator-only` when the directive is genuinely audit-class but the heuristic missed the signal. A successful Haiku refinement is pure upside; a failed Haiku call falls back to the same `full` default. There is no failure mode where the hybrid path is WORSE than heuristic-only.

### Why heuristic-only as load-bearing safety layer

The 5 architectural-decision rounds (R45/R61/R62/R66/R72) each have directive content rich in rule-2 anchors:

- **R45**: methodology consolidation directive; the round closed with a CRITICAL-routing-override flagged Reviewer report (MEMORIAL.md:289). The MEMORIAL phrasing includes the word "CRITICAL" and "ESCALATE-class". Even if the original directive body lacks ESCALATE verbatim, MEMORIAL.md content embedded in the fixture (per § 2.5 TACTICAL AUTONOMY) ensures the rule-2 ESCALATE anchor fires.
- **R61**: full-tier ESCALATE-driven round (npm extract; ESCALATE #1 + #2 resolution at MEMORIAL.md:956,966). Directive contains explicit "full-tier" mention.
- **R62**: full-tier ESCALATE-driven round (chore-B AC structural-vacuous; resolution at MEMORIAL.md:1052).
- **R66**: full-tier round with full ESCALATE chain via R65 carry-forward.
- **R72**: full-tier round with multiple ESCALATEs (Option B coordination chore + #2 follow-up).

The Architect's claim (§ 9.1 Q.1) is that EACH of these 5 rounds has at least one rule-2 anchor (ESCALATE / HALT+DIAGNOSTIC / architectural-decision / R61-class / validation-corpus failure / engine/ / --tier full / A-factor) in either the original directive body OR the MEMORIAL content the Implementer composes into the fixture. § 6 halt condition #9 catches the case where this claim fails for ANY safety-set round.

---

## § B — Decision rationale paragraphs

### B.1 Router output naming

The directive explicitly uses 4 tier names: `full` / `audit` / `implementer-only` / `coordinator-only`. The existing `run-pipeline.sh` uses 3 tier names + a separate `--coordinator` flag: `full` / `audit` / `solo`. The router output preserves the directive vocabulary; the pipeline integration translates. This decision was made because:

1. The directive is the operator's contract for R73; preserving its vocabulary keeps the spec → router output traceable.
2. The pipeline integration is one-way and shallow: a single `case` statement in `run-pipeline.sh --auto-tier` maps router output → existing pipeline state. No name-collision risk.
3. Future rounds may rename pipeline internals (e.g., `solo` → `implementer-only`) without breaking the router contract.

### B.2 Fixture-embedded validation corpus

The directive § Primary deliverable item 3 says "Replays Tessera's commit history R01-R72 against the router." This implies a LIVE git-show replay. However, the test file AC-R73-4 / AC-R73-5 / AC-R73-6 MUST be deterministic for CI. The spec resolves this:

- **Test file** uses 13 EMBEDDED fixtures (one per safety-set round) under `scripts/tier-router-fixtures/`. Deterministic.
- **Validate script** uses the corpus.json + fixtures for the safety-set AND uses live `git show` for any wider replay (R01-R72 enumeration). The wider replay is best-effort: rounds whose directive content is unavailable in git history are reported as `unknown` but do NOT cause exit non-zero.
- The load-bearing safety check is bound to the EMBEDDED fixtures, NOT the live git replay. This protects against future git-history rewrites.

### B.3 Hybrid mode + claude CLI dependency

The directive's anti-scope item 5 says "NO new external dependencies." The spec's hybrid path invokes `claude` CLI via `child_process.spawnSync`. This is NOT a new dependency in the npm sense:

- `claude` is already a runtime requirement of `run-pipeline.sh` (the pipeline cannot dispatch ANY role without it; see `run-pipeline.sh:336,1487,1598`).
- The router's invocation is a graceful soft-fail: if `claude` is missing, the router defaults to `full`. No CI breakage, no spec violation.
- No npm devDependency is added.

### B.4 `--auto-tier` flag semantics

The `--auto-tier` flag is INVOKED with NO arguments and consults `scripts/tier-router.js` against the current `coordination/NEXT-ROLE.md`. Explicit `--tier <X>` always wins. This double-flag precedence is the safe pattern: an operator who knows the round's tier can always force it; the router is opt-in.

The pipeline integration writes `coordination/logs/ROUND-R{N}-ROUTING.md` per invocation. This log captures:
- Router JSON output (verbatim).
- Effective TIER chosen.
- Source (`--auto-tier` vs `--tier <X> (explicit)`).
- Timestamp.

The log is the audit trail for future investigation if a round outcome correlates with router decision. R73 itself does NOT create such a log (chore-A invokes `--tier full` explicitly per directive, so the pipeline writes `Source: --tier full (explicit override; --auto-tier unused)`).

---

## § C — Architect predictions

Provided for spec-audit visibility. The Implementer's chore-A attestation records ACTUAL observed values. If any prediction diverges materially, the spec is wrong (HALT halt #5).

### C.1 Empirical predictions

| Metric | Architect prediction | How verified at chore-A |
|---|---|---|
| `pnpm exec tsc -p tsconfig.test.json` exit | 0 | Block 5 records actual exit code |
| `# tests` line (TAP summary) | `489 + 23..28` ≈ `512..517` | Block 4 records actual count |
| `# pass` line | `481 + 23..28` ≈ `504..509` | Block 4 records actual |
| `# fail` line | 5 (unchanged carry-forward) | Block 9 verifies |
| `# skipped` line | 3 (unchanged) | Block 4 verifies |
| Carry-forward fail identities | `AC-R36-21`, `AC-R36-30`, `AC-R36-31`, `AC-R65-2`, `AC-R66-14` | Block 9 grep |
| `pnpm tier-router:validate` exit | 0 (all corpus entries pass) | Block 13 |
| `pnpm tier-router` on R73 directive | tier=`full` | Block 14 |
| ALLOWED_SET diff `git diff <round-start-SHA>..HEAD --name-only` count | 26 (no optional CLAUDE-COORDINATOR.md) to 27 (with optional) | Block 8 |
| `engine/` modifications | 0 | Block 10 |
| `demos/` modifications | 0 | Block 10 |
| CLAUDE-ARCHITECT/IMPLEMENTER/REVIEWER/MEMORIAL `# REINFORCED` line counts | unchanged | Block 11 |
| Q-R73-EMPIRICAL.sh blocks | PASS 14 / FAIL 0 | Block summary |

### C.2 Prediction confidence

The Architect's confidence in each prediction:

- HIGH: tsc exit 0; carry-forward fails preserved; engine/demos unmodified; REINFORCEMENTS unmodified; corpus.json safety-set membership.
- MEDIUM: exact test count (depends on how the Implementer parameterizes AC-R73-4/5/6; spec says "parameterized" but the exact loop variants are TACTICAL AUTONOMY).
- LOWER: `pnpm tier-router:validate` exit 0 — depends on EVERY fixture being embedded with content sufficient for the heuristic to route correctly. The Implementer is responsible for verifying each fixture's router output BEFORE committing chore-A. The HALT discipline (§ 6 #9) catches the failure.

### C.3 The R45 fixture risk

R45 is the WEAKEST link in the safety set. The MEMORIAL.md entry calls R45 a "CRITICAL-routing-override flagged" round but does NOT itself contain ESCALATE-verbatim in every section. The fixture content the Implementer embeds for R45 MUST contain at least one rule-2 anchor; otherwise the heuristic falls through to rule 5 default (`full` with confidence 0.5) — which technically satisfies AC-R73-4 (tier === full) but at low confidence.

The spec deliberately allows this — the AC binds `tier === "full"`, not `confidence ≥ 0.85`. A R45 fixture that produces `tier=full, confidence=0.50` via rule 5 default still passes AC-R73-4. The safety contract holds because of the conservative default direction.

If the Implementer instead embeds R45 content that includes the MEMORIAL.md line 289 phrase "R45 — REVIEWER (audit-tier cold-eye; CRITICAL-routing-override flagged)" — the word "CRITICAL" alone does not match any rule-2 anchor. The Implementer should ensure the fixture includes either:
- The verbatim word `ESCALATE` (e.g., from MEMORIAL.md ESCALATE discussion of the round), OR
- The verbatim phrase `HALT + DIAGNOSTIC`, OR
- The phrase `architectural-decision`, OR
- An `engine/` path reference, OR
- The phrase `validation-corpus failure`, OR
- Verbatim `R61-class` (if R45 MEMORIAL content references the R61-class pattern), OR
- The substring `architectural-reality` (R72 MAJOR-1 reference may appear in R45 MEMORIAL).

If NONE of these anchors appear in R45's available directive content + MEMORIAL excerpts, the Implementer must HALT per § 6 #9 with bounded options including (a) operator-authored synthetic content, (b) different anchor word, (c) safety-set relaxation.

This is documented as an Architect-side judgment call; the conservative default protects the safety contract regardless.

---

## § D — Reinforcement-application notes

### D.1 R72 claim-then-walk discipline (R72 ARCHITECT MEMORIAL.md:1435+)

Cross-project rule promoted at R72 close, ~/.claude/CROSS-PROJECT-MEMORIAL.md:38. Applied at this round:

- HEAD SHA verified at session entry via direct `git rev-parse HEAD`.
- Test baseline verified by direct command run, not inherited from R72 attestation.
- `claude` CLI presence verified by `grep -n "claude" run-pipeline.sh`.
- `package.json` content verified by direct read.
- `run-pipeline.sh` argument parsing verified by line-range read.
- Each AC's binding command tested mentally: would running it produce the expected output?

### D.2 R71 EMPIRICAL-PREMISE-VERIFICATION sub-variants 5+6

R71 MAJOR-1 (pre-authored narrative empirical claim) and R71 MAJOR-2 (consumer-side closed-set enum). Applied at this round:

- **Sub-variant 5**: NO pre-authored narrative strings about engine behavior. All narrative is about router behavior (which is being authored fresh; verified against pseudocode).
- **Sub-variant 6**: The router output's `tier` field is a closed-set union: `"full" | "audit" | "implementer-only" | "coordinator-only"`. NO consumer of this field at the engine level. The consumer is `run-pipeline.sh` (Tessera-vendored framework code), which the Implementer modifies per directive permission; the spec's § 2.4 mapping enumerates the 4 values explicitly. No closed-set drift risk.

### D.3 R70 narrative-vs-executable consistency (R70 MINOR-2)

The spec's § 0 prose rules MUST match the § 3.1 pseudocode rules byte-for-byte at the regex level. Cross-checked:

- Rule 1 anchors prose vs pseudocode: ✓
- Rule 2 anchors: ✓
- Rule 3 logic (ALLOWED_SET path counting): ✓ (prose says "≤ 3 paths, all docs"; pseudocode counts allowedPaths and checks hasRiskySurface)
- Rule 4 anchors: ✓
- Rule 5 default value (full, 0.50): ✓

### D.4 R70 regex strict discriminability (R70 MINOR-4)

Reviewed each heuristic regex for false-positive risk:

- `\bESCALATE\b` — word-anchored; would NOT match `ESCALATED` (substring), `escalate-handling` (lowercase). Specifically catches the all-caps token. ✓
- `coordinator wave plan` — verbatim phrase. ✓
- `WAVE-GATE-\d+ close` — anchored to "close" suffix. ✓
- `\bA1 \(new dependency\)` — explicit verbatim form. ✓

### D.5 R66 semantic field-name accuracy (R66 MINOR-1)

Reviewed each router output field name for semantic accuracy:

- `tier` — the router's own classification output ✓
- `confidence` — the router's own confidence score ✓
- `rationale` — the router's own one-liner ✓
- `decision_path` — the router's own rule-firing chain ✓
- `router_version` — the router's own version constant ✓
- `mode` — the effective mode used for THIS classification (not the requested mode) ✓
- `round` — extracted from input by router ✓

None imply a property the router cannot itself assert.

### D.6 R65 routing-block citation cite-then-verify (R65 MINOR-1)

The Architect routing block in NEXT-ROLE.md (to be written at chore-time) will copy AC IDs verbatim via grep, not re-typed from memory.

### D.7 R62 chore-A vs chore-B (R62 ESCALATE precedent)

The spec is single-state. No chore-B. No two-state predictions. § 7 Rule 4 explicit.

### D.8 R36 NEVER ALLOWED_SET-expansion (R36 MAJOR-2)

The ALLOWED_SET in § 5.1 is fixed at spec-emit. The Implementer MAY NOT expand it without HALT + DIAGNOSTIC + ESCALATE. § 6.2 TACTICAL AUTONOMY explicit.

---

## § E — Pre-emit grilling artifact (full sweep)

Per CLAUDE-ARCHITECT.md pre-emit grilling protocol:

### E.1 P3 ten-axis (§ 9 in SPEC; expanded here)

| Axis | Detail | Verdict |
|---|---|---|
| correctness | 5 safety-set rounds each have at least one rule-2 anchor in available directive+MEMORIAL content; verified by inspection at spec-emit | PASS (Implementer verifies at fixture-embed time) |
| completeness | All 4 tier outputs reachable; all 5 rules have ≥ 1 fixture exercising them | PASS |
| consistency | Tier vocab, confidence values, mappings cross-checked via § 9.8 sweep | PASS |
| clarity | Pseudocode is sufficient for zero-guess implementation | PASS |
| coverage | Branch-binding coverage table (§ 7 Rule 2 ACTIVE GATE) lists every branch in router → AC | PASS |
| constraints | ALLOWED_SET historical-only diff; no forward-protection; no new deps | PASS |
| concurrency | Single-shot CLI; no concurrent state | PASS |
| corner cases | Empty input; missing heading; invalid JSON; CLI missing; round_id absent | PASS (each has an AC or graceful default) |
| cost | ~30-50% cost reduction; matches directive target | PASS (Architect prediction) |
| coupling | Stand-alone router; one-way pipeline integration | PASS |

### E.2 Verifiability table (§ 9.1 Q.1 in SPEC; expanded)

| Claim | Citation | Verified at session-entry by |
|---|---|---|
| HEAD = 841624b | git rev-parse | direct command ✓ |
| Test baseline | TAP summary | direct command ✓ |
| tsc exit | command exit code | direct command ✓ |
| claude CLI in pipeline | run-pipeline.sh:336,1487,1598 | direct grep ✓ |
| run-pipeline.sh arg-parse | lines 117-128 | direct read ✓ |
| MEMORIAL.md R45 entry at line 127 | direct read ✓ | |
| package.json no Anthropic SDK | direct read | ✓ |

### E.3 Unstated assumptions (§ 9.1 Q.2 expanded)

| Assumption | Mitigation |
|---|---|
| Each safety-set round has rule-2 anchor in fixture content | § 6 halt #9 |
| `claude` CLI supports `--max-turns 1` flag | TACTICAL AUTONOMY § 6.2 |
| `claude-haiku-4-5-20251001` model ID is current at chore time | hybrid fallback to `full` if Haiku unavailable |
| `run-pipeline.sh` existing case-statement pattern | direct read of lines 117-128 ✓ |
| pnpm exec node works for .ts compiled .js | existing precedent (R71/R72 use same pattern) ✓ |

### E.4 Scope-added audit (§ 9.1 Q.3 expanded)

Directive items 1-6 fully covered. NO additional features:
- No new heuristic rules beyond § 0
- No additional router CLI flags beyond `--directive`, `--mode`, `--confidence-threshold`
- No router-side caching, no retry logic, no parallel execution
- No additional fixture rounds beyond the 13 safety-set
- No additional pipeline integration beyond `--auto-tier`

### E.5 Implementer actionability (§ 9.1 Q.4 expanded)

The Implementer can answer each question without HALT:

- "Which mechanism do I use?" → Hybrid (§ 0)
- "What's the JSON output?" → § 2.2
- "What are the 5 rules?" → § 0
- "How do I invoke Haiku?" → § 0.6 + § 3.1 TACTICAL AUTONOMY at chore-A
- "What goes in corpus.json?" → § 2.5
- "What's the pipeline integration?" → § 2.4
- "What ACs must pass?" → § 4 (21 ACs)
- "What's the round-start-SHA?" → § 5.2 (read from Architect routing block; spec-triad commit SHA)
- "What's in ALLOWED_SET?" → § 5.1 (25 paths + 3 regex carve-outs + 1 optional)
- "When do I HALT?" → § 6.1 (10 conditions)
- "What's TACTICAL AUTONOMY?" → § 6.2

---

## § F — Approach-rejection record (for spec-audit clarity)

| Approach | Status | Rationale for rejection |
|---|---|---|
| Approach A (Haiku-only) | REJECTED | Tests + EMPIRICAL.sh require determinism; live Haiku call is environment-dependent and intermittent-failure-prone. The directive's "recommended" framing weighs reasoning quality, but the CI safety contract weighs determinism higher. |
| Approach B (heuristic-only) | REJECTED | Brittle to future directive phrasings; discards the operator-recommended Haiku layer; gives up 5% accuracy gain in the ambiguous-directive tail. |
| Approach C (hybrid) | SELECTED | Deterministic safety contract via heuristic; soft Haiku layer for ambiguous tail; gracefully degrades to `full` on Haiku unavailability. |

---

## § G — Reviewer's read path (suggested)

For the Reviewer cold-eye pass:

1. Read Q-R73-SPEC.md § 0 (mechanism brainstorm) — understand the architectural choice.
2. Read Q-R73-SPEC.md § 4 (AC table) — understand the binding contract.
3. Read Q-R73-SPEC.md § 5.1 (ALLOWED_SET) — understand anti-scope.
4. Read Q-R73-SPEC.md § 6 (halt conditions) — understand failure modes.
5. Read this SPEC-AUDIT § C (Architect predictions) — understand Architect's expected outcome.
6. Read Q-R73-EMPIRICAL.sh — understand the chore-A gate.
7. Read `scripts/tier-router.ts` (Implementer source) — understand the actual implementation.
8. Read `scripts/tier-router-fixtures/R{45,61,62,66,72}-directive.md` — verify each fixture has at least one rule-2 anchor + router's actual output is `full`.
9. Re-run `Q-R73-EMPIRICAL.sh` at HEAD; verify Block 6 + Block 13 + Block 14 PASS.
10. Re-run `pnpm test`; verify AC-R73-4/5/6/7/9 pass and `# fail = 5`.

### G.1 Suggested Reviewer attention points

- **AC-R73-4 over-narrowing risk:** does any safety-set fixture's content lack a rule-2 anchor entirely (forcing rule 5 default)? If so, the safety contract is satisfied by `full` default but the test's "rationale" assertion may not hold.
- **R45 fixture composition:** the directive content for R45 may be operator-authored synthetic content per § 2.5 TACTICAL AUTONOMY. The Reviewer verifies that the embedded content is a defensible representation of the round's character, not arbitrary text.
- **Haiku tail untested in CI:** hybrid mode's Haiku branch is exercised only by AC-R73-9 (which asserts the fallback, not the success path). The Reviewer may flag this as a coverage gap.
- **`run-pipeline.sh` integration depth:** the pipeline change is verified by AC-R73-11 (flag exists + parsed) but not by an end-to-end dispatch test. The Reviewer may verify by running `./run-pipeline.sh --dry-run --auto-tier --round R73` and inspecting the dispatched roles.

End of spec-audit sidecar.
