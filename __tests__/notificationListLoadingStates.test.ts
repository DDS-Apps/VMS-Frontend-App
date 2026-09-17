import fs from "fs";
import path from "path";
import React from "react";
import { act, create } from "react-test-renderer";

import { useRetainedDatedData } from "../hooks/useRetainedDatedData";

const screenPath = path.resolve(
  __dirname,
  "../screens/Common/NotificationsScreen.tsx",
);
const queryHookPath = path.resolve(
  __dirname,
  "../hooks/queries/useNotificationQueries.ts",
);
const screenSource = fs.readFileSync(screenPath, "utf8");
const queryHookSource = fs.readFileSync(queryHookPath, "utf8");

describe("NotificationsScreen retained loading states", () => {
  it("retains success through a new-tab pending/failure and accepts successful empty", () => {
    type Response = {
      data: Array<{ id: string; isRead: boolean }>;
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
    type Input = { response: Response; sourceTab: "all" | "unread" };

    let sourceTab: "all" | "unread" = "all";
    let response: Response | undefined = {
      data: [{ id: "notification-a", isRead: false }],
      total: 1,
      page: 1,
      limit: 50,
      totalPages: 1,
    };
    let retained!: ReturnType<typeof useRetainedDatedData<Input>>;

    const Probe = () => {
      const input = React.useMemo(
        () => response !== undefined ? { response, sourceTab } : undefined,
        [response, sourceTab],
      );
      retained = useRetainedDatedData(sourceTab, input);
      return null;
    };

    let renderer!: ReturnType<typeof create>;
    act(() => {
      renderer = create(React.createElement(Probe));
    });
    expect(retained.data?.response.data).toHaveLength(1);
    expect(retained.data?.sourceTab).toBe("all");
    expect(retained.isRetained).toBe(false);

    sourceTab = "unread";
    response = undefined;
    act(() => renderer.update(React.createElement(Probe)));
    expect(retained.data?.response.data).toHaveLength(1);
    expect(retained.data?.sourceTab).toBe("all");
    expect(retained.isRetained).toBe(true);

    // Failure still has no newly defined successful response.
    act(() => renderer.update(React.createElement(Probe)));
    expect(retained.data?.sourceTab).toBe("all");
    expect(retained.isRetained).toBe(true);

    response = {
      data: [],
      total: 0,
      page: 1,
      limit: 50,
      totalPages: 0,
    };
    act(() => renderer.update(React.createElement(Probe)));
    expect(retained.data?.response.data).toEqual([]);
    expect(retained.data?.sourceTab).toBe("unread");
    expect(retained.isRetained).toBe(false);

    act(() => renderer.unmount());
  });

  it("memoizes exact params and accepts any defined active-key response", () => {
    expect(screenSource).toMatch(
      /const queryParams = useMemo\(\s*\(\) => \(\{ isRead: isReadFilter, limit: 50 \}\),\s*\[isReadFilter\],\s*\)/,
    );
    expect(screenSource).toContain("useNotificationsQuery(queryParams)");
    expect(screenSource).toContain("() => data !== undefined");
    expect(screenSource).toContain("? { response: data, sourceTab: selectedTab }");
    expect(screenSource).toContain(
      "const notificationsSourceKey = JSON.stringify(queryParams);",
    );
    expect(screenSource).toContain("useRetainedDatedData<");
    expect(screenSource).toContain(">(notificationsSourceKey, retainedInput)");
  });

  it("derives rows and both counts from the displayed response", () => {
    expect(screenSource).toContain(
      "const displayedResponse = retainedNotifications.data?.response;",
    );
    expect(screenSource).toContain(
      "const notifications = displayedResponse?.data ?? [];",
    );
    expect(screenSource).toContain(
      "const totalCount = displayedResponse?.total ?? 0;",
    );
    expect(screenSource).toContain(
      "const unreadCount = notifications.filter(n => !n.isRead).length;",
    );
    expect(screenSource).toContain("notifications.map((notification)");
  });

  it("labels retained rows with the actual localized All or Unread source", () => {
    expect(screenSource).toContain(
      "const displayedSourceTab = retainedNotifications.data?.sourceTab ?? selectedTab;",
    );
    expect(screenSource).toContain("displayedSourceTab === 'all'");
    expect(screenSource).toContain("? t('common.all')");
    expect(screenSource).toContain(": t('notifications.unread')");
    expect(screenSource).toContain(
      "t('requests.showingPreviousDataFrom').replace('{{source}}', displayedSourceLabel)",
    );
  });

  it("uses source-safe cold/warm gates and hides retry while fetching", () => {
    expect(screenSource).toContain(
      "!hasDisplayedResponse && (isFetching || isLoading)",
    );
    expect(screenSource).toContain("!hasDisplayedResponse && isError");
    expect(screenSource).toContain(
      "isFetching || isError || retainedNotifications.isRetained",
    );
    expect(screenSource).toContain("isError && !isFetching");
    expect(screenSource).toContain("refetch({ cancelRefetch: false });");
    expect(screenSource).toContain("onPress={handleRetry}");
    expect(screenSource).toContain("disabled={isFetching}");
    expect(screenSource).toContain("styles.inlineFeedback");
  });

  it("preserves query key, stale time, limit, mutation wiring, and merged navigation IDs", () => {
    const listHook = queryHookSource.match(
      /export function useNotificationsQuery[\s\S]*?\n}\n/,
    )?.[0];
    expect(listHook).toBeDefined();
    expect(listHook).toContain("queryKey: notificationKeys.list(params)");
    expect(listHook).toContain(
      "queryFn: ({ signal }) => notificationApiService.list(params, { signal })",
    );
    expect(listHook).toContain("staleTime: 30 * 1000");
    expect(listHook).not.toContain("placeholderData");
    expect(screenSource).toContain("limit: 50");
    expect(screenSource).toContain("markAllAsReadMutation.mutate();");
    expect(screenSource).toContain("markAsReadMutation.mutate(notification.id);");
    for (const id of ["requestId", "visitId", "roomId", "orderId", "taskId"]) {
      expect(screenSource).toContain(
        `${id}: notificationAny.${id} || notification.data?.${id}`,
      );
    }
    expect(screenSource).toContain("navigateFromInAppNotification({");
    expect(screenSource).toContain("userRole?: UserRole;");
  });

  it("keeps successful empty usable and adds no pull/focus requests", () => {
    expect(screenSource).toContain(
      "const hasDisplayedResponse = displayedResponse !== undefined;",
    );
    expect(screenSource).toContain("notifications.length === 0");
    expect(screenSource).not.toContain("RefreshControl");
    expect(screenSource).not.toMatch(/useFocusEffect|refetchOnFocus|onRefresh/);
  });
});