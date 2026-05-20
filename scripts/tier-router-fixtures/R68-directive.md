## § R68 Round-scope directive (Coordinator — pnpm migration; pre-publication hygiene)

Pre-publication hygiene pass: migrate from npm to pnpm, update lockfile, verify package.json workspace configuration.

**Scope:** root package.json, engine/package.json, pnpm-workspace.yaml (new), pnpm-lock.yaml (new), .npmrc (new).
**Gate:** all existing tests pass under pnpm exec; no behavioral changes to production code.
