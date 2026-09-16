import React from "react";
import { act, create } from "react-test-renderer";
import AsyncStorage from "@react-native-async-storage/async-storage";

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

const mockGetCurrentUser = jest.fn();
const mockPushInitialize = jest.fn(() => Promise.resolve());
const mockPushUnregister = jest.fn(() => Promise.resolve());
const mockSetUserAttributes = jest.fn(() => Promise.resolve());
const mockClearUserAttributes = jest.fn(() => Promise.resolve());

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
    initialize: (...args: unknown[]) => mockPushInitialize(...args),
    unregister: (...args: unknown[]) => mockPushUnregister(...args),
  },
}));

jest.mock("@/services/crashlytics/crashlyticsService", () => ({
  crashlyticsService: {
    setUserAttributes: (...args: unknown[]) => mockSetUserAttributes(...args),
    clearUserAttributes: (...args: unknown[]) => mockClearUserAttributes(...args),
  },
}));

jest.mock("@/hooks/queries/useDashboardKpiQuery", () => ({
  dashboardKpiKeys: {
    all: ["dashboard-kpis"],
    byIdentity: (identity: string) => ["dashboard-kpis", identity],
  },
}));

import { AuthProvider, useAuth, type AuthUser } from "@/contexts/AuthContext";
import { ApiException } from "@/api/errors";
import { getAccessToken, getRefreshToken } from "@/api/httpClient";

const TOKEN_STORAGE_KEY = "@vms_tokens";
const AUTH_STORAGE_KEY = "@vms_auth";

const storedTokens = {
  accessToken: "access-token",
  refreshToken: "refresh-token",
  expiresAt: Date.now() + 60 * 60 * 1000,
};

const cachedUser: AuthUser = {
  id: "user-1",
  email: "host@example.com",
  name: "Cached Name",
  role: "employee",
  department: "Facilities",
  isSSOUser: true,
};

const freshUserDto = {
  id: "user-1",
  email: "host@example.com",
  name: "Fresh Name",
  role: "employee",
  department: "Facilities",
};

type Snapshot = {
  isLoading: boolean;
  isAuthenticated: boolean;
  userName: string | null;
  userDataVersion: number;
};

let snapshots: Snapshot[] = [];
let latestAuth: ReturnType<typeof useAuth> | null = null;

function Probe() {
  const auth = useAuth();
  latestAuth = auth;
  snapshots.push({
    isLoading: auth.isLoading,
    isAuthenticated: auth.isAuthenticated,
    userName: auth.user?.name ?? null,
    userDataVersion: auth.userDataVersion,
  });
  return null;
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const flush = async () => {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
};

async function seedSession(user: AuthUser | null = cachedUser) {
  await AsyncStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(storedTokens));
  if (user) {
    await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
  }
}

async function mountProvider() {
  let renderer!: ReturnType<typeof create>;
  await act(async () => {
    renderer = create(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
  });
  await flush();
  return renderer;
}

const latest = () => snapshots[snapshots.length - 1];

const unmount = (renderer: ReturnType<typeof create>) => {
  act(() => {
    renderer.unmount();
  });
};

describe("startup session restore", () => {
  let warnSpy: jest.SpyInstance;

  beforeEach(async () => {
    await AsyncStorage.clear();
    snapshots = [];
    latestAuth = null;
    mockGetCurrentUser.mockReset();
    mockPushInitialize.mockClear();
    mockPushUnregister.mockClear();
    mockSetUserAttributes.mockClear();
    mockClearUserAttributes.mockClear();
    warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    jest.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("renders the cached session before the profile request resolves", async () => {
    await seedSession();
    const profile = deferred<typeof freshUserDto>();
    mockGetCurrentUser.mockReturnValue(profile.promise);

    const renderer = await mountProvider();

    expect(mockGetCurrentUser).toHaveBeenCalledTimes(1);
    expect(latest()).toEqual({
      isLoading: false,
      isAuthenticated: true,
      userName: "Cached Name",
      userDataVersion: 0,
    });
    expect(latestAuth?.user?.isSSOUser).toBe(true);
    expect(getAccessToken()).toBe("access-token");
    expect(getRefreshToken()).toBe("refresh-token");
    expect(mockPushInitialize).toHaveBeenCalledTimes(1);
    expect(mockSetUserAttributes).toHaveBeenCalledWith(
      expect.objectContaining({ id: "user-1", name: "Cached Name" }),
    );

    await act(async () => {
      profile.resolve(freshUserDto);
    });
    await flush();

    expect(latest()).toEqual({
      isLoading: false,
      isAuthenticated: true,
      userName: "Fresh Name",
      userDataVersion: 1,
    });
    expect(latestAuth?.user?.isSSOUser).toBe(true);
    const persisted = JSON.parse((await AsyncStorage.getItem(AUTH_STORAGE_KEY)) ?? "null");
    expect(persisted).toEqual(expect.objectContaining({ name: "Fresh Name", isSSOUser: true }));

    unmount(renderer);
  });

  it("leaves state untouched when the fresh profile matches the cached one", async () => {
    await seedSession();
    mockGetCurrentUser.mockResolvedValue({ ...freshUserDto, name: cachedUser.name });

    const renderer = await mountProvider();
    const versionsSeen = new Set(snapshots.map((snapshot) => snapshot.userDataVersion));

    expect(latest()).toEqual({
      isLoading: false,
      isAuthenticated: true,
      userName: "Cached Name",
      userDataVersion: 0,
    });
    expect(versionsSeen).toEqual(new Set([0]));

    unmount(renderer);
  });

  it("keeps the session when the startup refresh fails with a network error", async () => {
    await seedSession();
    mockGetCurrentUser.mockRejectedValue(
      new ApiException({ code: "NETWORK_ERROR", message: "Network error. Please check your connection." }),
    );

    const renderer = await mountProvider();

    expect(latest()).toEqual({
      isLoading: false,
      isAuthenticated: true,
      userName: "Cached Name",
      userDataVersion: 0,
    });
    expect(await AsyncStorage.getItem(TOKEN_STORAGE_KEY)).not.toBeNull();
    expect(await AsyncStorage.getItem(AUTH_STORAGE_KEY)).not.toBeNull();
    expect(getAccessToken()).toBe("access-token");
    expect(mockPushUnregister).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("Startup profile refresh failed"),
      expect.anything(),
    );

    unmount(renderer);
  });

  it("keeps the session when the startup refresh times out or the server errors", async () => {
    for (const code of ["TIMEOUT", "SERVER_ERROR"] as const) {
      await AsyncStorage.clear();
      snapshots = [];
      await seedSession();
      mockGetCurrentUser.mockRejectedValue(new ApiException({ code, message: code }));

      const renderer = await mountProvider();

      expect(latest()).toEqual(
        expect.objectContaining({ isLoading: false, isAuthenticated: true, userName: "Cached Name" }),
      );
      expect(await AsyncStorage.getItem(TOKEN_STORAGE_KEY)).not.toBeNull();

      unmount(renderer);
    }
  });

  it("signs out when the server definitively rejects the stored session", async () => {
    await seedSession();
    mockGetCurrentUser.mockRejectedValue(
      new ApiException({ code: "UNAUTHORIZED", status: 401, message: "Session expired" }),
    );

    const renderer = await mountProvider();

    expect(latest()).toEqual({
      isLoading: false,
      isAuthenticated: false,
      userName: null,
      userDataVersion: 0,
    });
    expect(await AsyncStorage.getItem(TOKEN_STORAGE_KEY)).toBeNull();
    expect(await AsyncStorage.getItem(AUTH_STORAGE_KEY)).toBeNull();
    expect(getAccessToken()).toBeNull();
    expect(mockPushUnregister).toHaveBeenCalledTimes(1);
    expect(mockClearUserAttributes).toHaveBeenCalledTimes(1);

    unmount(renderer);
  });

  it("goes straight to signed-out when nothing is stored", async () => {
    mockGetCurrentUser.mockResolvedValue(freshUserDto);

    const renderer = await mountProvider();

    expect(latest()).toEqual({
      isLoading: false,
      isAuthenticated: false,
      userName: null,
      userDataVersion: 0,
    });
    expect(mockGetCurrentUser).not.toHaveBeenCalled();
    expect(mockPushInitialize).not.toHaveBeenCalled();

    unmount(renderer);
  });

  it("still waits for the server when tokens exist without a cached profile", async () => {
    await seedSession(null);
    const profile = deferred<typeof freshUserDto>();
    mockGetCurrentUser.mockReturnValue(profile.promise);

    const renderer = await mountProvider();

    expect(latest()).toEqual(expect.objectContaining({ isLoading: true, isAuthenticated: false }));

    await act(async () => {
      profile.resolve(freshUserDto);
    });
    await flush();

    expect(latest()).toEqual(
      expect.objectContaining({ isLoading: false, isAuthenticated: true, userName: "Fresh Name" }),
    );
    expect(await AsyncStorage.getItem(AUTH_STORAGE_KEY)).not.toBeNull();

    unmount(renderer);
  });

  it("keeps the stored tokens for next launch when the profile cannot be loaded for a transient reason", async () => {
    await seedSession(null);
    mockGetCurrentUser.mockRejectedValue(
      new ApiException({ code: "TIMEOUT", message: "Request timed out. Please try again." }),
    );

    const renderer = await mountProvider();

    // Nothing to render from, so Login is shown, but the session survives.
    expect(latest()).toEqual(expect.objectContaining({ isLoading: false, isAuthenticated: false }));
    expect(await AsyncStorage.getItem(TOKEN_STORAGE_KEY)).not.toBeNull();
    expect(getAccessToken()).toBeNull();

    unmount(renderer);
  });

  it("forgets the stored tokens when the server rejects them and no profile is cached", async () => {
    await seedSession(null);
    mockGetCurrentUser.mockRejectedValue(
      new ApiException({ code: "UNAUTHORIZED", status: 401, message: "Session expired." }),
    );

    const renderer = await mountProvider();

    expect(latest()).toEqual(expect.objectContaining({ isLoading: false, isAuthenticated: false }));
    expect(await AsyncStorage.getItem(TOKEN_STORAGE_KEY)).toBeNull();
    expect(getAccessToken()).toBeNull();

    unmount(renderer);
  });

  it("does not resurrect a session that was logged out while the refresh was in flight", async () => {
    await seedSession();
    const profile = deferred<typeof freshUserDto>();
    mockGetCurrentUser.mockReturnValue(profile.promise);

    const renderer = await mountProvider();
    expect(latest()).toEqual(expect.objectContaining({ isAuthenticated: true }));

    await act(async () => {
      await latestAuth!.logout();
    });
    await flush();
    expect(latest()).toEqual(expect.objectContaining({ isAuthenticated: false, userName: null }));

    await act(async () => {
      profile.resolve(freshUserDto);
    });
    await flush();

    expect(latest()).toEqual(expect.objectContaining({ isAuthenticated: false, userName: null }));
    expect(await AsyncStorage.getItem(AUTH_STORAGE_KEY)).toBeNull();
    expect(await AsyncStorage.getItem(TOKEN_STORAGE_KEY)).toBeNull();

    unmount(renderer);
  });

  it("ignores an unreadable cached profile and falls back to the server", async () => {
    await AsyncStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(storedTokens));
    await AsyncStorage.setItem(AUTH_STORAGE_KEY, "{not json");
    mockGetCurrentUser.mockResolvedValue(freshUserDto);

    const renderer = await mountProvider();

    expect(latest()).toEqual(
      expect.objectContaining({ isLoading: false, isAuthenticated: true, userName: "Fresh Name" }),
    );

    unmount(renderer);
  });
});
