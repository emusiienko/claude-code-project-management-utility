---
id: BUG-004
story: STORY-002
severity: major
status: wont-fix
assignee: frontend-developer
---

# BUG-004: Dark mode is not implemented — no toggle and no CSS dark: rules

## Description

The Settings screen (and the entire application) has no dark mode support. There is no toggle button anywhere in the UI, and the compiled CSS bundle contains zero `dark:` Tailwind variant rules. Adding `class="dark"` to the HTML element has no visual effect.

## Steps to Reproduce

1. Navigate to `http://localhost:3000/settings`
2. Inspect the page for a dark mode toggle in the navigation or settings area
3. Inspect the compiled CSS for `.dark` selector rules
4. Programmatically add `class="dark"` to `<html>` and observe the result

## Expected Result

- A dark mode toggle is present in the UI (in the navigation or settings area)
- When dark mode is enabled, the application renders with a dark background and appropriate text/element colors
- No element retains a light background or light text that clashes with the dark theme

## Actual Result

- No dark mode toggle exists anywhere in the UI
- The compiled CSS contains zero `dark:` variant rules (`darkRulesFound: 0` from `styleSheets` inspection)
- Adding `class="dark"` to the HTML element has no visual effect — the page remains fully light

## Additional Info

Evaluation result: `{ darkRulesFound: 0 }` (checked all document.styleSheets at runtime).

Screenshots taken:
- `docs/qa/results/tc001-1280px-dark-mode.png` — page after adding `class="dark"` to HTML (identical to light mode)

## Resolution Note

Dark mode is out of scope for this project.
