<!-- Default format for the Code Map artifact — accepted as-is for every stack (see
fast-sdlc-project-setup.md > Artifacts > Code Map); no per-stack confirmation needed. Owner: coder,
per repo/stack. Kept current at Reconcile. -->

# Code Map: <Stack> — `<repo path>/`

Flat markdown doc organized by the repo's existing top-level source folders (e.g. `app/`,
`features/<domain>/`, `shared/` for frontend; `core/`, `container/`, `mcp/`, `api/`, one section per
domain package for backend). One `##` section per top-level folder or domain package.

Each section holds one table:

| Module/File | Purpose | Key exports/functions | Notes |
|---|---|---|---|
| `path/to/file.ts` | one-line purpose | `exportedFn`, `AnotherExport` | anything non-obvious |

Module/function-level detail — more granular than the folder-level Repository Structure already in
root `CLAUDE.md`. Update existing rows in place rather than appending; add a row only for a new
module/file.

**Versioning**: document state + git history (no separate changelog).
