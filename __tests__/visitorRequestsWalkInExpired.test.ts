import fs from "fs";
import path from "path";

const screenSource = fs.readFileSync(
  path.resolve(__dirname, "../screens/Employee/VisitorRequestsScreen.tsx"),
  "utf8",
);

describe("Employee Visitor Requests walk-in expiration wiring", () => {
  it("uses the shared Riyadh walk-in expiration rule", () => {
    expect(screenSource).toMatch(
      /import\s*\{[\s\S]{0,150}computeIsVisitExpired[\s\S]{0,150}\}\s*from\s*"@\/utils\/visitExpiredGuard"/,
    );
    expect(screenSource).toContain(
      'import { useRiyadhBusinessDateKey } from "@/hooks/useRiyadhBusinessDateKey"',
    );
    expect(screenSource).toContain("useRiyadhBusinessDateKey()");
    expect(screenSource).toContain("if (!request.isWalkIn) return false");
    expect(screenSource).toContain(
      "if (isPendingApprovalWalkInExpired(request)) return true",
    );
    expect(screenSource).toMatch(
      /computeIsVisitExpired\([\s\S]{0,300}\{ isWalkIn: true \}/,
    );
  });

  it("passes the expired state to employee request table rows", () => {
    expect(screenSource).toContain("isExpired: isWalkInExpired(request)");
    expect(screenSource).toContain("status: request.status");
    expect(screenSource).toMatch(
      /<VisitorMatrixTable[\s\S]{0,500}showExpiredState=\{true\}/,
    );
  });

  it("passes the expired state to employee request cards", () => {
    expect(screenSource).toMatch(
      /<VisitorRequestCard[\s\S]{0,200}isExpired=\{isWalkInExpired\(item\)\}[\s\S]{0,100}showExpiredState=\{true\}/,
    );
    expect(screenSource).not.toMatch(
      /statusOverride=\{\s*isPendingApprovalWalkInExpired\(item\) \? "expired" : undefined\s*\}/,
    );
  });

  it("subscribes the open screen to Riyadh business-date changes", () => {
    expect(screenSource).toContain("useRiyadhBusinessDateKey()");
  });
});
