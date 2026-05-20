# Q-R71-SPEC-AUDIT — Architect ceremony sidecar

**Round:** R71
**Companion spec:** `coordination/specs/Q-R71-SPEC.md`
**Architect session entry SHA:** `54af89f` (chore(R71 directive)) — verified via `git rev-parse HEAD`.
**Spec-emit SHA:** stamped at the spec-triad commit (this file lands in the same commit as `Q-R71-SPEC.md` + `Q-R71-EMPIRICAL.sh`).

This sidecar contains audit-trail content adjacent to the spec proper. The Implementer reads `Q-R71-SPEC.md` for prescriptive guidance; the Reviewer is authorized to read this sidecar for ceremony evidence.

---

## § A. P3 ten-axis verification (one sentence per axis)

- **Correctness:** every engine surface invoked is at the exact signature read at session entry from the source file:line cited in spec § 1.3.
- **Completeness:** all 8 directive-prescribed scenarios are specified end-to-end (engine surface + synthetic input + terminal predicate + reasoning + suggested actions); the build tool emits both JSON and HTML artifacts; package.json + README modifications are prescribed verbatim.
- **Consistency:** § 5 AC predicates, § 4.3 test pseudocode, § 5.1 branch-binding table, § 5.3 discriminating-assertion rows, and § 9.2 cross-section sweep agree on every literal value (DEMO_THRESHOLD = 200, qLevel = 0.10, fleet log_threshold = log(20), window counts per scenario).
- **Clarity:** pseudocode uses real engine types imported from their declaration files; pre-authored prose for reasoning + suggested_actions strings (§ 4.2) is copyable verbatim by the Implementer; halt conditions (§ 6.1) are binary predicates.
- **Coverage:** § 5 covers every scenario's terminal state + the dashboard's structural shape + R70 anti-regression; § 5.1 maps every load-bearing branch in the build tool to an AC.
- **Constraints:** anti-scope A1–A13 (§ 3.3 + § 6) bound the modification surface; ALLOWED_SET (§ 3.2) enumerates the diff envelope; TACTICAL AUTONOMY scope (§ 6.2) bounds Implementer latitude.
- **Concurrency:** none — build tool is sequential; LCG state is per-scenario; browser dashboard's setInterval is single-threaded.
- **Corner cases:** empty-adjacency BFS in sparse-data-resilience scenario, FDR with K=0 fallback (halt #9), fleet wealth never crossing threshold (halt #9), M_t=null for non-Family-A scenarios are each addressed in § 9 + bound by AC or halt condition.
- **Cost:** ≤900 lines TS for build tool; ≤500 lines TS for tests; ≤2500 lines HTML incl. inlined JSON; round runtime budget < 30 s for full `pnpm build:demos` invocation.
- **Coupling:** consumes 11 stable engine public exports (§ 1.3); R70 CLI untouched per anti-scope A3; AC-R71-14 binds the anti-regression.

---

## § B. Pre-route discipline application

### B.1 Superpowers Brainstorm (Phase 1)

Three approaches considered: (A) live engine in the browser (eliminated by halt #8 + anti-scope #2); (B) JSON-only with browser fetch() (eliminated by `file://` origin requirement); (C) DS-mirror with JSON files + data inlined in demo.html (PICKED). Rejection rationale recorded inline at spec § 0.

### B.2 Superpowers Design (Phase 2)

Component boundaries (§ 1.1) + data flow (§ 1.2) + integration points (§ 1.3) + failure modes (§ 1.3 below the integration table) all sketched inline before per-file pseudocode at § 4.

### B.3 Pre-emit grilling (§ 10)

Adversarial self-review run post-spec-body-authoring, before this audit sidecar was authored. All 5 grilling axes (verifiable / unstated / scope / actionable / reinforcement-sweep) answered with rationale. Reinforcement sweep covers 18 prior tessera reinforcements (R01..R70).

### B.4 Spec-internal contradiction sweep (R65 MINOR-2; § 9.2)

Run post-emit. No contradictions detected across § 1.3 engine cites + § 2.1 scenario design + § 4.1 pseudocode + § 5 AC predicates + § 9 P3 commitments.

### B.5 Empirical premise verification (R08 MAJOR-2; § 9.1)

Architect ran the following at session entry and recorded actual outputs:
- `git rev-parse HEAD` → `54af89f1221799b25fad0d081df636e4ca71d7c5` ✓
- `git status` → clean ✓
- `pnpm exec node --test --test-reporter=tap test/*.test.js` → `# tests 455 / # pass 447 / # fail 5 / # skipped 3` ✓
- 5-fail identity grep: `AC-R36-21, AC-R36-30, AC-R36-31, AC-R65-2, AC-R66-14` ✓
- `git ls-files demos/scenarios/ tools/build-canned-demos.ts` → empty (files do not yet exist) ✓

No "inherited from R70 attestation" premise (R25 MINOR-1 reinforcement applied — baseline run fresh at this session's entry).

### B.6 .gitignore-aware spec inventory (R23 ARCH MINOR-2)

`.js` compiled outputs are gitignored per the project's existing rule. Spec § 3.1 + § 3.2 inventory only `.ts` source + JSON / HTML / SH / MD artifacts. Architect verified at session entry via `git ls-files tools/*.js demos/*.json` → empty output for `*.js`; existing `tools/demo-scenario.js` confirmed absent from git tracking.

### B.7 Cite-then-verify discipline (R58 + R65 MINOR-1)

Every engine signature in spec § 1.3 was extracted via direct `Read` at session entry; line numbers re-checked by `Grep` for the named symbol. No memory citations. Routing-block AC numbers will be copied from spec via `grep` at the spec-commit time (per R65 MINOR-1 reinforcement) — not retyped from memory.

### B.8 Halt-condition carve-out audit (R56 MINOR-1)

§ 6.1 last paragraph documents that R71's single-state design has no overlap between halt-condition triggers and pre-documented expected outcomes. No "OTHER THAN the pre-documented two-state mismatch" carve-out needed (unlike R56-class spec where chore-A binding-command output was expected to be non-zero at one state).

### B.9 Spec-narrative-vs-executable-script alignment (R70 MINOR-2)

§ 11.2 binds this check explicitly. The Architect re-reads § 11.1 block descriptions against the actual Q-R71-EMPIRICAL.sh body at spec-commit time (before routing). Any divergence (e.g., anchored vs unanchored grep, missing flag, etc.) is corrected at spec-emit time per the R70 lesson.

### B.10 Round-evolution-fragility avoidance (R62 + R66 + R68 — 4th-instance)

§ 9.3 documents the explicit avoidance: no chore-B, no forward-protection AC, no live-file-count AC, no anti-scope-diff-against-prior-round AC, carry-forward fail set bound by identity not count alone, historical-only diff.

---

## § C. Architect pre-prediction on outcomes

At chore-A HEAD, Architect predicts:

| Binding command | Predicted output |
|---|---|
| `pnpm exec tsc -p tsconfig.test.json` | exit 0; zero diagnostics |
| `pnpm exec node --test --test-reporter=tap test/*.test.js` | `# tests 469 / # pass 461 / # fail 5 / # skipped 3` (455 baseline + 14 new q71 ACs; 5 carry-forward identity preserved) |
| `bash coordination/specs/Q-R71-EMPIRICAL.sh` | 10 PASS / 0 FAIL / exit 0 |
| `git diff $ROUND_START_SHA..HEAD --name-only` | 18 paths matching ALLOWED_SET; 0 diagnostic files |
| `git diff $ROUND_START_SHA..HEAD --name-only -- engine/` | empty |

Implementer attests OBSERVED values verbatim per Rule 1 sub-class `empirical-command-attestation`. Architect's prediction is NOT load-bearing for AC satisfaction — the ACs verify structural shape + predicates, not specific count literals. (R25 MAJOR-1 + R26 MAJOR-1 lesson applied.)

If divergence observed:
- Test count off by 1-2 (e.g., 470 / 462 / 5 / 3): natural sub-test-count variation; non-load-bearing; proceed.
- 6th fail appears OR one of the 14 q71 ACs fails: halt #10 fires; HALT + DIAGNOSTIC.
- `tsc` exits non-zero: halt #2 fires; HALT + DIAGNOSTIC.
- Anti-scope diff includes an engine/ path: halt #6 fires; HALT + DIAGNOSTIC.

---

## § D. Decision rationale (what was picked AND what was rejected)

| Decision point | Picked | Rejected | Rationale |
|---|---|---|---|
| Architecture | Approach C (build tool emits JSON + regenerates demo.html with data inlined) | A (live engine in browser); B (browser fetch from disk) | A: halt #8 forbids bundling; engine is CJS / Node-only. B: file:// origin rejects fetch. C: only path opening from file:// with no bundler. |
| Scenario count | 8 | 6 (lower bound of directive); 4 (R70 surface) | Directive prescribes 6-8; 8 covers all 4 PRD US's plus FDR + hierarchical-evalue + sparse + topology-spanning extensions explicitly named in directive § 16-31. |
| New scenario engine surfaces | `eBenjaminiHochberg` (engine/fleet/e-bh.ts), `combineAverage` + `freshFleetEProcessState` + `updateFleetEProcessState` (engine/fleet/combine.ts), `attributeCommonMode` with override opts (engine/topology/common-mode-attribution.ts) | Building from scratch in build tool | Reuse stable Phase-2-frozen engine surfaces; same claim-then-walk discipline as R70 scenarios; minimal divergence from existing R70 wiring pattern. |
| JSON file location | `demos/scenarios/<name>.json` (one per scenario; 8 files) | Single bundled `demos/scenarios.json` | One file per scenario = human-inspectable + audit-trail clean + per-scenario test pinning + matches DS `demos/scripts/*.json` pattern. |
| demo.html data inlining | `<script type="application/json" id="tessera-scenario-<name>">…</script>` blocks per scenario | Single `<script type="application/json" id="tessera-scenarios">` with all in one | Per-scenario tag = simpler regex match for AC-R71-12; lower chance of JSON parse failure dropping all scenarios at once. |
| HTML template authoring | Inline string constants in `tools/build-canned-demos.ts` | Separate `demos/demo.template.html` file (DS pattern) | Operator directive lists only `demos/demo.html` as a new HTML file (no `.template.html` mention); inline string keeps file count down at no template-readability cost since the template is fully prescribed by spec § 2.3. |
| Determinism for floating-point | `M_t` rounded to 6 decimal places via `Math.round(M * 1e6) / 1e6` | Raw `JSON.stringify` (which produces full IEEE-754 representation) | Cross-platform / cross-Node-version determinism: trailing-bit differences at the 16th decimal place would break AC-R71-3 idempotency on macOS vs Linux. 6 places is well within the meaningful precision of the demo (M_t shows wealth ratios in 10^0 to 10^6 range). |
| LCG seed values | `0x71...` series (distinct from R70's `0x70...` to make scenarios independent) | Re-use R70 seeds | Avoids accidental shared state across rounds; the `0x71...` family signals R71 lineage. |
| Drift magnitudes | `0.4 / 0.45 / 0.20` per scenario | Single value applied uniformly | Each scenario needs a different drift to demonstrate its specific PRD-US property: sdc-drift needs single-shard fire by window 30; fdr needs 3 shards to differentiate from 7 stationary; hierarchical needs all 5 shards to drift slowly enough to not fire alone. |
| Pre-authored prose | Architect provides verbatim strings (§ 4.2) | Architect describes shape, Implementer authors prose | Reasoning + suggested-actions are operator-facing surfaces; consistency + tone matter; Architect-authored verbatim prose eliminates per-scenario tone drift risk. |
| ALLOWED_SET regex carve-out | Yes (DIAGNOSTIC-R71-*.md regex) | No carve-out | Halt conditions may require DIAGNOSTIC file; ALLOWED_SET must accommodate halt-spec consistency (R15 MINOR-1 reinforcement applied). |
| Chore-B step? | No (single-state) | Yes (forward-protection or SHA injection two-state) | R62 + R66 + R68 cumulative lesson: round-evolution-fragility avoidance. R71 is the 4th-instance avoidance. |

---

## § E. Amendments from prior version

**None.** This is the first version of Q-R71-SPEC.md; no prior version to amend. (R71 has not previously ESCALATED through the Architect role.)

---

## § F. Tier rationale recap

Per the directive: **full-tier** = Architect + Implementer + Reviewer + Memorial-Updater.

Justification (per CLAUDE-COMMON.md tier rubric):
- **A2** (new architectural pattern with no precedent in the codebase): static-HTML dashboard surface is genuinely new — Tessera has shipped CLI-only previously (R70). The data-pipeline-into-static-HTML pattern is new at this repo (it exists at DS but is not vendored).
- **A4** (novel data model): the captured-per-window JSON shape is new (R70 captured only terminal state in `ScenarioResult`); the dashboard JS data contract is new.
- **A6** (large blast radius): touches `demos/` (new directory), `package.json` (script block), `README.md`, `tools/` (new build tool); 4 PRD user stories' scenarios bound by ACs.

Full-tier is appropriate. A `solo` or `audit` tier would not catch (a) the file:// compatibility constraint (a single architectural decision; B vs C selection), (b) the round-evolution-fragility 4th-instance avoidance verification, (c) the cross-section consistency sweep across 8 scenarios.

---

_End of Q-R71-SPEC-AUDIT.md._
