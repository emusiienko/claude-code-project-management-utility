<!-- Default format for the API Contracts artifact — accept as-is or customize with architect during Step 0 (Confirm Artifact Formats). Part of the Architecture folder (Technical Documentation) — created or updated only at Reconcile, never written directly in Project Setup or Plan Next Scope mode. One file per service/API — this format applies to each. -->

# API Contract: <Service Name>

Mandatory for every relationship in Solution Overview's Key Components graph that crosses a bounded-context boundary. For relations within the same bounded context, use judgment — formalize one here only if it warrants a stable contract even inside the context.

This document is the contract — every service it applies to must honor it exactly.

For each endpoint:

### [METHOD] [/path]
- **Request**: [TypeScript interface]
- **Response**: [TypeScript interface]
- **Errors**: [error responses — envelope shape defined once in Solution Overview's Error Handling subsection, referenced here, never restated]
- **Auth**: [auth requirements — mechanics defined once in Solution Overview's Authentication Flow subsection, referenced here, never restated]
- **Example**: [example request/response]
