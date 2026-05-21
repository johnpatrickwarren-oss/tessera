# DIAGNOSTIC-R87-ac36-3-self-exclusion

**Round:** R87  
**Role:** IMPLEMENTER  
**Halt condition triggered:** § 6 halt condition 6 — "if any Edit produces a behavior change in AC-R36-3 that this spec did not predict, HALT + DIAGNOSTIC"

---

## Spec claim (exact quote from Q-R87-SPEC.md § 3.1 Edit 3)

> **Behavior verification:** After this edit, AC-R36-3 will scan `q36-phase2-close-walk.test.ts`. AC-R36-3's pattern is `/execFileSync\s*\(\s*['"]node['"]/` (matching `execFileSync('node'…)` only). Post-R87, q36 contains **no** `execFileSync` call (the import is removed; all call sites were in deleted blocks; q36's remaining `execFileSync` references in AC-R36-11 and AC-R36-12 are inside string literals looking for `execFileSync('git'` patterns *in other files*, not `execFileSync('node'` calls). Therefore including q36 in the scan does not flip AC-R36-3's outcome.

---

## Reality

After applying Edit 3 (removing the `f !== 'q36-phase2-close-walk.test.ts'` self-exclusion from AC-R36-3's filter), running the test suite shows:

```
✖ AC-R36-3: no other test files carry execFileSync node --test pattern
  AssertionError: These test files carry execFileSync('node',...) — transitive hang risk: q36-phase2-close-walk.test.ts
  actual: [ 'q36-phase2-close-walk.test.ts' ]
  expected: []
```

The spec analysis missed one occurrence of `execFileSync('node'` in q36: the **template literal in AC-R36-3's own assertion error message** at line 90 of q36 (post-edit line numbering):

```typescript
assert.deepStrictEqual(
  violations,
  [],
  `These test files carry execFileSync('node',...) — transitive hang risk: ${violations.join(', ')}`,
);
```

The string `execFileSync('node',...)` inside this template literal matches the regex `/execFileSync\s*\(\s*['"]node['"]/`. The pattern searches for the text within the file content, not for executable call sites — so string literals also match.

The spec said "q36's remaining `execFileSync` references in AC-R36-11 and AC-R36-12 are inside string literals looking for `execFileSync('git'` patterns" but missed the error message string in AC-R36-3 itself, which contains `execFileSync('node',...)`.

---

## Resolution options

**Option A (Recommended — minimal, reversible): Revert Edit 3 — keep the self-exclusion with an updated comment**

Restore the self-exclusion line in AC-R36-3's filter, updating the comment from the stale `// exclude self: AC-R36-30 runs execFileSync('git')` to the accurate reason:

```typescript
f !== 'q36-phase2-close-walk.test.ts',  // exclude self: AC-R36-3's error message contains execFileSync('node',...)
```

This is the least invasive fix. The self-exclusion was protecting against a false-positive (the error message string literal), not against an executable call. The comment was wrong about the reason, but the exclusion's effect was correct. Keeping it with an accurate comment preserves the pass/fail semantics.

**Consequence:** Edit 3 from Q-R87-SPEC.md is not applied. The file comment `// exclude self: ...` is updated rather than removed. AC-R36-3 continues to pass.

---

**Option B: Keep Edit 3 removal, modify AC-R36-3's error message to avoid the pattern match**

Change the error message template literal at q36 line 90 so it does not contain `execFileSync('node',...)`. For example:

```typescript
`These test files carry the execFileSync-node hang-risk pattern: ${violations.join(', ')}`,
```

This modifies a still-active test's error message. The message is less informative but unambiguous. AC-R36-3 still passes; self-exclusion is not needed.

**Consequence:** Edit 3 as prescribed is applied; the error message of AC-R36-3 changes. Slightly less user-friendly error message.

---

**Option C: Keep Edit 3 removal, tighten AC-R36-3's scan pattern to exclude string-literal matches**

Change the regex from `/execFileSync\s*\(\s*['"]node['"]/` to a pattern that only matches when NOT inside a template literal or string. This is complex in regex and may not be reliable.

**Consequence:** Complex regex change; fragile; not recommended.

---

## Empirical verification

```bash
# Verify Option A restores the pass:
grep -n "execFileSync" test/q36-phase2-close-walk.test.ts | head -5
# After Option A: self-exclusion line with updated comment present; AC-R36-3 passes
```

---

## Implementer recommendation

**Option A** — revert Edit 3 (restore self-exclusion with corrected comment). This is the most conservative change: the self-exclusion serves a real purpose (preventing the pattern from matching q36's own error message string), the comment was just wrong about which call triggered it. Option A keeps q36's AC-R36-3 behavior unchanged and avoids modifying active test assertion logic.
