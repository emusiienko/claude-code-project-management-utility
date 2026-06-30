from fastapi import APIRouter, Query, status

router = APIRouter(tags=["projects"])


# TODO(STORY-003): replace this stub with the full projects controller once the
# Projects domain service and repository are implemented.
@router.get(
    "/projects",
    status_code=status.HTTP_200_OK,
    response_model=dict,
)
def list_projects(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
) -> dict:
    return {
        "data": [],
        "meta": {
            "total": 0,
            "page": page,
            "limit": limit,
            "totalPages": 0,
        },
    }
