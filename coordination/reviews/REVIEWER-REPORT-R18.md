# REVIEWER-REPORT-R18 — Phase 2 SLICE 1 (topology substrate + cluster_event_id + v9X fixture)

**Reviewer cold-read inputs:**
- `coordination/PRD.md`
- `coordination/specs/Q-R18-SPEC.md` (full)
- `coordination/specs/Q-R18-SPEC-AUDIT.md` (Architect ceremony sidecar — load-bearing for Reviewer per CLAUDE-REVIEWER.md; see OBS-3 below)
- All `engine/types/verdict.ts` (full 322 lines)
- `test/q18-phase2-slice1-topology-substrate.test.ts` (full)
- `test/_substrate/v9X-cluster.ts` (full)
- `test/q01-no-at-pin-deltas.test.ts` (full — modified by R18 Option A unblock)
- `coordination/VENDORING-MANIFEST.md` (modified row inspected via `git diff`)
- `coordination/NEXT-ROLE.md` (full)
- `coordination/MEMORIAL.md` R18 sections (Architect + Implementer)
- `~/.claude/CROSS-PROJECT-MEMORIAL.md` (Reviewer-section grep for missed-issue classes)
- git log b640c6c..HEAD; `git show` on each R18 commit for diff verification
- Binding commands re-run cold: `npx tsc --noEmit` (exit 0); `node --test test/*.test.js` (181/0)

**Inputs deliberately NOT consulted (cold-review discipline):**
- `coordination/diagnostics/DIAGNOSTIC-R18-no-at-pin-deltas-verdict.md` (existence-acknowledged only)
- `coordination/OVERNIGHT-LOG-2026-05-17.md` (existence-acknowledged only)
- Prior-round Reviewer reports R02–R17 (cold-start)
- `.prompt-*.md` files

---

## 1. Per-AC verification table

All 12 R18 ACs verified at HEAD `9012faa` (working tree clean).

| AC-ID | Criterion (short) | Status | Evidence |
|---|---|---|---|
| AC-R18-1 | TopologyNode.kind accepts `'gpu_shard'` and `'rack'` | PASS | `engine/types/verdict.ts:236` union extended; `test/q18-…:26-31` typechecks + asserts; runtime test pass (see test output). See OBS-1 — runtime asserts are trivially-true; real binding is AC-R18-11. |
| AC-R18-2 | TopologyEdge.relationship accepts `'contains'` | PASS | `engine/types/verdict.ts:246` union extended; `test/q18-…:33-36` typechecks + asserts; runtime test pass. (Same OBS-1 caveat.) |
| AC-R18-3 | VerdictGroup adds optional `cluster_event_id` | PASS | `engine/types/verdict.ts:201-209` optional field added before `closed:` per spec § 2.1 Delta 3; `test/q18-…:38-69` constructs literals with set + omitted, asserts both behaviors; runtime test pass. |
| AC-R18-4 | `makeV9XSingleRackCluster()` default = 1 rack + 10 gpu_shards + 10 contains edges | PASS | `test/_substrate/v9X-cluster.ts:22-59`; `test/q18-…:71-90` asserts node/edge counts, kinds, ids, source_id, source_version; runtime test pass. |
| AC-R18-5 | `makeV9XSingleRackCluster({ nShards: 20 })` = 1 rack + 20 gpu_shards + 20 contains edges | PASS | `test/q18-…:92-99` asserts node count 21, edge count 20, last-shard id `shard-19`; runtime test pass. |
| AC-R18-6 | `computeSnapshotHash` on v9X fixture deterministic | PASS | `test/q18-…:101-107` computes hash twice and asserts equality + 64-hex-char shape; runtime test pass. |
| AC-R18-7 | Inherited D5 group_id format preserved at `engine/verdict-groups.ts` | PASS | `test/q18-…:109-112` greps file content for `/group-\$\{deployId\}-\$\{window_start_ts\}/`; runtime test pass. Verified `engine/verdict-groups.ts` UNCHANGED in `git diff b640c6c..HEAD --name-only`. |
| AC-R18-8 | Inherited D4 `correlational_not_causal: true;` literal-type preserved | PASS | `test/q18-…:114-117` greps `engine/types/verdict.ts` for `/correlational_not_causal:\s*true;/`; runtime test pass. Field still at verdict.ts:280. |
| AC-R18-9 | All 40 vendored files retain SHA pin in first line | PASS | `test/q18-…:119-140` parses manifest (40 paths) + asserts each file's line 1 matches `/VENDORED FROM DeploySignal main@5a72371/`; runtime test pass. Manifest line count cross-verified: 38 `vendored-at-pin` + 2 `vendored-with-deltas` = 40. |
| AC-R18-10 | `git diff b640c6c..HEAD --name-only` ⊆ allowed-set | PASS (with MINOR-1 caveat) | Allowed-set has 15 entries (spec § 4.3 prescribed 10); current diff (11 paths, all in allowed-set); runtime test pass. See MINOR-1 below for the 5-entry expansion. |
| AC-R18-11 | `npx tsc --noEmit` exits 0 | PASS | Reviewer re-ran cold: exit 0, zero output. |
| AC-R18-12 | `node --test test/*.test.js` = 181 pass / 0 fail; q18 file = 10/0 | PASS | Reviewer re-ran cold: `ℹ tests 181 / ℹ pass 181 / ℹ fail 0`; q18 file produced 10/10. See MINOR-2 + MINOR-3 below for attestation gaps. |

**Summary:** 12/12 ACs PASS at runtime. The implementation correctness contract is satisfied; the findings below concern attestation completeness and spec/test drift, not functional correctness.

---

## 2. Findings

### MINOR-1 — AC-R18-10 allowed-set expanded 10→15 entries without spec amendment

**Where:** `test/q18-phase2-slice1-topology-substrate.test.ts:143-161`

Spec § 4.3 prescribes a 10-entry allowed-set. The shipped test has 15 entries — 5 extras added with the inline comment "Operator-side artifacts added during R18 ESCALATE → Option A unblock cycle":

1. `coordination/OVERNIGHT-LOG-2026-05-17.md`
2. `coordination/diagnostics/DIAGNOSTIC-R18-no-at-pin-deltas-verdict.md`
3. `test/q01-no-at-pin-deltas.test.ts`
4. `test/q01-no-at-pin-deltas.test.js`
5. `coordination/VENDORING-MANIFEST.md`

Two of those (rows 3 + 5) fall directly under spec § 6 anti-scope:
- "Modification of any prior-round test file (q01-q17, betting-e-process-class-dispatch) | spec-internal HALT"
- Spec § 3 component inventory rows `coordination/VENDORING-MANIFEST.md | UNCHANGED | … no rows added | AC-R18-9` — but the row was changed (`vendored-at-pin` → `vendored-with-deltas` plus a note column).

The Implementer correctly escalated (commit `dd21cb5`) and the operator dispositioned Option A (commit `5aa8cf0`). The audit trail is complete in `MEMORIAL.md` and the unblock commit message. However, the spec was not formally amended — the AC-R18-10 allowed-set in the test was edited unilaterally to absorb the operator-dispositioned files. The cleaner path per Anchor methodology is a spec amendment (spec § 6 Amendments-from-prior-version section) followed by re-running affected ACs; the Implementer skipped the amendment step.

**Net effect on the contract:** AC-R18-10 still binds anti-scope (subset-of-allowed); the test would still catch a *truly* unexpected file. But the original spec contract was tightened by the unblock without a paper trail in the spec itself.

### MINOR-2 — Per-file OBSERVED test counts missing from Implementer attestation

**Where:** `coordination/NEXT-ROLE.md:31-35`

Spec § 5 AC-R18-12: *"Implementer reports per-file OBSERVED counts (per R03 MINOR-4 reinforcement); if observed total differs from 181 the Implementer halts with DIAGNOSTIC."*

NEXT-ROLE.md OBSERVED section reports only the aggregate (`Total: 181/0`) with no per-file enumeration. R03 MINOR-4 reinforcement was specifically designed to surface drift in any single test file's count — the aggregate-only report defeats the purpose. (Reviewer re-ran per-file and obtained the expected breakdown; see also MINOR-3.)

### MINOR-3 — NEXT-ROLE.md aggregate decomposition is mathematically wrong

**Where:** `coordination/NEXT-ROLE.md:33`

The OBSERVED block states: *"Total: 181/0 (was 168/0 pre-R18; +13 from q18 12 ACs + q14-pr-f5-storage +1 increment per R16 leftover)"*

- "168/0 pre-R18" contradicts spec § 5 AC-R18-12 + spec § 9.1 which both cite **171** as the pre-R18 baseline (3+1+5+6+13+11+13+13+23+11+18+16+14+6+7+4+2+5 = 171, confirmed by spec grilling table).
- "+13 from q18 12 ACs" is wrong on two counts: q18 has **10** runtime tests (not 12, not 13). AC-R18-11/12 are binding-command attestations, not runtime tests.
- "+1 increment per R16 leftover" is unverifiable (no R16 leftover modification appears in `git diff b640c6c..HEAD`).
- The total (181) is correct; the decomposition is not.

Reviewer-verified per-file counts (cold): 5+1+5+3+6+13+11+13+13+23+11+18+16+14+6+7+4+2+10 = **181**, with pre-R18 = **171** and q18 = **10**, matching the spec exactly. The NEXT-ROLE.md narrative is internally inconsistent with the spec and with reality.

### MINOR-4 — Implementer MEMORIAL section lacks CONFIRMATION entries

**Where:** `coordination/MEMORIAL.md:1704-1706`

Per CLAUDE-COMMON.md "Memorial accretion": *"After completing your role's work, append … CONFIRMATION: … VIOLATION: … Be specific."* The Architect appended ~15 CONFIRMATION entries (lines 1672-1702). The Implementer section consists of one VIOLATION entry and nothing else — no CONFIRMATION rows for disciplines that *did* fire correctly (TDD ordering at c9827a9 RED, ESCALATE-discipline at dd21cb5, operator-disposition adherence in 5aa8cf0, typecheck/test re-run after unblock, etc.). The asymmetry leaves the audit trail thinner than it should be; Memorial-Updater will need to reconstruct the confirmations from commit history rather than read them.

A related observation: the Implementer's self-classified VIOLATION wording ("applied all four deltas … before running the test suite") is borderline — spec § 4.4 explicitly directs batch-apply-then-run, not incremental verification. The genuine gap is the spec's incomplete failure-mode analysis (see OBS-2), not the Implementer ignoring a halt. This isn't a Reviewer finding to upgrade or downgrade — the Memorial Updater should decide whether the violation classification fits or needs re-framing per the 2026-05-16 CLAUDE-COMMON.md reinforcement on self-written entries.

### OBS-1 — AC-R18-1 / AC-R18-2 runtime assertions are tautological at the .js layer

**Where:** `test/q18-phase2-slice1-topology-substrate.test.ts:26-36`

```ts
const gpuShardKind: TopologyNode['kind'] = 'gpu_shard';
assert.strictEqual(gpuShardKind, 'gpu_shard');
```

The compiled `.js` strips the type annotation and the assertion becomes `assert.strictEqual('gpu_shard', 'gpu_shard')` — a tautology that cannot fail at runtime regardless of the production code. The real contract (union extension) binds at typecheck (AC-R18-11). If verdict.ts were reverted to remove `'gpu_shard'`, AC-R18-1 would still PASS in `node --test`; only `npx tsc --noEmit` would fail.

This matches the "trivially-satisfying assertion" sub-class catalogued in CROSS-PROJECT-MEMORIAL.md (R22 MINOR-1 and earlier variants). Spec § 5 explicitly co-binds typecheck + strictEqual, so the Implementer wrote what was specified — surfacing as OBS rather than MINOR because the bookkeeping is spec-acknowledged, not silent.

### OBS-2 — Spec § 1 failure-mode 5 considered wrong q01 test

**Where:** `coordination/specs/Q-R18-SPEC.md:100`

Spec failure mode 5: *"Header annotation breaks `q01-vendoring-coverage` test. Mitigated: annotation ADDS lines below the existing 5-line vendoring header block; the canonical first-line `// VENDORED FROM ... 5a72371` is byte-identical."*

The test that actually broke at GREEN was `q01-no-at-pin-deltas.test.ts` (byte-identity-modulo-header check, not first-line check). The Architect's pre-emit grilling examined a similarly-named but distinct test and missed the real regression surface. This is documented in `MEMORIAL.md:1706` (Implementer self-confession) and reflected in the spec's incomplete consumer enumeration of `engine/types/verdict.ts`. Resolution worked correctly (ESCALATE → operator Option A → unblock), so no further action is required; logging here for the audit trail and Architect-side reinforcement candidacy.

### OBS-3 — NEXT-ROLE.md instructs Reviewer NOT to read SPEC-AUDIT, contradicting CLAUDE-REVIEWER.md

**Where:** `coordination/NEXT-ROLE.md:16`

NEXT-ROLE.md line 16 says: *"DO NOT read `coordination/specs/Q-R18-SPEC-AUDIT.md` per CLAUDE-REVIEWER.md cold-implementation boundary (audit sidecar is Architect ceremony — optional)"*.

The actual `CLAUDE-REVIEWER.md` block (loaded as system prompt for this session) says: *"Read ALL of: … `coordination/specs/Q-RNN-SPEC-AUDIT.md` (Architect ceremony sidecar — discipline output, decision rationale, amendments — **load-bearing for your audit** even though the Implementer doesn't read it)."*

The system prompt is authoritative; I read the audit sidecar. The NEXT-ROLE.md instruction is a misreading of CLAUDE-REVIEWER.md and should be removed in the next round so it doesn't induce a future Reviewer to skip a load-bearing input. (The R18 audit sidecar is useful — it carries the citation-accuracy notes that explain why spec line citations differ from NEXT-ROLE.md citations.)

### OBS-4 — AC-R18-9 manifest-parsing differs from spec § 4.3 pseudocode

**Where:** `test/q18-phase2-slice1-topology-substrate.test.ts:119-140`

Spec § 4.3 prescribes a single anchored regex `/\|\s*(tessera\/engine\/[^|`\s]+\.ts)\s*\|/`. The shipped test uses a different approach: filter for `vendored-at-pin`-or-`vendored-with-deltas` substring on each pipe-row, then take `cells[1]` and check `.ts` suffix. Both yield 40 today (confirmed). The implementation is closer to the q01-vendoring-coverage pattern, which is reasonable. Documenting for completeness — the spec explicitly allowed adaptation ("If the manifest's exact parsing pattern needs adjustment based on the actual manifest table format, the Implementer adapts the regex …"). The contract binds outcome (40 paths × first-line SHA pin), not parsing implementation. No action required.

### OBS-5 — VENDORING-MANIFEST.md status update is spec-deviation but policy-consistent

**Where:** `coordination/VENDORING-MANIFEST.md:29`

Spec § 3 component inventory lists VENDORING-MANIFEST.md as UNCHANGED. The Implementer changed one row (verdict.ts: `vendored-at-pin` → `vendored-with-deltas`) as part of the Option A unblock. This is consistent with SCOPING-MEMO-v0.3 § 9.4 vendoring policy intent (Delta 4 in the spec is itself the file-side companion of the manifest-side status change). The deviation is bookkeeping-only: the spec's UNCHANGED claim and the operator-dispositioned modification are not reconciled in a spec amendment.

---

## 3. Right-reasons audit

Three tests selected from `test/q18-phase2-slice1-topology-substrate.test.ts`:

### Test A — AC-R18-1 (TopologyNode.kind union extension)

- **Spec requirement traced:** § 2.1 Delta 1 (kind union extends with `'gpu_shard' | 'rack'`).
- **Is the test passing because the code is correct?** Partially. The `const k: TopologyNode['kind'] = 'gpu_shard';` line binds at typecheck; if the union were reverted, the file would fail `tsc`. But the runtime `assert.strictEqual(gpuShardKind, 'gpu_shard')` compares a literal to itself — it would pass regardless of `engine/types/verdict.ts`'s current state.
- **Verdict:** Self-confirming at the runtime layer; real coverage is via AC-R18-11 (typecheck). Surfaced as OBS-1.

### Test B — AC-R18-4 (v9X default-shape fixture)

- **Spec requirement traced:** § 2.2 (default cluster: 1 rack + 10 gpu_shards + 10 contains edges + canonical source_id/version).
- **Is the test passing because the code is correct?** Yes. The test calls the production helper `makeV9XSingleRackCluster()` and asserts properties of the returned object: `nodes.length === 11`, `edges.length === 10`, per-shard ids, per-edge `relationship === 'contains'` and `from === 'rack-0'`, `source_id`/`source_version` strings. A regression in any of those would surface — off-by-one shard count, wrong relationship value, wrong source_id, missing edges. Not self-confirming.
- **Verdict:** Sound.

### Test C — AC-R18-7 (D5 group_id format preserved at engine/verdict-groups.ts)

- **Spec requirement traced:** spec § 1 + § 2.1 Delta 3 comment block + spec § 5 AC-R18-7 — inherited Addition #25 D5 group_id format `group-{deploy_id}-{window_start_ts}` retained because verdict-groups.ts is untouched.
- **Is the test passing because the code is correct?** Yes. The test reads `engine/verdict-groups.ts` from disk and greps for `/group-\$\{deployId\}-\$\{window_start_ts\}/`. The template-literal substring would be absent if someone amended D5 to a different format. Cross-verified that `verdict-groups.ts` is not in `git diff b640c6c..HEAD --name-only`.
- **Verdict:** Sound.

**Right-reasons audit conclusion:** 1 of 3 tests has a self-confirming aspect (Test A → OBS-1), spec-acknowledged. Tests B + C are non-self-confirming. The 3-test sample successfully surfaced the OBS-1 pattern.

---

## 4. Cross-cutting checks

### TDD discipline

RED commit precedes GREEN:
- `c9827a9` (RED): adds `test/q18-…test.ts` with 10 `assert.fail('RED: ...')` placeholders, no production code changes. Verified by `git show c9827a9 --stat` (1 file changed, +64 lines, no engine/ or _substrate/ files).
- `dd21cb5` (GREEN + ESCALATE): replaces placeholders with real bodies, applies Deltas 1-4 to `engine/types/verdict.ts`, creates `test/_substrate/v9X-cluster.ts`. The commit also documents the q01 regression and routes to ESCALATE.
- `5aa8cf0` (unblock): applies Option A changes (q01 test list, manifest row, AC-R18-10 allowed-set).

TDD ordering preserved for the new q18 file. The unblock-cycle modifications to existing q01 / manifest / AC-R18-10 are *infrastructure modifications*, not new-test additions, so RED→GREEN doesn't apply to those rows.

### No-skip / halt discipline

Implementer correctly applied halt-discipline at the q01 byte-identity regression: wrote DIAGNOSTIC, set STATUS: ESCALATE, formulated a bounded question with Option A vs Option B, did not proceed unilaterally. Operator disposition was respected. ✓

### Anti-scope

`git diff b640c6c..HEAD --name-only` yields 11 paths:
- `coordination/MEMORIAL.md`, `coordination/NEXT-ROLE.md`, `coordination/OVERNIGHT-LOG-2026-05-17.md`, `coordination/VENDORING-MANIFEST.md`, `coordination/diagnostics/DIAGNOSTIC-R18-no-at-pin-deltas-verdict.md`, `coordination/specs/Q-R18-SPEC-AUDIT.md`, `coordination/specs/Q-R18-SPEC.md`, `engine/types/verdict.ts`, `test/_substrate/v9X-cluster.ts`, `test/q01-no-at-pin-deltas.test.ts`, `test/q18-phase2-slice1-topology-substrate.test.ts`.

All 11 are in the (expanded) AC-R18-10 allowed-set. 2 of them (q01 test + VENDORING-MANIFEST.md) were spec-anti-scoped at session start and only became permissible via the operator's Option A disposition — see MINOR-1. Compiled `.js` siblings are gitignored (per `.gitignore` line `*.js`); they exist on disk and `node --test` runs them.

No silent scope creep beyond what's documented in the unblock commit message.

---

## 5. Grilling (self-review on this report)

- Every finding has a file:line reference? **Yes** — each MINOR/OBS includes a "Where:" line citing a specific file and line range.
- Any AC marked PASS without actual verification? **No** — every AC row in §1 cites either a file:line where the criterion was met OR a re-run binding command result.
- Right-reasons audit completed for 3+ tests? **Yes** — Tests A, B, C with spec traceability + self-confirming check.
- Did I confirm cold-review boundary? **Yes** — read only inputs listed in §0; did not consult diagnostics file, overnight log, or any `.prompt-*.md`.
- Did I re-run the binding commands cold? **Yes** — `npx tsc --noEmit` exit 0; `node --test test/*.test.js` 181/0; per-file count enumeration via loop. Outcomes match the contract.
- Did I find at least one issue? **Yes** — MINOR-1 (allowed-set expansion without spec amendment) and MINOR-3 (math-incorrect aggregate decomposition) are substantive findings the Implementer attestation did not surface.

---

## 6. Routing decision

**0 CRITICAL + 0 MAJOR + 4 MINOR + 5 OBS.**

Per CLAUDE-REVIEWER.md routing rule (`CRITICAL exists → ESCALATE; MAJOR or below → MERGE-READY`):

**STATUS: MERGE-READY**

Functional contract (12/12 ACs PASS, typecheck clean, 181/0 tests) is satisfied. Findings concern attestation completeness and spec/test drift around the operator-dispositioned ESCALATE → Option A unblock cycle — they do not block merge but should be picked up in R19 / SLICE 1 close-walk:

1. **R19 ARCHITECT:** consider formalizing the AC-R18-10 allowed-set expansion via a Q-R18-SPEC amendment block (MINOR-1) and reconciling the spec § 3 inventory "UNCHANGED" claim on VENDORING-MANIFEST.md (OBS-5).
2. **R19 IMPLEMENTER:** restore the R03 MINOR-4 per-file OBSERVED count enumeration in NEXT-ROLE.md (MINOR-2) and avoid the kind of aggregate decomposition error in MINOR-3 (count drift is precisely what per-file enumeration catches).
3. **Methodology / Memorial-Updater:** the NEXT-ROLE.md "DO NOT read SPEC-AUDIT" instruction (OBS-3) contradicts CLAUDE-REVIEWER.md and should be removed in R19's NEXT-ROLE.md template work. The Implementer MEMORIAL section gap (MINOR-4) should be backfilled by the Memorial-Updater so the audit trail isn't lopsided.
4. **Architect-side reinforcement candidate:** spec failure-mode analysis missed `q01-no-at-pin-deltas` (OBS-2). The fix is a "for every test that opens-and-reads an engine/ file, enumerate the assertion surface against the planned delta" check.

---

_End of REVIEWER-REPORT-R18.md._
