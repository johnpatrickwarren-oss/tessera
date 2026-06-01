import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { execSync } from 'node:child_process';

const ROOT = path.resolve(__dirname, '..');
const HTML_PATH = path.join(ROOT, 'demos', 'demo.html');
const DEMO_SCRIPT_PATH = path.join(ROOT, 'demos', 'DEMO-SCRIPT.md');
const README_PATH = path.join(ROOT, 'README.md');
const EMPIRICAL_SH_PATH = path.join(ROOT, 'coordination', 'specs', 'Q-R81-EMPIRICAL.sh');
const ROUND_START_SHA = '0eb371f';

// AC-R81-1: demos/demo.html contains scrubber HTML element inside #tessera-controls
test('AC-R81-1: demos/demo.html contains window-scrubber input[type=range] in #tessera-controls', () => {
  const html = fs.readFileSync(HTML_PATH, 'utf8');
  const hasRangeInput =
    /<input[^>]*\btype="range"[^>]*\bid="window-scrubber"/.test(html) ||
    /<input[^>]*\bid="window-scrubber"[^>]*\btype="range"/.test(html);
  assert.ok(hasRangeInput, 'demo.html must contain <input type="range" id="window-scrubber">');
  // Element must appear inside #tessera-controls section
  const controlsMatch = html.match(/<section[^>]*id="tessera-controls"[\s\S]*?<\/section>/);
  assert.ok(controlsMatch, 'demo.html must have #tessera-controls section');
  const hasInControls =
    /<input[^>]*\btype="range"[^>]*\bid="window-scrubber"/.test(controlsMatch[0]) ||
    /<input[^>]*\bid="window-scrubber"[^>]*\btype="range"/.test(controlsMatch[0]);
  assert.ok(hasInControls, 'window-scrubber must be inside #tessera-controls section');
});

// AC-R81-2: demos/demo.html wires scrubber input + change event listeners
test('AC-R81-2: demos/demo.html wires windowScrubber input and change listeners', () => {
  const html = fs.readFileSync(HTML_PATH, 'utf8');
  assert.match(html, /windowScrubber\.addEventListener\('input'/, 'must wire scrubber input listener');
  assert.match(html, /windowScrubber\.addEventListener\('change'/, 'must wire scrubber change listener');
});

// AC-R81-3: demos/demo.html wires document keydown with Space/ArrowRight/ArrowLeft/KeyR
test('AC-R81-3: demos/demo.html wires document keydown with all 4 ev.code cases', () => {
  const html = fs.readFileSync(HTML_PATH, 'utf8');
  assert.match(html, /document\.addEventListener\('keydown'/, 'must wire document keydown listener');
  assert.match(html, /'Space'/, "must handle 'Space' key");
  assert.match(html, /'ArrowRight'/, "must handle 'ArrowRight' key");
  assert.match(html, /'ArrowLeft'/, "must handle 'ArrowLeft' key");
  assert.match(html, /'KeyR'/, "must handle 'KeyR' key");
});

// AC-R81-4: demos/demo.html CSS has 200ms transition on .det-fam
test('AC-R81-4: demos/demo.html CSS has 200ms transition rule on .det-fam', () => {
  const html = fs.readFileSync(HTML_PATH, 'utf8');
  assert.match(html, /\.det-fam[\s\S]{0,400}transition:[^;]*200ms/, 'must have 200ms CSS transition on .det-fam');
});

// AC-R81-5: demos/demo.html CSS has body.scrubbing transition: none override
test('AC-R81-5: demos/demo.html CSS has body.scrubbing transition: none', () => {
  const html = fs.readFileSync(HTML_PATH, 'utf8');
  assert.match(html, /body\.scrubbing[\s\S]{0,400}transition:\s*none/, 'must have body.scrubbing transition: none');
});

// AC-R81-6: demos/demo.html uses createElement('details') for provenance receipts
test('AC-R81-6: demos/demo.html renderProvenancePanel uses createElement(\'details\')', () => {
  const html = fs.readFileSync(HTML_PATH, 'utf8');
  const hasDetails =
    /createElement\('details'\)[\s\S]{0,200}provenance-receipt/.test(html) ||
    /provenance-receipt[\s\S]{0,200}createElement\('details'\)/.test(html);
  assert.ok(hasDetails, "renderProvenancePanel must use createElement('details') with class provenance-receipt");
});

// AC-R81-7: README.md has ## Quick demo + scrubber + DEMO-SCRIPT.md reference
test('AC-R81-7: README.md has Quick demo section with scrubber and DEMO-SCRIPT.md', () => {
  const readme = fs.readFileSync(README_PATH, 'utf8');
  assert.match(readme, /^## Quick demo/m, 'README must have ## Quick demo heading');
  assert.match(readme, /scrubber/i, 'Quick demo section must mention scrubber');
  assert.match(readme, /DEMO-SCRIPT\.md/, 'Quick demo section must reference DEMO-SCRIPT.md');
});

// AC-R81-8: demos/DEMO-SCRIPT.md exists and > 1000 bytes
test('AC-R81-8: demos/DEMO-SCRIPT.md exists and is > 1000 bytes', () => {
  assert.ok(fs.existsSync(DEMO_SCRIPT_PATH), 'demos/DEMO-SCRIPT.md must exist');
  const content = fs.readFileSync(DEMO_SCRIPT_PATH, 'utf8');
  assert.ok(content.length > 1000, `DEMO-SCRIPT.md must be > 1000 bytes (got ${content.length})`);
});

// AC-R81-9: demos/DEMO-SCRIPT.md has all 5 minute-section headings
test('AC-R81-9: demos/DEMO-SCRIPT.md contains all 5 minute-section headings', () => {
  const content = fs.readFileSync(DEMO_SCRIPT_PATH, 'utf8');
  assert.match(content, /Minute 0:00\s*[–-]\s*2:00/, 'missing Minute 0:00 – 2:00 section');
  assert.match(content, /Minute 2:00\s*[–-]\s*4:00/, 'missing Minute 2:00 – 4:00 section');
  assert.match(content, /Minute 4:00\s*[–-]\s*6:00/, 'missing Minute 4:00 – 6:00 section');
  assert.match(content, /Minute 6:00\s*[–-]\s*8:00/, 'missing Minute 6:00 – 8:00 section');
  assert.match(content, /Minute 8:00\s*[–-]\s*10:00/, 'missing Minute 8:00 – 10:00 section');
});

// AC-R81-10: demos/DEMO-SCRIPT.md has >= 150 lines
test('AC-R81-10: demos/DEMO-SCRIPT.md has >= 150 lines', () => {
  const content = fs.readFileSync(DEMO_SCRIPT_PATH, 'utf8');
  const lineCount = content.split('\n').length;
  assert.ok(lineCount >= 150, `DEMO-SCRIPT.md must have >= 150 lines (got ${lineCount})`);
});

// AC-R81-11: demos/DEMO-SCRIPT.md has >= 8 Click/Say cue lines
test('AC-R81-11: demos/DEMO-SCRIPT.md has >= 8 **Click:** or **Say:** cue lines', () => {
  const content = fs.readFileSync(DEMO_SCRIPT_PATH, 'utf8');
  const cues = (content.match(/^\*\*(?:Click|Say):\*\*/gm) ?? []).length;
  assert.ok(cues >= 8, `DEMO-SCRIPT.md must have >= 8 **Click:** or **Say:** cue lines (got ${cues})`);
});

// AC-R81-12: demos/demo.html preserves R79+R80 structural elements and family colors
test('AC-R81-12: demos/demo.html preserves all R79+R80 structural elements and family border colors', () => {
  const html = fs.readFileSync(HTML_PATH, 'utf8');
  assert.match(html, /<section[^>]*\bid="live-verdict-banner"/, 'must have live-verdict-banner section');
  assert.match(html, /<div[^>]*\bid="metrics-panel"[^>]*\bclass="[^"]*metrics-panel/, 'must have metrics-panel div');
  // Outer provenance-panel details must exist
  assert.match(html, /<details\b([^>]*)\bid="provenance-panel"([^>]*)>/, 'must have provenance-panel details');
  // Outer provenance-panel must NOT have open attribute
  assert.doesNotMatch(
    html,
    /<details[^>]*\bid="provenance-panel"[^>]*\bopen[^>]*>/,
    'provenance-panel must not have open attribute (must be collapsed by default)',
  );
  assert.match(html, /class="tessera-tagline"/, 'must have tessera-tagline element');
  assert.match(html, /:root\s*\{/, 'must have :root CSS block');
  assert.match(html, /@media print\s*\{/, 'must have @media print block');
  for (const fam of ['A', 'B', 'C', 'D', 'E']) {
    assert.match(html, new RegExp(`class="det-fam det-fam-${fam}`), `must have det-fam-${fam} div`);
  }
  const borderMatches = html.match(/border-left:\s*3px solid (#58a6ff|#3fb950|#a371f7|#d29922|#f78166)/g) ?? [];
  assert.ok(borderMatches.length >= 5, `must have 5 distinct family border-left colors (got ${borderMatches.length})`);
});
