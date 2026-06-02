// tools/_build-canned-demos-render.ts — HTML assembly (renderDemoHtml), VERBATIM.

import type { ScenarioName } from './_build-canned-demos-types.js';
import {
  HTML_TEMPLATE_HEAD,
  SENTINEL_BEGIN,
  SENTINEL_END,
} from './_build-canned-demos-template-head.js';
import { HTML_TEMPLATE_FOOTER } from './_build-canned-demos-template-footer.js';

export function renderDemoHtml(scenarios: ReadonlyArray<{ name: ScenarioName; json: string }>): string {
  const dataLines: string[] = [SENTINEL_BEGIN];
  for (const { name, json } of scenarios) {
    dataLines.push(`  <script type="application/json" id="tessera-scenario-${name}">${json.trimEnd()}</script>`);
  }
  dataLines.push(SENTINEL_END);
  const dataBlock = dataLines.join('\n') + '\n';
  return HTML_TEMPLATE_HEAD + dataBlock + HTML_TEMPLATE_FOOTER;
}
