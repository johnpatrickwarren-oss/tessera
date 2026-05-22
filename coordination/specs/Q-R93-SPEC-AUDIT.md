# Q-R93-SPEC-AUDIT.md — Architect Brainstorm + Design Sidecar

**Round:** R93 | **Tier:** audit | **Date:** 2026-05-21

---

## § A1. Brainstorm (Superpowers — 3 approaches evaluated)

### A1.1 Problem: AC-R36-3 has flipped twice in one SLICE (R87 + R91)

The AC scans all test files for `execFileSync\s*\(\s*['"]node['"]` using `readdirSync` + `readFileSync`. Each time a new test using subprocess-spawn is added, the AC flips FAIL, requiring a carve-out edit + operator ESCALATE resolution. This happened at:
- R87: q77-detector-envelope.test.ts added (wait, actually q91 used node — R87 ESCALATEd on q91 too? Let me re-read... Actually: R87 dropped AC-R36-30/31; R91 ESCALATED on q91 using execFileSync('node', -e ...) → Option A, add q91 to carve-out list. So the flip at R91 was the 4th-instance carve-out.

Actually re-reading the directive: "AC-R36-3 has flipped twice (R87 + R91)". R87 was the first flip (added q77's test using spawnSync? No — q77 uses spawnSync not execFileSync('node'...) so it would NOT trigger). Wait, looking at the NEXT-ROLE.md directive:

"4th-instance carve-out class: q29/q34/q36/q91". So the carve-outs were added at 4 points. The "flipped twice" refers to R87 + R91 specifically causing an ESCALATE + Option A resolution, not just carve-out additions.

Correct interpretation: AC-R36-3 has flipped (required a carve-out ESCALATE) twice in Phase 5: once at R87 and once at R91. This crosses the "twice in one SLICE" threshold for structural fragility redesign.

### A1.2 Approach A: Drop + Pre-commit hook (SELECTED)

**Mechanism:** Remove AC-R36-3 test body from q36. Create `scripts/check-no-execfilesync-spawn.sh` that greps test files for the pattern. Wire into `scripts/finalize-round.sh` Step 7b (non-blocking WARN, consistent with existing check-claude-md-thresholds.sh pattern).

**Strengths:**
- Eliminates test-time fragility. No more carve-out list in test assertions.
- Pre-commit hook fires at commit time, not test time → no recursive-test hang risk.
- Non-blocking WARN in finalize-round.sh is intentionally lenient: carve-outs go from "must be in test source" to "must be in hook script" (simpler to maintain).
- Establishes pattern for future fork: if a new test needs execFileSync('node', ...), developer adds to hook script's approved list (not to a test assertion's filter block).

**Weaknesses:**
- `--no-verify` bypass exists (git commit --no-verify skips pre-commit hooks).
- Hook not enforced in CI (Tessera doesn't currently have CI running pre-commit hooks).

**Hidden assumptions:**
- `finalize-round.sh` is always invoked at round close (true: pipeline discipline + IMPLEMENTER role block mandate).
- Shell `grep` syntax works correctly in the hook script (testable via dry-run).

**Risks:**
- Future developer bypasses hook via `--no-verify`, introduces subprocess-spawn test, causes transient hang. Mitigated by registry (makes the guard visible) and documentation in SPEC-AUTHORING-CHECKLIST (makes the gate mandatory at spec-emit time).

**Why selected over B:** B keeps structural fragility (still requires carve-out edit for every new test). Why selected over C: C doesn't propagate to future rounds.

---

### A1.3 Approach B: Keep + registry-backed carve-out (REJECTED)

**Mechanism:** Keep AC-R36-3. Add AC-R36-32 that reads a registry file and verifies the inline carve-out list matches it.

**Rejection reason:** The core fragility remains. Every new subprocess-spawn test requires BOTH a registry update AND a carve-out inline edit in the test file. The problem is not "where is the list?" (registry solves that) but "why does the list need to be in a test assertion at all?" Moving enforcement to pre-commit eliminates the test-time location entirely.

---

### A1.4 Approach C: EMPIRICAL.sh block only (REJECTED)

**Mechanism:** Move the check into Q-R93-EMPIRICAL.sh. Future rounds would need to copy the block.

**Rejection reason:** Not forward-propagating. Each EMPIRICAL.sh is round-specific and does not carry forward. A future round that doesn't copy the block loses the enforcement entirely.

---

## § A2. Design sketch

### Component boundaries

```
EXISTS → MODIFIED:
  test/q36-phase2-close-walk.test.ts
    - Remove AC-R36-3 test body (lines 71-93)
    - Update header comment test count (27 → 26)
  scripts/finalize-round.sh
    - Add check-no-execfilesync-spawn.sh call at Step 7b
  coordination/SPEC-AUTHORING-CHECKLIST.md
    - Append § Fail-set enumeration gate
    - Append § Forward-protection-walk gate
  coordination/MEMORIAL.md
    - Append R92 deferral pointer entry
    - Append R93 CONFIRMATION/VIOLATION entries
  coordination/NEXT-ROLE.md
    - Append R93 routing block

CREATED (NEW):
  scripts/check-no-execfilesync-spawn.sh
  coordination/FORWARD-PROTECTION-AC-REGISTRY.md
  coordination/PHASE-5-SLICE-3-CLOSE-WALK.md
  test/q93-slice3-close-hygiene.test.ts
  coordination/specs/Q-R93-{SPEC,SPEC-AUDIT,EMPIRICAL}.{md,sh}
  coordination/reviews/REVIEWER-REPORT-R93.md (post-impl, Reviewer)
  coordination/logs/ROUND-R93-ROUTING.md (existing untracked)
```

### Integration points

| # | From | To | Risk |
|---|---|---|---|
| 1 | finalize-round.sh:Step7b | check-no-execfilesync-spawn.sh | Hook script must be executable (`chmod +x`); non-blocking WARN |
| 2 | q93 test | q36 file (readFileSync) | File path must resolve from `__dirname` via ROOT constant |
| 3 | q93 test | check-no-execfilesync-spawn.sh (existsSync) | Script must be at expected path |
| 4 | q93 test | FORWARD-PROTECTION-AC-REGISTRY.md (readFileSync) | File must exist post-chore-A |
| 5 | q93 test | SPEC-AUTHORING-CHECKLIST.md (readFileSync) | File at `coordination/` NOT `templates/` (verified) |
| 6 | q93 test | PHASE-5-SLICE-3-CLOSE-WALK.md (existsSync) | File must exist post-chore-A |
| 7 | q93 test | own source (readFileSync) | Self-application gate: q93 itself must not use execFileSync('node',...) |
| 8 | q93 test | git (execFileSync('git', diff)) | Anti-scope check; 'git' not 'node' — does NOT trigger new hook |
| 9 | Q-R93-EMPIRICAL.sh | all above | Shell harness; verifies all 8 AC properties independently |

### Failure modes at integration points

| # | Failure | Detection |
|---|---|---|
| 1 | Hook script not executable | AC-R93-2 checks existsSync; finalize-round.sh logs chmod warning |
| 2 | q36 path wrong | AC-R93-1 would get ENOENT from readFileSync |
| 3 | Hook script at wrong path | AC-R93-2 existsSync returns false → test fails |
| 4 | Registry not created | AC-R93-3 existsSync returns false |
| 5 | Checklist at wrong path | AC-R93-4/5 readFileSync throws ENOENT |
| 6 | SLICE walk not created | AC-R93-8 existsSync returns false |
| 7 | q93 accidentally uses execFileSync('node',...) | AC-R93-6 self-check catches at test time |
| 8 | New file outside ALLOWED_SET | AC-R93-7 git diff check catches |

---

## § A3. Pre-emit grilling

1. **Verifiability:** All 8 ACs are verifiable by direct file-system reads or git diff. No claim relies on "a future action will verify this."
2. **Unstated assumptions:** (a) SPEC-AUTHORING-CHECKLIST.md path is `coordination/` — VERIFIED via `find . -name '*CHECKLIST*'` at spec-emit time. (b) AC-R36-3 currently PASSES — VERIFIED: not in the pre-impl fail list above.
3. **Scope added:** Only what the directive mandates. No extra deliverables.
4. **Reviewer can act without clarifying questions:** Yes — all decisions made inline. No deferred choices.
5. **Self-application check (R91 CRITICAL-1):** q93 uses readFileSync + existsSync + execFileSync('git',...). The new hook scans for `execFileSync\s*\(\s*['"]node['"]` — q93 does NOT match this pattern. ✓

---

## § A4. Decision rationale

| Decision | Choice | Why |
|---|---|---|
| AC-R36-3 approach | Drop + pre-commit hook | Twice-flipped = structural fragility threshold crossed per directive |
| Pre-commit hook blocking? | Non-blocking WARN | Consistent with check-claude-md-thresholds.sh; blocking would break rounds with approved carve-outs |
| SPEC-AUTHORING-CHECKLIST path | `coordination/SPEC-AUTHORING-CHECKLIST.md` | Actual location found via `find`; directive said "or equivalent, verify path at spec-emit" |
| Registry name | `coordination/FORWARD-PROTECTION-AC-REGISTRY.md` | Per directive suggestion |
| SLICE close artifact | `coordination/PHASE-5-SLICE-3-CLOSE-WALK.md` | Per R37 + R66 SLICE-close precedent |
| q93 test count | 8 ACs | Per directive minimum 5; 8 covers all deliverables plus self-application gate |

---

## § A5. Architect predictions

- All 8 q93 ACs PASS at chore-A
- Q-R93-EMPIRICAL.sh: 9 PASS / 0 FAIL, exit 0
- test counts: tests=745, pass ∈ [720,722], fail ∈ [19,21], skip=4
- Reviewer prediction: 0 CRITICAL / 0-2 MINOR / 0-3 OBS
- CLAUDE-*.md: ARCH stays at 27-28; IMPL stays at 30 (no new violations expected; MU adds if VIOLATIONs found by Reviewer)
