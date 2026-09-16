import React from "react";
import { act, create } from "react-test-renderer";

type ViewMode = "card" | "list";

let mockViewMode: ViewMode = "list";
let mockQueryData: unknown;
let mockQueryError = false;
const mockMatrixProps: Array<Record<string, any>> = [];
const mockCardProps: Array<Record<string, any>> = [];
const mockFlatListProps: Array<Record<string, any>> = [];
let mockFlatListMountSequence = 0;

const mockExpiredVisit = {
  id: "pending-host-expired",
  employeeName: "Host One",
  visitor: { fullName: "Expired Walk-in", company: "Acme" },
  visitDate: "2026-09-11",
  visitTime: "23:50",
  endTime: "23:55",
  duration: "5 minutes",
  status: "pending_host_approval",
  purpose: "Meeting",
  isWalkIn: true,
  createdAt: "2026-09-11T10:00:00.000Z",
};

const mockTodayVisit = {
  id: "pending-host-today",
  employeeName: "Host Two",
  visitor: { fullName: "Today Walk-in", company: "Beta" },
  visitDate: "2026-09-12",
  visitTime: "00:00",
  // This end time is already past immediately after Riyadh midnight. The
  // targeted rule is date-only, so it must still remain active.
  endTime: "00:00",
  duration: "1 minute",
  status: "pending_host_approval",
  purpose: "Early meeting",
  isWalkIn: true,
  createdAt: "2026-09-11T10:00:00.000Z",
};

const mockResponse = {
  pages: [
    {
      data: [mockExpiredVisit, mockTodayVisit],
      pagination: { page: 1, limit: 20, total: 2, totalPages: 1 },
    },
  ],
  pageParams: [1],
};

const mockTheme = {
  background: "#ffffff",
  border: "#d9d9d9",
  buttonText: "#ffffff",
  error: "#c62828",
  info: "#1565c0",
  primary: "#00695c",
  surface: "#f5f5f5",
  text: "#111111",
  textSecondary: "#666666",
  warning: "#ef6c00",
};

jest.mock("@/hooks/useViewMode", () => ({
  useViewMode: () => [mockViewMode, jest.fn()],
}));

jest.mock("@/hooks/useTheme", () => ({
  useTheme: () => ({ theme: mockTheme }),
}));

jest.mock("@/hooks/useTranslation", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock("@/contexts/LanguageContext", () => ({
  useLanguage: () => ({ isRTL: false, localeCode: "en-US" }),
}));

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

jest.mock("@/hooks/queries/useApprovalQueries", () => ({
  useInfiniteVisitsQuery: jest.fn(() => ({
    data: mockQueryData,
    isLoading: false,
    isFetching: false,
    isFetchingNextPage: false,
    isFetchNextPageError: false,
    isError: mockQueryError,
    error: null,
    fetchNextPage: jest.fn(),
    hasNextPage: false,
    refetch: jest.fn(),
  })),
}));

jest.mock("@/components/shared", () => {
  const React = require("react");

  return {
    SkeletonList: () => null,
    RTLHorizontalScrollView: ({ children }: { children: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
    FilterChip: () => null,
    VisitorMatrixTable: (props: Record<string, any>) => {
      mockMatrixProps.push(props);
      return null;
    },
    VisitorRequestCard: (props: Record<string, any>) => {
      mockCardProps.push(props);
      return null;
    },
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

jest.mock("@/components/CalendarDatePicker", () => ({
  CalendarDatePicker: () => null,
}));

jest.mock("react-native", () => {
  const React = require("react");
  const passthrough = ({ children }: { children?: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children);

  return {
    View: passthrough,
    Pressable: passthrough,
    Switch: () => null,
    Modal: passthrough,
    Alert: { alert: jest.fn() },
    Platform: { OS: "ios", select: (options: Record<string, any>) => options.ios },
    StyleSheet: {
      create: (styles: Record<string, any>) => styles,
    },
    AppState: {
      addEventListener: () => ({ remove: jest.fn() }),
    },
    useWindowDimensions: () => ({ width: 400, height: 800, scale: 1, fontScale: 1 }),
    ActivityIndicator: () => null,
    RefreshControl: () => null,
    FlatList: (props: Record<string, any>) => {
      const mountId = React.useRef(++mockFlatListMountSequence).current;
      mockFlatListProps.push({ ...props, __mountId: mountId });
      const children: React.ReactNode[] = [];

      if (React.isValidElement(props.ListHeaderComponent)) {
        children.push(
          React.createElement(
            React.Fragment,
            { key: "list-header" },
            props.ListHeaderComponent,
          ),
        );
      }

      if (Array.isArray(props.data) && typeof props.renderItem === "function") {
        props.data.forEach((item: unknown, index: number) => {
          children.push(
            React.createElement(
              React.Fragment,
              { key: `list-item-${index}` },
              props.renderItem({ item, index }),
            ),
          );
        });
      }

      return React.createElement(React.Fragment, null, children);
    },
  };
});

const AllVisitorsScreen = require("@/screens/Receptionist/AllVisitorsScreen").default;

function rowsFor(
  captures: Array<Record<string, any>>,
  id: string,
): { props: Record<string, any>; row: Record<string, any> } {
  const props = [...captures]
    .reverse()
    .find((candidate) =>
      candidate.visitors?.some((visitor: Record<string, any>) => visitor.id === id),
    );

  if (!props) {
    throw new Error(`No captured visitor row for ${id}`);
  }

  return {
    props,
    row: props.visitors.find((visitor: Record<string, any>) => visitor.id === id),
  };
}

function cardFor(id: string): Record<string, any> {
  const props = [...mockCardProps]
    .reverse()
    .find((candidate) => candidate.request?.id === id);

  if (!props) {
    throw new Error(`No captured card for ${id}`);
  }

  return props;
}

describe("rendered Receptionist All Visitors pending-host expiration", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-09-11T20:59:59.900Z"));
    mockViewMode = "list";
    mockQueryData = mockResponse;
    mockQueryError = false;
    mockMatrixProps.length = 0;
    mockCardProps.length = 0;
    mockFlatListProps.length = 0;
    mockFlatListMountSequence = 0;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("recomputes card and matrix expiration across Riyadh midnight without remounting or changing retained rows", () => {
    const navigation = { navigate: jest.fn() };
    const route = { params: {} };
    let renderer: ReturnType<typeof create>;

    act(() => {
      renderer = create(
        React.createElement(AllVisitorsScreen, { navigation, route }),
      );
    });

    const initialRows = [
      ...new Set(
        mockMatrixProps
          .flatMap((props) => props.visitors ?? [])
          .map((row) => `${row.id}:${row.status}:${row.isExpired}`),
      ),
    ].sort();
    expect(initialRows).toEqual([
      "pending-host-expired:pending_host_approval:false",
      "pending-host-today:pending_host_approval:false",
    ]);

    // Simulate the refresh failing at the boundary. The real
    // useRetainedDatedData hook must keep the successful response visible.
    mockQueryData = undefined;
    mockQueryError = true;
    act(() => {
      jest.advanceTimersByTime(2_000);
    });

    const expiredMatrix = rowsFor(mockMatrixProps, mockExpiredVisit.id);
    expect(expiredMatrix.props.showExpiredState).toBe(true);
    expect(expiredMatrix.row).toMatchObject({
      id: mockExpiredVisit.id,
      status: "pending_host_approval",
      isExpired: true,
    });

    const todayMatrix = rowsFor(mockMatrixProps, mockTodayVisit.id);
    expect(todayMatrix.props.showExpiredState).toBe(true);
    expect(todayMatrix.row).toMatchObject({
      id: mockTodayVisit.id,
      status: "pending_host_approval",
      isExpired: false,
    });

    const retainedRows = [
      ...new Set(
        mockMatrixProps
          .flatMap((props) => props.visitors ?? [])
          .map((row) => `${row.id}:${row.status}`),
      ),
    ].sort();
    expect(retainedRows).toEqual([
      "pending-host-expired:pending_host_approval",
      "pending-host-today:pending_host_approval",
    ]);

    const listKeys = mockFlatListProps
      .filter((props) => props.data?.length === 0)
      .map((props) => props.__mountId);
    expect(listKeys.length).toBeGreaterThan(0);
    expect(new Set(listKeys).size).toBe(1);

    mockViewMode = "card";
    act(() => {
      renderer!.update(
        React.createElement(AllVisitorsScreen, { navigation, route }),
      );
    });

    const expiredCard = cardFor(mockExpiredVisit.id);
    expect(expiredCard).toMatchObject({
      isExpired: true,
      showExpiredState: true,
      request: { id: mockExpiredVisit.id, status: "pending_host_approval" },
    });
    expect(expiredCard).not.toHaveProperty("statusOverride");

    const todayCard = cardFor(mockTodayVisit.id);
    expect(todayCard).toMatchObject({
      isExpired: false,
      showExpiredState: true,
      request: { id: mockTodayVisit.id, status: "pending_host_approval" },
    });
    expect(todayCard).not.toHaveProperty("statusOverride");

    const cardKeys = mockFlatListProps
      .filter((props) => props.data?.length > 0)
      .map((props) => props.__mountId);
    expect(cardKeys.length).toBeGreaterThan(0);
    expect(new Set(cardKeys).size).toBe(1);

    act(() => {
      renderer!.unmount();
    });
  });
});