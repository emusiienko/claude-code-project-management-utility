---
id: TC-186
tags: @smoke @regression
story: STORY-009
status: Active
---

# TC-186: Session Detail — three-way status control (pending/in-progress/finished), independent of result fields and freely reversible

## Preconditions
- App is running at http://localhost:3000
- A newly created session (`status: pending`, no result fields set) is open in Detail view
- Viewport at 1280px (desktop)

## Steps
1. Confirm the session's status control/chip shows `pending`, and result_decisions/result_summary are both empty. Confirm there is no "Mark complete"/"Mark incomplete" toggle anywhere on the page — only the three-way status control.
2. Set the status control to `finished` without filling in any result fields. Confirm the Detail view's status chip updates to `finished`, and the Sessions list's status chip for this session updates to `finished` too.
3. Set the status control back to `in-progress` on the same session. Confirm both Detail view and the list reflect `in-progress`. Then set it back to `pending`. Confirm the status can move freely in any direction between all three values, not just forward.
4. Now fill in result_decisions and result_summary, but do NOT change status. Save. Confirm the session's status is still `pending` — filling in result fields does not implicitly change status.
5. Set status to `finished` now that both result fields are set. Confirm it updates to `finished`, with the result fields still populated.

## Expected Result
- Status is controlled solely by the explicit three-way status control (`pending` / `in-progress` / `finished`), settable to any value from any other value, in any direction, at any time.
- Setting or leaving result_decisions/result_summary has zero effect on `status` in either direction.
- The Sessions list's status chip always reflects the session's current `status` value; there is no separate completion badge anywhere.
