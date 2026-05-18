# REVIEWER-REPORT-R29 — WU-02 K8s Node-Label Adapter

**Round:** R29 (cluster `wu-02-k8s-adapter`; Wave 2 cluster 2 of 3)
**Branch:** `cluster/wu-02-k8s-adapter-R29`
**Reviewer:** REVIEWER (Opus 4.7) — cold pass, 2026-05-18
**Inputs consulted:**
- `coordination/PRD.md` (R29 scope block + project-wide PRD)
- `coordination/specs/Q-R29-SPEC.md` (full, 833 lines)
- `coordination/specs/Q-R29-SPEC-AUDIT.md` (full, 312 lines)
- `engine/topology/k8s-source.ts` (full, 155 lines)
- `test/q29-k8s-adapter.test.ts` (full, 305 lines)
- 4 fixtures at `test/_substrate/k8s-nodelist-fixture-*.json`
- `engine/types/verdict.ts` :235-269 (TopologyNode/Edge/Snapshot types)
- `engine/topology-overlay.ts` :45-101 (TopologySource interface + computeSnapshotHash)
- `engine/topology/common-mode-attribution.ts` :1-26 (import-style precedent)
- `coordination/MEMORIAL.md` R29 entries (Architect + Implementer)
- `~/.claude/CROSS-PROJECT-MEMORIAL.md` Reviewer section + R25-R26 derived reinforcements + 2026-05-17 CLAUDE-COMMON entries
- Git log/diff (`e714703..HEAD`, `e714703..778cff8`, `778cff8..HEAD`, per-commit `--stat`)
- Empirical command runs: `node --test --test-reporter=tap test/q29-k8s-adapter.test.js`; full suite `test/*.test.js`; helper node REPL to inspect snapshot output.

**Did NOT consult:** `coordination/diagnostics/` (no R29 entries; existence-checked), `coordination/logs/`, `.prompt-*.md`. Cold-review independence preserved.

---

## § 1. Per-AC verification table

| AC | Criterion (short) | Status | Evidence (file:line or test name) |
|---|---|---|---|
| AC-R29-1 | Empty NodeList → empty snapshot + injected ts/source_id/source_version | PASS | `test/q29-k8s-adapter.test.ts:22-31`; empirical `tap ok 1` from `node --test test/q29-k8s-adapter.test.js`; production: `k8s-source.ts:88` early loop, `:65` constructor stores parsed snapshot |
| AC-R29-2 | Full-label parse — 4 rack + 2 cooling_zone + 32 gpu_shard nodes (38 total); 4+32 contains edges (36 total) | PASS | `test/q29-k8s-adapter.test.ts:34-55`; empirical pass; production: full algorithm at `k8s-source.ts:88-145`; fixture has 4 hosts × 8 GPUs distributed across zone-A/zone-B → matches |
| AC-R29-3 | 4 zone→host edges with exact (from,to) pairs zone-A→{01,02}, zone-B→{03,04} | PASS | `test/q29-k8s-adapter.test.ts:58-76`; production: `k8s-source.ts:121` emits `{ from: zoneId, to: hostId, relationship: 'contains' }` |
| AC-R29-4 | 32 gpu_shard nodes with deterministic ids `gpu:host-NN:INDEX` | PASS | `test/q29-k8s-adapter.test.ts:79-95`; production: `k8s-source.ts:131-142` emits N shards per host with `id = gpu:${name}:${i}` |
| AC-R29-5 | 32 host→gpu_shard contains edges, exact pairs | PASS | `test/q29-k8s-adapter.test.ts:98-114`; production: `k8s-source.ts:141` |
| AC-R29-6 | Host: instance_type+region; gpu: gpu_product+host; zone: {} | PASS w/ MINOR-1 caveat | `test/q29-k8s-adapter.test.ts:117-138`; production correctly sets `host: name` at `k8s-source.ts:133`; verified empirically — `gpu:host-03:5` carries `metadata.host === 'host-03'`. Test verification weaker than AC literal (see § 2 MINOR-1). |
| AC-R29-7 | Sparse no-region: 2 rack + 1 zone + 0 gpu_shard; no metadata.region | PASS | `test/q29-k8s-adapter.test.ts:141-163`; production: `k8s-source.ts:99-100` conditional region assignment; empirical check confirms `'region' in host.metadata === false` |
| AC-R29-8 | Sparse no-GPU: 2 rack + 1 zone + 0 gpu_shard; region + instance_type present | PASS | `test/q29-k8s-adapter.test.ts:166-187`; production: missing `nvidia.com/gpu.count` skips shard loop at `k8s-source.ts:126` |
| AC-R29-9 | Interface conformance + parse-once reference + snapshotHash delegation + two-instance hash equality | PASS | `test/q29-k8s-adapter.test.ts:190-206`; production: `k8s-source.ts:56-75` implements `TopologySource`; `fetchSnapshot` returns cached `this.snapshot` reference; `snapshotHash` calls `computeSnapshotHash` |
| AC-R29-10 | `k8s-source.ts` contains zero `correlational_not_causal` occurrences | PASS | `test/q29-k8s-adapter.test.ts:209-213`; Grep on `k8s-source.ts` confirms 0 matches |
| AC-R29-11 | `npx tsc -p tsconfig.test.json` → exit 2, codes set = {TS2688, TS5107} | PASS | `test/q29-k8s-adapter.test.ts:217-233`; empirical: tap ok 11 — duration_ms=756 indicates real subprocess fire; matches spec § 9.1 row 3 |
| AC-R29-12 | Filtered `node --test` on pre-R29 files → tests=243, pass=241, fail=2 | PASS w/ OBS-2 caveat | `test/q29-k8s-adapter.test.ts:238-268`; empirical: tap ok 12 — duration_ms=801 indicates real subprocess fire; env-strip of `NODE_TEST_CONTEXT`/`NODE_TEST_WORKER_ID` at line 246-248 (Implementer tactical adjustment; see § 2 OBS-2) |
| AC-R29-13 | `git diff <CHORE-A-SHA>..HEAD --name-only` paths all in ALLOWED_SET (10 literal entries) ∪ DIAGNOSTIC regex | PASS | `test/q29-k8s-adapter.test.ts:272-304`; literal `CHORE_A_SHA = '778cff8'` matches `git log 778cff8` ✓; diff `778cff8..HEAD` = `coordination/NEXT-ROLE.md` + `test/q29-k8s-adapter.test.ts` — both in ALLOWED_SET ✓ |

All 13 ACs PASS. Independent test re-run confirms `1..13 # tests 13 # pass 13 # fail 0` for the q29 file in isolation; full suite shows `tests=256 / pass=254 / fail=2` (2 fails are the documented pre-existing q01-AC-7 + AC-R26-16 environmental failures, not R29-introduced).

---

## § 2. Findings

### CRITICAL — none.

### MAJOR — none.

### MINOR-1 — AC-R29-6 test verification weaker than AC literal text

`engine/topology/k8s-source.ts` `k8s-source.ts:133` — production correctly sets `gpuMeta.host = name` (verified empirically: `gpu:host-03:5` carries `metadata.host === 'host-03'`).

`test/q29-k8s-adapter.test.ts:128-132`:
```typescript
assert.ok(
  typeof gpu.metadata?.host === 'string' && gpu.metadata.host.length > 0,
  `gpu ${gpu.id} missing host metadata`,
);
```

Spec § 4.2 AC-R29-6 row, `Then` column: "every gpu_shard node has `metadata.gpu_product === 'A100-SXM4-40GB'` AND `metadata.host` **equal to the source host name**".

The test only checks that `host` is a non-empty string. A hypothetical bug where the implementation assigned `gpu.metadata.host = 'wrong-name'` (or `'x'`) would still pass this assertion. The AC literal binds equality to the source host name; the test verification does not.

Recommendation: strengthen to assert the value, e.g.,
```typescript
const expectedHost = gpu.id.match(/^gpu:([^:]+):\d+$/)?.[1];
assert.strictEqual(gpu.metadata?.host, expectedHost, `gpu ${gpu.id} host mismatch`);
```

Severity: MINOR. Production code is correct; no defect bound by the implementation. The test verification gap is an AC-literal-vs-test mismatch and weakens the "right-reasons" property of AC-R29-6 — if a future regression flipped `metadata.host` to a non-source-host-name string, this AC would not catch it. Aligns with the "branch-binding coverage" reinforcement (R21 ARCH MINOR-2/3): every AC literal claim should be structurally bound by the test.

### MINOR-2 — AC-R29-13 ALLOWED_SET omits Reviewer-report path (predictable forward-failure pattern)

`test/q29-k8s-adapter.test.ts:275-286` enumerates 10 entries; spec § 2.5 lists the same 10. None include `coordination/reviews/REVIEWER-REPORT-R29.md` nor any glob/regex covering it.

Once this Reviewer commits `coordination/reviews/REVIEWER-REPORT-R29.md` (this very file), the AC-R29-13 test will start emitting that path in `git diff 778cff8..HEAD --name-only`. The path is neither in `ALLOWED_SET` nor matched by the DIAGNOSTIC regex `^coordination\/diagnostics\/DIAGNOSTIC-R29-.+\.md$` (different directory). AC-R29-13 will fail post-Reviewer-commit.

This is the same failure mode currently exhibited by `AC-R26-16: anti-scope forward-protection (chore-B)` in the test suite (one of the 2 pre-existing failures the spec § 9.1 row 2 documents). Architect inherited the pattern without proactively widening the allowed-set to include the eventual Reviewer/Memorial-Updater paths.

Recommendation: future round specs should either (a) include `coordination/reviews/REVIEWER-REPORT-R29.md` literally in the allowed-set, (b) add a regex carve-out (e.g., `^coordination\/reviews\/REVIEWER-REPORT-R29\.md$`), or (c) accept the pattern as a known-failing AC after the wave gate. This finding is Architect-attributable; it does NOT block R29 merge — at this Reviewer's moment of test run (pre-report-commit), AC-R29-13 still passes.

Severity: MINOR. Predictable, low-impact; matches established project pattern. Does not block merge.

### MINOR-3 — AC-R29-12 implementation deviates from spec § 3.2 prescription (tactical adjustment, undocumented as spec amendment)

Spec § 3.2 AC-R29-12 prescription: "Use `execFileSync('node', ['--test', '--test-reporter=tap', ...preR29Files], { encoding: 'utf8' })`".

Implementation `test/q29-k8s-adapter.test.ts:246-251`:
```typescript
const subEnv = Object.fromEntries(
  Object.entries(process.env).filter(([k]) => !['NODE_TEST_CONTEXT', 'NODE_TEST_WORKER_ID'].includes(k)),
);
// ...
execFileSync('node', ['--test', '--test-reporter=tap', ...preR29Files], { encoding: 'utf8', env: subEnv });
```

The Implementer extended the prescribed `{ encoding: 'utf8' }` options object with `env: subEnv`. The Implementer's MEMORIAL entry at line 2382 documents this as a TACTICAL AUTONOMY adjustment for Node.js v25 recursive-test-detection behavior. The adjustment is technically necessary (without it, the subprocess silently no-ops and the AC's # tests / # pass / # fail regex assertions would fail with "could not parse # tests from TAP output"), and the spec's REQUIREMENT (assert 243/241/2 on the pre-R29 surface) is satisfied.

However: the spec § 7.2 list of "non-halt tactical adjustments allowed" enumerates "any equivalent JS/TS idiom for the algorithm in § 3.1" (note: § 3.1, not § 3.2) and specific test() title / assertion-library choices — it does not explicitly enumerate subprocess `env` modification. Per CROSS-PROJECT-MEMORIAL R26-derived false-compliance-attestation reinforcement, environmental discrepancies normally warrant a HALT + DIAGNOSTIC explaining why the as-prescribed command does not behave as expected, with the spec/AC amended if needed. The Implementer instead silently extended the call signature.

The substantive content of the AC is preserved (the binding-command DOES exercise the pre-R29 test surface as 243/241/2), so this is MINOR, not MAJOR. Future spec amendments should pre-emptively prescribe the env-strip for Node v25 environments, or the Implementer should write a brief DIAGNOSTIC-style note to make the deviation visible to the Reviewer (the MEMORIAL entry is the only such record at present, and would be silently lost by anyone reading the spec without the MEMORIAL).

Severity: MINOR. Spec REQUIREMENT satisfied; transparency on the deviation is the gap.

### OBS-1 — `parseNodeListToSnapshot` exported as helper but no AC test exercises it independently

`k8s-source.ts:78-154` exports `parseNodeListToSnapshot`. Spec § 3.1 rationale: "The `parseNodeListToSnapshot` helper is exported so AC-R29-9 (interface conformance) can test the class while substrate ACs can call the helper directly without instantiating the class — keeps test surface decoupled."

`test/q29-k8s-adapter.test.ts:11-14` imports only `K8sNodeLabelSource` and `type K8sNodeList`. Every AC test instantiates the class; none calls the helper directly. The export is therefore present but unused. Not a violation (the spec § 7.2 permits Implementer-chosen test idioms; class-only test surface is defensible), but the architectural justification in § 3.1 is unrealized.

Severity: OBS. No action required.

### OBS-2 — `opts.id` and `opts.version` constructor overrides not exercised by any AC

`k8s-source.ts:62-63` honors `opts.id` and `opts.version` overrides. AC-R29-1 (line 29-30) asserts the *default* values via `snap.source_id === 'k8s_node_label_source'` and `snap.source_version === 'k8s-1'`. No AC constructs an instance with non-default opts. Spec § 1.9 mentions this surface but does not enumerate an AC.

Severity: OBS. Low-risk; symmetric with `HardwareTopologySource` precedent.

### OBS-3 — Nameless-host defensive skip unbound by any AC (G2 carryover)

Spec § 9.13 G2 documents this: production `k8s-source.ts:90` skips items where `metadata.name` is missing/empty. No fixture exercises this branch. Mutation removing the guard would not be caught by any AC. Architect documented this as a low-risk carve-out (defensive code; no in-the-wild nameless-host scenario in fixtures).

Severity: OBS. Acknowledged by Architect; not a regression.

### OBS-4 — Sister-cluster contention (`engine/topology/slurm-source.ts`, `engine/topology/nvlink-source.ts`)

This cluster (WU-02) runs in parallel with WU-01 SLURM and WU-03 NVLINK. The R29 spec § 5 anti-scope explicitly excludes these sister-cluster files. Verified: `engine/topology/` contains only `common-mode-attribution.ts` (R26 inherited) and `k8s-source.ts` (R29 new). No sister-cluster file touched. The Coordinator-applied merge gate at wave close will be responsible for the cross-cluster merge.

Severity: OBS. Confirms anti-scope hold within this cluster's worktree.

---

## § 3. Right-reasons audit

Three tests selected for traceability + self-confirming-risk audit:

### Test 1: `AC-R29-2 / full-label parse — node/edge kind counts match expected totals` (`test/q29-k8s-adapter.test.ts:34-55`)

- **Spec requirement covered:** § 1.2 (well-known label consumption), § 1.4 (containment hierarchy), § 1.5 (deterministic ids), § 1.7 (GPU-shard inference); AC-R29-2 row in § 4.2.
- **Why it passes:** Production correctly emits 4 rack + 2 cooling_zone + 32 gpu_shard nodes (38 total) and 4 zone→host + 32 host→gpu contains edges (36 total) from the 4-host × 8-gpu fixture distributed across 2 zones (`k8s-source.ts:88-145`). Test asserts each count by `kind`/`relationship` filter, plus total counts via `snap.nodes.length === 38` / `snap.edges.length === 36`. Pigeonhole: if the four expected kind-counts sum to 38 and the total is 38, no extra kind can exist.
- **Self-confirming risk:** LOW. The fixture and spec independently encode (4 hosts × 8 GPUs × 2 zones) = the expected counts; the production code does not "compute" these counts from the test, it parses the fixture. Test verifies the spec-encoded counts against actual parser output. Passes for the right reason.

### Test 2: `AC-R29-9 / TopologySource interface conformance + delegation + determinism` (`test/q29-k8s-adapter.test.ts:190-206`)

- **Spec requirement covered:** § 1.9 (TopologySource impl + parse-at-construction pattern), § 1.11 (determinism guarantees); AC-R29-9 row in § 4.2.
- **Why it passes:** (a) `src.id`/`src.version` are strings of length > 0 because `k8s-source.ts:62-63` assigns string defaults. (b) `Object.is(snap1, snap2) === true` because `fetchSnapshot` at `k8s-source.ts:68-70` returns `this.snapshot` (stored once at construction). (c) `src.snapshotHash(snap1) === computeSnapshotHash(snap1)` because `k8s-source.ts:72-74` calls `computeSnapshotHash(snapshot)` directly (delegation). (d) Two instances over identical input produce identical hashes because `computeSnapshotHash` sorts nodes/edges before SHA-256 and the input is identical → canonical strings match.
- **Self-confirming risk:** LOW-MEDIUM on (c). The test imports `computeSnapshotHash` from the same module the production code imports from; if the production rolled its own hash function that happened to match `computeSnapshotHash`'s output for this input, the test would still pass. However, for arbitrary node/edge content this collision is astronomically unlikely, and the spec § 1.9 D6 invariant ("every TopologySource impl shares identical hash semantics") is what the AC is meant to bind — the test correctly exercises that. (a)/(b)/(d) are not self-confirming. Overall: passes for the right reason.

### Test 3: `AC-R29-13: anti-scope forward-protection (chore-B)` (`test/q29-k8s-adapter.test.ts:272-304`)

- **Spec requirement covered:** § 2.5 (allowed-set definition), § 2.7 (chore-B commit sequence), § 4.2 AC-R29-13 row.
- **Why it passes:** At this Reviewer's moment of test execution, `git diff 778cff8..HEAD --name-only` returns `coordination/NEXT-ROLE.md` and `test/q29-k8s-adapter.test.ts` (chore-B's two modified paths). Both are in `ALLOWED_SET`. The DIAGNOSTIC regex check is a no-op (no DIAGNOSTIC files exist). `violations.length === 0`.
- **Self-confirming risk:** LOW. The test runs an external command (`git diff`) — the production code being verified is the set of git commits, not the test logic itself. The test cannot be self-confirming because the `ALLOWED_SET` was derived from spec § 2.5 BEFORE the implementer wrote production code; if the Implementer had modified `engine/types/verdict.ts` (out of allowed-set), this test would fail. Confirmed by manual `git diff e714703..HEAD --name-only` — all 10 paths in allowed-set; supplementary round-start-to-HEAD check passes (per CLAUDE-COMMON.md REINFORCED 2026-05-17 rule).

---

## § 4. Cross-cutting checks

### TDD discipline

PASS. Git history shows separate RED + GREEN commits:
- `241a882 test(R29): RED commit — 12 stub tests for K8s adapter AC-R29-1..12` (5 files: 4 fixture stubs + test stubs)
- `778cff8 feat(R29): GREEN/chore-A — K8s NodeLabel adapter + 12 AC tests pass` (7 files; production code first appears here)

RED commit deliberately uses `assert.fail('not implemented')` stubs and empty `{"items":[]}` fixture content; production file `engine/topology/k8s-source.ts` does not exist at SHA `241a882`. Verified via `git log 241a882 --stat`. This is the R23-derived separate-RED-commit pattern (CROSS-PROJECT-MEMORIAL REINFORCED 2026-05-18). The Implementer's MEMORIAL entry (line 2376) explicitly attests to RED→GREEN ordering.

### No-skip / halt discipline

PASS. No `.skip`, no `xfail` markers in `test/q29-k8s-adapter.test.ts`. No DIAGNOSTIC files for R29 in `coordination/diagnostics/` (existing diagnostics are R15/R18/R25 — not R29). No `STATUS: ESCALATE` in NEXT-ROLE.md. Implementer's MEMORIAL entry (line 2388) attests to all 7 § 7.1 halt scenarios checked + none fired.

The Implementer's tactical `env` adjustment (MINOR-3 above) IS a deviation that arguably could have warranted a brief DIAGNOSTIC; classified as MINOR because the spec REQUIREMENT was preserved.

### Anti-scope

PASS for the round's diff:
- Round-start-to-chore-A diff (`git diff e714703..778cff8 --name-only`) = 10 paths, all in ALLOWED_SET.
- Chore-A-to-HEAD diff (`git diff 778cff8..HEAD --name-only`) = 2 paths, both in ALLOWED_SET.
- Round-start-to-HEAD supplementary check (per CLAUDE-COMMON.md REINFORCED 2026-05-17 rule about chore-sequence step 7 round-start-bound diff catching pre-chore-A anti-scope mods): 10 paths, all in ALLOWED_SET. No phantom modification.

No vendored-at-pin engine files modified: `engine/types/verdict.ts` unchanged (Approach A1 holds — existing kind literals only); `engine/topology-overlay.ts` unchanged; `engine/core.ts` / `engine/l0/*` unchanged. No pre-R29 test files modified (verified by file list in chore-A `--stat`).

### Architect commit sequencing (R21 ARCH MINOR-1)

PASS. `git log 4d44ef7 --name-only` = `coordination/specs/Q-R29-SPEC.md + Q-R29-SPEC-AUDIT.md` only (commit A). `git log 201a583 --name-only` = `coordination/MEMORIAL.md + coordination/NEXT-ROLE.md` (commit B). Spec landed in its own commit BEFORE routing block.

---

## § 5. Grilling output (self-audit before routing)

- Every finding has a file:line reference? **YES** — MINOR-1 cites `k8s-source.ts:133` + `test/q29-k8s-adapter.test.ts:128-132`; MINOR-2 cites `test/q29-k8s-adapter.test.ts:275-286` + spec § 2.5; MINOR-3 cites `test/q29-k8s-adapter.test.ts:246-251` + spec § 3.2; all OBS items cite specific code lines or spec sections.
- Any AC marked PASS without actual verification? **NO** — every PASS row in § 1 cites either a specific test line range, an empirical TAP `ok N` line, a production-code line, or a direct empirical check (e.g., the helper-node REPL that confirmed `gpu:host-03:5` carries `metadata.host === 'host-03'`).
- Right-reasons audit completed for 3+ tests? **YES** — AC-R29-2, AC-R29-9, AC-R29-13 audited in § 3 with explicit spec-requirement traceability and self-confirming-risk assessment.
- Independence preserved? **YES** — did not read `diagnostics/`, `logs/`, `.prompt-*.md`. Did not read R29 NEXT-ROLE.md attestation content beyond verifying its existence (cold posture).
- Adversarial mandate met? **YES** — surfaced 3 MINOR + 4 OBS findings; not a zero-findings audit. MINOR-1 (AC-R29-6 verification gap) is a non-trivial test-verification weakness the Implementer's MEMORIAL did not self-flag.

All "no" answers absent. Report ready for routing.

---

## § 6. Routing decision

**0 CRITICAL.** **0 MAJOR.** 3 MINOR + 4 OBS — none blocking.

Spec → impl → test traceability holds across all 13 ACs. Binding-command ACs (AC-R29-11, AC-R29-12, AC-R29-13) empirically pass with their literal claims preserved (no false-compliance attestation; per R26 derived rule). Architect Approach-A1 architectural choice (use existing kind literals only) successfully avoided PRD halt #2 and surfaced no cross-cluster vocabulary contention. Implementer's TDD discipline (separate RED commit) + anti-scope diff (all 10 round-start-to-chore-A paths in allowed-set) hold.

**STATUS: MERGE-READY.**

Memorial-Updater should treat MINOR-1 / MINOR-2 / MINOR-3 as VIOLATION entries per the 2026-05-17 CROSS-PROJECT-MEMORIAL "Reviewer MUST also append VIOLATION entries to coordination/MEMORIAL.md for every finding at MINOR severity or above" reinforcement; this Reviewer will append those VIOLATION entries before routing.

---

_End of REVIEWER-REPORT-R29.md._
