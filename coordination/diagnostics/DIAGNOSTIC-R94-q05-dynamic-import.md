# DIAGNOSTIC-R94-q05-dynamic-import

**Round:** R94  
**Role:** IMPLEMENTER  
**Halt trigger:** § 6.3 halt condition 8 — `pnpm exec tsc -p tsconfig.test.json` exits non-zero post-Phase-B

---

## Spec claim (verbatim)

**P0.8:** "Zero relative `from '..*engine'` imports remain in `test/ tools/ scripts/`"  
Verification method: `grep -rln "from ['\"]\\.\\..*engine" test/ tools/ scripts/` → exit 1 / empty output  
Observed at session entry: confirmed (exit 1 / empty output)

**AC-R94-10:** "`pnpm exec tsc -p tsconfig.test.json` exits 0 (no typecheck regression)"

---

## Reality

After Phase B (git rm -r engine/ + tsconfig changes + pnpm install), running:

```
pnpm exec tsc -p tsconfig.test.json 2>&1
```

Exits **2** with:

```
test/q05-per-shard-runtime.test.ts(251,42): error TS7016: Could not find a declaration file for module '../engine/per-shard/warm-start'. '/Users/johnwarren/concord/tessera/engine/per-shard/warm-start.js' implicitly has an 'any' type.
```

**Root cause:** `test/q05-per-shard-runtime.test.ts:251` contains:

```typescript
const { observeSample } = await import('../engine/per-shard/warm-start');
```

This is an ES dynamic `import()` call (not a static `from '...'` import). P0.8's grep pattern `from ['\"]\\.\\..*engine` matches static `from 'path'` syntax only. Dynamic `import('path')` syntax is NOT matched by the pattern — P0.8's verification was structurally incomplete.

**Why the error:** At R93, `engine/per-shard/warm-start.ts` existed; TypeScript resolved the dynamic import to the `.ts` source file. Post-R94 `git rm -r engine/` removed the `.ts` file. Gitignored `.js` files (`engine/per-shard/warm-start.js`) remain on disk (gitignored by `*.js` rule; not deleted by `git rm`). TypeScript resolves to the stale `.js` file and emits TS7016 (no declaration file for implicit-any module).

**Scope violation:** Fixing line 251 requires modifying `test/q05-per-shard-runtime.test.ts`, which is NOT in the ALLOWED_SET (ALLOWED_SET allows only `test/q94-engine-repo-extraction.test.ts` for test files). Any ALLOWED_SET expansion requires operator approval per REINFORCED 2026-05-17 halt-discipline.

---

## Supplementary context: TD-3 (typesVersions) — RESOLVED

A separate typecheck issue was also present: TS2307 errors for directory-based subpaths (`@pkg/ds-integration`, `@pkg/types`) caused by `typesVersions: { "*": { "*": ["./dist/*"] } }` not providing `index.d.ts` fallback for directory modules.

This was resolved (within engine repo authority — Phase A domain) by:
1. Updating engine `package.json` `typesVersions` to `"*": ["./dist/*", "./dist/*/index.d.ts"]`
2. Re-committing in the filtered clone (commit `18978ab`)
3. Re-tagging `v0.1.0-pre` at `18978ab` (force-push to GitHub)
4. Re-running `rm pnpm-lock.yaml && rm -rf node_modules && pnpm install`

The new lockfile references commit `18978ab`. Post-fix, the TS2307 errors for `ds-integration` and `types` are resolved.

**Remaining sole blocker:** q05:251 TS7016.

---

## Options (bounded)

**Option A (recommended):** Expand ALLOWED_SET to include `test/q05-per-shard-runtime.test.ts`; Implementer changes q05 line 251 to use the package import path.

- Change: `await import('../engine/per-shard/warm-start')` → `await import('@johnpatrickwarren-oss/deploysignal-engine/per-shard/warm-start')`
- ALLOWED_SET update: add `test/q05-per-shard-runtime\.test\.ts` alternation to ALLOWED_REGEX in 3 surfaces (spec § 5.2, q94 test ALLOWED_REGEX constant, EMPIRICAL.sh Block 11). NEXT-ROLE.md routing block is the 4th surface.
- Impact: completes the incomplete R91 migration (one dynamic import missed by P0.8's static grep pattern)
- AC-R94-11 (anti-scope diff) passes because q05 is now in ALLOWED_SET
- q05 AC-13 runtime behavior unchanged (dynamic import now uses package path which resolves to same `dist/per-shard/warm-start.js`)

**Option B:** Add `"allowJs": true, "checkJs": false` to `tsconfig.test.json` compilerOptions (file IS in current ALLOWED_SET).

- Change: adds 2 compilerOptions beyond what spec § 3.4 prescribes
- Impact: TypeScript accepts the stale `engine/per-shard/warm-start.js` as the module target for q05:251; TS7016 is suppressed because `allowJs: true` makes `.js` modules valid imports
- Broader impact: ALL `.js` module imports in `test/ tools/ scripts/` become valid; may mask future accidental relative engine imports returning as `.js` references
- tsconfig.test.json change is within ALLOWED_SET but is a spec-deviance from § 3.4 prescription (§ 3.4 says only remove `engine/**/*.ts` from include)
- Does NOT complete the R91 migration; leaves a stale relative engine path in q05

**Option C:** Operator amends spec to remove AC-R94-10 (accept typecheck regression).

- Not recommended: q05 is a pre-existing test whose typecheck was clean at R93; accepting regression contradicts R94's backwards-compat guarantee.

---

## Empirical verification

After operator resolves and Implementer resumes:

```bash
# Verify tsc exits 0
pnpm exec tsc -p tsconfig.test.json
echo "exit: $?"  # must be 0

# Verify q05:251 no longer references relative engine path (if Option A)
grep -n "import.*engine" test/q05-per-shard-runtime.test.ts
# should show only @johnpatrickwarren-oss/deploysignal-engine package imports
```
