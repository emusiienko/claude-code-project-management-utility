# Manual QA Strategy

> Owned by **manual-qa**. Update only at the user's explicit request.
> Last updated: 2026-08-27 (STORY-001/TASK-007, SESSION-009 — relocated from legacy `docs/qa-strategy.md`
> via `git mv`, content adopted as-is except where noted below; history preserved.)

---

## Artifact Locations (fast-sdlc)

| Artifact | Location |
|----------|----------|
| This strategy | `.fast-sdlc/conventions/qa-strategy.md` (shared conventions folder, alongside the coding-conventions and devops-strategy docs — any role can read it without reaching into manual-qa's own agent folder) |
| Test case registry (master index) | `qa/test-cases.md` — top-level repo folder, sibling of `docs/`/`documentation/` |
| Individual TC files | `qa/test-cases/TC-NNN-<slug>.md` |
| Run results (temp, kept on failure) | `qa/results/` |

**No separate draft-TC location.** Per the user's explicit decision at TASK-007/SESSION-009, manual-qa
does not maintain a story-scoped draft test-case index pre-Reconcile. During **Check Story — Prepare**,
TC files are written directly into their final location (`qa/test-cases/`, with the row added straight
to `qa/test-cases.md`, next global `TC-NNN` assigned immediately) — never a local per-story numbering.
The manual-qa task for that story (if one was created for the Prepare step) lists the resulting TC ids
in its Implementation Report so the story keeps a traceable record of which cases cover it. Reconcile
therefore does not need a merge step for test cases — only the usual prune-stale-cases pass (mark
`Inactive` what no longer applies) and marking `QA Rec ✓`.

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

**Two concurrent local stacks exist (STORY-024) — always default to dev.**

| Stack | Web UI | Backend/MCP | When to use |
|-------|--------|-------------|-------------|
| **dev** (`STACK_NAME=dev`) | `http://localhost:3100` | `http://localhost:8100` | **Default — use for every manual/exploratory test run** |
| **prod** (`STACK_NAME=prod`) | `http://localhost:3000` | `http://localhost:8000` | Only when the user explicitly asks to test prod |

Rules:
- Point Playwright and any `WebFetch` calls at the **dev** addresses (`:3100` web / `:8100` backend) by default, for every TC, smoke run, and regression run.
- Never navigate to, exercise, or otherwise touch the prod addresses (`:3000` / `:8000`) unless the user's own message explicitly asks for prod to be tested. Being aware prod exists is not the same as testing it.
- If dev is not reachable at `:3100`, do not fall back to prod silently — report the environment as unreachable (bug assignee `devops` per the policy below) and ask the user whether to proceed against prod.
- This rule is environment-address guidance only — it does not change which screens/TCs are in scope.

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

> **Staleness note (2026-08-27):** this table reflects the routes as of STORY-012. Later stories
> (STORY-016 nav rework, STORY-022 overlay-based Projects/Config) changed several routes — the test
> case registry (`qa/test-cases.md`) already tracks this drift TC-by-TC (e.g. TC-026 marked Inactive,
> TC-173/TC-174 added for the overlay behavior), so it is the source of truth for current routes. This
> table is kept as historical orientation and should be refreshed the next time a Reconcile or story
> check touches navigation, rather than as part of this Setup.

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
| System Settings | `/settings` | STORY-002 (superseded — now the Config overlay, STORY-022) |
| Project Settings | `/projects/:id/settings` | STORY-002 (superseded — now the Projects overlay's Settings level, STORY-022) |

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

> **Role mapping updated 2026-08-27 (TASK-007, SESSION-009):** the team no longer has standalone
> `frontend-developer`/`backend-developer` roles — implementation is done by stack-scoped
> `coder` instances (backend, frontend; see `fast-sdlc-project-setup.md` > Team). The `assignee`
> field on a bug still holds just the role name `coder` (per `file-based-task-management`'s bug
> format — it isn't stack-qualified), so I note the affected stack in the bug's title/description
> (e.g. "coder (frontend)") so the orchestrator/user can route it to the right stack instance.

| Failure domain | Assignee |
|----------------|----------|
| Wrong visual rendering of a component (color, spacing, layout, typography) | `coder` (frontend) |
| Interactive state not working (hover, focus, drag-and-drop, modal) | `coder` (frontend) |
| Application crash / white screen / unhandled JS error in console | `coder` (frontend) |
| Environment not reachable / Docker not running | `devops` |
| Page not rendered due to API returning wrong data | `coder` (backend) |
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

1. Confirm the **dev** stack is up (`http://localhost:3100`) — do not start or touch prod (`:3000`) to do this; if only prod is running, ask the user before proceeding
2. Navigate to each screen using the dev addresses from § Target Environment; set viewport before navigating
3. Execute TC checklist row by row; mark pass (✓) or fail (✗)
4. On failure: take screenshot with `browser_take_screenshot`, note exact resolution and check that failed
5. Write run log to `qa/results/STORY-NNN-<date>.md`
6. On all pass and no bug left open: set the story `status: Approved` in its `description.md`
   frontmatter and in `.fast-sdlc/task-management/index.md`'s `Status` column (per this project's
   Task Management — see `file-based-task-management`; there is no separate `QA ✓` column here, the
   story status itself becomes `Approved`); clean up the results file
7. On any fail: file `BUG-NNN` per failure in the story's `bugs/` folder; leave the story status as-is
   (not `Approved`); keep the results file for reference

---

## Out of Scope

- Any automated test writing — qa-automation owns all test scripts
- API response validation — qa-automation owns pytest integration tests
- Performance benchmarks — validated by architecture non-functional targets during implementation
- MCP tooling visual surfaces — MCP has no UI; out of scope
- Dark mode — not implemented in this project; do not include dark mode steps or checklist items in any test case
