import {
  dateKeyToLocalNoon,
  enumerateInclusiveDateKeys,
  getAdminDateQueryRange,
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

  it("omits both query dates after clearing a default or custom range", () => {
    const month = getCurrentBusinessMonthRange(
      new Date("2026-09-15T12:00:00.000Z"),
      "Asia/Riyadh",
    );
    const defaultRange = {
      startDate: dateKeyToLocalNoon(month.startDate),
      endDate: dateKeyToLocalNoon(month.endDate),
    };
    expect(getAdminDateQueryRange(defaultRange)).toEqual(month);
    expect(getAdminDateQueryRange({
      startDate: dateKeyToLocalNoon("2026-09-12"),
      endDate: dateKeyToLocalNoon("2026-09-16"),
    })).toEqual({ startDate: "2026-09-12", endDate: "2026-09-16" });
    expect(getAdminDateQueryRange({
      startDate: dateKeyToLocalNoon("2026-09-12"),
      endDate: null,
    })).toEqual({ startDate: "2026-09-12", endDate: "2026-09-12" });
    expect(getAdminDateQueryRange({ startDate: null, endDate: null }))
      .toEqual({ startDate: undefined, endDate: undefined });
    expect(getAdminDateQueryRange({ startDate: null, endDate: dateKeyToLocalNoon("2026-09-16") }))
      .toEqual({ startDate: undefined, endDate: undefined });
  });
});
