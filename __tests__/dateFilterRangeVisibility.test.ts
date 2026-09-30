import fs from "fs";
import path from "path";

const dateFilteredScreens = [
  "Employee/VisitorRequestsScreen",
  "Manager/ManagerAllRequestsScreen",
  "Receptionist/AllVisitorsScreen",
  "Security/SecurityCheckInScreen",
  "Driver/DriverTasksScreen",
  "Buffet/BuffetBoardScreen",
  "BuffetAdmin/BuffetAllRequestsScreen",
  "ValetAdmin/ValetAllRequestsScreen",
  "Reports/ReportsScreen",
];

describe("active date ranges on filtered screens", () => {
  it.each(dateFilteredScreens)("%s shows the range next to its date control", (screen) => {
    const source = fs.readFileSync(
      path.resolve(__dirname, `../screens/${screen}.tsx`),
      "utf8",
    );
    expect(source).toContain("<ActiveDateRangeLabel");
    expect(source).toContain("startDate=");
  });

  it("does not show a date range without a selected start date", () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, "../components/shared/ActiveDateRangeLabel.tsx"),
      "utf8",
    );
    expect(source).toContain("if (!startDate) return null");
    expect(source).toContain('t("common.from")');
    expect(source).toContain('t("common.to")');
  });

  it("shows the Building Admin date range once in its removable chip", () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, "../screens/BuildingAdmin/AllRequestsScreen.tsx"),
      "utf8",
    );
    expect(source).toContain("activeDateRange.endDate");
    expect(source).toContain("onPress={clearDateFilter}");
    expect(source).toContain("onPress={() => setShowDatePicker(true)}");
    expect(source).not.toContain("<ActiveDateRangeLabel");
  });
});