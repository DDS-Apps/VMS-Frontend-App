import React from "react";
import renderer, { act } from "react-test-renderer";
import { DDIcon } from "../DDIcon";
import { ServiceIcons } from "../shared/ServiceIcons";
import { ICON_PATHS } from "@/constants/iconPaths";
import { LanguageContext } from "@/contexts/LanguageContext";

jest.mock("@/hooks/useTheme", () => ({
  useTheme: () => ({ theme: { info: "#123456", secondary: "#654321", text: "#111111", primary: "#abcdef" } }),
}));
jest.mock("@/contexts/LanguageContext", () => {
  const React = require("react");
  const LanguageContext = React.createContext({ isRTL: false });
  return { LanguageContext, useLanguage: () => React.useContext(LanguageContext) };
});
jest.mock("react-native-svg", () => ({
  __esModule: true,
  default: "Svg",
  Path: "Path",
}));

describe("outline service icons", () => {
  it.each([14, 16, 20])("keeps the shared outline style at %ipx in both directions", (size) => {
    for (const isRTL of [false, true]) {
      for (const name of ["parking", "meeting-room"]) {
        let tree: renderer.ReactTestRenderer;
        act(() => {
          tree = renderer.create(
            <LanguageContext.Provider value={{ isRTL } as any}>
              <DDIcon name={name} size={size} color="#123456" directionAware />
            </LanguageContext.Provider>,
          );
        });
        const svg = tree!.root.findByType("Svg" as any);
        expect(svg.props).toMatchObject({
          width: size, height: size, viewBox: "0 0 24 24",
          fill: "none", stroke: "#123456", strokeWidth: 2,
          strokeLinecap: "round", strokeLinejoin: "round",
        });
        expect(tree!.root.findByType("Path" as any).props.d).toBe(ICON_PATHS[name]);
        expect(ICON_PATHS[name]).toBeTruthy();
        expect(ICON_PATHS[name]).not.toBe(ICON_PATHS["help-circle"]);
        act(() => tree!.unmount());
      }
    }
  });

  it("changes service symbols without changing visibility, colors or size", () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<ServiceIcons parkingDecision="required" meetingRoom buffet valet size={14} />);
    });
    expect(tree!.root.findAllByType(DDIcon).map(({ props }) => props.name))
      .toEqual(["parking", "meeting-room", "cloche", "truck"]);
    expect(tree!.root.findAllByType(DDIcon)[0].props).toMatchObject({ size: 14, color: "#123456" });
    expect(tree!.root.findAllByType(DDIcon)[1].props).toMatchObject({ size: 14, color: "#654321" });
    act(() => tree!.update(<ServiceIcons visitorNeedsParking={false} meetingRoom={false} />));
    expect(tree!.root.findAllByType(DDIcon)).toHaveLength(0);
    act(() => tree!.unmount());
  });
});