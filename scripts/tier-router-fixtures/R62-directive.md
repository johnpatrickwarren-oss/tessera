## § R62 Round-scope directive (full-tier — DS integration interface contract; engine/ds-integration/)

**Deliverable:** Define the DS→Tessera integration interface contract in engine/ds-integration/; ESCALATE history inherited from R61.

**Tier rationale:** full — A1 (new external DS service integration), A2 (new adapter pattern in engine/ds-integration/), A4 (novel data model: DS event types + adapter interface).

**ALLOWED modifications:**
- engine/ds-integration/index.ts (new)
- engine/ds-integration/types.ts (new)
- engine/ds-integration/adapter.ts (new)
- engine/ds-integration/README.md (new)
- test/q62-ds-integration-contract.test.ts (new)
- coordination/specs/Q-R62-SPEC.md (spec)

**Pipeline invocation:**
```bash
./run-pipeline.sh --round R62 --tier full
```

**Halt conditions:**
- HALT + DIAGNOSTIC + ESCALATE on interface contract violations inherited from R61 ESCALATE history.
- HALT + DIAGNOSTIC + ESCALATE if DS integration surface breaks existing engine contracts.
- HALT + DIAGNOSTIC if adapter type system requires a new architectural pattern not covered by spec.
