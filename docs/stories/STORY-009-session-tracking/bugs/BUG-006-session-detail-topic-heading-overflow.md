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
