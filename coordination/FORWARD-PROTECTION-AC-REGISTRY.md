# Forward-Protection AC Registry

_Populated at R93 (2026-05-21). Each entry records an AC or script that scans the working tree for a forbidden pattern. Consult this registry at spec-emit time (R86 prophylactic walk discipline)._

> **Purpose:** When prescribing a new test file or test pattern (especially subprocess-spawn, file-write, or network-call patterns), Architect walks this registry and identifies any AC that would trigger on the new pattern. If a match exists, the spec MUST include the required carve-out amendment in the same component inventory (§ 2/3).

---

## Registry entries

### Entry 1 — AC-R36-3 (DROPPED at R93; replaced by hook)

| Field | Value |
|---|---|
| **AC ID** | AC-R36-3 |
| **Status** | Dropped at R93; replaced by `scripts/check-no-execfilesync-spawn.sh` |
| **Original file:line** | `test/q36-phase2-close-walk.test.ts:72` (pre-R93) |
| **What it scanned** | All `test/q*.test.ts` for pattern `execFileSync\s*\(\s*['"]node['"]` |
| **Carve-out list (at drop)** | q29-k8s-adapter.test.ts, q34-event-conditional-attribution.test.ts, q36-phase2-close-walk.test.ts (self), q91-engine-package-consumption.test.ts |
| **Last flip date** | 2026-05-21 (R91 ESCALATE — q91 added; second flip in Phase 5) |
| **Flip history** | R87 ESCALATE (1st flip); R91 ESCALATE (2nd flip) — two flips crossed structural-fragility threshold per Q-R93-SPEC.md § 1 |
| **Replacement** | `scripts/check-no-execfilesync-spawn.sh` (pre-commit WARN via finalize-round.sh Step 7c). Approved list: q29, q34, q91. q36 removed from list (q36 no longer uses the pattern post-R93 drop). |

---

### Entry 2 — `scripts/check-no-execfilesync-spawn.sh` (ACTIVE from R93)

| Field | Value |
|---|---|
| **AC ID** | n/a (pre-commit script, not a test AC) |
| **Status** | Active from R93 |
| **File** | `scripts/check-no-execfilesync-spawn.sh` |
| **What it scans** | All `test/q*.test.ts` for pattern `execFileSync\s*\(\s*['"]node['"]` |
| **Approved carve-out list** | q29-k8s-adapter.test.ts, q34-event-conditional-attribution.test.ts, q91-engine-package-consumption.test.ts |
| **Invocation** | Non-blocking WARN via `scripts/finalize-round.sh` Step 7c |
| **Adding a carve-out** | Edit APPROVED list in `scripts/check-no-execfilesync-spawn.sh` and document rationale in git commit message. No test file or ESCALATE required. |
| **Last updated** | 2026-05-21 (R93) |

---

### Entry 3 — AC-R29-12 (ACTIVE)

| Field | Value |
|---|---|
| **AC ID** | AC-R29-12 |
| **Status** | Active |
| **File:line** | `test/q29-k8s-adapter.test.ts` (subprocess test-count; see AC-R29-13 for SHA pin) |
| **What it does** | Launches `node --test --test-reporter=tap` as subprocess to count tests. Skips when `NODE_TEST_CONTEXT` or `NODE_TEST_WORKER_ID` is set (worker-context guard). |
| **Forward-protection pattern** | Uses `execFileSync` with 'node' — legitimately approved (skip guard prevents transitive hang) |
| **Carve-out in hook** | q29-k8s-adapter.test.ts in `scripts/check-no-execfilesync-spawn.sh` |
| **Carve-out in old AC-R36-3** | Approved at R36 origin |

---

### Entry 4 — AC-R34-19 (ACTIVE)

| Field | Value |
|---|---|
| **AC ID** | AC-R34-19 |
| **Status** | Active |
| **File:line** | `test/q34-event-conditional-attribution.test.ts` (subprocess test-count; see AC-R34-21 skip guard) |
| **What it does** | Launches `node --test --test-reporter=tap` as subprocess to count tests. Guarded by NODE_TEST_CONTEXT / NODE_TEST_WORKER_ID skip. |
| **Forward-protection pattern** | Uses `execFileSync` with 'node' — legitimately approved (skip guard prevents transitive hang) |
| **Carve-out in hook** | q34-event-conditional-attribution.test.ts in `scripts/check-no-execfilesync-spawn.sh` |
| **Carve-out in old AC-R36-3** | Approved at R36 origin |

---

### Entry 5 — AC-R91-7 (ACTIVE)

| Field | Value |
|---|---|
| **AC ID** | AC-R91-7 |
| **Status** | Active |
| **File:line** | `test/q91-engine-package-consumption.test.ts` |
| **What it does** | Uses `execFileSync` with 'node' and `-e` flag to verify subpath-export resolution (`require.resolve`) works against the built engine package. |
| **Forward-protection pattern** | Uses `execFileSync` with 'node' — legitimately approved (single-shot `node -e` resolve check, not a subprocess test-runner) |
| **Carve-out in hook** | q91-engine-package-consumption.test.ts in `scripts/check-no-execfilesync-spawn.sh` |
| **Carve-out in old AC-R36-3** | Added R91 ESCALATE Option A (2nd flip triggering R93 redesign) |

---

### Entry 6 — AC-R36-4 (ACTIVE)

| Field | Value |
|---|---|
| **AC ID** | AC-R36-4 |
| **Status** | Active |
| **File:line** | `test/q36-phase2-close-walk.test.ts:97` |
| **What it scans** | Verifies that q29/q32/q34 forward-protection tests use pinned SHAs or fixed allowed-sets |
| **What it does** | Reads q29, q32, q34 test files and asserts SHA-pin constants or allowed-set constants are present |
| **Forward-protection pattern** | Not a subprocess-spawn guard; scans for SHA constant presence |
| **Carve-out list** | n/a |
| **Last updated** | R36 origin; still active |

---

### Entry 7 — AC-R77-16 (ACTIVE)

| Field | Value |
|---|---|
| **AC ID** | AC-R77-16 |
| **Status** | Active |
| **File:line** | `test/q77-detector-envelope.test.ts` |
| **What it does** | Verifies test count after detector-envelope implementation. Uses `spawnSync('node', ...)` (not `execFileSync`) so does NOT trigger the subprocess-spawn hook. |
| **Forward-protection pattern** | Uses `spawnSync` not `execFileSync` — excluded from hook scope |
| **Note** | Listed for completeness: `spawnSync` is a different API; the hook only guards `execFileSync`. If a future round uses `spawnSync` for subprocess test-runner invocations, a separate guard may be needed. |

---

## How to use this registry at spec-emit time (R86 prophylactic walk)

1. Run: `grep -l 'readdirSync\|readFileSync.*test' test/` to find test files that scan other test files
2. Review this registry for any AC matching the pattern your new test file introduces
3. If a match exists → spec MUST include the carve-out amendment in component inventory § 2/3
4. If adding a new subprocess-spawn test (`execFileSync` with 'node') → add to `scripts/check-no-execfilesync-spawn.sh` APPROVED list AND document here

_Registry maintained by: Implementer (during implementation). Updated at: R93 (2026-05-21)._
