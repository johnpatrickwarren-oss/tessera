# DIAGNOSTIC-R85-empirical-readme-awk

**Round:** R85
**Role:** IMPLEMENTER
**Halt condition triggered:** § 6.1 Halt condition 1 — `bash Q-R85-EMPIRICAL.sh` exits non-zero at chore-A

---

## Spec claim (exact quote)

Q-R85-SPEC.md § 1.11 (Architect pre-prediction table):
> `bash Q-R85-EMPIRICAL.sh` exit at chore-A: **0** (ALL BLOCKS PASS)

Q-R85-SPEC.md § 5.2:
> `bash coordination/specs/Q-R85-EMPIRICAL.sh` exit code: **0** (predicted 0; all 5 blocks pass at GREEN; Block 4 expects fail=16, pass ∈ [668, 670])

---

## Reality

Running `bash coordination/specs/Q-R85-EMPIRICAL.sh` at implementation-complete HEAD produces:

```
── Block 3: DEMO-SCRIPT.md + README.md presence ──
  PASS: DEMO-SCRIPT.md has ## Contents ToC heading
  PASS: DEMO-SCRIPT.md has Live mode Minute 10:00–12:00 section
  FAIL: README.md Browser dashboard subsection does not mention Live mode
...
── Summary ──
  PASS: 20
  FAIL: 1
```

Exit code: 1 (non-zero). Halt condition 1 fires.

---

## Root cause

The Block 3 awk command in `Q-R85-EMPIRICAL.sh`:

```bash
if awk '/^### Browser dashboard/,/^### /' "$README_FILE" \
   | grep -qi "Live mode"; then
```

The awk range `'/pattern1/,/pattern2/'` starts when `pattern1` matches a line and ends when `pattern2` matches a line (inclusive). In this file, `### Browser dashboard` matches BOTH `^### Browser dashboard` (pattern1) AND `^### ` (pattern2) simultaneously.

When both patterns match the same line, GNU awk prints that line and immediately closes the range — so the range produces exactly ONE line (the heading itself). The subsequent `### CLI scenarios` heading (which would have been the intended range terminator) is never reached.

Verified empirically:
```bash
$ awk '/^### Browser dashboard/,/^### /' README.md | head -5
### Browser dashboard
```

One line extracted. `grep -qi "Live mode"` on one heading line returns false → FAIL.

The README content IS correct: lines 85–91 contain the Live mode paragraph with `DEMO-SCRIPT.md` reference. AC-R85-14 (which uses JS `README.indexOf('### Browser dashboard')` + `README.indexOf('\n### ', subStart + 1)` to extract the section) correctly verifies this and PASSES. The defect is in the EMPIRICAL.sh extraction command only.

---

## Why HALT is required

Per CLAUDE-COMMON.md `prefix-continuity-invariant`: "once the Architect commits the spec triad, no role may modify the contents of ... Q-${round}-EMPIRICAL.sh (beyond pre-prescribed placeholder substitutions such as SHA injection blocks)."

The Implementer cannot amend `Q-R85-EMPIRICAL.sh` to fix the awk command. That amendment belongs to the operator or Architect (per CLAUDE-IMPLEMENTER.md REINFORCED 2026-05-20: "EMPIRICAL.sh is part of the spec triad; Implementer amendments to the spec triad are not acceptable under any conditions").

Per CLAUDE-IMPLEMENTER.md REINFORCED 2026-05-20 (halt-condition-observed-vs-predicted-divergence): "The Implementer procedure is: (1) write DIAGNOSTIC; (2) set STATUS: ESCALATE; (3) STOP."

---

## Options (bounded)

**Option A** — Architect/operator amends `Q-R85-EMPIRICAL.sh` Block 3 awk command to extract the section correctly.

Replacement that works (extracts everything between `### Browser dashboard` and the next `### ` heading):
```bash
if awk '/^### Browser dashboard/{found=1;next} found && /^### /{exit} found' "$README_FILE" \
   | grep -qi "Live mode"; then
```

This version prints lines AFTER the heading until the next `### ` heading, so it correctly captures the paragraph containing "Live mode".

Consequence: EMPIRICAL.sh Block 3 would report PASS. All 5 blocks PASS → exit 0. Green commit proceeds.

**Option B** — Operator accepts the existing AC-R85-14 as sufficient README coverage for this surface, and amends Block 3 to use a simpler direct grep:

```bash
if grep -qi "Live mode" "$README_FILE"; then
```

(Less discriminating — searches all of README — but unambiguous and correct for the README-contains-live-mode question. AC-R85-14's section-bounded check provides the stronger discriminating coverage.)

Consequence: Block 3 PASS. Exit 0. Green commit proceeds. NOTE: AC-R85-14 remains the authoritative section-bounded check.

**Option C** — Operator authorizes a full-round re-spin (R85 re-spec with corrected EMPIRICAL.sh Block 3), discarding current implementation and restarting.

Consequence: Lost implementation work. Disproportionate for a one-line fix in a non-production harness file.

---

## Implementer recommendation

Option A is the minimal, correct fix — the alternative awk pattern precisely reproduces the intended range semantics. Option B is also acceptable if the operator prefers a simpler harness.

Option C is disproportionate.

---

## Status

`STATUS: ESCALATE` — operator selects A, B, or C; operator or Architect amends Q-R85-EMPIRICAL.sh per the chosen option; Implementer resumes with GREEN commit after amendment.
