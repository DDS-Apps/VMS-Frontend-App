import { formatFilterDate } from "@/utils/activeDateRangeLabel";

describe("active date range formatting", () => {
  it("treats API date-only strings as calendar dates rather than timezone instants", () => {
    expect(formatFilterDate("2026-09-28", false)).toBe("28 Sept 2026");
    expect(formatFilterDate(new Date(2026, 8, 28), false)).toBe("28 Sept 2026");
  });

  it("does not format invalid calendar dates", () => {
    expect(formatFilterDate("2026-02-30", false)).toBe("");
  });
});