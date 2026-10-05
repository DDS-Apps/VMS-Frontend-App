import React from "react";
import { Text as MockText, View as MockView, TextInput as MockInput, Pressable as MockButton, Switch } from "react-native";
import { act, create } from "react-test-renderer";
import { en } from "@/constants/i18n/en";
import { ar } from "@/constants/i18n/ar";
import type { ReminderRules } from "@/types/vms.types";

let mockLocale: "en" | "ar" = "en";
const mockRules: ReminderRules = {
  id: "rules", firstReminderDelayMinutes: 30, secondReminderDelayMinutes: 90,
  officeStartTime: "09:00", officeEndTime: "17:00",
  workingDays: [0, 1, 2, 3, 4], isActive: true, updatedAt: "2026-10-02",
};
let mockData: ReminderRules = mockRules;
const mockSave = jest.fn();

jest.mock("@/hooks/queries/useAdminQueries", () => ({
  useReminderRulesQuery: () => ({ data: mockData }),
  useUpdateReminderRulesMutation: () => ({ mutateAsync: mockSave, isPending: false }),
}));
jest.mock("@/hooks/useTheme", () => ({
  useTheme: () => ({ theme: { primary: "#123456", error: "#ff0000" }, isDark: false }),
}));
jest.mock("@/hooks/useTranslation", () => ({
  useTranslation: () => ({
    isRTL: mockLocale === "ar",
    t: (key: string) => {
      const translations = mockLocale === "ar" ? require("@/constants/i18n/ar").ar : require("@/constants/i18n/en").en;
      return key.split(".").reduce((value: any, part) => value?.[part], translations) ?? key;
    },
  }),
}));
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock("@/components/ThemedText", () => ({ ThemedText: MockText }));
jest.mock("@/components/ThemedView", () => ({ ThemedView: MockView }));
jest.mock("@/components/DDIcon", () => ({ DDIcon: () => null }));
jest.mock("@/components/StyledInput", () => ({ StyledInput: MockInput }));
jest.mock("@/components/TimePicker", () => ({ TimePicker: () => null }));
jest.mock("@/components/shared/LoadingButton", () => ({
  LoadingButton: ({ children, ...props }: any) => <MockButton {...props}>{children}</MockButton>,
}));
jest.mock("@/components/DirectionalRow", () => ({
  DirectionalRow: MockView, getFlexDirection: (rtl: boolean) => rtl ? "row-reverse" : "row",
}));

import ReminderRulesScreen from "@/screens/Admin/ReminderRulesScreen";
import { LoadingButton } from "@/components/shared/LoadingButton";

describe("Reminder Rules without the retired cancellation delay", () => {
  let renderer: ReturnType<typeof create>;
  beforeEach(() => {
    mockSave.mockReset().mockResolvedValue(mockRules);
    mockData = mockRules;
  });
  afterEach(() => { if (renderer) act(() => renderer.unmount()); });

  it.each(["en", "ar"] as const)("renders only two delay inputs in %s when API omits the retired field", (locale) => {
    mockLocale = locale;
    act(() => { renderer = create(<ReminderRulesScreen />); });
    expect(renderer.root.findAllByType(MockInput).map(input => input.props.value)).toEqual(["30", "90"]);
    const rendered = JSON.stringify(renderer.toJSON());
    const translations = locale === "ar" ? ar : en;
    for (const label of [translations.admin.firstReminderDelay, translations.admin.secondReminderDelay, translations.admin.officeHours, translations.admin.workingDays, translations.admin.systemActive]) {
      expect(rendered).toContain(label);
    }
    expect(rendered).toContain(locale === "ar" ? "إعدادات التذكير" : "Reminder Settings");
    expect(rendered).toContain(locale === "ar" ? "تفعيل التذكيرات الآلية" : "Enable automated reminders");
    expect(rendered).not.toMatch(/auto.?cancel|الإلغاء التلقائي/i);
  });

  it.each([false, true])("saves remaining settings without echoing legacy data (legacy=%s)", async (legacy) => {
    mockData = legacy ? { ...mockRules, autoCancelDelayMinutes: 150 } as ReminderRules : mockRules;
    act(() => { renderer = create(<ReminderRulesScreen />); });
    act(() => renderer.root.findAllByType(MockInput)[0].props.onChangeText("45"));
    act(() => renderer.root.findAllByType(MockInput)[1].props.onChangeText("100"));
    act(() => renderer.root.findByType(Switch).props.onValueChange(false));
    const saveButton = renderer.root.findByType(LoadingButton);
    await act(async () => { await saveButton.props.onPress(); });
    expect(mockSave).toHaveBeenCalledWith({
      firstReminderDelayMinutes: 45, secondReminderDelayMinutes: 100,
      officeStartTime: "09:00", officeEndTime: "17:00",
      workingDays: [0, 1, 2, 3, 4], isActive: false,
    });
    expect(mockSave.mock.calls[0][0]).not.toHaveProperty("autoCancelDelayMinutes");
  });
});