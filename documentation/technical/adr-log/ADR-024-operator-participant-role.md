# ADR-024: `operator` participant role — the human-vs-agent distinction in `participant_roles`

**Date**: 2026-07-21
**Status**: Accepted

**Decision**: Add `"operator"` as an ordinary entry in the system-seeded `participant_roles`
dictionary, representing the **human orchestrator driving the Web UI** — as distinct from the AI-agent
roles that make up every other entry (`orchestrator`, `architect`, `backend-developer`,
`frontend-developer`, `devops`, `spec-writer`, `qa-automation`, `manual-qa`). The system default for
the new `default_web_ui_role` setting (ADR-022) is `"operator"`.

`"operator"` is a **plain dictionary entry**, not a special-cased value:

- It is selectable **anywhere** `participant_roles` is already consumed — a Task's `assignee_role`
  or `creator_role`, a comment's `author_role`, the `@role` mention combobox, the Default Web UI role
  dropdown. This ubiquity is an intentional side effect, not a restriction to work around.
- It carries **no** access-control or process meaning. Consistent with the project's no-auth design,
  all `*_role` fields are descriptive metadata; `"operator"` labels *who authored something through
  the Web UI*, nothing more.
- It is **distinct from the existing `orchestrator` agent role.** `orchestrator` is the
  agent-coordination role in the SDLC pipeline; `operator` is the human at the keyboard. They coexist
  as two separate dictionary entries.

**Options Considered**:
- **Add `"operator"` as an ordinary `participant_roles` entry** (chosen).
- **Introduce a separate "actor kind" concept** (human vs. agent) as a distinct field or dictionary,
  rather than folding the human into `participant_roles`.
- **Reuse the existing `orchestrator` entry** for the human, adding no new role.

**Rationale**:
- The utility needs a **name for the human** so the Web UI's default comment author is meaningful and
  so human-authored artifacts are attributable. A dictionary entry is the lightest thing that does
  this and it composes for free with everything that already reads `participant_roles`.
- A separate "actor kind" concept would be **process/identity machinery** the tool deliberately does
  not model (it stores facts, not process, and has no auth/identity layer). One more free-form
  dictionary entry keeps the model flat and honest.
- **Reusing `orchestrator` would conflate two genuinely different participants** — the coordinating
  agent and the human operator — losing the human-vs-agent distinction the setting exists to express.
- Seeding it (rather than requiring the user to add it) means a fresh install pre-fills the Add
  Comment form with a sensible human author out of the box, with zero configuration.

**Trade-offs**:
- `orchestrator` vs. `operator` is a **subtle naming adjacency** that a reader could confuse. Accepted
  and documented (here and in architecture.md § Seed data): they are deliberately distinct — agent
  coordinator vs. human operator.
- Because it is an ordinary entry, `"operator"` shows up as a valid choice in every
  `participant_roles`-backed picker, including ones conceptually agent-oriented (e.g. a task
  `assignee_role`). Accepted as the intended side effect — the tool does not enforce which roles are
  "allowed" where; that is the caller's judgment.
- Adding it to the seed required reconciling the seed across databases that predated the change (a
  live DB existed), handled by the additive backfill migration `0012_web_ui_role_backfill` (BUG-001);
  the seed change itself is not the source of that complexity, the in-place seed edit was.
