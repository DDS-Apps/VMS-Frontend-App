import fs from "fs";
import path from "path";

const read = (relativePath: string) =>
  fs.readFileSync(path.resolve(__dirname, "..", relativePath), "utf8");

const buffetAll = read("screens/BuffetAdmin/BuffetAllRequestsScreen.tsx");
const buffetHome = read("screens/BuffetAdmin/BuffetAdminDashboardScreen.tsx");
const valetAll = read("screens/ValetAdmin/ValetAllRequestsScreen.tsx");
const driverTasks = read("screens/Driver/DriverTasksScreen.tsx");
const securityCheckIn = read("screens/Security/SecurityCheckInScreen.tsx");
const buffetBoard = read("screens/Buffet/BuffetBoardScreen.tsx");
const buffetQueries = read("hooks/queries/useBuffetQueries.ts");
const securityQueries = read("hooks/queries/useSecurityQueries.ts");
const valetQueries = read("hooks/queries/useValetAdminQueries.ts");

describe("operations dashboard loading behavior", () => {
  it("keeps Buffet Admin all-request rows and counts through warm date refreshes", () => {
    expect(buffetAll).toContain("useRetainedDatedData(dateParam, tasksData)");
    expect(buffetAll).toContain("const displayedTasksData = retainedTasks.data");
    expect(buffetAll).toContain(
      "if ((isLoadingTasks || isFetchingTasks) && !displayedTasksData)",
    );
    expect(buffetAll).toContain("if (isTasksError && !displayedTasksData)");
    expect(buffetAll).toContain(
      "displayedTasksData && (isFetchingTasks || isTasksError || retainedTasks.isRetained)",
    );
    expect(buffetAll).not.toContain("isRefetchingTasks");
    expect(buffetAll).not.toMatch(
      /<ScreenFlatList[\s\S]{0,500}refreshControl=/,
    );
    expect(buffetAll).toContain("<DashboardKpiSection />");
    expect(buffetAll).not.toContain("const totalRequests = requests.length");
    expect(buffetAll).not.toContain("<StatsCards");
    expect(buffetAll).toContain("onPressRow={(id) =>");
    expect(buffetAll).not.toContain("if (isLoadingTasks) {");
    expect(buffetAll).not.toMatch(/\btask\.visitorName\b/);
  });

  it("keeps Buffet Admin home KPIs and cards mounted during poll, focus, and pull refresh", () => {
    expect(buffetHome).toContain(
      "if ((isLoadingTasks || isFetchingTasks) && !tasksResponse)",
    );
    expect(buffetHome).toContain("if (isTasksError && !tasksResponse)");
    expect(buffetHome).toContain(
      "isFetchingTasks || (isTasksError && tasksResponse)",
    );
    expect(buffetHome).not.toContain("isRefetchingTasks");
    expect(buffetHome).toContain("value={String(stats.total)}");
    expect(buffetHome).toContain("navigation.navigate(ROUTES.BUFFET_ALL_REQUESTS");
    expect(buffetHome).not.toContain("if (isLoading || isFetching)");
    expect(buffetHome).not.toMatch(/\bitem\.visitorName\b/);
  });

  it("treats Valet Admin empty data as usable and retains its last successful date", () => {
    expect(valetAll).toContain("useRetainedDatedData(dateStr, data)");
    expect(valetAll).toContain("if (isLoading && !displayedData)");
    expect(valetAll).toContain("if (isError && !displayedData)");
    expect(valetAll).toContain("isFetching || (isError && displayedData)");
    expect(valetAll).toContain("refreshing={isRefetching}");
    expect(valetAll).toContain("onRefresh={refreshDashboard}");
    expect(valetAll).toContain("<DashboardKpiSection />");
    expect(valetAll).toContain("user?.role === 'valet_admin'");
    expect(valetAll).toContain("<StatsCards");
    expect(valetAll).toContain("getDisplayDate(displayedDate)");
  });

  it("keeps Security visitors private and usable while refreshing or after failure", () => {
    expect(securityCheckIn).toContain(
      "placeholderData: (previousData) => previousData",
    );
    expect(securityCheckIn).toContain("useRetainedDatedData");
    expect(securityCheckIn).toContain(
      "if (isLoading && !displayedApiResponse)",
    );
    expect(securityCheckIn).toContain("if (isError && !displayedApiResponse)");
    expect(securityCheckIn).toContain(
      "isFetching || (isError && displayedApiResponse)",
    );
    expect(securityCheckIn).toContain("limit: 100");
    expect(securityCheckIn).toContain("ROUTES.SECURITY_VISITOR_DETAIL");
    expect(securityCheckIn).not.toContain("visitor.email");
    expect(securityCheckIn).not.toContain("visitor.phone");
    expect(securityCheckIn).toContain("useRetainedDatedData");
    expect(securityCheckIn).toContain("const sourceContext = useMemo");
    expect(securityCheckIn).toContain("displayedSourceContext.status");
    expect(securityCheckIn).toContain(
      "requests.showingPreviousDataFrom",
    );
    expect(securityCheckIn).toContain(
      "apiResponse !== undefined && !isPlaceholderData",
    );
    expect(securityCheckIn).toContain("<DashboardKpiSection />");
  });

  it("keeps each overlapping Buffet mutation indicator independent", () => {
    expect(buffetBoard).toContain(
      "const [updatingTaskIds, setUpdatingTaskIds]",
    );
    expect(buffetBoard).toContain("updateStatusMutation.mutateAsync");
    expect(buffetBoard).toContain("next.delete(taskId);");
    expect(buffetBoard).toContain("const isUpdating = updatingTaskIds.has(task.id)");
    expect(buffetBoard).not.toContain("setUpdatingTaskId(null)");
  });

  it("preserves the synchronous Driver task source, actions, concurrency, and navigation", () => {
    expect(driverTasks).toContain("getRequestsByDriverId(driver.id)");
    expect(driverTasks).toContain("onNavigateToDetail(task.id)");
    expect(driverTasks).toContain("const [updatingTaskId, setUpdatingTaskId]");
    expect(driverTasks).toContain("disabled={isUpdating}");
    expect(driverTasks).toContain("driverParkVehicleAutomatically(taskId)");
    expect(driverTasks).toContain("driverMarkReadyForPickup(taskId)");
    expect(driverTasks).toContain("driverCompleteRequest(taskId)");
    expect(driverTasks).toContain("driverRejectRequest(taskId)");
    expect(driverTasks).not.toContain("useQuery(");
  });

  it("does not alter request keys, params, endpoints, pagination limits, or polling", () => {
    expect(buffetQueries).toContain(
      "queryKey: buffetKeys.adminTasksList(params)",
    );
    expect(buffetQueries).toContain(
      "queryFn: () => buffetApiService.getBuffetAdminTasks(params)",
    );
    expect(buffetAll).toContain(
      "useBuffetAdminTasksQuery({ date: dateParam })",
    );
    expect(buffetHome).toContain(
      "useBuffetAdminTasksQuery({ date: todayParam })",
    );
    expect(securityQueries).toContain(
      "queryKey: securityKeys.visitorsList(params)",
    );
    expect(valetQueries).toContain(
      "queryKey: valetAdminKeys.parkingDashboard(startDate, endDate)",
    );
    expect(valetQueries).toContain(
      "queryFn: () => valetAdminApiService.getParkingDashboard(startDate, endDate)",
    );
  });
});