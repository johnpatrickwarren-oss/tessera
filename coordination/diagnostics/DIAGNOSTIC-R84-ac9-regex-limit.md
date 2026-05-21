# DIAGNOSTIC-R84-ac9-regex-limit.md

**Round:** R84  
**Role:** IMPLEMENTER  
**Halt condition triggered:** #3 (fail ≠ 15 strict) and #5 (Architect spec uses round-evolution-fragile AC pattern)  
**Filed:** 2026-05-21

---

## Spec claim (exact quote from Q-R84-SPEC.md § 8.5 Q.5 "self-application gate")

> AC-R84-9 | Region regex matches ✓

And from Q-R84-SPEC.md § 5 discriminating-AC table:

> AC-R84-9 | Region regex matches ✓ | "Change postMessage payload to {controlState} without type:'run' → regex FAIL"

The spec prescribes verbatim (Q-R84-SPEC.md § 1.6):

```typescript
test('AC-R84-9: btnRun handler posts {type:"run",controlState} to worker', () => {
  const runRegion = HTML.match(
    /btnRun\.addEventListener\s*\(\s*['"]click['"][\s\S]{0,3000}?\}\s*\)\s*;/);
  assert.ok(runRegion, 'btnRun click handler must be present');
  assert.match(runRegion![0],
    /worker\.postMessage\s*\(\s*\{[\s\S]*?type:\s*['"]run['"][\s\S]*?controlState/,
    'btnRun handler must postMessage({type:"run", controlState: ...})');
});
```

---

## Reality (observed at chore-A)

**Observed fail count:** 16 (predicted 15 strict — halt condition 3)  
**Failing AC:** AC-R84-9 in the above test

**Root cause:** The spec-prescribed regex `/btnRun\.addEventListener\s*\(\s*['"]click['"][\s\S]{0,3000}?\}\s*\)\s*;/` uses a non-greedy quantifier `{0,3000}?`. This matches the SHORTEST string within 3000 chars that ends with `\}\s*\)\s*;`. The spec-prescribed btnRun handler body (from spec § 1.4) contains `scenarios['custom'].windows.push({...})` which ends with `});` at approximately character 1563 from the start of the handler. The non-greedy `{0,3000}?` stops there, capturing only ~1563 chars of the handler.

The spec-prescribed `worker.postMessage(...)` call (from spec § 1.4) is placed AFTER the `worker.onmessage = function(ev) { ... }` block, at approximately character 3129 from the handler start. It is NOT within the ~1563-char captured region.

**Verification command:**

```bash
node -e "
const fs = require('fs');
const HTML = fs.readFileSync('demos/demo.html', 'utf8');
const runRegion = HTML.match(/btnRun\\.addEventListener\\s*\\(\\s*['\"]click['\"][\\s\\S]{0,3000}?\\}\\s*\\)\\s*;/);
console.log('runRegion length:', runRegion ? runRegion[0].length : 'NO MATCH');
console.log('Has postMessage:', runRegion ? runRegion[0].includes('worker.postMessage') : false);
"
```

**Observed output:**
```
runRegion length: 1563
Has postMessage: false
```

**Why greedy limit alone doesn't fix it:** Increasing `{0,3000}?` to `{0,4000}` (greedy) doesn't help because greedy also matches up to the LAST `\}\s*\)\s*;` within the limit — but there are many `});` closings inside `worker.onmessage`. At `{0,6000}` greedy, the captured region extends to ~5049 chars and bleeds into the `btnCancel.addEventListener` handler (verified: `Has btnCancel: true`).

**Spec-internal contradiction:** The spec § 1.4 prescribes a handler that is ~3129 chars when rendered. The spec § 1.6 prescribes a test regex with a 3000-char non-greedy limit. The Architect's self-application gate (spec § 8.5 Q.5) attested "Region regex matches ✓" but the actual handler produced by the spec's own § 1.4 is longer than the test's regex limit allows. Both the handler and the test come from the same spec; the prediction of fail=15 was incorrect because this internal contradiction was not caught.

---

## Options (bounded; operator or Architect decides)

### Option A — Amend spec § 1.6: drop handler-region scoping for AC-R84-9, assert postMessage in full HTML

Replace the two-line region-check-then-match in AC-R84-9 with a direct HTML assertion:

```typescript
// Replace the current AC-R84-9 body with:
test('AC-R84-9: btnRun handler posts {type:"run",controlState} to worker', () => {
  assert.match(HTML,
    /worker\.postMessage\s*\(\s*\{[\s\S]*?type:\s*['"]run['"][\s\S]*?controlState/,
    'btnRun handler must postMessage({type:"run", controlState: ...})');
});
```

**Consequence:** `worker.postMessage({type:'run', controlState:...})` is verified as present SOMEWHERE in the HTML, not specifically within the `btnRun.addEventListener` handler region. Combined with AC-R84-8 (which DOES verify Worker is spawned inside the btnRun handler region, and `new Worker('./engine-worker.js')` IS within the first 1563 chars and passes), the combined discrimination is adequate: AC-R84-8 confirms the Worker is created in btnRun; AC-R84-9 confirms postMessage with the correct shape exists in the file. A mutation that placed postMessage outside the handler would likely also remove the Worker spawn from the handler, failing AC-R84-8.

**Changes required:** Spec § 1.6 AC-R84-9 amended; no implementation changes; EMPIRICAL.sh Block 4 predicted fail=15 remains correct (fix removes one failing AC, restoring to 15 total fail). No changes to `demos/engine-worker.js`, `tools/build-canned-demos.ts`, or `demos/demo.html`.

**Recommended.** Simplest fix; no implementation changes; discrimination adequate.

---

### Option B — Amend spec § 1.4: move `worker.postMessage(...)` BEFORE `worker.onmessage = function...`

Restructure the handler body so `worker.postMessage({type:'run', controlState:...})` is the last statement BEFORE the `worker.onmessage = function...` block (at ~1000 chars from handler start), bringing it within the `{0,3000}?` capture window.

```js
// Current order (§ 1.4 as written):
//   1. spawn worker
//   2. initialize scenarios.custom slot
//   3. set currentName / currentWindowIdx / selector.value
//   4. worker.onmessage = function (ev) { ... };    <-- large block, inner }); at ~1563
//   5. worker.onerror = function (err) { ... };
//   6. worker.postMessage({type:'run', controlState:...});  <-- at ~3129 chars

// Proposed order:
//   1. spawn worker
//   2. initialize scenarios.custom slot
//   3. set currentName / currentWindowIdx / selector.value
//   4. worker.postMessage({type:'run', controlState:...});  <-- MOVED HERE, ~1100 chars
//   5. worker.onmessage = function (ev) { ... };
//   6. worker.onerror = function (err) { ... };
```

**Consequence:** `worker.postMessage(...)` now precedes `worker.onmessage`. The Worker message arrives async; the main thread event loop will process responses only after the current synchronous execution completes, by which time `worker.onmessage` will be set. This is safe in practice (all modern browsers and Node guarantee this). However, it is a deliberate reordering of the behavioral contract and may surprise future readers expecting onmessage before postMessage.

**Changes required:** Spec § 1.4 JS block amended; `tools/build-canned-demos.ts` and `demos/demo.html` regenerated. No changes to `demos/engine-worker.js` or test file AC logic.

**Not recommended** — changes implementation order without behavioral necessity; surprises future readers.

---

### Option C — Amend spec § 1.6: use `indexOf` + `substring` to extract handler region

Replace the regex region capture with a string-based approach that correctly finds the handler's actual closing boundary:

```typescript
test('AC-R84-9: btnRun handler posts {type:"run",controlState} to worker', () => {
  // Find handler start; extract up to the postMessage call specifically.
  const runStart = HTML.indexOf("btnRun.addEventListener('click', function");
  assert.ok(runStart !== -1, 'btnRun click handler must be present');
  const handlerRegion = HTML.substring(runStart, runStart + 4000);
  assert.match(handlerRegion,
    /worker\.postMessage\s*\(\s*\{[\s\S]*?type:\s*['"]run['"][\s\S]*?controlState/,
    'btnRun handler must postMessage({type:"run", controlState: ...})');
});
```

**Consequence:** Extracts a fixed 4000-char window from the handler start, which is sufficient to capture `worker.postMessage(...)` at ~3129 chars while staying within the handler's total extent (which is ~3200 chars ending before `btnCancel.addEventListener`).

**Changes required:** Spec § 1.6 AC-R84-9 test body amended. No implementation changes.

**Viable but unnecessary** — substring approach works but is less idiomatic than the simple Option A direct assertion. Round-evolution risk persists: if a future round expands the handler past 4000 chars, same issue recurs.

---

## Implementer recommendation

**Option A.** It is the simplest amendment, requires no implementation changes, and the behavioral requirement is adequately discriminated by the combination of AC-R84-8 (Worker spawn in btnRun handler) + AC-R84-9 (postMessage with correct shape exists in HTML).

---

## Current uncommitted state at halt

At halt, the following files have GREEN changes that are NOT yet committed:

- `demos/engine-worker.js` — fully implemented (spec § 1.5 verbatim); **GREEN** for all its ACs (AC-R84-1..7 all PASS)
- `tools/build-canned-demos.ts` — markup + CSS + JS edits applied (spec §§ 1.2, 1.3, 1.4)
- `demos/demo.html` — regenerated; contains all R84 wiring
- `test/q84-live-engine-compute.test.ts` — GREEN body from spec § 1.6 (AC-R84-9 regex verbatim from spec)

RED commit SHA: `3056bc4` (message: `test(R84 RED): 17 assert.fail stubs for live engine compute ACs`)

Once operator/Architect resolves this escalation:
- If Option A: amend `test/q84-live-engine-compute.test.ts` AC-R84-9 body per Option A, recompile, re-verify counts, commit GREEN.
- If Option C: amend `test/q84-live-engine-compute.test.ts` AC-R84-9 body per Option C, recompile, re-verify counts, commit GREEN.
- In either case, no changes to `demos/engine-worker.js`, `tools/build-canned-demos.ts`, or `demos/demo.html` are required.
