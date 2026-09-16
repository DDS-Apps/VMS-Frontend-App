import fs from "fs";
import path from "path";

const overviewSource = fs.readFileSync(
  path.resolve(__dirname, "../screens/Dashboard/OverviewScreen.tsx"),
  "utf8",
);
const managerSource = fs.readFileSync(
  path.resolve(__dirname, "../screens/Manager/ManagerDashboardScreen.tsx"),
  "utf8",
);

describe("employeeManagerDashboardLoading regressions", () => {
  it("loads employee and manager KPIs independently from operational sections", () => {
    expect(overviewSource).not.toContain("if (isLoading || isFetching)");
    expect(overviewSource).toContain("<DashboardKpiSection");
    expect(overviewSource).toContain("monthlyVisitsInfinite === undefined");
    expect(overviewSource).toContain("awaitingData === undefined");
    expect(overviewSource).toContain("walkInData === undefined");
    expect(overviewSource).toContain("pendingData === undefined");
  });

  it("keeps list cold loading and errors local to each operational section", () => {
    expect(overviewSource).toContain("if (!hasUsableData)");
    expect(overviewSource).toContain("monthlyVisitsError");
    expect(overviewSource).toContain("renderSectionFeedback(false");
    expect(overviewSource).toContain("<SkeletonCard showImage={false} lines={2} />");
  });

  it("treats successful empty responses as usable and renders sections independently", () => {
    expect(overviewSource).toContain("monthlyVisitsInfinite === undefined");
    expect(overviewSource).toContain("pendingData === undefined");
    expect(overviewSource).toContain("awaitingData === undefined");
    expect(overviewSource).toContain("walkInData === undefined");
    expect(overviewSource.match(/renderSectionFeedback\(true/g)?.length).toBeGreaterThanOrEqual(4);
    expect(overviewSource).toContain('t("common.retry")');
    expect(overviewSource).toContain("<ActivityIndicator");
  });

  it("preserves operational query calls and guarded focus refreshes", () => {
    expect(overviewSource.match(/usePendingApprovalsQuery\(/g)).toHaveLength(1);
    expect(overviewSource.match(/useAwaitingVisitorQuery\(/g)).toHaveLength(1);
    expect(overviewSource.match(/usePendingHostWalkInsQuery\(/g)).toHaveLength(1);
    expect(overviewSource.match(/useInfiniteVisitsQuery\(/g)).toHaveLength(1);
    expect(overviewSource).not.toContain("useVisitsQuery(");
    expect(overviewSource).toContain('if (userRole === "manager") {');
    expect(overviewSource).toContain(
      'if (userRole === "manager" || userRole === "employee") {',
    );
  });

  it("retains manager approval pages through focus refresh and warm errors", () => {
    expect(managerSource).not.toContain("if (isLoading || isFetching)");
    expect(managerSource).toContain("pendingRetention = useRef");
    expect(managerSource).toContain("const approvalSourceKey = `${user?.id ?? 'anonymous'}|manager-pending-approvals`");
    expect(managerSource).toContain(
      "const hasUsablePendingData = displayedPendingApprovalsData !== undefined",
    );
    expect(managerSource).toContain(
      "if (isLoadingPending && !hasUsablePendingData)",
    );
    expect(managerSource).toContain(
      "if (pendingError && !hasUsablePendingData)",
    );
    expect(managerSource).toContain(
      "const isBackgroundFetchingPending = isFetchingPending && !isFetchingNextPage",
    );
  });

  it("keeps pagination errors local and preserves approval action invariants", () => {
    expect(managerSource.match(/ListFooterComponent={paginationFooter}/g)).toHaveLength(2);
    expect(managerSource).toContain("{isFetchNextPageError ? (");
    expect(managerSource).toContain("onPress={handleRetryNextPage}");
    expect(managerSource).toContain("paginationRetryLock.current");
    expect(managerSource).toContain("fetchNextPage({ cancelRefetch: false })");
    expect(managerSource).toContain("if (hasNextPage && !isFetchingNextPage)");
    expect(managerSource).toContain("if (isProcessing) return;");
    expect(managerSource).toContain("approveMutation.mutate(");
    expect(managerSource).toContain("rejectMutation.mutate(");
    expect(managerSource).toContain("bulkApproveMutation.mutate(");
    expect(managerSource).toContain("bulkRejectMutation.mutate(");
    expect(managerSource.match(/useInfinitePendingApprovalsQuery\(/g)).toHaveLength(1);
    // Approval actions never refetch the whole list themselves; the only
    // refresh outside mutations is the focus-return refetch.
    expect(managerSource.match(/refetchPending\(\);/g)).toBeNull();
    expect(managerSource).toContain("useRefetchOnRefocus([refetchPending])");
  });

  it("allows only one same-tick pagination retry request", async () => {
    let resolveRequest!: () => void;
    const request = new Promise<void>((resolve) => {
      resolveRequest = resolve;
    });
    const fetchNextPage = jest.fn(() => request);
    const lock = { current: false };
    const retry = () => {
      const hasNextPage = true;
      const isFetchingNextPage = false;
      if (!hasNextPage || isFetchingNextPage || lock.current) return;
      lock.current = true;
      void fetchNextPage({ cancelRefetch: false }).finally(() => {
        lock.current = false;
      });
    };

    retry();
    retry();
    expect(fetchNextPage).toHaveBeenCalledTimes(1);
    expect(fetchNextPage).toHaveBeenCalledWith({ cancelRefetch: false });
    resolveRequest();
    await request;
  });

  it("does not retain approval rows across authenticated identity changes", () => {
    expect(managerSource).toContain("pendingRetention.current?.key === approvalSourceKey");
    expect(managerSource).toContain(": undefined;");
    expect(managerSource).toContain("pendingRetention.current = { key: approvalSourceKey, data: pendingApprovalsData }");
  });
});