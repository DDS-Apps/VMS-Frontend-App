import fs from "fs";
import path from "path";

const readSource = (relativePath: string) =>
  fs.readFileSync(path.resolve(__dirname, `../${relativePath}`), "utf8");

const receptionistSource = readSource(
  "screens/Receptionist/ReceptionistDashboardScreen.tsx",
);
const buildingAdminSource = readSource(
  "screens/BuildingAdmin/BuildingAdminDashboardScreen.tsx",
);
const adminSource = readSource("screens/Admin/AdminDashboardScreen.tsx");

describe("Reception and Admin dashboard loading", () => {
  it("uses a whole-screen receptionist skeleton only while every section is cold", () => {
    expect(receptionistSource).toContain("const isColdLoading =");
    expect(receptionistSource).toContain(
      "!hasAnyUsableData &&\n    isLoading &&\n    isLoadingAllVisitors",
    );
    expect(receptionistSource).toContain("if (isColdLoading)");
    expect(receptionistSource).not.toContain("if (isLoading || isFetching)");
  });

  it("treats empty query responses as usable and renders receptionist sections independently", () => {
    expect(receptionistSource).toContain(
      "const hasTodayData = todayResponse !== undefined",
    );
    expect(receptionistSource).toContain(
      "const hasAllVisitorsData = allVisitsData !== undefined",
    );
    expect(receptionistSource).toContain("<DashboardKpiSection />");
    expect(receptionistSource).toContain(
      "renderSectionState(isLoading, isError, refetchToday)",
    );
    expect(receptionistSource).toContain(
      "renderSectionState(isLoadingAllVisitors, isAllVisitorsError, refetchAllVisitors)",
    );
  });

  it("keeps warm receptionist content mounted with refresh and failure feedback", () => {
    expect(receptionistSource).toContain(
      "hasAnyUsableData && (isRefreshing || isError || isAllVisitorsError)",
    );
    expect(receptionistSource).not.toContain("RefreshControl");
    expect(receptionistSource).not.toContain("refreshDashboard");
    expect(receptionistSource).toContain("!isFetchingAllVisitorsNextPage");
    expect(receptionistSource).toContain("t('common.retry')");
  });

  it("keeps receptionist operational queries while removing the KPI-only monthly query", () => {
    expect(receptionistSource.match(/useTodayVisitorsQuery\(\)/g)).toHaveLength(1);
    expect(receptionistSource.match(/useInfiniteVisitsQuery\(\{/g)).toHaveLength(1);
    expect(receptionistSource).toContain("myRequestsOnly: false,\n    limit: 100,");
    expect(receptionistSource).not.toContain("startOfCurrentMonthStr");
  });

  it("allows each Building Admin KPI source to become ready independently", () => {
    for (const marker of [
      "const hasVisitsData = visitsInfinite !== undefined",
      "const hasPendingData = pendingData !== undefined",
      "const hasBuffetData = buffetData !== undefined",
      "const hasValetData = valetData !== undefined",
    ]) {
      expect(buildingAdminSource).toContain(marker);
    }
    expect(buildingAdminSource).toContain(
      "renderSectionState(buffetLoading, buffetError, refetchBuffet)",
    );
    expect(buildingAdminSource).toContain(
      "renderSectionState(valetLoading, valetError, refetchValet)",
    );
    expect(buildingAdminSource).toContain("staffOverview ? (");
  });

  it("preserves Building Admin focus refresh, actions, and request counts", () => {
    for (const refetch of [
      "refetchVisits();",
      "refetchPending();",
      "refetchBuffet();",
      "refetchValet();",
    ]) {
      expect(buildingAdminSource).toContain(refetch);
    }
    expect(buildingAdminSource).not.toContain("RefreshControl");
    expect(buildingAdminSource).not.toContain("refreshDashboard");
    expect(buildingAdminSource).toContain("!visitsIsFetchingNextPage");
    expect(buildingAdminSource.match(/useInfiniteVisitsQuery\(/g)).toHaveLength(1);
    expect(buildingAdminSource.match(/usePendingApprovalsQuery\(/g)).toHaveLength(1);
    expect(buildingAdminSource.match(/useBuffetLoadSummaryQuery\(/g)).toHaveLength(1);
    expect(buildingAdminSource.match(/useTodaysValetAssignmentsQuery\(/g)).toHaveLength(1);
    expect(buildingAdminSource).toContain("navigation.navigate(ROUTES.USERS_ROLES");
    expect(buildingAdminSource).toContain("navigation.navigate(ROUTES.ALL_REQUESTS");
    expect(buildingAdminSource).toContain("navigation.navigate(ROUTES.ALL_LOCATIONS");
  });

  it("leaves the query-free role-based Admin dashboard behavior intact", () => {
    expect(adminSource).toContain("switch (role)");
    expect(adminSource).toContain('case "building_admin"');
    expect(adminSource).toContain('case "buffet_admin"');
    expect(adminSource).toContain('case "valet_admin"');
    expect(adminSource).toContain('case "security"');
    expect(adminSource).not.toContain("useQuery");
  });
});