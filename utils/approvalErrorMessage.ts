import { isApiError } from "@/api/errors";
import { getLocalizedApiErrorMessage } from "./apiErrorMessage";

const approvalErrorKeys: Record<string, string> = {
  VISIT_APPROVAL_EXPIRED: "approval.expiredRequest",
  VISIT_APPROVAL_INVALID_SCHEDULE: "approval.invalidSchedule",
  VISIT_APPROVAL_ALREADY_PROCESSED: "approval.alreadyProcessed",
};

export function getApprovalCodeMessage(code: string | undefined, t: (key: string) => string): string {
  return code && Object.prototype.hasOwnProperty.call(approvalErrorKeys, code)
    ? t(approvalErrorKeys[code]) : t("approval.approveFailed");
}

export function isApprovalServerBlocked(code?: string): boolean {
  return !!code && Object.prototype.hasOwnProperty.call(approvalErrorKeys, code);
}

export function getApprovalServerRejectionCode(error: unknown): string | undefined {
  return isApiError(error) && (error.status === 409 || error.status === 422) &&
    isApprovalServerBlocked(error.backendCode) ? error.backendCode : undefined;
}

/** Only known workflow codes on the documented HTTP statuses override transport handling. */
export function getApprovalErrorMessage(error: unknown, t: (key: string) => string): string {
  const backendCode = getApprovalServerRejectionCode(error);
  if (backendCode) {
    return getApprovalCodeMessage(backendCode, t);
  }
  return isApiError(error) && (error.code === "CONFLICT" || error.status === 409)
    ? t("approval.conflict")
    : getLocalizedApiErrorMessage(error, t);
}

export function getCancellationErrorMessage(error: unknown, t: (key: string) => string): string {
  return isApiError(error) && error.status === 409
    ? t("approval.cancellationConflict") : getLocalizedApiErrorMessage(error, t);
}
