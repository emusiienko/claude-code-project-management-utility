"""FK-action matrix — every declared FK action and every polymorphic container cleanup,
proven on SQLite through the real application path (STORY-016 / TASK-006).

The test engine is the application engine (`build_engine`), so FK enforcement is on.
Each test deletes a parent through REST or through the MCP delete tool (the `delete`
fixture is parametrized over both entry points) and then reads database state
directly through `db_session` — a follow-up 404 from the API is never the assertion.

Coverage:
- All 11 FK columns, each through REST and MCP: CASCADE -> project (story, milestone,
  session, project_settings), CASCADE -> story (task.story_id, story_link source and
  target), CASCADE -> task (task_link source and target), and SET NULL
  (story.milestone_id, session.linked_story_id, session.linked_task_id). Each SET NULL
  case also asserts the referencing row still exists.
- Polymorphic containers (attachments + stored files, comments — real container FKs with a CHECK, ADR-034):
  direct (story, task, milestone) and transitive (story -> its tasks; project -> its
  stories, their tasks, its milestones). A bystander container's attachment and
  comment must survive.
- Multi-level: one project carrying every table, deleted in one call; nothing remains
  and `PRAGMA foreign_key_check` is clean.
"""

from __future__ import annotations

from collections.abc import AsyncIterator, Awaitable, Callable
from contextlib import asynccontextmanager
from pathlib import Path

import pytest
from fastmcp import Client
from httpx import AsyncClient
from sqlalchemy import bindparam, text
from sqlalchemy.orm import Session

from app.mcp.server import mcp_server_v1

PROJECTS_URL = "/v1/projects"
STORIES_URL = "/v1/stories"
TASKS_URL = "/v1/tasks"
MILESTONES_URL = "/v1/milestones"
SESSIONS_URL = "/v1/sessions"

DELETE_URL = {
    "project": PROJECTS_URL,
    "story": STORIES_URL,
    "task": TASKS_URL,
    "milestone": MILESTONES_URL,
}
CONTAINER_SEGMENT = {"story": "stories", "task": "tasks", "milestone": "milestones"}
LINK_TYPE = "depends-on"
SESSION_ROLE = "operator"

Delete = Callable[[str, str], Awaitable[None]]

# A cascaded file is young when asserted on; sweep it without the grace window.
pytestmark = pytest.mark.usefixtures("immediate_orphan_sweep")


# ---------------------------------------------------------------------------
# Entry-point fixture: every test using `delete` runs once through REST, once
# through the MCP tool of the same name.
# ---------------------------------------------------------------------------


@pytest.fixture(params=["rest", "mcp"])
def delete(request: pytest.FixtureRequest, client: AsyncClient) -> Delete:
    entry = request.param

    async def _delete(resource: str, resource_id: str) -> None:
        if entry == "rest":
            resp = await client.delete(f"{DELETE_URL[resource]}/{resource_id}")
            assert (
                resp.status_code == 204
            ), f"REST delete {resource}: expected 204, got {resp.status_code} — {resp.text}"
            return
        async with Client(mcp_server_v1) as mcp_client:
            await mcp_client.call_tool(f"delete_{resource}", {"id": resource_id})

    return _delete


# ---------------------------------------------------------------------------
# Direct database reads
# ---------------------------------------------------------------------------


class Probe:
    """Reads database state directly; never goes through the API."""

    def __init__(self, db: Session, attachments_dir: Path) -> None:
        self._db = db
        self._attachments_dir = attachments_dir

    def count(self, table: str, column: str, ids: list[str]) -> int:
        self._db.rollback()  # drop any stale read snapshot
        stmt = text(f"SELECT COUNT(*) FROM {table} WHERE {column} IN :ids").bindparams(
            bindparam("ids", expanding=True)
        )
        return self._db.execute(stmt, {"ids": ids}).scalar_one()

    def exists(self, table: str, row_id: str) -> bool:
        return self.count(table, "id", [row_id]) == 1

    def value(self, table: str, column: str, row_id: str) -> str | None:
        self._db.rollback()
        return self._db.execute(
            text(f"SELECT {column} FROM {table} WHERE id = :id"), {"id": row_id}
        ).scalar_one()

    def stored_files(self, attachment_ids: list[str]) -> list[Path]:
        self._db.rollback()
        stmt = text("SELECT file_path FROM attachment WHERE id IN :ids").bindparams(
            bindparam("ids", expanding=True)
        )
        rows = self._db.execute(stmt, {"ids": attachment_ids}).scalars().all()
        return [self._attachments_dir / path for path in rows if path is not None]

    def foreign_key_violations(self) -> list:
        self._db.rollback()
        return list(self._db.execute(text("PRAGMA foreign_key_check")).fetchall())


@pytest.fixture()
def probe(db_session: Session, attachments_dir: Path) -> Probe:
    return Probe(db_session, attachments_dir)


# ---------------------------------------------------------------------------
# Seed helpers (through REST)
# ---------------------------------------------------------------------------


async def _post(client: AsyncClient, url: str, payload: dict) -> dict:
    resp = await client.post(url, json=payload)
    assert (
        resp.status_code == 201
    ), f"POST {url}: expected 201, got {resp.status_code} — {resp.text}"
    return resp.json()["data"]


@asynccontextmanager
async def _project(client: AsyncClient, name: str) -> AsyncIterator[str]:
    """Create a project; always delete it afterwards, even on a failed assertion."""
    project_id = (await _post(client, PROJECTS_URL + "/", {"name": name}))["id"]
    try:
        yield project_id
    finally:
        await client.delete(f"{PROJECTS_URL}/{project_id}")


async def _milestone(client: AsyncClient, project_id: str, name: str = "M") -> str:
    return (
        await _post(client, MILESTONES_URL, {"name": name, "project_id": project_id})
    )["id"]


async def _story(
    client: AsyncClient,
    project_id: str,
    title: str = "S",
    milestone_id: str | None = None,
) -> str:
    payload: dict = {"project_id": project_id, "title": title}
    if milestone_id is not None:
        payload["milestone_id"] = milestone_id
    return (await _post(client, STORIES_URL, payload))["id"]


async def _task(client: AsyncClient, story_id: str, title: str = "T") -> str:
    payload = {"title": title, "type": "task", "status": "todo"}
    return (await _post(client, f"{STORIES_URL}/{story_id}/tasks", payload))["id"]


async def _story_link(client: AsyncClient, source_id: str, target_id: str) -> str:
    payload = {"target_story_id": target_id, "link_type": LINK_TYPE}
    return (await _post(client, f"{STORIES_URL}/{source_id}/links", payload))["id"]


async def _task_link(client: AsyncClient, source_id: str, target_id: str) -> str:
    payload = {"target_task_id": target_id, "link_type": LINK_TYPE}
    return (await _post(client, f"{TASKS_URL}/{source_id}/links", payload))["id"]


async def _session(client: AsyncClient, project_id: str, **links: str) -> str:
    payload = {
        "project_id": project_id,
        "topic": "Matrix Session",
        "goal": "Prove FK actions",
        "participant_role": SESSION_ROLE,
        **links,
    }
    return (await _post(client, SESSIONS_URL, payload))["id"]


async def _project_settings(client: AsyncClient, project_id: str) -> None:
    resp = await client.put(
        f"{PROJECTS_URL}/{project_id}/settings",
        json={"task_statuses": ["todo", "done"]},
    )
    assert (
        resp.status_code == 200
    ), f"PUT project settings: {resp.status_code} {resp.text}"


async def _decorate(
    client: AsyncClient, container_type: str, container_id: str
) -> tuple[str, str]:
    """Give a container one stored-file attachment and one comment."""
    base = f"/v1/{CONTAINER_SEGMENT[container_type]}/{container_id}"
    attachment = await _post(
        client,
        f"{base}/attachments",
        {
            "title": "Doc",
            "kind": "document",
            "content": "# matrix",
            "mime_type": "text/markdown",
        },
    )
    comment = await _post(
        client, f"{base}/comments", {"content": "note", "author_role": SESSION_ROLE}
    )
    return attachment["id"], comment["id"]


class Decorations:
    """Attachments + comments on a set of containers, checked before and after."""

    def __init__(self, probe: Probe) -> None:
        self._probe = probe
        self.attachment_ids: list[str] = []
        self.comment_ids: list[str] = []
        self.files: list[Path] = []

    async def add(
        self, client: AsyncClient, container_type: str, container_id: str
    ) -> None:
        attachment_id, comment_id = await _decorate(
            client, container_type, container_id
        )
        self.attachment_ids.append(attachment_id)
        self.comment_ids.append(comment_id)
        self.files.extend(self._probe.stored_files([attachment_id]))

    def assert_present(self) -> None:
        assert self._probe.count("attachment", "id", self.attachment_ids) == len(
            self.attachment_ids
        ), "Precondition: attachment rows exist"
        assert self._probe.count("comment", "id", self.comment_ids) == len(
            self.comment_ids
        ), "Precondition: comment rows exist"
        assert len(self.files) == len(self.attachment_ids) and all(
            f.exists() for f in self.files
        ), "Precondition: every attachment has a stored file under ATTACHMENTS_DIR"

    def assert_gone(self) -> None:
        assert (
            self._probe.count("attachment", "id", self.attachment_ids) == 0
        ), "attachment rows must be removed with their container"
        assert (
            self._probe.count("comment", "id", self.comment_ids) == 0
        ), "comment rows must be removed with their container"
        assert not any(
            f.exists() for f in self.files
        ), "stored attachment files must be removed with their container"


# ===========================================================================
# CASCADE -> project
# ===========================================================================


async def test_project_delete_cascades_story_project_id(
    client: AsyncClient, delete: Delete, probe: Probe
) -> None:
    async with _project(client, "FK story.project_id") as pid:
        story_id = await _story(client, pid)
        await delete("project", pid)
        assert not probe.exists("story", story_id)


async def test_project_delete_cascades_milestone_project_id(
    client: AsyncClient, delete: Delete, probe: Probe
) -> None:
    async with _project(client, "FK milestone.project_id") as pid:
        milestone_id = await _milestone(client, pid)
        await delete("project", pid)
        assert not probe.exists("milestone", milestone_id)


async def test_project_delete_cascades_session_project_id(
    client: AsyncClient, delete: Delete, probe: Probe
) -> None:
    async with _project(client, "FK session.project_id") as pid:
        session_id = await _session(client, pid)
        await delete("project", pid)
        assert not probe.exists("session", session_id)


async def test_project_delete_cascades_project_settings_project_id(
    client: AsyncClient, delete: Delete, probe: Probe
) -> None:
    async with _project(client, "FK project_settings.project_id") as pid:
        await _project_settings(client, pid)
        assert probe.count("project_settings", "project_id", [pid]) == 1
        await delete("project", pid)
        assert probe.count("project_settings", "project_id", [pid]) == 0


# ===========================================================================
# CASCADE -> story
# ===========================================================================


async def test_story_delete_cascades_task_story_id(
    client: AsyncClient, delete: Delete, probe: Probe
) -> None:
    async with _project(client, "FK task.story_id") as pid:
        story_id = await _story(client, pid)
        task_id = await _task(client, story_id)
        await delete("story", story_id)
        assert not probe.exists("task", task_id)


async def test_story_delete_cascades_story_link_source_story_id(
    client: AsyncClient, delete: Delete, probe: Probe
) -> None:
    async with _project(client, "FK story_link.source_story_id") as pid:
        source, target = await _story(client, pid, "src"), await _story(
            client, pid, "tgt"
        )
        link_id = await _story_link(client, source, target)
        await delete("story", source)
        assert not probe.exists("story_link", link_id)
        assert probe.exists("story", target), "the other end of the link must survive"


async def test_story_delete_cascades_story_link_target_story_id(
    client: AsyncClient, delete: Delete, probe: Probe
) -> None:
    async with _project(client, "FK story_link.target_story_id") as pid:
        source, target = await _story(client, pid, "src"), await _story(
            client, pid, "tgt"
        )
        link_id = await _story_link(client, source, target)
        await delete("story", target)
        assert not probe.exists("story_link", link_id)
        assert probe.exists("story", source), "the other end of the link must survive"


# ===========================================================================
# CASCADE -> task
# ===========================================================================


async def test_task_delete_cascades_task_link_source_task_id(
    client: AsyncClient, delete: Delete, probe: Probe
) -> None:
    async with _project(client, "FK task_link.source_task_id") as pid:
        story_id = await _story(client, pid)
        source, target = await _task(client, story_id, "src"), await _task(
            client, story_id, "tgt"
        )
        link_id = await _task_link(client, source, target)
        await delete("task", source)
        assert not probe.exists("task_link", link_id)
        assert probe.exists("task", target), "the other end of the link must survive"


async def test_task_delete_cascades_task_link_target_task_id(
    client: AsyncClient, delete: Delete, probe: Probe
) -> None:
    async with _project(client, "FK task_link.target_task_id") as pid:
        story_id = await _story(client, pid)
        source, target = await _task(client, story_id, "src"), await _task(
            client, story_id, "tgt"
        )
        link_id = await _task_link(client, source, target)
        await delete("task", target)
        assert not probe.exists("task_link", link_id)
        assert probe.exists("task", source), "the other end of the link must survive"


# ===========================================================================
# SET NULL
# ===========================================================================


async def test_milestone_delete_nulls_story_milestone_id(
    client: AsyncClient, delete: Delete, probe: Probe
) -> None:
    async with _project(client, "FK story.milestone_id") as pid:
        milestone_id = await _milestone(client, pid)
        story_id = await _story(client, pid, milestone_id=milestone_id)
        assert probe.value("story", "milestone_id", story_id) == milestone_id
        await delete("milestone", milestone_id)
        assert probe.exists("story", story_id), "the story must survive"
        assert probe.value("story", "milestone_id", story_id) is None


async def test_story_delete_nulls_session_linked_story_id(
    client: AsyncClient, delete: Delete, probe: Probe
) -> None:
    async with _project(client, "FK session.linked_story_id") as pid:
        story_id = await _story(client, pid)
        session_id = await _session(client, pid, linked_story_id=story_id)
        assert probe.value("session", "linked_story_id", session_id) == story_id
        await delete("story", story_id)
        assert probe.exists("session", session_id), "the session must survive"
        assert probe.value("session", "linked_story_id", session_id) is None


async def test_task_delete_nulls_session_linked_task_id(
    client: AsyncClient, delete: Delete, probe: Probe
) -> None:
    async with _project(client, "FK session.linked_task_id") as pid:
        story_id = await _story(client, pid)
        task_id = await _task(client, story_id)
        session_id = await _session(client, pid, linked_task_id=task_id)
        assert probe.value("session", "linked_task_id", session_id) == task_id
        await delete("task", task_id)
        assert probe.exists("session", session_id), "the session must survive"
        assert probe.value("session", "linked_task_id", session_id) is None


# ===========================================================================
# Polymorphic containers — direct
# ===========================================================================


@pytest.mark.parametrize("container_type", ["story", "task", "milestone"])
async def test_container_delete_removes_its_attachments_and_comments(
    client: AsyncClient, delete: Delete, probe: Probe, container_type: str
) -> None:
    async with _project(client, f"Polymorphic {container_type}") as pid:
        story_id = await _story(client, pid)
        ids = {
            "story": story_id,
            "task": await _task(client, story_id),
            "milestone": await _milestone(client, pid),
        }
        mine, bystander = Decorations(probe), Decorations(probe)
        await mine.add(client, container_type, ids[container_type])
        # A sibling of the same type keeps its own attachment and comment.
        sibling = {
            "story": await _story(client, pid, "sibling"),
            "task": await _task(client, story_id, "sibling"),
            "milestone": await _milestone(client, pid, "sibling"),
        }[container_type]
        await bystander.add(client, container_type, sibling)
        mine.assert_present()

        await delete(container_type, ids[container_type])

        mine.assert_gone()
        bystander.assert_present()


# ===========================================================================
# Polymorphic containers — transitive
# ===========================================================================


async def test_story_delete_removes_its_tasks_attachments_and_comments(
    client: AsyncClient, delete: Delete, probe: Probe
) -> None:
    async with _project(client, "Transitive story -> tasks") as pid:
        story_id = await _story(client, pid)
        other_story = await _story(client, pid, "bystander")
        task_a, task_b = await _task(client, story_id, "a"), await _task(
            client, story_id, "b"
        )
        bystander_task = await _task(client, other_story)
        mine, bystander = Decorations(probe), Decorations(probe)
        for container_type, container_id in (
            ("story", story_id),
            ("task", task_a),
            ("task", task_b),
        ):
            await mine.add(client, container_type, container_id)
        await bystander.add(client, "task", bystander_task)
        mine.assert_present()

        await delete("story", story_id)

        mine.assert_gone()
        bystander.assert_present()
        assert probe.count("task", "id", [task_a, task_b]) == 0


async def test_project_delete_removes_all_container_attachments_and_comments(
    client: AsyncClient, delete: Delete, probe: Probe
) -> None:
    async with _project(client, "Transitive project -> containers") as pid:
        async with _project(client, "Transitive bystander project") as other_pid:
            story_id = await _story(client, pid)
            task_id = await _task(client, story_id)
            milestone_id = await _milestone(client, pid)
            other_story = await _story(client, other_pid)

            mine, bystander = Decorations(probe), Decorations(probe)
            await mine.add(client, "story", story_id)
            await mine.add(client, "task", task_id)
            await mine.add(client, "milestone", milestone_id)
            await bystander.add(client, "story", other_story)
            mine.assert_present()

            await delete("project", pid)

            mine.assert_gone()
            bystander.assert_present()


# ===========================================================================
# Multi-level: one project, every table, one delete
# ===========================================================================


async def test_project_delete_removes_everything_it_owns(
    client: AsyncClient, delete: Delete, probe: Probe
) -> None:
    async with _project(client, "Multi-level project") as pid:
        milestone_id = await _milestone(client, pid)
        story_1 = await _story(client, pid, "s1", milestone_id=milestone_id)
        story_2 = await _story(client, pid, "s2")
        task_1, task_2 = await _task(client, story_1, "t1"), await _task(
            client, story_1, "t2"
        )
        task_3, task_4 = await _task(client, story_2, "t3"), await _task(
            client, story_2, "t4"
        )
        story_links = [
            await _story_link(client, story_1, story_2),
            await _story_link(client, story_2, story_1),
        ]
        task_links = [
            await _task_link(client, task_1, task_2),
            await _task_link(client, task_3, task_4),  # a task link in the other story
        ]
        sessions = [
            await _session(client, pid, linked_story_id=story_1),
            await _session(client, pid, linked_task_id=task_3),
            await _session(client, pid),
        ]
        await _project_settings(client, pid)
        decorations = Decorations(probe)
        for container_type, container_id in (
            ("milestone", milestone_id),
            ("story", story_1),
            ("story", story_2),
            ("task", task_1),
            ("task", task_3),
        ):
            await decorations.add(client, container_type, container_id)
        decorations.assert_present()

        await delete("project", pid)

        assert probe.count("project", "id", [pid]) == 0
        assert probe.count("project_settings", "project_id", [pid]) == 0
        assert probe.count("milestone", "id", [milestone_id]) == 0
        assert probe.count("story", "id", [story_1, story_2]) == 0
        assert probe.count("task", "id", [task_1, task_2, task_3, task_4]) == 0
        assert probe.count("story_link", "id", story_links) == 0
        assert probe.count("task_link", "id", task_links) == 0
        assert probe.count("session", "id", sessions) == 0
        decorations.assert_gone()
        assert probe.foreign_key_violations() == []
