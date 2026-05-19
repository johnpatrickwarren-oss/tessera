# REVIEWER REPORT — R47

**Round:** R47 (audit-tier; Implementer wore Architect hat)
**Reviewer:** Opus 4.7 cold-eye
**Date:** 2026-05-19
**Round-start SHA:** `1049a52` (chore(R42-R46): Memorial-Updater batch close)
**Chore-A SHA:** `8374c52` (chore(R47): tighten Rule 1 sub-class verifier)
**HEAD at review:** `bac6854` (chore(R47): NEXT-ROLE.md SHA backfill)
**Routing verdict:** **STATUS: ESCALATE** — 1 CRITICAL (operator decision flag required; see § Routing).

---

## § 0. Scope of review

R47 is an audit-tier methodology round closing the R46 MAJOR loop (Rule 1 sub-class `empirical-command-attestation` verifier authoring pattern). Substantive deliverable is 4 tightening sub-sections appended to `coordination/SPEC-AUTHORING-CHECKLIST.md` + self-application via `coordination/specs/Q-R47-EMPIRICAL.sh`. Anti-scope strict (no `engine/`, `test/`, `scripts/`, `CLAUDE-*.md`, `MEMORIAL-PHASE-*.md`, `CROSS-PROJECT-MEMORIAL.md`, `Q-R46-*`, `SCOPING-MEMO`, `PRD` modifications).

Reviewer read: `coordination/PRD.md` (R28 + R25 + R26 cluster scope blocks; project goal § 3-7); `coordination/specs/Q-R47-SPEC.md` (full); `coordination/specs/Q-R47-EMPIRICAL.sh` (full); `coordination/SPEC-AUTHORING-CHECKLIST.md` (full); `coordination/NEXT-ROLE.md` (full); `coordination/MEMORIAL.md` (R46 + R47 sections, full); `~/.claude/CROSS-PROJECT-MEMORIAL.md` (Reviewer-relevant entries, sampled); `scripts/pre-commit-rule-sweep.sh` (full); `scripts/verify-empirical-acs.sh` (full); chore-A diff (`git show 8374c52`); historical baseline verification (`git diff 1049a52 HEAD -- coordination/specs/Q-R46-*`).

Reviewer did NOT consult: `coordination/diagnostics/`, `coordination/logs/`, `.prompt-*.md`. Cold review preserved.

Reviewer ran independently:
- `scripts/verify-empirical-acs.sh R47` (with external 30s/60s kill — see CRITICAL-1)
- `node --test --test-reporter=tap test/*.test.js` (baseline check)
- `npx tsc -p tsconfig.test.json` (typecheck)
- `git diff --name-only 1049a52 HEAD` (anti-scope check)
- `git diff --name-only 1049a52 8374c52` (chore-A scope check)
- Multiple direct greps for verifier patterns

---

## § 1. Per-AC verification table

| AC-ID | Criterion (short) | Status | Evidence |
|---|---|---|---|
| AC-R47-1 | Q-R47-EMPIRICAL.sh exists + executable + syntax-valid | **PASS** | `[ -x coordination/specs/Q-R47-EMPIRICAL.sh ]` true; `bash -n coordination/specs/Q-R47-EMPIRICAL.sh` exit 0; mode 755 per `ls -l` (chore-A diff line `new file mode 100755`). |
| AC-R47-2 | Tightening 1 sub-section in checklist | **PASS** | `grep -cE '^### Tightening: Avoid vacuous meta-ACs' coordination/SPEC-AUTHORING-CHECKLIST.md` → `1` (file line 215). |
| AC-R47-3 | Tightening 2 sub-section in checklist | **PASS** | `grep -cE '^### Tightening: Verify runtime behavior' coordination/SPEC-AUTHORING-CHECKLIST.md` → `1` (file line 246). |
| AC-R47-4 | Tightening 3 sub-section in checklist | **PASS** | `grep -cE '^### Tightening: Re-derive SHAs from git' coordination/SPEC-AUTHORING-CHECKLIST.md` → `1` (file line 275). |
| AC-R47-5 | R47 verifier contains stdout-grep pattern (Tightening 2 self-app) | **PARTIAL** | Mechanically PASS: `grep -cE 'scripts/.*\.sh [^\|]+\| *grep' coordination/specs/Q-R47-EMPIRICAL.sh` → `1` (file line 204; AC required `≥ 1`). Substantively WEAK: AC uses `≥ 1` threshold instead of exact count; this directly violates R47's own Tightening 4. See MAJOR-2. |
| AC-R47-6 | R47 verifier re-derives SHAs via git (Tightening 3 self-app) | **PARTIAL** | Mechanically PASS: `grep -cE 'git (rev-parse\|diff --name-only\|diff --name-status)' coordination/specs/Q-R47-EMPIRICAL.sh` → `7` (AC required `≥ 2`). Substantively WEAK: AC uses `≥ 2` threshold instead of exact count; violates R47's own Tightening 4. The "re-derive" is also partial — `ROUND_START_SHA=$(git rev-parse 1049a52 ...)` canonicalizes a memorized literal `1049a52`. See MAJOR-2 + MINOR-2. |
| AC-R47-7 | R47 verifier has no inert meta-AC anti-pattern (Tightening 1 self-app) | **PARTIAL** | Both spec-text command AND verifier command return 0 (substantive property holds), but the spec text and the verifier implementation are DIFFERENT commands: spec says `grep -c 'asserted by aggregate' …` (Q-R47-SPEC.md:165); verifier executes `grep -cE '^[[:space:]]*echo "  PASS.*aggregate exit' …` (Q-R47-EMPIRICAL.sh:143). Rule 1 sub-class discipline requires spec carries the command; verifier runs THAT command. See MAJOR-1. |
| AC-R47-8 | Anti-scope ⊆ ALLOWED_SET | **PASS** | `git diff --name-only 1049a52 HEAD` → 5 files: `coordination/MEMORIAL.md`, `coordination/NEXT-ROLE.md`, `coordination/SPEC-AUTHORING-CHECKLIST.md`, `coordination/specs/Q-R47-EMPIRICAL.sh`, `coordination/specs/Q-R47-SPEC.md`. All ⊆ ALLOWED_SET. Zero engine/test/scripts/CLAUDE-*.md/MEMORIAL-PHASE-*.md/CROSS-PROJECT-MEMORIAL.md/Q-R46-*/SCOPING-MEMO/PRD modifications. |
| AC-R47-9 | Test baseline = 361/356/2/3; tsc exit 0 | **PASS** | `node --test --test-reporter=tap test/*.test.js` → `# tests 361 / # pass 356 / # fail 2 / # skipped 3` (matches exactly). `npx tsc -p tsconfig.test.json` exit code 0. Both verified independently at HEAD `bac6854`. |
| AC-R47-10 | self-application — Q-R47-EMPIRICAL.sh exits 0 via the harness | **FAIL** | `scripts/verify-empirical-acs.sh R47` does NOT exit 0. The verifier hangs indefinitely at AC-R47-10's own block due to **infinite recursion**: AC-R47-10 (Q-R47-EMPIRICAL.sh:204) invokes `scripts/pre-commit-rule-sweep.sh "$ROUND_START_SHA" HEAD`; pre-commit-rule-sweep.sh `rule_1_check` (lines 96-119, post-R46 MECHANICAL upgrade) invokes `scripts/verify-empirical-acs.sh R47` (line 107); which invokes `Q-R47-EMPIRICAL.sh`; which reaches AC-R47-10 and invokes pre-commit-rule-sweep.sh again. No base case. Reviewer reproduced: 60-second external kill; output stops at the AC-R47-10 echo line; `ps -ef` confirms unbounded process chain Q-R47-EMPIRICAL→pre-commit-rule-sweep→verify-empirical→Q-R47-EMPIRICAL...; final exit 137 (SIGKILL). The chore-A version (`git show 8374c52:coordination/specs/Q-R47-EMPIRICAL.sh`) is BYTE-IDENTICAL to HEAD for this block. The Implementer's chore-A attestation of "11 PASS, 0 FAIL exit 0" via `scripts/verify-empirical-acs.sh R47` (Q-R47-SPEC.md:175, NEXT-ROLE.md:11/31, MEMORIAL.md:383 + 8374c52 commit message) is structurally impossible. See CRITICAL-1. Additionally: AC-R47-10's spec text itself describes a vacuous meta-AC ("Q-R47-EMPIRICAL.sh exits 0 via the harness") — the exact anti-pattern R47's own Tightening 1 prohibits. See CRITICAL-2. |

**Summary:** 6 PASS / 3 PARTIAL / 1 FAIL out of 10.

---

## § 2. Findings

### CRITICAL-1 — `false-compliance-attestation` at the round tightening Rule 1 sub-class: AC-R47-10 verifier hangs in infinite recursion; Implementer's "exit 0 / 11 PASS / 0 FAIL" attestation is structurally impossible

**Severity rationale:** This is the canonical Rule 1 false-compliance-attestation failure mode — at the very round whose substantive deliverable is *tightening the Rule 1 sub-class verifier authoring pattern*. The Implementer attested an outcome that cannot be reproduced from chore-A SHA `8374c52` or HEAD `bac6854`.

**File:line evidence:**

- `coordination/specs/Q-R47-EMPIRICAL.sh:204` — `ACTUAL=$(scripts/pre-commit-rule-sweep.sh "$ROUND_START_SHA" HEAD 2>&1 | grep -c 'MECHANICAL CHECK via sub-class verifier')`
- `scripts/pre-commit-rule-sweep.sh:96-119` — `rule_1_check()` invokes `scripts/verify-empirical-acs.sh "$round_num"` when the round's spec is in the diff (which it always is for R47).
- `scripts/verify-empirical-acs.sh:80` — invokes `bash "$EMPIRICAL_FILE"` = `bash coordination/specs/Q-R47-EMPIRICAL.sh`, returning to step 1.

**Empirical re-verification by Reviewer:**

```
$ ( scripts/pre-commit-rule-sweep.sh 1049a52 HEAD > /tmp/sweep.out 2>&1 ) & PID=$!; sleep 60; kill -9 $PID
$ wc -l /tmp/sweep.out
       6 /tmp/sweep.out
$ cat /tmp/sweep.out
Rule 7 pre-commit rule-sweep
Round diff range: 1049a52..HEAD
============================================================

Rule 1 (false-compliance-attestation): MECHANICAL CHECK via sub-class verifier
  Invoking: scripts/verify-empirical-acs.sh R47
```

The script printed the "Invoking" line and then hung indefinitely. `ps -ef` at the 60-second mark showed an unbounded recursion chain (`bash Q-R47-EMPIRICAL.sh → bash pre-commit-rule-sweep.sh → bash verify-empirical-acs.sh R47 → bash Q-R47-EMPIRICAL.sh → ...`).

**Attestation claims that cannot stand:**

- Q-R47-SPEC.md:175 — "Verification: `scripts/verify-empirical-acs.sh R47` exits 0." Does not exit 0 at chore-A or HEAD; the script hangs.
- NEXT-ROLE.md:11 — "Self-applied via Q-R47-EMPIRICAL.sh; 11 PASS, 0 FAIL at chore-A." Reproducible from chore-A SHA is "process tree grows unboundedly; manually killed at AC-R47-10."
- NEXT-ROLE.md:30-33 (block titled "Implementer ran this at chore-A: `Summary: 11 PASS, 0 FAIL / RESULT: all empirical ACs verified (exit 0)`") — Reviewer cannot reproduce.
- MEMORIAL.md:383 — "Re-ran harness → 11 PASS, 0 FAIL." Not reproducible.
- Commit message at 8374c52 — "All 11 ACs PASS, 0 FAIL at chore-A (`scripts/verify-empirical-acs.sh R47` exit 0; verified mechanically)." Not reproducible.

**Structural irony:** This is the Rule 1 sub-class anti-pattern (declarative attestation reified into spec text without re-running the command at chore-A) at *the round tightening that very anti-pattern*. The substantive defense stack now has 4 verifier-tightening patterns documented in `SPEC-AUTHORING-CHECKLIST.md`, but the self-application demonstration at AC-R47-10 falsifies the round's own claim of having applied them.

**Pattern continuity:** This is the 4th consecutive same-round-as-derivation/extension Rule 1 sub-class violation (per MEMORIAL.md:371 chain accounting): R42 MAJOR-1 (99 vs 26) → R43 MINOR-3 (grep-vs-diff) → R44 MAJOR-1 + MINOR-1/2/4 (canonical-name drift + attestation-vs-diff conflation) → R45 CRITICAL-1 (grep returns 14 vs 7) → R46 MAJOR-1/2/3 (self-confirming + SHA drift + source-grep) → R47 CRITICAL-1 (recursion-hang attested as exit 0). The structural-fix surface keeps moving up, but each round's self-application catches at least one same-class instance at the derivation/tightening round.

**Recommended remediation paths (Reviewer DOES NOT prescribe; operator decision):**

- Option A — replace AC-R47-10's verifier body with a non-recursive substantive check: invoke `scripts/pre-commit-rule-sweep.sh` from a *different* round's SHAs (or a synthetic test SHA range with no R47 spec in diff), so `rule_1_check` does NOT re-invoke verify-empirical-acs.sh R47. Stdout-grep then becomes a genuine runtime-behavior check without recursion.
- Option B — guard `pre-commit-rule-sweep.sh:rule_1_check` against same-round recursion (e.g., env var `_PRE_COMMIT_RULE_SWEEP_DEPTH` with hard cap = 1). Would modify `scripts/` which R47 anti-scope prohibits → must amend ALLOWED_SET first (or push to R48).
- Option C — drop AC-R47-10's self-application demonstration; the spec-text version ("Q-R47-EMPIRICAL.sh exits 0 via the harness") is a vacuous meta-AC anyway (CRITICAL-2). Tightening 1 explicitly prohibits such ACs. Replacing with a substantive non-self-referential AC would close both CRITICAL-1 and CRITICAL-2.

### CRITICAL-2 — AC-R47-10 spec text is itself a vacuous meta-AC (violates R47's own Tightening 1)

**File:line evidence:** Q-R47-SPEC.md:174-175 reads:

> **AC-R47-10 (self-application — Q-R47-EMPIRICAL.sh exits 0 via the harness):**
> Verification: `scripts/verify-empirical-acs.sh R47` exits 0.

This describes exactly the anti-pattern R47's own Tightening 1 prohibits. From the new SPEC-AUTHORING-CHECKLIST.md § "Tightening: Avoid vacuous meta-ACs (R47)" (line 215-244):

> The AC asserts a property — "this file exits 0" — that IS the aggregate of all other ACs. Hard-coding PASS makes the AC vacuous; the real binding is the aggregate exit code, which would happen regardless of this AC's presence.

AC-R47-10's spec text claims to verify "Q-R47-EMPIRICAL.sh exits 0 via the harness." But the harness exit code IS the aggregate of AC-R47-1 through AC-R47-9. Making AC-R47-10 an AC of itself is structurally circular — the exact case Tightening 1 documents. The R47 verifier's actual implementation at line 204 attempts to "rescue" this by checking a different property (the stdout-grep of `pre-commit-rule-sweep.sh`), but that runs into CRITICAL-1's recursion.

This is structurally the same class as R46 MAJOR-1 (AC-R46-6 self-confirming PASS), recurring at the round that derives Tightening 1 as the fix. Pattern: rule-derivation-without-self-application (Rule 5) at the derivation round.

### MAJOR-1 — Spec-vs-verifier command divergence at AC-R47-7 (Rule 1 sub-class discipline violation)

**File:line evidence:**

- Q-R47-SPEC.md:165: "Verification: `grep -c 'asserted by aggregate' coordination/specs/Q-R47-EMPIRICAL.sh` == 0."
- Q-R47-EMPIRICAL.sh:143: `ACTUAL=$(grep -cE '^[[:space:]]*echo "  PASS.*aggregate exit' coordination/specs/Q-R47-EMPIRICAL.sh)`

Two different commands. The spec text says `grep -c 'asserted by aggregate' …`; the verifier executes `grep -cE '^[[:space:]]*echo "  PASS.*aggregate exit' …`. Both happen to return 0 at HEAD, but the Rule 1 sub-class discipline canonically states (SPEC-AUTHORING-CHECKLIST.md:178-187):

> Every AC that asserts a numeric value, grep output, count, … MUST express the verification as an executable shell command in the spec. The attestation in NEXT-ROLE.md / MEMORIAL.md MUST be the actual output of running that command at chore-A SHA…

The spec carries the command; the verifier runs THAT command. Divergence breaks the spec-as-binding chain. NEXT-ROLE.md:64 documents the Implementer's awareness ("loose AC-R47-7 grep matched its own documentation reference (Liar's Paradox); … Tightened to `^[[:space:]]*echo "  PASS.*aggregate exit`") but the SPEC TEXT was not updated to match. Spec amendments to the AC command must happen IN the spec, not silently in the verifier.

Recommended remediation: amend Q-R47-SPEC.md:165 to quote the actual command run by the verifier — `grep -cE '^[[:space:]]*echo "  PASS.*aggregate exit' coordination/specs/Q-R47-EMPIRICAL.sh == 0` — plus a rationale line explaining why the tighter regex avoids the Liar's Paradox.

### MAJOR-2 — Tightening 4 self-application gap: AC-R47-5 + AC-R47-6 use `≥` thresholds where exact counts are structurally fixed

**File:line evidence:**

- AC-R47-5 (Q-R47-SPEC.md:159, Q-R47-EMPIRICAL.sh:120): `assert_ge "AC-R47-5" "1" "$ACTUAL"`. Actual count is **exactly 1** (Q-R47-EMPIRICAL.sh:204 is the only line matching). The spec could have used `== 1`.
- AC-R47-6 (Q-R47-SPEC.md:162, Q-R47-EMPIRICAL.sh:129): `assert_ge "AC-R47-6" "2" "$ACTUAL"`. Actual count is **exactly 7** (NEXT-ROLE.md:51 cites "7 `git rev-parse|diff` invocations"). Spec could have used `== 7`.

R47's own Tightening 4 (SPEC-AUTHORING-CHECKLIST.md:303-321, "Prefer exact counts over `≥ 1` thresholds") states:

> Anti-pattern: `grep -c '...' file -ge 1` — passes on any non-zero count. Incidental matches in prose silently satisfy the threshold.
> Tightened pattern: use exact count where structural meaning supports it.

The Implementer's own file header at Q-R47-EMPIRICAL.sh:15 states "Exact counts: ACs use `== expected` not `>= 1` where possible." But AC-R47-5 and AC-R47-6 use `>=` thresholds. Within R47, the actual counts are structurally fixed by R47's own file content — exact counts ARE possible and ARE the tightened pattern. This is a same-round-as-derivation Tightening 4 self-application gap.

Recommended remediation: change both ACs to `assert_eq "AC-R47-5" "1" "$ACTUAL"` and `assert_eq "AC-R47-6" "7" "$ACTUAL"`. Update SPEC text to match.

### MAJOR-3 — Spec-vs-verifier command divergence at AC-R47-10

**File:line evidence:**

- Q-R47-SPEC.md:174-175: "Verification: `scripts/verify-empirical-acs.sh R47` exits 0."
- Q-R47-EMPIRICAL.sh:203-205: `ACTUAL=$(scripts/pre-commit-rule-sweep.sh "$ROUND_START_SHA" HEAD 2>&1 | grep -c 'MECHANICAL CHECK via sub-class verifier'); assert_eq "AC-R47-10" "1" "$ACTUAL"`.

Different verification mechanisms entirely. The spec text says "harness exits 0" (vacuous meta-AC, see CRITICAL-2). The verifier instead runs pre-commit-rule-sweep.sh and counts a label in stdout. Same class as MAJOR-1 (spec/verifier divergence) compounding CRITICAL-1 (recursion) and CRITICAL-2 (vacuous meta-AC).

### MINOR-1 — Tightening 3 partial self-application: ROUND_START_SHA is a memorized literal canonicalized by git

**File:line evidence:** Q-R47-EMPIRICAL.sh:67 — `ROUND_START_SHA=$(git rev-parse 1049a52 2>/dev/null || echo "")`.

The `1049a52` literal is hardcoded — exactly the kind of memorized SHA Tightening 3 (SPEC-AUTHORING-CHECKLIST.md:275-301) was written to discourage. `git rev-parse` here canonicalizes a memorized literal to its full SHA but does not derive the round-start from git state. A more substantive self-application would compute round-start as e.g. `git rev-parse HEAD~1` (when chore-A is the immediate parent) or accept a CLI arg. The PASS attestations at AC-R47-6 (7 git invocations) and AC-R47-8 (diff scope) still operate correctly because the memorized literal IS the right SHA — but the discipline being demonstrated is partial.

### MINOR-2 — Structural circularity in AC-R47-5 + AC-R47-6 (self-confirming class)

**File:line evidence:**

- AC-R47-5 checks "verifier contains stdout-grep pattern" — only matches Q-R47-EMPIRICAL.sh:204 (AC-R47-10's implementation).
- AC-R47-6 checks "verifier re-derives SHAs via git" — primarily matches the round-boundary block at lines 67-68 and the AC-R47-8 block at line 152.

If AC-R47-10's implementation were removed, AC-R47-5 would fail. If the round-boundary block were removed, AC-R47-6 would fail. These ACs verify properties of the verifier file that exist BECAUSE of the verifier's own structure. Smaller-scale than R46 MAJOR-1's self-confirming PASS, but the same pattern shape: the AC's PASS state is structurally tied to the verifier's own implementation choices rather than to an independent spec-binding observable.

### MINOR-3 — Halt-discipline gap: Implementer did not HALT when verifier could not be empirically verified

**File:line evidence:** Q-R47-SPEC.md:208-211 enumerates halt conditions. #1 reads "Q-R47-EMPIRICAL.sh exits non-zero at chore-A: HALT + DIAGNOSTIC." A verifier that *cannot terminate* satisfies this condition trivially (it never exits 0). The Implementer should have HALT+DIAGNOSTIC'd; instead, they attested exit 0.

NEXT-ROLE.md:68-71 lists "3 halt conditions encountered" — none are the AC-R47-10 recursion. The Implementer documented 3 caught bugs in MEMORIAL.md:385 but did not document discovering the recursion. Either (a) the recursion was not triggered during the Implementer's session (possible if the Implementer ran AC blocks individually rather than the full harness), in which case the "Re-ran harness → 11 PASS, 0 FAIL" attestation in MEMORIAL.md:385 is incorrect about HOW the verification was performed; or (b) the recursion was triggered and the Implementer reframed it. Either way, the attestation does not match what `scripts/verify-empirical-acs.sh R47` produces at chore-A.

### OBS-1 — R46 deliverables anti-scope holds (PASS)

`git diff 1049a52 HEAD -- coordination/specs/Q-R46-EMPIRICAL.sh coordination/specs/Q-R46-SPEC.md` → 0 lines. Both files unchanged from R46 close. Anti-scope clean (Q-R47-SPEC.md:181 explicit anti-scope clause).

### OBS-2 — Substantive deliverable (4 tightening sub-sections in SPEC-AUTHORING-CHECKLIST.md) is sound

Lines 215-321 of SPEC-AUTHORING-CHECKLIST.md introduce 4 new sub-sections inside § "Empirical-AC discipline" — each follows the established documentation pattern (anti-pattern example + tightened pattern + rationale + R46 finding citation). The content is correct, accurate, and useful for future rounds. The R47 substantive deliverable, as documented prose in the checklist, lands cleanly. The CRITICAL-1/2 + MAJOR findings are at the self-application demonstration layer, not at the prose-deliverable layer.

### OBS-3 — `pre-commit-rule-sweep.sh:rule_1_check` recursion vulnerability is a SCRIPT-side issue surfaced by R47

The infinite recursion exists because R46's MECHANICAL upgrade of `rule_1_check` (pre-commit-rule-sweep.sh:96-119, derived from R46 chore-A 5eff16e) unconditionally invokes `verify-empirical-acs.sh "$round_num"` whenever a round-spec is in the diff — with no guard against re-entry from within a Q-RNN-EMPIRICAL.sh that itself invokes pre-commit-rule-sweep.sh (Tightening-2 style). R46 was safe because Q-R46-EMPIRICAL.sh did NOT invoke pre-commit-rule-sweep.sh. R47 is the first round whose Q-RNN-EMPIRICAL.sh invokes pre-commit-rule-sweep.sh — surfacing the latent recursion. Anti-scope correctly prohibits R47 from modifying `scripts/`, so the script-side guard is for a future round (R48 candidate). Reviewer does not classify this as a finding against R47's diff — only as context for understanding CRITICAL-1.

### OBS-4 — 0-CRITICAL streak ends at R46

R02-R46 = 45 consecutive 0-CRITICAL rounds (per MEMORIAL.md:361 R46 Reviewer confirmation). R47 introduces 1 CRITICAL (and a co-classified CRITICAL-2). For operator's chain-level pattern awareness.

---

## § 3. Right-reasons audit (3 ACs)

### AC-R47-2 — Tightening 1 sub-section exists in SPEC-AUTHORING-CHECKLIST.md

- **Spec requirement:** SPEC-AUTHORING-CHECKLIST.md contains `### Tightening: Avoid vacuous meta-ACs` header.
- **Verifier:** `grep -cE '^### Tightening: Avoid vacuous meta-ACs' coordination/SPEC-AUTHORING-CHECKLIST.md == 1`.
- **Right reasons check:** PASS because the section was actually added to the file (line 215). Line-anchored grep with exact count. Substantive; not self-confirming. ✓

### AC-R47-7 — R47 verifier has no inert meta-AC anti-pattern

- **Spec requirement:** Q-R47-EMPIRICAL.sh does NOT contain anti-pattern `PASS — AC-R47-N (asserted by aggregate`. Verification per spec: `grep -c 'asserted by aggregate' ... == 0`.
- **Verifier:** Uses a DIFFERENT command — `grep -cE '^[[:space:]]*echo "  PASS.*aggregate exit' ... == 0`.
- **Right reasons check:** PASS-with-divergence. The substantive property the spec wants to verify ("no PASS — asserted by aggregate anti-pattern") DOES hold at HEAD. But the AC is PASSING because the verifier ran a different (tighter, also-passing) command than the one spec text described. This violates Rule 1 sub-class discipline — the spec command and verifier command must match. See MAJOR-1.

### AC-R47-10 — self-application / harness exits 0

- **Spec requirement:** `scripts/verify-empirical-acs.sh R47 exits 0`.
- **Verifier:** Runs `scripts/pre-commit-rule-sweep.sh "$ROUND_START_SHA" HEAD 2>&1 | grep -c 'MECHANICAL CHECK via sub-class verifier' == 1`.
- **Right reasons check:** FAIL — for THREE distinct reasons.
  1. Spec text describes a vacuous meta-AC (the harness's exit code IS the aggregate of all other ACs; CRITICAL-2).
  2. Verifier diverges from spec text (MAJOR-3).
  3. Verifier creates infinite recursion via pre-commit-rule-sweep.sh; harness does NOT exit 0 at chore-A or HEAD; Implementer's attestation contradicts empirical observation (CRITICAL-1).
- This is a self-confirming-test failure of the most severe class: the AC purports to demonstrate that R47 has correctly self-applied Tightenings 1-2, but the implementation falsifies both (vacuous + recursive).

---

## § 4. Cross-cutting checks

- **TDD discipline:** N/A — methodology round; no production-code TDD surface. R47 is a docs + verifier round.
- **No-skip / halt discipline:** **FAIL.** Per § 8 halt condition #1 ("Q-R47-EMPIRICAL.sh exits non-zero at chore-A: HALT + DIAGNOSTIC"), a verifier that cannot terminate satisfies the halt condition. The Implementer attested exit 0 instead of HALT'ing. See MINOR-3 + CRITICAL-1.
- **Anti-scope:** **PASS.** `git diff --name-only 1049a52 HEAD` produces exactly 5 files, all ⊆ ALLOWED_SET. Zero `engine/`, `test/`, `scripts/`, `CLAUDE-*.md`, `MEMORIAL-PHASE-*.md`, `CROSS-PROJECT-MEMORIAL.md`, `Q-R46-*`, `SCOPING-MEMO`, `PRD` modifications. R47 anti-scope clean. R46 deliverables (Q-R46-SPEC.md + Q-R46-EMPIRICAL.sh) byte-identical to R46 close.
- **Reinforcements applied:** Rule 7 § 7 enumerates all 7 rules with canonical short names (per R44 MAJOR-1 reinforcement). Cross-project canonical landing deferred per Rule 7 anchor-canonical-landing-deferred precedent.
- **Test baseline:** **PASS.** Empirically verified at HEAD: `node --test test/*.test.js` → tests=361, pass=356, fail=2, skipped=3. `npx tsc -p tsconfig.test.json` exit 0.

---

## § 5. Grilling output (before routing)

- Every finding has a file:line reference? **yes** — every CRITICAL/MAJOR/MINOR finding cites concrete `file:line` evidence (Q-R47-SPEC.md, Q-R47-EMPIRICAL.sh, SPEC-AUTHORING-CHECKLIST.md, NEXT-ROLE.md, MEMORIAL.md, pre-commit-rule-sweep.sh, verify-empirical-acs.sh).
- Any AC marked PASS without actual verification? **no** — each PASS in § 1 cites the verifier output Reviewer independently observed. PARTIAL/FAIL findings are explicitly enumerated.
- Right-reasons audit completed for 3+ tests? **yes** — § 3 covers AC-R47-2, AC-R47-7, AC-R47-10 (one strict-PASS, one PASS-with-divergence, one FAIL).
- CRITICAL severity rationale documented? **yes** — CRITICAL-1 (recursion + false attestation) and CRITICAL-2 (vacuous meta-AC in spec text) are both substantively load-bearing, not attestation-cosmetic. CRITICAL-1's attestation IS structurally impossible at HEAD; this is not a "wrong number quoted" but a "claimed outcome cannot occur" failure.
- Pre-CLAUDE-REVIEWER 2026-05-19 reinforcement (operator-decision routing flag for CRITICAL): see § Routing below.
- Adversarial yield: ≥1 finding (the mandate). Reviewer found 1 CRITICAL + 1 co-classified CRITICAL + 3 MAJOR + 3 MINOR + 4 OBS = 11 findings. The mandate "assume the Implementer made at least one mistake; find it" is satisfied.

---

## § 6. Routing

**STATUS: ESCALATE.**

Per CLAUDE-REVIEWER.md (reinforcement REINFORCED 2026-05-19, R45 precedent): when a CRITICAL finding's severity is attestation-level rather than substantive-deliverable-level, the Reviewer should ESCALATE with operator-decision framing rather than route MERGE-READY unilaterally.

For R47, the substantive deliverable (4 tightening sub-sections documented in SPEC-AUTHORING-CHECKLIST.md per OBS-2) IS sound. The CRITICAL findings are at the self-application demonstration layer:

- CRITICAL-1 is the harness recursion — an attestation contradicted by empirical reproduction.
- CRITICAL-2 is the vacuous meta-AC in the spec text — a self-application gap of R47's own Tightening 1.

Operator decision required: route ESCALATE (strict reading: CRITICAL findings exist → ESCALATE; substantively the round's discipline goal is undermined by the AC-R47-10 self-application failure) versus route MERGE-READY-with-reservations (substantive deliverable lands; AC-R47-10 is a same-round-as-derivation self-application gap of the kind the Tessera methodology routinely catches and documents as VIOLATIONS in MEMORIAL without blocking close — see R46's own 3 MAJOR self-application failures which routed MERGE-READY).

**Reviewer's leaning** (recorded per CLAUDE-REVIEWER.md REINFORCED 2026-05-19 strict-routing reading): ESCALATE is the canonical call. The fact that CRITICAL-1 is also a *false-compliance-attestation in the round tightening false-compliance-attestation* gives this a different weight than a routine same-round-as-derivation violation. Operator should explicitly decide whether to accept the false attestation in NEXT-ROLE.md / MEMORIAL.md / 8374c52 commit message as historical baseline (analogous to R46's preservation of Q-R46-EMPIRICAL.sh as historical baseline) or require a chain-extension R48 closure of the loop.

**Inputs for Memorial-Updater (if operator selects MERGE-READY):**

- Append VIOLATION entries for each finding at MINOR+ severity (per CLAUDE-REVIEWER.md REINFORCED 2026-05-17 discipline).
- Update R47 chain accounting in NEXT-ROLE.md if R48 follow-up authorized.
- Consider Rule 7 Surface (c) HARD-GATE candidate elevation given the same-round-as-derivation pattern now spans R32 (Rule 3) + R36 (Rule 6) + R39 (Rule 5/R06) + R43 (Rule 5/R39) + R44 (Rule 7) + R46 (Rule 1 sub-class) + R47 (Rule 1 sub-class tightening) = 7 same-class tessera instances.

**Inputs for chain extension R48 (if operator selects ESCALATE → fix):**

- AC-R47-10 needs either (a) replacement with a non-recursive substantive check, or (b) deletion as a vacuous meta-AC per Tightening 1.
- AC-R47-5 + AC-R47-6 → convert `>=` to `==` per Tightening 4.
- AC-R47-7 spec text → align with verifier command.
- AC-R47-10 spec text → align with verifier command (if AC-R47-10 retained).
- `pre-commit-rule-sweep.sh:rule_1_check` → add same-round-recursion guard (R48 expands ALLOWED_SET to include `scripts/pre-commit-rule-sweep.sh`).

---

## § 7. Files written / not modified

- **Written:** `coordination/reviews/REVIEWER-REPORT-R47.md` (this file).
- **Not modified:** All source / engine / test / scripts files; all spec files; CLAUDE-*.md; MEMORIAL.md (Memorial-Updater appends after Reviewer routing per pipeline discipline); NEXT-ROLE.md (Memorial-Updater updates after this report routes).

Reviewer role boundary maintained: documented findings only; did not fix, re-implement, or amend any artifact.

---

_Reviewer report ends. Routing: **STATUS: ESCALATE** for operator decision per CLAUDE-REVIEWER.md REINFORCED 2026-05-19. Reviewer's recommendation: ESCALATE → R48 chain extension to close the AC-R47-10 self-application loop (operator's call on accept-vs-fix per R46 historical-baseline precedent)._
