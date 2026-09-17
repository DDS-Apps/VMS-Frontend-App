import React from "react";
import { act, create } from "react-test-renderer";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const mockGetUnreadCount = jest.fn();

jest.mock("@/services/api/notificationApiService", () => ({
  notificationApiService: {
    getUnreadCount: (...args: unknown[]) => mockGetUnreadCount(...args),
  },
}));

import { notificationKeys, useUnreadNotificationCountQuery } from "@/hooks/queries/useNotificationQueries";

let latest: {
  count: number | undefined;
  refetch: (options?: { cancelRefetch?: boolean }) => Promise<unknown>;
} | null = null;

function CountHarness({ accountId }: { accountId: string }) {
  const query = useUnreadNotificationCountQuery(accountId, { enabled: true });
  latest = {
    count: query.data?.count,
    refetch: query.refetch,
  };
  return null;
}

function newClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
}

beforeEach(() => {
  latest = null;
  mockGetUnreadCount.mockReset();
});

describe("account-scoped unread polling", () => {
  it("joins overlapping manual and polling reads instead of issuing duplicates", async () => {
    let resolve!: (value: { count: number }) => void;
    mockGetUnreadCount.mockImplementation(
      () => new Promise<{ count: number }>((done) => { resolve = done; }),
    );
    const client = newClient();
    let renderer!: ReturnType<typeof create>;

    await act(async () => {
      renderer = create(
        <QueryClientProvider client={client}>
          <CountHarness accountId="account-a" />
        </QueryClientProvider>,
      );
    });
    expect(mockGetUnreadCount).toHaveBeenCalledTimes(1);

    // Both triggers represent the same active account and explicitly join the
    // pending read, matching NotificationContext's manual-refresh path.
    await act(async () => {
      void latest!.refetch({ cancelRefetch: false });
      void latest!.refetch({ cancelRefetch: false });
    });
    expect(mockGetUnreadCount).toHaveBeenCalledTimes(1);

    await act(async () => { resolve({ count: 4 }); });
    expect(latest?.count).toBe(4);
    await act(async () => { renderer.unmount(); });
  });

  it("does not let a pending old-account response replace the new count", async () => {
    const pending: Array<(value: { count: number }) => void> = [];
    mockGetUnreadCount.mockImplementation(
      () => new Promise<{ count: number }>((resolve) => { pending.push(resolve); }),
    );
    const client = newClient();
    let renderer!: ReturnType<typeof create>;
    const render = (accountId: string) => (
      <QueryClientProvider client={client}>
        <CountHarness accountId={accountId} />
      </QueryClientProvider>
    );

    await act(async () => { renderer = create(render("account-a")); });
    await act(async () => { renderer.update(render("account-b")); });
    expect(mockGetUnreadCount).toHaveBeenCalledTimes(2);

    await act(async () => {
      pending[1]({ count: 7 });
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(latest?.count).toBe(7);
    await act(async () => {
      pending[0]({ count: 99 });
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(latest?.count).toBe(7);
    expect(client.getQueryData(notificationKeys.unreadCount("account-b"))).toEqual({ count: 7 });
    await act(async () => { renderer.unmount(); });
  });
});