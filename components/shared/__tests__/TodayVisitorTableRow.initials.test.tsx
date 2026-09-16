import React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { TodayVisitorTableRow } from "@/components/shared/TodayVisitorTableRow";
import type { TodayVisitorDto } from "@/types";

jest.mock("react-native", () => ({
  View: "View",
  Pressable: "Pressable",
  StyleSheet: {
    create: (styles: Record<string, unknown>) => styles,
  },
}));

jest.mock("@/constants/theme", () => ({
  Spacing: { xs: 4, sm: 8, md: 12, lg: 16 },
  BorderRadius: { lg: 12 },
  Typography: {},
}));

jest.mock("@/components/ThemedText", () => ({
  ThemedText: (props: { children?: React.ReactNode; [key: string]: unknown }) => {
    const { children, ...rest } = props;
    return require("react").createElement("ThemedText", rest, children);
  },
}));

jest.mock("@/components/ThemedView", () => ({
  ThemedView: (props: { children?: React.ReactNode; [key: string]: unknown }) => {
    const { children, ...rest } = props;
    return require("react").createElement("ThemedView", rest, children);
  },
}));

jest.mock("@/components/DDIcon", () => ({
  DDIcon: (props: Record<string, unknown>) =>
    require("react").createElement("DDIcon", props),
}));

jest.mock("@/components/DirectionalRow", () => ({
  DirectionalRow: (props: { children?: React.ReactNode; [key: string]: unknown }) => {
    const { children, ...rest } = props;
    return require("react").createElement("DirectionalRow", rest, children);
  },
}));

jest.mock("@/components/VisitorActionButton", () => ({
  VisitorActionButton: (props: Record<string, unknown>) =>
    require("react").createElement("VisitorActionButton", props),
}));

jest.mock("@/hooks/useTheme", () => ({
  useTheme: () => ({
    theme: {
      surface: "#ffffff",
      border: "#dddddd",
      primary: "#00695c",
      text: "#111111",
      textSecondary: "#666666",
      success: "#008844",
      error: "#cc0000",
    },
  }),
}));

jest.mock("@/hooks/useTranslation", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock("@/hooks/useFormatters", () => ({
  useFormatters: () => ({
    formatTimeFromString: (value: string) => value,
    formatDateShort: () => "Jan 1",
  }),
}));

jest.mock("@/contexts/LanguageContext", () => ({
  useLanguage: () => ({ isRTL: false }),
}));

jest.mock("@/utils/statusStyles", () => ({
  applyOpacity: (color: string) => color,
  getStatusConfig: () => ({
    border: "#00695c",
    text: "#00695c",
  }),
  getStatusIcon: () => "clock",
}));

function makeVisitor(fullName: string): TodayVisitorDto {
  return {
    id: "visitor-1",
    visitor: {
      fullName,
      company: "Acme",
    },
    hostName: "Host",
    visitDate: "2026-01-01",
    visitTime: "09:00",
    status: "expected",
  } as TodayVisitorDto;
}

function renderRow(fullName: string): ReactTestRenderer {
  let renderer!: ReactTestRenderer;
  act(() => {
    renderer = create(
      <TodayVisitorTableRow
        visitor={makeVisitor(fullName)}
        showActions={false}
      />,
    );
  });
  return renderer;
}

function findAvatarText(renderer: ReactTestRenderer) {
  return renderer.root.find(
    (instance) =>
      instance.type === "ThemedText" &&
      instance.props.adjustsFontSizeToFit === true,
  );
}

describe("TodayVisitorTableRow rendered name avatars", () => {
  it("renders capped English initials while keeping the full name label unchanged", () => {
    const fullName = "  john   doe  ";
    const renderer = renderRow(fullName);
    const avatarText = findAvatarText(renderer);

    expect(avatarText.props.children).toBe("JD");
    expect(avatarText.props.numberOfLines).toBe(1);
    expect(avatarText.props.adjustsFontSizeToFit).toBe(true);
    expect(avatarText.props.minimumFontScale).toBe(0.5);
    expect(
      renderer.root.findAll(
        (instance) =>
          instance.type === "ThemedText" &&
          instance.props.children === fullName,
      ),
    ).toHaveLength(2);
  });

  it("renders Arabic initials with diacritics as visible graphemes", () => {
    const renderer = renderRow("أَحمد محمد");

    expect(findAvatarText(renderer).props.children).toBe("أَم");
  });

  it("keeps decomposed Latin accents together in the rendered avatar", () => {
    const renderer = renderRow("e\u0301clair");

    expect(findAvatarText(renderer).props.children).toBe("E\u0301C");
  });

  it("caps uppercase expansions and uses the shared fallback", () => {
    expect(findAvatarText(renderRow("ß")).props.children).toBe("SS");
    expect(findAvatarText(renderRow("   ")).props.children).toBe("?");
  });
});