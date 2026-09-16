import {
  ADMIN_ALL_REQUESTS_DEFAULT_VIEW_MODE,
  mapAdminRequestToMatrixItem,
} from "@/utils/adminAllRequestsTable";
import type { UnifiedRequest } from "@/hooks/queries/useAllRequestsQuery";

const baseRequest: UnifiedRequest = {
  id: "request-1",
  type: "visitor",
  visitorName: "Amina Saleh",
  hostName: "Omar Ali",
  date: "2026-09-07",
  time: "09:30",
  status: "approved",
  originalStatus: "visitor_accepted",
  originalData: {
    id: "request-1",
    employeeName: "Omar Ali",
    visitor: {
      fullName: "Amina Saleh",
      company: "Acme",
      email: "visitor@example.com",
      phone: "+966500000000",
    },
    visitDate: "2026-09-07",
    visitTime: "09:30",
    endTime: "11:00",
    checkedInAt: "09:28",
    status: "visitor_accepted",
    purpose: "business_meeting",
    isWalkIn: false,
    createdAt: "2026-09-01T00:00:00Z",
    visitorNeedsParking: true,
    hasParking: true,
    hasBuffet: true,
    hasValet: true,
    hasMeetingRoom: true,
  },
  canApprove: false,
  canCancel: false,
  createdAt: "2026-09-01T00:00:00Z",
  purpose: "business_meeting",
  company: "Acme",
  endTime: "11:00",
  checkedInAt: "09:28",
};

describe("Building Admin All Requests table", () => {
  it("opens in table view by default", () => {
    expect(ADMIN_ALL_REQUESTS_DEFAULT_VIEW_MODE).toBe("table");
  });

  it("maps visitor identity, schedule, host, services, status, and contact", () => {
    expect(mapAdminRequestToMatrixItem(baseRequest)).toMatchObject({
      id: "request-1",
      visitorName: "Amina Saleh",
      company: "Acme",
      visitDate: "2026-09-07",
      plannedInTime: "09:30",
      plannedOutTime: "11:00",
      actualInTime: "09:28",
      status: "visitor_accepted",
      hostName: "Omar Ali",
      purpose: "business_meeting",
      email: "visitor@example.com",
      phone: "+966500000000",
      hasParking: true,
      hasBuffet: true,
      hasValet: true,
      hasMeetingRoom: true,
    });
  });

  it("never infers required parking from allocation after an explicit decline", () => {
    const item = mapAdminRequestToMatrixItem({
      ...baseRequest,
      originalData: {
        ...baseRequest.originalData,
        parkingDecision: "not_required",
        visitorNeedsParking: undefined,
        isVisitorNeedsParking: undefined,
        hasParking: true,
      } as UnifiedRequest["originalData"],
    });

    expect(item.hasParking).toBe(false);
  });

  it.each(["pending_host_approval", "visitor_pending"])(
    "preserves approval permission for the %s source status",
    (originalStatus) => {
      const item = mapAdminRequestToMatrixItem({
        ...baseRequest,
        canApprove: true,
        originalStatus,
        originalData: {
          ...baseRequest.originalData,
          status: originalStatus,
        } as UnifiedRequest["originalData"],
      });

      expect(item).toMatchObject({
        status: originalStatus,
        canApproveReject: true,
      });
    },
  );

  it("uses the same table contract for Buffet and Valet modules", () => {
    const buffet = mapAdminRequestToMatrixItem({
      ...baseRequest,
      id: "buffet-1",
      type: "buffet",
      originalStatus: "completed",
      location: "Executive Lounge",
      originalData: {} as UnifiedRequest["originalData"],
    });
    const valet = mapAdminRequestToMatrixItem({
      ...baseRequest,
      id: "valet-1",
      type: "valet",
      originalStatus: "assigned",
      originalData: {
        visitorNeedsParking: true,
        isBuffet: false,
        isMeetingRoom: false,
      } as UnifiedRequest["originalData"],
    });

    expect(buffet).toMatchObject({
      id: "buffet-1",
      purpose: "Executive Lounge",
      hasBuffet: true,
    });
    expect(valet).toMatchObject({
      id: "valet-1",
      hasParking: true,
      hasValet: true,
    });
  });
});
