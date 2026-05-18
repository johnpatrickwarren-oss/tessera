# Q-R20-SPEC-AUDIT.md — Architect ceremony sidecar

Companion to `Q-R20-SPEC.md`. Per CLAUDE-ARCHITECT.md convention, this sidecar carries audit-trail content the Implementer does NOT need to read to act on the spec. Reviewer reads both files; Memorial-Updater reads as needed.

---

## 1. Inputs consulted (cold-start at session entry)

| Artifact | Read mode | Purpose |
|---|---|---|
| `coordination/PRD.md` | full (93 lines) | FR-E3a + US-01 + AC-P4 + anti-scope A12/A14/A16/A17 |
| `coordination/NEXT-ROLE.md` | full (85 lines) | Operator-set R20 round-scope-directive, anti-scope, 6 architectural questions, routing notes, readiness state |
| `coordination/MEMORIAL.md` | targeted offset reads (lines 1700-1820, R18 + R19 sections) + line-count probe | R18 ESCALATE-cycle context; R19 4-MAJOR cluster origins + reinforcement application; halt-discipline + anti-scope + memorial-self-exoneration cross-references |
| `~/.claude/CROSS-PROJECT-MEMORIAL.md` | grep for "Reinforcement rules derived" (78 section headings located) + targeted offset reads (lines 2700-2820, R17-R19 sections); file size 518.5KB exceeds 256KB single-read limit | Architect-relevant reinforcements via CLAUDE-ARCHITECT.md REINFORCED tail; R18 OBS-2 + R19 MAJOR cluster context |
| `coordination/SCOPING-MEMO-v0.3.md` | offset 1-450 + targeted offset 400-616 | § 1.6 REVIEWER-ANCHOR table; § 2.3 Extension 3 + Phase 2 SLICE 2 scope (line 345); § 9 vendoring policy (lines 545-602); Q-J6 disposition (line 446) |
| `coordination/PHASE-2-SLICE-1-CLOSE-WALK.md` | full (193 lines) | § 1 R18 deliverables context; § 2 ESCALATE-and-unblock pattern; § 2 anti-scope diff-range SHA anchoring (TQ-4 γ); § 3 SLICE 2 entry framing; § 4 R18 MINOR dispositions; § 5 Memorial state stamp; § 6 cross-references |
| `coordination/specs/Q-R18-SPEC.md` | full (744 lines) | R18 precedent for vendored-with-deltas transition + Delta 4 header annotation pattern + AC structure + grilling pass template |
| `coordination/specs/Q-R18-SPEC-AUDIT.md` | head (60 lines) | Sidecar precedent template (Inputs consulted; citation-accuracy notes; pre-route discipline application log) |
| `coordination/VENDORING-MANIFEST.md` | full (115 lines) | Current vendoring policy table; row 28 (`engine/verdict-groups.ts`) is currently `vendored-at-pin`; row 29 (verdict.ts) is the R18 vendored-with-deltas precedent for note-column format |
| `engine/types/verdict.ts` | full (322 lines) | VerdictGroup interface lines 180-213 incl. `cluster_event_id?: string` at line 209 (R18 SLICE 1 shipped); TopologyNode + TopologyEdge declarations (R18 SLICE 1); TopologyCandidate at line 265-281; FusedVerdict at lines 112-126 (read-only reference for A14 anti-scope verification) |
| `engine/verdict-groups.ts` | full (234 lines) | VerdictGrouper class lines 61-234; openByDeploy map at line 66; ingest() at lines 75-123; groupId() at lines 141-143; openGroup() factory at lines 145-163; closeDeployGroup at lines 171-184; findRecentClosedForDeploy at lines 216-225; evictStaleClosed at lines 227-233 |
| `engine/topology-overlay.ts` | offset 250-350 | BFS bidirectionality at lines 262-285 (read-only; R18 verified; R20 anti-scope) |
| `engine/types/agent.ts` | offset 70-100 | VerdictGroup type-import consumer at line 81 (`verdict_group: import('./verdict').VerdictGroup`); read-only reference confirming no shape-change cascading at R20 |
| `engine/types/orchestration.ts` | offset 170-200 | VerdictGroup type-import consumer at line 182; read-only reference |
| `test/q01-no-at-pin-deltas.test.ts` | full (87 lines) | AT_PIN_FILES list with `engine/verdict-groups.ts` at line 52; HEADER_LINE_COUNT = 6 (line 17); stripHeader() helper; line 53-55 comment block for verdict.ts R18 exclusion narrative |
| `test/q18-phase2-slice1-topology-substrate.test.ts` | full (171 lines) | R18 test file structure precedent; AC-R18-7 substring grep over verdict-groups.ts (line 109-112) — confirms R20 must preserve inherited `group-${deployId}-${window_start_ts}` substring in the legacy-mode branch |
| Repo-wide grep | `new VerdictGrouper` across engine/, tools/, src/, test/ — zero matches | Confirmed no current in-tree consumer instantiates VerdictGrouper directly; q20 test file is first consumer |
| Repo-wide grep | `VerdictGroup\b` + `verdict-groups` across engine/, tools/, src/, test/ | Identified all consumer sites; verified no consumer reads `openByDeploy` directly (private); `openGroupForDeploy(deploy_id)` is the one public accessor needing signature extension |
| Bash | `git log --oneline -10` at session start | Confirmed baseline SHA `cecd677` is HEAD; R19 close window concluded at `0a8832b` |
| Bash | `wc -l <large files>` | CROSS-PROJECT-MEMORIAL.md = 2814 lines; MEMORIAL.md = 1820 lines (read via offset windows) |
| Bash | `ls /Users/johnwarren/concord/tessera/test/` | Confirmed q01/q02/q03/q04/q05/q06/q07/q10/q11/q12/q13/q14/q16/q18 + betting-e-process-class-dispatch present; q19 absent (R19 was documentation-only); q20 path available |

**Files NOT consulted (cold-start discipline):**

- prior Reviewer reports REVIEWER-REPORT-R02 through REVIEWER-REPORT-R17.md (except R19 + R18 via PHASE-2-SLICE-1-CLOSE-WALK.md cross-references; R11 + R12 + R01 noted in directory listing only)
- coordination/diagnostics/ contents (existence-acknowledged only; no R19 or R20 entries pre-spec)
- coordination/logs/ contents
- coordination/OVERNIGHT-LOG-2026-05-17.md
- `.prompt-*.md` files
- prior round specs Q-R01 through Q-R17 + Q-R19 (architectural decisions inherited via SCOPING-MEMO-v0.3.md + PHASE-2-SLICE-1-CLOSE-WALK.md + NEXT-ROLE.md only; Q-R18-SPEC.md read directly per R18 precedent for vendored-with-deltas pattern)
- `engine/verdict-groups.js` (compiled output; regenerated by tsc)
- `engine/topology-overlay.ts` full body (R18 verified; R20 anti-scope; only BFS lines 250-350 spot-checked)
- `tools/vendor-from-deploysignal.sh` (referenced by VENDORING-MANIFEST.md; R20 does not invoke or modify; out of scope)

---

## 2. Citation-accuracy notes (NEXT-ROLE.md → actual file)

Per the R11 reinforcement (extract specific cited lines; verify identifier names + line numbers; verify cited TYPE names are exact identifiers at the location), each cited location verified:

| NEXT-ROLE.md or PHASE-2-SLICE-1-CLOSE-WALK citation | Actual location | Status |
|---|---|---|
| `engine/types/verdict.ts:201-209` (VerdictGroup.cluster_event_id field added at R18) | `engine/types/verdict.ts:201-209` (verified by file open: comment block lines 201-208 + field declaration at 209 — `cluster_event_id?: string;`) | PASS |
| `engine/verdict-groups.ts` "currently scoped `(deploy_id, window_start_ts)`" | `engine/verdict-groups.ts:141-143` groupId returns `\`group-${deployId}-${window_start_ts}\``; `engine/verdict-groups.ts:66` openByDeploy keyed on deployId | PASS — citation accurate |
| `engine/types/verdict.ts:201-209` ("R18 added `VerdictGroup.cluster_event_id?` at line 201-209") | Verified: lines 201-208 are the JSDoc preamble; line 209 is the field declaration `cluster_event_id?: string;`. Citation range covers the entire amendment block. | PASS |
| Inherited "factory pattern + format-string discipline must be preserved" reference (NEXT-ROLE.md anti-scope) | `engine/verdict-groups.ts:141-143` (groupId template literal); `engine/verdict-groups.ts:145-163` (openGroup factory) | PASS — preservation surface identified at exact lines |
| "Addition #25 D2 (late-arrival semantics) + D5 (group_id format) clauses — preservation walk required" (NEXT-ROLE.md line 35) | D2 at `engine/types/verdict.ts:165-168` (inherited L3b preamble); D5 at `engine/types/verdict.ts:171-174` + `engine/verdict-groups.ts:142` (format string declaration site); late-arrival semantics at `engine/verdict-groups.ts:216-225` (findRecentClosedForDeploy) | PASS — D2 and D5 surfaces both verified |
| PHASE-2-SLICE-1-CLOSE-WALK § 2 anti-scope diff-range SHA anchoring (TQ-4 γ) | Lines 71-91 of PHASE-2-SLICE-1-CLOSE-WALK.md verified verbatim | PASS — disposition cited correctly |
| PHASE-2-SLICE-1-CLOSE-WALK § 2 vendored-with-deltas two-step pattern | Lines 49-67 of PHASE-2-SLICE-1-CLOSE-WALK.md verified verbatim; two precedent applications (R01 config.ts + R18 verdict.ts) tabulated at lines 60-63 | PASS |

**No citation drift surfaced.** All inherited and NEXT-ROLE.md-cited locations verified by direct file open at session start, not from memory.

---

## 3. Pre-route discipline application log

### 3.1 Skill 14 (PRD conjunction cross-check) applied

For each R20 deliverable, cross-checked against PRD FR/AC entries:

- VerdictGrouper.ingest opts.cluster_event_id wiring ← FR-E3a (Phase 2 outer aggregator) ← AC-P4 (per-shard verdict attribution distinguishing single-shard / topology-localized / fleet-event-conditional)
- Internal keying transition to (cluster_event_id, deploy_id) tuple ← FR-E3a ← AC-P4
- group_id format conditional ← inherited Addition #25 D5 preservation envelope + FR-E3a (event-scope identifier audit trail)
- Late-arrival tuple-match ← inherited Addition #25 D2 preservation + FR-E3a (cross-scope late-arrival routing)
- VENDORING-MANIFEST.md row + AT_PIN_FILES maintenance ← § 9 vendoring policy compliance (not an FR but a discipline-level commitment) ← PHASE-2-SLICE-1-CLOSE-WALK § 2 two-step pattern
- New q20 test file ← bound to all 5 deliverables above + D2/D5 regression coverage (AC-R20-9)

No PRD claim is unbound; no spec deliverable is unscoped. The R20 deliverable set is a strict sub-component of FR-E3a (Phase 2 outer aggregator) — specifically the aggregator-contract layer, with fleet-merge consumption explicitly deferred to R21 per the NEXT-ROLE.md operator guidance on round-size threshold.

### 3.2 Skill 15 (prescription-to-AC-coverage) applied

For each spec prescription (§§ 2 + 4), verified at least one AC binds it:

| Prescription | Binding AC(s) |
|---|---|
| § 2.1 ingest opts.cluster_event_id (Q1 origination) | AC-R20-1 |
| § 2.2 conditional group_id format (Q2) | AC-R20-4 (composite), AC-R20-5 (inherited) |
| § 2.3 (cluster_event_id, deploy_id) tuple keying (Q3) | AC-R20-6 (multi-event same deploy), AC-R20-7 (multi-deploy same event) |
| § 2.4 backward-compat optional contract (Q4) | AC-R20-3 (absent cluster_event_id), AC-R20-9 (legacy-mode regression) |
| § 2.5 tuple-match late-arrival (Q5) | AC-R20-8 (4 sub-cases) |
| § 2.6 empty-string equivalence | AC-R20-6 sub-case (b) |
| § 2.7 header annotation placement | AC-R20-15 (first-line preserved + annotation present) |
| § 2.8 manifest row update | AC-R20-10 |
| § 2.8 AT_PIN_FILES update | AC-R20-11 |
| § 4.6 RED → GREEN TDD discipline | (no direct AC; verified by Reviewer via git log commit ordering) |
| § 4.7 anti-scope diff with SHA-pinned end-bound | AC-R20-12 |
| Population of VerdictGroup.cluster_event_id at open-time | AC-R20-2 |
| Typecheck cleanliness | AC-R20-13 |
| Test-count regression / per-file enumeration | AC-R20-14 |

Every prescription has a binding AC except § 4.6 RED → GREEN TDD ordering (verified by Reviewer via git log inspection, per R04 + R18 precedent — not a runtime AC).

### 3.3 Cross-section consistency pass (R02 reinforcement, 12th application)

Tokens cross-checked for byte-identical use across § Mechanism + § Component inventory + § Per-file pseudocode + § Acceptance criteria + § Anti-scope + § Open questions:

| Token | Sections | Status |
|---|---|---|
| `cluster_event_id` (field name) | §§ 0, 1, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 3, 4.1, 4.3, 4.4, 4.5, 5, 6, 7, 8, 9 | PASS — consistent |
| `openByGroupKey` (renamed internal map) | §§ 1, 2.3, 4.1, 9.6 | PASS |
| `groupKey()` (helper function) | §§ 2.3, 4.1, 9.6 | PASS |
| `findRecentClosedForKey` (renamed late-arrival lookup) | §§ 2.5, 4.1 | PASS |
| Composite format `group-{cluster_event_id}-{deploy_id}-{window_start_ts}` | §§ 0 (Q2 row), 2.2, 4.1, 5 (AC-R20-4), 6, 7, 8 | PASS — byte-identical brace-syntax across all citations |
| Inherited format `group-{deploy_id}-{window_start_ts}` | §§ 0 (Q2 row), 2.2, 4.1, 5 (AC-R20-5), 6, 7, 8 | PASS |
| `vendored-with-deltas` (manifest status) | §§ 0, 1, 2.8, 3, 4.3, 5 (AC-R20-10), 6, 7 | PASS |
| `cecd677` (baseline SHA) | §§ 4.7, 5 (AC-R20-12), 7, 9.7, 9.9 | PASS |
| `<MERGE-READY-SHA>` (end-bound placeholder) | §§ 4.7, 5 (AC-R20-12), 7, 9.9 | PASS |
| AC-R20-N numbering | §§ 0 (table), 2, 3, 4, 5, 6, 7, 8, 9 | PASS — sequential 1-15, no gaps, no duplicates |
| `vendored-at-pin` (pre-R20 status) | §§ 1, 2.8, 4.3, 9.1 | PASS |
| `openGroupForDeploy` (public accessor) | §§ 1, 2.3, 4.1, 5 (AC-R20-2), 9.4 | PASS — signature extension noted consistently as "optional 2nd arg cluster_event_id" |
| `<SHA-A>` (coordination-chore SHA-A) | §§ 4.6, 4.7, 5 (AC-R20-12), 9.5, 9.9 | PASS |
| `AT_PIN_FILES` (q01 test constant) | §§ 1, 2.8, 4.4, 5 (AC-R20-11), 6 | PASS |
| `R20` (round identifier) | EVERYWHERE | PASS |
| q20 test file path `test/q20-verdict-grouper-cluster-event-scope.test.ts` | §§ 1, 2.9, 3, 4.2, 4.6, 5 (AC-R20-14), 6, 7 | PASS — exact path consistent |

**No token-level drift detected across spec sections.** Cross-section consistency PASS.

### 3.4 Empirical-premise-verification pass log

All load-bearing factual claims about production behavior verified by direct file-open or grep at session start (not inherited testimony alone). Detailed enumeration in spec § 9.7.

Notable: the premise "no current in-tree caller instantiates VerdictGrouper directly" required a repo-wide grep at session start. This is load-bearing because Approach A (ingest-opts extension) preserves backward-compat at the API level — if there were existing callers, signature compatibility would be load-bearing on round size and risk; verification confirmed there are none (zero matches across engine/, tools/, src/, test/ for `new VerdictGrouper`), so the API extension is purely forward-facing.

### 3.5 Vendored-file-delta assertion-surface enumeration log (R18 OBS-2 reinforcement, 2nd application)

Per the REINFORCED rule appended to CLAUDE-ARCHITECT.md at R18: enumerate ALL existing tests that import or readFileSync the modified vendored file; trace each test's full assertion surface; pre-disposition manifest + AT_PIN_FILES in the spec.

Applied to `engine/verdict-groups.ts` at session start:

```
$ grep -r "engine/verdict-groups\|VerdictGrouper" test/ tools/ engine/
```

Identified consumers + assertion surfaces:

1. `test/q01-no-at-pin-deltas.test.ts:52` — byte-identity (modulo 6-line header) vs deploysignal source → R20 BREAKS → spec § 2.8 step 2 + § 4.4 + AC-R20-11 pre-handle the AT_PIN_FILES removal
2. `test/q01-vendoring-coverage.test.ts` — first-line SHA pin regex → R20 PRESERVES via § 2.7 + § 4.5 header annotation placement → AC-R20-15 binds
3. `test/q18-phase2-slice1-topology-substrate.test.ts:109-112` (AC-R18-7) — greps verdict-groups.ts for D5 template-literal substring → R20 PRESERVES because the inherited template literal text remains in the legacy-mode branch of the conditional groupId() → cross-checked in spec § 9.8

All 3 consumers pre-dispositioned in spec. The R18 ESCALATE pattern (Implementer surfacing byte-identity break at GREEN, requiring operator Option A) is preempted at R20 — both maintenance edits land in the same GREEN commit per § 4.6 RED → GREEN cycle.

### 3.6 Halt-condition pre-anticipation log (R19 MAJOR-1/2/3/4 reinforcement application)

Per R19 MAJOR-2 reinforcement (CLAUDE-COMMON.md REINFORCED 2026-05-17, "audit-tier promotion-mid-round rule") + R19 MAJOR-1 anti-scope reinforcement:

R20 is **full-tier** (not audit-tier), so the audit-tier promotion-mid-round rule does not apply directly. But the underlying principle — DO NOT silently modify anti-scoped files to suppress a failure — applies to all tiers. Spec § 9.10 enumerates 5 specific halt scenarios with prescribed responses (all routing to DIAGNOSTIC + STATUS: ESCALATE).

Notable: AC-R20-11 (q01-no-at-pin-deltas modification) is explicitly authorized by the spec (per the PHASE-2-SLICE-1-CLOSE-WALK § 2 two-step pattern), NOT a unilateral Implementer tactical fix. The R20 GREEN commit applies the maintenance edit to q01 deliberately, in the same commit as the engine/verdict-groups.ts deltas, per spec prescription. This is the structural difference from R19's MAJOR-1: R19's Implementer modified q18 tactically (post-spec, post-Reviewer) to suppress a test failure; R20's q01 modification is pre-authorized by the spec.

### 3.7 Memorial-self-exoneration guard (CLAUDE-COMMON.md REINFORCED 2026-05-16 + R19 MAJOR-4 reinforcement)

Spec § 9.11 explicitly acknowledges the Architect's MEMORIAL ceremony append will be CONFIRMATION-only at routing time. If a defect is surfaced downstream (Implementer attempt, Reviewer audit), the Architect does NOT retroactively self-exonerate; the appropriate role documents the violation, and the Memorial-Updater reinforces.

The R19 self-exoneration pattern (CONFIRMATION header with carve-out modifiers like "outside the tactical SHA-pin fix" or "No HALT needed") is explicitly recognized as a violation pattern; R20 spec does not embed any such carve-outs.

---

## 4. Architect pre-prediction on outcomes

Per CLAUDE-ARCHITECT.md ceremony convention.

### 4.1 Implementer outcome prediction

- **High confidence (>90%):** GREEN at 181 baseline + 10 q20 tests = 191 pass / 0 fail. q20 test file structured as one `test()` block per runtime AC (AC-R20-1, -2, -3, -4, -5, -6, -7, -8, -9, -15). AC-R20-8's 4 sub-cases (a)/(b)/(c)/(d) may be split into 4 separate `test()` blocks by the Implementer for granular failure surfacing — in which case OBSERVED q20 count = 13. AC-R20-14 explicitly accommodates this via "Implementer reports actual sub-test count."
- **Medium confidence (~70%):** No ESCALATE cycle required. The vendored-with-deltas two-step pattern is pre-handled per PHASE-2-SLICE-1-CLOSE-WALK § 2 + spec § 2.8 + § 4.4; no R18-style surprise. Halt scenarios in § 9.10 are pre-anticipated; if any fires, Implementer responds per spec prescription rather than silent absorption.
- **Lower confidence (~50%):** No Implementer-side spec amendment surfaced. Possible amendment sources: (i) discovery of an additional VerdictGrouper consumer at typecheck time requiring signature alignment (mitigated by § 9.1 PASS premise verification); (ii) discovery that an additional test file reads verdict-groups.ts that wasn't surfaced by my session-start grep (mitigated by § 9.8 enumeration; defensible if surfaced as DIAGNOSTIC); (iii) edge case in late-arrival tuple-match that isn't covered by AC-R20-8 sub-cases (a)/(b)/(c)/(d) — possible if the Implementer encounters a real-cluster simulation scenario the spec didn't enumerate. § 4.7 + § 9.10 prescribe HALT response in all such cases.

### 4.2 Reviewer outcome prediction

- **High confidence (>85%):** STATUS: MERGE-READY routing per CLAUDE-REVIEWER.md (0 CRITICAL bar). Likely findings cluster: 0 CRITICAL / 0-1 MAJOR / 2-4 MINOR / 3-5 OBS. MAJOR candidates: (i) if Implementer applies a silent anti-scope expansion (unlikely given spec § 9.10 explicit HALT prescriptions); (ii) if Implementer self-confirms a test (similar to R19 MAJOR-3) — spec prescribes Given/When/Then behavioral assertions, not implementation-mirror assertions, so this is low-risk. MINOR candidates: (i) per-file count attestation gap (R18 MINOR-2 / MINOR-3 precedent); (ii) memorial-accretion completeness (R18 MINOR-4 precedent if Implementer fills only VIOLATION entries; spec Architect-ceremony will be CONFIRMATION-complete); (iii) AC-R20-15 grep pattern false-positive matches if the Implementer paraphrases the annotation block opening line.
- **Medium confidence (~65%):** No CRITICAL surfaced. CRITICAL would require either a deliberate violation of CLAUDE-COMMON.md "Memorial-self-exoneration" (R19 precedent — would require Implementer to write a self-exonerating CONFIRMATION about anti-scope or halt-discipline; preempted in spec § 9.11) OR a typecheck breakage that the Implementer attempts to suppress.

### 4.3 Cycle-budget prediction

Per `project_overnight_authority_2026_05_17_evening` (~5-round budget; R18-R19 already consumed 2 → R20 + R21 + 1 contingency rounds remain). Architect-pre-prediction:

- R20 closes in 1 round (GREEN + Reviewer + Memorial-Updater + close-walk-style summary). Probability ~70%.
- R20 requires 1 fix cycle (GREEN, Reviewer surfaces MAJOR, Implementer fix-cycle, Reviewer re-audit). Probability ~25%.
- R20 requires ESCALATE cycle (operator disposition needed). Probability ~5% — spec extensively pre-handles the R18 ESCALATE-class patterns (vendored-with-deltas two-step).

If R20 closes in 1 round, R21 (fleet-merge consumption layer) begins at R20+1. R21 spec is the natural continuation of this R20 spec — same architectural foundation, additive consumer-side wiring. Architect-pre-prediction: R21 also full-tier (A6 blast-radius on fleet-merge consumers).

---

## 5. Decision rationale (why-picked / why-rejected paragraphs)

### 5.1 Why Approach A (ingest opts extension) picked

The fundamental architectural question for the SLICE 2 scope re-architecture is: where does the cluster-event identifier flow into the aggregator? Three structurally-distinct answers exist, each with material consequences for downstream slices (SLICE 4 event-feed ingestion, R21 fleet-merge consumption, future close-walks).

Approach A (ingest opts) treats cluster_event_id as per-call metadata. This matches the natural lifecycle of cluster events: a cluster event has a start (signaled by the event-feed at some timestamp), a window of influence (during which verdicts are attributed to it), and an end (signaled by close-trigger). Per-call metadata aligns perfectly with this lifecycle — the event-feed (SLICE 4) becomes a natural producer that decorates ingest calls with the active cluster_event_id during the influence window. Backward compat is automatic (absent cluster_event_id → legacy mode preserved). The aggregator's public-API surface is additive (one optional opts field), preserving all conceivable existing or future callers that operate under deploy_id-only scope.

This contrasts with Approach B (FusedVerdict field), which would require a non-additive type change to the per-shard verdict shape. v0.3 Extension 1's A14 anti-scope explicitly prohibits this — FusedVerdict is the load-bearing per-shard contract, and modifying its shape to carry a cluster-level metadata is a category error (the per-shard fusion layer is not positioned to know the active cluster event; that knowledge lives at the cluster-level event-feed ingestion surface, which is a separate engineering surface per SCOPING-MEMO-v0.3.md § 2.3 line 218). Approach B's hidden assumption (that fusion-layer producers can ascertain cluster_event_id at fusion-tick time) is structurally false.

It also contrasts with Approach C (stateful per-instance context), which introduces hidden mutable state in the aggregator. Stateful context creates an implicit ordering invariant — callers must remember to set the context before ingesting, and the context lifecycle must be managed separately from the ingest lifecycle. Under any non-trivial concurrency (and even under single-threaded use), context-staleness becomes a class of bug that the type system cannot enforce. The inherited engine's Addition #25 D6 zero-latency-penalty + Phase-3.d.D close discipline both caution against state-bearing APIs at the verdict-aggregation surface.

Approach A's additional advantages: clean producer surface for SLICE 4 (the event-feed becomes a verdict-decoration step inserted between fusion and aggregator); clean test pattern (each ingest test specifies its cluster_event_id inline, with no fixture-shared state); clean rollback path (a hypothetical reversal would simply stop populating opts.cluster_event_id; no shape unwinding required).

### 5.2 Why conditional group_id format (vs single canonical) picked

The composite format `group-{cluster_event_id}-{deploy_id}-{window_start_ts}` could plausibly be the canonical format for ALL groups (legacy and cluster-event mode), with absent cluster_event_id collapsing to an empty segment producing `group--deploy-A-1700000000` (note the double-dash). This would simplify the groupId() helper to a single template literal.

This was rejected because the double-dash collapse breaks pattern-matching audit consumers that grep for `group-{deploy_id}-{ts}` per Addition #25 D5. NEXT-ROLE.md anti-scope explicitly says "the factory pattern + format-string discipline must be preserved" — preservation in legacy mode requires the inherited format to remain BYTE-IDENTICAL when cluster_event_id is absent, not "structurally equivalent." The conditional format honors this exactly: legacy mode produces inherited byte-identical group_ids; cluster-event mode produces the composite extension. Two formats coexist, distinguished by the cluster_event_id presence at open-time.

The cost (one conditional branch in the helper; AC-R20-4 + AC-R20-5 as separate ACs) is minimal. The benefit (preservation of inherited audit-consumer behavior + Addition #25 D5 minimum-amendment compliance) is load-bearing per NEXT-ROLE.md anti-scope.

### 5.3 Why (cluster_event_id, deploy_id) tuple keying (vs cluster_event_id-only) picked

The alternative — "one group per cluster_event_id" (collapsing all deploys' verdicts into a single per-event group) — was rejected at brainstorm because it loses per-shard / per-deploy attribution. US-01 (cluster oncall) requires the ability to distinguish "shard 47 deploy A is faulty" from "shard 47 deploy B is faulty" even when both share a cluster_event_id (e.g., the same firmware push triggered both deploys' anomalies). Collapsing these into a single group would discard the per-deploy granularity that AC-P4 explicitly requires.

The tuple-keying solution preserves per-deploy granularity within the cluster-event scope. The roll-up to per-cluster-event aggregation happens at the consumer layer (R21 fleet-merge consumption, or eventually SLICE 3 topology overlay), where multiple per-deploy groups with the same cluster_event_id are joined into a cluster-event-level view. The aggregator stays simple (per-(scope, deploy) keying); the consumer-layer does the per-scope rollup. This is the natural separation of concerns.

The cost (slightly more open-group footprint when one cluster_event_id spans N deploys — N groups instead of 1) is bounded by N (the number of distinct deploys active concurrently within a cluster-event window). At Tessera's exemplar scale (N=100-10000 shards), N concurrent deploys is uncommon; the additional footprint is negligible relative to existing per-shard storage footprint (already linear in N per R-E1).

### 5.4 Why fleet-merge consumption split to R21 (vs bundled in R20)

NEXT-ROLE.md explicit guidance: "consider splitting fleet-merge consumption layer to a later slice round if R20 spec scope exceeds ~12 ACs." R20's aggregator-contract-only scope already has 15 ACs covering the keying re-architecture, format conditional, multi-event/multi-deploy semantics, late-arrival tuple-match, D2/D5 regression, manifest+AT_PIN_FILES maintenance, and header annotation. Bundling fleet-merge consumption (which would add at least 5-8 additional ACs covering each fleet-merge consumer's wiring + regression) would push the round to ~20+ ACs and ~2 weeks of focused engineering equivalent — well past the per-round budget envelope and against the operator's explicit recommendation.

The split has a natural seam: R20 delivers the aggregator-contract; R21 delivers the consumer-side wiring. Both phases are independently testable + reviewable. The R20 spec's tests (q20) exercise the aggregator API directly without depending on fleet-merge consumers; this isolates the architectural decisions for cold-eye review by the R20 Reviewer. R21 can then proceed with fleet-merge wiring against a frozen aggregator contract.

---

## 6. Amendments from prior version (if applicable)

None — this is v1.0 of Q-R20-SPEC. No prior version exists; this is the initial spec emission for R20.

---

## 7. Architect MEMORIAL ceremony (to be appended to coordination/MEMORIAL.md at routing time)

[The Architect ceremony append goes into coordination/MEMORIAL.md at routing time; this audit file does not duplicate it. The MEMORIAL append will include CONFIRMATION entries for: brainstorm phase (3 approaches documented); design phase sketch (component boundaries + integration points + failure modes documented); pre-emit grilling (11 gates PASS per spec § 9); cross-section consistency (12th application; 16 tokens checked); empirical-premise-verification (all 14 load-bearing premises verified by direct file-open at session start); vendored-file-delta assertion-surface enumeration (3 consumers identified + pre-dispositioned per R18 OBS-2 reinforcement); halt-condition pre-anticipation (5 scenarios enumerated per R19 reinforcement); R02 token-consistency reinforcement applied; R11 citation-accuracy reinforcement applied; R15 anti-scope-baseline-SHA reinforcement applied; TQ-4 γ SHA-pinned end-bound reinforcement applied; CLAUDE-COMMON.md REINFORCED 2026-05-17 audit-tier promotion-mid-round rule acknowledged (R20 is full-tier; rule doesn't fire directly but underlying principle of no-silent-anti-scope-suppression applies). Architect role boundary held: no implementation code written; no test files opened beyond read-only references for assertion-surface enumeration; all unresolved decisions surfaced via the spec's brainstorm + open-questions discipline, not silently adopted.]

---

_End of Q-R20-SPEC-AUDIT.md._
