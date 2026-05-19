# REVIEWER REPORT — R40

**Round:** R40 — Phase 3 candidate synthesis inventory (audit-tier, main worktree)
**Date:** 2026-05-19
**Reviewer:** Opus (cold; single-Reviewer per audit-tier protocol)
**Implementation SHA (chore-A):** `a8654302ccb42e58e2321d7da62adde74af2fcbc`
**Round-start SHA (chore-A-prep):** `0759eec`
**Spec:** `coordination/specs/Q-R40-SPEC.md` (Implementer-authored, audit-tier)
**Deliverable:** `coordination/PHASE-3-CANDIDATES-PRELIMINARY.md` (DRAFT inventory)

---

## § 1 Per-AC verification table

| AC-ID | Criterion (short) | Status | Evidence (file:line or test name) |
|---|---|---|---|
| AC-R40-1 | All 8 sections present in order with headings | PASS | `coordination/PHASE-3-CANDIDATES-PRELIMINARY.md:15` § 1; `:88` § 2; `:134` § 3; `:182` § 4; `:228` § 5; `:314` § 6; `:329` § 7; `:358` § 8 — all 8 section headers verified present and in order |
| AC-R40-2 | All 4 TAGGED-FUTURE adapters present with "why" + dependency note citing WU-03 NVLink + WU-01 Slurm parallel-class pattern | PARTIAL | All four adapters present at § 1.1 AMD (`:25`), § 1.2 TPU (`:42`), § 1.3 Trainium (`:60`), § 1.4 Inferentia (`:73`). "Why this matters" present in each. Dependency-note citation of "WU-03 NVLink + WU-01 Slurm" parallel-class pattern is NOT jointly present in every subsection (see MINOR-1) — § 1 intro paragraph (`:18-21`) covers the umbrella; per-subsection dep-notes cite only one or neither |
| AC-R40-3 | Rule 7 cites WAVE-GATE-05 Decision 3 forward-flag; framed as Phase 3 implementation item | PASS | `:232` "Source: WAVE-GATE-05.md § Cross-project reinforcement rules derived, Decision 3 forward-flag" — Decision 3 citation present (though section parent is wrong; see MINOR-3). Phase 3 framing at `:250-251` "Rule 7 implementation in Phase 3 SLICE 1 (or MR-3) would protect all subsequent Phase 3 rounds" |
| AC-R40-4 | Forward-protection redesign cites WAVE-GATE-05 Decision 6; Rule 4 5th-occurrence + 3rd structurally distinct sub-class | PASS | `:260` "Source: WAVE-GATE-05.md Decision 6; Rule 4 (`anti-scope-allowed-set-forward-coverage`) status." `:262-265` "5th occurrence total; 3rd structurally distinct sub-class across 3 Tessera waves" — matches WAVE-GATE-05.md:273 "5th occurrence of Rule 4 class (R25/R26/R29/R34/R36) and the 3rd structurally distinct sub-class (role-emit; operator-commit; Implementer-self-expansion)" |
| AC-R40-5 | § 7 estimates are ranges + dependency ordering note | PASS | `:336-341` all 5 rows use range syntax (3–5, 4–8, 3–6, 1–2, 1–3); `:343-351` numbered dependency-ordering list with 5 entries |
| AC-R40-6 | § 8 contains A15, A13, SCOPING-MEMO v0.4 | PASS | `:362` A15; `:363` A13; `:364` "Any scope requiring SCOPING-MEMO v0.4" — all three present (bonus: A16, FusedVerdict also listed) |
| AC-R40-7 | No sequencing decisions resolved by author; all flagged as OQ | PARTIAL | OQ-P3-1 through OQ-P3-6 properly surface sequencing/feasibility questions at `:39, :57, :109, :169, :255, :353`. However § 5.1 (`:250`) "Phase 3 SLICE 1 (or MR-3) would protect all subsequent Phase 3 rounds" reads as soft author-suggested SLICE placement; § 3.2 (`:168`) "Phase 3+ candidate, NOT a Phase 3 SLICE 1 candidate" embeds a sequencing claim (grounded in Q-J6 prior disposition, so defensible). See MINOR-5. |
| AC-R40-8 | Anti-scope diff from 0759eec to HEAD empty for engine/test/src/tools/CLAUDE-*.md/SCOPING-MEMO*/PRD.md | PASS | Reviewer ran `git diff 0759eec HEAD --name-only -- engine/ test/ src/ tools/ CLAUDE-*.md SCOPING-MEMO* PRD.md` → empty output. Full diff shows only `coordination/MEMORIAL.md`, `coordination/NEXT-ROLE.md`, `coordination/PHASE-3-CANDIDATES-PRELIMINARY.md`, `coordination/specs/Q-R40-SPEC.md` |

---

## § 2 Findings

### MAJOR-1 — Rule 7 canonical-landing status: deliverable treats a resolved question as open; internally self-contradicts

**Location:** `coordination/PHASE-3-CANDIDATES-PRELIMINARY.md:252-256` (§ 5.1 dependency note + OQ-P3-5) AND `:325` (§ 6 row "Rule 7 canonical landing")

**Severity:** MAJOR — primary purpose of the inventory is to give operator actionable Phase 3 candidate state. Treating a resolved methodology question as open misleads the operator and produces a wasted-cycle OQ.

**Detail:**

The deliverable raises OQ-P3-5 at § 5.1 (`:255-256`): *"Has Rule 7 canonical text landed in `~/.claude/CROSS-PROJECT-MEMORIAL.md` at R38/R39 Memorial-Updater stage? Verify before authoring the Phase 3 SLICE 1 spec. Flag as OQ-P3-5."*

The deliverable § 6 (`:325`) restates this as: *"Rule 7 canonical landing (OQ-W5-1 from WAVE-GATE-05.md) | Status unknown at R40 entry — depends on R38/R39 Memorial-Updater outputs"*.

**Reality** — three pieces of evidence the Implementer had at hand contradict this framing:

1. `~/.claude/CROSS-PROJECT-MEMORIAL.md:3470` explicitly states: *"Rule 7 (`derived-rule-propagation-mechanism-required`) canonically lands at R38 Memorial-Updater stage per OQ-W5-1 Option A authorization. 7-rule cross-project discipline set now complete through R38."*
2. `~/.claude/CROSS-PROJECT-MEMORIAL.md:3474` is the dedicated section header: *"Reinforcement rules derived (Rule 7 canonical landing — R38 Memorial-Updater stage, per OQ-W5-1 Option A)"*.
3. `coordination/NEXT-ROLE.md:127` — the Implementer's own R40-entry state table — reads: *"| 7 cross-project rules canonical | ✅ |"*. This is in the same file that contains the R40 Implementer attestation.

**Self-contradiction inside § 5.1:** the very paragraph that raises OQ-P3-5 also reads (`:252-254`): *"If operator selects OQ-W5-1 Option A (R38 Memorial-Updater stage — already completed), Rule 7 is canonical; Phase 3 SLICE 1 spec can then include its first structural implementation AC."* The parenthetical "R38 Memorial-Updater stage — already completed" acknowledges R38 fired, yet the subsequent OQ punts on whether the landing actually happened.

**Effect:**
- The "draft" framing applied to Rule 7 text at `:238` ("Rule 7 text (draft, per WAVE-GATE-05.md Decision 3)") is incorrect — the canonical text is landed, not draft.
- OQ-P3-5 is operative on a resolved question; an operator who follows the OQ will spend cycles verifying something already verified.
- The § 6 Parked-items row mislabels a closed gate as still-pending.

**Recommended remediation (Memorial-Updater stage or operator-side):** revise § 5.1 dependency-note paragraph to state Rule 7 IS canonical (citing CROSS-PROJECT-MEMORIAL.md:3470); revise § 6 row to "Status: canonical (landed R38 Memorial-Updater per OQ-W5-1 Option A)"; remove OQ-P3-5 OR replace it with the still-open sub-question about implementation surface (spec-template gate vs. pre-commit grep gate vs. pipeline-level diff gate — which propagation surface to build in Phase 3).

---

### MINOR-1 — AC-R40-2 strict literal: per-subsection dependency notes do not jointly cite "WU-03 NVLink + WU-01 Slurm parallel-class pattern"

**Location:** `coordination/PHASE-3-CANDIDATES-PRELIMINARY.md:25-85` (§ 1.1 through § 1.4 dependency notes)

**Severity:** MINOR — § 1 intro paragraph at `:18-21` covers the umbrella ("established parallel-class adapter architecture (WU-01 Slurm + WU-02 K8s + WU-03 NVLink)"). A charitable reading of AC-R40-2 accepts this. A strict literal reading marks PARTIAL.

**Per-subsection dep-note coverage:**

| Subsection | Dep-note cites WU-03? | Dep-note cites WU-01? |
|---|---|---|
| § 1.1 AMD (`:37-38`) | Yes ("same pattern as WU-03 NVLink shipped against...") | No |
| § 1.2 TPU (`:52-56`) | No | Yes ("vs. the Slurm conf parser from WU-01") |
| § 1.3 Trainium (`:69-71`) | Yes ("Same parallel-class pattern as WU-03 NVLink") | No |
| § 1.4 Inferentia (`:82-84`) | No | No (mentions "parallel Wave 2 cluster" generically) |

If AC-R40-2 is read strictly per-subsection-citation, only § 1.1 partially satisfies, § 1.2 inverts the cite, § 1.3 partially satisfies, § 1.4 satisfies neither. The Implementer's PASS attestation in NEXT-ROLE.md (`:149`) does not disclose this gap.

**Recommended remediation:** Cosmetic — add a single sentence in § 1.4 Inferentia dep-note ("Same parallel-class pattern as WU-01 Slurm + WU-03 NVLink; shipped against synthetic fixtures before live integration"); or relax AC-R40-2 wording in a future spec template.

---

### MINOR-2 — § 1.1 AMD: WU-03 NVLink fixture cited incorrectly

**Location:** `coordination/PHASE-3-CANDIDATES-PRELIMINARY.md:37-38`

**Severity:** MINOR — pattern claim (synthetic-fixture-before-live-integration) is correct; cited fixture file is wrong.

**Detail:**

Deliverable claims: *"(same pattern as WU-03 NVLink shipped against `v9Y-multi-rack-cluster.ts` before live NVML integration)"*.

**Reality:**
- WU-03 NVLink adapter is `engine/topology/nvlink-source.ts` (verified present in `engine/topology/`).
- WU-03 NVLink test substrate is `test/_substrate/nvlink-fixture-well-formed.txt` + `nvlink-fixture-sparse.txt` (verified present in `test/_substrate/`).
- `test/_substrate/v9Y-multi-rack-cluster.ts` is the WU-04 R26 substrate for common-mode-attribution BFS (per `coordination/PRD.md` WU-04 scope block: *"Substrate: uses inherited `test/_substrate/v9Y-multi-rack-cluster.ts` (R23 frozen)"*). It contains `nvlink_peer` edges but is consumed by `engine/topology/common-mode-attribution.ts`, not by `engine/topology/nvlink-source.ts`.

The Implementer's "shipped against v9Y-multi-rack-cluster.ts" conflates the WU-03 adapter with the WU-04 common-mode-attribution consumer.

**Recommended remediation:** Replace `v9Y-multi-rack-cluster.ts` with `nvlink-fixture-*.txt` in the example, or replace the example entirely with the WU-01 Slurm `slurm-fixture-canonical.conf` precedent (which is unambiguously parser-vs-fixture).

---

### MINOR-3 — § 5.1 cites Decision 3 under wrong WAVE-GATE-05 section header

**Location:** `coordination/PHASE-3-CANDIDATES-PRELIMINARY.md:232`

**Severity:** MINOR — citation drift; reduces independent-reader traceability. AC-R40-3 still PASSES because the AC literal only checks for "Decision 3" string appearance, not section-path accuracy.

**Detail:**

Deliverable cites: *"Source: WAVE-GATE-05.md § Cross-project reinforcement rules derived, Decision 3 forward-flag."*

**Reality:** In `coordination/WAVE-GATE-05.md`:
- `:224` `### Decision 3 — Rule 7 derivation evaluation: **RECOMMEND DERIVING** ...` — under `## Wave 5 gate decisions` (preceding parent header)
- `:279` `## Cross-project reinforcement rules derived this gate` — separate parent section starting after `:277` `---` boundary.

Decision 3 lives under "Wave 5 gate decisions", not under "Cross-project reinforcement rules derived this gate". The two sections are sibling parents separated by `---` at WAVE-GATE-05.md:277.

Also: Decision 3's text uses "RECOMMEND DERIVING" and "operator backflow", not "forward-flag". The "forward-flag" language is associated with Decision 5/6 (e.g., WAVE-GATE-05.md:269 "Forward-flag to R40 Phase 3 candidate synthesis"). Whether to call Decision 3 a "forward-flag" is interpretive — the AC text and the deliverable both use it, so they are internally consistent.

**Recommended remediation:** Correct citation to "WAVE-GATE-05.md § Wave 5 gate decisions, Decision 3 (Rule 7 derivation recommendation)".

---

### MINOR-4 — § 5.4 audit-tier-pre-emit-grilling-gap enumeration omits W2; "3rd-occurrence threshold crossed" claim under-supported

**Location:** `coordination/PHASE-3-CANDIDATES-PRELIMINARY.md:298-300`

**Severity:** MINOR — citation incompleteness; the threshold-cross claim is correct per source, but the deliverable only enumerates 2 of the 3 instances the source identifies.

**Detail:**

Deliverable § 5.4 reads: *"R32 hybrid Reviewer (Wave 3) and R36 hybrid Reviewer (Wave 5) both confirmed: ... 3rd-occurrence threshold crossed at Wave 5."*

Only R32 (W3) and R36 (W5) are enumerated — 2 instances — yet the deliverable claims "3rd-occurrence threshold crossed".

**Source (WAVE-GATE-05.md:317):** *"W2 + W3 + W5 (all 3 audit-tier rounds in Phase 2 except cluster-spawned audits) exhibited the audit-tier-pre-emit-grilling-gap pattern: cold-eye Reviewer catches what warm self-grilling cannot."*

The source attributes the pattern to 3 audit-tier rounds (W2 + W3 + W5), and 3rd-occurrence threshold is therefore reached at W5. Deliverable omits the W2 instance entirely. The source also distinguishes the gap-exhibition (W2+W3+W5) from the hybrid-Reviewer-mitigation (R32+R36 only) — the deliverable's "R32 hybrid Reviewer (Wave 3) and R36 hybrid Reviewer (Wave 5) both confirmed" framing collapses these.

**Recommended remediation:** Add the W2 audit-tier instance to the enumeration; or re-phrase to acknowledge "3rd occurrence per WAVE-GATE-05.md:317 enumeration (W2+W3+W5 audit-tier instances; hybrid-Reviewer mitigation observed at R32+R36)".

---

### MINOR-5 — AC-R40-7 right-reasons gap: § 5.1 contains soft author-suggested SLICE placement

**Location:** `coordination/PHASE-3-CANDIDATES-PRELIMINARY.md:250-251`

**Severity:** MINOR — OQ-P3-6 at § 7 (`:353`) does ask "Should Phase 3 begin with § 5 methodology stabilization...", so the sequencing question IS surfaced as an OQ. But § 5.1 prose at `:250-251` reads as a soft author suggestion: *"Rule 7 implementation in Phase 3 SLICE 1 (or MR-3) would protect all subsequent Phase 3 rounds."* Combined with § 3.2 (`:168`) *"Phase 3+ candidate, NOT a Phase 3 SLICE 1 candidate"* (sourced from Q-J6 prior disposition — defensible), the inventory subtly nudges operator toward methodology-first sequencing.

**Recommended remediation:** Re-phrase § 5.1:250 to: "Rule 7 implementation timing (Phase 3 SLICE 1 vs. methodology MR-3 vs. later) is operator-owned per OQ-P3-6."

---

### OBS-1 — § 4.3 anchor PR cadence: stated window doesn't align with documented memory cadence

**Location:** `coordination/PHASE-3-CANDIDATES-PRELIMINARY.md:223-224`

Deliverable reads: *"Operator schedules anchor PR per anchor PR cadence (memory: roughly every 5 rounds; last PR #38 covers R06–R10; next window R35–R40)."*

User memory `[[project_anchor_pr_cadence]]` (visible to Implementer via auto-memory): *"PR #38 covers R06-R10; next reminder fires at R20 close (R11-R20 window)"*. Implies 10-round reminder windows containing 5-round-batch contributions. The deliverable's "next window R35-R40" (6-round window centered on R40) doesn't match this cadence pattern. Plausible reading: Implementer chose the most-recent applicable window for new PRs, skipping the documented R11-R20 and R21-R30 windows. Either the memory is stale (PRs landed in intervening windows; operator can check) or the deliverable picked an ad-hoc window.

**Action:** Operator-side; no inventory-side remediation required if memory is stale.

---

### OBS-2 — AC-R40-3 / AC-R40-4 have weak discriminating power

The two ACs check for the string appearance of "Decision 3" / "Decision 6" + secondary claims, not for citation accuracy (correct section path; correct sub-claim line ranges). MINOR-3 escaped the AC test because the AC only requires the citation to appear, not to be correctly located. This is a spec-design comment, not an Implementer-side defect — flagged here as a forward-flag for any future R40-style inventory round that wants a tighter binding.

---

### OBS-3 — § 3.2 "NOT a Phase 3 SLICE 1 candidate" embedded sequencing claim, defensible

`:168` reads: *"Q-J6 disposition: optional/market-dependent. Phase 3+ candidate, NOT a Phase 3 SLICE 1 candidate."* This is an author-stated sequencing claim that nominally violates AC-R40-7. Grounded in Q-J6 prior operator disposition (referenced at `:137-139` "Per Q-J6 resolution (2026-05-16 MEMORIAL.md): DeploySignal Phase E indefinitely deferred; Tessera takes priority; DS-integration is 'optional / market-dependent.'"). Quoting prior operator decision is defensible; not an author-side resolution.

---

### OBS-4 — Implementer attestation row for AC-R40-2 is overconfident

`coordination/NEXT-ROLE.md:149` reads: *"AC-R40-2 | All 4 TAGGED-FUTURE adapters (AMD/TPU/Trainium/Inferentia) with 'why' + dependency notes | PASS — §§ 1.1-1.4 each contain both"*. The dep-note literal-text check (MINOR-1 above) shows the "each contain" claim under strict AC reading is partial. The Implementer's PASS attestation does not disclose the gap.

---

## § 3 Right-reasons audit

Pick 3 ACs and trace each.

### AC-R40-3 (Rule 7 cites Decision 3 forward-flag)

- **Spec requirement:** § 3 AC-R40-3 — citation must appear AND candidate framed as Phase 3 implementation item.
- **Why does it pass?** Deliverable § 5.1 contains the string "Decision 3" + Phase 3 framing. The AC test is satisfied by surface-level string presence + "Phase 3" framing.
- **Self-confirming risk:** YES — the AC is checking "did the author write the words 'Decision 3'" rather than "is the citation correctly located + accurate". The Implementer authored both the AC and the deliverable; the AC's discriminating power is structurally weak (passed despite the wrong-section-header issue at MINOR-3, and despite the related MAJOR-1 status-conflict). This is a right-reasons partial-failure of test design, not of Implementer fidelity.

### AC-R40-7 (No sequencing decisions resolved by author)

- **Spec requirement:** Any operator-decision-class question flagged as OQ; not resolved by author recommendation.
- **Why does it pass?** OQ-P3-1..6 are present at expected locations. The AC test counts presence of OQ flags.
- **Self-confirming risk:** PARTIAL — the AC test catches explicit sequencing OQs but misses implicit sequencing prose (MINOR-5 § 5.1 "Phase 3 SLICE 1 (or MR-3)"; OBS-3 § 3.2 "NOT a Phase 3 SLICE 1 candidate"). The Implementer-authored AC under-binds the Implementer-authored deliverable.

### AC-R40-8 (Anti-scope diff empty)

- **Spec requirement:** `git diff <round-start-SHA> HEAD --name-only -- engine/ test/ src/ tools/ CLAUDE-*.md SCOPING-MEMO* PRD.md` returns empty.
- **Why does it pass?** Reviewer ran the exact command from a clean repo and got empty output. The full `git diff 0759eec HEAD --name-only` shows only coordination/ files (MEMORIAL.md, NEXT-ROLE.md, PHASE-3-CANDIDATES-PRELIMINARY.md, specs/Q-R40-SPEC.md).
- **Self-confirming risk:** NO — binding command output verified independently; not author-discretionary. This is the strongest AC in the spec.

---

## § 4 Cross-cutting checks

### TDD discipline
**N/A.** R40 is a documentation-synthesis round; no new test code (or production code) was written or modified. No RED commit expected; none made. Git history shows: `0759eec` chore-A-prep → `a865430` feat (deliverable + spec) → `3e8f4b7` chore (NEXT-ROLE attestation + MEMORIAL) — clean documentation-round commit sequence.

### No-skip / halt discipline
**Pass.** The Implementer's MEMORIAL accretion at `coordination/MEMORIAL.md:3007` correctly notes "No halt conditions encountered". However, the Rule 7 status issue (MAJOR-1) WAS a halt-candidate that wasn't recognized: the inventory's own input artifact (CROSS-PROJECT-MEMORIAL.md) and the Implementer-authored state table (NEXT-ROLE.md:127) contradicted each other vs. the deliverable's "Status unknown" framing. A pre-emit grilling that asked "is OQ-P3-5 operative on a question my own state table answers?" would have surfaced the conflict. This is a discipline gap, not a halt-discipline violation — the conflict was internal contradiction, not an external blocking decision.

### Anti-scope
**Pass.** Diff command confirmed empty for anti-scoped paths. Only 4 files modified in the R40 chain, all under `coordination/`. None of: engine/, test/, src/, tools/, CLAUDE-*.md, SCOPING-MEMO*, PRD.md.

### Brainstorm + Design discipline
**Pass.** Spec § 2 Mechanism documents 3 brainstorm approaches with selection rationale (Approach B selected; A and C documented as rejected with reasons). Design sketch maps sources to sections; failure modes enumerated. Memorial CONFIRMATION at `coordination/MEMORIAL.md:3001`.

### Pre-emit grilling
**Partial.** Spec § Pre-emit grilling claims all 4 grilling questions PASS, including "Can Reviewer act with zero clarifying questions? Yes — ACs are structure + content checks verifiable by reading the deliverable against the listed source artifacts." Reviewer could in fact act cold (no clarifying questions blocked this audit), so the grilling outcome holds. But MAJOR-1 demonstrates the grilling didn't sweep for contradictions between deliverable content and other Implementer-authored artifacts (NEXT-ROLE.md state table). A 5th grilling question — "are any of my surfaced OQs operative on questions answerable by my own state table or input artifacts?" — would have caught MAJOR-1 and MINOR-3.

---

## § 5 Grilling output (on this report, before routing)

- Every finding has a file:line reference? **Yes** — MAJOR-1 cites `:252-256`, `:325`, `:3470`, `:127`; all MINORs cite specific deliverable line ranges; all OBS cite locations.
- Any AC marked PASS without actual verification? **No** — AC-R40-8 was re-run by Reviewer; AC-R40-1/3/4/5/6 were verified by reading the deliverable file directly; AC-R40-2 and AC-R40-7 are PARTIAL with explicit reasons given.
- Right-reasons audit completed for 3+ tests? **Yes** — AC-R40-3, AC-R40-7, AC-R40-8 audited; 2 right-reasons-weakness findings disclosed (AC-R40-3 self-confirming risk; AC-R40-7 partial-binding).
- Adversarial mandate honored (≥1 finding)? **Yes** — 1 MAJOR + 5 MINOR + 4 OBS = 10 total findings; zero-findings risk not realized.
- Cold-review boundary held? **Yes** — I did NOT read `coordination/diagnostics/`, `coordination/logs/`, or any `.prompt-*.md` file. I read PRD.md, Q-R40-SPEC.md, the deliverable, NEXT-ROLE.md (for diff-verification + attestation cross-check), MEMORIAL.md (R40 entries only — for the Implementer's CONFIRMATIONs), and source-of-truth artifacts named in the spec (SCOPING-MEMO-v0.3.md, WAVE-GATE-05.md, PHASE-2-CLOSE-WALK.md, ANCHOR-BACKFLOW-2026-05-18.md, STAGED-FOR-PHASE-2-CLOSE.md, CROSS-PROJECT-MEMORIAL.md).

---

## § 6 Verdict

- **CRITICAL:** 0
- **MAJOR:** 1 (Rule 7 canonical-landing status mislabeled in § 5.1 + § 6; OQ-P3-5 operative on a resolved question)
- **MINOR:** 5
- **OBS:** 4

**Routing:** MERGE-READY (no CRITICAL).

The MAJOR-1 Rule 7 status finding does NOT block merge of the inventory — the inventory is a DRAFT for operator review, not an authoritative methodology artifact, and the MAJOR is content-correctable. Operator should be advised to read MAJOR-1 in this report before treating OQ-P3-5 / § 6 Rule-7-status row as actionable.

**Recommended Memorial-Updater / operator follow-ups:**
1. Note MAJOR-1 in the operator handoff; either the operator amends the deliverable inline (1-line fix to § 6 Rule-7-row + § 5.1 dependency-note paragraph + drop OQ-P3-5 OR replace with implementation-surface OQ), or the deliverable carries the disclaimer forward to Phase 3 PRD authoring.
2. MINOR-1 / MINOR-2 / MINOR-3 / MINOR-4 are cosmetic content-fixes — bundle into a future R41-style or Phase 3 SLICE 1 documentation pass.
3. OBS-2 forward-flag: when authoring future "inventory-synthesis" specs, give string-presence ACs tighter binding (e.g., "Decision 3 citation includes correct parent-section header and quotes a specific draft-rule sentence").

