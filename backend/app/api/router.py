from fastapi import APIRouter

from app.api.routes import ApiVersion, AppPath
from app.attachments.controller import (
    attachments_top_router,
    milestones_attachments_router,
    stories_attachments_router,
    tasks_attachments_router,
)
from app.comments.controller import (
    comments_top_router,
    milestones_comments_router,
    stories_comments_router,
    tasks_comments_router,
)
from app.milestones.controller import router as milestones_router
from app.projects.controller import router as projects_router
from app.settings.controller import router as settings_router
from app.stories.controller import router as stories_router
from app.story_links.controller import story_links_router, story_links_top_router
from app.task_links.controller import task_links_router, task_links_top_router
from app.tasks.controller import stories_router as task_stories_router
from app.tasks.controller import tasks_router

# Version router — all v1 routes live under /{ApiVersion.V1}.
v1_router = APIRouter(prefix=f"/{ApiVersion.V1}")
v1_router.include_router(projects_router, prefix=f"/{AppPath.PROJECTS}")
v1_router.include_router(stories_router, prefix=f"/{AppPath.STORIES}")
# Task routes under /stories/:storyId/tasks are mounted on the stories prefix.
v1_router.include_router(task_stories_router, prefix=f"/{AppPath.STORIES}")
# Task routes under /tasks/:id are mounted on the tasks prefix.
v1_router.include_router(tasks_router, prefix=f"/{AppPath.TASKS}")
# Task link routes under /tasks/:taskId/links are mounted on the tasks prefix.
v1_router.include_router(task_links_router, prefix=f"/{AppPath.TASKS}")
# Task link routes under /task-links/:id use the top-level task-links prefix.
v1_router.include_router(task_links_top_router, prefix=f"/{AppPath.TASK_LINKS}")
# Story link routes under /stories/:storyId/links are mounted on the stories prefix.
v1_router.include_router(story_links_router, prefix=f"/{AppPath.STORIES}")
# Story link routes under /story-links/:id use the top-level story-links prefix.
v1_router.include_router(story_links_top_router, prefix=f"/{AppPath.STORY_LINKS}")
v1_router.include_router(milestones_router, prefix=f"/{AppPath.MILESTONES}")
# Attachment routes under /stories|/tasks|/milestones/:id/attachments are
# mounted on their respective container prefixes.
v1_router.include_router(stories_attachments_router, prefix=f"/{AppPath.STORIES}")
v1_router.include_router(tasks_attachments_router, prefix=f"/{AppPath.TASKS}")
v1_router.include_router(milestones_attachments_router, prefix=f"/{AppPath.MILESTONES}")
# Attachment routes under /attachments/:id use the top-level attachments prefix.
v1_router.include_router(attachments_top_router, prefix=f"/{AppPath.ATTACHMENTS}")
# Comment routes under /stories|/tasks|/milestones/:id/comments are mounted on
# their respective container prefixes.
v1_router.include_router(stories_comments_router, prefix=f"/{AppPath.STORIES}")
v1_router.include_router(tasks_comments_router, prefix=f"/{AppPath.TASKS}")
v1_router.include_router(milestones_comments_router, prefix=f"/{AppPath.MILESTONES}")
# Comment routes under /comments/:id use the top-level comments prefix.
v1_router.include_router(comments_top_router, prefix=f"/{AppPath.COMMENTS}")
# Settings routes span /system/settings and /projects/{id}/settings — no single
# domain-level prefix applies; the router is included without an additional prefix.
v1_router.include_router(settings_router)

# App router — single entry point included by main.py.
app_router = APIRouter()
app_router.include_router(v1_router)
