---
name: Infinite-query error boundaries
description: Rules for separating primary refresh state from pagination state in infinite React Query lists.
---

Treat primary refreshes and next-page requests as separate loading and error channels. A next-page failure must keep existing rows visible, show retry at the list footer or load-more control, and never trigger the screen's primary error UI.

**Why:** Infinite-query flags overlap: a failed page can set the query's general error state, and end-reached or range-completion effects can immediately retry once fetching stops. Without explicit guards, one page failure can become a modal/full-screen error or an automatic retry loop.

**How to apply:** Exclude next-page errors from primary alerts and banners. Pause automatic page loading after a page error until the user retries. Block automatic end-reached/range loading while any query fetch is active so pull-to-refresh and pagination cannot race. For manual retry, combine query-state guards with an immediate ref lock and non-cancelling fetch semantics; render-state flags alone cannot block two presses in the same event batch.