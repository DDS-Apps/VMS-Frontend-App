/** Only documented backend fields are interpreted. Unknown qrValidity metadata
 * is retained until the backend supplies an explicit contract for it. */
export interface QrValidity {
  expiresAt?: string | null;
  terminal?: boolean;
  revocationPending?: boolean;
  expired?: boolean;
  retainedUntilCheckout?: boolean;
  [key: string]: unknown;
}

export interface QrAccessFields {
  isExpired?: boolean;
  qrExpiresAt?: string | null;
  qrValidity?: QrValidity | null;
  scheduleWarning?: string | null;
}
