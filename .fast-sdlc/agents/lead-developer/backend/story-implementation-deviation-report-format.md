<!-- Default format for the Story Implementation Deviation Report artifact — accept as-is or customize with lead-developer during Step 0 (Confirm Artifact Formats). One per story, per stack (if this repo has more than one), produced during lead-developer's own Reconcile (MODE 4) from that stack's task Implementation Reports. Each section is a numbered list of deviations — one entry per deviation, not grouped by task. Write "No deviations" in a section when nothing in it applies — that's itself the signal that the reader it's addressed to has nothing to reconcile. -->

# Story Implementation Deviation Report: STORY-NNN — <Story Title> (<stack, if this repo has more than one>)

## Architecture
Deviations from the Technical Implementation Plan / Architectural Design that architect needs to know about — approach changed, a planned component wasn't built as planned, an unplanned cross-repo dependency appeared.

No deviations — or, one numbered entry per deviation:
1. Planned (per Technical Implementation Plan / Architectural Design): <what was planned> — Actual: <what was actually built, and why>

## Data Models
Deviations from Architectural Design / Technical Documentation's Data Models affecting data structures, storage, or relationships — a field/entity/relationship that ended up different from what was planned.

No deviations — or, one numbered entry per deviation:
1. Planned (per Architectural Design / Technical Documentation's Data Models): <what was planned> — Actual: <what was actually built, and why>

## API Contracts
Deviations from Technical Documentation's API Contracts affecting a service's API surface — an endpoint, payload shape, or contract that ended up different from what was planned.

No deviations — or, one numbered entry per deviation:
1. Planned (per Technical Documentation's API Contracts): <what was planned> — Actual: <what was actually built, and why>

## Requirements
Deviations from Requirements affecting user-facing behavior — anything described there that isn't quite what got built.

No deviations — or, one numbered entry per deviation:
1. Planned (per Requirements): <what was planned> — Actual: <what was actually built, and why>
