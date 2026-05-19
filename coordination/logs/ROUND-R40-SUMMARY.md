# ROUND-R40-SUMMARY — Phase 3 candidate synthesis inventory (audit-tier)

**Round:** R40 | **Date:** 2026-05-19 | **Tier:** audit (Implementer self-specs; Reviewer audits cold)
**Verdict:** MERGE-READY | 0 CRITICAL / 1 MAJOR / 5 MINOR / 4 OBS
**Deliverable:** `coordination/PHASE-3-CANDIDATES-PRELIMINARY.md` (DRAFT inventory)

---

## What worked

- **Brainstorm discipline**: Implementer enumerated 3 distinct approaches in spec § 2 with explicit strengths/weaknesses/hidden-assumption/risk analysis. Approach C (prioritization-first) correctly identified as anti-scope and eliminated immediately. Approach B selected with documented rationale; selection drove the entire 8-section deliverable structure.

- **Anti-scope maintained**: `git diff 0759eec HEAD --name-only -- engine/ test/ src/ tools/ CLAUDE-*.md SCOPING-MEMO* PRD.md` → empty output, independently verified by Reviewer. Only 4 coordination/ files modified across the entire round. Strictest AC in the spec (AC-R40-8) held cleanly.

- **Deliverable structure**: All 8 sections present and in order (AC-R40-1 PASS). § 7 Q-cycle estimates expressed as rough ranges with dependency ordering (AC-R40-5 PASS). § 8 NOT recommended contains all three required items (AC-R40-6 PASS). OQ flags for sequencing/prioritization questions present at §§ 1, 2, 3, 5, 7 (OQ-P3-1 through OQ-P3-6).

- **Reviewer pre-emit grilling**: Reviewer completed 5-gate grilling before routing. Every finding cites file:line. Adversarial mandate honored (10 total findings). Right-reasons weaknesses disclosed (AC-R40-3 self-confirming risk; AC-R40-7 partial-binding). Cold-review boundary held throughout.

- **TDD discipline**: N/A by round type (documentation-synthesis). No production code or test code written. Commit sequence clean.

---

## What violated discipline (role, discipline, what happened)

### MAJOR-1 | IMPLEMENTER | pre-emit-grilling-insufficient-sweep

Pre-emit grilling (spec § Pre-emit grilling) claimed 4/4 questions pass including "Can Reviewer act with zero clarifying questions? Yes." The grilling did not include the check: "Are any surfaced OQs operative on questions already answered by my own state table or input artifacts?"

OQ-P3-5 in § 5.1 asked whether Rule 7 canonical text had landed — a question directly answered by three sources the Implementer had at hand:
- `NEXT-ROLE.md:127`: "7 cross-project rules canonical ✅" (Implementer's own R40-entry state table)
- `CROSS-PROJECT-MEMORIAL.md:3470`: "Rule 7 canonically lands at R38 Memorial-Updater stage per OQ-W5-1 Option A authorization"
- Deliverable's own § 5.1 parenthetical at `:253`: "(R38 Memorial-Updater stage — already completed)"

§ 6 Parked-items row `:325` then restated "Status unknown at R40 entry — depends on R38/R39 Memorial-Updater outputs." The deliverable internally self-contradicted within the same paragraph that raised the OQ.

Effect: the operator receives a misleading actionability signal — OQ-P3-5 is operative on a resolved question; § 6 mislabels a closed gate as pending. Inventory is a DRAFT for operator review, so this is content-correctable without blocking merge.

### MINOR-1 | IMPLEMENTER | implementer-spec-test-assertion-coverage

AC-R40-2 required "each [adapter] with a dependency note citing the WU-03 NVLink + WU-01 Slurm parallel-class pattern" (joint citation, per-item). Per-subsection reality:
- § 1.1 AMD: cites WU-03 only
- § 1.2 TPU: cites WU-01 only (inverted)
- § 1.3 Trainium: cites WU-03 only
- § 1.4 Inferentia: cites neither

§ 1 intro paragraph covers both umbrella-jointly but does not satisfy a per-item AC. The NEXT-ROLE.md:149 attestation "PASS — §§ 1.1-1.4 each contain both" is overconfident and does not disclose the gap.

### MINOR-2 | IMPLEMENTER | line-citation-cite-then-verify

§ 1.1 AMD ROCm dep-note (`:37-38`) cited "WU-03 NVLink shipped against `v9Y-multi-rack-cluster.ts`." The actual WU-03 substrates are `test/_substrate/nvlink-fixture-well-formed.txt` + `nvlink-fixture-sparse.txt`. The cited file is the WU-04 common-mode-attribution BFS substrate. Implementer conflated WU-03 adapter (fixture-parser) with WU-04 consumer (BFS-over-graph).

### MINOR-3 | IMPLEMENTER | line-citation-cite-then-verify

§ 5.1 (`:232`) cited "WAVE-GATE-05.md § Cross-project reinforcement rules derived, Decision 3 forward-flag." Decision 3 lives under "## Wave 5 gate decisions" (`WAVE-GATE-05.md:224`), not under "## Cross-project reinforcement rules derived this gate" (`:279`). The two sections are sibling parents separated by `---` at `:277`. Section-path citation drifted; AC-R40-3 still PASSES because the AC literal only checks for the "Decision 3" string (right-reasons weakness surfaced by Reviewer as OBS-2).

### MINOR-4 | IMPLEMENTER | encode-actual-results-verbatim

§ 5.4 (`:298-300`) claimed "3rd-occurrence threshold crossed at Wave 5" enumerating only R32 (W3) and R36 (W5) — 2 instances. Source `WAVE-GATE-05.md:317` cites W2+W3+W5 (3 instances). W2 audit-tier instance dropped entirely. The "both confirmed" framing also collapsed gap-exhibition (W2+W3+W5) with hybrid-Reviewer-mitigation (R32+R36 only).

### MINOR-5 | IMPLEMENTER | rule-derivation-without-self-application / negative-property AC under-binding

AC-R40-7 prohibits "operator-decision-class questions resolved by Implementer-authored recommendation." The AC tested for the presence of OQ flags (OQ-P3-1 through OQ-P3-6) but not for the absence of implicit recommendations in surrounding prose.

§ 5.1:250-251 reads "Rule 7 implementation in Phase 3 SLICE 1 (or MR-3) would protect all subsequent Phase 3 rounds" — a soft author-suggested SLICE placement that the AC was supposed to prohibit. The AC the Implementer authored did not bind the prose the Implementer wrote.

---

## Root cause analysis

### MAJOR-1: Why did the OQ-on-resolved-question occur?

The 4-question pre-emit grilling protocol has no dedicated step for "verify each OQ is still open." The Implementer checked that OQs were present (required by AC-R40-7) but did not reverse-direction and ask whether each OQ was still operationally open. The self-contradiction inside § 5.1 (raising OQ-P3-5 in the same paragraph that says "already completed") suggests the Implementer drafted the OQ early in the writing pass and did not reconcile it with the state-table entry at NEXT-ROLE.md:127 or the CROSS-PROJECT-MEMORIAL.md:3470 entry during the final grilling pass. The 5th grilling question the Reviewer identified — "are any OQs operative on questions answerable by my own state table or input artifacts?" — is load-bearing for documentation rounds and currently absent from the canonical protocol.

### MINOR-1: Why was the per-item attestation overconfident?

AC-R40-2 required "each [adapter]" to have both citations. The Implementer verified the § 1 section as a whole (intro umbrella covers both WU-01 + WU-03) without verifying each subsection individually against the joint requirement. The attestation "§§ 1.1-1.4 each contain both" was written based on a structural read (each subsection contains a dep-note) rather than a property-completeness read (each dep-note contains both required citations).

### MINOR-2 + MINOR-3: Why did fixture-file and section-path citations drift?

Both are cite-then-verify failures: the Implementer wrote citations from memory/association rather than verifying by Glob or by reading the structural hierarchy of the source. MINOR-2 arose from associating WU-03 NVLink with the most complex fixture file in the repo (v9Y) rather than the WU-03-specific substrates. MINOR-3 arose from associating "Decision 3" with the wrong thematic section of WAVE-GATE-05 (the "rules derived" section felt more natural than the "gate decisions" section). Both are patterns the REINFORCED 2026-05-18 rule in CLAUDE-COMMON.md addresses, but the Implementer did not apply it in an inventory/coordination-artifact context (as opposed to a test-file-line context).

### MINOR-4: Why was W2 dropped from the enumeration?

Hybrid-Reviewer mitigation was visible at R32 (W3) and R36 (W5) — those rounds had explicit Reviewer reports. W2's audit-tier gap was less prominent in the Implementer's working memory; the source (WAVE-GATE-05.md:317) explicitly lists W2+W3+W5, but the Implementer apparently read the "hybrid-Reviewer mitigation confirmed at" framing and enumerated only rounds with hybrid-Reviewer reports rather than rounds exhibiting the underlying pattern.

### MINOR-5: Why did AC-R40-7 under-bind § 5.1 prose?

The AC was designed positively ("OQ flags present for all sequencing decisions") rather than negatively ("no implicit sequencing recommendation in any prose block"). Positive ACs are easier to verify (search for OQ-P3-N strings) than negative ACs (read all prose for implicit nudges). The Implementer authored the AC to be verifiable by presence-check and implicitly assumed that OQ coverage would prevent implicit recommendations — it does not.

---

## Reinforcements added

| File | Entry summary |
|---|---|
| `CLAUDE-IMPLEMENTER.md` | `# REINFORCED 2026-05-19` — OQ-operative-on-resolved-question: pre-emit grilling must cross-check each OQ against Implementer's state table, source artifacts, and deliverable prose; OQ answerable from those sources = completeness-gate failure. (R40 MAJOR-1) |
| `CLAUDE-IMPLEMENTER.md` | `# REINFORCED 2026-05-19` — per-item-AC-attestation-completeness: per-item ACs require verifying every item individually; intro umbrella does not satisfy per-item AC; NEXT-ROLE.md attestation must disclose coverage gap. (R40 MINOR-1) |
| `CLAUDE-IMPLEMENTER.md` | `# REINFORCED 2026-05-19` — citation-section-path-verification: when citing by section path, verify the item lives under the named parent section by reading structural hierarchy; `---` boundaries create sibling sections not child sections. (R40 MINOR-3) |
| `CLAUDE-IMPLEMENTER.md` | `# REINFORCED 2026-05-19` — occurrence-count-enumeration-completeness: when claiming N-occurrence threshold crossed, enumerate ALL N source-cited instances; dropping one instance while asserting the threshold count is encode-actual-results-verbatim failure. (R40 MINOR-4) |
| `CLAUDE-IMPLEMENTER.md` | `# REINFORCED 2026-05-19` — negative-property-AC-binding: when AC prohibits a pattern, sweep ALL prose for the prohibited pattern — presence of mitigations (OQ flags) does not guarantee absence of the prohibited behavior elsewhere. (R40 MINOR-5) |

---

## Watch list for next round

1. **OQ-still-open check** (derived from MAJOR-1): any future inventory, close-walk, or synthesis round that surfaces OQs must include the 5th grilling question "is each OQ still operationally open?" before routing. If the answer is derivable from the Implementer's state table, the OQ should state the resolved answer, not surface an open question.

2. **Cite-then-verify in inventory context**: MINOR-2 and MINOR-3 both show the cite-then-verify rule (CLAUDE-COMMON.md REINFORCED 2026-05-18) not being applied in coordination-artifact/inventory authoring. Watch for this in any Phase 3 spec or SLICE inventory that cites source-artifact section paths or fixture file names.

3. **Per-item AC attestation**: MINOR-1 shows a structural attestation ("each subsection has a dep-note") being reported as a property attestation ("each dep-note contains both required citations"). Future AC attestation for per-item requirements must include a per-item property table, not just a structural confirmation.

4. **MAJOR-1 operator follow-up**: The PHASE-3-CANDIDATES-PRELIMINARY.md deliverable carries a misleading Rule 7 status in § 5.1 + § 6. Before the operator uses OQ-P3-5 or the § 6 parked-items row as actionable inputs, they should read REVIEWER-REPORT-R40.md MAJOR-1 and either amend § 5.1/§ 6 inline or document that OQ-P3-5 is resolved and replace it with the still-open sub-question (which propagation surface to build in Phase 3: spec-template gate vs. pre-commit grep vs. pipeline-level diff).

5. **Cosmetic MINOR bundle**: MINOR-1/2/3/4 are content-correctable without blocking Phase 3 entry. Bundle into R41-style documentation pass or the Phase 3 SLICE 1 spec authoring session, per Reviewer recommendation.

---

## Emerging cross-project patterns

- **OQ-raised-on-resolved-question** (new sub-class, 1st instance): Documentation/inventory rounds that explicitly surface OQs have a structural blind spot: the pre-emit grilling protocol verifies OQ presence but not OQ openness. The 4-question protocol predates inventory-style rounds. Below 3-instance threshold; watch for recurrence.

- **line-citation-cite-then-verify persists in inventory context**: R40 adds 2 more instances in the coordination-artifact domain (section-path citation; fixture-file citation). The rule is REINFORCED in CLAUDE-COMMON.md but continues to fire. The Rule 7 propagation mechanism (active enforcement surface) is not yet built; passive reinforcement-line accretion demonstrably insufficient for this pattern.

- **encode-actual-results-verbatim: occurrence-count sub-class** (1st instance): When source documents enumerate N instances of a pattern, deliverables must carry all N. This is a new sub-class distinct from test-count attestation (R03/R26 origin).

- **Negative-property AC design**: MINOR-5 shows that an AC prohibiting a pattern ("no implicit sequencing recommendations") should be tested negatively (sweep all prose) not positively (confirm OQ mitigations present). This is a recurring design failure: Implementer-authored ACs tend toward presence-checks because they are easier to verify.

---

## Recommend reinforcement consolidation

`CLAUDE-IMPLEMENTER.md` is at **39 REINFORCED lines** after R40 appends (was 34 before this round; +5 this round; 2nd consecutive round above the 30-line threshold). Run:

```
./scripts/consolidate-reinforcements.sh
```

This is operator-triggered; the script does not auto-run. The script archives REINFORCED lines older than 180 days to free index capacity. Given the MR-2 consolidation round (R39) already brought IMPLEMENTER down to 30, the 9-line overshoot over two rounds (R39: +4, R40: +5) suggests the Phase 3 entry context should plan for a consolidation MR early in Phase 3.
