# NFR — Non-Functional Requirements

As-built non-functional targets for the AI Agent Coordination Utility. Each entry restates a
business-stated need as a measurable target and points back to Requirements via **Source**; the
business rationale lives there, not here.

---

### Single-resource CRUD latency

**Category**: performance
**Target**: p95 API latency < 200 ms for single-resource CRUD operations (create/read/update/delete of one entity).
**Source**: Requirements — non-functional performance targets (backend API responsiveness).
**Notes**: Applies to both the REST surface and the MCP tools, since they share one service layer.

### List latency

**Category**: performance
**Target**: p95 API latency < 500 ms for a list response of up to 1,000 items.
**Source**: Requirements — non-functional performance targets (list endpoints).
**Notes**: JSON-array `labels` filters are not B-tree indexable; this is acceptable at the ≤1,000-row list scale.

### Story aggregate latency

**Category**: performance
**Target**: p95 API latency < 300 ms for the story task aggregate (`GET /stories/:id/aggregate`) over a story with up to 500 tasks.
**Source**: Requirements — non-functional performance targets (on-demand aggregation).
**Notes**: Per-status counts are computed on demand via a batched `GROUP BY` (no N+1).

### Task detail latency

**Category**: performance
**Target**: p95 API latency < 500 ms for task detail (`GET /tasks/:id/detail`) composing up to 100 attachments and 200 comments.
**Source**: Requirements — non-functional performance targets (detail composition).
**Notes**: Detail composes links, attachments (metadata only), and comments in one service call.

### Concurrency

**Category**: performance
**Target**: Serve at least 5 concurrent requests without measurable degradation of the latency targets above.
**Source**: Requirements — non-functional concurrency target.
**Notes**: SQLite runs in WAL mode to allow concurrent reads under this requirement; PostgreSQL meets it natively.

### Frontend initial load

**Category**: performance
**Target**: Initial application load < 2 s.
**Source**: Requirements — non-functional frontend performance targets.
**Notes**: SPA (React + Vite) served as a static build by nginx.

### Client navigation

**Category**: performance
**Target**: In-app client-side navigation < 300 ms.
**Source**: Requirements — non-functional frontend performance targets.
**Notes**: Client-side routing (React Router) with server-state caching (TanStack Query) satisfies this without a round trip on cached views.

### Upload progress feedback

**Category**: performance
**Target**: Upload progress is shown for attachment files larger than 1 MB.
**Source**: Requirements — non-functional frontend usability targets (upload feedback).
**Notes**: Threshold constant mirrored on the frontend; smaller uploads complete without a progress indicator.

### Accessibility

**Category**: other
**Target**: WCAG 2.1 AA conformance across all views.
**Source**: Requirements — non-functional accessibility target.
**Notes**: Drag-and-drop (Kanban) uses an accessible library (dnd-kit); layered modals centralize focus-trap and Escape handling.

### Supported platform

**Category**: other
**Target**: Desktop-only; minimum supported viewport width 1,024 px.
**Source**: Requirements — non-functional supported-platform constraint.
**Notes**: No mobile/responsive commitment below 1,024 px.

### Rate limit

**Category**: other
**Target**: Rate limit of 1,000 requests/minute applied to all endpoints.
**Source**: Requirements — non-functional limits (request throttling).
**Notes**: Uniform across the REST surface.

### Attachment upload size limit

**Category**: other
**Target**: Maximum attachment upload size 10 MB per file.
**Source**: Requirements — non-functional limits (upload size).
**Notes**: Enforced before any bytes are written to the attachments volume, on both the multipart (Web UI) and MCP base64 create paths.

### Security posture — no authentication (by design)

**Category**: security
**Target**: No authentication, session tokens, roles, or authorization checks. The sole access boundary is Docker port mapping bound to `localhost` only; no service is exposed to the network.
**Source**: Requirements — single-developer, locally-hosted tool constraint; Architecture "Authentication Flow" (= none).
**Notes**: This is a deliberate design constraint for a single-developer personal tool, not an omission. Human and agents are structurally equal participants; `participant_role` / `author_role` / `assignee_role` are descriptive metadata, never access-control mechanisms. No application secrets exist (the only credential is the local Postgres password, used between containers only). See the Deployment / Infrastructure View § Access Boundary.
