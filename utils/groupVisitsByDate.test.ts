import {
  formatVisitDateLabel,
  getVisitDisplayDate,
  groupVisitsByDate,
} from "@/utils/groupVisitsByDate";

describe("getVisitDisplayDate", () => {
  it("prefers the explicit payload visit date over its scheduled-start instant", () => {
    expect(getVisitDisplayDate({
      visitDate: "2026-10-19", visitStartAt: "2026-10-18T10:00:00Z",
    })).toBe("2026-10-19");
  });

  it("uses the scheduled-start date in the visit timezone, not the UTC/device date", () => {
    expect(getVisitDisplayDate({ visitStartAt: "2026-10-18T22:15:00Z", timezone: "Asia/Riyadh" }))
      .toBe("2026-10-19");
    expect(getVisitDisplayDate({ visitStartAt: "2026-10-18T22:15:00Z", timezone: "America/New_York" }))
      .toBe("2026-10-18");
  });

  it.each([{}, { visitDate: "" }, { visitStartAt: "invalid" }, { visitStartAt: "2026-10-19T00:00:00" }])(
    "does not substitute today when the payload has no usable date: %j", visit => {
      expect(getVisitDisplayDate(visit)).toBeUndefined();
    },
  );
});

describe("groupVisitsByDate", () => {
  it("keeps every record and returns chronological date groups", () => {
    const groups = groupVisitsByDate([
      { id: "second", visitDate: "2026-04-11" },
      { id: "first", visitDate: "2026-04-10" },
      { id: "third", visitDate: "2026-04-11" },
      { id: "missing", visitDate: undefined },
    ]);

    expect(groups.map((group) => group.date)).toEqual([
      "2026-04-10",
      "2026-04-11",
      "unknown",
    ]);
    expect(groups[1].visits.map((visit) => visit.id)).toEqual([
      "second",
      "third",
    ]);
    expect(groups[2].visits.map((visit) => visit.id)).toEqual(["missing"]);
  });

  it("formats date-only visit keys without shifting the calendar day", () => {
    const referenceDate = new Date("2026-08-18T12:00:00Z");

    expect(
      formatVisitDateLabel("2026-08-18", "en-US", {
        today: "Today",
        tomorrow: "Tomorrow",
      }, referenceDate),
    ).toBe("Today");
    expect(
      formatVisitDateLabel("2026-08-19", "en-US", {
        today: "Today",
        tomorrow: "Tomorrow",
      }, referenceDate),
    ).toBe("Tomorrow");
    expect(formatVisitDateLabel("2026-08-20", "en-US")).toBe("20, Aug 2026");
    expect(formatVisitDateLabel("unknown", "en-GB")).toBe("unknown");
  });
});