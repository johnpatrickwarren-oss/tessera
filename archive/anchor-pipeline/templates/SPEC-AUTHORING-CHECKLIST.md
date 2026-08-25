# SPEC-AUTHORING-CHECKLIST.md (templates/)
# R95 created 2026-05-22 — hard-limit gate discipline (R94 MAJOR-3 lesson).
# Companion to coordination/SPEC-AUTHORING-CHECKLIST.md (full methodology checklist).

## § R94 MAJOR-3 hard-limit gate (Implementer)

**Gate:** When the Implementer encounters a spec § 5.1 hard-limit anti-scope clause,
**transparent disclosure in the routing block does NOT substitute for HALT+DIAGNOSTIC+ESCALATE**.

**Required procedure** (verbatim; any deviation is a HALT-discipline violation):
1. STOP. Do not proceed.
2. Write `coordination/diagnostics/DIAGNOSTIC-R<NN>-<topic>.md` with bounded options:
   - Spec claim (exact quote from spec hard-limit):
   - Reality: (what you observed)
   - Options: A | B | C with tradeoffs (include an "empirically verify" branch where possible)
3. Set `STATUS: ESCALATE` in `coordination/NEXT-ROLE.md`.
4. Append `VIOLATION: halt-discipline` to `coordination/MEMORIAL.md`.
5. Session ends here — operator decides via the option set.

**Key rule:** transparent disclosure of hard-limit anti-scope deviation does NOT substitute for HALT+DIAGNOSTIC+ESCALATE

**Why:** At R94, the Implementer discovered that typesVersions needed to be added to the engine repo's
package.json before the initial tag — in direct contradiction of spec § 5.1 hard-limit "NO modification
of engine source content in the new repo before initial tag." The Implementer proceeded under a
self-justified TACTICAL AUTONOMY reading and disclosed the deviation in the routing block. This violated
the gate discipline: the gate exists precisely so the operator can evaluate whether the hard-limit
should be relaxed or an alternative approach used. Transparency without gate is not accountability.

**Implementer-side hard-limit modification REQUIRES operator gate** — not operator notification after the fact.

This gate fires whenever:
- Any spec § 5.1 "NO modification of..." clause is encountered at implementation time
- Any spec § 6 halt condition is triggered
- Any spec anti-scope is discovered to be insufficient for the actual implementation task

---

## § R91 MAJOR-4 fail-set enumeration gate (Architect / Implementer-hat)

Before predicting the close-state fail band, the Architect MUST run:

```
node --test --test-reporter=tap test/*.test.js 2>&1 | grep '^not ok'
```

And paste the VERBATIM `not ok` list into spec § 0. The fail band prediction must be derived from
this list, not from memory or partial enumeration.

See `coordination/SPEC-AUTHORING-CHECKLIST.md § Fail-set enumeration gate` for full text.

---

## Cross-reference

Full spec-authoring discipline (ALLOWED_SET completeness, Rule 7 self-application, empirical-AC
discipline, pipeline-mandatory discipline, wave-aggregate verification):

→ `coordination/SPEC-AUTHORING-CHECKLIST.md`
