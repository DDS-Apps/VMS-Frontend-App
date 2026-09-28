import { Platform } from "react-native";
import { getPhysicalToggleStyle, getTableColumnStyle } from "../DirectionalRow";

describe("table columns and dashboard view controls", () => {
  const originalOS = Platform.OS;

  afterEach(() => {
    Object.defineProperty(Platform, "OS", { value: originalOS, configurable: true });
  });

  it.each(["web", "ios"] as const)("keeps headers and cells in the same order on %s", (os) => {
    Object.defineProperty(Platform, "OS", { value: os, configurable: true });
    for (const rtl of [false, true]) {
      const header = getTableColumnStyle(rtl);
      const row = getTableColumnStyle(rtl);
      expect(header).toEqual(row);
      expect(header.flexDirection).toBe("row");
      if (os === "web") {
        expect(header.direction).toBe(rtl ? "rtl" : "ltr");
      }
    }
  });

  it.each(["web", "ios"] as const)("keeps grid physically before list on %s", (os) => {
    Object.defineProperty(Platform, "OS", { value: os, configurable: true });
    expect(getPhysicalToggleStyle(false).flexDirection).toBe("row");
    const arabic = getPhysicalToggleStyle(true);
    if (os === "web") {
      expect(arabic).toEqual({ flexDirection: "row", direction: "ltr" });
    } else {
      // Native RTL mirrors row; reversing it restores physical left-to-right order.
      expect(arabic.flexDirection).toBe("row-reverse");
    }
  });
});