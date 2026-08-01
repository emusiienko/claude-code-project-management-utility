from pydantic import BaseModel

# Fixed liveness indicator — the only value this field ever takes. A single
# constant keeps "ok" from being duplicated between the service and any test
# or client that asserts on it.
STATUS_OK = "ok"


class Status(BaseModel):
    status: str
    version: str
