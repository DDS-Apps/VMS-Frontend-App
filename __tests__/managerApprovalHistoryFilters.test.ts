import {
  buildManagerApprovalHistoryParams,
  hasSameApprovalHistoryDateRange,
} from "@/utils/managerApprovalHistoryFilters";

describe("Manager approval-history API filters", () => {
  it("omits dates when the date filter is clear", () => {
    expect(
      buildManagerApprovalHistoryParams({
        status: undefined,
        startDate: null,
        endDate: null,
      }),
    ).toEqual({
      status: undefined,
      limit: 20,
    });
  });

  it("sends a single selected date as an inclusive one-day range", () => {
    const selectedDate = new Date(2026, 8, 10, 12);

    expect(
      buildManagerApprovalHistoryParams({
        status: "pending",
        startDate: selectedDate,
        endDate: null,
      }),
    ).toEqual({
      status: "pending",
      limit: 20,
      startDate: "2026-09-10",
      endDate: "2026-09-10",
    });
  });

  it("keeps status and both inclusive dates for a selected range", () => {
    expect(
      buildManagerApprovalHistoryParams({
        status: "approved",
        startDate: new Date(2026, 7, 31, 12),
        endDate: new Date(2026, 8, 2, 12),
      }),
    ).toEqual({
      status: "approved",
      limit: 20,
      startDate: "2026-08-31",
      endDate: "2026-09-02",
    });
  });

  it("treats status-only changes as the same retained date source", () => {
    expect(
      hasSameApprovalHistoryDateRange(
        {
          status: "pending",
          startDate: "2026-09-01",
          endDate: "2026-09-10",
        },
        {
          status: "approved",
          startDate: "2026-09-01",
          endDate: "2026-09-10",
        },
      ),
    ).toBe(true);
  });

  it("rejects retained data when a date is changed or cleared", () => {
    expect(
      hasSameApprovalHistoryDateRange(
        { startDate: "2026-09-01", endDate: "2026-09-10" },
        { startDate: "2026-08-01", endDate: "2026-08-10" },
      ),
    ).toBe(false);
    expect(
      hasSameApprovalHistoryDateRange(
        { startDate: undefined, endDate: undefined },
        { startDate: "2026-09-01", endDate: "2026-09-10" },
      ),
    ).toBe(false);
  });
});