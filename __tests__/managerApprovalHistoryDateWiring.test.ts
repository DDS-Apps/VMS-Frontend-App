import fs from "fs";
import path from "path";

const screenSource = fs.readFileSync(
  path.join(
    process.cwd(),
    "screens/Manager/ManagerAllRequestsScreen.tsx",
  ),
  "utf8",
);
const employeeSource = fs.readFileSync(
  path.join(process.cwd(), "screens/Employee/VisitorRequestsScreen.tsx"),
  "utf8",
);
const dropdownSource = fs.readFileSync(
  path.join(process.cwd(), "components/shared/RequestStatusDropdown.tsx"),
  "utf8",
);
const enSource = fs.readFileSync(
  path.join(process.cwd(), "constants/i18n/en.ts"),
  "utf8",
);
const arSource = fs.readFileSync(
  path.join(process.cwd(), "constants/i18n/ar.ts"),
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

  it("client-filters granular statuses and drains every source page", () => {
    expect(screenSource).not.toMatch(
      /dateRange\.startDate[\s\S]{0,300}fetchNextPage\(\)/,
    );
    expect(screenSource).toContain(
      "items.filter(\n        (item) => mapStatusToVisitorRequestStatus(item.status) === selectedStatus",
    );
    expect(screenSource).toMatch(
      /selectedStatus &&\s*canAutomaticallyFetchNextPage\(\{[\s\S]{0,220}fetchNextPage\(\)/,
    );
    expect(screenSource).not.toContain("filteredItems.length === 0");
    expect(screenSource).toContain('case "cancelled":\n      return "cancelled";');
    expect(screenSource).toContain('case "auto_cancelled":\n      return "auto_cancelled";');
    expect(screenSource).toContain('case "expired":\n      return "expired";');
    expect(screenSource).toContain("default:\n      return status;");
    expect(screenSource).toContain("isError={isFetchNextPageError}");
    expect(screenSource).toContain("onPress={() => fetchNextPage()}");
  });

  it("keeps quick tabs in sync with precise status selection", () => {
    expect(employeeSource).toContain("onTabChange={handleTabChange}");
    expect(employeeSource).toContain('setSelectedTab("all");');
    expect(screenSource).toContain("onTabChange={handleTabChange}");
    expect(screenSource).toContain('setSelectedTab("all");');
    expect(screenSource).toContain("setSelectedStatus(undefined);");
  });

  it("offers canonical backend statuses and a localized all-statuses option", () => {
    expect(dropdownSource).toContain("import { REQUEST_STATUS_VALUES }");
    expect(dropdownSource).toContain("statuses={REQUEST_STATUS_VALUES}");
    expect(dropdownSource).toContain('t("common.allStatuses")');
    expect(enSource).toContain("allStatuses: 'All Statuses'");
    expect(arSource).toContain("allStatuses: 'كل الحالات'");
  });

  it("does not display retained results from another query key", () => {
    expect(screenSource).toContain("hasSameApprovalHistoryDateRange(");
    expect(screenSource).toMatch(
      /const displayedApprovalData = canDisplayRetainedApprovalData[\s\S]{0,100}\? retainedApprovalData\.data[\s\S]{0,50}: undefined/,
    );
  });
});