# Why the VMS app still feels slow in production

_Date: 15 Sep 2026 · Scope: web deployment (`vms-qa-frontend-folio3.replit.app`) and EAS production builds · Roles examined: Employee, Manager, Receptionist, Building Admin_

## 1. Summary

The slowness is not one problem; it is five independent problems that stack on top of each other, and **all five live in this repository**. Deploying to a server or shipping a production build does not remove any of them, because they are either baked into the JavaScript itself (splash logic, request patterns, fonts) or into the tiny Node server that serves the web build (`server.js`).

| # | What the user feels | Root cause | Where | Evidence | Fix queued? |
|---|---|---|---|---|---|
| 1 | Every cold start sits on the splash for ~5 s, even on a fast network | The splash hand-off callback is captured on the first render while `languageLoading` is still `true`, so the intended 800 ms hand-off is a no-op; the app only proceeds when the 5 s safety timer fires | `screens/Auth/SplashScreen.tsx:41-54`, `App.tsx:288-293`, `App.tsx:305-316` | **Measured** (executed the real `App.tsx`: first non-splash frame at exactly 5 000 ms) | Partly, task #207 (plan must name this bug explicitly) |
| 2 | Web: long blank page before anything paints; every reload is as slow as the first visit | Server sends ~4.9 MB of JS and ~2.3 MB of fonts **uncompressed** and with `Cache-Control: no-store`, so nothing is ever cached and nothing is gzipped | `server.js:12-18`, `server.js:25-29` | **Measured** (live headers: no `Content-Encoding`, `no-cache, no-store, must-revalidate`) | **No** |
| 3 | Web: first paint waits for 2.3 MB of fonts that are then not even used; native builds ship 1.5 MB of dead fonts | 15 font files are loaded up front; 5 of them are referenced nowhere; on web the theme asks for CSS family names (`'Albert Sans'`) that are never registered, so the browser falls back to system fonts anyway | `App.tsx:412-427`, `constants/theme.ts:263-336`, missing `public/index.html` | **Code-verified** + build output (`dist/index.html` has 0 `@font-face` rules) | Partly, task #207 step 5 (gating only) |
| 4 | Returning users wait on a spinner after the splash; flaky network signs them out | Startup reads the cached user from storage but never renders it; it blocks on `GET /users/me`, and _any_ error there deletes the tokens | `contexts/AuthContext.tsx:323-372` | **Code-verified** | Yes, task #207 |
| 5 | Dashboards and lists "load" constantly, even with data already on screen; heavy accounts issue dozens of sequential requests | Auto-paging of whole result sets, refetch-on-every-focus, skeletons shown during background refetches, duplicate unread-count polling, per-keystroke duplicate checks, no request timeout | see §5–§7 | **Code-verified** (per-file references below) | Partly: #208 (lists), #209 (form), #210 (timeouts). Dashboard request volume: **No** |

**Backend:** the endpoints that could be probed without credentials answered in 130–270 ms. Heavy list endpoints were not measurable from here. Nothing found so far points at the backend as the primary cause; task #210 (in-app timing) is what produces the evidence needed before escalating.

---

## 2. How this was established

Three kinds of evidence are used; each finding below is tagged with one of them.

- **Measured** — the real code was executed. For startup, the real `App.tsx` → `LanguageProvider` → `AppContent` → `SplashScreen` tree was mounted in a Jest harness with fake timers, fonts and auth resolved instantly, and only leaf screens (Login, Dashboard) stubbed. For the web server, the published site was fetched with `curl` and the response headers and body sizes recorded.
- **Code-verified** — the exact lines were traced and the behaviour follows from them without runtime ambiguity.
- **Estimate** — arithmetic on measured sizes (e.g. download time at a given bandwidth).

Note on the dev preview: the Replit preview serves a 13.5 MB unminified development bundle with per-render `console.log` calls still in place (`App.tsx:336-343`; they are only stripped when `NODE_ENV=production`, `babel.config.js`). That makes the preview slower than production, but none of the findings below depend on it.

---

## 3. Startup: the 5-second splash (all platforms)

### What happens

1. `SplashScreen` starts a 500 ms timer, then a 300 ms timer, then calls `onFinish(false)` — the callback it received **on its first render** (`SplashScreen.tsx:48-54`; the effect has an empty dependency array).
2. That first-render callback is `handleSplashFinish` from `App.tsx:288-293`, which only hides the splash `if (!languageLoading)`. On the first render `languageLoading` is `true` (`contexts/LanguageContext.tsx:80` initialises `isLoading` to `true`).
3. So at 800 ms the hand-off runs, evaluates the stale `true`, and does nothing. Nothing else ever calls `onFinish` again.
4. The app proceeds only when the safety timer in `App.tsx:305-316` fires at 5 000 ms and logs `[AppContent] Initialization timeout - forcing app to proceed`.

### Measured timeline (real `App.tsx`, fonts and auth instant)

```
locale already cached (web / warm start):      first non-splash frame at 5000 ms
                                               "Initialization timeout" warning at 5000 ms
harness cold start without cached locale:      AppContent mounted at 3000 ms (locale failsafe),
                                               first non-splash frame at 8000 ms
SplashScreen's own timers finish at:           800 ms
```

The second line shows a second failsafe in the same file: if the locale bootstrap read has not completed, `App` waits for a 3 s timer before rendering anything. In the harness the bootstrap never completed; on a device it normally will, so treat 5 s as the everyday cost and 8 s as the worst case.

### Why production does not help

This is pure client logic. It is the same on the published web site, in TestFlight and in the Play Store build. The "Initialization timeout" warning is one of the two console methods that survive the production console-stripping, so it is also visible in production logs.

### Also in this phase

- After the splash, `App.tsx:349-357` shows a second, differently styled full-screen spinner while `authLoading` is true, and then the screen — three visual stages with different backgrounds. Users read that as "still loading".
- `LanguageProvider` re-reads the locale from storage on mount and gates rendering on it a second time (`LanguageContext.tsx:85-127`) even though `App` already waited for the same read.

**Task coverage:** #207 step 3 ("remove fixed splash delays") is aimed here, but the plan text does not name the stale-callback gate. If the timers are removed and the gate is left in place, the 5 s failsafe stays the effective path. The plan needs one explicit line: _the hand-off must observe the current `languageLoading` value (or `AppContent` must hide the splash itself when both the splash animation and language loading are done)._

---

## 4. Web delivery: no compression, no caching, blocked first paint

### 4.1 `server.js` (Measured)

Every response, including the hashed JavaScript bundle and the font files, is sent with:

```
Cache-Control: no-cache, no-store, must-revalidate      (server.js:16)
express.static(..., { maxAge: 0 })                       (server.js:25-29)
```

and there is no compression middleware. Live check of the published site:

| Asset | Size on the wire | `Content-Encoding` | Cacheable |
|---|---|---|---|
| `_expo/static/js/web/index-1f3e0ad1….js` | 4 902 946 B (4.9 MB) | none | no |
| 15 font files | ≈2.3 MB total | none | no |
| `index.html` | 1 225 B | none | no |

The same 4.9 MB bundle compresses to roughly 1.3 MB with gzip (Estimate, measured on the local `dist/` copy). Because the bundle file name contains a content hash, it could be cached for a year with `immutable`; only `index.html` needs `no-store`.

**Estimate of the cost per visit** (7.2 MB, uncompressed, uncached):

| Connection | Every visit today | First visit after fix (≈1.3 MB JS + only used fonts) | Repeat visit after fix |
|---|---|---|---|
| 10 Mbps (office Wi-Fi under load, 4G) | ≈ 5.8 s of pure download | ≈ 1.5 s | ≈ 0 s (served from cache) |
| 25 Mbps | ≈ 2.3 s | ≈ 0.6 s | ≈ 0 s |
| 100 Mbps | ≈ 0.6 s | ≈ 0.15 s | ≈ 0 s |

These seconds come **before** the 5 s splash in §3; they add up.

Autoscale cold start of the Node server itself was 0.5–0.7 s and is not a factor.

**Task coverage:** none of #207–#210 touches `server.js`. This is the cheapest fix in the whole report (add `compression`, set long `maxAge`/`immutable` for `/_expo/static` and `/assets`, keep `no-store` for `index.html`).

### 4.2 Fonts (Code-verified)

`App.tsx:412-427` loads 15 font files before the app renders; on web `App` returns `null` until `useFonts` resolves, so the first paint waits for all of them.

| Family / weight | Files | Size | Referenced by |
|---|---|---|---|
| Inter 400/500/600/700 | 4 | 1 348 KB | only `FontFamilyFallback` (`theme.ts:327-336`), which nothing imports → **dead** |
| FS Albert Arabic 100 Thin | 1 | 124 KB | nothing → **dead** |
| FS Albert Arabic 300/400/700/800 | 4 | 500 KB | theme (`arabic*` tokens) |
| Albert Sans 300–800 | 6 | ≈280 KB | theme (`latin*` tokens) |
| **Total loaded** | **15** | **≈2.25 MB** | **5 files / 1.47 MB (65%) are never used** |

On web there is a second problem: the theme's web font families are CSS names — `'Albert Sans'`, `'FS Albert Arabic'` (`theme.ts:263-323`). Those names were meant to be defined by `@font-face` rules in the HTML template. Expo SDK 50+ reads the template from `public/index.html`, which does not exist in this repo, so the exported `dist/index.html` (1 225 bytes) contains **zero** `@font-face` rules. `expo-font` on web registers the downloaded files under the key names (`AlbertSans_400Regular`), which the web theme never asks for. Net effect on web: 2.3 MB downloaded and blocking first paint, then rendered in the system font.

On native the files are bundled, so download is not the issue, but 1.47 MB of dead assets still ship in every APK/IPA and are decoded at start-up.

**Task coverage:** #207 step 5 only stops gating first paint on fonts. Removing the dead files, restoring a `public/index.html` with `@font-face` + `font-display: swap` (or switching the web theme to the registered key names) is not queued.

---

## 5. Startup: the session restore blocks on the network (Code-verified)

`contexts/AuthContext.tsx:323-372`, in order:

1. Read tokens from storage.
2. Read the cached user from storage (`:331-332`) — **loaded but never rendered**.
3. `await authService.getCurrentUser()` (`:334`) — the app stays in `isLoading: true` until this returns, so `App.tsx:349-357` shows the spinner and the dashboard cannot mount.
4. Any exception in step 3 — including a timeout or a dropped connection — runs `AsyncStorage.multiRemove([AUTH_STORAGE_KEY, TOKEN_STORAGE_KEY])` and sets `isAuthenticated: false` (`:362-372`). A returning user on a poor connection is signed out and sent to Login.

There is no timeout on the request (see §8), so a hung `/users/me` means an indefinite spinner.

**Task coverage:** #207 steps 1, 2 and 4 cover this fully (optimistic restore from the cached user, background refresh, sign out only on a definitive 401).

---

## 6. Dashboards: request volume and skeleton flashes (Code-verified)

### 6.1 Employee / Manager overview (`screens/Dashboard/OverviewScreen.tsx`)

| Source | Behaviour | Requests |
|---|---|---|
| KPI section (`components/shared/DashboardKpiSection.tsx:46-52`) | `refetch()` on **every** focus, including the initial mount; `refetch` ignores the 60 s `staleTime` | 1 per focus |
| KPI section (`DashboardKpiSection.tsx:65-73`) | renders skeleton whenever `isFetching`, i.e. the real numbers are replaced by grey bars on every return to the dashboard | — |
| Focus effect (`OverviewScreen.tsx:183-201`) | refetches 2 (employee) or 3 (manager) list sections on every focus, including the initial mount | 2–3 per focus |
| Monthly visits (`OverviewScreen.tsx:281-309`, `useInfiniteVisitsQuery` `hooks/queries/useApprovalQueries.ts:283-296`) | `limit: 100` and an effect that calls `fetchNextPage` until `hasNextPage` is false → downloads the **entire month** sequentially before the section settles | ⌈visits this month / 100⌉, sequential |
| Unread notification count | fetched by `ScreenWrapper` (`navigation/DashboardContainer.tsx:193-195`, 2 min interval) **and** by `NotificationContext` directly | 2 on mount, then 2 pollers |

A manager with 250 visits this month pays roughly **9 requests on first mount** (KPI, pending, awaiting, walk-ins, visits ×3, unread ×2) and **4–5 more on every return** to the dashboard, with the KPI row flashing to skeleton each time. On the initial mount TanStack Query deduplicates the focus refetch against the in-flight fetch, so the cost there is the auto-paging, not the double call; on every later focus the refetch is a real request.

### 6.2 Receptionist dashboard (`screens/Receptionist/ReceptionistDashboardScreen.tsx`)

- Today's visitors list is polled every 60 s.
- "All visits, last 3 days" uses `limit: 100` and auto-pages every page.
- The **whole screen** stays on skeleton until both have finished (`:326-332`), so a busy building (e.g. 300 visits in 3 days) means 1 + 3 sequential requests before the receptionist sees anything.

**Task coverage:** PROPOSED tasks #146/#148/#149 change only the loading UX ("no query param changes"). Bounding the auto-paging, skipping the initial-mount focus refetch, keeping KPI numbers on screen during a background refetch, and removing the duplicate unread-count poller are **not queued**.

---

## 7. Lists and forms (Code-verified)

- **All Requests / Admin lists** (`hooks/queries/useAllRequestsQuery.ts`): selecting a status filter triggers `shouldAutoFetchAllVisitorPages`, which walks every page sequentially. For a tenant with 40 pages that is 40 requests for one tap. Filter, search and return-to-screen also refetch already-downloaded pages. → **task #208**.
- **Create Visit form** (`screens/Visitor/VisitorRequestFormScreen.tsx:235-247`): the duplicate-check query parameters are derived from the raw email/phone input on every render, so each keystroke produces a new query key and a new `GET /visits?date=…&email=…`. Typing `john.doe@example.com` sends 20 requests. → **task #209**.

---

## 8. API layer (Code-verified + Measured)

- `api/httpClient.ts` sets no request timeout; a request that the network drops silently keeps the screen in its loading state until the user navigates away. Combined with §5 this can also sign users out.
- There is no timing instrumentation, so today there is no way to tell a slow endpoint from a slow client.
- Measured from this environment (unauthenticated endpoints only): 130–270 ms per call. That is healthy, but it says nothing about `/visits`, `/approvals/*` or `/dashboard/kpis` under real filters. → **task #210** adds the timing and a 30 s cap; its output is the evidence the backend team will ask for.

---

## 9. What is **not** the cause

- **Server cold start** — 0.5–0.7 s on autoscale, negligible next to the items above.
- **Production bundle size as such** — 4.9 MB minified is normal for an Expo web app of this size; it only hurts because it is uncompressed and uncached.
- **Backend latency on light endpoints** — measured fast. Heavy endpoints remain unmeasured, not exonerated.
- **React Compiler / new architecture** — no rendering hot spots were found that would explain seconds of delay; the delays above are timers, network round-trips and bytes.

---

## 10. Recommended order and expected gain

| Order | Change | Platforms | User-visible gain | Size of change | Queued |
|---|---|---|---|---|---|
| 1 | `server.js`: gzip/brotli + `immutable` caching for hashed assets, `no-store` only for `index.html` | web | −75 % bytes on first visit; repeat visits download ≈0 bytes of JS/fonts | ~15 lines, no app code | **No** |
| 2 | Fix the splash hand-off (stale `languageLoading` gate) and remove the fixed timers | all | −4.2 s on every cold start | small | #207 (needs the bug named in the plan) |
| 3 | Remove the 5 dead font files; add `public/index.html` with `@font-face`/`font-display: swap` or point the web theme at the registered family names; stop gating web first paint on fonts | web + native | −1.47 MB per web visit and per app install; web paints before fonts arrive and actually shows the brand font | small–medium | partly #207 step 5 |
| 4 | Optimistic session restore; never sign out on network errors | all | returning users see the dashboard immediately; no surprise log-outs | medium | #207 |
| 5 | Dashboard request diet: bound monthly / 3-day auto-paging, no refetch on initial focus, keep KPI values visible during background refetch, single unread-count poller | all | fewer requests per visit, no skeleton flash on every return | medium | **No** |
| 6 | Lists: stop re-downloading pages on filter/search/return; cap auto-fetch-all | all | filter taps go from N requests to 1 | medium | #208 |
| 7 | Create Visit: debounce the duplicate check, query on blur/valid input only | all | 1 request instead of one per keystroke | small | #209 |
| 8 | In-app API timing + 30 s timeout | all | no infinite spinners; hard numbers per endpoint for the backend team | small | #210 |

Items 1–3 alone remove the two largest fixed costs on the web (the 5 s splash and the multi-megabyte uncached download) and need no backend involvement.

---

## 11. How to confirm the fixes

| Metric | Today | Target |
|---|---|---|
| Time from page load to first non-splash frame (web, fonts cached) | ≥ 5.0 s (measured) | ≤ 1.0 s |
| Bytes transferred on a repeat visit (web) | ≈ 7.2 MB | < 100 KB (HTML + API JSON) |
| `Content-Encoding` on the JS bundle | none | `gzip` or `br` |
| Font files requested on web | 15 | ≤ 10, none blocking first paint |
| Requests on Manager dashboard first mount (250 visits/month) | ≈ 9 | ≤ 6, none sequential beyond page 1 |
| Requests on returning to the dashboard within 60 s | 4–5 + KPI skeleton flash | 0–1, data stays on screen |
| Requests while typing a 20-character email in Create Visit | 20 | 1 |
| Requests when choosing a status filter in All Requests (40 pages) | 40 | 1 |
| Longest a request may hang | unbounded | 30 s |

---

## Appendix A — Splash measurement method

Jest (`jest-expo` preset, fake timers). The real `App` default export from `App.tsx` was mounted with `react-test-renderer`; `expo-font`'s `useFonts` returned `[true, null]` immediately; `AuthProvider`/`useAuth` were stubbed as "not authenticated, not loading"; `LoginScreen`, `DashboardContainer` and the legal/invite screens were replaced by text stubs; `LanguageProvider`, `AppContent` and `SplashScreen` were the real implementations. Timers were advanced in 100 ms steps and the rendered tree inspected after each step. Two variants were run: locale cached (`getCachedLocale()` returns `"en"`) and locale not cached. Results are in §3. The harness was a throw-away and is not part of the repository.

## Appendix B — Production web headers (live)

```
GET /_expo/static/js/web/index-1f3e0ad1d422cd7db67e5a7861e35ed4.js
  content-length: 4902946
  cache-control: no-cache, no-store, must-revalidate
  (no content-encoding header)

GET /assets/…/AlbertSans_400Regular.<hash>.ttf   → same cache-control, no content-encoding
GET /                                              → 1225-byte index.html, 0 @font-face rules
```

## Appendix C — Font inventory (`App.tsx:412-427`)

| Key | File | KB | Used |
|---|---|---|---|
| Inter_400Regular | assets/fonts/Inter_400Regular.ttf | 336 | no |
| Inter_500Medium | assets/fonts/Inter_500Medium.ttf | 336 | no |
| Inter_600SemiBold | assets/fonts/Inter_600SemiBold.ttf | 336 | no |
| Inter_700Bold | assets/fonts/Inter_700Bold.ttf | 340 | no |
| AlbertSans_300Light … _800ExtraBold | @expo-google-fonts/albert-sans (6 files) | ≈280 | yes (native names; web needs `@font-face`) |
| FSAlbertArabic_100Thin | assets/fonts/arabic/…-Thin.ttf | 124 | no |
| FSAlbertArabic_300Light | assets/fonts/arabic/…-Light.ttf | 124 | yes |
| FSAlbertArabic_400Regular | assets/fonts/arabic/…-Regular.ttf | 124 | yes |
| FSAlbertArabic_700Bold | assets/fonts/arabic/…-Bold.ttf | 124 | yes |
| FSAlbertArabic_800ExtraBold | assets/fonts/arabic/…-ExtraBold.ttf | 128 | yes |
