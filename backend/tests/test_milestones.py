"""Integration tests for the Milestones domain — STORY-012.

Coverage zones (per TASK-008):
- POST /v1/milestones          create happy path (status defaults to 'planned'),
                                missing/unknown project_id (404), duplicate name same project (409),
                                same name in a different project is allowed (201),
                                empty name (422)
- GET  /v1/milestones          list all, filtered by project_id; each item includes
                                project_id, status, story_count
- GET  /v1/milestones/:id      found (includes story_count), not found (404),
                                malformed id (404 per ADR-011)
- PUT  /v1/milestones/:id      update name/description; name conflict 409;
                                project_id cannot be changed (ignored by design)
- DELETE /v1/milestones/:id    204; assigned stories have milestone_id cleared, not deleted
- POST /v1/milestones/:id/activate  sets 'active'; idempotent when already active;
                                     valid from 'finished'; demotes previous active to 'planned'
- POST /v1/milestones/:id/finish    sets 'finished'; idempotent when already finished
- GET  /v1/milestones/:id/stories   paginated assigned stories; 404 for unknown milestone
- GET  /v1/stories?milestone_id=…   filters to a milestone's stories;
                                     unknown milestone_id yields empty page (not error)
- PUT  /v1/stories/:id (milestone_id) assign valid milestone; clear to null;
                                       reject cross-project milestone (422);
                                       reject non-existent milestone (404)

Invariants:
- Single-active: activating milestone A when B is active demotes B to 'planned';
  the project never has two 'active' milestones.
- Cross-project isolation: activating in project A does not affect project B's active milestone.
- Delete-clears-assignment: deleting a milestone nulls milestone_id on its stories.
- delete-project: deleting a project cascades to delete its milestones.

Notes:
- Wire status values are lowercase: 'planned', 'active', 'finished'.
- story_count is included on both list and detail responses.
- Every test creates its own data; no test depends on execution order.
"""

import pytest
from httpx import AsyncClient
from sqlalchemy import text
from sqlalchemy.orm import Session

# ---------------------------------------------------------------------------
# URL constants
# ---------------------------------------------------------------------------

PROJECTS_URL = "/v1/projects/"
MILESTONES_URL = "/v1/milestones"
STORIES_URL = "/v1/stories"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


async def _create_project(client: AsyncClient, name: str) -> dict:
    """POST /v1/projects and return the 'data' dict."""
    resp = await client.post(PROJECTS_URL, json={"name": name})
    assert (
        resp.status_code == 201
    ), f"Helper _create_project: expected 201, got {resp.status_code} — {resp.text}"
    return resp.json()["data"]


async def _delete_project(client: AsyncClient, project_id: str) -> None:
    """DELETE /v1/projects/:id — cleanup helper."""
    await client.delete(f"/v1/projects/{project_id}")


async def _create_milestone(
    client: AsyncClient, project_id: str, name: str, description: str | None = None
) -> dict:
    """POST /v1/milestones and return the 'data' dict."""
    payload: dict = {"name": name, "project_id": project_id}
    if description is not None:
        payload["description"] = description
    resp = await client.post(MILESTONES_URL, json=payload)
    assert (
        resp.status_code == 201
    ), f"Helper _create_milestone: expected 201, got {resp.status_code} — {resp.text}"
    return resp.json()["data"]


async def _create_story(
    client: AsyncClient,
    project_id: str,
    title: str,
    milestone_id: str | None = None,
) -> dict:
    """POST /v1/stories and return the 'data' dict."""
    payload: dict = {"project_id": project_id, "title": title}
    if milestone_id is not None:
        payload["milestone_id"] = milestone_id
    resp = await client.post(STORIES_URL, json=payload)
    assert (
        resp.status_code == 201
    ), f"Helper _create_story: expected 201, got {resp.status_code} — {resp.text}"
    return resp.json()["data"]


# ===========================================================================
# POST /v1/milestones — create
# ===========================================================================


@pytest.mark.asyncio
async def test_create_milestone_happy_path(client: AsyncClient) -> None:
    project = await _create_project(client, "M-Create-Project-1")
    try:
        resp = await client.post(
            MILESTONES_URL,
            json={
                "name": "Sprint 1",
                "project_id": project["id"],
                "description": "First sprint",
            },
        )
        assert resp.status_code == 201, f"Expected 201, got {resp.status_code}"
        body = resp.json()
        assert "data" in body, "Response missing 'data'"
        data = body["data"]
        assert data["name"] == "Sprint 1", "name mismatch"
        assert data["project_id"] == project["id"], "project_id mismatch"
        assert data["description"] == "First sprint", "description mismatch"
        assert data["status"] == "planned", "status should default to 'planned'"
        assert "id" in data, "id missing"
        assert "created_at" in data, "created_at missing"
        assert "updated_at" in data, "updated_at missing"
    finally:
        await _delete_project(client, project["id"])


@pytest.mark.asyncio
async def test_create_milestone_without_description(client: AsyncClient) -> None:
    project = await _create_project(client, "M-Create-Project-2")
    try:
        resp = await client.post(
            MILESTONES_URL,
            json={"name": "Milestone No Desc", "project_id": project["id"]},
        )
        assert resp.status_code == 201, f"Expected 201, got {resp.status_code}"
        assert resp.json()["data"]["description"] is None, "description should be null"
    finally:
        await _delete_project(client, project["id"])


@pytest.mark.asyncio
async def test_create_milestone_unknown_project_returns_404(
    client: AsyncClient,
) -> None:
    import uuid

    unknown_id = str(uuid.uuid4())
    resp = await client.post(
        MILESTONES_URL,
        json={"name": "Orphan", "project_id": unknown_id},
    )
    assert resp.status_code == 404, f"Expected 404, got {resp.status_code}"
    assert resp.json()["code"] == "NOT_FOUND", "code should be NOT_FOUND"


@pytest.mark.asyncio
async def test_create_milestone_duplicate_name_in_same_project_conflicts(
    client: AsyncClient,
) -> None:
    project = await _create_project(client, "M-Create-Project-3")
    try:
        await _create_milestone(client, project["id"], "Unique Sprint")
        resp = await client.post(
            MILESTONES_URL,
            json={"name": "Unique Sprint", "project_id": project["id"]},
        )
        assert resp.status_code == 409, f"Expected 409, got {resp.status_code}"
        assert resp.json()["code"] == "CONFLICT", "code should be CONFLICT"
    finally:
        await _delete_project(client, project["id"])


@pytest.mark.asyncio
async def test_create_milestone_same_name_allowed_in_different_project(
    client: AsyncClient,
) -> None:
    project_a = await _create_project(client, "M-Create-ProjectA")
    project_b = await _create_project(client, "M-Create-ProjectB")
    try:
        await _create_milestone(client, project_a["id"], "Common Name")
        resp = await client.post(
            MILESTONES_URL,
            json={"name": "Common Name", "project_id": project_b["id"]},
        )
        assert (
            resp.status_code == 201
        ), f"Same name in different project should be allowed: {resp.status_code}"
    finally:
        await _delete_project(client, project_a["id"])
        await _delete_project(client, project_b["id"])


@pytest.mark.asyncio
async def test_create_milestone_empty_name_returns_422(client: AsyncClient) -> None:
    project = await _create_project(client, "M-Create-Project-Empty")
    try:
        resp = await client.post(
            MILESTONES_URL,
            json={"name": "", "project_id": project["id"]},
        )
        assert resp.status_code == 422, f"Expected 422, got {resp.status_code}"
    finally:
        await _delete_project(client, project["id"])


# ===========================================================================
# GET /v1/milestones — list
# ===========================================================================


@pytest.mark.asyncio
async def test_list_milestones_returns_all(client: AsyncClient) -> None:
    project = await _create_project(client, "M-List-Project-1")
    try:
        await _create_milestone(client, project["id"], "Alpha")
        await _create_milestone(client, project["id"], "Beta")

        resp = await client.get(MILESTONES_URL)
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
        body = resp.json()
        assert "data" in body, "Response missing 'data'"
        assert "meta" in body, "Response missing 'meta'"
        assert isinstance(body["data"], list), "data should be a list"
        assert body["meta"]["total"] >= 2, "total should be >= 2"
    finally:
        await _delete_project(client, project["id"])


@pytest.mark.asyncio
async def test_list_milestones_filtered_by_project_id(client: AsyncClient) -> None:
    project_a = await _create_project(client, "M-List-ProjectA")
    project_b = await _create_project(client, "M-List-ProjectB")
    try:
        await _create_milestone(client, project_a["id"], "A Sprint 1")
        await _create_milestone(client, project_a["id"], "A Sprint 2")
        await _create_milestone(client, project_b["id"], "B Sprint 1")

        resp = await client.get(MILESTONES_URL, params={"project_id": project_a["id"]})
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
        data = resp.json()["data"]
        assert len(data) == 2, f"Expected 2 milestones for project A, got {len(data)}"
        project_ids = {m["project_id"] for m in data}
        assert project_ids == {
            project_a["id"]
        }, "All milestones should belong to project A"
    finally:
        await _delete_project(client, project_a["id"])
        await _delete_project(client, project_b["id"])


@pytest.mark.asyncio
async def test_list_milestones_items_include_story_count(client: AsyncClient) -> None:
    project = await _create_project(client, "M-List-StoryCount")
    try:
        milestone = await _create_milestone(client, project["id"], "Count Test")
        await _create_story(client, project["id"], "Story 1", milestone["id"])
        await _create_story(client, project["id"], "Story 2", milestone["id"])

        resp = await client.get(MILESTONES_URL, params={"project_id": project["id"]})
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
        items = resp.json()["data"]
        matching = [m for m in items if m["id"] == milestone["id"]]
        assert len(matching) == 1, "Milestone should appear in list"
        assert (
            matching[0]["story_count"] == 2
        ), f"story_count should be 2, got {matching[0]['story_count']}"
    finally:
        await _delete_project(client, project["id"])


@pytest.mark.asyncio
async def test_list_milestones_items_include_status(client: AsyncClient) -> None:
    project = await _create_project(client, "M-List-Status")
    try:
        await _create_milestone(client, project["id"], "Status Sprint")

        resp = await client.get(MILESTONES_URL, params={"project_id": project["id"]})
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
        items = resp.json()["data"]
        assert len(items) >= 1, "Expected at least one item"
        for m in items:
            assert "status" in m, "Each item must include 'status'"
            assert "project_id" in m, "Each item must include 'project_id'"
    finally:
        await _delete_project(client, project["id"])


# ===========================================================================
# GET /v1/milestones/:id — detail
# ===========================================================================


@pytest.mark.asyncio
async def test_get_milestone_by_id(client: AsyncClient) -> None:
    project = await _create_project(client, "M-Get-Project-1")
    try:
        milestone = await _create_milestone(
            client, project["id"], "Detail Sprint", "Some desc"
        )
        resp = await client.get(f"{MILESTONES_URL}/{milestone['id']}")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
        data = resp.json()["data"]
        assert data["id"] == milestone["id"], "id mismatch"
        assert data["name"] == "Detail Sprint", "name mismatch"
        assert data["description"] == "Some desc", "description mismatch"
        assert data["status"] == "planned", "status should be 'planned'"
        assert "story_count" in data, "detail should include story_count"
    finally:
        await _delete_project(client, project["id"])


@pytest.mark.asyncio
async def test_get_milestone_story_count_reflects_assignments(
    client: AsyncClient,
) -> None:
    project = await _create_project(client, "M-Get-SCount")
    try:
        milestone = await _create_milestone(client, project["id"], "Count Me")
        # No stories yet — count should be 0.
        resp = await client.get(f"{MILESTONES_URL}/{milestone['id']}")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
        assert (
            resp.json()["data"]["story_count"] == 0
        ), "story_count should be 0 before any assignment"

        await _create_story(client, project["id"], "S1", milestone["id"])
        resp2 = await client.get(f"{MILESTONES_URL}/{milestone['id']}")
        assert (
            resp2.json()["data"]["story_count"] == 1
        ), "story_count should be 1 after one assignment"
    finally:
        await _delete_project(client, project["id"])


@pytest.mark.asyncio
async def test_get_milestone_not_found_returns_404(client: AsyncClient) -> None:
    import uuid

    resp = await client.get(f"{MILESTONES_URL}/{uuid.uuid4()}")
    assert resp.status_code == 404, f"Expected 404, got {resp.status_code}"
    assert resp.json()["code"] == "NOT_FOUND", "code should be NOT_FOUND"


@pytest.mark.asyncio
async def test_get_milestone_malformed_id_returns_404(client: AsyncClient) -> None:
    # Per ADR-011: malformed (non-UUID) ids return 404, not 422.
    resp = await client.get(f"{MILESTONES_URL}/not-a-uuid")
    assert (
        resp.status_code == 404
    ), f"Malformed id should return 404 (ADR-011), got {resp.status_code}"


# ===========================================================================
# PUT /v1/milestones/:id — update
# ===========================================================================


@pytest.mark.asyncio
async def test_update_milestone_name(client: AsyncClient) -> None:
    project = await _create_project(client, "M-Update-Project-1")
    try:
        milestone = await _create_milestone(client, project["id"], "Old Name")
        resp = await client.put(
            f"{MILESTONES_URL}/{milestone['id']}",
            json={"name": "New Name"},
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
        data = resp.json()["data"]
        assert data["name"] == "New Name", "name should be updated"
        assert data["project_id"] == project["id"], "project_id must remain unchanged"
    finally:
        await _delete_project(client, project["id"])


@pytest.mark.asyncio
async def test_update_milestone_description(client: AsyncClient) -> None:
    project = await _create_project(client, "M-Update-Project-2")
    try:
        milestone = await _create_milestone(
            client, project["id"], "Sprint X", "Old desc"
        )
        resp = await client.put(
            f"{MILESTONES_URL}/{milestone['id']}",
            json={"description": "New desc"},
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
        assert (
            resp.json()["data"]["description"] == "New desc"
        ), "description should be updated"
        assert (
            resp.json()["data"]["name"] == "Sprint X"
        ), "name should remain unchanged when not provided"
    finally:
        await _delete_project(client, project["id"])


@pytest.mark.asyncio
async def test_update_milestone_name_conflict_returns_409(client: AsyncClient) -> None:
    project = await _create_project(client, "M-Update-Conflict")
    try:
        await _create_milestone(client, project["id"], "Taken Name")
        m2 = await _create_milestone(client, project["id"], "Other Name")
        resp = await client.put(
            f"{MILESTONES_URL}/{m2['id']}",
            json={"name": "Taken Name"},
        )
        assert resp.status_code == 409, f"Expected 409, got {resp.status_code}"
        assert resp.json()["code"] == "CONFLICT", "code should be CONFLICT"
    finally:
        await _delete_project(client, project["id"])


@pytest.mark.asyncio
async def test_update_milestone_not_found_returns_404(client: AsyncClient) -> None:
    import uuid

    resp = await client.put(
        f"{MILESTONES_URL}/{uuid.uuid4()}",
        json={"name": "Ghost"},
    )
    assert resp.status_code == 404, f"Expected 404, got {resp.status_code}"


# ===========================================================================
# DELETE /v1/milestones/:id
# ===========================================================================


@pytest.mark.asyncio
async def test_delete_milestone_returns_204(client: AsyncClient) -> None:
    project = await _create_project(client, "M-Delete-Project-1")
    try:
        milestone = await _create_milestone(client, project["id"], "To Delete")
        resp = await client.delete(f"{MILESTONES_URL}/{milestone['id']}")
        assert resp.status_code == 204, f"Expected 204, got {resp.status_code}"

        # Verify gone.
        get_resp = await client.get(f"{MILESTONES_URL}/{milestone['id']}")
        assert get_resp.status_code == 404, "Deleted milestone should return 404 on GET"
    finally:
        await _delete_project(client, project["id"])


@pytest.mark.asyncio
async def test_delete_milestone_clears_story_milestone_id(
    client: AsyncClient,
) -> None:
    """Deleting a milestone sets milestone_id = null on its stories without deleting them."""
    project = await _create_project(client, "M-Delete-ClearsStory")
    try:
        milestone = await _create_milestone(client, project["id"], "Sprint Clear")
        story = await _create_story(
            client, project["id"], "Assigned Story", milestone["id"]
        )
        assert (
            story["milestone_id"] == milestone["id"]
        ), "Precondition: story should be assigned to milestone"

        # Delete the milestone.
        del_resp = await client.delete(f"{MILESTONES_URL}/{milestone['id']}")
        assert del_resp.status_code == 204, f"Expected 204, got {del_resp.status_code}"

        # Story must still exist with milestone_id cleared.
        story_resp = await client.get(f"{STORIES_URL}/{story['id']}")
        assert (
            story_resp.status_code == 200
        ), f"Story should still exist after milestone deletion, got {story_resp.status_code}"
        story_data = story_resp.json()["data"]
        assert (
            story_data["milestone_id"] is None
        ), "milestone_id should be null after milestone deletion"
        assert story_data["title"] == "Assigned Story", "Story content must not change"
    finally:
        await _delete_project(client, project["id"])


@pytest.mark.asyncio
async def test_delete_milestone_not_found_returns_404(client: AsyncClient) -> None:
    import uuid

    resp = await client.delete(f"{MILESTONES_URL}/{uuid.uuid4()}")
    assert resp.status_code == 404, f"Expected 404, got {resp.status_code}"


# ===========================================================================
# POST /v1/milestones/:id/activate
# ===========================================================================


@pytest.mark.asyncio
async def test_activate_milestone_sets_status_active(client: AsyncClient) -> None:
    project = await _create_project(client, "M-Activate-Project-1")
    try:
        milestone = await _create_milestone(client, project["id"], "Activate Me")
        assert (
            milestone["status"] == "planned"
        ), "Precondition: status should be planned"

        resp = await client.post(f"{MILESTONES_URL}/{milestone['id']}/activate")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
        data = resp.json()["data"]
        assert data["status"] == "active", "status should be 'active' after activation"
        assert data["id"] == milestone["id"], "id mismatch"
    finally:
        await _delete_project(client, project["id"])


@pytest.mark.asyncio
async def test_activate_milestone_idempotent_when_already_active(
    client: AsyncClient,
) -> None:
    project = await _create_project(client, "M-Activate-Idempotent")
    try:
        milestone = await _create_milestone(client, project["id"], "Idempotent")
        await client.post(f"{MILESTONES_URL}/{milestone['id']}/activate")

        # Activate again — should succeed with no error.
        resp = await client.post(f"{MILESTONES_URL}/{milestone['id']}/activate")
        assert (
            resp.status_code == 200
        ), f"Activating already-active milestone should be 200, got {resp.status_code}"
        assert (
            resp.json()["data"]["status"] == "active"
        ), "status should still be 'active'"
    finally:
        await _delete_project(client, project["id"])


@pytest.mark.asyncio
async def test_activate_milestone_valid_from_finished(client: AsyncClient) -> None:
    project = await _create_project(client, "M-Activate-FromFinished")
    try:
        milestone = await _create_milestone(
            client, project["id"], "Finished Re-activate"
        )
        await client.post(f"{MILESTONES_URL}/{milestone['id']}/activate")
        await client.post(f"{MILESTONES_URL}/{milestone['id']}/finish")

        # Re-activate from 'finished'.
        resp = await client.post(f"{MILESTONES_URL}/{milestone['id']}/activate")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
        assert (
            resp.json()["data"]["status"] == "active"
        ), "status should be 'active' after re-activation from 'finished'"
    finally:
        await _delete_project(client, project["id"])


@pytest.mark.asyncio
async def test_activate_milestone_not_found_returns_404(client: AsyncClient) -> None:
    import uuid

    resp = await client.post(f"{MILESTONES_URL}/{uuid.uuid4()}/activate")
    assert resp.status_code == 404, f"Expected 404, got {resp.status_code}"


# ===========================================================================
# Single-active invariant
# ===========================================================================


@pytest.mark.asyncio
async def test_single_active_invariant_demotes_previous(client: AsyncClient) -> None:
    """Activating B when A is active sets A back to 'planned'."""
    project = await _create_project(client, "M-SingleActive-Project")
    try:
        m_a = await _create_milestone(client, project["id"], "Milestone A")
        m_b = await _create_milestone(client, project["id"], "Milestone B")

        # Activate A.
        activate_a = await client.post(f"{MILESTONES_URL}/{m_a['id']}/activate")
        assert (
            activate_a.json()["data"]["status"] == "active"
        ), "Milestone A should be active"

        # Activate B — this should demote A.
        activate_b = await client.post(f"{MILESTONES_URL}/{m_b['id']}/activate")
        assert (
            activate_b.status_code == 200
        ), f"Expected 200, got {activate_b.status_code}"
        assert (
            activate_b.json()["data"]["status"] == "active"
        ), "Milestone B should now be active"

        # Verify A was demoted to 'planned'.
        get_a = await client.get(f"{MILESTONES_URL}/{m_a['id']}")
        assert (
            get_a.json()["data"]["status"] == "planned"
        ), "Milestone A should have been demoted to 'planned'"
    finally:
        await _delete_project(client, project["id"])


@pytest.mark.asyncio
async def test_single_active_invariant_cross_project_isolation(
    client: AsyncClient,
) -> None:
    """Activating in project A must not affect project B's active milestone."""
    project_a = await _create_project(client, "M-Isolation-ProjectA")
    project_b = await _create_project(client, "M-Isolation-ProjectB")
    try:
        m_a = await _create_milestone(client, project_a["id"], "A-Active")
        m_b = await _create_milestone(client, project_b["id"], "B-Active")

        # Activate both in their respective projects.
        await client.post(f"{MILESTONES_URL}/{m_a['id']}/activate")
        await client.post(f"{MILESTONES_URL}/{m_b['id']}/activate")

        # Now activate another milestone in project A.
        m_a2 = await _create_milestone(client, project_a["id"], "A-Active-2")
        await client.post(f"{MILESTONES_URL}/{m_a2['id']}/activate")

        # m_a should be demoted to 'planned'.
        get_a = await client.get(f"{MILESTONES_URL}/{m_a['id']}")
        assert (
            get_a.json()["data"]["status"] == "planned"
        ), "m_a should be demoted to 'planned'"

        # m_b in project B must remain 'active' — unaffected.
        get_b = await client.get(f"{MILESTONES_URL}/{m_b['id']}")
        assert (
            get_b.json()["data"]["status"] == "active"
        ), "m_b in project B must remain 'active' — cross-project isolation violated"
    finally:
        await _delete_project(client, project_a["id"])
        await _delete_project(client, project_b["id"])


@pytest.mark.asyncio
async def test_single_active_re_activating_finished_demotes_current_active(
    client: AsyncClient,
) -> None:
    """Re-activating a finished milestone also triggers the demote-previous flow."""
    project = await _create_project(client, "M-ReActivate-Demote")
    try:
        m_a = await _create_milestone(client, project["id"], "Was Active")
        m_b = await _create_milestone(client, project["id"], "Was Finished")

        # Activate A, then finish B (B was planned, not yet active).
        await client.post(f"{MILESTONES_URL}/{m_a['id']}/activate")
        # Activate B so it has history, then finish it.
        await client.post(f"{MILESTONES_URL}/{m_b['id']}/activate")  # demotes A
        await client.post(f"{MILESTONES_URL}/{m_b['id']}/finish")

        # Now A is planned, B is finished.
        # Activate A again — B stays finished, A becomes active.
        await client.post(f"{MILESTONES_URL}/{m_a['id']}/activate")

        # Re-activate B from 'finished' — should demote A.
        await client.post(f"{MILESTONES_URL}/{m_b['id']}/activate")

        get_a = await client.get(f"{MILESTONES_URL}/{m_a['id']}")
        assert (
            get_a.json()["data"]["status"] == "planned"
        ), "A should be demoted to 'planned' when B is re-activated"
        get_b = await client.get(f"{MILESTONES_URL}/{m_b['id']}")
        assert (
            get_b.json()["data"]["status"] == "active"
        ), "B should be 'active' after re-activation"
    finally:
        await _delete_project(client, project["id"])


# ===========================================================================
# POST /v1/milestones/:id/finish
# ===========================================================================


@pytest.mark.asyncio
async def test_finish_milestone_sets_status_finished(client: AsyncClient) -> None:
    project = await _create_project(client, "M-Finish-Project-1")
    try:
        milestone = await _create_milestone(client, project["id"], "Finish Me")
        await client.post(f"{MILESTONES_URL}/{milestone['id']}/activate")

        resp = await client.post(f"{MILESTONES_URL}/{milestone['id']}/finish")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
        assert (
            resp.json()["data"]["status"] == "finished"
        ), "status should be 'finished'"
    finally:
        await _delete_project(client, project["id"])


@pytest.mark.asyncio
async def test_finish_milestone_idempotent_when_already_finished(
    client: AsyncClient,
) -> None:
    project = await _create_project(client, "M-Finish-Idempotent")
    try:
        milestone = await _create_milestone(client, project["id"], "Already Finished")
        await client.post(f"{MILESTONES_URL}/{milestone['id']}/activate")
        await client.post(f"{MILESTONES_URL}/{milestone['id']}/finish")

        resp = await client.post(f"{MILESTONES_URL}/{milestone['id']}/finish")
        assert (
            resp.status_code == 200
        ), f"Finishing already-finished milestone should be 200, got {resp.status_code}"
        assert (
            resp.json()["data"]["status"] == "finished"
        ), "status should still be 'finished'"
    finally:
        await _delete_project(client, project["id"])


@pytest.mark.asyncio
async def test_finish_milestone_from_planned(client: AsyncClient) -> None:
    """Finishing a 'planned' milestone is allowed (no status transition restriction)."""
    project = await _create_project(client, "M-Finish-FromPlanned")
    try:
        milestone = await _create_milestone(client, project["id"], "Planned To Finish")
        # No activate call — milestone stays 'planned'.
        resp = await client.post(f"{MILESTONES_URL}/{milestone['id']}/finish")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
        assert (
            resp.json()["data"]["status"] == "finished"
        ), "status should be 'finished'"
    finally:
        await _delete_project(client, project["id"])


@pytest.mark.asyncio
async def test_finish_milestone_not_found_returns_404(client: AsyncClient) -> None:
    import uuid

    resp = await client.post(f"{MILESTONES_URL}/{uuid.uuid4()}/finish")
    assert resp.status_code == 404, f"Expected 404, got {resp.status_code}"


# ===========================================================================
# GET /v1/milestones/:id/stories
# ===========================================================================


@pytest.mark.asyncio
async def test_list_milestone_stories_returns_assigned_stories(
    client: AsyncClient,
) -> None:
    project = await _create_project(client, "M-MilStories-Project-1")
    try:
        milestone = await _create_milestone(client, project["id"], "Story Sprint")
        s1 = await _create_story(client, project["id"], "Story Alpha", milestone["id"])
        s2 = await _create_story(client, project["id"], "Story Beta", milestone["id"])
        # Create an unassigned story — should not appear.
        await _create_story(client, project["id"], "Story Unassigned")

        resp = await client.get(f"{MILESTONES_URL}/{milestone['id']}/stories")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
        body = resp.json()
        assert "data" in body and "meta" in body, "Response missing envelope"
        story_ids = {s["id"] for s in body["data"]}
        assert s1["id"] in story_ids, "Story Alpha should appear"
        assert s2["id"] in story_ids, "Story Beta should appear"
        assert (
            body["meta"]["total"] == 2
        ), f"total should be 2, got {body['meta']['total']}"
    finally:
        await _delete_project(client, project["id"])


@pytest.mark.asyncio
async def test_list_milestone_stories_empty_when_no_assignments(
    client: AsyncClient,
) -> None:
    project = await _create_project(client, "M-MilStories-Empty")
    try:
        milestone = await _create_milestone(client, project["id"], "Empty Sprint")

        resp = await client.get(f"{MILESTONES_URL}/{milestone['id']}/stories")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
        assert (
            resp.json()["meta"]["total"] == 0
        ), "total should be 0 when no stories assigned"
    finally:
        await _delete_project(client, project["id"])


@pytest.mark.asyncio
async def test_list_milestone_stories_unknown_milestone_returns_404(
    client: AsyncClient,
) -> None:
    import uuid

    resp = await client.get(f"{MILESTONES_URL}/{uuid.uuid4()}/stories")
    assert resp.status_code == 404, f"Expected 404, got {resp.status_code}"


# ===========================================================================
# GET /v1/stories?milestone_id=… — milestone_id filter on story list
# ===========================================================================


@pytest.mark.asyncio
async def test_story_list_filtered_by_milestone_id(client: AsyncClient) -> None:
    project = await _create_project(client, "M-StoryFilter-Project-1")
    try:
        m1 = await _create_milestone(client, project["id"], "Filter Sprint")
        s_in = await _create_story(client, project["id"], "In Filter", m1["id"])
        s_out = await _create_story(client, project["id"], "Out of Filter")

        resp = await client.get(
            STORIES_URL,
            params={"project_id": project["id"], "milestone_id": m1["id"]},
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
        ids = {s["id"] for s in resp.json()["data"]}
        assert s_in["id"] in ids, "Assigned story should be included"
        assert s_out["id"] not in ids, "Unassigned story should be excluded"
    finally:
        await _delete_project(client, project["id"])


@pytest.mark.asyncio
async def test_story_list_unknown_milestone_id_yields_empty_page(
    client: AsyncClient,
) -> None:
    """Per the contract: unknown milestone_id yields an empty page, not an error."""
    import uuid

    project = await _create_project(client, "M-StoryFilter-Unknown")
    try:
        await _create_story(client, project["id"], "Regular Story")

        resp = await client.get(
            STORIES_URL,
            params={"project_id": project["id"], "milestone_id": str(uuid.uuid4())},
        )
        assert (
            resp.status_code == 200
        ), f"Unknown milestone_id should yield 200 (empty page), got {resp.status_code}"
        assert (
            resp.json()["meta"]["total"] == 0
        ), "total should be 0 for unknown milestone_id"
    finally:
        await _delete_project(client, project["id"])


# ===========================================================================
# PUT /v1/stories/:id — milestone_id assignment via story update
# ===========================================================================


@pytest.mark.asyncio
async def test_assign_valid_milestone_to_story(client: AsyncClient) -> None:
    project = await _create_project(client, "M-Assign-Project-1")
    try:
        milestone = await _create_milestone(client, project["id"], "Assign Sprint")
        story = await _create_story(client, project["id"], "Assignable Story")
        assert (
            story["milestone_id"] is None
        ), "Precondition: story should start with no milestone"

        resp = await client.put(
            f"{STORIES_URL}/{story['id']}",
            json={"milestone_id": milestone["id"]},
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
        assert (
            resp.json()["data"]["milestone_id"] == milestone["id"]
        ), "milestone_id should be set"
    finally:
        await _delete_project(client, project["id"])


@pytest.mark.asyncio
async def test_clear_milestone_assignment_to_null(client: AsyncClient) -> None:
    project = await _create_project(client, "M-Assign-Project-Clear")
    try:
        milestone = await _create_milestone(client, project["id"], "Clear Sprint")
        story = await _create_story(
            client, project["id"], "Clearable Story", milestone["id"]
        )
        assert (
            story["milestone_id"] == milestone["id"]
        ), "Precondition: story should be assigned"

        resp = await client.put(
            f"{STORIES_URL}/{story['id']}",
            json={"milestone_id": None},
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
        assert (
            resp.json()["data"]["milestone_id"] is None
        ), "milestone_id should be cleared to null"
    finally:
        await _delete_project(client, project["id"])


@pytest.mark.asyncio
async def test_assign_cross_project_milestone_returns_422(client: AsyncClient) -> None:
    """Assigning a story to a milestone from a different project is rejected (422)."""
    project_a = await _create_project(client, "M-CrossAssign-A")
    project_b = await _create_project(client, "M-CrossAssign-B")
    try:
        milestone_b = await _create_milestone(client, project_b["id"], "B-Sprint")
        story_a = await _create_story(client, project_a["id"], "A-Story")

        resp = await client.put(
            f"{STORIES_URL}/{story_a['id']}",
            json={"milestone_id": milestone_b["id"]},
        )
        assert (
            resp.status_code == 422
        ), f"Cross-project milestone assignment should return 422, got {resp.status_code}"
        assert resp.json()["code"] == "UNPROCESSABLE", "code should be UNPROCESSABLE"
    finally:
        await _delete_project(client, project_a["id"])
        await _delete_project(client, project_b["id"])


@pytest.mark.asyncio
async def test_assign_nonexistent_milestone_returns_404(client: AsyncClient) -> None:
    import uuid

    project = await _create_project(client, "M-Assign-NotFound")
    try:
        story = await _create_story(client, project["id"], "Ghost Milestone Story")

        resp = await client.put(
            f"{STORIES_URL}/{story['id']}",
            json={"milestone_id": str(uuid.uuid4())},
        )
        assert (
            resp.status_code == 404
        ), f"Assigning non-existent milestone should return 404, got {resp.status_code}"
    finally:
        await _delete_project(client, project["id"])


# ===========================================================================
# Delete-project cascades to milestones
# ===========================================================================


@pytest.mark.asyncio
async def test_delete_project_removes_its_milestones(
    client: AsyncClient, db_session: Session
) -> None:
    """Deleting a project returns 204 and removes its milestones (FK CASCADE)."""
    project = await _create_project(client, "M-CascadeDelete-Project")
    try:
        milestone = await _create_milestone(client, project["id"], "Cascade Sprint")

        del_resp = await client.delete(f"/v1/projects/{project['id']}")
        assert del_resp.status_code == 204, f"Expected 204, got {del_resp.status_code}"

        db_session.rollback()
        remaining = db_session.execute(
            text("SELECT COUNT(*) FROM milestone WHERE id = :id"),
            {"id": milestone["id"]},
        ).scalar_one()
        assert remaining == 0, "Milestone row should be removed with its project"
    finally:
        await _delete_project(client, project["id"])


@pytest.mark.asyncio
async def test_delete_project_removes_its_stories(
    client: AsyncClient, db_session: Session
) -> None:
    """Deleting a project removes its stories and milestones (FK CASCADE)."""
    project_a = await _create_project(client, "M-CascadeStory-A")
    project_b = await _create_project(client, "M-CascadeStory-B")
    try:
        milestone = await _create_milestone(client, project_a["id"], "A Sprint")
        story = await _create_story(client, project_a["id"], "A Story", milestone["id"])
        assert (
            story["milestone_id"] == milestone["id"]
        ), "Precondition confirmed: story was assigned to the milestone"

        del_resp = await client.delete(f"/v1/projects/{project_a['id']}")
        assert del_resp.status_code == 204, f"Expected 204, got {del_resp.status_code}"

        db_session.rollback()
        for table, row_id in (("story", story["id"]), ("milestone", milestone["id"])):
            remaining = db_session.execute(
                text(f"SELECT COUNT(*) FROM {table} WHERE id = :id"), {"id": row_id}
            ).scalar_one()
            assert remaining == 0, f"{table} row should be removed with its project"
    finally:
        # project_a already deleted; clean up project_b only.
        await _delete_project(client, project_b["id"])


# ===========================================================================
# Milestone with no stories — zero story_count is valid
# ===========================================================================


@pytest.mark.asyncio
async def test_milestone_with_no_stories_has_zero_story_count(
    client: AsyncClient,
) -> None:
    project = await _create_project(client, "M-ZeroCount-Project")
    try:
        milestone = await _create_milestone(client, project["id"], "Zero Count")

        # Verify via list.
        list_resp = await client.get(
            MILESTONES_URL, params={"project_id": project["id"]}
        )
        items = list_resp.json()["data"]
        matching = [m for m in items if m["id"] == milestone["id"]]
        assert len(matching) == 1, "Milestone should appear in list"
        assert (
            matching[0]["story_count"] == 0
        ), "story_count should be 0 for a milestone with no stories"

        # Verify via detail.
        detail_resp = await client.get(f"{MILESTONES_URL}/{milestone['id']}")
        assert (
            detail_resp.json()["data"]["story_count"] == 0
        ), "story_count should be 0 in detail"
    finally:
        await _delete_project(client, project["id"])
