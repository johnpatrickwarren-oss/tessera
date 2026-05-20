## § R45 Round-scope directive (audit-tier — AC-R45-4 smoke-test; inline AC wording amendment)

**Deliverable:** Implement AC-R45-4 smoke-test verification script and apply inline AC wording amendment to Q-R45-SPEC.md.

**Tier rationale:** audit — S3 (single bounded item: one smoke-test AC); no separate Architect; Reviewer audits cold.

**Pipeline invocation:**
```bash
./run-pipeline.sh --round R45 --tier audit
```

**Halt conditions (§ 8):**
- HALT + DIAGNOSTIC + ESCALATE if smoke-test output contradicts spec AC-R45-4 literal.
- HALT + DIAGNOSTIC if tsc exit code is non-zero and cannot be resolved with tactical fix.
- HALT + DIAGNOSTIC if spec-premise fails empirical verification (binding command ≠ AC expected value).
- HALT + DIAGNOSTIC if AC wording amendment creates internal spec contradiction with existing ACs.
