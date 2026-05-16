# TPM-REPLY-Q-01 — Tessera Phase 1 SLICE 1 Mac Claude Routing

_From: TPM (self-routing in single-session model)._
_To: Mac Claude (TBD which session; one session sufficient at SLICE 1 architectural-foundation-only scope)._
_Date: 2026-05-16._
_Foundation: `coordination/SCOPING-MEMO-v0.3.md` (canonical Tessera scope; § 1.6 Existing architectural surface for grep-evidenced citations) + `coordination/Q-01-PHASE-1-SLICE-1-SPEC.md` (full SPEC fidelity at v0.2 post-Reviewer-amendment) + `coordination/ARCHITECT-REPLY-v0.3-PRE-DISPOSITION.md` (Q-J1..Q-J5 PICKED; Q-J6 ESCALATED) + `coordination/REVIEWER-REPORT-Q-01-PHASE-1-SLICE-1.md` (Q1 spec audit; 1 FAIL + 5 GAP all AMENDED) + `coordination/ARCHITECT-REPLY-Q-01-DISPOSITION.md` (Memorial D 22V/8C stamp)._
_Type: routing pasteable (Mac Claude implementation start)._

**GATED — do not paste to Mac Claude session until ALL conditions met:**

1. **John's Q-J6 disposition** unblocks Tessera Phase 1 prioritization (Q-J6 escalated per PRE-DISPOSITION; options (i) DS Phase E first / (ii) Tessera first / (iii) parallel / (iv) DS deferred).
2. **John's confirmation or amendment** of Q-J1..Q-J5 architect-pre-prediction picks.
3. **John's acceptance** of Q1 spec v0.2 amendments (post-Reviewer-F1 corrections).
4. **Anchor PR #34** ([README install fix](https://github.com/johnpatrickwarren-oss/anchor/pull/34)) merged so install instructions are current.
5. **Anchor PR #35** ([MD-F6 structural fix](https://github.com/johnpatrickwarren-oss/anchor/pull/35)) merged so `verify-citations.sh` + § Existing architectural surface template are canonical from anchor `main`.

If gates 4-5 are not merged by Mac Claude start time, Mac Claude can still proceed using the feature branch at `~/concord/anchor` (`feat/md-f6-existing-architectural-surface`); document the branch-dependency in the SLICE 1 close-walk artifact for re-pinning at merge time.

---

## Pasteable (lead block per `feedback_pasteable_direction`)

```text
ROLE: Mac Claude / Implementer for Tessera
SESSION: cold-start; isolate to its own git worktree per anchor skills/07-round-numbering-convention.md
WORKTREE PATH SUGGESTION: ~/concord/tessera-worktree-q01 (sibling to ~/concord/tessera/)
CYCLE: Tessera Q1 — Phase 1 SLICE 1 (engine vendoring + schema additions)

──────────────────────────────────────────────────────────────────────

SCOPE (per Q-01-PHASE-1-SLICE-1-SPEC.md § Spec):

Vendor the load-bearing statistical-detector engine subset from DeploySignal
main@5a72371 into tessera/ and extend the compile-time schema with three
Tessera-specific additions (shard_id cell dimension; per_shard_cells field;
warm_start confidence enum value). Architectural-foundation-only — no
fleet-merge logic, no per-shard predicate logic, no detector behavior
changes. ~32 vendored files + 4 project-config files + 3 new test files +
1 vendoring script + 1 manifest.

FOUNDATION (read in this order BEFORE starting):

1. tessera/coordination/SCOPING-MEMO-v0.3.md — canonical scope (esp. § 1.6
   Existing architectural surface for inherited citations, § 9 engine
   vendoring policy).
2. tessera/coordination/Q-01-PHASE-1-SLICE-1-SPEC.md (v0.2) — your spec.
   ALL sections; especially:
     § Architectural mechanism (3 primitives + integration points)
     § Existing architectural surface (REVIEWER-ANCHOR — 8 citation rows
       grep-evidenced at SHA 5a72371; verify each via
       integrations/superpowers-claude-code/scripts/verify-citations.sh
       at Step 0 below)
     § Open questions resolved at spec-emit Q1.1-Q1.5 (architect picks)
     § Implementation surface (per-file pseudo-code for 8+ files)
     § Tests (3 new Tessera-side tests; 2 vendored smoke-tests)
     § Acceptance criteria (10 ACs binary-met-or-not)
     § Anti-scope (SAS-1 through SAS-9; halt-and-route-back triggers)
3. tessera/coordination/ARCHITECT-REPLY-Q-01-DISPOSITION.md — Memorial D
   state stamp + Memorial F sub-rule application reminders.
4. tessera/coordination/PROJECT-CONTEXT.md — project-relationship diagram
   + Memorial D state lineage.

──────────────────────────────────────────────────────────────────────

PRE-WORK INVOCATIONS (mandatory):

1. superpowers:using-superpowers — establish skill conventions for the
   session (Skill tool, announce skill use, follow rigid skills exactly,
   adapt flexible skills to context).

2. superpowers:writing-plans — before touching any code. Spec is at
   SPEC fidelity but not at writing-plans fidelity (no task-level
   2-5-minute-bite-sized breakdown). Decompose § Implementation surface
   into ≤2-5-min tasks; reference exact file paths + complete code +
   verification steps per task.

3. superpowers:using-git-worktrees — create isolated workspace on the
   suggested worktree path; run project setup; verify clean test baseline
   (`npm test` exits cleanly; expect 0 tests until you write them).

4. integrations/superpowers-claude-code/scripts/verify-citations.sh —
   run against Q-01-PHASE-1-SLICE-1-SPEC.md to verify the 8 inherited
   citations resolve at SHA 5a72371. Expected: 8 rows verified, 0
   failures. Invocation:
     verify-citations.sh tessera/coordination/Q-01-PHASE-1-SLICE-1-SPEC.md \
       --repo-root ../deploysignal
   If failures: HALT and route to Architect (citations may have
   drifted; need re-pin or correction).

──────────────────────────────────────────────────────────────────────

EXECUTION (per superpowers:test-driven-development + superpowers:
verification-before-completion):

After writing-plans produces the task list:

a. Implement task-by-task in plan order.
b. Each task: red (write failing test) → green (write minimum code to pass)
   → refactor (clean up). NO speculative implementation past the task at
   hand.
c. After each task: re-run all tests. Continue only on green.
d. At completion: invoke superpowers:verification-before-completion before
   any claim of "done." Evidence required: `npm run typecheck` exits 0,
   `npm test` exits 0 with all 3 new tests passing + 2 vendored
   smoke-tests passing. Capture command output in the close-walk artifact.

──────────────────────────────────────────────────────────────────────

HALT CONDITIONS (route back to Architect via TPM):

H1. ANY anti-scope encountered (SAS-1 through SAS-9 per Q1 spec § Anti-scope).
    Most likely surfaces:
      - SAS-1: encounter apparent need to modify vendored detector internals.
        → ADR-class disposition needed.
      - SAS-2: temptation to write Tessera-specific orchestrator at SLICE 1.
        → SLICE 2-3 scope; deferred.
      - SAS-6: vendored smoke-tests need substrate harness Tessera doesn't
        have. → SLICE 2-3 scope; deferred.
H2. verify-citations.sh produces FAIL rows after vendoring (citations don't
    resolve). → Architect re-pin or correction.
H3. tsc clean compile fails after vendoring (path mappings broken; OQ-2
    surfaced). → Implementer adjusts; if structural, route back.
H4. Hidden runtime dependency in vendored file (vanishingly small per
    engine-modularity originating fact; <5% architect-pre-prediction). →
    Architect escalation.
H5. Memorial F sub-rule violation discovered at implementation time:
    sub-rule 1 (P3.3 multiple-read-paths) — runtime code consuming
    CellDimension/CellConfidence/CompiledConfig not covered by Tessera
    extensions; sub-rule 2 (MERGE-vs-REPLACE) — inherited optional field
    accidentally made required. → Halt; route to Architect.

──────────────────────────────────────────────────────────────────────

ANTI-SCOPE (preserved from Q1 spec § Anti-scope; halt-and-route-back triggers):

- SAS-1: NO modification to vendored detector internals (A12 enforcement).
- SAS-2: NO Tessera-specific orchestrator at SLICE 1.
- SAS-3: NO fleet-merge logic at SLICE 1.
- SAS-4: NO per-shard predicate logic at SLICE 1.
- SAS-5: NO hardware topology code at SLICE 1.
- SAS-6: NO test-suite substrate harness at SLICE 1.
- SAS-7: NO _q72-trace.ts vendoring at SLICE 1.
- SAS-8: NO engine/agent.ts vendoring at SLICE 1.
- SAS-9: NO Tessera-specific compiled-config JSON file at SLICE 1.

Plus v0.3 anti-scope clauses A1-A17 carry forward at SLICE 1 (preserved by
construction since SLICE 1 doesn't touch the architectural surfaces those
clauses govern). Confirm preservation at close-walk.

──────────────────────────────────────────────────────────────────────

ACCEPTANCE (all 10 ACs binary-met-or-not per Q1 spec § Acceptance criteria):

AC-1: 11 detector files vendored at-pin with headers; coverage test passes.
AC-2: 5 family type files vendored at-pin with headers.
AC-3: tessera/engine/types/config.ts extends inherited schema with shard_id +
      per_shard_cells + warm_start additively (no inherited fields broken).
AC-4: Core + orchestration primitives vendored at-pin (5 files: core,
      per-detector-resampler-mode, topology-overlay, signal-classes,
      verdict-groups + 7 type files: verdict, primitives, metrics,
      orchestration, policy, audit, self-normalized-fallback, index).
      Reference: bulk inventory in spec § Existing architectural surface
      "Bulk-vendoring inventory" sub-list.
AC-5: tessera/coordination/VENDORING-MANIFEST.md enumerates every vendored
      file with source SHA + sync policy + vendored-date.
AC-6: `npm run typecheck` exits 0 against tsconfig.test.json.
AC-7: Byte-identity preservation across ALL vendored-at-pin files
      (broadened from detector-only per Reviewer G3); q01-no-at-pin-deltas
      test enforces.
AC-8: tessera/tools/vendor-from-deploysignal.sh script lands; re-running
      against same source + SHA produces no diff in vendored files (idempotent).
AC-9: package.json + tsconfig.json + tsconfig.test.json land per Q1.1+Q1.2
      architect picks.
AC-10: Vendored smoke-test (test/betting-e-process-class-dispatch.test.ts)
       runs via `npm test` and passes.

Each AC binds to ≥1 test per Skill 15 prescription-to-AC-coverage discipline.

──────────────────────────────────────────────────────────────────────

EFFORT TARGET:

~6 hours of focused implementation; can fit in 1 day if no LS surface,
2 days with OQ-2 path-mapping iteration. Per architect-pre-prediction:
70% clean-close; 20% LS-Q1.1 tsc-path-adjustment iteration;
7% prettier/eslint header-format friction; 3% empirical hidden-dep surprise.

──────────────────────────────────────────────────────────────────────

CROSS-CUTTING VERIFICATION (project-wide invariants):

- No-skip policy: zero test skips at SLICE 1 (3 new + 2 vendored smoke = 5
  active tests minimum).
- Inherited LEDGER clauses (Q2.B.6.4 / Q58 / Q59 / Q60 / Q66 / Phase-3.d.D)
  preserved via engine vendoring at-pin.
- Memorial D state stamp at close-walk: increment only if discipline gap
  surfaces (architect-pre-prediction: no increment expected at SLICE 1
  since engine vendoring is mechanical).
- A1-A17 v0.3 anti-scope clauses preserved by construction at SLICE 1
  (no architectural surfaces touched that those clauses govern).

──────────────────────────────────────────────────────────────────────

DELIVERABLE (Mac Claude close-walk emission):

1. PR or branch on tessera with all vendored files + 3 new tests + project
   configs + vendoring script + manifest.
2. `tessera/coordination/MAC-CLAUDE-Q-01-CLOSE.md` — close-walk artifact:
   - List of vendored files with their source SHA in headers.
   - VENDORING-MANIFEST.md path.
   - Test invocation outputs (`npm run typecheck` + `npm test`) captured
     verbatim with exit codes.
   - Each AC marked met/not-met with evidence path.
   - Each SAS clause verified preserved.
   - Any LS or OQ surfaced at implementation time; how resolved.
   - Memorial D state assessment (no-increment vs increment-with-reason).
3. Route back to Architect for SLICE 1 close-walk Reviewer audit (single-
   Reviewer cold-context per inherited Q1 spec footer commitment — hybrid
   Reviewer is SLICE 3+ territory).

──────────────────────────────────────────────────────────────────────

ESCALATION PATH:

If gates 1-5 above are not all met → DO NOT PASTE this routing. Operator
escalates to John for Q-J disposition + PR merges.

If gates met but mid-implementation halt (H1-H5) → Mac Claude writes a
DIAGNOSTIC artifact to tessera/coordination/DIAGNOSTIC-Q-01-<topic>.md;
routes via TPM to Architect; architect dispositions + amends spec or
provides override; Mac Claude resumes.

If implementation reaches completion but Reviewer audit produces FAIL →
v0.2-of-implementation amendment cycle (analogous to Q1 spec v0.1 → v0.2
in this session's overnight cycle).
```

---

## Pre-route discipline check

Per anchor `skills/04-pre-route-checklist.md`:

- [x] All filenames cited LIVE-verified (`SCOPING-MEMO-v0.3.md`, `Q-01-PHASE-1-SLICE-1-SPEC.md`, `ARCHITECT-REPLY-v0.3-PRE-DISPOSITION.md`, `REVIEWER-REPORT-Q-01-PHASE-1-SLICE-1.md`, `ARCHITECT-REPLY-Q-01-DISPOSITION.md`, `PROJECT-CONTEXT.md` — all exist in `tessera/coordination/` per `ls` 2026-05-16).
- [x] All version labels CURRENT (v0.3 canonical scoping; Q1 spec v0.2 post-amendment; PR #34 + #35 references current).
- [x] All line numbers / SHA citations CURRENT (verified via `verify-citations.sh` at v0.3 § 1.6 — 12/12 rows verified; at Q1 spec § Existing architectural surface — 8/8 rows verified).
- [x] All test counts cited at architect-pre-prediction level (3 new + 2 vendored smoke; Mac Claude reports actual counts at close-walk).
- [x] All upstream architect / Reviewer claims GREP-VERIFIED in the actual artifacts (cross-referenced spec + Reviewer report + disposition all open at TPM-emit time).
- [x] Upstream architect / Reviewer / PM decisions LINKED to source artifacts (v0.3 + Q1 spec + Reviewer report + dispositions all in `tessera/coordination/`).
- [x] Anti-scope clauses from upstream PRESERVED in this routing (SAS-1 through SAS-9 + A1-A17 carry-forward enumerated in pasteable).

All items checked. Routing emit cleared.

---

## TPM grilling pass output

### CRITICAL: 0

No CRITICAL items requiring upstream amendment before forwarding.

### LIKELY-SURFACES: 3

- **L1:** OQ-2 tsconfig path mapping adjustment (LS-Q1.1 per Q1 spec). Mac Claude likely adjusts `paths` in tsconfig at implementation time; minimal cycle cost. Pre-flagged in pasteable § HALT H3.
- **L2:** verify-citations.sh availability — if anchor PR #35 hasn't merged when Mac Claude starts, the script lives at `~/concord/anchor/integrations/superpowers-claude-code/scripts/verify-citations.sh` on the feature branch (`feat/md-f6-existing-architectural-surface`). Pre-flagged in gating-conditions note at top of artifact.
- **L3:** Q-J1..Q-J5 PRE-DISPOSITION picks not yet John-confirmed at SLICE 1 implementation start (only Q-J6 blocks; Q-J1..Q-J5 architect-picked under autonomy authority). Mac Claude proceeds with PICKED picks; if John amends post-implementation, architect re-emits affected spec sections at ~0.1-0.3 Q-cycle each. Pre-flagged in gating-conditions notes.

### PRE-EMPTABLE: 4

- **P1:** Mac Claude pre-work invocations (using-superpowers, writing-plans, using-git-worktrees, verify-citations.sh) folded into the pasteable as the mandatory first-4-steps.
- **P2:** TDD + verification-before-completion folded into the pasteable § EXECUTION as named skill invocations.
- **P3:** Worktree isolation explicit in pasteable per `feedback_parallel_macclaude_worktree_isolation` (inherited from DeploySignal coordination practices).
- **P4:** Deliverable specification (close-walk artifact path + content checklist) folded into pasteable § DELIVERABLE.

---

## Sequencing / track context

- **Upstream (must complete first):**
  - John's Q-J6 disposition (escalated; strategic decision)
  - John's Q-J1..Q-J5 confirmation/amendment
  - John's Q1 v0.2 acceptance
  - Anchor PR #34 + #35 merge (or branch-dependency noted)
- **Downstream (depend on this):**
  - Mac Claude → Reviewer cold-context audit of SLICE 1 implementation
  - Architect → SLICE 1 close-walk + ADR-walk
  - Q2 (Phase 1 SLICE 2) spec drafting — starts only after Q1 close
- **Parallel tracks operating concurrently:**
  - None at this point. Single-track sequential (Tessera Phase 1 is the only active engineering work). Could parallelize at SLICE 2-3 if Q-J6 dispositions parallel-tracks per option (iii).

Worktree convention: single Mac Claude session at SLICE 1 (no parallel needed for architectural-foundation-only mechanical work). Worktree path suggestion `~/concord/tessera-worktree-q01` keeps the SLICE 1 work isolated from any other ad-hoc Tessera work.

---

## Memorial state at this routing

Per anchor `skills/02-memorial-accretion.md`. Snapshot at routing-emit:

- **Memorial D** (architectural-layer-coverage / file-opened-discipline): **22V/8C** post-Q1-v0.2-amendment (per ARCHITECT-REPLY-Q-01-DISPOSITION). 8th CONFIRMATION class extended to 6 sub-instances post-this-session-overnight cycle. **Mac Claude application:** apply file-opened-discipline at Step 0 (running verify-citations.sh on Q1 spec; verifies all 8 citations resolve at SHA 5a72371).
- **Memorial F** (4 sub-rules at brief-drafting-time, applied by Mac Claude at implementation-time): all 4 fire at SLICE 1. **Application:**
  - Sub-rule 1 (P3.3 multiple-read-paths): grep runtime detector code for `CellDimension` / `CellConfidence` / `CompiledConfig` consumers; verify Tessera extensions don't break inherited runtime semantics.
  - Sub-rule 2 (MERGE-vs-REPLACE): Tessera additions to `CompiledConfig` use OPTIONAL field (`per_shard_cells?:`) — inherited optional pattern. Verify MERGE preserved.
  - Sub-rule 3 (ADR-anti-scope-preservation): inherited Q2.B.6.4 + Q58 + Q59 + Q60 LEDGER clauses preserved via engine vendoring at-pin (no code modifications).
  - Sub-rule 4 (Pre-existing-property-vs-new-AC coherence): 10 new SLICE 1 ACs cohere with inherited Ville-bounded property — verify in close-walk.

---

## Open coordination items

- **For Architect:** SLICE 1 close-walk authoring after Mac Claude completion + Reviewer audit; ADR-walk against v0.3 anti-scope clauses; Memorial D state assessment.
- **For Reviewer:** cold-context audit of Mac Claude implementation post-close. Single-Reviewer sufficient at SLICE 1 (hybrid Reviewer is SLICE 3 territory per inherited Anchor commitment in Q1 spec footer).
- **For PM (John):** Q-J6 disposition (escalated; gating); Q-J1..Q-J5 confirmation; anchor PR #34 + #35 merge decisions; Q1 v0.2 acceptance.
- **For human operator (John):** verify all 5 gating conditions met before pasting the routing block into a Mac Claude session.

---

_Routing artifact per anchor `skills/03-four-anchor-defense.md` (T1 anchor) + `skills/04-pre-route-checklist.md` + `skills/01-pre-emit-grilling.md`. SLICE 1 architectural-foundation-only scope; no fleet-merge / per-shard predicate logic / hardware topology / detector internals modifications. ~6 hours focused implementation; 1-2 days wall-clock depending on LS surface._

_Created 2026-05-16 overnight under autonomy authority (John 2026-05-15 disposition). Gating conditions enumerated at top; do not paste to Mac Claude until all conditions verified met._
