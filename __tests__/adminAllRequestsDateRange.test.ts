import {
  dateKeyToLocalNoon,
  enumerateInclusiveDateKeys,
  getCurrentBusinessMonthRange,
  localCalendarDateToKey,
} from "@/utils/adminAllRequestsDateRange";

describe("Admin All Requests date ranges", () => {
  it("uses the Riyadh month after Saudi midnight", () => {
    expect(
      getCurrentBusinessMonthRange(
        new Date("2026-01-31T21:05:00.000Z"),
        "Asia/Riyadh",
      ),
    ).toEqual({
      startDate: "2026-02-01",
      endDate: "2026-02-28",
    });
  });

  it("handles leap-year month boundaries", () => {
    expect(
      getCurrentBusinessMonthRange(
        new Date("2028-02-15T12:00:00.000Z"),
        "Asia/Riyadh",
      ),
    ).toEqual({
      startDate: "2028-02-01",
      endDate: "2028-02-29",
    });
  });

  it("round-trips picker dates without UTC date parsing", () => {
    const date = dateKeyToLocalNoon("2026-09-04");
    expect(date.getHours()).toBe(12);
    expect(localCalendarDateToKey(date)).toBe("2026-09-04");
  });

  it("enumerates inclusive dates for non-Buffet range consumers", () => {
    expect(enumerateInclusiveDateKeys("2026-08-31", "2026-09-02")).toEqual([
      "2026-08-31",
      "2026-09-01",
      "2026-09-02",
    ]);
  });
});
