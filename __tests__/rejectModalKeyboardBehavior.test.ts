import fs from "fs";
import path from "path";

const readSource = (relativePath: string) =>
  fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");

describe("Reject modal keyboard behavior", () => {
  const managerDetail = readSource(
    "screens/Manager/ManagerApprovalDetailScreen.tsx",
  );
  const overview = readSource("screens/Dashboard/OverviewScreen.tsx");
  const buildingAdmin = readSource(
    "screens/BuildingAdmin/AllRequestsScreen.tsx",
  );

  it.each([
    ["Manager detail", managerDetail],
    ["Dashboard overview", overview],
    ["Building Admin requests", buildingAdmin],
  ])("%s keeps actions above the keyboard", (_name, source) => {
    expect(source).toContain("KeyboardAvoidingView");
    expect(source).toMatch(
      /behavior=\{Platform\.OS === ['"]ios['"] \? ['"]padding['"] : ['"]height['"]\}/,
    );
  });

  it.each([
    ["Manager detail", managerDetail],
    ["Dashboard overview", overview],
    ["Building Admin requests", buildingAdmin],
  ])("%s dismisses the keyboard without closing from an outer tap", (_name, source) => {
    expect(source).toMatch(/onPress=\{Keyboard\.dismiss\}/);
    expect(source).toContain("accessible={false}");
    expect(source).toContain("accessibilityViewIsModal");
  });

  it("keeps Building Admin's reject modal locked during submission", () => {
    expect(buildingAdmin).toMatch(
      /onRequestClose=\{\(\) => \{\s+if \(!actionLoading\)/,
    );
    expect(buildingAdmin).toContain("editable={!actionLoading}");
  });
});