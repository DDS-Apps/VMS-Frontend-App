import { getManagerApprovalEndMs, getManagerApprovalState } from "@/utils/managerApprovalEligibility";
import { getApprovalErrorMessage } from "@/utils/approvalErrorMessage";
import { en } from "@/constants/i18n/en";
import { ar } from "@/constants/i18n/ar";

const schedule = {
  status: "pending_approval",
  isWalkIn: false,
  visitDate: "2026-10-19",
  visitTime: "14:00",
  endTime: "15:00",
  duration: "PT1H",
};
const end = Date.parse("2026-10-19T12:00:00Z");

describe("Manager approval deadline (not QR expiry)", () => {
  it.each([
    [end - 1, "eligible"],
    [end, "expired"],
    [end + 1, "expired"],
  ])("at %s is %s", (now, state) => {
    expect(getManagerApprovalState(schedule, now)).toBe(state);
  });
  it("allows a started meeting until its end", () => {
    expect(getManagerApprovalState(schedule, Date.parse("2026-10-19T11:30:00Z"))).toBe("eligible");
  });
  it.each(["UTC", "America/Los_Angeles", "Asia/Karachi"])("is independent of device timezone %s", zone => {
    const original = process.env.TZ;
    try {
      process.env.TZ = zone;
      expect(getManagerApprovalEndMs(schedule)).toBe(end);
    } finally {
      if (original === undefined) delete process.env.TZ;
      else process.env.TZ = original;
    }
  });
  it("prefers a canonical end instant and supports an offset", () => {
    expect(getManagerApprovalEndMs({ ...schedule, endTime: "2026-10-19T15:00:00+03:00" })).toBe(end);
  });
  it("resolves an overnight wall-clock schedule", () => {
    expect(getManagerApprovalEndMs({ ...schedule, visitTime: "23:00", endTime: "01:00" }))
      .toBe(Date.parse("2026-10-19T22:00:00Z"));
  });
  it.each(["PT1H", "1 hour", "60 minutes", "PT3600S"])("resolves start plus duration %s", duration => {
    expect(getManagerApprovalEndMs({ ...schedule, endTime: undefined, duration })).toBe(end);
  });
  it("uses the canonical start before wall-clock fallbacks", () => {
    expect(getManagerApprovalEndMs({ ...schedule, endTime: undefined, visitTime: "", visitStartAt: "2026-10-19T11:00:00Z" })).toBe(end);
  });
  it.each([
    { endTime: "25:00" },
    { endTime: "wrong" },
    { visitDate: "2026-02-30" },
    { endTime: "2026-02-30T12:00:00Z" },
    { endTime: "2026-10-19T24:00:00Z" },
    { endTime: undefined, duration: "wrong" },
    { endTime: undefined, duration: "PT0H" },
    { endTime: undefined, visitTime: "garbage 14:00" },
    { endTime: "14:00" },
    { endTime: undefined, duration: undefined },
    { endTime: undefined, visitTime: undefined },
  ])("fails closed for an invalid schedule %j", changes => {
    expect(getManagerApprovalState({ ...schedule, ...changes }, end - 1)).toBe("unavailable");
  });
  it.each(["approved", "cancelled", "rejected", "pending_host_approval"])("does not permit status %s", status => {
    expect(getManagerApprovalState({ ...schedule, status }, end - 1)).toBe("not_pending");
  });
  it("does not bypass backend permissions or accept a missing record", () => {
    expect(getManagerApprovalState({ ...schedule, canApprove: false }, end - 1)).toBe("not_pending");
    expect(getManagerApprovalState(undefined, end - 1)).toBe("not_pending");
  });
  it("ignores QR retention when deciding approval eligibility", () => {
    const retained = { ...schedule, isExpired: false, qrCode: "issued", qrValidity: { retainedUntilCheckout: true } };
    expect(getManagerApprovalState(retained, end)).toBe("expired");
  });
  it("preserves the strictly-after Manager walk-in cutoff", () => {
    expect(getManagerApprovalState({ ...schedule, isWalkIn: true }, end)).toBe("eligible");
    expect(getManagerApprovalState({ ...schedule, isWalkIn: true }, end + 1)).toBe("expired");
  });
  it("does not impose new schedule requirements on legacy walk-ins", () => {
    expect(getManagerApprovalState({ ...schedule, isWalkIn: true, visitTime: undefined, endTime: undefined, duration: undefined }, end)).toBe("eligible");
  });
  it.each([en, ar])("provides translated expiry, unavailable, skipped and conflict notices", language => {
    for (const value of Object.values(language.approval)) {
      expect(value.length).toBeGreaterThan(3);
      expect(value).not.toMatch(/^approval\.\w+$/);
    }
    const translate = (key: string) => language.approval[key.split(".")[1] as keyof typeof language.approval];
    expect(getApprovalErrorMessage({ code: "CONFLICT", status: 409, message: "private backend details" }, translate)).toBe(language.approval.conflict);
  });
});
