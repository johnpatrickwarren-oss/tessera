# CLUSTER-HANDOFF-2-WU00-WU05 — WU-00 L0-CONTRACT → WU-05 SLICE 3 CLOSE-WALK

**From:** Coordinator TPM (R31)
**Date:** 2026-05-18
**Wave:** Source cluster CL-01-A (Wave 1) → Target cluster CL-03-A (Wave 3)
**Foundation:** `WAVE-PLAN-02.md` §WU-00 + §WU-05; `coordination/reviews/REVIEWER-REPORT-R25.md`; `coordination/WAVE-GATE-01.md` § Findings by cluster CL-01-A; `coordination/WAVE-GATE-02.md`
**Type:** cross-cluster dependency contract

---

## Purpose

WU-05 (SLICE 3 close-walk; audit-tier with Hybrid Reviewer) audits WU-00's L0-contract deliverable as one of five SLICE-3 architectural foundations + closes the 6 pre-flagged Wave-1 R25 carry-forward items (3 MAJOR + 3 MINOR). This artifact is the concrete handoff: what WU-00 produced, what spec-drift items WU-05 must close via spec amendment (not test/code change — WU-05 is close-walk-tier and Wave-1-frozen on engine/test bodies), and what verification status the close-walk inherits from Wave 1.

The Coordinator verified at Wave 1 gate (R27) that WU-00's L0-contract surface is functionally correct (12 of 14 ACs PASS empirical at WU-00 cluster; 2 PARTIAL are spec-drift not behavioral defects); at Wave 2 gate (R31) the surface was validated empirically by WU-03 NVLINK's D1 HIGH consumption (R-E7 mitigation evidence package, ACs AC-R30-10..14 exercising all 6 invariants).

---

## Dependency edge

- **Source cluster:** CL-01-A
- **Source work unit:** WU-00 — L0-CONTRACT (Tessera Phase 2 SLICE 3.A.5)
- **Target cluster:** CL-03-A
- **Target work unit:** WU-05 — SLICE 3 close-walk
- **Dependency test that fired:** D1 (shared output ownership)
- **Edge confidence:** HIGH
- **Edge reasoning:** Per WAVE-PLAN-02 Step 2, WU-05 close-walk reads `engine/l0/counter-rate-transform.ts` + `REVIEWER-REPORT-R25.md` directly to aggregate SLICE 3 state stamp and to enumerate the carry-forward MINOR/MAJOR close items. The audit-tier close-walk is the consolidated SLICE 3 deliverable per SCOPING-MEMO § 3 SLICE 3.C row; WU-00 is one of the 5 source WUs feeding into it. Hybrid Reviewer (Opus + Sonnet + Merger) re-audits the L0-contract surface as part of the SLICE 3 close per SCOPING-MEMO § 3 commitment.

---

## What the source cluster produced

### Output artifact(s)

| Artifact | Location | Description |
|---|---|---|
| `counter-rate-transform.ts` | `engine/l0/counter-rate-transform.ts` (158 lines; Tessera-original) | The L0 contract module. Exports `transformPair`, public types (`CounterSample`, `CounterMetadata`, `TransformOpts`, `RateSample`), and constants (`UINT32_MAX`, `UINT32_MOD`, `DEFAULT_JITTER_TOLERANCE`, `DEFAULT_WRAP_THRESHOLD_RATIO`). |
| `synthetic-counter-generator.ts` | `test/_substrate/synthetic-counter-generator.ts` (91 lines; Tessera-original) | Test substrate with 5 factories: `makeCleanPair`, `makeMissedScrapePair`, `makeWrap32Pair`, `makeResetPair`, `makeVariableIntervalSequence`. WU-03 NVLINK exercised all four failure-mode factories empirically (R-E7 mitigation evidence package). |
| `q25-l0-contract.test.ts` | `test/q25-l0-contract.test.ts` (204 lines) | Reference test exercising all six invariants. Wave-1-frozen; pre-R28 test file inherited at Wave 2 and verified untouched. |
| `Q-R25-SPEC.md` | `coordination/specs/Q-R25-SPEC.md` | Architect spec with 14 ACs; contains the 3 unresolved spec-drift items WU-05 close-walk amends. |
| `Q-R25-SPEC-AUDIT.md` | `coordination/specs/Q-R25-SPEC-AUDIT.md` | Architect ceremony sidecar. |
| `REVIEWER-REPORT-R25.md` | `coordination/reviews/REVIEWER-REPORT-R25.md` | Reviewer report: 12 PASS / 1 FAIL (env) / 2 PARTIAL (spec-drift); 3 MAJOR / 3 MINOR / 2 OBS. |

### Interface contract (recap from Wave 1 handoff; unchanged at Wave 2 close)

**Pure-function signature** (`engine/l0/counter-rate-transform.ts:94`):

```typescript
export function transformPair(
  prev: CounterSample,
  next: CounterSample,
  meta: CounterMetadata,
  opts: TransformOpts,
): RateSample;
```

Full type definitions in `CLUSTER-HANDOFF-1-WU00-WU01.md` § Interface contract (preserved on disk; do not re-author). WU-05 close-walk audit reads that artifact as the canonical interface description; the surface has not changed at Wave 2 close (zero modifications to `engine/l0/counter-rate-transform.ts` body across R28/R29/R30 per all three Reviewer reports' anti-scope verification).

**Six behavioral invariants** (full enumeration in Q-R25-SPEC.md § 1.2 — close-walk audit re-validates each against the implementation):

1. Rate-domain output for counter signals.
2. `actual_elapsed_seconds` is first-class.
3. Missed-scrape detection (`slope_quality: 'degraded'` + `missed_scrape_inferred: true`; no interpolation).
4. 32-bit wraparound handling (only when `counter_width === 32` AND `next < prev` AND `prev > wrap_threshold_ratio × UINT32_MAX`).
5. Reset-vs-wrap disambiguation (`value: null`, `reset_detected: true`).
6. Metadata propagation (all four flags emitted on every `RateSample`).

---

## Verification status

Per `REVIEWER-REPORT-R25.md` § 2 + Coordinator gate § Findings by cluster CL-01-A (WAVE-GATE-01) + Wave 2 empirical re-validation (WAVE-GATE-02 MEM-C-W2-1):

- [x] Output artifact exists at the stated location (`engine/l0/counter-rate-transform.ts`, 158 lines; verified at gate via main HEAD `56ee259` post-Wave-2 merge; bit-identical to Wave-1-merge HEAD `3308681` per anti-scope verification across R28/R29/R30 Reviewer reports).
- [x] Interface contract matches the Reviewer's per-AC verification (12 PASS / 1 FAIL env / 2 PARTIAL spec-drift; transformPair functional surface confirmed correct by AC-R25-1 through AC-R25-12; re-validated empirically by WU-03 ACs AC-R30-10..14).
- [x] No CRITICAL findings in source cluster's Reviewer report affect this contract.
- [x] Anti-scope clauses from source cluster's scope do not unexpectedly bound this output. WU-00's allowed-set ships as 8-entries with the DIAGNOSTIC widening logged not rejected (per WAVE-GATE-01 § Findings by cluster CL-01-A); spec amendment of § 3 / § 4.6 / § 9.6 / § 9.7 / § 9.10 is the carry-forward item to WU-05.

---

## Carry-forward items the close-walk MUST close (spec amendment in WU-05 cluster)

WU-05 is audit-tier and Wave-1/Wave-2-frozen on engine + test bodies. Close-walk amends the Q-R25-SPEC.md spec sections; the implementation + tests are not modified. Each item is documented at REVIEWER-REPORT-R25.md § Findings + WAVE-GATE-01 § Findings by cluster CL-01-A.

### R25 MAJOR-1 — AC-R25-14 baseline reconciliation (Architect-attributable)

**Spec drift:** Q-R25-SPEC.md § 5.1 prescribes literal `tests=229 / pass=229 / fail=0`; cluster-worktree empirical was `pass=228 / fail=1` (q01 AC-7 ENOENT on `../deploysignal/engine/detectors/_linalg.ts` sibling-unavailable in `~/projects/tessera-clusters/wu-00-l0-contract/`). Operator dispositioned MERGE-READY with documented pre-existing; spec was never amended.

**WU-05 close-walk action:** Amend Q-R25-SPEC.md § 5.1 AC-R25-14 row + § 9.1 claim 6 to encode the actual cluster-worktree baseline + q01 ENOENT acknowledgment. Apply the same pattern that R26 spec uses for the post-Wave-1 baseline. Do NOT silently rewrite the AC literal — annotate the amendment with a SLICE-3-close-walk attribution comment.

### R25 MAJOR-2 — Allowed-set drift (8 prescribed in test vs 7 in spec; DIAGNOSTIC file legitimate but un-amended)

**Spec drift:** Q-R25-SPEC.md § 3 / § 4.6 / § 9.6 / § 9.7 / § 9.10 prescribe 7-entry ALLOWED_SET. Test `AC-R25-15` ships an 8-entry ALLOWED_SET including `coordination/diagnostics/DIAGNOSTIC-R25-ac12-tolerance.md` (committed legitimately at HALT `4f405c0`); spec § 9.10 reasoning "DIAGNOSTIC files are outside chore-A diff scope" was empirically wrong.

**WU-05 close-walk action:** Amend Q-R25-SPEC.md § 3 / § 4.6 / § 9.6 / § 9.7 / § 9.10 in lockstep to reflect the 8-entry reality, OR generalize to regex `^coordination/diagnostics/DIAGNOSTIC-R25-.+\.md$`. **This MAJOR is the third occurrence of `anti-scope-allowed-set-forward-coverage` cross-project pattern — see WAVE-GATE-02 § Cross-project reinforcement rules derived this gate Rule 4. WU-05's amendment should include the regex carve-out pattern explicitly, AND the WU-05 close-walk doc should record Rule 4 as a confirmed cross-project reinforcement.**

### R25 MAJOR-3 — AC-R25-12 tolerance spec contradiction (operator-dispositioned but spec un-amended)

**Spec drift:** Q-R25-SPEC.md § 1.8 prescribes `0.001 / 0.01` tolerances (per operator-dispositioned Option A from ESCALATE-R25-01); § 4.3 line 752 + § 5.1 AC-R25-12 row line 839 still prescribe `1e-9` (pre-disposition value).

**WU-05 close-walk action:** Amend Q-R25-SPEC.md § 4.3 + § 5.1 AC-R25-12 row to `0.001 / 0.01` so the spec is internally consistent. This is the `coordinator-applied-disposition-spec-amendment-omission` violation pattern logged at WAVE-GATE-01 MEM-C-W1-5; WU-05's close of R25 MAJOR-3 IS the corrective action.

### R25 MINOR-1 — Spec § 9.1 claim 6 baseline not empirically verified (root cause of MAJOR-1)

**WU-05 close-walk action:** Bundle with MAJOR-1 amendment; single spec § 9.1 claim 6 rewrite handles both. Use the present cluster-worktree environmental gap acknowledgment language from R28/R29/R30 specs as the template.

### R25 MINOR-2 — Counter-arm default `?? 64` unbound by AC

**Status at Wave 2:** WU-03 NVLINK AC-R30-14 OPPORTUNISTICALLY closed the coverage-gap portion of R25 MINOR-2 (test exercises the default-64 path via `transformPair(prev, next, { semantic_type: 'counter' }, opts)` with no `counter_width`; reset arm fires per spec). Mutation-kill gap remains transparently per R30 spec § 7.1.

**WU-05 close-walk action:** Record MINOR-2 as PARTIALLY-CLOSED in the close-walk inventory; coverage gap closed at R30, mutation-kill gap acknowledged as future-round optional. No further amendment needed unless WU-05 hybrid Reviewer surfaces a tighter mutation-kill test as load-bearing for SLICE 3 close.

### R25 MINOR-3 — Gauge + missed_scrape combination not behaviorally bound

**Status at Wave 2:** WU-01/02 advisory closure was not exercised (Slurm + K8s adapters parse topology config, no gauge ingestion). Coverage gap stands.

**WU-05 close-walk action:** Record MINOR-3 as OPEN in the close-walk inventory; not load-bearing for SLICE 3 close (gauge + missed_scrape is correctly implemented in `transformPair` per code inspection at `engine/l0/counter-rate-transform.ts:104, 111`; only the AC binding is the gap). Close-walk doc § "Wave 1 MINOR carry-forward" notes this as deferred to a future round if a non-counter ingestion adapter ships post-SLICE-3.

---

## What the target cluster must not assume

- WU-00 did NOT produce a `TopologySource` interface implementation — those are WU-01/02/03 (Wave 2; now consumed by WU-05 via their respective handoff artifacts).
- WU-00 did NOT produce vendor-specific parsing code — that is Wave 2's scope (parallel-class architecture preserved).
- WU-00's allowed-set + spec sections are SPEC-DRIFT items WU-05 close-walk must amend; WU-05 close-walk does NOT modify `engine/l0/counter-rate-transform.ts` body (Wave-1-frozen).
- WU-00's `engine/l0/counter-rate-transform.ts:119` default-64 fallback was opportunistically AC-closed at R30 AC-R30-14; the mutation-kill portion of R25 MINOR-2 remains acknowledged-not-closed per R30 spec § 7.1 — WU-05 close-walk does NOT introduce a mutation-killing AC unless hybrid Reviewer surfaces it as load-bearing.

---

## Pre-flags from wave gate (WAVE-GATE-02 § Pre-flags to Wave 3 cluster)

- **Cross-project Rule 4 (`anti-scope-allowed-set-forward-coverage`) derived at this gate.** WU-05 close-walk's own allowed-set MUST include regex carve-outs for `coordination/reviews/REVIEWER-REPORT-R<NN>.md` + `coordination/MEMORIAL.md` + `coordination/diagnostics/DIAGNOSTIC-<RND>-.+\.md`. Close-walk doc should also record Rule 4 as a confirmed cross-project reinforcement.
- **L0 contract surface is post-Wave-2-validated stable.** WU-03 NVLINK D1 HIGH consumption ACs AC-R30-10..14 confirmed all 6 invariants empirically. WU-05 hybrid Reviewer's audit of the L0-contract surface can lean on the WU-03 evidence as cross-cluster verification — does NOT need to re-run the synthetic counter generator end-to-end; reading the AC-R30-10..14 evidence + WU-00's own AC suite is sufficient.
- **WU-00 → WU-05 D1 HIGH edge enumerates 6 spec-amendment carry-forward items** (3 MAJOR + 3 MINOR). The close-walk's audit-tier AC enumeration should bind each as a discrete close-walk AC, not roll them into a single "Wave 1 carry-forward closed" claim.

---

## Halt conditions for target cluster

1. The L0 contract surface needs to be MODIFIED (not just spec-amended) → HALT; route back to Coordinator. The contract body is Wave-1-frozen per anti-scope verification at all 3 Wave 2 Reviewer reports. Close-walk is spec-amendment + audit only.
2. Hybrid Reviewer's audit of WU-00 + WU-04 surfaces a CRITICAL or MAJOR finding requiring rework → HALT with DIAGNOSTIC; close-walk-tier ESCALATE Option A spec amendment may be insufficient, and a discrete rework round may be load-bearing. Coordinator picks at re-gate.
3. The 6 R25 carry-forward items cannot be amended in WU-05's allowed-set (because the spec sections require modifications outside the audit-tier scope, e.g., introducing a new AC that requires new substrate) → HALT with DIAGNOSTIC; promote audit-tier to full-tier mid-round if Architect-rework is needed (see CLAUDE-COMMON.md §"Promotion mid-round" for audit→full promotion rule).
4. R-E7 mitigation evidence package from WU-03 NVLINK turns out to insufficiently exercise an invariant the close-walk audit surfaces (e.g., wraparound edge case not in the synthetic counter generator) → HALT; route back to Coordinator. This is unlikely per the WAVE-GATE-02 verdict that AC-R30-10..14 exercises all 4 failure modes empirically, but is a structural halt condition.

---

## Coordinator verification log

| Wave gate | Date | Status | Notes |
|---|---|---|---|
| Wave 2 gate (R31) | 2026-05-18 | CURRENT | Emitted at Wave 2 gate authorizing Wave 3 dispatch. L0 contract surface verified at main HEAD `56ee259` (bit-identical to Wave 1 merge HEAD `3308681` per all 3 Wave 2 Reviewer reports' anti-scope verification). |

---

## Amendment history

| Version | Date | What changed | Triggered by |
|---|---|---|---|
| v1 | 2026-05-18 | Initial creation | Wave 2 gate (R31) — authorizing Wave 3 dispatch of WU-05 SLICE 3 close-walk |
