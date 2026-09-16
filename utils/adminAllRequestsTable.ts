import type { VisitorMatrixItem } from "@/components/shared";
import type { UnifiedRequest } from "@/hooks/queries/useAllRequestsQuery";
import type {
  ValetParkingVisitorDto,
  VisitListItemDto,
} from "@/types/api.types";
import { resolveParkingDisplayDecision } from "@/utils/parkingDecision";

export type AdminAllRequestsViewMode = "card" | "table";

export const ADMIN_ALL_REQUESTS_DEFAULT_VIEW_MODE: AdminAllRequestsViewMode =
  "table";

export function mapAdminRequestToMatrixItem(
  request: UnifiedRequest,
): VisitorMatrixItem {
  const baseItem: VisitorMatrixItem = {
    id: request.id,
    visitorName: request.visitorName,
    company: request.company,
    visitDate: request.date,
    plannedInTime: request.time,
    plannedOutTime: request.endTime,
    actualInTime: request.checkedInAt,
    actualOutTime: request.checkedOutAt,
    status: request.originalStatus,
    hostName: request.hostName,
    purpose: request.location,
    canApproveReject: request.canApprove,
  };

  if (request.type === "visitor") {
    const visit = request.originalData as VisitListItemDto;
    const parkingDecision = (
      visit as VisitListItemDto & { parkingDecision?: unknown }
    ).parkingDecision;
    return {
      ...baseItem,
      purpose: visit.purpose,
      email: visit.visitor?.email,
      phone: visit.visitor?.phone,
      hasParking:
        resolveParkingDisplayDecision({
          parkingDecision,
          visitorNeedsParking: visit.visitorNeedsParking,
          isVisitorNeedsParking: visit.isVisitorNeedsParking,
          hasParkingAllocation: visit.hasParking,
        }) === "required",
      hasBuffet: Boolean(visit.isBuffet ?? visit.hasBuffet),
      hasValet: Boolean(visit.hasValet),
      hasMeetingRoom: Boolean(visit.isMeetingRoom ?? visit.hasMeetingRoom),
    };
  }

  if (request.type === "buffet") {
    return {
      ...baseItem,
      hasBuffet: true,
    };
  }

  const valet = request.originalData as unknown as ValetParkingVisitorDto;
  const parkingDecision = (
    valet as ValetParkingVisitorDto & { parkingDecision?: unknown }
  ).parkingDecision;
  return {
    ...baseItem,
    hasParking:
      resolveParkingDisplayDecision({
        parkingDecision,
        visitorNeedsParking: valet.visitorNeedsParking,
        isVisitorNeedsParking: valet.isVisitorNeedsParking,
        hasParkingAllocation:
          valet.parkingType !== undefined && valet.parkingType !== "none",
      }) === "required",
    hasBuffet: Boolean(valet.isBuffet),
    hasValet: true,
    hasMeetingRoom: Boolean(valet.isMeetingRoom),
  };
}
