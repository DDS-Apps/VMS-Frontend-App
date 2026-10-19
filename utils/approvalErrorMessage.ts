import { isApiError } from "@/api/errors";
import { getLocalizedApiErrorMessage } from "./apiErrorMessage";

/** A conflict is not necessarily expiry: don't claim an unconfirmed backend code. */
export function getApprovalErrorMessage(error: unknown, t: (key: string) => string): string {
  return isApiError(error) && (error.code === "CONFLICT" || error.status === 409)
    ? t("approval.conflict")
    : getLocalizedApiErrorMessage(error, t);
}
