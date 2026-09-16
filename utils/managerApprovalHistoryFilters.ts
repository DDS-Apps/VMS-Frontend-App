import type {
  ApprovalHistoryListParams,
  ApprovalHistoryStatus,
} from "@/types/api.types";
import { localCalendarDateToKey } from "@/utils/adminAllRequestsDateRange";

type BuildManagerApprovalHistoryParamsInput = {
  status?: ApprovalHistoryStatus;
  startDate: Date | null;
  endDate: Date | null;
  limit?: number;
};

export function buildManagerApprovalHistoryParams({
  status,
  startDate,
  endDate,
  limit = 20,
}: BuildManagerApprovalHistoryParamsInput): Omit<
  ApprovalHistoryListParams,
  "page"
> {
  if (!startDate) {
    return { status, limit };
  }

  return {
    status,
    limit,
    startDate: localCalendarDateToKey(startDate),
    endDate: localCalendarDateToKey(endDate ?? startDate),
  };
}

export function hasSameApprovalHistoryDateRange(
  left: Pick<ApprovalHistoryListParams, "startDate" | "endDate">,
  right: Pick<ApprovalHistoryListParams, "startDate" | "endDate">,
): boolean {
  return (
    left.startDate === right.startDate &&
    left.endDate === right.endDate
  );
}