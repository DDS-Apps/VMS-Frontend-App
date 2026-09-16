import React from "react";
import { act, create } from "react-test-renderer";
import { ICON_PATHS } from "@/constants/iconPaths";

let mockLocaleCode = "en-US";
let mockIsRTL = false;
let mockWindowWidth = 400;

const mockTheme = {
  background: "#ffffff",
  border: "#d9d9d9",
  buttonText: "#ffffff",
  error: "#c62828",
  info: "#1565c0",
  primary: "#00695c",
  secondary: "#7b1fa2",
  success: "#2e7d32",
  surface: "#f5f5f5",
  surfaceSecondary: "#eeeeee",
  text: "#111111",
  textSecondary: "#666666",
  warning: "#ef6c00",
};

const mockParkingVisitor = {
  id: "parking-required",
  visitor: {
    fullName: "Parking Visitor",
    company: "Acme",
    phone: "555-0100",
  },
  hostName: "Host One",
  visitDate: "2026-09-12",
  visitTime: "09:00",
  endTime: "10:00",
  status: "approved",
  isWalkIn: false,
  parkingDecision: "required",
  visitorNeedsParking: true,
  isMeetingRoom: true,
  isBuffet: true,
};

const mockNoParkingVisitor = {
  id: "parking-not-required",
  visitor: {
    fullName: "No Parking Visitor",
    company: "Beta",
    phone: "555-0101",
  },
  hostName: "Host Two",
  visitDate: "2026-09-12",
  visitTime: "10:00",
  endTime: "11:00",
  status: "approved",
  isWalkIn: false,
  parkingDecision: "not_required",
  visitorNeedsParking: false,
  isMeetingRoom: true,
  isBuffet: true,
};

const mockTodayData = {
  summary: { expected: 2, checkedIn: 0, completed: 0, pending: 0 },
  data: [mockParkingVisitor, mockNoParkingVisitor],
};

const mockAllVisitorsData = {
  pages: [{ data: [], pagination: { page: 1, limit: 100, total: 0, totalPages: 1 } }],
  pageParams: [1],
};

let mockTodayResponse = mockTodayData;

jest.mock("@/hooks/useTheme", () => ({
  useTheme: () => ({ theme: mockTheme }),
}));

jest.mock("@/hooks/useTranslation", () => ({
  useTranslation: () => ({
    locale: mockIsRTL ? "ar" : "en",
    t: (key: string) => {
      const translations: Record<string, string> = mockIsRTL
        ? {
            "parking.needsParking": "موقف مطلوب",
            "parking.noParking": "لا يُشترط موقف",
          }
        : {
            "parking.needsParking": "Parking Required",
            "parking.noParking": "Parking Not Required",
          };
      return translations[key] ?? key;
    },
  }),
}));

jest.mock("@/hooks/useFormatters", () => ({
  useFormatters: () => ({
    formatTimeFromString: (value: string) => value,
  }),
}));

jest.mock("@/contexts/LanguageContext", () => {
  const React = require("react");
  const LanguageContext = React.createContext(null);

  return {
    LanguageContext,
    useLanguage: () => React.useContext(LanguageContext),
  };
});

jest.mock("@/hooks/useRiyadhBusinessDateKey", () => ({
  useRiyadhBusinessDateKey: () => "2026-09-12",
}));

jest.mock("@/hooks/useTimeBoundaryTick", () => ({
  useTimeBoundaryTick: () => 0,
}));

jest.mock("@/hooks/useUpcomingVisitTimer", () => ({
  useUpcomingIndicator: () => false,
}));

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

jest.mock("@/hooks/queries/useReceptionQueries", () => ({
  useTodayVisitorsQuery: jest.fn(() => ({
    data: mockTodayResponse,
    isLoading: false,
    isFetching: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
  })),
}));

jest.mock("@/hooks/queries/useApprovalQueries", () => ({
  useInfiniteVisitsQuery: jest.fn(() => ({
    data: mockAllVisitorsData,
    isLoading: false,
    isFetching: false,
    isFetchingNextPage: false,
    isError: false,
    error: null,
    fetchNextPage: jest.fn(),
    hasNextPage: false,
    refetch: jest.fn(),
  })),
}));

jest.mock("@/components/shared/DashboardKpiSection", () => ({
  DashboardKpiSection: () => null,
}));

jest.mock("@/components/shared", () => {
  const React = require("react");

  return {
    RTLHorizontalScrollView: ({ children }: { children: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
    FilterChip: () => null,
    RequestStatusBadge: () => null,
    VisitorMatrixTable: () => null,
    VisitorRequestCard: () => null,
    SkeletonCard: () => null,
    SkeletonDashboard: () => null,
    WalkInBadge: () => null,
  };
});

jest.mock("@/components/ScreenScrollView", () => {
  const React = require("react");

  return {
    ScreenScrollView: ({ children }: { children: React.ReactNode }) =>
      React.createElement("ScreenScrollView", null, children),
  };
});

jest.mock("@/components/ThemedText", () => {
  const React = require("react");

  return {
    ThemedText: ({
      children,
      ...props
    }: {
      children?: React.ReactNode;
      [key: string]: unknown;
    }) => React.createElement("ThemedText", props, children),
  };
});

jest.mock("@/components/ThemedView", () => {
  const React = require("react");

  return {
    ThemedView: ({
      children,
      ...props
    }: {
      children?: React.ReactNode;
      [key: string]: unknown;
    }) => React.createElement("ThemedView", props, children),
  };
});

jest.mock("@/components/Spacer", () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock("react-native-svg", () => {
  const React = require("react");
  const host = (type: string) =>
    ({
      children,
      ...props
    }: {
      children?: React.ReactNode;
      [key: string]: unknown;
    }) => React.createElement(type, props, children);

  return {
    __esModule: true,
    default: host("Svg"),
    Path: host("Path"),
  };
});

jest.mock("@/components/DirectionalRow", () => {
  const React = require("react");

  return {
    DirectionalRow: ({ children }: { children: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
    getFlexDirection: () => "row",
  };
});

jest.mock("react-native-gesture-handler", () => {
  const React = require("react");

  return {
    TouchableOpacity: ({
      children,
      ...props
    }: {
      children?: React.ReactNode;
      [key: string]: unknown;
    }) => React.createElement("GHTouchableOpacity", props, children),
  };
});

jest.mock("react-native", () => {
  const React = require("react");
  const host = (type: string) =>
    ({
      children,
      ...props
    }: {
      children?: React.ReactNode;
      [key: string]: unknown;
    }) => React.createElement(type, props, children);

  return {
    View: host("View"),
    Pressable: host("Pressable"),
    Platform: { OS: "ios", select: (options: Record<string, unknown>) => options.ios },
    UIManager: {},
    LayoutAnimation: { configureNext: jest.fn(), Presets: { easeInEaseOut: {} } },
    StyleSheet: {
      create: (styles: Record<string, unknown>) => styles,
      hairlineWidth: 1,
    },
    useWindowDimensions: () => ({
      width: mockWindowWidth,
      height: 800,
      scale: 1,
      fontScale: 1,
    }),
    ActivityIndicator: () => null,
  };
});

const ReceptionistDashboardScreen =
  require("@/screens/Receptionist/ReceptionistDashboardScreen").default;
const LanguageContext = require("@/contexts/LanguageContext").LanguageContext;

type RenderedNode = {
  props: Record<string, unknown>;
  findAllByType: (type: string) => RenderedNode[];
};

const iconNameByPath = new Map(
  Object.entries(ICON_PATHS).map(([name, path]) => [path, name]),
);

function iconName(node: RenderedNode): string {
  const path = node.findAllByType("Path")[0];
  return iconNameByPath.get(String(path?.props.d ?? "")) ?? "";
}

function iconNames(node: RenderedNode): string[] {
  return node.findAllByType("Svg").map(iconName);
}

function findIcon(node: RenderedNode, name: string): RenderedNode | undefined {
  return node.findAllByType("Svg").find((icon) => iconName(icon) === name);
}

function hasIcon(node: RenderedNode, name: string): boolean {
  return iconNames(node).includes(name);
}

function pressCardViewToggle(renderer: ReturnType<typeof create>) {
  const toggle = renderer.root
    .findAllByType("Pressable")
    .find((button) => hasIcon(button, "grid"));

  if (!toggle) {
    throw new Error("Could not find the dashboard card-view toggle");
  }

  act(() => {
    toggle.props.onPress?.();
  });
}

function styleHasWidth(style: unknown, expectedWidth: string): boolean {
  if (Array.isArray(style)) {
    return style.some((value) => styleHasWidth(value, expectedWidth));
  }
  return (
    !!style &&
    typeof style === "object" &&
    (style as { width?: unknown }).width === expectedWidth
  );
}

function renderedText(renderer: ReturnType<typeof create>): string {
  return JSON.stringify(renderer.toJSON());
}

function renderDashboard(navigation: { navigate: jest.Mock }) {
  return create(
    React.createElement(
      LanguageContext.Provider,
      {
        value: {
          locale: mockIsRTL ? "ar" : "en",
          localeCode: mockLocaleCode,
          isRTL: mockIsRTL,
        },
      },
      React.createElement(ReceptionistDashboardScreen, { navigation }),
    ),
  );
}

function expectClocheIcon(node: RenderedNode) {
  const cloche = findIcon(node, "cloche");
  expect(cloche).toBeDefined();
  expect(cloche!.props.width).toBe(14);
  expect(cloche!.props.height).toBe(14);
  expect(cloche!.props.stroke).toBe(mockTheme.warning);

  const paths = cloche!.findAllByType("Path");
  expect(paths).toHaveLength(1);
  expect(paths[0].props.d).toBe(ICON_PATHS.cloche);
  expect(paths[0].props.d).not.toBe(ICON_PATHS["help-circle"]);
}

describe("rendered Receptionist dashboard service icons", () => {
  beforeEach(() => {
    mockLocaleCode = "en-US";
    mockIsRTL = false;
    mockWindowWidth = 400;
    mockTodayResponse = mockTodayData;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it.each([
    {
      locale: "English",
      isRTL: false,
      localeCode: "en-US",
      width: 400,
      cardWidth: "100%",
      forbiddenLabels: [
        "parking.needsParking",
        "parking.noParking",
        "Parking Required",
        "Parking Not Required",
      ],
    },
    {
      locale: "Arabic",
      isRTL: true,
      localeCode: "ar-SA",
      width: 1024,
      cardWidth: "33.33%",
      forbiddenLabels: [
        "parking.needsParking",
        "parking.noParking",
        "موقف مطلوب",
        "لا يُشترط موقف",
      ],
    },
  ])(
    "renders service icons without parking labels in $locale at narrow or wide width",
    ({ isRTL, localeCode, width, cardWidth, forbiddenLabels }) => {
      mockIsRTL = isRTL;
      mockLocaleCode = localeCode;
      mockWindowWidth = width;

      const navigation = { navigate: jest.fn() };
      let renderer: ReturnType<typeof create>;

      act(() => {
        renderer = renderDashboard(navigation);
      });
      pressCardViewToggle(renderer!);

      const cards = renderer!.root.findAllByType("GHTouchableOpacity");
      expect(cards).toHaveLength(2);

      const parkingCard = cards.find((card) => hasIcon(card, "map-pin"));
      const noParkingCard = cards.find((card) => !hasIcon(card, "map-pin"));
      expect(parkingCard).toBeDefined();
      expect(noParkingCard).toBeDefined();
      expect(iconNames(parkingCard!)).toEqual(
        expect.arrayContaining(["cloche", "briefcase", "map-pin"]),
      );
      expect(iconNames(noParkingCard!)).toEqual(
        expect.arrayContaining(["cloche", "briefcase"]),
      );
      expect(iconNames(noParkingCard!)).not.toContain("map-pin");
      expectClocheIcon(parkingCard!);
      expectClocheIcon(noParkingCard!);

      const allIcons = iconNames(renderer!.root);
      expect(allIcons.filter((name) => name === "map-pin")).toHaveLength(1);
      expect(allIcons.filter((name) => name === "cloche")).toHaveLength(2);
      expect(allIcons).not.toContain("coffee");
      expect(allIcons.filter((name) => name === "briefcase")).toHaveLength(2);

      const cardWrappers = renderer!.root
        .findAllByType("View")
        .filter((view) => styleHasWidth(view.props.style, cardWidth));
      expect(cardWrappers).toHaveLength(2);

      const output = renderedText(renderer!);
      for (const forbiddenLabel of forbiddenLabels) {
        expect(output).not.toContain(forbiddenLabel);
      }

      act(() => {
        renderer!.unmount();
      });
    },
  );

  it("omits the buffet icon when buffet service is disabled", () => {
    mockTodayResponse = {
      ...mockTodayData,
      data: [
        mockParkingVisitor,
        { ...mockNoParkingVisitor, isBuffet: false, hasBuffet: false },
      ],
    };

    const navigation = { navigate: jest.fn() };
    let renderer: ReturnType<typeof create>;

    act(() => {
      renderer = renderDashboard(navigation);
    });
    pressCardViewToggle(renderer!);

    const cards = renderer!.root.findAllByType("GHTouchableOpacity");
    expect(cards).toHaveLength(2);

    const parkingCard = cards.find((card) => hasIcon(card, "map-pin"));
    const buffetDisabledCard = cards.find((card) => !hasIcon(card, "map-pin"));
    expect(parkingCard).toBeDefined();
    expect(buffetDisabledCard).toBeDefined();
    expectClocheIcon(parkingCard!);
    expect(iconNames(buffetDisabledCard!)).toEqual(
      expect.arrayContaining(["briefcase"]),
    );
    expect(iconNames(buffetDisabledCard!)).not.toContain("cloche");
    expect(iconNames(buffetDisabledCard!)).not.toContain("map-pin");
    expect(iconNames(renderer!.root).filter((name) => name === "cloche")).toHaveLength(1);

    act(() => {
      renderer!.unmount();
    });
  });
});