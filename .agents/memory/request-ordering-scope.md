---
name: Request ordering scope
description: My Requests and Manager All Requests rely on backend-default creation ordering without sort parameters.
---

My Requests and Manager All Requests rely on backend-default original creation timestamp descending order; do not send sortBy/sortOrder or sort loaded pages locally.

**Why:** On 2026-09-11 the user confirmed the backend team will provide original creation date/time newest-first ordering automatically, superseding the earlier optional-parameter proposal. Scheduled dates and later edits must not determine ordering.

**How to apply:** Preserve filters, pagination, API response order and other consumers. Backend ordering before pagination remains a server responsibility; frontend serialization tests do not independently verify the live server.