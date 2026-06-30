---
id: BUG-002
story: STORY-002
severity: major
status: resolved
assignee: backend-developer
---

# BUG-002: PUT /projects/:id/settings silently ignores unknown keys instead of returning 400

## Description

`PUT /v1/projects/:id/settings` accepts a request body containing an unknown dictionary
key (one not in the six canonical keys) and returns `200 OK` with the current effective
settings, silently discarding the unrecognised key. The API contract requires `400` with
`code: VALIDATION_ERROR` in this situation.

## Steps to Reproduce

1. Create a project; note its `id`.
2. Send `PUT /v1/projects/{id}/settings` with body `{"unknown_key": ["a", "b"]}`.
3. Observe that the response is `200 OK` with the full effective settings data envelope.

## Expected Result

`400 Bad Request` with a JSON body containing `"code": "VALIDATION_ERROR"`.

## Actual Result

`200 OK` — the unknown key is silently ignored and the current effective settings are
returned as if the request were a no-op.

## Additional Info

Failing test:
- `TestUpdateProjectSettings::test_unknown_key_returns_400`

Test output excerpt:
```
AssertionError: Unknown key should return 400, got 200
assert 200 == 400
 +  where 200 = <Response [200 OK]>.status_code
```

Same root cause as BUG-001 — the service layer does not call `validate_dict_key()` for
unrecognised keys before processing them on the project-level PUT endpoint.
