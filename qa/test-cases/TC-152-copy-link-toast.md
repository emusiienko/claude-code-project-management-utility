---
id: TC-152
tags: @regression
story: STORY-008
status: Active
---

# TC-152: Copy link — clipboard copy and confirmation toast

## Preconditions
- A host's Comments section has at least one comment
- Browser clipboard permissions are available in the test environment

## Steps
1. Click "Copy link" on a comment
2. Observe the toast/confirmation that appears
3. Paste the clipboard content somewhere (e.g. the browser address bar) to inspect the copied value

## Expected Result
- A brief confirmation toast appears reading something like "Link copied", consistent with the app's existing toast pattern
- The clipboard contains a direct, absolute URL to that specific comment
- No error appears if clipboard access succeeds; the toast disappears on its own after a short delay without blocking the page
