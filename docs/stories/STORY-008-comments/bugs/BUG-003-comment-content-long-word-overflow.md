---
id: BUG-003
story: STORY-008
severity: minor
status: resolved
assignee: frontend-developer
---

# BUG-003: A single long unbroken word in comment content overflows and is clipped instead of wrapping

## Description

When a comment's Markdown content contains a single long token with no spaces (e.g. a long URL or identifier — realistic for a dev-coordination tool), the rendered text does not wrap inside the Comments section container. The rest of the paragraph text (containing normal spaces) wraps correctly, but a token long enough to exceed the container width overflows the container horizontally and is visually clipped, since neither `word-break` nor `overflow-wrap` is applied to the rendered Markdown content (confirmed both `normal` via computed styles).

## Steps to Reproduce
1. Open any host's Comments section (Story slide-over, Task Detail modal, or Milestone Detail).
2. Add a comment whose content includes a bulleted list item (or paragraph) containing one very long unbroken string of characters (150+ chars, no spaces/hyphens).
3. Observe the rendered comment.

## Expected Result
The long token wraps or breaks within its container, same as the rest of the checklist item's requirement: "no horizontal overflow, no clipped text, no distorted layout of neighboring comments."

## Actual Result
The long token overflows its `<li>`/`<p>` container — measured `scrollWidth` (1105px) is roughly 4x the container's `clientWidth` (285px) — and is visually clipped at the panel's right edge instead of wrapping.

## Additional Info
Computed style on the affected element:
```
wordBreak: "normal"
overflowWrap: "normal"
```
Suggested fix direction: apply `overflow-wrap: break-word` (or `anywhere`) to the Markdown-rendered comment content container so any single long token wraps instead of overflowing.

## Fix Applied
Added `[overflow-wrap:anywhere]` to the shared `MARKDOWN_CONTENT_CLASS` in `frontend/src/shared/utils/markdownStyles.ts`. `overflow-wrap` is inherited, so a single declaration on the outer content container now applies to every nested Markdown element (`p`, `li`, `code`, etc.) without needing per-selector overrides. `anywhere` (rather than `break-word`) was chosen so the container's flex/min-width layout also respects the break when computing intrinsic sizes, preventing the same overflow from resurfacing in different layout contexts.

This class is currently consumed only by `CommentRow.tsx` (Comments feature, STORY-008), so the fix is fully scoped to the reported container with no other call sites affected.

Verified: `npx vitest run` — 201/201 tests passed (no regressions); `npm run typecheck` — clean.

## QA Re-verification (qa-automation, 2026-07-20)

This is a visual/CSS rendering fix, explicitly out of automated scope per `docs/qa-automation-strategy.md` ("Visual rendering / appearance tests — manual QA responsibility"). No dedicated automated test applies. Full frontend suite re-run: 201/201 passed, no regressions.

Status → `resolved`.
