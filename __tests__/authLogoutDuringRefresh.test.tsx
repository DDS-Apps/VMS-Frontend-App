import React from "react";
import { act, create } from "react-test-renderer";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios, { AxiosError, type AxiosRequestConfig, type AxiosResponse } from "axios";

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

const mockPushInitialize = jest.fn(() => Promise.resolve());
const mockPushUnregister = jest.fn(() => Promise.resolve());

jest.mock("@/services/push", () => ({
  pushNotificationService: {
    initialize: (...args: unknown[]) => mockPushInitialize(...args),
    unregister: (...args: unknown[]) => mockPushUnregister(...args),
  },
}));

jest.mock("@/services/crashlytics/crashlyticsService", () => ({
  crashlyticsService: {
    setUserAttributes: jest.fn(() => Promise.resolve()),
    clearUserAttributes: jest.fn(() => Promise.resolve()),
  },
}));

jest.mock("@/hooks/queries/useDashboardKpiQuery", () => ({
  dashboardKpiKeys: {
    all: ["dashboard-kpis"],
    byIdentity: (identity: string) => ["dashboard-kpis", identity],
  },
}));

// The real auth service and the real axios interceptor chain are used here; only
// the network is scripted through an adapter.
import { AuthProvider, useAuth, type AuthUser } from "@/contexts/AuthContext";
import { getAccessToken, getRefreshToken, httpClient } from "@/api/httpClient";

const TOKEN_STORAGE_KEY = "@vms_tokens";
const AUTH_STORAGE_KEY = "@vms_auth";

const cachedUser: AuthUser = {
  id: "user-1",
  email: "host@example.com",
  name: "Cached Name",
  role: "employee",
  department: "Facilities",
  isSSOUser: false,
};

let latestAuth: ReturnType<typeof useAuth> | null = null;

function Probe() {
  latestAuth = useAuth();
  return null;
}

const flush = async () => {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
};

type Script = {
  releaseRefresh: () => void;
  calls: string[];
};

function installNetwork(): Script {
  const calls: string[] = [];
  let releaseRefresh!: () => void;
  const refreshGate = new Promise<void>((resolve) => {
    releaseRefresh = resolve;
  });

  const ok = (config: AxiosRequestConfig, data: unknown): AxiosResponse => ({
    status: 200,
    statusText: "OK",
    data,
    headers: {},
    config: config as never,
  });

  const adapter = async (config: AxiosRequestConfig): Promise<AxiosResponse> => {
    const url = config.url ?? "";
    calls.push(`${(config.method ?? "get").toUpperCase()} ${url}`);

    if (url.includes("/auth/refresh")) {
      await refreshGate;
      return ok(config, {
        success: true,
        data: { accessToken: "resurrected-access", refreshToken: "resurrected-refresh" },
      });
    }
    if (url.includes("/auth/logout")) {
      return ok(config, { success: true, data: null });
    }
    if (url.includes("/users/me")) {
      throw new AxiosError(
        "Request failed with status code 401",
        AxiosError.ERR_BAD_REQUEST,
        config as never,
        {},
        { status: 401, statusText: "Unauthorized", data: { message: "expired" }, headers: {}, config: config as never },
      );
    }
    throw new Error(`unexpected request ${url}`);
  };

  axios.defaults.adapter = adapter;
  httpClient.defaults.adapter = adapter;
  return { releaseRefresh, calls };
}

describe("logout while a token refresh is in flight", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    latestAuth = null;
    jest.spyOn(console, "log").mockImplementation(() => {});
    jest.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("leaves nothing of the session behind when the refresh completes after logout", async () => {
    await AsyncStorage.setItem(
      TOKEN_STORAGE_KEY,
      JSON.stringify({ accessToken: "stale-access", refreshToken: "refresh-1", expiresAt: Date.now() + 3600_000 }),
    );
    await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(cachedUser));
    const network = installNetwork();

    let renderer!: ReturnType<typeof create>;
    await act(async () => {
      renderer = create(
        <AuthProvider>
          <Probe />
        </AuthProvider>,
      );
    });
    await flush();

    // Cached session restored; the background profile request hit a 401 and a
    // refresh is now pending behind the gate.
    expect(latestAuth?.isAuthenticated).toBe(true);
    expect(network.calls).toEqual(
      expect.arrayContaining(["GET /api/v1/users/me", expect.stringMatching(/^POST .*\/auth\/refresh$/)]),
    );

    await act(async () => {
      await latestAuth!.logout();
    });
    await flush();
    expect(latestAuth?.isAuthenticated).toBe(false);

    // Now the refresh comes back with brand-new tokens for the ended session.
    network.releaseRefresh();
    await flush();
    await flush();

    expect(latestAuth?.isAuthenticated).toBe(false);
    expect(latestAuth?.user).toBeNull();
    expect(getAccessToken()).toBeNull();
    expect(getRefreshToken()).toBeNull();
    expect(await AsyncStorage.getItem(TOKEN_STORAGE_KEY)).toBeNull();
    expect(await AsyncStorage.getItem(AUTH_STORAGE_KEY)).toBeNull();

    act(() => {
      renderer.unmount();
    });
  });
});
