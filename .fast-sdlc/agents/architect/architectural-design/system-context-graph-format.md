<!-- Default format for the System Context graph (C4 Level 1) — accept as-is or customize with architect during Step 0 (Confirm Artifact Formats). Referenced from solution-overview.md > System Context. Pure data — the diagram generated from it lives in system-context-diagram-format.md. -->

# System Context — Graph Data

```yaml
actors:                       # people/roles interacting with the system
  - id: string                # stable id, referenced by relationships (e.g. end_user)
    name: string
    description: string       # (optional)

external_systems:             # systems outside the boundary
  - id: string                # stable id, referenced by relationships (e.g. payment_provider)
    name: string
    description: string       # (optional) what it is / who owns it

relationships:
  - from: string               # an actor id, an external_systems id, or "system" (this system itself)
    to: string                 # same
    type: sync | async
    initiator: string          # (optional) which side initiates, if not `from`
    description: string        # (optional) nature of the interaction
```
