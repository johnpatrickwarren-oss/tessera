# ARCHITECT-REPLY — v0.3 Pre-Disposition (Architect-Pre-Prediction)

_From: Architect (overnight autonomous run, authorized by John 2026-05-15 23:xx)._
_To: John (decision-routing on first review)._
_Routed via: TPM (self-routing in single-session model)._
_Date: 2026-05-15 (overnight)._
_Type: **PRE-DISPOSITION** — architect-pre-prediction picks for Q-J1 through Q-J6 from v0.3 SCOPING-MEMO. Made under overnight autonomy authorization to unblock Tessera Phase 1 SLICE 1 spec-emit. **EXPLICITLY subject to John override on first review.** Q-J6 NOT pre-dispositioned (strategic decision; architect escalates rather than guesses)._
_Foundation: SCOPING-MEMO-v0.3.md § 5 (Q-J1..Q-J6 + architect-pre-prediction probability bands)._

---

## Why this artifact exists

John authorized overnight autonomous progress (2026-05-15) with the standing instruction: "If there is no way to autonomously come to a logical decision or there is a true escalation point, then escalate to me, but otherwise I want you to follow the anchor / superpowers methodology and framework and accomplish what you can overnight."

Tessera Phase 1 SLICE 1 spec-emit needs Q-J1 through Q-J5 dispositioned to proceed cleanly. Q-J6 (cross-project sequencing relative to DeploySignal Phase E) is a strategic / pitch-priority decision the architect cannot reliably pre-predict — it's escalated, not pre-dispositioned.

For Q-J1 through Q-J5, architect emits this PRE-DISPOSITION under overnight authority. Each pick is marked with:
- **Pick** — the option chosen
- **Confidence** — high / medium / uncertain
- **Architect-pre-prediction reasoning** (≤ 3 sentences)
- **John-override surface** — what triggers re-disposition

On John's first review, any of these 5 can be amended; the SLICE 1 spec downstream incorporates the picks as architect-pre-prediction-consumed-by-spec, not as locked-in commitments. Mac Claude / implementer-side work is gated on John's actual disposition, not on this PRE-DISPOSITION.

---

## Q-J1 — Operator-facing fleet guarantee target

**Pick:** (iii) **hybrid** — per-shard any-time Ville via hierarchical e-value combination AS formal guarantee + fleet-level FDR (expected falsely-flagged-shard count via e-BH) AS operator interface.

**Confidence: HIGH.**

**Reasoning:** Formal-property continuity with the inherited DeploySignal Phase-3.d.D Ville-bounded close (LEDGER at SHA `5a72371` PRESERVED-PERMANENT-POST-PHASE-D) makes any-time Ville the load-bearing pitch claim that distinguishes Tessera from "N independent FPR-broken alert sources" (per John's originating-context framing). FDR via e-BH is the actionable operator surface ("K shards flagged; expected falsely-flagged ≤ q·K") that cluster oncall can act on. Picking (i) only loses operator actionability; picking (ii) only loses formal-property continuity.

**John-override surface:** if pitch priorities favor simpler operator semantics (FDR-only), architect re-disposes to (ii). If pitch priorities favor simpler formal-property argument (Ville-only), architect re-disposes to (i).

---

## Q-J2 — Cold-start latency engineering target

**Pick:** (iii) **20 per-shard samples for warm-start trustworthy; 60 for strict-upgrade.**

**Confidence: MEDIUM** (PR-F4 pair-review validates; revert-to-60-baseline available if PR-F4 fails empirically).

**Reasoning:** At inherited default 5s tick rate (per `deploysignal/tools/ingest-real-trace.ts:106` at SHA `5a72371`), 20 samples = 100s wall-clock for warm-start upgrade — operationally fast at fleet-provisioning rates. The threshold re-derivation from inherited 60 → 20 is plausible because fleet-aggregate prior has N×60 sample-information-content (vs single-instance 60); empirical-Bayes shrinkage theory supports the reduction. PR-F4 pair-review on synthetic N=1000 shard cluster validates the re-derivation; if empirical evidence contradicts (>1.5× FPR inflation at 20-sample warm-start), architect reverts to 60-sample threshold.

**John-override surface:** if John prefers conservative-default (option ii, 60-sample), architect re-disposes; PR-F4 pair-review still runs but the operator-target stays at 60.

---

## Q-J3 — Cross-shard correlation output semantics

**Pick:** (iii) **cascade emits at every layer** — both "this shard" attribution AND "K shards with this property" pattern.

**Confidence: HIGH.**

**Reasoning:** The three-layer cascade (a → b → c per § 2.3) naturally emits at every layer; suppressing emission at any layer loses information the operator needs. Cluster oncall pager subscribes to per-shard attribution at the alarming threshold; pattern attribution surfaces "K shards in rack 7" via topology overlay; event-conditional attribution surfaces "fleet drift conditional on deploy event at T₀" via causal-conditioning layer. Audit consumes all three. (i) or (ii) alone loses one of the load-bearing pitch claims.

**John-override surface:** if pitch priorities favor a minimal-output surface (e.g., for v1 simplicity), architect could trim to (i) or (ii). But the audit-trail completeness argument makes (iii) the default architectural commitment.

---

## Q-J4 — Synthetic-cluster substrate scope at Tessera Phase 2 SLICE 1

**Pick:** **(i) single-rack uniform topology + injected PSU/cooling events** at Phase 2 SLICE 1 (architectural-foundation-only). Expand to (ii) two-rack heterogeneous at SLICE 2-3; (iii) ~10-rack heterogeneous at SLICE 4.

**Confidence: HIGH.**

**Reasoning:** Matches the inherited DeploySignal Q70 SLICE 1 precedent — architectural-foundation-only at SLICE 1, substantive empirical validation deferred to subsequent SLICEs. Single-rack uniform topology is sufficient to exercise the TopologySource interface extension + VerdictGroup scope re-architecture without confounding empirical-validation variables. The substrate naming convention follows inherited v5/v7/v8X/v9X precedent → Tessera substrates labeled `vt1` / `vt2` / etc. (TBD at SLICE 1 spec-emit).

**John-override surface:** if SLICE 1 should include empirical-validation work (e.g., to accelerate pitch-ready evidence), architect re-disposes to bundle (i) + (ii) into SLICE 1. Q-cycle estimate shifts upward by ~1-2 cycles for Phase 2 if this re-disposition.

---

## Q-J5 — Tessera Phase 1 freeze-hook activation gate

**Pick:** **Phase 2 activation gate** — Tessera Phase 1 closes independently with `freeze_hook_enabled: false` and a documented CAVEAT; freeze-hook activates when Phase 2 lands.

**Confidence: HIGH.**

**Reasoning:** Preserves shippability of Phase 1 as standalone per-shard infrastructure foundation, analogous to inherited Q58 close-with-CAVEAT clause 1 / Q66 SLICE 1 RETIRE pattern (LEDGER at SHA `5a72371`). The CAVEAT (elevated FPR during fleet-events while freeze-hook is disabled) is a documented known-property with `methodology_note` clause; carries forward to Phase 2 activation as CAVEAT-retirement criterion. Picking a Phase 1 SLICE-3 acceptance gate would block Phase 1 close on Phase 2 readiness — coupling phases unnecessarily.

**John-override surface:** if Phase 1 must close clean (no CAVEAT), architect re-disposes to make freeze-hook a Phase 1 SLICE-3 acceptance gate; Phase 1 and Phase 2 then co-ship which inflates close-walk cost.

---

## Q-J6 — Cross-project sequencing relative to DeploySignal Phase E

**Pick:** **NOT PRE-DISPOSITIONED — ESCALATED TO JOHN.**

**Confidence: ARCHITECT CANNOT RELIABLY PRE-PREDICT** (probability bands span 15-35% across 4 options per v0.3 § 5 Q-J6 architect-pre-prediction).

**Reasoning:** This is the load-bearing strategic decision (per v0.3 § 5 Q-J6 explicit flag). The answer depends on:
- DeploySignal Phase E (production deployment hardening) external pressure (production deployment customers? compliance? competitive positioning?)
- Tessera pitch priority (fleet/AI infrastructure positioning timing?)
- Engineering-capacity availability (parallel tracks viable, or sequential-only?)

None of these are architecturally derivable — they are John-the-Product-Manager-role decisions. Architect explicitly does NOT make a unilateral pick here. The four options:
- (i) DeploySignal Phase E → Tessera Phase 1 → Tessera Phase 2 (sequential DS-first)
- (ii) Tessera Phase 1 → Tessera Phase 2 → DeploySignal Phase E (sequential Tessera-first)
- (iii) DeploySignal Phase E and Tessera Phase 1 in parallel tracks (capacity-permitting)
- (iv) DeploySignal Phase E indefinitely deferred; Tessera takes priority (DS operational maintenance only)

**For overnight progress:** architect proceeds with Phase 1 SLICE 1 spec-emit under the **provisional assumption** that Tessera Phase 1 is starting (consistent with options (ii), (iii), or (iv) — three out of four; only (i) would block immediate Tessera work). If John dispositions (i) on review, the Phase 1 SLICE 1 spec emitted this overnight stays valid as a deferred artifact (no architectural rework needed; just timing shift).

**John-disposition required before Tessera Phase 1 SLICE 1 Mac Claude implementation begins.** Architect emits the SLICE 1 spec overnight as scoping completion; implementation does NOT start without John's Q-J6 disposition.

---

## Disposition summary

| Q-J | Pick | Confidence |
|---|---|---|
| Q-J1 | (iii) hybrid Ville + e-BH | HIGH |
| Q-J2 | (iii) 20-sample warm-start / 60-sample strict | MEDIUM (PR-F4 validates) |
| Q-J3 | (iii) cascade emits at every layer | HIGH |
| Q-J4 | (i) single-rack uniform at SLICE 1 | HIGH |
| Q-J5 | Phase 2 activation gate (Phase 1 closes with CAVEAT) | HIGH |
| Q-J6 | **ESCALATED — not pre-dispositioned** | architect-uncertain |

**Pre-disposition coverage:** 5/6 Q-Js pre-dispositioned with architect confidence levels HIGH (4) + MEDIUM (1) + ESCALATED (1). On John's first review:
- If 5/5 dispositions confirmed: Phase 1 SLICE 1 spec proceeds to Mac Claude implementation gating only on Q-J6.
- If any of 5 amended: architect re-emits affected sections of Phase 1 SLICE 1 spec; minor rework cost (~0.1-0.3 Q-cycle equivalent per amendment).
- Q-J6 disposition unblocks Phase 1 SLICE 1 Mac Claude implementation.

---

## Memorial D state delta from this disposition

Pre-v0.3 (and pre-this-disposition): **21V/8C** (lineage preserved in `PROJECT-CONTEXT.md` § Memorial D state lineage table; literal text of the predecessor v0.1-DISPOSITION at commit `aa4fa97` in git history).

Post-this-PRE-DISPOSITION: **21V/8C unchanged.** Architect-pre-prediction picks under overnight authority are not Memorial D events themselves (they don't surface new architect-grilling-discipline gaps; they exercise existing disciplines). The Memorial D class would increment if PR-F1 / PR-F2 / PR-F4 / PR-F5 / PR-F6 / PR-F7 pair-review evidence surfaces architect-pre-prediction violations at empirical-evidence time; that's a future-cycle accounting, not pre-disposition-emit.

---

## Routing

This PRE-DISPOSITION feeds the **Tessera Phase 1 SLICE 1 spec** (emitted this overnight as the next artifact in `tessera/coordination/`). On John's review:

1. Read this PRE-DISPOSITION; confirm or amend Q-J1..Q-J5; disposition Q-J6.
2. Architect reviews any amendments; re-emits affected SLICE 1 spec sections if needed.
3. SLICE 1 spec routes to Mac Claude for implementation (subject to John's Q-J6 disposition unblocking the implementation gate).
4. Phase 1 SLICE 1 standard Mac Claude → Reviewer → Memorial-Updater cycle per anchor PROJECT-ROLES discipline.

---

_PRE-DISPOSITION authored: 2026-05-15 overnight under John's autonomous-run authorization. Anchor methodology: pre-route grilling (architect-side) + Memorial D / F discipline + 3-check pair-review framework all preserved at pre-disposition-emit. Superpowers `using-superpowers` + `receiving-code-review` + `brainstorming` skills loaded for this overnight context. Q-J6 escalation: explicit; architect declines to make a Product-Manager-role-class decision unilaterally even under overnight authorization._
