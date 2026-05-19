# ANCHOR-BACKFLOW-2026-05-18.md
# Tessera → Anchor Canonical Backflow Candidates
# Compiled at Phase 2 close-walk (R36, 2026-05-18).
#
# Each section below is an operator-scheduled PR candidate. Sections 1–4 address
# the subprocess-node-test transitive hang class (STAGED Item 3). Section 5 is
# the Tailscale Phase 3 capability extension pointer (STAGED Item 4). Section 6
# is the Coordinator memorial graduation entry.
#
# Format: proposed prose changes OR unified diffs against `anchor/` canonical
# paths. Operator schedules actual PR submission. These are CONTENT artifacts;
# they do not execute any code.

---

## § 1 — Subprocess spawn inside test suite: pre-emit grilling rule

**Target file:** `anchor/skills/01-pre-emit-grilling.md` (or equivalent Architect discipline file)

**Motivation:** Tessera R34 incident (2026-05-18): `test/q29-k8s-adapter.test.ts` spawns
`execFileSync('node', ['--test', ...])` with an env-strip to avoid direct self-recursion.
When the Reviewer ran `node --test test/*.test.js`, q29 ran as a worker; its child node-test
deadlocked because transitive recursion is not prevented by env-strip alone. Pipeline hung
4+ hours with no warning. Same pattern propagated to q34 at R34 without detection.

**Proposed addition** (insert under "Integration point failure modes" or equivalent):

```
### Anti-pattern: `node --test` spawn from within a test file

ANY test file that spawns `node --test` on the project suite (even with self-exclusion
filters + env-strip) creates a transitive hang risk when that file itself runs inside
another `node --test --test-isolation=process` invocation. The env-strip prevents
direct self-recursion (file inside itself) but NOT transitive recursion (parent worker
invokes file; file invokes child node-test; child inherits isolation state that deadlocks).

**Architect must either:**
1. Move the subprocess invocation outside the test suite — e.g., a sibling script
   `scripts/verify-count.sh` invoked from the Reviewer's binding-command discipline,
   not from within `node --test test/*.test.ts`.
2. Mark the test with a worker-context skip guard:
   ```javascript
   if (process.env.NODE_TEST_CONTEXT || process.env.NODE_TEST_WORKER_ID) {
     t.skip('subprocess-spawn skipped in worker context — transitive hang risk');
     return;
   }
   ```
   AND document this as a frozen historical check (not live forward protection) per
   the REINFORCED 2026-05-17 R19 MAJOR-3 discipline.

**Existing R29 MINOR-3 reinforcement** (`env: subEnv` strip) is insufficient for
transitive cases; it handles the sibling self-reference path only.

**Spec template add (anti-scope clause):** When a spec includes an AC that spawns
`node --test` (e.g., AC-RNN-NN test-count verification), the spec MUST enumerate:
- The failure mode: "this AC will deadlock if the test suite runs under
  `--test-isolation=process` (or any parent `node --test` invocation)"
- The mitigation: skip guard + worker-context env check OR move to external script.
```

---

## § 2 — Pipeline watchdog for hung role sessions

**Target file:** `anchor/integrations/superpowers-claude-code/run-pipeline.sh`

**Motivation:** R34 incident: pipeline shell alive 4+ hours; Implementer hung at 5:19 PM
(transitive test deadlock); no warning surfaced; operator discovered the hang manually.

**Proposed addition** (insert near the per-role session invocation loop):

```bash
# ── Role-session watchdog ──────────────────────────────────────────────────────
# Detects a hung role session (no new output to $role_log for WATCHDOG_IDLE_MIN minutes).
# Default: 30 minutes idle threshold.
WATCHDOG_IDLE_MIN="${WATCHDOG_IDLE_MIN:-30}"

_watchdog_check() {
  local log_file="$1"
  local pid="$2"
  # Check if the process is still running
  if ! kill -0 "$pid" 2>/dev/null; then return 0; fi  # already exited
  # Check time since last log modification
  local last_mod idle_seconds
  last_mod=$(stat -f %m "$log_file" 2>/dev/null || stat -c %Y "$log_file" 2>/dev/null || echo 0)
  idle_seconds=$(( $(date +%s) - last_mod ))
  if (( idle_seconds > WATCHDOG_IDLE_MIN * 60 )); then
    echo "[WATCHDOG] WARNING: role session $pid idle for ${idle_seconds}s (>${WATCHDOG_IDLE_MIN}m)." >&2
    echo "[WATCHDOG] Log tail:" >&2
    tail -5 "$log_file" >&2
    echo "[WATCHDOG] Options: (k)ill + retry, (a)dvance to next role, (e)scalate, (c)ontinue waiting" >&2
    read -t 60 -r watchdog_choice || watchdog_choice="e"
    case "$watchdog_choice" in
      k) kill -TERM "$pid"; wait "$pid" 2>/dev/null; return 1 ;;  # kill + signal retry
      a) kill -TERM "$pid"; wait "$pid" 2>/dev/null; return 2 ;;  # kill + advance
      e) kill -TERM "$pid"; wait "$pid" 2>/dev/null; return 3 ;;  # kill + escalate
      *) echo "[WATCHDOG] Continuing; will check again in ${WATCHDOG_IDLE_MIN}m." ;;
    esac
  fi
  return 0
}
# Usage: call _watchdog_check "$ROLE_LOG" "$ROLE_PID" in a background poll loop
# while the role session runs.
```

**Operator note:** The watchdog above requires a background polling loop wrapping the
role-session execution. The implementation is environment-specific (`stat` syntax varies
between macOS and Linux); adjust for target OS. The poll interval should be
`WATCHDOG_IDLE_MIN / 2` minutes.

---

## § 3 — Bash-tool orphan reaping on timeout

**Target file:** `anchor/integrations/superpowers-claude-code/` (Bash-tool integration docs or
wrapper script)

**Motivation:** R34 incident left 2–3 orphan `node --test` processes running for hours after
Bash-tool timeout. The Bash tool times out (default 120s) and the wrapper shell exits, but
child processes spawned by the test file survive as orphans, holding CPU + file handles.

**Proposed prose** (Bash-tool integration README or operator guide):

```markdown
### Orphan reaping on Bash-tool timeout

When the Bash tool times out (default 120 s), the immediate shell process is killed but
**child processes survive as orphans**. This is especially acute for `node --test`
invocations that spawn their own worker pool.

**Mitigation options (choose one per project):**

**Option A — `setsid` + process-group SIGTERM:**
Wrap the Bash tool invocation in a process group:
```bash
setsid bash -c "..."  # all children share a new session
# On timeout: kill -TERM -<pgid> sends SIGTERM to the full process group
```
This requires a thin shell wrapper that stores `$BASHPID` and terminates the group on
timeout.

**Option B — explicit child cleanup in test helpers:**
For known long-running subprocess invocations (e.g., test-count verification that spawns
`node --test`), wrap in a try/finally that kills the child PID:
```javascript
let child;
try {
  child = spawn('node', ['--test', ...]);
  // ...
} finally {
  if (child && !child.killed) child.kill('SIGTERM');
}
```

**Option C — move subprocess invocations outside test files** (preferred per § 1 above):
If the subprocess is only needed for verification (count check), move it to an external
script called from the Reviewer/Implementer binding-command step, not from within the test
suite. This eliminates the hang surface entirely.

The R34 Tessera incident recommends Option C as the primary mitigation; Options A and B as
defense-in-depth for cases where a subprocess must remain in the test file.
```

---

## § 4 — Test-isolation failure-mode documentation in spec template

**Target file:** `anchor/templates/SPEC-TEMPLATE.md` (or equivalent spec authoring template)

**Motivation:** R29 spec did not anticipate the `--test-isolation=process` deadlock; the
pattern silently propagated to R34. A single spec-template addition would have caught both.

**Proposed addition** (insert in the § Failure modes section template, or as a mandatory
check in § Pre-emit grilling):

```markdown
### Required: subprocess hang risk enumeration

For every AC that invokes a subprocess from within a test file (e.g., spawning `node`,
`npx`, `python`, or other process via `execFileSync`, `spawn`, `exec`), the spec MUST
enumerate in the AC's design notes:

1. **Hang risk:** "This AC will hang/deadlock if the test suite is run under
   `node --test --test-isolation=process` or any parent test runner that maps each test
   file to a worker process. The subprocess spawn creates a transitive recursion."
2. **Mitigation chosen:** one of:
   - Worker-context skip guard (`NODE_TEST_CONTEXT || NODE_TEST_WORKER_ID` check)
   - Subprocess moved to external script
   - Other (document rationale)

**Pre-emit grilling gate:** Before emitting the spec, grep the AC table for
`execFileSync.*node\|execSync.*node\|spawn.*node`. For each match, verify the hang-risk
and mitigation are documented.

**ALLOWED_SET note:** If a skip guard is added, the test is no longer a live forward-
protection check when run as a worker; it becomes a standalone-only check. Document
this in the AC as a "frozen check" per REINFORCED 2026-05-17 R19 MAJOR-3.
```

---

## § 5 — Tailscale Phase 3 remote-execution capability pointer

**Source:** Tessera `coordination/STAGED-FOR-PHASE-2-CLOSE.md` Item 4 (2026-05-18).

**Operator authorization:** OQ-W4-2 default A — defer to MR-3 candidate; NOT in WU-07.

**Capability summary:** Operator has a Mac mini (M4 Pro, 64 GB RAM) accessible via
Tailscale. Phase 3 + beyond use cases:

- Multi-cluster parallel Wave execution without local CPU contention
  (Wave 2 had 3 parallel clusters; future Phase 3 waves may need more)
- PR-F5-class storage/perf benchmarks at scale (current v9X/v9Y substrates are small)
- Background CI-style full-suite verification running on remote while local stays interactive
- Larger N synthetic cluster substrate testing

**Where remote execution does NOT help:**
- Anthropic API rate limits (shared account; remote machine shares the limit)
- Methodology-level role discipline (Claude-sided, not compute-sided)
- Structural infinite loops in test code (more compute does not unblock logical deadlock)

**Setup magnitude (rough):** 1–2 methodology rounds of work (~MR-1 magnitude).
Components needed:
- `coordination/remote-config.json` (Tailscale endpoint; SSH key paths; remote workdir)
- `scripts/run-pipeline-remote.sh`: sync repo → ssh invoke → pull results → cleanup
- Cleanup discipline (remote artifact lifecycle; cluster-worktree directories on mini)
- Wave-merge handling for results produced on remote (multi-track-verify-wave-merge.sh
  currently assumes same-machine git operations)
- Documentation: when-to-use-remote vs when-to-stay-local decision matrix

**Anchor backflow potential:** If implemented well in Tessera, the `--remote` flag for
Coordinator + cluster dispatch could land in anchor canonical as a multi-track-execution
capability extension. The Coordinator role already has a conceptually multi-machine-ready
architecture; implementation needs the plumbing only.

**Phase 3 entry condition:** Separate operator authorization required. Tessera Phase 2
HARD STOP in effect until operator lifts it. See `coordination/PHASE-2-CLOSE-WALK.md` § 3.

---

## § 6 — Coordinator memorial graduation entry

**Context:** Phase 2 was the first Tessera deployment of the multi-cluster Coordinator
pattern (MR-1 vendored at Wave 1, 2026-05-18). Five waves executed across R20–R36.

### Graduation finding: Coordinator pattern PROVEN at Tessera scale

**What worked across Waves 1–5:**

| Wave | Clusters | Pattern validated |
|---|---|---|
| Wave 1 | 4 clusters (WU-01/02/03/04) | Fan-out with clean independence; D1-D5 pairwise checks correct |
| Wave 2 | 1 cluster (WU-05.A) | Sequential after WU-03 dependency; D1 HIGH edge correct |
| Wave 3 | 1 cluster (WU-05.B/C + WU-06.A) | Multi-stage handoff with cross-cluster CLUSTER-HANDOFF artifacts |
| Wave 4 | 1 cluster (WU-06.B + WU-07 scoping) | STAGED artifact pattern for cross-wave state |
| Wave 5 | 1 cluster (WU-07 close-walk) | HARD STOP gate + Phase 2 close |

**Key confirmations from `coordination/COORDINATOR-MEMORIAL.md`:**
- `dag-construction-discipline`: 0 invented WUs across all 5 waves; every WU traceable to SCOPING-MEMO FR-E3 row or explicit operator amendment
- `dependency-edge-classification`: D1–D5 pairwise checks surfaced zero false-independence classifications; asymmetric edge confidence (HIGH vs MEDIUM) recorded honestly and validated
- `fan-out-vs-sequential-judgment`: Operator R24 directive ("prefer fan-out when independence is clean") applied correctly; collapsed to sequential when D-tests showed dependency
- `pre-emit-grilling`: All 6 grilling checklist items addressed inline in wave plans (not kept internal); adversarial notes added beyond checklist at each gate

**Notable friction surface (anchor-canonical PR candidate):**
- **ALLOWED_SET operator-commit class gap** (R25/R29/R34 — 3 occurrences): Operator commits
  to coordination-tier durable artifacts (STAGED-FOR-PHASE-2-CLOSE.md, WAVE-PLAN-NN.md,
  WAVE-GATE-NN.md, CLUSTER-HANDOFF files) can land at any point in the round pipeline,
  including between STATUS=READY and Reviewer execution. ALLOWED_SET completeness pass must
  explicitly enumerate this class. `coordination/SPEC-AUTHORING-CHECKLIST.md` codifies the fix.

**Graduation recommendation:** Coordinator pattern is READY for anchor canonical inclusion
as a full methodology extension. The WAVE-PLAN / WAVE-GATE / COORDINATOR-MEMORIAL trio
provides the audit-trail infrastructure. The 14 friction surfaces catalogued in
`coordination/PHASE-2-CLOSE-WALK.md` § 2 are recommended as input to the anchor canonical
`METHODOLOGY.md` "known friction" section.

**Proposed COORDINATOR-MEMORIAL.md entry** (Implementer stages; Memorial-Updater applies):

```
CONFIRMATION: `dag-construction-discipline` | All 5 waves executed with zero invented WUs;
  every WU traceable to SCOPING-MEMO row or operator amendment. Coordinator graduation
  milestone reached at Phase 2 close (R36). | Wave 5 gate | Coordinator
CONFIRMATION: `pattern-graduation` | Multi-cluster Coordinator pattern (MR-1 vendored)
  proven across 4 fan-out clusters (Wave 1) + 4 sequential single-cluster waves (2-5).
  D1-D5 pairwise checks + CLUSTER-HANDOFF artifacts + STAGED pattern all validated.
  Anchor canonical inclusion recommended. | Wave 5 gate | Coordinator
```

---

_Operator action items:_
- _§ 1–4: Schedule anchor canonical PRs per operator judgment on timing_
- _§ 5: Authorize Tailscale Phase 3 MR-3 candidate when Phase 3 re-opens_
- _§ 6: Append COORDINATOR-MEMORIAL.md entries per CLUSTER-HANDOFF-4 routing at Wave 5 gate_
- _§ 7: Stage as backflow candidate after Tessera MR-3 empirical validation + 2nd-project occurrence_

---

## § 7 — Memorial sharding: scaling discipline for monotonic memorial growth (DEFERRED to 3+ occurrence threshold)

**Surfaced:** Operator 2026-05-19 post-R41 hygiene close ("how big are our docs now that have to be read each round?"). See `coordination/PHASE-3-CANDIDATES-PRELIMINARY.md` § 5.5 for full Tessera-internal candidate strategies + sequencing.

**The universal problem (anchor-canonical-worthy):**

Memorial files grow monotonically by design (the "do not delete prior reinforcements; accumulated history is the compounding value" constraint in `CLAUDE.md`). At sufficient project scale:
- `coordination/MEMORIAL.md` grows ~50-100 lines per round
- `~/.claude/CROSS-PROJECT-MEMORIAL.md` grows when cross-project rules derive
- Architect + Reviewer roles read BOTH files at every round

Tessera at Phase 2 close: MEMORIAL.md = 3,153 lines; CROSS-PROJECT-MEMORIAL.md = 3,599 lines. Combined ~6,750 lines per Architect/Reviewer session. Phase 3 round volume (estimated 30-50 rounds across 8 candidate categories per PHASE-3-CANDIDATES) would add ~2,250-3,750 more lines to MEMORIAL alone. Per-round read cost would double.

**This is universal to anchor**, not Tessera-specific. Any sufficiently-long anchor project hits it.

**Five candidate strategies (per PHASE-3-CANDIDATES § 5.5):**
- (a) Phase-N sharding — `MEMORIAL-PHASE-N.md` per phase; Architect reads current-phase by default
- (b) Age-based archive — `archive/MEMORIAL-YYYY-Q.md` for entries >N days
- (c) Composite-stamp summarization — periodic Coordinator summary rounds
- (d) Index-and-lazy-load — 1-line-per-entry index + per-round detail files
- (e) Cross-project memorial separate treatment — shard the canonical by derivation date

**Why this is staged as backflow candidate (NOT yet anchor canonical):**

This very Tessera session derived **Rule 7 (`derived-rule-propagation-mechanism-required`)** specifically because the project observed rules being derived from single-project evidence without empirical multi-project validation. Memorial-sharding canonical-landing without empirical proof would be exactly the pattern Rule 7 warns against.

**The 3+ occurrence threshold pattern (Rules 5-7) applies here:**

1. **Tessera MR-3 (Phase 3 entry; recommended next-session work):** implement strategy (a) Phase-N sharding in Tessera; validate per-round read-cost reduction empirically; record results in COORDINATOR-MEMORIAL with measured numbers.
2. **2nd anchor-using project surfaces the same scaling problem:** that becomes the cross-project pattern crossing the 3+ threshold for canonical landing (Tessera scale + 2nd project ≥ 3 occurrences).
3. **Land as anchor canonical:** at that point, the canonicalization includes (a) recognition of the universal problem in METHODOLOGY.md "scaling discipline" section, (b) decision tree of strategies a-e with when-to-use guidance (Phase-N for phase-structured projects; age-based for time-structured; etc.), (c) reference implementation pointer to Tessera MR-3 if validated.

**What does NOT belong as anchor canonical (yet):**
- A specific sharding mechanism mandated for all projects (Phase-N assumes "phases"; not all anchor projects have phases)
- A specific threshold value (1500 lines is Tessera-heuristic; per-project growth rates vary)
- A specific tool script (`consolidate-reinforcements.sh` precedent is good but each strategy needs its own tooling)

**What DOES belong (after empirical validation):**
- Methodology recognition: "memorial scaling is a real problem at sufficient project scale; track per-round read cost; trigger sharding/consolidation round when cost crosses operator-set threshold"
- Decision tree of strategies (a)-(e) with when-to-use heuristics
- Reference implementation pointer

**Operator next-session action items for this entry:**
1. Authorize Tessera MR-3 (Phase 3 entry; strategy (a) Phase-N sharding; ~1 round of work; immediate per-round read-cost reduction; reversible)
2. After MR-3 empirical results: append measured numbers (line count reduction; per-session token savings) to this § 7 + COORDINATOR-MEMORIAL
3. Defer anchor canonical PR until 2nd anchor-using project surfaces the same scaling problem (per Rule 7 derived-rule-propagation discipline)
