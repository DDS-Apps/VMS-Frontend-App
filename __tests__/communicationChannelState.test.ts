import fs from "fs";
import path from "path";
import { getEmailChannelState, SHOW_SMS_CHANNEL } from "@/utils/communicationChannelState";

describe.each(["normal", "walk-in"])("%s request communication channels", () => {
  it.each(["", " ", "\t\n"])("never checks Email without an address: %j", email => {
    expect(getEmailChannelState(email, true)).toEqual({ enabled: false, selected: false });
    expect(getEmailChannelState(email, false).selected).toBe(false);
  });

  it("checks Email when an address is entered or prefilled", () => {
    expect(getEmailChannelState("visitor@example.com", true)).toEqual({ enabled: true, selected: true });
    expect(getEmailChannelState(" visitor@example.com ", true).selected).toBe(true);
  });

  it("unchecks Email when an address is cleared and restores the default selection on re-entry", () => {
    expect(getEmailChannelState("visitor@example.com", true).selected).toBe(true);
    expect(getEmailChannelState("", true).selected).toBe(false);
    expect(getEmailChannelState("another@example.com", true).selected).toBe(true);
  });

  it("preserves the user's explicit Email opt-out when an address exists", () => {
    expect(getEmailChannelState("visitor@example.com", false)).toEqual({ enabled: true, selected: false });
  });
});

describe("create-request form wiring", () => {
  const source = fs.readFileSync(path.resolve(__dirname, "../screens/Employee/VisitorRequestFormScreen.tsx"), "utf8");

  it("uses the email-dependent state for the checkbox, enabled state and regular submission", () => {
    expect(source).toContain("getEmailChannelState(email, sendEmail)");
    expect(source).toContain("checked: emailChannelSelected, disabled: !hasEmailAddress");
    expect(source).toContain("disabled={!hasEmailAddress}");
    expect(source).toContain('{emailChannelSelected ? (');
    expect(source).toContain('if (emailChannelSelected) communicationChannels.push("email")');
  });

  it("hides SMS in both flows without removing its control, default state or payload support", () => {
    expect(SHOW_SMS_CHANNEL).toBe(false);
    expect(source).toContain("{SHOW_SMS_CHANNEL ? <Pressable");
    expect(source).toContain('t("services.sms")');
    expect(source).toContain("onPress={() => setSendSMS(!sendSMS)}");
    expect(source).toContain("const [sendSMS, setSendSMS] = useState(true)");
    expect(source).toContain('if (sendSMS) communicationChannels.push("sms")');
  });
});
