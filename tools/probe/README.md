# Apple Silicon probe pilot — build & deploy

Spec: `docs/SPEC-probe-pilot-apple-silicon.md` (DECIDED 2026-07-27). Trio P1-int / P4-mem /
P5-gpu in one compiled binary; scheduler in `tools/probe-runner.ts`.

## Build (any Apple Silicon Mac with Xcode CLT)

```sh
tools/probe/build.sh          # → tools/probe/build/probes + prints the sha256 (block-key part)
```

Golden constants for P1/P4 are baked in `probes.swift` (P5 cross-checks CPU vs GPU at runtime,
no golden). If any kernel parameter changes: `probes --golden` → paste both constants → rebuild.
The binary hash versions the goldens through the block key.

## Dev run (NOT the mini)

```sh
pnpm build
node tools/probe-runner.js --once --out probe-data
```

## Mini deploy — AFTER the 56-day baseline gate (~2026-08-29), not before

1. Copy the repo (or `tools/probe/build/probes` + `tools/probe-runner.js`) to the mini.
2. Write a config with the gate SET — the daemon refuses to start before it:

```json
{ "binaryPath": "/opt/tessera/probes", "outDir": "/var/lib/tessera-probes",
  "baseIntervalMs": 7200000, "notBefore": "2026-08-29" }
```

3. Install `com.tessera.probe-runner.plist.template` (edit paths) into `/Library/LaunchDaemons/`
   and `launchctl load` it. The runner is a SEPARATE daemon from the powermetrics collector.
4. Verify both ndjson files grow and that `probe-windows.ndjson` timestamps land in the passive
   stream's exclusion tooling before trusting any post-gate baseline analysis.

The pilot is **Mode A only** (SPEC § 1): worker-slot units form an A/A null by construction
(no core pinning on arm64 macOS), so this qualifies the instruments and the scoring path — it
does not measure fleet ς̂/θ̂ and it makes no guarantee claim.
