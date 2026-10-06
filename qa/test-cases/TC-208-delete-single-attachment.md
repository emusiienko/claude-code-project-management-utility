---
id: TC-208
tags: @smoke @regression
story: STORY-016 (FK enforcement)
status: Active
---

# TC-208: Deleting a single attachment removes it at once and leaves the others

## Preconditions
- App is running at http://localhost:3100
- A story with two attachments, "keep.txt" and "drop.txt" (both created more than an hour ago, and a third "fresh.txt" just added)

## Steps
1. Delete "drop.txt" (confirm); then delete "fresh.txt" immediately after adding it.
2. Reload the story.
3. Try to download "keep.txt".
4. Try to open the removed attachments by their earlier direct links.

## Expected Result
- "drop.txt" and "fresh.txt" disappear from the list at once, regardless of age.
- Their direct links report not found.
- "keep.txt" is listed and downloads with its original content.
