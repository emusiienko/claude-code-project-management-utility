# ADR-012: Dialect-aware JSON label filtering contained in the data layer

**Date**: 2026-07-07
**Status**: Accepted
**Decision**: Filtering a `labels` JSON array (`[{key, value}, ...]`) by `label_key` and/or `label_value` is implemented **inside the repository**, dialect-aware, behind a single dialect-agnostic interface. The story repository's paginated-list query exposes only `label_key` / `label_value` arguments to the service and controller; the SQL that reaches into the JSON column is private to the repository and dispatches on the active dialect. On **SQLite** it uses the `json_each` table-valued function with `json_extract(je.value, '$.key')` / `'$.value'` inside an `EXISTS` subquery. On **PostgreSQL** it uses `jsonb_array_elements` with the `@>` containment operator inside an `EXISTS` subquery. Dialect is detected once via `session.get_bind().dialect.name`. Filtering by a `label_key` no story carries returns an empty page, never an error; `label_key` and `label_value` narrow independently (either may be supplied without the other).

This is the first JSON-array filter in the codebase. The pattern is reusable by every later domain that carries `labels` and filters on them (tasks, comments).

**Options Considered**:
- Dialect-aware JSON filtering fully contained in the repository behind a neutral `label_key`/`label_value` interface (chosen)
- Fetch rows unfiltered and filter labels in Python in the service layer
- Denormalize labels into a separate `story_label` table and filter with a plain relational join
- Restrict the app to a single dialect to avoid the branch entirely

**Rationale**: The DB-agnostic constraint (ADR-002) requires the same models and services to run unchanged on SQLite and PostgreSQL, and mandates that any dialect-specific SQL stay inside the data layer. Pushing the filter into SQL (rather than filtering in Python) keeps pagination correct — `total` and `page`/`limit` must reflect the filtered set, which is only possible if the database applies the predicate before `LIMIT`/`OFFSET`. A separate `story_label` table would relationalize the filter but contradicts the contract's `labels` JSON-array shape and the replace-never-merge label semantics, and would spread a single logical write across two tables. Confining the branch to two private repository methods means the service, controller, and MCP tools remain identical across dialects and never see SQL.

**Trade-offs**: Two dialect-specific SQL paths must be maintained and tested for behavioral parity whenever label-filter behavior changes; a third dialect would require a third branch. Dialect detection relies on `session.get_bind().dialect.name`, which is correct under the current single-engine, synchronous-session wiring but would need revisiting if the project moved to multiple engines or async sessions. JSON-array filtering cannot use a conventional B-tree index, so very large per-project story sets filtered by label may scan; acceptable given the single-developer scale targets (list ≤1,000 rows, p95 < 500 ms).
