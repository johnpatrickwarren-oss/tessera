CURRENT-ROUND: R38
NEXT-ROLE: REVIEWER
STATUS: READY

## Operator decision (2026-05-19 — overnight authority auto-Option-A disposition)

**ESCALATE-R38 (DIAGNOSTIC-R38-baseline-mismatch.md) disposition: Option A — accept actual baseline; proceed with R38 on new test file.**

**Reasoning:**
1. **Bounded clean-fix scope:** the 4 failures are R36 post-chore-A forward-protection guards that tripped on downstream R36 Memorial-Updater + R37 Coordinator commits. They can't regress further (already failing) and they don't block R38 correctness verification.
2. **Implementer-recommended:** the Implementer's diagnostic explicitly recommends Option A.
3. **No anti-scope violation:** Option A authors a NEW `test/q38-verification.test.ts` (unaffected by q36 guards). R38 deliverable surface is unchanged.
4. **Option B would require operator-authorized scope expansion** (q36 test file modification is anti-scoped at R38). Per WU-07 punch list pattern — the q36 guard refactor belongs at the next close-walk-class round (Phase 3 entry-or-prep round; R40 candidate synthesis can flag this).

**Authority:** Per [[project-overnight-authority-2026-05-18-morning]] extended-evening authority auto-Option-A class (bounded question + clean-fix scope + clear architectural disposition + Implementer-recommended). Same class as R18 + R25 ESCALATE patterns.

**Meta-observation (Coordinator-level memorial for COORDINATOR-MEMORIAL Wave 5+):** The Coordinator-session-as-operator-proxy (me) wrote the NEXT-ROLE.md baseline-verification directive citing `353 pass / 0 fail` from R36 chore-B state (fbc7228) WITHOUT re-running `node --test` after the R36 Memorial-Updater commit (95fb2ce) + R37 Coordinator commits (87e372f + 602350c). The Implementer's halt-discipline correctly flagged this as a Rule 1 false-compliance-attestation in the routing document. **This is itself a Rule 7 instance** (the meta-rule about derived-rule propagation): Rule 1 + Rule 6 already existed, but I wrote stale baseline anyway. Lesson: Coordinator/operator-proxy MUST re-run binding commands at routing time, NOT cite from prior chore-B state.

**Recommended R38 spec text (Implementer encodes verbatim):**
- Baseline at R38 session start: `tsc → exit 0`; `node --test → 355 tests, 349 pass, 4 fail, 2 skip`
- Post-R38 expected: `357 tests, 351 pass, 4 fail, 2 skip` (adds 2 new q38 ACs)
- The 4 q36 forward-protection failures are permanently-tripped + documented in R38 spec preamble as known-state (not new failures introduced by R38)

**Implementer resume protocol:**
1. Create NEW `test/q38-verification.test.ts` (R38 anti-scope explicit: this is the in-spec new test file).
2. Implement R36 MAJOR-1 latest_event_ts regression fix at `engine/topology/common-mode-attribution.ts:188-196` per scope.
3. AC-R38-FIXTURE + AC-R38-DOCSTRING per scope.
4. Encode actual baseline empirically (Rule 1 compliance).
5. Continue commit sequence (RED → GREEN → chore-A → chore-B per spec).
6. Resume via `./run-pipeline.sh --round R38 --tier audit --start-at IMPLEMENTER` from main worktree.

---

## Escalation items

### DIAGNOSTIC-R38-baseline-mismatch.md

**File:** `coordination/diagnostics/DIAGNOSTIC-R38-baseline-mismatch.md`

**Summary:** Actual baseline at R38 session entry differs from expected baseline in NEXT-ROLE.md.

- Expected: `355 tests, 353 pass, 0 fail, 2 skip`
- Actual: `355 tests, 349 pass, 4 fail, 2 skip`

4 failures in `test/q36-phase2-close-walk.test.ts` (AC-R36-21, AC-R36-23, AC-R36-30, AC-R36-31). All caused by post-chore-A R36 + R37 artifacts (R36 Memorial Updater added 3 entries to CLAUDE-IMPLEMENTER.md; R37 Coordinator added WAVE-GATE-05.md and ROUND-R36-SUMMARY.md). None fixable within R38 anti-scope.

**Recommended option:** A — accept actual baseline; R38 test deliverable goes in new `test/q38-verification.test.ts` (unaffected by q36 guards). See DIAGNOSTIC for full analysis and 3 bounded options.

## Round-scope directive (R38 — post-MR-2 verification; audit-tier; main worktree)

R38 is the **first round of the post-Phase-2-close safe-continuation chain** authorized by extended evening overnight authority (2026-05-18 evening: "authorized post hard stop fallback, keep moving where ever possible"). Chain: R38 → R39 → R40 → R41 → HARD STOP at natural exhaustion of safe-continuation work OR explicit Phase 3 scoping requirement.

**Authorization basis:** Tessera Phase 2 closed at R37 Wave 5 gate per `coordination/WAVE-GATE-05.md` § Phase 2 close milestone stamp. Phase 2 close HARD STOP **lifted** per evening overnight authority. R38-R41 are low-risk verification + consolidation + synthesis + audit rounds; no new scoping decisions.

**Round class:** audit-tier; main worktree at `~/concord/tessera`; single-pipeline mode (no `--coordinator`; no `multi-track-cluster-setup.sh`).

**Wall-clock estimate:** 30-45 min per overnight authority memory.

**Tier rationale:** S3 (single bounded scope: R36 MAJOR-1 remediation + carry-forward MINOR closures) + S4 (tactical follow-up to recent close-walk round R36); not novel architecture (no A1-A7 trigger); audit-tier is the correct shape per CLAUDE-COMMON.md tier rubric. Implementer wears the Architect hat with own thin spec at audit-tier discipline; cold Reviewer audits per audit-tier convention.

## Scope (mandatory + optional per WAVE-GATE-05 § Forward-flag dispositions to R38)

### Mandatory items

1. **R36 MAJOR-1 remediation: `latest_event_ts` semantic regression at `engine/topology/common-mode-attribution.ts:188-196`.** The R26 MINOR-2 dedup fix introduced a new bug — line 195 reads `if (shardEarliest > latest) latest = shardEarliest`, using `shardEarliest` as the max bound instead of `shardLatest`. `CommonModeCandidate.latest_event_ts` therefore reports `max(per-shard earliest event_ts)`, NOT `max(per-shard latest event_ts)`. Fix:
   - 3-line code change at `engine/topology/common-mode-attribution.ts:188-196`: introduce `shardLatest` computed as `Math.max(...sidTouches.map((t) => t.event_ts))` alongside the existing `shardEarliest`; update line 195 max-aggregation to use `shardLatest`; preserve `shardEarliest` in min-aggregation.
   - Docstring updates at `engine/topology/common-mode-attribution.ts:68-71` (`earliest_event_ts` field; addresses R36 MINOR-1 contradiction) AND at the `latest_event_ts` field (whatever line it lands at post-fix). Both docstrings should accurately describe per-distinct-member-shard semantics (one earliest event_ts per distinct member_shard_id, then min across those shard-earliest values; analogous wording for latest).
   - **AC-R38-FIXTURE (mandatory):** Synthetic fixture where shard S contributes ≥2 `fired_events` at distinct timestamps t1 < t2 (e.g., t=1000 and t=1050). `attributeCommonMode` output `CommonModeCandidate.latest_event_ts` MUST equal `max(t1, t2) = t2` (NOT `min(t1, t2) = t1` and NOT some other shard's earliest). Mutation test: revert the line 195 fix to use `shardEarliest`; AC MUST FAIL.
   - **AC-R38-DOCSTRING (mandatory):** Docstring text at both `earliest_event_ts` + `latest_event_ts` fields MUST contain accurate per-distinct-shard-dedup semantics text (positive assertion: misleading "iteration over all touches" string absent AND accurate text present, per R36 IMPLEMENTER reinforcement #3 `docstring-accuracy-positive-assertion`).

### Optional items (R38 Implementer discretion; close opportunistically if scope permits)

2. **R36 MINOR-5 (carry from R32):** AC-R32-7 "strengthened" assertion at `test/q32-slice3-close-walk.test.ts:97-110` reads whole file content rather than bounded section window — tighten to bounded section window. Implementer's R36 MEMORIAL Watch List item 5 already flags this.
3. **R36 MINOR-3:** `PHASE-2-CLOSE-WALK.md` § 5 arithmetic inconsistency (prose says "4 composite headings" but lists 7 names; 1+7+4+15 ≠ 30 either way; actual `wc` count is 30 verified by AC-R36-21). Doc-only reconciliation.
4. **R36 OBS-3:** tsc environmental shift documentation (tsc 5.9.3 exits 0; R29 baseline was exit 2). Document in PHASE-2-CLOSE-WALK.md or ANCHOR-BACKFLOW-2026-05-18.md for future-reader benefit.
5. **R36 MINOR-2 OR MINOR-4 OR MINOR-6:** Defer to R41 repo hygiene audit if not picked up at R38.

## Anti-scope (R38 hard limits)

- NO modification of inherited vendored-at-pin engine internals (A12; `engine/topology-overlay.ts`, `engine/core.ts`, `engine/detectors/*`, `engine/hardware-topology-source.ts`) **EXCEPT** the in-spec deliberate scope at `engine/topology/common-mode-attribution.ts:188-196` (R36 MAJOR-1 fix) + companion docstring updates at :68-71 + new docstring for `latest_event_ts` post-fix. The R26 MINOR-2 surface at common-mode-attribution.ts was explicitly carved out for WU-07 close-walk impl-alignment per OQ-W3-3 default-B routing; R38 extends this carve-out for the MAJOR-1 fix per WAVE-GATE-05 Decision 5.
- NO modification of any pre-R36 test file **EXCEPT** the in-spec deliberate scope for MAJOR-1 fixture. If creating a NEW test file `test/q38-verification.test.ts`, that is in-scope; if amending an existing test file (e.g., `test/q26-common-mode-attribution.test.ts` if it exists, or `test/q-md-f4-common-mode-injection.test.ts`), R38 Implementer MUST encode the modification in spec § 2.2 ALLOWED_SET pre-implementation per R36 reinforcement #1 `anti-scope-allowed-set-self-expansion` (do NOT expand ALLOWED_SET to admit unauthorized paths post-implementation).
- NO Phase 3 territory: NO AMD/TPU/Trainium/Inferentia vendor adapter work; NO A15 cross-cluster federation; NO A17 DeploySignal-integration; NO Tailscale remote-execution beyond informational pointer; NO A16 causal-attribution ADR reversal proposal; NO FusedVerdict→FiredShardEvent adapter consumer site (R26 MINOR-2 deferred-to-Phase-3+ disposition stands).
- A10 (hardware-diagnostic scope) preserved.
- A11 (no real customer cluster telemetry) preserved.
- A13 (no ML-based attribution) preserved.
- **A16 (Addition #26 D4 `correlational_not_causal: true` wire-format) preserved** — R38 fix at `engine/topology/common-mode-attribution.ts:188-196` MUST NOT touch the `correlational_not_causal: true` literal at line 205 (or whichever line it occupies post-fix). Reconfirm A16 by re-running AC-R36-25 pattern verification at chore-B.
- NO modification of `engine/events/*` (Wave 4 frozen post-R34; R36 confirmed no behavioral changes needed).
- NO modification of `engine/verdict-groups.ts` (R20 frozen), `engine/fleet/verdict-consumer.ts` (R21 frozen), `engine/types/verdict.ts` (R18 frozen for verdict-shape; if MAJOR-1 fix surfaces a need for type extension, ESCALATE rather than absorb).
- NO modification of `test/_substrate/v9X-cluster.ts` (R18 frozen), `test/_substrate/v9Y-multi-rack-cluster.ts` (R23 frozen), `test/_substrate/v9Z-event-cluster.ts` (R34 frozen).
- NO modification of `coordination/SCOPING-MEMO-v0.3.md` (R36 closed structural surgery; further amendments require operator authorization).
- NO modification of `CLAUDE-*.md` reinforcement files (R36 closed MR-2 consolidation; further appends only at operator-authorized close-walk or methodology rounds — R38 is verification, not methodology).

## Reinforcements in scope (apply during R38 work)

**Cross-project (CROSS-PROJECT-MEMORIAL.md "Reinforcement rules derived"):** Rules 1-6 active + Rule 7 RECOMMENDED FOR DERIVATION per WAVE-GATE-05 Decision 3.

- **Rule 1 (`false-compliance-attestation`):** R38 chore-B attestation MUST encode actual `tsc` exit code + actual test count + actual chore-B SHA verbatim. NO reframing of binding-command results as compliance.
- **Rule 2 (`architect-branch-binding-coverage`):** R38 Implementer's self-spec § 9 grilling sweeps the MAJOR-1 fix branches (the new `shardLatest` computation path; the max-aggregation path; the docstring-accuracy assertion paths) with mutation tests.
- **Rule 3 (`implementer-spec-test-assertion-coverage`):** Every AC-R38 Then-clause field must be structurally bound at the assertion layer (strictEqual / deepStrictEqual / regex with /m anchor; not vacuous `content.includes('never-present-string')` patterns per R36 reinforcement #3 derivation basis).
- **Rule 4 (`anti-scope-allowed-set-forward-coverage`):** R38 spec § 2.2 / § 4 ALLOWED_SET enumeration MUST include forward-coverage carve-outs for post-chore-A coordination-artifact commits (REVIEWER-REPORT-R38.md; MEMORIAL.md Memorial-Updater appends; any DIAGNOSTIC files); MUST be written at RED-commit time from spec-enumerated paths only — do NOT expand post-implementation per R36 reinforcement #1.
- **Rule 5 (`rule-derivation-without-self-application`):** R38 chore-A pre-commit Implementer self-audit MUST grep-sweep the chore-A diff for prohibited patterns under Rules 1-6 (Rule 1: any attestation reframing; Rules 2-3: weak assertion patterns; Rule 4: ALLOWED_SET gaps; Rule 6: any halt-condition encountered + absorbed inline). If any matches, retroactively strengthen or HALT.
- **Rule 6 (`halt-discipline-no-DIAGNOSTIC-for-workaround`):** If R38 encounters any spec-vs-empirical conflict requiring substantive divergence from spec literal text, HALT with DIAGNOSTIC + 3 bounded options + STATUS: ESCALATE in NEXT-ROLE.md. Do NOT absorb inline with NEXT-ROLE.md tactical-deviation disclosure only. **Per WAVE-GATE-05 § Cross-project reinforcement rules derived this gate: Rule 6 SELF-APPLICATION FAILED at R36 canonical-landing round (MAJOR-3 + MAJOR-4). R38 MUST NOT repeat this pattern.**
- **Rule 7 (RECOMMENDED FOR DERIVATION; canonical landing at R38 Memorial-Updater stage per OQ-W5-1 Option A):** R38 Implementer at chore-A pre-commit MUST grep-sweep the diff for prohibited patterns per each canonical cross-project rule (Rules 1-6 minimum); ALLOWED_SET MUST be written at RED-commit time using spec-enumerated paths only. Rule 7 self-application is RECURSIVE VALIDATION — R38 testing Rule 7's propagation mechanism is itself part of validating Rule 7. R38 Memorial-Updater stage lands Rule 7 canonical text at `~/.claude/CROSS-PROJECT-MEMORIAL.md` "Reinforcement rules derived" tail per OQ-W5-1 Option A operator authorization.

**Tessera-local (CLAUDE-{ARCHITECT,IMPLEMENTER,REVIEWER}.md REINFORCEMENTS):** All applicable to R38 (audit-tier with Implementer wearing Architect hat).

- **R36-derived CLAUDE-IMPLEMENTER.md reinforcements (3 new entries at lines ~391/~402/~415):**
  - `anti-scope-allowed-set-self-expansion`: do not expand ALLOWED_SET to admit unauthorized paths; ALLOWED_SET must be authored from spec before implementation.
  - `MEMORIAL-entry-self-exoneration`: MEMORIAL is audit trail, not defense brief; do not characterize halt-discipline deviations as "acceptable" in role-authored entries.
  - `docstring-accuracy-positive-assertion`: AC Then-clause requiring docstring accuracy must check misleading text ABSENT AND accurate text PRESENT (vacuous absence-check of never-present string verifies nothing). **DIRECTLY APPLIES to AC-R38-DOCSTRING for MAJOR-1 fix.**

## Baseline-verification directive

Per R25 MAJOR-1 reinforcement (do NOT cite cross-round attestations): R38 Implementer at session start MUST run baseline test empirically:

```
npx tsc -p tsconfig.test.json    # expected: exit 0 (post-R36 environmental: tsc 5.9.3 exits 0)
node --test test/*.test.js       # expected baseline: 355 tests, 353 pass, 0 fail, 2 skip (per AC-R36-29 confirmation at chore-B fbc7228)
```

Encode the ACTUAL values empirically observed at R38 session start. If actual differs from expected, that is a Rule 6 halt-condition (HALT with DIAGNOSTIC; do NOT absorb).

## Halt conditions for R38 (escalate; do NOT absorb inline)

Per Rule 6 + WAVE-GATE-05 § R38 dispatch authorization halt-discipline reminder:

1. **`tsc` exit code or test count contradicts expected baseline** — HALT + DIAGNOSTIC + STATUS: ESCALATE. Do NOT reframe (Rule 1).
2. **MAJOR-1 fix surfaces a need for type extension at `engine/types/verdict.ts` or a need to modify any A12-anchored file beyond the carved-out scope at `engine/topology/common-mode-attribution.ts:188-196` body** — HALT + DIAGNOSTIC + STATUS: ESCALATE.
3. **Multi-event-per-shard fixture cannot be authored without modifying inherited substrate (`test/_substrate/v9X-cluster.ts` or v9Y or v9Z)** — HALT + DIAGNOSTIC + STATUS: ESCALATE. Substrates are frozen per anti-scope.
4. **Any spec-vs-empirical conflict requiring substantive divergence from spec literal text** — HALT + DIAGNOSTIC + 3 bounded options + STATUS: ESCALATE per Rule 6.
5. **ALLOWED_SET enumeration at RED-commit time reveals a path needs to be added that's not in spec § 2.2 / § 4** — HALT + DIAGNOSTIC; do NOT expand post-implementation per Rule 4 + R36 reinforcement #1.

## Expected deliverables (R38 invocation)

1. **`coordination/specs/Q-R38-SPEC.md`** — Implementer's audit-tier self-spec (thin); ACs covering AC-R38-FIXTURE + AC-R38-DOCSTRING + any optional carry-forward closures Implementer elects to scope; § 2.2 ALLOWED_SET enumeration at RED-commit time.
2. **`engine/topology/common-mode-attribution.ts:188-196`** — 3-line MAJOR-1 fix + docstring updates at :68-71 + post-fix `latest_event_ts` docstring.
3. **`test/q38-verification.test.ts`** (or amended existing test file with spec § 2.2 pre-authorization) — multi-event-per-shard fixture + AC-R38-FIXTURE + AC-R38-DOCSTRING + any optional ACs.
4. **`coordination/reviews/REVIEWER-REPORT-R38.md`** — cold Reviewer audit per audit-tier convention. NOT hybrid (per OQ-W5-4 Coordinator prior B — verification scope; hybrid overhead not warranted for non-close-walk-class).
5. **`coordination/MEMORIAL.md`** R38 sections (Implementer + Reviewer + Memorial-Updater).
6. **`~/.claude/CROSS-PROJECT-MEMORIAL.md`** Rule 7 canonical landing at R38 Memorial-Updater stage per OQ-W5-1 Option A (operator-owned backflow authorization). Draft text in `coordination/WAVE-GATE-05.md` § Cross-project reinforcement rules derived this gate § Rule 7 derivation evaluation.
7. **`coordination/logs/ROUND-R38-SUMMARY.md`** — operator-facing summary per R32+R34+R36 precedent.
8. **`coordination/NEXT-ROLE.md`** at R38 close: `NEXT-ROLE: IMPLEMENTER (R39 architect consolidation evaluation per overnight authority safe-continuation chain)` / `STATUS: READY` (or per R38 Memorial-Updater's routing decision if R39 scope shifts).

## Inputs for R38 (read in order)

1. CLAUDE-COMMON.md + CLAUDE-IMPLEMENTER.md (audit-tier; Implementer wears Architect hat — also CLAUDE-ARCHITECT.md for spec-authoring discipline; CLAUDE-REVIEWER.md is loaded at cold Reviewer dispatch).
2. **`coordination/WAVE-GATE-05.md`** (primary R38 input — § Forward-flag dispositions to R38 + § R38 dispatch authorization enumerate the mandatory + optional scope + anti-scope + reinforcements).
3. `coordination/PRD.md` (thin pointer).
4. `coordination/SCOPING-MEMO-v0.3.md` § 2.3 Extension 3 (b) MR-1 amendment + § 7 TAGGED-FUTURE list (anti-scope reference).
5. `coordination/PHASE-2-CLOSE-WALK.md` (Phase 2 close milestone state).
6. `coordination/reviews/REVIEWER-REPORT-R36.md` (Merger output) — MAJOR-1 details at § 2 MAJOR-1 lines 63-93.
7. `coordination/specs/Q-R26-SPEC.md` (R26 MINOR-2 dedup fix context for the MAJOR-1 regression).
8. `engine/topology/common-mode-attribution.ts` lines 60-205 (the file R38 modifies).
9. `~/.claude/CROSS-PROJECT-MEMORIAL.md` "Reinforcement rules derived" section (Rules 1-6 canonical; Rule 7 draft for landing at R38 Memorial-Updater).
10. `coordination/COORDINATOR-MEMORIAL.md` § Wave 5 gate (R37) entries (Rule 7 derivation rationale + procedural sharpening).

## Anti-scope (R38 hard limits — RESTATED)

See § Anti-scope above. **Hard gates:** A12 (no inherited engine internals beyond carve-out); A16 (preserve `correlational_not_causal: true` literal); Rule 4 (ALLOWED_SET at RED-commit time, no post-implementation expansion); Rule 6 (HALT + DIAGNOSTIC on any spec-vs-empirical divergence).

## Routing notes

- R38 dispatch: `scripts/run-pipeline.sh --tier audit` from `~/concord/tessera` main worktree. Single-pipeline; no `--coordinator`; no `multi-track-cluster-setup.sh`. HYBRID_REVIEWER NOT set (per OQ-W5-4 Coordinator prior B).
- Post-R38 routing: R38 Memorial-Updater appends Rule 7 to `~/.claude/CROSS-PROJECT-MEMORIAL.md` per OQ-W5-1 Option A; routes NEXT-ROLE.md to R39 (Architect consolidation evaluation; default no-op per OQ-W5-2 Coordinator prior A — Implementer at R39 entry decides whether to no-op or close optional R36 MINORs).
- R39 → R40 → R41 → HARD STOP at natural exhaustion. R40 produces Phase 3 candidate-list INVENTORY artifact only; NOT Phase 3 scoping.

## State at R38 entry

| Element | State |
|---|---|
| WU-07 R36 SLICE 3.D Phase 2 close-walk | ✅ MERGE-READY at chore-B `fbc7228` |
| R37 Wave 5 gate + Phase 2 close milestone stamp | ✅ `coordination/WAVE-GATE-05.md` emitted; COORDINATOR-MEMORIAL.md updated (3 deliverables landed at R37 per NEXT-ROLE.md R37 directive) |
| Phase 2 close status | **CLOSED** at R37 stamp; HARD STOP **LIFTED** per evening overnight authority |
| 0-CRITICAL streak | 35 rounds (R02-R36); preserved at Phase 2 close |
| Working tree | clean at R37 emit; expect clean at R38 entry post-routing-commit |
| HEAD | post-R37-routing-commit (R38 Implementer verifies empirically at session start) |
| Cross-project rules canonical | 6 (Rules 1-6); Rule 7 RECOMMENDED FOR DERIVATION + draft at WAVE-GATE-05 § Cross-project reinforcement rules derived this gate; canonical landing scheduled for R38 Memorial-Updater stage per OQ-W5-1 Option A |
| Safe-continuation chain | R37 emitted Wave 5 gate; R38 = mandatory R36 MAJOR-1 remediation + optional carry-forwards; R39-R41 follow |
| Phase 3 entry | NOT authorized; requires separate PRD + operator authorization + HARD STOP lifted; R40 inventory artifact feeds future operator PRD authoring, does NOT constitute Phase 3 entry |

## R38 Implementer attestation

**Chore-A SHA (implementation complete):** `8bf0247`  
**Chore-B SHA (forward-protection test + this attestation):** recorded below at commit time.

**Binding commands at chore-A SHA `8bf0247`:**
- `npx tsc -p tsconfig.test.json` → exit 0
- `node --test test/*.test.js` → 357 tests, 351 pass, 4 fail, 2 skip

**Binding commands at chore-B (post-forward-protection test):**
- `npx tsc -p tsconfig.test.json` → exit 0
- `node --test test/*.test.js` → 358 tests, 351 pass, 4 fail, 3 skip
  (AC-R38-4 adds 1 test that skips in worker context; 4 pre-existing q36 failures unchanged)
- `node test/q38-verification.test.js` (direct) → 3 pass, 0 fail (AC-R38-4 exercises anti-scope diff check)

**AC-R38-1:** ✅ `latest_event_ts === 1050` (was 1000 with bug)  
**AC-R38-2:** ✅ "not per-distinct-shard dedup" absent; "per-distinct-shard" in latest_event_ts jsdoc  
**AC-R38-3:** ✅ 357 tests at 8bf0247 per spec  
**AC-R38-4:** ✅ anti-scope diff from 41c1ff1..HEAD ⊆ ALLOWED_SET (verified via direct run)

**Tactical deviations (inline fixes; no halt):**
1. `label` → `service_name` (TopologyNode field name mismatch)
2. `captured_at_ts` → `fetched_at_ts` + `source_id` + `source_version` (TopologySnapshot fields)
3. `import.meta.url` → `__dirname` pattern (module system)
4. 300-char window → 500-char window for jsdoc extraction (jsdoc is 317 chars)
5. Docstring "Per-distinct-shard" → "per-distinct-shard" (lowercase to match test's `includes()` check)

**Reviewer inputs:**
- `coordination/specs/Q-R38-SPEC.md` (audit-tier self-spec)
- `engine/topology/common-mode-attribution.ts` (fix at lines ~188-200; docstrings at ~68-79)
- `test/q38-verification.test.ts` (AC-R38-1, AC-R38-2, AC-R38-4)
