import React from "react";
import { Pressable as MockPressable, Text as MockText, View as MockView } from "react-native";
import { act, create } from "react-test-renderer";

const mockQueryState: {
  notifications: any;
  preferences: any;
} = {
  notifications: {},
  preferences: {},
};

const mockRefetchNotifications = jest.fn();
const mockRefetchPreferences = jest.fn();

jest.mock("@/hooks/queries/useNotificationQueries", () => ({
  useNotificationsQuery: () => ({
    ...mockQueryState.notifications,
    refetch: mockRefetchNotifications,
  }),
  useNotificationPreferencesQuery: () => ({
    ...mockQueryState.preferences,
    refetch: mockRefetchPreferences,
  }),
  useMarkNotificationAsReadMutation: () => ({ mutate: jest.fn() }),
  useMarkAllNotificationsAsReadMutation: () => ({ mutate: jest.fn(), isPending: false }),
  useUpdateNotificationPreferencesMutation: () => ({
    mutateAsync: jest.fn(),
    isPending: false,
  }),
}));

jest.mock("@/hooks/useTheme", () => ({
  useTheme: () => ({
    theme: {
      primary: "#1261a0",
      surface: "#ffffff",
      background: "#f5f5f5",
      text: "#111111",
      textSecondary: "#666666",
      error: "#bb2222",
      warning: "#aa6600",
      success: "#168044",
      info: "#1261a0",
      border: "#dddddd",
      buttonText: "#ffffff",
    },
  }),
}));

jest.mock("@/hooks/useTranslation", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const values: Record<string, string> = {
        "toast.serverError": "The service is unavailable. Please try again.",
        "common.retry": "Retry",
        "common.all": "All",
        "notifications.unread": "Unread",
        "notifications.title": "Notifications",
        "requests.showingPreviousDataFrom": "Showing previous data from {{source}}",
      };
      return values[key] ?? key;
    },
  }),
}));

jest.mock("@/contexts/LanguageContext", () => ({
  useLanguage: () => ({ locale: "en", isRTL: false }),
}));

jest.mock("@/hooks/useFormatters", () => ({
  useFormatters: () => ({ toLocalNumerals: (value: string) => value }),
}));

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock("@/components/ScreenScrollView", () => ({
  ScreenScrollView: ({ children, ...props }: any) => <MockView {...props}>{children}</MockView>,
}));
jest.mock("@/components/ThemedText", () => ({
  ThemedText: ({ children, ...props }: any) => <MockText {...props}>{children}</MockText>,
}));
jest.mock("@/components/ThemedView", () => ({
  ThemedView: ({ children, ...props }: any) => <MockView {...props}>{children}</MockView>,
}));
jest.mock("@/components/DirectionalRow", () => ({
  DirectionalRow: ({ children, ...props }: any) => <MockView {...props}>{children}</MockView>,
}));
jest.mock("@/components/DDIcon", () => ({
  DDIcon: () => <MockView />,
}));
jest.mock("@/components/Spacer", () => ({
  __esModule: true,
  default: () => <MockView />,
}));
jest.mock("@/components/shared/StatusBadge", () => ({
  StatusAccent: () => <MockView />,
}));
jest.mock("@/components/shared/LoadingButton", () => ({
  LoadingButton: ({ children, onPress, ...props }: any) => (
    <MockPressable onPress={onPress} {...props}>
      <MockText>{children}</MockText>
    </MockPressable>
  ),
}));
jest.mock("@/components/shared/Skeleton", () => ({
  SkeletonForm: () => <MockText>Loading preferences</MockText>,
}));
jest.mock("@/utils/notificationNavigator", () => ({
  navigateFromInAppNotification: jest.fn(),
}));
jest.mock("@/utils/notificationLocalization", () => ({
  localizeNotification: (_type: string, _params: unknown, _locale: string, title: string, body: string) => ({
    title,
    message: body,
  }),
}));
jest.mock("@/contexts/ToastContext", () => ({
  useToast: () => ({ showSuccess: jest.fn(), showError: jest.fn() }),
}));
jest.mock("@/contexts/NotificationContext", () => ({
  useNotifications: () => ({
    requestPermission: jest.fn(),
    permissionStatus: "denied",
  }),
}));

import NotificationsScreen from "@/screens/Common/NotificationsScreen";
import NotificationPreferencesScreen from "@/screens/Common/NotificationPreferencesScreen";

function renderedText(renderer: ReturnType<typeof create>): string {
  return renderer.root
    .findAllByType(MockText)
    .map((node) => node.props.children)
    .flat()
    .filter((value): value is string => typeof value === "string")
    .join(" ");
}

function pressRetry(renderer: ReturnType<typeof create>) {
  // Retry is the final actionable control in each cold-error branch (the
  // notification list has tab controls before it; preferences has none).
  const buttons = renderer.root.findAll(
    (node) => typeof node.props.onPress === "function",
  );
  const retryButton = buttons[buttons.length - 1];
  expect(retryButton).toBeDefined();
  act(() => retryButton!.props.onPress());
}

describe("notification screens rendered failure states", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders a localized list error and retries instead of showing an empty success", () => {
    mockQueryState.notifications = {
      data: undefined,
      isLoading: false,
      isFetching: false,
      isError: true,
      error: { code: "SERVER_ERROR", message: "private backend detail" },
    };

    let renderer!: ReturnType<typeof create>;
    act(() => {
      renderer = create(<NotificationsScreen />);
    });

    expect(renderedText(renderer)).toContain(
      "The service is unavailable. Please try again.",
    );
    expect(renderedText(renderer)).not.toContain("private backend detail");
    pressRetry(renderer);
    expect(mockRefetchNotifications).toHaveBeenCalledTimes(1);
  });

  it("keeps preference controls out of a cold error and exposes Retry", () => {
    mockQueryState.preferences = {
      data: undefined,
      isLoading: false,
      isFetching: false,
      error: { code: "SERVER_ERROR", message: "private backend detail" },
    };

    let renderer!: ReturnType<typeof create>;
    act(() => {
      renderer = create(<NotificationPreferencesScreen />);
    });

    expect(renderedText(renderer)).toContain("common.loadError");
    expect(renderedText(renderer)).not.toContain("private backend detail");
    pressRetry(renderer);
    expect(mockRefetchPreferences).toHaveBeenCalledTimes(1);
  });
});