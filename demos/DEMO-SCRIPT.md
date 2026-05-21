# Tessera Demo — 10-minute walkthrough

_Authored R81 for SLICE 2 close. Companion to `demos/demo.html` (no server required;
opens from `file://`). Analogous to DeploySignal's `DEMO-SCRIPT-10MIN.md`._

## Before you start

Open `demos/demo.html` directly in Chrome or Firefox — no server or build step required.
Set audience context: "Tessera is a per-shard observation layer for AI training and inference
clusters. It provides any-time-valid statistical detection of behavioral drift with fleet-level
false-discovery-rate guarantees."
Pre-open context: `demos/demo.html` in browser, `engine/detectors/` in editor for follow-up
questions on implementation.

## Default spine (technical-peer audience)

Clean-baseline → SDC-drift → Common-mode-rack → Event-conditional → close.

For an SRE-lead audience: emphasize the family-status rows and the verdict banner state machine
over the M_t chart math. For an engineering-director audience: lead with the coverage envelope
and the SLICE 3 live-cluster roadmap, compress the methodology detail.

---

## Minute 0:00 – 2:00 — Clean-baseline (trust establishment)

**Click:** dropdown to "Clean baseline (no firings)"; press Play (or Space).

**Say:**
> Tessera is a per-shard statistical observation layer. The substrate here is N=10 shards
> running 30 observation windows at a false-alarm rate α=0.005. Each shard maintains a
> betting e-process — a martingale-style running wealth M_t — that starts at 1 (log₁₀ = 0)
> and updates every window. The horizontal dashed line is the detection threshold:
> log₁₀(200) ≈ 2.301. In a clean run, no shard's M_t crosses that threshold.

**Pause beat (1-2 seconds).**

> Family A — the betting e-process detector — is the workhorse. The four other families
> (B through E) provide independent test-statistic surfaces: magnitude deviation, squared
> residuals, peak autocorrelation, and max-z. In this clean scenario all five families
> remain at "clean" or "not exercised" because the synthetic substrate is well-behaved
> LCG-seeded Gaussian.

**Pause beat (1-2 seconds).**

> By minute 2 the key trust beat is: the system makes no false alarms at α=0.005 under
> clean conditions — the per-shard Ville-bound guarantees that at most 0.5% of shards
> fire spuriously across independent runs.

**Handoff cue:** click dropdown to "SDC drift on shard-04."

---

## Minute 2:00 – 4:00 — SDC-drift (Family A betting wealth crossing threshold)

**Click:** Start SDC-drift; let it run through windows 0–22. Watch shard-04's path.

**Say:**
> Now we inject a systematic drift — specifically a Slowly Drifting Covariate shift —
> on shard-04 only. Every window, shard-04's observations draw from a slightly shifted
> distribution. The betting e-process updates multiplicatively: a favorable bet increases
> M_t, an unfavorable one decreases it. By window ~23, shard-04's log₁₀(M_t) crosses
> the threshold of 2.301 — that's M_t = 200, meaning 200:1 betting odds in favor of
> the drift hypothesis.

**Point at:** the rising path for shard-04; the Family A detector status row flipping to
FIRING; the provenance receipt appearing under the outer provenance panel — click the
receipt summary to expand the evidence JSON.

> The isolation beat here: only shard-04 fires. The other nine shards remain clean because
> the drift is localized. This is the core per-shard isolation property: a rack-local
> anomaly on one shard doesn't pollute the fleet-level signal. The Ville bound applies
> per shard — each shard's false-alarm probability is controlled at α independently.

**Pause beat (2-3 seconds).**

**Handoff cue:** click dropdown to "Common-mode (rack-localized)."

---

## Minute 4:00 – 6:00 — Common-mode-rack (topology attribution)

**Click:** dropdown to "Common-mode (rack-localized)"; press Play.

**Say:**
> Common-mode detection extends per-shard observation with topology-aware attribution.
> The engine runs BFS on the undirected cluster graph — in this scenario a v9Y multi-rack
> topology — to find connected subgraphs where multiple shards fired within the same
> observation window. When a candidate set shares a common ancestor node (rack, cooling
> zone, power domain) within max_hop_distance hops, Tessera surfaces a common-mode
> candidate rather than N independent shard alerts.

**Point at:** the terminal-state provenance panel showing a common-mode candidate entry;
the candidate's shared topology node and the member shard list.

> The attribution beat: instead of paging on-call for three separate shard alerts, the
> operator sees one structured attribution — "shards 02, 05, 07 share rack-B; likely
> rack-localized common-mode event." The BFS runs at `engine/topology/common-mode-attribution.ts`
> and the candidate shape carries the shared_topology_node, candidate_shards, and
> hop_distance fields in the provenance receipt.

**Pause beat (2 seconds).**

**Handoff cue:** click dropdown to "Event-conditional freeze."

---

## Minute 6:00 – 8:00 — Event-conditional (freeze-hook + DS integration)

**Click:** dropdown to "Event-conditional freeze"; press Play.

**Say:**
> The event-conditional scenario exercises Tessera's integration with DeploySignal's
> event feed. When DS emits a deploy event — here a synthetic "cluster_event_id: EV-01"
> — the freeze-hook factory at `engine/events/freeze-hook.ts` activates a freeze window
> of configurable duration. During the freeze window, per-shard residual absorption is
> suspended: the betting e-process pauses so that the deploy-induced transient doesn't
> trigger a false positive. The audit trail records the freeze_active flag per window.

**Point at:** the verdict banner status flipping to "frozen" when the freeze window activates;
the live-tick indicator advancing through frozen windows; the audit trail entries showing
freeze_active = true events.

> The decoupling beat: Tessera's `correlational_not_causal: true` flag in the scenario
> JSON preserves the contract that Tessera detects correlation, not causation. The DS
> integration layer at `engine/ds-integration/event-feed.ts` provides the deploy event;
> Tessera's freeze-hook prevents the event-induced drift from being misattributed as
> shard-intrinsic anomaly. The two layers are structurally decoupled — Tessera doesn't
> need to understand deployment intent; it just needs the event timestamp and duration.

**Pause beat (3 seconds).**

**Handoff cue:** dropdown back to clean-baseline, or proceed to close.

---

## Minute 8:00 – 10:00 — Close (methodology + coverage envelope)

**Say:**
> We've just walked four scenarios: clean-baseline established the no-false-alarm baseline
> under α=0.005; SDC-drift showed per-shard isolation with Ville-bounded detection;
> common-mode-rack showed topology-aware attribution via BFS on the cluster graph;
> and event-conditional showed the freeze-hook DS integration with structural decoupling.
> Each scenario exercises a distinct architectural beat.

**Pause beat (1-2 seconds).**

> The methodology has four load-bearing pieces. First: per-shard betting e-processes are
> any-time-valid — the Ville inequality bounds false-alarm probability α at every window,
> not just at a pre-specified stopping time. Second: the e-BH operator surface (visible
> in the FDR scenario) provides fleet-level false-discovery-rate control across N shards
> simultaneously. Third: topology-overlay BFS-on-undirected attribution converts per-shard
> alerts into structured common-mode candidates without requiring a separate root-cause
> analysis step. Fourth: the LCG-seeded synthetic substrate is fully deterministic —
> every run of the demo produces identical outputs, which makes the canned scenario
> approach auditable and reproducible.

**Pause beat (2 seconds).**

> The coverage envelope: Tessera is in scope for per-shard observation, topology-aware
> attribution, and event-conditional decoupling as shown here. What's tagged-future or
> deferred: live-cluster validation against real AI training workloads (requires the DS
> npm engine extract in SLICE 3); multi-region federation (deferred per A15 in the PRD);
> and causal attribution beyond correlation (explicitly out-of-scope per the
> correlational_not_causal contract). The dashboard you're looking at is the SLICE 2
> close — the foundation layer before live integration.

**Pause beat (2 seconds).**

> That's Tessera. Questions?

---

## Bank of follow-up questions + responses

**Q: How does Tessera differ from DeploySignal?**
A: DeploySignal is the event-conditional correlation layer — it ingests deploy events and
correlates them with downstream signals. Tessera is the per-shard observation layer that
sits below DS: it provides any-time-valid statistical detection that DS can consume as a
structured signal feed. The freeze-hook integration shown in the event-conditional scenario
is the coupling point.

**Q: When does the vendor sequencing happen — when does Tessera ship as part of DS?**
A: SLICE 3 (R82-R85) extracts the engine as an npm package that DS can import directly.
The canned-scenario dashboard is the SLICE 2 close; live in-browser engine integration
is SLICE 3. The vendoring sequence is: establish observability → canned validation →
live integration → multi-region federation.

**Q: What's the false-alarm rate in practice?**
A: The Ville inequality guarantees α ≤ 0.005 per shard in the any-time-valid sense —
meaning the probability that a clean shard's M_t ever exceeds the threshold is at most
0.5%, regardless of when you look. The e-BH FDR operator surface (the FDR scenario)
extends this to fleet-level control: if K shards fire at the terminal window, the
expected proportion of false discoveries among them is bounded at q (configurable).

**Q: Is the topology graph configurable?**
A: Yes — the BFS hop distance and minimum member count are operator-visible dials
characterized in the R78 topology-walk tuning envelope. The default max_hop_distance=1
(shard→rack) is conservative; lifting to max_hop_distance=2 (shard→rack→cooling-zone)
catches cross-rack common-modes without introducing false-positive attribution on 2-tier
topologies.

---

## Pacing notes

- The clean-baseline section (0:00–2:00) often runs long if you explain the math in
  depth. Compress to 90 seconds for technical-peer audiences who will ask questions;
  expand to full 2 minutes for SRE leads who need the false-alarm framing first.
- The provenance-receipt expansion (SDC-drift, minute 3) is a natural "wow moment."
  Pause here. Let the audience read the JSON fields before moving on.
- For engineering-director audiences: skip the BFS detail in common-mode-rack and jump
  directly to "N alerts → 1 structured attribution." The math can be in follow-up.
- Recovery if running over: drop the event-conditional section and go directly to close.
  The core methodology is covered by the first three scenarios.
- If a question derails the flow, use "Let me park that for the follow-up bank" and
  continue — the bank section above has answers prepared.

## What I need to rehearse specifically

- The transition from SDC-drift to common-mode-rack: the dropdown is in the top-left;
  practice clicking it smoothly without losing the audience's attention.
- The provenance-receipt click-to-expand interaction: make sure the browser focus is on
  the page body (not a form element) before clicking, so the keyboard shortcuts work.
- The methodology paragraph (minute 8:00–10:00): this is the densest verbal section.
  Rehearse the four load-bearing pieces (Ville, e-BH, BFS, LCG) until they flow naturally.
