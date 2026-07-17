# Smoke-Test: Upcoming-Visit Alert

**Date:** 2026-07-17  
**Tester:** Code audit (Replit Agent) — physical device runs delegated to QA  
**Relevant files:**
- `hooks/useUpcomingVisitTimer.ts`
- `components/shared/VisitorRequestCard.tsx`
- `screens/BuffetAdmin/BuffetAdminDashboardScreen.tsx`
- `screens/Buffet/BuffetBoardScreen.tsx`

---

## Bugs fixed during this audit

| File | Bug | Fix |
|------|-----|-----|
| `screens/Buffet/BuffetBoardScreen.tsx` | `accessibilityLabel` hardcoded as `"Visit starts soon"` in RTL/Arabic | Now uses `isRTL ? 'الزيارة تبدأ قريباً' : 'Visit starts soon'` |
| `screens/BuffetAdmin/BuffetAdminDashboardScreen.tsx` | Same issue in `UpcomingVisitAlertIcon` | Same fix applied |

---

## Scenario checklist

Record **PASS / FAIL / SKIP** and date when running on each platform.

### S1 — Alert icon appears ~15 min before a scheduled visit

**How to test:**  
Create or find a visit with status `visitor_accepted` scheduled 14 minutes from now.
Open the Employee or Receptionist dashboard card for that visit and watch for the red alert-circle icon.

| Platform | Result | Tester | Date |
|----------|--------|--------|------|
| Web (code audit) | **PASS** | Agent | 2026-07-17 |
| iOS (Expo Go) | | | |
| Android (Expo Go) | | | |

**Code evidence (PASS on web):**  
`isUpcomingVisit` in `useUpcomingVisitTimer.ts` line 46–57:
```ts
const remainingMs = startDate.getTime() - nowFn();
const thresholdMs = thresholdMinutes * 60 * 1000; // 900 000 ms for 15 min
return remainingMs > 0 && remainingMs <= thresholdMs;
```
Only `visitor_accepted` status passes the eligibility gate (`UPCOMING_INDICATOR_ELIGIBLE_STATUSES`).

---

### S2 — Alert icon disappears the moment the visit starts (no stale icon)

**How to test:**  
Wait for (or fast-forward device clock to) the exact start minute of a visit that showed the alert.
Confirm the icon is gone without needing a manual refresh.

| Platform | Result | Tester | Date |
|----------|--------|--------|------|
| Web (code audit) | **PASS** | Agent | 2026-07-17 |
| iOS (Expo Go) | | | |
| Android (Expo Go) | | | |

**Code evidence (PASS on web):**  
`scheduleNextCheck` in `useUpcomingVisitTimer.ts` line 89–121: when `remainingMs ≤ 60 000 ms`,
`cappedMs = remainingMs` (below the 60 s cap), so the timeout fires **at exactly** the start time.
The subsequent `calculate()` call returns `false` (remainingMs ≤ 0), setting `isUpcoming = false`.

---

### S3 — Returning app to foreground recalculates immediately

**How to test:**  
Background the app when alert should be showing. Wait until the visit start time passes.
Bring the app back to foreground. Confirm the icon is gone (or appeared) without waiting.

| Platform | Result | Tester | Date |
|----------|--------|--------|------|
| Web (visibilitychange) | **PASS** | Agent | 2026-07-17 |
| iOS (AppState) | | | |
| Android (AppState) | | | |

**Code evidence (PASS on web):**  
`useUpcomingVisitTimer.ts` line 148–164: `visibilitychange` listener calls `calculate()` synchronously
on `document.visibilityState === 'visible'`.  
Line 137–146: `AppState 'change'` handler fires `calculate()` when `nextState === 'active'` — same
immediate recalculation path for iOS and Android.

---

### S4 — RTL/Arabic layout: icon on correct side, no layout shift

**How to test:**  
Switch device/app language to Arabic. Open the Buffet Staff board and Buffet Admin dashboard.
Confirm the alert icon sits immediately to the right of (or adjacent to) the status badge and does not
push other card elements out of alignment.

| Screen | LTR | RTL | Tester | Date |
|--------|-----|-----|--------|------|
| `VisitorRequestCard` | **PASS** (code audit) | **PASS** (code audit) | Agent | 2026-07-17 |
| `BuffetAdminDashboardScreen` | **PASS** (code audit) | **PASS** (code audit) | Agent | 2026-07-17 |
| `BuffetBoardScreen` | **PASS** (code audit) | **PASS** (code audit) | Agent | 2026-07-17 |
| Buffet Admin — physical iOS | | | | |
| Buffet Admin — physical Android | | | | |
| Buffet Staff — physical iOS | | | | |
| Buffet Staff — physical Android | | | | |

**Code evidence:**  
All three screens wrap the `[alert-icon][status-badge]` pair in `DirectionalRow`.
`DirectionalRow` applies `flexDirection: 'row-reverse'` in RTL, mirroring the pair to the leading (right)
side with correct internal order. No absolute positioning used — no layout shift risk.  
`marginEnd: 4` on the icon maps to `marginLeft` in RTL, providing a correct 4 px gap in both directions.

---

### S5 — No alert for completed, cancelled, or checked-in visits

**How to test:**  
View cards with statuses `completed`, `cancelled`, `checked_in`, `visitor_rejected` around the visit
start time. Confirm no alert icon appears on any of them.

| Platform | Result | Tester | Date |
|----------|--------|--------|------|
| Web (code audit) | **PASS** | Agent | 2026-07-17 |
| iOS (Expo Go) | | | |
| Android (Expo Go) | | | |

**Code evidence (PASS on web):**  
`VisitorRequestCard`: `eligible = UPCOMING_INDICATOR_ELIGIBLE_STATUSES.includes(request.status)`
— only `visitor_accepted` qualifies. Hook short-circuits to `false` immediately when `eligible = false`
(`useUpcomingVisitTimer.ts` line 81, 166).  
Buffet screens use separate per-screen lists (`pending/preparing/ready` for staff;
`pending/assigned/in_progress` for admin) with the same `eligible` gate.

---

## Summary

| Scenario | Code audit | iOS device | Android device |
|----------|-----------|------------|----------------|
| S1 — appears 15 min before | PASS | | |
| S2 — disappears at start time | PASS | | |
| S3 — foreground recalculates | PASS | | |
| S4 — RTL layout (Buffet Admin) | PASS | | |
| S4 — RTL layout (Buffet Staff) | PASS | | |
| S5 — no alert on ineligible statuses | PASS | | |

Fill in the iOS/Android columns with PASS/FAIL after running on physical devices via Expo Go.

---

## Physical device setup

1. Start the Replit dev server (click **Run** or start the **Start application** workflow).
2. Open Expo Go on an iOS or Android device.
3. Tap the QR-code icon in the Replit URL bar and scan the tunnel QR.
4. Log in as **Buffet Staff** or **Buffet Admin** as appropriate for each scenario.
5. For timing scenarios (S1, S2, S3): either create a test visit 14 minutes out, or temporarily adjust
   the device clock to be 14 minutes before an existing `visitor_accepted` visit.
6. For RTL scenarios (S4): go to device Settings → Language and add Arabic, or use the in-app language
   toggle if available.
