---
id: TC-127
tags: @regression
story: STORY-007
status: Active
---

# TC-127: Attachment viewer modal traps focus and Escape returns focus to the triggering row

## Preconditions
- App is running at http://localhost:3000
- A story has a document (Markdown) attachment and an image attachment

## Steps
1. Click View on the document row to open the viewer modal
2. Press Tab repeatedly and observe where keyboard focus moves
3. Press `Escape`
4. Observe where keyboard focus lands after the modal closes
5. Repeat steps 1–4 using the image row's viewer

## Expected Result
- While the viewer is open, Tab cycles focus only among elements inside the modal (close button, any in-modal controls) — focus never lands on elements behind the modal (e.g. the Attachments list, the slide-over)
- Pressing `Escape` closes the viewer modal
- After closing, keyboard focus returns to the View action on the row that originally opened the viewer
- This behavior holds for both the document viewer and the image lightbox
