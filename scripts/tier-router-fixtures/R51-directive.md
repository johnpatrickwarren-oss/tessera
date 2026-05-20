## § R51 Round-scope directive (audit-tier — CLAUDE-IMPLEMENTER.md MR-2 Pass-3 redux + MU re-accretion guard)

**Deliverable:** MR-2 Pass-3 redux: consolidate CLAUDE-IMPLEMENTER.md reinforcements from 44 entries to 30 via thematic merging. Add MU re-accretion guard test to prevent future unbounded growth.

**Tier rationale:** audit — S4 (tactical follow-up to R43 MR-2 consolidation), S5 (tech-debt with empirical investigation: count entries, identify mergeable themes); no A-factors present.

**ALLOWED modifications:**
- CLAUDE-IMPLEMENTER.md (reinforcement redux: 44→30 entries)
- test/q51-mu-reaccretion-guard.test.ts (new: forward-protection test)
- coordination/specs/Q-R51-SPEC.md (spec)

**Pipeline invocation:**
```bash
./run-pipeline.sh --round R51 --tier audit
```
