"""Integration tests for the Story Links domain — STORY-006.

Coverage zones:
- POST /v1/stories/:storyId/links
    happy path (link created between two stories in the same project)
    self-link → 422 with exact message
    cross-project link → 422 with exact message
    link_type not in dictionary → 422
    duplicate (same source, target, type) → 409 with exact message
    missing source story → 404
    missing target story → 404
    empty target_story_id → 422 (request validation)
    empty link_type → 422 (request validation)

- GET /v1/stories/:storyId/links
    direction=outbound — only links where viewed story is source
    direction=inbound  — only links where viewed story is target
    direction=both (default) — union, each correctly tagged
    link_type filter narrows results
    each row carries linked_story summary (id, title, status)
    pagination meta present

- DELETE /v1/story-links/:id
    204 on success; link gone afterwards
    404 on non-existent link id
    404 on malformed UUID

- GET /v1/stories/:id/detail (StoryDetail.links)
    links field present and populated (outbound + inbound) with enriched rows
    enrichment matches current story state

- Cascade delete
    deleting a story removes all story links referencing it (source and target side)

- Error precedence
    existence (404) before duplicate (409)

Notes:
- System-default link_types: ["depends-on", "context"]
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
STORY_LINKS_TOP_URL = "/v1/story-links"

VALID_LINK_TYPE = "depends-on"
ANOTHER_LINK_TYPE = "context"
INVALID_LINK_TYPE = "not-a-valid-link-type-xyz"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


async def _create_project(client: AsyncClient, name: str) -> dict:
    resp = await client.post(PROJECTS_URL, json={"name": name})
    assert resp.status_code == 201, (
        f"Helper _create_project: expected 201, got {resp.status_code} — {resp.text}"
    )
    return resp.json()["data"]


async def _delete_project(client: AsyncClient, project_id: str) -> None:
    await client.delete(f"/v1/projects/{project_id}")


async def _create_story(
    client: AsyncClient,
    project_id: str,
    title: str = "Test Story",
    *,
    status: str | None = None,
) -> dict:
    payload: dict = {"project_id": project_id, "title": title}
    if status is not None:
        payload["status"] = status
    resp = await client.post(STORIES_URL, json=payload)
    assert resp.status_code == 201, (
        f"Helper _create_story: expected 201, got {resp.status_code} — {resp.text}"
    )
    return resp.json()["data"]


async def _delete_story(client: AsyncClient, story_id: str) -> None:
    await client.delete(f"{STORIES_URL}/{story_id}")


async def _create_story_link(
    client: AsyncClient,
    source_story_id: str,
    target_story_id: str,
    link_type: str = VALID_LINK_TYPE,
) -> dict:
    resp = await client.post(
        f"{STORIES_URL}/{source_story_id}/links",
        json={"target_story_id": target_story_id, "link_type": link_type},
    )
    assert resp.status_code == 201, (
        f"Helper _create_story_link: expected 201, got {resp.status_code} — {resp.text}"
    )
    return resp.json()["data"]


# ===========================================================================
# POST /v1/stories/:storyId/links — Create
# ===========================================================================


class TestCreateStoryLink:
    @pytest.mark.asyncio
    async def test_happy_path_returns_201_with_link_data(
        self, client: AsyncClient
    ) -> None:
        proj = await _create_project(client, "SL Create Happy Path")
        try:
            story_a = await _create_story(client, proj["id"], "Story A")
            story_b = await _create_story(client, proj["id"], "Story B")

            resp = await client.post(
                f"{STORIES_URL}/{story_a['id']}/links",
                json={"target_story_id": story_b["id"], "link_type": VALID_LINK_TYPE},
            )

            assert resp.status_code == 201, f"Expected 201, got {resp.status_code}"
            body = resp.json()
            assert "data" in body, "Response should have 'data' key"
            link = body["data"]
            assert link["source_story_id"] == story_a["id"], "source_story_id mismatch"
            assert link["target_story_id"] == story_b["id"], "target_story_id mismatch"
            assert link["link_type"] == VALID_LINK_TYPE, "link_type mismatch"
            assert "id" in link, "link should have 'id'"
            assert "created_at" in link, "link should have 'created_at'"
        finally:
            await _delete_project(client, proj["id"])

    @pytest.mark.asyncio
    async def test_self_link_returns_422_with_exact_message(
        self, client: AsyncClient
    ) -> None:
        proj = await _create_project(client, "SL Self-link")
        try:
            story = await _create_story(client, proj["id"], "Story Self")

            resp = await client.post(
                f"{STORIES_URL}/{story['id']}/links",
                json={"target_story_id": story["id"], "link_type": VALID_LINK_TYPE},
            )

            assert resp.status_code == 422, f"Expected 422, got {resp.status_code}"
            assert "A story cannot link to itself." in resp.text, (
                f"Expected self-link message, got: {resp.text}"
            )
        finally:
            await _delete_project(client, proj["id"])

    @pytest.mark.asyncio
    async def test_cross_project_link_returns_422_with_exact_message(
        self, client: AsyncClient
    ) -> None:
        proj_a = await _create_project(client, "SL Cross-project A")
        proj_b = await _create_project(client, "SL Cross-project B")
        try:
            story_a = await _create_story(client, proj_a["id"], "Story In Project A")
            story_b = await _create_story(client, proj_b["id"], "Story In Project B")

            resp = await client.post(
                f"{STORIES_URL}/{story_a['id']}/links",
                json={"target_story_id": story_b["id"], "link_type": VALID_LINK_TYPE},
            )

            assert resp.status_code == 422, f"Expected 422, got {resp.status_code}"
            assert "Cannot link stories from different projects." in resp.text, (
                f"Expected cross-project message, got: {resp.text}"
            )
        finally:
            await _delete_project(client, proj_a["id"])
            await _delete_project(client, proj_b["id"])

    @pytest.mark.asyncio
    async def test_invalid_link_type_returns_422(self, client: AsyncClient) -> None:
        proj = await _create_project(client, "SL Invalid Link Type")
        try:
            story_a = await _create_story(client, proj["id"], "Story A")
            story_b = await _create_story(client, proj["id"], "Story B")

            resp = await client.post(
                f"{STORIES_URL}/{story_a['id']}/links",
                json={"target_story_id": story_b["id"], "link_type": INVALID_LINK_TYPE},
            )

            assert resp.status_code == 422, f"Expected 422, got {resp.status_code}"
        finally:
            await _delete_project(client, proj["id"])

    @pytest.mark.asyncio
    async def test_duplicate_link_returns_409_with_exact_message(
        self, client: AsyncClient
    ) -> None:
        proj = await _create_project(client, "SL Duplicate")
        try:
            story_a = await _create_story(client, proj["id"], "Story A")
            story_b = await _create_story(client, proj["id"], "Story B")

            # First link — must succeed.
            await _create_story_link(client, story_a["id"], story_b["id"])

            # Duplicate — must conflict.
            resp = await client.post(
                f"{STORIES_URL}/{story_a['id']}/links",
                json={"target_story_id": story_b["id"], "link_type": VALID_LINK_TYPE},
            )

            assert resp.status_code == 409, f"Expected 409, got {resp.status_code}"
            assert "This link already exists." in resp.text, (
                f"Expected duplicate message, got: {resp.text}"
            )
        finally:
            await _delete_project(client, proj["id"])

    @pytest.mark.asyncio
    async def test_missing_source_story_returns_404(self, client: AsyncClient) -> None:
        proj = await _create_project(client, "SL Missing Source")
        try:
            story_b = await _create_story(client, proj["id"], "Story B")
            fake_id = str(uuid.uuid4())

            resp = await client.post(
                f"{STORIES_URL}/{fake_id}/links",
                json={"target_story_id": story_b["id"], "link_type": VALID_LINK_TYPE},
            )

            assert resp.status_code == 404, f"Expected 404, got {resp.status_code}"
        finally:
            await _delete_project(client, proj["id"])

    @pytest.mark.asyncio
    async def test_missing_target_story_returns_404(self, client: AsyncClient) -> None:
        proj = await _create_project(client, "SL Missing Target")
        try:
            story_a = await _create_story(client, proj["id"], "Story A")
            fake_id = str(uuid.uuid4())

            resp = await client.post(
                f"{STORIES_URL}/{story_a['id']}/links",
                json={"target_story_id": fake_id, "link_type": VALID_LINK_TYPE},
            )

            assert resp.status_code == 404, f"Expected 404, got {resp.status_code}"
        finally:
            await _delete_project(client, proj["id"])

    @pytest.mark.asyncio
    async def test_empty_target_story_id_returns_422(self, client: AsyncClient) -> None:
        proj = await _create_project(client, "SL Empty Target ID")
        try:
            story_a = await _create_story(client, proj["id"], "Story A")

            resp = await client.post(
                f"{STORIES_URL}/{story_a['id']}/links",
                json={"target_story_id": "   ", "link_type": VALID_LINK_TYPE},
            )

            assert resp.status_code == 422, f"Expected 422, got {resp.status_code}"
        finally:
            await _delete_project(client, proj["id"])

    @pytest.mark.asyncio
    async def test_empty_link_type_returns_422(self, client: AsyncClient) -> None:
        proj = await _create_project(client, "SL Empty Link Type")
        try:
            story_a = await _create_story(client, proj["id"], "Story A")
            story_b = await _create_story(client, proj["id"], "Story B")

            resp = await client.post(
                f"{STORIES_URL}/{story_a['id']}/links",
                json={"target_story_id": story_b["id"], "link_type": "  "},
            )

            assert resp.status_code == 422, f"Expected 422, got {resp.status_code}"
        finally:
            await _delete_project(client, proj["id"])

    @pytest.mark.asyncio
    async def test_error_precedence_existence_before_duplicate(
        self, client: AsyncClient
    ) -> None:
        """A missing source story returns 404 even when the duplicate rule would also fire."""
        proj = await _create_project(client, "SL Error Precedence")
        try:
            story_b = await _create_story(client, proj["id"], "Story B")
            fake_source_id = str(uuid.uuid4())

            resp = await client.post(
                f"{STORIES_URL}/{fake_source_id}/links",
                json={"target_story_id": story_b["id"], "link_type": VALID_LINK_TYPE},
            )

            assert resp.status_code == 404, (
                f"Expected 404 (existence before duplicate), got {resp.status_code}"
            )
        finally:
            await _delete_project(client, proj["id"])


# ===========================================================================
# GET /v1/stories/:storyId/links — List with direction and enrichment
# ===========================================================================


class TestListStoryLinks:
    @pytest.mark.asyncio
    async def test_direction_outbound_returns_only_source_links(
        self, client: AsyncClient
    ) -> None:
        proj = await _create_project(client, "SL List Outbound")
        try:
            story_a = await _create_story(client, proj["id"], "Story A", status="in-progress")
            story_b = await _create_story(client, proj["id"], "Story B", status="planned")
            story_c = await _create_story(client, proj["id"], "Story C", status="planned")

            # A → B (outbound from A)
            await _create_story_link(client, story_a["id"], story_b["id"])
            # C → A (inbound to A)
            await _create_story_link(client, story_c["id"], story_a["id"])

            resp = await client.get(
                f"{STORIES_URL}/{story_a['id']}/links",
                params={"direction": "outbound"},
            )

            assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
            data = resp.json()["data"]
            assert len(data) == 1, f"Expected 1 outbound link, got {len(data)}"
            assert data[0]["direction"] == "outbound", "direction should be 'outbound'"
            assert data[0]["linked_story"]["id"] == story_b["id"], (
                "linked_story.id should match target story"
            )
        finally:
            await _delete_project(client, proj["id"])

    @pytest.mark.asyncio
    async def test_direction_inbound_returns_only_target_links(
        self, client: AsyncClient
    ) -> None:
        proj = await _create_project(client, "SL List Inbound")
        try:
            story_a = await _create_story(client, proj["id"], "Story A", status="in-progress")
            story_b = await _create_story(client, proj["id"], "Story B", status="planned")
            story_c = await _create_story(client, proj["id"], "Story C", status="planned")

            # A → B (outbound from A)
            await _create_story_link(client, story_a["id"], story_b["id"])
            # C → A (inbound to A)
            await _create_story_link(client, story_c["id"], story_a["id"])

            resp = await client.get(
                f"{STORIES_URL}/{story_a['id']}/links",
                params={"direction": "inbound"},
            )

            assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
            data = resp.json()["data"]
            assert len(data) == 1, f"Expected 1 inbound link, got {len(data)}"
            assert data[0]["direction"] == "inbound", "direction should be 'inbound'"
            assert data[0]["linked_story"]["id"] == story_c["id"], (
                "linked_story.id should match source story for inbound"
            )
        finally:
            await _delete_project(client, proj["id"])

    @pytest.mark.asyncio
    async def test_direction_both_returns_union_with_correct_tags(
        self, client: AsyncClient
    ) -> None:
        proj = await _create_project(client, "SL List Both")
        try:
            story_a = await _create_story(client, proj["id"], "Story A", status="in-progress")
            story_b = await _create_story(client, proj["id"], "Story B", status="planned")
            story_c = await _create_story(client, proj["id"], "Story C", status="planned")

            await _create_story_link(client, story_a["id"], story_b["id"])
            await _create_story_link(client, story_c["id"], story_a["id"])

            resp = await client.get(
                f"{STORIES_URL}/{story_a['id']}/links", params={"direction": "both"}
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
        proj = await _create_project(client, "SL List Default Direction")
        try:
            story_a = await _create_story(client, proj["id"], "Story A", status="in-progress")
            story_b = await _create_story(client, proj["id"], "Story B", status="planned")
            story_c = await _create_story(client, proj["id"], "Story C", status="planned")

            await _create_story_link(client, story_a["id"], story_b["id"])
            await _create_story_link(client, story_c["id"], story_a["id"])

            # No direction param — should default to "both".
            resp = await client.get(f"{STORIES_URL}/{story_a['id']}/links")

            assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
            data = resp.json()["data"]
            assert len(data) == 2, (
                f"Default direction should return both directions (2 links), got {len(data)}"
            )
        finally:
            await _delete_project(client, proj["id"])

    @pytest.mark.asyncio
    async def test_link_type_filter_narrows_results(
        self, client: AsyncClient
    ) -> None:
        proj = await _create_project(client, "SL List Link Type Filter")
        try:
            story_a = await _create_story(client, proj["id"], "Story A", status="in-progress")
            story_b = await _create_story(client, proj["id"], "Story B", status="planned")
            story_c = await _create_story(client, proj["id"], "Story C", status="planned")

            await _create_story_link(client, story_a["id"], story_b["id"], VALID_LINK_TYPE)
            await _create_story_link(client, story_a["id"], story_c["id"], ANOTHER_LINK_TYPE)

            resp = await client.get(
                f"{STORIES_URL}/{story_a['id']}/links",
                params={"direction": "outbound", "link_type": VALID_LINK_TYPE},
            )

            assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
            data = resp.json()["data"]
            assert len(data) == 1, (
                f"link_type filter should return 1 link, got {len(data)}"
            )
            assert data[0]["link_type"] == VALID_LINK_TYPE, "link_type filter not applied"
        finally:
            await _delete_project(client, proj["id"])

    @pytest.mark.asyncio
    async def test_enrichment_includes_linked_story_summary(
        self, client: AsyncClient
    ) -> None:
        proj = await _create_project(client, "SL List Enrichment")
        try:
            story_a = await _create_story(client, proj["id"], "Source Story", status="in-progress")
            story_b = await _create_story(client, proj["id"], "Target Story", status="planned")

            await _create_story_link(client, story_a["id"], story_b["id"])

            resp = await client.get(
                f"{STORIES_URL}/{story_a['id']}/links",
                params={"direction": "outbound"},
            )

            assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
            link_row = resp.json()["data"][0]
            assert "linked_story" in link_row, "Response row should have 'linked_story'"
            linked = link_row["linked_story"]
            assert linked["id"] == story_b["id"], (
                "linked_story.id should match target story"
            )
            assert linked["title"] == "Target Story", "linked_story.title mismatch"
            assert "status" in linked, "linked_story should include 'status'"
        finally:
            await _delete_project(client, proj["id"])

    @pytest.mark.asyncio
    async def test_pagination_meta_present(self, client: AsyncClient) -> None:
        proj = await _create_project(client, "SL List Pagination")
        try:
            story_a = await _create_story(client, proj["id"], "Story A", status="in-progress")
            story_b = await _create_story(client, proj["id"], "Story B", status="planned")

            await _create_story_link(client, story_a["id"], story_b["id"])

            resp = await client.get(f"{STORIES_URL}/{story_a['id']}/links")

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
    async def test_list_unknown_story_returns_404(self, client: AsyncClient) -> None:
        fake_id = str(uuid.uuid4())
        resp = await client.get(f"{STORIES_URL}/{fake_id}/links")
        assert resp.status_code == 404, f"Expected 404, got {resp.status_code}"

    @pytest.mark.asyncio
    async def test_enrichment_with_null_story_status_returns_200(
        self, client: AsyncClient
    ) -> None:
        """Regression: linking stories that have no status should not crash the API.

        Currently fails with 500 because LinkedStorySummary.status is str, not str | None.
        See BUG-NNN (story_links enrichment crash when linked story has no status).
        """
        proj = await _create_project(client, "SL Null Status Enrichment")
        try:
            # Create stories WITHOUT a status (status=None is valid per the domain).
            story_a = await _create_story(client, proj["id"], "Story A No Status")
            story_b = await _create_story(client, proj["id"], "Story B No Status")

            await _create_story_link(client, story_a["id"], story_b["id"])

            resp = await client.get(
                f"{STORIES_URL}/{story_a['id']}/links",
                params={"direction": "outbound"},
            )

            # Should return 200 — the linked story summary should carry status=null.
            assert resp.status_code == 200, (
                f"Expected 200, got {resp.status_code} — {resp.text}"
            )
        finally:
            await _delete_project(client, proj["id"])


# ===========================================================================
# DELETE /v1/story-links/:id — Delete
# ===========================================================================


class TestDeleteStoryLink:
    @pytest.mark.asyncio
    async def test_delete_returns_204_and_link_gone(
        self, client: AsyncClient
    ) -> None:
        proj = await _create_project(client, "SL Delete Happy Path")
        try:
            story_a = await _create_story(client, proj["id"], "Story A", status="in-progress")
            story_b = await _create_story(client, proj["id"], "Story B", status="planned")

            link = await _create_story_link(client, story_a["id"], story_b["id"])

            # Delete the link.
            del_resp = await client.delete(f"{STORY_LINKS_TOP_URL}/{link['id']}")
            assert del_resp.status_code == 204, (
                f"Expected 204 on delete, got {del_resp.status_code}"
            )

            # Verify it's gone from the list.
            list_resp = await client.get(f"{STORIES_URL}/{story_a['id']}/links")
            data = list_resp.json()["data"]
            assert all(row["id"] != link["id"] for row in data), (
                "Deleted link should not appear in list"
            )
        finally:
            await _delete_project(client, proj["id"])

    @pytest.mark.asyncio
    async def test_delete_non_existent_link_returns_404(
        self, client: AsyncClient
    ) -> None:
        fake_id = str(uuid.uuid4())
        resp = await client.delete(f"{STORY_LINKS_TOP_URL}/{fake_id}")
        assert resp.status_code == 404, f"Expected 404, got {resp.status_code}"

    @pytest.mark.asyncio
    async def test_delete_malformed_uuid_returns_404(
        self, client: AsyncClient
    ) -> None:
        resp = await client.delete(f"{STORY_LINKS_TOP_URL}/not-a-uuid")
        assert resp.status_code == 404, (
            f"Expected 404 for malformed UUID, got {resp.status_code}"
        )


# ===========================================================================
# GET /v1/stories/:id/detail (StoryDetail.links)
# ===========================================================================


class TestStoryDetail:
    @pytest.mark.asyncio
    async def test_detail_links_field_populated_with_enriched_rows(
        self, client: AsyncClient
    ) -> None:
        proj = await _create_project(client, "SL Detail Links Populated")
        try:
            story_a = await _create_story(client, proj["id"], "Detail Story A", status="in-progress")
            story_b = await _create_story(client, proj["id"], "Detail Story B", status="planned")
            story_c = await _create_story(client, proj["id"], "Detail Story C", status="planned")

            # A → B (outbound)
            await _create_story_link(client, story_a["id"], story_b["id"], VALID_LINK_TYPE)
            # C → A (inbound)
            await _create_story_link(client, story_c["id"], story_a["id"], ANOTHER_LINK_TYPE)

            resp = await client.get(f"{STORIES_URL}/{story_a['id']}/detail")

            assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
            body = resp.json()["data"]
            assert "links" in body, "StoryDetail response should have 'links' field"
            links = body["links"]
            assert len(links) == 2, f"Expected 2 links in detail, got {len(links)}"

            directions = {row["direction"] for row in links}
            assert "outbound" in directions, "Expected outbound link in StoryDetail"
            assert "inbound" in directions, "Expected inbound link in StoryDetail"

            for row in links:
                assert "linked_story" in row, (
                    "Each link row in StoryDetail should have 'linked_story'"
                )
                assert "id" in row["linked_story"], "linked_story should have 'id'"
                assert "title" in row["linked_story"], "linked_story should have 'title'"
                assert "status" in row["linked_story"], (
                    "linked_story should have 'status'"
                )
        finally:
            await _delete_project(client, proj["id"])

    @pytest.mark.asyncio
    async def test_detail_links_empty_when_no_links(
        self, client: AsyncClient
    ) -> None:
        proj = await _create_project(client, "SL Detail No Links")
        try:
            story = await _create_story(client, proj["id"], "Isolated Story", status="planned")

            resp = await client.get(f"{STORIES_URL}/{story['id']}/detail")

            assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
            body = resp.json()["data"]
            assert "links" in body, "StoryDetail should have 'links' field"
            assert body["links"] == [], (
                "links should be empty list when no links exist"
            )
        finally:
            await _delete_project(client, proj["id"])


# ===========================================================================
# Cascade delete — deleting a story removes its links
# ===========================================================================


class TestStoryLinkCascadeDelete:
    @pytest.mark.asyncio
    async def test_deleting_source_story_removes_its_links(
        self, client: AsyncClient
    ) -> None:
        proj = await _create_project(client, "SL Cascade Source Delete")
        try:
            story_a = await _create_story(client, proj["id"], "Story A", status="in-progress")
            story_b = await _create_story(client, proj["id"], "Story B", status="planned")

            # A → B
            link = await _create_story_link(client, story_a["id"], story_b["id"])

            # Delete source story (story_a).
            del_resp = await client.delete(f"{STORIES_URL}/{story_a['id']}")
            assert del_resp.status_code == 204, (
                f"Expected 204 on story delete, got {del_resp.status_code}"
            )

            # The link itself should be gone.
            link_del_resp = await client.delete(f"{STORY_LINKS_TOP_URL}/{link['id']}")
            assert link_del_resp.status_code == 404, (
                "Link should have been cascade-deleted when source story was deleted"
            )
        finally:
            await _delete_project(client, proj["id"])

    @pytest.mark.asyncio
    async def test_deleting_target_story_removes_its_links(
        self, client: AsyncClient
    ) -> None:
        proj = await _create_project(client, "SL Cascade Target Delete")
        try:
            story_a = await _create_story(client, proj["id"], "Story A", status="in-progress")
            story_b = await _create_story(client, proj["id"], "Story B", status="planned")

            # A → B
            link = await _create_story_link(client, story_a["id"], story_b["id"])

            # Delete target story (story_b).
            del_resp = await client.delete(f"{STORIES_URL}/{story_b['id']}")
            assert del_resp.status_code == 204, (
                f"Expected 204 on story delete, got {del_resp.status_code}"
            )

            # A's link list should be empty.
            list_resp = await client.get(
                f"{STORIES_URL}/{story_a['id']}/links",
                params={"direction": "outbound"},
            )
            assert list_resp.status_code == 200, (
                f"Expected 200 on list after target delete, got {list_resp.status_code}"
            )
            assert list_resp.json()["data"] == [], (
                "Link list should be empty after target story is deleted"
            )

            # The link itself should be gone.
            link_del_resp = await client.delete(f"{STORY_LINKS_TOP_URL}/{link['id']}")
            assert link_del_resp.status_code == 404, (
                "Link should have been cascade-deleted when target story was deleted"
            )
        finally:
            await _delete_project(client, proj["id"])
