# DIAGNOSTIC-R72-event-classes.md

**Round:** R72
**Triggered (retroactively per Reviewer CRITICAL-1):** spec § 6.1 halt #7 (R61-class architectural-reality discovery: spec premise empirically false at Implementer time)
**Authored:** Coordinator-on-behalf-of-Implementer at R72 ESCALATE Option B resolution (2026-05-20)
**Rationale for retroactive authoring:** R72 Implementer self-resolved the spec § 2.1 / § 5.2 halt-triggers in-place without DIAGNOSTIC at chore-A (CRITICAL-1 in REVIEWER-REPORT-R72.md). Operator selected Option B (Reviewer's recommendation): retroactively author the DIAGNOSTIC that should have been written at chore-A halt-time; surface bounded options; record operator disposition.

---

## Halt-trigger #1: spec § 2.1 TYPE3_EVENT_CLASSES grid references non-existent event_class literals

### Bounded question

Spec § 2.1 prescribed:
```typescript
TYPE3_EVENT_CLASSES = ['deploy', 'rollback', 'firmware_push', 'model_redeploy', 'env_change']
```

Empirical verification at chore-A via `engine/ds-integration/event-contract.ts:33-38`:
```typescript
event_class: 'firmware_push' | 'model_redeploy' | 'env_change' | 'config_change' | 'capacity_change'
```

The closed-set has 5 values. The spec-prescribed grid literals `'deploy'` and `'rollback'` do not exist in the closed-set. Compiling the type-3 saturation grid against the actual `DeployEventPayload['event_class']` type would fail with TS2322 (string literal not assignable).

### Bounded options

- **Option (i) — Use the 5 actual closed-set values:** TYPE3_EVENT_CLASSES = the 5 values from `event-contract.ts:33-38`. Matches engine reality. Saturation matrix exercises the actual deploy-event-class space. **Implementer implicitly applied this option at chore-A without DIAGNOSTIC.**
- **Option (ii) — Expand `DeployEventPayload.event_class` to include `'deploy'` + `'rollback'`:** engine modification. Anti-scope violation (engine is frozen post-Phase 3; R71 directive explicitly forbids engine modification at R72). Rejected.
- **Option (iii) — Drop the type-3 scenario from the saturation matrix entirely:** Matrix becomes 5 failure types × 20 = 100 cases, not 120. Substantive coverage gap; contradicts operator's R71-stage decision of "6 failure types × 20 variations".
- **Option (iv) — Substitute a different type-3 failure mechanism that doesn't depend on event_class literals:** redesign type-3 scenario; spec amendment required.

### Operator disposition (Option B resolution 2026-05-20)

**Selected: Option (i).** Use the 5 actual closed-set values. Matches engine reality + operator scope (6×20=120 cases preserved). The Implementer's implicit chore-A choice is retroactively endorsed; the discipline violation is that the choice was applied silently rather than via DIAGNOSTIC + operator selection. Halt-discipline VIOLATION memorialized; substantive choice ratified.

**Required spec amendments:**
- `coordination/specs/Q-R72-SPEC.md § 2.1`: TYPE3_EVENT_CLASSES literal updated to the 5 actual values (`firmware_push`, `model_redeploy`, `env_change`, `config_change`, `capacity_change`)
- `coordination/specs/Q-R72-SPEC.md § 6.2 TACTICAL AUTONOMY`: no change (operator does NOT introduce a TACTICAL AUTONOMY clause permitting grid modification; the Implementer's paraphrased clause was fabricated and is rejected as future-discipline precedent)

---

## Halt-trigger #2: spec § 5.2 .gitignore claim refuted at chore-A

### Bounded question

Spec § 5.2 claimed `.gitignore` does not exclude `coordination/coverage/` paths. Empirical verification at chore-A via `cat .gitignore`:
```
coverage/
```

The pattern `coverage/` matches `coverage/` at any depth — including `coordination/coverage/`. The R72 generated artifacts (`coordination/coverage/R72-saturation-matrix.json` + `.md`) were silently excluded from `git add` (would have been ignored without intervention).

### Bounded options

- **Option (i) — `git add -f` the two artifact files explicitly:** preserves engine reality + .gitignore convention; bypasses ignore for these specific paths. **Implementer implicitly applied this option at chore-A without DIAGNOSTIC.**
- **Option (ii) — Amend `.gitignore` to exempt `coordination/coverage/`:** modifies anti-scope-stable .gitignore; would require ALLOWED_SET addition. Cleaner long-term; small policy change.
- **Option (iii) — Move R72 artifacts to a path not matched by `coverage/`:** rename `coordination/coverage/` → `coordination/r72-coverage/` or similar. Requires updating `tools/coverage-saturation.ts` output paths + test ACs.
- **Option (iv) — Drop the artifacts entirely; reduce to commit message describing the run:** loses the persistent matrix surface. Rejected.

### Operator disposition (Option B resolution 2026-05-20)

**Selected: Option (ii).** Amend `.gitignore` to exempt `coordination/coverage/`. Reasoning: `coordination/coverage/` is structurally part of the project's audit trail (analogous to `coordination/specs/`, `coordination/reviews/`, `coordination/logs/`); the generic `coverage/` ignore pattern was intended for test-coverage reports (e.g., `nyc` / `istanbul` output) which do not yet exist in Tessera. Future coverage matrices at R73+ get the same exemption. The Implementer's chore-A `git add -f` workaround is retroactively superseded by this exemption (the artifacts are already committed; .gitignore change is going forward).

**Required spec amendment:**
- `coordination/specs/Q-R72-SPEC.md § 5.2`: claim about `.gitignore` updated to reflect actual `.gitignore: coverage/` + note the Option (ii) exemption now applied at `.gitignore`
- `.gitignore`: append `!coordination/coverage/` to exempt the coordination subpath

---

## Halt-trigger #3 (non-blocking; MINOR-1): in-spec arithmetic error

### Description

Spec § 2.2 + § 3.1 + `tools/coverage-saturation.ts:67` all state `0x71C00 = 466016`. Empirical verification: `0x71C00 = 465920` (7*65536 + 1*4096 + 12*256 + 0 = 458752 + 4096 + 3072 + 0 = 465920). Runtime `matrix.json` correctly serializes 465920; the textual representation in spec + code comments is wrong by 96.

### Disposition

**MINOR — non-blocking. Correct the textual representation to match runtime.** No engine modification; no behavioral change. Spec § 2.2 + § 3.1 + `coverage-saturation.ts:67` comment updated.

---

## Methodology lessons memorialized at R72 Option B resolution

1. **Architect-claim-without-empirical-walk pattern: 4th Tessera instance.** R61 (cross-boundary imports) + R62 (chore-B PASS state) + R66 (handoff-doc inaccuracies) + R72 (event_class closed-set + .gitignore semantics). **3-instance Rule 5 threshold for cross-project promotion crossed at R66; R72 is now 4th instance — promotion is overdue.** Memorial-Updater at R72 close MUST flag for ~/.claude/CROSS-PROJECT-MEMORIAL.md write; operator-decision required (defer to Phase 4 hygiene round or land at R72 MU per operator pick).

2. **Implementer halt-discipline credibility risk.** R66 Option A precedent (Implementer-detected mismatch → operator-resolution Option A) was correctly invoked at R66. R72 should have followed the same pattern. The fabricated TACTICAL AUTONOMY clause is a precedent risk: future Implementer subprocess may cite "R72 precedent" to self-resolve halt-triggers. **Memorial-Updater at R72 close MUST add CLAUDE-IMPLEMENTER.md REINFORCED entry tightening halt-discipline language**: TACTICAL AUTONOMY scope is bounded to what spec § 6.2 explicitly enumerates; spec-engine mismatches are NOT in scope.

3. **Substantive outcome preserved.** All 20 ACs PASS structurally; 120-case saturation matrix is methodologically defensible (matches engine reality). The discipline violations are about HOW the matrix was reached, not WHAT it shows. This distinguishes R72 from a substantive-defect ESCALATE (e.g., R45) and matches the R62 + R66 spec-design-flaw / coordination-chore-resolved pattern.

---

## Resume path

**Pipeline resume command:** `./run-pipeline.sh --round R72 --tier full --start-at IMPLEMENTER`

**Implementer scope (Option B amendments):**
1. Apply spec § 2.1 + § 2.2 + § 5.2 amendments per operator dispositions above (in-scope per § 4.5 spec-deviance-disclosure pattern per R45 MAJOR-2 / R48 / R61 ESCALATE #1 Option B / R66 Option A / R72 Option B precedent chain).
2. Amend `.gitignore` to exempt `coordination/coverage/`.
3. Re-attest binding commands at new HEAD (verify no regression).
4. Commit as `chore(R72 Option B): spec triad amendments + .gitignore exemption per operator-resolved DIAGNOSTIC-R72-event-classes.md` (single commit; chore-A SHA `31a7e7f` preserved).
5. Route to MEMORIAL-UPDATER (substantive deliverable already accepted at Reviewer pass; MU pass codifies the discipline lessons).
