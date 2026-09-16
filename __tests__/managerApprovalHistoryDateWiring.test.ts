import fs from "fs";
import path from "path";

const screenSource = fs.readFileSync(
  path.join(
    process.cwd(),
    "screens/Manager/ManagerAllRequestsScreen.tsx",
  ),
  "utf8",
);

describe("Manager approval-history date filter wiring", () => {
  it("builds the API query from the selected date range", () => {
    expect(screenSource).toContain("buildManagerApprovalHistoryParams({");
    expect(screenSource).toContain("startDate: dateRange.startDate");
    expect(screenSource).toContain("endDate: dateRange.endDate");
    expect(screenSource).toContain(
      "useInfiniteApprovalHistoryQuery(approvalParams)",
    );
  });

  it("does not drain or client-filter approval-history pages", () => {
    expect(screenSource).not.toMatch(
      /dateRange\.startDate[\s\S]{0,300}fetchNextPage\(\)/,
    );
    expect(screenSource).not.toContain("items.filter(");
    expect(screenSource).toContain("const filteredItems = items;");
  });

  it("does not display retained results from another query key", () => {
    expect(screenSource).toContain("hasSameApprovalHistoryDateRange(");
    expect(screenSource).toMatch(
      /const displayedApprovalData = canDisplayRetainedApprovalData[\s\S]{0,100}\? retainedApprovalData\.data[\s\S]{0,50}: undefined/,
    );
  });
});