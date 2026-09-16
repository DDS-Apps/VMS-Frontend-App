/**
 * Runs the real App root (AppContent, AuthProvider, LanguageProvider) with
 * leaf screens stubbed and measures how long the custom splash stays up.
 *
 * Before the optimistic-restore work the first non-splash frame only appeared
 * when the 5 s "Initialization timeout" failsafe fired. These tests pin the
 * hand-off to readiness instead of timers.
 */
import React from "react";
import { Platform, Text } from "react-native";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import AsyncStorage from "@react-native-async-storage/async-storage";

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

let mockFontsState: [boolean, Error | null] = [true, null];
jest.mock("expo-font", () => ({
  useFonts: () => mockFontsState,
}));

jest.mock("expo-splash-screen", () => ({
  preventAutoHideAsync: jest.fn(() => Promise.resolve()),
  hideAsync: jest.fn(() => Promise.resolve()),
}));

jest.mock("expo-status-bar", () => ({ StatusBar: () => null }));

jest.mock("react-native-gesture-handler", () => {
  const { View } = require("react-native");
  return { GestureHandlerRootView: View };
});

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
}));

const passthroughProvider = (name: string) => ({
  [name]: ({ children }: { children: React.ReactNode }) => children,
});

jest.mock("@/components/KeyboardProviderWrapper", () => passthroughProvider("KeyboardProviderWrapper"));
jest.mock("@/components/ErrorBoundary", () => passthroughProvider("ErrorBoundary"));
jest.mock("@/contexts/NotificationContext", () => passthroughProvider("NotificationProvider"));
jest.mock("@/contexts/ToastContext", () => passthroughProvider("ToastProvider"));
jest.mock("@/contexts/PortalContext", () => passthroughProvider("PortalProvider"));

jest.mock("@/providers/QueryProvider", () => ({
  QueryProvider: ({ children }: { children: React.ReactNode }) => children,
  queryClient: { removeQueries: jest.fn() },
}));

jest.mock("@/hooks/queries/useDashboardKpiQuery", () => ({
  dashboardKpiKeys: {
    all: ["dashboard-kpis"],
    byIdentity: (identity: string) => ["dashboard-kpis", identity],
  },
}));

jest.mock("@/screens/Auth/SplashScreen", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return { __esModule: true, default: () => React.createElement(Text, null, "SPLASH") };
});

jest.mock("@/screens/Auth/LoginScreen", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return { __esModule: true, default: () => React.createElement(Text, null, "LOGIN") };
});

jest.mock("@/navigation/DashboardContainer", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return {
    __esModule: true,
    default: ({ userRole, userName }: { userRole: string; userName: string }) =>
      React.createElement(Text, null, `DASHBOARD:${userRole}:${userName}`),
  };
});

jest.mock("@/screens/Visitor/VisitorInviteScreen", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return { __esModule: true, default: () => React.createElement(Text, null, "INVITE") };
});

jest.mock("@/screens/Legal/PrivacyPolicyScreen", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return { __esModule: true, default: () => React.createElement(Text, null, "PRIVACY") };
});

jest.mock("@/screens/Legal/TermsConditionsScreen", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return { __esModule: true, default: () => React.createElement(Text, null, "TERMS") };
});

jest.mock("@/navigation/navigationRef", () => ({
  navigationRef: { isReady: () => false, navigate: jest.fn() },
}));

jest.mock("@/services/state/buffetAdminState", () => ({ setCurrentStaff: jest.fn() }));
jest.mock("@/services/state/valetAdminState", () => ({ setCurrentDriver: jest.fn() }));
jest.mock("@/utils/restartApp", () => ({ restartApp: jest.fn(() => Promise.resolve()) }));

const mockGetCurrentUser = jest.fn();
jest.mock("@/services/api/authService", () => ({
  authService: {
    getCurrentUser: (...args: unknown[]) => mockGetCurrentUser(...args),
    login: jest.fn(),
    azureLogin: jest.fn(),
    logout: jest.fn(() => Promise.resolve()),
    checkHealth: jest.fn(),
  },
}));

jest.mock("@/services/push", () => ({
  pushNotificationService: {
    initialize: jest.fn(() => Promise.resolve()),
    unregister: jest.fn(() => Promise.resolve()),
  },
}));

jest.mock("@/services/crashlytics/crashlyticsService", () => ({
  crashlyticsService: {
    setUserAttributes: jest.fn(() => Promise.resolve()),
    clearUserAttributes: jest.fn(() => Promise.resolve()),
  },
}));

import App from "@/App";
import { setCachedLocale } from "@/utils/localeManager";

const TOKEN_STORAGE_KEY = "@vms_tokens";
const AUTH_STORAGE_KEY = "@vms_auth";

const storedTokens = {
  accessToken: "access-token",
  refreshToken: "refresh-token",
  expiresAt: Date.now() + 60 * 60 * 1000,
};

const cachedUser = {
  id: "user-1",
  email: "host@example.com",
  name: "Cached Name",
  role: "employee",
};

const collectText = (renderer: ReactTestRenderer): string =>
  renderer.root
    .findAllByType(Text)
    .map((node) => node.props.children)
    .flat()
    .filter((child) => typeof child === "string")
    .join("|");

const hasActivityIndicator = (renderer: ReactTestRenderer): boolean => {
  const { ActivityIndicator } = require("react-native");
  return renderer.root.findAllByType(ActivityIndicator).length > 0;
};

/** Lets pending promise chains (storage reads, state updates) settle without advancing timers. */
const settle = async () => {
  await act(async () => {
    for (let i = 0; i < 20; i += 1) {
      await Promise.resolve();
    }
  });
};

const advance = async (ms: number) => {
  await act(async () => {
    jest.advanceTimersByTime(ms);
  });
  await settle();
};

/**
 * Advances fake time in small steps and returns how many ms elapsed before
 * the tree stopped showing the splash marker.
 */
const measureSplashHandoff = async (renderer: ReactTestRenderer, limitMs: number): Promise<number> => {
  let elapsed = 0;
  const step = 50;
  while (collectText(renderer).includes("SPLASH") && elapsed < limitMs) {
    await advance(step);
    elapsed += step;
  }
  return elapsed;
};

const mountApp = async () => {
  let renderer!: ReactTestRenderer;
  await act(async () => {
    renderer = create(<App />);
  });
  await settle();
  return renderer;
};

const unmount = (renderer: ReactTestRenderer) => {
  act(() => {
    renderer.unmount();
  });
};

describe("app startup hand-off", () => {
  let warnSpy: jest.SpyInstance;

  beforeEach(async () => {
    jest.useFakeTimers();
    await AsyncStorage.clear();
    mockFontsState = [true, null];
    mockGetCurrentUser.mockReset();
    warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    jest.spyOn(console, "log").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});
    // Simulates index.js having finished the async locale bootstrap.
    setCachedLocale("en");
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  const timeoutWarningFired = () =>
    warnSpy.mock.calls.some((call) => String(call[0]).includes("Initialization timeout"));

  it("shows the dashboard from the cached session while the profile request is still pending", async () => {
    await AsyncStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(storedTokens));
    await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(cachedUser));
    mockGetCurrentUser.mockReturnValue(new Promise(() => {}));

    const renderer = await mountApp();
    const handoffMs = await measureSplashHandoff(renderer, 6000);

    expect(handoffMs).toBeLessThanOrEqual(100);
    expect(collectText(renderer)).toContain("DASHBOARD:employee:Cached Name");
    expect(hasActivityIndicator(renderer)).toBe(false);

    await advance(6000);
    expect(timeoutWarningFired()).toBe(false);

    unmount(renderer);
  });

  it("reaches the login screen without waiting on any timer when no session is stored", async () => {
    mockGetCurrentUser.mockResolvedValue(cachedUser);

    const renderer = await mountApp();
    const handoffMs = await measureSplashHandoff(renderer, 6000);

    expect(handoffMs).toBeLessThanOrEqual(100);
    expect(collectText(renderer)).toContain("LOGIN");
    expect(mockGetCurrentUser).not.toHaveBeenCalled();

    await advance(6000);
    expect(timeoutWarningFired()).toBe(false);

    unmount(renderer);
  });

  it("keeps the failsafe: a hung first-time profile fetch stops holding the splash after 5 s", async () => {
    await AsyncStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(storedTokens));
    mockGetCurrentUser.mockReturnValue(new Promise(() => {}));

    const renderer = await mountApp();

    await advance(4900);
    expect(collectText(renderer)).toContain("SPLASH");
    expect(timeoutWarningFired()).toBe(false);

    await advance(200);
    expect(timeoutWarningFired()).toBe(true);
    expect(collectText(renderer)).not.toContain("SPLASH");
    expect(hasActivityIndicator(renderer)).toBe(true);

    unmount(renderer);
  });

  it("does not render until fonts are ready on native", async () => {
    mockFontsState = [false, null];
    mockGetCurrentUser.mockResolvedValue(cachedUser);

    const renderer = await mountApp();
    expect(renderer.toJSON()).toBeNull();

    unmount(renderer);
  });

  it("renders immediately on web even while fonts are still loading", async () => {
    const platformSpy = jest.replaceProperty(Platform, "OS", "web");
    mockFontsState = [false, null];
    mockGetCurrentUser.mockResolvedValue(cachedUser);

    const renderer = await mountApp();
    expect(renderer.toJSON()).not.toBeNull();
    const handoffMs = await measureSplashHandoff(renderer, 6000);

    expect(handoffMs).toBeLessThanOrEqual(100);
    expect(collectText(renderer)).toContain("LOGIN");

    unmount(renderer);
    platformSpy.restore();
  });
});
