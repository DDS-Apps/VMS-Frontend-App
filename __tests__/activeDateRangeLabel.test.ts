import { formatActiveDateRange, formatFilterDate } from "@/utils/activeDateRangeLabel";

describe("active date range formatting", () => {
  it("treats API date-only strings as calendar dates rather than timezone instants", () => {
    expect(formatFilterDate("2026-09-28", false)).toBe("28 Sept 2026");
    expect(formatFilterDate(new Date(2026, 8, 28), false)).toBe("28 Sept 2026");
  });

  it("does not format invalid calendar dates", () => {
    expect(formatFilterDate("2026-02-30", false)).toBe("");
  });

  it("shows a single date when a range starts and ends on the same calendar day", () => {
    expect(formatActiveDateRange("2026-09-29", new Date(2026, 8, 29), false, "From", "To"))
      .toBe("29 Sept 2026");
    expect(formatActiveDateRange("2026-09-29", "2026-09-29", true, "من", "إلى"))
      .toBe(formatFilterDate("2026-09-29", true));
  });

  it("keeps both dates for a genuine range and rejects invalid dates", () => {
    expect(formatActiveDateRange("2026-09-28", "2026-09-29", false, "From", "To"))
      .toBe("From 28 Sept 2026 – To 29 Sept 2026");
    expect(formatActiveDateRange("2026-02-30", "2026-09-29", false, "From", "To"))
      .toBe("");
  });
});