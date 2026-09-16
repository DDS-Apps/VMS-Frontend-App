import React from "react";
import { act, create } from "react-test-renderer";

import { en, ar, getTranslation } from "@/constants/i18n";
import { PURPOSE_VALUE_TO_KEY } from "@/constants/requestConstants";
import { LanguageContext } from "@/contexts/LanguageContext";
import {
  VisitorMatrixTable,
  type VisitorMatrixItem,
} from "@/components/shared/VisitorMatrixTable";

const mockTheme = {
  background: "#ffffff",
  border: "#d9d9d9",
  buttonText: "#ffffff",
  error: "#c62828",
  info: "#1565c0",
  primary: "#00695c",
  secondary: "#7b1fa2",
  success: "#2e7d32",
  surface: "#f5f5f5",
  surfaceSecondary: "#eeeeee",
  text: "#111111",
  textSecondary: "#666666",
  warning: "#ef6c00",
};

jest.mock("@/hooks/useTheme", () => ({
  useTheme: () => ({ theme: mockTheme }),
}));

jest.mock("@/hooks/useFormatters", () => ({
  useFormatters: () => ({
    formatDateShort: () => "Jan 1, 2026",
    formatTimeFromString: (value: string) => value,
    toLocalNumerals: (value: string) => value,
  }),
}));

jest.mock("@/contexts/LanguageContext", () => {
  const React = require("react");
  const MockLanguageContext = React.createContext(null);

  return {
    LanguageContext: MockLanguageContext,
    useLanguage: () => React.useContext(MockLanguageContext),
  };
});

jest.mock("@/components/ThemedText", () => {
  const React = require("react");

  return {
    ThemedText: (props: Record<string, unknown>) =>
      React.createElement("ThemedText", props, props.children),
  };
});

jest.mock("@/components/ThemedView", () => {
  const React = require("react");

  return {
    ThemedView: (props: Record<string, unknown>) =>
      React.createElement("ThemedView", props, props.children),
  };
});

jest.mock("@/components/DDIcon", () => {
  const React = require("react");

  return {
    DDIcon: (props: Record<string, unknown>) =>
      React.createElement("DDIcon", props),
  };
});

jest.mock("@/components/DirectionalRow", () => {
  const React = require("react");

  return {
    DirectionalRow: (props: Record<string, unknown>) =>
      React.createElement("DirectionalRow", props, props.children),
    getFlexDirection: (isRTL: boolean) => (isRTL ? "row-reverse" : "row"),
  };
});

jest.mock("@/components/Spacer", () => {
  const React = require("react");

  return {
    __esModule: true,
    default: (props: Record<string, unknown>) =>
      React.createElement("Spacer", props),
  };
});

jest.mock("@/components/shared", () => {
  const React = require("react");

  return {
    StatusAccent: (props: Record<string, unknown>) =>
      React.createElement("StatusAccent", props),
    RequestStatusBadge: (props: Record<string, unknown>) =>
      React.createElement("RequestStatusBadge", props),
  };
});

jest.mock("@/components/shared/ApprovalActionGroup", () => {
  const React = require("react");

  return {
    ApprovalActionGroup: (props: Record<string, unknown>) =>
      React.createElement("ApprovalActionGroup", props, props.children),
  };
});

jest.mock("@/components/shared/SelectionCheckbox", () => {
  const React = require("react");

  return {
    SelectionCheckbox: (props: Record<string, unknown>) =>
      React.createElement("SelectionCheckbox", props),
  };
});

type Locale = "en" | "ar";

const localeContextValue = (locale: Locale) => ({
  locale,
  localeCode: locale === "ar" ? "ar-SA" : "en-US",
  isRTL: locale === "ar",
  setLocale: jest.fn(),
  isLoading: false,
  isChangingLanguage: false,
  layoutKey: `${locale}-test`,
});

const baseVisitor: VisitorMatrixItem = {
  id: "visitor-1",
  visitorName: "Visitor One",
  company: "Acme",
  visitDate: "2026-01-01",
  plannedInTime: "09:00",
  plannedOutTime: "10:00",
  actualInTime: "09:05",
  actualOutTime: "09:55",
  status: "approved",
  hostName: "Host One",
  hostDepartment: "Operations",
  hasParking: true,
};

function renderTable(
  variant: "card" | "matrix",
  visitors: VisitorMatrixItem[],
  locale: Locale = "en",
) {
  let renderer: ReturnType<typeof create> | undefined;

  act(() => {
    renderer = create(
      <LanguageContext.Provider value={localeContextValue(locale)}>
        <VisitorMatrixTable visitors={visitors} variant={variant} />
      </LanguageContext.Provider>,
    );
  });

  return renderer!;
}

function textContent(value: unknown): string {
  if (value === null || value === undefined || typeof value === "boolean") {
    return "";
  }
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }
  if (Array.isArray(value)) {
    return value.map(textContent).join("");
  }
  if (typeof value === "object") {
    const candidate = value as {
      props?: { children?: unknown };
      children?: unknown;
    };
    return textContent(candidate.props?.children ?? candidate.children);
  }
  return "";
}

function themedTexts(renderer: ReturnType<typeof create>): string[] {
  return renderer.root
    .findAllByType("ThemedText")
    .map((node) => textContent(node.props.children));
}

const mappedPurposeEntries = Object.entries(PURPOSE_VALUE_TO_KEY);
const allMappedVisitors = mappedPurposeEntries.map(([purpose, key], index) => ({
  ...baseVisitor,
  id: `visitor-${index}`,
  visitorName: key,
  purpose,
}));

describe("VisitorMatrixTable purpose labels", () => {
  it.each(["matrix", "card"] as const)(
    "renders every mapped purpose in the actual %s variant with real English labels",
    (variant) => {
      const renderer = renderTable(variant, allMappedVisitors, "en");
      const rendered = themedTexts(renderer);

      for (const [, translationKey] of mappedPurposeEntries) {
        expect(rendered).toContain(getTranslation("en", translationKey));
      }
    },
  );

  it.each(["matrix", "card"] as const)(
    "renders the Arabic purpose translation in the actual %s variant",
    (variant) => {
      const renderer = renderTable(
        variant,
        [
          {
            ...baseVisitor,
            purpose: "business_meeting",
          },
          {
            ...baseVisitor,
            id: "visitor-2",
            purpose: "interview",
          },
        ],
        "ar",
      );
      const rendered = themedTexts(renderer);

      expect(rendered).toContain(ar.visitor.businessMeeting);
      expect(rendered).toContain(ar.visitor.interview);
    },
  );

  it.each(["matrix", "card"] as const)(
    "preserves custom snake_case and toString purposes in the actual %s variant",
    (variant) => {
      const renderer = renderTable(variant, [
        {
          ...baseVisitor,
          purpose: "custom_snake_case",
        },
        {
          ...baseVisitor,
          id: "visitor-2",
          purpose: "toString",
        },
      ]);
      const rendered = themedTexts(renderer);

      expect(rendered).toContain("custom_snake_case");
      expect(rendered).toContain("toString");
    },
  );

  it("renders a dash for a missing purpose in a matrix purpose column", () => {
    const renderer = renderTable("matrix", [
      {
        ...baseVisitor,
        purpose: "business_meeting",
      },
      {
        ...baseVisitor,
        id: "visitor-2",
        purpose: undefined,
      },
    ]);
    const rendered = themedTexts(renderer);

    expect(rendered).toContain(en.visitor.businessMeeting);
    expect(rendered.filter((text) => text === "—")).toHaveLength(1);
  });

  it("omits the purpose column for a missing purpose in the card variant", () => {
    const renderer = renderTable("card", [
      {
        ...baseVisitor,
        purpose: undefined,
      },
    ]);
    const rendered = themedTexts(renderer);

    expect(rendered).not.toContain(en.form.purpose);
    expect(rendered).not.toContain("—");
  });

  it.each(["matrix", "card"] as const)(
    "updates purpose labels on a %s language rerender without changing visitor data",
    (variant) => {
      const visitors: VisitorMatrixItem[] = [
        {
          ...baseVisitor,
          purpose: "business_meeting",
        },
      ];
      const renderer = renderTable(variant, visitors, "en");

      expect(themedTexts(renderer)).toContain(en.visitor.businessMeeting);
      expect(themedTexts(renderer)).not.toContain(ar.visitor.businessMeeting);

      act(() => {
        renderer.update(
          <LanguageContext.Provider value={localeContextValue("ar")}>
            <VisitorMatrixTable visitors={visitors} variant={variant} />
          </LanguageContext.Provider>,
        );
      });

      expect(themedTexts(renderer)).toContain(ar.visitor.businessMeeting);
      expect(themedTexts(renderer)).not.toContain(en.visitor.businessMeeting);
      expect(visitors[0].purpose).toBe("business_meeting");
    },
  );
});
