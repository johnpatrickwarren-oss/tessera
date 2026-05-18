CURRENT-ROUND: R29
NEXT-ROLE: IMPLEMENTER
STATUS: READY

## Inputs for next role
- coordination/specs/Q-R29-SPEC.md (Architect commit A: 4d44ef7; 833 lines)
- coordination/CLUSTER-HANDOFF-1-WU00-WU02.md (Wave 1 → Wave 2 interface contract)
- coordination/PRD.md (cluster scope WU-02 K8S-ADAPTER block)

## Architect spec-commit sequence (R21 ARCH MINOR-1)
- Architect-commit-A: 4d44ef7 (spec + audit sidecar; landed BEFORE this routing block)
- Architect-commit-B: this commit (NEXT-ROLE.md routing + MEMORIAL.md ceremony append)

## Round-start SHA (R15 reinforcement; R29 baseline for anti-scope checks)
- ROUND-START-SHA: e714703 (commit immediately before Architect work began; "R29 routing: cluster wu-02-k8s-adapter")
- Implementer's anti-scope round-start-to-chore-A diff baseline is e714703

## Empirical baseline at session start (R25 MINOR-1 / R26 MAJOR-1 reinforcements)
- node --test --test-reporter=tap test/*.test.js → tests=243 / pass=241 / fail=2 / skipped=0
- The 2 failures are pre-existing environmental:
  - q01-no-at-pin-deltas AC-7: ENOENT '../deploysignal/engine/detectors/_linalg.ts' (DS sibling absent in cluster worktree)
  - q-md-f4 AC-R26-16: "post-chore-A modification outside allowed-set: CLAUDE-ARCHITECT.md" (R26 forward-protection over-scoped to post-R26 Memorial-Updater accretion; pre-existing across this cluster's main-derived branch)
- npx tsc -p tsconfig.test.json → exit 2; diagnostics {TS2688 (`@types/node` missing), TS5107 (moduleResolution=node10 deprecation)} — both pre-existing infra
- Encoded throughout spec (NOT inherited from CLUSTER-HANDOFF prediction of 230/229/1, which was empirically refuted at session start)

## Implementer commit sequence prescription (spec § 2.7 + R23 TDD)
1. RED commit: test/q29-k8s-adapter.test.ts stub bodies (assert.fail or imports from not-yet-created module); production file engine/topology/k8s-source.ts NOT yet created; substrate fixture JSON files NOT yet created (or empty stubs). All 12 new tests fail; pre-existing 2 env failures unchanged.
2. GREEN commit (= chore-A): full engine/topology/k8s-source.ts + 4 substrate fixture JSON files + complete bodies for AC-R29-1..12 in q29 test file + this round's NEXT-ROLE.md attestation block + MEMORIAL.md Implementer ceremony append. All 12 new tests pass; 243 → 255 / 241 → 253 / 2 unchanged. Chore-A SHA = this commit.
3. chore-B commit: append AC-R29-13 forward-protection runtime test to q29 file with the actual chore-A SHA substituted as literal. Uses execFileSync (NOT execSync per R26 MINOR-1).

## Halt conditions (spec § 7.1; each prescribes DIAGNOSTIC + ESCALATE, NOT silent reframe)
- (a) tsc emits diagnostic codes other than {TS2688, TS5107} OR exits non-2 at chore-A
- (b) filtered node --test on pre-R29 files at chore-A reports counts other than 243/241/2
- (c) Any AC-R29-1..10 produces output conflicting with spec § 4.2 Then text
- (d) Spec files missing from round-start-to-chore-A diff range
- (e) Any file outside 10-entry allowed-set (+DIAGNOSTIC regex) appears in round-start-to-chore-A diff
- (f) TopologyNode.kind / TopologyEdge.relationship literal needed beyond existing union (PRD halt #2)
- (g) engine/topology-overlay.ts body modification appears load-bearing (PRD halt #1)

Per CROSS-PROJECT-MEMORIAL.md REINFORCED 2026-05-18 (R26 false-compliance-attestation derived rule): do NOT reframe failing binding-command output as compliance. The AC literals encode actual environment reality (tsc exit 2 + 2 pre-existing failures); any drift from that reality is HALT, not absorb-and-attest.

## Escalation items
(none — no open architectural questions; all 5 architectural sub-decisions resolved in spec § 1)

## Routing notes
(none)
