---
id: BUG-002
story: STORY-008
severity: major
status: resolved
assignee: frontend-developer
---

# BUG-002: @role mention combobox does not close after selecting a match with the Enter key (mouse click works correctly)

## Description

The `@role` mention combobox's acceptance criteria (and the explicit WCAG 2.1 AA requirement in the UI/UX section) state that selecting a match — by mouse or by keyboard (`Enter`) — inserts `@<role-value>` as literal text and **closes the combobox**. Selecting a match by clicking it with the mouse works exactly as specified. Selecting the highlighted match with the `Enter` key inserts the text correctly, but the combobox/listbox remains open afterward, still showing the just-selected (now stale) option as highlighted, until the user takes an additional action (e.g. pressing `Escape`, or clicking elsewhere).

This was reproduced consistently across three independent trials (different textarea content, different matched roles: `@backend-developer`, `@devops`, `@architect`), each confirmed via a follow-up snapshot (not an artifact of a single reading).

## Steps to Reproduce
1. Focus the `content` field of the Add Comment form (or an existing comment's Edit form).
2. Type `@` followed by characters that narrow the suggestion list to a single match (e.g. `@arch`).
3. Press `Enter` to select the highlighted match.
4. Observe the combobox/listbox.

## Expected Result
`@architect ` (or whichever match) is inserted as literal text at the cursor, and the suggestion combobox/listbox closes immediately — identical to the outcome of clicking the option with the mouse.

## Actual Result
The text is inserted correctly, but the "Role suggestions" listbox remains open and expanded, still displaying the just-inserted option as the highlighted/selected item. It does not close until the user presses `Escape` or otherwise dismisses it manually.

## Additional Info
- Verified the click path (clicking an option in the listbox) correctly closes the popup immediately — the discrepancy is specific to the `Enter`-key selection path.
- Verified `Escape` and Arrow key navigation otherwise behave as expected (Escape dismisses without inserting text and returns focus/cursor correctly; Arrow keys move the highlighted option).
- This is an accessibility-relevant regression since the story explicitly calls out keyboard operability to the same WCAG 2.1 AA bar as the rest of the app for this "first non-native dropdown" in the product.

## Root Cause & Fix (frontend-developer)

**Root cause**: `selectIndex` (shared by both the mouse-click and Enter-key selection paths in `useMentionCombobox`) closes the trigger synchronously, then `MentionTextarea.handleInsert` inserts the text and defers the caret restore to the next `requestAnimationFrame` (`el.focus(); el.setSelectionRange(cursor, cursor)`), since the textarea's own DOM value only updates on the next React render. In the window between the insertion and that deferred restore landing, the browser can report one or more stray/transient selection states for the textarea (surfaced to React's `onSelect` "select" event heuristic, which also listens on `keydown`/`keyup`/`selectionchange`, not just an explicit `select` event). `MentionTextarea`'s `onSelect` handler unconditionally fed any such report back into `handleSelectionChange`, which re-derives and can re-open the trigger — reproduced directly by dispatching a `selectionchange` event with the caret positioned right after the inserted role name but before its trailing space (`"@architect"` vs. the actual inserted `"@architect "`), which re-matches the just-inserted role and reopens the listbox with it highlighted, exactly matching the reported symptom.

The mouse-click path is unaffected because the click that triggers `selectIndex` happens on the `<li>` option (via `onMouseDown` with `preventDefault`), not as a keyboard event dispatched on the textarea itself, so it doesn't trip this same `keydown`/`keyup`-driven `onSelect` refire on the textarea.

**Fix**: `useMentionCombobox.handleSelectionChange` now takes a `source: "change" | "select"` parameter. A `justSelectedRef` guard is armed the moment a selection (Enter or mouse) closes the trigger, and any `"select"`-sourced call is ignored while it's armed — regardless of how many stray reports fire. The guard is disarmed either by a genuine `"change"`-sourced call (a real keystroke always takes priority) or explicitly via a new `confirmCaretRestored()`, called by `MentionTextarea` right after its `requestAnimationFrame`-deferred `setSelectionRange` actually lands. This closes the whole window during which stray reports could reopen the combobox, without permanently suppressing legitimate later selection-only cursor moves (e.g. clicking back into a different existing `@partial` mention elsewhere in the content, which still reopens the combobox correctly).

**Files changed**:
- `frontend/src/features/comments/hooks/useMentionCombobox.ts`
- `frontend/src/features/comments/components/MentionTextarea.tsx`

**Verification**: no automated frontend test suite covers this component yet (frontend unit tests are owned by qa-automation); verified via a disposable Vitest+RTL harness (deleted afterward) that (1) reproduced the reported reopening by injecting a stray `selectionchange` report at the pre-fix-vulnerable cursor position, confirming it reopened before the fix and stayed closed after; (2) confirmed the fix isn't a fragile one-shot guard by firing the stray event twice; (3) confirmed legitimate later select-only cursor moves into a different mention still correctly reopen the combobox post-fix. Full existing Vitest suite (201/201) and `tsc --noEmit` pass with no regressions.

## QA Re-verification (qa-automation, 2026-07-20)

No dedicated automated test exists for `useMentionCombobox`/`MentionTextarea` — this is a coverage gap noted for future work (not currently in `docs/qa-automation-strategy.md`'s Test Files table), not something this re-verification can close by itself. Full frontend suite re-run: 201/201 passed, no regressions, consistent with the fix's own reported baseline. No automated evidence of regression; marking `resolved` on the strength of the full-suite pass plus the implementor's documented manual verification. Recommend a future qa-automation task add permanent `useMentionCombobox.test.ts` coverage for this interaction.

Status → `resolved`.
