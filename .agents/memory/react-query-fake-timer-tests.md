---
name: React Query fake-timer tests
description: How to drive debounce + React Query v5 hooks under jest fake timers with react-test-renderer without act warnings or stale observer results.
---

Pattern (see `__tests__/visitorRequestFormDuplicateCheck.test.tsx`):

- Advance time with `await act(async () => { await jest.advanceTimersByTimeAsync(ms); })`, then run a second, separate `flush` act with `advanceTimersByTimeAsync(0)`.
- A re-render queued inside an act scope (e.g. a debounce timer calling setState) only commits when that act exits, so the fetch it triggers has not even started by the time the first act returns. The second act drains the fetch promise and React Query's `setTimeout(0)` observer notification.

**Why:** Calling sync `jest.advanceTimersByTime` twice inside one async act produced "You called act(async () => ...) without await" warnings; a single `advanceTimersByTimeAsync` act left the observer with `data: undefined` because the commit happened after the timers were advanced.

**How to apply:** Any hook test mixing timers (debounce, retry, staleTime expiry) with React Query queries. Use a fresh `new QueryClient({ defaultOptions: { queries: { retry: false } } })` per test so hook-level `staleTime` is what the test proves (the app's provider sets a 30 s default that would mask a missing option).
