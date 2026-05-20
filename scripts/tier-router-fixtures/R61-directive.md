## § R61 Round-scope directive (full-tier — WU-Phase3-3A; engine npm package extract; architectural restructure)

**Deliverable:** Extract engine/ as a standalone npm package with its own package.json, tsconfig.json, and published boundary.

**Tier rationale:** full — A1 (new npm package boundary; new external publication surface), A2 (new architectural pattern: monorepo sub-package), A7 (first-time territory: engine npm extraction).

**ALLOWED modifications:**
- engine/package.json (new)
- engine/tsconfig.json (new)
- engine/topology/
- engine/utils/
- engine/scoring/
- engine/index.ts
- package.json (workspace link)
- tsconfig.json (path alias update)

**Pipeline invocation:**
```bash
./run-pipeline.sh --round R61 --tier full
```

**Halt conditions:**
- HALT + DIAGNOSTIC + ESCALATE on any structural engine dependency conflict that cannot be resolved within engine/ boundary.
- HALT + DIAGNOSTIC + ESCALATE if npm package boundary creates circular imports with root workspace.
- HALT + DIAGNOSTIC if tsc composite project references require architectural decisions not anticipated by spec.
