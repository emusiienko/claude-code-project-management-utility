# ADR-022: Scalar (single-value) settings live in the shared dictionary store

**Date**: 2026-07-21
**Status**: Accepted

**Decision**: A setting that holds **one value** (rather than a list) reuses the existing settings
store — the same `(key, values)` row in `system_settings` / `project_settings`, the same
system-default + project-override resolution, and the same clear-override path — rather than getting
its own table, column, or resolution mechanism. The first such setting is `default_web_ui_role`
(STORY-008): the value the Web UI pre-fills into a new comment's `author_role`.

Concretely, as built for `default_web_ui_role`:

- The value is stored as a **bare JSON string** in the same `values` column the dictionaries use
  (which otherwise holds a plain-string array or, for `link_types`, structured objects). The ORM
  `values` type hint was widened from `Mapped[list[Any]]` to `Mapped[Any]` — a Python-side hint
  change only, no DDL migration.
- It is exposed as a **scalar** (`string`, not `string[]`) on the settings request/response schemas
  and appears in the effective-settings payload alongside the five dictionaries.
- On write it is validated: non-empty **and** a member of the effective `participant_roles` for the
  write's scope (system `participant_roles` for a system write; the project's effective set for a
  project override). Violations raise `UnprocessableError` → **422** with the shared
  "Value '{v}' is not allowed. Allowed: {list}." message. It is never re-validated on read.
- Key sets were split so list-only call sites stay correct: `ALL_DICT_KEYS` (the five dictionaries)
  is kept distinct from `ALL_SCALAR_KEYS` (`default_web_ui_role`), unified as `ALL_SETTINGS_KEYS`.

The setting is deliberately named **generically** ("default Web UI role"), not "comment author," so
a later story can point another entity's author/creator-style field (e.g. a Task's `creator_role`)
at the same setting without introducing a second one. Comments are its first and, for now, only
consumer — and the comment backend does **not** read it (the Web UI supplies `author_role` on every
create; the setting only pre-fills the form).

**Options Considered**:
- **Scalar value in the existing settings store, key-set split** (chosen).
- **A dedicated table/column for single-value settings** (e.g. a `app_settings` key/value table
  separate from the dictionary store).
- **Model the scalar as a one-element list** in the dictionary store, unwrapping at the schema
  boundary, so the store stays homogeneously list-valued.

**Rationale**:
- The store already provides exactly the machinery a configurable single value needs — keyed rows,
  system-default + project-override resolution, and the effective-settings surface. A second store
  would duplicate all of it for no behavioral gain.
- The `values` column was **already heterogeneous** (plain-string arrays vs. structured `link_types`
  objects, ADR-019), so carrying a bare string is a natural extension, not a new precedent. It needs
  no schema migration — only a type-hint widening.
- Keeping `ALL_DICT_KEYS` separate from the scalar set means the resolution loop and the
  dictionary-editor UI that assume list-shaped values keep working untouched, without runtime type
  sniffing — the split is the load-bearing part of the decision, and it gives a future second scalar
  setting a ready-made home.
- Validating the scalar against the *effective* `participant_roles` (not the raw system list) makes a
  project override correct under a narrowed dictionary, while leaving an inherited system default that
  sits outside a project's narrowed set benign — the comment's own `author_role` is free-form and
  never dictionary-validated, so nothing downstream breaks.

**Trade-offs**:
- The `values` column is now genuinely polymorphic (array | structured-array | scalar), so any code
  reading a settings row must know a key's shape. Contained by the key-set split and the schema layer,
  which own the per-key shape; no caller inspects `values` blindly.
- Modeling the scalar as a real scalar (rather than a one-element list) means the type-hint widening
  to `Mapped[Any]` gives up static list typing on the ORM attribute. Accepted — the schema layer
  re-establishes the precise per-key type, and a one-element-list encoding would have leaked an
  unwrap/rewrap dance into every read/write of the value.
- Reusing the dictionaries' clear-override path means the scalar inherits the **existing** unclosed
  clear-override gap (no REST/MCP route, STORY-002) verbatim. Accepted; STORY-008 does not close it,
  and doing so is tracked separately.
