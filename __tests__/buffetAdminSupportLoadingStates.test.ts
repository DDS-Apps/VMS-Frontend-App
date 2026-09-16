import fs from "fs";
import path from "path";

const locationsSource = fs.readFileSync(
  path.resolve(
    __dirname,
    "../screens/BuffetAdmin/BuffetAdminLocationsScreen.tsx",
  ),
  "utf8",
);
const staffSource = fs.readFileSync(
  path.resolve(
    __dirname,
    "../screens/BuffetAdmin/BuffetAdminStaffScreen.tsx",
  ),
  "utf8",
);
const buffetQueriesSource = fs.readFileSync(
  path.resolve(__dirname, "../hooks/queries/useBuffetQueries.ts"),
  "utf8",
);

describe("Buffet Admin support screen loading states", () => {
  it("consumes locations and load summary as independent query states", () => {
    expect(locationsSource).toContain(
      "const locationsQuery = useBuffetAdminLocationsQuery();",
    );
    expect(locationsSource).toContain(
      "const loadSummaryQuery = useBuffetLoadSummaryQuery();",
    );
    expect(locationsSource).not.toMatch(
      /const isLoading\s*=\s*isLoadingLocations\s*\|\|\s*isLoadingLoadSummary/,
    );
    expect(locationsSource).not.toContain(
      "isLoadingLocations || isLoadingLoadSummary",
    );
  });

  it("limits cold location states to the list and retains cached cards", () => {
    expect(locationsSource).toContain(
      "(locationsQuery.isLoading || locationsQuery.isFetching) && !locationsResponse",
    );
    expect(locationsSource).toContain(
      "locationsQuery.isError && !locationsResponse",
    );
    expect(locationsSource).toContain(
      "{locations.map((location) => renderLocationCard(location))}",
    );
    expect(locationsSource).toContain(
      "onPress={() => locationsQuery.refetch()}",
    );

    const kpis = locationsSource.indexOf("<KPICardRow>");
    const coldLoading = locationsSource.indexOf(
      "(locationsQuery.isLoading || locationsQuery.isFetching) && !locationsResponse",
    );
    expect(kpis).toBeGreaterThan(-1);
    expect(coldLoading).toBeGreaterThan(kpis);
  });

  it("keeps load-summary feedback compact without replacing location data", () => {
    expect(locationsSource).toContain("loadSummaryQuery.isError ? (");
    expect(locationsSource).toContain(
      "loadSummaryQuery.isFetching ? (",
    );
    expect(locationsSource).toContain(
      "onPress={() => loadSummaryQuery.refetch()}",
    );
    expect(locationsSource).toContain(
      "currentRequests: loadData?.tasksToday || 0",
    );
    expect(locationsSource).not.toMatch(
      /loadSummaryQuery\.(?:isLoading|isFetching)[\s\S]{0,1000}locations\.map/,
    );
    expect(locationsSource.indexOf("loadSummaryQuery.isFetching ? (")).toBeLessThan(
      locationsSource.indexOf("loadSummaryQuery.isError ? ("),
    );
    expect(locationsSource.indexOf("locationsQuery.isFetching ? (")).toBeLessThan(
      locationsSource.indexOf("locationsQuery.isError ? (", locationsSource.indexOf("locationsQuery.isFetching ? (")),
    );
  });

  it("does not add automatic or pull-to-refresh requests", () => {
    expect(
      locationsSource.match(/useBuffetAdminLocationsQuery\(\)/g),
    ).toHaveLength(1);
    expect(
      locationsSource.match(/useBuffetLoadSummaryQuery\(\)/g),
    ).toHaveLength(1);
    expect(locationsSource).not.toContain("useEffect(");
    expect(locationsSource).not.toContain("RefreshControl");
    expect(locationsSource).not.toContain("onRefresh=");
  });

  it("preserves Staff cached-background behavior", () => {
    expect(staffSource).toContain(
      "const { data: staffResponse, isLoading, isFetching } = useBuffetAdminStaffQuery();",
    );
    expect(staffSource).toContain("if (isLoading && !staffResponse)");
    expect(staffSource).not.toContain("if (isLoading || isFetching)");
    expect(buffetQueriesSource).toContain(
      "placeholderData: keepPreviousData",
    );
  });

  it("preserves Staff duty mutation wiring and action guards", () => {
    expect(staffSource).toContain(
      "const updateDutyMutation = useUpdateStaffDutyMutation();",
    );
    expect(staffSource).toContain(
      "{ id: staffId, data: { dutyStatus: newStatus } }",
    );
    expect(staffSource).toContain("onSettled: () => {");
    expect(staffSource).toContain("setTogglingStaffId(null);");
    expect(staffSource).toContain(
      "disabled={togglingStaffId === item.id}",
    );
  });
});