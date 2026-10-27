import React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { Platform, View } from "react-native";
import DashboardLayout from "../DashboardLayout";

let mockWidth = 390;
let mockRTL = false;
const mockSpringCompletions: Array<(finished: boolean) => void> = [];

jest.mock("react-native", () => {
  const native = jest.requireActual("react-native");
  // Do not spread React Native's lazy exports: that loads unavailable native
  // modules such as DevMenu in Jest.
  return Object.defineProperty(Object.create(native), "useWindowDimensions", {
    value: () => ({ width: mockWidth, height: 844, scale: 1, fontScale: 1 }),
  });
});
jest.mock("expo-image", () => ({ Image: "Image" }));
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 20, bottom: 0, left: 0, right: 0 }),
}));
jest.mock("react-native-gesture-handler", () => ({
  GestureDetector: ({ children }: { children: React.ReactNode }) => children,
  Gesture: {
    Pan: () => {
      const gesture: Record<string, unknown> = {};
      for (const name of ["activeOffsetX", "failOffsetY", "minDistance", "onUpdate", "onEnd", "enabled"]) {
        gesture[name] = () => gesture;
      }
      return gesture;
    },
  },
}));
jest.mock("react-native-reanimated", () => ({
  __esModule: true,
  default: { View: require("react-native").View },
  useSharedValue: (initial: number) => require("react").useRef({ value: initial }).current,
  useAnimatedStyle: (callback: () => unknown) => callback(),
  withSpring: (value: number, _config: unknown, callback?: (finished: boolean) => void) => {
    if (callback) mockSpringCompletions.push(callback);
    return value;
  },
  cancelAnimation: jest.fn(),
  runOnJS: (callback: unknown) => callback,
}));
jest.mock("@/components/Sidebar", () => ({ __esModule: true, default: "Sidebar" }));
jest.mock("@/components/DDIcon", () => ({ DDIcon: "DDIcon" }));
jest.mock("@/components/ThemedView", () => ({ ThemedView: "ThemedView" }));
jest.mock("@/components/ThemedText", () => ({ ThemedText: "ThemedText" }));
jest.mock("@/components/DirectionalRow", () => ({
  DirectionalRow: ({ children, style }: { children: React.ReactNode; style: unknown }) =>
    require("react").createElement(require("react-native").View, { style }, children),
}));
jest.mock("@/components/shared/EnableNotificationsPrompt", () => ({ EnableNotificationsPrompt: () => null }));
jest.mock("@/components/LanguageChangeOverlay", () => ({ LanguageChangeOverlay: () => null }));
jest.mock("@/hooks/useTheme", () => ({
  useTheme: () => ({ theme: require("@/constants/theme").Colors.light, isDark: false, toggleTheme: jest.fn() }),
}));
jest.mock("@/contexts/LanguageContext", () => ({
  useLanguage: () => ({ locale: mockRTL ? "ar" : "en", isRTL: mockRTL, layoutKey: "test", isChangingLanguage: false }),
}));
jest.mock("@/hooks/useLanguagePreference", () => ({ useLanguagePreference: () => jest.fn() }));
jest.mock("@/hooks/useTranslation", () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
jest.mock("@/hooks/useRTLStyles", () => ({ useRTLStyles: () => ({}) }));

describe.each((["web", "ios", "android"] as const).flatMap(platform =>
  [false, true].map(rtl => ({ platform, rtl }))
))("mobile menu toggle on $platform RTL=$rtl", ({ platform, rtl }) => {
  let tree: ReactTestRenderer;
  const originalPlatform = Platform.OS;
  const props = {
    userRole: "manager" as const, userName: "Test Manager", currentScreen: "Dashboard",
    onNavigate: jest.fn(), onLogout: jest.fn(), children: <View />,
  };
  const nodes = (testID: string) => tree.root.findAllByProps({ testID })
    .filter(node => typeof node.type === "string");
  const menu = () => tree.root.findAllByProps({ testID: "sidebar-menu-toggle" })
    .find(node => typeof node.props.onPress === "function")!;
  const expanded = () => menu().props.accessibilityState.expanded;
  const pressMenu = () => act(() => menu().props.onPress());
  const finishClose = () => act(() => mockSpringCompletions.shift()!(true));
  beforeEach(() => {
    Platform.OS = platform;
    mockRTL = rtl;
    mockWidth = 390;
    mockSpringCompletions.length = 0;
    act(() => { tree = create(<DashboardLayout {...props} />); });
  });
  afterEach(() => {
    act(() => tree.unmount());
    Platform.OS = originalPlatform;
  });

  it("opens, closes on the second tap, and reopens", () => {
    expect(expanded()).toBe(false);
    pressMenu();
    expect(expanded()).toBe(true);
    expect(nodes("mobile-sidebar")).toHaveLength(1);
    pressMenu();
    expect(expanded()).toBe(false);
    expect(nodes("sidebar-overlay")[0].props.pointerEvents).toBe("none");
    finishClose();
    expect(nodes("mobile-sidebar")).toHaveLength(0);
    pressMenu();
    expect(expanded()).toBe(true);
  });

  it("preserves outside-tap dismissal", () => {
    pressMenu();
    const overlay = tree.root.findAllByProps({ testID: "sidebar-overlay" })[0];
    const dismiss = overlay.findAll(node => typeof node.props.onPress === "function")[0];
    act(() => dismiss.props.onPress());
    expect(expanded()).toBe(false);
    finishClose();
    expect(nodes("mobile-sidebar")).toHaveLength(0);
  });

  it("allows reopening while the closing animation is still running", () => {
    pressMenu();
    pressMenu();
    expect(expanded()).toBe(false);
    pressMenu();
    // Reanimated cancels the prior close spring when the open spring replaces it.
    act(() => mockSpringCompletions.shift()!(false));
    expect(expanded()).toBe(true);
    expect(nodes("sidebar-overlay")[0].props.pointerEvents).toBe("auto");
  });

  it("keeps desktop persistent and the mobile menu usable after resizing back", () => {
    pressMenu();
    mockWidth = 1440;
    act(() => tree.update(<DashboardLayout {...props} />));
    expect(nodes("sidebar-menu-toggle")).toHaveLength(0);
    expect(tree.root.findAllByType("Sidebar" as any)).toHaveLength(1);
    expect(nodes("sidebar-overlay")).toHaveLength(0);
    mockWidth = 390;
    act(() => tree.update(<DashboardLayout {...props} />));
    expect(expanded()).toBe(false);
    pressMenu();
    expect(expanded()).toBe(true);
  });

  it("keeps back navigation instead of a menu on detail screens", () => {
    const onGoBack = jest.fn();
    act(() => tree.update(<DashboardLayout {...props} canGoBack onGoBack={onGoBack} />));
    expect(nodes("sidebar-menu-toggle")).toHaveLength(0);
    const back = tree.root.findAll(node => node.props.onPress === onGoBack)[0];
    act(() => back.props.onPress());
    expect(onGoBack).toHaveBeenCalledTimes(1);
  });
});
