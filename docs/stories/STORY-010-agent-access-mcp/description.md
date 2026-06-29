---
status: Planned
type: feature
priority: P0
date: 2026-06-28
---

# STORY-010: Agent Access via MCP

## Desired Outcome
AI agents can access all utility operations — reading work state on startup and writing results directly — via the MCP protocol. Agents no longer need to read from or write to the git repository for routine operational state; the utility becomes the single authoritative coordination space.

## Context
MCP is the primary access surface for all AI agents in the pipeline (architect, backend-developer, spec-writer, etc.). Every operation available in the utility must be reachable via MCP so agents can work without any REST client or git operations. The utility's core value — persistent state outside git, cross-restart continuity, cross-project coordination — is only realised once agents can connect and operate through MCP. Access is controlled by Docker port mapping to localhost; no authentication layer is required.

## Acceptance Criteria
- [ ] An MCP server starts alongside the utility and exposes all operations: project management, story management, task management (including detail view), settings, task linking, attachments (including file content submission and retrieval), comments, and session tracking
- [ ] Each MCP tool corresponds 1-to-1 with a REST operation; input parameters and output shapes match the REST contract exactly
- [ ] An agent can retrieve the full work state for any project — stories, tasks with their detail — in a startup read sequence without any additional configuration
- [ ] An agent can write a task status update, an implementation report (as a document attachment), and a session result each in a single MCP call
- [ ] The MCP server requires no authentication; access is bounded by Docker port mapping to localhost only

## Edge Cases & Error Scenarios
- [ ] If the MCP server fails to start, the REST API continues to function; a status endpoint indicates MCP availability
- [ ] All MCP validation errors return structured messages that match the REST API error shape (`error`, `code`, `details`)
- [ ] An MCP call that references a non-existent resource (project, story, task) returns a not-found error with the resource type and id
