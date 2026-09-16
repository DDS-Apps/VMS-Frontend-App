import { getTranslation } from "@/constants/i18n";
import {
  getPurposeLabel,
  PURPOSE_VALUE_TO_KEY,
} from "@/constants/requestConstants";

const translate = (locale: "en" | "ar") => (key: string) =>
  getTranslation(locale, key);

describe("getPurposeLabel", () => {
  it("uses the real English and Arabic translations for business_meeting and interview", () => {
    expect(getPurposeLabel("business_meeting", translate("en"))).toBe(
      "Business Meeting",
    );
    expect(getPurposeLabel("interview", translate("en"))).toBe("Interview");
    expect(getPurposeLabel("business_meeting", translate("ar"))).toBe(
      "اجتماع عمل",
    );
    expect(getPurposeLabel("interview", translate("ar"))).toBe("مقابلة");
  });

  it("localizes every mapped canonical purpose value in either locale", () => {
    for (const [value, translationKey] of Object.entries(
      PURPOSE_VALUE_TO_KEY,
    )) {
      expect(getPurposeLabel(value, translate("en"))).toBe(
        getTranslation("en", translationKey),
      );
      expect(getPurposeLabel(value, translate("ar"))).toBe(
        getTranslation("ar", translationKey),
      );
    }
  });

  it("recognizes every known readable label in its own locale", () => {
    for (const [value, translationKey] of Object.entries(
      PURPOSE_VALUE_TO_KEY,
    )) {
      const englishLabel = getTranslation("en", translationKey);
      const arabicLabel = getTranslation("ar", translationKey);

      expect(getPurposeLabel(englishLabel, translate("en"))).toBe(englishLabel);
      expect(getPurposeLabel(arabicLabel, translate("ar"))).toBe(arabicLabel);
    }
  });

  it("preserves unknown custom text verbatim, including snake_case and toString", () => {
    const t = jest.fn((key: string) => `translated:${key}`);

    expect(getPurposeLabel("custom_snake_case", t)).toBe("custom_snake_case");
    expect(getPurposeLabel("business_meeting_custom", t)).toBe(
      "business_meeting_custom",
    );
    expect(getPurposeLabel("toString", t)).toBe("toString");
    expect(t).not.toHaveBeenCalled();
  });

  it("returns an empty label for empty or missing purposes", () => {
    const t = jest.fn((key: string) => key);

    expect(getPurposeLabel("", t)).toBe("");
    expect(getPurposeLabel(undefined, t)).toBe("");
    expect(getPurposeLabel(null, t)).toBe("");
    expect(t).not.toHaveBeenCalled();
  });
});
