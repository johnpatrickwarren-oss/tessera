# Phase 5 SLICE 3 Close Walk

_Precedent: R37 (Phase 1 close), R66 (Phase 4 SLICE 1 close). Pattern: document what shipped, what was deferred, and what hygiene landed._

**SLICE 3 status: CLOSED (R90 + R91 shipped; R92 deferred; R93 hygiene landed)**

---

## § 1. What shipped in SLICE 3

### R90 — Engine extraction + standalone package (2026-05-21)

**Commit:** `95dbcdf`
**Purpose:** Extract the vendored engine subset from `src/` into a standalone `engine/` package that can be consumed as a proper npm dependency, both from within Tessera and (eventually) from external repos.
**Key deliverables:**
- `engine/` directory with its own `package.json`, `tsconfig.json`, and build output
- `engine/index.ts` re-exports all public engine primitives
- `tsconfig.json` workspace path mapping so `engine` resolves as an alias within the Tessera project
- Anti-scope: `src/` engine imports remain unchanged (no breaking refactor)

**Status at R90 close:** 0 CRITICAL / 0 MAJOR / 0 MINOR. MERGE-READY.

---

### R91 — Tessera-internal engine package consumption (2026-05-21)

**Commit:** `9656eb4`
**Purpose:** Flip Tessera's internal `src/` imports from direct engine file paths to the new `engine` package alias, exercising the R90 extraction end-to-end. Validates that the package boundary is clean and that downstream consumers can import from `engine` without knowing internal file structure.
**Key deliverables:**
- All `src/` files updated from `../../engine/foo` to `engine/foo` imports
- `test/q91-engine-package-consumption.test.ts` (AC-R91-7: subpath-export resolution; AC-R91-8: package.json exports shape)
- Pre-existing carry-forward fails unchanged; test count +7

**Mid-round ESCALATE (R91):** q91 test uses `execFileSync` with 'node' — triggered AC-R36-3 (forward-protection). Operator Option A: add q91 to AC-R36-3 carve-out list (commit `b7b0193`). This was the second flip of AC-R36-3 in Phase 5 (first was R87), crossing the structural-fragility threshold and motivating R93 redesign.

**Status at R91 close:** 0 CRITICAL / 0 MAJOR / 0 MINOR (one ESCALATE resolved inline). MERGE-READY.

---

## § 2. What was deferred from SLICE 3

### R92 — DS-side engine package consumption (DEFERRED)

**Deferred reason:** R92 would update the DS (DeploySignal) repo to consume the engine package from Tessera's published npm artifact rather than vendoring the engine files directly. This requires:
1. A published (or locally-linked) Tessera engine package — not yet published to npm as of R93
2. Coordination with the DS-Anvil branch (WIP in the DS repo) — branch not yet in a stable merge state
3. A DS pipeline integration point — the Tessera pipeline doesn't currently have access to the DS repo (cross-repo PR would be needed)
4. Architectural clarity on DS engine architecture (multi-source vs. single-source)

**Decision record:** Operator-coordinated deferral. R92 is not cancelled — it remains the natural next step after Tessera publishes its engine package. The deferral is a sequencing decision (DS readiness gate), not a scope reduction.

**Memorial entry:** See `coordination/MEMORIAL.md` R92 deferral pointer entry.

**When to re-engage:** When (a) `engine/` package is published to npm or linked in DS package.json AND (b) DS-Anvil branch is stable and merging is unblocked.

---

## § 3. Hygiene landed at R93

### R93 — Phase 5 SLICE 3 close + hygiene (2026-05-21)

**Purpose:** Close the SLICE with methodology-debt items surfaced during R87–R91.
**Motivation:** Three debt items required resolution before Phase 5 can advance:
1. AC-R36-3 flipped twice in Phase 5 (R87 + R91) — forward-protection-AC-as-tripwire is structurally fragile
2. Spec-side fail-count-band derivation is incomplete (R91 MAJOR-4 lesson)
3. No Architect-side forward-protection AC registry exists (R91 watch-list)

**Deliverables at R93:**
- **AC-R36-3 dropped** from `test/q36-phase2-close-walk.test.ts` (Approach A: Drop + pre-commit hook)
- **`scripts/check-no-execfilesync-spawn.sh`** created (non-blocking WARN via finalize-round.sh Step 7c)
- **`coordination/FORWARD-PROTECTION-AC-REGISTRY.md`** created (7 entries)
- **`coordination/SPEC-AUTHORING-CHECKLIST.md`** extended with fail-set enumeration gate + forward-protection-walk gate
- **`test/q93-slice3-close-hygiene.test.ts`** (8 ACs verifying all R93 deliverables)
- **This file** (`coordination/PHASE-5-SLICE-3-CLOSE-WALK.md`)

---

## § 4. Phase 5 SLICE 3 test count trajectory

| Round | SHA | Tests | Pass | Fail | Skip | Note |
|---|---|---|---|---|---|---|
| SLICE 3 start (pre-R90) | pre-`95dbcdf` | 731 | ~707 | 20 | 4 | carry-forward 20 |
| R90 close | `95dbcdf` | 731 | ~707 | 20 | 4 | no new tests |
| R91 close | `9656eb4` | 738 | 714 | 20 | 4 | +7 (q91 ACs) |
| R93 close | (this round) | 745 | 720–722 | 19–21 | 4 | +8 (q93) −1 (AC-R36-3 dropped); stochastic AC-R84-14 ±1 |

---

## § 5. Forward references

- Next SLICE 4 (or next Phase 5 substantive round): DS-side R92 (when DS-Anvil is stable + engine published)
- Forward-protection registry: `coordination/FORWARD-PROTECTION-AC-REGISTRY.md`
- Fail-set enumeration gate: `coordination/SPEC-AUTHORING-CHECKLIST.md § Fail-set enumeration gate`
- Hook script: `scripts/check-no-execfilesync-spawn.sh`
