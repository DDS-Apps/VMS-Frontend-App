import fs from "fs";
import path from "path";

import {
  getAllRequestsSourceKey,
  resolvePrimaryListState,
  resolveRetainedDisplay,
} from "../utils/allRequestsDisplayState";

const screenSource = fs.readFileSync(
  path.resolve(__dirname, "../screens/BuildingAdmin/AllRequestsScreen.tsx"),
  "utf8",
);

describe("Building Admin All Requests loading states", () => {
  it("retains each source snapshot while its replacement is unavailable", () => {
    const previous = { sourceKey: "visitor:A", rows: ["A"] };

    expect(resolveRetainedDisplay(null, previous)).toEqual({
      snapshot: previous,
      isRetained: true,
    });

    const replacement = { sourceKey: "visitor:B", rows: ["B"] };
    expect(resolveRetainedDisplay(replacement, previous)).toEqual({
      snapshot: replacement,
      isRetained: false,
    });
  });

  it("keeps search whitespace associated with the retained snapshot", () => {
    const originalSourceKey = getAllRequestsSourceKey({
      type: "visitor",
      status: "all",
      searchQuery: "bob",
      startDate: "2026-09-01",
      endDate: "2026-09-09",
    });
    const whitespaceSourceKey = getAllRequestsSourceKey({
      type: "visitor",
      status: "all",
      searchQuery: " bob ",
      startDate: "2026-09-01",
      endDate: "2026-09-09",
    });

    expect(whitespaceSourceKey).not.toBe(originalSourceKey);

    const whitespaceSnapshot = {
      sourceKey: whitespaceSourceKey,
      rows: [],
    };
    expect(resolveRetainedDisplay(null, whitespaceSnapshot)).toEqual({
      snapshot: whitespaceSnapshot,
      isRetained: true,
    });
  });

  it("uses full states only when there is no usable snapshot", () => {
    expect(
      resolvePrimaryListState({
        hasUsableData: false,
        isLoading: true,
        isFetching: true,
        isError: false,
        isFetchingNextPage: false,
      }),
    ).toMatchObject({
      showSkeleton: true,
      showError: false,
    });

    expect(
      resolvePrimaryListState({
        hasUsableData: true,
        isLoading: true,
        isFetching: true,
        isError: false,
        isFetchingNextPage: false,
      }),
    ).toEqual({
      showSkeleton: false,
      showError: false,
      showRefreshError: false,
      isRefreshing: true,
    });

    expect(
      resolvePrimaryListState({
        hasUsableData: true,
        isLoading: false,
        isFetching: false,
        isError: true,
        isFetchingNextPage: false,
      }),
    ).toMatchObject({
      showError: false,
      showRefreshError: true,
    });
  });

  it("keeps pagination loading in the existing footer only", () => {
    expect(
      resolvePrimaryListState({
        hasUsableData: true,
        isLoading: false,
        isFetching: true,
        isError: false,
        isFetchingNextPage: true,
      }),
    ).toMatchObject({
      showSkeleton: false,
      isRefreshing: false,
    });
    expect(screenSource).toContain(
      "typeFilter === 'visitor' && isFetchingNextPage",
    );
    expect(screenSource).toContain(
      "typeFilter === 'visitor' && hasNextPageError",
    );
  });

  it("runs only the active valet dashboard source", () => {
    expect(screenSource).toContain(
      "useAllRequestsQuery(filters, { includeValet: false })",
    );
    expect(screenSource).toContain("typeFilter === 'valet',");
    expect(screenSource).toContain("return refetchValet()");
    expect(screenSource).toContain("return refetch()");
  });
});
