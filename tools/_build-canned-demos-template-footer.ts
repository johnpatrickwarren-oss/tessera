// tools/_build-canned-demos-template-footer.ts — footer index; concatenation reproduces
// the original HTML_TEMPLATE_FOOTER byte-for-byte.
import { FOOTER_PART_1 } from './_build-canned-demos-template-footer-1.js';
import { FOOTER_PART_2 } from './_build-canned-demos-template-footer-2.js';

export const HTML_TEMPLATE_FOOTER = FOOTER_PART_1 + FOOTER_PART_2;
