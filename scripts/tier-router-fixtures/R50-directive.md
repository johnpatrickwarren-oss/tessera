## § R50 Round-scope directive (audit-tier — parallel-execution levers)

**Deliverable:** Add parallel-execution control levers to run-pipeline.sh: --parallel flag for concurrent role stages where safe, worker-pool sizing, result aggregation.

**Tier rationale:** audit — S1 (direct extension of R49 pipeline tooling pattern), S3 (single bounded scope: parallel-execution flag); no A-factors present.

**ALLOWED modifications:**
- run-pipeline.sh (--parallel flag + worker-pool logic)
- coordination/specs/Q-R50-SPEC.md (spec)
- test/q50-parallel-execution.test.ts (new)

**Pipeline invocation:**
```bash
./run-pipeline.sh --round R50 --tier audit
```
