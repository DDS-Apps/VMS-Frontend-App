import { mapSecurityVisitorToMatrixItem } from "@/utils/securityVisitorTable";

describe("Security visitor tabular mapping", () => {
  it("maps identity, schedule, host, services, status, and actual times", () => {
    expect(
      mapSecurityVisitorToMatrixItem({
        id: "visit-1",
        name: "Amina Saleh",
        company: "Acme",
        visitDate: "2026-09-07",
        visitTime: "09:30",
        endTime: "11:00",
        originalStatus: "checked_in",
        checkInTime: "09:28",
        host: "Omar Ali",
        purpose: "Project review",
        email: "visitor@example.com",
        phone: "+966500000000",
        parking: { visitorNeedsParking: true },
        valet: { hasValet: true },
        isBuffet: true,
        isMeetingRoom: true,
      }),
    ).toEqual({
      id: "visit-1",
      visitorName: "Amina Saleh",
      company: "Acme",
      visitDate: "2026-09-07",
      plannedInTime: "09:30",
      plannedOutTime: "11:00",
      actualInTime: "09:28",
      actualOutTime: undefined,
      status: "checked_in",
      hostName: "Omar Ali",
      purpose: "Project review",
      email: "visitor@example.com",
      phone: "+966500000000",
      hasParking: true,
      hasBuffet: true,
      hasValet: true,
      hasMeetingRoom: true,
    });
  });

  it("does not expose allocation details as a parking requirement", () => {
    const item = mapSecurityVisitorToMatrixItem({
      id: "visit-2",
      name: "Visitor",
      company: "",
      visitDate: "2026-09-07",
      visitTime: "10:00",
      originalStatus: "approved",
      host: "Host",
      parking: {
        visitorNeedsParking: false,
        hasParkingAllocation: true,
      },
      valet: { hasValet: false },
    });

    expect(item.hasParking).toBe(false);
  });
});
