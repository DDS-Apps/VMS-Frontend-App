import React from "react";
import { act, create } from "react-test-renderer";

const mockSelectionInfo = jest.fn();
jest.mock("@/utils/globalToast", () => ({
  ...jest.requireActual("@/utils/globalToast"),
  showGlobalInfo: (...args: unknown[]) => mockSelectionInfo(...args),
}));

jest.mock("expo-constants", () => ({
  expoConfig: { extra: { environment: "production", apiBaseUrl: "https://vms.dallah.com" } },
}));

let mockWidth = 390;
let mockFontScale = 1;
let mockLocale: "en" | "ar" = "en";
let mockHandoffTranslations = false;
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
const mockBulkApproveMutate = jest.fn();
const mockRejectMutate = jest.fn();
const mockCancelMutate = jest.fn();
const mockUpdateMutate = jest.fn();
const mockRefetchDetails = jest.fn();
const handoffFixtures = require("./fixtures/approval-handoff.json");

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
const mockFlatList = (props: Record<string, any>) =>
  React.createElement("FlatList", props, props.ListHeaderComponent,
    props.data?.map((item: unknown, index: number) => props.renderItem?.({ item, index })),
    props.ListFooterComponent);

jest.mock("react-native", () => {
  return {
    ActivityIndicator: mockHost("ActivityIndicator"),
    FlatList: mockFlatList,
    Alert: { alert: jest.fn() },
    Dimensions: {
      get: () => ({ width: mockWidth, height: 800, scale: 1, fontScale: mockFontScale }),
    },
    Animated: {
      View: mockHost("AnimatedView"),
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
    Switch: mockHost("Switch"),
    TouchableWithoutFeedback: mockHost("TouchableWithoutFeedback"),
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
jest.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ removeQueries: jest.fn(), invalidateQueries: jest.fn() }),
  useQuery: () => ({ data: undefined, isLoading: false, isFetching: false, isError: false, refetch: jest.fn() }),
}));

jest.mock("@/components/ScreenScrollView", () => ({
  ScreenScrollView: mockHost("ScreenScrollView"),
}));
jest.mock("@/hooks/useScreenInsets", () => ({
  useScreenInsets: () => ({ paddingTop: 0, paddingBottom: 34 }),
}));
jest.mock("@/components/CalendarDatePicker", () => ({
  CalendarDatePicker: mockHost("CalendarDatePicker"),
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
  getPhysicalToggleStyle: () => ({}),
}));

jest.mock("@/components/Spacer", () => ({
  __esModule: true,
  default: mockHost("Spacer"),
}));

jest.mock("@/components/shared/RequestTimeline", () => ({
  ReceptionistVisitTimeline: () => null,
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
  SelectionCheckbox: mockHost("SelectionCheckbox"),
  ServiceIcons: mockHost("ServiceIcons"),
  StatusAccent: mockHost("StatusAccent"),
  SkeletonDashboard: mockHost("SkeletonDashboard"),
  LoadingSpinner: mockHost("LoadingSpinner"),
  ApprovalActionGroup: mockHost("ApprovalActionGroup"),
  ListLoadingFooter: mockHost("ListLoadingFooter"),
  StatusDropdown: mockHost("StatusDropdown"),
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
    t: (key: string) => {
      if (mockHandoffTranslations) {
        const language = mockLocale === "ar" ? require("@/constants/i18n/ar").ar : require("@/constants/i18n/en").en;
        return key.split(".").reduce((value: any, part) => value?.[part], language) ?? key;
      }
      return mockTranslations[mockLocale][key as keyof (typeof mockTranslations)["en"]] ?? key;
    },
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
    formatDateTime: (value: string) => value,
    parseTimeString: (value: string) => value,
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
    formatTime24ForApi: (value: Date) => value.toISOString().slice(11, 16),
    formatDateForDisplay: (value: Date) => value.toISOString().slice(0, 10),
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
jest.mock("@/hooks/useActiveVisitView", () => ({
  useQrClock: () => Date.now(),
  useActiveVisitView: () => true,
}));

jest.mock("@/hooks/queries/useApprovalQueries", () => ({
  requestKeys: { visitDetail: (id: string) => ["requests", "visit-detail", id] },
  approvalHistoryKeys: { all: ["approval-history"] },
  useInfiniteApprovalHistoryQuery: () => ({
    data: { pages: [mockPendingApprovalData ?? { data: [] }] },
    isLoading: false, isFetching: false, refetch: jest.fn(),
    hasNextPage: false, fetchNextPage: jest.fn(),
  }),
  useInfinitePendingApprovalsQuery: () => ({
    data: { pages: [mockPendingApprovalData ?? { data: [] }] },
    isLoading: false, isFetching: false, refetch: jest.fn(),
    hasNextPage: false, fetchNextPage: jest.fn(),
  }),
  useBulkApproveRequestsMutation: () => ({ isPending: false, mutate: mockBulkApproveMutate }),
  useBulkRejectRequestsMutation: () => ({ isPending: false, mutate: jest.fn() }),
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
    refetch: mockRefetchDetails,
  }),
  useApproveVisitMutation: () => ({ isPending: false, mutate: mockApproveMutate }),
  useHostApproveVisitMutation: () => ({ isPending: false, mutate: jest.fn() }),
  useHostRejectVisitMutation: () => ({ isPending: false, mutate: jest.fn() }),
  useRejectVisitMutation: () => ({ isPending: false, mutate: mockRejectMutate }),
  useCancelVisitMutation: () => ({ isPending: false, mutate: mockCancelMutate }),
  useUpdateVisitMutation: () => ({ isPending: false, mutate: mockUpdateMutate }),
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
    dateKey: _key,
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
  getInitials: () => "TV",
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
const ManagerDashboardScreen = require("@/screens/Manager/ManagerDashboardScreen").default;
const ManagerAllRequestsScreen = require("@/screens/Manager/ManagerAllRequestsScreen").default;
const RequestDetailsScreen = require("@/screens/Employee/RequestDetailsScreen").default;

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
  mockHandoffTranslations = false;
  mockLocale = locale;
  mockWidth = width;
  mockFontScale = locale === "ar" ? 1.5 : 1;
  mockUser = { id: "manager", role: "manager" };
  mockBoundaryTick = 0;
  mockPendingApprovalData = undefined;
  mockApproveMutate.mockReset();
  mockRejectMutate.mockReset();
  mockCancelMutate.mockReset();
  mockUpdateMutate.mockReset();
  mockRefetchDetails.mockReset();
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

    let table = renderer.root.findAllByType("VisitorMatrixTable").find(node => node.props.showApproveReject)!;
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

    table = renderer.root.findAllByType("VisitorMatrixTable").find(node => node.props.showApproveReject)!;
    expect(table.props.visitors[0]).toMatchObject({
      status: "pending_approval",
      isExpired: true,
    });
    act(() => {
      table.props.onApprove("manager-pending-approval");
    });
    expect(mockApproveMutate).toHaveBeenCalledTimes(1);
  });

  describe("scheduled Manager dashboard approvals", () => {
    let dashboard: ReturnType<typeof create>;
    const named = (name: string) => dashboard.root.find(node =>
      typeof node.type === "function" && node.type.name === name);
    const table = () => dashboard.root.findByType("VisitorMatrixTable");
    const texts = () => dashboard.root.findAllByType("ThemedText")
      .map(node => node.props.children).filter(value => typeof value === "string");
    const mount = () => {
      act(() => {
        dashboard = create(React.createElement(ManagerDashboardScreen, {
          navigation: { navigate: jest.fn() },
        }));
      });
    };
    beforeEach(() => {
      mockSelectionInfo.mockClear();
      configureScreen("manager", "en", 390);
      jest.setSystemTime(new Date("2026-09-12T08:59:59Z"));
      mockBulkApproveMutate.mockReset();
      mockPendingApprovalData = { data: [
        { ...pendingManagerApprovalRequest(), id: "soon", isWalkIn: false },
        { ...pendingManagerApprovalRequest(), id: "later", isWalkIn: false, endTime: "13:00" },
        { ...pendingManagerApprovalRequest(), id: "expired", isWalkIn: false, endTime: "11:30" },
      ] };
    });
    afterEach(() => { act(() => dashboard?.unmount()); });

    it.each((["en", "ar"] as const).flatMap(locale =>
      ["empty", "expired", "approved", "rejected", "server-blocked"].map(state => ({ locale, state }))
    ))("shows info only after Select is pressed in $locale for $state rows", ({ locale, state }) => {
      mockLocale = locale;
      mockHandoffTranslations = true;
      const record = {
        ...pendingManagerApprovalRequest(), id: "blocked", isWalkIn: false,
        endTime: state === "expired" ? "11:30" : "13:00",
        status: state === "approved" || state === "rejected" ? state : "pending_approval",
        canApprove: state !== "server-blocked",
      };
      mockPendingApprovalData = { data: state === "empty" ? [] : [record] };
      mount();
      const header = named("SectionHeader");
      const button = dashboard.root.findAllByType("Pressable").find(node =>
        node.props.onPress === header.props.onToggleSelectionMode)!;
      expect(button.props.disabled).not.toBe(true);
      expect(button.props.accessibilityRole).toBe("button");
      const language = locale === "ar" ? require("@/constants/i18n/ar").ar : require("@/constants/i18n/en").en;
      expect(texts()).not.toContain(language.bulkActions.noItemsToSelect);
      expect(mockSelectionInfo).not.toHaveBeenCalled();
      act(() => button.props.onPress());
      expect(mockSelectionInfo).toHaveBeenCalledTimes(1);
      expect(mockSelectionInfo).toHaveBeenCalledWith(language.bulkActions.noItemsToSelect);
      expect(texts()).not.toContain(language.bulkActions.noItemsToSelect);
      expect(named("SectionHeader").props.isSelectionMode).toBe(false);
      expect(mockApproveMutate).not.toHaveBeenCalled();
      expect(mockBulkApproveMutate).not.toHaveBeenCalled();
    });

    it("keeps Select enabled for mixed rows and selects only eligible requests", () => {
      mount();
      expect(mockSelectionInfo).not.toHaveBeenCalled();
      expect(texts()).not.toContain("bulkActions.noItemsToSelect");
      act(() => named("SectionHeader").props.onToggleSelectionMode());
      act(() => named("SelectAllBar").props.onToggleAll());
      expect([...table().props.selectedIds].sort()).toEqual(["later", "soon"]);
      expect(mockBulkApproveMutate).not.toHaveBeenCalled();
    });

    it("checks current search results on click without showing a default notice", () => {
      mount();
      const search = dashboard.root.findAllByType("TextInput")[0];
      act(() => search.props.onChangeText("no-matching-visitor"));
      expect(mockSelectionInfo).not.toHaveBeenCalled();
      expect(texts()).not.toContain("bulkActions.noItemsToSelect");
      act(() => named("SectionHeader").props.onToggleSelectionMode());
      expect(mockSelectionInfo).toHaveBeenCalledWith("bulkActions.noItemsToSelect");
      expect(named("SectionHeader").props.isSelectionMode).toBe(false);
      act(() => search.props.onChangeText(""));
      act(() => named("SectionHeader").props.onToggleSelectionMode());
      expect(named("SectionHeader").props.isSelectionMode).toBe(true);
      expect(mockSelectionInfo).toHaveBeenCalledTimes(1);
      expect(texts()).not.toContain("bulkActions.noItemsToSelect");
    });

    it("keeps Cancel available when the last eligible selection expires", () => {
      mockPendingApprovalData = { data: [
        { ...pendingManagerApprovalRequest(), id: "soon", isWalkIn: false },
      ] };
      mount();
      act(() => table().props.onLongPressRow("soon"));
      jest.setSystemTime(new Date("2026-09-12T09:00:00Z"));
      mockBoundaryTick = 1;
      act(() => dashboard.update(React.createElement(ManagerDashboardScreen, { navigation: { navigate: jest.fn() } })));
      expect(named("SectionHeader").props.isSelectionMode).toBe(true);
      expect(mockSelectionInfo).not.toHaveBeenCalled();
      expect(texts()).not.toContain("bulkActions.noItemsToSelect");
      expect(dashboard.root.findAll(node => typeof node.type === "function" && node.type.name === "SelectAllBar")).toHaveLength(0);
      act(() => named("SectionHeader").props.onToggleSelectionMode());
      expect(named("SectionHeader").props.isSelectionMode).toBe(false);
      expect(mockSelectionInfo).not.toHaveBeenCalled();
      act(() => named("SectionHeader").props.onToggleSelectionMode());
      expect(mockSelectionInfo).toHaveBeenCalledWith("bulkActions.noItemsToSelect");
      expect(named("SectionHeader").props.isSelectionMode).toBe(false);
    });

    it("blocks a captured single handler at the exact end without waiting for a render", () => {
      mount();
      const approve = table().props.onApprove;
      jest.setSystemTime(new Date("2026-09-12T09:00:00Z"));
      act(() => approve("soon"));
      expect(mockApproveMutate).not.toHaveBeenCalled();
    });
    it("accepts a pending-endpoint row without a status field", () => {
      const row = { ...pendingManagerApprovalRequest(), id: "dto", isWalkIn: false };
      delete row.status;
      mockPendingApprovalData = { data: [row] };
      mount();
      act(() => table().props.onApprove("dto"));
      expect(mockApproveMutate).toHaveBeenCalledTimes(1);
    });
    it("selects eligible rows only and excludes expired requests from bulk payloads", () => {
      mount();
      act(() => table().props.onLongPressRow("soon"));
      act(() => named("SelectAllBar").props.onToggleAll());
      expect([...table().props.selectedIds]).toEqual(["soon", "later"]);
      act(() => named("BulkActionBar").props.onApprove());
      expect(mockBulkApproveMutate.mock.calls[0][0]).toEqual({ ids: ["soon", "later"] });
    });
    it("rechecks a stale bulk selection and reports skipped requests", () => {
      mount();
      act(() => table().props.onLongPressRow("soon"));
      act(() => named("SelectAllBar").props.onToggleAll());
      const approve = named("BulkActionBar").props.onApprove;
      jest.setSystemTime(new Date("2026-09-12T09:00:00Z"));
      act(() => approve());
      expect(mockBulkApproveMutate.mock.calls[0][0]).toEqual({ ids: ["later"] });
      expect([...table().props.selectedIds]).toEqual(["later"]);
    });
    it("makes no API call when every selected request has expired", () => {
      mount();
      act(() => table().props.onLongPressRow("soon"));
      const approve = named("BulkActionBar").props.onApprove;
      jest.setSystemTime(new Date("2026-09-12T09:00:00Z"));
      act(() => approve());
      expect(mockBulkApproveMutate).not.toHaveBeenCalled();
    });
    it("keeps eligible failures selected and shows mixed backend results", () => {
      mount();
      act(() => table().props.onLongPressRow("soon"));
      act(() => named("SelectAllBar").props.onToggleAll());
      act(() => named("BulkActionBar").props.onApprove());
      act(() => mockBulkApproveMutate.mock.calls[0][1].onSuccess({
        successCount: 1, failedCount: 1, failedIds: ["later"],
        results: [{ id: "soon", success: true }, { id: "later", success: false, error: "Request changed" }],
      }));
      expect([...table().props.selectedIds]).toEqual(["later"]);
      expect(named("BulkActionBar").props.selectedCount).toBe(1);
    });
    it.each(["VISIT_APPROVAL_EXPIRED", "VISIT_APPROVAL_INVALID_SCHEDULE", "VISIT_APPROVAL_ALREADY_PROCESSED"])(
      "does not keep %s selected even when the client clock still permits it", code => {
        mount();
        act(() => table().props.onLongPressRow("later"));
        act(() => named("BulkActionBar").props.onApprove());
        act(() => mockBulkApproveMutate.mock.calls[0][1].onSuccess({
          successCount: 0, failedCount: 1, failedIds: ["later"],
          results: [{ id: "later", success: false, code, error: "private raw backend text" }],
        }));
        expect([...table().props.selectedIds]).toEqual([]);
        expect(mockBulkApproveMutate).toHaveBeenCalledTimes(1);
        expect(JSON.stringify(require("react-native").Alert.alert.mock.calls)).not.toContain("private raw backend text");
        expect(table().props.visitors.find((row: any) => row.id === "later").approveDisabled).toBe(true);
        act(() => table().props.onApprove("later"));
        expect(mockApproveMutate).not.toHaveBeenCalled();
      },
    );
    it.each(["en", "ar"] as const)("shows committed-success warnings in %s and clears successful selection", locale => {
      mockLocale = locale;
      mockHandoffTranslations = true;
      mockPendingApprovalData = { data: [
        { ...pendingManagerApprovalRequest(), id: "visit-eligible", isWalkIn: false },
      ] };
      mount();
      act(() => table().props.onLongPressRow("visit-eligible"));
      act(() => named("BulkActionBar").props.onApprove());
      act(() => mockBulkApproveMutate.mock.calls[0][1].onSuccess(handoffFixtures.bulkWarning));
      const language = locale === "ar" ? require("@/constants/i18n/ar").ar : require("@/constants/i18n/en").en;
      expect(require("react-native").Alert.alert).toHaveBeenLastCalledWith(language.approval.bulkResult,
        expect.stringContaining(language.approval.provisioningPending));
      expect([...table().props.selectedIds]).toEqual([]);
      expect(mockBulkApproveMutate).toHaveBeenCalledTimes(1);
    });
    it("removes a committed duplicate ID even when another result position failed", () => {
      mount();
      act(() => table().props.onLongPressRow("later"));
      act(() => named("BulkActionBar").props.onApprove());
      act(() => mockBulkApproveMutate.mock.calls[0][1].onSuccess({
        successCount: 1, failedCount: 1, failedIds: ["later"],
        results: [{ id: "later", success: true }, { id: "later", success: false, code: "VISIT_APPROVAL_ALREADY_PROCESSED" }],
      }));
      expect([...table().props.selectedIds]).toEqual([]);
    });
    it.each([50, 51])("handles %i selected IDs without truncation or automatic multi-batch approval", count => {
      mockPendingApprovalData = { data: Array.from({ length: count }, (_, i) => ({
        ...pendingManagerApprovalRequest(), id: `v${i}`, isWalkIn: false,
      })) };
      mount();
      act(() => table().props.onLongPressRow("v0"));
      act(() => named("SelectAllBar").props.onToggleAll());
      act(() => named("BulkActionBar").props.onApprove());
      if (count === 50) {
        expect(mockBulkApproveMutate).toHaveBeenCalledTimes(1);
        expect(mockBulkApproveMutate.mock.calls[0][0].ids).toHaveLength(50);
      } else {
        expect(mockBulkApproveMutate).not.toHaveBeenCalled();
        expect(require("react-native").Alert.alert).toHaveBeenLastCalledWith("approval.approveFailed", "approval.batchLimit");
        expect([...table().props.selectedIds]).toHaveLength(51);
      }
    });
    it.each(["dashboard", "overview", "all", "managerDetail", "sharedDetail"])(
      "uses returned cancellation and provisioning warnings in the real %s callback", screen => {
        mockHandoffTranslations = true;
        mockQueryData = { ...pendingManagerApprovalDetails(), isWalkIn: false };
        mockRequest = { ...pendingManagerApprovalRequest(), isWalkIn: false };
        const navigation = { navigate: jest.fn(), goBack: jest.fn() };
        act(() => {
          dashboard = create(
            screen === "dashboard" ? React.createElement(ManagerDashboardScreen, { navigation }) :
            screen === "overview" ? React.createElement(OverviewScreen, { userRole: "manager" }) :
            screen === "all" ? React.createElement(ManagerAllRequestsScreen, { navigation }) :
            React.createElement(screen === "managerDetail" ? ManagerApprovalDetailScreen : RequestDetailsScreen, {
              userRole: "manager", navigation, route: { params: { requestId: "manager-pending-approval" } },
            }),
          );
        });
        act(() => {
          if (screen === "dashboard" || screen === "overview" || screen === "all") {
            const target = screen === "overview"
              ? dashboard.root.findAllByType("VisitorMatrixTable").find(node => node.props.showApproveReject)!
              : table();
            target.props.onApprove("soon");
          } else {
            dashboard.root.findAllByType("ApprovalActionGroup").find(node => !node.props.disabled)?.props.onApprove();
          }
        });
        expect(mockApproveMutate).toHaveBeenCalledTimes(1);
        act(() => mockApproveMutate.mock.calls[0][1].onSuccess(handoffFixtures.cancelled));
        const language = require("@/constants/i18n/en").en;
        expect(require("react-native").Alert.alert).toHaveBeenLastCalledWith(language.approval.result,
          `${language.approval.currentStatus}: ${language.status.cancelled}\n${language.approval.provisioningPending}`);
        expect(navigation.goBack).not.toHaveBeenCalled();
        expect(mockUpdateMutate).not.toHaveBeenCalled();
        expect(mockApproveMutate).toHaveBeenCalledTimes(1);
      },
    );
    it.each(["pending", "cancelled"])("does not submit the walk-in follow-up edit after a %s approval outcome", outcome => {
      mockQueryData = { ...pendingManagerApprovalDetails(), employeeId: "manager" };
      mockRequest = { ...pendingManagerApprovalRequest(), employeeId: "manager" };
      act(() => {
        dashboard = create(React.createElement(ManagerApprovalDetailScreen, {
          navigation: { goBack: jest.fn() }, route: { params: { requestId: "manager-pending-approval" } },
        }));
      });
      act(() => dashboard.root.findByType("ApprovalActionGroup").props.onApprove());
      expect(mockApproveMutate).not.toHaveBeenCalled();
      const submit = dashboard.root.findAllByType("LoadingButton")
        .find(node => node.props.onPress?.name === "handleWalkInApprovalSubmit")!;
      expect(submit).toBeDefined();
      act(() => submit.props.onPress());
      expect(mockApproveMutate).toHaveBeenCalledTimes(1);
      act(() => mockApproveMutate.mock.calls[0][1].onSuccess(handoffFixtures[outcome]));
      expect(mockUpdateMutate).not.toHaveBeenCalled();
      expect(mockApproveMutate).toHaveBeenCalledTimes(1);
      expect(require("react-native").Alert.alert).toHaveBeenLastCalledWith("approval.result",
        expect.stringContaining("approval.provisioningPending"));
    });
    it.each(["managerDetail", "sharedDetail"])("shows a guarded cancellation conflict in %s without an automatic second write", screen => {
      mockHandoffTranslations = true;
      mockQueryData = { ...pendingManagerApprovalDetails(), employeeId: "manager", isWalkIn: false, visitTime: "13:00", endTime: "14:00", status: "approved", canCancel: true };
      mockRequest = { ...pendingManagerApprovalRequest(), employeeId: "manager", isWalkIn: false, visitTime: "13:00", endTime: "14:00", status: "approved" };
      act(() => {
        dashboard = create(React.createElement(screen === "managerDetail" ? ManagerApprovalDetailScreen : RequestDetailsScreen, {
          userRole: "manager", navigation: { goBack: jest.fn() }, route: { params: { requestId: "manager-pending-approval" } },
        }));
      });
      const submit = dashboard.root.findAllByType("LoadingButton")
        .find(node => node.props.variant === "danger" &&
          node.props.children === require("@/constants/i18n/en").en.actions[
            screen === "managerDetail" ? "cancelRequest" : "cancel"
          ])!;
      expect(submit).toBeDefined();
      act(() => submit.props.onPress());
      expect(mockCancelMutate).toHaveBeenCalledTimes(1);
      act(() => mockCancelMutate.mock.calls[0][1].onError({ code: "CONFLICT", status: 409, message: "private debug" }));
      expect(require("react-native").Alert.alert).toHaveBeenLastCalledWith(
        require("@/constants/i18n/en").en.errors.somethingWentWrong,
        require("@/constants/i18n/en").en.approval.cancellationConflict);
      expect(mockCancelMutate).toHaveBeenCalledTimes(1);
    });
    it("removes an expiring selection and updates row expiry after a boundary render", () => {
      mount();
      act(() => table().props.onLongPressRow("soon"));
      jest.setSystemTime(new Date("2026-09-12T09:00:00Z"));
      mockBoundaryTick = 1;
      act(() => dashboard.update(React.createElement(ManagerDashboardScreen, { navigation: { navigate: jest.fn() } })));
      expect([...table().props.selectedIds]).toEqual([]);
      expect(table().props.visitors.find((item: any) => item.id === "soon").isExpired).toBe(true);
    });
    it("blocks expired requests on All Requests, including a captured handler", () => {
      act(() => {
        dashboard = create(React.createElement(ManagerAllRequestsScreen, {
          navigation: { navigate: jest.fn() }, route: { params: {} },
        }));
      });
      const approve = table().props.onApprove;
      expect(table().props.visitors.find((item: any) => item.id === "expired").isExpired).toBe(true);
      jest.setSystemTime(new Date("2026-09-12T09:00:00Z"));
      act(() => approve("soon"));
      expect(mockApproveMutate).not.toHaveBeenCalled();
    });
    it("blocks Manager Details at the scheduled cutoff, independently of QR retention", () => {
      mockQueryData = { ...pendingManagerApprovalDetails(), isWalkIn: false, isExpired: false };
      mockRequest = { ...pendingManagerApprovalRequest(), isWalkIn: false };
      act(() => {
        dashboard = create(React.createElement(ManagerApprovalDetailScreen, {
          navigation: { goBack: jest.fn() }, route: { params: { requestId: "manager-pending-approval" } },
        }));
      });
      const approve = dashboard.root.findByType("ApprovalActionGroup").props.onApprove;
      jest.setSystemTime(new Date("2026-09-12T09:00:00Z"));
      act(() => approve());
      expect(mockApproveMutate).not.toHaveBeenCalled();
    });
    it("marks a missing scheduled end unavailable rather than silently using UI defaults", () => {
      mockPendingApprovalData = { data: [
        { ...pendingManagerApprovalRequest(), id: "unknown", isWalkIn: false, endTime: undefined, duration: undefined },
      ] };
      mount();
      const item = table().props.visitors[0];
      expect(item.approveDisabled).toBe(true);
      expect(item.isExpired).toBe(false);
      expect(item.approvalNotice).toBe("approval.scheduleUnavailable");
      act(() => table().props.onApprove("unknown"));
      expect(mockApproveMutate).not.toHaveBeenCalled();
    });
  });
});