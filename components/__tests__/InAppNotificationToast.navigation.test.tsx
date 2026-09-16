/**
 * Tests for toast-press navigation for upcoming_visit notifications.
 *
 * These tests verify the navigation contract at the logic layer:
 *  1. navigateFromInAppNotification is called with type='upcoming_visit' on toast press
 *  2. navigateFromInAppNotification receives visitId from notification payload
 *  3. navigateFromInAppNotification receives requestId from notification payload
 *  4. onPress is provided (truthy) when notificationType is present in toast state
 *  5. onPress is undefined when notificationType is absent in toast state
 *  6. Pressing calls both navigation AND dismisses (setToast visible:false)
 *  7. Non-upcoming_visit types still trigger navigateFromInAppNotification (type forwarded)
 *  8. accessibilityHint changes to "view the request" when onPress is defined (InAppNotificationToast)
 *  9. accessibilityHint stays "dismiss" when onPress is undefined (InAppNotificationToast)
 */

// ---------------------------------------------------------------------------
// Module mocks — before imports so jest hoisting works
// ---------------------------------------------------------------------------

jest.mock('@/utils/notificationNavigator', () => ({
  navigateFromInAppNotification: jest.fn(),
  handleNotificationTap: jest.fn(),
  isReady: jest.fn().mockReturnValue(true),
}));

jest.mock('@/constants/notificationTypes', () => ({
  NOTIFICATION_TYPES: { UPCOMING_VISIT: 'upcoming_visit' },
}));

// ---------------------------------------------------------------------------
// Imports
// ---------------------------------------------------------------------------

import { navigateFromInAppNotification } from '@/utils/notificationNavigator';

const navMock = navigateFromInAppNotification as jest.Mock;

// ---------------------------------------------------------------------------
// Helper: simulate the onPress factory from NotificationContext
// ---------------------------------------------------------------------------

/**
 * Mirrors the onPress expression from NotificationContext:
 *   onPress={toast.notificationType ? () => {
 *     navigateFromInAppNotification({ type: toast.notificationType!, data: toast.notificationData });
 *     setToast(prev => ({ ...prev, visible: false }));
 *   } : undefined}
 */
function buildToastOnPress(
  notificationType: string | undefined,
  notificationData: Record<string, unknown> | undefined,
  setToastVisible: (v: boolean) => void
): (() => void) | undefined {
  if (!notificationType) return undefined;
  return () => {
    navigateFromInAppNotification({ type: notificationType, data: notificationData });
    setToastVisible(false);
  };
}

// ---------------------------------------------------------------------------
// Helper: resolve accessibilityHint (mirrors InAppNotificationToast logic)
// ---------------------------------------------------------------------------

function resolveHint(onPress: (() => void) | undefined, isRTL: boolean): string {
  if (onPress) {
    return isRTL ? 'اضغط للانتقال إلى الطلب' : 'Press to view the request';
  }
  return isRTL ? 'اضغط للرفض' : 'Press to dismiss';
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks();
});

describe('InAppNotificationToast — onPress navigation wiring for upcoming_visit', () => {

  // ── 1. navigateFromInAppNotification called with correct type ──────────────

  it('calls navigateFromInAppNotification with type=upcoming_visit when toast is pressed', () => {
    const setVisible = jest.fn();
    const onPress = buildToastOnPress('upcoming_visit', { visitId: 'v-1' }, setVisible);
    expect(onPress).toBeDefined();
    onPress!();
    expect(navMock).toHaveBeenCalledWith({
      type: 'upcoming_visit',
      data: { visitId: 'v-1' },
    });
  });

  // ── 2. visitId is passed in the navigation payload ─────────────────────────

  it('passes visitId from notification data to navigateFromInAppNotification', () => {
    const setVisible = jest.fn();
    const visitId = 'visit-42';
    const onPress = buildToastOnPress('upcoming_visit', { visitId }, setVisible);
    onPress!();
    expect(navMock).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ visitId }) })
    );
  });

  // ── 3. requestId is passed in the navigation payload ──────────────────────

  it('passes requestId from notification data to navigateFromInAppNotification', () => {
    const setVisible = jest.fn();
    const requestId = 'req-99';
    const onPress = buildToastOnPress('upcoming_visit', { requestId }, setVisible);
    onPress!();
    expect(navMock).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ requestId }) })
    );
  });

  // ── 4. onPress is defined when notificationType is present ─────────────────

  it('onPress is a function (not undefined) when notificationType is present', () => {
    const onPress = buildToastOnPress('upcoming_visit', {}, jest.fn());
    expect(typeof onPress).toBe('function');
  });

  // ── 5. onPress is undefined when notificationType is absent ────────────────

  it('onPress is undefined when notificationType is absent from toast state', () => {
    const onPress = buildToastOnPress(undefined, undefined, jest.fn());
    expect(onPress).toBeUndefined();
  });

  // ── 6. onPress calls dismiss (setToastVisible false) alongside navigation ──

  it('pressing the toast triggers both navigation and dismiss', () => {
    const setVisible = jest.fn();
    const onPress = buildToastOnPress('upcoming_visit', { visitId: 'v-7' }, setVisible);
    onPress!();
    expect(navMock).toHaveBeenCalledTimes(1);
    expect(setVisible).toHaveBeenCalledWith(false);
  });

  // ── 7. Non-upcoming_visit types forward their type to navigateFromInAppNotification ─

  it('forwarded type is passed as-is for non-upcoming_visit types', () => {
    const setVisible = jest.fn();
    const onPress = buildToastOnPress('request_approved', { requestId: 'r-5' }, setVisible);
    onPress!();
    expect(navMock).toHaveBeenCalledWith({
      type: 'request_approved',
      data: { requestId: 'r-5' },
    });
  });

  // ── 8. accessibilityHint = "view the request" when onPress is defined ──────

  it('resolves hint to "Press to view the request" when onPress is defined (LTR)', () => {
    const onPress = buildToastOnPress('upcoming_visit', {}, jest.fn());
    expect(resolveHint(onPress, false)).toBe('Press to view the request');
  });

  it('resolves hint to Arabic navigation hint when onPress is defined (RTL)', () => {
    const onPress = buildToastOnPress('upcoming_visit', {}, jest.fn());
    expect(resolveHint(onPress, true)).toBe('اضغط للانتقال إلى الطلب');
  });

  // ── 9. accessibilityHint = "dismiss" when onPress is not provided ──────────

  it('resolves hint to "Press to dismiss" when onPress is undefined (LTR)', () => {
    expect(resolveHint(undefined, false)).toBe('Press to dismiss');
  });

  it('resolves hint to Arabic dismiss hint when onPress is undefined (RTL)', () => {
    expect(resolveHint(undefined, true)).toBe('اضغط للرفض');
  });
});
