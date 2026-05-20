## § R49 Round-scope directive (audit-tier — pipeline-mandatory methodology discipline)

**Deliverable:** Enforce methodology discipline in run-pipeline.sh: mandatory pre-commit EMPIRICAL.sh run, binding-command exit-code capture, NEXT-ROLE.md attestation schema validation.

**Tier rationale:** audit — S1 (direct extension of R48 pipeline tooling pattern), S3 (single bounded scope: pipeline enforcement hooks); no A-factors present.

**ALLOWED modifications:**
- run-pipeline.sh (methodology enforcement hooks)
- scripts/pre-commit-rule-sweep.sh (Rule 1 check update)
- coordination/specs/Q-R49-SPEC.md (spec)
- test/q49-pipeline-methodology.test.ts (new)

**Pipeline invocation:**
```bash
./run-pipeline.sh --round R49 --tier audit
```
