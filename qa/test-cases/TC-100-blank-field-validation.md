---
id: TC-100
tags: @regression
story: STORY-020
status: Active
---

# TC-100: Saving a link_types entry with one or more blank fields shows a validation error

## Preconditions

- App is running at http://localhost:3000
- System Settings page is open at `/settings`
- Viewport: 1280px

## Steps — Scenario A: blank Value field

1. Navigate to `/settings`, scroll to the `link_types` section
2. Click Add to create a new entry
3. Leave **Value** blank; fill **Outbound label**: `depends on`; fill **Inbound label**: `dependent`
4. Click Save
5. Observe the result

## Steps — Scenario B: blank Outbound label

1. Click Add to create a new entry
2. Fill **Value**: `test-link`; leave **Outbound label** blank; fill **Inbound label**: `tested by`
3. Click Save
4. Observe the result

## Steps — Scenario C: blank Inbound label

1. Click Add to create a new entry
2. Fill **Value**: `test-link`; fill **Outbound label**: `tests`; leave **Inbound label** blank
3. Click Save
4. Observe the result

## Expected Result (all three scenarios)

- The entry is **not** saved
- A visible error message appears — either inline next to the blank field or above the Save button
- No "Something went wrong" overlay or page crash
- The partially filled row remains visible so the user can correct it
