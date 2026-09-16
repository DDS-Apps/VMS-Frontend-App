import {
  formatVisitDateLabel,
  groupVisitsByDate,
} from "@/utils/groupVisitsByDate";

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