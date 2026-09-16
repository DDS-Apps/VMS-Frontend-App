import React from "react";
import { act, create } from "react-test-renderer";

let mockTodayData: unknown;
let mockTodayError = false;
let mockForegroundListener: ((state: string) => void) | undefined;
const mockRefetch = jest.fn();
const mockMatrixProps: Array<Record<string, any>> = [];
let mockMatrixMountSequence = 0;

const mockExpiredVisit = {
  id: "today-pending-host-expired",
  visitor: { fullName: "Expired Today Walk-in", company: "Acme" },
  hostName: "Host One",
  visitDate: "2026-09-11",
  visitTime: "23:50",
  endTime: "23:55",
  status: "pending_host_approval",
  purpose: "Meeting",
  isWalkIn: true,
};

const mockSameDayVisit = {
  id: "today-pending-host-same-day",
  visitor: { fullName: "Same Day Walk-in", company: "Beta" },
  hostName: "Host Two",
  visitDate: "2026-09-12",
  visitTime: "00:00",
  // This end time has passed just after midnight, but pending-host walk-ins
  // use the Riyadh date boundary rather than wall-clock end times.
  endTime: "00:00",
  status: "pending_host_approval",
  purpose: "Early meeting",
  isWalkIn: true,
};

const mockResponse = {
  summary: { expected: 2, checkedIn: 0, completed: 0, pending: 2 },
  data: [mockExpiredVisit, mockSameDayVisit],
};

const mockTheme = {
  background: "#ffffff",
  border: "#d9d9d9",
  buttonText: "#ffffff",
  error: "#c62828",
  info: "#1565c0",
  primary: "#00695c",
  success: "#2e7d32",
  surface: "#f5f5f5",
  text: "#111111",
  textSecondary: "#666666",
  warning: "#ef6c00",
};

jest.mock("@/hooks/useTheme", () => ({
  useTheme: () => ({ theme: mockTheme }),
}));

jest.mock("@/hooks/useTranslation", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock("@/hooks/useFormatters", () => ({
  useFormatters: () => ({
    formatTimeFromString: (value: string) => value,
    formatDateShort: (value: string) => value,
  }),
}));

jest.mock("@/contexts/LanguageContext", () => ({
  useLanguage: () => ({ isRTL: false, localeCode: "en-US" }),
}));

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

jest.mock("@/hooks/queries/useReceptionQueries", () => ({
  useTodayVisitorsQuery: jest.fn(() => ({
    data: mockTodayData,
    isLoading: false,
    isFetching: false,
    isError: mockTodayError,
    error: null,
    refetch: mockRefetch,
    isPlaceholderData: false,
  })),
}));

jest.mock("@/components/shared", () => {
  const React = require("react");

  return {
    RTLHorizontalScrollView: ({ children }: { children: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
    FilterChip: () => null,
    RequestStatusBadge: () => null,
    VisitorMatrixTable: (props: Record<string, any>) => {
      const mountId = React.useRef(++mockMatrixMountSequence).current;
      mockMatrixProps.push({ ...props, __mountId: mountId });
      return null;
    },
    VisitorRequestCard: () => null,
  };
});

jest.mock("@/components/shared/Skeleton", () => ({
  SkeletonList: () => null,
}));

jest.mock("@/components/shared/KPICard", () => ({
  KPICard: () => null,
  KPICardRow: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock("@/components/ScreenScrollView", () => {
  const React = require("react");

  return {
    ScreenScrollView: ({ children }: { children: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
  };
});

jest.mock("@/components/SearchInput", () => ({
  SearchInput: () => null,
}));

jest.mock("@/components/ThemedText", () => ({
  ThemedText: () => null,
}));

jest.mock("@/components/Spacer", () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock("@/components/DDIcon", () => ({
  DDIcon: () => null,
}));

jest.mock("@/components/DirectionalRow", () => {
  const React = require("react");

  return {
    DirectionalRow: ({ children }: { children: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
    getFlexDirection: () => "row",
  };
});

jest.mock("react-native", () => {
  const React = require("react");
  const passthrough = ({ children }: { children?: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children);

  return {
    View: passthrough,
    Pressable: passthrough,
    ScrollView: passthrough,
    Platform: { OS: "ios", select: (options: Record<string, any>) => options.ios },
    UIManager: {},
    StyleSheet: {
      create: (styles: Record<string, any>) => styles,
      hairlineWidth: 1,
    },
    Alert: { alert: jest.fn() },
    AppState: {
      addEventListener: (_event: string, listener: (state: string) => void) => {
        mockForegroundListener = listener;
        return { remove: jest.fn() };
      },
    },
    useWindowDimensions: () => ({ width: 400, height: 800, scale: 1, fontScale: 1 }),
    ActivityIndicator: () => null,
    RefreshControl: () => null,
  };
});

const AllVisitorsTodayScreen =
  require("@/screens/Receptionist/AllVisitorsTodayScreen").default;

function latestRows(): Record<string, any>[] {
  const props = mockMatrixProps[mockMatrixProps.length - 1];
  if (!props) throw new Error("No rendered Today matrix captured");
  return props.visitors;
}

function rowFor(id: string): Record<string, any> {
  const row = latestRows().find((candidate) => candidate.id === id);
  if (!row) throw new Error(`No rendered Today row for ${id}`);
  return row;
}

describe("rendered Receptionist Today pending-host expiration", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-09-11T20:59:59.900Z"));
    mockTodayData = mockResponse;
    mockTodayError = false;
    mockForegroundListener = undefined;
    mockRefetch.mockReset();
    mockMatrixProps.length = 0;
    mockMatrixMountSequence = 0;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("keeps retained Today data through midnight and foreground refresh failure", () => {
    const navigation = { navigate: jest.fn() };
    let renderer: ReturnType<typeof create>;

    act(() => {
      renderer = create(
        React.createElement(AllVisitorsTodayScreen, { navigation }),
      );
    });

    expect(rowFor(mockExpiredVisit.id)).toMatchObject({
      id: mockExpiredVisit.id,
      status: "pending_host_approval",
      isExpired: false,
    });
    expect(rowFor(mockSameDayVisit.id)).toMatchObject({
      id: mockSameDayVisit.id,
      status: "pending_host_approval",
      isExpired: false,
    });
    expect(mockMatrixProps[mockMatrixProps.length - 1].showExpiredState).toBe(true);

    // The Today query fails at the date boundary; retained data remains the
    // exact successful response while the Riyadh key drives presentation.
    mockTodayData = undefined;
    mockTodayError = true;
    act(() => {
      jest.advanceTimersByTime(2_000);
    });

    expect(rowFor(mockExpiredVisit.id)).toMatchObject({
      id: mockExpiredVisit.id,
      status: "pending_host_approval",
      isExpired: true,
    });
    expect(rowFor(mockSameDayVisit.id)).toMatchObject({
      id: mockSameDayVisit.id,
      status: "pending_host_approval",
      isExpired: false,
    });
    expect(mockMatrixProps[mockMatrixProps.length - 1].showExpiredState).toBe(true);
    expect(new Set(mockMatrixProps.map((props) => props.__mountId)).size).toBe(1);

    // A suspended timer is not required once the app returns to foreground.
    act(() => {
      jest.setSystemTime(new Date("2026-09-12T07:00:00.000Z"));
      mockForegroundListener?.("active");
    });

    expect(rowFor(mockExpiredVisit.id).isExpired).toBe(true);
    expect(rowFor(mockSameDayVisit.id).isExpired).toBe(false);
    expect(mockRefetch).not.toHaveBeenCalled();

    act(() => {
      renderer!.unmount();
    });
  });
});