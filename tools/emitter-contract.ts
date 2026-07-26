// tools/emitter-contract.ts — the VALIDITY-CLASS GATE on the FDR-bearing e-BH path (ADR 0019).
//
// e-BH controls FDR ≤ q ONLY if every input e-value is marginally null-valid (E[e|H0] ≤ 1). The
// engine's e-BH "operates on bare e-value numbers and CANNOT see their provenance, so it TRUSTS the
// caller"; ADR 0019 makes that trust a MACHINE-CHECKED property of the detector EMITTER, not a global
// claim. The unit of validity is the whole emitter contract {baseline, conditioning vars, residualizer,
// increment, stopping/aggregation, horizon, validity_class}, and only the top two validity classes —
// `theorem_valid` / `construction_valid` — may enter the FDR-bearing path. Everything else routes to
// Mode A (evidence/ranking + abstain), with NO FDR claim.
//
// This mirrors `tools/baseline-guard.ts`: a small, well-tested gate that THROWS rather than let an
// un-eligible emitter silently regress to "every counter gets a guarantee". Validity is opt-in and
// REVOCABLE, never default. The ONLY escape is CS_ALLOW_UNVALIDATED=1 (plumbing/wiring smokes), which
// prints a loud banner branding the run's selection as INVALID FOR FDR — it can never be mistaken for
// a real Mode-B result.
//
// Three load-bearing rules from ADR 0019 are encoded here:
//   1. `construction_valid` is NOT a static stamp — it binds to a live calibration monitor and is
//      revocable at runtime. So a `construction_valid` emitter is FDR-bearing ONLY while its
//      `calibrationMonitorPassing` flag is true (follow-up #2 owns flipping that flag; until #2 exists
//      a `construction_valid` emitter must carry the flag explicitly, or it is treated as not-yet-
//      monitored → Mode A). `theorem_valid` (a proven e-process) needs no runtime monitor.
//   2. The boundary is the emitter, not the counter.
//   3. Enforce in code, mirroring baseline-guard.
//
// Tessera-original; NOT vendored. Complements (does not replace) the engine's numeric validity-envelope
// (`detectors/validity-envelope.ts`) — that gate asks "is this e-value numerically valid under its
// baseline regime"; THIS gate asks "is this emitter even admitted to Mode B by its contract class +
// live calibration monitor".

import { eBenjaminiHochberg } from '@johnpatrickwarren-oss/deploysignal-engine/fleet/e-bh';
import {
  type EValue, type EvidenceClass, weakest, meetsEvidence, certificateChain, openPremises,
} from './e-value.js';

/** The validity class of an emitter contract, ordered most→least trustworthy. Only the top two enter
 *  the FDR-bearing e-BH path (Mode B); the rest are Mode A (ranking/RCA) only. */
export type ValidityClass =
  | 'theorem_valid'        // proven e-process under the conditional null over the horizon → Mode B
  | 'construction_valid'   // conservative e-process by construction on a NAMED conditional model →
                           //   Mode B ONLY while its live calibration monitor passes (revocable)
  | 'empirically_audited'  // residual passes an empirical audit (e.g. Wall-A whiteness) — Mode A ONLY
  | 'heuristic'            // threshold / heuristic — Mode A
  | 'rca_only';            // post-hoc root-cause only — never an alert

/** The two classes admitted to the FDR-bearing e-BH path. */
export const FDR_BEARING_CLASSES: ReadonlyArray<ValidityClass> = ['theorem_valid', 'construction_valid'];

/** The product mode an emitter operates in. */
export type Mode = 'A' | 'B';

/** The emitter contract — the unit of validity (ADR 0019). The whole thing, not the counter, is what
 *  must satisfy null e-validity to enter Mode B. */
export interface EmitterContract {
  /** Stable id for logs / audit trail. */
  id: string;
  /** The curated ≥2-month baseline (loadings + scale) version this emitter residualizes against. */
  baselineVersion: string;
  /** The covariates X_n the conditional null is conditioned on (common-mode, regime, ...). */
  conditioningVariables: string[];
  /** How raw → residual (named residualizer). */
  residualizer: string;
  /** The e-increment object (default: normalized convex mixture; see tools/mixture-evalue.ts). */
  increment: string;
  /** Local+global filtration, stopping rule, fleet aggregation. */
  stoppingAggregation: string;
  /** The monitoring window the validity claim covers. */
  horizon: string;
  /** ── gates entry to FDR-bearing e-BH ── */
  validityClass: ValidityClass;
  /** Live anytime-valid calibration-monitor verdict (follow-up #2). REQUIRED true at runtime for a
   *  `construction_valid` emitter to remain FDR-bearing — the moment its conditional assumptions break,
   *  #2 flips this false and the emitter is demoted B→A. Undefined ⇒ not-yet-monitored ⇒ treated as
   *  NOT passing (a class without a live monitor manufactures false confidence). Ignored for
   *  `theorem_valid` (proven, no runtime monitor needed). */
  calibrationMonitorPassing?: boolean;
}

/** Brand a run as plumbing-only when the unvalidated-emitter override is set (mirrors CS_ALLOW_SHORT). */
export function unvalidatedOverride(): boolean {
  return process.env.CS_ALLOW_UNVALIDATED === '1';
}

/** True iff this emitter is currently admitted to the FDR-bearing e-BH path (Mode B). A
 *  `construction_valid` emitter is FDR-bearing ONLY while its live calibration monitor passes; a
 *  `theorem_valid` emitter always is; everything else never is. */
export function isFdrBearing(c: EmitterContract): boolean {
  if (c.validityClass === 'theorem_valid') return true;
  if (c.validityClass === 'construction_valid') return c.calibrationMonitorPassing === true;
  return false;
}

/** The mode this emitter operates in right now. */
export function modeOf(c: EmitterContract): Mode {
  return isFdrBearing(c) ? 'B' : 'A';
}

/** Human-readable reason an emitter is NOT FDR-bearing (for the gate message / Mode-A audit trail). */
export function ineligibilityReason(c: EmitterContract): string | null {
  if (isFdrBearing(c)) return null;
  if (c.validityClass === 'construction_valid') {
    return c.calibrationMonitorPassing === undefined
      ? `validity_class=construction_valid but no live calibration monitor (calibrationMonitorPassing undefined) — not-yet-monitored emitters are not FDR-bearing`
      : `validity_class=construction_valid but its live calibration monitor is FAILING (demoted Mode B→A; ADR 0019 rule 1)`;
  }
  return `validity_class=${c.validityClass} is not FDR-bearing (only ${FDR_BEARING_CLASSES.join('|')} enter Mode B; ADR 0019)`;
}

/** THROW unless this emitter is admitted to the FDR-bearing e-BH path. Call this at the e-BH entry of
 *  any harness that intends to emit an FDR-controlled (Mode B) result — the way short windows now throw.
 *  @param c     the emitter contract.
 *  @param where a label for the harness/entry point (for the error message). */
export function assertFdrEligible(c: EmitterContract, where: string): void {
  if (isFdrBearing(c)) return;
  const reason = ineligibilityReason(c);
  if (unvalidatedOverride()) {
    process.stderr.write(
      `\n⚠️  UNVALIDATED-EMITTER OVERRIDE (CS_ALLOW_UNVALIDATED=1) — ${where}: emitter "${c.id}" is NOT ` +
      `FDR-bearing (${reason}). The selection below is PLUMBING ONLY and INVALID FOR FDR.\n\n`);
    return;
  }
  throw new Error(
    `${where}: emitter "${c.id}" is NOT admitted to the FDR-bearing e-BH path — ${reason}. ` +
    `Mode B (FDR-guaranteed) is opt-in and revocable: an emitter enters it ONLY with ` +
    `validity_class ∈ {${FDR_BEARING_CLASSES.join(', ')}} AND (for construction_valid) a currently-` +
    `passing runtime calibration monitor. Otherwise route it to Mode A (evidence/ranking + abstain, no ` +
    `FDR claim), or set CS_ALLOW_UNVALIDATED=1 ONLY for a plumbing smoke (selection branded invalid).`);
}

/** @deprecated ADR 0025 — use {@link certifiedFdrBenjaminiHochberg}, which takes proof-carrying
 *  `EValue`s instead of bare numbers. Retained only so existing tests can exercise the eligibility
 *  gate in isolation; the `certified-fdr-path` invariant blocks any NEW caller under tools/.
 *  anchor:allow certified-fdr-path
 *
 *  Gated e-BH: assert the emitter is FDR-eligible, THEN run the engine's e-BH. Returns {selected, K}.
 *  It cannot see whether its inputs are e-values at all — which is exactly how audit findings F1–F5
 *  reached production. */
export function fdrBenjaminiHochberg(
  perShardEValues: ReadonlyArray<number>, qLevel: number, c: EmitterContract, where: string,
): ReturnType<typeof eBenjaminiHochberg> {
  assertFdrEligible(c, where);
  return eBenjaminiHochberg(perShardEValues, qLevel);
}

/** The evidence class a validity class DEMANDS of the numbers it feeds to e-BH. This is the join
 *  between ADR 0019's emitter-level lattice and the per-number certificates in tools/e-value.ts:
 *  a `theorem_valid` emitter feeding `construction`-class numbers is a category error, and before
 *  the branded type it was the normal state of affairs (audit F1–F5). */
export const REQUIRED_EVIDENCE: Readonly<Record<'theorem_valid' | 'construction_valid', EvidenceClass>> = {
  theorem_valid: 'theorem',
  construction_valid: 'construction',
};

/** The audit record a Mode-B selection produces. `openPremises` is the honest risk surface: the
 *  type system guarantees PROVENANCE, never that these premises hold. */
export interface CertifiedSelection {
  readonly selected: readonly number[];
  readonly K: number;
  readonly evidence: EvidenceClass;
  readonly certificateIds: readonly string[];
  readonly openPremises: readonly string[];
}

/**
 * PROOF-CARRYING e-BH — the Mode-B entry point. Prefer this over `fdrBenjaminiHochberg`.
 *
 * Takes `readonly EValue[]`, not `readonly number[]`, so a quantity with no registered
 * construction — an SR running max, a p-value, a plug-in BF — cannot reach the FDR path at all.
 * Audit F3 (`eDetector(...).peak` fed to e-BH and reported CERTIFIED) becomes a COMPILE error; see
 * test/e-value.test.ts, which asserts that with `@ts-expect-error`.
 *
 * Two checks the untyped version cannot make:
 *   1. the emitter is FDR-eligible (as before — ADR 0019);
 *   2. every input's evidence class is at least as strong as the emitter's `validityClass` claims.
 */
export function certifiedFdrBenjaminiHochberg(
  perShardEValues: ReadonlyArray<EValue>, qLevel: number, c: EmitterContract, where: string,
): CertifiedSelection {
  assertFdrEligible(c, where);

  const need = REQUIRED_EVIDENCE[c.validityClass as 'theorem_valid' | 'construction_valid'] ?? 'construction';
  const got = weakest(perShardEValues);
  if (!meetsEvidence(got, need)) {
    const offenders = [...new Set(
      perShardEValues.filter((e) => !meetsEvidence(e.cert.evidence, need)).map((e) => `${e.cert.id} (${e.cert.evidence})`),
    )];
    const msg =
      `${where}: emitter "${c.id}" declares validity_class=${c.validityClass}, which demands ` +
      `${need}-class e-values, but the weakest input is ${got}-class — ${offenders.join(', ')}. ` +
      `Either weaken the emitter's validity_class to match its evidence, or replace the offending ` +
      `construction (audit F1/F2: the engine nuisance-robust BF and gaussianLrEValue are NOT ` +
      `e-values; safe-t is the theorem-valid substitute).`;
    if (unvalidatedOverride()) process.stderr.write(`\n⚠️  EVIDENCE-CLASS OVERRIDE (CS_ALLOW_UNVALIDATED=1) — ${msg}\n\n`);
    else throw new Error(msg);
  }

  const { selected, K } = eBenjaminiHochberg(perShardEValues.map((e) => e.value), qLevel);
  const certificateIds = [...new Set(perShardEValues.flatMap((e) => certificateChain(e).map((x) => x.id)))];
  const premises = [...new Set(perShardEValues.flatMap(openPremises))];
  return { selected: [...selected], K, evidence: got, certificateIds, openPremises: premises };
}

/** Partition a set of emitters by mode (the "exclude" path for continuous fleet observation): the
 *  Mode-B subset may carry an FDR guarantee, the Mode-A subset is ranking/abstain only. */
export function routeEmitters(contracts: ReadonlyArray<EmitterContract>): { modeB: EmitterContract[]; modeA: EmitterContract[] } {
  const modeB: EmitterContract[] = [];
  const modeA: EmitterContract[] = [];
  for (const c of contracts) (isFdrBearing(c) ? modeB : modeA).push(c);
  return { modeB, modeA };
}
