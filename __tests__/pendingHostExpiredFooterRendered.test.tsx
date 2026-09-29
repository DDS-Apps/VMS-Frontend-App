import React from "react";
import { act, create } from "react-test-renderer";

let mockWidth = 390;
let mockFontScale = 1;
let mockLocale: "en" | "ar" = "en";
let mockScreen: "receptionist" | "manager" = "receptionist";
let mockQueryData: Record<string, unknown> | undefined;
let mockBoundaryTick = 0;
let mockUpcomingData:
  | { pages: Array<{ data: Array<Record<string, unknown>> }> }
  | undefined;
let mockPendingApprovalData:
  | { data: Array<Record<string, unknown>> }
  | undefined;
let mockUser: Record<string, unknown> = { id: "manager", role: "manager" };
let mockRequest: Record<string, any>;
const mockApproveMutate = jest.fn();
const mockRejectMutate = jest.fn();

const mockTheme = {
  background: "#ffffff",
  border: "#d9d9d9",
  buttonText: "#ffffff",
  buttonTextOnError: "#ffffff",
  error: "#c62828",
  info: "#1565c0",
  primary: "#00695c",
  secondary: "#2e7d32",
  surface: "#f5f5f5",
  surfaceSecondary: "#eeeeee",
  text: "#111111",
  textSecondary: "#666666",
  warning: "#ef6c00",
};

const mockTranslations = {
  en: {
    "status.visitExpired": "Visit expired",
    "errors.visitDatePassed": "The visit date has passed",
  },
  ar: {
    "status.visitExpired": "انتهت الزيارة",
    "errors.visitDatePassed": "لقد مضى تاريخ الزيارة",
  },
};

const mockHost = (name: string) => {
  const Component = (props: Record<string, any>) =>
    React.createElement(name, props, props.children);
  Component.displayName = name;
  return Component;
};

jest.mock("react-native", () => {
  return {
    ActivityIndicator: mockHost("ActivityIndicator"),
    Alert: { alert: jest.fn() },
    Dimensions: {
      get: () => ({ width: mockWidth, height: 800, scale: 1, fontScale: mockFontScale }),
    },
    Animated: {
      Value: class {
        setValue() {}
      },
      delay: () => ({ start: jest.fn() }),
      sequence: () => ({ start: jest.fn() }),
      timing: () => ({ start: jest.fn() }),
    },
    Keyboard: { dismiss: jest.fn() },
    KeyboardAvoidingView: mockHost("KeyboardAvoidingView"),
    Modal: mockHost("Modal"),
    Platform: { OS: "ios", select: (options: Record<string, any>) => options.ios },
    Pressable: mockHost("Pressable"),
    RefreshControl: mockHost("RefreshControl"),
    ScrollView: mockHost("ScrollView"),
    StyleSheet: {
      absoluteFillObject: { position: "absolute" },
      create: (styles: Record<string, any>) => styles,
      hairlineWidth: 1,
    },
    TextInput: mockHost("TextInput"),
    View: mockHost("View"),
    useWindowDimensions: () => ({
      width: mockWidth,
      height: 800,
      scale: 1,
      fontScale: mockFontScale,
    }),
  };
});

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 34, left: 0 }),
}));

jest.mock("@react-native-community/datetimepicker", () => ({
  __esModule: true,
  default: mockHost("DateTimePicker"),
}));

jest.mock("@react-navigation/native", () => ({
  useFocusEffect: () => undefined,
  useNavigation: () => ({ navigate: jest.fn() }),
}));

jest.mock("@/components/ScreenScrollView", () => ({
  ScreenScrollView: mockHost("ScreenScrollView"),
}));

jest.mock("@/components/DDIcon", () => ({
  DDIcon: mockHost("DDIcon"),
}));

jest.mock("@/components/ThemedText", () => ({
  ThemedText: mockHost("ThemedText"),
}));

jest.mock("@/components/ThemedView", () => ({
  ThemedView: mockHost("ThemedView"),
}));

jest.mock("@/components/DirectionalRow", () => ({
  DirectionalRow: mockHost("DirectionalRow"),
  getFlexDirection: () => "row",
}));

jest.mock("@/components/Spacer", () => ({
  __esModule: true,
  default: mockHost("Spacer"),
}));

jest.mock("@/components/shared/RequestTimeline", () => ({
  RequestTimeline: () => null,
  useTimelineSteps: () => [],
}));

jest.mock("@/components/shared", () => ({
  SkeletonList: mockHost("SkeletonList"),
  SkeletonCard: mockHost("SkeletonCard"),
  StatusIcon: mockHost("StatusIcon"),
  VisitorRequestCard: mockHost("VisitorRequestCard"),
  LoadingButton: mockHost("LoadingButton"),
  RTLHorizontalScrollView: mockHost("RTLHorizontalScrollView"),
  FilterChip: mockHost("FilterChip"),
  VisitorMatrixTable: mockHost("VisitorMatrixTable"),
}));

jest.mock("@/components/SearchInput", () => ({
  SearchInput: mockHost("SearchInput"),
}));

jest.mock("@/components/shared/DashboardKpiSection", () => ({
  DashboardKpiSection: mockHost("DashboardKpiSection"),
}));

jest.mock("expo-blur", () => ({
  BlurView: mockHost("BlurView"),
}));

jest.mock("@/components/shared/ApprovalActionGroup", () => ({
  ApprovalActionGroup: mockHost("ApprovalActionGroup"),
}));

jest.mock("@/components/shared/LoadingButton", () => ({
  LoadingButton: mockHost("LoadingButton"),
}));

jest.mock("@/components/shared/RequestStatusBadge", () => ({
  RequestStatusBadge: mockHost("RequestStatusBadge"),
}));

jest.mock("@/components/shared/StatusBadge", () => ({
  StatusBadge: mockHost("StatusBadge"),
}));

jest.mock("@/components/shared/Skeleton", () => ({
  SkeletonCard: mockHost("SkeletonCard"),
}));

jest.mock("@/components/SelectableCard", () => ({
  CardGridStyles: {},
  SelectableCard: mockHost("SelectableCard"),
  getCardWrapper3ColStyle: () => ({}),
  getGridStyle: () => ({}),
}));

jest.mock("react-native-qrcode-svg", () => ({
  __esModule: true,
  default: mockHost("QRCode"),
}));

jest.mock("@/hooks/useTheme", () => ({
  useTheme: () => ({ theme: mockTheme }),
}));

jest.mock("@/hooks/useTranslation", () => ({
  useTranslation: () => ({
    t: (key: string) =>
      mockTranslations[mockLocale][key as keyof (typeof mockTranslations)["en"]] ?? key,
  }),
}));

jest.mock("@/contexts/LanguageContext", () => ({
  useLanguage: () => ({
    isRTL: mockLocale === "ar",
    localeCode: mockLocale === "ar" ? "ar-SA" : "en-US",
  }),
}));

jest.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: mockUser }),
}));

jest.mock("@/hooks/useFormatters", () => ({
  useFormatters: () => ({
    formatDate: (value: string | Date) => String(value),
    formatDateShort: (value: string | Date) => String(value),
    formatTime: (value: string) => value,
    formatTimeFromString: (value: string) => value,
    formatTimeRange: (start: string, end: string) => `${start}-${end}`,
    formatVisitTimeRange: (start: string, end: string) => `${start}-${end}`,
    parseISODuration: (value: string) => value,
    toLocalNumerals: (value: string) => value,
  }),
}));

jest.mock("@/hooks/useServerDateTime", () => ({
  useServerDateTime: () => ({
    formatDateForApi: (value: Date) => value.toISOString().slice(0, 10),
    formatTimeForApi: (value: Date) => value.toISOString().slice(11, 16),
    formatTimeForDisplay: (value: Date) => value.toISOString().slice(11, 16),
    parseDateTime: (date: string, time: string) =>
      new Date(`${date}T${time}:00`),
  }),
}));

jest.mock("@/hooks/useRiyadhBusinessDateKey", () => ({
  useRiyadhBusinessDateKey: () => "2026-09-12",
}));

jest.mock("@/hooks/useTimeBoundaryTick", () => ({
  useTimeBoundaryTick: () => mockBoundaryTick,
}));

jest.mock("@/hooks/queries/useApprovalQueries", () => ({
  usePendingApprovalsQuery: () => ({
    data: mockPendingApprovalData,
    isLoading: false,
    isFetching: false,
    error: null,
    refetch: jest.fn(),
  }),
  useAwaitingVisitorQuery: () => ({
    data: undefined,
    isLoading: false,
    isFetching: false,
    error: null,
    refetch: jest.fn(),
  }),
  usePendingHostWalkInsQuery: () => ({
    data: undefined,
    isLoading: false,
    isFetching: false,
    error: null,
    refetch: jest.fn(),
  }),
  useVisitDetailsQuery: () => ({
    data: mockScreen === "manager" ? mockQueryData : undefined,
    isLoading: false,
    isFetching: false,
    error: null,
    refetch: jest.fn(),
  }),
  useApproveVisitMutation: () => ({ isPending: false, mutate: mockApproveMutate }),
  useRejectVisitMutation: () => ({ isPending: false, mutate: mockRejectMutate }),
  useCancelVisitMutation: () => ({ isPending: false, mutate: jest.fn() }),
  useUpdateVisitMutation: () => ({ isPending: false, mutate: jest.fn() }),
  useInfiniteVisitsQuery: () => ({
    data: mockUpcomingData,
    isLoading: false,
    isFetching: false,
    isError: false,
    error: null,
    hasNextPage: false,
    fetchNextPage: jest.fn(),
    isFetchingNextPage: false,
    isFetchNextPageError: false,
    refetch: jest.fn(),
  }),
}));

jest.mock("@/hooks/useRetainedDatedData", () => ({
  useRetainedDatedData: (
    _key: string,
    input: { response: unknown; todayKey: string; limit: number } | undefined,
  ) => ({
    data: input,
    isRetained: false,
  }),
}));

jest.mock("@/utils/requestMappers", () => ({
  mapVisitDetailsToVisitorRequest: () => mockRequest,
  mapPendingApprovalToVisitorRequest: (value: Record<string, unknown>) => value,
  mapAwaitingVisitorToVisitorRequest: (value: Record<string, unknown>) => value,
  mapPendingHostWalkInToVisitorRequest: (value: Record<string, unknown>) => value,
  mapVisitListItemToVisitorRequest: (value: Record<string, unknown>) => value,
}));

jest.mock("@/utils/statusStyles", () => ({
  applyOpacity: (value: string) => value,
  getStatusConfig: () => ({}),
  getStatusIcon: () => "clock",
  createModalOverlayStyle: () => ({}),
}));

jest.mock("@/utils/groupVisitsByDate", () => ({
  formatVisitDateLabel: (date: string) => date,
  groupVisitsByDate: () => [],
}));

jest.mock("@/utils/formatters", () => ({
  capitalizeFirst: (value: string) => value,
  formatPhoneForDisplay: (value: string) => value,
  formatPhoneNumber: (value: string) => value,
}));

jest.mock("@/utils/parkingDecision", () => ({
  resolveParkingDisplayDecision: () => "not_required",
}));

jest.mock("@/utils/dateTimeUtils", () => ({
  calculateServerDuration: () => "PT1H",
  isVisitExpired: () => false,
  getBusinessDateKey: (value: Date) =>
    value.toISOString().slice(0, 10),
  getServerDateParts: () => ({ year: 2026, month: 9, day: 12, hours: 12, minutes: 0 }),
}));

const ReceptionistVisitorDetailScreen = require(
  "@/screens/Receptionist/VisitorDetailScreen",
).default;
const ManagerApprovalDetailScreen = require(
  "@/screens/Manager/ManagerApprovalDetailScreen",
).default;
const UpcomingVisitorsListScreen = require(
  "@/screens/Receptionist/UpcomingVisitorsListScreen",
).default;
const OverviewScreen = require("@/screens/Dashboard/OverviewScreen").default;

function pendingHostVisitor() {
  return {
    id: "reception-expired",
    name: "Expired Visitor",
    company: "Acme",
    time: "10:00",
    endTime: "11:00",
    visitDate: "2026-09-11",
    host: "Host One",
    status: "pending_host_approval",
    isWalkIn: true,
    email: "visitor@example.com",
    phone: "0500000000",
    origin: "walk_in",
    scheduledFor: "2026-09-11",
    createdAt: "2026-09-11T08:00:00.000Z",
  };
}

function pendingHostDetails() {
  return {
    id: "manager-expired",
    visitor: {
      fullName: "Expired Visitor",
      company: "Acme",
      email: "visitor@example.com",
      phone: "0500000000",
    },
    visitDate: "2026-09-11",
    visitTime: "10:00",
    endTime: "11:00",
    duration: "PT1H",
    status: "pending_host_approval",
    isWalkIn: true,
    employeeId: "host-id",
    employeeName: "Host One",
    employeeDepartment: "Operations",
    employeePhoneNumber: "0500000001",
    employeeBusinessPhone: null,
    createdAt: "2026-09-11T08:00:00.000Z",
    visitStartAt: "2026-09-11T07:00:00.000Z",
    canApprove: false,
    timezone: "Asia/Riyadh",
    approval: null,
  };
}

function pendingManagerApprovalDetails() {
  return {
    ...pendingHostDetails(),
    id: "manager-pending-approval",
    visitDate: "2026-09-12",
    visitTime: "11:00",
    endTime: "12:00",
    duration: "PT1H",
    status: "pending_approval",
    isWalkIn: true,
    visitStartAt: "2026-09-12T08:00:00.000Z",
    canApprove: true,
  };
}

function pendingManagerApprovalRequest() {
  return {
    ...mockRequest,
    id: "manager-pending-approval",
    visitDate: "2026-09-12",
    visitTime: "11:00",
    endTime: "12:00",
    duration: "PT1H",
    status: "pending_approval",
    isWalkIn: true,
    visitStartAt: "2026-09-12T08:00:00.000Z",
    canApprove: true,
  };
}

function configureScreen(
  screen: "receptionist" | "manager",
  locale: "en" | "ar",
  width: number,
) {
  mockScreen = screen;
  mockLocale = locale;
  mockWidth = width;
  mockFontScale = locale === "ar" ? 1.5 : 1;
  mockUser = { id: "manager", role: "manager" };
  mockBoundaryTick = 0;
  mockPendingApprovalData = undefined;
  mockApproveMutate.mockReset();
  mockRejectMutate.mockReset();
  mockQueryData = screen === "manager" ? pendingHostDetails() : undefined;
  mockRequest = {
    id: "manager-expired",
    visitor: {
      fullName: "Expired Visitor",
      company: "Acme",
      email: "visitor@example.com",
      phone: "0500000000",
    },
    visitDate: "2026-09-11",
    visitTime: "10:00",
    endTime: "11:00",
    duration: "PT1H",
    status: "pending_host_approval",
    isWalkIn: true,
    employeeId: "host-id",
    employeeName: "Host One",
    employeeDepartment: "Operations",
    employeePhoneNumber: "0500000001",
    employeeBusinessPhone: null,
    approval: {},
    canApprove: false,
    purpose: "Meeting",
    notes: "",
    visitorDecision: undefined,
    parkingDecision: null,
    visitorNeedsParking: false,
    isVisitorNeedsParking: false,
    parkingSlot: null,
    meetingRoom: undefined,
    buffet: undefined,
    isMeetingRoom: false,
    isBuffet: false,
    visitStartAt: "2026-09-11T07:00:00.000Z",
  };
  mockUpcomingData = undefined;
}

function textValues(renderer: ReturnType<typeof create>) {
  return renderer.root
    .findAll((instance) => instance.type === "ThemedText")
    .map((instance) => instance.props.children)
    .filter((value) => typeof value === "string");
}

function assertMeasuredFooter(
  renderer: ReturnType<typeof create>,
  measuredHeight: number,
) {
  const footer = renderer.root.findByProps({ testID: "expired-visit-footer" });
  const scroll = renderer.root.findByType("ScreenScrollView");
  const footerStyle = Object.assign({}, ...(footer.props.style ?? []));

  expect(footer.parent?.type).toBe("View");
  expect(footer.parent).toBe(scroll.parent?.parent);
  expect(
    renderer.root.findAll(
      (instance) =>
        instance.type === "RequestStatusBadge" &&
        instance.props.status === "pending_host_approval",
    ),
  ).toHaveLength(1);
  expect(footerStyle).toMatchObject({
    position: "absolute",
    bottom: 0,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 50,
    borderTopWidth: 1,
    backgroundColor: mockTheme.background,
    borderTopColor: mockTheme.border,
  });
  expect(
    renderer.root.findAll(
      (instance) =>
        instance.type === "View" &&
        instance.props.testID === "expired-visit-footer",
    ),
  ).toHaveLength(1);

  act(() => {
    footer.props.onLayout({
      nativeEvent: { layout: { height: measuredHeight } },
    });
  });

  expect(renderer.root.findByType("ScreenScrollView").props.contentContainerStyle.paddingBottom)
    .toBe(measuredHeight);
  expect(
    textValues(renderer).filter(
      (value) => value === mockTranslations[mockLocale]["status.visitExpired"],
    ),
  ).toHaveLength(1);
  expect(
    textValues(renderer).filter(
      (value) => value === mockTranslations[mockLocale]["errors.visitDatePassed"],
    ),
  ).toHaveLength(1);
  expect(
    renderer.root.findAll(
      (instance) =>
        instance.type === "DDIcon" && instance.props.name === "alert-circle",
    ),
  ).toHaveLength(1);
}

describe("pending-host expired detail footer rendering", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-09-12T09:00:00.000Z"));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("renders the receptionist footer outside the scroll view once in narrow English", () => {
    configureScreen("receptionist", "en", 390);
    let renderer!: ReturnType<typeof create>;

    act(() => {
      renderer = create(
        React.createElement(ReceptionistVisitorDetailScreen, {
          navigation: {},
          route: { params: { visitor: pendingHostVisitor() } },
        }),
      );
    });

    assertMeasuredFooter(renderer, 144);
  });

  it("keeps the measured receptionist footer once in wide Arabic", () => {
    configureScreen("receptionist", "ar", 1024);
    let renderer!: ReturnType<typeof create>;

    act(() => {
      renderer = create(
        React.createElement(ReceptionistVisitorDetailScreen, {
          navigation: {},
          route: { params: { visitor: pendingHostVisitor() } },
        }),
      );
    });

    assertMeasuredFooter(renderer, 222);
  });

  it("renders the manager footer outside the scroll view once in narrow English", () => {
    configureScreen("manager", "en", 390);
    let renderer!: ReturnType<typeof create>;

    act(() => {
      renderer = create(
        React.createElement(ManagerApprovalDetailScreen, {
          navigation: {},
          route: { params: { requestId: "manager-expired" } },
        }),
      );
    });

    assertMeasuredFooter(renderer, 144);
  });

  it("keeps the manager footer once in wide Arabic", () => {
    configureScreen("manager", "ar", 1024);
    let renderer!: ReturnType<typeof create>;

    act(() => {
      renderer = create(
        React.createElement(ManagerApprovalDetailScreen, {
          navigation: {},
          route: { params: { requestId: "manager-expired" } },
        }),
      );
    });

    assertMeasuredFooter(renderer, 222);
  });

  it("does not render the new footer for a non-expired receptionist state", () => {
    configureScreen("receptionist", "en", 390);
    const visitor = { ...pendingHostVisitor(), visitDate: "2026-09-12" };
    let renderer!: ReturnType<typeof create>;

    act(() => {
      renderer = create(
        React.createElement(ReceptionistVisitorDetailScreen, {
          navigation: {},
          route: { params: { visitor } },
        }),
      );
    });

    expect(
      renderer.root.findAll(
        (instance) =>
          instance.type === "View" &&
          instance.props.testID === "expired-visit-footer",
      ),
    ).toHaveLength(0);
  });

  it("does not render the new footer for scheduled manager requests", () => {
    configureScreen("manager", "en", 390);
    mockQueryData = {
      ...pendingHostDetails(),
      isWalkIn: false,
    };
    mockRequest = {
      ...mockRequest,
      isWalkIn: false,
    };
    let renderer!: ReturnType<typeof create>;

    act(() => {
      renderer = create(
        React.createElement(ManagerApprovalDetailScreen, {
          navigation: {},
          route: { params: { requestId: "manager-expired" } },
        }),
      );
    });

    expect(
      renderer.root.findAll(
        (instance) =>
          instance.type === "View" &&
          instance.props.testID === "expired-visit-footer",
      ),
    ).toHaveLength(0);
  });

  it("keeps the new footer excluded for building-admin manager views", () => {
    configureScreen("manager", "en", 390);
    mockUser = { id: "building-admin", role: "building_admin" };
    let renderer!: ReturnType<typeof create>;

    act(() => {
      renderer = create(
        React.createElement(ManagerApprovalDetailScreen, {
          navigation: {},
          route: { params: { requestId: "manager-expired" } },
        }),
      );
    });

    expect(
      renderer.root.findAll(
        (instance) =>
          instance.type === "View" &&
          instance.props.testID === "expired-visit-footer",
      ),
    ).toHaveLength(0);
  });

  it("renders pending manager approval as raw status with one sticky expired footer", () => {
    configureScreen("manager", "en", 390);
    mockQueryData = pendingManagerApprovalDetails();
    mockRequest = pendingManagerApprovalRequest();
    jest.setSystemTime(new Date("2026-09-12T09:00:00.001Z"));
    let renderer!: ReturnType<typeof create>;

    act(() => {
      renderer = create(
        React.createElement(ManagerApprovalDetailScreen, {
          navigation: {},
          route: { params: { requestId: "manager-pending-approval" } },
        }),
      );
    });

    const footer = renderer.root.findByProps({ testID: "expired-visit-footer" });
    const scroll = renderer.root.findByType("ScreenScrollView");
    expect(footer.parent?.type).toBe("View");
    expect(footer.parent).toBe(scroll.parent?.parent);
    expect(scroll.props.contentContainerStyle.paddingBottom).toBeGreaterThan(0);
    expect(
      renderer.root.findAll(
        (instance) =>
          instance.type === "RequestStatusBadge" &&
          instance.props.status === "pending_approval",
      ),
    ).toHaveLength(1);
    expect(
      renderer.root.findAll((instance) => instance.type === "ApprovalActionGroup"),
    ).toHaveLength(0);
    expect(
      textValues(renderer).filter(
        (value) => value === mockTranslations.en["status.visitExpired"],
      ),
    ).toHaveLength(1);
  });

  it("suppresses the receptionist pending-approval banner after the strict cutoff", () => {
    configureScreen("manager", "en", 390);
    mockQueryData = pendingManagerApprovalDetails();
    mockRequest = pendingManagerApprovalRequest();
    jest.setSystemTime(new Date("2026-09-12T09:00:00.001Z"));
    let renderer!: ReturnType<typeof create>;

    act(() => {
      renderer = create(
        React.createElement(ReceptionistVisitorDetailScreen, {
          navigation: {},
          route: { params: { visitor: pendingHostVisitor() } },
        }),
      );
    });

    expect(
      renderer.root.findAll(
        (instance) =>
          instance.type === "View" &&
          instance.props.testID === "expired-visit-footer",
      ),
    ).toHaveLength(1);
    expect(
      textValues(renderer).filter((value) => value === "status.pendingApproval"),
    ).toHaveLength(0);
    expect(
      renderer.root.findAll(
        (instance) =>
          instance.type === "RequestStatusBadge" &&
          instance.props.status === "pending_approval",
      ),
    ).toHaveLength(1);
  });

  it("renders the upcoming manager-pending row with raw status and strict end cutoff", () => {
    configureScreen("receptionist", "en", 390);
    mockUpcomingData = {
      pages: [
        {
          data: [
            {
              id: "upcoming-manager-pending",
              employeeName: "Host One",
              visitor: {
                fullName: "Pending Visitor",
                company: "Acme",
                email: "visitor@example.com",
                phone: "0500000000",
              },
              visitDate: "2026-09-12",
              visitTime: "11:00",
              endTime: "12:00",
              duration: "PT1H",
              status: "pending_approval",
              purpose: "Meeting",
              isWalkIn: true,
            },
          ],
        },
      ],
    };
    jest.setSystemTime(new Date("2026-09-12T09:00:00.000Z"));
    let renderer!: ReturnType<typeof create>;

    act(() => {
      renderer = create(React.createElement(UpcomingVisitorsListScreen));
    });

    let table = renderer.root.findByType("VisitorMatrixTable");
    expect(table.props.visitors[0]).toMatchObject({
      status: "pending_approval",
      isExpired: false,
    });

    jest.setSystemTime(new Date("2026-09-12T09:00:00.001Z"));
    mockBoundaryTick = 1;
    act(() => {
      renderer.update(React.createElement(UpcomingVisitorsListScreen));
    });

    table = renderer.root.findByType("VisitorMatrixTable");
    expect(table.props.visitors[0]).toMatchObject({
      status: "pending_approval",
      isExpired: true,
    });
  });

  it("renders Overview pending approvals and blocks a stale approve sink after cutoff", () => {
    configureScreen("manager", "en", 390);
    mockPendingApprovalData = {
      data: [pendingManagerApprovalRequest()],
    };
    mockUpcomingData = { pages: [{ data: [] }] };
    jest.setSystemTime(new Date("2026-09-12T09:00:00.000Z"));
    let renderer!: ReturnType<typeof create>;

    act(() => {
      renderer = create(
        React.createElement(OverviewScreen, {
          userRole: "manager",
          userName: "Manager",
        }),
      );
    });

    let table = renderer.root.findByType("VisitorMatrixTable");
    expect(table.props.showExpiredState).toBe(true);
    expect(table.props.visitors[0]).toMatchObject({
      status: "pending_approval",
      isExpired: false,
    });
    act(() => {
      table.props.onApprove("manager-pending-approval");
    });
    expect(mockApproveMutate).toHaveBeenCalledTimes(1);

    jest.setSystemTime(new Date("2026-09-12T09:00:00.001Z"));
    mockBoundaryTick = 1;
    act(() => {
      renderer.update(
        React.createElement(OverviewScreen, {
          userRole: "manager",
          userName: "Manager",
        }),
      );
    });

    table = renderer.root.findByType("VisitorMatrixTable");
    expect(table.props.visitors[0]).toMatchObject({
      status: "pending_approval",
      isExpired: true,
    });
    act(() => {
      table.props.onApprove("manager-pending-approval");
    });
    expect(mockApproveMutate).toHaveBeenCalledTimes(1);
  });
});