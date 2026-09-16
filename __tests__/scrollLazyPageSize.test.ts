import fs from "fs";
import path from "path";

const readSource = (relativePath: string) =>
  fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf8");

describe("scroll-lazy request page sizes", () => {
  const approvalQueries = readSource(
    "hooks/queries/useApprovalQueries.ts",
  );
  const allRequestsQuery = readSource(
    "hooks/queries/useAllRequestsQuery.ts",
  );
  const receptionistAllVisitors = readSource(
    "screens/Receptionist/AllVisitorsScreen.tsx",
  );
  const employeeRequests = readSource(
    "screens/Employee/VisitorRequestsScreen.tsx",
  );
  const managerDashboard = readSource(
    "screens/Manager/ManagerDashboardScreen.tsx",
  );
  const managerAllRequests = readSource(
    "screens/Manager/ManagerAllRequestsScreen.tsx",
  );

  it("uses 20 as the shared infinite request default", () => {
    expect(approvalQueries).toContain("const DEFAULT_PAGE_SIZE = 20;");
    expect(
      approvalQueries.match(
        /limit: params\?\.limit \|\| DEFAULT_PAGE_SIZE/g,
      ),
    ).toHaveLength(3);
  });

  it("uses 20 for Building Admin and Receptionist scroll lists", () => {
    expect(allRequestsQuery).toContain("const VISIT_PAGE_SIZE = 20;");
    expect(receptionistAllVisitors).toContain("const PAGE_SIZE = 20;");
    expect(receptionistAllVisitors).toContain("limit: PAGE_SIZE");
  });

  it("keeps Employee and Manager Dashboard on the shared default", () => {
    expect(employeeRequests).toContain(
      "useInfiniteVisitsQuery(visitsParams, true)",
    );
    expect(employeeRequests).not.toMatch(
      /useInfiniteVisitsQuery\(\{[\s\S]{0,250}limit:\s*(?!20)\d+/,
    );
    expect(managerDashboard).toContain(
      "useInfinitePendingApprovalsQuery()",
    );
  });

  it("keeps Manager approval history fixed at 20", () => {
    expect(approvalQueries).toContain(
      "const APPROVAL_HISTORY_PAGE_SIZE = 20;",
    );
    expect(managerAllRequests).toContain(
      "useInfiniteApprovalHistoryQuery(approvalParams)",
    );
  });
});