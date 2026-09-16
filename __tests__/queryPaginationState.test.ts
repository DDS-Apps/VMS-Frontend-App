import { canAutomaticallyFetchNextPage } from "@/utils/queryPaginationState";

describe("canAutomaticallyFetchNextPage", () => {
  it("allows the next page only while the query is idle and healthy", () => {
    expect(
      canAutomaticallyFetchNextPage({
        hasNextPage: true,
        isFetching: false,
        isFetchNextPageError: false,
      }),
    ).toBe(true);
  });

  it.each([
    ["the last page is already loaded", false, false, false],
    ["a primary refresh is running", true, true, false],
    ["a next-page request is running", true, true, false],
    ["the previous next-page request failed", true, false, true],
  ])("blocks automatic loading when %s", (_, hasNextPage, isFetching, isFetchNextPageError) => {
    expect(
      canAutomaticallyFetchNextPage({
        hasNextPage,
        isFetching,
        isFetchNextPageError,
      }),
    ).toBe(false);
  });
});