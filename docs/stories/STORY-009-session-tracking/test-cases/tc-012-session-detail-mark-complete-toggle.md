---
id: tc-012
tags: @smoke @regression
story: STORY-009
status: Active
---

# tc-012: Session Detail — Mark complete / Mark incomplete toggle, independent of result fields

## Preconditions
- App is running at http://localhost:3000
- A newly created session (incomplete, no result fields set) is open in Detail view
- Viewport at 1280px (desktop)

## Steps
1. Confirm the session shows as incomplete/pending, and result_decisions/result_summary are both empty.
2. Click "Mark complete" without filling in any result fields. Confirm the session now shows as complete, and the Sessions list's completion indicator for this session updates to complete too.
3. Click "Mark incomplete" on the same session. Confirm it reverts to incomplete/pending in both Detail view and the list.
4. Now fill in result_decisions and result_summary, but do NOT toggle completion. Save. Confirm the session still shows as incomplete/pending — filling in result fields does not implicitly mark it complete.
5. Click "Mark complete" now that both result fields are set. Confirm it becomes complete, with the result fields still populated.

## Expected Result
- Completion state is controlled solely by the explicit Mark complete/incomplete toggle.
- Setting or leaving result_decisions/result_summary has zero effect on `is_complete` in either direction.
- The Sessions list's completion indicator always reflects the current `is_complete` value.
