// tools/contrast.ts — the shared model-free contrast fit (Mode B spatial null; ADR 0019), now served
// by the engine.
//
// Since engine v0.6.12-pre the fit lives at `per-shard/contrast` in
// @johnpatrickwarren-oss/deploysignal-engine (engine ADR 0032), ported from this file line for line
// and held in lockstep against this repo's compiled tools by the engine's test/contrast.test.ts
// (139,800 field-by-field comparisons over 200 streams, 0 mismatches). Tessera ADR 0030 records the
// swap (engine ADR 0033 step 2). This file is a re-export so every caller path (`./contrast.js`)
// and every ADR that cites it stays valid; the contrast's validity envelope and its measured
// refusal live on the engine module (`CONTRAST_NULL_ENVELOPE`).
export {
  median,
  madScale,
  fitContrast,
  applyContrast,
  composeFit,
  fitContrastFast,
  type ContrastFit,
} from '@johnpatrickwarren-oss/deploysignal-engine/per-shard/contrast';
