import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { execSync } from 'node:child_process';

const ROOT = path.resolve(__dirname, '..');
const HTML_PATH = path.join(ROOT, 'demos', 'demo.html');
const SCENARIOS_DIR = path.join(ROOT, 'demos', 'scenarios');
const SCENARIOS = [
  'clean-baseline', 'sdc-drift', 'common-mode-rack', 'event-conditional',
  'fdr-multiple-testing', 'hierarchical-evalue',
  'sparse-data-resilience', 'topology-spanning-common-mode',
];
const FAMILY_A_SCENARIOS = ['clean-baseline', 'sdc-drift', 'fdr-multiple-testing', 'hierarchical-evalue'];
const ROUND_START_SHA = '51a20b8';

// AC-R80-1: demos/demo.html has 5 det-fam-{A..E} divs (class membership; R79 invariant preserved)
test('AC-R80-1: demos/demo.html contains 5 det-fam-{A..E} divs', () => {
  const html = fs.readFileSync(HTML_PATH, 'utf8');
  for (const fam of ['A', 'B', 'C', 'D', 'E']) {
    assert.match(
      html,
      new RegExp(`class="det-fam det-fam-${fam}`),
      `missing det-fam-${fam} div`,
    );
  }
});

// AC-R80-2: renderDetectorsPanel is defined AND its body queries .det-fam-B/C/D/E
test('AC-R80-2: demos/demo.html defines renderDetectorsPanel querying B/C/D/E families', () => {
  const html = fs.readFileSync(HTML_PATH, 'utf8');
  assert.match(html, /function renderDetectorsPanel\s*\(/);
  assert.match(html, /querySelector\('\.det-fam-B'\)/, "renderDetectorsPanel must query .det-fam-B");
  assert.match(html, /querySelector\('\.det-fam-C'\)/, "renderDetectorsPanel must query .det-fam-C");
  assert.match(html, /querySelector\('\.det-fam-D'\)/, "renderDetectorsPanel must query .det-fam-D");
  assert.match(html, /querySelector\('\.det-fam-E'\)/, "renderDetectorsPanel must query .det-fam-E");
});

// AC-R80-3: family-A scenarios have non-null family_b with {statistic, threshold, fired, derivation} + derivation>=30
test('AC-R80-3: family-A scenarios have non-null family_b with correct shape', () => {
  for (const name of FAMILY_A_SCENARIOS) {
    const j = JSON.parse(fs.readFileSync(path.join(SCENARIOS_DIR, `${name}.json`), 'utf8'));
    for (const w of j.windows) {
      const fb = w.per_window_detectors.family_b;
      assert.ok(fb !== null && fb !== undefined, `${name} w=${w.t}: family_b is null`);
      assert.equal(typeof fb.statistic, 'number', `${name} w=${w.t}: family_b.statistic not number`);
      assert.equal(typeof fb.threshold, 'number', `${name} w=${w.t}: family_b.threshold not number`);
      assert.equal(typeof fb.fired, 'boolean', `${name} w=${w.t}: family_b.fired not boolean`);
      assert.equal(typeof fb.derivation, 'string', `${name} w=${w.t}: family_b.derivation not string`);
      assert.ok(fb.derivation.length >= 30, `${name} w=${w.t}: family_b.derivation too short (${fb.derivation.length})`);
    }
  }
});

// AC-R80-4: family-A scenarios have non-null family_c with correct shape + derivation>=30
test('AC-R80-4: family-A scenarios have non-null family_c with correct shape', () => {
  for (const name of FAMILY_A_SCENARIOS) {
    const j = JSON.parse(fs.readFileSync(path.join(SCENARIOS_DIR, `${name}.json`), 'utf8'));
    for (const w of j.windows) {
      const fc = w.per_window_detectors.family_c;
      assert.ok(fc !== null && fc !== undefined, `${name} w=${w.t}: family_c is null`);
      assert.equal(typeof fc.statistic, 'number', `${name} w=${w.t}: family_c.statistic not number`);
      assert.equal(typeof fc.threshold, 'number', `${name} w=${w.t}: family_c.threshold not number`);
      assert.equal(typeof fc.fired, 'boolean', `${name} w=${w.t}: family_c.fired not boolean`);
      assert.equal(typeof fc.derivation, 'string', `${name} w=${w.t}: family_c.derivation not string`);
      assert.ok(fc.derivation.length >= 30, `${name} w=${w.t}: family_c.derivation too short (${fc.derivation.length})`);
    }
  }
});

// AC-R80-5: family-A scenarios have non-null family_d with correct shape + derivation contains 'peakACF'
test('AC-R80-5: family-A scenarios have non-null family_d with peakACF in derivation', () => {
  for (const name of FAMILY_A_SCENARIOS) {
    const j = JSON.parse(fs.readFileSync(path.join(SCENARIOS_DIR, `${name}.json`), 'utf8'));
    for (const w of j.windows) {
      const fd = w.per_window_detectors.family_d;
      assert.ok(fd !== null && fd !== undefined, `${name} w=${w.t}: family_d is null`);
      assert.equal(typeof fd.statistic, 'number', `${name} w=${w.t}: family_d.statistic not number`);
      assert.equal(typeof fd.threshold, 'number', `${name} w=${w.t}: family_d.threshold not number`);
      assert.equal(typeof fd.fired, 'boolean', `${name} w=${w.t}: family_d.fired not boolean`);
      assert.equal(typeof fd.derivation, 'string', `${name} w=${w.t}: family_d.derivation not string`);
      assert.ok(fd.derivation.includes('peakACF'), `${name} w=${w.t}: family_d.derivation missing 'peakACF'`);
    }
  }
});

// AC-R80-6: family-A scenarios have non-null family_e with correct shape + derivation>=30
test('AC-R80-6: family-A scenarios have non-null family_e with correct shape', () => {
  for (const name of FAMILY_A_SCENARIOS) {
    const j = JSON.parse(fs.readFileSync(path.join(SCENARIOS_DIR, `${name}.json`), 'utf8'));
    for (const w of j.windows) {
      const fe = w.per_window_detectors.family_e;
      assert.ok(fe !== null && fe !== undefined, `${name} w=${w.t}: family_e is null`);
      assert.equal(typeof fe.statistic, 'number', `${name} w=${w.t}: family_e.statistic not number`);
      assert.equal(typeof fe.threshold, 'number', `${name} w=${w.t}: family_e.threshold not number`);
      assert.equal(typeof fe.fired, 'boolean', `${name} w=${w.t}: family_e.fired not boolean`);
      assert.equal(typeof fe.derivation, 'string', `${name} w=${w.t}: family_e.derivation not string`);
      assert.ok(fe.derivation.length >= 30, `${name} w=${w.t}: family_e.derivation too short (${fe.derivation.length})`);
    }
  }
});

// AC-R80-7: sdc-drift terminal family_b.statistic > clean-baseline terminal + 10
test('AC-R80-7: sdc-drift terminal family_b.statistic exceeds clean-baseline terminal by >10', () => {
  const sdcJ = JSON.parse(fs.readFileSync(path.join(SCENARIOS_DIR, 'sdc-drift.json'), 'utf8'));
  const cbJ  = JSON.parse(fs.readFileSync(path.join(SCENARIOS_DIR, 'clean-baseline.json'), 'utf8'));
  const sdcLast = sdcJ.windows[sdcJ.windows.length - 1].per_window_detectors.family_b;
  const cbLast  = cbJ.windows[cbJ.windows.length - 1].per_window_detectors.family_b;
  assert.ok(sdcLast !== null && cbLast !== null, 'terminal family_b must be non-null for both scenarios');
  assert.ok(
    sdcLast.statistic > cbLast.statistic + 10,
    `sdc-drift family_b.statistic (${sdcLast.statistic}) must exceed clean-baseline (${cbLast.statistic}) + 10`,
  );
});

// AC-R80-8: family-A scenarios have detector_families == {A,B,C,D,E}; attribution == []
test('AC-R80-8: detector_families is {A,B,C,D,E} for family-A scenarios; [] for attribution', () => {
  const ATTRIBUTION = ['common-mode-rack', 'event-conditional', 'sparse-data-resilience', 'topology-spanning-common-mode'];
  for (const name of FAMILY_A_SCENARIOS) {
    const j = JSON.parse(fs.readFileSync(path.join(SCENARIOS_DIR, `${name}.json`), 'utf8'));
    const df: string[] = j.detector_families;
    assert.deepEqual(
      [...df].sort(),
      ['A', 'B', 'C', 'D', 'E'],
      `${name}: expected detector_families {A,B,C,D,E}, got ${JSON.stringify(df)}`,
    );
  }
  for (const name of ATTRIBUTION) {
    const j = JSON.parse(fs.readFileSync(path.join(SCENARIOS_DIR, `${name}.json`), 'utf8'));
    assert.deepEqual(j.detector_families, [], `${name}: expected [], got ${JSON.stringify(j.detector_families)}`);
  }
});

// AC-R80-9: demos/demo.html has :root CSS block with >= 5 --tessera- variables
test('AC-R80-9: demos/demo.html has :root CSS block with >= 5 --tessera- variables', () => {
  const html = fs.readFileSync(HTML_PATH, 'utf8');
  assert.match(html, /:root\s*\{/, ':root block not found');
  const matches = html.match(/--tessera-[a-z-]+:/g) ?? [];
  assert.ok(matches.length >= 5, `Found ${matches.length} --tessera- variables; need >= 5`);
});

// AC-R80-10: demos/demo.html has tessera-tagline paragraph with 'Per-shard observation for AI clusters'
test('AC-R80-10: demos/demo.html has tessera-tagline with required text', () => {
  const html = fs.readFileSync(HTML_PATH, 'utf8');
  assert.match(html, /<p class="tessera-tagline">/, 'tessera-tagline <p> element not found');
  assert.match(html, /Per-shard observation for AI clusters/, 'tagline text not found');
});

// AC-R80-11: demos/demo.html has @media print block with >= 2 selector rules
test('AC-R80-11: demos/demo.html has @media print block with >= 2 selector rules', () => {
  const html = fs.readFileSync(HTML_PATH, 'utf8');
  assert.match(html, /@media print\s*\{/, '@media print block not found');
  const printStart = html.indexOf('@media print');
  assert.ok(printStart !== -1, '@media print not found');
  // Count `{` in a window after @media print (each { after the first is a rule body opening)
  const printWindow = html.slice(printStart, printStart + 1500);
  const openBraces = (printWindow.match(/\{/g) ?? []).length;
  // openBraces >= 3: 1 for @media print { itself, >= 2 for selector rules inside
  assert.ok(openBraces >= 3, `@media print block has < 2 selector rules (counted ${openBraces - 1})`);
});

// AC-R80-12: R79 backward-compat structural elements still present
test('AC-R80-12: demos/demo.html preserves R79 structural elements', () => {
  const html = fs.readFileSync(HTML_PATH, 'utf8');
  assert.match(html, /<section[^>]*\bid="live-verdict-banner"/, 'live-verdict-banner missing');
  assert.match(html, /<div[^>]*\bid="metrics-panel"[^>]*\bclass="[^"]*metrics-panel/, 'metrics-panel missing');
  const m = html.match(/<details\b([^>]*)\bid="provenance-panel"([^>]*)>/);
  assert.ok(m, '<details id="provenance-panel"> not found');
  const attrs = (m[1] + m[2]);
  assert.ok(!/\bopen\b/.test(attrs), '<details id="provenance-panel"> should not have open attribute');
});

