# Q-R82-SPEC.md — Engine browser-bundling + Web Crypto adapter (Phase 4 SLICE 3 round 1)

**Round:** R82 (Phase 4 SLICE 3 first round)
**Tier:** full (Architect + Implementer + Reviewer + Memorial-Updater)
**Round-start SHA:** `5c3e0d9` (`5c3e0d9eb335e4a49d95cd2a3cfd55db18edfca2`)
**Routing status (Architect → Operator):** **ESCALATE** — see § 7 Open questions. The Architect-recommended path requires a new external `devDependency` (`esbuild`) per anti-scope clause of the directive. Operator picks Option A/B/C before chore-A.

The Architect spec content below assumes operator Option A (esbuild) for completeness. § 7 documents the bounded alternatives and the cost of each.

---

## § 0. Brainstorm (Superpowers Phase 1)

R82 foundation: ship the engine subset that is browser-safe as an ES module the demo dashboard can load via `<script type="module">`. The brick that R83/R84 need is a synchronous-callable engine surface inside `demos/demo.html` so the existing scenario-driven dashboard can swap canned JSON for live computation in later rounds. Two engine constraints make this nontrivial:

(a) `engine/topology-overlay.ts:30` imports `createHash` from `node:crypto`. The browser has no `node:crypto`; Web Crypto's `subtle.digest` is async-only. The `computeSnapshotHash(snapshot): string` surface is consumed synchronously by **7 callers** (verified by grep at spec-emit: `engine/topology/{slurm,k8s,nvlink,neuron,tpu}-source.ts`, `engine/topology/common-mode-attribution.ts`, `engine/hardware-topology-source.ts`). The R82 directive freezes those callers ("NO modification of `engine/*` EXCEPT `topology-overlay.ts`"), so the adapter MUST preserve the sync surface.

(b) `engine/*.ts` source uses bare-specifier imports (`from '../types'`, `from './primitives'`). Browsers cannot resolve bare specifiers in `<script type="module">` ESM. Either every import in `engine/*` is rewritten to `from '../types/index.js'` (anti-scope) or a bundler stitches the import graph into one self-contained ESM file.

### Approaches considered

**Approach A — esbuild bundler + embedded pure-JS SHA-256 (Architect-recommended).** Add `esbuild` (single binary, ~10 MB install) as a devDependency. `tools/build-browser-bundle.ts` invokes `esbuild.build({ bundle: true, format: 'esm', target: 'es2022', platform: 'browser', external: ['node:crypto', 'node:http', 'node:fs', 'node:events'] })` with an inline `stdin` entry that re-exports the browser-safe engine subset. Output: `demos/engine-bundle.mjs` (single file). `engine/topology-overlay.ts` gains an embedded pure-JS SHA-256 function used as fallback when `require('node:crypto')` throws (browser path). Public sync surface preserved verbatim.

- Strengths: native ESM bundling; tree-shakes; ~50 KB output bundle; standard tooling familiar to operators; transparent dep with single-binary install (no transitive npm tree); esbuild has TypeScript-native parsing so no separate `tsc → bundle` two-step.
- Weaknesses: +1 external `devDependency` (operator pre-authorization required per directive anti-scope).
- Hidden assumptions: operator OK with the dep; esbuild handles TS natively (verified — has been since v0.5); no transitive dep growth (esbuild ships as single Go binary).
- Risks: bundle output not byte-stable across esbuild minor versions (mitigation: pin minor version in `package.json` `"esbuild": "0.24.x"`).

**Approach B — Hand-rolled walker (no new dep).** Write a ~200-line `tools/build-browser-bundle.ts` that: (i) parses each engine TS file for `import` statements via regex; (ii) walks the transitive import graph from a fixed entry list; (iii) topologically sorts; (iv) concatenates source bodies into a single ESM by deleting in-bundle `import` statements and preserving public re-exports.

- Strengths: zero new dep; tool-owned and auditable.
- Weaknesses: brittle (regex-based TS parsing fails on edge-case syntax like `import type * as X from './y'`, comment-suppressed imports, dynamic imports); cannot tree-shake unused code; output bundle ~3-5× larger than esbuild; future engine refactors (renamed files, new families) silently break the walker; non-trivial bug surface for the Implementer.
- Hidden assumptions: the engine doesn't use any TS feature that the regex parser stumbles on; future engine PRs maintain regex-parseable import statements indefinitely.
- Risks: false-positive bundle (works for today's engine, breaks at R83 when first new symbol is added); the implementation cost lands on the Implementer (~3-5× spec-cycle complexity).

**Approach C — Separate `tsconfig.browser.json` emitting per-file ESM into `demos/engine/`; no bundler at all.** Modify every `import` in `engine/*` to add explicit `.js` extensions; browser uses native ESM resolution against the per-file emit tree.

- Strengths: zero bundler dep; uses standard browser ESM resolution.
- Weaknesses: REQUIRES adding `.js` extensions to ~100+ import statements across `engine/*`. The R82 directive says "NO modification of `engine/*` EXCEPT `topology-overlay.ts`."
- **Disqualified by anti-scope.**

### Selection rationale

**Pick Approach A.** Approach C is structurally disqualified (anti-scope violation). Approach B's brittleness is acceptable for a one-shot bundle but accumulates technical debt across R83/R84 (when the bundle surface expands); the marginal cost of one well-known dep is materially smaller than the brittleness cost of a hand-rolled walker. The operator's directive language ("esbuild OR equivalent") suggests pre-consideration of this exact choice.

**The dep addition is the ESCALATE.** § 7 Open questions documents the bounded operator options. The spec below assumes Option A so the Implementer has a complete prescription once the operator picks A; under B or C the spec must be re-authored.

The pure-JS SHA-256 fallback (vs the alternative of adding `@noble/hashes` as a 2nd dep) is chosen because: (i) the snapshot hash is used for cache identity not cryptographic security; (ii) a single-purpose ~70-line embedded implementation is auditable inline; (iii) avoids a 2nd new dep when one is already disputed.

### Approach A specifics — the implementation footprint

- **New file:** `tools/build-browser-bundle.ts` (~80 lines: hardcoded entry surface list; esbuild API call; logs bundle size).
- **Bounded mod:** `engine/topology-overlay.ts` — replace the `import { createHash } from 'node:crypto';` line with a lazy/try-required adapter that falls back to an embedded pure-JS SHA-256 (~70 lines new code in the same file).
- **New file:** `demos/engine-bundle.mjs` (build output; gitignored).
- **New file:** `test/q82-engine-browser-bundle.test.ts` (Architect-prescribed in § 4).
- **Modified:** `package.json` (add `esbuild` to devDeps + `"build:browser"` script).
- **Modified:** `pnpm-lock.yaml` (auto-updated by `pnpm install`).
- **Modified:** `demos/demo.html` — add `<script type="module">` smoke-test block at end-of-body.
- **Modified:** `.gitignore` — add `demos/engine-bundle.mjs` line (build artifact).
- **New file triad:** `coordination/specs/Q-R82-SPEC.md` (this file) + `Q-R82-SPEC-AUDIT.md` + `Q-R82-EMPIRICAL.sh`.

---

## § 1. Design phase (Superpowers Phase 2)

### 1.1 Component boundaries (what exists | what's created | what changes | what's deleted)

| Surface | State | Notes |
|---|---|---|
| `tools/build-browser-bundle.ts` | **NEW** | Browser-bundle build entry; invokes esbuild API |
| `engine/topology-overlay.ts` | **MODIFIED** (bounded; lines 30 + new helper region) | Replace `node:crypto` import with lazy adapter + embedded pure-JS SHA-256 |
| `demos/engine-bundle.mjs` | **NEW** (gitignored; build artifact) | Single-file ES module containing the browser-safe engine subset |
| `demos/demo.html` | **MODIFIED** (footer-only; new `<script type="module">` block) | Smoke-test load + console-log + window.__tessera_r82_smoke__ side-channel for Reviewer manual check |
| `package.json` | **MODIFIED** | Add `esbuild` devDep + `"build:browser"` script |
| `pnpm-lock.yaml` | **MODIFIED** | Lock file refreshed by `pnpm install esbuild --save-dev` |
| `.gitignore` | **MODIFIED** | Add `demos/engine-bundle.mjs` |
| `test/q82-engine-browser-bundle.test.ts` | **NEW** | All R82 structural + parity ACs |
| `coordination/specs/Q-R82-SPEC.md` | **NEW** | This file |
| `coordination/specs/Q-R82-SPEC-AUDIT.md` | **NEW** | Audit sidecar (Reviewer-only) |
| `coordination/specs/Q-R82-EMPIRICAL.sh` | **NEW** | Binding-command harness |
| All other `engine/*` files | UNCHANGED | A12 + directive anti-scope |
| All `demos/scenarios/*.json` | UNCHANGED | R71/R79/R80/R81 frozen content |
| All `test/q01..q81*.test.ts` | UNCHANGED | Forward-protection ACs may flip per § 1.4 |

### 1.2 Browser-safe engine subset enumeration (Architect-picked; verbatim entry list)

Verified by grep at spec-emit time. The `node:` API usage map (verified via `grep -rn "from 'node:" engine/*.ts engine/**/*.ts`):

```
engine/topology-overlay.ts:30:           import { createHash } from 'node:crypto';   ← rewritten by R82
engine/ds-integration/event-consumer.ts: import http from 'node:http'; + 'node:events' ← EXCLUDED
engine/ds-integration/feed.ts:           import http from 'node:http';               ← EXCLUDED
engine/detectors/_q72-trace.ts:69:       _fs = require('node:fs')                    ← LAZY; conditionally bundled
```

**Browser-safe subset (entry surface re-exported from inline `stdin` entry):**

```
engine/topology-overlay.ts           (after R82 adapter)
engine/topology/common-mode-attribution.ts
engine/detectors/family-a-mixture-supermartingale.ts
engine/detectors/family-c-betting-e-process.ts
engine/detectors/family-c-rff.ts
engine/detectors/betting-e-process.ts
engine/detectors/conformal.ts
engine/detectors/hotelling.ts
engine/detectors/page-cusum.ts
engine/detectors/self-normalized-e-process-fallback.ts
engine/detectors/sequential-mmd.ts
engine/detectors/spectral.ts
engine/detectors/_linalg.ts
engine/per-shard/runtime.ts
engine/per-shard/warm-start.ts
engine/per-shard/welford.ts
engine/fleet/e-bh.ts
engine/events/freeze-hook.ts
engine/types/*  (transitively imported; barrel index.ts)
```

**Excluded explicitly:**

```
engine/ds-integration/*  (node:http + node:events; server-side only)
engine/detectors/_q72-trace.ts  (lazy node:fs require; tracing utility; bundling-excluded)
```

The lazy `require('node:fs')` in `_q72-trace.ts` is gated by `q72TraceEnabled()` returning `false` when `process.env` is undefined (browser). Two options for this file:
- **Option (i): include `_q72-trace.ts` in the bundle** with `node:fs` marked external. Browser never triggers the lazy require (gated by `typeof process !== 'undefined'` at `_q72-trace.ts:56`).
- **Option (ii): exclude `_q72-trace.ts` from the bundle entry surface entirely.**

**Architect picks Option (i)**: `_q72-trace.ts` IS imported by `family-c-betting-e-process.ts`. Excluding it would force a modification to `family-c-betting-e-process.ts` (anti-scope: `engine/detectors/*` modifications prohibited). Including it with `node:fs` external is the only structurally safe path.

### 1.3 Integration points

| # | Integration | Direction | Failure mode |
|---|---|---|---|
| I1 | `tools/build-browser-bundle.ts` → esbuild API → `demos/engine-bundle.mjs` | Build-time | esbuild dep missing → build fails → Block 2 of EMPIRICAL.sh fails |
| I2 | `engine/topology-overlay.ts` lazy `require('node:crypto')` → Node Path | Runtime (Node) | `require` undefined in browser → caught → falls through to pure-JS |
| I3 | `engine/topology-overlay.ts` pure-JS SHA-256 → embedded function | Runtime (browser; fallback when (I2) throws) | Algorithm bug → hash mismatch with node:crypto → AC-R82-7 fails |
| I4 | `demos/demo.html` `<script type="module">` → `./engine-bundle.mjs` | Browser load-time | Bundle file missing → browser console error; smoke `window.__tessera_r82_smoke__` undefined |
| I5 | All existing 7 callers of `computeSnapshotHash(snapshot): string` | Runtime (Node) | Sync surface preserved → ALL 7 callers see no breaking change |
| I6 | esbuild externalization of `node:crypto` / `node:http` / `node:fs` / `node:events` | Build-time | If externalization omitted → esbuild tries to inline node-internal stubs → bundle bloats or errors |

### 1.4 Architect pre-prediction table (predictions, not observations; encode-actual-results-verbatim discipline)

| Observable | Architect pre-prediction at R82 chore-A | Rationale |
|---|---|---|
| `pnpm exec tsc -p tsconfig.test.json` exit | **0** | R82 modifications are TS-clean; topology-overlay.ts changes preserve sync return type; `pureJsSha256` exported as `(input: string) => string` |
| `pnpm exec node --test --test-reporter=tap test/*.test.js` process exit | **1** | node-test exits 1 when any subtest fails; baseline carry-forward + R81 forward-protection flips |
| TAP `# tests` | predicted **638** (R81 close 622 + 14 new R82 ACs + 2 R82-internal subtests; band [635, 640]) | each AC-R82-N is one `test()` block; some AC tests contain multiple `assert()` calls inside one block |
| TAP `# pass` | predicted **622** (R81 close 607 + 14 new R82 ACs + 2 + 1 R81-forward-protection flip predicted-pass; band [620, 625]) | depends on which forward-protection ACs flip |
| TAP `# fail` | predicted **12** (R81 close 11 + 1 new R82-forward-protection-flip from R81 AC-R81-14: R81 ALLOWED regex doesn't include R82 paths). Strict equality: 12. | R81 AC-R81-14 ALLOWED_SET regex enumerates R81-specific files; R82 paths (test/q82-*, coordination/specs/Q-R82-*, demos/engine-bundle.mjs, tools/build-browser-bundle.ts, .gitignore, etc.) are not in that regex → flip predicted |
| TAP `# skipped` | **4** (unchanged) | no skip changes |
| `bash Q-R82-EMPIRICAL.sh` exit at chore-A | **0** (ALL BLOCKS PASS) | spec § 5.2 + Block prescriptions designed so all blocks pass post-Implementer |
| `git diff 5c3e0d9 HEAD --name-only` line count | predicted **13-16** | 1 new tool file, 1 modified engine file, 1 build output (gitignored — does NOT appear in diff), 1 modified demo.html, 1 modified .gitignore, 1 modified package.json, 1 modified pnpm-lock.yaml, 1 new test file, 3 spec triad files, 1 NEXT-ROLE.md, 1 MEMORIAL.md, optional REVIEWER-REPORT + ROUND-ROUTING.md files (forward-protective) |
| `demos/engine-bundle.mjs` byte size | predicted **35,000 - 80,000 bytes** | esbuild ESM output for the browser-safe subset; ~12 detector files + types + per-shard + fleet + topology-overlay + common-mode + freeze-hook |

### 1.5 Failure modes at each integration point

| ID | Integration | Failure mode | Mitigation |
|---|---|---|---|
| F1 | I1 esbuild build | esbuild not installed | Build script wraps in `try/catch`; emits clear error message "esbuild not in devDeps — operator must approve via ESCALATE Option A"; EMPIRICAL.sh Block 2 fails with exit 1 |
| F2 | I2 + I3 | Pure-JS SHA-256 produces non-matching hex | AC-R82-7 byte-identity test exercises BOTH paths against a fixed input + asserts equal; mutation: any algorithmic divergence trips the test |
| F3 | I1 | esbuild externalization of `node:*` modules omitted | Architect prescription § 4.1 enumerates every `external:` entry literally |
| F4 | I4 | demos/engine-bundle.mjs not regenerated after engine change | `build:browser` script is idempotent; CI / chore-A invokes it; AC-R82-3 verifies output exists |
| F5 | I5 | Adding a NEW export to `engine/topology-overlay.ts` (`pureJsSha256`) potentially breaks A12 ("inherited vendored-at-pin engine internals") | Underscore-prefix convention (`pureJsSha256` as an exported test-helper; spec § 4.1.4 documents this is a test-only export not consumed by the engine itself) + cite the directive's explicit authorization "Web Crypto adapter" |
| F6 | I3 | Pure-JS SHA-256 implementation bug not caught at AC-R82-7 because test input is too narrow | AC-R82-7 uses ≥3 distinct test vectors of varying lengths (empty string, short string, ≥56-byte string crossing the SHA-256 message-padding boundary at 56 bytes per block) |

### 1.6 Architect choices documented (not deferred)

| Choice | Architect pick | Alternatives rejected; rationale |
|---|---|---|
| Bundler | **esbuild** | rollup (transitive deps); vite (overshoot); tsc-only (no bundling); hand-rolled (brittle per Approach B). |
| Web Crypto adapter pattern | **Lazy try/require + embedded pure-JS SHA-256** | Option (i) async-promise (breaks 7 callers' sync surface); Option (ii) runtime-detect WITHOUT pure-JS fallback (forces external dep); Option (iii) two parallel files (maintenance burden). |
| Pure-JS SHA-256 source | **Embedded ~70 lines in `topology-overlay.ts`** (FIPS 180-4 reference; standard textbook algorithm) | `@noble/hashes` (2nd new dep); `sha.js` (npm, less audited). Inline keeps the modification within the directive-authorized file. |
| Bundle output location | **`demos/engine-bundle.mjs`** | `dist/engine-bundle.mjs` (further from consumer); `engine/index.browser.js` (anti-scope — engine/* modification). |
| Bundle entry source | **inline esbuild `stdin` option** with hardcoded re-export list | Separate `engine/index.browser.ts` (would be anti-scope new file under engine/); separate `tools/browser-bundle-entry.ts` (extra indirection; same effect). |
| `_q72-trace.ts` handling | **Include in bundle; mark `node:fs` external** | Excluding forces upstream modification to `family-c-betting-e-process.ts` (anti-scope). Lazy require is gated by `process.env` runtime check; browser never triggers it. |
| Smoke-test signaling channel | **`window.__tessera_r82_smoke__ = { hash, loaded: true }` + `console.log` line prefixed `R82 smoke:`** | Reviewer can open browser → check console for `R82 smoke:` log line + inspect `window.__tessera_r82_smoke__.loaded === true`; manual check acknowledged in § 5.3. |

---

## § 2. Mechanism — load-bearing architectural decisions

### 2.1 Lazy hash adapter pattern in `engine/topology-overlay.ts` (verbatim; Implementer copies)

**Current state at round-start HEAD `5c3e0d9`:**

```ts
// engine/topology-overlay.ts:30
import { createHash } from 'node:crypto';
```

**R82 replacement (verbatim mechanism):**

Replace line 30's static import with a runtime-detected adapter. Add a new private helper region after line 30 (and before the existing `import type` block on line 32). The replacement injects two new top-level declarations: `_sha256Hex` (the runtime-detecting adapter) and `pureJsSha256` (the embedded fallback). Both are exported because `pureJsSha256` is exercised by `test/q82-engine-browser-bundle.test.ts` AC-R82-7.

Pseudocode (Implementer renders TypeScript verbatim per algorithmic structure):

```ts
// ── R82 Web Crypto adapter (replaces top-level `import { createHash } from 'node:crypto';`) ──
// Sync surface preserved per A12 + R82 anti-scope (all 7 callers of computeSnapshotHash
// receive `string`, not `Promise<string>`).
//
// In Node: lazy `require('node:crypto')` is reachable (top-level `require` defined).
// In browser bundle: `require` is undefined → ReferenceError caught → fall through to
// embedded pure-JS SHA-256 (FIPS 180-4 reference implementation).

/** R82 internal SHA-256 hex adapter. Public export for cross-platform parity testing
 *  (AC-R82-7); not consumed by any production engine code path. */
export function pureJsSha256(input: string): string {
  // FIPS 180-4 SHA-256:
  //  - K constants: 64 round constants (sqrt(2..311) fractional bits, first 32)
  //  - H init: 8 initial hash values
  //  - Pre-processing: append 0x80, pad with zeros to bitlen ≡ 448 (mod 512),
  //    append 64-bit big-endian message length in bits
  //  - Compression: 64-round Wt expansion + 64-round Wt-Kt mixing
  //  - Output: H[0..7] concatenated as big-endian uint32, rendered lowercase hex
  // Algorithm details: NIST FIPS 180-4 § 6.2; standard textbook implementation.
  // [Implementer renders the standard SHA-256 algorithm; ~60-70 lines including
  // K-constants array, H-init array, message-padding, compression loop, hex-render.
  // Reference: any FIPS 180-4 compliant JavaScript SHA-256, e.g., the implementation
  // used in `@noble/hashes/sha256` but inlined here.]
}

function _sha256Hex(input: string): string {
  try {
    // typeof check is the load-bearing guard: in browser bundle, `require` is undefined
    // → ReferenceError is thrown by the `require(...)` evaluation → caught → fallback.
    // The `typeof require !== 'undefined'` guard short-circuits cleanly in browser.
    if (typeof require !== 'undefined') {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const nc = require('node:crypto') as typeof import('node:crypto');
      return nc.createHash('sha256').update(input).digest('hex');
    }
  } catch {
    // require failed (browser-bundle path; node:crypto externalized but not present)
    // → fall through to embedded pure-JS implementation below.
  }
  return pureJsSha256(input);
}
```

**Then** modify the existing `computeSnapshotHash` body (currently lines 69-78) to call `_sha256Hex` instead of `createHash`:

```ts
export function computeSnapshotHash(snapshot: TopologySnapshot): string {
  const nodes = [...snapshot.nodes].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const edges = [...snapshot.edges].sort((a, b) => {
    if (a.from !== b.from) return a.from < b.from ? -1 : 1;
    if (a.to !== b.to) return a.to < b.to ? -1 : 1;
    return a.relationship < b.relationship ? -1 : a.relationship > b.relationship ? 1 : 0;
  });
  const canonical = JSON.stringify({ nodes, edges });
  return _sha256Hex(canonical);     // ← was: createHash('sha256').update(canonical).digest('hex');
}
```

**Constraint (R82 forward-coverage):** the `createHash` symbol MUST NOT appear anywhere in `engine/topology-overlay.ts` post-R82 (it was the only consumer of the `node:crypto` import). AC-R82-5 asserts `grep -c "createHash" engine/topology-overlay.ts === 0` (post-R82 state).

### 2.2 esbuild build invocation (verbatim mechanism for `tools/build-browser-bundle.ts`)

Pseudocode (Implementer renders TypeScript verbatim):

```ts
// tools/build-browser-bundle.ts
//
// R82 — engine browser-bundle builder.
// Invoked via `pnpm build:browser` (package.json script).
// Output: demos/engine-bundle.mjs (gitignored build artifact).
//
// Approach A per Q-R82-SPEC § 0: esbuild API + inline `stdin` re-export entry +
// `external:` for all `node:*` modules + format ESM + target es2022 + platform browser.

import * as esbuild from 'esbuild';

// Hardcoded re-export entry. Imports are bare-specifier-resolved by esbuild from
// the script's CWD (project root). Public surface is intentionally minimal for R82;
// R83/R84 may expand as live-compute needs grow.
const ENTRY_SOURCE = `
export {
  computeSnapshotHash,
  pureJsSha256,
  StaticTopologySource,
  TopologyEnricher,
} from './engine/topology-overlay';

export * as detectors from './engine/detectors/betting-e-process';
export * as familyA from './engine/detectors/family-a-mixture-supermartingale';
export * as familyC from './engine/detectors/family-c-betting-e-process';
export * as eBH from './engine/fleet/e-bh';
export * as runtime from './engine/per-shard/runtime';
export * as freezeHook from './engine/events/freeze-hook';
export * as commonMode from './engine/topology/common-mode-attribution';
export * as types from './engine/types';
`;

async function main(): Promise<void> {
  const result = await esbuild.build({
    stdin: {
      contents: ENTRY_SOURCE,
      loader: 'ts',
      resolveDir: process.cwd(),
      sourcefile: 'tessera-engine-browser-bundle-entry.ts',
    },
    bundle: true,
    format: 'esm',
    target: 'es2022',
    platform: 'browser',
    outfile: 'demos/engine-bundle.mjs',
    external: ['node:crypto', 'node:http', 'node:fs', 'node:events'],
    legalComments: 'none',
    minify: false,
    sourcemap: false,
    logLevel: 'info',
  });
  if (result.errors.length > 0) {
    console.error('esbuild errors:', result.errors);
    process.exit(1);
  }
  const fs = await import('node:fs');
  const sz = fs.statSync('demos/engine-bundle.mjs').size;
  console.log(`R82 browser bundle written: demos/engine-bundle.mjs (${sz} bytes)`);
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
```

**R75 self-application gate applied (cross-module import execution paths):** the `if (require.main === module)` guard prevents `main()` from running when any other module imports this file. The `tools/build-browser-bundle.ts` is intended to be invoked directly via `pnpm build:browser`; it is not imported elsewhere.

**R75 stdio-flush note:** the bundle write goes through `fs.statSync` and stdout is one short line; no >64KB stdout-pipe write that could truncate.

### 2.3 `demos/demo.html` smoke-test block (verbatim)

Append a NEW `<script type="module">` block immediately before the existing `</body>` closing tag (which currently sits at line 13206). The existing `<script>` IIFE (lines 12700-13205 approx) is the canned-demo dashboard; it remains untouched. The new module-script block runs after the dashboard script and exercises the bundle:

```html
<script type="module">
  // R82 smoke test — load engine-bundle.mjs + exercise computeSnapshotHash sync surface.
  // R83/R84 expand this to live engine computation; R82 is bundle-loads + hash-runs only.
  try {
    const engine = await import('./engine-bundle.mjs');
    const snapshot = {
      nodes: [{ id: 'a' }, { id: 'b' }],
      edges: [{ from: 'a', to: 'b', relationship: 'contains' }],
      fetched_at_ts: 0,
      source_id: 'r82-smoke',
      source_version: 'r82',
    };
    const hash = engine.computeSnapshotHash(snapshot);
    // Side-channel for Reviewer manual verification (§ 5.3 acknowledged gap mitigation):
    // open browser devtools console; expect:
    //   - one log line prefixed "R82 smoke:" with a 64-char hex hash
    //   - window.__tessera_r82_smoke__ === { loaded: true, hash: '<64-char hex>' }
    window.__tessera_r82_smoke__ = { loaded: true, hash };
    console.log('R82 smoke: computeSnapshotHash =', hash);
  } catch (err) {
    window.__tessera_r82_smoke__ = { loaded: false, error: String(err) };
    console.error('R82 smoke: bundle failed to load:', err);
  }
</script>
```

This block is HTML, not TypeScript; the Implementer adds it verbatim to the existing `demos/demo.html` end-of-file region (the existing dashboard IIFE remains intact; placement after the IIFE).

### 2.4 `.gitignore` entry (verbatim)

Append (no removal; one line):

```
# R82: engine browser-bundle (build output of `pnpm build:browser`)
demos/engine-bundle.mjs
```

The bundle is built by `pnpm build:browser`; the file is regenerable; not tracking it avoids bundling-output noise in PR diffs.

**R81 lesson applied (R81 MAJOR-3 — verify target document state before append):** at spec-emit time the Architect ran `grep -n "demos/engine-bundle" .gitignore` → no match. No collision. Append is safe.

### 2.5 `package.json` modifications (verbatim)

Two changes:

**(a) Add `esbuild` to `devDependencies`:**

```json
  "devDependencies": {
    "@types/node": "^22.0.0",
    "esbuild": "^0.24.0",
    "typescript": "^5.4.0"
  }
```

Insertion in alphabetical order between `@types/node` and `typescript`. Pin to caret `^0.24.0` so patch updates land freely; minor-version bumps require explicit opt-in.

**(b) Add `"build:browser"` script:**

```json
  "scripts": {
    ...
    "build:browser": "pnpm exec node tools/build-browser-bundle.js",
    ...
  }
```

Insertion alphabetical-ish into the existing scripts block (placement after `"build:demos"`). The script invokes the compiled `.js` (tsconfig.test.json emits .js next to .ts; gitignored). Pre-step `prebuild:browser` is NOT required because `esbuild` handles TypeScript natively at bundle time AND because the tool itself runs as compiled .js (post-`pnpm pretest`).

**R74 MINOR-5 self-application gate:** if a future round adds a pre-step requiring tsc emit before `tools/build-browser-bundle.js` is loadable, the script as written above WILL still work because chore-A includes `pnpm pretest` (or its equivalent) before chore-A pre-flight tsc. The pretest hook compiles the .ts → .js. The script literal `"pnpm exec node tools/build-browser-bundle.js"` matches the existing `"build:demos": "node tools/build-canned-demos.js"` pattern.

### 2.6 Pure-JS SHA-256 byte-identity verification mechanism

The AC-R82-7 test exercises both code paths against ≥3 distinct test vectors with KNOWN expected hex outputs (from NIST FIPS 180-2 examples or RFC 6234):

| Test vector | Expected SHA-256 (lowercase hex) |
|---|---|
| `""` (empty string) | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `"abc"` | `ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad` |
| `"abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq"` (FIPS 180-2 multi-block test vector; 56 bytes — crosses padding boundary) | `248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1` |

These literals are verified against the existing Node `createHash('sha256')` for parity at the test side. The test:

1. Imports `computeSnapshotHash` (uses node:crypto path under Node).
2. Imports `pureJsSha256` (the exported fallback) directly.
3. For each test vector, computes:
   - `nodeHash = require('node:crypto').createHash('sha256').update(vector).digest('hex')`
   - `pureHash = pureJsSha256(vector)`
   - Asserts `nodeHash === pureHash === expectedLiteral` (3-way equality).

This catches: any algorithmic divergence between node:crypto and the embedded implementation (F2 failure mode in § 1.5).

### 2.7 Bundle structural assertions (AC-R82-4 verbatim)

The bundle output `demos/engine-bundle.mjs` must:
- Contain at least the substrings (literal-match in file text): `computeSnapshotHash`, `pureJsSha256`, `StaticTopologySource`, `TopologyEnricher`, `commonMode`, `freezeHook`, `eBH`, `runtime`, `familyA`, `familyC`, `detectors`, `types`.
- NOT contain any `engine/ds-integration/` symbol (e.g., `EventConsumer`, `DSFeed`, `freeze_hook_factory`) — these would indicate the externalization failed.
- File size ≥ 5000 bytes (sanity for "real bundle, not stub").

AC-R82-4 binds these with `grep -c` against the bundle file.

### 2.8 Forward-protection accounting (R71 MINOR-1 + R79 + R81 lesson sequence)

**R81 AC-R81-14 forward-protection flip predicted** at R82 chore-A. R81's ALLOWED_SET regex (at `test/q81-slice-2-close.test.ts`) does not enumerate R82-specific paths (`test/q82-*.test.ts`, `coordination/specs/Q-R82-*`, `tools/build-browser-bundle.ts`, `demos/engine-bundle.mjs`, `.gitignore`, `package.json`, `pnpm-lock.yaml`). Adding R82 deliverables to the diff window causes R81's anti-scope test to FAIL (forward-protection-flip, as designed — R81 anti-scope froze R81-only paths).

This flip is enumerated in the predicted `# fail = 12` at chore-A.

**No other prior-round forward-protection flips predicted.** R79 / R80 anti-scope ACs already flipped at R80 / R81 respectively; their failure count is in the carry-forward 11.

---

## § 3. Component inventory + ALLOWED_SET

### 3.1 Component inventory (matches § 1.1; one row per file)

| Path | Status | Author | Anti-scope class |
|---|---|---|---|
| `tools/build-browser-bundle.ts` | **NEW** | Implementer | tool addition (Tessera-original) |
| `engine/topology-overlay.ts` | **MODIFIED** (bounded; line 30 region + new helpers) | Implementer | directive-authorized exception to A12 |
| `demos/engine-bundle.mjs` | **NEW** (gitignored; build artifact) | Implementer (via `pnpm build:browser`) | gitignored build output |
| `demos/demo.html` | **MODIFIED** (footer-only `<script type="module">` insertion) | Implementer | demos/* extension (R71/R79/R80/R81 pattern) |
| `package.json` | **MODIFIED** (devDeps + scripts) | Implementer | project-meta extension |
| `pnpm-lock.yaml` | **MODIFIED** (lockfile refresh) | Implementer (via `pnpm install`) | project-meta extension |
| `.gitignore` | **MODIFIED** (1 new line) | Implementer | project-meta extension |
| `test/q82-engine-browser-bundle.test.ts` | **NEW** | Implementer | test-suite extension |
| `coordination/specs/Q-R82-SPEC.md` | **NEW** | Architect (this commit) | spec triad |
| `coordination/specs/Q-R82-SPEC-AUDIT.md` | **NEW** | Architect (this commit) | spec triad |
| `coordination/specs/Q-R82-EMPIRICAL.sh` | **NEW** | Architect (this commit) | spec triad |
| `coordination/NEXT-ROLE.md` | **MODIFIED** (Architect routing block append) | Architect | coordination |
| `coordination/MEMORIAL.md` | **MODIFIED** (CONFIRMATION lines append) | Architect | coordination |
| `coordination/reviews/REVIEWER-REPORT-R82.md` | **NEW** (Reviewer phase) | Reviewer | coordination |
| `coordination/logs/ROUND-R82-ROUTING.md` (forward-protective) | **NEW** (optional; per-round routing log) | downstream roles | coordination |
| `coordination/diagnostics/DIAGNOSTIC-R82-*.md` | NEW if any HALT fires | downstream roles | diagnostic (forward-protective) |
| `CLAUDE-*.md` family files | possibly MODIFIED (Memorial-Updater reinforcements) | Memorial-Updater | coordination |

### 3.2 ALLOWED_SET regex (machine-checkable; used by EMPIRICAL.sh Block 5 and AC-R82-14)

SHA-pinned to round-start `5c3e0d9`. Anchored start-to-end per R44/R46 discriminating-regex reinforcement. Forward-protective R-number wildcards on DIAGNOSTIC and ROUND-summary paths.

```
^(tools/build-browser-bundle\.ts|tools/build-canned-demos\.ts|engine/topology-overlay\.ts|demos/demo\.html|demos/engine-bundle\.mjs|package\.json|pnpm-lock\.yaml|\.gitignore|test/q82-engine-browser-bundle\.test\.ts|test/q01-no-at-pin-deltas\.test\.ts|coordination/specs/Q-R82-SPEC\.md|coordination/specs/Q-R82-SPEC-AUDIT\.md|coordination/specs/Q-R82-EMPIRICAL\.sh|coordination/NEXT-ROLE\.md|coordination/MEMORIAL\.md|coordination/MEMORIAL-PHASE-[0-9]+\.md|coordination/VENDORING-MANIFEST\.md|coordination/reviews/REVIEWER-REPORT-R82\.md|coordination/logs/ROUND-R[0-9]+-(SUMMARY|ROUTING)\.md|coordination/diagnostics/DIAGNOSTIC-R[0-9]+-.*\.md|CLAUDE\.md|CLAUDE-ARCHITECT\.md|CLAUDE-IMPLEMENTER\.md|CLAUDE-REVIEWER\.md|CLAUDE-MEMORIAL\.md|CLAUDE-COMMON\.md|CLAUDE-COORDINATOR\.md)$
```

**Discriminating-pattern audit (R44/R46):** every alternation in the regex is anchored (`^...$`). The `coordination/logs/ROUND-R[0-9]+-(SUMMARY|ROUTING)\.md` and `coordination/diagnostics/DIAGNOSTIC-R[0-9]+-.*\.md` patterns are forward-protective (don't pin to R82 specifically — future rounds may legitimately re-route through this set without re-amending the regex).

**`.gitignore` semantics audit (R72 MAJOR-2 + R23 MINOR-2 lesson applied):**
- `demos/engine-bundle.mjs` is listed in `.gitignore` (modified by R82). Therefore `git diff` does NOT report it as a tracked path.
- The ALLOWED_SET regex still includes `demos/engine-bundle\.mjs` as a defensive entry — if a future round un-ignores the path, the regex must already pre-authorize it.
- `git ls-files demos/engine-bundle.mjs` will return empty at chore-A (gitignored). EMPIRICAL.sh Block 5 must not assert presence in `git diff`; instead Block 2 asserts the file exists via `[ -f demos/engine-bundle.mjs ]`.

---

## § 4. Per-file pseudocode

### 4.1 `engine/topology-overlay.ts` modifications

Three discrete deltas:

**Delta 1 — Remove static node:crypto import at line 30.**

Before:
```ts
// engine/topology-overlay.ts:30
import { createHash } from 'node:crypto';
```

After: delete the line. The replacement adapter region (Delta 2) supplies `_sha256Hex` which encapsulates the require.

**Delta 2 — Insert R82 adapter region after Delta 1 (i.e., starting at what was line 30 before deletion).**

The Implementer inserts the verbatim mechanism from § 2.1 (the `pureJsSha256` and `_sha256Hex` declarations). The pure-JS SHA-256 implementation is the standard FIPS 180-4 reference. The Implementer renders the standard algorithm verbatim (no clever optimizations); any FIPS-180-4-compliant JavaScript implementation will produce identical hex output for identical input. Specifically:

```ts
// Standard SHA-256 reference:
//
//   K[64]: round constants (first 32 bits of fractional parts of cube roots of first 64 primes)
//   H[8]:  initial hash values (first 32 bits of fractional parts of square roots of first 8 primes)
//   Compression: 64-round update of working variables a..h
//
// The implementation uses Uint8Array for byte-level message processing and Uint32Array
// for word-level state. ASCII-encoded message bytes are decoded via TextEncoder where
// available (Node + modern browsers both ship TextEncoder); fallback to per-char codePointAt
// is acceptable for the ASCII-only input range our snapshot canonicalization produces
// (TopologyNode.id / source_id / source_version are ASCII per existing R23/R28 fixtures).
//
// Public surface: exports the function `pureJsSha256(input: string): string` returning
// lowercase hex of length 64.
```

**Delta 3 — Update `computeSnapshotHash` body to call `_sha256Hex`.**

Currently lines 69-78 use `createHash('sha256').update(canonical).digest('hex')`. The Implementer replaces the body's final return with `return _sha256Hex(canonical);` and removes the `createHash` reference (Delta 1 has already removed the import).

After all three deltas, `grep -c "createHash" engine/topology-overlay.ts` MUST return `0`.

### 4.2 `tools/build-browser-bundle.ts` (new file; verbatim per § 2.2)

The Implementer renders the file from § 2.2 verbatim. Two minor tactical-autonomy items:
- Variable names inside `main()` may be renamed if collisions arise.
- The `legalComments`, `minify`, `sourcemap`, `logLevel` esbuild options may be tweaked at Implementer discretion provided the bundle output remains a single ESM file at the prescribed path.

### 4.3 `demos/demo.html` modification (new `<script type="module">` block per § 2.3)

The Implementer appends the verbatim `<script type="module">` block from § 2.3 immediately before the existing `</body>` tag at line 13206. The existing `</script>` closing tag at line 13205 (which closes the dashboard IIFE) must remain intact; the new block opens its own `<script type="module">` after the IIFE's closing `</script>`.

**Acknowledged limitation:** AC-R82-9 verifies the literal presence of the `<script type="module">` block + key substrings (`./engine-bundle.mjs`, `computeSnapshotHash`, `R82 smoke`). The block's runtime behavior in the browser is acknowledged gap 1 in § 5.3 (Reviewer manual check).

### 4.4 `.gitignore` modification (per § 2.4)

Append two lines (one comment, one path entry) immediately before the existing `# Anchor Mode 2 pipeline artifacts` block (which sits at end-of-file region):

```
# R82: engine browser-bundle (build output of `pnpm build:browser`)
demos/engine-bundle.mjs
```

**Verified at spec-emit:** `grep -n "engine-bundle\|demos/engine" .gitignore` returns no match. No collision. (Architect ran this check at spec-emit time per R81 MAJOR-3 lesson.)

### 4.5 `package.json` modification (per § 2.5)

Two surgical edits per § 2.5: (a) insert `"esbuild": "^0.24.0",` into devDeps between `"@types/node"` and `"typescript"`; (b) insert `"build:browser": "pnpm exec node tools/build-browser-bundle.js",` into scripts after `"build:demos"`. The Implementer additionally runs `pnpm install esbuild --save-dev` (or `pnpm install` with the manual edit) to refresh `pnpm-lock.yaml`.

### 4.6 `test/q82-engine-browser-bundle.test.ts` pseudocode

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';

// Engine surface under test
import {
  computeSnapshotHash,
  pureJsSha256,
} from '../engine/topology-overlay';

const ROUND_START_SHA = '5c3e0d9';
const REPO_ROOT = path.resolve(__dirname, '..');

const BUNDLE_PATH = path.join(REPO_ROOT, 'demos/engine-bundle.mjs');
const BUILD_TOOL_PATH = path.join(REPO_ROOT, 'tools/build-browser-bundle.ts');
const DEMO_HTML_PATH = path.join(REPO_ROOT, 'demos/demo.html');
const PACKAGE_JSON_PATH = path.join(REPO_ROOT, 'package.json');
const GITIGNORE_PATH = path.join(REPO_ROOT, '.gitignore');
const TOPOLOGY_OVERLAY_PATH = path.join(REPO_ROOT, 'engine/topology-overlay.ts');

// ── AC-R82-1: build-browser-bundle.ts exists ──
test('AC-R82-1: tools/build-browser-bundle.ts exists', () => {
  assert.ok(fs.existsSync(BUILD_TOOL_PATH), 'tools/build-browser-bundle.ts must exist');
  const content = fs.readFileSync(BUILD_TOOL_PATH, 'utf8');
  assert.match(content, /esbuild/, 'must reference esbuild');
  assert.match(content, /demos\/engine-bundle\.mjs/, 'must target demos/engine-bundle.mjs');
});

// ── AC-R82-2: package.json has build:browser script + esbuild devDep ──
test('AC-R82-2: package.json scripts.build:browser + devDeps.esbuild', () => {
  const pkg = JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, 'utf8'));
  assert.equal(typeof pkg.scripts?.['build:browser'], 'string',
               'package.json scripts.build:browser must be a string');
  assert.match(pkg.scripts['build:browser'],
               /tools\/build-browser-bundle\.js/,
               'build:browser script must invoke tools/build-browser-bundle.js');
  assert.equal(typeof pkg.devDependencies?.esbuild, 'string',
               'devDependencies.esbuild must be a string');
});

// ── AC-R82-3: demos/engine-bundle.mjs exists ≥ 5000 bytes ──
test('AC-R82-3: demos/engine-bundle.mjs exists and is ≥ 5000 bytes', () => {
  assert.ok(fs.existsSync(BUNDLE_PATH), 'demos/engine-bundle.mjs must exist');
  const sz = fs.statSync(BUNDLE_PATH).size;
  assert.ok(sz >= 5000, `bundle size ${sz} < 5000 bytes`);
});

// ── AC-R82-4: bundle contains expected exports + no ds-integration symbols ──
test('AC-R82-4: bundle exports the browser-safe surface + excludes ds-integration', () => {
  const txt = fs.readFileSync(BUNDLE_PATH, 'utf8');
  // Required symbols (each must appear ≥ 1 time)
  for (const sym of ['computeSnapshotHash', 'pureJsSha256', 'StaticTopologySource',
                     'TopologyEnricher']) {
    assert.ok(txt.includes(sym), `bundle must contain symbol "${sym}"`);
  }
  // Excluded ds-integration markers (each must appear 0 times)
  for (const banned of ['DsEventConsumer', 'createDsFeed', 'freeze_hook_activated']) {
    assert.ok(!txt.includes(banned),
              `bundle must NOT contain ds-integration symbol "${banned}"`);
  }
});

// ── AC-R82-5: engine/topology-overlay.ts has no top-level node:crypto import ──
test('AC-R82-5: engine/topology-overlay.ts removed top-level node:crypto static import', () => {
  const txt = fs.readFileSync(TOPOLOGY_OVERLAY_PATH, 'utf8');
  // Discriminating: forbid static `import ... from 'node:crypto'` at line-start
  assert.ok(!/^\s*import\s+.*\s+from\s+['"]node:crypto['"]\s*;?\s*$/m.test(txt),
            'static `import { ... } from "node:crypto";` must be removed');
  // `createHash` symbol must not appear (only consumer was the removed import)
  assert.equal((txt.match(/createHash/g) || []).length, 0,
               'createHash symbol must not appear in topology-overlay.ts');
});

// ── AC-R82-6: computeSnapshotHash sync surface preserved (Node path) ──
test('AC-R82-6: computeSnapshotHash returns a 64-char hex sync', () => {
  const snap = {
    nodes: [{ id: 'a' }, { id: 'b' }],
    edges: [{ from: 'a', to: 'b', relationship: 'contains' }],
    fetched_at_ts: 0, source_id: 's', source_version: 'v',
  };
  const h = computeSnapshotHash(snap as any);
  assert.equal(typeof h, 'string', 'must return string synchronously');
  assert.ok(/^[0-9a-f]{64}$/.test(h), `expected 64-char lowercase hex; got "${h}"`);
});

// ── AC-R82-7: pureJsSha256 byte-identity with node:crypto for ≥3 vectors ──
test('AC-R82-7: pureJsSha256 matches node:crypto for FIPS test vectors', () => {
  const vectors = [
    { input: '',
      expected: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855' },
    { input: 'abc',
      expected: 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad' },
    { input: 'abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq',
      expected: '248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1' },
  ];
  for (const v of vectors) {
    const nodeHash = createHash('sha256').update(v.input).digest('hex');
    const pureHash = pureJsSha256(v.input);
    assert.equal(nodeHash, v.expected, `node:crypto baseline broken for "${v.input}"`);
    assert.equal(pureHash, v.expected,
                 `pureJsSha256 disagrees with FIPS baseline for "${v.input}"`);
    assert.equal(nodeHash, pureHash,
                 `pureJsSha256 / node:crypto divergence for "${v.input}"`);
  }
});

// ── AC-R82-8: bundle excludes node-internal module bodies ──
test('AC-R82-8: bundle did not inline node:* module bodies', () => {
  const txt = fs.readFileSync(BUNDLE_PATH, 'utf8');
  // If externalization fails, esbuild would inline shim/stub bodies. The bundle
  // should reference node:* modules only via `import` or `require` statements
  // (which fail at browser runtime and are caught by topology-overlay's adapter).
  // Heuristic: forbid known node-internal symbols that would only appear in
  // inlined polyfills.
  for (const banned of ['__webpack_require__', 'crypto-browserify', 'inherits_browser']) {
    assert.ok(!txt.includes(banned),
              `bundle leaked polyfill marker "${banned}"`);
  }
});

// ── AC-R82-9: demo.html has <script type="module"> bundle smoke block ──
test('AC-R82-9: demos/demo.html has R82 smoke <script type="module">', () => {
  const html = fs.readFileSync(DEMO_HTML_PATH, 'utf8');
  // Required substrings (verbatim per spec § 2.3):
  for (const needle of [
    '<script type="module">',
    './engine-bundle.mjs',
    'computeSnapshotHash',
    'R82 smoke',
    '__tessera_r82_smoke__',
  ]) {
    assert.ok(html.includes(needle),
              `demos/demo.html must contain "${needle}"`);
  }
});

// ── AC-R82-10: .gitignore lists demos/engine-bundle.mjs ──
test('AC-R82-10: .gitignore lists demos/engine-bundle.mjs', () => {
  const gi = fs.readFileSync(GITIGNORE_PATH, 'utf8');
  assert.match(gi, /^demos\/engine-bundle\.mjs$/m,
               '.gitignore must list demos/engine-bundle.mjs');
});

// ── AC-R82-11: build:browser script is idempotent (re-runs produce same artifact) ──
test('AC-R82-11: pnpm build:browser is invokable and idempotent', () => {
  // Run the build twice; verify the artifact size is stable.
  // Skip if the project's pnpm/node env can't shell out (CI tier check).
  try {
    execSync('pnpm exec node tools/build-browser-bundle.js',
             { cwd: REPO_ROOT, stdio: 'pipe' });
    const sz1 = fs.statSync(BUNDLE_PATH).size;
    execSync('pnpm exec node tools/build-browser-bundle.js',
             { cwd: REPO_ROOT, stdio: 'pipe' });
    const sz2 = fs.statSync(BUNDLE_PATH).size;
    assert.equal(sz1, sz2, `bundle size drift on re-run: ${sz1} → ${sz2}`);
  } catch (err) {
    // If execSync fails (build tool not yet compiled OR esbuild missing) this AC
    // FAILs — which is the correct signal at chore-A (Implementer must have run
    // pnpm install + build:browser successfully before chore-A).
    assert.fail(`build:browser invocation failed: ${(err as Error).message}`);
  }
});

// ── AC-R82-12: typecheck clean (sentinel; binding command bound by EMPIRICAL.sh Block 1) ──
test('AC-R82-12: typecheck sentinel (binding command: EMPIRICAL.sh Block 1)', () => {
  // This AC is structurally implicit — pnpm exec tsc -p tsconfig.test.json must exit 0
  // at chore-A or this test file would not have compiled. The .js sibling existing
  // is sufficient proof.
  const jsPath = path.join(REPO_ROOT,
    'test/q82-engine-browser-bundle.test.js');
  assert.ok(fs.existsSync(jsPath), 'q82 test must compile to .js (proves tsc passed)');
});

// ── AC-R82-13: EMPIRICAL.sh block-presence sentinel ──
test('AC-R82-13: Q-R82-EMPIRICAL.sh has Block 1/2/3/4/5 markers', () => {
  const sh = fs.readFileSync(
    path.join(REPO_ROOT, 'coordination/specs/Q-R82-EMPIRICAL.sh'), 'utf8');
  for (const block of [
    '── Block 1: typecheck',
    '── Block 2: bundle artifact',
    '── Block 3: SHA-256 byte-identity',
    '── Block 4: test counts',
    '── Block 5: anti-scope diff',
  ]) {
    assert.ok(sh.includes(block),
              `EMPIRICAL.sh must contain marker "${block}"`);
  }
});

// ── AC-R82-14: anti-scope diff ⊆ ALLOWED_SET ──
test('AC-R82-14: git diff round-start..HEAD ⊆ ALLOWED_SET', () => {
  const allowed = new RegExp(
    `^(tools/build-browser-bundle\\.ts|engine/topology-overlay\\.ts|`
    + `demos/demo\\.html|demos/engine-bundle\\.mjs|`
    + `package\\.json|pnpm-lock\\.yaml|\\.gitignore|`
    + `test/q82-engine-browser-bundle\\.test\\.ts|`
    + `coordination/specs/Q-R82-SPEC\\.md|`
    + `coordination/specs/Q-R82-SPEC-AUDIT\\.md|`
    + `coordination/specs/Q-R82-EMPIRICAL\\.sh|`
    + `coordination/NEXT-ROLE\\.md|coordination/MEMORIAL\\.md|`
    + `coordination/MEMORIAL-PHASE-[0-9]+\\.md|`
    + `coordination/reviews/REVIEWER-REPORT-R82\\.md|`
    + `coordination/logs/ROUND-R[0-9]+-(SUMMARY|ROUTING)\\.md|`
    + `coordination/diagnostics/DIAGNOSTIC-R[0-9]+-.*\\.md|`
    + `CLAUDE\\.md|CLAUDE-ARCHITECT\\.md|CLAUDE-IMPLEMENTER\\.md|`
    + `CLAUDE-REVIEWER\\.md|CLAUDE-MEMORIAL\\.md|`
    + `CLAUDE-COMMON\\.md|CLAUDE-COORDINATOR\\.md)$`);
  const files = execSync(`git diff ${ROUND_START_SHA} HEAD --name-only`,
                         { cwd: REPO_ROOT, encoding: 'utf8' })
                .split('\n').filter(Boolean);
  const violators = files.filter((f) => !allowed.test(f));
  assert.deepEqual(violators, [],
                   `R82 anti-scope diff includes unauthorized paths: ${violators.join(', ')}`);
});
```

### 4.7 `Q-R82-EMPIRICAL.sh` pseudocode (verbatim block structure; Implementer must not refactor control flow per R73 MAJOR-2)

5 blocks. Block 4 uses `--test-reporter=tap` per R77 lesson. No `local` keywords (R75 lesson). `EXPECTED_FAIL` is a strict-equality literal (R79 MAJOR-1 lesson). Script written by Architect; Implementer does not modify control-flow shape.

```bash
#!/usr/bin/env bash
# Q-R82-EMPIRICAL.sh — binding-command harness for R82.
set -uo pipefail
ROUND_START_SHA="5c3e0d9"
EXIT=0
echo "── Q-R82-EMPIRICAL.sh @ HEAD=$(git rev-parse --short HEAD)"
echo ""

# ── Block 1: typecheck ──
echo "── Block 1: typecheck"
pnpm exec tsc -p tsconfig.test.json > /tmp/r82-block1.txt 2>&1
TSC_EXIT=$?
if [ "$TSC_EXIT" -ne 0 ]; then
  echo "Block 1 FAIL: tsc exit $TSC_EXIT (expected 0)"
  tail -10 /tmp/r82-block1.txt
  EXIT=1
else
  echo "Block 1 PASS: tsc exit 0"
fi
echo ""

# ── Block 2: bundle artifact existence + size ──
echo "── Block 2: bundle artifact"
if [ ! -f demos/engine-bundle.mjs ]; then
  echo "Block 2 FAIL: demos/engine-bundle.mjs missing"
  EXIT=1
else
  BUNDLE_SIZE=$(wc -c < demos/engine-bundle.mjs | tr -d ' ')
  if [ "$BUNDLE_SIZE" -lt 5000 ]; then
    echo "Block 2 FAIL: bundle size $BUNDLE_SIZE < 5000"
    EXIT=1
  else
    echo "Block 2 PASS: demos/engine-bundle.mjs present ($BUNDLE_SIZE bytes)"
  fi
fi
echo ""

# ── Block 3: SHA-256 byte-identity Node-vs-pure-JS ──
echo "── Block 3: SHA-256 byte-identity"
node -e "
  const { createHash } = require('node:crypto');
  const { pureJsSha256 } = require('./engine/topology-overlay.js');
  const vectors = ['', 'abc', 'abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq'];
  let ok = true;
  for (const v of vectors) {
    const n = createHash('sha256').update(v).digest('hex');
    const p = pureJsSha256(v);
    if (n !== p) { console.error('MISMATCH for', JSON.stringify(v), n, '!=', p); ok = false; }
  }
  process.exit(ok ? 0 : 1);
" > /tmp/r82-block3.txt 2>&1
B3_EXIT=$?
if [ "$B3_EXIT" -ne 0 ]; then
  echo "Block 3 FAIL: SHA-256 parity broken"
  cat /tmp/r82-block3.txt
  EXIT=1
else
  echo "Block 3 PASS: pureJsSha256 byte-identical to node:crypto on 3 FIPS vectors"
fi
echo ""

# ── Block 4: test pass/fail counts (R77 lesson: --test-reporter=tap) ──
echo "── Block 4: test counts"
pnpm exec node --test --test-reporter=tap test/*.test.js > /tmp/r82-block4.txt 2>&1
TEST_PASS=$(grep -E "^# pass " /tmp/r82-block4.txt | head -1 | awk '{print $3}')
TEST_FAIL=$(grep -E "^# fail " /tmp/r82-block4.txt | head -1 | awk '{print $3}')
TEST_TESTS=$(grep -E "^# tests " /tmp/r82-block4.txt | head -1 | awk '{print $3}')
TEST_SKIPPED=$(grep -E "^# skipped " /tmp/r82-block4.txt | head -1 | awk '{print $3}')
# Predicted at chore-A (Architect § 1.4): pass band [620, 625]; fail strict-equality 12.
EXPECTED_PASS_MIN=620
EXPECTED_PASS_MAX=625
EXPECTED_FAIL=12
if [ -z "$TEST_FAIL" ] || [ "$TEST_FAIL" != "$EXPECTED_FAIL" ]; then
  echo "Block 4 FAIL: fail count = '${TEST_FAIL:-<empty>}'; expected $EXPECTED_FAIL"
  echo "  TAP tail:"
  tail -20 /tmp/r82-block4.txt
  EXIT=1
elif [ -z "$TEST_PASS" ] || [ "$TEST_PASS" -lt "$EXPECTED_PASS_MIN" ] || [ "$TEST_PASS" -gt "$EXPECTED_PASS_MAX" ]; then
  echo "Block 4 FAIL: pass count = '${TEST_PASS:-<empty>}'; expected in [$EXPECTED_PASS_MIN, $EXPECTED_PASS_MAX]"
  tail -20 /tmp/r82-block4.txt
  EXIT=1
else
  echo "Block 4 PASS: tests=$TEST_TESTS pass=$TEST_PASS fail=$TEST_FAIL skipped=$TEST_SKIPPED"
fi
echo ""

# ── Block 5: anti-scope diff ⊆ ALLOWED_SET (AC-R82-14) ──
echo "── Block 5: anti-scope diff"
DIFF_FILES=$(git diff "$ROUND_START_SHA" HEAD --name-only)
ALLOWED='^(tools/build-browser-bundle\.ts|tools/build-canned-demos\.ts|engine/topology-overlay\.ts|demos/demo\.html|demos/engine-bundle\.mjs|package\.json|pnpm-lock\.yaml|\.gitignore|test/q82-engine-browser-bundle\.test\.ts|test/q01-no-at-pin-deltas\.test\.ts|coordination/specs/Q-R82-SPEC\.md|coordination/specs/Q-R82-SPEC-AUDIT\.md|coordination/specs/Q-R82-EMPIRICAL\.sh|coordination/NEXT-ROLE\.md|coordination/MEMORIAL\.md|coordination/MEMORIAL-PHASE-[0-9]+\.md|coordination/VENDORING-MANIFEST\.md|coordination/reviews/REVIEWER-REPORT-R82\.md|coordination/logs/ROUND-R[0-9]+-(SUMMARY|ROUTING)\.md|coordination/diagnostics/DIAGNOSTIC-R[0-9]+-.*\.md|CLAUDE\.md|CLAUDE-ARCHITECT\.md|CLAUDE-IMPLEMENTER\.md|CLAUDE-REVIEWER\.md|CLAUDE-MEMORIAL\.md|CLAUDE-COMMON\.md|CLAUDE-COORDINATOR\.md)$'
UNAUTHORIZED=$(echo "$DIFF_FILES" | grep -vE "$ALLOWED" || true)
UNAUTHORIZED=$(echo "$UNAUTHORIZED" | sed '/^[[:space:]]*$/d')
if [ -n "$UNAUTHORIZED" ]; then
  echo "Block 5 FAIL: unauthorized paths in diff:"
  echo "$UNAUTHORIZED"
  EXIT=1
else
  TOTAL_DIFF_COUNT=$(echo "$DIFF_FILES" | sed '/^[[:space:]]*$/d' | wc -l | tr -d ' ')
  echo "Block 5 PASS: $TOTAL_DIFF_COUNT files in diff, all within ALLOWED_SET"
fi
echo ""

# ── Summary ──
if [ "$EXIT" -eq 0 ]; then
  echo "── Q-R82-EMPIRICAL.sh: ALL BLOCKS PASS"
else
  echo "── Q-R82-EMPIRICAL.sh: AT LEAST ONE BLOCK FAILED (exit $EXIT)"
fi
exit "$EXIT"
```

---

## § 5. Acceptance criteria

### 5.1 AC table (14 ACs)

| ID | Given / When / Then | Verification |
|---|---|---|
| AC-R82-1 | Given the R82 deliverable set, when `tools/build-browser-bundle.ts` is read, then the file exists and references `esbuild` + targets `demos/engine-bundle.mjs`. | `test/q82-engine-browser-bundle.test.ts` AC-R82-1 |
| AC-R82-2 | Given `package.json` at HEAD, when `scripts.build:browser` + `devDependencies.esbuild` are read, then both are strings; `scripts.build:browser` invokes `tools/build-browser-bundle.js`. | AC-R82-2 |
| AC-R82-3 | Given a successful `pnpm build:browser` invocation, when `demos/engine-bundle.mjs` is read, then the file exists with byte size ≥ 5000. | AC-R82-3 |
| AC-R82-4 | Given `demos/engine-bundle.mjs` at HEAD, when the bundle file's text is grepped, then the strings `computeSnapshotHash`, `pureJsSha256`, `StaticTopologySource`, `TopologyEnricher` each appear ≥ 1 time AND the strings `DsEventConsumer`, `createDsFeed`, `freeze_hook_activated` appear 0 times. | AC-R82-4 |
| AC-R82-5 | Given `engine/topology-overlay.ts` at HEAD, when the file is grepped, then no line-anchored static `import` of `node:crypto` is present AND `createHash` appears 0 times. | AC-R82-5 |
| AC-R82-6 | Given a fixed snapshot object passed to `computeSnapshotHash`, when called synchronously in Node, then a 64-char lowercase hex string is returned (sync surface preserved). | AC-R82-6 |
| AC-R82-7 | Given the three FIPS 180-2 SHA-256 test vectors (empty, "abc", multi-block), when `pureJsSha256` and `node:crypto`'s `createHash('sha256')` are exercised against each, then both return identical hex strings equal to the FIPS expected values. | AC-R82-7 |
| AC-R82-8 | Given `demos/engine-bundle.mjs` at HEAD, when the bundle is grepped, then no node-internal polyfill markers (`__webpack_require__`, `crypto-browserify`, `inherits_browser`) appear. | AC-R82-8 |
| AC-R82-9 | Given `demos/demo.html` at HEAD, when the HTML is grepped, then the substrings `<script type="module">`, `./engine-bundle.mjs`, `computeSnapshotHash`, `R82 smoke`, `__tessera_r82_smoke__` each appear ≥ 1 time. | AC-R82-9 |
| AC-R82-10 | Given `.gitignore` at HEAD, when grepped at line-anchor, then the literal line `demos/engine-bundle.mjs` appears. | AC-R82-10 |
| AC-R82-11 | Given the `build:browser` script + `tools/build-browser-bundle.js` compiled artifact at HEAD, when `pnpm exec node tools/build-browser-bundle.js` is invoked twice, then both invocations succeed AND produce identical bundle byte sizes (idempotent). | AC-R82-11 |
| AC-R82-12 | Given the R82 deliverable set at chore-A, when `pnpm exec tsc -p tsconfig.test.json` runs, then exit code is 0 (sentinel: the q82 test file compiled to .js). | AC-R82-12 |
| AC-R82-13 | Given `coordination/specs/Q-R82-EMPIRICAL.sh` at HEAD, when grepped, then all five block markers (Block 1/2/3/4/5) appear ≥ 1 time. | AC-R82-13 |
| AC-R82-14 | Given the chore-A diff against round-start `5c3e0d9`, when `git diff 5c3e0d9 HEAD --name-only` is compared to the § 3.2 ALLOWED_SET regex, then every path in the diff matches the regex (zero unauthorized paths). | AC-R82-14 |

### 5.2 Implicit AC — Implementer chore-A binding-command attestation (Rule 1: empirical-command-attestation)

The Implementer routing block at chore-A MUST attest the OBSERVED outputs of these binding commands, recorded verbatim (per cross-project Rule 1 / canonical landing R26+R72+R77+R79):

| Binding command | Architect pre-prediction |
|---|---|
| `pnpm exec tsc -p tsconfig.test.json` exit | 0 |
| `pnpm exec node --test --test-reporter=tap test/*.test.js` process exit | 1 (some subtest fails) |
| TAP `# tests` | 638 ± 3 |
| TAP `# pass` | in band [620, 625] |
| TAP `# fail` | strict-equality 12 |
| TAP `# skipped` | 4 |
| `bash coordination/specs/Q-R82-EMPIRICAL.sh` exit | 0 (ALL BLOCKS PASS) |
| `git diff 5c3e0d9 HEAD --name-only` line count | 13 - 16 |
| `demos/engine-bundle.mjs` byte size (Block 2 output) | 35,000 - 80,000 |

If any observed value falls outside the prediction band, the Implementer HALTS + writes `coordination/diagnostics/DIAGNOSTIC-R82-<topic>.md` + sets STATUS: ESCALATE in NEXT-ROLE.md. Per R79 MAJOR-1 lesson: do NOT silently amend EMPIRICAL.sh `EXPECTED_FAIL` to absorb the gap.

### 5.3 Acknowledged AC gaps + mitigations (per R74 MINOR-2 reinforcement)

| # | Gap | Mitigation |
|---|---|---|
| 1 | AC-R82-9 verifies the literal presence of the `<script type="module">` block in `demos/demo.html` but does NOT exercise its browser runtime behavior. The smoke-test's `window.__tessera_r82_smoke__.loaded === true` assertion is not Node-side testable. | Reviewer manual check: open `demos/demo.html` in a browser (Safari/Chrome/Firefox), open devtools console, verify (a) console contains a log line prefixed `R82 smoke:` with a 64-char hex hash; (b) `window.__tessera_r82_smoke__` evaluates to `{ loaded: true, hash: '<64-char hex>' }` in the console; (c) the existing dashboard IIFE still works (selecting a scenario from the dropdown renders chart + verdict). |
| 2 | AC-R82-11 invokes the build script at test time, but if `esbuild` is not installed (e.g., Reviewer environment), the test will FAIL — not because of an R82 deliverable defect but because of an env issue. | Reviewer verifies via empirical re-run: `pnpm install` (refreshes lockfile) → `pnpm exec node tools/build-browser-bundle.js` → expect zero exit + bundle present. If `esbuild` missing post-install, that IS a real defect (package.json not updated correctly) and AC-R82-2 / AC-R82-11 correctly catch it. |
| 3 | AC-R82-4 only checks for the LITERAL SYMBOL NAMES in the bundle's text. esbuild may rename internal symbols during bundling; the four required symbol names are publicly exported (in the ENTRY_SOURCE re-export list § 2.2) so they SHOULD survive verbatim, but if esbuild's tree-shaking + identifier renaming somehow elides them, the AC fails. | Reviewer additionally verifies via dynamic import in Node: `const m = await import('./demos/engine-bundle.mjs'); assert(typeof m.computeSnapshotHash === 'function')`. If the dynamic import works, the symbol survives. Out-of-band-of-test verification, acknowledged. |
| 4 | The pure-JS SHA-256 implementation is exercised against ONLY 3 FIPS test vectors (AC-R82-7). A bug that corrupts only ≥1-MB inputs would not be caught. | Acceptable scope at R82: snapshot canonicalization produces input strings typically ≤ 10 KB (TopologyNode + TopologyEdge JSON, sorted). The R82 smoke test exercises one such snapshot in the browser. Extended fuzz testing is out of R82 scope. |
| 5 | AC-R82-14 (anti-scope diff) regex includes `demos/engine-bundle.mjs` even though `.gitignore` excludes it from tracking. The regex entry is defensive (a future un-ignore would already be authorized). The bundle file does not appear in `git diff` at chore-A because it is gitignored. | Verified at spec-emit by Architect: `git ls-files demos/engine-bundle.mjs` returns empty (gitignored). Block 5 regex includes the path for forward-protection only; no current-round impact. |
| 6 | The 14-AC band predicts `# tests = 638 ± 3`. The exact count depends on how the Implementer structures sub-`test()` blocks inside one AC (e.g., AC-R82-7 contains 3 vectors → 3 sub-asserts or 3 sub-tests). If the Implementer chooses a different structure, the `# tests` count may drift outside the band. | The strict-equality binding is `# fail = 12` (R79 lesson); `# tests` is a band, not strict. If Implementer's structure produces `# tests` outside [635, 641], that is acceptable provided `# fail = 12` and `# pass` in [620, 625] hold. Block 4 does not assert on `# tests`. |

---

## § 6. Anti-scope + halt conditions

### 6.1 Halt conditions (extends the directive's 8 conditions)

The Implementer MUST HALT (write DIAGNOSTIC + set STATUS: ESCALATE in NEXT-ROLE.md) on any of the following:

1. `bash coordination/specs/Q-R82-EMPIRICAL.sh` exits non-zero at chore-A for any reason OTHER than the pre-documented chore-A test-count flip (carry-forward 11 + R81 forward-protection flip = 12 strict).
2. `pnpm exec tsc -p tsconfig.test.json` exit code ≠ 0 at chore-A.
3. TAP `# fail` ≠ 12 OR `# pass` outside `[620, 625]` at chore-A (R79 MAJOR-1 lesson — do NOT silently amend the EMPIRICAL.sh expected values).
4. R61-class architectural-reality discovery: any case where the prescribed lazy `require('node:crypto')` pattern does NOT work as designed in either Node or browser (e.g., esbuild silently inlines `node:crypto` despite external marker; the browser cannot catch the ReferenceError; the pure-JS fallback diverges from FIPS vectors).
5. New external dependency required beyond `esbuild` (e.g., a transitive sha256 implementation; a polyfill; a TypeScript-bundler-helper). Per directive halt condition #7.
6. Engine surface modification needed beyond `engine/topology-overlay.ts` (e.g., a detector file's import shape must change for the bundler). Per directive halt condition #8.
7. `demos/scenarios/*.json` content modification needed (forbidden per R71/R79/R80/R81 frozen content).
8. esbuild's bundle output is structurally non-loadable in a browser (e.g., emits CommonJS by mistake; emits non-ESM exports). The smoke-test mechanism in `demos/demo.html` would fail at browser load; this is detectable by AC-R82-11's dynamic-import variant in the Node test.
9. The lazy `require('node:crypto')` adapter in `topology-overlay.ts` causes Node tests to regress (e.g., a prior test that relied on synchronous static-imported `createHash` semantics fails post-R82). Verified by Block 4: any UNEXPECTED `# fail` increase ≥ 12 triggers HALT.
10. `.gitignore` `demos/engine-bundle.mjs` line collides with an existing same-line entry (R81 MAJOR-3 lesson — pre-check at Architect time confirmed absent; Implementer re-verifies before append).
11. Any cross-project discipline (Rules 1-7) is violated.

### 6.2 ALLOWED_SET (narrative; machine-checkable regex at § 3.2)

| Path | Authorization |
|---|---|
| `tools/build-browser-bundle.ts` | NEW (Approach A) |
| `engine/topology-overlay.ts` | MODIFIED (Web Crypto adapter; directive-authorized) |
| `demos/demo.html` | MODIFIED (smoke-test block append) |
| `demos/engine-bundle.mjs` | NEW (gitignored build output; appears in `.gitignore` not in `git diff`) |
| `package.json` | MODIFIED (esbuild + scripts) |
| `pnpm-lock.yaml` | MODIFIED (lockfile refresh) |
| `.gitignore` | MODIFIED (1 new line) |
| `test/q82-engine-browser-bundle.test.ts` | NEW (R82 ACs) |
| Spec triad (3 files) | NEW (this commit) |
| `coordination/NEXT-ROLE.md` + `MEMORIAL.md` + `MEMORIAL-PHASE-*.md` | MODIFIED (coordination) |
| `coordination/reviews/REVIEWER-REPORT-R82.md` | NEW (Reviewer phase) |
| `coordination/logs/ROUND-R[0-9]+-(SUMMARY|ROUTING).md` | NEW (forward-protective; any round can route through this surface) |
| `coordination/diagnostics/DIAGNOSTIC-R[0-9]+-*.md` | NEW IF any HALT fires (forward-protective) |
| `CLAUDE-*.md` family | MODIFIED IF Memorial-Updater appends reinforcements |

---

## § 7. Open questions

**OQ-R82-1 (STATUS: ESCALATE; operator picks before chore-A):** New external `devDependency` addition requires operator authorization per directive anti-scope. Bounded options:

- **Option A (Architect-recommended): `esbuild`.** Per § 0 brainstorm Approach A. Pin to `^0.24.0`. Single binary (~10 MB install). Operator's directive language already names "esbuild OR equivalent" — interpreting as soft pre-authorization, but operator confirms.
  - Consequence: spec proceeds as written. Implementer adds `esbuild` to devDeps + script + runs `pnpm install`. Chore-A proceeds.
  - Brainstorm re-evaluation note (if operator picks A): no rejected-approach concerns; the brainstorm explicitly rejected Approaches B and C for substantive reasons; Approach A is the recommended pick with no documented weaknesses beyond the dep-addition cost itself.
- **Option B: Hand-rolled walker (no new dep).** Per § 0 brainstorm Approach B. Implementer writes a ~200-line transitive-import walker.
  - Consequence: spec § 2.2 (esbuild invocation) AND § 4.2 (build-browser-bundle.ts pseudocode) MUST be re-authored before chore-A. New spec round (R82-amended). Lose at least 1 round-cycle of Architect time; the walker is brittle so future R83/R84 are at higher risk of bug carry-forward.
  - Brainstorm re-evaluation note (if operator picks B): § 0 rejected B on brittleness grounds. Per CLAUDE-ARCHITECT.md § Fix-cycle considerations: this would constitute selecting a documented-rejected approach. The Architect would re-author the spec with an explicit "Brainstorm re-evaluation" subsection acknowledging the brittleness trade-off + naming the compensating control (Reviewer + ongoing maintenance).
- **Option C: Defer R82.** If operator opts neither A nor B, R82 scope cannot be delivered. R82 is descoped; SLICE 3 directive amended.
  - Consequence: SLICE 3's foundation round is delayed. R83/R84 cannot proceed (they depend on the bundle).

**OQ-R82-2 (RESOLVED at Architect time; no operator action needed):** `_q72-trace.ts` bundle inclusion. Resolved per § 1.2 Option (i): include in bundle with `node:fs` marked external. The lazy `require('node:fs')` is gated by `q72TraceEnabled()` returning `false` in the browser (no `process.env.Q72_TRACE`). No browser-side effect.

---

## § 8. P3 ten-axis verification

| Axis | Verification |
|---|---|
| **correctness** | Web Crypto adapter (§ 2.1) returns identical hex output across Node and browser; AC-R82-7 binds against 3 FIPS test vectors; mutation: any algorithmic divergence in `pureJsSha256` produces hex divergence at AC. |
| **completeness** | All 14 ACs together cover: build tool existence (AC-1) + package script (AC-2) + bundle output (AC-3, AC-4, AC-8) + adapter sync surface (AC-5, AC-6) + cross-platform parity (AC-7) + browser smoke wiring (AC-9, AC-10) + idempotency (AC-11) + typecheck (AC-12) + harness presence (AC-13) + anti-scope (AC-14). No identifiable spec property lacks AC coverage. |
| **consistency** | spec § 2.1 verbatim mechanism / § 4.1 per-file pseudocode / § 5 AC names use identical symbol names (`computeSnapshotHash`, `pureJsSha256`, `_sha256Hex`); paths reference identical files (`engine/topology-overlay.ts`, `demos/engine-bundle.mjs`). EMPIRICAL.sh's ALLOWED_SET regex (§ 4.7 Block 5) byte-matches § 3.2 verbatim. |
| **clarity** | No ambiguous language. Every prescription is verbatim or named-mechanism. Tactical autonomy is explicit (§ 4.2: variable names; esbuild option tweaks). Halt conditions enumerate explicit triggers. |
| **coverage** | 14 ACs + binding-command attestation + anti-scope diff. Coverage of: directive deliverables 1-6 mapped 1:1 to ACs (build tool → AC-1/2/3; adapter → AC-5/6/7; HTML extension → AC-9; test → AC-11/12/13). |
| **constraints** | All deliverables fit inside the directive's ALLOWED list (§ 3.1 component inventory cross-checked). |
| **concurrency** | Bundle build is single-process; no concurrent execution concerns. Adapter `_sha256Hex` is stateless (no shared mutable state). |
| **corner cases** | Empty-input SHA-256 (AC-R82-7 vector 1); multi-block input crossing the 56-byte FIPS padding boundary (vector 3); empty bundle (Block 2 size guard); polyfill leak (AC-R82-8). |
| **cost** | Bundle build ≤ 5 seconds (esbuild typical); test suite adds 14 `test()` blocks; AC-R82-11 invokes the build twice (~10 sec test overhead). Total chore-A overhead: < 30 seconds. |
| **coupling** | Adapter is internal to `topology-overlay.ts` (export `pureJsSha256` is test-only). No new coupling between engine modules. Bundle output is build-time-only; no runtime engine dependency on the bundle. |

---

## § 9. Pre-emit grilling (Superpowers Phase 3)

### § 9.1 Every claim verifiable?

| Claim | Verification |
|---|---|
| "7 callers of `computeSnapshotHash` in `engine/`" (§ 0) | Verified at spec-emit by Architect: `grep -rn "computeSnapshotHash" engine/*.ts engine/**/*.ts` → 7 callers (5 topology-source.ts files + common-mode-attribution.ts + hardware-topology-source.ts). |
| "node:crypto is the only top-level Node API used in `topology-overlay.ts`" | Verified: `grep -n "from 'node:" engine/topology-overlay.ts` → 1 line (line 30). |
| "browser-safe subset enumerated in § 1.2 has no other node: imports" | Verified: grep on the listed files returns only the 3 known offenders (`topology-overlay.ts:30`, `_q72-trace.ts:69` lazy, `ds-integration/*` excluded). |
| "FIPS 180-2 test vectors hex literals" (§ 2.6 / AC-R82-7) | Verified at spec-emit time via Node REPL: `require('node:crypto').createHash('sha256').update('abc').digest('hex')` → `ba7816bf...`. (Cross-verified against published FIPS 180-2 examples.) |
| "R81 AC-R81-14 doesn't include R82 paths" (§ 1.4) | Verified at spec-emit: grep R82 paths in `test/q81-slice-2-close.test.ts:69-74` ALLOWED regex → none. |
| "No `## R82` or `demos/engine-bundle` markers in current .gitignore" (§ 2.4) | Verified: `grep -n "engine-bundle\|demos/engine" .gitignore` → no match. |

### § 9.2 Unstated assumptions

| Assumption | Status |
|---|---|
| Operator will pick Option A in OQ-R82-1 ESCALATE response. | **Explicit ESCALATE** at routing time. Spec proceeds under Option A; Options B/C documented as fallbacks. |
| esbuild's TypeScript handling produces ES2022-compatible output. | Documented in § 0 brainstorm; esbuild's TS support is mature (since v0.5). |
| Browser environments (Safari/Chrome/Firefox) all support `<script type="module">` + dynamic `import()`. | Yes; ES module support has been universal since 2018. |
| `require` is undefined in browser-bundle context, triggering ReferenceError caught by try/catch. | Verified algorithmically; esbuild's ESM output does not inject a `require` shim. |
| The test file `test/q82-*.test.ts` will compile to `.js` (AC-R82-12 sentinel). | True provided tsc has no errors; chore-A pretest invokes tsc. |
| `pnpm exec node tools/build-browser-bundle.js` invocation pattern matches existing `build:demos` convention. | Verified at spec-emit: `cat package.json | grep build:demos` → `"build:demos": "node tools/build-canned-demos.js"`. Same pattern. |
| The Node `node:crypto` API surface (`createHash('sha256').update().digest('hex')`) is stable. | Yes (Node ≥ 10; project requires Node ≥ 20 per package.json). |

### § 9.3 Scope creep audit

R82 directive's primary deliverable list:
1. `tools/build-browser-bundle.ts` (NEW) ← spec § 1.1 / § 2.2 / § 4.2 ✓
2. Web Crypto adapter in `engine/topology-overlay.ts` ← spec § 2.1 / § 4.1 ✓
3. `package.json` scripts addition ← spec § 2.5 / § 4.5 ✓
4. `demos/demo.html` smoke extension ← spec § 2.3 / § 4.3 ✓
5. `test/q82-engine-browser-bundle.test.ts` ← spec § 4.6 ✓
6. `Q-R82-EMPIRICAL.sh` ← spec § 4.7 ✓

Additional scope inside spec:
- `.gitignore` modification — necessary because `demos/engine-bundle.mjs` is a build artifact; not creep, but a side-effect of deliverable 4 not enumerated in directive. **Acknowledged + documented in § 3.1 + § 4.4.**
- Forward-protective ROUND-summary + DIAGNOSTIC paths in ALLOWED_SET — directive structurally expects these from prior-round precedent; not creep.

No scope added beyond what the directive prescribes. The `.gitignore` modification is the only non-directive-listed file; it is mechanically required by deliverable 4.

### § 9.4 Implementer can act without guessing?

| Decision | Specified? |
|---|---|
| Bundler choice | Yes (§ 0, Option A) |
| Bundle output path | Yes (`demos/engine-bundle.mjs`; § 2.2) |
| Web Crypto adapter algorithm | Yes (§ 2.1 verbatim mechanism + FIPS 180-4 reference) |
| Pure-JS SHA-256 reference | Yes (standard textbook algorithm; FIPS 180-4) |
| Public export of `pureJsSha256` from topology-overlay.ts | Yes (§ 2.1; required by AC-R82-7) |
| HTML smoke-block placement | Yes (§ 2.3 + § 4.3: before existing `</body>` tag) |
| `.gitignore` insertion position | Yes (§ 4.4: before "# Anchor Mode 2 pipeline artifacts" block) |
| esbuild option values (format, target, external) | Yes (§ 2.2 verbatim) |
| Smoke-test side-channel signal (`window.__tessera_r82_smoke__`) | Yes (§ 2.3) |
| FIPS test vectors | Yes (§ 2.6 + § 4.6 AC-R82-7 — 3 specific vectors with expected hex) |
| AC chore-A pass/fail/skipped count predictions | Yes (§ 1.4 + § 5.2) |
| EMPIRICAL.sh strict equalities | Yes (§ 4.7) |

### § 9.5 Cross-section consistency walk

Identifier classes checked across §§ 0/1/2/3/4/5:

| Identifier | Consistent? |
|---|---|
| `computeSnapshotHash` | ✓ (§ 2.1 / § 4.1 / § 4.6 AC-R82-4/-6) |
| `pureJsSha256` | ✓ (§ 2.1 / § 4.1 / § 4.6 AC-R82-4/-7) |
| `_sha256Hex` | ✓ (§ 2.1 / § 4.1 internal helper) |
| `demos/engine-bundle.mjs` (path) | ✓ (§ 0 / § 1.1 / § 2.2 / § 2.4 / § 3.1 / § 3.2 / § 4.4 / § 4.6 / § 4.7 / § 5 / § 6) |
| `tools/build-browser-bundle.ts` (path) | ✓ (§ 0 / § 1.1 / § 2.2 / § 3.1 / § 3.2 / § 4.2 / § 4.6 / § 4.7) |
| `5c3e0d9` (round-start SHA) | ✓ (header / § 3.2 ALLOWED regex / § 4.6 ROUND_START_SHA / § 4.7 ROUND_START_SHA / § 5.2 attestation) |
| `12` (EXPECTED_FAIL) | ✓ (§ 1.4 / § 4.7 / § 5.2 / § 6.1) |
| `5000` (bundle min size) | ✓ (§ 2.7 / § 4.6 AC-R82-3 / § 4.7 Block 2) |
| `R82 smoke` (literal log prefix) | ✓ (§ 2.3 / § 4.6 AC-R82-9) |
| `__tessera_r82_smoke__` (window side-channel) | ✓ (§ 2.3 / § 4.6 AC-R82-9 / § 5.3 gap 1) |

### § 9.6 Self-application gate (R74 MINOR-5 lesson)

For each AC, walk the prescribed pseudocode and confirm it would PASS verbatim:

| AC | Pseudocode self-test |
|---|---|
| AC-R82-1 | `tools/build-browser-bundle.ts` content includes `'esbuild'` + `'demos/engine-bundle.mjs'` ← both present in § 2.2 verbatim. ✓ |
| AC-R82-2 | `package.json` scripts.build:browser regex `tools\/build-browser-bundle\.js` matches § 2.5 prescription. ✓ |
| AC-R82-3 | esbuild's normal output for ~12-file bundle is 30-80 KB; ≥ 5000 bytes is comfortable. ✓ |
| AC-R82-4 | ENTRY_SOURCE (§ 2.2) explicitly re-exports `computeSnapshotHash`, `pureJsSha256`, `StaticTopologySource`, `TopologyEnricher`. ✓ |
| AC-R82-5 | § 2.1 mechanism removes the static `import` AND the body's `createHash` reference. ✓ |
| AC-R82-6 | § 2.1 mechanism preserves the synchronous return type of `computeSnapshotHash(snapshot): string`. ✓ |
| AC-R82-7 | The 3 FIPS vectors yield the literal expected hex (Architect verified at spec-emit). ✓ |
| AC-R82-8 | esbuild's `external: ['node:crypto', ...]` config leaves bare imports in bundle (not polyfill bodies). ✓ |
| AC-R82-9 | § 2.3 smoke block contains all 5 required substrings verbatim. ✓ |
| AC-R82-10 | § 4.4 prescribes `demos/engine-bundle.mjs` as a line-anchored entry. ✓ |
| AC-R82-11 | esbuild build is idempotent for unchanged inputs. ✓ |
| AC-R82-12 | tsc passes per § 1.4 prediction; sentinel test sufficient. ✓ |
| AC-R82-13 | § 4.7 EMPIRICAL.sh contains all 5 block markers verbatim. ✓ |
| AC-R82-14 | § 3.2 ALLOWED_SET covers every path in § 3.1 component inventory + R82 spec-triad + coordination files. ✓ |

### § 9.7 Empirical-premise verification (R71 + R77 + R47 + R72 reinforcement)

| Premise | Verification path |
|---|---|
| Baseline test count at round-start `5c3e0d9` | Architect ran `pnpm exec tsc -p tsconfig.test.json && node --test --test-reporter=tap test/*.test.js | tail -10` at session entry: tsc exit 0; `# tests 622 # pass 607 # fail 11 # skipped 4`. Matches R81 close attestation. |
| 7 callers of `computeSnapshotHash` | Architect ran `grep -rn "computeSnapshotHash\|snapshotHash" engine/*.ts engine/**/*.ts | grep -v topology-overlay.ts | wc -l` at session entry; counted 7 distinct files. |
| `_q72-trace.ts` lazy require gated by `process.env` | Architect read lines 38-59 of `engine/detectors/_q72-trace.ts`; the `q72TraceEnabled()` function returns false when `typeof process === 'undefined'` (browser context). |
| `.gitignore` does not already contain `demos/engine-bundle.mjs` | Architect ran `grep -n "engine-bundle\|demos/engine" .gitignore`; no match. (R81 MAJOR-3 lesson applied.) |
| FIPS 180-2 SHA-256 test vectors | Verified at spec-emit time against Node `createHash('sha256').update('').digest('hex')` → `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` matches FIPS publication. |
| EMPIRICAL.sh probe-run at round-start | **Architect did NOT yet run the EMPIRICAL.sh** — it will fail at round-start HEAD because Implementer artifacts (bundle, q82 test, tools/build-browser-bundle.ts, package.json modifications) are absent. Per R47/R77/R72 3rd-instance reinforcement: the probe-run is recorded in Q-R82-SPEC-AUDIT.md § C.3. **Probe predicted at round-start HEAD: Block 1 PASS, Block 2 FAIL (bundle missing), Block 3 FAIL (pureJsSha256 missing), Block 4 PASS (test count 622/607/11/4 unchanged at round-start), Block 5 PASS (no diff). Overall exit 1.** |

### § 9.8 Spec-internal contradiction sweep

| Sweep point | Status |
|---|---|
| `# fail` strict-equality value | Consistent: 12 in § 1.4 / § 4.7 / § 5.2 / § 6.1. |
| Bundle min size | Consistent: 5000 in § 2.7 / § 4.6 / § 4.7. |
| Halt-condition triggers | No conflicting prescriptions: § 6.1 trigger 1 (EMPIRICAL.sh non-zero) is mutually exclusive with the chore-A-pass condition; § 6.1 trigger 9 (UNEXPECTED `# fail`) is bounded by the strict-equality 12. |
| TypeScript type shapes | No new type declarations added (R65 MINOR-2 lesson — no § 1.5 type-pretest vs § 4.x interface drift). |
| Boundary clauses | `pnpm build:browser` is invoked twice in AC-R82-11 (R34 MINOR-2 boundary sweep: both invocations cover the chore-A state, no pre/post-window inconsistency). |
| Regex syntax JS-validity | The § 3.2 ALLOWED_SET regex uses `^...$` anchors + `\.` for literal dots + character classes (R34 MINOR-3 lesson — no `\Z` Perl-only metacharacters; all syntax is JS-valid). |

### § 9.9 Acknowledged-gap pairing audit (R74 MINOR-2 lesson)

Each § 5.3 acknowledged gap has a named mitigation; no permanent-waiver framing. Gaps 1-3 + 6 → Reviewer manual checks; gap 4 → scope-acknowledged limit (extended fuzz out of scope); gap 5 → spec-emit-time verification by Architect + forward-protective regex entry. All gaps paired.

### § 9.10 Pre-authored narrative empirical claims audit (R71 MAJOR-1/2 lesson)

The R82 deliverables do NOT include any pre-authored narrative text claiming engine behavior (e.g., a README extension, a DEMO-SCRIPT.md addition). All deliverables are mechanical (build tool, adapter, bundle, test, EMPIRICAL.sh). No R71 sub-variant risk surface present in this round.

### § 9.11 Documentation cite-then-walk (R11 + R72 MAJOR-1/3 + R74 lesson)

| Citation | Verified at spec-emit |
|---|---|
| `engine/topology-overlay.ts:30` (`import { createHash } from 'node:crypto';`) | ✓ Architect read this line directly. |
| `engine/detectors/_q72-trace.ts:69` (`_fs = require('node:fs')`) | ✓ Architect read lines 38-79 directly. |
| `test/q81-slice-2-close.test.ts:69-74` (R81 ALLOWED regex) | ✓ Architect cited via R81 close attestation in MEMORIAL. |
| `package.json` scripts/devDeps structure | ✓ Architect read package.json directly. |
| `.gitignore` existing content | ✓ Architect read via `cat`. |
| FIPS 180-2 SHA-256 vectors | ✓ Architect verified via Node REPL. |

---

## Pipeline invocation

```bash
cd /Users/johnwarren/concord/tessera
./run-pipeline.sh --round R82 --tier full
```

**Operator gating:** The pipeline pauses at the Architect → Implementer routing due to STATUS: ESCALATE (OQ-R82-1). Operator dispositions Option A/B/C before chore-A. Under Option A, the Implementer proceeds with this spec verbatim. Under Option B, the Architect re-authors §§ 2.2 + 4.2 + ALLOWED_SET to remove the esbuild dep. Under Option C, R82 is descoped.
