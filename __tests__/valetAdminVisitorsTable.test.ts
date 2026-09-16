import type { ValetParkingVisitorDto } from "@/types/api.types";
import {
  filterAndSortValetVisitors,
  getValetVisitorParkingDecision,
  mapValetVisitorToMatrixItem,
  VALET_ADMIN_DEFAULT_VIEW_MODE,
  valetVisitorHasParking,
} from "@/utils/valetAdminVisitorsTable";

const visitor = (
  overrides: Partial<ValetParkingVisitorDto> = {},
): ValetParkingVisitorDto => ({
  requestId: "request-1",
  visitorName: "Amina Saleh",
  visitorCompany: "Acme",
  hostName: "Omar Ali",
  hostDepartment: "Operations",
  visitDate: "2026-09-07",
  visitTime: "09:30 AM",
  status: "approved",
  visitorNeedsParking: true,
  parkingType: "valet",
  isWalkIn: false,
  ...overrides,
});

describe("Valet Admin visitors table", () => {
  it("opens in table view by default", () => {
    expect(VALET_ADMIN_DEFAULT_VIEW_MODE).toBe("table");
  });

  it("keeps only accepted parking visitors in scheduled-time order", () => {
    const result = filterAndSortValetVisitors([
      visitor({ requestId: "late", visitTime: "01:30 PM" }),
      visitor({
        requestId: "rejected",
        status: "rejected",
        visitTime: "08:00 AM",
      }),
      visitor({
        requestId: "no-parking",
        visitorNeedsParking: false,
        parkingType: "none",
        visitTime: "08:30 AM",
      }),
      visitor({ requestId: "early", visitTime: "09:15 AM" }),
    ]);

    expect(result.map((item) => item.requestId)).toEqual(["early", "late"]);
  });

  it("maps only user-safe visitor, schedule, host, status, and service fields", () => {
    const item = mapValetVisitorToMatrixItem(
      visitor({
        licensePlate: "PRIVATE",
        carModel: "PRIVATE",
        carColor: "PRIVATE",
      }),
    );

    expect(item).toEqual({
      id: "request-1",
      visitorName: "Amina Saleh",
      company: "Acme",
      visitDate: "2026-09-07",
      plannedInTime: "09:30 AM",
      status: "approved",
      hostName: "Omar Ali",
      hostDepartment: "Operations",
      hasParking: true,
      hasValet: true,
    });
    expect(JSON.stringify(item)).not.toContain("PRIVATE");
  });

  it("honors an explicit parking decline over legacy allocation data", () => {
    const explicitlyDeclined = visitor({
      visitorNeedsParking: undefined as unknown as boolean,
      isVisitorNeedsParking: undefined,
      parkingType: "valet",
    });
    explicitlyDeclined.parkingDecision = "not_required";

    expect(valetVisitorHasParking(explicitlyDeclined)).toBe(false);
  });

  it("distinguishes automatic parking from valet service", () => {
    expect(
      mapValetVisitorToMatrixItem(visitor({ parkingType: "auto" })),
    ).toMatchObject({
      hasParking: true,
      hasValet: false,
    });
    expect(
      mapValetVisitorToMatrixItem(visitor({ parkingType: "valet" })),
    ).toMatchObject({
      hasParking: true,
      hasValet: true,
    });
  });

  it("uses one canonical decision when explicit and legacy flags conflict", () => {
    const conflicting = visitor({
      parkingDecision: "required",
      visitorNeedsParking: false,
      isVisitorNeedsParking: false,
      parkingType: "valet",
    });

    expect(getValetVisitorParkingDecision(conflicting)).toBe("required");
    expect(valetVisitorHasParking(conflicting)).toBe(true);
    expect(mapValetVisitorToMatrixItem(conflicting).hasParking).toBe(true);
  });
});
