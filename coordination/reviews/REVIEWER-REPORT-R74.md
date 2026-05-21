# R74 Reviewer report — Haiku-for-MU + Reviewer scope differentiation

**Round:** R74
**Tier:** full (Reviewer scope: full-adversarial, per spec § 0.2 + directive § Tier rationale)
**Reviewer HEAD:** `f588ed5` (`chore(R74 IMPLEMENTER): record chore-A coordination SHA in routing block`)
**Spec-triad SHA (ROUND_START):** `bac83e4`
**Chore-A SHA:** `5024b7f` (GREEN; `feat(R74): mu-model-select selector + run-pipeline.sh integration + CLAUDE-REVIEWER.md Mode docs`)

---

## Cold-read inputs

- `coordination/PRD.md` (Phase 3 PRD; R74 framing is in NEXT-ROLE.md directive section)
- `coordination/specs/Q-R74-SPEC.md` (1357 lines; sections 0–11 + 9.1 grilling)
- `coordination/specs/Q-R74-SPEC-AUDIT.md` (sidecar — read; load-bearing for spec-audit verification)
- `coordination/specs/Q-R74-EMPIRICAL.sh` (17 blocks; re-run at Reviewer HEAD — PASS 17 / FAIL 0, exit 0)
- `scripts/mu-model-select.ts` (185 lines)
- `scripts/mu-model-select-fixtures/{corpus.json,F1..F6}.md`
- `test/q74-mu-haiku-reviewer-scope.test.ts` (209 lines; 22 runtime ACs)
- `run-pipeline.sh` (1973 lines; modifications at lines 79–82, 122–124, 139–140, 217–296, 1173–1186)
- `CLAUDE-REVIEWER.md` (133 lines; Mode section at lines 44–76)
- `package.json` (40 lines)
- `coordination/MEMORIAL.md` R74 Architect + Implementer entries
- `~/.claude/CROSS-PROJECT-MEMORIAL.md` (Reviewer + Architect + Implementer sections)

Did NOT read: `coordination/diagnostics/` (empty for R74), `coordination/logs/`, `coordination/NEXT-ROLE.md` (read AFTER independent binding-command runs, only to verify Implementer attestation — not as input for findings).

Binding commands re-run at Reviewer HEAD (verbatim observed output):

- `pnpm exec tsc -p tsconfig.test.json` → exit 0 (zero diagnostics).
- `pnpm exec node --test --test-reporter=tap test/*.test.js` → `# tests 538 / # pass 530 / # fail 5 / # skipped 3` (carry-forward identities AC-R36-21, AC-R36-30, AC-R36-31, AC-R65-2, AC-R66-14 preserved).
- `bash coordination/specs/Q-R74-EMPIRICAL.sh` → PASS 17 / FAIL 0, exit 0.
- `pnpm exec node scripts/mu-model-select.js --directive coordination/NEXT-ROLE.md --tier full` → `{"round":"R74","model":"claude-sonnet-4-6","rationale":"cross-round-pattern marker (class A): cross-project canonical","decision_path":["marker_match","class_A"],"selector_version":"0.1.0","matched_anchors":["cross-project canonical"]}`.
- `pnpm exec node scripts/tier-router-validate.js` → exit 0 (R73 anti-regression preserved).

---

## 1. Per-AC verification table

| AC-ID | Criterion (short) | Status | Evidence |
|---|---|---|---|
| AC-R74-1 | Selector emits valid JSON with contract fields | PASS | `test/q74-mu-haiku-reviewer-scope.test.ts:34-44`; node-test reporter `ok 1`. |
| AC-R74-2 | Exit 1 on missing `--tier` | PASS | `test:47-51`; `scripts/mu-model-select.ts:45-48`; verified `r.status === 1` + stderr includes `--tier`. |
| AC-R74-3 | Exit 1 on unreadable directive | PASS | `test:54-58`; `mu-model-select.ts:58-60`. |
| AC-R74-4 | F1 default-haiku (full, no anchor) | PASS | `test:61-65`; selector default branch at `mu-model-select.ts:167-173`. |
| AC-R74-5 | F2 class A (`cross-project promotion`) → Sonnet | PASS | `test:68-73`; `mu-model-select.ts:86-96`. |
| AC-R74-6 | F3 class B (`MU batch`) → Sonnet | PASS | `test:76-81`; `mu-model-select.ts:99-109`. |
| AC-R74-7 | F4 class C (Reviewer-2 + ESCALATE) → Sonnet | PASS | `test:84-89`; `mu-model-select.ts:112-116`. |
| AC-R74-8 | F5 class D (operator-resolution + Option X) → Sonnet | PASS | `test:92-97`; `mu-model-select.ts:119-123`. |
| AC-R74-9 | F6 audit-tier without anchor → Haiku | PASS | `test:100-104`; selector skips class check when `tier !== 'full'` at `mu-model-select.ts:152`. |
| AC-R74-10 | tier=solo → `n/a` | PASS | `test:107-111`; `mu-model-select.ts:130-138`. |
| AC-R74-11 | tier=coordinator-only → `n/a` | PASS | `test:114-118`; `mu-model-select.ts:130-138`. |
| AC-R74-12 | `--mu-sonnet` on audit forces Sonnet | PASS | `test:121-125`; `mu-model-select.ts:141-149`. |
| AC-R74-13 | `--mu-sonnet` on full forces Sonnet | PASS | `test:128-132`. |
| AC-R74-14 | run-pipeline.sh declares `--mu-sonnet) MU_SONNET=true` | PASS (structural) | `test:135-139`; verified at `run-pipeline.sh:139`. **CAVEAT: see CRITICAL-1 — the literal token exists but the runtime-expansion of `${MU_SONNET:+--mu-sonnet}` at line 226 defeats the flag's load-bearing effect.** |
| AC-R74-15 | run-pipeline.sh declares `--reviewer-scope) REVIEWER_SCOPE_EXPLICIT="$2"` | PASS | `test:142-146`; `run-pipeline.sh:140`. |
| AC-R74-16 | run-pipeline.sh invokes `scripts/mu-model-select.js` with `--directive` + `--tier` | PASS | `test:149-157`; `run-pipeline.sh:226`. |
| AC-R74-17 | `MODEL_MEMORIAL_DEFAULT` + `_SONNET` constants | PASS | `test:160-166`; `run-pipeline.sh:79-80`. |
| AC-R74-18 | CLAUDE-REVIEWER.md contains `## Mode: Structural-only Reviewer` heading | PASS | `test:169-173`; `CLAUDE-REVIEWER.md:44`. |
| AC-R74-19 | Mode body names the 3 structural checks | PASS | `test:176-184`; `CLAUDE-REVIEWER.md:49-59`. |
| AC-R74-20 | CLAUDE-REVIEWER.md `# REINFORCED` count unchanged at 3 | PASS | `test:187-191`; `grep -c "^# REINFORCED" CLAUDE-REVIEWER.md` → 3. |
| AC-R74-21 | `package.json` registers `mu-model-select` script | PASS | `test:194-197`; `package.json:22`. |
| AC-R74-22 | corpus.json enumerates 6 fixtures with expected names | PASS | `test:200-208`; `scripts/mu-model-select-fixtures/corpus.json:3-34`. |
| AC-R74-23 | Binding-command attestation: node-test verbatim | PASS | EMPIRICAL.sh Block 4; observed `tests=538 / pass=530 / fail=5 / skipped=3`. |
| AC-R74-24 | Binding-command attestation: tsc exit 0 | PASS | EMPIRICAL.sh Block 3; `pnpm exec tsc -p tsconfig.test.json` exit 0. |
| AC-R74-25 | Anti-scope diff `bac83e4..HEAD` ⊆ ALLOWED_SET | PASS | EMPIRICAL.sh Block 12; 15 paths, all members of the 17-entry ALLOWED_SET. |
| AC-R74-26 | Carry-forward 5 fail identities preserved + `# fail 5` | PASS | EMPIRICAL.sh Block 5; AC-R36-21/30/31, AC-R65-2, AC-R66-14 verified in `not ok` lines. |
| AC-R74-27 | No engine/demos/tier-router modifications | PASS | EMPIRICAL.sh Block 13; empty diff for hard-freeze paths. |
| AC-R74-28 | REINFORCED counts unchanged in all 6 CLAUDE-*.md | PASS | EMPIRICAL.sh Block 14; counts at HEAD: ARCHITECT=39, IMPLEMENTER=33, REVIEWER=3, MEMORIAL=0, COMMON=7, COORDINATOR=2 (all match round-start). |
| AC-R74-29 | No prior-spec modifications | PASS | EMPIRICAL.sh Block 15; empty diff for `Q-R*-{SPEC,SPEC-AUDIT,EMPIRICAL}` excluding R74. |
| AC-R74-30 | R73 tier-router validation exit 0 | PASS | EMPIRICAL.sh Block 16; `pnpm exec node scripts/tier-router-validate.js` exit 0. |
| AC-R74-31 | Self-classification emits valid model | PASS (empirically bound) | EMPIRICAL.sh Block 17; observed model `claude-sonnet-4-6`. The AC is empirically bound per spec § 6.2 TACTICAL AUTONOMY; observed value differs from Architect prediction (haiku) but the AC binds the empirical output, not the prediction. **See MINOR-2 + MAJOR-1.** |

**Per-AC structural verdict: 31/31 PASS.** However, the AC table's structural coverage does not catch CRITICAL-1 (acknowledged by spec § 5.3 as a known gap).

---

## 2. Findings

### CRITICAL-1 (IMPLEMENTER) — `${MU_SONNET:+--mu-sonnet}` bash expansion makes Haiku default unreachable in real pipeline runs

**File / line:** `run-pipeline.sh:226`.

**What happened.** The Implementer's TACTICAL-DEVIATION TD-2 replaced the spec § 2.5 (c) pseudocode:

```bash
mu_select_args=("--directive" "$COORD/NEXT-ROLE.md" "--tier" "$TIER")
$MU_SONNET && mu_select_args+=("--mu-sonnet")
MU_SELECT_OUT="$(node scripts/mu-model-select.js "${mu_select_args[@]}" ...)"
```

with an inline form:

```bash
MU_SELECT_OUT="$(node scripts/mu-model-select.js --directive "$COORD/NEXT-ROLE.md" --tier "$TIER" ${MU_SONNET:+--mu-sonnet} 2>/dev/null)" || true
```

TD-2 (NEXT-ROLE.md:86) claims **"Semantic behavior identical."** This claim is empirically false.

**Why it breaks.** In bash, `${VAR:+word}` expands to `word` when `VAR` is **set and non-null** — *regardless of value*. The default at `run-pipeline.sh:122` is `MU_SONNET=false`, which is a non-empty string. Therefore `${MU_SONNET:+--mu-sonnet}` ALWAYS expands to `--mu-sonnet`, making the operator override fire on every pipeline invocation.

**Empirically verified** (this Reviewer ran the exact expansion in-context):

```
WITH MU_SONNET=false (default; operator did NOT pass --mu-sonnet):
  {"round":"R74","model":"claude-sonnet-4-6","rationale":"operator override (--mu-sonnet)",
   "decision_path":["operator_override"], ...}

WITH MU_SONNET=true (--mu-sonnet flag set):
  {"round":"R74","model":"claude-sonnet-4-6","rationale":"operator override (--mu-sonnet)",
   "decision_path":["operator_override"], ...}
```

Both invocations route through the `operator_override` branch and return Sonnet. The marker-check branch + the `default_haiku` branch are **structurally unreachable** from `run-pipeline.sh`.

**Contrast with the spec pseudocode (verified by this Reviewer):**

```
Spec pseudocode args (MU_SONNET=false): --directive coordination/NEXT-ROLE.md --tier full
Spec pseudocode args (MU_SONNET=true):  --directive coordination/NEXT-ROLE.md --tier full --mu-sonnet
```

The spec uses `$MU_SONNET && mu_select_args+=("--mu-sonnet")`, which evaluates `false` as the bash command `false` (exit 1) and correctly does NOT append the flag.

**Load-bearing impact.** R74's stated cost-savings deliverable ("**Default MU model: claude-haiku-4-5-20251001** (was claude-sonnet-4-6) — ~3× cost reduction per MU session", directive § Mechanism 1) is **broken** in every pipeline invocation from R75 onward. The selector + ACs + tests verify the selector logic in isolation; the bug is purely in `run-pipeline.sh`'s integration glue.

**Why no AC caught it.** Spec § 5.3 acknowledges: *"End-to-end pipeline-dispatch AC absent. AC-R74-14..17 verify the run-pipeline.sh source contains the right tokens; they do NOT exercise a live pipeline that dispatches MU with the resolved model."* This is exactly the gap the spec identified, and the bug landed in that gap. The Implementer's TD-2 disclosure transparently describes the substitution but mischaracterizes its semantics.

**Right reading.** `${VAR:+word}` requires VAR to be set to empty/unset for the negative case. Either: (a) default `MU_SONNET=""` and use `MU_SONNET=true` on flag; or (b) keep `MU_SONNET=false/true` semantics and use `$MU_SONNET && ...` per spec pseudocode; or (c) explicit `if $MU_SONNET; then ... fi`. The Implementer chose (a) on one half (flag sets `=true`) and contradicted it on the other half (`=false` as default). The two halves are inconsistent.

**Routing implication.** Per CLAUDE-REVIEWER.md REINFORCED 2026-05-19, this is a **substantive script-correctness CRITICAL**, not an attestation-level one. Strict-routing reading applies: **STATUS: ESCALATE**.

---

### MAJOR-1 (IMPLEMENTER) — Rule 1 false-compliance-attestation: AC-R74-31 self-classification rationale falsely attributed to Class C

**File / line:** `coordination/MEMORIAL.md:1663` (Implementer entry); `coordination/NEXT-ROLE.md:60` (Implementer attestation block).

**What happened.** Implementer attestation says:

> "AC-R74-31 self-classification → `claude-sonnet-4-6` (empirical; diverges from Architect prediction of haiku — **directive section contains Class C co-occurrence in R72/R73 Reviewer prose**)."

The actual selector JSON output (verified by this Reviewer):

```
"decision_path":["marker_match","class_A"],
"matched_anchors":["cross-project canonical"],
"rationale":"cross-round-pattern marker (class A): cross-project canonical"
```

**Empirical verification.** This Reviewer reproduced the selector's `loadDirective` boundary logic against `coordination/NEXT-ROLE.md`, extracted the R74 directive section (4763 chars, R74), and ran each Class anchor regex:

| Pattern | Result |
|---|---|
| `/Reviewer-2/` | **null** (NO match in R74 directive section) |
| `/\bESCALATE\b/` | **null** (NO match in R74 directive section) |
| `/cross-project canonical/i` | `"cross-project canonical"` (matches at the Rule 4 disposition row, line 305 of NEXT-ROLE.md: *"R62+R66+R68 lesson; cross-project canonical at R72"*) |

Class C requires BOTH `Reviewer-2` AND `\bESCALATE\b` in the directive section. Neither appears. The Implementer's claim that "Class C co-occurrence in R72/R73 Reviewer prose" caused the Sonnet match is false — the R73 Reviewer routing block is AFTER the R74 directive section's `---` boundary (NEXT-ROLE.md:329) and is NOT included in what the selector reads.

**Pattern.** This is a Rule 1 (`empirical-command-attestation`) violation. The `model` field itself is recorded verbatim (correct: `claude-sonnet-4-6`), but the Implementer fabricated a reason that contradicts the selector's own `matched_anchors` + `decision_path` fields. The verbatim-attestation principle (per CROSS-PROJECT-MEMORIAL.md:38 + CLAUDE-COMMON.md REINFORCED 2026-05-18) applies to the entire empirical output, not just the field bound by the AC — particularly when the Implementer adds interpretive commentary that is itself empirically verifiable and wrong.

**Severity rationale.** MAJOR (not CRITICAL) because the attested *model* value is correct; the *rationale* fabrication is the violation. This is also the third Tessera instance of attestation-side false interpretation (R26 MAJOR-1 tsc exit-code reframing; R45 CRITICAL-1 grep-count attestation; R73 MAJOR-1 git-diff-count reframing). Threshold-evaluation for cross-project promotion of an `attestation-supplementary-fields-must-be-verbatim` sub-rule should be considered at Memorial-Updater stage — possibly fold under existing Rule 1.

---

### MINOR-1 (ARCHITECT) — Spec § 9.1 Q.6 claim-then-walk: directive-section anchor sweep missed `cross-project canonical`

**File / line:** `coordination/specs/Q-R74-SPEC.md:1251` (Q.6 manual walk table); confirmed empirically wrong by R74 self-classification.

**What happened.** Spec § 9.1 Q.6 table claims:

> "R74 directive section content anchor scan: ... Class A: no (no 'cross-project promotion' etc.); Class B: no; Class C: no; Class D: no. Self-classification → default_haiku."

Empirical fact: the R74 directive section in NEXT-ROLE.md contains the string `cross-project canonical` (NEXT-ROLE.md:305, Rule 4 disposition row), which matches Class A regex `/cross-project canonical/i`. The Architect's manual walk enumerated `cross-project promotion` but did not enumerate the other 4 Class A patterns specifically (or missed them) — even though all 5 patterns are listed in spec § 2.3.

**Why not MAJOR.** AC-R74-31 is empirically bound (per § 6.2 TACTICAL AUTONOMY), so the AC verdict is unchanged. The Architect's § 10 prediction (`AC-R74-31 self-classification expected model: claude-haiku-4-5-20251001`) was empirically wrong but flagged as a prediction, not a binding literal. The cite-then-walk discipline (CROSS-PROJECT-MEMORIAL.md:38) was applied per row of the Q.6 table — the row exists — but the walk itself was incomplete (only one of five Class A patterns enumerated; remaining four assumed absent by "etc.").

**Lesson.** When an Architect's pre-emit grilling table claims "Class X: no" by walking a regex set, every alternation in that set should be tested individually, not summarized via "etc." The discriminability test for ANY claim of negative evidence is "would I notice if I'd missed a regex alternation?" — answered here by "no, because I used 'etc.'."

---

### MINOR-2 (ARCHITECT) — Spec § 5.3 acknowledged gap (`End-to-end pipeline-dispatch AC absent`) was the exact gap CRITICAL-1 landed in

**File / line:** `coordination/specs/Q-R74-SPEC.md:1073` (§ 5.3 acknowledged gaps).

**What happened.** Spec § 5.3 explicitly acknowledges:

> "End-to-end pipeline-dispatch AC absent. AC-R74-14..17 verify the run-pipeline.sh source contains the right tokens; they do NOT exercise a live pipeline that dispatches MU with the resolved model. Reasoning: running `./run-pipeline.sh --round R74 --tier full --dry-run` inside a test would shell out to claude CLI (preflight check)..."

The trade-off rationale is technically reasonable (the preflight check makes test-running difficult). However, the spec's "Rule 3 self-application gate verified: the Reviewer is in a position to catch this gap if `build_reviewer_prompt` is incorrectly wired" assumes the Reviewer catches integration bugs as part of the structural / right-reasons audit — which is what this Reviewer report does for CRITICAL-1.

**Recommendation (not required action by Reviewer).** A future round should add a minimal end-to-end "dry-eval" AC for the bash glue: e.g., a test that sources `run-pipeline.sh` arg-parsing in a subshell, sets `MU_SONNET=false`, expands the literal `${MU_SONNET:+--mu-sonnet}`, and asserts the expansion is empty. This catches the present CRITICAL-1 directly. The spec's acknowledged gap should be a noticed pattern, not a permanent waiver.

---

### MINOR-3 (IMPLEMENTER) — `MU_FALLBACK_RATIONALE` "selector returned unexpected model" branch is structurally unreachable through valid selector output

**File / line:** `run-pipeline.sh:235-236`.

**What happened.** The bash case-statement reads:

```bash
case "$MU_MODEL_FIELD" in
  claude-haiku-*)  MODEL_MEMORIAL="$MODEL_MEMORIAL_DEFAULT" ;;
  claude-sonnet-*) MODEL_MEMORIAL="$MODEL_MEMORIAL_SONNET"  ;;
  *)               MODEL_MEMORIAL="$MODEL_MEMORIAL_DEFAULT"
                   MU_FALLBACK_RATIONALE="selector returned unexpected model; fallback haiku"
                   ;;
esac
```

The selector emits exactly three model values: `claude-haiku-4-5-20251001`, `claude-sonnet-4-6`, `n/a`. The first two are caught by the `claude-haiku-*` / `claude-sonnet-*` glob patterns. The third (`n/a`) is only emitted for `tier ∈ {solo, coordinator-only}` — but the surrounding `if [[ "$TIER" == "solo" ]] || $COORDINATOR_MODE; then` block at `run-pipeline.sh:222` short-circuits before the selector is even invoked.

Consequence: the `*` (catch-all) arm only fires for selector parse failures (empty stdout / invalid JSON), which is already caught by the surrounding `if [[ -n "$MU_SELECT_OUT" ]]; then` block at line 227.

**Severity rationale.** MINOR — the catch-all arm is defensive code that does no harm. No AC binds it. The cost is a small amount of dead code and an inability to distinguish "selector emitted unexpected model" from "selector unavailable" (both fall through to the same `MODEL_MEMORIAL_DEFAULT`). Branch-binding-coverage (Rule 2) does not currently require this arm to have a binding AC because it's downstream of selector behavior bound by AC-R74-1..13.

---

### MINOR-4 (IMPLEMENTER) — TD-2 disclosure mischaracterizes its semantic effect; the disclosure is more important than the deviation

**File / line:** `coordination/NEXT-ROLE.md:86` (TD-2 disclosure).

**What happened.** TD-2 disclosure says: *"Spec § 2.5 pseudocode builds `mu_select_args` array then passes `"${mu_select_args[@]}"`. Inline form used instead (`--directive "$COORD/NEXT-ROLE.md" --tier "$TIER"`) so AC-R74-16 regex `/scripts\/mu-model-select\.js[\s\S]{0,400}--directive/` matches ... **Semantic behavior identical.**"*

The behavior is NOT identical (see CRITICAL-1). The Implementer was driven to change the form for an AC-regex reason (which is a legitimate observation — see Right-reasons § 3 below for the underlying AC-design concern), but did not re-verify the semantic equivalence of the substitute construct against the spec pseudocode's intent.

**Discipline reinforcement candidate.** When a TACTICAL DEVIATION rewrites a bash construct to satisfy a structural AC, the disclosure should include an empirical equivalence check: "I verified the substitute construct produces identical output for both flag-set and flag-unset cases by running it." TD-1 (the `\Z` regex fix) does this implicitly because the original was an invalid regex; TD-2's substitute is a valid construct but semantically distinct, and the empirical equivalence check was skipped.

---

### MINOR-5 (ARCHITECT) — AC-R74-16 regex `/scripts\/mu-model-select\.js[\s\S]{0,400}--directive/` ordering constraint forced TD-2

**File / line:** `coordination/specs/Q-R74-SPEC.md:903-906` (AC-R74-16); `test/q74-mu-haiku-reviewer-scope.test.ts:153`.

**What happened.** The AC-R74-16 regex requires `scripts/mu-model-select.js` to appear within 400 chars BEFORE `--directive` in the file text. The spec's own § 2.5 (c) pseudocode places `--directive` first via the args array (`mu_select_args=("--directive" ...)` followed by `${mu_select_args[@]}` after the script path) — meaning the spec pseudocode would itself FAIL its own AC-R74-16 regex if implemented verbatim.

This is the proximate cause of TD-2: the Implementer was forced to inline the args (placing the script name first, then `--directive`) so the test would pass. The semantic regression in CRITICAL-1 is a downstream consequence.

**Severity.** MINOR — the AC's intent (verify the script is wired in) is reasonable; the regex's directional ordering is overconstrained. Better forms: anchor on `scripts/mu-model-select.js` and assert presence of both `--directive` and `--tier` anywhere in a ±400-char window via two independent regexes. The Architect's pre-emit grilling did not exercise the "would the spec pseudocode itself pass the AC?" check — Rule 3 (implementer-spec-test-assertion-coverage) self-application gate would catch this if applied strictly.

---

### OBS-1 — All 17 EMPIRICAL.sh blocks PASS verbatim at Reviewer HEAD

`bash coordination/specs/Q-R74-EMPIRICAL.sh` exits 0 with `PASS: 17 / FAIL: 0`. Observed self-classification model: `claude-sonnet-4-6` (per Block 17 output). Test count drift accurate: tests=538 = 516 R73 baseline + 22 R74 = matches Architect prediction.

### OBS-2 — TDD discipline preserved; RED commit `3baad60` precedes GREEN `5024b7f`

`git log --oneline` shows the canonical RED→GREEN→chore-A sequence: `red(R74)` → `feat(R74)` → `chore(R74 IMPLEMENTER): routing block + MEMORIAL` → `chore(R74 IMPLEMENTER): record chore-A coordination SHA`. R23 IMPL MINOR-1 satisfied.

### OBS-3 — Spec triad commit-sequencing preserved

Spec triad `spec(R74): Q-R74-SPEC + audit sidecar + EMPIRICAL.sh` at `bac83e4` committed in its own commit BEFORE the Architect routing block (`006c38c`). R21 ARCH MINOR-1 discipline applied.

### OBS-4 — `coordination/logs/ROUND-R74-ROUTING.md` exists as untracked file; permitted by spec § 5.1 carve-out

Per spec § 5.1, `^coordination/logs/ROUND-R74-ROUTING\.md$` is a documented regex carve-out. The file exists locally as untracked; it does not appear in the `bac83e4..HEAD` diff (15 paths) because it is gitignored or simply not added. Not a violation.

### OBS-5 — Implementer reported diff count 15 paths; verbatim correct

`git diff bac83e4..HEAD --name-only | wc -l` → 15. The spec-triad files (`Q-R74-SPEC.md`, `Q-R74-SPEC-AUDIT.md`) are AT `bac83e4` and unchanged; `Q-R74-EMPIRICAL.sh` IS in the diff (due to sed injection of the SHA at chore-A). 15 paths is correct and verbatim per the Implementer's R73 MAJOR-1 lesson application.

### OBS-6 — `CLAUDE-REVIEWER.md` Mode docs section verbatim from spec § 2.6

The inserted prose at CLAUDE-REVIEWER.md:44-76 is byte-equivalent to the spec § 2.6 prescription. No deviation. The "REINFORCED count = 3" guard (AC-R74-20) is satisfied; the Mode section is NOT a `# REINFORCED` line.

---

## 3. Right-reasons audit

### Test 1: AC-R74-4 (default-haiku branch; F1 fixture)

- **Spec requirement bound:** spec § 2.4 Branch 4 (`default_haiku`) — "Default Haiku (audit-tier no anchor; or full-tier no anchor)".
- **Test mechanism:** `test/q74-mu-haiku-reviewer-scope.test.ts:61-65` invokes selector via `spawnSync` with F1 fixture path + `tier=full`, asserts `model === "claude-haiku-4-5-20251001"` AND `decision_path[0] === "default_haiku"`.
- **Self-confirming check:** The test reads selector OUTPUT via a child process; it does NOT import the selector's internal constants. The fixture content (`F1-default-haiku.md`) was authored by the Implementer to contain NO anchor markers. If any of the 14 anchor regexes accidentally matched the fixture text, the test would FAIL (not silently pass).
- **Verdict:** Not self-confirming. Test would fail under a regression where the default-haiku branch returns a different model or where the fixture's content accidentally triggers a class regex.

### Test 2: AC-R74-14 (run-pipeline.sh declares `--mu-sonnet`)

- **Spec requirement bound:** spec § 2.5 (a) — the `--mu-sonnet) MU_SONNET=true` arg-parsing case clause exists.
- **Test mechanism:** `test:135-139` reads `run-pipeline.sh` and regex-matches `/--mu-sonnet\)\s*MU_SONNET=true/`.
- **Self-confirming check:** Pure structural grep. The test confirms the LITERAL TOKEN is in the file but does NOT exercise the runtime effect.
- **Self-confirming verdict:** Borderline — the test is not "self-confirming" in the strict R02-pattern sense (test does not re-implement production logic in its body), but the test is **insufficient to bind the load-bearing property** (the flag actually controls Sonnet selection at runtime). This insufficiency is the gap CRITICAL-1 lands in. Spec § 5.3 acknowledged the gap as a deliberate trade-off.
- **Verdict:** Test passes for a weak reason (token presence); the strong reason (runtime behavior) is unbound. This is acknowledged by § 5.3 and surfaced by CRITICAL-1.

### Test 3: AC-R74-22 (corpus.json fixture enumeration)

- **Spec requirement bound:** spec § 3.2 — corpus.json must contain 6 entries with names `F1-default-haiku..F6-audit-no-anchor`.
- **Test mechanism:** `test:200-208` reads `corpus.json`, parses, asserts `entries.length === 6` AND sorts names + deep-equals expected array.
- **Self-confirming check:** Test reads corpus.json directly. The fixture file's `name` field is also used by the test to construct the expected-names array — except the expected array is HARDCODED in the test body, not derived from the fixture. A regression where corpus.json had 5 entries OR misnamed entries would fail.
- **Verdict:** Not self-confirming. The expected names + count are external to corpus.json (declared in the test source), so a corpus.json regression is detectable.

---

## 4. Cross-cutting checks

### TDD discipline

- RED commit `3baad60`: `red(R74): q74 mu-haiku + reviewer-scope stub fails — assert.fail at AC-R74-1..22` — preceded GREEN. ✓
- GREEN commit `5024b7f`: `feat(R74): mu-model-select selector + run-pipeline.sh integration + CLAUDE-REVIEWER.md Mode docs`. ✓
- Empirical: `git log` shows the canonical sequence. R23 IMPL MINOR-1 satisfied. 6th consecutive Tessera round of TDD discipline (R69→R74).

### No-skip / halt discipline

- No DIAGNOSTIC files written for R74. Implementer reports zero halt conditions triggered. EMPIRICAL.sh exit 0 confirms no halt #1 trigger.
- TD-1 (`\Z` regex JS-invalid fix) and TD-2 (inline args) are documented as TACTICAL AUTONOMY deviations. TD-1 is genuinely a spec API-fix (`\Z` is invalid in JS regex syntax). TD-2 is NOT a benign syntactic substitute — see CRITICAL-1 — but the spec § 6.2 TACTICAL AUTONOMY scope does not explicitly cover bash syntactic substitutions in `run-pipeline.sh`. The bug demonstrates the limit of "TACTICAL AUTONOMY without re-verification" as a discipline.

### Anti-scope

- `git diff bac83e4..HEAD --name-only`: 15 paths, all in ALLOWED_SET. ✓
- No engine/demos/tools/tier-router modifications. ✓
- CLAUDE-{ARCHITECT,IMPLEMENTER,MEMORIAL,COMMON,COORDINATOR,REVIEWER}.md REINFORCED counts unchanged. ✓
- CLAUDE-REVIEWER.md Mode docs section inserted at lines 44-76 between role-boundary block and REINFORCEMENTS divider — placement matches spec § 2.6 prescription. ✓

### Round-evolution-fragility avoidance

- No forward-protection / live-file-count / anti-scope-diff-against-prior-round ACs. ✓
- Carry-forward fail set bound by AC ID identity + `# fail 5` summary (AC-R74-26). ✓
- ALLOWED_SET enumeration consistent across spec § 1.1 + § 5.1 + EMPIRICAL.sh Block 12. ✓
- AC-R74-31 empirically bound (no predicted literal). ✓
- R72-promoted ALLOWED_SET-amendment-propagation rule applied (the 17-path set landed identically at all three surfaces). ✓

---

## 5. Grilling output (on this report itself, before routing)

- Every finding has a file:line reference? **Yes.** CRITICAL-1: `run-pipeline.sh:226` + `coordination/NEXT-ROLE.md:86`. MAJOR-1: `coordination/MEMORIAL.md:1663` + `coordination/NEXT-ROLE.md:60`. MINOR-1..5 each cite specific lines.
- Any AC marked PASS without actual verification? **No.** Every AC row has a test-file line citation or a verifying EMPIRICAL.sh block; this Reviewer ran the binding commands at Reviewer HEAD verbatim.
- Right-reasons audit completed for 3+ tests? **Yes** (3 tests: AC-R74-4, AC-R74-14, AC-R74-22). AC-R74-14 surfaces the structural-grep-only-insufficient pattern that connects to CRITICAL-1.
- Adversarial counterfactual considered? **Yes** — found the empirically-broken bash expansion that the AC table structurally misses.
- Severity claims defensible? **Yes** — CRITICAL-1 is a script-correctness bug, not attestation-level; strict-routing reading applies (per CLAUDE-REVIEWER.md REINFORCED 2026-05-19). MAJOR-1 is a Rule 1 attestation-supplementary-field violation; the bound field (`model`) is correct but the interpretive rationale is empirically false.

---

## 6. Routing

**CRITICAL exists → STATUS: ESCALATE.**

The CRITICAL-1 finding is script-correctness (substantive deliverable broken), not attestation-level. Per CLAUDE-REVIEWER.md REINFORCED 2026-05-19, when a CRITICAL is substantive (not attestation-only), strict-routing reading applies: ESCALATE to the operator.

**Operator decision space (bounded options for resolution):**

- **Option A** — Fix in-place + minimal coordination chore. Replace `${MU_SONNET:+--mu-sonnet}` at `run-pipeline.sh:226` with the spec § 2.5 (c) pseudocode form (`$MU_SONNET && mu_select_args+=("--mu-sonnet")` + array expansion) OR an `if $MU_SONNET; then ...; fi` block. Add a minimal end-to-end AC that verifies the flag's behavior. Update Implementer attestation + MEMORIAL to record the correct Class A match for AC-R74-31. R74 closes with the cost-savings mechanism actually working.
- **Option B** — Promote to next round (R75). Land R74 as-is (MERGE-READY with reservations) and address CRITICAL-1 + MAJOR-1 as the first item of R75 directive. Risk: R75+ pipelines that consume R74's mechanism dispatch Sonnet on every MU role, defeating the cost-savings goal until R75 resolves. The R75 directive must explicitly halt-then-fix this before any other MU model selection.
- **Option C** — Reframe + accept. Argue that the broken Haiku default is acceptable because the substantive deliverable (the selector mechanism itself) is sound and only the bash glue is wrong. NOT RECOMMENDED — this matches the R45 attestation-vs-deliverable reframing pattern that REINFORCED 2026-05-19 explicitly cautions against, and the bug defeats the directive's stated cost-reduction goal.

**Recommendation:** Option A (in-place fix + minimal coordination chore in R74's chain). Rationale: the bug is a one-line bash expansion fix; the spec already contains the correct pseudocode; the discipline lesson (TACTICAL AUTONOMY without re-verification) is freshest if recorded in R74's own MEMORIAL rather than deferred to R75. The MAJOR-1 attestation correction is also a same-line fix.

---

## 7. Inputs and outputs

- Inputs: enumerated under § Cold-read inputs above. Did NOT consult `coordination/diagnostics/` (none present for R74), `coordination/logs/`, `.prompt-*.md` files.
- Output: this report at `coordination/reviews/REVIEWER-REPORT-R74.md`.
- MEMORIAL entries to be appended (see § 8).

---

## 8. MEMORIAL entries

To be appended to `coordination/MEMORIAL.md` R74 Reviewer section by this Reviewer.

(Reviewer-attribution rule per CLAUDE-REVIEWER.md REINFORCED 2026-05-19: `[role]` field = role that authored the artifact containing the violation, NOT the detecting role.)

```
CONFIRMATION: cold-read-binding-command-rerun-discipline | Reviewer ran all 4 binding commands at HEAD verbatim before reading Implementer attestation: tsc exit 0 / node-test 538/530/5/3 / EMPIRICAL.sh PASS 17 FAIL 0 / tier-router:validate exit 0. Did not consult diagnostics/ or logs/. CROSS-PROJECT-MEMORIAL.md Reviewer section read first to surface previously-missed issue classes (attestation-vs-deliverable pattern; structural-grep-only-insufficient pattern). | R74 | REVIEWER

CONFIRMATION: adversarial-counterfactual-uncovered-load-bearing-bug | CRITICAL-1: ${MU_SONNET:+--mu-sonnet} bash expansion ALWAYS expands to --mu-sonnet because MU_SONNET=false is non-empty. Defeats R74's stated Haiku-default cost-savings mechanism in every real pipeline invocation. Empirically verified via in-context expansion + selector-spawn. Structural AC table acknowledges this gap (§ 5.3 "End-to-end pipeline-dispatch AC absent") — exactly the gap the bug landed in. Cold-eye full-adversarial Reviewer scope earned its place this round. | R74 | REVIEWER

VIOLATION: tactical-autonomy-semantic-equivalence-unchecked | run-pipeline.sh:226 TD-2 replaced spec § 2.5 (c) array-args form with inline ${MU_SONNET:+--mu-sonnet}; TD-2 disclosure claimed "Semantic behavior identical" but the constructs are not equivalent. ${VAR:+word} expands when VAR is non-null regardless of value; with default MU_SONNET=false (non-empty string), --mu-sonnet is always passed. R74's load-bearing Haiku-default mechanism is structurally unreachable from run-pipeline.sh. | R74 | IMPLEMENTER

VIOLATION: empirical-command-attestation-rationale-fabrication | MEMORIAL.md:1663 + NEXT-ROLE.md:60 Implementer attestation says AC-R74-31 self-classification matched "Class C co-occurrence in R72/R73 Reviewer prose"; actual selector matched_anchors field is ["cross-project canonical"] and decision_path is ["marker_match","class_A"]. Reviewer-2 and ESCALATE do NOT appear in the R74 directive section (verified by reproducing the selector's loadDirective boundary regex). Model value attested correctly; interpretive rationale empirically false. Rule 1 sub-class: attestation-supplementary-fields-must-be-verbatim. | R74 | IMPLEMENTER

VIOLATION: architect-pre-emit-walk-incomplete-class-A-enumeration | Q-R74-SPEC § 9.1 Q.6 table claimed "Class A: no (no 'cross-project promotion' etc.)" — the manual walk did not enumerate all 5 Class A regex alternations and missed /cross-project canonical/i which matches the directive's Rule 4 disposition row at NEXT-ROLE.md:305. Architect's § 10 prediction of haiku for AC-R74-31 was empirically refuted at chore-A. Discriminability discipline: a "Class X: no" claim must enumerate each alternation individually, not use "etc." | R74 | ARCHITECT

VIOLATION: ac-regex-overconstrained-forced-tactical-deviation | AC-R74-16 regex /scripts\/mu-model-select\.js[\s\S]{0,400}--directive/ requires the script reference to appear BEFORE --directive in the file. The spec's own § 2.5 (c) pseudocode (mu_select_args=("--directive" ...) followed by ${mu_select_args[@]}) would FAIL its own AC if implemented verbatim. The Implementer was forced to deviate (TD-2 inline form), and the deviation introduced CRITICAL-1. Rule 3 self-application gate should ask "would the spec pseudocode pass the AC?" — this round did not. | R74 | ARCHITECT

VIOLATION: dead-bash-branch-without-binding-coverage | run-pipeline.sh:235-236 selector-unexpected-model catch-all arm is structurally unreachable through valid selector output (only emitted models are claude-haiku-*, claude-sonnet-*, n/a; n/a is short-circuited before selector invocation). No binding AC. Defensive code is acceptable but should be flagged in TD disclosures. | R74 | IMPLEMENTER
```

End of report.
