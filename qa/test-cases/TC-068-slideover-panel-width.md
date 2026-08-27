---
id: TC-068
tags: @regression
story: STORY-005
status: Active
---

# TC-068: StorySlideOver Panel Width Is Approximately 90% of Viewport

## Preconditions

- App is running at `http://localhost:3000`
- At least one project and one story exist

## Steps

1. Set viewport to 1280px
2. Navigate to a project → Stories
3. Click on any story row to open the StorySlideOver panel
4. Measure the width of the slide-over panel (use browser DevTools to inspect the element or observe visually)
5. Compare the panel width against the viewport width

## Expected Result

The StorySlideOver panel occupies approximately 90% of the viewport width (≈ 1152px at 1280px viewport), leaving only a small uncovered strip on the left.
