// tools/e-value.ts — the PROOF-CARRYING E-VALUE TYPE. Makes the F1–F5 bug class unrepresentable.
//
// WHY THIS EXISTS. Five of the six CRITICAL findings in the 2026-07-02 math audit are the SAME bug:
// a quantity that is not an e-value entered the FDR-bearing e-BH path.
//
//   F1  engine nuisance-robust BF        E[BF|H0] ≈ 1.155 at every cal length (not ≤ 1)
//   F2  gaussianLrEValue                 plug-in SD ⇒ null mean DIVERGES (measured ≈ 1.6e5 at cal=30)
//   F3  eDetector(...).peak              the SR running max, E[M^SR|H0] ≈ #onsets — fed to e-BH,
//                                        reported "CERTIFIED" (live path)
//   F4  triad flag-then-substitute       E[e_routed|H0] ≤ 1 never established
//   F5  per-cycle re-normalised mixture  cycle values are not prefixes of ONE e-process
//
// Every one of them type-checked, because `eBenjaminiHochberg` takes `ReadonlyArray<number>` and
// every real number is a candidate e-value. `EmitterContract.validityClass` (ADR 0019) is the right
// idea implemented at the weakest available strength: a STRING TAG checked at runtime, describing
// the emitter, while the actual numbers flow past it unchecked.
//
// This module makes the e-value a TYPE with a construction obligation:
//   • `EValue` is opaque — it cannot be built by a cast, a literal, or structural typing;
//   • it can only be produced by a CERTIFIED CONSTRUCTOR in this file, or by a CERTIFIED COMBINATOR
//     applied to existing EValues;
//   • every EValue carries the `Certificate` chain that produced it (evidence class + source ADR +
//     Lean theorem name once discharged), so the audit trail is intrinsic rather than asserted;
//   • the combinator set is deliberately SMALL and contains only closure properties that are true.
//     Note what is ABSENT: there is no `product(EValue[])` — the product of e-values is an e-value
//     only when they are SEQUENTIALLY conditional, so accumulation is exposed exclusively through
//     the stateful `EProcess` (below), which enforces the discipline by construction. Offering a
//     free-standing product would re-create F5.
//
// A quantity with no certificate — an SR running max, a p-value, a z-score, a plug-in BF — is a
// plain `number` and simply cannot be passed to `certifiedFdrBenjaminiHochberg`. F3 becomes a
// COMPILE ERROR. See test/e-value.test.ts, where that is asserted with `@ts-expect-error`.
//
// SCOPE / HONESTY. A certificate is a citation, not a proof. `evidence: 'theorem'` means "a proof
// exists in the literature or in the engine and is cited"; `lean` names a MACHINE-CHECKED theorem,
// and is populated only where one actually builds — today that is MIN_RULE and CONVEX_MEAN
// (Lean 4.32.1 + Mathlib, both for an arbitrary measure). Everywhere else it stays `undefined`. The point of the type is not that it proves anything — it is
// that it forces every e-value entering e-BH to NAME the argument it relies on, and makes the
// weakest link in a derivation propagate to the result (see `weakest`). Discharging certificates
// into Lean theorems is the follow-on programme
// (research/2026-07-25-formal-statements-adaptivity-and-gating.md § 4).
//
// Tessera-original; NOT vendored.

import { normalizedMixtureEValue, geometricMixtureEValue, type IncrementKind } from './mixture-evalue.js';
import { supAdjuster } from './supfdr.js';

// ─────────────────────────────────────────────────────────────────────────────
// Certificates
// ─────────────────────────────────────────────────────────────────────────────

/** How strong the argument behind an e-value is. Ordered strongest → weakest; a derivation inherits
 *  the WEAKEST class among its inputs (see `weakest`). Mirrors — and refines — the ADR 0019
 *  `ValidityClass` lattice, which describes EMITTERS; this describes the NUMBERS. */
export type EvidenceClass = 'theorem' | 'construction' | 'empirical';

const EVIDENCE_RANK: Readonly<Record<EvidenceClass, number>> = { theorem: 3, construction: 2, empirical: 1 };

/** The weaker (lower-ranked) of two evidence classes. */
export function weaker(a: EvidenceClass, b: EvidenceClass): EvidenceClass {
  return EVIDENCE_RANK[a] <= EVIDENCE_RANK[b] ? a : b;
}

/** `true` iff `have` is at least as strong as `need`. */
export function meetsEvidence(have: EvidenceClass, need: EvidenceClass): boolean {
  return EVIDENCE_RANK[have] >= EVIDENCE_RANK[need];
}

/** The named argument that makes a number an e-value. Attached to every `EValue`. */
export interface Certificate {
  /** Stable id for logs, audit trails and the Lean discharge queue. */
  readonly id: string;
  /** The claim being relied on, stated as an inequality wherever possible. */
  readonly claim: string;
  /** Strength of the argument. */
  readonly evidence: EvidenceClass;
  /** Where the argument lives: ADR, arXiv id, engine path, audit finding. */
  readonly source: string;
  /** Name of the machine-checked theorem, once one exists. `undefined` = not yet discharged. */
  readonly lean?: string;
  /** Conditions the claim depends on that this module CANNOT check. These are the real risk. */
  readonly premises?: readonly string[];
  /** Known caveats / scope limits recorded by the audit. */
  readonly caveats?: readonly string[];
  /** For combinators: the certificates of the inputs, so the derivation is inspectable. */
  readonly derivedFrom?: readonly Certificate[];
}

/** The certificate registry. Every entry is a claim we are making in public; adding one is an
 *  ADR-level act, not a convenience. Ids are stable — the Lean discharge queue keys on them. */
export const CERT = {
  NORMALIZED_MIXTURE: {
    id: 'normalized-onset-mixture',
    claim: 'E[e|H0] ≤ 1 at a FIXED horizon T: (M^SR_t + (T−1−t))/T is a uniform convex mixture over onset e-processes, passed through the √E−1 adjuster.',
    evidence: 'construction',
    source: 'ADR 0019; audit 2026-07-02 (confirmed exact); Carefree arXiv:2501.19360 Thm 1',
    premises: [
      'the standardised residual satisfies the conditional null r_t | F_{t−1} ~ N(0,1) (gaussian increment), or is conditionally mean-zero after clipping (bounded increment)',
      'the horizon T is fixed BEFORE looking; re-scoring a growing prefix yields a different mixture each look',
    ],
    caveats: [
      'HORIZON-DEPENDENT. Acting at a first crossing across re-scored looks is uncovered optional stopping — audit F5. Use GEOMETRIC_MIXTURE for the always-on loop.',
      'audit F7: a 10% under-estimate of the standardising scale drives the null mean 0.52 → 7.6 under the gaussian increment.',
    ],
  },
  GEOMETRIC_MIXTURE: {
    id: 'geometric-onset-mixture',
    claim: 'E[e|H0] ≤ 1 at ALL times: fixed horizon-independent Shiryaev weights ρ(1−ρ)^{j−1} over a hazard grid ⇒ ONE e-process ⇒ the adjusted running max is a valid all-times e-value.',
    evidence: 'construction',
    source: 'audit 2026-07-02 F5 fix; ADR 0023 correction; Carefree arXiv:2501.19360 Thm 1',
    premises: [
      'the standardised residual satisfies the conditional null (as above)',
      'the hazard grid is fixed BEFORE data — changing it invalidates cross-look comparability',
    ],
  },
  CONFORMAL_RANK_CALIBRATED: {
    id: 'conformal-rank-calibrated',
    claim: 'E[f(p)|F_{t−½}] ≤ 1 where p is a randomised conformal rank and f = mean_κ κp^{κ−1} (∫₀¹f = 1, f non-increasing).',
    evidence: 'theorem',
    source: 'ADR 0023; Prop A1 in research/2026-07-25-formal-statements-adaptivity-and-gating.md',
    premises: [
      '(H-EX) conditional on F_{t−½} and on the realised block, the healthy members\' scores are exchangeable — VIOLATED by suspect-enriched peer drafting (measured: E4 FDP 0.144 ≈ 3q)',
      '(H-MON) faulty peers are stochastically no better than healthy ones (one-sided test)',
      'block composition is fixed at the DESIGN stage, before any round-t score is revealed',
    ],
    caveats: [
      'Gap A2: (H-EX) requires no persistent idiosyncratic heterogeneity beyond the block key. Known false in fleets; measured to bite at GROUP level (~4 false racks/run, program report § 3.1) and asserted benign at UNIT level. Unbounded.',
    ],
  },
  SAFE_T: {
    id: 'safe-t',
    claim: 'E[BF|H0] = 1 exactly and uniformly over the composite location-scale null (right-Haar / GROW).',
    evidence: 'theorem',
    source: 'ADR 0005; Grünwald–de Heide–Koolen safe testing (1906.07801); audit 2026-07-02 (confirmed exact)',
    premises: ['computed by the engine\'s safe-t implementation — this adapter TRUSTS the engine'],
  },
  BOUNDED_BET: {
    id: 'bounded-bet',
    claim: 'E[1 + λc/B | F] = 1 exactly and distribution-free whenever the clipped residual c is conditionally mean-zero, for any tail and any scale error.',
    evidence: 'theorem',
    source: 'audit 2026-07-02 W1(c) (F7/F9 fix); tools/mixture-evalue.ts gIncBounded',
    premises: ['the clipped residual is conditionally mean-zero — a CENTER assumption, not a scale one'],
    caveats: ['VARIANCE-BLIND: E[1+λc] = 1 under any symmetric law, so detachment/variance-signal faults lose ~half the recall (measured clean R=8 0.987 → 0.539).'],
  },
  MIN_RULE: {
    id: 'min-rule',
    claim: 'E[min(e₁,…,e_k)|H0] ≤ min_i E[e_i|H0] ≤ 1 — the minimum of e-values is an e-value, unconditionally.',
    evidence: 'theorem',
    source: 'ADR 0022 correction (audit F4); elementary (min ≤ each argument pointwise)',
    lean: 'Tessera.EValue.min_isEValue',
  },
  CONVEX_MEAN: {
    id: 'convex-mean',
    claim: 'E[Σ w_i e_i|H0] = Σ w_i E[e_i|H0] ≤ 1 for weights w_i ≥ 0 with Σ w_i ≤ 1 — a convex combination of e-values is an e-value.',
    evidence: 'theorem',
    source: 'elementary (linearity of expectation); ADR 0019 mixture default; Wang–Ramdas 2022',
    lean: 'Tessera.EValue.convexMean_isEValue',
  },
  SUP_ADJUSTED: {
    id: 'sup-adjusted-running-max',
    claim: '√S − 1 applied to the running max S of a genuine e-process is a valid ALL-TIMES e-value: ∫₁^∞ (√e−1)/e² de = 1 exactly.',
    evidence: 'theorem',
    source: 'Carefree, arXiv:2501.19360 Thm 1; audit 2026-07-02 (confirmed exact; naive running-max e-BH leaks ≈1.08α)',
    premises: ['the input running max is of a GENUINE e-process — applying this to an SR sum is exactly bug F3, which the type prevents'],
  },
  HALF_HALF_ACCUMULATOR: {
    id: 'half-half-accumulator',
    claim: '½·∏f(p_s) + ½·Σ_j (1−γ)γ^{j−1}∏_{s≥j} f(p_s) is a nonnegative supermartingale with M₀ = 1 — a convex combination of supermartingales, the product being the j=1 term.',
    evidence: 'construction',
    source: 'ADR 0023 correction (fixed-split dilution); Prop A4 in research/2026-07-25-formal-statements-adaptivity-and-gating.md',
    premises: [
      'each increment satisfies E[f(p_s)|F_{s−1}] ≤ 1 — inherited from the per-round certificate',
      'Gap C: the participation/abstention indicator must be F_{t−½}-measurable (decided from block composition, NEVER from the scores)',
    ],
  },
} as const satisfies Record<string, Certificate>;

/**
 * The Lean discharge queue: certificate id → the theorem in `lean/` that would discharge it.
 *
 * Deliberately NOT written into each certificate's `lean` field. That field means "names a
 * machine-checked theorem"; the Lean development has never been compiled (no toolchain in the
 * authoring environment — see lean/README.md), so filling it in would be false by its own
 * definition. When a theorem builds, move its name into the certificate and delete the row here.
 *
 * `validated` records how the STATEMENT was checked in the absence of a proof — which is the part
 * that actually protects against formalising the wrong thing.
 */
export const LEAN_QUEUE: ReadonlyArray<{
  cert: string; theorem: string; status: 'sorry' | 'proved'; validated: string;
}> = [
  { cert: 'min-rule', theorem: 'Tessera.EValue.min_isEValue', status: 'proved',
    validated: 'MACHINE-CHECKED (Lean 4.32.1 + Mathlib). Holds for an ARBITRARY measure — IsProbabilityMeasure is omitted, stronger than first stated. Also MC-checked on correlated inputs.' },
  { cert: 'convex-mean', theorem: 'Tessera.EValue.convexMean_isEValue', status: 'proved',
    validated: 'MACHINE-CHECKED (Lean 4.32.1 + Mathlib), likewise for an arbitrary measure. Also MC + weight-sum guard tests.' },
  { cert: 'sup-adjusted-running-max', theorem: 'Tessera.EBH.supAdjuster_integral', status: 'sorry',
    validated: 'MC: adjusted running max of a null e-process has mean ≤ 1 (test/supfdr.ts, test/e-value.test.ts)' },
  { cert: 'conformal-rank-calibrated', theorem: 'Tessera.Conformal.rank_uniform', status: 'sorry',
    validated: 'EXHAUSTIVE over S_{K+1} for K=2,3,4 vs shipped conformalP: E[p]=0.500000, E[p²]=0.333333' },
  { cert: 'conformal-rank-calibrated', theorem: 'Tessera.EValue.calibrate_isEValue', status: 'sorry',
    validated: '∫f=1 by substitution quadrature; antitone over 2e5 points (test/e-value.test.ts)' },
  { cert: 'half-half-accumulator', theorem: 'Tessera.Conformal.accumulator_mean', status: 'sorry',
    validated: 'MC vs shipped rank construction (test/exchangeability-drift.test.ts)' },
  { cert: '(e-BH itself — not an EValue certificate)', theorem: 'Tessera.EBH.fdp_pointwise', status: 'proved',
    validated: 'MACHINE-CHECKED in lean/core (zero-dependency, no sorry). Definitions additionally verified to match the SHIPPED engine selection-for-selection over 60,000 instances / 100,542 selections, 0 mismatches; and the inequality itself over 995,245 engine selections, 0 violations, worst slack 0.0.' },
  { cert: '(e-BH itself)', theorem: 'Tessera.EBH.fdr_le', status: 'sorry',
    validated: 'follows from fdp_pointwise + linearity; the pointwise lemma is the checked part' },
];

// ─────────────────────────────────────────────────────────────────────────────
// The opaque type
// ─────────────────────────────────────────────────────────────────────────────

declare const EVALUE_BRAND: unique symbol;

/** A number certified as an e-value under a named argument. OPAQUE: the brand is a `unique symbol`
 *  that is never assigned at runtime, so no value of this type can be built outside this module —
 *  not by an object literal, not by structural typing, and not by `as` without an explicit
 *  double-cast that a reviewer will see. Construct via a certified constructor or combinator. */
export interface EValue {
  readonly [EVALUE_BRAND]: true;
  /** The numeric e-value. Read this at the boundary; never rebuild an `EValue` from it. */
  readonly value: number;
  /** The argument this number relies on, including its derivation chain. */
  readonly cert: Certificate;
}

/** Module-private factory — the ONLY place an `EValue` comes into existence. */
function mk(value: number, cert: Certificate): EValue {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(
      `e-value must be finite and nonnegative (got ${value}) under certificate "${cert.id}". ` +
      `A negative or non-finite value means the producing construction is broken, not that the ` +
      `e-value is small — refusing to certify it.`);
  }
  return { value, cert } as unknown as EValue;
}

/** The weakest evidence class in a set of e-values (what a derived value inherits). */
export function weakest(es: ReadonlyArray<EValue>): EvidenceClass {
  return es.reduce<EvidenceClass>((acc, e) => weaker(acc, e.cert.evidence), 'theorem');
}

/** Flatten an EValue's certificate chain — every distinct certificate it depends on. Use for audit
 *  records and for the Lean discharge queue. */
export function certificateChain(e: EValue): Certificate[] {
  const out: Certificate[] = [];
  const seen = new Set<string>();
  const walk = (c: Certificate): void => {
    if (seen.has(c.id)) return;
    seen.add(c.id);
    out.push(c);
    for (const d of c.derivedFrom ?? []) walk(d);
  };
  walk(e.cert);
  return out;
}

/** Every unchecked premise an EValue rests on, de-duplicated. This is the honest risk surface: the
 *  type system guarantees provenance, NOT that these hold. Print it in Mode-B audit records. */
export function openPremises(e: EValue): string[] {
  const out = new Set<string>();
  for (const c of certificateChain(e)) for (const p of c.premises ?? []) out.add(`[${c.id}] ${p}`);
  return [...out];
}

// ─────────────────────────────────────────────────────────────────────────────
// Certified constructors
// ─────────────────────────────────────────────────────────────────────────────

/** Fixed-horizon convex onset mixture over a standardised residual series (ADR 0019 default).
 *  Valid for ONE terminal look at a horizon fixed in advance — see the certificate's caveats. */
export function eNormalizedMixture(residuals: ReadonlyArray<number>, inc: IncrementKind = 'bounded'): EValue {
  return mk(normalizedMixtureEValue(residuals, inc), CERT.NORMALIZED_MIXTURE);
}

/** Horizon-independent geometric (Shiryaev) onset mixture — valid at all times, including
 *  data-dependent looks. The correct object for the always-on loop (audit F5). */
export function eGeometricMixture(residuals: ReadonlyArray<number>, inc: IncrementKind = 'bounded'): EValue {
  return mk(geometricMixtureEValue(residuals, inc), CERT.GEOMETRIC_MIXTURE);
}

/** The κ-grid for the p→e mixture calibrator. Fixed before data (ADR 0023). */
export const CALIBRATOR_KAPPAS: ReadonlyArray<number> = [0.05, 0.1, 0.2, 0.4, 0.6, 0.8];

/** The p→e mixture calibrator f(p) = mean_κ κ p^{κ−1}. `∫₀¹ f = 1` exactly and f is non-increasing,
 *  so `E[f(P)] ≤ 1` for any super-uniform P. Exported raw (a `number`) because it is an INCREMENT,
 *  not a terminal e-value — feed it to `EProcess`, which owns the sequential discipline. */
export function calibrate(p: number): number {
  const pc = Math.min(1, Math.max(1e-12, p));
  let s = 0;
  for (const k of CALIBRATOR_KAPPAS) s += k * Math.pow(pc, k - 1);
  return s / CALIBRATOR_KAPPAS.length;
}

/** A single-round calibrated conformal rank as a terminal e-value. For accumulation across rounds
 *  use `EProcess` — this is the one-look object. */
export function eConformalRank(p: number): EValue {
  return mk(calibrate(p), CERT.CONFORMAL_RANK_CALIBRATED);
}

/** Adapter for a safe-t value computed by the ENGINE. The engine owns the proof; this records that
 *  we are relying on it. Use this instead of the engine's nuisance-robust BF, which audit F1 showed
 *  is NOT an e-value (E[BF|H0] ≈ 1.155 at every calibration length). */
export function eFromEngineSafeT(engineValue: number): EValue {
  return mk(engineValue, CERT.SAFE_T);
}

// ── Adapters for values computed by the existing numeric paths ───────────────────────────────
//
// HONESTY ABOUT WHAT THESE DO. Unlike the constructors above, an adapter cannot verify that the
// number it is handed came from the construction it names — it TRUSTS the caller, exactly as
// `eFromEngineSafeT` trusts the engine. They exist so long-standing harnesses can be routed through
// the certified gate WITHOUT restructuring numerics whose outputs are already published (moving a
// committed figure to satisfy a type would be the wrong trade).
//
// They are still strictly stronger than passing a bare `number[]`: the value acquires a certificate,
// the evidence-class check against the emitter's `validityClass` applies, the derivation appears in
// the audit record, and — the point — a quantity with NO construction at all (an SR running max, a
// p-value) still cannot reach e-BH, because there is no adapter that would name it.
//
// New code should prefer the real constructors (`eNormalizedMixture`, `eGeometricMixture`,
// `eConformalRank`) or `EProcess`, which compute the value and the certificate together.

/** A value produced by the ½·product + ½·onset-mixture accumulator (canary-sim's `combinedEValue`,
 *  or `EProcess.current()` / `.runningMax()`). */
export function eFromOnsetAccumulator(value: number): EValue {
  return mk(value, CERT.HALF_HALF_ACCUMULATOR);
}

/** A value produced by `normalizedMixtureEValue` on a fixed-horizon terminal analysis — including
 *  one already passed through the ADR 0022 triad min rule upstream, which preserves both validity
 *  and evidence class (`min` of two construction-class e-values is construction-class). */
export function eFromNormalizedMixture(value: number): EValue {
  return mk(value, CERT.NORMALIZED_MIXTURE);
}

/** A value produced by `geometricMixtureEValue` — the horizon-INDEPENDENT onset prior. This is the
 *  object the always-on loop requires: per-cycle re-normalisation of a uniform mixture makes each
 *  cycle a different convex combination rather than one e-process, which is audit finding F5. */
export function eFromGeometricMixture(value: number): EValue {
  return mk(value, CERT.GEOMETRIC_MIXTURE);
}

// ─────────────────────────────────────────────────────────────────────────────
// Certified combinators
// ─────────────────────────────────────────────────────────────────────────────

function derive(base: Certificate, inputs: ReadonlyArray<EValue>): Certificate {
  return { ...base, evidence: weaker(base.evidence, weakest(inputs)), derivedFrom: inputs.map((e) => e.cert) };
}

/** The ADR 0022 min rule: `min` of e-values is an e-value, unconditionally. This is the correction
 *  to the triad's flag-then-substitute routing (audit F4), which had no covering theorem. */
export function eMin(...es: readonly EValue[]): EValue {
  if (es.length === 0) throw new RangeError('eMin requires at least one e-value');
  return mk(Math.min(...es.map((e) => e.value)), derive(CERT.MIN_RULE, es));
}

/** Convex combination. Weights default to uniform; they must be nonnegative and sum to ≤ 1 (a
 *  SUB-convex combination is still an e-value, and is the conservative choice). */
export function eConvexMean(es: readonly EValue[], weights?: readonly number[]): EValue {
  if (es.length === 0) throw new RangeError('eConvexMean requires at least one e-value');
  const w = weights ?? es.map(() => 1 / es.length);
  if (w.length !== es.length) throw new RangeError(`weights length ${w.length} ≠ e-values length ${es.length}`);
  if (w.some((x) => !(x >= 0))) throw new RangeError('convex weights must be nonnegative');
  const total = w.reduce((a, b) => a + b, 0);
  if (total > 1 + 1e-9) {
    throw new RangeError(
      `convex weights must sum to ≤ 1 (got ${total}). Weights summing above 1 do NOT preserve ` +
      `E[e|H0] ≤ 1 — that is the N3 rescaling error, not a mixture.`);
  }
  let s = 0;
  for (let i = 0; i < es.length; i++) s += w[i] * es[i].value;
  return mk(s, derive(CERT.CONVEX_MEAN, es));
}

/** The √E − 1 adjuster on a running max, upgrading a per-stop e-value to an ALL-TIMES one
 *  (SupFDR ≤ q). Takes the running max as an `EValue` so it is impossible to apply to an SR sum —
 *  which is precisely audit F3. Pays a real (√-shrinkage) power penalty. */
export function eSupAdjusted(runningMaxOfEProcess: EValue): EValue {
  return mk(supAdjuster(runningMaxOfEProcess.value), derive(CERT.SUP_ADJUSTED, [runningMaxOfEProcess]));
}

// ─────────────────────────────────────────────────────────────────────────────
// Sequential accumulation
// ─────────────────────────────────────────────────────────────────────────────

/** Shiryaev onset hazard for the geometric-prior component (ADR 0023: γ = 0.99). */
export const ONSET_GAMMA = 0.99;

/** Cap on the accumulator, mirroring canary-sim's `E_CAP`. Capping is conservative
 *  (`E[min(M,cap)] ≤ E[M]`) and keeps the process auditable. */
export const E_CAP = 1e12;

/**
 * The ADR 0023 `½·product + ½·geometric-onset-mixture` accumulator, as a stateful object.
 *
 * Exposed as a CLASS rather than a `product(EValue[])` function on purpose. The product of e-values
 * is an e-value only when the increments are SEQUENTIALLY conditional — `E[f(p_t) | F_{t−1}] ≤ 1`
 * given the whole past — and a free-standing product over an array cannot express or enforce that.
 * Offering one would re-create audit F5 (per-cycle re-normalisation) and the fixed-split dilution
 * the ADR 0023 correction fixed. Accumulation therefore has exactly one entry point: `update`.
 *
 * GAP C (see the formal-statements doc § 3): `skip()` exists because units miss rounds and blocks
 * abstain below the K floor. The supermartingale property survives ONLY if the decision to skip is
 * `F_{t−½}`-measurable — taken from block composition at the DESIGN stage, never from the scores.
 * `skip()` documents and localises that obligation; it cannot check it.
 */
export class EProcess {
  private prod = 1;
  private g = 0;
  private k = 0;
  private max = 1;
  private readonly increments: Certificate;

  /** @param incrementCert the certificate for the per-round increment (e.g. CERT.CONFORMAL_RANK_CALIBRATED). */
  constructor(incrementCert: Certificate = CERT.CONFORMAL_RANK_CALIBRATED) {
    this.increments = incrementCert;
  }

  /** Fold in one round's calibrated increment `f`, which must satisfy `E[f|F_{t−1}] ≤ 1`. Use
   *  `calibrate(p)` for a conformal rank. */
  update(f: number): this {
    if (!(f >= 0) || !Number.isFinite(f)) throw new RangeError(`increment must be finite and nonnegative (got ${f})`);
    this.prod = Math.min(E_CAP, this.prod * f);
    this.g = Math.min(E_CAP, f * (this.g + (1 - ONSET_GAMMA) * Math.pow(ONSET_GAMMA, this.k)));
    this.k += 1;
    this.max = Math.max(this.max, this.rawCurrent());
    return this;
  }

  /** Advance the round counter without evidence — the unit did not run, or its block abstained.
   *  CONTRACT: the caller must have decided this from block composition alone (Gap C). */
  skip(): this {
    this.k += 1;
    return this;
  }

  private rawCurrent(): number {
    return 0.5 * this.prod + 0.5 * (this.g + Math.pow(ONSET_GAMMA, this.k));
  }

  /** The current e-value: valid at THIS look. For data-dependent stopping across looks, take
   *  `runningMax()` and pass it through `eSupAdjusted`. */
  current(): EValue {
    return mk(this.rawCurrent(), derive(CERT.HALF_HALF_ACCUMULATOR, [mk(1, this.increments)]));
  }

  /** The running maximum over all looks so far — NOT itself a valid all-times e-value. Feed it to
   *  `eSupAdjusted`, which is why this returns an `EValue` carrying the per-look certificate. */
  runningMax(): EValue {
    return mk(this.max, derive(CERT.HALF_HALF_ACCUMULATOR, [mk(1, this.increments)]));
  }

  /** Rounds elapsed (including skips). */
  get rounds(): number { return this.k; }
}

// ─────────────────────────────────────────────────────────────────────────────
// The escape hatch
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Certify a raw number as an e-value WITHOUT a registered construction. Mirrors the
 * `CS_ALLOW_SHORT` / `CS_ALLOW_UNVALIDATED` convention: available only behind an explicit
 * environment override, loud on stderr, and permanently marked `empirical` so the weakest-link
 * rule taints everything downstream.
 *
 * This exists so migration never requires deleting a call site to make it compile. It is not a
 * convenience: an `unsafeEValue` in a Mode-B path is a finding.
 */
export function unsafeEValue(value: number, justification: string): EValue {
  if (!justification || justification.trim().length < 20) {
    throw new RangeError('unsafeEValue requires a substantive justification (≥ 20 chars) naming what is unproven and who owns closing it');
  }
  if (process.env.CS_ALLOW_UNVALIDATED !== '1') {
    throw new Error(
      `unsafeEValue refused: "${justification}". An uncertified number cannot enter the e-value type ` +
      `without CS_ALLOW_UNVALIDATED=1, which brands the run INVALID FOR FDR. Register a certificate ` +
      `in CERT instead, or route this quantity to Mode A (ranking/abstain, no FDR claim).`);
  }
  process.stderr.write(`\n⚠️  UNSAFE E-VALUE (CS_ALLOW_UNVALIDATED=1): ${justification}\n    The selection this feeds is INVALID FOR FDR.\n\n`);
  return mk(value, {
    id: 'unsafe',
    claim: 'UNPROVEN — no construction registered.',
    evidence: 'empirical',
    source: 'unsafeEValue escape hatch',
    premises: [justification],
  });
}
