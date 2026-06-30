---
id: BUG-001
story: STORY-002
severity: major
status: resolved
assignee: backend-developer
---

# BUG-001: PUT /system/settings silently ignores unknown keys instead of returning 400

## Description

`PUT /v1/system/settings` accepts a request body containing an unknown dictionary key
(one not in the six canonical keys) and returns `200 OK` with the current settings,
silently discarding the unrecognised key. The API contract requires `400` with
`code: VALIDATION_ERROR` in this situation.

## Steps to Reproduce

1. Send `PUT /v1/system/settings` with body `{"non_existent_key": ["a", "b"]}`.
2. Observe that the response is `200 OK` with the full settings data envelope.

## Expected Result

`400 Bad Request` with a JSON body containing `"code": "VALIDATION_ERROR"`.

## Actual Result

`200 OK` — the unknown key is silently ignored and the current settings are returned
as if the request were a no-op.

## Additional Info

Failing tests:
- `TestUpdateSystemSettings::test_unknown_key_returns_400`
- `TestUpdateSystemSettings::test_unknown_key_error_code`

Test output excerpt:
```
AssertionError: Unknown key should return 400, got 200
assert 200 == 400
 +  where 200 = <Response [200 OK]>.status_code
```

The `validate_dict_key()` helper in `backend/app/core/dict_resolver.py` is responsible
for this validation. The service layer likely does not call it for unknown keys during a
PUT, or the controller strips them before reaching the service.
