// tools/build-browser-bundle.ts
//
// R82 — engine browser-bundle builder.
// Invoked via `pnpm build:browser` (package.json script).
// Output: demos/engine-bundle.mjs (gitignored build artifact).
//
// Approach A per Q-R82-SPEC § 0: esbuild API + inline `stdin` re-export entry +
// `external:` for all `node:*` modules + format ESM + target es2022 + platform browser.

import * as esbuild from 'esbuild';

// Hardcoded re-export entry. Imports resolved by esbuild from the script's CWD
// (project root). Public surface is intentionally minimal for R82; R83/R84 may
// expand as live-compute needs grow.
const ENTRY_SOURCE = `
export {
  computeSnapshotHash,
  pureJsSha256,
  StaticTopologySource,
  TopologyEnricher,
} from './engine/topology-overlay';

export * as detectors from './engine/detectors/betting-e-process';
export * as familyA from './engine/detectors/family-a-mixture-supermartingale';
export * as familyC from './engine/detectors/family-c-betting-e-process';
export * as eBH from './engine/fleet/e-bh';
export * as runtime from './engine/per-shard/runtime';
export * as freezeHook from './engine/events/freeze-hook';
export * as commonMode from './engine/topology/common-mode-attribution';
export * as types from './engine/types';
`;

async function main(): Promise<void> {
  const result = await esbuild.build({
    stdin: {
      contents: ENTRY_SOURCE,
      loader: 'ts',
      resolveDir: process.cwd(),
      sourcefile: 'tessera-engine-browser-bundle-entry.ts',
    },
    bundle: true,
    format: 'esm',
    target: 'es2022',
    platform: 'browser',
    outfile: 'demos/engine-bundle.mjs',
    external: ['node:crypto', 'node:http', 'node:fs', 'node:events'],
    legalComments: 'none',
    minify: false,
    sourcemap: false,
    logLevel: 'info',
  });
  if (result.errors.length > 0) {
    console.error('esbuild errors:', result.errors);
    process.exit(1);
  }
  const fs = await import('node:fs');
  const sz = fs.statSync('demos/engine-bundle.mjs').size;
  console.log(`R82 browser bundle written: demos/engine-bundle.mjs (${sz} bytes)`);
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
