# REVIEWER REPORT — R53

**Round:** R53 — Phase 3 SLICE 1 WU-Phase3-1 (AWS Neuron Trainium + Inferentia topology adapter).
**Tier:** full (Architect + Implementer + Reviewer + Memorial-Updater).
**Reviewer role:** cold-eye independent audit; no contamination from diagnostics/ / logs/ / .prompt-*.md.
**Scope reviewed:** Architect spec (`coordination/specs/Q-R53-SPEC.md` + `Q-R53-SPEC-AUDIT.md` + `Q-R53-EMPIRICAL.sh`) + Implementer artifacts (RED 0865fce → GREEN 52f9b88 → chore-A 2ba7bb4 → chore-B f0b0084 → SHA-backfill 43f5d2a) + git log from baseline `3744012` to HEAD `43f5d2a`.

## Reviewer mandate

The Implementer made at least one mistake. Three findings below; none CRITICAL.

---

## 1. Per-AC verification table

| AC-ID | Criterion (short) | Status | Evidence |
|---|---|---|---|
| AC-R53-1 | Trainium fixture → 16 nodes + 32 edges + partial=false + chip_family=trainium | PASS | `test/q53-neuron-adapter.test.ts:35-41` test 362 OK; verified by `node --test`; fixture `test/_substrate/neuron-fixture-trainium-2d-torus.json:1-22` has 16 devices × 4 peers = 32 deduped via canonical undirected (4·16/2=32); parser `engine/topology/neuron-source.ts:97-125` |
| AC-R53-2 | Every Trainium node has kind === 'trainium_chip' | PASS | `test/q53-neuron-adapter.test.ts:44-50` test 363 OK; parser `engine/topology/neuron-source.ts:100, 108` sets kind from node_kind which is bound by chip-family discriminator at `:60-62` |
| AC-R53-3 | Every Trainium edge has relationship === 'neuron_link_peer' | PASS | `test/q53-neuron-adapter.test.ts:53-59` test 364 OK; parser `engine/topology/neuron-source.ts:124` hardcodes relationship literal |
| AC-R53-4 | Trainium edges are canonical undirected-deduped; 32 unique pairs; from < to lex | PASS | `test/q53-neuron-adapter.test.ts:62-72` test 365 OK; parser dedup `engine/topology/neuron-source.ts:115-125` uses `a < b` lex compare + Set<string> for keys |
| AC-R53-5 | Inferentia fixture → 6 nodes + 6 edges + partial=false + chip_family=inferentia | PASS | `test/q53-neuron-adapter.test.ts:75-81` test 366 OK; fixture `test/_substrate/neuron-fixture-inferentia-ring.json:1-12` has 6 devices × 2 peers = 6 deduped |
| AC-R53-6 | Inferentia node kind === 'inferentia_chip'; edges 'neuron_link_peer' | PASS | `test/q53-neuron-adapter.test.ts:84-94` test 367 OK |
| AC-R53-7 | NeuronTopologySource + id/version fallback chain (branches 1+2) | PASS | `test/q53-neuron-adapter.test.ts:98-118` test 368 OK; class at `engine/topology/neuron-source.ts:140-173`; `??`-chain `:162-163` exercised both branches |
| AC-R53-8 | snapshotHash delegates to computeSnapshotHash | PASS | `test/q53-neuron-adapter.test.ts:121-125` test 369 OK; delegation `engine/topology/neuron-source.ts:170-172` |
| AC-R53-9 | Sparse fixture → 4 nodes + 0 edges + partial=true + chip_family=trainium | PASS | `test/q53-neuron-adapter.test.ts:128-134` test 370 OK; partial logic `engine/topology/neuron-source.ts:127` |
| AC-R53-10 | 5 malformed-input sub-cases throw NEURON_PARSE_* | PASS | `test/q53-neuron-adapter.test.ts:137-157` test 371 OK; throw sites `engine/topology/neuron-source.ts:62, 72, 77, 81, 86, 89` |
| AC-R53-11 | Chip-family discriminator maps trn*/inf* prefix correctly | PASS | `test/q53-neuron-adapter.test.ts:160-168` test 372 OK; helper `engine/topology/neuron-source.ts:58-63` |
| AC-R53-12 | verdict.ts retains 'correlational_not_causal: true' literal (A16) | PASS | `test/q53-neuron-adapter.test.ts:171-177` test 373 OK; literal present at `engine/types/verdict.ts:281, 298` (2 occurrences) |
| AC-R53-13 | npx tsc -p tsconfig.test.json exits 0 | PASS | Reviewer ran independently: `EXIT: 0`; matches Q-R53-EMPIRICAL.sh AC-R53-13 block + Implementer chore-A attestation |
| AC-R53-14 | node --test summary = 374/369/2/3 at chore-B HEAD | PASS | Reviewer ran independently: `# tests 374 / # pass 369 / # fail 2 / # skipped 3`; the 2 fails are AC-R36-30 + AC-R36-31 pre-existing R36 forward-protection guards (`not ok 354` + `not ok 355`); R53 introduced no new fails |
| AC-R53-15 | round-start-to-chore-A diff ⊆ R53 allowed-set | PASS | `test/q53-neuron-adapter.test.ts:181-204` test 374 OK; Reviewer ran independently: `git diff 3744012..2ba7bb4 --name-only` produces 12 paths, all members of the 12-entry ALLOWED_SET; no 13th entry (no DIAGNOSTIC) |

**All 15 ACs PASS.** Empirical claims independently verified by Reviewer at HEAD (`43f5d2a`) via `node --test --test-reporter=tap test/*.test.js` + `npx tsc -p tsconfig.test.json` + `git diff 3744012..2ba7bb4 --name-only`.

---

## 2. Findings

### MINOR-1 — Spec AC-R53-14 prediction at chore-A SHA was structurally impossible (Architect)

**Location:** `coordination/specs/Q-R53-SPEC.md:861` (AC-R53-14 table row) + `:194-195` (§ 1.4 Architect pre-prediction).

**Severity:** MINOR (Implementer handled correctly per Rule 1; finding documents the Architect-side defect).

**What happened:** The spec AC-R53-14 row says "Given the round-end working tree **at chore-A SHA**, when running `node --test --test-reporter=tap test/*.test.js`, then the output reports `tests=374 / pass=369 / fail=2 / skipped=3` (predicted)". That prediction is structurally impossible at chore-A: AC-R53-15's CHORE_A_SHA placeholder `'<INJECTED-AT-CHORE-B>'` is not a valid git object, so `execFileSync` throws and AC-R53-15 must fail at chore-A. Actual chore-A summary is therefore `374/368/3/3`, not `374/369/2/3` (the latter is the post-chore-B state). Spec § 1.4 row labeled this prediction "at chore-A" via the implicit framing.

**Why it matters:** The spec's predicted outcome violated its own structural design (AC-R53-15 is appended/injected at chore-B per spec § 11 step 5). This created a fork in the road for the Implementer: trust the spec (predict 374/369/2/3 at chore-A, contradicting empirical reality) vs. attest actual (374/368/3/3, contradicting spec text). The Implementer correctly chose attest-actual per Rule 1 sub-class `empirical-command-attestation` and disclosed via TD-1.

**Implementer's correct response:** `coordination/NEXT-ROLE.md:172-177` TD-1 disclosure explicitly identifies the spec defect ("Spec predicted 374/369/2/3, which assumed AC-R53-15 passes at chore-A. That prediction was structurally impossible"); EMPIRICAL.sh updated to assert 374/368/3/3 at chore-A and 374/369/2/3 at chore-B.

**Recommendation:** No code change. Forward-flag for spec authoring discipline: AC predictions that are SHA-tied must distinguish between chore-A-time and chore-B-time states explicitly. The spec § 5 AC-R53-14 table row could have specified "at chore-B HEAD" (the round-end state post-SHA-injection) to be empirically accurate.

### MINOR-2 — Implementer added a 10-line file-header documentation block to engine/types/verdict.ts not explicitly prescribed by spec § 2.4

**Location:** `engine/types/verdict.ts:25-33` (new R53 header docblock; introduced by GREEN commit 52f9b88).

**Severity:** MINOR (consistent with R18 + R23 precedent for vendored-with-deltas files; pattern-extension rather than scope creep).

**What happened:** Spec § 2.4 prescribed two surface changes to `engine/types/verdict.ts`: the `TopologyNode.kind` union extension (line 254 actual / spec-cited line 245) and the `TopologyEdge.relationship` union extension (line 264 actual / spec-cited line 255). The Implementer additionally inserted a 10-line documentation block at lines 25-33 ("Tessera Phase 3 SLICE 1 amendments (R53, 2026-05-19) — two additive extensions per Q-R53-SPEC.md § 2.4..."). This addition was not enumerated in spec § 2.4 step 1 (which prescribed only VENDORING-MANIFEST.md row-note refresh) nor in § 4 per-file pseudocode for verdict.ts.

**Why it matters:** Two angles to consider. (1) The header docblock follows the established R18 (`:6-15`) + R23 (`:17-24`) precedent for documenting Tessera deltas on vendored-with-deltas files — a load-bearing convention that surfaces all delta-bearing amendments at the top of the file. The Implementer's choice to extend this convention to R53 is sensible. (2) Spec § 4.7 only explicitly authorized the `coordination/VENDORING-MANIFEST.md` row-note refresh as the documentation surface for R53 deltas. Adding a verdict.ts header docblock is a small scope expansion not explicitly authorized.

The Implementer did not surface this judgment call in NEXT-ROLE.md or MEMORIAL.md (the `spec-prescription-fidelity` CONFIRMATION at MEMORIAL.md:707 does not disclose the header docblock addition). Per Implementer disclosure discipline, tactical autonomy choices that extend the spec's literal prescription should be flagged.

**Recommendation:** Acceptable as a tactical autonomy choice; no rollback recommended. Forward-flag for Implementer disclosure discipline: when extending a vendored-with-deltas file's header convention, surface in NEXT-ROLE.md "Implementer attestation" or MEMORIAL.md CONFIRMATION entry as a spec-deviance/extension disclosure. The current MEMORIAL.md entries cover TDD discipline, fidelity, anti-scope, no-halt, attestation, and execFileSync; the header-docblock extension was the second tactical-autonomy choice (alongside execFileSync) but was not disclosed.

### MINOR-3 — Spec line citations for verdict.ts union extensions are off by 9 lines vs. final state

**Location:** `coordination/specs/Q-R53-SPEC.md:135, 155-158, 262, 268, 1014` (and elsewhere); `coordination/MEMORIAL.md:693` (Architect's `line-citation-cite-then-verify` CONFIRMATION).

**Severity:** MINOR (consequential to MINOR-2; not load-bearing because the Reviewer + Implementer use grep/find to locate union members, not line numbers).

**What happened:** Spec cites `engine/types/verdict.ts:245` for `TopologyNode.kind` union and `:255` for `TopologyEdge.relationship` union. Actual final state has these unions at lines 254 and 264 respectively (+9-line shift). The shift is caused by the header docblock the Implementer added (10 lines at `:25-33`; 9 net shift because verdict.ts has a structural offset of ~244 lines before the type declarations).

**Why it matters:** The Architect's `line-citation-cite-then-verify` CONFIRMATION (MEMORIAL.md:693) attested that `engine/types/verdict.ts:245` and `:255` were verified via sed -n at spec-emit time. Those citations were correct at spec-emit (against `engine/types/verdict.ts` SHA `d9bcfcc`, the pre-R53 baseline). After GREEN commit 52f9b88, the line numbers shifted by +9 due to the Implementer's docblock addition. The Reviewer audit-trail rule (CLAUDE-COMMON.md `line-citation-cite-then-verify` reinforcement, REINFORCED 2026-05-18) requires citation correctness at the time of attestation; the spec's citations were correct at spec-time but became stale by chore-A.

**Recommendation:** No correction required to spec (specs are time-pinned artifacts). Forward-flag for Reviewer audit-trail: when a vendored-with-deltas spec cites declaration-site line numbers, recognize that downstream header-docblock additions will shift those lines. Future Architect spec authoring could use grep-discoverable anchors (e.g., "after `kind:` in `TopologyNode`") rather than absolute line numbers, but this conflicts with the line-citation-cite-then-verify reinforcement which favors specific :N citations.

### OBS-1 — AC-R53-1..4 assert structural invariants (count + uniqueness + canonical ordering) but no specific edge-pair set

**Location:** `test/q53-neuron-adapter.test.ts:35-72` (AC-R53-1..4 test bodies).

**Severity:** OBS (sufficient for major regressions; documented for forward-flag).

**What happened:** The 4 Trainium ACs assert (a) snapshot.nodes.length === 16, (b) snapshot.edges.length === 32, (c) every edge has relationship 'neuron_link_peer', (d) every edge has from < to lex, (e) edge keys are unique. The tests do NOT assert that specific topology-true edges are present (e.g., that the (neuron-0, neuron-1) edge exists; that no (neuron-0, neuron-5) edge exists). A buggy parser that produced 32 deduplicated-with-canonical-ordering edges between unintended-but-valid id pairs would still PASS the tests.

**Why it matters:** This is a partial-coverage observation rather than a defect. The 32-count + uniqueness invariants combined catch most regressions (e.g., double-counting, missing edges, swapped pairs). However, structural correctness (e.g., neuron-0 connects to neuron-1 and not to neuron-5) is not directly tested. The fixture `:1-22` is correct topology-wise (4×4 2D torus verified by hand: chip 0 peers {1,3,4,12} = (0,1)+(0,3)+(0,4)+(0,12) per 4×4 torus geometry), so test outcomes reflect correct behavior; the gap is in test sensitivity, not in implementation.

**Recommendation:** No action required at R53. Forward-flag for parallel-class adapter tests: where exact peer-edge geometry matters for downstream BFS, include 1-2 spot-check assertions of specific edge presence (e.g., `assert.ok(snapshot.edges.some(e => (e.from === 'neuron-0' && e.to === 'neuron-1') || (e.from === 'neuron-1' && e.to === 'neuron-0')))`).

### OBS-2 — AC-R53-9 partial=true is derived from edges.length === 0, not from an independent "sparse" signal

**Location:** `engine/topology/neuron-source.ts:127` (`const partial = edges.length === 0;`); `test/q53-neuron-adapter.test.ts:128-134` (AC-R53-9).

**Severity:** OBS (matches spec semantics; documented for forward-flag).

**What happened:** Parser computes `partial = (edges.length === 0)`. AC-R53-9 asserts partial=true for the sparse fixture (4 devices, all `connected_to: []`). The parser's partial=true is purely a function of edges.length, not of any other "sparseness" signal (e.g., a flag from input metadata). A hypothetical edge-dedup bug that erroneously produced 0 edges from a non-sparse fixture would yield partial=true (false positive) and the test wouldn't distinguish.

**Why it matters:** The spec § 2.1 step 7 prescribes `partial = (edges.length === 0)` explicitly. The implementation matches. The semantic concern (partial=true means "edges array empty"; could be sparse fixture or could be edge-dedup-error) is a spec-level concern, not an implementation defect.

**Recommendation:** No action required. Forward-flag: spec semantic for "partial" could be sharpened in future revisions (e.g., partial=true iff "at least one connected_to was non-empty and at least one connected_to was empty" — a more semantically meaningful sparse signal).

---

## 3. Right-reasons audit (3 tests selected; non-self-confirming verification)

### Test A — AC-R53-1 (`test/q53-neuron-adapter.test.ts:35-41`)

**Spec requirement:** AC-R53-1 (Trainium fixture → 16 nodes + 32 edges + partial=false + chip_family=trainium).

**What the test does:** Reads fixture text from `test/_substrate/neuron-fixture-trainium-2d-torus.json`; calls production `parseNeuronLsJson(TRAINIUM, { fetched_at_ts: 1_700_000_000 })`; asserts 4 specific scalar values against fixed literals (16, 32, false, 'trainium').

**Self-confirming risk:** None. The literals 16 and 32 are externally derived from graph theory (a 4-neighbor 4×4 2D Torus has 4·16/2 = 32 unique undirected edges; Reviewer hand-verified by enumerating chip 0's peers {1, 3, 4, 12} per 4×4 torus layout, then verifying chip 1's peers {0, 2, 5, 13}, chip 4's peers {0, 5, 7, 8}, etc.). The test would FAIL if the parser miscomputed dedup (producing != 32 edges) or chip-family discriminator (producing != 'trainium'). Trace: spec § 0.1 (JSON input format) + § 2.1 (parsing algorithm) + § 1.4 (32 derived from 4·16/2 identity). **Not self-confirming.**

### Test B — AC-R53-10 (`test/q53-neuron-adapter.test.ts:137-157`)

**Spec requirement:** AC-R53-10 (5 malformed inputs throw 5 distinct NEURON_PARSE_* error names).

**What the test does:** Five assert.throws() calls, each passing a specific malformed JSON shape and matching against a regex anchored to a unique error-name literal. Sub-case (c) uses `/NEURON_PARSE_UNKNOWN_INSTANCE_TYPE: p4d\.24xlarge/` — discriminating regex including the offending instance type, satisfying R30 MINOR-1 reinforcement.

**Self-confirming risk:** None. The regex patterns anchor to specific error-name literals that the parser must produce. A parser that swallowed errors, threw a generic Error without the NEURON_PARSE_* prefix, or threw a different sub-case would all FAIL the test. Trace: spec § 1.3 failure-mode table maps each sub-case to a distinct throw at `engine/topology/neuron-source.ts` lines `62, 72, 77, 81, 86, 89`. **Not self-confirming.**

### Test C — AC-R53-8 (`test/q53-neuron-adapter.test.ts:121-125`)

**Spec requirement:** AC-R53-8 (snapshotHash delegates to computeSnapshotHash).

**What the test does:** Constructs a `NeuronTopologySource(TRAINIUM, { fetched_at_ts: 1_700_000_000 })`; awaits `src.fetchSnapshot()`; asserts `src.snapshotHash(snap) === computeSnapshotHash(snap)` (strict equality between method output and direct function call).

**Self-confirming risk:** Minimal. This test calls BOTH the production method AND the underlying free function and asserts equality. If `snapshotHash` were implemented as `return 'fixed-string'` and `computeSnapshotHash` were independently broken to return the same fixed string, the assertion would pass. However, `computeSnapshotHash` is a vendored-at-pin function from `engine/topology-overlay.ts:69-78` (per spec § 1.1 + § 1.2 + § 2.2), so an independent implementation drift between source.snapshotHash and computeSnapshotHash is the actual risk vector — exactly what this AC binds. The test passes iff source.snapshotHash returns the result of computeSnapshotHash for any snapshot — which is structurally what "delegates to" means. **Not self-confirming (the test would catch any drift between source-side hashing and the canonical computeSnapshotHash function).**

---

## 4. Cross-cutting checks

### TDD discipline

- RED commit (`0865fce` "test(R53): RED — failing tests for Neuron adapter"; 4 files: 3 fixtures + 1 test file) precedes GREEN commit (`52f9b88` "feat(R53): engine/topology/neuron-source.ts — AWS Neuron topology adapter"; 2 files: source + verdict.ts deltas). Verified by `git log --oneline 3744012..HEAD`.
- RED commit message explicitly confirms TDD ordering ("Tests fail at runtime: Cannot find module '../engine/topology/neuron-source' (engine/topology/neuron-source.ts not yet created at this commit)"). RED → GREEN ordering preserved per R23 IMPL MINOR-1.
- **TDD discipline: PASS.**

### No-skip / halt discipline

- No `coordination/diagnostics/DIAGNOSTIC-R53-*.md` files exist (verified by `git log --oneline 3744012..HEAD` not introducing one; the spec's conditional 13th entry was NOT triggered).
- Implementer MEMORIAL.md `no-halt-fired` CONFIRMATION (MEMORIAL.md:711) accurately reflects that no halt-condition trigger fired.
- Both tactical-autonomy deviations (execFileSync and verdict.ts header docblock) were resolved inline without halting. The first was properly disclosed (`execFileSync-over-execSync` CONFIRMATION at MEMORIAL.md:715); the second was not disclosed (MINOR-2 above).
- **Halt discipline: PASS.**

### Anti-scope

- `git diff 3744012..2ba7bb4 --name-only` (chore-A boundary) yields 12 paths; all 12 are members of the ALLOWED_SET enumerated in spec § 3 / test AC-R53-15 / chore-A commit message.
- `git diff 3744012..HEAD --name-only` (round close) yields the same 12 paths — chore-B + SHA-backfill only modified files already in ALLOWED_SET (`test/q53-neuron-adapter.test.ts`, `coordination/specs/Q-R53-EMPIRICAL.sh`, `coordination/NEXT-ROLE.md`).
- **Anti-scope: PASS.**

### Anything that shipped not in the spec

- **Verdict.ts header docblock at `engine/types/verdict.ts:25-33`** (MINOR-2 above): not enumerated in spec § 2.4 step 1, but consistent with R18 + R23 vendored-with-deltas precedent for header-comment self-documentation.
- **`execFileSync` instead of `execSync`** in AC-R53-15 (`test/q53-neuron-adapter.test.ts:22`): properly disclosed in MEMORIAL.md:715 + GREEN commit message. Implements REINFORCED 2026-05-18 R26 MINOR-1 rule.

No other scope additions detected.

---

## 5. Grilling output on this report

- **Every finding has a file:line reference?** YES.
  - MINOR-1: `coordination/specs/Q-R53-SPEC.md:861` + `:194-195`; `coordination/NEXT-ROLE.md:172-177`.
  - MINOR-2: `engine/types/verdict.ts:25-33`; `coordination/MEMORIAL.md:707`.
  - MINOR-3: `coordination/specs/Q-R53-SPEC.md:135, 155-158, 262, 268, 1014`; `coordination/MEMORIAL.md:693`.
  - OBS-1: `test/q53-neuron-adapter.test.ts:35-72`.
  - OBS-2: `engine/topology/neuron-source.ts:127`; `test/q53-neuron-adapter.test.ts:128-134`.
- **Any AC marked PASS without actual verification?** NO. All 15 ACs PASS via independently-run Reviewer commands: `node --test --test-reporter=tap test/*.test.js` (374/369/2/3 confirmed; AC-R36-30 + AC-R36-31 the only fails), `npx tsc -p tsconfig.test.json` (EXIT: 0 confirmed), `git diff 3744012..2ba7bb4 --name-only` (12 paths confirmed).
- **Right-reasons audit completed for 3+ tests?** YES. AC-R53-1, AC-R53-10, AC-R53-8 audited above; all three not-self-confirming.

---

## 6. Routing

**0 CRITICAL findings.** Per CLAUDE-REVIEWER.md routing rule: MAJOR or below → STATUS: MERGE-READY.

**STATUS: MERGE-READY.**

Three MINOR findings + two OBS findings, all documented above with file:line references and forward-flag recommendations. None block the round close.

R53 ships a sound first-vendor Phase 3 SLICE 1 deliverable: AWS Neuron Trainium + Inferentia topology adapter with parser + 3 fixtures + verdict.ts enum extensions + interface conformance + sparse-degradation + 5 malformed-input guards + anti-scope SHA-pinned diff test, all in 12-file ALLOWED_SET. Empirical baseline preserved (374/369/2/3 at chore-B; 0 new typecheck regressions). TDD discipline preserved (RED 0865fce → GREEN 52f9b88). Implementer + Architect MEMORIAL CONFIRMATIONS present.

Forward-flag candidates for downstream rounds (NOT R53 blockers):
- Spec AC-prediction discipline around chore-A vs chore-B SHA states (MINOR-1).
- Implementer disclosure discipline for vendored-with-deltas header-docblock extensions (MINOR-2).
- Test-coverage convention for specific edge-set presence in adapter ACs (OBS-1).
