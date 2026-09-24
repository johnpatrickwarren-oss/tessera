// Returned to Tessera from the engine on 2026-09-23 (engine ADR 0033 step 4, Tessera ADR 0031; was
// adapters/ds-integration/index.ts in @johnpatrickwarren-oss/deploysignal-engine v0.7.0-pre, and Tessera-original before
// the R90 extract). Tessera owns this file; the engine copy is deleted at its next major.

// engine/ds-integration/index.ts — Phase 3 SLICE 3 WU-Phase3-3A (R62) barrel.
//
// Single import surface for the DS integration interface contract. Both
// directions (Tessera→DS feed; DS→Tessera event) are re-exported from this
// barrel. Tessera-side WU-3B + WU-3C (R63+) import the contract types from
// this path; DS-side (separate PR after Wave 10) implements against the
// same shape independently.

export * from './feed-contract';
export * from './event-contract';
export * from './feed';
export * from './event-consumer';        // R66 addition
export * from './freeze-hook-factory';   // R66 addition
