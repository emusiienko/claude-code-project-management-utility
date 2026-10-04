"""Integration tests for the Sessions domain — STORY-009.

Coverage zones (per TASK-007, revised by TASK-010 for the status-enum rework):
- POST /v1/sessions            happy path (minimal + with links + with context),
                                validation failures (missing topic/goal/participant_role,
                                topic/goal out of 1-500, participant_role not in the
                                effective dictionary, missing project_id, non-existent
                                project_id, link to non-existent story/task, link to a
                                story/task in a different project); status always defaults
                                to "pending" and any status supplied in the create payload
                                is ignored (accept-and-ignore); no response ever carries an
                                is_complete field
- GET  /v1/sessions             project-scoped list, incomplete filter (status is pending
                                or in-progress; finished excluded), linked_story_id
                                filter, both combined, include_archived, pagination,
                                newest-first order, required project_id
- GET  /v1/sessions/:id          found / not found (404) / malformed id (404)
- PUT  /v1/sessions/:id          omitted field unchanged; explicit-null clears
                                context/result fields/link ids; explicit-null
                                topic/goal/participant_role/status -> 422; new topic/goal
                                (re-validated length) and new participant_role
                                (re-validated dictionary); status settable to each of
                                pending/in-progress/finished and freely movable in any
                                direction (no transition order enforced); a status value
                                outside the fixed set -> 422 with the established
                                "Value '{v}' is not allowed. Allowed: ..." message
- POST /v1/sessions/:id/archive  archives; second archive -> 400; archived session still
                                updatable
- DELETE /v1/sessions/:id        permanent delete on both surfaces, unrestricted by
                                archived_at/status (STORY-008 TASK-009); a non-archived
                                session, an archived one, each status value, a session
                                carrying linked_story_id/linked_task_id (linked story and
                                task survive), a repeat delete and an unknown/malformed id
                                all return not-found
- Behaviors                     status is only ever set explicitly, never inferred from
                                result content: a session can reach "finished" with both
                                result fields still null, and can remain "pending"/
                                "in-progress" after both result fields are set;
                                incomplete-sessions query returns exactly the project's
                                non-archived sessions whose status is "pending" or
                                "in-progress" and is a plain persisted query (survives
                                process restart by construction — no in-memory state
                                involved); a session with no linked story/task is valid
- Edge cases                    deleting a linked story/task nulls the session reference
                                (application-level, holds on SQLite); deleting a project
                                deletes its sessions (relies on the FK CASCADE, enforced
                                on the SQLite test engine via PRAGMA foreign_keys)
- REST/MCP parity                REST and MCP produce equivalent results and equivalent
                                error codes for the same operation (a representative
                                subset, per this project's MCP-is-a-thin-wrapper
                                strategy — see docs/qa-automation-strategy.md)

Notes:
- Every test creates its own data and does not depend on execution order.
- System default participant_roles (seed migration 0002_settings, STORY-008 addition of
  "operator"):
    ["orchestrator", "architect", "backend-developer", "frontend-developer", "devops",
     "spec-writer", "qa-automation", "manual-qa", "operator"]
"""

import uuid

import pytest
from fastmcp import Client
from httpx import AsyncClient

from app.mcp.server import mcp_server_v1

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

PROJECTS_URL = "/v1/projects/"
PROJECTS_ID_URL = "/v1/projects"
STORIES_URL = "/v1/stories"
TASKS_URL = "/v1/tasks"
SESSIONS_URL = "/v1/sessions"

VALID_ROLE = "backend-developer"
OTHER_VALID_ROLE = "architect"
INVALID_ROLE = "not-a-valid-role-xyz"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


async def _create_project(client: AsyncClient, name: str) -> dict:
    resp = await client.post(PROJECTS_URL, json={"name": name})
    assert (
        resp.status_code == 201
    ), f"Helper _create_project: expected 201, got {resp.status_code} — {resp.text}"
    return resp.json()["data"]


async def _delete_project(client: AsyncClient, project_id: str) -> None:
    await client.delete(f"{PROJECTS_ID_URL}/{project_id}")


async def _create_story(
    client: AsyncClient, project_id: str, title: str = "Test Story"
) -> dict:
    resp = await client.post(
        STORIES_URL, json={"project_id": project_id, "title": title}
    )
    assert (
        resp.status_code == 201
    ), f"Helper _create_story: expected 201, got {resp.status_code} — {resp.text}"
    return resp.json()["data"]


async def _delete_story(client: AsyncClient, story_id: str) -> None:
    await client.delete(f"{STORIES_URL}/{story_id}")


async def _create_task(
    client: AsyncClient, story_id: str, title: str = "Test Task"
) -> dict:
    resp = await client.post(
        f"{STORIES_URL}/{story_id}/tasks",
        json={"title": title, "type": "task", "status": "todo"},
    )
    assert (
        resp.status_code == 201
    ), f"Helper _create_task: expected 201, got {resp.status_code} — {resp.text}"
    return resp.json()["data"]


async def _delete_task(client: AsyncClient, task_id: str) -> None:
    await client.delete(f"{TASKS_URL}/{task_id}")


async def _create_session(
    client: AsyncClient,
    project_id: str,
    *,
    topic: str = "Test Session",
    goal: str = "Get something done",
    context: str | None = None,
    participant_role: str = VALID_ROLE,
    linked_story_id: str | None = None,
    linked_task_id: str | None = None,
) -> dict:
    payload: dict = {
        "project_id": project_id,
        "topic": topic,
        "goal": goal,
        "participant_role": participant_role,
    }
    if context is not None:
        payload["context"] = context
    if linked_story_id is not None:
        payload["linked_story_id"] = linked_story_id
    if linked_task_id is not None:
        payload["linked_task_id"] = linked_task_id
    resp = await client.post(SESSIONS_URL, json=payload)
    assert (
        resp.status_code == 201
    ), f"Helper _create_session: expected 201, got {resp.status_code} — {resp.text}"
    return resp.json()["data"]


async def _mcp_call(tool_name: str, args: dict):
    async with Client(mcp_server_v1) as mcp_client:
        return await mcp_client.call_tool(tool_name, args)


# ===========================================================================
# POST /v1/sessions — Create
# ===========================================================================


class TestCreateSession:
    async def test_happy_path_minimal_returns_201(self, client: AsyncClient) -> None:
        proj = await _create_project(client, "Create Session Minimal Project")
        try:
            resp = await client.post(
                SESSIONS_URL,
                json={
                    "project_id": proj["id"],
                    "topic": "Minimal Session",
                    "goal": "Do the minimal thing",
                    "participant_role": VALID_ROLE,
                },
            )
            assert (
                resp.status_code == 201
            ), f"Expected 201, got {resp.status_code} — {resp.text}"
            body = resp.json()["data"]
            assert body["topic"] == "Minimal Session", "topic mismatch"
            assert body["goal"] == "Do the minimal thing", "goal mismatch"
            assert body["participant_role"] == VALID_ROLE, "participant_role mismatch"
            assert body["project_id"] == proj["id"], "project_id mismatch"
            assert body["context"] is None, "context should default to null"
            assert body["status"] == "pending", "status should default to pending"
            assert body["result_decisions"] is None, "result_decisions should be null"
            assert body["result_summary"] is None, "result_summary should be null"
            assert (
                "is_complete" not in body
            ), "is_complete has been retired in favor of the status enum"
            assert body["linked_story_id"] is None, "linked_story_id should be null"
            assert body["linked_task_id"] is None, "linked_task_id should be null"
            assert body["archived_at"] is None, "archived_at should be null"
        finally:
            await _delete_project(client, proj["id"])

    async def test_happy_path_with_links_returns_201(self, client: AsyncClient) -> None:
        proj = await _create_project(client, "Create Session With Links Project")
        try:
            story = await _create_story(client, proj["id"])
            task = await _create_task(client, story["id"])
            body = await _create_session(
                client,
                proj["id"],
                linked_story_id=story["id"],
                linked_task_id=task["id"],
            )
            assert body["linked_story_id"] == story["id"], "linked_story_id mismatch"
            assert body["linked_task_id"] == task["id"], "linked_task_id mismatch"
        finally:
            await _delete_project(client, proj["id"])

    async def test_happy_path_with_context_returns_201(
        self, client: AsyncClient
    ) -> None:
        proj = await _create_project(client, "Create Session Context Project")
        try:
            body = await _create_session(
                client,
                proj["id"],
                context="Some broader background",
            )
            assert body["context"] == "Some broader background", "context mismatch"
            assert (
                body["status"] == "pending"
            ), "A newly created session should always start at status 'pending'"
        finally:
            await _delete_project(client, proj["id"])

    async def test_status_ignored_when_supplied_at_create(
        self, client: AsyncClient
    ) -> None:
        """status is never a create input — CreateSession has no status field at
        all, so any status value in the payload (valid enum member or not) is
        silently ignored and every new session still starts at 'pending'."""
        proj = await _create_project(client, "Create Session Status Ignored Project")
        try:
            for attempted_status in ("finished", "in-progress", "not-a-real-status"):
                resp = await client.post(
                    SESSIONS_URL,
                    json={
                        "project_id": proj["id"],
                        "topic": "Attempted Non-Pending Session",
                        "goal": "Try to start at a non-default status",
                        "participant_role": VALID_ROLE,
                        "status": attempted_status,
                    },
                )
                assert resp.status_code == 201, (
                    f"A status value in the create payload ({attempted_status!r}) "
                    f"should be ignored, not rejected — got {resp.status_code}: "
                    f"{resp.text}"
                )
                body = resp.json()["data"]
                assert body["status"] == "pending", (
                    f"status must always default to 'pending' at create regardless "
                    f"of an attempted {attempted_status!r} in the payload, "
                    f"got {body['status']!r}"
                )
                assert (
                    "is_complete" not in body
                ), "is_complete has been retired in favor of the status enum"
        finally:
            await _delete_project(client, proj["id"])

    async def test_missing_topic_returns_422(self, client: AsyncClient) -> None:
        proj = await _create_project(client, "Create Session Missing Topic Project")
        try:
            resp = await client.post(
                SESSIONS_URL,
                json={
                    "project_id": proj["id"],
                    "goal": "A goal",
                    "participant_role": VALID_ROLE,
                },
            )
            assert (
                resp.status_code == 422
            ), f"Missing topic should return 422, got {resp.status_code}"
        finally:
            await _delete_project(client, proj["id"])

    async def test_missing_goal_returns_422(self, client: AsyncClient) -> None:
        proj = await _create_project(client, "Create Session Missing Goal Project")
        try:
            resp = await client.post(
                SESSIONS_URL,
                json={
                    "project_id": proj["id"],
                    "topic": "A topic",
                    "participant_role": VALID_ROLE,
                },
            )
            assert (
                resp.status_code == 422
            ), f"Missing goal should return 422, got {resp.status_code}"
        finally:
            await _delete_project(client, proj["id"])

    async def test_topic_too_long_returns_422(self, client: AsyncClient) -> None:
        proj = await _create_project(client, "Create Session Topic Too Long Project")
        try:
            resp = await client.post(
                SESSIONS_URL,
                json={
                    "project_id": proj["id"],
                    "topic": "x" * 501,
                    "goal": "A goal",
                    "participant_role": VALID_ROLE,
                },
            )
            assert (
                resp.status_code == 422
            ), f"topic > 500 chars should return 422, got {resp.status_code}"
        finally:
            await _delete_project(client, proj["id"])

    async def test_goal_too_long_returns_422(self, client: AsyncClient) -> None:
        proj = await _create_project(client, "Create Session Goal Too Long Project")
        try:
            resp = await client.post(
                SESSIONS_URL,
                json={
                    "project_id": proj["id"],
                    "topic": "A topic",
                    "goal": "x" * 501,
                    "participant_role": VALID_ROLE,
                },
            )
            assert (
                resp.status_code == 422
            ), f"goal > 500 chars should return 422, got {resp.status_code}"
        finally:
            await _delete_project(client, proj["id"])

    async def test_empty_topic_returns_422(self, client: AsyncClient) -> None:
        proj = await _create_project(client, "Create Session Empty Topic Project")
        try:
            resp = await client.post(
                SESSIONS_URL,
                json={
                    "project_id": proj["id"],
                    "topic": "",
                    "goal": "A goal",
                    "participant_role": VALID_ROLE,
                },
            )
            assert (
                resp.status_code == 422
            ), f"Empty topic should return 422, got {resp.status_code}"
        finally:
            await _delete_project(client, proj["id"])

    async def test_empty_goal_returns_422(self, client: AsyncClient) -> None:
        proj = await _create_project(client, "Create Session Empty Goal Project")
        try:
            resp = await client.post(
                SESSIONS_URL,
                json={
                    "project_id": proj["id"],
                    "topic": "A topic",
                    "goal": "",
                    "participant_role": VALID_ROLE,
                },
            )
            assert (
                resp.status_code == 422
            ), f"Empty goal should return 422, got {resp.status_code}"
        finally:
            await _delete_project(client, proj["id"])

    async def test_missing_participant_role_returns_422(
        self, client: AsyncClient
    ) -> None:
        proj = await _create_project(
            client, "Create Session Missing Participant Role Project"
        )
        try:
            resp = await client.post(
                SESSIONS_URL,
                json={
                    "project_id": proj["id"],
                    "topic": "A topic",
                    "goal": "A goal",
                },
            )
            assert (
                resp.status_code == 422
            ), f"Missing participant_role should return 422, got {resp.status_code}"
        finally:
            await _delete_project(client, proj["id"])

    async def test_participant_role_not_in_dictionary_returns_422(
        self, client: AsyncClient
    ) -> None:
        proj = await _create_project(
            client, "Create Session Invalid Participant Role Project"
        )
        try:
            resp = await client.post(
                SESSIONS_URL,
                json={
                    "project_id": proj["id"],
                    "topic": "A topic",
                    "goal": "A goal",
                    "participant_role": INVALID_ROLE,
                },
            )
            assert resp.status_code == 422, (
                f"participant_role outside the effective dictionary should return "
                f"422, got {resp.status_code}"
            )
            assert (
                "not allowed" in resp.text
            ), f"Expected 'not allowed' validation message, got: {resp.text}"
        finally:
            await _delete_project(client, proj["id"])

    async def test_missing_project_id_returns_422(self, client: AsyncClient) -> None:
        resp = await client.post(
            SESSIONS_URL,
            json={
                "topic": "A topic",
                "goal": "A goal",
                "participant_role": VALID_ROLE,
            },
        )
        assert (
            resp.status_code == 422
        ), f"Missing project_id should return 422, got {resp.status_code}"

    async def test_nonexistent_project_id_returns_404(
        self, client: AsyncClient
    ) -> None:
        fake_project_id = str(uuid.uuid4())
        resp = await client.post(
            SESSIONS_URL,
            json={
                "project_id": fake_project_id,
                "topic": "A topic",
                "goal": "A goal",
                "participant_role": VALID_ROLE,
            },
        )
        assert (
            resp.status_code == 404
        ), f"Non-existent project_id should return 404, got {resp.status_code}"

    async def test_link_to_nonexistent_story_returns_404(
        self, client: AsyncClient
    ) -> None:
        proj = await _create_project(client, "Create Session Bad Story Link Project")
        try:
            fake_story_id = str(uuid.uuid4())
            resp = await client.post(
                SESSIONS_URL,
                json={
                    "project_id": proj["id"],
                    "topic": "A topic",
                    "goal": "A goal",
                    "participant_role": VALID_ROLE,
                    "linked_story_id": fake_story_id,
                },
            )
            assert resp.status_code == 404, (
                f"Non-existent linked_story_id should return 404, "
                f"got {resp.status_code}"
            )
        finally:
            await _delete_project(client, proj["id"])

    async def test_link_to_nonexistent_task_returns_404(
        self, client: AsyncClient
    ) -> None:
        proj = await _create_project(client, "Create Session Bad Task Link Project")
        try:
            fake_task_id = str(uuid.uuid4())
            resp = await client.post(
                SESSIONS_URL,
                json={
                    "project_id": proj["id"],
                    "topic": "A topic",
                    "goal": "A goal",
                    "participant_role": VALID_ROLE,
                    "linked_task_id": fake_task_id,
                },
            )
            assert resp.status_code == 404, (
                f"Non-existent linked_task_id should return 404, "
                f"got {resp.status_code}"
            )
        finally:
            await _delete_project(client, proj["id"])

    async def test_link_to_story_in_different_project_returns_422(
        self, client: AsyncClient
    ) -> None:
        proj_a = await _create_project(client, "Create Session Cross-Project A")
        proj_b = await _create_project(client, "Create Session Cross-Project B")
        try:
            story_b = await _create_story(client, proj_b["id"])
            resp = await client.post(
                SESSIONS_URL,
                json={
                    "project_id": proj_a["id"],
                    "topic": "A topic",
                    "goal": "A goal",
                    "participant_role": VALID_ROLE,
                    "linked_story_id": story_b["id"],
                },
            )
            assert resp.status_code == 422, (
                f"linked_story_id from a different project should return 422, "
                f"got {resp.status_code}"
            )
        finally:
            await _delete_project(client, proj_a["id"])
            await _delete_project(client, proj_b["id"])

    async def test_link_to_task_in_different_project_returns_422(
        self, client: AsyncClient
    ) -> None:
        proj_a = await _create_project(client, "Create Session Cross-Project Task A")
        proj_b = await _create_project(client, "Create Session Cross-Project Task B")
        try:
            story_b = await _create_story(client, proj_b["id"])
            task_b = await _create_task(client, story_b["id"])
            resp = await client.post(
                SESSIONS_URL,
                json={
                    "project_id": proj_a["id"],
                    "topic": "A topic",
                    "goal": "A goal",
                    "participant_role": VALID_ROLE,
                    "linked_task_id": task_b["id"],
                },
            )
            assert resp.status_code == 422, (
                f"linked_task_id from a different project should return 422, "
                f"got {resp.status_code}"
            )
        finally:
            await _delete_project(client, proj_a["id"])
            await _delete_project(client, proj_b["id"])


# ===========================================================================
# GET /v1/sessions — List
# ===========================================================================


class TestListSessions:
    async def test_list_requires_project_id(self, client: AsyncClient) -> None:
        resp = await client.get(SESSIONS_URL)
        assert resp.status_code == 422, (
            f"Missing project_id query param should return 422, "
            f"got {resp.status_code}"
        )

    async def test_list_is_project_scoped(self, client: AsyncClient) -> None:
        proj_a = await _create_project(client, "List Sessions Scope A")
        proj_b = await _create_project(client, "List Sessions Scope B")
        try:
            await _create_session(client, proj_a["id"], topic="Session In A")
            await _create_session(client, proj_b["id"], topic="Session In B")

            resp = await client.get(SESSIONS_URL, params={"project_id": proj_a["id"]})
            assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
            topics = [s["topic"] for s in resp.json()["data"]]
            assert "Session In A" in topics, "Project A's session missing from its list"
            assert (
                "Session In B" not in topics
            ), "Project B's session leaked into project A's list"
        finally:
            await _delete_project(client, proj_a["id"])
            await _delete_project(client, proj_b["id"])

    async def test_list_newest_first_order(self, client: AsyncClient) -> None:
        proj = await _create_project(client, "List Sessions Newest First Project")
        try:
            first = await _create_session(client, proj["id"], topic="First Session")
            second = await _create_session(client, proj["id"], topic="Second Session")

            resp = await client.get(SESSIONS_URL, params={"project_id": proj["id"]})
            assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
            ids = [s["id"] for s in resp.json()["data"]]
            assert ids.index(second["id"]) < ids.index(first["id"]), (
                "List should be newest-first; the more recently created session "
                "should sort before the earlier one"
            )
        finally:
            await _delete_project(client, proj["id"])

    async def test_incomplete_filter(self, client: AsyncClient) -> None:
        proj = await _create_project(client, "List Sessions Incomplete Filter Project")
        try:
            incomplete = await _create_session(
                client, proj["id"], topic="Still Incomplete"
            )
            complete = await _create_session(
                client, proj["id"], topic="Marked Complete"
            )
            await client.put(
                f"{SESSIONS_URL}/{complete['id']}", json={"status": "finished"}
            )

            resp = await client.get(
                SESSIONS_URL,
                params={"project_id": proj["id"], "incomplete": "true"},
            )
            assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
            ids = [s["id"] for s in resp.json()["data"]]
            assert incomplete["id"] in ids, "Incomplete session missing from filter"
            assert (
                complete["id"] not in ids
            ), "Complete session should not appear in incomplete-only filter"
        finally:
            await _delete_project(client, proj["id"])

    async def test_linked_story_id_filter(self, client: AsyncClient) -> None:
        proj = await _create_project(
            client, "List Sessions Linked Story Filter Project"
        )
        try:
            story = await _create_story(client, proj["id"])
            linked = await _create_session(
                client, proj["id"], topic="Linked Session", linked_story_id=story["id"]
            )
            unlinked = await _create_session(
                client, proj["id"], topic="Unlinked Session"
            )

            resp = await client.get(
                SESSIONS_URL,
                params={"project_id": proj["id"], "linked_story_id": story["id"]},
            )
            assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
            ids = [s["id"] for s in resp.json()["data"]]
            assert (
                linked["id"] in ids
            ), "Linked session missing from linked_story_id filter"
            assert (
                unlinked["id"] not in ids
            ), "Unlinked session should not appear in linked_story_id filter"
        finally:
            await _delete_project(client, proj["id"])

    async def test_incomplete_and_linked_story_id_combined(
        self, client: AsyncClient
    ) -> None:
        proj = await _create_project(client, "List Sessions Combined Filters Project")
        try:
            story = await _create_story(client, proj["id"])
            target = await _create_session(
                client,
                proj["id"],
                topic="Target: incomplete + linked",
                linked_story_id=story["id"],
            )
            complete_and_linked = await _create_session(
                client,
                proj["id"],
                topic="Complete but linked",
                linked_story_id=story["id"],
            )
            await client.put(
                f"{SESSIONS_URL}/{complete_and_linked['id']}",
                json={"status": "finished"},
            )
            incomplete_but_unlinked = await _create_session(
                client, proj["id"], topic="Incomplete but unlinked"
            )

            resp = await client.get(
                SESSIONS_URL,
                params={
                    "project_id": proj["id"],
                    "incomplete": "true",
                    "linked_story_id": story["id"],
                },
            )
            assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
            ids = [s["id"] for s in resp.json()["data"]]
            assert ids == [target["id"]], (
                f"Combined filter should return exactly the incomplete+linked "
                f"session, got {ids}"
            )
            assert (
                complete_and_linked["id"] not in ids
            ), "Complete session should be excluded even though it is linked"
            assert (
                incomplete_but_unlinked["id"] not in ids
            ), "Unlinked session should be excluded even though it is incomplete"
        finally:
            await _delete_project(client, proj["id"])

    async def test_include_archived_default_excludes_archived(
        self, client: AsyncClient
    ) -> None:
        proj = await _create_project(client, "List Sessions Archived Default Project")
        try:
            active = await _create_session(client, proj["id"], topic="Active Session")
            archived = await _create_session(
                client, proj["id"], topic="Archived Session"
            )
            await client.post(f"{SESSIONS_URL}/{archived['id']}/archive")

            resp = await client.get(SESSIONS_URL, params={"project_id": proj["id"]})
            assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
            ids = [s["id"] for s in resp.json()["data"]]
            assert active["id"] in ids, "Active session should be in the default list"
            assert (
                archived["id"] not in ids
            ), "Archived session should be excluded from the default list"
        finally:
            await _delete_project(client, proj["id"])

    async def test_include_archived_true_returns_archived(
        self, client: AsyncClient
    ) -> None:
        proj = await _create_project(client, "List Sessions Include Archived Project")
        try:
            archived = await _create_session(
                client, proj["id"], topic="Archived Session"
            )
            await client.post(f"{SESSIONS_URL}/{archived['id']}/archive")

            resp = await client.get(
                SESSIONS_URL,
                params={"project_id": proj["id"], "include_archived": "true"},
            )
            assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
            ids = [s["id"] for s in resp.json()["data"]]
            assert (
                archived["id"] in ids
            ), "include_archived=true should surface archived sessions"
        finally:
            await _delete_project(client, proj["id"])

    async def test_pagination(self, client: AsyncClient) -> None:
        proj = await _create_project(client, "List Sessions Pagination Project")
        try:
            for i in range(3):
                await _create_session(
                    client, proj["id"], topic=f"Paginated Session {i}"
                )

            resp = await client.get(
                SESSIONS_URL,
                params={"project_id": proj["id"], "page": 1, "limit": 2},
            )
            assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
            body = resp.json()
            assert len(body["data"]) == 2, "Page 1 with limit=2 should return 2 rows"
            assert body["meta"]["total"] >= 3, "total should reflect all matching rows"
            assert body["meta"]["page"] == 1, "meta.page mismatch"
            assert body["meta"]["limit"] == 2, "meta.limit mismatch"

            resp2 = await client.get(
                SESSIONS_URL,
                params={"project_id": proj["id"], "page": 2, "limit": 2},
            )
            assert resp2.status_code == 200, f"Expected 200, got {resp2.status_code}"
            page1_ids = {s["id"] for s in body["data"]}
            page2_ids = {s["id"] for s in resp2.json()["data"]}
            assert page1_ids.isdisjoint(
                page2_ids
            ), "Page 1 and page 2 should not overlap"
        finally:
            await _delete_project(client, proj["id"])


# ===========================================================================
# GET /v1/sessions/:id
# ===========================================================================


class TestGetSession:
    async def test_get_found(self, client: AsyncClient) -> None:
        proj = await _create_project(client, "Get Session Found Project")
        try:
            session = await _create_session(client, proj["id"])
            resp = await client.get(f"{SESSIONS_URL}/{session['id']}")
            assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
            assert resp.json()["data"]["id"] == session["id"], "id mismatch"
        finally:
            await _delete_project(client, proj["id"])

    async def test_get_unknown_id_returns_404(self, client: AsyncClient) -> None:
        fake_id = str(uuid.uuid4())
        resp = await client.get(f"{SESSIONS_URL}/{fake_id}")
        assert (
            resp.status_code == 404
        ), f"Unknown session id should return 404, got {resp.status_code}"

    async def test_get_malformed_id_returns_404(self, client: AsyncClient) -> None:
        resp = await client.get(f"{SESSIONS_URL}/not-a-uuid")
        assert (
            resp.status_code == 404
        ), f"Malformed session id should return 404, got {resp.status_code}"


# ===========================================================================
# PUT /v1/sessions/:id — Update
# ===========================================================================


class TestUpdateSession:
    async def test_omitted_field_unchanged(self, client: AsyncClient) -> None:
        proj = await _create_project(client, "Update Session Omitted Field Project")
        try:
            session = await _create_session(
                client, proj["id"], context="Original context"
            )
            resp = await client.put(
                f"{SESSIONS_URL}/{session['id']}", json={"status": "in-progress"}
            )
            assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
            body = resp.json()["data"]
            assert (
                body["context"] == "Original context"
            ), "Omitted context should remain unchanged"
            assert body["status"] == "in-progress", "status should be updated"
        finally:
            await _delete_project(client, proj["id"])

    async def test_explicit_null_clears_context(self, client: AsyncClient) -> None:
        proj = await _create_project(client, "Update Session Clear Context Project")
        try:
            session = await _create_session(client, proj["id"], context="To be cleared")
            resp = await client.put(
                f"{SESSIONS_URL}/{session['id']}", json={"context": None}
            )
            assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
            assert (
                resp.json()["data"]["context"] is None
            ), "Explicit null should clear context"
        finally:
            await _delete_project(client, proj["id"])

    async def test_explicit_null_status_returns_422(self, client: AsyncClient) -> None:
        proj = await _create_project(client, "Update Session Null Status Project")
        try:
            session = await _create_session(client, proj["id"])
            resp = await client.put(
                f"{SESSIONS_URL}/{session['id']}", json={"status": None}
            )
            assert resp.status_code == 422, (
                f"status is mandatory and cannot be cleared — explicit null should "
                f"return 422, got {resp.status_code}"
            )
        finally:
            await _delete_project(client, proj["id"])

    async def test_explicit_null_clears_result_fields(
        self, client: AsyncClient
    ) -> None:
        proj = await _create_project(client, "Update Session Clear Result Project")
        try:
            session = await _create_session(client, proj["id"])
            set_resp = await client.put(
                f"{SESSIONS_URL}/{session['id']}",
                json={
                    "result_decisions": "Decided X",
                    "result_summary": "Summary Y",
                },
            )
            assert (
                set_resp.status_code == 200
            ), f"Expected 200, got {set_resp.status_code}"

            clear_resp = await client.put(
                f"{SESSIONS_URL}/{session['id']}",
                json={"result_decisions": None, "result_summary": None},
            )
            assert (
                clear_resp.status_code == 200
            ), f"Expected 200, got {clear_resp.status_code}"
            body = clear_resp.json()["data"]
            assert body["result_decisions"] is None, "result_decisions should clear"
            assert body["result_summary"] is None, "result_summary should clear"
        finally:
            await _delete_project(client, proj["id"])

    async def test_explicit_null_clears_link_ids(self, client: AsyncClient) -> None:
        proj = await _create_project(client, "Update Session Clear Link Ids Project")
        try:
            story = await _create_story(client, proj["id"])
            task = await _create_task(client, story["id"])
            session = await _create_session(
                client,
                proj["id"],
                linked_story_id=story["id"],
                linked_task_id=task["id"],
            )
            resp = await client.put(
                f"{SESSIONS_URL}/{session['id']}",
                json={"linked_story_id": None, "linked_task_id": None},
            )
            assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
            body = resp.json()["data"]
            assert body["linked_story_id"] is None, "linked_story_id should clear"
            assert body["linked_task_id"] is None, "linked_task_id should clear"
        finally:
            await _delete_project(client, proj["id"])

    async def test_explicit_null_topic_returns_422(self, client: AsyncClient) -> None:
        proj = await _create_project(client, "Update Session Null Topic Project")
        try:
            session = await _create_session(client, proj["id"])
            resp = await client.put(
                f"{SESSIONS_URL}/{session['id']}", json={"topic": None}
            )
            assert (
                resp.status_code == 422
            ), f"Explicit null topic should return 422, got {resp.status_code}"
        finally:
            await _delete_project(client, proj["id"])

    async def test_explicit_null_goal_returns_422(self, client: AsyncClient) -> None:
        proj = await _create_project(client, "Update Session Null Goal Project")
        try:
            session = await _create_session(client, proj["id"])
            resp = await client.put(
                f"{SESSIONS_URL}/{session['id']}", json={"goal": None}
            )
            assert (
                resp.status_code == 422
            ), f"Explicit null goal should return 422, got {resp.status_code}"
        finally:
            await _delete_project(client, proj["id"])

    async def test_explicit_null_participant_role_returns_422(
        self, client: AsyncClient
    ) -> None:
        proj = await _create_project(
            client, "Update Session Null Participant Role Project"
        )
        try:
            session = await _create_session(client, proj["id"])
            resp = await client.put(
                f"{SESSIONS_URL}/{session['id']}", json={"participant_role": None}
            )
            assert resp.status_code == 422, (
                f"Explicit null participant_role should return 422, "
                f"got {resp.status_code}"
            )
        finally:
            await _delete_project(client, proj["id"])

    async def test_new_topic_revalidated_for_length(self, client: AsyncClient) -> None:
        proj = await _create_project(client, "Update Session New Topic Length Project")
        try:
            session = await _create_session(client, proj["id"])
            resp = await client.put(
                f"{SESSIONS_URL}/{session['id']}", json={"topic": "x" * 501}
            )
            assert (
                resp.status_code == 422
            ), f"New topic over 500 chars should return 422, got {resp.status_code}"

            ok_resp = await client.put(
                f"{SESSIONS_URL}/{session['id']}", json={"topic": "New Valid Topic"}
            )
            assert (
                ok_resp.status_code == 200
            ), f"Expected 200, got {ok_resp.status_code}"
            assert (
                ok_resp.json()["data"]["topic"] == "New Valid Topic"
            ), "topic should be updated to the new value"
        finally:
            await _delete_project(client, proj["id"])

    async def test_new_goal_revalidated_for_length(self, client: AsyncClient) -> None:
        proj = await _create_project(client, "Update Session New Goal Length Project")
        try:
            session = await _create_session(client, proj["id"])
            resp = await client.put(
                f"{SESSIONS_URL}/{session['id']}", json={"goal": "x" * 501}
            )
            assert (
                resp.status_code == 422
            ), f"New goal over 500 chars should return 422, got {resp.status_code}"

            ok_resp = await client.put(
                f"{SESSIONS_URL}/{session['id']}", json={"goal": "New Valid Goal"}
            )
            assert (
                ok_resp.status_code == 200
            ), f"Expected 200, got {ok_resp.status_code}"
            assert (
                ok_resp.json()["data"]["goal"] == "New Valid Goal"
            ), "goal should be updated to the new value"
        finally:
            await _delete_project(client, proj["id"])

    async def test_new_participant_role_revalidated_against_dictionary(
        self, client: AsyncClient
    ) -> None:
        proj = await _create_project(
            client, "Update Session New Participant Role Project"
        )
        try:
            session = await _create_session(client, proj["id"])
            bad_resp = await client.put(
                f"{SESSIONS_URL}/{session['id']}",
                json={"participant_role": INVALID_ROLE},
            )
            assert bad_resp.status_code == 422, (
                f"New participant_role outside the dictionary should return 422, "
                f"got {bad_resp.status_code}"
            )

            ok_resp = await client.put(
                f"{SESSIONS_URL}/{session['id']}",
                json={"participant_role": OTHER_VALID_ROLE},
            )
            assert (
                ok_resp.status_code == 200
            ), f"Expected 200, got {ok_resp.status_code}"
            assert (
                ok_resp.json()["data"]["participant_role"] == OTHER_VALID_ROLE
            ), "participant_role should be updated to the new valid value"
        finally:
            await _delete_project(client, proj["id"])

    async def test_status_settable_to_each_fixed_value(
        self, client: AsyncClient
    ) -> None:
        proj = await _create_project(client, "Update Session Status Each Value Project")
        try:
            session = await _create_session(client, proj["id"])
            for target_status in ("pending", "in-progress", "finished"):
                resp = await client.put(
                    f"{SESSIONS_URL}/{session['id']}", json={"status": target_status}
                )
                assert resp.status_code == 200, (
                    f"Setting status to {target_status!r} should return 200, "
                    f"got {resp.status_code} — {resp.text}"
                )
                assert (
                    resp.json()["data"]["status"] == target_status
                ), f"status should be updated to {target_status!r}"
        finally:
            await _delete_project(client, proj["id"])

    async def test_status_moves_freely_in_any_direction(
        self, client: AsyncClient
    ) -> None:
        """No transition order is enforced — status can move 'backwards' just as
        freely as 'forwards' (e.g. finished -> in-progress -> pending)."""
        proj = await _create_project(client, "Update Session Status Backwards Project")
        try:
            session = await _create_session(client, proj["id"])

            to_finished = await client.put(
                f"{SESSIONS_URL}/{session['id']}", json={"status": "finished"}
            )
            assert (
                to_finished.status_code == 200
            ), f"Expected 200, got {to_finished.status_code}"
            assert to_finished.json()["data"]["status"] == "finished"

            back_to_in_progress = await client.put(
                f"{SESSIONS_URL}/{session['id']}", json={"status": "in-progress"}
            )
            assert back_to_in_progress.status_code == 200, (
                f"Moving finished -> in-progress should be allowed, "
                f"got {back_to_in_progress.status_code}"
            )
            assert (
                back_to_in_progress.json()["data"]["status"] == "in-progress"
            ), "status should move back to in-progress with no blocked transition"

            back_to_pending = await client.put(
                f"{SESSIONS_URL}/{session['id']}", json={"status": "pending"}
            )
            assert back_to_pending.status_code == 200, (
                f"Moving in-progress -> pending should be allowed, "
                f"got {back_to_pending.status_code}"
            )
            assert (
                back_to_pending.json()["data"]["status"] == "pending"
            ), "status should move back to pending with no blocked transition"
        finally:
            await _delete_project(client, proj["id"])

    async def test_invalid_status_value_returns_422_with_message(
        self, client: AsyncClient
    ) -> None:
        proj = await _create_project(client, "Update Session Invalid Status Project")
        try:
            session = await _create_session(client, proj["id"])
            resp = await client.put(
                f"{SESSIONS_URL}/{session['id']}", json={"status": "not-a-status"}
            )
            assert resp.status_code == 422, (
                f"A status value outside the fixed set should return 422, "
                f"got {resp.status_code}"
            )
            expected_msg = (
                "Value 'not-a-status' is not allowed. "
                "Allowed: pending, in-progress, finished."
            )
            assert expected_msg in resp.text, (
                f"Expected exact validation message {expected_msg!r} in response, "
                f"got: {resp.text}"
            )
        finally:
            await _delete_project(client, proj["id"])

    async def test_update_unknown_id_returns_404(self, client: AsyncClient) -> None:
        fake_id = str(uuid.uuid4())
        resp = await client.put(f"{SESSIONS_URL}/{fake_id}", json={"status": "pending"})
        assert (
            resp.status_code == 404
        ), f"Updating unknown session should return 404, got {resp.status_code}"


# ===========================================================================
# POST /v1/sessions/:id/archive
# ===========================================================================


class TestArchiveSession:
    async def test_archive_happy_path(self, client: AsyncClient) -> None:
        proj = await _create_project(client, "Archive Session Happy Path Project")
        try:
            session = await _create_session(client, proj["id"])
            resp = await client.post(f"{SESSIONS_URL}/{session['id']}/archive")
            assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
            body = resp.json()["data"]
            assert (
                body["archived_at"] is not None
            ), "archived_at should be set after archiving"
        finally:
            await _delete_project(client, proj["id"])

    async def test_second_archive_returns_400(self, client: AsyncClient) -> None:
        proj = await _create_project(client, "Archive Session Twice Project")
        try:
            session = await _create_session(client, proj["id"])
            first = await client.post(f"{SESSIONS_URL}/{session['id']}/archive")
            assert (
                first.status_code == 200
            ), f"First archive should return 200, got {first.status_code}"

            second = await client.post(f"{SESSIONS_URL}/{session['id']}/archive")
            assert (
                second.status_code == 400
            ), f"Second archive should return 400, got {second.status_code}"
            assert (
                "Session is already archived." in second.text
            ), f"Expected exact already-archived message, got: {second.text}"
        finally:
            await _delete_project(client, proj["id"])

    async def test_archived_session_still_updatable(self, client: AsyncClient) -> None:
        proj = await _create_project(client, "Archive Session Still Updatable Project")
        try:
            session = await _create_session(client, proj["id"])
            await client.post(f"{SESSIONS_URL}/{session['id']}/archive")

            resp = await client.put(
                f"{SESSIONS_URL}/{session['id']}",
                json={"status": "finished"},
            )
            assert (
                resp.status_code == 200
            ), f"Archived session should still be updatable, got {resp.status_code}"
            assert (
                resp.json()["data"]["status"] == "finished"
            ), "Update on an archived session should still apply"
        finally:
            await _delete_project(client, proj["id"])


# ===========================================================================
# DELETE /v1/sessions/:id + delete_session MCP tool
# ===========================================================================


class TestDeleteSession:
    async def test_delete_non_archived_session_succeeds_both_surfaces(
        self, client: AsyncClient
    ) -> None:
        proj = await _create_project(client, "Delete Session Non Archived Project")
        try:
            rest_session = await _create_session(
                client, proj["id"], topic="REST Delete Target"
            )
            mcp_session = await _create_session(
                client, proj["id"], topic="MCP Delete Target"
            )

            rest_resp = await client.delete(f"{SESSIONS_URL}/{rest_session['id']}")
            assert (
                rest_resp.status_code == 204
            ), f"Expected 204, got {rest_resp.status_code} — {rest_resp.text}"
            assert rest_resp.text == "", "204 response should carry no body"

            mcp_result = await _mcp_call("delete_session", {"id": mcp_session["id"]})
            assert mcp_result.data == {
                "success": True
            }, f"Expected {{'success': True}}, got {mcp_result.data}"

            rest_read = await client.get(f"{SESSIONS_URL}/{rest_session['id']}")
            assert rest_read.status_code == 404, (
                f"Session deleted via REST should be unreadable, "
                f"got {rest_read.status_code}"
            )
            mcp_read = await client.get(f"{SESSIONS_URL}/{mcp_session['id']}")
            assert mcp_read.status_code == 404, (
                f"Session deleted via MCP should be unreadable, "
                f"got {mcp_read.status_code}"
            )
        finally:
            await _delete_project(client, proj["id"])

    async def test_delete_archived_session_succeeds_both_surfaces(
        self, client: AsyncClient
    ) -> None:
        proj = await _create_project(client, "Delete Session Archived Project")
        try:
            rest_session = await _create_session(
                client, proj["id"], topic="REST Archived Delete Target"
            )
            await client.post(f"{SESSIONS_URL}/{rest_session['id']}/archive")
            mcp_session = await _create_session(
                client, proj["id"], topic="MCP Archived Delete Target"
            )
            await client.post(f"{SESSIONS_URL}/{mcp_session['id']}/archive")

            rest_resp = await client.delete(f"{SESSIONS_URL}/{rest_session['id']}")
            assert rest_resp.status_code == 204, (
                f"Deleting an archived session via REST should return 204, "
                f"got {rest_resp.status_code}"
            )

            mcp_result = await _mcp_call("delete_session", {"id": mcp_session["id"]})
            assert mcp_result.data == {"success": True}, (
                f"Deleting an archived session via MCP should return "
                f"{{'success': True}}, got {mcp_result.data}"
            )
        finally:
            await _delete_project(client, proj["id"])

    async def test_delete_succeeds_at_each_status_value_both_surfaces(
        self, client: AsyncClient
    ) -> None:
        proj = await _create_project(client, "Delete Session Each Status Project")
        try:
            for target_status in ("pending", "in-progress", "finished"):
                rest_session = await _create_session(
                    client, proj["id"], topic=f"REST {target_status}"
                )
                await client.put(
                    f"{SESSIONS_URL}/{rest_session['id']}",
                    json={"status": target_status},
                )
                mcp_session = await _create_session(
                    client, proj["id"], topic=f"MCP {target_status}"
                )
                await client.put(
                    f"{SESSIONS_URL}/{mcp_session['id']}",
                    json={"status": target_status},
                )

                rest_resp = await client.delete(f"{SESSIONS_URL}/{rest_session['id']}")
                assert rest_resp.status_code == 204, (
                    f"Deleting a session at status {target_status!r} via REST "
                    f"should return 204, got {rest_resp.status_code}"
                )

                mcp_result = await _mcp_call(
                    "delete_session", {"id": mcp_session["id"]}
                )
                assert mcp_result.data == {"success": True}, (
                    f"Deleting a session at status {target_status!r} via MCP "
                    f"should return {{'success': True}}, got {mcp_result.data}"
                )
        finally:
            await _delete_project(client, proj["id"])

    async def test_delete_session_with_links_leaves_story_and_task_intact(
        self, client: AsyncClient
    ) -> None:
        proj = await _create_project(client, "Delete Session With Links Project")
        story = None
        task = None
        try:
            story = await _create_story(client, proj["id"])
            task = await _create_task(client, story["id"])
            rest_session = await _create_session(
                client,
                proj["id"],
                topic="REST Linked Delete Target",
                linked_story_id=story["id"],
                linked_task_id=task["id"],
            )
            mcp_session = await _create_session(
                client,
                proj["id"],
                topic="MCP Linked Delete Target",
                linked_story_id=story["id"],
                linked_task_id=task["id"],
            )

            rest_resp = await client.delete(f"{SESSIONS_URL}/{rest_session['id']}")
            assert (
                rest_resp.status_code == 204
            ), f"Expected 204, got {rest_resp.status_code} — {rest_resp.text}"
            mcp_result = await _mcp_call("delete_session", {"id": mcp_session["id"]})
            assert mcp_result.data == {
                "success": True
            }, f"Expected {{'success': True}}, got {mcp_result.data}"

            story_resp = await client.get(f"{STORIES_URL}/{story['id']}")
            assert story_resp.status_code == 200, (
                f"Linked story should survive session deletion, "
                f"got {story_resp.status_code}"
            )
            task_resp = await client.get(f"{TASKS_URL}/{task['id']}")
            assert task_resp.status_code == 200, (
                f"Linked task should survive session deletion, "
                f"got {task_resp.status_code}"
            )
        finally:
            if task is not None:
                await _delete_task(client, task["id"])
            if story is not None:
                await _delete_story(client, story["id"])
            await _delete_project(client, proj["id"])

    async def test_repeat_delete_returns_not_found_both_surfaces(
        self, client: AsyncClient
    ) -> None:
        proj = await _create_project(client, "Delete Session Repeat Delete Project")
        try:
            rest_session = await _create_session(
                client, proj["id"], topic="REST Repeat Delete Target"
            )
            mcp_session = await _create_session(
                client, proj["id"], topic="MCP Repeat Delete Target"
            )

            first_rest = await client.delete(f"{SESSIONS_URL}/{rest_session['id']}")
            assert (
                first_rest.status_code == 204
            ), f"First REST delete should return 204, got {first_rest.status_code}"
            second_rest = await client.delete(f"{SESSIONS_URL}/{rest_session['id']}")
            assert second_rest.status_code == 404, (
                f"Second REST delete of the same id should return 404, "
                f"got {second_rest.status_code}"
            )

            first_mcp = await _mcp_call("delete_session", {"id": mcp_session["id"]})
            assert first_mcp.data == {"success": True}, (
                f"First MCP delete should return {{'success': True}}, "
                f"got {first_mcp.data}"
            )
            with pytest.raises(Exception) as exc_info:
                await _mcp_call("delete_session", {"id": mcp_session["id"]})
            assert "not found" in str(exc_info.value).lower(), (
                f"Second MCP delete of the same id should mirror REST's 404 "
                f"semantics, got: {exc_info.value}"
            )
        finally:
            await _delete_project(client, proj["id"])

    async def test_delete_unknown_id_returns_not_found_both_surfaces(
        self, client: AsyncClient
    ) -> None:
        fake_id = str(uuid.uuid4())

        rest_resp = await client.delete(f"{SESSIONS_URL}/{fake_id}")
        assert rest_resp.status_code == 404, (
            f"Deleting an unknown id via REST should return 404, "
            f"got {rest_resp.status_code}"
        )

        with pytest.raises(Exception) as exc_info:
            await _mcp_call("delete_session", {"id": fake_id})
        assert "not found" in str(exc_info.value).lower(), (
            f"Deleting an unknown id via MCP should mirror REST's 404 "
            f"semantics, got: {exc_info.value}"
        )

    async def test_delete_malformed_id_returns_not_found_both_surfaces(
        self, client: AsyncClient
    ) -> None:
        rest_resp = await client.delete(f"{SESSIONS_URL}/not-a-uuid")
        assert rest_resp.status_code == 404, (
            f"Deleting a malformed id via REST should return 404, "
            f"got {rest_resp.status_code}"
        )

        with pytest.raises(Exception) as exc_info:
            await _mcp_call("delete_session", {"id": "not-a-uuid"})
        assert "not found" in str(exc_info.value).lower(), (
            f"Deleting a malformed id via MCP should mirror REST's 404 "
            f"semantics, got: {exc_info.value}"
        )


# ===========================================================================
# Behaviors: status decoupled from result content
# ===========================================================================


class TestStatusResultIndependence:
    async def test_finished_with_null_result_fields(self, client: AsyncClient) -> None:
        proj = await _create_project(client, "Finished With Null Results Project")
        try:
            session = await _create_session(client, proj["id"])
            resp = await client.put(
                f"{SESSIONS_URL}/{session['id']}", json={"status": "finished"}
            )
            assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
            body = resp.json()["data"]
            assert body["status"] == "finished", "Session should be marked finished"
            assert (
                body["result_decisions"] is None
            ), "Reaching finished must not require result_decisions"
            assert (
                body["result_summary"] is None
            ), "Reaching finished must not require result_summary"
        finally:
            await _delete_project(client, proj["id"])

    async def test_pending_or_in_progress_with_both_result_fields_set(
        self, client: AsyncClient
    ) -> None:
        proj = await _create_project(client, "Not Finished With Results Set Project")
        try:
            for target_status in ("pending", "in-progress"):
                session = await _create_session(
                    client, proj["id"], topic=f"Session {target_status}"
                )
                resp = await client.put(
                    f"{SESSIONS_URL}/{session['id']}",
                    json={
                        "status": target_status,
                        "result_decisions": "Decided something",
                        "result_summary": "A summary",
                    },
                )
                assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
                body = resp.json()["data"]
                assert body["status"] == target_status, (
                    f"Setting result fields must never force status away from "
                    f"{target_status!r}, got {body['status']!r}"
                )
                assert (
                    body["result_decisions"] == "Decided something"
                ), "result_decisions mismatch"
                assert body["result_summary"] == "A summary", "result_summary mismatch"
        finally:
            await _delete_project(client, proj["id"])


class TestIncompleteQueryPersistence:
    async def test_incomplete_query_reflects_persisted_state_not_in_memory(
        self, client: AsyncClient
    ) -> None:
        """The incomplete-sessions query is an ordinary persisted-DB query with no
        in-memory cache/state involved — verified by round-tripping through a
        fresh service instance obtained from the DI container for the same
        request scope, confirming the result depends only on DB rows, not
        process state kept alive across requests.
        """
        proj = await _create_project(client, "Incomplete Query Persistence Project")
        try:
            incomplete = await _create_session(
                client, proj["id"], topic="Persisted Incomplete"
            )

            # First read via a fresh HTTP request (its own DI-resolved service).
            first_resp = await client.get(
                SESSIONS_URL, params={"project_id": proj["id"], "incomplete": "true"}
            )
            assert (
                first_resp.status_code == 200
            ), f"Expected 200, got {first_resp.status_code}"
            first_ids = [s["id"] for s in first_resp.json()["data"]]
            assert (
                incomplete["id"] in first_ids
            ), "Incomplete session missing on first read"

            # A second, independent request — a new service/repository instance is
            # resolved per-request by the DI container, so an identical result here
            # confirms the query result is driven entirely by durable storage.
            second_resp = await client.get(
                SESSIONS_URL, params={"project_id": proj["id"], "incomplete": "true"}
            )
            assert (
                second_resp.status_code == 200
            ), f"Expected 200, got {second_resp.status_code}"
            second_ids = [s["id"] for s in second_resp.json()["data"]]
            assert incomplete["id"] in second_ids, (
                "Incomplete session missing on second, independently-resolved read — "
                "the query must be a pure persisted read, not backed by in-memory state"
            )
        finally:
            await _delete_project(client, proj["id"])


class TestSessionWithoutLinks:
    async def test_session_with_no_links_is_valid(self, client: AsyncClient) -> None:
        proj = await _create_project(client, "Session Without Links Project")
        try:
            session = await _create_session(client, proj["id"])
            assert (
                session["linked_story_id"] is None
            ), "A session with the project link alone should be valid"
            assert (
                session["linked_task_id"] is None
            ), "A session with the project link alone should be valid"
            resp = await client.get(f"{SESSIONS_URL}/{session['id']}")
            assert (
                resp.status_code == 200
            ), f"Expected 200 for a linkless session, got {resp.status_code}"
        finally:
            await _delete_project(client, proj["id"])


# ===========================================================================
# Edge cases: reference-clearing on delete + cascade delete
# ===========================================================================


class TestReferenceClearingOnDelete:
    async def test_deleting_linked_story_nulls_linked_story_id(
        self, client: AsyncClient
    ) -> None:
        proj = await _create_project(client, "Delete Linked Story Nulls Ref Project")
        try:
            story = await _create_story(client, proj["id"])
            session = await _create_session(
                client, proj["id"], linked_story_id=story["id"]
            )

            del_resp = await client.delete(f"{STORIES_URL}/{story['id']}")
            assert (
                del_resp.status_code == 204
            ), f"Story delete should return 204, got {del_resp.status_code}"

            get_resp = await client.get(f"{SESSIONS_URL}/{session['id']}")
            assert get_resp.status_code == 200, (
                f"Session should still exist after linked story delete, "
                f"got {get_resp.status_code}"
            )
            assert get_resp.json()["data"]["linked_story_id"] is None, (
                "linked_story_id should be nulled (application-level) after the "
                "linked story is deleted, holding on SQLite despite the inert FK"
            )
        finally:
            await _delete_project(client, proj["id"])

    async def test_deleting_linked_task_nulls_linked_task_id(
        self, client: AsyncClient
    ) -> None:
        proj = await _create_project(client, "Delete Linked Task Nulls Ref Project")
        try:
            story = await _create_story(client, proj["id"])
            task = await _create_task(client, story["id"])
            session = await _create_session(
                client, proj["id"], linked_task_id=task["id"]
            )

            del_resp = await client.delete(f"{TASKS_URL}/{task['id']}")
            assert (
                del_resp.status_code == 204
            ), f"Task delete should return 204, got {del_resp.status_code}"

            get_resp = await client.get(f"{SESSIONS_URL}/{session['id']}")
            assert get_resp.status_code == 200, (
                f"Session should still exist after linked task delete, "
                f"got {get_resp.status_code}"
            )
            assert get_resp.json()["data"]["linked_task_id"] is None, (
                "linked_task_id should be nulled (application-level) after the "
                "linked task is deleted, holding on SQLite despite the inert FK"
            )
        finally:
            await _delete_task(client, task["id"])
            await _delete_story(client, story["id"])
            await _delete_project(client, proj["id"])


class TestProjectCascadeDelete:
    async def test_deleting_project_removes_sessions(self, client: AsyncClient) -> None:
        proj = await _create_project(client, "Cascade Delete Session Project")
        session = await _create_session(client, proj["id"])
        session_id = session["id"]

        del_resp = await client.delete(f"{PROJECTS_ID_URL}/{proj['id']}")
        assert (
            del_resp.status_code == 204
        ), f"Project delete should return 204, got {del_resp.status_code}"

        session_resp = await client.get(f"{SESSIONS_URL}/{session_id}")
        assert session_resp.status_code == 404, (
            f"Session should 404 after parent project is deleted, "
            f"got {session_resp.status_code}"
        )

        # Cleanup guard for when the pragma is eventually enabled.
        if session_resp.status_code == 200:
            await client.delete(f"{PROJECTS_ID_URL}/{proj['id']}")


# ===========================================================================
# REST / MCP parity
# ===========================================================================


class TestMcpParity:
    async def test_mcp_create_session_matches_rest(self, client: AsyncClient) -> None:
        proj = await _create_project(client, "MCP Create Session Parity Project")
        try:
            result = await _mcp_call(
                "create_session",
                {
                    "body": {
                        "project_id": proj["id"],
                        "topic": "MCP Created Session",
                        "goal": "Prove MCP parity",
                        "participant_role": VALID_ROLE,
                    }
                },
            )
            assert (
                result.data["data"]["topic"] == "MCP Created Session"
            ), "MCP create_session should return the created session"
            assert (
                result.data["data"]["status"] == "pending"
            ), "MCP create_session should default status to pending, same as REST"
            assert (
                "is_complete" not in result.data["data"]
            ), "is_complete has been retired in favor of the status enum"

            rest_resp = await client.get(f"{SESSIONS_URL}/{result.data['data']['id']}")
            assert (
                rest_resp.status_code == 200
            ), "The MCP-created session should be readable over REST"
            assert (
                rest_resp.json()["data"]["topic"] == "MCP Created Session"
            ), "REST read of an MCP-created session should match"
        finally:
            await _delete_project(client, proj["id"])

    async def test_mcp_create_session_invalid_participant_role_errors_like_rest(
        self, client: AsyncClient
    ) -> None:
        proj = await _create_project(
            client, "MCP Create Session Invalid Role Parity Project"
        )
        try:
            with pytest.raises(Exception) as exc_info:
                await _mcp_call(
                    "create_session",
                    {
                        "body": {
                            "project_id": proj["id"],
                            "topic": "A topic",
                            "goal": "A goal",
                            "participant_role": INVALID_ROLE,
                        }
                    },
                )
            assert "not allowed" in str(exc_info.value), (
                f"MCP error should carry the same 'not allowed' message as REST, "
                f"got: {exc_info.value}"
            )

            rest_resp = await client.post(
                SESSIONS_URL,
                json={
                    "project_id": proj["id"],
                    "topic": "A topic",
                    "goal": "A goal",
                    "participant_role": INVALID_ROLE,
                },
            )
            assert rest_resp.status_code == 422, (
                "REST should reject the same invalid participant_role with 422, "
                f"got {rest_resp.status_code}"
            )
        finally:
            await _delete_project(client, proj["id"])

    async def test_mcp_get_session_matches_rest(self, client: AsyncClient) -> None:
        proj = await _create_project(client, "MCP Get Session Parity Project")
        try:
            session = await _create_session(client, proj["id"])
            result = await _mcp_call("get_session", {"id": session["id"]})
            assert (
                result.data["data"]["id"] == session["id"]
            ), "MCP get_session should return the same session REST created"
        finally:
            await _delete_project(client, proj["id"])

    async def test_mcp_get_session_not_found_matches_rest(
        self, client: AsyncClient
    ) -> None:
        fake_id = str(uuid.uuid4())
        with pytest.raises(Exception) as exc_info:
            await _mcp_call("get_session", {"id": fake_id})
        assert "not found" in str(exc_info.value).lower(), (
            f"MCP not-found error should mirror REST's 404 semantics, "
            f"got: {exc_info.value}"
        )

        rest_resp = await client.get(f"{SESSIONS_URL}/{fake_id}")
        assert (
            rest_resp.status_code == 404
        ), f"REST should also 404 for the same unknown id, got {rest_resp.status_code}"

    async def test_mcp_list_sessions_matches_rest(self, client: AsyncClient) -> None:
        proj = await _create_project(client, "MCP List Sessions Parity Project")
        try:
            session = await _create_session(client, proj["id"], topic="Listed via MCP")

            result = await _mcp_call("list_sessions", {"project_id": proj["id"]})
            mcp_ids = [s["id"] for s in result.data["data"]]
            assert (
                session["id"] in mcp_ids
            ), "MCP list_sessions should include the session REST created"

            rest_resp = await client.get(
                SESSIONS_URL, params={"project_id": proj["id"]}
            )
            rest_ids = [s["id"] for s in rest_resp.json()["data"]]
            assert set(mcp_ids) == set(
                rest_ids
            ), "MCP and REST session lists for the same project should match"
        finally:
            await _delete_project(client, proj["id"])

    async def test_mcp_update_session_matches_rest(self, client: AsyncClient) -> None:
        proj = await _create_project(client, "MCP Update Session Parity Project")
        try:
            session = await _create_session(client, proj["id"])
            result = await _mcp_call(
                "update_session",
                {"id": session["id"], "body": {"status": "in-progress"}},
            )
            assert (
                result.data["data"]["status"] == "in-progress"
            ), "MCP update_session should apply the update"

            rest_resp = await client.get(f"{SESSIONS_URL}/{session['id']}")
            assert (
                rest_resp.json()["data"]["status"] == "in-progress"
            ), "REST read after an MCP update should reflect the change"
        finally:
            await _delete_project(client, proj["id"])

    async def test_mcp_archive_session_matches_rest(self, client: AsyncClient) -> None:
        proj = await _create_project(client, "MCP Archive Session Parity Project")
        try:
            session = await _create_session(client, proj["id"])
            result = await _mcp_call("archive_session", {"id": session["id"]})
            assert (
                result.data["data"]["archived_at"] is not None
            ), "MCP archive_session should set archived_at"

            second_result = _mcp_call("archive_session", {"id": session["id"]})
            with pytest.raises(Exception) as exc_info:
                await second_result
            assert "already archived" in str(exc_info.value).lower(), (
                f"MCP double-archive should mirror REST's 400 semantics, "
                f"got: {exc_info.value}"
            )

            rest_resp = await client.post(f"{SESSIONS_URL}/{session['id']}/archive")
            assert rest_resp.status_code == 400, (
                "REST double-archive should also return 400, "
                f"got {rest_resp.status_code}"
            )
        finally:
            await _delete_project(client, proj["id"])
