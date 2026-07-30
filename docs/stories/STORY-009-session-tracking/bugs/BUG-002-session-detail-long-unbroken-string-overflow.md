---
id: BUG-002
story: STORY-009
severity: minor
status: resolved
assignee: frontend-developer
---

# BUG-002: Session Detail view — a long unbroken string in Context (or Status) causes full-page horizontal overflow

## Description
TC-017 (`tc-017-long-content-and-session-volume`) requires that long field values in the Session
Detail view wrap correctly and remain fully readable without clipping or overflow. `topic` and
`goal` values near 500 characters (built from multiple space-separated words) wrap correctly.
However, a `context` value consisting of one long unbroken string (no spaces) is rendered without
any word-break handling, causing it to overflow its container — and because it's not contained
at all, it stretches the entire page horizontally, producing a page-wide horizontal scrollbar.

Verified via `document.documentElement.scrollWidth` (3473px) vs. `clientWidth` (1512px) on a
1512px-wide viewport — a real overflow, not just a rendering assumption.

## Steps to Reproduce
1. Create a session with a `context` value that is one long unbroken string (no spaces), e.g. a
   ~400-character string of letters with no whitespace.
2. Open that session's Detail view.
3. Observe the Context field and the page as a whole.

## Expected Result
The long unbroken string wraps within the Context field's container (e.g. via
`overflow-wrap: anywhere` / `word-break: break-word`), and no horizontal scrollbar appears on the
page.

## Actual Result
The Context field renders the string as a single unbroken line that extends far past the visible
viewport, forcing the entire page into horizontal scroll. `topic` and `goal` (which contain
spaces) do not exhibit this problem in the same view, since default word-wrap only breaks at
whitespace boundaries — indicating the Context field (and likely `status`/`result_decisions`/
`result_summary`, which use the same rendering pattern) is missing the CSS handling needed for
arbitrary unbroken strings.

## Additional Info
- Screenshots: `tc-017-detail-context-overflow-full.png` (full-page capture showing the overflow)
  and `tc-017-detail-long-content.png` (viewport capture showing topic/goal wrapping correctly for
  comparison) in this bug's directory.
- The equivalent list view (`tc-017-list-long-topic.png`) does not show this problem for `topic`,
  since the session used to reproduce this only had a long unbroken value in `context`, not
  `topic`.

## Fix
**Root cause**: the shared `ReadField` read-only display component in `SessionDetailPage.tsx`
rendered field values with only `whitespace-pre-wrap` (which wraps at spaces/newlines only). A
long unbroken string has no such break opportunity, so it rendered as a single unbroken line that
overflowed its `dl`/grid container and stretched the whole page horizontally.

**Fix**: added Tailwind's `break-words` utility (`overflow-wrap: break-word`) alongside
`whitespace-pre-wrap` on `ReadField`'s `<dd>` in
`frontend/src/features/sessions/SessionDetailPage.tsx`. This lets the browser break within an
otherwise-unbreakable string when needed to stay inside its container, eliminating the page-wide
horizontal overflow. `ReadField` is shared by every read-only field in this view (Goal,
Participant role, Context, Result — decisions, Result — summary, Created, Updated), so the same
fix also covers `result_decisions`/`result_summary`, which the bug report flagged as likely
affected by the same pattern. Kept local to `SessionDetailPage.tsx` — no new shared CSS utility
was introduced, since a parallel fix for BUG-004 (Sessions List table overflow) is in flight in
the same feature area and may want a different, list-specific treatment.

**Verified**: `npx vitest run` — 252/252 tests passing, no regressions (baseline was also
252/252). `npx tsc --noEmit` shows two pre-existing errors in `SessionForm.tsx` from a
concurrent, in-progress parallel fix (BUG-003) in the same feature folder — unrelated to this
change, which only touches `SessionDetailPage.tsx`.

## QA Verification (2026-07-30)
Re-tested against the original repro session (long unbroken `context`, ~2025 chars). Confirmed
the Context field now wraps within its container via `break-words`, and no longer contributes to
page-wide horizontal overflow. Goal/Result — decisions/Result — summary (also routed through
`ReadField`) verified clean as well. Marking `resolved`.

Note: a related but distinct overflow was found on the same page during this pass — the page's
`<h1>` heading (which displays `topic`, not routed through `ReadField`) has no word-break handling
and still overflows the page when `topic` itself is a long unbroken string. Filed separately as
BUG-006 since it is a different element/field than this bug's original repro (`context`).
