# Reviewer Report — R65 (WU-Phase3-3B Tessera→DS feed adapter)

**Round:** R65 (full tier, single cluster).
**Reviewer mandate:** adversarial cold audit per CLAUDE-REVIEWER + role discipline (assume ≥ 1 mistake; find it).
**Cold-read inputs:** `coordination/PRD.md` (Phase 3 section), `coordination/specs/Q-R65-SPEC.md` (1635 lines), `coordination/specs/Q-R65-SPEC-AUDIT.md` (245 lines), `engine/ds-integration/feed.ts`, `engine/ds-integration/feed-contract.ts`, `engine/ds-integration/event-contract.ts` (untouched check), `engine/ds-integration/index.ts`, `engine/types/verdict.ts:120-310`, `test/q65-ds-integration-feed.test.ts`, `coordination/MEMORIAL.md` (R65 entries), `coordination/NEXT-ROLE.md`, `~/.claude/CROSS-PROJECT-MEMORIAL.md` (Reviewer section + relevant reinforcement-rule sections).
**Cold boundary held:** did NOT consult `coordination/diagnostics/`, `coordination/logs/`, or `.prompt-*.md`.
**Re-run binding commands at HEAD `752d8fb`:**
- `npx tsc -p tsconfig.test.json` → exit 0, zero diagnostics. AC-R65-17 PASS.
- `node --test --test-reporter=tap test/*.test.js` → `tests=427 / pass=422 / fail=2 / skipped=3`. AC-R65-18 PASS. 2 fails = `AC-R36-30` + `AC-R36-31` carry-forward from Phase 2 close `87e372f`.
- `bash coordination/specs/Q-R65-EMPIRICAL.sh` → `10 PASS, 0 FAIL`, exit 0.
- `git diff 59a03d0..e8d0cd1 --name-only | sort` → exactly the 8-path ALLOWED_SET.
- `git diff 59a03d0..HEAD --name-only | sort` → same 8 paths (only test file modified post-chore-A for SHA injection; only coordination files modified after that).
- `git cat-file -e e8d0cd1d7634c0ec7ba1d66f4f3808f87e9c357b` → 0 (injected SHA is a valid ref; equals chore-A).
- DECOUPLING-1 / DECOUPLING-2 (R62 invariant): contract files have zero cross-boundary imports — PASS.

---

## § 1 Per-AC verification table

| AC-ID | Criterion (short) | Status | Evidence |
|---|---|---|---|
| AC-R65-1 | `engine/ds-integration/feed.ts` exists | PASS | `engine/ds-integration/feed.ts` (read; 218 lines); `test/q65-ds-integration-feed.test.ts:141-143`; EMPIRICAL.sh `[ -f ... ]` PASS at HEAD |
| AC-R65-2 | `index.ts` has 3 export-star lines | PASS | `engine/ds-integration/index.ts:9-11` (`./feed-contract` + `./event-contract` + `./feed`); test:145-149; EMPIRICAL.sh `grep -cE` → 3 PASS |
| AC-R65-3 | `verdictGroupToFeedRequest` returns `contract_version: 'v1'` + `emitted_at_ts === arg` | PASS | `feed.ts:91-95` (literal `'v1'` + `emitted_at_ts` passthrough); test:151-156 |
| AC-R65-4 | A16 literal `correlational_not_causal: true` preserved (strict-equality) | PASS | `feed.ts:86` (inline literal `true`); test:158-163 (`assert.strictEqual(..., true)`); EMPIRICAL.sh `AC-R65-4-source` grep → 1 PASS |
| AC-R65-5 | `firing_family_count` = Set-dedup count | PASS | `feed.ts:75-78,84` (Set-based loop); test:165-174 (overlapping `['A','B']` + `['B','C']` → asserts `=== 3`, discriminating against pair-count 4 and verdict-count 2) |
| AC-R65-6 | `cluster_event_id` conditional propagation (present when set; absent when undefined) | PASS | `feed.ts:87-89` (conditional spread); test:176-185 (two sub-assertions: `=== 'evt-42'` and `'cluster_event_id' in payload === false`) |
| AC-R65-7 | POST method + path from contract const | PASS | `feed.ts:137-138` (`TESSERA_TO_DS_FEED_ENDPOINT.path` / `.method`); test:187-210 (mock server captures `req.method` + `req.url`; literal-equality checks against both constant + literal string) |
| AC-R65-8 | Auth headers propagated (`x-tessera-instance-id` + `authorization`) | PASS | `feed.ts:121-122`; test:212-236 (mock server captures `req.headers`; both keys asserted) |
| AC-R65-9 | 4xx → `FeedError.kind === 'http_4xx'` + status_code preserved | PASS | `feed.ts:155-160`; test:238-258 (status 400 → assert.equal `'http_4xx'` + status_code 400) |
| AC-R65-10 | 5xx → `FeedError.kind === 'http_5xx'` + status_code preserved | PASS | `feed.ts:148-153`; test:260-280 (status 503 → assert.equal `'http_5xx'` + status_code 503; status >= 500 branch is checked BEFORE >= 400 branch, so 503 correctly routes to 5xx) |
| AC-R65-11 | ECONNREFUSED → `FeedError.kind === 'network_error'` | PASS | `feed.ts:192-197` (`req.on('error', ...)` handler); test:282-294 (port 1; reserved port refuses connect; Promise resolves with `network_error`) |
| AC-R65-12 | Non-JSON body → `kind === 'invalid_response'` + reason matches `/JSON parse error/` | PASS | `feed.ts:162-174` (try/catch around JSON.parse); test:296-316 (body `'not-json'` → assert.match regex `/JSON parse error/`) |
| AC-R65-13 | Shape-mismatch JSON → `kind === 'invalid_response'` + reason matches `/shape mismatch/` | PASS | `feed.ts:176-185` (`!isFeedResponse(parsed)` branch); test:318-339 (body missing `correlation_key`; `isFeedResponse` returns false on `typeof undefined !== 'string'`; reason `/shape mismatch/`) |
| AC-R65-14 | Valid response → `ok: true` + `response.correlation_key` preserved | PASS | `feed.ts:186-187` (settle ok:true); test:341-366 (asserts `correlation_key === 'corr-key-xyz'` + status + contract_version) |
| AC-R65-15 | `TESSERA_TO_DS_FEED_ENDPOINT` imported; zero inline `/v1/tessera/verdict-groups` literals in `feed.ts` | PASS | `feed.ts:18` (import); test:368-375 (regex `.../from\s+'\.\/feed-contract'/s` matches; inline-literal count === 0); EMPIRICAL.sh `AC-R65-15a` + `AC-R65-15b` PASS |
| AC-R65-16 | `git diff 59a03d0..<CHORE_A_SHA> --name-only` ⊆ ALLOWED_SET | PASS | test:377-413 (chore-B post-injection state; SHA `e8d0cd1d...` valid ref; diff is exactly the 8 ALLOWED_SET paths); re-run at HEAD via `git diff 59a03d0..e8d0cd1 --name-only` confirmed identically. Two-state carve-out documented per spec § 5.4 |
| AC-R65-17 | `npx tsc -p tsconfig.test.json` exits 0 | PASS | Re-run at HEAD → exit 0; EMPIRICAL.sh block PASS |
| AC-R65-18 | `node --test ...` summary `tests=427 / pass=422 / fail=2 / skipped=3` | PASS | Re-run at HEAD: `427 / 422 / 2 / 3`. The 2 fails are `AC-R36-30` + `AC-R36-31` carry-forward (pre-existing; not introduced by R65). Two-state carve-out documented per spec § 5.4 |

**Verdict: 18/18 PASS at HEAD `752d8fb`.** All ACs structurally verified via re-executed binding commands or direct source-file Read.

---

## § 2 Findings

### § 2.1 CRITICAL

**None.**

### § 2.2 MAJOR

**None.**

### § 2.3 MINOR

**MINOR-1 — Architect routing block in `NEXT-ROLE.md` cites WRONG carve-out AC numbers.**
`coordination/NEXT-ROLE.md:234` (Architect routing block to Implementer; written by Architect at routing time, NOT in the spec proper) says:
> "Q-R65-EMPIRICAL.sh non-zero exit at chore-A for any reason other than pre-documented two-state mismatch (carve-out per R56 MINOR-1; **NARROWED post-R62 to AC-R65-10 + AC-R65-12 only** — do NOT propagate the structurally-vacuous forward-protection AC pattern; see R62 lesson)."

The spec § 5.4 (`Q-R65-SPEC.md:1396-1405`), § 6.1 item #1 (line 1424), § 5.1 AC-R65-16 + AC-R65-18 rows (lines 1358-1360), and § 10.8 spec-internal-contradiction sweep (line 1574) all correctly identify the two-state ACs as **AC-R65-16 (anti-scope diff) + AC-R65-18 (test summary)**, NOT AC-R65-10 + AC-R65-12 (which are the 5xx and invalid-JSON ACs respectively — neither has two-state shape).

**Why:** transposition error in the Architect's routing-block authoring (digits 16→10 and 18→12 both off by 6; suggests a copy-edit slip when re-typing AC numbers, not from-spec citation).

**How to apply:** the spec proper is authoritative; the Implementer correctly followed the spec (Implementer's own attestation at `NEXT-ROLE.md:32-40` cites AC-R65-16 + AC-R65-18 correctly). No deliverable correctness consequence. Audit-trail accuracy concern per multiple `line-citation-cite-then-verify` reinforcements (CROSS-PROJECT-MEMORIAL.md line 3875; CLAUDE-COMMON.md `REINFORCED 2026-05-18 — line-citation-cite-then-verify`). Future Architect routing-block authoring should grep the spec for the carved-out AC numbers and copy them verbatim rather than re-type from memory.

**Severity rationale:** MINOR (not MAJOR) because (a) the spec proper is correct and was the load-bearing input for the Implementer; (b) the Implementer's own attestation is correct; (c) no AC outcome or deliverable shape is affected; (d) the error is in a coordination document subsection that future-Reviewer-cold-eye-reading scope but doesn't enter the test/code binding path.

---

**MINOR-2 — Spec internal contradiction: `FeedError` shape differs between § 1.5 type-pretest pseudocode and § 4.1 prescriptive pseudocode.**

`Q-R65-SPEC.md` § 1.5 (lines 259-264; "Type-pretest pseudocode (Architect verification)") declares `FeedError` as a **discriminated union** with `status_code: number` REQUIRED on `http_4xx` and `http_5xx` variants:
```typescript
type FeedError =
  | { kind: 'network_error'; reason: string }
  | { kind: 'http_4xx'; status_code: number; reason: string }
  | { kind: 'http_5xx'; status_code: number; reason: string }
  | { kind: 'invalid_response'; status_code?: number; reason: string };
```

`Q-R65-SPEC.md` § 4.1 (lines 479-484; prescriptive code) declares `FeedError` as an **interface** with `status_code?: number` OPTIONAL for all kinds:
```typescript
export interface FeedError {
  kind: FeedErrorKind;
  status_code?: number;
  reason: string;
}
```

The Implementer correctly followed § 4.1 (`feed.ts:33-37`); § 4.1 is the prescriptive section. § 1.5 is documented as "Architect verification" scratch.

**Why:** § 1.5 was authored as a tsc-acceptability prediction in advance of writing the prescriptive code in § 4.1; the type shape evolved between the two sections without § 1.5 being updated.

**How to apply:** at consumer call-sites (e.g., the test at `test/q65-ds-integration-feed.test.ts:251-256`), callers must accept that `status_code` is optional in the type system even when the runtime always sets it for http_4xx/http_5xx. AC-R65-9 + AC-R65-10 do `assert.equal(result.error.status_code, 400)` / `503` — this works at runtime but the type system would accept `undefined` returns. The spec § 1.5 form would have given stronger type guarantees. Non-load-bearing for any AC outcome; recorded for future-Architect awareness when authoring § 4.x prescriptive code from § 1.x type-pretest scaffolding.

**Severity rationale:** MINOR (not MAJOR) because runtime behavior is correct; the only impact is weaker compile-time discrimination on a discriminated-union-shaped concept.

---

**MINOR-3 — Empty-`firing_verdicts` AC coverage is implicit (covered as "corner case" in § 9 but not bound by an explicit AC).**

Spec § 9 (line 1491) declares: "empty `firing_verdicts[]` → `firing_family_count === 0` (Set.size on empty Set)." This is a behavioral commitment of the projection, but no AC structurally exercises it. AC-R65-3 and AC-R65-4 use `makeGroup({})` which defaults `firing_verdicts: []` — they pass through the empty loop incidentally — but their assertions are on `contract_version` and `correlational_not_causal`, not on `firing_family_count`. AC-R65-5 uses the two-verdict synthetic case but doesn't exercise the 0-verdict path.

**Why:** the projection's `for` loop over empty array is trivially correct but is not pinned by any assertion. A regression where `firing_family_count` was initialized to `1` instead of using `families.size`, or to `group.firing_verdicts.length`, would pass AC-R65-5 (which uses 2 firing verdicts where coincidentally `length === 2 ≠ 3`, but… actually `length === 2` ≠ 3 catches that, but doesn't catch `length === 0 ≠ 0` for the empty case which is `0 === 0`).

**How to apply:** future-round / follow-up tactical AC could add `assert.equal(verdictGroupToFeedRequest(makeGroup({}), 500).verdict_group.firing_family_count, 0)`. Non-load-bearing for the present deliverable; recorded for branch-binding completeness audit per Rule 2.

**Severity rationale:** MINOR — gap is observation-level; the implementation is empirically correct on this case (an empty Set has size 0; verified by Read of `feed.ts:75-78,84`).

---

### § 2.4 OBS (observations; no required action)

**OBS-1 — Acknowledged branch-binding gaps in § 5.3 sweep cleanly.** The spec § 5.3 acknowledges 4 gaps: `request_timeout_ms ?? 5000` default; `req.statusCode ?? 0` default; `isFeedResponse` `typeof v !== 'object'` / `v === null` early-exit; `'timeout'` handler. Cold-eye audit confirms each rationale is honest and non-load-bearing for the 18 ACs (the timeout handler's `req.destroy(new Error(...))` chains into the `'error'` handler that AC-R65-11 binds; the JSON.parse primitive-value path converges to the same shape-mismatch outcome that AC-R65-13 binds; the defaults are not behavior-changing on well-formed inputs). All four gaps acceptable per Rule 2 "(b) acknowledged-gap section names it with non-load-bearing rationale."

**OBS-2 — `async` + explicit `Promise` wrap is stylistically redundant but semantically correct.** `feed.ts:113-205` declares `async post(...): Promise<FeedResult>` and returns `new Promise<FeedResult>((resolve) => { ... })`. The `async` keyword is redundant since the body returns a `Promise` explicitly; JS/TS flattens to `Promise<FeedResult>` either way. Implementation follows spec § 1.5 Pattern 4 pseudocode. No action.

**OBS-3 — Coordination chore SHA-recording extra commit.** Commit `752d8fb` ("record coordination chore SHA in Implementer routing block") lands after the routing block was committed at `0a19571`, modifying `coordination/NEXT-ROLE.md` only. This is a chase-the-HEAD pattern: the Implementer committed the routing block, observed the resulting SHA, then committed again to record that SHA inside the routing block. Pattern is honest but creates a minor audit-trail wrinkle (the routing block's "Coordination chore SHA" field references a commit subsequent to the routing block itself). No spec-discipline violation; no anti-scope drift (both commits modify only files in ALLOWED_SET). Recorded for awareness.

**OBS-4 — `TesseraToDsFeedClientOpts.protocol?: 'http'` accepted but unused.** `feed.ts:54` accepts `protocol?: 'http'` for forward-compatibility (D-5 acknowledged); the constructor stores `host`, `port`, and `timeoutMs` but never reads `protocol`. AC coverage absent (no AC structurally exercises protocol selection). Acceptable per acknowledged-gap rationale; the field reserves the constructor signature for a future HTTPS extension. Recorded for awareness.

---

## § 3 Right-reasons audit (3 tests)

### Test 1: AC-R65-5 (`firing_family_count` Set-dedup, `test/q65-...test.ts:165-174`)
**Spec requirement traced to:** § 2.1 "`firing_family_count`: `new Set(group.firing_verdicts.flatMap(v => v.firing_families)).size` — dedup count of distinct firing families across all firing verdicts."

**Discrimination check:**
- Test input: 2 firing verdicts with families `['A','B']` and `['B','C']` (overlapping `'B'`).
- Asserted output: `firing_family_count === 3`.
- Counter-checks: an implementation returning `group.firing_verdicts.length` (verdict count) would return 2 → FAIL. An implementation returning total `firing_families.length` summed (pair count, no dedup) would return 4 → FAIL. An implementation returning `firing_verdicts[0].firing_families.length` (first only) would return 2 → FAIL.
- The test discriminates against all three obvious wrong-implementations. ✓ **Right reasons.**

### Test 2: AC-R65-4 (A16 literal preservation, `test/q65-...test.ts:158-163`)
**Spec requirement traced to:** § 1.4 + § 2.1 + spec line 218 (A16 wire-format invariant per `engine/types/verdict.ts:298`).

**Discrimination check:**
- Test uses `assert.strictEqual(..., true)` — true literal equality, not truthy.
- Counter-checks: An implementation returning `1` (truthy but not `=== true`) would FAIL. An implementation returning `'true'` (string) would FAIL. An implementation that omits the field (undefined) would FAIL. The TypeScript type system additionally enforces the literal at compile time (`correlational_not_causal: true` not `boolean`); EMPIRICAL.sh `AC-R65-4-source` block independently asserts the source-grep finds the literal.
- Discriminates against coercion errors at both runtime and type-system levels. ✓ **Right reasons.**

### Test 3: AC-R65-15 (no inline path-literal duplication, `test/q65-...test.ts:368-375`)
**Spec requirement traced to:** § 2.2 + § 5.5 D-2 ("single source of truth via TESSERA_TO_DS_FEED_ENDPOINT"); also bound by EMPIRICAL.sh `AC-R65-15a` + `AC-R65-15b`.

**Discrimination check:**
- Test asserts (a) import statement matches regex pattern; (b) zero occurrences of inline literal `'/v1/tessera/verdict-groups'` in `feed.ts`.
- Counter-check: An implementation that hardcoded `path: '/v1/tessera/verdict-groups'` in the `http.request(...)` call would have 1 occurrence → FAIL on `pathOccurrences === 0`. An implementation that imported the const but stringified its path elsewhere would also FAIL.
- Discriminates against the "single source of truth" violation directly. The dual binding (runtime test + EMPIRICAL.sh grep) protects against either path being skipped.
- ✓ **Right reasons.**

No self-confirming tests detected.

---

## § 4 Cross-cutting checks

### § 4.1 TDD discipline
**Verified:** RED commit `8f8246c` ("test(R65 RED): q65-ds-integration-feed.test.ts — 16 assert.fail stubs") precedes GREEN commit `e8d0cd1` ("feat(R65 GREEN): engine/ds-integration/feed.ts + index.ts update + real tests"). At RED state, `engine/ds-integration/feed.ts` does not exist; module-resolution failure (TS2307) confirmed by Implementer attestation; node test baseline unchanged at 411/406/2/3. RED → GREEN ordering matches R23 IMPL MINOR-1 TDD discipline.

### § 4.2 No-skip / halt-discipline
**Verified:** No `DIAGNOSTIC-R65-*.md` was authored (would be in `coordination/diagnostics/` per spec § 3.2 conditional 9th path; not present). Implementer's chore-A run of EMPIRICAL.sh produced exactly the pre-documented two-state FAIL on AC-R65-18 only (chore-A summary `427/421/3/3` vs script-asserted chore-B `427/422/2/3`). Chore-B SHA injection brought the script to all-PASS. No halt-discipline violation. Per the carve-out scoped in spec § 6.1 #1 (AC-R65-16 + AC-R65-18 only), no halt was warranted.

### § 4.3 Anti-scope
**Verified:** `git diff 59a03d0..HEAD --name-only | sort` produces exactly the 8-path ALLOWED_SET — nothing outside ships in this round. Frozen surfaces unmodified:
- `engine/ds-integration/feed-contract.ts` last touched at R62 (`0018502`); unchanged.
- `engine/ds-integration/event-contract.ts` last touched at R62 (`0018502`); unchanged.
- `engine/types/verdict.ts` not in HEAD diff.
- `engine/events/*` not in HEAD diff.
- `engine/verdict-groups.ts` not in HEAD diff.
- `engine/fleet/verdict-consumer.ts` not in HEAD diff.

DECOUPLING-1 / DECOUPLING-2 R62 invariants confirmed PASS via EMPIRICAL.sh (0 cross-boundary imports in either contract file).

### § 4.4 Audit-trail accuracy
**One finding:** MINOR-1 (Architect routing-block AC-number typo). Otherwise the audit trail is clean: spec-AC ↔ test()-block ↔ feed.ts code paths are honest and verifiable; Implementer attestation at `NEXT-ROLE.md:32-40` encodes the actual binding-command outputs verbatim per Rule 1 sub-class `empirical-command-attestation`.

### § 4.5 Cross-project rule self-application sweep
- **Rule 1** (`false-compliance-attestation` / `empirical-command-attestation`): Implementer attested actual `427/421/3/3` at chore-A (NOT reframed); chore-B `427/422/2/3` matches re-runs at HEAD.
- **Rule 2** (`architect-branch-binding-coverage`): § 5.3 table is honest; 4 acknowledged gaps with non-load-bearing rationale; § 2.3 OBS-1 confirms each gap.
- **Rule 3** (`implementer-spec-test-assertion-coverage`): discriminating assertions throughout; right-reasons audit above confirms 3 tests.
- **Rule 4** (`anti-scope-allowed-set-forward-coverage`): 8-path ALLOWED_SET enumerated upfront; not expanded in test.
- **Rule 5** (`rule-derivation-without-self-application`): N/A (no new rule derived).
- **Rule 6** (`halt-discipline-no-DIAGNOSTIC-for-workaround`): 8 halt conditions enumerated; only the pre-documented two-state FAIL fired; no workaround inlined.
- **Rule 7** (`derived-rule-propagation-mechanism-required`): Surface (a) § 7 in spec; Surface (b) pre-commit-rule-sweep run; Surface (c) N/A pending Memorial-Updater.

All 7 rules honored.

---

## § 5 Grilling output (on this report, pre-route)

- Every finding has a file:line reference? **Yes.** MINOR-1 cites `NEXT-ROLE.md:234` + spec § 5.4/§ 6.1; MINOR-2 cites `Q-R65-SPEC.md:259-264` and `:479-484` + `feed.ts:33-37`; MINOR-3 cites spec § 9:1491 and `feed.ts:75-78,84`; OBS-1 through OBS-4 cite specific lines.
- Any AC marked PASS without actual verification? **No.** Every PASS row in § 1 cites either a re-executed binding-command result (tsc / node --test / EMPIRICAL.sh / git diff / git cat-file) or a direct source-file Read with file:line.
- Right-reasons audit completed for 3+ tests? **Yes** (§ 3 covers AC-R65-5, AC-R65-4, AC-R65-15).
- Was the mandate "find ≥ 1 mistake" satisfied? **Yes.** MINOR-1 + MINOR-2 + MINOR-3 found; MINOR-1 is a substantive audit-trail typo in a coordination document.
- Scope creep in the report itself? **No.** Findings are documentation; no fix attempts; role boundary held.

---

## § 6 Routing

**STATUS: MERGE-READY**

Findings: 0 CRITICAL, 0 MAJOR, 3 MINOR, 4 OBS. Per CLAUDE-REVIEWER routing rule "MAJOR or below → STATUS: MERGE-READY".

The R65 substantive deliverable — `engine/ds-integration/feed.ts` adapter (projection + HTTP client) — implements every spec § 2 + § 4.1 commitment honestly, with all 18 ACs passing at HEAD, all anti-scope honored, and TDD discipline observed. The MINOR findings are coordination-document / spec-internal issues that do not affect the merged code. Three of the four OBS items are acknowledged-gap confirmations.

**Reviewer-section MEMORIAL.md entries appended (separately):** 3 VIOLATIONs (1 ARCHITECT per MINOR-1; 1 ARCHITECT per MINOR-2; 1 ARCHITECT per MINOR-3) + CONFIRMATIONs for the substantive deliverable + cold-read boundary, per CLAUDE-REVIEWER REINFORCED 2026-05-17 and 2026-05-19 (committing-role attribution).
