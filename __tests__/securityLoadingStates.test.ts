import fs from "fs";
import path from "path";

const checkInSource = fs.readFileSync(
  path.resolve(__dirname, "../screens/Security/SecurityCheckInScreen.tsx"),
  "utf8",
);
const detailSource = fs.readFileSync(
  path.resolve(
    __dirname,
    "../screens/Security/SecurityVisitorDetailScreen.tsx",
  ),
  "utf8",
);
const gateLogSource = fs.readFileSync(
  path.resolve(__dirname, "../screens/Security/GateEventsLogScreen.tsx"),
  "utf8",
);

describe("Security module loading states", () => {
  it("keeps the previous visitor list while date parameters refresh", () => {
    expect(checkInSource).toMatch(
      /useSecurityVisitorsQuery\(queryParams,[\s\S]{0,120}placeholderData: \(previousData\) => previousData/,
    );
    expect(checkInSource).toContain("useRetainedDatedData");
    expect(checkInSource).toContain("displayedSourceContext");
    expect(checkInSource).toContain("isShowingPreviousQueryData");
    expect(checkInSource).toContain("if (isLoading && !displayedApiResponse)");
    expect(checkInSource).toContain("if (isError && !displayedApiResponse)");
  });

  it("keeps cached visitor details visible during refetch and refetch errors", () => {
    expect(detailSource).toContain("if (isLoading && !visitorData)");
    expect(detailSource).toContain("if (!visitorData)");
    expect(detailSource).toContain("{isFetching || isError ? (");
    expect(detailSource).toContain("{t('common.retry')}");
  });

  it("loads gate-log totals independently from the filtered list", () => {
    expect(gateLogSource).toContain("isFetching: isSummaryFetching");
    expect(gateLogSource).toContain("isError: isSummaryError");
    expect(gateLogSource).toContain("refetch: refetchSummary");
    expect(gateLogSource).toContain("enabled: isFilteredView");
    expect(gateLogSource).toContain("displayedLogsResponse = isFilteredView");
    expect(gateLogSource).toContain("isSummaryFetching && !allLogsResponse");
    expect(gateLogSource).toContain("isSummaryError && !allLogsResponse");
  });

  it("keeps the previous filtered gate logs while filters refresh", () => {
    expect(gateLogSource).toMatch(
      /useSecurityGateLogsQuery\([\s\S]{0,260}placeholderData: \(previousData\) => previousData/,
    );
    expect(gateLogSource).toContain("lastSuccessfulFilteredResponseRef");
    expect(gateLogSource).toContain("isLogsFetching && !displayedLogsResponse");
    expect(gateLogSource).toContain("isLogsError && !displayedLogsResponse");
  });
});
