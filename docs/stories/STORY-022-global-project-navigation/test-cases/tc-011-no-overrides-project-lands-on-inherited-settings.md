---
id: tc-011
tags: @regression
story: STORY-022
status: Active
---

# tc-011: Project with no settings overrides — Settings panel shows inherited defaults, no crash

## Preconditions
- App is running at http://localhost:3000
- A project exists that has never had any project-level settings overrides configured

## Steps
1. Open the Projects overlay.
2. Click the name of a project that has no project-level overrides.
3. Verify the panel pushes to that project's Settings level.
4. Verify all dictionary values shown are inherited from System Defaults, with no "Override" badge on any key, and no crash/blank/broken sections.
5. Verify an unresolved/deleted project id (if reachable, e.g. via a stale list render) yields the pre-existing not-found state rather than a broken panel.

## Expected Result
- The Settings panel for a project with no overrides loads correctly and shows values inherited from system defaults.
- This pre-existing inherited-state behavior is unaffected by the Revision 3 overlay change — only the rendering context (panel vs. former standalone screen) differs.
