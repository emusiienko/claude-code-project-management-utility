---
status: Pending Approval
type: chore
priority: P2
date: 2026-08-01
---

# STORY-024: Dual Local Deployment (concurrent "live" + "dev" stacks)

## Desired Outcome
The developer can run two independent local Docker Compose stacks on the same machine at the
same time — e.g. a stable "live" stack (a separate checkout of a released version, such as
`main`) and a "dev" stack (the active working checkout) — without port or resource collisions, so
they can keep a stable instance running while developing and testing against a second instance.

## Context
The user's intended workflow: two separate folders/checkouts of this repository (e.g. this
project's working checkout for `dev`, plus a second checkout of `main` downloaded into another
folder once a release exists), each independently running `./deploy.sh up`. Docker Compose already
namespaces containers/networks/volumes by "project name," which defaults to the containing
folder's basename — so as long as the two checkouts live in differently-named folders, their data
volumes and containers won't collide by name alone. What currently *would* collide: the host port
bindings in `docker-compose.yml` are fixed (backend REST+MCP on one port, web on another,
PostgreSQL's port when that profile is active) — two stacks bound to the same host ports cannot
run simultaneously.

This is purely infrastructure/tooling — no business logic or API contract changes are involved.

## Acceptance Criteria
- [ ] Host port bindings for the backend (REST + MCP, single port) and the web UI are configurable
      via environment variables in `.env`, not hardcoded in `docker-compose.yml`; defaults match
      the current fixed values so existing single-stack usage is unaffected by this change
- [ ] `.env.example` documents the new port variables, including guidance for what values a second
      concurrent checkout should override
- [ ] Two checkouts of this repository, in separate folders, each with its own `.env` port
      overrides, can run `./deploy.sh up` at the same time without a port-binding conflict
- [ ] Each stack's data (SQLite file or PostgreSQL volume, attachments volume) stays isolated per
      checkout — verified explicitly (e.g. creating data in one stack and confirming it is absent
      from the other), not just assumed from Compose's folder-based project naming
- [ ] `docs/devops-strategy.md` documents the two-stack workflow: how to stand up a second
      concurrent instance from a separate checkout, and exactly which `.env` values must differ
- [ ] `./deploy.sh` continues to work unmodified for a single-stack user — no required change to
      how it's invoked

## Edge Cases & Error Scenarios
- [ ] Two checkouts left at identical default `.env` port values (user forgets to override) fail
      fast with a clear Docker port-binding error, rather than silently interfering with whichever
      stack is already running
- [ ] The optional PostgreSQL profile's port is also made configurable, for the case where a
      second stack also opts into it
- [ ] Whether both concurrent stacks can share a single PostgreSQL server instance (via distinct
      database names) versus needing fully separate PostgreSQL containers is an open design
      question, left to devops to decide and document
