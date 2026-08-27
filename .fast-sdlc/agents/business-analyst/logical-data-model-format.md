<!-- Default format for the Logical Data Model artifact — accept as-is or customize with business-analyst during Step 0 (Confirm Artifact Formats). Lives inside Business Documentation's `logical-data-model/` folder — its sole, permanent home, populated per subject area during story execution, never a Requirements-side copy (revised 2026-08-27, TASK-008). Enriches an already-approved Conceptual Data Model — see fast-sdlc-business-analyst.md > DATA MODELING for the compositional process this format supports. -->

# Logical Data Model Structure

Keeps the Conceptual Data Model's file structure: one catalog file (entities plus their complete attributes, identifiers, and foreign keys), one view file per subject area (relationships, now resolved with foreign keys). Output is YAML only — no diagrams, no prose narration, no rendering.

```
<Business Documentation location>/logical-data-model/
  catalog.yaml
  <subject-area-slug>.yaml   (one per subject area, mirrors Conceptual's subject areas)
```

## `catalog.yaml`
```yaml
model_context:
  subject_area: "Shared entity catalog"
  purpose: string
  layer: logical
entities:
  - name: string
    definition: string
    identifier: [string]        # attribute name(s) forming the unique key
    attributes:
      - name: string
        type: text | number | date | datetime | boolean | decimal
        required: true | false
assumptions: [string]
```

## `<subject-area-slug>.yaml` (one per subject area)
```yaml
model_context:
  subject_area: string
  purpose: string
  entities_ref: catalog.yaml
  layer: logical
relationships:
  - from: string                # must exist in catalog
    to: string                  # must exist in catalog
    verb: string
    cardinality: one-to-one | one-to-many | many-to-many
    optionality:
      from: mandatory | optional
      to: mandatory | optional
    foreign_key:
      on: string                # child entity holding the FK
      attribute: string         # FK attribute name (also present in that entity's attributes)
      references: string        # parent entity identifier
    rule: string
assumptions: [string]
```
