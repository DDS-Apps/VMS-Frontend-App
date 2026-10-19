import type { ApproveVisitResponse, BulkApprovalResult } from "@/types/api.types";
import { getRequestStatusConfig } from "./statusUtils";

export const MAX_APPROVAL_BATCH_SIZE = 50;

export function getApprovalOutcomeMessage(response: ApproveVisitResponse, t: (key: string) => string): string {
  const labelKey = getRequestStatusConfig(response.status).labelKey;
  const status = labelKey === "common.none" ? t("approval.statusChanged") : `${t("approval.currentStatus")}: ${t(labelKey)}`;
  return status + (response.provisioningPending ? `\n${t("approval.provisioningPending")}` : "");
}

export function hasApprovalProvisioningWarning(result: BulkApprovalResult): boolean {
  return result.success && (result.code === "VISIT_APPROVAL_PROVISIONING_PENDING" || !!result.warning);
}

/** Do not perform the legacy follow-up walk-in edit on a cancelled/unknown outcome. */
export function canUpdateAfterApproval(response: ApproveVisitResponse): boolean {
  return !response.provisioningPending &&
    ["approved", "visitor_pending", "visitor_accepted", "expected"].includes(response.status);
}
