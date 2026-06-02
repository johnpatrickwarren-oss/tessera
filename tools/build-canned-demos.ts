// tools/build-canned-demos.ts — Tessera R71 demo dashboard build tool.
//
// Goal: convert Tessera's 4-CLI-scenario surface (R70) into an 8-scenario
// dashboard with audit / reasoning / suggested-actions panels.
//
// Anti-scope: no new external deps; no engine modifications;
// no real-cluster work; no DS-repo modifications; no browser bundling.
//
// Tessera-original code. NOT vendored.
//
// This file is the CLI entrypoint + public surface. The implementation was
// split into cohesive sibling modules (tools/_build-canned-demos-*.ts) with NO
// behavior change; everything was moved VERBATIM. Public exports
// (ScenarioName, SCENARIO_NAMES, BuildResult, BuildOpts, buildAllCannedDemos)
// remain importable from this same path.

// ── fs + path imports (Node-builtins only) ──
import * as fs from 'node:fs';
import * as path from 'node:path';

// ── Public surface (re-exported from the types module) ──
export type {
  ScenarioName,
  BuildResult,
  BuildOpts,
} from './_build-canned-demos-types.js';
export { SCENARIO_NAMES } from './_build-canned-demos-types.js';

import type {
  ScenarioName,
  ScenarioJson,
  BuildResult,
  BuildOpts,
} from './_build-canned-demos-types.js';
import { SCENARIO_NAMES } from './_build-canned-demos-types.js';
import { serializeScenarioJson } from './_build-canned-demos-core.js';
import {
  runCleanBaselineRecording,
  runSdcDriftRecording,
  runFdrMultipleTestingRecording,
  runHierarchicalEvalueRecording,
} from './_build-canned-demos-scenarios-family-a.js';
import { runEventConditionalRecording } from './_build-canned-demos-scenarios-event.js';
import {
  runCommonModeRackRecording,
  runSparseDataResilienceRecording,
  runTopologySpanningRecording,
} from './_build-canned-demos-scenarios-topology.js';
import { renderDemoHtml } from './_build-canned-demos-render.js';

// ── Public entry point ──
export function buildAllCannedDemos(_opts?: BuildOpts): BuildResult {
  const root = path.resolve(__dirname, '..');
  const scenariosDir = path.join(root, 'demos', 'scenarios');
  fs.mkdirSync(scenariosDir, { recursive: true });

  const runners: Record<ScenarioName, () => ScenarioJson> = {
    'clean-baseline':                runCleanBaselineRecording,
    'sdc-drift':                     runSdcDriftRecording,
    'common-mode-rack':              runCommonModeRackRecording,
    'event-conditional':             runEventConditionalRecording,
    'fdr-multiple-testing':          runFdrMultipleTestingRecording,
    'hierarchical-evalue':           runHierarchicalEvalueRecording,
    'sparse-data-resilience':        runSparseDataResilienceRecording,
    'topology-spanning-common-mode': runTopologySpanningRecording,
  };

  const written: Array<{ name: ScenarioName; path: string }> = [];
  const jsonByName: Array<{ name: ScenarioName; json: string }> = [];
  let bytesTotal = 0;

  for (const name of SCENARIO_NAMES) {
    const j = runners[name]();
    const s = serializeScenarioJson(j);
    const p = path.join(scenariosDir, `${name}.json`);
    fs.writeFileSync(p, s);
    written.push({ name, path: p });
    jsonByName.push({ name, json: s });
    bytesTotal += s.length;
  }

  let html = renderDemoHtml(jsonByName);
  const htmlPath = path.join(root, 'demos', 'demo.html');
  // Preserve R82-SMOKE-BLOCK section across regenerations (R82 Option A resolution).
  // The smoke block is delimited by <!-- R82-SMOKE-BLOCK-START --> / <!-- R82-SMOKE-BLOCK-END -->
  // and injected just before </body> so the dashboard IIFE is unaffected.
  if (fs.existsSync(htmlPath)) {
    const existing = fs.readFileSync(htmlPath, 'utf8');
    const startMarker = '<!-- R82-SMOKE-BLOCK-START -->';
    const endMarker = '<!-- R82-SMOKE-BLOCK-END -->';
    const startIdx = existing.indexOf(startMarker);
    const endIdx = existing.indexOf(endMarker);
    if (startIdx !== -1 && endIdx !== -1) {
      const smokeBlock = existing.slice(startIdx, endIdx + endMarker.length);
      html = html.replace('</body>', smokeBlock + '\n</body>');
    }
  }
  fs.writeFileSync(htmlPath, html);
  bytesTotal += html.length;

  return { scenarios_written: written, html_written_to: htmlPath, bytes_total: bytesTotal };
}

// ── CLI guard (matches tools/demo-scenario.ts:470 convention) ──
if (require.main === module) {
  const result = buildAllCannedDemos();
  process.stdout.write(
    `Built ${result.scenarios_written.length} scenarios + demos/demo.html ` +
    `(${result.bytes_total} bytes total).\n`,
  );
  process.exit(0);
}
