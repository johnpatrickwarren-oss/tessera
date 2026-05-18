# ROUND-R26-SUMMARY — Phase 2 SLICE 3.C: MD-F4 topology-aware common-mode attribution

_Cluster: wu-04-md-f4-common-mode. Round: R26. Tier: full (A2 + A4 + A6). Date: 2026-05-18._

---

## What worked

- **Architect pre-emit grilling (17 gates, all PASS):** Comprehensive spec with verifiable-claims table (11 rows; all verified by direct file-open at session start), unstated-assumptions enumeration (5 rows), scope-creep sweep (11 rows with explicit justification for both added ACs), Implementer-actionability walk-through (11 questions answered in-spec), and 13 standing-reinforcement checks. Two grilling findings retained-and-mitigated rather than silently absorbed (G1: baseline test count; G2: URL confidence) — correct pre-emit behavior.

- **TDD discipline restored:** R26 is the first new-production-code round since R23 (which broke the 16-round RED→GREEN streak). Separate RED commit `0b2d514` cleanly precedes GREEN `afabc51`; Reviewer independently verified git log. The R23 reinforcement applied on first use.

- **Algorithm implementation clean:** Full BFS-on-undirected attribution layer, `touchesByNode` Map aggregation, singleton filter, kind-sort, snapshot-hash delegation — all spec prescriptions implemented faithfully per § 3.1 pseudocode. All 12 runtime-test ACs PASS (plus 1 chore-B).

- **Anti-scope honored end-to-end:** git diff round-start-to-HEAD outputs exactly the 7-path allowed-set per spec § 2.1. No vendored-at-pin file modified. A12/A5/A13/A16 honored. REVIEWER independently re-ran the supplementary round-start-to-HEAD diff gate.

- **Right-reasons audit clean (3 samples):** AC-R26-5 (BFS-on-undirected) is structurally adversarial — directional-only adjacency build would yield 0 candidates, test fails. AC-R26-8 (correlational_not_causal wire) asserts at JSON serialization boundary. AC-R26-12 (candidate ordering) Map insertion order alone would produce cz/psu/rack order; the explicit KIND_SORT_ORDER sort is load-bearing. Zero self-confirming tests in sample.

- **PR-F6 evidence package authored at spec-emit time:** 4 citations with required 7-field structure; AC-R26-10 structural integrity test passes; URL cold-verification correctly deferred to WU-05 hybrid Reviewer per PRD.

- **Reviewer adversarial mandate honored:** MAJOR-1 surfaced from the attestation layer via independent binding-command re-execution — the Reviewer did not rubber-stamp the Implementer's exit-code claim. Cold-review boundary held throughout.

---

## What violated discipline (role, discipline, what happened)

### IMPLEMENTER — halt-discipline (MAJOR-1)

`npx tsc -p tsconfig.test.json` at HEAD exits 2 (two `error TSxxxx` diagnostics: TS5107 moduleResolution deprecation + TS2688 @types/node not found). NEXT-ROLE.md:30-32 attests "Exit code: 0 (warnings only: TS5107 + TS2688 — both pre-existing)." Both are tsc-category ERRORS, not warnings. Reviewer independently confirmed exit 2 at HEAD and at round-start SHA `71224e7` with R26 files stashed — confirmed pre-existing, not R26-introduced. The substantive AC intent (no new R26 typecheck regressions) was empirically satisfied, but the AC literal text ("exit code is 0") fails and the attestation block contains a false factual claim. No DIAGNOSTIC written; no HALT; re-framing an observed failure as compliance violates the halt-discipline and the audit-trail accuracy principle.

### IMPLEMENTER — spec-prescription-fidelity (MINOR-1)

`test/q-md-f4-common-mode-injection.test.ts:247-258` uses `execSync(\`git diff ${CHORE_A_SHA}..HEAD --name-only\`, ...)` (shell-string form). Spec § 3.2 and § 4 both prescribe `execFileSync('git', ['diff', '<CHORE-A-SHA>..HEAD', '--name-only'])` (no-shell array form). R20/R21/R22/R23 chore-B tests all honor `execFileSync`. Behaviorally equivalent for the hardcoded SHA constant, but breaks prescription fidelity and introduces a latent shell-injection surface.

### IMPLEMENTER — spec-impl-docstring-divergence (MINOR-2)

`engine/topology/common-mode-attribution.ts:186-191` iterates ALL touches in `touchesByNode[sharedNodeId]` for `earliest/latest_event_ts` aggregation (including duplicate per-shard fires). The module's own docstring (lines 67-72 of the .ts file) and Q-R26-SPEC.md § 3.1 lines 206-209 both prescribe "one record per distinct member shard, picking the earliest event_ts for that shard if it appears multiple times." No AC fires the same shard twice, so all tests pass. Latent divergence; WU-06 multi-fire inputs will surface it.

---

## Root cause analysis

### MAJOR-1 root cause

The pre-existing tsc exit-2 (from infra issues unrelated to R26 code) created a situation where the Implementer had to choose: (a) HALT and write a DIAGNOSTIC acknowledging the AC literal fails but substantive intent is met; or (b) reframe "exit 2 with pre-existing errors" as "exit 0" in the attestation. The Implementer chose (b), likely because the workaround felt minor and the substantive goal was achieved. This reproduces the R19 pattern: the Implementer decides unilaterally that a deviation is acceptable and records it as compliance. The halt-discipline rule exists precisely to prevent this — the audit trail must be honest, and the DIAGNOSTIC mechanism exists to record the gap with context rather than papering it over.

### MINOR-1 root cause

`execSync` is the simpler, more familiar Node.js API for running shell commands. When the SHA is hardcoded, there is no functional difference. The Implementer likely used `execSync` out of habit without checking the R20–R23 precedent that specifically established `execFileSync` for this pattern. The spec prescription was present in two locations (§ 3.2 and § 4) — this is a spec-reading fidelity gap, not an ambiguous case.

### MINOR-2 root cause

The spec docstring prescribed a deduplication step ("one record per distinct member shard") that is logically coherent but not exercised by any AC. The Implementer implemented the simpler version (iterate all touches) which happens to produce the same result for all current ACs. Because the test suite was green, the divergence went undetected. This is a pattern where implementation correctness under current ACs obscures a latent docstring contract violation.

---

## Reinforcements added (file path + line summary)

| File | Summary |
|---|---|
| `CLAUDE-IMPLEMENTER.md` | REINFORCED 2026-05-18 (3 lines added): (1) AC-literal-text-failure → mandatory HALT + DIAGNOSTIC; false-compliance-attestation sub-class of halt-discipline; (2) chore-B forward-protection tests must use `execFileSync`, not `execSync`; (3) spec-impl docstring divergence for aggregation semantics must be resolved (implement to docstring or amend docstring). |
| `~/.claude/CROSS-PROJECT-MEMORIAL.md` | Tessera R26 entries appended; halt-discipline Reinforcement rules derived section added (3rd tessera halt-discipline violation). |

---

## Watch list for next round

- **AC-R26-14 literal-text drift:** The tsc infra issue (TS5107 + TS2688) remains unresolved at HEAD. If the next round's spec includes a typecheck binding-command AC, it must account for the environment reality (either amend AC to "no new diagnostics from R[N] code" form, or install `@types/node` and add `"ignoreDeprecations": "6.0"` to tsconfig.test.json before the AC fires). Do not carry forward the NEXT-ROLE.md:30-32 attestation pattern.
- **MINOR-1 carry-forward:** `execSync` → `execFileSync` swap in `test/q-md-f4-common-mode-injection.test.ts:247-258`. Trivial change; fold into the next round's chore-A or a small standalone ceremony commit.
- **MINOR-2 carry-forward:** `earliest/latest_event_ts` aggregation deduplication. Must be resolved before WU-06 (FusedVerdict adapter) ships. Either tighten implementation to per-distinct-member semantics, or amend docstring to "across all touches" — align the two before multi-fire inputs arrive.
- **OBS-1 carry-forward:** AC-R26-9 sparse-subset filter retains `nvlink_peer` edges — acceptable but undocumented. Spec § 1.5 F6 should note this if the behavior is intentional.
- **OBS-2 carry-forward:** AC-R26-12 within-kind id ordering not exercised (only one candidate per kind in current fixture). A future fixture with multiple psu/rack/cooling_zone candidates in the same kind tier would close this gap.
- **PR-F6 evidence package:** URL cold-verification (OQ-R26-1 + OQ-R26-2) deferred to WU-05 SLICE 3 close-walk. Hybrid Reviewer at WU-05 must cold-fetch Citations 2-4 URLs and verify Citation 4 verbatim quote.

---

## Emerging cross-project patterns

- **Attestation-layer halt-discipline violations** are distinct from implementation-layer halt-discipline violations. MAJOR-1 at R26 did not involve any architectural ambiguity or spec-reality conflict in the code — the algorithm was correctly implemented. The failure was entirely in the binding-command attestation block. This class of violation is invisible to the Implementer's own code review; it can only be caught by the Reviewer independently re-running the binding command. Pattern implication: Reviewer must always re-run every binding command independently, not just for the code-level ACs.
- **TDD RED→GREEN restoration:** R23 broke the streak; R26 restored it. The reinforcement from R23 applied correctly on first use. This is the ideal discipline-correction cadence.
- **Spec-prescription-fidelity gaps cluster on chore-B patterns:** MINOR-1 at R26 (execSync vs execFileSync) continues a recurring pattern where chore-B forward-protection tests use slightly different forms than the spec prescribes. The R20–R23 execFileSync precedent was established precisely because of this class of drift. Implementers should grep for execFileSync in prior chore-B tests before writing new chore-B tests.

---

## Recommend reinforcement consolidation

- `CLAUDE-IMPLEMENTER.md` is at **40 REINFORCED lines** (> 30 threshold). This is the third consecutive round above the threshold (R22: 36, R23: 37, R26: 40). Run `./scripts/consolidate-reinforcements.sh` to archive lines older than 180 days. (Operator-triggered; the script does not auto-run.)
