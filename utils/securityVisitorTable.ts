import type { VisitorMatrixItem } from "@/components/shared";
import { resolveParkingDisplayDecision } from "@/utils/parkingDecision";

export interface SecurityVisitorTableSource {
  id: string;
  name: string;
  company: string;
  visitDate: string;
  visitTime: string;
  endTime?: string;
  originalStatus: string;
  checkInTime?: string;
  checkOutTime?: string;
  host: string;
  purpose?: string;
  email?: string;
  phone?: string;
  parking: {
    parkingDecision?: unknown;
    hasParking?: boolean | null;
    isVisitorNeedsParking?: boolean;
    visitorNeedsParking?: boolean;
    hasParkingAllocation?: boolean;
  };
  valet: {
    hasValet: boolean;
  };
  isBuffet?: boolean;
  isMeetingRoom?: boolean;
}

export function mapSecurityVisitorToMatrixItem(
  visitor: SecurityVisitorTableSource,
): VisitorMatrixItem {
  return {
    id: visitor.id,
    visitorName: visitor.name,
    company: visitor.company,
    visitDate: visitor.visitDate,
    plannedInTime: visitor.visitTime,
    plannedOutTime: visitor.endTime,
    actualInTime: visitor.checkInTime,
    actualOutTime: visitor.checkOutTime,
    status: visitor.originalStatus,
    hostName: visitor.host,
    purpose: visitor.purpose,
    email: visitor.email,
    phone: visitor.phone,
    hasParking: resolveParkingDisplayDecision(visitor.parking) === "required",
    hasBuffet: Boolean(visitor.isBuffet),
    hasValet: visitor.valet.hasValet,
    hasMeetingRoom: Boolean(visitor.isMeetingRoom),
  };
}
