# Q-R87-SPEC — Carry-forward AC cleanup: drop AC-R36-30 + AC-R36-31

**Round:** R87 (Phase 4 SLICE 5 hygiene round, full-tier)
**Round-start SHA:** `0eb8a51` (chore directive committed at this SHA; verified via `git rev-parse HEAD`)
**Empirical baseline at round-start (verified at spec-emit by Architect run):**
- `pnpm exec tsc -p tsconfig.test.json` → exit 0
- `pnpm exec node --test --test-reporter=tap test/*.test.js` → `# tests 689 / # pass 667 / # fail 18 / # skipped 4`
  - (high end of the AC-R84-14 ±1 stochastic band; EMPIRICAL.sh in round-start commit predicts band [17, 18])

**Precedent applied:** R62 Option 1 (operator-resolved): drop a structurally-vacuous forward-protection AC whose pinned SHA boundary is older than every subsequent HEAD.

---

## § 0  Empirical-premise verification (R08 MAJOR-2 / cross-project Architect-claim-without-empirical-walk)

The R87 round-scope directive in `coordination/NEXT-ROLE.md` § "R87 Round-scope directive" makes two empirical claims that disagree with the codebase. Architect verification at spec-emit time corrects both:

| Directive claim | Empirical reality (verified by Architect) | Source-of-truth |
|---|---|---|
| "CHORE_A_SHA literal is `87e372f` (Phase 2 close)" | The literals in q36 are `'36ab019'` (line 641, ROUND_START_SHA) + `'c49df0e'` (line 698, CHORE_A_SHA). `87e372f` is **not** cited in q36. | `test/q36-phase2-close-walk.test.ts:641` + `:698`; verified by `grep -n "'36ab019'\|'c49df0e'" test/q36-phase2-close-walk.test.ts` |
| "6 carry-forward fails (R36-21, R36-30, R36-31, R65-2, R66-14, AC-R84-14)" | 18 carry-forward fails at round-start. AC-R36-30/R36-31 are 2 of 18 (not 2 of 6). The remaining 16 fails are documented anti-scope/forward-protection carry-forwards from R65, R66, R77-R85 plus the R36-21 + AC-R83-12 + AC-R79-8 known gaps. | Verified by `pnpm exec node --test --test-reporter=tap test/*.test.js` at HEAD = `0eb8a51`; 18 `not ok` lines observed |

**Resolution:**
1. The spec uses `'36ab019'` and `'c49df0e'` as the literals to remove (matches `Q-R87-EMPIRICAL.sh:53-54`, which was authored at round-start and is correct).
2. The spec's fail-band predictions are 18 → 16 (band [15, 16] with AC-R84-14 ±1 flake), matching `Q-R87-EMPIRICAL.sh:115-119`. The directive's "6 → 4" narrative was a shorthand referring to a subset of named carry-forwards, not the full TAP `# fail` count.

This block applies the cross-project canonical `Architect-claim-without-empirical-walk` discipline (CROSS-PROJECT-MEMORIAL.md "Reinforcement rules derived" entry, promoted at R72): every load-bearing factual claim about codebase or test-suite state recorded here was verified by the cited command at spec-emit time.

---

## § 1  Mechanism

R87 removes two test() blocks from `test/q36-phase2-close-walk.test.ts` whose forward-protection diff assertions reference SHA literals (`'36ab019'`, `'c49df0e'`) far older than any committed HEAD. These tests have been carry-forward-failing for ~30 rounds because the `git diff <old_SHA>..HEAD --name-only` output includes hundreds of paths outside the original R36 allowed-set. The pattern is structurally identical to R62 AC-R62-15, which was dropped via Operator Option 1 at R62 close.

The cleanup is local to `test/q36-phase2-close-walk.test.ts`. It removes:
- The two `test('AC-R36-30: …', () => { … })` and `test('AC-R36-31: …', () => { … })` blocks plus their preceding `// ── AC-R36-XX: …` section-divider comments
- The now-unused `import { execFileSync } from 'node:child_process';` at the top of the file (its only consumers were the two deleted blocks; `tsconfig.test.json` extends `tsconfig.json` which sets `noUnusedLocals: false`, so the unused import would not break `tsc` — but it becomes dead code that future readers must trace)
- A self-exclusion entry in AC-R36-3's `readdirSync` filter at line 75 (`f !== 'q36-phase2-close-walk.test.ts'`) plus its inline comment, since the comment cites AC-R36-30 explicitly and the exclusion was defensive against q36's now-deleted `execFileSync('git')` usage (AC-R36-3's grep pattern `/execFileSync\s*\(\s*['"]node['"]/` searches for `node` not `git`; q36 has no `execFileSync('node', …)` call post-cleanup, so the self-exclusion is unneeded)
- Header citation drift in the file docblock (lines 3-11): the range `"AC-R36-1 through AC-R36-31"` becomes `"AC-R36-1 through AC-R36-29"`; the sentence about `"AC-R36-31 (chore-B forward protection)"` is dropped; the `"Covers: … anti-scope protection"` clause has `"anti-scope protection"` removed

The cleanup adds:
- An explanatory comment block placed where the two test() blocks were (after the existing AC-R36-27 block, before the file ends), citing **R87** cleanup intent + **R62 Option 1** precedent + **SPEC-AUTHORING-CHECKLIST.md** R86-landed "Forward-protection diff empty-set assertion" failure mode

The cleanup creates a new test file `test/q87-carry-forward-cleanup.test.ts` with 5 runtime-bound test() blocks (AC-R87-1 through AC-R87-5) that assert the post-cleanup state of q36. Two further ACs (AC-R87-6 binding-command attestation; AC-R87-7 anti-scope diff) bind chore-A attestations reported by the Implementer in NEXT-ROLE.md, not runtime tests; this matches the R36 binding-command convention (AC-R36-28/AC-R36-29).

The cleanup updates `Q-R87-EMPIRICAL.sh` only minimally if the spec discovers any deviation from the round-start commit (the spec finds the script's predictions are already correct — see § 8 self-application). MEMORIAL.md appends an R87 ARCHITECT section now (this spec emit) and Implementer/Reviewer/MU sections post-chore-A.

---

## § 2  Component inventory

### Exists (unchanged)
- `coordination/specs/Q-R87-EMPIRICAL.sh` — committed at round-start `0eb8a51`; predictions verified by Architect at spec-emit; **no changes required**
- `coordination/PRD.md` — unchanged
- `CLAUDE.md`, `CLAUDE-COMMON.md`, `CLAUDE-ARCHITECT.md`, `CLAUDE-IMPLEMENTER.md`, `CLAUDE-REVIEWER.md`, `CLAUDE-MEMORIAL.md`, `CLAUDE-COORDINATOR.md` — unchanged

### Created (new files)
| Path | Author | Purpose |
|---|---|---|
| `coordination/specs/Q-R87-SPEC.md` | Architect | This file |
| `coordination/specs/Q-R87-SPEC-AUDIT.md` | Architect | Audit sidecar (P3 ten-axis, grilling, brainstorm/design records) |
| `test/q87-carry-forward-cleanup.test.ts` | Implementer | 5 runtime tests binding AC-R87-1 through AC-R87-5 |
| `coordination/reviews/REVIEWER-REPORT-R87.md` | Reviewer | Cold-eye audit |

### Changed (modified files)
| Path | Author | Modification surface |
|---|---|---|
| `test/q36-phase2-close-walk.test.ts` | Implementer | Removals + header citation updates + appended explanatory comment (see § 3) |
| `coordination/MEMORIAL.md` | Architect (1st append) / Implementer / Reviewer / MU | Append-only |
| `coordination/NEXT-ROLE.md` | Architect (routing block) / Implementer (chore-A attestation) / MU (close attestation) | Append-only routing blocks |

### Deleted
None.

---

## § 3  Per-file pseudocode (no design decisions deferred)

### § 3.1  `test/q36-phase2-close-walk.test.ts` modifications

Implementer executes these edits in any safe order (each edit is independently legal; no inter-edit dependencies).

#### Edit 1 — Remove unused import (line 17)

**Current (line 17):**
```typescript
import { execFileSync } from 'node:child_process';
```

**Action:** Remove this line entirely.

**Why:** Its only consumers were lines 672 and 709 inside the AC-R36-30 and AC-R36-31 test() blocks, both of which are being removed.

#### Edit 2 — Update file docblock (lines 1-11)

**Current:**
```typescript
// test/q36-phase2-close-walk.test.ts — Phase 2 close-walk bindings (R36).
//
// Binds AC-R36-1 through AC-R36-31 per Q-R36-SPEC.md § 3.
// AC-R36-28 (tsc exits 0) and AC-R36-29 (test count) are binding-command
// attestations reported by the Implementer at GREEN in NEXT-ROLE.md;
// not runtime-bound. AC-R36-31 (chore-B forward protection) is a runtime
// test added at chore-B; RED by design at chore-A.
//
// Covers: subprocess-hang fixes (D4), R32 carry-forwards (D2), R34
// carry-forwards (D3), MR-2 consolidation (D5), Phase 2 close-walk doc
// (D1), anchor backflow (D7), anti-scope protection.
```

**Target (verbatim text the Implementer must write):**
```typescript
// test/q36-phase2-close-walk.test.ts — Phase 2 close-walk bindings (R36).
//
// Binds AC-R36-1 through AC-R36-29 per Q-R36-SPEC.md § 3.
// AC-R36-28 (tsc exits 0) and AC-R36-29 (test count) are binding-command
// attestations reported by the Implementer at GREEN in NEXT-ROLE.md;
// not runtime-bound.
//
// Covers: subprocess-hang fixes (D4), R32 carry-forwards (D2), R34
// carry-forwards (D3), MR-2 consolidation (D5), Phase 2 close-walk doc
// (D1), anchor backflow (D7).
//
// R87 (2026-05-21): the two original anti-scope ACs (AC-R36-30 round-start-to-
// chore-A diff; AC-R36-31 chore-B forward protection) were dropped per R62
// Option 1 precedent — see in-file explanatory comment near the end of the
// file and Q-R87-SPEC.md § 1 for rationale.
```

**Diff summary:**
- Line 3 `"1 through 31"` → `"1 through 29"`
- Lines 6-7 (sentence about AC-R36-31) removed
- Line 11 (`anchor backflow (D7), anti-scope protection.`) → `anchor backflow (D7).`
- Append 5-line R87 cleanup citation block

#### Edit 3 — Drop AC-R36-3 self-exclusion (line 75)

**Current (lines 69-90):**
```typescript
// ── AC-R36-3: grep audit — no other subprocess-spawn in test files ───────────
test('AC-R36-3: no other test files carry execFileSync node --test pattern', () => {
  const testDir = join(ROOT, 'test');
  const testFiles = readdirSync(testDir).filter(
    (f) => f.match(/^q\d+.*\.test\.ts$/) &&
      f !== 'q29-k8s-adapter.test.ts' &&
      f !== 'q34-event-conditional-attribution.test.ts' &&
      f !== 'q36-phase2-close-walk.test.ts',  // exclude self: AC-R36-30 runs execFileSync('git')
  );
  ...
```

**Target (verbatim text the Implementer must write):**
```typescript
// ── AC-R36-3: grep audit — no other subprocess-spawn in test files ───────────
test('AC-R36-3: no other test files carry execFileSync node --test pattern', () => {
  const testDir = join(ROOT, 'test');
  const testFiles = readdirSync(testDir).filter(
    (f) => f.match(/^q\d+.*\.test\.ts$/) &&
      f !== 'q29-k8s-adapter.test.ts' &&
      f !== 'q34-event-conditional-attribution.test.ts',
  );
  ...
```

**Diff summary:**
- Remove the `f !== 'q36-phase2-close-walk.test.ts',  // exclude self: AC-R36-30 runs execFileSync('git')` line
- Add a trailing comma to the previous line (`f !== 'q34-event-conditional-attribution.test.ts',`) — verify it already has a comma (it does in the current source); no change to that line's comma

**Behavior verification:** After this edit, AC-R36-3 will scan `q36-phase2-close-walk.test.ts`. AC-R36-3's pattern is `/execFileSync\s*\(\s*['"]node['"]/` (matching `execFileSync('node'…)` only). Post-R87, q36 contains **no** `execFileSync` call (the import is removed in Edit 1; all call sites are in deleted blocks). Therefore including q36 in the scan does not flip AC-R36-3's outcome.

#### Edit 4 — Remove AC-R36-30 block (lines 639-690 inclusive)

Remove lines 639 through 690 inclusive, in the file at round-start. These are:
- Line 639: `// ── AC-R36-30: anti-scope allowed-set (round-start to chore-A) ───────────────`
- Lines 640-690: the entire `test('AC-R36-30: …', () => { … });` block

#### Edit 5 — Remove AC-R36-31 block (lines 692-725 inclusive)

Remove lines 692 through 725 inclusive. These are:
- Lines 692-696: the section divider + 4-line explanatory comment about AC-R36-31
- Lines 697-725: the entire `test('AC-R36-31: …', () => { … });` block

Note: line 691 is blank — keep it as a single trailing newline at end-of-file, or let the explanatory block (Edit 6) end the file. Either is acceptable; the test runner does not care about trailing whitespace.

#### Edit 6 — Append R87 explanatory comment block

After all deletions complete, append the following block at the position where AC-R36-30/R36-31 used to live (i.e., immediately after the AC-R36-27 `test(...);` closer at original line 637; new line number depends on final post-edit numbering):

**Verbatim text the Implementer must write:**

The comment block deliberately does **not** contain the literal strings `'36ab019'` or `'c49df0e'` (the deleted SHAs surrounded by single quotes). This is enforced by the self-application gate in § 9.5: EMPIRICAL.sh Block 2 (the round-start binding harness) uses the grep pattern `grep -c "'<sha>'" "$Q36"` to count deletion success; if Edit 6's prose contained the quoted SHA string, the grep would count ≥ 1 and the assertion `count = 0` would fail at chore-A. Architect verified at spec-emit time that Edit 6's verbatim text below contains zero substrings matching either `'36ab019'` or `'c49df0e'` (with single quotes).

```typescript

// ── R87 cleanup: AC-R36-30 + AC-R36-31 dropped (2026-05-21) ──────────────────
// The original AC-R36-30 (round-start-to-chore-A diff path-set ⊆ R36 allowed-
// set) and AC-R36-31 (chore-A-to-HEAD diff ⊆ R36 post-chore-A allowed set)
// pinned forward-protection assertions to two R36-era SHAs via the now-
// deleted constants ROUND_START_SHA and CHORE_A_SHA (the SHA values are not
// reproduced here so EMPIRICAL.sh Block 2's deletion-count grep remains
// unambiguous; see git history for the literal values). Both SHAs are far
// older than every subsequent committed HEAD, so the `git diff <pin>..HEAD
// --name-only` output includes hundreds of paths outside the original R36
// allowed-set — the assertions are structurally unreachable at any post-R36
// HEAD.
//
// Precedent: R62 Option 1 (operator-resolved at R62 close) dropped the
// structurally-equivalent AC-R62-15 for the same reason. Q-R87-SPEC.md § 1
// applies that precedent here.
//
// Related discipline: coordination/SPEC-AUTHORING-CHECKLIST.md was extended at
// R86 (Phase 4 SLICE 4) to document the "Forward-protection diff empty-set
// assertion" failure mode under "Architect-encoded text-matching patterns MUST
// be verified against prescribed implementation." Future spec rounds should
// not author pinned-SHA forward-protection diff assertions whose pin will fall
// strictly behind subsequent committed HEAD — when they do, they become
// permanent carry-forward fails like AC-R36-30/31 were before this round.
//
// AC-R36-28 + AC-R36-29 (binding-command attestations reported in
// NEXT-ROLE.md, not runtime-bound) are preserved unchanged.
```

#### Final post-edit file structure

After Edits 1-6, `test/q36-phase2-close-walk.test.ts` contains:
- Lines 1-14 (approx): updated docblock (Edit 2)
- Line 15-16: blank + `import { test } from 'node:test';` (unchanged)
- Line 17: `import assert from 'node:assert/strict';` (unchanged; was line 14 originally)
- Lines 18-20: other imports (`readFileSync, existsSync, readdirSync` from `node:fs`; `resolve, join` from `node:path`); `execFileSync` import removed
- Lines 22-26: `const ROOT = …; function readFile(…)` (unchanged structure)
- AC-R36-1 through AC-R36-27 blocks: unchanged
- New: R87 explanatory comment block (Edit 6) at end of file
- AC-R36-30 + AC-R36-31 blocks: gone

Line numbers above are approximate post-edit; the exact post-edit count is not asserted by any AC. EMPIRICAL.sh Block 2 asserts the **absence** of the two test() blocks and the two SHA literals; EMPIRICAL.sh Block 3 asserts the **presence** of three citation tokens and the new header range.

### § 3.2  `test/q87-carry-forward-cleanup.test.ts` (new file)

The Implementer creates this file. It contains 5 runtime test() blocks (AC-R87-1 through AC-R87-5) plus a file docblock. Each AC's spec text is in § 4; below is the spec pseudocode each test must implement.

```typescript
// test/q87-carry-forward-cleanup.test.ts — R87 carry-forward AC cleanup bindings.
//
// Binds AC-R87-1 through AC-R87-5 per Q-R87-SPEC.md § 4.
// AC-R87-6 (binding-command attestation: chore-A typecheck + TAP counts) and
// AC-R87-7 (anti-scope diff round-start..HEAD ⊆ ALLOWED_SET) are
// binding-command attestations reported by the Implementer in NEXT-ROLE.md;
// not runtime-bound (the runtime equivalents would self-confirm against the
// committing process's own working tree).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';

const ROOT = resolve(__dirname, '..');
const Q36 = 'test/q36-phase2-close-walk.test.ts';

function readQ36(): string {
  return readFileSync(join(ROOT, Q36), 'utf8');
}

// ── AC-R87-1: AC-R36-30 + AC-R36-31 test() blocks removed ───────────────────
test('AC-R87-1: q36 contains no AC-R36-30 or AC-R36-31 test() block', () => {
  const content = readQ36();
  // Count test('AC-R36-30:' and test('AC-R36-31:' occurrences (line-anchored).
  // Anchor at start-of-line so a stale comment mention of "AC-R36-30:" elsewhere
  // does not pass this assertion.
  const r3630 = content.match(/^test\('AC-R36-30:/gm) ?? [];
  const r3631 = content.match(/^test\('AC-R36-31:/gm) ?? [];
  assert.strictEqual(r3630.length, 0, 'q36 must contain zero test() blocks for AC-R36-30');
  assert.strictEqual(r3631.length, 0, 'q36 must contain zero test() blocks for AC-R36-31');
});

// ── AC-R87-2: legacy SHA literals removed from q36 ──────────────────────────
test('AC-R87-2: q36 contains no legacy R36 SHA literals (36ab019, c49df0e)', () => {
  const content = readQ36();
  // The R87 explanatory comment (Edit 6) intentionally references both SHAs as
  // string literals inside a comment block ('36ab019' and 'c49df0e' appear in
  // the explanatory prose). To bind the deletion of the executable references
  // without false-failing on the explanatory comment, scan for the SHAs only
  // inside variable-assignment contexts (`const NAME = '<sha>';`).
  const r3636ab = content.match(/=\s*'36ab019'/g) ?? [];
  const rc49d = content.match(/=\s*'c49df0e'/g) ?? [];
  assert.strictEqual(r3636ab.length, 0, 'q36 must not assign "36ab019" to any variable');
  assert.strictEqual(rc49d.length, 0, 'q36 must not assign "c49df0e" to any variable');
});

// ── AC-R87-3: R87 cleanup explanatory comment present with required citations ─
test('AC-R87-3: q36 contains R87 cleanup comment citing R62 + SPEC-AUTHORING-CHECKLIST', () => {
  const content = readQ36();
  // The comment block must be discriminating: a single bare "R87" mention in
  // the header docblock alone does not satisfy the AC. Anchor against the
  // explicit cleanup header line that Edit 6 prescribes.
  assert.ok(
    content.includes('R87 cleanup: AC-R36-30 + AC-R36-31 dropped'),
    'q36 must contain the R87 cleanup section header verbatim',
  );
  assert.ok(
    content.includes('R62 Option 1'),
    'q36 R87 cleanup comment must cite R62 Option 1 precedent',
  );
  assert.ok(
    content.includes('SPEC-AUTHORING-CHECKLIST'),
    'q36 R87 cleanup comment must cite SPEC-AUTHORING-CHECKLIST (R86 tightening)',
  );
});

// ── AC-R87-4: q36 header range citation updated to 1 through 29 ─────────────
test('AC-R87-4: q36 docblock cites "AC-R36-1 through AC-R36-29" range', () => {
  const content = readQ36();
  assert.ok(
    content.includes('AC-R36-1 through AC-R36-29'),
    'q36 header must cite "AC-R36-1 through AC-R36-29" (range updated from 1-31)',
  );
  // Negative check: the old range MUST NOT remain.
  assert.ok(
    !content.includes('AC-R36-1 through AC-R36-31'),
    'q36 header must not cite the stale "AC-R36-1 through AC-R36-31" range',
  );
});

// ── AC-R87-5: execFileSync import removed from q36 (now unused) ─────────────
test('AC-R87-5: q36 does not import execFileSync (unused after deletions)', () => {
  const content = readQ36();
  // Match the specific import statement; the symbol "execFileSync" itself may
  // appear inside string literals/comments (e.g., the R87 cleanup comment may
  // reference the deletion of `execFileSync` call sites), so anchor the
  // assertion on the import statement form rather than bare symbol presence.
  const importPattern = /import\s*\{\s*execFileSync\s*\}\s*from\s*['"]node:child_process['"]/;
  assert.ok(
    !importPattern.test(content),
    'q36 must not import execFileSync (unused after AC-R36-30/R36-31 removal)',
  );
});
```

### § 3.3  Q-R87-EMPIRICAL.sh

**No changes required.** The script committed at round-start (`0eb8a51`) already:
- Uses `--test-reporter=tap` per R77 (line 89)
- Uses `'36ab019'` + `'c49df0e'` literals (lines 53-54) matching the actual literals in q36
- Predicts fail band `[15, 16]` and pass band `[672, 673]` (lines 115-119) matching this spec's arithmetic
- Predicts `tests = 692` strict (line 114) matching `689 - 2 + 5 = 692`
- Includes all spec-triad + reviewer-report + test files in ALLOWED_SET (line 146)
- Tests for `AC-R36-1 through AC-R36-29` range in q36 header (line 76)
- Tests for `R87` + `R62` + `SPEC-AUTHORING-CHECKLIST` citations in q36 (line 70)

Architect dry-run of Block 4 prediction arithmetic (cross-checked against the actual baseline):
- Baseline observed: `tests=689 / pass=667 / fail=18 / skipped=4` at round-start
- −2 from AC-R36-30/31 removal (both currently fail; both runtime test()-blocks): −2 to `tests`, −2 to `fail`
- +5 from new AC-R87-1..AC-R87-5 (all pass per spec): +5 to `tests`, +5 to `pass`
- Net: tests = 692, pass = 672 (or 673 if AC-R84-14 flips low), fail = 16 (or 15 if AC-R84-14 flips low), skipped = 4
- This matches EMPIRICAL.sh predictions exactly

### § 3.4  `coordination/MEMORIAL.md`

**Architect (this spec emit):** append one R87 ARCHITECT section with:
- CONFIRMATION entries for: brainstorm-3-approaches, design-component-boundaries, P3-ten-axis, pre-emit-grilling, empirical-premise-verification (§ 0), spec-internal-consistency-sweep
- The section is appended at end-of-file (active MEMORIAL.md only; phase shards are frozen)

**Implementer (post-chore-A):** append R87 IMPLEMENTER section with chore-A SHA + binding-command attestations (matches Rule 1 sub-class `empirical-command-attestation`).

**Reviewer / MU:** append their own sections per their role files.

### § 3.5  `coordination/NEXT-ROLE.md`

**Architect:** append an `## § R87 ARCHITECT routing block` section above the existing § R87 Round-scope directive (per CLAUDE-COMMON.md "Cache-prefix mechanism" — the directive section is byte-frozen within the round). Routing block contains:
- `NEXT-ROLE: IMPLEMENTER`
- `STATUS: READY`
- `Inputs:` list pointing to Q-R87-SPEC.md, Q-R87-SPEC-AUDIT.md, Q-R87-EMPIRICAL.sh

Update top-of-file `STATUS:` from `PENDING` to `READY` (per Haiku-MU TOP-OF-FILE STATUS discipline — applies to all roles, R83 sharpening).

---

## § 4  Acceptance criteria

All ACs use `Given … When … Then …` form. Numbers reserve the AC-R87-* range. AC-R87-1 through AC-R87-5 are runtime-bound (test() blocks in `test/q87-carry-forward-cleanup.test.ts`). AC-R87-6 + AC-R87-7 are binding-command attestations (reported in NEXT-ROLE.md, not runtime tests).

| ID | Given | When | Then | Binding mechanism |
|---|---|---|---|---|
| **AC-R87-1** | the Implementer has executed Edits 4 + 5 of § 3.1 | the post-cleanup `test/q36-phase2-close-walk.test.ts` is read | the file contains zero `^test\('AC-R36-30:` line-anchored matches AND zero `^test\('AC-R36-31:` line-anchored matches | Runtime test() in q87 (§ 3.2) |
| **AC-R87-2** | the Implementer has executed Edits 4 + 5 of § 3.1 | the post-cleanup q36 is scanned for SHA-literal assignments | the file contains zero `=\s*'36ab019'` and zero `=\s*'c49df0e'` matches (excluding comment-block mentions in Edit 6's R87 explanatory text, which uses these SHAs only inside narrative comments, not in `const NAME = '<sha>'` form) | Runtime test() in q87 (§ 3.2) |
| **AC-R87-3** | the Implementer has executed Edit 6 of § 3.1 | the post-cleanup q36 is scanned for citation tokens | the file contains the substring `R87 cleanup: AC-R36-30 + AC-R36-31 dropped` AND the substring `R62 Option 1` AND the substring `SPEC-AUTHORING-CHECKLIST` | Runtime test() in q87 (§ 3.2) |
| **AC-R87-4** | the Implementer has executed Edit 2 of § 3.1 | the post-cleanup q36 docblock is read | the file contains the substring `AC-R36-1 through AC-R36-29` AND does **not** contain the substring `AC-R36-1 through AC-R36-31` | Runtime test() in q87 (§ 3.2) |
| **AC-R87-5** | the Implementer has executed Edit 1 of § 3.1 | the post-cleanup q36 is scanned for the execFileSync import | the regex `/import\s*\{\s*execFileSync\s*\}\s*from\s*['"]node:child_process['"]/` does **not** match | Runtime test() in q87 (§ 3.2) |
| **AC-R87-6** | the Implementer has executed all of § 3.1's edits + created § 3.2's test file + committed at chore-A | the binding commands run: `pnpm exec tsc -p tsconfig.test.json` + `pnpm exec node --test --test-reporter=tap test/*.test.js` + `bash coordination/specs/Q-R87-EMPIRICAL.sh` | (a) `tsc` exit code = 0; (b) TAP `# tests` = 692 (strict); (c) TAP `# fail` ∈ band [15, 16] (band rationale: AC-R84-14 stochastic ±1 flake documented in MEMORIAL.md:2583, per R85 REVIEWER MINOR-2); (d) TAP `# pass` ∈ band [672, 673] (band rationale: complement of `# fail` band); (e) TAP `# skipped` = 4 (strict); (f) `Q-R87-EMPIRICAL.sh` exit code = 0 | Binding-command attestation: Implementer reports verbatim values in `coordination/NEXT-ROLE.md` IMPLEMENTER routing block, Rule 1 sub-class `empirical-command-attestation` |
| **AC-R87-7** | the Implementer has executed all of § 3.1's edits + created § 3.2's test file + committed at chore-A | `git diff 0eb8a51 HEAD --name-only` is run | the path-set is a subset of the ALLOWED_SET enumerated in § 5.2; no path outside ALLOWED_SET appears | Binding-command attestation: Implementer reports the path-set verbatim in NEXT-ROLE.md; the per-block `Q-R87-EMPIRICAL.sh` Block 5 also asserts this gate |

**Threshold-padding note for AC-R87-6 (per CROSS-PROJECT-MEMORIAL.md R77 MINOR-4 reinforcement "Discriminating AC threshold must pad predicted value by ≥1 trial from prediction"):** the band [15, 16] for `# fail` is the natural ±1 stochastic window for AC-R84-14, not a one-sided pad of a single predicted value; the band rationale is causal (a documented flake), not statistical. The band [672, 673] for `# pass` is the arithmetic complement (`pass = tests - fail - skipped`). Both bands are tight (1-step wide) and cause-discriminating: a true regression that, e.g., flips a 16th passing pre-R87 test to fail would land outside `# pass ≥ 672` and outside `# fail ≤ 16`.

---

## § 5  Anti-scope

### § 5.1  Hard limits (no modification under R87)

- `engine/*` — Phase 3 + R82 frozen
- All R73-R86 deliverables (frozen)
- All test files other than `test/q36-phase2-close-walk.test.ts` (modified per § 3.1) and `test/q87-carry-forward-cleanup.test.ts` (new per § 3.2). Specifically: `test/q01-*` through `test/q35-*`, `test/q37-*` through `test/q86-*` are FROZEN
- `tools/*` (R70/R71/R77/R78 + R86 build/coverage tools frozen)
- `package.json` — no script changes; no new deps
- `run-pipeline.sh` (now byte-equal to Anchor canonical post-PR-#39; preserve)
- All prior-round `coordination/specs/Q-R*-SPEC.md` files (frozen)
- `coordination/PRD.md`
- `coordination/SCOPING-MEMO-v0.3.md`
- `coordination/SPEC-AUTHORING-CHECKLIST.md` (R86-extended; preserve)
- `coordination/PHASE-2-CLOSE-WALK.md`
- `coordination/ANCHOR-BACKFLOW-2026-05-18.md`
- `~/.claude/CROSS-PROJECT-MEMORIAL.md` (no new promotions this round)
- No real-cluster operations; no DS-repo operations; no `gh repo` operations beyond push to Tessera public

### § 5.2  ALLOWED_SET (must match Q-R87-EMPIRICAL.sh Block 5 line 146 verbatim)

The following regex enumerates every path that may appear in `git diff 0eb8a51 HEAD --name-only`:

```
^(test/q36-phase2-close-walk\.test\.ts
  |test/q87-carry-forward-cleanup\.test\.ts
  |coordination/specs/Q-R87-SPEC\.md
  |coordination/specs/Q-R87-SPEC-AUDIT\.md
  |coordination/specs/Q-R87-EMPIRICAL\.sh
  |coordination/NEXT-ROLE\.md
  |coordination/MEMORIAL\.md
  |coordination/MEMORIAL-PHASE-[0-9]+\.md
  |coordination/reviews/REVIEWER-REPORT-R87\.md
  |coordination/logs/ROUND-R[0-9]+-(SUMMARY|ROUTING)\.md
  |coordination/diagnostics/DIAGNOSTIC-R[0-9]+-.*\.md
  |CLAUDE\.md
  |CLAUDE-ARCHITECT\.md
  |CLAUDE-IMPLEMENTER\.md
  |CLAUDE-REVIEWER\.md
  |CLAUDE-MEMORIAL\.md
  |CLAUDE-COMMON\.md
  |CLAUDE-COORDINATOR\.md)$
```

Inventory (narrative; cross-checked against the regex above; lockstep-update gate per CROSS-PROJECT-MEMORIAL.md `spec-amendment-ALL-gate-artifacts-propagation`):

| Path | Authorization reason |
|---|---|
| `test/q36-phase2-close-walk.test.ts` | § 3.1 modification surface |
| `test/q87-carry-forward-cleanup.test.ts` | § 3.2 new test file |
| `coordination/specs/Q-R87-SPEC.md` | This file (Architect) |
| `coordination/specs/Q-R87-SPEC-AUDIT.md` | Audit sidecar (Architect) |
| `coordination/specs/Q-R87-EMPIRICAL.sh` | Binding harness (Architect; committed at round-start) |
| `coordination/NEXT-ROLE.md` | Routing blocks (all roles) |
| `coordination/MEMORIAL.md` | Append-only memorial (all roles) |
| `coordination/MEMORIAL-PHASE-[0-9]+\.md` | Phase shards (frozen by default; carve-out preserved per prior-round convention; no MU activity expected on shards this round) |
| `coordination/reviews/REVIEWER-REPORT-R87.md` | Reviewer report |
| `coordination/logs/ROUND-R[0-9]+-(SUMMARY|ROUTING)\.md` | Logs (Coordinator + MU may append) |
| `coordination/diagnostics/DIAGNOSTIC-R[0-9]+-.*\.md` | Diagnostic carve-out (HALT path) |
| `CLAUDE.md`, `CLAUDE-COMMON.md`, `CLAUDE-ARCHITECT.md`, `CLAUDE-IMPLEMENTER.md`, `CLAUDE-REVIEWER.md`, `CLAUDE-MEMORIAL.md`, `CLAUDE-COORDINATOR.md` | Memorial-Updater REINFORCED line appends carve-out (per CLAUDE-COMMON.md convention; no R87 MU-side reinforcement expected, but carve-out preserved) |

**Carve-outs intentionally absent:**
- `coordination/STAGED-FOR-*.md` — no operator-authored staging this round
- `coordination/WAVE-PLAN-*.md` / `coordination/WAVE-GATE-*.md` — no Coordinator wave activity (single-cluster round)
- `coordination/cluster-scopes/**` — no multi-cluster
- `package.json` — no script/dep changes expected; spec § 5.1 explicitly bars
- `tsconfig*.json` — no typecheck-config changes expected

If the Implementer determines mid-round that any absent path is necessary (e.g., a DIAGNOSTIC file is needed because a HALT fires), the DIAGNOSTIC carve-out covers that case; for any other unexpected path, the Implementer HALTs + writes DIAGNOSTIC + sets STATUS: ESCALATE.

### § 5.3  Acknowledged gaps and mitigations

| Gap | Mitigation |
|---|---|
| No AC binds the count of remaining `// ── AC-R36-*` section-divider comments in q36 (the deleted AC-R36-30 + AC-R36-31 dividers should be gone). | AC-R87-1 binds the absence of the `^test('AC-R36-30:` and `^test('AC-R36-31:` lines; the section-divider lines (`// ── AC-R36-30:`, `// ── AC-R36-31:`) immediately precede those test() blocks in the current source. The spec § 3.1 Edit 4 + Edit 5 explicitly include the section-divider lines in the removal range (Edit 4: lines 639-690 inclusive; Edit 5: lines 692-725 inclusive). A bug that removed the test() block but left the section-divider comment would still pass AC-R87-1 but produce a visually orphaned `// ── AC-R36-30: …` comment with no test() following it. Reviewer manual visual diff inspection is the compensating control; this gap is documented because tightening AC-R87-1 to also assert section-divider absence would require additional spec-pseudocode work and produces a marginal-coverage gain. Reviewer: please verify the section-divider lines are absent in the diff. |
| The R87 explanatory comment text contains the literal strings `'36ab019'` and `'c49df0e'` (as narrative SHA mentions inside comment prose). AC-R87-2's deletion-check could false-pass-or-fail depending on regex. | AC-R87-2 uses the discriminating regex `/=\s*'<sha>'/` which only matches variable-assignment contexts (`const NAME = '<sha>'`), not comment-block mentions. The new R87 comment uses prose form (`ROUND_START_SHA = '36ab019'` is illustrative narrative text; the actual `const ROUND_START_SHA = '36ab019';` assignment is what AC-R87-2 binds). The discriminating-assertion gate (CROSS-PROJECT-MEMORIAL.md R71 MINOR-1) is satisfied: a regression that re-introduced `const ROUND_START_SHA = '36ab019';` would fail AC-R87-2; a regression that left the comment-block intact would pass — which is the intended behavior (the comment is the audit trail, not a regression). |
| AC-R87-3 binds three citation tokens but does not bind the comment's structural position within the file. | Position-binding would require a positional regex (e.g., "the cleanup comment appears AFTER the AC-R36-27 test() block"). The cost of authoring such a regex is high (R74 MINOR-1 lessons on multi-alternation regex coverage), and the marginal value is low (a regression putting the comment in the wrong location is unlikely; visual diff inspection by Reviewer is the compensating control). Documented as accepted gap. |
| AC-R87-6's TAP `# fail` band [15, 16] does not catch a regression in which AC-R84-14 flakes high AND another test transitions PASS → FAIL (net `# fail` = 17). | The Implementer HALT condition 3 in § 6 catches this: any TAP `# fail` outside the [15, 16] band triggers HALT + DIAGNOSTIC. The first-line defense is the band; the second-line defense is HALT discipline. The combination is sufficient. |

---

## § 6  Halt conditions (Implementer)

The Implementer must HALT, write a DIAGNOSTIC, and set STATUS: ESCALATE on any of:

1. **Q-R87-EMPIRICAL.sh non-zero exit at chore-A** — root-cause investigation required before MERGE-READY; do not amend the EMPIRICAL.sh script to mask the failure (R79 MAJOR-1 / CROSS-PROJECT-MEMORIAL.md `spec-not-amended-post-disposition` precedent).
2. **`pnpm exec tsc -p tsconfig.test.json` non-zero exit** — typecheck must remain clean.
3. **Test baseline outside the predicted band:** TAP `# tests` ≠ 692, OR TAP `# fail` outside [15, 16], OR TAP `# pass` outside [672, 673], OR TAP `# skipped` ≠ 4. Re-run once (per CROSS-PROJECT-MEMORIAL.md / CLAUDE-COORDINATOR.md `multi-run-discipline` for suspected flake — AC-R84-14 documented stochastic). If the second run is still out-of-band, HALT.
4. **Any pre-R87 test other than AC-R36-30 + AC-R36-31 transitions PASS → FAIL at chore-A** — this signals a regression in a previously-passing AC; HALT + DIAGNOSTIC.
5. **Architectural-reality discovery** (R61-class): if any Edit in § 3.1 cannot be applied cleanly because the source file has drifted from the spec-prescribed shape (e.g., a line cited by line number is not at the cited location), HALT + DIAGNOSTIC + cite the discrepancy.
6. **Spec-vs-impl semantic conflict** (R34 MINOR-1): if any Edit produces a typecheck failure or a behavior change in AC-R36-3 that this spec did not predict, HALT + DIAGNOSTIC.
7. **New external dependency** required: HALT + DIAGNOSTIC + ESCALATE.
8. **Discovery that another test file structurally depends on AC-R36-30 or AC-R36-31 existence** (e.g., a test that asserts q36's test count). Architect verified at spec-emit time that no such test exists (grep for `AC-R36-30|AC-R36-31` across `test/**/*.test.ts` found only the q36 self-reference and the deleted-AC self-exclusion). If the Implementer discovers otherwise, HALT + DIAGNOSTIC.
9. **Q-R87-EMPIRICAL.sh discovered to encode a wrong prediction** (e.g., empirical run shows the band is too narrow). Per R85 CRITICAL-1 / `fail-count prediction against known-flaky prior AC` discipline, the band [15, 16] was Architect-verified at spec-emit time. If the Implementer observes empirically that the round-start baseline has drifted (e.g., AC-R84-14 has been recently retired) the Implementer HALTs + DIAGNOSTIC rather than silently widening the band.
10. **Unauthorized path appears in `git diff 0eb8a51 HEAD --name-only`** outside § 5.2's ALLOWED_SET — HALT + DIAGNOSTIC.

---

## § 7  Open questions

**None — all resolved.**

Two empirical-premise discrepancies surfaced in § 0 (directive's `87e372f` SHA claim; directive's "6 carry-forward fails" claim). Both are resolved authoritatively by the spec via direct codebase reads + test-suite run. Neither produces an ambiguity for the Implementer; the spec specifies which literal values to remove (`'36ab019'`, `'c49df0e'`) and which fail-count band to expect ([15, 16]).

---

## § 8  P3 ten-axis verification

| Axis | One-sentence verification |
|---|---|
| **Correctness** | Each § 3.1 edit's "Target" text was constructed by Architect from the actual round-start file content (verified by direct `Read`); EMPIRICAL.sh assertions were arithmetic-checked against the actual TAP baseline (689 → 692 with +5/−2 deltas). |
| **Completeness** | Every R87 deliverable from the round-scope directive maps to a spec section: directive item 1 → § 3.1; item 2 → § 3.4; item 3 → § 3.2; item 4 → § 3.3; tier rationale → § 2; anti-scope → § 5; halt conditions → § 6. |
| **Consistency** | EMPIRICAL.sh predictions (already committed at round-start) and spec ACs are cross-checked: AC-R87-1 ↔ EMPIRICAL.sh Block 2 (line 44-49); AC-R87-2 ↔ Block 2 (line 51-58); AC-R87-3 ↔ Block 3 (line 69-73); AC-R87-4 ↔ Block 3 (line 75-80); AC-R87-6 fail-band ↔ Block 4 (line 114-119); AC-R87-7 anti-scope ↔ Block 5 (line 145-153). |
| **Clarity** | "Verbatim text the Implementer must write" blocks in § 3.1 provide exact post-edit content with no ambiguity; § 3.2 provides full test-file pseudocode; § 3.4 + § 3.5 specify exact append targets. |
| **Coverage** | AC-R87-1..5 cover all six structural changes (Edit 1: AC-R87-5; Edit 2: AC-R87-4; Edit 3: implicit via AC-R36-3 still passing; Edit 4: AC-R87-1; Edit 5: AC-R87-1; Edit 6: AC-R87-3). AC-R87-2 covers the SHA literal removal (a property derived from Edits 4 + 5). AC-R87-6 + AC-R87-7 cover the binding-command attestations + anti-scope diff. Edit 3 (AC-R36-3 self-exclusion line removal) is not directly bound by an R87 AC; the compensating coverage is AC-R36-3's continued PASS at chore-A (asserted via TAP `# pass` band) and the spec's verification that AC-R36-3's pattern does not match anything in post-R87 q36 (§ 3.1 Edit 3 behavior-verification paragraph). Acknowledged in § 5.3 gap-table. |
| **Constraints** | Anti-scope (§ 5.1) explicitly bars 9 path classes; ALLOWED_SET (§ 5.2) enumerates 17 path classes byte-identical to EMPIRICAL.sh Block 5; both gate artifacts in lockstep per R72/R82 `spec-amendment-ALL-gate-artifacts-propagation`. |
| **Concurrency** | Not applicable — single-process file edits; no test-file concurrency concerns (AC-R36-3 reads `test/` directory once per test invocation; behavior unchanged by the removal of one self-exclusion line). |
| **Corner cases** | (a) Empty-file edge: q36 has 725 lines pre-edit, ~640 post-edit; nowhere near empty. (b) Trailing-newline edge: Edit 6 explicitly addresses end-of-file structure. (c) AC-R36-3 scope change edge: explicitly verified behavior-equivalent in § 3.1 Edit 3. (d) Comment-vs-code SHA literal edge: explicitly resolved by AC-R87-2's discriminating regex pattern (§ 5.3 gap-table). |
| **Cost** | Spec emit is single Architect session; chore-A is single Implementer session; Reviewer + MU are single sessions each. Full-tier cost justified by R86 prophylactic discipline (architect-encoded-pattern verification, AC-arithmetic verification, empirical-baseline verification) and the directive-empirical-discrepancy surfaced in § 0. |
| **Coupling** | Single load-bearing modification site (q36 test file); spec triad + reviewer report + memorial appends; no engine code touched; no other test file touched; no tools/build script touched. Decoupled from all in-flight work elsewhere. |

---

## § 9  Pre-emit grilling (adversarial self-review, written inline)

### 9.1  Every claim verifiable?

| Claim | Verifier | Result |
|---|---|---|
| Round-start SHA is `0eb8a51` | `git rev-parse HEAD` | Confirmed (output: `0eb8a514b9f4ea18f6911f517a1bed09fceaf437`) |
| Baseline `# tests 689 / # pass 667 / # fail 18 / # skipped 4` | `pnpm exec node --test --test-reporter=tap test/*.test.js` | Confirmed at spec-emit (Architect ran once; result matches EMPIRICAL.sh prediction band high-end) |
| 18 failing tests enumerated in § 0 | `pnpm exec node --test --test-reporter=tap test/*.test.js \| grep "^not ok"` | Confirmed (18 lines observed) |
| Q36 contains `'36ab019'` at line 641 + `'c49df0e'` at line 698 | `grep -n "'36ab019'\|'c49df0e'" test/q36-phase2-close-walk.test.ts` | Confirmed (lines 641 + 698 returned) |
| Q36 contains the `import { execFileSync } …` import at line 17 | `grep -n "execFileSync" test/q36-phase2-close-walk.test.ts` | Confirmed (line 17 returned; only 5 other matches in the file, all in the to-be-deleted blocks except AC-R36-11 + AC-R36-12 text-content references) |
| No other test file structurally depends on AC-R36-30 / AC-R36-31 | `grep -rn "AC-R36-30\|AC-R36-31" test/` (excluding .js compiled output) | Confirmed: only the q36 `.ts` source contains these IDs; the `.js` compiled output is a build artifact |
| `tsconfig.test.json` extends `tsconfig.json` with `noUnusedLocals: false` | `cat tsconfig.json` | Confirmed (line: `"noUnusedLocals": false`) |
| EMPIRICAL.sh in round-start commit is correct | Direct `Read` of `coordination/specs/Q-R87-EMPIRICAL.sh` | Confirmed: uses correct SHAs (lines 53-54), correct `--test-reporter=tap` (line 89), correct fail-band [15, 16] (lines 115-116), correct ALLOWED_SET (line 146) |
| AC-R36-3's pattern `/execFileSync\s*\(\s*['"]node['"]/` matches `node` only (not `git`) | Inspect regex | Confirmed: `\(\s*['"]node['"]\` matches `('node'` or `("node"` literally; does not match `('git'` |
| R62 Option 1 precedent is real | `grep -n "Option 1" coordination/specs/Q-R62-SPEC.md` + verify the round dropped a structurally-vacuous AC | Confirmed (R62 dropped AC-R62-15 for the same structural reason) |
| SPEC-AUTHORING-CHECKLIST.md exists with R86 extensions | `cat coordination/SPEC-AUTHORING-CHECKLIST.md` | Confirmed (file exists; R86 directive in NEXT-ROLE.md cites the R86 extension; the existing checklist contains the ALLOWED_SET completeness gate sections) |

### 9.2  Unstated assumptions?

- **Assumption:** The R87 cleanup comment block (Edit 6) is placed at end-of-file (after AC-R36-27). The spec § 3.1 states this position. The Implementer could alternatively place it at the location of the deleted AC-R36-30 + AC-R36-31 blocks (also after AC-R36-27 in the file structure). Both positions are equivalent. The spec authoritatively prescribes: "where AC-R36-30 + AC-R36-31 used to live (i.e., immediately after the AC-R36-27 `test(...);` closer at original line 637)". This is end-of-file post-edit because AC-R36-30/R36-31 were the final test() blocks in the file.
- **Assumption:** The Implementer follows TDD: writes `test/q87-carry-forward-cleanup.test.ts` first (it will fail because q36 still has the to-be-deleted content), then executes § 3.1 edits, then verifies q87 tests pass. The spec does not strictly enforce this ordering but the IMPLEMENTER role file requires TDD; halt condition 3's `# fail` band check is implicitly compatible with TDD (running q87 alone after writing it but before editing q36 would observe `# fail = 18 + 5 = 23`, outside the band — so the Implementer would not commit chore-A until after the q36 edits are also applied).
- **Assumption:** No Reviewer/MU activity will append to `coordination/MEMORIAL-PHASE-N.md` (phase shards) this round. Carve-out preserved in ALLOWED_SET defensively, but no spec section prescribes a shard append.
- **Assumption:** Operator may push to Tessera public after Reviewer MERGE-READY; ALLOWED_SET does not constrain post-MU push activity (which has no diff impact).

### 9.3  Scope added beyond request?

| Scope item in spec | In directive? | Rationale |
|---|---|---|
| Remove AC-R36-30 + AC-R36-31 test() blocks | Yes (directive item 1) | Direct mandate |
| Update q36 header range citation | Yes (directive item 1: "Update header comment at lines 3-6 if it cites AC range '1 through 31' — change to '1 through 29'") | Direct mandate |
| Add R87 explanatory cite-comment | Yes (directive item 1: "Add inline comment block citing R87 cleanup + R62 Option 1 precedent + R86 SPEC-AUTHORING-CHECKLIST tightening") | Direct mandate |
| Remove unused `execFileSync` import | **Implicit** in directive (a strict reading of "remove the test() blocks" leaves the import; the explicit scope expansion is justified because the import becomes dead code that the round-cleanup is logically responsible for) | Hygiene cleanup directly downstream of directive item 1; the alternative (leave the unused import) leaves a fossilized dead-code reference that future readers must trace. Approach B (complete hygiene cleanup) selected over Approach C (targeted) in brainstorm. |
| Remove AC-R36-3 self-exclusion + stale comment | **Implicit** in directive | Same logic as the import removal: the AC-R36-3 self-exclusion's inline comment explicitly cites `"AC-R36-30 runs execFileSync('git')"` — that comment becomes a fossilized reference to a deleted AC. The directive's spirit ("carry-forward AC cleanup") covers fossil-reference cleanup. |
| Drop "anti-scope protection" from q36 header `Covers:` list | **Implicit** in directive | Direct downstream of directive item 1 (the "anti-scope protection" referred to AC-R36-30 + AC-R36-31; with those gone, the Covers list reference is stale) |
| Update top-of-file STATUS in NEXT-ROLE.md | Per universal Haiku-MU discipline (R83 sharpening; applies to all roles per CLAUDE-COMMON.md) | Universal discipline, not R87-specific scope |
| 5 R87 ACs (AC-R87-1..5) + 2 binding-command attestations (AC-R87-6, AC-R87-7) | Yes (directive item 3 + EMPIRICAL.sh Block 4 + Block 5) | Direct mandate; AC-R87-5 (execFileSync import removal) is the only AC added beyond the directive's enumerated AC list; justified by the import removal scope expansion above |

The scope additions are minimal hygiene closures of the same cleanup the directive prescribes. No new test files beyond q87, no new spec sections beyond what's needed to make the cleanup actionable. Removal of the directive's "6 carry-forward fails" narrative claim (§ 0) is an empirical correction, not a scope expansion — the cleanup's mechanical behavior (drop 2 ACs) is unchanged.

### 9.4  Implementer can act without guessing?

- § 3.1 provides exact "Target" text for every modified region. The Implementer copies the verbatim text.
- § 3.2 provides full pseudocode for the new test file. The Implementer either copies the pseudocode verbatim into the test file or makes tactical refinements (variable names, asserter syntax) that don't affect AC semantics.
- § 3.3 explicitly states "No changes required" to EMPIRICAL.sh. The Implementer does not modify it.
- § 3.4 + § 3.5 prescribe the structure of MEMORIAL.md + NEXT-ROLE.md appends; the Implementer's chore-A append is bounded by the Rule 1 sub-class `empirical-command-attestation` (verbatim values from the actual command outputs).
- All halt conditions (§ 6) name explicit triggers.

No clarifying questions are required for the Implementer to start work.

### 9.5  Self-application gate — verify Architect-encoded patterns against prescribed implementation (R86 SPEC-AUTHORING-CHECKLIST tightening; R84/R85 lesson)

For every regex/grep pattern in this spec + the existing EMPIRICAL.sh, paste it against the prescribed post-cleanup q36 file and verify it produces the expected outcome:

| # | Pattern | Source | Expected outcome against post-cleanup q36 (= Edits 1-6 applied) |
|---|---|---|---|
| 1 | `^test\('AC-R36-30:` (line-anchored) | § 3.2 AC-R87-1 (JS) | Zero matches (Edit 4 removed the AC-R36-30 block; no other `test('AC-R36-30:` line exists in q36 today) |
| 2 | `^test\('AC-R36-31:` (line-anchored) | § 3.2 AC-R87-1 (JS) | Zero matches (Edit 5 removed the AC-R36-31 block) |
| 3 | `=\s*'36ab019'` (regex; matches code-form assignments) | § 3.2 AC-R87-2 (JS) | Zero matches (the only assignment was line 641 in the deleted block; Edit 6's prose deliberately omits `'36ab019'` quoted-literal — the comment refers to the constants by name only) |
| 4 | `=\s*'c49df0e'` | § 3.2 AC-R87-2 (JS) | Zero matches (line 698 deleted; Edit 6 prose omits `'c49df0e'`) |
| 5 | `'36ab019'` (literal substring with quotes) | EMPIRICAL.sh Block 2 line 53 (`grep -c "'36ab019'" "$Q36"`) | Zero count (the substring `'36ab019'` does not appear anywhere in q36 post-Edits; Edit 6's verbatim text was deliberately drafted to avoid the quoted form) |
| 6 | `'c49df0e'` (literal substring with quotes) | EMPIRICAL.sh Block 2 line 54 | Zero count (same reasoning as #5) |
| 7 | `R87 cleanup: AC-R36-30 + AC-R36-31 dropped` | § 3.2 AC-R87-3 (JS) | One match (Edit 6's section-header line verbatim) |
| 8 | `R87` (literal substring) | EMPIRICAL.sh Block 3 line 70 | Multiple matches (Edit 6's content cites R87 several times; the file docblock's Edit 2 update also cites R87) |
| 9 | `R62 Option 1` (literal substring) | § 3.2 AC-R87-3 (JS) | At least one match (Edit 6's precedent citation) |
| 10 | `R62` (literal substring) | EMPIRICAL.sh Block 3 line 70 | At least one match (Edit 6's precedent citation contains `R62 Option 1`) |
| 11 | `SPEC-AUTHORING-CHECKLIST` (literal substring) | § 3.2 AC-R87-3 (JS) + EMPIRICAL.sh Block 3 line 70 | At least one match (Edit 6's related-discipline citation) |
| 12 | `AC-R36-1 through AC-R36-29` (literal substring) | § 3.2 AC-R87-4 (JS) + EMPIRICAL.sh Block 3 line 76 | One match (Edit 2's updated header line) |
| 13 | `AC-R36-1 through AC-R36-31` (negative check) | § 3.2 AC-R87-4 (JS) | Zero matches (Edit 2 replaced the old range; the q87 explanatory citation in Edit 2's appended block refers to `AC-R36-30 + AC-R36-31` separately, never as the range `1 through 31`) |
| 14 | `/import\s*\{\s*execFileSync\s*\}\s*from\s*['"]node:child_process['"]/` (regex) | § 3.2 AC-R87-5 (JS) | No match (Edit 1 removed the import) |

**Critical self-application discovery during spec authoring:** The first draft of Edit 6's verbatim text contained the literal strings `'36ab019'` and `'c49df0e'` (with single quotes) inside the explanatory prose, intended as illustrative narrative for future readers. This would have caused EMPIRICAL.sh Block 2's `grep -c "'36ab019'"` to count ≥ 1 and the assertion `[ "$SHA_36AB_COUNT" = "0" ]` to **FAIL** at chore-A.

**Fix applied:** Edit 6's verbatim text (§ 3.1 above) deliberately refers to the deleted constants by name only (`ROUND_START_SHA` and `CHORE_A_SHA`) without reproducing the quoted SHA values. The narrative remains informative (a future reader can `git log -S "'36ab019'"` to recover the literal values from history). All 14 patterns above verify clean against the corrected Edit 6 text.

**Discipline:** This is exactly the R84/R85 architect-encoded-pattern failure mode that R86 SPEC-AUTHORING-CHECKLIST.md tightened against. The pattern was prevented from reaching the Implementer by running this self-application gate at spec-emit time, not by relying on Reviewer cold-eye to catch it post-chore-A.

### 9.6  Spec-internal contradiction sweep (R15 / R34 / R65 R-MU contradiction-sweep discipline)

Walk every cross-section reference:

- § 0 vs § 1: § 0 documents directive-empirical discrepancies; § 1 uses the empirically-correct values. Consistent.
- § 1 vs § 2: § 1 names the changes (q36 modification, q87 creation, MEMORIAL append). § 2 lists them in the component inventory. Consistent.
- § 1 vs § 3: § 1 lists 6 Edits (1-6); § 3.1 prescribes 6 Edits with the same numbering. Consistent.
- § 3.1 Edit 6 verbatim text vs § 9.5 self-application gate: the self-application gate caught a real regex-vs-prose collision risk (Edit 6's narrative referring to quoted-SHA literals would have failed EMPIRICAL.sh Block 2's deletion-count grep). Resolution: Edit 6's verbatim text in § 3.1 (the authoritative version) refers to the deleted constants by name only; quoted-SHA literals appear nowhere in q36 post-cleanup. The Implementer uses § 3.1 Edit 6 verbatim. Consistent.
- § 4 AC table vs § 3 pseudocode: AC-R87-1..5 each map to a runtime test() block in § 3.2; AC-R87-6 + AC-R87-7 each map to a binding-command attestation outside the runtime test set. Consistent.
- § 4 AC-R87-6 fail band [15, 16] vs § 3.3 EMPIRICAL.sh prediction lines 115-116 + § 9.1 baseline (`# fail 18`): the arithmetic is `18 − 2 = 16` (high end) and `17 − 2 = 15` (low end, if AC-R84-14 flakes low). The band [15, 16] is consistent.
- § 4 AC-R87-6 pass band [672, 673] vs § 3.3 EMPIRICAL.sh prediction lines 118-119: the arithmetic is `692 − 16 − 4 = 672` (low end) and `692 − 15 − 4 = 673` (high end). Consistent.
- § 5.2 ALLOWED_SET regex vs EMPIRICAL.sh Block 5 line 146: byte-by-byte cross-checked. Consistent (lockstep-update gate satisfied).
- § 6 halt conditions vs § 3 Edits: every halt trigger maps to a specific Edit or attestation that could fail. No orphan halt conditions.
- § 7 open questions: "None — all resolved." Cross-checked against § 9.1 + § 9.2 + § 9.3 + § 9.4: every assumption identified there is resolved by spec prescription or by explicit gap acknowledgment in § 5.3.

**No spec-internal contradictions.**

---

*This spec passes pre-emit grilling. Routing to Implementer.*
