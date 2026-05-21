# Q-R74-SPEC-AUDIT — Architect ceremony sidecar

**Round:** R74
**Tier:** full
**Round-start SHA:** `0a81fa93f148c1a69cb5222c42aacbc54eeb6bf9`
**Spec proper:** `coordination/specs/Q-R74-SPEC.md` (the load-bearing Implementer input)
**Pre-emit grilling:** inline in `Q-R74-SPEC.md § 9.1` (Q.1–Q.10).

This sidecar carries Architect ceremony content that the Implementer does NOT need to read: P3 ten-axis verification deep-dive, brainstorm rejected-approach rationale, Architect predictions, decision rationale per Q-N. Reviewer is authorized to read both files.

---

## A. P3 ten-axis verification (mirrors spec § 9; this expansion is for the Reviewer's cold-eye audit)

Each axis was evaluated against the spec proper before routing. The spec contains the one-sentence verdicts in § 9; this section captures the underlying reasoning so the Reviewer can audit the verdict against the source mechanism.

### A.1 correctness

The four-branch decision tree (tier_no_mu, operator_override, marker_match, default_haiku) was derived from the directive's two-condition Sonnet-fallback rule:

> "Sonnet fallback when `--mu-sonnet` flag set OR tier-router output is `full` AND directive contains markers indicating cross-round-pattern memorial work"

Decomposition:
- Condition (i) — `--mu-sonnet`: operator override branch.
- Condition (ii) — `tier=full AND marker`: the marker_match branch (anchor check ONLY on full-tier).
- Implicit (iii) — no MU role at all on solo/coordinator-only: tier_no_mu branch (a structural prerequisite the directive doesn't explicitly state but is required by existing run-pipeline.sh role-list semantics at lines 244-250).
- Default: Haiku.

Each AC binds a unique combination of (tier, mu_sonnet, anchor-class) → expected model. The branch-binding coverage gate (Rule 2) sweeps all branches.

### A.2 completeness

All four model outcomes are reachable + bound:
- `n/a` ← AC-R74-10 (solo) + AC-R74-11 (coordinator-only).
- `claude-sonnet-4-6` ← AC-R74-5/6/7/8 (one per anchor class), AC-R74-12/13 (operator override on audit + full).
- `claude-haiku-4-5-20251001` ← AC-R74-4 (full-tier no anchor), AC-R74-9 (audit-tier no anchor).

The combinatorial space is (tier ∈ {full, audit, solo, coord-only}) × (mu_sonnet ∈ {true, false}) × (anchor-class ∈ {none, A, B, C, D, multiple}). Not every cell needs an AC; the decision tree's branch structure means many cells are equivalent. The 13 ACs covering the model-decision branches sweep every distinct branch outcome.

### A.3 consistency

Cross-section sweep (spec § 9.1 Q.5):
- Model literal strings: 100% consistent.
- Decision_path string values: 6 distinct strings, used identically in § 2.4 + § 3.1 + § 3.4 + § 4.
- Anchor class labels (A/B/C/D): consistent across § 0 + § 2.3 + § 2.4 + § 3.1 + § 3.4 fixtures + § 4 ACs.
- ALLOWED_SET path count: § 1.1 component inventory + § 5.1 enumeration + § 7 Rule 4 disposition all reference 17 paths.

The R72 ALLOWED_SET-amendment-propagation reinforcement (CROSS-PROJECT-MEMORIAL.md MAJOR-2 → cross-project canonical) was applied: ALLOWED_SET appears at three surfaces — spec § 5.1 enumeration, spec § 1.1 component inventory, EMPIRICAL.sh Block 12 hard-coded list — all enumerating the SAME 17 paths.

### A.4 clarity

The spec is Implementer-actionable: § 3.1 contains the full TypeScript pseudocode for `scripts/mu-model-select.ts` including imports, function signatures, the four-branch dispatcher, regex set, and JSON serialization. § 2.5 contains five concrete bash code blocks (a–e) directly applicable to run-pipeline.sh. § 2.6 contains the literal CLAUDE-REVIEWER.md insertion text. § 3.3 documents fixture content (Implementer composes within anchor-semantic constraint).

TACTICAL AUTONOMY scope (§ 6.2) explicitly enumerates Implementer judgment surfaces (JSDoc wording, internal helper names, fixture content composition, bash variable naming if collision). No design decisions are deferred to the Implementer.

### A.5 coverage

Every branch in `scripts/mu-model-select.ts`:
- `tier === 'solo' || tier === 'coordinator-only'` → AC-R74-10/11
- `muSonnet === true` → AC-R74-12/13
- `tier === 'full' && anchor matches class A` → AC-R74-5
- `tier === 'full' && anchor matches class B` → AC-R74-6
- `tier === 'full' && anchor matches class C` → AC-R74-7
- `tier === 'full' && anchor matches class D` → AC-R74-8
- default (no branch fires) → AC-R74-4 (full no anchor) + AC-R74-9 (audit no anchor)
- input error paths (missing --tier, bad --directive) → AC-R74-2/3

Every bash-side integration token:
- `--mu-sonnet` flag → AC-R74-14
- `--reviewer-scope` flag → AC-R74-15
- selector invocation → AC-R74-16
- model constants → AC-R74-17

Every CLAUDE-REVIEWER.md addition element:
- heading exists → AC-R74-18
- body names the 3 checks → AC-R74-19
- REINFORCED count guard → AC-R74-20

Acknowledged gaps (§ 5.3): end-to-end pipeline-dispatch + build_reviewer_prompt heredoc content — documented with rationale.

### A.6 constraints

The 7 cross-project rules dispositioned in spec § 7:
- Rule 1 (`empirical-command-attestation`): ACTIVE GATE — AC-R74-23/24 + EMPIRICAL.sh Blocks 3/4.
- Rule 2 (`architect-branch-binding-coverage`): ACTIVE GATE — every branch bound.
- Rule 3 (`implementer-spec-test-assertion-coverage`): ACTIVE GATE — discriminating ACs.
- Rule 4 (`anti-scope-allowed-set-forward-coverage`): ACTIVE GATE — 17-path ALLOWED_SET + historical-only diff.
- Rule 5 (`rule-derivation-without-self-application`): N/A — R74 derives no new cross-project rule.
- Rule 6 (`halt-discipline-no-DIAGNOSTIC-for-workaround`): ACTIVE GATE — 10 halt conditions.
- Rule 7 (`derived-rule-propagation-mechanism-required`): ACTIVE GATE Surface (a).

Anti-scope hard limits enforced via ALLOWED_SET enumeration + 5 explicit "NOT in ALLOWED_SET" categories (engine/**, demos/**, tools/coverage-saturation.ts, scripts/tier-router*, pre-R74 tests/specs, REINFORCEMENTS sections, CROSS-PROJECT-MEMORIAL.md).

### A.7 concurrency

`scripts/mu-model-select.ts` is a single-shot CLI tool. Bash invocation is serial. No race conditions.

### A.8 corner cases

- Missing `--tier` → exit 1 (AC-R74-2).
- Unreadable directive → exit 1 (AC-R74-3).
- Directive missing `## § R{N} Round-scope directive` heading → whole-file fallback (same as tier-router pattern; spec inherits this from R73 selector mechanism; no AC needed because anchor regexes are content-pattern-matches independent of section structure).
- `scripts/mu-model-select.js` not compiled → bash falls back to default Haiku + `log_warn` (§ 1.3 + § 2.5 (c) fallback branch).
- Invalid `--reviewer-scope` value → bash exits 1 with clear error (§ 2.5 (c)).
- Operator passes BOTH `--mu-sonnet` AND no marker → operator override wins (AC-R74-12/13).
- Class C requires CO-OCCURRENCE of Reviewer-2 AND ESCALATE; single-token presence does NOT fire Class C (verified in § 3.1 pseudocode).
- Class D requires CO-OCCURRENCE of operator-resolution AND Option [A-F]; single-token presence does NOT fire Class D.

### A.9 cost

Per-pipeline overhead:
- mu-model-select.js execution: ~10 ms regex scan + ~50 ms bash spawn overhead = ~60 ms per round.
- Routing-log emission: ~10 ms file write.
- Total: ~70 ms per round.

Cost savings (~3× cost reduction per Haiku-routed MU session per directive):
- Sonnet MU session cost ≈ $0.20 (per pipeline observation history).
- Haiku MU session cost ≈ $0.07 (3× cheaper).
- Savings per Haiku-routed MU: ≈ $0.13.
- Routing rate prediction: ~70% of full-tier rounds default to Haiku (rounds without cross-round derivation work); ~30% trigger Sonnet via anchor or `--mu-sonnet`.
- Per-round average savings: 0.7 × $0.13 = $0.09.
- Aggregate over 70 rounds/phase: ~$6.30/phase from MU model selection.

Reviewer scope structural-mode (audit-tier default) reduces prompt token count by ~30% on audit-tier rounds; cost reduction ~$0.30/audit-tier round.

### A.10 coupling

The selector is decoupled from the pipeline (same pattern as R73 tier-router). One-way data flow: pipeline reads selector output; selector does NOT read pipeline state. Fixture files are read by both selector (runtime test invocation) and corpus AC (AC-R74-22). CLAUDE-REVIEWER.md Mode docs section is read at Reviewer-stage system-prompt assembly via `--append-system-prompt` (existing mechanism at run-pipeline.sh:1543).

No circular dependencies. No load-bearing coupling to engine or demos surfaces.

---

## B. Brainstorm — rejected approaches (deep rationale)

### Rejected: Approach A — Memorial-output-volume markers (narrow)

**Pattern proposed:** Sonnet fires only when directive mentions `MU batch`, `Memorial-Updater for R\d+-R\d+`, `cross-project promotion`, `Rule 5 threshold`, `3-instance threshold`.

**Why rejected:**

- **Misses ESCALATE-fix-cycle rounds.** R72 contained TWO ESCALATE cycles (first ESCALATE Option B → second Reviewer-2 catching incomplete amendment). The R72 directive does NOT contain "MU batch" or "cross-project promotion" anchors; it's a single round with substantive multi-Reviewer cross-correction work. Approach A would route R72 MU to Haiku — a Sonnet-quality-loss on cross-project-rule derivation that R72 actually performed (the R72 incident IS where the Architect-claim-without-empirical-walk rule crossed Rule 5 threshold and became cross-project canonical).
- **Misses operator-resolution rounds.** R61 + R62 + R66 all had Option-B/Option-F operator-resolution cycles WITHOUT mentioning "cross-project promotion" in the directive prose. These rounds genuinely needed Sonnet for the MU work of disentangling correction-cycle memorial entries.

Approach A trades coverage for over-saturated false-negatives. The 3× cost savings are only realized when MU's structural decisions are simple; Approach A's narrow markers miss rounds where the directive doesn't telegraph the upcoming cross-correction.

### Rejected: Approach B — Round-content-complexity markers (broad)

**Pattern proposed:** Sonnet fires on any ESCALATE-class anchor (`ESCALATE`, `CRITICAL`, `Reviewer-2`, `operator-resolution`, `Option [A-F]`, `fix cycle`).

**Why rejected:**

- **Over-triggers.** Most full-tier rounds contain `ESCALATE` somewhere in the directive — the directive's halt-condition section commonly says "STATUS: ESCALATE" or "HALT + DIAGNOSTIC". Approach B would route most full-tier rounds to Sonnet, defeating the directive's "~3× cost reduction" target band.
- **Doesn't discriminate.** A round whose directive merely warns "if X happens, HALT + ESCALATE" (preventative phrasing) is NOT a round that actually escalates. Sonnet fires on the warning, but the MU work is routine. The directive language and the actual round complexity decouple at warning-vs-actual-occurrence semantics.

Approach B preserves safety (Sonnet covers all complex MU work) but at unbounded cost. Phase 4 SLICE 1's mandate is cost-efficiency; Approach B fails the mandate.

### Selected: Approach C — Hybrid (four narrow anchor classes)

The four classes were calibrated against Tessera's actual round history:

| Round | Class A | Class B | Class C | Class D | Approach C verdict | Approach C right? |
|---|---|---|---|---|---|---|
| R72 (CRITICAL chain) | NO | NO | YES (Reviewer-2 + ESCALATE present) | YES (operator-resolution + Option B/F) | SONNET | Yes — substantive cross-correction work, Sonnet needed |
| R66 (handoff doc claim-walk) | NO | NO | NO | YES (operator-resolution + Option A) | SONNET | Yes — Coordinator-claim-without-empirical-walk derivation work |
| R46 (Rule 1 sub-class derivation) | YES (cross-project canonical) | NO | NO | NO | SONNET | Yes — derived empirical-command-attestation sub-class |
| R45 (overnight chain close) | NO | YES (MU batch R42-R45) | NO | NO | SONNET | Yes — multi-round catch-up MU |
| R67-R71 (routine single-Reviewer full-tier rounds) | NO | NO | NO | NO | HAIKU | Yes — routine MU work |
| R73 (substantive feature; single Reviewer pass; no operator escalation) | NO | NO | NO | NO | HAIKU | Yes — routine MU work despite full-tier substantive feature |

The calibration shows Approach C correctly routes the rounds that MATERIALLY needed Sonnet (R46, R66, R72) AND saves cost on rounds that didn't (R67-R71, R73).

**Risk acknowledged:** the anchor set may be incomplete; future rounds with novel directive phrasings might fail to trigger. Mitigation: `--mu-sonnet` flag is operator override; the operator can always force Sonnet when judgment suggests it. The Memorial-Updater itself, if it observes that important pattern derivation was missed by a Haiku MU run, can flag for R75+ anchor-set expansion (cross-project rule derivation would land in CLAUDE-MEMORIAL.md REINFORCEMENTS).

---

## C. Architect predictions (mirrors spec § 10; provided for spec-audit visibility)

Predictions for the Implementer's chore-A attestation. Per Rule 1 (`empirical-command-attestation`) the Implementer records ACTUAL observed values; the predictions below are visibility-only.

| Metric | Predicted | Source |
|---|---|---|
| N_new R74 test cases | 22 | Count of `test('AC-R74-N: ...', ...)` lines in § 3.4 pseudocode |
| Final tests | 538 | 516 baseline + 22 R74 |
| Final pass | 530 | 508 baseline + 22 R74 |
| Final fail | 5 | Carry-forward identity preserved |
| Final skipped | 3 | Preserved |
| tsc exit | 0 | Type-correct pseudocode in § 3.1 |
| `pnpm tier-router:validate` exit | 0 | R73 anti-regression |
| Q-R74-EMPIRICAL.sh | PASS 17 / FAIL 0 | All 17 blocks designed to pass at chore-A |
| AC-R74-31 self-classification model | `claude-haiku-4-5-20251001` | R74 directive section contains NO Class A/B/C/D anchor per Q.6 manual walk |
| ALLOWED_SET diff size | 17 paths exactly | § 5.1; plus possibly +1 for ROUND-R74-ROUTING.md regex carve-out |

If any Implementer-observed value deviates from prediction, halt condition #5 fires (R61-class architectural-reality discovery) and DIAGNOSTIC is required.

---

## D. Decision rationale per resolved question (mirrors spec § 8)

### Q-1: Marker set — Approach A vs B vs C?

**Resolution:** Approach C (hybrid; four narrow anchor classes).

**Why-picked:** balances cost-savings goal (most full-tier rounds default Haiku) with quality preservation (substantive cross-correction rounds trigger Sonnet). Calibrated against Tessera commit history showing Approach C correctly routes R46/R66/R72 (substantive) to Sonnet AND R67-R71/R73 (routine) to Haiku.

**Why-rejected (A):** too narrow; misses ESCALATE-fix-cycle rounds where MU does cross-correction synthesis.

**Why-rejected (B):** too broad; over-triggers on preventative-phrasing ESCALATE mentions; defeats Phase 4 SLICE 1 cost-efficiency mandate.

### Q-2: Anchor activation on audit-tier?

**Resolution:** Anchor check ONLY on full-tier; audit defaults to Haiku unless `--mu-sonnet`.

**Why:** MU work on audit-tier rounds is structurally lighter (one less role's findings to digest; no Architect-spec audit). Haiku covers it. Operator override via `--mu-sonnet` is the escape hatch for atypical audit-tier rounds (e.g., audit-tier round that surfaces a major incident).

### Q-3: Selector mechanism — inline bash vs TypeScript CLI?

**Resolution:** TypeScript CLI at `scripts/mu-model-select.ts`.

**Why-picked:** (i) testability — deterministic tests against CLI JSON (same pattern as R73 tier-router); (ii) consistency with R73 tier-router architecture; (iii) keeps run-pipeline.sh changes minimal (one node invocation).

**Why-rejected (inline bash):** marker detection in bash regex is harder to test deterministically; bash unit tests are awkward; static-grep verification is the only alternative to dry-run dispatch — weaker discriminability than a TypeScript test.

### Q-4: Reviewer-scope flag value-space?

**Resolution:** `full|structural` only.

**Why:** the directive's two-mode framing (full-adversarial vs structural-only) maps to two values. No third mode needed at R74; future R75+ could extend (e.g., a "spec-only" mode that audits the Architect's spec without re-running binding commands) but that's out of R74 scope.

### Q-5: CLAUDE-REVIEWER.md Mode docs placement?

**Resolution:** between role-boundary block and REINFORCEMENTS divider (current line 43); NOT a REINFORCED entry.

**Why:** the directive specifies "## Mode: Structural-only Reviewer section (Mode docs; NOT REINFORCED)" — explicit instruction. Placement before the REINFORCEMENTS divider preserves the REINFORCEMENTS section's append-only semantics + keeps the Mode docs in the main role-discipline body.

### Q-6: Routing-log schema?

**Resolution:** three Markdown sections — `## Tier`, `## MU model`, `## Reviewer scope`.

**Why:** the directive specifies "MU model selected; Reviewer scope; Sonnet-fallback rationale" as the new fields. Markdown sections (rather than flat JSON) are operator-readable and grep-friendly. The R73 routing log shape (bare JSON) was a precursor; R74 extends and standardizes.

### Q-7: Tessera-temporary divergence on run-pipeline.sh?

**Resolution:** same R73 divergence pattern; same R76 rebase plan.

**Why:** the directive § Anti-scope item explicitly permits `run-pipeline.sh` modifications: "MODIFICATIONS PERMITTED: `run-pipeline.sh` (continued Tessera-temporary-divergence)".

### Q-8: AC-R74-31 self-classification predicted model?

**Resolution:** TACTICAL AUTONOMY — Implementer empirically verifies at chore-A.

**Why:** the R74 directive section in HEAD's NEXT-ROLE.md is itself a directive whose anchor presence is empirically determinable. The Architect's mental walk (Q.6 in spec § 9.1) suggests no anchor fires → default_haiku — but the AC binds the EMPIRICAL output, not the prediction. Implementer records the observed value verbatim per Rule 1.

---

## E. Pre-emit grilling result

All 10 grilling questions in spec § 9.1 (Q.1–Q.10) PASS. Specifically:
- Every claim verifiable (Q.1): 13 codebase claims walked + verified at session entry; baseline empirically captured; line citations cross-checked.
- Unstated assumptions enumerated (Q.2): 4 listed; all are non-load-bearing or have documented mitigation.
- No scope creep (Q.3): 6 directive-named items + 3 mechanical fixture-required additions; no other.
- Implementer can act without guessing (Q.4): mechanism picked, contracts specified, regexes enumerated, ACs enumerated.
- Cross-section consistency clean (Q.5): tier vocab + model literals + anchor labels + ALLOWED_SET count cross-checked.
- Claim-then-walk discipline applied (Q.6): every codebase claim verified by direct command (R72-promoted cross-project rule).
- No forward-protection / live-file-count / anti-scope-diff-against-prior-round patterns (Q.7): explicit sweep of AC table.
- No spec-internal contradictions (Q.8): cross-checked model literals, anchor classes, ALLOWED_SET, decision_path values.
- Discriminating-assertion gate clean (Q.9): each AC asserts the load-bearing property of its branch.
- Reinforcement sweep R02–R72 applied (Q.10): per-reinforcement check completed; no violations.

---

## F. Amendments from prior version

N/A — this is the first emission of Q-R74-SPEC. No fix cycle.

---

End of audit sidecar.
