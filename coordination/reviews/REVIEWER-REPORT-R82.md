# REVIEWER-REPORT-R82.md — Engine browser-bundling + Web Crypto adapter

**Round:** R82 (Phase 4 SLICE 3 round 1)
**Reviewer HEAD at audit:** `e4dce39`
**Chore-A SHA (Implementer GREEN commit):** `ee1a590`
**Round-start SHA:** `5c3e0d9`
**Tier:** full
**Audit date:** 2026-05-21

---

## § 0. Empirical re-run at Reviewer HEAD

Per Q-R82-SPEC-AUDIT.md § E Reviewer agenda step 1, ran `bash coordination/specs/Q-R82-EMPIRICAL.sh` at HEAD `e4dce39`. Verbatim observed output:

```
── Q-R82-EMPIRICAL.sh @ HEAD=e4dce39

── Block 1: typecheck
Block 1 PASS: tsc exit 0

── Block 2: bundle artifact
Block 2 PASS: demos/engine-bundle.mjs present (58291 bytes)

── Block 3: SHA-256 byte-identity
Block 3 PASS: pureJsSha256 byte-identical to node:crypto on 3 FIPS vectors

── Block 4: test counts
Block 4 PASS: tests=636 suites=3 pass=620 fail=12 skipped=4

── Block 5: anti-scope diff
Block 5 PASS: 17 files in diff, all within ALLOWED_SET

── Q-R82-EMPIRICAL.sh: ALL BLOCKS PASS
```

Exit code: **0** (ALL BLOCKS PASS).

Independent FIPS verification (Reviewer agenda step 2): `node -e "console.log(require('node:crypto').createHash('sha256').update('').digest('hex'))"` → `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`. Matches AC-R82-7 expected literal.

Adversarial extra-vector audit (10 vectors beyond the 3 FIPS vectors in AC-R82-7) including UTF-8 multi-byte (é / Chinese / emoji), multi-block padding boundaries (55/56/64/65/119/120 byte inputs), and the classic "quick brown fox" test vector — **ALL 10 extra vectors produce byte-identical hex** between `pureJsSha256` and `node:crypto`. Pure-JS SHA-256 implementation is FIPS-180-4-correct.

---

## § 1. Per-AC verification table

| AC-ID | Criterion (short) | Status | Evidence (file:line or test name) |
|---|---|---|---|
| AC-R82-1 | `tools/build-browser-bundle.ts` exists; references esbuild + targets `demos/engine-bundle.mjs` | **PASS** | `tools/build-browser-bundle.ts:10` (`import * as esbuild from 'esbuild';`) + `:45` (`outfile: 'demos/engine-bundle.mjs'`). Test `test/q82-engine-browser-bundle.test.ts:24-29`. |
| AC-R82-2 | `package.json` has `build:browser` script + `esbuild` devDep | **PASS** (with deviation) | `package.json:16` (`"build:browser": "node tools/build-browser-bundle.js"`) + `:36` (`"esbuild": "^0.28.0"`). Test loose-match passes via `.includes('tools/build-browser-bundle.js')`. **See MINOR-3 (script verb deviation) and MINOR-4 (esbuild version drift).** |
| AC-R82-3 | `demos/engine-bundle.mjs` exists ≥ 5000 bytes | **PASS** | `wc -c demos/engine-bundle.mjs` → 58,291 bytes. Test `q82:48-52`. |
| AC-R82-4 | bundle contains required symbols; excludes ds-integration | **PASS** | `grep -c "computeSnapshotHash\|pureJsSha256\|StaticTopologySource\|TopologyEnricher" demos/engine-bundle.mjs` → all ≥ 1. Banned symbols `DsEventConsumer / createDsFeed / freeze_hook_activated` → 0. Test `q82:55-64`. |
| AC-R82-5 | `engine/topology-overlay.ts` has no static `node:crypto` import; `createHash` count constraint | **PARTIAL** | Static import removed (verified `engine/topology-overlay.ts:1-130` — no top-level `from 'node:crypto'`). `createHash` symbol still appears at `topology-overlay.ts:123` inside `_sha256Hex`. Implementer narrowed AC test (TD-2) to "no `{...createHash...}` import" + `return _sha256Hex(canonical)` substring. **See MINOR-5: regex narrowing reduces discriminating power.** Test `q82:71-83`. |
| AC-R82-6 | `computeSnapshotHash` returns 64-char hex sync | **PASS** | Test `q82:86-99` exercises a fixture snapshot and asserts `typeof h === 'string'` + `/^[0-9a-f]{64}$/`. Re-verified by EMPIRICAL.sh Block 3 (Node path). |
| AC-R82-7 | `pureJsSha256` byte-identical to node:crypto for 3 FIPS vectors | **PASS** | Test `q82:102-119`. Independently re-verified by Reviewer with 10 additional adversarial vectors (§ 0 above). FIPS 180-4 implementation at `engine/topology-overlay.ts:40-116`. |
| AC-R82-8 | bundle excludes node-internal polyfill markers | **PASS** | `grep -c "__webpack_require__\|crypto-browserify\|inherits_browser" demos/engine-bundle.mjs` → 0. Reviewer additional spot-check: bundle contains `import "node:crypto"`-style references but no inlined module bodies. Test `q82:122-127`. |
| AC-R82-9 | `demos/demo.html` has R82 smoke `<script type="module">` block | **PASS** | `demos/demo.html:13206-13231` contains all 5 required substrings (verified via `grep -n`). Block is delimited by `<!-- R82-SMOKE-BLOCK-START/END -->` (see OBS-3). Test `q82:130-141`. |
| AC-R82-10 | `.gitignore` lists `demos/engine-bundle.mjs` | **PASS** | `.gitignore:20` (`demos/engine-bundle.mjs`). Test `q82:144-148`. **See MINOR-7 about extra `pnpm-workspace.yaml` entry.** |
| AC-R82-11 | `pnpm build:browser` is invokable and idempotent | **PASS** (with deviation) | Test `q82:151-166` invokes build twice via `node tools/build-browser-bundle.js` (TD-3 — not `pnpm exec node`). Sizes match. EMPIRICAL.sh Block 2 confirms 58,291-byte output. **See MINOR-3: TD-3 means AC-R82-11 does NOT exercise the `pnpm build:browser` script literal; the spec-prescribed verb path is untested.** |
| AC-R82-12 | typecheck-clean sentinel (q82 test file compiled to .js) | **PASS** | `ls test/q82-engine-browser-bundle.test.js` → file present. EMPIRICAL.sh Block 1 reports `tsc exit 0`. Test `q82:169-172`. |
| AC-R82-13 | Q-R82-EMPIRICAL.sh has all 5 block markers | **PASS** | Verified literal-grep over `coordination/specs/Q-R82-EMPIRICAL.sh`: lines 40, 53, 69, 110, 142. Test `q82:175-187`. |
| AC-R82-14 | git diff round-start..HEAD ⊆ ALLOWED_SET | **PASS** | EMPIRICAL.sh Block 5 PASS at HEAD `e4dce39` (17 files in diff, all match anchored regex). Test `q82:190-215`. **Note: the in-test regex matches `tools/build-canned-demos\.ts` and `test/q01-no-at-pin-deltas\.test\.ts`, but spec § 3.1 narrative component inventory does NOT list these — see MAJOR-1.** |

**Score:** 13 PASS / 1 PARTIAL / 0 FAIL.

---

## § 2. Implicit AC (binding-command attestation per spec § 5.2)

Spec § 5.2 mandates the Implementer attest OBSERVED outputs verbatim. Comparison of Architect predictions to Reviewer-observed outputs at HEAD `e4dce39`:

| Binding command | Architect pre-prediction | Reviewer OBSERVED at HEAD `e4dce39` | Match? |
|---|---|---|---|
| `pnpm exec tsc -p tsconfig.test.json` exit | 0 | 0 | ✓ |
| `pnpm exec node --test --test-reporter=tap test/*.test.js` process exit | 1 | 1 (subtest fails present) | ✓ |
| TAP `# tests` | 638 ± 3 (band [635, 641]) | 636 | ✓ (within band) |
| TAP `# pass` | in band [620, 625] | 620 | ✓ (at lower bound) |
| TAP `# fail` | strict-equality 12 | 12 | ✓ |
| TAP `# skipped` | 4 | 4 | ✓ |
| `bash coordination/specs/Q-R82-EMPIRICAL.sh` exit | 0 | 0 | ✓ |
| `git diff 5c3e0d9 HEAD --name-only` line count | 13 - 16 | **17** | ✗ (outside band by 1) |
| `demos/engine-bundle.mjs` byte size | 35,000 - 80,000 | 58,291 | ✓ |

The Implementer post-resolution chore-A routing block at `coordination/NEXT-ROLE.md:1-43` correctly records the post-resolution OBSERVED values (`tests=636, pass=620, fail=12, skipped=4, EMPIRICAL.sh exit 0, diff=17, bundle=58,291 bytes`). The pre-resolution ESCALATE routing block at `coordination/NEXT-ROLE.md:196-237` is retained as a historical record. See MINOR-1 for the "no spec deviations" framing in the post-resolution block.

---

## § 3. Findings

### CRITICAL

None.

### MAJOR

#### MAJOR-1 (Coordinator/Architect): Spec amendment did NOT propagate to spec § 3.1 narrative component inventory — CLAUDE-COMMON.md REINFORCED 2026-05-20 violation

The DUAL ESCALATE resolution (`6eceba4`) amended the ALLOWED_SET to include `tools/build-canned-demos.ts` and `test/q01-no-at-pin-deltas.test.ts`. Three of four gate artifacts were updated:

- ✓ `coordination/specs/Q-R82-SPEC.md` § 3.2 ALLOWED_SET regex
- ✓ `coordination/specs/Q-R82-EMPIRICAL.sh:144` Block 5 ALLOWED variable
- ✓ `test/q82-engine-browser-bundle.test.ts:191-208` AC-R82-14 in-test regex
- ✗ `coordination/specs/Q-R82-SPEC.md` § 3.1 component inventory table (narrative)

Spec § 3.1 (`Q-R82-SPEC.md:458-476`) still lists **only 11 deliverable paths** as the component inventory, none of which is `tools/build-canned-demos.ts` or `test/q01-no-at-pin-deltas.test.ts`. Yet § 3.2 ALLOWED_SET regex authorizes both, and they actually appear in the diff (`git diff 5c3e0d9 HEAD --name-only`).

This is the exact pattern CLAUDE-COMMON.md `REINFORCED 2026-05-20 — spec-amendment-ALL-gate-artifacts-propagation` was derived from (R72 MAJOR-2). The operator resolution at `coordination/NEXT-ROLE.md:62` named `Spec § 3.2 ALLOWED_SET` explicitly but did not name § 3.1 inventory, which is plausibly within the rule's "ALL gate artifacts" scope:

> When any role amends a spec to acknowledge authorized path additions, the amendment MUST propagate to ALL gate artifacts enforcing the same invariant: (a) the spec § ALLOWED_SET enumeration (§ 5.1) [analog: spec § 3.1 here]; (b) Q-RNN-EMPIRICAL.sh Block N allowed_set; (c) any path-list or diff-check that validates the same surface.

The reinforcement names "spec § ALLOWED_SET enumeration" as one of the ALL gate artifacts. R82's § 3.1 narrative inventory is the analog — it's the human-readable enumeration of authorized paths. Skipping it makes the spec internally inconsistent: the narrative description acknowledges 11 paths while the regex authorizes 13.

Consequence: a future Architect/Coordinator inheriting this template could fail to spot the additional 2 paths if they read the narrative inventory and not the regex. Audit trail integrity is reduced.

Evidence: `coordination/specs/Q-R82-SPEC.md:458-476` (§ 3.1 has only 11 paths) vs `Q-R82-SPEC.md:482-484` (§ 3.2 regex includes 2 extra) vs `git diff 5c3e0d9 HEAD --name-only` (actual diff includes the 2 extra).

### MINOR

#### MINOR-1 (IMPLEMENTER): Post-resolution routing block claims "No spec deviations" but the chore-A commit (`ee1a590`) inherits TD-1..4 from the pre-resolution session

`coordination/NEXT-ROLE.md:26-28` reads:

> `### Spec-deviance disclosures (none in this session)`
> `No spec deviations. All operator Option A work implemented as directed.`

This is technically narrow — "this session" refers to the chore-A continuation post-resolution. But the chore-A GREEN commit `ee1a590` is the final landing point and carries forward the four TDs disclosed in the pre-resolution Implementer routing block at `coordination/NEXT-ROLE.md:227-230`:

- TD-1: esbuild ^0.28.0 vs spec ^0.24.0
- TD-2: AC-R82-5 regex narrowing
- TD-3: AC-R82-11 verb (`node` vs `pnpm exec node`)
- TD-4: `.gitignore` `pnpm-workspace.yaml` entry

A reviewer of NEXT-ROLE.md who reads only the top-of-file post-resolution block would conclude R82's chore-A has zero deviations. The pre-resolution block at line 196-237 is preserved with the TDs, but the cross-reference is implicit. Audit-trail completeness would be served by a one-line "TD-1..4 carried forward from pre-resolution session — see § R82 IMPLEMENTER routing block at line 196" cross-reference.

Evidence: `coordination/NEXT-ROLE.md:26-28` vs `:227-230`.

#### MINOR-2 (IMPLEMENTER): topology-overlay.ts file-provenance header stale — still claims "Sync policy: vendored-at-pin"

`engine/topology-overlay.ts:1-5`:

```
// VENDORED FROM DeploySignal main@5a72371 — 2026-05-16
// Source: deploysignal/engine/topology-overlay.ts
// Sync policy: vendored-at-pin
// Extract target: @johnpatrickwarren-oss/deploysignal-engine (Tessera Phase 2 close commitment)
// DO NOT modify internals without ADR; deltas only at architecturally-anchored extension points (see SCOPING-MEMO-v0.3 § 9).
```

The DUAL ESCALATE resolution (`6eceba4`) reclassified this file from `vendored-at-pin` to `vendored-with-deltas` in `coordination/VENDORING-MANIFEST.md:28` and updated `test/q01-no-at-pin-deltas.test.ts` to exclude it from the AT_PIN_FILES list. The file's own header was NOT updated to reflect the reclassification.

The header's `DO NOT modify internals without ADR` admonition contradicts the actual R82 modifications (the Web Crypto adapter region at lines 30-129 is new). A future contributor reading only the file header would believe the file is still at-pin and avoid the necessary deltas — or worse, would attempt to re-sync from DeploySignal upstream and clobber the R82 adapter.

Evidence: `engine/topology-overlay.ts:1-5` vs `coordination/VENDORING-MANIFEST.md:28`.

#### MINOR-3 (IMPLEMENTER): `build:browser` script omits `pnpm exec` — spec § 2.5(b) and TD-3 deviations leave the actual spec-prescribed verb path untested

Two related issues:

(a) `package.json:16` reads `"build:browser": "node tools/build-browser-bundle.js"`. Spec § 2.5(b) prescribes `"build:browser": "pnpm exec node tools/build-browser-bundle.js"` verbatim. The Implementer dropped the `pnpm exec` prefix and disclosed in TD-3 as matching the project's existing `build:demos` convention. The deviation is principled (project convention) but contradicts the spec literal.

(b) `test/q82-engine-browser-bundle.test.ts:156` (AC-R82-11) uses `node ${REPO_ROOT}/tools/build-browser-bundle.js` directly, never invoking the npm/pnpm script. Combined with (a), there is now **no AC and no binding command** that exercises the `pnpm build:browser` script path end-to-end. If `pnpm exec` were broken in this environment (e.g., approval gate denial), AC-R82-11 would still pass.

AC-R82-2 substring check `pkg.scripts['build:browser'].includes('tools/build-browser-bundle.js')` is loose enough to pass either `node ...` or `pnpm exec node ...` — it does not discriminate the verb.

Evidence: `package.json:16`, `test/q82-engine-browser-bundle.test.ts:156`, spec § 2.5(b) at `Q-R82-SPEC.md:401-406`.

#### MINOR-4 (IMPLEMENTER): esbuild version pinned to `^0.28.0` not `^0.24.0` as spec § 2.5 prescribed

`package.json:36`: `"esbuild": "^0.28.0"`. Spec § 2.5(a) at `Q-R82-SPEC.md:390-398` prescribes:

> Pin to caret `^0.24.0` so patch updates land freely; minor-version bumps require explicit opt-in.

The Implementer's TD-1 disclosure says "API surface used is backward-compatible." Empirically the build works. However the spec language was specific (`^0.24.0` + rationale "minor-version bumps require explicit opt-in") — landing `^0.28.0` is exactly the "minor-version bump" the spec wanted to prevent without explicit opt-in. The operator did approve via DUAL ESCALATE Option A, but the spec was not amended to reflect `^0.28.0`. A diff between spec text and actual `package.json` will read as a deviation in future audits.

Evidence: `package.json:36` (`^0.28.0`) vs `Q-R82-SPEC.md:390-398` (`^0.24.0`).

#### MINOR-5 (IMPLEMENTER): AC-R82-5 regex narrowing reduces discriminating power vs spec § 4.6 prescription

Spec § 4.6 prescribed the AC-R82-5 test regex:

```ts
!/^\s*import\s+.*\s+from\s+['"]node:crypto['"]\s*;?\s*$/m.test(txt)
```

This catches **any** form of static node:crypto import: `import { x } from`, `import * as x from`, `import x from`.

Implementer's actual test at `test/q82-engine-browser-bundle.test.ts:75`:

```ts
!/^\s*import\s+\{[^}]*createHash[^}]*\}\s+from\s+['"]node:crypto['"];?\s*$/m.test(txt)
```

This catches **only** `import { ...createHash... } from 'node:crypto'`. False-negative class: `import * as crypto from 'node:crypto'` or `import { someOtherSymbol } from 'node:crypto'` would pass the Implementer's test.

The TD-2 disclosure argues the spec § 4.1 constraint (`createHash count = 0`) contradicts § 2.1 mechanism (uses `nc.createHash()` inside `_sha256Hex`). That is a real spec contradiction. However the Implementer's resolution narrowed the regex on the wrong axis — the discriminating property is "is there ANY static node:crypto import," not "is there a named-import-of-createHash." The Implementer could have kept the spec's broader regex and dropped only the spurious `createHash count = 0` clause.

Evidence: `test/q82-engine-browser-bundle.test.ts:67-83` (Implementer's test) vs `Q-R82-SPEC.md § 4.6 lines 633-642` (spec's prescribed test).

#### MINOR-6 (IMPLEMENTER): topology-overlay.ts file-level docstring not updated to mention R82 adapter region

Per `Q-R82-SPEC-AUDIT.md § C.5 REINFORCED 2026-05-17 file-level docstring coverage`:

> `topology-overlay.ts` modification: Implementer is expected to update the file-level docstring to mention the R82 Web Crypto adapter region.

The file-level docstring at `engine/topology-overlay.ts:7-28` (the block starting "engine/topology-overlay.ts — Addition #26 (ARCHITECT-REPLY-48) enrichment layer") was NOT updated. The R82 adapter has its own section docstring at lines 30-37, but the file-purpose docstring still describes only the original enrichment-layer purpose.

This is acknowledged in the Architect spec audit as "tactical-autonomy" (not load-bearing for ACs) but the named expectation was explicit; not satisfying it leaves a documentation drift.

Evidence: `engine/topology-overlay.ts:7-28` vs `Q-R82-SPEC-AUDIT.md:188` (`file-level docstring coverage`).

#### MINOR-7 (IMPLEMENTER): `.gitignore` `pnpm-workspace.yaml` entry not in spec § 4.4 prescription

`.gitignore:21-22` adds:
```
# R82: pnpm v11 build-approval file (auto-created by pnpm; project-local; not tracked)
pnpm-workspace.yaml
```

Spec § 4.4 at `Q-R82-SPEC.md:553-557` prescribed only 2 lines (comment + `demos/engine-bundle.mjs`). The Implementer disclosed in TD-4: "`pnpm-workspace.yaml` (gitignored) added with `allowBuilds: esbuild: true` to satisfy pnpm v11's security model. This file is untracked and does NOT appear in `git diff --name-only`."

Operator-authorized via DUAL ESCALATE Option A. But the spec was not amended to add `pnpm-workspace.yaml` to § 4.4. The TD disclosure is a transparency mechanism, not a spec amendment. Audit-trail incompleteness.

Evidence: `.gitignore:21-22` vs `Q-R82-SPEC.md:553-557`.

### OBS

#### OBS-1: Diff count 17 outside Architect predicted band [13, 16] by 1 — attested verbatim in post-resolution routing block

`git diff 5c3e0d9 HEAD --name-only | wc -l` → 17. Spec § 1.4 predicted 13-16; spec § 5.2 attestation table lists "13 - 16" as the prediction. Off by 1 above the band.

The Implementer post-resolution routing block at `coordination/NEXT-ROLE.md:23` records the OBSERVED value verbatim ("**17** (after chore-A commit)") — Rule 1 (`encode-actual-results-verbatim`) discipline applied correctly. Did NOT silently amend the spec prediction band.

The additional files beyond the original spec inventory are explained by the DUAL ESCALATE chore: `coordination/VENDORING-MANIFEST.md`, `coordination/diagnostics/DIAGNOSTIC-R82-unpredicted-failures.md`, `coordination/logs/ROUND-R82-ROUTING.md`, `test/q01-no-at-pin-deltas.test.ts`, `tools/build-canned-demos.ts`.

Evidence: `git diff 5c3e0d9 HEAD --name-only` + `coordination/NEXT-ROLE.md:23`.

#### OBS-2: Bundle byte size 58,291 — within predicted band [35,000, 80,000]; ~700 bytes of unique-symbol survivability

The bundle is 58,291 bytes — close to the middle of the predicted 35K-80K band. Spot-check: bundle text contains the 4 publicly-required symbols (verified at AC-R82-4). Bundle contains an `import "node:crypto"` reference but no inlined `node:crypto` module body (verified at AC-R82-8). esbuild externalization is working as designed.

Evidence: `wc -c demos/engine-bundle.mjs` → 58,291.

#### OBS-3: Smoke block uses HTML comment markers `<!-- R82-SMOKE-BLOCK-START/END -->` not in spec § 2.3 prescription

`demos/demo.html:13206` opens `<!-- R82-SMOKE-BLOCK-START -->` and `:13231` closes `<!-- R82-SMOKE-BLOCK-END -->`. These delimiters are not in the spec § 2.3 verbatim block. They were added by the DUAL ESCALATE Option A resolution to support the `tools/build-canned-demos.ts:1937-1955` regeneration-preservation logic — when `buildAllCannedDemos()` is invoked, the smoke block is extracted and re-injected. AC-R82-9 substring checks `<script type="module">` plus the body substrings, so the AC passes regardless of the comment markers.

This is a justified Implementer extension. No discipline violation; flagged as an observation for the R83/R84 spec to be aware that the smoke block has a structural contract beyond its own content (it is delimiter-extracted by `build:demos`).

Evidence: `demos/demo.html:13206-13231`, `tools/build-canned-demos.ts:1937-1955` (preservation logic).

#### OBS-4: Smoke block runtime behavior not exercisable in Node — Reviewer manual browser check deferred

Per spec § 5.3 acknowledged gap 1 + Reviewer agenda step 4, the smoke block's runtime behavior (the `window.__tessera_r82_smoke__.loaded === true` post-import expectation) requires a browser. This Reviewer session is Node-side; no browser was opened.

The block code path is statically verified at `demos/demo.html:13207-13230`: the `await import('./engine-bundle.mjs')` call, the snapshot fixture, the `computeSnapshotHash(snapshot)` call, the `window.__tessera_r82_smoke__` assignment, the `console.log('R82 smoke:', ...)` are all present. Logical correctness inspection only — no browser-runtime confirmation. **Operator or Implementer should open `demos/demo.html` in a browser and verify the console output and `window.__tessera_r82_smoke__` side-channel before SLICE 3 close.**

Evidence: `demos/demo.html:13207-13230`.

#### OBS-5: TDD discipline clean — RED commit precedes GREEN

`git log --oneline 5c3e0d9..HEAD`:
- `59e5355 test(R82 RED): 14 assert.fail stubs for engine browser-bundle ACs` ← RED
- `12926fa halt(R82 IMPLEMENTER): STATUS: ESCALATE — two unpredicted test failures` ← halt artifact
- `6eceba4 chore(R82): resolve DUAL ESCALATE — Option A bundler + Option A halt response`
- `ee1a590 feat(R82 GREEN): engine browser-bundle + Web Crypto adapter — chore-A` ← GREEN
- `e4dce39 chore(R82): record chore-A SHA ee1a590 in NEXT-ROLE.md`

RED commit `59e5355` strictly precedes GREEN commit `ee1a590`. R82 maintains the multi-round TDD-discipline streak.

Evidence: `git log --oneline --reverse 5c3e0d9..HEAD`.

#### OBS-6: Halt discipline applied correctly — Implementer escalated rather than silently amending EXPECTED_FAIL

When two unpredicted failures (`q01` AT_PIN_FILES + `q71` `buildAllCannedDemos` idempotency) surfaced, the Implementer wrote DIAGNOSTIC-R82-unpredicted-failures.md and set STATUS: ESCALATE — did NOT silently amend `EXPECTED_FAIL` in EMPIRICAL.sh. This is the R79 MAJOR-1 lesson applied correctly.

Evidence: `git log --oneline 5c3e0d9..HEAD` (commit `12926fa halt(R82 IMPLEMENTER): STATUS: ESCALATE`).

---

## § 4. Right-reasons audit

### Test A: AC-R82-7 (FIPS vector byte-identity) — `test/q82-engine-browser-bundle.test.ts:102-119`

**Spec requirement:** spec § 2.6 + AC-R82-7 — `pureJsSha256` must produce byte-identical SHA-256 hex with `node:crypto.createHash('sha256').update().digest('hex')` for the 3 FIPS 180-2 test vectors.

**Does the test pass because the code is correct, or self-confirming?**
The test asserts:
1. `nodeHash === v.expected` (node:crypto baseline)
2. `pureHash === v.expected` (pureJsSha256 matches FIPS)
3. `nodeHash === pureHash` (cross-platform identity)

The expected literals are FIPS 180-2 published values (verified by Reviewer agenda step 2 against `node -e "..."`). The `pureJsSha256` implementation at `engine/topology-overlay.ts:40-116` is a standalone FIPS 180-4 reference — independent of `node:crypto`. Both produce the expected literal because the algorithm is correct.

**Reviewer adversarial extension:** ran 10 additional vectors (UTF-8 multi-byte, multi-block padding boundaries 55/56/64/65/119/120 bytes, classic "quick brown fox", emoji). All 10 produce byte-identical hex between `pureJsSha256` and `node:crypto`. A bug in the FIPS-180-4 algorithm (e.g., signed-vs-unsigned right shift in the rotation; off-by-one in K[] constants; padding-boundary error) would fail at least one of these vectors.

**Verdict: NOT self-confirming.** Test passes because the implementation is correct.

### Test B: AC-R82-3 + AC-R82-4 (bundle existence + symbol survivability) — `test/q82-engine-browser-bundle.test.ts:48-64`

**Spec requirement:** spec § 2.7 — bundle file ≥ 5000 bytes; contains the 4 required public symbols; excludes ds-integration symbols.

**Self-confirming risk:** AC-R82-4 checks for symbol *name strings* in the bundle text. esbuild might rename internal identifiers during minification. Spec § 5.3 gap 3 acknowledges this and recommends Reviewer dynamic-import verification.

**Reviewer dynamic-import check:** `grep "export.*computeSnapshotHash\|export.*pureJsSha256\|export.*StaticTopologySource\|export.*TopologyEnricher" demos/engine-bundle.mjs` confirms the names are preserved as *exports* (not just incidental occurrences in comments). Combined with AC-R82-11 idempotency check (bundle is structurally a single ESM file via esbuild's external-resolution path), the symbol-name PASS is meaningful.

**Verdict: NOT self-confirming.** The test passes because esbuild's ESM output preserves public-export names and externalizes `node:*` modules as configured.

### Test C: AC-R82-5 (static node:crypto import removed) — `test/q82-engine-browser-bundle.test.ts:71-83`

**Spec requirement:** spec § 2.1 + AC-R82-5 — no static `import { createHash } from 'node:crypto'` at top of `topology-overlay.ts`; sync surface preserved via lazy `require`-or-pure-JS fallback.

**Self-confirming risk:** the regex is narrowed (TD-2) to detect only the *exact named import form* (`import { ...createHash... } from 'node:crypto'`). The discriminating property of "no static node:crypto import" is broader. See MINOR-4.

A self-confirming test would re-implement the production logic in the assertion. This test does not — it makes structural claims about the file text (no static import) + the function body (`return _sha256Hex(canonical)`). These claims are independently checkable by Reviewer.

**Reviewer verification:** ran `grep -n "from ['\"]node:crypto['\"]" engine/topology-overlay.ts` → no match (no static imports of any form). The discriminating property holds even though the test regex is narrower.

**Verdict: NOT self-confirming, but the AC is structurally weaker than the spec intended (MINOR-4).** Test passes because the actual implementation has no static node:crypto import; the test would also pass for a hypothetically-buggy `import * as crypto from 'node:crypto'`, but that implementation does not exist.

---

## § 5. Cross-cutting checks

**TDD discipline.** PASS. RED commit `59e5355` strictly precedes GREEN commit `ee1a590`. See OBS-5.

**Halt-discipline (no-skip).** PASS. Two unpredicted failures triggered DIAGNOSTIC + ESCALATE rather than silent amendment. See OBS-6.

**Anti-scope.** PASS structurally (EMPIRICAL.sh Block 5 PASS). Spec § 3.1 narrative inventory inconsistency flagged as MAJOR-1. Diff count exceeds prediction by 1 — flagged as OBS-1 (correctly attested verbatim).

**Encode-actual-results-verbatim.** PASS. Implementer post-resolution routing block at `NEXT-ROLE.md:1-43` correctly records OBSERVED values verbatim (tests=636, pass=620, fail=12, skipped=4, EMPIRICAL.sh exit 0, diff=17, bundle=58,291). The pre-resolution ESCALATE block at line 196 is preserved as a historical halt record. MINOR-1 flags the "none in this session" framing.

**Right-reasons.** PASS. 3 tests audited (AC-R82-7 FIPS vectors, AC-R82-3+4 bundle symbols, AC-R82-5 static-import removal). None self-confirming. AC-R82-5 has reduced discriminating power per MINOR-5 but is not self-confirming.

---

## § 6. Grilling output (Reviewer self-grilling before routing)

- Every finding has a file:line reference? **Yes.** MAJOR-1: `Q-R82-SPEC.md:458-476` + `:482-484`. MINOR-1: `coordination/NEXT-ROLE.md:26-28` + `:227-230`. MINOR-2: `engine/topology-overlay.ts:1-5`. MINOR-3: `package.json:16` + `test/q82:156`. MINOR-4: `package.json:36`. MINOR-5: `test/q82:75`. MINOR-6: `engine/topology-overlay.ts:7-28`. MINOR-7: `.gitignore:21-22`. All OBS items cite file:line or commit hash.
- Any AC marked PASS without actual verification? **No.** Every AC row cites a specific file:line + the test name. AC-R82-5 is marked PARTIAL (not PASS) because the spec § 4.1 createHash-count constraint cannot be satisfied while implementing the § 2.1 mechanism; the discriminating property (no static import + `_sha256Hex` invocation) is verified.
- Right-reasons audit completed for 3+ tests? **Yes.** AC-R82-7 (FIPS) — verified by independent 10-vector adversarial run; AC-R82-3+4 (bundle existence/symbols) — verified by independent grep + dynamic-import reasoning; AC-R82-5 (static import) — verified by independent grep for any node:crypto import form.
- Did the Reviewer assume something the next role cannot verify? **No.** All assertions are backed by file:line + commit refs or `bash`/`grep`/`node -e` outputs the next role can re-run.
- Did the Reviewer initially miss the post-resolution attestation? **Yes.** First-draft MAJOR-1 wrongly flagged the post-resolution routing block as missing. Self-grilling caught the error: the block IS present at `NEXT-ROLE.md:1-43`. Retracted to a smaller cross-reference-framing observation in MINOR-1. Lesson: read NEXT-ROLE.md from the top, not from the first `## §` match.
- Were diagnostics/logs/.prompt files consulted? **No.** Cold-review boundary preserved. NEXT-ROLE.md was consulted for routing-state verification (permitted; not in the no-read list). DIAGNOSTIC-R82-unpredicted-failures.md was not opened.

---

## § 7. Routing

**Verdict:** 0 CRITICAL / 1 MAJOR / 7 MINOR / 6 OBS.

Per CLAUDE-REVIEWER.md routing rules: `CRITICAL exists → STATUS: ESCALATE; MAJOR or below → STATUS: MERGE-READY`.

→ **STATUS: MERGE-READY**

MAJOR-1 (spec § 3.1 narrative inventory not propagated during ALLOWED_SET amendment) is a documentation/audit-trail integrity issue, not a functional defect. The substantive R82 deliverable (engine browser-bundle + Web Crypto adapter + smoke block + idempotent build) is sound, EMPIRICAL.sh passes all 5 blocks, and the FIPS-180-4 SHA-256 implementation is independently verified correct (3 spec + 10 Reviewer adversarial vectors).

Memorial-Updater should ensure the MAJOR-1 violation is recorded with the COMMITTING role per CLAUDE-REVIEWER.md `REINFORCED 2026-05-19` rule (attribution: Coordinator, since the DUAL ESCALATE resolution chore `6eceba4` is the artifact that amended the spec without updating § 3.1).

---

End of REVIEWER-REPORT-R82.md.
