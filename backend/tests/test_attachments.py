"""Integration tests for the Attachments domain — STORY-007 (+ STORY-021 title field).

Coverage zones (per TASK-006, against api-contract v1.6 / STORY-021):

- POST .../attachments  document via JSON text (happy path, content downloadable)
                        document via multipart file (happy path)
                        image via multipart (happy path); unsupported MIME -> 400
                        file (binary) via multipart (happy path, e.g. a PDF);
                            unsupported MIME -> 400; no "any binary" fallthrough
                        external-ref via JSON (happy path); invalid URL -> 400
                        author_role optional on every create path
                        container not found -> 404; missing required fields for
                            the kind -> 422 (dictionary validation removed — `title`
                            is free-form on every create path, STORY-021)
                        file > 10 MB rejected (400), no file written; exactly 10 MB accepted
        (all three containers: story, task, milestone)
- `title` mandatory on every create path (JSON, multipart, MCP):
        missing / empty / whitespace-only -> 422 with a field-level error
        two attachments on the same container may share an identical title
- Multipart title default-from-filename behavior (STORY-021):
        title field absent from the form -> defaults to the uploaded file's name
        title field present-but-empty / whitespace-only -> 422 (not silently defaulted)
        a file name over 500 chars is truncated to fit; upload still succeeds
- MCP create via base64 image/file/document-as-file — same stored result as REST multipart;
  `title` is required with no default on every MCP create tool
- GET  .../attachments   pagination, kind filter; a stale `type` query param is ignored,
                         not an error, and does not affect results
- GET  /attachments/:id  found / not found (404); file_path never in the response;
                         response contains `title` and no `type`
- GET  /attachments/:id/file   document/image/file bytes + Content-Type = mime_type;
                               external-ref -> 400 with the specified message; not found -> 404
- MCP get_attachment_file      { mime_type, content_base64 } for document/image/file;
                               external-ref errors; not found errors
- No PUT /attachments/:id and no POST /attachments/:id/archive for any kind — title is
  immutable, exactly like every other attachment field (no update path at all)
- DELETE /attachments/:id      every kind hard-deleted (204); document/image/file also
                               removes the stored file; not found -> 404
- Cascade delete: deleting a story/task/milestone removes all its attachments + files
- Story/task detail return their attachments; milestone detail composes attachments with
  an empty comments array
- REST and MCP produce equivalent results (create, delete, list, get, get_attachment_file)

Notes:
- Every test creates its own data; no test depends on execution order.
- MIME type is a submitted form/JSON field, not sniffed from content — arbitrary bytes are
  used for image/file payloads (mirrors the service's own design: the multipart `mime_type`
  field is authoritative, not `UploadFile.content_type`).
- `attachment_types` no longer exists as a Settings dictionary key (see test_settings.py,
  TestAttachmentTypesRetired) — attachment creation never resolves or validates against any
  dictionary as of STORY-021.
- The retired `type` list-filter query param is verified separately in
  test_list_attachments_type_filter_param_is_ignored below; the MCP `list_attachments` tool
  never accepted `type` as an argument in the first place (strict RPC schema — passing an
  unrecognized kwarg raises a schema-level ToolError, unlike REST's tolerant query params),
  so only the REST behavior is asserted for the "ignored, not an error" contract.
"""
from __future__ import annotations

import base64
from pathlib import Path

import pytest
from fastmcp import Client
from fastmcp.exceptions import ToolError
from httpx import AsyncClient

from app.mcp.server import mcp_server_v1

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

PROJECTS_URL = "/v1/projects/"
PROJECTS_ID_URL = "/v1/projects"
STORIES_URL = "/v1/stories"
TASKS_URL = "/v1/tasks"
MILESTONES_URL = "/v1/milestones"
ATTACHMENTS_URL = "/v1/attachments"

CONTAINER_URL_SEGMENT = {"story": "stories", "task": "tasks", "milestone": "milestones"}

TITLE_DOCUMENT = "Report Document"
TITLE_IMAGE = "Screenshot"
TITLE_FILE = "Test Result PDF"
TITLE_EXTERNAL_REF = "External Spec Link"
TITLE_MAX_LENGTH = 500

DOCUMENT_TEXT = "# Report\n\nSome markdown content for the attachment."
IMAGE_BYTES = b"\x89PNG-fake-image-bytes-0123456789"
FILE_BYTES = b"%PDF-1.4 fake pdf bytes for a file attachment"
EXTERNAL_URL = "https://example.com/spec.pdf"

MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024


# ---------------------------------------------------------------------------
# Helpers — container setup
# ---------------------------------------------------------------------------


async def _create_story(client: AsyncClient, project_id: str, title: str = "Attachment Story") -> dict:
    resp = await client.post(STORIES_URL, json={"project_id": project_id, "title": title})
    assert resp.status_code == 201, (
        f"Helper _create_story: expected 201, got {resp.status_code} — {resp.text}"
    )
    return resp.json()["data"]


async def _delete_story(client: AsyncClient, story_id: str) -> None:
    await client.delete(f"{STORIES_URL}/{story_id}")


async def _create_task(client: AsyncClient, story_id: str, title: str = "Attachment Task") -> dict:
    payload = {"title": title, "type": "task", "status": "todo"}
    resp = await client.post(f"{STORIES_URL}/{story_id}/tasks", json=payload)
    assert resp.status_code == 201, (
        f"Helper _create_task: expected 201, got {resp.status_code} — {resp.text}"
    )
    return resp.json()["data"]


async def _delete_task(client: AsyncClient, task_id: str) -> None:
    await client.delete(f"{TASKS_URL}/{task_id}")


async def _create_milestone(client: AsyncClient, project_id: str, name: str = "Attachment Milestone") -> dict:
    resp = await client.post(MILESTONES_URL, json={"name": name, "project_id": project_id})
    assert resp.status_code == 201, (
        f"Helper _create_milestone: expected 201, got {resp.status_code} — {resp.text}"
    )
    return resp.json()["data"]


async def _delete_milestone(client: AsyncClient, milestone_id: str) -> None:
    await client.delete(f"{MILESTONES_URL}/{milestone_id}")


async def _create_container(client: AsyncClient, container_type: str, project_id: str) -> str:
    """Create a fresh story/task/milestone and return its id."""
    if container_type == "story":
        story = await _create_story(client, project_id)
        return story["id"]
    if container_type == "task":
        story = await _create_story(client, project_id, "Parent Story For Task Attachment")
        task = await _create_task(client, story["id"])
        return task["id"]
    if container_type == "milestone":
        milestone = await _create_milestone(client, project_id)
        return milestone["id"]
    raise ValueError(f"Unknown container_type: {container_type}")


def _attachments_url(container_type: str, container_id: str) -> str:
    segment = CONTAINER_URL_SEGMENT[container_type]
    return f"/v1/{segment}/{container_id}/attachments"


def _detail_url(container_type: str, container_id: str) -> str:
    segment = CONTAINER_URL_SEGMENT[container_type]
    return f"/v1/{segment}/{container_id}/detail"


# ---------------------------------------------------------------------------
# Helpers — attachment create
# ---------------------------------------------------------------------------


async def _create_document_json(
    client: AsyncClient,
    container_url: str,
    *,
    title: str = TITLE_DOCUMENT,
    content: str = DOCUMENT_TEXT,
    mime_type: str = "text/markdown",
    author_role: str | None = None,
):
    payload: dict = {"title": title, "kind": "document", "content": content, "mime_type": mime_type}
    if author_role is not None:
        payload["author_role"] = author_role
    return await client.post(container_url, json=payload)


async def _create_external_ref_json(
    client: AsyncClient,
    container_url: str,
    *,
    title: str = TITLE_EXTERNAL_REF,
    external_url: str = EXTERNAL_URL,
    external_status: str | None = None,
    author_role: str | None = None,
):
    payload: dict = {"title": title, "kind": "external-ref", "external_url": external_url}
    if external_status is not None:
        payload["external_status"] = external_status
    if author_role is not None:
        payload["author_role"] = author_role
    return await client.post(container_url, json=payload)


async def _create_multipart(
    client: AsyncClient,
    container_url: str,
    *,
    kind: str,
    mime_type: str,
    content: bytes,
    title: str | None = TITLE_IMAGE,
    author_role: str | None = None,
    filename: str = "upload.bin",
):
    data: dict = {"kind": kind, "mime_type": mime_type}
    if title is not None:
        data["title"] = title
    if author_role is not None:
        data["author_role"] = author_role
    files = {"file": (filename, content, "application/octet-stream")}
    return await client.post(container_url, data=data, files=files)


def _attachment_file_path(attachments_dir: Path, container_type: str, container_id: str, attachment_id: str) -> Path:
    # Mirrors AttachmentService._build_relative_path: "{container_type}/{container_id}/{attachment_id}"
    return attachments_dir / container_type / container_id / attachment_id


async def _mcp_call(tool_name: str, args: dict):
    async with Client(mcp_server_v1) as mcp_client:
        return await mcp_client.call_tool(tool_name, args)


# ===========================================================================
# POST — document, JSON text content
# ===========================================================================


@pytest.mark.parametrize("container_type", ["story", "task", "milestone"])
async def test_create_document_json_happy_path(
    client: AsyncClient, create_project, container_type: str
) -> None:
    project_id = create_project(f"Doc JSON {container_type}")
    container_id = await _create_container(client, container_type, project_id)
    url = _attachments_url(container_type, container_id)

    resp = await _create_document_json(client, url)
    assert resp.status_code == 201, f"Expected 201, got {resp.status_code} — {resp.text}"
    data = resp.json()["data"]
    assert data["title"] == TITLE_DOCUMENT, f"title: expected '{TITLE_DOCUMENT}', got {data['title']}"
    assert data["kind"] == "document", f"kind: expected 'document', got {data['kind']}"
    assert data["container_type"] == container_type
    assert data["container_id"] == container_id
    assert data["mime_type"] == "text/markdown"
    assert data["file_size_bytes"] == len(DOCUMENT_TEXT.encode("utf-8")), (
        "file_size_bytes should equal the UTF-8 byte length of the submitted content"
    )
    assert "file_path" not in data, "file_path must never appear in the response"
    assert "type" not in data, "type must no longer appear in the response (replaced by title)"

    # Content is written and downloadable.
    file_resp = await client.get(f"{ATTACHMENTS_URL}/{data['id']}/file")
    assert file_resp.status_code == 200, f"file download: expected 200, got {file_resp.status_code}"
    assert file_resp.content.decode("utf-8") == DOCUMENT_TEXT, "downloaded content: mismatch"
    assert file_resp.headers["content-type"].startswith("text/markdown"), (
        f"Content-Type: expected to start with text/markdown, got {file_resp.headers['content-type']}"
    )


# ===========================================================================
# POST — document, multipart file upload
# ===========================================================================


@pytest.mark.parametrize("container_type", ["story", "task", "milestone"])
async def test_create_document_multipart_happy_path(
    client: AsyncClient, create_project, container_type: str
) -> None:
    project_id = create_project(f"Doc Multipart {container_type}")
    container_id = await _create_container(client, container_type, project_id)
    url = _attachments_url(container_type, container_id)

    content = b"Plain text document uploaded as a file."
    resp = await _create_multipart(
        client, url, title="Uploaded Doc", kind="document", mime_type="text/plain", content=content
    )
    assert resp.status_code == 201, f"Expected 201, got {resp.status_code} — {resp.text}"
    data = resp.json()["data"]
    assert data["title"] == "Uploaded Doc"
    assert data["kind"] == "document"
    assert data["mime_type"] == "text/plain"
    assert data["file_size_bytes"] == len(content)

    file_resp = await client.get(f"{ATTACHMENTS_URL}/{data['id']}/file")
    assert file_resp.status_code == 200
    assert file_resp.content == content, "downloaded content should match the uploaded file bytes"


# ===========================================================================
# POST — image, multipart
# ===========================================================================


async def test_create_image_multipart_happy_path(client: AsyncClient, create_project) -> None:
    project_id = create_project("Image Multipart")
    story = await _create_story(client, project_id)
    url = _attachments_url("story", story["id"])

    resp = await _create_multipart(
        client, url, title=TITLE_IMAGE, kind="image", mime_type="image/png", content=IMAGE_BYTES
    )
    assert resp.status_code == 201, f"Expected 201, got {resp.status_code} — {resp.text}"
    data = resp.json()["data"]
    assert data["title"] == TITLE_IMAGE
    assert data["kind"] == "image"
    assert data["mime_type"] == "image/png"
    assert data["file_size_bytes"] == len(IMAGE_BYTES)

    file_resp = await client.get(f"{ATTACHMENTS_URL}/{data['id']}/file")
    assert file_resp.status_code == 200
    assert file_resp.content == IMAGE_BYTES
    assert file_resp.headers["content-type"] == "image/png"


async def test_create_image_unsupported_mime_rejected_400(client: AsyncClient, create_project) -> None:
    project_id = create_project("Image Bad Mime")
    story = await _create_story(client, project_id)
    url = _attachments_url("story", story["id"])

    resp = await _create_multipart(
        client, url, title=TITLE_IMAGE, kind="image", mime_type="image/svg+xml", content=IMAGE_BYTES
    )
    assert resp.status_code == 400, f"Expected 400, got {resp.status_code} — {resp.text}"


# ===========================================================================
# POST — file (opaque binary), multipart
# ===========================================================================


async def test_create_file_multipart_happy_path(client: AsyncClient, create_project) -> None:
    project_id = create_project("File Multipart")
    story = await _create_story(client, project_id)
    url = _attachments_url("story", story["id"])

    resp = await _create_multipart(
        client,
        url,
        title=TITLE_FILE,
        kind="file",
        mime_type="application/pdf",
        content=FILE_BYTES,
        filename="report.pdf",
    )
    assert resp.status_code == 201, f"Expected 201, got {resp.status_code} — {resp.text}"
    data = resp.json()["data"]
    assert data["title"] == TITLE_FILE
    assert data["kind"] == "file"
    assert data["mime_type"] == "application/pdf"

    file_resp = await client.get(f"{ATTACHMENTS_URL}/{data['id']}/file")
    assert file_resp.status_code == 200
    assert file_resp.content == FILE_BYTES
    assert file_resp.headers["content-type"] == "application/pdf"


async def test_create_file_unsupported_mime_rejected_400_no_any_binary_fallthrough(
    client: AsyncClient, create_project
) -> None:
    project_id = create_project("File Bad Mime")
    story = await _create_story(client, project_id)
    url = _attachments_url("story", story["id"])

    # A generic binary MIME type is deliberately NOT in the curated file allow-list —
    # this proves there is no "any binary" fallthrough.
    resp = await _create_multipart(
        client,
        url,
        title=TITLE_FILE,
        kind="file",
        mime_type="application/octet-stream",
        content=FILE_BYTES,
    )
    assert resp.status_code == 400, f"Expected 400, got {resp.status_code} — {resp.text}"


# ===========================================================================
# POST — title mandatory / free-form (STORY-021)
# ===========================================================================


async def test_create_document_json_missing_title_returns_422(
    client: AsyncClient, create_project
) -> None:
    project_id = create_project("Missing Title JSON")
    story = await _create_story(client, project_id)
    url = _attachments_url("story", story["id"])

    resp = await client.post(
        url, json={"kind": "document", "content": DOCUMENT_TEXT, "mime_type": "text/markdown"}
    )
    assert resp.status_code == 422, f"Expected 422, got {resp.status_code} — {resp.text}"


async def test_create_document_json_empty_title_returns_422(
    client: AsyncClient, create_project
) -> None:
    project_id = create_project("Empty Title JSON")
    story = await _create_story(client, project_id)
    url = _attachments_url("story", story["id"])

    resp = await _create_document_json(client, url, title="")
    assert resp.status_code == 422, f"Expected 422, got {resp.status_code} — {resp.text}"


async def test_create_document_json_whitespace_title_returns_422(
    client: AsyncClient, create_project
) -> None:
    project_id = create_project("Whitespace Title JSON")
    story = await _create_story(client, project_id)
    url = _attachments_url("story", story["id"])

    resp = await _create_document_json(client, url, title="   ")
    assert resp.status_code == 422, f"Expected 422, got {resp.status_code} — {resp.text}"


async def test_create_external_ref_json_missing_title_returns_422(
    client: AsyncClient, create_project
) -> None:
    project_id = create_project("External Ref Missing Title")
    story = await _create_story(client, project_id)
    url = _attachments_url("story", story["id"])

    resp = await client.post(url, json={"kind": "external-ref", "external_url": EXTERNAL_URL})
    assert resp.status_code == 422, f"Expected 422, got {resp.status_code} — {resp.text}"


async def test_create_external_ref_json_whitespace_title_returns_422(
    client: AsyncClient, create_project
) -> None:
    project_id = create_project("External Ref Whitespace Title")
    story = await _create_story(client, project_id)
    url = _attachments_url("story", story["id"])

    resp = await _create_external_ref_json(client, url, title="   ")
    assert resp.status_code == 422, f"Expected 422, got {resp.status_code} — {resp.text}"


async def test_create_title_is_free_form_arbitrary_string_accepted(
    client: AsyncClient, create_project
) -> None:
    """title is not validated against any dictionary — arbitrary strings are accepted."""
    project_id = create_project("Arbitrary Title Project")
    story = await _create_story(client, project_id)
    url = _attachments_url("story", story["id"])

    resp = await _create_document_json(client, url, title="Anything I Want, Really! 12345")
    assert resp.status_code == 201, f"Expected 201, got {resp.status_code} — {resp.text}"
    assert resp.json()["data"]["title"] == "Anything I Want, Really! 12345"


async def test_create_two_attachments_same_container_may_share_identical_title(
    client: AsyncClient, create_project
) -> None:
    """titles are not required to be unique within a container."""
    project_id = create_project("Duplicate Title Project")
    story = await _create_story(client, project_id)
    url = _attachments_url("story", story["id"])

    resp1 = await _create_document_json(client, url, title="Same Title", content="content one")
    resp2 = await _create_document_json(client, url, title="Same Title", content="content two")

    assert resp1.status_code == 201, f"Expected 201, got {resp1.status_code} — {resp1.text}"
    assert resp2.status_code == 201, f"Expected 201, got {resp2.status_code} — {resp2.text}"
    assert resp1.json()["data"]["title"] == resp2.json()["data"]["title"] == "Same Title"
    assert resp1.json()["data"]["id"] != resp2.json()["data"]["id"], (
        "Two distinct attachments should be created, sharing the same title"
    )


# ===========================================================================
# POST — multipart title default-from-filename behavior (STORY-021)
# ===========================================================================


async def test_multipart_title_absent_defaults_to_uploaded_filename(
    client: AsyncClient, create_project
) -> None:
    project_id = create_project("Multipart Title Absent Default")
    story = await _create_story(client, project_id)
    url = _attachments_url("story", story["id"])

    resp = await _create_multipart(
        client,
        url,
        title=None,
        kind="image",
        mime_type="image/png",
        content=IMAGE_BYTES,
        filename="my-screenshot.png",
    )
    assert resp.status_code == 201, f"Expected 201, got {resp.status_code} — {resp.text}"
    assert resp.json()["data"]["title"] == "my-screenshot.png", (
        f"Absent title should default to the uploaded file name, got {resp.json()['data']['title']}"
    )


async def test_multipart_title_present_but_empty_rejected_422_not_defaulted(
    client: AsyncClient, create_project
) -> None:
    """An empty title field submitted alongside a file must be rejected, not
    silently re-defaulted to the file name — this is the crux of the design."""
    project_id = create_project("Multipart Title Empty Not Defaulted")
    story = await _create_story(client, project_id)
    url = _attachments_url("story", story["id"])

    resp = await _create_multipart(
        client,
        url,
        title="",
        kind="image",
        mime_type="image/png",
        content=IMAGE_BYTES,
        filename="cleared-title.png",
    )
    assert resp.status_code == 422, f"Expected 422, got {resp.status_code} — {resp.text}"


async def test_multipart_title_present_but_whitespace_rejected_422(
    client: AsyncClient, create_project
) -> None:
    project_id = create_project("Multipart Title Whitespace Not Defaulted")
    story = await _create_story(client, project_id)
    url = _attachments_url("story", story["id"])

    resp = await _create_multipart(
        client,
        url,
        title="   ",
        kind="image",
        mime_type="image/png",
        content=IMAGE_BYTES,
        filename="whitespace-title.png",
    )
    assert resp.status_code == 422, f"Expected 422, got {resp.status_code} — {resp.text}"


async def test_multipart_title_provided_is_honored_over_filename(
    client: AsyncClient, create_project
) -> None:
    project_id = create_project("Multipart Title Provided Honored")
    story = await _create_story(client, project_id)
    url = _attachments_url("story", story["id"])

    resp = await _create_multipart(
        client,
        url,
        title="My Custom Title",
        kind="image",
        mime_type="image/png",
        content=IMAGE_BYTES,
        filename="ignored-filename.png",
    )
    assert resp.status_code == 201
    assert resp.json()["data"]["title"] == "My Custom Title"


async def test_multipart_overlong_filename_truncated_to_500_default_title(
    client: AsyncClient, create_project
) -> None:
    project_id = create_project("Multipart Overlong Filename Truncated")
    story = await _create_story(client, project_id)
    url = _attachments_url("story", story["id"])

    overlong_filename = ("a" * 600) + ".png"
    assert len(overlong_filename) > TITLE_MAX_LENGTH, "Precondition: filename must exceed 500 chars"

    resp = await _create_multipart(
        client,
        url,
        title=None,
        kind="image",
        mime_type="image/png",
        content=IMAGE_BYTES,
        filename=overlong_filename,
    )
    assert resp.status_code == 201, (
        f"Overlong file name must not fail the upload, got {resp.status_code} — {resp.text}"
    )
    stored_title = resp.json()["data"]["title"]
    assert len(stored_title) == TITLE_MAX_LENGTH, (
        f"Default title should be truncated to {TITLE_MAX_LENGTH} chars, got {len(stored_title)}"
    )
    assert stored_title == overlong_filename[:TITLE_MAX_LENGTH], (
        "Truncated title should be the prefix of the original file name"
    )


# ===========================================================================
# MCP create — title required, no default (STORY-021)
# ===========================================================================


async def test_mcp_create_document_attachment_missing_title_rejected(
    client: AsyncClient, create_project
) -> None:
    project_id = create_project("MCP Doc Missing Title")
    story = await _create_story(client, project_id)

    with pytest.raises(ToolError):
        await _mcp_call(
            "create_document_attachment",
            {
                "container_type": "story",
                "container_id": story["id"],
                "body": {"content": DOCUMENT_TEXT, "mime_type": "text/markdown"},
            },
        )


async def test_mcp_create_external_ref_attachment_missing_title_rejected(
    client: AsyncClient, create_project
) -> None:
    project_id = create_project("MCP External Ref Missing Title")
    story = await _create_story(client, project_id)

    with pytest.raises(ToolError):
        await _mcp_call(
            "create_external_ref_attachment",
            {
                "container_type": "story",
                "container_id": story["id"],
                "body": {"external_url": EXTERNAL_URL},
            },
        )


async def test_mcp_create_file_attachment_missing_title_rejected(
    client: AsyncClient, create_project
) -> None:
    project_id = create_project("MCP File Missing Title")
    story = await _create_story(client, project_id)

    with pytest.raises(ToolError):
        await _mcp_call(
            "create_file_attachment",
            {
                "container_type": "story",
                "container_id": story["id"],
                "body": {
                    "kind": "image",
                    "mime_type": "image/png",
                    "content_base64": base64.b64encode(IMAGE_BYTES).decode("ascii"),
                },
            },
        )


async def test_mcp_create_document_attachment_title_stored_and_returned(
    client: AsyncClient, create_project
) -> None:
    project_id = create_project("MCP Doc Title Stored")
    story = await _create_story(client, project_id)

    result = await _mcp_call(
        "create_document_attachment",
        {
            "container_type": "story",
            "container_id": story["id"],
            "body": {
                "title": "MCP Document Title",
                "content": DOCUMENT_TEXT,
                "mime_type": "text/markdown",
            },
        },
    )
    assert result.data["data"]["title"] == "MCP Document Title"


async def test_mcp_create_external_ref_attachment_title_stored_and_returned(
    client: AsyncClient, create_project
) -> None:
    project_id = create_project("MCP External Ref Title Stored")
    story = await _create_story(client, project_id)

    result = await _mcp_call(
        "create_external_ref_attachment",
        {
            "container_type": "story",
            "container_id": story["id"],
            "body": {"title": "MCP External Ref Title", "external_url": EXTERNAL_URL},
        },
    )
    assert result.data["data"]["title"] == "MCP External Ref Title"


# ===========================================================================
# MCP create via base64 — parity with REST multipart
# ===========================================================================


async def test_mcp_create_image_matches_rest_multipart(client: AsyncClient, create_project) -> None:
    project_id = create_project("MCP Image Parity")
    story = await _create_story(client, project_id)

    rest_resp = await _create_multipart(
        client,
        _attachments_url("story", story["id"]),
        title=TITLE_IMAGE,
        kind="image",
        mime_type="image/jpeg",
        content=IMAGE_BYTES,
    )
    assert rest_resp.status_code == 201
    rest_data = rest_resp.json()["data"]

    result = await _mcp_call(
        "create_file_attachment",
        {
            "container_type": "story",
            "container_id": story["id"],
            "body": {
                "title": TITLE_IMAGE,
                "kind": "image",
                "mime_type": "image/jpeg",
                "content_base64": base64.b64encode(IMAGE_BYTES).decode("ascii"),
            },
        },
    )
    mcp_data = result.data["data"]

    assert mcp_data["title"] == rest_data["title"] == TITLE_IMAGE
    assert mcp_data["kind"] == rest_data["kind"] == "image"
    assert mcp_data["mime_type"] == rest_data["mime_type"] == "image/jpeg"
    assert mcp_data["file_size_bytes"] == rest_data["file_size_bytes"] == len(IMAGE_BYTES)
    assert "file_path" not in mcp_data

    mcp_file_resp = await client.get(f"{ATTACHMENTS_URL}/{mcp_data['id']}/file")
    assert mcp_file_resp.content == IMAGE_BYTES, (
        "MCP base64 create should store the exact same bytes as REST multipart"
    )


async def test_mcp_create_file_matches_rest_multipart(client: AsyncClient, create_project) -> None:
    project_id = create_project("MCP File Parity")
    story = await _create_story(client, project_id)

    result = await _mcp_call(
        "create_file_attachment",
        {
            "container_type": "story",
            "container_id": story["id"],
            "body": {
                "title": TITLE_FILE,
                "kind": "file",
                "mime_type": "application/pdf",
                "content_base64": base64.b64encode(FILE_BYTES).decode("ascii"),
            },
        },
    )
    mcp_data = result.data["data"]
    assert mcp_data["title"] == TITLE_FILE
    assert mcp_data["kind"] == "file"
    assert mcp_data["mime_type"] == "application/pdf"
    assert mcp_data["file_size_bytes"] == len(FILE_BYTES)

    file_resp = await client.get(f"{ATTACHMENTS_URL}/{mcp_data['id']}/file")
    assert file_resp.status_code == 200
    assert file_resp.content == FILE_BYTES


async def test_mcp_create_document_as_file_matches_rest_multipart(
    client: AsyncClient, create_project
) -> None:
    project_id = create_project("MCP Doc-As-File Parity")
    story = await _create_story(client, project_id)
    doc_bytes = "Existing markdown file uploaded by an agent.".encode("utf-8")

    result = await _mcp_call(
        "create_file_attachment",
        {
            "container_type": "story",
            "container_id": story["id"],
            "body": {
                "title": TITLE_DOCUMENT,
                "kind": "document",
                "mime_type": "text/markdown",
                "content_base64": base64.b64encode(doc_bytes).decode("ascii"),
            },
        },
    )
    mcp_data = result.data["data"]
    assert mcp_data["title"] == TITLE_DOCUMENT
    assert mcp_data["kind"] == "document"
    assert mcp_data["mime_type"] == "text/markdown"

    file_resp = await client.get(f"{ATTACHMENTS_URL}/{mcp_data['id']}/file")
    assert file_resp.content == doc_bytes


# ===========================================================================
# POST — external-ref
# ===========================================================================


async def test_create_external_ref_json_happy_path(client: AsyncClient, create_project) -> None:
    project_id = create_project("External Ref")
    story = await _create_story(client, project_id)
    url = _attachments_url("story", story["id"])

    resp = await _create_external_ref_json(client, url, external_status="draft")
    assert resp.status_code == 201, f"Expected 201, got {resp.status_code} — {resp.text}"
    data = resp.json()["data"]
    assert data["title"] == TITLE_EXTERNAL_REF
    assert data["kind"] == "external-ref"
    assert data["external_url"] == EXTERNAL_URL
    assert data["external_status"] == "draft"
    assert data["mime_type"] is None, "external-ref must not have a mime_type"
    assert data["file_size_bytes"] is None, "external-ref must not have a file_size_bytes"
    assert "file_path" not in data


async def test_create_external_ref_invalid_url_rejected_400(client: AsyncClient, create_project) -> None:
    project_id = create_project("External Ref Bad Url")
    story = await _create_story(client, project_id)
    url = _attachments_url("story", story["id"])

    resp = await _create_external_ref_json(client, url, external_url="not-a-url")
    assert resp.status_code == 400, f"Expected 400, got {resp.status_code} — {resp.text}"


# ===========================================================================
# POST — author_role optional on every create path
# ===========================================================================


async def test_create_author_role_stored_when_provided(client: AsyncClient, create_project) -> None:
    project_id = create_project("Author Role Provided")
    story = await _create_story(client, project_id)
    url = _attachments_url("story", story["id"])

    resp = await _create_document_json(client, url, author_role="backend-developer")
    assert resp.status_code == 201
    assert resp.json()["data"]["author_role"] == "backend-developer"


async def test_create_author_role_omitted_still_created(client: AsyncClient, create_project) -> None:
    project_id = create_project("Author Role Omitted")
    story = await _create_story(client, project_id)
    url = _attachments_url("story", story["id"])

    resp = await _create_external_ref_json(client, url)
    assert resp.status_code == 201, f"Expected 201, got {resp.status_code} — {resp.text}"
    assert resp.json()["data"]["author_role"] is None


async def test_create_author_role_optional_on_multipart(client: AsyncClient, create_project) -> None:
    project_id = create_project("Author Role Multipart")
    story = await _create_story(client, project_id)
    url = _attachments_url("story", story["id"])

    resp = await _create_multipart(
        client, url, title=TITLE_IMAGE, kind="image", mime_type="image/png", content=IMAGE_BYTES
    )
    assert resp.status_code == 201
    assert resp.json()["data"]["author_role"] is None


# ===========================================================================
# POST — container not found / missing fields
# ===========================================================================


@pytest.mark.parametrize("container_type", ["story", "task", "milestone"])
async def test_create_container_not_found_returns_404(client: AsyncClient, container_type: str) -> None:
    fake_id = "00000000-0000-0000-0000-000000000000"
    url = _attachments_url(container_type, fake_id)

    resp = await _create_document_json(client, url)
    assert resp.status_code == 404, f"Expected 404, got {resp.status_code} — {resp.text}"


async def test_create_document_json_missing_content_returns_422(
    client: AsyncClient, create_project
) -> None:
    project_id = create_project("Missing Content")
    story = await _create_story(client, project_id)
    url = _attachments_url("story", story["id"])

    resp = await client.post(
        url, json={"title": TITLE_DOCUMENT, "kind": "document", "mime_type": "text/markdown"}
    )
    assert resp.status_code == 422, f"Expected 422, got {resp.status_code} — {resp.text}"


async def test_create_multipart_missing_file_returns_422(client: AsyncClient, create_project) -> None:
    project_id = create_project("Missing File Part")
    story = await _create_story(client, project_id)
    url = _attachments_url("story", story["id"])

    resp = await client.post(
        url,
        data={"title": TITLE_IMAGE, "kind": "image", "mime_type": "image/png"},
    )
    assert resp.status_code == 422, f"Expected 422, got {resp.status_code} — {resp.text}"


async def test_create_external_ref_missing_url_returns_422(client: AsyncClient, create_project) -> None:
    project_id = create_project("Missing External Url")
    story = await _create_story(client, project_id)
    url = _attachments_url("story", story["id"])

    resp = await client.post(url, json={"title": TITLE_EXTERNAL_REF, "kind": "external-ref"})
    assert resp.status_code == 422, f"Expected 422, got {resp.status_code} — {resp.text}"


# ===========================================================================
# POST — size guard (10 MB boundary)
# ===========================================================================


async def test_create_file_exactly_10mb_accepted(client: AsyncClient, create_project) -> None:
    project_id = create_project("Exactly 10MB")
    story = await _create_story(client, project_id)
    url = _attachments_url("story", story["id"])

    content = b"a" * MAX_UPLOAD_SIZE_BYTES
    resp = await _create_multipart(
        client, url, title=TITLE_FILE, kind="file", mime_type="text/plain", content=content
    )
    assert resp.status_code == 201, (
        f"Exactly 10 MB should be accepted, got {resp.status_code} — {resp.text[:300]}"
    )
    assert resp.json()["data"]["file_size_bytes"] == MAX_UPLOAD_SIZE_BYTES


async def test_create_file_just_over_10mb_rejected_400_no_file_written(
    client: AsyncClient, create_project, attachments_dir: Path
) -> None:
    project_id = create_project("Just Over 10MB")
    story = await _create_story(client, project_id)
    story_dir = attachments_dir / "story" / story["id"]
    assert not story_dir.exists(), "Precondition: no attachments yet for this fresh story"

    url = _attachments_url("story", story["id"])
    content = b"a" * (MAX_UPLOAD_SIZE_BYTES + 1)
    resp = await _create_multipart(
        client, url, title=TITLE_FILE, kind="file", mime_type="text/plain", content=content
    )
    assert resp.status_code == 400, f"Expected 400, got {resp.status_code} — {resp.text[:300]}"
    assert "10 MB" in resp.json()["error"], f"Error message should mention 10 MB: {resp.json()}"
    assert not story_dir.exists(), "No file should be written for a rejected oversized upload"


async def test_mcp_create_base64_oversized_rejected(client: AsyncClient, create_project) -> None:
    project_id = create_project("MCP Oversized")
    story = await _create_story(client, project_id)
    content = b"a" * (MAX_UPLOAD_SIZE_BYTES + 1)

    with pytest.raises(ToolError, match="10 MB"):
        await _mcp_call(
            "create_file_attachment",
            {
                "container_type": "story",
                "container_id": story["id"],
                "body": {
                    "title": TITLE_FILE,
                    "kind": "file",
                    "mime_type": "text/plain",
                    "content_base64": base64.b64encode(content).decode("ascii"),
                },
            },
        )


# ===========================================================================
# GET .../attachments — list, pagination, filters
# ===========================================================================


async def test_list_attachments_pagination(client: AsyncClient, create_project) -> None:
    project_id = create_project("List Pagination")
    story = await _create_story(client, project_id)
    url = _attachments_url("story", story["id"])

    for i in range(3):
        resp = await _create_document_json(client, url, content=f"content {i}")
        assert resp.status_code == 201

    page1 = await client.get(url, params={"page": 1, "limit": 2})
    assert page1.status_code == 200
    body1 = page1.json()
    assert len(body1["data"]) == 2, f"Expected 2 items on page 1, got {len(body1['data'])}"
    assert body1["meta"]["total"] == 3, f"total: expected 3, got {body1['meta']['total']}"
    assert body1["meta"]["totalPages"] == 2, f"totalPages: expected 2, got {body1['meta']['totalPages']}"

    page2 = await client.get(url, params={"page": 2, "limit": 2})
    assert len(page2.json()["data"]) == 1, "Second page should have the remaining item"


async def test_list_attachments_type_filter_param_is_ignored(client: AsyncClient, create_project) -> None:
    """The retired `type` query param is simply dropped (unknown query params are
    ignored by the framework) — it is not an error and does not filter results."""
    project_id = create_project("List Type Filter Ignored")
    story = await _create_story(client, project_id)
    url = _attachments_url("story", story["id"])

    await _create_document_json(client, url, title="Doc One")
    await _create_external_ref_json(client, url, title="Ref One")

    resp = await client.get(url, params={"type": "document"})
    assert resp.status_code == 200, f"Expected 200 (type param ignored), got {resp.status_code}"
    data = resp.json()["data"]
    assert len(data) == 2, (
        f"A stale 'type' query param must not filter results — expected both attachments, got {len(data)}"
    )
    assert all("type" not in a for a in data), "Response items must not expose a 'type' field"


async def test_list_attachments_kind_filter(client: AsyncClient, create_project) -> None:
    project_id = create_project("List Kind Filter")
    story = await _create_story(client, project_id)
    url = _attachments_url("story", story["id"])

    await _create_document_json(client, url)
    await _create_multipart(
        client, url, title=TITLE_IMAGE, kind="image", mime_type="image/png", content=IMAGE_BYTES
    )

    resp = await client.get(url, params={"kind": "image"})
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert len(data) == 1, f"Expected 1 item filtered by kind, got {len(data)}"
    assert data[0]["kind"] == "image"


async def test_list_attachments_unknown_container_returns_404(client: AsyncClient) -> None:
    fake_id = "00000000-0000-0000-0000-000000000000"
    resp = await client.get(_attachments_url("story", fake_id))
    assert resp.status_code == 404, f"Expected 404, got {resp.status_code} — {resp.text}"


async def test_mcp_list_attachments_kind_filter_matches_rest(
    client: AsyncClient, create_project
) -> None:
    project_id = create_project("MCP List Kind Filter")
    story = await _create_story(client, project_id)
    url = _attachments_url("story", story["id"])

    await _create_document_json(client, url)
    await _create_multipart(
        client, url, title=TITLE_IMAGE, kind="image", mime_type="image/png", content=IMAGE_BYTES
    )

    rest_resp = await client.get(url, params={"kind": "image"})
    result = await _mcp_call(
        "list_attachments", {"container_type": "story", "container_id": story["id"], "kind": "image"}
    )

    assert result.data["meta"]["total"] == rest_resp.json()["meta"]["total"] == 1
    assert result.data["data"][0]["kind"] == rest_resp.json()["data"][0]["kind"] == "image"


# ===========================================================================
# GET /attachments/:id — metadata
# ===========================================================================


async def test_get_attachment_by_id_found(client: AsyncClient, create_project) -> None:
    project_id = create_project("Get By Id")
    story = await _create_story(client, project_id)
    create_resp = await _create_document_json(client, _attachments_url("story", story["id"]))
    attachment_id = create_resp.json()["data"]["id"]

    resp = await client.get(f"{ATTACHMENTS_URL}/{attachment_id}")
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["id"] == attachment_id
    assert data["title"] == TITLE_DOCUMENT, f"Expected title '{TITLE_DOCUMENT}', got {data['title']}"
    assert "type" not in data, "type must no longer appear in the response (replaced by title)"
    assert "file_path" not in data, "file_path must never appear in the response"


async def test_get_attachment_by_id_not_found_returns_404(client: AsyncClient) -> None:
    fake_id = "00000000-0000-0000-0000-000000000000"
    resp = await client.get(f"{ATTACHMENTS_URL}/{fake_id}")
    assert resp.status_code == 404, f"Expected 404, got {resp.status_code} — {resp.text}"


async def test_get_attachment_malformed_id_returns_404(client: AsyncClient) -> None:
    resp = await client.get(f"{ATTACHMENTS_URL}/not-a-uuid")
    assert resp.status_code == 404, f"Expected 404 (ADR-011 coerce-or-404), got {resp.status_code}"


# ===========================================================================
# GET /attachments/:id/file
# ===========================================================================


async def test_get_attachment_file_external_ref_returns_400(client: AsyncClient, create_project) -> None:
    project_id = create_project("File Download External Ref")
    story = await _create_story(client, project_id)
    create_resp = await _create_external_ref_json(client, _attachments_url("story", story["id"]))
    attachment_id = create_resp.json()["data"]["id"]

    resp = await client.get(f"{ATTACHMENTS_URL}/{attachment_id}/file")
    assert resp.status_code == 400, f"Expected 400, got {resp.status_code} — {resp.text}"
    assert "do not have a stored file" in resp.json()["error"], resp.json()


async def test_get_attachment_file_not_found_returns_404(client: AsyncClient) -> None:
    fake_id = "00000000-0000-0000-0000-000000000000"
    resp = await client.get(f"{ATTACHMENTS_URL}/{fake_id}/file")
    assert resp.status_code == 404, f"Expected 404, got {resp.status_code} — {resp.text}"


# ===========================================================================
# MCP get_attachment_file
# ===========================================================================


async def test_mcp_get_attachment_file_document(client: AsyncClient, create_project) -> None:
    project_id = create_project("MCP Get File Doc")
    story = await _create_story(client, project_id)
    create_resp = await _create_document_json(client, _attachments_url("story", story["id"]))
    attachment_id = create_resp.json()["data"]["id"]

    result = await _mcp_call("get_attachment_file", {"id": attachment_id})
    assert result.data["mime_type"] == "text/markdown"
    decoded = base64.b64decode(result.data["content_base64"])
    assert decoded.decode("utf-8") == DOCUMENT_TEXT, "MCP base64 read should match the stored content"


async def test_mcp_get_attachment_file_external_ref_errors(client: AsyncClient, create_project) -> None:
    project_id = create_project("MCP Get File External Ref")
    story = await _create_story(client, project_id)
    create_resp = await _create_external_ref_json(client, _attachments_url("story", story["id"]))
    attachment_id = create_resp.json()["data"]["id"]

    with pytest.raises(ToolError, match="do not have a stored file"):
        await _mcp_call("get_attachment_file", {"id": attachment_id})


async def test_mcp_get_attachment_file_not_found_errors(client: AsyncClient) -> None:
    fake_id = "00000000-0000-0000-0000-000000000000"
    with pytest.raises(ToolError, match="not found"):
        await _mcp_call("get_attachment_file", {"id": fake_id})


# ===========================================================================
# No update route, no archive route — title is immutable (STORY-021 unchanged)
# ===========================================================================


async def test_no_update_route_exists_for_attachment(client: AsyncClient, create_project) -> None:
    project_id = create_project("No Update Route")
    story = await _create_story(client, project_id)
    create_resp = await _create_document_json(client, _attachments_url("story", story["id"]))
    attachment_id = create_resp.json()["data"]["id"]

    resp = await client.put(f"{ATTACHMENTS_URL}/{attachment_id}", json={"title": "changed"})
    assert resp.status_code in (404, 405), (
        f"PUT /attachments/:id must not exist (immutable, no update route), got {resp.status_code}"
    )


async def test_no_archive_route_exists_for_attachment(client: AsyncClient, create_project) -> None:
    project_id = create_project("No Archive Route")
    story = await _create_story(client, project_id)
    create_resp = await _create_document_json(client, _attachments_url("story", story["id"]))
    attachment_id = create_resp.json()["data"]["id"]

    resp = await client.post(f"{ATTACHMENTS_URL}/{attachment_id}/archive")
    assert resp.status_code == 404, (
        f"POST /attachments/:id/archive must not exist (no archive lifecycle), got {resp.status_code}"
    )


# ===========================================================================
# DELETE /attachments/:id
# ===========================================================================


async def test_delete_document_removes_row_and_file(
    client: AsyncClient, create_project, attachments_dir: Path
) -> None:
    project_id = create_project("Delete Document")
    story = await _create_story(client, project_id)
    create_resp = await _create_document_json(client, _attachments_url("story", story["id"]))
    attachment_id = create_resp.json()["data"]["id"]

    file_path = _attachment_file_path(attachments_dir, "story", story["id"], attachment_id)
    assert file_path.exists(), "Precondition: stored file should exist after create"

    resp = await client.delete(f"{ATTACHMENTS_URL}/{attachment_id}")
    assert resp.status_code == 204, f"Expected 204, got {resp.status_code} — {resp.text}"

    assert not file_path.exists(), "Stored file should be removed from disk on delete"
    get_resp = await client.get(f"{ATTACHMENTS_URL}/{attachment_id}")
    assert get_resp.status_code == 404, "Attachment row should be gone after delete"


async def test_delete_external_ref_removes_row_only(client: AsyncClient, create_project) -> None:
    project_id = create_project("Delete External Ref")
    story = await _create_story(client, project_id)
    create_resp = await _create_external_ref_json(client, _attachments_url("story", story["id"]))
    attachment_id = create_resp.json()["data"]["id"]

    resp = await client.delete(f"{ATTACHMENTS_URL}/{attachment_id}")
    assert resp.status_code == 204

    get_resp = await client.get(f"{ATTACHMENTS_URL}/{attachment_id}")
    assert get_resp.status_code == 404


async def test_delete_image_and_file_kinds_are_hard_deleted(client: AsyncClient, create_project) -> None:
    project_id = create_project("Delete Image And File")
    story = await _create_story(client, project_id)
    url = _attachments_url("story", story["id"])

    image_resp = await _create_multipart(
        client, url, title=TITLE_IMAGE, kind="image", mime_type="image/png", content=IMAGE_BYTES
    )
    file_resp = await _create_multipart(
        client, url, title=TITLE_FILE, kind="file", mime_type="application/pdf", content=FILE_BYTES
    )

    for attachment_id in (image_resp.json()["data"]["id"], file_resp.json()["data"]["id"]):
        delete_resp = await client.delete(f"{ATTACHMENTS_URL}/{attachment_id}")
        assert delete_resp.status_code == 204
        get_resp = await client.get(f"{ATTACHMENTS_URL}/{attachment_id}")
        assert get_resp.status_code == 404


async def test_delete_attachment_not_found_returns_404(client: AsyncClient) -> None:
    fake_id = "00000000-0000-0000-0000-000000000000"
    resp = await client.delete(f"{ATTACHMENTS_URL}/{fake_id}")
    assert resp.status_code == 404, f"Expected 404, got {resp.status_code} — {resp.text}"


async def test_mcp_delete_attachment_matches_rest(client: AsyncClient, create_project) -> None:
    project_id = create_project("MCP Delete Parity")
    story = await _create_story(client, project_id)
    create_resp = await _create_document_json(client, _attachments_url("story", story["id"]))
    attachment_id = create_resp.json()["data"]["id"]

    result = await _mcp_call("delete_attachment", {"id": attachment_id})
    assert result.data == {"success": True}

    get_resp = await client.get(f"{ATTACHMENTS_URL}/{attachment_id}")
    assert get_resp.status_code == 404, "Attachment deleted over MCP should be gone via REST too"


# ===========================================================================
# Cascade delete: container removal permanently removes its attachments + files
# ===========================================================================


async def test_delete_story_cascades_attachments_and_files(
    client: AsyncClient, create_project, attachments_dir: Path
) -> None:
    project_id = create_project("Cascade Story")
    story = await _create_story(client, project_id)
    create_resp = await _create_document_json(client, _attachments_url("story", story["id"]))
    attachment_id = create_resp.json()["data"]["id"]
    file_path = _attachment_file_path(attachments_dir, "story", story["id"], attachment_id)
    assert file_path.exists()

    delete_resp = await client.delete(f"{STORIES_URL}/{story['id']}")
    assert delete_resp.status_code == 204

    assert not file_path.exists(), "Deleting the story must remove its attachment's file"
    get_resp = await client.get(f"{ATTACHMENTS_URL}/{attachment_id}")
    assert get_resp.status_code == 404, "Deleting the story must remove its attachment row"


async def test_delete_task_cascades_attachments_and_files(
    client: AsyncClient, create_project, attachments_dir: Path
) -> None:
    project_id = create_project("Cascade Task")
    story = await _create_story(client, project_id)
    task = await _create_task(client, story["id"])
    create_resp = await _create_document_json(client, _attachments_url("task", task["id"]))
    attachment_id = create_resp.json()["data"]["id"]
    file_path = _attachment_file_path(attachments_dir, "task", task["id"], attachment_id)
    assert file_path.exists()

    delete_resp = await client.delete(f"{TASKS_URL}/{task['id']}")
    assert delete_resp.status_code == 204

    assert not file_path.exists(), "Deleting the task must remove its attachment's file"
    get_resp = await client.get(f"{ATTACHMENTS_URL}/{attachment_id}")
    assert get_resp.status_code == 404, "Deleting the task must remove its attachment row"


async def test_delete_milestone_cascades_attachments_and_files(
    client: AsyncClient, create_project, attachments_dir: Path
) -> None:
    project_id = create_project("Cascade Milestone")
    milestone = await _create_milestone(client, project_id)
    create_resp = await _create_document_json(client, _attachments_url("milestone", milestone["id"]))
    attachment_id = create_resp.json()["data"]["id"]
    file_path = _attachment_file_path(attachments_dir, "milestone", milestone["id"], attachment_id)
    assert file_path.exists()

    delete_resp = await client.delete(f"{MILESTONES_URL}/{milestone['id']}")
    assert delete_resp.status_code == 204

    assert not file_path.exists(), "Deleting the milestone must remove its attachment's file"
    get_resp = await client.get(f"{ATTACHMENTS_URL}/{attachment_id}")
    assert get_resp.status_code == 404, "Deleting the milestone must remove its attachment row"


# ===========================================================================
# Detail composition
# ===========================================================================


async def test_story_detail_includes_attachments(client: AsyncClient, create_project) -> None:
    project_id = create_project("Story Detail Attachments")
    story = await _create_story(client, project_id)
    create_resp = await _create_document_json(client, _attachments_url("story", story["id"]))
    attachment_id = create_resp.json()["data"]["id"]

    resp = await client.get(_detail_url("story", story["id"]))
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert "attachments" in data
    ids = [a["id"] for a in data["attachments"]]
    assert attachment_id in ids, f"Story detail should include the created attachment: {data['attachments']}"


async def test_task_detail_includes_attachments(client: AsyncClient, create_project) -> None:
    project_id = create_project("Task Detail Attachments")
    story = await _create_story(client, project_id)
    task = await _create_task(client, story["id"])
    create_resp = await _create_document_json(client, _attachments_url("task", task["id"]))
    attachment_id = create_resp.json()["data"]["id"]

    resp = await client.get(_detail_url("task", task["id"]))
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert "attachments" in data
    ids = [a["id"] for a in data["attachments"]]
    assert attachment_id in ids, f"Task detail should include the created attachment: {data['attachments']}"


async def test_milestone_detail_includes_attachments_and_empty_comments(
    client: AsyncClient, create_project
) -> None:
    project_id = create_project("Milestone Detail Attachments")
    milestone = await _create_milestone(client, project_id)
    create_resp = await _create_document_json(client, _attachments_url("milestone", milestone["id"]))
    attachment_id = create_resp.json()["data"]["id"]

    resp = await client.get(_detail_url("milestone", milestone["id"]))
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code} — {resp.text}"
    data = resp.json()["data"]
    ids = [a["id"] for a in data["attachments"]]
    assert attachment_id in ids, f"Milestone detail should include the created attachment: {data['attachments']}"
    assert data["comments"] == [], "Milestone detail comments should stay empty pending STORY-008"


# ===========================================================================
# REST / MCP equivalence — list and get
# ===========================================================================


async def test_mcp_list_attachments_matches_rest(client: AsyncClient, create_project) -> None:
    project_id = create_project("MCP List Parity")
    story = await _create_story(client, project_id)
    await _create_document_json(client, _attachments_url("story", story["id"]))

    rest_resp = await client.get(_attachments_url("story", story["id"]))
    rest_body = rest_resp.json()

    result = await _mcp_call(
        "list_attachments", {"container_type": "story", "container_id": story["id"]}
    )
    mcp_body = result.data

    assert mcp_body["meta"]["total"] == rest_body["meta"]["total"]
    assert {a["id"] for a in mcp_body["data"]} == {a["id"] for a in rest_body["data"]}


async def test_mcp_get_attachment_matches_rest(client: AsyncClient, create_project) -> None:
    project_id = create_project("MCP Get Parity")
    story = await _create_story(client, project_id)
    create_resp = await _create_document_json(client, _attachments_url("story", story["id"]))
    attachment_id = create_resp.json()["data"]["id"]

    rest_resp = await client.get(f"{ATTACHMENTS_URL}/{attachment_id}")
    result = await _mcp_call("get_attachment", {"id": attachment_id})

    assert result.data["data"]["id"] == rest_resp.json()["data"]["id"]
    assert result.data["data"]["title"] == rest_resp.json()["data"]["title"]
    assert result.data["data"]["kind"] == rest_resp.json()["data"]["kind"]
    assert "file_path" not in result.data["data"], "file_path must never appear in the MCP response either"
