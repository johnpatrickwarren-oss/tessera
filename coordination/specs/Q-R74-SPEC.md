# Q-R74-SPEC — Haiku-for-MU + Reviewer scope differentiation (Phase 4 SLICE 1 round 2)

**Round:** R74
**Tier:** full (intentional bootstrap; mechanism designed here takes effect R75+)
**Round-start SHA:** `0a81fa93f148c1a69cb5222c42aacbc54eeb6bf9` (`chore(R74 directive): Haiku-for-MU + Reviewer scope differentiation; Phase 4 SLICE 1 round 2`). Verified by `git rev-parse HEAD` at Architect session entry.

> **Routing input:** the spec proper (this file) is the load-bearing Implementer input. `Q-R74-SPEC-AUDIT.md` (sidecar) carries the P3 ten-axis pass, pre-emit grilling artifacts, Architect predictions, and decision rationale; Reviewer is authorized to read both. `Q-R74-EMPIRICAL.sh` (chore-A verifier) is committed in the same triad and executed by the Implementer at chore-A.

---

## § 0 Brainstorm — Sonnet-fallback marker set

Per the directive § Primary deliverable item 1: "Sonnet fallback when `--mu-sonnet` flag set OR tier-router output is `full` AND directive contains markers indicating cross-round-pattern memorial work (Architect picks marker set at spec § 0)".

The fallback condition has TWO independent triggers:
- **Operator-explicit:** `--mu-sonnet` CLI flag (any tier).
- **Marker-matched:** `tier === full` AND directive contains a cross-round-pattern marker.

For audit-tier, only the explicit flag triggers Sonnet. MU work on audit-tier rounds is structurally lighter (one less role's findings to digest; no Architect-spec audit) and Haiku covers it.

### Approach A — Memorial-output-volume markers

Trigger Sonnet when the directive's MU scope mentions: `MU batch`, `Memorial-Updater for R\d+-R\d+`, `cross-project promotion`, `Rule 5 threshold`, `3-instance threshold`.

- **Strengths:** ties Sonnet activation to actual MU workload heuristic — multi-round catch-up + cross-project rule derivation.
- **Weaknesses:** narrow markers may miss substantive single-round MU work (e.g., a round that ESCALATES + Reviewer-2 + operator-resolution but doesn't say "MU batch").
- **Risk (false-negative):** Haiku synthesizes a complex correction cycle into a flat memorial; quality regression on the cross-project rule derivation surface.

### Approach B — Round-content-complexity markers

Trigger Sonnet when the directive contains ESCALATE-class anchors: `ESCALATE`, `CRITICAL`, `Reviewer-2`, `operator-resolution`, `Option [A-F]`, `fix cycle`.

- **Strengths:** catches rounds where MU has to disentangle multi-Reviewer-pass + operator-resolution flow.
- **Weaknesses:** OVER-TRIGGERS. Most full-tier rounds eventually surface ESCALATE-class anchors via the Reviewer routing rule (`CRITICAL → ESCALATE`); the marker set degenerates to "Sonnet for nearly all full-tier" and the directive's stated ~3× cost reduction collapses.
- **Risk:** broad marker set defeats Phase 4 SLICE 1 cost-efficiency mandate.

### Approach C — Hybrid (four narrow anchor classes) — SELECTED

Trigger Sonnet on full-tier when the directive contains ANY of FOUR anchor classes (any class triggers; class-internal OR semantics):

- **Class A — Cross-project rule derivation:** the directive prose names `cross-project promotion`, `promote to cross-project`, `Rule 5 threshold`, `3-instance threshold`, OR `cross-project canonical`.
- **Class B — Multi-round catch-up:** the directive contains the phrase `MU batch`, OR matches the regex `Memorial-Updater for R\d+\s*[-–]\s*R\d+`, OR contains `REINFORCEMENT consolidation`, OR `MR-\d+\s+Pass`, OR `re-accretion guard`.
- **Class C — Multi-Reviewer-pass ESCALATE chain:** the directive contains BOTH the word `Reviewer-2` AND the word `ESCALATE`. This co-occurrence captures rounds where multiple cold-eye Reviewer passes corrected each other (R66, R72 precedent); MU has to disentangle two independent finding sets.
- **Class D — Operator-resolution archetype:** the directive contains BOTH `operator-resolution` (or `operator resolution`) AND a phrase matching the regex `Option\s+[A-F]\b` (signals a bounded-options ESCALATE with a chosen resolution that propagates to spec + code + memorial).

**Selection rationale:**

- **Calibration:** mentally walked the Tessera commit history. Rounds that materially needed Sonnet's reasoning quality (R45 + R46 chain — empirical-command-attestation cross-project derivation; R66 + R72 — multi-Reviewer-pass) all fire ≥ 1 anchor class. Routine full-tier rounds (R67-R71, R73) do NOT fire any anchor (no Reviewer-2 pass; no operator-resolution Option; no MU batch).
- **Conservative bias toward Sonnet:** when any anchor fires, Sonnet — the directive's stated goal is "Haiku for routine pattern-matching with Sonnet fallback for substantive cross-round derivations." Each anchor class names a substantive derivation signal.
- **Operator override always wins:** `--mu-sonnet` flag forces Sonnet even when no anchor fires (anchor set is heuristic; operator judgment is authoritative).
- **Determinism:** all four anchor classes are grep-able regex patterns over the directive text. Test ACs verify the matcher deterministically.

**Rejected: Approach A** (markers too narrow — misses ESCALATE-fix-cycle rounds like R72).
**Rejected: Approach B** (markers too broad — over-triggers; defeats cost-savings goal).

### § 0.1 Effective decision tree

```
INPUTS: tier ∈ {full, audit, solo, coordinator-only}, --mu-sonnet flag, directive text
OUTPUT: model ∈ {claude-haiku-4-5-20251001, claude-sonnet-4-6}

1. If tier ∈ {solo, coordinator-only}: MU not dispatched; selection N/A.
2. Else if --mu-sonnet=true: model = sonnet; rationale = "operator override (--mu-sonnet)".
3. Else if tier == full AND any anchor class A/B/C/D matches the directive:
       model = sonnet; rationale = "cross-round-pattern marker: <class>; matched: <anchor>".
4. Else: model = haiku; rationale = "default haiku (no cross-round-pattern marker)".
```

### § 0.2 Reviewer scope decision tree

The directive defines two modes:

- **Full-adversarial mode** (default for tier=full): adversarial counterfactual + right-reasons audit + cold-eye independent binding-command re-runs. This is the current CLAUDE-REVIEWER.md mandate ("find what the Implementer got wrong; zero findings = failed audit").
- **Structural-only mode** (default for tier=audit): binding-command re-runs + AC-binding structural integrity + ALLOWED_SET diff. NO adversarial counterfactual; NO right-reasons audit; NO mandatory "find a mistake" stance.

The pipeline dispatches the Reviewer with `--reviewer-scope full|structural`. Defaults:

```
tier=full   → REVIEWER_SCOPE=full      (full-adversarial)
tier=audit  → REVIEWER_SCOPE=structural (structural-only)
tier=solo   → Reviewer NOT invoked     (existing behavior; ROLES tuple excludes it)
tier=coordinator-only → Reviewer NOT invoked (existing behavior)
```

Operator can override per round with `--reviewer-scope <mode>`.

The scope value is plumbed to the Reviewer via the prompt body (added to `build_reviewer_prompt` per § 3.3 pseudocode); the Reviewer session reads CLAUDE-REVIEWER.md's `## Mode: Structural-only Reviewer` section to understand the structural-only mandate.

---

## § 1 Design — component boundaries + integration points

### § 1.1 Component inventory

| Path | Status | Description |
|---|---|---|
| `scripts/mu-model-select.ts` | NEW | CLI tool that takes `--directive <path> --tier <tier> [--mu-sonnet]` and outputs JSON `{round, model, rationale, decision_path, selector_version}`. Bash dispatches it; tests invoke it as a child process. |
| `scripts/mu-model-select-fixtures/corpus.json` | NEW | Validation corpus: array of `{name, fixture_path, tier, mu_sonnet_flag, expected_model}` entries. Source-of-truth for AC-R74-4..9. |
| `scripts/mu-model-select-fixtures/F1-default-haiku.md` | NEW | Fixture: directive with no anchor → Haiku (tier=full). |
| `scripts/mu-model-select-fixtures/F2-class-A-promotion.md` | NEW | Fixture: directive containing `cross-project promotion` → Sonnet (Class A). |
| `scripts/mu-model-select-fixtures/F3-class-B-batch.md` | NEW | Fixture: directive containing `MU batch` → Sonnet (Class B). |
| `scripts/mu-model-select-fixtures/F4-class-C-reviewer2.md` | NEW | Fixture: directive containing both `Reviewer-2` and `ESCALATE` → Sonnet (Class C). |
| `scripts/mu-model-select-fixtures/F5-class-D-option.md` | NEW | Fixture: directive containing both `operator-resolution` and `Option B` → Sonnet (Class D). |
| `scripts/mu-model-select-fixtures/F6-audit-no-anchor.md` | NEW | Fixture: directive on tier=audit with no anchor → Haiku (anchors NOT checked on audit). |
| `test/q74-mu-haiku-reviewer-scope.test.ts` | NEW | Runtime ACs against the CLI + against run-pipeline.sh content. |
| `run-pipeline.sh` | MODIFIED | Add `--mu-sonnet` + `--reviewer-scope` CLI flags; replace `MODEL_MEMORIAL="claude-sonnet-4-6"` with dynamic computation via `scripts/mu-model-select.js`; plumb `REVIEWER_SCOPE` into `build_reviewer_prompt`; extend routing-log schema with MU model + Reviewer scope + Sonnet-fallback rationale. Tessera-temporary divergence per operator-confirmed pattern; rebase at R76 Anchor merge. |
| `CLAUDE-REVIEWER.md` | MODIFIED | Add `## Mode: Structural-only Reviewer` section between role-boundary block (current line 41-42) and REINFORCEMENTS divider (current line 44). NOT a REINFORCED entry — pure mode-docs prose. |
| `package.json` | MODIFIED | Add `mu-model-select` npm script. |
| `coordination/specs/Q-R74-SPEC.md` | NEW | This file. |
| `coordination/specs/Q-R74-SPEC-AUDIT.md` | NEW | Spec audit sidecar. |
| `coordination/specs/Q-R74-EMPIRICAL.sh` | NEW | chore-A verifier. |
| `coordination/reviews/REVIEWER-REPORT-R74.md` | NEW (Reviewer-stage) | Not part of chore-A. |
| `coordination/MEMORIAL.md` | APPEND | Round entries per role. |
| `coordination/NEXT-ROLE.md` | MODIFIED | Architect / Implementer / Reviewer / MU routing blocks. |

**Engine surfaces consulted (READ-ONLY):** none. R74 is tooling + framework-docs only.

**Anti-scope hard:** `scripts/tier-router.ts`, `scripts/tier-router-validate.ts`, `scripts/tier-router-criteria.md`, `scripts/tier-router-fixtures/**` (R73 frozen per directive). `engine/**`, `demos/**`, `tools/coverage-saturation.ts`, `tools/build-canned-demos.ts`, `tools/demo-scenario.ts`. CLAUDE-ARCHITECT/IMPLEMENTER/MEMORIAL/COMMON REINFORCEMENTS sections. CLAUDE-COORDINATOR REINFORCEMENTS section. CROSS-PROJECT-MEMORIAL.md. `tsconfig.test.json` (already includes `scripts/**/*.ts` from R73; no further changes needed for R74).

### § 1.2 Integration points

| Integration | Surface | Direction | Failure mode at boundary |
|---|---|---|---|
| `scripts/mu-model-select.ts` ← directive text + tier + flag | reads `--directive <path>` content; reads `--tier <tier>`; reads `--mu-sonnet` flag presence | inbound | Unreadable directive OR missing `--tier`: exit 1 + stderr message; no JSON on stdout. |
| `scripts/mu-model-select.ts` → JSON output | emits a single JSON object on stdout; exit 0 on success | outbound | Internal logic always emits valid JSON or exits 1 (no implicit failure mode). |
| `run-pipeline.sh` ← `scripts/mu-model-select.js` | spawns `node scripts/mu-model-select.js --directive coordination/NEXT-ROLE.md --tier "$TIER" ${MU_SONNET:+--mu-sonnet}`; parses `model` field via node-one-liner | inbound | Spawn non-zero exit OR invalid JSON → fallback to default Haiku + log warning. NEVER aborts the pipeline. |
| `run-pipeline.sh` → `MODEL_MEMORIAL` env | sets the global so `get_model MEMORIAL-UPDATER` returns the selected model | outbound | The selection happens BEFORE main loop; MU dispatch uses the resolved value. |
| `run-pipeline.sh` → `REVIEWER_SCOPE` env | sets the global from `--reviewer-scope` flag (explicit) OR derives from `$TIER` | outbound | Plumbed to `build_reviewer_prompt` which embeds it in the Reviewer prompt body. |
| `build_reviewer_prompt` → Reviewer prompt | conditionally injects a "MODE: STRUCTURAL-ONLY" header + scope note into the prompt | outbound | If `$REVIEWER_SCOPE` is unset/empty: prompt body is unchanged (backward-compatible default = full-adversarial). |
| `run-pipeline.sh` → routing log | extends `coordination/logs/ROUND-${ROUND}-ROUTING.md` with three sections: Tier, MU model, Reviewer scope | outbound | Log-write failure → warning; pipeline continues. |
| CLAUDE-REVIEWER.md `## Mode: Structural-only Reviewer` section ← Reviewer session | read at session boot via `--append-system-prompt` (existing mechanism at `run-pipeline.sh:1543`) | inbound (system prompt) | Section present in file = always loaded; Reviewer applies the scope based on prompt-body MODE indicator. |

### § 1.3 Failure modes (per-integration)

| Integration | Failure observable | Required mitigation in this round |
|---|---|---|
| mu-model-select on missing `--tier` | exit 1 + stderr | AC-R74-3 (structural). |
| mu-model-select on unreadable directive | exit 1 + stderr | AC-R74-3 (structural). |
| mu-model-select on tier=solo / coordinator-only | structural choice: emits `{model: "n/a", rationale: "MU not dispatched on this tier"}` with exit 0 (the script is still callable, but bash MAY skip the call entirely for these tiers; spec leaves this as TACTICAL AUTONOMY). | AC-R74-10 covers solo/coordinator-only case. |
| run-pipeline.sh: scripts/mu-model-select.js not compiled (pre-tsc state) | spawn ENOENT or runtime error | Bash catches the error and falls back to default Haiku with `log_warn`. AC-R74-16 verifies the fallback path. |
| Reviewer prompt: REVIEWER_SCOPE not set | prompt is the existing full-adversarial body | backward-compat: identical to pre-R74 behavior. AC-R74-13 verifies. |
| CLAUDE-REVIEWER.md missing `## Mode: Structural-only Reviewer` heading | structural — would mean a regression in the round itself | AC-R74-15 (structural grep). |

---

## § 2 Mechanism — load-bearing decisions

### § 2.1 `scripts/mu-model-select.ts` input contract

CLI usage: `node scripts/mu-model-select.js --directive <path> --tier <tier> [--mu-sonnet]`

- `--directive <path>` (required): path to the round directive file. Default behavior IF the operator omits the flag (mostly for ad-hoc operator invocation): `coordination/NEXT-ROLE.md`.
- `--tier <tier>` (required): one of `full`, `audit`, `solo`, `coordinator-only`. Maps to `$TIER` from the pipeline.
- `--mu-sonnet` (optional boolean flag): forces Sonnet regardless of marker check.

The selector extracts the directive section the same way `tier-router.ts` does — matches the most-recent `## § R{N} Round-scope directive` block; if no match, treats the whole file as input.

### § 2.2 `scripts/mu-model-select.ts` output JSON shape

The selector emits a single JSON object on stdout. Shape:

```json
{
  "round": "R74",
  "model": "claude-haiku-4-5-20251001",
  "rationale": "default haiku (no cross-round-pattern marker)",
  "decision_path": ["default_haiku"],
  "selector_version": "0.1.0",
  "matched_anchors": []
}
```

Field semantics:

- `round`: string; round id extracted from directive (same logic as tier-router); `"unknown"` if none.
- `model`: one of `"claude-haiku-4-5-20251001"`, `"claude-sonnet-4-6"`, or `"n/a"` (latter for tier ∈ {solo, coordinator-only}).
- `rationale`: ≤ 200-char one-line human-readable string naming the decision branch.
- `decision_path`: non-empty array of strings; chain of decision branches. Allowed values: `["operator_override"]`, `["marker_match", "class_<A|B|C|D>"]`, `["default_haiku"]`, `["tier_no_mu"]`.
- `selector_version`: hardcoded version literal (`"0.1.0"` at R74 chore-A).
- `matched_anchors`: array of strings; for each anchor class that fired, the verbatim matched substring (capped at ≤ 5 entries to bound output size).

### § 2.3 Anchor patterns (literal regex set authored at spec-emit)

```
Class A (cross-project rule derivation):
  /cross-project promotion/i
  /promote to cross-project/i
  /Rule 5 threshold/i
  /3-instance threshold/i
  /cross-project canonical/i

Class B (multi-round catch-up):
  /\bMU batch\b/i
  /Memorial-Updater for R\d+\s*[-–]\s*R\d+/
  /REINFORCEMENT consolidation/i
  /\bMR-\d+\s+Pass\b/i
  /re-accretion guard/i

Class C (multi-Reviewer-pass ESCALATE chain):
  Both /Reviewer-2/ AND /\bESCALATE\b/ present in the same directive content.

Class D (operator-resolution archetype):
  Both /operator[ -]resolution/i AND /\bOption\s+[A-F]\b/ present in the same directive content.
```

Class C and Class D require co-occurrence of two patterns (both must match the same directive). Classes A and B fire on any one of their alternatives.

### § 2.4 Decision algorithm

```
function selectModel(content: string, tier: string, muSonnet: boolean): Result {
  // Branch 1: tier has no MU role
  if (tier === 'solo' || tier === 'coordinator-only') {
    return { model: 'n/a', rationale: 'MU not dispatched on this tier', decision_path: ['tier_no_mu'], matched_anchors: [] };
  }

  // Branch 2: operator override
  if (muSonnet) {
    return { model: SONNET, rationale: 'operator override (--mu-sonnet)', decision_path: ['operator_override'], matched_anchors: [] };
  }

  // Branch 3: marker check (only on full-tier)
  if (tier === 'full') {
    const matched = checkAnchorClasses(content);
    if (matched.length > 0) {
      const classes = matched.map(m => m.class).join('+');
      return {
        model: SONNET,
        rationale: `cross-round-pattern marker (class ${classes}): ${matched[0].anchor}`,
        decision_path: ['marker_match', `class_${matched[0].class}`],
        matched_anchors: matched.slice(0, 5).map(m => m.anchor),
      };
    }
  }

  // Branch 4: default Haiku
  return { model: HAIKU, rationale: 'default haiku (no cross-round-pattern marker)', decision_path: ['default_haiku'], matched_anchors: [] };
}
```

### § 2.5 `run-pipeline.sh` integration contract

Three modifications:

**(a) New CLI flags** — added to the existing `while [[ $# -gt 0 ]]; do case $1 in ... esac done` argument-parsing loop (current location: `run-pipeline.sh:118-184`):

```bash
--mu-sonnet)        MU_SONNET=true;    shift   ;;
--reviewer-scope)   REVIEWER_SCOPE_EXPLICIT="$2"; shift 2 ;;
```

Plus defaults set near the existing tier defaults (top of script):

```bash
MU_SONNET=false
REVIEWER_SCOPE_EXPLICIT=""   # set by --reviewer-scope flag
REVIEWER_SCOPE=""            # resolved below
```

**(b) Replace static `MODEL_MEMORIAL="claude-sonnet-4-6"`** at `run-pipeline.sh:78` with TWO defaults + dynamic resolution:

```bash
# Two model candidates for MU; selector chooses between them per directive content.
MODEL_MEMORIAL_DEFAULT="claude-haiku-4-5-20251001"   # ~3× cost reduction vs Sonnet (R74)
MODEL_MEMORIAL_SONNET="claude-sonnet-4-6"             # fallback for substantive cross-round work
MODEL_MEMORIAL=""                                     # resolved at TIER-decision time
MU_FALLBACK_RATIONALE=""
```

**(c) Resolve `MODEL_MEMORIAL` + `REVIEWER_SCOPE` AFTER `TIER` is finalized** (i.e., after the `--auto-tier` integration block at `run-pipeline.sh:186-209`). Add a new block:

```bash
# ── MU model selection (R74) ──────────────────────────────────────────────────
# Default: Haiku 4.5 (~3× cost vs Sonnet for routine pattern-matching MU work).
# Sonnet fallback when (a) --mu-sonnet flag set OR (b) tier=full AND directive
# contains cross-round-pattern marker. Selector mechanism at scripts/mu-model-select.ts.
MU_SELECT_OUT=""
if [[ "$TIER" == "solo" ]] || $COORDINATOR_MODE; then
  MODEL_MEMORIAL="$MODEL_MEMORIAL_DEFAULT"   # MU not dispatched; value irrelevant but set for log
  MU_FALLBACK_RATIONALE="MU not dispatched on this tier"
else
  mu_select_args=("--directive" "$COORD/NEXT-ROLE.md" "--tier" "$TIER")
  $MU_SONNET && mu_select_args+=("--mu-sonnet")
  MU_SELECT_OUT="$(node scripts/mu-model-select.js "${mu_select_args[@]}" 2>/dev/null)" || true
  if [[ -n "$MU_SELECT_OUT" ]]; then
    MU_MODEL_RAW="$(echo "$MU_SELECT_OUT" | node -e \
      "process.stdin.resume(); let d=''; process.stdin.on('data',c=>d+=c); process.stdin.on('end',()=>{ try{const j=JSON.parse(d); console.log(j.model+'|'+(j.rationale||''))}catch{} })" 2>/dev/null)" || true
    MU_MODEL_FIELD="${MU_MODEL_RAW%%|*}"
    MU_FALLBACK_RATIONALE="${MU_MODEL_RAW#*|}"
    case "$MU_MODEL_FIELD" in
      claude-haiku-*)  MODEL_MEMORIAL="$MODEL_MEMORIAL_DEFAULT" ;;
      claude-sonnet-*) MODEL_MEMORIAL="$MODEL_MEMORIAL_SONNET"  ;;
      *)               MODEL_MEMORIAL="$MODEL_MEMORIAL_DEFAULT"
                       MU_FALLBACK_RATIONALE="selector returned unexpected model; fallback haiku"
                       ;;
    esac
  else
    MODEL_MEMORIAL="$MODEL_MEMORIAL_DEFAULT"
    MU_FALLBACK_RATIONALE="selector unavailable; fallback haiku"
  fi
fi

# ── Reviewer scope selection (R74) ────────────────────────────────────────────
if [[ -n "$REVIEWER_SCOPE_EXPLICIT" ]]; then
  case "$REVIEWER_SCOPE_EXPLICIT" in
    full|structural) REVIEWER_SCOPE="$REVIEWER_SCOPE_EXPLICIT" ;;
    *) echo "ERROR: --reviewer-scope must be 'full' or 'structural'; got '$REVIEWER_SCOPE_EXPLICIT'" >&2; exit 1 ;;
  esac
else
  case "$TIER" in
    full)  REVIEWER_SCOPE="full" ;;
    audit) REVIEWER_SCOPE="structural" ;;
    *)     REVIEWER_SCOPE="" ;;   # solo / coordinator-only: Reviewer not invoked; empty
  esac
fi
```

**(d) Plumb `REVIEWER_SCOPE` into `build_reviewer_prompt`** (current location: `run-pipeline.sh:1076`). Add a conditional block near the top of the function:

```bash
local scope_note=""
if [[ "$REVIEWER_SCOPE" == "structural" ]]; then
  scope_note="
**MODE: STRUCTURAL-ONLY REVIEWER (R74).**
Per CLAUDE-REVIEWER.md \"## Mode: Structural-only Reviewer\" section, this
audit is scoped to: (1) binding-command re-runs verbatim, (2) AC-binding
structural integrity walk, (3) ALLOWED_SET diff verification. DO NOT perform
adversarial counterfactual reasoning. DO NOT perform a right-reasons audit.
The \"find what the Implementer got wrong\" mandate is SUSPENDED in this
mode — you are verifying structural compliance, not assuming a mistake.

Routing unchanged: CRITICAL → ESCALATE; MAJOR or below → MERGE-READY.
"
fi
```

Then inject `${scope_note}` into the prompt body's `cat > "$prompt_file" << PROMPT` heredoc, immediately after `You are the REVIEWER for round $ROUND.`. When `$REVIEWER_SCOPE` is unset OR `"full"`, `$scope_note` is empty and the prompt is byte-identical to the pre-R74 default.

**(e) Routing-log schema extension** — modify the `--auto-tier` block (`run-pipeline.sh:186-209`) to emit a structured Markdown log, AND emit the log whenever the pipeline runs (not just on `--auto-tier`). New schema:

```markdown
# Round R74 routing

## Tier
Source: --auto-tier  (or: explicit --tier <X>)
Final TIER: <TIER>
Router output (JSON; only present when --auto-tier was used): {...}

## MU model
Model: <claude-haiku-4-5-20251001 | claude-sonnet-4-6>
Rationale: <rationale string from mu-model-select OR fallback rationale>
Selector output (JSON; only present when selector was invoked): {...}

## Reviewer scope
Scope: <full | structural | (not invoked on this tier)>
Source: <explicit --reviewer-scope <X> | default for tier=<X>>
```

Concrete emission code goes immediately AFTER the MU + Reviewer scope resolution blocks:

```bash
# ── Routing log (R74; extends R73 auto-tier log) ─────────────────────────────
mkdir -p coordination/logs
ROUTING_LOG="coordination/logs/ROUND-${ROUND}-ROUTING.md"
{
  echo "# Round ${ROUND} routing"
  echo ""
  echo "## Tier"
  if $AUTO_TIER && [[ "$TIER_EXPLICIT" != "true" ]]; then
    echo "Source: --auto-tier"
  elif [[ "$TIER_EXPLICIT" == "true" ]]; then
    echo "Source: explicit --tier ${TIER}"
  else
    echo "Source: pipeline default"
  fi
  echo "Final TIER: ${TIER}"
  if [[ -n "${ROUTER_OUT:-}" ]]; then
    echo "Router output: ${ROUTER_OUT}"
  fi
  echo ""
  echo "## MU model"
  echo "Model: ${MODEL_MEMORIAL}"
  echo "Rationale: ${MU_FALLBACK_RATIONALE}"
  if [[ -n "${MU_SELECT_OUT:-}" ]]; then
    echo "Selector output: ${MU_SELECT_OUT}"
  fi
  echo ""
  echo "## Reviewer scope"
  if [[ -z "$REVIEWER_SCOPE" ]]; then
    echo "Scope: (not invoked on this tier)"
  else
    echo "Scope: ${REVIEWER_SCOPE}"
    if [[ -n "$REVIEWER_SCOPE_EXPLICIT" ]]; then
      echo "Source: explicit --reviewer-scope ${REVIEWER_SCOPE_EXPLICIT}"
    else
      echo "Source: default for tier=${TIER}"
    fi
  fi
} > "$ROUTING_LOG"
```

This block is unconditional — every pipeline invocation writes a routing log. The existing R73 `--auto-tier` log-emission block is REPLACED by this new structure (R73's bare-JSON log shape was a precursor; R74 extends and standardizes).

### § 2.6 `CLAUDE-REVIEWER.md` Mode docs addition

Insert a new section BETWEEN current line 42 (`Document findings. Do not fix. Do not re-implement.`) and current line 44 (`# ── REVIEWER REINFORCEMENTS ───────────────────────────────────────────────────`). The exact insertion content:

```
## Mode: Structural-only Reviewer

When the pipeline dispatches you with `--reviewer-scope structural` (default
for tier=audit; operator override flag), restrict your audit to:

1. **Binding-command re-runs.** Execute every binding command declared by the
   spec at the Reviewer HEAD and record the actual observed output verbatim.
   If any binding command's output contradicts the spec's predicted shape OR
   the Implementer's attestation, that is a finding.
2. **AC-binding structural integrity.** Walk every AC's "Then" clause and
   verify the test assertion (or empirical-script block) named in the AC's
   binding column exercises that clause. If an AC names a test but the test
   does not assert the named property, that is a finding.
3. **ALLOWED_SET diff verification.** Run `git diff <round-start-SHA>..HEAD
   --name-only` and verify every emitted path is in the spec's ALLOWED_SET
   enumeration OR matches a documented regex carve-out.

DO NOT in structural-only mode:
- **Adversarial counterfactual.** No "what if the Implementer faked this"
  reasoning. The structural integrity check above replaces it.
- **Right-reasons audit.** No 3-test trace to spec requirement. The AC-binding
  walk above replaces it.
- The "find what the Implementer got wrong; zero findings = failed audit"
  mandate is SUSPENDED. You are verifying structural compliance, not assuming
  a mistake.

Structural-only mode exists for tier=audit rounds where full-adversarial
review cost outweighs the marginal catch rate. Cost-efficiency mechanism per
R74; full-adversarial remains the default for tier=full and the override
target via `--reviewer-scope full` for high-stakes audit-tier work.

Routing rule unchanged: CRITICAL exists → STATUS: ESCALATE; MAJOR or below →
STATUS: MERGE-READY. MEMORIAL append discipline unchanged.

```

This is NOT a `# REINFORCED` line — it is pure mode-documentation prose.

### § 2.7 `package.json` modification

Add the following line to the `scripts` block (preserve all existing entries verbatim):

```json
"mu-model-select": "pnpm exec node scripts/mu-model-select.js"
```

Order: insert immediately after the existing `tier-router:validate` entry (R73 precedent).

### § 2.8 Tessera-temporary divergence note (for MEMORIAL)

`run-pipeline.sh` is Tessera-vendored framework code. The R73 divergence note already documented this; R74 extends the divergence with `--mu-sonnet` + `--reviewer-scope` flags + dynamic `MODEL_MEMORIAL` resolution. R74 IMPLEMENTER MEMORIAL entry MUST include a CONFIRMATION line documenting:

- The added flags (`--mu-sonnet`, `--reviewer-scope`).
- The `MODEL_MEMORIAL` static→dynamic replacement.
- The Tessera-temporary nature of the divergence and the R76 Anchor rebase plan.

---

## § 3 Per-file pseudocode

### § 3.1 `scripts/mu-model-select.ts`

```typescript
// scripts/mu-model-select.ts — Memorial-Updater model selector (R74).
// Outputs JSON {round, model, rationale, decision_path, selector_version, matched_anchors}.
// Bash invokes this and parses the model field to set MODEL_MEMORIAL.

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const SELECTOR_VERSION = '0.1.0';
const HAIKU = 'claude-haiku-4-5-20251001';
const SONNET = 'claude-sonnet-4-6';
const NA = 'n/a';

type Tier = 'full' | 'audit' | 'solo' | 'coordinator-only';

interface SelectorResult {
  round: string;
  model: string;
  rationale: string;
  decision_path: string[];
  selector_version: string;
  matched_anchors: string[];
}

interface CLIArgs {
  directive: string;
  tier: Tier;
  muSonnet: boolean;
}

function parseArgs(argv: string[]): CLIArgs {
  let directive = 'coordination/NEXT-ROLE.md';
  let tier: string | undefined;
  let muSonnet = false;

  for (let i = 2; i < argv.length; i++) {
    switch (argv[i]) {
      case '--directive': directive = argv[++i]; break;
      case '--tier':      tier = argv[++i]; break;
      case '--mu-sonnet': muSonnet = true; break;
      default:
        process.stderr.write(`mu-model-select: unknown argument: ${argv[i]}\n`);
        process.exit(1);
    }
  }
  if (!tier) {
    process.stderr.write('mu-model-select: --tier <full|audit|solo|coordinator-only> is required\n');
    process.exit(1);
  }
  if (!['full', 'audit', 'solo', 'coordinator-only'].includes(tier)) {
    process.stderr.write(`mu-model-select: invalid --tier value: ${tier}\n`);
    process.exit(1);
  }
  return { directive, tier: tier as Tier, muSonnet };
}

function loadDirective(path: string): { content: string; round: string } {
  const absolutePath = resolve(path);
  if (!existsSync(absolutePath)) {
    process.stderr.write(`mu-model-select: directive unreadable: ${path}\n`);
    process.exit(1);
  }
  const raw = readFileSync(absolutePath, 'utf-8');
  const sectionMatch = raw.match(
    /^## § R(\d+) Round-scope directive[\s\S]*?(?=^## § |^---\s*$|\Z)/m,
  );
  const round = sectionMatch
    ? `R${sectionMatch[1]}`
    : (raw.match(/^CURRENT-ROUND:\s*(R\d+)/m)?.[1] ?? 'unknown');
  const content = sectionMatch ? sectionMatch[0] : raw;
  return { content, round };
}

interface AnchorHit { class: 'A' | 'B' | 'C' | 'D'; anchor: string; }

function checkAnchorClasses(content: string): AnchorHit[] {
  const hits: AnchorHit[] = [];

  // Class A — cross-project rule derivation (any one fires)
  const classA: RegExp[] = [
    /cross-project promotion/i,
    /promote to cross-project/i,
    /Rule 5 threshold/i,
    /3-instance threshold/i,
    /cross-project canonical/i,
  ];
  for (const re of classA) {
    const m = content.match(re);
    if (m) { hits.push({ class: 'A', anchor: m[0] }); break; }
  }

  // Class B — multi-round catch-up (any one fires)
  const classB: RegExp[] = [
    /\bMU batch\b/i,
    /Memorial-Updater for R\d+\s*[-–]\s*R\d+/,
    /REINFORCEMENT consolidation/i,
    /\bMR-\d+\s+Pass\b/i,
    /re-accretion guard/i,
  ];
  for (const re of classB) {
    const m = content.match(re);
    if (m) { hits.push({ class: 'B', anchor: m[0] }); break; }
  }

  // Class C — multi-Reviewer-pass ESCALATE (BOTH must fire)
  const reviewer2 = content.match(/Reviewer-2/);
  const escalate  = content.match(/\bESCALATE\b/);
  if (reviewer2 && escalate) {
    hits.push({ class: 'C', anchor: `Reviewer-2 + ESCALATE` });
  }

  // Class D — operator-resolution archetype (BOTH must fire)
  const opres   = content.match(/operator[ -]resolution/i);
  const optionX = content.match(/\bOption\s+[A-F]\b/);
  if (opres && optionX) {
    hits.push({ class: 'D', anchor: `${opres[0]} + ${optionX[0]}` });
  }

  return hits;
}

function selectModel(content: string, round: string, tier: Tier, muSonnet: boolean): SelectorResult {
  // Branch 1: tier has no MU role
  if (tier === 'solo' || tier === 'coordinator-only') {
    return {
      round, model: NA,
      rationale: 'MU not dispatched on this tier',
      decision_path: ['tier_no_mu'],
      selector_version: SELECTOR_VERSION,
      matched_anchors: [],
    };
  }

  // Branch 2: operator override
  if (muSonnet) {
    return {
      round, model: SONNET,
      rationale: 'operator override (--mu-sonnet)',
      decision_path: ['operator_override'],
      selector_version: SELECTOR_VERSION,
      matched_anchors: [],
    };
  }

  // Branch 3: marker check (only on full-tier)
  if (tier === 'full') {
    const matched = checkAnchorClasses(content);
    if (matched.length > 0) {
      const classes = Array.from(new Set(matched.map(m => m.class))).join('+');
      return {
        round, model: SONNET,
        rationale: `cross-round-pattern marker (class ${classes}): ${matched[0].anchor}`.slice(0, 200),
        decision_path: ['marker_match', `class_${matched[0].class}`],
        selector_version: SELECTOR_VERSION,
        matched_anchors: matched.slice(0, 5).map(m => m.anchor),
      };
    }
  }

  // Branch 4: default Haiku (audit-tier no anchor; or full-tier no anchor)
  return {
    round, model: HAIKU,
    rationale: 'default haiku (no cross-round-pattern marker)',
    decision_path: ['default_haiku'],
    selector_version: SELECTOR_VERSION,
    matched_anchors: [],
  };
}

function main(): void {
  const args = parseArgs(process.argv);
  const { content, round } = loadDirective(args.directive);
  const result = selectModel(content, round, args.tier, args.muSonnet);
  process.stdout.write(JSON.stringify(result) + '\n');
  process.exit(0);
}

main();
```

**Implementer notes (TACTICAL AUTONOMY scope):**
- Internal helper names, JSDoc wording, blank lines, import order may vary.
- `.js` extension imports per R70/R71/R73 precedent if any internal imports are added.
- The exact ordering of Class A/B/C/D anchor regex within their array literals is irrelevant (first-match semantics within each class).

### § 3.2 `scripts/mu-model-select-fixtures/corpus.json`

```json
{
  "schema_version": "0.1.0",
  "entries": [
    { "name": "F1-default-haiku",
      "fixture_path": "scripts/mu-model-select-fixtures/F1-default-haiku.md",
      "tier": "full", "mu_sonnet_flag": false,
      "expected_model": "claude-haiku-4-5-20251001",
      "expected_decision_path_head": "default_haiku" },
    { "name": "F2-class-A-promotion",
      "fixture_path": "scripts/mu-model-select-fixtures/F2-class-A-promotion.md",
      "tier": "full", "mu_sonnet_flag": false,
      "expected_model": "claude-sonnet-4-6",
      "expected_decision_path_head": "marker_match" },
    { "name": "F3-class-B-batch",
      "fixture_path": "scripts/mu-model-select-fixtures/F3-class-B-batch.md",
      "tier": "full", "mu_sonnet_flag": false,
      "expected_model": "claude-sonnet-4-6",
      "expected_decision_path_head": "marker_match" },
    { "name": "F4-class-C-reviewer2",
      "fixture_path": "scripts/mu-model-select-fixtures/F4-class-C-reviewer2.md",
      "tier": "full", "mu_sonnet_flag": false,
      "expected_model": "claude-sonnet-4-6",
      "expected_decision_path_head": "marker_match" },
    { "name": "F5-class-D-option",
      "fixture_path": "scripts/mu-model-select-fixtures/F5-class-D-option.md",
      "tier": "full", "mu_sonnet_flag": false,
      "expected_model": "claude-sonnet-4-6",
      "expected_decision_path_head": "marker_match" },
    { "name": "F6-audit-no-anchor",
      "fixture_path": "scripts/mu-model-select-fixtures/F6-audit-no-anchor.md",
      "tier": "audit", "mu_sonnet_flag": false,
      "expected_model": "claude-haiku-4-5-20251001",
      "expected_decision_path_head": "default_haiku" }
  ]
}
```

### § 3.3 Fixture file content (TACTICAL AUTONOMY — Implementer composes minimal content satisfying anchor semantics)

Each fixture is a minimal Markdown file containing a `## § R{N} Round-scope directive` heading and just enough content to trigger (or not trigger) the intended anchor class. Concrete content shown below as guidance; Implementer MAY adjust wording as long as the anchor semantics are preserved AND the AC verdicts hold.

```markdown
# F1-default-haiku.md
## § R99 Round-scope directive (Architect — routine full-tier work)

This is a routine round with no cross-round-pattern signals. No promotion, no batch,
no second Reviewer pass, no operator resolution. Substantive single-round work.
```

```markdown
# F2-class-A-promotion.md
## § R99 Round-scope directive (Architect — cross-project promotion)

This round derives a cross-project promotion of a new discipline rule per the
Rule 5 threshold reached at instance 3 of the pattern.
```

```markdown
# F3-class-B-batch.md
## § R99 Round-scope directive (Architect — MU batch close)

This is a MU batch round consolidating Memorial-Updater for R42-R46 outputs into
a single coordinated REINFORCEMENT consolidation pass.
```

```markdown
# F4-class-C-reviewer2.md
## § R99 Round-scope directive (Architect — fix cycle after Reviewer-2)

The round produced one Reviewer pass; operator chose to dispatch a second cold-eye
Reviewer-2 audit which surfaced a CRITICAL plus ESCALATE-class finding.
```

```markdown
# F5-class-D-option.md
## § R99 Round-scope directive (Architect — operator-resolution chain)

This round closes an ESCALATE via operator-resolution choosing Option B (drop the
structurally-vacuous AC; amend spec § 5.2 and EMPIRICAL.sh in lockstep).
```

```markdown
# F6-audit-no-anchor.md
## § R99 Round-scope directive (Architect — routine audit-tier tactical follow-up)

Tactical follow-up round closing two leftover MINORs from a prior full-tier round.
Audit tier; no cross-round pattern signals.
```

### § 3.4 `test/q74-mu-haiku-reviewer-scope.test.ts`

```typescript
// test/q74-mu-haiku-reviewer-scope.test.ts — R74 ACs.

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const SELECTOR_PATH = resolve(__dirname, '..', 'scripts', 'mu-model-select.js');
const FIXTURES_DIR = resolve(__dirname, '..', 'scripts', 'mu-model-select-fixtures');
const PIPELINE_SH = resolve(__dirname, '..', 'run-pipeline.sh');
const CLAUDE_REVIEWER_MD = resolve(__dirname, '..', 'CLAUDE-REVIEWER.md');
const PACKAGE_JSON = resolve(__dirname, '..', 'package.json');

interface SelectorOut {
  round: string;
  model: string;
  rationale: string;
  decision_path: string[];
  selector_version: string;
  matched_anchors: string[];
}

function runSelector(fixturePath: string, tier: string, muSonnet = false): { stdout: string; status: number | null; stderr: string } {
  const args = [SELECTOR_PATH, '--directive', fixturePath, '--tier', tier];
  if (muSonnet) args.push('--mu-sonnet');
  const r = spawnSync('node', args, { encoding: 'utf-8' });
  return { stdout: r.stdout ?? '', status: r.status, stderr: r.stderr ?? '' };
}

function parse(stdout: string): SelectorOut { return JSON.parse(stdout) as SelectorOut; }

// AC-R74-1: selector emits valid JSON shape.
test('AC-R74-1: selector emits valid JSON with contract fields', () => {
  const { stdout, status } = runSelector(resolve(FIXTURES_DIR, 'F1-default-haiku.md'), 'full');
  assert.equal(status, 0, `selector exit non-zero; stdout=${stdout}`);
  const out = parse(stdout);
  assert.ok(typeof out.round === 'string' && out.round.length > 0);
  assert.ok(['claude-haiku-4-5-20251001', 'claude-sonnet-4-6', 'n/a'].includes(out.model));
  assert.ok(typeof out.rationale === 'string' && out.rationale.length > 0);
  assert.ok(Array.isArray(out.decision_path) && out.decision_path.length > 0);
  assert.ok(typeof out.selector_version === 'string' && out.selector_version.length > 0);
  assert.ok(Array.isArray(out.matched_anchors));
});

// AC-R74-2: selector exits 1 on missing --tier.
test('AC-R74-2: selector exits 1 on missing --tier', () => {
  const r = spawnSync('node', [SELECTOR_PATH, '--directive', resolve(FIXTURES_DIR, 'F1-default-haiku.md')], { encoding: 'utf-8' });
  assert.equal(r.status, 1);
  assert.ok((r.stderr ?? '').includes('--tier'));
});

// AC-R74-3: selector exits 1 on unreadable directive.
test('AC-R74-3: selector exits 1 on unreadable directive', () => {
  const r = spawnSync('node', [SELECTOR_PATH, '--directive', '/nonexistent/path.md', '--tier', 'full'], { encoding: 'utf-8' });
  assert.equal(r.status, 1);
  assert.ok((r.stderr ?? '').includes('directive unreadable'));
});

// AC-R74-4: F1 default Haiku (full-tier, no anchor).
test('AC-R74-4: F1-default-haiku → claude-haiku-4-5-20251001 (full-tier, no anchor)', () => {
  const out = parse(runSelector(resolve(FIXTURES_DIR, 'F1-default-haiku.md'), 'full').stdout);
  assert.equal(out.model, 'claude-haiku-4-5-20251001');
  assert.equal(out.decision_path[0], 'default_haiku');
});

// AC-R74-5: F2 class A (cross-project promotion) → Sonnet.
test('AC-R74-5: F2-class-A-promotion → claude-sonnet-4-6 (class A)', () => {
  const out = parse(runSelector(resolve(FIXTURES_DIR, 'F2-class-A-promotion.md'), 'full').stdout);
  assert.equal(out.model, 'claude-sonnet-4-6');
  assert.equal(out.decision_path[0], 'marker_match');
  assert.equal(out.decision_path[1], 'class_A');
});

// AC-R74-6: F3 class B (MU batch) → Sonnet.
test('AC-R74-6: F3-class-B-batch → claude-sonnet-4-6 (class B)', () => {
  const out = parse(runSelector(resolve(FIXTURES_DIR, 'F3-class-B-batch.md'), 'full').stdout);
  assert.equal(out.model, 'claude-sonnet-4-6');
  assert.equal(out.decision_path[0], 'marker_match');
  assert.equal(out.decision_path[1], 'class_B');
});

// AC-R74-7: F4 class C (Reviewer-2 + ESCALATE) → Sonnet.
test('AC-R74-7: F4-class-C-reviewer2 → claude-sonnet-4-6 (class C)', () => {
  const out = parse(runSelector(resolve(FIXTURES_DIR, 'F4-class-C-reviewer2.md'), 'full').stdout);
  assert.equal(out.model, 'claude-sonnet-4-6');
  assert.equal(out.decision_path[0], 'marker_match');
  assert.equal(out.decision_path[1], 'class_C');
});

// AC-R74-8: F5 class D (operator-resolution + Option X) → Sonnet.
test('AC-R74-8: F5-class-D-option → claude-sonnet-4-6 (class D)', () => {
  const out = parse(runSelector(resolve(FIXTURES_DIR, 'F5-class-D-option.md'), 'full').stdout);
  assert.equal(out.model, 'claude-sonnet-4-6');
  assert.equal(out.decision_path[0], 'marker_match');
  assert.equal(out.decision_path[1], 'class_D');
});

// AC-R74-9: F6 audit-tier without anchor → Haiku (anchors NOT checked on audit).
test('AC-R74-9: F6-audit-no-anchor (audit tier) → claude-haiku-4-5-20251001 (no anchor check)', () => {
  const out = parse(runSelector(resolve(FIXTURES_DIR, 'F6-audit-no-anchor.md'), 'audit').stdout);
  assert.equal(out.model, 'claude-haiku-4-5-20251001');
  assert.equal(out.decision_path[0], 'default_haiku');
});

// AC-R74-10: tier=solo → model n/a (MU not dispatched).
test('AC-R74-10: tier=solo → model "n/a"', () => {
  const out = parse(runSelector(resolve(FIXTURES_DIR, 'F1-default-haiku.md'), 'solo').stdout);
  assert.equal(out.model, 'n/a');
  assert.equal(out.decision_path[0], 'tier_no_mu');
});

// AC-R74-11: tier=coordinator-only → model n/a.
test('AC-R74-11: tier=coordinator-only → model "n/a"', () => {
  const out = parse(runSelector(resolve(FIXTURES_DIR, 'F1-default-haiku.md'), 'coordinator-only').stdout);
  assert.equal(out.model, 'n/a');
  assert.equal(out.decision_path[0], 'tier_no_mu');
});

// AC-R74-12: --mu-sonnet flag forces Sonnet on tier=audit even without anchor.
test('AC-R74-12: --mu-sonnet on tier=audit forces Sonnet (operator override)', () => {
  const out = parse(runSelector(resolve(FIXTURES_DIR, 'F6-audit-no-anchor.md'), 'audit', true).stdout);
  assert.equal(out.model, 'claude-sonnet-4-6');
  assert.equal(out.decision_path[0], 'operator_override');
});

// AC-R74-13: --mu-sonnet flag forces Sonnet on tier=full even without anchor.
test('AC-R74-13: --mu-sonnet on tier=full with no anchor forces Sonnet (operator override)', () => {
  const out = parse(runSelector(resolve(FIXTURES_DIR, 'F1-default-haiku.md'), 'full', true).stdout);
  assert.equal(out.model, 'claude-sonnet-4-6');
  assert.equal(out.decision_path[0], 'operator_override');
});

// AC-R74-14: run-pipeline.sh declares --mu-sonnet flag in arg parsing.
test('AC-R74-14: run-pipeline.sh declares --mu-sonnet flag', () => {
  const script = readFileSync(PIPELINE_SH, 'utf-8');
  // The flag must appear in the case statement and set a variable to true.
  assert.ok(/--mu-sonnet\)\s*MU_SONNET=true/.test(script),
    'run-pipeline.sh must contain "--mu-sonnet) MU_SONNET=true" in arg parsing');
});

// AC-R74-15: run-pipeline.sh declares --reviewer-scope flag in arg parsing.
test('AC-R74-15: run-pipeline.sh declares --reviewer-scope flag', () => {
  const script = readFileSync(PIPELINE_SH, 'utf-8');
  assert.ok(/--reviewer-scope\)\s*REVIEWER_SCOPE_EXPLICIT="\$2"/.test(script),
    'run-pipeline.sh must parse --reviewer-scope into REVIEWER_SCOPE_EXPLICIT');
});

// AC-R74-16: run-pipeline.sh invokes mu-model-select.js with --directive + --tier.
test('AC-R74-16: run-pipeline.sh invokes scripts/mu-model-select.js with required flags', () => {
  const script = readFileSync(PIPELINE_SH, 'utf-8');
  assert.ok(script.includes('scripts/mu-model-select.js'),
    'run-pipeline.sh must reference scripts/mu-model-select.js');
  assert.ok(/scripts\/mu-model-select\.js[\s\S]{0,400}--directive/.test(script),
    'run-pipeline.sh must pass --directive to mu-model-select');
  assert.ok(/scripts\/mu-model-select\.js[\s\S]{0,400}--tier/.test(script),
    'run-pipeline.sh must pass --tier to mu-model-select');
});

// AC-R74-17: run-pipeline.sh maps Sonnet/Haiku selector output to MODEL_MEMORIAL.
test('AC-R74-17: run-pipeline.sh contains MODEL_MEMORIAL_DEFAULT (haiku) + MODEL_MEMORIAL_SONNET (sonnet)', () => {
  const script = readFileSync(PIPELINE_SH, 'utf-8');
  assert.ok(/MODEL_MEMORIAL_DEFAULT="claude-haiku-4-5-20251001"/.test(script),
    'run-pipeline.sh must define MODEL_MEMORIAL_DEFAULT as claude-haiku-4-5-20251001');
  assert.ok(/MODEL_MEMORIAL_SONNET="claude-sonnet-4-6"/.test(script),
    'run-pipeline.sh must define MODEL_MEMORIAL_SONNET as claude-sonnet-4-6');
});

// AC-R74-18: CLAUDE-REVIEWER.md contains the structural-only Mode section heading.
test('AC-R74-18: CLAUDE-REVIEWER.md contains "## Mode: Structural-only Reviewer" heading', () => {
  const content = readFileSync(CLAUDE_REVIEWER_MD, 'utf-8');
  assert.ok(/^## Mode: Structural-only Reviewer$/m.test(content),
    'CLAUDE-REVIEWER.md must contain "## Mode: Structural-only Reviewer" exact heading');
});

// AC-R74-19: CLAUDE-REVIEWER.md Mode section enumerates the 3 structural-only checks.
test('AC-R74-19: Mode section names binding-command + AC-binding + ALLOWED_SET checks', () => {
  const content = readFileSync(CLAUDE_REVIEWER_MD, 'utf-8');
  // All three structural-check names must appear in the file after the Mode heading.
  const modeIdx = content.indexOf('## Mode: Structural-only Reviewer');
  assert.ok(modeIdx >= 0);
  const modeBody = content.slice(modeIdx);
  assert.ok(/[Bb]inding-command re-runs/.test(modeBody));
  assert.ok(/AC-binding structural integrity/.test(modeBody));
  assert.ok(/ALLOWED_SET diff/.test(modeBody));
});

// AC-R74-20: CLAUDE-REVIEWER.md REINFORCED line count unchanged from baseline 3.
test('AC-R74-20: CLAUDE-REVIEWER.md REINFORCED count unchanged (no REINFORCED addition this round)', () => {
  const content = readFileSync(CLAUDE_REVIEWER_MD, 'utf-8');
  const count = (content.match(/^# REINFORCED/gm) ?? []).length;
  assert.equal(count, 3, `CLAUDE-REVIEWER.md REINFORCED count expected 3 (baseline); got ${count}`);
});

// AC-R74-21: package.json registers mu-model-select script.
test('AC-R74-21: package.json registers mu-model-select script', () => {
  const pkg = JSON.parse(readFileSync(PACKAGE_JSON, 'utf-8'));
  assert.equal(pkg.scripts['mu-model-select'], 'pnpm exec node scripts/mu-model-select.js');
});

// AC-R74-22: corpus.json contains the expected 6 fixture entries.
test('AC-R74-22: corpus.json enumerates all 6 fixtures with expected models', () => {
  const corpus = JSON.parse(readFileSync(resolve(FIXTURES_DIR, 'corpus.json'), 'utf-8'));
  assert.equal(corpus.entries.length, 6);
  const names = corpus.entries.map((e: { name: string }) => e.name).sort();
  assert.deepEqual(names, [
    'F1-default-haiku', 'F2-class-A-promotion', 'F3-class-B-batch',
    'F4-class-C-reviewer2', 'F5-class-D-option', 'F6-audit-no-anchor',
  ].sort());
});
```

---

## § 4 Acceptance criteria

> **AC-binding modes:**
> - **Runtime (R)**: bound to a `test/q74-mu-haiku-reviewer-scope.test.ts` test case; verified by `pnpm test`.
> - **Empirical (E)**: bound to a `Q-R74-EMPIRICAL.sh` block; verified at chore-A pre-commit.
> - **Structural (S)**: bound by direct file existence + content grep.

| AC ID | Given / When / Then | Binding |
|---|---|---|
| **AC-R74-1** | Given fixture `F1-default-haiku.md`, when `node scripts/mu-model-select.js --directive <fixture> --tier full` runs, then stdout is a single valid JSON object with fields `round` (string), `model` (∈ {`claude-haiku-4-5-20251001`,`claude-sonnet-4-6`,`n/a`}), `rationale` (≥ 1 char), `decision_path` (non-empty array), `selector_version` (≥ 1 char), `matched_anchors` (array). | R: `AC-R74-1`. |
| **AC-R74-2** | Given the selector invoked without `--tier`, when it runs, then it exits 1 AND stderr contains the literal string `--tier`. | R: `AC-R74-2`. |
| **AC-R74-3** | Given a non-existent `--directive` path, when the selector runs, then it exits 1 AND stderr contains `directive unreadable`. | R: `AC-R74-3`. |
| **AC-R74-4 (DEFAULT HAIKU)** | Given fixture `F1-default-haiku.md` with no anchor present, when the selector runs in tier=full mode without `--mu-sonnet`, then `model === "claude-haiku-4-5-20251001"` AND `decision_path[0] === "default_haiku"`. | R: `AC-R74-4`. + E: `Q-R74-EMPIRICAL.sh` Block 6. |
| **AC-R74-5 (CLASS A)** | Given fixture `F2-class-A-promotion.md`, when the selector runs in tier=full mode, then `model === "claude-sonnet-4-6"` AND `decision_path` starts with `["marker_match","class_A"]`. | R: `AC-R74-5`. + E: Block 7. |
| **AC-R74-6 (CLASS B)** | Given fixture `F3-class-B-batch.md`, when the selector runs in tier=full mode, then `model === "claude-sonnet-4-6"` AND `decision_path` starts with `["marker_match","class_B"]`. | R: `AC-R74-6`. + E: Block 8. |
| **AC-R74-7 (CLASS C)** | Given fixture `F4-class-C-reviewer2.md`, when the selector runs in tier=full mode, then `model === "claude-sonnet-4-6"` AND `decision_path` starts with `["marker_match","class_C"]`. | R: `AC-R74-7`. + E: Block 9. |
| **AC-R74-8 (CLASS D)** | Given fixture `F5-class-D-option.md`, when the selector runs in tier=full mode, then `model === "claude-sonnet-4-6"` AND `decision_path` starts with `["marker_match","class_D"]`. | R: `AC-R74-8`. + E: Block 10. |
| **AC-R74-9 (AUDIT NO ANCHOR CHECK)** | Given fixture `F6-audit-no-anchor.md` (no anchor present), when the selector runs in tier=audit mode without `--mu-sonnet`, then `model === "claude-haiku-4-5-20251001"` AND `decision_path[0] === "default_haiku"`. | R: `AC-R74-9`. + E: Block 11. |
| **AC-R74-10 (TIER SOLO)** | Given any directive content, when the selector runs in tier=solo mode, then `model === "n/a"` AND `decision_path[0] === "tier_no_mu"`. | R: `AC-R74-10`. |
| **AC-R74-11 (TIER COORDINATOR)** | Given any directive content, when the selector runs in tier=coordinator-only mode, then `model === "n/a"` AND `decision_path[0] === "tier_no_mu"`. | R: `AC-R74-11`. |
| **AC-R74-12 (OPERATOR OVERRIDE AUDIT)** | Given fixture `F6-audit-no-anchor.md`, when the selector runs in tier=audit mode WITH `--mu-sonnet`, then `model === "claude-sonnet-4-6"` AND `decision_path[0] === "operator_override"`. | R: `AC-R74-12`. |
| **AC-R74-13 (OPERATOR OVERRIDE FULL)** | Given fixture `F1-default-haiku.md`, when the selector runs in tier=full mode WITH `--mu-sonnet`, then `model === "claude-sonnet-4-6"` AND `decision_path[0] === "operator_override"`. | R: `AC-R74-13`. |
| **AC-R74-14 (PIPELINE FLAG `--mu-sonnet`)** | Given `run-pipeline.sh`, when grep'd, then it contains a case-statement clause matching the regex `--mu-sonnet\)\s*MU_SONNET=true`. | R: `AC-R74-14`. + S. |
| **AC-R74-15 (PIPELINE FLAG `--reviewer-scope`)** | Given `run-pipeline.sh`, when grep'd, then it contains a case-statement clause matching the regex `--reviewer-scope\)\s*REVIEWER_SCOPE_EXPLICIT="\$2"`. | R: `AC-R74-15`. + S. |
| **AC-R74-16 (PIPELINE INVOKES SELECTOR)** | Given `run-pipeline.sh`, when read, then it contains `scripts/mu-model-select.js` AND that reference is within 400 chars of both `--directive` AND `--tier` argument-passing literals. | R: `AC-R74-16`. + S. |
| **AC-R74-17 (MODEL CONSTANTS)** | Given `run-pipeline.sh`, when grep'd, then it contains `MODEL_MEMORIAL_DEFAULT="claude-haiku-4-5-20251001"` AND `MODEL_MEMORIAL_SONNET="claude-sonnet-4-6"`. | R: `AC-R74-17`. + S. |
| **AC-R74-18 (REVIEWER MODE HEADING)** | Given `CLAUDE-REVIEWER.md`, when grep'd, then it contains a line matching `^## Mode: Structural-only Reviewer$`. | R: `AC-R74-18`. + S. |
| **AC-R74-19 (REVIEWER MODE BODY)** | Given `CLAUDE-REVIEWER.md`, when the body after the Mode heading is read, then it names all three structural checks: `binding-command re-runs`, `AC-binding structural integrity`, `ALLOWED_SET diff`. | R: `AC-R74-19`. |
| **AC-R74-20 (REVIEWER REINFORCED COUNT UNCHANGED)** | Given `CLAUDE-REVIEWER.md`, when `grep -c "^# REINFORCED"` runs, then the count equals exactly 3 (the round-start baseline). | R: `AC-R74-20`. |
| **AC-R74-21 (PACKAGE.JSON SCRIPT)** | Given `package.json`, when parsed, then `scripts["mu-model-select"]` equals `pnpm exec node scripts/mu-model-select.js`. | R: `AC-R74-21`. + S. |
| **AC-R74-22 (CORPUS COMPLETENESS)** | Given `scripts/mu-model-select-fixtures/corpus.json`, when parsed, then `entries.length === 6` AND entry names (sorted) equal `[F1-default-haiku, F2-class-A-promotion, F3-class-B-batch, F4-class-C-reviewer2, F5-class-D-option, F6-audit-no-anchor]`. | R: `AC-R74-22`. |
| **AC-R74-23 (BINDING-COMMAND ATTESTATION; Rule 1)** | Given the chore-A HEAD commit (Implementer GREEN), when the Implementer runs `pnpm exec node --test --test-reporter=tap test/*.test.js` in NEXT-ROLE.md attestation, then the OBSERVED VERBATIM output is recorded — NOT reframed. Architect prediction (provided for visibility, not as the binding literal): `tests=516+N_new / pass=508+N_new / fail=5 / skipped=3` where `N_new` is the count of new R74 test cases added to `test/q74-mu-haiku-reviewer-scope.test.ts` (Architect prediction: N_new = 22). | E: `Q-R74-EMPIRICAL.sh` Block 4 records the actual count. |
| **AC-R74-24 (BINDING-COMMAND ATTESTATION; Rule 1)** | Given the chore-A HEAD commit, when the Implementer runs `pnpm exec tsc -p tsconfig.test.json`, then the OBSERVED VERBATIM output is recorded. Architect prediction: exit 0, zero diagnostics. | E: `Q-R74-EMPIRICAL.sh` Block 3 records the actual exit code. |
| **AC-R74-25 (ANTI-SCOPE)** | Given the chore-A HEAD commit, when `git diff <round-start-SHA>..HEAD --name-only` is computed (where `<round-start-SHA>` = the spec-triad commit SHA injected at chore-A; see § 5.2), then every emitted path is a member of ALLOWED_SET (§ 5.1) OR matches a documented regex carve-out. | E: `Q-R74-EMPIRICAL.sh` Block 12. |
| **AC-R74-26 (CARRY-FORWARD FAIL SET)** | Given chore-A HEAD, when the test suite runs, then the 5 carry-forward failing test names (`AC-R36-21`, `AC-R36-30`, `AC-R36-31`, `AC-R65-2`, `AC-R66-14`) remain present in TAP `not ok` output with identifiers unchanged AND the TAP `# fail` summary equals exactly 5. | E: `Q-R74-EMPIRICAL.sh` Block 5. |
| **AC-R74-27 (NO ENGINE/DEMO/TIER-ROUTER MODIFICATIONS)** | Given chore-A HEAD, when `git diff <round-start-SHA>..HEAD -- engine/ demos/ tools/coverage-saturation.ts tools/build-canned-demos.ts tools/demo-scenario.ts scripts/tier-router.ts scripts/tier-router-validate.ts scripts/tier-router-criteria.md 'scripts/tier-router-fixtures/**'` is computed, then the diff is empty. | E: `Q-R74-EMPIRICAL.sh` Block 13. |
| **AC-R74-28 (NO REINFORCEMENTS MODIFICATION)** | Given chore-A HEAD, when `grep -c "^# REINFORCED"` is run on each of `CLAUDE-ARCHITECT.md`, `CLAUDE-IMPLEMENTER.md`, `CLAUDE-MEMORIAL.md`, `CLAUDE-COMMON.md`, `CLAUDE-COORDINATOR.md`, then EACH file's REINFORCED line count is unchanged vs round-start-SHA. CLAUDE-REVIEWER.md is permitted to retain count=3 (no new REINFORCED entries; the Mode docs section is NOT a REINFORCED line). | E: `Q-R74-EMPIRICAL.sh` Block 14. |
| **AC-R74-29 (NO PRIOR-SPEC MODIFICATION)** | Given chore-A HEAD, when `git diff <round-start-SHA>..HEAD` is filtered for `coordination/specs/Q-R*-{SPEC,SPEC-AUDIT,EMPIRICAL}.{md,sh}` paths that match round IDs ≤ R73, then the diff is empty. | E: `Q-R74-EMPIRICAL.sh` Block 15. |
| **AC-R74-30 (R73 ANTI-REGRESSION)** | Given chore-A HEAD, when `pnpm tier-router:validate` runs (the R73 validate script), then it exits 0 — i.e., R73's tier-routing safety set (R45/R61/R62/R66/R72 → full; R49/R50/R51/R55/R60/R63/R64/R68 → ≠ implementer-only) still holds. | E: `Q-R74-EMPIRICAL.sh` Block 16. |
| **AC-R74-31 (SELF-CLASSIFICATION; PEDAGOGICAL)** | Given the R74 directive section in `coordination/NEXT-ROLE.md`, when `node scripts/mu-model-select.js --directive coordination/NEXT-ROLE.md --tier full` runs (without `--mu-sonnet`), then `model === "claude-sonnet-4-6"`. Rationale: the R74 directive contains anchor markers — `cross-project promotion` does NOT appear, but `Reviewer-2` does appear in the embedded R73 Reviewer block prose ("R73 Reviewer …"; not Reviewer-2 — actually verify the directive section ONLY contains Reviewer routing block details, not Reviewer-2 mentions). **Note:** if the directive section's content does NOT contain any anchor, this AC instead asserts `model === "claude-haiku-4-5-20251001"` per the default-haiku branch — TACTICAL AUTONOMY: Implementer empirically verifies the expected value at chore-A by running the selector on the R74 directive section AND records the observed value verbatim. The AC predicts NOTHING beyond "the selector runs to exit 0 with a valid model field on the R74 directive". | E: `Q-R74-EMPIRICAL.sh` Block 17. |

> **Notes on AC discrimination (Rule 3 — `implementer-spec-test-assertion-coverage` ACTIVE GATE):**
> - AC-R74-4..9 bind the LOAD-BEARING selector behavior per anchor class: each fixture exercises exactly one branch of the decision tree.
> - AC-R74-10..13 bind the four overrides: tier-no-mu (solo + coordinator-only) and operator-override (--mu-sonnet on audit + full).
> - AC-R74-14..17 bind the bash-side integration: the four signature elements the Implementer must add to run-pipeline.sh.
> - AC-R74-18..20 bind the CLAUDE-REVIEWER.md Mode docs addition: heading + body content + REINFORCED count guard.
> - Discriminating-assertion gate: each AC's "Then" clause uniquely identifies its load-bearing property. A bug that broke any class's anchor matching would fail the matching AC-R74-5..8. A bug that put a REINFORCED line into CLAUDE-REVIEWER.md would fail AC-R74-20. A bug that omitted the `--mu-sonnet` flag would fail AC-R74-14.

---

## § 5 Anti-scope

### § 5.1 ALLOWED_SET (round-start-SHA..HEAD diff bound)

> **Round-start SHA:** the spec-triad commit SHA captured at the Implementer's chore-A pre-commit step (see § 5.2). The diff `git diff <round-start-SHA>..HEAD --name-only` MUST be a subset of the ALLOWED_SET below.

```
scripts/mu-model-select.ts
scripts/mu-model-select-fixtures/corpus.json
scripts/mu-model-select-fixtures/F1-default-haiku.md
scripts/mu-model-select-fixtures/F2-class-A-promotion.md
scripts/mu-model-select-fixtures/F3-class-B-batch.md
scripts/mu-model-select-fixtures/F4-class-C-reviewer2.md
scripts/mu-model-select-fixtures/F5-class-D-option.md
scripts/mu-model-select-fixtures/F6-audit-no-anchor.md
test/q74-mu-haiku-reviewer-scope.test.ts
package.json
run-pipeline.sh
CLAUDE-REVIEWER.md
coordination/specs/Q-R74-SPEC.md
coordination/specs/Q-R74-SPEC-AUDIT.md
coordination/specs/Q-R74-EMPIRICAL.sh
coordination/MEMORIAL.md
coordination/NEXT-ROLE.md
```

> **ALLOWED_SET total: 17 paths.**

**Regex carve-outs (permitted creation patterns; not enumerated above):**
- `^coordination/diagnostics/DIAGNOSTIC-R74-.*\.md$` — IF the Implementer writes any DIAGNOSTIC per § 6 halt conditions.
- `^coordination/reviews/REVIEWER-REPORT-R74\.md$` — written by the Reviewer at Reviewer-stage (included in the round-close diff).
- `^coordination/logs/ROUND-R74-ROUTING\.md$` — emitted by `run-pipeline.sh` whenever the pipeline runs (per § 2.5 schema extension). At chore-A this file MAY exist if the Implementer exercised the pipeline; otherwise it lands at first MU/Reviewer dispatch.

**NOT in ALLOWED_SET (hard anti-scope; directive § Anti-scope item):**
- `engine/**/*.ts` — A12 frozen
- `demos/**/*` — R70/R71 frozen
- `tools/coverage-saturation.ts` — R72 frozen
- `tools/build-canned-demos.ts` — R71 frozen
- `tools/demo-scenario.ts` — R70 frozen
- `scripts/tier-router.ts`, `scripts/tier-router-validate.ts`, `scripts/tier-router-criteria.md`, `scripts/tier-router-fixtures/**` — R73 frozen
- Any pre-R74 test file (`test/q01..q73-*.test.ts`)
- Any pre-R74 spec file (`coordination/specs/Q-R0?-*` through `coordination/specs/Q-R73-*`)
- `CLAUDE-ARCHITECT.md`, `CLAUDE-IMPLEMENTER.md`, `CLAUDE-MEMORIAL.md`, `CLAUDE-COMMON.md`, `CLAUDE-COORDINATOR.md` — REINFORCEMENTS sections frozen (directive § Anti-scope item)
- `CLAUDE-REVIEWER.md` REINFORCEMENTS section (lines 44–98 at round-start; only the pre-REINFORCEMENTS area is modifiable per § 2.6)
- `CROSS-PROJECT-MEMORIAL.md` (cross-project promotion is Memorial-Updater-stage decision)
- DS-repo files (W3-1 Option A preserved)
- Anchor public-repo files (R76 deferred)
- `tsconfig.test.json` (already includes `scripts/**/*.ts` from R73; no further changes needed; verified at spec-emit time by direct read)
- `.gitignore` (not anti-scope by directive but no need to modify)

### § 5.2 Round-start SHA injection

The Implementer captures the spec-triad commit SHA via `git rev-parse HEAD` IMMEDIATELY AFTER the spec-triad commit lands AND BEFORE the chore-A code commit. This SHA is the lower bound of the anti-scope diff. The Implementer injects it into `Q-R74-EMPIRICAL.sh` via sed-substitution (`<INJECTED-AT-CHORE-A>` placeholder).

> **Per CLAUDE-COMMON.md REINFORCED 2026-05-18 (R70 MINOR-1):** the Implementer reads the spec-triad SHA from the Architect's routing block in `coordination/NEXT-ROLE.md` § R74 Architect routing block (which the Architect stamps with the literal SHA from `git rev-parse HEAD` post-spec-commit, pre-routing-block-commit). The Implementer does NOT use `git rev-parse HEAD` at chore-A sed time — that would point to the Architect's routing-block commit, not the spec-triad commit.

### § 5.3 Acknowledged AC gaps (with rationale)

- **End-to-end pipeline-dispatch AC absent.** AC-R74-14..17 verify the run-pipeline.sh source contains the right tokens; they do NOT exercise a live pipeline that dispatches MU with the resolved model. Reasoning: running `./run-pipeline.sh --round R74 --tier full --dry-run` inside a test would shell out to claude CLI (preflight check; line 1622-1626). Tests must not require a configured claude environment. The dry-run path also short-circuits before the role-routing logic reaches log emission. Static grep is the proportional verification surface.
- **Reviewer prompt content AC absent.** AC-R74-18..20 verify CLAUDE-REVIEWER.md has the Mode section; they do NOT verify that `build_reviewer_prompt` emits the structural mode header when invoked with `REVIEWER_SCOPE=structural`. The `build_reviewer_prompt` is a bash function whose output flows to a transient `.prompt-reviewer.md`; exercising it in a test would require shell-sourcing run-pipeline.sh which has side effects (preflight). Trade-off: AC-R74-15 verifies the flag is parsed; the prompt injection is left to the Reviewer's own session at Reviewer-stage where the visible MODE header is the smoke test. Rule 3 self-application gate verified: the Reviewer is in a position to catch this gap if `build_reviewer_prompt` is incorrectly wired.

---

## § 6 Halt conditions

### § 6.1 The Implementer MUST HALT + write `coordination/diagnostics/DIAGNOSTIC-R74-<topic>.md` (≥ 3 bounded options) + set `STATUS: ESCALATE` for ANY of:

1. `Q-R74-EMPIRICAL.sh` non-zero exit at chore-A for ANY reason (no carve-outs; single-state).
2. `pnpm exec tsc -p tsconfig.test.json` non-zero exit at chore-A.
3. Test baseline drift beyond R73 close (`tests=516 / pass=508 / fail=5 / skipped=3`) other than R74-additions. Specifically: total test count must be `516 + N_new`, where `N_new` = number of test cases added in `test/q74-mu-haiku-reviewer-scope.test.ts` (Architect prediction: 22); `# fail` must remain exactly 5 with identical carry-forward identities; `# skipped` must remain 3.
4. **LOAD-BEARING SAFETY FAILURE (R73 anti-regression):** `pnpm tier-router:validate` exits non-zero at chore-A HEAD. The R73 router validation corpus must still pass.
5. R61-class architectural-reality discovery: any claim in this spec about codebase state (existing run-pipeline.sh line numbers, existing function locations, existing TIER vocab) refuted by empirical observation at chore-A. The Implementer's recourse is HALT + DIAGNOSTIC + ESCALATE with empirical-verify branch.
6. R72-promoted **claim-then-walk** discipline (cross-project canonical): any Architect claim in this spec about codebase or future-state that the Implementer cannot empirically verify at chore-A → HALT.
7. Architect spec uses forward-protection / live-file-count / anti-scope-diff-against-prior-round AC patterns. The Architect believes this spec contains NONE (§ 9.7 self-grilling sweep confirms). If the Implementer detects one, HALT.
8. The `scripts/mu-model-select.js` invocation in run-pipeline.sh fails to produce parseable JSON at runtime AND the bash fallback (`MODEL_MEMORIAL_DEFAULT`) does NOT activate as designed → HALT (selector-vs-fallback interaction is load-bearing).
9. CLAUDE-REVIEWER.md Mode docs section addition collides with the REINFORCEMENTS divider boundary (e.g., the section accidentally lands AFTER the `# ── REVIEWER REINFORCEMENTS ──` divider) → HALT + DIAGNOSTIC to clarify the placement convention.
10. Any of the 7 cross-project rules cannot be applied as ACTIVE GATE without contradicting the directive (the Architect believes all are applicable; § 7 documents dispositions).

### § 6.2 TACTICAL AUTONOMY scope

Implementer MAY (without HALT):

- Choose `.js` extension imports per R70/R71/R73 precedent.
- Adjust JSDoc wording, blank lines, import order, internal helper names — no semantic change.
- Adjust the bash variable names in the run-pipeline.sh additions IF the names in § 2.5 collide with existing names (verify at chore-A; if `MU_FALLBACK_RATIONALE` collides with a pre-existing variable, rename — internal naming is not load-bearing).
- Choose the exact wording of the routing-log header sections (preserve the three required logical sections: `## Tier`, `## MU model`, `## Reviewer scope`).
- Compose the F1..F6 fixture content with minimal directive-content satisfying anchor semantics per § 3.3 guidance. The fixture file paths + counts are fixed by § 1.1 + § 3.2; the body content is Implementer choice within the anchor-semantic constraint.
- The AC-R74-31 expected model field — empirically determine at chore-A whether the R74 directive section in HEAD's NEXT-ROLE.md contains any anchor; record the observed selector output verbatim. The AC predicts "selector exits 0 with a valid model field"; the specific model value is whatever the selector emits.
- The order of fields in the selector's JSON output (JSON object key order is not significant for AC-R74-1).
- The selector's `--help` output text is Implementer-side; no AC binds it.

Implementer MAY NOT (without HALT + DIAGNOSTIC):

- Modify any anti-scope file (§ 5.1 NOT in ALLOWED_SET list), particularly `scripts/tier-router*` (R73 frozen).
- Expand the ALLOWED_SET in-spec at chore-A (R36 MAJOR-2 NEVER violation).
- Introduce a chore-B step or any forward-protection / live-file-count / anti-scope-diff-against-prior-round AC pattern (R62+R66+R68 cumulative lesson; R72 canonical).
- Add an external npm dependency to package.json (anti-scope directive § item 5).
- Skip the RED commit (R23 IMPL MINOR-1 TDD discipline).
- Cite spec-predicted values as observed in attestation (Rule 1 sub-class `empirical-command-attestation`).
- Tune the anchor class regexes in § 2.3 (anchor priorities + patterns are load-bearing).
- Add a `# REINFORCED` line to CLAUDE-REVIEWER.md (directive explicitly excludes; AC-R74-20 enforces).
- Modify CLAUDE-REVIEWER.md content BELOW the `# ── REVIEWER REINFORCEMENTS ───────────────────────────────────────────────────` divider (line 44 at round-start).

---

## § 7 Cross-project rule dispositions

| Rule | Disposition |
|---|---|
| **1** (`empirical-command-attestation`) | **ACTIVE GATE.** Q-R74-EMPIRICAL.sh + Implementer attestation directives. AC-R74-23 + AC-R74-24 require VERBATIM observed output (test counts, tsc exit code). |
| **2** (`architect-branch-binding-coverage`) | **ACTIVE GATE.** Every branch in `scripts/mu-model-select.ts` has an AC: `tier_no_mu` → AC-R74-10/11; `operator_override` → AC-R74-12/13; `marker_match` per class → AC-R74-5/6/7/8; `default_haiku` → AC-R74-4/9. Bash integration branches: `--mu-sonnet` flag → AC-R74-14; `--reviewer-scope` flag → AC-R74-15; selector invocation → AC-R74-16; model constants → AC-R74-17. |
| **3** (`implementer-spec-test-assertion-coverage`) | **ACTIVE GATE.** AC-R74-4..13 discriminate (each fixture exercises exactly one branch; alternate-branch routing would fail the matching AC). § 5.3 acknowledged-gaps documents 2 non-load-bearing gaps with rationale (end-to-end pipeline dispatch; build_reviewer_prompt heredoc content). |
| **4** (`anti-scope-allowed-set-forward-coverage`) | **ACTIVE GATE.** 17-path ALLOWED_SET + 3 regex carve-outs enumerated in § 5.1 at spec-emit time. **NO forward-protection / live-file-count / anti-scope-diff-against-prior-round AC patterns** (R62+R66+R68+R72 cumulative lesson; R72 cross-project canonical at CROSS-PROJECT-MEMORIAL.md:38) — all anti-scope ACs bound by historical-only diff `round-start-SHA..HEAD`. |
| **5** (`rule-derivation-without-self-application`) | **N/A at spec emit.** R74 does NOT derive new cross-project rules. R72-promoted claim-then-walk (CROSS-PROJECT-MEMORIAL.md:38) is applied AT spec authoring per § 9.6 grilling pass. The R72-promoted ALLOWED_SET-amendment-propagation rule (R72 MAJOR-2) is applied at spec § 5.1 + § 7 (this row) + Q-R74-EMPIRICAL.sh Block 12 — all three surfaces enumerate the SAME 17-path set. |
| **6** (`halt-discipline-no-DIAGNOSTIC-for-workaround`) | **ACTIVE GATE.** 10 halt conditions enumerated in § 6.1; no carve-outs; single-state spec (no chore-B). |
| **7** (`derived-rule-propagation-mechanism-required`) | **ACTIVE GATE Surface (a).** Spec § 7 documents rule application + this row. Surface (b) + (c) N/A: R74 is not deriving a new propagation mechanism. |

---

## § 8 Open questions

**None — all resolved.**

- **Q-1** (marker set: Approach A vs B vs C?) — RESOLVED in § 0 (Approach C, four anchor classes).
- **Q-2** (anchor activation on audit-tier?) — RESOLVED in § 0.1: anchor check ONLY on full-tier; audit defaults to Haiku unless `--mu-sonnet`.
- **Q-3** (selector mechanism: inline bash vs TypeScript CLI?) — RESOLVED: TypeScript CLI at `scripts/mu-model-select.ts`. Reasons: testability (deterministic tests against CLI JSON); consistency with R73 tier-router pattern; bash invokes via `node scripts/mu-model-select.js`.
- **Q-4** (Reviewer-scope flag value-space?) — RESOLVED in § 0.2: `full|structural` only. Operator override via `--reviewer-scope`.
- **Q-5** (CLAUDE-REVIEWER.md Mode-docs placement?) — RESOLVED in § 2.6: between role-boundary block and REINFORCEMENTS divider (current line 43); NOT a REINFORCED entry.
- **Q-6** (routing-log schema?) — RESOLVED in § 2.5: three Markdown sections — `## Tier`, `## MU model`, `## Reviewer scope`. Emitted unconditionally per pipeline invocation.
- **Q-7** (Tessera-temporary divergence on run-pipeline.sh extends R73 pattern?) — RESOLVED: same divergence pattern; same R76 rebase plan.
- **Q-8** (AC-R74-31 self-classification predicted model?) — RESOLVED in § 6.2 TACTICAL AUTONOMY: Implementer empirically verifies at chore-A; AC asserts only that the selector exits 0 with a valid model field on the R74 directive section.

---

## § 9 P3 ten-axis verification

| Axis | Verification (one sentence) |
|---|---|
| **correctness** | The selector's four-branch decision tree (tier_no_mu, operator_override, marker_match, default_haiku) is enumerated in § 2.4 and pseudocoded in § 3.1; each branch has a fixture (F1..F6) and an AC (AC-R74-4..11) that exercises it. |
| **completeness** | All four model outcomes are reachable: `n/a` via tier_no_mu (AC-R74-10/11); `claude-sonnet-4-6` via operator_override (AC-R74-12/13) and via marker_match for each of 4 classes (AC-R74-5/6/7/8); `claude-haiku-4-5-20251001` via default_haiku for both full-tier-no-anchor (AC-R74-4) and audit-tier-no-anchor (AC-R74-9). |
| **consistency** | Model literal strings (`claude-haiku-4-5-20251001`, `claude-sonnet-4-6`, `n/a`) used uniformly throughout § 0, § 2, § 3, § 4. Anchor class names (A/B/C/D) used uniformly. Tier vocabulary (`full`/`audit`/`solo`/`coordinator-only`) consistent with R73 spec § 0 + run-pipeline.sh existing values. |
| **clarity** | Pseudocode in § 3.1 is sufficient for the Implementer to reproduce the selector. The CLAUDE-REVIEWER.md insertion content in § 2.6 is the literal content; the Implementer copies verbatim. The run-pipeline.sh additions in § 2.5 are bash code blocks (a/b/c/d/e) directly applicable. |
| **coverage** | Every branch in the selector has an AC. Every flag in run-pipeline.sh has a structural AC. Every section in the Mode docs has a structural AC (heading + body). § 5.3 documents 2 acknowledged gaps with rationale (end-to-end pipeline dispatch; build_reviewer_prompt heredoc content). |
| **constraints** | Anti-scope ALLOWED_SET enumerated + bounded by historical-only diff. No new external dependencies. No engine modifications. No REINFORCEMENTS modifications. No tier-router file modifications. CLAUDE-REVIEWER.md REINFORCED count preserved. |
| **concurrency** | The selector is a single-shot CLI tool with no concurrency surface. Bash invocation is serial. No race conditions. |
| **corner cases** | (i) Missing `--tier` → exit 1 (AC-R74-2). (ii) Unreadable directive → exit 1 (AC-R74-3). (iii) Directive missing `## § R{N} Round-scope directive` heading → whole-file fallback (same as tier-router pattern; no AC needed because the selector's anchor regexes are content-pattern matches independent of section structure). (iv) Mu-model-select.js not compiled → bash falls back to default Haiku + log_warn (covered by AC-R74-16 + § 1.3 mitigation). (v) Operator passes invalid `--reviewer-scope` value → bash exits 1 with clear error (§ 2.5 (c)). |
| **cost** | Per pipeline invocation: selector execution = ~10 ms (regex matches over directive text); bash overhead = ~50 ms (spawn + parse). MU model selection cost is dominated by the MU session itself (~$0.20 with Sonnet; ~$0.07 with Haiku for the directive's predicted ~3× reduction). Average projected savings per full-tier round (assuming ~70% of full-tier rounds default to Haiku): ~$0.09 per round. Aggregate over 70 rounds/phase: ~$6.30/phase from MU model selection alone. Reviewer-scope structural mode is per-round flag-gated; expected savings ~$0.30 per audit-tier round (Opus → Opus but shorter prompt reduces token count by ~30%). |
| **coupling** | The selector is decoupled from the pipeline: a stand-alone CLI tool (same pattern as R73 tier-router). `run-pipeline.sh` is the consumer; the integration is one-way (pipeline reads selector output; selector does not read pipeline state). The fixture files are read by both the selector (at runtime via test invocation) and the corpus AC (AC-R74-22). CLAUDE-REVIEWER.md Mode docs is read at Reviewer-stage system-prompt assembly; no compile-time coupling. |

---

## § 9.1 Pre-emit grilling output (inline)

### Q.1 Every claim verifiable?

- "run-pipeline.sh:78 currently defines `MODEL_MEMORIAL="claude-sonnet-4-6"`" — VERIFIED at session entry via direct grep (line 78).
- "run-pipeline.sh:118-184 contains the existing argument-parsing case statement" — VERIFIED via direct read (line 118 `while [[ $# -gt 0 ]]; do case $1 in`).
- "run-pipeline.sh:186-209 contains the existing --auto-tier integration block (R73)" — VERIFIED via direct read.
- "run-pipeline.sh:1076 defines `build_reviewer_prompt()`" — VERIFIED via grep.
- "run-pipeline.sh:1332-1344 defines `get_model()`" — VERIFIED via grep.
- "run-pipeline.sh:1802-1836 is the main role-dispatch loop" — VERIFIED via direct read.
- "CLAUDE-REVIEWER.md has 98 lines and the REINFORCEMENTS divider is at line 44" — VERIFIED via `wc -l` + direct read; baseline REINFORCED count = 3.
- "tsconfig.test.json already includes `scripts/**/*.ts` from R73" — VERIFIED via direct read (line 16 of tsconfig.test.json).
- "Baseline tests=516 / pass=508 / fail=5 / skipped=3" — VERIFIED at session entry via direct `pnpm exec node --test` invocation.
- "Baseline tsc exit 0" — VERIFIED at session entry.
- "HEAD = 0a81fa9" — VERIFIED at session entry via `git rev-parse HEAD`.
- "R73 tier-router classifies R74 directive as `full`" — VERIFIED at session entry via `node scripts/tier-router.js --directive coordination/NEXT-ROLE.md --mode heuristic` → `{"tier":"full","rationale":"full anchor: architectural-decision, R61-class"}`.
- "REINFORCED line counts at round-start: ARCHITECT=39, IMPLEMENTER=33, REVIEWER=3, MEMORIAL=0, COMMON=7, COORDINATOR=2" — VERIFIED via grep.

### Q.2 Unstated assumptions?

- **A.1 (load-bearing):** The R74 chore-A pipeline run itself uses the PRE-R74 logic (static `MODEL_MEMORIAL=sonnet`), not the new logic. Bash reads run-pipeline.sh into memory at invocation; modifications during chore-A don't take effect for the running session. R74's OWN MU dispatch uses Sonnet (old behavior); R75+ pipelines pick up the new logic. This is intentional bootstrap behavior; recorded here for visibility.
- **A.2:** The `claude` CLI supports `--model claude-haiku-4-5-20251001`. If the Haiku model id is renamed at provider side, the pipeline's MU dispatch degrades to a CLI error → falls back to retry / BLOCKED state per existing retry logic. The selector's choice of model literal is informational; the actual `claude --model` invocation is what determines behavior. Acceptable risk.
- **A.3:** The R74 directive section in coordination/NEXT-ROLE.md does NOT itself contain any of the four anchor classes (verified mentally below at Q.6); the self-classification AC-R74-31 will predict `default_haiku`. If the Implementer's empirical run yields a different output, the AC's empirical-output-binding holds and the Implementer records the actual value.
- **A.4:** The pipeline-script modifications in § 2.5 do not introduce parse errors that would prevent `bash run-pipeline.sh --help` from succeeding. The Implementer verifies at chore-A by running `bash -n run-pipeline.sh` (syntax check).

### Q.3 Scope added beyond request?

Compared to the directive's 6 numbered Primary deliverables: NO scope additions.
1. MU default Haiku + Sonnet fallback → § 2.1..§ 2.4 + § 3.1 (mu-model-select.ts).
2. Reviewer scope differentiation + CLAUDE-REVIEWER.md Mode docs → § 0.2 + § 2.6.
3. `--reviewer-scope` flag in run-pipeline.sh → § 2.5 (a).
4. `coordination/logs/ROUND-R{N}-ROUTING.md` schema extension → § 2.5 (e).
5. test/q74-mu-haiku-reviewer-scope.test.ts → § 3.4 (22 test cases binding 22 ACs).
6. Q-R74-EMPIRICAL.sh → § 7 (Block 1..17).

Additions beyond directive-named items:
- `scripts/mu-model-select-fixtures/corpus.json` + 6 fixture .md files (required for deterministic tests; same pattern as R73 tier-router fixtures).
- `package.json` `mu-model-select` script (operator-side debugging convenience; consistent with R73 `tier-router` script).
- These are mechanically required for the test ACs to be deterministic; not scope creep.

### Q.4 Implementer can act without guessing?

- **Mechanism (§ 0):** picked (Approach C with four anchor classes; specific regexes enumerated in § 2.3).
- **Selector contract (§ 2.1, § 2.2):** fully specified.
- **Decision tree (§ 2.4):** four branches enumerated with priority order.
- **Anchor regexes (§ 2.3):** literal regex patterns for each class; Class C and Class D require co-occurrence.
- **run-pipeline.sh modifications (§ 2.5):** five blocks (a/b/c/d/e) with concrete bash code.
- **CLAUDE-REVIEWER.md insertion (§ 2.6):** literal text content with placement (between line 42 and line 44).
- **Fixtures (§ 3.3):** F1..F6 content guidance with anchor semantics constraint; Implementer composes minimal satisfying content.
- **ACs (§ 4):** 31 ACs across R/E/S bindings; each with clear Given/When/Then.
- **Halt conditions (§ 6.1):** 10 enumerated.

### Q.5 Cross-section consistency (R34 MINOR-2 / R65 MINOR-2 reinforcement)

Sweep performed for:
- Model literal vocabulary: `claude-haiku-4-5-20251001` and `claude-sonnet-4-6` uniformly used in § 0, § 2, § 3, § 4 (verified by spec-internal grep at write-time).
- Decision_path values: `tier_no_mu`, `operator_override`, `marker_match`, `class_A/B/C/D`, `default_haiku` — used consistently in § 2.4 + § 3.1 + § 3.2 + § 3.4 + § 4 (AC table).
- ALLOWED_SET path count: § 5.1 says "17 paths." Component inventory § 1.1 enumerates the same 17 (plus the 3 carve-outs which are not in the count). EMPIRICAL.sh Block 12 (per § 7) enumerates the same 17 paths.
- Anchor class names (A/B/C/D): same labels in § 0, § 2.3, § 2.4, § 3.1, § 4 (AC-R74-5/6/7/8).
- Round-start-SHA semantics: § 5.2 = "the spec-triad commit SHA"; § 5.1 = "round-start-SHA..HEAD diff"; § 6 halt condition #1 + EMPIRICAL.sh Block 1 reference the same SHA.

### Q.6 Claim-then-walk discipline (R72-promoted cross-project rule)

Per CROSS-PROJECT-MEMORIAL.md:38, every load-bearing codebase claim verified by direct command at spec-emit:

| Claim | Verification command | Result |
|---|---|---|
| HEAD = `0a81fa9` | `git rev-parse HEAD` | `0a81fa93f148c1a69cb5222c42aacbc54eeb6bf9` ✓ |
| Working tree clean | `git status --short` | empty ✓ |
| tsc exit 0 baseline | `pnpm exec tsc -p tsconfig.test.json; echo $?` | `0` ✓ |
| Test baseline 516/508/5/3 | `pnpm exec node --test --test-reporter=tap test/*.test.js | tail -10` | `tests 516 / pass 508 / fail 5 / skipped 3` ✓ |
| `MODEL_MEMORIAL="claude-sonnet-4-6"` at run-pipeline.sh:78 | grep | line 78 confirmed ✓ |
| `build_reviewer_prompt()` at run-pipeline.sh:1076 | grep | confirmed ✓ |
| `build_memorial_prompt()` at run-pipeline.sh:1255 | grep | confirmed ✓ |
| `get_model()` at run-pipeline.sh:1332-1344 | direct read | confirmed; MEMORIAL-UPDATER → MODEL_MEMORIAL ✓ |
| arg-parse pattern at run-pipeline.sh:118-184 | direct read | confirmed; existing case stmt with shift 2 / shift 1 pattern ✓ |
| --auto-tier integration block at run-pipeline.sh:186-209 | direct read | confirmed; routing log emission already at line 191 ✓ |
| main dispatch loop at run-pipeline.sh:1802-1836 | direct read | confirmed; iterates over $ROLES array per tier ✓ |
| ROLES per tier at line 244-250: full = (ARCHITECT IMPLEMENTER REVIEWER MEMORIAL-UPDATER); audit = (IMPLEMENTER REVIEWER MEMORIAL-UPDATER); solo = (IMPLEMENTER) | direct read | confirmed; solo + coordinator-only do NOT include MEMORIAL-UPDATER ✓ |
| run_role function flag construction at line 1531-1543: `flags+=("--model" "$model")` | direct read | confirmed; model passed via flag ✓ |
| 5 carry-forward failing test names | `pnpm test 2>&1 | grep "not ok"` filtered to AC-R36-21, AC-R36-30, AC-R36-31, AC-R65-2, AC-R66-14 | confirmed at chore-A baseline ✓ |
| CLAUDE-REVIEWER.md line 41-44 is `## Reviewer role boundary` block followed by REINFORCEMENTS divider | direct read | confirmed; line 41-42 = role-boundary; line 43 blank; line 44 = `# ── REVIEWER REINFORCEMENTS ───...` ✓ |
| CLAUDE-REVIEWER.md REINFORCED line count = 3 | `grep -c "^# REINFORCED"` | confirmed (3) ✓ |
| tsconfig.test.json includes `scripts/**/*.ts` from R73 | direct read | confirmed (line 16) ✓ |
| R73 tier-router routes R74 directive to `full` | `node scripts/tier-router.js --directive coordination/NEXT-ROLE.md --mode heuristic` | `{"tier":"full","rationale":"full anchor: architectural-decision, R61-class"}` ✓ |
| R74 directive section content anchor scan: contains `architectural-decision` (rule 2 full anchor for R73 router; NOT a Class A/B/C/D anchor for R74 selector) | direct read of NEXT-ROLE.md R74 directive section + mental anchor walk | Class A: no (no "cross-project promotion" etc.); Class B: no (no "MU batch" etc.); Class C: no (no "Reviewer-2" in directive; "Reviewer" appears but not "Reviewer-2"); Class D: no (no "operator-resolution" + "Option [A-F]"). Self-classification → default_haiku. AC-R74-31 predicts haiku for own directive (Implementer verifies). |

**Inherited-testimony NOT relied upon.** Every claim above traces to a direct verification command at session entry.

### Q.7 No forward-protection / live-file-count / anti-scope-diff-against-prior-round patterns

Sweep performed on AC table (§ 4):

- AC-R74-23/24 (BINDING-COMMAND ATTESTATION): bind VERBATIM observed output, not predicted-vs-actual. Architect predictions stated explicitly as "for visibility, not as the binding literal." ✓
- AC-R74-25 (ANTI-SCOPE diff): `git diff <round-start-SHA>..HEAD --name-only`. **historical-only diff bound by spec-triad SHA.** ✓
- AC-R74-26 (CARRY-FORWARD): asserts existence + identity of 5 specific failing test names + `# fail` summary = 5. **identity-bound, not raw-count-bound.** ✓
- AC-R74-27 (NO ENGINE/DEMO/TIER-ROUTER): `git diff <round-start-SHA>..HEAD -- <paths>`. **historical-only diff.** ✓
- AC-R74-28 (NO REINFORCEMENTS): `grep -c "^# REINFORCED"` AT chore-A HEAD compared against `git show <round-start-SHA>:<file>`. **historical comparison via git show, not a live-count assertion.** ✓
- AC-R74-29 (NO PRIOR-SPEC): `git diff <round-start-SHA>..HEAD` filtered to Q-R[0-7]* paths excluding R74. **historical-only diff.** ✓
- AC-R74-30 (R73 ANTI-REGRESSION): `pnpm tier-router:validate` exit 0. **command-output gate.** ✓
- AC-R74-31 (SELF-CLASSIFICATION): selector against own directive; **empirical-output-binding**, no predicted literal. ✓
- AC-R74-20 (REVIEWER REINFORCED COUNT UNCHANGED): asserts exactly `3` because that IS the round-start baseline (verified at session entry); not a future-state count assertion. ✓
- No AC asserts "the number of files in `scripts/mu-model-select-fixtures/` is exactly N" (would be a live-file-count pattern; AC-R74-22 asserts CORPUS COMPOSITION which is content, not file count).
- No AC asserts "git diff prior-round-attestation-HEAD..HEAD" (would be anti-scope-diff-against-prior-round).
- No AC asserts the existence of a future-round file.

### Q.8 Spec-internal contradictions sweep (R34 MINOR-2 / R65 MINOR-2)

Cross-checked:

- Model literal strings: `claude-haiku-4-5-20251001` and `claude-sonnet-4-6` everywhere; never `claude-haiku-4-5` (un-suffixed) or `claude-sonnet-4-6-20...` (un-suffixed vs suffixed inconsistency). ✓
- Anchor class A/B/C/D semantics: § 0 brainstorm prose, § 2.3 regex set, § 2.4 algorithm, § 3.1 pseudocode all match. ✓
- ALLOWED_SET count: § 5.1 = 17 paths; § 1.1 component inventory enumerates the same 17 (`scripts/mu-model-select.ts` + `corpus.json` + 6 fixtures + test + package.json + run-pipeline.sh + CLAUDE-REVIEWER.md + 3 spec triad files + MEMORIAL.md + NEXT-ROLE.md = 8 scripts paths + 1 test + 4 framework paths + 3 spec + 1 memorial + 1 next-role = 17 ✓). ✓
- Decision-path values consistency: same 6 string values used in § 2.4 + § 3.1 + § 3.4 (test). ✓
- Fixture name F1..F6: same 6 files in § 1.1, § 3.2 corpus, § 3.3 content, § 3.4 tests, § 4 ACs, § 5.1 ALLOWED_SET. ✓
- Round-start-SHA injection: § 5.2 + § 6 halt condition #1 + EMPIRICAL.sh Block 1 reference SAME placeholder mechanism. ✓
- Tier vocabulary (full/audit/solo/coordinator-only): consistent across all sections; matches R73 spec § 0 vocabulary + run-pipeline.sh existing TIER values. ✓

### Q.9 Discriminating-assertion gate (R71 MINOR-1)

For each AC, "would this AC FAIL if the implementation were correct but the load-bearing property were violated?":

- AC-R74-4: would fail if selector emits Sonnet on F1 (no-anchor full-tier).
- AC-R74-5..8: each would fail if its class regex doesn't match its fixture, OR if the selector incorrectly routes the matched class to a different output.
- AC-R74-9: would fail if anchor check fires on audit-tier (a regression where the marker check incorrectly applies to audit).
- AC-R74-10/11: would fail if selector dispatches a model for tier=solo or tier=coordinator-only.
- AC-R74-12/13: would fail if --mu-sonnet doesn't force Sonnet.
- AC-R74-14..17: would fail if any specific bash token is missing from run-pipeline.sh.
- AC-R74-18..20: would fail if Mode docs section is missing or REINFORCED count drifted.
- AC-R74-26: would fail if any of the 5 carry-forward identities is missing OR # fail ≠ 5.

### Q.10 Reinforcement sweep (R02..R72 lessons applied at spec-emit)

- **R02 type-declaration-site check**: NO TypeScript named types from engine surfaces are instantiated in spec pseudocode. R74 is tooling-only. ✓
- **R03 line-citation-cite-then-verify**: ALL file:line citations in this spec verified at spec-emit time (run-pipeline.sh:78, :118-184, :186-209, :1076, :1255, :1332-1344, :1531-1543, :1802-1836). ✓
- **R10 file-level docblock coverage**: NEW file `scripts/mu-model-select.ts` includes a header docblock per the pseudocode template (`// scripts/mu-model-select.ts — Memorial-Updater model selector (R74). ...`). ✓
- **R11 statistical-term-to-formula**: N/A (no statistical formulas). ✓
- **R15 anti-scope baseline correct**: Round-start-SHA = spec-triad commit SHA, NOT prior-attestation HEAD. § 5.2 explicit. ✓
- **R18 vendored-file-delta**: N/A (no vendored-with-deltas transitions). ✓
- **R20 AC-table preamble cross-check**: § 4 preamble names attestation types (R/E/S); each AC row's binding matches. ✓
- **R21 spec-commit-sequencing**: Q-R74-SPEC + Q-R74-SPEC-AUDIT + Q-R74-EMPIRICAL.sh committed in own commit BEFORE NEXT-ROLE.md routing block commit. ✓ (To apply at chore time.)
- **R25 cluster-worktree-empirical-baseline**: Tessera main worktree; baseline empirically verified (516/508/5/3). ✓
- **R30 grep-discriminability**: AC-R74-28 grep on `^# REINFORCED` is anchored; would not match comments. AC-R74-18 grep on `^## Mode: Structural-only Reviewer$` is anchored. ✓
- **R34 boundary-clause cross-check**: § 9.8 sweep performed. ✓
- **R44 grep-count-threshold**: AC-R74-20 binds COUNT-EXACT to known baseline value (3); not arbitrary threshold. ✓
- **R46 binding-command attestation tightness**: AC-R74-23 + AC-R74-24 bind VERBATIM observed output. ✓
- **R53 chore-A vs chore-B**: SINGLE-STATE spec; no chore-B. ✓
- **R56 carve-out for pre-documented failures**: N/A (no halt-condition exceptions). ✓
- **R58 constructor-options-symbol-drift**: N/A (no engine constructors in pseudocode). ✓
- **R65 routing-block-carve-out citation**: AC numbers in § 4 cross-checked against AC IDs in § 9. ✓
- **R65 § 9.8 type-shape cross-check**: SelectorResult interface in § 3.1 matches AC-R74-1 field list. ✓
- **R66 semantically-accurate field names**: `model`, `rationale`, `decision_path`, `matched_anchors` — all observable from selector's own state. ✓
- **R66 single-value replacement**: NO strikethrough patterns in this spec. ✓
- **R70 narrative-vs-executable consistency**: § 0 prose rules match § 3.1 pseudocode rules + § 2.3 regex set (verified by cross-section sweep). ✓
- **R70 regex strict discriminability**: anchor regexes use `\b` word boundaries where appropriate (e.g., `\bMU batch\b`, `\bESCALATE\b`, `\bOption\s+[A-F]\b`). ✓
- **R70 AC-`# fail`-vs-grep-count**: AC-R74-26 uses `# fail` summary field (TAP). ✓
- **R71 pre-authored narrative empirical verification**: NO pre-authored narrative strings about engine behavior. R73 router self-classification VERIFIED empirically at session entry (returns `full`). ✓
- **R71 candidate-set discriminating AC**: each AC binds the load-bearing property of its branch; alternate-branch routing would fail the matching AC (Q.9 walkthrough above). ✓
- **R72 architect-claim-without-empirical-walk + value-space cite-then-verify**: Q.6 walkthrough above. ✓
- **R72 ALLOWED_SET amendment propagation (MAJOR-2 → cross-project canonical)**: spec § 5.1 ALLOWED_SET, § 7 Rule 4 row, and Q-R74-EMPIRICAL.sh Block 12 enumerate the SAME 17 paths. Cross-checked at spec-emit. ✓
- **R73 self-reference**: R74 design preserves R73 tier-router; AC-R74-30 enforces the anti-regression. ✓

---

## § 10 Architect predictions (carried into spec-audit sidecar; not load-bearing for Implementer attestation per Rule 1)

Provided for spec-audit visibility. Implementer's chore-A attestation records actual observed values; if any deviates from prediction, the spec is wrong (HALT halt #5).

- N_new R74 test cases added = 22 (AC-R74-1 through AC-R74-22; AC-R74-23..31 are E/S-bound, not new runtime tests).
- Final tests = 516 + 22 = 538.
- Final pass = 508 + 22 = 530.
- Final fail = 5 (carry-forward identity preserved).
- Final skipped = 3 (preserved).
- tsc exit = 0.
- `pnpm tier-router:validate` exit = 0 (R73 anti-regression).
- Q-R74-EMPIRICAL.sh: 17 blocks (Block 1-17 per § 7 + § 4 binding columns); PASS 17 / FAIL 0.
- AC-R74-31 self-classification expected model: `claude-haiku-4-5-20251001` (R74 directive section in HEAD's NEXT-ROLE.md contains NO anchor class regex match per Q.6 manual walk). Implementer verifies empirically at chore-A; records observed value verbatim.
- ALLOWED_SET diff at chore-A: 17 paths exactly (per § 5.1) plus possibly `coordination/logs/ROUND-R74-ROUTING.md` (regex carve-out) if any pipeline invocation has fired.

---

## § 11 Pipeline invocation

```bash
cd /Users/johnwarren/concord/tessera
./run-pipeline.sh --round R74 --tier full
```

(Intentional: R74 runs full-tier despite designing tier-down mechanisms; first-round bootstrap preserves full discipline. R74's OWN MU dispatch uses the PRE-R74 logic — Sonnet — because bash reads run-pipeline.sh into memory at invocation; the new logic takes effect R75+.)

End of spec.
