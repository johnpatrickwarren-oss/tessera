## § R66 Round-scope directive (full-tier — WU-Phase3-3C DS→Tessera event consumer; engine/ds-integration/)

**Deliverable:** Implement DsEventConsumer + FreezeHookFactory in engine/ds-integration/ with typed EventEmitter pattern.

**Tier rationale:** full — A2 (new EventEmitter-based pattern with no precedent in codebase), A7 (first-time territory: event consumer bridging DS freeze signals to Tessera topology).

**ALLOWED modifications:**
- engine/ds-integration/event-consumer.ts (new)
- engine/ds-integration/freeze-hook-factory.ts (new)
- engine/topology/tpu-source.ts (extend with freeze-hook integration)
- test/q66-ds-integration-event-consumer.test.ts (new)
- coordination/specs/Q-R66-SPEC.md (spec)

**Pipeline invocation:**
```bash
./run-pipeline.sh --round R66 --tier full
```

**Halt conditions:**
- HALT + DIAGNOSTIC + ESCALATE on halt condition #6: new EventEmitter pattern with no precedent — architectural decision required.
- HALT + DIAGNOSTIC + ESCALATE if engine/ds-integration/ surface breaks backward compatibility for any existing engine/ consumer.
- HALT + DIAGNOSTIC if typed EventEmitter generic parameter cannot be resolved without widening the engine's public type surface.
