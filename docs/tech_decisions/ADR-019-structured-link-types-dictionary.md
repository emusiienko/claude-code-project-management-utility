# ADR-019: Heterogeneous Dictionary Value Shapes — Structured `link_types`

**Date**: 2026-07-13
**Status**: Accepted

**Decision**: The six settings dictionaries are no longer uniformly `string[]`. The `link_types`
dictionary stores structured entries `{ value, outbound, inbound }`; the other five keys
(`task_statuses`, `task_types`, `story_statuses`, `attachment_types`, `participant_roles`) remain
plain-string arrays. The single JSON `values` column on `system_settings` / `project_settings` is
typed `Mapped[list[Any]]` to carry both shapes. The `EffectiveDictionary.resolve()` Protocol keeps
its `list[str]` return contract: for `link_types` it extracts the `value` fields, so structured
objects are exposed only through the settings response schemas and never leak into link-type
validation.

**Options Considered**:
1. **Per-key heterogeneous shapes in the shared `values` column** (chosen) — one dictionary key
   (`link_types`) holds structured objects; the rest stay strings; resolution flattens `link_types`
   to `value` strings for consumers.
2. **Uniform structured shape for all six dictionaries** — promote every dictionary entry to an
   object with a `value` plus optional label fields.
3. **A separate table / column for link-type labels** — keep `link_types` as `string[]` and store
   the directional labels in a dedicated structure keyed by value.
4. **Keep the frontend's hardcoded slug→label map** — no data-model change (status quo before
   STORY-020).

**Rationale**:
- The driving requirement (STORY-020) is that custom link types added in Settings render with
  correct directional labels without a hardcoded frontend fallback map. The labels are per-entry
  data, so they belong in the dictionary entry — pushing the frontend to a pure adapter over the
  effective settings.
- Only `link_types` needs directional labels; forcing the other five dictionaries into an object
  shape (option 2) would be churn with no consumer benefit and would ripple through every dictionary
  validator, migration, and editor. Confining the structure to one key keeps the blast radius small.
- Keeping `resolve()` at `list[str]` means the two consumers of the effective dictionary that matter
  for correctness — `TaskLinkService` and `StoryLinkService` link-type validation — are unchanged.
  The membership check `link_type not in allowed` still compares raw strings against the set of
  `value` fields. No back-fill of stored `TaskLink.link_type` / `StoryLink.link_type` is required.
- A separate table (option 3) adds a join and a second write path for what is conceptually one
  dictionary entry; the JSON column already stores arbitrary per-key arrays, so widening it to
  `list[Any]` is the lowest-friction home for the structure.

**Trade-offs**:
- The `values` column is now genuinely heterogeneous by key. A reader must know that `link_types`
  is objects while the other five are strings — the type is `list[Any]` at the ORM boundary, and the
  per-key discipline lives in the schema/service, not the column type. Read-side coercion shims
  (`_coerce_link_type_entries`) defend against un-migrated legacy rows.
- The wire contract (`Settings` / `SettingsOverrides`) is no longer a uniform
  `Record<DictionaryKey, string[]>` on either backend or frontend; `link_types` is typed separately.
  This is a change to the LOCKED v1.0 contract (recorded as api-contract v1.4).
- Introducing a second structured dictionary later (should another key ever need labels) is now a
  well-trodden path, but each such key still needs its own validator branch and editor — the pattern
  generalizes in shape but not automatically in code.
- Duplicate-`value` and empty-list validation sit in the service layer (domain `ValidationError` →
  400) rather than the request schema (Pydantic → 422). This diverges from the story's stated 422
  for the duplicate case; see architecture.md § Known Divergences.
