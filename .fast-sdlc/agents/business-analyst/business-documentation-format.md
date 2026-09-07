<!-- Default format for the Business Documentation artifact — copied here for reference during Setup
     (STORY-001), renamed from documentation-format.md (2026-08-27, TASK-008) to match the plugin's
     current template filename after the "Documentation" artifact was renamed "Business Documentation"
     project-wide (see `sdlc` skill > Artifacts). Also revised 2026-08-27 (TASK-008): this is now the
     Logical Data Model's sole, permanent home (no longer duplicated with/transcribed from
     Requirements). Confirmed with the user to use as-is. -->

# Business Documentation Structure

As-built description of what the product actually does — never a to-do list, never proposed/unconfirmed behavior. No priorities, no story/task references: those belong to Requirements, not here.

```
<Business Documentation location>/
  index.md
  conceptual-data-model/
  logical-data-model/
  <capability-slug>.md            (flat — default)
  <domain>/<capability-slug>.md   (grouped — optional, mirrors whatever this project chose for Requirements)
```

"Capability" here is the same unit as a Requirements feature (Story Decomposition Rule 1, `sdlc` > business-analyst) — a user scenario or business capability, never a screen.

---

## `index.md`

```markdown
| Capability | File | Summary | Access |
|---------|------|-------------|--------|
```

## `conceptual-data-model/` (project-wide — entities often shared across capabilities)

Same artifact and format as Requirements, as actually built. No approval checkpoint — transcribed from what Requirements already had approved, corrected against what was actually built (see business-analyst agent > MODE 3: RECONCILE).

## `logical-data-model/` (project-wide — mirrors Conceptual's subject areas)

The Logical Data Model's sole, permanent home — not a copy of anything in Requirements. Populated directly, per subject area, by that subject area's Logical Data Model Task during a story's execution (see business-analyst agent > DATA MODELING); corrected in place at Reconcile if what was built diverged, never transcribed from elsewhere. If this folder doesn't fully exist yet because no story has reached Reconcile, the Task creates just this part of it early.

## `<capability-slug>.md` (one per capability)

```markdown
# <Capability Name>

## Happy Path
Step-by-step description of the primary scenario, from the user's perspective — including which distinct screens/views (if any) the user moves through, at a high level (name + purpose, not layout).

## Other Scenarios
Additional supported scenarios/variations, same level of detail as Happy Path.

## Who Can Access It
Public / Authorized users / Authorized users with <role/permission>

## Business Rules
Current rules that shape this behavior, as actually built.

## Known Limitations
Edge cases and constraints as they actually behave today.
```
