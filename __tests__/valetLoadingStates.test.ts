import fs from "fs";
import path from "path";

const valetAdminSource = fs.readFileSync(
  path.resolve(__dirname, "../screens/ValetAdmin/ValetAllRequestsScreen.tsx"),
  "utf8",
);
const valetListSource = fs.readFileSync(
  path.resolve(__dirname, "../screens/Employee/MyValetRequestsScreen.tsx"),
  "utf8",
);
const valetDetailSource = fs.readFileSync(
  path.resolve(__dirname, "../screens/Employee/ValetRequestDetailsScreen.tsx"),
  "utf8",
);

describe("Valet and parking loading states", () => {
  it("retains the last successful Valet Admin date response", () => {
    expect(valetAdminSource).toContain("useRetainedDatedData(dateStr, data)");
    expect(valetAdminSource).toContain("dateKey: displayedDateStr");
    expect(valetAdminSource).toContain("getDisplayDate(displayedDate)");
    expect(valetAdminSource).toContain("if (isLoading && !displayedData)");
    expect(valetAdminSource).toContain("if (isError && !displayedData)");
  });

  it("does not replace cached employee requests during refetch", () => {
    expect(valetListSource).toContain("if (isLoading && !response)");
    expect(valetListSource).not.toContain("if (isLoading || isRefetching)");
    expect(valetListSource).toContain("isError && response && !isRefetching");
  });

  it("keeps cached request details visible after a refresh error", () => {
    expect(valetDetailSource).toContain("if (isLoading && !request)");
    expect(valetDetailSource).toContain("if (!request)");
    expect(valetDetailSource).toContain("isError && !isRefetching");
    expect(valetDetailSource).not.toContain("if (isError ||");
  });
});
