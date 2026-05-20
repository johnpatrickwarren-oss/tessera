# Q-R61-SPEC-AUDIT — Architect audit sidecar

_Audit-trail companion to `Q-R61-SPEC.md`. Reviewer reads both; Implementer reads spec proper only. Per `CLAUDE-ARCHITECT.md` (R61 architecture: split spec proper from audit content)._

---

## § 1 Empirical premise verification log (per R08 + R25 MAJOR-1 reinforcement)

### § 1.1 Inputs read at session entry

| Input | Read action | Result |
|---|---|---|
| `coordination/NEXT-ROLE.md` | full read | R61 round-scope directive recorded; operator dispositions W3-1/2/3/4/5 + Path B carry-forward extracted; ALLOWED-set + Halt conditions noted |
| `coordination/PRD.md` | full read (§ Phase 3 SLICE 3 lines 483-487; FR-D1 line 439; AC-P8 line 450; § Project goal line 340) | Phase 3 SLICE 3 framing confirmed; FR-D1 + AC-P8 traced |
| `coordination/WAVE-PLAN-09.md` | partial read (Step 1 WU-Phase3-3A row; Step 3 Judgment calls 3-6) | Wave 9 single-cluster shape confirmed; Coordinator defaults match operator dispositions |
| `coordination/MEMORIAL.md` | partial read (R42-R58 rounds; key violations + reinforcements) | Recent discipline state absorbed; R56 MINOR-1 halt-carve-out + R53 MINOR-1 chore-A/chore-B two-state + R58 MINOR-1 constructor-options drift all noted |
| `~/.claude/CROSS-PROJECT-MEMORIAL.md` | grep-based reads (Rule 7 canonical text at line 3478; Rule 1 sub-class derivation context at lines 3380-3478) | 7-rule canonical short names confirmed |
| `coordination/SPEC-AUTHORING-CHECKLIST.md` | full read | Rule 7 Surface (a) discipline confirmed; Empirical-AC discipline (Rule 1 sub-class) authoring requirements noted; Pipeline-mandatory discipline noted |
| `coordination/VENDORING-MANIFEST.md` | full read | 33 vendored-at-pin engine/* rows + 3 vendored-with-deltas rows + 3 vendored-at-pin tools/* rows + 1 REMOVED-AT-R02 + 1 anchor-methodology section verified |
| `coordination/SCOPING-MEMO-v0.3.md` § 9 (lines 590-655) | targeted read | Engine vendoring policy + extract-to-npm commitment + re-pinning policy + existing extract framing absorbed |
| `package.json`, `tsconfig.json`, `tsconfig.test.json` | full read each | Root build configuration verified; `private: true` confirmed at package.json:6 (workspace pre-requisite met); engine include glob verified |
| `engine/` tree listing | bash ls | 33 vendored-at-pin engine files + 3 vendored-with-deltas + 21 Tessera-original confirmed |
| `engine/fleet/*.ts` headers | head -10 each | All 4 files (`combine.ts`, `detectors.ts`, `e-bh.ts`, `verdict-consumer.ts`) confirmed Tessera-original (NOT vendored from DeploySignal); stay at tessera tree |
| `engine/loader.ts`, `engine/hardware-topology-source.ts` headers | head -10 each | Both confirmed Tessera-original; stay at tessera tree |
| `engine/types/verdict.ts` header + imports | head -25 + grep imports | Vendored-with-deltas confirmed; imports from `./primitives`, `./metrics`, etc. enumerated — these become package imports post-extract |
| `test/q01-vendoring-coverage.test.ts` | full read | VENDORED_AT_PIN_PATHS array structure verified; HEADER_RE + SHA_RE constants; manifest-row includes() check at lines 77-96 |
| `test/q01-no-at-pin-deltas.test.ts` | full read | AT_PIN_FILES array structure verified; HEADER_LINE_COUNT = 6; stripHeader logic; byte-identity assertion against `../deploysignal/` |
| `coordination/specs/Q-R58-EMPIRICAL.sh` | full read | Q-RNN-EMPIRICAL.sh template format confirmed (assert_eq + assert_truthy + per-AC blocks + two-state distinction + aggregate exit); used as authoring reference for Q-R61-EMPIRICAL.sh |
| `scripts/verify-empirical-acs.sh` | full read | Rule 1 sub-class harness invocation pattern confirmed |

### § 1.2 Binding commands run at session entry

| Command | Output | Disposition |
|---|---|---|
| `git rev-parse HEAD` | `8c64ce0b58aa891a6488efcfc38fa45ac074d6ba` | Encoded as round-start SHA in spec preamble + § 3.2 ALLOWED_SET baseline + § 5.1 AC-R61-14 |
| `node --test --test-reporter=tap test/*.test.js` | tests=399 / pass=394 / fail=2 / skipped=3 | Encoded as session-entry empirical baseline in spec preamble; informs § 5.4 chore-A vs chore-B prediction (399 + 4 new q61 tests = 403 total) |
| `npx tsc -p tsconfig.test.json` | exit 0 | Encoded in spec preamble; AC-R61-3 prediction is exit 0 (preserved) |
| `git log --oneline -5` | 8c64ce0 chore: prepare R61 directive ... | Round-start commit confirmed; R60 Coordinator artifacts at parent commit; clean lineage |

Per R08 + R25 MAJOR-1 reinforcement: no inheritance from R60 Coordinator attestation or R58 prior round testimony for empirical baselines; all numbers from direct command runs at session entry.

### § 1.3 Empirical baseline encoded honestly per Rule 1 sub-class

The session-entry baseline (`399/394/2/3`) is encoded VERBATIM as observed; not reframed. The 2 known fails (R36-30 + R36-31) are pre-documented in spec preamble + § 5.4 as inherited forward-protection guards that will continue to fail post-R61. No reframing as "false-compliance compliant"; the pre-existing fails are honestly attested.

---

## § 2 Pre-route discipline application

### § 2.1 Superpowers Brainstorm phase (per `CLAUDE-COMMON.md`)

- Generated ≥3 distinct approaches per axis (4 axes × 3 approaches = 12 approaches total).
- Documented strengths / weaknesses / hidden assumptions / risks for each.
- Identified PRD/operator-disposition constraints eliminating options.
- Selected best tradeoff with explicit rationale naming both PICKED and REJECTED options.
- Documentation written inline in spec § 0.1–§ 0.4.

### § 2.2 Superpowers Design phase

- Sketched component boundaries (§ 1.1: what exists / what gets created / what changes / what gets deleted) in tabular form covering all 24+ touch-points.
- Identified all integration points (§ 1.2 — 4 integration points).
- Verified each integration point against PRD requirements (cross-reference to FR-D1 + AC-P8 + AC-P7).
- Identified failure modes per integration point (§ 1.4 — 11-row failure-mode table with mitigations).
- Type-pretest pseudocode for the package barrel (§ 1.5) with Architect pre-prediction documented.
- Documentation written inline in spec § 1.1–§ 1.5.

### § 2.3 Superpowers Review phase

- Re-read spec as if next role (Implementer) receiving cold (per § 10.1 Q4 grilling).
- Marked unstated assumptions (§ 5.5 D-1 through D-6 honest-broker disclosures).
- Marked deferred decisions (OQ-R61-1 surfaced; § 5.5 D-2 surfaces alternative resolutions).
- Confirmed no scope beyond directive (§ 10.1 Q3 grilling).
- Concluded: Implementer can act with one bounded ESCALATE path (OQ-R61-1) and explicit Architect recommendation for that path.

### § 2.4 Pre-emit grilling output

- Q1-Q4 grilling at § 10.1: explicit answers documented.
- 30+ reinforcement sweep entries at § 10.2: each labeled Applied / N/A / PENDING.
- Cross-section consistency table at § 10.3: 7 token-categories verified consistent across 3+ sites each.
- Pre-route checklist at § 10.4: 13/13 checked.

### § 2.5 Branch-binding coverage table (per R21 ARCH MINOR-2/3)

Documented inline at spec § 5.3: 15 branches/guards × binding AC rows. Every guard prescribed in production code or build configuration has an AC that structurally exercises it. No structurally-unreachable branches in prescribed code; no AC-unbound guards.

---

## § 3 Architect pre-predictions on outcomes

### § 3.1 Test count predictions

- **Chore-A (pre-SHA-injection):** `403/397/3/3` (baseline 399 + 4 new q61 tests; 3 fails = R36-30 + R36-31 + AC-R61-15 placeholder failing by construction).
- **Chore-B (post-injection):** `403/398/2/3` (AC-R61-15 placeholder resolved; +1 pass / -1 fail).
- **Architect confidence:** HIGH for total count = 403; MEDIUM for pass/fail/skipped breakdown (depends on Implementer's q61 test structure and any additional incidental test outcomes from the import-rewrite changes).
- **Carve-out:** AC-R61-10 Q-R61-EMPIRICAL.sh block predicts the POST-CHORE-B value (`403/398/2/3`); chore-A FAIL is pre-documented per § 6.1 carve-out + R56 MINOR-1 reinforcement.

### § 3.2 tsc exit prediction

- **Pre-extract:** exit 0 (verified at session entry).
- **Post-extract (after package built + Tessera-side imports rewritten):** Architect prediction = exit 0. Reasoning: the move preserves every file's content byte-identical (modulo location); the package barrel re-exports every moved symbol; the import-rewrites change specifier strings only (not the imported symbol names). tsc should resolve the new specifier via npm workspace symlink → package's `main`/`types` fields → compiled `dist/`. Failure modes per § 1.4 are anticipated and mitigated.
- **Architect confidence:** HIGH — the dominant failure modes are anticipated.

### § 3.3 Anti-scope diff prediction

- Predicted total file count in `git diff 8c64ce0..<chore-A> --name-only`: 70-100 paths.
  - 33 explicit rename pairs (66 path entries for the moves)
  - ~30 Tessera-side files with import-rewrite edits (engine/, tools/, test/ paths in regex carve-out part (c))
  - 4 new package scaffolding files (package.json, tsconfig.json, README.md, src/index.ts)
  - 1 new test file (q61-engine-npm-extract.test.ts)
  - 2 q01 test path-list updates
  - Root: package.json + package-lock.json (regenerated)
  - 3 coordination files: VENDORING-MANIFEST.md + SCOPING-MEMO-v0.3.md + NEXT-ROLE.md
  - 3 spec files: Q-R61-SPEC.md + Q-R61-SPEC-AUDIT.md + Q-R61-EMPIRICAL.sh
  - MEMORIAL.md (added at chore-A)
- **Architect confidence:** MEDIUM — exact count depends on which Tessera-tree files actually import from moved-to-package paths (∼30 file estimate based on session-entry grep; actual may be ±5).
- **Carve-out adequacy:** § 3.2 ALLOWED_SET regex carve-outs (b) + (c) are designed to be permissive enough to capture all anticipated diff paths. If any path falls outside, § 6.2 halt fires.

---

## § 4 Path git-trackability verification

Per R23 ARCH MINOR-2 reinforcement: each ALLOWED_SET path verified against `.gitignore`:

| Path | git-trackable? | How verified |
|---|---|---|
| `packages/deploysignal-engine/` (new dir) | YES | `.gitignore` does NOT list `packages/`; parent `packages/` will be created and tracked |
| `packages/deploysignal-engine/dist/` (build output) | NO | `.gitignore:8` lists `dist/` (root-level); `dist/` anywhere is ignored. Compiled output never in diff. |
| `packages/deploysignal-engine/src/*.js` (any incidental .js artifacts) | NO | `.gitignore:6` lists `*.js`. |
| `packages/deploysignal-engine/src/*.ts` | YES | Not gitignored. |
| `packages/deploysignal-engine/package.json` | YES | Not gitignored. |
| `packages/deploysignal-engine/tsconfig.json` | YES | Not gitignored. |
| `packages/deploysignal-engine/README.md` | YES | Not gitignored. |
| `package-lock.json` | YES | Tracked already (`git ls-files package-lock.json` → present). Regenerated at `npm install`. |
| Engine/* old paths (post-move) | n/a | Files no longer exist at old paths post-`git mv`; diff records as renames. |
| `coordination/specs/Q-R61-*.{md,sh}` | YES | Standard coordination spec location. |
| `coordination/MEMORIAL.md`, `coordination/NEXT-ROLE.md`, `coordination/VENDORING-MANIFEST.md`, `coordination/SCOPING-MEMO-v0.3.md` | YES | All tracked. |
| `coordination/diagnostics/DIAGNOSTIC-R61-*.md` | YES | Conditional; tracked when created. |

---

## § 5 Decision rationale summary

### § 5.1 Why Approach A (physical move) over Approach B (path-redirect stub)

Architectural intent of FR-D1 is to ELIMINATE the per-file SHA pins for the moved subset by making the package version pin the new source of truth. Approach B (path-redirect stub) leaves the source-of-truth at `tessera/engine/`; the package becomes a façade that does not eliminate vendoring drift. AC-P8 ("both Tessera + DS consume the same version") becomes structurally unachievable under Approach B because the "version" referenced is not a real version pin — it's a path indirection. Approach A is the structurally correct choice and is the path the operator NEXT-ROLE.md line 30 indicated by raising the trade-off explicitly.

### § 5.2 Why Approach A (vendored-at-pin only) over B (with-deltas) over C (full engine)

The semantic boundary "what is shared with DS at SHA `5a72371`" already exists in `coordination/VENDORING-MANIFEST.md`. Approach A makes that semantic boundary the physical package boundary. Approach B contaminates the upstream-snapshot package with Tessera-specific extensions. Approach C conflates the shared engine with Tessera's downstream extensions and expands the package's scope unboundedly as future Phase 3 SLICE 3 R63 work adds new Tessera-original files. Approach A preserves the architectural cleanness.

### § 5.3 Why npm workspaces over file: reference

Idiomatic monorepo pattern; future-proof for additional packages; transitive devDeps work correctly; matches operator's W3-2 Option B (Tessera monorepo sub-package layout).

### § 5.4 Why separate package tsc over combined tsc

Preserves package consumability (Tessera current + DS future); standard pattern; clean separation. Cost of one extra `pretest` build step is minor.

### § 5.5 Why opportunistic SCOPING-MEMO § 9 amendment

Per W3-5 Option A operator disposition: if Architect spec naturally touches SCOPING-MEMO, amend opportunistically. The extract-to-npm commitment in § 9 is precisely the commitment R61 realizes — adding a single paragraph at the end documenting the landing is natural and minimal. ALLOWED_SET part (a) includes the file per § 3.2.

---

## § 6 Honest-broker disclosures (mirrored from spec § 5.5)

1. **D-1: Test count prediction precision.** Architect predicts 4 sub-tests in `test/q61-engine-npm-extract.test.ts`; Implementer's actual count may differ if they consolidate ACs. Spec AC-R61-10 binds the post-chore-B PREDICTED value (`403/398/2/3`); if Implementer's actual differs, Q-R61-EMPIRICAL.sh AC-R61-10 block FAILS and Implementer encodes ACTUAL verbatim per Rule 1 sub-class.
2. **D-2: q01-vendoring-coverage manifest-row check fragility** — surfaced as OQ-R61-1 with Architect-recommended Option (b) resolution (loosen test's includes check).
3. **D-3: AC-R61-15 forward-protection placeholder** per R53/R56/R58 chore-A vs chore-B pattern.
4. **D-4: Package `private: true` means AC-P8 partially realized** — only local-workspace Tessera-side consumption. Full realization requires future npm publication OR DS-side git-dep PR.
5. **D-5: Unusually large diff (~70-100 files)** for R61 vs typical Tessera round (≤20 files). Disclosed for Reviewer cold-eye time-budget awareness.
6. **D-6: Package `dist/` gitignored** — compiled output never in diff; AC-R61-12 verifies require-loadability instead.

---

## § 7 Amendments from prior version

None — this is v1 of Q-R61-SPEC; first emit.

---

## § 8 Reviewer-anchor table (per CLAUDE-ARCHITECT.md "REVIEWER-ANCHOR" convention)

| Architectural primitive | Anchor file:line | Verification at SHA `8c64ce0` |
|---|---|---|
| Vendored-at-pin file inventory (33 engine/* files + 3 tools/*) | `coordination/VENDORING-MANIFEST.md:10-50` | Verified by Architect via direct read of manifest table rows |
| Vendored-with-deltas file inventory (3 files) | `coordination/VENDORING-MANIFEST.md:30,31,41` (verdict-groups.ts at row 30; verdict.ts at row 31; config.ts at row 41) | Verified |
| FetchContext type (R58 deliverable; not moved) | `engine/topology/fetch-context.ts:11` (declared as `export interface TopologyFetchContext extends FetchContext`) | Stays at tessera tree (Tessera-original) |
| Topology adapters (5 Tessera-original; not moved) | `engine/topology/{slurm,k8s,nvlink,neuron,tpu}-source.ts` + `common-mode-attribution.ts` | Stay at tessera tree |
| Existing engine vendoring header format | every vendored-at-pin file's first 6 lines (e.g., `engine/core.ts:1-6` per the manifest's "Per-file vendored header format" subsection) | Preserved through `git mv` |
| Vendored test file (`betting-e-process-class-dispatch.test.ts`) | `test/betting-e-process-class-dispatch.test.ts:1-6` (vendoring header) | STAYS at tessera/test/ per manifest disposition (test file location; not engine surface) |
| Tessera root `package.json` | `package.json:1-25` (full file) | Verified pre-edit at session entry; `private: true` at line 6 |
| `.gitignore` engine-build patterns | `.gitignore:6-8` (`*.js`, `*.js.map`, `dist/`) | Verified |
| Existing `engine/types/verdict.ts` post-R56 schema | `engine/types/verdict.ts:249-269` (TopologyNode + TopologyEdge + TopologySnapshot declarations) | Vendored-with-deltas; STAYS at tessera tree |

---

## § 9 Coordinator + cluster context

Cluster shape: single-cluster Wave 9 per WAVE-PLAN-09. No multi-cluster D5 conflict at R61. R63 Wave 10 (WU-3B + WU-3C parallel-fan-out) depends on R61's package contract.

The CLUSTER-HANDOFF-WAVE10-3A-3B and CLUSTER-HANDOFF-WAVE10-3A-3C artifacts emit at WAVE-GATE-09 close (post-R61), per the established Coordinator handoff-at-target-dispatch convention. R61's substantive deliverable (`@johnpatrickwarren-oss/deploysignal-engine` package + Tessera-side consumption) IS the npm package contract that WU-3B + WU-3C will consume.

The directive operator-decision flags (NEXT-ROLE.md lines 125-134) are preserved unchanged by R61; this round addresses #5 in-progress.
