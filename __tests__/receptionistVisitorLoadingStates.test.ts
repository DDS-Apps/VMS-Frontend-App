import fs from "fs";
import path from "path";
import { getReceptionistStatusSources } from "@/utils/receptionistVisitorRules";

const readScreen = (name: string) =>
  fs.readFileSync(
    path.resolve(__dirname, `../screens/Receptionist/${name}.tsx`),
    "utf8",
  );

const allVisitorsSource = readScreen("AllVisitorsScreen");
const todaySource = readScreen("AllVisitorsTodayScreen");
const walkInSource = readScreen("WalkInVisitorsScreen");
const upcomingSource = readScreen("UpcomingVisitorsListScreen");
const detailSource = readScreen("VisitorDetailScreen");
const confirmationSource = readScreen("CheckInOutConfirmationScreen");

describe("Receptionist visitor loading states", () => {
  it("uses primary list states only before usable data exists", () => {
    expect(allVisitorsSource).toContain("if (isLoading && !displayedData)");
    expect(allVisitorsSource).toContain("if (isError && !displayedData)");
    expect(todaySource).toContain("if (isLoading && !displayedResponse)");
    expect(todaySource).toContain("if (isError && !displayedResponse)");
    expect(walkInSource).toContain("if (isLoading && !todayResponse)");
    expect(walkInSource).toContain("if (isError && !todayResponse)");
    expect(upcomingSource).toContain("if (isLoading && !displayedInfiniteData)");
    expect(upcomingSource).toContain("if (isError && !displayedInfiniteData)");
  });

  it("keeps cached lists visible with local refresh feedback and retry", () => {
    for (const source of [
      allVisitorsSource,
      todaySource,
      walkInSource,
      upcomingSource,
    ]) {
      expect(source).toContain("styles.inlineFeedback");
      expect(source).toContain("onPress={() => refetch()}");
      expect(source).toContain("<RefreshControl");
      expect(source).toContain("onRefresh={refetch}");
    }
  });

  it("retains the last successful response when a parameterized key fails", () => {
    expect(allVisitorsSource).toContain("useRetainedDatedData");
    expect(allVisitorsSource).toContain("JSON.stringify(queryParams)");
    expect(allVisitorsSource).toContain("const displayedData = retainedQuery.data?.data");
    expect(allVisitorsSource).toContain("t('requests.showingPreviousDataFrom').replace(");
    expect(allVisitorsSource).toContain("const displayedQuerySourceLabel = useMemo(");
    expect(todaySource).toContain("const queryParams = useMemo<ListReceptionTodayParams | undefined>(");
    expect(todaySource).toContain("JSON.stringify(queryParams ?? null)");
    expect(todaySource).toContain("!isPlaceholderData && todayResponse");
    expect(todaySource).toContain("const displayedResponse = retainedQuery.data?.response");
    expect(todaySource).toContain("t('requests.showingPreviousDataFrom').replace(");
    expect(upcomingSource).toContain("JSON.stringify({ todayKey, limit: PAGE_SIZE })");
    expect(upcomingSource).toContain("const displayedInfiniteData = retainedQuery.data?.response");
    expect(upcomingSource).toContain("t('requests.showingPreviousDataFrom').replace(");
  });

  it("keeps both status categories in combined retained-source provenance", () => {
    expect(
      getReceptionistStatusSources(
        "waiting_acceptance,accepted,visitor_accepted",
      ),
    ).toEqual(["waiting_acceptance", "accepted"]);
  });

  it("treats successful empty responses as usable data", () => {
    expect(allVisitorsSource).toContain("data ? { data, queryParams } : undefined");
    expect(todaySource).toContain("{ response: todayResponse, params: queryParams }");
    expect(upcomingSource).toContain("infiniteData ? { response: infiniteData, todayKey, limit: PAGE_SIZE } : undefined");
  });

  it("does not promote infinite pagination to the primary refresh state", () => {
    expect(allVisitorsSource).toContain(
      "isFetching && !isFetchingNextPage",
    );
    expect(allVisitorsSource).toContain(
      "isError && !isFetchNextPageError",
    );
    expect(allVisitorsSource).toContain(
      "canAutomaticallyFetchNextPage({",
    );
    expect(allVisitorsSource).toContain(
      "onPress={() => fetchNextPage()}",
    );
    expect(allVisitorsSource).toContain(
      "isError && !isFetchNextPageError && error",
    );
    expect(upcomingSource).toContain(
      "isFetching && !isFetchingNextPage && !!infiniteData",
    );
    expect(upcomingSource).toContain(
      "isError && !isFetchNextPageError",
    );
    expect(upcomingSource).toContain(
      "isError && !isFetchNextPageError && error",
    );
    expect(upcomingSource).toContain(
      "isFetchNextPageError ? t('common.retry') : t('common.seeMore')",
    );
    expect(upcomingSource.indexOf("{groups.length > 0 ? (")).toBeLessThan(
      upcomingSource.indexOf("{hasNextPage ? ("),
    );
  });

  it("renders legacy detail data until server detail data succeeds", () => {
    expect(detailSource).toContain("} : legacyVisitor ?? null;");
    expect(detailSource).toContain("if (isLoading && !visitor)");
    expect(detailSource).toContain("if (!visitor)");
    expect(detailSource).toContain("styles.inlineFeedback");
    expect(detailSource).toContain("onRefresh={refetch}");
    expect(detailSource.indexOf("visitDetails ? {")).toBeLessThan(
      detailSource.indexOf("} : legacyVisitor ?? null;"),
    );
  });

  it("leaves the query-free confirmation screen unchanged", () => {
    expect(confirmationSource).not.toContain("useQuery");
    expect(confirmationSource).not.toContain("refetch");
    expect(confirmationSource).not.toContain("RefreshControl");
  });
});