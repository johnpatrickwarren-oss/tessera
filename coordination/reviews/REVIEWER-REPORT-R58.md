# REVIEWER-REPORT-R58 — Phase 3 SLICE 2 WU-Phase3-2B `TopologyFetchContext` interface refactor

**Round:** R58 (full tier; Reviewer cold-eye audit).
**Reviewer session HEAD:** `33fa15a` (chore-B SHA-injection commit at session entry).
**Chore-A SHA (Implementer routing):** `7368dcd`.
**Round-start SHA (anti-scope diff lower bound):** `7e9d399`.

---

## § 1 Inputs read (cold-eye boundary honored)

- `coordination/PRD.md` (full; Phase 3 § FR-V4 + § Path B context).
- `coordination/specs/Q-R58-SPEC.md` (full; 997 lines).
- `coordination/specs/Q-R58-SPEC-AUDIT.md` (full; Architect ceremony sidecar).
- `coordination/specs/Q-R58-EMPIRICAL.sh` (full).
- `coordination/NEXT-ROLE.md` (Implementer → Reviewer routing block + Architect → Implementer block).
- `~/.claude/CROSS-PROJECT-MEMORIAL.md` (Reviewer-section sweep for previously-missed issue classes — pragmatic-vs-strict CRITICAL routing R45 reinforcement noted).
- All five adapter sources at HEAD: `engine/topology/{slurm,k8s,nvlink,neuron,tpu}-source.ts`.
- `engine/topology/fetch-context.ts` (new file at HEAD).
- `engine/topology-overlay.ts` (READ-ONLY verification: unchanged from round-start; FetchContext at `:57-60`, TopologySource interface at `:50-55`).
- `engine/types/verdict.ts` (grep-only for `correlational_not_causal: true`; lines 281 + 298).
- `test/q58-live-fetch-interface.test.ts` (full; 211 lines).

Not read (cold-eye boundary): `coordination/diagnostics/`, `coordination/logs/`, `.prompt-*.md`, `coordination/MEMORIAL.md` Implementer/Architect sections were not pre-read to preserve independence.

## § 2 Session-entry empirical baseline (Reviewer re-runs)

| Command | Output | Spec prediction |
|---|---|---|
| `git rev-parse HEAD` | `33fa15a` (chore-B) | — |
| `npx tsc -p tsconfig.test.json; echo $?` | `0` | exit 0 (AC-R58-12) ✓ |
| `node --test test/*.test.js \| grep '^# '` summary | `tests=399 / pass=394 / fail=2 / skipped=3` | `399/394/2/3` (AC-R58-13 chore-B) ✓ |
| Failing tests | `AC-R36-30` + `AC-R36-31` (pre-existing R36 forward-protection carry-forward) | as predicted ✓ |
| `bash coordination/specs/Q-R58-EMPIRICAL.sh` | `19 PASS / 0 FAIL` | — |
| `git diff 7e9d399..7368dcd --name-only` path count | 12 | 12 (ALLOWED_SET; § 3.2 spec) ✓ |
| `git diff 7e9d399..HEAD --name-only` path count | 12 | 12 (chore-B paths ⊆ ALLOWED_SET) ✓ |

All binding-command attestations verified empirically. No reframing detected vs Implementer NEXT-ROLE.md attestations.

---

## § 3 Per-AC verification table

| AC-ID | Criterion (short) | Status | Evidence (file:line or test name) |
|---|---|---|---|
| **AC-R58-1** | `TopologyFetchContext` exported with 3 optional fields | PASS | `engine/topology/fetch-context.ts:26-36`; test `AC-R58-1` at `test/q58-live-fetch-interface.test.ts:74-83` (literal assignment + `typeof` readback) — tap subtest `ok 388`. |
| **AC-R58-2** | Slurm `fetchSnapshot()` returns constructor fixture | PASS | `engine/topology/slurm-source.ts:59-64`; test at `test/q58-live-fetch-interface.test.ts:86-91` — tap `ok 389`. |
| **AC-R58-3** | K8s `fetchSnapshot()` returns constructor fixture | PASS | `engine/topology/k8s-source.ts:69-74`; test at `test/q58-live-fetch-interface.test.ts:94-98` — tap `ok 390`. |
| **AC-R58-4** | NVLink `fetchSnapshot()` returns constructor fixture | PASS | `engine/topology/nvlink-source.ts:141-146`; test at `test/q58-live-fetch-interface.test.ts:101-105` — tap `ok 391`. |
| **AC-R58-5** | Neuron `fetchSnapshot()` returns constructor fixture | PASS | `engine/topology/neuron-source.ts:167-172`; test at `test/q58-live-fetch-interface.test.ts:108-112` — tap `ok 392`. |
| **AC-R58-6** | TPU `fetchSnapshot()` returns constructor fixture | PASS | `engine/topology/tpu-source.ts:202-207`; test at `test/q58-live-fetch-interface.test.ts:115-119` — tap `ok 393`. |
| **AC-R58-7** | `ctx.apiEndpoint` defined → throws `LIVE_FETCH_NOT_IMPLEMENTED_PATH_B: <vendor>` across 5 adapters with exact-equality on per-vendor suffix | PASS | Throw guards: slurm `:60-62`, k8s `:70-72`, nvlink `:142-144`, neuron `:168-170`, tpu `:203-205`. Parametrized test at `test/q58-live-fetch-interface.test.ts:123-133` (`err.message === \`LIVE_FETCH_NOT_IMPLEMENTED_PATH_B: ${vendor}\``) — tap `ok 394`. |
| **AC-R58-8** | `ctx` without `apiEndpoint` falls through to constructor snapshot (Path B preserved) across 5 adapters | PASS | `test/q58-live-fetch-interface.test.ts:137-145`; ctx with only `{authToken, timeoutMs}` returns snapshot with `nodes.length > 0` — tap `ok 395`. |
| **AC-R58-9** | Sparse-data resilience: constructor + `fetchSnapshot()` do not throw; nodes/edges are arrays | PASS (weak; see MINOR-2) | `test/q58-live-fetch-interface.test.ts:149-158`; sparse fixtures present for all 5 adapters per `ls test/_substrate/` — tap `ok 396`. |
| **AC-R58-10** | `src.snapshotHash(snap) === computeSnapshotHash(snap)` across 5 adapters (Addition #26 D6) | PASS | `test/q58-live-fetch-interface.test.ts:161-170`; each adapter's `snapshotHash` method delegates to `computeSnapshotHash` (slurm `:66-68`, k8s `:76-78`, nvlink `:148-150`, neuron `:174-176`, tpu `:209-211`) — tap `ok 397`. |
| **AC-R58-11** | `engine/types/verdict.ts` retains literal `'correlational_not_causal: true'` (A16) | PASS (non-discriminating; see OBS-2) | `engine/types/verdict.ts:281` (JSDoc) + `:298` (declaration); test at `test/q58-live-fetch-interface.test.ts:173-179` — tap `ok 398`. |
| **AC-R58-12** | `npx tsc -p tsconfig.test.json` exit 0 (binding-command) | PASS | Verified by Reviewer empirically at session entry (§ 2 table); Q-R58-EMPIRICAL.sh AC-R58-12 block PASS. |
| **AC-R58-13** | `node --test` summary = `399/394/2/3` at chore-B (binding-command) | PASS | Verified empirically at HEAD = `399/394/2/3`; Q-R58-EMPIRICAL.sh AC-R58-13 block PASS. Two-state distinction (chore-A `399/393/3/3` per pre-injection) attested by Implementer in NEXT-ROLE.md line 10 verbatim per Rule 1 sub-class `empirical-command-attestation`. |
| **AC-R58-14** | Round-start-to-chore-A diff ⊆ 12-path ALLOWED_SET (chore-A SHA `7368dcd` injected) | PASS | `test/q58-live-fetch-interface.test.ts:183-210`; CHORE_A_SHA literal injected at chore-B (`33fa15a`); `git diff 7e9d399..7368dcd --name-only` = 12 paths, all members of ALLOWED_SET — tap `ok 399`. |

**Aggregate:** 14/14 PASS. 0 FAIL, 0 PARTIAL.

---

## § 4 Findings

### CRITICAL
*None.*

### MAJOR
*None.*

### MINOR

**MINOR-1 — Architect spec § 4.7 pseudocode had incorrect constructor parameter name for `SlurmTopologySource` (`fetched_at_ts` vs actual API `fetchedAtTs`).**
File:line: `coordination/specs/Q-R58-SPEC.md:612-613` (pseudocode) vs `engine/topology/slurm-source.ts:34` (`fetchedAtTs?: number;` in `SlurmTopologySourceOpts`).
The Implementer correctly identified this divergence (TD-1 in `coordination/NEXT-ROLE.md:17`) and used the actual camelCase name in `test/q58-live-fetch-interface.test.ts:57-58, 87`, with an inline comment at `:38-41` documenting the deviation under TACTICAL AUTONOMY. Impact: none on runtime behavior; Architect-side drift only. Reinforcement: line-citation/symbol cite-then-verify (R11 / R47 MINOR-5) — the Architect's pseudocode quoted symbol names from memory rather than from the live `SlurmTopologySourceOpts` declaration at session entry. Tighten the pre-route grilling to grep for each constructor-options symbol used in pseudocode against its declaration site.
Recommendation: Architect-side reinforcement; no Implementer fix required.

**MINOR-2 — AC-R58-9 sparse-data assertions are non-discriminating beyond "snap.nodes/edges are arrays."**
File:line: `test/q58-live-fetch-interface.test.ts:152-157`. Assertions `Array.isArray(snap.nodes) && snap.nodes.length >= 0` and the equivalent for `edges` — the `>= 0` half is trivially true for any array. The test catches "constructor doesn't throw" + "`fetchSnapshot` doesn't throw" + "result has `.nodes` and `.edges` as arrays", but not any adapter-specific sparse semantics (e.g., slurm-sparse should yield switch-only nodes; nvlink-sparse should yield `edges.length === 0` with `partial = true`). The spec § 5.2 AC-R58-9 row text licensed exactly this weakness ("may be empty / subset depending on adapter sparse semantics"), so the Implementer faithfully matched the spec — but a future regression where any adapter's sparse parser silently returns an empty `nodes` array when it should still yield switch-only nodes (e.g., slurm-fixture-sparse.conf has 4 switches declared) would not surface as a failure. Per Rule 3 (`implementer-spec-test-assertion-coverage`) the binding could be tightened.
File:line: same; sparse fixture inventory at `ls test/_substrate/*sparse*` confirms 5 fixtures present.
Recommendation: future-round tightening — for each adapter, encode a discriminating lower-bound on `nodes.length` (e.g., slurm-sparse ≥ 4 switches; nvlink-sparse `partial === true`). Not blocking; spec-text-conforming.

**MINOR-3 — Spec § 5.5 branch-binding line citations drifted by 1–2 lines vs post-MOD adapter line numbers.**
File:line: `coordination/specs/Q-R58-SPEC.md:839` cites `slurm-source.ts:59-60, k8s-source.ts:69-70, nvlink-source.ts:141-142, neuron-source.ts:167-168, tpu-source.ts:202-203` for the post-MOD throw guards. Actual post-MOD guard locations: slurm `:60-62`, k8s `:70-72`, nvlink `:142-144`, neuron `:168-170`, tpu `:203-205`. Spec audit § 3.3 forward-flag (Q-R58-SPEC-AUDIT.md:126) acknowledged that line numbers may shift post-MOD; the off-by-one is the predicted drift from inserting the `if (ctx?.apiEndpoint !== undefined)` guard. Impact: spec-readability only; the guards are present and structurally correct.
Recommendation: future spec authoring — when prescribing inline insertions inside a method body, give the post-MOD predicted line range or cite via grep-anchor rather than absolute line number.

### OBS

**OBS-1 — Unused `type FetchContext` import retained in all 5 modified adapter files.**
File:line: slurm `:23`, k8s `:28`, nvlink `:26`, neuron `:27`, tpu `:32` (`type FetchContext,` inside the `topology-overlay` import block). After the signature widening to `ctx?: TopologyFetchContext`, the `FetchContext` symbol is unused inside each adapter's module scope. Spec § 2.3 + § D-2 explicitly authorized this as TACTICAL AUTONOMY — Implementer MAY remove for lint hygiene but is not required to. TSC default config does not error on unused type imports; a future `noUnusedLocals: true` lint enable would surface 5 TS6133 warnings. Not load-bearing for any R58 AC.
Recommendation: cleanup deferred; could batch with the next adapter-touching round.

**OBS-2 — AC-R58-11 substring presence is non-discriminating (2-site literal).**
File:line: `engine/types/verdict.ts:281` (JSDoc) + `:298` (type-body declaration). The test asserts `text.includes('correlational_not_causal: true')`; either site satisfies the assertion. A regression removing only `:298` while leaving `:281` JSDoc intact would still PASS, though tsc would catch the type-body removal because `correlational_not_causal: true` is a type-literal field. Disclosed in spec § 5.6 + § D-3 with R51 MINOR-1 / R56 MINOR-2 precedent. Architect-acknowledged.
Recommendation: same as R30/R53/R56 disposition — accept.

**OBS-3 — `ctx.apiEndpoint` discriminator is `!== undefined` (empty string also triggers throw).**
File:line: 5 adapters' guards (slurm `:60`, k8s `:70`, nvlink `:142`, neuron `:168`, tpu `:203`). If a caller passes `{ apiEndpoint: '' }`, the guard fires and Path B throws. Behaviorally harmless (empty string is not a real endpoint), and matches spec § 2.1 mechanism verbatim. No AC binds the empty-string edge case explicitly; test uses a real-URL literal. Not a finding against the implementation.

**OBS-4 — `test/q58-live-fetch-interface.test.ts:25` adds an extra import (`type TopologySnapshot from '../engine/types/verdict'`) not in spec § 4.7 pseudocode.**
This is a benign type import used in the `AdapterEntry` TypeScript interface at `:47, :51`. Spec § 4.7 used `unknown` in the pseudocode; Implementer correctly typed it concretely (TD-2 in NEXT-ROLE.md:18). TACTICAL AUTONOMY-clause coverage applies. Not a deviation.

---

## § 5 Right-reasons audit (3 tests)

### Test 1 — `AC-R58-7: ctx.apiEndpoint defined → throws LIVE_FETCH_NOT_IMPLEMENTED_PATH_B across all 5 adapters` (`test/q58-live-fetch-interface.test.ts:123-133`)

**Spec requirement traced:** Q-R58-SPEC.md § 2.1 contract "If `ctx !== undefined` AND `ctx.apiEndpoint !== undefined` → throw `Error('LIVE_FETCH_NOT_IMPLEMENTED_PATH_B: <vendor>')`" + § 5.2 AC-R58-7 row "Throws Error with message exactly `'LIVE_FETCH_NOT_IMPLEMENTED_PATH_B: <vendor>'`".

**Self-confirming check:** The test parametrizes over the `ADAPTERS` array (test:55-71), where `vendor` is hardcoded as `'slurm'`, `'k8s'`, etc. — the same strings hardcoded in each adapter's throw call. The assertion compares the error message via exact equality `err.message === \`LIVE_FETCH_NOT_IMPLEMENTED_PATH_B: ${vendor}\``. **Not self-confirming**: if any adapter erroneously hardcoded a different vendor suffix (e.g., the k8s adapter accidentally threw `LIVE_FETCH_NOT_IMPLEMENTED_PATH_B: slurm`), the parametrized iteration would catch it on the k8s leg because the expected suffix is rebuilt from the array tuple's `vendor` field. Confirmed independently by reading each adapter's throw line — all 5 are distinct and aligned with the array.

### Test 2 — `AC-R58-9: sparse-data resilience across all 5 adapters` (`test/q58-live-fetch-interface.test.ts:149-158`)

**Spec requirement traced:** Q-R58-SPEC.md § 5.2 AC-R58-9 row "Constructor + fetchSnapshot do not throw; returns a snapshot whose `nodes` and `edges` are valid arrays (may be empty / subset depending on adapter sparse semantics)."

**Self-confirming check:** The test asserts `Array.isArray(...) && length >= 0` for both `nodes` and `edges`. The `>= 0` half is mathematically vacuous (every array has non-negative length). The substantive assertions are: (i) constructor doesn't throw (validated implicitly by `buildSparse()` not throwing), (ii) `fetchSnapshot()` doesn't throw, (iii) `.nodes` and `.edges` are arrays. **Partially self-confirming through over-conformance to spec text**: the spec's verbatim language ("may be empty / subset") sets the bar at "is array"; the test matches. A future bug where one adapter's sparse parser silently emits a non-array (e.g., `undefined`) would be caught; one that emits an empty array when it should yield switch-only nodes would not. See MINOR-2.

### Test 3 — `AC-R58-10: snapshotHash delegates to computeSnapshotHash across all 5 adapters` (`test/q58-live-fetch-interface.test.ts:161-170`)

**Spec requirement traced:** Q-R58-SPEC.md § 1.3 integration point 4 "`computeSnapshotHash` at `engine/topology-overlay.ts:69-78` (free function) — unmodified by R58. Each adapter's `snapshotHash()` delegates to it per Addition #26 D6" + § 5.2 AC-R58-10 row.

**Self-confirming check:** The test asserts `src.snapshotHash(snap) === computeSnapshotHash(snap)` for each adapter. Because each adapter's `snapshotHash` method body literally is `return computeSnapshotHash(snapshot);` (slurm `:66-68`, k8s `:76-78`, nvlink `:148-150`, neuron `:174-176`, tpu `:209-211`), the test passes by direct call-equivalence rather than by re-computing the property. **Not self-confirming in the architectural sense**: the test verifies the load-bearing invariant — "all adapters share identical hash semantics per Addition #26 D6" — even though the equality is structural. A future regression where an adapter implements a custom hash (e.g., `crypto.createHash('sha1')...`) would fail the assertion. The test is doing what it claims to do; the architectural property is correctly bound.

---

## § 6 Cross-cutting checks

### TDD discipline (separate-RED-commit per CLAUDE-IMPLEMENTER R23 reinforcement)
`git log --oneline 7e9d399..HEAD` shows:
- `3bdef42 test(R58): RED commit — assert.fail stubs for 12 AC-R58 tests + fetch-context.ts interface` ← RED
- `3bf33ca feat(R58): implement TopologyFetchContext interface across 5 adapter sources` ← GREEN

RED-before-GREEN sequence present. ✓

### No-skip / halt discipline
No `.skip` markers introduced; no `coordination/diagnostics/DIAGNOSTIC-R58-*.md` files (none expected — no halt fired). The conditional 13th ALLOWED_SET entry remains conditional-unused. ✓
The Implementer correctly applied the R56 MINOR-1 carve-out at chore-A: the pre-documented AC-R58-13 two-state FAIL was reported verbatim (`399/393/3/3` in NEXT-ROLE.md:10) rather than reframed as compliance. Rule 1 sub-class `empirical-command-attestation` honored. ✓

### Anti-scope (ALLOWED_SET conformance)
`git diff 7e9d399..HEAD --name-only` = exactly 12 paths, all members of the spec § 3.2 ALLOWED_SET. No surprises: no `coordination/VENDORING-MANIFEST.md` touch (per anti-scope item 7), no `engine/topology-overlay.ts` touch (per A12), no `engine/types/verdict.ts` touch (per CLUSTER-HANDOFF anti-scope). `engine/topology/fetch-context.js` and `test/q58-live-fetch-interface.test.js` are compiled artifacts gitignored per `.gitignore` `*.js` rule. ✓

### Operator-directive divergence (OQ-R58-1)
Spec § 0.1 PICKED Approach A (NEW Tessera-original `engine/topology/fetch-context.ts`) over Approach B (MOD `engine/topology-overlay.ts` per NEXT-ROLE.md literal directive). The Architect's rationale — preserving A12 vendored-at-pin discipline + matching WAVE-PLAN-07 line 73 frame-AC "design pattern adapters CAN use without modifying interface" — is architecturally sound and transparently disclosed in spec § 8 OQ-R58-1 + audit § D-1. NEXT-ROLE.md line 22 permissive language "or wherever the interface is declared" admits the divergence. The Reviewer does not flag this as substantive; routing under standard MERGE-READY rather than ESCALATE. The Implementer is not the decision-maker on this axis — Architect decision pre-empts. No Reviewer routing action needed.

---

## § 7 Grilling output (Reviewer self-review before routing)

- **Every finding has a file:line reference?** Yes — every MINOR + OBS cites a file path + line number or test name.
- **Any AC marked PASS without actual verification?** No — every PASS row in § 3 cites a concrete file:line for evidence AND a tap subtest number from the empirical `node --test` run executed by the Reviewer at session entry.
- **Right-reasons audit completed for 3+ tests?** Yes — 3 tests covered in § 5 (AC-R58-7, AC-R58-9, AC-R58-10) with explicit spec-trace + self-confirming-check analysis.
- **Adversarial assumption applied (≥ 1 finding)?** Yes — 3 MINORs + 4 OBS surfaced. The mandate requires assuming at least one mistake exists; the spec-pseudocode drift in MINOR-1 (caught by the Implementer at TD-1) plus the line-citation drift in MINOR-3 confirm Architect-side imprecision; MINOR-2 surfaces a spec-licensed but discriminability-weak assertion shape worth flagging for future tightening.
- **Cross-cutting checks (TDD / no-skip / anti-scope) executed?** Yes — § 6 confirms RED-before-GREEN, no halt-discipline shortcuts, ALLOWED_SET conformance.
- **Empirical re-runs match Implementer attestations?** Yes — `npx tsc` exit 0, `node --test` summary `399/394/2/3`, chore-A diff 12 paths, Q-R58-EMPIRICAL.sh `19 PASS / 0 FAIL`. No reframing of failure data detected.
- **CRITICAL findings count?** 0. Routing rule: `MAJOR or below → STATUS: MERGE-READY`.

---

## § 8 Routing

**STATUS: MERGE-READY.**

0 CRITICAL, 0 MAJOR, 3 MINOR, 4 OBS. All 14 ACs PASS; all anti-scope constraints honored; empirical binding-commands match the Implementer's attestations and the spec's chore-B prediction. The Path B deferral surface (throw on `ctx.apiEndpoint`) is structurally bound by AC-R58-7 with exact-equality on per-vendor suffix; the interface widening is type-checked clean by AC-R58-12.

The 3 MINORs are: (1) Architect spec-pseudocode symbol-drift (`fetched_at_ts` vs `fetchedAtTs`; resolved by Implementer at TD-1), (2) AC-R58-9 sparse-data assertion weakness (spec-licensed; future-round tightening recommended), (3) Spec line-citation off-by-one drift post-MOD (Architect-acknowledged in spec audit § 3.3 forward-flag). None block merge.

Next role: **Memorial Updater**.

---

## § 9 Reinforcement candidates (cross-project / Tessera-local)

No new cross-project rule derivation surfaced this round (3-instance threshold not crossed by any single-instance MINOR). The following Tessera-local reinforcement is candidate for CLAUDE-ARCHITECT.md if MINOR-1 or MINOR-3 recurs in a future round:

- **Candidate Architect reinforcement (pseudocode-symbol-citation cite-then-verify):** Architect pseudocode that quotes constructor/options symbol names (e.g., `SlurmTopologySourceOpts.fetchedAtTs`) must grep the actual declaration site before writing the pseudocode literal. Memory-quoted symbol names drift from camelCase / snake_case mismatches. Detected R58 MINOR-1 + (per audit § D-2 disclosure pattern) latent drift in TD-2 around `AdapterEntry` type signature contravariance. First instance; Tessera-local; do not derive cross-project until 2 more instances.

Not promoted this round per the 3-instance cross-project derivation threshold.
