# REVIEWER-REPORT-R66 — Phase 3 SLICE 3 Wave 10 WU-Phase3-3C DS→Tessera event consumer + freeze-hook factory

**Round:** R66
**Reviewer session-entry SHA:** `0765209` (HEAD at Reviewer dispatch)
**Spec triad:** `coordination/specs/Q-R66-SPEC.md` + `Q-R66-SPEC-AUDIT.md` + `Q-R66-EMPIRICAL.sh` (committed at `ba28a84`; Option A amendments in `d86cfc6`).
**Deliverable commits:** `df0ded3` (RED) → `75d10bf` (GREEN; chore-A) → `0765209` (Implementer routing chore).

**Verdict:** **STATUS: MERGE-READY** — 0 CRITICAL, 0 MAJOR, 5 MINOR, 4 OBS. Substantive deliverable correct; spec § 8 handoff-inaccuracy disclosure rigorous; halt + Option A discipline honored end-to-end.

---

## § 1 Per-AC verification table

Reviewer re-ran all binding commands at HEAD `0765209` before authoring the table:

- `npx tsc -p tsconfig.test.json` → **exit 0**, zero diagnostics. ✓
- `node --test --test-reporter=tap test/*.test.js` → `tests=444 / pass=438 / fail=3 / skipped=3` (exit 1). 3 fails = AC-R36-30 + AC-R36-31 + AC-R65-2. ✓ matches Implementer attestation.
- `bash coordination/specs/Q-R66-EMPIRICAL.sh` → 14 PASS, 0 FAIL, exit 0. ✓
- `git diff 8f3dd60..HEAD --name-only | sort` → 9 ALLOWED_SET paths + 1 regex carve-out (`DIAGNOSTIC-R66-r65-index-count-regression.md`). ✓
- All 17 R66 ACs individually `ok` in q66 TAP output. ✓

| AC-ID | Criterion (short) | Status | Evidence (file:line or test name) |
|---|---|---|---|
| AC-R66-1 | valid POST → 202 + accepted response | PASS | `q66:80-95`; TAP `ok 1`; event-consumer.ts:267-274 success-path; response asserts 5 fields (status, contract_version, status, freeze_hook_activated, _at_ts) |
| AC-R66-2 | malformed JSON → 400 + `/JSON parse error/` reason | PASS | `q66:98-109`; TAP `ok 2`; event-consumer.ts:244-255 catch path |
| AC-R66-3 | missing event_id → 400 + reason matches `/event_id/` | PASS | `q66:112-124`; TAP `ok 3`; event-consumer.ts:95-97 |
| AC-R66-4 | invalid event_class → 400 + reason matches `/invalid event_class/` | PASS | `q66:127-139`; TAP `ok 4`; event-consumer.ts:98-103 (membership check via VALID_EVENT_CLASSES Set) |
| AC-R66-5 | missing authorization → 401 + reason matches `/authorization/` | PASS | `q66:142-156`; TAP `ok 5`; event-consumer.ts:73-79,227-237 |
| AC-R66-6 | `'activate'` emitted on accept with parsed payload | PASS | `q66:159-174`; TAP `ok 6`; event-consumer.ts:267 emit; subscriber counts exactly 1 event with 3 field assertions |
| AC-R66-7 | `mapEventClassToKind` identity for all 5 values | PASS | `q66:177-183`; TAP `ok 7`; freeze-hook-factory.ts:39-44 (5 distinct `assert.strictEqual` cases) |
| AC-R66-8 | `mapEventClassToKind` throws on unknown | PASS | `q66:186-191`; TAP `ok 8`; freeze-hook-factory.ts:45-49 (`never` default branch) |
| AC-R66-9 | factory state.active false→true on emit | PASS | `q66:194-201`; TAP `ok 9`; freeze-hook-factory.ts:101-114 (handleActivate sets active=true synchronously) |
| AC-R66-10 | factory captures cluster_event_id + until_ts | PASS | `q66:204-215`; TAP `ok 10`; freeze-hook-factory.ts:108-109 (2 distinct assertions) |
| AC-R66-11 | freeze path returns `current` reference-equal | PASS | `q66:218-230`; TAP `ok 11`; freeze-hook.ts:47-48 (`return current`) + factory delegate at freeze-hook-factory.ts:120 |
| AC-R66-12 | delegation path returns different reference | PASS | `q66:233-245`; TAP `ok 12`; freeze-hook.ts:50 → updatePerShardResidual returns new object per runtime.ts:108-114 |
| AC-R66-13 | injected setTimeout callback fires → state.active=false | PASS | `q66:248-268`; TAP `ok 13`; freeze-hook-factory.ts:110-113 (callback body) |
| AC-R66-14 | anti-scope diff ⊆ ALLOWED_SET | PASS | `q66:271-293`; TAP `ok 14`; re-verified at Reviewer HEAD `0765209` |
| AC-R66-15 | engine/events/freeze-hook.ts unmodified | PASS | `q66:296-302`; TAP `ok 15`; Reviewer re-verified `git diff 8f3dd60..HEAD -- engine/events/freeze-hook.ts` = empty |
| AC-R66-16 | path-literal not duplicated; import present | PASS | `q66:305-310`; TAP `ok 16`; event-consumer.ts:17-22 import + 0 inline occurrences of `'/v1/tessera/deploy-events'` verified by Reviewer grep |
| AC-R66-17 | ClusterEventKind ↔ event_class parity | PASS | `q66:313-321`; TAP `ok 17`; 5 literals × 2 files = 10 assert.match calls |

**All 17 ACs PASS at Reviewer HEAD.**

Implicit empirical ACs (§ 5.2; binding-command attestations; amended per Option A):

| Binding command | Spec § 5.2 expected | Reviewer-observed at HEAD `0765209` | Status |
|---|---|---|---|
| `npx tsc -p tsconfig.test.json` | exit 0, zero diagnostics | exit 0, zero diagnostics | PASS |
| `node --test --test-reporter=tap test/*.test.js` | `444/438/3/3` (Option A amended) | `444/438/3/3` | PASS |
| `bash coordination/specs/Q-R66-EMPIRICAL.sh` | 14 PASS, 0 FAIL, exit 0 | 14 PASS, 0 FAIL, exit 0 | PASS |

---

## § 2 Findings

### 2.1 CRITICAL

**None.**

### 2.2 MAJOR

**None.**

### 2.3 MINOR

**MINOR-1 — `freeze_hook_activated: true` is unconditionally returned by `DsEventConsumer` even when no subscriber is wired.**

`engine/ds-integration/event-consumer.ts:267-274` hardcodes `freeze_hook_activated: true` on every accepted POST regardless of whether any `'activate'` handler is attached, and regardless of whether the freeze-hook factory was constructed at all. The contract field's name semantically asserts "the freeze hook was activated", but the consumer cannot know that — only EventEmitter delivery happens at line 267, with no return path from subscribers. If `DsEventConsumer` were used standalone (no factory wired), the response would still claim `freeze_hook_activated: true`.

**Why this is MINOR, not MAJOR:** the spec § 4.1 pseudocode lines 568-576 explicitly prescribes this exact hardcoded literal, so the implementation faithfully follows the spec. Spec § 5.1 AC-R66-1 also requires `freeze_hook_activated === true` in the response. The semantic-vs-literal misalignment is architecturally inherited from the spec — it is the spec, not the implementation, that should clarify. Recommended: spec amendment in a future round to rename the field or amend the JSDoc on `DsToTesseraEventResponse.freeze_hook_activated` to read "the deploy-event was accepted by the consumer and forwarded to any wired freeze-hook subscriber" (subscriber-count agnostic).

**MINOR-2 — `DsEventConsumerEvents` interface declared but never enforced.**

`engine/ds-integration/event-consumer.ts:52-55` exports `DsEventConsumerEvents` (`{ activate: [event: DeployEventPayload]; parse_error: [reason: string] }`), but `DsEventConsumer extends EventEmitter` (line 169) does not use it as a generic parameter. The Node `EventEmitter` accepts any string event name with any args. This means a typo at emit (`this.emit('activte', ...)`) would compile silently. The exported interface is therefore documentation, not a compile-time gate. Either (a) extend a typed EventEmitter form (`EventEmitter<DsEventConsumerEvents>` per Node ≥ 23 typings) or (b) drop the interface to avoid implying a guarantee it does not provide.

**MINOR-3 — Factory state is not fully cleared on deactivation; `cluster_event_id` and `until_ts` linger as stale.**

`engine/ds-integration/freeze-hook-factory.ts:110-113` (timer callback) and `:125-131` (`cancelActivation`) both set `state.active = false` but never clear `state.cluster_event_id` or `state.until_ts`. After deactivation, `getState()` returns `{ active: false, cluster_event_id: 'evt-N', until_ts: T }` — stale identifiers. Per `engine/events/freeze-hook.ts:24-28`, these fields are documented as "informational only" and not consulted by the wrapper's freeze decision, so this is not a correctness bug at the freeze surface. But test inspectors and any future observability hook (e.g., `getState()` consumers checking "which event drove the most-recent freeze") would receive stale data without a way to know the activation has expired. No AC verifies this state-hygiene property. Recommend adding `delete state.cluster_event_id; delete state.until_ts;` to both deactivation paths, OR documenting explicitly in the factory JSDoc that these fields are sticky-after-deactivation.

**MINOR-4 — Test file import ordering: type-only imports appear after `describe(...)` block.**

`test/q66-ds-integration-event-consumer.test.ts:332-333` places `import type { PerShardResidual }` and `import type { ExtendedSampleObservation }` AFTER the `describe(...)` call at line 78-322 and the standalone `freshResidual` / `freshObs` fixture functions. ES modules hoist imports, so this works correctly at runtime, but the layout is contrary to codebase convention (sibling files like `test/q65-ds-integration-feed.test.ts` group imports at top) and obscures the module's dependency graph for a cold reader. Move to the import block at lines 4-22.

**MINOR-5 — Spec § 5.2 amendment leaves the OLD prediction visible as strikethrough alongside the new value.**

`coordination/specs/Q-R66-SPEC.md:1163` reads ``~~expected `tests=444 / pass=439 / fail=2 / skipped=3`~~ [R66-amended per operator Option A 2026-05-20: `tests=444 / pass=438 / fail=3 / skipped=3`]``. The strikethrough is a markdown-rendering convention; the underlying literal text `444/439/2/3` is still present in the file and would match a future grep against the old value. For multi-round attestation-archeology purposes (a future round grepping the spec for "what did R66 predict?"), the dual-value line is mildly confusing. The full disclosure pattern is correct (spec-deviance-disclosure honored), but a follow-up cleanup might render this as a single value with a footnote referencing the resolution chain.

### 2.4 OBS

**OBS-1 — Anti-scope diff PASS includes one regex carve-out path.**

`git diff 8f3dd60..HEAD --name-only | sort` includes `coordination/diagnostics/DIAGNOSTIC-R66-r65-index-count-regression.md`. This is explicitly allowed by Q-R66-SPEC § 3.2 regex carve-out (and the AC-R66-14 test filters it). The diagnostic was emitted during the ESCALATE that surfaced AC-R65-2's carry-forward fragility — discipline-honored.

**OBS-2 — Two Tessera instances of "spec AC pattern that doesn't survive round evolution" (R62 + R66).**

R62 AC-R62-15 was structurally-vacuous (forward-protection diff against empty range); R66 surfaced AC-R65-2's structurally-fragile live-file-count pattern (asserts `=== 3` against a file every future round may legitimately append to). Both are spec-design patterns that don't survive multi-round evolution. NEXT-ROLE.md:100 flags this for the Memorial-Updater at R66 close (cross-project promotion at 3rd instance per Rule 5 threshold). Operator should ensure this lesson lands in the right cross-project disposition.

**OBS-3 — Handoff-doc inaccuracy pattern recurrent within Wave 10.**

R65 found 4 field-name inaccuracies in `CLUSTER-HANDOFF-WAVE10-3A-3B.md` against `feed-contract.ts`; R66 finds 4 different material inaccuracies in `CLUSTER-HANDOFF-WAVE10-3A-3C.md` against `event-contract.ts` + `freeze-hook.ts` (spec § 8.1.1-8.1.4). Both wave-cluster Architects independently applied claim-then-walk and surfaced the divergences. MEMORIAL.md:1194 R66 Architect's own OBS entry flags this as a candidate for a CLAUDE-COORDINATOR.md reinforcement (Coordinator handoff-emit should Read actual source files, not inherit from prior testimony). 2 instances within a single wave warrants the Memorial-Updater's attention.

**OBS-4 — AC-R66-12 does not directly verify delegation to `freezeAwareUpdatePerShardResidual`; verifies only reference inequality.**

`test/q66-ds-integration-event-consumer.test.ts:233-245` asserts `assert.notStrictEqual(result, current)`. A pathological implementation that returned `{...current}` without delegating to the real update function would still pass. The right-reasons audit in spec § 5.4 documents this discriminator as "discriminating against 'returned current itself (freeze path)'" — adequate for distinguishing the freeze branch from the delegation branch, but not for proving delegation correctness. Coverage of the delegation contract (n_samples increment, welford_state population) lives further downstream in q03/q04/q05 tests of the wrapped function itself, so the gap is bounded.

---

## § 3 Right-reasons audit (3 tests)

### 3.1 AC-R66-1 — server accepts valid POST and responds 202 + accepted response

- **Spec requirement traced:** § 5.1 AC-R66-1 (Given/When/Then: valid envelope + valid auth → 202 + 4 response fields); § 4.1 pseudocode lines 568-576.
- **Self-confirming check:** the test does NOT re-implement the consumer's body construction; it constructs an envelope via `makeValidEnvelope()` (independent test helper at q66:38-44) and asserts against the wire-format response. Each of the 5 assertions (`status`, `contract_version`, `status`, `freeze_hook_activated`, `freeze_hook_activated_at_ts` typeof) is independent of the consumer's internal construction. PASS.

### 3.2 AC-R66-11 — freeze path returns `current` reference-equal

- **Spec requirement traced:** § 5.1 AC-R66-11 + freeze-hook.ts:47-48 (`return current` when `config.freeze_hook_enabled === true && freezeState.active === true`).
- **Self-confirming check:** the test asserts `result === current` via reference equality. A pathological implementation that returned a shallow clone with identical fields would fail this assertion. The test discriminates the freeze branch from the delegation branch (which constructs a new object at runtime.ts:108-114). PASS.

### 3.3 AC-R66-15 — engine/events/freeze-hook.ts unmodified since round-start

- **Spec requirement traced:** § 3.1 anti-scope item 1 + halt #4 (no freeze-hook body modification); spec § 5.1 AC-R66-15.
- **Self-confirming check:** the test runs `git diff 8f3dd60..HEAD --name-only -- engine/events/freeze-hook.ts` and asserts the result is the empty string. This is a structural property of the codebase, not a property of any other test in q66 — it cannot pass via test-internal collusion. Reviewer independently re-ran the diff at HEAD `0765209` and confirmed empty. PASS.

**No self-confirming tests detected** across the 17-test suite.

---

## § 4 Cross-cutting checks

### 4.1 TDD discipline

`git log --oneline` shows the canonical sequence:
1. `df0ded3` test(R66 RED): 17 `assert.fail` stubs; production files do not exist.
2. `d86cfc6` chore(R66): Option A spec-triad amendment after ESCALATE.
3. `75d10bf` impl(R66): event-consumer.ts + freeze-hook-factory.ts + index.ts + 17 real test assertions — GREEN chore-A.
4. `0765209` chore(R66): Implementer routing + MEMORIAL entries.

Separate-RED-commit discipline (R23 IMPL MINOR-1) honored: the RED commit precedes the GREEN commit; the production files are not present at the RED commit (Reviewer verified `df0ded3` does NOT contain `engine/ds-integration/event-consumer.ts`).

### 4.2 Halt-discipline

Halt fired correctly when the AC-R65-2 live-file-count regression surfaced (halt #1 + #3). `coordination/diagnostics/DIAGNOSTIC-R66-r65-index-count-regression.md` was written with 3 bounded options + Implementer recommendation. STATUS: ESCALATE was set. Operator chose Option A; spec-triad amendments landed in `d86cfc6` (ALLOWED_SET files only; no anti-scope expansion). EMPIRICAL.sh re-run after amendments confirmed exit 0. **No silent workaround.** Discipline honored end-to-end.

### 4.3 Anti-scope

`git diff 8f3dd60..HEAD --name-only | sort` at Reviewer HEAD `0765209`:

```
coordination/MEMORIAL.md
coordination/NEXT-ROLE.md
coordination/diagnostics/DIAGNOSTIC-R66-r65-index-count-regression.md   ← regex carve-out (allowed)
coordination/specs/Q-R66-EMPIRICAL.sh
coordination/specs/Q-R66-SPEC-AUDIT.md
coordination/specs/Q-R66-SPEC.md
engine/ds-integration/event-consumer.ts
engine/ds-integration/freeze-hook-factory.ts
engine/ds-integration/index.ts
test/q66-ds-integration-event-consumer.test.ts
```

10 paths total = 9 ALLOWED_SET + 1 diagnostic carve-out. **No unauthorized path.** All frozen surfaces verified unmodified by Reviewer:
- `engine/events/freeze-hook.ts` — empty diff. ✓
- `engine/ds-integration/event-contract.ts` — empty diff. ✓
- `engine/ds-integration/feed-contract.ts` — empty diff. ✓
- `engine/ds-integration/feed.ts` (R65 sibling) — empty diff. ✓
- `engine/events/event-feed.ts` — empty diff. ✓
- `engine/types/verdict.ts` — empty diff. ✓

R36 MAJOR-2 ALLOWED_SET non-expansion discipline preserved (Implementer did not add `test/q65-ds-integration-feed.test.ts` to ALLOWED_SET to "fix" AC-R65-2; chose Option A which kept all modifications inside ALLOWED_SET).

### 4.4 Claim-then-walk discipline (Architect R62 lesson)

R66 Architect surfaced 4 handoff-doc inaccuracies in CLUSTER-HANDOFF-WAVE10-3A-3C.md (spec § 8.1.1-8.1.4) by direct file Read against `event-contract.ts` and `freeze-hook.ts`. Spec uses ACTUAL codebase surfaces throughout; handoff claims rejected in favor of empirical reality. Discipline honored at upstream spec-emit time (preventing downstream Implementer rework).

### 4.5 Cross-project rule self-application (Reviewer verification)

| Rule | Disposition | Verification |
|---|---|---|
| 1 (`empirical-command-attestation`) | PASS | Implementer encoded actual `444/438/3/3` verbatim, not reframed; Option A amendment fully disclosed |
| 2 (`architect-branch-binding-coverage`) | PASS | § 5.3 table; 5 acknowledged non-load-bearing gaps with rationale; load-bearing branches all covered |
| 3 (`implementer-spec-test-assertion-coverage`) | PASS | Discriminating assertions; one minor coverage gap (OBS-4) |
| 4 (`anti-scope-allowed-set-forward-coverage`) | PASS | 9-path ALLOWED_SET + 1 regex carve-out; no in-test expansion |
| 5 (`rule-derivation-without-self-application`) | N/A | No new rule derived at R66 spec/impl stages; Memorial-Updater may derive at close (2nd "spec AC doesn't survive round evolution" instance — OBS-2) |
| 6 (`halt-discipline-no-DIAGNOSTIC-for-workaround`) | PASS | ESCALATE fired; DIAGNOSTIC written; operator-resolved Option A; amendments applied per directive |
| 7 (`derived-rule-propagation-mechanism-required`) | PASS | Surface (a) + (b) executed; Surface (c) conditional at MU stage |

---

## § 5 Grilling output (Reviewer adversarial self-review of this report)

- Every finding has a file:line reference? **YES.** MINOR-1: event-consumer.ts:267-274. MINOR-2: event-consumer.ts:52-55,169. MINOR-3: freeze-hook-factory.ts:110-113,125-131. MINOR-4: q66:332-333. MINOR-5: Q-R66-SPEC.md:1163. OBS-1: diff path enumerated. OBS-4: q66:233-245.
- Any AC marked PASS without actual verification? **NO.** Reviewer re-ran tsc + node --test + EMPIRICAL.sh + per-AC TAP scan + git diff at HEAD `0765209` before authoring the table; each AC row cites a concrete file:line and the corresponding TAP `ok` line.
- Right-reasons audit completed for 3+ tests? **YES.** AC-R66-1 + AC-R66-11 + AC-R66-15 traced to spec requirements; self-confirming-test check executed for each.
- Adversarial frame applied? **YES.** Findings include semantic-correctness concerns (MINOR-1 `freeze_hook_activated` always-true), type-safety concerns (MINOR-2 EventEmitter typing), and state-hygiene concerns (MINOR-3 stale `cluster_event_id`/`until_ts`) that an Implementer-aligned reading would have missed.

---

## § 6 Routing

**STATUS: MERGE-READY**
**NEXT-ROLE: MEMORIAL-UPDATER**

0 CRITICAL findings; no halt condition fires at Reviewer audit. R66 substantive deliverable is correct; spec discipline + halt discipline + anti-scope discipline + claim-then-walk discipline all honored across the round. 5 MINOR findings are documentation-and-hygiene-grade improvements, none blocking merge or shipment.

### Memorial-Updater inputs

1. `coordination/reviews/REVIEWER-REPORT-R66.md` (this file)
2. `coordination/MEMORIAL.md` (R66 ARCHITECT + IMPLEMENTER entries already appended; Reviewer entries to be appended in this routing chore)
3. `coordination/specs/Q-R66-SPEC.md` + `Q-R66-SPEC-AUDIT.md` + `Q-R66-EMPIRICAL.sh`
4. `coordination/NEXT-ROLE.md` (Implementer attestation + Architect attestation)
5. `coordination/diagnostics/DIAGNOSTIC-R66-r65-index-count-regression.md`

### Expected Memorial-Updater attention

- **OBS-2 reinforcement candidate:** 2 Tessera instances of "spec AC pattern that doesn't survive round evolution" (R62 forward-protection vacuous; R66 live-file-count fragile). Cross-project promotion at 3rd instance per Rule 5; MU should account this as a 2nd Tessera-local datapoint and consider whether the Tessera reinforcement-rule sub-class derivation threshold has been reached for `architect-ac-pattern-round-evolution-fragility`.
- **OBS-3 reinforcement candidate:** 2 Wave-10 instances of CLUSTER-HANDOFF doc inaccuracy (R65 + R66). MEMORIAL.md:1194 R66 ARCHITECT OBS already flags this for MU attention. Candidate for CLAUDE-COORDINATOR.md REINFORCED entry: "Coordinator handoff-emit must Read actual source files for interface-surface claims; do not inherit from prior testimony."
- **MINOR-1 spec amendment candidate (separate future round):** `DsToTesseraEventResponse.freeze_hook_activated` field semantics-vs-literal misalignment. Not in-scope for R66 MU.
- Standard ROUND-R66-SUMMARY.md authoring; CLAUDE-*.md REINFORCED accretion if any sub-class threshold crossed.
