import * as fs from "fs";
import * as path from "path";

import { computeIsVisitExpired } from "../utils/visitExpiredGuard";

const overviewSource = fs.readFileSync(
  path.resolve(__dirname, "../screens/Dashboard/OverviewScreen.tsx"),
  "utf8",
);
const cardSource = fs.readFileSync(
  path.resolve(__dirname, "../components/shared/VisitorRequestCard.tsx"),
  "utf8",
);

describe("Manager dashboard walk-in expiration", () => {
  beforeAll(() => {
    jest.useFakeTimers().setSystemTime(new Date(2026, 8, 8, 12, 0));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it("marks a past walk-in as expired", () => {
    expect(
      computeIsVisitExpired("2026-09-07", "", undefined, "1 hour", {
        isWalkIn: true,
      }),
    ).toBe(true);
  });

  it("keeps a same-date walk-in active regardless of time fields", () => {
    expect(
      computeIsVisitExpired("2026-09-08", "12:00 AM", "12:01 AM", "1 minute", {
        isWalkIn: true,
      }),
    ).toBe(false);
  });

  it("keeps a future walk-in active", () => {
    expect(
      computeIsVisitExpired("2026-09-09", "", undefined, "1 hour", {
        isWalkIn: true,
      }),
    ).toBe(false);
  });

  it("uses the shared expiration helper for both walk-in table and card paths", () => {
    expect(overviewSource).toContain(
      "computeIsPendingApprovalWalkInExpired({",
    );
    expect(overviewSource).toMatch(
      /computeIsPendingApprovalWalkInExpired\(\{[\s\S]*?isWalkIn:\s*request\.isWalkIn[\s\S]*?status:\s*request\.status/,
    );
    expect(overviewSource).toMatch(
      /walkInVisitorTableItems[\s\S]*?isExpired:\s*isPendingApprovalRequestExpired\(request\)/,
    );
    expect(overviewSource).toMatch(
      /walkInVisitors\.slice\(0,\s*5\)[\s\S]*?const expired =[\s\S]*?computeIsVisitExpired[\s\S]*?isWalkIn:\s*request\.isWalkIn[\s\S]*?showExpiredState=\{true\}[\s\S]*?isExpired=\{expired\}/,
    );
    expect(overviewSource).toMatch(
      /visitors=\{walkInVisitorTableItems\}[\s\S]{0,80}showExpiredState=\{true\}/,
    );
    expect(overviewSource).toMatch(
      /const approvalExpirationTick = useTimeBoundaryTick\(/,
    );
    expect(overviewSource).toMatch(
      /walkInVisitorTableItems[\s\S]*?status:\s*request\.status[\s\S]*?isExpired:\s*isPendingApprovalRequestExpired\(request\)/,
    );
  });

  it("keeps the pending-host status unchanged in walk-in cards", () => {
    expect(overviewSource).toMatch(
      /walkInVisitors\.slice\(0,\s*5\)[\s\S]*?<VisitorRequestCard[\s\S]*?request=\{request\}[\s\S]*?showExpiredState=\{true\}[\s\S]*?isExpired=\{expired\}/,
    );
    expect(overviewSource).not.toMatch(
      /walkInVisitors\.slice\(0,\s*5\)[\s\S]{0,1000}statusOverride=/,
    );
  });

  it("shows the expired banner without enabling approval actions", () => {
    expect(cardSource).toMatch(
      /isExpired && \(showActions \|\| showExpiredState\)/,
    );
    expect(cardSource).toMatch(
      /if \(!showActions\) return null;[\s\S]*?<ApprovalActionGroup/,
    );
  });

  it("uses the same localized expired label in card and table modes", () => {
    const tableSource = fs.readFileSync(
      path.resolve(__dirname, "../components/shared/VisitorMatrixTable.tsx"),
      "utf8",
    );

    expect(cardSource).toMatch(/t\(["']visitor\.visitExpired["']\)/);
    expect(tableSource).toMatch(/t\(["']visitor\.visitExpired["']\)/);
    expect(tableSource).toMatch(
      /showApprovalExpiredBanner \|\| showReadOnlyExpiredBanner[\s\S]*?t\("visitor\.visitExpired"\)/,
    );
    expect(tableSource).toMatch(
      /showReadOnlyExpiredBanner \? \([\s\S]*?<RequestStatusBadge status=\{item\.status\} \/>[\s\S]*?visitor\.visitExpired/,
    );
  });
});
