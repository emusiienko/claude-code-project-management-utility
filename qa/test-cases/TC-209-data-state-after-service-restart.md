---
id: TC-209
tags: @regression
story: STORY-016 (FK enforcement)
status: Active
---

# TC-209: After a service restart, deleted data stays gone and surviving attachments still download

## Preconditions
- Dev stack running at http://localhost:3100
- Deletes from TC-204 to TC-208 done, including at least one cascade delete of an attachment-bearing parent, plus surviving attachments
- The user restarts the stack (`./deploy.sh down` then `up`) — manual-qa does not run it

## Steps
1. After the restart, open the app and reload.
2. Check that previously deleted projects, stories, tasks, milestones and their attachments are absent.
3. Download every surviving attachment.

## Expected Result
- The app starts normally; nothing deleted reappears.
- Every surviving attachment lists and downloads with its original content.
