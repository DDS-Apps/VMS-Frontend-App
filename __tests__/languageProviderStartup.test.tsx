jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

const mockRestartApp = jest.fn(() => Promise.resolve());
jest.mock("@/utils/restartApp", () => ({
  restartApp: (...args: unknown[]) => mockRestartApp(...args),
}));

type Snapshot = { isLoading: boolean; locale: string; isRTL: boolean };

/**
 * The bootstrap cache is module-level state in localeManager, so every test
 * loads a fresh module registry (React included, so hooks share one copy).
 */
function loadFreshModules() {
  jest.resetModules();
  const React = require("react") as typeof import("react");
  const TestRenderer = require("react-test-renderer") as typeof import("react-test-renderer");
  const AsyncStorage = require("@react-native-async-storage/async-storage");
  const languageContext = require("@/contexts/LanguageContext") as typeof import("@/contexts/LanguageContext");
  const localeManager = require("@/utils/localeManager") as typeof import("@/utils/localeManager");
  return { React, TestRenderer, AsyncStorage, languageContext, localeManager };
}

type Modules = ReturnType<typeof loadFreshModules>;

async function renderProvider(modules: Modules) {
  const { React, TestRenderer, languageContext } = modules;
  const snapshots: Snapshot[] = [];
  const Probe = () => {
    const { isLoading, locale, isRTL } = languageContext.useLanguage();
    snapshots.push({ isLoading, locale, isRTL });
    return null;
  };

  let renderer!: import("react-test-renderer").ReactTestRenderer;
  await TestRenderer.act(async () => {
    renderer = TestRenderer.create(
      React.createElement(languageContext.LanguageProvider, null, React.createElement(Probe)),
    );
  });
  await TestRenderer.act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  const unmount = () => {
    TestRenderer.act(() => {
      renderer.unmount();
    });
  };
  return { snapshots, unmount };
}

describe("LanguageProvider startup", () => {
  beforeEach(() => {
    mockRestartApp.mockClear();
    jest.spyOn(console, "log").mockImplementation(() => {});
    jest.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("starts ready from the bootstrap cache without a second storage read", async () => {
    const modules = loadFreshModules();
    await modules.AsyncStorage.clear();
    modules.localeManager.setCachedLocale("ar");
    const storedLocaleSpy = jest.spyOn(modules.localeManager, "getStoredLocale");

    const { snapshots, unmount } = await renderProvider(modules);

    expect(snapshots[0]).toEqual({ isLoading: false, locale: "ar", isRTL: true });
    expect(snapshots.every((snapshot) => !snapshot.isLoading)).toBe(true);
    expect(storedLocaleSpy).not.toHaveBeenCalled();
    expect(mockRestartApp).not.toHaveBeenCalled();

    unmount();
  });

  it("still verifies against storage (and keeps the restart failsafe) when the cache is empty", async () => {
    const modules = loadFreshModules();
    await modules.AsyncStorage.clear();
    await modules.AsyncStorage.setItem(modules.localeManager.LANGUAGE_STORAGE_KEY, "ar");
    const storedLocaleSpy = jest.spyOn(modules.localeManager, "getStoredLocale");

    const { snapshots, unmount } = await renderProvider(modules);

    expect(snapshots[0]).toEqual({ isLoading: true, locale: "en", isRTL: false });
    expect(storedLocaleSpy).toHaveBeenCalledTimes(1);
    // Stored direction (RTL) disagrees with I18nManager (LTR in the test env):
    // the existing restart failsafe must still fire, and it keeps the provider
    // in its loading state because the app is about to restart.
    expect(snapshots[snapshots.length - 1]).toEqual({ isLoading: true, locale: "ar", isRTL: true });
    expect(mockRestartApp).toHaveBeenCalledWith("ar");

    unmount();
  });
});
