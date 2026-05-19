# CLUSTER-HANDOFF-4-WU06-WU07 — WU-06 SLICE 4 (R34) → WU-07 Phase 2 Close-Walk (Wave 5)

**From:** Coordinator TPM (R35 Wave 4 gate)
**Date:** 2026-05-18
**Wave:** Source cluster CL-04-A (Wave 4; R34; full tier) → Target cluster CL-05-A (Wave 5; WU-07; audit-tier + HYBRID_REVIEWER=true)
**Foundation:** `WAVE-PLAN-03.md` §WU-06 + §WU-07; `WAVE-GATE-04.md`; Reviewer report `REVIEWER-REPORT-R34.md`; round summary `ROUND-R34-SUMMARY.md`; spec `Q-R34-SPEC.md`; PR-F7 evidence `coordination/evidence/PR-F7-EVIDENCE.md`; STAGED-FOR-PHASE-2-CLOSE.md (Items 1-5)
**Type:** cross-cluster dependency contract

---

## Purpose

This artifact is the interface contract between WU-06 (Wave 4 — event-conditional attribution + freeze-hook coupling shipped at R34) and WU-07 (Wave 5 — Phase 2 close-walk + R32+R34 carry-forwards + conditional MR-2 bundling).

WU-07 reads this artifact before beginning work. The Coordinator verifies this artifact is current at Wave 5 gate (HARD STOP) before authorizing any post-Phase-2 follow-on.

---

## Dependency edge

- **Source cluster:** CL-04-A
- **Source work unit:** WU-06 — Phase 2 SLICE 4 (event-feed ingestion + event-conditional correlational attribution layer + Phase 1 freeze-hook activation coupling + PR-F7 evidence package)
- **Target cluster:** CL-05-A
- **Target work unit:** WU-07 — Phase 2 close-walk (audit-tier + HYBRID_REVIEWER=true per SCOPING-MEMO § 3 Phase 2 close-walk row commitment)
- **Dependency test that fired:** D1 (shared output ownership) — WU-07 close-walk reads WU-06 deliverables + Reviewer report + PR-F7 evidence package + freeze-hook activation state to author the Phase 2 close milestone stamp + Addition #26 D4 RECONFIRMED stamp + R-E7 MITIGATED final stamp.
- **Edge confidence:** HIGH
- **Edge reasoning:** WU-07 Phase 2 close-walk's primary deliverable class is consolidation of SLICE 4's architecturally-novel surfaces (event-conditional attribution layer + freeze-hook coupling) into the Phase 2 close milestone artifact. The close-walk MUST read each WU-06 deliverable file + verify Addition #26 D4 wire-format preservation across `engine/events/*.ts` + verify PR-F7 4-cell evidence package + author the consolidated SLICE 4 / Phase 2 close stamp. Inherited from WAVE-PLAN-02 Step 2 row WU-06 → WU-07 + WAVE-PLAN-03 Step 2 outbound table.

---

## What the source cluster produced

WU-06 SLICE 4 shipped 4 architecturally-novel surfaces + 1 inherited-substrate amendment + 2 coordination-artifact updates + 1 evidence package, all at full-tier MERGE-READY (19 of 21 correctness ACs PASS, 1 MAJOR methodology-coverage finding, 4 MINOR findings, 5 OBS — all dispositioned ADVANCE-with-pre-flag).

### Output artifact(s)

| Artifact | Location | Description |
|---|---|---|
| `engine/events/event-feed.ts` | `engine/events/event-feed.ts` | Tessera-original; `ClusterEvent.kind` closed-set 5-class union (`firmware_push` \| `model_redeploy` \| `env_change` \| `config_change` \| `capacity_change`); `ClusterEvent.cluster_event_id`/`kind`/`event_ts`/`event_window_end_ts?`; `SyntheticEventFeed` sorts by `event_ts` ascending; empty array on no events; ITS primitive substrate. |
| `engine/events/event-conditional-attribution.ts` | `engine/events/event-conditional-attribution.ts` | Tessera-original; `attributeEventConditional()` ITS-class pre/post window comparison; emits `EventConditionalCandidate` with `correlational_not_causal: true` literal type-declaration + JSON-serialized round-trip (A16 wire-format three-way binding). Module-level constants `DEFAULT_PRE_WINDOW_SECONDS=300`, `DEFAULT_POST_WINDOW_SECONDS=300`, `DEFAULT_CORRELATION_WINDOW_SECONDS=60`, `DEFAULT_MIN_POST_COUNT=2`, `DEFAULT_MIN_POST_MINUS_PRE_DELTA=1`. `cluster_event_id` identity threading from input to output. Pre-window: half-open `(T-300, T)` (implementation reality; spec § 1.1 / § 3.2 / § 4 AC-R34-8 text are inconsistent — see R34 MINOR-2). Post-window: half-open `[T, T+300)`. |
| `engine/events/freeze-hook.ts` | `engine/events/freeze-hook.ts` | Tessera-original; freeze-hook activation wrapper around inherited Phase 1 per-shard residual update. When `config.freeze_hook_enabled === true` AND `freezeState.active === true`, returns `current` unchanged (FREEZE branch). Otherwise delegates to inherited `updatePerShardResidual`. Per OQ-W3-2 Option B at R34 (wrapper pattern; preserves A12 strictly; no vendored-with-deltas transition for inherited Phase 1 baseline-cell-matrix substrate). |
| `engine/types/config.ts` Delta 5 | `engine/types/config.ts:7-16` + `:117-124` | Vendored-with-deltas; adds `freeze_hook_enabled: boolean` field declaration + Delta 5 header rationale comment. The 5th delta to the inherited Phase 1 config types per VENDORING-MANIFEST.md row. |
| `coordination/evidence/PR-F7-EVIDENCE.md` | `coordination/evidence/PR-F7-EVIDENCE.md` | PR-F7 4-cell evidence matrix (Cell 1 confirmed elevation; Cell 2 true negative; Cell 3 singleton/negative specificity; Cell 4 confounding discrimination) bound to AC-R34-4..7. 3 external citations (Brodersen et al. 2015 + Abadie et al. 2010 + Bernal et al. 2017) with URL + retrieval date 2026-05-18 + verbatim quote ≥30 chars each. ITS (Bernal 2017) selected; CausalImpact + Synthetic Control rejected with documented rationale. **WARNING:** trailing section `## Attribution method selection rationale` is incidentally load-bearing for AC-R34-17 regex capture per R34 OBS-3 — do not delete without fixing the regex (see Pre-flag MINOR-3 below). |
| `coordination/VENDORING-MANIFEST.md` row update | `coordination/VENDORING-MANIFEST.md:41` | Delta 5 row for `engine/types/config.ts` reflecting `freeze_hook_enabled` field addition. Maintains two-step manifest discipline. |
| `test/q34-event-conditional-attribution.test.ts` | `test/q34-event-conditional-attribution.test.ts` | 21 R34 ACs (AC-R34-1..21). 19 PASS at Reviewer-side; 1 FAIL (AC-R34-19 anti-scope diff check — operator-commit-class methodology gap; see MAJOR-1 below); 1 NOT REVERIFIED (AC-R34-21 — subprocess deadlock per OBS-2). |
| `test/_substrate/v9Z-event-cluster.ts` | `test/_substrate/v9Z-event-cluster.ts` | Synthetic event-cluster substrate: `scenarioCell1()` (firmware_push elevation), `scenarioCell2()` (empty), `scenarioCell3()` (singleton model_redeploy), `scenarioCell4()` (config_change with confounding fires). |

### Interface contract

WU-07 Phase 2 close-walk reads WU-06 outputs as follows:

**Type contracts (READ-ONLY by WU-07 by default; amendable at WU-07 chore-A only for specific R34-disposition-driven changes — see Pre-flags below):**

```typescript
// engine/events/event-feed.ts
export type ClusterEventKind =
  | 'firmware_push'
  | 'model_redeploy'
  | 'env_change'
  | 'config_change'
  | 'capacity_change';

export type ClusterEvent = {
  cluster_event_id: string;
  kind: ClusterEventKind;
  event_ts: number;
  event_window_end_ts?: number;  // acknowledged-gap A21; non-load-bearing per spec § 1.3
};

export class SyntheticEventFeed {
  constructor(events: ClusterEvent[]);
  fetch(): ClusterEvent[];  // sorted ascending by event_ts; empty → []
}

// engine/events/event-conditional-attribution.ts
export const DEFAULT_PRE_WINDOW_SECONDS = 300;
export const DEFAULT_POST_WINDOW_SECONDS = 300;
export const DEFAULT_CORRELATION_WINDOW_SECONDS = 60;
export const DEFAULT_MIN_POST_COUNT = 2;
export const DEFAULT_MIN_POST_MINUS_PRE_DELTA = 1;

export type EventConditionalCandidate = {
  cluster_event_id: string;
  event_ts: number;
  member_shard_ids: string[];
  member_count: number;
  pre_window_count: number;
  post_window_count: number;
  correlational_not_causal: true;  // A16 LITERAL true; preserved across JSON round-trip
};

export function attributeEventConditional(
  cluster_events: ClusterEvent[],
  fired_shard_events: FiredShardEvent[],  // FiredShardEvent type from engine/topology/common-mode-attribution.ts
  config?: { pre_window_seconds?: number; post_window_seconds?: number; correlation_window_seconds?: number; min_post_count?: number; min_post_minus_pre_delta?: number }
): EventConditionalCandidate[];

// engine/events/freeze-hook.ts
export type FreezeHookState = { active: boolean };

export function applyFreezeHook(
  current: PerShardResidual,  // inherited from engine/per-shard/warm-start.ts
  sample: number,
  config: { freeze_hook_enabled: boolean },
  freezeState: FreezeHookState,
  updatePerShardResidual: (current: PerShardResidual, sample: number) => PerShardResidual
): PerShardResidual;
```

**Behavioral contract:**

- **Event-conditional attribution:** Given a list of cluster events + a list of fired-shard events, for each cluster event group fired-shard events into pre-window `(T-300, T)` and post-window `[T, T+300)` half-open intervals (per implementation; see R34 MINOR-2 about spec inconsistency). Apply ITS-class threshold (`post_count >= min_post_count` AND `post_count - pre_count >= min_post_minus_pre_delta`) + correlation-window filter (`correlation_window_seconds` for confounding discrimination per Cell 4). Emit one `EventConditionalCandidate` per qualifying cluster event with `correlational_not_causal: true` literal. PR-F7 4-cell evidence package empirically validates the 4 cells (AC-R34-4..7).
- **Freeze-hook coupling:** Wrapper that intercepts `updatePerShardResidual` calls. When `config.freeze_hook_enabled === true` AND `freezeState.active === true`, returns current residual unchanged (FREEZE branch). Otherwise delegates to inherited function (DELEGATE branch). Per OQ-W3-2 Option B wrapper-pattern; preserves A12 strictly (no modification to inherited `engine/per-shard/*.ts`).
- **A16 wire-format invariant:** `correlational_not_causal: true` (literal `true`, not `boolean`) preserved at type-declaration site (regex `/^\s*correlational_not_causal:\s*true\s*;/m` with `/m` anchor) AND at JSON-serialized wire boundary (round-trip preserves `=== true`) AND two-sided absence of `: false` literal across `engine/events/*.ts` (regex + substring). Three-way binding per AC-R34-10/11/12.

---

## Verification status

Per the source cluster's Reviewer report (`REVIEWER-REPORT-R34.md`):

- [x] Output artifacts exist at the stated locations (verified by Coordinator at WAVE-GATE-04: `engine/events/{event-feed,event-conditional-attribution,freeze-hook}.ts`, `engine/types/config.ts:7-16+:117-124`, `test/q34-event-conditional-attribution.test.ts`, `test/_substrate/v9Z-event-cluster.ts`, `coordination/evidence/PR-F7-EVIDENCE.md`, `coordination/VENDORING-MANIFEST.md:41`).
- [x] Interface contract matches what the source cluster's Reviewer confirmed: 19 of 21 ACs PASS at Reviewer-side independent run (`npx tsc -p tsconfig.test.json` exit 0; `node --test --test-name-pattern="AC-R34-([1-9]|1[0-8]|20):" test/q34-event-conditional-attribution.test.js` returned 19/19 PASS). A16 three-way binding verified by Reviewer right-reasons audit Test C (AC-R34-12). Closed-set 5-class union verified (AC-R34-1). PR-F7 4-cell matrix verified (AC-R34-4..7). FREEZE/DELEGATE wrapper behavior verified (AC-R34-13/14/15).
- [x] No CRITICAL findings in the source cluster's Reviewer report affect this contract (0 CRITICAL; MAJOR-1 is methodology-coverage gap, not contract-shape).
- [x] Anti-scope clauses from the source cluster's scope do not unexpectedly bound this output (anti-scope-reverse-check clean per Reviewer § 4 cross-cutting checks; no inherited engine/* internal modification beyond Delta 5 to `engine/types/config.ts`).

---

## What the target cluster must not assume

- WU-06 did NOT ship a FusedVerdict → FiredShardEvent adapter (per spec § 0.6 R34 Architect determination: event-conditional attribution operates on FiredShardEvent directly, mirroring WU-04 input shape; adapter is Phase 3+ orchestrator integration scope). **R26 MINOR-2 impl alignment (per-distinct-member-shard de-duplication at `engine/topology/common-mode-attribution.ts`) is therefore NOT closed at R34 — WU-07 must explicitly disposition** (close at WU-07 IF the close-walk spec touches common-mode-attribution.ts anyway OR formally disposition as deferred-to-Phase-3+ with operator authorization).
- WU-06's pre/post window-boundary semantics are INTERNALLY INCONSISTENT across spec sections (R34 MINOR-2): § 1.1 step 2 describes closed intervals overlapping at T; § 3.2 pseudocode describes half-open but still overlapping at T (`<= preEnd` + `>= postStart` both include T); § 4 AC-R34-8 text claims non-overlapping. The IMPLEMENTATION uses `(T-300, T)` half-open pre + `[T, T+300)` half-open post (Implementer-disclosed MINOR-1 tactical deviation; functionally correct; matches spec § 1.1's "non-overlapping" stated intent). WU-07 must NOT assume the spec sections are mutually consistent — they are not, and WU-07 close-walk's deliverable scope explicitly includes spec reconciliation per Pre-flag MINOR-2.
- WU-06's AC-R34-21 test count assertion is WEAKENED relative to the spec § 4 prescription (R34 MINOR-4): implementation asserts pre-R34 subset count only (305/299/6), not full-suite total (326/320/6). The full-suite count was Implementer-attested via batched runs at chore-A SHA `ca795a2`; Reviewer could NOT re-verify at HEAD due to OBS-2 subprocess-deadlock. WU-07 must NOT assume AC-R34-21 structurally guarantees `total = baseline + 21`; it currently guarantees only `baseline_subset === 305/299/6`. WU-07 close-walk's deliverable scope explicitly includes either composition-based AC amendment OR q29+q34 subprocess-pattern refactor (latter recommended; addresses root cause).
- WU-06's PR-F7-EVIDENCE.md has a HIDDEN structural coupling between the trailing `## Attribution method selection rationale` section and AC-R34-17's regex capture (R34 OBS-3 + MINOR-3). The regex uses `\Z` (invalid in JavaScript; interpreted as literal `Z`); the Implementer added the trailing section to provide a `##\s` anchor that substitutes for the broken end-of-string anchor. **WU-07 must NOT delete the trailing section without first fixing the regex** at both spec § 3.6 pseudocode AND test code line `q34-*.test.ts:267`. Recommended fix: `\Z` → `$(?![\s\S])` OR restructure via `split('##')`.
- WU-06's anti-scope ALLOWED_REGEX does NOT cover operator-authored methodology backflow commits (R34 MAJOR-1; Rule 4 sub-class re-violation). `coordination/STAGED-FOR-PHASE-2-CLOSE.md` is currently in the `0a346ff..HEAD` diff at HEAD `cfbc526` due to operator commits `397efd6` + `854cc7e` between routing-READY and Reviewer execution. WU-07's spec § 9.9 MUST enumerate operator-commit class explicitly (carve-outs OR operator-discipline recommendation) — this is the Rule 4 sharpening deliverable per Coordinator Decision 2.
- WU-06 did NOT close R32 carry-forwards (SCOPING-MEMO MAJOR-1 surgery; 4 weak R32 ACs; execSync q25 + q30 conversions) — OQ-W3-3 default-B applied at R34 per spec § 0.6 + § 5.2 hard limits + per WAVE-GATE-03 Pre-flags routing. WU-07 close-walk IS the canonical home for R32 carry-forwards per the close-walk pattern.
- WU-06's `engine/events/event-feed.ts` declares `event_window_end_ts?: number` but does NOT exercise it (R34 OBS-5; acknowledged-gap A21; non-load-bearing forward-extensibility for interval-shaped events). WU-07 Phase 2 close-walk's deliverable scope does NOT need to consume this field; Phase 3+ if interval-shaped event semantics are activated.

---

## Pre-flags from wave gate

LIKELY-SURFACES findings + R34 carry-forward inventory + Rule 4 sharpening + Rule 6 derivation + 4 friction-surface observations + R32 carry-forward inventory. Copied from `WAVE-GATE-04.md` § Pre-flags to Wave 5 cluster + Coordinator decisions + Cross-project reinforcement rules derived this gate.

### Primary pre-flags (must read before WU-07 spec authoring)

**LS-1 (MAJOR-1 carry-forward; Rule 4 sub-class re-violation; 4th occurrence):** Anti-scope ALLOWED_REGEX operator-commit-class gap. WU-07 spec § 9.9 MUST enumerate operator-authored methodology backflow commit class as the 4th-or-5th ALLOWED_SET coverage category. Add explicit regex carve-outs for known operator-owned coordination files (`^coordination/STAGED-FOR-PHASE-2-CLOSE\.md$`; `^coordination/WAVE-(PLAN|GATE)-[0-9]+\.md$`; `^coordination/CLUSTER-HANDOFF-.+\.md$`; `^coordination/COORDINATOR-MEMORIAL\.md$`). Coordinator Decision 2 — anchor backflow PR candidate (operator-owned scheduling).

**LS-2 (MINOR-1 + MINOR-3 carry-forward; Rule 6 derivation candidate):** Halt-discipline NEXT-ROLE-disclosure-vs-DIAGNOSTIC gap. Rule 6 DERIVED at WAVE-GATE-04 (`halt-discipline-no-DIAGNOSTIC-for-workaround`). WU-07 close-walk Memorial-Updater lands the canonical rule text at `~/.claude/CROSS-PROJECT-MEMORIAL.md` (operator-owned backflow). WU-07 spec authoring should self-apply Rule 6 at spec-emit time. Coordinator Decision 3.

**LS-3 (MINOR-2 carry-forward):** Spec-internal contradiction across window-boundary clauses (§ 1.1 / § 3.2 pseudocode / § 4 AC-R34-8 text). WU-07 close-walk reconciles to one convention (Reviewer-recommended: `(T-300, T)` half-open pre + `[T, T+300)` half-open post; matches implementation reality). Update § 1.1 step 2, § 3.2 pseudocode, § 4 AC-R34-8 text in a single consistent spec-amendment commit.

**LS-4 (MINOR-3 carry-forward; companion to LS-2):** `\Z` JavaScript regex invalidity at spec § 3.6 pseudocode + test code `q34-*.test.ts:267`. Fix regex (4-character change): `\Z` → `$(?![\s\S])` OR restructure via `split('##')`. Opportunistically remove PR-F7-EVIDENCE.md trailing `## Attribution method selection rationale` section OR document it as load-bearing in spec.

**LS-5 (MINOR-4 carry-forward):** AC-R34-21 structural-guarantee restoration. Two options at WU-07: (a) composition-based assertion (count `test()` declarations in q34 file independently + assert pre-subset count + verify sum equals expected total); (b) refactor q29 AC-R29-12 + q34 AC-R34-21 out of `node --test test/*.test.js` subprocess pattern entirely (STAGED Item 3; addresses root cause; restores full-suite single-invocation count ACs project-wide). **Recommended path: (b).**

### Friction-surface pre-flags (WU-07 deliverable scope inputs)

**FS-1 (subprocess-node-test transitive hang class; STAGED Item 3):** q29 + q34 spawn `node --test` subprocesses; transitive recursion deadlock when parent is `node --test --test-isolation=process`. R29 MINOR-3's `env: subEnv` strip protects against direct self-recursion but not transitive. WU-07 Tessera-local task: refactor q29 + q34 to NOT spawn `node --test` from within the suite (move count verification to separate `scripts/verify-count.sh` invoked at chore-A level OR mark test as skip-in-subprocess via `process.env.NODE_TEST_CONTEXT` guard). Audit other test files for same pattern. Anchor backflow PR candidates documented at STAGED Item 3 (4 backflow items: pre-emit grilling rule; pipeline watchdog; Bash-tool orphan reaping; test-isolation flag visibility) — operator-owned scheduling.

**FS-2 (restart-resolves-state-bound-hang operator playbook):** R34 Reviewer's first attempt at `node --test test/*.test.js` hung indefinitely; operator kill + restart cycle recovered Reviewer session and batched-run attestation + structural pre-R34 carry-verification proceeded cleanly on second attempt. WU-07 may briefly cite as operator-experience capture useful for STAGED Item 3 backflow-2 (pipeline watchdog) design discussion.

**FS-3 (derived-rules-do-not-auto-prevent-N+1):** Rule 4 (`anti-scope-allowed-set-forward-coverage`) DERIVED at Wave 2 + VALIDATED at Wave 3 + RE-VIOLATED at Wave 4 on structurally distinct sub-class (operator-commit vs role-emit). Coordinator-side meta-rule observation: derived rules don't auto-prevent N+1 — when the rule text addresses N prior occurrences, it does NOT generalize to structurally distinct future sub-classes by definition. Single observation; recommended for cross-project promotion if a second project's derived rule re-violates on a sub-class.

**FS-4 (Rule 6 derivation candidate confirmed; canonical landing deferred to WU-07):** R26 MAJOR-1 + R34 MINOR-1 + R34 MINOR-3 = 3 cross-round instances. Rule 6 DERIVED at WAVE-GATE-04 with draft text + procedural-sharpening gate. Canonical landing at CROSS-PROJECT-MEMORIAL.md is WU-07 close-walk Memorial-Updater backflow deliverable. See Coordinator Decision 3 in WAVE-GATE-04 for full text.

### R32 carry-forward inventory (STAGED Item 2)

**LS-6 (R32 MAJOR-1 carry-forward):** SCOPING-MEMO § 2.3 structural surgery — restore A14 full rationale adjacent to A14 (`:265`); relocate `### Vendor fungibility` to after A17 (`:289`) as a proper subsection OR a true new § 2.4 (renaming existing "Dependency graph" → § 2.5); remove orphaned rationale sentence at `:286`. WU-07 close-walk is canonical home per OQ-W3-3 default-B.

**LS-7 (R32 MAJOR-2 carry-forward):** 4 weak R32 ACs (`content.includes(...)`) violating Rule 5 (`rule-derivation-without-self-application`). AC-R32-2/7/13/14 retroactively strengthen to `strictEqual` / `deepStrictEqual` / regex with /m anchor / two-sided present-AND-absent assertion. Fix prescriptions in `REVIEWER-REPORT-R32.md` § MAJOR-2 (a-d).

**LS-8 (R32 MINOR-1):** Q-R32-SPEC.md § 2.2 vendor-fungibility § 2.4 citation drift (correlated with R32 MAJOR-1; fixing MAJOR-1 by relocating amendment to true § 2.4 resolves both).

**LS-9 (R32 MINOR-2):** Q-R26-SPEC.md AC-R26-14 row retains contradictory "exit code is 0" claim alongside R32-appended "exit code is 2" amendment, with no `[R32-amended]` marker or strikethrough.

**LS-10 (R32 MINOR-3):** AC-R28-9 fix at `test/q28-slurm-adapter.test.ts:163-165` adds `source_id`/`source_version` assertions to empty-input sub-case only; parallel whitespace-only sub-case at `:166-169` not updated. Production behavior identical (same parser path); cosmetic coverage gap.

**LS-11 (R32 MINOR-4):** PR-F6 Cell 4 (mixed-signal robustness) Reviewer-verified-AC disposition — add explicit AC OR document as out-of-scope with evidence pointer to AC-R26-4.

**LS-12 (R32 OBS-5 + R34 OBS-2 — execSync carry-forward):** `test/q25-l0-contract.test.ts:216` (AC-R25-15) + `test/q30-nvlink-adapter.test.ts:230` (AC-R30-18) use `execSync` (R26 MINOR-1 reinforcement mandates `execFileSync`). WU-07 Tessera-local task; closes R26 MINOR-1's preceding-round carry. STAGED-FOR-PHASE-2-CLOSE.md Item 2.

**LS-13 (R26 MINOR-2 deferred-to-WU-07 impl alignment):** `engine/topology/common-mode-attribution.ts` `earliest_event_ts` / `latest_event_ts` aggregation — docstring relaxed at R32; impl alignment (per-distinct-member-shard de-duplication) NOT closed at R34 per R34 Architect determination (WU-06 does NOT ship FusedVerdict → FiredShardEvent adapter consumer site). **WU-07 closes by either implementing the impl alignment IF the close-walk spec touches `engine/topology/common-mode-attribution.ts` for any other reason OR explicitly dispositioning as deferred-to-Phase-3+ with operator authorization.**

### Methodology-tier pre-flags (operator authorization gates per OQ-W4-1)

**LS-14 (STAGED Item 5 — R34 reinforcement appends):** 3 CLAUDE-ARCHITECT.md REINFORCED lines + 3 CLAUDE-IMPLEMENTER.md REINFORCED lines staged at STAGED-FOR-PHASE-2-CLOSE.md Item 5 per R34 spec § 9.9 anti-scope option (b). **Apply BEFORE running Item 1 consolidation passes** so accumulated patterns are visible to consolidation. Conditional on OQ-W4-1 operator answer (Option A: bundle).

**LS-15 (STAGED Item 1 — MR-2 CLAUDE-IMPLEMENTER.md consolidation):** 3-pass thematic consolidation strategy (Pass 1 = de-dup cross-project-derived rules; Pass 2 = thematic composite consolidation; Pass 3 = promote universal patterns to CLAUDE-COMMON.md). Target: CLAUDE-IMPLEMENTER.md 51 → 25-30 lines; CLAUDE-ARCHITECT.md 33 → ~25 lines. Conditional on OQ-W4-1 operator answer (Option A: bundle).

### Phase 3 forward-flag

**LS-16 (STAGED Item 4 — Tailscale + M4 Pro mini remote-execution):** Phase 3+ MR-3 capability candidate; out-of-scope for WU-07 per OQ-W4-2 default A; WU-07 may briefly cite in close-walk § "Phase 3 capability candidates" forward-flag list.

---

## Halt conditions for target cluster

WU-07 should HALT + DIAGNOSTIC + ESCALATE rather than proceed if:

1. The interface contract above does not match what is actually present at the stated locations (e.g., WU-06 file moved, or its public surface changed since this artifact was authored). Route back via Coordinator-resequencing — the handoff artifact needs amendment, not a cluster-internal workaround.
2. A dependency on WU-06's output surfaces that is not described in this artifact (e.g., WU-07 close-walk needs to consume the inherited `engine/per-shard/*.ts` substrate's freeze-hook state machine in ways the wrapper-pattern of `engine/events/freeze-hook.ts` doesn't expose). Route back rather than proceed by assumption.
3. The R26 MINOR-2 impl alignment surfaces as load-bearing for any other WU-07 deliverable (e.g., Phase 2 close milestone stamp requires the de-duplication semantics) and the existing OQ-W3-3-default-B routing (operator's deferred disposition) is insufficient. Surface as bounded escalation question (close at WU-07 with manifest + AT_PIN_FILES maintenance vs Phase-3+ defer).
4. The MR-2 consolidation per OQ-W4-1 Option A produces a CLAUDE-IMPLEMENTER.md / CLAUDE-ARCHITECT.md diff that hides trigger conditions per the "rule-derivation-without-self-application" pattern at R32 (composite headings must not subsume rules into LESS-actionable forms). Surface as bounded escalation question rather than ship a consolidation that fails the actionability gate.
5. WU-07's spec authoring at the AC enumeration step exceeds 30 ACs and the bundling envelope per OQ-W4-1 Option A produces a coherence risk. Apply Coordinator-resequencing protocol per CLAUDE-COORDINATOR.md §Promotion mid-round + R20+R21 split-decision precedent — escalate for Coordinator's WAVE-PLAN-04 emission (split into WU-07-A + WU-07-B).
6. The q29 + q34 subprocess-hang refactor (LS-5 option b + FS-1) produces test-suite-level coverage regressions that the Reviewer cannot independently verify (because the refactor itself enables the verification path). Surface as bounded escalation question with empirical evidence of the regression class.
7. The Rule 4 sharpening + Rule 6 derivation canonical landing surfaces a structural conflict with the Memorial-Updater anti-scope discipline at WU-07 (which would forbid CLAUDE-*.md modifications without explicit § 9.9 carve-out). Pre-flag in spec § 9.9 EXPLICITLY carves out the cross-project memorial landing target.

---

## Coordinator verification log

| Wave gate | Date | Status | Notes |
|---|---|---|---|
| Wave 4 gate (WAVE-GATE-04) | 2026-05-18 | CURRENT | Initial creation alongside Wave 5 dispatch authorization; verified against `REVIEWER-REPORT-R34.md` + `Q-R34-SPEC.md` + `ROUND-R34-SUMMARY.md` + `STAGED-FOR-PHASE-2-CLOSE.md` (5 items) + main HEAD `cfbc526`. All output artifacts verified present at stated locations. Interface contract verified against Reviewer's AC-R34-1..20 PASS evidence + Reviewer right-reasons audit (AC-R34-4 / AC-R34-12 / AC-R34-13 — none self-confirming). Pre-flags table populated with 16 LS entries (LS-1..16) covering R34 + R32 + R26 carry-forwards + MR-2 + Phase 3 forward-flag. |

---

## Amendment history

| Version | Date | What changed | Triggered by |
|---|---|---|---|
| v1 | 2026-05-18 | Initial creation | WAVE-GATE-04 emission (R35 Coordinator invocation) |
