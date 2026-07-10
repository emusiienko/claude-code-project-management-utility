from enum import Enum


class ApiVersion(str, Enum):
    V1 = "v1"

    def __str__(self) -> str:
        return self.value


class AppPath(str, Enum):
    PROJECTS = "projects"
    STORIES = "stories"
    MILESTONES = "milestones"
    # Future domains: add one entry per top-level URL path segment.

    def __str__(self) -> str:
        return self.value