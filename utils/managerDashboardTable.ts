import type { VisitorMatrixItem } from '@/components/shared/VisitorMatrixTable';
import type { VisitorRequest } from '@/types/vms.types';
import { capitalizeFirst } from '@/utils/formatters';
import { resolveParkingDisplayDecision } from '@/utils/parkingDecision';

export function mapManagerRequestToMatrixItem(
  request: VisitorRequest,
  purposeLabel: string,
  isExpired: boolean,
): VisitorMatrixItem {
  return {
    movementSummary: request.movementSummary,
    movementSummaryAvailability: request.movementSummaryAvailability,
    movementSummaryError: request.movementSummaryError,
    timezone: request.timezone,
    id: request.id,
    visitorName: capitalizeFirst(request.visitor.fullName),
    company: request.visitor.company || undefined,
    visitDate: request.visitDate,
    plannedInTime: request.visitTime,
    plannedOutTime: request.endTime,
    status: request.status,
    hostName: request.employeeName || undefined,
    hasParking: resolveParkingDisplayDecision({
      parkingDecision: request.parkingDecision,
      visitorNeedsParking: request.visitorNeedsParking,
      isVisitorNeedsParking: request.isVisitorNeedsParking,
      hasParkingAllocation: !!request.parkingSlot,
    }) === 'required',
    hasBuffet: !!(request.isBuffet || request.buffet),
    hasValet: !!request.valet,
    hasMeetingRoom: !!(request.isMeetingRoom || request.meetingRoom),
    purpose: purposeLabel || undefined,
    isExpired,
  };
}