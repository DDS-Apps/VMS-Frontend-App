import {
  getAdminDatePickerMode,
  getBuffetSingleDateParams,
  fetchValetTasksForDateRange,
  getNextVisitPageParam,
  shouldAutoFetchAllVisitorPages,
  shouldFetchNextVisitPage,
} from "@/utils/allRequestsQueryHelpers";

describe("Admin All Requests query helpers", () => {
  it("uses one date only for Buffet requests and picker selection", () => {
    expect(getAdminDatePickerMode("buffet")).toBe("single");
    expect(getAdminDatePickerMode("visitor")).toBe("range");
    expect(getBuffetSingleDateParams("2026-09-04")).toEqual({
      date: "2026-09-04",
    });
    expect(getBuffetSingleDateParams()).toBeUndefined();
  });

  it("advances visitor pages until totalPages is reached", () => {
    expect(
      getNextVisitPageParam({ pagination: { page: 1, totalPages: 3 } }),
    ).toBe(2);
    expect(
      getNextVisitPageParam({ pagination: { page: "2", totalPages: "3" } }),
    ).toBe(3);
    expect(
      getNextVisitPageParam({ pagination: { page: 3, totalPages: 3 } }),
    ).toBeUndefined();
  });

  it("loads the next visitor page only near the scroll boundary", () => {
    const base = {
      requestType: "visitor",
      hasNextPage: true,
      isFetchingNextPage: false,
      viewportHeight: 800,
      contentHeight: 2400,
    };

    expect(shouldFetchNextVisitPage({ ...base, scrollOffset: 1400 })).toBe(
      true,
    );
    expect(shouldFetchNextVisitPage({ ...base, scrollOffset: 1000 })).toBe(
      false,
    );
    expect(
      shouldFetchNextVisitPage({
        ...base,
        scrollOffset: 1400,
        isFetchingNextPage: true,
      }),
    ).toBe(false);
    expect(
      shouldFetchNextVisitPage({
        ...base,
        requestType: "all",
        scrollOffset: 1400,
      }),
    ).toBe(true);
    expect(
      shouldFetchNextVisitPage({
        ...base,
        scrollOffset: 1400,
        hasNextPageError: true,
      }),
    ).toBe(false);
    expect(
      shouldFetchNextVisitPage({
        ...base,
        scrollOffset: 1400,
        requestType: "buffet",
      }),
    ).toBe(false);
  });

  it("continues visitor pagination when client filters can hide the first page", () => {
    expect(
      shouldAutoFetchAllVisitorPages({
        requestType: "visitor",
        status: "approved",
        searchQuery: "",
        hasNextPage: true,
        isFetchingNextPage: false,
      }),
    ).toBe(true);
    expect(
      shouldAutoFetchAllVisitorPages({
        requestType: "visitor",
        status: "all",
        searchQuery: "later page visitor",
        hasNextPage: true,
        isFetchingNextPage: false,
      }),
    ).toBe(true);
    expect(
      shouldAutoFetchAllVisitorPages({
        requestType: "visitor",
        status: "all",
        searchQuery: "",
        hasNextPage: true,
        isFetchingNextPage: false,
      }),
    ).toBe(false);
    expect(
      shouldAutoFetchAllVisitorPages({
        requestType: "all",
        status: "approved",
        searchQuery: "",
        hasNextPage: true,
        isFetchingNextPage: false,
      }),
    ).toBe(true);
    expect(
      shouldAutoFetchAllVisitorPages({
        requestType: "visitor",
        status: "approved",
        searchQuery: "",
        hasNextPage: true,
        isFetchingNextPage: false,
        hasNextPageError: true,
      }),
    ).toBe(false);
  });

  it("loads and deduplicates every Valet date for the all-module query", async () => {
    const dates: string[] = [];
    const tasks = await fetchValetTasksForDateRange(
      "2026-09-01",
      "2026-09-03",
      async (date) => {
        dates.push(date!);
        return { data: [{ id: `valet-${date}` }, { id: "shared" }] };
      },
    );

    expect(dates).toEqual(["2026-09-01", "2026-09-02", "2026-09-03"]);
    expect(tasks.map((task) => task.id)).toEqual([
      "valet-2026-09-01",
      "shared",
      "valet-2026-09-02",
      "valet-2026-09-03",
    ]);
  });
});
