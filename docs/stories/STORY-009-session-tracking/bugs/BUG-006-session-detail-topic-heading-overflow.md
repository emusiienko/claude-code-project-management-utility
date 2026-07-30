---
id: BUG-006
story: STORY-009
severity: minor
status: fixed
assignee: frontend-developer
---

# BUG-006: Session Detail view — a long unbroken topic causes full-page horizontal overflow via the page's heading (BUG-002's fix didn't cover it)

## Description
TC-017 (`tc-017-long-content-and-session-volume`) and TC-009 (`tc-009-session-detail-visual`)
both require that a long `topic` value wraps correctly in the Session Detail view without causing
horizontal overflow. BUG-002 fixed this for `context` (and, per its own notes, for every other
field routed through the shared `ReadField` component — Goal, Participant role, Result decisions,
Result summary). However, a session's `topic` is not rendered through `ReadField` — it is the
page's `<h1>` heading, which has no word-break handling at all. When `topic` is one long unbroken
string (no spaces), the heading renders as a single unbroken line that stretches the entire page
horizontally, exactly reproducing BUG-002's original symptom, just via a different field.

This is the same underlying gap as BUG-002 (missing `overflow-wrap`/`word-break` handling for an
unbroken string), on the one text field BUG-002's fix didn't reach. Confirmed present in both the
read view and the Edit view (the `<h1>` stays visible above the edit form in both modes).

## Steps to Reproduce
1. Open the Sessions list for "Test Project Alpha" and locate the session titled
   "LongTopicStress-AAAA…" (a session with a `topic` value of one long unbroken string, ~486
   chars, no spaces — the same session used to reproduce BUG-004).
2. Open that session's Detail view (`/sessions/02daf420-3c27-4b51-b0a0-67b65b741e9e/fc4e8bcf-ceb6-47a8-85f2-9dd0ddf32bd0`).
3. Observe the page-level heading showing the topic, and the page as a whole.

## Expected Result
The long unbroken topic wraps within the heading's container (e.g. via `overflow-wrap: anywhere`
/ `word-break: break-word`, the same treatment `ReadField` now uses), and no horizontal scrollbar
appears on the page — consistent with BUG-002's fix and with TC-017/TC-009's requirement that
topic, goal, and context all wrap correctly in Detail view.

## Actual Result
The `<h1>` heading renders the unbroken topic as a single line with no wrap opportunity, forcing
`document.documentElement.scrollWidth` to 7969px against a 1512px-wide viewport
(`document.documentElement.clientWidth` = 1512px) — a real, measured page-wide horizontal
overflow. Verified via DOM inspection: the `<h1>` itself has `overflow-wrap: normal` and
`word-break: normal` (no wrapping treatment applied), with its own `scrollWidth` of 7705px. Every
other field on the same page (Goal, Context, Result — decisions, Result — summary, etc., all
routed through `ReadField`) wraps correctly and does not overflow, confirming this is isolated to
the topic heading. The same overflow persists when the page is switched into Edit mode, since the
`<h1>` remains visible above the edit form in both modes.

## Additional Info
- Screenshot: `bug006-topic-heading-full-page-overflow.png` (full-page capture; the topic heading
  at the top of the page extends far past the viewport, confirming the page-wide horizontal
  overflow while Goal/Context below render correctly wrapped and contained).
- Reproduced at ~1512px browser width (well above the product's 1024px minimum supported width).
- This is a partial regression of BUG-002 in the sense that BUG-002 was closed as `fixed` on the
  understanding that its `ReadField` fix "covers every read-only field in this view" — that
  statement holds for every field except `topic`, which is rendered outside `ReadField` as the
  page's own heading and was not in scope of BUG-002's original repro (which used a long
  `context`, not a long `topic`).

## Fix
**Root cause**: confirmed as described — `topic` is rendered directly as the page's `<h1>` in
`SessionDetailPage.tsx`, bypassing the shared `ReadField` component entirely (and the
`break-words` treatment BUG-002 added to it). The `<h1>` had no `overflow-wrap`/`word-break`
handling, so a long unbroken `topic` rendered as a single unbroken line and stretched the whole
page horizontally — the same underlying gap as BUG-002, on a different element.

**Fix**: added Tailwind's `break-words` utility (`overflow-wrap: break-word`) directly to the
`<h1>` in `frontend/src/features/sessions/SessionDetailPage.tsx`, matching the treatment
`ReadField` already uses. This is the only element in the file needing the fix — the heading is
shared between read and edit mode (it stays visible above the edit form), so the fix covers both
per the bug report.

**Verified**: `npx tsc --noEmit` — clean, no errors. `npx vitest run` — 252/252 tests passing, no
regressions.

## Manual QA re-verification (2026-07-30, fifth Check Story — Execute pass)
**Still reproducible — reopened.** The `break-words` class is present on the `<h1>` and its
computed style does show `overflow-wrap: break-word` (confirmed via
`getComputedStyle(h1).overflowWrap`), so the class was applied correctly — but the page still
overflows: `document.documentElement.scrollWidth` = 7969px vs. `clientWidth` = 1512px, identical
to the original repro, and the topic heading visibly runs off the right edge of the viewport in a
screenshot (`tc009-bug006-recheck-still-overflow.png`).

**Root cause of why the fix didn't take effect**: the `<h1>` is itself a flex item — its immediate
parent is `<div class="flex flex-wrap items-center gap-3">`. A flex item's default
`min-width` is `auto`, not `0`; per the CSS flexbox spec this "automatic minimum size" means a
flex item will not shrink narrower than its own intrinsic (unwrapped) content width unless the
item itself has `min-width: 0` (or an equivalent, e.g. `overflow: hidden`) applied directly to it.
`break-words`/`overflow-wrap: break-word` only takes effect once the box is *forced* to a narrower
width than its content — but here the flex layout never forces that narrower width in the first
place, because the h1's own automatic minimum keeps it at its full intrinsic size (confirmed:
`getComputedStyle(h1).minWidth` = `"auto"`, and the h1's own `getBoundingClientRect().width` =
7705px, wider than its 1224px-wide flex-container parent). This is a well-known flexbox gotcha
distinct from BUG-002's original fix: adding `break-words` alone is not sufficient when the
wrapping element is a direct flex child — `min-w-0` (or equivalent) must also be added to the
flex item (the `<h1>` itself) for the wrap to actually engage.

Note for the next fix attempt: `ReadField`'s definitions (which BUG-002 fixed) are not flex items
in the same way, which is presumably why that fix worked there but not here — this is a
heading-specific layout interaction, not a copy-paste gap.

**Re-verified still failing**: TC-009 and TC-017 (Session Detail long-topic checks) — both fail
again for the same underlying symptom (page-wide horizontal overflow via the topic heading).
Screenshot: `tc009-bug006-recheck-still-overflow.png`.

## Second Fix Attempt (2026-07-30)

**Root cause confirmed**: exactly as diagnosed in manual-qa's re-verification note above — the
`<h1>` in `frontend/src/features/sessions/SessionDetailPage.tsx` is a flex item of its parent
`<div className="flex flex-wrap items-center gap-3">`. Flex items default to `min-width: auto`,
which pins them to their own intrinsic (unwrapped) content width regardless of any
`overflow-wrap`/`word-break` treatment — `break-words` alone never gets a chance to engage because
the box is never forced narrower than its content in the first place.

**Fix**: added Tailwind's `min-w-0` utility directly on the `<h1>` alongside the existing
`break-words`, so the flex item can shrink to the row's available width and the wrap can actually
take effect. No other element needed the change — the heading is shared between read and edit mode
(stays visible above the edit form in both), so this one change covers both, per the bug report.

**Verification methodology** (not just re-applying the class and trusting it): used Playwright
(`chromium`) against a local Vite dev server pointed at the running backend, loading the exact
repro session (`LongTopicStress-AAAA…`, project `02daf420-3c27-4b51-b0a0-67b65b741e9e`, session
`fc4e8bcf-ceb6-47a8-85f2-9dd0ddf32bd0`) at a 1512px viewport — the same session and viewport width
manual-qa used.

- **Sanity-checked the test itself first**: temporarily reverted the fix (git stash) and confirmed
  the script reproduces manual-qa's exact numbers — `document.documentElement.scrollWidth` = 7969px
  vs. `clientWidth` = 1512px, `h1.scrollWidth` = 7705px, `getComputedStyle(h1).minWidth` = `"auto"`.
  This confirms the measurement approach is valid before trusting a "fixed" result from it.
- **Re-applied the fix and re-measured**: `scrollWidth` (1512px) now equals `clientWidth` (1512px)
  — no page-wide horizontal overflow. `h1.getBoundingClientRect().width` = 1224px (shrunk to the
  row's available width, was 7705px), `getComputedStyle(h1).minWidth` = `"0px"`, and the heading's
  rendered height grew to 256px, confirming it now wraps across multiple lines instead of
  stretching as one unbroken line. Also re-checked with the page switched into Edit mode (heading
  stays visible above the form) — same result, no overflow.
- Full-page screenshot taken in the fixed state confirms the topic wraps cleanly within the page
  and no horizontal scrollbar is present.

**Regression check**: `npx tsc --noEmit` — clean, no errors. `npx vitest run` — 252/252 tests
passing (same count as the pre-fix baseline), no regressions.
