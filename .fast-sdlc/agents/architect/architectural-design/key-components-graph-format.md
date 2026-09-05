<!-- Default format for the Key Components graph (C4 Level 2) — accept as-is or customize with architect during Step 0 (Confirm Artifact Formats). Referenced from solution-overview.md > Key Components. Pure data — the diagram generated from it lives in key-components-diagram-format.md. Container level only, never deeper (no classes, no modules — that's lead-developer's domain once this is built). -->

# Key Components — Graph Data

```yaml
components:                    # top-level containers — services, databases, queues, frontends
  - id: string                 # stable id, referenced by relationships (e.g. order_service)
    name: string
    type: service | database | queue | frontend | cache | external-facing-api | ...
    bounded_context: string    # (optional) the bounded context this component belongs to
    description: string        # (optional) what it does

relationships:
  - from: string                # a components id
    to: string                  # a components id, or an external_systems id from system-context-graph-format.md
    type: sync | async
    initiator: string           # (optional) which side initiates, if not `from`
    description: string         # (optional) nature of the interaction
```
