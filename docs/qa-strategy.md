# Manual QA Strategy

> Owned by **manual-qa**. Update only at the user's explicit request.
> Last updated: 2026-06-29

---

## Scope

Manual QA covers the **visual and UI aspects** of the frontend application. Automated unit tests (Vitest) and API integration tests (pytest) are handled by qa-automation and are explicitly out of scope here.

| Layer | Manual QA | Notes |
|-------|-----------|-------|
| Visual layout and responsiveness | Yes | Primary coverage — layout, spacing, component appearance at all breakpoints |
| Component interaction design | Yes | Hover/focus/active/disabled states, transitions, drag-and-drop UX |
| Visual consistency across screens | Yes | Fonts, colors, spacing tokens, Tailwind design system adherence |
| Dark mode appearance | No | Not implemented in this project — excluded from all test cases |
| Accessibility (visual) | Yes | Focus rings, touch targets, color contrast, semantic landmark visibility |
| API contract correctness | No | Covered by qa-automation (pytest integration tests) |
| Business logic / validation rules | No | Covered by qa-automation |
| Frontend unit logic (hooks, utils) | No | Covered by qa-automation (Vitest) |
| MCP tools | No | Covered by qa-automation or explicitly out of scope |

---

## Target Environment

- **App URL**: `http://localhost:3000` (default local Docker mapping)
- **Browser targets**: Chromium (primary — Playwright default)
- **Viewport breakpoints** (from Tailwind config):
  - `md: 768px` — main responsive breakpoint
  - `lg: 1024px` — wide layout breakpoint
- **Test resolutions per TC**:

  | Column label | Width | Why |
  |---|---|---|
  | Mobile | 375px | Below all breakpoints; confirms mobile layout |
  | Below-md | 767px | Just below first breakpoint boundary |
  | At-md | 768px | Exactly at breakpoint — desktop layout triggers |
  | Desktop | 1280px | Typical large screen |

- **Minimum viewport per architecture.md**: 1,024 px (desktop-only product) — mobile/below-md checks are defensive smoke passes, not feature requirements.

---

## Screens in Scope

Derived from `docs/architecture.md` (frontend screen-based decomposition) and story descriptions:

| Screen | Route | Story |
|--------|-------|-------|
| Projects + Milestones | `/` | STORY-003, STORY-012 |
| Stories List | `/projects/:id/stories` | STORY-004 |
| Story Detail | `/projects/:id/stories/:storyId` | STORY-004, STORY-007, STORY-008 |
| Task Detail Modal | `?taskId=xxx` | STORY-005, STORY-007, STORY-008 |
| Task Kanban Board | `/projects/:id/stories/:storyId` (board section) | STORY-005 |
| Milestone Detail | `/milestones/:id` | STORY-012 |
| Sessions | `/sessions` | STORY-009 |
| System Settings | `/settings` | STORY-002 |
| Project Settings | `/projects/:id/settings` | STORY-002 |

---

## Severity Definitions

| Severity | Definition | Examples |
|----------|-----------|---------|
| `critical` | Blocks use of a core screen; application is unusable or crashes | Page does not render, white screen, infinite spinner, unrecoverable JS error |
| `major` | Key UI feature broken or significantly degraded; workaround does not exist | Kanban board columns invisible, drag-and-drop non-functional, modal does not open |
| `minor` | Visual defect visible to users but does not block core functionality | Misaligned element, wrong color token on a non-critical element, truncated text in one breakpoint |
| `trivial` | Cosmetic issue with no functional impact; only noticeable on close inspection | Off-by-one pixel spacing, inconsistent icon size, hover state color slightly off |

---

## Bug Assignment Policy

| Failure domain | Assignee |
|----------------|----------|
| Wrong visual rendering of a component (color, spacing, layout, typography) | `frontend-developer` |
| Interactive state not working (hover, focus, drag-and-drop, modal) | `frontend-developer` |
| Application crash / white screen / unhandled JS error in console | `frontend-developer` |
| Environment not reachable / Docker not running | `devops` |
| Page not rendered due to API returning wrong data | `backend-developer` |
| Ambiguous root cause spanning multiple layers | `TBD` — escalate to user |

---

## Test Case Tags

- `@smoke` — critical path checks; run after every deploy; covers one visual pass per primary screen at desktop viewport
- `@regression` — full visual suite; run before a release; includes all resolutions

Smoke ⊂ regression: every `@smoke` TC is also tagged `@regression`.

---

## Universal Visual Checklist

Apply to every visual TC at every resolution column:

- [ ] Page loads without exception screen or "Something went wrong" overlay
- [ ] No horizontal scrollbar appears
- [ ] No content overlap or clipping (text, images, cards)
- [ ] Grid and spacing are consistent — no unexpectedly wide gaps or collapsed rows; columns aligned with headers
- [ ] Text stays within container boundaries — no truncated or overflowed text
- [ ] Images scale correctly — no distorted aspect ratios
- [ ] Navigation adapts at the correct breakpoint (sidebar expands on desktop; collapses on mobile if applicable)
- [ ] Interactive elements are accessible — not pushed off-screen; touch targets >= 44px height on mobile
- [ ] Modals, dropdowns, and tooltips are positioned correctly within the viewport
- [ ] Element states render correctly: hover, focus, active, disabled, error (at least one interactive element per screen)
- [ ] Long content (long strings, many list items) does not break layout

---

## Test Run Process

1. Start app locally (`docker compose up` or equivalent)
2. Navigate to each screen; set viewport before navigating
3. Execute TC checklist row by row; mark pass (✓) or fail (✗)
4. On failure: take screenshot with `browser_take_screenshot`, note exact resolution and check that failed
5. Write run log to `docs/qa/results/STORY-NNN-<date>.md`
6. On all pass: mark `QA ✓` in `docs/stories/index.md`; clean up results file
7. On any fail: file `BUG-NNN` per failure; leave `QA ✓` empty; keep results file

---

## Out of Scope

- Any automated test writing — qa-automation owns all test scripts
- API response validation — qa-automation owns pytest integration tests
- Performance benchmarks — validated by architecture non-functional targets during implementation
- MCP tooling visual surfaces — MCP has no UI; out of scope
- Dark mode — not implemented in this project; do not include dark mode steps or checklist items in any test case
