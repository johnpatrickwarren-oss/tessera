## § R72 Round-scope directive (full-tier — coverage validation; R61-class architectural-reality discovery)

**Deliverable:** Coverage validation pass for WU-Phase3-3A/3B/3C with R61-class architectural-reality discovery and resolution.

**Tier rationale:** full — R61-class architectural-reality discovery requiring HALT + DIAGNOSTIC + ESCALATE; two ESCALATE chains unresolved from prior rounds.

**Pipeline invocation:**
```bash
./run-pipeline.sh --round R72 --tier full
```

**ESCALATE #1 (inherited):** TYPE3_EVENT_CLASSES spec-prescribed literal set {'deploy','rollback'} does not exist in engine closed-set union type. R61-class architectural-reality discovery: HALT + DIAGNOSTIC + ESCALATE required before implementation continues.

**ESCALATE #2 (discovered at chore-A):** ALLOWED_SET incomplete — .gitignore and coordination/reviews/REVIEWER-REPORT-R72.md missing from spec § 5.1 enumeration and Q-R72-EMPIRICAL.sh Block 3. ESCALATE required: Coordinator-direct fix or Implementer DIAGNOSTIC.
