# Reviewer Report — R75 (cross-session prompt-cache engineering)

**Reviewer HEAD:** `4fe6476` (chore(R75 IMPLEMENTER): record chore-A coordination SHA in routing block)
**Chore-A SHA (Implementer-attested):** `c6f33a2`
**Round-start SHA:** `6002dd6`
**Spec:** `coordination/specs/Q-R75-SPEC.md`
**Tier:** full
**Mode:** full-adversarial (default for tier=full)

---

## 1. Per-AC verification table

| AC | Criterion (short) | Status | Evidence |
|---|---|---|---|
| AC-R75-1 | `bash Q-R75-EMPIRICAL.sh` exit 0, every Block PASS | PASS | Reviewer ran at HEAD: `PASS 8 / FAIL 0 / exit 0` (all 8 blocks PASS); see § 5 below |
| AC-R75-2 | `--emit prefix --round R75` exit 0 + stdout > 0 | PASS | Test `AC-R75-2: build-role-context.js --emit prefix produces non-empty output` PASS (test/q75-cache-prefix.test.js); Reviewer re-ran: exit 0, stdout ~177KB |
| AC-R75-3 | Two consecutive prefix invocations byte-identical (sha256) | PASS | Test `AC-R75-3: prefix is byte-identical across two consecutive invocations` PASS; EMPIRICAL.sh Block 4 PASS; code at `scripts/build-role-context.ts:116-128` (`buildPrefix`) has no `Date.now`/`Math.random`/env-reads |
| AC-R75-4 | Prefix bytes stable across `--role` choice | PASS | Test `AC-R75-4: prefix is independent of --role choice` PASS; EMPIRICAL.sh Block 5 PASS; `main()` at `scripts/build-role-context.ts:152-155` `case 'prefix'` ignores `args.role` |
| AC-R75-5 | Tail bytes pairwise distinct across IMPL/REV/MU | PASS | Test `AC-R75-5: tail differs across role choices` PASS; `resolveRoleClaudeFile` at `scripts/build-role-context.ts:68-80` returns three distinct paths (CLAUDE-IMPLEMENTER.md, CLAUDE-REVIEWER.md, CLAUDE-MEMORIAL.md) |
| AC-R75-6 | `--emit tail --role REVIEWER` contains role+round literals | PASS | Test `AC-R75-6: tail contains role-stamp lines naming role + round` PASS; `buildRoleStamp` at `scripts/build-role-context.ts:130-136` emits exactly the two literal substrings |
| AC-R75-7 | `full == prefix + "\n" + tail` byte-for-byte | PASS | Test `AC-R75-7: full = prefix + LF + tail` PASS; `main()` `case 'full'` at `scripts/build-role-context.ts:159-164` does `prefix + '\n' + tail` |
| AC-R75-8 | `measure-cache-effect.js` emits JSON with prescribed fields | PASS | Test `AC-R75-8: measure-cache-effect.js emits JSON with prescribed fields` PASS; output fields at `scripts/measure-cache-effect.ts:68-78` enumerate `round`, `prefix_bytes`, `prefix_sha256`, `tail_bytes.*`, `tail_tokens_est.*`, `chars_per_token=3.5`, `estimated_cache_hit_savings_percent_per_2nd_plus_session`, `measurer_version="0.1.0"` |
| AC-R75-9 | R73 anti-regression: `tier-router.js --directive R72 --mode heuristic` shape-valid | PASS | Test `AC-R75-9` PASS; EMPIRICAL.sh Block 6 PASS; `scripts/tier-router.js` + `scripts/tier-router-fixtures/R72-directive.md` not modified by R75 |
| AC-R75-10 | R74 anti-regression: `mu-model-select.js --tier full F1` returns Branch 4 default-haiku | PASS | Test `AC-R75-10` PASS; observed `model="claude-haiku-4-5-20251001"`, `rationale="default haiku (no cross-round-pattern marker)"`, `decision_path=["default_haiku"]` |
| AC-R75-11 | R74 anti-regression: `mu-model-select.js --tier full F2` returns Class A `claude-sonnet-4-6` | PASS | Test `AC-R75-11` PASS; observed `model="claude-sonnet-4-6"`, `decision_path=["marker_match","class_A"]` |
| AC-R75-12 | `grep -c "^# REINFORCED " CLAUDE-COMMON.md` == 8 | PASS | EMPIRICAL.sh Block 8 PASS (REINFORCED count: 8); Reviewer re-ran grep at HEAD: 8 matches at lines 342/345/358/367/376/383/390/397/410 of `CLAUDE-COMMON.md` |
| AC-R75-13 | Round-start→HEAD diff ⊆ ALLOWED_SET (§ 5.1) | PASS | EMPIRICAL.sh Block 7 PASS; `git diff 6002dd6..HEAD --name-only` produces 11 paths, all members of the 14-path ALLOWED_SET |
| AC-R75-14 | `grep -c "## Cache-prefix mechanism (Mode docs"` == 1 | PASS | Reviewer ran `grep -c "## Cache-prefix mechanism (Mode docs" CLAUDE-COMMON.md` → 1; section at `CLAUDE-COMMON.md:112` |
| AC-R75-15 | `run-pipeline.sh` integration site present + legacy line in `[[ -z "$context_bundle" ]]` fallback | PASS | `grep -n build-role-context run-pipeline.sh` returns lines 1663, 1669, 1670; legacy `cat ...` line at `run-pipeline.sh:1682` is inside `[[ -z "$context_bundle" ]]` guard at `run-pipeline.sh:1681` |

**Summary: 15 / 15 PASS.**

---

## 2. Findings

### MINOR-1 (ARCHITECT) — Spec § 3.1 pseudocode `process.stdout.write(out); process.exit(0)` is empirically broken on outputs > 64 KB

Spec § 3.1 (`Q-R75-SPEC.md:435-436`) prescribes:
```typescript
  process.stdout.write(out);
  process.exit(0);
```

Reviewer empirically verified this pattern truncates at exactly 65,536 bytes when stdout is a pipe:

```
$ node -e "process.stdout.write('x'.repeat(500000)); process.exit(0);" | wc -c
65536
```

The R75 prefix (CLAUDE-COMMON.md + 1504-line Q-R75-SPEC.md + Q-R75-SPEC-AUDIT.md + Q-R75-EMPIRICAL.sh + directive section) is ~177 KB — well above the 64 KB stdio pipe buffer. If implemented verbatim, AC-R75-3 (`a.stdout == b.stdout`) and AC-R75-7 (`f == p + '\n' + t`) would both consume truncated outputs from `spawnSync` and would either fail or false-PASS in arbitrary ways.

The Implementer correctly identified this defect and applied TD-1 (`scripts/build-role-context.ts:166-169`: `process.stdout.end(out)`), disclosed in NEXT-ROLE.md:3706-3710. The fix is functionally correct (`stdout.end` drains the buffer before allowing process exit).

**Discipline classification:** This is an R61-class "architectural-reality discovery" (spec assumption contradicted by Node.js stdio reality). Per § 10 halt condition #5 and per R72 CRITICAL-1 / R74 CRITICAL-1 lineage, an R61-class discovery is a HALT + DIAGNOSTIC + ESCALATE condition, not a tactical autonomy substitution. The Implementer's TD-1 disclosure is transparent (R73 MAJOR-2 precedent: "disclosure ≠ substitute for DIAGNOSTIC"). However, the spec § 6.4 guard rails enumerate four prohibited categories (a)–(d) and `process.exit`/stdout-flush semantics are not on the list, so the tactical autonomy classification is defensible at the literal reading.

**Attribution:** ARCHITECT — the spec § 9.6 self-application gate failed to walk the actual stdout-flush semantics under realistic prefix size. R74 MINOR-5 reinforcement ("spec pseudocode that would fail an AC if implemented verbatim") was the existing rule the Architect should have applied; this is its second instance.

### MINOR-2 (ARCHITECT) — Spec § 3.1 bare `main();` fires on import via measure-cache-effect.ts circular dependency

Spec § 3.1 last line (`Q-R75-SPEC.md:447`):
```typescript
main();
```

Spec § 3.2 (`Q-R75-SPEC.md:475`):
```typescript
import { buildPrefix, buildTail } from './build-role-context';
```

If implemented verbatim, importing `build-role-context` from `measure-cache-effect` executes `main()` at import time. `parseArgs(process.argv)` would then see `measure-cache-effect`'s argv (which lacks `--emit`) and the script would exit with stderr `--emit prefix|tail|full is required` before `measure-cache-effect`'s own `main()` ran. AC-R75-8 (measurer JSON shape) would FAIL.

The Implementer correctly identified this and applied TD-2 (`scripts/build-role-context.ts:182-184`: `if (require.main === module) { main(); }`), disclosed in NEXT-ROLE.md:3712-3715.

**Attribution:** ARCHITECT — spec § 9.6 self-application gate did not walk the cross-module import path. The Architect's own § 9.6 check listed AC-R75-3/-4/-5/-7/-8 but did not trace AC-R75-8's import-time execution of build-role-context's main(). Same R74 MINOR-5 class as MINOR-1.

### MINOR-3 (ARCHITECT) — Spec § 3.3 Delta B prescribes `local measure_out=""` outside a bash function

Spec § 3.3 Delta B (`Q-R75-SPEC.md:600-619`) prescribes the telemetry block:
```bash
{
  echo ""
  echo "## Cache-prefix telemetry"
  if [[ -f "$PROJECT_ROOT/scripts/measure-cache-effect.js" ]]; then
    local measure_out=""
    ...
```

The spec instructs insertion "immediately after the closing `}` of the routing-log heredoc at line ~291", which is at script top level (NOT inside a function). `local` is invalid outside a function body in bash and would error `local: can only be used in a function`.

The Implementer correctly identified this and applied TD-3 (`run-pipeline.sh:309`: dropped `local`), disclosed in NEXT-ROLE.md:3717-3720.

**Attribution:** ARCHITECT — § 9.6 self-application gate did not verify the prescribed insertion-site context against the `local` keyword's bash semantics.

### OBS-1 — AC-R75-9 anti-regression is shape-only

AC-R75-9 (`test/q75-cache-prefix.test.ts:108-116`) asserts `tier ∈ {full, audit, implementer-only, coordinator-only}` + `confidence ∈ [0,1]` + `rationale` non-empty. A regression that silently always returns `{tier: 'full', confidence: 1.0, rationale: 'fallback'}` would PASS this AC while breaking tier-router's discrimination behavior. Spec § 5.3 acknowledges this is a deliberate smoke-test bounded by q73's own coverage; not blocking. Below 3-instance threshold per Rule 7.

### OBS-2 — AC-R75-8 measurer JSON shape AC does not verify savings math

AC-R75-8 (`test/q75-cache-prefix.test.ts:89-103`) checks types + presence of `estimated_cache_hit_savings_percent_per_2nd_plus_session` field but does not verify the value derives correctly from `prefix_tokens_est`, `tail_tokens_est`, and `CACHE_HIT_INPUT_RATIO=0.1`. A bug that silently emits the wrong percentage would not be caught. Acknowledged in spec § 5.3 gap table; deferred to R76+ operator-side empirical measurement.

### OBS-3 — EMPIRICAL.sh Block 3 test-count thresholds are loose

`Q-R75-EMPIRICAL.sh:75-82` checks `tests > 539` and `pass > 531`. After R75 lands at 549/541, a future regression that drops counts to 540/532 (loss of 9 tests / 9 passing) would still PASS this block. For chore-A round-internal verification this is fine (the Implementer knows the actual chore-A counts); for any future re-run this is degraded coverage. Acknowledged design tension between SHA-pinning vs forward-evolution-tolerance.

### OBS-4 — `extractDirectiveSection` fallback branches untested

Spec § 9.8 acknowledged that the (NEXT-ROLE.md missing) and (heading missing) fallback branches of `extractDirectiveSection` are not exercised by any AC. Below 3-instance threshold per Rule 7; documented acknowledged gap.

---

## 3. Right-reasons audit (3 tests)

**Test A — AC-R75-3 (prefix determinism)**
- Spec requirement: § 1.3 contract "no timestamps, no random salts, no environment-dependent strings"; § 3.1 `buildPrefix` semantics.
- Test: spawns builder twice with identical args; compares sha256 of stdout.
- Production code: `buildPrefix` at `scripts/build-role-context.ts:116-128` is a pure function of file contents (read via `readFileSync`) and the round/projectRoot args; no `Date.now()`, no `Math.random()`, no `process.env` reads.
- **Verdict:** Passes for the right reason. Would FAIL if any future change introduces a timestamp or random salt into the prefix path. Not self-confirming — the test does not re-implement the concatenation; it only checks byte-identity.

**Test B — AC-R75-4 (prefix is role-independent)**
- Spec requirement: § 0 prefix-tail split — prefix must be byte-identical across IMPL/REV/MU within a round (the load-bearing cache-hit property).
- Test: invokes `--emit prefix --role X` for three role values; checks sha256 equality across all three.
- Production code: `main()` switch at `scripts/build-role-context.ts:152-155` `case 'prefix'` calls `buildPrefix(args.projectRoot, args.round)` — does NOT pass `args.role`. The role argument is structurally ignored.
- **Verdict:** Passes for the right reason. Would FAIL if `buildPrefix` ever read `args.role`. Not self-confirming.

**Test C — AC-R75-7 (full = prefix + LF + tail)**
- Spec requirement: § 3.1 "Inside `buildFull`: `prefix + '\n' + tail`. One `'\n'` between them" — the load-bearing concat invariant for cache-hit boundary detection.
- Test: invokes builder three times (prefix, tail, full); asserts `f.stdout == p.stdout + '\n' + t.stdout`.
- Production code: `main()` `case 'full'` at `scripts/build-role-context.ts:159-164` does `out = prefix + '\n' + tail`. Test mirrors the production formula — risk of tautology.
- **Verdict:** Loose self-confirming risk, but the property being tested is meaningful: the cache prefix boundary lands at exactly the LF separator, so a future change to (e.g.) `prefix + '\n\n' + tail` or `prefix + tail` would break Anthropic's prefix-cache hit at the bundle's prefix↔tail interface. The test catches that. Acceptable.

---

## 4. Cross-cutting checks

### TDD discipline — VERIFIED
```
6a6689a test(R75 RED): q75-cache-prefix.test.ts — 10 ACs, 7 fail (builder/measurer missing)
dc86e24 feat(R75 GREEN): scripts/build-role-context.ts + measure-cache-effect.ts
95519ed feat(R75): run-pipeline.sh integration + CLAUDE-COMMON.md Mode docs + package.json scripts
```
Separate RED commit before GREEN; matches R23 IMPL MINOR-1 reinforcement. RED commit message attests "7 fail (builder/measurer missing)" — pre-implementation failure state.

### No-skip / halt discipline — TD-1 BORDERLINE; TD-2/TD-3 CORRECT
TD-2 (require.main guard) and TD-3 (dropped `local`) are clean tactical autonomy: the spec pseudocode contains a syntactic defect that prevents execution; the Implementer applied the minimal syntactic fix. Both are within § 6.4's "syntactic adjustments" carve-out.

TD-1 (process.stdout.end) is borderline: see MINOR-1 above. The fix is empirically necessary, but the discipline question is whether discovering "spec pseudocode produces truncated output >64 KB" is "R61-class architectural-reality discovery" (→ HALT + DIAGNOSTIC) or "syntactic adjustment" (→ tactical autonomy). Reviewer flags as MINOR rather than MAJOR because (a) the deviation is fully disclosed, (b) the fix is functionally equivalent for sub-64 KB outputs and strictly better for >64 KB, (c) no AC bound the prescribed `write+exit` sequence specifically, (d) § 6.4 guard rails do not explicitly enumerate process.exit semantics.

### Anti-scope — CLEAN
`git diff 6002dd6..HEAD --name-only` returns exactly 11 paths at Reviewer HEAD (`4fe6476`):
```
CLAUDE-COMMON.md
coordination/MEMORIAL.md
coordination/NEXT-ROLE.md
coordination/logs/ROUND-R75-ROUTING.md
coordination/specs/Q-R75-EMPIRICAL.sh
coordination/specs/Q-R75-SPEC-AUDIT.md
coordination/specs/Q-R75-SPEC.md
package.json
run-pipeline.sh
scripts/build-role-context.ts
scripts/measure-cache-effect.ts
test/q75-cache-prefix.test.ts
```
All 11 are members of the 14-path ALLOWED_SET (§ 5.1). Engine/*, demos/*, tools/*, tier-router*, mu-model-select* all unmodified. CLAUDE-{ARCHITECT,IMPLEMENTER,REVIEWER,MEMORIAL,COORDINATOR}.md REINFORCEMENTS unmodified. CLAUDE-COMMON.md REINFORCED count = 8 (unchanged).

### Within-round prefix-continuity invariant (§ 6.2) — VERIFIED for spec triad
Spec triad (Q-R75-SPEC.md, Q-R75-SPEC-AUDIT.md, Q-R75-EMPIRICAL.sh) committed at `a466aa4` (Architect commit). Subsequent commits modify ONLY: test file (RED), scripts (GREEN), run-pipeline.sh + CLAUDE-COMMON.md + package.json (additional GREEN), NEXT-ROLE.md (Implementer routing block appends below the directive section), MEMORIAL.md, logs/ROUND-R75-ROUTING.md. Spec triad untouched post-chore-A. Directive section preservation cannot be verified by Reviewer (Reviewer modifying NEXT-ROLE.md routing block would itself add to it, not modify the directive); inspecting via `git log -p coordination/NEXT-ROLE.md` shows only appends below `## § R75 Round-scope directive`.

---

## 5. Empirical re-runs at Reviewer HEAD (`4fe6476`)

**`pnpm exec tsc -p tsconfig.test.json`**: exit 0 (no diagnostics).

**`pnpm exec node --test test/q75-cache-prefix.test.js`**: 10 tests / 10 pass / 0 fail / 0 skipped, duration ~700ms.

**`bash coordination/specs/Q-R75-EMPIRICAL.sh`** (observed verbatim):
```
PASS  Block: round-start-sha-valid
  observed tsc exit: 0
PASS  Block: tsc-exit-0
  observed: # tests 549
  observed: # pass 541
  observed: # fail 5
  observed: # skipped 3
PASS  Block: node-test-pass-fail-counts
PASS  Block: builder-determinism
PASS  Block: builder-prefix-stability-across-roles
  observed: q73+q74 exit=0;
PASS  Block: anti-regression-q73-q74
  observed diff path count: 11 (no count constraint enforced)
PASS  Block: anti-scope-diff-allowed-set
  observed CLAUDE-COMMON.md REINFORCED count: 8 (expected 8)
PASS  Block: claude-common-reinforced-count-unchanged

====================
PASS: 8
FAIL: 0
====================
```

**Stdout-truncation empirical (corroborates MINOR-1):**
```
$ node -e "process.stdout.write('x'.repeat(500000)); process.exit(0);" | wc -c
65536
$ node -e "process.stdout.end('x'.repeat(500000));" | wc -c
500000
```

---

## 6. Grilling (on this report, before routing)

- Every finding has a file:line reference? **YES** (MINOR-1: `scripts/build-role-context.ts:166-169` + `Q-R75-SPEC.md:435-436`; MINOR-2: `scripts/build-role-context.ts:182-184` + `Q-R75-SPEC.md:447,475`; MINOR-3: `run-pipeline.sh:309` + `Q-R75-SPEC.md:600-619`; OBS-1: `test/q75-cache-prefix.test.ts:108-116`; OBS-2: `test/q75-cache-prefix.test.ts:89-103`; OBS-3: `Q-R75-EMPIRICAL.sh:75-82`; OBS-4: `Q-R75-SPEC.md` § 9.8).
- Any AC marked PASS without actual verification? **NO** (every PASS row in § 1 cites either Reviewer-re-run binding-command output, EMPIRICAL.sh block result, or specific file:line in implementation code).
- Right-reasons audit completed for 3+ tests? **YES** (§ 3 walks AC-R75-3, AC-R75-4, AC-R75-7).
- Adversarial mandate honored (non-zero findings)? **YES** (3 MINOR + 4 OBS, not "implementation looks good").
- Cold-review boundary held? **YES** — did not read `coordination/diagnostics/`, `coordination/logs/ROUND-R75-ROUTING.md`, or any `.prompt-*.md` file. Did read MEMORIAL.md entries for spec/Implementer attestation cross-check per CLAUDE-REVIEWER.md.

---

## Routing

CRITICAL count: 0
MAJOR count: 0
MINOR count: 3 (all ARCHITECT-attributable spec defects; Implementer correctly identified + applied minimal tactical fixes; all disclosed)
OBS count: 4

**STATUS: MERGE-READY**

---

## Reviewer attestation

Reviewer cold-read inputs:
- `coordination/PRD.md` (partial — 444 lines via paginated read; remaining sections summarized in earlier rounds' MEMORIAL)
- `coordination/specs/Q-R75-SPEC.md` (full; 1504 lines)
- `coordination/specs/Q-R75-EMPIRICAL.sh` (full; 199 lines)
- `scripts/build-role-context.ts` (full; 184 lines)
- `scripts/measure-cache-effect.ts` (full; 83 lines)
- `test/q75-cache-prefix.test.ts` (full; 141 lines)
- `run-pipeline.sh` (targeted reads: lines 295-329 telemetry init; lines 1660-1694 dispatch block)
- `CLAUDE-COMMON.md` (targeted reads: lines 108-157 Mode docs section + grep verification of REINFORCED count)
- `package.json` (full; 41 lines)
- `coordination/NEXT-ROLE.md` (targeted read: Implementer routing block lines 3691-3793 for attestation cross-check; directive section lines 111-202 for halt condition verification)
- `coordination/MEMORIAL.md` (R75 entries grep; lines 1739-1776 cross-reference for Architect/Implementer self-attestations)
- `~/.claude/CROSS-PROJECT-MEMORIAL.md` (Reviewer-relevant Reinforcement-rules-derived sections)

Reviewer empirical re-runs: `pnpm exec tsc -p tsconfig.test.json`, `pnpm exec node --test test/q75-cache-prefix.test.js`, `bash coordination/specs/Q-R75-EMPIRICAL.sh`, `git log 6002dd6..HEAD`, `git diff 6002dd6..HEAD --name-only`, `grep -c "^# REINFORCED " CLAUDE-COMMON.md`, plus the stdout-truncation reproducer for MINOR-1.

Reviewer did NOT consult: `coordination/diagnostics/`, `coordination/logs/`, any `.prompt-*.md` file.
