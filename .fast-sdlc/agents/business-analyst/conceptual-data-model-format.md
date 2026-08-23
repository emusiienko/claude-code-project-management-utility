<!-- Default format for the Conceptual Data Model artifact — accept as-is or customize with business-analyst during Step 0 (Confirm Artifact Formats). Structured YAML, not prose — see fast-sdlc-business-analyst.md > DATA MODELING for the compositional process this format supports. -->

# Conceptual Data Model Structure

A folder, not a single file. One catalog file — the single source of truth for entities — plus one view file per subject area, holding only relationships that reference catalog entities by name. Entities are global (defined once, referenced by name from any view); relationships are local (each belongs to exactly one subject-area view — the same relationship is never duplicated across views "just in case"). Output is YAML only — no diagrams, no prose narration, no rendering.

```
<Conceptual Data Model location>/
  catalog.yaml
  <subject-area-slug>.yaml   (one per subject area)
```

## `catalog.yaml`
```yaml
model_context:
  subject_area: "Shared entity catalog"
  purpose: string
entities:
  - name: string          # singular, business language
    definition: string    # one line
    attributes: [string]  # defining only; may be empty
assumptions: [string]
```

## `<subject-area-slug>.yaml` (one per subject area)
```yaml
model_context:
  subject_area: string     # short label, e.g. "Order fulfillment"
  purpose: string          # one line: why this view exists
  entities_ref: catalog.yaml
relationships:
  - from: string           # must exist in catalog
    to: string             # must exist in catalog
    verb: string
    cardinality: one-to-one | one-to-many | many-to-many
    optionality:
      from: mandatory | optional
      to: mandatory | optional
    rule: string
assumptions: [string]
```
