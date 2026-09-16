import type { VisitorMatrixItem } from "@/components/shared";
import type { ValetParkingVisitorDto } from "@/types/api.types";
import {
  resolveParkingDisplayDecision,
  type ParkingDisplayDecision,
} from "@/utils/parkingDecision";

export type ValetAdminVisitorsViewMode = "card" | "table";

export const VALET_ADMIN_DEFAULT_VIEW_MODE: ValetAdminVisitorsViewMode =
  "table";

export const VALET_ACCEPTED_STATUSES = new Set([
  "approved",
  "expected",
  "visitor_accepted",
  "checked_in",
  "completed",
]);

export function getValetVisitorParkingDecision(
  visitor: ValetParkingVisitorDto,
): ParkingDisplayDecision {
  return resolveParkingDisplayDecision({
    parkingDecision: visitor.parkingDecision,
    visitorNeedsParking: visitor.visitorNeedsParking,
    isVisitorNeedsParking: visitor.isVisitorNeedsParking,
    hasParkingAllocation:
      visitor.parkingType !== undefined && visitor.parkingType !== "none",
  });
}

export const valetVisitorHasParking = (
  visitor: ValetParkingVisitorDto,
): boolean => getValetVisitorParkingDecision(visitor) === "required";

export function getValetVisitSortTime(visitor: ValetParkingVisitorDto): number {
  if (visitor.visitStartAt) {
    const parsed = Date.parse(visitor.visitStartAt);
    if (!Number.isNaN(parsed)) return parsed;
  }

  const match = visitor.visitTime?.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!match) return Number.MAX_SAFE_INTEGER;

  let hours = parseInt(match[1], 10) % 12;
  const minutes = parseInt(match[2], 10);
  if (match[3].toUpperCase() === "PM") hours += 12;
  return hours * 60 + minutes;
}

export function filterAndSortValetVisitors(
  visitors: ValetParkingVisitorDto[],
): ValetParkingVisitorDto[] {
  return visitors
    .filter(
      (visitor) =>
        VALET_ACCEPTED_STATUSES.has(visitor.status) &&
        valetVisitorHasParking(visitor),
    )
    .sort(
      (first, second) =>
        getValetVisitSortTime(first) - getValetVisitSortTime(second),
    );
}

export function mapValetVisitorToMatrixItem(
  visitor: ValetParkingVisitorDto,
): VisitorMatrixItem {
  return {
    id: visitor.requestId,
    visitorName: visitor.visitorName,
    company: visitor.visitorCompany,
    visitDate: visitor.visitDate,
    plannedInTime: visitor.visitTime,
    status: visitor.status,
    hostName: visitor.hostName,
    hostDepartment: visitor.hostDepartment,
    hasParking: valetVisitorHasParking(visitor),
    hasValet: visitor.parkingType === "valet",
  };
}
