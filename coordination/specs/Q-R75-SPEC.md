# Q-R75-SPEC — Cross-session prompt-cache engineering (Phase 4 SLICE 1 round 3)

**Round:** R75
**Round-start SHA:** `6002dd6` (chore(R74): Memorial-Updater outputs)
**Directive:** `coordination/NEXT-ROLE.md` § R75 Round-scope directive (commit `ad478fb`)
**Tier:** full
**ALLOWED_SET authority:** § 5.1 below; verified before any RED commit by Implementer.

---

## § 0 Goal + prefix-tail split

### Goal

Structure the system-prompt input to each per-role `claude -p` session so that the
load-bearing context (CLAUDE-COMMON.md + spec triad + round directive section) forms
a byte-identical PREFIX across Implementer → Reviewer → Memorial-Updater sessions
within a single round. Anthropic's prompt cache (5-minute TTL) hits on that prefix
for the 2nd+ session, reducing input cost on the cached span by ~90% per Anthropic
pricing. The role-specific discipline file (`CLAUDE-<ROLE>.md`) and the role-stamp
move to the TAIL block, which varies per role.

### Prefix-tail split (load-bearing decision)

This spec prescribes ONE split and forbids deviation without ESCALATE:

**PREFIX (byte-identical across Impl/Rev/MU within a round):**

1. `CLAUDE-COMMON.md` — full file content, byte-for-byte.
2. Spec triad, ONLY if the files exist on disk at session-dispatch time:
   - `coordination/specs/Q-${round}-SPEC.md`
   - `coordination/specs/Q-${round}-SPEC-AUDIT.md`
   - `coordination/specs/Q-${round}-EMPIRICAL.sh`
3. Round directive section — extracted from `coordination/NEXT-ROLE.md` using the
   same regex shape as `scripts/mu-model-select.ts:66-77`:
   - Heading regex: `/^## § R(\d+) Round-scope directive/m`
   - Boundary regex: `/\n(?=## § |\n---[ \t]*(?:\n|$))/m`
   - Behavior: extract from the heading match through (but not including) the next
     `## § ` heading or `\n---\n` separator. If no heading matches, emit the full
     `NEXT-ROLE.md` content (same fallback as `mu-model-select.ts:69-71`).

**TAIL (varies per role):**

1. `CLAUDE-<ROLE>.md` — full file content, byte-for-byte. Resolved by role name
   per the existing mapping at `run-pipeline.sh:1606-1617`.
2. Role-stamp — three lines, generated deterministically from `role` + `round`
   inputs. Exact format prescribed in § 3.1 (no per-session randomness; no temp
   files involved on the new path).

### Why this split

- Prior to R75 the bundle was `CLAUDE-COMMON.md + CLAUDE-<ROLE>.md + role-stamp`
  (run-pipeline.sh:1648). The cacheable prefix ended at the start of
  `CLAUDE-<ROLE>.md` — which differs across the four roles within a round — so
  the cache only reused the `CLAUDE-COMMON.md` portion across roles.
- The R75 split adds the spec triad and the directive section to the cacheable
  prefix AND moves `CLAUDE-<ROLE>.md` after them. The cached span thus grows
  from ~CLAUDE-COMMON.md bytes (~13 KB) to ~CLAUDE-COMMON.md + spec triad +
  directive (typically 30–80 KB depending on spec size).
- The Architect session always lacks the spec triad (the Architect creates it),
  so the Architect's prefix is shorter and does NOT share with the other three.
  The shared prefix benefit applies to the Implementer → Reviewer → MU chain.

### Within-round prefix continuity invariant (load-bearing)

Once the Architect commits the spec triad at chore-A, **no role may modify**:

- the contents of `Q-R75-SPEC.md`, `Q-R75-SPEC-AUDIT.md`, `Q-R75-EMPIRICAL.sh`
  beyond placeholder substitution prescribed by the spec itself (e.g., SHA
  injection blocks; see R74 EMPIRICAL.sh pattern at `Q-R74-EMPIRICAL.sh:8`);
- the `## § R75 Round-scope directive` section of `coordination/NEXT-ROLE.md`.
  Routing blocks for IMPLEMENTER/REVIEWER/MEMORIAL-UPDATER are APPENDED below
  the directive section (current pipeline convention), preserving the section's
  byte-identity.
- `CLAUDE-COMMON.md` after the round's first role dispatch.

These three invariants are what make the cache prefix byte-stable. Anti-scope
§ 6 enumerates the frozen surfaces.

---

## § 1 Mechanism

### § 1.1 How Anthropic's prompt cache hits the prefix

`claude -p --append-system-prompt "$STRING"` passes the string as a system-prompt
content block to the Anthropic API. Anthropic's automatic prefix-cache (default
on Claude 4 family per Anthropic docs) hashes the longest common prefix across
sequential API calls within a 5-minute TTL window. When the prefix bytes match,
the cached tokens are billed at the cache-hit rate (~0.1× input rate).

The pipeline already enables `--exclude-dynamic-system-prompt-sections` at
`run-pipeline.sh:1653`, which moves per-machine drift (cwd, env, git status) out
of the cacheable region. R75 builds on that by ensuring the *appended* system
prompt has a byte-identical prefix across the Impl → Rev → MU sequence.

No explicit `cache_control: {type: "ephemeral"}` block is needed; the Anthropic
API's automatic prefix-cache handles the breakpoint detection. R75's job is to
produce the deterministic prefix bytes, not to set cache-control markers.

### § 1.2 New context-bundle dispatch in run-pipeline.sh

The existing line `run-pipeline.sh:1648`:

```
flags+=("--append-system-prompt" "$(cat "$PROJECT_ROOT/CLAUDE-COMMON.md" "$role_claude_file" "$stamp_file")")
```

is replaced by a gated dispatch (see § 3.3 for the verbatim delta). The new
form invokes `node scripts/build-role-context.js --emit full --role "$role"
--round "$ROUND" --project-root "$PROJECT_ROOT" --role-claude-file
"$role_claude_file"` and uses its stdout as the bundle. If
`scripts/build-role-context.js` does not exist on disk (e.g., on the
Architect's session at the very start of R75 itself, before
`pnpm exec tsc -p tsconfig.test.json` has compiled the new script), the
pipeline falls back to the legacy `cat …` form.

The fallback preserves backward compatibility for R75's own pipeline run.
By the time the Reviewer is dispatched at R75 (after the Implementer's
green commit runs `pretest` → `tsc` → `.js` outputs land in the worktree),
`scripts/build-role-context.js` exists and the new path activates. R76+
rounds see the new path from Architect onward.

### § 1.3 build-role-context.ts contract

The script is a pure deterministic concatenator. Given identical inputs
(file contents at fixed SHAs + identical `--role` + `--round` arguments)
it produces byte-identical output across invocations. No timestamps, no
random salts, no environment-dependent strings.

CLI surface (full grammar in § 3.1):

- `--emit prefix|tail|full` (required)
- `--role ARCHITECT|IMPLEMENTER|REVIEWER|REVIEWER-OPUS|REVIEWER-SONNET|REVIEWER-MERGE|MEMORIAL-UPDATER|COORDINATOR` (required for `tail` and `full`; ignored for `prefix`)
- `--round R<NN>` (required)
- `--project-root <PATH>` (optional; defaults to process.cwd())
- `--role-claude-file <PATH>` (optional; if omitted, derived from `--role`
  using the same mapping as `run-pipeline.sh:1606-1617`)

Output goes to stdout. Errors go to stderr with `process.exit(1)`. No JSON
wrapping (raw text — this output IS the system-prompt-bundle bytes).

Section ordering, separators, and trailing-newline conventions are exact
and prescribed in § 3.1. Determinism is enforced by AC-R75-3 and AC-R75-4.

### § 1.4 measure-cache-effect.ts contract

A read-only measurement utility. Computes per-role bundle byte counts,
prefix sha256, and an estimated cache-savings figure using a fixed
chars-per-token approximation (3.5; standard Anthropic ballpark cited
in their pricing docs). Emits a single JSON object to stdout.

CLI surface (full grammar in § 3.2):

- `--round R<NN>` (required)
- `--project-root <PATH>` (optional; defaults to process.cwd())
- `--roles <ROLE1,ROLE2,...>` (optional; defaults to
  `IMPLEMENTER,REVIEWER,MEMORIAL-UPDATER` — Architect omitted because its
  prefix differs)

Output JSON shape (deterministic key order; fields in § 3.2):

```
{
  "round": "R75",
  "prefix_bytes": <int>,
  "prefix_sha256": "<hex>",
  "tail_bytes": { "IMPLEMENTER": <int>, "REVIEWER": <int>, "MEMORIAL-UPDATER": <int> },
  "prefix_tokens_est": <int>,
  "tail_tokens_est": { "IMPLEMENTER": <int>, "REVIEWER": <int>, "MEMORIAL-UPDATER": <int> },
  "chars_per_token": 3.5,
  "estimated_cache_hit_savings_percent_per_2nd_plus_session": <float>,
  "measurer_version": "0.1.0"
}
```

### § 1.5 ROUND-R{N}-ROUTING.md schema extension

`run-pipeline.sh` initializes the routing log at line 265 with `## Tier`,
`## MU model`, `## Reviewer scope`. R75 appends a new `## Cache-prefix
telemetry` section, written at the same initialization point (so every
dispatched role has the telemetry visible from the start). Content
prescribed verbatim in § 3.3.

### § 1.6 CLAUDE-COMMON.md Mode docs section addition

A new H2 section `## Cache-prefix mechanism (Mode docs — informational; not a REINFORCED rule)`
is appended to `CLAUDE-COMMON.md` immediately AFTER the existing
`## Memorial sharding (R42 onward)` section (which currently ends at the
line before `## Pre-emit grilling (non-negotiable for all roles)`).

The section is descriptive only. It documents the prefix-tail split, the
within-round prefix-continuity invariant, and the fallback behavior. It
contains no REINFORCED lines and does not extend any prior REINFORCED rule.

The REINFORCED count in `CLAUDE-COMMON.md` (currently 8 lines matching
`^# REINFORCED `) is unchanged by R75 (asserted by AC-R75-12).

Verbatim insertion content prescribed in § 3.5.

### § 1.7 Anti-regression for R73 + R74 (directive halt #4)

The directive elevates "R73 router validation regression OR R74 MU model
selection regression — HALT" to a first-class halt condition. R75's
EMPIRICAL.sh Block (see § 3.7 Block 6) runs the existing q73 + q74 test
files standalone via `pnpm exec node --test test/q73-tier-router.test.js
test/q74-mu-haiku-reviewer-scope.test.js` and verifies exit 0. If either
file's tests would regress, the block fails and the Implementer halts.

The tests themselves cover R73's router classification surface and R74's
selector default-haiku + class-anchor branches; R75 does not modify those
scripts (`scripts/tier-router*.ts` and `scripts/mu-model-select*.ts` are
frozen per anti-scope § 6).

---

## § 2 Component inventory

### § 2.1 Created (new files)

| Path | Purpose |
|---|---|
| `scripts/build-role-context.ts` | Deterministic role-input context-bundle builder (§ 3.1). |
| `scripts/measure-cache-effect.ts` | Cache-savings measurement utility (§ 3.2). |
| `test/q75-cache-prefix.test.ts` | R75 ACs binding determinism + cross-role stability + anti-regression (§ 3.4). |
| `coordination/specs/Q-R75-SPEC.md` | This file. |
| `coordination/specs/Q-R75-SPEC-AUDIT.md` | Architect audit sidecar (Q-R75-SPEC-AUDIT.md). |
| `coordination/specs/Q-R75-EMPIRICAL.sh` | Empirical verification harness; § 3.7. |
| `coordination/reviews/REVIEWER-REPORT-R75.md` | Reviewer output (Reviewer's role, not Implementer's). |

### § 2.2 Modified files

| Path | Modification |
|---|---|
| `run-pipeline.sh` | Gated context-bundle dispatch at run_role() (§ 3.3); routing-log Cache-prefix telemetry section (§ 3.6 schema). |
| `CLAUDE-COMMON.md` | Append Mode docs § 1.6 / § 3.5. **NO** REINFORCED rule additions. |
| `package.json` | Add `build-role-context` and `measure-cache-effect` script entries (§ 3.6). |
| `coordination/NEXT-ROLE.md` | Architect/Implementer/Reviewer routing blocks (NOT a modification of the `## § R75 Round-scope directive` section). |
| `coordination/MEMORIAL.md` | Append CONFIRMATION/VIOLATION entries per role. |
| `coordination/logs/ROUND-R75-ROUTING.md` | Routing-log telemetry section emitted by run-pipeline.sh. |

### § 2.3 Read-only / frozen (consumed but not modified)

- `engine/**` — all (per directive anti-scope).
- `demos/**` and `tools/coverage-saturation.ts`, `tools/demo-scenario.ts`,
  `tools/build-canned-demos.ts` (R70–R72 deliverables frozen).
- `scripts/tier-router.ts`, `scripts/tier-router.js`,
  `scripts/tier-router-validate.ts`, `scripts/tier-router-fixtures/**`
  (R73 frozen).
- `scripts/mu-model-select.ts`, `scripts/mu-model-select.js`,
  `scripts/mu-model-select-fixtures/**` (R74 frozen).
- `CLAUDE-ARCHITECT.md`, `CLAUDE-IMPLEMENTER.md`, `CLAUDE-REVIEWER.md`,
  `CLAUDE-MEMORIAL.md`, `CLAUDE-COORDINATOR.md` REINFORCEMENTS sections
  (no additions, no modifications by Implementer per directive).
- Prior-round specs `coordination/specs/Q-R0*-SPEC.md` through
  `coordination/specs/Q-R74-*.md` (frozen).
- All test files except the new `test/q75-cache-prefix.test.ts`.

### § 2.4 Deleted

None.

---

## § 3 Per-file pseudocode

### § 3.1 scripts/build-role-context.ts

```typescript
// scripts/build-role-context.ts — R75 deterministic role-input context-bundle builder.
// Outputs: stable PREFIX (CLAUDE-COMMON.md + spec triad + directive section)
//          + per-role TAIL (CLAUDE-<ROLE>.md + role-stamp).
// Anthropic's prompt cache hits on byte-identical PREFIX across role sessions
// within a 5-minute TTL window. See Q-R75-SPEC.md § 0 for the load-bearing
// prefix-tail split.

import { readFileSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { createHash } from 'node:crypto';

const BUILDER_VERSION = '0.1.0';

type Role =
  | 'ARCHITECT'
  | 'IMPLEMENTER'
  | 'REVIEWER'
  | 'REVIEWER-OPUS'
  | 'REVIEWER-SONNET'
  | 'REVIEWER-MERGE'
  | 'MEMORIAL-UPDATER'
  | 'COORDINATOR';

type Emit = 'prefix' | 'tail' | 'full';

interface CLIArgs {
  emit: Emit;
  role?: Role;
  round: string;
  projectRoot: string;
  roleClaudeFile?: string;
}

function parseArgs(argv: string[]): CLIArgs {
  let emit: Emit | undefined;
  let role: Role | undefined;
  let round: string | undefined;
  let projectRoot: string = process.cwd();
  let roleClaudeFile: string | undefined;
  for (let i = 2; i < argv.length; i++) {
    switch (argv[i]) {
      case '--emit':              emit = argv[++i] as Emit; break;
      case '--role':              role = argv[++i] as Role; break;
      case '--round':             round = argv[++i]; break;
      case '--project-root':      projectRoot = resolve(argv[++i]); break;
      case '--role-claude-file':  roleClaudeFile = argv[++i]; break;
      default:
        process.stderr.write(`build-role-context: unknown argument: ${argv[i]}\n`);
        process.exit(1);
    }
  }
  if (!emit || !['prefix', 'tail', 'full'].includes(emit)) {
    process.stderr.write('build-role-context: --emit prefix|tail|full is required\n');
    process.exit(1);
  }
  if (!round || !/^R\d+$/.test(round)) {
    process.stderr.write('build-role-context: --round R<NN> is required\n');
    process.exit(1);
  }
  if ((emit === 'tail' || emit === 'full') && !role) {
    process.stderr.write(`build-role-context: --role is required for --emit ${emit}\n`);
    process.exit(1);
  }
  return { emit, role, round, projectRoot, roleClaudeFile };
}

// Resolve role → CLAUDE-<ROLE>.md mapping; mirror run-pipeline.sh:1606-1617.
function resolveRoleClaudeFile(role: Role, projectRoot: string): string {
  const map: Record<Role, string> = {
    'ARCHITECT':         'CLAUDE-ARCHITECT.md',
    'IMPLEMENTER':       'CLAUDE-IMPLEMENTER.md',
    'REVIEWER':          'CLAUDE-REVIEWER.md',
    'REVIEWER-OPUS':     'CLAUDE-REVIEWER.md',
    'REVIEWER-SONNET':   'CLAUDE-REVIEWER.md',
    'REVIEWER-MERGE':    'CLAUDE-REVIEWER.md',
    'MEMORIAL-UPDATER':  'CLAUDE-MEMORIAL.md',
    'COORDINATOR':       'CLAUDE-COORDINATOR.md',
  };
  return join(projectRoot, map[role]);
}

// Extract the directive section from NEXT-ROLE.md using the same shape as
// scripts/mu-model-select.ts:66-77. Returns '' if NEXT-ROLE.md is missing.
function extractDirectiveSection(projectRoot: string, round: string): string {
  const path = join(projectRoot, 'coordination', 'NEXT-ROLE.md');
  if (!existsSync(path)) return '';
  const raw = readFileSync(path, 'utf-8');
  const headingRe = /^## § R(\d+) Round-scope directive/m;
  const headingMatch = raw.match(headingRe);
  if (!headingMatch) return raw;  // fallback: whole file (same as mu-model-select)
  // Optional: verify round matches; if not, still return what's there.
  const startIdx = headingMatch.index!;
  const fromHeading = raw.slice(startIdx);
  const boundaryMatch = fromHeading.search(/\n(?=## § |\n---[ \t]*(?:\n|$))/m);
  return boundaryMatch === -1 ? fromHeading : fromHeading.slice(0, boundaryMatch);
}

// Load the spec triad files in the prescribed order. Returns the array of
// loaded contents (each entry is the raw file contents). Missing files are
// silently skipped — Architect session always misses all three.
function loadSpecTriad(projectRoot: string, round: string): string[] {
  const specsDir = join(projectRoot, 'coordination', 'specs');
  const order = [
    `Q-${round}-SPEC.md`,
    `Q-${round}-SPEC-AUDIT.md`,
    `Q-${round}-EMPIRICAL.sh`,
  ];
  const loaded: string[] = [];
  for (const name of order) {
    const p = join(specsDir, name);
    if (existsSync(p)) loaded.push(readFileSync(p, 'utf-8'));
  }
  return loaded;
}

function buildPrefix(projectRoot: string, round: string): string {
  const sections: string[] = [];
  const commonPath = join(projectRoot, 'CLAUDE-COMMON.md');
  if (!existsSync(commonPath)) {
    process.stderr.write(`build-role-context: CLAUDE-COMMON.md not found at ${commonPath}\n`);
    process.exit(1);
  }
  sections.push(readFileSync(commonPath, 'utf-8'));
  for (const sec of loadSpecTriad(projectRoot, round)) sections.push(sec);
  const directive = extractDirectiveSection(projectRoot, round);
  if (directive.length > 0) sections.push(directive);
  return sections.join('\n');
}

function buildRoleStamp(role: Role, round: string): string {
  return (
    `# ── ROLE-STAMP ────────────────────────────────────────────────────────────────\n` +
    `# THIS SESSION ROLE: ${role}\n` +
    `# Round: ${round}\n`
  );
}

function buildTail(role: Role, round: string, projectRoot: string, roleClaudeFile?: string): string {
  const path = roleClaudeFile ?? resolveRoleClaudeFile(role, projectRoot);
  if (!existsSync(path)) {
    process.stderr.write(`build-role-context: role discipline file not found at ${path}\n`);
    process.exit(1);
  }
  const roleContent = readFileSync(path, 'utf-8');
  const stamp = buildRoleStamp(role, round);
  return roleContent + '\n' + stamp;
}

function main(): void {
  const args = parseArgs(process.argv);
  let out: string;
  switch (args.emit) {
    case 'prefix':
      out = buildPrefix(args.projectRoot, args.round);
      break;
    case 'tail':
      out = buildTail(args.role!, args.round, args.projectRoot, args.roleClaudeFile);
      break;
    case 'full': {
      const prefix = buildPrefix(args.projectRoot, args.round);
      const tail = buildTail(args.role!, args.round, args.projectRoot, args.roleClaudeFile);
      out = prefix + '\n' + tail;
      break;
    }
  }
  process.stdout.write(out);
  process.exit(0);
}

// Export for tests (the test file imports buildPrefix / buildTail / buildFull).
export { buildPrefix, buildTail, buildRoleStamp, extractDirectiveSection, loadSpecTriad, resolveRoleClaudeFile };

// Suppress unused-warning for BUILDER_VERSION in environments where the constant
// is read via reflection by future telemetry hooks. Implementer may rename if a
// lint rule complains; the literal value 0.1.0 is the contract surface.
if (typeof BUILDER_VERSION !== 'string') { throw new Error('builder version unset'); }

main();
```

**Section separator convention (load-bearing for determinism, AC-R75-3 / AC-R75-4):**

- Inside `buildPrefix`: sections are joined with a single `'\n'` literal.
  No trimming. No re-encoding. The CLAUDE-COMMON.md content ends with whatever
  trailing newline(s) the file has on disk; the directive section ends with
  whatever the regex extracted (no trailing newline trim).
- Inside `buildFull`: `prefix + '\n' + tail`. One `'\n'` between them.
- The role-stamp template uses exactly three `\n`-terminated lines (the
  delimiter line, the role line, and the round line). No trailing blank line.

**Why not trim trailing whitespace:** CLAUDE-COMMON.md and CLAUDE-<ROLE>.md
already have file-content trailing newlines that are stable across reads.
Trimming introduces an extra normalization step that complicates the
"byte-identical to file-on-disk" invariant.

### § 3.2 scripts/measure-cache-effect.ts

```typescript
// scripts/measure-cache-effect.ts — R75 cache-savings measurement utility.
// Reads the deterministic bundles produced by build-role-context.ts and
// emits a JSON report with per-role byte counts + estimated cache-hit savings.
// Read-only: does NOT invoke any Anthropic API.

import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { buildPrefix, buildTail } from './build-role-context';

const MEASURER_VERSION = '0.1.0';
const CHARS_PER_TOKEN = 3.5;  // Anthropic ballpark per pricing docs.
const CACHE_HIT_INPUT_RATIO = 0.1;  // Cached tokens billed at ~10% of standard input rate.

type Role = 'IMPLEMENTER' | 'REVIEWER' | 'MEMORIAL-UPDATER';
const DEFAULT_ROLES: Role[] = ['IMPLEMENTER', 'REVIEWER', 'MEMORIAL-UPDATER'];

function parseArgs(argv: string[]): { round: string; projectRoot: string; roles: Role[] } {
  let round: string | undefined;
  let projectRoot: string = process.cwd();
  let roles: Role[] = DEFAULT_ROLES;
  for (let i = 2; i < argv.length; i++) {
    switch (argv[i]) {
      case '--round':         round = argv[++i]; break;
      case '--project-root':  projectRoot = resolve(argv[++i]); break;
      case '--roles':         roles = argv[++i].split(',').map(s => s.trim()) as Role[]; break;
      default:
        process.stderr.write(`measure-cache-effect: unknown argument: ${argv[i]}\n`);
        process.exit(1);
    }
  }
  if (!round || !/^R\d+$/.test(round)) {
    process.stderr.write('measure-cache-effect: --round R<NN> required\n');
    process.exit(1);
  }
  return { round, projectRoot, roles };
}

function bytes(s: string): number { return Buffer.byteLength(s, 'utf-8'); }
function tokens(s: string): number { return Math.ceil(bytes(s) / CHARS_PER_TOKEN); }
function sha256(s: string): string { return createHash('sha256').update(s, 'utf-8').digest('hex'); }

function main(): void {
  const { round, projectRoot, roles } = parseArgs(process.argv);
  const prefix = buildPrefix(projectRoot, round);
  const tails: Record<string, string> = {};
  for (const r of roles) tails[r] = buildTail(r as any, round, projectRoot);

  const prefix_bytes = bytes(prefix);
  const prefix_tokens_est = tokens(prefix);
  const tail_bytes: Record<string, number> = {};
  const tail_tokens_est: Record<string, number> = {};
  for (const r of roles) {
    tail_bytes[r] = bytes(tails[r]);
    tail_tokens_est[r] = tokens(tails[r]);
  }

  // Per-2nd+session savings: cached_prefix_tokens are billed at 10% instead
  // of 100%. Savings = prefix_tokens * (1 - 0.1) / total_tokens.
  // total_tokens = prefix + tail (per-role). Use the mean tail for the headline.
  const mean_tail_tokens = roles.length === 0 ? 0 :
    roles.reduce((acc, r) => acc + tail_tokens_est[r], 0) / roles.length;
  const total_input_per_session = prefix_tokens_est + mean_tail_tokens;
  const saved_input_per_session = prefix_tokens_est * (1 - CACHE_HIT_INPUT_RATIO);
  const estimated_cache_hit_savings_percent_per_2nd_plus_session =
    total_input_per_session === 0 ? 0 :
    Math.round(1000 * saved_input_per_session / total_input_per_session) / 10;  // 1 decimal

  const out = {
    round,
    prefix_bytes,
    prefix_sha256: sha256(prefix),
    tail_bytes,
    prefix_tokens_est,
    tail_tokens_est,
    chars_per_token: CHARS_PER_TOKEN,
    estimated_cache_hit_savings_percent_per_2nd_plus_session,
    measurer_version: MEASURER_VERSION,
  };
  process.stdout.write(JSON.stringify(out) + '\n');
  process.exit(0);
}

main();
```

The script imports `buildPrefix`/`buildTail` from `./build-role-context` (the
exports declared at the bottom of § 3.1). This makes measurement consistent
with what run-pipeline.sh actually dispatches; the two scripts share the same
prefix construction code (single source of truth).

### § 3.3 run-pipeline.sh delta

**Delta 3.3.A (line 1648 replacement)** — replace the single line at
`run-pipeline.sh:1648`:

```bash
    flags+=("--append-system-prompt" "$(cat "$PROJECT_ROOT/CLAUDE-COMMON.md" "$role_claude_file" "$stamp_file")")
```

with the following block (preserve surrounding indentation; 4 spaces):

```bash
    # R75: gated context-bundle dispatch. When scripts/build-role-context.js
    # exists, use the deterministic prefix+tail construction so Anthropic's
    # prompt-cache hits the prefix across role sessions within a 5-min TTL.
    # Falls back to the legacy cat-bundle when .js missing (e.g., during the
    # R75 round itself before the script is compiled at chore-A pretest).
    local context_bundle=""
    if [[ -f "$PROJECT_ROOT/scripts/build-role-context.js" ]]; then
      if context_bundle=$(node "$PROJECT_ROOT/scripts/build-role-context.js" \
          --emit full \
          --role "$role" \
          --round "$ROUND" \
          --project-root "$PROJECT_ROOT" \
          --role-claude-file "$role_claude_file" 2>/dev/null); then
        :
      else
        context_bundle=""
      fi
    fi
    if [[ -z "$context_bundle" ]]; then
      context_bundle=$(cat "$PROJECT_ROOT/CLAUDE-COMMON.md" "$role_claude_file" "$stamp_file")
    fi
    flags+=("--append-system-prompt" "$context_bundle")
```

**Delta 3.3.B (telemetry section in ROUTING_LOG)** — append a new heredoc
block to the existing initialization at `run-pipeline.sh:266-289`. Insert
immediately after the closing `}` of the routing-log heredoc at line ~291
(the `} > "$ROUTING_LOG"` line). Append:

```bash
# R75: cache-prefix telemetry. Measures the byte-identical PREFIX (load-bearing
# for Anthropic prompt-cache hits across role sessions). Emitted once at
# pipeline startup; per-role tail bytes recorded by run_role() on dispatch.
{
  echo ""
  echo "## Cache-prefix telemetry"
  if [[ -f "$PROJECT_ROOT/scripts/measure-cache-effect.js" ]]; then
    local measure_out=""
    if measure_out=$(node "$PROJECT_ROOT/scripts/measure-cache-effect.js" \
        --round "$ROUND" \
        --project-root "$PROJECT_ROOT" 2>/dev/null); then
      echo "Measurer: scripts/measure-cache-effect.js"
      echo "Output: ${measure_out}"
    else
      echo "Measurer: scripts/measure-cache-effect.js (invocation failed; no telemetry)"
    fi
  else
    echo "Measurer: not-yet-compiled (R75-pre-chore-A or fresh clone before pretest)"
  fi
} >> "$ROUTING_LOG"
```

**Delta 3.3.C (no other run-pipeline.sh changes)** — the mktemp/stamp_file
logic at `run-pipeline.sh:1593-1602` is RETAINED unchanged. The fallback
path (legacy `cat …`) still uses it; the new path ignores it (build-role-context.js
generates the stamp content internally). No code is removed.

### § 3.4 test/q75-cache-prefix.test.ts

```typescript
// test/q75-cache-prefix.test.ts — R75 ACs binding:
//   (a) prefix determinism: same inputs → byte-identical output;
//   (b) cross-role prefix-stability: prefix is byte-identical for any role
//       choice (only tail varies);
//   (c) anti-regression: scripts/tier-router.js (R73) + scripts/mu-model-select.js
//       (R74) still produce correct outputs.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';

const BUILDER = resolve(__dirname, '..', 'scripts', 'build-role-context.js');
const MEASURER = resolve(__dirname, '..', 'scripts', 'measure-cache-effect.js');
const ROUTER = resolve(__dirname, '..', 'scripts', 'tier-router.js');
const MU_SELECT = resolve(__dirname, '..', 'scripts', 'mu-model-select.js');
const PROJECT_ROOT = resolve(__dirname, '..');
const ROUND = 'R75';

function runBuilder(args: string[]): { stdout: string; stderr: string; status: number | null } {
  const r = spawnSync('node', [BUILDER, ...args], { encoding: 'utf-8' });
  return { stdout: r.stdout, stderr: r.stderr, status: r.status };
}

function sha256(s: string): string {
  return createHash('sha256').update(s, 'utf-8').digest('hex');
}

// AC-R75-2: builder exists and produces non-empty prefix when --emit prefix --round R75.
test('AC-R75-2: build-role-context.js --emit prefix produces non-empty output', () => {
  const r = runBuilder(['--emit', 'prefix', '--round', ROUND, '--project-root', PROJECT_ROOT]);
  assert.equal(r.status, 0, `builder exit non-zero; stderr=${r.stderr}`);
  assert.ok(r.stdout.length > 0, 'prefix output is empty');
});

// AC-R75-3: prefix is byte-identical across two consecutive invocations
// (determinism — no timestamps, no random salts, no env-dependent strings).
test('AC-R75-3: prefix is byte-identical across two consecutive invocations', () => {
  const a = runBuilder(['--emit', 'prefix', '--round', ROUND, '--project-root', PROJECT_ROOT]);
  const b = runBuilder(['--emit', 'prefix', '--round', ROUND, '--project-root', PROJECT_ROOT]);
  assert.equal(a.status, 0); assert.equal(b.status, 0);
  assert.equal(sha256(a.stdout), sha256(b.stdout), 'two-run sha256 mismatch — non-deterministic');
  assert.equal(a.stdout, b.stdout, 'two-run byte content mismatch');
});

// AC-R75-4: prefix bytes are stable across role choices — the --role argument
// does NOT alter the prefix (only the tail). Test IMPLEMENTER vs REVIEWER vs
// MEMORIAL-UPDATER.
test('AC-R75-4: prefix is independent of --role choice', () => {
  // --emit prefix ignores --role per § 1.3 contract.
  const a = runBuilder(['--emit', 'prefix', '--role', 'IMPLEMENTER', '--round', ROUND, '--project-root', PROJECT_ROOT]);
  const b = runBuilder(['--emit', 'prefix', '--role', 'REVIEWER',    '--round', ROUND, '--project-root', PROJECT_ROOT]);
  const c = runBuilder(['--emit', 'prefix', '--role', 'MEMORIAL-UPDATER', '--round', ROUND, '--project-root', PROJECT_ROOT]);
  assert.equal(a.status, 0); assert.equal(b.status, 0); assert.equal(c.status, 0);
  assert.equal(sha256(a.stdout), sha256(b.stdout), 'IMPLEMENTER vs REVIEWER prefix mismatch');
  assert.equal(sha256(b.stdout), sha256(c.stdout), 'REVIEWER vs MEMORIAL-UPDATER prefix mismatch');
});

// AC-R75-5: tail differs across role choices (negative-of-AC-R75-4; sanity).
test('AC-R75-5: tail differs across role choices', () => {
  const a = runBuilder(['--emit', 'tail', '--role', 'IMPLEMENTER',      '--round', ROUND, '--project-root', PROJECT_ROOT]);
  const b = runBuilder(['--emit', 'tail', '--role', 'REVIEWER',         '--round', ROUND, '--project-root', PROJECT_ROOT]);
  const c = runBuilder(['--emit', 'tail', '--role', 'MEMORIAL-UPDATER', '--round', ROUND, '--project-root', PROJECT_ROOT]);
  assert.equal(a.status, 0); assert.equal(b.status, 0); assert.equal(c.status, 0);
  assert.notEqual(sha256(a.stdout), sha256(b.stdout), 'IMPLEMENTER tail equals REVIEWER tail — discriminator failed');
  assert.notEqual(sha256(b.stdout), sha256(c.stdout), 'REVIEWER tail equals MEMORIAL-UPDATER tail — discriminator failed');
});

// AC-R75-6: tail contains the role's CLAUDE-<ROLE>.md content + role-stamp lines.
test('AC-R75-6: tail contains role-stamp lines naming role + round', () => {
  const r = runBuilder(['--emit', 'tail', '--role', 'REVIEWER', '--round', ROUND, '--project-root', PROJECT_ROOT]);
  assert.equal(r.status, 0);
  assert.ok(r.stdout.includes('# THIS SESSION ROLE: REVIEWER'), 'role-stamp role line absent');
  assert.ok(r.stdout.includes('# Round: R75'), 'role-stamp round line absent');
});

// AC-R75-7: full bundle = prefix + '\n' + tail (concatenation invariant).
test('AC-R75-7: full = prefix + LF + tail', () => {
  const p = runBuilder(['--emit', 'prefix', '--round', ROUND, '--project-root', PROJECT_ROOT]);
  const t = runBuilder(['--emit', 'tail', '--role', 'IMPLEMENTER', '--round', ROUND, '--project-root', PROJECT_ROOT]);
  const f = runBuilder(['--emit', 'full', '--role', 'IMPLEMENTER', '--round', ROUND, '--project-root', PROJECT_ROOT]);
  assert.equal(p.status, 0); assert.equal(t.status, 0); assert.equal(f.status, 0);
  assert.equal(f.stdout, p.stdout + '\n' + t.stdout);
});

// AC-R75-8: measure-cache-effect.js emits a JSON object with the prescribed
// field shape, all numeric counts > 0, prefix_sha256 a valid hex digest.
test('AC-R75-8: measure-cache-effect.js emits JSON with prescribed fields', () => {
  const r = spawnSync('node', [MEASURER, '--round', ROUND, '--project-root', PROJECT_ROOT], { encoding: 'utf-8' });
  assert.equal(r.status, 0, `measurer exit non-zero; stderr=${r.stderr}`);
  const out = JSON.parse(r.stdout);
  assert.equal(out.round, 'R75');
  assert.ok(typeof out.prefix_bytes === 'number' && out.prefix_bytes > 0);
  assert.ok(typeof out.prefix_sha256 === 'string' && /^[0-9a-f]{64}$/.test(out.prefix_sha256));
  for (const role of ['IMPLEMENTER', 'REVIEWER', 'MEMORIAL-UPDATER']) {
    assert.ok(typeof out.tail_bytes[role] === 'number' && out.tail_bytes[role] > 0, `tail_bytes.${role} missing or non-positive`);
    assert.ok(typeof out.tail_tokens_est[role] === 'number' && out.tail_tokens_est[role] > 0);
  }
  assert.equal(out.chars_per_token, 3.5);
  assert.ok(typeof out.estimated_cache_hit_savings_percent_per_2nd_plus_session === 'number');
  assert.equal(out.measurer_version, '0.1.0');
});

// AC-R75-9: R73 anti-regression — tier-router.js still produces a valid
// classification for a known fixture (R72 directive). Mirrors q73's AC-R73-1
// shape; failure here is the directive halt #4 R73-router-regression trigger.
test('AC-R75-9: R73 anti-regression — tier-router.js classifies R72 fixture', () => {
  const fixture = resolve(PROJECT_ROOT, 'scripts', 'tier-router-fixtures', 'R72-directive.md');
  const r = spawnSync('node', [ROUTER, '--directive', fixture, '--mode', 'heuristic'], { encoding: 'utf-8' });
  assert.equal(r.status, 0, `router exit non-zero; stderr=${r.stderr}`);
  const out = JSON.parse(r.stdout);
  assert.ok(['full', 'audit', 'implementer-only', 'coordinator-only'].includes(out.tier));
  assert.ok(typeof out.confidence === 'number' && out.confidence >= 0 && out.confidence <= 1);
  assert.ok(typeof out.rationale === 'string' && out.rationale.length > 0);
});

// AC-R75-10: R74 anti-regression — mu-model-select.js default-haiku branch.
// Uses F1 fixture (corpus-style no-marker directive) to confirm Branch 4
// returns claude-haiku-4-5-20251001 with the canonical rationale string.
test('AC-R75-10: R74 anti-regression — mu-model-select.js default-haiku on F1', () => {
  const fixture = resolve(PROJECT_ROOT, 'scripts', 'mu-model-select-fixtures', 'F1-default-haiku.md');
  const r = spawnSync('node', [MU_SELECT, '--directive', fixture, '--tier', 'full'], { encoding: 'utf-8' });
  assert.equal(r.status, 0, `selector exit non-zero; stderr=${r.stderr}`);
  const out = JSON.parse(r.stdout);
  assert.equal(out.model, 'claude-haiku-4-5-20251001');
  assert.equal(out.rationale, 'default haiku (no cross-round-pattern marker)');
  assert.deepEqual(out.decision_path, ['default_haiku']);
});

// AC-R75-11: R74 anti-regression — mu-model-select.js Class A promotion
// (cross-project promotion marker) returns claude-sonnet-4-6 with class A
// decision_path. Uses F2 fixture.
test('AC-R75-11: R74 anti-regression — mu-model-select.js class A on F2', () => {
  const fixture = resolve(PROJECT_ROOT, 'scripts', 'mu-model-select-fixtures', 'F2-class-A-promotion.md');
  const r = spawnSync('node', [MU_SELECT, '--directive', fixture, '--tier', 'full'], { encoding: 'utf-8' });
  assert.equal(r.status, 0, `selector exit non-zero; stderr=${r.stderr}`);
  const out = JSON.parse(r.stdout);
  assert.equal(out.model, 'claude-sonnet-4-6');
  assert.deepEqual(out.decision_path, ['marker_match', 'class_A']);
});
```

### § 3.5 CLAUDE-COMMON.md Mode docs section (verbatim insertion content)

Insert the block below into `CLAUDE-COMMON.md` immediately after the existing
`## Memorial sharding (R42 onward)` section and immediately before the existing
`## Pre-emit grilling (non-negotiable for all roles)` section. The insertion
point can be located by grep for `## Memorial sharding` then advancing to the
blank line that precedes `## Pre-emit grilling`.

```markdown
## Cache-prefix mechanism (Mode docs — informational; not a REINFORCED rule)

The pipeline structures each role-session's appended system prompt as a stable
PREFIX + per-role TAIL so Anthropic's prompt cache hits the prefix across
sequential role sessions within a 5-minute TTL.

PREFIX (byte-identical across IMPLEMENTER / REVIEWER / MEMORIAL-UPDATER within
a single round):
  - CLAUDE-COMMON.md
  - coordination/specs/Q-${round}-SPEC.md
  - coordination/specs/Q-${round}-SPEC-AUDIT.md
  - coordination/specs/Q-${round}-EMPIRICAL.sh
  - The ## § R${round} Round-scope directive section of coordination/NEXT-ROLE.md

TAIL (varies per role):
  - CLAUDE-<ROLE>.md  (role-specific discipline file)
  - Role-stamp lines naming THIS SESSION ROLE + Round

Construction: scripts/build-role-context.ts is the single source of truth. The
pipeline invokes node scripts/build-role-context.js --emit full --role <ROLE>
--round R<N> at each role dispatch. If the compiled .js is absent (fresh
clone or first run of the round that introduces it), the pipeline falls back
to the legacy cat-bundle construction; correctness is preserved, cache
savings are not realized.

Architect session note: the spec triad does not exist at Architect-dispatch
time (the Architect creates it). The Architect's prefix omits those files,
so the Architect's bundle is not byte-identical to the Impl/Rev/MU prefix.
The cache benefit applies to the IMPL → REV → MU chain.

Within-round prefix-continuity invariant: once the Architect commits the
spec triad, no role may modify the contents of Q-${round}-SPEC.md,
Q-${round}-SPEC-AUDIT.md, Q-${round}-EMPIRICAL.sh (beyond pre-prescribed
placeholder substitutions such as SHA injection blocks), nor the
## § R${round} Round-scope directive section of NEXT-ROLE.md, nor
CLAUDE-COMMON.md itself. Routing blocks for downstream roles are appended
below the directive section, preserving its byte-identity.

This Mode docs section is informational. It is not a REINFORCED rule and
does not extend any prior REINFORCED rule.
```

### § 3.6 package.json delta

Add two entries to the `scripts` object (insert after `mu-model-select`
entry; preserve key order otherwise). Verbatim insertion:

```json
    "build-role-context": "pnpm exec node scripts/build-role-context.js",
    "measure-cache-effect": "pnpm exec node scripts/measure-cache-effect.js",
```

No other package.json modifications. No new dependencies. The existing
`pretest` hook (`tsc -p tsconfig.test.json`) already compiles
`scripts/**/*.ts` to `.js`.

### § 3.7 Q-R75-EMPIRICAL.sh blocks

```bash
#!/usr/bin/env bash
# Q-R75-EMPIRICAL.sh — chore-A empirical verification harness (Rule 1 ACTIVE GATE).
# Runs 8 verification blocks; reports PASS/FAIL per block; exits 0 if all PASS, 1 otherwise.

set -u
ROUND_START_SHA="6002dd6"   # parent of R75 directive commit ad478fb

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_ROOT"

pass_count=0
fail_count=0
block_result() {
  local name="$1"; local ok="$2"
  if [ "$ok" = "1" ]; then
    echo "PASS  Block: $name"; pass_count=$((pass_count + 1))
  else
    echo "FAIL  Block: $name"; fail_count=$((fail_count + 1))
  fi
}

# Block 1 — round-start-sha-valid
if git cat-file -e "$ROUND_START_SHA^{commit}" 2>/dev/null; then
  block_result "round-start-sha-valid" 1
else
  block_result "round-start-sha-valid" 0
fi

# Block 2 — tsc-exit-0 (observed verbatim; encode actual exit code)
tsc_output=$(pnpm exec tsc -p tsconfig.test.json 2>&1)
tsc_exit=$?
echo "  observed tsc exit: $tsc_exit"
if [ $tsc_exit -eq 0 ]; then
  block_result "tsc-exit-0" 1
else
  echo "$tsc_output" | head -10
  block_result "tsc-exit-0" 0
fi

# Block 3 — node-test-pass-fail-counts (observed verbatim; chore-A baseline + R75 additions)
# Pre-R75 baseline at ROUND_START_SHA = 539/531/5/3 (verified by Architect at session entry).
# At chore-A (R75 GREEN), expect tests > 539, pass > 531, fail = 5 unchanged, skipped >= 3.
test_output=$(pnpm exec node --test --test-reporter=tap test/*.test.js 2>&1)
tests_line=$(echo "$test_output" | grep -E "^# tests " | head -1)
pass_line=$(echo "$test_output" | grep -E "^# pass " | head -1)
fail_line=$(echo "$test_output" | grep -E "^# fail " | head -1)
skipped_line=$(echo "$test_output" | grep -E "^# skipped " | head -1)
echo "  observed: $tests_line"
echo "  observed: $pass_line"
echo "  observed: $fail_line"
echo "  observed: $skipped_line"
count_ok=1
case "$fail_line" in
  *"# fail 5"*) ;;
  *) count_ok=0; echo "  expected '# fail 5' (carry-forward); got '$fail_line'" ;;
esac
tests_count=$(echo "$tests_line" | grep -oE "[0-9]+$" | head -1)
pass_count_obs=$(echo "$pass_line" | grep -oE "[0-9]+$" | head -1)
if [ -n "$tests_count" ] && [ "$tests_count" -le 539 ]; then
  count_ok=0; echo "  expected tests > 539 (R75-baseline); got $tests_count"
fi
if [ -n "$pass_count_obs" ] && [ "$pass_count_obs" -le 531 ]; then
  count_ok=0; echo "  expected pass > 531 (R75-baseline); got $pass_count_obs"
fi
block_result "node-test-pass-fail-counts" $count_ok

# Block 4 — builder-determinism (AC-R75-3 empirical re-check at chore-A)
if [[ -f scripts/build-role-context.js ]]; then
  a=$(node scripts/build-role-context.js --emit prefix --round R75 --project-root .)
  b=$(node scripts/build-role-context.js --emit prefix --round R75 --project-root .)
  if [[ "$a" == "$b" ]] && [[ -n "$a" ]]; then
    block_result "builder-determinism" 1
  else
    echo "  prefix not deterministic OR empty"
    block_result "builder-determinism" 0
  fi
else
  echo "  scripts/build-role-context.js missing (run pretest first)"
  block_result "builder-determinism" 0
fi

# Block 5 — builder-prefix-stability-across-roles (AC-R75-4 empirical re-check)
if [[ -f scripts/build-role-context.js ]]; then
  pi=$(node scripts/build-role-context.js --emit prefix --role IMPLEMENTER      --round R75 --project-root .)
  pr=$(node scripts/build-role-context.js --emit prefix --role REVIEWER         --round R75 --project-root .)
  pm=$(node scripts/build-role-context.js --emit prefix --role MEMORIAL-UPDATER --round R75 --project-root .)
  if [[ "$pi" == "$pr" ]] && [[ "$pr" == "$pm" ]]; then
    block_result "builder-prefix-stability-across-roles" 1
  else
    echo "  prefix not stable across role choices"
    block_result "builder-prefix-stability-across-roles" 0
  fi
else
  block_result "builder-prefix-stability-across-roles" 0
fi

# Block 6 — anti-regression-q73-q74 (directive halt #4)
ar_output=$(pnpm exec node --test test/q73-tier-router.test.js test/q74-mu-haiku-reviewer-scope.test.js 2>&1)
ar_exit=$?
ar_fail=$(echo "$ar_output" | grep -E "^# fail " | head -1 | grep -oE "[0-9]+$" | head -1)
if [ "$ar_exit" -eq 0 ] && [ "${ar_fail:-0}" -eq 0 ]; then
  block_result "anti-regression-q73-q74" 1
else
  echo "  q73+q74 exit=$ar_exit fail=$ar_fail"
  block_result "anti-regression-q73-q74" 0
fi

# Block 7 — anti-scope-diff-allowed-set
# Round-start SHA → HEAD diff must be ⊆ ALLOWED_SET (§ 5.1). Compares set
# membership; does NOT pin a path count (per directive Rule 4: NO live-file-count).
allowed_set=(
  "coordination/NEXT-ROLE.md"
  "coordination/MEMORIAL.md"
  "coordination/logs/ROUND-R75-ROUTING.md"
  "coordination/logs/ROUND-R75-SUMMARY.md"
  "coordination/specs/Q-R75-SPEC.md"
  "coordination/specs/Q-R75-SPEC-AUDIT.md"
  "coordination/specs/Q-R75-EMPIRICAL.sh"
  "coordination/reviews/REVIEWER-REPORT-R75.md"
  "scripts/build-role-context.ts"
  "scripts/measure-cache-effect.ts"
  "test/q75-cache-prefix.test.ts"
  "run-pipeline.sh"
  "CLAUDE-COMMON.md"
  "package.json"
)
diff_paths=$(git diff "$ROUND_START_SHA"..HEAD --name-only)
diff_ok=1
while IFS= read -r p; do
  [[ -z "$p" ]] && continue
  found=0
  for a in "${allowed_set[@]}"; do
    if [[ "$p" == "$a" ]]; then found=1; break; fi
  done
  if [[ $found -eq 0 ]]; then
    diff_ok=0; echo "  unauthorized path: $p"
  fi
done <<< "$diff_paths"
block_result "anti-scope-diff-allowed-set" $diff_ok

# Block 8 — claude-common-reinforced-count-unchanged
reinforced_count=$(grep -c "^# REINFORCED " CLAUDE-COMMON.md || echo 0)
echo "  CLAUDE-COMMON.md REINFORCED count: $reinforced_count (expected 8)"
if [ "$reinforced_count" -eq 8 ]; then
  block_result "claude-common-reinforced-count-unchanged" 1
else
  block_result "claude-common-reinforced-count-unchanged" 0
fi

echo ""
echo "===================="
echo "PASS: $pass_count"
echo "FAIL: $fail_count"
echo "===================="
[ $fail_count -eq 0 ] && exit 0 || exit 1
```

---

## § 4 [reserved — see § 5 for ACs]

---

## § 5 Acceptance criteria

### § 5.1 ALLOWED_SET (anti-scope path enumeration; SHA-pinned to ROUND_START_SHA = `6002dd6`)

The `git diff 6002dd6..HEAD --name-only` set MUST be a subset of:

1. `coordination/NEXT-ROLE.md`
2. `coordination/MEMORIAL.md`
3. `coordination/logs/ROUND-R75-ROUTING.md`
4. `coordination/logs/ROUND-R75-SUMMARY.md` (MU output)
5. `coordination/specs/Q-R75-SPEC.md`
6. `coordination/specs/Q-R75-SPEC-AUDIT.md`
7. `coordination/specs/Q-R75-EMPIRICAL.sh`
8. `coordination/reviews/REVIEWER-REPORT-R75.md` (Reviewer output)
9. `scripts/build-role-context.ts`
10. `scripts/measure-cache-effect.ts`
11. `test/q75-cache-prefix.test.ts`
12. `run-pipeline.sh`
13. `CLAUDE-COMMON.md`
14. `package.json`

The compiled `.js` outputs (`scripts/build-role-context.js`,
`scripts/measure-cache-effect.js`, `test/q75-cache-prefix.test.js`) are
gitignored per the repo's `*.js` rule (.gitignore line 6); they do NOT
appear in the diff and are NOT enumerated here.

### § 5.2 AC table

All AC counts and exit codes are encoded as the ACTUAL observed value at
chore-A SHA, NOT as spec predictions (per CLAUDE-COMMON.md REINFORCED
2026-05-18 `encode-actual-results-verbatim` rule, R26 MAJOR-1 + R72
CRITICAL-1 origin).

| AC | Given / When / Then | Binds |
|---|---|---|
| AC-R75-1 | Given the round at chore-A SHA, when `bash coordination/specs/Q-R75-EMPIRICAL.sh` runs in repo-root, then exit code is `0` and every Block reports `PASS`. | Empirical harness invocation |
| AC-R75-2 | Given `scripts/build-role-context.js` exists, when `node scripts/build-role-context.js --emit prefix --round R75 --project-root <repo-root>` runs, then exit code is `0` AND stdout byte-length > 0. | § 3.1 builder existence + invocation |
| AC-R75-3 | Given two consecutive invocations with identical args `--emit prefix --round R75 --project-root <repo-root>`, when both run, then their stdout outputs are byte-identical (sha256 equality). | § 3.1 determinism |
| AC-R75-4 | Given three invocations with `--emit prefix --role <X> --round R75 --project-root <repo-root>` for X ∈ {IMPLEMENTER, REVIEWER, MEMORIAL-UPDATER}, when all three run, then their stdout outputs are byte-identical (the `--role` arg is ignored for `--emit prefix`). | § 3.1 cross-role prefix stability |
| AC-R75-5 | Given three invocations with `--emit tail --role <X> --round R75 --project-root <repo-root>` for X ∈ {IMPLEMENTER, REVIEWER, MEMORIAL-UPDATER}, when all three run, then their stdout outputs are pairwise distinct (each tail's sha256 ≠ the other two). | § 3.1 tail-discrimination (negative coverage of AC-R75-4) |
| AC-R75-6 | Given `--emit tail --role REVIEWER --round R75`, when it runs, then stdout contains the literal substring `# THIS SESSION ROLE: REVIEWER` AND the literal substring `# Round: R75`. | § 3.1 role-stamp content |
| AC-R75-7 | Given the prefix output P from AC-R75-3, the tail output T from `--emit tail --role IMPLEMENTER`, and the full output F from `--emit full --role IMPLEMENTER`, when all three run, then F equals `P + "\n" + T` byte-for-byte. | § 3.1 full = prefix + LF + tail |
| AC-R75-8 | Given `scripts/measure-cache-effect.js` exists, when `node scripts/measure-cache-effect.js --round R75 --project-root <repo-root>` runs, then exit code is `0` AND stdout is valid JSON containing fields {round="R75", prefix_bytes:number > 0, prefix_sha256:string matching /^[0-9a-f]{64}$/, tail_bytes.{IMPLEMENTER,REVIEWER,MEMORIAL-UPDATER}:number > 0, tail_tokens_est.{...}:number > 0, chars_per_token=3.5, estimated_cache_hit_savings_percent_per_2nd_plus_session:number, measurer_version="0.1.0"}. | § 3.2 measurer contract |
| AC-R75-9 | Given the R73 fixture `scripts/tier-router-fixtures/R72-directive.md`, when `node scripts/tier-router.js --directive <fixture> --mode heuristic` runs, then exit code is `0` AND stdout parses as JSON with `tier` ∈ {full, audit, implementer-only, coordinator-only}, `confidence` numeric in [0,1], and `rationale` non-empty. | R73 anti-regression (directive halt #4) |
| AC-R75-10 | Given the R74 fixture `scripts/mu-model-select-fixtures/F1-default-haiku.md`, when `node scripts/mu-model-select.js --directive <fixture> --tier full` runs, then exit code is `0` AND `model == "claude-haiku-4-5-20251001"` AND `rationale == "default haiku (no cross-round-pattern marker)"` AND `decision_path == ["default_haiku"]`. | R74 anti-regression default-haiku branch (directive halt #4) |
| AC-R75-11 | Given the R74 fixture `scripts/mu-model-select-fixtures/F2-class-A-promotion.md`, when `node scripts/mu-model-select.js --directive <fixture> --tier full` runs, then exit code is `0` AND `model == "claude-sonnet-4-6"` AND `decision_path == ["marker_match", "class_A"]`. | R74 anti-regression class-A branch (directive halt #4) |
| AC-R75-12 | Given the chore-A working tree, when `grep -c "^# REINFORCED " CLAUDE-COMMON.md` runs, then output is exactly `8` (unchanged from ROUND_START_SHA = `6002dd6`). | Anti-scope CLAUDE-COMMON.md REINFORCED-section preservation (directive: "NO REINFORCEMENTS modifications") |
| AC-R75-13 | Given the chore-A working tree, when `git diff 6002dd6..HEAD --name-only` runs, then EVERY path in its output is a member of ALLOWED_SET (§ 5.1). | Anti-scope diff containment (no live count; membership only — per directive Rule 4) |
| AC-R75-14 | Given the chore-A working tree, when `grep -c "## Cache-prefix mechanism (Mode docs" CLAUDE-COMMON.md` runs, then output is exactly `1`. | § 1.6 / § 3.5 Mode docs section insertion |
| AC-R75-15 | Given the chore-A working tree, when `grep -c "build-role-context" run-pipeline.sh` runs, then output is `>= 1` AND the line at `run-pipeline.sh` containing the legacy `cat "$PROJECT_ROOT/CLAUDE-COMMON.md" "$role_claude_file" "$stamp_file"` invocation appears in a fallback branch (specifically, inside a `[[ -z "$context_bundle" ]]` guard per § 3.3 Delta A). | § 3.3 Delta A pipeline integration |

### § 5.3 Acknowledged AC gaps (with minimum mitigations, per R74 MINOR-2)

| Gap | Why | Minimum mitigation |
|---|---|---|
| No end-to-end Anthropic API cache-hit empirical AC | The Anthropic API isn't exercised by tests (would require live API calls + non-deterministic cache state). | `measure-cache-effect.js` (AC-R75-8) computes the theoretical savings deterministically from byte-counts. The actual cache-hit measurement is operator-side via response-token JSON inspection of a future round's `claude -p` outputs — DEFERRED to R76+ (operator decides whether to add an integration AC at that time). |
| No AC binding `run-pipeline.sh` end-to-end dispatch with the new prefix path | run-pipeline.sh is a shell script not directly tested via `node --test`. Live dispatch requires Anthropic API calls. | AC-R75-15 binds the diff-level integration site by grep. The new path's correctness is verified by AC-R75-2 through AC-R75-8 against the underlying TS module that the bash invokes — i.e., the pipeline's invocation of `node scripts/build-role-context.js …` is a thin wrapper over what AC-R75-2..7 exercise directly. |
| No AC binding the routing-log telemetry section content | The routing-log content is emitted at run-pipeline.sh startup, not at test time. | Implementer manually verifies post-pipeline-run that `coordination/logs/ROUND-R75-ROUTING.md` contains a `## Cache-prefix telemetry` heading. This is a procedural check, not an AC. If a future round's routing-log fails to emit the section, Reviewer catches it during routing-log review (no automated regression test). |

---

## § 6 Anti-scope

### § 6.1 Frozen surfaces (NO modifications by Implementer or Reviewer)

- `engine/**` — all files.
- `demos/**`, `tools/coverage-saturation.ts`, `tools/demo-scenario.ts`,
  `tools/build-canned-demos.ts` (R70–R72 deliverables).
- `scripts/tier-router.ts`, `scripts/tier-router.js`,
  `scripts/tier-router-validate.ts`, `scripts/tier-router-fixtures/**`
  (R73 frozen; consumed via AC-R75-9).
- `scripts/mu-model-select.ts`, `scripts/mu-model-select.js`,
  `scripts/mu-model-select-fixtures/**` (R74 frozen; consumed via
  AC-R75-10 + AC-R75-11).
- `CLAUDE-ARCHITECT.md`, `CLAUDE-IMPLEMENTER.md`, `CLAUDE-REVIEWER.md`,
  `CLAUDE-MEMORIAL.md`, `CLAUDE-COORDINATOR.md` — including their
  REINFORCEMENTS sections. **No additions, no modifications.**
- `CLAUDE-COMMON.md` REINFORCEMENTS (the `^# REINFORCED ` block).
  Only the new `## Cache-prefix mechanism (Mode docs …)` H2 section may
  be added; AC-R75-12 binds the count.
- All prior-round specs `coordination/specs/Q-R0*-SPEC*` through
  `coordination/specs/Q-R74-*`.
- All prior-round Memorial shards `coordination/MEMORIAL-PHASE-1.md`,
  `coordination/MEMORIAL-PHASE-2.md` (frozen historical shards).
- All pre-existing test files (`test/q*.test.ts` for q < 75 and all
  test/q*.test.js outputs from prior rounds).
- `.gitignore` (no changes; the `*.js` rule already covers compiled
  outputs of new .ts files).
- `coordination/PRD.md`, `coordination/SCOPING-MEMO-v0.3.md`.

### § 6.2 Within-round prefix-continuity invariant (load-bearing)

Once the Architect commits the spec triad at chore-A:

1. **No role may modify the contents of `Q-R75-SPEC.md`,
   `Q-R75-SPEC-AUDIT.md`, or `Q-R75-EMPIRICAL.sh`** beyond pre-prescribed
   placeholder substitutions. Q-R75-EMPIRICAL.sh has the round-start SHA
   already inlined (`ROUND_START_SHA="6002dd6"` at the top); no
   placeholder substitution is needed.
2. **No role may modify the `## § R75 Round-scope directive` section** of
   `coordination/NEXT-ROLE.md`. Routing blocks for IMPLEMENTER / REVIEWER /
   MEMORIAL-UPDATER are APPENDED below the directive section, preserving
   its byte-identity.
3. **No role may modify `CLAUDE-COMMON.md`** after the Implementer's
   chore-A commit lands. The Mode docs addition (§ 3.5) is part of
   chore-A; subsequent roles do not touch it.

Violation of any of (1)–(3) breaks the prefix-cache hit and is a halt
condition (Implementer halts with DIAGNOSTIC if forced to violate;
Reviewer flags as MAJOR if observed).

### § 6.3 Carve-outs (allowed modifications even though they're "modifications")

- `coordination/NEXT-ROLE.md` routing block appends below the directive
  section (Architect's routing block; Implementer's; Reviewer's). The
  directive section text itself is frozen per § 6.2(2).
- `coordination/MEMORIAL.md` entry appends (every role).
- `coordination/logs/ROUND-R75-ROUTING.md` — emitted by run-pipeline.sh
  at startup; modifications to its schema land via run-pipeline.sh
  delta § 3.3.B.
- `package.json` script-entry additions per § 3.6.

### § 6.4 TACTICAL AUTONOMY guard rails (R72 CRITICAL-1 + R73 MAJOR-2 + R74 CRITICAL-1 lineage)

The Implementer's TACTICAL AUTONOMY (`run-pipeline.sh:893-907`) is scoped
to "import paths, locator syntax, type-cast placement, utility class
names, layout shims, version-drift fixes, syntactic adjustments." It
does NOT cover:

(a) any change to a control-flow construct in spec-authored bash or
    TypeScript (e.g., replacing `if`/`case`/`for`/`while` with another
    construct);
(b) any change to a bash boolean-semantics construct without an
    empirical equivalence check for BOTH the true and false flag states
    (per R74 CRITICAL-1 + cross-project R74 reinforcement rule for
    `${VAR:+word}` vs `if [[ "$VAR" == "true" ]]`);
(c) any substitution of a spec-prescribed TypeScript literal with an
    "empirically valid" alternative (per R72 CRITICAL-1);
(d) any change to the prefix-construction logic in
    `scripts/build-role-context.ts` (the section order, the separators,
    the trailing-newline convention) — the contract of § 3.1 is
    load-bearing for AC-R75-3 / AC-R75-4 / AC-R75-7.

If any of (a)–(d) appears tactically required, the Implementer HALTs with
a DIAGNOSTIC + ESCALATE per `coordination/NEXT-ROLE.md` halt conditions.

---

## § 7 Open questions

None — all resolved.

- **Q.1 Where exactly does CLAUDE-<ROLE>.md sit in the new bundle (prefix
  or tail)?** RESOLVED in § 0 prefix-tail split: TAIL.
- **Q.2 Does the Architect session share the prefix with the other
  three?** RESOLVED in § 0 "Why this split": NO. Architect's prefix omits
  the spec triad. Cache benefit applies to Impl → Rev → MU only.
- **Q.3 Should the integration in run-pipeline.sh be unconditional or
  gated on .js existence?** RESOLVED in § 1.2 / § 3.3 Delta A: gated, with
  fallback to legacy cat-bundle when `.js` is missing. This preserves R75
  pipeline correctness when the Architect session runs (spec triad not yet
  committed) and when the Implementer session is dispatched before its own
  chore-A pretest compiles the new .js.
- **Q.4 What chars-per-token approximation should measure-cache-effect
  use?** RESOLVED in § 1.4: 3.5 (Anthropic ballpark). Hard-coded as
  `CHARS_PER_TOKEN`. Adjustable in a future round if Anthropic pricing
  shifts; not a design decision the Implementer makes.
- **Q.5 Should the mktemp/stamp_file logic at `run-pipeline.sh:1593-1602`
  be removed?** RESOLVED in § 3.3 Delta C: retained unchanged (the
  fallback path still uses it; no harm leaving it).
- **Q.6 How is the Architect's first dispatch handled if the new path is
  active?** RESOLVED: see § 1.2. The Architect dispatch happens BEFORE
  the spec triad is committed; the build-role-context.js fallback (via
  `if existsSync` checks inside the script) silently omits non-existent
  spec triad files; the Architect's prefix is shorter but the script
  still produces a valid bundle. **However**, on the R75 round itself,
  `scripts/build-role-context.js` doesn't exist when the Architect runs
  (it's the file being introduced), so the bash gate triggers fallback
  to the legacy `cat …` form. Either path produces a valid Architect
  bundle. Behaviorally equivalent for the Architect.

---

## § 8 P3 ten-axis verification

See `coordination/specs/Q-R75-SPEC-AUDIT.md` § 1 for per-axis verification
(one sentence each: correctness, completeness, consistency, clarity,
coverage, constraints, concurrency, corner cases, cost, coupling).

---

## § 9 Inline grilling (adversarial self-review)

### § 9.1 Is every claim in this artifact backed by something verifiable?

YES, per the following verifications performed at spec-emit:

- **Round-start SHA `6002dd6`:** verified via `git log --oneline 6002dd6^..ad478fb` →
  exists; parent of directive commit `ad478fb`. Diff at session-entry:
  `coordination/NEXT-ROLE.md` (the directive commit) + untracked
  `coordination/logs/ROUND-R75-ROUTING.md`.
- **Baseline tsc + test counts at session-entry HEAD `ad478fb`:**
  observed `tsc -p tsconfig.test.json` exit 0; `node --test`
  `# tests 539`, `# pass 531`, `# fail 5`, `# skipped 3`. Block 3 of
  Q-R75-EMPIRICAL.sh encodes these verbatim (no spec prediction).
- **CLAUDE-COMMON.md REINFORCED count:** observed `grep -c "^# REINFORCED " CLAUDE-COMMON.md` = 8 at session-entry. AC-R75-12 + Block 8 of
  EMPIRICAL.sh bind this verbatim.
- **`run-pipeline.sh:1648` legacy bundle line:** verified by direct
  file read at spec-emit (`Read` tool, offset 1648). The line is the
  `flags+=("--append-system-prompt" "$(cat "$PROJECT_ROOT/CLAUDE-COMMON.md" "$role_claude_file" "$stamp_file")")` form
  prescribed for replacement in § 3.3 Delta A.
- **`run-pipeline.sh:1593-1602` mktemp/stamp_file logic:** verified by
  direct file read. Lines 1593-1602 contain the `mktemp -t
  "claude-role-stamp-${role}.XXXXXX"` block + heredoc + trap. § 3.3
  Delta C prescribes retention (no removal).
- **`run-pipeline.sh:1606-1617` role → CLAUDE-<ROLE>.md case mapping:**
  verified by direct file read. Mapped to `resolveRoleClaudeFile` in
  § 3.1 — same eight role names → CLAUDE-ARCHITECT.md, CLAUDE-IMPLEMENTER.md,
  CLAUDE-REVIEWER.md (×4 variants), CLAUDE-MEMORIAL.md, CLAUDE-COORDINATOR.md.
- **`scripts/mu-model-select.ts:66-77` directive-section extraction
  regex:** verified by direct file read. The pattern (heading `/^## §
  R(\d+) Round-scope directive/m` + boundary `/\n(?=## § |\n---[
  \t]*(?:\n|$))/m`) is copy-pasted into § 3.1 `extractDirectiveSection`.
- **`tsconfig.test.json` includes `scripts/**/*.ts`:** verified by
  direct file read. Confirms new `scripts/build-role-context.ts` and
  `scripts/measure-cache-effect.ts` will be compiled by the existing
  `pretest` hook.
- **`.gitignore: *.js`:** verified at session-entry. Compiled `.js`
  outputs are gitignored; § 5.1 ALLOWED_SET enumerates `.ts` source
  files (not `.js`).
- **`package.json` scripts shape:** verified by direct file read. The
  existing `tier-router` / `mu-model-select` entries follow the
  `"<name>": "pnpm exec node scripts/<name>.js"` template; § 3.6
  prescribes the same shape for the two new entries.
- **`coordination/logs/ROUND-R75-ROUTING.md` already exists** (created
  by run-pipeline.sh:265 startup block before Architect dispatch). The
  Architect's spec amendment to that file's schema is encoded in
  § 3.3 Delta B; the schema extension is appended to the existing
  initialization heredoc, not retroactive.

### § 9.2 Unstated assumptions?

- **Anthropic's automatic prefix-cache is enabled on Claude 4 family.**
  This is Anthropic's stated default per their pricing/caching docs. If
  the operator's account or model selection deviates, the cache benefit
  is reduced; the structural correctness of the bundle (AC-R75-3, -4, -7)
  is unaffected.
- **The `claude -p` CLI passes `--append-system-prompt` content as a
  cacheable content block.** Validated indirectly by the existing
  pipeline's reliance on `--exclude-dynamic-system-prompt-sections` at
  `run-pipeline.sh:1653` (which only makes sense if the bundle is
  cacheable in the first place).
- **`Buffer.byteLength(s, 'utf-8')` correctly counts bytes for measurement
  AC-R75-8.** Standard Node.js semantics; not a research dependency.
- **The Implementer's pretest hook (`tsc -p tsconfig.test.json`) compiles
  `scripts/build-role-context.ts` BEFORE the `node --test` run.** Verified
  by the existing pretest pattern (R73 and R74 both relied on this same
  compilation flow without issue).

### § 9.3 Scope added beyond directive request?

NO. The directive enumerates the five deliverables (`scripts/build-role-context.ts`,
`scripts/measure-cache-effect.ts`, `run-pipeline.sh` integration,
`CLAUDE-COMMON.md` Mode docs, `test/q75-cache-prefix.test.ts`) plus
`Q-R75-EMPIRICAL.sh` at chore-A pre-commit (directive § "Primary
deliverable" item 5). This spec covers exactly those plus the
documentation artifacts (Q-R75-SPEC.md, Q-R75-SPEC-AUDIT.md) and
attestation surfaces (NEXT-ROLE.md routing, MEMORIAL.md entries,
REVIEWER-REPORT-R75.md). No new dependencies. No engine/demos/tier-router/mu-model-select
modifications. CLAUDE-<ROLE>.md REINFORCEMENTS untouched.

### § 9.4 Implementer can act without guessing?

YES. The per-file pseudocode in § 3 is fully prescriptive:

- Every script signature is declared (CLI args, types, return shapes).
- Every section's load order in the bundle is fixed.
- The role-stamp template is verbatim.
- The directive-section extraction regex is copy-paste-ready.
- The run-pipeline.sh delta names exact line numbers + verbatim insertion
  blocks.
- The package.json entries are verbatim JSON snippets.
- The CLAUDE-COMMON.md insertion content is verbatim markdown.
- Every AC names the binding command, the inputs, and the observable.

### § 9.5 Spec-internal contradiction sweep (per R34 MINOR-2, R65 MINOR-2 reinforcements)

Cross-checked:

- **Section ordering in prefix:** § 0 prefix-tail split + § 3.1
  pseudocode + § 3.5 Mode docs section all agree: CLAUDE-COMMON.md →
  spec triad (in order Q-R75-SPEC.md, Q-R75-SPEC-AUDIT.md, Q-R75-EMPIRICAL.sh)
  → directive section.
- **CLAUDE-<ROLE>.md placement:** § 0 + § 3.1 buildTail + § 3.5 Mode
  docs all agree: tail block, AFTER prefix.
- **Role-stamp content:** § 0 prefix-tail split says "three lines:
  delimiter + role + round"; § 3.1 `buildRoleStamp` produces exactly
  three `\n`-terminated lines (delimiter, role, round); AC-R75-6 binds
  two of them (role + round); § 3.5 Mode docs describes the same.
- **Determinism scope:** § 1.3 + § 3.1 + AC-R75-3 + AC-R75-4 + Block 4
  + Block 5 all bind the same determinism property.
- **Fallback gate:** § 1.2 + § 3.3 Delta A + § 3.5 Mode docs all
  describe the same `[[ -f scripts/build-role-context.js ]]` gate +
  same fallback to legacy `cat …`.
- **REINFORCED count:** § 1.6 ("currently 8") + § 6.1 + AC-R75-12 +
  Block 8 of EMPIRICAL.sh all bind `count = 8`.
- **ALLOWED_SET:** § 5.1 enumeration of 14 paths + Block 7 of
  EMPIRICAL.sh's `allowed_set` bash array (14 entries) match
  byte-for-byte in path strings and order.

No contradictions detected.

### § 9.6 Self-application gate (per Rule 3 / R74 MINOR-5 reinforcement)

For every AC, would the spec's own pseudocode pass the AC if implemented
verbatim? Walked:

- AC-R75-3 (determinism): § 3.1 `buildPrefix` has no `Date.now()`, no
  `Math.random()`, no env-var reads, no `Date` constructor calls. Pure
  function of file contents + argument strings. PASSES.
- AC-R75-4 (cross-role prefix stability): § 3.1 `buildPrefix` accepts no
  role argument. The `main()` function ignores `args.role` when
  `args.emit === 'prefix'`. PASSES.
- AC-R75-5 (tail discrimination): § 3.1 `buildTail` reads
  `resolveRoleClaudeFile(role, projectRoot)` which returns a different
  path for each role (excluding REVIEWER aliases). For the prescribed
  three roles (IMPLEMENTER → CLAUDE-IMPLEMENTER.md, REVIEWER →
  CLAUDE-REVIEWER.md, MEMORIAL-UPDATER → CLAUDE-MEMORIAL.md), the three
  files are distinct, so their contents differ. PASSES.
- AC-R75-7 (full = prefix + LF + tail): § 3.1 `case 'full'` does
  exactly `prefix + '\n' + tail`. PASSES.
- AC-R75-8 (measurer JSON shape): § 3.2 `main()` emits a JSON object
  with all named fields, `prefix_sha256` via sha256(prefix), all
  numeric fields > 0. PASSES.
- AC-R75-12 (REINFORCED count = 8): § 3.5 Mode docs insertion adds NO
  `^# REINFORCED ` lines. PASSES.
- AC-R75-13 (ALLOWED_SET membership): § 5.1 enumerates all 14 paths
  that this spec's deltas touch. Implementer's diff at chore-A is a
  subset (some paths only touched at REVIEWER/MU stages). PASSES.
- AC-R75-14 (Mode docs heading match): § 3.5 prescribes the literal
  heading `## Cache-prefix mechanism (Mode docs — informational; not a
  REINFORCED rule)` which contains the substring `## Cache-prefix
  mechanism (Mode docs`. PASSES.
- AC-R75-15 (run-pipeline.sh integration site): § 3.3 Delta A prescribes
  the `if [[ -f "$PROJECT_ROOT/scripts/build-role-context.js" ]]; then
  …; fi` block AND the fallback inside `if [[ -z "$context_bundle"
  ]]; then …; fi`. The legacy `cat "$PROJECT_ROOT/CLAUDE-COMMON.md"
  "$role_claude_file" "$stamp_file"` line moves INTO the fallback
  `[[ -z "$context_bundle" ]]` guard. PASSES.

### § 9.7 Empirical-premise verification (per Rule 5 / R72 + R73 + R74 lineage)

- **R73 fixture `scripts/tier-router-fixtures/R72-directive.md`
  existence:** verified via `ls scripts/tier-router-fixtures/` at
  session-entry (corpus.json + R45/R49/R50/R51-directive.md present;
  R72-directive.md NOT in the list of 5 files shown). **Empirical
  check needed:** at chore-A, the Implementer MUST verify
  `scripts/tier-router-fixtures/R72-directive.md` exists (it's used by
  the existing q73 test at `q73-tier-router.test.ts:34`). The
  cite-then-verify procedure: `ls scripts/tier-router-fixtures/R72-directive.md`.
  The R73 test file imports this fixture directly, so its existence is
  load-bearing for AC-R75-9 PASS. If missing at chore-A → HALT +
  DIAGNOSTIC (per R72 CRITICAL-1 lesson).
- **R74 fixtures `F1-default-haiku.md` + `F2-class-A-promotion.md`:**
  verified via `git ls-files scripts/mu-model-select-fixtures/` —
  both present in the tracked-files list. Load-bearing for AC-R75-10
  + AC-R75-11.
- **R74 selector default-haiku rationale literal:** verified at
  `scripts/mu-model-select.ts:169` → `rationale: 'default haiku (no
  cross-round-pattern marker)'`. AC-R75-10 binds this exact string.
- **R74 selector Class A decision_path:** verified at
  `scripts/mu-model-select.ts:159` → `decision_path: ['marker_match',
  \`class_${matched[0].class}\`]`. For class A → `['marker_match',
  'class_A']`. AC-R75-11 binds this exact array.
- **`scripts/mu-model-select-fixtures/F1-default-haiku.md` produces
  Branch 4 default-haiku:** verified by reading F1's content (a
  directive with no Class A/B/C/D markers). AC-R75-10 PASS premise
  holds.

### § 9.8 Branch-binding coverage (per Rule 2 / R21 + R73 reinforcements)

Every conditional branch in the prescribed code has an AC:

- `parseArgs`: returns Args or exits 1 on bad input. Errors are exercised
  manually at chore-A; not a runtime branch needing per-error AC.
- `extractDirectiveSection`: (a) NEXT-ROLE.md missing → return ''; (b)
  heading matches → return extracted section; (c) heading missing →
  return whole file. Branch (b) is exercised by AC-R75-2 (which loads
  the real NEXT-ROLE.md with a § R75 heading). Branches (a) + (c) are
  not separately bound but their absence does not affect any AC's
  PASS state — they are defensive fallbacks. **Acknowledged gap;
  minimum mitigation: future round can add a test if needed.** Below
  3-instance threshold; not a Rule 7 propagation candidate.
- `loadSpecTriad`: skips missing files. AC-R75-2 prefix output at
  Architect-dispatch time (when spec triad doesn't exist) would be
  shorter than at Implementer-dispatch time (when it does). The
  determinism AC-R75-3 only requires byte-identity for IDENTICAL
  inputs, so this branch is covered behaviorally.
- `buildTail`: errors if `roleClaudeFile` doesn't exist → exits 1.
  Tested implicitly by AC-R75-5 (all three roles' CLAUDE-<ROLE>.md
  must exist for the test to pass).
- `main` switch on `--emit`: prefix / tail / full → AC-R75-2, AC-R75-5,
  AC-R75-7 respectively.
- Bash `if [[ -f scripts/build-role-context.js ]]; then …`: AC-R75-15
  binds the integration site by grep (presence + fallback guard).
- Bash `if [[ -z "$context_bundle" ]]; then …` fallback: same AC.

Branch coverage assessment: PASS with one acknowledged minor gap on
`extractDirectiveSection` fallback branches (documented above).

### § 9.9 Boolean-semantics-in-bash sweep (per R74 CRITICAL-1 + cross-project rule)

Every bash boolean construct prescribed in § 3.3 and § 3.7:

- **§ 3.3 Delta A `[[ -f "$PROJECT_ROOT/scripts/build-role-context.js" ]]`**
  — file existence test. Returns true iff file exists. No `${VAR:+word}`
  patterns. Safe.
- **§ 3.3 Delta A `[[ -z "$context_bundle" ]]`** — empty string test.
  Returns true iff variable is empty. No boolean coercion. Safe.
- **§ 3.3 Delta B `[[ -f "$PROJECT_ROOT/scripts/measure-cache-effect.js" ]]`**
  — same. Safe.
- **§ 3.7 EMPIRICAL.sh `[ "$ok" = "1" ]`** — string equality. Safe.
- **§ 3.7 EMPIRICAL.sh `[[ -f scripts/build-role-context.js ]]`** —
  file existence. Safe.
- **§ 3.7 EMPIRICAL.sh `[[ "$a" == "$b" ]]`** — string equality. Safe.

No `${VAR:+word}` or `$VAR && action` patterns prescribed anywhere. The
R74 CRITICAL-1 class of bug is structurally avoided.

### § 9.10 Cite-then-verify summary (per Rule 5 sub-class supplementary R72 + R74)

Every file:line citation in this spec was verified by direct file read at
spec-emit time (Read tool with explicit offsets). Specifically:

- `run-pipeline.sh:1648` — verified line content matches the legacy bundle line.
- `run-pipeline.sh:1593-1602` — verified mktemp/stamp/trap block exists.
- `run-pipeline.sh:1606-1617` — verified role mapping case statement.
- `run-pipeline.sh:265` — verified ROUTING_LOG initialization.
- `scripts/mu-model-select.ts:66-77` — verified directive-extraction regex.
- `scripts/mu-model-select.ts:159` — verified Class A decision_path literal.
- `scripts/mu-model-select.ts:169` — verified default_haiku rationale literal.
- `tsconfig.test.json` `include` list — verified `scripts/**/*.ts` present.
- `.gitignore:6` `*.js` — verified.
- `CLAUDE-COMMON.md` REINFORCED count = 8 — verified by grep.

---

## § 10 Halt conditions (Implementer)

Mirror NEXT-ROLE.md § R75 halt conditions:

1. Q-R75-EMPIRICAL.sh non-zero exit at chore-A.
2. `pnpm exec tsc -p tsconfig.test.json` non-zero exit.
3. Test baseline drift beyond R75-additions (e.g., fail count rises
   above 5; pre-existing carry-forward fails change).
4. **R73 router validation regression OR R74 MU model selection
   regression** (AC-R75-9, AC-R75-10, AC-R75-11 fail).
5. R61-class architectural-reality discovery (engine surface or
   tsconfig surface contradicts spec assumption).
6. **R72 claim-then-walk + R74 TACTICAL-AUTONOMY-without-re-verification
   disciplines** — see § 6.4 for the explicit guard rails.
7. Architect spec uses round-evolution-fragile AC patterns (e.g.,
   live-file-count, forward-protection regex). NOT TRIGGERED by this
   spec — § 5.1 + § 5.2 use SHA-pinned ALLOWED_SET membership without
   live counts; AC regexes are insertion-site checks, not order-constraining.

On halt: STOP; write `coordination/diagnostics/DIAGNOSTIC-R75-<topic>.md`
with `Spec claim:` + `Reality:` + `Resolution options A/B/C:`; set
`coordination/NEXT-ROLE.md` STATUS to ESCALATE; append VIOLATION:
halt-discipline … to MEMORIAL.md.

---

## § 11 Pipeline invocation (post-Architect)

```bash
cd /Users/johnwarren/concord/tessera
./run-pipeline.sh --round R75 --tier full
```

(The Architect session is currently running; the operator's invocation
above dispatches IMPLEMENTER → REVIEWER → MU after the Architect commits
the spec triad and the routing block routes to IMPLEMENTER.)

---

## § 12 Spec-emit checklist (Architect; per pre-emit grilling)

- [x] Q.1 every claim verifiable? — § 9.1
- [x] Q.2 no unstated assumptions? — § 9.2
- [x] Q.3 no scope creep? — § 9.3
- [x] Q.4 Implementer can act without guessing? — § 9.4
- [x] Q.5 no spec-internal contradiction? — § 9.5
- [x] Q.6 self-application gate (Rule 3)? — § 9.6
- [x] Q.7 empirical-premise verification (Rule 5)? — § 9.7
- [x] Q.8 branch-binding coverage (Rule 2)? — § 9.8
- [x] Q.9 bash boolean-semantics sweep (R74 CRITICAL-1)? — § 9.9
- [x] Q.10 cite-then-verify summary (R72 + R74)? — § 9.10

Routing: IMPLEMENTER. STATUS: READY.
