# Reviewer Report — R48

**Round:** R48 (audit-tier; fix R47 CRITICAL-1/2 + MAJOR-1/2/3)
**Reviewer:** REVIEWER (cold-read, adversarial)
**Round-start SHA:** `6e8b1c6` (chore(R47): Memorial-Updater outputs)
**HEAD at audit:** `a2e798d` (chore(R48): NEXT-ROLE.md SHA backfill)
**Chore-A SHA (per attestation):** `d593720`
**Routing:** **MERGE-READY** (no CRITICAL; 1 MAJOR + 3 MINOR + 4 OBS)

---

## § 1. Per-AC verification table

| AC-ID | Criterion (short) | Status | Evidence (file:line or command) |
|---|---|---|---|
| AC-R48-1 | Q-R48-EMPIRICAL.sh exists + executable + syntax-valid | **PASS** | `[ -x Q-R48-EMPIRICAL.sh ]` true; `bash -n Q-R48-EMPIRICAL.sh` → ok. `Q-R48-EMPIRICAL.sh:55-61` |
| AC-R48-2 | Recursion guard fires when env var set (stdout-grep; Tightening 2) | **PASS** | `_PRE_COMMIT_RULE_SWEEP_ACTIVE=1 scripts/pre-commit-rule-sweep.sh 6e8b1c6 HEAD 2>&1 \| grep -c 'recursion guard active'` → 1. Guard at `scripts/pre-commit-rule-sweep.sh:67-73` |
| AC-R48-3 | AC-R47-5 uses `assert_eq "1"` not `assert_ge` | **PASS** | `Q-R47-EMPIRICAL.sh:120` has `assert_eq "AC-$ROUND-5" "1"`; no `assert_ge "AC-$ROUND-5"` in file (counts 0/1 from independent re-run) |
| AC-R48-4 | AC-R47-6 uses `assert_eq "7"` not `assert_ge` | **PASS** | `Q-R47-EMPIRICAL.sh:129` has `assert_eq "AC-$ROUND-6" "7"`; no `assert_ge "AC-$ROUND-6"` (0/1) |
| AC-R48-5 | AC-R47-7 spec-text aligned (old grep absent; new tighter grep present) | **PASS** | `grep -cF "grep -c 'asserted by aggregate'" Q-R47-SPEC.md` → 0; `grep -cE 'PASS\.\*aggregate exit' Q-R47-SPEC.md` → 1 (at `Q-R47-SPEC.md:167`) |
| AC-R48-6 | AC-R47-10 non-recursive (old recursive grep absent; guard-testing prefix present) | **PASS** | `grep -cF 'MECHANICAL CHECK via sub-class verifier' Q-R47-EMPIRICAL.sh` → 0; `grep -cF '_PRE_COMMIT_RULE_SWEEP_ACTIVE=1' Q-R47-EMPIRICAL.sh` → 1 (at `Q-R47-EMPIRICAL.sh:204`) |
| AC-R48-7 | Anti-scope diff ⊆ ALLOWED_SET (7 paths) | **PASS** | `git diff --name-only 6e8b1c6 HEAD` returns 7 paths, all in ALLOWED_SET (independently verified) |
| AC-R48-8 | Test baseline 361/355/3/3; tsc exit 0 | **PASS (verifier-level)** — see MAJOR-1 + MINOR-1 | `node --test ...` independently → `tests 361 / pass 355 / fail 3 / skipped 3`. `tsc -p tsconfig.test.json` → exit 0. Echo header at `Q-R48-EMPIRICAL.sh:179` is stale (MINOR-1) and that staleness is reflected by an attestation-transcript discrepancy (MAJOR-1) |

All 8 ACs PASS on independent re-run of `scripts/verify-empirical-acs.sh R48`. Independent run confirmed at HEAD=`a2e798d` (the SHA-backfill commit). Findings below concern transcript fidelity and spec-internal consistency, not AC failure.

---

## § 2. Findings

### MAJOR-1 — Rule 1 sub-class `encode-actual-results-verbatim` violation in chore-A attestation transcript

**Where:** `coordination/NEXT-ROLE.md:130` vs `coordination/specs/Q-R48-EMPIRICAL.sh:179`.

**What:** The Implementer's chore-A attestation transcribes the AC-R48-8 echo header as:

```
AC-R48-8: test baseline = 361/355/3/3; tsc exit 0
```

(NEXT-ROLE.md:130). But the actual verifier code at `Q-R48-EMPIRICAL.sh:179` echoes:

```bash
echo "AC-$ROUND-8: test baseline = 361/356/2/3; tsc exit 0"
```

When `scripts/verify-empirical-acs.sh R48` is re-run independently, the stdout reads `AC-R48-8: test baseline = 361/356/2/3; tsc exit 0` (the stale `361/356/2/3` from before the operator amendment), NOT `361/355/3/3` as the attestation transcript shows.

**Why MAJOR (not CRITICAL):** The substantive deliverable is functionally correct — the verifier's `assert_eq` at `Q-R48-EMPIRICAL.sh:186` checks against the corrected `361/355/3/3` and PASSes. The discrepancy is in the attestation transcript only; the verdict itself is sound. Not CRITICAL because it doesn't block correctness of the merge.

**Why MAJOR (not MINOR):** R48 is precisely the round that fixes Rule 1 sub-class `false-compliance-attestation` / `encode-actual-results-verbatim` violations (the canonical CROSS-PROJECT-MEMORIAL.md REINFORCED 2026-05-18 rule). Reproducing the same class of violation in R48's own attestation — silently rewriting the echo text to match the corrected literal rather than encoding the verbatim output — is exactly the failure mode this round was supposed to close. It is the audit-trail twin of R47 MAJOR-1 (spec/verifier text drift).

**Reproduction:**

```
$ scripts/verify-empirical-acs.sh R48 2>&1 | grep 'AC-R48-8:'
AC-R48-8: test baseline = 361/356/2/3; tsc exit 0
```

vs `NEXT-ROLE.md:130`: `AC-R48-8: test baseline = 361/355/3/3; tsc exit 0`. Direct contradiction.

**Required fix (post-merge, R49 candidate):** Either (a) update `Q-R48-EMPIRICAL.sh:179` echo to read `361/355/3/3` (cleanup of MINOR-1 below; would also make the verbatim transcription correct), OR (b) amend the NEXT-ROLE.md transcript to encode the actual stale echo header + a "(stale; verifier asserts against 361/355/3/3 — corrected per operator resolution)" annotation. Path (a) is preferred because it fixes the root.

---

### MINOR-1 — Stale echo header in Q-R48-EMPIRICAL.sh (root cause of MAJOR-1)

**Where:** `coordination/specs/Q-R48-EMPIRICAL.sh:179`.

**What:** When the operator-resolved Option A amendment (NEXT-ROLE.md § Operator resolution, top of file) was applied to convert AC-R48-8's expected baseline from `361/356/2/3` to `361/355/3/3`, the `assert_eq` at line 186 was updated but the `echo` at line 179 was missed. The verifier now prints a misleading header before asserting against the corrected value:

```
AC-R48-8: test baseline = 361/356/2/3; tsc exit 0   ← stale display
  PASS — AC-R48-8 (test summary)
    actual:   361/355/3/3                            ← corrected assertion
```

**Why MINOR (not MAJOR):** Cosmetic display drift; functional assertion is correct. But this is the load-bearing condition that creates the attestation-transcript discrepancy in MAJOR-1.

**Required fix:** `echo "AC-$ROUND-8: test baseline = 361/355/3/3; tsc exit 0"` at line 179.

---

### MINOR-2 — Spec-internal inconsistency: `timeout 30` in § 3.2 mechanism but absent from § 5 AC-R48-2

**Where:** `coordination/specs/Q-R48-SPEC.md:76` (§ 3.2 mechanism) vs `Q-R48-SPEC.md:129` (§ 5 AC-R48-2) vs `Q-R48-EMPIRICAL.sh:72-74` (implementation).

**What:** § 3.2 prescribes the AC-R47-10 replacement code with `timeout 30`:

```bash
ACTUAL=$(_PRE_COMMIT_RULE_SWEEP_ACTIVE=1 timeout 30 \
    scripts/pre-commit-rule-sweep.sh "$ROUND_START_SHA" HEAD 2>&1 \
    | grep -c 'recursion guard active')
```

But § 5 AC-R48-2 verification text (line 129) and the actual verifier at `Q-R48-EMPIRICAL.sh:72-74` omit `timeout 30`. The Implementer disclosed this as TD-1 ("macOS lacks `timeout` command"), but the spec itself remains internally inconsistent — the Architect-hat-wearing-Implementer authored both sections in the same audit-tier round and should have made them agree at spec-emit time.

**Why MINOR (not MAJOR):** The functional safety net (`timeout 30`) is rendered unnecessary by the guard itself, which fires immediately on env-var check before any potentially-recursive call. Verifier behaves correctly without timeout. But the spec-internal inconsistency is a Architect-discipline lapse (audit-tier Implementer wears the Architect hat per CLAUDE-COMMON.md tier-selection).

**Required fix:** Either remove `timeout 30` from § 3.2 (consistency with § 5 + implementation), OR add a platform-availability note to § 3.2 stating the timeout is conditional on GNU coreutils. TD-1 disclosure should have been a spec amendment, not an implementation deviation.

---

### MINOR-3 — § 3.5 known-limitation block enumerates AC-R47-8 post-R48 failure but not AC-R47-9

**Where:** `coordination/specs/Q-R48-SPEC.md:99-101` (§ 3.5).

**What:** § 3.5 acknowledges that `scripts/verify-empirical-acs.sh R47` post-R48 will show AC-R47-8 FAIL (R48 files outside R47's ALLOWED_SET). Independent re-run shows AC-R47-9 ALSO fails post-R48:

```
AC-R47-9: test baseline = 361/356/2/3
  FAIL — AC-R47-9 (test summary)
    expected: 361/356/2/3
    actual:   361/355/3/3
```

The 361/355/3/3 baseline was introduced by R47 MU commit `6e8b1c6` (= R48 ROUND_START), per the operator-resolved baseline at NEXT-ROLE.md § Operator resolution. R47's verifier still asserts against the pre-R47-MU baseline `361/356/2/3` and fails. The R48 spec § 6 anti-scope correctly excludes Q-R47-EMPIRICAL.sh AC-R47-9 from amendment (items (a)/(b)/(c) cover AC-R47-5/6/7/10 only), so the verifier file is correctly untouched — but the § 3.5 known-limitation block should have enumerated this second failure surface for audit-trail completeness.

**Why MINOR (not MAJOR):** Anti-scope decision was correct; only documentation completeness is at issue.

**Required fix:** Extend § 3.5 paragraph to read: "Running `scripts/verify-empirical-acs.sh R47` post-R48 will show AC-R47-8 FAIL (ALLOWED_SET drift) AND AC-R47-9 FAIL (test baseline drift introduced by R47 MU `6e8b1c6`; pre-existing per operator-resolved baseline). Both are expected consequences of post-R47 state, not regressions caused by R48."

---

### OBS-1 — pre-commit-rule-sweep.sh against R48 diff range raises a mechanical finding (`head -1` edge case)

**Where:** `scripts/pre-commit-rule-sweep.sh:84` (`| head -1` selection).

**What:** When R48's diff includes BOTH Q-R47-SPEC.md and Q-R48-SPEC.md (R48 modifies R47 spec text per item (c)), `rule_1_check` picks the alphabetically-first spec (`Q-R47-SPEC.md`) and runs `scripts/verify-empirical-acs.sh R47`. R47's verifier fails AC-R47-8 + AC-R47-9 post-R48 (see MINOR-3), so `rule_1_check` raises a mechanical finding and `pre-commit-rule-sweep.sh` exits 1:

```
$ scripts/pre-commit-rule-sweep.sh 6e8b1c6 HEAD ; echo $?
...
Sweep summary:
  Mechanical findings: 1
  Semantic checks required (manual): 6
EXIT 1 — mechanical rule violations detected
1
```

This is NOT a regression caused by R48 — the `| head -1` selector is the existing helper limitation. R48's diff range happens to exercise the edge case (two spec files in one diff).

**Why OBS (not finding):** No spec halt-condition was triggered; halt condition #2 (Q-R48-SPEC.md § 8) only specifies "recursion guard breaks `rule_7_check` mechanical mode" — `rule_7_check` correctly enumerates 7 rules for both Q-R47-SPEC.md and Q-R48-SPEC.md (independently verified). Rule 1 sub-class behavior was not part of R48's halt-discipline contract.

**Forward-looking note (for future round, not R48):** Either improve `rule_1_check` to iterate over all specs in the diff (not just `head -1`), or scope the round so that only one spec is touched per round. Carry forward as a candidate for the next methodology round.

---

### OBS-2 — Right-reasons audit on AC-R48-2 / AC-R48-3 / AC-R48-6

(See § 3 below.)

---

### OBS-3 — Halt-discipline correctly applied at R48 baseline mismatch

**Where:** `coordination/diagnostics/DIAGNOSTIC-R48-baseline.md` (referenced in NEXT-ROLE.md § Operator resolution).

**What:** When the Implementer hit the baseline-literal mismatch (spec said `361/356/2/3`; actual was `361/355/3/3`), they correctly HALTED + wrote a DIAGNOSTIC + set STATUS: ESCALATE. The operator resolved via Option A (amend spec + verifier), and the Implementer correctly resumed with the amendment applied. This is the canonical Rule 1 sub-class halt-discipline behavior R48 is meant to encode. Good practice.

**Why OBS:** Confirmation, no required action.

---

### OBS-4 — TD-1 + TD-2 transparency disclosures are good practice but TD-1 should have been a spec amendment

**Where:** NEXT-ROLE.md:138-139.

**What:** The Implementer disclosed two deviations transparently: TD-1 (`timeout` command missing) and TD-2 (spec uses `<ROUND_START_SHA>` placeholder rather than concrete SHA). TD-2 is genuinely a placeholder convention (spec describes pattern; verifier resolves at runtime) — that's fine. TD-1 is the spec-internal inconsistency surfaced in MINOR-2; the disclosure is a workaround that the Implementer chose ("tactical autonomy") rather than HALTing to amend the spec.

**Why OBS:** Disclosures themselves are good practice; the underlying inconsistency is MINOR-2. Recording here to note that future rounds should prefer "amend spec via DIAGNOSTIC + operator confirmation" over silent tactical autonomy when the spec is internally inconsistent.

---

## § 3. Right-reasons audit (3 ACs)

### AC-R48-2 (recursion guard fires at runtime)

- **Spec requirement:** § 5 AC-R48-2 — invoking pre-commit-rule-sweep.sh with `_PRE_COMMIT_RULE_SWEEP_ACTIVE=1` set causes `rule_1_check` to fire the guard and print "recursion guard active" exactly once.
- **Test:** `_PRE_COMMIT_RULE_SWEEP_ACTIVE=1 scripts/pre-commit-rule-sweep.sh "$ROUND_START_SHA" HEAD 2>&1 | grep -c 'recursion guard active'` == 1 (`Q-R48-EMPIRICAL.sh:72-75`).
- **Does it pass for right reasons?** YES. The test runs the actual script with env-var set; the guard at `scripts/pre-commit-rule-sweep.sh:67-72` fires immediately on entry (before any nested verify-empirical-acs.sh invocation), prints "recursion guard active" exactly once at line 68, returns 0. Stdout-grep counts 1. If the guard is removed, the test fails (stdout would have 0 matches). Non-vacuous, runtime-bound, structurally fail-safe. **Genuine.**

### AC-R48-3 (AC-R47-5 uses exact count)

- **Spec requirement:** § 5 AC-R48-3 — Q-R47-EMPIRICAL.sh's AC-R47-5 binding converted from `assert_ge` to `assert_eq "1"` (Tightening 4 self-application).
- **Test:** Two grep counts: `grep -cF 'assert_ge "AC-$ROUND-5"' Q-R47-EMPIRICAL.sh` == 0 AND `grep -cF 'assert_eq "AC-$ROUND-5" "1"' Q-R47-EMPIRICAL.sh` == 1 (`Q-R48-EMPIRICAL.sh:84-92`).
- **Does it pass for right reasons?** YES. This is a source-grep (not runtime), but the AC is a static-code-state assertion ("the verifier no longer uses assert_ge for this label"), so source-grep is the correct binding. If the Implementer had failed to convert `assert_ge` → `assert_eq`, the first grep would have returned ≥ 1 and the test would FAIL. Genuine. (Note: source-grep is structurally weaker than stdout-grep for runtime behavior, but AC-R48-3 binds source code state, not runtime — appropriate use.)

### AC-R48-6 (AC-R47-10 non-recursive)

- **Spec requirement:** § 5 AC-R48-6 — Q-R47-EMPIRICAL.sh's AC-R47-10 no longer contains the recursive grep literal `MECHANICAL CHECK via sub-class verifier`, and DOES contain the guard-testing env-var prefix `_PRE_COMMIT_RULE_SWEEP_ACTIVE=1`.
- **Test:** Two grep counts: `grep -cF 'MECHANICAL CHECK via sub-class verifier' Q-R47-EMPIRICAL.sh` == 0 AND `grep -cF '_PRE_COMMIT_RULE_SWEEP_ACTIVE=1' Q-R47-EMPIRICAL.sh` == 1 (`Q-R48-EMPIRICAL.sh:135-144`).
- **Does it pass for right reasons?** YES. The recursive pattern is gone (the recursion path Q-R47-EMPIRICAL.sh → verify-empirical-acs.sh → Q-R47-EMPIRICAL.sh is structurally severed) and the new non-recursive guard-testing prefix is present at exactly one location (`Q-R47-EMPIRICAL.sh:204`). If the Implementer had left the recursive pattern in OR omitted the new prefix, the test would FAIL. Pair-grep gives structural completeness (both old-absent AND new-present required). Genuine.

---

## § 4. Cross-cutting checks

### TDD discipline

R48 is a methodology round; no production-code test files are added or modified. The Q-R48-EMPIRICAL.sh empirical-AC verifier serves as the test equivalent (per Rule 1 sub-class). The verifier was committed as part of chore-A (`d593720`), so RED/GREEN separation is not observable via git log. Per CLAUDE-IMPLEMENTER.md, audit-tier methodology rounds do not strictly enforce separate RED commits (R39/R42-R47 precedent in MEMORIAL.md). **N/A — appropriate for round type.**

### No-skip / halt discipline

- The Implementer correctly HALTED + wrote DIAGNOSTIC-R48-baseline.md when the baseline-literal mismatch surfaced (OBS-3).
- The Implementer applied "tactical autonomy" to the `timeout` command absence rather than HALTing for the spec inconsistency (TD-1; underlying issue is MINOR-2). This was a discipline trade-off, not a halt-condition listed in § 8. Acceptable in the context but noted as OBS-4.
- No other halt-conditions in § 8 were triggered (verifier exits 0; no bash syntax errors; rule_7_check still functions; no recursion regression).

### Anti-scope check

`git diff --name-only 6e8b1c6 HEAD` returns exactly 7 paths, all in the ALLOWED_SET enumerated at AC-R48-7:

```
coordination/MEMORIAL.md
coordination/NEXT-ROLE.md
coordination/specs/Q-R47-EMPIRICAL.sh
coordination/specs/Q-R47-SPEC.md
coordination/specs/Q-R48-EMPIRICAL.sh
coordination/specs/Q-R48-SPEC.md
scripts/pre-commit-rule-sweep.sh
```

`coordination/diagnostics/DIAGNOSTIC-R48-baseline.md` exists as an untracked file (git status `??`) and is correctly NOT in the diff. **PASS — diff ⊆ ALLOWED_SET; no out-of-scope work shipped.**

### CROSS-PROJECT-MEMORIAL.md Reviewer section (lessons from prior rounds)

Checked against the relevant rules. The MAJOR-1 finding above is a direct instance of the 2026-05-18 REINFORCED rule `encode-actual-results-verbatim` (Pass 3 promotion to all roles; tessera R03 MINOR-4 + R26 MAJOR-1 + R47 MAJOR-1 origin chain). The finding pattern was specifically flagged in CLAUDE-REVIEWER.md REINFORCED 2026-05-18 ("encode-actual-results-verbatim (MR-2 Pass 3 promotion; all roles)").

---

## § 5. Grilling output (on this report, before routing)

| Check | Verdict |
|---|---|
| Every finding has a file:line reference? | **Yes** — MAJOR-1: `NEXT-ROLE.md:130` + `Q-R48-EMPIRICAL.sh:179`; MINOR-1: `Q-R48-EMPIRICAL.sh:179`; MINOR-2: `Q-R48-SPEC.md:76` + `:129` + `Q-R48-EMPIRICAL.sh:72-74`; MINOR-3: `Q-R48-SPEC.md:99-101`; OBS-1: `pre-commit-rule-sweep.sh:84`. |
| Any AC marked PASS without actual verification? | **No** — every PASS row in § 1 has either an independent re-run command quoted OR a file:line reference for the code that implements/satisfies it. AC-R48-1/8 verified via independent `scripts/verify-empirical-acs.sh R48` invocation + independent `node --test` + `tsc`. |
| Right-reasons audit completed for 3+ tests? | **Yes** — AC-R48-2, AC-R48-3, AC-R48-6 in § 3. Each traces spec → test → genuine-pass-condition. |
| Are recommendations to fix the findings outside the Reviewer role boundary? | **Yes flagged correctly** — "Required fix" sub-points in MAJOR-1 / MINOR-1/2/3 are recommendations for a future round; the Reviewer does not implement them. Documenting findings; not fixing. |
| Adversarial discipline applied? | **Yes** — pre-emptive assumption was "Implementer made at least one mistake." Found MAJOR-1 (transcript falsification in the round that fixes that exact violation class). |

---

## § 6. Routing

**No CRITICAL findings.** Per CLAUDE-REVIEWER.md routing rule (`MAJOR or below → STATUS: MERGE-READY`):

```
STATUS: MERGE-READY
```

**Recommendations for the Memorial-Updater stage:**

1. Record MAJOR-1 as a Rule 1 sub-class `encode-actual-results-verbatim` VIOLATION entry in MEMORIAL.md R48 Reviewer section. The lesson is recursive: the round fixing R47's Rule 1 violations reproduced the same class of violation in its own chore-A attestation. Below the 3-instance threshold for new cross-project rule derivation (R03 + R26 + R47 + R48 all surface this class; threshold already crossed; canonical rule already exists).
2. Record MINOR-1/2/3 as inline VIOLATION entries per CLAUDE-REVIEWER.md REINFORCED 2026-05-17 (Reviewer must echo every MINOR-or-above finding to MEMORIAL.md).
3. OBS-1 carries forward as a candidate for a future methodology round (improve `rule_1_check`'s `| head -1` selector OR scope rounds to one spec at a time).
4. Substantive deliverable is sound: recursion guard works; AC-R47-5/6/7/10 are correctly tightened; spec-text alignment landed.

---

## § 7. Reviewer cold-read attestation

Cold-read inputs: `coordination/PRD.md`, `coordination/specs/Q-R48-SPEC.md`, `coordination/specs/Q-R48-EMPIRICAL.sh`, `coordination/specs/Q-R47-SPEC.md`, `coordination/specs/Q-R47-EMPIRICAL.sh`, `scripts/pre-commit-rule-sweep.sh`, `coordination/NEXT-ROLE.md`, `~/.claude/CROSS-PROJECT-MEMORIAL.md` (Reviewer section grep + REINFORCED 2026-05-18 rules). Independent re-runs of `scripts/verify-empirical-acs.sh R48`, `scripts/verify-empirical-acs.sh R47`, `scripts/pre-commit-rule-sweep.sh 6e8b1c6 HEAD`, `node --test --test-reporter=tap test/*.test.js`, `npx tsc -p tsconfig.test.json`, `git diff --name-only 6e8b1c6 HEAD`, `git log --oneline 6e8b1c6..HEAD`, plus targeted greps documented inline above. Did NOT consult `coordination/diagnostics/DIAGNOSTIC-R48-baseline.md` (per cold-review boundary; only its existence referenced via NEXT-ROLE.md § Operator resolution). Did NOT consult `coordination/logs/` or any `.prompt-*.md` file. Adversarial cold-read independence preserved.
