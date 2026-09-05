<!-- Default format for the Persistence Map artifact — accept as-is or customize with architect during Step 0 (Confirm Artifact Formats). Ships a default because its shape doesn't depend on storage platform, unlike per-platform Physical Data Model formats (see architect's DATA MODELING > "New storage platform"). Only produced when the system uses more than one storage technology. -->

# Persistence Map — template
#
# The top-level record binding a polyglot (mixed-storage) system together.
# It answers three questions and nothing else:
#   1. What stores exist?                        -> stores
#   2. Which store holds each business entity?   -> assignments
#   3. Which relationships cross store boundaries? -> cross_store_relationships
#
# It carries NO structural detail (fields, types, indexes). That belongs to
# each store's Physical Data Model. This is the index; the PDMs are the contents.
#
# Every entity name here must match the logical model exactly. The map never
# invents business entities; it only places existing ones.
#
# Fields marked (optional) may be omitted. Everything else is required.

model_context:
  purpose: string                    # one line: what system this maps
  layer: persistence_map
  logical_model_ref: string          # reference to the canonical logical model

# --- What stores exist ------------------------------------------------------
# Topology is a precondition (from architecture decision records). Do not
# invent stores; list only those already decided.
stores:
  - id: string                       # short id, referenced below (e.g. core_db)
    platform: string                 # e.g. "PostgreSQL 16", "Redis 7", "Neo4j 5"
    role: string                     # system_of_record | derived_index | cache
                                     #  | replica | event_log | search | ...
    description: string              # (optional) what this store is for

# --- Which store holds each entity ------------------------------------------
# One entry per independently-persisted logical entity. Every persisted entity
# must appear; an entity deliberately not persisted (transient/computed) or only
# embedded in another is noted in assumptions instead.
assignments:
  - entity: string                   # exact logical-model entity name
    system_of_record: string         # store id — THE authoritative store (exactly one)
    also_in:                         # (optional) derived copies in other stores
      - store: string                # store id holding the copy
        purpose: string              # why this copy exists (e.g. "full-text search")
        derives_from: string         # source store id (usually the SoR)
        sync: string                 # mechanism + timing (e.g. "CDC, near-real-time")
        consistency: string          # strong | eventual | read-through | write-through
        fields: string               # (optional) "all" or a note that it is a subset
                                     #   (e.g. "searchable fields only")

# --- Which relationships cross store boundaries -----------------------------
# A business relationship whose two ends live in different stores. Same-store
# relationships are NOT listed here — they live in that store's Physical Data
# Model. This list is what shows the system's true cross-store connectivity in
# one place, and what lets a consumer resolve a cross-store reference to a store.
cross_store_relationships:
  - name: string                     # readable label (e.g. "order_belongs_to_customer")
    from_entity: string              # entity on the referencing side
    from_store: string               # store id where from_entity lives
    to_entity: string                # entity on the referenced side
    to_store: string                 # store id where to_entity lives
    mechanism: string                # reference_by_key | field_denormalization
                                     #  | application_join
    integrity: string                # how integrity is guaranteed:
                                     #  application_enforced | none | eventual
    notes: string                    # (optional) e.g. which fields are denormalized,
                                     #   staleness risk, resolution responsibility

# --- Anything inferred, deferred, or deviating ------------------------------
assumptions: [string]                # e.g. entities not persisted, coverage gaps,
                                     #   assignments awaiting confirmation
