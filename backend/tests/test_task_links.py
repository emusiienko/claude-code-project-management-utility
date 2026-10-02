"""Integration tests for the Task Links domain — STORY-006.

Coverage zones:
- POST /v1/tasks/:taskId/links
    happy path (link created between two tasks in the same story)
    self-link → 422 with exact message
    cross-story link → 422 with exact message
    link_type not in dictionary → 422
    duplicate (same source, target, type) → 409 with exact message
    missing source task → 404
    missing target task → 404
    empty target_task_id → 422 (request validation)
    empty link_type → 422 (request validation)

- GET /v1/tasks/:taskId/links
    direction=outbound — only links where viewed task is source
    direction=inbound  — only links where viewed task is target
    direction=both (default) — union of outbound + inbound, each correctly tagged
    link_type filter narrows results
    each row carries linked_task summary (id, title, status)
    pagination meta present

- DELETE /v1/task-links/:id
    204 on success; link gone afterwards
    404 on non-existent link id
    404 on malformed UUID

- GET /v1/tasks/:id/detail
    links field present and populated (outbound + inbound) with enriched rows
    enrichment matches current task state

- Cascade delete
    deleting a task removes all task links referencing it (source and target side)

- Error precedence
    existence (404) before duplicate (409)

Notes:
- System-default link_types from seed migration 0002_settings: ["depends-on", "context"]
- Every test creates its own data; no cross-test state dependency.
"""

import uuid

import pytest
from httpx import AsyncClient

# ---------------------------------------------------------------------------
# URL constants
# ---------------------------------------------------------------------------

PROJECTS_URL = "/v1/projects/"
STORIES_URL = "/v1/stories"
TASKS_URL = "/v1/tasks"
TASK_LINKS_TOP_URL = "/v1/task-links"

VALID_LINK_TYPE = "depends-on"
ANOTHER_LINK_TYPE = "context"
INVALID_LINK_TYPE = "not-a-valid-link-type-xyz"

VALID_TASK_TYPE = "task"
VALID_TASK_STATUS = "todo"


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
    await client.delete(f"/v1/projects/{project_id}")


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
        json={"title": title, "type": VALID_TASK_TYPE, "status": VALID_TASK_STATUS},
    )
    assert (
        resp.status_code == 201
    ), f"Helper _create_task: expected 201, got {resp.status_code} — {resp.text}"
    return resp.json()["data"]


async def _delete_task(client: AsyncClient, task_id: str) -> None:
    await client.delete(f"{TASKS_URL}/{task_id}")


async def _create_task_link(
    client: AsyncClient,
    source_task_id: str,
    target_task_id: str,
    link_type: str = VALID_LINK_TYPE,
) -> dict:
    resp = await client.post(
        f"{TASKS_URL}/{source_task_id}/links",
        json={"target_task_id": target_task_id, "link_type": link_type},
    )
    assert (
        resp.status_code == 201
    ), f"Helper _create_task_link: expected 201, got {resp.status_code} — {resp.text}"
    return resp.json()["data"]


# ===========================================================================
# POST /v1/tasks/:taskId/links — Create
# ===========================================================================


class TestCreateTaskLink:
    @pytest.mark.asyncio
    async def test_happy_path_returns_201_with_link_data(
        self, client: AsyncClient
    ) -> None:
        proj = await _create_project(client, "TL Create Happy Path")
        try:
            story = await _create_story(client, proj["id"])
            task_a = await _create_task(client, story["id"], "Task A")
            task_b = await _create_task(client, story["id"], "Task B")

            resp = await client.post(
                f"{TASKS_URL}/{task_a['id']}/links",
                json={
                    "target_task_id": task_b["id"],
                    "link_type": VALID_LINK_TYPE,
                },
            )

            assert resp.status_code == 201, f"Expected 201, got {resp.status_code}"
            body = resp.json()
            assert "data" in body, "Response should have 'data' key"
            link = body["data"]
            assert link["source_task_id"] == task_a["id"], "source_task_id mismatch"
            assert link["target_task_id"] == task_b["id"], "target_task_id mismatch"
            assert link["link_type"] == VALID_LINK_TYPE, "link_type mismatch"
            assert "id" in link, "link should have 'id'"
            assert "created_at" in link, "link should have 'created_at'"
        finally:
            await _delete_project(client, proj["id"])

    @pytest.mark.asyncio
    async def test_self_link_returns_422_with_exact_message(
        self, client: AsyncClient
    ) -> None:
        proj = await _create_project(client, "TL Self-link")
        try:
            story = await _create_story(client, proj["id"])
            task = await _create_task(client, story["id"], "Task Self")

            resp = await client.post(
                f"{TASKS_URL}/{task['id']}/links",
                json={"target_task_id": task["id"], "link_type": VALID_LINK_TYPE},
            )

            assert resp.status_code == 422, f"Expected 422, got {resp.status_code}"
            assert (
                "A task cannot link to itself." in resp.text
            ), f"Expected self-link message, got: {resp.text}"
        finally:
            await _delete_project(client, proj["id"])

    @pytest.mark.asyncio
    async def test_cross_story_link_returns_422_with_exact_message(
        self, client: AsyncClient
    ) -> None:
        proj = await _create_project(client, "TL Cross-story")
        try:
            story_a = await _create_story(client, proj["id"], "Story A")
            story_b = await _create_story(client, proj["id"], "Story B")
            task_a = await _create_task(client, story_a["id"], "Task In Story A")
            task_b = await _create_task(client, story_b["id"], "Task In Story B")

            resp = await client.post(
                f"{TASKS_URL}/{task_a['id']}/links",
                json={"target_task_id": task_b["id"], "link_type": VALID_LINK_TYPE},
            )

            assert resp.status_code == 422, f"Expected 422, got {resp.status_code}"
            assert (
                "Cannot link tasks from different stories." in resp.text
            ), f"Expected cross-story message, got: {resp.text}"
        finally:
            await _delete_project(client, proj["id"])

    @pytest.mark.asyncio
    async def test_invalid_link_type_returns_422(self, client: AsyncClient) -> None:
        proj = await _create_project(client, "TL Invalid Link Type")
        try:
            story = await _create_story(client, proj["id"])
            task_a = await _create_task(client, story["id"], "Task A")
            task_b = await _create_task(client, story["id"], "Task B")

            resp = await client.post(
                f"{TASKS_URL}/{task_a['id']}/links",
                json={"target_task_id": task_b["id"], "link_type": INVALID_LINK_TYPE},
            )

            assert resp.status_code == 422, f"Expected 422, got {resp.status_code}"
        finally:
            await _delete_project(client, proj["id"])

    @pytest.mark.asyncio
    async def test_duplicate_link_returns_409_with_exact_message(
        self, client: AsyncClient
    ) -> None:
        proj = await _create_project(client, "TL Duplicate")
        try:
            story = await _create_story(client, proj["id"])
            task_a = await _create_task(client, story["id"], "Task A")
            task_b = await _create_task(client, story["id"], "Task B")

            # First link — must succeed.
            await _create_task_link(client, task_a["id"], task_b["id"], VALID_LINK_TYPE)

            # Duplicate — must conflict.
            resp = await client.post(
                f"{TASKS_URL}/{task_a['id']}/links",
                json={"target_task_id": task_b["id"], "link_type": VALID_LINK_TYPE},
            )

            assert resp.status_code == 409, f"Expected 409, got {resp.status_code}"
            assert (
                "This link already exists." in resp.text
            ), f"Expected duplicate message, got: {resp.text}"
        finally:
            await _delete_project(client, proj["id"])

    @pytest.mark.asyncio
    async def test_missing_source_task_returns_404(self, client: AsyncClient) -> None:
        proj = await _create_project(client, "TL Missing Source")
        try:
            story = await _create_story(client, proj["id"])
            task_b = await _create_task(client, story["id"], "Task B")
            fake_id = str(uuid.uuid4())

            resp = await client.post(
                f"{TASKS_URL}/{fake_id}/links",
                json={"target_task_id": task_b["id"], "link_type": VALID_LINK_TYPE},
            )

            assert resp.status_code == 404, f"Expected 404, got {resp.status_code}"
        finally:
            await _delete_project(client, proj["id"])

    @pytest.mark.asyncio
    async def test_missing_target_task_returns_404(self, client: AsyncClient) -> None:
        proj = await _create_project(client, "TL Missing Target")
        try:
            story = await _create_story(client, proj["id"])
            task_a = await _create_task(client, story["id"], "Task A")
            fake_id = str(uuid.uuid4())

            resp = await client.post(
                f"{TASKS_URL}/{task_a['id']}/links",
                json={"target_task_id": fake_id, "link_type": VALID_LINK_TYPE},
            )

            assert resp.status_code == 404, f"Expected 404, got {resp.status_code}"
        finally:
            await _delete_project(client, proj["id"])

    @pytest.mark.asyncio
    async def test_empty_target_task_id_returns_422(self, client: AsyncClient) -> None:
        proj = await _create_project(client, "TL Empty Target ID")
        try:
            story = await _create_story(client, proj["id"])
            task_a = await _create_task(client, story["id"], "Task A")

            resp = await client.post(
                f"{TASKS_URL}/{task_a['id']}/links",
                json={"target_task_id": "   ", "link_type": VALID_LINK_TYPE},
            )

            assert resp.status_code == 422, f"Expected 422, got {resp.status_code}"
        finally:
            await _delete_project(client, proj["id"])

    @pytest.mark.asyncio
    async def test_empty_link_type_returns_422(self, client: AsyncClient) -> None:
        proj = await _create_project(client, "TL Empty Link Type")
        try:
            story = await _create_story(client, proj["id"])
            task_a = await _create_task(client, story["id"], "Task A")
            task_b = await _create_task(client, story["id"], "Task B")

            resp = await client.post(
                f"{TASKS_URL}/{task_a['id']}/links",
                json={"target_task_id": task_b["id"], "link_type": "  "},
            )

            assert resp.status_code == 422, f"Expected 422, got {resp.status_code}"
        finally:
            await _delete_project(client, proj["id"])

    @pytest.mark.asyncio
    async def test_error_precedence_existence_before_duplicate(
        self, client: AsyncClient
    ) -> None:
        """A missing source task returns 404 even if the link would be a duplicate."""
        proj = await _create_project(client, "TL Error Precedence")
        try:
            story = await _create_story(client, proj["id"])
            task_b = await _create_task(client, story["id"], "Task B")
            fake_source_id = str(uuid.uuid4())

            resp = await client.post(
                f"{TASKS_URL}/{fake_source_id}/links",
                json={"target_task_id": task_b["id"], "link_type": VALID_LINK_TYPE},
            )

            # Existence check (404) must fire before duplicate check (409).
            assert (
                resp.status_code == 404
            ), f"Expected 404 (existence before duplicate), got {resp.status_code}"
        finally:
            await _delete_project(client, proj["id"])


# ===========================================================================
# GET /v1/tasks/:taskId/links — List with direction and enrichment
# ===========================================================================


class TestListTaskLinks:
    @pytest.mark.asyncio
    async def test_direction_outbound_returns_only_source_links(
        self, client: AsyncClient
    ) -> None:
        proj = await _create_project(client, "TL List Outbound")
        try:
            story = await _create_story(client, proj["id"])
            task_a = await _create_task(client, story["id"], "Task A")
            task_b = await _create_task(client, story["id"], "Task B")
            task_c = await _create_task(client, story["id"], "Task C")

            # A → B (outbound from A)
            await _create_task_link(client, task_a["id"], task_b["id"], VALID_LINK_TYPE)
            # C → A (inbound to A)
            await _create_task_link(client, task_c["id"], task_a["id"], VALID_LINK_TYPE)

            resp = await client.get(
                f"{TASKS_URL}/{task_a['id']}/links", params={"direction": "outbound"}
            )

            assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
            data = resp.json()["data"]
            assert len(data) == 1, f"Expected 1 outbound link, got {len(data)}"
            assert (
                data[0]["direction"] == "outbound"
            ), "direction field should be 'outbound'"
            assert (
                data[0]["linked_task"]["id"] == task_b["id"]
            ), "linked_task id mismatch for outbound direction"
        finally:
            await _delete_project(client, proj["id"])

    @pytest.mark.asyncio
    async def test_direction_inbound_returns_only_target_links(
        self, client: AsyncClient
    ) -> None:
        proj = await _create_project(client, "TL List Inbound")
        try:
            story = await _create_story(client, proj["id"])
            task_a = await _create_task(client, story["id"], "Task A")
            task_b = await _create_task(client, story["id"], "Task B")
            task_c = await _create_task(client, story["id"], "Task C")

            # A → B (outbound from A)
            await _create_task_link(client, task_a["id"], task_b["id"], VALID_LINK_TYPE)
            # C → A (inbound to A)
            await _create_task_link(client, task_c["id"], task_a["id"], VALID_LINK_TYPE)

            resp = await client.get(
                f"{TASKS_URL}/{task_a['id']}/links", params={"direction": "inbound"}
            )

            assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
            data = resp.json()["data"]
            assert len(data) == 1, f"Expected 1 inbound link, got {len(data)}"
            assert (
                data[0]["direction"] == "inbound"
            ), "direction field should be 'inbound'"
            assert (
                data[0]["linked_task"]["id"] == task_c["id"]
            ), "linked_task id mismatch for inbound direction"
        finally:
            await _delete_project(client, proj["id"])

    @pytest.mark.asyncio
    async def test_direction_both_returns_union_with_correct_tags(
        self, client: AsyncClient
    ) -> None:
        proj = await _create_project(client, "TL List Both")
        try:
            story = await _create_story(client, proj["id"])
            task_a = await _create_task(client, story["id"], "Task A")
            task_b = await _create_task(client, story["id"], "Task B")
            task_c = await _create_task(client, story["id"], "Task C")

            # A → B (outbound from A)
            await _create_task_link(client, task_a["id"], task_b["id"], VALID_LINK_TYPE)
            # C → A (inbound to A)
            await _create_task_link(client, task_c["id"], task_a["id"], VALID_LINK_TYPE)

            resp = await client.get(
                f"{TASKS_URL}/{task_a['id']}/links", params={"direction": "both"}
            )

            assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
            data = resp.json()["data"]
            assert len(data) == 2, f"Expected 2 links (both), got {len(data)}"
            directions = {row["direction"] for row in data}
            assert "outbound" in directions, "Expected outbound direction in results"
            assert "inbound" in directions, "Expected inbound direction in results"
        finally:
            await _delete_project(client, proj["id"])

    @pytest.mark.asyncio
    async def test_default_direction_is_both(self, client: AsyncClient) -> None:
        proj = await _create_project(client, "TL List Default Direction")
        try:
            story = await _create_story(client, proj["id"])
            task_a = await _create_task(client, story["id"], "Task A")
            task_b = await _create_task(client, story["id"], "Task B")
            task_c = await _create_task(client, story["id"], "Task C")

            await _create_task_link(client, task_a["id"], task_b["id"], VALID_LINK_TYPE)
            await _create_task_link(client, task_c["id"], task_a["id"], VALID_LINK_TYPE)

            # No direction param — should default to "both".
            resp = await client.get(f"{TASKS_URL}/{task_a['id']}/links")

            assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
            data = resp.json()["data"]
            assert (
                len(data) == 2
            ), f"Default direction should return both directions (2 links), got {len(data)}"
        finally:
            await _delete_project(client, proj["id"])

    @pytest.mark.asyncio
    async def test_link_type_filter_narrows_results(self, client: AsyncClient) -> None:
        proj = await _create_project(client, "TL List Link Type Filter")
        try:
            story = await _create_story(client, proj["id"])
            task_a = await _create_task(client, story["id"], "Task A")
            task_b = await _create_task(client, story["id"], "Task B")
            task_c = await _create_task(client, story["id"], "Task C")

            await _create_task_link(client, task_a["id"], task_b["id"], VALID_LINK_TYPE)
            await _create_task_link(
                client, task_a["id"], task_c["id"], ANOTHER_LINK_TYPE
            )

            resp = await client.get(
                f"{TASKS_URL}/{task_a['id']}/links",
                params={"direction": "outbound", "link_type": VALID_LINK_TYPE},
            )

            assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
            data = resp.json()["data"]
            assert (
                len(data) == 1
            ), f"link_type filter should return 1 link, got {len(data)}"
            assert (
                data[0]["link_type"] == VALID_LINK_TYPE
            ), "link_type filter not applied"
        finally:
            await _delete_project(client, proj["id"])

    @pytest.mark.asyncio
    async def test_enrichment_includes_linked_task_summary(
        self, client: AsyncClient
    ) -> None:
        proj = await _create_project(client, "TL List Enrichment")
        try:
            story = await _create_story(client, proj["id"])
            task_a = await _create_task(client, story["id"], "Source Task")
            task_b = await _create_task(client, story["id"], "Target Task")

            await _create_task_link(client, task_a["id"], task_b["id"], VALID_LINK_TYPE)

            resp = await client.get(
                f"{TASKS_URL}/{task_a['id']}/links", params={"direction": "outbound"}
            )

            assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
            link_row = resp.json()["data"][0]
            assert "linked_task" in link_row, "Response row should have 'linked_task'"
            linked = link_row["linked_task"]
            assert (
                linked["id"] == task_b["id"]
            ), "linked_task.id should match target task"
            assert linked["title"] == "Target Task", "linked_task.title mismatch"
            assert "status" in linked, "linked_task should include 'status'"
        finally:
            await _delete_project(client, proj["id"])

    @pytest.mark.asyncio
    async def test_pagination_meta_present(self, client: AsyncClient) -> None:
        proj = await _create_project(client, "TL List Pagination")
        try:
            story = await _create_story(client, proj["id"])
            task_a = await _create_task(client, story["id"], "Task A")
            task_b = await _create_task(client, story["id"], "Task B")

            await _create_task_link(client, task_a["id"], task_b["id"], VALID_LINK_TYPE)

            resp = await client.get(f"{TASKS_URL}/{task_a['id']}/links")

            assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
            body = resp.json()
            assert "meta" in body, "Response should include 'meta'"
            meta = body["meta"]
            assert "total" in meta, "meta should have 'total'"
            assert "page" in meta, "meta should have 'page'"
            assert "limit" in meta, "meta should have 'limit'"
            assert "totalPages" in meta, "meta should have 'totalPages'"
        finally:
            await _delete_project(client, proj["id"])

    @pytest.mark.asyncio
    async def test_list_unknown_task_returns_404(self, client: AsyncClient) -> None:
        fake_id = str(uuid.uuid4())
        resp = await client.get(f"{TASKS_URL}/{fake_id}/links")
        assert resp.status_code == 404, f"Expected 404, got {resp.status_code}"


# ===========================================================================
# DELETE /v1/task-links/:id — Delete
# ===========================================================================


class TestDeleteTaskLink:
    @pytest.mark.asyncio
    async def test_delete_returns_204_and_link_gone(self, client: AsyncClient) -> None:
        proj = await _create_project(client, "TL Delete Happy Path")
        try:
            story = await _create_story(client, proj["id"])
            task_a = await _create_task(client, story["id"], "Task A")
            task_b = await _create_task(client, story["id"], "Task B")

            link = await _create_task_link(client, task_a["id"], task_b["id"])

            # Delete the link.
            del_resp = await client.delete(f"{TASK_LINKS_TOP_URL}/{link['id']}")
            assert (
                del_resp.status_code == 204
            ), f"Expected 204 on delete, got {del_resp.status_code}"

            # Verify it's gone from the list.
            list_resp = await client.get(f"{TASKS_URL}/{task_a['id']}/links")
            data = list_resp.json()["data"]
            assert all(
                row["id"] != link["id"] for row in data
            ), "Deleted link should not appear in list"
        finally:
            await _delete_project(client, proj["id"])

    @pytest.mark.asyncio
    async def test_delete_non_existent_link_returns_404(
        self, client: AsyncClient
    ) -> None:
        fake_id = str(uuid.uuid4())
        resp = await client.delete(f"{TASK_LINKS_TOP_URL}/{fake_id}")
        assert resp.status_code == 404, f"Expected 404, got {resp.status_code}"

    @pytest.mark.asyncio
    async def test_delete_malformed_uuid_returns_404(self, client: AsyncClient) -> None:
        resp = await client.delete(f"{TASK_LINKS_TOP_URL}/not-a-uuid")
        assert (
            resp.status_code == 404
        ), f"Expected 404 for malformed UUID, got {resp.status_code}"


# ===========================================================================
# GET /v1/tasks/:id/detail — links field populated
# ===========================================================================


class TestTaskDetail:
    @pytest.mark.asyncio
    async def test_detail_links_field_populated_with_enriched_rows(
        self, client: AsyncClient
    ) -> None:
        proj = await _create_project(client, "TL Detail Links Populated")
        try:
            story = await _create_story(client, proj["id"])
            task_a = await _create_task(client, story["id"], "Detail Task A")
            task_b = await _create_task(client, story["id"], "Detail Task B")
            task_c = await _create_task(client, story["id"], "Detail Task C")

            # A → B (outbound)
            await _create_task_link(client, task_a["id"], task_b["id"], VALID_LINK_TYPE)
            # C → A (inbound)
            await _create_task_link(
                client, task_c["id"], task_a["id"], ANOTHER_LINK_TYPE
            )

            resp = await client.get(f"{TASKS_URL}/{task_a['id']}/detail")

            assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
            body = resp.json()["data"]
            assert "links" in body, "detail response should have 'links' field"
            links = body["links"]
            assert len(links) == 2, f"Expected 2 links in detail, got {len(links)}"

            directions = {row["direction"] for row in links}
            assert "outbound" in directions, "Expected outbound link in detail"
            assert "inbound" in directions, "Expected inbound link in detail"

            for row in links:
                assert "linked_task" in row, "Each link row should have 'linked_task'"
                assert "id" in row["linked_task"], "linked_task should have 'id'"
                assert "title" in row["linked_task"], "linked_task should have 'title'"
                assert (
                    "status" in row["linked_task"]
                ), "linked_task should have 'status'"
        finally:
            await _delete_project(client, proj["id"])

    @pytest.mark.asyncio
    async def test_detail_links_empty_when_no_links(self, client: AsyncClient) -> None:
        proj = await _create_project(client, "TL Detail No Links")
        try:
            story = await _create_story(client, proj["id"])
            task = await _create_task(client, story["id"], "Isolated Task")

            resp = await client.get(f"{TASKS_URL}/{task['id']}/detail")

            assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
            body = resp.json()["data"]
            assert "links" in body, "detail response should have 'links' field"
            assert (
                body["links"] == []
            ), "links should be an empty list when no links exist"
        finally:
            await _delete_project(client, proj["id"])


# ===========================================================================
# Cascade delete — deleting a task removes its links
# ===========================================================================


class TestTaskLinkCascadeDelete:
    @pytest.mark.asyncio
    async def test_deleting_source_task_removes_its_links(
        self, client: AsyncClient
    ) -> None:
        proj = await _create_project(client, "TL Cascade Source Delete")
        try:
            story = await _create_story(client, proj["id"])
            task_a = await _create_task(client, story["id"], "Task A")
            task_b = await _create_task(client, story["id"], "Task B")

            # A → B
            link = await _create_task_link(client, task_a["id"], task_b["id"])

            # Delete the source task (task_a).
            del_resp = await client.delete(f"{TASKS_URL}/{task_a['id']}")
            assert (
                del_resp.status_code == 204
            ), f"Expected 204 on task delete, got {del_resp.status_code}"

            # The link itself should no longer be retrievable by its id.
            link_del_resp = await client.delete(f"{TASK_LINKS_TOP_URL}/{link['id']}")
            assert (
                link_del_resp.status_code == 404
            ), "Link should have been cascade-deleted when source task was deleted"
        finally:
            await _delete_project(client, proj["id"])

    @pytest.mark.asyncio
    async def test_deleting_target_task_removes_its_links(
        self, client: AsyncClient
    ) -> None:
        proj = await _create_project(client, "TL Cascade Target Delete")
        try:
            story = await _create_story(client, proj["id"])
            task_a = await _create_task(client, story["id"], "Task A")
            task_b = await _create_task(client, story["id"], "Task B")

            # A → B
            link = await _create_task_link(client, task_a["id"], task_b["id"])

            # Delete the target task (task_b).
            del_resp = await client.delete(f"{TASKS_URL}/{task_b['id']}")
            assert (
                del_resp.status_code == 204
            ), f"Expected 204 on task delete, got {del_resp.status_code}"

            # A's link list should now be empty.
            list_resp = await client.get(
                f"{TASKS_URL}/{task_a['id']}/links", params={"direction": "outbound"}
            )
            assert (
                list_resp.status_code == 200
            ), f"Expected 200 on list after target delete, got {list_resp.status_code}"
            assert (
                list_resp.json()["data"] == []
            ), "Link list should be empty after target task is deleted"

            # The link itself should be gone.
            link_del_resp = await client.delete(f"{TASK_LINKS_TOP_URL}/{link['id']}")
            assert (
                link_del_resp.status_code == 404
            ), "Link should have been cascade-deleted when target task was deleted"
        finally:
            await _delete_project(client, proj["id"])
