import type { VisitorMatrixItem } from '@/components/shared/VisitorMatrixTable';
import type { VisitorRequest } from '@/types/vms.types';
import { resolveParkingDisplayDecision } from '@/utils/parkingDecision';

export function mapOverviewRequestToMatrixItem(
  request: VisitorRequest,
  isExpired: boolean,
): VisitorMatrixItem {
  return {
    movementSummary: request.movementSummary,
    timezone: request.timezone,
    id: request.id,
    visitorName: request.visitor.fullName,
    company: request.visitor.company || undefined,
    visitDate: request.visitDate,
    plannedInTime: request.visitTime,
    plannedOutTime: request.endTime,
    status: request.status,
    hostName: request.employeeName || undefined,
    hasParking: resolveParkingDisplayDecision(request) === 'required',
    hasBuffet: !!(request.isBuffet || request.buffet),
    hasValet: !!request.valet,
    hasMeetingRoom: !!(request.isMeetingRoom || request.meetingRoom),
    purpose: request.purpose || undefined,
    isExpired,
  };
}