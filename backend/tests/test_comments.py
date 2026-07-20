"""Integration tests for the Comments domain — STORY-008.

Coverage zones (per TASK-011):

- POST .../comments (story/task/milestone) — happy path; empty content (422); content
  over 50,000 chars (422); missing/empty author_role (422); non-existent container (404)
- POST with in_reply_to — valid same-container reply persists `ancestors`
  (`parent.ancestors + [parent.id]`); non-existent in_reply_to (404); in_reply_to in a
  different container (422)
- GET  .../comments (list) — newest-first order (TASK-012 revision); pagination;
  label_key filter; label_value filter; a label key no comment has -> empty list, not
  an error
- GET  .../comments?after_id=... watermark — only comments after the referenced one;
  a deleted-watermark id -> 404
- GET  .../comments?descendant_of=... — the sub-thread beneath a comment
- GET  /comments/:id — get one
- GET  /comments/:id/ancestors — ordered root-first ancestor bodies; empty for a
  top-level comment; degrades gracefully (skips stale ids) when an ancestor was deleted
- PUT  /comments/:id — content-only leaves labels unchanged; labels-only leaves content
  unchanged; empty labels array clears labels; author_role/ancestors changes are ignored
- DELETE /comments/:id — deletes a single comment (no cascade to its replies);
  cascade: deleting a story/task/milestone removes all its comments
- Detail composition: story/task/milestone detail return comments newest-first
  (TASK-012 revision)
- REST <-> MCP parity for create, list, get, get_ancestors, update, delete
- default_web_ui_role validation is covered in test_settings.py::TestDefaultWebUiRole
  (STORY-008/TASK-005) — not duplicated here.

Notes:
- Every test creates its own data; no test depends on execution order.
- "operator" (the STORY-008 participant_roles addition) is used as a representative
  author_role value throughout, but author_role is never dictionary-validated —
  arbitrary strings are used too, to assert that explicitly.
"""
from __future__ import annotations

import uuid

import pytest
from fastmcp import Client
from fastmcp.exceptions import ToolError
from httpx import AsyncClient

from app.mcp.server import mcp_server_v1

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

PROJECTS_URL = "/v1/projects/"
STORIES_URL = "/v1/stories"
TASKS_URL = "/v1/tasks"
MILESTONES_URL = "/v1/milestones"
COMMENTS_URL = "/v1/comments"

CONTAINER_URL_SEGMENT = {"story": "stories", "task": "tasks", "milestone": "milestones"}

CONTENT_MAX_LENGTH = 50000
FAKE_UUID = "00000000-0000-0000-0000-000000000000"

ALL_CONTAINER_TYPES = ["story", "task", "milestone"]


# ---------------------------------------------------------------------------
# Helpers — container setup
# ---------------------------------------------------------------------------


async def _create_story(client: AsyncClient, project_id: str, title: str = "Comment Story") -> dict:
    resp = await client.post(STORIES_URL, json={"project_id": project_id, "title": title})
    assert resp.status_code == 201, (
        f"Helper _create_story: expected 201, got {resp.status_code} — {resp.text}"
    )
    return resp.json()["data"]


async def _create_task(client: AsyncClient, story_id: str, title: str = "Comment Task") -> dict:
    payload = {"title": title, "type": "task", "status": "todo"}
    resp = await client.post(f"{STORIES_URL}/{story_id}/tasks", json=payload)
    assert resp.status_code == 201, (
        f"Helper _create_task: expected 201, got {resp.status_code} — {resp.text}"
    )
    return resp.json()["data"]


async def _create_milestone(client: AsyncClient, project_id: str, name: str = "Comment Milestone") -> dict:
    resp = await client.post(MILESTONES_URL, json={"name": name, "project_id": project_id})
    assert resp.status_code == 201, (
        f"Helper _create_milestone: expected 201, got {resp.status_code} — {resp.text}"
    )
    return resp.json()["data"]


async def _create_container(client: AsyncClient, container_type: str, project_id: str) -> str:
    """Create a fresh story/task/milestone and return its id."""
    if container_type == "story":
        story = await _create_story(client, project_id)
        return story["id"]
    if container_type == "task":
        story = await _create_story(client, project_id, "Parent Story For Task Comment")
        task = await _create_task(client, story["id"])
        return task["id"]
    if container_type == "milestone":
        milestone = await _create_milestone(client, project_id)
        return milestone["id"]
    raise ValueError(f"Unknown container_type: {container_type}")


def _comments_url(container_type: str, container_id: str) -> str:
    segment = CONTAINER_URL_SEGMENT[container_type]
    return f"/v1/{segment}/{container_id}/comments"


def _detail_url(container_type: str, container_id: str) -> str:
    segment = CONTAINER_URL_SEGMENT[container_type]
    return f"/v1/{segment}/{container_id}/detail"


async def _create_comment(
    client: AsyncClient,
    container_url: str,
    *,
    content: str = "A comment",
    author_role: str = "operator",
    labels: list[dict] | None = None,
    in_reply_to: str | None = None,
):
    payload: dict = {"content": content, "author_role": author_role}
    if labels is not None:
        payload["labels"] = labels
    if in_reply_to is not None:
        payload["in_reply_to"] = in_reply_to
    return await client.post(container_url, json=payload)


async def _mcp_call(tool_name: str, args: dict):
    async with Client(mcp_server_v1) as mcp_client:
        return await mcp_client.call_tool(tool_name, args)


# ===========================================================================
# POST .../comments — create, happy path + validation, all three containers
# ===========================================================================


@pytest.mark.parametrize("container_type", ALL_CONTAINER_TYPES)
async def test_create_comment_happy_path(
    client: AsyncClient, create_project, container_type: str
) -> None:
    project_id = create_project(f"Create Comment {container_type}")
    container_id = await _create_container(client, container_type, project_id)

    resp = await _create_comment(
        client,
        _comments_url(container_type, container_id),
        content="Looks good to me.",
        author_role="architect",
        labels=[{"key": "decision", "value": "approved"}],
    )
    assert resp.status_code == 201, f"Expected 201, got {resp.status_code} — {resp.text}"
    data = resp.json()["data"]
    assert data["content"] == "Looks good to me.", f"content mismatch: {data}"
    assert data["author_role"] == "architect", f"author_role mismatch: {data}"
    assert data["labels"] == [{"key": "decision", "value": "approved"}], f"labels mismatch: {data}"
    assert data["container_type"] == container_type, f"container_type mismatch: {data}"
    assert data["container_id"] == container_id, f"container_id mismatch: {data}"
    assert data["ancestors"] == [], f"Top-level comment ancestors should be empty, got {data['ancestors']}"
    assert "id" in data and "created_at" in data and "updated_at" in data


@pytest.mark.parametrize("container_type", ALL_CONTAINER_TYPES)
async def test_create_comment_empty_content_rejected(
    client: AsyncClient, create_project, container_type: str
) -> None:
    project_id = create_project(f"Empty Content {container_type}")
    container_id = await _create_container(client, container_type, project_id)

    resp = await _create_comment(client, _comments_url(container_type, container_id), content="")
    assert resp.status_code == 422, f"Expected 422, got {resp.status_code} — {resp.text}"
    body = resp.json()
    messages = " ".join(item.get("msg", "") for item in body.get("detail", []))
    assert "Comment content is required." in messages, f"Expected verbatim message, got: {body}"


@pytest.mark.parametrize("container_type", ALL_CONTAINER_TYPES)
async def test_create_comment_content_too_long_rejected(
    client: AsyncClient, create_project, container_type: str
) -> None:
    project_id = create_project(f"Too Long Content {container_type}")
    container_id = await _create_container(client, container_type, project_id)

    resp = await _create_comment(
        client,
        _comments_url(container_type, container_id),
        content="x" * (CONTENT_MAX_LENGTH + 1),
    )
    assert resp.status_code == 422, f"Expected 422, got {resp.status_code} — {resp.text}"


async def test_create_comment_content_exactly_max_length_accepted(
    client: AsyncClient, create_project
) -> None:
    project_id = create_project("Exactly Max Length Content")
    story = await _create_story(client, project_id)
    resp = await _create_comment(
        client, _comments_url("story", story["id"]), content="x" * CONTENT_MAX_LENGTH
    )
    assert resp.status_code == 201, (
        f"Content exactly at the max length should be accepted, got {resp.status_code} — {resp.text}"
    )


@pytest.mark.parametrize("container_type", ALL_CONTAINER_TYPES)
async def test_create_comment_missing_author_role_rejected(
    client: AsyncClient, create_project, container_type: str
) -> None:
    project_id = create_project(f"Missing Author {container_type}")
    container_id = await _create_container(client, container_type, project_id)

    resp = await client.post(
        _comments_url(container_type, container_id), json={"content": "Hello"}
    )
    assert resp.status_code == 422, f"Expected 422, got {resp.status_code} — {resp.text}"


@pytest.mark.parametrize("container_type", ALL_CONTAINER_TYPES)
async def test_create_comment_empty_author_role_rejected(
    client: AsyncClient, create_project, container_type: str
) -> None:
    project_id = create_project(f"Empty Author {container_type}")
    container_id = await _create_container(client, container_type, project_id)

    resp = await _create_comment(
        client, _comments_url(container_type, container_id), content="Hello", author_role=""
    )
    assert resp.status_code == 422, f"Expected 422, got {resp.status_code} — {resp.text}"
    body = resp.json()
    messages = " ".join(item.get("msg", "") for item in body.get("detail", []))
    assert "Comment author is required." in messages, f"Expected verbatim message, got: {body}"


@pytest.mark.parametrize("container_type", ALL_CONTAINER_TYPES)
async def test_create_comment_nonexistent_container_returns_404(
    client: AsyncClient, container_type: str
) -> None:
    resp = await _create_comment(client, _comments_url(container_type, FAKE_UUID))
    assert resp.status_code == 404, f"Expected 404, got {resp.status_code} — {resp.text}"
    body = resp.json()
    assert body.get("code") == "NOT_FOUND", f"Expected NOT_FOUND, got {body.get('code')}"


async def test_create_comment_author_role_is_free_form_not_dictionary_validated(
    client: AsyncClient, create_project
) -> None:
    project_id = create_project("Free Form Author Role")
    story = await _create_story(client, project_id)
    resp = await _create_comment(
        client,
        _comments_url("story", story["id"]),
        author_role="some-arbitrary-role-not-in-any-dictionary",
    )
    assert resp.status_code == 201, (
        f"author_role should never be dictionary-validated, got {resp.status_code} — {resp.text}"
    )


async def test_create_comment_labels_are_free_form_not_dictionary_validated(
    client: AsyncClient, create_project
) -> None:
    project_id = create_project("Free Form Labels")
    story = await _create_story(client, project_id)
    resp = await _create_comment(
        client,
        _comments_url("story", story["id"]),
        labels=[{"key": "totally-made-up-key", "value": "totally-made-up-value"}],
    )
    assert resp.status_code == 201, (
        f"labels should never be dictionary-validated, got {resp.status_code} — {resp.text}"
    )


# ===========================================================================
# POST .../comments — in_reply_to / ancestors derivation
# ===========================================================================


async def test_create_reply_persists_ancestors_from_parent(
    client: AsyncClient, create_project
) -> None:
    project_id = create_project("Reply Ancestors")
    story = await _create_story(client, project_id)
    url = _comments_url("story", story["id"])

    root_resp = await _create_comment(client, url, content="Root comment")
    root = root_resp.json()["data"]

    reply_resp = await _create_comment(
        client, url, content="A reply", in_reply_to=root["id"]
    )
    assert reply_resp.status_code == 201, f"Expected 201, got {reply_resp.status_code} — {reply_resp.text}"
    reply = reply_resp.json()["data"]
    assert reply["ancestors"] == [root["id"]], (
        f"Reply ancestors should be [root.id], got {reply['ancestors']}"
    )
    assert reply["content"] == "A reply", (
        "content should be stored exactly as submitted, with no server-side prefix"
    )


async def test_create_reply_to_reply_accumulates_ancestors(
    client: AsyncClient, create_project
) -> None:
    project_id = create_project("Nested Reply Ancestors")
    story = await _create_story(client, project_id)
    url = _comments_url("story", story["id"])

    root = (await _create_comment(client, url, content="Root")).json()["data"]
    reply1 = (
        await _create_comment(client, url, content="Reply 1", in_reply_to=root["id"])
    ).json()["data"]
    reply2 = (
        await _create_comment(client, url, content="Reply to reply 1", in_reply_to=reply1["id"])
    ).json()["data"]

    assert reply2["ancestors"] == [root["id"], reply1["id"]], (
        f"ancestors should be root-first: [root, reply1], got {reply2['ancestors']}"
    )


async def test_multiple_replies_to_same_comment_are_flat(
    client: AsyncClient, create_project
) -> None:
    project_id = create_project("Multiple Replies Flat")
    story = await _create_story(client, project_id)
    url = _comments_url("story", story["id"])

    root = (await _create_comment(client, url, content="Root")).json()["data"]
    reply_a = (
        await _create_comment(client, url, content="Reply A", in_reply_to=root["id"])
    ).json()["data"]
    reply_b = (
        await _create_comment(client, url, content="Reply B", in_reply_to=root["id"])
    ).json()["data"]

    assert reply_a["ancestors"] == [root["id"]] == reply_b["ancestors"], (
        "Both independent replies to the same root should carry identical, flat ancestors"
    )

    list_resp = await client.get(url)
    ids = [c["id"] for c in list_resp.json()["data"]]
    assert ids == [reply_b["id"], reply_a["id"], root["id"]], (
        f"Thread should stay a flat newest-first list, got {ids}"
    )


async def test_create_reply_nonexistent_in_reply_to_returns_404(
    client: AsyncClient, create_project
) -> None:
    project_id = create_project("Reply Not Found")
    story = await _create_story(client, project_id)
    resp = await _create_comment(
        client, _comments_url("story", story["id"]), in_reply_to=FAKE_UUID
    )
    assert resp.status_code == 404, f"Expected 404, got {resp.status_code} — {resp.text}"


async def test_create_reply_different_container_returns_422(
    client: AsyncClient, create_project
) -> None:
    project_id = create_project("Reply Different Container")
    story_a = await _create_story(client, project_id, "Story A")
    story_b = await _create_story(client, project_id, "Story B")

    root = (
        await _create_comment(client, _comments_url("story", story_a["id"]), content="Root on A")
    ).json()["data"]

    resp = await _create_comment(
        client, _comments_url("story", story_b["id"]), in_reply_to=root["id"]
    )
    assert resp.status_code == 422, f"Expected 422, got {resp.status_code} — {resp.text}"
    body = resp.json()
    assert "same story, task, or milestone" in body.get("error", ""), (
        f"Expected the same-container message, got: {body}"
    )


async def test_reply_to_deleted_target_ancestors_dangles(
    client: AsyncClient, create_project
) -> None:
    project_id = create_project("Reply To Deleted Target")
    story = await _create_story(client, project_id)
    url = _comments_url("story", story["id"])

    root = (await _create_comment(client, url, content="Root")).json()["data"]
    reply = (
        await _create_comment(client, url, content="Reply", in_reply_to=root["id"])
    ).json()["data"]

    delete_resp = await client.delete(f"{COMMENTS_URL}/{root['id']}")
    assert delete_resp.status_code == 204, (
        f"Deleting a comment referenced by a reply's ancestors should still succeed, "
        f"got {delete_resp.status_code}"
    )

    # The reply itself survives — delete does not cascade to its children.
    get_reply_resp = await client.get(f"{COMMENTS_URL}/{reply['id']}")
    assert get_reply_resp.status_code == 200, (
        f"The reply should survive its ancestor's deletion, got {get_reply_resp.status_code}"
    )
    assert get_reply_resp.json()["data"]["ancestors"] == [root["id"]], (
        "The stale ancestor id should linger harmlessly in the reply's ancestors list"
    )

    # Readers degrade gracefully: the ancestor endpoint silently skips the missing row.
    ancestors_resp = await client.get(f"{COMMENTS_URL}/{reply['id']}/ancestors")
    assert ancestors_resp.status_code == 200, f"Expected 200, got {ancestors_resp.status_code}"
    assert ancestors_resp.json() == [], (
        f"Ancestor traversal should silently skip a deleted ancestor, got {ancestors_resp.json()}"
    )


# ===========================================================================
# GET .../comments — list: ordering, pagination, label filters
# ===========================================================================


async def test_list_comments_newest_first_order(
    client: AsyncClient, create_project
) -> None:
    project_id = create_project("List Newest First")
    story = await _create_story(client, project_id)
    url = _comments_url("story", story["id"])

    c1 = (await _create_comment(client, url, content="First")).json()["data"]
    c2 = (await _create_comment(client, url, content="Second")).json()["data"]
    c3 = (await _create_comment(client, url, content="Third")).json()["data"]

    resp = await client.get(url)
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
    ids = [c["id"] for c in resp.json()["data"]]
    assert ids == [c3["id"], c2["id"], c1["id"]], f"Expected newest-first order, got {ids}"


async def test_list_comments_pagination(client: AsyncClient, create_project) -> None:
    project_id = create_project("List Pagination")
    story = await _create_story(client, project_id)
    url = _comments_url("story", story["id"])

    created = [
        (await _create_comment(client, url, content=f"Comment {i}")).json()["data"]
        for i in range(3)
    ]

    # Newest-first: page 1 holds the two most recently created comments (index 2, then 1);
    # pagination proceeds toward the oldest, so page 2 holds the oldest comment (index 0).
    page1 = await client.get(url, params={"page": 1, "limit": 2})
    page1_data = page1.json()
    assert [c["id"] for c in page1_data["data"]] == [created[2]["id"], created[1]["id"]], (
        f"Page 1 mismatch: {page1_data['data']}"
    )
    assert page1_data["meta"]["total"] == 3, f"Expected total=3, got {page1_data['meta']}"
    assert page1_data["meta"]["totalPages"] == 2, f"Expected totalPages=2, got {page1_data['meta']}"

    page2 = await client.get(url, params={"page": 2, "limit": 2})
    page2_data = page2.json()
    assert [c["id"] for c in page2_data["data"]] == [created[0]["id"]], (
        f"Page 2 mismatch: {page2_data['data']}"
    )


async def test_list_comments_label_key_filter(client: AsyncClient, create_project) -> None:
    project_id = create_project("Label Key Filter")
    story = await _create_story(client, project_id)
    url = _comments_url("story", story["id"])

    match = (
        await _create_comment(
            client, url, content="Decision comment", labels=[{"key": "decision", "value": "yes"}]
        )
    ).json()["data"]
    await _create_comment(
        client, url, content="Other comment", labels=[{"key": "blocker", "value": "no"}]
    )

    resp = await client.get(url, params={"label_key": "decision"})
    ids = [c["id"] for c in resp.json()["data"]]
    assert ids == [match["id"]], f"Expected only the matching comment, got {ids}"


async def test_list_comments_label_value_filter(client: AsyncClient, create_project) -> None:
    project_id = create_project("Label Value Filter")
    story = await _create_story(client, project_id)
    url = _comments_url("story", story["id"])

    match = (
        await _create_comment(
            client, url, content="Yes comment", labels=[{"key": "decision", "value": "yes"}]
        )
    ).json()["data"]
    await _create_comment(
        client, url, content="No comment", labels=[{"key": "decision", "value": "no"}]
    )

    resp = await client.get(url, params={"label_value": "yes"})
    ids = [c["id"] for c in resp.json()["data"]]
    assert ids == [match["id"]], f"Expected only the matching comment, got {ids}"


async def test_list_comments_label_key_no_match_returns_empty_list(
    client: AsyncClient, create_project
) -> None:
    project_id = create_project("Label Key No Match")
    story = await _create_story(client, project_id)
    url = _comments_url("story", story["id"])
    await _create_comment(client, url, content="Untagged comment")

    resp = await client.get(url, params={"label_key": "no-such-key"})
    assert resp.status_code == 200, (
        f"A label key with no matches should be an empty list, not an error, got {resp.status_code}"
    )
    assert resp.json()["data"] == [], f"Expected empty list, got {resp.json()['data']}"


# ===========================================================================
# GET .../comments?after_id — watermark
# ===========================================================================


async def test_list_comments_after_id_watermark(client: AsyncClient, create_project) -> None:
    project_id = create_project("After Id Watermark")
    story = await _create_story(client, project_id)
    url = _comments_url("story", story["id"])

    c1 = (await _create_comment(client, url, content="First")).json()["data"]
    c2 = (await _create_comment(client, url, content="Second")).json()["data"]
    c3 = (await _create_comment(client, url, content="Third")).json()["data"]

    # after_id keeps its "strictly newer than the referenced comment" meaning — only the
    # surrounding order flips to newest-first, so c3 (newest) now precedes c2.
    resp = await client.get(url, params={"after_id": c1["id"]})
    ids = [c["id"] for c in resp.json()["data"]]
    assert ids == [c3["id"], c2["id"]], f"Expected only comments after c1, newest-first, got {ids}"


async def test_list_comments_after_id_deleted_watermark_returns_404(
    client: AsyncClient, create_project
) -> None:
    project_id = create_project("After Id Deleted Watermark")
    story = await _create_story(client, project_id)
    url = _comments_url("story", story["id"])

    watermark = (await _create_comment(client, url, content="Watermark")).json()["data"]
    await client.delete(f"{COMMENTS_URL}/{watermark['id']}")

    resp = await client.get(url, params={"after_id": watermark["id"]})
    assert resp.status_code == 404, (
        f"A deleted watermark id should return 404, got {resp.status_code} — {resp.text}"
    )


# ===========================================================================
# GET .../comments?descendant_of — sub-thread filter
# ===========================================================================


async def test_list_comments_descendant_of_returns_subthread(
    client: AsyncClient, create_project
) -> None:
    project_id = create_project("Descendant Of Subthread")
    story = await _create_story(client, project_id)
    url = _comments_url("story", story["id"])

    root = (await _create_comment(client, url, content="Root")).json()["data"]
    reply1 = (
        await _create_comment(client, url, content="Reply 1", in_reply_to=root["id"])
    ).json()["data"]
    reply2 = (
        await _create_comment(client, url, content="Reply to reply 1", in_reply_to=reply1["id"])
    ).json()["data"]
    unrelated = (await _create_comment(client, url, content="Unrelated top-level")).json()["data"]

    resp = await client.get(url, params={"descendant_of": root["id"]})
    ids = [c["id"] for c in resp.json()["data"]]
    assert set(ids) == {reply1["id"], reply2["id"]}, (
        f"descendant_of should return the whole sub-thread beneath root, got {ids}"
    )
    assert unrelated["id"] not in ids, "Unrelated top-level comment should not be in the sub-thread"
    # Rides the same list query as the container list, so it is newest-first too.
    assert ids == [reply2["id"], reply1["id"]], (
        f"descendant_of should return the sub-thread newest-first, got {ids}"
    )


# ===========================================================================
# GET /comments/:id — get one
# ===========================================================================


async def test_get_comment_by_id(client: AsyncClient, create_project) -> None:
    project_id = create_project("Get Comment By Id")
    story = await _create_story(client, project_id)
    created = (
        await _create_comment(client, _comments_url("story", story["id"]), content="Fetch me")
    ).json()["data"]

    resp = await client.get(f"{COMMENTS_URL}/{created['id']}")
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
    assert resp.json()["data"]["id"] == created["id"], "id mismatch"


async def test_get_comment_not_found_returns_404(client: AsyncClient) -> None:
    resp = await client.get(f"{COMMENTS_URL}/{FAKE_UUID}")
    assert resp.status_code == 404, f"Expected 404, got {resp.status_code}"


# ===========================================================================
# GET /comments/:id/ancestors
# ===========================================================================


async def test_get_ancestors_top_level_comment_is_empty(
    client: AsyncClient, create_project
) -> None:
    project_id = create_project("Ancestors Top Level Empty")
    story = await _create_story(client, project_id)
    created = (
        await _create_comment(client, _comments_url("story", story["id"]), content="Top level")
    ).json()["data"]

    resp = await client.get(f"{COMMENTS_URL}/{created['id']}/ancestors")
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
    assert resp.json() == [], f"Top-level comment ancestors should be empty, got {resp.json()}"


async def test_get_ancestors_ordered_root_first(client: AsyncClient, create_project) -> None:
    project_id = create_project("Ancestors Ordered Root First")
    story = await _create_story(client, project_id)
    url = _comments_url("story", story["id"])

    root = (await _create_comment(client, url, content="Root")).json()["data"]
    reply1 = (
        await _create_comment(client, url, content="Reply 1", in_reply_to=root["id"])
    ).json()["data"]
    reply2 = (
        await _create_comment(client, url, content="Reply to reply 1", in_reply_to=reply1["id"])
    ).json()["data"]

    resp = await client.get(f"{COMMENTS_URL}/{reply2['id']}/ancestors")
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
    ancestor_ids = [c["id"] for c in resp.json()]
    assert ancestor_ids == [root["id"], reply1["id"]], (
        f"Expected root-first ancestor order [root, reply1], got {ancestor_ids}"
    )


# ===========================================================================
# PUT /comments/:id — update
# ===========================================================================


async def test_update_content_only_leaves_labels_unchanged(
    client: AsyncClient, create_project
) -> None:
    project_id = create_project("Update Content Only")
    story = await _create_story(client, project_id)
    created = (
        await _create_comment(
            client,
            _comments_url("story", story["id"]),
            content="Original",
            labels=[{"key": "decision", "value": "yes"}],
        )
    ).json()["data"]

    resp = await client.put(
        f"{COMMENTS_URL}/{created['id']}", json={"content": "Updated content"}
    )
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code} — {resp.text}"
    data = resp.json()["data"]
    assert data["content"] == "Updated content", f"content mismatch: {data}"
    assert data["labels"] == [{"key": "decision", "value": "yes"}], (
        f"labels should be unchanged, got {data['labels']}"
    )


async def test_update_labels_only_leaves_content_unchanged(
    client: AsyncClient, create_project
) -> None:
    project_id = create_project("Update Labels Only")
    story = await _create_story(client, project_id)
    created = (
        await _create_comment(
            client, _comments_url("story", story["id"]), content="Original content"
        )
    ).json()["data"]

    resp = await client.put(
        f"{COMMENTS_URL}/{created['id']}",
        json={"labels": [{"key": "new-key", "value": "new-value"}]},
    )
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code} — {resp.text}"
    data = resp.json()["data"]
    assert data["content"] == "Original content", f"content should be unchanged, got {data['content']}"
    assert data["labels"] == [{"key": "new-key", "value": "new-value"}], f"labels mismatch: {data}"


async def test_update_empty_labels_array_clears_labels(
    client: AsyncClient, create_project
) -> None:
    project_id = create_project("Update Empty Labels Clears")
    story = await _create_story(client, project_id)
    created = (
        await _create_comment(
            client,
            _comments_url("story", story["id"]),
            labels=[{"key": "decision", "value": "yes"}],
        )
    ).json()["data"]

    resp = await client.put(f"{COMMENTS_URL}/{created['id']}", json={"labels": []})
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code} — {resp.text}"
    assert resp.json()["data"]["labels"] == [], (
        f"Empty labels array should clear all labels, got {resp.json()['data']['labels']}"
    )


async def test_update_attempt_to_change_author_role_is_ignored(
    client: AsyncClient, create_project
) -> None:
    project_id = create_project("Update Ignores Author Role")
    story = await _create_story(client, project_id)
    created = (
        await _create_comment(
            client, _comments_url("story", story["id"]), author_role="architect"
        )
    ).json()["data"]

    resp = await client.put(
        f"{COMMENTS_URL}/{created['id']}",
        json={"content": "New content", "author_role": "someone-else"},
    )
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code} — {resp.text}"
    assert resp.json()["data"]["author_role"] == "architect", (
        f"author_role should be immutable, got {resp.json()['data']['author_role']}"
    )


async def test_update_attempt_to_change_ancestors_is_ignored(
    client: AsyncClient, create_project
) -> None:
    project_id = create_project("Update Ignores Ancestors")
    story = await _create_story(client, project_id)
    url = _comments_url("story", story["id"])
    root = (await _create_comment(client, url, content="Root")).json()["data"]
    reply = (
        await _create_comment(client, url, content="Reply", in_reply_to=root["id"])
    ).json()["data"]

    resp = await client.put(
        f"{COMMENTS_URL}/{reply['id']}",
        json={"content": "Edited reply", "ancestors": []},
    )
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code} — {resp.text}"
    assert resp.json()["data"]["ancestors"] == [root["id"]], (
        f"ancestors should be immutable, got {resp.json()['data']['ancestors']}"
    )


async def test_update_nonexistent_comment_returns_404(client: AsyncClient) -> None:
    resp = await client.put(f"{COMMENTS_URL}/{FAKE_UUID}", json={"content": "Doesn't matter"})
    assert resp.status_code == 404, f"Expected 404, got {resp.status_code}"


async def test_update_empty_content_rejected(client: AsyncClient, create_project) -> None:
    project_id = create_project("Update Empty Content Rejected")
    story = await _create_story(client, project_id)
    created = (await _create_comment(client, _comments_url("story", story["id"]))).json()["data"]

    resp = await client.put(f"{COMMENTS_URL}/{created['id']}", json={"content": ""})
    assert resp.status_code == 422, f"Expected 422, got {resp.status_code} — {resp.text}"


# ===========================================================================
# DELETE /comments/:id
# ===========================================================================


async def test_delete_comment(client: AsyncClient, create_project) -> None:
    project_id = create_project("Delete Comment")
    story = await _create_story(client, project_id)
    created = (await _create_comment(client, _comments_url("story", story["id"]))).json()["data"]

    resp = await client.delete(f"{COMMENTS_URL}/{created['id']}")
    assert resp.status_code == 204, f"Expected 204, got {resp.status_code}"

    get_resp = await client.get(f"{COMMENTS_URL}/{created['id']}")
    assert get_resp.status_code == 404, (
        f"Comment should be gone after delete, got {get_resp.status_code}"
    )


async def test_delete_nonexistent_comment_returns_404(client: AsyncClient) -> None:
    resp = await client.delete(f"{COMMENTS_URL}/{FAKE_UUID}")
    assert resp.status_code == 404, f"Expected 404, got {resp.status_code}"


# ===========================================================================
# Cascade delete — deleting a container removes all its comments
# ===========================================================================


@pytest.mark.parametrize("container_type", ALL_CONTAINER_TYPES)
async def test_deleting_container_cascades_comment_removal(
    client: AsyncClient, create_project, container_type: str
) -> None:
    project_id = create_project(f"Cascade Delete {container_type}")
    container_id = await _create_container(client, container_type, project_id)
    url = _comments_url(container_type, container_id)

    comment_a = (await _create_comment(client, url, content="A")).json()["data"]
    comment_b = (await _create_comment(client, url, content="B")).json()["data"]

    delete_resp = await client.delete(f"/v1/{CONTAINER_URL_SEGMENT[container_type]}/{container_id}")
    assert delete_resp.status_code == 204, (
        f"Expected 204 deleting the {container_type}, got {delete_resp.status_code}"
    )

    for comment in (comment_a, comment_b):
        get_resp = await client.get(f"{COMMENTS_URL}/{comment['id']}")
        assert get_resp.status_code == 404, (
            f"Comment {comment['id']} should be cascade-deleted with its "
            f"{container_type}, got {get_resp.status_code}"
        )


# ===========================================================================
# Detail composition — story/task/milestone detail return comments newest-first
# ===========================================================================


@pytest.mark.parametrize("container_type", ALL_CONTAINER_TYPES)
async def test_detail_composition_returns_comments_newest_first(
    client: AsyncClient, create_project, container_type: str
) -> None:
    project_id = create_project(f"Detail Comments {container_type}")
    container_id = await _create_container(client, container_type, project_id)
    url = _comments_url(container_type, container_id)

    c1 = (await _create_comment(client, url, content="First")).json()["data"]
    c2 = (await _create_comment(client, url, content="Second")).json()["data"]

    resp = await client.get(_detail_url(container_type, container_id))
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code} — {resp.text}"
    detail = resp.json()["data"]
    ids = [c["id"] for c in detail["comments"]]
    assert ids == [c2["id"], c1["id"]], (
        f"Detail comments should be newest-first, got {ids}"
    )


# ===========================================================================
# REST <-> MCP parity
# ===========================================================================


async def test_mcp_create_comment_matches_rest(client: AsyncClient, create_project) -> None:
    project_id = create_project("MCP Create Parity")
    story = await _create_story(client, project_id)

    result = await _mcp_call(
        "create_comment",
        {
            "container_type": "story",
            "container_id": story["id"],
            "body": {"content": "MCP comment", "author_role": "backend-developer"},
        },
    )
    mcp_data = result.data["data"]
    assert mcp_data["content"] == "MCP comment", f"content mismatch: {mcp_data}"
    assert mcp_data["author_role"] == "backend-developer", f"author_role mismatch: {mcp_data}"

    rest_resp = await client.get(f"{COMMENTS_URL}/{mcp_data['id']}")
    assert rest_resp.status_code == 200, (
        "A comment created via MCP should be readable over REST"
    )
    assert rest_resp.json()["data"]["content"] == "MCP comment"


async def test_mcp_create_comment_missing_author_role_rejected(
    client: AsyncClient, create_project
) -> None:
    project_id = create_project("MCP Create Missing Author")
    story = await _create_story(client, project_id)

    with pytest.raises(ToolError):
        await _mcp_call(
            "create_comment",
            {
                "container_type": "story",
                "container_id": story["id"],
                "body": {"content": "No author"},
            },
        )


async def test_mcp_create_comment_nonexistent_container_returns_error(
    client: AsyncClient,
) -> None:
    with pytest.raises(ToolError):
        await _mcp_call(
            "create_comment",
            {
                "container_type": "story",
                "container_id": FAKE_UUID,
                "body": {"content": "Hi", "author_role": "operator"},
            },
        )


async def test_mcp_list_comments_matches_rest(client: AsyncClient, create_project) -> None:
    project_id = create_project("MCP List Parity")
    story = await _create_story(client, project_id)
    url = _comments_url("story", story["id"])
    await _create_comment(client, url, content="One")
    await _create_comment(client, url, content="Two")

    rest_resp = await client.get(url)
    rest_body = rest_resp.json()

    result = await _mcp_call(
        "list_comments", {"container_type": "story", "container_id": story["id"]}
    )
    mcp_body = result.data

    rest_ids = [c["id"] for c in rest_body["data"]]
    mcp_ids = [c["id"] for c in mcp_body["data"]]
    assert rest_ids == mcp_ids, f"REST/MCP list mismatch: REST={rest_ids} MCP={mcp_ids}"
    assert rest_body["meta"] == mcp_body["meta"], (
        f"REST/MCP pagination meta mismatch: REST={rest_body['meta']} MCP={mcp_body['meta']}"
    )


async def test_mcp_get_comment_matches_rest(client: AsyncClient, create_project) -> None:
    project_id = create_project("MCP Get Parity")
    story = await _create_story(client, project_id)
    created = (
        await _create_comment(client, _comments_url("story", story["id"]), content="Get me")
    ).json()["data"]

    result = await _mcp_call("get_comment", {"id": created["id"]})
    assert result.data["data"]["id"] == created["id"], "MCP get_comment id mismatch"
    assert result.data["data"]["content"] == "Get me", "MCP get_comment content mismatch"


async def test_mcp_get_comment_not_found_errors(client: AsyncClient) -> None:
    with pytest.raises(ToolError):
        await _mcp_call("get_comment", {"id": FAKE_UUID})


async def test_mcp_get_comment_ancestors_matches_rest(
    client: AsyncClient, create_project
) -> None:
    project_id = create_project("MCP Ancestors Parity")
    story = await _create_story(client, project_id)
    url = _comments_url("story", story["id"])
    root = (await _create_comment(client, url, content="Root")).json()["data"]
    reply = (
        await _create_comment(client, url, content="Reply", in_reply_to=root["id"])
    ).json()["data"]

    rest_resp = await client.get(f"{COMMENTS_URL}/{reply['id']}/ancestors")
    rest_ids = [c["id"] for c in rest_resp.json()]

    result = await _mcp_call("get_comment_ancestors", {"id": reply["id"]})
    mcp_ids = [c["id"] for c in result.data]

    assert rest_ids == mcp_ids == [root["id"]], (
        f"REST/MCP ancestors mismatch: REST={rest_ids} MCP={mcp_ids}"
    )


async def test_mcp_update_comment_matches_rest(client: AsyncClient, create_project) -> None:
    project_id = create_project("MCP Update Parity")
    story = await _create_story(client, project_id)
    created = (
        await _create_comment(client, _comments_url("story", story["id"]), content="Original")
    ).json()["data"]

    result = await _mcp_call(
        "update_comment", {"id": created["id"], "body": {"content": "Updated via MCP"}}
    )
    assert result.data["data"]["content"] == "Updated via MCP", "MCP update_comment mismatch"

    rest_resp = await client.get(f"{COMMENTS_URL}/{created['id']}")
    assert rest_resp.json()["data"]["content"] == "Updated via MCP", (
        "Update via MCP should be visible over REST too"
    )


async def test_mcp_update_comment_ignores_author_role(
    client: AsyncClient, create_project
) -> None:
    project_id = create_project("MCP Update Ignores Author Role")
    story = await _create_story(client, project_id)
    created = (
        await _create_comment(
            client, _comments_url("story", story["id"]), author_role="architect"
        )
    ).json()["data"]

    result = await _mcp_call(
        "update_comment",
        {"id": created["id"], "body": {"content": "Edited", "author_role": "hacker"}},
    )
    assert result.data["data"]["author_role"] == "architect", (
        f"author_role should stay immutable via MCP too, got {result.data['data']['author_role']}"
    )


async def test_mcp_delete_comment_matches_rest(client: AsyncClient, create_project) -> None:
    project_id = create_project("MCP Delete Parity")
    story = await _create_story(client, project_id)
    created = (await _create_comment(client, _comments_url("story", story["id"]))).json()["data"]

    result = await _mcp_call("delete_comment", {"id": created["id"]})
    assert result.data["success"] is True, f"Expected success=True, got {result.data}"

    rest_resp = await client.get(f"{COMMENTS_URL}/{created['id']}")
    assert rest_resp.status_code == 404, (
        "Comment deleted via MCP should be gone over REST too"
    )


async def test_mcp_delete_comment_not_found_errors(client: AsyncClient) -> None:
    with pytest.raises(ToolError):
        await _mcp_call("delete_comment", {"id": FAKE_UUID})
