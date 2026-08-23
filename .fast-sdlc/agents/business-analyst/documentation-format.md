<!-- Proposed format for the Documentation artifact (business-facing part — architect owns the technical/system-facing part separately) — not a confirmed default. Walk the user through it and confirm/adjust with business-analyst during Step 0 (Confirm Artifact Formats). -->

# Documentation Structure (business-facing part)

As-built description of what the product actually does — never a to-do list, never proposed/unconfirmed behavior. No priorities, no story/task references: those belong to Requirements, not here.

```
<Documentation location>/
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

## `conceptual-data-model/` and `logical-data-model/` (project-wide — entities often shared across capabilities)

Same two artifacts and formats as Requirements, as actually built. No approval checkpoint — transcribed from what Requirements already had approved, corrected against what was actually built (see business-analyst agent > MODE 3: RECONCILE).

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
