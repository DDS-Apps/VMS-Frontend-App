import fs from "fs";
import path from "path";

const employeeSource = fs.readFileSync(
  path.resolve(__dirname, "../screens/Employee/VisitorRequestsScreen.tsx"),
  "utf8",
);
const managerListSource = fs.readFileSync(
  path.resolve(__dirname, "../screens/Manager/ManagerAllRequestsScreen.tsx"),
  "utf8",
);
const managerDetailSource = fs.readFileSync(
  path.resolve(
    __dirname,
    "../screens/Manager/ManagerApprovalDetailScreen.tsx",
  ),
  "utf8",
);

describe("Employee and Manager visitor loading states", () => {
  it("keeps the employee initial skeleton and makes refetch errors local", () => {
    expect(employeeSource).toContain(
      "const visitsSourceKey = JSON.stringify(visitsParams)",
    );
    expect(employeeSource).toContain(
      "useRetainedDatedData(visitsSourceKey, visitsData)",
    );
    expect(employeeSource).toContain("if (isLoading && !displayedVisitsData)");
    expect(employeeSource).toContain("if (error && !displayedVisitsData)");
    expect(employeeSource).not.toContain(
      "if (isLoading && requests.length === 0)",
    );
    expect(employeeSource).toContain(
      't("requests.showingPreviousDataFrom").replace(',
    );
    expect(employeeSource).toContain(
      "isFetching && !isFetchingNextPage ? (",
    );
    expect(employeeSource).toContain(
      "error && !isFetchNextPageError ? (",
    );
    expect(employeeSource).toContain("{isFetchNextPageError ? (");
    expect(employeeSource).toContain("onPress={() => fetchNextPage()}");
    expect(employeeSource).toContain("{t(\"common.retry\")}");
  });

  it("uses manager full-page states only before a usable page exists", () => {
    expect(managerListSource).toContain(
      "const approvalSourceKey = JSON.stringify(approvalParams)",
    );
    expect(managerListSource).toContain(
      "useRetainedDatedData(approvalSourceKey, data)",
    );
    expect(managerListSource).toContain(
      "const displayedApprovalData = canDisplayRetainedApprovalData",
    );
    expect(managerListSource).toContain(
      "? retainedApprovalData.data",
    );
    expect(managerListSource).toContain(
      "const hasUsablePages = !!displayedApprovalData?.pages?.length",
    );
    expect(managerListSource).toContain(
      "if (isLoading && !hasUsablePages)",
    );
    expect(managerListSource).toContain("if (error && !hasUsablePages)");
    expect(managerListSource).toContain(
      't("requests.showingPreviousDataFrom").replace(',
    );
    expect(managerListSource).toContain("onPress={() => refetch()}");
  });

  it("keeps manager pagination feedback in list footers", () => {
    expect(managerListSource).toContain(
      "<ListLoadingFooter isLoading={isFetchingNextPage} />",
    );
    expect(
      managerListSource.match(/ListFooterComponent={paginationFooter}/g),
    ).toHaveLength(2);
    expect(managerListSource).toContain("{isFetchNextPageError ? (");
    expect(managerListSource).not.toContain(
      "isLoadingCompleteDateRange ? (",
    );
    expect(managerListSource).toContain(
      "isFetching && !isFetchingNextPage ? (",
    );
    expect(managerListSource).toContain(
      "canAutomaticallyFetchNextPage({",
    );
  });

  it("does not block cached manager detail during a refetch", () => {
    expect(managerDetailSource).toContain(
      "if ((isLoading || isFetching) && !request)",
    );
    expect(managerDetailSource).not.toContain(
      "if (isLoading || isFetching)",
    );
    expect(managerDetailSource).toContain("if (!request)");
    expect(managerDetailSource).toContain("{error ? (");
    expect(managerDetailSource).toContain(") : isFetching ? (");
    expect(managerDetailSource).toContain("{t(\"common.retry\")}");
  });

  it("preserves manager detail mutations and action guards", () => {
    expect(managerDetailSource).toContain(
      "if (isReadOnlyRole || computeCurrentVisitExpiration()) return;",
    );
    expect(managerDetailSource).toContain(
      "if (isWalkInEditMode && hasVisitStarted) return;",
    );
    expect(managerDetailSource).toContain(
      "approveMutation.mutate(",
    );
    expect(managerDetailSource).toContain("rejectMutation.mutate(");
    expect(managerDetailSource).toContain("cancelMutation.mutate(");
    expect(managerDetailSource).toContain("updateMutation.mutate(");
  });
});